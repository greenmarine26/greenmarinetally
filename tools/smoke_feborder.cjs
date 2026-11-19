// 선적 PLAN 에서 풀과 엠티가 같은 목적지 안에서 갈리는지 재는 연막검사 (TallyOne 3.39 → 5.15 진한 칠·옅은 칠).
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

//  칸이 «엠티 테두리» 차림인가 — 화면 베이플랜(BayPlan.jsx)은 아직 이 차림이다.
const isRing = (el) => /linear-gradient/.test(el.style.backgroundImage || '')
                    && /calc\(/.test(el.style.backgroundSize || '');
//  5.15 선적 PLAN 칸 — 풀=같은 색조 진한 칠(.cpv2-pf) · 엠티=같은 색조 옅은 칠(.cpv2-pe). 칠은 --pbg 하나.
const pbg = (el) => (el.style.getPropertyValue('--pbg') || '').trim();
const hsl = (v) => { const m = /hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/.exec(v || ''); return m ? [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100] : null; };
const hslLum = (v) => {
  const c = hsl(v); if (!c) return NaN;
  const [h, s, l] = c, k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
  return 0.299 * f(0) + 0.587 * f(8) + 0.114 * f(4);
};
const codeOf = (e) => { const c = e.cloneNode(true); for (const p of c.querySelectorAll('sup,i')) p.remove(); return c.textContent.trim(); };

(async () => {
  console.log('선적 플랜 — 진한 칠=풀 · 옅은 칠=엠티 (5.15, 3.39 의 목적 그대로)');
  const r = await render('ATPR');
  ok(r.errs.length === 0, `렌더 오류 0 (${r.errs.length}건)` + (r.errs[0] ? ' | ' + r.errs[0].slice(0, 110) : ''));

  const cells = [...r.d.querySelectorAll('.cpv2-cell.cpv2-pc')];
  const full = cells.filter((e) => e.classList.contains('cpv2-pf'));
  const mt = cells.filter((e) => e.classList.contains('cpv2-pe'));
  ok(cells.length > 0, `목적지 칸을 그렸다 (${cells.length}칸)`);
  ok(full.length > 0 && mt.length > 0, `그 안에 풀·엠티가 섞여 있다 — 이 판이 풀려는 그 상황 (풀 ${full.length} · 엠티 ${mt.length})`);
  //  클래스가 맞는지 바깥 근거로 — ATPR 2640W 선적 실측(머리말) 366대 중 풀 5 · 엠티 361.
  ok(full.length === 5 && mt.length === 361, `칠이 실제 리스트 F/E 와 맞다 — ATPR 풀 ${full.length}(실측 5) · 엠티 ${mt.length}(실측 361)`);
  ok(full.length + mt.length === cells.length, `모든 목적지 칸이 풀이나 엠티 하나로 정해졌다 (${cells.length - full.length - mt.length}칸 미정)`);
  ok(cells.every((e) => pbg(e)), `칸마다 칠 색이 있다 (${cells.filter((e) => !pbg(e)).length}칸 없음)`);

  //  ★ 검수사가 잃었던 바로 그것 — 같은 목적지 안에서 풀과 엠티가 갈려야 한다.
  const byPod = {};
  for (const e of cells) (byPod[codeOf(e)] = byPod[codeOf(e)] || []).push(e);
  let mixed = 0, split = 0, sameHue = 0;
  for (const [, arr] of Object.entries(byPod)) {
    const f = arr.filter((e) => e.classList.contains('cpv2-pf')), m = arr.filter((e) => e.classList.contains('cpv2-pe'));
    if (!f.length || !m.length) continue;
    mixed++;
    if (pbg(f[0]) !== pbg(m[0]) && hslLum(pbg(f[0])) < hslLum(pbg(m[0]))) split++;
    const hf = hsl(pbg(f[0])), hm = hsl(pbg(m[0]));
    if (hf && hm && hf[0] === hm[0]) sameHue++;
  }
  ok(mixed > 0 && split === mixed, `★ 같은 목적지 안에서 풀(진하게)과 엠티(옅게)가 갈린다 (${split}/${mixed}개 목적지)`);
  ok(mixed > 0 && sameHue === mixed, `목적지 구분은 안 잃었다 — 풀·엠티가 같은 목적지 색조다 (${sameHue}/${mixed})`);
  ok(Object.values(byPod).every((arr) => new Set(arr.filter((e) => e.classList.contains('cpv2-pf')).map(pbg)).size <= 1
                                     && new Set(arr.filter((e) => e.classList.contains('cpv2-pe')).map(pbg)).size <= 1),
     '한 목적지 안의 풀은 한 색, 엠티는 한 색이다');

  // ── 함정 — box-shadow 를 인라인으로 쓰면 수화물·규격초과 표시를 덮어 지운다
  const shadowed = cells.filter((e) => (e.style.boxShadow || '').trim());
  ok(shadowed.length === 0, `칸 칠을 box-shadow 로 그리지 않았다 — 수화물·OOG 표시를 안 덮는다 (${shadowed.length}칸)`);
  const CSS = fs.readFileSync(path.join(ROOT, 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/\.cpv2-cell\.cpv2-lugg \{ box-shadow: inset 0 0 0 2px #7c3aed; \}/.test(CSS),
     '수화물 보라 테두리 규칙이 그대로 살아 있다');
  ok(/\.cpv2-cell\.cpv2-oog-W\s*\{ box-shadow:/.test(CSS), '규격초과 검은 변 규칙이 그대로 살아 있다');
  //  5.15-01 — 칸 글자는 대문자 높이 기준으로 정가운데(검수사 «셀안에 글자가 위로 치우칩니다»), 굵기는 500(«폰트가 너무 두꺼운것 같습니다»).
  ok(/\.cpv2-cell \.cpv2-pt \{ display: block; line-height: 1; text-box: trim-both cap alphabetic; \}/.test(CSS) && cells.every((e) => e.querySelector(':scope > .cpv2-pt')),
     `칸 글자가 가운데 맞춤 상자(text-box cap) 안에 있다 (${cells.filter((e) => !e.querySelector(':scope > .cpv2-pt')).length}칸 밖)`);
  ok(/\.cpv2-cell\.cpv2-pc \{ background: var\(--pbg\); color: #000; font-weight: 500; \}/.test(CSS), '칸 글자 굵기 500');
  //  5.15-02 — 머리줄 제목은 종이 정가운데(검수사 «좌측으로 조금 기울었습니다»): 양옆 같은 몫 + 오른쪽 글은 한 칸·한 줄.
  ok(/\.cpv2-page-header\.cpv2-page-header > \.col:first-child \{ flex: 1 1 0; min-width: min-content; \}/.test(CSS) && /\.cpv2-page-header\.cpv2-page-header > \.title-center \{ flex: 0 0 auto; \}/.test(CSS) && /\.cpv2-head-right \{ flex: 1 1 0; min-width: max-content; padding-left: 16px;/.test(CSS) && /\.cpv2-head-right > \.col\.col \{ white-space: nowrap; flex: 0 0 auto; \}/.test(CSS)
     && r.d.querySelectorAll('.cpv2-page-header > *').length === 3 && !!r.d.querySelector('.cpv2-page-header > .cpv2-head-right'),
     `머리줄이 «왼쪽 | 제목 | 오른쪽» 세 칸이다 (${r.d.querySelectorAll('.cpv2-page-header > *').length}칸)`);

  // ── 바닥글이 그림과 같은 말을 하는가
  const foot = (r.d.querySelector('.cpv2-page-footer') || {}).textContent || '';
  ok(/진한 칠=풀/.test(foot) && /옅은 칠=엠티/.test(foot), `바닥글이 새 규칙을 적는다 — «${foot.slice(0, 46)}…»`);
  ok(!/칠한 칸=풀/.test(foot) && !/테두리만=엠티/.test(foot), '옛 문구(«칠한 칸=풀 · 테두리만=엠티»)가 안 남았다');

  // ── 흑백에서도 갈리는가 — 앱 기준 «회색값 차이 27 미만은 안 보인다»(2.38-01 검수사 실측)
  {
    const gap = Object.values(byPod).map((arr) => {
      const f = arr.find((e) => e.classList.contains('cpv2-pf')), m = arr.find((e) => e.classList.contains('cpv2-pe'));
      return f && m ? hslLum(pbg(m)) - hslLum(pbg(f)) : Infinity;
    });
    ok(gap.every((g) => g >= 27), `컬러 칠을 흑백으로 바꿔도 풀·엠티 회색값이 27 이상 차이 난다 (가장 작은 것 ${Math.min(...gap).toFixed(1)})`);
    ok(/\.cpv2-bw \.cpv2-cell\.cpv2-pc\.cpv2-pf\.cpv2-pf \{[^}]*#7a7a7a/.test(CSS) && /\.cpv2-pe\.cpv2-pe \{[^}]*#bdbdbd/.test(CSS),
       '흑백 보기는 풀 #7a7a7a · 엠티 #bdbdbd 로 따로 칠한다(차이 67)');
    ok(mt.every((e) => !/linear-gradient/.test(e.style.backgroundImage || '')), '엠티에 옛 테두리 차림이 안 남았다');
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
    const lugMt = lug.filter((e) => e.classList.contains('cpv2-pe'));
    ok(lugMt.length > 0 && lugMt.every((e) => e.classList.contains('cpv2-pc') && pbg(e)), `수화물 엠티도 옅은 칠이 그대로 붙는다 (${lugMt.length}칸)`);
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
