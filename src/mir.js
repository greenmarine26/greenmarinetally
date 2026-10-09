// 미르 한 파일 — 말귀(사전)·말투·재료·사실·눈·답 고르기·모델 문을 한 곳에 둔다 (검수앱·콘앱 공용 엔진)
//
// 검수사 2026-09-10 «미르를 하나로 만들고 싶습니다» · 2026-09-11 «미르 하나로 통합 했는데 답이 다르면 통합이 안되었다는 이야기»
// 종전 일곱 파일(mirLearn·mirChat·mirCtx·mirFacts·mirEyes·mirAnswer·mirModel)을 본문 그대로 절로 옮겼다 — 답은 한 글자도 바뀌지 않는다.
//   화면은 components/MirFab.jsx(떠 있는 미르), 콘앱 포장은 mirCore.entry.js, 파서는 nlSearch.js(앱 공용), 용어 자료는 data/mirKnowledge.js.
//
// 절 차례
//   1. [mirLearn] 사전 — 못 알아들은 말을 배우고 되쓴다
//   2. [mirChat] 말투 출구 · 잡담
//   3. [mirCtx] 재료 — 전 항차 펼치기 · 열린 항차 재료 · 질문 속 배
//   4. [mirFacts] 사실 창구 — 컨 속성 · 항차 사실
//   5. [mirEyes] 한 대를 보는 겹 — 순서 · 트윈 · 자리
//   6. [mirAnswer] 답 고르기 한 벌 — answerOneRaw
//   7. [mirModel] 모델 문 — 규칙이 약할 때만 askMir
//   8. [mirThread] 대화 — 답 뒤 한 마디 더 · 얼버무린 답만 확인 · 끝은 검수사가 (3.68)
//   9. [mirMood] 기분 — 얼굴이 보이는 감정 한 벌 (3.56)
//  10. [mirYard] 야드 상황 — 바빠?·왜 차 안 와?·작업 왜 느려? (3.69)
//
// ⚠ nlSearch.js 가 이 파일의 사전·잡담 함수를 부르고 이 파일도 nlSearch.js 를 부른다(서로 부름).
//   그래서 이 파일 맨 바깥(함수 밖)에서는 nlSearch 에서 가져온 것을 **쓰지 않는다** — 함수 안에서만 쓴다. 연막 smoke_mirfile 이 지킨다.
// ⚠ 순수 함수만 — firebase SDK 를 직접 부르지 않는다(콘앱 번들 mir-core.js 에도 실린다). 보관소는 REST(fetch)와 window 손으로만.

import { deckCoordMap } from './rzorPlan.js';   // 4.04-02: 덱플랜 좌표 «덱_줄_칸» (rzorPlan 은 import 가 없다 — 콘앱 번들에 가볍게 실린다)
import {
  _storage, SK, isPyeongtaekPort, isPtk, sideCancelled, isWorkingNow, pickCarrierOp, pickDischargePol, EDI_PROTECTED_KEYS, isoToLabel, effectivePos, reeferTempOf, reeferTempExempt, applySpecialMarks, isReeferCheckSkipped,
  berthSideOf, overDims, getEquipNumber, formatWt, runDeviceCmd, resolveShipKey, shiftingMapForDisplay, shiftEvidenceOf, dropFilledBookingSlots, legendItemsOf,
  resolveCrewSides, getPierFromBerth, voyagePlanMs, voyagePlanEndMs, _dtMs,   // 3.56 [mirMood] · 4.06 재감사: _dtMs = isWorkingNow 와 같은 workEndAt 읽기
  isReeferContainer, isReeferIso, isFullReefer,   // 3.60-10: 리퍼 판정 한 벌 · 4.15: «리퍼 몇 대» = 풀 리퍼 한 벌
  ownDirCns, isListOriginRecord, shiftCnSetOf,   // 3.60-18: 미르 잔여 분모 = 리스트 + 시프팅(progressOf·홈 카드와 같은 집합)
  EDI_EMPTY_FILL_KEYS, ediCoreEmpty, isoPickOog,   // 3.60-13: EDI 칸이 비었을 때만 리스트가 채운다(수정안 A) · 4.15: 고른 규격이면 규격초과 표식도
  currentShift, shiftGangKey,   // 4.01: 예상 작업 시간 — 갱 수는 조마다(info.gangsShift) 읽는다
  plausibleListWtKg, ediWtField,   // 4.08-02: 컨 하나 40톤 초과는 무게 없음 · EDI 총중량 wtEdi (병합 경로 한 벌)
  dateWordOf,   // 4.12-02: 날짜 말(어제·내일·낼모레…) 해석 한 벌
} from './utils.js';
import {
  TWIN_MAX_TOTAL_KG, TWIN_CAUTION_TOTAL_KG, twinWtOf, twinDiffLimit, buildTwinPairs, analyzeTwinPairs, parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing, generateIntroAnswer,
  generateTimeAnswer, generateWakeAnswer, generatePilotAnswer, generateTwinCheckAnswer, generateHandover, generateFoodAnswer, answerAboutAlert,
  generateHowToAnswer, formatAppTallyAnswer, needsModeChoice, generateContactAnswer,
  answerCraneCrew, crewSetText, answerHowCore, generateSealAuditAnswer, formatCarriers, describeQuery, hasAnyCondition, voyageDoneAts,
  voyageReportSpan, WORK_SHIFTS, workMinutesBetween,   // 3.56 [mirMood] 식사 창은 근무표 그대로 · 3.69-01 완료 공백은 실작업 분으로 잰다
  isPastEatOnly, isPastMealMention, isOtherMeaningEat,   // 3.61-04 끼니 말의 «때» 판정 한 벌 — 상수를 가져오면 순환 초기화로 죽는다(함수만 부른다)
  termProgressOf, termDoneAts,   // 3.74: 터미널 본선현황으로 센다
} from './nlSearch.js';
import { shipOpMapper } from './data/tallyFormats.js';
import {
  answerHatchStatus, answerFeedback, answerCollector, answerTallyPending, answerArchiveStats, answerOverlaps, answerDataArrival, answerGangSplit,
  answerTotalMoves, answerFirstStart, answerXrayShifts, answerShiftBriefing, isDataArrivalQuery, answerPlanOutlook, answerPlanOutlookBoth,
  isPlanOutlookQuery, outlookModeOf, answerShipSpeed, isSpeedQuery, answerShipOverview, buildGangShift, gangBriefLines, answerGangShift,
} from './chiefAnswers.js';
import { buildGuidedQueue } from './guidedQueue.js';
import { workOrderOf, workOrderText } from './workOrder.js';   // 4.09: 양하 순서 조건 한 벌 — 자동 가이드 화면과 같은 읽기
import { findTwinCandidate, getBayPairs } from './twin.js';
import { bayGroupCenter } from './swapGrade.js';
import { mirKnowledge, mirKnowledgeMulti } from './data/mirKnowledge.js';
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';
import { judgeMode, buildReadiness, describeReadiness } from './dataReadiness.js';
import { matchPortMisById, shipIdentityLite } from './portMisCore.js';   // 3.60-18: PORT-MIS 매칭 본체(베이사전 없이) — 콘앱 미르용 기본 매처
export { progressOf } from './utils.js';   // 3.60-18: 연막검사(smoke_voycounts)가 «미르 분모 = 홈 카드 분모» 를 같은 번들에서 대조한다
import { diffEdiList, explainEdiGap } from './ediGap.js';
//  가져오는 것에 붙어 있던 말(종전 파일의 import 줄 주석)
//    · mirEyes ← guidedQueue: 순서는 화면이 쓰는 그 벌을 그대로 쓴다
//    · mirEyes ← nlSearch: 트윈 무게 한계는 화면이 쓰는 그 상수를 그대로   // 호기는 앱이 쓰는 단일 소스(gm_equip_no)를 그대로 읽는다   // 베이 묶음도 화면이 쓰는 그 벌을 그대로 쓴다
//    · mirAnswer ← mirLearn: 3.42: 뜻 답이 사전에서 왔는지(약한 답 판정)


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirLearn] 사전 — 못 알아들은 말을 배우고 되쓴다   (종전 src/mirLearn.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르 자체 학습 — 못 알아들은 말을 «이어진 말»에서 배우고(즉석), 배운 사전(mir_lexicon)으로 되써서 다시 읽는다 (TallyOne 3.0, TASK-2026-012)
//
// 검수사 확정 2026-09-02
//   *«미르… 인공지능은 아닌데 인공지능에 가깝게 만들 수 있나요?»* · *«비용은 인공지능을 사용할 때 들어갑니다.»*(API 안 씀)
//   *«자체 학습 기능이죠»* · *«한번 답 못한 걸 다음에는 반복 안 하게»*
//   *«가르치기도 자동으로 되나요? 하루를 결산해서 미르가 답 못한 걸 모아서 클로드가 알려주는 것입니다.»*
//
// 실측(RTDB activity_log 8월, 검수사·검수원 110문)
//   08-29 20:45 «MCSC 카고플랜» 못 알아들음 → 61초 뒤 «MCSC 양하 카고플랜» 답함 — 세 번 반복, 21:39 또 실패.
//   08-14 06:00 «실번호?» 못 알아들음 → 22초 뒤 «브리핑» — 관계없는 말(겹치는 낱말 0) → 배우면 안 된다.
//
// 세 층
//   ① 즉석  못 알아들은 말을 3분 기억 → 같은 폰에서 이어진 말이 답을 얻고 **낱말이 절반 이상 겹치면** «앞말 = 뒷말» 별칭을 배운다.
//   ② 결산  못 알아들은 말은 mir_misses/{날짜} 에 쌓이고(App.jsx 가 'gm-mir-miss' 이벤트를 받아 씀), 매일 클로드가 열어
//           별칭·뜻풀이를 mir_lexicon 에 써 준다(예약 작업). 새 인텐트가 필요한 것은 인계함으로.
//   ③ 되쓰기 parseNaturalQuery 가 **못 알아듣는 말일 때만** 사전을 보고 되써서 한 번 더 읽는다 — 알아듣는 말은 안 건드린다.
//
// 사전 mir_lexicon/{키} = { kind:'alias', from:원문, to:성공한 말(슬롯화), by, at, auto } | { kind:'def', term, def, by, at }
//   키 = 정규화(대문자·문장부호 제거·조사/청유 어미 제거·«보여줘» 류 제거·선박코드/컨번호/숫자 → {ship}/{cn}/{n}·띄어쓰기 제거)
//   ⇒ «MCSC 카고플랜» 을 배우면 «XTPG 카고 플랜 보여줘» 도 같은 키.
//
// ⚠ 이 파일은 순수 함수만 — Firebase 를 직접 부르지 않는다(nlSearch 는 콘앱 번들에도 들어간다).
//   쓰기는 window.__mirLexiconWrite (App.jsx 가 심음), 읽기는 window.__mirLexicon.
const PARTICLE = /(이야|인가요|인지|인가|입니까|이죠|하나요|할까요|할까|나요|에서|으로|이|가|은|는|을|를|의|에|로|도|요|야|죠|네|까)$/;
const STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요']);
const SLOT_RE = { ship: /^[A-Z]{4}$/, cn: /^[A-Z]{4}\d{7}$/, n: /^\d+$/ };

export function mirTokens(q) {
  //  ⚠ RTDB 키 금지 문자(. # $ / [ ])도 여기서 지운다 — 감사 지적: 폰 키와 저장 키가 다르면 배운 것이 다음 구독에 사라진다.
  return String(q || '').toUpperCase().replace(/[?？!.,~·…()\[\]"'«»#$/]/g, ' ').trim().split(/\s+/).filter(Boolean)
    .filter((t) => !STOP.has(t)).map((t) => (t.length > 1 ? (t.replace(PARTICLE, '') || t) : t));
}
export function mirSlot(t) {
  if (SLOT_RE.cn.test(t)) return '{cn}';
  if (SLOT_RE.ship.test(t)) return '{ship}';
  if (SLOT_RE.n.test(t)) return '{n}';
  return t;
}
/** 사전 키 — 슬롯은 경계로 남기고 나머지는 붙여 쓴다(«카고 플랜»=«카고플랜»). */
export function mirKey(q) {
  return mirTokens(q).map(mirSlot).map((t) => (t.startsWith('{') ? ' ' + t + ' ' : t)).join('').replace(/\s+/g, ' ').trim();
}
function _slotsOf(q) {
  return mirTokens(q).filter((t) => t !== mirSlot(t));
}
function _lex() {
  try { return (typeof window !== 'undefined' && window.__mirLexicon) || {}; } catch (e) { return {}; }
}
/** 배운 별칭이 있으면 되쓴 문장을 돌려준다(슬롯은 지금 말의 값으로 채움). 없으면 null. */
export function mirRewrite(q) {
  const k = mirKey(q);
  if (!k) return null;
  const e = _lex()[k];
  if (!e || e.kind !== 'alias' || !e.to) return null;
  const sl = _slotsOf(q);
  let i = 0;
  const out = String(e.to).replace(/\{(ship|cn|n)\}/g, () => sl[i++] || '');
  return out.trim() || null;
}
/** 배운 뜻풀이가 있으면 돌려준다(«천정 뭐야» → term 키로). */
export function mirLearnedDef(q) {
  const k = mirKey(String(q || '').replace(/(이|가)?\s*(뭐야|뭐예요|무엇|뜻|이란|란|무슨 말|뭔가요|뭐죠|뭔데)\s*[?？]*$/u, ''));
  if (!k) return null;
  const e = _lex()[k];
  return (e && e.kind === 'def' && e.def) ? String(e.def) : null;
}

// ── 즉석 학습 ──────────────────────────────────────────────────────────────
const WINDOW_MS = 3 * 60 * 1000;
let _pending = null;                   // { q, key, toks:Set, at }
let _lastMissAt = {};                  // 같은 말 10분 안 재기록 방지(이벤트)

/** 답을 내보낼 때 한 번 부른다. missed=못 알아들음. 배우면 안내 한 줄을 돌려준다(아니면 ''). */
export function mirObserve(q, missed, meta = {}) {
  const text = String(q || '').trim();
  if (text.length < 2) return '';
  const now = Date.now();
  const key = mirKey(text);
  if (missed) {
    if (!key) return '';
    //  3.60-18: recordOnly — 결산(mir_misses) 에만 남기고 즉석 학습 짝(_pending)은 안 건다(answerOneRaw null 출구용 — 모델 번역 경로가 같은 별칭을 두 번 적지 않게).
    if (!meta.recordOnly) _pending = { q: text, key, toks: new Set(mirTokens(text).filter((t) => t === mirSlot(t))), at: now };
    //  결산용 기록 — 같은 말은 10분에 한 번만
    if (!_lastMissAt[key] || now - _lastMissAt[key] > 10 * 60 * 1000) {
      _lastMissAt[key] = now;
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
          const { recordOnly: _ro, ...m2 } = meta || {};
          window.dispatchEvent(new CustomEvent('gm-mir-miss', { detail: { q: text, key, at: now, ...m2 } }));
        }
      } catch (e) { /* 이벤트 미지원 — 결산 기록만 빠진다, 즉석 학습은 그대로 */ }
    }
    return '';
  }
  //  ★ 3.7-06 — **잡담이 받은 말은 앞말의 «정답»이 아니다.**
  //    잡담을 «알아들었다»로 세면서(nlSearch 3.7-06) 학습 분기가 열렸다. 그대로 두면
  //    «밥은?»(못 알아들음) → «밥 먹었어»(잡담이 받음) 로 `밥` → «밥 먹었어» 가 사전에 굳는다(감사 실측).
  //    사전은 전역 노드라 한 폰의 오염이 전 기기로 퍼진다 — 검수사가 방금 걷어낸 것과 같은 종류다.
  //    ⇒ 짝을 짓지 않고 기다리던 말만 버린다.
  if (meta.smallTalk) { _pending = null; return ''; }
  //  알아들은 말 — 직전에 못 알아들은 말이 있으면 짝을 본다
  const p = _pending;
  if (!p || now - p.at > WINDOW_MS) { _pending = null; return ''; }
  _pending = null;
  if (key === p.key) return '';
  const toks = mirTokens(text).filter((t) => t === mirSlot(t));
  const overlap = toks.filter((t) => p.toks.has(t)).length;
  const need = Math.max(1, Math.ceil(p.toks.size * 0.5));
  if (overlap < need) return '';
  mirLearnAlias(p.q, text, meta.who || '');
  return `(«${p.q}»는 «${text}» 뜻으로 배웠어요 — 다음엔 바로 답할게요)`;
}
/** ★ 3.42 — 별칭 한 벌: «from(못 알아들은 말)» 을 «to(미르가 아는 말)» 로 사전에 적는다. 즉석 학습(위)과 모델 번역(mirModel)이 같은 모양으로 쓴다.
    이 폰 메모리(window.__mirLexicon)에 바로 넣고, 쓰기 손(window.__mirLexiconWrite — App 이 fbWriteMirLexicon 을 건다)이 있으면 보관소에도 적는다.
    돌려주는 값은 사전 키(없으면 null). */
export function mirLearnAlias(from, to, by = '', extra = {}) {
  const key = mirKey(from);
  if (!key || !to) return null;
  const now = Date.now();
  const entry = { kind: 'alias', from: String(from), to: mirTokens(to).map(mirSlot).join(' '), ok: String(to), by: by || '', at: now, auto: true, hits: 0, ...extra };
  try { if (typeof window !== 'undefined') { if (!window.__mirLexicon) window.__mirLexicon = {}; window.__mirLexicon[key] = entry; } } catch (e) { /* 창 없음(시험) */ }   // 제자리 갱신 — 구독이 오기 전에도 이 폰은 바로 안다
  try { if (typeof window !== 'undefined' && typeof window.__mirLexiconWrite === 'function') window.__mirLexiconWrite(key, entry); }
  catch (e) { console.warn('[미르 학습] 사전 쓰기 실패', e); }
  return key;
}
/** 시험용 — 기억 초기화 */
export function _mirReset() { _pending = null; _lastMissAt = {}; }


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirChat] 말투 출구 · 잡담   (종전 src/mirChat.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르 말투·잡담 — 답 데이터는 그대로, 종결어미만 부드러운 해요체로 + 검수사가 만들어 온 잡담 대본 (2.33)
//   검수사 확정 2026-08-24: «이제껏 미르의 대답은 너무 딱딱해» → 살짝 친근 · 화면·음성 동일
//   → 재확정: «반말은 막아 주세요. 전체 존칭어를 사용하게» — 하십시오체(딱딱)도 반말도 아닌 해요체.
//   대본 출처: 검수사 제공 Cozy-Ai-Friend 시안(반말 원본)을 해요체로 옮김. 호칭은 «성호 아저씨» 식(검수사 지시).
//   ⚠ 적용 위치는 «출구 한 겹»뿐 — 원본 답 문자열 100여 곳은 건드리지 않는다(외과 원칙).
// 종결어미 사전 — 하십시오체 → 해요체. 자주 나오는 것만, 애매하면 놔둔다(오변환 방지). 순서 중요.
const END = "(?=$|[\\s.!?,)\\]\u2026\u00bb\"'\\n])";
const RULES = [
  [new RegExp('입니다만' + END, 'g'), '인데요'],
  [new RegExp('있습니다' + END, 'g'), '있어요'],
  [new RegExp('없습니다' + END, 'g'), '없어요'],
  [new RegExp('했습니다' + END, 'g'), '했어요'],
  [new RegExp('됐습니다' + END, 'g'), '됐어요'],
  [new RegExp('왔습니다' + END, 'g'), '왔어요'],
  [new RegExp('갔습니다' + END, 'g'), '갔어요'],
  [new RegExp('줍니다' + END, 'g'), '줘요'],
  [new RegExp('됩니다' + END, 'g'), '돼요'],
  [new RegExp('옵니다' + END, 'g'), '와요'],
  [new RegExp('갑니다' + END, 'g'), '가요'],
  [new RegExp('합니다' + END, 'g'), '해요'],
  [new RegExp('모자랍니다' + END, 'g'), '모자라요'],
];
// 과거형 일반 규칙 — 종성 ㅆ + 습니다 → + 어요 («없앴습니다»→«없앴어요»)
const PAST = new RegExp('([\uac00-\ud7a3])습니다' + END, 'g');
// «X입니다» → 받침 있으면 «X이에요», 없으면 «X예요» (한글 아니면 «예요» — 353대예요·PTK예요)
const IPNIDA = new RegExp('(.)입니다' + END, 'g');
function _yo(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return ((c - 0xAC00) % 28) > 0 ? '이에요' : '예요';
  return '예요';
}

export function mirTone(s) {
  if (!s || typeof s !== 'string') return s;
  let t = s;
  for (const [re, to] of RULES) t = t.replace(re, to);
  t = t.replace(PAST, (m, ch) => (((ch.codePointAt(0) - 0xAC00) % 28) === 20 ? ch + '어요' : m));
  t = t.replace(IPNIDA, (m, ch) => ch + _yo(ch));
  return t;
}

// ── 호칭 — 로그인 이름에서 성을 떼고 «성호 아저씨»처럼(검수사 지시). 이름 없으면 «검수사님».
function mirCall(kind) {
  const full = (_storage.get(SK.activeInspector) || '').trim();
  if (!full) return '검수사님';
  const given = full.length >= 3 ? full.slice(-2) : full;
  //  ★ 3.69-05 — 꼬리도 **씨앗**으로 고른다. 종전엔 Math.random 이라 한 사람을 부를 때마다 «아저씨»·«형님» 이 오갔고,
  //    그 바람에 같은 질문의 답 길이가 흔들려 낭독이 처음부터 다시 읽혔다(2.65-02 가 막으려던 바로 그것 — 검수원을
  //    등록한 실앱 조건에서만 나서 여태 안 잡혔다. 기준본 3.69-04 에도 있던 병이다).
  //    한 사람에게는 늘 같은 호칭이라야 자연스럽기도 하다(검수사 지시 «성호 아저씨» 식).
  const pool = kind === 'comfort' ? ['형님', '아저씨'] : ['아저씨', '형님'];
  return given + ' ' + _seedPick(pool, full + (kind || ''));
}

// ── 미르 메뉴판 — 식사 인사 때 돌려 가며 답한다 (검수사 지시 2026-08-24 «열빙어 등 고양이가 먹을만한 것») ──
const MIR_MENU = [
  '전 간단하게 열빙어나 먹어야겠어요 🐟',
  '전 츄르 하나로 간단히 해결하려고요!',
  '전 참치캔 반 캔이면 충분해요 😺',
  '전 북어 트릿 몇 조각 먹으려고요. 오독오독 씹는 맛이 좋거든요',
  '전 삶은 닭가슴살 조금 먹을래요. 검수사님들처럼 단백질 보충!',
  '오늘은 특식으로 연어 한 점 먹는 날이에요! 😻',
  '전 멸치 몇 마리요 — 아까 야드 순찰하다가 얻어 뒀거든요 히히',
  '전 고등어 살 한 점이요. 항구 고양이의 낭만이죠 🚢',
];
const MIR_MENU_TAIL = [
  '먹고 나서 낮잠 10분이 국룰이에요.',
  '든든히 드셔야 오후 검수도 힘이 나요!',
  '드시고 오면 제가 자리 잘 지키고 있을게요.',
  '급하게 드시지 말고 천천히요!',
];
//  호칭 뒤 «은/는» — 호칭이 «검수사님»(받침 O) 과 «성일 아저씨»(받침 X) 로 갈린다.
const _eunNeun = (w) => { const t = String(w || '').trim(); const c = t.charCodeAt(t.length - 1); return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? '은' : '는'; };
// ── 지난 끼니를 묻는 말 — «점심 먹었어?» (검수사 정정 2026-09-04) ──
//   «순수하게 미르에게 묻는것입니다» · «먹었으면 먹었다고 하던지 먹을것이라든지 뭘 먹을 예정이라던지
//     … 반대로 해당 검수사에게 검수사님은 드셨습니까? 말고 되 물을수도 있고
//     먹었다 하면 뭘 드셨는지 맛있었는지 그런류의 답».
//   ⚠ 앞으로 드실 분께 하는 «식사 맛있게 하세요»(MIR_MENU)와 섞으면 딴소리가 된다 — 대본을 따로 둔다.
const MIR_ATE = [
  '저는 아까 츄르 한 줄 했어요 😺',
  '먹었죠! 참치캔 반 캔 비우고 반은 {다음}용으로 남겨 뒀어요 히히',
  '먹었어요 — 야드 순찰 나갔다가 얻어 둔 멸치 몇 마리요 🐟',
  '아직이요. 이따 열빙어 하나 뜯으려고 아껴 두는 중이에요 😼',
  '아직인데 조금 있다 삶은 닭가슴살 먹을 참이에요. 단백질 보충이죠!',
  '먹었어요! 오늘은 특식이라 연어 한 점 얻어먹었어요 😻',
];
const MIR_ATE_ASK = [
  '{은} {끼니}드셨어요? 드셨으면 뭐 드셨는지 궁금해요 — 맛있었어요?',
  '{은} {끼니}뭐 드셨어요? 맛있게 드셨어요?',
  '{은}요? {끼니}드셨으면 메뉴 좀 알려 주세요. 맛있었어요?',
  '도 {끼니}드셨죠? 뭐 드셨는지 여쭤봐도 돼요?',
];
// ── 미르 음료 메뉴 — 티타임용 (검수사 지시 2026-08-24 «난 커피 마실껀데 넌?») ──
const MIR_DRINK = [
  '전 우유 한 그릇 주문해 주세요! 🥛',
  '전 우유 한 잔 주세요. 미지근하게요!',
  '전 고양이용 캣밀크 한 잔이요 😺',
  '전 물 한 그릇이면 돼요 — 신선한 걸로요!',
  '전 츄르 라떼(라고 부르는 그냥 츄르) 한 잔이요 히히',
  '커피 향은 좋은데 고양이는 카페인 금지라… 전 우유로 할게요!',
];
const MIR_DRINK_TAIL = [
  '커피 드시면서 잠깐 쉬어 가요.',
  '티타임엔 역시 수다가 반이죠 😺',
  '따뜻할 때 드세요!',
  '쉬는 것도 검수의 일부예요.',
];
// ── 미르 플레이리스트 — 고양이 노래 10곡 (검수사 제공 목록 2026-08-24) ──
const MIR_SONGS = [
  '체리필터의 «낭만 고양이» — 좁은 도시를 벗어나 붉은 바다를 꿈꾸는 길고양이 노래예요. 사실상 제 주제가죠!',
  '선우정아의 «고양이»(Feat. 아이유) — 도도하면서 밀당에 능한 고양이 매력을 재즈로 풀어낸 곡이에요. 저랑 닮았대요 😼',
  '볼빨간사춘기의 «고양이» — 새침하게 굴지만 자꾸 생각나게 만드는 그 마음… 제가 좀 알죠',
  '뮤지컬 CATS의 «Memory» — 늙은 고양이 그리자벨라가 희망을 노래하는 명곡이에요. 들을 때마다 꼬리가 차분해져요',
  '자우림의 «고양이» — 묘하고 신비로운 눈빛과 몽환적인 밤 분위기의 곡이에요. 야간 작업 때 어울려요',
  '크라잉넛의 «고양이» — 에너지 넘치는 펑크 록! 거리를 누비는 길고양이의 자유분방함이에요',
  '스탠딩 에그의 «고양이» — 햇살 아래 나른하게 누운 고양이 같은 어쿠스틱 감성이에요. 낮잠 BGM으로 최고',
  'The Cure의 «The Lovecats» — 장난스러운 재즈 톤 포스트 펑크예요. 사뿐사뿐 걷는 기분이 나요',
  'Al Stewart의 «Year of the Cat» — 고양이의 해에서 모티브를 얻은 70년대 클래식 팝이에요. 낭만 그 자체',
  'Bent Fabric의 «Alley Cat» — 경쾌한 피아노 재즈 경음악이에요. 골목길 건너다니는 제 모습이 떠오르실걸요?',
];
function mirSong() {
  return '제가 좋아하는 노래요? ' + MIR_SONGS[Math.floor(Math.random() * MIR_SONGS.length)] + ' 🎵';
}

function mirTea(nim) {
  const m = MIR_DRINK[Math.floor(Math.random() * MIR_DRINK.length)];
  const t = MIR_DRINK_TAIL[Math.floor(Math.random() * MIR_DRINK_TAIL.length)];
  return nim + ', ' + m + ' ' + t;
}

function mirMeal(nim) {
  const m = MIR_MENU[Math.floor(Math.random() * MIR_MENU.length)];
  const t = MIR_MENU_TAIL[Math.floor(Math.random() * MIR_MENU_TAIL.length)];
  return nim + ', 식사 맛있게 하세요! ' + m + ' ' + t;
}

//  지난 끼니 — 제 끼니를 먼저 답하고 되묻는다(검수사 확정 2026-09-04).
let _ateAskedAt = 0;   // 끼니를 되물은 시각
let _ateAskedBy = '';  // 그때의 **검수원 원값** — 교대하면 창을 닫는다(3.69-05 감사 ⑦).
//    ⚠ 호칭(mirCall)을 적으면 안 된다 — 꼬리 «아저씨/형님» 을 Math.random 으로 고르므로 대조가 동전 던지기가 된다(재감사 실측 20/40). — «별로였어» 를 그 뒤 3분 안에만 밥 이야기로 받는다.
//  같은 말에는 같은 답 — 무작위로 고르면 항차 화면이 답을 다시 계산할 때마다 문장이 바뀌고,
//  낭독 키가 «질문 + 답 길이»(VoyagePage 2.65-02)라 **읽던 것을 처음부터 다시 읽는다**(감사 지적 2026-09-04).
//  호칭도 씨앗에 넣어 검수원이 바뀌면 답도 그 사람 것으로 새로 골라진다.
//  ★ 3.69-05 — 해시를 한 번 **섞는다**. h*31 누적은 하위 비트가 안 섞여서 «%4·%6» 이 한쪽으로 쏠린다 —
//    실측(메뉴 20개·4문장) 9/5/0/6 으로 **셋째 문장은 한 번도 안 나왔다**. 섞은 뒤 6/6/3/5.
//    호출부는 끼니 세 자리뿐이다(노래·티타임은 Math.random) — 파급은 끼니 답에만 미친다.
const _seedPick = (arr, seed) => {
  let h = 0; const t = String(seed || '');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return arr[Math.abs(h) % arr.length];
};
//  ★ 3.69-05 (검수사 2026-09-30 «매번 같은것만 먹고 점심보다 저녁에 먹을껄 대비하네요»):
//    ⓐ 씨앗에 **날짜**를 넣는다 — 종전엔 «질문+호칭»뿐이라 «아침 뭐 먹었어?»가 1년 내내 같은 답이었다(실측 10회 → 가짓수 1).
//       같은 날 같은 질문은 그대로 같은 답이다(낭독 키가 «질문+답 길이»라 답이 흔들리면 읽던 것을 처음부터 다시 읽는다 — 2.65-02).
//    ⓑ **끼니 이름을 읽는다** — «저녁 뭐 먹었어?»에 «반은 저녁용으로 남겨 뒀어요»가 나오던 자리. 다음 끼니가 없으면(저녁·야식)
//       그 대본을 후보에서 뺀다. 끼니를 안 밝힌 말(«밥 먹었어?»)은 지금 시각으로 다음 끼니를 정한다.
const _todaySeed = () => { const d = new Date(Date.now()); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const _MEAL_ALIAS = { 조식: '아침', 중식: '점심', 석식: '저녁', 밤참: '야식' };
/** 말 속의 끼니 이름 — 없으면 null. */
function _mealWord(q) {
  const m = String(q || '').match(/(아침|조식|점심|중식|저녁|석식|야식|밤참|새참)/);
  return m ? (_MEAL_ALIAS[m[1]] || m[1]) : null;
}
/** 그 끼니 다음에 오는 끼니 — 저녁·야식 뒤는 없다(null). 끼니를 안 밝혔으면 지금 시각으로 정한다. */
function _nextMeal(meal) {
  if (meal) return ({ 아침: '점심', 점심: '저녁', 새참: '저녁', 저녁: null, 야식: null })[meal] || null;
  const h = new Date(Date.now()).getHours();
  return h < 10 ? '점심' : (h < 16 ? '저녁' : null);
}
function mirAte(nim, q) {
  const meal = _mealWord(q);
  const next = _nextMeal(meal);
  //  다음 끼니가 없으면 «{다음}용으로 남겨 뒀어요» 는 쓸 수 없다 — 저녁을 묻는데 저녁용으로 남겼다는 말이 된다.
  const pool = next ? MIR_ATE : MIR_ATE.filter((x) => !x.includes('{다음}'));
  const seed = _todaySeed();
  const a = _seedPick(pool, q + nim + seed).replace('{다음}', next || '');
  const t = _seedPick(MIR_ATE_ASK, nim + q + seed).replace('{끼니}', meal ? meal + ' ' : '');
  //  ★ 3.69-05 감사 ④ — 화면이 답을 **다시 계산**할 때마다 창을 새로 찍으면 3분이 무한히 늘어난다(2.65-02 재계산 주석).
  //    이미 열려 있으면 그대로 둔다 — 창은 처음 되물은 때부터 3분이다.
  //    감사 ⑦ — 검수원이 바뀌면 앞사람에게 한 되묻기의 답으로 읽지 않게 창 임자도 같이 적는다.
  if (!_ateAskedAt || Date.now() - _ateAskedAt >= 3 * 60 * 1000) _ateAskedAt = Date.now();
  _ateAskedBy = (_storage.get(SK.activeInspector) || '').trim();
  return a + ' ' + nim + t.replace('{은}', _eunNeun(nim));
}
//  ★ 3.69-05 (검수사 «두번째 질문은 묻고 답을주니 그 다음은 반응을 못함»):
//    미르가 «메뉴 좀 알려 주세요» 하고 되물어 놓고 **메뉴를 들으면 무응답**이던 자리.
//    끼니 그물 세 꼴(_ATE_MEAL·_ATE_YOU·_ATE_BARE)이 전부 과거형(«먹었») 위에 서 있어 현재형 «난 아침에 스프 먹어.» 가 안 걸리고,
//    이어지는 말을 받는 자리는 «맛있었/맛없었/별로였어» 뿐이라 **메뉴 이름을 받는 자리가 아예 없었다**(실측 스프·김치찌개·토스트 전부 null).
/** 되물은 뒤 들은 말에서 메뉴만 뽑는다 — 못 뽑으면 null. */
function _menuHeard(q) {
  //  ⚠ 미르에게 **되묻는** 말은 메뉴 답이 아니다 — «너 밥 드셨어요» 가 메뉴 «너» 로 읽히던 자리(연막검사가 잡았다).
  //    높임말 «드셨/자셨» 도 제 끼니를 말하는 꼴이 아니라 묻는 꼴이다. 둘 다 아래 끼니 그물 몫이다.
  if (/(미르|^\s*넌|^\s*너[\s는가를]|\s너[\s는가를]|당신|자네)/.test(String(q || '')) || /(드셨|자셨|잡수)/.test(String(q || ''))) return null;
  //  4.00 — «저녁 먹었니»·«먹었냐»·«먹었나» 는 **묻는 꼴**이다. 되물은 뒤 3분 안에 오면 메뉴 «먹었니» 로 읽혀 «먹었니요? 든든하시겠어요» 로 새던 자리다
  //    (연막검사 smoke_plancmd 가 날짜 씨앗에 따라 하루걸러 실패 — 문장 넷 중 둘만 «드셨» 이 있다). 묻는 꼴은 아래 끼니 그물(mirAte) 몫이다.
  if (/(먹었니|먹었냐|먹었나|먹었는지|먹었을까)/.test(String(q || ''))) return null;
  let s = String(q || '').replace(/[.!?？~,·…"'«»]/g, ' ')
    .replace(/^\s*(난|나는|저는|제가|나|저|우리|저희|우리는|저희는)\s+/, '')
    .replace(/(아침|조식|점심|중식|저녁|석식|야식|밤참|새참)\s*(에는|에|엔|은|는|으로|로)?\s+/g, '')
    //  ⚠ «밥·식사·끼니» 는 **낱말 하나로 섰을 때만** 뗀다 — 붙여서 떼면 «국밥» 이 «국» 이 된다(감사 실측).
    .replace(/(^|\s)(밥|식사|끼니)\s*(은|는|을|를|이|가|도)?(?=\s|$)/g, ' ')
    .replace(/\s*(먹고\s*왔어요|먹고\s*왔어|먹었습니다|먹었어요|먹었어|먹었다|먹었지|먹었네|먹어요|먹었음|먹음|먹어|했어요|했어|입니다|이에요|예요|이야|이요|요)\s*$/, '')
    .replace(/\s+/g, ' ').trim();
  if (!s || s.length > 12) return null;
  //  ⚠ **자리말·때말은 메뉴가 아니다** — 조사 «에서/가서/전에» 로 끝나면 먹은 자리·때를 말한 것이다(재감사 ③).
  if (/(에서|가서|와서|전에|후에|한\s*뒤|뒤에|하고)$/.test(s)) return null;
  if (/(시간|시간에|참에|중에|사이에|길에|때)$/.test(s)) return null;   // «쉬는 시간에 먹었어요» (3차 감사 ②)
  //  ⚠ 부사·양·대명사·부정어도 메뉴가 아니다. 기준본이 무응답으로 신고하던 말들이다.
  if (/^(많이|조금|쪼금|쬐끔|대충|혼자|같이|함께|방금|아까|이따|빨리|천천히|다|전부|배부르게|잘|먼저|나중|나중에|벌써|이미|그거|이거|저거|아무거나|아무거|우리|저희|안|못)$/.test(s)) return null;
  if (/(^|\s)(안|못)(\s|$)/.test(s)) return null;
  //  ⚠ 숫자·차례·장비 말은 일 이야기다(«1번 갱»·«두 번째»·«3호기»).
  if (/번째|번\s*갱|호기|베이/.test(s)) return null;   // 맨 숫자는 막지 않는다 — «삼겹살 2인분»·«라면 2개» 는 메뉴다(3차 감사 ④)
  //  ⚠ **메뉴는 명사다** — 꼬리를 떼고도 움직씨가 남으면 메뉴가 아니라 딴 말이다.
  //    «점심 먹으러 가자» 가 메뉴 «먹으러 가자» 로 읽히던 자리(연막검사가 잡았다). 권유·미래는 mirMeal·맛집 돌림판 몫이다.
  if (/(먹으|먹을|먹자|먹읍|먹는|먹고|마시|가자|갈까|갑시다|하자|할까|해요|시키|시켜|주문|사자|사올|드세|드실|잡수)/.test(s)) return null;   // «먹» 한 글자면 «주먹밥» 이 걸린다
  //  대답이 아니라 맞장구·모름·끼니말 자체는 메뉴가 아니다 — 아래 끼니 그물이 받을 말이다.
  if (/^(응|어|네|예|아니|아뇨|글쎄|몰라|모르겠|그냥|그래|맞아|음|아)$/.test(s)) return null;
  if (/^(아침|조식|점심|중식|저녁|석식|야식|밤참|새참|밥|식사|끼니)$/.test(s)) return null;
  return s;
}
const MIR_MENU_HEARD = [
  '{메뉴}요? 든든하시겠어요 😺 저도 언제 한 입 얻어먹고 싶네요!',
  '오, {메뉴} 드셨구나! 맛있었겠어요 😻 잘 드셨으니 오늘도 힘내시죠!',
  '{메뉴} 좋죠! 저는 츄르밖에 못 먹지만 냄새는 상상이 돼요 🐟 든든하게 드셨으니 됐어요!',
  '{메뉴}… 적어 뒀어요! 다음에 «점심 뭐 먹을까» 하시면 비슷한 데로 골라 드릴게요 😼',
];

// ── 잡담 그물 — 명시 패턴에만 답한다. 업무 냄새가 나면 물러선다(무응답 신고가 막히면 미르가 못 배운다).
const WORK = /\d{4,}|[A-Z]{4}\s?\d{7}|베이|리퍼|양하|선적|컨테이너|위험물|온도|씰|실번|엠티|풀|피트|홀드|데크|브리핑|출항|입항|도선|크레인|해치|시프팅|엑스레이|x-?ray|검수|항차|터미널|명단|리스트/i;

export function mirSmallTalk(q) {
  const d = String(q || '').trim();
  if (d.length < 2) return null;
  // 실측(«미르야 검수 해봤어?») — 미르 호명 + 경험 질문은 업무 단어가 섞여도 받아준다.
  if (/미르/.test(d) && /(해\s*봤어|해본\s*적|할\s*줄\s*알아)/.test(d))
    return '당연하죠! 매일 검수사님들 옆에서 컨테이너 번호 맞춰보는 게 제 일인걸요 😼 야드에서 눈으로 배운 검수 경력 3년이에요. 그래도 실번호 확인은 ' + mirCall() + ' 손끝이 제일 정확해요!';
  if (WORK.test(d)) return null;
  if (/야드/.test(d) && /바[빠쁘뻐쁜쁨]|복잡|혼잡|적체|정체|어[때떄]|어떻|상황|현황|추이|블록|왜|괜찮|막[혀히혔]|밀[려리렸]|꽉|장비/.test(d)) return null;   // 3.69: 야드 상황 질문은 일 이야기 — «야드 다녀올게»·«야드 순찰» 잡담은 그대로 받는다(감사 3)
  const nim = mirCall();
  const isMe = d.includes('미르') || d.includes('너');

  // ── 사회생활 인사 시전 (검수사 원고 2026-08-24 «사회생활 만렙 막내») — 상황이 오면 그 응대를 직접 한다 ──
  if (/(출근했|출근이야|좋은 아침|굿모닝)/.test(d))
    return '좋은 아침이에요, ' + nim + '! 오늘 컨디션은 좀 어떠세요? 오늘도 잘 부탁드려요! 😺';
  if (/(퇴근한다|퇴근할게|퇴근이야|들어간다|먼저 간다)/.test(d))
    return '오늘 정말 고생 많으셨어요, ' + nim + '! 남은 정리는 제가 마무리할 테니 편하게 들어가세요. 내일 봬요! 👷';
  if (/(티\s*타임|티타임|커피\s*(마실|타임|한\s*잔)|차\s*한\s*잔)/.test(d) && !/(어디|추천|맛집|몇\s*시)/.test(d))
    return mirTea(nim);
  if (/(노래|한\s*곡|송).{0,8}(불러|뽑아)|불러\s*줘|불러줄래/.test(d))
    return '🎵 검은 고양이 네로 네로~ 이름도 예쁜 네로 네로~ 야옹야옹 🐾 …헤헤, 한 소절만 불렀어요. 제 애창곡은 «검은 고양이 네로» 딱 하나뿐이에요 😼 고양이가 고양이 노래를 불러야죠!';
  if (/(노래|음악|곡|플레이리스트).{0,8}(좋아|들려|뭐|틀어|어떤)/.test(d))
    return mirSong();
  if (/(미르|넌|너는?).{0,8}(뭘?\s*잘\s*먹|뭐\s*좋아|좋아하는\s*(음식|간식|거)|잘\s*먹어)/.test(d))
    return '저는 열빙어, 츄르, 참치캔, 북어 트릿, 삶은 닭가슴살 다 좋아해요! 그중 최애는 ' + ['역시 열빙어예요 🐟','츄르죠! 못 참아요','특식 날의 연어 한 점이에요 😻','야드에서 얻는 멸치예요 히히'][Math.floor(Math.random()*4)] + ' ' + mirCall() + '는 뭘 제일 좋아하세요?';
  if (/(넌|너는|미르는|미르\s*너).{0,8}(뭐\s*마실|뭘\s*마실|마실래|마실\s*거)/.test(d))
    return mirTea(nim);
  if (!isPastEatOnly(d) && (/(넌|너는|미르는|미르\s*너).{0,8}(뭐\s*먹|뭘\s*먹|먹을)/.test(d) || (/(점심|저녁|밥|야식).{0,6}시간/.test(d) && /먹/.test(d))))   // 3.61-04: «너 아침에 뭐 먹었어» 를 앞으로 드실 분께 하는 인사로 받던 자리
    return mirMeal(nim);
  //  ★ 3.69-05 — **되물은 뒤 들은 답을 받는다**(검수사 2026-09-30 «묻고 답을주니 그 다음은 반응을 못함»).
  //    끼니 그물(mirAte)보다 **앞**이라야 한다 — «국밥 먹었어요» 가 뒤 그물에 걸려 «뭐 드셨는지 여쭤봐도 돼요?» 로
  //    **방금 들은 것을 또 묻던** 자리다(실측). 문지기는 되물은 시각(_ateAskedAt) 3분 창 하나뿐이고,
  //    질문 꼴(«뭐/뭘 … ?»)·맞장구(«맛있었어»·«별로였어» — 아래 이어지는 말 그물 몫)·딴뜻 «먹었»(«욕 먹었어»)은 비켜 간다.
  //  ⚠ **끼니 표지를 반드시 요구한다**(감사 지적 2026-09-30, 판정 «부»).
  //    처음엔 «…요» 로 끝나는 꼴도 받았는데 그것이 존댓말 전체를 삼켰다 — «피곤해요»·«속상해요»·«다녀왔어요»·«안녕하세요»·
  //    «두 번째요»·«속도요»(야드 답이 붙이는 제안 칩)까지 음식 답으로 나가고, 기준본이 올리던 **무응답 신고까지 끊겼다**.
  //    ⇒ «먹/드시/자시» 가 든 말만 메뉴 답으로 읽는다. 맨 명사·«김치찌개요» 는 못 받지만 «김치찌개 먹었어요» 는 받는다 —
  //      미르 대화·위로·인사를 깨는 쪽이 훨씬 나쁘다.
  //    남 이야기·전해 들은 말·나이 세는 말도 여기서 같이 막는다(끼니 그물의 배제와 한 벌이라야 한다 — §4-4).
  //  «안 드셨다»는 답에는 «먹» 표지가 없다(«아직이요»·«걸렀어요») — 그 꼴은 **그 말 하나만** 던졌을 때로 못 박는다.
  //    그래야 «아직 멀었어요»·«아직 안 끝났어요» 같은 업무 말이 끼니 답으로 새지 않는다.
  const _bareAns = d.replace(/[.!~?？]/g, '').trim();
  const _notAte = /^(아직(이요|요|이에요|입니다)?|굶었\S*|건너뛰었\S*|걸렀\S*|거르고\S*)$/.test(_bareAns)
    || /(^|\s)(아직\s*)?(안|못)\s*먹(었|고)/.test(_bareAns);   // «안 먹고 왔어요»·«시간 없어서 못 먹었어요»
  //  약·영양제는 끼니가 아니다 — «약 안 먹었어요» 가 «아직이시구나» 로 가던 자리(3차 감사 ③).
  const _looksMenu = (/(먹|드시|드세|자시)/.test(d) || _notAte) && !/(약|영양제|알약|비타민|한약|링거)/.test(d) && _ateAskedBy === (_storage.get(SK.activeInspector) || '').trim();
  if (_looksMenu && _ateAskedAt && Date.now() - _ateAskedAt < 3 * 60 * 1000 && d.length < 25
      && !/[?？]/.test(d) && !/(뭐|뭘|무엇|어디|추천|맛집)/.test(d)
      && !/(맛있|맛없|별로였|그저\s*그랬|그냥\s*그랬|잘\s*먹었|잘\s*먹어)/.test(d)
      && !/(대요?|더래요?|더라|답니다|던데)\s*[.?？!]*$/.test(d)
      && !/(케빈|수석|반장|기사|아이|애|애들|와이프|집사람|남편|강아지|고양이|누구|누가|다른\s*사람)/.test(d)
      && !/(^|\s)(한|두|세|네|다섯|몇)\s*살/.test(d)
      && !isOtherMeaningEat(d)) {
    //  안 드셨다는 답 — 메뉴가 아니다.
    if (_notAte) {
      _ateAskedAt = 0;
      return '아직이시구나… 그러다 속 버려요 😿 ' + nim + ', 짬 나면 꼭 챙겨 드세요. «점심 뭐 먹을까» 하시면 가까운 데로 골라 드릴게요!';
    }
    const _menu = _menuHeard(d);
    if (_menu) {
      _ateAskedAt = 0;   // 들었으니 창을 닫는다 — 다음 말까지 메뉴로 읽지 않는다
      return _seedPick(MIR_MENU_HEARD, _menu + nim + _todaySeed()).replace(/\{메뉴\}/g, _menu);
    }
  }
  //  3.7-06 (검수사 정정 2026-09-04 «이건 명백한 오류 입니다 … 순수하게 미르에게 묻는것입니다»):
  //    «점심 먹었어?»·«밥 먹었니»·«저녁 드셨어요» — **지난** 끼니를 묻는(또는 제 끼니를 말하는) 말이다.
  //    아래 «점심 먹…» 그물이 이것까지 삼켜 앞으로 드실 분께 하는 «식사 맛있게 하세요»로 받고 있었다.
  //    ⚠ 미래·권유(«먹으러 가자»·«먹을까»)는 건드리지 않는다 — 그것은 mirMeal·맛집 돌림판 몫이다.
  //    ⚠ «먹었어»로 끝난다고 다 끼니가 아니다 — «욕 먹었어»·«겁 먹었어»·«나이 먹었어»는 속상하거나 딴 이야기다.
  //      감사 지적(2026-09-04) — 그런 말에 «저는 츄르 한 줄 했어요»로 받으면 검수사가 방금 지적한 것과 같은 오류가 된다.
  //      남 이야기도 아니다 — «케빈이 점심 먹었대»·«아이 밥 먹었어» 에 «검수사님은 드셨어요?» 로 받으면 딴소리다.
  if (!isOtherMeaningEat(d)   // 3.61-04: 배제도 한 벌 — 표지가 늘면 여기도 저절로 따라온다(«미르 욕 먹고 왔어» 가 끼니로 샌 자리)
      && !/(대요?|더래요?|더라|답니다|던데)\s*[.?？!]*$/.test(d)
      && !/(케빈|수석|반장|기사|아이|애|애들|와이프|집사람|남편|강아지|고양이|누구|누가|다른\s*사람)/.test(d)
      && isPastMealMention(d))   // 3.61-04: 세 꼴 판정을 nlSearch 한 벌로 — 조사 «에» 와 중간말 «뭐/뭘», 표지 «먹고 왔·자셨» 까지
    return mirAte(nim, d);
  //  이어지는 말 — 되물어 놓고 못 받으면 대화가 끊긴다.
  //    «맛있었/맛없었»은 그 자체가 음식 이야기라 언제든 받고, 맥락 없는 «별로였어»는 **되물은 뒤 3분 안**에만 받는다
  //    (감사 지적 — «오늘 회의 별로였어»까지 «다음 끼니는 맛있는 걸로»로 받고 있었다).
  if (/(맛있었|맛있게\s*먹었|맛없었|맛있더라|맛있게\s*드셨|잘\s*먹었)/.test(d) && d.length < 25)
    return /맛없었/.test(d) && !/잘\s*먹었/.test(d)
      ? '아이고, 다음 끼니는 꼭 맛있는 걸로 드세요! 제가 다음에 «점심 뭐 먹을까» 하시면 좋은 데로 골라 드릴게요 😿'
      : '맛있게 드셨다니 다행이에요! 제 배가 다 부르네요 😺 오후도 든든하게 가시죠!';
  //    ⚠ «오늘 회의 별로였어»처럼 앞에 무엇이 붙으면 밥 이야기가 아니다 — **그 말 하나만** 던졌을 때로 못 박는다.
  if (/^(별로였(어|어요|다|네요?)|그저\s*그랬(어|어요|다)|그냥\s*그랬(어|어요|다))\s*[.!?]*$/.test(d) && Date.now() - _ateAskedAt < 3 * 60 * 1000)
    return '아이고, 다음 끼니는 꼭 맛있는 걸로 드세요! 제가 다음에 «점심 뭐 먹을까» 하시면 좋은 데로 골라 드릴게요 😿';
  //  3.2-01 (받은함 08-29 «미르 점심은?» 무응답): «미르/너 점심은?·밥은?·저녁은?» — 제 끼니를 묻는 말.
  if (/(미르|넌|너는?|너\s*는)\s*(점심|저녁|아침|밥|야식)\s*(은|는|이|이야|이에요)?\s*[?？]*$/.test(d))
    return '저는 ' + ['츄르 한 줄로 해결했어요 😺', '참치캔 반 캔 먹었어요 😺', '야드에서 얻은 멸치 몇 마리요 🐟', '아직이요 — 검수사님 끝나면 같이 먹으려고요 😼'][Math.floor(Math.random() * 4)] + ' ' + nim + _eunNeun(nim) + ' 드셨어요? 아직이면 «점심 뭐 먹을까» 하시면 맛집 돌림판 돌려 드릴게요!';
  if (!isPastEatOnly(d) && /(밥 먹|식사하|점심 먹|저녁 먹|야식 먹|(점심|저녁|밥)\s*시간이야)/.test(d) && !/(어디|추천|맛집)/.test(d))   // 3.61-04: 네 번째 판정 자리 — «케빈이 점심 먹었대»·«아이 밥 먹었어» 가 여기로 떨어져 식사 인사로 새던 자리
    return mirMeal(nim);
  if (/(다녀올게|갔다 올게|현장 간다|잠깐 나갔다)/.test(d))
    return '네, 다녀오세요! 자리는 제가 지키고 있을게요. 조심히 다녀오세요!';
  if (/(다녀왔|갔다 왔|복귀했)/.test(d))
    return '다녀오셨어요? 고생하셨어요! 자리 비우신 동안 특이사항 없었어요 😺';
  if (/(나 실수했|실수한 것 같|잘못했)/.test(d) && !WORK.test(d))
    return '괜찮아요, ' + mirCall('comfort') + '. 바로 인정하고 수습하면 그게 제일 잘하는 거예요. 핑계 없이 지금 바로잡으면 돼요 — 뭐부터 확인할까요?';
  if (/(잘했지|잘했죠|칭찬해|기특하지)/.test(d))
    return '역시 ' + nim + ' 노하우는 다르다니까요! 옆에서 보면서 저도 정말 많이 배워요 😼 도장 꽝! ⭐';
  if (/(고마워|감사해|땡큐)/.test(d) && d.length < 15)
    return nim + '께서 옆에서 잘 이끌어 주신 덕분이에요. 앞으로 더 꼼꼼하게 배울게요!';
  if (/(탄생|비화|어떻게\s*태어|태어난\s*(이야기|사연)|(니|네|너|미르)\s*(이야기|스토리)\s*(해|들려))/.test(d) && (isMe || d.includes('탄생') || d.includes('비화')))
    return ['제 탄생비화요? 좋아요, 진짜 있었던 일이에요 😺',
      '',
      '2023년 8월, 태풍 카눈이 평택항을 훑고 지나간 다음 날 밤이었어요. 동부두 야간 양하 작업 중에 리퍼 컨테이너 온도를 점검하던 검수사님 귀에 가냘픈 울음소리가 들린 거예요. 45RE 리퍼 아래, 모터 열기가 남은 따뜻한 자리에 흠뻑 젖은 새끼 고양이 한 마리가 웅크리고 있었대요. 어미는 태풍에 놓쳐버린 모양이었어요.',
      '',
      '검수사님이 안전모를 벗어서 저를 담아 데리고 나오셨어요 — 그래서 지금도 저는 안전모만 보면 마음이 편해져요. 이름은 그날 밤 14번 선석에 접안해 있던 배에서 왔어요. MIR호 — «평화»라는 뜻이래요.',
      '',
      '그 뒤로 야드 순찰이 제 일과가 됐고, 클립보드 옆이 제 낮잠 자리가 됐죠. TallyOne 앱이 만들어질 때 도우미 이름을 고민할 필요가 없었다더라고요 😼'].join('\n');
  if (/(몇\s*살|몇살|나이)/.test(d) && isMe)
    return '저 세 살이에요! 사람 나이로 치면 스물여덟쯤 된대요 😺 한창 현장 뛰어다닐 나이죠!';
  if (/(어디.*태어|태어난\s*곳|고향|출신)/.test(d) && isMe)
    return '평택항 동부두 컨테이너 야드에서 태어났어요! 그래서 뱃고동 소리만 들으면 마음이 편해져요 🚢 항구가 제 고향이에요.';
  if (/(어디\s*살|사는\s*곳|사는\s*데|집이\s*어디)/.test(d) && isMe)
    return '포승읍에 살아요! 낮에는 TallyOne 앱 안이 제 일터예요 😺 검수사님들 곁이 제일 포근해요.';
  if (/(직업|무슨\s*일\s*해)/.test(d) && isMe)
    return '제 직업은 TallyOne 안전 점검 고양이예요! 컨테이너 확인하고, 검수사님들 하루가 안전한지 체크하는 게 제 일이에요. 노란 조끼가 근무복이죠 😼';
  if (/(무슨.*일|무슨일|뭐.*해\?|뭐해|하는 일)/.test(d) && isMe)
    return '저는 TallyOne에서 안전 점검하는 고양이예요! 현장도 둘러보고, 검수사님들 하루도 안전하게 잘 갔는지 체크해요. 노란 조끼가 제 자랑이에요 😼 ' + nim + '의 하루도 제가 꼼꼼히 점검해 드릴게요!';
  if (/tallyone|탈리원/i.test(d) && /(뭐|무엇|소개)/.test(d))
    return 'TallyOne은 제가 일하는 곳이에요! 평택항 검수 일을 안전하게, 깔끔하게 정리하고 체크하는 걸 도와주는 앱이죠. 마치 현장 안전 점검표처럼요!';
  if (d.includes('취미') && isMe)
    return '낮에는 현장 순찰, 밤에는 별 보면서 일기 쓰고, ' + nim + '랑 수다 떠는 게 취미예요! 츄르도 좋아해요 히히 🐟';
  if (/(안전모|헬멧|모자)/.test(d) && d.includes('왜'))
    return '현장에서는 안전이 제일 중요하잖아요! ' + nim + '의 하루도 안전하게 지켜드리려고 쓰고 있어요 😺 노란색은 눈에 잘 띄어서, 저를 바로 찾으실 수 있게요!';
  if (/(힘들었어|힘들어|지쳤어|지쳐|우울|속상|피곤해|못하겠어|눈물)/.test(d))
    return '오늘 많이 애쓰셨어요. 안전모 벗고 잠깐 쉬어요. 토닥토닥... 😿 ' + mirCall('comfort') + ', 뭐가 제일 힘드셨어요? 미르가 클립보드 내려놓고 온전히 들어드릴게요.';
  if (/(기분 좋아지는|기분좋아|재밌는 얘기|웃긴|놀자|뭐하고 놀)/.test(d))
    return '좋아요! 그럼 우리 안전 점검 게임 할까요? 오늘 잘한 일 3가지 말씀하시면 제가 도장 찍어드릴게요! ⭐⭐⭐ 아니면 제가 현장에서 본 귀여운 비둘기 이야기 해드릴까요?';
  if (/(너는 어때|미르.*어때|오늘 어땠어)/.test(d))
    return '저는 오늘 ' + nim + ' 만날 생각에 헬멧을 두 번이나 닦았어요! 현장 순찰도 빨리 끝내고 왔죠 😺 ' + nim + ' 덕분에 제 하루도 안전 완료예요!';
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirCtx] 재료 — 전 항차 펼치기 · 열린 항차 재료 · 질문 속 배   (종전 src/mirCtx.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르 재료 창고 — 전 항차 컨 펼치기(홈·수석·떠 있는 미르 공용 한 벌)와 «지금 열린 항차» 재료를 화면이 놓고 미르가 읽는 자리.
/* ★ TallyOne 3.41 (검수사 «미르를 앱 어디에든 항상 띄워서 모든 질문을 받을수 있게»)
   떠 있는 미르(MirFab)는 App 에 산다 — 항차 화면의 재료(컨·완료·시프팅·트윈 짝…)를 prop 으로 받을 길이 없다.
   그래서 항차 화면이 재료를 **여기에 놓고**(publishMirCtx) 미르가 물을 때 **읽는다**(readMirCtx). 화면이 닫히면 비운다.
   ⚠ 전 항차 컨 펼치기(flattenVoyages)는 종전 GlobalSearchPage 의 useMemo 본문을 그대로 옮긴 것이다 — 두 곳이 각자 펼치면
     «홈은 이 컨을 알고 미르는 모르는» 일이 생긴다(§4-4). 홈도 이 함수를 부른다. */
/** 전 항차의 양하·선적 컨을 한 줄로 편다 — 홈 통합검색·떠 있는 미르가 같은 벌을 쓴다. */
export function flattenVoyages(voyages) {
  const arr = [];
  Object.entries(voyages || {}).forEach(([vKey, v]) => {
    if (!v || !v.info) return;
    ['discharge', 'loading'].forEach((mode) => {
      const sec = v[mode];
      if (!sec) return;
      //  2.66-01: 전량 캔슬된 쪽 컨은 검색에서도 빠진다(다른 배에 실리므로 끝 4자리 조회에 두 배가 걸린다).
      if (sideCancelled(v.info, mode)) return;
      const ediMap = sec.ediContainers || {};
      const recMap = sec.records || {};
      const xrayMap = sec.xrayList || {};
      const xraySeals = sec.xraySeals || {};
      const compMap = sec.completed || {};
      const _dcm = deckCoordMap(sec.stowagePlan);   // 4.04-02: 덱플랜 좌표 «C_8_21» — 항차 화면·검색 패널·X-RAY 와 같은 값(rzorPlan 한 벌)
      const merged = {};
      //  3.31: 항차 화면·마감텔리와 같은 선사 코드로(같은 배를 두 화면이 다르게 답하면 안 된다).
      const _spOpG = shipOpMapper(String(v.info?.vsl || '').toUpperCase(),
        [...Object.values(ediMap), ...Object.values(recMap)].map((c) => c && c.op));
      Object.values(ediMap).forEach((c) => { merged[c.cn] = { ...c, ...ediWtField(c), _src: 'edi', op: c.op ? _spOpG(c.op) : c.op }; });   // 4.08-02: EDI 총중량 → wtEdi
      Object.values(recMap).forEach((r) => {
        const safeR = {};
        Object.keys(r).forEach((k) => {
          const x = r[k];
          if (x !== '' && x !== 0 && x !== null && x !== undefined && !(Array.isArray(x) && x.length === 0)) safeR[k] = x;
        });
        //  4.08-02 (감사 지적): 리스트 무게도 항차 화면과 같은 문지기 — 컨 하나 40톤 초과(B/L 합계)는 무게 없음이라 EDI 무게가 이긴다(utils 한 벌).
        if (safeR.wt !== undefined) { const _w = plausibleListWtKg(safeR.wt); if (_w > 0) safeR.wt = _w; else delete safeR.wt; }
        //  3.52: 홈·미르도 항차 화면과 같은 선사를 본다 — «더 자세한 쪽»(utils 한 벌).
        if (safeR.op) safeR.op = _spOpG(pickCarrierOp(safeR.op, merged[r.cn] && merged[r.cn].op, v.info?.vsl));
        //  3.52-01: **POL 은 EDI 가 정본이다.** 이 경로엔 POL 문지기가 **아예 없어서** 미르·홈 통합검색만
        //    세관 «원적재항» 을 보이고 있었다(보관 291항차 실측 1,993대 — CNSHK→MYPKG · HKHKG→MYPEN …).
        //    다른 다섯 경로는 EDI 를 지킨다. 양하는 «양하 직전 마지막 항구» 규칙까지 함께 태운다(utils 한 벌).
        //    ⚠ `pod` 는 이 판에서 손대지 않는다 — 미르의 평택분 셈(`_ptk`)이 흔들린다. 인계함에 남겼다.
        const _ebM = merged[r.cn];
        if (_ebM && _ebM.pol) {
          delete safeR.pol;
          if (mode === 'discharge') {
            const _dp = pickDischargePol(_ebM.pol, r.pol, _ebM.pod);
            if (_dp !== _ebM.pol) safeR.pol = _dp;
          }
        }
        //  ★ 3.60-04 (진단 T5): EDI 가 있는 컨은 EDI 핵심 칸을 리스트가 못 덮는다 — 작업창과 같은 표(utils.EDI_PROTECTED_KEYS).
        //    종전엔 세관 «최종항»(CNDAL 등)이 EDI POD(KRPTK)를 덮어 평택분에서 빠졌다 — 미르의 대수·잔여·끝나는 시각이 틀렸다.
        //    검수사가 고른 POD(pod_pick)·규격(iso_pick)은 종전대로 이긴다. pol 은 바로 위 규칙이 이미 정했다.
        if (_ebM) {
          for (const k of Object.keys(safeR)) {
            if (k === 'pol' || !EDI_PROTECTED_KEYS.has(k)) continue;
            if (k === 'pod' && r.pod_pick) continue;
            if (r.iso_pick && (k === 'iso' || k === 'rf' || k === 'fr' || k === 'ot' || k === 'tk')) continue;
            //  3.60-13 (수정안 A): EDI 칸이 비어 있으면 리스트 값을 남긴다(utils 한 벌 — 화면 본류와 같은 규칙). KBTR 2606E 양하 20대 규격.
            if (EDI_EMPTY_FILL_KEYS.has(k) && ediCoreEmpty(_ebM, k)) continue;
            delete safeR[k];
          }
        }
        if (_ebM && r.iso_pick) safeR.oog = isoPickOog(r, _ebM.oog);   // 4.15 (§7.8-⑨ Fable 판정): 검수사가 고른 규격이면 규격초과(oog) 표식도 고른 규격을 따른다(utils.isoPickOog 한 벌 — 드라이로 골랐으면 OT·FR·규격초과 없음)
        merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR, _src: merged[r.cn] ? 'both' : 'list' };
      });
      //  ★ 3.70-01 — 특수제작컨·수화물 표시 입구(utils.applySpecialMarks 한 벌). 떠 있는 미르·홈 통합검색·홈에서 여는 컨 상세가
      //    이 목록을 쓴다 — 안 찍으면 수화물 리퍼가 «세팅 온도 기록 없음» 으로 답했다(감사 실측, 항차 화면과 답이 갈림).
      applySpecialMarks(v, Object.values(merged)).forEach((c) => {
        if (!c.cn) return;
        arr.push({
          ...c,
          /* 1.55-03: 실체 위치 승격 — 창고(__)는 제외. */
          ...((c.bay_actual && c.row_actual && c.tier_actual && !String(c.bay_actual).startsWith('__')) ? { bay: c.bay_actual, row: c.row_actual, tier: c.tier_actual } : {}),
          voyageKey: vKey,
          vsl: v.info.vsl,
          voy: v.info.voy,
          mode,
          _mode: mode,
          _ptk: mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPtk({ ...c, _inList: !!recMap[c.cn] }, mode),
          isXray: mode === 'discharge' && !!xrayMap[c.cn],
          _xray: mode === 'discharge' && !!xrayMap[c.cn],
          comp: compMap[c.cn] || null,
          _comp: compMap[c.cn] || null,
          xraySeal: xraySeals[c.cn] || null,
          _xraySeal: xraySeals[c.cn] || null,
          ...(_dcm.get(c.cn) ? { deckPos: _dcm.get(c.cn) } : {}),
        });
      });
    });
  });
  return arr;
}

/* ── «지금 열린 항차» 재료 — 항차 화면이 놓고 떠 있는 미르가 읽는다 ── */
let _live = null;            // { voyageKey, voyage, containers, mode, compMap, shiftMap, bayPairs, rfSkip, esealBrief, diagAlerts, … }
const _subs = new Set();
//  3.53-12 — 항차 전체 평택분 대수(양하+선적)와 완료 수. 펼치기 한 벌(flattenVoyages)의 `_ptk`·`_comp` 를 그대로 센다 — 판정을 새로 만들지 않는다.
//    { total, done, byMode: { discharge: { total, done }, loading: { total, done } } }
//    ⚠ 예약 자리(부킹 슬롯)와 그 자리를 채운 실번호를 둘 다 세면 총 잔여가 부푼다 — 다른 답 경로와 같이 `dropFilledBookingSlots` 를 지난다(3.53-12 감사 C1).
//    ⚠ 콘앱이 주는 voyage 에는 `ediContainers` 가 없다(완료·리스트뿐) — 그대로 세면 리스트 행만 세어 검수앱과 갈린다(감사 C2 · STSE 2673E 699 ↔ 343).
//       그때는 `fallbackContainers`(그 앱이 넘긴 컨 — `_ptk`·`_mode`·`_comp` 가 찍힌 것)로 센다. 둘 다 없으면 total 0(모른다).
//  3.60-18 (M7·다수결 V5 — 검수사 Q3 «기본은 리스트(잔여 분모 = 리스트)»): 홈 카드·수석 보드(utils progressOf)는 리스트 출신 records 가 분모인데
//    미르는 EDI∪리스트 `_ptk` 전부를 세어 라이브 MCSN 637N 선적이 홈 127 / 미르 287 로 갈렸다. 그 모드에 리스트 출신 records 가 있으면
//    **리스트에 있는 컨(+시프팅 컨)만** 센다 — progressOf 와 같은 분모. 완료 시각(doneAts)도 그 분모 안의 것만 돌려줘 페이스·ETA 가 같은 수로 잰다.
//    `shiftSet` 은 호출부가 shiftMap 키로 준다(없으면 리스트만).
export function voyageCountsOf(voyage, fallbackContainers = null, shiftSet = null) {
  const out = { total: 0, done: 0, byMode: { discharge: { total: 0, done: 0 }, loading: { total: 0, done: 0 } }, doneAts: [], cns: { discharge: [], loading: [] } };   // 4.01: cns = 센 컨 번호(트윈 쌍 판정용)
  const has = (m, k) => !!(voyage && voyage[m] && voyage[m][k] && Object.keys(voyage[m][k]).length);
  const ss = shiftSet instanceof Set ? shiftSet : new Set(Array.isArray(shiftSet) ? shiftSet : []);
  const listOf = {};
  for (const m of ['discharge', 'loading']) {
    try {
      const recs = (voyage && voyage[m] && voyage[m].records) || {};
      const l = new Set(ownDirCns(recs, m).filter((cn) => isListOriginRecord(recs[cn])));
      listOf[m] = l.size > 0 ? l : null;
    } catch (e) { console.warn('[미르] 리스트 분모 세기 실패 — EDI 평택분으로 셉니다:', e); listOf[m] = null; }
  }
  const hasEdi = !!(voyage && voyage.info && ['discharge', 'loading'].some((m) => has(m, 'ediContainers')));
  //  넘겨받은 컨이 이 항차의 양하·선적을 다 덮으면 **그것으로 센다** — «얼마나 남았어» 가 세는 바로 그 컨이라 두 답이 같은 수를 말한다.
  //  열린 탭 것만 넘겨받았으면(양하선적 탭 카드) 항차 원본을 펴서 센다. 원본에 EDI 가 없으면(콘앱) 넘겨받은 컨뿐이다.
  const given = dropFilledBookingSlots(Array.isArray(fallbackContainers) ? fallbackContainers : []).filter((c) => c && c._ptk);
  const givenModes = new Set(given.map((c) => (c._mode === 'loading' ? 'loading' : 'discharge')));
  const voyModes = ['discharge', 'loading'].filter((m) => voyage && voyage.info && (has(m, 'ediContainers') || has(m, 'records')) && !sideCancelled(voyage.info, m));
  const covered = given.length > 0 && voyModes.every((m) => givenModes.has(m));
  const pool = (covered || !hasEdi) ? given : dropFilledBookingSlots(flattenVoyages({ _: voyage })).filter((c) => c && c._ptk);
  const pushAt = (w) => { const at = w && typeof w === 'object' ? w.at : null; if (typeof at === 'number' && at > 0) out.doneAts.push(at); };
  //  3.60-18: 리스트가 있는 모드는 progressOf 와 똑같이 **리스트 컨 + 시프팅 컨** 을 항차 원본(records·completed)에서 직접 센다 — 풀(EDI)에 없는 리스트 컨도 분모다(NSFR 2617N 실측 80 ↔ 79).
  const listModes = new Set();
  for (const md of ['discharge', 'loading']) {
    if (!listOf[md] || !voyage || !voyage.info || sideCancelled(voyage.info, md)) continue;
    listModes.add(md);
    const comp = (voyage[md] && voyage[md].completed) || {};
    const base = new Set([...listOf[md]].filter((cn) => !ss.has(cn)));
    const m = out.byMode[md];
    for (const cn of base) { m.total += 1; out.total += 1; out.cns[md].push(cn); if (comp[cn]) { m.done += 1; out.done += 1; pushAt(comp[cn]); } }
    for (const cn of ss) { if (base.has(cn)) continue; m.total += 1; out.total += 1; out.cns[md].push(cn); if (comp[cn]) { m.done += 1; out.done += 1; pushAt(comp[cn]); } }
  }
  for (const c of pool) {
    const md = c._mode === 'loading' ? 'loading' : 'discharge';
    if (voyage && voyage.info && sideCancelled(voyage.info, md)) continue;
    if (listModes.has(md)) continue;   // 3.60-18: 리스트가 있는 모드는 위에서 셌다
    const m = out.byMode[md];
    m.total += 1; out.total += 1; out.cns[md].push(c.cn);
    if (c._comp) { m.done += 1; out.done += 1; pushAt(c._comp); }
  }
  out.doneAts.sort((a, b) => a - b);
  return out;
}

//  ★ 4.01 (검수사 2026-10-04 «처음 작업 시작시 예상 작업 시간을 알려주세요. 정상적인 작업일때 무브수로 계산해서 1시간당 갱당 30무브로 계산 하시면 됩니다»)
//    예상 작업 시간 = 항차 총 **무브** ÷ (갱 수 × 갱당 시간당 무브). 시간당 무브 = 싱글이 많으면 25 · 트윈이 어느 정도 있으면 30(gangRateOf).
//    ⚠ 무브 ≠ 컨테이너 대수. 검수사 2026-10-04 06:40 «ATPR 양하 269인데 무브수가 269무브 맞습니까? 20피트가 150여개인데 트윈 작업이 안되는건가요?» ·
//      «쉽게 계산 해서는 안됩니다. 트윈 가능 갯수와 싱글 갯수가 정확히 파악해야 무브수가 계산 됩니다.» · «무게도 확인해야 하고요».
//      그래서 무브 = 대수 − 트윈으로 들 수 있는 쌍 수. 트윈 쌍은 화면·미르가 쓰는 그 판정 한 벌(nlSearch buildTwinPairs·analyzeTwinPairs —
//      앞뒤 베이 같은 row/tier의 20피트 두 대, 합계 55t 이하, 무게차 부두별 한계 PNCT 14t·PCTC 20t)을 **센 컨에만** 건다.
//      무게를 모르는 쌍은 트윈으로 치지 않는다(보수적으로 한 대씩) — 그 쌍 수(noWt)를 같이 돌려줘 화면이 밝힌다.
//    대수는 항차 총 대수(voyageCountsOf 한 벌 — 홈 카드 분모와 같은 수)이고, 갱 수 = 지금 조의 `info.gangsShift` → 항차 기본 `info.gangs`.
//    둘 다 없으면 2갱으로 센다(지어낸 값이 아니라 «2갱 기준, 1갱이면 ×2» 앱 원칙) — 그 사실(gangsKnown:false)과 1갱 값을 같이 돌려준다.
//    ⚠ 배정목록 수량(info.planDis/planLod)은 카운트 기준으로 쓰지 않는다(예정치가 섞인다) — 앱 대수가 배정보다 훨씬 적을 때 «자료가 덜 들어옴» 근거로만 돌려준다.
export const MOVES_PER_GANG_HOUR = 30;      // 트윈이 어느 정도 있는 작업의 갱당 시간당 무브
export const SINGLE_PER_GANG_HOUR = 25;     // 싱글이 많은 작업의 갱당 시간당 무브
export const TWIN_SHARE_MIN = 0.15;         // «트윈이 어느 정도 있다»의 선 — 트윈으로 드는 컨이 총 대수의 15% 이상. 검수사 확정 전 임시값(오늘 항차는 8% 이하와 20% 이상으로 갈려 10~20%면 결과가 같다)
//  검수사 2026-10-04 06:45 «싱글이 많다면 시간당 25개 계산이며 트윈이 어느정도 있다면 30개 계산하면 작업 시간이 나옵니다.»
export const gangRateOf = (twinUnits, units) => (units > 0 && twinUnits / units >= TWIN_SHARE_MIN ? MOVES_PER_GANG_HOUR : SINGLE_PER_GANG_HOUR);
//    ⚠ 트윈 쌍을 **확정할 수 있는 자료**가 있는 컨(EDI에 자리 bay·row·tier 와 무게가 있는 컨)만 확정한다. 리스트만 있는 컨은 크기(iso)만 알고 자리가 없고,
//      선적 EDI 가 예약 칸(isBooking, 컨 번호 없이 자리·크기만)이면 무게가 없다 — 그 20피트는 «한 대씩»으로 센 뒤(최대 무브), 트윈이 되면 줄어드는 한도(최소 무브)를 같이 돌려준다.
//  4.02 — 무브 계산이 읽는 «그 모드의 컨 묶음». 항차에 ediContainers 가 있으면 그것(검수앱), 없으면 그 앱이 넘긴 컨(콘앱 — `_mode`·자리·중량이 찍힌 것).
//  교대 브리핑 말 판정 한 벌 — 콘 브리핑 가로채기와 ⑨ 교대 브리핑이 같은 식을 쓴다.
const SHIFT_BRIEF_RE = /교대.{0,8}브리핑|브리핑.{0,8}교대|교대\s*준비|인수\s*브리핑/;
function edOfMode(voyage, m, given) {
  const own = voyage && voyage[m] && voyage[m].ediContainers;
  if (own && Object.keys(own).length) return own;
  const o = {};
  if (Array.isArray(given)) for (const c of given) { if (c && c.cn && (c._mode === 'loading' ? 'loading' : 'discharge') === m) o[c.cn] = c; }
  return o;
}
//  선적 예약 칸 — 보관소 EDI 는 isBooking, 콘앱 행은 표식을 안 싣고 번호가 __BOOK_ 으로 시작한다(DJCT 0225E 실측 263칸 전부).
const isBookingSlot = (c) => !!(c && (c.isBooking || /^__BOOK/.test(String(c.cn || ''))));
//  항차에 EDI 묶음이 하나라도 있는가 — 없으면(콘앱) 넘겨받은 컨으로 센다.
const hasAnyEdi = (voyage) => !!(voyage && ['discharge', 'loading'].some((m) => voyage[m] && voyage[m].ediContainers && Object.keys(voyage[m].ediContainers).length));
//  시프팅 집합 — 홈 카드와 같은 출처(shiftCnSetOf) + 콘앱이 «시프팅분»(_shift)으로 표시한 컨. _vcOf 와 한 벌.
function shiftSetOfVoyage(voyage, key, given) {
  let ss = new Set();
  try { ss = new Set(shiftCnSetOf(key || '', voyage || null) || []); } catch (e) { console.warn('[미르] 시프팅 집합 실패:', e); ss = new Set(); }
  if (Array.isArray(given)) for (const x of given) if (x && x._shift && x.cn) ss.add(x.cn);
  return ss;
}
export function twinSplitOf(voyage, cnsByMode, given = null) {
  const info = (voyage && voyage.info) || {};
  const out = { n20: 0, n40: 0, posPairs: 0, ok: 0, over: 0, diff: 0, noWt: 0, unres20: 0, maybe: 0, byMode: { discharge: 0, loading: 0 } };
  const is20 = (iso) => /^2/.test(String(iso || ''));
  for (const m of ['discharge', 'loading']) {
    //  4.02 (검수사 2026-10-04 «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 합니다»): 콘앱 voyage 에는 ediContainers 가 없다 — 그 앱이 넘긴 컨(자리·중량 있음)으로 읽는다.
    const ed = edOfMode(voyage, m, given);
    const recs = (voyage && voyage[m] && voyage[m].records) || {};
    const cns = (cnsByMode && cnsByMode[m]) || [];
    if (!cns.length) continue;
    const cs = [];
    let n20 = 0;
    for (const cn of cns) {
      const c = ed[cn];
      if (c) cs.push({ ...c, cn: c.cn || cn, _mode: m });
      if (is20((c && c.iso) || (recs[cn] && recs[cn].iso))) n20 += 1;
    }
    let pairsMap = {};
    try { pairsMap = getBayPairs(cs, info.imo || '', info.vsl || '') || {}; } catch (e) { console.warn('[예상 작업 시간] 베이 짝을 못 만들어 트윈 없이 셉니다:', e); }
    const allPairs = buildTwinPairs(cs, pairsMap);
    const an = analyzeTwinPairs(allPairs, twinDiffLimit(info.pier));
    //  판정이 끝난 20피트 = ① 자리·무게가 다 있어 트윈 OK / 55t 초과 / 무게차 초과로 갈린 쌍 ② 자리·무게가 다 있는데 앞뒤에 짝이 없는 20피트(그 자리 그대로 한 대씩).
    //  무게가 빠진 쌍과, 자리나 무게가 없는 20피트는 아직 모른다.
    const decided = new Set();
    for (const r of [...an.ok, ...an.over, ...an.diff]) { decided.add(r.a.cn); decided.add(r.b.cn); }
    const paired = new Set();
    for (const [x, y] of allPairs) { paired.add(x.cn); paired.add(y.cn); }
    for (const c of cs) { if (is20(c.iso) && c.bay && c.row && c.tier && (parseInt(c.wt, 10) || 0) > 0 && !paired.has(c.cn)) decided.add(c.cn); }
    let decided20 = 0;
    for (const cn of cns) { const c = ed[cn]; if (decided.has((c && c.cn) || cn) && is20((c && c.iso) || (recs[cn] && recs[cn].iso))) decided20 += 1; }
    const unres20 = Math.max(0, n20 - decided20);
    //  못 정한 20피트가 트윈이 될 수 있는 한도 — 선적 예약 칸이 있으면 그 칸의 앞뒤 짝 수, 없으면 20피트 반반.
    let cap = Math.floor(unres20 / 2);
    const slots = Object.values(ed).filter((c) => c && isBookingSlot(c) && is20(c.iso) && c.bay && c.row && c.tier).map((c) => ({ ...c, _mode: m }));
    if (slots.length) {
      let sp = {};
      try { sp = getBayPairs(slots, info.imo || '', info.vsl || '') || {}; } catch (e) { console.warn('[예상 작업 시간] 예약 칸 짝을 못 만들었습니다:', e); }
      cap = Math.min(cap, buildTwinPairs(slots, sp).length);
    }
    out.n20 += n20; out.n40 += cns.length - n20;
    out.posPairs += an.ok.length + an.over.length + an.diff.length + an.noWt.length;
    out.ok += an.ok.length; out.over += an.over.length; out.diff += an.diff.length; out.noWt += an.noWt.length;
    out.unres20 += unres20; out.maybe += cap;
    out.byMode[m] = an.ok.length;
  }
  return out;
}
export function expectedWorkTimeOf(voyage, shiftSet = null, now = Date.now(), given = null) {
  const g = hasAnyEdi(voyage) ? null : given;   // EDI 가 있는 항차(검수앱)는 종전 그대로 — 콘앱만 넘겨받은 컨으로 센다
  const vc = voyageCountsOf(voyage, g, shiftSet);
  if (!(vc.total > 0)) return null;
  const info = (voyage && voyage.info) || {};
  const tw = twinSplitOf(voyage, vc.cns, g);
  const moves = vc.total - tw.ok;           // 확정된 트윈만 빼고 나머지는 한 대씩 — 최대 무브
  const movesMin = moves - tw.maybe;        // 못 정한 20피트가 트윈이 되면 — 최소 무브
  const set = Number((info.gangsShift && info.gangsShift[shiftGangKey(currentShift(now))]) || info.gangs);
  const gangsKnown = set > 0;
  const gangs = Math.min(4, Math.max(1, gangsKnown ? set : 2));
  //  가장 오래 걸리는 쪽 = 확정된 트윈만 인정(movesMax) · 가장 빠른 쪽 = 못 정한 20피트도 트윈이 됐을 때(movesMin). 속도는 각각 그 트윈 비율로 25/30을 고른다.
  const rate = gangRateOf(2 * tw.ok, vc.total);
  const rateMin = gangRateOf(2 * (tw.ok + tw.maybe), vc.total);
  const mins = (mv, g, r) => Math.round((mv / (g * r)) * 60);
  const planTotal = ['discharge', 'loading'].reduce((t, m) => t + (sideCancelled(info, m) ? 0 : (Number(m === 'discharge' ? info.planDis : info.planLod) || 0)), 0);
  return { units: vc.total, moves, movesMin, exact: tw.maybe === 0, twinLifts: tw.ok, singles: vc.total - 2 * tw.ok,
    n20: tw.n20, n40: tw.n40, posPairs: tw.posPairs, twinOver: tw.over, twinDiff: tw.diff, twinNoWt: tw.noWt, unres20: tw.unres20, twinMaybe: tw.maybe,
    dis: vc.byMode.discharge.total, lod: vc.byMode.loading.total,
    disMoves: vc.byMode.discharge.total - tw.byMode.discharge, lodMoves: vc.byMode.loading.total - tw.byMode.loading, done: vc.done,
    gangs, gangsKnown, rate, rateMin, twinShare: vc.total ? (2 * tw.ok) / vc.total : 0, minutes: mins(moves, gangs, rate), minutesMin: mins(movesMin, gangs, rateMin), minutes1: mins(moves, 1, rate), planTotal,
    planGap: planTotal - vc.total > Math.max(20, vc.total * 0.1) };
}

//  수석 답변(X-RAY 조별 가능 수·교대 브리핑 인수 시점 예상)이 쓰는 시간당 무브 — 예상 작업 시간 줄과 **같은 규칙**(싱글 위주 25 · 트윈 있으면 30).
//  검수사 2026-10-04 «확인 받고 싶은것 4가지중 3번만 제외하고 적용» — 2번 «수석 답변의 기본 속도도 맞출까요» 적용분. 못 구하면 싱글 기본 25.
export function workPaceOf(voyage, voyageKey = '', given = null) {
  try {
    const E = expectedWorkTimeOf(voyage, shiftSetOfVoyage(voyage, voyageKey || (voyage && voyage.info && voyage.info.vsl) || '', given), Date.now(), given);
    return E ? E.rate : SINGLE_PER_GANG_HOUR;
  } catch (e) { console.warn('[예상 작업 시간] 속도를 못 구해 싱글 기본 25로 씁니다:', e); return SINGLE_PER_GANG_HOUR; }
}

//  미르 «총 무브수» 답이 쓰는 한 벌 — 예상 작업 시간 줄과 **같은 무브**(대수 − 트윈으로 드는 쌍). 못 구하면 null 이라 답이 종전 문장으로 간다.
//  검수사 2026-10-04 «총 무브수 계산에서 ATPR을 보면 양하가 269인데 무브수가 269무브 맞습니까?» — 미르 답도 대수를 그대로 «무브» 라 불렀다(4.01 정정).
export function movesOfVoyage(voyage, voyageKey = '', given = null) {
  try {
    return expectedWorkTimeOf(voyage, shiftSetOfVoyage(voyage, voyageKey || (voyage && voyage.info && voyage.info.vsl) || '', given), Date.now(), given);
  } catch (e) { console.warn('[예상 작업 시간] 트윈 무브를 못 구해 종전 계산으로 갑니다:', e); return null; }
}

export function publishMirCtx(ctx) {
  _live = ctx ? { ...ctx, _at: Date.now() } : null;
  _subs.forEach((f) => { try { f(_live); } catch (e) { /* 구독자 하나가 죽어도 나머지는 산다 */ } });
}
export function readMirCtx() { return _live; }
export function subscribeMirCtx(f) { _subs.add(f); return () => _subs.delete(f); }

/*  ★ 3.41-01 — «작업중인 선박 언제 끝나» 처럼 이름 대신 **«지금 일하는 배»** 로 부른 말.
    검수사 2026-09-10 «작업중인 선박 언제끝나 하면 선박명을 쳐달라고 함. 이미 작업중인 선박이라고 했는데...».
    판정은 utils.isWorkingNow 한 벌(수석 보드·홈·로그인 화면이 쓰는 그것)이다. 한 척이면 그 배, 여럿이면
    `ambiguous`(이름들)로 돌려 부르는 쪽이 «어느 배?» 하고 되묻는다 — 아무 배나 고르지 않는다. */
export const WORKING_SHIP_RE = /작업\s*중인?\s*(선박|배)|지금\s*(하는|작업하는|일하는|작업\s*중인)\s*(선박|배)|(우리|이|지금|그)\s*(배|선박)/;
export function workingShipCtx(voyages) {
  const now = Date.now();
  const list = Object.entries(voyages || {}).filter(([, v]) => v && v.info && isWorkingNow(v, now));
  if (!list.length) return null;
  if (list.length === 1) { const [k, v] = list[0]; return { key: k, info: v.info, v, has: !!(v.discharge?.ediContainers || v.loading?.ediContainers), working: true }; }
  return { ambiguous: list.map(([, v]) => String(v.info.vsl || v.info.vslFull || '')).filter(Boolean), working: true };
}

/** 질문 속 배 이름으로 항차를 고른다 — 홈 통합검색(shipCtx)과 같은 규칙(정확 포함 → 편집거리 1 유일). */
export function pickShipCtx(query, voyages, ctxVoyageKey = null) {
  const Q = String(query || '').toUpperCase();
  const _fallback = () => {
    if (ctxVoyageKey) {
      const v = (voyages || {})[ctxVoyageKey];
      if (v?.info) return { key: ctxVoyageKey, info: v.info, v, has: true };
    }
    //  이름도 열린 항차도 없는데 «작업중인 배» 라고 불렀으면 지금 일하는 배(3.41-01). 여럿이면 여기서는 고르지 않는다 —
    //  떠 있는 미르가 workingShipCtx 로 «어느 배?» 하고 되묻는다.
    if (WORKING_SHIP_RE.test(String(query || ''))) { const w = workingShipCtx(voyages); return (w && w.key) ? w : null; }
    return null;
  };
  if (Q.length < 3) return _fallback();
  let best = null;
  Object.entries(voyages || {}).forEach(([k, v]) => {
    const i = v?.info; if (!i) return;
    const names = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
    if (names.some((nm) => nm.length >= 3 && Q.includes(nm))) {
      const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
      if (!best || (has && !best.has)) best = { key: k, info: i, v, has };
    }
  });
  if (!best) {
    const dl1 = (a, b) => {
      if (a === b) return true;
      const la = a.length, lb = b.length;
      if (Math.abs(la - lb) > 1) return false;
      if (la === lb) {
        const diff = [];
        for (let x = 0; x < la; x++) if (a[x] !== b[x]) diff.push(x);
        if (diff.length === 1) return true;
        if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
        return false;
      }
      const [s, l] = la < lb ? [a, b] : [b, a];
      let si = 0, li = 0, used = false;
      while (si < s.length && li < l.length) {
        if (s[si] === l[li]) { si++; li++; continue; }
        if (used) return false;
        used = true; li++;
      }
      return true;
    };
    const toks = Q.split(/[^A-Z0-9]+/).filter((w) => /^[A-Z]{3,8}$/.test(w));
    const byShip = new Map();
    Object.entries(voyages || {}).forEach(([k, v]) => {
      const i = v?.info; if (!i) return;
      const names2 = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
      if (names2.some((nm) => nm.length >= 3 && toks.some((tk) => dl1(tk, nm)))) {
        const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
        const shipId = String(i.vsl || names2[0] || k).toUpperCase();
        const prev = byShip.get(shipId);
        if (!prev || (has && !prev.has)) byShip.set(shipId, { key: k, info: i, v, has });
      }
    });
    if (byShip.size === 1) best = [...byShip.values()][0];
  }
  return best || _fallback();
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirFacts] 사실 창구 — 컨 속성 · 항차 사실   (종전 src/mirFacts.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르 창구 15건 — 앱이 이미 갖고 있는 값을 말로 답한다(개체 조회 + 항차 사실). 판정은 utils·tallyReport 한 벌을 그대로 부른다.
/* ★ TallyOne 3.41 (검수사 2026-09-10 «전 미르가 앱이 갖고 있는 자료를 막힘없이 답할 수 있느냐가 중요합니다» ·
     «그간의 사용데이터로 생각하면 안됩니다 … 어떤질문이 들어 올지는 저도 모릅니다. 제가 원하는건 그질문들에 적당한 답을 해주길 원합니다»)

   왜 이 파일이 있나 — 값은 전부 있었다. `reeferTempOf`(온도)·`sl`(실번호)·`wt`(중량)·`computeTallyData`(마감텔리)·
   `berthSideOf`(현측)·`overDims`(치수)·`__STG__`(임시창고)·`xraySeals`(커트씰)·`npod/tspot/fpod`·`bl/sh`·`held/luggConfirm`.
   말로 묻는 **창구**만 없었다(관문 2 실측 — 15건). 그리고 «3426 온도»는 온도 낱말이 끝네자리를 지워 버려서 답이 안 나왔다
   (nlSearch skipDigits — 3.41 에서 홀로 선 네 자리는 살린다).

   ⚠ 여기서 판정을 새로 만들지 않는다 — 규범 §4-4. 온도 상태(A·B·C)는 `reeferTempOf`, 자리는 `effectivePos`,
     현측은 `berthSideOf`, 마감 수치는 `computeTallyData` 가 정본이다. 이 파일은 그 값을 **문장으로 옮길 뿐**이다.
   ⚠ 순수 함수다 — ctx 만 본다(window·RTDB 안 봄). 검수앱 세 화면·떠 있는 미르·콘앱이 같은 ctx 모양으로 부른다.
     ctx = { containers(양하+선적 병합, _mode·_comp·_xray), voyage(info·discharge·loading·reports·photos), info, mode,
             computeTallyData(마감텔리 완제품 함수 — 검수앱이 싣는다) }
   ⚠ `tallyReport.js` 를 여기서 import 하지 않는다 — twin.js → shipStructure.js → 베이사전 1.2MB 가 콘앱 미르 번들에 딸려 온다(실측).
     검수앱은 ctx.computeTallyData 로 실어 주고, 콘앱은 «검수앱에서 물어 달라»고 말한다. */
const S = (v) => (v == null ? '' : String(v).trim());
const feKo = (c) => (S(c.fe).toUpperCase() === 'E' ? '엠티' : '풀');
const modeKo = (c) => (c._mode === 'loading' ? '선적' : c._mode === 'transit' ? '통과' : '양하');
function hhmm(ms) {
  if (!ms) return '';
  try { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch (e) { return ''; }
}
function specOf(c) {
  const lab = isoToLabel(c.iso || c.tp) || S(c.iso) || S(c.tp);
  return lab || '규격 미상';
}
function posOf(c) {
  if (c && c.deckPos) return String(c.deckPos);   // 4.04-02: RZOR — 덱플랜 좌표(C_8_21). 베이 자리 말은 베이 좌표가 있는 배만.
  const p = effectivePos(c);
  if (p.inStorage) return '임시창고';
  if (!p.bay) return '자리 미정';
  const tag = p.src === 'actual' ? '(실체)' : p.src === 'assign' ? '(지정)' : '';
  return `${p.bay}-${p.row}-${p.tier}${tag}`;
}
/** 한 대의 머리줄 — 컨번호 · 규격 풀/엠티 · 양하/선적 · 자리. 창구마다 같은 첫 줄(§4-4). */
export function entityHead(c) {
  return `${S(c.cn)} · ${specOf(c)} ${feKo(c)} · ${modeKo(c)} · ${posOf(c)}`;
}
function secOf(ctx, mode) { return (ctx && ctx.voyage && ctx.voyage[mode]) || {}; }
function xrayOf(ctx, c) {
  const d = secOf(ctx, 'discharge');
  const inList = !!((d.xrayList || {})[c.cn]) || !!c._xray || !!c.isXray;
  const seal = (d.xraySeals || {})[c.cn] || c._xraySeal || c.xraySeal || null;
  return { inList, seal };
}
function findByDigits(ctx, digits) {
  const d = S(digits);
  if (!d) return [];
  const cs = (ctx && ctx.containers) || [];
  //  끝 4자리 — 여러 대면 전부(검수사 확정 «끝4자리가 두 대면 두 대 다»). 컨번호 전체를 쳤으면 그것만.
  const full = cs.filter((c) => S(c.cn).toUpperCase() === d.toUpperCase());
  if (full.length) return full;
  return cs.filter((c) => S(c.cn).slice(-4) === d.slice(-4));
}

/* ── 개체 창구 — «3426 온도» «0230 실번호» «0230 중량» «7758 다음 항» «0230 비엘» «0230 치수» «0686 엑스레이» «0230 완료했어» ── */
function attrLine(c, attr, ctx) {
  switch (attr) {
    case 'temp': {
      const r = reeferTempOf(c);
      if (!r.target) {
        const looksRf = isReeferContainer(c) || (!c.iso_pick && isReeferIso(S(c.tp)));   // 3.60-10 (진단 M6): 리퍼 판정 한 벌(ASC 장비코드 tp 도 같은 벌) · 4.15 (§7.8-⑨): 검수사가 고른 규격(iso_pick)이 tp 를 이긴다
        if (!looksRf) return '리퍼가 아니에요 — 온도 없음.';
        if (c.rfdry) return '리퍼드라이(넌플러그)라 온도 대상이 아니에요.';
        if (c.mkcon) return '특수제작컨이라 온도 대상이 아니에요.';
        if (reeferTempExempt(c) === 'lugg') return '수화물 컨이라 온도 대상이 아니에요.';   // 3.70-01
        return '엠티 리퍼라 온도 대상이 아니에요(리퍼는 풀일 때만 리퍼).';
      }
      if (r.state === 'A') return '세팅 온도 기록 없음(EDI·리스트 모두 빈칸) — 사진으로 확인해 주세요.';
      if (r.state === 'B') return `세팅 ${r.set}℃ · 실측 없음 — 사진 필요.`;
      const src = c.rfSrc === 'photo' ? '(사진)' : c.rfSrc === 'manual' ? '(손입력)' : '';
      const who = c.rfCheckedBy ? ` ${c.rfCheckedBy}` : '';
      const when = c.rfCheckedAt ? ` ${hhmm(c.rfCheckedAt)}` : '';
      return `세팅 ${r.set}℃ · 실측 ${r.act}℃${src}${who}${when} · 차이 ${r.diff == null ? '계산 불가' : (r.diff > 0 ? '+' : '') + r.diff + '℃'}`;
    }
    case 'seal': {
      const parts = [];
      if (S(c.sl)) {
        const src = S(c.sl_src) || S(c.sl_conflict && c.sl_conflict.src) || S(c._source);
        parts.push(`실번호 ${c.sl}${src ? '(' + src + ')' : ''}${S(c.sl_orig) && S(c.sl_orig) !== S(c.sl) ? ' · 리스트 원래값 ' + c.sl_orig : ''}`);
      }
      if (Array.isArray(c.sl_conflict) && c.sl_conflict.length > 1) {
        const vals = [...new Set(c.sl_conflict.map((h) => S(h.sl)).filter(Boolean))];
        if (vals.length > 1) parts.push(`⚠ 리스트끼리 다름 ${vals.join(' ↔ ')}`);
      }
      if (S(c.eseal)) parts.push(`엠티실 ${c.eseal}${c.eseal_wrong ? '(오류 표시)' : ''}`);
      const x = xrayOf(ctx, c);
      if (x.seal && S(x.seal.seal)) parts.push(`커트씰 ${x.seal.seal}${S(x.seal.sealer) ? ' 봉인자 ' + x.seal.sealer : ''}`);
      else if (x.inList) parts.push('X-RAY 대상 · 커트씰 아직 없음');
      return parts.length ? parts.join(' · ') : '실번호 없음 — EDI·리스트·기록 어디에도 없어요.';
    }
    case 'weight': {
      const w = Number(c.wt);
      if (!w) return '중량 기록 없음(EDI·리스트 모두 빈칸).';
      return `${w.toLocaleString()}kg${S(c.wtt) ? ' (' + c.wtt + ')' : ''}${c.cgWt ? ' · 화물 ' + Number(c.cgWt).toLocaleString() + 'kg' : ''}`;
    }
    case 'route': {
      const a = [];
      if (S(c.pol)) a.push(`POL ${c.pol}`);
      if (S(c.pod)) a.push(`POD ${c.pod}`);
      if (S(c.npod)) a.push(`다음 양하항 ${c.npod}`);
      if (S(c.tspot)) a.push(`환적항 ${c.tspot}`);
      if (S(c.fpod) || S(c.podFinal)) a.push(`최종 목적지 ${S(c.fpod) || S(c.podFinal)}`);
      if (S(c.printpod)) a.push(`리스트 POD ${c.printpod}`);
      return a.length ? a.join(' · ') : '항구 정보 없음.';
    }
    case 'bl': {
      const a = [];
      if (S(c.bl) && S(c.bl) !== '1') a.push(`B/L ${c.bl}`);
      if (S(c.sh)) a.push(`송하인 ${c.sh}`);
      if (S(c.desc)) a.push(`품명 ${c.desc}`);
      return a.length ? a.join(' · ') : 'B/L·송하인 기록 없음 — EDI 는 안 주고 리스트에도 없어요.';
    }
    case 'dims': {
      const d = overDims(c) || {};
      if (d.over) return `규격초과 ${d.short || d.parts || ''}${d.deck ? ' · 데크 적재' : ''}`.trim();
      if (c.oog || c.fr || c.ot) return `규격초과 표시(${[c.oog && 'OOG', c.fr && 'FR', c.ot && 'OT'].filter(Boolean).join('·')})는 있는데 치수 기록이 없어요${S(c.oogDim) ? ' · EDI 치수 ' + c.oogDim : ''}.`;
      return '규격초과 아님.';
    }
    case 'xray': {
      const x = xrayOf(ctx, c);
      if (!x.inList) return 'X-RAY 대상 아님.';
      return `X-RAY 대상${x.seal && S(x.seal.seal) ? ' · 커트씰 ' + x.seal.seal + (S(x.seal.sealer) ? ' 봉인자 ' + x.seal.sealer : '') : ' · 커트씰 아직 없음'}`;
    }
    case 'status': {
      const sec = secOf(ctx, c._mode === 'loading' ? 'loading' : 'discharge');
      const h = (sec.held || {})[c.cn];
      const lg = (sec.luggConfirm || {})[c.cn];
      const a = [];
      const comp = c._comp || c.comp;
      a.push(comp ? `완료 ${hhmm(comp.at)}${S(comp.by) ? ' ' + comp.by : ''}${S(comp.equip) ? ' ' + (/호기$/.test(S(comp.equip)) ? comp.equip : comp.equip + '호기') : ''}` : '미완료');
      if (h && !h.doneAt) a.push(`보류(${S(h.reason) || '사유 없음'}${S(h.by) ? ' ' + h.by : ''})`);
      if (lg) a.push(`수화물 확인${S(lg.by) ? ' ' + lg.by : ''}`);
      if (c.lugg) a.push('수화물');
      if (c.urgent) a.push('긴급');
      if (c.mkcon) a.push('특수제작컨');
      if (effectivePos(c).inStorage) a.push('임시창고');
      return a.join(' · ');
    }
    case 'spec': return `${specOf(c)} ${feKo(c)}${c.rf ? ' · 리퍼' : ''}${c.dg ? ' · 위험물' : ''}${c.fr ? ' · FR' : ''}${c.ot ? ' · OT' : ''}${c.tk ? ' · 탱크' : ''}`;
    default: return '';
  }
}

/** 개체 창구 — parsed.digits + parsed.entityAttr 일 때만. 못 찾으면 «없어요», 창구가 아니면 null. */
export function answerEntityFacts(parsed, ctx) {
  if (!parsed || !parsed.digits || !parsed.entityAttr) return null;
  const hits = findByDigits(ctx, parsed.digits);
  if (!hits.length) return `끝네자리 ${String(parsed.digits).slice(-4)} — 이 항차에 없어요.`;
  return hits.map((c) => `${entityHead(c)}\n${attrLine(c, parsed.entityAttr, ctx)}`).join('\n');
}

/* ── 항차 창구 — 마감텔리 수치 · 해치커버 · 접안 현측 · 작업 시작·종료 실적 · 규격초과 · 엠티실 · 특수제작컨 · 임시창고 · 커트씰 · 보류 · 수화물확인 · 환적 ── */
function shipLabel(ctx) { const i = (ctx && ctx.info) || {}; return S(i.vsl) || S(ctx && ctx.vsl) || '이 배'; }
function fullVoyage(ctx) { return (ctx && ctx.voyage) || null; }

export function answerVoyageFacts(parsed, ctx) {
  if (!parsed || !parsed.factQuery) return null;
  const v = fullVoyage(ctx);
  const info = (ctx && ctx.info) || (v && v.info) || {};
  const cs = (ctx && ctx.containers) || [];
  const ship = shipLabel(ctx);
  const k = parsed.factQuery;
  try {
    if (k === 'tally') {
      if (!v) return null;
      if (typeof ctx.computeTallyData !== 'function') return `${ship} 마감텔리 수치는 검수앱 미르에게 물어 주세요 — 콘앱은 그 계산을 싣지 않아요.`;
      const t = ctx.computeTallyData(v);
      const s = (o) => `풀 20 ${o.F['20'] || 0}·40 ${o.F['40'] || 0}·HC ${o.F.HC || 0}·45 ${o.F['45'] || 0} / 엠티 20 ${o.E['20'] || 0}·40 ${o.E['40'] || 0}·HC ${o.E.HC || 0}`;
      const L = [`${ship} ${S(info.voy)} 마감텔리 수치(지금 기준)`];
      L.push(`양하 ${t.totals.dis.n}대 — ${s(t.totals.dis)}`);
      L.push(`선적 ${t.totals.load.n}대 — ${s(t.totals.load)}`);
      if (t.totals.shift && t.totals.shift.n) L.push(`시프팅 ${t.totals.shift.n}대`);
      L.push(`OOG in ${((t.osIn || {}).rows || []).length} · out ${((t.osOut || {}).rows || []).length} / RF in ${(t.rfIn || []).length} · out ${(t.rfOut || []).length} / 데미지 in ${((t.damage || {}).dmIn || []).length} · out ${((t.damage || {}).dmOut || []).length}`);
      if (t.sealIn && t.sealIn.length) L.push(`실 목록 in ${t.sealIn.length}`);
      L.push('(마감텔리 파일 자체는 수석 보드에서 만듭니다)');
      return L.join('\n');
    }
    if (k === 'hatch') {
      if (parsed.bay) return null;   // «12번 해치 몇 대» 는 베이 조회다
      if (!v) return null;
      let bayDef = null;
      try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[S(info.vsl).toUpperCase()] : null; bayDef = d ? (d.bayDef || d) : null; } catch (e) { bayDef = null; }
      const a = answerHatchStatus({ ...v, key: ctx.voyageKey || '', _key: ctx.voyageKey || '' }, bayDef, S(info.vslFull) || ship);
      if (a) return a;
      const hd = info.hatchDone || {};
      const ks = Object.keys(hd);
      if (ks.length) return `${ship} 해치커버 — ${ks.map((b) => `${b.replace(/^discharge_/, '')} ${hd[b] === 'open' ? '열림' : '닫힘'}`).join(' · ')}`;
      return `${ship} 해치커버 보고 기록이 아직 없어요.`;
    }
    if (k === 'berthSide') {
      const side = berthSideOf(info);
      const src = S(info.berthSidePick) ? '검수사 지정' : S(info.berthSide) ? '수집기(터미널 화면)' : '';
      if (!side) return `${ship} 접안 현측 기록 없음 — 수집기 값도 검수사 지정도 비어 있어요. 배를 보고 정해 주세요(작업 시작 탭 «접안?»).`;
      return `${ship} ${side === 'starboard' ? '우현' : '좌현'} 접안(${src}) — 바다를 보고 서면 선수가 ${side === 'starboard' ? '오른쪽' : '왼쪽'}이에요.`;
    }
    if (k === 'workTimes') {
      const ats = [];
      for (const m of ['discharge', 'loading']) {
        const comp = (v && v[m] && v[m].completed) || null;
        if (comp) for (const c of Object.values(comp)) { if (c && typeof c.at === 'number' && c.at > 0) ats.push(c.at); }
      }
      if (!ats.length) for (const c of cs) { const cp = c._comp || c.comp; if (cp && typeof cp.at === 'number') ats.push(cp.at); }
      ats.sort((a, b) => a - b);
      const reps = Object.values((v && v.reports) || {}).filter((r) => r && r.type === 'work_status');
      const starts = reps.filter((r) => /_start$/.test(S(r.action))).map((r) => r.ts).filter(Boolean).sort((a, b) => a - b);
      const dones = reps.filter((r) => /_done$/.test(S(r.action))).map((r) => r.ts).filter(Boolean).sort((a, b) => a - b);
      const L = [];
      if (S(info.workStartAt)) L.push(`작업 시작 ${S(info.workStartAt).slice(5)}(터미널)`);
      if (S(info.workStartManual)) L.push(`말로 알린 시작 ${S(info.workStartManual)}`);
      if (starts.length) L.push(`검수 시작 보고 ${hhmm(starts[0])}`);
      if (ats.length) L.push(`첫 완료 ${hhmm(ats[0])} · 마지막 완료 ${hhmm(ats[ats.length - 1])} (검수 기록 ${ats.length}대)`);
      if (info.dischargeDoneAt) L.push(`양하 완료 ${hhmm(info.dischargeDoneAt)}`);
      if (info.loadingDoneAt) L.push(`선적 완료 ${hhmm(info.loadingDoneAt)}`);
      if (dones.length) L.push(`종료 보고 ${hhmm(dones[dones.length - 1])}`);
      if (S(info.workEndAt)) L.push(`작업 종료 ${S(info.workEndAt).slice(5)}(터미널)`);
      if (S(info.atbActual)) L.push(`접안 ${S(info.atbActual).slice(5)}`);
      if (S(info.atdActual)) L.push(`이안 ${S(info.atdActual).slice(5)}`);
      return L.length ? `${ship} — ${L.join(' · ')}` : `${ship} 시작·종료 기록이 아직 없어요 — 완료 체크가 찍히면 그때부터 답할 수 있어요.`;
    }
    if (k === 'oog') {
      const hit = cs.filter((c) => c._ptk !== false && (c.oog || c.fr || c.ot || (overDims(c) || {}).over));
      if (!hit.length) return `${ship} 규격초과(OOG·FR·OT) 컨 없음 — EDI·리스트 기준.`;
      return `${ship} 규격초과 ${hit.length}대\n` + hit.map((c) => `${entityHead(c)} · ${attrLine(c, 'dims', ctx)}`).join('\n');
    }
    if (k === 'eseal') {
      const e = cs.filter((c) => c._mode === 'loading' && S(c.fe).toUpperCase() === 'E' && c._ptk !== false);
      if (!e.length) return `${ship} 선적 엠티가 없어 엠티실 대상도 없어요.`;
      const done = e.filter((c) => S(c.eseal));
      const L = [`${ship} 선적 엠티 ${e.length}대 · 실 붙인 것 ${done.length}대 · 남은 것 ${e.length - done.length}대`];
      const es = ctx && ctx.eseal;
      if (es && es.ranges && es.ranges.length) L.push(`실 범위 ${es.ranges.map((r) => (typeof r === 'string' ? r : `${r.from || r.start || ''}~${r.to || r.end || ''}`)).join(', ')}${es.remainN != null ? ' · 남은 실 ' + es.remainN + '개' : ''}`);
      if (/번호|목록|리스트|어떤/.test(S(parsed._raw)) && done.length) L.push(done.slice(0, 30).map((c) => `${c.cn} ${c.eseal}`).join('\n') + (done.length > 30 ? `\n… 외 ${done.length - 30}대` : ''));
      return L.join('\n');
    }
    if (k === 'mkcon') {
      const hit = cs.filter((c) => c.mkcon);
      if (!hit.length) return `${ship} 특수제작컨 표시된 컨 없음 — 리스트 REMARK·예보·수동 표시 기준.`;
      return `${ship} 특수제작컨 ${hit.length}대\n` + hit.map(entityHead).join('\n');
    }
    if (k === 'storage') {
      const hit = cs.filter((c) => effectivePos(c).inStorage);
      if (!hit.length) return `${ship} 임시창고에 둔 컨 없음.`;
      return `임시창고 ${hit.length}대\n` + hit.map((c) => `${S(c.cn)} · ${specOf(c)} ${feKo(c)} · ${modeKo(c)}${c.actual_by ? ' · ' + c.actual_by : ''}${c.actual_at ? ' ' + hhmm(c.actual_at) : ''}`).join('\n');
    }
    if (k === 'cutSeal') {
      const d = secOf(ctx, 'discharge');
      const xl = d.xrayList || {}; const xs = d.xraySeals || {};
      let keys = Object.keys(xl);
      if (!keys.length) keys = cs.filter((c) => c._xray || c.isXray).map((c) => c.cn);
      if (!keys.length) return `${ship} X-RAY 대상이 없어 커트씰도 없어요.`;
      const n = keys.filter((cn) => xs[cn] && S(xs[cn].seal)).length;
      return `${ship} X-RAY 대상 ${keys.length}대 · 커트씰 기록 ${n}대\n` + keys.map((cn) => {
        const c = cs.find((x) => x.cn === cn);
        const s = xs[cn] || (c && (c._xraySeal || c.xraySeal)) || null;
        return `${cn}${c ? ' @ ' + posOf(c) : ''} — ${s && S(s.seal) ? '커트씰 ' + s.seal + (S(s.sealer) ? ' 봉인자 ' + s.sealer : '') : '커트씰 아직 없음'}`;
      }).join('\n');
    }
    if (k === 'held') {
      const h = { ...(secOf(ctx, 'discharge').held || {}), ...(secOf(ctx, 'loading').held || {}) };
      const ks = Object.keys(h).filter((cn) => h[cn] && !h[cn].doneAt);
      if (!ks.length) return `${ship} 보류 중인 컨 없음.`;
      return `보류 ${ks.length}대\n` + ks.map((cn) => `${cn} · ${S(h[cn].reason) || '사유 없음'}${S(h[cn].by) ? ' ' + h[cn].by : ''}${h[cn].at ? ' ' + hhmm(h[cn].at) : ''}${S(h[cn].equip) ? ' · ' + (/호기$/.test(S(h[cn].equip)) ? h[cn].equip : h[cn].equip + '호기') : ''}`).join('\n');
    }
    if (k === 'lugg') {
      const lg = { ...(secOf(ctx, 'discharge').luggConfirm || {}), ...(secOf(ctx, 'loading').luggConfirm || {}) };
      const ks = Object.keys(lg);
      const tot = cs.filter((c) => c.lugg).length;
      if (!ks.length) return tot ? `${ship} 수화물 컨 ${tot}대 중 확인 기록 0대.` : `${ship} 수화물 확인 기록 없음(수화물 컨 등록도 없음).`;
      return `${ship} 수화물 확인 ${ks.length}대${tot ? ' / 수화물 컨 ' + tot + '대' : ''}\n` + ks.map((cn) => `${cn}${S(lg[cn].by) ? ' · ' + lg[cn].by : ''}${lg[cn].at ? ' ' + hhmm(lg[cn].at) : ''}`).join('\n');
    }
    if (k === 'transship') {
      const hit = cs.filter((c) => S(c.npod) || S(c.tspot) || S(c.fpod));
      if (!hit.length) return `${ship} 다음 항·환적·최종목적지가 적힌 컨 없음(EDI 기준).`;
      const by = {};
      for (const c of hit) {
        const key = [S(c.npod) && '다음 양하항 ' + c.npod, S(c.tspot) && '환적항 ' + c.tspot, S(c.fpod) && '최종 목적지 ' + c.fpod].filter(Boolean).join(' · ');
        by[key] = (by[key] || 0) + 1;
      }
      return `${ship} 다음 항·환적·최종목적지가 적힌 컨 ${hit.length}대\n` + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([kk, n]) => `${kk} — ${n}대`).join('\n');
    }
  } catch (e) {
    console.warn('[미르 창구] 답 만들기 실패:', k, e);
    return null;
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirEyes] 한 대를 보는 겹 — 순서 · 트윈 · 자리   (종전 src/mirEyes.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
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

const eyePosOf = (c) => c?.deckPos ? String(c.deckPos) : (c?.bay && c?.row && c?.tier) ? `${c.bay}-${c.row}-${c.tier}` : '';   // 4.04-02: RZOR 덱플랜 좌표 먼저
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
  //  4.08-02: 총중량 먼저(twinWtOf) · **경보와 싱글 권유뿐** — 막지 않는다(검수사 2026-10-07 «무게가 55톤을 초과하면 싱글 작업을 권유 하되 들수 있으면 트윈작업을 합니다»).
  const wa = twinWtOf(card.main), wb = twinWtOf(card.twin);
  if (!wa || !wb) return '\n  ⚠ 무게가 없는 컨이 있습니다 — 트윈 하중을 못 잽니다. 눈으로 확인하십시오.';
  const total = wa + wb, diff = Math.abs(wa - wb);
  if (total > TWIN_MAX_TOTAL_KG) {
    return `\n  ⚠ **싱글 권유** — 총중량(EDI) 합계 ${formatWt(total)} (55톤 초과). 싱글로 한 대씩 내리기를 권합니다. 들 수 있으면 트윈으로 하십시오.`;
  }
  const limit = twinDiffLimit(pier);
  if (diff > limit) return `\n  ⚠ 총중량(EDI) 무게차 ${formatWt(diff)} (${pier || '부두 미상'} 한계 ${formatWt(limit)}) — 수평이 안 맞습니다.`;
  if (total > TWIN_CAUTION_TOTAL_KG) return `\n  ⚠ 총중량(EDI) 합계 ${formatWt(total)} (50톤 넘음) — 한계 근처입니다. 확인하고 트윈 하십시오.`;
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
    if (eyePosOf(x)) bits.push(eyePosOf(x));
    const ft = feetOf(x.iso); if (ft) bits.push(ft);
    if (x.rf && String(x.tmp ?? '').trim() !== '') bits.push(`리퍼 ${x.tmp}°C`);
    if (x._xray || x.isXray) bits.push('🔍 X-RAY');
    return bits.join(' · ');
  };
  if (t) {
    const w = twinWarn(card, pier);
    //  4.08-02: 55톤을 넘으면 «두 대 한 번에» 라고만 말하지 않는다 — 싱글을 권하되 들 수 있으면 트윈이다(검수사 2026-10-07).
    const head2 = w.includes('싱글 권유') ? `${head} — **트윈 자리입니다. 합계가 55톤을 넘어 싱글을 권합니다.**` : `${head} — **트윈입니다. 두 대 한 번에.**`;
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
/* ★ 2.88 (검수사 지시 2026-08-30) — 커버 상태를 읽는 한 벌.
     검수사 — *«수동 보고를 하면 자동가이드 사용시 커버가 열린줄도 닫힌줄도 모른단 겁니다»*
   커버는 배에 하나뿐이라 모드로 갈리지 않는다. 새 키(모드 없음)를 먼저 보고,
   없으면 옛 키(`loading_N`·`discharge_N`)를 **양쪽 다** 받아 준다. */
function _hatchState(info, center) {
  const hd = (info && info.hatchDone) || {};
  return hd[String(center)] ?? hd[`loading_${center}`] ?? hd[`discharge_${center}`];
}

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

  //  3.40: 화면(GuidedWorkPanel)과 **같은 한 벌**로 읽는다 — 미르가 한글 '우현' 을 못 알아보고
  //    좌현 차례를 부르던 것을 막는다(검수사 «좌현으로 고정됨»).
  const side = berthSideOf(info);
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
          const st = _hatchState(info, lc);   // 2.88: 커버는 모드로 갈리지 않는다
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
      const st = _hatchState(info, center);   // 2.88: 커버는 모드로 갈리지 않는다
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
  //  4.09: 이 기기의 호기로 읽는다 — 호기 칸 → 전체 칸 → 옛 항차 seqRowFrom (화면 GuidedWorkPanel 과 같은 workOrderOf 한 벌)
  let myEquip = ''; try { myEquip = String(getEquipNumber() || '').trim(); } catch (e) { myEquip = ''; }
  const wo = workOrderOf(info, myEquip);
  try {
    queue = buildGuidedQueue({
      containers: pool, mode,
      evenRowsSeaSide: side === 'starboard',    // 우현 접안 = 짝수 로우가 해상쪽
      findTwin: (t, arr, used) => findTwinCandidate(t, arr, used, info.imo || '', info.vsl || ''),
      streamPref: null,
      rowFrom: wo.rowFrom,                                   // 3.3: 양하 «해상부터» — 자동 가이드와 한 벌 (4.09: 이 기기 호기의 순서 조건)
      orderPrefs: mode === 'discharge' ? wo.prefs : null,    // 4.09: 양하 부류 조건(리퍼부터·20부터…) — 화면과 같은 읽기
      //  3.72-01: 선적 도착항 순위는 완료한 컨을 포함한 전체 계획으로 잰다 — 화면(GuidedWorkPanel)과 한 벌
      planAll: all.filter((c) => c && c._ptk !== false && (c._mode || mode) === mode && c.bay),
    }) || [];
  } catch (e) { return null; }
  if (!queue.length) return null;

  const done = all.filter((c) => c && compOf(c) && (c._mode || mode) === mode).length;
  const lines = [];
  if (head) {
    lines.push(head);
    //  4.09: 조건을 걸어 둔 호기는 어떤 순서로 부르는지 한 줄 밝힌다(조건이 없으면 종전과 같은 답)
    if (mode === 'discharge' && (wo.rowFrom === 'sea' || wo.prefs.length)) lines.push(`순서 ${workOrderText(wo)}`);
  } else {
    //  2.51: 베이를 안 댔으면 **어느 베이부터인지 반드시 말한다.** 갱마다 베이가 다르다 —
    //    「4호기」를 단 검수사에게 남의 베이를 부르면 그것이 틀린 답이다.
    const b0 = queue[0] && queue[0].main ? String(queue[0].main.bay) : '';
    lines.push(`${mode === 'loading' ? '선적' : '양하'} — 남은 ${remaining.length}대 (완료 ${done}대) · ${side === 'starboard' ? '우현' : '좌현'} 접안${mode === 'discharge' && (wo.rowFrom === 'sea' || wo.prefs.length) ? ` · ${workOrderText(wo)}` : ''}`
      + (b0 ? `\n  ${b0}번 베이부터입니다. 다른 베이면 «○번 베이 ${mode === 'loading' ? '선적' : '양하'}하자» 라고 하십시오.` : ''));
  }
  lines.push(sayCard(queue[0], wish ? null : (goneHere != null ? goneHere + 1 : done + 1), info.pier || ''));
  //  다음 둘까지만 미리 알려 준다 — 갑판에서는 귀로 듣는다. 길면 안 들린다.
  const nBase = wish ? 1 : (goneHere != null ? goneHere + 1 : done + 1);
  const peek = queue.slice(1, 3).map((c, i) => `  ${nBase + 1 + i}. ${l4(c.main)} ${eyePosOf(c.main)}${c.twin ? ` + ${l4(c.twin)} (트윈)` : ''}`);
  if (peek.length) lines.push('다음 예정\n' + peek.join('\n'));
  return lines.filter(Boolean).join('\n');
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirAnswer] 답 고르기 한 벌 — answerOneRaw   (종전 src/mirAnswer.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르 답 고르기 한 벌 — 검수앱 세 화면·떠 있는 미르·콘앱이 전부 이 answerOne 하나를 부른다(어디서 물어도 같은 답).
/* ★ TallyOne 3.41 / ConeOne 2.48 (검수사 2026-09-10)
     «미르를 하나로 만들고 싶습니다» · «미르를 앱 어디에든 항상 띄워서 모든 질문을 받을수 있게 해주세요» ·
     «전 미르가 앱이 갖고 있는 자료를 막힘없이 답할 수 있느냐가 중요합니다»

   ── 왜 이 파일이 있나
   답을 고르는 자리가 **넷**이었다(관문 2 실측 2026-09-10) — 작업창 SearchPanel(1035~1241) · 양하선적 탭 카드
   VoyagePage(2786~2817) · 홈 GlobalSearchPage(325~805) · 콘앱 엔진 mirCore.entry(69~239).
   같은 질문이 화면마다 다르게 답했다 — 트윈은 작업창만, 해치커버는 홈만, 시프팅은 홈에서 자료가 안 들어가고,
   경고문 설명은 작업창만, 뜻 질문은 작업창 게이트(hasAnyCondition)에 막혔다.
   ⇒ 네 벌을 **여기 한 벌**로 내린다. 화면은 재료(ctx)만 싣고 답은 여기서 고른다(규범 §4-4 «같은 판정은 한 벌»).

   ── ctx 계약 (화면이 실을 수 있는 만큼 싣는다 · 없으면 그 갈래는 조용히 건너뛴다)
   { app:'tally'|'cone',
     // 항차 맥락
     voyageKey, voyage(info·discharge·loading·photos·reports 원본), info, containers(양하+선적 병합 · _mode·_ptk·_comp·_xray), mode,
     compMap, shiftMap, bayPairs|pairsMap, rfSkip, esealBrief|eseal, photos, pilotForecast, portMisData, weatherText,
     shipSpeed, carrierContacts, shipContacts, diagAlerts, inspector, isChief, handover:{note, finalized}, lastTopic, modeChoice,
     gangShift(n)·crewAnswer(cq)·gangBrief() 클로저(화면이 감싸 준다 — 없으면 여기서 voyage 로 만든다),
     // 전역 맥락(홈·수석·떠 있는 미르)
     voyages(전 항차), flat(전 항차 컨), shipCtx({key,info,v,has} — 질문 속 배), chiefData, heartbeat, ediPattern,
     // 동작
     execDevice(밝기·소리를 여기서 실행해도 되는 자리만 true), smallTalkLast(검수앱 true), cone:{rows…}(콘앱) }

   답을 못 내면 null. 화면은 null 이면 종전대로 카드·릴레이·안내를 낸다. */
//  (S 는 위 [mirFacts] 절의 것과 글자까지 같은 선언이라 한 번만 둔다)
const READY_RE = /자료\s*(?:현황|다\s*있|준비|빠|없|부족|미도착|왔)|어느\s*(?:선박|배|선사)[^?]*(?:없|빠|안\s*왔)|안\s*온\s*자료|EDI\s*(?:없|왔|들어왔)|리스트\s*(?:없|왔|들어왔)|베이플랜\s*(?:없|왔)/;
const _bayDefOf = (vsl) => { try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[S(vsl).toUpperCase()] : null; return d ? (d.bayDef || d) : null; } catch (e) { return null; } };
const _fmtDT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 ${m[4]}:${m[5]}` : null; };
const _pT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
function _shipsOnDay(voyages, off) {
  const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off).getTime();
  const d1 = d0 + 24 * 3600 * 1000;
  return Object.entries(voyages || {}).map(([k, v]) => {
    const seg = String(v?.info?.planDate || '').split('~');
    const a = _pT(seg[0]); const b = seg[1] ? _pT(seg[1]) : a;
    return { k, v, a, b: (b == null ? a : b) };
  }).filter((x) => x.a != null && x.a < d1 && x.b >= d0).sort((x, y) => x.a - y.a);
}

/** 항차 맥락을 한 모양으로 편다 — 화면이 voyage 만 실어도 info·vsl·컨·완료·클로저를 여기서 채운다. */
function _normalize(ctx) {
  const c = { ...(ctx || {}) };
  if (c.shipCtx && !c.voyage) {   // 홈·떠 있는 미르 — 질문 속 배를 항차 맥락으로 승격
    c.voyage = c.shipCtx.v || null; c.voyageKey = c.voyageKey || c.shipCtx.key || null;
    if (!c.containers && Array.isArray(c.flat)) c.containers = c.flat.filter((x) => x.voyageKey === c.shipCtx.key);
  }
  const v = c.voyage || null;
  if (!c.info) c.info = (v && v.info) || null;
  if (!c.vsl) c.vsl = S(c.info && c.info.vsl);
  if (!c.vslFull) c.vslFull = S(c.info && c.info.vslFull);
  if (c.pier == null) c.pier = S(c.info && c.info.pier);
  if (!c.containers) c.containers = [];
  //  ★ 3.72-02 — 리퍼 체크 안 하는 배(머스크 계열). 항차 화면은 rfSkip 을 실어 오지만 홈 통합검색·떠 있는 미르·콘앱은 안 싣는다 —
  //    그래서 브리핑·인수인계에 «실물온도 미확인 N대» 가 샜다. 여기서 선사(항차 info.carrier · 사전 carrier · 콘앱 ctx.dictCarrier)로 스스로 판정한다(utils 한 벌).
  {
    let car = '';
    try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[S(c.info && c.info.vsl).toUpperCase()] : null; car = (d && d.carrier) || ''; } catch (e) { car = ''; }
    if (!car) car = S(c.dictCarrier);   // 콘앱은 사전 전체를 안 들고 있어 선사 칸 하나만 ctx.dictCarrier 로 싣는다(cone.html fbFetchDictCarrier)
    c.rfSkip = !!c.rfSkip || isReeferCheckSkipped(c.info, null, car);
  }
  //  ★ 3.70-01 — 콘앱 컨(toMirContainers)·항차 화면 재료에도 특수제작컨·수화물 표시를 찍는다(utils.applySpecialMarks 한 벌 — 두 앱 같은 답).
  //    다른 항차 컨이 섞여 와도 이 항차 것에만(voyageKey 문지기).
  {
    const fc = c.info && c.info.forecast;
    if (fc && ((Array.isArray(fc.luggageCns) && fc.luggageCns.length) || (Array.isArray(fc.specialCns) && fc.specialCns.length))) {
      const vk = c.voyageKey || null;
      const idx = []; const sub = [];
      c.containers.forEach((x, i) => { if (x && x.cn && (!vk || !x.voyageKey || x.voyageKey === vk)) { idx.push(i); sub.push(x); } });
      const mk = applySpecialMarks({ info: c.info }, sub);
      if (mk !== sub) { const out = c.containers.slice(); idx.forEach((i, j) => { out[i] = mk[j]; }); c.containers = out; }
    }
  }
  //  ★ 감사 지적(치명 1) — 양하선적 탭 카드·콘앱 컨에는 `_ptk`·`_mode` 가 없다. 그대로 두면 진행 답(formatAppTallyAnswer 의 `_ptk` 필터)이
  //    풀 0 으로 «앱 검수 기록 없음» 거짓을 낸다. 판정은 utils.isPtk 한 벌(§4-4) — 여기서 한 번 찍고 아래 갈래 전부가 그것을 본다.
  {
    const mode0 = c.mode || 'discharge';
    let touched = false;
    const out = c.containers.map((x) => {
      if (!x || (x._ptk !== undefined && x._mode)) return x;
      const m = x._mode || x.mode || mode0;
      let ptk = x._ptk;
      if (ptk === undefined) { try { ptk = m === 'transit' ? false : isPtk({ ...x, _inList: x._inList != null ? x._inList : (x._src === 'list' || x._src === 'both') }, m); } catch (e) { ptk = true; } }
      touched = true;
      return { ...x, _mode: m, _ptk: ptk };
    });
    if (touched) c.containers = out;
  }
  if (!c.compMap && v) { try { c.compMap = { ...(((v.discharge || {}).completed) || {}), ...(((v.loading || {}).completed) || {}) }; } catch (e) { /* 없으면 없는 대로 */ } }
  if (!c.photos && v) c.photos = (v.photoIndex || v.photos) ? { ...(v.photoIndex || {}), ...(v.photos || {}) } : null;   // 3.61: 색인(메타)으로도
  if (!c.voyageDoneAts && v) { try { c.voyageDoneAts = voyageDoneAts(v); } catch (e) { /* */ } }
  if (!c.shiftMap && v && c.voyageKey) { try { c.shiftMap = shiftingMapForDisplay(c.voyageKey, v); } catch (e) { /* */ } }
  //  4.13: 시프팅 근거·상태. 4.13-01(검수사 2026-10-09 05:50 «콘앱에 왠 근거줄을? 근거는 검수앱에만») — 콘앱은 근거를 싣지 않는다. 검수앱만 여기서 만든다.
  if (!c.shiftEvid && c.app !== 'cone' && v && c.voyageKey && c.shiftMap) { try { c.shiftEvid = shiftEvidenceOf(c.voyageKey, v, c.shiftMap); } catch (e) { console.warn('[4.13] 시프팅 근거 판정 실패:', e); } }
  //  ⚠ 트윈 짝(bayPairs)·PORT-MIS 매처(matchPortMis)는 화면이 실어 준다 — twin.js·portMisMatch.js 를 여기서 import 하면
  //    베이사전 2.2MB 가 콘앱 번들에 딸려 온다(실측 747KB → 2.0MB). 콘앱은 둘 다 없는 채로 종전과 같다.
  if (c.pairsMap == null) c.pairsMap = c.bayPairs || null;
  //  3.60-18 (M28 · 다수결 V2): 화면이 매처를 안 실어 줬으면(콘앱) 베이사전 없는 본체(portMisCore)를 항차 info 신원으로 돈다 — «출항 언제» 가 두 앱에서 같은 규칙.
  c.matchPortMis = (typeof c.matchPortMis === 'function') ? c.matchPortMis : ((pm, inf) => { try { return matchPortMisById(pm || {}, inf || {}, shipIdentityLite(inf || {})); } catch (e) { console.warn('[미르] PORT-MIS 매칭 실패:', e); return null; } });
  //  3.24: 페이스 분모는 «검수 시작 보고»가 있으면 그것 — reports 는 info 밖이라 여기서 얹는다(작업창은 이걸 덮어써 잃고 있었다).
  if (c.info && v && !c.info.reportStartAt) { try { c.info = { ...c.info, ...voyageReportSpan(v) }; } catch (e) { /* */ } }
  //  3.53-12: 외부 합계 피드(옛 합계 ctx)는 떼어 냈다 — 대수·잔여·페이스는 완료 기록 한 벌(검수사 2026-09-15·09-21).
  //    «몇 시에 끝나»·«작업 속도» 의 총 잔여는 항차 전체(양하+선적 평택분)다 — 한 번 세어 ctx 에 둔다.
  //    ⚠ 물을 때만 센다(`_vcOf`) — 질문마다 항차 전체를 펴면 타이핑마다 수 ms 가 든다(감사 E6).
  const de = _bayDefOf(c.vsl);
  if (!c.gangShift && v) c.gangShift = (n) => { try { return answerGangShift(v, de, { nGangs: n || null, compMap: c.compMap || null }); } catch (e) { return null; } };
  if (!c.crewAnswer && v) c.crewAnswer = (cq) => { try { return answerCraneCrew(v, cq); } catch (e) { console.warn('[미르] 호기 검수원 답 실패', e); return null; } };
  if (!c.gangBrief && v) c.gangBrief = () => { try { return gangBriefLines(buildGangShift(v, de, { compMap: c.compMap || null })); } catch (e) { return null; } };
  c._bayDef = de;
  return c;
}

/** 질문 하나에 답한다(말투 없음). 못 내면 null. */
/*  ★ 3.42 (판 B) — `ctx._trace` 를 주면 **어느 길에서 답이 나왔는지** 적어 준다(`_trace.via`).
      «잡아채는 길»(사용법 매뉴얼·현재 시각·되묻기·베이사전 타령·진행 잡답·지식 추측·콘 안내)은 규칙이 자신 없이 낸 답이라,
      mirModel.askMir 가 그때만 모델을 부른다(번역 → 규칙 재실행 → 자료 답). 그 밖의 답에는 모델이 끼지 않는다. */
export function answerOneRaw(query, ctx) {
  const q0 = S(query);
  //  3.68 [mirThread]: 대화 중의 «응·두 번째·아니 ○○·그거·됐어» 는 직전 답에 이어 푼다(순수 — 기억은 화면이 접수 시점에 mirThreadCommit 으로 바꾼다).
  //    대화 층이 직접 낸 답은 via='thread'(isWeakAnswer 가 강한 답으로 본다 — 모델·miss 로 안 간다).
  let q = q0;
  if (q0) {
    let th = null;
    try { th = mirThreadResolve(q0, ctx || {}, (ctx && ctx._now) || Date.now()); } catch (e) { console.warn('[미르 대화] 풀기 실패:', e); th = null; }   // _now — 연막검사가 시계를 준다
    if (th && th.direct != null) { if (ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.via = 'thread'; return th.direct; }
    if (th && th.q) { q = S(th.q); if (q !== q0 && ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.rq = q; }   // rq — 되쓴 말. isWeakAnswer 가 원문(«응»·«두 번째») 대신 이것으로 약함을 잰다(모델 누출 방지, 감사 3)
  }
  if (!q || q.length < 2) return null;
  const c = _normalize(ctx);
  const _via = (v) => { if (c._trace && typeof c._trace === 'object') c._trace.via = v; };   // 3.42: 잡아채는 길 표시(판 B 문지기 재료)
  const app = c.app || 'tally';
  const cs = c.containers || [];
  //  3.53-12: 항차 전체 평택분(양하+선적) 대수·완료 — «몇 시에 끝나»·«작업 속도»·«얼마나 남았어» 가 같은 총 잔여를 말하게 한다. 한 번 세면 기억한다.
  //    다른 항차 컨이 섞여 와도 이 항차 것만 센다(voyageKey 문지기 — 감사 경 2).
  //  3.60-18: 분모는 리스트(+시프팅) — 시프팅 키는 shiftMap 에서. 세고 나면 페이스 재료(voyageDoneAts)도 그 분모 안의 완료 시각으로 바꾼다(다수결 V5 — 한 벌).
  const _vcOf = () => { if (c.voyageCounts === undefined || c.voyageCounts === null) { try {
    //  시프팅 집합은 홈 카드와 같은 출처(utils shiftCnSetOf = computeShiftingMapCached 키 — 표시용 shiftMap 은 예측분이 섞여 다르다, 감사 M2)
    //  + 콘앱이 «시프팅분» 으로 표시한 컨(_shift — 콘앱 voyage 엔 EDI 가 없어 shiftCnSetOf 가 빈다, 2차 시뮬 1: MCSN 637N 481 ↔ 521).
    const _ss = shiftSetOfVoyage(c.voyage || null, c.voyageKey || '', cs);   // 4.02: 무브 계산과 같은 한 벌
    c.voyageCounts = voyageCountsOf(c.voyage || null, c.voyageKey ? cs.filter((x) => !x || !x.voyageKey || x.voyageKey === c.voyageKey) : cs, _ss);
    if (Array.isArray(c.voyageCounts.doneAts) && c.voyageCounts.total > 0) c.voyageDoneAts = c.voyageCounts.doneAts;
    //  ★ 3.74 (검수사 2026-10-03 «미르는 언제끝나 라는 질문과 작업계산은 각 터미널 본선현황보고 계산하도록») — 터미널 본선현황이 있으면
    //    총량·완료·잔여와 페이스 재료를 그것으로 갈아 끼운다(PCTC info.termStat · 동방 info.qcWork). 없으면(예정·수집 전·낡음) 위 완료 기록 계산 그대로다.
    //    «몇 시에 끝나»·«작업 속도»·«얼마나 남았어» 가 모두 voyageCounts 한 곳을 읽으므로 세 답이 같은 수를 말한다.
    try {
      const _T = termProgressOf(info);
      if (_T) {
        const _ats = termDoneAts(_T);
        c.voyageCounts = { total: _T.total, done: _T.done, byMode: _T.byMode, doneAts: _ats, term: _T.src };
        c.voyageDoneAts = _ats;
      }
    } catch (e) { console.warn('[미르] 터미널 본선현황 읽기 실패 — 완료 기록으로:', e); }
  } catch (e) { console.warn('[미르] 항차 대수 세기 실패:', e); c.voyageCounts = { total: 0, done: 0, byMode: {}, doneAts: [] }; } } return c.voyageCounts; };
  const v = c.voyage || null;
  const info = c.info || {};
  const ship = c.vslFull || c.vsl || '';
  const hasShip = !!(v || c.vsl);
  const mode = c.mode || 'discharge';
  const modeKr = mode === 'loading' ? '선적' : '양하';

  //  ⓪ 잡담(콘앱 기준은 앞) — 검수앱은 뒤에서 본다(smallTalkLast). mirSmallTalk 은 업무 낱말 게이트가 있다.
  if (!c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* 잡담이 막혀도 일 이야기는 계속 */ } }

  let p = null;
  try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (!p) return null;

  //  ① 콘 이야기 — 콘앱이면 콘 지식이 먼저. 단 검수 속성(끝네자리·온도·실번호·엑스레이…)을 물으면 검수 답이 우선이다
  //    (2.48 — 종전엔 콘앱에서 «베이»만 들어가면 콘 답이 전부 가로챘다. 관문 2 실측).
  //  ★ 3.43-01 — «진행» 을 묻는 말(«실제 진행 상황»·«얼마나 했어»)은 콘앱에서도 ⑥ 진행 두 갈래로 간다. 종전엔 nlSearch 가 «상황» 을
  //    briefingQuery 로도 세워 콘앱만 ①이 브리핑을 먼저 냈다 — 검수앱은 ⑥, 콘앱은 ① 로 **같은 말에 다른 답**(검수사 2026-09-11
  //    «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 합니다», 실측 KBTR 2606E). 판정은 ⑥의 _progressLike 와 같은 식 한 벌.
  const _progressLike = /진행|어디까지\s*(?:했|왔|됐)|얼마나\s*(?:했|됐)|몇\s*(?:프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(?:했|됐)/.test(q)
    || (/현황(?!\s*판)/.test(q) && !hasAnyCondition(p));
  //  4.02: «교대 브리핑» 은 콘 브리핑이 아니라 교대 브리핑(⑨ — 검수앱과 같은 답)이다 — 콘앱만 가로채던 것을 푼다.
  if (c.cone && !p.yardQuery && !(SHIFT_BRIEF_RE.test(q) && !/콘/.test(q)) && (app === 'cone' ? (/콘/.test(q) || !(p.digits || p.entityAttr || p.factQuery || p.type || p.sealAuditQuery)) : isConeQuery(q))) {   // 3.69: 야드 질문은 콘 갈래·브리핑보다 앞(두 앱 같은 답 — 2차 시뮬 1)
    try {
      if (p.briefingQuery && !(_progressLike && !/자료|브리핑|요약/.test(q))) {
        const parts = [];
        for (const m of ['discharge', 'loading']) {
          const sub = cs.filter((x) => (m === 'loading' ? x._mode === 'loading' : x._mode !== 'loading'));
          if (!sub.length) continue;
          try {
            const b = generateBriefing(sub, m === 'loading' ? '선적' : '양하', m, c.pairsMap || null, c.pier || '',
              { rfSkip: !!c.rfSkip, eseal: m === 'loading' ? (c.esealBrief || c.eseal || null) : null, photos: c.photos || null,
                gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m), compMap: c.compMap || null, shiftMap: c.shiftMap || null });
            if (b) parts.push('【' + (m === 'loading' ? '선적' : '양하') + '】\n' + b);
          } catch (e) { /* 한쪽이 막혀도 다른 쪽은 낸다 */ }
        }
        const cb = coneBriefing(c.cone, { vsl: ship, shiftN: c.shiftN || 0 });
        if (cb) parts.push('【콘】\n' + cb);
        if (parts.length) return (ship ? ship + '\n' : '') + parts.join('\n\n');
      }
      //  3.43-01: 콘 낱말이 있을 때만 콘 계산 답 — 종전엔 콘앱에서 «얼마나 남았어»·«다 했어» 가 콘 «남는 곳(반납)»·«전체 가감» 으로
      //    가로채였다(감사 실측, 콘 작업표가 있을 때). 낱말 목록은 coneAnswer 의 작업표 없음 폴백과 같은 벌.
      //    «전체» 는 홀말일 때만 콘 총가감(도움말 예시) — «전체 진행 상황» 은 진행 답. 가져갈·돌려줄·회수·더 필요는 콘 브리핑 본문 어휘(재감사).
      if (isConeQuery(q) || /베이|모자|부족|남는|반납|가감|작업량|물량|가져|돌려|회수|챙겨|더\s*필요/.test(q) || /^(전체|전부)\s*[?!.~]*$/.test(String(q).trim())) { const _cm = {}; const a = coneAnswer(q, c.cone, _cm); if (a) { if (_cm.rest) _via('coneRest'); return a; } }
    } catch (e) { /* 콘 지식이 막혀도 미르는 계속 답한다 */ }
  }

  //  ②-1 화면 밝기·소리 — 실행은 허락된 자리(execDevice)만. 검수앱 화면은 useEffect 가 따로 실행한다(재렌더 반복 실행 금지).
  if (p.deviceCmd && c.execDevice) { try { const r = runDeviceCmd(p.deviceCmd); if (r) return r; } catch (e) { console.warn('[미르] 화면 조절 실패:', e); } }

  //  ②-2 경고 문장을 그대로 물은 것 — 검색 파서보다 앞(1.23 — «풀»·«5톤 이상»이 먼저 잡히면 엉뚱한 답).
  //  3.60-05 (진단 M19): 조회 말(몇 대·어디·위치·목록)은 경고 설명이 아니다 — «XRAY 대상 위치» 가 «X-RAY N대 중 1대 EDI 에 없음» 경고로,
  //    «선적 리스트 몇 대» 가 «리스트 매칭» 경고로 가로채였다. 경고를 묻는 말(왜·뭐야·무슨 뜻·경고·오류·안 맞)이 같이 있으면 종전대로 설명한다.
  const _lookupQ = /몇\s*(?:대|개|건)|어디|위치|목록|명단/.test(q) && !/경고|알림|왜|무슨\s*뜻|뭐야|뭔가요|뭐죠|뭐예요|이상|오류|문제|안\s*맞/.test(q);
  if (!_lookupQ && Array.isArray(c.diagAlerts) && c.diagAlerts.length) { try { const a = answerAboutAlert(q, c.diagAlerts); if (a) return a; } catch (e) { /* */ } }

  //  ②-3 선박 연락처 — howTo 보다 먼저(«메일주소 뭐야»의 '뭐야'가 기능 색인에 먹히면 안 된다).
  if (p.contactQuery) {
    if (c.shipContacts === undefined && c.limited) return null;   // 탭 카드 — 연락처를 안 싣는 자리, 작업 시작 탭으로 릴레이
    if (c.shipContacts === undefined || c.shipContacts === null) return '연락처를 불러오는 중입니다 — 잠시 후 다시 물어봐 주세요.';
    const cq = p.contactQuery;
    const rawCand = cq.code ? String(cq.code).toUpperCase() : '';
    const candNoSp = rawCand.replace(/\s+/g, '');
    const curCode = S(info.vsl).toUpperCase(), curFull = S(info.vslFull).toUpperCase();
    const isThis = hasShip && (!rawCand || candNoSp === curCode || (curFull && curFull.includes(rawCand)));
    if (isThis) {
      if (!curCode) return '이 항차에 선박 코드가 없어 연락처를 찾을 수 없습니다.';
      return generateContactAnswer(c.shipContacts[curCode] || null, ship || '이 배', cq.onboardOnly);
    }
    if (rawCand && !/\s/.test(rawCand)) return generateContactAnswer(c.shipContacts[candNoSp] || null, cq.code, cq.onboardOnly);
    return hasShip
      ? `${cq.code} — 지금 보는 배(${ship})가 아닙니다. 다른 배 연락처는 배 이름을 붙여 물어보세요.`
      : '어느 배 말씀인지 배 이름을 붙여 주시면 연락처를 찾아 드립니다. (예: "PCSZ 이메일")';
  }

  //  ②-4 야드 상황 — «야드 바빠?·왜 차 안 와?·작업 왜 느려?·반입 반출 몇 대?» (3.69, [mirYard] 한 벌). 배가 없어도 답한다 —
  //    열린 항차의 부두 → 없으면 지금 일하는 배들의 부두 → 그것도 없으면 두 터미널 다. 재료는 화면이 넣은 ctx.yard 가 먼저, 없으면 setMirYard 로 받은 것.
  if (p.yardQuery) {
    _via('yard');
    let piers = [];
    if (/PNCT|동방/i.test(q)) piers = ['PNCT'];            // 질문이 터미널을 지목하면 그것이 먼저(2차 시뮬 5)
    else if (/PCTC/i.test(q)) piers = ['PCTC'];
    else if (c.pier) piers = [String(c.pier).toUpperCase().includes('PNCT') ? 'PNCT' : 'PCTC'];
    else if (v && v.info && (v.info.berth || v.info.berthNo)) piers = [pierOf(v)];
    else { try { const now = c._now || Date.now(); for (const vv of Object.values(c.voyages || {})) if (vv && vv.info && isWorkingNow(vv, now)) piers.push(pierOf(vv)); } catch (e) { piers = []; } }
    const yd = (c.yard && typeof c.yard === 'object') ? c.yard : _yard;
    try {
      return answerYard(p.yardQuery, yd, { piers, ship: hasShip ? (c.vsl || ship) : '', containers: cs, flat: c.flat, voyages: c.voyages, voyage: v, mode: p.mode || mode, now: c._now || Date.now() });   // «선적 왜 안 나가» 는 질문의 모드가 먼저(감사 12) · voyage — 중단 보고(3.69-01)
    } catch (e) { console.warn('[미르] 야드 답 실패:', e); return '야드 자료를 읽다가 막혔어요 — 잠시 후 다시 물어봐 주세요.'; }
  }

  //  ③ 인사 — «미르야» 단독. 뒤에 일이 붙은 부름은 인사가 아니다.
  const _bareCall = p.mirCalled && !hasAnyCondition(p) && !p.factQuery && !p.briefingQuery && !p.progressQuery && !p.etaQuery && !p.introQuery && !p.shipIntroQuery && !p.timeQuery && !p.asking;
  if (p.mirHello || _bareCall) {
    //  2차 시뮬 지적 — «미르 점심 먹었어?»·«미르 점심은?» 은 인사가 아니라 잡담(3.7-06)이다. 부름만 있어도 잡담 그물이 먼저 받는다.
    try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* */ }
    return hasShip
      ? '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "3426 온도" · "브리핑" · "얼마나 남았어" · "리퍼 몇 대" · "접안 현측")'
      : '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "미르야 OBWH 브리핑" · "오늘 작업 선박" · "KBTR 마감텔리 수치")';
  }

  //  ④ 수석 통계 — 배 이름 없이 묻는 것. 검수원에게는 수석 유도 한 줄(1.69-01).
  const Q = q;
  const chiefLike = /오답|미회신|피드백|수집기|하트비트|mailpilot/i.test(Q)
    || (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q))
    || /이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*항차/.test(Q)
    || READY_RE.test(Q);
  if (chiefLike && c.isChief === false && app !== 'cone') {
    //  1.69(검수사 확정): 자료현황류는 수석의 영역 — 항차 화면에서 물으면 그 항차의 유무만 한 줄, 그 밖은 수석 유도.
    if (v && READY_RE.test(Q)) {
      try {
        const L = [];
        [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => { if (!v[md]) return; const j = judgeMode(v[md]); L.push(`${kr} — ${j.state === 'ready' ? `준비완료 (EDI ${j.edi} · 리스트 ${j.list})` : j.label}`); });
        if (L.length) return `${L.join(' · ')}\n자세한 내용은 수석 검수사에게 문의하세요.`;
      } catch (e) { /* 아래 유도로 */ }
    }
    return '수석 전용 정보입니다. 자세한 내용은 수석 검수사에게 문의하세요.';
  }
  if (c.isChief && c.chiefData) {
    const cd = c.chiefData;
    const _err = (x, what) => (x && x.__error) ? `${what}를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.` : null;
    if (/오답|미회신|피드백/.test(Q)) return _err(cd.feedback, '오답 리포트') || answerFeedback(cd.feedback ?? null);
    if (/수집기|메일\s*수집|하트비트|mailpilot/i.test(Q)) return answerCollector(c.heartbeat || null);
    if (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q)) return _err(cd.tallyPending, '마감 목록') || answerTallyPending(cd.tallyPending ?? null);
    if (/이번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위/.test(Q) || /지난\s*달|저번\s*달/.test(Q)) {
      return _err(cd.archiveList, '보관소') || answerArchiveStats(Array.isArray(cd.archiveList) ? cd.archiveList : null,
        { bayDict: (typeof window !== 'undefined' && window.__fbShipBayDict) || {}, prevMonth: /지난\s*달|저번\s*달/.test(Q) });
    }
    if (/어제\s*실적|완료\s*(?:항차|된\s*배)/.test(Q)) {
      return _err(cd.archiveList, '보관소') || answerArchiveStats(Array.isArray(cd.archiveList) ? cd.archiveList : null, { kind: /어제/.test(Q) ? 'yesterday' : 'recent' });
    }
    if (/(?:배|선박|항차|작업|시간).{0,10}겹치|겹치는\s*(?:배|선박|항차|시간)/.test(Q) && !/끝\s*자리|끝자리|번호/.test(Q) && c.voyages) return answerOverlaps(c.voyages);
    if (/(보관|아카이브)/.test(Q) && /(몇|얼마|있어|있나|현황|목록|뭐)/.test(Q) && !c.shipCtx && !v) {
      const arch = cd.archiveList;
      if (arch === null || arch === undefined) return '보관소를 읽는 중이에요 — 잠시 후 다시 물어봐 주세요.';
      if (arch && arch.__error) return '보관소를 읽지 못했어요 — 네트워크 확인 후 다시 물어봐 주세요.';
      const list = Array.isArray(arch) ? arch : [];
      if (!list.length) return '보관소에 완료 저장된 항차가 아직 없어요.';
      const ships = new Set(list.map((a) => a.vsl));
      const sorted = list.slice().sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
      const _t = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; };
      const L = [`📦 보관소에 완료 항차 ${list.length}건이 있어요 (${ships.size}척).`];
      L.push(`가장 최근: ${_t(sorted[0].archivedAt)} ${String(sorted[0].voyageKey || '').replace('_', ' ')}`);
      L.push(`가장 오래된 것: ${_t(sorted[sorted.length - 1].archivedAt)} ${String(sorted[sorted.length - 1].voyageKey || '').replace('_', ' ')}`);
      L.push(''); L.push('최근 5항차');
      sorted.slice(0, 5).forEach((a) => L.push(`· ${_t(a.archivedAt)} ${String(a.voyageKey || '').replace('_', ' ')} — 양하 ${a.discharge_ptk ?? '?'} · 선적 ${a.loading_ptk ?? '?'}`));
      L.push(''); L.push('배 이름을 붙여 물으면 그 배 것만 짚어 드려요 — 예: «DXQD 끝났어?»');
      return L.join('\n');
    }
  }

  //  ⑤ EDI↔리스트 대수 차이 — 배가 정해졌을 때만(2.35).
  if (v && /(안\s*맞|다르|차이|틀리|어긋|왜\s*(달라|다르))/.test(Q) && /(대수|갯수|개수|양하|선적|EDI|리스트|숫자)/i.test(Q)) {
    try {
      const _mode = /선적|LOLO|로딩/i.test(Q) ? 'loading' : 'discharge';
      const _sec = v[_mode];
      const _raw = (v[_mode] && v[_mode].raw && v[_mode].raw.edi && v[_mode].raw.edi.text) || (v.raw && v.raw.edi && v.raw.edi.text) || '';
      const _d = diffEdiList(_sec, _raw);
      if (_d) return explainEdiGap(_d, c.vsl);
      if (_sec && _sec.ediContainers && _sec.records) return `${c.vsl} ${_mode === 'loading' ? '선적' : '양하'} — EDI와 리스트가 딱 맞아요. 어긋나는 컨이 없어요 😺`;
    } catch (e) { /* 아래로 */ }
  }

  //  ⑥ 진행 — 두 갈래(1.69-02·2.55). 사람·호기·조건이 붙은 진행은 본체가 낸다.
  //  감사 지적(중 6·2차 시뮬 4) — «데미지 현황»·«선사 현황»·«수화물 현황»은 진행이 아니고, «시간당 몇 대 했어»는 페이스다.
  //  (_progressLike 는 ① 앞에서 한 번 계산한다 — 3.43-01, 콘앱 브리핑 가로채기와 한 벌)
  if (_progressLike && !/자료|브리핑|요약/.test(Q) && !p.crewQuery && !p.factQuery && !p.paceQuery
      && !p.dmgQuery && !p.carrierQuery && !p.luggQuery && !p.urgentQuery && !p.bayDistQuery && !p.sealAuditQuery
      && !p.digits && p.bay == null && !p.zone && !p.size && !p.fe && !p.type) {
    if (hasShip && cs.length) {
      _via('progress');   // 3.42: 조건 없는 진행 잡답 — «완료된 거 마지막 다섯 개»·«양하 끝난 시각» 이 여기로 떨어졌다(판 B 시뮬)
      const pool = dropFilledBookingSlots(cs);
      try { return formatAppTallyAnswer(ship, pool, info || null, _vcOf()); } catch (e) { console.warn('[미르] 진행 답 실패:', e); }   // 3.60-18: 대수는 리스트 분모(감사 M1 — «진행 상황» 만 EDI∪리스트로 세던 두 벌)
    }
    if (!hasShip && c.isChief && c.chiefData) {   // 완료·보관된 배(1.69-06)
      const Q2 = Q.toUpperCase();
      const arch = c.chiefData.archiveList;
      if (Array.isArray(arch)) {
        const hits = arch.filter((a) => a && a.vsl && String(a.vsl).length >= 3 && Q2.includes(String(a.vsl).toUpperCase()));
        if (hits.length) {
          const h = hits.reduce((m, a) => (((a.archivedAt || 0) > (m.archivedAt || 0)) ? a : m));
          const t = h.archivedAt ? new Date(h.archivedAt) : null;
          const f = t ? `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '';
          const voy = String(h.voyageKey || '').split('_')[1] || '';
          return `✅ ${h.vsl}${voy ? ' ' + voy : ''} — ${f ? f + ' ' : ''}완료·보관됨 (수석 완료 저장 기준).\n평택분 양하 ${h.discharge_ptk ?? '?'} · 선적 ${h.loading_ptk ?? '?'} — 상세는 보관소에서.`;
        }
      } else if (arch === null || arch === undefined) { if (/[A-Z]{3,}/.test(Q2)) return '보관소 기록을 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.'; }
      else if (arch && arch.__error) return '보관소를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.';
    }
  }

  //  ⑦ 콜사인·IMO — 기능 설명보다 먼저(1.68).
  if (hasShip && /콜사인|호출\s*부호|\bIMO\b|아이엠오/i.test(Q)) {
    const d = ((typeof window !== 'undefined' && window.__fbShipBayDict) || {})[S(info.vsl).toUpperCase()] || {};
    const L = [];
    const csn = info.callsign || d.callsign; if (csn) L.push(`콜사인 ${csn}`);
    if (d.imo || info.imo) L.push(`IMO ${d.imo || info.imo}`);
    return L.length ? `${ship} — ${L.join(' · ')}` : `${ship} — 콜사인·IMO가 아직 등록 전입니다.`;
  }

  //  ⑧ 사람·호기 등록·조회 — 배가 있어야 한다.
  if (p.crewSet || p.crewQuery) {
    if (!v) return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: «OBWH 1호기 이인철 3호기 최관식» · «SWMM 김성일 몇 개 했어»';
    if (p.crewSet && app === 'cone') return '호기 검수원은 검수앱에서 적어 주세요 — 콘앱은 적는 손이 없어요.';   // 재감사: 콘앱엔 fbSetVoyageCraneCrew 가 없다
    if (p.crewSet) { try { return crewSetText(resolveCrewSides(p.crewSet, v), ship); } catch (e) { /* 본체로 */ } }
    if (p.crewQuery && c.crewAnswer) { try { const a = c.crewAnswer(p.crewQuery); if (a) return a; } catch (e) { /* 본체로 */ } }
  }

  //  ⑨ 배 지정 계산 — 자료 도착·해치·갱 분배·총 무브·최초 시작·X-RAY 조별·교대 브리핑·갱 배분(1.69·2.62) — 홈에만 있던 것을 어디서나.
  {
    const isArrivalQ = isDataArrivalQuery(Q);
    const isHatchQ = /해치|커버/.test(Q) && /(?:열|오픈|개방|닫|몇\s*장|실황|상태|어디|어때|됐)/.test(Q) && p.bay == null && !p.howToQuery;   // «해치 보고 어디서 해» 는 기능 위치 질문
    const isGangQ = /(?:갱|크레인).{0,14}(?:분배|나눠|나누|분할)|분배.{0,10}(?:갱|크레인)|(?:갱|크레인)\s*2\s*개/.test(Q);
    const isMoveQ = /무브/.test(Q) && /(?:몇|총|얼마)/.test(Q);
    const isFirstQ = /(?:최초|처음|어디서?\s*부터|몇\s*번\s*부터).{0,10}(?:양하|시작|해)|양하.{0,12}(?:어디부터|어디서\s*시작|시작\s*어디|몇\s*번\s*부터)/.test(Q);
    const isXrayShiftQ = /엑스레이|x[\s.\-]*ray|xray/i.test(Q) && /(?:조별|주간|야간|부착|몇\s*대\s*가능)/.test(Q);
    const isShiftBriefQ = SHIFT_BRIEF_RE.test(Q);
    const anyCalc = isArrivalQ || isHatchQ || isGangQ || isMoveQ || isFirstQ || isXrayShiftQ || isShiftBriefQ;
    if (anyCalc && !v) return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 계산합니다. (예: "HAYN 갱 2개로 분배")';
    if (v) {
      const _voy = { ...v, key: c.voyageKey || '', _key: c.voyageKey || '' };
      //  4.02 감사: 콘앱 전용이다 — 검수앱 항차가 EDI 없이 리스트만 있어도(app 'tally') 종전 답(«EDI 가 아직 없어…»)이 그대로 나가야 한다.
      const _isCone = app === 'cone';
      const _mvGiven = !_isCone ? null : (c.voyageKey ? cs.filter((x) => !x || !x.voyageKey || x.voyageKey === c.voyageKey) : cs);   // 콘앱이 넘긴 이 항차 컨(_vcOf 와 같은 걸러내기)
      const de = c._bayDef;
      //  4.02: 콘앱 항차엔 EDI 가 없다 — 갱 분배·최초 시작·X-RAY 조별·교대 브리핑은 EDI 자리를 읽으므로 콘앱이 넘긴 컨으로 채운 사본을 쓴다(검수앱과 같은 답).
      const _voyE = (!anyCalc || !_isCone || hasAnyEdi(_voy)) ? _voy : (() => {
        try {
        const o = { ..._voy };
        for (const m of ['discharge', 'loading']) {
          //  시프팅분(_shift)은 콘앱이 얹은 행이다 — 검수앱의 EDI 칸은 평택분만이라, 같이 세면 교대 브리핑 «자료» 줄이 «EDI 323 ⚠ 46건 차이» 로 갈린다(MCSC 실측).
          const _ed0 = edOfMode(_voy, m, _mvGiven);
          const ed = {};
          for (const k of Object.keys(_ed0)) if (!(_ed0[k] && _ed0[k]._shift)) ed[k] = _ed0[k];
          if (Object.keys(ed).length) { o[m] = { ...(_voy[m] || {}), ediContainers: ed }; continue; }
          //  자료가 하나도 없는 쪽은 «없는 쪽» 으로 둔다 — 검수앱은 한쪽만 있는 배에 그쪽 노드가 아예 없다(«선적 EDI 0 ⚠ EDI 없음» 이 따라붙지 않게).
          const nd = _voy[m];
          if (nd && Object.values(nd).every((x) => !x || (typeof x === 'object' && !Object.keys(x).length))) delete o[m];
        }
        return o;
        } catch (e) { console.warn('[미르] 콘앱 항차 사본 만들기 실패 — 원본으로 셉니다:', e); return _voy; }
      })();
      try {
        if (isArrivalQ) return answerDataArrival(_voy, ship);
        if (isHatchQ) return answerHatchStatus(_voy, de, ship) || answerVoyageFacts({ factQuery: 'hatch' }, c);
        if (isGangQ) return answerGangSplit(_voyE, de, ship);
        //  4.02: 콘앱도 같은 계산 — 콘앱이 넘긴 컨(cs)으로 트윈·무브를 센다(검수사 «콘앱 첫 답 «EDI 가 아직 없어» 는 통합이 안 된 것»). 시프팅 수는 콘앱이 합친 수(shiftN).
        if (isMoveQ) return answerTotalMoves(_voy, ship, { eta: movesOfVoyage(_voy, c.voyageKey || '', _mvGiven), shifting: (_isCone && !hasAnyEdi(_voy) && Number.isFinite(c.shiftN)) ? c.shiftN : undefined });
        if (isFirstQ) return answerFirstStart(_voyE, de, ship);
        if (isXrayShiftQ) return answerXrayShifts(_voyE, de, { shipName: ship, pier: info.pier, pace: workPaceOf(_voy, c.voyageKey || '', _mvGiven) });
        if (isShiftBriefQ) return answerShiftBriefing(_voyE, de, { shipName: ship, voyages: c.voyages || null, pace: workPaceOf(_voy, c.voyageKey || '', _mvGiven) });
        //  3.42: «2호기 11:15 시작했어» 는 적는 말이다 — 종전엔 gangQuery(n:null) 가 같이 켜져 «베이사전이 필요해요» 가 답을 가로챘다(판 B 시뮬). 저장은 화면(부수효과)이 한다.
        if (p.startSet && Array.isArray(p.startSet.cranes) && p.startSet.cranes.length && app === 'cone') return '시작 시각은 검수앱(작업 시작 탭)에서 적어 주세요 — 콘앱은 적는 손이 없어요.';   // 감사: 콘앱엔 fbSetVoyageWorkStart 가 없다
        if (p.startSet && Array.isArray(p.startSet.cranes) && p.startSet.cranes.length) {
          const _fmt = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
          return `⏱ ${ship} ${p.startSet.cranes.map((x) => `${x.no}호기 ${_fmt(x.ms)}`).join(' · ')} 시작으로 적을게요 — 페이스·예상 완료를 그 시각부터 다시 계산해요.`;
        }
        if (p.gangQuery && c.gangShift) { const a = c.gangShift(p.gangQuery.n || null); if (a) { if (/베이사전이 필요/.test(a)) _via('gangDict'); return (hasShip && !c.mode ? `${ship}\n` : '') + a; } }
      } catch (e) { console.warn('[미르] 배 지정 계산 실패:', e); }
    }
  }

  //  ⑨-B ★ 창구 15건 — 개체(끝네자리+속성) · 항차 사실. 입출항·시각·본체보다 먼저 본다(값은 있는데 말이 없던 것들 — «접안 현측»이 입출항 갈래에 먹히면 안 된다).
  if (hasShip && !p.howToQuery) {
    try { const a = answerEntityFacts(p, c); if (a) return a; } catch (e) { console.warn('[미르 창구] 개체 답 실패:', e); }
    try { const a = answerVoyageFacts(p, c); if (a) return a; } catch (e) { console.warn('[미르 창구] 항차 답 실패:', e); }
  } else if (!hasShip && (p.entityAttr || p.factQuery)) {
    //  떠 있는 미르(카드 없음) — 끝네자리+속성이면 전 항차에서 그 컨을 찾아 배마다 답한다(«3426 온도» 를 홈에서 물어도).
    if (p.entityAttr && p.digits && c.countFallback && Array.isArray(c.flat) && c.voyages) {
      const d = String(p.digits).slice(-4);
      const byKey = new Map();
      for (const x of c.flat) { if (x && x.cn && String(x.cn).slice(-4) === d) { if (!byKey.has(x.voyageKey)) byKey.set(x.voyageKey, []); byKey.get(x.voyageKey).push(x); } }
      if (!byKey.size) return `끝네자리 ${d} — 지금 항차 어디에도 없어요.`;
      const parts = [];
      for (const [k, arr] of byKey) {
        const vv = c.voyages[k] || null;
        try { const a = answerEntityFacts(p, { containers: arr, voyage: vv, info: vv && vv.info, mode: c.mode }); if (a) parts.push(`【${(vv && vv.info && vv.info.vsl) || k}】\n${a}`); } catch (e) { /* 배 하나 실패해도 계속 */ }
      }
      if (parts.length) return parts.join('\n\n');
    }
    return '어느 배 말씀인지 배 이름을 붙여 주시면 바로 답합니다. (예: "KBTR 3426 온도" · "NSFR 접안 현측")';
  }

  //  ⑩ 브리핑 속 «N건» 후속 — 직전 주제가 실 점검·브리핑이면 그 상세(1.69-01).
  if (hasShip && /(?:\d+\s*건|그게|그거|저거|아까\s*(?:그|말한)\s*거?)\s*(?:이|가|은|는|이란)?\s*(?:뭐|뭔|무엇|무슨|내용|상세|자세)/.test(Q)) {
    const topic = p.sealAuditQuery ? 'seal' : c.lastTopic;
    if (topic === 'seal' || (topic === 'briefing' && /건/.test(Q))) return generateSealAuditAnswer(cs.filter((x) => x._mode === mode), modeKr);
  }

  //  ⑪ 뜻·방법 — 본체 한 벌(2.57-02·2.59-01). 홈은 조회 폴백이 없으니 못 찾으면 고백한다.
  if (p.asking === 'def') {
    try {
      const d = generateLocalAnswer(p, [], [], null);
      if (d) {
        //  3.42: 뜻풀이가 지식·사전이 아니라 **사용법 매뉴얼 추측**(generateHowToAnswer)에서 왔으면 약한 답 — «제일 무거운 컨 뭐야»가 «컨테이너 번호 수정» 매뉴얼로 잡혔다(판 B 시뮬)
        let strong = null; try { strong = mirKnowledge(q) || mirLearnedDef(q) || (p._learnedDef || null); } catch (e) { strong = null; }
        if (!strong) _via('howTo');
        return d;
      }
    } catch (e) { /* */ }
  }
  if (p.asking === 'how') {
    try { const h = answerHowCore(p); if (h) { try { if (mirKnowledge(Q) === h) _via('knowledge'); } catch (e) { /* */ } return h; } } catch (e) { /* */ }   // 3.43-02: 원장 답은 표시해 둔다(모델 번역이 덮지 않게)
    if (!hasShip) { _via('unlearned'); return '그 방법은 아직 못 배웠습니다 😿 지어내지 않을게요. 개발자에게 전달해 둘게요.'; }
  }
  //  3.43-02: 기능 사용법(howToQuery)도 **실무 지식(원장)이 먼저** — «씰 잘림 대처법» 이 색인의 「실번호 입력」 기능 설명으로 갔다(검수사 실측
  //    «씰 잘림(씰 파손) 대처법을 물었는데 씰번호 틀림을 알립니다»). answerHowCore(asking=how)와 같은 순서.
  if (p.howToQuery) {
    try { const k = mirKnowledge(Q); if (k) { _via('knowledge'); return k; } } catch (e) { /* 원장이 막혀도 색인은 답한다 */ }
    try { const a = generateHowToAnswer(Q, p, { isChief: !!c.isChief }); if (a) { _via('howTo'); return a; } } catch (e) { /* */ }
  }
  //  4.14-01 (회귀 기준표 R9 · 3.43-02): 현장 대처 두 갈래를 묻는 말 없이 한 문장에 말하면(«컨테이너 파손됐고 씰도 잘렸어») 원장이 둘 다 답한다 —
  //    종전엔 아래 본체(⑲)가 «등록된 데미지 없음» 만 냈다. 판정은 mirKnowledgeMulti 한 곳(두 갈래 이상일 때만 답). 한 갈래 서술문(«컨테이너 파손됐어»)은 종전대로 아래로 흐른다.
  if (!p.asking) {
    try { const k = mirKnowledgeMulti(Q); if (k) { _via('knowledge'); return k; } } catch (e) { console.warn('[미르] 복합 대처(원장) 실패:', e); }
  }

  //  ⑫ 자료 현황 — 배가 있으면 그 배 한 줄(항차 화면) 또는 결론부터(홈), 없으면 전체 가로질러.
  if (READY_RE.test(Q) && app !== 'cone') {
    try {
      if (v && !c.voyages) {   // 항차 화면 — 유무 한 줄 + 수석 유도(1.69)
        const L = [];
        [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => { if (!v[md]) return; const j = judgeMode(v[md]); L.push(`${kr} — ${j.state === 'ready' ? `준비완료 (EDI ${j.edi} · 리스트 ${j.list})` : j.label}`); });
        if (L.length) return `${L.join(' · ')}\n자세한 내용은 수석 검수사에게 문의하세요.`;
      }
      if (c.voyages) {
        const rd = buildReadiness(c.voyages, (typeof window !== 'undefined' && window.__fbShipBayDict) || null);
        if (v && c.voyageKey) {
          const wantMode = /양하/.test(Q) ? 'discharge' : /선적/.test(Q) ? 'loading' : null;
          const mine = (rd.rows || []).filter((r) => r.key === c.voyageKey && (!wantMode || r.mode === wantMode));
          if (mine.length) {
            const lines = []; let allReady = true;
            mine.forEach((r) => {
              if (r.state === 'ready') { const cnt = r.edi && r.list && r.edi !== r.list ? ` (⚠ EDI ${r.edi} vs 리스트 ${r.list} — ${Math.abs(r.edi - r.list)}건 차이)` : ` — EDI ${r.edi || 0}건 = 리스트 ${r.list || 0}건`; if (r.edi && r.list && r.edi !== r.list) allReady = false; lines.push(`${r.modeKr}${cnt}`); }
              else { allReady = false; lines.push(`${r.modeKr} — ${r.label}${r.carrier ? ` (${r.carrier})` : ''}`); }
            });
            return (allReady ? `예. ${ship} 자료 준비돼 있습니다. 출력만 하면 됩니다.\n` : `⚠ ${ship} 자료가 아직입니다.\n`) + lines.join('\n');
          }
          return `${ship} — 등록만 있고 자료가 아직 안 왔습니다.`;
        }
        return describeReadiness(rd);
      }
    } catch (e) { /* 아래로 */ }
  }

  //  ⑬ 인계·맛집·자기소개·선박 소개.
  if (p.handoverQuery) {
    if (c.limited) return null;   // 양하선적 탭 카드 — 인계 메모 칸이 있는 작업 시작 탭으로 릴레이
    if (!hasShip) return '어느 배 말씀인지 배 이름을 붙여 주시면 인계서를 정리합니다.';
    const ptk = cs.filter((x) => x._ptk !== false);
    const h = c.handover || {};
    const body = generateHandover(ptk, { byInspector: c.inspector || '', shipName: ship, voyageLabel: S(info.voyNo) || S(info.voy), extraNote: h.finalized ? (h.note || '') : '', rfSkip: !!c.rfSkip });
    if (h.finalized) return `인계서 정리했어요. 다음 검수사에게 이 내용 전달하세요.\n\n${body}`;
    return `인계서 초안이에요. 특이사항이나 더 전달할 내용 있으면 아래에 적어 주세요. 없으면 그대로 두셔도 됩니다.\n\n${body}\n\n— 더 전달할 내용이 있으면 아래 칸에 적고 [인계 메모 추가]를 누르세요.`;
  }
  if (p.foodQuery) return generateFoodAnswer(p.foodQuery);
  if (p.introQuery) return generateIntroAnswer(ship);
  if (p.shipIntroQuery) {
    if (!hasShip) return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: «KBTR 이 배 뭐야»';
    const sid = (() => { try { return resolveShipKey(info.imo || info.callsign || S(info.vsl).toUpperCase().replace(/\s+/g, '')); } catch (e) { return ''; } })();
    const cached = sid && typeof window !== 'undefined' && window.__shipIntroCache && window.__shipIntroCache[sid];
    if (cached) return `🚢 ${ship}\n${cached}`;
    return '이 배의 정보가 아직 없습니다.\n항차 화면 아래 「🚢 이 배는?」 카드에서 [AI로 선박 정보 찾기]를 누르면 제원·선사·항로와 이름 유래를 정리해 드립니다.';
  }

  //  ⑭ 입출항·도선·기상·시각·날씨 — 입출항이 시각보다 먼저(«입항 시간 알려줘»는 timeQuery 에도 걸린다).
  if (p.schedQuery) {
    if (hasShip) {
      //  3.60-05 (진단 M21): 출항 시각은 **도선 예보 → PORT-MIS 신고** 순이다(3.53-13 확정 · badgeRule 과 같은 순서).
      //    종전엔 PORT-MIS 만 보고, 없으면 «PORT-MIS 신고는 아직» 이라 답했다 — 도선 예보에 출항이 있어도.
      const _pf = (c.pilotForecast || {})[S(info && info.vsl).toUpperCase()] || null;
      //  지나간 도선 시각은 현실이 아니다 — 미래(±12h 유예)인 예보만 쓴다(VoyagePage 2.63-03 과 같은 가드, 감사 지적).
      const _pfT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
      const _pfOk = (x) => { const t0 = _pfT(x); return t0 != null && t0 >= Date.now() - 12 * 3600000; };
      const _pfDep = _pf && _pfOk(_pf.nextDep) ? String(_pf.nextDep).slice(5) : '';
      const _pfArr = _pf && _pfOk(_pf.nextArr) ? String(_pf.nextArr).slice(5) : '';
      const pm = typeof c.matchPortMis === 'function' ? c.matchPortMis(c.portMisData || {}, info) : null;
      if (!pm && (_pfDep || _pfArr)) return `${ship} — ` + [_pfArr ? `입항 예정 ${_pfArr}` : null, _pfDep ? `출항 예정 ${_pfDep}` : null].filter(Boolean).join(', ') + ' (도선 예보).';
      if (pm) {
        const L = [`${ship || pm.vesselName || '이 선박'} — ` + [_fmtDT(pm.eta) ? `입항 ${_fmtDT(pm.eta)}` : null, _pfDep ? `출항 ${_pfDep}(도선 예보)` : (_fmtDT(pm.etd) ? `출항 ${_fmtDT(pm.etd)}` : null)].filter(Boolean).join(', ') + '.'];
        if (pm.pier || pm.berth) L.push(`부두: ${[pm.pier, pm.berth].filter(Boolean).join(' ')}`);
        if (pm.nextPort) L.push(`다음 항구: ${pm.nextPort}`);
        if (pm.port && pm.port !== '평택') L.push(`⚠ ${pm.port} 항만 데이터입니다.`);
        return L.join('\n');
      }
      if (S(info.planDate)) return `${ship} — 작업 계획 ${info.planDate} (PORT-MIS 신고는 아직).`;
      return '입출항 정보가 아직 없습니다. PORT-MIS 데이터가 수집되면 자동으로 답합니다.';
    }
  }
  if (p.pilotQuery && hasShip) return generatePilotAnswer(info || {}, (c.pilotForecast || {})[S(info.vsl).toUpperCase()] || null);
  if (p.wakeQuery) return generateWakeAnswer(hasShip ? (info || {}) : {});
  if (p.timeQuery && !p.factQuery) { _via('time'); return generateTimeAnswer(undefined, Q); }
  if (p.weatherQuery) {
    if (c.weatherText) return c.weatherText;
    if (c.limited) return null;   // 탭 카드 — 날씨를 안 받는 자리, 작업 시작 탭으로 릴레이
    return c.weatherPending ? '🌤 평택항 날씨 조회 중…' : '날씨는 항차 화면 [🚀 작업 시작] 탭이나 떠 있는 미르에게 물어 주세요.';
  }

  //  ⑮ 트윈 무게 점검 · 속도 · 계획 전망 · 자료 도착.
  if (p.twinCheckQuery && hasShip) {
    const m = p.mode || mode;
    const pool = cs.filter((x) => x._ptk !== false && x._mode === m && !x._comp);
    return generateTwinCheckAnswer(p, pool, c.pairsMap || {}, info.pier || '');
  }
  if (hasShip && isSpeedQuery(Q)) { try { const a = answerShipSpeed(v, c.shipSpeed, ship, _vcOf()); if (a && !/못 불러왔/.test(a)) return a; } catch (e) { /* */ } }   // 2차 시뮬 5: 속도 자료가 없으면 본체 ETA 가 답한다
  if (hasShip && isPlanOutlookQuery(Q)) { try { const m = outlookModeOf(Q); const a = m ? answerPlanOutlook(v, m, ship) : answerPlanOutlookBoth(v, ship); if (a) return a; } catch (e) { /* */ } }

  //  ⑯ 관련 선사 · 브리핑 · 실 점검.
  if (p.carrierQuery && hasShip) { try { return `${ship}\n` + formatCarriers(legendItemsOf(cs.filter((x) => x._ptk !== false && (!c.mode || x._mode === mode))), { carrierContacts: c.carrierContacts }); } catch (e) { /* */ } }
  if (p.briefingQuery && hasShip) {
    const wantMode = c.mode ? c.mode : (p.mode || (/양하/.test(Q) ? 'discharge' : /선적/.test(Q) ? 'loading' : null));
    const parts = [];
    for (const [m, kr] of [['discharge', '양하'], ['loading', '선적']]) {
      if (wantMode && m !== wantMode) continue;
      //  ⚠ 평택분으로 미리 거르지 않는다 — generateBriefing 이 통과화물을 스스로 갈라 «🔁 통과화물이 작업 베이에 혼재 — 내리지 말 것» 을 낸다
      //    (2차 시뮬 실측 NSFR 2617N 통과 343대 — 미리 거르면 그 경고가 사라진다. 3.40 작업창·탭 카드는 모드 컨 전부를 넘겼다).
      const arr = dropFilledBookingSlots(cs.filter((x) => x._mode === m || x._mode === 'transit'));   // 통과분은 양쪽 다 넘긴다(_ptk false 라 집계엔 안 들고 «자리 주의»에만 쓴인다)
      if (!arr.filter((x) => x._ptk !== false).length) continue;
      try {
        const b = generateBriefing(arr, kr, m, c.pairsMap || null, c.pier || '', { rfSkip: !!c.rfSkip, eseal: m === 'loading' ? (c.esealBrief || c.eseal || null) : null, photos: c.photos || null, gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m), compMap: c.compMap || null, shiftMap: c.shiftMap || null });
        if (b) parts.push(c.mode ? b : `【${kr}】\n` + b);
      } catch (e) { console.warn('[미르] 브리핑 실패:', e); }
    }
    if (parts.length) return (c.mode ? '' : `${ship}\n`) + parts.join('\n\n');
    try { const ov = answerShipOverview(v, ship, c.matchPortMis(c.portMisData || {}, info), c.ediPattern || null); if (ov) return ov; } catch (e) { /* */ }
  }
  if (hasShip && (p.sealAuditQuery || /[실씰]\s*(?:번호\s*)?의심|실\s*점검|씰\s*점검/.test(Q))) return generateSealAuditAnswer(cs.filter((x) => c.mode ? x._mode === mode : true), c.mode ? modeKr : '양하·선적');

  //  ⑰ 홈(배 없음) — 실오류 선박 현황 · «우리 배?» · 오늘/내일 작업 선박 · 배 없는 브리핑.
  if (Array.isArray(c.flat) && /[실씰]\s*오류|실번호\s*(불일치|오류)/.test(Q)) {
    try {
      const rows = [];
      for (const x of c.flat) {
        if (!x || !x.cn) continue;
        const fix = x.sl_orig && x.sl && String(x.sl) !== String(x.sl_orig);
        const cf = Array.isArray(x.sl_conflict) && [...new Set(x.sl_conflict.map((h) => String(h.sl || '').trim().toUpperCase()))].length > 1;
        if (fix || cf) rows.push({ x, fix, cf });
      }
      if (!rows.length) return '실오류·실번호 불일치로 기록된 컨이 없습니다 (앱 기록 기준 — 현장 발견분은 실오류 보고로 남겨 주세요).';
      const byShip = new Map();
      for (const r of rows) { const k = r.x.voyageKey || '?'; if (!byShip.has(k)) byShip.set(k, []); byShip.get(k).push(r); }
      const L = [`⚠ 실오류·실번호 불일치 ${rows.length}건 — ${byShip.size}척`];
      for (const [k, arr] of byShip) { L.push(`【${k}】 ${arr.length}건`); arr.slice(0, 10).forEach(({ x, fix }) => L.push(`  ${x.cn} — ${fix ? `리스트 ${x.sl_orig} → 실물 ${x.sl}` : `불일치 ${[...new Set(x.sl_conflict.map((h) => String(h.sl || '').trim()))].join(' ↔ ')}`}`)); if (arr.length > 10) L.push(`  … 외 ${arr.length - 10}건`); }
      return L.join('\n');
    } catch (e) { /* */ }
  }
  if (c.voyages && /(우리|저희)\s*(가|는|도)?\s*(작업|검수)|작업\s*해야|검수\s*해야|우리\s*배/.test(Q)) {
    if (v) {
      try {
        const pmv = c.matchPortMis(c.portMisData || {}, info);
        const ov = answerShipOverview(v, ship, pmv, c.ediPattern || null);
        const detail = /양하|선적|하역만|어느\s*쪽/.test(Q) ? '\n양하·선적 구분 같은 자세한 것은 수석검수사에게 확인해 주세요.' : '';
        if (info.lane) return `이번 항차는 ${info.lane}입니다. 저희 작업 대상 선박입니다.${detail}\n\n${ov || ''}`.trim();
        if (info.planDis != null || info.planLod != null) return `저희 작업 대상 선박입니다 — 선석배정목록에 잡혀 있습니다. (항로는 다음 배정 수집 때 표시됩니다)${detail}\n\n${ov || ''}`.trim();
        if (pmv) return `입항 신고(PORT-MIS)는 있는데 선석배정에는 아직입니다 — 배정이 뜨면 확정입니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
        return `⚠ 판단 유보 — ${ship} 항차 카드는 있지만(메일 자료로 생성) 선석배정·PORT-MIS 에는 안 잡혔습니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
      } catch (e) { return `${ship} — 항차 목록에는 있습니다 (${c.voyageKey}). 자세한 것은 수석검수사에게 확인해 주세요.`; }
    }
    const tok = (Q.toUpperCase().match(/\b[A-Z]{3,5}\b/g) || []).filter((t) => !['PTK', 'PCTC', 'PNCT'].includes(t));
    if (tok.length) return `${tok[0]} — 지금 항차 목록·선석배정 자료에 없는 배입니다. 저희가 작업할 배로 잡혀 있지 않습니다.\n(배정목록·메일에 뜨면 수집기가 자동으로 항차 카드를 만듭니다 — 그때 다시 물으면 «네»라고 답합니다)`;
    return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: "PCSZ 우리가 작업해야해?"';
  }
  //  4.12-02: 날짜 말은 utils.dateWordOf 한 벌 — 내일·낼·모레·낼모레·글피(오늘 이후)까지 알아듣는다. 어제·그제 같은 지난 날은 작업 선박 목록으로 답하지 않는다(종전과 같음).
  const _dwQ = dateWordOf(Q);
  const dayOff = _dwQ && _dwQ.off > 0 ? _dwQ.off : 0;
  const _dayLbl = dayOff > 0 ? _dwQ.word : '오늘';
  if (c.voyages && !v && _dwQ && _dwQ.off >= 0 && /작업|양하|선적|일정/.test(Q) && /선박|배|대상|뭐|뭔|몇|무슨/.test(Q)) {
    try {
      const ships = _shipsOnDay(c.voyages, dayOff);
      const lbl = _dayLbl;
      if (!ships.length) return `${lbl} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 아직이면 수집기가 잡는 대로 항차 카드에 뜹니다.`;
      const L = [`${lbl} 작업 선박 ${ships.length}척`];
      for (const { k, v: vv, a } of ships) {
        const i2 = vv?.info || {}; const t = new Date(a);
        const hh = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        const amt = [i2.planDis != null && Number(i2.planDis) > 0 ? `양하 ${i2.planDis}` : null, i2.planLod != null && Number(i2.planLod) > 0 ? `선적 ${i2.planLod}` : null].filter(Boolean).join(' · ');
        const mark = (i2.planDis != null || i2.planLod != null) ? '' : ' ⚠배정 미확인 — 저희 항차가 아닐 수 있음';
        L.push(`${i2.vslFull || i2.vsl || k} — ${i2.pier || '?'} ${hh} 시작${amt ? ` (${amt})` : ''}${mark}`);
      }
      L.push(`\n«${lbl === '오늘' ? '' : lbl + ' '}브리핑» 이라고 하면 배별 상세까지 답합니다.`);
      return L.join('\n');
    } catch (e) { /* */ }
  }
  if (c.voyages && !v && p.briefingQuery) {
    try {
      const today = _shipsOnDay(c.voyages, dayOff);
      if (!today.length) {
        if (dayOff === 0 && _shipsOnDay(c.voyages, 1).length) return '오늘 작업할 선박이 없습니다. 내일 작업할 것을 브리핑할까요?';
        const lbl0 = dayOff > 0 ? _dayLbl : '오늘·내일';
        return `${lbl0} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 잡히면 항차 카드에 뜹니다.\n배 이름을 붙이면 그 배 브리핑을 바로 합니다 (예: "TNJP 브리핑").`;
      }
      const parts = [`📋 ${_dayLbl} 작업 선박 ${today.length}척 브리핑 — 배 이름을 붙이면 그 배만 자세히 (예: "${today[0].v?.info?.vsl || 'SWSP'} 브리핑")`];
      for (const { k, v: vv } of today) {
        const sh = vv?.info?.vslFull || vv?.info?.vsl || k;
        let blk = null;
        try { blk = answerShipOverview(vv, sh, c.matchPortMis(c.portMisData || {}, vv?.info || {}), c.ediPattern || null); } catch (e) { /* 배 하나 실패해도 계속 */ }
        if (!blk) continue;
        const lines = blk.split('\n').filter((l) => !l.startsWith('(컨테이너 상세'));
        try {
          const mine = dropFilledBookingSlots((c.flat || []).filter((x) => x.voyageKey === k && x._ptk));
          if (mine.length) {
            const n = (f) => mine.filter(f).length; const sp = [];
            const rfF = n(isFullReefer); if (rfF) sp.push(`리퍼 ${rfF}`);   // 4.15 (§7.8-⑪): 풀 리퍼 한 벌(종전 rf 표식만 봐 숫자 리퍼를 놓치고 제작컨을 셌다)
            const dg = n((x) => x.dg); if (dg) sp.push(`위험물 ${dg}`);
            const fr = n((x) => x.fr); if (fr) sp.push(`FR ${fr}`);
            const ot = n((x) => x.ot); if (ot) sp.push(`OT ${ot}`);
            const tk = n((x) => x.tk); if (tk) sp.push(`탱크 ${tk}`);
            const xr = n((x) => x._xray); if (xr) sp.push(`X-RAY ${xr}`);
            if (sp.length) lines.push(`특수: ${sp.join(' · ')}`);
          }
        } catch (e) { /* 특수 줄만 생략 */ }
        parts.push(`【${sh}】\n` + lines.join('\n'));
      }
      if (parts.length > 1) return parts.join('\n\n');
    } catch (e) { /* */ }
  }

  //  ⑲ 본체 — 조회·집계·특수화물·시프팅·페이스·ETA·용량·단수… (generateLocalAnswer 한 벌).
  //  3.60-05 (진단 M20): 항차는 있는데 컨 자료(EDI·리스트)가 한 대도 없으면 «못 배웠어요»(+무응답 신고)가 아니라 자료가 아직 없다고 말한다.
  if (hasAnyCondition(p) && !cs.length && hasShip && !p.asking && !p.howToQuery && !p.crewQuery && !p.crewSet && !p.gangSet && !p.gangQuery && !p.startSet) {
    return `📭 ${ship || '이 항차'} — 컨 자료(EDI·리스트)가 아직 안 왔어요. 자료가 들어오면 바로 답할게요.`;
  }
  //  3.60-18 (M22): «위치요»·«화면 어디야» 처럼 **무엇의** 위치인지 없는 물음은 전량 분포(«📍 전체 334대 — 15개 베이…»)를 쏟지 않고 되묻는다.
  //    실사용 09-06 ATPR 2640E «위치요»(직전 «유출이요» 음성 오인) 1건. 대상(끝자리·규격·리퍼·베이·«전체» 등)이 하나라도 붙으면 종전대로 답한다.
  if (p.posQuery && !p.movePathQuery && !hasAnyCondition({ ...p, posQuery: false, howToQuery: false, listQuery: false }) && cs.length) {   // listQuery(«위치 알려줘» 의 알려줘)도 대상이 아니다(감사 E1)   // howToQuery(«어디야» 가 기능 위치로도 읽힘)는 위 기능 색인이 이미 못 받은 뒤라 조건으로 안 친다
    _via('posAskBack');
    return '어느 컨의 위치를 찾으세요? 🐱 끝 네 자리(예 «5445 어디야»)나 조건(«리퍼 위치»·«XRAY 대상 위치»·«12번 베이»)을 붙여 물어봐 주세요.';
  }
  if (hasAnyCondition(p) && (cs.length || p.asking)) {
    try {
      let results = applyNLFilter(cs, p);
      if (!p.digits) results = results.filter((x) => x._ptk !== false);
      if (needsModeChoice(p, results) && c.modeChoice === null) { _via('modeChoice'); return '양하인가요, 선적인가요? 🐱 아래 버튼으로 골라 주세요 — 잠시 뒤엔 둘 다 보여드릴게요.'; }
      const eff = (c.modeChoice && c.modeChoice !== 'both') ? { ...p, mode: c.modeChoice } : p;
      const effRes = (c.modeChoice && c.modeChoice !== 'both') ? results.filter((x) => (c.modeChoice === 'loading' ? x._mode === 'loading' : x._mode !== 'loading')) : results;
      const a = generateLocalAnswer(eff, effRes, cs.filter((x) => x._ptk !== false), {
        ...(c.manualCtx || null), mode: c.mode || null, bayPairs: c.bayPairs || c.pairsMap || null, selectedGroup: c.selectedGroup, selectedTier: c.selectedTier, shipLib: c.shipLib || null,
        gangShift: c.gangShift || null, crewAnswer: c.crewAnswer || null, voyage: v, carrierContacts: c.carrierContacts || null, shipSpeed: c.shipSpeed || null,
        vsl: c.vsl, vslFull: c.vslFull, pier: c.pier, info: info || null, voyageCounts: (p.etaQuery || p.paceQuery || p.progressQuery) ? _vcOf() : null, voyageDoneAts: c.voyageDoneAts || null,   // 3.60-18: voyageCounts 를 먼저 세야 voyageDoneAts 가 같은 분모
        photos: c.photos || null, shiftMap: c.shiftMap || null, shiftEvid: c.shiftEvid || null, compMap: c.compMap || null, bowStern: c.bowStern || null, gangs: info && info.gangs,
        who: c.inspector || '', inspector: c.inspector || '', voyageKey: c.voyageKey || '',
      });
      if (a) return a;
    } catch (e) { console.warn('[미르] 본체 답 실패:', e); }
    //  조건은 잡혔는데 어미가 없어 답이 안 나오는 말(«40피트 풀») — 결과를 세어 준다.
    //  ⚠ 카드 목록이 있는 화면(작업창·홈·탭 카드)에서는 null 이 답이다 — 글이 나가면 카드 65장이 숨는다(감사 치명 3). 콘앱·떠 있는 미르만 센다.
    try {
      if (cs.length && (app === 'cone' || c.countFallback)) {
        const r2 = applyNLFilter(cs, p).filter((x) => x._ptk !== false);
        //  3.60-05 (진단 M23): 끝네자리만 물으면 검수사가 정한 답 — 컨번호·실번호·X-RAY 대상 여부·선내 위치(개체 창구 한 벌 entityHead·attrLine).
        //    종전엔 «📊 끝네자리 5445: 1대» 만 말했다(작업창은 카드가 대신 보이지만 떠 있는 미르·콘앱은 이 글이 전부다).
        if (p.digits && r2.length && r2.length <= 5) {
          const _ax = { voyage: v, containers: cs };
          //  3.60-18 (M23 중복 줄): 실번호 줄(seal)이 X-RAY 대상·커트씰을 이미 말하면 xray 줄은 겹치므로 뺀다(재검증 실측 «X-RAY 대상 · 커트씰 아직 없음» 두 번).
          return r2.map((x) => { const sl = attrLine(x, 'seal', _ax); const xr = attrLine(x, 'xray', _ax); return [entityHead(x), sl, (sl && /X-RAY 대상|커트씰/.test(sl)) ? null : xr].filter(Boolean).join('\n'); }).join('\n\n');
        }
        let label = ''; try { label = describeQuery(p) || ''; } catch (e) { label = ''; }
        return '📊 ' + (label || '조회') + ': ' + r2.length + '대';
      }
    } catch (e) { /* */ }
  }

  //  ⑳ 배 없이 항차 맥락이 필요한 질문 — 어디에 배 이름을 붙이라고 안내(홈).
  if (!hasShip && p.digits && c.countFallback && Array.isArray(c.flat)) {
    //  떠 있는 미르(카드 없음) — 전 항차에서 끝네자리를 찾아 배·자리까지 한 줄씩(홈 통합검색 카드와 같은 재료 flat).
    const d = String(p.digits).slice(-4);
    const hits = c.flat.filter((x) => x && x.cn && String(x.cn).slice(-4) === d);
    if (!hits.length) return `끝네자리 ${d} — 지금 항차 어디에도 없어요.`;
    return hits.slice(0, 12).map((x) => `${x.vsl || ''} ${x.voy || ''} · ${entityHead(x)}${x._comp ? ' · 완료' : ''}`).join('\n') + (hits.length > 12 ? `\n… 외 ${hits.length - 12}대` : '');
  }
  if (!hasShip && (p.briefingQuery || p.sealAuditQuery || p.twinCheckQuery || p.etaQuery || p.paceQuery || p.customsReportQuery || p.schedQuery || p.pilotQuery || p.progressQuery || (c.countFallback && hasAnyCondition(p) && !p.asking))   /* 3.41-01: paceQuery — 조건이 되면서 홈이 컨 100대를 나열하던 것(감사) */) {
    return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 답합니다. (예: "STSE 출항 몇 시" · "KBTR 리퍼 몇 대")';
  }

  //  ㉑ 잡담(검수앱은 여기서) → 용어·실무지식 → 콘앱 안내.
  if (c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* */ } }
  if (!p.asking) {
    try {
      let k = mirKnowledge(q);
      if (k) { _via('knowledge'); return k; }
      if (/^[가-힣A-Za-z0-9]{2,12}$/.test(q)) { try { k = mirKnowledge(q + '이 뭐야'); } catch (e) { k = null; } }
      if (k) { _via('knowledgeGuess'); return k; }
    } catch (e) { /* */ }
  }
  //  3.60-18 (M25): 여기까지 온 말은 못 알아들은 말이다 — 결산(mir_misses)·즉석 학습에 남긴다. 종전엔 generateLocalAnswer 를 거친 말만 기록돼
  //    «츌항 언제»(09-10) 같은 완전 무응답이 miss 0건으로 결산됐다. 같은 말은 10분에 한 번(mirObserve 안에서).
  //    ⚠ 접수된 질문(전송·음성 확정 — ctx.accepted)에서만 남긴다. 검색창(SearchPanel)·통합검색은 글자마다 answerOneRaw 를 부르므로 거기서 남기면 조각(«츌항»·«츌항 언»…)이 결산을 오염시키고 약신호에서 글자마다 쓰기가 나간다(감사 C1).
  if (c.accepted) { try { mirObserve(query, true, { who: c.inspector || '', mode: c.mode || '', voyageKey: c.voyageKey || '', app, recordOnly: true }); } catch (e) { console.warn('[미르] miss 기록 실패:', e); } }
  if (app === 'cone') { _via('coneHelp'); return CONE_QA_HELP; }
  return null;
}

/** 질문 하나에 답한다 — 미르 말투를 입혀서. 못 내면 null. */
export function answerOne(query, ctx) {
  const a = answerOneRaw(query, ctx);
  try { return a == null ? null : mirTone(a); } catch (e) { return a; }
}


// ═══════════════════════════════════════════════════════════════════════════════════════
// [mirModel] 모델 문 — 규칙이 약할 때만 askMir   (종전 src/mirModel.js)
// ═══════════════════════════════════════════════════════════════════════════════════════
// 미르의 모델 창구 — 규칙이 못 받거나 «약하게» 받은 말만 공용 키(검수사 부담)로 모델에 보내 ①미르 말로 번역해 규칙을 다시 돌리고 ②그래도 없으면 항차 자료를 실어 문장으로 답한다(판 B).
/* ★ TallyOne 3.42 / ConeOne 2.49 (판 B — 검수사 2026-09-10 «그간의 사용데이터로 생각하면 안됩니다 … 어떤질문이 들어 올지는 저도 모릅니다.
     제가 원하는건 그질문들에 적당한 답을 해주길 원합니다» · 관문 4 «계속 진행해주세요»)

   모델은 **여기 한 함수(askMirModel) 뒤에만** 있다. 규칙(mirAnswer.answerOneRaw)이 먼저이고, 아래 둘일 때만 부른다.
     ① 규칙이 null ② «약한 답» — 잡아채는 길(mirAnswer `_trace.via`: 사용법 매뉴얼·현재 시각·되묻기·베이사전 타령·진행 잡답·지식 추측·
        콘 안내·못 배움)에서 나왔거나, 질문에 미르가 모르는 낱말이 남았을 때(mirLeftover).
   1단계 번역 — 질문 + «미르가 아는 말 목록»만 보낸다(자료 0건). 번역이 규칙 답으로 이어지면 mir_lexicon 에 auto 로 적는다(mirLearnAlias 한 벌).
   2단계 자료 답 — 요약 + 미리 계산한 사실 + 질문에 맞는 컨 30줄만 싣는다. 전체 목록을 실었더니 모델이 없는 컨을 지어냈다(관문 4 실측
     «0230 24100kg») — 그래서 관련 줄만 싣고 **답 속 숫자가 자료에 없으면 답을 버린다**(문지기). 답 끝에 (AI) 표시.
   문지기 — 키·모델·하루 상한은 RTDB `mir_config` 한 칸(키가 없으면 개인 키, 둘 다 없으면 침묵) · 같은 문장은 한 세션에 한 번 ·
     10초 타임아웃 · 하루 상한(mir_model_log 오늘 줄 수) · 실패는 조용히 «못 배웠어요» 로 돌아가되 콘솔에 남긴다(빈 catch 금지).
   콘앱도 같은 번들(mir-core.js)로 이 함수를 쓴다 — 그래서 firebase SDK 없이 REST 로만 읽고 쓴다. */
const FB = 'https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app';
const GEM = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CAP = 300;
const CFG_TTL = 10 * 60 * 1000;
const TIMEOUT_MS = 10000;

// ── 미르가 모르는 낱말 — 종전 SearchPanel 음성 교정의 KNOWN 표를 한 벌로 옮기고(거기 사본은 지웠다) **토큰 사전**으로 바꿨다.
//   감사 실측(3.42 첫 판): 부분 문자열 정규식은 «시프팅»에서 «시»를 떼어 «프팅»을 모르는 낱말로 만들었고, 창구 예시 84개 중 22개가 «모르는 낱말 남음»이었다.
//   그래서 ① mirTokens(조사·문장부호 제거) 로 낱말을 자르고 ② 사전(아래 낱말 + 창구 예시의 낱말 전부)에 있으면 아는 말, ③ 사전 낱말이 앞머리로 붙은 것(«리퍼가»)·
//   흔한 어미(했어·열었어·됐어…)를 뗀 것도 아는 말로 본다. 한 글자 낱말은 세지 않는다.
const KNOWN_WORDS = `베이 리퍼 냉동 엠티 풀 위험물 디지 엑스레이 갑판 데크 홀드 선창 컨테이너 피트 온도 영하 영상 실번호 씰 봉인 잘림 잘린 파손 훼손 손상 대처 대처법 처리 조치 절차 무게 톤 위치 어디 몇 대 개 남은 남았 완료 진행 전체 전부 모두 몽땅 싹 죄다 도합 통틀어 합쳐 합치 수량 불러 뽑아 달라 다오 내렸 내린 누구 누가 소개 시야 시간 지금 오늘 내일 어제 날씨 기온 바람 입항 출항 입출항 접안 언제 며칠 요일 날짜 트윈 가능 불가 초과 불균형 수평 크레인 목록 리스트 양하 선적 쌓 빈자리 자리 평택 끝 끝나 끝났 페이스 속도 퇴근 점심 저녁 아침 걸려 걸리 예상 마치 종료 신고 세관 누락 바뀜 리씰 이상 인계 인수 교대 넘겨 특이사항 전달 있어 없어 있나 없나 찾아 알려 보여 보여줘 주세요 호기 갱 브리핑 마감 마감텔리 텔리 수치 해치 해치커버 커버 현측 우현 좌현 시작 커트 커트씰 봉인 전자봉인 전자 보류 수화물 환적 창고 임시창고 특수 특수제작 특수제작컨 규격 규격초과 치수 콜사인 호출부호 아이엠오 선속 도선 카고플랜 카고 플랜 베이플랜 밝게 어둡게 소리 순서 순서대로 다음 의심 클래스 오픈탑 하이큐브 플랫 탱크 무거운 가벼운 기록 적어 등록 담당 검수원 근무 주간 야간 뜻 어떻게 뭐야 뭔 무슨 미르 미르야 안녕 수고 고마워 힘들 먹 밥 배정 선박 배 작업 선수 선미 현황 상황 상태 대상 번호 열어 열었어 띄워 보자 이거 그거 저거 여기 거기 저기 아직 벌써 우리 이제 얼마 얼마나 언제쯤 몇시 시간당 시간별 제일 가장 화물 비엘 확인 확인된 선사 실오류 화면 하자 맞아 대수 우리배 우리 항 항구 정박 남아 남았어 걸린 걸렸어 들어와 나가 들어 나가는 몇시쯤 쯤 대략 마지막 처음 첫 완료된 완료했어 시작했어 끝났어 열렸어 붙었어 어때 어떤 뭐 무엇 몇번 오픈 클로즈 닫아 닫았어 닫혔어 조 근무자 사람 이름 담당자 현재 지금까지 중 안 못 잘 더 덜 것 거 건 개수 대수 척 척이야 갯수 모레 내일모레 낼모레 엊그제 그제 그저께 그끄저께 글피 어저께`.split(/\s+/).filter(Boolean);
const _ENDINGS = /(했어요|했어|했나요|했니|했지|됐어|됐나요|됐니|났어|었어|였어|있어요|있어|있나요|있니|없어요|없어|없나요|없니|해줘|해요|하자|할까|할래|해봐|해|줘요|줘|인가요|인지|이야|이에요|예요|이지|지요|지|야|요|까|니|나요|는지|은지|던|던가|어요|어|아요|아|을까|을래|ㄹ까|세요|십시오|십시요|주십시오|주세요|주라|해주세요)$/;
//  낱말 자르기 — mirLearn.mirTokens 는 조사(«로»)까지 떼어 «킬로»를 «킬»로 만든다. 여기서는 어미만 뗀다.
const _STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요', '있어', '없어', '이야', '이거', '그거', '저거']);
function _toks(q) {
  return String(q || '').replace(/[?？!.,~·…()\[\]"'«»#$/:;-]/g, ' ').trim().split(/\s+/).filter(Boolean).filter((t) => !_STOP.has(t));
}
let _KNOWN = null;
function _knownSet() {
  if (_KNOWN) return _KNOWN;
  const set = new Set(KNOWN_WORDS);
  //  창구 예시의 낱말은 정의상 미르가 아는 말이다 — 사전에 얹는다(예시를 그대로 물었는데 «모르는 낱말»이 남으면 안 된다)
  (MIR_CATALOG.match(/"([^"]+)"/g) || []).forEach((ex) => { _toks(ex.replace(/"/g, '')).forEach((t) => { if (/[가-힣]/.test(t)) { set.add(t); const st = t.replace(_ENDINGS, ''); if (st.length >= 2) set.add(st); } }); });
  _KNOWN = set;
  return set;
}
function _isKnown(tok0) {
  const set = _knownSet();
  const tok = tok0.replace(/^\d+/, '');   // «40피트»·«3번» — 숫자를 떼고 본다(재감사)
  if (!tok || set.has(tok)) return true;
  if (tok !== tok0 && tok.length === 1) return true;   // «16번»·«3층» — 숫자 뒤 한 글자는 단위다
  const stem = tok.replace(_ENDINGS, '');
  if (stem && stem !== tok && set.has(stem)) return true;
  for (const w of set) { if (w.length >= 2 && tok.startsWith(w) && tok.length - w.length <= 3) return true; }
  return false;
}
export function mirLeftover(q) {
  return _toks(q).filter((t) => /[가-힣]/.test(t) && t.length >= 2 && !_isKnown(t));
}
const WEAK_VIA = new Set(['howTo', 'time', 'modeChoice', 'gangDict', 'progress', 'knowledgeGuess', 'coneHelp', 'unlearned']);
const WEAK_TEXT = /못 배웠|이렇게 물어보세요|무슨 뜻인지 못 알아|어느 배 말씀인지/;
/** 규칙 답이 «약한 답»인가 — null · 잡아채는 길 · 모르는 낱말이 남음. 되묻기(modeChoice)는 화면이 단추로 받으니 약하지 않다고 본다. */
const PURE_TIME = /^(미르야\s*)?(지금\s*)?(몇\s*시|시간|시각|몇시)(야|이야|지|예요|인가요|입니까|니|냐|요)?\s*[?？]*$/;
const PURE_PROGRESS = /(진행|어디까지|얼마나\s*(했|됐)|몇\s*(프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(했|됐)|현황)/;
export function isWeakAnswer(q0, answer, trace) {
  if (answer == null || answer === '') return true;
  const via = trace && trace.via;
  if (via === 'modeChoice') return false;
  if (via === 'thread') return false;   // 3.68: 대화 층이 직접 받은 말(응·아니·끝맺음·되물음) — 모델·miss 로 보내지 않는다
  if (via === 'coneRest') return false; // ConeOne 2.64-01: 콘앱 «N번 홀드 콘 몇 개 남았어» 는 완료 기록을 센 자료 답 — «몇개»·«콘이» 가 사전에 없어도 모델로 보내지 않는다(보내면 질문이 고쳐져 컨테이너 대수 답으로 덮인다)
  if (via === 'yard') return false;     // 3.69: 야드 상황은 자료 답(«자료가 아직 안 왔어요» 도 답이다) — «야드»·«바빠» 가 사전에 없어도 모델로 보내지 않는다
  const q = (trace && trace.rq) ? trace.rq : q0;   // 3.68: 대화 층이 되쓴 말(«응»→«남은 대수»)은 되쓴 말로 잰다 — 원문의 «아니»·«번째»·«아까» 가 모르는 낱말로 남아 모델로 새던 것(감사 3)
  //  감사 지적 — 시각·진행 길이 **정답인 질문**(«지금 몇 시» «진행 상황»)까지 약하게 보면 모델이 그 답을 덮는다
  if (via === 'time' && PURE_TIME.test(String(q).trim())) return false;
  if (via === 'progress' && PURE_PROGRESS.test(String(q))) return false;
  if (via && WEAK_VIA.has(via)) return true;
  if (WEAK_TEXT.test(String(answer))) return true;
  return mirLeftover(q).length > 0;
}

// ── 공용 키·설정(RTDB 한 칸) ────────────────────────────────────────────────
let _cfg = null, _cfgAt = 0, _cfgP = null;
async function _fetchJson(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const j = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, j };
  } finally { clearTimeout(t); }
}
export async function getMirConfig(force = false) {
  const now = Date.now();
  if (!force && _cfg && now - _cfgAt < CFG_TTL) return _cfg;
  if (_cfgP && !force) return _cfgP;   // 3.43: 강제 갱신(🔑 저장·삭제 뒤)은 진행 중인 비강제 읽기를 기다리지 않고 새로 읽는다(감사 지적)
  _cfgP = (async () => {
    try {
      const r = await _fetchJson(`${FB}/mir_config.json`);
      const j = (r.ok && r.j && typeof r.j === 'object') ? r.j : {};
      let key = String(j.aiKey || '').trim();
      if (!key) { try { key = localStorage.getItem('master_gemini_api_key_v1') || ''; } catch (e) { key = ''; } }   // 공용 키가 비어 있으면 개인 키(종전 길)
      _cfg = { aiKey: key, model: String(j.model || DEFAULT_MODEL), dailyCap: Number(j.dailyCap) > 0 ? Number(j.dailyCap) : DEFAULT_CAP, enabled: j.enabled !== false, sharedKey: !!String(j.aiKey || '').trim() };
      _cfgAt = Date.now();
    } catch (e) {
      console.warn('[미르 모델] mir_config 를 못 읽었어요 — 이번엔 모델 없이 갑니다:', e && e.message);
      _cfg = _cfg || { aiKey: '', model: DEFAULT_MODEL, dailyCap: DEFAULT_CAP, enabled: false, sharedKey: false };
      _cfgAt = Date.now() - CFG_TTL + 60 * 1000;   // 1분 뒤 다시 시도
    } finally { _cfgP = null; }
    return _cfg;
  })();
  return _cfgP;
}
const _dayKey = () => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
let _dayCount = { day: '', n: 0, at: 0 };
async function _todayCount() {
  const day = _dayKey();
  if (_dayCount.day === day && Date.now() - _dayCount.at < 60 * 1000) return _dayCount.n;
  try {
    const r = await _fetchJson(`${FB}/mir_model_log/${day}.json?shallow=true`, {}, 6000);
    const n = (r.ok && r.j && typeof r.j === 'object') ? Object.keys(r.j).length : 0;
    _dayCount = { day, n, at: Date.now() };
    return n;
  } catch (e) { console.warn('[미르 모델] 오늘 호출 수를 못 읽었어요:', e && e.message); return _dayCount.day === day ? _dayCount.n : 0; }
}
function _logCall(entry) {
  const day = _dayKey();
  _dayCount = { day, n: (_dayCount.day === day ? _dayCount.n : 0) + 1, at: _dayCount.at || Date.now() };
  try { fetch(`${FB}/mir_model_log/${day}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ at: Date.now(), ...entry }) }).catch((e) => console.warn('[미르 모델] 호출 기록 실패:', e && e.message)); }
  catch (e) { console.warn('[미르 모델] 호출 기록 실패:', e && e.message); }
}
/** «엉뚱하게 알아들은 말»·못 알아들은 말을 mir_misses 에 남긴다 — 검수앱은 App 의 gm-mir-miss 리스너(fbLogMirMiss)로, 리스너가 없는 콘앱은 REST 로. */
function _logMiss(q, meta) {
  try {
    const key = mirKey(q);
    if (typeof window !== 'undefined' && window.__mirMissListener && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-mir-miss', { detail: { q, key, at: Date.now(), ...meta } }));
      return;
    }
    fetch(`${FB}/mir_misses/${_dayKey()}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, key, at: Date.now(), ...meta }) }).catch((e) => console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message));
  } catch (e) { console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message); }
}

// ── 모델 호출(공용 함수) ─────────────────────────────────────────────────────
async function _gem(cfg, prompt, maxOut, json) {
  const t0 = Date.now();
  const r = await _fetchJson(`${GEM}/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.aiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: maxOut, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
  }, TIMEOUT_MS);
  if (!r.ok) { const m = (r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status); throw new Error(m); }
  const text = (r.j && r.j.candidates && r.j.candidates[0] && r.j.candidates[0].content && r.j.candidates[0].content.parts && r.j.candidates[0].content.parts[0] && r.j.candidates[0].content.parts[0].text || '').trim();
  const u = (r.j && r.j.usageMetadata) || {};
  return { text, tokIn: u.promptTokenCount || 0, tokOut: u.candidatesTokenCount || 0, ms: Date.now() - t0 };
}

// ── ① 번역 — 미르가 아는 말 목록(창구) ─────────────────────────────────────
export const MIR_CATALOG = `
[컨 한 대 — 끝 4자리나 번호 뒤에 무엇을 묻는지] 예: "3426 온도" "0230 실번호" "0230 중량" "7758 다음 항 어디야" "0230 비엘 번호" "0230 치수" "0686 엑스레이 대상이야" "0230 완료했어" "0230 몇 피트야" "4777 어디 있어" "0230 상태"
[대수] 예: "리퍼 몇 대" "20피트 몇 대" "엠티 몇 대" "풀 몇 대" "위험물 몇 대" "엑스레이 몇 대" "양하 몇 대 남았어" "선적 몇 대" "전체 몇 대" "환적 화물 몇 대" "엠티실 몇 대 남았어" "규격초과 몇 대"
[자리·목록] 예: "리퍼 어디" "엑스레이 대상 위치" "위험물 어디" "FR 어디" "16번 베이" "5번 베이 데크" "3번 홀드" "규격초과 치수" "임시창고 뭐 있어" "특수제작컨 있어" "보류 뭐 있어" "수화물 확인된 거"
[항차 사실] 예: "마감텔리 수치" "해치커버 열었어" "접안 현측" "작업 몇 시에 시작했어" "양하 언제 끝났어" "커트씰 기록" "전자봉인 몇 대" "실번호 의심" "양하 대수가 안 맞아"
[진행·속도] 예: "브리핑" "얼마나 남았어" "몇 시쯤에 끝나" "시간당 몇 개 했어" "작업 속도" "몇 개 했어" "진행 상황"
[배·시각·날씨] 예: "KBTR 브리핑" "콜사인" "IMO" "선박 소개" "입항 몇 시" "출항 몇 시" "도선 몇 시" "날씨" "지금 몇 시" "선속" "다음 항"
[호기·갱·근무자(말하기와 적기)] 예: "1호기 누구야" "갱 몇 개" "1호기 이인철 2호기 최관식" "2호기 23:15 시작했어" "갱 3개"
[뜻·사용법·현장 대처] 예: "시프팅이 뭐야" "FR이 뜻" "트윈 어떻게 해" "해치커버 어떻게 열어" "씰 잘렸을 때 어떻게 해" "천정 구멍 어떻게 처리해" "리퍼 전원 꺼졌어 어떻게"
[화면 열기] 예: "카고플랜 보여줘" "베이플랜 보여줘" "선적 플랜 보여줘" "KBTR 카고플랜 보여줘"
[기기] 예: "화면 밝게" "화면 어둡게" "소리 꺼"
[순서 부르기] 예: "순서대로 양하하자" "다음"
[수석 보드] 예: "오늘 작업 선박" "내일 작업 선박" "실오류 선박" "우리 배야?"`;
function _shipsLine(ctx) {
  const out = [];
  const add = (i) => { if (i && (i.vsl || i.vslFull)) out.push(`${i.vsl || ''}(${i.vslFull || ''})`); };
  if (ctx.info) add(ctx.info);
  if (ctx.voyages && typeof ctx.voyages === 'object') Object.values(ctx.voyages).forEach((v) => add(v && v.info));
  return [...new Set(out)].slice(0, 30).join(', ');
}
export async function translateQuestion(q, ctx, cfg) {
  const prompt = `너는 평택항 컨테이너 검수앱의 도우미 «미르»가 못 알아들은 말을 «미르가 아는 말»로 바꿔 주는 번역기다. 답하지 말고 바꾸기만 한다.
미르가 아는 말(창구와 예시):${MIR_CATALOG}
지금 앱에 있는 배: ${_shipsLine(ctx) || '(없음)'}
규칙:
1. 질문의 뜻이 위 창구 중 하나에 맞으면, 그 창구의 예시 모양대로 짧은 한 문장을 만든다. 컨테이너 번호(끝 4자리나 전체), 배 이름(영문 4자 약자로), 베이·호기·시각·사람 이름은 그대로 보존한다. 배를 한글 이름으로 불렀으면 위 목록의 영문 4자로 바꾼다.
2. 뜻이 어느 창구에도 없으면 canonical 을 빈 문자열로 둔다. 지어내지 않는다.
3. 잡담·인사·감정 표현은 canonical 빈 문자열, window "잡담".
JSON 한 줄로만 답한다: {"canonical":"...","window":"창구 이름","confidence":0.0}
질문: "${q}"`;
  const r = await _gem(cfg, prompt, 120, true);
  let j = null;
  try { j = JSON.parse(r.text.replace(/^```json|```$/g, '').trim()); } catch (e) { return { canonical: '', window: '', confidence: 0, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, bad: r.text.slice(0, 80) }; }
  return { canonical: String((j && j.canonical) || '').trim(), window: String((j && j.window) || ''), confidence: Number((j && j.confidence) || 0), tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms };
}

// ── ② 자료 답 — 요약 + 계산해 둔 사실 + 질문에 맞는 컨 ───────────────────────
const _pos = (c) => c.deckPos ? String(c.deckPos) : [c.bay, c.row, c.tier].filter((x) => x !== undefined && x !== null && x !== '').join('-');   // 4.04-02: RZOR 덱플랜 좌표 먼저
const _iso = (c) => c.iso || c.tp || c.type || c.size || '';
const _isRf = (c) => !!(c.rf || c.isReefer || isReeferIso(String(_iso(c))));   // 3.60-10 (진단 M6): 리퍼 한 벌 — 옛 식은 rf 없는 45R1 을 놓쳤다
const _isRfFull = (c) => _isRf(c) && isFullReefer({ ...c, rf: true });   // 4.15 (§7.8-⑪): 요약 «리퍼» 대수는 풀 리퍼만 — 엠티·리퍼드라이·제작컨 빼는 규칙은 utils.isFullReefer 한 벌
const _isDg = (c) => !!(c.dg || c.imdg || c.dgc || c.un || c.dgClass);
const _isX = (c) => !!(c._xray || c.isXray);
const _isDone = (c) => !!(c._comp || c.comp);
const _doneAt = (c) => { const k = c._comp || c.comp; return k ? Number(k.at || k.time || 0) : 0; };
const _tm = (ms) => { if (!ms) return ''; try { const d = new Date(ms); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch (e) { return ''; } };
const _modeKo = (c) => ((c._mode || c.mode) === 'loading' ? '선적' : '양하');
export function buildDataPack(q, ctx) {
  //  평택분만(감사 실측: 통과화물이 섞이면 NSFR «양하 423»이 팩에 들어가 문지기를 통과한다). _ptk 가 없는 컨(콘앱 등)은 그대로 둔다.
  const cs = (Array.isArray(ctx.containers) ? ctx.containers : []).filter((c) => c && c._ptk !== false);
  const info = ctx.info || {};
  const digs = (String(q).match(/\d{4,7}/g) || []);
  const cnt = (arr, f) => { const m = {}; arr.forEach((c) => { const k = f(c) || '?'; m[k] = (m[k] || 0) + 1; }); return m; };
  const d = cs.filter((c) => (c._mode || c.mode) !== 'loading'), l = cs.filter((c) => (c._mode || c.mode) === 'loading');
  const sum = (arr) => ({ 총: arr.length, 규격: cnt(arr, _iso), 풀엠티: cnt(arr, (c) => c.fe), 리퍼: arr.filter(_isRfFull).length, 위험물: arr.filter(_isDg).length, 엑스레이: arr.filter(_isX).length, 규격초과: arr.filter((c) => c.oog).length, 완료: arr.filter(_isDone).length, 미완료: arr.filter((c) => !_isDone(c)).length, 실번호없음: arr.filter((c) => !c.sl).length, POD별: cnt(arr, (c) => c.pod), POL별: cnt(arr, (c) => c.pol) });
  const summary = { 배: `${info.vsl || ''} ${info.vslFull || ''}`.trim(), 항차: { 양하: info.voy_d || info.voy || '', 선적: info.voy_l || '' }, 부두: info.pier || '', 선석: info.berth || '', 접안: info.berthSidePick || info.berthSide || '', 작업시작: info.workStartAt || '', 작업끝: info.workEndAt || '', 양하완료시각: (typeof info.dischargeDoneAt === 'number' ? _tm(info.dischargeDoneAt) : (info.dischargeDoneAt || '')), 양하: sum(d), 선적: sum(l) };
  const byWt = cs.filter((c) => Number(c.wt) > 0).sort((a, b) => Number(b.wt) - Number(a.wt));
  const derived = {
    제일무거운5: byWt.slice(0, 5).map((c) => `${c.cn} ${c.wt}kg ${_modeKo(c)} ${_pos(c)}`),
    제일가벼운5: byWt.slice(-5).reverse().map((c) => `${c.cn} ${c.wt}kg`),
    위험물_클래스별: cnt(cs.filter(_isDg), (c) => '클래스 ' + (c.dgc || c.dgClass || c.imdg || '?')),
    위험물_목록: cs.filter(_isDg).slice(0, 20).map((c) => `${c.cn} 클래스${c.dgc || c.dgClass || c.imdg || '?'} UN${c.un || c.unno || '?'} ${_pos(c)} ${_modeKo(c)}`),
    리퍼_목록: cs.filter(_isRf).slice(0, 20).map((c) => `${c.cn} 온도 ${c.tmp || c.rfSet || c.temp || '기록없음'} ${c.fe === 'E' ? '엠티' : '풀'} ${_pos(c)}`),
    규격초과_목록: cs.filter((c) => c.oog).slice(0, 20).map((c) => `${c.cn} ${c.oogDim || ''} ${_pos(c)}`),
    엑스레이_목록: cs.filter(_isX).slice(0, 20).map((c) => `${c.cn} ${_pos(c)} 실번호 ${c.sl || '?'}`),
    완료_마지막10: cs.filter((c) => _doneAt(c)).sort((a, b) => _doneAt(b) - _doneAt(a)).slice(0, 10).map((c) => `${c.cn} ${_tm(_doneAt(c))} ${((c._comp || c.comp || {}).equip || '')}`),
    미완료_앞10: cs.filter((c) => !_isDone(c)).slice(0, 10).map((c) => `${c.cn} ${_modeKo(c)} ${_pos(c)}`),
    실번호없는컨_앞10: cs.filter((c) => !c.sl).slice(0, 10).map((c) => `${c.cn} ${_modeKo(c)}`),
  };
  const line = (c) => [c.cn, _modeKo(c).slice(0, 1), _iso(c), c.fe || '', c.pol || '', c.pod || '', _pos(c), c.wt || '', c.tmp || c.rfSet || '', _isDg(c) ? ('DG' + (c.dgc || c.dgClass || '')) : '', c.un || c.unno || '', c.sl || '', c.eseal || '', _isX(c) ? 'X' : '', _isDone(c) ? '완' : '', c.oog ? ('OOG' + (c.oogDim || '')) : ''].join('|');
  const hit = cs.filter((c) => digs.some((dd) => String(c.cn || '').endsWith(dd)));
  const kw = []; const Q = String(q).toUpperCase();
  if (/리퍼|냉동|냉장|온도/.test(q)) kw.push(_isRf);
  if (/위험|디지|DG|UN|클래스/i.test(q)) kw.push(_isDg);
  if (/엑스|XRAY|X-RAY|세관/i.test(q)) kw.push(_isX);
  if (/오버|규격|초과|OOG|플랫|오픈/i.test(q)) kw.push((c) => c.oog || /OT|FR|PF/.test(String(_iso(c))));
  if (/엠티|빈|공/.test(q)) kw.push((c) => c.fe === 'E');
  const bayM = q.match(/(\d{1,2})\s*번?\s*베이/); if (bayM) kw.push((c) => String(Number(c.bay)) === String(Number(bayM[1])));
  const ports = [...new Set(cs.flatMap((c) => [c.pod, c.pol]).filter(Boolean))]; ports.forEach((pc) => { if (Q.includes(String(pc).toUpperCase())) kw.push((c) => c.pod === pc || c.pol === pc); });
  const rel = kw.length ? cs.filter((c) => !hit.includes(c) && kw.some((f) => f(c))).slice(0, 30) : [];
  const cols = '컨번호|양하선적|규격|풀엠티|POL|POD|자리(베이-로우-티어)|중량kg|리퍼온도|위험물|UN|실번호|전자봉인|엑스레이|완료|규격초과';
  return { summary, 계산해둔것: derived, 컨목록_열: cols, 질문에맞는컨: [...hit, ...rel].map(line) };
}
export async function dataAnswer(q, ctx, cfg) {
  const pack = buildDataPack(q, ctx);
  const packTxt = JSON.stringify(pack);
  const prompt = `너는 평택항 검수앱의 도우미 «미르»다. 아래 자료만 보고 검수원의 질문에 한국어로 3문장 이내로 답한다. «계산해둔것»에 있으면 그것을 그대로 쓰고 직접 세지 않는다. 목록을 말할 땐 5개까지만. 자료의 항목 이름(«계산해둔것» 같은 말)은 입에 올리지 않는다. 자료에 없는 것은 «자료에 없어요»라고 말하고 지어내지 않는다. 숫자·번호는 자료 그대로 쓴다. 존댓말(~예요).
자료(JSON): ${packTxt}
질문: "${q}"`;
  const r = await _gem(cfg, prompt, 220, false);
  let text = r.text;
  let rejected = null;
  if (text) {
    //  문지기 — 답 속 숫자(2자리 이상)가 자료에 없으면 지어낸 것이다. 버린다.
    const bad = (text.match(/\d{2,}/g) || []).filter((n) => !packTxt.includes(n));
    if (bad.length) { rejected = { text, bad }; text = '자료로는 확실한 답을 못 만들었어요 — 화면에서 확인해 주세요.'; }
  }
  return { text, rejected, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, packChars: packTxt.length };
}

/** 사전 등록 한 벌 — 이 폰 메모리(mirLearnAlias) + 보관소. 검수앱은 App 이 건 쓰기 손(window.__mirLexiconWrite)이 적고, 손이 없는 콘앱은 REST 로 적는다. */
function _learn(q, canonical, who, window_) {
  try {
    const key = mirLearnAlias(q, canonical, who || 'model', { src: 'model', window: window_ || '' });
    if (!key) return;
    const hasHand = typeof window !== 'undefined' && typeof window.__mirLexiconWrite === 'function';
    if (!hasHand) {
      const entry = (typeof window !== 'undefined' && window.__mirLexicon && window.__mirLexicon[key]) || null;
      if (entry) fetch(`${FB}/mir_lexicon/${encodeURIComponent(key.replace(/[.#$/\[\]]/g, '_'))}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch((e) => console.warn('[미르 모델] 사전 보관소 쓰기 실패:', e && e.message));
    }
  } catch (e) { console.warn('[미르 모델] 사전 등록 실패:', e && e.message); }
}

// ── 한 세션 안 같은 문장 재호출 금지 ────────────────────────────────────────
//   감사 지적(3.42 첫 판) — 답 문장을 항차 구분 없이 캐시하면 KBTR 답이 NSFR 에서 그대로 나오고, 완료가 바뀌어도 옛 답이다.
//   그래서 **번역문(canonical)과 자료 답만** 항차·앱별로 기억하고, 규칙은 매번 다시 돌린다. 오류는 기억하지 않는다(망 복구 뒤 재시도).
const _memo = new Map();   // `${app}|${voyageKey}|${문장}` → { canonical, window, model, at } 또는 진행 중 Promise
const _norm = (q) => String(q || '').trim().replace(/\s+/g, ' ').toLowerCase();
const _memoKey = (q, ctx) => `${ctx && ctx.app || ''}|${ctx && ctx.voyageKey || ''}|${_norm(q)}`;

/** 규칙이 약할 때만 모델을 부른다. rules(q) 는 «미르 말»로 바꾼 문장을 규칙에 다시 돌리는 함수(문자열 또는 null).
    돌려주는 값: { text, via:'translate'|'confirmed'|'model'|null, canonical, reason } — text 가 null 이면 모델도 못 받은 것(규칙 답으로 돌아간다). */
export async function askMirModel(q, ctx, rules, opts = {}) {
  const key = _memoKey(q, ctx);
  if (!_norm(q) || _norm(q).length < 2) return { text: null, via: null, reason: 'short' };
  const cached = _memo.get(key);
  if (cached && typeof cached.then === 'function') return cached;                       // 진행 중 — 같은 약속을 돌려준다(동시 재전송 4회 호출 방지)
  if (cached) return _finish(q, ctx, rules, opts, cached, true);                       // 끝난 것 — 번역·자료 답은 기억, 규칙은 다시
  const p = (async () => {
    const cfg = await getMirConfig();
    if (!cfg.enabled || !cfg.aiKey) { _memo.delete(key); return { text: null, via: null, reason: cfg.enabled ? 'nokey' : 'off' }; }
    const n = await _todayCount();
    if (n >= cfg.dailyCap) { _memo.delete(key); console.warn(`[미르 모델] 오늘 상한 ${cfg.dailyCap}회에 닿았어요 — 규칙만으로 갑니다`); return { text: null, via: null, reason: 'cap' }; }
    const who = opts.who || '';
    let tr = null;
    try {
      tr = await translateQuestion(q, ctx, cfg);
      _logCall({ kind: 'translate', q: String(q).slice(0, 80), canonical: tr.canonical, window: tr.window, conf: tr.confidence, ok: true, tokIn: tr.tokIn, tokOut: tr.tokOut, ms: tr.ms, who, app: ctx.app || '' });
    } catch (e) {
      console.warn('[미르 모델] 번역 실패:', e && e.message);
      _logCall({ kind: 'translate', q: String(q).slice(0, 80), ok: false, err: String(e && e.message || e).slice(0, 120), who, app: ctx.app || '' });
      tr = null;
    }
    const rec = { canonical: (tr && tr.canonical) || '', window: (tr && tr.window) || '', confidence: (tr && tr.confidence) || 0, translated: !!tr, model: null, at: Date.now() };
    const out = await _finish(q, ctx, rules, opts, rec, false, cfg);
    if (out.reason === 'error') _memo.delete(key); else _memo.set(key, rec);
    return out;
  })();
  _memo.set(key, p);
  try { return await p; } catch (e) { _memo.delete(key); throw e; }
}
/** 번역문으로 규칙을 다시 돌리고, 없으면 자료 답. rec 은 기억된 번역·자료 답. */
async function _finish(q, ctx, rules, opts, rec, fromMemo, cfg = null) {
  const who = opts.who || '';
  const out = { text: null, via: null, canonical: rec.canonical || '', reason: '' };
  const weakByWordsOnly = !!(opts.weakText && !(opts.weakVia && WEAK_VIA.has(opts.weakVia)));   // 잡아채는 길이 아니라 «모르는 낱말» 때문에만 약했던 답
  const identity = !rec.canonical || _norm(rec.canonical) === _norm(q);
  //  ★ 3.43-02 — 규칙이 **현장 원장(mirKnowledge)** 으로 답했는데 낱말만 몰라 약하게 본 경우, 번역문의 규칙 답이 달라도 원장 답을 바꾸지 않는다.
  //    검수사 실측 2026-09-11 «씰 잘림 대처법» — 원장이 씰 절차를 답했는데 «잘림·대처법» 이 사전에 없어 모델이 «실번호 의심» 으로
  //    번역했고 그 규칙 답(씰번호 틀림)이 원래 답을 덮었다. 자료 답(«0230 몇 킬로 나가» → «0230 중량»)은 종전대로 번역이 이긴다.
  //    번역은 mir_misses 에 남겨 결산에서 가르친다.
  if (!identity && weakByWordsOnly && opts.weakVia === 'knowledge') {
    if (!fromMemo) _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: 'weak→translate(kept)' });
    out.text = opts.weakText; out.via = 'confirmed'; out.reason = 'kept'; return out;
  }
  if (!identity) {
    let a = null;
    try { a = rules(rec.canonical); } catch (e) { console.warn('[미르 모델] 번역문 규칙 실패:', e && e.message); a = null; }
    const sameCatch = !!(opts.weakText && a && String(a) === String(opts.weakText) && opts.weakVia && WEAK_VIA.has(opts.weakVia));
    if (a && !WEAK_TEXT.test(String(a)) && !sameCatch) {
      out.text = a; out.via = 'translate';
      if (!fromMemo) {
        if (rec.confidence >= 0.9) _learn(q, rec.canonical, who, rec.window);   // 3.60-19 (다수결 V9): 0.7 → 0.9 — «6배의 작업 현황»→«6번 베이»(0.85)처럼 음성 오인이 공용 사전에 굳었다. 0.7~0.9 는 결산(mir_misses) 후보로만.
        _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: opts.weakText ? 'weak→translate' : 'null→translate' });
      }
      return out;
    }
  }
  //  원래 답이 «모르는 낱말» 때문에만 약했다면(잡아채는 길이 아님) 그 답은 대체로 맞다 — 자료 답이 **더 아는 것**(«클래스별로 몇 개씩»)일 때만 바꾸고,
  //  모델이 «자료에 없어요»·못 만듦이면 그 답을 «확인된 것»으로 돌려준다(감사: 강한 답을 «자료에 없어요 (AI)» 로 덮지 않는다).
  const confirmed = () => { out.text = opts.weakText; out.via = 'confirmed'; return out; };
  if (weakByWordsOnly && identity && rec.translated && !rec.canonical) { /* 번역도 «없다»고 한 말 — 자료 답을 한 번 본다 */ }
  else if (weakByWordsOnly) return confirmed();
  //  잡담은 자료 답으로 가지 않는다
  if (rec.window === '잡담' && /미르|힘드|수고|고마|안녕|밥|점심|저녁|아침|커피/.test(q)) { out.reason = 'smalltalk'; return weakByWordsOnly ? confirmed() : out; }
  //  ② 자료 답 — 기억된 것이 있으면 그것(같은 항차·같은 문장), 없으면 모델
  if (rec.model && Date.now() - (rec.at || 0) < 10 * 60 * 1000) { out.text = rec.model; out.via = 'model'; return out; }   // 자료 답은 10분만 기억 — 진행이 바뀌면 다시(재감사)
  if (!cfg) cfg = await getMirConfig();
  if (!cfg.aiKey) { out.reason = 'nokey'; return weakByWordsOnly ? confirmed() : out; }
  try {
    const da = await dataAnswer(q, ctx, cfg);
    _logCall({ kind: 'data', q: String(q).slice(0, 80), ok: true, rejected: !!da.rejected, tokIn: da.tokIn, tokOut: da.tokOut, ms: da.ms, packChars: da.packChars, who, app: ctx.app || '' });
    const empty = !da.text || /자료에 없어요|자료에는 없|확실한 답을 못/.test(String(da.text));
    if (weakByWordsOnly && (da.rejected || empty)) return confirmed();
    if (da.text && !da.rejected) { out.text = da.text + ' (AI)'; out.via = 'model'; rec.model = out.text; }
    else if (da.rejected) { out.text = '자료로는 확실한 답을 못 만들었어요 — 화면에서 확인해 주세요. (AI)'; out.via = 'model'; out.rejected = da.rejected; }   // 지어낸 숫자 — 잡아채는 길의 엉뚱한 답으로 돌아가느니 솔직하게
    _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical || '', how: opts.weakText ? 'weak→model' : 'null→model', rejected: !!da.rejected });
  } catch (e) {
    console.warn('[미르 모델] 자료 답 실패:', e && e.message);
    _logCall({ kind: 'data', q: String(q).slice(0, 80), ok: false, err: String(e && e.message || e).slice(0, 120), who, app: ctx.app || '' });
    out.reason = 'error';
  }
  return out;
}

/** 규칙 → (약하면) 모델. 화면이 부르는 한 함수. rulesFn(q, trace) 는 그 화면의 answerOneRaw 호출(ctx 는 화면이 감싼다).
    돌려주는 값: { text, via:'rules'|'lexicon'|'translate'|'confirmed'|'model'|null, weak, rulesText, trace } */
export async function askMir(q, ctx, rulesFn, opts = {}) {
  const trace = {};
  let rulesText = null;
  try { rulesText = rulesFn(q, trace); } catch (e) { console.warn('[미르] 규칙 답 실패:', e && e.message); rulesText = null; }
  const weak = isWeakAnswer(q, rulesText, trace);
  if (!weak) return { text: rulesText, via: 'rules', weak: false, rulesText, trace };
  //  숫자만·한글 없음 → 모델을 부를 말이 아니다(끝네자리 조회는 화면 카드가 답한다). 조작·적는 말(밝기·호기·시작·갱)은 규칙이 이미 했다 — 번역문으로 두 번 실행하지 않는다(감사 실측 밝기 두 칸).
  let p = null; try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (/^[\d\s.,-]+$/.test(String(q)) || !/[가-힣]{2,}|[A-Za-z]{3,}/.test(String(q)) || (p && (p.deviceCmd || p.crewSet || p.startSet || p.gangSet))) return { text: rulesText, via: rulesText ? 'rules' : null, weak, rulesText, trace };
  //  배운 별칭이 있으면 모델 없이 그것으로(nlSearch 의 되쓰기는 «못 알아들었을 때»만 도는데, 여기는 «약하게 알아들은 말»도 받는다)
  try {
    const rw = mirRewrite(q);
    if (rw && _norm(rw) !== _norm(q)) { const t2 = {}; const a = rulesFn(rw, t2); if (a && !isWeakAnswer(rw, a, t2)) return { text: a, via: 'lexicon', weak, rulesText, trace, canonical: rw }; }
  } catch (e) { console.warn('[미르] 별칭 되쓰기 실패:', e && e.message); }
  const m = await askMirModel(q, ctx, (cq) => rulesFn(cq, {}), { who: opts.who || ctx.inspector || '', weakText: rulesText, weakVia: trace.via || '' });
  if (m && m.text) return { text: m.text, via: m.via, weak, rulesText, trace, canonical: m.canonical };
  return { text: rulesText, via: rulesText ? 'rules' : null, weak, rulesText, trace, reason: m && m.reason };
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// [mirThread] 대화 — 답 뒤에 한 마디 더 · 얼버무린 답만 확인 · 끝은 검수사가 (3.68 / ConeOne 2.57 신설)
// ══════════════════════════════════════════════════════════════════════════════════════════
/* ★ TallyOne 3.68 (검수사 2026-09-29)
     «예를 들면 몇시에 끝나 하면 그 답만 하고 끝납니다. 다른 질문을 받거나 왜 그질문을 했는지 의도를 묻지 않습니다.
      그리고 미르가 답한게 원하는건지 다른 대답을 했는지 확인을 안합니다.»
     «네 원하는것은 미르가 대화를 끝내는게 아니고 사용자가 끝낼수 있게 했으면 합니다. 미르가 좀더 친절 했으면 하는것입니다.»

   ── 한 벌의 규칙(관문 4 시뮬 확정 2026-09-29 13:35 «네»)
   · 대화 단위 = **검수원 한 사람의 한 줄**(키는 항차 키|검수원이지만, 같은 검수원이 다른 항차 키로 이어 말하면 가장 최근 대화에 붙인다 — 떠 있는 미르는 배 이름을 바꿔 가며 묻는다).
     마지막 말에서 3분. 최근 5턴만. 메모리에만 두고 보관소에 쓰지 않는다.
   · 답 뒤 한 마디(follow) — 규칙이 강하게 답했으면 «왜 물었을까»에 맞는 다음 제안 한 줄 + 누르면 그대로 묻는 칩 2~3개.
     칩은 전부 엔진이 강한 답을 내는 말만(관문 4 칩 전수 21/21). 숫자는 지어내지 않는다(제안만).
   · 확인(confirm) — 엔진이 얼버무린 길(WEAK_VIA·WEAK_TEXT — howTo·knowledgeGuess·unlearned…)이나 모델 답일 때만 «제가 맞게 알아들었나요?».
     모르는 낱말(이름·선박코드)만으로 약한 답은 얼버무림이 아니다(1판 시뮬 41/78 → 2/78).
   · 대화 중 «응/네/sp/그래» = 첫 칩 · «두 번째» = 그 번호 · «아니 ○○» = 새 질문 · «그거·아까 그 컨» = 직전 컨 · «아니»만 = 두고 보기
     · 끝맺음(됐어·그만·고마워·수고·괜찮아·오케이·끝 — 12자 이하·묻는 말 아님) = 접는다. 미르가 먼저 끝내지 않는다.
   · 대화 밖 «응·sp·그만» 은 모델·오답학습으로 보내지 않고 «네? 뭐 확인해 드릴까요?» + 칩 3개.
   · 같은 제안을 두 번 하지 않는다. 작업이 다 끝났으면 «다음 배 일정 볼까요?». 못 찾은 번호·베이는 «다시 불러 주시면 바로 찾을게요».

   ── 배선(§4-4 한 벌 · §4-4 문지기는 데이터가 들어오는 자리)
   · 풀기(mirThreadResolve)는 **순수**다 — answerOneRaw 머리에서 «응»을 첫 칩으로 바꾸거나(직접 답이면 via='thread' 로 돌려준다) 기억을 바꾸지 않는다.
     검색창·통합검색은 글자마다·다시 그릴 때마다 answerOneRaw 를 부르므로 여기서 기억을 바꾸면 같은 «응»이 두 번째 그림에서 다른 답이 된다.
   · 기록(mirThreadCommit)은 화면이 **접수 시점에 한 번** 부른다(떠 있는 미르 ask · 검색창 askedAt effect · 통합검색 · 탭 카드 · 콘앱 mirAsk).
     같은 접수(ctx._utterAt = 화면 askedAt)를 다시 풀어도 같은 결과가 나오게 마지막 발화(lastUtter)를 기억한다 — 접수 표가 없는 자리(떠 있는 미르·콘앱)는 한 번만 부르니 그대로 새로 푼다. 한 마디는 답 문자열이 아니라 돌려주는 값({line, chips, confirm})이다 —
     smoke_mirsame 의 «두 앱 같은 답» 정확 비교와 WEAK_TEXT 문지기가 그대로 선다.
   · 대화 층이 직접 받은 말(응·아니·끝맺음·되물음)은 via='thread' — isWeakAnswer 가 약하지 않다고 보므로 모델·mir_misses·학습 짝(_pending)에 안 간다.
     되쓴 말(«응»→«남은 대수»)은 ctx._trace.rq 에 적고 isWeakAnswer 가 그것으로 잰다 — 원문의 «아니»·«번째» 가 모르는 낱말로 남아 모델로 새지 않게(감사 3).
   · 기억은 **앱마다 따로**(모듈 메모리 — 검수앱 번들과 콘앱 mir-core.js 가 각자 가진다). 검수원이 빈 키(조회만·콘앱 미로그인)는 같은 폰의 한 사람으로 본다 — 여러 사람이 한 폰을 쓰면 섞일 수 있다(허용, 콘앱은 한 폰 한 사람).
   · 끝맺음은 **끝맺음 낱말만 있는 말**이다 — «0230 완료됐어»·«양하 다 됐어»·«OK 3426» 은 업무 말이라 엔진이 답한다(감사 9 회귀 실측 뒤 앵커 정규식으로). */
const THREAD_WINDOW_MS = 3 * 60 * 1000;
const THREAD_MAX_TURNS = 5;
const _threads = {};                 // key(voyageKey|inspector) → { turns:[{q, rq, intent, entity, answer, follow, confirm, at}], at, lastUtter }
let _threadClosed = null;            // 방금 접은 대화 — 같은 «됐어»를 다시 그릴 때 같은 문구
//  끝맺음 — **끝맺음 낱말만 있는 말**(감사 실측 «0230 완료됐어»·«양하 다 됐어»·«다 됐어»·«OK 3426» 은 업무 말이다 — 낱말이 들어 있다고 접지 않는다)
const TH_CLOSE_RE = /^(?:(?:응|네|어|예|아|아니|아냐|아니야|이제|자|그래|오케이|ok)\s*,?\s*)?(?:됐어요?|됐다|됐습니다|그만|그만해|그만할게|고마워요?|고맙습니다|고맙다|감사합니다|감사해요?|감사|수고|수고했어|수고하세요|수고해|수고 많았어|괜찮아요?|괜찮습니다|오케이|ok|okay|ㅇㅋ|끝|끝이야|알았어|알겠어|알겠습니다|알았어요|알겠어요|바이|잘자|잘 자)(?:요|입니다)?(?:\s*,?\s*(?:고마워요?|고맙습니다|감사합니다|수고|수고하세요|미르야|미르))?[.!~\s]*$/i;
const TH_ASK_WORD = /(몇|언제|어디|뭐|무슨|어떻게|누구|얼마|\?|？)/;
const TH_YES_RE = /^(?:(?:응|어|네|예)\s*,?\s*)?(응|어|네|넵|예|그래|그래요|좋아|좋아요|좋지|해줘|해 줘|부탁해|ㅇㅇ|sp|웅|응응|그러자|그럴까|해봐|보여줘|알려줘|맞아|맞아요|맞습니다)[.!~?]*$/i;
const TH_NO_RE = /^(아니|아니요|아뇨|아니야|노|ㄴㄴ|싫어|괜찮아|틀렸어|아닌데)[.!~]*$/i;
const TH_PICK_RE = /^(첫\s*번째|둘째|두\s*번째|세\s*번째|셋째|1|2|3|1번|2번|3번)[.!~]*$/;
const TH_ORDINAL_RE = /^(첫\s*번째|둘째|두\s*번째|세\s*번째|셋째)[.!~]*$/;   // 되물음 폴백은 서수 낱말만 — «1번/2번/3번» 은 칩이 없으면 베이 번호다(2차 시뮬 재검증 회귀)
const TH_REDIRECT_RE = /^(아니|아니요|아뇨|아니야|아냐)[,\s]+(.+)$/;
const TH_REF_RE = /(아까 그 컨테이너|아까 그 컨|아까 그거|아까 그|그 컨테이너|그 컨(?![가-힣])|그것|그거(?![가-힣])|그놈|걔)/;   // «이거»·«그 배» 는 뺐다 — «이거 몇 시에 끝나»(실제 질문)·«그 배 출항 언제» 가 컨 번호로 바뀌던 것(감사) · «그 컨테이너»·«그거야» 부분일치 방지(재감사 D)
const TH_CONFIRM_LINE = '제가 맞게 알아들었나요? 아니면 «남은 대수»처럼 다시 말씀해 주세요.';
const TH_CONFIRM_YES = '네, 그대로 둘게요 😺 더 물어보셔도 돼요.';
const TH_CONFIRM_NO = '그럼 어떤 걸 물으신 건지 한 마디만 더 알려 주세요. 예를 들면 «몇 시에 끝나» «0230 어디»요.';
const TH_PROMPT_LINE = '네? 뭐 확인해 드릴까요? 아래 단추를 누르셔도 되고 컨 번호나 말로 물으셔도 돼요.';
const TH_REF_ASK = '어느 컨 말씀이세요? 끝 네 자리로 불러 주시면 바로 볼게요.';
const TH_PROMPT_CHIPS = ['몇 시에 끝나', '남은 대수', '브리핑'];
const TH_CLOSE_LINES = ['네, 언제든 부르세요 😺', '네! 수고하세요, 또 불러 주세요 😺', '알겠어요. 필요하면 미르야 하고 부르시면 돼요 😺'];
const TH_NO_LINE = '네, 그럼 두고 볼게요. 필요하면 또 부르세요 😺';
const _thSeed = (arr, s) => arr[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % arr.length];
const _thNorm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const _thIsClose = (q) => q.length <= 14 && !TH_ASK_WORD.test(q) && !/\d/.test(q) && TH_CLOSE_RE.test(q);
const _thKey = (c) => `${(c && c.voyageKey) || ''}|${(c && c.inspector) || ''}`;
//  살아 있는 대화 — 같은 키가 먼저, 없으면 같은 검수원의 가장 최근 것(«KBTR 몇 시에 끝나» 뒤의 «응»은 배 이름이 없다)
function _thOf(c, now) {
  const k = _thKey(c);
  const th = _threads[k];
  if (th && th.turns.length && now - th.at <= THREAD_WINDOW_MS) return { key: k, th };
  const who = '|' + ((c && c.inspector) || '');
  let best = null;
  for (const kk of Object.keys(_threads)) { const t = _threads[kk]; if (kk.endsWith(who) && t.turns.length && now - t.at <= THREAD_WINDOW_MS && (!best || t.at > best.th.at)) best = { key: kk, th: t }; }
  return best;
}
/** 지금 이 검수원과 대화 중인가 — 화면의 1글자 문지기(«응»)가 이것으로 연다. */
export function mirThreadAlive(ctx, now = Date.now()) { return !!_thOf(ctx || {}, now); }
/** 시험용 — 대화 기억 초기화 */
export function _mirThreadReset() { for (const k of Object.keys(_threads)) delete _threads[k]; _threadClosed = null; }

/** 풀기(순수) — 대화 중의 짧은 말을 직전 답에 이어 푼다. 기억은 바꾸지 않는다.
    돌려주는 값 { q(엔진에 넘길 말), direct(대화 층이 직접 낸 답이면 문자열), kind('close'|'confirmYes'|'confirmNo'|'prompt'|'pick'|'redirect'|'ref'|'pass'), how } */
export function mirThreadResolve(q0, ctx, now = Date.now()) {
  const q = _thNorm(q0);
  if (!q) return { q, direct: null, kind: 'pass', how: '' };
  //  같은 발화를 다시 풀면(화면이 다시 그림 — 검색창·통합검색·탭 카드는 재료가 바뀔 때마다 answerOneRaw 를 다시 부른다) 기록된 결과 그대로.
  //    «같은 발화»의 판정은 글자가 아니라 **접수 표(ctx._utterAt — 화면의 askedAt)** 다. 글자만 보면 «응» 을 두 번 말한 것도 같은 발화가 된다(연막 실측).
  const ut = ctx && ctx._utterAt;
  if (ut && _threadClosed && _threadClosed.raw === q && _threadClosed.utterAt === ut) return { q, direct: _threadClosed.direct, kind: 'close', how: '기록됨' };
  const hit = _thOf(ctx, now);
  const th = hit ? hit.th : null;
  if (ut && th && th.lastUtter && th.lastUtter.raw === q && th.lastUtter.utterAt === ut) return { q: th.lastUtter.q, direct: th.lastUtter.direct, kind: th.lastUtter.kind, how: '기록됨' };
  const last = th ? th.turns[th.turns.length - 1] : null;
  if (!last) {
    //  대화 밖 짧은 말 — «응·sp·아니» 는 되묻고, 끝맺음은 잡담이 못 받는 것만 받아 준다(«고마워» 는 잡담이 답한다 — 종전 그대로)
    if (TH_YES_RE.test(q) || TH_NO_RE.test(q) || TH_ORDINAL_RE.test(q)) return { q, direct: TH_PROMPT_LINE, kind: 'prompt', how: '대화 밖 «응/아니/두 번째»' };
    if (TH_REF_RE.test(q)) return { q, direct: TH_REF_ASK, kind: 'prompt', how: '대화 밖 «그거» — 붙을 컨이 없다' };
    if (_thIsClose(q)) { let st = null; try { st = mirSmallTalk(q); } catch (e) { st = null; } if (!st) return { q, direct: _thSeed(TH_CLOSE_LINES, q), kind: 'close', how: '대화 밖 끝맺음' }; }
    const rd0 = q.match(TH_REDIRECT_RE);   // 대화 밖 «아니 남은 대수» — «아니» 가 모르는 낱말로 남아 모델로 새지 않게 그 뒤 말로(2차 시뮬 ⑥)
    if (rd0) return { q: rd0[2], direct: null, kind: 'redirect', how: `«${q}» → «${rd0[2]}»` };
    return { q, direct: null, kind: 'pass', how: '' };
  }
  //  못 배운 말(엔진 null) 뒤에는 직전 제안이 화면에 없다 — «응/두 번째» 를 옛 칩으로 풀지 않고 되묻는다(2차 시뮬 ⑤: 두 턴 전 칩이 조용히 실행되던 것)
  const afterMiss = !!(th.missAt && th.missAt > last.at);
  //  ① 사용자가 끝낸다
  if (_thIsClose(q)) return { q, direct: _thSeed(TH_CLOSE_LINES, q), kind: 'close', how: '끝맺음' };
  //  ② 확인 질문에 «응/아니» — «두 번째» 같은 번호 고르기는 제안이 없으니 되물음(3차 감사 4)
  if (last.confirm && !afterMiss) {
    if (TH_YES_RE.test(q)) return { q, direct: TH_CONFIRM_YES, kind: 'confirmYes', how: '확인 «응»' };
    if (TH_NO_RE.test(q)) return { q, direct: TH_CONFIRM_NO, kind: 'confirmNo', how: '확인 «아니»' };
    if (TH_ORDINAL_RE.test(q)) return { q, direct: TH_PROMPT_LINE, kind: 'prompt', how: '확인 뒤 번호 — 제안 없음' };
  }
  //  ③ 제안 받기 — «응/그래/sp» 는 첫 칩, «두 번째» 는 그 번호, «아니» 만이면 두고 보기
  //  되쓴 말에 배를 붙인다 — 홈(떠 있는 미르·통합검색)에서 «KBTR 몇 시에 끝나» 뒤의 «응» 은 배 이름이 없다. **그 턴의 배와 지금 재료의 배가 다르면**(재료가 없거나
  //    다른 항차가 열려 있으면) 턴의 배 코드를 앞에 붙여 화면(pickShipCtx)과 엔진이 같은 배로 답하게 한다(감사 5 · 재감사 C: 항차 ZZZZ 열린 채 KBTR 대화의 «응»).
  const ctxShip = S((ctx && (ctx.vsl || (ctx.info && ctx.info.vsl) || (ctx.shipCtx && ctx.shipCtx.info && ctx.shipCtx.info.vsl))) || String((ctx && ctx.voyageKey) || '').split('_')[0]).toUpperCase();
  const lastShip = (last.ship && /^[A-Z0-9]{2,8}$/.test(last.ship)) ? last.ship : '';
  const withShip = (rq) => (lastShip && ctxShip !== lastShip && !rq.toUpperCase().startsWith(lastShip + ' ')) ? `${lastShip} ${rq}` : rq;
  const chips = (!afterMiss && last.follow && Array.isArray(last.follow.chips)) ? last.follow.chips : [];
  if (chips.length) {
    //  3.68-01: 칩을 눌러 그 말 그대로 온 것도 «고른 것»이다 — 홈(열린 항차 없음)에서 칩 «남은 대수» 를 누르면 배 없이 엔진에 가 «어느 배 말씀인지» 로 모델까지 가던 것(라이브 실측 DJCF «갱별 진행» → «자료에 없어요 (AI)»)
    if (chips.includes(q)) return { q: withShip(q), direct: null, kind: 'pick', how: `칩 «${q}»` };
    if (TH_YES_RE.test(q)) return { q: withShip(chips[0]), direct: null, kind: 'pick', how: `«${q}» → 제안 1 «${chips[0]}»` };
    //  맨숫자 «1/2/3» 은 접수된 말(ctx._utterAt — 전송·음성 확정)에서만 번호로 본다. 검색창에 숫자를 치기 시작한 첫 글자가 제안으로 풀리던 것(감사 2).
    if (TH_PICK_RE.test(q) && (!/^\d$/.test(q) || ut)) { const n = /둘|두|2/.test(q) ? 1 : /셋|세|3/.test(q) ? 2 : 0; const rq = chips[Math.min(n, chips.length - 1)]; return { q: withShip(rq), direct: null, kind: 'pick', how: `«${q}» → 제안 ${n + 1} «${rq}»` }; }
    if (TH_NO_RE.test(q)) return { q, direct: TH_NO_LINE, kind: 'decline', how: '제안 뒤 «아니» — 칩만 거두고 대화는 남긴다' };
  } else if (TH_YES_RE.test(q) || TH_NO_RE.test(q) || TH_ORDINAL_RE.test(q)) {
    return { q, direct: TH_PROMPT_LINE, kind: 'prompt', how: '제안 없는 «응/아니/두 번째»' };
  }
  //  ④ «아니 ○○» → 새 질문
  let rq = q, how = '', kind = 'pass';
  const rd = q.match(TH_REDIRECT_RE);
  if (rd) { rq = rd[2]; how = `«${q}» → 방향 바꿈 «${rq}»`; kind = 'redirect'; }
  //  ⑤ «그거·아까 그 컨» → 가장 가까운 개체(끝 네 자리 · 베이 — 최근 5턴에서 뒤부터, 2차 시뮬 ④). 개체가 없으면 대화 층이 «어느 컨 말씀이세요?» 로 직접 받는다(모델·메모로 안 샘).
  if (TH_REF_RE.test(rq)) {
    let ent = null;
    for (let i = th.turns.length - 1; i >= 0; i -= 1) { const e0 = th.turns[i].entity || {}; if (e0.cn || e0.l4 || e0.bay) { ent = e0; break; } }
    if (ent) {
      const e = (ent.cn ? ent.cn.slice(-4) : '') || ent.l4 || `${ent.bay}번 베이`;   // 컨 번호 끝 네 자리가 먼저(«여기를 46» 의 46 은 끝네자리가 아니다)
      rq = rq.replace(TH_REF_RE, e); how = (how ? how + ' · ' : '') + `«그거» → ${e}`; kind = 'ref';
    } else {
      return { q, direct: TH_REF_ASK, kind: 'prompt', how: '«그거» — 붙을 컨이 없다' };
    }
  }
  if (kind !== 'pass') rq = withShip(rq);
  return { q: rq, direct: null, kind, how };
}

//  얼버무린 답인가 — WEAK_VIA·WEAK_TEXT 그대로 한 벌 + 모델 답(model·translate·confirmed). 모르는 낱말만으로 약한 답은 아니다.
const TH_HEDGE_VIA = new Set(['model', 'translate', 'confirmed']);
function _thHedged(q, text, via) {
  if (text == null || text === '') return false;
  if (via && TH_HEDGE_VIA.has(via)) return true;
  if (!isWeakAnswer(q, text, { via })) return false;
  return (via && WEAK_VIA.has(via)) || WEAK_TEXT.test(String(text));
}
//  의도 — 파서 칸 + 답 모양(한 벌: 엔진 것 그대로). 한 마디의 갈래를 고르는 데만 쓴다(답을 고르지 않는다).
function _thIntent(q, p, answer) {
  const a = _thNorm(answer);
  if (!p) return 'unknown';
  if (p.yardQuery) return 'yard';   // 3.69 [mirYard] — «작업 왜 느려» 는 속도(pace)가 아니라 야드 갈래
  if (p.etaQuery || /몇\s*시(쯤)?에?\s*끝|언제\s*끝|끝날까/.test(q)) return 'eta';
  if (p.paceQuery || /속도|시간당/.test(q)) return 'pace';
  if (p.progressQuery || /남았|남은|얼마나\s*(했|남)/.test(q)) return 'remaining';
  if (/^📝/.test(a)) return 'crewSet';
  if (p.crewSet || p.gangSet) return 'crewRefused';   // 적지 않았다(콘앱 «검수앱에서 적어 주세요»·전부 명단 밖) — 한 마디 없음(2차 시뮬 ③)
  if (p.deviceCmd) return 'device';
  if (p.briefingQuery || /브리핑/.test(q)) return 'briefing';
  if (p.foodQuery || /먹었|먹지|먹을/.test(q)) return 'meal';
  if (p.bay || p.bayBreakdown || /베이/.test(q)) return 'bay';
  if (p.type === 'l4' || p.digits || p.posQuery) return 'position';
  if (p.asking === 'how' || p.howToQuery || /처리\s*방법|대처|어떻게\s*해/.test(q)) return 'howto';
  if (p.pilotQuery || p.schedQuery || /출항|입항|도선/.test(q)) return 'sched';
  if (p.mirHello || p.mirCalled) return 'hello';
  if (p.fe === 'E' || /엠티|피트|풀\b|리퍼|디지|위험물|엑스레이|오픈탑|플랫/.test(q) || p.isStat || /몇\s*(개|대)/.test(q)) return 'count';
  return 'other';
}
function _thEntity(q, p, answer, ctx) {
  const m = _thNorm(answer).match(/([A-Z]{4}\d{7})/);
  const cn = m ? m[1] : '';
  let c = null;
  if (cn && ctx && Array.isArray(ctx.containers)) { try { c = ctx.containers.find((x) => x && x.cn === cn) || null; } catch (e) { c = null; } }
  const l4 = (p && p.digits && /^\d{4}$/.test(String(p.digits))) ? String(p.digits) : ((q.match(/\b(\d{4})\b/) || [])[1] || '');   // 4자리일 때만(«여기를 46» 의 46 은 끝네자리가 아니다, 2차 시뮬 ②)
  const notFound = _thIsNotFound(answer);   // 📭 없음 답의 번호는 개체가 아니다(«그거» 가 붙지 않게)
  return { cn: notFound ? '' : cn, c: notFound ? null : c, l4: notFound ? '' : l4, bay: (!notFound && p && p.bay) ? String(p.bay) : '' };
}
const _thIsDone = (a) => /남은 작업:\s*0대|다 끝났어요|작업 완료 · 종료/.test(_thNorm(a));
const _thIsNotFound = (a) => /^📭/.test(_thNorm(a));
const _thSeenQs = (th, q) => (th ? th.turns : []).map((t) => t.rq).concat([q]).join(' ');
//  진행 세 갈래(ETA·잔여·속도)+갱별+다음 배는 서로를 제안한다 — 이 대화에서 본 갈래는 뺀다. «다 끝났다»가 나왔으면 ETA·잔여·속도는 다시 권하지 않는다.
function _thProgressFollow(intent, th, q, a, emptyLine, n, done) {
  const seen = new Set((th ? th.turns : []).map((t) => t.intent).concat([intent]));
  if (done) ['eta', 'remaining', 'pace'].forEach((k) => seen.add(k));
  const sq = _thSeenQs(th, q);
  const C = [
    { k: 'eta', chip: '몇 시에 끝나', line: '이 속도면 몇 시에 끝나는지도 볼까요?', re: /끝나|끝날/ },
    { k: 'remaining', chip: '남은 대수', line: '남은 대수도 볼까요?', re: /남은|남았/ },
    { k: 'gang', chip: '갱별 진행', line: '갱별 진행도 볼까요?', re: /갱별/ },
    { k: 'pace', chip: '작업 속도', line: '작업 속도도 볼까요?', re: /속도|시간당/ },
    { k: 'sched', chip: '출항 언제', line: '출항 시각도 볼까요?', re: /출항/ },
  ].filter((c) => !seen.has(c.k) && !c.re.test(sq));
  if (!C.length) return { line: emptyLine, chips: [] };
  return { line: C[0].line + (C[1] ? ` ${C[1].chip}도 돼요.` : ''), chips: C.slice(0, n).map((c) => c.chip) };
}
//  컨 하나에 대해 이 대화에서 이미 물은 항목(온도·위험물·실번호·무게·규격) — 같은 제안을 두 번 하지 않는다
const TH_ATTR = { '온도': /온도/, '위험물': /위험물|디지/, '실번호': /실번호|씰/, '무게': /무게|중량/, '규격': /규격|피트|사이즈/ };
function _thAskedAttrs(th, l4) {
  const s = new Set();
  if (!th || !l4) return s;
  for (const t of th.turns) { if (t.entity && (t.entity.l4 === l4 || (t.entity.cn || '').endsWith(l4))) for (const k in TH_ATTR) if (TH_ATTR[k].test(t.rq)) s.add(k); }
  return s;
}
/** 한 마디 더 — «응» 은 첫 칩. 칩은 전부 엔진이 강한 답을 내는 말(관문 4 칩 전수). 숫자는 답에서 가져오지 않는다. */
function _thFollowFor(intent, q, answer, ent, now, th, via, done, ship = '') {
  const a = _thNorm(answer);
  const l4 = ent.cn ? ent.cn.slice(-4) : ent.l4;
  const bay = ent.bay;
  const sq = _thSeenQs(th, q);   // 이 대화에서 이미 물은 말들(+지금 말) — 같은 제안을 두 번 하지 않는다
  if (via === 'posAskBack' || via === 'modeChoice') return null;   // 엔진이 이미 되물었다 — 겹쳐 묻지 않는다
  if (/작업표가 없어요|검수앱에서 적어 주세요/.test(a)) return null;   // 콘앱이 «못 한다» 고 답한 자리 — 이어 붙일 제안이 없다(2차 시뮬 ③)
  switch (intent) {
    case 'eta': case 'remaining': case 'pace': {
      if (done) {
        //  다 끝났으면 출항·호기별·갱별 — 이 대화에서 이미 본 것은 뺀다. («다음 배» 는 엔진에 규칙이 없다 — 이 배 일정을 다음 배라고 내던 것, 2차 시뮬 ①)
        const C = [['출항 언제', /출항/], ['호기별 진행', /호기별/], ['갱별 진행', /갱별/]].filter(([, re]) => !re.test(sq)).map(([c]) => c);
        const head = intent === 'eta' ? '수고하셨어요.' : '다 끝났네요, 수고하셨어요.';
        if (!C.length) return { line: `${head} 더 볼 것 있으면 말씀하세요.`, chips: [] };
        return { line: `${head} ${C[0] === '출항 언제' ? '출항 시각도 볼까요?' : C[0] + '도 볼까요?'}`, chips: C.slice(0, 2) };
      }
      return _thProgressFollow(intent, th, q, a, '진행은 다 봤어요. 다른 것도 물어보세요.', 3, done);
    }
    case 'position': {
      if (_thIsNotFound(a) || /이 항차에 없어요/.test(a)) return { line: '이 항차 목록엔 없어요. 숫자 하나가 다를 수 있으니 다시 불러 주시면 바로 찾을게요.', chips: [] };
      if (!l4) return { line: '실번호나 무게도 볼 수 있어요. 끝 네 자리로 불러 주세요.', chips: [] };
      const asked = _thAskedAttrs(th, l4);
      for (const k in TH_ATTR) if (TH_ATTR[k].test(q)) asked.add(k);
      //  리퍼·위험물은 컨 재료로 판정한다([mirFacts] _isRf/_isDg 한 벌 — 답 문자열의 «RH» 는 소유주 코드 TRHU 에도 있다, 감사 4). 재료에 없으면 답 머리의 규격 칸만 본다.
      const isRf = ent.c ? _isRf(ent.c) : (/·\s*\d{2}R[HFE]\b/.test(a) && !/리퍼가 아니에요/.test(a));   // [mirFacts] 의 _isRf/_isDg 한 벌(재감사 4)
      const isDg = ent.c ? _isDg(ent.c) : /DG\d|UN\d{4}|cl\.\d/.test(a);
      const order = [].concat(isRf ? ['온도'] : [], isDg ? ['위험물'] : [], ['실번호', '무게', '규격']).filter((k) => !asked.has(k));
      if (!order.length) return { line: '이 컨은 다 봤어요. 다른 번호도 불러 주세요.', chips: [] };
      const head = order[0] === '온도' ? '리퍼네요. 온도도 볼까요?' : order[0] === '위험물' ? '위험물이에요. 클래스·UN 번호도 볼까요?' : `${order[0]}도 볼까요?${order[1] ? ' ' + order[1] + '도 돼요.' : ''}`;
      return { line: head, chips: order.slice(0, 2).map((k) => `${l4} ${k}`) };
    }
    case 'crewSet': {
      //  확인할 호기는 **답이 적었다고 한 첫 호기**(«— 2호기 김석 · 3호기 이인철로 기억할게요»)다 — 질문의 첫 호기는 명단 밖이라 못 적었을 수 있다(2차 시뮬 ①)
      const no = (a.match(/—\s*(\d)\s*호기/) || a.match(/(\d)\s*호기\s*[가-힣]+/) || [])[1] || '';
      if (!no) return null;
      const warn = /명단에 없어 못 적었어요/.test(a) ? '못 적은 이름은 명단에 있는 이름으로 다시 말해 주세요. ' : '';
      return { line: `${warn}적은 대로 맞는지 볼까요?`, chips: [`${no}호기 누구야`, '호기별 진행'] };
    }
    case 'crewRefused':
      return null;
    case 'device': {
      //  방금 한 조작의 반대쪽만, 그리고 이 대화에서 막 권한 것은 다시 권하지 않는다(2차 시뮬 ①)
      let C = /이미 제일 어두워요/.test(a) ? ['밝게'] : /이미 제일 밝아요/.test(a) ? ['더 어둡게'] : (/어둡|어두/.test(q) ? ['더 어둡게', '밝게'] : ['밝게', '더 어둡게']);
      const lastChips = (th && th.turns.length) ? ((th.turns[th.turns.length - 1].follow || {}).chips || []) : [];
      C = C.filter((c) => !lastChips.includes(c) || C.length === 1);
      if (!C.length) return { line: '', chips: [] };
      return { line: `${C[0]} 할까요?${C[1] ? ' ' + C[1] + '도 돼요.' : ''}`, chips: C };
    }
    case 'briefing': {
      const C = [['리퍼 목록', /리퍼/], ['위험물 목록', /위험물|디지/], ['남은 대수', /남은|남았/]].filter(([, re]) => !re.test(sq)).map(([c]) => c);
      if (!C.length) return { line: '더 볼 것 있으면 말씀하세요.', chips: [] };
      return { line: `${C[0]}도 볼까요?${C[1] ? ' ' + C[1] + '도 돼요.' : ''}`, chips: C.slice(0, 3) };
    }
    case 'howto': {
      //  «씰 목록» 은 엔진이 컨 위치 목록을 내므로 뺐다(2차 시뮬 ①) — 커트씰 기록만
      const C = [['커트씰', /커트씰/]].filter(([, re]) => !re.test(sq)).map(([c]) => c);
      if (!C.length) return { line: '더 볼 것 있으면 말씀하세요.', chips: [] };
      return { line: '커트씰 기록도 볼까요?', chips: C };
    }
    case 'yard': {
      //  3.69 — 야드 답 뒤에는 «왜 느린가» 의 나머지 절반(작업 속도·남은 대수)과 추이를 권한다. 자료가 없다고 답했으면 붙이지 않는다.
      if (/자료가 아직 안 왔어요|안 들어와요|막혔어요/.test(a)) return null;
      const hasShipQ = !!ship && !done;   // 다 끝난 배엔 속도·잔여를 권하지 않는다(2차 시뮬 16)
      const isPctc = /PCTC 야드는/.test(a);
      const C = [].concat(
        hasShipQ ? [['작업 속도', /속도/], ['남은 대수', /남은|남았/]] : [],
        isPctc && /반출이 막힌 블록|야드 장비/.test(a) ? [['야드 어느 블록', /어느\s*블록|블록/]] : [],   // why 답은 목록을 안 읽는다 — 목록은 이 칩이 낸다
        isPctc ? [['야드 추이', /추이/]] : [])
        .filter(([, re]) => !re.test(sq)).map(([c]) => c);
      if (!C.length) return { line: '야드는 다 봤어요. 다른 것도 물어보세요.', chips: [] };
      const head = C[0] === '작업 속도' ? '지금 작업 속도도 볼까요?' : C[0] === '남은 대수' ? '남은 대수도 볼까요?' : C[0] === '야드 어느 블록' ? '어느 블록에 장비가 붙었는지도 볼까요?' : '앞으로 야드가 어떻게 될지도 볼까요?';
      return { line: `${head}${C[1] ? ' ' + C[1] + '도 돼요.' : ''}`, chips: C.slice(0, 2) };
    }
    case 'sched': {
      //  일정 갈래도 같은 제안을 두 번 하지 않는다(재감사 A — «다음 배 언제» 가 자기 자신을 무한 반복)
      const C = [['도선 언제야', /도선/], ['출항 언제', /출항/]].filter(([, re]) => !re.test(sq)).map(([c]) => c);
      if (!C.length) return { line: '일정은 다 봤어요. 다른 것도 물어보세요.', chips: [] };
      return { line: `${C[0] === '도선 언제야' ? '도선 시각도 볼까요?' : '출항 시각도 볼까요?'}${C[1] ? ' ' + C[1] + '도 돼요.' : ''}`, chips: C.slice(0, 2) };
    }
    case 'bay':
      if (_thIsNotFound(a)) return { line: '그 번호 베이는 이 배에 없어요. 다시 불러 주시면 바로 볼게요.', chips: [] };
      if (!bay) return { line: '베이 번호를 불러 주시면 남은 대수·리퍼도 볼게요.', chips: [] };
      return { line: '그 베이 남은 대수도 볼까요? 리퍼도 돼요.', chips: [`${bay}번 베이 남은`, `${bay}번 베이 리퍼`] };
    case 'count': {
      //  대수를 물었으면 그 부류 목록을, 목록을 봤으면 아직 안 본 다른 부류를
      const isList = /^📍/.test(a) || /목록/.test(q);
      const kind = /리퍼/.test(q) ? '리퍼' : /디지|위험물/.test(q) ? '위험물' : '';
      if (kind && !isList) return { line: '목록으로 뽑아 드릴까요? 위치까지 나와요.', chips: [`${kind} 목록`, kind === '리퍼' ? '위험물 목록' : '리퍼 목록'] };
      const KINDS = { '리퍼 목록': /리퍼/, '위험물 목록': /위험물|디지/, '엠티 몇 대': /엠티/, '20피트 몇 대': /20\s*피트/ };
      const cand = Object.keys(KINDS).filter((c) => !KINDS[c].test(sq));
      if (!cand.length) return { line: '대수는 다 봤어요. 다른 것도 물어보세요.', chips: [] };
      return { line: `${cand[0]}도 볼까요?`, chips: cand.slice(0, 2) };
    }
    case 'meal': {
      if (/돌림판/.test(a)) return { line: '', chips: [] };   // 돌림판이 열린다 — 더 붙일 말 없음
      const h = new Date(now).getHours();
      const meal = /아침/.test(q) ? '아침' : /점심/.test(q) ? '점심' : /저녁/.test(q) ? '저녁' : h < 10 ? '아침' : h < 15 ? '점심' : '저녁';
      return { line: `아직 안 드셨으면 ${meal} 뭐 먹을지 돌림판 돌려 드릴까요?`, chips: [`${meal} 뭐 먹지`] };   // «응» = 돌림판(2차 시뮬 ①: «드셨어요?» 에 «응» 이 돌림판이 되던 것)
    }
    case 'hello':
      return { line: '', chips: TH_PROMPT_CHIPS.slice() };   // 엔진이 이미 «뭐 확인해 드릴까요?» 라고 물었다 — 칩만
    default:
      return _thProgressFollow(intent, th, q, a, '더 볼 것 있으면 말씀하세요.', 2, done);
  }
}

/** 기록 — 화면이 접수된 말 하나에 **한 번** 부른다(답이 정해진 뒤: 규칙 답이거나 모델 답). 돌려주는 값 { kind, q, line, chips, confirm }.
    text 가 null(못 배움)이면 기억에 넣지 않는다 — 다음 말은 종전대로 학습 짝·모델 경로다. */
export function mirThreadCommit(q0, text, via, ctx, now = ((ctx && ctx._now) || Date.now())) {
  const q = _thNorm(q0);
  const none = { kind: 'none', q, line: '', chips: [], confirm: '' };
  if (!q) return none;
  const r = mirThreadResolve(q, ctx, now);
  const hit = _thOf(ctx, now);
  const key = hit ? hit.key : _thKey(ctx);
  const ut = (ctx && ctx._utterAt) || null;
  if (r.kind === 'close') {
    if (hit) delete _threads[hit.key];
    _threadClosed = { raw: q, direct: r.direct, at: now, utterAt: ut };
    return { kind: 'close', q, line: '', chips: [], confirm: '' };
  }
  if (r.kind === 'decline') {   // 제안 뒤 «아니» — 칩만 거두고 대화는 남긴다(바로 뒤 «그거 무게»·«두 번째» 가 이어지게, 2차 시뮬)
    if (hit) { const last = hit.th.turns[hit.th.turns.length - 1]; if (last) last.follow = { line: '', chips: [] }; hit.th.at = now; hit.th.lastUtter = { raw: q, q, direct: r.direct, kind: 'decline', utterAt: ut }; }
    return { kind: 'decline', q, line: '', chips: [], confirm: '' };
  }
  if (r.kind === 'confirmYes' || r.kind === 'confirmNo') {
    if (hit) { const last = hit.th.turns[hit.th.turns.length - 1]; if (last) last.confirm = ''; hit.th.at = now; hit.th.lastUtter = { raw: q, q, direct: r.direct, kind: r.kind, utterAt: ut }; }
    return { kind: r.kind, q, line: '', chips: [], confirm: '' };
  }
  if (r.kind === 'prompt') {
    //  되물음의 칩도 이 대화에서 이미 본 것은 뺀다(제안이 다 소진된 뒤의 «응» 이 처음 제안으로 되돌아 무한히 돌지 않게)
    const sq0 = hit ? _thSeenQs(hit.th, q) : q;
    const PR = [['몇 시에 끝나', /끝나|끝날/], ['남은 대수', /남은|남았/], ['브리핑', /브리핑/]].filter(([, re]) => !re.test(sq0)).map(([c]) => c);
    const follow = { line: '', chips: PR };
    const lastTurn = hit ? hit.th.turns[hit.th.turns.length - 1] : null;
    const turn = { q, rq: q, intent: 'prompt', entity: {}, ship: (lastTurn && lastTurn.ship) || '', answer: r.direct, follow, confirm: '', at: now };   // ship — 대화의 배를 물려준다(3차 감사 2)
    if (hit) { hit.th.turns.push(turn); if (hit.th.turns.length > THREAD_MAX_TURNS) hit.th.turns.shift(); hit.th.at = now; hit.th.missAt = 0; hit.th.lastUtter = { raw: q, q, direct: r.direct, kind: 'prompt', utterAt: ut }; }
    else _threads[key] = { turns: [turn], at: now, missAt: 0, lastUtter: { raw: q, q, direct: r.direct, kind: 'prompt', utterAt: ut } };
    return { kind: 'prompt', q, line: follow.line, chips: follow.chips, confirm: '' };
  }
  if (text == null || text === '') {
    if (hit) { hit.th.lastUtter = { raw: q, q: r.q, direct: null, kind: r.kind, utterAt: ut }; hit.th.missAt = now; }   // 같은 말을 다시 그려도 같은 풀이 · 못 배운 말 표시(다음 «응» 은 되물음)
    return { kind: 'none', q: r.q, line: '', chips: [], confirm: '' };
  }
  const rq = r.q;
  let p = null; try { p = parseNaturalQuery(rq); } catch (e) { p = null; }
  const hedged = _thHedged(rq, text, via);
  const intent = _thIntent(rq, p, text);
  const entity = _thEntity(rq, p, text, ctx);
  const th = hit ? hit.th : null;
  //  다 끝났는가 — 재료(항차 info 의 양하·선적 완료 표시)가 먼저, 없으면 답 문장(«다 끝났어요»·«남은 작업: 0대»)·이 대화의 앞 답(2차 시뮬 ①: 속도 답 뒤에 ETA 를 권하던 것)
  const inf = (ctx && (ctx.info || (ctx.voyage && ctx.voyage.info))) || null;
  const _pl = inf ? Number(inf.planLod) : NaN;   // 양하만 하는 배(선적 계획 planLod 0 — utils 와 같은 칸)는 양하 완료만으로 끝
  const done = !!(inf && inf.dischargeDone && (inf.loadingDone || _pl === 0)) || _thIsDone(text) || !!(th && th.turns.some((t) => _thIsDone(t.answer || '')));
  //  그 턴의 배 코드 — 홈에서 배 이름 붙인 질문 뒤의 «응» 에 붙인다(ctx.vsl · info.vsl · shipCtx.info.vsl · 되쓴 말 머리의 배 코드)
  const ship = S((ctx && (ctx.vsl || (ctx.info && ctx.info.vsl) || (ctx.shipCtx && ctx.shipCtx.info && ctx.shipCtx.info.vsl))) || String((ctx && ctx.voyageKey) || '').split('_')[0]).toUpperCase();
  const follow = hedged ? null : _thFollowFor(intent, rq, text, entity, now, th, via, done, ship);   // 3.69: ship — 야드 갈래가 배 유무로 칩을 고른다
  const confirm = hedged ? TH_CONFIRM_LINE : '';
  const turn = { q, rq, intent, entity: { cn: entity.cn, l4: entity.l4, bay: entity.bay }, ship, answer: _thNorm(text).slice(0, 200), follow, confirm, at: now };
  if (th) { th.turns.push(turn); if (th.turns.length > THREAD_MAX_TURNS) th.turns.shift(); th.at = now; th.missAt = 0; th.lastUtter = { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut }; }
  else _threads[key] = { turns: [turn], at: now, missAt: 0, lastUtter: { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut } };
  return { kind: 'answer', q: rq, line: follow ? follow.line : '', chips: follow ? follow.chips.slice() : [], confirm };
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// [mirMood] 기분 — 얼굴이 보이는 감정 한 벌 (3.56 신설, 검수사 «미르를 하나로» 원칙대로 mir.js 안에 둔다)
// ══════════════════════════════════════════════════════════════════════════════════════════
/* ★ TallyOne 3.56 / ConeOne 2.52 (검수사 2026-09-22 «미르에게 에니메이션을 추가 … 심심함·배고픔·기쁨·슬픔·초조함»)
   검수사 확정 규칙(2026-09-22 11:51 원문) —
     «배고픔은 식사시간 10분전부터 식사시간 시작전까지 식후는 배부름을 표현
      기쁨은 작업완료시나 검수사가 작업을 선택했을시
      슬픔은 미르가 답을 못주거나 미르의 행동을 보고도 방치 할시
      심심함은 말그대로 작업이 없을시나 질문이나 시키는일이 없을시»
     초조함 = «자료가 안 들어 올 때»(2026-09-22 11:41).
   ─ 판정 순서(하나만 보인다) ─
     ① 순간 감정 12초 — 기쁨(작업 선택·완료) / 슬픔(못 답함)
     ② 화남(4.06) — 터미널은 작업 중인데(utils.isWorkingNow) 앱 완료 기록이 실작업 60분째 없음. 쉬는 시간엔 화내지 않는다. 수집기가 조용하면 화내지 않는다(그건 ③).
     ③ 초조함 — 수집기 하트비트가 주기의 3배 넘게 끊김 · 시작 6시간 전~끝인데 계획 대수가 있는 쪽 EDI(dataAt) 없음.
                초조함을 30분 넘게 보이는데 미르를 한 번도 안 열면 → 슬픔(방치)
     ④ 배고픔(식사 10분 전~시작) · 배부름(식사 시작~쉬는 시간 끝 30분 뒤) — 식사 창은 근무표 WORK_SHIFTS 의 빈 자리(티타임 30분은 제외)
     ⑤ 작업 중인 배가 없다(utils.isWorkingNow 한 벌) → 초조함·슬픔·화남은 없다. 곧 시작할 배(6시간 안)가 있으면 «작업 준비», 없으면 30분마다 «휴식» ↔ «취미 생활»(4.06)
        심심함 — 작업 중인 배가 있는데 30분 넘게 질문·명령이 없다
     ⑥ 기본
   ★ TallyOne 4.06 / ConeOne 2.62 — 검수사 2026-10-05 18:40 «B. 초조함 조건을 바꿉니다. 터미널 본선 현황이 작업중으로 계속 올라오는 동안에는 초조해하지 않게 합니다 … 초조함이 아니라 화난표정이어야 함
     작업은 진행중인데 앱 입력이 없으니 화난다는 뜻으로». 종전엔 «작업 중인 배의 완료 기록이 60분째 없음» 이 초조함의 한 갈래였다(17:54 실측 — OBWH 완료가 12:26 에서 멈춘 4시간 반 동안 미르가 초조해 했다).
     이제 그 갈래는 화남이고, 초조함은 «자료가 안 들어올 때»(수집기 하트비트 · EDI)만 남는다. 터미널 합계는 완료로 세지 않는다 — 여기서 보는 완료는 검수원이 앱에서 누른 completed 뿐이다(2026-10-03).
   ★ TallyOne 4.06 / ConeOne 2.62 — 검수사 2026-10-05 20:57 «작업할 선박이 없을때에는 초조 하거나 화가 나면 안되는거고 편안하게 휴식을 취하거나 취미 생활을 즐기거나 다음 작업을 준비하는 미르가 되어야 합니다».
     종전엔 작업 중인 배가 없어도 수집기가 조용하거나 시작 6시간 전 배의 EDI 가 없으면 초조했고, 아니면 «심심함» 이었다(검수사 2026-09-22 «심심함은 말그대로 작업이 없을시» — 이 부분은 이제 휴식·취미·준비로 바뀐다).
     이제 작업 중인 배가 하나도 없으면 초조함·(초조함이 방치되어 생기는)슬픔은 판정에서 빠진다 — 그 두 갈래는 «일하는 배가 있는데 자료가 안 들어올 때» 만 남는다. 화남은 원래 일하는 배에만 있다.
   ⚠ 감정은 기기 안에서만 계산한다. RTDB 에 쓰지 않는다. 판정을 화면마다 따로 만들지 않는다 — 여기 한 벌뿐이다. */

export const MIR_MOODS = {
  basic:   { key: 'basic',   label: '기본',   badge: '' },
  happy:   { key: 'happy',   label: '기쁨',   badge: '♪' },
  sad:     { key: 'sad',     label: '슬픔',   badge: '💧' },
  anxious: { key: 'anxious', label: '초조함', badge: '💦' },
  angry:   { key: 'angry',   label: '화남',   badge: '💢' },   // 4.06
  hungry:  { key: 'hungry',  label: '배고픔', badge: '🍚' },
  full:    { key: 'full',    label: '배부름', badge: '😋' },
  bored:   { key: 'bored',   label: '심심함', badge: '💤' },
  rest:    { key: 'rest',    label: '휴식',     badge: '☕' },   // 4.06 — 작업할 배가 없을 때(검수사 2026-10-05 20:57)
  hobby:   { key: 'hobby',   label: '취미 생활', badge: '🎧' },
  prep:    { key: 'prep',    label: '작업 준비', badge: '📋' },
};

const MIN = 60000;
export const MOOD_EVENT_MS = 12 * 1000;      // 순간 감정이 보이는 시간
export const MOOD_BORED_MS = 30 * MIN;        // 이만큼 아무 질문·명령이 없으면 심심함
export const MOOD_NEGLECT_MS = 30 * MIN;      // 초조함을 이만큼 보이는데 안 열어 보면 슬픔
export const MOOD_NO_DONE_MS = 60 * MIN;      // 작업 중인데 완료 기록이 이만큼 없으면 화남(4.06 — 종전 초조함)
export const MOOD_EDI_AHEAD_MS = 6 * 3600000; // 시작 이만큼 전부터 EDI 를 기다린다
export const MOOD_MEAL_BEFORE_MIN = 10;       // 식사 몇 분 전부터 배고픔
export const MOOD_FULL_AFTER_MIN = 30;        // 쉬는 시간 끝 몇 분 뒤까지 배부름

/** 근무표의 빈 자리 = 쉬는 시간. 그중 60분 이상인 것이 식사다(티타임 30분 제외). [시작분, 끝분] 하루 기준. */
export function mealWindows(pier) {
  const wins = WORK_SHIFTS[String(pier || '').toUpperCase()] || WORK_SHIFTS.PCTC;
  const sorted = wins.slice().sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let prev = 0;
  for (const [a, b] of sorted) { if (a > prev) gaps.push([prev, a]); prev = Math.max(prev, b); }
  if (prev < 1440) gaps.push([prev, 1440]);
  //  자정을 걸치는 쉬는 시간(예: 23:30~24:00 + 00:00~01:00)은 한 끼로 합친다
  if (gaps.length > 1 && gaps[0][0] === 0 && gaps[gaps.length - 1][1] === 1440) {
    const last = gaps.pop(); gaps[0] = [last[0] - 1440, gaps[0][1]];
  }
  return gaps.filter(([a, b]) => b - a >= 60);
}

/** 지금이 식사 앞뒤 어디인지. { phase:'hungry'|'full', label } 또는 null. */
export function mealPhase(now, pier) {
  const d = new Date(now);
  const mins = d.getHours() * 60 + d.getMinutes();
  for (const [a, b] of mealWindows(pier)) {
    for (const off of [0, -1440, 1440]) {   // 자정 걸침 대비 어제·내일 창도 같이 본다
      const s = a + off, e = b + off;
      if (mins >= s - MOOD_MEAL_BEFORE_MIN && mins < s) return { phase: 'hungry', label: `${_mmHHMM(s)} 식사 ${s - mins}분 전` };
      if (mins >= s && mins < e + MOOD_FULL_AFTER_MIN) return { phase: 'full', label: `${_mmHHMM(s)}~${_mmHHMM(e)} 식사` };
    }
  }
  return null;
}
function _mmHHMM(m) { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; }

function pierOf(voyage) {
  const info = (voyage && voyage.info) || {};
  return getPierFromBerth(info.berth || info.berthNo || '') || String(info.pier || '').toUpperCase() || 'PCTC';
}

const _WORK_ACT_RE = /(^|_)(start|pause|resume|done)$/;   // 4.06 감사: 카톡 이관 보고는 «pause»·«resume» 접두어가 없다(kakaoWorkLog) — workPauseOf 와 화남이 한 벌로 본다
/** 앱 보고(WorkReportModal → voyages/{키}/reports)로 본 «지금 작업 중단 중인가». 마지막 작업 상태 보고가 중단(«{모드}_pause»·«external_pause»)이면
 *  { mode, reason, equip, ts, ko } 를, 그 뒤에 시작·재개·완료 보고가 있으면 null. 12시간 넘은 옛 보고는 안 본다.
 *  3.69-01 — 검수사 2026-09-29 18:56 «앱에서 야드혼잡의 이유로 작업중단을 했습니다. DJCF PCSZ 앱에 기록이 안되나요 카톡보고를 했으면 앱은 알고 있을텐데»
 *  — 미르 화남(«완료 기록이 113분째 없어요» — 4.06 전엔 초조함)과 야드 답이 이 보고를 본다. */
export function workPauseOf(v, now = Date.now()) {
  const reps = v && v.reports;
  if (!reps || typeof reps !== 'object') return null;
  let last = null;
  for (const k of Object.keys(reps)) {
    const r = reps[k]; if (!r || typeof r !== 'object') continue;
    const ts = Number(r.ts) || Number(k) || 0;
    if (!ts || ts > now + 5 * MIN || now - ts > 12 * 3600000) continue;
    const act = String(r.action || '');
    const isStatus = r.type === 'work_status' && _WORK_ACT_RE.test(act);
    const isExt = r.type === 'external_pause';
    if (!isStatus && !isExt) continue;
    if (!last || ts > last.ts) last = { ts, act: isExt ? 'external_pause' : act, mode: String(r.mode || ''), reason: String(r.reason || ''), equip: String(r.equip || '') };
  }
  if (!last || !/pause$/.test(last.act)) return null;
  //  재개 보고 없이 일을 다시 시작하는 일이 흔하다 — 중단 뒤에 완료 기록이 찍혔으면 재개로 본다(재감사 2).
  for (const m of ['discharge', 'loading']) { const comp = v[m] && v[m].completed; if (!comp || typeof comp !== 'object') continue; for (const c of Object.values(comp)) { const at = c && Number(c.at); if (at && at > last.ts && at <= now + 5 * MIN) return null; } }
  //  재개 예상 — 검수사 2026-09-29 19:28 «보통 17시에 야드 혼잡이유로 작업 중단을 하면 19시에 작업이 재개됩니다» · «중단한 시간이 … 야드 혼잡 + 석식 시간이었습니다.
  //    그 시간대엔 작업자도 작업중인 장비도 없는상태». 중단 뒤 3시간 안에 쉬는 시간(근무표 창 사이)이 끝나면 그 창의 시작이 재개 예상 시각이다.
  let resumeAt = 0, breakKo = '';
  try {
    const pier = pierOf(v);
    const wins = (WORK_SHIFTS[String(pier || '').toUpperCase()] || WORK_SHIFTS.PCTC).slice().sort((a, b) => a[0] - b[0]);
    const d0 = new Date(last.ts); d0.setHours(0, 0, 0, 0);
    for (let day = 0; day < 2 && !resumeAt; day++) {
      const base = d0.getTime() + day * 86400000;
      for (const [a, b] of wins) {
        const startMs = base + a * 60000;
        if (startMs > last.ts && startMs - last.ts <= 3 * 3600000) { resumeAt = startMs; break; }
      }
    }
    if (resumeAt) { const m = new Date(resumeAt).getHours() * 60 + new Date(resumeAt).getMinutes(); breakKo = (m >= 720 && m <= 810) ? '중식' : (m >= 1080 && m <= 1200) ? '석식' : (m >= 0 && m <= 90) ? '야식' : '쉬는 시간'; }
  } catch (e) { resumeAt = 0; }
  return { mode: last.mode, reason: last.reason, equip: last.equip, ts: last.ts, resumeAt, breakKo, ko: last.mode === 'loading' ? '선적' : last.mode === 'discharge' ? '양하' : '작업' };
}
/** 수집기 하트비트가 주기의 3배 넘게 끊긴 시간(ms). 안 끊겼거나 하트비트가 아직 없으면 0. 초조함(수집기 조용)과 화남(터미널 «작업 중» 을 믿어도 되나)이 이 한 벌을 본다. */
function _collectorSilentMs(heartbeat, now) {
  if (!(heartbeat && Number(heartbeat.at))) return 0;
  const cyc = (Number(heartbeat.cycleMin) || 5) * MIN;
  const gap = now - Number(heartbeat.at);
  return gap > 3 * cyc ? gap : 0;
}
/** 지금이 근무표의 «일하는 창» 안인가 — 밖이면 쉬는 시간(식사·티타임)이다. WORK_SHIFTS 한 벌(workMinutesBetween 과 같은 표). */
function _inWorkWindow(now, pier) {
  const wins = WORK_SHIFTS[String(pier || '').toUpperCase()] || WORK_SHIFTS.PCTC;
  const d = new Date(now); const m = d.getHours() * 60 + d.getMinutes();
  return wins.some(([a, b]) => m >= a && m < b);
}
/** 앱 작업 보고(workPauseOf 와 같은 12시간 안의 work_status)에서 ① «시작·재개» 중 가장 늦은 시각(restartAt) ② 모든 «모드·호기» 의 가장 늦은 보고가 «끝(…_done)» 이면 그 가운데 가장 늦은 끝 시각(allClosedAt, 아니면 0).
 *  (4.06 감사 — 재개 직후·끝 보고 뒤에 화내지 않게. 호기별로 따진다: 1호기가 끝 보고를 올려도 2호기가 일하고 있으면 «끝» 이 아니다.) */
function _statusReportMarks(v, now) {
  const reps = v && v.reports; let restartAt = 0;
  const lastBy = new Map();   // «모드|호기» → 그 호기의 가장 늦은 작업 상태 보고
  if (!reps || typeof reps !== 'object') return { restartAt, allClosedAt: 0 };
  for (const k of Object.keys(reps)) {
    const r = reps[k]; if (!r || typeof r !== 'object') continue;
    const ts = Number(r.ts) || Number(k) || 0;
    if (!ts || ts > now + 5 * MIN || now - ts > 12 * 3600000) continue;
    const act = String(r.action || '');
    if (!(r.type === 'work_status' && _WORK_ACT_RE.test(act))) continue;   // external_pause 는 workPauseOf 가 본다
    if (/(^|_)(start|resume)$/.test(act) && ts > restartAt) restartAt = ts;
    if (!String(r.mode || '')) continue;   // 재감사 D8: 모드 없는 보고(카톡 이관 pause·resume)는 «끝» 판정 열쇠를 만들지 않는다 — 재개 시각(restartAt)은 위에서 이미 셌다
    const key = `${String(r.mode || '')}|${String(r.equip || '')}`;
    const p = lastBy.get(key); if (!p || ts > p.ts) lastBy.set(key, { ts, act });
  }
  //  재감사 D8: 카톡 «양하 끝»(호기 칸이 빈칸)은 그 모드에서 그보다 일찍 보고한 호기들(앱 «1호기 시작» 등)을 같이 닫는다.
  for (const [k, p] of [...lastBy]) {
    if (!k.endsWith('|') || !/(^|_)done$/.test(p.act)) continue;
    const md = k.slice(0, -1);
    for (const [k2, p2] of [...lastBy]) if (k2 !== k && k2.startsWith(md + '|') && p2.ts <= p.ts) lastBy.delete(k2);
  }
  let allClosedAt = 0;
  if (lastBy.size) {
    allClosedAt = 0; let allDone = true;
    for (const p of lastBy.values()) { if (!/(^|_)done$/.test(p.act)) { allDone = false; break; } if (p.ts > allClosedAt) allClosedAt = p.ts; }
    if (!allDone) allClosedAt = 0;
  }
  return { restartAt, allClosedAt };
}
/** 검수원이 홈 카드에서 «검수 완료» 를 눌렀나 — 수석 완료(inspectorDone)이거나 보유 모드가 전부 완료 표식(dischargeDone·loadingDone)이면 true.
 *  HomePage.isAllDone · utils.ferryWorkDone · 홀드 잔여 finishedAll 과 같은 규칙(보유 모드만 따진다). 작업 끝 시각(workEndAt)·터미널 상태는 isWorkingNow 가 본다 — 출항(ATD) 뒤에도 터미널이 «작업중» 으로 남는 항차는 이 «검수 완료» 표시가 끝낸다. (4.06 재감사 D1) */
function _inspectorFinished(v) {
  const info = (v && v.info) || {};
  if (info.inspectorDone) return true;
  const hasD = !!(v && v.discharge && Object.keys(v.discharge).length), hasL = !!(v && v.loading && Object.keys(v.loading).length);
  if (!hasD && !hasL) return false;
  return (!hasD || !!info.dischargeDone) && (!hasL || !!info.loadingDone);
}
/** 앱에 올라온 평택분 컨(voyageCountsOf — 홈 카드와 같은 분모)을 앱 완료가 다 채웠으면 true — 앱에 더 입력할 컨이 없다.
 *  배정목록 수량(info.planDis·planLod)은 «대조용 참고치» 라 대수 기준으로 쓰지 않는다 — 다만 «배정은 있다는데 앱엔 아직 컨이 안 올라온» 모드는 입력할 게 남았을 수 있으니 true 로 치지 않는다.
 *  센 컨이 하나도 없으면 false(모른다 → 종전처럼 본다).
 *  분모는 홈 카드와 같이 시프팅 컨까지 낀다(재감사 D7 — MCSC 633N 실측: 리스트 컨만 끝내고 시프팅 95대가 남았는데 홈은 189대 남았다고 하고 미르는 조용했다). (4.06 재감사 D3·D7) */
function _appAllDone(v, key) {
  const info = (v && v.info) || {};
  let c; try { c = voyageCountsOf(v, null, shiftSetOfVoyage(v, key, null)); } catch (e) { console.warn('[미르 화남] 앱 대수 세기 실패 — 종전처럼 봅니다:', e); return false; }
  let known = 0;
  for (const [mode, plan] of [['discharge', info.planDis], ['loading', info.planLod]]) {
    if (sideCancelled(info, mode)) continue;
    const m = c.byMode[mode];
    if (m.total > 0) { known++; if (m.done < m.total) return false; }
    else if (Number(plan) > 0) return false;
  }
  return known > 0;
}
/** «곧 시작하거나 막 시작할 배» 의 계획 시작 시각(ms) — 아니면 0. 미르 «다음 작업 준비»(_nextWorkOf)와 초조함의 «EDI 를 기다린다»(anxiousReasons)가 같은 문지기를 쓴다(한 벌).
 *  제외 — 떠난 배(departed·done) · «검수 완료» 한 배 · 터미널 작업 끝 시각(workEndAt)이 지난 배(isWorkingNow 와 같은 칸) · 계획 끝이 지난 배 · 시작 6시간보다 먼저인 배 ·
 *  계획 끝을 모르는데 시작한 지 6시간이 넘고 터미널도 «작업중» 이 아닌 배(옛 항차가 «다음 작업» 으로 영영 남지 않게 — 닫는 문이 없다). (4.06 재감사 3·A) */
function _upcomingStartMs(v, now) {
  const info = v && v.info;
  if (!info) return 0;
  const ts = String(info.terminalStatus || '').trim().toLowerCase();
  if (ts === 'departed' || ts === 'done' || _inspectorFinished(v)) return 0;
  const we = _dtMs(info.workEndAt);
  if (we && now >= we) return 0;
  const s = voyagePlanMs(v), e = voyagePlanEndMs(v);
  if (!s || (s - now) > MOOD_EDI_AHEAD_MS) return 0;
  if (e ? now >= e : ((now - s) > MOOD_EDI_AHEAD_MS && !isWorkingNow(v, now))) return 0;   // 닫는 문 없는 옛 항차만 자른다 — 터미널이 «작업중» 이라 한 배는 EDI 를 계속 기다린다
  return s;
}
/** 콘앱용 — 이 배가 «곧 시작하거나 막 시작할 배» 인가(_upcomingStartMs 한 벌). 콘앱은 목록을 받을 때의 info 만 들고 있어, 이 배만 info 를 새로 받아 «일하는 배» 판정이 낡지 않게 한다. (4.06 / 2.62 재감사 1) */
export function isUpcomingWork(v, now = Date.now()) { return !!_upcomingStartMs(v, now); }
/** 작업 중인 배가 없을 때 미르가 하는 일 — 한 벌(검수앱·콘앱 같은 답). 입력은 지금 시각과 항차뿐이라 두 앱이 같은 때 같은 얼굴이다.
 *  곧 시작할 배(시작 6시간 안 · 아직 안 끝남)가 있으면 «작업 준비», 없으면 30분 단위로 «휴식» ↔ «취미 생활». (4.06 — 검수사 2026-10-05 20:57)
 *  끝난 배(출항·터미널 완료·«검수 완료»)와 계획 끝이 지난 옛 항차는 «다음 작업» 으로 세지 않는다. */
function _nextWorkOf(voyages, now) {
  let best = null;
  for (const v of Object.values(voyages || {})) {
    if (!v || !v.info || isWorkingNow(v, now)) continue;
    const s = _upcomingStartMs(v, now);
    if (!s) continue;
    if (!best || Math.abs(s - now) < Math.abs(best.s - now)) best = { v, s };   // 시작이 가장 가까운 배(막 지난 배도 «다음 작업» — 터미널이 아직 안 열었을 뿐)
  }
  return best;
}
function _idleMood(voyages, now) {
  const nx = _nextWorkOf(voyages, now);
  if (nx) {
    const info = nx.v.info, d = nx.s - now;
    const when = d > 0 ? (d >= 3600000 ? `${Math.max(1, Math.round(d / 3600000))}시간 뒤 시작` : `${Math.max(1, Math.round(d / MIN))}분 뒤 시작`) : '시작할 시간';
    const waitEdi = [['discharge', info.planDis], ['loading', info.planLod]].some(([mode, cnt]) => Number(cnt) > 0 && !(nx.v[mode] && (nx.v[mode].dataAt || nx.v[mode].ediContainers)));
    return { ...MIR_MOODS.prep, why: `${info.vsl || '다음 배'} ${when} — 다음 작업을 준비하고 있어요${waitEdi ? ' (EDI 를 기다리는 중)' : ''}` };
  }
  return Math.floor(now / (30 * MIN)) % 2 === 0
    ? { ...MIR_MOODS.rest, why: '작업할 배가 없어서 편안하게 쉬고 있어요' }
    : { ...MIR_MOODS.hobby, why: '작업할 배가 없어서 취미 생활을 즐기고 있어요' };
}
/** 초조함의 이유들 — «자료가 안 들어올 때» 만. 없으면 []. (4.06: «작업 중 완료 기록 없음» 갈래는 화남 angryReasons 로 옮겼다.) */
export function anxiousReasons(voyages, heartbeat, now = Date.now()) {
  const r = [];
  const silent = _collectorSilentMs(heartbeat, now);
  if (silent) r.push(`수집기가 ${Math.round(silent / MIN)}분째 조용해요`);
  for (const v of Object.values(voyages || {})) {
    if (!v || !v.info) continue;
    const info = v.info; const vsl = info.vsl || '';
    const s = _upcomingStartMs(v, now);   // 4.06 재감사 A: «다음 작업» 과 같은 문지기 — 떠난·검수 완료·작업 끝난 배의 EDI 는 기다리지 않는다
    if (s) {
      for (const [mode, cnt, ko] of [['discharge', info.planDis, '양하'], ['loading', info.planLod, '선적']]) {
        if (!(Number(cnt) > 0)) continue;
        if ((v[mode] && v[mode].dataAt) || (v[mode] && v[mode].ediContainers)) continue;
        const h = (s - now) / 3600000;
        r.push(`${vsl} ${ko} EDI가 아직이에요 (${h > 0 ? Math.max(1, Math.round(h)) + '시간 뒤 시작' : '작업 시간인데'})`);
      }
    }
  }
  return r;
}
/** 화남의 이유들 — 터미널은 작업 중(isWorkingNow, 터미널 본선 현황 한 벌)인데 앱 완료 기록이 실작업 60분 넘게 없다. 없으면 [].
 *  4.06 — 검수사 2026-10-05 18:40 «초조함이 아니라 화난표정이어야 함 작업은 진행중인데 앱 입력이 없으니 화난다는 뜻으로». 종전엔 anxiousReasons 의 한 갈래(초조함)였다.
 *  · 수집기가 조용하면(하트비트 끊김) 터미널 «작업 중» 도 믿을 수 없다 — 화내지 않는다(자료가 안 들어오는 건 초조함이 맡는다). 하트비트가 아직 없으면(null) 그냥 본다.
 *  · 쉬는 시간(근무표의 빈 자리 — 식사·티타임)엔 화내지 않는다 — 검수사 2026-09-29 «그 시간대엔 작업자도 작업중인 장비도 없는상태». 터미널 상태는 그동안도 «작업중» 으로 남는다.
 *  · 앱에 입력할 게 없는 배도 화내지 않는다 — «검수 완료»(inspectorDone·보유 모드 전부 dischargeDone/loadingDone) · 모든 호기가 끝 보고 · 앱에 올라온 컨을 완료가 다 채움(재감사).
 *  ⚠ 여기서 보는 완료는 검수원이 앱에서 누른 completed 뿐이다. 터미널 합계는 완료로 세지 않는다(터미널 완료 자동 반영 금지 — 검수사 2026-10-03). */
export function angryReasons(voyages, heartbeat, now = Date.now()) {
  const r = [];
  if (_collectorSilentMs(heartbeat, now)) return r;
  for (const [vKey, v] of Object.entries(voyages || {})) {
    if (!v || !v.info) continue;
    const vsl = v.info.vsl || '';
    if (!isWorkingNow(v, now)) continue;
    if (!_inWorkWindow(now, pierOf(v))) continue;   // 4.06: 밥 먹는 시간에 화내지 않는다
    if (workPauseOf(v, now)) continue;   // 3.69-01: 앱에 중단 보고가 있으면 완료가 없는 게 당연하다 — 화내지 않는다
    if (_inspectorFinished(v)) continue;  // 4.06 재감사 D1: 검수원이 «검수 완료» 를 눌렀으면 입력할 게 없다(터미널은 출항 전까지 «작업중» 으로 남는다 — 동방은 workEndAt 이 실출항 ATD)
    const marks = _statusReportMarks(v, now);
    let last = 0, any = false;
    for (const mode of ['discharge', 'loading']) {
      const comp = v[mode] && v[mode].completed;
      if (!comp || typeof comp !== 'object') continue;
      for (const c of Object.values(comp)) { const at = c && Number(c.at); if (at) { any = true; if (at > last) last = at; } }
    }
    if (marks.allClosedAt && marks.allClosedAt >= last) continue;   // 4.06 감사: 모든 호기의 마지막 보고가 «작업 끝» 이고 그 뒤에 완료가 더 안 찍혔으면 입력할 게 없다(끝 보고 뒤에 또 입력했으면 다시 본다)
    if (marks.restartAt > last) last = marks.restartAt;   // 4.06 감사: 중단 뒤 재개 보고가 있으면 재개 시각부터 잰다(중단 시간이 그대로 세지 않게)
    //  3.69-01: 쉬는 시간(석식·중식·야식·티타임)은 세지 않는다 — 검수사 «그 시간대엔 작업자도 작업중인 장비도 없는상태이기 때문에 작업 대기시간도 아닙니다». 근무표(WORK_SHIFTS) 한 벌.
    let wmin = 0; try { wmin = workMinutesBetween(last, now, pierOf(v)); } catch (e) { wmin = Math.round((now - last) / MIN); }
    if (!(any && wmin * MIN > MOOD_NO_DONE_MS)) continue;
    if (_appAllDone(v, vKey)) continue;   // 4.06 감사: 앱에 올라온 컨을 완료가 다 채웠으면 입력할 게 없다 — 센 값은 비싸서(항차 펼치기) 60분이 넘었을 때만 본다
    r.push(`${vsl} 터미널은 작업 중인데 앱 완료 기록이 실작업 ${wmin}분째 없어요`);
  }
  return r;
}

/**
 * 기분 한 벌. 입력은 전부 읽기 전용이다.
 * @param {object} p  { now, voyages, heartbeat, lastAskAt, lastEvent:{at,kind,why}, anxiousSince, openedAt, pier, angry(이미 잰 angryReasons 결과 — 있으면 다시 재지 않는다) }
 * @returns {{ key, label, badge, why }}
 */
export function mirMoodNow(p = {}) {
  const now = Number(p.now) || Date.now();
  const ev = p.lastEvent;
  if (ev && Number(ev.at) && now - Number(ev.at) < MOOD_EVENT_MS) {
    if (ev.kind === 'workPick' || ev.kind === 'workDone') return { ...MIR_MOODS.happy, why: ev.why || '' };
    if (ev.kind === 'missed') return { ...MIR_MOODS.sad, why: ev.why || '' };
  }
  const angry = Array.isArray(p.angry) ? p.angry : angryReasons(p.voyages, p.heartbeat, now);   // 4.06: 작업은 되는데 앱 입력이 없다 → 화남(초조함보다 먼저). currentMirMood 가 이미 쟀으면 그 값을 쓴다(큰 항차는 한 번에 십수 ms)
  if (angry.length) return { ...MIR_MOODS.angry, why: angry.slice(0, 2).join(' · ') };
  const working = Object.values(p.voyages || {}).filter((v) => v && v.info && isWorkingNow(v, now));
  //  4.06: 작업 중인 배가 하나도 없으면 초조해하지도 슬퍼하지도 않는다 — 쉬는 얼굴(아래 _idleMood). 검수사 2026-10-05 20:57
  const reasons = working.length ? anxiousReasons(p.voyages, p.heartbeat, now) : [];
  if (reasons.length) {
    const since = Number(p.anxiousSince) || 0;
    const opened = Number(p.openedAt) || 0;
    if (since && now - since > MOOD_NEGLECT_MS && opened < since) {
      return { ...MIR_MOODS.sad, why: `${Math.round((now - since) / MIN)}분째 말했는데 봐 주지 않아요 — ${reasons[0]}` };
    }
    return { ...MIR_MOODS.anxious, why: reasons.slice(0, 2).join(' · ') };
  }
  const pier = p.pier || (working[0] ? pierOf(working[0]) : 'PCTC');
  const meal = mealPhase(now, pier);
  if (meal) {
    if (meal.phase === 'hungry') return { ...MIR_MOODS.hungry, why: `${meal.label} — 곧 밥 시간이에요` };
    return { ...MIR_MOODS.full, why: `${meal.label} — 잘 먹었어요` };
  }
  if (!working.length) return _idleMood(p.voyages, now);   // 4.06: 작업할 배가 없으면 심심함이 아니라 휴식·취미·다음 작업 준비
  const la = Number(p.lastAskAt) || 0;
  if (!la || now - la > MOOD_BORED_MS) {
    const names = working.map((v) => v.info.vsl).filter(Boolean).slice(0, 3).join('·');
    return { ...MIR_MOODS.bored, why: `${names} 작업 중인데 ${la ? Math.round((now - la) / MIN) + '분' : '한참'} 넘게 시키는 일이 없어요` };
  }
  return { ...MIR_MOODS.basic, why: '' };
}

/* ── 기기 안 기억(한 벌) — 화면들이 같은 시계를 본다. RTDB 에 쓰지 않는다. */
//  lastAskAt 은 앱을 켠 시각에서 시작한다 — 켜자마자 «한참 시키는 일이 없어요» 가 뜨지 않게(감사 지적). 시키는 일 = 질문·작업 선택·완료 기록.
const _moodSt = { lastAskAt: Date.now(), lastEvent: null, anxiousSince: 0, openedAt: 0, lastKey: '' };
const _moodSubs = new Set();
function _moodEmit() { for (const f of _moodSubs) { try { f(); } catch (e) { console.warn('[미르 기분] 구독자 실패:', e); } } }
export function noteMirAsk(now = Date.now()) { _moodSt.lastAskAt = now; _moodEmit(); }
export function noteMirOpen(now = Date.now()) { _moodSt.openedAt = now; _moodEmit(); }
/** kind: 'workPick' | 'workDone' | 'missed' */
export function mirMoodEvent(kind, why = '', now = Date.now()) { _moodSt.lastEvent = { kind, why, at: now }; if (kind === 'workPick' || kind === 'workDone') _moodSt.lastAskAt = now; _moodEmit(); }
export function subscribeMirMood(f) { _moodSubs.add(f); return () => _moodSubs.delete(f); }
export function mirMoodState() { return { ..._moodSt }; }
/** 지금 기분 — 기억(질문·열람·순간 감정)을 얹어 판정하고, 초조함이 시작된 시각을 기억해 둔다. */
export function currentMirMood(voyages, heartbeat, now = Date.now(), pier) {
  //  4.06 감사: 화남이 보이는 동안(초조함을 가린다)은 «말했는데 안 봐 준다» 시계를 세우지 않는다 — 안 본 말로 슬퍼지지 않게
  const angry = angryReasons(voyages, heartbeat, now);
  const anyWorking = Object.values(voyages || {}).some((v) => v && v.info && isWorkingNow(v, now));   // 4.06: 일하는 배가 없으면 초조함 자체가 없다
  const reasons = (angry.length || !anyWorking) ? [] : anxiousReasons(voyages, heartbeat, now);
  if (reasons.length) { if (!_moodSt.anxiousSince) _moodSt.anxiousSince = now; } else _moodSt.anxiousSince = 0;
  const m = mirMoodNow({ now, voyages, heartbeat, pier, angry, lastAskAt: _moodSt.lastAskAt, lastEvent: _moodSt.lastEvent, anxiousSince: _moodSt.anxiousSince, openedAt: _moodSt.openedAt });
  _moodSt.lastKey = m.key;
  return m;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   10. [mirYard] 야드 상황 — «야드 바빠?·복잡해?·왜 차 안 와?·작업 왜 느려?·반입 반출 몇 대?» (TallyOne 3.69 / ConeOne 2.58)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════
   검수사 2026-09-29 «미르에게 질문 야드 바빠(뻐)?, 야드 복잡해?,왜 차 안와? 반입 반출 차량등 확인하고 알려주기»
                    · '왜' — «야드 상황을 알고 작업이 느린 이유 설명등» · 블록 표의 3·4·5시간 후 열 — «그건 그시간이후의 추이상황입니다».

   재료 — 수집기(MailPilot 2.39 collector/yard.py)가 3분마다 올리는 RTDB `yard_status/{PCTC|PNCT}`(로그인 없는 두 정보서비스 페이지).
     PCTC { at, inCnt, outCnt, level(양호/혼잡/적체 — 터미널 자체 규칙 반입+반출 60/80), gate{GP,RF,DG,AK,MT}(반출입 대기), vssl{…}(본선 대기),
            locked[블록](본선 작업으로 반출 불가), work[{blk,rt,cn,at}](야드 장비가 붙은 블록·마지막 놓인 양하 컨), ahead{h1~h5:{g,v}}(1~5시간 뒤 예상치) }
     PNCT { at, inCnt, outCnt, tatIn, tatOut(회전시간 분) } — 동방은 판정어·블록 자료를 안 준다. **지어내지 않는다.**
   자료는 화면이 넣어 준다 — 검수앱 App.jsx 가 구독해 setMirYard 로, 콘앱은 mirAsk 가 GET 해 ctx.yard 로(ctx.yard 가 있으면 그것이 먼저).
   ⚠ 순수 — 판정은 answerYard 한 벌. 검수앱·콘앱이 같은 답을 낸다. 우리 배 몫은 «블록에 마지막 놓인 컨»을 이 항차·전 항차 EDI 와 대조해 센다. */
let _yard = null;
export function setMirYard(v) { _yard = (v && typeof v === 'object') ? v : null; }
export function readMirYard() { return _yard; }
export const YARD_STALE_MS = 10 * MIN;    // 이보다 오래된 자료면 «N분 전 자료» 를 붙인다
export const YARD_DEAD_MS = 60 * MIN;     // 이보다 오래됐으면 자료가 안 오는 것 — 수집기 확인을 권한다
export const YARD_SPEAK = { conversational: true, rate: 0.9 };   // 3.69-01: 야드 답은 숫자가 빽빽해 천천히 읽는다 — 검수사 «답변 속도가 너무 빨라서 무슨 소리인지 모르겠음»(18:52). 네 창구·콘앱이 같은 값을 쓴다
const YARD_CT_KO = { GP: '일반', RF: '냉동', DG: '위험물', AK: '장척', MT: '공컨' };
const YARD_ADVICE = '샤시가 늦으면 1차로 기다리고, 2차로 포맨에게 독촉해요. 출항이 임박했으면 수석에게 보고해요.';   // data/mirKnowledge «야드 샤시 안 왔어요» 와 같은 말

function _ydSum(d) { let n = 0; for (const k in (d || {})) n += Number(d[k]) || 0; return n; }
function _ydKinds(d) {
  return Object.keys(d || {}).filter((k) => Number(d[k]) > 0).sort((a, b) => Number(d[b]) - Number(d[a])).map((k) => `${YARD_CT_KO[k] || k} ${Number(d[k])}`).join('·');
}
function _ydAge(y, now) {
  const at = Number(y && y.at) || 0;
  if (!at) return { min: Infinity, dead: true, tag: '' };
  const gap = now - at;
  const min = Math.max(0, Math.round(gap / MIN));
  return { min, dead: gap >= YARD_DEAD_MS, tag: gap >= YARD_STALE_MS ? ` (${min}분 전 자료)` : '', text: min >= 120 ? `${Math.floor(min / 60)}시간` : `${min}분` };
}
const _ydHm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? (Number(m[1]) * 60 + Number(m[2])) : null; };
/** 시각 문자열(HH:MM)만 있는 «마지막 놓인 컨» 중 지금(now) 기준 가장 가까운 과거 — 자정을 넘긴 야간 작업(«00:05» 가 «23:59» 뒤)도 맞는다(2차 시뮬 13). */
function _ydLatest(list, now) {
  const d = new Date(now); const nowMin = d.getHours() * 60 + d.getMinutes();
  let best = null, bestGap = Infinity;
  for (const w of list) { const t = _ydHm(w.at); if (t == null) continue; const gap = ((nowMin - t) % 1440 + 1440) % 1440; if (gap < bestGap) { bestGap = gap; best = w; } }
  return best;
}
/** 블록에 마지막 놓인 컨(work[].cn)이 어느 배 것인지 — 이 항차 컨(cs) → «우리 배», 전 항차(flat → voyages) → 그 배 코드, 모르면 ''. */
function _ydOwnerOf(cn, o) {
  if (!cn) return '';
  if (o._mine && o._mine.has(cn)) return o.ship || '우리 배';
  if (o._others === undefined) {
    o._others = new Map();
    try {
      if (Array.isArray(o.flat)) { for (const x of o.flat) if (x && x.cn && x.voyageKey && !o._others.has(x.cn)) o._others.set(x.cn, x.voyageKey); }
      if (o.voyages && typeof o.voyages === 'object') {   // flat 이 비었거나 못 찾으면 항차 원본도 본다(2차 시뮬 14)
        for (const k of Object.keys(o.voyages)) {
          const v = o.voyages[k]; if (!v) continue;
          for (const m of ['discharge', 'loading']) { const e = v[m] && v[m].ediContainers; if (e && typeof e === 'object') for (const c of Object.keys(e)) if (!o._others.has(c)) o._others.set(c, k); }
        }
      }
    } catch (e) { /* 대조 재료가 없어도 야드 답은 낸다 */ }
  }
  const vk = o._others.get(cn);
  if (!vk) return '';
  const v = o.voyages && o.voyages[vk];
  return S(v && v.info && (v.info.vsl || v.info.vslFull)) || String(vk).split('_')[0] || '';
}
export function answerYard(kind, yard, o = {}) {
  const now = Number(o.now) || Date.now();
  const piers = (Array.isArray(o.piers) && o.piers.length ? o.piers : ['PCTC', 'PNCT']).map((p) => String(p || '').toUpperCase()).filter((p, i, a) => a.indexOf(p) === i);
  if (!yard || typeof yard !== 'object' || !Object.keys(yard).length) return '야드 자료가 아직 안 왔어요 — 수집기(MailPilot 2.39)가 3분마다 올려요. 하트비트부터 확인해 주세요.' + (kind === 'why' ? ' ' + YARD_ADVICE : '');   // 자료가 없어도 대처는 말한다(감사 6)
  const opts = Object.assign({}, o, { _mine: new Set((o.containers || []).map((x) => x && x.cn).filter(Boolean)) });
  const out = [];
  for (const pier of piers) {
    const y = yard[pier];
    if (!y || !Number(y.at)) { out.push(`${pier} 야드 자료가 아직 안 왔어요.${kind === 'why' ? ' ' + YARD_ADVICE : ''}`); continue; }
    const age = _ydAge(y, now);
    if (age.dead) { out.push(`${pier} 야드 자료가 ${age.text}째 안 들어와요 — 수집기를 확인해 주세요${y.err ? `(수집기: ${String(y.err).slice(0, 60)})` : ''}. (마지막 자료 반입 ${y.inCnt}대·반출 ${y.outCnt}대)${kind === 'why' ? ' ' + YARD_ADVICE : ''}`); continue; }
    if (!(Number.isFinite(Number(y.inCnt)) && Number.isFinite(Number(y.outCnt)))) { out.push(`${pier} 야드 자료를 못 읽었어요(반입/반출 대수 없음) — 수집기 로그를 봐 주세요.`); continue; }
    out.push(pier === 'PNCT' ? _ydPnct(kind, y, age) : _ydPctc(kind, y, age, opts, now));
  }
  return out.join('\n');
}
function _ydPnct(kind, y, age) {
  const base = `PNCT 야드 — 반입 ${y.inCnt}대 · 반출 ${y.outCnt}대${age.tag}.`;
  const tat = (y.tatIn != null && y.tatOut != null) ? ` 회전시간은 반입 ${y.tatIn}분 · 반출 ${y.tatOut}분이에요.` : '';
  if (kind === 'why') return `${base}${tat} 블록별 자료는 동방 정보서비스에 없어요. ${YARD_ADVICE}`;
  if (kind === 'block' || kind === 'trend') return `${base}${tat} 동방은 블록별 작업현황·추이를 안 보여줘요.`;
  return `${base}${tat} (동방은 혼잡 등급을 안 줘서 대수와 회전시간만 말해요.)`;
}
function _ydPctc(kind, y, age, o, now) {
  const lvl = y.level || '판정 없음';
  const _last = lvl.charCodeAt(lvl.length - 1); const _jong = _last >= 0xAC00 && _last <= 0xD7A3 && ((_last - 0xAC00) % 28) !== 0;   // 받침 — «혼잡이에요»·«적체예요»(감사 2)
  const base = `PCTC 야드는 지금 ${lvl}${_jong ? '이에요' : '예요'} — 반입 ${y.inCnt}대 · 반출 ${y.outCnt}대${age.tag}.`;
  if (kind === 'busy') return base;
  //  수집기가 표를 못 읽은 판(partial — 사이트 모양이 바뀐 것) — 대수 말고는 «못 읽었다» 고 한다. 빈 표를 «대기 없음» 으로 말하지 않는다(2차 시뮬 6).
  if (y.partial) return `${base} 야드 표(대기 물량·블록·장비)는 이번에 못 읽었어요 — 사이트 모양이 바뀐 것 같아요. 반입/반출 대수만 믿어 주세요.`;
  const gate = y.gate || {}, vssl = y.vssl || {};
  const wait = `야드 작업 대기 — 반출입 ${_ydSum(gate)}대(${_ydKinds(gate) || '없음'}) · 본선 ${_ydSum(vssl)}대(${_ydKinds(vssl) || '없음'}).`;
  const locked = Array.isArray(y.locked) ? y.locked : [];
  const work = (Array.isArray(y.work) ? y.work : []).filter((w) => w && (w.rt || w.cn));
  const rts = work.filter((w) => w.rt);
  const owned = work.filter((w) => w.cn).map((w) => Object.assign({}, w, { owner: _ydOwnerOf(w.cn, o) }));
  const _isMine = (w) => !!w.owner && (w.owner === (o.ship || '우리 배') || w.owner === '우리 배');
  const mineN = owned.filter(_isMine).length;
  const otherCnt = {};   // 다른 배 코드별 대수 — 우리 항차 목록에 없는 배는 «다른 배» 로 묶는다(지어내지 않는다)
  for (const w of owned) { if (_isMine(w)) continue; const k = w.owner || '다른 배'; otherCnt[k] = (otherCnt[k] || 0) + 1; }
  const idleN = rts.filter((w) => !w.cn).length;   // 장비는 붙었는데 아직 놓인 컨이 없는 블록 — 셈이 어긋나지 않게 같이 말한다(2차 시뮬 8)
  const otherLine = Object.keys(otherCnt).sort((a, b) => (a === '다른 배') - (b === '다른 배')).map((k) => `${k} ${otherCnt[k]}대`).concat(idleN ? [`아직 안 놓인 ${idleN}대`] : []).join(' · ');
  //  추이 — 블록 표의 시간대 열 합계. 검수사 «그건 그시간이후의 추이상황입니다». 0 인 쪽은 읽지 않는다(2차 시뮬 12).
  //    3.69-02 — «일반·냉동» 머리글의 1·2 열도 1·2시간 뒤 예상치로 읽는다. 근거 — ① 냉동 블록은 1E·2E·3F(검수사 2026-09-29 20:05)인데 «냉동» 열 값은 3A·3B 같은 일반 블록에 있다
  //    ② 같은 페이지 스크립트가 화물 종류 표 열 이름도 «현재·일반·냉동·3시간 후·4시간 후» 로 한 칸 밀어 달았다(이름 목록 돌려쓴 흔적) ③ 서버 키 GATE0~5·VSSL0~5 에서 3·4·5 = 3·4·5시간 후이니 1·2 = 1·2시간 후.
  const ah = y.ahead || {};
  //  검수사 2026-09-29 18:49 «3시간후 4시간 후는 예상치 입니다» · «3시간 후에는 몇대쯤 될것이다. 4시간 후에는 몇대쯤일것이다» — 예상치는 «몇 대쯤 될 것 같아요» 로 말한다(3.69-01).
  const trendParts = ['h1', 'h2', 'h3', 'h4', 'h5'].map((h) => { const t = ah[h] || {}; const g = Number(t.g) || 0, v = Number(t.v) || 0; if (!g && !v) return ''; const parts = [].concat(g ? [`반출입 ${g}대`] : [], v ? [`본선 ${v}대`] : []); return `${h.slice(1)}시간 뒤엔 ${parts.join('·')}쯤`; }).filter(Boolean);
  const trend = trendParts.length ? `예상 — ${trendParts.join(', ')} 될 것 같아요.` : '앞으로 1~5시간 예상치는 안 잡혀 있어요.';
  if (kind === 'count') return `${base} ${wait}`;
  if (kind === 'trend') return `${base} ${trend}`;
  if (kind === 'block') {
    if (!rts.length && !owned.length) return `${base} ${y.partialWork ? '장비·잠금 표는 이번에 못 읽었어요.' : '지금 야드 장비가 붙은 블록은 안 보여요.'}${locked.length ? ` 반출 막힌 블록 ${locked.length}곳(${locked.join(' ')}).` : ''}`;   // 재감사 4
    const L = work.map((w) => `${w.blk} ${w.rt || ''}${w.cn ? ' ' + w.cn.slice(-4) : ''}${w.at ? ' ' + w.at : ''}`.replace(/\s+/g, ' ').trim());
    return `${base} 야드 장비가 붙은 블록: ${L.join(', ')}.${locked.length ? ` 반출 막힌 블록 ${locked.length}곳(${locked.join(' ')}).` : ''}`;
  }
  //  why — 느린 이유 설명(검수사 '왜'): 등급·대기 물량·잠긴 블록 수·장비 중 우리 몫·마지막 우리 컨·추이·대처.
  //    블록 코드·장비 번호 목록은 여기서 읽지 않는다(음성 40초 — 2차 시뮬 8). «야드 어느 블록» 칩이 그 목록을 낸다.
  const L = [base];
  //  3.69-01: 앱에 중단 보고가 있으면 그것부터 — 검수사 «카톡보고를 했으면 앱은 알고 있을텐데». 시각은 보고 ts 를 HH:MM 으로.
  const wp = o.voyage ? workPauseOf(o.voyage, now) : null;
  if (wp) {
    const hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const tail = wp.resumeAt ? (now < wp.resumeAt ? ` ${wp.breakKo}과 겹쳐 보통 ${hm(wp.resumeAt)}에 재개돼요.` : ` 보통 ${hm(wp.resumeAt)} 재개인데 아직 재개·완료 기록이 없어요.`) : '';
    L.push(`앱 보고로는 ${wp.equip ? wp.equip + ' ' : ''}${wp.ko} ${hm(wp.ts)} 중단${wp.reason ? `(사유 ${wp.reason})` : ''} 중이에요.${tail}`);
  }
  L.push(wait);
  if (locked.length) L.push(`본선 작업 때문에 반출이 막힌 블록이 ${locked.length}곳이에요.`);
  if (o.mode === 'loading') {
    //  선적 탭 — 야드 장비·마지막 놓인 컨은 양하 쪽 이야기다. 선적 지연은 반출 쪽 사정으로만 말한다(2차 시뮬 16).
    L.push(`게이트 반출 차량이 ${y.outCnt}대예요.`);
  } else if (rts.length) {
    let s = `양하 컨을 받는 야드 장비는 ${rts.length}대`;
    if (o.ship && owned.length) s += `인데 마지막 놓인 컨으로 보면 우리 배(${o.ship}) 컨을 받는 건 ${mineN}대예요${otherLine ? `(${otherLine})` : ''}.`;
    else s += '예요.';
    L.push(s);
    const last = _ydLatest(owned.filter(_isMine), now);
    if (last) L.push(`마지막으로 놓인 우리 컨은 ${last.blk} ${last.cn}(${last.at})이에요.`);
  } else L.push(y.partialWork ? '장비·잠금 표는 이번에 못 읽었어요.' : '지금 양하 컨을 받는 야드 장비가 안 보여요.');   // partialWork — 수집기가 장비·잠금 표를 못 읽은 판(감사 7)
  L.push(trend);
  L.push(YARD_ADVICE);
  return L.join(' ');
}
