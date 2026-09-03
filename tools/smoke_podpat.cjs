// 3.7 연막검사 — 선적 플랜 목적지 표시가 «고정 바탕색 + 3자»로 나오는가 (3.2 무늬는 폐기)
//   검수사 확정 2026-09-03 — «플랜에서 포트별 격자를 없앱니다… 목적지별 색으로» ·
//   «특수 화물도 목적지별 바탕색을 갖고 표기문자만 기록합니다» · «세자표기가 확실하니» ·
//   «색별첨은 원래 별첨 포트명에 입혀 주시고 따로 지금처럼 펼쳐주지 않아도 됩니다»
//   실데이터 두 항차(ATPR 2640W 전체선적 366 · MCSC 633N 일부선적 1093/평택분 213).
const { JSDOM } = require('jsdom'); const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
//  사전 정본을 소스에서 그대로 읽어 «그림에 칠해진 색 = 사전의 색»인지 대조한다.
const _u = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'utils.js'), 'utf8');
const POD_BG = {};
for (const m of _u.slice(_u.indexOf('export const POD_BG'), _u.indexOf('};', _u.indexOf('export const POD_BG')))
  .matchAll(/([A-Z]{3}):\s*'(#[0-9a-f]{6})'/g)) POD_BG[m[1]] = m[2];
const hex2rgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
function render(which, ship, mode) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which; dom.window.__SMOKE_SHIP = ship; dom.window.__SMOKE_MODE = mode || 'loading';
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ dom, errs, d: dom.window.document }), 4000);
  });
}
const bgOf = (el) => (el.style.backgroundColor || el.style.background || '').trim();
const bgs = (d, sel) => {
  const out = {};
  for (const el of d.querySelectorAll(sel)) { const b = bgOf(el); if (b) out[b] = (out[b] || 0) + 1; }
  return out;
};
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };

  // ① 무늬는 완전히 사라졌는가 — 남으면 두 표시가 겹친다
  let r = await render('v2', 'ATPR');
  ok(r.errs.length === 0, 'ATPR V2 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  const html = r.d.body.innerHTML;
  ok(!/repeating-linear-gradient|radial-gradient/.test(html), '⛔ 무늬(gradient)가 아직 그려진다 — 3.2 잔재');
  ok(![...r.d.querySelectorAll('.cpv2-pat')].length, '⛔ 무늬 클래스(cpv2-pat)가 붙은 칸이 있다');
  //  검수사가 화면에서 읽는 글에 «무늬»가 남으면 안 된다(스타일 규칙 문자열은 제외).
  const seen = r.d.body.textContent.replace(/\.cpv2[^}]*}/g, '');
  ok(!/무늬/.test(seen), '⛔ 화면 글에 «무늬»가 남아 있다');

  // ② 목적지 3자가 칸 오른쪽 위에 찍히는가
  const pods = [...r.d.querySelectorAll('.cpv2-pod')].map((e) => e.textContent.trim());
  ok(pods.length > 0, '목적지 3자(.cpv2-pod)가 한 칸도 없다');
  //  3.7: 길이는 항차마다 다르다(1~3자). 한 플랜 안에서는 길이가 한 가지여야 하고,
  //    그 길이로 목적지가 서로 갈려야 한다 — 갈리지 않으면 두 항구가 같은 글자로 보인다.
  const lens = [...new Set(pods.map((p) => p.length))];
  ok(lens.length === 1 && lens[0] >= 1 && lens[0] <= 3, `한 플랜에 코드 길이가 섞였다 — ${lens}`);
  const uniq = [...new Set(pods)];
  ok(uniq.length >= 2, `목적지가 한 종류뿐이다 (${uniq})`);
  //  같은 칸의 «색»이 몇 종인지와 «코드»가 몇 종인지가 같아야 한다(짧게 잘라 둘이 뭉치면 안 된다).
  const bgN = new Set([...r.d.querySelectorAll('.cpv2-cell')].filter((e) => e.querySelector('.cpv2-pod')).map((e) => bgOf(e))).size;
  ok(uniq.length === bgN, `⛔ 코드 ${uniq.length}종인데 색은 ${bgN}종 — 잘린 코드가 두 목적지를 뭉쳤다`);

  // ③ 칸 바탕이 **사전에 적힌 그 색** 인가 — 색과 3자가 같은 칸에서 서로 맞는지
  ok(Object.keys(POD_BG).length >= 20, `사전 POD_BG 를 못 읽었다 (${Object.keys(POD_BG).length}개)`);
  let mism = 0, checked = 0;
  const _full = (pre) => Object.keys(POD_BG).filter((k) => k.startsWith(pre));
  for (const el of r.d.querySelectorAll('.cpv2-cell')) {
    const p = el.querySelector('.cpv2-pod'); if (!p) continue;
    const pre = p.textContent.trim(); const b = bgOf(el); checked++;
    const cand = _full(pre);
    if (cand.length === 1) { if (b !== hex2rgb(POD_BG[cand[0]])) mism++; }
    else if (cand.length === 0 && b) mism++;               // 사전에 없는 목적지는 흰 칸이어야 한다
  }
  ok(checked > 0 && mism === 0, `칸 색이 사전과 어긋난다 — ${mism}/${checked}칸`);
  //  ⚠ 대수 순으로 돌려 쓰면 안 된다 — 어느 항차에서 보든 같은 목적지는 같은 색이어야 한다.
  const bgByPod = {};
  for (const el of r.d.querySelectorAll('.cpv2-cell')) {
    const p = el.querySelector('.cpv2-pod'); if (!p) continue;
    const k = p.textContent.trim(); (bgByPod[k] = bgByPod[k] || new Set()).add(bgOf(el));
  }
  ok(Object.values(bgByPod).every((v) => v.size === 1), '⛔ 같은 목적지가 두 색으로 나온다');

  // ④ 별첨 — 포트명 칸 자체에 색이 입혀졌는가(견본 칸을 따로 펼치지 않는다)
  const nm = [...r.d.querySelectorAll('.cpv2-legend-nm')].filter((e) => bgOf(e));
  ok(nm.length > 0, '⛔ 별첨 포트명 칸에 색이 안 입혀졌다 — 검수사 «원래 별첨 포트명에 입혀 주시고»');
  const marks = [...r.d.querySelectorAll('.cpv2-legend-mark')].filter((e) => /repeating|radial/.test(e.style.backgroundImage || ''));
  ok(marks.length === 0, '별첨에 무늬 견본이 남아 있다');

  // ⑤ 통과화물은 종전대로 회색 · 목적지색을 안 받는다(2.79-03)
  r = await render('v2', 'MCSC');
  ok(r.errs.length === 0, 'MCSC V2 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  const through = [...r.d.querySelectorAll('.cpv2-through')];
  ok(through.length > 0, 'MCSC 통과화물 칸이 없다 — 픽스처가 그 항차가 아니다');
  ok(through.every((e) => !e.querySelector('.cpv2-pod')), '⛔ 통과화물에 목적지 3자가 찍힌다 — 남의 짐을 말하고 있다');
  //  ⑤-2 넓은 배(칸이 좁다)는 3자를 접고 색만 남긴다 — 못 읽을 2.3pt 글자를 찍는 것이 더 나쁘다.
  //     MCSC 633N 은 --mf 5.0px 라 코드가 3.1px 로 떨어지고 가운데 표기자와 가로로 겹쳤다(3.7 감사 실측).
  const mf = parseFloat((r.d.querySelector('.cpv2-page')?.style?.getPropertyValue('--mf') || '0'));
  ok(mf > 0 && mf < 9, `MCSC --mf 가 ${mf}px — 좁은 칸 시험이 아니다`);
  //  좁은 칸이라도 코드가 한 자면 들어간다 — 접혔으면 머리글이 그 사실을 밝혀야 한다.
  const _mc = r.d.querySelectorAll('.cpv2-pod').length;
  ok(_mc === 0 || /칸 오른쪽 위 \d자/.test(r.d.body.textContent), '⛔ 코드를 적었는데 머리글이 몇 자인지 안 밝힌다');
  ok(Object.keys(bgs(r.d, '.cpv2-cell')).length >= 2, '⛔ 좁은 칸에서 목적지색까지 사라졌다 — 색은 남아야 한다');
  ok(_mc > 0 || /칸이 좁아 목적지 글자를 안 적는다/.test(r.d.body.textContent), '⛔ 접었으면 머리글이 그 사실을 밝혀야 한다');
  //  ⑤-3 특수화물 풀/엠티 — 선적에서 칠을 없앴으니 글자가 그것을 말해야 한다(검수사 확정 2.38-01 ㉠).
  for (const sh of ['ATPR', 'MCSC']) {
    const dd = await render('v2', sh, 'loading');
    const m3 = [...dd.d.querySelectorAll('.cpv2-mark3')].map((e) => e.textContent.replace(/[▲★◆]/g, '').trim());
    const bad = m3.map((t) => t.replace(/[A-Z]{2,3}$/, (x) => x)).filter((t) => !/^(DG|FR|OT|TK)[FE]/.test(t));
    ok(bad.length === 0, `⛔ ${sh} 특수화물 표기에 풀/엠티가 없다 — ${[...new Set(bad)].slice(0, 4)}`);
    //  양하는 종전 두 글자 그대로여야 한다.
    const dv = await render('v2', sh, 'discharge');
    ok(!dv.d.querySelector('.cpv2-mark3'), `⛔ ${sh} 양하에 세 글자 표기가 나왔다 — 양하는 안 바꾼다`);
  }

  // ⑥ **양하에는 목적지색이 한 방울도 새면 안 된다** — 양하 색 열쇠는 «선사 3자»라
  //    문지기가 없으면 TAOS→TAO 처럼 잘린 선사코드가 목적지색을 받는다.
  for (const ship of ['ATPR', 'MCSC']) {
    r = await render('v2', ship, 'discharge');
    ok(r.errs.length === 0, `${ship} 양하 V2 오류 0` + (r.errs[0] ? ' — ' + r.errs[0] : ''));
    ok(!r.d.querySelector('.cpv2-pod'), `⛔ ${ship} 양하 플랜에 목적지 3자가 찍힌다`);
    const dbg = new Set(Object.keys(bgs(r.d, '.cpv2-cell')));
    const podset = new Set(Object.values(POD_BG).map(hex2rgb));
    ok(![...dbg].some((b) => podset.has(b)), `⛔ ${ship} 양하 칸에 목적지색이 깔렸다`);
    //  양하는 종전 «칠=풀» 규칙이 살아 있어야 한다(캡션이 그렇게 말한다).
    ok(/칠한 칸=풀/.test(r.d.body.textContent), `⛔ ${ship} 양하 머리글이 선적 문구를 쓰고 있다`);
  }
  //  양하 베이플랜 범례에 선사코드 칩이 새는가
  r = await render('bayplan', 'ATPR', 'discharge');
  ok(r.errs.length === 0, 'ATPR 양하 BayPlan 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));

  // ⑦ 베이플랜·베이상세도 같은 한 벌
  r = await render('bayplan', 'ATPR');
  ok(r.errs.length === 0, 'ATPR BayPlan 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  ok(!/cell-pat-/.test(r.d.body.innerHTML), '⛔ 베이플랜에 무늬 클래스가 남아 있다');
  r = await render('baydetail', 'ATPR');
  ok(r.errs.length === 0, 'ATPR BayDetail 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  ok(!/repeating-linear-gradient|radial-gradient/.test(r.d.body.innerHTML), '⛔ 베이상세에 무늬가 남아 있다');

  // ⑧ 흑백 인쇄 — 한 플랜 안에서 «뜻이 다른 칠»끼리 회색 농도가 붙으면 안 된다.
  //    600dpi·106lpi = 33계조(한 계조 7.7) 이므로 8 미만이면 종이에서 같은 회색이다.
  const lum = (c) => { const m = String(c).match(/\d+/g); return m ? 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] : -1; };
  for (const ship of ['ATPR', 'MCSC']) {
    r = await render('v2', ship, 'loading');
    const seen = new Map();                       // 칠 → 그 칸이 뜻하는 것
    for (const el of r.d.querySelectorAll('.cpv2-cell')) {
      const b = bgOf(el); if (!b) continue;
      const p = el.querySelector('.cpv2-pod');
      const what = p ? p.textContent.trim()
        : el.classList.contains('cpv2-through') ? '통과'
        : el.classList.contains('cpv2-shadow20') ? '그림자' : '목적지없음';
      if (!seen.has(b)) seen.set(b, what);
    }
    const arr = [...seen].map(([b, w]) => ({ b, w, l: lum(b) })).filter((x) => x.l >= 0);
    const near = [];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      if (arr[i].w === arr[j].w) continue;
      if (arr[i].w === '그림자' || arr[j].w === '그림자') continue;   // 글자가 아예 없는 빈 칸이라 헷갈리지 않는다
      if (Math.abs(arr[i].l - arr[j].l) < 8) near.push(`${arr[i].w}(${arr[i].l.toFixed(0)})↔${arr[j].w}(${arr[j].l.toFixed(0)})`);
    }
    ok(near.length === 0, `⛔ ${ship} 흑백 인쇄에서 같은 회색이 되는 짝 — ${near.join(' · ')}`);
  }

  // ⑨ **인쇄 CSS 는 렌더로 못 잡는다** — jsdom 은 @media print 를 적용하지 않는다.
  //    소스의 print 블록을 직접 읽어, 화면 값과 종이 값이 같은지 대조한다.
  //    (3.7 감사 실측 — .cpv2-through 의 important 인쇄 규칙이 칸의 인라인 색을 이겨
  //     화면만 고치고 종이는 옛 회색으로 나가던 것을 못 보고 지나칠 뻔했다.)
  const src = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
  const pr = src.slice(src.indexOf('@media print'), src.indexOf('`;', src.indexOf('@media print')));
  for (const [sel, val] of [['cpv2-through.cpv2-load', '#9aa0a6'], ['cpv2-shadow20.cpv2-load', '#b0b4b8']]) {
    const re = new RegExp('\\.' + sel.replace(/\./g, '\\.') + '\\s*\\{[^}]*background:\\s*' + val);
    ok(re.test(pr), `⛔ 인쇄 규칙에 .${sel} = ${val} 이 없다 — 종이에서만 옛 회색으로 나간다`);
  }
  ok(/\.cpv2-cell\.cpv2-through\.cpv2-load/.test(pr.slice(pr.indexOf('.cpv2-cell.cpv2-through {'))),
    '⛔ 선적 규칙이 일반 통과 규칙보다 앞에 있다 — 뒤에 와야 이긴다');

  // ⑩ **칸 비율** — 배가 바뀌어도 그림이 같아야 한다(검수사 «가로폭이 줄면 세로폭도 줄어야»).
  //    카스피 실측 기준 — 카고플랜 1:0.75(머스크 8.8×6.6pt) · 베이상세 1:0.55(ATPR BAY 도면).
  for (const ship of ['ATPR', 'MCSC']) {
    r = await render('v2', ship, 'loading');
    const pg = r.d.querySelector('.cpv2-page');
    const w = parseFloat(pg.style.getPropertyValue('--cpw')), h = parseFloat(pg.style.getPropertyValue('--cph'));
    ok(w > 0 && h > 0, `${ship} 카고플랜 칸 치수가 없다 (${w}×${h})`);
    ok(Math.abs(h / w - 0.75) < 0.02, `⛔ ${ship} 카고플랜 칸 비율 1:${(h / w).toFixed(2)} — 0.75 여야 한다`);
    //  영역이 제 단 수보다 더 늘어나지 못하게 상한이 걸려 있는가(늘어나면 비율이 깨진다).
    const area = r.d.querySelector('.cpv2-deck-area');
    ok(area && /max-height/.test(area.getAttribute('style') || ''), `⛔ ${ship} 데크 영역에 높이 상한이 없다 — 남는 세로로 늘어난다`);
    const bd = await render('baydetail', ship, 'loading');
    const wr = bd.d.querySelector('.bd-cargo-wrap');
    const m = (wr ? wr.getAttribute('style') || '' : '').match(/--bdc-w: (\d+)px; --bdc-h: (\d+)px/);
    ok(!!m, `${ship} 베이상세 칸 치수가 없다`);
    if (m) ok(Math.abs(m[2] / m[1] - 0.55) < 0.03, `⛔ ${ship} 베이상세 칸 비율 1:${(m[2] / m[1]).toFixed(2)} — 0.55 여야 한다`);
  }

  // ⑪ **목적지 코드는 «구석 표식»이다** — 가운데 화물 표기와 붙으면 한 덩어리로 읽힌다.
  //    검수사 3.7 실물 지적 — «삼각형 있던 부분에 포트가 붙어야 하는데 화물 표기랑 붙어있어 헷갈립니다» ·
  //    «포트 표기가 화물표기 보다 작아야 합니다.» 두 가지를 치수로 잰다.
  {
    const src2 = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
    const sc = [...src2.matchAll(/const POD_CODE_SCALE = \{([^}]*)\}/g)].map((m) => m[1])[0] || '';
    const vals = [...sc.matchAll(/:\s*([0-9.]+)/g)].map((m) => parseFloat(m[1]));
    ok(vals.length === 3, `코드 배율을 못 읽었다 (${sc})`);
    //  ① 화물 표기보다 작아야 한다. 가장 작은 표기자는 특수화물 세 글자(0.667em)다.
    const mk3 = parseFloat((src2.match(/\.cpv2-mark3 \{ font-size: calc\(var\(--mf, 9\.6px\) \* ([0-9.]+)\)/) || [])[1] || 0.667);
    ok(vals.every((v) => v < 1), `⛔ 목적지 코드(${vals})가 화물 표기(1em)보다 작지 않다`);
    //  세 글자 칸은 표기자가 0.667 로 줄어 있으므로 코드도 그보다 작아야 한다.
    const m3p = parseFloat((src2.match(/\.cpv2-mark3 \.cpv2-pod \{ font-size: calc\(var\(--mf, 9\.6px\) \* ([0-9.]+)\)/) || [])[1] || 9);
    ok(m3p < mk3, `⛔ 세 글자 칸에서 코드(${m3p})가 표기자(${mk3})보다 작지 않다`);
    //  후광은 없어야 한다 — 4.5pt 글자에 3겹 후광을 씌우면 획이 먹힌다(3.7-01 실패).
    ok(!/\.cpv2-pod \{[^}]*text-shadow/.test(src2), '⛔ 목적지 코드에 흰 후광이 남아 있다 — 작은 글자의 획을 먹는다');
    //  ② 코드 글자 상자가 가운데 표기자의 세로 띠를 침범하면 안 된다.
    //     칸 안쪽 높이 = --cph − 테두리 · 표기자 대문자 높이 ≈ 0.72em · 코드 상자 = line-height 1.05
    for (const ship of ['ATPR']) {
      const rr = await render('v2', ship, 'loading');
      const pg = rr.d.querySelector('.cpv2-page');
      const mf = parseFloat(pg.style.getPropertyValue('--mf'));
      const inH = parseFloat(pg.style.getPropertyValue('--cph')) - 1;
      const band = (inH - 0.72 * mf) / 2;                 // 표기자가 시작하는 자리
      for (const v of vals) {
        const boxH = 1.05 * mf * v;
        ok(boxH <= band, `⛔ 코드 배율 ${v} 는 상자 높이 ${boxH.toFixed(1)}px 로 표기자 띠(${band.toFixed(1)}px)를 ${(boxH - band).toFixed(1)}px 침범한다`);
      }
    }
    //  ③ 흰 후광이 있어야 바탕색·표기자에서 떨어져 보인다.

  }

  // ⑫ **FR·DG 는 그 자체가 풀이다** — 붙이는 것은 «엠티일 때 E» 하나뿐(검수사 «FR표기는 자체가 풀입니다»).
  {
    const src3 = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
    ok(!/displayMark \+ \(cell\.isFull \? 'F'/.test(src3), '⛔ 풀에도 F 를 덧붙이고 있다 — FRF·DGF 가 나온다');
    ok(/_mkE = podMode && FE_MARKS\.has\(displayMark\) && !cell\.isFull/.test(src3), '⛔ 엠티일 때만 붙이는 규칙이 없다');
    for (const ship of ['ATPR', 'MCSC']) {
      const rr = await render('v2', ship, 'loading');
      const bad = [...rr.d.querySelectorAll('.cpv2-cell')].map((e) => {
        const sp = e.querySelector('span'); if (!sp) return '';
        return [...sp.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      }).filter((t) => /^(DG|FR|OT|TK)F$/.test(t));
      ok(bad.length === 0, `⛔ ${ship} 에 ${[...new Set(bad)]} 같은 «풀에 F 덧붙임» 표기가 있다`);
    }
  }
  // ⑬ **별첨은 제 줄수만큼만** — 셋이 높이를 3분의 1씩 나눠 가지면 다섯 줄짜리가 잘린다.
  {
    const src4 = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
    const rule = (src4.match(/\.cpv2-legend \{[^}]*\}/) || [''])[0];
    ok(!/height:\s*100%/.test(rule), `⛔ 별첨이 height:100% 를 요구한다 — 셋이 3분의 1씩 나눠 가져 잘린다 (${rule})`);
    ok(/flex:\s*0 1 auto/.test(rule), `⛔ 별첨이 제 줄수만큼 자리를 갖게 돼 있지 않다 (${rule})`);
  }

  // ⑭ **종이 배치 넷** — 검수사 실물 지적(3.7-02 인쇄본).
  for (const [ship, mode] of [['ATPR', 'loading'], ['MCSC', 'loading'], ['ATPR', 'discharge']]) {
    const rr = await render('v2', ship, mode);
    const tag = `${ship} ${mode}`;
    //  ① 매번 같은 설명은 바닥글에 — 머리글이 두세 줄로 부풀면 안 된다.
    const hdr = [...rr.d.querySelectorAll('.cpv2-page-header .col')].map((e) => e.textContent.trim());
    ok(!hdr.some((t) => t.length > 60), `⛔ ${tag} 머리글에 긴 설명이 남아 있다 — 두세 줄로 부푼다 (${hdr.find((t) => t.length > 60) || ''})`);
    const ft = rr.d.querySelector('.cpv2-page-footer');
    ok(!!ft && /가운데 글자=종류/.test(ft.textContent), `⛔ ${tag} 바닥글에 설명이 없다`);
    //  ② 베이 번호는 상자 정중앙 — 한쪽만 큰 안쪽 여백이면 글자가 밀린다.
    const src5 = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
    const tr = (src5.match(/\.cpv2-bay-title-row \{[^}]*\}/) || [''])[0];
    const pad = (tr.match(/padding:\s*([^;]+);/) || [])[1] || '';
    const nums = pad.trim().split(/\s+/);
    ok(nums.length <= 2 || nums[1] === nums[3], `⛔ 베이 번호 안쪽 여백이 좌우 다르다 (${pad}) — 가운데가 밀린다`);
    //  ③ 로우 표기는 언제나 맨 위·맨 아래 — 여백칸(spacer)보다 바깥에 있어야 단 수와 무관해진다.
    const deck = rr.d.querySelector('.cpv2-bay-box:not(.cpv2-legend-box) .cpv2-deck-area');
    const hold = rr.d.querySelector('.cpv2-bay-box:not(.cpv2-legend-box) .cpv2-hold-area');
    if (deck) ok(deck.firstElementChild && /cpv2-row-labels/.test(deck.firstElementChild.className),
      `⛔ ${tag} 데크 로우 표기가 맨 위가 아니다 (${deck.firstElementChild && deck.firstElementChild.className})`);
    if (hold) ok(hold.lastElementChild && /cpv2-row-labels/.test(hold.lastElementChild.className),
      `⛔ ${tag} 홀드 로우 표기가 맨 아래가 아니다 (${hold.lastElementChild && hold.lastElementChild.className})`);
    //  ④ 별첨 1·2·3 은 한 상자에 붙어 있어야 한다.
    const boxes = [...rr.d.querySelectorAll('.cpv2-legend-box')];
    ok(boxes.length === 1, `⛔ ${tag} 별첨이 ${boxes.length}개 상자로 흩어졌다 — 한 상자여야 한다`);
    if (boxes[0]) ok(boxes[0].querySelectorAll('.cpv2-legend').length === 3, `⛔ ${tag} 한 상자에 별첨이 셋이 아니다`);
    //  누구도 «자리를 통째로» 요구하면 안 된다 — 그러면 나머지가 밀려 잘린다.
    const grow = [...(boxes[0] ? boxes[0].querySelectorAll(':scope > div > div') : [])].map((e) => e.style.flex);
    ok(grow.length === 0 || grow.every((f) => /0 1 auto/.test(f)), `⛔ ${tag} 별첨 칸이 제 줄수만큼이 아니다 (${grow})`);
  }

  console.log(fail ? `\n3.7 목적지색 연막검사 실패 ${fail}건` : '\n3.7 목적지색 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
