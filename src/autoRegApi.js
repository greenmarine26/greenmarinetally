// 수집기 자동 항차 등록용 페이로드 빌더 — 파싱·분류는 검수앱 파서가 소유(수집기는 파일만 전달, 쓰기는 수집기 REST).
// V8.32: window.GMautoPayload(files, {vslCode, voy, mode}) → { key, info, ediContainers, ediRaw, records, counts }
//   - ediContainers 분류는 VoyagePage 재처리 로직과 동일(평택 POD/POL → discharge/loading, 그 외 transit).
//   - records는 원시 파싱 결과만 반환(먼저 온 값 유지 + 빈칸 채움). 기존 records와의 병합·보존은 수집기 측 보수 머지 담당.
//   - Firebase 쓰기는 여기서 하지 않는다 — 순수 함수라 시뮬·헬퍼 재사용이 쉽다.
import { parseBAPLIE, parseAscFile, parseListExcel, isPyeongtaekPort, loadSheetJS } from './utils.js';
import { APP_VERSION } from './utils.js';

function _kind(name, head) {
  const n = (name || '').toLowerCase();
  const e = n.split('.').pop();
  if (e === 'edi') return 'edi';
  if (e === 'asc') return 'asc';
  if (e === 'txt') {
    // RZOR 등 EDI/ASC/매니페스트가 .txt로 오는 경우 — 내용 머리로 판정.
    const h = (head || '').trimStart();
    if (h.startsWith('UNB') || h.startsWith('UNH')) return 'edi';
    if (h.startsWith('$60')) return 'asc';
    if (h.startsWith('00:IFCSUM')) return 'ifcsum';   // V8.33: LOLO(RZOR) 매니페스트 — 가상 EDI 재료
    return 'skip';
  }
  if (e === 'xls' || e === 'xlsx') {
    if (/loadlist\.xlsx$/.test(n)) return 'merged';   // V8.32-01: 수집기 합본(평택 기준 검증본) — 전용 매핑으로 읽음
    if (/recap|cbf|cdl|memo|xray|x-ray/.test(n)) return 'skip';
    return 'list';
  }
  return 'skip';
}

async function _asText(f) {
  const ab = f.arrayBuffer ? await f.arrayBuffer() : (f.buffer || f);
  try { return new TextDecoder('latin1').decode(new Uint8Array(ab)); } catch (e) { return ''; }
}
async function _asU8(f) {
  const ab = f.arrayBuffer ? await f.arrayBuffer() : (f.buffer || f);
  return new Uint8Array(ab);
}

// V8.33: IFCSUM(콜론 구분 매니페스트, RZOR/LOLO) → 가상 EDI 컨테이너.
//   구조(실파일 확인): 12:=B/L(파트7=POL), 13:=POD(파트1), 51:=컨테이너(파트2=컨번호, 3=실번호, 4=규격, 5=F/E, 7=무게).
export function parseIfcsum(text) {
  const containers = [];
  let pol = '', pod = '';
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim().replace(/'$/, '');
    if (!line) continue;
    const parts = line.split(':');
    const seg = parts[0];
    if (seg === '12') { pol = (parts[7] || '').trim().toUpperCase(); continue; }
    if (seg === '13') { pod = (parts[1] || '').trim().toUpperCase(); continue; }
    if (seg !== '51') continue;
    const cn = (parts[2] || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cn)) continue;
    const c = { cn, pol, pod, fe: (parts[5] || 'F').trim().toUpperCase() || 'F' };
    const sl = (parts[3] || '').trim();
    if (sl) c.sl = sl;
    const iso = (parts[4] || '').trim().toUpperCase();
    if (iso) c.iso = iso;
    const wt = parseInt(parts[7], 10);
    if (wt > 0) c.wt = wt;
    containers.push(c);
  }
  return { containers, _virtualEdi: true };
}

export async function buildAutoPayload(files, opts) {
  const vslCode = String(opts?.vslCode || '').trim().toUpperCase();
  const voy = String(opts?.voy || '').trim().toUpperCase();
  if (!vslCode || !voy) return { ok: false, error: 'vslCode/voy 필요' };
  const mode = opts?.mode === 'loading' || opts?.mode === 'discharge'
    ? opts.mode
    : (/[WS]$/.test(voy) ? 'loading' : 'discharge');

  // [1] 파일 분류·파싱 — EDI 후보 중 실번호 최다(동수면 총수 최다) 1개 채택(mergeApi와 같은 정신).
  let best = null;                 // { name, text, containers, cnCount }
  const records = {};              // 리스트 원시 병합(먼저 온 값 유지 + 빈칸 채움)
  const perFile = [];
  for (const f of files || []) {
    const name = f.name || '';
    try {
      if (/\.(xls|xlsx)$/i.test(name)) {
        const xk = _kind(name);
        if (xk === 'merged') {
          // V8.32-01: 합본(MERGED 시트, 'Cntr No' 헤더) 전용 파싱 — parseListExcel은 이 형식을 못 읽음(0건).
          const XLSX = await loadSheetJS();
          const wb = XLSX.read(await _asU8(f), { type: 'array' });
          const ws = wb.Sheets['MERGED'] || wb.Sheets[wb.SheetNames[0]];
          let mc = 0;
          (XLSX.utils.sheet_to_json(ws) || []).forEach(row => {
            const cn = String(row['Cntr No'] || '').replace(/\s/g, '').toUpperCase();
            if (!/^[A-Z]{4}\d{7}$/.test(cn)) return;
            mc++;
            const rec = { cn, _source: name };
            if (row['Seal'] != null && row['Seal'] !== '') rec.sl = String(row['Seal']).trim();
            if (row['EmptySeal'] != null && row['EmptySeal'] !== '') rec.eseal = String(row['EmptySeal']).trim();
            const w = parseInt(row['Weight'], 10);
            if (w > 0) rec.wt = w;
            if (!records[cn]) { records[cn] = rec; return; }
            const prev = records[cn];
            for (const [k, v] of Object.entries(rec)) {
              if (prev[k] === '' || prev[k] == null) prev[k] = v;
            }
          });
          perFile.push({ name, kind: 'merged', count: mc });
          continue;
        }
        if (xk !== 'list') { perFile.push({ name, kind: 'skip' }); continue; }
        const out = await parseListExcel(await _asU8(f));
        const recs = (out && out.records) || [];
        recs.forEach(r => {
          if (!r.cn) return;
          const cn = r.cn.toUpperCase();
          if (!records[cn]) { records[cn] = { ...r, cn, _source: name }; return; }
          const prev = records[cn];
          for (const [k, v] of Object.entries(r)) {
            if (v === '' || v == null) continue;
            if (prev[k] === '' || prev[k] == null) prev[k] = v;   // 빈칸만 채움
          }
        });
        perFile.push({ name, kind: 'list', count: recs.length });
      } else {
        const text = await _asText(f);
        const kind = _kind(name, text.slice(0, 12));
        if (kind !== 'edi' && kind !== 'asc' && kind !== 'ifcsum') { perFile.push({ name, kind: 'skip' }); continue; }
        const r = kind === 'ifcsum' ? parseIfcsum(text) : (kind === 'asc' ? parseAscFile(text) : parseBAPLIE(text));
        const cs = (r && r.containers) || [];
        const cnCount = cs.filter(c => c.cn && c.cn.length === 11).length;
        perFile.push({ name, kind, count: cs.length, cnCount });
        if (!best || cnCount > best.cnCount || (cnCount === best.cnCount && cs.length > best.containers.length)) {
          best = { name, text, containers: cs, cnCount, virtual: !!(r && r._virtualEdi) };
        }
      }
    } catch (e) { perFile.push({ name, error: String(e && e.message || e) }); }
  }

  // [2] ediContainers — VoyagePage 재처리와 동일 분류.
  const ediContainers = {};
  if (best) {
    best.containers.forEach(c => {
      const podPtk = isPyeongtaekPort(c.pod);
      const polPtk = isPyeongtaekPort(c.pol);
      const containerMode = mode === 'discharge' ? (podPtk ? 'discharge' : 'transit') : (polPtk ? 'loading' : 'transit');
      const key = c.cn && c.cn.length === 11 ? c.cn : `__SLOT_${c.bay}_${c.row}_${c.tier}`;
      ediContainers[key] = { ...c, _slotKey: key, _mode: containerMode };
    });
  }

  // V8.33-01: 가상 EDI(IFCSUM)는 실번호·무게를 담고 있으므로 리스트(records)도 함께 생성 — 앱 매칭용.
  //   (리스트가 없으면 매칭 0으로 보이는 문제, 사용자 지적 2026-07-03.)
  if (best && best.virtual) {
    best.containers.forEach(c => {
      if (!c.cn || c.cn.length !== 11) return;
      const cn = c.cn.toUpperCase();
      const rec = { cn, _source: best.name };
      if (c.sl) rec.sl = c.sl;
      if (c.wt) rec.wt = c.wt;
      if (!records[cn]) { records[cn] = rec; return; }
      const prev = records[cn];
      for (const [k, v] of Object.entries(rec)) {
        if (prev[k] === '' || prev[k] == null) prev[k] = v;
      }
    });
  }

  // [3] 항차 info — HomePage 수동 생성(handleCreate)과 같은 스키마 + 자동 표시.
  const info = {
    vsl: vslCode, voy, mode,
    createdAt: Date.now(),
    createdBy: '자동등록(수집기)',
    autoRegistered: true,
    autoStatus: opts?.phase === 'confirm' ? 'confirmed' : 'collecting',
  };
  if (mode === 'discharge') info.voy_d = voy; else info.voy_l = voy;

  const counts = {
    edi: Object.keys(ediContainers).length,
    ediWithCn: Object.keys(ediContainers).filter(k => !k.startsWith('__SLOT')).length,
    ptk: Object.values(ediContainers).filter(c => c._mode === mode).length,
    records: Object.keys(records).length,
  };
  return {
    ok: !!best || counts.records > 0,
    key: `${vslCode}_${voy}`, mode, info, ediContainers, records, counts, perFile,
    ediRaw: best ? { text: best.text, fileName: best.name, parserVersion: APP_VERSION } : null,
  };
}

if (typeof window !== 'undefined') { window.GMautoPayload = buildAutoPayload; }
