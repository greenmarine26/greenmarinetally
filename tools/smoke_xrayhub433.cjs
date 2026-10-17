// 출력센터에 X-RAY 리스트가 «양하에만» 있고, 누르면 X-RAY 탭의 인쇄가 한 번 나가는지 재는 연막검사 (TallyOne 4.33).
//  검수사 2026-10-18 «양하에서 출력을 들어가면 검수리스트 카고플랜 베이상세 XRAY · 선적에서 들어가면 XRAY 제외한 세가지»
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_xrayhub433.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('출력센터 X-RAY 리스트 — 양하만 · 자동 출력 (4.33)');
  const dom = new JSDOM('<!doctype html><html><body><div id="rootDis"></div><div id="rootLod"></div><div id="rootAuto"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const _ce = console.error; console.error = () => {};
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(800); console.error = _ce;
  ok(!threw, `세 화면을 그리는 동안 죽지 않는다 ${threw ? '| ' + threw.slice(0, 120) : ''}`);
  const doc = dom.window.document;
  const dis = doc.getElementById('rootDis'), lod = doc.getElementById('rootLod'), auto = doc.getElementById('rootAuto');
  const btns = (r) => [...r.querySelectorAll('button')];
  const has = (r, s) => btns(r).some((b) => (b.textContent || '').includes(s));
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));

  ok(/검수 자료 출력/.test(dis.textContent) && /검수 자료 출력/.test(lod.textContent), '양하·선적 두 허브가 다 열린다');
  ok(has(dis, '검수 리스트') && has(dis, '카고플랜') && has(dis, '베이 상세'), '양하 허브에 검수 리스트·카고플랜·베이 상세가 있다');
  ok(has(dis, 'X-RAY 리스트'), '양하 허브에는 X-RAY 리스트가 있다');
  ok(has(lod, '검수 리스트') && has(lod, '카고플랜') && has(lod, '베이 상세'), '선적 허브에도 검수 리스트·카고플랜·베이 상세가 있다');
  ok(!has(lod, 'X-RAY 리스트'), '선적 허브에는 X-RAY 리스트가 없다');
  //  양하 허브에서 선적으로 바꾸면 사라지고, 다시 양하로 오면 나온다
  const seg = (r, s) => btns(r).find((b) => (b.textContent || '').includes(s) && /\(\d+\)/.test(b.textContent));
  click(seg(dis, '선적')); await wait(150);
  ok(!has(dis, 'X-RAY 리스트'), '양하 허브에서 «선적» 으로 바꾸면 X-RAY 리스트가 사라진다');
  click(seg(dis, '양하')); await wait(150);
  ok(has(dis, 'X-RAY 리스트'), '«양하» 로 돌아오면 다시 나온다');
  const x0 = dom.window.__XCALLS;
  click(btns(dis).find((b) => (b.textContent || '').includes('X-RAY 리스트'))); await wait(100);
  ok(dom.window.__XCALLS === x0 + 1, 'X-RAY 리스트를 누르면 출력 요청이 한 번 나간다');

  //  자동 출력 — 탭을 숨겨 올리면 인쇄 문서가 한 번 나가고 끝을 알린다
  await wait(400);
  ok(dom.window.__XPRINTED === 1, `자동 출력은 끝을 한 번 알린다 (${dom.window.__XPRINTED}번)`);
  const docs = dom.window.__DOCS.map((w) => w.document.html).filter((h) => /SMOKU100001/.test(h));
  ok(docs.length === 1, `인쇄 문서가 정확히 한 번 나온다 (${docs.length}번)`);
  const h = docs[0] || '';
  ok(/SMOKU100002/.test(h) && /KC0012345/.test(h), '인쇄 문서에 컨 두 대와 봉인번호가 들어 있다');
  ok(/인계용/.test(h), '봉인이 다 안 찼으니 머리에 «인계용» 이 찍힌다 (제출/인계 판정 그대로)');

  console.log(fail ? `\n⛔ 출력센터 X-RAY 검사 실패 ${fail}건` : `\n✅ 출력센터 X-RAY 리스트 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
