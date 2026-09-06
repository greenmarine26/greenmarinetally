// 동방 보드 카드 미리보기 — jsdom 으로 실제 그려 HTML 을 뽑는다(검수사에게 배포 전에 보여 주는 용도).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { console.error('THROW', e.message); process.exit(1); }
setTimeout(() => {
  const html = dom.window.document.getElementById('root').innerHTML;
  fs.writeFileSync(process.argv[3], html);
  console.log('뽑음', html.length, '바이트');
}, 800);
