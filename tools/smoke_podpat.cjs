// 3.2 연막검사 — 실데이터 두 항차로 POD 무늬가 «최다 POD 없음 · 나머지 대수 순 · 평택분만 · 통과·X 제외» 대로 세 화면에 그려지는지 센다.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
function render(which, ship, mode) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which; dom.window.__SMOKE_SHIP = ship; dom.window.__SMOKE_MODE = mode || 'loading';
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ dom, errs, d: dom.window.document }), 4000);
  });
}
const pat = (el) => { const m = /repeating-linear-gradient\((\d+)deg|radial-gradient/.exec(el.style.backgroundImage || ''); return m ? (m[1] ? { '135': 'd135', '45': 'd45', '0': 'horiz', '90': 'vert' }[m[1]] : 'dots') : null; };
const count = (d, sel) => { const out = {}; for (const el of d.querySelectorAll(sel)) { const p = pat(el); if (p) out[p] = (out[p] || 0) + 1; } return out; };
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  // ① ATPR 2640W (전체선적, WEI 140 · DLC 226) — DLC 최다=무늬 없음, WEI=\\\\
  let r = await render('v2', 'ATPR'); ok(r.errs.length === 0, 'ATPR V2 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  let c = count(r.d, '.cpv2-cell'); ok(c.d135 === 140 && !c.d45 && !c.horiz, `ATPR V2: WEI \\\\ ${c.d135 || 0}=140 · DLC 무늬 없음(${JSON.stringify(c)})`);
  ok(/무늬=목적지\(별첨1 · DLC 는 무늬 없음\)/.test(r.d.body.textContent), 'ATPR V2 캡션 «DLC 는 무늬 없음»');
  const lg = [...r.d.querySelectorAll('.cpv2-legend-mark')].filter((el) => pat(el)); ok(lg.length === 1 && pat(lg[0]) === 'd135', `ATPR 별첨1 견본 \\\\ 1칸(${lg.length})`);
  ok([...r.d.querySelectorAll('.cpv2-cell.cpv2-pat')].length === 140, 'ATPR V2 무늬 칸에 후광 클래스 140');
  r = await render('bayplan', 'ATPR'); ok(r.errs.length === 0, 'ATPR BayPlan 오류 0');
  ok(r.d.querySelectorAll('.cell-pat-d135').length === 141 && r.d.querySelectorAll('.cell-pat-d45').length === 0, `ATPR BayPlan .cell-pat-d135 ${r.d.querySelectorAll('.cell-pat-d135').length}=140+범례1`);
  ok(/DLC 무늬 없음\(226\)/.test(r.d.body.textContent) && /WEI\(140\)/.test(r.d.body.textContent), 'ATPR BayPlan 범례 «DLC 무늬 없음(226)» · «WEI(140)»');
  r = await render('baydetail', 'ATPR'); ok(r.errs.length === 0, 'ATPR BayDetail 오류 0');
  c = count(r.d, '.cpv2-cell'); ok(c.d135 === 140 && Object.keys(c).length === 1, `ATPR BayDetail \\\\ ${c.d135 || 0}=140`);
  // ② MCSC 633N (일부선적: EDI 1093 · 평택분 213 = TAO 110 · TXG 100 · DVO 3, 통과 880)
  r = await render('v2', 'MCSC'); ok(r.errs.length === 0, 'MCSC V2 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  c = count(r.d, '.cpv2-cell'); ok(c.d135 === 100 && c.d45 === 3 && !c.horiz, `MCSC V2: TXG \\\\ ${c.d135 || 0}=100 · DVO // ${c.d45 || 0}=3 · TAO 없음 · 통과 880 없음 (${JSON.stringify(c)})`);
  ok([...r.d.querySelectorAll('.cpv2-cell.cpv2-through')].every((el) => !pat(el)), 'MCSC 통과화물(회색) 칸에 무늬 0');
  r = await render('bayplan', 'MCSC'); ok(r.errs.length === 0, 'MCSC BayPlan 오류 0');
  ok(r.d.querySelectorAll('.cell-pat-d135').length === 101 && r.d.querySelectorAll('.cell-pat-d45').length === 4, `MCSC BayPlan d135 ${r.d.querySelectorAll('.cell-pat-d135').length}=100+1 · d45 ${r.d.querySelectorAll('.cell-pat-d45').length}=3+1`);
  // ③ 양하 모드·POD 하나 — 무늬 0
  r = await render('v2', 'ATPR', 'discharge'); ok(r.errs.length === 0 && Object.keys(count(r.d, '.cpv2-cell')).length === 0, 'ATPR 양하 모드 무늬 0');
  console.log(fail ? `✗ ${fail}건 실패` : '✓ 3.2 목적지 무늬 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
