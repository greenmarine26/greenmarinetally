// 선적 카고플랜에서 «칠한 칸=풀 · 테두리만=엠티» 가 실제로 그려지는지 재는 연막검사 (TallyOne 3.39).
//
//  왜 있는가 — 검수사 2026-09-09 *«출력물 관리하면서 한가지를 없앤것이 있습니다. **풀과 엠티 색상구분**입니다.
//  **목적지 별로 색상을 추가하면서 그기능이 가라졌습니다. 표기자 이외 다른것으로 구분할 방법이 사라졌습니다.**»*
//
//  3.7 이 목적지색을 얻으면서 «칠했나»를 통째로 버렸다(`podMode ? {background:_podBg}` — `cell.isFull` 을 안 봤다).
//  실측 ATPR 선적 366대 중 **엠티 361 · 풀 5** 이고 목적지는 DLC·WEI 둘뿐이라 둘 다 풀·엠티가 섞였다.
//  베이 20 은 **48칸이 전부 CNDLC** — 같은 색 48칸에서 풀 2대(FSCU5891134·SKHU9962626)를 글자 F 하나로 찾아야 했다.
//  ⇒ 검수사 확정 «안 B» — 풀은 목적지색으로 채우고, 엠티는 흰 바탕에 목적지색 2px 테두리만 남긴다.
//    (테두리 색은 흑백 때문에 같은 색조를 명도 190 까지 낮춘 값이다 — utils `podFeStyle` 머리말 참조.)
//    양하는 이미 그 규칙(풀만 칠한다)이라 이 판으로 두 화면이 같은 규칙이 된다.
//
//  ⚠ **테두리를 `box-shadow` 로 그리면 안 된다** — `.cpv2-cell.cpv2-lugg`(수화물 보라 테두리)와
//    `.cpv2-oog-W/HW`(규격초과 검은 변)가 이미 box-shadow 를 쓰고, 인라인 style 이 그 클래스를 이긴다.
//    그래서 배경 세 겹(선언색=목적지색 · 전면=어둡게 한 목적지색 · 안쪽=흰색)으로 그린다. 이 검사가 그 함정을 지킨다.
//  ⚠ 파스텔(연한 색)로 가르는 안은 버렸다 — 목적지 팔레트 회색값 190~240(흰 255)이라 차이가 10~42 뿐이고,
//    이 앱 기준은 «차이 27은 흑백에서 안 보였다»(2.38-01 검수사 실측)다.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_feborder.cjs <렌더번들.js>'); process.exit(1); }

const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

function render(ship, opt) {
  const o = opt || {};
  return new Promise((resolve) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
      { pretendToBeVisual: true, url: 'https://x/' });
    global.window = dom.window; global.document = dom.window.document;
    global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = clearTimeout;
    dom.window.__SMOKE_SHIP = ship;
    dom.window.__SMOKE_MODE = o.mode || 'loading';
    if (o.which) dom.window.__SMOKE_WHICH = o.which;
    if (o.mark) dom.window.__SMOKE_MARK = 1;
    dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const errs = [];
    dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));
    delete require.cache[path.resolve(B)];
    require(path.resolve(B));
    setTimeout(() => resolve({ d: dom.window.document, w: dom.window, errs }), 300);
  });
}

//  칸이 «엠티 테두리» 차림인가 — 안쪽 흰 사각형을 배경으로 얹었는가.
const isRing = (el) => /linear-gradient/.test(el.style.backgroundImage || '')
                    && /calc\(/.test(el.style.backgroundSize || '');
const bgOf = (el) => (el.style.backgroundColor || el.style.background || '').trim();
const MT = new Set(['e', 'E', 'RE']);

(async () => {
  console.log('선적 플랜 — 칠한 칸=풀 · 테두리만=엠티 (3.39)');
  const r = await render('ATPR');
  ok(r.errs.length === 0, `렌더 오류 0 (${r.errs.length}건)` + (r.errs[0] ? ' | ' + r.errs[0].slice(0, 110) : ''));

  //  목적지 글자가 붙은 칸만 본다 — 통과·X·그림자는 제 회색이 뜻을 갖는 칸이라 이 판의 대상이 아니다.
  const cells = [...r.d.querySelectorAll('.cpv2-cell')].filter((e) => e.querySelector('.cpv2-pod'));
  //  ⚠ 칸 글자에는 **오른쪽 위 목적지 글자**(.cpv2-pod)가 붙어 있다 — 그 자릿수는 배마다 1~3자로 달라
  //    글자 수로 잘라내면 틀린다(첫 판이 그렇게 짜서 엠티 361칸을 풀로 셌다). 그 span 을 떼고 읽는다.
  const txt = (e) => {
    const c = e.cloneNode(true);
    for (const p of c.querySelectorAll('.cpv2-pod')) p.remove();
    return c.textContent.replace(/[▲★◆]/g, '').trim();
  };
  const full = cells.filter((e) => !MT.has(txt(e)));
  const mt = cells.filter((e) => MT.has(txt(e)));
  ok(cells.length > 0, `목적지 칸을 그렸다 (${cells.length}칸)`);
  ok(full.length > 0 && mt.length > 0, `그 안에 풀·엠티가 섞여 있다 — 이 판이 풀려는 그 상황 (풀 ${full.length} · 엠티 ${mt.length})`);

  // ── 본론 — 두 차림이 실제로 갈리는가
  ok(full.every((e) => !isRing(e)), `풀은 칸을 꽉 채운다 — 안쪽 흰 사각형이 없다 (${full.filter((e) => isRing(e)).length}칸 어긋남)`);
  ok(mt.length > 0 && mt.every((e) => isRing(e)), `엠티는 테두리만 남는다 (${mt.filter((e) => !isRing(e)).length}칸 어긋남)`);

  //  ★ 이 한 항이 검수사가 잃었던 바로 그것이다 — 같은 목적지 안에서 풀과 엠티의 차림이 달라야 한다.
  const byPod = {};
  for (const e of cells) {
    const k = (e.querySelector('.cpv2-pod') || {}).textContent || '';
    (byPod[k] = byPod[k] || []).push(e);
  }
  let mixed = 0, split = 0;
  for (const [k, arr] of Object.entries(byPod)) {
    const f = arr.filter((e) => !MT.has(txt(e))), m = arr.filter((e) => MT.has(txt(e)));
    if (!f.length || !m.length) continue;
    mixed++;
    if (!isRing(f[0]) && isRing(m[0])) split++;
  }
  ok(mixed > 0 && split === mixed, `★ 같은 목적지 안에서 풀과 엠티가 갈린다 (${split}/${mixed}개 목적지)`);
  //  목적지 구분을 안 잃었는가 — 풀이든 엠티든 `backgroundColor` 는 그 목적지색 하나여야 한다.
  //  (테두리는 목적지와 무관한 중립색이라 목적지 회색을 하나도 안 건드린다 — 종전 «흑백 같은 회색 짝» 검사가 그대로 산다.)
  ok(mixed > 0 && Object.entries(byPod).every(([, arr]) => new Set(arr.map(bgOf)).size === 1),
     '목적지 구분은 안 잃었다 — 풀이든 엠티든 칸 색은 그 목적지 색 하나다');

  // ── 함정 — box-shadow 를 쓰면 수화물·규격초과 표시를 덮어 지운다
  const shadowed = cells.filter((e) => (e.style.boxShadow || '').trim() && !/oog|lugg/.test(e.className));
  ok(shadowed.length === 0, `엠티 테두리를 box-shadow 로 그리지 않았다 — 수화물·OOG 표시를 안 덮는다 (${shadowed.length}칸)`);
  const CSS = fs.readFileSync(path.join(ROOT, 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/\.cpv2-cell\.cpv2-lugg \{ box-shadow: inset 0 0 0 2px #7c3aed; \}/.test(CSS),
     '수화물 보라 테두리 규칙이 그대로 살아 있다');
  ok(/\.cpv2-cell\.cpv2-oog-W\s*\{ box-shadow:/.test(CSS), '규격초과 검은 변 규칙이 그대로 살아 있다');

  // ── 별첨·바닥글이 그림과 같은 말을 하는가
  const foot = (r.d.querySelector('.cpv2-page-footer') || {}).textContent || '';
  ok(/칠한 칸=풀/.test(foot) && /테두리만=엠티/.test(foot), `바닥글이 새 규칙을 적는다 — «${foot.slice(0, 46)}…»`);
  ok(!/바탕색=목적지\(별첨1\)/.test(foot), '옛 문구(«바탕색=목적지»)가 안 남았다');

  // ── 흑백 인쇄 — 테두리가 실제로 보이는가 (감사 「부」 — 첫 판은 목적지색 그대로라 안 보였다)
  //    앱 기준은 «흰 칸과 회색값 27 차이면 안 보인다»(2.38-01 검수사 실측). 목적지색으로는 못 넘는다 —
  //    ATPR 의 CNDLC 는 차이 14.8 뿐이다. 그래서 테두리를 목적지와 무관한 어두운 색으로 그린다.
  {
    const lum = (h) => { const n = parseInt(String(h).slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    const dk = r.w.__darkenTo;
    ok(typeof dk === 'function', '테두리 색을 어둡게 하는 함수를 쓴다');
    //  팔레트 전체가 앱 기준(흰 칸과 27 이상)을 넘는가 — 실제 그림에 쓰인 목적지색으로 잰다.
    const podHex = [...new Set(full.map(bgOf))].map((v) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(v); return m ? '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('') : '#ffffff'; });
    ok(podHex.some((h) => 255 - lum(h) < 27),
       `목적지색 그대로는 흑백에서 못 갈린다 — 그래서 어둡게 해야 한다 (가장 옅은 것 차이 ${Math.min(...podHex.map((h) => 255 - lum(h))).toFixed(1)})`);
    ok(podHex.every((h) => 255 - lum(dk(h, 190)) >= 27),
       `어둡게 한 테두리는 전부 27 을 넘는다 — 흑백에서 산다 (가장 옅은 것 ${Math.min(...podHex.map((h) => 255 - lum(dk(h, 190)))).toFixed(1)})`);
    //  그림에 그 어두운 색이 실제로 들어갔는가.
    const one = mt.find((e) => /linear-gradient/.test(e.style.backgroundImage || ''));
    const img = ((one || { style: {} }).style.backgroundImage || '');
    ok(/#fff|rgb\(\s*255,\s*255,\s*255\s*\)/.test(img), `엠티 안쪽은 흰색이다 — 검수사가 고른 그 모습 (${img.slice(0, 56)})`);
    ok(!podHex.some((h) => img.includes(h)), '테두리에 목적지색 원본을 그대로 쓰지 않았다 — 어둡게 한 값이다');
    //  ⚠ 그리고 **목적지 회색은 하나도 안 건드렸다** — 종전 검사(«흑백에서 같은 회색이 되는 짝»)가 그대로 산다.
    //    여기를 어두운 값으로 바꿨다가 그 검사에 «W(190)↔D(190)» 으로 잡혔다.
    ok(new Set(cells.map(bgOf)).size === new Set(full.map(bgOf)).size,
       `엠티가 새 목적지색을 만들지 않았다 — 흑백 목적지 구분을 안 흔든다 (${new Set(cells.map(bgOf)).size}색)`);
  }

  // ── 목적지색이 **없는** 칸 — 사전에 없는 새 목적지가 뜨는 날의 가지(그림엔 안 나온다 · 감사 A6)
  {
    const f = r.w.__podFeStyle;
    ok(typeof f === 'function', '판정을 검사가 직접 부를 수 있다');
    const a = f('', true, '#7dd3fc'), b = f('', false, '#7dd3fc');
    ok(a && a.background === '#7dd3fc', `목적지를 몰라도 풀은 칠한다 (${JSON.stringify(a)})`);
    ok(b && !b.background && !b.backgroundColor, `목적지를 몰라도 엠티는 안 칠한다 (${JSON.stringify(b)})`);
    //  이상한 입력에 죽지 않는다 — 조용한 실패도, 예외도 없어야 한다(규범 §4-3).
    let threw = '';
    try { f(); f(null, undefined); f(undefined, true); f('#fff', undefined, undefined); } catch (e) { threw = String(e); }
    ok(!threw, `빈 값·모자란 값에 안 죽는다 ${threw ? '| ' + threw.slice(0, 80) : ''}`);
  }

  // ── 다른 표시를 덮지 않는가 — 세 픽스처에 0칸이라 «0칸» 은 공허 통과였다(감사 지적). 심어서 잰다.
  {
    const rm = await render('ATPR', { mark: true });
    const lug = [...rm.d.querySelectorAll('.cpv2-cell.cpv2-lugg')];
    const oow = [...rm.d.querySelectorAll('.cpv2-cell.cpv2-oog-W')];
    const ohw = [...rm.d.querySelectorAll('.cpv2-cell.cpv2-oog-HW')];
    const urg = [...rm.d.querySelectorAll('.cpv2-cell.cpv2-urgent')];
    ok(lug.length >= 6 && oow.length >= 4 && ohw.length >= 4 && urg.length >= 4,
       `심은 표시가 실제로 그려졌다 — 수화물 ${lug.length} · 폭초과 ${oow.length} · 높이폭초과 ${ohw.length} · 긴급 ${urg.length}`);
    const stomp = [...lug, ...oow, ...ohw, ...urg].filter((e) => (e.style.boxShadow || '').trim());
    ok(stomp.length === 0, `그 칸들의 box-shadow 를 인라인으로 덮지 않았다 (${stomp.length}칸)`);
    const lugMt = lug.filter((e) => MT.has(txt(e)));
    ok(lugMt.length > 0 && lugMt.every((e) => isRing(e)), `수화물 엠티도 테두리 차림이 그대로 붙는다 (${lugMt.length}칸)`);
  }

  // ── 화면 베이플랜도 눈으로 갈리는가 — 종전엔 소스 글자로만 셌다(감사 지적)
  {
    const rb = await render('ATPR', { which: 'bayplan' });
    const bcells = [...rb.d.querySelectorAll('button')].filter((e) => (e.style.backgroundColor || e.style.background || '').trim());
    const ring = bcells.filter(isRing), solid = bcells.filter((e) => !isRing(e));
    ok(bcells.length > 0, `화면 베이플랜이 칸을 그렸다 (${bcells.length}칸)`);
    ok(ring.length > 0 && solid.length > 0,
       `그 화면에서도 두 차림이 갈린다 — 테두리 ${ring.length}칸 · 채움 ${solid.length}칸`);
  }

  // ── 소스 모양 — 판정이 한 벌인가(규범 §4-4)
  console.log('\n  ■ 소스 모양');
  const UT = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
  ok(/export function podFeStyle\(podBg, isFull, fullFallback\)/.test(UT), '풀·엠티 차림 판정이 utils 한 벌이다');
  ok(/backgroundImage: `linear-gradient/.test(UT) && /backgroundSize: 'calc\(100% - 4px\) calc\(100% - 4px\), 100% 100%'/.test(UT),
     '테두리를 배경 세 겹으로 그린다(box-shadow 아님) — 안쪽 흰색 · 전면 목적지색(어둡게)');
  ok(/const edge = darkenTo\(podBg, 190\);/.test(UT) && /backgroundColor: podBg,/.test(UT),
     '테두리만 어둡게 하고 `backgroundColor` 는 목적지색 원본 그대로 둔다');
  ok(!/box-?[Ss]hadow/.test(UT.slice(UT.indexOf('export function podFeStyle'), UT.indexOf('export function podBgOf'))),
     '그 함수가 box-shadow 를 아예 안 쓴다');
  const CP = CSS, BP = fs.readFileSync(path.join(ROOT, 'src/components/BayPlan.jsx'), 'utf8');
  ok((CP.match(/podFeStyle\(/g) || []).length === 2, `카고플랜 두 자리가 그것을 부른다 (${(CP.match(/podFeStyle\(/g) || []).length}자리)`);
  ok((BP.match(/podFeStyle\(/g) || []).length === 1, `화면 베이플랜도 같은 한 벌을 부른다 (${(BP.match(/podFeStyle\(/g) || []).length}자리)`);
  //  양하는 이 판에서 안 건드린다 — 종전 «풀만 칠한다» 가지가 그대로 있어야 한다.
  ok(/cell\.isFull\s*\n?\s*\? \{ background: SPECIAL_FILL\[cell\.mark\] \|\| PLAIN_FULL_BG, color: MARK_FG \}/.test(CP),
     '양하 가지는 종전 그대로다(이 판은 선적만 고쳤다)');

  console.log(fail ? `\n⛔ 풀·엠티 구분 검사 실패 ${fail}건` : `\n✅ 선적에서 풀과 엠티가 다시 갈린다 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
