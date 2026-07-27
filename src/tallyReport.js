// 마감 텔리(DEP.TALLY REPORT) 집계 엔진 — V9.19 (2026-07-28)
//   실물 텔리 233개 분석 기반. 실데이터 시뮬로 검증:
//   DJCT 0221W 선적 216대·ATPR 2634E 양하 251대 — 실제 텔리 매트릭스와 완전 일치.
//   순수 계산만(파이어베이스 접근 없음) — 시뮬 가능. 렌더는 tallyExcel.js.
import { isoToLabel, isPyeongtaekPort, computeShiftingMapCached } from './utils.js';
import { getTallyFormat, orderIndex } from './data/tallyFormats.js';

export const SIZE_COLS = ['20', '40', 'HC', '45'];

/** 텔리 규격 4분류 — 20' / 40' / HC(하이큐브·HC리퍼 포함) / 45' (실측 검증 규칙) */
export function tallySizeCol(c) {
  const iso = String(c.iso || '').toUpperCase().trim();
  const l = isoToLabel(iso) || '';
  if (l.startsWith('45') || /^L/.test(iso) || /^9[05]\d\d$/.test(iso)) return '45';
  if (/^4[5-9]/.test(iso)) return 'HC';
  if (/^4/.test(iso)) return '40';
  return '20';
}

/** 5자리 UN/LOCODE → 텔리 3자 포트 표기 (KRPTK→PTK, VNHPH→HPH) */
export function port3(code) {
  const s = String(code || '').toUpperCase().trim();
  return s.length >= 5 ? s.slice(2, 5) : s;
}

const sect = (v, m) => (v && v[m]) || {};
const vals = (o) => Object.values(o || {});

/** 모드별 평택분 컨 목록 (EDI 기준 + 리스트 병합은 호출부 책임 아님 — EDI가 집계의 진실) */
export function ptkContainers(voyage, mode) {
  const edi = vals(sect(voyage, mode).ediContainers);
  return edi.filter(c => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol));
}

/** Final Work 매트릭스: {op: {port: {F|E: {20,40,HC,45}}}} — 양하=POL별, 선적=POD별 */
export function buildMatrix(containers, mode) {
  const mat = {};
  for (const c of containers) {
    const op = String(c.op || '').toUpperCase().trim() || '???';
    const port = port3(mode === 'discharge' ? c.pol : c.pod) || '???';
    const fe = c.fe === 'E' ? 'E' : 'F';
    const sz = tallySizeCol(c);
    ((((mat[op] ??= {})[port] ??= {})[fe] ??= {}))[sz] = ((mat[op][port][fe] || {})[sz] || 0) + 1;
  }
  return mat;
}

/** 매트릭스 → 사전 순서대로 행 배열 [{op, port, fe, sizes:{}}]. 사전에 없는 op/port는 뒤에. */
export function matrixRows(matDis, matLoad, matShift, fmt) {
  const ops = new Set([...Object.keys(matDis), ...Object.keys(matLoad), ...Object.keys(matShift)]);
  const opList = [...ops].sort((a, b) => orderIndex(fmt.ops, a) - orderIndex(fmt.ops, b) || a.localeCompare(b));
  const rows = [];
  for (const op of opList) {
    const ports = new Set([
      ...Object.keys(matDis[op] || {}), ...Object.keys(matLoad[op] || {}), ...Object.keys(matShift[op] || {})]);
    const portList = [...ports].sort((a, b) => orderIndex(fmt.ports, a) - orderIndex(fmt.ports, b) || a.localeCompare(b));
    for (const port of portList) {
      for (const fe of ['F', 'E']) {
        rows.push({
          op, port, fe,
          dis: (matDis[op]?.[port]?.[fe]) || {},
          load: (matLoad[op]?.[port]?.[fe]) || {},
          shift: (matShift[op]?.[port]?.[fe]) || {},
        });
      }
    }
  }
  return rows;
}

function sumMat(mat, fe) {
  const t = { 20: 0, 40: 0, HC: 0, 45: 0 };
  for (const ports of Object.values(mat))
    for (const fes of Object.values(ports))
      for (const sz of SIZE_COLS) t[sz] += (fes[fe] || {})[sz] || 0;
  return t;
}
const matTotal = (mat) => SIZE_COLS.reduce((a, s) => a + sumMat(mat, 'F')[s] + sumMat(mat, 'E')[s], 0);

/** OS(과부족) 시트 데이터 — 포트×규격×F/E: manifested vs worked + 누락/초과 */
export function buildOS(containers, compMap, mode, fmt) {
  const g = {};
  let extra = 0;
  for (const c of containers) {
    const port = port3(mode === 'discharge' ? c.pol : c.pod) || '???';
    const sz = tallySizeCol(c);
    const szLbl = sz === '20' ? "20'" : sz === '45' ? "45'" : sz === '40' ? "40'" : 'HC';
    const fe = c.fe === 'E' ? 'EMPTY' : 'FULL';
    const k = `${port}|${szLbl}|${fe}`;
    g[k] ??= { port, size: szLbl, fe, manifested: 0, worked: 0, short: 0, rf: 0, rh: 0, dg: 0 };
    g[k].manifested++;
    const comp = compMap ? compMap[c.cn] : null;
    const missing = comp && comp.flag === 'missing';
    if (comp && !missing) g[k].worked++;
    if (missing) g[k].short++;
    const iso = String(c.iso || '').toUpperCase();
    const isRf = c.rf || iso[2] === 'R' || /^45[38]/.test(iso);
    if (isRf) (sz === 'HC' || sz === '45' ? g[k].rh++ : g[k].rf++);
    if (c.dg) g[k].dg++;
  }
  for (const comp of vals(compMap || {})) if (comp && comp.flag === 'extra') extra++;
  const rows = Object.values(g).sort((a, b) =>
    orderIndex(fmt.ports, a.port) - orderIndex(fmt.ports, b.port) ||
    a.size.localeCompare(b.size) || (a.fe === 'FULL' ? -1 : 1));
  // 선사별 규격 요약(REMARKS 줄) — "SKR : 20'F x 11 , 40'F x 58 ( RH x 2 )"
  const byOp = {};
  for (const c of containers) {
    const op = String(c.op || '').toUpperCase().trim() || '???';
    const sz = tallySizeCol(c);
    const fe = c.fe === 'E' ? 'E' : 'F';
    byOp[op] ??= {};
    const k = `${sz === '20' ? "20'" : sz === '45' ? "45'" : "40'"}${fe}`;
    byOp[op][k] = (byOp[op][k] || 0) + 1;
    const iso = String(c.iso || '').toUpperCase();
    if (c.rf || iso[2] === 'R' || /^45[38]/.test(iso)) byOp[op]._rh = (byOp[op]._rh || 0) + 1;
    if (c.dg) byOp[op]._dg = (byOp[op]._dg || 0) + 1;
  }
  const remarks = Object.entries(byOp)
    .sort((a, b) => orderIndex(fmt.ops, a[0]) - orderIndex(fmt.ops, b[0]))
    .map(([op, o]) => {
      const parts = Object.entries(o).filter(([k]) => !k.startsWith('_'))
        .map(([k, n]) => `${k} x ${n}`);
      const tags = [];
      if (o._rh) tags.push(`RH x ${o._rh}`);
      if (o._dg) tags.push(`DG x ${o._dg}`);
      return `${op} : ${parts.join(' , ')}${tags.length ? ` ( ${tags.join(' , ')} )` : ''}`;
    });
  return { rows, extra, remarks };
}

/** Act. Cntr-Seal(실번호 상이) — sl_orig ≠ sl 또는 리씰 */
export function buildSealList(voyage, mode) {
  const recs = vals(sect(voyage, mode).records);
  const out = [];
  for (const r of recs) {
    const orig = String(r.sl_orig || '').trim();
    const act = String(r.sl || '').trim();
    const reseal = String(r.reseal || '').trim();
    if ((orig && act && orig !== act) || reseal) {
      out.push({
        cn: r.cn, manifestSeal: orig || act, size: tallySizeCol(r) === '20' ? "20'" : "40'",
        actualSeal: (orig && act && orig !== act) ? act : '',
        reseal, remarks: String(r.op || '').toUpperCase(),
        fe: r.fe === 'E' ? 'EMPTY' : 'FULL',
      });
    }
  }
  return out;
}

/** RF condition — 리퍼 목록 (설정온도 = tmp, 실측은 검수 입력이 덮은 tmp와 동일 소스라 setting에만) */
export function buildRF(containers) {
  return containers
    .filter(c => c.rf || String(c.iso || '').toUpperCase()[2] === 'R' || /^45[38]/.test(String(c.iso || '')))
    .map(c => ({
      cn: c.cn, seal: c.sl || '', size: tallySizeCol(c) === '20' ? "20'RF" : "40'RH",
      loc: [c.bay, c.row, c.tier].filter(Boolean).join('/'),
      setting: c.tmp != null && String(c.tmp).trim() !== '' ? String(c.tmp) : '',
      op: String(c.op || '').toUpperCase(),
      fe: c.fe === 'E' ? 'E' : 'F',
    }));
}

/** Performance — 선사별 IN/OUT × F/E × 규격 */
export function buildPerformance(disCs, loadCs, fmt) {
  const agg = (cs) => {
    const m = {};
    for (const c of cs) {
      const op = String(c.op || '').toUpperCase().trim() || '???';
      const fe = c.fe === 'E' ? 'E' : 'F';
      ((m[op] ??= { F: {}, E: {} })[fe])[tallySizeCol(c)] = (m[op][fe][tallySizeCol(c)] || 0) + 1;
    }
    return m;
  };
  const inb = agg(disCs), outb = agg(loadCs);
  const ops = [...new Set([...Object.keys(inb), ...Object.keys(outb)])]
    .sort((a, b) => orderIndex(fmt.ops, a) - orderIndex(fmt.ops, b) || a.localeCompare(b));
  return { inbound: inb, outbound: outb, ops };
}

/** SHIFTING 행 */
export function buildShifting(voyage) {
  let map = {};
  try { map = computeShiftingMapCached(voyage.key || voyage?.info?.vsl || 'k', voyage) || {}; } catch { /* 계산 실패 시 빈 목록 */ }
  return Object.values(map).map((s, i) => ({
    no: i + 1, cn: s.cn || s.CN || '', type: s.iso ? (tallySizeCol(s) === '20' ? "20'" : "40'") : '',
    fe: s.fe || '', wt: s.wt || '', op: String(s.op || '').toUpperCase(),
    oldPos: s.oldPos || [s.bay, s.row, s.tier].filter(Boolean).join(''),
    newPos: s.newPos || '', pod: port3(s.pod), pol: port3(s.pol),
  }));
}

/** Time Sheet — 작업 보고 이력에서 시각록 구성 */
export function buildTimeSheet(reports) {
  const rows = [];
  const list = vals(reports || {}).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const t = (ms) => new Date(ms).toTimeString().slice(0, 5);
  for (const r of list) {
    if (!r || !r.ts) continue;
    if (r.type === 'work_status') {
      const modeLbl = r.mode === 'discharge' ? "DISCH'G" : 'LOADING';
      if (r.action === 'start') rows.push({ time: `${t(r.ts)}    HRS`, remark: `COMMENCED ${modeLbl}` });
      else if (r.action === 'stop') rows.push({ time: `${t(r.ts)}    HRS`, remark: `SUSPENDED ${modeLbl}${r.reason ? ` (${r.reason})` : ''}` });
      else if (r.action === 'resume') rows.push({ time: `${t(r.ts)}    HRS`, remark: `RESUMED ${modeLbl}` });
      else if (r.action === 'complete') rows.push({ time: `${t(r.ts)}    HRS`, remark: `COMPLETED ${modeLbl}` });
    } else if (r.type === 'hatch') {
      rows.push({ time: `${t(r.ts)}    HRS`, remark: `HATCH COVER ${String(r.action || '').toUpperCase()}${r.bays ? ` (BAY ${r.bays})` : ''}` });
    }
  }
  return rows;
}

/** 전체 집계 — voyage 하나로 모든 시트 데이터 생성 */
export function computeTallyData(voyage) {
  const info = voyage?.info || {};
  const code = String(info.vsl || '').toUpperCase();
  const fmt = getTallyFormat(code) || { ops: [], ports: [], damage: null, shifting: true, performance: true, _unknown: true };
  const disCs = ptkContainers(voyage, 'discharge');
  const loadCs = ptkContainers(voyage, 'loading');
  const shiftRows = buildShifting(voyage);
  const matDis = buildMatrix(disCs, 'discharge');
  const matLoad = buildMatrix(loadCs, 'loading');
  // 쉬프팅 매트릭스: op×POD 기준 (실측: DJCT SHIFT 열 = 20' 자리)
  const matShift = {};
  for (const s of shiftRows) {
    const op = s.op || '???'; const port = s.pod || '???';
    const fe = s.fe === 'E' ? 'E' : 'F';
    const sz = s.type === "20'" ? '20' : 'HC';
    ((((matShift[op] ??= {})[port] ??= {})[fe] ??= {}))[sz] = ((matShift[op][port][fe] || {})[sz] || 0) + 1;
  }
  return {
    fmt, code,
    vslFull: info.vslFull || info.vsl || '',
    voyD: info.voy_d || '', voyL: info.voy_l || '',
    pier: info.pier || '', berth: info.berth || '',
    date: new Date(),
    rows: matrixRows(matDis, matLoad, matShift, fmt),
    totals: {
      dis: { F: sumMat(matDis, 'F'), E: sumMat(matDis, 'E'), n: matTotal(matDis) },
      load: { F: sumMat(matLoad, 'F'), E: sumMat(matLoad, 'E'), n: matTotal(matLoad) },
      shift: { F: sumMat(matShift, 'F'), E: sumMat(matShift, 'E'), n: matTotal(matShift) },
    },
    osIn: buildOS(disCs, sect(voyage, 'discharge').completed, 'discharge', fmt),
    osOut: buildOS(loadCs, sect(voyage, 'loading').completed, 'loading', fmt),
    sealIn: buildSealList(voyage, 'discharge'),
    sealOut: buildSealList(voyage, 'loading'),
    rfIn: buildRF(disCs), rfOut: buildRF(loadCs),
    perf: buildPerformance(disCs, loadCs, fmt),
    shifting: shiftRows,
    timeSheet: buildTimeSheet(voyage?.reports),
  };
}
