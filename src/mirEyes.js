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
import { findTwinCandidate, getBayPairs } from './twin.js';
import { bayGroupCenter } from './swapGrade.js';
import { getEquipNumber, formatWt } from './utils.js';
import { TWIN_MAX_TOTAL_KG, twinDiffLimit } from './nlSearch.js';   // 트윈 무게 한계는 화면이 쓰는 그 상수를 그대로   // 호기는 앱이 쓰는 단일 소스(gm_equip_no)를 그대로 읽는다   // 베이 묶음도 화면이 쓰는 그 벌을 그대로 쓴다

const RE_ORDER_START = /(순서대로|차례대로|순서\s*대로).{0,10}(양하|선적|하자|해줘|시작|가자|불러)|(양하|선적)\s*(하자|시작하자|가자)|다음\s*(컨|것|거)?\s*(뭐|알려|불러|줘)?$|^다음$/;
const RE_NEXT = /^(다음|넥스트|next)\s*[.!?]?$|다음\s*(컨|것|거|번)/;

// ─────────────────────────────────────────────────────────────────────────────
//  ★ 2.51 — **미르가 «어느 베이냐»를 알아듣는다. 그리고 커버에 제동을 건다.**
//
//  🔴 2.50 을 실선에서 눌러 보고 알았다. 미르는 「순서대로 양하하자」에 배 **전체 1등**을 불렀다 —
//    NSFR 2616N 에서 «1676 · 12-05-88». 그런데 그날 12베이는 **3호기(GC103)** 것이었다.
//    화면 머리에 「4호기」를 달고 선 검수사에게 12베이를 부르는 것은 **틀린 답**이다.
//
//  ★ 근거는 그날 실작업 자료다(검수사가 올린 검수 입력 시트 140행, 시각 포함).
//    갱이 둘이고 **베이가 갈려 있었다** —
//      GC104 → 24묶음(23·24·25) 67대 … 끝나고 12묶음으로 넘어와 도움
//      GC103 → 12묶음(11·12·13) + 01베이
//    앱의 «베이 묶음»(bayGroupCenter)이 현장 배정과 **정확히 같은 단위**로 움직였다.
//
//  ★★ 그리고 큐를 그 묶음으로 좁히면 앱이 실제와 맞는다. 실측 대조 —
//      24묶음 데크 : 앱 04-86 02-86 01-86 10-84 08-84 06-84
//                    실제 04-86 02-86 01-86 10-84 08-84 06-84   ← 앞 6개 전부 일치
//      24묶음 홀드 : 앱 08-08 06-08 05-08 07-08 06-06 02-06
//                    실제 08-08 06-08 05-08 07-08 06-06 02-06   ← 앞 6개 전부 일치
//    배 전체를 넣으면 12베이가 나와 하나도 안 맞고, 묶음으로 좁히면 그대로 맞는다.
//    ⇒ **미르에게 모자랐던 것은 순서가 아니라 «어느 베이냐»였다.**
//
//  ⛔ 순서 규칙은 손대지 않는다. 검수사 확정 — *«우현이면 3315 가 먼저 입니다 앱이 틀린게 아닙니다»*.
//    (그날 실제로는 8610(04-86)부터 내렸다. 크레인 재량으로 갈리는 것이고, 어긋나면 앱이
//     이미 스스로 재앵커한다(V8.50④). 앱이 내는 표준 순서는 검수사가 «틀린 게 아니다»라고 확인했다.)
//
//  ★ 커버 — 검수사가 그린 대화 그대로다.
//    *«10번 홀드 작업 할꺼야 하면 미르가 커버는 열렸나요? 응 그럼 시작할게요»*
//    그리고 물리 사실 — *«화물이 있는 상태에서 커버를 연다고 열리면 안되니까요»*(2026-08-05).
//    ⇒ 홀드를 부르면 미르가 **먼저 커버를 본다.** 데크에 화물이 남아 있으면 그 커버는 안 열린다고
//      말하고, 열림 기록이 없으면 열렸는지 묻는다. **막지는 않는다** — 판단은 검수사가 한다.
//      검수사 확정 — *«검수사가 카메라 역활을 하고 판단을 할것입니다»* · 미르는 제동을 건다.
//  ⚠ 커버 «완료 배너»는 건드리지 않는다 — 데크가 끝났을 때 묻고 읽는 것은 GuidedWorkPanel 이 이미 한다.
//    여기는 그 반대편, **검수사가 먼저 홀드를 꺼냈을 때**다.
// ─────────────────────────────────────────────────────────────────────────────

//  베이 지정 — 「24번 베이」 「24베이」 「베이 24」 「10번 홀드」 「12 데크」
//  ⚠ 반드시 «베이/홀드/데크» 라는 말이 붙어야 잡는다. 숫자만으로는 절대 잡지 않는다 —
//    컨번호 끝4자리(「1918 어디야」)를 삼킨 사고가 이 파일에서 이미 한 번 났다.
const RE_BAY_A = /(?:^|[^0-9])(\d{1,2})\s*번?\s*(?:베이|홀드|데크|해치)/;
const RE_BAY_B = /(?:베이|홀드|데크|해치)\s*(\d{1,2})(?![0-9])/;
const RE_HOLD  = /홀드|hold|선창|창내/i;
const RE_DECK  = /데크|deck|갑판/i;
//  작업 의사 — 이게 없으면 조회다(옛 미르 몫).
const RE_DO    = /양하|선적|작업|하자|할\s*[거꺼께게]|시작|가자|불러|해줘|간다|갈게|하겠/;
//  조회어가 하나라도 있으면 순서가 아니다 — 「24번 베이 몇 대야」는 옛 미르가 답한다.
const RE_ASK   = /몇\s*대|몇대|갯수|개수|얼마나|남았|합계|리스트|목록|현황|통계|어디|누구|언제|온도|씰|실번호|중량|무게|알려만|보여/;

/** 질문에서 베이 묶음과 단(홀드/데크)을 읽어 낸다. 못 읽으면 null. */
function readBayWish(text) {
  if (RE_ASK.test(text)) return null;
  const m = RE_BAY_A.exec(text) || RE_BAY_B.exec(text);
  if (!m) return null;
  const bay = parseInt(m[1], 10);
  if (!Number.isFinite(bay) || bay < 1 || bay > 99) return null;
  const hold = RE_HOLD.test(text), deck = RE_DECK.test(text);
  if (!RE_DO.test(text) && !hold && !deck) return null;   // 「24번 베이」만 덜렁 = 아직 조회
  return { bay, tier: hold ? 'hold' : deck ? 'deck' : null };
}

const posOf = (c) => (c?.bay && c?.row && c?.tier) ? `${c.bay}-${c.row}-${c.tier}` : '';
const l4 = (c) => c?.l4 || String(c?.cn || '').slice(-4);
const feetOf = (iso) => { const h = String(iso || '')[0]; return h === '2' ? '20피트' : (h === '4' || h === 'L' || h === '9') ? '40피트' : ''; };

// ─────────────────────────────────────────────────────────────────────────────
//  ★ 2.52-02 — **미르가 못 드는 트윈을 «두 대 한 번에» 라고 부르고 있었다.**
//
//  NSFR 24묶음을 17대까지 실제로 내리다가 18번째에서 나왔다 —
//    앞 TEMU0105882 (23-05-82) · 뒤 TLLU3027470 (25-05-82) · 20피트 두 대
//  화면은 붉게 막았다: **«🚫 합계 55.1t (55톤 초과) — 트윈 불가, 싱글 작업 검토»**
//  그런데 **미르는 «트윈입니다. 두 대 한 번에» 라고 말한다.** 검수사가 그 말을 믿고 트윈으로 걸면 사고다.
//
//  ★ 그날 실작업이 앱 편이다 — 시트에서 25-05-82 와 23-05-82 는 **따로, 다른 시각에** 내려갔다.
//    (GC104: …25베이 05-82 … 23베이 05-82) 트윈으로 묶이지 않았다.
//
//  ⛔ 판정을 새로 만들지 않는다. `nlSearch` 의 검증된 상수(`TWIN_MAX_TOTAL_KG` 55톤 ·
//    `twinDiffLimit` 부두별 무게차 한계)를 **화면과 같은 벌로** 쓴다.
//    (`GuidedWorkPanel.twinWtWarn` 이 쓰는 바로 그것.)
// ─────────────────────────────────────────────────────────────────────────────

/** 카드 한 장을 말로 — 트윈이면 두 대를 함께 부른다. */
function twinWarn(card, pier) {
  if (!card || !card.twin) return '';
  const wa = parseInt(card.main.wt, 10) || 0, wb = parseInt(card.twin.wt, 10) || 0;
  if (!wa || !wb) return '\n  ⚠ 무게가 없는 컨이 있습니다 — 트윈 하중을 못 잽니다. 눈으로 확인하십시오.';
  const total = wa + wb, diff = Math.abs(wa - wb);
  if (total > TWIN_MAX_TOTAL_KG) {
    return `\n  ⛔ **트윈 불가** — 합계 ${formatWt(total)} (55톤 초과). **싱글로 한 대씩** 내리십시오.`;
  }
  const limit = twinDiffLimit(pier);
  if (diff > limit) return `\n  ⚠ 무게차 ${formatWt(diff)} (${pier || '부두 미상'} 한계 ${formatWt(limit)}) — 수평이 안 맞습니다.`;
  return '';
}

function sayCard(card, n, pier) {
  if (!card) return null;
  const c = card.main, t = card.twin;
  const head = n ? `${n}번째` : '지금 차례';
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
  if (t) {
    const w = twinWarn(card, pier);
    //  못 드는 트윈이면 «두 대 한 번에» 라고 말하지 않는다 — 그 말이 곧 오작업 지시가 된다.
    const head2 = w.includes('트윈 불가') ? `${head} — **트윈 자리지만 한 번에 못 듭니다.**` : `${head} — **트윈입니다. 두 대 한 번에.**`;
    return `${head2}\n  앞 ${one(c)}\n  뒤 ${one(t)}${w}`;
  }
  return `${head} — ${one(c)}${card.fr ? '\n  ⚠ FR(플랫랙)입니다 — 치수·고정 확인' : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ★ 2.52 — **«다음»이 내 베이를 이어간다.** (2.51 을 실선에서 눌러 보고 바로 드러난 구멍)
//
//  2.51 로 «24번 베이 양하하자» 는 됐다. 그런데 한 대 처리하고 «다음» 하면 베이 지정이 사라져
//  **배 전체 1등(12베이)으로 튄다.** 4호기 검수사가 24베이를 내리는 중에 12베이를 부르는 것이라
//  2.51 이 고친 그 사고가 두 번째 발화에서 그대로 되살아난다.
//
//  ⛔ 상태를 들고 있지 않는다. 모듈 변수에 «마지막 베이»를 기억시키면 배를 바꿔도 남고,
//    창을 새로 열면 사라지고, 두 갱이 같은 폰을 쓰면 섞인다. **데이터로 안다** —
//    내 갱이 마지막에 완료한 컨이 어느 묶음인지 보면 지금 어디를 하고 있는지 알 수 있다.
//    (`GuidedWorkPanel.priorEquipOf` 도 완료 기록의 `equip` 으로 같은 판단을 한다.)
//
//  ★ 갱을 가린다. 실측 — 그날 NSFR 은 GC104 가 23·24·25 를, GC103 이 11·12·13+01 을 **동시에** 했다.
//    시간순으로 두 갱 기록이 섞이므로, 갱을 안 보고 «마지막 완료»만 따라가면 남의 베이로 넘어간다.
//    ⚠ `completed.equip` 은 선택 필드라 빈 기록이 있다 — 내 갱 기록이 하나도 없으면 갱을 안 가린다
//      (혼자 작업하는 배·옛 기록에서 이어가기가 죽지 않게).
// ─────────────────────────────────────────────────────────────────────────────
export function mirSee(q, ctx) {
  const text = String(q || '').trim();
  if (text.length < 2) return null;
  //  ⛔ 개체 조회(끝4자리 → 실번호·온도·중량)는 앱이 이미 한다 — 카드가 그리고 음성이 읽는다.
  //    ⛔ 커버 단계도 자동 가이드가 이미 배너로 묻고 읽는다.
  //    여기서 하는 것은 **검수원이 먼저 말을 걸었을 때** 순서를 불러 주는 것 하나다.
  const wish = readBayWish(text);                     // 2.51: 「24번 베이 양하하자」 「10번 홀드 작업할거야」
  if (!wish && !RE_ORDER_START.test(text) && !RE_NEXT.test(text)) return null;

  const all = (ctx && ctx.containers) || [];
  if (!all.length) return null;
  const info = (ctx && ctx.info) || null;
  if (!info) return null;                       // 통합검색(배 여럿)에서는 «순서»가 뜻이 없다

  const mode = (ctx && ctx.mode) === 'loading' ? 'loading' : 'discharge';
  //  ★ 2.52-01 — 완료를 어디서 읽는지가 화면마다 다르다.
  //    · SearchPanel 의 `allContainers` 는 컨마다 `_comp` 가 붙어 온다.
  //    · VoyagePage 의 `containers` 에는 **없고** 별도 `compMap` 이 따로 다닌다(GuidedWorkPanel 도 둘을 따로 받는다).
  //    한쪽만 보고 있었더니 한 대를 내린 직후에도 «남은 140대 (완료 0대)» 라고 답했다 — 시뮬은 `_comp` 를
  //    직접 심어 통과했고 **실선에서만 드러났다.** 둘 다 본다.
  const cmap = (ctx && ctx.compMap) || null;
  const compOf = (c) => (c ? (c._comp || (cmap ? cmap[c.cn] : null) || null) : null);
  //  아직 안 한 평택분만이 대상이다 — 화면(`remaining`)과 같은 기준.
  const remaining = all.filter((c) => c && c._ptk !== false && !compOf(c) && (c._mode || mode) === mode);
  if (!remaining.length) return `${mode === 'loading' ? '선적은' : '양하는'} 남은 것이 없습니다.`;

  const side = String(info.berthSide || '').trim();
  if (!side) return '접안 방향이 아직 안 정해져 있습니다.\n자동 가이드를 켜면 좌현·우현을 묻습니다 — 그것부터 정해야 순서가 나옵니다.';

  //  2.51: 베이를 댔으면 그 **묶음**으로 좁힌다 — 갱마다 베이가 갈리고, 좁혀야 실작업과 맞는다.
  //  ⚠ 짝 사전이 안 넘어오면 **직접 만든다.** 23↔25·11↔13 을 모르면 25번을 독립 묶음으로 세어
  //    검수사가 «25베이» 라고 불렀을 때 남의 순서를 부른다. 양 끝만 만들고 가운데를 비우는 병은
  //    이 저장소가 이미 여러 번 겪었다(X-RAY sealer · 수집기 atw).
  let pairs = (ctx && ctx.bayPairs) || null;
  if (!pairs || !Object.keys(pairs).length) {
    try { pairs = getBayPairs(all, info.imo || '', info.vsl || '') || {}; } catch (e) { pairs = {}; }
  }
  const centerOf = (b) => { try { return bayGroupCenter(b, pairs); } catch (e) { return null; } };
  let pool = remaining, center = null, head = '', goneHere = null;

  //  2.52: 베이를 안 댔으면 **내가 하던 베이를 이어간다.** 상태를 들지 않고 완료 기록으로 안다.
  if (!wish) {
    const doneAll = all.filter((c) => c && compOf(c) && (c._mode || mode) === mode).map((c) => ({ c, cp: compOf(c) }));
    if (doneAll.length) {
      let myEq = ''; try { myEq = String(getEquipNumber() || '').trim(); } catch (e) { myEq = ''; }
      const mine = myEq ? doneAll.filter((x) => String(x.cp.equip || '').trim() === myEq) : [];
      const base = mine.length ? mine : doneAll;   // 내 갱 기록이 없으면 갱을 안 가린다
      const last = base.reduce((a, b) => ((b.cp.at || 0) > (a.cp.at || 0) ? b : a)).c;
      const lc = centerOf(last.bay);
      if (lc != null) {
        const left = remaining.filter((c) => centerOf(c.bay) === lc);
        const bays = [...new Set(all.filter((c) => centerOf(c.bay) === lc).map((c) => String(c.bay)))].sort();
        const lbl = bays.length > 1 ? `${bays.join('·')}번 베이` : `${bays[0] || lc}번 베이`;
        if (left.length) {
          center = lc; pool = left;
          const dk = left.filter((c) => parseInt(c.tier, 10) >= 80).length;
          const st = (info.hatchDone || {})[`${mode}_${lc}`];
          //  번호는 **이 묶음 기준**이다 — 배 전체 통산으로 세면 남의 갱이 내린 것까지 번호에 들어가
          //  「4번째」가 이 베이의 2번째를 가리키게 된다(실측에서 바로 헷갈렸다).
          goneHere = doneAll.filter((x) => centerOf(x.c.bay) === lc).length;
          head = `${lbl} 이어서 — 이 베이 ${goneHere}대 완료 · 남은 ${left.length}대 (데크 ${dk} · 홀드 ${left.length - dk})`
            //  데크가 다 빠졌으면 그 다음은 커버다 — 배너는 자동 가이드 화면에만 뜬다.
            + (!dk && st !== 'open' ? `\n  ⚠ 데크는 비었습니다. 홀드로 들어가려면 **커버부터입니다** — 열렸나요?` : '');
        } else {
          head = `${lbl}는 끝났습니다 (${mode === 'loading' ? '선적' : '양하'} 남은 것 없음). 다음 베이로 갑니다.`;
        }
      }
    }
  }

  if (wish) {
    center = centerOf(String(wish.bay).padStart(2, '0'));
    if (center == null) return null;
    const inGroup = remaining.filter((c) => centerOf(c.bay) === center);
    const bays = [...new Set(remaining.concat(all).filter((c) => centerOf(c.bay) === center).map((c) => String(c.bay)))].sort();
    const lbl = bays.length > 1 ? `${bays.join('·')}번 베이` : `${wish.bay}번 베이`;
    const lblT = lbl + (wish.tier === 'hold' ? ' 홀드' : wish.tier === 'deck' ? ' 데크' : '');
    if (!inGroup.length) return `${lblT} — ${mode === 'loading' ? '선적' : '양하'}할 것이 남아 있지 않습니다.`;

    const deckLeft = inGroup.filter((c) => parseInt(c.tier, 10) >= 80).length;
    const holdLeft = inGroup.length - deckLeft;

    if (wish.tier === 'hold') {
      //  ⛔ 물리 제동 — 커버 위에 화물이 있으면 그 커버는 안 열린다(검수사 2026-08-05).
      if (deckLeft > 0) {
        return `${lbl} 홀드 — **아직 못 엽니다.**\n`
          + `  이 커버 위 데크에 ${deckLeft}대가 남아 있습니다. 화물이 얹힌 커버는 크레인이 못 듭니다.\n`
          + `  데크부터입니다 — «${wish.bay}번 베이 데크» 라고 하시면 순서를 부르겠습니다.`;
      }
      if (!holdLeft) return `${lbl} 홀드 — 남은 것이 없습니다.`;
      const st = (info.hatchDone || {})[`${mode}_${center}`];
      if (st !== 'open') head = `${lbl} 홀드 — 데크는 비었습니다. **커버는 열렸나요?** (앱에 열림 기록이 아직 없습니다)`;
      else head = `${lbl} 홀드 — 커버 열림 기록 있음. 시작합니다.`;
      pool = inGroup.filter((c) => parseInt(c.tier, 10) < 80);
    } else if (wish.tier === 'deck') {
      if (!deckLeft) return `${lbl} 데크 — 남은 것이 없습니다.${holdLeft ? `\n  홀드가 ${holdLeft}대 남았습니다 — 커버를 열면 «${wish.bay}번 베이 홀드» 입니다.` : ''}`;
      head = `${lbl} 데크 — 남은 ${deckLeft}대`;
      pool = inGroup.filter((c) => parseInt(c.tier, 10) >= 80);
    } else {
      head = `${lbl} — 남은 ${inGroup.length}대 (데크 ${deckLeft} · 홀드 ${holdLeft})`;
      pool = inGroup;
    }
  }

  let queue = [];
  try {
    queue = buildGuidedQueue({
      containers: pool, mode,
      evenRowsSeaSide: side === 'starboard',    // 우현 접안 = 짝수 로우가 해상쪽
      findTwin: (t, arr, used) => findTwinCandidate(t, arr, used, info.imo || '', info.vsl || ''),
      streamPref: null,
    }) || [];
  } catch (e) { return null; }
  if (!queue.length) return null;

  const done = all.filter((c) => c && compOf(c) && (c._mode || mode) === mode).length;
  const lines = [];
  if (head) lines.push(head);
  else {
    //  2.51: 베이를 안 댔으면 **어느 베이부터인지 반드시 말한다.** 갱마다 베이가 다르다 —
    //    「4호기」를 단 검수사에게 남의 베이를 부르면 그것이 틀린 답이다.
    const b0 = queue[0] && queue[0].main ? String(queue[0].main.bay) : '';
    lines.push(`${mode === 'loading' ? '선적' : '양하'} — 남은 ${remaining.length}대 (완료 ${done}대) · ${side === 'starboard' ? '우현' : '좌현'} 접안`
      + (b0 ? `\n  ${b0}번 베이부터입니다. 다른 베이면 «○번 베이 ${mode === 'loading' ? '선적' : '양하'}하자» 라고 하십시오.` : ''));
  }
  lines.push(sayCard(queue[0], wish ? null : (goneHere != null ? goneHere + 1 : done + 1), info.pier || ''));
  //  다음 둘까지만 미리 알려 준다 — 갑판에서는 귀로 듣는다. 길면 안 들린다.
  const nBase = wish ? 1 : (goneHere != null ? goneHere + 1 : done + 1);
  const peek = queue.slice(1, 3).map((c, i) => `  ${nBase + 1 + i}. ${l4(c.main)} ${posOf(c.main)}${c.twin ? ` + ${l4(c.twin)} (트윈)` : ''}`);
  if (peek.length) lines.push('다음 예정\n' + peek.join('\n'));
  return lines.filter(Boolean).join('\n');
}
