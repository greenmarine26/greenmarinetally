// 콘 트윈 — 트윈을 자료로 가리고, 두 베이를 같이 적고, 전체 화면이 한 화면에 다 들어가는가(ConeOne 2.43).
//   검수사 2026-09-08 «트윈 작업인데 베이가 하나만 보이는 문제» · «베이표시는 21 (22)23» ·
//   «위에 데크홀드 아래도 데크홀드 쉽게 카고플랜 1칸씩» · «로우가 11개 13개라도 한화면에 보이게 해주세요 잘리지 않게».
//   ⚠ 소스 문자열이 아니라 **소스에서 꺼낸 그 함수**를 돌리고, 화면은 **jsdom 실렌더**로 읽는다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'cone.html'), 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conetwin_swbt.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };
console.log('콘 트윈 — 두 베이 · 전체 화면 (2.43)');

//  소스에서 그대로 꺼낸다(베껴 적지 않는다 — 베끼면 소스가 바뀌어도 검사가 통과한다).
const hcc = html.match(/function holdConeCount\(size, shipType, multiCount\)\{[\s\S]*?\n\}\n/);
const bvp = html.match(/function bvRowPositions\(cellCount, hasZero\)\{[\s\S]*?\n\}\n/);
const bvs = html.match(/function bvBaySkeleton\(bs\)\{[\s\S]*?\n\}\n/);
const ct  = html.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
T(!!hcc && !!bvp && !!bvs && !!ct, '홀드콘·베이골격·CT 블록을 소스에서 꺼냈다');
if (!hcc || !bvp || !bvs || !ct) { console.log('✗ 콘 트윈 연막검사 실패'); process.exit(1); }
const SRC = hcc[0] + '\n' + bvp[0] + '\n' + bvs[0] + '\n' + ct[0];
T(/function ctTwinOf\(/.test(SRC) && /function ctTrioOf\(/.test(SRC) && /function twOpen\(/.test(SRC),
  '꺼낸 블록 안에 트윈 판정·트리오·전체 화면이 다 들어 있다');

//  실적 시각을 «지금»으로 민다 — stale(30분) 을 피하고 사이 간격은 그대로 둔다(트윈 판정이 그 간격을 본다).
const NOW = Date.now();
const shift = (() => { let mx = 0; for (const r of Object.values(FX.termWork)) if (r && r.at > mx) mx = r.at; return NOW - mx; })();
const TW_FX = {}; for (const [cn, r] of Object.entries(FX.termWork)) TW_FX[cn] = { ...r, at: r.at + shift };
const dictMap = new Map(Object.entries(FX.baysSummary).map(([k, v]) => [parseInt(k, 10), v]));

//  ── 자를 CSS 에서 직접 만든다 ────────────────────────────────────────
//  ⚠ `twFit` 의 식을 그대로 베끼면 twFit 이 틀려도 검사가 통과한다(감사 지적 — 처음 판이 그랬다).
//    그래서 여백을 **소스의 CSS 에서 뽑아** 상자 셈을 따로 한다. CSS 를 고치면 이 검사가 같이 움직인다.
const cssRule = (sel) => (html.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) || [''])[0];
const px = (css, prop, idx) => {
  const m = css.match(new RegExp(prop + '\\s*:\\s*([^;}]+)'));
  if (!m) return 0;
  const nums = (m[1].match(/-?[\d.]+px/g) || []).map(parseFloat);
  return nums.length ? (idx == null ? nums[0] : (nums[idx] != null ? nums[idx] : nums[nums.length - 1])) : 0;
};
const CSS = (() => {
  const plan = cssRule('.tw-plan'), bv = cssRule('.tw-bv'), r = cssRule('.tw-r'), sea = cssRule('.tw-r.sea'),
        tl = cssRule('.tw-tl'), h = cssRule('.tw-h'), lab = cssRule('.tw-lab');
  const planPadX = px(plan, 'padding', 1), planPadY = px(plan, 'padding', 0), planGap = px(plan, 'gap');
  const bvPadX = px(bv, 'padding', 1), bvPadT = px(bv, 'padding', 0), bvPadB = px(bv, 'padding', 2);
  return {
    planPadX, planPadY, planGap,
    bvSideX: bvPadX * 2 + 2,                                    // 좌우 안여백 + 테두리 1px 둘
    bvSideY: bvPadT + bvPadB + 2,
    rowGap: px(r, 'gap') || 2,
    tl: px(tl, 'width') || 20,
    head: 18, lab: 24,                                          // 머리·열 번호 두 줄(글꼴에서 나온 값 — 실측)
    sea: px(sea, 'margin-top') + px(sea, 'border-top') + px(sea, 'padding-top'),
  };
})();
T(CSS.planPadX === 8 && CSS.bvSideX === 14 && CSS.rowGap === 2 && CSS.tl === 20 && CSS.sea === 9,
  `CSS 에서 여백을 뽑았다 — plan 좌우 ${CSS.planPadX} · 상자 ${CSS.bvSideX} · 틈 ${CSS.rowGap} · 단번호 ${CSS.tl} · 갑판선창 금 ${CSS.sea}`);
/*  한 쪽이 실제로 쓰는 폭·높이를 CSS 상자 셈으로 낸다(칸 크기는 화면에서 읽은 것을 쓴다). */
function measure(d, cw, ch) {
  const boxes = [...d.querySelectorAll('.tw-bv')];
  const nRows = d.querySelectorAll('.tw-r').length;
  const nSea = d.querySelectorAll('.tw-r.sea').length;
  const nCols = Math.max(...boxes.map(b => Math.max(...[...b.querySelectorAll('.tw-r')].map(x => x.querySelectorAll('.tw-c').length))));
  //  한 줄: 단번호 + 칸들 + 단번호, 그 사이 틈 (칸수+1)개
  const wUse = CSS.tl * 2 + nCols * cw + CSS.rowGap * (nCols + 1);
  const wRoom = 358 - CSS.planPadX * 2 - CSS.bvSideX;
  const hUse = boxes.length * (CSS.bvSideY + CSS.head + CSS.lab) + nSea * CSS.sea
             + nRows * ch + CSS.rowGap * Math.max(0, nRows - boxes.length)
             + CSS.planPadY * 2 + CSS.planGap * (boxes.length - 1);
  return { wUse, wRoom, hUse, hRoom: 718, nCols, nRows };
}

//  ── 화면 있는 판(jsdom) — 실렌더로 읽는다 ─────────────────────────────
function boot(opts) {
  const dom = new JSDOM('<!doctype html><html><body><div id="ct-card"></div><div id="ct-strip"></div></body></html>',
    { pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  //  폰 세로(392×812) 를 흉내 낸다 — jsdom 은 크기를 안 재므로 못박아 준다.
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.id === 'twPlan' ? 358 : 392; }, configurable: true });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return this.id === 'twPlan' ? 718 : 812; }, configurable: true });
  w.state = { shipType: 'container', multiCount: 4, _bayDictBays: dictMap,
              disch: { ediRows: (opts && opts.rows) || FX.ediRows }, stow: { ediRows: [] } };
  w.fbFetch = async () => ({ ok: false, status: 0 });
  w.ensureConeBayDict = async () => {};
  w.alert = () => {};
  vm.createContext(w);
  vm.runInContext(SRC + '\nthis.__ctCompute = ctCompute; this.__CT = CT; this.__twOpen = twOpen; this.__twGo = twGo; this.__twDraw = twDraw; this.__twCranes = twCranes; this.__twCols = twCols;'
    + '\nthis.__ctTwinOf = ctTwinOf; this.__ctTrioOf = ctTrioOf; this.__ctBaysLbl = ctBaysLbl; this.__TW = TW;',
    w, { filename: 'cone.html#ct' });
  w.__CT.tw = { discharge: (opts && opts.tw) || TW_FX, loading: {} };
  w.__CT.comp = { discharge: (opts && opts.comp !== undefined) ? opts.comp : FX.completed, loading: {} };
  w.__CT.rec = { discharge: {}, loading: {} };
  w.__CT.pier = 'PCTC'; w.__CT.key = FX.key;
  return w;
}

//  ① 트윈 판정 — 동작으로
{
  const w = boot();
  const mk = (bay, row, tier, at, mode) => ({ bay, row, tier, at, mode: mode || 'discharge' });
  const f = w.__ctTwinOf;
  T(!!f(mk(19, '02', '02', 1000), mk(17, '02', '02', 900)), '같은 열·같은 단·베이 차 2·잇달아 = 트윈');
  const t = f(mk(19, '02', '02', 1000), mk(17, '02', '02', 900));
  T(t && t.bays[0] === 17 && t.bays[1] === 19, '작은 베이가 앞이다 — 17 (18)19 로 적으려면 차례가 있어야 한다');
  T(!f(mk(19, '03', '02', 1000), mk(17, '02', '02', 900)), '⛔ 열이 다르면 트윈이 아니다');
  T(!f(mk(19, '02', '04', 1000), mk(17, '02', '02', 900)), '⛔ 단이 다르면 트윈이 아니다');
  T(!f(mk(21, '02', '02', 1000), mk(17, '02', '02', 900)), '⛔ 베이 차가 4면 트윈이 아니다(실측 79쌍 전부 차 2)');
  T(!f(mk(18, '02', '02', 1000), mk(17, '02', '02', 900)), '⛔ 베이 차가 1이면 트윈이 아니다');
  T(!f(mk(19, '02', '02', 1000 + 130000), mk(17, '02', '02', 1000)), '⛔ 2분보다 벌어지면 트윈이 아니다');
  T(!f(mk(19, '02', '02', 1000, 'loading'), mk(17, '02', '02', 900, 'discharge')), '⛔ 모드가 다르면 트윈이 아니다');
  T(!f(mk(19, '02', '02', 1000), null) && !f(null, mk(17, '02', '02', 900)), '직전이 없으면(첫 대) 트윈이 아니다');

  //  ② 트리오 — 검수사 «베이표시는 21 (22)23»
  const g = w.__ctTrioOf;
  //  ⚠ 실사전으로 잰다 — 위 픽스처 사전은 여섯 베이짜리 부분집합이라 22 가 없다(없으면 지어내지 않는 것이 맞다).
  const D0 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conetwin_dicts.json'), 'utf8'));
  w.state._bayDictBays = new Map(Object.entries(D0.SWBT).map(([k, v]) => [parseInt(k, 10), v]));
  T(g(21, { bays: [21, 23] }).title === '21 (22)23', `트윈 21+23 → «${g(21, { bays: [21, 23] }).title}»`);
  T(g(23, { bays: [21, 23] }).title === '21 (22)23', '같은 트윈은 어느 쪽을 넣어도 같은 칸을 낸다');
  //  가운데 40ft 가 그 배에 없으면 지어내지 않고 두 20ft 만
  w.state._bayDictBays = new Map([[17, { bayNo: '17' }], [19, { bayNo: '19' }]]);
  T(g(17, { bays: [17, 19] }).title === '17 19', `⛔ 사이 40ft 가 없는 배에서는 두 20ft 만 그린다 — «${g(17, { bays: [17, 19] }).title}»`);
  w.state._bayDictBays = dictMap;
  T(g(10, null).title === '09 (10)11', '트윈 아닌 40ft 베이 10 → «09 (10)11»');
  T(g(17, null).title === '17 (18)19', '트윈 아닌 20ft 베이 17 → «17 (18)19»');
  T(g(0, null) === null && g('', null) === null, '베이를 모르면 칸을 지어내지 않는다');

  //  ③ 두 베이 표기
  T(w.__ctBaysLbl({ bays: [17, 19], bay: 19 }) === '17+19', '트윈이면 «17+19» — 이것이 이번 판의 핵심이다');
  T(w.__ctBaysLbl({ bays: [10], bay: 10 }) === '10', '트윈이 아니면 종전대로 한 베이');
}

//  ④ 실데이터로 ctCompute — 트윈이 실제로 잡히는가
{
  const w = boot();
  const r = w.__ctCompute();
  T(r.cranes.length >= 2, `호기를 ${r.cranes.length}개 세웠다(실데이터 SWBT 2614N 양하)`);
  T(r.cranes.every(c => c.trio && c.bays && c.bays.length >= 1), '호기마다 «지금 칸»(트리오)과 베이 목록이 붙는다');
  //  ⚠ 옛 항 `typeof anyTwin === 'boolean'` 은 구조상 늘 참이라 검사가 아니었다(감사 지적).
  //    트윈으로 잡힌 것이 있으면 그 두 베이가 실제로 차 2 인지, 없으면 정말 없는지를 자료로 되짚는다.
  const tw2 = r.cranes.filter(c => c.twin);
  T(tw2.every(c => c.twin.bays.length === 2 && Math.abs(c.twin.bays[1] - c.twin.bays[0]) === 2),
    `트윈으로 잡힌 ${tw2.length}대가 전부 베이 차 2 다`);
  for (const c of r.cranes) {
    if (!c.twin) continue;
    T(Math.abs(c.twin.bays[1] - c.twin.bays[0]) === 2, `${c.eq} 트윈 베이 차가 2다(${c.twin.bays.join('+')})`);
    T(c.trio.lo === c.twin.bays[0] && c.trio.hi === c.twin.bays[1], `${c.eq} 칸이 그 두 베이를 감싼다(${c.trio.title})`);
  }
}

//  ⑤ 전체 화면 실렌더 — 카고플랜 한 칸(위 반쪽·아래 반쪽)이 다 그려지는가
{
  const w = boot();
  const r = w.__ctCompute();
  const eq = r.cranes[0].eq;
  w.__twOpen(eq);
  const d = w.document;
  const host = d.getElementById('ctTwin');
  T(!!host, '전체 화면이 열린다');
  const boxes = [...d.querySelectorAll('.tw-bv')];
  T(boxes.length === 2, `반쪽이 둘이다 — 위 하나·아래 하나(지금 ${boxes.length})`);
  const titles = boxes.map(b => (b.querySelector('.bt') || {}).textContent || '');
  const trio = r.cranes[0].trio;
  T(titles[0] === 'BAY ' + String(trio.lo).padStart(2, '0'),
    `위 반쪽 제목이 «${titles[0]}» — 카고플랜과 같은 표기`);
  T(titles[1] === 'BAY (' + String(trio.mid).padStart(2, '0') + ')' + String(trio.hi).padStart(2, '0'),
    `아래 반쪽 제목이 «${titles[1]}»`);
  T((d.querySelector('.tw-ttl') || {}).textContent === trio.title, `위에 적힌 칸 이름이 «${trio.title}»`);
  //  갑판·선창을 다 그리는가 — 검수사 «위에 데크홀드 아래도 데크홀드»
  let deckRows = 0, holdRows = 0;
  for (const row of d.querySelectorAll('.tw-r')) {
    const t = parseInt((row.querySelector('.tw-tl') || {}).textContent || '-1', 10);
    if (t >= 80) deckRows++; else if (t >= 0) holdRows++;
  }
  T(deckRows > 0 && holdRows > 0, `갑판 ${deckRows}줄 · 선창 ${holdRows}줄 — 둘 다 그린다`);
  T(d.querySelectorAll('.tw-r.sea').length === boxes.filter(b => {
    const ts = [...b.querySelectorAll('.tw-tl')].map(x => parseInt(x.textContent, 10));
    return ts.some(t => t >= 80) && ts.some(t => t < 80);
  }).length, '갑판과 선창 사이 금은 반쪽마다 한 줄뿐이다');
  T(d.querySelectorAll('.tw-h .dh').length === 2, '반쪽마다 «↑ DECK / ↓ HOLD» 를 적는다');
  //  칸 상태
  T(d.querySelectorAll('.tw-c.done').length > 0, '내린 칸을 초록으로 칠한다');
  T(d.querySelectorAll('.tw-c.xx').length > 0, '옆 40ft 가 차지한 칸에 X 를 찍는다');
  const hot = d.querySelectorAll('.tw-c.hot').length;
  T(hot === (r.cranes[0].twin ? 2 : 1), `반짝이는 칸이 ${hot}개 — 트윈이면 둘, 아니면 하나`);
  T([...d.querySelectorAll('.tw-c')].every(c => /^(\d{4}|X|)$/.test(c.textContent.trim())),
    '칸 글자는 끝 4자리·X·빈칸뿐이다 — 컨번호를 통째로 적지 않는다(감사: 옛 단언은 영문이 들면 안 걸렸다)');
  T([...d.querySelectorAll('.tw-c')].some(c => /^\d{4}$/.test(c.textContent.trim())), '끝 4자리가 실제로 찍힌다');
  //  문장이 없다 — 검수사 «글자 없이 그림만»
  T(!/내리는 중|실는 중|콘 빼기|콘 꽂기|분 전|최근 실적/.test(host.textContent),
    '화면에 신호 문장·시각이 없다 — 그림만이다');
  //  ⑥ 안 잘린다 — 칸 크기를 화면에서 거꾸로 냈는가
  const st = d.getElementById('ctTwin').style;   // ⚠ `:root` 가 아니다 — `.tw` 의 제 선언이 상속을 이긴다(감사 실측)
  const cw = parseFloat(st.getPropertyValue('--twc')), ch = parseFloat(st.getPropertyValue('--twh'));
  const nCols = Math.max(...boxes.map(b => Math.max(...[...b.querySelectorAll('.tw-r')].map(x => x.querySelectorAll('.tw-c').length))));
  const nRows = d.querySelectorAll('.tw-r').length;
  T(cw > 0 && ch > 0, `칸 크기를 쟀다 — ${cw}×${ch}px`);
  const fit = measure(d, cw, ch);
  T(fit.wUse <= fit.wRoom, `열 ${nCols}개 · 실폭 ${fit.wUse}px 가 상자 안폭 ${fit.wRoom}px 안에 든다(CSS 에서 센 값)`);
  T(fit.hUse <= fit.hRoom, `줄 ${nRows}개 · 실높이 ${fit.hUse}px 가 화면 ${fit.hRoom}px 안에 든다(CSS 에서 센 값)`);
  T(cw >= 14 && ch >= 11, '칸이 아무리 좁아도 하한 아래로는 안 내려간다');
  //  ⑦ 좌우로 밀면 다음 호기
  if (r.cranes.length > 1) {
    const before = (d.querySelector('.tw-ttl') || {}).textContent;
    w.__twGo(1);
    const after = (d.querySelector('.tw-ttl') || {}).textContent;
    T(w.__TW.page === 1, '한 번 밀면 다음 쪽이다');
    T(before !== after || r.cranes[0].trio.title === r.cranes[1].trio.title,
      `밀면 다른 호기가 나온다(${before} → ${after})`);
    w.__twGo(-1);
    T(w.__TW.page === 0, '되밀면 첫 쪽으로 돌아온다');
    w.__twGo(-1);
    T(w.__TW.page === 0, '첫 쪽에서 더 밀어도 넘치지 않는다');
  }
}

//  ⑧ 열이 많아도 안 잘린다 — 실데이터에서 가장 넓은 칸으로
{
  const w = boot();
  const r = w.__ctCompute();
  let worst = 0, worstRows = 0;
  for (let i = 0; i < r.cranes.length; i++) {
    w.__twOpen(r.cranes[i].eq);
    const d = w.document;
    const cols = Math.max(...[...d.querySelectorAll('.tw-r')].map(x => x.querySelectorAll('.tw-c').length));
    const rows = d.querySelectorAll('.tw-r').length;
    const cw = parseFloat(d.getElementById('ctTwin').style.getPropertyValue('--twc'));
    const ch = parseFloat(d.getElementById('ctTwin').style.getPropertyValue('--twh'));
    const f2 = measure(d, cw, ch);
    T(f2.wUse <= f2.wRoom && f2.hUse <= f2.hRoom,
      `${r.cranes[i].eq} — 줄 ${rows} · 열 ${cols} · 칸 ${cw}×${ch}px · 폭 ${f2.wUse}/${f2.wRoom} · 높이 ${f2.hUse}/${f2.hRoom}`);
    if (cols > worst) { worst = cols; worstRows = rows; }
  }
  T(worst >= 8, `실데이터에서 가장 넓은 칸이 ${worst}열 · ${worstRows}줄이다`);
}

//  ⑨ 소스 모양 — 지어낸 트윈 금지·조용한 실패 금지
{
  T(/든 것만 트윈이다|계획\(EDI\)으로/.test(html), '계획으로 트윈을 미리 판정하지 않는다고 적어 두었다');
  T(/console\.warn\('\[콘 2\.43\] 화면을 못 재/.test(html), '화면을 못 재면 조용히 넘어가지 않고 알린다');
  T(/ctBaysLbl\(c\)/.test(html), '카드·띠가 같은 표기 한 벌을 쓴다(§4-4)');
  T((html.match(/ctBaysLbl\(c\)/g) || []).length >= 2, '카드와 띠 **둘 다** 그 한 벌을 지난다');
  T(/⤢/.test(html) && /data-tw=/.test(html), '카드에 「⤢」 문이 있다');
  T(/그 호기가 지금 하는 카고플랜 한 칸/.test(html), '매뉴얼에 이 화면을 적어 두었다(규범 §4-6)');
}

//  ⑩ **진짜 트윈 순간** — 실적을 그 순간까지만 잘라 되살린다.
//     픽스처 끝이 마침 트윈이 아닐 수 있으므로, 트윈이 일어난 시각으로 되감아 두 칸이 같이 반짝이는지 본다.
{
  const recs = Object.entries(TW_FX)
    .filter(([, r]) => r && r.at && String(r.pos || '').length === 6)
    .map(([cn, r]) => ({ cn, at: r.at, eq: r.equip, b: +String(r.pos).slice(0, 2), row: String(r.pos).slice(2, 4), t: String(r.pos).slice(4, 6) }))
    .sort((a2, b2) => a2.at - b2.at);
  const byEq = {}; for (const r of recs) (byEq[r.eq] || (byEq[r.eq] = [])).push(r);
  let hit = null;
  for (const eq of Object.keys(byEq)) {
    const rs = byEq[eq];
    for (let i = rs.length - 2; i >= 0; i--) {
      const a2 = rs[i], b2 = rs[i + 1];
      if (a2.row === b2.row && a2.t === b2.t && Math.abs(b2.at - a2.at) <= 120000 && Math.abs(a2.b - b2.b) === 2) { hit = { eq, a: a2, b: b2 }; break; }
    }
    if (hit) break;
  }
  T(!!hit, hit ? `픽스처에 진짜 트윈이 있다 — ${hit.eq} 베이 ${Math.min(hit.a.b, hit.b.b)}+${Math.max(hit.a.b, hit.b.b)} · ${hit.a.row}열 ${hit.a.t}단`
                : '⛔ 픽스처에 트윈이 없다 — 이 검사는 트윈을 봐야 한다');
  if (hit) {
    const cut = {}; for (const [cn, r] of Object.entries(TW_FX)) if (r.at <= hit.b.at) cut[cn] = r;
    const w = boot({ tw: cut });
    const r = w.__ctCompute();
    const c = r.cranes.find(x => x.eq === hit.eq.replace(/^GC10(\d)$/, '$1호기'));
    T(!!c && !!c.twin, '그 순간을 되살리면 트윈으로 잡힌다');
    if (c && c.twin) {
      const lo = Math.min(hit.a.b, hit.b.b), hi = lo + 2;
      T(c.twin.bays[0] === lo && c.twin.bays[1] === hi, `두 베이가 ${lo}+${hi} 다`);
      T(w.__ctBaysLbl(c) === String(lo).padStart(2, '0') + '+' + String(hi).padStart(2, '0'),
        `카드·띠에 «${w.__ctBaysLbl(c)}» 로 두 베이를 적는다 — 종전엔 한 베이만 적혀 나머지가 사라졌다`);
      T(c.trio.title === `${String(lo).padStart(2, '0')} (${String(lo + 1).padStart(2, '0')})${String(hi).padStart(2, '0')}`,
        `칸 이름이 «${c.trio.title}»`);
      w.__twOpen(c.eq);
      const d = w.document;
      const hots = [...d.querySelectorAll('.tw-c.hot')];
      T(hots.length === 2, `⛔ 트윈이면 **두 칸**이 같이 반짝인다(지금 ${hots.length}개) — 이번 판의 핵심이다`);
      const boxes = [...d.querySelectorAll('.tw-bv')];
      T(boxes.length === 2 && boxes.every(b => b.querySelectorAll('.tw-c.hot').length === 1),
        '반짝이는 칸이 위·아래 반쪽에 하나씩 있다 — 한 반쪽에 둘이 몰리면 트윈이 아니다');
      T((d.querySelector('.tw-ttl') || {}).textContent === c.trio.title, `전체 화면 제목이 «${c.trio.title}»`);
    }
  }
}

//  ⑪ **칸은 사전이 정한다** — 40ft 짝은 배마다 다르다(감사 「부」①).
{
  const w = boot();
  const g = w.__ctTrioOf;
  //  사전 실측 — SWBT 는 pairEven {11:10, 19:18}. 그러니 19 는 «17 (18)19» 이지 «19 (20)21» 이 아니다.
  T(g(19, null).title === '17 (18)19', `20ft 베이 19 는 사전대로 «${g(19, null).title}» — 지어낸 규칙이면 «19 (20)21» 이 된다`);
  T(g(19, null).src === 'dict', '그 답이 사전에서 나왔다고 밝힌다');
  T(g(11, null).title === '09 (10)11', `20ft 베이 11 → «${g(11, null).title}»`);
  T(g(17, null).title === '17 (18)19', `짝 없는 단독 20ft 17 → «${g(17, null).title}»(뒤 짝을 사전에서 찾는다)`);
  T(g(18, null).title === '17 (18)19', `40ft 베이 18 → «${g(18, null).title}»`);
  T(g(10, null).title === '09 (10)11', `40ft 베이 10 → «${g(10, null).title}»`);
  //  트윈은 든 것이 답 — 사전이 없어도 안다
  const w2 = boot();
  w2.state._bayDictBays = new Map();
  T(w2.__ctTrioOf(17, { bays: [17, 19] }).title === '17 (18)19', '사전이 없어도 트윈은 든 두 대로 칸을 안다');
  T(w2.__ctTrioOf(19, null).title === '19', '⛔ 사전이 없으면 짝을 지어내지 않는다 — 아는 반쪽만');
  T(w2.__ctTrioOf(19, null).src === 'nodict', '사전이 없다는 것을 결과에 남긴다');
  //  사전에 있는데 짝이 없는 베이 — 한 반쪽만
  const w3 = boot();
  w3.state._bayDictBays = new Map([[41, { bayNo: '41', rowCount: 9 }]]);
  T(w3.__ctTrioOf(41, null).title === '41', '사전에 짝이 없으면 그 베이 한 반쪽만 그린다');
}

//  ⑫ **아래 반쪽에 40ft 베이가 들어 있는가** — 빼면 그림이 통째로 비어야 한다.
{
  const w = boot();
  const r = w.__ctCompute();
  const c = r.cranes.find(x => x.trio && x.trio.mid != null && x.trio.hi != null) || r.cranes[0];
  w.__twOpen(c.eq);
  const d = w.document;
  const boxes = [...d.querySelectorAll('.tw-bv')];
  const bot = boxes[boxes.length - 1];
  const mid = c.trio.mid;
  const midCns = FX.ediRows.filter(x => parseInt(x.bay, 10) === mid).map(x => x.cn);
  T(midCns.length > 0, `아래 반쪽의 40ft 베이 ${mid} 에 계획 ${midCns.length}대가 있다(픽스처)`);
  const shown = new Set([...bot.querySelectorAll('.tw-c[title]')].map(x => x.getAttribute('title')));
  const hit = midCns.filter(cn => shown.has(cn)).length;
  T(hit > 0, `⛔ 아래 반쪽이 40ft 베이 ${mid} 의 컨을 그린다(${hit}/${midCns.length}대) — 빼면 그림이 빈다`);
  const hiCns = FX.ediRows.filter(x => parseInt(x.bay, 10) === c.trio.hi).map(x => x.cn);
  T(hiCns.filter(cn => shown.has(cn)).length > 0, `아래 반쪽이 뒤 20ft 베이 ${c.trio.hi} 도 같이 그린다`);
}

//  ⑬ **열은 베이사전 골격에서 온다** — 골격을 무시하거나 골격에 없는 열을 버리면 걸린다.
{
  const w = boot();
  const r = w.__ctCompute();
  const c = r.cranes.find(x => x.trio && x.trio.lo != null) || r.cranes[0];
  w.__twOpen(c.eq);
  const d = w.document;
  const box = [...d.querySelectorAll('.tw-bv')][0];
  //  픽스처 사전에서 그 베이의 갑판 열을 독립으로 낸다(소스 함수를 안 쓴다).
  const bs = FX.baysSummary[String(c.trio.lo)];
  if (bs) {
    const cells = (bs.deckCells || []).map(Number).filter(v => v > 0);
    const maxC = cells.length ? Math.max(...cells) : (bs.rowCount || 0);
    const hasZero = bs.deckHasZero != null ? !!bs.deckHasZero : !!bs.hasZero;
    const pad = (n) => String(n).padStart(2, '0');
    const skel = [];
    if (maxC > 0) {
      if (hasZero) { const half = Math.floor((maxC - 1) / 2);
        for (let n = half * 2; n > 0; n -= 2) skel.push(pad(n)); skel.push('00');
        for (let n = 1; n <= half * 2 - 1; n += 2) skel.push(pad(n)); }
      else { const he = Math.floor(maxC / 2), ho = maxC - he;
        for (let n = he * 2; n > 0; n -= 2) skel.push(pad(n));
        for (let n = 1; n <= ho * 2 - 1; n += 2) skel.push(pad(n)); }
    }
    const deckRow = [...box.querySelectorAll('.tw-r')].find(x => parseInt((x.querySelector('.tw-tl') || {}).textContent, 10) >= 80);
    if (deckRow && skel.length) {
      const drawn = deckRow.querySelectorAll('.tw-c').length;
      T(drawn >= skel.length, `갑판 열 ${drawn}개가 사전 골격 ${skel.length}개 이상이다 — 골격을 무시하면 줄어든다`);
      const lab = [...box.querySelectorAll('.tw-lab')][0];
      const labs = [...lab.querySelectorAll('span:not(.pad)')].map(x => x.textContent);
      T(skel.every(cn2 => labs.includes(cn2)), '사전 골격의 열이 하나도 안 빠졌다');
    } else { T(false, '갑판 줄이나 골격을 못 찾았다 — 검사가 헛돌면 안 된다'); }
  } else { T(false, `픽스처 사전에 베이 ${c.trio.lo} 가 없다 — 이 검사가 헛돈다`); }
}

//  ⑬-2 **골격 단위시험** — 실데이터는 칸이 골격을 다 덮어 버려서 이것만으로는 못 잡는다(사보타주 실측).
{
  const w = boot();
  const bs = FX.baysSummary['17'];
  T(!!bs, '픽스처 사전에 베이 17 이 있다');
  //  칸은 두 열뿐인데 골격은 11열 — 골격을 무시하면 두 열만 나온다.
  const few = { '82': { '00': { l4: '0001', on: false }, '01': { l4: '0002', on: false } } };
  const got = w.__twCols([17], true, few);
  T(got.length > 2, `골격이 열을 채운다 — 칸은 2개인데 열 ${got.length}개(골격을 무시하면 2개)`);
  T(got.includes('10') && got.includes('09'), '골격의 바깥 열(10·09)까지 나온다');
  //  골격에 없는 열도 반드시 그린다(2.35 규칙) — 버리면 검수원이 없는 컨을 찾는다.
  const odd = { '82': { '99': { l4: '0003', on: false } } };
  const got2 = w.__twCols([17], true, odd);
  T(got2.includes('99'), '⛔ 골격에 없는 열(99)도 그린다 — 버리면 화면에 없는 컨을 찾게 된다');
  //  사전에 없는 베이면 실린 자리로만
  const got3 = w.__twCols([9999], true, few);
  T(got3.length === 2 && got3.includes('00') && got3.includes('01'), '사전에 없는 베이는 실린 자리로만 열을 잡는다');
}

//  ⑭ **30초 갱신이 보던 호기를 안 바꾼다** — 배열은 «최근순»으로 다시 정렬된다(감사 「부」②).
{
  const w = boot();
  const r0 = w.__ctCompute();
  if (r0.cranes.length > 1) {
    w.__twOpen(r0.cranes[0].eq);
    w.__twGo(1);
    const seeing = w.document.querySelector('.tw-ttl').textContent;
    const eq2 = w.__TW.eq;
    //  실적을 한 대 더 넣어 차례를 뒤집는다 — 첫 쪽이던 호기가 가장 최근이 되게.
    //  ⚠ **보던 호기(둘째)를 가장 최근으로** 만들어야 차례가 실제로 뒤집힌다 —
    //     첫째를 최근으로 만들면 차례가 그대로라 자리번호로 잡아도 통과한다(사보타주 실측).
    const seen2 = r0.cranes[1];
    const tw2 = { ...w.__CT.tw.discharge };
    const src = Object.entries(tw2).find(([, v]) => v.equip && v.equip.endsWith(String(seen2.eq).replace('호기', '')));
    T(!!src, '차례를 뒤집을 실적을 찾았다');
    if (src) tw2['__SMOKE__'] = { ...src[1], at: Date.now() + 60000 };
    w.__CT.tw = { discharge: tw2, loading: {} };
    w.__twDraw ? w.__twDraw() : null;
    T(w.__TW.eq === eq2, `차례가 바뀌어도 보던 호기(${eq2})가 그대로다 — 자리번호로 잡으면 말없이 바뀐다`);
    //  ⚠ 칸(트리오)은 바뀔 수 있다 — 그 호기가 옮겨 가면 바뀌는 것이 맞다. 바뀌면 안 되는 것은 **누구를 보고 있는가**다.
    T(w.document.querySelector('.tw-gang').textContent.includes(String(eq2).replace('호기','')),
      `화면 좌상단도 그 호기(${eq2}) 그대로다`);
  } else { T(false, '⛔ 호기가 둘 이상인 픽스처여야 한다 — 건너뛰면 검사가 아니다'); }
}

//  ⑮ **동방은 호기가 안 온다** — 이름이 «베이 18» 인데 «18호기» 라 적으면 거짓말이다(감사 「부」③ · 2.38 과 같은 문지기).
{
  const w = boot();
  const r = w.__ctCompute();
  const base = r.cranes[0];
  //  twCranes 를 갈아 끼워 동방(호기 없이 «베이 NN» 이름)을 흉내 낸다.
  vm.runInContext('var __fake = null; var __orig = twCranes; twCranes = function(){ return __fake || __orig(); };', w);
  w.__fake = [{ ...base, eq: '베이 18' }];
  w.__twOpen('베이 18');
  const g = w.document.querySelector('.tw-gang').textContent;
  T(!/18\s*호기/.test(g), `동방 이름을 «18호기» 라 하지 않는다 — 지금 «${g.trim()}»`);
  T(/베이\s*18/.test(g), '이름을 그대로 적는다(«베이 18»)');
  //  호기가 오는 배는 종전대로 «N호기»
  w.__fake = [{ ...base, eq: '4호기' }];
  w.__twOpen('4호기');
  T(/4\s*호기/.test(w.document.querySelector('.tw-gang').textContent), 'PCTC 는 종전대로 «4호기»');
  vm.runInContext('twCranes = __orig; __fake = null;', w);
}

//  ⑯ **잰 값이 화면에 닿는가** — `:root` 에 적으면 `.tw{--twc:26px}` 가 이겨 버려진다(감사 실측 Chrome 26×26px).
{
  const w = boot();
  const r = w.__ctCompute();
  w.__twOpen(r.cranes[0].eq);
  const host = w.document.getElementById('ctTwin');
  T(/--twc/.test(host.getAttribute('style') || ''), '⛔ 칸 크기를 `#ctTwin` 자신에게 적는다 — `:root` 에 적으면 `.tw` 가 이긴다');
  const inline = parseFloat(host.style.getPropertyValue('--twc'));
  const decl = ((html.match(/\.tw\{[^}]*\}/) || [''])[0].match(/--twc:\s*([\d.]+)px/) || [])[1];
  T(inline > 0, `그 값이 실제로 적혔다 — ${inline}px`);
  T(!!decl, `클래스 기본값 ${decl || '없음'}px 이 있다 — 첫 그림 전까지만 쓰인다`);
  T(!/const r = \(host \|\| document\.documentElement\)\.style/.test(html),
    '전체 화면이 없으면 :root 에 적지 않는다 — 그 길로 새면 `.tw` 가 이겨 잰 값이 버려진다');
  T(!/document\.documentElement\.style;\s*\n\s*r\.setProperty\('--twc'/.test(html),
    '옛 «:root 에 적기» 가 남아 있지 않다');
  //  안 들어가면 밀 수 있게 — 가로·세로 둘 다
  T(/el\.style\.overflowY = \(hRaw < 11\) \? 'auto'/.test(html) && /el\.style\.overflowX = \(wRaw < 14\) \? 'auto'/.test(html),
    '하한에 걸리면 가로·세로로 밀 수 있게 연다 — 잘려 없어지는 것보다 낫다');
}

//  ⑰ **칸(트리오)이 배마다 사전대로인가** — 실사전 여덟 척 전수.
//  ⚠ 코드의 «어느 40ft 를 고르나» 식을 베끼면 그 자체가 항등식이다(3차 감사 지적). 그래서 **고른 답이 갖춰야 할 성질**로 잰다 —
//    ①가운데는 그 배에 실제로 있는 **짝수** 베이다 ②앞·뒤는 그 배에 있는 **홀수**이고 각각 가운데∓1 이다
//    ③앞 < 가운데 < 뒤 (앞뒤 뒤집힘 «(04)03» 금지) ④물어본 베이가 그 칸 안에 있다 ⑤가운데는 물어본 베이의 이웃이다
//    ⑥제목이 낸 값 그대로다. 이 여섯이면 옛 결함(뒤집힘·없는 베이·엉뚱한 칸)이 전부 걸린다.
{
  const DICTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conetwin_dicts.json'), 'utf8'));
  const w = boot();
  const pad = (x) => String(x).padStart(2, '0');
  let n = 0, whole = 0, half = 0, flip = 0, ghost = 0, bad6 = 0;
  const why = [];
  for (const [code, m] of Object.entries(DICTS)) {
    const map = new Map(Object.entries(m).map(([k, v]) => [parseInt(k, 10), v]));
    w.state._bayDictBays = map;
    for (const b of [...map.keys()].sort((x, y) => x - y)) {
      const g = w.__ctTrioOf(b, null); n++;
      if (!g) { why.push(`${code} ${b}: null`); bad6++; continue; }
      const { lo, mid, hi } = g;
      const chk = [];
      if (mid != null && !(mid % 2 === 0 && map.has(mid))) { chk.push('가운데가 그 배의 짝수 베이가 아니다'); ghost++; }
      if (mid == null) {
        //  40ft 를 못 고른 «한 반쪽만» — 그때는 물어본 그 베이 하나여야 한다(배 끝·40ft 짝이 없는 자리).
        if (!((lo === b || hi === b) && map.has(b))) { chk.push('반쪽만 그리는데 그 베이가 아니다'); ghost++; }
      } else {
        if (lo != null && !(lo % 2 === 1 && map.has(lo) && lo === mid - 1)) { chk.push('앞 20ft 가 사전에 없거나 가운데−1 이 아니다'); ghost++; }
        if (hi != null && !(hi % 2 === 1 && map.has(hi) && hi === mid + 1)) { chk.push('뒤 20ft 가 사전에 없거나 가운데+1 이 아니다'); ghost++; }
      }
      if (mid != null && hi != null && !(mid < hi)) { chk.push('앞뒤가 뒤집혔다'); flip++; }
      if (mid != null && lo != null && !(lo < mid)) { chk.push('앞이 가운데보다 뒤다'); flip++; }
      if (!(b === lo || b === mid || b === hi)) chk.push('물어본 베이가 그 칸 안에 없다');
      if (mid != null && Math.abs(mid - b) > 1) chk.push('가운데가 이웃이 아니다');
      const t = [];
      if (lo != null) t.push(pad(lo));
      if (mid != null && hi != null) t.push(`(${pad(mid)})${pad(hi)}`);
      else if (mid != null) t.push(`(${pad(mid)})`);
      else if (hi != null) t.push(pad(hi));
      if (g.title !== t.join(' ')) chk.push(`제목이 낸 값과 다르다(${g.title})`);
      if (chk.length) { bad6++; if (why.length < 5) why.push(`${code} ${b} «${g.title}» — ${chk.join(' · ')}`); }
      if (lo != null && mid != null && hi != null) whole++; else half++;
    }
  }
  for (const x of why) console.log('      ↳ ' + x);
  T(flip === 0, `⛔ 앞뒤 뒤집힌 칸이 없다(«(04)03» 꼴) — 2차 감사 때 실적 순간의 25.6% 였다`);
  T(ghost === 0, '⛔ 그 배에 없는 베이를 칸에 넣지 않는다');
  T(bad6 === 0, `사전 여덟 척 베이 ${n}개가 여섯 성질을 전부 지킨다(어긋남 ${bad6})`);
  T(whole / n > 0.8, `온전한 칸이 ${(whole / n * 100).toFixed(1)}% 다(반쪽 ${half}개 — 배 끝·40ft 전용 칸)`);
  //  ── 못박은 값 — 배마다 갈리는 것을 눈으로 확인한 자리
  const at = (code, b, twin) => { w.state._bayDictBays = new Map(Object.entries(DICTS[code]).map(([k, v]) => [parseInt(k, 10), v])); return w.__ctTrioOf(b, twin || null); };
  const CASES = [['SWBT', 17, '17 (18)19'], ['STSE', 17, '15 (16)17'], ['DXQD', 3, '03 (04)05'],
                 ['OBWH', 3, '01 (02)03'], ['MCSC', 17, '17 (18)19'], ['NSFR', 17, '15 (16)17'], ['CNFM', 17, '17 (18)19']];
  for (const [code, b, want] of CASES) {
    const got = at(code, b);
    T(got && got.title === want, `${code} 베이 ${b} → «${got ? got.title : 'null'}»(정답 «${want}»)`);
  }
  T(at('SWBT', 17).title !== at('STSE', 17).title, '같은 베이 17 이 배마다 다르다 — 규칙이 아니라 사전이 정한다');
  //  앞뒤 40ft 가 **둘 다 있는** 유일한 배(SWTD 31·33) — 그때만 pairEven 이 갈래를 잡는다.
  T(!!DICTS.SWTD, '픽스처에 SWTD 사전이 있다 — 앞뒤 40ft 가 둘 다 있는 유일한 배다');
  if (DICTS.SWTD) {
    const g31 = at('SWTD', 31), g33 = at('SWTD', 33);
    T(g31 && g31.mid === 30, `⛔ SWTD 31 은 사전이 «짝은 30» 이라 하므로 앞쪽이다 — 낸 것 «${g31 && g31.title}»`);
    T(g31.src === 'dict', '사전이 갈래를 말했으므로 dict 다');
    T(g33 && g33.mid === 34 && g33.src === 'dict?', `SWTD 33 은 사전이 갈래를 안 말해 뒤쪽(34)으로 보고 그렇게 밝힌다 — «${g33 && g33.title}» src ${g33 && g33.src}`);
  }
  T(at('SWBT', 17, { bays: [17, 19] }).title === '17 (18)19', '트윈은 어느 배든 가운데가 lo+1 이다');
  //  사전이 «19 의 짝은 20» 이라 해도 트윈 가운데는 18
  w.state._bayDictBays = new Map([[17, { bayNo: '17' }], [18, { bayNo: '18' }], [19, { bayNo: '19', pairEven: '20' }], [20, { bayNo: '20' }]]);
  T(w.__ctTrioOf(19, { bays: [17, 19] }).title === '17 (18)19', '⛔ 사전이 다른 짝을 말해도 트윈 가운데는 lo+1 이다');
}

//  ⑱ **그물 구멍 넷** — 4차 감사가 «코드는 옳은데 검사가 못 본다» 고 짚은 자리.
{
  //  ⓐ 트윈을 트리오에 실제로 넘기는가 — 이번 판의 배선 그 자체다.
  //    사전 짝이 «앞쪽» 인 배(STSE)로 재야 갈린다. SWBT 는 사전 답과 트윈 답이 우연히 같아 안 걸린다.
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conetwin_dicts.json'), 'utf8'));
  const w = boot();
  w.state._bayDictBays = new Map(Object.entries(D.STSE).map(([k, v]) => [parseInt(k, 10), v]));
  const noTwin = w.__ctTrioOf(19, null), yesTwin = w.__ctTrioOf(19, { bays: [17, 19] });
  //  ⚠ STSE 는 짝수가 4·8·12·16·20·24 라 18 이 없다 — 트윈이면 «17 19»(두 20ft), 아니면 «19 (20)21».
  //    어느 쪽이든 **트윈을 넘기고 안 넘기고가 답을 가른다**. 배선이 끊기면 둘이 같아진다.
  T(noTwin.title === '19 (20)21' && yesTwin.title === '17 19' && noTwin.title !== yesTwin.title,
    `⛔ STSE 베이 19 — 트윈이면 «${yesTwin.title}», 아니면 «${noTwin.title}». 배선이 끊기면 같아진다`);
  //  ctCompute 가 정말 트윈을 넘기는가(배선 실측)
  //  ⚠ **진짜 트윈 순간으로 되감아** 잰다 — 픽스처 끝이 트윈이 아니면 이 항이 헛돈다(사보타주 실측).
  const recs2 = Object.entries(TW_FX).filter(([, v]) => v && v.at && String(v.pos || '').length === 6)
    .map(([cn, v]) => ({ cn, at: v.at, eq: v.equip, b: +String(v.pos).slice(0, 2), row: String(v.pos).slice(2, 4), t: String(v.pos).slice(4, 6) }))
    .sort((x, y) => x.at - y.at);
  const byEq2 = {}; for (const x of recs2) (byEq2[x.eq] || (byEq2[x.eq] = [])).push(x);
  let hit2 = null;
  for (const eq of Object.keys(byEq2)) { const rs = byEq2[eq];
    for (let i = rs.length - 2; i >= 0; i--) { const p1 = rs[i], p2 = rs[i + 1];
      if (p1.row === p2.row && p1.t === p2.t && Math.abs(p2.at - p1.at) <= 120000 && Math.abs(p1.b - p2.b) === 2) { hit2 = p2; break; } }
    if (hit2) break; }
  T(!!hit2, '되감을 트윈 순간을 찾았다');
  const cut2 = {}; for (const [cn, v] of Object.entries(TW_FX)) if (v.at <= hit2.at) cut2[cn] = v;
  const w2 = boot({ tw: cut2 });
  const r2 = w2.__ctCompute();
  const tw2 = r2.cranes.filter(c => c.twin);
  T(tw2.length > 0, `되감으니 트윈 ${tw2.length}대가 잡힌다`);
  T(tw2.every(c => c.trio && c.trio.lo === c.twin.bays[0] && c.trio.hi === c.twin.bays[1]),
    `⛔ 트윈 ${tw2.length}대의 칸이 그 두 베이를 감싼다 — ctTrioOf 에 트윈을 안 넘기면 어긋난다`);
  //  ⚠ SWBT 사전은 트윈 답과 사전 답이 **우연히 같다**(18 이 있다) — 그것만으로는 배선이 끊겨도 안 걸린다(감사 지적).
  //    사전만 STSE(18 이 없다)로 바꿔 두 답을 갈라 놓고 잰다.
  const w2b = boot({ tw: cut2 });
  w2b.state._bayDictBays = new Map(Object.entries(D.STSE).map(([k, v]) => [parseInt(k, 10), v]));
  const tw2b = w2b.__ctCompute().cranes.filter(c => c.twin);
  T(tw2b.length > 0, `사전을 바꿔도 트윈 ${tw2b.length}대가 잡힌다(트윈은 자료로 가린다)`);
  T(tw2b.every(c => c.trio && c.trio.lo === c.twin.bays[0] && c.trio.hi === c.twin.bays[1]),
    `⛔ 사전이 달라도 칸이 든 두 베이를 감싼다 — 낸 것 «${tw2b.map(c => c.trio.title).join(' · ')}»(배선이 끊기면 «19 (20)21» 이 된다)`);

  //  ⓑ 반짝임은 **양쪽 다** — 마지막 컨이 앞 베이든 뒤 베이든 두 칸이 켜져야 한다.
  const mk = (bays, lastBay) => {
    const ww = boot();
    vm.runInContext('var __fake=null, __orig=twCranes; twCranes=function(){ return __fake || __orig(); };', ww);
    const base = ww.__ctCompute().cranes[0];
    ww.__fake = [{ ...base, eq: '9호기', bay: lastBay, row: '02', tier: '02', mode: 'discharge',
                   twin: { bays, row: '02', tier: '02' }, bays, trio: ww.__ctTrioOf(lastBay, { bays }) }];
    ww.__twOpen('9호기');
    return ww.document.querySelectorAll('.tw-c.hot').length;
  };
  T(mk([17, 19], 19) === 2, '마지막 컨이 **뒤** 베이여도 두 칸이 반짝인다');
  T(mk([17, 19], 17) === 2, '⛔ 마지막 컨이 **앞** 베이여도 두 칸이 반짝인다 — 한쪽만 켜면 반쪽이 어두워진다');

  //  ⓒ 선창 열은 갑판 열과 따로다 — 갈아 끼우면 선창 컨이 사라진다.
  const w3 = boot();
  const cells = { '82': { '00': { l4: '0001' }, '01': { l4: '0002' } }, '02': { '05': { l4: '0003' }, '07': { l4: '0004' } } };
  const dC = w3.__twCols([17], true, cells), hC = w3.__twCols([17], false, cells);
  T(hC.includes('05') && hC.includes('07'), '선창 열이 선창 칸을 담는다');
  T(JSON.stringify(dC) !== JSON.stringify(hC) || dC.length === 0,
    `갑판 열(${dC.length})과 선창 열(${hC.length})을 따로 낸다 — 갈아 끼우면 없는 열의 컨이 사라진다`);
  //  실렌더로도 — 선창 줄의 칸이 선창 열 수와 같은가
  const w4 = boot();
  const r4 = w4.__ctCompute();
  w4.__twOpen(r4.cranes[0].eq);
  const d4 = w4.document;
  const hold = [...d4.querySelectorAll('.tw-r')].filter(x => parseInt((x.querySelector('.tw-tl') || {}).textContent, 10) < 80);
  const deck = [...d4.querySelectorAll('.tw-r')].filter(x => parseInt((x.querySelector('.tw-tl') || {}).textContent, 10) >= 80);
  T(hold.length > 0 && deck.length > 0, '갑판·선창 줄이 둘 다 있다');
  T(hold.every(x => x.querySelectorAll('.tw-c').length === hold[0].querySelectorAll('.tw-c').length),
    '선창 줄끼리 칸 수가 같다(제 열로 그린다)');
  //  ⛔ 이 배는 갑판 11열·선창 9열이다 — 선창을 갑판 열로 그리면 없는 열이 생기고 컨이 밀린다.
  const nD = deck[0].querySelectorAll('.tw-c').length, nH = hold[0].querySelectorAll('.tw-c').length;
  T(nD !== nH, `⛔ 갑판 ${nD}열 · 선창 ${nH}열 — 구역마다 제 폭이다(갈아 끼우면 같아진다)`);

  //  ⓓ 누른 호기를 연다 — 늘 첫 호기를 열면 ⤢ 가 뜻이 없다.
  const w5 = boot();
  const r5 = w5.__ctCompute();
  if (r5.cranes.length > 1) {
    w5.__twOpen(r5.cranes[1].eq);
    T(w5.__TW.eq === r5.cranes[1].eq, `⛔ 둘째 호기 ⤢ 를 누르면 그 호기가 열린다(${w5.__TW.eq})`);
    T(w5.document.querySelector('.tw-ttl').textContent === r5.cranes[1].trio.title,
      `그 호기의 칸이 뜬다(${r5.cranes[1].trio.title})`);
  } else { T(false, '⛔ 호기가 둘 이상인 픽스처여야 한다'); }

  //  ⓔ 열 차례 — 짝수는 큰 번호부터 왼쪽, 00 가운데, 홀수는 오른쪽으로(베이플랜과 같은 벌).
  const w6 = boot();
  //  사전에 없는 베이로 물어 **실린 자리만**으로 차례를 본다(골격이 끼면 차례가 아니라 개수를 보게 된다).
  const order = w6.__twCols([9999], false, { '02': { '10': 1, '00': 1, '01': 1, '08': 1, '03': 1 } });
  T(JSON.stringify(order) === JSON.stringify(['10', '08', '00', '01', '03']),
    `열 차례가 베이플랜과 같다 — ${order.join(' ')}`);
}

console.log(bad ? `✗ ${bad}항 실패` : '✓ 전부 통과');
process.exit(bad ? 1 : 0);
