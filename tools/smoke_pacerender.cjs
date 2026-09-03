// 3.5-01 화면 연막검사 — 통계 탭 제목이 «시간당 몇천 대»를 못 찍게 됐는지 실제 DOM 으로 확인한다.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
function render(which) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ errs, d: dom.window.document }), 3000);
  });
}
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const titleOf = (d) => {
    const hit = [...d.querySelectorAll('*')].filter((el) => el.children.length === 0 && /시간대별 처리량/.test(el.textContent));
    return hit.length ? hit[0].textContent.trim() : '(제목 없음)';
  };
  let r = await render('real');
  ok(r.errs.length === 0, '통계 탭 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  let t = titleOf(r.d); console.log('    화면 →', t);
  ok(/페이스 시간당 36대/.test(t), `그날 실기록 제목이 «페이스 시간당 36대»가 아니다 — ${t}`);
  ok(!/시간당 [0-9],[0-9]{3}대|시간당 [0-9]{3,}대/.test(t), `⛔ 네 자리 이상 페이스가 찍힌다 — ${t}`);

  r = await render('burst');
  ok(r.errs.length === 0, '몰아 입력 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  t = titleOf(r.d); console.log('    화면 →', t);
  ok(/몰아 입력이라 페이스 못 잼/.test(t), `몰아 입력인데 이유를 안 밝힌다 — ${t}`);
  ok(!/시간당/.test(t), `몰아 입력인데 숫자를 찍는다 — ${t}`);

  //  ★ 감사가 잡은 자리 — 검수사가 실제로 겪은 그 기록(이종부 80대·107초)에서
  //    제목이 «통째로 비는지» 아니면 «이유를 밝히는지» 눈으로 본다.
  r = await render('leejb');
  ok(r.errs.length === 0, '이종부 기록 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  t = titleOf(r.d); console.log('    화면 →', t);
  ok(/몰아 입력이라 페이스 못 잼/.test(t), `⛔ 검수사가 겪은 그 기록인데 제목이 그냥 빈다 — ${t}`);
  ok(!/시간당/.test(t), `이종부 기록에 숫자를 찍는다 — ${t}`);

  console.log(fail ? `\n화면 연막검사 실패 ${fail}건` : '\n화면 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
