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
  ok(/이 배 시간당 46대 \(앱 기록 · 작업시간 기준\)/.test(t), `제목이 «이 배 시간당 46대 (앱 기록 · 작업시간 기준)»이 아니다 — ${t}`);
  ok(!/시간당 [0-9]{3,}대/.test(t), `⛔ 세 자리 이상 페이스가 찍힌다 — ${t}`);

  //  ★ 검수사 정정의 핵심 — **전부 한 순간에 몰아 찍어도 같은 숫자**여야 한다.
  //    3.6 은 여기서 «몰아 입력이라 페이스 못 잼»이라는 회피를 냈다.
  r = await render('burst');
  ok(r.errs.length === 0, '몰아 찍기 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  t = titleOf(r.d); console.log('    화면 →', t);
  ok(/이 배 시간당 46대/.test(t), `⛔ 전부 한 순간에 찍었다고 답이 달라진다 — ${t}`);
  ok(!/못 잼/.test(t), `⛔ 회피가 남아 있다 — ${t}`);

  //  접안·이안 시각을 모르는 항차 — 그때도 숫자는 낸다(완료 기록 구간으로).
  r = await render('noinfo');
  ok(r.errs.length === 0, '작업 시각 없는 항차 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  t = titleOf(r.d); console.log('    화면 →', t);
  ok(/이 배 시간당 \d+대/.test(t), `작업 시각을 몰라도 숫자는 내야 한다 — ${t}`);
  ok(/찍힌 구간 기준/.test(t), `무엇으로 쟀는지 안 밝힌다 — 작업 시각을 모르면 그렇다고 써야 한다 — ${t}`);

  console.log(fail ? `\n화면 연막검사 실패 ${fail}건` : '\n화면 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
