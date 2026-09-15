// «로그인 뒤 작업자/조회만» 선택(3.50) 연막검사 — jsdom 으로 로그인 선택 화면을 실제로 그리고 누른다. 실패하면 빌드를 세운다.
//   ① 일반 검수원(박진우) — 이름 → 시작 → 선박 단계(역할 단추 없음·경고 문구·선박 전엔 시작 불가) → STMJ 2652E → PCTC 호기 4개 → 1호기 → 시작 = {work, STMJ_2652E, 1호기}
//   ② 자유 열람(김성일, choiceFor) — 역할 단계 → 조회만 = {view} · 작업자 → 선박(호기 없이) 시작 = {work, TMPZ_2027E, ''} · «그대로 두기» = onCancelChoice
//   ②-B (3.50-01) 서버 직책(테스터)이 첫 그림 뒤에 도착해도 역할 단계로 올라간다 — [작업자]를 누른 뒤에는 안 되돌아간다
//   ③ 순수 — isFreeRoamer(소유자·테스터·검수·임원) · visibleVoyagesOf/canSeeVoyage(검수원 1척·자유 열람 15척) · readWorkChoice(이름·날짜) · 조회만이면 getEquipNumber ''·setEquipNumber 무시 · equipGateText 두 문구 · App 캐시(setActiveWorkChoice)가 localStorage 보다 앞선다
//   ④ inspectorStatus — workMode 'view' 면 활동이 있어도 'online' 까지
//   ⑤ 실소스 firebase.js(SDK 스텁) — 조회만이면 fbSetInspectorActivity 가 lastVoyage/lastMode/workEquip 을 null 로, workMode 'view' 로 쓴다. 작업자면 그대로. fbSetInspectorChoice 는 assign* 을 쓴다.
//   인자: [1] 렌더 번들(smoke_workchoice.jsx) · [2] firebase 문지기 번들(smoke_workchoice_fb.js)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
dom.window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
dom.window.alert = (m) => { alerts.push(String(m)); };
const alerts = [];
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error|Warning: /.test(s) && !/act\(\)/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
if (process.argv[3]) { try { dom.window.eval(fs.readFileSync(process.argv[3], 'utf8')); } catch (e) { errs.push('THROW(fb): ' + e.message); } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
(async () => {
  await wait(600);
  const W = dom.window, doc = W.document;
  const txt = () => doc.body.textContent || '';
  const byText = (re, sel = 'button') => [...doc.querySelectorAll(sel)].find((b) => re.test(b.textContent || ''));
  const noErr = () => { const u = [...new Set(errs)]; if (u.length) { console.log('✗ 렌더 중 오류 ' + u.length + '건'); u.slice(0, 4).forEach((e) => console.log('   ' + e)); process.exit(1); } };
  const until = async (fn, n = 40) => { for (let i = 0; i < n; i++) { if (fn()) return true; await wait(100); } return fn(); };
  const lastSel = () => [...W.__calls].reverse().find((c) => c.fn === 'select');
  noErr();
  const wc = W.__wc;
  if (!wc || !wc.voyages) fail('순수 함수·항차 사본이 없다');
  const NV = Object.keys(wc.voyages).length;
  if (NV !== 15) fail('실자료 사본 항차가 15척이 아니다: ' + NV);

  // ── ① 일반 검수원 박진우 ──
  if (doc.querySelector('[data-login-choice]')) fail('로그인 첫 화면인데 선택 단계가 떠 있다');
  const showAll = byText(/로그인 안 된 작업자 \d+명 보기/);
  if (!showAll) fail('«로그인 안 된 작업자 N명 보기» 단추가 없다: ' + txt().slice(0, 300));
  showAll.click(); await wait(150);
  const pj = [...doc.querySelectorAll('button')].find((b) => /박진우/.test(b.textContent || '') && !/시작/.test(b.textContent || ''));
  if (!pj) fail('명단에 박진우가 없다');
  pj.click(); await wait(150);
  const startBtn = byText(/박진우 님으로 시작/);
  if (!startBtn) fail('«박진우 님으로 시작» 단추가 없다');
  startBtn.click();
  if (!(await until(() => doc.querySelector('[data-login-choice="vessel"]')))) fail('일반 검수원이 선박 선택 단계로 안 넘어갔다(alert: ' + alerts.join(' | ') + '): ' + txt().slice(0, 300));
  noErr();
  if (doc.querySelector('[data-choice-role]')) fail('일반 검수원에게 조회만/작업자 단추가 보인다');
  const notice = doc.querySelector('[data-choice-notice="1"]');
  if (!notice || !/작업 선박을 고르지 않으면 들어갈 수 없습니다/.test(notice.textContent)) fail('진입 불가 경고 문구가 없다');
  if (!/고른 선박 안에서만/.test(notice.textContent)) fail('일반 검수원 문구(고른 선박 안에서만)가 아니다: ' + notice.textContent);
  let start = doc.querySelector('[data-choice-start="1"]');
  if (!start || !start.disabled) fail('선박을 고르기 전인데 시작 단추가 눌린다');
  if (doc.querySelector('[data-choice-equips="1"]')) fail('선박 전인데 호기 칩이 떠 있다');
  const vb = doc.querySelectorAll('[data-choice-voyage]');
  if (vb.length !== NV) fail(`선박 목록이 ${NV}척이어야 하는데 ${vb.length}`);
  const first = vb[0].getAttribute('data-choice-voyage');
  if (!/작업중|오늘|내일|모레|예정/.test(vb[0].textContent)) fail('선박 줄에 순위 라벨이 없다: ' + vb[0].textContent);
  const stmj = doc.querySelector('[data-choice-voyage="STMJ_2652E"]');
  if (!stmj) fail('STMJ_2652E 단추가 없다');
  stmj.click(); await wait(120);
  const chips = [...doc.querySelectorAll('[data-choice-equip]')].map((b) => b.getAttribute('data-choice-equip'));
  if (chips.join(',') !== '1호기,2호기,3호기,4호기') fail('PCTC 호기 칩이 1~4호기가 아니다: ' + chips.join(','));
  start = doc.querySelector('[data-choice-start="1"]');
  if (start.disabled) fail('선박을 골랐는데 시작이 막혀 있다');
  if (!/STMJ/.test(start.textContent)) fail('시작 단추에 선박명이 없다: ' + start.textContent);
  doc.querySelector('[data-choice-equip="1호기"]').click(); await wait(120);
  start = doc.querySelector('[data-choice-start="1"]');
  if (!/1호기/.test(start.textContent)) fail('호기를 골랐는데 시작 단추에 안 붙는다: ' + start.textContent);
  start.click(); await wait(120);
  let s = lastSel();
  if (!s || s.name !== '박진우' || !s.choice || s.choice.mode !== 'work' || s.choice.voyageKey !== 'STMJ_2652E' || s.choice.equip !== '1호기') fail('일반 검수원 선택 결과가 틀리다: ' + JSON.stringify(s));
  console.log(`  ① 박진우 — 선박 ${NV}척(첫 줄 ${first}) → STMJ_2652E · 1호기 → ${JSON.stringify(s.choice)} ✔`);

  // ── ② 자유 열람 김성일 (choiceFor — 헤더 [변경] 경로와 같다) ──
  let cancelled = 0;
  W.__mount({ choiceFor: '김성일', onCancelChoice: () => { cancelled++; } });
  if (!(await until(() => doc.querySelector('[data-login-choice="role"]')))) fail('자유 열람이 역할 단계로 안 뜬다: ' + txt().slice(0, 300));
  noErr();
  if (!doc.querySelector('[data-choice-role="view"]') || !doc.querySelector('[data-choice-role="work"]')) fail('조회만/작업자 단추가 없다');
  if (doc.querySelector('[data-choice-voyage]')) fail('역할 단계인데 선박 목록이 떠 있다');
  const back = byText(/그대로 두기/);
  if (!back) fail('choiceFor 경로에 «그대로 두기» 가 없다');
  back.click(); await wait(80);
  if (cancelled !== 1) fail('«그대로 두기» 가 onCancelChoice 를 안 불렀다');
  doc.querySelector('[data-choice-role="view"]').click(); await wait(80);
  s = lastSel();
  if (!s || s.name !== '김성일' || !s.choice || s.choice.mode !== 'view') fail('조회만 선택 결과가 틀리다: ' + JSON.stringify(s));
  W.__mount({ choiceFor: '김성일' });
  await until(() => doc.querySelector('[data-login-choice="role"]'));
  doc.querySelector('[data-choice-role="work"]').click();
  if (!(await until(() => doc.querySelector('[data-login-choice="vessel"]')))) fail('작업자를 골랐는데 선박 단계로 안 간다');
  const notice2 = doc.querySelector('[data-choice-notice="1"]');
  if (!notice2 || !/모든 선박을 볼 수 있습니다/.test(notice2.textContent)) fail('자유 열람 문구(모든 선박을 볼 수 있습니다)가 아니다: ' + (notice2 && notice2.textContent));
  if (doc.querySelectorAll('[data-choice-voyage]').length !== NV) fail('자유 열람 선박 목록이 15척이 아니다');
  doc.querySelector('[data-choice-voyage="TMPZ_2027E"]').click(); await wait(120);
  const chips2 = [...doc.querySelectorAll('[data-choice-equip]')].map((b) => b.getAttribute('data-choice-equip'));
  if (chips2.length !== 5) fail('PNCT 호기 칩이 5개가 아니다: ' + chips2.join(','));
  doc.querySelector('[data-choice-start="1"]').click(); await wait(120);
  s = lastSel();
  if (!s || s.name !== '김성일' || s.choice.mode !== 'work' || s.choice.voyageKey !== 'TMPZ_2027E' || s.choice.equip !== '') fail('자유 열람 작업자(호기 없이) 결과가 틀리다: ' + JSON.stringify(s));
  console.log(`  ② 김성일 — 조회만 {view} · 작업자 TMPZ_2027E(호기 없이) · 그대로 두기 ✔`);

  // ── ②-B 3.50-01 서버 직책이 늦게 오는 경우(라이브 실측 — 업데이트 재개 뒤 테스터 «클로드»가 역할 단계 없이 선박 단계로 떨어졌다) ──
  const FX = wc.staffList;
  wc.setServerRoles({});
  W.__mount({ choiceFor: '클로드', extraStaff: {} });
  if (!(await until(() => doc.querySelector('[data-login-choice="vessel"]')))) fail('직책 전 테스터가 선박 단계로 안 뜬다(직책 없이는 일반 검수원)');
  if (doc.querySelector('[data-choice-role]')) fail('직책 전인데 역할 단추가 있다');
  wc.setServerRoles(FX);
  W.__render({ choiceFor: '클로드', extraStaff: FX });
  if (!(await until(() => doc.querySelector('[data-login-choice="role"]')))) fail('서버 직책(테스터)이 도착했는데 역할 단계로 안 올라간다: ' + txt().slice(0, 200));
  doc.querySelector('[data-choice-role="work"]').click();
  await until(() => doc.querySelector('[data-login-choice="vessel"]'));
  W.__render({ choiceFor: '클로드', extraStaff: { ...FX, _x: { name: '_x', role: '검수' } } });   // 직책 목록이 또 바뀌어도
  await wait(150);
  if (!doc.querySelector('[data-login-choice="vessel"]')) fail('[작업자]를 누른 뒤 직책 목록이 바뀌자 역할 단계로 되돌아갔다');
  console.log('  ②-B 클로드(테스터) — 직책 전 선박 단계 → 직책 도착 → 역할 단계 · [작업자] 뒤에는 안 되돌아감 ✔');

  // ── ③ 순수 함수 ──
  const fr = (n) => wc.isFreeRoamer(n);
  if (!fr('김성일') || !fr('클로드') || !fr('클로드2')) fail('소유자·테스터가 자유 열람이 아니다');
  if (fr('박진우') || fr('이종현') || fr('표인수')) fail('검수원·임원이 자유 열람으로 잡혔다(표인수=상무이사는 선박 선택 대상이다)');
  const workPJ = { name: '박진우', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' };
  if (Object.keys(wc.visibleVoyagesOf(null, '박진우', wc.voyages)).length !== 0) fail('선택 없는 검수원에게 항차가 보인다');
  const v1 = wc.visibleVoyagesOf(workPJ, '박진우', wc.voyages);
  if (Object.keys(v1).join() !== 'STMJ_2652E') fail('검수원 작업 선박 하나만 보여야 하는데 ' + Object.keys(v1).join());
  if (Object.keys(wc.visibleVoyagesOf({ mode: 'view' }, '김성일', wc.voyages)).length !== NV) fail('조회만 소유자에게 전부가 안 보인다');
  if (Object.keys(wc.visibleVoyagesOf({ mode: 'work', voyageKey: 'STMJ_2652E' }, '클로드', wc.voyages)).length !== NV) fail('작업자 테스터에게 전부가 안 보인다(«작업자를 골라도 모든 선박»)');
  if (Object.keys(wc.visibleVoyagesOf({ mode: 'work', voyageKey: 'NOPE_0000E' }, '박진우', wc.voyages)).length !== 0) fail('없는 항차 키로 고른 검수원에게 무언가 보인다');
  if (!wc.canSeeVoyage(workPJ, '박진우', 'STMJ_2652E') || wc.canSeeVoyage(workPJ, '박진우', 'XTPG_540E') || !wc.canSeeVoyage(null, '김성일', 'XTPG_540E')) fail('canSeeVoyage 판정이 틀리다');
  wc.clearWorkChoice();
  if (wc.readWorkChoice('박진우')) fail('지운 뒤에도 선택이 읽힌다');
  const saved = wc.saveWorkChoice(workPJ);
  const rd = wc.readWorkChoice('박진우');
  if (!rd || rd.mode !== 'work' || rd.voyageKey !== 'STMJ_2652E' || rd.equip !== '1호기' || !rd.ymd || !rd.at) fail('저장·되읽기가 틀리다: ' + JSON.stringify(rd));
  if (wc.readWorkChoice('김성일')) fail('다른 이름으로 남의 선택이 읽힌다');
  W.localStorage.setItem('tallyone_work_choice', JSON.stringify({ ...saved, ymd: '2000-01-01' }));
  if (wc.readWorkChoice('박진우')) fail('날이 바뀐 선택이 그대로 읽힌다');
  W.localStorage.setItem('tallyone_work_choice', JSON.stringify({ ...saved, mode: 'work', voyageKey: '' }));
  if (wc.readWorkChoice('박진우')) fail('선박 없는 작업자 선택이 유효로 읽힌다');
  //  조회만 → 호기 문지기(utils 실소스)
  wc.rememberMe('김성일');
  wc.saveWorkChoice({ name: '김성일', mode: 'view' });
  if (!wc.isViewOnlyNow()) fail('조회만 저장 뒤 isViewOnlyNow 가 false');
  W.localStorage.setItem('gm_equip_no', '3호기');
  if (wc.getEquipNumber() !== '') fail('조회만인데 getEquipNumber 가 호기를 돌려준다: ' + wc.getEquipNumber());
  wc.setEquipNumber('2호기');
  if (W.localStorage.getItem('gm_equip_no') !== '3호기') fail('조회만인데 setEquipNumber 가 호기를 썼다');
  if (!/조회만/.test(wc.equipGateText())) fail('조회만 완료 문구가 «조회만» 을 말하지 않는다: ' + wc.equipGateText());
  wc.setEquipNumber('');
  if (W.localStorage.getItem('gm_equip_no') !== null) fail('조회만이어도 호기 지우기는 돼야 한다');
  wc.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '2호기' });
  if (wc.isViewOnlyNow()) fail('작업자로 바꿨는데 isViewOnlyNow 가 true');
  wc.setEquipNumber('2호기');
  if (wc.getEquipNumber() !== '2호기') fail('작업자인데 호기가 안 써진다');
  if (!/갱\(호기\)/.test(wc.equipGateText())) fail('작업자 완료 문구가 옛 문구가 아니다: ' + wc.equipGateText());
  //  App 캐시(setActiveWorkChoice)가 1순위 — meToday 가 남으로 덮이거나(검수원 변경 뒤 되돌아옴) 자정을 넘겨 localStorage 가 만료돼도 화면이 보여 주는 선택을 따른다(감사 지적)
  wc.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  wc.rememberMe('박진우');
  if (!wc.isViewOnlyNow()) fail('캐시가 조회만인데 meToday(박진우)가 문지기를 열었다');
  W.localStorage.setItem('tallyone_work_choice', JSON.stringify({ name: '김성일', ymd: '2000-01-01', mode: 'view', voyageKey: '', equip: '', at: 1 }));
  if (!wc.isViewOnlyNow()) fail('캐시가 조회만인데 만료된 localStorage 가 문지기를 열었다');
  if (wc.getEquipNumber() !== '') fail('캐시 조회만인데 getEquipNumber 가 호기를 돌려준다');
  wc.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '' });
  if (wc.isViewOnlyNow()) fail('캐시가 작업자인데 조회만으로 판정한다');
  wc.setActiveWorkChoice(null);
  if (wc.isViewOnlyNow()) fail('캐시 null(로그인 전·미선택)인데 조회만으로 판정한다');
  console.log('  ③ 순수 — 자유 열람 판정·보이는 항차(검수원 1/자유 15)·되읽기(이름·날짜)·조회만 호기 문지기·App 캐시 우선 ✔');

  // ── ④ inspectorStatus ──
  const now = Date.now();
  if (wc.inspectorStatus({ name: 'x', loggedIn: true, lastActive: now - 1000, workMode: 'view' }, now) !== 'online') fail('조회만 활동자가 online 이 아니다');
  if (wc.inspectorStatus({ name: 'x', loggedIn: true, lastActive: now - 1000, workMode: 'work' }, now) !== 'working') fail('작업자 활동자가 working 이 아니다');
  if (wc.inspectorStatus({ name: 'x', loggedIn: true, lastActive: now - 1000 }, now) !== 'working') fail('workMode 없는(옛 판) 활동자가 working 이 아니다');
  if (wc.inspectorStatus({ name: 'x', loggedIn: false, lastActive: now - 1000, workMode: 'view' }, now) !== null) fail('로그아웃한 조회만이 배지를 단다');
  console.log('  ④ inspectorStatus — view 는 online 까지, work·옛 판은 working ✔');

  // ── ⑤ 실소스 firebase.js 문지기 ──
  const fg = W.__fbgate;
  if (!fg) fail('firebase 문지기 번들이 없다(인자 2)');
  fg.rememberMe('김성일');
  fg.saveWorkChoice({ name: '김성일', mode: 'view' });
  fg.writes().length = 0;
  await fg.fbSetInspectorActivity('김성일', 'STMJ_2652E', 'discharge', { equip: '1호기', bayLabel: 'BAY 20', tier: 'deck', remain: 3, auto: true });
  let w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (!w) fail('활동 기록 update 가 없다: ' + JSON.stringify(fg.writes()));
  if (w.value.workMode !== 'view' || w.value.lastVoyage !== null || w.value.lastMode !== null || w.value.workEquip !== null || w.value.workBay !== null || !w.value.lastActive) fail('조회만인데 활동 기록에 항차·호기가 남는다: ' + JSON.stringify(w.value));
  fg.writes().length = 0;
  fg.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  await fg.fbSetInspectorActivity('김성일', 'STMJ_2652E', 'discharge', { equip: '1호기', bayLabel: 'BAY 20', tier: 'deck', remain: 3, auto: true });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (!w || w.value.workMode !== 'work' || w.value.lastVoyage !== 'STMJ_2652E' || w.value.lastMode !== 'discharge' || w.value.workEquip !== '1호기' || w.value.workBay !== 'BAY 20') fail('작업자인데 활동 기록이 깎였다: ' + JSON.stringify(w && w.value));
  fg.writes().length = 0;
  await fg.fbSetInspectorChoice('김성일', { mode: 'view' });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (!w || w.value.workMode !== 'view' || w.value.assignVoyage !== '' || w.value.lastVoyage !== null || w.value.workEquip !== null) fail('조회만 선택 기록이 틀리다: ' + JSON.stringify(w && w.value));
  fg.writes().length = 0;
  await fg.fbSetInspectorChoice('박진우', { mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/박진우');
  if (!w || w.value.workMode !== 'work' || w.value.assignVoyage !== 'STMJ_2652E' || w.value.assignEquip !== '1호기' || !w.value.assignAt || 'lastVoyage' in w.value) fail('작업자 선택 기록이 틀리다: ' + JSON.stringify(w && w.value));
  fg.clearWorkChoice();
  console.log('  ⑤ firebase.js 실소스 — 조회만 활동은 항차·호기 null + workMode view · 작업자는 그대로 · 선택 기록 assign* ✔');
  noErr();
  console.log('✅ 작업자/조회만 선택 연막검사 PASS');
  process.exit(0);
})().catch((e) => { console.log('✗ 예외: ' + (e && e.stack || e)); process.exit(1); });
