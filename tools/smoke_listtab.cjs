// 리스트 탭을 jsdom 에 올려 실제로 그려 본다. 확인하는 것 셋.
//   ① 목록이 그려지는가(컨번호가 나오는가)  ② 우측 고정 칼럼이 그려지는가  ③ 렌더 오류 0
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
setTimeout(() => {
  const doc = dom.window.document;
  const t = doc.body.textContent || '';
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  if (t.length < 200) { console.log('✗ 렌더 결과가 비었다 (' + t.length + '자)'); process.exit(1); }
  if (!/SMOK1000000/.test(t)) { console.log('✗ 목록에 컨테이너가 안 그려졌다'); process.exit(1); }
  if (!/연막_우측패널_표식/.test(t)) { console.log('✗ **우측 고정 칼럼이 안 그려졌다** — 이번 판의 핵심이 죽었다'); process.exit(1); }
  const col = doc.querySelector('.lg\\:w-\\[340px\\]');
  if (!col) { console.log('✗ 우측 칼럼 래퍼(lg:w-[340px])가 없다'); process.exit(1); }
  const two = doc.querySelector('.lg\\:flex');
  if (!two) { console.log('✗ 2단 래퍼(lg:flex)가 없다 — 패널이 목록 아래로 흐른다'); process.exit(1); }
  const bdg = doc.querySelectorAll('.bdg').length;
  console.log(`✓ 리스트 탭 연막검사 통과 (${t.length}자 · 우측 칼럼 O · 2단 래퍼 O · 뱃지 ${bdg}개 · 오류 0)`);
  process.exit(0);
}, 900);
