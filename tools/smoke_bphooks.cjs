// BayPlan 훅 순서 — 자료가 «없다 ↔ 있다» 로 바뀌어도 화면이 안 죽는가(3.35).
//   ⛔ 3.35 첫 판이 훅 셋을 조기 반환 뒤에 두어 React 가 죽었다(감사 실측). 두 방향 다 잰다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error|hook/i.test(s)) errs.push(s.split('\n')[0].slice(0, 160)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = process.argv[3] === 'rev' ? '있다 → 없다' : '없다 → 있다';
(async () => {
  await wait(400);
  const W = dom.window, doc = W.document;
  const fail = (m) => { console.log('  ✗ ' + m); process.exit(1); };
  if (typeof W.__setFull !== 'function') fail('하네스가 __setFull 을 안 내놓는다 — 이 검사가 헛돈다');
  const before = doc.body.textContent.length;
  W.__setFull(true);
  await wait(600);
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log(`  ✗ ${dir} 로 바뀔 때 오류 ${uniq.length}건`); uniq.slice(0, 2).forEach((e) => console.log('     ' + e)); process.exit(1); }
  const root = doc.getElementById('root');
  if (!root || !root.innerHTML.length) fail(`${dir} 로 바뀌자 화면이 사라졌다 — 훅이 조기 반환 뒤에 있다`);
  console.log(`  ✓ ${dir} — 오류 0 · 화면 ${root.innerHTML.length}자 살아 있음(바뀌기 전 본문 ${before}자)`);
  //  소스 모양 — 훅이 조기 반환보다 앞인가(다음 판이 다시 밀어 넣지 못하게)
  const src = fs.readFileSync(require('path').resolve(__dirname, '..', 'src', 'components', 'BayPlan.jsx'), 'utf8');
  const iRet = src.indexOf('  if (containers.length === 0) {');
  const iMemo = src.indexOf('const _onlyTitles = React.useMemo');
  if (iRet < 0 || iMemo < 0) fail('조기 반환이나 제목 훅을 소스에서 못 찾았다');
  if (iMemo > iRet) fail('⛔ 제목 훅이 조기 반환 **뒤**에 있다 — 자료가 바뀌면 화면이 죽는다');
  const tail = src.slice(iRet, src.indexOf('function BayPage('));
  const late = (tail.match(/React\.use(Memo|Effect|Ref|State)/g) || []);
  if (late.length) fail(`조기 반환 뒤에 훅이 ${late.length}개 남아 있다 — ${late.join(' · ')}`);
  console.log('  ✓ 훅이 전부 조기 반환보다 앞이다(소스 확인)');
  console.log('✓ BayPlan 훅 순서 연막검사 통과');
  process.exit(0);
})();
