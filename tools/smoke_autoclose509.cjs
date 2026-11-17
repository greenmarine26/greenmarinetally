// 앱이 스스로 «완료 저장» 하는 판정·실행 연막검사 (TallyOne 5.09) — 실소스 번들로 시간 규칙·안전 가드·수석 판정·알림 대상·보관소 이동을 잰다.
//  검수사 2026-11-16 21:53·21:59·22:02. 실제 Firebase 에는 쓰지 않는다(메모리 스텁).
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_autoclose509.cjs <번들.cjs>'); process.exit(1); }
const mem = {}; global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, location: { hash: '' } };
process.on('unhandledRejection', () => {});
const M = require(path.resolve(B));
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const MIN = 60000, T = Date.UTC(2026, 10, 16, 12, 0, 0);
const both = (over = {}) => ({ info: { vsl: 'OBWH', voy_d: '2793E', voy_l: '2794W', dischargeDone: true, dischargeDoneAt: T - 5 * MIN, loadingDone: true, loadingDoneAt: T, ...over }, discharge: { x: 1 }, loading: { y: 1 } });
(async () => {
  console.log('1. 수석이 없으면 끝난 즉시');
  ok(M.autoCloseDecision(both(), { chiefs: [], now: T }).close === true, '양하·선적 완료 + 수석 접속 없음 → 끝난 시각에 바로 닫힘');
  ok(M.autoCloseDecision(both(), { chiefs: [], now: T - 1 }).close === false, '끝나기 전 시각은 닫지 않음');
  console.log('2. 수석이 접속해 있으면 30분');
  const idle = [{ name: '성창모', lastInputAt: T - 40 * MIN }];
  ok(M.autoCloseDecision(both(), { chiefs: idle, now: T + 29 * MIN }).close === false, '수석 조작이 끝나기 전 → 끝난 뒤 29분은 아직');
  ok(M.autoCloseDecision(both(), { chiefs: idle, now: T + 30 * MIN }).close === true, '끝난 뒤 30분 → 닫힘');
  const busy = [{ name: '성창모', lastInputAt: T + 20 * MIN }];
  ok(M.autoCloseDecision(both(), { chiefs: busy, now: T + 49 * MIN }).close === false, '수석이 끝난 20분 뒤 만졌으면 49분은 아직');
  ok(M.autoCloseDecision(both(), { chiefs: busy, now: T + 50 * MIN }).close === true, '마지막 조작에서 30분(50분) → 닫힘');
  const two = [{ name: 'a', lastInputAt: T + 5 * MIN }, { name: 'b', lastInputAt: T + 25 * MIN }];
  ok(M.autoCloseDecision(both(), { chiefs: two, now: T + 54 * MIN }).close === false && M.autoCloseDecision(both(), { chiefs: two, now: T + 55 * MIN }).close === true, '수석이 둘이면 더 늦게 만진 쪽 기준');
  console.log('3. 안전 가드');
  const rz = { info: { vsl: 'RZOR', voy_d: 'R127E', voy_l: 'R127W', dischargeDone: true, dischargeDoneAt: T }, discharge: { x: 1 } };
  ok(M.inspectorAllDone(rz) === true, '(전제) RZOR 모양 — 선적 자료·계획이 없으면 홈 판정은 양하만으로 «전부 완료»');
  const dz = M.autoCloseDecision(rz, { chiefs: [], now: T + 99 * MIN });
  ok(dz.close === false && dz.why === 'loadingVoyNotDone', '선적 항차가 배정됐는데 선적 완료 표시가 없으면 닫지 않음(RZOR R074E 사건)');
  ok(M.autoCloseDecision(both({ loadingDone: false, loadingDoneAt: 0 }), { chiefs: [], now: T + 99 * MIN }).close === false, '양하만 끝난 배는 닫지 않음');
  ok(M.autoCloseDecision(both(), { chiefs: [], now: T + 36 * 3600 * 1000 + 1 }).why === 'old', '끝난 지 36시간 넘은 옛 항차는 닫지 않음');
  ok(M.autoCloseDecision(both({ restoredAt: T + 1 }), { chiefs: [], now: T + 99 * MIN }).why === 'restored', '끝난 뒤 보관소에서 되살린 항차는 닫지 않음');
  ok(M.autoCloseDecision(both({ restoredAt: T - 10 * MIN }), { chiefs: [], now: T + 1 }).close === true, '되살린 뒤 새로 끝난 항차는 닫음');
  ok(M.autoCloseDecision(both({ dischargeDoneAt: 0, loadingDoneAt: 0 }), { chiefs: [], now: T }).why === 'noDoneAt', '끝난 시각을 모르면 닫지 않음');
  ok(M.autoCloseDecision({ info: both().info, discharge: { x: 1 }, loading: { y: 1 }, }, { chiefs: [], now: T }).close === true && M.autoCloseDecision(null).close === false, '빈 항차(null)는 닫지 않음');
  ok(M.autoCloseTimingOf({ ...both().info }, { chiefs: [], now: T }).close === true, 'info 만으로 거르는 1차 판정이 2차와 같은 시간 규칙');
  const nv = { info: { vsl: 'ATPR', dischargeDone: true, dischargeDoneAt: T - 5 * MIN, planLod: 12 }, discharge: { x: 1 }, loading: { y: 1 } };
  const nd = M.autoCloseDecision(nv, { chiefs: [], now: T + 99 * MIN });
  ok(nd.close === false && nd.why === 'notAllDone', '선적 구역이 있고 선적 완료 표시가 없는 배(항차 번호 없음)는 양하만 끝나도 닫지 않음 (' + nd.why + ')');
  console.log('4. 수석 판정 (소유자는 수석이 아니다)');
  ok(M.isRealChief('성창모') === true, '성창모(과장·수석검수) → 수석');
  ok(M.isRealChief('김성일') === false, '김성일(소유자) → 수석으로 세지 않음');
  ok(M.isRealChief('클로드') === false && M.isRealChief('') === false, '클로드(숨김·테스터)·빈 이름 → 아님');
  M.setServerRoles({ 시험수석: '수석검수', 시험테스터: '테스터' });
  ok(M.isRealChief('시험수석') === true && M.isRealChief('시험테스터') === false, '숨김이 아닌 «테스터» 직책도 수석으로 세지 않음');
  M.setServerRoles({});
  const now = Date.now();
  const insp = {
    김성일: { name: '김성일', loggedIn: true, lastActive: now - 50000, loginAt: now - 3600000, workMode: 'view' },
    클로드: { name: '클로드', loggedIn: true, lastActive: now - 50000, workMode: 'view' },
    성창모: { name: '성창모', lastActive: now - 99 * 3600000, lastMode: 'discharge', workMode: 'work' },
    최원형: { name: '최원형', loggedIn: true, lastActive: now - 1000, workMode: 'work' },
  };
  ok(M.presentChiefsOf(insp, M.isRealChief, now).length === 0, '실제 RTDB 모양(김성일·클로드 접속, 수석 접속 없음) → 접속 수석 0명 → 즉시 마감 규칙');
  insp.성창모 = { name: '성창모', loggedIn: true, lastActive: now - 10000, loginAt: now - 7200000, lastInputAt: now - 5 * MIN, workMode: 'view' };
  const pc = M.presentChiefsOf(insp, M.isRealChief, now);
  ok(pc.length === 1 && pc[0].name === '성창모' && pc[0].lastInputAt === now - 5 * MIN, '성창모가 접속하면 1명 · 마지막 조작 시각이 실림');
  insp.성창모 = { name: '성창모', loggedIn: true, lastActive: now - 10000, loginAt: now - 7200000, workMode: 'view' };
  ok(M.presentChiefsOf(insp, M.isRealChief, now)[0].lastInputAt === now - 7200000, '조작 시각이 없는 옛 판 기기는 로그인 시각으로 본다');
  insp.성창모 = { name: '성창모', loggedIn: true, lastActive: now - 10000, loginAt: now - 60000, lastInputAt: now - 86400000 };
  ok(M.presentChiefsOf(insp, M.isRealChief, now)[0].lastInputAt === now - 60000, '어제 조작 값이 남은 수석이 방금 로그인하면 로그인 시각을 쓴다');
  insp.성창모 = { name: '성창모', loggedIn: false, lastActive: now - 10000 };
  ok(M.presentChiefsOf(insp, M.isRealChief, now).length === 0, '로그아웃한 수석은 접속이 아님');
  console.log('5. 업데이트 알림 대상');
  //  5.10: 지금 APP_NOTE 는 5.10(일반 판)이라 «[수석]» 표지 판정은 5.09 때의 글을 견본으로 둔다(판별 함수 시험이 목적)
  const NOTE509 = '[수석] 5.09 작업을 마친 배를 수석이 없거나 30분 쓰지 않으면 앱이 스스로 완료 저장합니다.';
  ok(/^\[수석\] 5\.09 /.test(NOTE509) && !/['|&]/.test(NOTE509) && !/['|&]/.test(M.APP_NOTE), 'APP_NOTE 는 sed 를 깨는 글자가 없고 «[수석]» 표지 견본이 시작에서 판별됨');
  const s = M.splitNoteAudience(NOTE509);
  ok(s.chiefOnly === true && !s.text.includes('[수석]') && s.text.startsWith('5.09'), '표지는 화면 글에서 떼어짐');
  ok(M.canSeeUpdateNote(NOTE509, { isChief: false, isOwner: false }) === false, '일반 검수원에게는 안 보임');
  ok(M.canSeeUpdateNote(NOTE509, { isChief: true }) === true && M.canSeeUpdateNote(NOTE509, { isOwner: true }) === true, '수석·부수석·소유자에게는 보임');
  ok(M.canSeeUpdateNote('5.08 관리앱 접속 기록', { isChief: false }) === true, '표지 없는 일반 판은 모두에게 보임');
  console.log('6. 보관소로 옮기는 쓰기 (메모리 스텁)');
  global.__memdb = { voyages: { OBWH_2793E: both(), OBWH_2795E: { info: { vsl: 'OBWH', voy_d: '2795E' } } } };
  const dec = (v) => M.autoCloseDecision(v, { chiefs: [], now: T });
  let r = await M.fbAutoCloseVoyage('OBWH_2795E', dec);
  ok(r.closed === false && !!global.__memdb.voyages.OBWH_2795E && !global.__memdb.archive, '끝나지 않은 배는 보관도 삭제도 안 함 (' + r.why + ')');
  r = await M.fbAutoCloseVoyage('OBWH_2793E', dec);
  const arc = (global.__memdb.archive || {}).OBWH_2793E;
  ok(r.closed === true && !!arc && arc._archivedAt > 0 && arc.discharge && arc.loading && arc.info.vsl === 'OBWH', '끝난 배는 보관소에 통째로 백업 + 되읽기 확인');
  ok(!global.__memdb.voyages.OBWH_2793E && !!global.__memdb.voyages.OBWH_2795E, '보관 뒤 그 배만 화면 목록에서 사라짐');
  r = await M.fbAutoCloseVoyage('NOPE_1', dec);
  ok(r.closed === false && r.why === 'gone', '이미 사라진 항차는 조용히 건너뜀(다른 기기가 먼저 옮긴 경우)');
  global.__memdb.voyages.OBWH_2793E = both();
  global.__setfail = (p) => /^archive\//.test(p);
  r = await M.fbAutoCloseVoyage('OBWH_2793E', dec).catch((e) => ({ closed: false, why: 'throw:' + (e && e.message) }));
  global.__setfail = null;
  ok(r.closed === false && !!global.__memdb.voyages.OBWH_2793E, '보관소 쓰기가 실패하면 항차를 지우지 않음 (' + r.why + ')');
  mem['x'] = ''; 
  console.log(`\n결과: 통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
