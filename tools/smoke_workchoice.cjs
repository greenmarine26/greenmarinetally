// «로그인 뒤 작업자/조회만» 선택(3.50) 연막검사 — jsdom 으로 로그인 선택 화면을 실제로 그리고 누른다. 실패하면 빌드를 세운다.
//   ① 일반 검수원(박진우) — 이름 → 시작 → 선박 단계(역할 단추 없음·경고 문구·선박 전엔 시작 불가) → STMJ 2652E → PCTC 호기 4개 → 1호기 → 시작 = {work, STMJ_2652E, 1호기}
//   ② 자유 열람(김성일, choiceFor) — 역할 단계 → 조회만 = {view} · 작업자 → 선박(호기 없이) 시작 = {work, TMPZ_2027E, ''} · «그대로 두기» = onCancelChoice
//   ②-B (3.50-01) 서버 직책(테스터)이 첫 그림 뒤에 도착해도 역할 단계로 올라간다 — [작업자]를 누른 뒤에는 안 되돌아간다
//   ③ 순수 — isFreeRoamer · visibleVoyagesOf/canSeeVoyage · readWorkChoice(이름·날짜) · **3.51 조회만도 호기를 쓴다(보기용)·쓰기만 canWorkNow 로 막힌다** · App 캐시 우선
//   ④ inspectorStatus — workMode 'view' 면 활동이 있어도 'online' 까지
//   ⑤-B (3.50-03) 작업자로 골랐어도 남의 배 화면이면 자리를 안 적는다 — 그 배가 수석 보드에 «작업 중» 으로 뜨던 것(SWSP 실측)
//   ⑥ (3.51) 쓰기 문지기 — 조회만이면 완료·트윈·초과·취소·보고·터미널반영이 전부 던지고 한 건도 안 써진다. 작업자는 종전대로
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
  //  직책이 늦게 오는 경우는 실제 사람(표인수 — 명단에 상무이사로 있다)으로 잰다. 개발·시험 계정은 직책과 무관하게 역할 단계다(3.50-03).
  wc.setServerRoles({});
  W.__mount({ choiceFor: '표인수', extraStaff: {} });
  if (!(await until(() => doc.querySelector('[data-login-choice="vessel"]')))) fail('직책 전 사람이 선박 단계로 안 뜬다(직책 없이는 일반 검수원)');
  if (doc.querySelector('[data-choice-role]')) fail('직책 전인데 역할 단추가 있다');
  wc.setServerRoles({ ...FX, 표인수: { name: '표인수', role: '테스터', roleAt: Date.now() } });   // 검수사 «임원은 제가 테스터로 지정하면 됩니다»
  W.__render({ choiceFor: '표인수', extraStaff: { ...FX, 표인수: { name: '표인수', role: '테스터' } } });
  if (!(await until(() => doc.querySelector('[data-login-choice="role"]')))) fail('서버 직책(테스터)이 도착했는데 역할 단계로 안 올라간다: ' + txt().slice(0, 200));
  if (!doc.querySelector('[data-choice-role="work"]')) fail('테스터로 지정된 임원에게 «작업자» 가 없다(개발·시험 계정과 갈라야 한다)');
  wc.setServerRoles(FX);
  //  3.51: 테스터(클로드 포함)도 작업자를 고를 수 있다 — 실테스트는 작업자로 들어와야 한다(검수사 «실테스트를 할려면 작업자로 들어 와야 합니다»)
  W.__mount({ choiceFor: '클로드', extraStaff: FX });
  if (!(await until(() => doc.querySelector('[data-login-choice="role"]')))) fail('테스터가 역할 단계로 안 뜬다');
  if (!doc.querySelector('[data-choice-role="work"]') || !doc.querySelector('[data-choice-role="view"]')) fail('테스터에게 조회만/작업자 둘 다 있어야 한다');
  doc.querySelector('[data-choice-role="view"]').click(); await wait(120);
  s = lastSel();
  if (!s || s.name !== '클로드' || s.choice.mode !== 'view') fail('테스터 조회만 결과가 틀리다: ' + JSON.stringify(s));
  //  [작업자] 뒤 명단이 또 바뀌어도 안 되돌아가는지는 자유 열람(김성일)로 잰다
  W.__mount({ choiceFor: '김성일', extraStaff: FX });
  await until(() => doc.querySelector('[data-login-choice="role"]'));
  doc.querySelector('[data-choice-role="work"]').click();
  await until(() => doc.querySelector('[data-login-choice="vessel"]'));
  W.__render({ choiceFor: '김성일', extraStaff: { ...FX, _x: { name: '_x', role: '검수' } } });
  await wait(150);
  if (!doc.querySelector('[data-login-choice="vessel"]')) fail('[작업자]를 누른 뒤 직책 목록이 바뀌자 역할 단계로 되돌아갔다');
  console.log('  ②-B 늦은 직책 — 표인수 직책 전 선박 단계 → 테스터 지정 뒤 역할 단계(작업자 있음) · 클로드도 조회만/작업자 둘 다 · [작업자] 뒤 안 되돌아감 ✔');

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
  //  ★ 3.51 — **조회만도 호기를 쓴다**(화면을 그 호기 관점으로 보려고). 3.50 이 여기를 막아 앱 전체의 호기가 사라졌었다.
  wc.setEquipNumber('3호기');
  if (wc.getEquipNumber() !== '3호기') fail('조회만인데 호기를 못 쓴다(3.50 의 잘못을 되돌린 자리): ' + wc.getEquipNumber());
  if (/조회만/.test(wc.equipGateText())) fail('호기 없음 문구가 아직 조회만을 말한다: ' + wc.equipGateText());
  if (!/갱\(호기\)/.test(wc.equipGateText())) fail('호기 없음 문구가 바뀌었다: ' + wc.equipGateText());
  //  대신 «작업»(쓰기)만 막힌다
  if (wc.canWorkNow()) fail('조회만인데 작업할 수 있다고 한다');
  if (!/조회만/.test(wc.workGateText('완료'))) fail('작업 금지 문구에 «조회만» 이 없다: ' + wc.workGateText('완료'));
  if (!/완료/.test(wc.workGateText('완료'))) fail('작업 금지 문구가 무엇이 막혔는지 안 말한다');
  wc.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '2호기' });
  if (wc.isViewOnlyNow()) fail('작업자로 바꿨는데 isViewOnlyNow 가 true');
  if (!wc.canWorkNow()) fail('작업자인데 작업을 못 한다고 한다');
  wc.setEquipNumber('2호기');
  if (wc.getEquipNumber() !== '2호기') fail('작업자인데 호기가 안 써진다');
  //  App 캐시(setActiveWorkChoice)가 1순위 — meToday 가 남으로 덮이거나(검수원 변경 뒤 되돌아옴) 자정을 넘겨 localStorage 가 만료돼도 화면이 보여 주는 선택을 따른다(감사 지적)
  wc.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  wc.rememberMe('박진우');
  if (!wc.isViewOnlyNow()) fail('캐시가 조회만인데 meToday(박진우)가 문지기를 열었다');
  W.localStorage.setItem('tallyone_work_choice', JSON.stringify({ name: '김성일', ymd: '2000-01-01', mode: 'view', voyageKey: '', equip: '', at: 1 }));
  if (!wc.isViewOnlyNow()) fail('캐시가 조회만인데 만료된 localStorage 가 문지기를 열었다');
  if (wc.canWorkNow()) fail('캐시 조회만인데 작업할 수 있다고 한다');
  wc.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '' });
  if (wc.isViewOnlyNow()) fail('캐시가 작업자인데 조회만으로 판정한다');
  wc.setActiveWorkChoice(null);
  if (wc.isViewOnlyNow()) fail('캐시 null(로그인 전·미선택)인데 조회만으로 판정한다');
  //  3.50-03 myWorkVoyageNow — 작업자면 고른 선박, 조회만·미선택이면 ''
  wc.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '' });
  if (wc.myWorkVoyageNow() !== 'STMJ_2652E') fail('작업자인데 내 작업 선박이 안 나온다: ' + wc.myWorkVoyageNow());
  wc.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  if (wc.myWorkVoyageNow() !== '') fail('조회만인데 작업 선박이 나온다');
  wc.setActiveWorkChoice(null);
  if (wc.myWorkVoyageNow() !== '') fail('미선택인데 작업 선박이 나온다');
  wc.setActiveWorkChoice(undefined);
  console.log('  ③ 순수 — 자유 열람 판정·보이는 항차(검수원 1/자유 15)·되읽기(이름·날짜)·**조회만도 호기를 쓴다(3.51)·쓰기만 canWorkNow 로 막힘**·App 캐시 우선·myWorkVoyageNow ✔');

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
  //  ★ 3.50-03 — 작업자로 골랐어도 **남의 배 화면**이면 자리를 안 적는다(검수사 «작업중이지도 않는 선박 노출» — SWSP 실측).
  fg.writes().length = 0;
  await fg.fbSetInspectorActivity('김성일', 'TMPZ_2027E', 'loading', { equip: '1호기', bayLabel: 'BAY 14', tier: 'deck', remain: 5, auto: true });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (!w) fail('남의 배 화면에서 활동 기록 자체가 없다(접속 표시까지 사라지면 안 된다)');
  if (w.value.lastVoyage !== null || w.value.lastMode !== null || w.value.workEquip !== null || w.value.workBay !== null) fail('남의 배(TMPZ) 화면인데 그 배에 자리가 적힌다: ' + JSON.stringify(w.value));
  if (w.value.workMode !== 'work' || !w.value.lastActive) fail('남의 배를 본다고 작업자 자격·접속까지 지워졌다: ' + JSON.stringify(w.value));
  //  캐시(App state)로도 같은 판정 — localStorage 가 만료·다른 이름이어도 화면이 보여 주는 선택을 따른다
  fg.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  fg.rememberMe('남');
  fg.writes().length = 0;
  await fg.fbSetInspectorActivity('김성일', 'TMPZ_2027E', 'loading', { equip: '1호기' });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (w.value.lastVoyage !== null) fail('캐시 기준으로도 남의 배가 걸러져야 한다: ' + JSON.stringify(w.value));
  fg.writes().length = 0;
  await fg.fbSetInspectorActivity('김성일', 'STMJ_2652E', 'discharge', { equip: '1호기', bayLabel: 'BAY 20' });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (w.value.lastVoyage !== 'STMJ_2652E' || w.value.workBay !== 'BAY 20') fail('내 배 화면인데 자리가 안 적힌다: ' + JSON.stringify(w.value));
  //  선택이 아예 없는 기기(옛 판·예외 경로)는 종전대로 적는다 — 새 문지기가 옛 동작을 막지 않는다
  fg.setActiveWorkChoice(null); fg.clearWorkChoice(); fg.rememberMe('김성일');
  fg.writes().length = 0;
  await fg.fbSetInspectorActivity('김성일', 'TMPZ_2027E', 'loading', { equip: '2호기' });
  w = fg.writes().find((x) => x.op === 'update' && x.path === 'inspectors/김성일');
  if (w.value.lastVoyage !== 'TMPZ_2027E' || w.value.workEquip !== '2호기') fail('선택이 없는데도 자리를 안 적는다(옛 판 무력화): ' + JSON.stringify(w.value));
  console.log('  ⑤-B 3.50-03 — 작업자가 남의 배를 보면 자리 안 적음(접속·작업자 자격은 유지) · 내 배는 그대로 · 선택 없으면 종전대로 ✔');
  //  다시 조회만 기록으로 돌려놓고 이어서 «선택 기록» 을 잰다
  fg.rememberMe('김성일'); fg.saveWorkChoice({ name: '김성일', mode: 'view' }); fg.setActiveWorkChoice({ name: '김성일', mode: 'view' });
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

  // ── ⑥ 3.51 쓰기 문지기 — «조회만으로는 아무 작업을 할수 없습니다. 보기만 할뿐»(검수사 확정) ──
  //    화면 게이트가 아니라 **쓰는 자리**를 잰다 — 옆길(누락 완료·«둘 다 완료»·모달 안쪽)로 들어와도 한 대도 안 써져야 한다.
  fg.rememberMe('김성일'); fg.saveWorkChoice({ name: '김성일', mode: 'view' }); fg.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  const WRITES = [
    ['완료', () => fg.fbCompleteContainer('STMJ_2652E', 'discharge', 'ABCD1234567', '김성일', 'normal', '', '1호기')],
    ['트윈 완료', () => fg.fbCompleteContainersAtomic('STMJ_2652E', 'loading', ['ABCD1234567', 'ABCD7654321'], '김성일', '1호기')],
    ['초과 컨', () => fg.fbAddExtraContainer('STMJ_2652E', 'discharge', 'ABCD1234567', '김성일', {}, '1호기')],
    ['완료 취소', () => fg.fbCancelComplete('STMJ_2652E', 'discharge', 'ABCD1234567', {})],
    ['작업 보고', () => fg.fbAddWorkReport('STMJ_2652E', { type: 'work_status', action: 'start', equip: '1호기' })],
    ['터미널 반영', () => fg.fbApplyTermWork('STMJ_2652E', 'discharge')],
    //  3.51 감사(부) 지적 — 3.50 이 화면으로 막고 있던 길을 3.51 이 열면서 드러난 자리들. 전부 쓰는 일이다.
    ['보류', () => fg.fbHoldContainers('STMJ_2652E', 'discharge', ['ABCD1234567'], '사유', '김성일', '1호기', 0)],
    ['자리 수정', () => fg.fbSetActualPosition('STMJ_2652E', 'discharge', 'ABCD1234567', 20, 1, 82, '김성일')],
    ['접안 방향(작업 설정)', () => fg.fbUpdateVoyageInfo('STMJ_2652E', { berthSide: 'port' })],
    ['규격 확정', () => fg.fbPickIso('STMJ_2652E', 'discharge', 'ABCD1234567', 'edi', '22G1', 'EDI', '김성일')],
    ['X-RAY 봉인', () => fg.fbSetXraySeal('STMJ_2652E', 'ABCD1234567', 'S1', 'E1', '김성일', '')],
    ['완료 일괄 취소', () => fg.fbBulkCancelComplete('STMJ_2652E', 'discharge', {})],
    ['보고 일괄 추가', () => fg.fbAddReportsAt('voyages/STMJ_2652E', [{ ts: 1, type: 'hatch' }])],
    ['보고 삭제', () => fg.fbDeleteWorkReport('STMJ_2652E', 1)],
    //  재감사(부) 지적 — info 를 **직접** 쓰는 길이라 fbUpdateVoyageInfo 용도 가름이 안 닿는다. 타임시트·인건비로 가는 값이다.
    ['호기 검수원 등록', () => fg.fbSetVoyageCraneCrew('STMJ_2652E', '20260915주', { '1호기': '김판석' })],
    ['작업 시작 시각', () => fg.fbSetVoyageWorkStart('STMJ_2652E', Date.now(), '김성일', null)],
    ['시퀀스 방침', () => fg.fbSetVoyageSeqMode('STMJ_2652E', 'fullOnlySeq', '김성일')],
    ['선적 플랜 확정', () => fg.fbCommitPlan('STMJ_2652E', {}, '김성일')],
    ['덱 슬롯 지정', () => fg.fbAssignDeckSlot('STMJ_2652E', 'loading', '20-01-82', 'ABCD1234567')],
  ];
  let blockedEvents = 0;
  W.addEventListener('viewOnlyBlocked', (ev) => { if (ev && ev.detail && ev.detail.message) blockedEvents += 1; });
  for (const [label, fn] of WRITES) {
    fg.writes().length = 0;
    let threw = null;
    try { await fn(); } catch (x) { threw = x; }
    if (!threw) fail(`조회만인데 «${label}» 이 그냥 지나갔다`);
    if (!threw.viewOnly) fail(`«${label}» 이 던진 오류에 viewOnly 표가 없다(호출부가 이유를 못 가린다): ${threw.message}`);
    if (!/조회만/.test(threw.message)) fail(`«${label}» 오류 문구가 이유를 안 말한다: ${threw.message}`);
    if (fg.writes().length) fail(`조회만인데 «${label}» 이 ${fg.writes().length}건을 썼다: ` + JSON.stringify(fg.writes().slice(0, 2)));
  }
  if (blockedEvents !== WRITES.length) fail(`문지기가 던지기 전에 알리지 않았다(조용한 실패) — ${blockedEvents}/${WRITES.length}`);
  console.log(`  ⑥ 쓰기 문지기 — 조회만이면 ${WRITES.length}갈래(완료·트윈·초과·취소·보고·터미널반영·보류·자리·접안설정·규격·봉인·일괄취소·보고추가/삭제·호기검수원·작업시작·시퀀스·플랜·덱슬롯)가 전부 막히고 쓰기 0건 · 던지기 전에 ${blockedEvents}번 알림 ✔`);
  //  작업자면 그대로 써진다(문지기가 옛 동작을 막지 않는다)
  fg.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  fg.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  fg.writes().length = 0;
  await fg.fbAddWorkReport('STMJ_2652E', { type: 'work_status', action: 'start', equip: '1호기' });
  if (!fg.writes().some((x) => /reports/.test(x.path || ''))) fail('작업자인데 보고가 안 써진다: ' + JSON.stringify(fg.writes()));
  fg.writes().length = 0;
  await fg.fbCompleteContainer('STMJ_2652E', 'discharge', 'ABCD1234567', '김성일', 'normal', '', '1호기');
  if (!fg.writes().length) fail('작업자인데 완료가 안 써진다');
  //  자료 업로드·항차 관리용 info PATCH 는 조회만이어도 막지 않는다(용도를 가른다 — 막으면 자료를 못 올린다)
  fg.saveWorkChoice({ name: '김성일', mode: 'view' }); fg.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  fg.writes().length = 0;
  await fg.fbUpdateVoyageInfo('STMJ_2652E', { ediName: 'X.asc', dataFixedAt: 1 });
  if (!fg.writes().length) fail('조회만이라고 자료 칸 PATCH 까지 막혔다(자료를 못 올린다)');
  let blocked = null;
  try { await fg.fbUpdateVoyageInfo('STMJ_2652E', { ediName: 'X.asc', berthSide: 'port' }); } catch (x) { blocked = x; }
  if (!blocked || !blocked.viewOnly) fail('작업 설정 칸이 섞여 있는데 통과했다');
  fg.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  fg.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  console.log('  ⑥-C info 용도 가름 — 조회만도 자료 칸은 쓰고, 작업 설정 칸(berthSide 등)은 막힌다 ✔');
  //  자동 반영(사람이 안 누르는 것)은 막지 않는다 — 막으면 조회만이 배를 보기만 해도 던지고 예약이 안 붙는다(재감사 지적)
  fg.saveWorkChoice({ name: '김성일', mode: 'view' }); fg.setActiveWorkChoice({ name: '김성일', mode: 'view' });
  let autoErr = null;
  try { await fg.fbPromotePendingDamage('STMJ_2652E', 'ABCD1234567', [{ at: 1 }]); } catch (x) { autoErr = x; }
  if (autoErr && autoErr.viewOnly) fail('자동 반영(예약 데미지 승격)까지 막았다 — 조회만이 배를 보기만 해도 던진다');
  fg.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  fg.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'STMJ_2652E', equip: '1호기' });
  console.log('  ⑥-D 자동 반영 — 예약 데미지 승격은 조회만이어도 막지 않는다 ✔');
  console.log('  ⑥-B 작업자 — 보고·완료가 종전대로 써진다 ✔');
  noErr();
  console.log('✅ 작업자/조회만 선택 연막검사 PASS');
  process.exit(0);
})().catch((e) => { console.log('✗ 예외: ' + (e && e.stack || e)); process.exit(1); });
