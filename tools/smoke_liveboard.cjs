// 실시간 작업 보드 카드(3.10) — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 오른쪽 호기 칸에 1호기 BAY 20 · 2호기 BAY 4 가 실데이터대로 선다 ② 카드를 누르면 포커스(그 배만), [✕ 닫기]가 뜨고 [항차 열기 →]는 항차로 간다 ③ 터미널 표기가 이름 칸에 없다
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(500);
  const doc = dom.window.document, W = dom.window;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  const txt = () => doc.body.textContent || '';
  let t = txt();
  if (!/DJCT/.test(t)) fail('카드가 안 떴다: ' + t.slice(0, 120));
  if (!/호기별 작업 베이/.test(t)) fail('오른쪽 «호기별 작업 베이» 칸이 없다');
  if (!/1호기/.test(t) || !/BAY 20/.test(t) || !/07-84/.test(t)) fail('1호기 BAY 20 07-84 가 없다: ' + t.slice(0, 300));
  if (!/2호기/.test(t) || !/BAY 4/.test(t) || !/08-82/.test(t)) fail('2호기 BAY 4 08-82 가 없다');
  if (!/56대/.test(t) || !/70대/.test(t)) fail('호기별 대수(56·70)가 없다');
  if (/CATOS|카토스/.test(t)) fail('카드에 터미널(CATOS) 글자가 있다');
  if (!/미등록/.test(t)) fail('조 등록 전 이름 칸이 «미등록»이 아니다');
  //  호기 칸이 옆으로(2칸 격자)
  const grid = doc.querySelector('.grid-cols-2');
  if (!grid) fail('호기 2개가 옆으로(grid-cols-2) 안 선다');
  //  카드 누르기 → 포커스 → [✕ 닫기]
  const card = doc.querySelector('[role="button"]');
  if (!card) fail('카드 루트가 없다');
  card.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(200);
  if (!(W.__calls || []).some(c => c.fn === 'focus')) fail('카드를 눌렀는데 포커스가 안 된다');
  t = txt();
  if (!/✕ 닫기/.test(t)) fail('포커스 뒤 [✕ 닫기] 가 없다');
  //  [항차 열기 →] 는 항차로(카드 포커스 토글을 건드리지 않는다)
  const openBtn = [...doc.querySelectorAll('button')].find(b => /항차 열기/.test(b.textContent || ''));
  if (!openBtn) fail('[항차 열기 →] 버튼이 없다');
  const before = (W.__calls || []).filter(c => c.fn === 'focus').length;
  openBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(100);
  if (!(W.__calls || []).some(c => c.fn === 'open')) fail('[항차 열기 →] 가 항차를 안 연다');
  if ((W.__calls || []).filter(c => c.fn === 'focus').length !== before) fail('[항차 열기 →] 가 포커스까지 토글한다(stopPropagation 누락)');
  //  [✕ 닫기] → 포커스 해제
  const closeBtn = [...doc.querySelectorAll('button')].find(b => /닫기/.test(b.textContent || ''));
  closeBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(200);
  if (/✕ 닫기/.test(txt())) fail('[✕ 닫기] 뒤에도 닫기 버튼이 남는다');
  console.log('✓ 실시간 작업 보드 카드 렌더 연막검사 통과 (1호기 BAY 20 · 2호기 BAY 4 · 포커스/닫기/항차 열기)');
  process.exit(0);
})();
