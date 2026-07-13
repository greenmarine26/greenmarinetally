// 실선적 EDI 내보내기 — 작업 완료 후 평택 선적분(실체 위치)을 표준 BAPLIE(D.95B/SMDG22)와
// 수정용 엑셀로 생성하고, 수정 엑셀을 다시 읽어 EDI를 재생성하는 왕복 모듈 (V8.93, 사용자 확정 2026-07-13).
//   - EDI 형식: 수신 BAPLIE(BAPLIE_SMDG22_*)와 동일 골격 — 카스피(CASP)가 읽는 표준 EDIFACT.
//   - 범위: 평택 선적분만(사용자 확정). 위치는 실체(bay_actual) 우선, 없으면 계획.
//   - 대상: 선적확인(completed)된 컨 우선 — 완료가 하나도 없으면 전체 평택 선적분(경고 표시).
import { isPyeongtaekPort, loadSheetJS } from './utils.js';

// ── 평택 선적분 컨테이너 조립 (ediContainers + records 병합, 실체 위치 우선) ──
export function collectActualLoading(voyage) {
  const sec = (voyage && voyage.loading) || {};
  const edi = sec.ediContainers || {};
  const recs = sec.records || {};
  const completed = sec.completed || {};
  const byCn = {};
  const put = (cn, src, fromList) => {
    if (!cn || cn.startsWith('__')) return;            // __BOOK/__SLOT 자리표시는 제외
    const cnu = String(cn).replace(/\s/g, '').toUpperCase();
    if (!byCn[cnu]) byCn[cnu] = { cn: cnu };
    const t = byCn[cnu];
    for (const [k, v] of Object.entries(src || {})) {
      if (v === '' || v == null) continue;
      if (t[k] === undefined || t[k] === '' || t[k] == null) t[k] = v;
    }
    if (fromList) t._inList = true;
  };
  for (const [cn, c] of Object.entries(edi)) put(cn, c, false);
  for (const [cn, r] of Object.entries(recs)) put(cn, r, true);

  const all = Object.values(byCn).filter(c => c._inList || isPyeongtaekPort(c.pol));   // 평택 선적분(리스트=평택 원칙)
  const doneKeys = new Set(Object.keys(completed).map(k => String(k).replace(/\s/g, '').toUpperCase()));
  const done = all.filter(c => doneKeys.has(c.cn));
  const useDoneOnly = done.length > 0;
  const rows = (useDoneOnly ? done : all).map(c => {
    const bay = String(c.bay_actual && c.bay_actual !== '__STG__' ? c.bay_actual : (c.bay || '')).trim();
    const row = String(c.bay_actual && c.bay_actual !== '__STG__' ? (c.row_actual || '') : (c.row || '')).trim();
    const tier = String(c.bay_actual && c.bay_actual !== '__STG__' ? (c.tier_actual || '') : (c.tier || '')).trim();
    return {
      cn: c.cn, iso: (c.iso || '').toUpperCase(), fe: c.fe === 'E' ? 'E' : 'F',
      op: (c.op || '').toUpperCase(), pol: 'KRPTK', pod: (c.pod || '').toUpperCase(),
      bay, row, tier,
      wt: Number(c.wt) || 0, sl: c.sl || '', tmp: c.rf || c.tmp ? String(c.tmp ?? '') : '',
      dgc: c.dgc || '', un: c.un || '',
    };
  }).sort((a, b) => (a.bay + a.row + a.tier).localeCompare(b.bay + b.row + b.tier) || a.cn.localeCompare(b.cn));
  return { rows, useDoneOnly, totalPtk: all.length, doneCount: done.length };
}

// ── 표준 BAPLIE(D.95B/SMDG22) 생성 — 수신 샘플(BAPLIE_SMDG22_2607N_VNSGN_SWDN.edi) 골격 준수 ──
export function buildActualBaplie(rows, meta = {}) {
  const now = new Date();
  const p = (n, w) => String(n).padStart(w, '0');
  const yymmdd = p(now.getFullYear() % 100, 2) + p(now.getMonth() + 1, 2) + p(now.getDate(), 2);
  const hhmm = p(now.getHours(), 2) + p(now.getMinutes(), 2);
  const dtm201 = yymmdd + hhmm;                      // DTM 201 = YYMMDDHHMM
  const ref = String(meta.ref || Date.now());
  const voy = (meta.voy || '').toUpperCase();
  const vslName = (meta.vslFull || meta.vsl || '').toUpperCase();
  const callsign = (meta.callsign || meta.imo || meta.vsl || 'UNKNOWN').toUpperCase();
  const carrier = (meta.carrier || (rows[0] && rows[0].op) || 'XXX').toUpperCase();
  // 다음 항구 = 선적분 최다 POD (표기용 LOC+61)
  const podCount = {};
  rows.forEach(r => { if (r.pod) podCount[r.pod] = (podCount[r.pod] || 0) + 1; });
  const nextPort = Object.keys(podCount).sort((a, b) => podCount[b] - podCount[a])[0] || '';

  const segs = [];
  segs.push(`UNB+UNOA:2+GMT+CCASP+${yymmdd}:${hhmm}+${ref}+++++`);
  segs.push('UNH+1+BAPLIE:D:95B:UN:SMDG22');
  segs.push(`BGM++${ref}+9`);
  segs.push(`DTM+137:${dtm201}:201`);
  segs.push(`TDT+20+${voy}+++${carrier}:172:20+++${callsign}:146:11:${vslName}`);
  segs.push('LOC+5+KRPTK:139:6');
  if (nextPort) segs.push(`LOC+61+${nextPort}:139:6`);
  segs.push(`DTM+136:${dtm201}:201`);
  segs.push(`RFF+VON:${voy}`);
  for (const r of rows) {
    const bay3 = p(String(parseInt(r.bay, 10) || 0), 3);
    const row2 = p(String(parseInt(r.row, 10) || 0), 2);
    const tier2 = p(String(parseInt(r.tier, 10) || 0), 2);
    segs.push(`LOC+147+${bay3}${row2}${tier2}::5`);
    if (r.wt > 0) segs.push(`MEA+WT++KGM:${Math.round(r.wt)}`);
    segs.push('LOC+9+KRPTK:139:6');
    if (r.pod) segs.push(`LOC+11+${r.pod}:139:6`);
    segs.push('RFF+BM:1');
    segs.push(`EQD+CN+${r.cn}+${r.iso}+++${r.fe === 'E' ? '4' : '5'}`);
    if (r.tmp !== '' && r.tmp != null && String(r.tmp).trim() !== '') segs.push(`TMP+2+${String(r.tmp).trim()}:CEL`);
    if (r.dgc || r.un) segs.push(`DGS+IMD+${r.dgc || ''}+${r.un || ''}`);
    if (r.op) segs.push(`NAD+CA+${r.op}:172:20`);
  }
  // UNT 카운트 = UNH부터 UNT까지 세그먼트 수 (UNH 포함, UNB/UNZ 제외)
  const untCount = segs.length - 1 + 1;              // segs에서 UNB 제외 + UNT 자신
  segs.push(`UNT+${untCount}+1`);
  segs.push(`UNZ+1+${ref}`);
  return segs.join("'\n") + "'";
}

// ── 수정용 엑셀 (왕복 규격 — 헤더 고정) ──
const EXCEL_HEADERS = ['NO', 'CNTR NO', 'ISO', 'F/E', 'LINE', 'POL', 'POD', 'BAY', 'ROW', 'TIER', 'WEIGHT(KG)', 'SEAL', 'TEMP', 'DG CLASS', 'UN NO'];

export async function buildEditExcel(rows, meta = {}) {
  const XLSX = await loadSheetJS();
  const aoa = [EXCEL_HEADERS].concat(rows.map((r, i) => [
    i + 1, r.cn, r.iso, r.fe, r.op, r.pol, r.pod,
    r.bay, r.row, r.tier, r.wt || '', r.sl, r.tmp, r.dgc, r.un,
  ]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 4 }, { wch: 13 }, { wch: 6 }, { wch: 4 }, { wch: 5 }, { wch: 7 }, { wch: 7 },
                 { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 11 }, { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ACTUAL_LOADING');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

export async function parseEditExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
    const hi = aoa.findIndex(r => (r || []).some(c => String(c).trim().toUpperCase() === 'CNTR NO'));
    if (hi < 0) continue;
    const header = aoa[hi].map(c => String(c).trim().toUpperCase());
    const col = (label) => header.indexOf(label);
    const iCn = col('CNTR NO'), iIso = col('ISO'), iFe = col('F/E'), iOp = col('LINE'),
          iPod = col('POD'), iBay = col('BAY'), iRow = col('ROW'), iTier = col('TIER'),
          iWt = col('WEIGHT(KG)'), iSl = col('SEAL'), iTmp = col('TEMP'), iDg = col('DG CLASS'), iUn = col('UN NO');
    const rows = [];
    const errors = [];
    for (let r = hi + 1; r < aoa.length; r++) {
      const line = aoa[r] || [];
      const cn = String(line[iCn] || '').replace(/\s/g, '').toUpperCase();
      if (!cn) continue;
      if (!/^[A-Z]{4}\d{7}$/.test(cn)) errors.push(`${r + 1}행 컨번호 형식 이상: ${cn}`);
      rows.push({
        cn, iso: String(line[iIso] || '').toUpperCase(),
        fe: String(line[iFe] || 'F').toUpperCase() === 'E' ? 'E' : 'F',
        op: String(line[iOp] || '').toUpperCase(), pol: 'KRPTK',
        pod: String(line[iPod] || '').toUpperCase(),
        bay: String(line[iBay] || '').trim(), row: String(line[iRow] || '').trim(), tier: String(line[iTier] || '').trim(),
        wt: Number(String(line[iWt] || '').replace(/[, ]/g, '')) || 0,
        sl: String(line[iSl] || '').trim(), tmp: String(line[iTmp] || '').trim(),
        dgc: String(line[iDg] || '').trim(), un: String(line[iUn] || '').trim(),
      });
    }
    return { rows, errors };
  }
  return { rows: [], errors: ["'CNTR NO' 헤더를 찾지 못했습니다 — 수정용 엑셀의 헤더 줄을 그대로 두세요."] };
}
