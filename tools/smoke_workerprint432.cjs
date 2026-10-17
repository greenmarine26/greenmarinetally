// 카고플랜 머리줄 작업자 이름과 «짝 이름 질문 → 한 장 더» 흐름을 jsdom 으로 재는 연막검사 (TallyOne 4.32).
//  검수사 2026-10-17 «항차 번호 옆에 # , 작업자 명» · «이름자리가 공백으로 해줘야 합니다» · «모르시면 그냥 출력 눌러 주세요».
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_workerprint432.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('카고플랜 작업자 이름 — 머리줄 · 질문 창 · 한 장 더 (4.32)');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;   // 짝 이름 저장(workerPrint.getPartnerName)이 읽는 저장소
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const _ce = console.error; console.error = () => {};
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(500);
  ok(!threw, `카고플랜(SWTD 9013E 선적 실자료)을 그리는 동안 죽지 않는다 ${threw ? '| ' + threw.slice(0, 120) : ''}`);
  const doc = dom.window.document;
  const btns = () => [...doc.querySelectorAll('button')];
  const find = (s) => btns().find((b) => (b.textContent || '').includes(s));
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const setVal = (el, v) => { const d = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new dom.window.Event('input', { bubbles: true })); };

  await wait(900);
  const head = doc.querySelector('.cpv2-page-header');
  ok(!!head, '카고플랜 머리줄이 그려진다 (베이 매트릭스 있음 — 공허 통과 방지)');
  const wk = doc.querySelector('.cpv2-wk');
  ok(!!wk && /#/.test(wk.textContent), '머리줄 항차 번호 옆에 «#» 갱 번호 빈칸이 있다');
  ok(!!wk && /김성일/.test(wk.textContent), '머리줄에 로그인한 사람(김성일)이 자동으로 찍힌다');
  ok(/VOY NO/.test(head ? head.textContent : '') && (head.textContent.indexOf('VOY NO') < head.textContent.indexOf('#')), '«VOY NO …» 바로 뒤에 «#» 가 온다');

  const printBtn = () => btns().find((b) => /🖨 인쇄/.test(b.textContent || ''));
  const ask = async () => { click(printBtn()); await wait(100); return doc.querySelector('[data-testid="worker-dialog"]'); };
  const pressGo = async () => { click(doc.querySelector('[data-testid="wk-go"]')); await wait(400); };
  ok(!!printBtn(), '카고플랜에 인쇄 단추가 있다');

  //  ① 짝 이름을 넣고 출력 → 2장, 둘째 장에 짝 이름
  let dlg = await ask();
  ok(!!dlg && /같이 작업하는 분은 어느 분입니까/.test(dlg.textContent), '인쇄를 누르면 «같이 작업하는 분은 어느 분입니까?» 질문 창이 뜬다');
  ok(/그냥 출력을 눌러 주세요/.test(dlg.textContent), '질문 창에 «모르시면 입력하지 말고 그냥 출력» 안내가 있다');
  ok(doc.querySelector('[data-testid="wk-me"]').value === '김성일', '«나» 칸에 로그인한 이름이 미리 들어 있다');
  const n0 = dom.window.__PRINTS.length;
  setVal(doc.querySelector('[data-testid="wk-partner"]'), '홍길동');
  await pressGo();
  let p = dom.window.__PRINTS[dom.window.__PRINTS.length - 1] || [];
  ok(dom.window.__PRINTS.length === n0 + 1, '출력을 누르면 인쇄 창이 한 번 열린다');
  ok(p.length === 2, `짝 이름을 넣으면 인쇄 순간 카고플랜이 2장이다 (${p.length}장)`);
  ok(p[0] && p[0].name === '김성일', '첫 장 이름은 김성일');
  ok(p[1] && p[1].name === '홍길동' && !p[1].empty, '둘째 장 이름은 홍길동');
  ok(p[1] && /always|page/.test(p[1].breakBefore), '둘째 장은 새 쪽에서 시작한다 (page-break)');
  ok(p[1] && p[1].head.replace(/\s/g, '').includes('#') && p[1].head.includes('VOY NO'), '둘째 장도 같은 머리줄(VOY NO · #)이다');
  ok(doc.querySelectorAll('.cpv2-zoom-wrap').length === 1, '인쇄가 끝나면 복제한 장이 치워진다 (화면은 1장)');
  ok(doc.querySelector('.cpv2-wk') && /김성일/.test(doc.querySelector('.cpv2-wk').textContent), '인쇄 뒤에도 화면 머리줄은 김성일');

  //  ② 이름을 비우고 출력 → 그래도 2장, 둘째 장은 이름 자리가 공백
  dlg = await ask();
  ok(doc.querySelector('[data-testid="wk-partner"]').value === '홍길동', '짝 이름은 한 번 넣으면 다음 질문 창에 미리 들어 있다');
  setVal(doc.querySelector('[data-testid="wk-partner"]'), '');
  await pressGo();
  p = dom.window.__PRINTS[dom.window.__PRINTS.length - 1] || [];
  ok(p.length === 2, `이름을 비워 두고 출력해도 한 장 더 나온다 (${p.length}장)`);
  ok(p[1] && p[1].name === '' && p[1].empty, '둘째 장은 이름 자리가 공백(밑줄 빈칸)이다');
  ok(p[1] && p[1].head.replace(/\s/g, '').includes('#'), '둘째 장에도 갱 번호 «#» 빈칸은 그대로 있다');

  //  ③ 혼자 작업 → 1장
  dlg = await ask();
  click(doc.querySelector('[data-testid="wk-solo"]')); await wait(50);
  await pressGo();
  p = dom.window.__PRINTS[dom.window.__PRINTS.length - 1] || [];
  ok(p.length === 1, `«혼자 작업합니다» 를 고르면 1장만 나간다 (${p.length}장)`);

  //  ④ 취소하면 인쇄하지 않는다
  const n1 = dom.window.__PRINTS.length;
  dlg = await ask();
  click(doc.querySelector('[data-testid="wk-cancel"]')); await wait(300);
  ok(dom.window.__PRINTS.length === n1 && !doc.querySelector('[data-testid="worker-dialog"]'), '취소하면 인쇄 창이 열리지 않고 질문 창이 닫힌다');

  //  ⑤ 평상시 Ctrl+P(질문 없이 인쇄)는 복제하지 않는다
  window.print = dom.window.print;
  dom.window.print();
  p = dom.window.__PRINTS[dom.window.__PRINTS.length - 1] || [];
  ok(p.length === 1, '질문을 거치지 않은 인쇄(Ctrl+P)는 1장 그대로다');

  console.log(fail ? `\n⛔ 작업자 이름 검사 실패 ${fail}건` : `\n✅ 카고플랜 작업자 이름 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
