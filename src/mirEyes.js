// 미르가 «한 대»를 보게 하는 겹 — 끝4자리로 물으면 그 컨의 실번호·온도·중량·자리를 말한다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 있는가 (2026-08-25, NSFR 2616N 양하를 클로드가 직접 해보며 나왔다).
//
//   검수사가 늘 하는 질문이 하나 있다 —
//     *«컨테이너 끝자리 4자리만 불러주고 실번호를 묻는다. 그러면 컨테이너 번호, 실번호,
//       XRAY 대상 여부, 선내 위치를 찾아서 답을 한다»*
//
//   그런데 실측하니 미르가 그걸 못 했다. 33문 중 14문이 벙어리였고 그 안에 이것이 있었다.
//     «1918 어디야»      → 12-01-88        ✅
//     «1918 실번호»      → ⛔ 답 없음
//     «1918 씰 뭐야»     → ⛔ 답 없음
//     «1918 중량»        → ⛔ 답 없음
//     «1109 온도»        → ⛔ 답 없음  (「리퍼 온도 뭐야」는 두 대를 다 읽어 준다)
//
//   ★ 자료가 없어서가 아니다. **같은 미르가 다른 질문에는 그 값을 말하고 있었다** —
//     «엑스레이 어디 있어» → *«GAOU2227015 — 25-04-06 · X-RAY 대상 · 씰 NS3655063 · 11.0t»*
//     씰도 중량도 이미 읽고 있다. **개체를 묻는 인텐트만 없었다.**
//     `nlSearch` 에 `sealAuditQuery`(전체 실번호 점검)는 있는데 «이 컨 실번호»는 0건이다.
//
//   ⚠ 화면 카드에는 실번호가 그려진다. 그러나 **손을 안 쓰고 일하려면 미르가 말을 해야 한다** —
//     장갑 낀 손으로 갑판에서 카드를 읽을 수는 없다. 그래서 «보인다»는 «답한다»가 아니다.
//
// 어떻게 붙였나 — 검수사 확정 *«원본은 놔두고 사본을 이용하는것이 젤 좋다»*
//   원본 `nlSearch.js`·`mirKnowledge.js` 는 **한 줄도 안 건드린다.**
//   이 겹이 먼저 보고, 못 보면 `null` 을 내어 **옛 미르가 그대로 답한다.**
//   그래서 지금 되는 것은 하나도 안 바뀐다(미르가 검수사가 되기 전까지 나머지는 그대로 써야 한다).
// ─────────────────────────────────────────────────────────────────────────────

import { bayGroupCenter } from './swapGrade.js';   // 해치 그룹 계산 — 이미 있는 단일 소스를 쓴다(새로 만들지 않는다)


const posOf = (c) => (c?.bay && c?.row && c?.tier) ? `${c.bay}-${c.row}-${c.tier}` : '';



// ─────────────────────────────────────────────────────────────────────────────
//  ★ 2.48 — **«지금 무슨 단계인가»를 미르가 안다.**
//
//  왜. 2026-08-11 클로드가 선적을 직접 해보다 **데크부터 눌렀다.** 순서를 문서로 읽은 상태였는데도,
//    화면에 「데크 14개 / 홀드 42개」가 나란히 있으니 **선택지 둘로 읽었다.**
//    작업표준 §2-2-E 진단 — *«화면을 «어떤 버튼이 있나»로 봤고, «지금 이 배에서 무슨 일이
//    벌어지는 중인가»로 보지 않았다»*. 검수사 — *«홀드 선적 없이 데크에 선적이 안됩니다»*
//
//  그리고 2026-08-25 미르에게 물으니 같은 자리에서 같은 병이 나왔다 —
//    «커버 열어도 돼»        → ⛔ 답 없음
//    «12번 홀드 들어가도 돼» → 「12번 베이: 총 27대」  ← 되냐 안 되냐를 물었는데 통계를 준다
//    «데크부터야 홀드부터야» → 갑판 80대를 줄줄이 나열
//
//  ⚠ 미르는 **순서를 정하는 것이 아니라 제동을 건다.** 검수사 확정 —
//    *«검수사가 카메라 역활을 하고 판단을 할것입니다»* · *«미르는 제동을 걸어야 합니다»*
//    그래서 «다음은 뭐냐»가 아니라 **«그거 해도 되냐»**에 답한다.
//
//  양하 순서 (검수사 확정 2026-08-11) — **데크 양하 → 커버 오픈 → 홀드 양하.**
//    커버 위에 실린 것을 내려야 커버가 열리고, 커버를 열어야 홀드에 손이 닿는다.
// ─────────────────────────────────────────────────────────────────────────────
const RE_ASK_OPEN  = /(커버|해치).{0,8}(열|오픈|open)/i;
const RE_ASK_HOLD  = /홀드.{0,10}(들어가|해도|가도|시작|작업)/;
const RE_ASK_ORDER = /((데크|갑판|홀드).{0,6}(부터|먼저))|어디부터|뭐부터|무엇부터|순서/;
const RE_ASK_COVER_N = /(커버|해치).{0,6}(몇\s*장|장\s*수|장수)/;
const isDeck = (c) => parseInt(c?.tier, 10) >= 80;
const bayNumIn = (t) => { const m = String(t||'').match(/(\d{1,2})\s*(?:번)?\s*(?:베이)?/); return m ? m[1] : ''; };

/** 그 해치 그룹의 양하 잔여를 센다 — 데크·홀드 따로. */
function groupLeft(all, center, pairs) {
  let deck = 0, hold = 0; const deckSpots = [];
  for (const c of all || []) {
    if (c._mode && c._mode !== 'discharge') continue;
    if (c._comp) continue;                       // 양하확인 찍은 자리는 비어 있는 것으로 본다
    if (!c.bay) continue;
    if (bayGroupCenter(c.bay, pairs) !== center) continue;
    if (isDeck(c)) { deck++; if (deckSpots.length < 6) deckSpots.push(`${c.l4 || String(c.cn).slice(-4)} @ ${posOf(c)}`); }
    else hold++;
  }
  return { deck, hold, deckSpots };
}
/** 배 전체를 해치 그룹으로 묶는다. */
function allGroups(all, pairs) {
  const seen = new Set();
  for (const c of all || []) {
    if (c._mode && c._mode !== 'discharge') continue;
    if (!c.bay) continue;
    const g = bayGroupCenter(c.bay, pairs);
    if (g != null) seen.add(g);
  }
  return [...seen].sort((a, b) => a - b);
}

/** 단계·제동 — 답할 수 있으면 문장, 아니면 null. */
function mirStage(text, ctx) {
  const all = (ctx && ctx.containers) || [];
  if (!all.length) return null;
  //  ⛔ 단계는 **한 배 안에서만** 뜻이 있다. 통합검색은 여러 배가 섞이므로 여기서 답하지 않는다.
  //    (그 화면은 `info` 를 안 넘긴다 — 그것이 게이트다.)
  if (!ctx || !ctx.info) return null;
  const pairs = (ctx && ctx.bayPairs) || {};
  const hatchDone = (ctx && ctx.info && ctx.info.hatchDone) || {};

  //  ── 커버 장수 ──  베이사전이 안다. 모르면 «모른다»고 한다(지어내지 않는다).
  //  ⚠ **커버는 베이 하나가 아니라 해치 그룹 것이다.** 실측(NSFR) — 커버는 **홀수 베이에 붙는다**:
  //    11번 1장 · 13번 1장 · 12번(40ft 자리) 0장. 그래서 「12번 커버 몇장」의 답은 **2장**이다.
  //    베이 하나만 세면 «0장»이라는 거짓말이 나온다(첫 판이 그랬다).
  if (RE_ASK_COVER_N.test(text)) {
    const bn = bayNumIn(text);
    const bays = ((ctx && ctx.shipLib && (ctx.shipLib.baysSummary || ctx.shipLib.bays)) || []);
    if (!bays.length) return '이 배는 베이사전(매트릭스)이 없어 커버 장수를 모릅니다 — 수석 대시보드에서 만들어야 합니다.';
    if (!bn) {
      const n = bays.reduce((s, b) => s + (Number(b.hatchCount) || 0), 0);
      return `이 배 커버는 모두 ${n}장입니다.`;
    }
    const center = bayGroupCenter(bn, pairs);
    const rows = bays.filter((b) => bayGroupCenter(b.bayNo, pairs) === center);
    if (!rows.length) return `베이 ${bn} 은 베이사전에 없습니다.`;
    const n = rows.reduce((s, b) => s + (Number(b.hatchCount) || 0), 0);
    const names = rows.map((b) => String(b.bayNo).replace(/^0/, '')).join('·');
    return `${center}번 해치(베이 ${names}) 커버 ${n}장입니다.`;
  }

  //  ── 순서를 물었다 ──
  if (RE_ASK_ORDER.test(text) && !/\d{4}/.test(text)) {
    const gs = allGroups(all, pairs);
    const notReady = gs.filter((g) => groupLeft(all, g, pairs).deck > 0);
    let s = '양하는 **데크 먼저**입니다 — 커버 위에 실린 것을 내려야 커버가 열리고, 커버를 열어야 홀드에 손이 닿습니다.\n'
          + '데크 양하 → 커버 오픈 → 홀드 양하 순서입니다.';
    if (notReady.length) s += `\n\n지금 데크가 남은 그룹: ${notReady.map((g) => `${g}번`).join(' · ')}`;
    else if (gs.length) s += '\n\n데크는 다 내렸습니다 — 커버를 열고 홀드로 가시면 됩니다.';
    return s;
  }

  //  ── 커버 열어도 되나 / 홀드 들어가도 되나 ──  **제동이 목적이다.**
  const askOpen = RE_ASK_OPEN.test(text), askHold = RE_ASK_HOLD.test(text);
  if (!askOpen && !askHold) return null;
  const bn = bayNumIn(text);
  const gs = allGroups(all, pairs);
  const targets = bn ? [bayGroupCenter(bn, pairs)].filter((g) => gs.includes(g)) : gs;
  if (!targets.length) return bn ? `베이 ${bn} 은 이 배 양하 목록에 없습니다.` : null;

  //  ⚠ 베이를 안 댔으면 **요약만** 한다 — 그룹 일곱을 자리까지 읽으면 음성으로는 못 듣는다.
  //    현장에서 미르는 귀로 듣는 물건이다(검수사 «시리나 알렉사처럼 부르면 나오는»).
  const brief = !bn && targets.length > 1;
  if (brief) {
    const ready = [], notReady = [];
    for (const g of targets) {
      const { deck } = groupLeft(all, g, pairs);
      (deck > 0 ? notReady : ready).push(deck > 0 ? `${g}번 데크 ${deck}대` : `${g}번`);
    }
    let s = '';
    if (ready.length) s += `커버 열어도 되는 곳 — ${ready.join(' · ')}\n`;
    if (notReady.length) s += `⛔ 아직인 곳 — ${notReady.join(' · ')}`;
    return (s.trim() || null) + '\n\n어느 베이인지 대 주시면 남은 자리를 짚어 드립니다.';
  }

  const lines = [];
  for (const g of targets) {
    const { deck, hold, deckSpots } = groupLeft(all, g, pairs);
    const opened = String(hatchDone[`discharge_${g}`] || '') === 'open';
    if (deck > 0) {
      lines.push(`⛔ ${g}번 — **데크가 ${deck}대 남았습니다.** 먼저 내려야 커버를 엽니다.`
        + (deckSpots.length ? `\n     ${deckSpots.join(' · ')}${deck > deckSpots.length ? ` 외 ${deck - deckSpots.length}대` : ''}` : ''));
    } else if (askHold && !opened) {
      lines.push(`${g}번 — 데크는 끝났습니다. **커버를 열고** 홀드 ${hold}대로 들어가시면 됩니다.`);
    } else if (askHold) {
      lines.push(`${g}번 — 커버 열림. 홀드 ${hold}대 진행하시면 됩니다.`);
    } else if (opened) {
      lines.push(`${g}번 — 이미 열려 있습니다 (홀드 ${hold}대 남음).`);
    } else {
      lines.push(`${g}번 — 데크 다 내렸습니다. **커버 열어도 됩니다.** (홀드 ${hold}대)`);
    }
  }
  return lines.join('\n');
}

/**
 * 미르의 눈 — 답할 수 있으면 문장, 못 보면 null(옛 미르로 넘긴다).
 * @param {string} q 검수원이 한 말
 * @param {{containers?:Array}} ctx 화면이 이미 손에 쥐고 있는 것
 */
export function mirSee(q, ctx) {
  const text = String(q || '').trim();
  if (text.length < 2) return null;
  //  ⛔ **개체 조회는 여기서 하지 않는다.** 앱이 이미 한다 —
  //    4자리를 치면 `BigResultCard` 가 **실번호를 거대하게** 그리고(파일 머리 «실번호 거대»),
  //    `announceContainer` 가 «일구일팔, 실번호 씨에프칠구오삼공이, 엑스레이» 로 **소리내어 읽는다.**
  //    온도·중량·규격도 카드에 다 있다.
  //  🔴 2026-08-25 사고 — 나는 «글로 나오는 답»만 재는 하네스로 미르를 시험하고 «못 한다»고 단정해
  //    2.47 에서 같은 기능을 다시 만들었다. 검수사 — *«미르는 4자리만 불러주면 실번호까지 알려줍니다.
  //    기존 기능입니다»* · *«음성으로 답해줍니다»*. 그 근거는 **인계함에 이미 적혀 있었고**
  //    (*«항차 화면에서 조회하면 다 보인다 … 검수사가 실제로 쓰는 경로는 그쪽이다»*) 나는 그날 그것을 읽었다.
  //    ⇒ 작업표준 §2-2-C 위반. **«없다»고 말하기 전에 찾아라 — 그리고 «화면으로 답하는 것»도 답이다.**
  //    검수사 확정 — *«있는걸 만드는건 중복입니다. 앱이 무거워 집니다. 없는걸 만들어야 합니다.»*
  return mirStage(text, ctx);
}
