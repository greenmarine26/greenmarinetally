// 3.6 화면 연막검사 — 초과 컨 입력창의 검산 알림을 실제 DOM 으로 확인한다.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
function render(which) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ errs, d: dom.window.document, w: dom.window }), 2500);
  });
}
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  let r = await render('good');
  ok(r.errs.length === 0, '초과 컨 모달 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  let t = r.d.body.textContent;
  ok(/번호 검산 맞음/.test(t), '맞는 번호인데 «검산 맞음»이 안 뜬다');
  ok(!/검산이 안 맞습니다/.test(t), '맞는 번호에 경고가 뜬다');

  r = await render('typo');
  t = r.d.body.textContent;
  const exp = r.w.__SMOKE_EXPECT || {};
  ok(r.errs.length === 0, '오타 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  ok(/검산이 안 맞습니다/.test(t), '오타인데 경고가 안 뜬다');
  ok(t.includes(exp.good), `고칠 번호(${exp.good})를 화면에 안 보여준다`);
  ok(/그대로 저장하셔도 됩니다/.test(t), '막지 않는다는 안내가 없다 — 검수원이 진짜 초과분을 못 넣는다');
  const inp = r.d.querySelector('input');
  ok(inp && /border-red/.test(inp.className), '입력칸이 빨갛게 안 바뀐다');

  r = await render('partial');
  t = r.d.body.textContent;
  ok(!/검산/.test(t), '아직 치는 중(4777)인데 검산 말이 뜬다 — 잔소리가 된다');

  console.log(fail ? `\n검산 화면 연막검사 실패 ${fail}건` : '\n검산 화면 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
