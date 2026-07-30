// 번들을 jsdom 에 올려 실제로 그려 보고, 렌더 중 오류가 하나라도 나면 빌드를 실패시킨다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
const orig = console.error;
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
setTimeout(() => {
  console.error = orig;
  const t = dom.window.document.body.textContent || '';
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  if (t.length < 500) { console.log('✗ 렌더 결과가 비었다 (' + t.length + '자) — 컴포넌트가 아무것도 안 그렸다'); process.exit(1); }
  const stg = (t.match(/임시창고\s*(\d+)/) || [])[1];
  if (stg !== '3') { console.log('✗ 미배정 3대가 임시창고로 안 갔다 (임시창고=' + stg + ')'); process.exit(1); }
  console.log('✓ 렌더 연막검사 통과 (' + t.length + '자 · 임시창고 ' + stg + '대 · 오류 0)');
}, 4000);
