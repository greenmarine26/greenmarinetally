// 콘앱 위 고정 띠·카드 접기(2.38) 연막검사 — 소스에서 CT 블록을 **그대로** 꺼내 ctRender 를 돌려 화면 글을 본다.
//
// 왜 있는가.
//   2.38 이 고친 둘은 «계산»이 아니라 **화면에 남는 글자**다. 계산 검사(smoke_conetiming)로는 안 걸린다.
//     ① 띠에서 베이 번호가 «…»로 잘렸다 — 동방은 호기가 없어 c.eq 자체가 «베이 18»이라 «베이 18 베이02»로 겹쳤고,
//        CSS 가 왼쪽만 줄이게 돼 있어 정작 중요한 베이 번호가 사라졌다(검수사 폰 실화면).
//     ② 멈춘 호기 카드 13장이 지금 도는 것과 같은 크기로 서서 화면을 먹었다.
//   ⇒ 다음 클로드가 CSS 한 줄을 되돌리거나 접기를 지우면 여기서 선다.
//
// 쓰는 법:  node tools/smoke_conestrip.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };

console.log('콘앱 위 띠·카드 접기 (2.38)');

// ── 1. CSS — 줄어야 할 것은 신호 쪽이다 ────────────────────────────────
const cssSpan = /\.ct-s > span\{([^}]*)\}/.exec(html);
const cssB = /\.ct-s b\{([^}]*)\}/.exec(html);
T(!!cssSpan && /flex:\s*0 0 auto/.test(cssSpan[1]) && /white-space:\s*nowrap/.test(cssSpan[1]),
  '띠 왼쪽(베이·대수)은 안 줄어든다 — flex:0 0 auto · nowrap');
T(!!cssSpan && !/text-overflow/.test(cssSpan[1]),
  '★ 띠 왼쪽에 ellipsis 가 없다 — 베이 번호가 «…»로 사라지던 자리');
T(!!cssB && /min-width:\s*0/.test(cssB[1]) && /text-overflow:\s*ellipsis/.test(cssB[1]),
  '띠 오른쪽(신호)이 줄어든다 — min-width:0 · ellipsis');
T(/\.ct-old\{/.test(html) && /\.ct-old > summary\{/.test(html), '접기 상자 CSS(.ct-old · summary)가 있다');
T(/\.ct-old > summary\{[^}]*min-height:\s*44px/.test(html), '접기 손잡이가 장갑 낀 손에 맞는다(44px)');

// ── 2. ctRender 를 실제로 돌린다 ──────────────────────────────────────
const ct = html.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
const rnd = html.match(/\nfunction ctCard\(\)[\s\S]*?\n  el\.innerHTML = html;[\s\S]*?\n\}\n/);
T(!!ct && !!rnd, 'CT 블록과 ctRender 를 소스에서 꺼냈다(베껴 적지 않는다)');
if (!ct || !rnd) { console.log('✗ 띠·접기 연막검사 실패'); process.exit(1); }

const NOW = Date.now();
function fakeEl(id) {
  return { id, innerHTML: '', hidden: false, offsetHeight: 30, style: { setProperty: () => {} },
           className: '', querySelector: () => null, addEventListener: () => {} };
}
function render(cranes, opts) {
  opts = opts || {};
  const card = fakeEl('ct-card'), strip = fakeEl('ct-strip');
  const ctx = {
    console: { warn: () => {}, log: () => {} }, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON, RegExp,
    setInterval: () => 1, clearInterval: () => {},
    document: { addEventListener: () => {}, createElement: () => fakeEl(''), querySelector: () => null,
      getElementById: (id) => (id === 'ct-card' ? card : id === 'ct-strip' ? strip : null),
      documentElement: { style: { setProperty: () => {} } } },
    window: {}, state: { shipType: 'container', disch: { ediRows: [] }, stow: { ediRows: [] } },
    fbFetch: async () => ({ ok: false, status: 0 }), ensureConeBayDict: async () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(ct[0] + '\n' + rnd[0] + '\nthis.__CT = CT; this.__render = ctRender;', ctx, { filename: 'cone.html' });
  ctx.__CT.key = 'X_1N'; ctx.__CT.pier = 'PCTC'; ctx.__CT.at = NOW; ctx.__CT.vsl = 'TEST';
  ctx.__CT._oldOpen = !!opts.open;
  vm.runInContext('ctCompute = () => (' + JSON.stringify({
    cranes, count: { discharge: { n: 0, byEq: {}, deck: 0, deck1: 0, hold: 0, hold0: 0, holdB: 0, holdCones: 0 },
                     loading: { n: 0, byEq: {}, deck: 0, deck1: 0, hold: 0, hold0: 0, holdB: 0, holdCones: 0 } },
    lastAt: NOW, noPos: 0, finished: false, done: { discharge: 0, loading: 0 }, total: { discharge: 0, loading: 0 },
  }) + ');', ctx);
  ctx.__render();
  return { strip: strip.innerHTML, card: card.innerHTML };
}
const crane = (o) => Object.assign({ eq: '1호기', mode: 'discharge', bay: 2, tier: 84, row: '01', at: NOW, cn: 'TEST1234567',
  src: 'term', cls: 'act', sig: '데크 2단(84) 내리는 중 — 데크콘 빼기', sub: '베이 02 · 01열', filled: 0, p1: 0, t1: 82,
  rows1: [], tiers: {}, pair: 2, stale: false, n: 14, size: '20', below: true, holdCone: 1 }, o);

// ── 3. 띠 — 베이 번호가 살아 있다 ─────────────────────────────────────
const pctc = render([crane({ eq: '1호기', bay: 2 })]).strip;
T(/1호기 베이02/.test(pctc), 'PCTC — «1호기 베이02» 그대로: ' + (/(<span>[^<]*)/.exec(pctc) || [])[1]);
const pnct = render([crane({ eq: '베이 18', bay: 18 })]).strip;
T(/베이 18/.test(pnct) && (pnct.match(/베이/g) || []).length === 1,
  '★ 동방 — 베이를 두 번 안 쓴다: ' + (/(<span>[^<]*)/.exec(pnct) || [])[1]);
//  ★ 감사 2026-09-07 — 한 갱은 짝 베이 둘(24+25)을 함께 한다. 띠가 «마지막 컨의 베이»를 쓰면
//    30초마다 24↔25 로 흔들리고 카드 첫 줄과도 어긋난다. 갱 이름(ctPair 로 고정)을 그대로 써야 한다.
const wob = render([crane({ eq: '베이 24', bay: 25 })]).strip;
T(/베이 24/.test(wob) && !/25/.test(wob),
  '★ 갱이 짝 베이 둘을 해도 띠 번호가 안 흔들린다: ' + (/(<span>[^<]*)/.exec(wob) || [])[1]);

// ── 4. 카드 — 지나간 베이는 접힌다 ────────────────────────────────────
const mixed = render([crane({ eq: '1호기', bay: 2, stale: false }),
                      crane({ eq: '2호기', bay: 18, stale: true, at: NOW - 40 * 60000, cls: 'keep', sig: '40분째 기록 없음' }),
                      crane({ eq: '3호기', bay: 20, stale: true, at: NOW - 85 * 60000, cls: 'keep', sig: '85분째 기록 없음' })]).card;
const before = mixed.split('<details')[0], inside = (mixed.split('<details')[1] || '');
T(/<details class="ct-old"/.test(mixed), '멈춘 호기가 접기 상자에 들어간다');
T(/1호기/.test(before) && !/1호기/.test(inside), '지금 도는 1호기는 접히지 않는다');
T(!/2호기|3호기/.test(before) && /2호기/.test(inside) && /3호기/.test(inside), '멈춘 2·3호기는 접힌다');
T(/지나간 베이 2곳/.test(mixed) && /베이 18 · 20/.test(mixed),
  '접힌 채로도 어느 베이였는지 보인다 — ' + ((/<summary>([^<]*)</.exec(mixed) || [])[1] || ''));

// ── 5. 다 멈춘 때 — 화면이 비지 않는다 ────────────────────────────────
const allStale = render([crane({ eq: '1호기', bay: 2, stale: true, at: NOW - 40 * 60000 }),
                         crane({ eq: '2호기', bay: 18, stale: true, at: NOW - 85 * 60000 })]).card;
const b2 = allStale.split('<details')[0];
T(/1호기/.test(b2), '★ 다 멈춰도 가장 최근 하나는 펼쳐 둔다(빈 화면 금지)');
T(/지나간 베이 1곳/.test(allStale), '나머지만 접힌다');

// ── 6. 펼침 상태를 기억한다 ───────────────────────────────────────────
const opened = render([crane({ stale: false }), crane({ eq: '2호기', bay: 18, stale: true, at: NOW - 40 * 60000 })], { open: true }).card;
T(/<details class="ct-old" open>/.test(opened), '펼쳐 뒀으면 30초 갱신 뒤에도 펼쳐진다(CT._oldOpen)');
T(/_oldOpen:false/.test(html) && /CT\._oldOpen = _d\.open/.test(html), '펼침 상태가 CT 에 붙어 있고 toggle 로 갱신된다');

// ── 6-b. 요약이 길어도 한 줄이다 (감사 — 13곳이면 116자라 폰에서 세 줄이 됐다) ──
const many = render([crane({ eq: '1호기', bay: 2, stale: false })].concat(
  [4, 6, 8, 10, 12, 14, 16, 18].map((b, i) => crane({ eq: (i + 2) + '호기', bay: b, stale: true, at: NOW - (30 + i) * 60000 })))).card;
const sm = (/<summary>([^<]*)</.exec(many) || [])[1] || '';
T(/외 5곳/.test(sm) && sm.length <= 40, '★ 접힌 곳이 많으면 셋까지만 적고 «외 N곳»으로 줄인다(' + sm.length + '자) — ' + sm);
T(/\.ct-old > summary\{[^}]*white-space:\s*nowrap/.test(html) && /\.ct-old > summary\{[^}]*text-overflow:\s*ellipsis/.test(html),
  '요약 줄은 CSS 로도 한 줄에 묶인다');
T(/\.ct-s\{[^}]*overflow:\s*hidden/.test(html), '띠 칸이 넘쳐도 이웃을 침범하지 않는다(왼쪽을 안 줄이므로 잠근다)');

// ── 7. 살아있는 호기만 있으면 접기 상자가 아예 없다 ───────────────────
const liveOnly = render([crane({ stale: false })]).card;
T(!/<details/.test(liveOnly), '접을 것이 없으면 상자를 안 만든다');

console.log(bad ? `✗ 띠·접기 연막검사 실패 ${bad}건` : '✓ 콘앱 위 띠·카드 접기 연막검사 통과');
process.exit(bad ? 1 : 0);
