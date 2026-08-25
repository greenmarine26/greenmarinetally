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






// ─────────────────────────────────────────────────────────────────────────────
//  ★ 2.50 — **미르가 순서를 부른다.** 「미르야 순서대로 양하하자」 · 「다음」
//
//  🔴 먼저 걷어낸 것부터. 2.48 에서 나는 «미르가 커버 단계를 모른다»며 단계 판정을 새로 짰다. **중복이었다.**
//    `GuidedWorkPanel` 은 데크가 끝나면 이미 배너로 묻고 **소리 내어 읽는다** —
//      deckD      : «데크 양하 완료. 해치커버를 열까요, 다른 데크로 갈까요.»
//      holdL      : «홀드 선적 완료. 해치커버를 닫을까요, 다른 베이 홀드로 갈까요.»
//      holdCloseD : «홀드 작업 끝. 해치커버를 닫을까요.»
//    12초마다 다시 읽기까지 한다. 커버 위 통과화물이면 «치워야 열립니다(시프팅)»로 문구가 갈린다.
//    검수사 확정 — *«데크를 다하면 앱이 물어 볼것입니다 커버를 열까요 다른 베이로 갈까요»* · *«선적은 그 역순»*.
//    ⇒ 2.48 의 단계·제동을 **전부 삭제**한다. 내가 잰 것은 「검색창에 타이핑했을 때」뿐이었고
//      정작 **작업 화면에서는 미르가 이미 말하고 있었다.** 2.47(실번호)에 이어 **같은 실수를 두 번** 했다.
//
//  ★ 그래서 진짜 구멍은 하나로 좁혀졌다 — **화면이 이끄는 것은 되고, 사람이 이끄는 것은 안 된다.**
//    실측 — `nlSearch` 에 `buildGuidedQueue` **0건**, 「순서대로」·「양하하자」·「시작하자」 인텐트 **0건**.
//    자동 가이드 큐는 `GuidedWorkPanel` 만 쥐고 있어서, 검수원이 먼저 «미르야 순서대로 양하하자» 라고
//    말을 걸면 미르는 아무 말도 못 한다.
//    검수사 확정 — *«미르야 순서대로 양하하자 하면 순서대로 불러 줘야 하는것입니다»*
//
//  ⇒ 이 겹이 **같은 큐**(`buildGuidedQueue`)를 읽어 말로 낸다. 순서를 새로 만들지 않는다 —
//    화면과 미르가 다른 순서를 내면 그것이 가장 나쁘다(이 저장소가 여러 번 겪은 «두 벌» 병).
//  ⚠ 원본 `nlSearch.js`·`guidedQueue.js` 는 한 줄도 안 건드린다.
// ─────────────────────────────────────────────────────────────────────────────
import { buildGuidedQueue } from './guidedQueue.js';   // 순서는 화면이 쓰는 그 벌을 그대로 쓴다
import { findTwinCandidate } from './twin.js';

const RE_ORDER_START = /(순서대로|차례대로|순서\s*대로).{0,10}(양하|선적|하자|해줘|시작|가자|불러)|(양하|선적)\s*(하자|시작하자|가자)|다음\s*(컨|것|거)?\s*(뭐|알려|불러|줘)?$|^다음$/;
const RE_NEXT = /^(다음|넥스트|next)\s*[.!?]?$|다음\s*(컨|것|거|번)/;

const posOf = (c) => (c?.bay && c?.row && c?.tier) ? `${c.bay}-${c.row}-${c.tier}` : '';
const l4 = (c) => c?.l4 || String(c?.cn || '').slice(-4);
const feetOf = (iso) => { const h = String(iso || '')[0]; return h === '2' ? '20피트' : (h === '4' || h === 'L' || h === '9') ? '40피트' : ''; };

/** 카드 한 장을 말로 — 트윈이면 두 대를 함께 부른다. */
function sayCard(card, n) {
  if (!card) return null;
  const c = card.main, t = card.twin;
  const head = n ? `${n}번째` : '다음';
  const one = (x) => {
    const bits = [`${l4(x)} (${x.cn})`];
    const sl = String(x.sl || '').trim();
    bits.push(sl ? `실번호 ${sl}` : '실번호 없음');
    if (posOf(x)) bits.push(posOf(x));
    const ft = feetOf(x.iso); if (ft) bits.push(ft);
    if (x.rf && String(x.tmp ?? '').trim() !== '') bits.push(`리퍼 ${x.tmp}°C`);
    if (x._xray || x.isXray) bits.push('🔍 X-RAY');
    return bits.join(' · ');
  };
  if (t) return `${head} — **트윈입니다. 두 대 한 번에.**\n  앞 ${one(c)}\n  뒤 ${one(t)}`;
  return `${head} — ${one(c)}${card.fr ? '\n  ⚠ FR(플랫랙)입니다 — 치수·고정 확인' : ''}`;
}

export function mirSee(q, ctx) {
  const text = String(q || '').trim();
  if (text.length < 2) return null;
  //  ⛔ 개체 조회(끝4자리 → 실번호·온도·중량)는 앱이 이미 한다 — 카드가 그리고 음성이 읽는다.
  //    ⛔ 커버 단계도 자동 가이드가 이미 배너로 묻고 읽는다.
  //    여기서 하는 것은 **검수원이 먼저 말을 걸었을 때** 순서를 불러 주는 것 하나다.
  if (!RE_ORDER_START.test(text) && !RE_NEXT.test(text)) return null;

  const all = (ctx && ctx.containers) || [];
  if (!all.length) return null;
  const info = (ctx && ctx.info) || null;
  if (!info) return null;                       // 통합검색(배 여럿)에서는 «순서»가 뜻이 없다

  const mode = (ctx && ctx.mode) === 'loading' ? 'loading' : 'discharge';
  //  아직 안 한 평택분만이 대상이다 — 화면(`remaining`)과 같은 기준.
  const remaining = all.filter((c) => c && c._ptk !== false && !c._comp && (c._mode || mode) === mode);
  if (!remaining.length) return `${mode === 'loading' ? '선적' : '양하'}은 남은 것이 없습니다.`;

  const side = String(info.berthSide || '').trim();
  if (!side) return '접안 방향이 아직 안 정해져 있습니다.\n자동 가이드를 켜면 좌현·우현을 묻습니다 — 그것부터 정해야 순서가 나옵니다.';

  let queue = [];
  try {
    queue = buildGuidedQueue({
      containers: remaining, mode,
      evenRowsSeaSide: side === 'starboard',    // 우현 접안 = 짝수 로우가 해상쪽
      findTwin: (t, arr, used) => findTwinCandidate(t, arr, used, info.imo || '', info.vsl || ''),
      streamPref: null,
    }) || [];
  } catch (e) { return null; }
  if (!queue.length) return null;

  const done = all.filter((c) => c && c._comp && (c._mode || mode) === mode).length;
  const lines = [];
  lines.push(`${mode === 'loading' ? '선적' : '양하'} — 남은 ${remaining.length}대 (완료 ${done}대) · ${side === 'starboard' ? '우현' : '좌현'} 접안`);
  lines.push(sayCard(queue[0], done + 1));
  //  다음 둘까지만 미리 알려 준다 — 갑판에서는 귀로 듣는다. 길면 안 들린다.
  const peek = queue.slice(1, 3).map((c, i) => `  ${done + 2 + i}. ${l4(c.main)} ${posOf(c.main)}${c.twin ? ` + ${l4(c.twin)} (트윈)` : ''}`);
  if (peek.length) lines.push('다음 예정\n' + peek.join('\n'));
  return lines.filter(Boolean).join('\n');
}
