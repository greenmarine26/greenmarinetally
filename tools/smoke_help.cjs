// 2.27 매뉴얼을 jsdom 에 올려 두 권을 **눌러서** 열어 본다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 160)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }

const doc = () => dom.window.document;
const txt = () => doc().body.textContent || '';
const find = (re) => [...doc().querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (m, extra) => { console.log('✗ ' + m); if (extra) console.log('   ' + extra); process.exit(1); };

(async () => {
  await wait(700);
  const uniq = [...new Set(errs)];
  if (uniq.length) die('렌더 중 오류 ' + uniq.length + '건', uniq.slice(0, 3).join(' | '));
  if (txt().length < 100) die('첫 화면이 비었다 (' + txt().length + '자)');

  // ① 홈에 두 권이 다 보이는가
  for (const k of ['기능 사전', '수석']) if (!txt().includes(k)) die('홈에 «' + k + '» 이 없다');

  // ② 공용 권 — 카테고리 14개가 전부 열리는가 (콘앱 포함)
  const usage = find(/기능 사전/);
  if (!usage) die('공용 권 버튼을 못 찾았다');
  click(usage); await wait(120);
  const CATS = ['검색', '물어보기', '음성', '자동 가이드', '완료 처리', '트윈', '특수화물',
                '항구 검색', '베이 그림', '보고', '자료 업로드', '출력', '콘앱', '안 될 때'];
  let shots = 0, opened = 0;
  for (const c of CATS) {
    const b = find(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (!b) die('공용 권에 카테고리 «' + c + '» 이 없다');
    click(b); await wait(90);
    if (txt().length < 200) die('카테고리 «' + c + '» 가 비어서 열렸다');
    opened++;
    if (/화면/.test(txt())) shots++;
    const back = doc().querySelector('button[aria-label], header button, .no-print');
    // 뒤로 — 헤더 첫 버튼
    const hb = doc().querySelectorAll('button')[0];
    click(hb); await wait(90);
    if (!/검색|물어보기/.test(txt())) die('«' + c + '» 에서 뒤로 눌렀더니 목록으로 안 돌아온다');
  }

  // ③ 수석 권 — 2.27 이전엔 눌러도 아무 데도 안 갔다
  click(doc().querySelectorAll('button')[0]); await wait(120);   // 홈으로
  const chiefBtn = find(/수석/);
  if (!chiefBtn) die('홈에 수석 권 버튼이 없다');
  click(chiefBtn); await wait(150);
  if (!/수석검수사 매뉴얼/.test(txt())) die('수석 권을 눌렀는데 화면이 안 바뀐다 — setView 가 빈 데로 간다');
  const CC = ['먼저 읽을 것', '수석 대시보드', 'PORT-MIS', '베이매트릭스', '마감 텔리', '항차 관리'];
  for (const c of CC) if (!txt().includes(c)) die('수석 권에 «' + c + '» 이 없다');

  //  2.28: 칸마다 **여러 장**이어야 한다 — 검수사 «항목당 1장 정도입니다. 이걸로 앱을 사용 가능 할까요?»
  //   한 장짜리는 사전이지 매뉴얼이 아니다. 2칸 미만이면 빌드를 멈춘다.
  let chiefBlocks = 0, chiefShots = 0, sawWhy = false, sawNever = false;
  for (const c of CC) {
    const b = find(new RegExp(c));
    if (!b) die('수석 권 카테고리 «' + c + '» 버튼을 못 찾았다');
    click(b); await wait(110);
    const n = doc().querySelectorAll('.bg-slate-800\\/50.border.border-slate-700.rounded-xl').length;
    if (n < 2) die('수석 권 «' + c + '» 이 ' + n + '장뿐이다 — 항목마다 여러 장이어야 한다');
    chiefBlocks += n;
    chiefShots += (txt().match(/화면/g) || []).length;
    if (/왜 이렇게 하나/.test(txt())) sawWhy = true;
    if (/한 번 잘못 누르면 잃는 것/.test(txt())) sawNever = true;
    click(doc().querySelectorAll('button')[0]); await wait(100);   // 뒤로 = 수석 권 목록
    if (!/수석검수사 매뉴얼/.test(txt())) die('«' + c + '» 에서 뒤로 눌렀더니 수석 권 목록으로 안 온다');
  }
  if (!sawWhy) die('«왜 이렇게 하나» 칸이 한 번도 안 그려졌다 — 검수사 지시 항목이다');
  if (!sawNever) die('«한 번 잘못 누르면 잃는 것» 칸이 한 번도 안 그려졌다 — 검수사 지시 항목이다');

  //  매트릭스는 특히 여러 장이어야 한다 (검수사 «메트릭스만 설명해도 여러장이 나올것입니다»)
  click(find(/베이매트릭스/)); await wait(120);
  const mx = doc().querySelectorAll('.bg-slate-800\\/50.border.border-slate-700.rounded-xl').length;
  if (mx < 5) die('베이매트릭스가 ' + mx + '장뿐이다 — 최소 5장');
  if (!/확정/.test(txt()) || !/보정중/.test(txt())) die('매트릭스에 «확정/보정중» 설명이 없다');
  click(doc().querySelectorAll('button')[0]); await wait(100);

  // ④ 2.27-01: 이름이 없으면 «잠김»으로 보여야 한다 — 통째로 사라지면 «수석용은 어디서 보나»가 된다
  const dom2 = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom2.window.__SMOKE_NO_INSPECTOR = 1;
  try { dom2.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { die('로그아웃 렌더 THROW: ' + e.message); }
  await wait(500);
  const t2 = dom2.window.document.body.textContent || '';
  if (!/수석검수사 매뉴얼/.test(t2)) die('로그아웃 상태에서 수석 권이 **통째로 사라졌다** — 왜 안 열리는지 말해야 한다');
  if (!/이름을 고르면 열립니다/.test(t2)) die('로그아웃 상태에서 «왜 안 열리는지» 안내가 없다');
  if ([...dom2.window.document.querySelectorAll('button')].some((b) => /수석검수사 매뉴얼/.test(b.textContent || '')))
    die('로그아웃인데 수석 권이 **눌린다** — 직책을 모르는 채로 열면 안 된다');

  console.log(`✓ 매뉴얼 연막검사 통과 (공용 ${opened}칸 · 그림 ${shots}칸 · 수석 권 ${CC.length}칸 ${chiefBlocks}장(매트릭스 ${mx}장) · 왜/잃는것 O · 로그아웃 잠김 O · 오류 0)`);
  process.exit(0);
})().catch((e) => die('THROW: ' + e.message));
