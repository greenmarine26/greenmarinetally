// 4.79 연막검사 — 주간조/야간조 선택 · 근무시간 밖 조회만 · 연태 OBWH·일조 RZOR 예외 · 관리자 예외 · 옛 로그인(조 없음) 한 번 묻기 · 같은 호기 주간·야간 각 1인(실소스 번들, firebase 만 메모리 스텁)
//   검수사 2026-11-08 «방법은 로그인 하고 선박을 선택하면 야간조 입니까 주간조 입니까를 물어 선택하게 해야 겠습니다.» · «만약 야간조인데 지금 접속해 있다면 그인원은 보기만 하러 온것입니다» · «연태obwh 일조 rzor»
//   실행 — node tools/smoke_fix479.cjs <번들.cjs> <루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.window = { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {}, __mirLexicon: {}, __mirLexiconWrite: () => {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
const M = require(path.resolve(OUT));
let bad = 0, pass = 0;
const T = (c, why) => { if (c) pass++; else { bad++; console.error('  ✗ ' + why); } };
const K = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h, mi) - 9 * 3600000;   // KST 시각 → ms
const DAYT = K(2026, 11, 9, 10, 0), NIGHTT = K(2026, 11, 9, 23, 0);
const V = 'KKLC_2610N', OB = 'OBWH_2690W', RZ = 'RZOR_2611E';
const NORMAL = '최원형', NORMAL2 = '송제욱', NORMAL3 = '고현석';

(async () => {
  // ① 시각 판정 — 경계와 서버 시각
  T(M.shiftAt(K(2026, 11, 9, 6, 30)) === 'day' && M.shiftAt(K(2026, 11, 9, 6, 29)) === 'night' && M.shiftAt(K(2026, 11, 9, 17, 29)) === 'day' && M.shiftAt(K(2026, 11, 9, 17, 30)) === 'night' && M.shiftAt(K(2026, 11, 9, 8, 0)) === 'day' && M.shiftAt(K(2026, 11, 9, 19, 0)) === 'night' && M.shiftAt(K(2026, 11, 9, 0, 30)) === 'night', '주간 08:00~17:30 · 야간 19:00~06:30 경계(교대 사이는 다가오는 조 — currentShift 한 벌)');
  M.setServerOffset(5 * 3600000);   // 기기 시계가 서버보다 5시간 느리다
  T(Math.abs(M.serverNow() - (Date.now() + 5 * 3600000)) < 50, '서버 시각 = 기기 시각 + 서버 차이(기기 시계를 믿지 않는다)');
  M.setServerOffset(0);
  global.__memdb = { '.info': { serverTimeOffset: 7200000 } };
  const un = M.fbWatchServerOffset(); T(M.serverOffset() === 7200000, 'fbWatchServerOffset 이 .info/serverTimeOffset 을 읽어 세운다'); un(); M.setServerOffset(0);

  // ② 연태 OBWH·일조 RZOR 판정 한 벌
  T(M.isNoShiftShip(null, OB) && M.isNoShiftShip(null, RZ) && M.isNoShiftShip({ vsl: 'obwh' }, '') && !M.isNoShiftShip(null, V) && !M.isNoShiftShip(null, 'TNJP_2611N') && !M.isNoShiftShip(null, ''), '(다) 주야 없는 배 = OBWH·RZOR(·SMYA) 코드(항차 키 앞 코드·info.vsl), TNJP 등은 아니다');
  T(M.utilsIsNoShiftShip === M.isNoShiftShip, 'utils 가 같은 함수를 내보낸다(한 벌)');

  // ③ 조 선택 → 최종 모드
  T(M.shiftRequiredFor(NORMAL, V) && !M.shiftRequiredFor(NORMAL, OB) && !M.shiftRequiredFor(NORMAL, RZ) && !M.shiftRequiredFor(NORMAL, ''), '일반 검수원은 일반 배에서만 조를 묻는다');
  let r = M.resolveShift(NORMAL, V, 'night', DAYT);
  T(r.shift === 'night' && r.offShift === true, '(나) 야간조를 골랐는데 주간에 접속 = 조회만');
  r = M.resolveShift(NORMAL, V, 'day', NIGHTT); T(r.shift === 'day' && r.offShift === true, '(나) 주간조를 골랐는데 야간에 접속 = 조회만');
  r = M.resolveShift(NORMAL, V, 'night', NIGHTT); T(r.shift === 'night' && r.offShift === false, '야간조가 야간에 접속 = 작업자');
  r = M.resolveShift(NORMAL, V, 'day', DAYT); T(r.shift === 'day' && r.offShift === false, '주간조가 주간에 접속 = 작업자');
  r = M.resolveShift(NORMAL, OB, '', DAYT); T(r.shift === '' && r.offShift === false, '(다) 연태 OBWH — 조 없음·시간 제한 없음(낮)');
  r = M.resolveShift(NORMAL, RZ, 'night', DAYT); T(r.shift === '' && r.offShift === false, '(다) 일조 RZOR — 어느 조를 눌러도 조 없음·제한 없음');
  for (const ex of ['김성일', '클로드', '클로드2', '이현규', '전우수']) {
    T(M.isShiftExempt(ex), `(라) ${ex} 는 조·시간 예외`);
    const a = M.resolveShift(ex, V, '', NIGHTT), b = M.resolveShift(ex, V, 'day', NIGHTT);
    T(a.offShift === false && a.shift === 'night' && b.offShift === false, `(라) ${ex} — 조를 묻지 않고 시간 제한 없이 서버 시각의 조로 자동`);
  }
  T(!M.isShiftExempt(NORMAL) && !M.isShiftExempt(NORMAL2), '일반 검수원은 예외가 아니다');

  // ④ 선택 저장·읽기 — 근무시간 밖 조회만은 고른 선박을 들고 있다
  let ch = M.saveWorkChoice({ name: NORMAL, mode: 'view', offShift: true, voyageKey: V, equip: '', shift: 'night' });
  T(ch.mode === 'view' && ch.offShift === true && ch.voyageKey === V && ch.shift === 'night', '근무시간 밖 조회만 저장 — 선박·조·offShift 를 들고 있다');
  const back = M.readWorkChoice(NORMAL); T(back && back.offShift && back.voyageKey === V && M.isOffShiftView(back), '읽어도 그대로(작업자로 전환 단추의 근거)');
  T(M.ownVoyageOf(back) === V && M.canSeeVoyage(back, NORMAL, V) && !M.canSeeVoyage(back, NORMAL, 'OTHER_1') && M.voyagesScopeOf(NORMAL, back, false) === 'body:' + V, '일반 검수원은 근무시간 밖 조회만에서도 고른 선박 하나만 본다');
  T(Object.keys(M.visibleVoyagesOf(back, NORMAL, { [V]: {}, OTHER_1: {} })).join() === V, 'visibleVoyagesOf — 고른 배 하나');
  M.setActiveWorkChoice(back); T(M.isViewOnlyNow() && !M.canWorkNow() && M.isNotWorkerNow() && M.myWorkVoyageNow() === '', '쓰기 문지기는 조회만으로 막는다·작업 선박은 없다');
  const plainView = M.saveWorkChoice({ name: NORMAL, mode: 'view' }); T(plainView.voyageKey === '' && !plainView.offShift && !M.isOffShiftView(plainView), '일반 조회만(수석)은 종전대로 선박을 비운다');
  ch = M.saveWorkChoice({ name: NORMAL, mode: 'work', voyageKey: V, equip: '3호기', shift: 'day' });
  M.setActiveWorkChoice(ch); T(ch.shift === 'day' && M.myShiftNow() === 'day' && M.myWorkVoyageNow() === V && M.canWorkNow(), '작업자 저장 — 조가 남고 내 조를 읽는다');
  M.setActiveWorkChoice(null); M.clearWorkChoice();

  // ⑤ 옛 로그인(조 값 없음) — 한 번만 묻는다
  const legacy = { name: NORMAL, mode: 'work', voyageKey: V, equip: '3호기' };
  T(M.needsShiftAsk(legacy, NORMAL) === true, '(마) 조 값이 없는 작업자 = 묻는다');
  T(M.needsShiftAsk({ ...legacy, shift: 'night' }, NORMAL) === false, '(마) 답한 뒤에는 다시 묻지 않는다');
  T(M.needsShiftAsk({ ...legacy, voyageKey: OB }, NORMAL) === false && M.needsShiftAsk(legacy, '클로드') === false && M.needsShiftAsk(legacy, '김성일') === false && M.needsShiftAsk({ mode: 'view' }, NORMAL) === false, '(마) 연태·일조 배·예외 인원·조회만은 묻지 않는다');
  const askedAs = M.resolveShift(NORMAL, V, 'night', DAYT); T(askedAs.offShift === true, '(마) 옛 로그인이 답한 조가 근무시간 밖이면 조회만으로 바뀐다');

  // ⑥ 서버 기록 → 호기 보유 키 (실소스 firebase.js + equipHold)
  global.__memdb = { inspectors: {} }; global.__memlog = [];
  const login = async (name, choice) => { await M.fbSetInspector(name); const upd = { ...M.saveWorkChoice({ name, ...choice }), ...choice }; await M.fbSetInspectorChoice(name, upd); };
  const inspectors = () => global.__memdb.inspectors;
  await login('A주간', { mode: 'work', voyageKey: V, equip: '3호기', shift: 'day' });
  const rec = inspectors()['A주간'];
  T(rec.workShift === 'day' && rec.assignEquip === '3호기' && rec.assignVoyage === V && rec.workMode === 'work' && rec.offShift === false, '서버 기록 — workShift·assignEquip·assignVoyage');
  const now = Date.now();
  const holder = (voy, eq, me, sh) => M.equipHolderOf(inspectors(), voy, eq, me, now, sh);
  // 지금 시각과 무관하게 holder 조는 기록된 workShift 로 본다
  T(holder(V, '3호기', NORMAL2, 'day') === 'A주간', '(가)(바) 같은 조(주간)가 같은 호기를 고르려 하면 막힌다');
  T(holder(V, '3호기', NORMAL2, 'night') === '', '(가)(바) 야간조는 같은 호기를 쥘 수 있다(주야 각 1인)');
  await login('B야간', { mode: 'work', voyageKey: V, equip: '3호기', shift: 'night' });
  T(holder(V, '3호기', NORMAL3, 'night') === 'B야간' && holder(V, '3호기', NORMAL3, 'day') === 'A주간', '(바) 같은 호기에 주간 한 명·야간 한 명이 각각 쥔다 — 조마다 한 명씩 막는다');
  T(holder(V, '3호기', 'A주간', 'day') === '' && holder(V, '3호기', 'B야간', 'night') === '', '본인은 막지 않는다');
  T(holder(V, '2호기', NORMAL3, 'night') === '' && holder('OTHER_1', '3호기', NORMAL3, 'night') === '', '다른 호기·다른 항차는 상관없다');
  // 연태·일조 — 조를 보지 않는다
  await login('C연태', { mode: 'work', voyageKey: OB, equip: '1호기', shift: '' });
  T(inspectors()['C연태'].workShift == null, '연태 작업자는 조를 적지 않는다');
  T(holder(OB, '1호기', NORMAL2, 'day') === 'C연태' && holder(OB, '1호기', NORMAL2, 'night') === 'C연태', '(다) 연태 OBWH — 조와 상관없이 한 호기 한 명');
  await login('D일조', { mode: 'work', voyageKey: RZ, equip: '2호기', shift: '' });
  T(holder(RZ, '2호기', NORMAL2, 'night') === 'D일조' && holder(RZ, '2호기', NORMAL2, '') === 'D일조', '(다) 일조 RZOR — 조 없이 한 호기 한 명');
  // 근무시간 밖 조회만 — 호기·대기를 쥐지 않는다
  await login('E조회', { mode: 'view', offShift: true, voyageKey: V, equip: '', shift: 'night' });
  const e = inspectors()['E조회'];
  T(e.workMode === 'view' && e.assignVoyage === '' && e.assignEquip === '' && e.workShift === 'night' && e.offShift === true, '(나) 근무시간 밖 조회만 — workMode view·호기·선박 지정 없음(조는 남김)');
  T(holder(V, '', NORMAL2, 'night') === '' && M.standbyNamesOf(inspectors(), V, [], () => true).indexOf('E조회') < 0, '(나) 조회만은 호기도 대기도 아니다(최원형 «대기» 사건)');
  T(M.statusOf({ ...e, lastActive: Date.now() }) === 'online', '조회만은 작업중이 아니고 접속(online)');
  // 옛 기록(workShift 없음) — 지정 시각의 조로 본다
  global.__memdb.inspectors['F옛'] = { name: 'F옛', loggedIn: true, loginAt: now, lastActive: now, assignVoyage: V, assignEquip: '1호기', assignAt: DAYT, workMode: 'work' };
  T(M.holderShiftOf(global.__memdb.inspectors['F옛']) === 'day', '(마) 조 값이 없는 옛 기록은 지정한 시각의 조(주간)로 본다');
  T(M.holderShiftOf({ assignAt: NIGHTT }) === 'night' && M.holderShiftOf({ workShift: 'night', assignAt: DAYT }) === 'night', '적힌 조가 우선');
  // 작업자 전환 후 기록
  await M.fbSetInspectorChoice('E조회', { mode: 'work', voyageKey: V, equip: '', shift: 'night', offShift: true });
  T(inspectors()['E조회'].workMode === 'work' && inspectors()['E조회'].assignVoyage === V && inspectors()['E조회'].workShift === 'night', '작업자로 전환 — 명단에 work·선박·조가 선다');
  // 쓰기 문지기: 조회만 활동 기록은 작업 자리를 안 적는다
  M.setActiveWorkChoice(M.saveWorkChoice({ name: 'E조회', mode: 'view', offShift: true, voyageKey: V, shift: 'night' }));
  await M.fbSetInspectorActivity('E조회', V, 'discharge', { equip: '3호기' });
  T(inspectors()['E조회'].lastVoyage === null || inspectors()['E조회'].lastVoyage === undefined, '조회만 활동은 항차를 적지 않는다');

  // ⑥-2 4.79-01 — 같은 날 재로그인·새로고침도 지금 조로 다시 판정한다(감사 지적)
  const base = { name: NORMAL, mode: 'work', voyageKey: V, equip: '1', shift: 'day', offShift: false };
  let q = M.reshiftChoice(base, NIGHTT); T(q.mode === 'view' && q.offShift === true && q.voyageKey === V, '재로그인 — 낮에 고른 주간조가 밤에 다시 들어오면 조회만');
  q = M.reshiftChoice({ ...base, mode: 'view', offShift: true, shift: 'night' }, NIGHTT); T(q.mode === 'work' && q.offShift === false, '재로그인 — 낮에 조회만이던 야간조가 밤에 다시 들어오면 작업자');
  T(M.reshiftChoice(base, DAYT) === base, '재로그인 — 같은 조 시간이면 그대로');
  T(M.reshiftChoice({ ...base, voyageKey: OB }, NIGHTT).mode === 'work' && M.reshiftChoice({ ...base, name: '클로드' }, NIGHTT).mode === 'work' && M.reshiftChoice({ ...base, shift: '' }, NIGHTT).mode === 'work', '재로그인 — 연태·일조 배·면제 인원·조 없는 선택은 그대로');
  const rs2 = fs.readFileSync(path.join(ROOT, 'src/pages/LoginPage.jsx'), 'utf8'), ap2 = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  T(/onSelect\(name, reshiftChoice\(prev\)\)/.test(rs2) && /reshiftChoice\(r\)/.test(ap2), '재로그인 두 입구(LoginPage·App 복원)가 reshiftChoice 를 탄다');

  // ⑦ 소스 배선 — 화면·헤더·App·매뉴얼
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const L = rd('src/pages/LoginPage.jsx'), A = rd('src/App.jsx'), H = rd('src/components/Header.jsx'), BV = rd('src/components/BayViewWork.jsx'), HP = rd('src/data/helpData.js'), CD = rd('src/pages/ChiefDashboard.jsx'), U = rd('src/utils.js');
  T(/ShiftPick/.test(L) && /data-choice-shift/.test(rd('src/components/ShiftPick.jsx')) && /resolveShift\(choiceName, choiceVoyage, choiceShift\)/.test(L) && /equipHolderOf\(inspectors, choiceVoyage, n, choiceName, undefined, rs\.shift\)/.test(L), '로그인 선택 화면 — 선박 뒤 조 고르기·호기는 항차+호기+조로 막는다');
  T(/mode: 'view', offShift: true, voyageKey: choiceVoyage/.test(L) && /조회만으로 들어가기/.test(L), '로그인 화면 — 근무시간 밖이면 조회만 진입');
  T(/data-shift-switch/.test(H) && /작업자로 전환/.test(H) && /askConfirm\(\{[\s\S]{0,200}작업자로 전환/.test(H) && /onSwitchWorker=\{isOffShiftView\(workChoice\)/.test(A), '헤더 [작업자로 전환] — 확인 한 번 뒤 App 이 전환');
  T(/needsShiftAsk\(workChoice, inspector\)/.test(A) && /data-shift-ask/.test(A) && /fbWatchServerOffset\(\)/.test(A) && /u3s\(\)/.test(A), 'App — 옛 로그인 한 번 묻기·서버 시각 구독·해제');
  T(/myShiftNow\(\)/.test(BV), '베이뷰 호기 막기도 내 조를 넘긴다');
  T(/holderShiftOf/.test(CD) && /nowRank/.test(CD), '수석 대시보드 — 같은 호기 둘이면 지금 조가 이름');
  T(/4\.79~ 선박을 고르면 «주간조입니까 야간조입니까»를 묻는다/.test(HP) && !/인건비|급여/.test(HP + L + H + A + rd('src/components/ShiftPick.jsx') + rd('src/workShift.js')), '매뉴얼(helpData) 4.79 절 · 사용자 글에 금지어 없음');
  T(/APP_VERSION = 'TallyOne 4\.(79|[89]\d)/.test(U) && /APP_NOTE = '4\.(79|[89]\d)[^']*'/.test(U), 'APP_VERSION 4.79 이후 · APP_NOTE');
  const note = (U.match(/APP_NOTE = '([^']*)'/) || [])[1] || ''; T((note.match(/[.!?](\s|$)/g) || []).length <= 2 && !/[\/']/.test(note), 'APP_NOTE 두 문장 이내·작은따옴표 슬래시 없음');
  // 서버 한 곳에서만 조를 읽는다 — workShift 밖에서 06/18 경계를 따로 세지 않는다
  for (const f of ['src/workChoice.js', 'src/equipHold.js', 'src/pages/LoginPage.jsx', 'src/App.jsx']) T(!/getHours\(\)\s*[<>]=?\s*(6|18)\b/.test(rd(f)), `${f} 는 조 경계를 따로 세지 않는다`);

  console.log(`4.79 연막검사 ${pass}/${pass + bad} 통과` + (bad ? ` — 실패 ${bad}건` : ''));
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 예외', e); process.exit(1); });
