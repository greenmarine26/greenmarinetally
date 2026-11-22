// 여객선 작업보고 5.21 연막검사 — 호기 추적(같은 시각 다른 호기 위치) · 마감 5분 전 창 판정 · 수정 보고 얹기(실소스 번들)
//  검수사 2026-11-22 «5분전부터 실시간으로 보여주다가 정각에 멈추면 됩니다» · «수정보고한다고 하면 각 셀에 수정기능을 … 합산은 자동계산으로» · «동시간대 장비들 위치파악이 중요 합니다».
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_gangtrack521.cjs <번들.cjs>'); process.exit(1); }
const mem = {}; global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, location: { hash: '' } };
process.on('unhandledRejection', () => {});
const M = require(path.resolve(B));
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const MIN = 60000, T0 = new Date(2026, 10, 15, 9, 0, 0).getTime();
console.log('1. 호기 추적 — 같은 시각 다른 호기 위치');
{ //  TNJP 26376E 11-15 꼴: 2호기 6번 → 14번, 4호기 14번 → 22번
  const rows = [];
  for (let i = 0; i < 10; i++) { rows.push({ at: T0 + i * 3 * MIN, hatch: 6 }); rows.push({ at: T0 + i * 3 * MIN + MIN, hatch: 14 }); }   // 09:00~09:28 두 호기가 6·14
  for (let i = 0; i < 10; i++) { rows.push({ at: T0 + 32 * MIN + i * 3 * MIN, hatch: 14 }); rows.push({ at: T0 + 33 * MIN + i * 3 * MIN, hatch: 22 }); }   // 09:32~ 14·22
  const a = M.trackCranes(rows, 2);
  const cnt = (h, from, to, who) => rows.filter((r, i) => r.hatch === h && r.at >= from && r.at < to && a[i] === who).length;
  ok(cnt(6, 0, Infinity, 0) === 10 && cnt(22, 0, Infinity, 1) === 10, '6번 장은 선수 호기, 22번 장은 선미 호기');
  ok(cnt(14, T0, T0 + 30 * MIN, 1) === 10, `선수 호기가 6번에 있는 동안 14번은 선미 호기(${cnt(14, T0, T0 + 30 * MIN, 1)}/10)`);
  ok(cnt(14, T0 + 30 * MIN, Infinity, 0) === 10, `선미 호기가 22번으로 간 뒤 14번은 선수 호기(${cnt(14, T0 + 30 * MIN, Infinity, 0)}/10)`);
  const pin = rows.map((r) => ({ ...r })); pin[1].pin = 0;   // 검수원이 찍은 완료는 그대로
  ok(M.trackCranes(pin, 2)[1] === 0, '검수원이 호기를 고르고 찍은 완료(pin)는 추적이 바꾸지 않는다');
  ok(String(M.trackCranes([{ at: 1, hatch: 2 }, { at: 2, hatch: 30 }], 1)) === '0,0' && M.trackCranes([], 2) === null, '한 호기뿐이면 전부 그 호기 · 빈 목록은 null'); }
console.log('2. 마감 5분 전부터 — ferryShiftDue');
{ const d = (h, m, s = 0) => new Date(2026, 10, 11, h, m, s).getTime();
  const edi = {}, comp = {};
  for (let i = 0; i < 40; i++) { const cn = 'TEST' + String(1000000 + i); edi[cn] = { cn, pod: 'KRPTK', pol: 'CNYNT', iso: i % 2 ? '45G1' : '22G1', fe: 'F', bay: i % 2 ? '14' : '06', row: '01', tier: '82' }; if (i < 30) comp[cn] = { at: d(10, i), by: '', src: 'term' }; }
  const v = { info: { vsl: 'OBWH', voy_d: '2789E', pier: 'PNCT', berthSide: '우현' }, discharge: { ediContainers: edi, completed: comp }, loading: {} };
  const k = 'OBWH_2789E';
  ok(M.ferryShiftDue(v, d(16, 54, 59), k) === null, '16:54:59 — 아직 안 뜬다');
  const p = M.ferryShiftDue(v, d(16, 55, 0), k);
  ok(!!p && p.pre === true && p.shift === '주간' && p.key === '2026-11-11_주간' && p.cutMs === d(17, 0), '16:55:00 — 마감 5분 전 창(pre) · 주간 · 17:00 마감');
  const c = M.ferryShiftDue(v, d(17, 0, 0), k);
  ok(!!c && c.pre === false && c.cutMs === d(17, 0), '17:00:00 — 멈춤(pre 아님)');
  ok(!!M.ferryShiftDue(v, d(17, 29, 59), k) && M.ferryShiftDue(v, d(17, 30, 0), k) === null, '17:29:59 까지 · 17:30 부터는 안 뜬다');
  ok(M.ferryShiftDue({ ...v, info: { ...v.info, vsl: 'ATPR' } }, d(16, 56), 'ATPR_1E') === null, '대상 밖 배는 안 뜬다');
  const n = JSON.parse(JSON.stringify(v)); for (const cn of Object.keys(n.discharge.completed)) n.discharge.completed[cn].at = d(2, 0);   // 새벽 작업
  const pn = M.ferryShiftDue(n, d(5, 25, 0), k);
  ok(!!pn && pn.shift === '야간' && pn.pre === true && pn.key === '2026-11-10_야간', `05:25 — 야간 마감 5분 전 창(${pn ? pn.key : '없음'})`);
  ok(M.ferryShiftDue(n, d(5, 24, 59), k) === null && M.ferryShiftDue(n, d(5, 30, 0), k).pre === false, '05:24:59 안 뜸 · 05:30:00 멈춤'); }
console.log('3. 수정 보고 — applyShiftEdit · 합계 자동');
{ const side = { excluded: false, basis: '잔여', tbl: { s20: { F: 15, E: 0 }, s40: { F: 8, E: 0 }, s45: { F: 0, E: 0 } }, total: { F: 23, E: 0, total: 23 }, doneTotal: 120, remainTotal: 23 };
  const cnt = { excluded: false, countsOnly: true, basis: '작업량', total: { total: 30 }, doneTotal: 30, remainTotal: 68, est: { tbl: { s20: { F: 0, E: 20 }, s40: { F: 0, E: 6 }, s45: { F: 0, E: 0 } }, total: { F: 0, E: 26, total: 26 } } };
  const rep = { shift: '주간', cutMs: 1, ship: { discharge: side, loading: { none: true } }, gangs: [{ no: 1, discharge: side, loading: cnt }, { no: 2, discharge: { excluded: true, reason: '작업 완료 — 보고 제외' }, loading: { none: true } }] };
  ok(M.shiftCellsTotal(M.shiftSideCells(side)).total === 23 && M.shiftCellsTotal(M.shiftSideCells(cnt)).total === 26, '칸 값 — 표가 있으면 표, 대수만이면 밑값');
  const ed = { by: '홍길동', at: 1000, sides: { g1: { discharge: { s20: { F: 13, E: 0 }, s40: { F: 8, E: 2 }, s45: { F: 0, E: 0 } }, loading: { s20: { F: 0, E: 24 }, s40: { F: 0, E: 6 }, s45: { F: 0, E: 0 } } }, g2: { discharge: { s20: { F: 9, E: 9 }, s40: { F: 0, E: 0 }, s45: { F: 0, E: 0 } } } } };
  const r2 = M.applyShiftEdit(rep, ed);
  const g1 = r2.gangs[0];
  ok(g1.discharge.edited && g1.discharge.total.F === 21 && g1.discharge.total.E === 2 && g1.discharge.total.total === 23 && g1.discharge.basis === '잔여' && g1.discharge.appTotal === 23, '고친 표 합계는 칸에서 다시 더한다 · 기준은 앱이 정한 그대로');
  ok(g1.loading.edited && !g1.loading.countsOnly && g1.loading.total.total === 30 && g1.loading.appCountsOnly === true, '대수만 나갔던 갱도 고치면 규격표가 된다');
  ok(r2.gangs[1].discharge.excluded === true && !r2.gangs[1].discharge.edited, '작업 완료(보고 제외) 쪽은 고쳐지지 않는다');
  ok(rep.gangs[0].discharge.total.total === 23 && !rep.gangs[0].discharge.edited && r2.edit.by === '홍길동', '앱이 센 보고는 그대로 남는다(얹기만) · 고친 사람이 남는다');
  ok(M.applyShiftEdit(rep, null) === rep && M.applyShiftEdit(rep, { sides: null }) === rep, '고친 것이 없으면 그대로'); }
console.log('4. 보고할 것이 없는 쪽은 보이지 않는다 — shiftSideShown');
{ const S = M.shiftSideShown;
  ok(S({ excluded: true, reason: '작업 완료 — 보고 제외' }) === false && S({ none: true }) === false && S(null) === false, '끝난 쪽(보고 제외)·없는 쪽은 안 보인다');
  ok(S({ excluded: false, basis: '작업량', total: { F: 0, E: 0, total: 0 }, doneTotal: 0, remainTotal: 134 }) === false, '아직 시작 안 한 쪽(작업량 0)은 안 보인다');
  ok(S({ excluded: false, basis: '잔여', total: { F: 23, E: 0, total: 23 }, doneTotal: 120, remainTotal: 23 }) === true && S({ excluded: false, countsOnly: true, basis: '작업량', total: { total: 30 }, doneTotal: 30, remainTotal: 68 }) === true, '작업 기록·잔여가 있으면 보인다(대수만 갱도)');
  ok(S({ excluded: false, edited: true, basis: '작업량', total: { F: 0, E: 0, total: 0 } }) === true, '사람이 고친 표는 0 이어도 보인다'); }
console.log('5. 카톡 글 — 보일 것이 없는 갱만 보내도 본문 없는 글이 나가지 않는다');
{ const done = { excluded: true, reason: '작업 완료 — 보고 제외' }, none = { none: true };
  const live = { excluded: false, basis: '잔여', tbl: { s20: { F: 5, E: 0 }, s40: { F: 0, E: 0 }, s45: { F: 0, E: 0 } }, total: { F: 5, E: 0, total: 5 }, doneTotal: 50, remainTotal: 5 };
  const rep = { shift: '주간', cutMs: new Date(2026, 10, 11, 17, 0).getTime(), perGang: true, ship: { discharge: live, loading: none }, gangs: [{ no: 1, discharge: done, loading: none }, { no: 2, discharge: live, loading: none }], unknown: { discharge: 0, loading: 0 } };
  const mine = M.buildFerry1700Message({ vsl: 'OBWH', voy: '2789E', rep, gangNos: [1] });
  ok(/🏗 1호기 — 보고할 것 없음/.test(mine) && !/작업 완료/.test(mine), `내 갱(1호기)이 끝났으면 «1호기 — 보고할 것 없음» 한 줄`);
  const all = M.buildFerry1700Message({ vsl: 'OBWH', voy: '2789E', rep });
  ok(/🏗 2호기\n■ 양하 — 잔여 5대/.test(all) && /  20ft  F 5 · E 0/.test(all) && !/선적/.test(all), '일하는 갱은 표까지 · 없는 선적은 적지 않는다'); }
ok(/^TallyOne 5\.2[1-9]|^TallyOne 5\.[3-9]|^TallyOne [6-9]/.test(M.APP_VERSION), `버전 ${M.APP_VERSION}`);
console.log(`\n갱 추적·5분 전 창·수정 보고 연막검사: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
