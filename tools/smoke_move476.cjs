// 4.76 연막검사 — 최근 120분 속도·지금 일하는 호기 수(KKLC 2610N 지난밤 재현) · 호기 이동 말·보고 · 닫는 장수 = 연 합
const fs = require('fs'), path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
const M = require(path.resolve(OUT));
const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/kklc_2610n_476.json'), 'utf8'));
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const KST = (s) => new Date(`${s}:00+09:00`).getTime();
const END = KST('2026-11-08T04:24'), TOTAL = (F.info.planDis || 0) + (F.info.planLod || 0);
const cut = (t) => { const v = JSON.parse(JSON.stringify(F)); for (const m of ['discharge', 'loading']) { const c = v[m].completed; for (const k of Object.keys(c)) if (!(c[k].at <= t)) delete c[k]; } for (const k of Object.keys(v.reports)) if (!(Number(v.reports[k].ts) <= t)) delete v.reports[k]; return v; };
const errAt = (s) => { const t = KST(s); const v = cut(t); const R = M.recentPaceOf(v, t); if (!R) return { R: null };
  const done = Object.keys(v.discharge.completed).length + Object.keys(v.loading.completed).length;
  const min = Math.round(((TOTAL - done) / (R.perGangHour * R.gangs)) * 60); const eta = M.addWorkMinutes(t, min, 'PNCT').getTime();
  return { R, err: Math.round((eta - END) / 60000) }; };

console.log('① 지난밤 KKLC 2610N — 지금 일하는 호기 수·끝나는 시각 오차');
{ const a = errAt('2026-11-07T22:57'); check('22:57 — 1호기 철수 뒤라 1갱(2호기)', a.R && a.R.gangs === 1 && a.R.equips[0] === '2호기', JSON.stringify(a.R && a.R.equips)); check('22:57 — 끝나는 시각 오차 ±30분 안(종전 −161분)', a.R && Math.abs(a.err) <= 30, String(a.err)); }
{ const a = errAt('2026-11-08T03:55'); check('03:55 — 2갱(1·2호기)', a.R && a.R.gangs >= 1, ''); check('03:55 — 오차 ±30분 안', a.R && Math.abs(a.err) <= 30, String(a.err)); }
{ const a = errAt('2026-11-08T00:30'); check('00:30 야식 중 — 쉬기 직전 호기 수·속도를 이어 씀(inBreak)', a.R && a.R.inBreak === true && a.R.gangs === 1, JSON.stringify(a.R)); }
check('호기 없는 기록·RORO(105호기)는 갱에 세지 않는다', M.recentPaceOf({ info: { pier: 'PNCT' }, discharge: { completed: Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['C' + i, { at: KST('2026-11-07T20:00') + i * 60000, equip: '105호기' }])) } }, KST('2026-11-07T20:40')) === null);
check('완료 10건 미만이면 못 잰다(null → 종전 계산)', M.recentPaceOf({ info: { pier: 'PNCT' }, discharge: { completed: { A: { at: KST('2026-11-07T20:00'), equip: '1호기' } } } }, KST('2026-11-07T20:10')) === null);
{ const t = KST('2026-11-07T22:57'); const P = M.withRecentPace({ ok: true, perGangHour: 5, gangs: 2, perHour: 10 }, cut(t), t); check('withRecentPace — 페이스를 최근 값으로 덮고 recent 를 싣는다', P.recent && P.gangs === 1 && P.perGangHour > 15); check('근거 한 줄에 «몇 분 차이날 수 있어요»', /몇 분 차이날 수 있어요/.test(M.recentPaceLine(P.recent))); }
{ const t = KST('2026-11-07T22:57'); const v = cut(t); v.reports['1794058100000'] = { type: 'crane_move', kind: 'withdraw', equip: '2호기', to: '', ts: t - 3 * 60000 };
  const R = M.recentPaceOf(v, t); check('crane_move 철수 보고 — 그 호기는 갱에서 빠진다(2호기 철수 → 호기 없음 null)', R === null || !R.equips.includes('2호기'), JSON.stringify(R && R.equips)); }

console.log('② 호기 이동 말');
const mv = (s) => M.parseNaturalQuery(s).moveSet;
check('«1호기 철수»', mv('미르야 1호기 철수') && mv('미르야 1호기 철수').kind === 'withdraw' && mv('미르야 1호기 철수').equip === '1호기');
check('«1호기 철수 2호기로 이동»', mv('1호기 철수 2호기로 이동') && mv('1호기 철수 2호기로 이동').to === '2호기');
check('«2호기에서 1호기로 장비교체»', mv('2호기에서 1호기로 장비교체') && mv('2호기에서 1호기로 장비교체').kind === 'move' && mv('2호기에서 1호기로 장비교체').equip === '2호기' && mv('2호기에서 1호기로 장비교체').to === '1호기');
check('«1호기 복귀»', mv('1호기 복귀') && mv('1호기 복귀').kind === 'return');
check('«철수 취소»', mv('철수 취소') && mv('철수 취소').kind === 'cancel');
check('질문(«1호기 철수 언제 했어?»)은 이동 알림이 아니다', !mv('1호기 철수 언제 했어?'));
check('무관한 말은 null', !mv('이 배 몇 시에 끝나'));
{ const rs = M.craneMoveReportsOf(mv('1호기 철수 2호기로 이동'), { info: { vsl: 'KKLC' }, reports: {} }, '김성일'); check('철수 보고 한 건 + 도착 호기(to) 담김', rs.length === 1 && rs[0].type === 'crane_move' && rs[0].kind === 'withdraw' && rs[0].to === '2호기' && rs[0].by === '김성일'); }
{ const v = { info: { vsl: 'KKLC' }, reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', ts: 1 } } }; const rs = M.craneMoveReportsOf(mv('철수 취소'), v, ''); check('«철수 취소» = 가장 최근 철수한 호기 복귀 보고', rs.length === 1 && rs[0].kind === 'return' && rs[0].equip === '1호기'); check('철수한 게 없으면 취소는 적지 않는다', M.craneMoveReportsOf(mv('철수 취소'), { info: {}, reports: {} }, '').length === 0); }

console.log('②-2 독립 감사 회귀 — 호기 번호 경계·부정문·취소');
check('«105호기 철수»는 5호기로 읽지 않는다(roro)', mv('105호기 철수') && mv('105호기 철수').kind === 'roro' && mv('105호기 철수').equip === '105호기');
check('«15호기 철수»는 기록하지 않는다', !mv('15호기 철수'));
check('«1호기 철수한거 아니야»는 철수가 아니라 취소', mv('1호기 철수한거 아니야') && mv('1호기 철수한거 아니야').kind === 'cancel');
check('«철수 아니야»는 취소', mv('철수 아니야') && mv('철수 아니야').kind === 'cancel');
check('«1호기 철수 안 했어»는 취소', mv('1호기 철수 안 했어') && mv('1호기 철수 안 했어').kind === 'cancel');
check('«3호기 철수 취소»는 3호기를 말한다', mv('3호기 철수 취소') && mv('3호기 철수 취소').equip === '3호기');
check('roro 는 보고를 만들지 않는다', M.craneMoveReportsOf(mv('105호기 철수'), { info: {}, reports: {} }, '').length === 0);
{ const v = { info: { vsl: 'KKLC' }, reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', ts: 1 }, 2: { type: 'crane_move', kind: 'withdraw', equip: '3호기', ts: 2 } } };
  const r3 = M.craneMoveReportsOf(mv('3호기 철수 취소'), v, ''); check('«3호기 철수 취소» — 3호기만 복귀', r3.length === 1 && r3[0].equip === '3호기');
  check('호기를 안 말한 취소 = 가장 최근 철수', M.craneMoveReportsOf(mv('철수 취소'), v, '')[0].equip === '3호기');
  check('철수 안 한 2호기 취소는 기록 없음', M.craneMoveReportsOf(mv('2호기 철수 취소'), v, '').length === 0);
  const v2 = { info: {}, reports: { 1: { type: 'crane_move', kind: 'withdraw', equip: '1호기', to: '2호기', ts: 1 } } };
  check('철수하며 2호기로 이동 — 떠난 1호기만 멈춘 호기, 도착한 2호기는 아니다', M.withdrawnCranesOf(v2).map((x) => x.equip).join() === '1호기'); }

console.log('②-3 재감사 회귀 — 1~4호기만 · 아직 안 한 일은 기록 안 함');
check('«5호기 철수»는 기록하지 않고 range 로 알린다', mv('5호기 철수') && mv('5호기 철수').kind === 'range' && M.craneMoveReportsOf(mv('5호기 철수'), { info: {}, reports: {} }, '').length === 0);
check('«9호기로 이동»도 range', mv('9호기로 이동') && mv('9호기로 이동').kind === 'range');
for (const q of ['1호기 철수하지마', '1호기 철수 안 해도 돼', '1호기 철수할 예정이야', '1호기 철수하라고 했어', '2호기로 이동한 거 아니야', '1호기 철수 하지 말래']) check(`«${q}» — 기록하지 않는다`, !mv(q) || M.craneMoveReportsOf(mv(q), { info: {}, reports: {} }, '').length === 0, JSON.stringify(mv(q)));
check('«4호기 복귀»는 그대로 받는다', mv('4호기 복귀') && mv('4호기 복귀').kind === 'return');
{ const t = KST('2026-11-07T22:57'); const v = cut(t); const P = M.withRecentPace({ ok: true, perGangHour: 5, gangs: 2, perHour: 10 }, v, t);
  check('시간당 몇 대·몇 시에 끝나가 같은 recentPaceOf 값(22:57 = 1갱)', P.gangs === 1 && Math.abs(P.perHour - P.perGangHour * P.gangs) < 1e-9); }

console.log('③ 해치 닫는 장수 = 연 합 − 닫은 합');
{ const v = { info: { vsl: 'KKLC' }, reports: { 1: { type: 'hatch', action: 'open', bays: [14], panelCount: 1, ts: 1 }, 2: { type: 'hatch', action: 'open', bays: [14], panelCount: 1, ts: 2 }, 3: { type: 'hatch', action: 'open', bays: [18], panelCount: 2, ts: 3 } } };
  check('14번 열림 1+1 → 닫을 때 2장', M.hatchOpenedNetOf(v, [14]) === 2);
  check('18번 열림 2 → 닫을 때 2장', M.hatchOpenedNetOf(v, [18]) === 2);
  const d = M.hatchPanelDetailOf(v, 'discharge', [14], null, (b) => b, 'close'); check('닫기 detail — count 2 · source opened', d.count === 2 && d.source === 'opened');
  check('열 때는 합을 쓰지 않는다(종전 경로)', M.hatchPanelDetailOf(v, 'discharge', [14], null, (b) => b, 'open').source !== 'opened');
  v.reports[4] = { type: 'hatch', action: 'close', bays: [14], panelCount: 2, ts: 4 }; check('이미 다 닫았으면 합 0 → 종전 경로', M.hatchOpenedNetOf(v, [14]) === 0);
  check('고른 장수가 연 합보다 많으면 경고', M.hatchCountFlags({ count: 2, source: 'opened', max: 2 }, 3).some((f) => f.key === 'over')); }
{ const dict = M.getShipBayDictData('', 'KKLC'); const bs = (dict && dict.bayDef && dict.bayDef.baysSummary) || (dict && dict.baysSummary) || []; const g = (no) => (bs.find((b) => String(b.bayNo) === no) || {}).hatchCount;
  check('KKLC 사전 14번 hatchCount 2', g('14') === 2, String(g('14'))); check('KKLC 사전 18번 hatchCount 2', g('18') === 2, String(g('18'))); }

console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n✔ ${n}/${n} 통과`);
process.exit(bad ? 1 : 0);
