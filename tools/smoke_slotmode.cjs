// 자리 확인 모드 — jsdom 으로 실제 렌더하고 눌러 본다. 실패하면 빌드를 세운다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
const clickBy = (dom, doc, re) => {
  const b = [...doc.querySelectorAll('button')].find(x => re.test(x.textContent || ''));
  if (!b) return false;
  b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return true;
};
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(600);
  const doc = dom.window.document;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  //  실제 검수원 순서 그대로 눌러 들어간다 — 호기 → (접안) → 베이 → 단.
  clickBy(dom, doc, /4호기/); await wait(300);
  clickBy(dom, doc, /^우현 접안|^좌현 접안/); await wait(300);
  clickBy(dom, doc, /^B24/); await wait(300);
  clickBy(dom, doc, /데크/); await wait(400);
  const t1 = doc.body.textContent || '';
  if (t1.length < 200) fail('작업 화면이 안 열렸다 (' + t1.length + '자): ' + t1.slice(0, 80));
  if (!/이 자리에 실제로 실은 컨테이너/.test(t1)) fail('자리 확인 칸이 안 떴다 — 엠티 선적에서 자동으로 켜져야 한다. 화면: ' + t1.slice(0, 120));
  if (!/이 컨이 아니어도 그냥 넣으세요/.test(t1)) fail('계획 컨 안내 문구가 없다');
  const input = [...doc.querySelectorAll('input')].find(i2 => (i2.placeholder || '').includes('끝 4자리'));
  if (!input) fail('끝4자리 입력칸이 없다');
  const setVal = dom.window.Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setVal.call(input, '7719');
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await wait(300);
  const t2 = doc.body.textContent || '';
  if (!/BEAU2977719/.test(t2)) fail('끝4자리 7719 를 쳤는데 후보(BEAU2977719)가 안 뜬다');
  if (!/TEMU4477719/.test(t2)) fail('끝4자리가 겹치는 다른 컨(TEMU4477719)이 목록에 없다 — 오선적 위험');
  if (!/규격 다름/.test(t2)) fail('규격 다른 후보에 «규격 다름» 경고가 없다');
  if (!/끝자리 같은 컨 2대/.test(t2)) fail('끝4 중복 경고가 없다');
  if (!/계획대로 확인하는 방식으로 돌아가기/.test(t2)) fail('종전 방식으로 돌아가는 길이 없다');
  console.log('✅ 자리 확인 모드 연막검사 통과 — 자동 켜짐 · 후보 2대 · 규격 경고 · 중복 경고 · 되돌아가기');
  process.exit(0);
})();
