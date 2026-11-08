// 4.77 연막검사 — 호기 이동 단추 보고 · 동방 3호기 실 LOLO 36대(RZOR R123E) · 철수 호기 상황판 · 해치 열림닫힘 화물 추정(KKLC 2610N)
const fs = require('fs'), path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const KST = (s) => new Date(`${s}:00+09:00`).getTime();

console.log('① 호기 이동 단추가 만드는 보고');
{ const r = M.craneMoveReportOf({ kind: 'withdraw', equip: '1호기', reason: '장비고장', vsl: 'KKLC', inspector: '김성일' });
  check('철수 — type crane_move · kind withdraw · 호기 1호기 · 사유 장비고장', r.type === 'crane_move' && r.kind === 'withdraw' && r.equip === '1호기' && r.reason === '장비고장', JSON.stringify(r));
  check('보낸 사람이 by 에 남는다', r.by === '김성일');
  check('메시지에 사유가 들어간다', /사유: 장비고장/.test(r.message)); }
{ const r = M.craneMoveReportOf({ kind: 'move', equip: '1호기', to: '2호기', reason: '선적 전환' });
  check('이동 — 이동 — 1호기에서 2호기로, 사유 선적 전환', r.equip === '1호기' && r.to === '2호기' && r.reason === '선적 전환', JSON.stringify(r)); }
{ const r = M.craneMoveReportOf({ kind: 'return', equip: '1호기' });
  check('복귀 — 사유를 안 골라도 «복귀» 가 들어간다', r.kind === 'return' && r.reason === '복귀'); }
{ const v = { reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', ts: 1000 } } };
  check('철수한 호기 목록에 1호기', M.withdrawnCranesOf(v).map((x) => x.equip).join() === '1호기');
  v.reports[2] = M.craneMoveReportOf({ kind: 'return', equip: '1호기' }); v.reports[2].ts = 2000;
  check('복귀하면 목록에서 빠진다', M.withdrawnCranesOf(v).length === 0); }

console.log('② 동방 3호기 = 실 LOLO 물량만 (RZOR R123E)');
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_r123e_477.json'), 'utf8'));
  const before = M.qcRowsOf(F.info.qcWork);
  const fixed = M.qcWorkLoloFix(F); const rows = M.qcRowsOf(fixed.info.qcWork);
  const r3 = rows.find((x) => x.no === 3), r105 = rows.find((x) => x.no === 5);
  check('터미널 값은 3호기 양하 96 · 105호기 86', before.find((x) => x.no === 3).disDone === 96 && before.find((x) => x.no === 5).disDone === 86);
  check('고친 3호기 양하 = 36대(실 LOLO)', r3 && r3.disDone === 36 && r3.disRest === 0, JSON.stringify(r3));
  check('고친 램프(QC105 · 5호기 자리) 양하 = 146대', r105 && r105.disDone === 146, JSON.stringify(r105));
  check('양하 합계는 그대로 182', rows.reduce((s, x) => s + x.disDone, 0) === 182);
  check('선적 값은 터미널 그대로(3호기 32 · 105호기 139)', r3.lodDone === 32 && r105.lodDone === 139);
  check('LOLO 표시가 없는 항차는 손대지 않는다', M.qcWorkLoloFix({ info: F.info, discharge: { ediContainers: { A: { cn: 'A' } } } }).info.qcWork === F.info.qcWork);
  check('이미 고친 값에 다시 적용해도 같다', JSON.stringify(M.qcWorkLoloFix(fixed).info.qcWork) === JSON.stringify(fixed.info.qcWork)); }
check('crewCraneNo — QC105(램프 검수 자리)는 종전대로 5호기, QC103은 3호기', M.crewCraneNo('QC105') === 5 && M.crewCraneNo('QC103') === 3);
check('isCraneNo — 1~4호기만 갱(5호기 자리·100번대·0은 아님)', M.isCraneNo(1) && M.isCraneNo(4) && !M.isCraneNo(5) && !M.isCraneNo(105) && !M.isCraneNo(0) && M.RAMP_NO === 5);
check('QC105 칸은 램프로 읽는다', M.isRampQcKey('QC105', { qc: 'QC105' }) && !M.isRampQcKey('QC103', { qc: 'QC103' }) && !M.isRampQcKey('QC101', {}));
{ const nos = M.craneBaysByTime({ info: { qcWork: { QC103: { qc: 'QC103', disDone: 5 }, QC105: { qc: 'QC105', disDone: 9 } } }, discharge: { termWork: {} }, loading: { termWork: {} } });
  check('호기 목록 [3,5] 모순 — 램프를 빼면 호기가 하나뿐', /하나뿐/.test(nos.why), JSON.stringify(nos.why)); }

console.log('③ 철수 호기 — 상황판 · 호기별 집계');
{ const now = KST('2026-11-08T03:00');
  const rows = [{ no: 1, done: 10, idleMin: 1, src: 'term' }, { no: 2, done: 8, idleMin: 2, src: 'term' }, { no: 3, done: 6, idleMin: 1, src: 'term' }];
  const v = { reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', reason: '장비고장', ts: now - 600000 } } };
  const ms = M.craneMoveStateOf(v); const sp = M.craneBoardSplit(rows, now, 30, null, ms);
  check('철수한 1호기는 멈춘 호기로(withdrawn)', sp.stopped.some((c) => c.no === 1 && c.withdrawn) && sp.active.every((c) => c.no !== 1), JSON.stringify(sp));
  v.reports[2] = { type: 'crane_move', kind: 'return', equip: '1호기', ts: now - 60000 };
  const sp2 = M.craneBoardSplit(rows, now, 30, null, M.craneMoveStateOf(v));
  check('복귀하면 다시 일하는 호기', sp2.active.some((c) => c.no === 1) && !sp2.stopped.some((c) => c.no === 1), JSON.stringify(sp2));
  const v3 = { reports: { 1: { type: 'crane_move', kind: 'move', equip: '1호기', to: '3호기', reason: '선적 전환', ts: now - 300000 } } };
  const sp3 = M.craneBoardSplit(rows, now, 30, null, M.craneMoveStateOf(v3));
  check('이동 도착(3호기)은 일하는 호기, 떠난 1호기는 멈춤', sp3.stopped.some((c) => c.no === 1) && sp3.active.some((c) => c.no === 3), JSON.stringify(sp3)); }


console.log('③-2 철수 해제 — 실적·live·날 바뀜·항차 마감, 램프는 갱이 아니다');
{ const now = KST('2026-11-08T03:00');
  const wd = { reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', ts: now - 30 * 60000 } } };
  const rowsOf = (extra) => [{ no: 1, done: 10, idleMin: 0, src: 'term', ...extra }, { no: 2, done: 8, src: 'term', lastAt: now - 60000 }];
  const sp0 = M.craneBoardSplit(rowsOf({ lastAt: now - 40 * 60000 }), now, 30, null, M.craneMoveStateOf(wd));
  check('철수 뒤 실적 없음 — 멈춘 호기 유지', sp0.stopped.some((c) => c.no === 1 && c.withdrawn));
  const sp1 = M.craneBoardSplit(rowsOf({ lastAt: now - 5 * 60000 }), now, 30, null, M.craneMoveStateOf(wd));
  check('철수 보고 뒤에 그 호기 실적이 찍히면 해제(일하는 호기)', sp1.active.some((c) => c.no === 1) && !sp1.stopped.some((c) => c.no === 1 && c.withdrawn), JSON.stringify(sp1));
  const sp2 = M.craneBoardSplit(rowsOf({ lastAt: now - 40 * 60000, src: 'live' }), now, 30, null, M.craneMoveStateOf(wd));
  check('앱에 붙은 검수원(live)이 있으면 해제', sp2.active.some((c) => c.no === 1));
  const next = KST('2026-11-09T10:00');
  const sp3 = M.craneBoardSplit([{ no: 1, done: 10, src: 'term', lastAt: next - 2 * 60000 }, { no: 2, done: 8, src: 'term', lastAt: next - 60000 }], next, 30, null, M.craneMoveStateOf({ reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', ts: now } } }));
  check('다른 근무일이면 철수 자동 해제', sp3.active.some((c) => c.no === 1));
  check('항차가 마감됐으면 철수 기록을 읽지 않는다', M.craneMoveStateOf({ info: { workEndAt: '2026-11-08 04:40' }, reports: wd.reports }).size === 0);
  check('105호기 원문은 호기 이동으로 읽지 않는다', M.craneMoveStateOf({ reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '105호기', ts: now } } }).size === 0);
  const sp4 = M.craneBoardSplit([{ no: 3, done: 5, src: 'term', lastAt: now - 60000 }, { no: 5, done: 99, src: 'term', lastAt: now - 60000 }], now, 30, null, null);
  check('램프(5호기 자리)는 갱 active 에 안 들어가고 ramp 로 따로', sp4.active.map((c) => c.no).join() === '3' && sp4.ramp.length === 1 && sp4.ramp[0].done === 99, JSON.stringify(sp4)); }

console.log('⑤ 화면 연결 · 콘앱 연결 · 미르 입력 (소스 검사)');
{ const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const wr = rd('src/components/WorkReportModal.jsx');
  check('작업 보고 첫 화면에 호기 이동 단추(data-crane-move) + 화면 전환', /data-crane-move="1"/.test(wr) && /setView\('cranemove'\)/.test(wr) && /view === 'cranemove'/.test(wr));
  check('저장 단추가 handleCraneMove 에 연결 · 저장 중 중복 눌림 방지(cmBusy) · 실패 시 한글 오류', /onClick=\{handleCraneMove\}/.test(wr) && /if \(cmBusy\) return/.test(wr) && /호기 이동 보고를 저장하지 못했습니다/.test(wr));
  check('fbAddWorkReport 호출에 by 를 남긴다', /fbAddWorkReport\(voyageKey, \{ \.\.\.r, by: inspector \|\| r\.by \|\| '' \}\)/.test(wr));
  const cone = rd('public/cone.html');
  check('콘앱 본선 현황 표(CT.tb)가 보정한 호기 표를 쓴다', /CT\.tb = \(_infAll && typeof _infAll==='object'\) \? ctInfoFixQc\(_infAll, CT\.qc\)/.test(cone));
  check('콘앱 미르 ctx.info 도 보정한 호기 표를 쓴다(두 군데)', (cone.match(/ctInfoFixQc\(info, CT\.qc\)/g) || []).length === 2 && (cone.match(/typeof CT!=='undefined'/g) || []).length >= 2);
  const mir = rd('src/mir.js');
  check('미르 _qcBusyNos 가 보정 전 터미널 원값(termDisDone)으로 판정한다', /q\.termDisDone != null/.test(mir));
  const fe = rd('src/components/Ferry1700Alert.jsx');
  check('17시 마감 보고에 보정값 표식(qcWorkFix)을 남긴다', (fe.match(/qcWorkFix: true/g) || []).length === 2); }

console.log('⑥ 해치 추정 방어');
{ const NET = (reps, bays) => M.hatchOpenedNetOf({ reports: reps }, bays);
  check('추정 열림 2장 + 사람 열림 2장 — 합이 4장으로 부풀지 않는다(사람 보고 우선)', NET({ 1: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 2, auto: true, src: 'est' }, 2: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 2 } }, ['14']) === 2);
  check('추정만 있으면 추정 합을 쓴다', NET({ 1: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 2, auto: true, src: 'est' } }, ['14']) === 2);
  check('추정 닫힘이 사람 열림 합을 지나치게 깎지 않는다(닫힘도 사람 보고 우선)', NET({ 1: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 2 }, 2: { type: 'hatch', action: 'close', bays: ['14'], panelCount: 2, auto: true, src: 'est' } }, ['14']) === 0); }
{ const T0 = KST('2026-11-08T01:00'); const pages = M.buildBayPagesFromSummary({ baysSummary: [{ bayNo: 4, hatchCount: 1 }] });
  const v = { info: { vsl: 'T', pier: 'PNCT' }, discharge: { termWork: {}, ediContainers: {}, completed: {} }, loading: { termWork: {}, ediContainers: {}, completed: {} }, reports: {} };
  let t = 0; for (let i = 0; i < 4; i++) v.discharge.termWork['H' + i] = { at: T0 + (t++) * 60000, pos: '040102', equip: '1호기' };
  for (let i = 0; i < 4; i++) v.loading.termWork['L' + i] = { at: T0 + (t++ + 2) * 60000, pos: '040184', equip: '1호기' };
  const r = M.hatchEventsOf(v, pages, T0 + 90 * 60000); const close = r.events.find((e) => e.action === 'close');
  const lastHold = T0 + 3 * 60000;
  check('추정 닫힘 시각은 마지막 홀드 실적 이후다(앞서지 않는다)', close && close.from >= lastHold, JSON.stringify(close)); }

console.log('⑧ craneBoardOf 경로 — 램프는 베이 짝짓기에 참여하지 않는다 (재감사 재현)');
{ const T0 = KST('2026-11-08T01:00'), tw = {};
  for (let i = 0; i < 6; i++) { tw['A' + i] = { at: T0 + i * 60000, pos: '060102' }; tw['B' + i] = { at: T0 + i * 60000, pos: '180102' }; }
  const v = { info: { vsl: 'T', pier: 'PNCT', berthSide: '우현', qcWork: { QC103: { qc: 'QC103', disDone: 6 }, QC105: { qc: 'QC105', disDone: 6 } } }, discharge: { termWork: tw, completed: {} }, loading: { termWork: {}, completed: {} }, reports: {} };
  const tb = M.craneBaysByTime(v, [3, 5]);
  check('craneNos 로 [3,5] 가 넘어와도 5(램프)는 걸러진다 — 호기가 하나뿐', /하나뿐/.test(tb.why) && !tb.byNo[5], JSON.stringify(tb));
  const rows = M.craneBoardOf(v, [], null, T0 + 10 * 60000); const r5 = rows.find((c) => c.no === 5);
  check('craneBoardOf 가 5호기(램프) 줄에 베이를 붙이지 않는다', !r5 || !r5.bay, JSON.stringify(r5)); }
check('gangEquipNo — 1~4호기만 갱(5호기·램프·105호기는 아님)', M.gangEquipNo('3호기') === '3호기' && M.gangEquipNo('5호기') === null && M.gangEquipNo('105호기') === null && M.gangEquipNo('QC105') === null && M.gangEquipNo('QC103') === '3호기');
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_r123e_477.json'), 'utf8'));
  const lag = JSON.parse(JSON.stringify(F)); lag.discharge.completed = Object.fromEntries(Object.entries(F.discharge.completed).slice(0, 20));   // 앱 완료 반영이 늦은 상황
  const rows = M.qcRowsOf(M.qcWorkLoloFix(lag).info.qcWork);
  check('완료 반영이 늦어도 3호기 36 · 램프 146 · 합계 182 유지', rows.find((x) => x.no === 3).disDone === 36 && rows.find((x) => x.no === 5).disDone === 146);
  const small = { QC103: { qc: 'QC103', disDone: 30, disRest: 0 }, QC105: { qc: 'QC105', disDone: 100, disRest: 0 } };
  check('터미널 3호기 합계가 LOLO 총수 이하면 분리하지 않는다', M.qcWorkLoloSplit(small, Array.from({ length: 36 }, (_, i) => 'C' + i), {}) === small); }

console.log('④ 해치 열림·닫힘 — 화물 순서로 채움 (공백이 없어도)');
{ const T0 = KST('2026-11-08T01:00'), mk = (cn, min, pos, mode, eq) => ({ cn, mode, at: T0 + min * 60000, pos, eq });
  const ev = (list) => { const v = { info: { vsl: 'T', pier: 'PNCT' }, discharge: { termWork: {}, ediContainers: {}, completed: {} }, loading: { termWork: {}, ediContainers: {}, completed: {} }, reports: {} };
    for (const r of list) v[r.mode].termWork[r.cn] = { at: r.at, pos: r.pos, equip: r.eq }; return v; };
  const dict = { bayDef: { baysSummary: [{ bayNo: 2, hatchCount: 1 }, { bayNo: 4, hatchCount: 1 }] } };
  const pages = M.buildBayPagesFromSummary(dict.bayDef);
  //  양하 데크 → 곧바로(공백 없이) 홀드 양하 → 곧바로 선적 데크: 공백 판정은 못 잡는다
  const list = []; let t = 0;
  for (let i = 0; i < 4; i++) list.push(mk('D' + i, t++, '040184', 'discharge', '1호기'));
  for (let i = 0; i < 4; i++) list.push(mk('H' + i, t++, '040102', 'discharge', '1호기'));
  for (let i = 0; i < 4; i++) list.push(mk('L' + i, t++, '040184', 'loading', '1호기'));
  const r = M.hatchEventsOf(ev(list), pages, T0 + 60 * 60000);
  const open = r.events.find((e) => e.action === 'open'), close = r.events.find((e) => e.action === 'close');
  check('홀드를 양하했으니 열림이 잡힌다', !!open, JSON.stringify(r.events));
  check('열려 있는 장의 데크에 선적이 시작됐으니 닫힘이 잡힌다', !!close, JSON.stringify(r.events));
  check('닫힘은 열림보다 늦다', open && close && close.from > open.from);
  const r2 = M.hatchEventsOf(ev(list.slice(0, 8)), pages, T0 + 60 * 60000);
  check('선적 데크가 없으면 닫힘은 없다(홀드 잔여 모름)', !r2.events.some((e) => e.action === 'close'), JSON.stringify(r2.events)); }
check('닫는 장수 = 연 합 − 닫은 합 (4.76 그대로)', M.hatchOpenedNetOf({ reports: { 1: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 1 }, 2: { type: 'hatch', action: 'open', bays: ['14'], panelCount: 1 } } }, ['14']) === 2);

console.log('⑦ 사용자 노출 글에 인건비(급여 설명) 없음');
{ const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const bad = [];
  for (const f of ['src/data/helpData.js', 'src/data/helpDataChief.js']) { const t = rd(f); if (/인건비|그날 몫|몫을 못 받/.test(t)) bad.push(f); }
  //  화면 글: 주석 줄(// 로 시작)과 줄 끝 주석은 개발자용이라 뺀다 — 따옴표 안 글자에 급여 말이 있으면 걸린다.
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk('src').filter((x) => /\.(jsx?|html)$/.test(x))) {
    if (/data\/helpData/.test(f)) continue;
    const lines = rd(f).split('\n');
    lines.forEach((ln, i) => { const code = ln.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, ''); if (/(['"`])[^'"`]*(인건비|그날 몫)[^'"`]*\1/.test(code)) bad.push(`${f}:${i + 1}`); });
  }
  const cone = rd('public/cone.html');
  cone.split('\n').forEach((ln, i) => { const code = ln.replace(/\/\/.*$/, ''); if (/(['"`])[^'"`]*(인건비|그날 몫)[^'"`]*\1/.test(code)) bad.push(`cone.html:${i + 1}`); });
  check('매뉴얼·화면·콘앱 글에 «인건비»·«그날 몫» 없음', bad.length === 0, bad.join(', ')); }

console.log(`\n${bad ? '✘' : '✔'} 4.77 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
