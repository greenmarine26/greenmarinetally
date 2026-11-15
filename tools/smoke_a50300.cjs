// 5.03 연막검사 — 건7 «나 오늘» 배 기준(3척 합 = 총합 · 자정 걸친 한 배 = 한 줄) · 건1 양하·선적 끝나면 자동 완료(순수 판정 + 소스 배선) · 건9 베이모드 칩이 부르는 rowFrom 큐 정렬.
//   실 Firebase 쓰기는 없다(순수 함수·소스 검사만). 사용: node tools/smoke_a50300.cjs <smoke_a50300_entry 번들.cjs> <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_a50300.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
let pass = 0, fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (c) pass++; else fail++; };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ME = '김성일';
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m, 0, 0).getTime();   // 2026-11-<d> h:m KST
const recs = (by, list, equip = '2호기') => Object.fromEntries(list.map((t, i) => [`C${by}${t}${i}`, { by, at: t, equip }]));
const ship = (vsl, voy, dis, lod, extra = {}) => ({ info: { vsl, voy, ...extra }, discharge: { completed: dis || {} }, loading: { completed: lod || {} } });

console.log('건7 — 3척 날: 배별 합 = 총합, 자정 걸친 한 배 = 한 줄');
{
  const NOW = at(16, 2, 0);   // 야간조 새벽 02:00
  const A_before = Array.from({ length: 10 }, (_, i) => at(15, 20, i * 10));       // 전날 20:00~21:30 (같은 야간조)
  const A_after = Array.from({ length: 5 }, (_, i) => at(16, 0, 10 + i * 15));     // 자정 뒤
  const B = Array.from({ length: 4 }, (_, i) => at(16, 0, 30 + i * 5));
  const Cdone = Array.from({ length: 6 }, (_, i) => at(16, 1, i * 8));
  const old = Array.from({ length: 7 }, (_, i) => at(15, 9, i * 5));                // 전날 주간조 — 오늘 조 밖
  const V = {
    SHIPA_1E: ship('SHIPA', '1E', recs(ME, A_before), recs(ME, A_after)),   // 양하 10(자정 전) + 선적 5(자정 뒤)
    SHIPB_2E: ship('SHIPB', '2E', recs(ME, B), {}),
    SHIPC_3E: ship('SHIPC', '3E', {}, recs(ME, Cdone)),
    SHIPD_4E: ship('SHIPD', '4E', recs(ME, old), {}),                          // 전날 낮 기록뿐 — 줄에 안 나온다
    SHIPE_5E: ship('SHIPE', '5E', recs('류청호', B), {}),                      // 남의 기록
  };
  const W = M.myTodayWindowStart(NOW);
  ok(W === at(15, 19, 0), '야간조 새벽의 창 시작 = 전날 19:00', new Date(W).toString());
  const me = M.computeMyToday(V, ME, NOW);
  const sum = me.ships.reduce((a, o) => a + o.dis + o.lod, 0);
  ok(me.ships.length === 3 && me.count === 25, '3척 · 총 25대(10+5 / 4 / 6)', JSON.stringify([me.count, me.ships.map((o) => o.key)]));
  ok(sum === me.count, '배별 합 = 총합', sum + ' vs ' + me.count);
  const a = me.ships.filter((o) => o.key === 'SHIPA_1E');
  ok(a.length === 1 && a[0].dis === 10 && a[0].lod === 5, '자정을 걸친 SHIPA 는 한 줄 — 양하 10 · 선적 5 (둘로 안 쪼개짐)', JSON.stringify(a));
  ok(!me.ships.some((o) => o.key === 'SHIPD_4E' || o.key === 'SHIPE_5E'), '전날 낮 기록·남의 기록 배는 안 나온다');
  const cut = M.myTodayByShip(V, ME, at(16, 0, 0), NOW);   // 옛 규칙(자정 컷)
  ok(cut.find((o) => o.key === 'SHIPA_1E').dis === 0, '(대조) 옛 자정 컷이면 SHIPA 양하 10대가 빠진다', JSON.stringify(cut.map((o) => [o.key, o.dis, o.lod])));
  //  낮: 창 = 오늘 0시(주간조 08:00 보다 이르다)
  const NOON = at(16, 14, 0);
  ok(M.myTodayWindowStart(NOON) === at(16, 0, 0), '주간조의 창 시작 = 오늘 0시(종전과 같다)');
  const day = M.computeMyToday(V, ME, NOON);
  ok(day.count === day.ships.reduce((a2, o) => a2 + o.dis + o.lod, 0) && day.count === 15, '낮에도 배별 합 = 총합(오늘 0시 이후 15대)', day.count);
  const none = M.computeMyToday(V, '없는사람', NOW);
  ok(none.count === 0 && none.ships.length === 0, '내 기록이 없으면 0대 · 줄 없음');
}
{
  const src = rd('src/pages/HomePage.jsx');
  ok(/data-home-me-chipships/.test(src) && /\{o\.vsl\} 양 <b/.test(src) && /· 선 <b/.test(src), '칩에 배마다 «배이름 양 N · 선 N» 을 그린다');
  ok(/fbGetMyArchivedToday\(myTodayWindowStart\(/.test(src), '보관 배 읽기도 같은 창으로 합산한다');
}

console.log('건1 — 양하·선적이 모두 끝나면 자동 완료(순수 판정)');
{
  const NOW = at(16, 18, 0);
  const comp = (n, base) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`K${i}`, { by: ME, at: base + i * 1000 }]));
  const mk = (info = {}, dis = true, lod = true) => ({ info: { vsl: 'TNJP', voy: '26376E', ...info }, ...(dis ? { discharge: { ediContainers: { a: 1 }, completed: comp(3, at(16, 17, 0)) } } : {}), ...(lod ? { loading: { ediContainers: { a: 1 }, completed: comp(3, at(16, 17, 10)) } } : {}) });
  const modes = (v, o) => M.autoCompleteTargets(v, { canWrite: true, now: NOW, ...o }).map((t) => t.mode).join('|');
  ok(modes(mk(), { remD: 0, remL: 0 }) === 'discharge|loading', '양하·선적 잔여 0 → 둘 다 자동 완료');
  ok(modes(mk(), { remD: 0, remL: 5 }) === 'discharge', '선적이 남았으면 양하만');
  ok(modes(mk(), { remD: 3, remL: 5 }) === '', '잔여가 남았으면 아무것도 안 쓴다');
  ok(modes(mk(), { remD: null, remL: null }) === '', '대수를 모르면(null) 쓰지 않는다');
  const t = M.autoCompleteTargets(mk(), { remD: 0, remL: null, canWrite: true, now: NOW })[0];
  ok(t && t.fields.dischargeDone === true && t.fields.dischargeDoneAuto === true && t.fields.dischargeDoneAt === at(16, 17, 0) + 2000, '필드 = 수동과 같은 Done·DoneAt + Auto 표식, 시각은 그 모드 마지막 완료', JSON.stringify(t));
  const manual = M.completeFieldsOf('loading', 123, false);
  ok(JSON.stringify(manual) === JSON.stringify({ loadingDone: true, loadingDoneAt: 123 }), '수동 완료 필드는 종전과 한 칸도 다르지 않다(Auto 표식 없음)', JSON.stringify(manual));
  //  터미널 진행(termProgressOf)
  const term = { termStat: { dis: { tot: 50, done: 50 }, lod: { tot: 30, done: 10 }, at: NOW } };
  ok(modes(mk(term), { remD: 9, remL: 9 }) === 'discharge', 'termProgressOf done>=total 이면 양하만(선적은 10/30)');
  //  안전망
  ok(modes(mk({ dischargeDone: true }), { remD: 0, remL: 9 }) === '', '이미 완료 표식이 있으면 다시 쓰지 않는다');
  ok(modes(mk({ dischargeDoneCancelled: true }), { remD: 0, remL: 9 }) === '', '사람이 취소한 양하는 되쓰지 않는다(…DoneCancelled)');
  ok(modes(mk({ loadingDoneAuto: true }), { remD: 9, remL: 0 }) === '', '자동으로 쓴 적이 있는데 표식이 사라진(일괄 취소) 선적은 되쓰지 않는다');
  ok(modes(mk(), { remD: 0, remL: 0, canWrite: false }) === '', '조회만·테스터 계정(canWrite=false)은 쓰지 않는다');
  ok(modes(mk({ inspectorDone: true }), { remD: 0, remL: 0 }) === '', '수석 완료(inspectorDone) 배는 건드리지 않는다');
  ok(modes(mk({ cancelDis: true }), { remD: 0, remL: 0 }) === 'loading', '전량 캔슬로 표시된 양하는 완료로 쓰지 않는다');
  const wait = mk({ planLod: 371 }, true, false);   // 양하 자료 있음 · 선적 자료 없음 · 선적 계획 수량만 = EDI 대기 (DXQD 모양)
  ok(modes(wait, { remD: 0, remL: null }) === '', '선적 EDI 대기 배(ediWaitingOnlyLeft 모양)는 양하·선적 모두 쓰지 않는다');
  ok(modes(mk({}, true, false), { remD: 0, remL: null }) === 'discharge', '선적이 아예 없는 배(계획 수량도 없음)는 양하 완료만 쓴다');
  ok(modes({ info: {} }, { remD: 0, remL: 0 }) === '', '자료가 없는 배는 쓰지 않는다');
}
{
  const hp = rd('src/pages/HomePage.jsx'), cd = rd('src/pages/ChiefDashboard.jsx');
  ok(/fbUpdateVoyageInfo\(key, completeFieldsOf\(mode, Date\.now\(\), false\)\)/.test(hp), '수동 performComplete 와 자동이 같은 completeFieldsOf 한 벌을 쓴다');
  ok(/dischargeDoneCancelled: true/.test(hp) && /loadingDoneCancelled: true/.test(hp), '사람이 완료를 취소하면(undoInspectorDone) 취소 표식을 남긴다');
  ok(/dischargeDoneAuto: null, dischargeDoneCancelled: null/.test(hp) && /loadingDoneAuto: null, loadingDoneCancelled: null/.test(hp), '양하/선적 구역을 지울 때 자동·취소 표식도 같이 지운다');
  ok(/autoDone=\{!!inspector && !_viewOnly && !HIDDEN_STAFF\.includes\(inspector\) && !isTester\(inspector\)\}/.test(hp), '조회만·클로드 테스터 계정·테스터 직급은 자동 쓰기 끔');
  ok(/autoCompleteTargets\(voyage, \{ remD: _aRemD, remL: _aRemL, canWrite: true \}\)/.test(hp) && /\[배지\] sticky/.test(hp) && /\[자동 완료\] 저장 실패/.test(hp), 'ShipRow useEffect(departBadgeAt 방식) · 실패는 console.warn');
  ok(/doComplete = async \(row\)/.test(cd) && /onClick=\{\(\) => setConfirmKey\(r\.key\)\}/.test(cd) && /수석 완료 저장/.test(cd), '수석 완료 저장 단추·doComplete 는 지우지 않았다(수동 안전망)');
  ok(/자동 완료됨/.test(cd) && /검수 진행 중/.test(cd) && /dischargeDoneAuto/.test(cd), '수석 대시보드가 «자동 완료됨 / 검수 진행 중» 을 보인다');
}

console.log('건9 — 베이모드 칩이 부르는 큐 정렬(rowFrom)');
{
  const c = (cn, row) => ({ cn, bay: '02', row, tier: '82', iso: '4510', pol: 'KRPTK', pod: 'KRPTK', type: 'FULL' });
  const cs = [c('AAAU0000001', '01'), c('BBBU0000002', '02'), c('CCCU0000003', '03'), c('DDDU0000004', '04')];
  const first = (rf) => M.buildGuidedQueue({ containers: cs, mode: 'discharge', evenRowsSeaSide: true, rowFrom: rf }).map((q) => q.main.cn);
  const land = first('land'), sea = first('sea');
  ok(land.length === 4 && sea.length === 4 && land[0] !== sea[0], '육상부터와 해상부터는 첫 카드가 다르다', JSON.stringify({ land, sea }));
  const g = rd('src/components/GuidedWorkPanel.jsx');
  ok(/bayMini \? miniOrderEl : orderEl/.test(g) && /data-gw-mini-order/.test(g), '베이모드(bayMini)는 한 줄 칩 miniOrderEl, 평소는 종전 orderEl');
  ok(/rowFrom,\s+\/\/ 3\.3: 양하/.test(g) && /const pickRow = \(r\) => \{ if \(r !== rowFrom\) saveWorkOrder/.test(g), '칩 → pickRow → saveWorkOrder → rowFrom → buildGuidedQueue(rowFrom) 가 이어진다');
  ok((g.match(/\{orderEl\}|bayMini \? miniOrderEl : orderEl/g) || []).length === 2, 'orderEl 호출부 전수 — 2곳(수동 전환 판 P.pred 줄 · 본 줄)');
}

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
