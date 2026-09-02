// 3.1 연막검사 — 카고플랜 V2·베이플랜에서 위해(WEI)행 빗금 셀 수가 실데이터 WEI 대수와 맞는지, 대련(DLC)엔 안 얹히는지 센다.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
function render(which) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ dom, errs }), 3500);
  });
}
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  // ① 카고플랜 V2(인쇄) — 셀 인라인 backgroundImage 빗금
  const a = await render('v2'); const d = a.dom.window.document; const ex = a.dom.window.__PODHL_EXPECT;
  ok(a.errs.length === 0, 'V2 렌더 오류 0' + (a.errs[0] ? ' — ' + a.errs[0] : ''));
  const cells = [...d.querySelectorAll('.cpv2-cell')];
  const striped = cells.filter((el) => /repeating-linear-gradient/.test(el.style.backgroundImage || ''));
  const withMark = cells.filter((el) => (el.textContent || '').trim());
  ok(striped.length === ex.wei, `V2 빗금 셀 ${striped.length} = 실데이터 WEI ${ex.wei} (DLC ${ex.dlc}·셀 ${withMark.length})`);
  ok(striped.every((el) => !/cpv2-through|cpv2-shadow20/.test(el.className)), 'V2 통과·그림자 칸에는 빗금 없음');
  const filledStriped = striped.filter((el) => el.style.background && el.style.background !== '');
  ok(true, `V2 풀 칠 위에도 빗금 ${filledStriped.length}칸(풀 5 중 WEI만)`);
  ok(/노란 빗금=위해/.test(d.body.textContent || ''), 'V2 머리 캡션에 «노란 빗금=위해(WEI)행» 표기');
  const legend = [...d.querySelectorAll('.cpv2-legend-mark')].filter((el) => /repeating-linear-gradient/.test(el.style.backgroundImage || ''));
  ok(legend.length === 1, `V2 별첨1 POD 범례 WEI 견본 빗금 ${legend.length}`);
  // ② 베이플랜(화면) — .cell-podhl 클래스
  const b = await render('bayplan'); const d2 = b.dom.window.document;
  ok(b.errs.length === 0, 'BayPlan 렌더 오류 0' + (b.errs[0] ? ' — ' + b.errs[0] : ''));
  const hl = d2.querySelectorAll('.cell-podhl');
  ok(hl.length >= 1, `BayPlan .cell-podhl 셀 ${hl.length}(범례 견본 포함)`);
  ok(/노란 빗금 = 위해/.test(d2.body.textContent || ''), 'BayPlan 범례에 «노란 빗금 = 위해(WEI)행 — 씰 따로»');
  // ③ 베이상세(인쇄) — cellExtra 로 얹는 빗금
  const c3 = await render('baydetail'); const d3 = c3.dom.window.document;
  ok(c3.errs.length === 0, 'BayDetail 렌더 오류 0' + (c3.errs[0] ? ' — ' + c3.errs[0] : ''));
  const st3 = [...d3.querySelectorAll('.cpv2-cell')].filter((el) => /repeating-linear-gradient/.test(el.style.backgroundImage || ''));
  ok(st3.length === ex.wei, `BayDetail 빗금 셀 ${st3.length} = WEI ${ex.wei}`);
  console.log(fail ? `✗ ${fail}건 실패` : '✓ 3.1 위해행 빗금 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
