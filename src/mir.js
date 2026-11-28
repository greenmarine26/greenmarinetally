// 미르 한 파일 — 말귀(사전)·말투·재료·사실·눈·답 고르기·모델 문을 한 곳에 둔다 (검수앱·콘앱 공용 엔진)
//
// 검수사 2026-09-10 «미르를 하나로 만들고 싶습니다» · 2026-09-11 «미르 하나로 통합 했는데 답이 다르면 통합이 안되었다는 이야기»
// 종전 일곱 파일(mirLearn·mirChat·mirCtx·mirFacts·mirEyes·mirAnswer·mirModel)을 본문 그대로 절로 옮겼다 — 답은 한 글자도 바뀌지 않는다.
//   화면은 components/MirFab.jsx(미르 시트 — 4.89 부터 검색줄에서 «미르야» 로 부른다), 콘앱 포장은 mirCore.entry.js, 파서는 nlSearch.js(앱 공용), 용어 자료는 data/mirKnowledge.js.
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

import { underHeldOf } from './bayMode.js';   // 4.82-01: 위에 보류한 컨이 얹힌 아래 컨 — 화면 자동 가이드와 한 벌
import { withdrawnCranesOf } from './craneMove.js';
import { deckCoordMap } from './rzorPlan.js';   // 4.04-02: 덱플랜 좌표 «덱_줄_칸» (rzorPlan 은 import 가 없다 — 콘앱 번들에 가볍게 실린다)
import {
  _storage, SK, isPyeongtaekPort, isPtk, sideCancelled, isWorkingNow, pickCarrierOp, pickDischargePol, EDI_PROTECTED_KEYS, isoToLabel, effectivePos, reeferTempOf, reeferTempExempt, applySpecialMarks, isReeferCheckSkipped,
  berthSideOf, overDims, getEquipNumber, formatWt, runDeviceCmd, resolveShipKey, shiftingMapForDisplay, shiftEvidenceOf, dropFilledBookingSlots, legendItemsOf,
  resolveCrewSides, voyagePierOf, voyagePlanMs, voyagePlanEndMs, _dtMs, koJosa, qcRowsOf,   // 4.42-03: qcRowsOf — 동방 호기 표 한 벌(갱 기다리는 배) · 4.42-02: koJosa — «강풍 대기로·장비 고장으로»   // 3.56 [mirMood] · 4.06 재감사: _dtMs = isWorkingNow 와 같은 workEndAt 읽기
  isReeferContainer, isReeferIso, isFullReefer, isEmptyReefer, emptySplitLabel,   // 4.15-01: 엠티 구분 한 벌 · 3.60-10: 리퍼 판정 한 벌 · 4.15: «리퍼 몇 대» = 풀 리퍼 한 벌
  ownDirCns, isListOriginRecord, shiftCnSetOf, shiftSplitOf, isShiftOffPtk,   // 3.60-18: 미르 잔여 분모 = 리스트 + 시프팅(progressOf·홈 카드와 같은 집합) · 4.16: 시프팅 분리 한 벌
  EDI_EMPTY_FILL_KEYS, ediCoreEmpty, isoPickOog,   // 3.60-13: EDI 칸이 비었을 때만 리스트가 채운다(수정안 A) · 4.15: 고른 규격이면 규격초과 표식도
  currentShift, shiftGangKey, gangsOfShift,   // 5.00-01 갱 수 한 벌 · 4.01: 예상 작업 시간 — 갱 수는 조마다(info.gangsShift) 읽는다
  plausibleListWtKg, ediWtField,   // 4.08-02: 컨 하나 40톤 초과는 무게 없음 · EDI 총중량 wtEdi (병합 경로 한 벌)
  dateWordOf,   // 4.12-02: 날짜 말(어제·내일·낼모레…) 해석 한 벌
  dayShiftKeys, doneOnShiftKeys,   // 4.17 (§7.8-③): 지난 날 완료 기록 — 조 키는 근무일 기준 한 벌
  shipCodeFixOf, knownShipCodes,   // 4.17 (§7.8-⑧): 없는 선박코드 → 가장 가까운 코드 한 벌
  ptkDischargeUnitsOf, markDischargeUnit, dischargeUnitBareRow, applyDischargeUnits, shiftSetForUnitsOf,   // 4.20 (Fable 판정 ④): 평택 양하분 한 벌(세관 목록 + 추가분)
  xraySealCheckOf, xraySealCheckLines,   // 4.88: X-RAY 실 점검 한 벌(중복·앞 세 자리·자릿수)
  xraySealerOf,   // 4.50: 봉인자 이름은 화면·인쇄·엑셀과 같은 한 벌로 읽는다(미리 등록한 이름이 아니라 마지막 봉인자)
  activeHeldOf, inspectionSealOf,   // 4.26-02 · inspectionSealOf: 실번호 = 검수리스트·작업 카드와 같은 값(엠티는 엠티실): 지금 걸린 보류 한 벌(실린 컨은 뺀다 · doneAt 은 완료가 아니라 되묻기 기준점)
  isSealError, sealCheckOf, sealConflictOf, isRfListSrc,   // 4.49: 실번호 판정 한 벌 · 4.49-02: 실번호 불일치(RF CONTAINER LIST 뺌) · RF 리스트 출처 표기
  normSeal,   // 5.03: 실번호 원문 비교는 대소문자·공백·하이픈을 걷은 한 벌로
  isKeepShift,   // 4.48 감사(중-C): 콘앱 «총 무브수» 끝줄 — 넘겨받은 시프팅 지도의 본선 잔류 예보(노란 ◆) 수
  ediWaitingOnlyLeft,   // 4.55-01: 양하는 끝 · 남은 선적이 EDI 대기뿐 — 미르는 입력할 게 없다고 본다
  inspectorAllDone,   // 4.55-01: «검수 완료» 판정 한 벌(홈·수석 보드·보관 보고·홀드 잔여 공용)
  dischargeAccuracyOf, isPctcVoyage,   // 4.56: 미르 «양하 정확도» — 출발항별 EDI 계획 대비 실제 양하 순서 일치율
  guideTwinOf, swapWarnWordOf, hatchReportTs,   // 4.38: hatchReportTs — 해치 보고의 사건 시각 한 벌(자동 기록은 eventTs) · 4.23-01 3차: 자동 가이드와 같은 트윈 묶기(맞교환 자리는 짝 짐작 안 함) · 규격 다른 맞교환은 «자리 미정»(화면과 같은 말)
  degText,   // 5.13-01: 리퍼 온도 단위 한 벌
} from './utils.js';
import {
  TWIN_MAX_TOTAL_KG, TWIN_CAUTION_TOTAL_KG, twinWtOf, twinDiffLimit, buildTwinPairs, analyzeTwinPairs, parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing, generateIntroAnswer,
  generateTimeAnswer, generateWakeAnswer, generatePilotAnswer, generateTwinCheckAnswer, generateHandover, generateFoodAnswer, answerAboutAlert,
  generateHowToAnswer, featureHelpExact, featureHelpLoose, formatAppTallyAnswer, needsModeChoice, generateContactAnswer,
  answerCraneCrew, crewSetText, answerHowCore, generateSealAuditAnswer, generateSealDetailAnswer, sealProblemListOf, generateSealRemedyAnswer, generateSealResultAnswer, formatCarriers, describeQuery, hasAnyCondition, voyageDoneAts,
  voyageReportSpan, WORK_SHIFTS, workMinutesBetween,   // 3.56 [mirMood] 식사 창은 근무표 그대로 · 3.69-01 완료 공백은 실작업 분으로 잰다
  isPastEatOnly, isPastMealMention, isOtherMeaningEat,   // 3.61-04 끼니 말의 «때» 판정 한 벌 — 상수를 가져오면 순환 초기화로 죽는다(함수만 부른다)
  termProgressOf, termDoneAts,   // 3.74: 터미널 본선현황으로 센다
  briefCountsOf, ptkRowOf,   // 4.39-01: «작업 분석» 이 브리핑과 같은 판정으로 센다
  sealPredictOf,   // 4.39-02: 예상 실오류(주의 박스와 같은 판정) — 실번호 점검·브리핑·작업 분석
  isBayTidyAsk,   // 4.81-01: 배 이름 없는 «N번 베이 정리해줘» 도 일하는 배 규칙을 탄다
  isNoRestShip,   // 4.86-02: 카페리 휴게 없음 한 벌
} from './nlSearch.js';
import { shipOpMapper } from './data/tallyFormats.js';
import {
  answerHatchStatus, answerFeedback, answerCollector, answerTallyPending, answerArchiveStats, answerOverlaps, answerDataArrival, answerGangSplit, answerRzorLearn,
  answerTotalMoves, answerFirstStart, answerXrayShifts, answerShiftBriefing, isDataArrivalQuery, answerPlanOutlook, answerPlanOutlookBoth,
  isPlanOutlookQuery, outlookModeOf, answerShipSpeed, isSpeedQuery, answerShipOverview, buildGangShift, gangBriefLines, answerGangShift,
} from './chiefAnswers.js';
import { buildGuidedQueue } from './guidedQueue.js';
import { workOrderOf, workOrderText } from './workOrder.js';   // 4.09: 양하 순서 조건 한 벌 — 자동 가이드 화면과 같은 읽기
import { findTwinCandidate, getBayPairs } from './twin.js';
import { bayGroupCenter } from './swapGrade.js';
import { mirKnowledge, mirKnowledgeMulti } from './data/mirKnowledge.js';
import { isoCheckDigit, isoFixLastDigit, parseSpokenTimeMs } from './utils.js';   // 5.29-04: 쉼 끝 시작 말의 시각
import { isHiddenStaff, isTester } from './staffList.js';   // ★ 5.28-05: 테스터(«클로드»·«클로드2») 말은 사전에 익히지 않는다(검수사 2026-11-27 «테스터는 익히지 않음»)   // 5.27: 묶음 답의 컨번호 검산(nlSearch 가 쓰는 것과 같은 한 벌)
import { PORT_CODE_KR } from './nlSearch.js';   // 5.27: POD별 답에 한국어 항구 이름
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';
import { judgeMode, buildReadiness, describeReadiness, loadingCollecting } from './dataReadiness.js';   // 4.17 (§7.8-⑫): 리스트뿐·미선적 = «자료 수집중» 판정 한 벌
import { matchPortMisById, shipIdentityLite } from './portMisCore.js';   // 3.60-18: PORT-MIS 매칭 본체(베이사전 없이) — 콘앱 미르용 기본 매처
export { progressOf } from './utils.js';   // 3.60-18: 연막검사(smoke_voycounts)가 «미르 분모 = 홈 카드 분모» 를 같은 번들에서 대조한다
import { diffEdiList, explainEdiGap } from './ediGap.js';
import { aiCostUsd, AI_PRICE, aggregateAiCost, aiDayKey } from './aiCost.js';   // 4.37: AI 단가 한 벌 — 웹 검색 한도 계산과 소유자 «💳 AI 비용» 화면이 같은 표를 쓴다(aiCost 는 import 가 없다)
import { aiDayLimit, aiDayUsages, AI_DAILY_USD_DEFAULT, aiCarryKeys } from './aiCost.js';   // 5.03 건8: 하루 한도 이월 한 함수
import { tidyBayAnswer, withRecordPositions } from './gangState.js';   // 4.81: «N번 베이 정리해줘» — 앱 입력 + 터미널 반영 두 자료를 읽는 현황 한 벌(읽기 전용)
import { sizeLenOf, sizeLenKnown } from './tallyReport.js';
import { shipMovePlanOf, shipMoveAnswerOf, spokenTimeMs } from './craneShipMove.js';   // 5.14 호기가 다른 배로 옮김 — 판정·답 한 벌   // ★ 일괄수리(2026-11-10): 규격 길이 한 벌 — utils 가 이미 tallyReport 를 부르므로 번들에 베이사전 같은 큰 것이 새로 딸려 오지 않는다(mir-core +1.5KB 실측)
import { isLoloShipByPolicy } from './shipPolicyCore.js';   // 4.40: 덱플랜 배(RZOR)는 자동 가이드가 없다 — 화면(VoyagePage isLoloShip)과 같은 판정, 파이어베이스 없는 본체만
import { tmoSignal } from './fetchTimeout.js';   // 4.56-01: 응답 없으면 끊는다
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
const BARE_COUNT_RE = /몇\s*(?:대|개|척|건)|대수|수량|물량|총\s*몇|합계|총계/;   // ★ 5.28-02 부름 + 대수 물음은 인사가 아니다
const STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요']);
const SLOT_RE = { ship: /^[A-Z]{4}$/, cn: /^[A-Z]{4}\d{7}$/, n: /^\d+$/ };

// 4.44: RZOR 덱플랜 학습 현황을 묻는 말(수석 통계) — «RZOR 학습 현황» · «덱플랜 학습 어때» · «리자오 채점 결과». 홈 통합검색·미르 시트가 같은 식으로 1회 읽는다.
export const RZOR_LEARN_RE = /(?:RZOR|리자오|일조|덱\s*플랜).{0,12}(?:학습|채점)|(?:학습|채점).{0,12}(?:RZOR|리자오|일조|덱\s*플랜)/i;   // 4.44 감사: 배·덱플랜 닻이 꼭 있어야 한다 — «미르 학습 어때»·«채점 결과»(미르 자체 학습 질문)는 가로채지 않는다

export function mirTokens(q) {
  //  ⚠ RTDB 키 금지 문자(. # $ / [ ])도 여기서 지운다 — 감사 지적: 폰 키와 저장 키가 다르면 배운 것이 다음 구독에 사라진다.
  return String(q || '').toUpperCase().replace(/[?？!.,~·…()\[\]"'«»#$/]/g, ' ').trim().split(/\s+/).filter(Boolean)
    .filter((t) => !STOP.has(t)).map((t) => (t.length > 1 ? (t.replace(PARTICLE, '') || t) : t));
}
/** ★ 5.28-05 — 토씨를 떼지 않은 낱말. 별칭의 «되쓸 말»(to)은 이것으로 적는다 — 토씨 떼기가 «베이»→«베» · «온도»→«온» · «엑스레이»→«엑스레» 로 잘라 되쓴 말이 엉뚱한 답으로 갔다(2026-11-27 클로드2 시험). */
export function mirTokensRaw(q) {
  return String(q || '').toUpperCase().replace(/[?？!.,~·…()\[\]"'«»#$/]/g, ' ').trim().split(/\s+/).filter(Boolean).filter((t) => !STOP.has(t));
}
/** ★ 5.28-05 — 말의 거르기 조건 도장(규격·적공·종류·베이·항구·갑판/홀드·위험물 등급·온도·무게·끝 번호·양하/선적). 별칭은 원문의 조건을 하나도 잃으면 안 된다. */
const _COND_KEYS = ['digits', 'size', 'fe', 'type', 'bay', 'pol', 'pod', 'zone', 'dgClass', 'un', 'temp', 'weightMin', 'weightMax', 'mode'];
let _sigDepth = 0;   // 조건 도장을 재는 동안에는 사전 되쓰기를 하지 않는다(parseNaturalQuery → mirRewrite → mirCondSig 돌림 막기)
export function mirCondSig(q) {
  let p = null; _sigDepth += 1; try { p = parseNaturalQuery(String(q || '')); } catch (e) { console.warn('[미르 학습] 조건 도장 읽기 실패 — 조건을 잃은 것으로 본다:', e); return null; } finally { _sigDepth -= 1; }
  const o = {};
  for (const k of _COND_KEYS) { const v = p && p[k]; if (v === null || v === undefined || v === '' || v === false) continue; o[k] = String(v); }
  return o;
}
/** 원문 조건 중 되쓴 말에서 빠지거나 바뀐 것 — 없으면 빈 배열. */
export function mirCondLost(from, to) {
  const a = mirCondSig(from), b = mirCondSig(to);
  if (!a || !b) return ['?'];   // 읽지 못하면 막는 쪽(감사 하 — 빈 도장이면 별칭이 그대로 통과했다)
  //  컨 번호로 한 대를 가리킨 말은 번호만 지키면 된다(«끝자리 6627 리퍼 몇 도» → «6627 온도» — 리퍼·양하 같은 거르기는 그 한 대에 이미 들어 있다).
  if (a.digits && b.digits && String(b.digits).slice(-4) === String(a.digits).slice(-4)) return [];
  return Object.keys(a).filter((k) => b[k] !== a[k]);
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
  if (_sigDepth) return null;
  const k = mirKey(q);
  if (!k) return null;
  const e = _lex()[k];
  if (!e || e.kind !== 'alias' || !e.to) return null;
  const sl = _slotsOf(q);
  //  ★ 5.28-05 — 되쓸 말은 토씨를 떼지 않은 원래 말(ok)로 만든다(예전 별칭의 to 는 «베»·«온» 처럼 잘려 있다). 슬롯 수가 다르면 예전 to 를 쓴다.
  let tpl = String(e.to);
  if (e.ok) { const t2 = mirTokensRaw(e.ok).map(mirSlot).join(' '); if ((t2.match(/\{(?:ship|cn|n)\}/g) || []).length === (tpl.match(/\{(?:ship|cn|n)\}/g) || []).length) tpl = t2; }
  let i = 0;
  const out = tpl.replace(/\{(ship|cn|n)\}/g, () => sl[i++] || '').trim();
  if (!out) return null;
  //  ★ 5.28-05 — 원문의 거르기 조건(40피트·영하 18도·14번 베이…)을 잃는 별칭은 쓰지 않는다(그대로 읽는 편이 맞다).
  const lost = mirCondLost(q, out);
  if (lost.length) { console.warn('[미르 학습] 조건을 잃는 별칭이라 안 씀 — ' + lost.join('·') + ' «' + String(q).slice(0, 40) + '» → «' + out.slice(0, 40) + '»'); return null; }
  return out;
}
/** 5.14 — 그 말의 별칭이 자동으로 배운 것(auto — 모델 번역 · 같은 폰의 이어진 말 즉석 학습)인가. 사람·클로드가 결산으로 적은 별칭은 auto 가 아니다. 기록을 남기는 말은 이런 별칭으로 되쓰지 않는다(nlSearch). */
export function mirRewriteIsAuto(q) {
  const k = mirKey(q);
  const e = k ? _lex()[k] : null;
  return !!(e && e.kind === 'alias' && (e.auto || e.src === 'model'));
}
/** 5.14 — 기록을 남기는 말인가(시작 시각·호기 검수원·갱 수·호기 이동·작업 중단·작업보고). 번역·자동 별칭으로는 이런 말을 적지 않는다. */
export function isWriteParse(p) {
  return !!(p && (p.startSet || p.crewSet || p.gangSet || p.moveSet || p.pauseSet || p.workRep));
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
  if (!mirLearnAlias(p.q, text, meta.who || '')) return '';   // 4.86-02: 거름에 걸리면 배우지 않았으니 «배웠어요» 도 말하지 않는다
  return `(«${p.q}»는 «${text}» 뜻으로 배웠어요 — 다음엔 바로 답할게요)`;
}
/** 4.86-02: 자동으로 배우면 안 되는 별칭이면 이유(문장)를, 괜찮으면 '' 를 돌려준다. 순수 판정 — 부수 효과 없음.
    ① 슬롯({ship}·{cn}·{n})을 뺀 글자가 2자 미만인 키 — 2026-10-15 «{ship}» 만 남는 키가 배 이름만 친 말을 전부 한 인텐트로 보냈다.
    ② 시각을 묻는 말(몇 시·언제)이 원문과 번역 한쪽에만 있다 — 2026-10-16·17 시각을 묻는 말이 남은 대수 답으로 가는 별칭이 생겼다. */
const TIME_ASK_RE = /몇\s*시|언제/;
export function mirAutoAliasReject(from, to) {
  const rest = mirKey(from).replace(/\{(?:ship|cn|n)\}/g, '').replace(/\s+/g, '');
  if (rest.length < 2) return '슬롯을 뺀 글자가 2자 미만인 키';
  if (TIME_ASK_RE.test(String(from)) !== TIME_ASK_RE.test(String(to))) return '시각을 묻는 말이 한쪽에만 있는 짝';
  const lost = mirCondLost(from, to);   // ★ 5.28-05: «이번 배 40피트 양하 총 몇 대» → «양하 몇 대» 처럼 조건을 잃는 짝(40피트 135 대신 318)
  if (lost.length) return '원문의 조건(' + lost.join('·') + ')을 잃는 짝';
  return '';
}
/** ★ 3.42 — 별칭 한 벌: «from(못 알아들은 말)» 을 «to(미르가 아는 말)» 로 사전에 적는다. 즉석 학습(위)과 모델 번역(mirModel)이 같은 모양으로 쓴다.
    이 폰 메모리(window.__mirLexicon)에 바로 넣고, 쓰기 손(window.__mirLexiconWrite — App 이 fbWriteMirLexicon 을 건다)이 있으면 보관소에도 적는다.
    돌려주는 값은 사전 키(없으면 null). */
export function mirLearnAlias(from, to, by = '', extra = {}) {
  const key = mirKey(from);
  if (!key || !to) return null;
  if (isHiddenStaff(by) || isTester(by)) { console.warn('[미르 학습] 테스터 말은 익히지 않음 — ' + by); return null; }   // ★ 5.28-05 검수사 «테스터는 익히지 않음»
  const bad = mirAutoAliasReject(from, to);   // 4.86-02: 모델·즉석으로 배우는 별칭(auto)의 거름 — 슬롯만 있는 키 · 시각을 묻는 말과 다른 뜻
  if (bad) { console.warn('[미르 학습] 별칭 거절 — ' + bad + ' «' + String(from).slice(0, 40) + '» → «' + String(to).slice(0, 40) + '»'); return null; }
  const now = Date.now();
  const entry = { kind: 'alias', from: String(from), to: mirTokensRaw(to).map(mirSlot).join(' '), ok: String(to), by: by || '', at: now, auto: true, hits: 0, ...extra };
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
  //  4.77-01: «이» 피동·사동 풀이말(쌓이다·섞이다·놓이다·묶이다·덮이다·보이다·쓰이다·붙이다)의 «…입니다» 는 이름씨+입니다 가 아니다 — «쌓입니다»→«쌓여요» (예전엔 «쌓이에요» 로 틀렸다).
  [new RegExp('(쌓|섞|놓|묶|덮|움직)입니다' + END, 'g'), '$1여요'],   // 4.77-01: 매뉴얼 전수 점검에서 «움직입니다»→«움직이에요» 가 더 나왔다
  [new RegExp('(?<![가-힣])(보|쓰|붙)입니다' + END, 'g'), '$1여요'],
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

const MIR_SURNAMES = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부황가갈강구금나독동라마만목묵반배변복빈상서석선소손승시양어엄여오옥왕용원은음이인장전제조좌주지진채천초최추탁태판편표하한함허현호홍화황'+'.';
// ── 호칭 — 로그인 이름에서 성을 떼고 «성호 아저씨»처럼(검수사 지시). 이름 없으면 «검수사님».
function mirCall(kind) {
  const full = (_storage.get(SK.activeInspector) || '').trim();
  if (!full) return '검수사님';
  //  4.35-01: 첫 글자가 실제 성씨일 때만 성을 뗀다 — «클로드» 가 «로드 아저씨» 로 불리던 것(라이브 실측 2026-10-19). 성씨 밖 이름은 통째로 부른다.
  const given = (full.length >= 3 && MIR_SURNAMES.includes(full[0])) ? full.slice(-2) : full;
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
const WORK = /\d{4,}|[A-Z]{4}\s?\d{7}|베이|리퍼|양하|선적|컨테이너|위험물|온도|씰|실번|엠티|풀|피트|홀드|데크|브리핑|출항|입항|도선|크레인|해치|시프팅|엑스레이|x-?ray|검수|항차|터미널|명단|리스트|덱\s*플랜/i;   // 4.44: 덱플랜은 일 이야기. RZOR 학습·채점 질문은 아래에서 RZOR_LEARN_RE 로 물러선다(«학습»·«채점» 낱말만으로는 잡담을 막지 않는다 — 감사 경①)

export function mirSmallTalk(q) {
  const d = String(q || '').trim();
  if (d.length < 2) return null;
  // 실측(«미르야 검수 해봤어?») — 미르 호명 + 경험 질문은 업무 단어가 섞여도 받아준다.
  if (/미르/.test(d) && /(해\s*봤어|해본\s*적|할\s*줄\s*알아)/.test(d))
    return '당연하죠! 매일 검수사님들 옆에서 컨테이너 번호 맞춰보는 게 제 일인걸요 😼 야드에서 눈으로 배운 검수 경력 3년이에요. 그래도 실번호 확인은 ' + mirCall() + ' 손끝이 제일 정확해요!';
  if (WORK.test(d) || RZOR_LEARN_RE.test(d)) return null;   // 4.44: «미르야 RZOR 학습 채점 어때» 는 잡담이 아니다
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
//  4.16: 펼치기마다 항차별 시프팅 분리 — computeShiftingMapCached 가 내용 서명으로 캐시하므로 여기서는 한 번 부르기만 한다.
function _shiftSplitCached(vKey, v) {
  try { return shiftSplitOf(vKey, v); } catch (e) { console.warn('[미르] 시프팅 분리 실패 — 시프팅 없이 셉니다:', e); return { set: new Set(), n: 0, offPtk: () => false }; }
}
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
      //  ★ 4.16 (§7.8-① «양하리스트와 분리 시프팅 리스트 별도 관리»): 시프팅 컨은 평택분(_ptk)이 아니다 — 문지기 한 벌(utils.shiftSplitOf · isShiftOffPtk).
      //    종전엔 «리스트에 기록이 있으면 평택분» 이라 시프팅 재선적 자리 기록이 생기면 미르 «선적 몇 대» 가 293 → 298 로 샜다(MCAP 639N).
      //    선사 리스트에 실려 온 시프팅은 평택분에도 남는다(Fable 판정 ⑤). 시프팅 행에는 _shift(내림 out · 실음 in)를 찍는다 — 미르 시프팅 집합이 읽는다.
      const _shSp = _shiftSplitCached(vKey, v);
      //  ★ 4.20 (Fable 판정 ④ · 검수사 2026-10-10 00:02 «기본은 세관»): 양하 평택분 = ptkDischargeUnitsOf 한 벌(세관 목록 + 추가분). 목록이 없는 배(basis 'edi')는 종전 POD 판정.
      const _U = mode === 'discharge' ? ptkDischargeUnitsOf(v, _shSp.set) : null;   // 4.20 감사: 시프팅은 이 펼치기와 같은 집합으로 뺀다
      const _useU = !!(_U && _U.basis !== 'edi');
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
        if (_ebM && _ebM.sl) safeR.slEdi = String(_ebM.sl);   // 4.49 감사(중-2): EDI 실은 «다른 자료 실»로(항차 화면·작업 목록 병합과 같은 칸 — 미르·홈 실오류·양하신고·인계가 같은 답)
        if (_ebM && r.iso_pick) safeR.oog = isoPickOog(r, _ebM.oog);   // 4.15 (§7.8-⑨ Fable 판정): 검수사가 고른 규격이면 규격초과(oog) 표식도 고른 규격을 따른다(utils.isoPickOog 한 벌 — 드라이로 골랐으면 OT·FR·규격초과 없음)
        merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR, _src: merged[r.cn] ? 'both' : 'list' };
      });
      //  4.20: 유닛인데 EDI·리스트 어디에도 행이 없는 컨(완료 기록·터미널 실적만 있는 추가분)도 행으로 — 미르 대수가 마감텔리·갱별·홈 카드와 같은 수가 된다.
      if (_useU) for (const cn of _U.set) if (!merged[cn]) merged[cn] = { ...dischargeUnitBareRow(v, cn), _src: 'unit' };
      //  ★ 3.70-01 — 특수제작컨·수화물 표시 입구(utils.applySpecialMarks 한 벌). 떠 있는 미르·홈 통합검색·홈에서 여는 컨 상세가
      //    이 목록을 쓴다 — 안 찍으면 수화물 리퍼가 «세팅 온도 기록 없음» 으로 답했다(감사 실측, 항차 화면과 답이 갈림).
      applySpecialMarks(v, Object.values(merged)).forEach((c) => {
        if (!c.cn) return;
        arr.push({
          ...(_useU ? markDischargeUnit(c, _U) : c),   // 4.20: 추가분(_extraOfList)·통과(_ediTransit) 표식
          /* 1.55-03: 실체 위치 승격 — 창고(__)는 제외. */
          ...((c.bay_actual && c.row_actual && c.tier_actual && !String(c.bay_actual).startsWith('__')) ? { bay: c.bay_actual, row: c.row_actual, tier: c.tier_actual }
            /* ★ 4.23-01 2차: «정해 준 자리»(3.13 맞교환·검수원 지정)도 실체 다음으로 — 항차 화면·자동 가이드·베이 그림(effectivePos)과 같은 차례.
                 종전엔 미르 «6242 어디» 가 계획 칸(30-03-86)을, 가이드는 맞교환 자리를 말했다(2차 시뮬). 계획은 _bay_planned 로 남긴다. 창고 표식(__)·실린 컨은 안 건드린다. */
            : (c.bay_assign && c.row_assign && c.tier_assign && !String(c.bay_assign).startsWith('__') && !String(c.bay_actual || '').startsWith('__'))
              ? { bay: c.bay_assign, row: c.row_assign, tier: c.tier_assign, _bay_planned: c.bay, _row_planned: c.row, _tier_planned: c.tier }
              : {}),
          voyageKey: vKey,
          vsl: v.info.vsl,
          voy: v.info.voy,
          mode,
          _mode: mode,
          _ptk: (mode === 'discharge' ? (_useU ? _U.set.has(c.cn) : isPyeongtaekPort(c.pod)) : isPtk({ ...c, _inList: !!recMap[c.cn] }, mode)) && !_shSp.offPtk(mode, c.cn),   // 4.20: 양하는 유닛 한 벌(세관 «최종항» 이 아니라 등재 여부)
          ...(_shSp.set.has(c.cn) ? { _shift: mode === 'discharge' ? 'out' : 'in' } : {}),
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
//  ★ 4.16 (§7.8-① · Fable 판정 ④): byMode(양하·선적) = **평택분만**. 시프팅은 대당 2무브(내림 + 실음)로 total·done 에만 더한다 —
//    «얼마나 남았어»·«언제 끝나»·예상 시간 분모 = 양하 평택 + 선적 평택 + 2×시프팅이고 **리스트 유무와 무관**하다(종전엔 리스트 있는 모드만 시프팅을 셌다 — 두 갈래).
//    shift = { n, moves:{ total, done } }. 완료 시각(doneAts)에는 시프팅 내림·실음 완료도 든다(페이스가 같은 분모로 잰다).
export function voyageCountsOf(voyage, fallbackContainers = null, shiftSet = null) {
  const out = { total: 0, done: 0, byMode: { discharge: { total: 0, done: 0 }, loading: { total: 0, done: 0 } }, doneAts: [], cns: { discharge: [], loading: [] }, shift: { n: 0, moves: { total: 0, done: 0 } } };   // 4.01: cns = 센 컨 번호(트윈 쌍 판정용)
  const has = (m, k) => !!(voyage && voyage[m] && voyage[m][k] && Object.keys(voyage[m][k]).length);
  const ss = shiftSet instanceof Set ? shiftSet : new Set(Array.isArray(shiftSet) ? shiftSet : []);
  const listOf = {};
  for (const m of ['discharge', 'loading']) {
    try {
      const recs = (voyage && voyage[m] && voyage[m].records) || {};
      const l = new Set(ownDirCns(recs, m).filter((cn) => isListOriginRecord(recs[cn])));
      listOf[m] = l.size > 0 ? l : null;
      //  ★ 4.20 (Fable 판정 ④): 양하 분모 = 평택 양하분 한 벌(세관 목록 + 추가분 — 홈 카드 progressOf·마감텔리·갱별과 같은 집합). 원본에 EDI 가 없으면(콘앱) 넘겨받은 양하 행을 EDI 로 본다.
      if (m === 'discharge' && listOf[m]) {
        const dSec = (voyage && voyage.discharge) || {};
        const ownE = dSec.ediContainers && Object.keys(dSec.ediContainers).length ? dSec.ediContainers : null;
        const giv = Array.isArray(fallbackContainers) ? fallbackContainers.filter((x) => x && x.cn && (x._mode || 'discharge') === 'discharge') : [];
        const U = ptkDischargeUnitsOf({ discharge: { ...dSec, ediContainers: ownE || Object.fromEntries(giv.map((x) => [x.cn, x])) }, keepOnboard: voyage && voyage.keepOnboard }, ss);   // 4.20 감사: 이 분모의 시프팅 집합으로 · 4.48 감사(상 2): 본선 잔류를 같이(잔여·무브수가 317 로 셌다)
        if (U.basis !== 'edi') listOf[m] = U.set;
      }
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
    const recs = (voyage[md] && voyage[md].records) || {};
    //  4.16: 리스트 컨 = 평택분(선사 리스트에 실려 온 시프팅도 — Fable 판정 ⑤). 시프팅은 아래에서 따로 2무브로.
    const base = new Set([...listOf[md]].filter((cn) => !isShiftOffPtk(ss, recs, md, cn)));
    const m = out.byMode[md];
    for (const cn of base) { m.total += 1; out.total += 1; out.cns[md].push(cn); if (comp[cn]) { m.done += 1; out.done += 1; pushAt(comp[cn]); } }
  }
  for (const c of pool) {
    const md = c._mode === 'loading' ? 'loading' : 'discharge';
    if (voyage && voyage.info && sideCancelled(voyage.info, md)) continue;
    if (listModes.has(md)) continue;   // 3.60-18: 리스트가 있는 모드는 위에서 셌다
    if (c.cn && isShiftOffPtk(ss, (voyage && voyage[md] && voyage[md].records) || {}, md, c.cn)) continue;   // 4.16: 시프팅은 아래에서 따로
    const m = out.byMode[md];
    m.total += 1; out.total += 1; out.cns[md].push(c.cn);
    if (c._comp) { m.done += 1; out.done += 1; pushAt(c._comp); }
  }
  //  4.16: 시프팅 — 대당 2무브(양하 때 내림 1 + 선적 때 실음 1). 완료는 각 모드 completed(콘앱은 넘겨받은 행의 _comp)로 센다.
  if (ss.size && voyage && voyage.info) {
    const compOf = (md, cn) => {
      const w = voyage[md] && voyage[md].completed && voyage[md].completed[cn];
      if (w) return w;
      const g = Array.isArray(fallbackContainers) ? fallbackContainers.find((x) => x && x.cn === cn && (x._mode === 'loading' ? 'loading' : 'discharge') === md && x._comp) : null;
      return g ? g._comp : null;
    };
    out.shift.n = ss.size;
    for (const cn of ss) {
      for (const md of ['discharge', 'loading']) {
        out.shift.moves.total += 1; out.total += 1;
        const w = compOf(md, cn);
        if (w) { out.shift.moves.done += 1; out.done += 1; pushAt(w); }
      }
    }
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
//    대수는 항차 총 대수(voyageCountsOf 한 벌 — 홈 카드 분모와 같은 수)이고, 갱 수 = utils.gangsOfShift(5.00-01) — 지금 조의 `info.gangsShift`(말로 정한 수) → 그 조에 등록된 호기 수(`info.craneCrew`) → 항차 기본 `info.gangs`.
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
  const is20 = (iso) => sizeLenKnown({ iso }) === '20';   // 4.88: 규격 길이 한 벌(자리·중량 짝 — 규격만). 종전 첫 글자 2 만 봤다
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
      //  ★ 4.39-01 (검수사 2026-10-19 22:02~22:05 — ATPR 2646E «무게가 있고 EDI가 있으니 위치도 있습니다» · 화면 «20피트 116대는 자리나 무게를 몰라» 는 거짓):
      //    EDI 총중량이 빈 컨(20피트 116대 wt 0)은 리스트 무게로 잰다 — 화면 병합 행과 같은 모양(wt = 리스트 무게 · wtEdi = EDI 총중량)이라 트윈 판정(twinWtOf: EDI 먼저, 없으면 리스트)이 작업 카드·자동 가이드와 한 벌이 된다.
      if (c) { const _lw = plausibleListWtKg(recs[cn] && recs[cn].wt); cs.push({ ...c, ...ediWtField(c), ...(_lw > 0 ? { wt: _lw } : {}), cn: c.cn || cn, _mode: m }); }
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
  const _G = gangsOfShift(info, now);   // 5.00-01: 갱 수 한 벌 — 말로 정한 수 → 이 조에 등록된 호기 수 → 항차 기본
  const set = _G.n;
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
    shiftN: (vc.shift && vc.shift.n) || 0, shiftMoves: (vc.shift && vc.shift.moves.total) || 0,   // 4.16: 시프팅 대당 2무브(트윈으로 안 든다)
    gangs, gangsKnown, gangsSrc: _G.src, gangsCrew: _G.crew, rate, rateMin, twinShare: vc.total ? (2 * tw.ok) / vc.total : 0, minutes: mins(moves, gangs, rate), minutesMin: mins(movesMin, gangs, rateMin), minutes1: mins(moves, 1, rate), planTotal,
    planGap: planTotal - vc.total > Math.max(20, vc.total * 0.1),
    cns: vc.cns };   // 4.39-01: 센 컨 번호(모드별) — «작업 분석» 이 같은 집합으로 특수화물을 센다(감사 B1)
}

//  ★ 4.39-01 미르 «작업 분석» · «예상 작업 시간(N갱)» — 검수사 2026-10-19 22:02
//    «예상시간까지 들어 가고 갱당 무브수도 알려주고 특수화물 개개별로 안알려줘도 되고 설명을 하자면 20피트 몇대 40피트 몇대 총 몇대이며 리퍼는 20피트2개 40피트 20개
//     FR은 4대 OT는 3대 XRAY는 5대가 있습니다. 트윈 무게를 감안해서 총 무브수는 몇대이고 평균 시간당 무브수는 갱당 25개이고2갱 계산으로 총 몇시간 걸릴것입니다.
//     주의 할점은 FR사진 XRAY 실달기 리퍼온도 체크또는 리스트 받기등이 있습니다» · 22:05 «여기(작업 시작 화면 예상 작업 시간 줄)가 확실했으면 미르에게 분석해달라고 하지 않았을 것입니다».
//    숫자는 한 벌 — 규격·특수화물은 브리핑과 같은 briefCountsOf(평택분 · 채워진 예약 칸 뺌), 무브·시간은 화면 «예상 작업 시간» 줄과 같은 expectedWorkTimeOf(갱당 시간당 25·30 은 4.01 규칙).
const WORK_ANALYSIS_RE = /작업\s*(?:분석|분선)|^\s*(?:미르\s*(?:야|아)?\s*)?(?:분석|분선)\s*(?:해\s*줘|해\s*주세요|좀|해)?\s*[?.!~]*\s*$/;   // «작업 분선해줘» 는 21:47 실제 오타
//  ★ 4.40-01 — «언제·몇 시에 끝나» 처럼 끝나는 시각을 **묻는** 말. etaQuery 는 «끝나» 만 있어도 서므로(«인쇄가 끝나면 …») 강한 답은 이것까지 맞을 때만 준다 —
//    나머지는 종전대로 모르는 낱말이 남으면 모델이 다시 읽는다(검수사 2026-10-20 20:07 «몇시에 끝나 같은 질문을 검수앱과 콘앱에 하면 답변이 틀리게»).
const ETA_ASK_RE = /몇\s*시|언제|퇴근|집에|예상\s*(?:완료|종료|시간)|완료\s*(?:예상|예정|시각|시간)|끝(?:나는|날)\s*(?:시간|시각)|몇\s*시간/;
//    배 작업이 아닌 것의 끝(«쉬는 시간·강풍·인쇄·회의·야드 작업 언제 끝나»)·섞인 말(«… 그리고 리퍼 몇 대야»)·남에게 전하라는 말(«수석한테 알려줘»·«카톡 보내줘»)은
//    강한 답으로 굳히지 않는다 — 종전대로(감사 지적 2026-10-20).
const ETA_OTHER_RE = /쉬는|휴식|점심|식사|밥|강풍|바람|태풍|비\s*(?:가|는|언제|그치)|눈\s*(?:이|은)\s|회의|인쇄|야드|그리고|한테|에게|카톡|문자|보내|전해/;
const EXPECT_TIME_RE = /예상\s*작업\s*시간|작업\s*예상\s*시간/;   // «작업» 이 있어야 한다 — «도선·출항·입항 예상 시간» 은 다른 질문
const _hmK = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`; };
/** 예상 작업 시간 줄들 — gangsHyp(질문 속 «2갱으로») 이 있으면 그 갱 수로, 없으면 화면 줄과 같은 갱 수(조별 → 항차 → 2갱). */
export function workTimeLinesOf(E, gangsHyp = 0) {
  if (!E) return [];
  const g = gangsHyp > 0 ? Math.min(4, Math.max(1, gangsHyp)) : E.gangs;
  const mins = (mv, gg, r) => Math.round((mv / (gg * r)) * 60);
  const L = [];
  const pair = E.posPairs - E.twinLifts > 0 && (E.twinOver || E.twinDiff) ? ` (${[E.twinOver ? `55톤 넘는 ${E.twinOver}쌍` : '', E.twinDiff ? `무게차 큰 ${E.twinDiff}쌍` : ''].filter(Boolean).join(' · ')}은 싱글로 셈)` : '';
  L.push(`· 트윈 ${E.twinLifts}쌍 → 총 ${E.exact ? '' : '최대 '}${E.moves}무브${E.shiftN ? `(시프팅 ${E.shiftN}대 ${E.shiftMoves}무브 포함)` : ''}${pair}`);
  if (!E.exact) L.push(`  ⚠ 20피트 ${E.unres20}대는 자리나 무게가 없어 트윈을 못 정했어요 — 트윈이 되면 ${E.movesMin}무브까지 줄어요`);
  const t = E.exact ? `약 ${_hmK(mins(E.moves, g, E.rate))}` : `약 ${_hmK(mins(E.movesMin, g, E.rateMin))} ~ ${_hmK(mins(E.moves, g, E.rate))}`;
  const t1 = g > 1 ? ` (1갱이면 ${_hmK(mins(E.moves, 1, E.rate))})` : '';
  const why = gangsHyp > 0 ? '' : (!E.gangsKnown ? ' · 갱 수 미등록이라 2갱으로 셈' : E.gangsSrc === 'crew' ? ` · 호기 등록 ${E.gangsCrew}대 → ${E.gangs}갱` : '');   // 5.00-01: 호기 등록으로 셌으면 그 근거를 보인다
  L.push(`· 갱당 시간당 ${E.rate}무브(트윈 ${Math.round(E.twinShare * 100)}%라 ${E.rate === 30 ? '트윈이 있는 작업' : '싱글이 많은 작업'}) · ${g}갱이면 ${t}${t1}${why}`);
  return L;
}
//  4.56: «양하 정확도» — 출발항(POL)별로 EDI 계획 칸과 실제 내려온 순서가 같은 비율. 검수사 2026-10-29 «쉽게 포트별 정확도를 보여주시면 됩니다» · «간단하게 미르에게 양하 정확도를 물어 보면 퍼센트 값을 말하게만».
//   PCTC = 검수사 PDA 입력 순서라 믿을 수 있다 · 동방 = 터미널 시각 순서라 차량 기사 순서에 따라 바뀔 수 있어 참고값. 리퍼·특수화물 순서와 장비 기사 습성이 섞여 EDI 오류율만은 아니다.
const DISCHARGE_ACC_RE = /(?:양하|포트|항구|출발항)\s*(?:별\s*)?(?:정확도|정확률|신빙성|신뢰도)/i;
export function answerDischargeAccuracy(voyage, ship, rows) {
  const A = dischargeAccuracyOf(voyage, rows);
  const info = (voyage && voyage.info) || {};
  const pctc = isPctcVoyage(info);
  const pct = (a, b) => (b ? (Math.round((a / b) * 1000) / 10).toFixed(1) + '%' : '-');
  const head = `📐 ${ship || '이 배'} 양하 정확도 — ${pctc ? '검수사 PDA 입력 순서 기준' : '터미널(동방) 시각 순서 기준 참고값 — 차량 기사 순서에 따라 바뀔 수 있어 확정이 아닙니다'}`;
  if (A.n < 20) return `${head}\n· 같은 열에서 순서를 비교할 수 있는 완료 컨이 ${A.n}대뿐이라 아직 말하기 이릅니다. (완료 ${A.done}대)`;
  const L = [head, `· 전체 ${pct(A.same, A.n)} — 비교 가능 ${A.n}대 중 ${A.diff}대가 EDI 계획과 다른 칸에서 나옴(${A.stacks}개 열) · 완료 ${A.done}대`];
  const big = A.byPol.filter((x) => x.n >= 5).sort((a, b) => (a.diff / a.n) - (b.diff / b.n) || b.n - a.n).reverse();
  const rest = A.byPol.filter((x) => x.n < 5);
  if (big.length >= 2 || (big.length === 1 && rest.length)) {
    L.push('· 출발항별');
    for (const x of big) L.push(`   ${x.pol} ${pct(x.n - x.diff, x.n)} (${x.n}대 중 ${x.diff}대 다름)`);
    if (rest.length) { const rn = rest.reduce((t, x) => t + x.n, 0); const rd = rest.reduce((t, x) => t + x.diff, 0); L.push(`   그 밖 ${rest.length}개 항구 ${pct(rn - rd, rn)} (${rn}대 중 ${rd}대 다름)`); }
  }
  L.push('· 같은 단 안의 바뀜은 시각으로 못 가려 실제는 이보다 낮거나 같습니다. 리퍼·특수화물 순서와 장비 기사 습성이 섞여 있어 EDI 오류율만은 아닙니다.');
  return L.join('\n');
}
/** «작업 분석» 답 — 그 배 평택분 규격·특수화물·트윈 무브·예상 시간·주의.
 *  대수·규격·무브·시간은 E(expectedWorkTimeOf — 화면 «예상 작업 시간» 줄과 같은 집합·같은 수) 하나로, 특수화물은 그 집합(E.cns)에 든 행만 센다(감사 B1 — 숫자끼리 맞게).
 *  rows 는 그 항차 병합 행 전부(검수앱은 항차 원본을 편 것 — 열린 탭과 무관 · 콘앱은 넘겨받은 행). opts.collecting — 선적 자료 수집중이면 무브·시간을 세지 않는다(4.17 한 벌). */
export function answerWorkAnalysis(voyage, ship, rows, E, opts = {}) {
  if (!E || !((E.dis || 0) + (E.lod || 0) > 0)) return null;
  const info = (voyage && voyage.info) || {};
  const sides = []; const K = { rf20: 0, rf40: 0, dg: 0, xr: 0, fr: 0, ot: 0, tk: 0, oog: 0 };
  const SP = [];   // 4.39-02: 예상 실오류(주의 박스와 같은 판정 · 리스트로 센다)
  const noList = [];
  for (const [m, kr] of [['discharge', '양하'], ['loading', '선적']]) {
    const n = m === 'discharge' ? E.dis : E.lod;
    if (!n) continue;
    sides.push(`${kr} ${n}대`);
    const want = new Set((E.cns && E.cns[m]) || []);
    const seen = new Set();
    const _xl = (m === 'discharge' && voyage && voyage.discharge && voyage.discharge.xrayList) || {};   // X-RAY 대상은 항차 X-RAY 목록 한 벌(콘앱 맨 행·리스트 행에는 표식이 없다 — 재감사)
    const arr = (rows || []).filter((x) => x && x.cn && (x._mode === 'loading' ? 'loading' : 'discharge') === m && want.has(x.cn) && !seen.has(x.cn) && seen.add(x.cn)).map((x) => (_xl[x.cn] && !x._xray ? { ...x, _xray: true } : x));
    //  센 컨인데 행이 없는 것(콘앱 행은 자리 있는 EDI 행뿐 — RZOR 선적 EDI 는 자리가 없다)은 그 항차 리스트 행으로 센다(재감사 — 두 앱 특수화물 수가 갈리지 않게)
    const _rec = (voyage && voyage[m] && voyage[m].records) || {};
    for (const cn of want) if (!seen.has(cn) && _rec[cn] && typeof _rec[cn] === 'object') { seen.add(cn); arr.push({ ..._rec[cn], cn, _mode: m, ...(_xl[cn] ? { _xray: true } : {}) }); }
    const B = briefCountsOf(arr);
    for (const c of B.rf) { if (sizeLenOf(c) === '20') K.rf20 += 1; else K.rf40 += 1; }   // 4.88: 규격 길이 한 벌
    K.dg += B.dg.length; K.fr += B.fr.length; K.ot += B.ot.length; K.tk += B.tk.length; K.oog += B.oog.length;
    if (m === 'discharge') K.xr += B.xr.length;
    for (const x of sealPredictOf(arr, (voyage && voyage[m] && voyage[m].records) || null, (voyage && voyage[m] && voyage[m].ediContainers) || null)) SP.push(x);
    const recs = voyage && voyage[m] && voyage[m].records;
    if (!recs || !Object.keys(recs).length) noList.push(kr);
  }
  if (!sides.length) return null;
  const L = [`📊 ${ship || '이 배'}${info.voy ? ` ${info.voy}` : ''} 작업 분석 — ${sides.join(' · ')}${E.done >= (E.units || 0) && E.done > 0 ? ' (작업 끝남 — 아래 시간은 처음부터의 계획값)' : E.done > 0 ? ' (작업 중 — 아래 시간은 처음부터의 계획값)' : ''}`];
  L.push(`· 20피트 ${E.n20}대 · 40피트 ${E.n40}대 · 총 ${E.n20 + E.n40}대${E.shiftN ? ` · 시프팅 ${E.shiftN}대 따로` : ''}`);
  const sp = [];
  if (K.rf20 || K.rf40) sp.push(`리퍼 ${[K.rf20 ? `20피트 ${K.rf20}대` : '', K.rf40 ? `40피트 ${K.rf40}대` : ''].filter(Boolean).join(' · ')}`);
  if (K.fr) sp.push(`FR ${K.fr}대`); if (K.ot) sp.push(`OT ${K.ot}대`); if (K.dg) sp.push(`위험물 ${K.dg}대`); if (K.tk) sp.push(`탱크 ${K.tk}대`); if (K.oog) sp.push(`OOG ${K.oog}대`); if (K.xr) sp.push(`XRAY ${K.xr}대`);
  const none = [!K.fr && 'FR', !K.ot && 'OT', !K.dg && '위험물'].filter(Boolean);
  L.push(`· ${sp.length ? sp.join(' · ') : '특수화물 없음'}${sp.length && none.length ? ` (${none.join('·')} 없음)` : ''}`);
  if (opts.collecting) L.push('· 선적 자료 수집중이라(리스트만 왔고 EDI 는 아직) 무브·예상 시간은 아직 세지 않아요');
  else for (const x of workTimeLinesOf(E, opts.gangsHyp || 0)) L.push(x);
  const warn = [];
  if (K.fr) warn.push(`FR 사진 ${K.fr}대`);
  if (K.xr) warn.push(`XRAY 실 달기 ${K.xr}대`);
  if ((K.rf20 + K.rf40) && !opts.rfSkip) warn.push(`리퍼 온도 체크 ${K.rf20 + K.rf40}대`);
  if (SP.length) warn.push(`예상 실오류 ${SP.length}건(${SP.slice(0, 3).map((x) => `${x.cn.slice(-4)} 「${x.seal}」`).join(', ')}${SP.length > 3 ? ' 등' : ''} — 실물 확인)`);   // 4.39-02 검수사 2026-10-20 «실오류 하나 있었는데 왜 안알려줬어?»   // 감사 B2 — 온도 세부(기준 없음·실물 미확인)는 두 앱 행의 온도 칸이 달라 여기서 세지 않는다(«리퍼» 조회·브리핑이 말한다)
  if (noList.length) warn.push(`${noList.join('·')} 리스트 받기`);
  if (K.dg) warn.push(`위험물 ${K.dg}대 별도 취급`);
  if (warn.length) L.push(`· 주의 — ${warn.join(' · ')}`);
  return L.join('\n');
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
export const WORKING_SHIP_RE = /작업\s*중인?\s*(선박|배)|지금\s*(하는|작업하는|일하는|작업\s*중인)\s*(선박|배)|(우리|이|지금|그)\s*(배|선박)|(?:^|[^가-힣A-Za-z0-9])(?:지금|이번|이|우리)\s*항차(?:은|는|의|이|가)?/;   // 4.37-01: «지금 항차» (검수사 2026-10-19 «지금 항차 작업시간이 얼마나 될꺼 같아?») — 앞이 낱말 경계일 때만(«선박이 항차» 아님) · 단추 문구에서 토씨까지 뺀다
const WORKING_SHIP_ASK_RE = /몇\s*시.{0,4}끝|언제.{0,3}끝|끝날\s*(것|거|까)|얼마나\s*남|몇\s*대\s*남|작업\s*시간.{0,8}얼마나?\s*(?:더\s*)?(?:될|걸리|걸릴|걸려|남)|^\s*(?:(?:작업|일|하역|남은\s*(?:것|거|작업)|나머지)\s*(?:은|는|이|가)?\s*)?(?:앞으로\s*)?얼마나\s*(?:더\s*)?(?:걸려|걸릴|걸리)/;   // 4.37-01: «작업시간이 얼마나 될» · 머리에서 시작하는 «(작업) 얼마나 걸려» — 감사: «작업 시간 몇 시간»(근무 시간)·«서울까지 얼마나 걸려»·과거형 «걸렸어» 는 잡지 않는다
export function workingShipCtx(voyages) {
  const now = Date.now();
  const list = Object.entries(voyages || {}).filter(([, v]) => v && v.info && isWorkingNow(v, now));
  if (!list.length) return null;
  if (list.length === 1) { const [k, v] = list[0]; return { key: k, info: v.info, v, has: !!(v.discharge?.ediContainers || v.loading?.ediContainers), working: true }; }
  return { ambiguous: list.map(([, v]) => String(v.info.vsl || v.info.vslFull || '')).filter(Boolean), working: true };
}

/** 4.35-02 — 배 이름을 못 떠올릴 때 보여 줄 배 코드: 지금 일하는 배 먼저, 그다음 곧 시작할 배(시작 가까운 순). 최대 6. (검수사 2026-10-19 «갑자기 생각이 안날수도 있습니다. 그때 대상들을 보여주면 바로 알수 있습니다») */
export function shipPickCodes(voyages, now = Date.now()) {
  const work = [], wait = [];
  Object.values(voyages || {}).forEach((v) => {
    if (!v || !v.info) return;
    const code = String(v.info.vsl || '').toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) return;
    if (isWorkingNow(v, now)) work.push(code);
    else { const st = _upcomingStartMs(v, now); if (st) wait.push({ code, st }); }
  });
  wait.sort((x, y) => x.st - y.st);
  return [...new Set(work.concat(wait.map((w) => w.code)))].slice(0, 6);
}
//  5.23-04 — 배와 상관없는 일반 물음(«리퍼 컨테이너 검수 주의사항» · «평택항 부두 안내»). 낱말(리퍼·평택)이 조건으로 잡혀도
//    대수·위치·목록을 묻지 않으면 배 이름을 되묻지 않는다 — 아래 지식 답으로, 없으면 null(모델 문)로 간다.
//    종전엔 «어느 배 말씀인지» 로 막고 추천 단추를 눌러도 다시 막혔다(2026-11-25 다른 AI 진단 · 실측 재현).
const GENERAL_KNOW_RE = /주의\s*사항|주의할\s*점|유의\s*사항|안내|요령|방법|절차|규칙|뭐야|무엇|이란|란\s*뭐|설명해/;   // «알려줘» 는 넣지 않는다 — «리퍼 온도 알려줘» 같은 배 조회가 섞인다
const COUNT_ASK_RE = /몇|개수|대수|어디|위치|목록|리스트|명단|남았|끝나|완료|진행|온도|세팅|설정|대상|양하|선적|플랜|베이|출항|입항/;   // 감사: «리퍼 온도 안내»·«X-RAY 대상 무엇»·«평택 양하 안내» 는 배 조회
export function isGeneralKnowAsk(q) {
  const t = String(q == null ? '' : q);
  return GENERAL_KNOW_RE.test(t) && !COUNT_ASK_RE.test(t) && !/\d{4}/.test(t);
}
//  5.23-04: 그 배의 도선 예보 줄(브리핑 출항 시각 한 벌용) — 홈·항차 화면과 같이 선박 코드(info.vsl) 대문자로 찾는다.
const _pfOf = (c, info) => { try { const k = String((info && info.vsl) || '').toUpperCase(); return (k && c && c.pilotForecast && c.pilotForecast[k]) || null; } catch (e) { return null; } };
//  배를 되묻는 답인가 — 엔진 열두 곳·떠 있는 미르 두 곳의 «어느 배 말씀인지»·«배 이름을 붙여»·«… 중 어느 배요?»
const SHIP_ASK_RE = /어느 배 말씀|어느 배요\?|어느 배인지|어느 배의 플랜|배 이름을 붙여\s*(?:주세요|주시면|보세요)|배 이름을 붙이면 그 배(?:만| 브리)|배 이름을 붙여(?:서)?\s*물어/;   // 4.37-01: 모델 답 «배 이름을 붙여서 물어봐 주세요»(생활회화·자료 답 프롬프트 문구)에도 고르기 단추
export const isShipAskText = (t) => SHIP_ASK_RE.test(String(t == null ? '' : t));
/** 배를 되묻는 답 뒤에 붙일 칩 — «OBWH 몇 시에 끝나» 꼴(누르면 그 말 그대로 묻는다). 되묻는 글에 코드들이 있으면(같은 거리 두 배) 그 배들이 먼저. 배가 없으면 []. */
export function shipPickChips(text, rq, voyages, now = Date.now()) {
  const codes = shipPickCodes(voyages, now);
  const am = String(text || '').match(/((?:[A-Z0-9]{2,8}·)*[A-Z0-9]{2,8}) 중 어느 배요/);
  const first = am ? am[1].split('·') : [];
  const all = [...new Set(first.concat(codes))].slice(0, 6);
  //  5.23-04: 질문에 이미 붙은 배 코드는 떼고 붙인다 — «XTPG 평택항 부두 안내» 를 다시 물으면 «XTPG XTPG …» 가 되던 것.
  const _codes = new Set(all.concat(codes).map((x) => String(x).toUpperCase()));
  const base = String(rq || '').replace(WORKING_SHIP_RE, ' ').split(/\s+/).filter((w) => w && !_codes.has(w.toUpperCase())).join(' ').trim() || '브리핑';
  return all.map((c) => `${c} ${base}`);
}

/* ★ 4.40 — 미르가 자동 가이드를 그 베이로 옮긴다(검수사 2026-10-20 18:18·18:19 — 원문은 answerOneRaw 의 규칙 자리).
     묻기만 한다 — «○○ 양하 25번 베이로 옮겨 드릴까요?». 옮기는 것은 화면이 [이동]을 눌렀을 때(mirThreadCommit 이 이 답 글자로 행동을 찾아 단추를 단다 →
     눌린 말 «이동» 을 대화 층이 kind 'act' 로 받는다 → 화면이 guideGoto.mirGotoRequest).
     남은 일은 자동 가이드와 같은 잣대(평택분 또는 시프팅 · 미완 · 자리 있음 — GuidedWorkPanel remaining)로 센다. 열린 탭과 무관하게 항차 원본을 편 행(flattenVoyages)으로.
     모드 — 지금 화면 모드에 그 베이 일이 남았으면 그 모드, 아니면 다른 모드. 화면 모드가 없으면(홈) 양하 먼저. */
const _gotoActs = new Map();   // 답 글자 → { type:'guideGoto', voyageKey, mode, bay } (최근 20개)
export function mirGotoActOf(text) {
  const t = String(text == null ? '' : text);
  if (_gotoActs.has(t)) return _gotoActs.get(t);
  for (const [k, a] of _gotoActs) if (t.startsWith(k)) return a;   // 엔진이 뒤에 한 줄을 붙인 답(«OBWH 로 답했어요» — 선박코드 고치기)
  return null;
}
//  «그 베이로 옮겨 달라» 는 말인가 — 판정 한 벌(엔진 규칙 answerOneRaw 와 미르의 눈 mirSee 가 같이 쓴다 · §4-4). 베이 번호·끝 네 자리·앱은 부르는 쪽이 본다.
//    ① «N번 베이부터·먼저 / N번 베이로 바꾸·넘어가» + «어떻게·바꾸·하려면·해야» (4.39-02 실입력 «25번베이부터 해야 되는데 어떻게 바꾸지?»)
//    ② 시키는 말로 끝나는 것만 — «N번 베이로 바꿔(줘)·바꾸자·옮겨 줘» · «N번 베이부터·먼저 하자·할게·할래·해 줘·할까(요) · 작업(하자·할까) · 작업 시작»
//       («N번 베이로 넘어가자·넘어가 줘·가자·이동» 은 플랜 명령(planCommand «가자·가 줘·이동»)이 엔진보다 먼저 받아 베이플랜을 연다 — 판정이 두 벌로 겹치지 않게 여기서는 안 받는다 · 2차 시뮬)
//    컨 옮기기(«컨·위치·자리» — 4.39-02 감사 C1)·자료 질문(몇 대·남았·언제·리퍼 …)·플랜(«플랜·그림·보여·열어»)·지난 일·남의 일(«시작했어?·작업 중이야?·이유·맞아?·누구·
//    순서·전해 줘·리스트·하래·다른 갱») 은 아니다(4.40 감사 — 끝말을 안 묶었더니 상태 질문 273꼴이 «옮겨 드릴까요?» 강한 답이 됐다). «N번 베이로 옮기려면 어떻게 해» 도 컨 자리 옮기기일 수 있어 아니다.
//    «실» 은 실번호 뜻만 뺀다 — «실어야·실으려면»(싣다)은 선적 말이다.
const _GOTO_A1 = /베이\s*(?:부터|먼저)|부터\s*(?:해야|하려|할|시작)|먼저\s*(?:해야|하려|할)|베이로\s*(?:바꾸|바꿀|넘어가)/;
const _GOTO_A2 = /어떻게|바꾸|바꿔|바꿀|하려면|해야\s*(?:돼|되|하)/;
const _GOTO_B = /(?:베이로\s*(?:바꿔\s*(?:줘|주세요|줄래|봐)?|바꾸자|바꿀래|옮겨\s*(?:줘|주세요|줄래|주라))|베이\s*(?:부터|먼저)\s*(?:하자|할게|할께|할래|합시다|해\s*줘|할까요?|(?:작업|시작|양하|선적)\s*(?:하자|할게|할께|할래|합시다|해\s*줘|할까요?|시작)?))\s*[?？.!~]*$/;
const _GOTO_NOT = /몇\s*(?:대|개)|남았|끝나|언제|무게|리퍼|온도|엑스레이|위험물|컨|위치|자리|해치|커버|트윈|실(?!어|으)|씰|봉인|사진|보고|콘|라싱|시간|걸려|걸리|플랜|그림|보여|열어|했어|했나|했지|했잖|하자고|중이|중인|이유|왜|맞아|맞나|맞지|누구|순서|전해|리스트|목록|하래|하라|소리|끝내|끝났|됐어|해도\s*(?:돼|되)|돼도|어디|뭐야|뭔데|내일|아까|어제|시작해\s*[?？.!~]*$|다른\s*(?:갱|호기)|호기(?:가|는|도)\s/;
export function isGuideGotoAsk(q) {
  const Q = String(q == null ? '' : q);
  return ((_GOTO_A1.test(Q) && _GOTO_A2.test(Q)) || _GOTO_B.test(Q)) && !_GOTO_NOT.test(Q);
}
//  말에 든 모드(«선적 1번 베이부터 하자» · «25번 베이부터 실어야») — 없으면 null(화면 모드로 고른다)
const _modeSaid = (q) => (/선적|싣|실어|실으|적하|로딩/.test(String(q || '')) ? 'loading' : /양하|내리|내려|내림/.test(String(q || '')) ? 'discharge' : null);
export function guideGotoAnswerOf(c, bay, q = '') {
  const v = (c && c.voyage) || null;
  const vk = (c && c.voyageKey) || '';
  if (!v || !vk) return { text: `${bay}번 베이로 옮겨 드리려면 배를 알아야 해요 — 어느 배 말씀인지 배 이름을 붙여 주세요.`, act: null, shipAsk: true };
  let rows = [];
  try { rows = flattenVoyages({ [vk]: v }); } catch (e) { console.warn('[미르 4.40] 항차 펴기 실패:', e); rows = []; }
  const posd = rows.filter((x) => x && x.bay && x.row && x.tier && !String(x.bay).startsWith('__'));
  const ship = S((c && (c.vsl || (c.info && c.info.vsl))) || (v.info && v.info.vsl)).toUpperCase();
  const sp = ship ? `${ship} ` : '';
  //  덱플랜 배(선박 정책 lolo — RZOR)는 자동 가이드가 없다(VoyagePage isLoloShip 과 같은 판정 — 화면이 실어 준 값이 먼저, 없으면 기본 정책). 좌표가 있어도 묻지 않는다(4.40 감사 중-2 — R082E 191/191 좌표).
  const _lolo = (c && c.isLoloShip === true) || isLoloShipByPolicy(S((c && c.info && c.info.vsl) || (v.info && v.info.vsl)), {}, [(v.info || {}).voy, (v.info || {}).voyage, (v.info || {}).callsign].filter(Boolean));
  if (_lolo || !posd.length) return { text: `${sp}이 배는 ${_lolo ? '덱플랜 배' : '베이 자리(셀 좌표)가 없는 배'}라 자동 가이드가 없어요 — 베이로 옮길 수 없어요.`, act: null };
  if (!posd.some((x) => parseInt(x.bay, 10) === bay)) return { text: `${sp}${bay}번 베이는 이 배 자료에 없어요. 베이 번호를 다시 불러 주세요.`, act: null };
  const left = (m) => posd.filter((x) => x._mode === m && (x._ptk || x._shift) && !x._comp && parseInt(x.bay, 10) === bay);
  //  그 베이는 끝났어도 같은 장(해치 묶음)에 남은 일이 있으면 장으로 옮긴다 — «24번 베이부터 작업하자»(40피트 베이 = 장 가운데) 에 «다 끝났어요» 라던 것(4.40 감사 — 2.51 미르의 눈은 장으로 받았다).
  //    장 묶음은 화면(GuidedWorkPanel)과 같은 한 벌 — 그 모드 작업분으로 짝을 세우고(getBayPairs) bayGroupCenter 로 묶는다.
  const _inf = (v && v.info) || {};
  const _pairsM = {};
  const _pairsOf = (m) => { if (!(m in _pairsM)) { try { _pairsM[m] = getBayPairs(posd.filter((x) => x._mode === m && (x._ptk || x._shift)), S(_inf.imo), S(_inf.vsl)); } catch (e) { _pairsM[m] = null; } } return _pairsM[m]; };
  const _cen = (b, m) => { try { return bayGroupCenter(String(b), _pairsOf(m)); } catch (e) { return null; } };
  const leftG = (m) => { const myC = _cen(bay, m); return myC == null ? [] : posd.filter((x) => x._mode === m && (x._ptk || x._shift) && !x._comp && _cen(x.bay, m) === myC); };
  const has = (m) => left(m).length > 0 || leftG(m).length > 0;
  //  말에 모드가 있으면 그 모드만(4.40 감사 중-1 — «선적 1번 베이부터 하자» 를 양하로 옮기던 것). 그 모드에 남은 일이 없으면 그렇게 말한다.
  const said = _modeSaid(q);
  if (said && !has(said)) {
    const ot = said === 'loading' ? 'discharge' : 'loading', on = left(ot).length || leftG(ot).length;
    const sk = said === 'loading' ? '선적' : '양하', ok = ot === 'loading' ? '선적' : '양하';
    return { text: `${sp}${bay}번 베이는 ${sk} 남은 작업이 없어요${on ? ` — ${ot === 'loading' ? '선적은' : '양하는'} 남은 ${on}대예요(«${ok} ${bay}번 베이부터 하자» 하시면 옮겨 드릴게요)` : ''}.`, act: null };
  }
  const cur = said || (c.mode === 'loading' || c.mode === 'discharge' ? c.mode : null);
  const order = cur ? [cur, cur === 'loading' ? 'discharge' : 'loading'] : ['discharge', 'loading'];
  const m = order.find(has);   // 말한 모드 → 화면 모드 → 다른 모드 차례(그 모드 안에서는 그 베이 → 같은 장)
  if (!m) return { text: `${sp}${bay}번 베이는 양하·선적 남은 작업이 없어요(다 끝났어요).`, act: null };
  const L = left(m);
  if (!L.length) {   // 그 베이는 끝났고 장에 남은 일만
    const G = leftG(m), gdk = G.filter((x) => parseInt(x.tier, 10) >= 80).length, ghd = G.length - gdk;
    const myC = _cen(bay, m);
    const lbl = [...new Set(posd.filter((x) => x._mode === m && (x._ptk || x._shift) && _cen(x.bay, m) === myC).map((x) => parseInt(x.bay, 10)).filter(Number.isFinite))].sort((x, y) => x - y).join('·');
    const kr0 = m === 'loading' ? '선적' : '양하';
    const text0 = `📍 ${sp}${kr0} ${bay}번 베이 장(B${lbl})으로 옮겨 드릴까요?\n`
      + `   ${bay}번 베이는 ${posd.some((x) => x._mode === m && (x._ptk || x._shift) && parseInt(x.bay, 10) === bay) ? '끝났고' : `${kr0} 일이 없고`} 이 장에 남은 ${G.length}대(${[gdk ? `데크 ${gdk}` : '', ghd ? `홀드 ${ghd}` : ''].filter(Boolean).join(' · ')}) — [이동]을 누르면 자동 가이드가 이 장으로 가서 장 순서대로 카드를 놓아요.`;
    const act0 = { type: 'guideGoto', voyageKey: vk, mode: m, bay };
    _gotoActs.set(text0, act0);
    if (_gotoActs.size > 20) _gotoActs.delete(_gotoActs.keys().next().value);
    return { text: text0, act: act0 };
  }
  const dk = L.filter((x) => parseInt(x.tier, 10) >= 80).length;
  const hd = L.length - dk;
  const kr = m === 'loading' ? '선적' : '양하';
  const _had = cur && posd.some((x) => x._mode === cur && (x._ptk || x._shift) && parseInt(x.bay, 10) === bay);
  const other = cur && m !== cur ? ` (${cur === 'loading' ? '선적은' : '양하는'} ${bay}번 베이 ${_had ? '작업이 끝났어요' : '작업이 없어요'})` : '';
  const text = `📍 ${sp}${kr} ${bay}번 베이로 옮겨 드릴까요?${other}\n`
    + `   ${bay}번 베이 남은 ${L.length}대(${[dk ? `데크 ${dk}` : '', hd ? `홀드 ${hd}` : ''].filter(Boolean).join(' · ')}) — [이동]을 누르면 자동 가이드가 이 베이가 든 장으로 가서 ${bay}번 베이 카드를 맨 앞에 놓아요(남은 쌍은 한 대씩).`;
  const act = { type: 'guideGoto', voyageKey: vk, mode: m, bay };
  _gotoActs.set(text, act);
  if (_gotoActs.size > 20) _gotoActs.delete(_gotoActs.keys().next().value);
  return { text, act };
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
    //  4.35-01: 배 이름 없이 «몇 시에 끝나»·«얼마나 남았어»·«브리핑» 을 물었고 지금 일하는 배가 **한 척뿐**이면 그 배로 답한다(여럿이면 종전대로 되묻는다).
    if (WORKING_SHIP_RE.test(String(query || '')) || WORKING_SHIP_ASK_RE.test(String(query || '')) || isBayTidyAsk(query)) { const w = workingShipCtx(voyages); return (w && w.key) ? w : null; }
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
    //  ★ 4.17 (검수사 §7.8-⑧ «2») — 배 코드 꼴(영문 네 글자)은 utils.shipCodeFixOf(→ nearestShipCode) 한 벌로 고른다 — 거리 1~2(자리바꿈 포함) 안에서 가장 가까운
    //    코드가 하나면 그 배(미르 답에 «OBWH 로 답했어요» 한 줄), 같은 거리에 둘 이상이면 고르지 않는다(미르가 «… 중 어느 배요?» 로 되묻는다).
    //    아는 코드는 활성 항차·베이사전(knownShipCodes) — 사전에만 있는 배가 더 가까우면 엉뚱한 항차를 고르지 않는다. 네 글자가 아닌 낱말·선박명은 종전 거리 1(dl1).
    const _fx = shipCodeFixOf(query, knownShipCodes(voyages));
    const _amb = !!_fx.ambiguous;
    if (!_amb) {
      for (const f of _fx.fixes) {
        Object.entries(voyages || {}).forEach(([k, v]) => {
          const i = v?.info; if (!i || String(i.vsl || '').toUpperCase() !== f.code) return;
          const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
          if (!best || (has && !best.has)) best = { key: k, info: i, v, has };
        });
        if (best) break;
      }
    }
    const toks = Q.split(/[^A-Z0-9]+/).filter((w) => /^[A-Z]{3,8}$/.test(w) && w.length !== 4);
    const byShip = new Map();
    if (!best && !_amb) Object.entries(voyages || {}).forEach(([k, v]) => {
      const i = v?.info; if (!i) return;
      const names2 = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
      if (names2.some((nm) => nm.length >= 3 && toks.some((tk) => dl1(tk, nm)))) {
        const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
        const shipId = String(i.vsl || names2[0] || k).toUpperCase();
        const prev = byShip.get(shipId);
        if (!prev || (has && !prev.has)) byShip.set(shipId, { key: k, info: i, v, has });
      }
    });
    if (!best && byShip.size === 1) best = [...byShip.values()][0];
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
  //  ★ 4.23-01 3차(재감사 하-5) — 규격·풀엠티·항구가 다른 맞교환(3.13 _assign_warn)은 화면(자동 가이드·큰 카드·리스트·상세)이 «자리 미정»이다.
  //    미르도 같은 말을 한다 — 앱이 짐작한 칸은 괄호로만(종전 «14-05-82(지정)» 은 앱이 정한 자리처럼 들렸다). 판정은 utils.swapWarnWordOf 한 벌.
  { const w = swapWarnWordOf(c); if (w) return w; }   // 판정·문구는 utils 한 벌(«XXXX 어디» 목록 nlSearch 도 같은 것을 부른다)
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
//  ★ 4.50 — «봉인자» 는 저장된 이름이 아니라 xraySealerOf 한 벌의 답이다(X-RAY 탭·인쇄·엑셀·컨 목록·컨 상세와 같은 답).
//    파트너 몫으로 미리 등록한 뒤 내가 양하확인하면 마지막 봉인자는 나다 — 저장된 sealer 만 읽으면 미르가 «파트너»라고 답해 화면과 갈린다
//    (검수사 2026-10-26 06:10 «마지막 봉인자는 실 양하자 명으로»). 완료 기록은 항차 completed → 없으면 콘앱이 넘긴 행의 _comp.
function sealerNameOf(ctx, cn, xs, c) {
  const d = secOf(ctx, 'discharge');
  //  양하 완료 기록만 본다(X-RAY 탭과 같다) — 항차 양하 completed 가 있으면 그것만, 없을 때(콘앱)만 양하 행의 _comp·양하 화면의 compMap.
  //  선적 완료자가 양하 봉인자로 새지 않게 선적 쪽 값은 쓰지 않는다.
  const comp = d.completed ? (d.completed[cn] || null)
    : ((ctx && ctx.mode !== 'loading' && ctx.compMap && ctx.compMap[cn]) || (c && c._mode !== 'loading' && c._comp) || null);
  const info = (ctx && ctx.voyage && ctx.voyage.info) || (ctx && ctx.info) || null;
  return S(xraySealerOf(xs, comp, info));
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
      //  4.49 감사(중-3) — 콘앱 행(cone.html — slEdi 만 있고 리스트 실 칸이 없음)도 항차 리스트(records)에서 실 칸을 채운다(검수앱과 같은 답 — «4907 실번호»).
      {
        const _sec = secOf(ctx, c && c._mode === 'loading' ? 'loading' : 'discharge');
        const _rec = c && c.cn ? (_sec.records || {})[c.cn] : null;
        if (_rec) { let o = null; for (const k of ['sl', 'sl_orig', 'sl_history', 'sl_src', 'sl_conflict', '_source', 'sl_alt']) if ((c[k] === undefined || c[k] === null) && _rec[k] !== undefined && _rec[k] !== null) (o || (o = { ...c }))[k] = _rec[k]; if (o) c = o; }
        const _e = c && c.cn && !S(c.slEdi) ? (_sec.ediContainers || {})[c.cn] : null;
        if (_e && S(_e.sl) && normSeal(_e.sl) !== normSeal(c.sl)) c = { ...c, slEdi: _e.sl };
      }
      const parts = [];
      if (S(c.sl) || S(c.slEdi)) {
        //  4.49: 판정 한 벌(utils.sealCheckOf) — 큰 실(세관 값이 있으면 세관) · 다른 자료 실 · 실오류(하나만 맞으면 맞음 · 신고 끝자리 잘림은 실오류)
        const _k = sealCheckOf(c);
        const _big = _k.edited ? c.sl : (_k.big || c.sl || c.slEdi);
        //  재감사(중-3) — 괄호 출처는 큰 실의 출처(sl 의 출처가 아니다 — 세관 값에 선사 파일 이름이 붙던 것). 고쳤으면 «검수원 실물».
        const src = _k.edited ? '검수원 실물' : ((_k.bigK && _k.bigK.srcs && _k.bigK.srcs[0]) || (_k.bigK && _k.bigK.kind === 'edi' ? 'EDI' : ''));
        const _others = _k.known.filter((x) => x.n !== String(_big || '').toUpperCase().replace(/[\s\-]/g, ''));
        parts.push(`실번호 ${_big}${src ? '(' + src + ')' : ''}${_k.error ? ` · 실오류(신고 ${_k.from} → 실물 ${_k.actual || c.sl})` : (_k.edited && S(c.sl_orig) && normSeal(c.sl_orig) !== normSeal(c.sl) ? ' · 리스트 원래값 ' + c.sl_orig : '')}`);
        if (_others.length) parts.push(`다른 자료 실 ${_others.map((x) => x.v + '(' + (x.customs ? '세관' : x.kind === 'edi' || (x.srcs || []).includes('EDI') ? 'EDI' : x.kind === 'alt' ? '보조실' : x.kind === 'orig' ? '처음 리스트' : (x.srcs || []).length && x.srcs.every((sv) => isRfListSrc(sv)) ? 'RF 리스트' : '선사 리스트') + ')').join(' · ')}${(_k.trunc || _k.zero) && _k.error ? '' : ' — 실물이 하나면 맞음'}`);
        if (_k.trunc && _k.error && _k.decl) parts.push(`⚠ 신고 실 ${_k.decl.v} 은 ${_k.truncLong} 의 끝자리가 빠진 값 — 실오류(신고 정정 대상)`);   // 감사(중-4): 긴 짝은 decl 의 짝 · 실오류일 때만
        if (_k.zero && _k.error && _k.decl) parts.push(`⚠ 신고 실 ${_k.decl.v} 은 ${_k.zeroLong} 의 앞자리 0 이 빠진 값 — 실오류(신고 정정 대상)`);   // 4.49-02
      }
      if (sealConflictOf(c).length > 1) {   // 4.49-02: RF CONTAINER LIST 실은 뺀다
        const vals = [...new Set(sealConflictOf(c).map((h) => S(h.sl)).filter(Boolean))];
        if (vals.length > 1) parts.push(`⚠ 리스트끼리 다름 ${vals.join(' ↔ ')}`);
      }
      if (S(c.eseal)) parts.push(`엠티실 ${c.eseal}${c.eseal_wrong ? '(오류 표시)' : ''}`);
      const x = xrayOf(ctx, c);
      if (x.seal && S(x.seal.seal)) { const _sn = sealerNameOf(ctx, c.cn, x.seal, c); parts.push(`커트씰 ${x.seal.seal}${_sn ? ' 봉인자 ' + _sn : ''}`); }   // 4.50: 봉인자 = 화면과 같은 판정
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
      const _sn = x.seal && S(x.seal.seal) ? sealerNameOf(ctx, c.cn, x.seal, c) : '';   // 4.50: 봉인자 = 화면과 같은 판정
      return `X-RAY 대상${x.seal && S(x.seal.seal) ? ' · 커트씰 ' + x.seal.seal + (_sn ? ' 봉인자 ' + _sn : '') : ' · 커트씰 아직 없음'}`;
    }
    case 'status': {
      const sec = secOf(ctx, c._mode === 'loading' ? 'loading' : 'discharge');
      const h = (sec.held || {})[c.cn];
      const lg = (sec.luggConfirm || {})[c.cn];
      const a = [];
      const comp = c._comp || c.comp;
      a.push(comp ? `완료 ${hhmm(comp.at)}${S(comp.by) ? ' ' + comp.by : (comp.src === 'term' ? ' 담당 미확인' : '')}${S(comp.equip) ? ' ' + (/호기$/.test(S(comp.equip)) ? comp.equip : comp.equip + '호기') : ''}` : '미완료');
      if (h && S(h.reason) && !comp) a.push(`보류(${S(h.reason)}${S(h.by) ? ' ' + h.by : ''})`);   // 4.26-02: 종전 `!h.doneAt` — doneAt 은 «보류 당시 완료 대수»라 첫 완료 뒤 건 보류를 못 봤다(보류 한 벌 activeHeldOf 와 같은 기준)
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
      //  4.15-01 (검수사 2026-10-09 15:37): 리퍼 엠티가 있으면 엠티 뒤에 «엠티 N(일반 · 리퍼 엠티)» — 리퍼(RF) 수에는 안 더한다
      const s = (o) => `풀 20 ${o.F['20'] || 0}·40 ${o.F['40'] || 0}·HC ${o.F.HC || 0}·45 ${o.F['45'] || 0} / 엠티 20 ${o.E['20'] || 0}·40 ${o.E['40'] || 0}·HC ${o.E.HC || 0}`
        + (o.rfE > 0 ? ` — ${emptySplitLabel(['20', '40', 'HC', '45'].reduce((a, k) => a + (o.E[k] || 0), 0), o.rfE)}` : '');
      const L = [`${ship} ${S(info.voy)} 마감텔리 수치(지금 기준)`];
      L.push(`양하 ${t.totals.dis.n}대 — ${s(t.totals.dis)}`);
      L.push(`선적 ${t.totals.load.n}대 — ${s(t.totals.load)}`);
      if (t.totals.shift && t.totals.shift.n) L.push(`시프팅 ${t.totals.shift.n}대`);
      //  ★ 5.28-05 — 종전 «OOG in N · out N» 은 OS 집계표(OS-IN·OS-OUT — 출발·도착 항 × 규격 × 풀/엠티 묶음) 줄 수였다. OOG 대수가 아니다(2026-11-27 클로드2 시험 — 규격초과 0대와 «OOG in 4 · out 8» 이 어긋나 보였다).
      const _oogN = (m) => (ctx.containers || []).filter((x) => x && (m === 'loading') === (x._mode === 'loading') && (x.oog || x.fr || x.ot) && x._ptk !== false).length;
      L.push(`규격초과(OOG·FR·OT) 양하 ${_oogN('discharge')}대 · 선적 ${_oogN('loading')}대`);
      L.push(`OS 집계표 줄 수 — OS-IN ${((t.osIn || {}).rows || []).length}줄 · OS-OUT ${((t.osOut || {}).rows || []).length}줄 (항구 × 규격 × 풀/엠티 묶음)`);
      L.push(`RF in ${(t.rfIn || []).length} · out ${(t.rfOut || []).length} / 데미지 in ${((t.damage || {}).dmIn || []).length} · out ${((t.damage || {}).dmOut || []).length}`);
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
      const starts = reps.filter((r) => /_start$/.test(S(r.action))).map((r) => Number(r.saidAt) || r.ts).filter(Boolean).sort((a, b) => a - b);
      const dones = reps.filter((r) => /_done$/.test(S(r.action))).map((r) => Number(r.saidAt) || r.ts).filter(Boolean).sort((a, b) => a - b);
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
      //  ★ 4.88 — X-RAY 실 점검 한 벌(utils.xraySealCheckOf — 검수사 확정 2026-11-12 «중복과 앞자리 세자리가 틀릴때만»). 화면(X-RAY 탭·컨 목록·컨 상세)과 같은 답 · 콘앱도 이 함수.
      const _ck = xraySealCheckOf(keys.map((cn) => { const c = cs.find((x) => x.cn === cn); const s = xs[cn] || (c && (c._xraySeal || c.xraySeal)) || null; return { cn, seal: s && s.seal }; }));
      const _ckL = xraySealCheckLines(_ck);
      const _ckHead = _ck.n ? (_ckL.length ? `X-RAY 실 확인 ${_ck.issues}대 — 중복·앞 세 자리·자릿수만 봤어요.\n${_ckL.join('\n')}\n` : 'X-RAY 실 점검 — 중복·앞 세 자리 다른 것 없음.\n') : '';
      return `${ship} X-RAY 대상 ${keys.length}대 · 커트씰 기록 ${n}대\n` + _ckHead + keys.map((cn) => {
        const c = cs.find((x) => x.cn === cn);
        const s = xs[cn] || (c && (c._xraySeal || c.xraySeal)) || null;
        const _sn = s && S(s.seal) ? sealerNameOf(ctx, cn, s, c) : '';   // 4.50: 봉인자 = 화면과 같은 판정
        return `${cn}${c ? ' @ ' + posOf(c) : ''} — ${s && S(s.seal) ? '커트씰 ' + s.seal + (_sn ? ' 봉인자 ' + _sn : '') : '커트씰 아직 없음'}`;
      }).join('\n');
    }
    if (k === 'held') {
      //  4.26-02: 보류 한 벌(activeHeldOf) — 종전 `!doneAt` 거르기는 doneAt(보류 당시 완료 대수)을 완료로 잘못 읽어 첫 완료 뒤 건 보류를 «없음» 으로 답했고, 실린 컨의 보류는 남겼다.
      const _hm = new Map();   // 컨번호로 한 줄(같은 컨이 두 모드에 걸리면 선적 쪽 — 종전 {...양하, ...선적} 과 같다 · 2차 시뮬 하-3)
      for (const x of [...activeHeldOf(ctx && ctx.voyage, 'discharge'), ...activeHeldOf(ctx && ctx.voyage, 'loading')]) _hm.set(x.cn, x);
      const hl = [..._hm.values()];
      if (!hl.length) return `${ship} 보류 중인 컨 없음.`;
      return `보류 ${hl.length}대\n` + hl.map((x) => `${x.cn} · ${S(x.reason)}${S(x.by) ? ' ' + x.by : ''}${x.at ? ' ' + hhmm(x.at) : ''}${S(x.equip) ? ' · ' + (/호기$/.test(S(x.equip)) ? x.equip : x.equip + '호기') : ''}`).join('\n');
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
//  ★ 일괄수리(2026-11-10): 규격 길이 한 벌(tallyReport.sizeLenOf — 마감텔리 칸을 20·40·45 로 접은 것). 규격 글자(iso)나 컨 행을 받는다. 알아보는 규격(첫 자리 2·4·L·9 또는 라벨 20·40·45)만 말하고 그 밖은 종전대로 빈 말.
//    종전엔 첫 자리만 보아 L·9 를 전부 «40피트» 라 했다 — 이제 진짜 45피트(L5G1·9500 류)는 «45피트», L2G1 은 마감텔리대로 «40피트».
const feetOf = (x) => {
  const c = (x && typeof x === 'object') ? x : { iso: x };
  const iso = String(c.iso || '').toUpperCase().trim();
  if (!/^[24L9]/.test(iso) && !/^(20|40|45)/.test(isoToLabel(iso) || '')) return '';
  return `${sizeLenOf({ ...c, iso })}피트`;
};

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
  if (total > TWIN_CAUTION_TOTAL_KG) return `\n  ⚠ **싱글 권유** — 총중량(EDI) 합계 ${formatWt(total)} (50톤 넘음). 55톤까지 트윈 가능.`;   // ★ 5.11 — 50톤이 장비 기준(검수사 2026-11-18)
  return '';
}

function sayCard(card, n, pier) {
  if (!card) return null;
  const c = card.main, t = card.twin;
  const head = n ? `${n}번째` : '지금 차례';
  const one = (x) => {
    const bits = [`${l4(x)} (${x.cn})`];
    //  4.26-02 (4.25-02 기록만): 실번호는 작업 카드·검수리스트와 한 벌(inspectionSealOf — 엠티는 엠티실) · 엠티에 실이 없으면 «엠티 · 실 없음»(카드와 같은 말)
    const sl = inspectionSealOf(x);
    const _emp = String(x.fe || '').toUpperCase() === 'E';
    bits.push(sl ? `${!String(x.sl || '').trim() ? '엠티실' : '실번호'} ${sl}` : (_emp ? '엠티 · 실 없음' : '실번호 없음'));
    if (eyePosOf(x)) bits.push(eyePosOf(x));
    const ft = feetOf(x); if (ft) bits.push(ft);
    if (x.rf && String(x.tmp ?? '').trim() !== '') bits.push(`리퍼 ${degText(x.tmp)}`);
    if (x._xray || x.isXray) bits.push('🔍 X-RAY');
    return bits.join(' · ');
  };
  if (t) {
    const w = twinWarn(card, pier);
    //  4.08-02: 55톤을 넘으면 «두 대 한 번에» 라고만 말하지 않는다 — 싱글을 권하되 들 수 있으면 트윈이다(검수사 2026-10-07).
    //  ★ 5.11 — 50~55톤도 «싱글 권유» 라 머리말을 무게대로 가른다(감사 — 52톤 쌍이 «55톤을 넘어» 로 나왔다).
    const head2 = w.includes('55톤 초과') ? `${head} — **트윈 자리입니다. 합계가 55톤을 넘어 싱글을 권합니다.**`
      : w.includes('50톤 넘음') ? `${head} — **트윈 자리입니다. 합계가 50톤을 넘어 싱글을 권합니다(55톤까지 트윈 가능).**`
      : `${head} — **트윈입니다. 두 대 한 번에.**`;
    return `${head2}\n  앞 ${one(c)}\n  뒤 ${one(t)}${w}`;
  }
  //  5.11: 양하 오버하이 OT 도 card.fr(먼저 내리는 묶음)로 온다 — FR 인지 OT 인지 컨 표식으로 가른다(감사 참고).
  return `${head} — ${one(c)}${card.fr ? (c.fr ? '\n  ⚠ FR(플랫랙)입니다 — 치수·고정 확인' : (c.ot || Number(c.ovh || 0) > 0) ? (Number(c.ovh || 0) > 0 ? '\n  ⚠ 오픈탑(높이 초과)입니다 — 치수·고정 확인' : '\n  ⚠ 오픈탑입니다 — 치수·고정 확인') : '\n  ⚠ 특수화물(OOG)입니다 — 치수·고정 확인') : ''}`;
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
  //  ★ 4.40 — «25번 베이부터 하자»·«25번 베이 먼저 할게» 처럼 그 베이로 옮겨 달라는 말은 엔진이 «옮겨 드릴까요?» [이동] 으로 받는다 — 떠 있는 미르(이 눈을 안 거친다)와
  //    탭 카드·조회창·통합검색(이 눈을 먼저 거친다)이 같은 말에 다른 답을 하지 않게 비켜 준다. 「24번 베이 양하하자」 「10번 홀드 작업할거야」(2.51)는 그대로 여기서 순서를 부른다.
  if (wish && isGuideGotoAsk(text)) return null;
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
  //  4.82-01: 화면 자동 가이드와 같은 한 벌 — 위에 보류한 컨이 얹힌 아래 컨(양하만)은 순서에서 뺀다(bayMode.underHeldOf).
  let _qPool = pool;
  if (mode === 'discharge') {
    try {
      const _hs = new Set(activeHeldOf(ctx && ctx.voyage, 'discharge').map((x) => String(x.cn || '').toUpperCase()));
      const _ub = underHeldOf(remaining, _hs);
      if (_ub.size) _qPool = pool.filter((c) => !_ub.has(String(c.cn || '').toUpperCase()));
    } catch (e) { console.warn('[미르] 보류 아래 컨 거르기 실패 — 거르지 않고 이어감:', e); }
  }
  try {
    queue = buildGuidedQueue({
      containers: _qPool, mode,
      evenRowsSeaSide: side === 'starboard',    // 우현 접안 = 짝수 로우가 해상쪽
      findTwin: guideTwinOf((t, arr, used) => findTwinCandidate(t, arr, used, info.imo || '', info.vsl || '')),   // 4.23-01 3차: 화면 자동 가이드와 같은 트윈 묶기(맞교환 자리는 짝 짐작 안 함)
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

//  ★ 4.17 (검수사 §7.8-③ «모든걸 알수 있으면 도움이 됨») — **지난 날 진행·작업 선박은 날짜별 완료 기록으로** 답한다(§4.2-F-5 «알려진 한계» 폐기).
//    조 키는 근무일 기준(utils.dayShiftKeys·shiftKeyOfMs — 야간은 시작한 날, 00:00~06:29 는 전날 근무일). 완료 시각이 없는 기록은 날짜·조로 못 가르니
//    몇 대인지 밝히고(§4.2-F-3 과 같은 태도) 빼지 않는다. 검수앱·콘앱이 같은 원본(항차 completed)을 읽으므로 같은 답이다.
const _segMd = (b, mk) => (mk ? '' : [b.discharge ? `양하 ${b.discharge}` : null, b.loading ? `선적 ${b.loading}` : null].filter(Boolean).join(' · '));
//  작업일(planDate) 창도 근무일 기준 — 00:00~06:29 에는 근무일이 하루 앞이라(§4.2-F-2) 달력 하루 차이(_shipsOnDay)를 그만큼 당긴다.
function _planOff(off, nowMs) {
  const d = new Date(nowMs);
  const today = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return off + (dayShiftKeys(0, '주간', nowMs)[0].slice(0, 5) === today ? 0 : -1);
}
function _pastDayLabel(dw, shW, keys) { return `${dw.word}${shW ? ' ' + shW : ''}(${shW ? keys[0] : keys[0].slice(0, 5)})`; }
function _pastDayDone(v, ship, dw, shW, mode, nowMs) {
  const keys = dayShiftKeys(dw.off, shW, nowMs);
  const D = doneOnShiftKeys(v, keys);
  const all = doneOnShiftKeys(v, null);
  const nm = ship || '이 배';
  const lbl = _pastDayLabel(dw, shW, keys);
  if (!all.n && all.noAt) return `${nm} — 완료 기록 ${all.noAt}대에 완료 시각이 없어 날짜·조별로는 못 나눠요. 날짜를 빼고 물으면 항차 전체로 답해요.`;
  const mk = mode === 'loading' || mode === 'discharge' ? mode : null;
  const mKr = mk === 'loading' ? '선적 ' : mk === 'discharge' ? '양하 ' : '';
  const n = mk ? D[mk] : D.n;
  const L = [];
  if (!n) {
    L.push(`${nm} — ${lbl}에는 ${mKr}완료 기록이 없어요.`);
    const ks = Object.keys(all.byKey).sort((x, y) => (x.slice(0, 5) + (x.endsWith('주간') ? 0 : 1)).localeCompare(y.slice(0, 5) + (y.endsWith('주간') ? 0 : 1)));   // 날짜 순 · 같은 날은 주간 먼저
    if (ks.length) L.push(`(이 항차 완료 기록이 있는 조 — ${ks.map((k) => `${k} ${mk ? all.byKey[k][mk] : all.byKey[k].discharge + all.byKey[k].loading}대`).join(' · ')})`);
  } else {
    const seg = _segMd(D, mk);
    L.push(`${nm} — ${lbl} ${mKr}완료 기록 ${n}대${seg ? ` (${seg})` : ''}`);
    if (!shW) for (const k of keys) { const b = D.byKey[k]; const nn = b ? (mk ? b[mk] : b.discharge + b.loading) : 0; if (nn) { const sg = _segMd(b, mk); L.push(`  ${k} ${nn}대${sg ? ` (${sg})` : ''}`); } }
  }
  if (all.noAt) L.push(`(완료 시각이 없는 기록 ${all.noAt}대는 날짜·조별로는 못 나눠요)`);
  return L.join('\n');
}
//  배 이름 없이(홈·떠 있는 미르) — 그 날 완료 기록이 있는 항차마다 한 줄. 이 폰에 완료 기록(본문)이 없는 배는 셀 수 없으니 그 날 작업 계획이 있던 배는 밝힌다(4.08 — 일반 검수원 폰은 고른 항차 본문만 받는다).
function _pastDayDoneAll(voyages, dw, shW, mode, nowMs) {
  const keys = dayShiftKeys(dw.off, shW, nowMs);
  const lbl = _pastDayLabel(dw, shW, keys);
  const mk = mode === 'loading' || mode === 'discharge' ? mode : null;
  const rows = [];
  for (const [k, vv] of Object.entries(voyages || {})) {
    if (!vv || !(vv.discharge || vv.loading)) continue;
    const D = doneOnShiftKeys(vv, keys); const n = mk ? D[mk] : D.n;
    if (n) rows.push({ k, i: vv.info || {}, D, n });
  }
  const off = _shipsOnDay(voyages, _planOff(dw.off, nowMs)).filter((x) => !(x.v && (x.v.discharge || x.v.loading))).map((x) => String((x.v && x.v.info && x.v.info.vsl) || x.k.split('_')[0]));
  const tail = off.length ? `\n(그 날 작업 계획이 있던 ${off.join('·')} 는 이 폰에 받은 완료 기록이 없어 세지 않았어요)` : '';
  if (!rows.length) return `${lbl}에는 완료 기록이 있는 배가 없어요.${tail}`;
  rows.sort((a, b) => b.n - a.n);
  const tot = rows.reduce((a, r) => a + r.n, 0);
  return [`${lbl} ${mk === 'loading' ? '선적 ' : mk === 'discharge' ? '양하 ' : ''}완료 기록 — ${rows.length}척 ${tot}대`,
    ...rows.map((r) => { const sg = _segMd(r.D, mk); return `${r.i.vsl || r.k.split('_')[0]} ${r.k.split('_')[1] || ''} — ${r.n}대${sg ? ` (${sg})` : ''}`; })].join('\n') + tail;
}
//  «어제 작업한 배» — 항차 작업일(planDate)이 그 날과 겹친 배 ∪ 그 날 완료 기록이 있는 배.
function _pastDayShips(voyages, dw, nowMs) {
  const keys = dayShiftKeys(dw.off, null, nowMs);
  const day = keys[0].slice(0, 5);
  const m = new Map();
  for (const x of _shipsOnDay(voyages, _planOff(dw.off, nowMs))) m.set(x.k, { k: x.k, v: x.v, a: x.a, b: x.b, D: null });
  for (const [k, vv] of Object.entries(voyages || {})) {
    if (!vv || !(vv.discharge || vv.loading)) continue;
    const D = doneOnShiftKeys(vv, keys);
    if (D.n) { const e = m.get(k) || { k, v: vv, a: null, b: null, D: null }; e.D = D; m.set(k, e); }
  }
  if (!m.size) return `${dw.word}(${day}) 작업한 선박이 없어요 — 그 날 작업 계획(작업일)도 완료 기록도 없습니다.`;
  const hm = (t) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const firstAt = (e) => (e.a != null ? e.a : Infinity);
  const L = [`${dw.word}(${day}) 작업한 선박 ${m.size}척`];
  for (const e of [...m.values()].sort((x, y) => firstAt(x) - firstAt(y) || x.k.localeCompare(y.k))) {
    const i = (e.v && e.v.info) || {};
    const parts = [];
    if (e.a != null) parts.push(`작업 ${hm(e.a)}~${e.b != null ? hm(e.b) : ''}`);
    if (e.D) { const sg = _segMd(e.D, null); parts.push(`완료 기록 ${e.D.n}대${sg ? ` (${sg})` : ''}`); }
    L.push(`${i.vsl || e.k.split('_')[0]} ${e.k.split('_')[1] || ''} — ${parts.join(' · ')}${i.pier ? ` · ${i.pier}` : ''}`);
  }
  return L.join('\n');
}
//  ★ 4.17 (검수사 §7.8-⑫ «자료 수집중») — 선적이 리스트뿐이고 아직 안 실은 배(dataReadiness.loadingCollecting 한 벌)의 «얼마나 남았어»·진행·끝나는 시각.
//    선적 잔여·총 잔여는 수를 내지 않는다(§7.5-B 홈 «자료 대기»와 같은 상태). 양하는 셀 수 있으니 같이 말한다 — 분모는 voyageCountsOf 한 벌(두 앱 같은 수).
function _collectingAnswer(ship, vc, askMode) {
  const nm = ship || '이 배';
  if (askMode === 'loading') return `${nm} 선적 — 자료 수집중이에요. 선적 리스트만 왔고 EDI 는 아직이라 남은 수를 세지 않아요.\n선적 EDI 가 들어오거나 한 대라도 실으면 바로 셀게요.`;
  const L = [`${nm} — 선적 자료 수집중이라 총 잔여·끝나는 시각은 아직 세지 않아요.`];
  const d = vc && vc.byMode && vc.byMode.discharge;
  if (d && d.total > 0) L.push(`양하 — 남은 ${d.total - d.done}대 / 전체 ${d.total}대 (완료 ${d.done})`);
  L.push('선적 — 자료 수집중 (리스트만 왔고 EDI 는 아직 · 실은 컨 없음)');
  return L.join('\n');
}
//  ★ 4.17 (검수사 §7.8-⑧ «2») — 질문 속 없는 선박코드를 가장 가까운 코드로 고친다(utils.shipCodeFixOf → nearestShipCode 한 벌 — 대문자로 친 낱말만 거리 2·되묻기). 아는 코드 = 활성 항차·베이사전·선박 라이브러리 + 지금 열린 배.
//    같은 거리에 둘 이상이면 { ambiguous } — 그때만 되묻는다. 고칠 것이 없으면 null.
//  ★ 4.77-01 — 질문 속 영문 네 글자가 **앱이 아는 배 코드**(활성 항차·베이사전·열린 배)와 정확히 같은가.
//    «DJCT 장비 번호가 뭐야» 는 일 낱말(MIR_WORKISH_RE)이 없어 생활회화로 갔고, 모델이 «터미널 이름 같아요»·«배 이름인지 확실히 모르겠어요» 라고 지어냈다.
//    배 코드가 든 말은 일 질문이다 — 생활회화로 보내지 않는다(검수앱·콘앱 같은 판정: 이 함수 하나).
function _hasKnownShipCode(q, ctx) {
  try {
    if (!/[A-Za-z]{4}/.test(String(q))) return false;
    const x = ctx || {};
    const own = [x.vsl, x.info && x.info.vsl, x.shipCtx && x.shipCtx.info && x.shipCtx.info.vsl, x.voyage && x.voyage.info && x.voyage.info.vsl].filter(Boolean).map((t) => String(t).toUpperCase());
    const fx = shipCodeFixOf(q, knownShipCodes(x.voyages || null, x.shipLib || (x.manualCtx && x.manualCtx.shipLib) || null).concat(own, Array.isArray(x.shipCodes) ? x.shipCodes.map((t) => String(t || '').toUpperCase()) : []));   // shipCodes — 콘앱이 항차 목록의 배 코드를 실어 보낸다(검수앱은 voyages)
    //  4.78: 입력 원문이 전부 대문자인 낱말만 배 코드로 인정한다 — 소문자 영어 낱말(play ball with me 의 ball = 베이사전 코드 BALL)이 일 질문으로 잡히던 것(4.77-01 독립 감사 권고).
    return fx.hits.some((h) => h.dist === 0 && String(h.raw || '') !== '' && h.raw === String(h.raw).toUpperCase());
  } catch (e) { console.warn('[미르] 배 코드 판정 실패:', q, e && e.message); return false; }
}
function _shipCodeFix(q, ctx) {
  if (!/[A-Za-z]{4}/.test(String(q))) return null;
  const x = ctx || {};
  const own = [x.vsl, x.info && x.info.vsl, x.shipCtx && x.shipCtx.info && x.shipCtx.info.vsl, x.voyage && x.voyage.info && x.voyage.info.vsl].filter(Boolean).map((t) => String(t).toUpperCase());
  const fx = shipCodeFixOf(q, knownShipCodes(x.voyages || null, x.shipLib || (x.manualCtx && x.manualCtx.shipLib) || null).concat(own));
  if (fx.ambiguous) return { ambiguous: fx.ambiguous };
  //  고쳐 답하는 것은 답할 수 있는 배(활성 항차 · 지금 열린 배)로 고칠 때만 — 사전에만 있는 배로 고쳐 봐야 답할 자료가 없고, 질문 글만 바뀐다(«haha»→HAHM 잡담이 깨지지 않게).
  const active = new Set(own.concat(Object.values(x.voyages || {}).map((v) => String((v && v.info && v.info.vsl) || '').toUpperCase())));
  //  옛 코드 별칭(베이사전 prevCode)은 정확한 옛 이름이라 걸러내지 않는다 — 지금 코드를 댄 말과 같은 답이 나간다.
  const fixes = fx.fixes.filter((f) => f.alias || active.has(f.code));
  if (!fixes.length) return null;
  let out = String(q);
  for (const f of fixes) out = out.replace(new RegExp(`(^|[^A-Za-z0-9])${f.raw}(?![A-Za-z0-9])`), `$1${f.code}`);
  return { code: fixes[0].code, tok: fixes[0].raw, alias: fixes[0].alias || '', q: out };
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
  //  ★ 4.20 (Fable 판정 ④): 평택 표식이 없는 양하 행(콘앱 행·양하선적 탭 카드)도 평택 양하분 한 벌로 — 세관 목록에만 있는 컨은 행을 만들어 붙인다(utils.applyDischargeUnits — 콘앱 mirAsk 와 같은 함수).
  //    이미 평택 표식이 있는 목록(펼치기·검색 패널)은 건드리지 않는다. 목록이 없는 배(basis 'edi')는 아래 종전 판정 그대로.
  if (v && c.containers.some((x) => x && x.cn && x._ptk === undefined && (x._mode || x.mode || c.mode || 'discharge') === 'discharge')) {
    try {
      const vk = c.voyageKey || null;
      const mine = c.containers.filter((x) => x && (!vk || !x.voyageKey || x.voyageKey === vk));
      if (mine.length === c.containers.length) {
        const ss = shiftSetForUnitsOf(c.shiftMap);   // 4.48-04: 표시용 지도의 본선 잔류 예보(노란 ◆)는 시프팅 집합에서 뺀다(평택 양하 대수는 자료대로 — 콘앱 미르와 한 벌)
        c.containers = applyDischargeUnits(c.containers.map((x) => (x && !x._mode && (x.mode || c.mode) ? { ...x, _mode: x.mode || c.mode } : x)), v, ss).rows;
      }
    } catch (e) { console.warn('[미르 4.20] 평택 양하분 입히기 실패 — 종전 판정으로 셉니다:', e); }
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
      if (ptk === undefined && x._shift) ptk = false;   // 4.16 (§7.8-①): 시프팅 행은 평택분이 아니다 — 리스트에 실려 온 시프팅은 화면이 일반 행으로 넘긴다
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
const TERM_ASK_RE = /(?:뭐|뭔|무엇)(?:야|예요|에요|죠|지|냐|니|가요|입니까)?\s*[?？!.~]*$|무슨\s*뜻|뜻이?\s*(?:뭐|무엇)|(?:이란|란)\s*[?？!.~]*$/;   // 4.35-02
export function answerOneRaw(query, ctx) {
  //  5.28 건의(질문 300 #98 · 건의 19·28·53) — 자료에 없는 배 이름을 대면 지금 배로 답하지 않는다.
  if (!(ctx && (ctx._fieldSub || ctx._fhLoose))) {
    try { const u = unknownShipAnswer(query, ctx); if (u) { if (ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.via = 'unknownShip'; return u; } }
    catch (e) { console.warn('[미르] 없는 배 판정 실패 — 종전 길로 갑니다:', e); }
  }
  const a = _answerOneRawCore(query, ctx);
  if (ctx && (ctx._fieldSub || ctx._fhLoose)) return a;
  try { return mirAfterAnswer(query, a, ctx); } catch (e) { console.warn('[미르] 근거·보고 줄 붙이기 실패 — 답만 냅니다:', e); return a; }
}

function _answerOneRawCore(query, ctx) {
  const q0 = S(query);
  //  3.68 [mirThread]: 대화 중의 «응·두 번째·아니 ○○·그거·됐어» 는 직전 답에 이어 푼다(순수 — 기억은 화면이 접수 시점에 mirThreadCommit 으로 바꾼다).
  //    대화 층이 직접 낸 답은 via='thread'(isWeakAnswer 가 강한 답으로 본다 — 모델·miss 로 안 간다).
  let q = q0;
  if (q0 && !(ctx && ctx._fhLoose)) {   // 4.37-02: 느슨한 관문이 종전 길을 한 번 더 돌릴 때는 대화 층을 다시 풀지 않는다(이미 푼 말)
    let th = null;
    try { th = mirThreadResolve(q0, ctx || {}, (ctx && ctx._now) || Date.now()); } catch (e) { console.warn('[미르 대화] 풀기 실패:', e); th = null; }   // _now — 연막검사가 시계를 준다
    if (th && th.direct != null) { if (ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.via = 'thread'; return th.direct; }
    if (th && th.q) { q = S(th.q); if (q !== q0 && ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.rq = q; }   // rq — 되쓴 말. isWeakAnswer 가 원문(«응»·«두 번째») 대신 이것으로 약함을 잰다(모델 누출 방지, 감사 3)
  }
  if (!q || q.length < 2) return null;
  //  ★ 4.37-01 — 화면이 배를 못 고른 채(배 이름 없음 · 열린 항차 없음) 들어온 말도 엔진이 같은 판정(pickShipCtx — 배 이름 → 한 척뿐인 일하는 배)으로 한 번 더 고른다.
  //    번역문으로 규칙을 다시 돌릴 때 필요하다 — 화면은 원문으로만 배를 골라, 번역문이 «지금 일하는 배» 질문이 되어도 배 없이 돌았다.
  //    실측 2026-10-19 13:05 홈 «지금 항차 작업시간이 얼마나 될꺼 같아?» → 번역 «몇 시쯤에 끝나»(0.8) → 배를 몰라 자료 답(AI)으로 빠짐(검수사 13:08 «미르가 답변이 전과 같네요»).
  //    일하는 배가 여럿이면 고르지 않는다(되묻는 답 뒤에 화면이 고르기 단추를 붙인다). 콘앱은 배 고르기가 따로라(mirEnsureShip) 건드리지 않는다.
  if (ctx && !ctx.shipCtx && !ctx.voyage && !ctx.voyageKey && !ctx.vsl && !ctx.info && ctx.voyages && typeof ctx.voyages === 'object' && ctx.app !== 'cone') {
    let _sc = null;
    try { _sc = pickShipCtx(q, ctx.voyages, null); } catch (e) { console.warn('[미르] 배 고르기 실패:', e); _sc = null; }
    if (_sc && _sc.key) ctx = { ...ctx, shipCtx: _sc };
  }
  //    (감사 — 선박코드 고치기보다 먼저 고른다: 화면 경로처럼 고른 배가 ctx 에 있어야 «QDTR 로 답했어요» 한 줄이 붙는다)
  //  ★ 4.17 (검수사 §7.8-⑧ «2») — 없는 선박코드(«OWBH»)는 가장 가까운 코드로 고쳐 바로 답하고 «OBWH 로 답했어요» 한 줄을 붙인다(되묻지 않는다).
  //    같은 거리에 둘 이상이면 그때만 «… 중 어느 배요?». 한 줄은 그 배로 답했을 때만 — 다른 배 항차가 열려 있으면(정확한 코드를 댔을 때처럼) 그 항차로 답한다.
  //    판정은 _shipCodeFix → utils.shipCodeFixOf 한 벌(질문 속 배 고르기 pickShipCtx·콘앱 배 옮기기 pickVoyageKey 와 같은 판정).
  //  5.14 재감사 상1 — 호기 이동 말(«2호기 KSKS으로 이동»)은 코드를 고쳐 짐작하지 않는다. 화면은 원말로 다시 읽어 적으므로, 고친 코드로 «적을게요» 하면 거짓 답이 된다.
  let _shipMoveQ = false; try { const _pm = parseNaturalQuery(q); _shipMoveQ = !!(_pm && _pm.moveSet && _pm.moveSet.kind === 'ship'); } catch (e) { console.warn('[미르] 호기 이동 말 판정 실패:', e); _shipMoveQ = false; }
  if (!(ctx && ctx._shipFixed) && !_shipMoveQ) {
    let fx = null;
    try { fx = _shipCodeFix(q, ctx); } catch (e) { console.warn('[미르] 선박코드 고치기 실패:', e); fx = null; }
    if (fx && fx.ambiguous) { if (ctx && ctx._trace && typeof ctx._trace === 'object') ctx._trace.via = 'shipAsk'; return `${fx.ambiguous.join('·')} 중 어느 배요?`; }
    if (fx && fx.code) {
      const a = answerOneRaw(fx.q, { ...(ctx || {}), _shipFixed: fx });
      if (a == null) return null;
      const x = ctx || {};
      const on = String(x.vsl || (x.info && x.info.vsl) || (x.shipCtx && x.shipCtx.info && x.shipCtx.info.vsl) || (x.voyage && x.voyage.info && x.voyage.info.vsl) || '').toUpperCase();
      return (on ? on === fx.code : String(a).includes(fx.code)) ? `${a}\n${fx.code} 로 답했어요${fx.alias ? `(옛 코드 ${fx.alias})` : ''}.` : a;
    }
  }
  const c = _normalize(ctx);
  const _via = (v) => { if (c._trace && typeof c._trace === 'object') c._trace.via = v; };   // 3.42: 잡아채는 길 표시(판 B 문지기 재료)
  //  ★ 4.89 감사 막음 2 — 작업용 검색줄(ctx.workOnly — 부름말 없음)의 일반 대화(인사·안부·재미 청하기)는 답하지 않고 부르는 법 한 줄. 모델도 부르지 않는다(isWeakAnswer 가 workHint 를 답으로 본다). 두 앱 같은 판정.
  if (c.workOnly && mirWorkChatOf(query)) { _via('workHint'); return MIR_CALL_HINT; }
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
    //  ★ 4.17 (§7.8-⑫): 선적이 리스트뿐이고 아직 안 실은 배 — 총 잔여는 «자료 수집중»(dataReadiness.loadingCollecting 한 벌). 터미널 본선현황으로 센 수는 그대로.
    if (!c.voyageCounts.term) { try { if (loadingCollecting(c.voyage || null, cs)) c.voyageCounts.collecting = 'loading'; } catch (e) { console.warn('[미르] 자료 수집중 판정 실패:', e); } }
  } catch (e) { console.warn('[미르] 항차 대수 세기 실패:', e); c.voyageCounts = { total: 0, done: 0, byMode: {}, doneAts: [] }; } } return c.voyageCounts; };
  const v = c.voyage || null;
  const info = c.info || {};
  const ship = c.vslFull || c.vsl || '';
  const hasShip = !!(v || c.vsl);
  const mode = c.mode || 'discharge';
  const modeKr = mode === 'loading' ? '선적' : '양하';

  //  ⓪ 잡담(콘앱 기준은 앞) — 검수앱은 뒤에서 본다(smallTalkLast). mirSmallTalk 은 업무 낱말 게이트가 있다.
  if (!c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) { if (c.workOnly) { _via('workHint'); return MIR_CALL_HINT; } return st; } } catch (e) { /* 잡담이 막혀도 일 이야기는 계속 */ } }   // 4.89: 작업용 검색줄(workOnly)은 잡담 대신 부르는 법 한 줄

  let p = null;
  try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (!p) return null;

  //  ★ 5.28-05 — 이 항차 자료에 컨이 한 대도 없는 베이를 물으면 «0대»·«완료 0/0»·«단수 데이터 없음» 대신 그렇다고 말한다(2026-11-27 클로드2 시험 — 82·34·46베이).
  //    40피트 짝수 베이는 앞뒤 홀수(33·35)도, 홀수 베이는 겹치는 짝수도 같은 자리로 본다. 기록을 남기는 말·뜻을 묻는 말·갈래 다시 부르기는 건드리지 않는다.
  if (p.bay && hasShip && !(ctx && ctx._fieldSub) && !isWriteParse(p) && !/뜻|뭐야|뭔가요|어떻게|방법|정리|옮겨|옮기|이동|가자|가 줘|가줘|넘어가|열어|띄워|보여\s*줘\s*화면|바꿔|바꾸|바꿀|부터|먼저/.test(q)) {   // 베이 정리(4.81)·베이로 옮기기(4.40)는 제 답이 있다
    try {
      const _vk = c.voyageKey || '';
      //  감사 중 3 — 위치(베이)가 있는 행만, 물은 모드가 있으면 그 모드만 본다. 위치가 아직 없는 자료(선적 리스트뿐)에서는 판정하지 않는다.
      const _rows = cs.filter((x) => x && (!_vk || !x.voyageKey || x.voyageKey === _vk) && Number(x.bay) > 0 && (!p.mode || (p.mode === 'loading') === (x._mode === 'loading')));
      const _b = Number(p.bay);
      if (_rows.length && Number.isFinite(_b) && _b > 0) {
        const _has = new Set(_rows.map((x) => Number(x.bay)).filter((n) => Number.isFinite(n) && n > 0));
        const _near = _b % 2 === 0 ? [_b, _b - 1, _b + 1] : [_b, _b - 1, _b + 1].filter((n) => n === _b || n % 2 === 0);
        if (!_near.some((n) => _has.has(n))) {
          const _all = [..._has].sort((a1, b1) => a1 - b1);
          _via('noBay');
          return `📭 ${_b}번 베이 없음 — 이 항차 자료(EDI·리스트)에 그 베이 컨이 한 대도 없어요. 베이 번호를 다시 봐 주세요 — 컨이 있는 베이는 ${_all.map((n) => String(n).padStart(2, '0')).join('·')} 예요.`;   // «📭 N번 베이 없음» 머리는 대화 층(3.68)이 «없음 답»으로 읽는 꼴
        }
      }
    } catch (e) { console.warn('[미르] 없는 베이 판정 실패:', e); }
  }

  //  ★ 5.27 — 질문 300(검수사 2026-11-27 «지금 올려주는 자료로 미르가 충실히 답할수 있게» · «대략 질문의 의도를 파악하고»).
  //    ① 여러 갈래 대수(따로·나눠·별로·각각·합쳐 — 규격×풀엠티 · 갑판/홀드 · 양하/선적 · POD별 · TEU · 하이큐브 · 클래스별 · 리퍼 온도 조건 · X-RAY 그중 데크 …)는
  //       갈래마다 이 함수를 다시 불러 같은 단일 답의 수로 묶는다(판정 한 벌 — «양하 20피트 풀 몇 대» 와 같은 수).
  //    ② 묻는 말(어떻게·뭐예요·기준·누구한테·해도 돼요)은 현장 문답 원장이 먼저 — 대수·목록을 묻는 말은 원장이 받지 않는다.
  //    갈래 다시 부르기(_fieldSub)와 느슨한 관문 재실행(_fhLoose)에서는 돌지 않는다.
  //    경고 문구를 그대로 읽어 물은 말(«X-RAY 6대 중 1대가 EDI 에 없음 이거 뭐야»)은 아래 경고 설명이 받는다(3.60-05 M19).
  const _alertAsk = (() => { try { return Array.isArray(c.diagAlerts) && c.diagAlerts.length && !!answerAboutAlert(q, c.diagAlerts); } catch (e) { console.warn('[미르] 경고 물음 판정 실패:', e); return false; } })();
  if (!(ctx && (ctx._fieldSub || ctx._fhLoose)) && !_alertAsk) {
    try {
      const _fctx = ctx || {};
      const _shipC = S(info.vsl || c.vsl || '').toUpperCase();
      const H = { ask: (s2) => answerOneRaw(s2, { ..._fctx, _fieldSub: true, accepted: false, modeChoice: 'both', _trace: {} }), isoCheckDigit, isoFixLastDigit, isoToLabel, vsl: _shipC,
        portName: (code) => PORT_CODE_KR[String(code || '').toUpperCase()] || '',
        //  다음 기항 — 배에 남는 화물(평택 출항 쪽 컨의 POD)로 — utils.nextPortAfterPtk 의 화물 판정과 같은 문턱(1.5배). 원문 EDI 는 콘앱에 없어서 두 앱이 같은 재료(펼친 컨 행)로 센다.
        //  ★ 5.28-05 — PORT-MIS 차항지(출항 답의 «다음 항구» 와 같은 칸)가 있으면 그것이 답이다. 화물로 센 항은 참고로만(2026-11-27 클로드2 시험 — 출항 답은 NINGBO, 다음 기항 답은 상해).
        nextPort: () => {
          const _cargo = nextPortFromRows(cs, ship, (k) => PORT_CODE_KR[k] || '');
          let pm = null; try { pm = typeof c.matchPortMis === 'function' ? c.matchPortMis(c.portMisData || {}, info) : null; } catch (e) { console.warn('[미르] 다음 기항 PORT-MIS 매칭 실패:', e); pm = null; }
          const np = pm && S(pm.nextPortOut || pm.nextPort).trim();
          if (!np) return _cargo;
          const _c = S(_cargo).replace(/^🧭[^—]*—\s*/, '').trim();
          return `🧭 ${ship || '이 배'} 평택 다음 기항 — ${np} (PORT-MIS 차항지)` + (_c && !/아직 없어요/.test(_c) ? `\n참고 — 배에 남는 화물로는 ${_c}` : '');
        },
        //  5.28 건의 — 이 항차 원본(리스트·EDI 대조용) · 항차 표기 · 갱 배분(담당 베이) · 지난 항차(선박 통계 + 미르 비서가 받아 둔 보관 자료)
        shipCodes: (() => { try { return new Set([_shipC, ...(knownShipCodes(c.voyages || null) || [])].map((x) => S(x).toUpperCase()).filter(Boolean)); } catch (e) { console.warn('[미르] 배 코드 모으기 실패:', e); return new Set([_shipC].filter(Boolean)); } })(),
        raw: v || null, voyLabel: S(info.voy_d || info.voy || ''), app: c.app || 'tally', rfSkip: !!c.rfSkip, isRf: (x) => { try { return isReeferContainer(x); } catch (e) { return !!(x && x.rf); } },
        qcN: () => { const w = info.qcWork; return w && typeof w === 'object' ? Object.keys(w).length : 0; },
        gang: (n) => { if (!v) return null; try { return buildGangShift(v, c._bayDef || null, { compMap: c.compMap || null, nGangs: n || null }); } catch (e) { console.warn('[미르] 갱 배분(담당 베이) 실패:', e); return null; } },
        prev: () => {
          const lib = c._prevCmp || null;
          const voys = (lib && lib.voys) || (c.shipLib && c.shipLib.voyages) || null;
          if (!voys || typeof voys !== 'object') return null;
          const curK = S(c.voyageKey || '');
          const list = prevVoyKeys(voys, curK).map((k) => ({ key: k, voy: S(voys[k].voy_d || k.split('_').slice(1).join('_') || k), dis: Number(voys[k].discharge_ptk) || 0, lod: Number(voys[k].loading_ptk) || 0 }));
          let prevRows = null;
          if (lib && lib.prevVoy && list[0] && lib.prevKey === list[0].key) { try { prevRows = flattenVoyages({ [lib.prevKey]: lib.prevVoy }); } catch (e) { console.warn('[미르] 지난 항차 펼치기 실패:', e); prevRows = null; } }
          return { list, prevRows };
        },
        //  트윈 — 예상 작업 시간·자동 가이드와 같은 판정(twinSplitOf · 평택분 컨번호를 모드별로)
        twin: () => { if (!v) return null; const by = { discharge: [], loading: [] }; cs.forEach((x) => { if (x && x.cn && x._ptk !== false && (!x.voyageKey || !c.voyageKey || x.voyageKey === c.voyageKey)) by[x._mode === 'loading' ? 'loading' : 'discharge'].push(x.cn); });
          try { return twinSplitOf(v, by); } catch (e) { console.warn('[미르] 트윈 세기 실패:', e); return null; } },
        //  출항 — 엔진의 출항 답(도선 예보 출항 → PORT-MIS · 지난 예보 버림) 한 벌. 엔진이 출항 시각을 못 찾아 입항 시각을 말하면 «출항 예정 없음» 과 작업 예정 끝을 말한다.
        depart: () => { const a0 = H.ask('출항 언제'); if (a0 && /출항|작업 계획/.test(String(a0))) return a0;   // 엔진 출항 답이 있으면 그대로(한 벌 — smoke_mirthread «sp» 회귀)
          const pe = S(info.planDate).split('~')[1]; return `🚢 ${ship || '이 배'} — 출항 예정 시각(도선 출항 예보·PORT-MIS)은 아직 없어요.${pe ? ` 작업 예정 끝은 ${pe.trim()} 이에요(선석배정).` : ''}`; } };
      const sp = fieldSplitAnswer(q, cs, H);
      if (sp && sp.a) { _via('fieldSplit'); if (c._trace && typeof c._trace === 'object') c._trace.field = sp.id; return sp.a; }
      let _multi = null; try { _multi = mirKnowledgeMulti(q); } catch (e) { console.warn('[미르] 복합 대처 확인 실패:', e); _multi = null; }   // 두 갈래 현장 대처(«파손됐고 씰도 잘렸어»)는 원장 복합 답이 받는다(회귀 R9)
      const fa = _multi ? null : fieldAnswer(q, (s2) => mirKnowledge(s2), { coneTable: !!(c.cone && Array.isArray(c.cone.rows) && c.cone.rows.length) });
      if (fa && fa.a) { _via('fieldQA'); if (c._trace && typeof c._trace === 'object') c._trace.field = fa.id; return fa.a; }
    } catch (e) { console.warn('[미르] 현장 문답·묶음 답 실패 — 종전 길로 갑니다:', e); }
  }

  //  ★ 4.35-02 — 기능 이름 + 어디/어떻게/사용법: 항차가 열려 있든 아니든·콘앱이든 **같은 매뉴얼 답**이 데이터 인텐트(진행·콜사인·개체 조회)보다 먼저 나간다.
  //    검수사 2026-10-19 «메뉴얼에 있는데 질문 위치가 어디냐에 따라 답을 하기도 하고 못하기도 합니다». 컨 번호가 붙은 말은 조회이니 제외.
  if (!p.digits || String(p.digits).length < 3) {   // 끝 네 자리(컨 번호)가 붙은 말은 조회다 — «4.1» 같은 두 자리 숫자는 뜻 질문에 흔하다
    try {
      const fh = featureHelpExact(q, { isChief: !!c.isChief });
      if (fh) { _via('featureHelp'); return fh; }
      //  ★ 4.37-02 — 느슨한 관문(«예보는 어디다 올려» · 두 글자·짧은 이름 + 올려·넣어): **종전 길을 먼저** 돌려 강한 답(자료 답)이면 그것, 없거나 약하면 매뉴얼 답.
      //    검수사 2026-10-19 16:56 «일조나 연태 예보는 어디다 올려야 하지?» → 규칙 답이 없어 클로드 자료 답(설명서를 안 본다)으로 갔다.
      //    앞에서 가로채지 않는 까닭 — 강한 자료 답(브리핑 등)을 덮지 않기 위해서다. 컨 조건이 든 말(«FR 어디다 넣어» — FR 11대 — 베이 9…)은 featureHelpLoose 가 아예 받지 않는다(감사 A-1).
      if (!(ctx && ctx._fhLoose)) {
        const fl = featureHelpLoose(q, { isChief: !!c.isChief });
        if (fl) {
          const t2 = {};
          const base = answerOneRaw(q, { ...(ctx || {}), _fhLoose: true, accepted: false, _trace: t2 });   // accepted:false — 안쪽 종전 길이 null 로 끝나도 «못 알아들은 말»(mir_misses)로 적지 않는다. 겉에서 매뉴얼 답을 내기 때문이다(재감사 C-1)
          if (base != null && !isWeakAnswer(q, base, t2)) { if (c._trace && typeof c._trace === 'object') Object.assign(c._trace, t2); return base; }
          _via('featureHelp'); return fl;
        }
      }
    } catch (e) { console.warn('[미르] 기능 이름 사용법 관문 실패 — 종전 길로 갑니다:', e); }
    //  순수한 뜻 질문(«4.1 인화성 고체 뭐야»·«FEU 뭐야»)은 항차가 열려 있어도 사전이 먼저다 — 열려 있으면 DG 클래스·규격 같은 컨 조건 인텐트가 정의를 가렸다.
    //    집계·진행·목록·베이 조건이 잡힌 말(«남은 거 뭐야»)은 뜻 질문이 아니니 제외 — nlSearch termQuery 와 같은 문지기.
    //  경고 문구를 그대로 읽어 물으면(«X-RAY 6대 중 1대가 EDI 에 없음 이거 뭐야») 용어가 아니라 그 경고 설명이다 — 3.60-05 가 먼저 받는다.
    const _alertQ = (() => { try { return Array.isArray(c.diagAlerts) && c.diagAlerts.length && !!answerAboutAlert(q, c.diagAlerts); } catch (e) { return false; } })();
    if (!_alertQ && TERM_ASK_RE.test(q) && !p.isStat && !p.progressQuery && !p.etaQuery && !p.listQuery && p.bay == null && !p.vacantQuery && !p.capacityQuery && !p.weightSum) {
      try { const k = mirKnowledge(q); if (k && /^📖/.test(k)) { _via('termDef'); return k; } } catch (e) { /* 사전이 막혀도 종전 길로 */ }
    }
  }

  //  ★ 4.81 «N번 베이 정리해줘» — 검수사 2026-11-09 «일반 사용자가 몇번베이 정리해줘 하면 그때 두자료를 읽어서 작업 할수 있게 해주는 것» · «30분전 데이터로도 2갱중에 1갱이 앱사용자가 아니면 앱은 그갱이 어디 작업중인지 알수 있습니다.
  //    그때 실사용자가 그베이를 지정하면 미르가 알아서 정리해주는것입니다». **읽기 전용** — 기록·알림·Firebase 쓰기 없음(조회만 사용자도 답을 듣는다). 콘 지식(① 베이 말을 가로챈다)보다 앞에서 받아 두 앱이 같은 답을 낸다.
  //    재료는 컨 행(검수앱 allContainers·flattenVoyages / 콘앱 ctx.containers — 모두 _mode·_ptk·_comp·bay 를 싣는다) 하나라 판정은 src/gangState.js 한 벌이다.
  if (p.bayTidy && !/콘/.test(q)) {
    _via('bayTidy');
    if (!hasShip || !v) {
      //  4.81-01 — 배 이름이 없고 열린 항차도 없을 때: 항차 목록이 있으면(콘앱 제외) 일하는 배로 답을 갈랐다 — 한 척은 위 pickShipCtx 가 이미 골랐고, 여기 온 것은 여럿(고르기 단추)이거나 없음이다.
      const _vs = (ctx && ctx.voyages && typeof ctx.voyages === 'object' && ctx.app !== 'cone') ? ctx.voyages : null;
      if (_vs && Object.keys(_vs).length) {
        const _w = workingShipCtx(_vs);
        if (_w && _w.ambiguous && _w.ambiguous.length > 1) return `지금 작업 중인 배가 ${_w.ambiguous.length}척이에요. ${_w.ambiguous.join(' · ')}. 어느 배인지 이름을 붙여 주세요.`;
        if (!_w) return '지금 작업 중인 배가 없어요. 배 이름을 붙여 주세요.';
      }
      return '어느 배 말씀인지 몰라 베이를 정리하지 못했습니다. 배 이름을 붙여 주세요. 예를 들면 "미르야 KKLC 12번 베이 정리해줘" 처럼 말씀해 주세요.';
    }
    const _vkT = c.voyageKey || null;
    let _rowsT = cs.filter((x) => x && x.cn && (!_vkT || !x.voyageKey || x.voyageKey === _vkT));
    if (!_rowsT.length && _vkT) { try { _rowsT = flattenVoyages({ [_vkT]: v }).filter((x) => x && x.cn); } catch (e) { console.warn('[미르 4.81] 항차 펴기 실패:', e); _rowsT = []; } }
    _rowsT = withRecordPositions(_rowsT, v);   // 콘앱 행은 EDI 계획 자리 — 실적·맞교환 자리를 검수앱 행과 같은 차례로 얹는다(이미 얹힌 행은 그대로)
    const _vslT = S(info.vsl || c.vsl);
    if (!_rowsT.length) return `${_vslT ? _vslT + ' ' : ''}이 배는 컨 자료가 아직 없어 베이를 정리해 드릴 수 없습니다.`;
    const _lolo = (c.isLoloShip === true) || isLoloShipByPolicy(_vslT, {}, [info.voy, info.voyage, info.callsign].filter(Boolean));
    if (_lolo) return `${_vslT ? _vslT + ' ' : ''}이 배는 덱플랜 배라 베이 단위로 정리해 드릴 수 없습니다.`;
    const tr = tidyBayAnswer(_rowsT, { info, mode: p.bayTidy.mode || (c.mode === 'loading' ? 'loading' : 'discharge'), now: c._now || Date.now(), bays: p.bayTidy.bays, workers: Array.isArray(c.workers) ? c.workers : null });
    if (c._trace && typeof c._trace === 'object') c._trace.tidy = tr.rep;
    return `${_vslT ? _vslT + ' ' : ''}${tr.text}`;
  }

  //  ① 콘 이야기 — 콘앱이면 콘 지식이 먼저. 단 검수 속성(끝네자리·온도·실번호·엑스레이…)을 물으면 검수 답이 우선이다
  //    (2.48 — 종전엔 콘앱에서 «베이»만 들어가면 콘 답이 전부 가로챘다. 관문 2 실측).
  //  ★ 3.43-01 — «진행» 을 묻는 말(«실제 진행 상황»·«얼마나 했어»)은 콘앱에서도 ⑥ 진행 두 갈래로 간다. 종전엔 nlSearch 가 «상황» 을
  //    briefingQuery 로도 세워 콘앱만 ①이 브리핑을 먼저 냈다 — 검수앱은 ⑥, 콘앱은 ① 로 **같은 말에 다른 답**(검수사 2026-09-11
  //    «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 합니다», 실측 KBTR 2606E). 판정은 ⑥의 _progressLike 와 같은 식 한 벌.
  const _progressLike = /진행|어디까지\s*(?:했|왔|됐)|얼마나\s*(?:했|됐)|몇\s*(?:프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(?:했|됐)/.test(q)
    || (/현황(?!\s*판)/.test(q) && !hasAnyCondition(p));
  //  ★ 4.17 — 조건(끝자리·규격·리퍼·베이·POD·자리·선사·데미지…)이 붙은 말은 아래 두 갈래(③ 지난 날 · ⑫ 자료 수집중)가 가로채지 않는다 — 종전 길로 간다.
  const _cargoCond = !!(p.digits || p.size || p.fe || p.type || p.bay || p.pol || p.pod || p.portAny || p.zone || p.dgClass || p.un || p.weightMin != null || p.weightMax != null
    || p.temp != null || p.tierStackQuery || p.bottomQuery || p.topQuery || p.vacantQuery || p.posQuery || p.bayDistQuery || p.shiftingQuery || p.dmgQuery || p.carrierQuery
    || p.luggQuery || p.urgentQuery || p.sealAuditQuery || p.twinCheckQuery || p.crewSet || p.crewQuery || p.gangSet || p.gangQuery || p.startSet || p.paceQuery || p.entityAttr);
  //  ★ 4.17 (검수사 §7.8-③ «모든걸 알수 있으면 도움이 됨») — 지난 날(어제·그제…) 진행·작업 선박은 **날짜별 완료 기록**으로 답한다(§4.2-F-5 «알려진 한계» 폐기 · 감사 26).
  //    날짜 말은 utils.dateWordOf 한 벌, 조 키는 근무일 기준(dayShiftKeys — 야간은 시작한 날, 00:00~06:29 는 전날 근무일). 사람·호기를 댄 말(«그제 김성일 몇 개 했어»)은
  //    종전대로 ⑧ 근무자 답, 조건이 붙은 말은 종전 길 — 여기서는 조건 없는 «몇 대 했어»·«진행»·«작업한 배» 만. 콘 이야기는 콘 갈래.
  {
    const _dwP = dateWordOf(q);
    if (_dwP && _dwP.off < 0 && !/콘/.test(q) && !_cargoCond && !p.etaQuery && !p.handoverQuery) {
      const _shW = /야간|밤/.test(q) ? '야간' : /주간|낮/.test(q) ? '주간' : null;
      const _now = c._now || Date.now();
      const _shipListQ = /선박|배(?![정분치])|척|대상/.test(q) && /작업|양하|선적|일정|했|일한|들어온/.test(q) && !/몇\s*(?:대|개|건)|갯수|개수|대수/.test(q);
      const _countQ = p.progressQuery === 'done' || _progressLike || /몇\s*(?:대|개|건)|갯수|개수|대수|작업량|실적/.test(q);
      if (!v && c.voyages && _shipListQ) { _via('pastDay'); return _pastDayShips(c.voyages, _dwP, _now); }
      if (_countQ && p.progressQuery !== 'pending') {
        if (v) { _via('pastDay'); return _pastDayDone(v, ship, _dwP, _shW, p.mode || null, _now); }
        if (c.voyages) { _via('pastDay'); return _pastDayDoneAll(c.voyages, _dwP, _shW, p.mode || null, _now); }
      }
    }
  }
  //  ★ 4.17 (검수사 §7.8-⑫ «자료 수집중») — 선적이 리스트뿐이고 아직 안 실은 배(dataReadiness.loadingCollecting 한 벌)는 «얼마나 남았어»·진행·«언제 끝나» 의
  //    선적 잔여·총 잔여를 수로 내지 않는다 — 검수앱·콘앱이 서로 다른 수를 냈다(감사 421). 터미널 본선현황으로 세는 배(§3.74)는 터미널 수 그대로.
  if (hasShip && v && !/콘/.test(q) && !_cargoCond && !/자료|브리핑|요약|인계|인수/.test(q) && (p.progressQuery || _progressLike || p.etaQuery)) {
    const _vc = _vcOf();
    if (_vc && _vc.collecting) { _via('collecting'); return _collectingAnswer(ship, _vc, p.mode || null); }
  }
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
                gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m), compMap: c.compMap || null, shiftMap: c.shiftMap || null, records: (v && v[m] && v[m].records) || null, edi: (v && v[m] && v[m].ediContainers) || null });
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

  //  ②-3-B ★ 4.34-02 작업 멈춤 — 검수사 2026-10-18 14:49 «미르가 작업신호가 없으면 불안해 합니다. 그래서 쉬고 있으라고 알려준것이고. 다른 사용자가 왜 작업또는 일 안해 하고 물으면 중단사유를 알려줘야 합니다.»
  //    ① «미르야 강풍대기 상태야 쉬고 있어» → 중단 사유로 적는다(저장은 화면이 fbAddWorkReport 로 — 작업 보고의 «작업 중단»과 같은 기록이라 미르 초조함도 꺼지고 다른 검수원·미르도 같은 사유를 읽는다).
  //    ② «왜 작업 안 해?» → 앱 중단 보고가 있으면 그 사유·시각을 알려 준다. 보고가 없으면 건드리지 않는다(아래 옛 길이 답한다). 야드 갈래보다 먼저 본다(«야드 혼잡» 이 사유일 수 있다).
  {
    const _hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    //  ★ 4.76 «야식 시간 몇 시야» — 그 배 부두의 근무표(WORK_SHIFTS) 자정 걸친 쉬는 시간이다. 배 부두를 모르면 두 부두 다.
    if (!p.pauseSet && !p.moveSet && /야식/.test(q) && /시간|언제|몇\s*시|타임/.test(q) && !/뭐|메뉴|추천|먹/.test(q) && !/끝나|끝날|끝나는|마치|마쳐|마무리|완료|걸려|걸리|남았|남은|ETA/i.test(q)) {   // 끝나는 시각을 물은 말(«야식 지나서 몇 시에 끝나?»)은 ETA 가 답한다
      _via('workStop');
      const _one = (pier) => {
        const w = (WORK_SHIFTS[String(pier).toUpperCase()] || WORK_SHIFTS.PCTC).slice().sort((x, y) => x[0] - y[0]);
        const e = w[w.length - 1][1], s0 = w[0][0] + 1440;
        const f = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        return `${pier} 야식은 ${f(e)}~${f(s0)} (${s0 - e}분)`;
      };
      return (v ? [_one(pierOf(v))] : [_one('PNCT'), _one('PCTC')]).join(' · ') + '이에요 🐱 근무표 그대로예요.';
    }
    //  ★ 4.76 호기 이동 — «1호기 철수»·«2호기로 이동»·«1호기 복귀»·«철수 취소». 기록은 화면(MirFab·SearchPanel)이 crane_move 보고로 적는다(craneMove.js).
    //    검수사 2026-11-08 «1호기 철수라고 했을때 미르가 1호기 작업중단을 했어야 했고 제가 2호기로 이동한것을 인지 했어야 합니다».
    //  ★ 5.13-01 «취소» 한 마디 — 기다리는 일(4.40 [이동]·[취소] 단추)이 없으면 대화 층이 못 받아 잡담·모델로 가서 «취소 처리했어요!» 라고 했다(아무것도 안 했는데).
    //    무엇을 취소할지 묻고 아무것도 바꾸지 않았다고 말한다. 기다리는 일이 있으면 대화 층(mirThreadResolve actNo)이 먼저 받아 여기까지 오지 않는다.
    if (/^취소(?:\s*(?:해|하)?\s*(?:줘|주세요|줄래|요|할게요?|합니다|해요))?[\s.!~?？]*$/.test(String(q || '').replace(/^\s*미르(?:야|아)?[\s,]*/, '').trim())) {
      _via('cancelBare');
      return '무엇을 취소할까요? 🐱 아무것도 바꾸지 않았어요. 방금 미르가 적은 작업보고면 «보고 취소», 호기 철수를 거두려면 «철수 취소» 라고 말해 주세요.';
    }
    //  ★ 5.13 작업보고 전달 — 적는 손은 화면(MirFab·통합검색)이다. 여기서는 받았다는 말만(실제 결과·되읽기·되묻기는 화면이 적은 뒤 붙인다).
    //  ★ 5.29-04 — 미르를 부르지 않은 작업보고 말(검색창 «15:45 4호기 작업중단 강풍대기»)은 적지 않는다(5.13 — 부른 말만 적는다). 엉뚱한 답(«갱 배분 — 베이사전») 대신 그렇게 말한다.
    if (p.workRep && p.workRep.kind === 'status' && /^(?:pause|resume)$/.test(p.workRep.verb) && !(p.mirCalled || c.mirBox) && app !== 'cone') {   // 감사 하 1 — 완료·시작·해치·콘박스 말은 종전 조회 답
      _via('workReportHint');
      const w = p.workRep;
      const eqs = (w.equips && w.equips.length ? w.equips : [w.equip]).filter(Boolean).join('·');
      const hm = w.at ? ` ${String(w.at.hh).padStart(2, '0')}:${String(w.at.mm).padStart(2, '0')}` : '';
      return `📝 작업보고로 들었어요(${eqs}${hm} ${w.verb === 'pause' ? '작업 중단' : w.verb === 'done' ? '완료' : w.verb === 'resume' ? '재개' : w.verb === 'start' ? '시작' : '보고'}${w.reason ? ' · 사유 ' + w.reason : ''}) — 아직 안 적었어요. 앱에 적으려면 앞에 «미르야» 를 붙여 말하거나 미르 창(🐱)에서 말해 주세요.`;
    }
    if (p.workRep && (p.mirCalled || c.mirBox)) {
      _via('workReport');
      if (p.workRep.kind === 'cancel') return app === 'cone' ? '콘앱 미르는 작업보고를 적지 않아요 🐱 검수앱 미르에서 해 주세요.' : '방금 미르가 적은 작업보고를 되돌릴게요 🐱';
      if (!hasShip || !v) return '어느 배 보고인지 몰라 적지 못했어요 🐱 배 이름을 붙여 주세요. (예: "미르야 KSKM 2호기 양하 완료")';
      if (app === 'cone' || !c.moveRecorder) return '알겠어요 🐱 다만 이 화면에서는 작업보고가 적히지 않아요 — 검수앱 미르(떠 있는 미르 칸이나 검색줄에서 "미르야")에서 말씀해 주세요.';
      return '📝 작업보고 확인할게요 🐱';   // 5.13-01: 옛 문구(적는 중이라는 말)는 되묻기(안 적음) 위에서도 적은 것처럼 읽혔다(라이브 확인)
    }
    if (p.moveSet && p.moveSet.kind === 'ship' && (p.mirCalled || c.mirBox)) {
      //  5.14 «2호기 04:00 KSKM으로 이동» — 호기가 다른 배로 옮김. 앱 자료(그 조 등록·완료 기록)와 맞춰 보고, 시각이 어긋나면 왜 다른지 묻는다(craneShipMove.js 한 벌).
      _via('shipMove');
      const M = p.moveSet;
      const _vs = (c.voyages && typeof c.voyages === 'object') ? c.voyages : null;
      const _now = c._now || Date.now();
      if (!_vs) return `알겠어요 🐱 이 화면은 다른 배 자료를 갖고 있지 않아 ${M.equip} 이동을 적지 못했어요. 떠 있는 미르(검색줄 «미르야»)에게 말씀해 주세요. 아무것도 바꾸지 않았어요.`;
      let _tk = '';
      try { const _sc = _vs ? pickShipCtx(M.toShip, _vs, null) : null; _tk = (_sc && _sc.key) || ''; } catch (e) { console.warn('[미르] 옮긴 배 찾기 실패:', e); _tk = ''; }
      if (!_tk) return `알겠어요 🐱 다만 ${M.toShip} 배를 지금 작업 목록에서 못 찾아 ${M.equip} 이동을 적지 못했어요. 배 이름을 다시 말씀해 주세요.`;
      const _pl = shipMovePlanOf(_vs, _tk, Number(String(M.equip).replace(/\D/g, '')) || 0, spokenTimeMs(M.hh, M.mm, _now), _now, M.toShip);
      if (app === 'cone' || !c.moveRecorder) return `${shipMoveAnswerOf(_pl, M.force).replace('적을게요', '들었어요')} 이 화면에서는 기록이 안 남아요 — 기록은 검수앱 미르에서 해 주세요.`;
      return shipMoveAnswerOf(_pl, M.force);
    }
    if (p.moveSet && (p.mirCalled || c.mirBox)) {
      _via('workStop');
      if (!hasShip || !v) return '알겠어요 🐱 다만 어느 배인지 몰라 호기 이동을 적지 못했어요. 배 이름을 붙여 주세요. (예: "미르야 KKLC 1호기 철수")';
      const M = p.moveSet;
      if (M.kind === 'roro') return '105호기는 램프(RORO)라 갱으로 안 셉니다 🐱 기록하지 않았어요. 크레인 호기(1~4호기)로 말씀해 주세요.';
      if (M.kind === 'range') return `평택 크레인은 1~4호기만 압니다 🐱 ${M.equip}은 기록하지 않았어요. 1~4호기로 말씀해 주세요.`;
      if (M.kind === 'cancel') {
        const _ws = withdrawnCranesOf(v);
        const _w = M.equip ? _ws.find((x) => x.equip === M.equip) : _ws[0];
        if (!_w) return M.equip ? `${koJosa(M.equip, '은')} 철수로 적힌 기록이 없어요 🐱 취소할 게 없어서 아무것도 안 바꿨어요.` : '취소할 철수 기록이 없어요 🐱 아무것도 안 바꿨어요.';
        if (app === 'cone' || !c.moveRecorder) return `알겠어요, ${_w.equip} 철수 취소라고 들었어요 🐱 이 화면에서는 기록이 안 남아요 — 기록은 검수앱 미르(검색줄 마이크를 누르고 "미르야" 하면 나오는 미르 칸)에서 해 주세요.`;
        return `🏗 ${_w.equip} 철수 취소(복귀) — 적을게요 🐱 지금 일하는 호기 수가 바뀐 걸로 보고 끝나는 시각을 다시 계산해요.`;
      }
      const _txt = M.kind === 'withdraw' ? `${M.equip} 철수${M.to ? ` · ${M.to}로 이동` : ''}`
        : M.kind === 'move' ? `${M.equip ? M.equip + '에서 ' : ''}${M.to}로 이동`
        : `${M.equip} 복귀`;
      if (app === 'cone' || !c.moveRecorder) return `알겠어요, ${_txt}라고 들었어요 🐱 이 화면에서는 기록이 안 남아요 — 기록은 검수앱 미르(검색줄 마이크를 누르고 "미르야" 하면 나오는 미르 칸)에서 해 주세요.`;
      return `🏗 ${_txt} — 적을게요 🐱 지금 일하는 호기 수가 바뀐 걸로 보고 끝나는 시각을 다시 계산해요. (되돌리려면 "철수 취소"·"N호기 복귀")`;
    }
    if (p.pauseSet && (p.mirCalled || c.mirBox)) {
      _via('workStop');
      const R = p.pauseSet.reason;
      //  4.42-02 (2차 시뮬 6): 멈춤을 분명히 알린 말(사유 낱말·«작업 중단»)의 규칙 답만 강한 답이다(isWeakAnswer). «소리 멈춰»·«스캔 못 해» 처럼 잘못 잡았을 수 있는 말은 종전대로 약한 답.
      if (p.pauseSet.sure && c._trace && typeof c._trace === 'object') c._trace.pauseSure = true;
      if (!hasShip || !v) {
        //  ★ 4.42-02 — 배 이름 없이 미르의 화남(«DJCF·STSE … 75분째 없어요»)에 답한 멈춤 알림은 화난 그 배들 얘기다(pauseTargetsOf — 화남 판정 한 벌). 적는 것은 화면(MirFab)이 같은 판정으로 한다.
        //    검수사 2026-10-21 13:25 «시간상 작업중인데 작업량이 없어서 미르가 화남 상태 상황을 알려줬더니» — 실입력 «아무래도 강풍대기 인듯 하네».
        //    적는 손은 떠 있는 미르(MirFab — mirBox)뿐이다 — 그 칸에서만 대상을 고르고, 고른 대상은 trace.pauseTargets 로 화면에 넘긴다(화면은 이것만 적는다 · 감사 중-1·중-2).
        //    여러 배를 한꺼번에 적는 것은 날씨 사유(강풍·안개·우천 — 부두가 같이 멈춘다)뿐이다. 장비 고장·야드 혼잡·점심·사유 없음은 한 배 일일 수 있어 «… 중 어느 배요?» 로 되묻는다(감사 권고).
        //    2차 시뮬 1·2·4 — 잘못 잡았을 수 있는 말(sure 아님 — «소리 멈춰»·«잠깐 쉬고 올게»·«YT 대기»)은 대상을 고르지 않는다(한 척이어도) · 글에 영문 배 이름 꼴이 있는데 앱 항차에서 못 찾았으면
        //    화난 다른 배로 돌리지 않는다(«MCAT 작업중단 …») · 화난 배가 없고 같은 사유로 이미 멈춤이 적힌 배가 있으면 «이미 적혀 있어요».
        if (c.mirBox && p.pauseSet.sure && c.voyages && typeof c.voyages === 'object') {
          const _now = c._now || Date.now();
          const _tok = (String(p.pauseSet.raw || q).toUpperCase().match(/(?<![A-Z])[A-Z]{4}(?![A-Z])/g) || []).filter((w) => !/^(?:STOP|WIND|RAIN|WAIT|REST|YARD|GANG|PCTC|PNCT|LOLO|RORO|XRAY|CFS|TIDE|GATE|BERT|HOLD|DECK)$/.test(w));   // 배 코드 꼴(영문 네 글자)만 — «TOS·GPS·CATOS» 는 배 이름이 아니다(2차 시뮬 재)
          if (_tok.length) return `${_tok[0]} — 앱 항차 목록에서 그 배를 찾지 못해 적지 못했어요 🐱 배 이름(영문 네 글자)을 확인해서 다시 말씀해 주세요.`;
          const _tg = pauseTargetsOf(c.voyages, c.heartbeat || null, _now);
          if (_tg.length) {
            const _nm = _tg.map((x) => x.vsl || String(x.key).split('_')[0]).join('·');
            if (_tg.length > 1 && !/^(?:강풍|안개|우천) 대기$/.test(R)) return `알겠어요, ${p.pauseSet.known ? koJosa(R, '으로') + ' ' : ''}멈춘 배가 ${_nm} 중 어느 배요? 🐱 배 이름을 붙여 말씀해 주시면 그 배에 적을게요.`;
            if (c._trace && typeof c._trace === 'object') c._trace.pauseTargets = _tg.map((x) => x.key);
            return `⏸ ${_nm} — ${p.pauseSet.known ? koJosa(R, '으로') + ' ' : ''}작업이 멈춘 걸로 적을게요 🐱 작업 신호가 없어도 기다릴게요. 누가 왜 쉬냐고 물으면 이 사유를 알려 드려요.`;
          }
          const _pz = [];
          for (const [k0, v0] of Object.entries(c.voyages)) {
            if (!v0 || !v0.info || !isWorkingNow(v0, _now)) continue;
            const w0 = workPauseOf(v0, _now);
            if (w0 && (!p.pauseSet.known || w0.reason === R)) _pz.push({ vsl: v0.info.vsl || String(k0).split('_')[0], w0 });
          }
          if (_pz.length) return `알겠어요 🐱 ${_pz.map((x) => `${x.vsl} ${_hm(x.w0.ts)} 중단(사유 ${x.w0.reason || R})`).join(' · ')} — 이미 앱에 적혀 있어요. 작업 신호가 없어도 기다릴게요.`;
        }
        return `알겠어요, ${p.pauseSet.known ? koJosa(R, '으로') + ' ' : ''}쉬는 걸로 들었어요 🐱 다만 어느 배인지 몰라 적지 못했어요. 배 이름을 붙여 주세요. (예: "미르야 MCAT ${R.replace(' ', '')}")`;
      }
      if (app === 'cone') return `알겠어요, ${p.pauseSet.known ? koJosa(R, '으로') + ' ' : ''}쉬는 걸로 들었어요 🐱 중단 기록은 검수앱 작업 보고 → 작업 중단에서 남겨 주세요 — 콘앱은 적는 손이 없어요.`;
      const wp0 = workPauseOf(v, c._now || Date.now(), null, { perEquip: true });
      if (wp0 && (wp0.reason === R || !p.pauseSet.known)) return `알겠어요 🐱 앱에도 ${wp0.equipKo ? wp0.equipKo + ' ' : ''}${wp0.ko} ${_hm(wp0.ts)} 중단(사유 ${wp0.reason || R})으로 기록돼 있어요. 누가 왜 쉬냐고 물으면 그 사유를 알려 드릴게요.`;
      return p.pauseSet.known
        ? `⏸ ${koJosa(R, '으로')} 작업이 멈춘 걸로 적을게요 🐱 작업 신호가 없어도 기다릴게요. 누가 왜 쉬냐고 물으면 이 사유를 알려 드려요.`   // 4.42-02: koJosa — «장비 고장으로»(종전 «장비 고장로»)
        : `⏸ 작업이 멈춘 걸로 적을게요 🐱 사유는 쉬는 중으로 남겨 둘게요 — 야드·강풍·안개·우천·장비 고장처럼 말씀해 주시면 사유를 바꿔 둘게요. 작업 신호가 없어도 기다릴게요.`;
    }
    if (v && /왜|이유|어째서|어때서|(?:중단|멈춘|대기)\s*(?:사유|이유)|사유\s*(?:가|는|이)?\s*(?:뭐|무엇|알려)|무슨\s*사유|뭐\s*때문/.test(q) && /작업|일|양하|선적|하역|쉬|멈|중단/.test(q)   /* 5.29-04 재감사: «중단 사유 뭐야» 도 */ && /안\s*해|안\s*하|안\s*돼|안\s*되|멈|쉬|중단|못|없|조용/.test(q) && !/느려|느린|늦|지연/.test(q)) {
      const wp1 = workPauseOf(v, c._now || Date.now(), null, { perEquip: true });
      if (wp1) {
        _via('workStop');
        const tail1 = wp1.resumeAt ? (( c._now || Date.now()) < wp1.resumeAt ? ` ${wp1.breakKo}과 겹쳐 보통 ${_hm(wp1.resumeAt)}에 재개돼요.` : ` 보통 ${_hm(wp1.resumeAt)} 재개인데 아직 재개·완료 기록이 없어요.`) : '';
        return `${hasShip && ship ? ship + ' — ' : ''}${wp1.equipKo ? wp1.equipKo + ' ' : ''}${wp1.ko} 작업이 ${_hm(wp1.ts)}부터 중단 중이에요. 사유는 ${wp1.reason || '적혀 있지 않아요'}.${tail1}`;
      }
    }
    //  ★ 5.29-04 «작업이 멈춘 지 얼마나 됐지» — 멈춘 뒤 지난 시간. 종전엔 답이 없어 모델이 «얼마나 남았어»(잔여 대수)로 바꿨다(실측 2026-11-28 17:24 STMJ 2675E).
    //    중단 보고(말한 시각 saidAt 포함)가 있으면 그때부터, 없으면 마지막 완료 기록 시각으로 말한다(중단 보고가 없다는 것도 말한다).
    if (v && !/남았|남은|남아|남나|끝나|끝날|끝내|마칠|완료\s*예정/.test(q) && !/(?:바람|비|눈|소리|알림|화면|폰|앱|노래|음악|진동)\s*(?:이|가|은|는)?\s*(?:멈|그친|그쳤|중단)/.test(q) && /(?:멈춘|멈췄|멈춰|중단된|중단한|중단되|쉰|쉬기\s*시작한|작업\s*안\s*한)\s*(?:지|게|거|것)\s*(?:얼마|몇\s*(?:분|시간))|(?:멈춘|중단된|쉰)\s*지\s*(?:얼마|몇)|언제부터\s*(?:멈췄|멈춘|중단(?:됐|된|했)|쉬었|쉰|작업\s*안\s*했)/.test(q)) {   // 감사 중 4 — «멈춘 다음 얼마나 남았어»·«언제부터 쉬는 시간이야» 는 아니다
      _via('pauseAgo');
      const _n = c._now || Date.now();
      const _dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
      const wp2 = workPauseOf(v, _n, null, { perEquip: true });
      if (wp2) return `${hasShip && ship ? ship + ' — ' : ''}${wp2.equipKo ? wp2.equipKo + ' ' : ''}${wp2.ko} 작업이 ${_hm(wp2.ts)}부터 멈췄어요 — ${_dur(_n - wp2.ts)}째예요. 사유 ${wp2.reason || '적혀 있지 않아요'}.`;
      let lastAt = 0, lastMode = '';
      for (const m of ['discharge', 'loading']) { const comp = v[m] && v[m].completed; if (!comp || typeof comp !== 'object') continue; for (const x of Object.values(comp)) { const at = x && Number(x.at); if (at && at <= _n + 5 * MIN && at > lastAt) { lastAt = at; lastMode = m; } } }
      let _rp = null;   // 감사 중 1 — 중단 보고는 있는데 뒤에 완료 기록이 있어 재개로 본 경우는 그렇게 말한다(«중단 보고는 없어요» 는 거짓)
      try { for (const [k, r] of Object.entries(v.reports || {})) { if (!r || (r.type !== 'external_pause' && !(r.type === 'work_status' && /pause$/.test(String(r.action || ''))))) continue; const t0 = Number(r.saidAt) || Number(r.ts) || Number(k) || 0; if (t0 && _n - t0 < 12 * 3600000 && (!_rp || t0 > _rp.t0)) _rp = { t0, equip: String(r.equip || ''), reason: String(r.reason || '') }; } } catch (e) { console.warn('[미르] 중단 보고 읽기 실패:', e); }
      if (_rp && lastAt > _rp.t0) return `${hasShip && ship ? ship + ' — ' : ''}${_rp.equip ? _rp.equip + ' ' : ''}${_hm(_rp.t0)} 중단 보고(사유 ${_rp.reason || '없음'})가 있지만 그 뒤 ${_hm(lastAt)}에 완료 기록이 있어 다시 일한 것으로 봐요 — 마지막 완료는 ${_dur(_n - lastAt)} 전이에요.`;
      if (_rp) return `${hasShip && ship ? ship + ' — ' : ''}${_rp.equip ? _rp.equip + ' ' : ''}${_hm(_rp.t0)} 중단 보고(사유 ${_rp.reason || '없음'})가 있지만 그 뒤 재개·완료 보고가 있어 지금은 멈춘 상태로 보지 않아요${lastAt ? ` — 마지막 완료 기록은 ${lastMode === 'loading' ? '선적' : '양하'} ${_hm(lastAt)}(${_dur(_n - lastAt)} 전)이에요` : ''}.`;   // 5.29-04 재감사: 중단 보고가 있는데 «없어요» 라 하지 않는다
      if (lastAt) return `${hasShip && ship ? ship + ' — ' : ''}앱에 중단 보고는 없어요. 마지막 완료 기록은 ${lastMode === 'loading' ? '선적' : '양하'} ${_hm(lastAt)} — ${_dur(_n - lastAt)} 전이에요. 멈췄으면 «미르야 15:45 3호기 4호기 작업중단 강풍대기» 처럼 시각·호기·사유를 붙여 알려 주세요.`;
      return `${hasShip && ship ? ship + ' — ' : ''}앱에 중단 보고도 완료 기록도 없어 멈춘 때를 몰라요 🐱 «미르야 15:45 4호기 작업중단 강풍대기» 처럼 알려 주시면 그 시각으로 적어요.`;
    }
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
  //  ★ 5.28-02 — «미르야 TMPZ 몇 대야»·«미르야 몇 대야» 는 대수 물음이다(라이브 실측 2026-11-27 — 인사로 빠졌다). 부름을 떼면 «TMPZ 몇 대야» 와 같은 길로 간다.
  const _bareCall = p.mirCalled && !BARE_COUNT_RE.test(q) && !RZOR_LEARN_RE.test(q) && !hasAnyCondition(p) && !p.factQuery && !p.briefingQuery && !p.progressQuery && !p.etaQuery && !p.introQuery && !p.shipIntroQuery && !p.timeQuery && !p.asking && !WORK_ANALYSIS_RE.test(q) && !EXPECT_TIME_RE.test(q);   // 4.39-01: «미르야 작업 분석해줘» 를 인사로 받지 않는다(Q 는 아래에서 정해진다 — q 로 잰다)
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
    || RZOR_LEARN_RE.test(Q)   // 4.44: «RZOR 학습 현황» — 수집기 2.45 채점 요약(수석 통계)
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
    if (RZOR_LEARN_RE.test(Q)) { _via('rzorLearn'); return _err(cd.rzorLearn, 'RZOR 학습 기록') || answerRzorLearn(cd.rzorLearn === undefined ? null : cd.rzorLearn); }   // 4.44-01: 길 표시 — «학습»·«현황» 이 사전에 없어도 모델로 안 넘긴다(10-23 실측 — 미르 칸에서 모델이 «배 이름을 붙여» 로 덮었다)
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
      const _d = diffEdiList(_sec, _raw, _mode === 'discharge' ? shiftSetOfVoyage(v, c.voyageKey || '', null) : undefined);   // 4.82: 시프팅 확정(수동 표기 포함)으로 평택 양하분에서 빠진 컨은 «EDI 만 있음» 이 아니다
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
  if (p.crewSet || (p.crewQuery && !(p.crewQuery.kind === 'poolPlan' && !v))) {   // 5.16: 배 없는 «교대표» 는 아래 갈래로
    if (!v) return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: «OBWH 1호기 홍길동 3호기 김철수» · «SWMM 홍길동 몇 개 했어»';
    if (p.crewSet && app === 'cone') return '호기 검수원은 검수앱에서 적어 주세요 — 콘앱은 적는 손이 없어요.';   // 재감사: 콘앱엔 fbSetVoyageCraneCrew 가 없다
    if (p.crewSet) { try { return crewSetText(resolveCrewSides(p.crewSet, v), ship, c._now || Date.now(), (v && v.info) || null); } catch (e) { /* 본체로 */ } }
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
    //  4.39-01: «작업 분석(해줘)» · 시작 전 «예상 작업시간» · «2갱으로 하면 몇 시간» — 화면 «예상 작업 시간» 줄과 같은 계산(검수사 2026-10-19 22:02).
    //    «작업 분선해줘» 는 실제 입력 오타(21:47). «2갱으로» 는 계산 가정일 뿐 갱 수를 적지 않는다(gangSet 아님).
    const _notAsk = /하지\s*마|어제|그제|지난|틀렸|틀려|이상해|없애|지워|안\s*맞/.test(Q);   // 감사 M4 — 하지 말라는 말·지난 날·틀렸다는 말은 계산을 내지 않는다(«2갱 말고 3갱» 의 «말고»·«왜 이렇게 길어» 의 «왜» 는 막지 않는다 — 재감사)
    const isAccQ = DISCHARGE_ACC_RE.test(Q) && !p.howToQuery && !_notAsk && !/높이|올리|설명|방법|설정|보는\s*법|어떻게|왜|뜻/.test(Q);   // 조건 검사는 안 한다 — «양하» 낱말이 모드 조건으로 잡힌다   // 4.56: «양하 정확도» — 출발항별 일치율
    if (isAccQ && !v) return _via('shipAsk'), '어느 배 말씀인지 배 이름을 붙여 주시면 바로 답합니다. (예: "DPRT 양하 정확도")';
    const isAnalysisQ = WORK_ANALYSIS_RE.test(Q) && !p.howToQuery && !hasAnyCondition(p) && !_notAsk;
    const _ghs = [...Q.matchAll(/([1-4])\s*갱\s*(?:으로|이면|기준|일\s*때|이라면|짜리|씩)/g)];   // «2갱 말고 3갱으로» 는 뒤 숫자
    const gangsHyp = _ghs.length ? Number(_ghs[_ghs.length - 1][1]) : 0;
    const isExpectQ = !isAnalysisQ && !isGangQ && !p.howToQuery && !_notAsk && (EXPECT_TIME_RE.test(Q) || (gangsHyp > 0 && /시간|걸|끝|얼마/.test(Q)));   // «예상 작업 시간 어디서 봐» 는 기능 위치 질문(매뉴얼)
    const anyCalc = isArrivalQ || isHatchQ || isGangQ || isMoveQ || isFirstQ || isXrayShiftQ || isShiftBriefQ || isAnalysisQ;
    if (isAnalysisQ && !v) return _via('shipAsk'), '어느 배 말씀인지 배 이름을 붙여 주시면 바로 분석합니다. (예: "ATPR 작업 분석")';   // 4.39-01 — 배 되묻기(배 고르기 단추가 붙는다 · 모델로 안 보낸다)
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
      if (isAccQ) {
        try {
          let _rowsA = _mvGiven || [];
          if (!_mvGiven || hasAnyEdi(_voy)) { try { _rowsA = flattenVoyages({ [c.voyageKey || '_']: _voy }); } catch (e) { _rowsA = c.voyageKey ? cs.filter((x) => !x || !x.voyageKey || x.voyageKey === c.voyageKey) : cs; } }
          return _via('dischargeAcc'), answerDischargeAccuracy(_voy, ship, _rowsA);
        } catch (e) { console.warn('[미르] 양하 정확도 계산 실패:', e); }
      }
      try {
        if (isAnalysisQ || isExpectQ) {
          const _E = movesOfVoyage(_voy, c.voyageKey || '', _mvGiven);   // 화면 «예상 작업 시간» 줄과 같은 계산 한 벌
          //  행 — 검수앱(EDI 있는 항차)은 항차 원본을 펴서(열린 탭과 무관 · 감사 M3), 콘앱은 넘겨받은 행. E 도 같은 규칙(hasAnyEdi)으로 센다.
          //  자료 수집중 — «몇 시에 끝나»·«총 무브수» 가 쓰는 머리 판정(_vcOf: 터미널 본선현황이 있으면 그 수로 세고 수집중이 아니다) 한 벌(재감사 N1 — RZOR 콘앱만 수집중으로 갈렸다)
          const _coll = (() => { try { return (_vcOf() || {}).collecting === 'loading'; } catch (e) { return false; } })();
          if (isAnalysisQ) {
            let _rows = _mvGiven || [];
            if (!_mvGiven || hasAnyEdi(_voy)) { try { _rows = flattenVoyages({ [c.voyageKey || '_']: _voy }); } catch (e) { _rows = c.voyageKey ? cs.filter((x) => !x || !x.voyageKey || x.voyageKey === c.voyageKey) : cs; } }
            const _a = answerWorkAnalysis(_voy, ship, _rows, _E, { gangsHyp, rfSkip: !!c.rfSkip, collecting: _coll });
            if (_a) { _via('workAnalysis'); return _a; }
          }
          //  예상 시간은 완료 10대 전까지만 — 화면 줄과 같은 «처음 시작할 때» 계획값이다. 그 뒤에는 실측 페이스(종전 길)가 답한다(갱 수 가정이 있어도).
          else if (_E && !_coll && _E.done < 10) return _via('workAnalysis'), [`⏱ ${ship || '이 배'} 예상 작업 시간 — 평택 ${_E.n20 + _E.n40}대${_E.shiftN ? ` · 시프팅 ${_E.shiftN}대` : ''} (${_E.done > 0 ? `완료 ${_E.done} · ` : '시작 전 · '}정상 작업 기준 · 처음부터의 계획값)`].concat(workTimeLinesOf(_E, gangsHyp)).join('\n');   // 화면 줄과 같은 «완료 10대 전까지» (감사 M1) · 수집중이면 종전 길(감사 M2)
          else if (_coll) { _via('collecting'); return _collectingAnswer(ship, _vcOf(), null); }   // 선적 자료 수집중 — «몇 시에 끝나» 와 같은 «자료 수집중» 답
          //  시작한 배(완료 10대 이상) — «몇 시에 끝나» 와 같은 실측 페이스 답(그 말 그대로 한 번 돌린다 · 기능 관문 4.37-02 와 같은 꼴). 강한 답일 때만 쓰고, 아니면 종전 길.
          //    종전엔 규칙이 못 받아 번역이 «예상 작업시간은 2갱으로» 를 «갱 2개» 로 옮겨 갱 분배(«베이매트릭스가 없어…»)로 샜다. «N갱» 가정은 버린다고 밝힌다(재감사).
          else if (_E && !(ctx && ctx._expectInner)) {
            const _t2 = {};
            const _base = answerOneRaw('몇 시에 끝나', { ...(ctx || {}), _expectInner: true, _fhLoose: true, accepted: false, _trace: _t2 });
            if (_base != null && !isWeakAnswer('몇 시에 끝나', _base, _t2)) {
              _via('expectEta');
              //  바탕 답이 터미널 수로 «아직 시작 전» 이면(앱 완료는 10대를 넘었어도 본선현황이 아직 0) «이미 시작돼» 를 붙이지 않는다 — 한 답 안에서 서로 어긋나지 않게(3차 감사 권고)
              return (gangsHyp > 0 && _E.done < (_E.units || 0) && !/아직\s*시작\s*전/.test(_base)) ? `${_base}\n· 작업이 이미 시작돼(완료 ${_E.done}대) ${gangsHyp}갱 가정 대신 실측 페이스로 셌어요 — 갱 수를 가정한 계산은 완료 10대 전까지만 해요` : _base;
            }
          }
        }
        if (isArrivalQ) return answerDataArrival(_voy, ship);
        if (isHatchQ) return answerHatchStatus(_voy, de, ship) || answerVoyageFacts({ factQuery: 'hatch' }, c);
        if (isGangQ) return answerGangSplit(_voyE, de, ship);
        //  4.02: 콘앱도 같은 계산 — 콘앱이 넘긴 컨(cs)으로 트윈·무브를 센다(검수사 «콘앱 첫 답 «EDI 가 아직 없어» 는 통합이 안 된 것»). 시프팅 수는 콘앱이 합친 수(shiftN).
        //  4.48 감사(중-C) — 콘앱은 EDI 원문이 없어 예보를 스스로 못 센다. 콘앱이 넘긴 시프팅 지도(ctx.shiftMap — 확정 + 본선 잔류 예보)의 예보 수를 같이 넘겨 검수앱과 같은 끝줄(«시프팅 64 (확정 62 · 🟡 예보 2 …)»)을 낸다.
        const _cone = _isCone && !hasAnyEdi(_voy) && Number.isFinite(c.shiftN);
        const _kfN = _cone && c.shiftMap ? Object.values(c.shiftMap).filter(isKeepShift).length : 0;
        if (isMoveQ) return answerTotalMoves(_voy, ship, { eta: movesOfVoyage(_voy, c.voyageKey || '', _mvGiven), shifting: _cone ? c.shiftN : undefined, keepFc: _cone ? _kfN : undefined });
        if (isFirstQ) return answerFirstStart(_voyE, de, ship);
        if (isXrayShiftQ) return answerXrayShifts(_voyE, de, { shipName: ship, pier: info.pier, pace: workPaceOf(_voy, c.voyageKey || '', _mvGiven) });
        if (isShiftBriefQ) return answerShiftBriefing(_voyE, de, { shipName: ship, voyages: c.voyages || null, pace: workPaceOf(_voy, c.voyageKey || '', _mvGiven) });
        //  3.42: «2호기 11:15 시작했어» 는 적는 말이다 — 종전엔 gangQuery(n:null) 가 같이 켜져 «베이사전이 필요해요» 가 답을 가로챘다(판 B 시뮬). 저장은 화면(부수효과)이 한다.
        if (p.startSet && p.startSet.afterBreak && app !== 'cone') {   // ★ 5.29-04 재감사 5 — 쉼 끝 말(«강풍 끝나고 16:30 작업 시작»)은 앞선 항차 시작을 덮지 않는다(firebase 한 벌과 같은 판정)
          const _toMs = (x) => { const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(x || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0; };
          const _sm = parseSpokenTimeMs(p.startSet.raw || q, c._now || Date.now()) || 0;
          const _had = [_toMs(info.workStartManual), _toMs(info.workStartAt)].filter((x) => x > 0 && (!_sm || x < _sm)).sort((x, y) => x - y)[0];
          const _hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
          if (_had && (!_sm || _sm - _had < 24 * 3600000)) return `${ship} 작업 시작은 이미 ${_hm(_had)}로 적혀 있어 덮지 않아요 — 쉼 뒤 다시 하는 말로 들었어요. 호기 재개는 «미르야 16:30 3호기 작업 재개» 처럼 호기를 붙여 알려 주세요.`;
        }
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

  //  ★ 4.87-03 (검수사 2026-11-11 06:32 «문제를 알리고는 후속 질문에 답하는게 아직도 부족합니다» · 04:37 «문제 알림 문제상세보기 해결방법제시 해결 결과 유무»):
  //    같은 배·같은 검수원이 실번호 점검 답을 받고 60분 안에 «어떻게 해결해»(해결 방법)나 «해결됐어?»·«문제 어떻게 됐어»(해결 결과)를 물으면 받는다. 결과는 다시 세어 처음 알린 목록과 견준다.
  //    받는 말은 _sealFollowKind — 가리키는 말·해결 말만 남는 물음일 때만(감사 «부» 뒤 화이트리스트로 바꿨다 — «아직 남았어?»·«사진 수정 어떻게 해» 는 종전 답).
  { const _nowS = Number(c._now) || Date.now();
    const _fk = hasShip && _sealLive(c, _nowS) ? _sealFollowKind(Q) : '';
    if (_fk) {
      try {
        const _sa = _sealArgsOf(c, cs, v, mode, modeKr);
        const _nowList = sealProblemListOf(_sa[0], _sa[2], _sa[3]);
        const _snap = (_sealSnap && _sealSnap.key === _sealKeyOf(c) && _sealSnap.mode === (c.mode || '')) ? _sealSnap.list : null;
        const _ans = _fk === 'result' ? generateSealResultAnswer(_snap, _nowList, _sa[1]) : generateSealRemedyAnswer(_nowList, _sa[1]);
        _via('sealAudit');
        return _ans;
      } catch (e) { console.warn('[미르] 실번호 해결 후속 답 실패:', e); }
    } }
  //  4.87-02: 실번호 점검 답 뒤 10분 안의 «그 17대 뭐야»·«17개 뭐야» — 뜻풀이 길로 새기 전에 여기서 상세로 답한다(다른 주제어가 섞였으면 아니다 — _sealFollowRest).
  if (hasShip && _sealLive(c, Number(c._now) || Date.now()) && /\d+\s*(?:개|대|건)\s*(?:이|가|은|는)?\s*(?:뭐|뭔|무엇|무슨)/.test(Q) && _sealFollowRest(Q) === '') { _via('sealAudit'); return generateSealDetailAnswer(cs.filter((x) => x._mode === mode), modeKr, (v && v[mode] && v[mode].records) || null, (v && v[mode] && v[mode].ediContainers) || null); }
  //  ⑩ 브리핑 속 «N건» 후속 — 직전 주제가 실 점검·브리핑이면 그 상세(1.69-01).
  if (hasShip && /(?:\d+\s*건|그게|그거|저거|아까\s*(?:그|말한)\s*거?)\s*(?:이|가|은|는|이란)?\s*(?:뭐|뭔|무엇|무슨|내용|상세|자세)/.test(Q)) {
    const topic = p.sealAuditQuery ? 'seal' : c.lastTopic;
    if (topic === 'seal' || (topic === 'briefing' && /건/.test(Q))) return (topic === 'seal' ? generateSealDetailAnswer : generateSealAuditAnswer)(cs.filter((x) => x._mode === mode), modeKr, (v && v[mode] && v[mode].records) || null, (v && v[mode] && v[mode].ediContainers) || null);
  }

  //  ⑪ 뜻·방법 — 본체 한 벌(2.57-02·2.59-01). 홈은 조회 폴백이 없으니 못 찾으면 고백한다.
  if (p.asking === 'def') {
    try {
      const d = generateLocalAnswer(p, [], [], null);
      if (d) {
        //  3.42: 뜻풀이가 지식·사전이 아니라 **사용법 매뉴얼 추측**(generateHowToAnswer)에서 왔으면 약한 답 — «제일 무거운 컨 뭐야»가 «컨테이너 번호 수정» 매뉴얼로 잡혔다(판 B 시뮬)
        let strong = null; try { strong = mirKnowledge(q) || mirLearnedDef(q) || (p._learnedDef || null); } catch (e) { strong = null; }
        _via(strong ? 'termDef' : 'howTo');   // 4.35-02: 사전·원장이 뜻을 답했으면 모르는 낱말(안벽·예선…)이 남아도 얼버무린 답이 아니다 — 모델로 새지 않는다
        return d;
      }
    } catch (e) { /* */ }
  }
  if (p.asking === 'how') {
    try { const h = answerHowCore(p); if (h) { try { if (mirKnowledge(Q) === h) _via('knowledge'); } catch (e) { /* */ } return h; } } catch (e) { /* */ }   // 3.43-02: 원장 답은 표시해 둔다(모델 번역이 덮지 않게)
    if (!hasShip) { _via('unlearned'); return '그 방법은 아직 못 배웠습니다 😿 지어내지 않을게요. 개발자에게 전달해 둘게요.'; }
  }
  //  ★ 4.39-02 — «25번베이부터 해야 되는데 어떻게 바꾸지?»(검수사 2026-10-20 14:43 ATPR 2646E 실입력) — 종전엔 매뉴얼 추측이 «브리핑» 을 냈다(약한 답 → 모델). 콘앱에는 자동 가이드가 없어 종전 길.
  //    감사 C1 — 컨 옮기기(끝 네 자리·«컨·위치·자리»)·해치커버·트윈·실 같은 다른 질문은 가로채지 않는다.
  //  ★ 4.40 — 장 칩 안내 대신 미르가 옮긴다(검수사 2026-10-20 18:18 «그걸 바꿔 주십시요 25번 베이로 옮겨 드릴까요? 되묻고 이동 또는 취소 버튼을 보여주고 이동을 누르면 25번 베이 작업으로 갈수 있게»
  //    · 18:19 «모든 베이를 미르가 이동 시킬수 있게 해주시면 됩니다»). 답은 «○○ 양하 N번 베이로 옮겨 드릴까요?» — 화면이 [이동]·[취소] 단추를 단다(mirThreadCommit).
  //    «N번 베이로 바꿔·옮겨 줘»·«N번 베이부터 하자» 도 같은 길. «N번 베이로 이동·가자·보여 줘» 는 종전대로 베이플랜을 연다(planCommand — 엔진보다 먼저 돈다).
  if (app !== 'cone' && p.bay != null && !p.digits && isGuideGotoAsk(Q)) {   // 판정은 isGuideGotoAsk 한 벌(미르의 눈 mirSee 도 같은 것으로 비켜 준다)
    const g = guideGotoAnswerOf(c, parseInt(p.bay, 10), Q);
    _via(g.shipAsk ? 'shipAsk' : 'guideGoto');
    return g.text;
  }
  //  3.43-02: 기능 사용법(howToQuery)도 **실무 지식(원장)이 먼저** — «씰 잘림 대처법» 이 색인의 「실번호 입력」 기능 설명으로 갔다(검수사 실측
  //    «씰 잘림(씰 파손) 대처법을 물었는데 씰번호 틀림을 알립니다»). answerHowCore(asking=how)와 같은 순서.
  if (p.howToQuery) {
    try { const k = mirKnowledge(Q); if (k) { _via('knowledge'); return k; } } catch (e) { /* 원장이 막혀도 색인은 답한다 */ }
    try { const a = generateHowToAnswer(Q, p, { isChief: !!c.isChief }); if (a) { _via(/^📍 사용 매뉴얼/.test(a) ? 'featureHelp' : 'howTo'); return a; } } catch (e) { /* */ }   // 4.35-02: «사용법 알려줘» 홀로는 매뉴얼 안내가 정답이다 — 약한 답으로 보지 않는다
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
    const body = generateHandover(ptk, { byInspector: c.inspector || '', shipName: ship, voyageLabel: S(info.voyNo) || S(info.voy), damage: (() => { try { return Object.values({ ...((v && v.photoIndex) || {}), ...((v && v.photos) || {}) }).filter((x) => x && x.type === 'damage'); } catch (e) { console.warn('[미르] 인계 데미지 모으기 실패:', e); return []; } })(), extraNote: h.finalized ? (h.note || '') : '', rfSkip: !!c.rfSkip,
      loadCollecting: (() => { try { return !!(v && loadingCollecting(v, cs)); } catch (e) { return false; } })() });   // 4.17 (§7.8-⑫): 선적 잔여는 «자료 수집중»
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
    return c.weatherPending ? '🌤 평택항 날씨 조회 중…' : '날씨는 항차 화면 [🚀 작업 시작] 탭이나 검색줄 마이크를 누르고 "미르야" 하고 미르에게 물어 주세요.';
  }

  //  ⑮ 트윈 무게 점검 · 속도 · 계획 전망 · 자료 도착.
  if (p.twinCheckQuery && hasShip) {
    const m = p.mode || mode;
    const pool = cs.filter((x) => x._ptk !== false && x._mode === m && !x._comp);
    return generateTwinCheckAnswer(p, pool, c.pairsMap || {}, info.pier || '');
  }
  if (hasShip && isSpeedQuery(Q)) { try { const a = answerShipSpeed(v, c.shipSpeed, ship, _vcOf()); if (a && !/못 불러왔/.test(a)) { if (ETA_ASK_RE.test(Q) && !ETA_OTHER_RE.test(Q)) _via('eta'); return a; } } catch (e) { /* */ } }   // 4.40-01: «작업시간 몇 시간 걸릴거같아» — 남은 대수·끝나는 시각까지 내는 답이라 끝나는 시각 답과 같이 강한 답(모델로 안 감 · 2차 시뮬 실입력 콘 10-15)   // 4.17: 자료 수집중이면 _vcOf().collecting — 남은 대수·끝나는 시각 줄을 안 낸다   // 2차 시뮬 5: 속도 자료가 없으면 본체 ETA 가 답한다
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
        const b = generateBriefing(arr, kr, m, c.pairsMap || null, c.pier || '', { rfSkip: !!c.rfSkip, eseal: m === 'loading' ? (c.esealBrief || c.eseal || null) : null, photos: c.photos || null, gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m), compMap: c.compMap || null, shiftMap: c.shiftMap || null, records: (v && v[m] && v[m].records) || null, edi: (v && v[m] && v[m].ediContainers) || null });
        if (b) parts.push(c.mode ? b : `【${kr}】\n` + b);
      } catch (e) { console.warn('[미르] 브리핑 실패:', e); }
    }
    if (parts.length) return (c.mode ? '' : `${ship}\n`) + parts.join('\n\n');
    try { const ov = answerShipOverview(v, ship, c.matchPortMis(c.portMisData || {}, info), c.ediPattern || null, _pfOf(c, info)); if (ov) return ov; } catch (e) { /* */ }
  }
  //  4.39-02: 리스트(records)를 같이 넘겨 예상 실오류를 주의 박스와 같은 표본으로 센다 · 실번호 점검은 자료 답(강) — «실오류 있지?»·«…왜 안알려줬어?» 가 모델로 가서 덮이지 않게
  //  4.87-02 (검수사 2026-11-11 04:36~04:37 «형식이 다른 17개를 보여 달라고 했을때도 같은 대답을 했습니다» · «문제를 찾아서 알려는 주는데 후속 질문에 답을 못한다는것입니다»):
  //    실번호 점검 답 뒤 10분 안의 후속 물음(«형식이 다른 17개 보여줘»·«그 3대 뭐야»·«어떤 컨이야»)과 «실 형식 다른 거 보여줘» 는 점검 답을 되풀이하지 않고 한 대씩 두 값을 적은 상세로 답한다.
  { const _nowS = Number(c._now) || Date.now();
    const _fmtQ = /(형식|모양|패턴|타입|알파벳)[^?]{0,10}(다른|다르|다름|틀린|틀리|빠진|없는|이상)/.test(Q);
    const _afterAudit = _sealLive(c, _nowS);   // 4.87-03: 10분 → 60분(문제를 알린 뒤 실물을 보러 다녀와 묻는다) · 같은 배·같은 검수원일 때만
    //  감사 지적(4.87-02): 물음에 다른 주제어(피트·리퍼·X-RAY·위험물·호기·끝 4자리 …)가 있으면 실번호 후속이 아니다 — «40피트 12개 보여줘»·«X-RAY 5대 어떤 거야» 를 가로채지 않는다.
    const _otherSubj = /피트|ft\b|리퍼|냉동|위험물|\bDG\b|X\s*-?\s*RAY|엑스레이|\bFR\b|\bOT\b|오픈탑|플랫|탱크|호기|크레인|갱|베이|홀드|데크|갑판|엠티|공컨|풀컨|톤|무게|선사|포트|시프팅|트윈|해치|\d{4}/i.test(Q);
    //  재감사 지적(4.87-02): 주제어를 하나씩 막는 식은 샌다(«양하 10대 보여줘»·«특수화물 5개 보여줘»). 거꾸로 — «N개 보여줘»·«어떤 컨이야» 처럼 가리키는 말·대수·보여 달라는 말만 남는 물음일 때만 후속으로 본다.
    const _itHit = /\d+\s*(?:개|대|건)[^?]{0,8}(보여|알려|뭐|뭔|어떤|어느|목록|리스트|상세|자세)/.test(Q) || /(?:그거|그것|그\s*컨|그\s*실|어떤\s*컨|어느\s*컨|컨\s*번호)[^?]{0,8}(보여|알려|뭐|뭔|야|줘)/.test(Q);
    const _itRest = _sealFollowRest(Q);
    const _itQ = _itHit && _itRest === '';
    if (hasShip && ((_fmtQ && /[실씰]/.test(Q)) || (_afterAudit && !_otherSubj && (_fmtQ || _itQ)))) { _via('sealAudit'); return generateSealDetailAnswer(cs.filter((x) => c.mode ? x._mode === mode : true), c.mode ? modeKr : '양하·선적', c.mode ? (v && v[mode] && v[mode].records) || null : [v && v.discharge && v.discharge.records, v && v.loading && v.loading.records], c.mode ? (v && v[mode] && v[mode].ediContainers) || null : [v && v.discharge && v.discharge.ediContainers, v && v.loading && v.loading.ediContainers]); } }
  if (hasShip && (p.sealAuditQuery || /[실씰]\s*(?:번호\s*)?의심|실\s*점검|씰\s*점검/.test(Q))) { _via('sealAudit'); _sealAuditAt = Number(c._now) || Date.now(); _sealAuditKey = _sealKeyOf(c); try { const _sa = _sealArgsOf(c, cs, v, mode, modeKr); _sealSnap = { key: _sealKeyOf(c), mode: c.mode || '', list: sealProblemListOf(_sa[0], _sa[2], _sa[3]) }; } catch (e) { _sealSnap = null; console.warn('[미르] 실번호 처음 목록 기억 실패:', e); } return generateSealAuditAnswer(cs.filter((x) => c.mode ? x._mode === mode : true), c.mode ? modeKr : '양하·선적', c.mode ? (v && v[mode] && v[mode].records) || null : [v && v.discharge && v.discharge.records, v && v.loading && v.loading.records], c.mode ? (v && v[mode] && v[mode].ediContainers) || null : [v && v.discharge && v.discharge.ediContainers, v && v.loading && v.loading.ediContainers]); }

  //  ⑰ 홈(배 없음) — 실오류 선박 현황 · «우리 배?» · 오늘/내일 작업 선박 · 배 없는 브리핑.
  if (Array.isArray(c.flat) && /[실씰]\s*오류|실번호\s*(불일치|오류)/.test(Q)) {
    try {
      const rows = [];
      for (const x of c.flat) {
        if (!x || !x.cn) continue;
        const fix = isSealError(x);   // 4.49: 실오류 판정 한 벌(고친 기록 · 알려진 실 어느 것과도 다름 · 신고 끝자리 잘림)
        const cf = [...new Set(sealConflictOf(x).map((h) => String(h.sl || '').trim().toUpperCase()))].length > 1;   // 4.49-02: RF CONTAINER LIST 실은 뺀다
        if (fix || cf) rows.push({ x, fix, cf });
      }
      if (!rows.length) return '실오류·실번호 불일치로 기록된 컨이 없습니다 (앱 기록 기준 — 현장 발견분은 실오류 보고로 남겨 주세요).';
      //  4.49-04 (검수사 2026-10-25 «의심대상은 너무 많습니다. 그런건 한마디면 족합니다… 건건마다 불러주면 보기도 힘들고 듣기도 힘듭니다»): 실오류만 한 대씩, 실이 서로 다른 의심은 한마디로.
      const real = rows.filter((r) => r.fix), soft = rows.filter((r) => !r.fix);
      const byShip = new Map();
      for (const r of real) { const k = r.x.voyageKey || '?'; if (!byShip.has(k)) byShip.set(k, []); byShip.get(k).push(r); }
      const L = [real.length ? `⚠ 실오류 ${real.length}건 — ${byShip.size}척` : '실오류로 확정된 컨은 없습니다.'];
      for (const [k, arr] of byShip) { L.push(`【${k}】 ${arr.length}건`); arr.slice(0, 10).forEach(({ x }) => L.push(`  ${x.cn} — 신고 ${sealCheckOf(x).from} → 실물 ${sealCheckOf(x).actual || x.sl}`)); if (arr.length > 10) L.push(`  … 외 ${arr.length - 10}건`); }
      if (soft.length) L.push(`🔎 리스트 실이 서로 다른 컨 ${soft.length}대(${soft.slice(0, 3).map((r) => String(r.x.cn).slice(-4)).join('·')}${soft.length > 3 ? ' 등' : ''}) — 실 패턴이 달라 보이니 유의하세요 · 실물 확인`);
      return L.join('\n');
    } catch (e) { console.warn('[미르] 홈 실오류 현황 답 실패 — 다음 갈래로 갑니다:', e); }
  }
  if (c.voyages && /(우리|저희)\s*(가|는|도)?\s*(작업|검수)|작업\s*해야|검수\s*해야|우리\s*배/.test(Q)) {
    if (v) {
      try {
        const pmv = c.matchPortMis(c.portMisData || {}, info);
        const ov = answerShipOverview(v, ship, pmv, c.ediPattern || null, _pfOf(c, v && v.info));
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
  //  4.12-02: 날짜 말은 utils.dateWordOf 한 벌 — 내일·낼·모레·낼모레·글피(오늘 이후)까지 알아듣는다. 어제·그제 같은 지난 날은 위 4.17 갈래(_pastDayShips — 작업일 ∪ 그 날 완료 기록)가 먼저 답한다.
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
        try { blk = answerShipOverview(vv, sh, c.matchPortMis(c.portMisData || {}, vv?.info || {}), c.ediPattern || null, _pfOf(c, vv && vv.info)); } catch (e) { /* 배 하나 실패해도 계속 */ }
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
      const _gctx = {
        ...(c.manualCtx || null), mode: c.mode || null, bayPairs: c.bayPairs || c.pairsMap || null, selectedGroup: c.selectedGroup, selectedTier: c.selectedTier, shipLib: c.shipLib || null,
        gangShift: c.gangShift || null, crewAnswer: c.crewAnswer || null, voyage: v, carrierContacts: c.carrierContacts || null, shipSpeed: c.shipSpeed || null,
        vsl: c.vsl, vslFull: c.vslFull, pier: c.pier, info: info || null, voyageCounts: (p.etaQuery || p.paceQuery || p.progressQuery) ? _vcOf() : null, voyageDoneAts: c.voyageDoneAts || null,   // 3.60-18: voyageCounts 를 먼저 세야 voyageDoneAts 가 같은 분모
        photos: c.photos || null, shiftMap: c.shiftMap || null, shiftEvid: c.shiftEvid || null, compMap: c.compMap || null, bowStern: c.bowStern || null, gangs: info && info.gangs,
        who: c.inspector || '', inspector: c.inspector || '', voyageKey: c.voyageKey || '',
      };
      const a = generateLocalAnswer(eff, effRes, cs.filter((x) => x._ptk !== false), _gctx);
      if (a) { if (_gctx._etaAnswered && ETA_ASK_RE.test(q) && !ETA_OTHER_RE.test(q)) _via('eta'); return a; }   // 4.40-01: 끝나는 시각을 **물은** 말에 나간 끝나는 시각 답(nlSearch.formatEta 가 표식) — 강한 답(isWeakAnswer)
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
  if (!hasShip && (p.briefingQuery || p.sealAuditQuery || p.twinCheckQuery || p.etaQuery || p.paceQuery || p.customsReportQuery || p.schedQuery || p.pilotQuery || p.progressQuery || (c.countFallback && hasAnyCondition(p) && !p.asking && !isGeneralKnowAsk(q)))   /* 3.41-01: paceQuery — 조건이 되면서 홈이 컨 100대를 나열하던 것(감사) */) {
    return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 답합니다. (예: "STSE 출항 몇 시" · "KBTR 리퍼 몇 대")';
  }

  //  ㉑ 잡담(검수앱은 여기서) → 용어·실무지식 → 콘앱 안내.
  if (c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) { if (c.workOnly) { _via('workHint'); return MIR_CALL_HINT; } return st; } } catch (e) { /* 잡담 판정이 깨져도 아래 용어·실무지식 답은 계속한다(잡담 답만 빠진다) */ } }   // 4.89: 작업용 검색줄(workOnly)은 잡담 대신 부르는 법 한 줄
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
const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';   // 4.65: 대화는 오퍼스(검수사 2026-11-06 «미르 성능 높히는거» · 크레딧 100달러 만료 11-28). 웹 검색은 아래 WEB_MODEL 소네트 그대로.  4.30: 미르는 클로드(소네트)를 먼저 부르고, 막히면 제미나이로 돌아간다
const DEFAULT_CAP = 300;
const CFG_TTL = 10 * 60 * 1000;
const TIMEOUT_MS = 10000;
const CLAUDE_TIMEOUT_MS = 25000;   // 4.65: 오퍼스 대화(소네트 때 15000).    // 4.35: 첫 호출이 7초까지 걸린 실측(소네트) — 제미나이(10초)보다 넉넉히

// ── 미르가 모르는 낱말 — 종전 SearchPanel 음성 교정의 KNOWN 표를 한 벌로 옮기고(거기 사본은 지웠다) **토큰 사전**으로 바꿨다.
//   감사 실측(3.42 첫 판): 부분 문자열 정규식은 «시프팅»에서 «시»를 떼어 «프팅»을 모르는 낱말로 만들었고, 창구 예시 84개 중 22개가 «모르는 낱말 남음»이었다.
//   그래서 ① mirTokens(조사·문장부호 제거) 로 낱말을 자르고 ② 사전(아래 낱말 + 창구 예시의 낱말 전부)에 있으면 아는 말, ③ 사전 낱말이 앞머리로 붙은 것(«리퍼가»)·
//   흔한 어미(했어·열었어·됐어…)를 뗀 것도 아는 말로 본다. 한 글자 낱말은 세지 않는다.
const KNOWN_WORDS = `베이 리퍼 냉동 엠티 풀 위험물 디지 엑스레이 갑판 데크 홀드 선창 컨테이너 피트 온도 영하 영상 실번호 씰 봉인 잘림 잘린 파손 훼손 손상 대처 대처법 처리 조치 절차 무게 톤 위치 어디 몇 대 개 남은 남았 완료 진행 전체 전부 모두 몽땅 싹 죄다 도합 통틀어 합쳐 합치 수량 불러 뽑아 달라 다오 내렸 내린 누구 누가 소개 시야 시간 지금 오늘 내일 어제 날씨 기온 바람 입항 출항 입출항 접안 언제 며칠 요일 날짜 트윈 가능 불가 초과 불균형 수평 크레인 목록 리스트 양하 선적 쌓 빈자리 자리 평택 끝 끝나 끝났 페이스 속도 퇴근 점심 저녁 아침 걸려 걸리 예상 마치 종료 신고 세관 누락 바뀜 리씰 이상 인계 인수 교대 넘겨 특이사항 전달 있어 없어 있나 없나 찾아 알려 보여 보여줘 주세요 호기 갱 브리핑 마감 마감텔리 텔리 수치 해치 해치커버 커버 현측 우현 좌현 시작 커트 커트씰 봉인 전자봉인 전자 보류 수화물 환적 창고 임시창고 특수 특수제작 특수제작컨 규격 규격초과 치수 콜사인 호출부호 아이엠오 선속 도선 카고플랜 카고 플랜 디스차징 디스차지 스토우지 스토우 인스트럭션 DISCHARGING STOWAGE INSTRUCTION 베이플랜 밝게 어둡게 소리 순서 순서대로 다음 의심 클래스 오픈탑 하이큐브 플랫 탱크 무거운 가벼운 기록 적어 등록 담당 검수원 근무 주간 야간 뜻 어떻게 뭐야 뭔 무슨 미르 미르야 안녕 수고 고마워 힘들 먹 밥 배정 선박 배 작업 선수 선미 현황 상황 상태 대상 번호 열어 열었어 띄워 보자 이거 그거 저거 여기 거기 저기 아직 벌써 우리 이제 얼마 얼마나 언제쯤 몇시 시간당 시간별 제일 가장 화물 비엘 확인 확인된 선사 실오류 화면 하자 맞아 대수 우리배 우리 항 항구 정박 남아 남았어 걸린 걸렸어 들어와 나가 들어 나가는 몇시쯤 쯤 대략 마지막 처음 첫 완료된 완료했어 시작했어 끝났어 열렸어 붙었어 어때 어떤 뭐 무엇 몇번 오픈 클로즈 닫아 닫았어 닫혔어 조 근무자 사람 이름 담당자 현재 지금까지 중 안 못 잘 더 덜 것 거 건 개수 대수 척 척이야 갯수 모레 내일모레 낼모레 엊그제 그제 그저께 그끄저께 글피 어저께 점검 집에 이번 따로 각각 나눠서 그중 중에 정확히 대충 그냥 바로 같이 둘다 해요 돼요 되요 되나요 하나요 맞나요 맞죠 맞지 맞는데 뭐가 뭔가요 뭐에요 에요 이고 인데 이랑 라고 거에요 같아요 있는 있는데 있으면 하는 하면 해야 나오는데 나와요 실린 실려 실려있어요 찍힌 몇대 몇개 대씩 설정 설정온도 숫자 총대수 컨이 컨이야 컨번호 끝자리 알수있나요 볼수 한거 지금까지 셌는지 셌어 판 판으로 자료로 자료 말해줘 말해`.split(/\s+/).filter(Boolean);   // ★ 5.28-05: 군말(이번·따로·같이·실려·몇대·설정…) — 하나만 남아도 맞는 자료 답을 «약한 답»으로 봐 «❓ 제가 맞게 알아들었나요?» 를 붙이고 모델 번역이 조건을 빼먹은 별칭을 익혔다(2026-11-27 클로드2 시험 320문)
const _ENDINGS = /(했어요|했어|했나요|했니|했지|됐어|됐나요|됐니|났어|었어|였어|있어요|있어|있나요|있니|없어요|없어|없나요|없니|해줘|해요|하자|할까|할래|해봐|해|줘요|줘|인가요|인지|이야|이에요|예요|이지|지요|지|야|요|까|니|나요|는지|은지|던|던가|어요|어|아요|아|을까|을래|ㄹ까|세요|십시오|십시요|주십시오|주세요|주라|해주세요)$/;
//  낱말 자르기 — mirLearn.mirTokens 는 조사(«로»)까지 떼어 «킬로»를 «킬»로 만든다. 여기서는 어미만 뗀다.
const _STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요', '있어', '없어', '이야', '이거', '그거', '저거',
  '있지', '있잖아', '그럼', '그러면', '근데', '그런데', '그래서', '밀양']);   // 4.39-02: 이어 말하는 군말(«그럼 몇 개 남았어»·«실오류 있지?»)·«미르야» 음성 오인식 «밀양» — 남는 낱말로 세면 맞는 규칙 답이 모델로 갔다(2026-10-20 실입력)
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
  if (via === 'cancelBare') return false;
  if (via === 'shipMove') return false;   // 5.14: «2호기 04:00 KSKM으로 이동» 답(적음·묻기·못 적음)은 답이다 — 번역으로 보내면 «시작했어» 로 바뀌어 적힌다   // 5.13-01 감사 막음: 맨말 «취소» 되묻기는 답이다 — 모델·번역으로 보내면 «취소 처리했어요» 가 다시 난다
  if (via === 'workHint') return false;   // 4.89 감사 막음 2: 작업용 검색줄의 «"미르야" 하고 부르시면 …» 안내는 답이다(모델로 안 보낸다)
  if (via === 'thread') return false;   // 3.68: 대화 층이 직접 받은 말(응·아니·끝맺음·되물음) — 모델·miss 로 보내지 않는다
  if (via === 'coneRest') return false; // ConeOne 2.64-01: 콘앱 «N번 홀드 콘 몇 개 남았어» 는 완료 기록을 센 자료 답 — «몇개»·«콘이» 가 사전에 없어도 모델로 보내지 않는다(보내면 질문이 고쳐져 컨테이너 대수 답으로 덮인다)
  if (via === 'fieldQA' || via === 'fieldSplit' || via === 'unknownShip' || via === 'noBay' || via === 'pauseAgo' || via === 'workReportHint') return false;   // 5.29-04   // 5.28-05: 없는 베이 답도 답이다   // 5.28: 없는 배 «자료 없음» 도 답이다   // 5.27: 현장 문답 원장·묶음 대수 답은 답이다(모델로 덮지 않는다)
  if (via === 'termDef' || via === 'featureHelp') return false;   // 4.35-02: 사전·원장이 낸 뜻풀이 · 기능 이름이 질문에 든 매뉴얼 답
  if (via === 'pastDay' || via === 'collecting' || via === 'shipAsk') return false;   // 4.17 (§7.8-③⑫⑧): 지난 날 완료 기록 · 자료 수집중 · 같은 거리 두 배 되묻기는 자료 답이다
  if (via === 'defer') return false;   // 4.38: 작업 중 사담 미루기는 답이다(모델로 안 보낸다)
  if (via === 'workAnalysis' || via === 'dischargeAcc' || via === 'expectEta' || via === 'sealAudit' || via === 'guideGoto') return false;   // 4.40: guideGoto — «N번 베이로 옮겨 드릴까요?» 는 자료 답(모델로 덮지 않는다)   // 4.39-02: sealAudit — «실오류 있지?» 의 «있지»·«…왜 안알려줬어» 가 사전에 없어도 실번호 점검 자료 답을 모델로 덮지 않는다   // 4.39-01: «작업 분석» · «예상 작업시간(2갱으로)» 은 화면 계산 한 벌로 낸 자료 답 — «분석해줘»·«2갱으로» 가 사전에 없어도 모델로 보내지 않는다(21:48 «갱 2개» 로 옮겨져 갱 분배 답이 나갔다)
  if (via === 'workStop' && trace && trace.pauseSure) return false; // 4.42-02 (2차 시뮬 6 — 멈춤을 분명히 알린 말의 답만): 작업 멈춤 알림 — 말 파서가 사유 낱말·«작업 중단» 으로 멈춤이라 확신한(sure) 말의 자료 답이다. «아무래도 … 인듯 하네» 같은 군말이 남았다고 모델로 보내면 «열린 항차 정보가 없어요» 를 지어냈다(검수사 2026-10-21 13:25)
  if (via === 'eta') return false;      // 4.40-01: 끝나는 시각을 물은 말의 끝나는 시각 답(완료 기록·본선현황으로 잰 것) — 사전에 없는 낱말(«시쯤»·«끝날까»·«같아»)이 붙어도 모델로 안 보낸다. 보내면 앱마다 다른 답(검수사 2026-10-20 20:07)
  if (via === 'bayTidy') return false;   // 4.81: «N번 베이 정리해줘» 는 두 자료를 읽은 현황 답이다(모델로 안 보낸다)
  if (via === 'rzorLearn') return false;   // 4.44-01: 수집기 2.45 채점 요약은 자료 답 — «학습»·«현황»·«채점» 이 사전에 없어도 모델로 보내지 않는다
  if (via === 'yard') return false;     // 3.69: 야드 상황은 자료 답(«자료가 아직 안 왔어요» 도 답이다) — «야드»·«바빠» 가 사전에 없어도 모델로 보내지 않는다
  const q = (trace && trace.rq) ? trace.rq : q0;   // 3.68: 대화 층이 되쓴 말(«응»→«남은 대수»)은 되쓴 말로 잰다 — 원문의 «아니»·«번째»·«아까» 가 모르는 낱말로 남아 모델로 새던 것(감사 3)
  //  감사 지적 — 시각·진행 길이 **정답인 질문**(«지금 몇 시» «진행 상황»)까지 약하게 보면 모델이 그 답을 덮는다
  if (via === 'time' && PURE_TIME.test(String(q).trim())) return false;
  if (via === 'progress' && PURE_PROGRESS.test(String(q))) return false;
  if (via && WEAK_VIA.has(via)) return true;
  if (WEAK_TEXT.test(String(answer))) return true;
  if (/^(?:끝네자리 \d{4}|[A-Z]{4}\d{7}) — 이 항차(?: 자료\(EDI·리스트\))?에 없어요/.test(String(answer))) return false;   // ★ 5.28-05: 번호를 다 찾아본 «없어요» 는 답이다 — 모델이 번호를 바꿔 다른 컨을 답하게 두지 않는다(«맞게 알아들었나요?» 도 안 붙는다)
  const _lo = mirLeftover(q);
  if (!_lo.length) return false;
  //  ★ 5.28-05 — 조건(규격·베이·종류·끝 번호…)을 읽고 자료로 답한 말은 군말 몇 개가 남아도 약한 답이 아니다(2026-11-27 클로드2 시험 — 맞는 답에 «❓ 제가 맞게 알아들었나요?» 가 붙었다).
  //    남은 낱말에 조건 같은 말(위·아래·얹힌·경유·빼고·이상·바뀐·원래·차이·대조·최상단·첫)이 있으면 놓친 조건일 수 있어 종전대로 약하게 본다.
  try {
    const _dataAns = /^(?:📊|📍|📭|⏳|✅|⚖|🔩|[A-Z]{4}\d{7} · )/.test(String(answer).trim());
    //  감사 상 2 — 부정·비교·범위 말은 질문 전체에서 본다(«40피트 빼고»·«리퍼 아닌»·«지난 항차»·«제일 차가운»·«짝수 로우만» — 남은 낱말만 보면 놓친다).
    //    «지금까지 한 거 빼고»(남은 뜻)·«갑판 위에»(자리 이름)만 예외.
    const _qn = String(q).replace(/지금까지\s*한\s*거\s*빼고(?:요)?/g, ' ').replace(/(?:갑판|데크|덱|해치\s*커버)\s*위(?:에|로)?/g, ' ');
    const _hint = /아닌|아니|외에|뺀|빼고|빼면|나머지|말고|제외|안\s*\S+는|지난|전\s*항차|평균|비율|퍼센트|%|절반|제일|가장|최대|최소|옆|짝수|홀수|위쪽|아래쪽|위에|위로|아래|밑에|얹|경유|이상|이하|초과|미만|넘는|바뀐|바뀌|원래|차이|대조|비교|최상단|상단|하단|첫\s*단|맨|순서|정렬|동선|어느(?!\s*자료)|다르|달라|같은\s*(?:베이|줄|로우|칸|자리)|따로|각각|별로|나눠/.test(_qn)
      || _lo.some((w) => /기준|맞아|맞나/.test(w));
    if (_dataAns && !_hint && _lo.length <= 4 && Object.keys(mirCondSig(q) || {}).length) return false;
  } catch (e) { console.warn('[미르] 약한 답 판정 보조 실패:', e); }
  return true;
}

// ── 공용 키·설정(RTDB 한 칸) ────────────────────────────────────────────────
let _cfg = null, _cfgAt = 0, _cfgP = null;
async function _fetchJson(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const j = await res.json().catch((e) => { console.warn('[미르 모델 응답 읽기] JSON 이 아니에요:', e && e.message); return null; });
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
      _cfg = { aiKey: key, claudeKey: String(j.claudeKey || '').trim(), claudeModel: String(j.claudeModel || DEFAULT_CLAUDE_MODEL), claudeOpusModel: String(j.claudeOpusModel || '').trim(), visionProvider: String(j.visionProvider || '').trim(), model: String(j.model || DEFAULT_MODEL), dailyCap: Number(j.dailyCap) > 0 ? Number(j.dailyCap) : DEFAULT_CAP, enabled: j.enabled !== false, sharedKey: !!String(j.aiKey || '').trim(), webSearchUsd: (j.webSearchUsd === undefined || j.webSearchUsd === null || j.webSearchUsd === '' || isNaN(Number(j.webSearchUsd))) ? WEB_USD_DEFAULT : Math.max(0, Number(j.webSearchUsd)), claudeDailyUsd: (j.claudeDailyUsd === undefined || j.claudeDailyUsd === null || j.claudeDailyUsd === '' || isNaN(Number(j.claudeDailyUsd))) ? CLAUDE_DAILY_USD_DEFAULT : Math.max(0, Number(j.claudeDailyUsd)), geminiFallback: j.geminiFallback === true };
      _cfgAt = Date.now();
    } catch (e) {
      console.warn('[미르 모델] mir_config 를 못 읽었어요 — 이번엔 모델 없이 갑니다:', e && e.message);
      _cfg = _cfg || { aiKey: '', claudeKey: '', claudeModel: DEFAULT_CLAUDE_MODEL, model: DEFAULT_MODEL, dailyCap: DEFAULT_CAP, enabled: false, sharedKey: false };
      _cfgAt = Date.now() - CFG_TTL + 60 * 1000;   // 1분 뒤 다시 시도
    } finally { _cfgP = null; }
    return _cfg;
  })();
  return _cfgP;
}
//  4.86-02: 하루 키는 한국 시각 날짜 — 기기 시간대와 무관(aiCost.js 한 벌). 아래 줄에 한글을 섞지 않는다(smoke_datewords [9])
const _dayKey = () => aiDayKey(Date.now());
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
  try { fetch(`${FB}/mir_model_log/${day}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: tmoSignal(15000), body: JSON.stringify({ at: Date.now(), ...entry }) }).catch((e) => console.warn('[미르 모델] 호출 기록 실패:', e && e.message)); }
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
    fetch(`${FB}/mir_misses/${_dayKey()}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: tmoSignal(15000), body: JSON.stringify({ q, key, at: Date.now(), ...meta }) }).catch((e) => console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message));
  } catch (e) { console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message); }
}

// ── 모델 호출(공용 함수) ─────────────────────────────────────────────────────
/* ★ 4.30 — 클로드 먼저, 막히면 제미나이. 검수사 2026-10-18 «클로드 비용을 다 쓰면 제미나이가 다시 도는 방식으로».
   한도(HTTP 400)·키 오류(401·403)·과부하(429·5xx)·시간 초과·빈 답이면 쉬었다가 다시 부른다(한도·키 문제는 30분, 그 밖은 2분) — 그동안은 제미나이가 받는다.
   소네트는 생각(thinking)을 끄지 않으면 토큰을 먼저 써서 답이 잘린다 → thinking:{type:'between_tools'}. temperature 는 이 모델이 받지 않는다. */
let _claudeOffUntil = 0;
//  4.68 — 오늘 클로드 합계(소유자 «💳 AI 비용» 화면과 같은 계산 aggregateAiCost). 30초 캐시. 못 읽으면 null(한도 판단을 못 하므로 클로드를 막지 않는다 — 경고만).
let _claudeSpent = { day: '', usd: 0, at: 0 };
async function _claudeSpentToday(cfg) {
  const day = _dayKey();
  if (_claudeSpent.day === day && Date.now() - _claudeSpent.at < 30 * 1000) return _claudeSpent.usd;
  try {
    const [a, b, c] = await Promise.all(['mir_model_log', 'ai_call_log', 'mir_websearch'].map((n) => _fetchJson(`${FB}/${n}/${day}.json`, {}, 6000)));
    if (!a.ok || !b.ok || !c.ok) { console.warn('[미르 모델] 오늘 클로드 비용을 못 읽었어요 — 하루 한도 판단을 건너뜁니다'); return null; }
    const usd = aggregateAiCost([{ day, mml: a.j || {}, acl: b.j || {}, mws: c.j || {} }], { chatModel: (cfg && cfg.claudeModel) || DEFAULT_CLAUDE_MODEL }).total.usd;
    _claudeSpent = { day, usd, at: Date.now() };
    return usd;
  } catch (e) { console.warn('[미르 모델] 오늘 클로드 비용을 못 읽었어요 — 하루 한도 판단을 건너뜁니다:', e && e.message); return null; }
}
//  5.03 건8 — 하루 한도 이월: 지난 7일 날마다 클로드 사용액을 하루 한 번(메모리) 읽어 aiDayLimit 한 함수로 오늘 한도를 낸다. 읽기 실패면 null(이월 없이 기본값 · 막지 않음) — 실패는 5분 뒤 다시 읽는다.
let _dayRowsCache = { day: '', rows: null, at: 0 };
async function _pastDayRows(cfg) {
  const day = _dayKey();
  if (_dayRowsCache.day === day && (_dayRowsCache.rows || Date.now() - _dayRowsCache.at < 5 * 60 * 1000)) return _dayRowsCache.rows;
  try {
    const keys = aiCarryKeys();
    const days = await Promise.all(keys.map(async (k) => {
      const [a, b, c] = await Promise.all(['mir_model_log', 'ai_call_log', 'mir_websearch'].map((n) => _fetchJson(`${FB}/${n}/${k}.json`, {}, 6000)));
      if (!a.ok || !b.ok || !c.ok) throw new Error('지난 날 기록 읽기 실패 ' + k);
      return { day: k, mml: a.j || {}, acl: b.j || {}, mws: c.j || {} };
    }));
    const rows = aiDayUsages(days, (cfg && cfg.claudeModel) || DEFAULT_CLAUDE_MODEL);
    _dayRowsCache = { day, rows, at: Date.now() };
    return rows;
  } catch (e) {
    console.warn('[미르 모델] 지난 7일 클로드 비용을 못 읽었어요 — 이월 없이 기본 한도로 갑니다:', e && e.message);
    _dayRowsCache = { day, rows: null, at: Date.now() };
    return null;
  }
}
/** 오늘 한도(이월 포함) — 문지기도 소유자 화면도 aiDayLimit 한 함수의 값이다. {limit, base, carry, capped, text} */
export async function claudeDayLimitNow(cfg) {
  return aiDayLimit(cfg, await _pastDayRows(cfg));
}
/** 4.68: 오늘 클로드 합계가 하루 한도(기본 3달러 + 5.03 이월)에 닿았나 — 닿았으면 그날은 제미나이로 간다. 사진 읽기(gemini.js)도 같은 판정을 쓴다. */
export async function claudeOverDailyCap(cfg) {
  const base = aiDayLimit(cfg, null);
  if (!(base.base > 0)) return true;   // 0 이면 클로드를 끈다(배포 없이 제미나이로 되돌리는 스위치)
  const sp = await _claudeSpentToday(cfg);
  if (sp === null) return false;
  const lim = (await claudeDayLimitNow(cfg)).limit;
  return sp >= lim;
}
async function _claude(cfg, prompt, maxOut, json) {
  const t0 = Date.now();
  const r = await _fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: cfg.claudeModel || DEFAULT_CLAUDE_MODEL, max_tokens: Math.max(maxOut, 400), ...(/opus/i.test(String(cfg.claudeModel || DEFAULT_CLAUDE_MODEL)) ? {} : { thinking: { type: 'between_tools' } }), messages: [{ role: 'user', content: prompt }] }),   // 4.65: 오퍼스는 between_tools 를 400 으로 거부한다(4.36 실측)
  }, CLAUDE_TIMEOUT_MS);
  if (!r.ok) { const e = new Error((r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  const text = ((r.j && Array.isArray(r.j.content) ? r.j.content : []).filter((c) => c && c.type === 'text').map((c) => c.text || '').join(' ')).trim();
  if (!text) { const e = new Error('클로드 빈 답(' + ((r.j && r.j.stop_reason) || '?') + ')'); e.status = 0; throw e; }
  const u = (r.j && r.j.usage) || {};
  return { text, tokIn: u.input_tokens || 0, tokOut: u.output_tokens || 0, ms: Date.now() - t0, prov: 'claude' };
}
/* ★ 4.36-02 — 미르 웹 검색(클로드 웹 검색 도구). 검수사 2026-10-19 «1불로 제한 합니다» — 하루 합계 비용이 한도(mir_config.webSearchUsd, 처음 1달러)에 닿으면 그날은 검색을 멈춘다.
   비용 = 입력 토큰×2달러/100만 + 출력 토큰×10달러/100만 + 검색 1회 0.01달러(소네트 5.5 단가, 2026-10-19 가격표). 실제 응답의 usage 로 계산해 mir_websearch/{날짜} 에 한 줄씩 남기고, 읽을 때 합산한다.
   4.37: 종전 3·15달러(옛 소네트 단가)로 셈해 실제보다 39% 크게 적혔다 — 실측 261019 «가요차트 1위» 입력 16,505·출력 351·검색 1 → 장부 0.0648, 실제 0.0465. 그래서 1달러 한도가 실제 약 0.70달러에서 멈췄다. */
const WEB_USD_DEFAULT = 3;
const CLAUDE_DAILY_USD_DEFAULT = AI_DAILY_USD_DEFAULT;   // 5.03: 기본값은 aiCost.js 한 곳 · 4.68: 클로드 하루 합계(대화·번역·자료 답·사진·웹 검색) 한도 — 넘으면 그날은 제미나이. 검수사 2026-11-06 17:00 «크레딧 소모가 끝날때까지 제미나이를 사용하지 않는다. 하루 3불을 초과하면 사용하고»   // 4.65: 하루 3달러(검수사 2026-11-06 «하루 3불로 해주세요»). mir_config.webSearchUsd 를 쓰면 배포 없이 바꾼다.
const WEB_MODEL = 'claude-sonnet-5-5';   // 4.65: 대화가 오퍼스여도 웹 검색은 소네트(단가 반값 · 검색 도구가 검증된 모델)
const WEB_EST_USD = 0.05;   // 한 번 부르기 전에 서버에 먼저 잡아 두는 예상 비용(실측 1회 0.0465달러, 4.37 이전 0.07) — 다른 폰도 이만큼 쓴 것으로 본다
const MIR_REALTIME_RE = /(차트|순위|1위|뉴스|속보|주가|환율|시세|코스피|코스닥|나스닥|비트코인|경기\s*결과|스코어|박스오피스|실시간\s*(검색어|차트|순위|뉴스)|최근\s*(소식|뉴스)|요즘\s*(뜨는|인기))/;
const _webCost = (tokIn, tokOut, searches, model) => aiCostUsd(AI_PRICE[model] ? model : DEFAULT_CLAUDE_MODEL, tokIn, tokOut, searches);   // 4.37: 단가는 aiCost.js 한 곳
//  4.37: 콘앱 웹 검색은 하루 합계가 한도의 절반에 닿으면 먼저 멈춘다 — 검수사 2026-10-19 «콘앱 사용자는 이기능을 모릅니다. 일 1불이 넘게되면 콘앱 웹검색을 먼저 막습니다.»
const CONE_WEB_SHARE = 0.5;
let _webSpent = { day: '', usd: 0, at: 0 };
/** 오늘 쓴 검색 비용(달러). 읽지 못하면 null — 부르는 쪽이 «검색 안 함» 으로 닫는다(한도가 풀리지 않게). 이 폰이 방금 잡은 금액은 서버 합계보다 낮지 않게 합친다. */
async function _webSpentToday() {
  const day = _dayKey();
  if (_webSpent.day === day && Date.now() - _webSpent.at < 10 * 1000) return _webSpent.usd;
  try {
    const r = await _fetchJson(`${FB}/mir_websearch/${day}.json`, {}, 6000);
    if (!r.ok) { console.warn('[미르 모델] 오늘 검색 비용을 못 읽었어요(HTTP ' + r.status + ') — 검색을 쉽니다'); return null; }
    const rows = (r.j && typeof r.j === 'object') ? Object.values(r.j) : [];
    const usd = rows.reduce((a, x) => a + (Number(x && x.usd) || 0), 0);
    _webSpent = { day, usd, at: Date.now() };
    return usd;
  } catch (e) { console.warn('[미르 모델] 오늘 검색 비용을 못 읽었어요 — 검색을 쉽니다:', e && e.message); return null; }
}
/** 호출 직전에 예상 비용을 서버에 한 줄 잡는다(다른 폰도 곧 보인다). 못 적으면 null → 검색하지 않는다. */
async function _webReserve(q, app) {
  const day = _dayKey();
  try {
    const r = await _fetchJson(`${FB}/mir_websearch/${day}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ at: Date.now(), usd: WEB_EST_USD, reserve: true, q: String(q).slice(0, 60), app: String(app || '') }) }, 6000);   // 4.37: app — 소유자 화면이 앱별 검색 금액을 센다
    if (!r.ok || !r.j || !r.j.name) { console.warn('[미르 모델] 검색 비용을 못 적었어요(HTTP ' + r.status + ') — 검색을 쉽니다'); return null; }
    _webSpent = { day, usd: (_webSpent.day === day ? _webSpent.usd : 0) + WEB_EST_USD, at: _webSpent.day === day ? _webSpent.at : Date.now() };
    return r.j.name;
  } catch (e) { console.warn('[미르 모델] 검색 비용을 못 적었어요 — 검색을 쉽니다:', e && e.message); return null; }
}
/** 응답이 오면 잡아 둔 한 줄을 실제 비용으로 고친다. 청구가 없었던 실패(HTTP 오류)는 0, 시간 초과처럼 청구됐을 수 있는 실패는 예상 비용을 그대로 둔다. */
async function _webSettle(name, usd, extra) {
  if (!name) return;
  const day = _dayKey();
  if (_webSpent.day === day) _webSpent.usd = Math.max(0, _webSpent.usd + (usd - WEB_EST_USD));
  try {
    await _fetchJson(`${FB}/mir_websearch/${day}/${name}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usd: Math.round(usd * 10000) / 10000, reserve: false, ...(extra || {}) }) }, 6000);
  } catch (e) { console.warn('[미르 모델] 검색 비용 확정 기록 실패(예상치가 남습니다):', e && e.message); }
}
async function _claudeSearch(cfg, prompt, maxOut) {
  const t0 = Date.now();
  const r = await _fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: WEB_MODEL, max_tokens: maxOut, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }], messages: [{ role: 'user', content: prompt }] }),
  }, 60000);
  if (!r.ok) { const e = new Error((r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  const blocks = (r.j && Array.isArray(r.j.content)) ? r.j.content : [];
  const text = blocks.filter((c) => c && c.type === 'text').map((c) => c.text || '').join('').replace(/\s+/g, ' ').trim();   // 글 조각은 이어 붙인다(조각 사이에 띄어쓰기를 넣지 않는다)
  const u = (r.j && r.j.usage) || {};
  const searches = (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
  return { text, tokIn: u.input_tokens || 0, tokOut: u.output_tokens || 0, searches, stop: (r.j && r.j.stop_reason) || '', ms: Date.now() - t0, prov: 'claude-web' };
}
async function _gem(cfg, prompt, maxOut, json) {
  //  4.68: 클로드가 되는 동안(크레딧이 있고 오늘 하루 한도 안)은 제미나이를 쓰지 않는다. 시간 초과·과부하는 클로드를 세 번까지 부른다.
  //  제미나이는 ① 키·크레딧 문제(400·401·403·404) ② 오늘 한도 초과 ③ 클로드 키 없음 ④ mir_config.geminiFallback=true 일 때만.
  if (cfg.claudeKey && Date.now() >= _claudeOffUntil && !(await claudeOverDailyCap(cfg))) {
    let lastErr = null;
    for (let tryNo = 0; tryNo < 3; tryNo++) {
      try { return await _claude(cfg, prompt, maxOut, json); }
      catch (e) {
        lastErr = e;
        const st0 = e && e.status;
        if (st0 === 400 || st0 === 401 || st0 === 403 || st0 === 404) break;
        if (tryNo < 2) await new Promise((res) => setTimeout(res, 600 * (tryNo + 1)));   // 4.86-02: 일시 오류는 0.6초·1.2초 쉬고 다시 부른다(바로 연달아 부르면 같은 과부하에 또 걸린다)
      }
    }
    const e = lastErr;
    const st = e && e.status;
    const hard = st === 400 || st === 401 || st === 403 || st === 404;
    if (hard || cfg.geminiFallback) _claudeOffUntil = Math.max(_claudeOffUntil, Date.now() + (hard ? 30 : 2) * 60 * 1000);   // 동시에 떠 있던 짧은 휴지가 긴 휴지를 지우지 않게(감사 지적)
    console.warn('[미르 모델] 클로드가 안 돼요:', e && e.message);
    if (!hard && !cfg.geminiFallback) throw e;   // 일시 오류 — 제미나이로 가지 않는다(호출한 쪽이 «종전 길»로 답한다)
    if (!cfg.aiKey) throw e;
  }
  if (!cfg.aiKey) throw new Error('AI 키가 없어요');
  return _gemRaw(cfg, prompt, maxOut, json);
}
async function _gemRaw(cfg, prompt, maxOut, json) {
  const t0 = Date.now();
  const r = await _fetchJson(`${GEM}/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.aiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: maxOut, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
  }, TIMEOUT_MS);
  if (!r.ok) { const m = (r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status); throw new Error(m); }
  const text = (r.j && r.j.candidates && r.j.candidates[0] && r.j.candidates[0].content && r.j.candidates[0].content.parts && r.j.candidates[0].content.parts[0] && r.j.candidates[0].content.parts[0].text || '').trim();
  const u = (r.j && r.j.usageMetadata) || {};
  return { text, tokIn: u.promptTokenCount || 0, tokOut: u.candidatesTokenCount || 0, ms: Date.now() - t0, prov: 'gemini' };
}

// ── ① 번역 — 미르가 아는 말 목록(창구) ─────────────────────────────────────
export const MIR_CATALOG = `
[컨 한 대 — 끝 4자리나 번호 뒤에 무엇을 묻는지] 예: "3426 온도" "0230 실번호" "0230 중량" "7758 다음 항 어디야" "0230 비엘 번호" "0230 치수" "0686 엑스레이 대상이야" "0230 완료했어" "0230 몇 피트야" "4777 어디 있어" "0230 상태"
[대수] 예: "리퍼 몇 대" "20피트 몇 대" "엠티 몇 대" "풀 몇 대" "위험물 몇 대" "엑스레이 몇 대" "양하 몇 대 남았어" "선적 몇 대" "전체 몇 대" "환적 화물 몇 대" "엠티실 몇 대 남았어" "규격초과 몇 대"
[자리·목록] 예: "리퍼 어디" "엑스레이 대상 위치" "위험물 어디" "FR 어디" "16번 베이" "5번 베이 데크" "3번 홀드" "규격초과 치수" "임시창고 뭐 있어" "특수제작컨 있어" "보류 뭐 있어" "수화물 확인된 거"
[항차 사실] 예: "마감텔리 수치" "해치커버 열었어" "접안 현측" "작업 몇 시에 시작했어" "양하 언제 끝났어" "커트씰 기록" "전자봉인 몇 대" "실번호 의심" "양하 대수가 안 맞아"
[진행·속도] 예: "브리핑" "얼마나 남았어" "몇 시쯤에 끝나" "시간당 몇 개 했어" "작업 속도" "몇 개 했어" "진행 상황"
[배·시각·날씨] 예: "KBTR 브리핑" "콜사인" "IMO" "선박 소개" "입항 몇 시" "출항 몇 시" "도선 몇 시" "날씨" "지금 몇 시" "선속" "다음 항"
[베이 정리(읽기만)] 예: "12번 베이 정리해줘" "(14)15 정리해줘" "선적 24번 정리"
[호기·갱·근무자(말하기와 적기)] 예: "1호기 누구야" "갱 몇 개" "1호기 홍길동 2호기 김철수" "2호기 23:15 시작했어" "갱 3개"
[뜻·사용법·현장 대처] 예: "시프팅이 뭐야" "FR이 뜻" "트윈 어떻게 해" "해치커버 어떻게 열어" "씰 잘렸을 때 어떻게 해" "천정 구멍 어떻게 처리해" "리퍼 전원 꺼졌어 어떻게"
[화면 열기] 예: "카고플랜 보여줘" "양하(DISCHARGING)PLAN 보여줘" "선적(STOWAGE)PLAN 보여줘" "CARGO DISCHARGING PLAN 보여줘" "STOWAGE INSTRUCTION 보여줘" "디스차징 플랜 보여줘" "스토우지 플랜 보여줘" "베이플랜 보여줘" "선적 플랜 보여줘" "KBTR 카고플랜 보여줘"
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
  let r = await _gem(cfg, prompt, 120, true);
  let j = null;
  const _parse = (t) => { const c = String(t || '').replace(/^```json|```$/g, '').trim(); try { return JSON.parse(c); } catch (e) { const a = c.indexOf('{'), b = c.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(c.slice(a, b + 1)); } catch (e2) { return undefined; } } return undefined; } };
  j = _parse(r.text);
  if (j === undefined && r.prov === 'claude') {   // 4.67: 오퍼스가 JSON 형식을 어기면(실측 5건 중 1건) 제미나이로 가기 전에 클로드를 한 번 더 부른다 — 제미나이 번역이 엉뚱한 매뉴얼 답을 냈다
    try { const r1 = await _claude(cfg, prompt, 120, true); const j1 = _parse(r1.text); if (j1 !== undefined) { r = r1; j = j1; } } catch (e) { console.warn('[미르 모델] 클로드 번역 재시도 실패:', e && e.message); }
  }
  if (j === undefined && r.prov === 'claude' && cfg.aiKey && cfg.geminiFallback) {   // 4.68: 제미나이 재시도는 geminiFallback 일 때만 · 4.35: 클로드가 JSON 형식을 어기면 제미나이로 한 번 더(감사 지적 — 종전엔 «번역 없음»으로 굳었다)
    try { r = await _gemRaw(cfg, prompt, 120, true); j = _parse(r.text); } catch (e) { console.warn('[미르 모델] 제미나이 재시도 실패:', e && e.message); }
  }
  if (j === undefined) { return { canonical: '', window: '', confidence: 0, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, prov: r.prov, bad: r.text.slice(0, 80) }; }
  return { canonical: String((j && j.canonical) || '').trim(), window: String((j && j.window) || ''), confidence: Number((j && j.confidence) || 0), tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, prov: r.prov };
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
//  5.03 건4 — 질문에 배 이름(영문 네 글자 코드)이 있으면 그 배의 호기·장비 자료(info.qcWork)를 자료 팩에 싣는다. 종전엔 팩에 호기 자료가 없어 «DJCT 장비 번호가 뭐야» 에 «자료에 없어요, 배 이름을 붙여 달라» 로 답했다.
//  검수앱·콘앱이 같은 buildDataPack 한 벌을 쓴다(mir-core 번들) — 여기서만 고친다.
function _namedVoyageInfo(q, ctx) {
  const Q = String(q || '').toUpperCase();
  const cands = [];
  if (ctx && ctx.voyages && typeof ctx.voyages === 'object') for (const v of Object.values(ctx.voyages)) if (v && v.info) cands.push(v.info);
  if (ctx && ctx.info) cands.push(ctx.info);
  for (const inf of cands) {
    const code = String(inf.vsl || '').toUpperCase();
    if (code && new RegExp(`(^|[^A-Z0-9])${code}(?![A-Z0-9])`).test(Q)) return inf;
  }
  return null;
}
function _craneLinesOf(inf) {
  const rows = qcRowsOf(inf && inf.qcWork);
  return rows.map((r) => `${r.no}호기(${r.qc}) 양하 완료 ${r.disDone}·잔여 ${r.disRest} / 선적 완료 ${r.lodDone}·잔여 ${r.lodRest}`);
}
export function buildDataPack(q, ctx) {
  //  평택분만(감사 실측: 통과화물이 섞이면 NSFR «양하 423»이 팩에 들어가 문지기를 통과한다). _ptk 가 없는 컨(콘앱 등)은 그대로 둔다.
  const cs = (Array.isArray(ctx.containers) ? ctx.containers : []).filter((c) => c && c._ptk !== false);
  const info = ctx.info || {};
  const digs = (String(q).match(/\d{4,7}/g) || []);
  const cnt = (arr, f) => { const m = {}; arr.forEach((c) => { const k = f(c) || '?'; m[k] = (m[k] || 0) + 1; }); return m; };
  const d = cs.filter((c) => (c._mode || c.mode) !== 'loading'), l = cs.filter((c) => (c._mode || c.mode) === 'loading');
  const sum = (arr) => ({ 총: arr.length, 규격: cnt(arr, _iso), 풀엠티: cnt(arr, (c) => c.fe), 리퍼엠티: arr.filter((c) => c.fe === 'E' && isEmptyReefer({ ...c, rf: _isRf(c) })).length, 리퍼: arr.filter(_isRfFull).length, 위험물: arr.filter(_isDg).length, 엑스레이: arr.filter(_isX).length, 규격초과: arr.filter((c) => c.oog).length, 완료: arr.filter(_isDone).length, 미완료: arr.filter((c) => !_isDone(c)).length, 실번호없음: arr.filter((c) => !inspectionSealOf(c)).length,   /* 4.26-02: 엠티실만 있는 엠티는 «실번호 없음» 이 아니다(검수리스트와 한 벌) */ POD별: cnt(arr, (c) => c.pod), POL별: cnt(arr, (c) => c.pol) });
  const summary = { 배: `${info.vsl || ''} ${info.vslFull || ''}`.trim(), 항차: { 양하: info.voy_d || info.voy || '', 선적: info.voy_l || '' }, 부두: info.pier || '', 선석: info.berth || '', 접안: info.berthSidePick || info.berthSide || '', 작업시작: info.workStartAt || '', 작업끝: info.workEndAt || '', 양하완료시각: (typeof info.dischargeDoneAt === 'number' ? _tm(info.dischargeDoneAt) : (info.dischargeDoneAt || '')), 양하: sum(d), 선적: sum(l) };
  const byWt = cs.filter((c) => Number(c.wt) > 0).sort((a, b) => Number(b.wt) - Number(a.wt));
  const derived = {
    제일무거운5: byWt.slice(0, 5).map((c) => `${c.cn} ${c.wt}kg ${_modeKo(c)} ${_pos(c)}`),
    제일가벼운5: byWt.slice(-5).reverse().map((c) => `${c.cn} ${c.wt}kg`),
    최대중량_같은중량_대수: byWt.length ? byWt.filter((c) => Number(c.wt) === Number(byWt[0].wt)).length : 0,   // 4.30: 실데이터 시험(OBWH 2769E)에서 모델이 «제일무거운5» 목록 길이 5 를 «같은 중량 5대»로 말했다(실제 46대) — 대수는 앱이 센다
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
  //  5.03 건4 — 배 이름이 든 질문 또는 호기·장비를 묻는 질문이면 호기별 작업 자료를 싣는다(없으면 «없음» 을 분명히 적어 모델이 배 이름을 되묻지 않게)
  const _named = _namedVoyageInfo(q, ctx);
  if (_named || /호기|장비|크레인|QC|갱/i.test(String(q))) {
    const _inf = _named || info;
    const _lines = _craneLinesOf(_inf);
    derived.호기별작업 = _lines.length ? { 배: String(_inf.vsl || ''), 호기: _lines } : { 배: String(_inf.vsl || ''), 호기: [], 안내: '터미널 호기 집계(qcWork)가 아직 없음' };
  }
  return { summary, 계산해둔것: derived, 컨목록_열: cols, 질문에맞는컨: [...hit, ...rel].map(line) };
}
/* ★ 4.36 생활회화 층 — 검수사 2026-10-19 «생활회화는 클로드 SONNET 버전이라 더 많은 것을 할 수 있을 것입니다. 기존에 하던 말들이 아닌 일반 생활회화를 할 수 있어야 할 것입니다.»
   규칙이 못 받은 말 중 일(자료) 질문이 아닌 것을 소네트가 자연스럽게 받는다 — 안부·농담·위로·잡학·일반 상식. 일 자료(대수·시각·컨번호·씰)는 이 층이 모른다:
   일 질문이면 «배 이름을 붙여 물어봐 달라»고만 하고 숫자를 지어내지 않는다(아래 문지기가 컨번호·«N대»가 든 답을 버린다). 앞 대화 세 턴을 같이 보내 이어 말한다.
   표기는 «생활회화» 로만 쓴다(검수사 지시). */
const MIR_WORKISH_RE = /(선박|컨테이너|컨\s|컨$|베이|홀드|양하|선적|씰|실번호|리퍼|호기|갱|도선|입항|출항|접안|엑스레이|x-?ray|위험물|플랜|완료|야드|대수|몇\s*대|몇\s*개|진행|남았|끝나|끝날|어디|위치|무게|중량|온도|몇\s*시|언제|시각|해치|크레인|마감|텔리|속도|브리핑|시프팅|트윈|수량|합계|현황|가장|제일|뭐\s*있|몇\s*(?:분|시간|톤|번|척)|\d{3,})/i;
export const isChatCandidate = (q, win) => !MIR_WORKISH_RE.test(String(q || ''));
export async function chatAnswer(q, ctx, cfg) {
  let hist = '';
  try {
    const t = _thOf(ctx || {}, Date.now());
    if (t) hist = t.th.turns.slice(-3).map((x) => `검수사: ${String(x.q || '').slice(0, 120)}\n미르: ${String(x.answer || '').slice(0, 160)}`).join('\n');
  } catch (e) { hist = ''; }
  const prompt = `너는 평택항 컨테이너 검수앱의 도우미 «미르»다. 검수사의 고양이 이름에서 왔고, 부두에서 같이 일하는 다정한 고양이 후배처럼 말한다.
말투: 해요체, 가벼운 이야기는 한두 문장, 상식이나 설명을 묻는 말은 알고 있는 만큼 쉽고 정확하게 여섯 문장 안으로 답한다. 이모지는 😺 정도로 가끔만. 대화를 받아 주고 자연스럽게 이어 간다.
할 일: 안부·농담·위로·응원·취미·음식·잡학·일반 상식·과학·역사·언어·컴퓨터 같은 질문에 아는 대로 다 답한다(평택항 검수와 상관없어도 된다). 같은 말을 되풀이하지 않는다.
규칙:
1. 이 앱의 일 자료(컨번호·대수·시각·베이·씰·진행)는 네가 모른다. 일 자료를 묻는 말이면 «배 이름을 붙여서 물어봐 주세요» 라고만 안내하고 숫자를 지어내지 않는다.
2. 실시간 정보(날씨·뉴스·주가·경기 결과)와 네가 확실히 모르는 것은 모른다고 말한다. 날씨는 «미르야 날씨 알려줘» 라고 하면 앱이 안내한다고 알려 준다.
3. 의료·법률·투자는 일반 정보만 말하고 전문가 확인을 권한다.
4. «AI입니다» 같은 꼬리 말은 붙이지 않는다. 위험하거나 해로운 부탁은 정중히 거절한다.
5. 힘들다·죽고 싶다 같은 위기 신호면 가볍게 넘기지 말고 곁에 있다고 따뜻하게 말하고, 가까운 사람이나 자살예방상담전화 109에 바로 연락하도록 권한다.
${hist ? `지금까지 대화:\n${hist}\n` : ''}검수사: "${String(q).slice(0, 300)}"
미르:`;
  //  ★ 4.36-02 웹 검색 — 차트·순위·뉴스·주가 같은 실시간 질문만(일 낱말이 든 말은 제외). 하루 합계 비용이 한도에 닿으면 검색 없이 «한도 다 썼다»고 말한다.
  //    비용을 읽거나 적지 못하면 검색하지 않는다(한도가 풀리지 않게). 모델이 소네트가 아니면 단가를 모르므로 검색하지 않는다. 검색이 안 되면 종전 생활회화로 답한다.
  if (cfg.claudeKey && MIR_REALTIME_RE.test(String(q)) && isChatCandidate(q, '') && !(cfg.webSearchUsd <= 0) && AI_PRICE[WEB_MODEL]) {   // 4.37: 단가표(aiCost.js)에 없는 모델은 비용을 모르므로 검색하지 않는다 · 4.65: 검색 모델은 WEB_MODEL 로 못 박았다(대화가 오퍼스여도 검색이 막히지 않게)
    const isCone = !!(ctx && ctx.app === 'cone');
    const limit = isCone ? Math.round(cfg.webSearchUsd * CONE_WEB_SHARE * 100) / 100 : cfg.webSearchUsd;   // 4.37: 콘앱은 절반에서 먼저 멈춘다(합계는 두 앱 공용)
    const spent = await _webSpentToday();
    if (spent !== null && spent + WEB_EST_USD > limit) {
      return { text: isCone ? '오늘 검색에 쓸 수 있는 한도를 다 써서 지금은 찾아볼 수 없어요. 내일 다시 물어봐 주세요 😺' : `오늘 검색에 쓸 수 있는 한도(하루 ${limit}달러)를 다 써서 지금은 찾아볼 수 없어요. 내일 다시 물어봐 주세요 😺`, rejected: null, tokIn: 0, tokOut: 0, ms: 0, prov: 'web-cap', searches: 0, usd: 0 };   // 4.37: 콘앱에는 금액을 말하지 않는다(콘앱 사용자는 모르는 기능)
    }
    const slot = spent === null ? null : await _webReserve(q, (ctx && ctx.app) || '');
    if (slot) {
      try {
        const wprompt = prompt.replace('2. 실시간 정보(날씨·뉴스·주가·경기 결과)와 네가 확실히 모르는 것은 모른다고 말한다. 날씨는 «미르야 날씨 알려줘» 라고 하면 앱이 안내한다고 알려 준다.', '2. 이번 질문은 웹 검색 도구를 쓸 수 있다. 실시간 정보는 검색을 한 번만 하고 찾은 것만 말하며, 기준 날짜·시각을 함께 말하고 출처 주소는 쓰지 않는다. 검색해도 확실하지 않으면 그렇다고 말한다. 네가 지어내지 않는다.');
        const w = await _claudeSearch(cfg, wprompt, 700);
        const usd = _webCost(w.tokIn, w.tokOut, w.searches, WEB_MODEL);
        await _webSettle(slot, usd, { tokIn: w.tokIn, tokOut: w.tokOut, searches: w.searches, ms: w.ms, ok: !!w.text, stop: w.stop });
        let wt = String(w.text || '').trim().replace(/^미르\s*[:：]\s*/, '');
        if (wt && /[A-Z]{4}\d{7}/.test(wt)) wt = '';
        if (wt.length > 900) wt = wt.slice(0, 900).replace(/[^.!?요다 ]*$/, '').trim() || wt.slice(0, 900);
        if (wt) return { text: wt, rejected: null, tokIn: w.tokIn, tokOut: w.tokOut, ms: w.ms, prov: w.prov, searches: w.searches, usd };
        _logCall({ kind: 'web', ok: false, err: '빈 답(' + (w.stop || '?') + ')', q: String(q).slice(0, 80), tokIn: w.tokIn, tokOut: w.tokOut, searches: w.searches, usd: Math.round(usd * 10000) / 10000, who: (ctx && ctx.inspector) || '', app: (ctx && ctx.app) || '' });   // 4.37: 누가·어느 앱(소유자 화면 «누가 썼나»)
      } catch (e) {
        const hasStatus = !!(e && typeof e.status === 'number' && e.status >= 400);
        await _webSettle(slot, hasStatus ? 0 : WEB_EST_USD, { ok: false, err: String(e && e.message || e).slice(0, 80) });   // HTTP 오류는 청구가 없다 · 시간 초과는 청구됐을 수 있어 예상치를 둔다
        console.warn('[미르 모델] 웹 검색이 안 돼서 검색 없이 답합니다:', e && e.message);
        _logCall({ kind: 'web', ok: false, err: String(e && e.message || e).slice(0, 120), status: (e && e.status) || 0, q: String(q).slice(0, 80), who: (ctx && ctx.inspector) || '', app: (ctx && ctx.app) || '' });
      }
    }
  }
  const r = await _gem(cfg, prompt, 700, false);
  let text = String(r.text || '').trim().replace(/^미르\s*[:：]\s*/, '');
  let rejected = null;
  if (text && (/[A-Z]{4}\d{7}/.test(text) || /\d+\s*(대|무브)(?![가-힣])/.test(text))) { rejected = text; text = ''; }   // 일 자료를 지어낸 답은 버린다
  if (text.length > 900) text = text.slice(0, 900).replace(/[^.!?요다 ]*$/, '').trim() || text.slice(0, 900);
  return { text, rejected, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, prov: r.prov };
}
export async function dataAnswer(q, ctx, cfg) {
  const pack = buildDataPack(q, ctx);
  const packTxt = JSON.stringify(pack);
  const prompt = `너는 평택항 검수앱의 도우미 «미르»다. 아래 자료만 보고 검수원의 질문에 한국어로 3문장 이내로 답한다. «계산해둔것»에 있으면 그것을 그대로 쓰고 직접 세지 않는다. 목록을 말할 땐 5개까지만. 자료의 항목 이름(«계산해둔것» 같은 말)은 입에 올리지 않는다. 자료에 없는 것은 «자료에 없어요»라고 말하고 지어내지 않는다. 숫자·번호는 자료 그대로 쓴다. 자료 속 목록(이름이 «_목록»·«5»·«10»으로 끝나는 것)은 앞쪽 일부만 담은 것이니 목록의 길이를 대수로 말하지 않는다 — 대수는 «총»이나 «계산해둔것»에 적힌 숫자만 쓰고 없으면 «정확한 대수는 자료에 없어요»라고 한다. 존댓말(~예요). 열린 항차가 없어 자료가 비어 있으면 «자료가 비었다»고 하지 말고 «배 이름을 붙여 물어봐 주세요(예 OBWH 몇 시에 끝나)»라고 안내한다.
자료(JSON): ${packTxt}
질문: "${q}"`;
  const r = await _gem(cfg, prompt, 220, false);
  let text = r.text;
  let rejected = null;
  if (text) {
    //  문지기 — 답 속 숫자가 자료(또는 질문)에 «그 숫자 그대로» 없으면 지어낸 것이다. 버린다.
    //  4.30: 종전엔 2자리 이상만 보고 «부분 문자열»로 맞췄다(83 이 1083 안에 있어도 통과). 이제 모든 숫자 덩어리를 자료의 숫자 덩어리와 통째로 맞춘다 — 검수사 «대화는 틀려도 되지만 자료는 정확해야 합니다».
    //  4.35 감사 반영 — 같은 숫자를 다르게 적은 것은 같은 숫자로 본다: ① 0 채움(09:30 ↔ 9시, 07 ↔ 7번) ② 컨번호는 끝 4자리 ③ 천 단위 쉼표(29,200)와 목록 쉼표(101,102)는 둘 중 한 읽기만 맞으면 된다
    //  ④ 규격 말(20·40·45 피트)만 단위로 본다 — 지어낸 «99피트» 는 그대로 걸린다
    const have = new Set();
    (packTxt.match(/\d+/g) || []).concat(String(q).match(/\d+/g) || []).forEach((n) => { have.add(n); have.add(String(Number(n))); if (n.length >= 7) have.add(n.slice(-4)); });
    const strip = (t) => t.replace(/\b(20|40|45)\s*(피트|ft|FT|풋)/g, ' ');
    const badOf = (t) => (strip(t).match(/\d+/g) || []).filter((n) => !have.has(n) && !have.has(String(Number(n))));
    const raw = badOf(text);
    const bad = raw.length ? (() => { const alt = badOf(text.replace(/(\d),(?=\d{3}(?!\d))/g, '$1')); return alt.length < raw.length ? alt : raw; })() : raw;
    if (bad.length) { rejected = { text, bad }; text = '자료로는 확실한 답을 못 만들었어요 — 화면에서 확인해 주세요.'; }
  }
  return { text, rejected, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, prov: r.prov, packChars: packTxt.length };
}

/** 사전 등록 한 벌 — 이 폰 메모리(mirLearnAlias) + 보관소. 검수앱은 App 이 건 쓰기 손(window.__mirLexiconWrite)이 적고, 손이 없는 콘앱은 REST 로 적는다. */
function _learn(q, canonical, who, window_) {
  try {
    const key = mirLearnAlias(q, canonical, who || 'model', { src: 'model', window: window_ || '' });
    if (!key) return;
    const hasHand = typeof window !== 'undefined' && typeof window.__mirLexiconWrite === 'function';
    if (!hasHand) {
      const entry = (typeof window !== 'undefined' && window.__mirLexicon && window.__mirLexicon[key]) || null;
      if (entry) fetch(`${FB}/mir_lexicon/${encodeURIComponent(key.replace(/[.#$/\[\]]/g, '_'))}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, signal: tmoSignal(15000), body: JSON.stringify(entry) }).catch((e) => console.warn('[미르 모델] 사전 보관소 쓰기 실패:', e && e.message));
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
//  4.89: 작업용 검색줄에 일반 대화가 들어왔을 때 내는 한 줄(두 앱 같은 글자 — 콘앱은 mir-core 로 같은 값을 받는다)
export const MIR_CALL_HINT = '"미르야" 하고 부르시면 미르가 답합니다.';

export async function askMirModel(q, ctx, rules, opts = {}) {
  const key = _memoKey(q, ctx);
  if (!_norm(q) || _norm(q).length < 2) return { text: null, via: null, reason: 'short' };
  const cached = _memo.get(key);
  if (cached && typeof cached.then === 'function') return cached;                       // 진행 중 — 같은 약속을 돌려준다(동시 재전송 4회 호출 방지)
  if (cached) return _finish(q, ctx, rules, opts, cached, true);                       // 끝난 것 — 번역·자료 답은 기억, 규칙은 다시
  const p = (async () => {
    const cfg = await getMirConfig();
    if (!cfg.enabled || !(cfg.aiKey || cfg.claudeKey)) { _memo.delete(key); return { text: null, via: null, reason: cfg.enabled ? 'nokey' : 'off' }; }
    const n = await _todayCount();
    if (n >= cfg.dailyCap) { _memo.delete(key); console.warn(`[미르 모델] 오늘 상한 ${cfg.dailyCap}회에 닿았어요 — 규칙만으로 갑니다`); return { text: null, via: null, reason: 'cap' }; }
    const who = opts.who || '';
    let tr = null;
    try {
      tr = await translateQuestion(q, ctx, cfg);
      _logCall({ kind: 'translate', q: String(q).slice(0, 80), canonical: tr.canonical, window: tr.window, conf: tr.confidence, ok: true, tokIn: tr.tokIn, tokOut: tr.tokOut, ms: tr.ms, prov: tr.prov || '', who, app: ctx.app || '' });
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
  let identity = !rec.canonical || _norm(rec.canonical) === _norm(q);
  //  ★ 3.43-02 — 규칙이 **현장 원장(mirKnowledge)** 으로 답했는데 낱말만 몰라 약하게 본 경우, 번역문의 규칙 답이 달라도 원장 답을 바꾸지 않는다.
  //    검수사 실측 2026-09-11 «씰 잘림 대처법» — 원장이 씰 절차를 답했는데 «잘림·대처법» 이 사전에 없어 모델이 «실번호 의심» 으로
  //    번역했고 그 규칙 답(씰번호 틀림)이 원래 답을 덮었다. 자료 답(«0230 몇 킬로 나가» → «0230 중량»)은 종전대로 번역이 이긴다.
  //    번역은 mir_misses 에 남겨 결산에서 가르친다.
  if (!identity && weakByWordsOnly && opts.weakVia === 'knowledge') {
    if (!fromMemo) _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: 'weak→translate(kept)' });
    out.text = opts.weakText; out.via = 'confirmed'; out.reason = 'kept'; return out;
  }
  //  ★ 5.28-05 — 번역문이 원문의 거르기 조건(40피트·영하 18도·14번 베이·끝 번호…)을 잃으면 번역을 버린다(2026-11-27 클로드2 시험 «이번 배 40피트 양하 총 몇 대» → «양하 몇 대» 318).
  //    규칙 답이 있으면 그 답을, 없으면 번역 없이 아래(자료 답) 길로 간다.
  if (!identity) {
    let _lost = []; try { _lost = mirCondLost(q, rec.canonical); } catch (e) { console.warn('[미르 모델] 조건 비교 실패 — 번역을 쓰지 않는 쪽으로:', e); _lost = ['?']; }
    if (_lost.length) {
      if (!fromMemo) _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: 'weak→translate(cond-lost ' + _lost.join('·') + ')' });
      if (opts.weakText) { out.text = opts.weakText; out.via = 'confirmed'; out.reason = 'condLost'; return out; }
      identity = true;   // 번역을 버린다(기억된 번역은 그대로 — 다음에도 같은 판정)
    }
  }
  if (!identity) {
    //  ★ 5.14 — 번역문이 «기록을 남기는 말»이면 그 답을 쓰지 않는다. 화면은 답 뒤에 다시 읽어 그대로 적는다 — 번역이 뜻을 바꾸면 틀린 것이 적힌다
    //    (실측 2026-11-19 04:56 «2호기 04:00 KSKM으로 이동» → 번역 «2호기 04:00 KSKM 시작했어»(0.9) → 자동 별칭이 되어 KSKM 시작 시각이 적힘).
    let _wr = false; try { _wr = isWriteParse(parseNaturalQuery(rec.canonical)); } catch (e) { console.warn('[미르 모델] 번역문 기록 말 판정 실패 — 막는 쪽으로:', e); _wr = true; }
    if (_wr) {
      if (!fromMemo) _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: 'weak→translate(write-blocked)' });
      out.text = `«${rec.canonical}» 로 알아들었어요 🐱 그런데 기록을 남기는 말은 짐작해서 적지 않아요 — 아무것도 바꾸지 않았어요. 그 뜻이 맞으면 그대로 말씀해 주세요.`;
      out.via = 'translateWrite'; out.reason = 'writeBlocked';
      return out;
    }
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
  //  ★ 4.36 생활회화 층 — 규칙이 못 받은 일 아닌 말은 소네트가 이어서 말한다(자료 답으로 가지 않는다). 막히면 종전 길(규칙 답)로 돌아간다.
  //  4.36-02: 생활회화 시도를 한 함수로 — «언제·몇 시» 같은 일 낱말이 든 상식 질문(임진왜란은 언제야)은 자료 답이 «자료에 없어요»로 끝났을 때 한 번 더 이 길로 받는다.
  let chatTried = false;
  const tryChat = async () => {
    chatTried = true;
    //  ★ 4.89 (검수사 2026-11-12 19:41 «미르를 부르지 않고 글로 치거나 마이크로 이야기 하면 … 작업용으로 봅니다. 미르를 … 부르면 일반 대화용이나 … 비서 역활») —
    //    작업용 검색줄(ctx.workOnly)은 생활회화·웹 검색을 부르지 않고 부르는 법 한 줄만 낸다. 미루기(사담 큐)도 하지 않는다.
    if (ctx && ctx.workOnly && mirWorkChatOf(q)) {   /* 4.89 재감사: 규칙 길(2255)과 같은 판정 한 벌 */ out.text = MIR_CALL_HINT; out.via = 'workHint'; out.reason = 'workOnly'; return true; }
    //  4.38: 작업 중 사담 미루기 — 미루는 자리는 여기 하나다(두 앱 같은 판정). 번역이 일 뜻으로 옮긴 말은 여기까지 오지 않고,
    //    여기 온 말도 일 낱말·앱 말이 있으면(«화장실 어디 있어»·«사진 올리는 법»·«콘 빠졌어») 미루지 않는다(감사 B2·B3·B4). 미루면 생활회화·웹 검색을 부르지 않는다.
    if (_isGeneralTalk(q)) { const _t = (ctx && ctx._now) || Date.now(); const bz = mirBusyNow(ctx, _t); if (bz.busy) { _deferPush(q, _t, who); if (!fromMemo) _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical || '', how: 'defer', why: bz.why }); out.text = MIR_DEFER_TEXT; out.via = 'defer'; out.reason = bz.why; return true; } }   // 미룬 말은 mir_misses(how defer)에 — 잘못 미룬 말을 결산에서 찾는다(mir_model_log 는 하루 상한·비용 집계라 쓰지 않는다)
    if (!cfg) cfg = await getMirConfig();
    if (!(cfg.claudeKey || cfg.aiKey)) return false;
    try {
      const ca = await chatAnswer(q, ctx, cfg);
      _logCall({ kind: ca.searches ? 'web' : 'chat', q: String(q).slice(0, 80), a: String(ca.text || '').slice(0, 200), ok: !!ca.text, rejected: !!ca.rejected, tokIn: ca.tokIn, tokOut: ca.tokOut, ms: ca.ms, prov: ca.prov || '', ...(ca.searches ? { searches: ca.searches, usd: Math.round((ca.usd || 0) * 10000) / 10000 } : {}), who, app: ctx.app || '' });
      if (ca.text) { _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical || '', how: 'chat' }); out.text = ca.text; out.via = 'chat'; out.reason = 'chat'; _deferDrop(q, (ctx && ctx._now) || Date.now(), who); return true; }   // 4.38: 답했으면 미룬 목록에서 지운다
    } catch (e) {
      console.warn('[미르 모델] 생활회화 답 실패:', e && e.message);
      _logCall({ kind: 'chat', q: String(q).slice(0, 80), ok: false, err: String(e && e.message || e).slice(0, 120), who, app: ctx.app || '' });
    }
    return false;
  };
  if (!weakByWordsOnly && !rec.canonical && isChatCandidate(q, rec.window) && !_hasKnownShipCode(q, ctx)) {   // 4.36-01: 일 낱말이 없고 번역도 일 뜻으로 못 옮긴 말은 전부 클로드가 받는다(일반 상식 포함)
    if (await tryChat()) return out;
  }
  //  생활회화로 못 받은 낱말 말(미르·인사·식사)은 자료 답으로 가지 않는다
  if (rec.window === '잡담' && /미르|힘드|수고|고마|안녕|밥|점심|저녁|아침|커피/.test(q)) { out.reason = 'smalltalk'; return weakByWordsOnly ? confirmed() : out; }
  //  ② 자료 답 — 기억된 것이 있으면 그것(같은 항차·같은 문장), 없으면 모델
  if (rec.model && Date.now() - (rec.at || 0) < 10 * 60 * 1000) { out.text = rec.model; out.via = 'model'; return out; }   // 자료 답은 10분만 기억 — 진행이 바뀌면 다시(재감사)
  if (!cfg) cfg = await getMirConfig();
  if (!(cfg.aiKey || cfg.claudeKey)) { out.reason = 'nokey'; return weakByWordsOnly ? confirmed() : out; }
  try {
    const da = await dataAnswer(q, ctx, cfg);
    _logCall({ kind: 'data', q: String(q).slice(0, 80), a: String(da.text || '').slice(0, 200), ok: true, rejected: !!da.rejected, tokIn: da.tokIn, tokOut: da.tokOut, ms: da.ms, prov: da.prov || '', packChars: da.packChars, who, app: ctx.app || '' });
    const empty = !da.text || /자료에 없어요|자료에는 없|확실한 답을 못/.test(String(da.text));
    if (!weakByWordsOnly && !rec.canonical && !chatTried && !/[A-Za-z]{4}|\d{3,}/.test(String(q)) && /자료에(는)?\s*없|자료만\s*(볼|봐|보고)|확실한 답을 못/.test(String(da.text || '')) && (await tryChat())) return out;   // 배 이름·번호가 든 일 질문은 «자료에 없어요» 그대로(상식으로 바꾸지 않는다)   // 4.36-02: 일 낱말이 든 상식 질문 구제
    if (weakByWordsOnly && (da.rejected || empty)) return confirmed();
    //  4.35-01: 규칙이 사용법 안내(howTo)를 냈는데 모델이 «자료에 없어요» 로 덮지 않는다(라이브 실측 «사용법 알려줘»).
    if (opts.weakText && opts.weakVia === 'howTo' && !da.rejected && empty && !WEAK_TEXT.test(String(opts.weakText))) return confirmed();
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
//  5.28 건의 — 지난 항차 견주기 재료: ships/{배}/voyages(평택 대수) + archive/{바로 앞 항차} 양하·선적(사진 빼고). REST·8초 타임아웃.
async function _getJson(path, ms = 8000) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = setTimeout(() => { try { ac && ac.abort(); } catch (e) { /* 이미 끝남 */ } }, ms);
  try { const r = await fetch(`${FB}/${path}.json`, ac ? { signal: ac.signal } : {}); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally { clearTimeout(tm); }
}
const _prevCache = {};   // 항차 키 → { at, val } — 같은 항차는 10분 안에 다시 받지 않는다(다운로드 요금 · 검수사 2026-11-17)
/** 앞 항차 키 — 이 항차보다 먼저 만든 것(createdAt · 없으면 완료·분석 시각) 중 최근 순. 키 글자 순서가 아니라 시각으로 고른다(감사: 코드 개명·자릿수). */
export function prevVoyKeys(voys, curK) {
  const t = (x) => Number(x && (x.createdAt || x.completed_at || x.analyzed_at)) || 0;
  const cur = voys && voys[curK] ? t(voys[curK]) : 0;
  return Object.keys(voys || {}).filter((k) => voys[k] && k !== curK && (!cur || !t(voys[k]) || t(voys[k]) < cur))
    .sort((a, b) => (t(voys[b]) - t(voys[a])) || (a < b ? 1 : -1));
}
export async function fetchPrevCmp(ctx) {
  const inf = (ctx && (ctx.info || (ctx.voyage && ctx.voyage.info) || (ctx.shipCtx && ctx.shipCtx.info))) || {};
  const curK = S((ctx && (ctx.voyageKey || (ctx.shipCtx && ctx.shipCtx.key))) || '');
  if (curK && _prevCache[curK] && Date.now() - _prevCache[curK].at < 10 * 60 * 1000) return _prevCache[curK].val;
  //  선박 노드 키 — 항차 화면(VoyagePage)과 같은 순서: IMO → 콜사인 → 선박코드
  const keys = [S(inf.imo), S(inf.callsign), S(inf.vsl).toUpperCase()].filter(Boolean);
  if (!keys.length) { console.warn('[미르] 지난 항차 — 선박 키(IMO·콜사인·코드)가 없어 받지 않아요'); return null; }
  let voys = null;
  for (const k of keys) { const x = await _getJson(`ships/${encodeURIComponent(k)}/voyages`, 5000); if (x && typeof x === 'object' && Object.keys(x).length) { voys = x; break; } }
  if (!voys) return null;
  const prevKey = prevVoyKeys(voys, curK)[0] || null;
  let prevVoy = null;
  if (prevKey) {
    //  보관 항차는 EDI 원문(raw)까지 들어 있어 크다 — 견주기에 쓰는 컨 행(ediContainers·records)만 받는다.
    const P = (md, part) => _getJson(`archive/${encodeURIComponent(prevKey)}/${md}/${part}`, 8000).catch((e) => { console.warn('[미르] 지난 항차 보관 자료 받기 실패:', md, part, e); return null; });
    const [de, dr, le, lr] = await Promise.all([P('discharge', 'ediContainers'), P('discharge', 'records'), P('loading', 'ediContainers'), P('loading', 'records')]);
    if (de || dr || le || lr) prevVoy = { discharge: { ediContainers: de || {}, records: dr || {} }, loading: { ediContainers: le || {}, records: lr || {} }, info: { vsl: S(inf.vsl) } };
  }
  const val = { voys, prevKey, prevVoy };
  if (curK) _prevCache[curK] = { at: Date.now(), val };
  return val;
}

export async function askMir(q, ctx, rulesFn, opts = {}) {
  const trace = {};
  if (ctx && !ctx._prevCmp && PREV_RE.test(S(q)) && PREV_CMP_RE.test(S(q))) { try { ctx._prevCmp = await fetchPrevCmp(ctx); } catch (e) { console.warn('[미르] 지난 항차 자료 받기 실패 — 대수만 견줍니다:', e); } }
  let rulesText = null;
  try { rulesText = rulesFn(q, trace); } catch (e) { console.warn('[미르] 규칙 답 실패:', e && e.message); rulesText = null; }
  const weak = isWeakAnswer(q, rulesText, trace);
  if (!weak) return { text: rulesText, via: 'rules', weak: false, rulesText, trace };
  //  숫자만·한글 없음 → 모델을 부를 말이 아니다(끝네자리 조회는 화면 카드가 답한다). 조작·적는 말(밝기·호기·시작·갱)은 규칙이 이미 했다 — 번역문으로 두 번 실행하지 않는다(감사 실측 밝기 두 칸).
  //  4.38 (감사 M1): «아까 미뤄 둔 이야기» 단추에 «응·네·sp» 로 답하면 대화 층이 그 질문으로 되쓴다(trace.rq) — 모델에는 원문 «응» 이 아니라 그 질문을 넘긴다.
  if (trace.rq && _norm(trace.rq) !== _norm(q) && mirIsDeferred(trace.rq, (ctx && ctx._now) || Date.now(), opts.who || (ctx && ctx.inspector) || '')) q = trace.rq;
  let p = null; try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (/^[\d\s.,-]+$/.test(String(q)) || !/[가-힣]{2,}|[A-Za-z]{3,}/.test(String(q)) || (p && (p.deviceCmd || p.crewSet || p.startSet || p.gangSet))) return { text: rulesText, via: rulesText ? 'rules' : null, weak, rulesText, trace };
  //  배운 별칭이 있으면 모델 없이 그것으로(nlSearch 의 되쓰기는 «못 알아들었을 때»만 도는데, 여기는 «약하게 알아들은 말»도 받는다)
  try {
    const rw = mirRewrite(q);
    //  5.14 감사 상3 — 자동 별칭이 «기록 말»로 되쓰면 그 답을 쓰지 않는다(화면은 원말을 다시 읽어 적지 않으므로 «적을게요» 는 거짓 답이 된다).
    let _rwWrite = false; try { _rwWrite = !!(rw && mirRewriteIsAuto(q) && isWriteParse(parseNaturalQuery(rw))); } catch (e) { console.warn('[미르] 별칭 기록 말 판정 실패:', e); _rwWrite = true; }
    if (rw && _norm(rw) !== _norm(q) && !_rwWrite) { const t2 = {}; const a = rulesFn(rw, t2); if (a && !isWeakAnswer(rw, a, t2)) return { text: a, via: 'lexicon', weak, rulesText, trace, canonical: rw }; }
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
//  5.27: «오버랜드 숏랜드 가 뭐에요? 마감할때 그거 쓰라고 하시던데» — «그거» 가 앞말을 가리키는 뜻 질문은 컨 참조가 아니다(현장 문답 원장이 혼자 답하면 되묻지 않는다).
function _refSelfContained(q) { try { return !!fieldAnswer(String(q || '').replace(TH_REF_RE, ' '), (s2) => mirKnowledge(s2)); } catch (e) { console.warn('[미르 대화] 원장 확인 실패:', e); return false; } }
const TH_PROMPT_CHIPS = ['몇 시에 끝나', '남은 대수', '브리핑'];
const TH_CLOSE_LINES = ['네, 언제든 부르세요 😺', '네! 수고하세요, 또 불러 주세요 😺', '알겠어요. 필요하면 미르야 하고 부르시면 돼요 😺'];
const TH_NO_LINE = '네, 그럼 두고 볼게요. 필요하면 또 부르세요 😺';
//  4.40: «N번 베이로 옮겨 드릴까요?» 뒤의 [이동]·[취소](누른 단추 글자 그대로 오거나 말로 «응·옮겨 줘·아니·그대로»)
const TH_GO_RE = /^(?:(?:응|네|예|그래)\s*,?\s*)?(?:이동(?:해|해요|하자|할게|할께|합시다|해\s*줘|해\s*주세요)?|옮겨(?:요|\s*줘|\s*주세요)?|옮기자|가자|가\s*줘)[.!~]*$/;
//  [이동] 을 받는 «네» — 되묻는 «네?·응?» 과 «알려줘·보여줘·맞아» 는 아니다(4.40 감사 d — TH_YES_RE 는 «?» 와 그 말들을 받아 옮기기로 풀렸다)
const TH_ACT_YES_RE = /^(?:(?:응|어|네|예)\s*,?\s*)?(응|어|네|넵|예|그래|그래요|좋아|좋아요|좋지|해줘|해 줘|부탁해|ㅇㅇ|sp|웅|응응|그러자|오케이|ok)[.!~]*$/i;
const TH_STAY_RE = /^(?:취소|취소해|취소해\s*줘|안\s*해|하지\s*마|그대로|그대로\s*둬|그냥\s*둬|안\s*옮겨|옮기지\s*마)[.!~]*$/;
const TH_ACT_STAY = '네, 그대로 둘게요. 하던 장에서 계속하세요 😺';
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
//  4.87-03: 점검·상세·해결 답이 같은 재료를 쓰게 한 벌로 — [컨 목록, 이름표, 리스트 기록, EDI 컨]
const _sealArgsOf = (c, cs, v, mode, modeKr) => [cs.filter((x) => c.mode ? x._mode === mode : true), c.mode ? modeKr : '양하·선적', c.mode ? (v && v[mode] && v[mode].records) || null : [v && v.discharge && v.discharge.records, v && v.loading && v.loading.records], c.mode ? (v && v[mode] && v[mode].ediContainers) || null : [v && v.discharge && v.discharge.ediContainers, v && v.loading && v.loading.ediContainers]];
//  4.87-02: 실번호 점검 답 뒤의 후속 물음에서 가리키는 말·대수·보여 달라는 말을 걷어 낸 나머지 — 빈 글이면 다른 주제가 없는 후속이다(«17개 보여줘»·«그 17대 뭐야»·«어떤 컨이야»).
function _sealFollowRest(Q) {
  return String(Q || '').replace(/\d+\s*(?:개|대|건)/g, '').replace(/보여\S*|알려\S*|뭐\S*|뭔\S*|무엇\S*|어떤|어느|목록|리스트|상세\S*|자세\S*|그거|그것|컨테이너|컨|번호|실|씰|미르야?|아까|방금|전부|모두|주세요|[그이저것거좀다만줘야요를을은는가]|[\s?!.,~]/g, '');
}
//  4.87-03: «실번호 점검 뒤 해결 물음» 판별 — 같은 배·같은 검수원이 점검 답을 받은 지 60분 안인가(_sealLive), 그리고 물음이 가리키는 말·해결 말만 남는가(_sealFollowKind).
//    돌려주는 값 'remedy'(해결 방법) · 'result'(해결 결과) · ''(아니다). 가리키는 말(실번호·실오류·씰·문제·오류·의심·그거·그 컨 …)과 해결 말(해결·고치·처리·수정 …)을 걷어 낸 나머지가 빈 글일 때만 받는다 —
//    «아직 남았어?»(잔여 대수)·«다시 확인해줘»·«사진 수정 어떻게 해»·«완료 처리됐어?»·«리씰 어떻게 처리해» 는 남는 글이 있거나 가리키는 말·해결 말이 없어 종전 답으로 간다.
const _SF_SUBJ = /실번호|실오류|씰|(?<![가-힣])실(?![가-힣])|문제|오류|의심|그거|그것|그\s*컨테이너|그\s*컨|이거|저거|아까|방금|미르야?|지금|이제|전부|모두|다|좀|\d+\s*(?:개|대|건)/g;
const _SF_REM = /해결\S*|조치\S*|대처\S*|처리\S*|고치\S*|고쳐\S*|고쳤\S*|바로잡\S*|수정\S*|어떻게|방법|해야|제시\S*|알려\S*|뭐\S*|뭔\S*|됐\S*|했\S*|돼\S*|되었\S*|된\S*|됨|여부|결과|아직|여전히|여전|지금도|남았\S*|남아\S*|있어\S*|있나\S*|있는\S*|그대로|다시|재|점검\S*|확인\S*|검사\S*|세어\S*|줄었\S*|없어졌\S*|풀렸\S*|해\S*|하\S*|안|못|[?!.,~\s은는이가을를도만]/g;
function _sealFollowKind(Q) {
  const s = String(Q || '');
  if (/(?:실번호|씰|(?<![가-힣])실(?![가-힣]))\s*(?:다시\s*)?(?:점검|검사)/.test(s)) return '';   // «실 점검 다시 해줘» 는 점검을 새로 돌린다
  if (s.replace(_SF_SUBJ, '').replace(_SF_REM, '') !== '') return '';
  //  가리키는 말(실번호·실오류·씰·문제·의심·그거·그 컨·아까)이 있거나, 해결 말이 «해결·조치·대처·바로잡» 일 때만. «처리·수정·고치» 는 완료 처리·컨 번호 수정·보고 고치기 안내와 겹쳐 가리키는 말이 함께 있을 때만(감사 2차 «부»).
  const subj = /실번호|실오류|씰|(?<![가-힣])실(?![가-힣])|문제|의심|그거|그것|그\s*컨|아까/.test(s);
  const strong = /해결|조치|대처|바로잡/.test(s);
  const solve = strong || /고치|고쳐|고쳤|처리|수정/.test(s);
  if (!subj && !strong) return '';
  if (/됐|했|고쳤|돼|되었|된|됨|여부|결과|아직|여전|남았|남아|줄었|없어졌|풀렸|다시|재\s*(?:점검|확인)/.test(s)) return 'result';
  return (solve || /어떻게|방법|해야|제시/.test(s)) ? 'remedy' : '';
}
let _sealSnap = null;    // 4.87-03: 점검 답이 처음 알린 실번호 문제 목록 { key, mode, list:[{cn,kind}] } — «해결됐어?» 에서 지금과 견준다
let _sealAuditAt = 0;   // 4.87-02: 마지막 실번호 점검 답 시각 — 후속 물음(«그 17개 보여줘»)을 알아보는 데 쓴다
let _sealAuditKey = '';  // 4.87-03: 그 점검 답을 받은 «항차|검수원» — 배·검수원이 바뀌면 후속으로 보지 않는다
const _sealKeyOf = (c) => `${(c && c.voyageKey) || ''}|${(c && c.inspector) || ''}`;
const _sealLive = (c, now) => _sealAuditAt > 0 && _sealAuditKey === _sealKeyOf(c) && now - _sealAuditAt < 60 * 60000;
export function _mirThreadReset() { for (const k of Object.keys(_threads)) delete _threads[k]; _threadClosed = null; _sealAuditAt = 0; _sealAuditKey = ''; _sealSnap = null; }

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
    if (TH_REF_RE.test(q) && !(_sealLive(ctx, now) && _sealFollowKind(q)) && !_refSelfContained(q)) return { q, direct: TH_REF_ASK, kind: 'prompt', how: '대화 밖 «그거» — 붙을 컨이 없다' };
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
  //  ★ 4.40 — 직전 답이 «N번 베이로 옮겨 드릴까요?»(단추 [이동]·[취소])면 «이동·응·옮겨 줘» 는 옮기고(kind 'act' — 화면이 mirGotoRequest), «취소·아니·그대로» 는 둔다.
  //    단추를 누르면 그 글자(«이동»·«취소»)가 그대로 온다. 대화 층이 직접 답하므로 엔진·모델로 가지 않는다.
  const _act = (!afterMiss && last.follow && last.follow.act) ? last.follow.act : null;
  if (_act) {
    //  번호로 고르기(«첫 번째·1번» = [이동] · 그 밖의 번호 = [취소]) — 맨숫자는 접수된 말에서만(검색창에 치기 시작한 숫자가 풀리지 않게 — 칩 풀이와 같은 문지기)
    const _pk = TH_PICK_RE.test(q) && (!/^\d$/.test(q) || ut) ? (/둘|두|2|셋|세|3/.test(q) ? 'no' : 'go') : '';
    if (TH_GO_RE.test(q) || TH_ACT_YES_RE.test(q) || _pk === 'go') return { q, direct: `🚀 ${_act.bay}번 베이로 옮길게요 — 자동 가이드 첫 카드를 보세요.`, kind: 'act', how: `«${q}» → ${_act.bay}번 베이로 이동` };
    if (TH_STAY_RE.test(q) || TH_NO_RE.test(q) || _pk === 'no') return { q, direct: TH_ACT_STAY, kind: 'actNo', how: `«${q}» → 옮기지 않음` };
    if (/^(?:네|응|어|예|그래|뭐|뭐라고|왜)\s*[?？]+$/.test(q) || /^(?:알려\s*줘|보여\s*줘|맞아요?|맞지)[.!~?？]*$/.test(q)) return { q, direct: `${_act.bay}번 베이로 옮길까요? [이동] 이나 «응» 하시면 옮기고, [취소] 나 «아니» 하시면 그대로 둘게요.`, kind: 'prompt', how: '되묻는 «네?» · «알려줘·보여줘·맞아»(재감사 하-2 — 칩 풀이로 «이동» 글자가 엔진에 가 모델로 새던 것)' };
  }
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
    } else if (!(_sealLive(ctx, now) && _sealFollowKind(rq)) && !_refSelfContained(rq)) {   // 4.87-03: 붙을 컨이 없고 실번호 점검 뒤 «그거 어떻게 고쳐» 면 컨 참조가 아니라 해결 물음 — 붙을 컨이 있으면 종전대로 그 컨
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
  //  ★ 4.40 — [이동]·[취소] 를 받았다 — 단추를 거두고(한 번만 옮긴다) 옮길 것(act)을 화면에 돌려준다. 화면이 kind 'act' 일 때 mirGotoRequest(act).
  if (r.kind === 'act' || r.kind === 'actNo') {
    let act = null;
    if (hit) { const last = hit.th.turns[hit.th.turns.length - 1]; if (last && last.follow) { act = last.follow.act || null; last.follow = { line: '', chips: [] }; } hit.th.at = now; hit.th.lastUtter = { raw: q, q, direct: r.direct, kind: r.kind, utterAt: ut }; }
    return { kind: r.kind, q, line: '', chips: [], confirm: '', act: r.kind === 'act' ? act : null };
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
  //  4.35-02: 배를 되묻는 답이면 이름을 치라고만 하지 않고 일하는 배·곧 시작할 배를 단추로 보여 준다(누르면 그 배로 같은 말을 묻는다). 되묻기는 얼버무림이 아니다 — «맞게 알아들었나요?» 를 붙이지 않는다.
  if (isShipAskText(text) && ctx && ctx.voyages) {
    const PC = shipPickChips(text, rq, ctx.voyages, now);
    if (PC.length) {
      const fol = { line: '배 이름이 생각 안 나시면 아래에서 골라 주세요.', chips: PC };
      const tn = { q, rq, intent: 'shipAsk', entity: {}, ship: '', answer: _thNorm(text).slice(0, 200), follow: fol, confirm: '', at: now };
      const th0 = hit ? hit.th : null;
      if (th0) { th0.turns.push(tn); if (th0.turns.length > THREAD_MAX_TURNS) th0.turns.shift(); th0.at = now; th0.missAt = 0; th0.lastUtter = { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut }; }
      else _threads[key] = { turns: [tn], at: now, missAt: 0, lastUtter: { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut } };
      return { kind: 'answer', q: rq, line: fol.line, chips: fol.chips.slice(), confirm: '' };
    }
  }
  let p = null; try { p = parseNaturalQuery(rq); } catch (e) { p = null; }
  const hedged = _thHedged(rq, text, via);
  const intent = _thIntent(rq, p, text);
  const entity = _thEntity(rq, p, text, ctx);
  const th = hit ? hit.th : null;
  //  다 끝났는가 — 재료(항차 info 의 양하·선적 완료 표시)가 먼저, 없으면 답 문장(«다 끝났어요»·«남은 작업: 0대»)·이 대화의 앞 답(2차 시뮬 ①: 속도 답 뒤에 ETA 를 권하던 것)
  const inf = (ctx && (ctx.info || (ctx.voyage && ctx.voyage.info))) || null;
  const _pl = inf ? Number(inf.planLod) : NaN;   // 양하만 하는 배(선적 계획 planLod 0 — utils 와 같은 칸)는 양하 완료만으로 끝
  //  4.55-01: 이 줄은 일부러 info 만 본다 — 콘앱은 항차 전체 없이 {info} 만 넘겨(public/cone.html) inspectorAllDone 을 부르면 콘앱·검수앱의 «다 끝났나» 대답이 갈린다(두 앱 같은 답). 선적 EDI 를 기다리는 배(DXQD)가 화면에서 «검수 완료» 로 읽히던 것은 홈·수석 보드·보관 보고·홀드 잔여가 고쳤다.
  const done = !!(inf && inf.dischargeDone && (inf.loadingDone || _pl === 0)) || _thIsDone(text) || !!(th && th.turns.some((t) => _thIsDone(t.answer || '')));
  //  그 턴의 배 코드 — 홈에서 배 이름 붙인 질문 뒤의 «응» 에 붙인다(ctx.vsl · info.vsl · shipCtx.info.vsl · 되쓴 말 머리의 배 코드)
  const ship = S((ctx && (ctx.vsl || (ctx.info && ctx.info.vsl) || (ctx.shipCtx && ctx.shipCtx.info && ctx.shipCtx.info.vsl))) || String((ctx && ctx.voyageKey) || '').split('_')[0]).toUpperCase();
  let follow = hedged ? null : _thFollowFor(intent, rq, text, entity, now, th, via, done, ship);   // 3.69: ship — 야드 갈래가 배 유무로 칩을 고른다
  //  ★ 4.40 — «N번 베이로 옮겨 드릴까요?» 뒤에는 [이동]·[취소] 단추만(행동 act 를 같이 기억 — 다음 «이동·응» 을 대화 층이 kind 'act' 로 받는다)
  const _gact = via === 'guideGoto' ? mirGotoActOf(text) : null;
  if (_gact) follow = { line: '', chips: ['이동', '취소'], act: _gact };
  else if (via === 'guideGoto') follow = null;   // 옮길 수 없다는 답(다 끝남·자료에 없음·셀 좌표 없음) 뒤에는 단추를 달지 않는다
  else if (via === 'bayTidy') follow = null;   // 4.81: 베이 정리 현황 뒤에는 다른 제안 단추를 달지 않는다(읽기 전용 답)
  else if (via === 'workStop') follow = null;   // 4.42-02: «⏸ 강풍 대기로 멈춘 걸로 적을게요» 뒤에 «이 속도면 몇 시에 끝나는지도 볼까요?» 를 붙이지 않는다 — 멈춘 배에 속도·남은 시각 제안은 맞지 않는다(검수사 2026-10-21 13:25 화면)
  //  4.38: 쉬는 틈(바쁘지 않음을 잴 수 있을 때만)에 미뤄 둔 사담이 있으면 그 말을 단추로 먼저 띄운다 — 누르면 그 말 그대로 묻는다(그때 클로드가 답한다).
  if (!_gact && via !== 'defer' && ctx && (ctx.work || ctx.app === 'cone') && !MIR_NEVER_DEFER_RE.test(String(q0 || '')) && !MIR_NEVER_DEFER_RE.test(String(rq || ''))) {   // 위기·안전·몸·마음 말 답 뒤에는 미룬 사담 단추를 붙이지 않는다(마지막 감사 C1 — «죽고 싶어» 뒤 «농담 나눌까요?» · 이어 한 «응» 이 농담으로 갔다)
    try {
      const pend = mirDeferredPending(now, { fresh: true, who: (ctx && ctx.inspector) || '' }).filter((x) => _norm(x) !== _norm(rq));   // 한 번 띄운 것은 다시 띄우지 않는다(감사 M3 — «아니» 로 넘겨도 답마다 되풀이하던 것)
      if (pend.length) { const bz = mirBusyNow(ctx, now); if (bz.known && !bz.busy) { follow = { line: `아까 미뤄 둔 이야기(«${pend[0]}»), 지금 나눌까요?`, chips: [pend[0]].concat(((follow && follow.chips) || []).filter((x) => x !== pend[0])).slice(0, 4) }; _deferOffered(pend[0], now, (ctx && ctx.inspector) || ''); } }
    } catch (e) { /* 단추가 없어도 답은 그대로 */ }
  }
  const confirm = hedged ? TH_CONFIRM_LINE : '';
  const turn = { q, rq, intent, entity: { cn: entity.cn, l4: entity.l4, bay: entity.bay }, ship, answer: _thNorm(text).slice(0, 200), follow, confirm, at: now };
  if (th) { th.turns.push(turn); if (th.turns.length > THREAD_MAX_TURNS) th.turns.shift(); th.at = now; th.missAt = 0; th.lastUtter = { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut }; }
  else _threads[key] = { turns: [turn], at: now, missAt: 0, lastUtter: { raw: q, q: rq, direct: null, kind: r.kind, utterAt: ut } };
  return { kind: 'answer', q: rq, line: follow ? follow.line : '', chips: follow ? follow.chips.slice() : [], confirm, act: (follow && follow.act) || null };   // 4.40: act — [이동]·[취소] 단추가 붙은 답(화면은 그리기만, 옮기는 것은 «이동» 을 받은 kind 'act')
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
  return voyagePierOf(info) || 'PCTC';   // ★ 일괄수리(2026-11-10): 부두 판정 한 벌(utils.voyagePierOf — pier → 선석). 모를 때 PCTC 는 종전 그대로
}

const _WORK_ACT_RE = /(^|_)(start|pause|resume|done)$/;   // 4.06 감사: 카톡 이관 보고는 «pause»·«resume» 접두어가 없다(kakaoWorkLog) — workPauseOf 와 화남이 한 벌로 본다
/** 앱 보고(WorkReportModal → voyages/{키}/reports)로 본 «지금 작업 중단 중인가». 마지막 작업 상태 보고가 중단(«{모드}_pause»·«external_pause»)이면
 *  { mode, reason, equip, ts, ko } 를, 그 뒤에 시작·재개·완료 보고가 있으면 null. 12시간 넘은 옛 보고는 안 본다.
 *  3.69-01 — 검수사 2026-09-29 18:56 «앱에서 야드혼잡의 이유로 작업중단을 했습니다. DJCF PCSZ 앱에 기록이 안되나요 카톡보고를 했으면 앱은 알고 있을텐데»
 *  — 미르 화남(«완료 기록이 113분째 없어요» — 4.06 전엔 초조함)과 야드 답이 이 보고를 본다. */
//  4.63-04 own = { inspector, equip } — «내 호기의 중단인가». 다른 호기가 계속 일하면 터미널 실적(src:'term')이 중단 뒤에도 찍혀
//  종전엔 그것을 «재개»로 읽어 장비 고장 중단을 잊었다(검수사 2026-11-04 08:58 «장비고장으로 작업중단보고를 했는데 자꾸 해치커버를 열거냐고 물어보는데»
//  — STSE 2685E: 2호기 고장 보고 22분 뒤에도 1호기 터미널 실적이 찍혀 재개로 읽힘). own 이 오면 내 완료(by·호기가 같은 것)만 재개로 본다.
export function workPauseOf(v, now = Date.now(), own = null, o = {}) {   // 5.29-04 재감사(3차): o.perEquip — 답 문구에서만 호기별(재개 안 한 호기의 중단)을 본다. 배 단위 판정(사담·화남·5180)은 종전 그대로
  const reps = v && v.reports;
  if (!reps || typeof reps !== 'object') return null;
  let last = null;
  for (const k of Object.keys(reps)) {
    const r = reps[k]; if (!r || typeof r !== 'object') continue;
    const repTs = Number(r.ts) || Number(k) || 0;
    const ts = Number(r.saidAt) || repTs;   // 5.29-04: 말한 시각(saidAt)이 있으면 그 시각이 멈춘 때(표시) — 재개 판정은 적은 때(repTs) 뒤 완료로(감사 중 1)
    if (!ts || ts > now + 5 * MIN || now - ts > 12 * 3600000) continue;
    const act = String(r.action || '');
    const isStatus = r.type === 'work_status' && _WORK_ACT_RE.test(act);
    const isExt = r.type === 'external_pause';
    if (!isStatus && !isExt) continue;
    if (!last || ts > last.ts) last = { ts, repTs: Math.max(ts, repTs), act: isExt ? 'external_pause' : act, mode: String(r.mode || ''), reason: String(r.reason || ''), equip: String(r.equip || '') };
  }
  //  재개 보고 없이 일을 다시 시작하는 일이 흔하다 — 중단 뒤에 완료 기록이 찍혔으면 재개로 본다(재감사 2).
  const _doneAfter = (x, eqOnly) => { for (const m of ['discharge', 'loading']) { const comp = v[m] && v[m].completed; if (!comp || typeof comp !== 'object') continue; for (const c of Object.values(comp)) { const at = c && Number(c.at); if (!(at && at > (x.repTs || x.ts) && at <= now + 5 * MIN)) continue; if (eqOnly && c.equip !== eqOnly) continue; if (own && !((own.inspector && c.by === own.inspector) || (own.equip && c.equip === own.equip))) continue; return true; } } return false; };
  if (!last || !/pause$/.test(last.act) || _doneAfter(last, '')) {
    //  ★ 5.29-04 재감사(2차) 3 — «3·4호기 중단» 뒤 3호기만 재개하면 4호기는 아직 멈춤이다. 배 전체 마지막 보고가 재개라도 호기마다 마지막 상태가 중단이고
    //    그 호기 완료 기록(equip 이 그 호기)이 뒤에 없으면 그 호기 중단을 돌려준다(호기 없는 완료로는 어느 호기가 재개했는지 몰라 종전대로 배 전체 판정).
    let alt = null;
    if (!own && o && o.perEquip) for (const k of Object.keys(reps)) {
      const r = reps[k]; if (!r || r.type !== 'work_status' || !r.equip || !_WORK_ACT_RE.test(String(r.action || ''))) continue;
      const rt = Number(r.ts) || Number(k) || 0; const t1 = Number(r.saidAt) || rt; if (!t1 || t1 > now + 5 * MIN || now - t1 > 12 * 3600000) continue;
      const later = Object.keys(reps).some((k2) => { const r2 = reps[k2]; if (!r2 || r2.type !== 'work_status' || r2.equip !== r.equip || r2 === r || !_WORK_ACT_RE.test(String(r2.action || ''))) return false; const t2 = Number(r2.saidAt) || Number(r2.ts) || Number(k2) || 0; return t2 > t1 || (t2 === t1 && (Number(r2.ts) || 0) > rt); });
      if (later || !/pause$/.test(String(r.action || ''))) continue;
      const cand = { ts: t1, repTs: Math.max(t1, rt), act: String(r.action || ''), mode: String(r.mode || ''), reason: String(r.reason || ''), equip: String(r.equip || '') };
      if (_doneAfter(cand, cand.equip)) continue;
      { let _noEqDone = false; for (const m of ['discharge', 'loading']) { const comp = v[m] && v[m].completed; if (comp && typeof comp === 'object') for (const x of Object.values(comp)) { const at = x && Number(x.at); if (at && !x.equip && at > cand.repTs && at <= now + 5 * MIN) { _noEqDone = true; break; } } } if (_noEqDone) continue; }   // 재감사 3차 3: 호기 칸 빈 완료가 뒤에 있으면 어느 호기가 일했는지 몰라 재개로 본다
      if (!alt || cand.ts > alt.ts) alt = cand;
    }
    if (!alt || (last && _doneAfter(last, '') && !Object.values(v.discharge && v.discharge.completed || {}).concat(Object.values(v.loading && v.loading.completed || {})).some((c) => c && c.equip))) return null;
    last = alt;
  }
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
  //  ★ 5.29-04 재감사 1 — «3호기 4호기 둘다 작업중단입니다. 같은 시간에»(검수사 2026-11-28 17:34). 같은 때(2분 안) 멈춘 다른 호기도 그 호기의 마지막 상태가 중단이면 함께 말한다.
  const equips = [];
  try {
    const lastOf = new Map();
    for (const k of Object.keys(reps)) {
      const r = reps[k]; if (!r || r.type !== 'work_status' || !r.equip || !_WORK_ACT_RE.test(String(r.action || ''))) continue;
      const t1 = Number(r.saidAt) || Number(r.ts) || Number(k) || 0; if (!t1 || t1 > now + 5 * MIN) continue;
      const pv = lastOf.get(r.equip); if (!pv || t1 > pv.t1) lastOf.set(r.equip, { t1, act: String(r.action || '') });
    }
    for (const [eq, x] of lastOf) if (/pause$/.test(x.act) && Math.abs(x.t1 - last.ts) <= 2 * MIN) equips.push(eq);
    equips.sort((x, y) => (parseInt(x, 10) || 0) - (parseInt(y, 10) || 0));
  } catch (e) { console.warn('[미르] 함께 멈춘 호기 읽기 실패:', e); }
  const equipKo = equips.length > 1 ? equips.join('·') : last.equip;
  return { mode: last.mode, reason: last.reason, equip: last.equip, equips, equipKo, ts: last.ts, resumeAt, breakKo, ko: last.mode === 'loading' ? '선적' : last.mode === 'discharge' ? '양하' : '작업' };
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
// ══════════════════════════════════════════════════════════════════════════════════════════
// [mirBusy] 작업 중 사담 미루기 (4.38) — 검수사 2026-10-19 19:08~19:21 확정
//   «미르야를 부르면 일반회화 또는 웹검색기능사용이고 그냥 뭐 어디있어 하면 기능이나 컨위치등으로 인식하는식으로»
//   «작업중에 일반 질문을 하면 작업중에는 사담이 안됩니다. 쉬는 타임에 대화가 가능합니다 라는 식으로 미룹니다 최대한 공손하게»
//   «쉬는 타임은 해치커버 열고 닫는시간 5분이내 중식 석식 중단보고» · «시간당 처리댓수를 보고 … 시간당 30대를 처리하는중엔 일반 대화가 힘듭니다» · «15대 이하라면 여유 시간이 많습니다»
//   (야식·아침 교대 쉬는 시간도 식사 창으로 넣는다 — 실데이터 표를 보이고 «이대로 만든다» 로 확정)
//   «작업 중» = 작업자로 로그인(조회만·관리자 아님)했고 고른 배가 지금 작업 중(utils.isWorkingNow). 그 밖엔 언제든 대화한다.
//   판정 재료는 화면이 ctx.work = { voyageKey, worker, equip } 로 싣는다(workChoice.mirWorkCtx — 이 파일은 workChoice 를 부르지 않는다, 콘앱 번들).
//   콘앱은 고른 배(ctx.voyageKey)에서 일하는 사람으로 본다.
// ══════════════════════════════════════════════════════════════════════════════════════════
export const MIR_BUSY_FREE_PER_HOUR = 15;   // 시간당 이 대수 이하면 여유(검수사 «15대 이하라면 여유 시간이 많습니다»)
const MIR_HATCH_FREE_MS = 5 * MIN;           // 해치커버 열기·닫기 보고 뒤 5분
export const MIR_DEFER_TEXT = '죄송해요, 지금은 작업 중이라 사담은 잠시 미뤄 둘게요 🙏 쉬는 시간에 편하게 다시 말씀해 주시면 그때 꼭 이야기 나눠요.';
/** 지금 이 검수원이 사담을 미뤄야 할 만큼 바쁜가. { busy, known, why } — known=false 면 잴 재료가 없다(그때는 바쁘지 않은 것으로 본다). */
export function mirBusyNow(ctx, now = Date.now()) {
  const c = ctx || {};
  const w = c.work || (c.app === 'cone' && c.voyageKey ? { voyageKey: c.voyageKey, worker: true, equip: '' } : null);
  if (!w || !w.worker || !w.voyageKey) return { busy: false, known: true, why: '작업자로 고른 배 없음' };
  const v = (c.voyages && c.voyages[w.voyageKey]) || (String(c.voyageKey || '') === String(w.voyageKey) ? c.voyage : null);
  if (!v || !v.info) return { busy: false, known: false, why: '작업 배 자료 없음' };
  if (!isWorkingNow(v, now)) return { busy: false, known: true, why: '배가 작업 중이 아님' };
  const pier = pierOf(v);
  const d = new Date(now); const mins = d.getHours() * 60 + d.getMinutes();
  for (const [a, b] of mealWindows(pier)) for (const off of [0, -1440, 1440]) { if (mins >= a + off && mins < b + off) return { busy: false, known: true, why: `쉬는 시간(${_mmHHMM(a + off)}~${_mmHHMM(b + off)})` }; }
  const pz = workPauseOf(v, now);
  if (pz) return { busy: false, known: true, why: `중단 보고${pz.reason ? ` «${pz.reason}»` : ''}` };
  const myNo = String(w.equip || '').replace(/[^0-9]/g, '');
  const reps = (v.reports && typeof v.reports === 'object') ? v.reports : {};
  for (const k of Object.keys(reps)) {
    const r = reps[k]; if (!r || r.type !== 'hatch') continue;
    const ts = hatchReportTs(r) || Number(k) || 0;   // 사건 시각 — 자동 기록은 적힌 때(ts)가 아니라 eventTs(utils 한 벌)
    if (!ts || ts > now + MIN || now - ts > MIR_HATCH_FREE_MS) continue;
    const rNo = String(r.equip || '').replace(/[^0-9]/g, '');
    if (!myNo || !rNo || rNo === myNo) return { busy: false, known: true, why: '해치커버 작업(5분)' };
  }
  //  시간당 처리 대수 — 내 호기(모르면 배 전체를 그 시간에 일한 호기 수로 나눈다)
  let mine = 0, all = 0; const eqs = new Set();
  for (const m of ['discharge', 'loading']) {
    const comp = v[m] && v[m].completed; if (!comp || typeof comp !== 'object') continue;
    for (const x of Object.values(comp)) {
      const at = x && Number(x.at); if (!at || at > now || at <= now - 60 * MIN) continue;   // 최근 1시간(검수사에게 보인 표와 같은 창)
      all++; const no = String((x && x.equip) || '').replace(/[^0-9]/g, ''); if (no) eqs.add(no); if (myNo && no === myNo) mine++;
    }
  }
  if (all > 0 && !eqs.size) return { busy: false, known: false, why: `완료 기록에 호기가 없어 처리 대수를 못 잼(1시간 ${all}대)` };   // 감사 — 호기 없는 기록을 1로 나눠 과대평가·내 호기 0대로 과소평가하지 않는다(모르면 종전처럼 대화)
  const rate = myNo ? mine : Math.round(all / eqs.size);
  if (rate <= MIR_BUSY_FREE_PER_HOUR) return { busy: false, known: true, why: `시간당 ${rate}대(여유)` };
  return { busy: true, known: true, why: `시간당 ${rate}대 처리 중` };
}
//  미룬 질문 — 이 기기에만(쉬는 틈에 다시 묻는 단추). 12시간 지나면 버린다. 저장이 막혀도 이번 실행 동안은 기억한다.
const DEFER_KEY = 'mir_deferred_v1';
let _deferMem = null;
let _deferStoreOk = true;   // 마지막 저장이 실패했으면(가득 찬 기기) 저장소의 옛 값으로 방금 미룬 말을 덮지 않는다
function _deferLoad(now) {
  //  저장소가 정본이다 — 읽힐 때마다 다시 읽는다(다른 창·콘앱이 쓴 것을 덮지 않게). 저장이 막힌 기기는 이번 실행의 기억(_deferMem)을 쓴다.
  if (_deferStoreOk || !Array.isArray(_deferMem)) { try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DEFER_KEY) : null; if (raw != null) { const j = JSON.parse(raw); if (Array.isArray(j)) _deferMem = j; } } catch (e) { /* 이번 실행 기억으로 */ } }
  if (!Array.isArray(_deferMem)) _deferMem = [];
  _deferMem = _deferMem.filter((d) => d && d.q && now - Number(d.at || 0) < 12 * 3600000);
  return _deferMem;
}
function _deferSave() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(DEFER_KEY, JSON.stringify(_deferMem || [])); _deferStoreOk = true; } catch (e) { _deferStoreOk = false; /* 저장이 막힌 기기 — 이번 실행만 기억 */ } }
//  미룬 질문은 검수원마다 따로 — 한 기기를 여럿이 쓰면(검수원 변경·사무실 PC) 남의 사담이 단추로 뜨지 않게(4차 감사 M1). 검수원마다 3개.
const _dw = (who) => String(who || '').trim();
const _dSame = (d, q, who) => _norm(d.q) === _norm(q) && _dw(d.who) === _dw(who);
function _deferPush(q, now, who = '') { const t = String(q).trim().slice(0, 200); const w = _dw(who); const L = _deferLoad(now).filter((d) => !_dSame(d, t, w)); L.push({ q: t, at: now, who: w }); const mine = L.filter((d) => _dw(d.who) === w); const drop = new Set(mine.slice(0, Math.max(0, mine.length - 3))); _deferMem = L.filter((d) => !drop.has(d)); _deferSave(); }   // 200자 — 자른 말과 원문이 두 칸을 차지하지 않게(감사)
function _deferOffered(q, now = Date.now(), who = '') { _deferMem = _deferLoad(now).map((d) => (_dSame(d, q, who) ? { ...d, offered: true } : d)); _deferSave(); }
function _deferDrop(q, now = Date.now(), who = '') { _deferMem = _deferLoad(now).filter((d) => !_dSame(d, q, who)); _deferSave(); }
/** 쉬는 틈에 다시 꺼낼 미룬 질문(최근 것부터). opts.fresh — 아직 단추로 띄우지 않은 것만. */
export function mirDeferredPending(now = Date.now(), opts = {}) { const w = _dw(opts && opts.who); return _deferLoad(now).filter((d) => _dw(d.who) === w && !(opts && opts.fresh && d.offered)).slice().reverse().map((d) => d.q); }
/** 이 말이 미뤄 둔 질문인가 — 단추를 누르거나 «응» 으로 고른 말은 짧아도(«심심해») 모델로 보낸다(화면의 네 글자 문턱·askMir 의 한 글자 문턱). */
export function mirIsDeferred(q, now = Date.now(), who = '') { return !!_norm(q) && _deferLoad(now).some((d) => _dSame(d, q, who)); }
export function _mirDeferReset() { _deferMem = []; _deferSave(); }   // 연막검사용
//  사담(일반 말)인가 — 일 낱말(MIR_WORKISH_RE)도, 앱 사용법 말도 없는 말. «미르야» 를 붙인 일반 말도 여기(작업 말이 있으면 아니다 — 검수사 확정).
const MIR_APPISH_RE = /사용법|사용\s*방법|매뉴얼|도움말|설명서|어떻게|버튼|단추|탭|메뉴|화면|기능|설정|업로드|올려|올리|붙여|입력|강풍|우천|대기|중단|멈춤|정지|고장|쉬고\s*있|쉬는\s*중|콘|라싱|트위스트|봉인|실\s*(?:이|은|번호)?\s*(?:끊|잘|떨어|없)|전원|천장|일정|다음|신고|오답|메모|검수원|카톡|보고|사진|큐알|QR|설치|로그인|비밀번호|알림|순서|밝기|소리|글자|데미지|파손|작업|선택|변경|바꾸|바꿔|로그아웃|계정|컨|카고|부두|터미널|게이트|화물|세관|사무실|도로|트럭|직원|대리점|전화|기사|현장|본선|갑판|통제|선석|막혔|막혀|차\s*(?:막|밀)|(?:^|[^가-힣])배(?:\s|가|에|를|는|도|네|야|로|$)/i;   // 일 멈춤 알림(«강풍대기 상태야 쉬고 있어»)도 사담이 아니다 · 감사 B3 — 현장 대처(«실 끊어졌어»·«콘 빠졌어»·«전원 나갔어»)·앱 일(«오답 신고»·«메모 남겨줘»)도 사담이 아니다
//  ★ 위기·안전·몸·마음 말은 무슨 일이 있어도 미루지 않는다(재감사 — «죽고 싶어»·«사람 다쳤어»·«불났어»·«어지러워» 가 미룸 문구를 받았다). 생활회화 프롬프트의 위기 신호 규칙(109 안내)으로 그대로 간다.
const MIR_NEVER_DEFER_RE = /다치|다쳤|다쳐|부상|(?:^|[^가-힣])피\s*(?:가|를)?\s*(?:나|흘|많이)|쓰러|넘어|떨어졌|추락|깔렸|끼었|끼였|감전|충돌|폭발|불\s*(?:났|이야|붙|나)|화재|연기|가스|냄새|누수|샌다|새고|기름|유출|구급|119|112|살려|도와|위험|사고|죽|자살|살\s*(?:기\s*싫|고\s*싶|이유|맛)|극단|그만두|그만둔|그만둘|그만\s*두|끝내고|외롭|괴롭|무섭|서럽|두렵|졸립|아픕|아퍼|힘듭|힘드|힘\s*들|지쳤|다쳣|미치|미쳐|공황|기절|빠졌|실려|경찰|칼|급해|급하|큰일|돌아가셨|입원|부러|날렸|농담\s*(?:아니|말고|할\s*때|이지|하지\s*마)|ㅠ|ㅜ|출혈|의식|골절|수술|수혈|불길|화염|사이렌|경광등|구조|헬기|시신|대피|정전|해경|무너|사라지|없어지|포기|헤어|떠났|가슴|숨|어지러|머리|아파|아프|몸|컨디션|토할|구토|응급|병원|약\s*(?:먹|좀|있)|우울|외로|괴로|서러|답답|속상|막막|처져|최악|불안|무서|겁나|슬퍼|슬프|눈물|울고|울어|힘들|지쳐|지친|피곤|졸려|졸리|졸음|졸아|감겨|잠\s*와|스트레스|화나|짜증|싶|싫|없어|안\s*좋|못\s*하겠|소용|무전|신호수|조명|사다리|안전|미끄러|문\s*안\s*(?:닫|열)|도어|노트|선속|배터리|충전|교대|어두워/;   // ★ 넓게 — 사담 신호 낱말과 같이 와도(«기분이 너무 외로워»·«여자친구랑 헤어졌어 살 이유가 없어»·«졸려서 눈이 감겨») 미루지 않는다(3차 감사). 자기 상태를 바라거나 부정하는 말(싶·싫·없어·안 좋)이면 사담이라도 안 미룬다 — 덜 미루는 쪽이 안전하다
//  사담 신호 — 이 낱말이 있는 말만 미룬다(재감사: «일 낱말이 없으면 사담» 이라는 부정형은 목록 밖 현장 말 «무전기 안 돼»·«신호수 없어» 를 미뤘다). 못 잡은 사담은 종전처럼 답한다(덜 미루는 쪽이 안전하다).
//  ★ 사담 = 문장 «전체» 가 아래 두 꼴일 때만(4차 감사 — 신호 낱말이 문장 어디에든 있으면 미루던 것이 «농담 아니고 사람이 바다에 빠졌어»·«카페리 들어왔어» 까지 미뤘다.
//    5차 감사 — 자유 글자를 둔 상식 질문 꼴이 «출혈 심한데 혈액형 뭐야»·«야구장 쪽 화염 뭐야» 를 미뤄 뺐다. 말벗을 청하는 «얘기 좀 하자» 도 마음이 힘든 사람이 먼저 꺼내는 말일 수 있어 뺐다.)
//    ① 재미를 청하는 짧은 말(«농담 하나 해줘»·«퀴즈 내줘»·«노래 추천해줘»·«끝말잇기 하자») ② 미르에게 묻는 안부(«오늘 기분 어때»·«심심해»·«놀아줘»).
//    그 밖은 사담이어도 종전처럼 답한다(덜 미루는 쪽이 안전하다). 우는 표시(ㅠ·ㅜ)가 붙으면 미루지 않는다(금지 목록).
const MIR_CHAT_EXACT_RE = [
  /^(?:재밌는|재미있는|웃긴|웃기는|짧은)?\s*(?:농담|개그|아재\s*개그|퀴즈|수수께끼|넌센스\s*퀴즈|끝말잇기|노래)\s*(?:하나|한\s*곡|한\s*개|좀|또|더)?\s*(?:해|내|불러|들려|추천해|추천|알려|하자|해\s*봐|들려\s*봐)?\s*(?:줘|줄래|주세요|줄래요|봐|요|라)?$/,
  /^(?:너|넌|미르)?\s*(?:오늘|요즘|지금)?\s*(?:기분\s*(?:어때|어떠니|어때요|좋아|좋니)|심심해|심심하다|심심하네|놀아\s*줘|놀자)$/,
];
const _chatNorm = (q) => String(q || '').trim().replace(/^미르\s*(?:야|아|님)?(?![가-힣])[\s,!~.]*/, '').replace(/[\s?？!！.~…ㅋㅎ^]+$/g, '').replace(/\s+/g, ' ');
//  ★ 4.89 감사 막음 2 — 작업용 검색줄에서 «일반 대화» 로 볼 말 한 벌: 생활회화 미루기 판정(_isGeneralTalk — 재미 청하기·안부)에 짧은 인사·고마움을 더한다.
//    일 낱말이 든 말(isChatCandidate 거짓)·앱 말·위기 말은 일반 대화가 아니다(검색이 답한다).
const MIR_GREET_RE = /^(?:안녕|안녕하세요|안녕하십니까|반가워|반가워요|반갑다|고마워|고마워요|고맙다|고맙습니다|감사해|감사합니다|땡큐|수고|수고했어|수고해|수고하셨습니다|사랑해|귀여워|귀엽다|잘\s*자|잘\s*있어|좋은\s*아침|굿모닝|하이|헬로|ㅎㅇ)$/;
export function mirWorkChatOf(q) {
  const t = String(q || '');
  if (!t.trim() || !isChatCandidate(t, '') || MIR_NEVER_DEFER_RE.test(t)) return false;
  const n = _chatNorm(t);
  if (MIR_GREET_RE.test(n)) return true;
  if (MIR_APPISH_RE.test(t)) return false;
  return MIR_CHAT_EXACT_RE.some((r) => r.test(n));
}
function _isGeneralTalk(q) { const t = String(q || ''); const n = _chatNorm(t); return isChatCandidate(t, '') && !MIR_APPISH_RE.test(t) && !MIR_NEVER_DEFER_RE.test(t) && MIR_CHAT_EXACT_RE.some((r) => r.test(n)); }

/** 앱 작업 보고(workPauseOf 와 같은 12시간 안의 work_status)에서 ① «시작·재개» 중 가장 늦은 시각(restartAt) ② 모든 «모드·호기» 의 가장 늦은 보고가 «끝(…_done)» 이면 그 가운데 가장 늦은 끝 시각(allClosedAt, 아니면 0).
 *  (4.06 감사 — 재개 직후·끝 보고 뒤에 화내지 않게. 호기별로 따진다: 1호기가 끝 보고를 올려도 2호기가 일하고 있으면 «끝» 이 아니다.) */
function _statusReportMarks(v, now) {
  const reps = v && v.reports; let restartAt = 0;
  const lastBy = new Map();   // «모드|호기» → 그 호기의 가장 늦은 작업 상태 보고
  if (!reps || typeof reps !== 'object') return { restartAt, allClosedAt: 0 };
  for (const k of Object.keys(reps)) {
    const r = reps[k]; if (!r || typeof r !== 'object') continue;
    const ts = Number(r.saidAt) || Number(r.ts) || Number(k) || 0;   // 5.29-04 재감사: workPauseOf 와 같은 시각(말한 시각 saidAt 우선)
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
  //  4.55-01: 홈·수석 보드의 «검수 완료» 는 utils.inspectorAllDone 한 벌(선적 EDI 대기 배는 «선적 있음»). 미르는 «입력할 게 남았나» 만 본다 — 양하가 끝났고 남은 선적이 EDI 대기(자료 없이 계획 수량만)뿐이면 입력할 것이 없으니 종전 4.55 처럼 «끝» 으로 읽는다(화남·다음 작업 판정은 현실에서 나오는 모양 전부 종전과 같다 — 구역이 하나도 없는데 선적 완료 표식만 켜진 비현실 모양만 다르다 · 콘앱도 같다).
  return inspectorAllDone(v) || ediWaitingOnlyLeft(v);
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
  //  4.16: byMode 는 평택분만이다 — 시프팅 모브(내림·실음)가 남았으면 아직이다(재감사 D7 — MCSC 633N 시프팅 95대).
  if (c.shift && c.shift.moves.total > c.shift.moves.done) return false;
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
  return _angryList(voyages, heartbeat, now).map((x) => `${x.vsl} 앱 완료 기록이 실작업 ${x.wmin}분째 없어요. 작업이 중단된 것 같은데 야드·강풍·안개·폭우·장비 고장 같은 이유가 있나요?`);   // 4.70: 작업 중이면 앱 기록이 있어야 한다 — 없으면 중단으로 본다(검수사 2026-11-06 19:30)
}
/** ★ 4.42-02 — 미르가 화난 그 배들 { key, vsl } — 이유 글(angryReasons)과 같은 판정 한 벌.
 *  검수사 2026-10-21 13:25 — 미르가 «DJCF·STSE 터미널은 작업 중인데 앱 완료 기록이 실작업 75분째 없어요» 로 화났을 때 홈 미르 칸에 «아무래도 강풍대기 인듯 하네» 라고 알려 줬는데
 *  배 이름이 없다고 «어느 배인지 몰라 적지 못했어요» → 모르는 낱말이 남아 모델로 넘어가 «열린 항차 정보가 없어요» 를 답했다. 배 이름 없이 미르의 화남에 답한 멈춤 알림은 그 배들 얘기다. */
export function pauseTargetsOf(voyages, heartbeat, now = Date.now()) {
  return _angryList(voyages, heartbeat, now).map((x) => ({ key: x.key, vsl: x.vsl }));
}
//  ★ 4.42-03 — 동방(PNCT)은 갱을 우선 배에 몰아 준다. 검수사 2026-10-21 16:34 «동방은 3갱 작업위주로 합니다. 그래서 연태 2갱 연운항1갱 작업 우선입니다.
//    그러므로 DXQD는 연태 작업이 끝나야 가능합니다. 미르가 DXQD 작업 실적이 없어서 화나있습니다.» (실측 16:37 — DXQD 2641E 양하 302/302 15:10 끝 · 선적 0/175 ·
//    호기 표 QC102·QC104 선적 «했다 0»; 동방 갱 1·2호기는 OBWH 2771E(연태) · 3호기는 TNJP 26369E(연운항) 에서 «하는 중»).
//    동방 호기 표(info.qcWork — qcRowsOf 한 벌)에서 이 배에 «하는 중»인 호기(한 방향을 시작했고 아직 남음)가 하나도 없거나, 있어도 전부 같은 부두 다른 배에서도
//    «하는 중»이면(어느 배에 있는지 가릴 수 없다) 이 배는 갱을 기다리는 중이다. 남은 일이 없거나 호기 표가 없으면 이 문은 닫혀 있다(종전 판정).
function _qcBusyNos(v) {
  //  4.77: 3호기 LOLO 몫 보정(termDisDone/termDisRest 를 남긴 칸)은 «누가 지금 일하나» 판정에 터미널 원값으로 되돌려 쓴다 — 보정이 안 들어가는 다른 배(콘앱)와 같은 입력이 되게.
  const _qw = (v && v.info && v.info.qcWork) || null;
  const _raw = _qw && typeof _qw === 'object' ? Object.fromEntries(Object.entries(_qw).map(([k, q]) => [k, (q && typeof q === 'object' && q.termDisDone != null) ? { ...q, disDone: q.termDisDone, disRest: q.termDisRest } : q])) : _qw;
  const rows = qcRowsOf(_raw);
  if (!rows.length) return null;
  return { rest: rows.some((q) => q.disRest + q.lodRest > 0), busy: rows.filter((q) => (q.disDone > 0 && q.disRest > 0) || (q.lodDone > 0 && q.lodRest > 0)).map((q) => q.no) };
}
function _pnctGangWaiting(vKey, v, voyages, now) {
  if (pierOf(v) !== 'PNCT') return false;
  const me = _qcBusyNos(v);
  if (!me || !me.rest) return false;
  if (!me.busy.length) return true;
  const others = new Set();
  for (const [k2, v2] of Object.entries(voyages || {})) {
    if (k2 === vKey || !v2 || !v2.info || pierOf(v2) !== 'PNCT' || !isWorkingNow(v2, now)) continue;   // 끝난 항차에 남은 옛 호기 표는 안 본다
    const o = _qcBusyNos(v2); if (o) o.busy.forEach((n) => others.add(n));
  }
  return me.busy.every((n) => others.has(n));
}
function _angryList(voyages, heartbeat, now) {
  const r = [];
  if (_collectorSilentMs(heartbeat, now)) return r;
  for (const [vKey, v] of Object.entries(voyages || {})) {
    if (!v || !v.info) continue;
    const vsl = v.info.vsl || '';
    if (!isWorkingNow(v, now)) continue;
    if (!_inWorkWindow(now, pierOf(v))) continue;   // 4.06: 밥 먹는 시간에 화내지 않는다
    if (workPauseOf(v, now)) continue;   // 3.69-01: 앱에 중단 보고가 있으면 완료가 없는 게 당연하다 — 화내지 않는다
    if (_pnctGangWaiting(vKey, v, voyages, now)) continue;   // 4.42-03: 동방 갱이 다른 배(우선 배)에 가 있어 이 배는 기다리는 중 — 화내지 않는다
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
    let wmin = 0; try { wmin = workMinutesBetween(last, now, pierOf(v), { noRest: isNoRestShip(v.info) }); } catch (e) { wmin = Math.round((now - last) / MIN); }
    if (!(any && wmin * MIN > MOOD_NO_DONE_MS)) continue;
    if (_appAllDone(v, vKey)) continue;   // 4.06 감사: 앱에 올라온 컨을 완료가 다 채웠으면 입력할 게 없다 — 센 값은 비싸서(항차 펼치기) 60분이 넘었을 때만 본다
    r.push({ key: vKey, vsl, wmin });
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
/** ★ 4.42-02 — 기쁨(작업 완료) 이유 한 줄 — **어느 배**가 몇 대. 검수사 2026-10-21 13:25 «미르가 1대 처리 되었다고 알리는데 오히려 그한대가 어느 선박인지 안알려줌».
 *  prev·cur = 항차키 → 완료 수. 이미 보던 항차의 수가 늘었을 때만 센다(새 항차 첫 등장·켤 때 자료 도착은 완료가 아니다 — 3.56 감사). 늘어난 것이 없으면 ''. */
export function mirDoneUpWhy(prev, cur, voyages) {
  if (!prev || !cur) return '';
  const ups = [];
  for (const [k, n] of Object.entries(cur)) {
    if (!(k in prev) || !(n > prev[k])) continue;
    const v = voyages && voyages[k];
    const vsl = String((v && v.info && (v.info.vsl || v.info.vslFull)) || String(k).split('_')[0] || '').trim();
    ups.push(`${vsl ? vsl + ' ' : ''}${n - prev[k]}대`);
  }
  return ups.length ? `${ups.join(' · ')} 완료했어요!` : '';
}
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
    L.push(`앱 보고로는 ${wp.equipKo ? wp.equipKo + ' ' : ''}${wp.ko} ${hm(wp.ts)} 중단${wp.reason ? `(사유 ${wp.reason})` : ''} 중이에요.${tail}`);
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


// ════════════════════════════════════════════════════════════════════════════
// [mirField] 미르 현장 문답 — 검수사가 준 «질문 300»(2026-11-27)으로 배운 현장 지식·절차·앱 사용법 원장과, 여러 갈래 대수(따로·나눠·별로·각각)를 한 번에 답하는 묶음 답
// (5.27 — 미르 엔진은 한 파일(3.53-11)이라 따로 두지 않고 여기 넣었다. 위 answerOneRaw ★ 5.27 블록이 부른다.)
// ════════════════════════════════════════════════════════════════════════════
/* ★ TallyOne 5.27 — 검수사 2026-11-27 11:33 «지금의 클로드는 검수앱의 미르 조련사 입니다. 지금 올려주는 자료로 미르가 충실히 답할수 있게 만들어 주세요»
     · 11:34 «컨번호등 틀리수도 있습니다. 대략 질문의 의도를 파악하고 적용하기 바랍니다».

   ── 왜 이 파일이 필요한가 (실측 — 지금 작업 중인 TMPZ 2041E 실자료로 300문을 그대로 물었다)
   ① 묻는 말(«어떻게 해요» «뭐예요» «누구한테» «기준이 뭐야»)에 업무 낱말(리퍼·DG·X-RAY·실)이 들어가면 집계 인텐트가 먼저 잡아
      «리퍼 총 2대 …» 목록을 냈다 — «리퍼는 양하 후 몇 분 안에 전원 연결해야 해요?» 에 리퍼 목록, «실이 아예 없는 컨 나왔는데 그냥 내려도 돼?» 에 답 없음.
   ② 여러 갈래를 한 번에 물은 대수(«20이랑 40 나눠서» · «갑판 위 양하분이랑 홀드 안 양하분 따로» · «POD별로»)는
      한 갈래만 답하거나 «끝네자리 2040» 으로 읽었다.
   그래서 (가) 묶음 대수는 엔진 단일 답을 갈래마다 다시 불러(판정 한 벌 — «양하 20피트 풀 몇 대» 와 같은 수) 한 장으로 묶고,
         (나) 묻는 말은 이 원장이 먼저 받는다 — 대수·목록을 묻는 말(몇 대·뽑아·리스트)은 원장이 받지 않는다.

   ── 원장 답의 출처 (지어낸 규칙 없음)
   · 앱 규칙·사용법 — `data/helpData.js`(사용 매뉴얼) · ★통합운영지침서(검수사 확정 규칙) 문장 그대로 줄여 옮겼다.
   · 검수 실무 용어·대처 — `data/mirKnowledge.js`(검수사가 쓴 «검수 용어 200선» · 현장 대처)가 이미 답하는 말은 **그 답을 그대로 부른다**(`kq` — 판정 두 벌 금지).
   · 터미널·회사마다 다른 수치(작업 중지 풍속·리퍼 전원 연결 시한 등)는 숫자를 지어내지 않는다 — «터미널 안전 규정·수석 지시가 기준» 으로 답한다.
   · 예시 이름은 «홍길동»(검수사 2026-11-18). 터미널 시스템 이름(카토스)은 쓰지 않는다(2026-11-23). */

//  S — 위(엔진)의 S 한 벌을 쓴다.
//  «실» 낱말 — «실리면»·«실린»·«실어» 의 실은 봉인이 아니다(감사 실측 «45피트 데크에 실리면» 이 실번호 답으로 갔다).
const SL = '(?:실\\s*번호|실번호|씰|봉인|seal|(?<![가-힣])실(?=[이은을도가]?(?:\\s|$|[?.,!(])))';

//  묻는 꼴 — 뜻·방법·기준·책임·가부를 묻는 말. 집계·목록은 아래 DATA_ASK 가 막는다.
const ASK = /어떻게|어떡|어쩌|뭐|뭘|뭔|무슨|무엇|왜|기준|누구|누가|어디(?:서|에|다|로)?|해야|하나요|돼요|되나요|되요|될까|돼\?|되\?|맞나요|맞죠|맞아요|맞지|맞아\?|인가요|건가요|거에요|거예요|차이|구분|방법|하는\s*법|읽는|순서|의무|조심|주의|괜찮|가능|있나요|있어요\?|알려\s*주|알려\s*줘|알려줘|설명|처리|계산|가르쳐|헷갈|모르겠|모르|큰일|떨려|무서|안\s*돼|안돼|해도|써도|돼\s*$|되\s*$|맞아\s*$|어느|어야|아야|에요\s*\??\s*$|예요\s*\??\s*$|가요\s*\??\s*$|(?:이야|야|냐|니|까|지)\s*\??\s*$|\?$/;
//  대수·목록을 묻는 말 — 원장이 받지 않는다(엔진 집계 몫). «콘 몇 개 필요» 는 지식(계산법) 질문이라 막지 않는다.
const DATA_ASK = /몇\s*대|몇대|몇\s*밴|대수(?!\s*(?:가|랑|와|이)?\s*(?:안\s*맞|달라|다르|틀려))|총\s*몇|뽑아|정렬|목록\s*(?:보여|줘)|리스트\s*(?:로도|보여|뽑|줘)|보여\s*줘|보여줘|몇\s*TEU/i;

//  원장 — 위가 먼저다(좁은 말이 넓은 말보다 앞). p = 주제(+꼴) · a = 답 · kq = mirKnowledge 에 그대로 물을 말(그 답을 쓴다) · ask:false = 묻는 꼴 없어도 받음 · data:true = 대수 말이 있어도 받음
export const FIELD_QA = [
  { id: 'dup4', cn: true, p: /두\s*개.{0,20}(?:어떤|어느|어떻게|맞는)/, a: null },
  // ── 안전 ─────────────────────────────────────────────────────────
  { id: 'safe_gear', p: /안전\s*장비|안전모|안전화|조끼|보호구|착용/, a: '📖 현장 안전장비\n안전모(턱끈까지 채움)·안전화·반사 조끼가 기본이에요. 배에 오를 때는 구명조끼, 밤에는 반사띠·손전등을 더 챙기고, 장갑을 끼면 사다리·난간을 잡기 좋아요. 터미널·선사가 따로 정한 장비(무전기·출입증 등)는 출근 때 수석에게 확인해요.' },
  { id: 'safe_crane', p: /크레인\s*(?:밑|아래)|위험\s*구역|매달린|들고\s*있는/, a: '📖 크레인 밑 위험구역\n컨테이너가 매달려 지나가는 길 아래와 크레인 다리(레일) 사이 차선이 위험구역이에요. 들린 컨 아래로는 절대 지나가지 않고, 이동할 때는 크레인이 멈춰 있는지·기사가 나를 봤는지 확인한 뒤 정해진 보행 통로로 가요. 터미널 바닥의 보행 통로·안전 표시를 따르세요.' },
  { id: 'safe_yard', p: /스트래들|야드\s*트랙터|야드트랙터|샤시|셔틀|YT(?![A-Za-z]).{0,10}(?:다닐|걸어|어디로|안전)/, a: '📖 야드 장비 사이를 걸을 때\n야드 트랙터·스트래들캐리어는 사각지대가 커서 기사가 사람을 못 볼 수 있어요. 정해진 보행 통로로만 다니고, 장비 앞뒤를 바로 가로지르지 말고, 건널 때는 기사와 눈을 맞추거나 멈출 때까지 기다려요. 밤에는 반사 조끼·손전등이 필수예요.' },
  { id: 'safe_gangway', p: /갱웨이|사다리|승선|하선|배에\s*올라|오르내리/, a: '📖 갱웨이 오르내리기\n한 사람씩, 두 손으로 난간을 잡고 오르내려요. 짐은 메거나 손을 비워 두고, 비·서리로 미끄러우면 발판 한 칸씩 확인하며 천천히 가요. 갱웨이가 배와 안벽 사이에서 들뜨거나 그물(안전망)이 없으면 오르지 말고 본선·수석에게 알려요.' },
  { id: 'safe_wind', p: /^(?!.*(?:대기|쉬고|중이야|멈췄|멈춤|중지\s*(?:했|됐|중)|세서\s*중지|으로\s*작업\s*중지)).*(?:바람|풍속|강풍).{0,30}(?:기준|몇\s*미터|몇\s*m|철수|어떻게|해요|하나요|돼요|멈춰|멈추나|멈춰요|중지해|세면)/, a: '📖 강풍 작업 중지\n초속 8m 이상이면 작업을 멈출 수도 있어요 — 권고라서 작업을 해도 지장은 없어요. 실제로 멈추는 건 초속 9m 이상이에요(검수사 확정). 작업이 멈추면 수석 지시에 따라 크레인에서 떨어진 안전한 곳에서 대기하거나 철수해요. 앱에는 미르에게 «강풍 대기» 라고 알려 두면 작업 중단 사유로 남아요.' },
  { id: 'safe_phone', p: /핸드폰|휴대폰|폰.{0,6}(?:보면서|보며)\s*(?:걸|다녀)/, a: '📖 걸으면서 폰 보기\n걸으면서 폰을 보면 안 돼요 — 장비·컨테이너 사이에서는 한 걸음이 위험해요. 멈춰 서서 안전한 자리(장비 길 밖)에서 보고, 이동할 때는 주머니에 넣어요. 손이 바쁠 땐 검색줄 마이크로 미르에게 말로 물으면 화면을 오래 안 봐도 돼요.' },
  { id: 'safe_newbie', p: /실수.{0,10}(?:뭐|많이|자주|조심)|조심하고\s*싶|신입.{0,10}(?:많이|자주)/, a: '📖 처음 몇 주 자주 하는 실수\n① 다른 컨을 확인 눌러 버림 — 누르기 전에 눈앞 번호와 카드 번호 끝 4자리를 한 번 더 봐요. ② 실번호 한 자리 잘못 적기 — 실은 끝까지 읽고 넣어요. ③ 트윈 앞·뒤 순서 바꿔 적기. ④ 데미지 사진 없이 넘어가기. ⑤ 교대 때 인계 안 남기기. 모르는 건 그 자리에서 수석·선배에게 묻는 게 제일 빨라요.' },

  // ── 위치 읽기(베이·로우·티어) ─────────────────────────────────────
  { id: 'pos6', cn: true, p: /(?:6|여섯)\s*자리.{0,10}(?:읽|뜻|뭐)|\b\d{6}\b.{0,12}(?:읽어|읽는|어떻게\s*읽)/, a: '📖 위치 6자리 읽기\n앞 두 자리 = 베이, 가운데 두 자리 = 로우, 끝 두 자리 = 티어예요. 010482 는 01번 베이 · 04번 로우 · 82단(데크 첫 단 언저리)이에요. 앱에서는 01-04-82 처럼 줄을 그어 보여 줘요.' },
  { id: 'row_side', p: /로우.{0,20}(?:짝수|홀수|좌우|센터|가운데|00)|(?:짝수|홀수).{0,20}로우/, a: '📖 로우(Row) 번호\n로우는 배를 가로지르는 좌우 칸 번호예요. 가운데 줄이 00이고(줄 수가 짝수인 배는 00이 없어요), 선미에서 선수를 바라보고 오른쪽(우현)이 홀수 01·03·05…, 왼쪽(좌현)이 짝수 02·04·06… 으로 바깥으로 갈수록 커져요.' },
  { id: 'cone_ele', p: /엘리펀트|코끼리\s*콘|코끼리콘/, a: '📖 코끼리콘(엘리펀트 콘)\n20피트 두 대가 40피트 자리에 앞뒤로 앉을 때, 두 컨이 맞닿는 가운데 자리에 쓰는 콘이에요. 생김새가 코끼리 발 같아 붙은 이름이에요. 콘앱은 코끼리콘을 «곳당 2개» 로 세어요(데크콘은 곳당 4개). 몇 곳이 필요한지는 콘앱 베이별 작업표에 나와요.' },
  { id: 'cone_mid', p: /미드\s*락|미들\s*콘|미드락/, a: '📖 미드락(미들콘)\n20피트 두 대를 40 자리에 앞뒤로 실을 때 두 컨 사이(가운데)를 묶는 콘이에요. 현장에서는 코끼리콘이라고도 불러요. 콘앱에서는 코끼리콘 칸으로 세어요(곳당 2개).' },
  { id: 'cone_bottom', p: /맨\s*아랫단|1\s*단.{0,10}콘|바닥.{0,10}콘|브릿지\s*피팅|스태킹/, a: '📖 데크 맨 아랫단\n데크 1단(해치커버 위 첫 단)은 콘을 꽂는 대신 해치커버의 고정 소켓(데크 피팅)에 컨 모서리를 앉혀요. 그래서 콘앱 선적 순서도 «홀드콘 꽂기 → 1단 콘 없음 → 데크콘 꽂기» 예요. 1단은 콘 계산에 넣지 않아요.' },
  { id: 'cone_center', p: /(?:가운데|중간|사이).{0,10}(?:무슨|어떤|무엇)?\s*콘|콘.{0,6}(?:가운데|중간)|중간\s*콘/, a: '📖 20피트 두 대가 40 자리에 앉을 때 가운데 콘\n두 컨이 맞닿는 가운데 자리에는 코끼리콘(엘리펀트 콘·미들콘)을 써요. 콘앱은 곳당 2개로 세요 — 앞 컨 끝과 뒤 컨 끝 두 모서리를 한 번에 잡아요. 네 귀퉁이 바깥쪽은 보통 콘(곳당 4개)이에요.' },
  { id: 'cone_diff', p: /콘앱.{0,20}(?:검수앱|검수봇|미르).{0,20}(?:다르|다른|달라|믿)|(?:검수앱|검수봇|미르).{0,20}콘앱.{0,20}(?:다르|다른|달라|믿)/, a: '📖 콘앱과 검수앱 숫자가 다를 때\n두 앱은 같은 EDI·같은 시프팅 계산을 써서 원래 같은 답이 나와야 해요. 다르면 그 자체가 자료 문제예요 — 보통 한쪽 화면이 옛 판이거나(🆕 업데이트 띠를 누르세요) 자료(EDI 수정본)가 한쪽만 새로 들어온 거예요. 콘 개수는 콘앱 작업표가 기준이에요. 다르면 [❌ 오답]으로 남겨 주세요 — 그 질문과 답이 통째로 기록돼 고쳐요.' },
  { id: 'cone_calc', ask: false, noCone: true, p: /^.*(?:콘.{0,16}(?:계산|몇\s*개\s*필요|몇개\s*필요|몇\s*개\s*깔|몇\s*개\s*들어|몇\s*개\s*나|몇\s*개\s*회수|몇\s*개\s*(?:야|에요|예요|인가|$|\?)|4\s*개인가))/, data: true, a: '📖 콘 개수 세는 법\n데크에서 컨 한 대(한 곳)에 콘 4개(네 모서리)예요 — 40피트 한 대를 빼면 위에 얹혀 있던 콘 4개가 나와요. 20피트 두 대가 40 자리에 앞뒤로 앉으면 가운데에 코끼리콘(곳당 2개)이 더 들어가요. 데크 1단은 콘이 아니라 해치커버 소켓에 앉아요. 한 줄(스택)에 N단이면 콘 (N−1)×4개예요(1단은 소켓이라 안 세요) — 예 20피트 3단 한 줄 = 8개, 20피트 12대를 2단으로 6줄 쌓으면 6줄 × 4 = 24개. 트윈(20피트 두 대가 40 자리)은 가운데 코끼리콘이 단마다 곳당 2개 더 들어가요. 이 배 베이별 실제 개수는 콘앱(배를 고르면 작업표)이 EDI로 계산해요 — 콘앱에서 «5번 베이» 처럼 물으면 그 베이 콘을 바로 답해요.' },
  { id: 'tier', p: /^(?!.*콘).*(?:티어.{0,20}(?:데크|홀드|갑판|첫\s*단|82|84|86|02|04)|(?:82|84|86).{0,12}(?:데크|갑판))/, a: '📖 티어(Tier) 번호\n티어는 높이(단) 번호예요. 홀드는 바닥부터 02·04·06… 으로 올라가고, 데크는 80번대부터 82·84·86… 으로 올라가요. 데크 첫 단이 80인지 82인지는 배마다 달라요 — 그 배 베이플랜 맨 아랫줄 번호를 보면 돼요.' },
  { id: 'bow', p: /(?:앞쪽|선수|뒤쪽|선미).{0,20}(?:베이\s*번호|작은|큰)|베이\s*번호.{0,20}(?:앞|뒤|선수|선미)/, a: '📖 베이 번호 방향\n베이 번호는 선수(앞) 쪽이 01로 작고 선미(뒤)로 갈수록 커져요. 앱 베이 그림도 이 순서로 그려요.' },
  { id: 'bay_even', p: /^(?!.*(?:몇\s*쌍|트윈.{0,6}몇)).*(?:(?:짝수|홀수)\s*베이|베이.{0,8}(?:짝수|홀수)|(?:40|사십).{0,12}짝수|(?:13|15).{0,10}(?:14|걸쳐))/, a: '📖 짝수 베이·홀수 베이\n홀수 베이(01·03·05…)는 20피트 한 칸 자리예요. 40피트는 20피트 두 칸에 걸쳐 앉기 때문에 그 둘 사이 짝수 번호로 불러요 — 01·03 두 칸에 걸친 40피트는 02번 베이, 13·15에 걸치면 14번이에요. 그래서 «02번 베이는 40» 이라고 해요. 앱 베이 그림은 짝수+뒤 홀수를 한 덩어리 «(02)03» 으로 보여 줘요.' },
  { id: 'brt', p: /베이.{0,6}로우.{0,6}티어|bay.{0,6}row.{0,6}tier/i, a: '📖 베이·로우·티어\n배 안 자리를 세 숫자로 불러요. 베이 = 앞뒤(선수 01부터 선미로 커짐, 홀수 20피트·짝수 40피트) · 로우 = 좌우(가운데 00, 우현 홀수·좌현 짝수) · 티어 = 높이(홀드 02·04…, 데크 82·84…). 010482 는 01베이 04로우 82단이에요.' },
  { id: 'holddeck', p: /홀드.{0,10}데크|데크.{0,10}홀드|해치\s*커버\s*위.{0,6}(?:데크|갑판)/, a: '📖 홀드와 데크\n홀드(선창)는 갑판 아래 화물칸이고, 데크(갑판)는 해치커버 위예요. 맞아요 — 해치커버 위에 실린 것이 데크 화물이에요. 홀드 화물을 내리려면 먼저 데크 화물을 내리고 해치커버를 열어야 해요. 앱도 데크와 홀드를 늘 따로 세요.' },
  { id: 'bridge', p: /브릿지|브리지|선교/, a: '📖 브릿지 위치\n브릿지(선교) 자리는 배마다 달라요. 앱 베이 그림에서 베이 번호가 건너뛰는 자리(예 18 다음이 22)가 보통 브릿지나 기관실 자리예요. 이 배 베이 그림 [베이] 탭에서 확인해 보세요.', ask: false },
  { id: 'baycolor', p: /베이\s*(?:플랜|그림|화면).{0,16}(?:색|색깔|칸)|색깔.{0,10}(?:칸|뜻)/, a: '📖 베이 그림 칸 표시\n★붉은 별 = X-RAY, ❄ = 리퍼, ⚠ = 위험물, ⊞ = FR, △ = OT, ▣ = 탱크, 진한 초록 ✔ = 완료, ⬆N = 그 컨 위에 통과화물 N대, 주황 칸 = 시프팅 대상이에요. 선적 플랜은 칸 바탕색이 목적지(선적항) 색이에요. 20·40은 칸 모양으로 갈려요 — 40피트는 짝수 베이 한 덩어리로, 20피트는 홀수 칸으로 그려요.' },

  // ── 컨테이너·규격 기초 ───────────────────────────────────────────
  { id: 'app_photo_read', p: /사진.{0,16}(?:읽|보내서).{0,16}(?:컨\s*번호|읽게)/, a: '📖 사진으로 읽기\n미르는 리퍼 리스트·엠티실 리스트·베이 수기 기록지 같은 사진을 읽어요(미르 사진 읽기). 컨 한 대의 번호를 사진으로 찍어 찾는 기능은 아직 없어요 — 끝 4자리를 치거나 말로 하는 게 제일 빨라요.' },
  { id: 'cn_read', p: /(?:컨테이너|컨)\s*번호.{0,10}(?:읽|구성|뜻)|영어\s*4\s*글자|숫자\s*7\s*개/, a: '📖 컨테이너 번호 읽기\n맞아요 — 영문 4글자 + 숫자 7자리, 모두 11자리예요. 앞 3글자는 소유자(선사·리스사) 코드, 넷째 글자는 장비 구분(보통 U), 숫자 6자리는 일련번호, 맨 끝 1자리가 체크디지트예요(문짝에는 네모 칸 안에 적혀 있어요). 현장에서는 끝 4자리로 확인하고, 앱도 끝 4자리만 쳐서 찾아요.' },
  { id: 'cd', cn: true, ask: false, p: /체크\s*디지트|체크디짓|검산|check\s*digit/i, a: '📖 체크디지트\n맞아요 — 컨번호 맨 끝, 네모 칸 안 숫자가 체크디지트예요. 앞 10자리로 계산(ISO 6346)해서 나오는 값이라 번호를 잘못 적으면 대개 안 맞아요. 미르에게 컨번호 11자리를 통째로 물으면 검산해서 안 맞으면 «마지막 자리가 몇이면 맞습니다» 라고 알려 줘요. 리스트와 한 자리가 다르면 실물 번호를 다시 읽고, 실물이 맞으면 실물대로 처리(선적은 [컨테이너 번호 수정])하고 수석에게 알려요.' },
  { id: 'size_eye', p: /(?:20|이십).{0,6}(?:40|사십).{0,20}(?:구분|눈으로|어떻게|차이)/, a: '📖 20피트와 40피트 구분\n길이가 두 배예요 — 20피트는 약 6m, 40피트는 약 12m. 멀리서는 문짝 위 규격 표기(22G1·45G1 등 ISO 코드 — 첫 자리 2면 20피트, 4면 40피트)를 보거나, 옆면 골판 길이·코너 사이 거리로 가려요. 앱 카드에는 20DC·40HC 처럼 규격이 늘 같이 떠요.' },
  { id: 'hc', def: true, p: /^(?!.*(?:래싱|라싱)).*(?:하이\s*큐브|하이큐|40\s*HC|HC.{0,6}(?:뭐|뜻|높이))/i, a: '📖 하이큐브(HC)\n높이만 다른 컨테이너예요. 일반 컨은 높이 8피트 6인치(약 2.59m), 하이큐브는 9피트 6인치(약 2.9m)로 한 자 더 높아요. 길이·폭은 같아요. ISO 코드 둘째 자리가 5면 하이큐브예요(45G1 = 40피트 하이큐브). 앞뒤 같은 열에 하이큐브가 섞이면 쌓은 높이가 달라져 래싱 길이도 달라져요.' },
  { id: 'iso_diff', ask: false, data: true, p: /(?:리스트|선적\s*리스트).{0,12}(?:20GP|22G1|45G1|규격).{0,30}(?:BAPLIE|EDI)|규격.{0,10}(?:다른|불일치|달라)/i, a: '📖 규격이 자료마다 다를 때\n앱은 규격을 EDI(BAPLIE) 칸으로 그리고, 검수 리스트 규격 칸은 세관 신고 규격을 따라요. 둘이 다르면 컨 상세에 «규격이 자료마다 다릅니다» 가 뜨고 검수 리스트 비고에 «규격불일치» 가 붙어요. 실물을 보고 맞는 규격을 컨 상세에서 고르면(규격 고르기) 그 값이 이겨요. 끝 4자리로 그 컨을 물으면 규격을 바로 보여 드려요.' },
  { id: 'iso', def: true, p: /ISO\s*코드|규격\s*코드|22G1|45R1|45G1|22R1|코드.{0,10}읽/i, kq: 'ISO 코드 읽는 법' },
  { id: 'reefer_id', def: true, p: /리퍼.{0,20}(?:겉으로|구별|어떻게\s*알|냉동\s*컨테이너\s*맞)/, a: '📖 리퍼(냉동·냉장 컨테이너)\n맞아요 — 리퍼는 온도를 맞춰 싣는 냉동·냉장 컨이에요. 한쪽 끝(문 반대쪽)에 냉동기 장치와 온도 표시창·전원 케이블이 붙어 있어서 겉으로 알아봐요. ISO 코드 셋째 자리가 R(22R1·45R1)이에요. 풀 리퍼는 설정 온도를 확인하고 사진을 남겨요.' },
  { id: 'dg_label_diff', ask: false, p: /(?:DG|위험물|라벨).{0,24}(?:리스트에는|다르|달라|떨어져|없으면|없어)|플래카드.{0,10}없/i, a: '📖 위험물 표지가 리스트와 다르거나 없을 때\n그냥 진행하지 말고 사진(표지·컨번호)을 찍어 수석에게 바로 보고해요. 표지가 없거나 리스트 클래스와 다르면 선적 여부(보류)는 선사·터미널 위험물 담당이 정해요 — 검수원이 정하지 않아요. 앱에는 리스트·EDI의 클래스가 떠요.' },
  { id: 'dg_seg', p: /격리/, a: '📖 위험물 격리\n위험물끼리 떨어뜨려 싣는 격리(세그리게이션)는 선사 플래너·본선이 IMDG 기준으로 정해요. 앱은 클래스·위치를 보여 주지만 격리 위반 판정은 하지 않아요 — «위험물 위치» 로 물으면 클래스별 자리를 보여 드려요.', ask: false },
  { id: 'dg_label', p: /^(?!.*(?:없|떨어|다르|달라|격리)).*(?:DG|위험물).{0,20}(?:겉에|붙어|라벨|표지|플래카드|마크)/i, a: '📖 위험물(DG) 컨 겉표시\n네 옆면(앞뒤·양옆)에 마름모꼴 위험물 표지(플래카드)가 붙어요 — 색과 숫자가 클래스예요(예 빨강 3 = 인화성 액체, 흑백 8 = 부식성, 9 = 기타). UN 번호(네 자리) 판이 같이 붙기도 해요. 앱 카드에는 ⚠ 표시와 클래스·UN 번호가 떠요.', ask: false },
  { id: 'dg_care', p: /(?:DG|위험물).{0,20}(?:근처|조심|주의)/i, a: '📖 위험물 컨 근처에서\n표지(클래스)를 먼저 보고, 컨에 기대거나 올라서지 않아요. 새는 흔적·냄새·연기가 있으면 바로 물러나 바람 위쪽에서 수석에게 보고해요. 클래스 1(폭발물)·2(가스)·3(인화성)은 불씨(담배 등)를 가까이 하지 않아요.' },
  { id: 'oog', def: true, p: /OOG|오버\s*사이즈|규격\s*초과/i, a: '📖 OOG(규격초과)\nOOG는 Out of Gauge — 화물이 컨 규격(높이·폭·길이)을 넘는 것을 말해요. FR·OT는 컨 «종류» 이름이고, OOG는 그 위에 실린 화물이 «넘쳤느냐» 를 말하는 거라 같은 말은 아니에요(넘치지 않은 FR도 있어요). 넘친 만큼 옆·위 칸을 못 써서 보통 데크 맨 위에 실어요.' },
  { id: 'frot', def: true, p: /(?:FR|플랫랙).{0,16}(?:OT|오픈탑)|(?:OT|오픈탑).{0,16}(?:FR|플랫랙)/i, a: '📖 FR과 OT\nFR = Flat Rack(플랫랙) — 천장과 옆벽 없이 바닥과 앞뒤 기둥만 있어 폭·높이 넘는 기계·철강을 실어요. OT = Open Top(오픈탑) — 옆벽은 있고 지붕만 열려(천막) 위로 높은 화물을 실어요. 둘 다 화물이 규격을 넘으면 OOG(규격초과)예요. 초과 치수와 고정(래싱) 상태를 보고 사진을 남겨요.' },
  { id: 'fe_eye', p: /(?:엠티|풀).{0,10}(?:풀|엠티).{0,20}(?:어떻게|구분|겉으로|알)/, a: '📖 엠티와 풀 구분\n겉으로는 잘 모르는 게 맞아요. 리스트·EDI의 F/E 칸(앱 카드의 F·E 뱃지)이 기준이에요. 현장에서는 실(봉인)이 채워져 있으면 대개 풀, 무게(VGM)가 컨 자체 무게(20피트 약 2.2톤·40피트 약 3.8톤) 언저리면 엠티예요. 엠티도 실이 있는 경우(엠티실)가 있어 실만으로 단정하지 않아요.' },
  { id: 'fe_rule', p: /(?:20|이십)?\s*엠티.{0,8}(?:20|이십)?\s*풀.{0,10}(?:구분|기준)|(?:풀|엠티).{0,6}구분\s*기준/, kq: '엠티 풀 차이' },
  { id: 'polpod', p: /POD.{0,6}POL|POL.{0,6}POD|POD\s*(?:가|는|이)?\s*뭐|POL\s*(?:가|는|이)?\s*뭐/i, kq: 'POD 뭐야' },
  { id: 'ts', def: true, p: /트랜스\s*시핑|트랜스쉬핑|T\s*\/\s*S|환적/i, a: '📖 환적(T/S, Transshipment)\n이 배에서 내려 다른 배로 갈아타는 화물이에요. 평택이 최종 목적지가 아니라 거쳐 가는 컨이죠. 평택에서 내리면 평택 양하분으로 세고, 이 배에 실린 채 평택을 지나치기만 하는 통과화물과는 달라요. 검수사 기준으로 시프팅·환적은 컨번호와 수량을 파악하고, 데미지·실 확인은 하지 않아요.' },
  { id: 'xray_why', p: /(?:X-?RAY|엑스레이).{0,20}(?:왜|모든|다\s*하|전부\s*하)/i, a: '📖 X-RAY 검사\n세관이 밀수·불법 화물을 가리려고 고른 컨만 검색기로 들여다봐요 — 전부 하는 게 아니라 세관이 지정한 컨만이에요. 대상은 앱 X-RAY 탭·카드의 붉은 별로 보여요. 세관이 실을 자르고 새 실(커트씰)을 채우니 새 실번호를 꼭 넣어야 하고, 실번호가 없으면 앱이 양하확인을 막아요.' },
  { id: 'xray_where', p: /^(?!.*(?:누구|꼬이)).*(?:X-?RAY|엑스레이).{0,24}(?:어디로|보내|빼|표시)/i, a: '📖 X-RAY 대상 컨을 내린 뒤\nX-RAY 대상은 내린 뒤 터미널이 세관 검색기(평택 컨테이너검색기)로 옮겨 검사하고 다시 들여와요 — 검수원이 직접 보낼 곳을 정하지는 않아요. 검수원이 할 일은 양하할 때 세관 실번호(커트씰)를 넣는 것이고, 앱이 대상 표시(붉은 별·🔍)를 이미 해 둬요. 작업 순서 때문에 먼저 빼야 하면 수석·포맨에게 말해요.' },
  { id: 'stack40_20', ask: false, p: /40\s*(?:피트)?\s*위에\s*20|40\s*위\s*20/, a: '📖 40피트 위에 20피트\n40피트 위에는 20피트를 못 올려요 — 40피트 지붕 가운데에는 콘을 꽂을 모서리 구멍(코너 캐스팅)이 없어서 20피트를 잡을 수가 없어요. 그래서 자료에 «40 위 20» 이 보이면 자료(자리) 오류를 먼저 의심해요. 20피트 위에 40피트는 20피트 두 대가 나란히 있을 때 올릴 수 있어요.' },
  { id: 'f45_cone', p: /45\s*(?:피트)?.{0,20}콘/, a: '📖 45피트와 콘\n45피트는 40피트보다 앞뒤로 2.5피트씩 길어서, 40피트 자리 위에 실을 때는 40피트 위치에 있는 보조 모서리(코너 피팅)로 콘을 잡아요 — 그래서 보통 데크 40피트 위(위쪽 단)에만 실어요. 콘 개수는 40피트처럼 곳당 4개예요. 그 배 45피트 자리는 선사 플래너가 정해요.' },
  { id: 'deck_first', p: /해치\s*커버\s*위.{0,24}(?:먼저|빼야)/, a: '📖 해치커버 위 컨 먼저\n홀드를 작업하려면 그 장 해치커버 위(데크) 컨을 먼저 다 내려야 커버를 열 수 있어요. 그래서 양하 기본 순서가 데크 → 홀드예요. 커버 위에 얹힌 통과화물(평택에서 안 내리는 컨)은 들었다 다시 놓아야 해서 시프팅이 돼요. 앱 베이 그림에서 ⬆N 표시가 그 위에 얹힌 통과화물 대수예요.' },
  { id: 'cn_changed', p: /컨\s*번호\s*하나\s*바뀐|번호\s*바뀐\s*거|숫자\s*맞는데/, data: true, a: '📖 대수는 맞는데 컨번호가 바뀐 것 찾기\n양하·선적 리스트 탭 맨 위 «데이터 검증» 상자에서 «리스트에만»·«EDI에만» 으로 갈린 컨을 봐요 — 같은 수로 하나씩 엇갈린 번호가 바뀐 컨이에요. 실물과 기록이 엇갈렸으면 [⇄ 컨 맞교환]으로 바로잡고, [🏁 마감 점검]의 «바뀜» 항목에서도 보여요.' },
  { id: 'pos_vs_edi', ask: false, data: true, p: /베이\s*플랜.{0,12}EDI.{0,16}(?:위치|다른|대조)|EDI.{0,12}베이\s*플랜.{0,16}(?:위치|다른|대조)/i, a: '📖 베이플랜 위치와 EDI 위치\n앱 베이플랜은 EDI로 그린 그림이라 둘의 계획 자리는 같아요. 다를 수 있는 건 «실제로 실린·내린 자리» 예요 — 선적에서 [위치 지정]·[⇄ 맞교환]으로 바꾼 컨은 컨 상세에 계획 자리와 실제 자리가 같이 보여요. 종이 플랜(선사 PDF)과 다르면 수정본 EDI가 왔는지 업로드 탭에서 봐요.' },
  { id: 'cone_box', data: true, p: /콘\s*박스.{0,16}(?:몇|준비|챙)/, a: '📖 콘박스 준비\n필요한 콘 수는 콘앱이 계산해요 — 콘앱에서 배를 고르고 «콘 작업 브리핑» 을 물으면 «필요한 콘: 데크콘 N개 · 코끼리콘 N개 · 홀드콘 N개» 와 «가져갈 것 / 반납할 것» 이 나와요. 양하는 배에서 빠진 콘이 나오고(반납), 선적은 꽂을 콘이 필요해요. 콘박스 하나에 몇 개 들어가는지는 터미널 박스마다 달라 그 수로 나누면 돼요.' },
  { id: 'cone_what', def: true, p: /콘\s*(?:이|은|가)?\s*(?:뭔지|뭐|무엇)|모서리에\s*끼우|쇳덩이/, a: '📖 콘(트위스트락)\n맞아요 — 컨테이너 네 모서리 구멍(코너 캐스팅)에 끼워 위아래 컨을 묶는 잠금 쇠예요. 데크에서는 컨마다 네 모서리에 하나씩, 20피트 두 대가 40 자리에 나란히 앉는 가운데에는 미들콘을 써요. 양하 때는 «빼기», 선적 때는 «꽂기» 라고 해요. 몇 개가 필요한지는 콘앱이 베이별로 계산해요.' },
  { id: 'cone_auto', p: /오토\s*콘|세미\s*오토|풀\s*오토/, a: '📖 오토콘·세미오토콘\n세미오토는 꽂을 때 저절로 잠기고 풀 때 손잡이(레버)를 당겨 여는 콘, 풀오토는 크레인이 들어 올리면 저절로 풀리는 콘이에요. 한 단에 종류를 섞어 쓸지는 선사·본선(일항사) 지시를 따라요 — 섞어 쓰면 풀 때 남는 콘이 생겨 위험하니 본선에 확인해요.', ask: false },
  { id: 'cone_who', p: /콘.{0,12}(?:누가|누구|검수사가|세야)/, a: '📖 콘 작업은 누가\n콘을 빼고 꽂는 일은 라싱(고박) 작업자가 해요. 검수원이 콘 개수를 하나하나 세는 일은 아니에요 — 콘앱이 베이별로 필요한 콘·남는 콘(반납)을 계산해 주고, 콘박스 이동은 작업 보고에 남겨요.' },
  { id: 'cone_box_short', p: /콘\s*박스.{0,16}(?:모자|부족|누구)/, a: '📖 콘박스가 모자랄 때\n콘앱의 «모자란 데» 로 어느 베이에 몇 개가 모자란지 먼저 보고, 수석(또는 포맨)에게 바로 말해요. 콘박스를 옮기면 작업 보고의 [콘박스]로 남기면 카톡 공유창이 같이 떠요.' },
  { id: 'cone_release', p: /래싱\s*바.{0,16}(?:콘|순서)|콘\s*해제\s*순서/, a: '📖 양하 때 고박 풀기 순서\n라싱(고박) 작업자가 먼저 래싱바·턴버클을 풀고, 그다음 크레인이 들기 전에 콘을 풀어요(세미오토는 레버를 당겨 열고, 다 들어 올린 뒤 컨 밑에서 콘을 빼요). 콘앱 순서로는 양하 «데크콘 빼기 → 홀드콘 빼기» 예요. 실제 풀기는 라싱 작업자 몫이고 검수원은 크레인 밑·고박 작업 구역에 들어가지 않아요.' },
  { id: 'lashing', p: /래싱|라싱|턴버클|고박/, a: '📖 래싱(고박)\n배가 흔들려도 컨이 움직이지 않게 묶는 일이에요. 콘(트위스트락)으로 위아래 컨 모서리를 잠그고, 데크 아래 단은 래싱바(긴 쇠막대)를 컨 모서리에 걸어 턴버클(조임 나사)로 팽팽히 당겨요. 하이큐브가 섞이면 높이가 달라져 래싱바 길이도 달라지고, FR 화물은 체인·벨트로 따로 묶어요. 실제 묶는 일은 라싱 작업자 몫이고, 묶는 기준은 본선(일항사)이 정해요.' },
  { id: 'cellguide', p: /셀\s*가이드|셀가이드/, a: '📖 셀가이드\n홀드 안에 컨을 끼워 넣는 세로 레일(셀가이드)이 있는 베이는 컨이 레일에 잡혀 있어서 홀드에는 보통 콘을 쓰지 않아요. 레일이 없는 칸이나 20피트를 40 셀에 넣는 자리는 홀드콘이 필요해요 — 콘앱은 컨테이너선 20피트·받침 있는 칸에만 홀드콘을 세요. 배마다 예외가 있으니 그 배 콘앱 작업표를 보세요.', ask: false },

  // ── 자료·서류 기초 ───────────────────────────────────────────────
  { id: 'fe_doubt', p: /(?:20)?\s*풀인데.{0,16}엠티|엠티\s*같아|리스트마다\s*다르게/, a: '📖 풀·엠티가 자료마다 다를 때\n앱은 리스트·EDI의 F/E 칸으로 판정해요(겉으로는 못 가려요). 실물이 의심되면 무게(VGM)를 보세요 — 컨 자체 무게(20피트 약 2.2톤·40피트 약 3.8톤) 언저리면 엠티예요. 자료끼리 다르면 컨 상세에 «규격이 자료마다 다릅니다» 류 표시가 뜨고, 판단이 안 서면 사진과 함께 수석에게 보고해요.' },
  { id: 'mainplan', p: /메인\s*플랜|메인플랜/, a: '📖 메인플랜과 베이플랜\n둘 다 배 그림이지만 쓰임이 달라요. 메인플랜은 배 전체를 한 장에 보여 주는 요약도(베이마다 양하·선적 대수, 특수화물 위치를 한눈에), 베이플랜은 베이 하나하나를 칸 단위로 보여 주는 상세도(어느 칸에 어느 컨이 있는지)예요. 앱의 양하(DISCHARGING)PLAN·선적(STOWAGE)PLAN이 전체 그림이고, [베이] 탭이 베이별 상세예요.' },
  { id: 'app_baplie_up', p: /(?:BAPLIE|EDI).{0,16}(?:올리는|업로드)/i, a: '📖 EDI 올리기\n항차 화면 [📤 업로드] 탭에서 올려요. 보통은 메일 수집기가 자동으로 올려서 검수원이 따로 올릴 일은 드물어요 — 올라왔는지는 업로드 탭에서 자료별로 보여요.' },
  { id: 'baplie', p: /BAPLIE|베이플리|EDI.{0,10}(?:뭐|기계|사람)/i, a: '📖 BAPLIE(EDI)\n배에 실린 컨의 자리·규격·무게·목적지를 시스템끼리 주고받는 표준 전자 문서예요 — 사람이 읽으라고 만든 게 아니라 기계용 파일이에요. 앱이 이 파일을 읽어 베이 그림과 카드를 그려요. 사람은 앱 화면이나 PLAN 출력으로 보면 돼요.' },
  { id: 'cd_list', p: /체크\s*디지트.{0,20}(?:리스트|검증)|번호.{0,10}검증/, a: null },   // 아래 묶음 답(checkList)이 받는다 — 자리 지킴
  { id: 'teu', p: /TEU.{0,10}(?:뭐|계산|어떻게)/i, kq: 'TEU 뭐야' },
  { id: 'shortover', p: /숏\s*랜드|숏랜디드|쇼트\s*랜드|오버\s*랜드|short\s*land|over\s*land/i, a: '📖 숏랜드·오버랜드\n숏랜드(Short Landed)는 리스트(서류)에 있는데 배에서 안 내려온 컨, 오버랜드(Over Landed)는 리스트에 없는데 내려온 컨이에요. 앱에서는 숏랜드 = 큰 카드의 [🚫 선박에 없음 (누락 처리)], 오버랜드 = [작업 시작] 탭의 [➕ 초과 컨 추가](컨번호·규격·적공·타입·데미지 입력)예요. 둘 다 양하신고·마감 서류에 그대로 신고 대상으로 실려요 — 숨기지 말고 사실대로 남기고 수석에게 알려요.' },
  { id: 'rollover', p: /롤\s*오버|롤오버/, a: '📖 롤오버\n이번 배에 실을 예정이던 컨이 못 실리고 다음 배·다음 항차로 넘어간 거예요. 실제로 안 실렸으니 이번 마감(선적 대수)에는 빠지는 게 맞아요. 선사가 보낸 캔슬(취소) 리스트에 오면 앱이 그 컨을 빼고 세요 — 리스트에 없는데 현장에서 안 들어오면 수석에게 확인해요.' },
  { id: 'shift_what', p: /(?:시프팅|쉬프팅|재조정|SHIFT|리스토우).{0,20}(?:뭔가|뭐|뜻|이라는|란)/i, a: '📖 시프팅(SHIFT)\n평택 화물을 꺼내려고 그 위에 얹힌 통과화물(평택에서 안 내리는 컨)을 들었다 같은 배에 다시 놓는 것이에요. 평택에서 내리는 것도, 배를 갈아타는 것도 시프팅이 아니에요. 리스트에 SHIFT 라고 적힌 컨이 그 대상이고, 앱은 시프팅을 양하·선적 대수와 따로 시프팅 리스트로 세요(베이 그림 주황 칸).' },
  { id: 'reship_tally', p: /재선적.{0,16}마감|마감.{0,16}재선적/, a: '📖 재선적과 마감텔리\n시프팅(재선적) 컨은 평택 양하·선적 대수와 섞지 않고 마감텔리 시프팅 칸에 따로 적어요. 마감텔리는 수석이 실물 양식대로 만들어요.' },
  { id: 'reload', p: /재\s*선적|리스토우|restow/i, a: '📖 재선적(시프팅 컨)\n평택 화물을 꺼내려고 내렸다가 같은 배에 다시 싣는 컨이 시프팅(재선적)이에요. 앱은 시프팅을 양하·선적 리스트와 따로 시프팅 리스트로 관리하고, 마감텔리에는 수석이 실물 양식대로 시프팅 칸에 따로 적어요(평택 양하·선적 대수에는 안 섞어요).' },
  { id: 'shift_rec', p: /시프팅.{0,24}(?:온보드|육상|기록|마감|잡혀|다르게)/, a: '📖 시프팅 기록\n시프팅은 배 안에서 자리만 옮기는 것(온보드 — 같은 배 다른 칸으로)과, 부두에 잠깐 내렸다 다시 싣는 것(육상 경유) 두 가지예요. 둘 다 평택 양하·선적 대수에는 안 들어가고 시프팅 대수로 따로 세요. 앱은 시프팅을 시프팅 리스트로 따로 관리하고, 마감텔리 시프팅 칸은 수석이 실물 양식대로 적어요. 육상 경유는 내릴 때·실을 때 두 번 무브가 생겨요.' },
  { id: 'vgm', p: /VGM/i, kq: 'VGM 뭐야' },
  { id: 'soc', p: /SOC.{0,10}(?:뭐|뜻)/i, a: '📖 SOC\nShipper Owned Container — 선사가 아니라 화주가 소유한 컨이라는 표식이에요. 선사 코드가 아니라서 EDI 선사 칸에 SOC가 오면 그 배 마감텔리 선사로 읽어요(예 TMPZ 는 SOC 를 TJM 으로 — 2026-09-15 확정).' },

  // ── 실(봉인) ─────────────────────────────────────────────────────
  { id: 'seal_need', p: new RegExp(SL + '\\s*확인.{0,12}(?:양하|선적).{0,12}(?:꼭|해야|도\\s*해)'), a: '📖 양하 때도 실 확인\n네, 양하 때도 해요. 평택에서 내리는 컨은 실번호·상태를 확인해 세관 신고(양하신고)에 실려요 — X-RAY 대상은 세관 실번호(커트씰)를 꼭 넣어야 양하확인이 돼요. 다만 시프팅·환적(통과) 컨은 컨번호와 수량만 파악하고 데미지·실 확인은 하지 않아요(검수사 2026-09-24).' },
  { id: 'seal_customs', p: new RegExp(SL + '.{0,16}(?:불일치|다르|틀리).{0,24}세관|세관.{0,16}통보', 'i'), a: '📖 실번호 불일치와 세관\n실번호가 리스트와 다르면 실오류로 사진 보고를 남기고 수석에게 알려요 — 세관 신고(양하신고)는 수석이 마감 때 실오류(SLN: 봉인번호 다름) 코드로 올려요. 검수원이 세관에 직접 통보하지는 않아요. 판정 기준 — 알파벳만 빠진 것은 실오류가 아니고, 알파벳이 다르거나 앞자리 0 이 빠지면 실오류예요.' },
  { id: 'seal_check', preferKnow: true, p: new RegExp(SL + '.{0,10}(?:확인|seal|\\)).{0,30}(?:뭘|무엇|정확히|끊어진|번호만)|seal.{0,10}확인', 'i'), a: '📖 실(봉인) 확인\n두 가지를 봐요. ① 번호 — 실물 실번호가 리스트(EDI·세관) 번호와 같은지(알파벳만 빠진 건 같은 실로 보고, 알파벳이 다르거나 앞자리 0 이 빠지면 실오류). ② 상태 — 끊어졌거나·없거나·훼손됐는지. 번호만 맞으면 끝이 아니라 끊어진 것도 봐야 해요. 이상이 있으면 컨 상세의 [📷 실오류 보고]로 사진을 남겨요.' },
  { id: 'seal_cut', preferKnow: true, ask: false, p: new RegExp(SL + '.{0,10}(?:끊어|끊긴|잘려|잘린|없는|없으면|아예\\s*없|빠져)|도어\\s*실', 'i'), kq: '씰 잘렸어 어떻게 해', add: '양하는 멈추지 않고 그대로 내리되, 내린 뒤 실 없음을 사진으로 남기고 수석에게 알려요. 실 끊김은 데미지가 아니라 실오류(실 보고)로 남겨요.' },
  { id: 'seal_diff', preferKnow: true, ask: false, p: new RegExp(SL + '.{0,20}(?:리스트랑|다르게|다르|틀려|틀린|안\\s*맞)|현장\\s*실', 'i'), a: '📖 실번호가 리스트와 다를 때\n① 실물 번호를 끝까지 다시 읽고(알파벳·앞자리 0 까지) ② 그래도 다르면 실물 번호를 넣고 컨 상세의 [📷 실오류 보고](컨번호 사진 + 실 사진)로 남겨요. ③ 수석에게 알리면 마감 때 세관 신고에 실오류로 올라가요. 판정 기준 — 알파벳만 빠진 것은 실오류가 아니고, 알파벳이 다르거나 앞자리 0 이 빠지면 실오류예요. 앱은 자료마다 실이 다르면 «다른 자료 실» 로 같이 보여 주고, 하나라도 맞으면 맞음으로 봐요.' },

  // ── 리퍼 ────────────────────────────────────────────────────────
  { id: 'rf_plug_time', p: /리퍼.{0,24}(?:몇\s*분|시간\s*안|플러그\s*아웃|전원.{0,8}(?:연결|끊|꽂|들어|켜|확인)|플러그.{0,6}(?:시간|기록|꽂|확인))/, a: '📖 리퍼 전원\n검수원은 리퍼 전원(플러그 인·아웃)에 관여하지 않아요 — 빼고 꽂는 일은 터미널 리퍼 담당이 하고, 앱에도 플러그 시각을 적지 않아요. 선적 때는 빠른 시간 안에 전원을 넣으라고 선원에게 전달해요(검수사 확정).' },
  { id: 'rf_temp_diff', ask: false, p: /리퍼.{0,30}(?:온도|도).{0,20}(?:차이|다르|달라|틀려)|온도.{0,16}(?:리스트랑|표시창).{0,10}(?:다르|달라|차이)/, a: '📖 리퍼 온도가 리스트와 다를 때\n설정 온도(SET)와 표시 온도를 둘 다 봐요. 리스트 설정 온도와 기계 설정이 다르면 사진을 찍어 수석에게 보고해요 — 설정을 검수원이 바꾸지는 않아요. 양하 직후엔 표시 온도가 설정과 몇 도 차이 날 수 있어요(전원이 잠시 빠졌던 것) — 설정이 맞으면 표시 차이는 메모로 남기고, 차이가 크거나 알람이 뜨면 바로 보고해요.' },
  { id: 'rf_power_off', p: /리퍼.{0,24}(?:전원|꺼져|케이블).{0,24}(?:어디|적어|기록|손상)/, a: '📖 리퍼 전원 이상 기록\n전원이 꺼져 있었거나 케이블이 손상된 리퍼는 컨 상세의 [📷 데미지 보고]로 사진(온도 표시창·케이블)과 메모를 남기고 수석에게 바로 알려요. 케이블 손상은 데미지 부위로 고를 수 있어요. 온도가 많이 올라갔으면 표시 온도도 함께 적어요.' },
  { id: 'rf_who', p: /리퍼.{0,24}(?:검수사가\s*확인|꽂혀\s*있는지)/, a: '📖 리퍼 확인은 누가\n전원을 꽂고 빼는 일은 터미널 리퍼 담당이 하고, 검수원은 설정 온도와 표시 온도를 확인하고 풀 리퍼 사진을 남겨요. 온도가 리스트와 다르면 사진을 찍어 수석에게 보고해요(검수원이 설정을 바꾸지는 않아요).' },
  { id: 'rf_empty', p: /리퍼.{0,12}엠티|엠티.{0,12}리퍼/, a: '📖 엠티 리퍼\n빈 리퍼는 화물이 없으니 온도를 맞출 필요가 없어 온도 확인·사진 대상이 아니에요. 대수도 «리퍼 몇 대» 에는 풀 리퍼만 세고, 엠티 리퍼는 엠티 묶음에서 «리퍼 엠티» 로 따로 표기해요(검수사 2026-10-09).' },
  { id: 'rf_order', p: /리퍼.{0,20}(?:순서|먼저|나중)/, a: '📖 리퍼 양하 순서\n양하 순서는 크레인 작업 순서(데크 → 홀드, 위 단부터)를 따르고 리퍼만 따로 먼저 빼지는 않아요. 다만 규격이 섞인 베이에서는 OOG·FR/OT → 40피트(일반 먼저, 리퍼 나중) → 20피트 순이 기본이에요. 앱 자동 가이드에서 호기마다 «리퍼부터» 를 고를 수도 있어요. 전원은 터미널 리퍼 담당이 양하 전에 빼요.' },
  { id: 'rf_plug_pos', p: /플러그.{0,12}위치|리퍼.{0,10}플러그/, a: '📖 리퍼 플러그 자리\n배의 리퍼 전원 소켓은 보통 리퍼를 실을 수 있는 칸(주로 데크 아래 단·홀드 특정 줄)에만 있어요. 정확한 자리는 그 배 리퍼 콘센트 배치라 베이플랜의 ❄ 표시 칸이 리퍼가 실린 자리예요. 앱은 소켓 위치 자료는 없어요.', ask: false },
  { id: 'rf_vent', p: /벤트|습도/, a: '📖 리퍼 벤트·습도\n벤트(환기구 개방)·습도 설정은 앱 자료(EDI·리스트)에 칸이 없어 미르가 셀 수 없어요. 리퍼 설정은 기계 표시창에서 확인하고, 리스트 특기사항에 적혀 오면 수석에게 확인해요.', ask: false },

  // ── 위험물 ──────────────────────────────────────────────────────
  { id: 'dg_leak', ask: false, p: /(?:DG|위험물).{0,24}(?:누유|새|누출|냄새|도망)|누유/i, a: '📖 위험물이 새거나 냄새가 날 때\n① 바로 그 자리를 떠나 바람 위쪽으로 물러나요(만지지 말고 냄새 맡지 말고). ② 작업을 멈추라고 크레인 기사·포맨에게 알리고 수석에게 바로 보고해요 — 작업 중지·통제는 터미널 안전 담당이 정해요. ③ 안전한 거리에서 컨번호·위치·클래스(표지)를 확인해 전해요. 도망이라기보다 «물러나서 알리기» 가 먼저예요.' },

  // ── 데미지·사고 ──────────────────────────────────────────────────
  { id: 'dmg_first', preferKnow: true, p: /(?:찌그러|파손|데미지).{0,24}(?:제일\s*먼저|먼저\s*뭘|떨려|발견하면)/, kq: '컨테이너 찌그러졌어 어떻게 해', add: '떨리면 천천히 해도 돼요 — 순서는 ① 컨번호 확인 ② 사진(컨번호 + 손상 부위) ③ [📷 데미지 보고] ④ 수석에게 알리기예요.' },
  { id: 'dmg_reject', p: /(?:찌그러|파손|데미지).{0,24}(?:거부|리마크|선적\s*보류)/, a: '📖 데미지 컨 선적 여부\n선적을 거부할지는 검수원이 정하지 않아요 — 선사·본선(일항사)·터미널이 정해요. 검수원은 손상을 사진으로 남기고([📷 데미지 보고] — 종류·부위·치수) 수석에게 알려서, 선적 전에 리마크(손상 기록)가 남게 해요. 문이 안 잠기거나 화물이 보일 만큼 크면 바로 보고해 판단을 받아요.' },
  { id: 'dmg_nophoto', p: /사진\s*없이.{0,20}(?:데미지|기록)|책임/, a: '📖 사진 없는 데미지 기록\n사진이 없으면 그 손상이 언제 생겼는지 증명할 수 없어요 — 나중에 작업 중 손상으로 몰려 책임 다툼이 생길 수 있어요. 그래서 데미지는 반드시 사진(컨번호 + 손상 부위)과 함께 [📷 데미지 보고]로 남겨요. 앱도 사진 두 장이 없으면 데미지 보고를 보내지 않아요.' },
  { id: 'dmg_sign', p: /선측\s*사인|사인.{0,10}(?:안\s*받|못\s*받)/, a: '📖 데미지 리포트 선측 사인\n선측(본선) 확인 사인이 없으면 그 손상을 본선이 인정했다는 근거가 약해져요. 사인은 보통 수석이 마감 때 CARGO DAMAGE REPORT로 받아요 — 검수원은 사진과 앱 기록을 빠짐없이 남겨 두면 돼요. 사인을 못 받았으면 수석에게 꼭 알려요.' },
  { id: 'dmg_drop', p: /(?:떨궜|떨어뜨|떨어졌|낙하).{0,24}(?:사고|보고|누구|뭐부터)|사고\s*보고/, a: '📖 크레인이 컨을 떨어뜨렸을 때\n① 먼저 안전 — 그 자리에서 물러나고 다친 사람이 있는지 봐요(있으면 119·터미널 안전 담당). ② 크레인 기사·포맨에게 작업 중지를 알리고 수석에게 바로 보고해요. ③ 안전해진 뒤 컨번호·시각·위치·손상 상태를 사진으로 남겨요([📷 데미지 보고]). 사고 처리(보고서)는 터미널과 수석이 맡아요.' },
  { id: 'dmg_hit', ask: false, p: /다른\s*컨\s*(?:쳤|박|부딪)|부딪/, a: '📖 크레인이 다른 컨을 쳤을 때\n기록해야 해요. 부딪힌 두 컨 모두 컨번호·시각·위치·손상 상태를 사진으로 남기고([📷 데미지 보고]) 수석에게 알려요. 작업 중 생긴 손상이라 기존 손상과 구분되게 «작업 중 발생» 을 메모에 적어요.' },
  { id: 'dmg_rust', p: /구멍.{0,10}녹|녹.{0,10}구멍|녹슨/, a: '📖 구멍과 녹\n녹(표면 녹·페인트 벗겨짐)은 보통 데미지로 잡지 않아요. 구멍(빛이 새는 것)·찢어짐·깊은 찌그러짐·부식으로 뚫린 곳은 데미지예요. 판단 기준은 «화물을 지키는 기능이 상했느냐» 예요 — 애매하면 사진을 남기고 수석에게 물어요.' },
  { id: 'dmg_water', preferKnow: true, p: /물이?\s*새|누수/, kq: '물이 새는데 데미지 어떻게 잡아야 돼' },
  { id: 'dmg_photo_n', p: /(?:데미지|사진).{0,10}(?:몇\s*장|몇장)/, a: '📖 데미지 사진\n앱 [📷 데미지 보고]는 컨번호 사진 1장 + 손상 부위 사진 1장, 두 장이 꼭 있어야 보내져요(종류·부위·치수도 골라요). 그 밖에 손상이 크면 전체·가까이 사진을 더 찍어 카톡으로 함께 보내요. 정식 검수 사진은 6면 + 도어 안 + 네임플레이트 8장이 기본이에요.' },
  { id: 'dmg_how', preferKnow: true, p: /(?:찌그러|파손|데미지).{0,24}(?:어떻게|기록|남겨)|데미지\s*사진.{0,10}(?:어디|어떻게|올리)/, a: '📖 데미지 기록 남기기\n컨 상세 화면(끝 4자리로 찾아 카드 누름)의 [📷 데미지 보고]에서 ① 컨번호 사진 ② 손상 부위 사진을 찍고 종류·부위·치수(가로·세로·깊이 cm)를 고른 뒤 [카톡으로 전송]을 누르면 앱 기록과 CARGO DAMAGE REPORT에 남아요. 자료가 오기 전이면 헤더 ⋮ → [📷 데미지 예약]에 컨번호로 미리 걸어 둬요.' },
  { id: 'dmg_photo_link', ask: false, p: /사진.{0,16}(?:연결|안\s*붙|번호\s*연결)/, a: '📖 사진이 컨번호에 안 붙었을 때\n데미지 사진은 그 컨의 상세 화면에서 [📷 데미지 보고]로 올려야 그 컨에 붙어요. 카톡으로만 보냈으면 앱 기록에 없을 수 있어요 — 컨 상세 «📷 데미지·사진 N건» 줄에 보이는지 확인하고, 없으면 그 컨 상세에서 다시 올려요. 자료가 아직 없는 배면 [📷 데미지 예약]에 컨번호를 걸어 두면 자료가 올 때 붙어요.' },
  { id: 'dmg_missed', p: /(?:놓친|지나쳤|못\s*봤).{0,24}(?:데미지|큰일)|데미지.{0,20}(?:놓친|지나쳤)/, a: '📖 데미지를 놓쳤을 때\n큰일보다는 «바로 알리기» 가 중요해요. 지금 수석에게 어느 배·어느 컨(아는 만큼)인지 말해요. 컨이 아직 터미널에 있으면 사진을 남길 수 있고, 앱 [📷 데미지 예약]·컨 상세에 늦게라도 기록할 수 있어요. 숨기면 나중에 더 커져요 — 다음부터는 확인 누르기 전에 겉면을 한 번 훑는 습관을 들여요.' },
  { id: 'dmg_seal_q', p: new RegExp(SL + '.{0,10}끊어진.{0,16}데미지'), kq: '씰 잘렸어 어떻게 해', add: '실 끊김은 데미지가 아니라 실 보고([📷 실오류 보고])로 남겨요.' },

  // ── 자료 불일치·현장 대처 ────────────────────────────────────────
  { id: 'notinlist', ask: false, p: /리스트에\s*없는.{0,20}(?:나왔|내려|컨)|오버\s*랜드.{0,10}(?:처리|하나)/, a: '📖 리스트에 없는 컨이 내려왔을 때\n오버랜드(초과)예요. [작업 시작] 탭의 [➕ 초과 컨 추가 (리스트에 없는데 내려진 컨)]에서 컨번호·규격·적공·타입·데미지를 넣으면 신고 대상(초과분)으로 남아요. 수석에게도 알려요. 컨번호를 미르에게 물으면 다른 배·통과화물인지 먼저 찾아 줘요 — 번호 검산이 안 맞으면 오타일 수도 있어요.' },
  { id: 'noshow', ask: false, p: /(?:선적\s*)?리스트에\s*있는데.{0,20}(?:안\s*들어|안\s*왔|없)/, a: '📖 리스트에 있는데 컨이 안 들어올 때\n아직 반입 전이거나, 캔슬(롤오버)됐거나, 다른 자리에 먼저 실렸을 수 있어요. 끝 4자리로 앱에서 찾아 완료·자리를 보고, 그래도 없으면 수석에게 알려요. 선사 캔슬 리스트가 오면 앱이 그 컨을 빼고 세요.' },
  { id: 'posdiff', ask: false, cn: true, p: /(?:플랜|베이\s*플랜).{0,20}(?:실제|다른\s*자리|한\s*칸\s*옆|위치).{0,16}(?:달라|다르|실려|실으면)|다른\s*자리에\s*실/, a: '📖 플랜과 다른 자리에 실렸을 때\n실린 자리 그대로 기록해요. 선적은 칸 번호는 계획대로 차고 컨번호만 바뀌는 경우가 대부분이라 [컨테이너 번호 수정 (다른 컨이 옴)]이 주 경로예요. 정말 계획에 없는 칸에 실렸으면 [📍 위치 틀림 / 위치 지정]으로 실제 칸을 골라요. 기록이 실물과 엇갈렸으면 [⇄ 컨 맞교환]. 양하는 카드와 다른 컨을 확인하면 완료만 찍고 자리는 EDI 그대로 둬요.' },
  { id: 'edi_vs_list', p: /(?:EDI|이디아이).{0,16}(?:리스트|양하\s*리스트).{0,16}(?:뭐가\s*맞|어느|안\s*맞)/i, a: '📖 EDI와 리스트가 다를 때\n기본은 리스트예요(검수사 2026-09-24 «언제든 기본은 리스트이다») — EDI는 자리·규격을 보완해요. 양하 평택분의 기본은 세관 목록이고, 목록에 없는데 실제 내린 컨은 추가분(신고 대상)으로 더해요. 앱은 양하·선적 리스트 탭 «데이터 검증» 상자에서 어긋나는 컨을 컨번호로 보여 줘요. 미르에게 «EDI 리스트 대조» 로 물어 보세요.' },
  { id: 'cnt_diff', ask: false, data: true, p: /^(?!.*몇\s*대\s*차이).*(?:(?:대수|숫자).{0,20}(?:안\s*맞|모자|하나\s*모자|1\s*대\s*안\s*맞|차이)|하나\s*모자라)/, a: '📖 대수가 안 맞을 때 먼저 볼 것\n① 끝내기 전 [🏁 마감 점검] — 미완료·누락·초과·중복을 한 번에 보여 줘요. ② 양하·선적 리스트 탭 맨 위 «데이터 검증» 상자 — EDI 평택 / 리스트 / 매칭 / 쉬프팅 칸을 비교해요. ③ 시프팅·캔슬·MFN(화물은 있으나 리스트에 없는 컨)이 섞였는지 봐요. 미르에게 «마감 점검» «실번호 점검» 으로 물어도 돼요.' },
  { id: 'plan_vs_list', data: true, p: /메인\s*플랜.{0,20}리스트|어느\s*쪽이\s*맞/, a: '📖 자료끼리 대수가 다를 때 어느 쪽이 맞나\n대수의 기본은 선사 리스트(양하는 세관 목록)예요. 플랜·EDI는 자리를 보완하는 자료라, 리퍼처럼 대수가 다르면 리스트를 기준으로 보고 플랜·EDI에만 있는 컨이 무엇인지 확인해요. 리퍼 수는 어디서나 풀 리퍼만 세요(엠티 리퍼는 따로).' },
  { id: 'revision', p: /수정본.{0,20}(?:바뀌|바뀐|달라)|이전\s*거랑.{0,10}(?:바뀌|달라)/, a: '📖 수정본 리스트\n수정본(REVISED·최종 등)이 오면 수집기가 개정판으로 바꿔 끼우고, 늘고 준 컨은 항차 화면 주의 박스 «자료별 대조» 와 리스트 탭 «데이터 검증» 상자에 컨번호로 나와요. 캔슬 리스트는 빼라는 목록이라 그 컨을 빼고 세요.', ask: false },
  { id: 'xray_notinlist', p: /(?:X-?RAY|엑스레이).{0,20}(?:양하\s*리스트에?\s*없|리스트에\s*없)/i, a: null },   // 묶음 답 xrayNotInList 가 받는다
  { id: 'order_changed', p: /(?:작업\s*)?순서.{0,20}(?:바뀐|바꾸면|꼬이면|바뀌면)|기사가\s*바꾸/, a: '📖 작업 순서가 바뀌었을 때\n텔리는 실제로 내린·실은 대로 기록해요(순서가 바뀌어도 기록은 실물 기준). 순서를 바꾸는 건 크레인 기사·포맨·본선이 정할 일이라 검수원이 막지는 않지만, X-RAY·리퍼처럼 먼저 빼야 할 컨이 꼬이면 포맨·수석에게 말해요. 앱 자동 가이드는 3대 연속 어긋나면 순서를 물어요 — 기사 특성이 강한 날은 베이모드로 베이 그림에서 직접 눌러 내리면 돼요.' },
  { id: 'hold_order', p: /보류/, a: '📖 보류\n못 내리는 컨(선사 지시·문제 컨)에만 보류를 눌러요. 한 번 눌러 두면 앱이 해제를 다시 묻지 않고, 내려가면 저절로 빠져요. 위험물 표지 없음·데미지 같은 문제는 선적 보류를 선사·터미널이 정하고, 검수원은 사진과 보고를 남겨요.', ask: false },
  { id: 'pause_who', p: /(?:누구한테|누구에게)\s*(?:말|보고|알려)/, a: '📖 누구에게 알리나\n현장 작업(순서·장비·안전)은 포맨과 크레인 기사에게, 검수 자료·이상(실오류·데미지·대수 차이·누락·초과)은 수석에게 알려요. 급하면 무전, 기록은 앱(사진 보고·작업 보고)에 남겨요.' },

  // ── 마감·보고·인계 ───────────────────────────────────────────────
  { id: 'close_how', p: /마감\s*텔리.{0,20}(?:어떻게|확인|넘겨|뽑)|작업\s*끝나면.{0,16}마감/, a: '📖 작업 끝날 때\n검수원은 [🏁 마감 점검](미완료·누락·초과·실오류·온도·사진)을 돌려 빠진 걸 채우고, 교대면 미르에게 «인수인계» 로 인계서를 만들어 특이사항을 적어요. 그다음 홈에서 그 배 상세의 [⬇ 양하 완료]/[⬆ 선적 완료]. 마감텔리(DEP.TALLY REPORT)는 수석이 수석 대시보드 → 📋 진행·마감 → 📑 마감 텔리에서 실물 양식으로 만들어요.' },
  { id: 'close_check', p: /마감\s*(?:전에|전)\s*(?:확인|뭐)/, a: '📖 마감 전에 확인할 것\n[🏁 마감 점검]을 눌러 ① 미완료 컨 ② 누락(선박에 없음)·초과 ③ 실번호 비었거나 겹친 것 ④ X-RAY 실번호 ⑤ 풀 리퍼 온도·사진 ⑥ 데미지 사진을 봐요. 앱이 막지 않은 것을 여기서 잡아요. 미르에게 «마감 점검» «양하신고» 로 물어도 돼요.' },
  { id: 'report_list', p: /반장님한테|보고해야\s*하는게|꼭\s*보고/, a: '📖 꼭 보고할 것\n① 실오류(실번호 다름·실 없음·끊김) ② 데미지(사진 보고와 함께) ③ 누락(숏랜드)·초과(오버랜드) ④ 리퍼 온도 이상·전원 꺼짐 ⑤ 위험물 표지 이상·누출 ⑥ 안전 사고·장비 고장·작업 중단 ⑦ X-RAY 실번호 문제. 기록은 앱(사진 보고·작업 보고), 급한 건 무전으로 바로 알려요.' },
  { id: 'radio_app', p: /무전.{0,16}(?:앱|둘\s*다)|앱에\s*남겨요/, a: '📖 무전과 앱\n둘 다 해요. 급한 일(안전·사고·작업 중단)은 무전으로 바로 알리고, 기록은 앱에 남겨요 — 작업 보고(시작·중단·재개·완료), 사진 보고(실오류·데미지)는 앱에 남겨야 마감 서류에 들어가요.' },
  { id: 'handover', p: /인계|인수\s*인계|교대할\s*때|넘겨야\s*되/, a: '📖 교대 인계\n미르에게 «인수인계» 라고 치면 인계서 초안(남은 작업·베이, 양하신고, 특이사항)이 나와요 — 아래 칸에 특이사항을 적고 [✓ 인계서 완성]. 남은 물량만 보려면 «남은 거 몇 대» · «몇 시에 끝나». 데미지·실오류·장비 문제·보류 컨은 꼭 적어 넘겨요.' },
  { id: 'after_close_fix', p: /마감\s*(?:하고|한)\s*(?:나서|뒤).{0,16}(?:틀린|고칠|수정)|완료\s*눌렀는데\s*수정/, a: '📖 완료·마감 뒤에 고치기\n한 대를 잘못 완료했으면 그 카드의 [양하확인 취소]/[선적확인 취소]로 되돌려요(왜 취소하는지 고르는 창이 떠요). 배 전체 [양하 완료]를 누른 뒤라도 자료는 지워지지 않고 수석이 최종 확인하니, 틀린 걸 찾으면 수석에게 알려 고쳐요. 수석 완료 저장 뒤 고칠 것도 수석이 해요.' },

  // ── 앱 사용 ─────────────────────────────────────────────────────
  { id: 'app_login', p: /로그인.{0,16}(?:안\s*돼|안돼|아이디|누가)|아이디.{0,10}(?:누가|만들)/, a: '📖 로그인\n아이디는 따로 없어요 — 앱을 열면 뜨는 «작업자 선택» 창에서 내 이름을 누르거나, 목록에 없으면 입력칸에 이름을 치고 [선택]을 눌러요. 직원 명단에 있는 이름만 받으니 명단에 없다고 나오면 수석에게 명단 등록을 부탁하세요.\n비밀번호는 내가 정해요 — 처음 이름을 고르면 본인 비밀번호(4자 이상)를 정하고, 그 폰이 신뢰 기기가 되어 다음부터는 묻지 않아요. 다른 폰에서는 비밀번호를 넣고 «기기 등록»을 체크해요(최대 4대). 잊었으면 검수사에게 초기화를 부탁하세요.' },   // ★ 5.28-05: «비밀번호 없음» 은 4.43 뒤로 틀렸다(helpData 4.43 — 일반 검수원도 본인 비밀번호)
  { id: 'app_ship', p: /(?:내\s*)?(?:선박|배).{0,10}(?:찾|바꾸|바꿔|선택|여러\s*개)/, a: '📖 내 배 찾기·바꾸기\n홈 화면 배 목록에서 내 배 줄을 누르면 상세가 열리고, [양하 열기]/[선적 열기]로 들어가요. 배는 작업 시작이 빠른 순, «⚓ 작업 중 → 📅 오늘 → 📅 내일» 묶음으로 보여요. 다른 배로 바꾸려면 홈으로 돌아가 그 배 줄을 누르면 돼요.' },
  { id: 'app_home_add', p: /홈\s*화면에?.{0,6}(?:추가|아이콘)|앱스토어|설치/, a: '📖 홈 화면에 추가(앱 설치)\n앱스토어 앱이 아니라 웹 앱이에요. 갤럭시는 크롬·삼성 인터넷, 아이폰은 사파리로 앱 주소를 열고 [앱 설치] 또는 [홈 화면에 추가]를 누르면 홈 화면에 아이콘이 생겨요(«바로가기» 말고 «설치» 여야 주소창 없는 전체 화면). 다른 사람 폰에 깔아 줄 땐 보조기능 → [설치 QR]. 카톡 안에서 연 화면에서는 설치가 안 되니 크롬으로 다시 열어요.' },
  { id: 'app_font', p: /글씨|글자/, a: '📖 글자 크게\n헤더 [⋮] → [화면 · 소리 · 글자] → «글자 크기» 에서 [크게]를 누르면 앱 전체 글자가 한 단계 커져요(되돌리려면 [보통]). 미르에게 «글자 크게» 라고 말해도 돼요. 기기마다 따로 기억해요. 베이 그림·인쇄물은 그대로예요.' },
  { id: 'app_offline', p: /오프라인|인터넷.{0,10}(?:안\s*터|안터|끊)|동기화|날아가/, a: '📖 인터넷이 약할 때\n누른 저장은 연결이 돌아오면 서버로 올라가요. 다만 화면 위에 «오프라인» 표시가 떠 있는 동안에는 앱을 닫거나 새로고침하지 마세요 — 그 사이 누른 저장이 새로고침하면 사라질 수 있어요. 연결이 돌아온 뒤에 새로고침해요.' },
  { id: 'app_update', p: /업데이트/, a: '📖 앱 업데이트\n새 판이 나오면 화면 위에 «🆕 새 버전 출시» 띠가 뜨고 [업데이트]를 누르면 돼요. 저장된 기록은 서버에 있어서 지워지지 않아요 — 다만 «오프라인» 표시가 떠 있을 땐 연결이 돌아온 뒤에 누르세요. 지금 판 번호는 로그인 화면 제목 줄·머리띠 로고 옆 숫자로 보여요.' },
  { id: 'app_sync', p: /다른\s*(?:검수사|사람).{0,16}(?:체크|완료|입력).{0,16}(?:보여|바로)/, a: '📖 다른 사람 기록이 보이나\n네, 바로 보여요. 완료([양하확인]/[선적확인])는 즉시 서버로 가서 같은 항차를 보는 모든 사람의 숫자와 카드가 같이 바뀌어요. 안 바뀌면 옛 판이거나(🆕 업데이트) 인터넷이 끊긴 거예요.' },
  { id: 'app_phone', p: /폰\s*바꾸|폰\s*바꿨|새\s*폰|기존\s*기록/, a: '📖 폰을 바꾸면\n기록은 폰이 아니라 서버에 남아서 없어지지 않아요. 새 폰에 앱을 설치(홈 화면에 추가)하고 내 이름으로 들어가면 그대로 보여요. 글자 크기·밝기 같은 화면 설정만 기기마다 따로라 다시 골라요.' },
  { id: 'app_undo', p: /(?:잘못|실수로).{0,16}(?:눌렀|확인\s*완료|완료)|되돌리/, a: '📖 잘못 눌렀을 때\n완료된 카드의 [양하확인 취소]/[선적확인 취소]를 누르면 왜 취소하는지 묻는 창이 떠요 — 실물이 아직 배에 있으면(잘못 누름) 그걸 골라요. 고른 답에 따라 마감 숫자가 달라지니 아무거나 고르면 안 돼요. 다른 컨을 잘못 확인했으면 그 컨을 취소하고 맞는 컨을 다시 확인해요.' },
  { id: 'app_cnfix', p: /컨\s*번호.{0,10}잘못\s*입력|번호.{0,10}지우/, a: '📖 컨번호를 잘못 넣었을 때\n선적에서 다른 컨이 왔으면 큰 카드의 [컨테이너 번호 수정 (다른 컨이 옴)]으로 실제 컨 번호로 바꿔요. 이미 완료를 눌렀으면 [선적확인 취소]/[양하확인 취소]로 되돌린 뒤 맞는 컨을 확인해요. 초과 컨으로 잘못 넣은 건 초과 목록에서 지워요(지우면 되돌아오지 않아요).' },
  { id: 'app_nodata', ask: false, p: /(?:오늘\s*)?배\s*자료가?\s*안\s*(?:떠|보)|자료가?\s*안\s*떠/, a: '📖 배 자료가 안 뜰 때\n대개 셋 중 하나예요. ① 아직 자료(EDI·리스트)가 안 왔다 — 홈 상세에 «자료 대기» 로 보여요. ② 옛 판이다 — 위쪽 «🆕 새 버전 출시» 의 [업데이트]. ③ 수집기가 멈췄다 — 홈 맨 위 상태 띠 «● 수집기 N분 전» 이 오래됐으면 수석에게 알려요.' },
  { id: 'app_stale', p: /(?:옛날|예전)\s*숫자|캐시|집계가.{0,10}그대로/, a: '📖 자료를 올렸는데 숫자가 그대로일 때\n자료 반영은 서버에 저장되는 즉시 모두에게 가요. 그대로라면 옛 판이거나(🆕 업데이트), 같은 자료(수정본이 아닌 같은 파일)였거나, 수정본이 리스트가 아닌 다른 칸만 바꾼 경우예요. 새로고침(오프라인 아닐 때) 뒤에도 그대로면 [❌ 오답]이나 수석에게 알려요.' },
  { id: 'app_search_miss', p: /검색했는데.{0,16}(?:없음|결과\s*없)|결과\s*없음.{0,16}리스트엔/, a: '📖 끝 4자리 검색이 «없음» 인데 리스트엔 있을 때\n① 다른 배·다른 항차 컨일 수 있어요(통합 검색·미르는 모든 항차를 찾아요). ② 캔슬된 쪽 컨은 검색에서 빠져요. ③ 이미 완료한 컨은 «다른 작업·완료·통과분에 N건 — 보기» 아래에 있어요. ④ 옛 판이면 업데이트. 그래도 없으면 [❌ 오답]으로 남겨 주세요 — 그 질문이 통째로 기록돼 고쳐요.' },
  { id: 'app_4digit', p: /(?:4|네)\s*자리만.{0,16}(?:넣|치|되)/, a: '📖 끝 4자리 검색\n맞아요 — 끝 4자리만 치면 돼요. 같은 끝 4자리가 둘이면 둘 다 보여 주고, 끝 3자리면 그 끝자리 컨 전부를 보여 줘요. 컨번호 조회만은 평택분이 아니어도(통과화물) 찾아 줘요.' },
  { id: 'app_wrong', p: /(?:틀린|틀리게).{0,16}(?:답|말)|오답/, a: '📖 미르가 틀린 답을 했을 때\n답 카드 오른쪽 위 [❌ 오답]을 누르면 그 질문과 답이 통째로 남아 고쳐져요(회신은 보조기능 «오답노트»). 아예 못 알아들으면 [📌 이 질문을 기록]. 대수 근거가 궁금하면 «리퍼 위치» 처럼 목록으로 다시 물어 보세요.' },
  { id: 'app_askmir', p: /검수봇|미르.{0,10}(?:어떻게\s*물어|잘\s*알아)|끝자리만\s*써도/, a: '📖 미르에게 묻는 법\n끝 4자리만 써도 돼요 — «4777 어디» «4777 실번호». 대수는 «양하 20피트 풀 몇 대», 특수화물은 «리퍼 위치» «위험물 클래스 3», 진행은 «몇 시에 끝나» «남은 거 몇 대» 처럼 짧게 물어요. 검색줄 마이크를 누르고 «미르야» 하면 미르가 나와 일상 대화와 설명도 해요.' },
  { id: 'app_samediff', p: /어제랑\s*답이?\s*달라|같은\s*질문.{0,10}달라/, a: '📖 같은 질문에 어제와 답이 다를 때\n그 사이 자료가 바뀌었을 수 있어요 — 완료가 늘었거나, 수정본·캔슬 리스트가 왔거나, 시프팅이 확정됐거나. 지금 자료로 낸 오늘 답이 기준이에요. 자료가 안 바뀌었는데 답이 다르면 [❌ 오답]으로 남겨 주세요.' },
  { id: 'app_cone', p: /콘앱.{0,16}(?:따로|깔|설치|검수앱\s*안)/, a: '📖 콘앱\n콘앱(ConeOne)은 검수앱과 다른 앱이라 따로 열어요(주소 끝이 /cone.html). 검수앱과 같은 EDI를 읽고 같은 미르가 답해요. 설치는 콘앱 안의 설치 QR로 해요.' },
  { id: 'app_buttons', p: /(?:화면\s*위|위에).{0,10}버튼|아이콘만/, a: '📖 화면 위 버튼\n맨 위 오른쪽부터 — [⋮] 메뉴(화면·소리·글자, 데미지 예약, 사용 매뉴얼), 그 왼쪽 [이름](작업자 바꾸기), 🚚 트럭(내 장비·호기 고르기). 항차 화면 탭은 [양하]/[선적]/[🚀 작업 시작]/[베이]/[출력]/[업로드]. 사용 매뉴얼은 헤더 ⋮ → 사용 매뉴얼에 그림과 함께 있어요.' },
  { id: 'app_baycolor', p: /20\s*40\s*색|색\s*구분.{0,10}(?:왜|안)/, a: '📖 베이 그림에서 20·40 구분\n베이 그림은 20·40을 색이 아니라 자리로 갈라요 — 40피트는 짝수 베이 한 덩어리(두 칸에 걸친 칸), 20피트는 홀수 칸이에요. 칸 바탕색은 선적 플랜에서는 목적지, 양하에서는 상태(완료 진한 초록 등)예요. 칸을 누르면 규격(20DC·40HC)이 떠요.' },
  { id: 'app_done_where', p: /(?:작업\s*)?완료\s*처리.{0,10}어디|실적\s*입력\s*화면/, a: '📖 완료 처리(실적 입력)\n항차 화면 [🚀 작업 시작] 탭에서 [🤖 자동 가이드]를 켜면 다음 컨이 카드로 나오고 [양하확인]/[선적확인]을 누르면 돼요(수동은 베이·데크/홀드를 고른 뒤 컨을 직접 조회). 끝 4자리로 찾은 큰 카드에서도 바로 확인을 누를 수 있어요. 배 전체 완료는 홈 그 배 상세의 [⬇ 양하 완료]/[⬆ 선적 완료].' },

  // ── 지난 항차·일정 ───────────────────────────────────────────────
  { id: 'past_voy', data: true, cn: true, p: /지난\s*(?:번|항차).{0,24}(?:실렸|특이|비교|기록)|지난번\s*입항/, a: '📖 지난 항차 자료\n지난 항차는 보관소(완료 저장한 항차)에 있어요. 미르는 지금 열린 항차 자료로 답하고, 지난 날 완료 기록은 «어제 양하 몇 대» 처럼 날짜로 물으면 답해요. 지난 항차와의 대수 비교나 특이사항은 보조기능 → 보관소에서 그 항차를 열어 보거나 수석에게 확인해요.', ask: false },
  { id: 'next_ship', p: /다음\s*배.{0,16}(?:언제|자료)|같은\s*선사\s*다음/, a: '📖 다음 배 일정\n홈 배 목록의 «📅 오늘·내일·날짜» 묶음에 들어올 배와 자료 상태(자료 대기·리스트 도착)가 보여요. 배 이름을 붙여 «XXXX 입항 언제» 로 물으면 도선 예보·PORT-MIS 시각으로 답해요.', ask: false },
  { id: 'next_port', p: /다음\s*기항|다음\s*항구|어디\s*가/, a: null },   // 엔진 답(다음 항구)으로 — 아래 rewrite
];

//  원장 줄을 미리 컴파일한다(정규식은 그대로 — 위 표가 정본).
const _ROWS = FIELD_QA.filter((r) => r && r.p);

/** 평택 다음 기항 — 평택을 떠날 때 배에 남는 화물(선적 행 POD, 없으면 평택 아닌 양하 행 POD)의 최다 항.
 *  utils.nextPortAfterPtk 의 «화물» 판정과 같은 문턱(1등이 2등의 1.5배 이상이면 단정). 원문 EDI 를 다시 읽지 않는다(콘앱에 없다 — 두 앱 같은 답). */
export function nextPortFromRows(cs, ship, nameOf) {
  const isPtk = (p) => /^KRP(?:TK|YT)/i.test(S(p));
  const cnt = {};
  let rows = (cs || []).filter((c) => c && c._mode === 'loading' && c.pod && !isPtk(c.pod));
  if (!rows.length) rows = (cs || []).filter((c) => c && c._mode !== 'loading' && c.pod && !isPtk(c.pod));
  rows.forEach((c) => { const k = S(c.pod).toUpperCase(); cnt[k] = (cnt[k] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const nm = (k) => (k ? `${k}${nameOf && nameOf(k) ? ' ' + nameOf(k) : ''}` : '');
  if (!top.length) return `${ship || '이 배'} — 평택 다음 기항을 정할 화물 자료(선적 EDI)가 아직 없어요.`;
  const [p1, n1] = top[0]; const [p2, n2] = top[1] || ['', 0];
  if (!p2 || n1 >= n2 * 1.5) return `🧭 ${ship || '이 배'} 평택 다음 기항 — ${nm(p1)} (배에 남는 화물 ${n1}대가 가장 많은 항)${p2 ? ` · 다음으로 많은 항 ${nm(p2)} ${n2}대` : ''}`;
  return `🧭 ${ship || '이 배'} 평택 다음 기항 — 화물로는 단정하기 어려워요: ${nm(p1)} ${n1}대 · ${nm(p2)} ${n2}대. PORT-MIS 차항지나 선사 로테이션으로 확인해 주세요.`;
}

//  배 코드(네 글자 — NSFR·DJCF)를 가린 말 — «NSFR 엑스레이 대상 위치» 의 FR 을 플랫랙으로 읽지 않게(5.27 연막 smoke_mirfab 회귀). 컨번호(글자+숫자)·쓰는 영어 낱말은 그대로.
const KEEP4 = /^(?:MAEU|OOCL|XRAY|LAND|OVER|FLAT|OPEN|RACK|CELL|DOOR|TIER|BULK|CONE|SEAL|HIGH|CUBE|REEF|TANK|EDIS)$/i;
export const maskShipCodes = (s) => S(s).replace(/(?<![A-Za-z0-9])[A-Za-z]{4}(?![A-Za-z0-9])/g, (w) => (KEEP4.test(w) ? w : '□□□□'));

/** 묻는 말이면 원장 답 — 없으면 null. know(q) 는 mirKnowledge(같은 원장 한 벌) */
export function fieldAnswer(q0, know, opts = null) {
  const q = S(q0).trim();
  if (q.length < 3) return null;
  const _meanAsk = /뜻|의미|이란\b|란\s*(?:뭐|무엇)/.test(q);   // ★ 5.28-05: «베이 로우 티어 뜻을 그림이랑 같이 보여줘» — «보여줘» 가 있어도 뜻을 묻는 말이다(양하 318대 목록을 내놓았다)
  const isAsk = ASK.test(q) || _meanAsk;
  const isData = DATA_ASK.test(q) && !_meanAsk;
  //  컨 한 대를 가리킨 말(끝 4자리·11자리)은 조회다 — 원장이 가로채지 않는다(«6278 무게 VGM이랑 리스트 무게 같아» 는 그 컨의 무게).
  //  def — 뜻풀이 줄은 «있어?·위치·목록» 처럼 컨을 찾는 말에는 물러난다(«OOG 있어요?» 는 목록, «OOG 가 뭐예요» 는 뜻 — 감사 2026-11-27)
  const listAsk = /있어|있나|위치|어디\s*있|목록|몇\s*대/.test(q) && !/뭐|뜻|란\b|이란|같은\s*말|차이|약자|읽는|어떻게|왜|기준|맞나|맞아|맞죠/.test(q);
  const cnRef = /(?<![0-9-])\d{4}(?![0-9])|[A-Z]{4}\s*\d{6,7}/i.test(q) && !/UN\s*\d{4}|\d{4}\s*년/i.test(q);
  const qm = maskShipCodes(q);
  for (const r of _ROWS) {
    if (!r.p.test(qm)) continue;
    if (cnRef && !r.cn) continue;
    if (r.def && listAsk) continue;
    if (r.noCone && opts && opts.coneTable) continue;
    if (r.a === null && !r.kq) return null;   // 묶음 답·엔진 몫 자리 — 원장은 받지 않는다
    if (isData && !r.data) continue;
    if (r.ask !== false && !isAsk) continue;
    //  preferKnow — 원장 현장 대처(mirKnowledge SPECIAL·SITUATIONS: 손상·씰·물 샘)가 이미 답하는 말은 그 답이 먼저다(회귀 R9 — 단독 대처 문장이 복합문 답과 같아야 한다).
    if (r.preferKnow && know) { let k0 = null; try { k0 = know(q); } catch (e) { console.warn('[미르 현장 문답] 원장 확인 실패:', e); k0 = null; } if (k0 && !/^📖/.test(k0)) return { id: r.id + '_know', a: k0 }; }
    if (r.kq) {
      let k = null; try { k = know ? know(r.kq) : null; } catch (e) { console.warn('[미르 현장 문답] 원장 부르기 실패:', e); k = null; }
      if (k) return { id: r.id, a: r.add ? k + '\n' + r.add : k };
      continue;
    }
    //  ★ 5.28-05 — 물음표로 두 가지를 이어 물은 말(«전원 꽂혀있는지는 검수사가 확인하는 건가요? 온도 다르면 어떻게 해요»)은 뒷말의 원장 답도 붙인다.
    const _tail = (q.match(/[?？]\s*(\S.{2,})$/) || [])[1];
    if (_tail && !(opts && opts._tailOnly)) {
      const _subj = (q.slice(0, q.length - _tail.length).match(/리퍼|냉동|위험물|DG|씰|실번호|OOG|FR|OT|콘|트윈|X-?RAY|엑스레이/gi) || []).filter((w) => !_tail.includes(w)).slice(0, 2).join(' ');
      let t2 = null; try { t2 = fieldAnswer((_subj ? _subj + ' ' : '') + _tail, know, { ...(opts || {}), _tailOnly: true }); } catch (e) { console.warn('[미르 현장 문답] 뒷말 답 실패:', e); t2 = null; }
      if (t2 && t2.id !== r.id && t2.a) return { id: r.id + '+' + t2.id, a: r.a + '\n\n' + t2.a };
    }
    return { id: r.id, a: r.a };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 묶음 답 — 여러 갈래 대수를 한 장으로. 숫자는 엔진 단일 답(ask)을 갈래마다 다시 불러 읽는다(판정 한 벌).
// ═══════════════════════════════════════════════════════════════════════
const NUM_RE = /(?:총\s*)?(\d+)\s*대/;
function _n(ans) {
  const m = S(ans).match(NUM_RE);
  if (m) return Number(m[1]);
  if (/없음|없어요/.test(S(ans))) return 0;
  return null;
}
function _modesOf(q) {
  const d = /양하|하역|내리|양하분/.test(q), l = /선적|적하|싣|실을|선적분/.test(q);
  if (d && !l) return ['양하'];
  if (l && !d) return ['선적'];
  return ['양하', '선적'];
}
//  끝 4자리 — 항차 번호(2041E)·연도(2026년·2026-)는 컨 끝 4자리가 아니다(감사 2026-11-27 «TMPZ 2041E 양하 20피트 풀 엠티» 가 «끝네자리 2041 없음» 으로 갔다)
function d4of(q) { const m = S(q).match(/(?<![\dA-Za-z-])(\d{4})(?![\d]|[EWNSewns](?![가-힣A-Za-z])|\s*년|-)/); return m ? m[1] : null; }
const QUAL = /남은|남았|잔여|완료|했어|했나|끝난|끝낸/;
const SPLIT_RE = /따로|나눠|나누어|각각|구분|별로|씩|이랑|하고|랑|그리고|,/;

//  ── 5.28 건의 1차 — 없는 배 이름 · 대수 답 근거 줄 · 보고 대상 알림(answerOneRaw 감싸기가 부른다)
function _knownShipText(ctx) {
  const out = [];
  const add = (x) => { const t = S(x).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (t.length >= 3) out.push(t); };
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 3) return; for (const k of Object.keys(o)) { const x = o[k]; if (typeof x === 'string') { if (/vsl|ship|name|vessel/i.test(k)) add(x); } else if (x && typeof x === 'object') { if (d < 3 && /^[A-Z0-9]{3,8}(?:_|$)/.test(k)) add(k.split('_')[0]); walk(x, d + 1); } } };
  try { walk(ctx && ctx.voyages, 0); walk(ctx && ctx.info, 2); walk(ctx && ctx.voyage && ctx.voyage.info, 2); walk(ctx && ctx.pilotForecast, 0); walk(ctx && ctx.portMisData, 0); walk(ctx && ctx.shipLib, 1); } catch (e) { console.warn('[미르] 배 이름 모으기 실패:', e); }
  try { (knownShipCodes(ctx && ctx.voyages, ctx && ctx.shipLib) || []).forEach(add); } catch (e) { /* 코드 목록이 없으면 이름만 본다 */ }
  return out;
}
/** 질문에 든 영문 배 이름(«MV HANA STAR» · «HANA STAR» — 3글자 넘는 낱말 둘 이상)이 앱 자료 어디에도 없으면 «자료 없음» 답. 아니면 null. */
export function unknownShipAnswer(q0, ctx) {
  const q = S(q0);
  //  배를 가리킨 표기가 있을 때만 — «MV HANA STAR» · «M/V …» · «HANA STAR호». 영문 두 낱말만으로는 판정하지 않는다(선사·항구·품명·인사말을 가로챘다 — 감사 2026-11-27).
  const m1 = q.match(/(?:^|\s)(?:MV|M\/V|M\.V\.)\s+([A-Za-z][A-Za-z0-9.\- ]{2,40}?)(?=\s*(?:[가-힣?？!,.]|$))/i) || q.match(/(?:^|\s)([A-Za-z][A-Za-z.\-]{2,}(?:\s+[A-Za-z][A-Za-z.\-]{1,}){0,3})\s*호(?=\s|$|[는가의을를에도])/);
  let name = m1 ? m1[1].trim() : '';
  if (!name) return null;
  name = name.replace(/\s+\d{2,5}[A-Z]?$/i, '').trim();   // 뒤에 붙은 항차 번호(0247W)는 이름이 아니다
  if (!name) return null;
  const key = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (key.length < 5) return null;
  const known = _knownShipText(ctx);
  if (!known.length) return null;   // 비교할 자료가 없으면 판정하지 않는다(콘앱 미로그인 등)
  if (known.some((k) => k === key || (k.length >= 5 && (k.includes(key) || key.includes(k))))) return null;
  const inf = (ctx && (ctx.info || (ctx.voyage && ctx.voyage.info))) || null;
  const cur = inf ? [S(inf.vsl), S(inf.vslFull), S(inf.voy_d || inf.voy)].filter(Boolean).join(' ') : '';
  return `🚢 «${name.toUpperCase()}» 는 자료에 없는 배예요 — 항차 목록·선석배정·도선 예보에 이 이름이 없어요.`
    + (cur ? `\n지금 열린 배는 ${cur} 예요 — 이 배를 물으신 거면 배 이름 없이 다시 물어 주세요.` : '\n오늘 배는 배 이름(코드)으로 다시 물어 주세요.');
}
const _kst = (ms) => { const n = Number(ms); if (!isFinite(n) || n <= 0) return ''; const d = new Date(n + 9 * 3600e3); return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
/** 대수 답 근거 한 줄 — 모드마다 EDI 받은(올린) 시각과 리스트 파일 이름(5.28 건의 19·18) */
export function basisLineOf(v, modes = null) {
  if (!v || typeof v !== 'object') return '';
  const P = [];
  for (const md of (modes && modes.length ? modes : ['discharge', 'loading'])) {
    const d = v[md]; if (!d) continue;
    const e = (d.raw && d.raw.edi) || null;
    const at = e ? (e.recvAt ? `${_kst(e.recvAt)} 받음` : (e.uploadedAt ? `${_kst(e.uploadedAt)} 올림` : '')) : '';
    const src = [...new Set(_vals(d.records).map((r) => S(r._source)).filter(Boolean))];
    if (!at && !src.length) continue;
    P.push(`${md === 'loading' ? '선적' : '양하'}${at ? ` EDI ${at}` : ''}${src.length ? ` · 리스트 ${src[0]}${src.length > 1 ? ` 외 ${src.length - 1}` : ''}` : ''}`);
  }
  return P.length ? `🗂 근거 — ${P.join(' / ')}` : '';
}
const SEAL_CUT_RE = /(?:실|씰|봉인)\s*(?:이|가|은|도)?\s*(?:끊|잘[렸려린라]|떨어져|파손)/;
const DMG_RE = /데미지|파손|찌그러|구멍|찢어|깨[졌져]/;
/** 답 뒤에 붙이는 것 — ① 📊 대수 답 근거 줄 ② 컨 한 대 답 + 실 끊김·데미지 말이면 수석 보고 알림과 보고 문장(검수사 확정 2026-11-27) */
export function mirAfterAnswer(q0, a, ctx) {
  if (typeof a !== 'string' || !a) return a;
  const q = S(q0); const t = a.trim(); let out = a;
  const v = ctx && (ctx.voyage || (ctx.shipCtx && ctx.shipCtx.v)) || null;   // 홈·떠 있는 미르가 질문 속 배를 고른 경로(shipCtx)도
  if (v && /^📊/.test(t) && !/^📊[^\n]*:\s*0\s*대\s*$/.test(t.split('\n')[0]) && /\d+\s*대/.test(t) && !/🗂 근거/.test(t)) {
    const h0 = t.split('\n')[0]; const ms = [/양하/.test(h0) ? 'discharge' : null, /선적|적하/.test(h0) ? 'loading' : null].filter(Boolean);   // 답이 한 모드면 그 모드 근거만
    const b = basisLineOf(v, ms); if (b) out += `\n${b}`;
  }
  const cnAll = [...new Set(t.match(/\b[A-Z]{4}\d{7}\b/g) || [])];
  const cn = cnAll.length === 1 ? cnAll[0] : '';   // 한 대로 좁혀졌을 때만(끝 4자리 겹침 두 대면 붙이지 않는다)
  const REPORT_NOT = /있어\s*\??$|있나|있었|었나|적\s*있|하면|으면|기면|되면|어떻게|뭐|뜻|기준|목록|몇|\?\s*$|？/;   // 물음·가정·과거 확인은 보고가 아니다
  if (cn && /(?<![0-9-])\d{4}(?![0-9])|[A-Z]{4}\s*\d{6}/i.test(q) && !REPORT_NOT.test(q) && !/📣/.test(out)) {
    const pos = (t.match(/\b(\d{2}-\d{2}-\d{2})\b/) || [])[1] || '';
    const md = /선적/.test(t.split('\n')[0]) ? '선적' : '양하';
    const inf = (v && v.info) || (ctx && (ctx.info || (ctx.shipCtx && ctx.shipCtx.info))) || {};
    const head = [S(inf.vsl), S(md === '선적' ? (inf.voy_l || inf.voy) : (inf.voy_d || inf.voy))].filter(Boolean).join(' ');
    const where = `${head ? head + ' ' : ''}${md}, ${cn}${pos ? `, ${pos}` : ''}`;
    if (SEAL_CUT_RE.test(q)) out += `\n📣 수석에게 보고할 일이에요 — 보고 문장: «${where}, 실 끊김 — 사진 3장(컨번호·끊긴 씰·리씰한 씰) 찍고 리씰 후 카톡 전송 보고»`;
    else if (DMG_RE.test(q)) out += `\n📣 수석에게 보고할 일이에요 — 보고 문장: «${where}, 데미지 — 손상 부위 사진 찍고 📷 데미지 보고로 카톡 전송 보고»`;
  }
  return out;
}

//  ── 5.28 건의 1차 보조 — 체크디지트 계산 과정 한 줄(ISO 6346 — utils.isoCheckDigit 과 같은 값표·같은 나머지)
export function cdCalcLine(cn0) {
  const cn = S(cn0).toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{4}\d{7}$/.test(cn)) return '';
  const V = {}; let n = 10;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (n % 11 === 0) n++; V[ch] = n++; }
  let sum = 0; const parts = [];
  for (let i = 0; i < 10; i++) { const ch = cn[i]; const x = /\d/.test(ch) ? Number(ch) : V[ch]; sum += x * 2 ** i; parts.push(`${ch}=${x}×${2 ** i}`); }
  const r = sum % 11;
  return `🧮 계산 — ${parts.join(' + ')} = ${sum} → 11로 나눈 나머지 ${r}${r === 10 ? '(10이면 0)' : ''} → 끝자리 ${r % 10}`;
}
const _vals = (o) => (Array.isArray(o) ? o : Object.values(o || {})).filter(Boolean);
//  평택분 규격·풀엠티·리퍼 나눔 — 지난 항차 견주기 한 벌(이번·지난 같은 펼치기 flattenVoyages 행)
function _brk(rows) {
  const o = {};
  for (const md of ['discharge', 'loading']) {
    const r = rows.filter((c) => c && c._ptk !== false && (c._mode || 'discharge') === md);
    const s20 = r.filter((c) => /^2/.test(S(c.iso))), s40 = r.filter((c) => /^[4L]/.test(S(c.iso)));
    o[md] = { n: r.length, f20: s20.filter((c) => c.fe === 'F').length, e20: s20.filter((c) => c.fe !== 'F').length, c40: s40.length, rf: r.filter((c) => c.rf && c.fe === 'F').length };
  }
  return o;
}
const PREV_RE = /(?:지난|앞|전|저번|이전)\s*(?:번\s*)?항차|지난번/;
const PREV_CMP_RE = /비교|견주|견줘|대비|늘었|줄었|차이|비해|보다|많아|많았|적어|적었|많은지|적은지/;
/** 5.28 건의 — 지난 항차 견주기 · 리퍼 온도 리스트↔EDI · 무게 차이 큰 컨. H.voy(이 항차 원본) · H.prev({voys, prevKey, prevVoy}) */
export function fieldExtraAnswer(q, qm, cs, H) {
  //  ① 지난 항차와 견주기 — 선박 통계(ships/{배}/voyages 평택 대수)와 보관 자료(앞 항차 펼치기)
  if (PREV_RE.test(qm) && PREV_CMP_RE.test(qm) && typeof H.prev === 'function') {
    const pv = H.prev();
    if (pv && pv.list && pv.list.length) {
      const cur = _brk(cs || []);
      const d = (a, b) => { const k = a - b; return k > 0 ? `+${k}` : String(k); };
      const L = [`📈 ${H.vsl || '이 배'} 지난 항차와 견주기(평택분)`];
      const p0 = pv.list[0];
      if (pv.prevRows && pv.prevRows.length) {
        const pr = _brk(pv.prevRows);
        for (const md of ['discharge', 'loading']) {
          const x = cur[md], y = pr[md]; if (!x.n && !y.n) continue;
          L.push(`${md === 'loading' ? '선적' : '양하'} 이번 ${H.voyLabel || ''} ${x.n}대 · 지난 ${p0.voy} ${y.n}대(${d(x.n, y.n)}) — 20풀 ${x.f20}/${y.f20} · 20엠티 ${x.e20}/${y.e20} · 40 ${x.c40}/${y.c40} · 리퍼 ${x.rf}/${y.rf}`);
        }
        L.push('(이번/지난 순서)');
      } else {
        for (const md of ['discharge', 'loading']) {
          const x = cur[md]; const y = md === 'loading' ? p0.lod : p0.dis; if (!x.n && !y) continue;
          L.push(`${md === 'loading' ? '선적' : '양하'} 이번 ${x.n}대 · 지난 ${p0.voy} ${y || 0}대(${d(x.n, y || 0)})`);
        }
        L.push('규격·리퍼로 나눈 견주기는 미르 비서(«미르야»)에게 물으면 보관 자료를 받아 보여 드려요.');
      }
      if (pv.list.length > 1) L.push('그 앞 항차 — ' + pv.list.slice(1, 4).map((x) => `${x.voy} 양하 ${x.dis}·선적 ${x.lod}`).join(' · '));
      return { id: 'prevCmp', a: L.join('\n') };
    }
  }
  //  ② 리퍼 설정온도 — 리스트와 EDI 가 다른 컨(1도 이상). 리퍼 판정은 utils 한 벌(isReeferContainer · 풀만) · 리퍼 체크 안 하는 배(rfSkip)는 말하지 않는다.
  if (/리퍼|냉동/.test(qm) && /온도/.test(qm) && /리스트/.test(qm) && /EDI|이디아이/i.test(qm) && /다른|다르|달라|차이|불일치|안\s*맞/.test(qm)) {
    const hasEdi = H.raw && ['discharge', 'loading'].some((md) => _vals(H.raw[md] && H.raw[md].ediContainers).length);
    if (!hasEdi) return H.app === 'cone' ? { id: 'rfTempSrc', a: '❄ 리스트와 EDI 설정온도 대조는 검수앱 미르에서 해요 — 콘앱은 EDI 원본을 받지 않아요.' } : null;
    if (H.rfSkip) return { id: 'rfTempSrc', a: '❄ 이 배는 리퍼 온도 체크를 하지 않는 배예요(검수사 확정) — 리스트·EDI 설정온도 대조를 하지 않아요.' };
    const out = []; let nAll = 0;
    for (const md of ['discharge', 'loading']) {
      const E = {}; _vals(H.raw[md] && H.raw[md].ediContainers).forEach((c) => { if (c.cn && H.isRf(c) && S(c.fe).toUpperCase() !== 'E') E[c.cn] = c; });
      nAll += Object.keys(E).length;
      _vals(H.raw[md] && H.raw[md].records).forEach((r) => { const e = E[r.cn]; if (!e) return; const a1 = parseFloat(r.tmp), a2 = parseFloat(e.tmp); if (isFinite(a1) && isFinite(a2) && Math.abs(a1 - a2) >= 1) out.push(`${r.cn} (${md === 'loading' ? '선적' : '양하'}) 리스트 ${r.tmp}°C · EDI ${e.tmp}°C`); });
    }
    if (!nAll) return { id: 'rfTempSrc', a: '❄ 이 항차 EDI 에 풀 리퍼가 없어요 — 대조할 설정온도가 없어요.' };
    return { id: 'rfTempSrc', a: out.length ? `❄ 리스트와 EDI 설정온도가 1도 넘게 다른 풀 리퍼 ${out.length}대\n` + out.slice(0, 30).join('\n') + '\n실물 설정을 사진으로 남기고 수석에게 보고해요.'
      : `❄ 리스트와 EDI 설정온도가 다른 리퍼 없어요 — 풀 리퍼 ${nAll}대 대조(1도 이상 차이 기준).` };
  }
  //  ③ 무게 차이 큰 컨(물을 때만 — 1.23 의 경고 삭제는 그대로). 재료는 펼친 행 한 벌(flattenVoyages — 리스트 무게 wt 는 40톤 문지기 plausibleListWtKg, EDI 총중량 wtEdi)
  //    · 리스트와 EDI 둘 다 있는 컨(_src both)만 · 평택분(_ptk). EDI 에는 컨 자체 무게가 들어가므로 규격마다 차이의 중앙값을 빼고 1톤 넘게 벗어난(그리고 실제 차이도 1톤 이상) 컨만.
  if (/무게|중량|VGM/i.test(qm) && /차이|다른|다르|달라|안\s*맞|벗어/.test(qm) && /컨|목록|뽑|리스트|있어|몇|보여|알려/.test(qm) && !/(?<![0-9-])\d{4}(?![0-9])|[A-Z]{4}\s*\d{6}/i.test(q)) {
    const rows = (cs || []).filter((c) => c && c._ptk !== false && c._src === 'both' && Number(c.wt) > 0 && Number(c.wtEdi) > 0);
    if (!rows.length) return H.app === 'cone' ? { id: 'wtDiff', a: '⚖ 리스트·EDI 무게 대조는 검수앱 미르에서 해요 — 콘앱은 EDI 무게를 받지 않아요.' } : { id: 'wtDiff', a: '⚖ 리스트와 EDI 무게가 둘 다 있는 평택분 컨이 없어 대조할 수 없어요.' };
    const L = []; let total = 0;
    for (const md of ['discharge', 'loading']) {
      const by = {};
      rows.filter((c) => (c._mode || 'discharge') === md).forEach((c) => { const t1 = Number(c.wt) / 1000, t2 = Number(c.wtEdi) / 1000; const k = /^[4L]/.test(S(c.iso)) ? '40' : '20'; (by[k] = by[k] || []).push({ cn: c.cn, t1, t2, d: t2 - t1 }); });
      for (const k of Object.keys(by)) {
        const arr = by[k].map((x) => x.d).sort((x, y) => x - y); const med = arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
        const odd = by[k].filter((x) => Math.abs(x.d - med) >= 1 && Math.abs(x.d) >= 1);   // 리스트가 총중량을 적은 컨(차이 0)은 뺀다
        if (!odd.length) continue;
        total += odd.length;
        L.push(`${md === 'loading' ? '선적' : '양하'} ${k}피트 — 자체 무게(차이 중앙값) ${med.toFixed(1)}t 를 빼고 1톤 넘게 벗어난 ${odd.length}대`);
        odd.sort((x, y) => Math.abs(y.d - med) - Math.abs(x.d - med)).slice(0, 20).forEach((x) => L.push(`  ${x.cn} 리스트 ${x.t1.toFixed(1)}t · EDI ${x.t2.toFixed(1)}t`));
      }
    }
    return { id: 'wtDiff', a: total ? `⚖ 무게 차이 큰 컨 ${total}대(물으실 때만 보여 드려요)\n` + L.join('\n') + '\n리스트가 화물 무게만 적는 선사가 있어 자체 무게만큼은 늘 차이 나요 — 그만큼을 빼고 남은 차이만 골랐어요.'
      : '⚖ 리스트와 EDI(VGM) 무게가 자체 무게만큼 넘게 다른 컨은 없어요.' };
  }
  return null;
}

/** cs — 미르 컨 행(평택분 표식 _ptk·_mode), helpers = { ask(q)→답 글, isoCheckDigit, isoFixLastDigit, isoToLabel, portName(code) } */
export function fieldSplitAnswer(q0, cs, H) {
  const q = S(q0).trim();
  if (!q || !H || typeof H.ask !== 'function') return null;
  const qm = maskShipCodes(q);
  const ask = (s) => { try { return H.ask(s); } catch (e) { console.warn('[미르 묶음 답] 갈래 답 실패:', s, e); return null; } };
  const ptk = (cs || []).filter((c) => c && c._ptk !== false);
  const byMode = (m) => ptk.filter((c) => (m === '선적' ? c._mode === 'loading' : c._mode !== 'loading'));

  //  ⓪-0a 리스트에 없는 컨이 내려왔다 + 컨번호 — 그 번호를 찾아보고(다른 배·통과·오타) 초과 처리 절차를 함께
  {
    const mcn = q.toUpperCase().match(/[A-Z]{4}\s*\d{6}\s*\d/);
    if (mcn && /리스트에\s*없|리스트엔\s*없/.test(qm) && /내려|나왔|왔어|어떡|어떻게/.test(qm)) {
      const cn = mcn[0].replace(/\s/g, '');
      const a = ask(cn + ' 어디');
      const row = FIELD_QA.find((r) => r.id === 'notinlist');
      return { id: 'notInListCn', a: (a ? a + '\n\n' : '') + (row ? row.a : '') };
    }
  }
  //  ⓪-0b 끝 4자리 + POD·선사·무게 — 엔진 조회 답이 이 칸들을 늘 말하지는 않는다(«1548 POD 어디로» 가 «부산행 없음» 으로 갔다)
  {
    const _full0 = q.toUpperCase().match(/[A-Z]{4}\s*\d{6}\s*\d/);
    const _d = d4of(q);
    const m4 = _d ? [null, _d] : (_full0 ? [null, _full0[0].replace(/\s/g, '').slice(-4)] : null);
    const wantPod = /POD|목적지|양하항|어디로\s*(?:찍|돼|되|가)|경유/i.test(qm), wantPol = /POL|선적항|출발항/i.test(qm), wantOp = /선사|오퍼레이터|operator/i.test(qm), wantWt = /무게|중량|VGM|톤/i.test(qm);
    if (m4 && (wantPod || wantPol || wantOp || wantWt) && !/몇\s*대|몇대/.test(qm)) {
      const full = q.toUpperCase().match(/[A-Z]{4}\s*\d{6}\s*\d/);
      const hit = (cs || []).filter((c) => c && c.cn && (full ? String(c.cn).toUpperCase() === full[0].replace(/\s/g, '') : String(c.cn).slice(-4) === m4[1]));
      //  ★ 5.28-05 — 없는 번호면 «부산행 끝네자리 8846 없음» 처럼 물은 낱말을 거르기 조건으로 붙이지 않고 번호만 없다고 한다(2026-11-27 클로드2 시험).
      if (!hit.length && !/접두어|두\s*개|둘\s*다|여러/.test(qm)) return { id: 'cnAttrNone', a: `${full ? full[0].replace(/\s/g, '') : '끝네자리 ' + m4[1]} — 이 항차 자료(EDI·리스트)에 없어요. 번호를 다시 봐 주세요.` };
      if (hit.length) {
        const nm = (k) => { const c0 = S(k).toUpperCase(); return c0 ? `${c0}${H.portName && H.portName(c0) ? ' ' + H.portName(c0) : ''}` : '없음'; };
        const kg = (w) => (Number(w) > 0 ? Number(w).toLocaleString('en-US') + 'kg' : '');
        return { id: 'cnAttr2', a: hit.map((c) => {
          const L = [`${c.cn} · ${S(H.isoToLabel ? H.isoToLabel(c.iso) : c.iso)} ${c.fe === 'E' ? '엠티' : '풀'} · ${c._mode === 'loading' ? '선적' : '양하'} · ${[c.bay, c.row, c.tier].filter(Boolean).join('-') || '자리 없음'}${c._ptk === false ? ' · 통과화물' : ''}`];
          if (wantPod || wantPol) L.push(`POL ${nm(c.pol)} → POD ${nm(c.pod)}${c.fpod && S(c.fpod).toUpperCase() !== S(c.pod).toUpperCase() ? ` · 최종 ${nm(c.fpod)}` : ''}${/부산|KRPUS/i.test(qm) ? (/KRPUS/i.test(S(c.pod) + S(c.fpod)) ? ' — 부산행이에요' : ' — 부산은 거치지 않아요(자료 기준)') : ''}`);
          if (wantOp) L.push(`선사 ${S(c.op) || '미상'}`);
          if (wantWt) { const a1 = kg(c.wt), a2 = kg(c.wtEdi); L.push(a1 && a2 ? `무게 — 리스트 ${a1} · EDI(VGM) ${a2}${Number(c.wt) === Number(c.wtEdi) ? ' — 같아요' : ' — 달라요'}` : `무게 ${a1 || a2 || '자료 없음'}`); }
          return L.join('\n');
        }).join('\n\n') };
      }
    }
  }
  //  ⓪-0 띄어 쓴 컨번호 — «BOMU 220627 8» · «MSKU 482913 7» 를 붙여 다시 묻는다(검산 물음은 아래 ① 이 받는다)
  {
    const m = q.match(/\b([A-Za-z]{4})\s+(\d{6})\s*(\d)\b|\b([A-Za-z]{4})\s+(\d{7})\b/);
    if (m && !/맞는|맞아|맞나|검산|체크\s*디지트|체크디짓/.test(qm)) {
      const cn = (m[1] ? m[1] + m[2] + m[3] : m[4] + m[5]).toUpperCase();
      const a = ask(q.replace(m[0], cn));
      if (a) return { id: 'cnJoin', a };
    }
  }
  //  ⓪-0c 끝 4자리가 같은 컨 둘 — «7590 으로 조회하면 두개가 나오는데 어떤게 맞는건지»
  {
    const _d4 = d4of(q); const m4 = _d4 ? [null, _d4] : null;
    if (m4 && /두\s*개|둘/.test(qm) && /어떤|어느|어떻게|맞는|접두어|앞/.test(qm)) {
      const hit = (cs || []).filter((c) => c && c.cn && String(c.cn).slice(-4) === m4[1]);
      const tip = '끝 4자리가 같으면 앞 영문 4글자(선사·소유자 코드)와 실번호·선내 자리로 가려요 — 눈앞 컨 문짝의 앞글자와 실번호를 카드와 맞춰 보세요. 완료할 때는 큰 카드의 번호 전체를 한 번 더 봐요.';
      if (hit.length >= 2) return { id: 'dup4', a: `🔎 끝 4자리 ${m4[1]} — ${hit.length}대\n` + hit.map((c) => `  ${c.cn} (앞글자 ${S(c.cn).slice(0, 4)}) · ${S(H.isoToLabel ? H.isoToLabel(c.iso) : c.iso)} ${c.fe === 'E' ? '엠티' : '풀'} · ${c._mode === 'loading' ? '선적' : '양하'} · ${[c.bay, c.row, c.tier].filter(Boolean).join('-')}${c._comp ? ' · 완료' : ''}`).join('\n') + '\n' + tip };
      if (!hit.length) return { id: 'dup4', a: `끝 4자리 ${m4[1]} 컨은 이 항차에 없어요.\n` + tip };
    }
  }
  //  ⓪-1 끝 4자리 + 풀/엠티·규격 — «끝번호 2297 풀이에요 엠티에요» · «SEGU 6610 이거 하이큐브 맞아요» (엔진 조회 답이 규격·풀엠티를 한 줄로 말한다)
  {
    const _d4 = d4of(q); const m4 = _d4 ? [null, _d4] : null;
    if (m4 && !/(?<!\d)\d{6}(?!\d)/.test(qm) && /풀|엠티|20\s*피트|40\s*피트|하이\s*큐브|HC|규격|몇\s*피트/i.test(qm) && !/몇\s*대|몇대/.test(qm)) {
      const hit = (cs || []).filter((c) => c && c.cn && String(c.cn).slice(-4) === m4[1]);
      if (hit.length) { const a = ask(m4[1]); if (a) return { id: 'cnAttr', a }; }
      else return { id: 'cnAttr', a: `끝네자리 ${m4[1]} — 이 항차에 없어요(통과화물까지 찾아봤어요). 다른 배 컨이면 배 이름을 붙여 물어 주세요.` };
    }
  }
  //  ⓪-2 위치 6자리 — «260486 누구 컨이야» = 26번 베이 04로우 86단에 있는 컨
  {
    const m6 = q.match(/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/);
    if (m6 && /누구|무슨|뭐|어떤|있는|자리/.test(qm) && !/읽|어떻게|뜻/.test(qm) && !new RegExp(SL, 'i').test(qm)) {
      const n2 = (x) => String(Number(x)).padStart(2, '0');
      const hit = (cs || []).filter((c) => c && n2(c.bay) === m6[1] && n2(c.row) === m6[2] && n2(c.tier) === m6[3]);
      const pos = `${m6[1]}-${m6[2]}-${m6[3]}`;
      if (!hit.length) return { id: 'posLookup', a: `📍 ${pos}(${Number(m6[1])}번 베이 ${m6[2]}로우 ${m6[3]}단)에 있는 컨이 이 항차 자료에 없어요 — 빈 칸이거나 다른 배 자리예요.` };
      return { id: 'posLookup', a: `📍 ${pos}(${Number(m6[1])}번 베이 ${m6[2]}로우 ${m6[3]}단)\n` + hit.map((c) => `  ${c.cn} · ${S(H.isoToLabel ? H.isoToLabel(c.iso) : c.iso)} ${c.fe === 'E' ? '엠티' : '풀'} · ${c._mode === 'loading' ? '선적' : '양하'} · 선사 ${S(c.op) || '미상'}${c._ptk === false ? ' · 통과' : ''}`).join('\n') };
    }
  }
  //  ⓪-3 선사별 — «선적 20풀 중에 HMM 거 몇 대» · «엠티 선적 중에 SOC는 몇 대»
  {
    const ops = new Set((cs || []).map((c) => S(c && c.op).toUpperCase()).filter(Boolean));
    const KNOWN_OPS = /^(?:HMM|MSC|ONE|CMA|CMD|COS|COSCO|EMC|EVG|YML|HPL|HLC|SKR|SNK|KMD|KMT|CKL|DYS|DWS|WDF|TJM|MAS|PCS|SIF|MSK|MAE|MAEU|OOL|OOCL|ZIM|PIL|WHL|SML|NOL|APL|ANL|CNC|EAS|SIT|TSL|KKC|HAS|DSL|CSC|SOC)$/;
    const tok = [...q.toUpperCase().matchAll(/\b([A-Z]{2,5})\b/g)].map((m) => m[1]).find((t) => ops.has(t) || KNOWN_OPS.test(t));
    if (tok && /몇|대수|거|선사/.test(qm) && !QUAL.test(qm) && !/리퍼|냉동|위험물|DG|X-?RAY|갑판|데크|홀드|베이/i.test(qm)) {
      let rows = ptk.filter((c) => S(c.op).toUpperCase() === tok);
      const ms = _modesOf(q);
      if (ms.length === 1) rows = rows.filter((c) => (ms[0] === '선적' ? c._mode === 'loading' : c._mode !== 'loading'));
      if (/(?:^|[^0-9])20(?![0-9])/.test(qm)) rows = rows.filter((c) => /^2/.test(S(c.iso)));
      else if (/(?:^|[^0-9])40(?![0-9])/.test(qm)) rows = rows.filter((c) => /^4/.test(S(c.iso)));
      if (/풀/.test(qm) && !/엠티/.test(qm)) rows = rows.filter((c) => c.fe !== 'E');
      if (/엠티/.test(qm) && !/풀/.test(qm)) rows = rows.filter((c) => c.fe === 'E');
      const desc = [ms.length === 1 ? ms[0] : '', /(?:^|[^0-9])20(?![0-9])/.test(qm) ? '20피트' : /(?:^|[^0-9])40(?![0-9])/.test(qm) ? '40피트' : '', /풀/.test(qm) && !/엠티/.test(qm) ? '풀' : /엠티/.test(qm) && !/풀/.test(qm) ? '엠티' : ''].filter(Boolean).join(' ');
      const note = tok === 'SOC' ? '\nSOC는 선사가 아니라 «화주 소유 컨» 표식이라 그 배 마감텔리 선사로 읽어요' + (/TMPZ/.test(S(H.vsl)) ? '(TMPZ 는 SOC 를 TJM 으로 — 2026-09-15 확정).' : '.') : '';
      const here = [...new Set(ptk.map((c) => S(c.op).toUpperCase()).filter(Boolean))].slice(0, 12).join('·');
      return { id: 'opCount', a: `📊 평택 ${desc ? desc + ' ' : ''}선사 ${tok}: ${rows.length}대${!ops.has(tok) && tok !== 'SOC' ? ` — 이 배에는 ${tok} 선사 컨이 없어요(이 배 선사: ${here})` : ''}${note}` };
    }
  }
  //  ⓪-4 위험물이면서 리퍼 — «DG 리퍼 동시에 해당하는 컨»
  if (/(?:DG|위험물)/i.test(qm) && /리퍼|냉동/.test(qm) && /동시|둘\s*다|이면서|겸|같이/.test(qm)) {
    const both = ptk.filter((c) => c.dg && c.rf);
    return { id: 'dgRf', a: both.length ? `⚠❄ 위험물이면서 리퍼인 컨 ${both.length}대\n` + both.map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'} ${[c.bay, c.row, c.tier].filter(Boolean).join('-')} · 클래스 ${S(c.dgc) || '?'} · ${S(c.tmp)}°C`).join('\n') : '✅ 위험물이면서 리퍼인 컨은 없어요(평택분 · EDI·리스트 기준).' };
  }
  //  ⓪-5 EDI 에만 있고 리스트에 없는 컨
  if (/EDI.{0,6}(?:엔|에는|에만)\s*(?:있는데|있고|있는)/i.test(qm) && /리스트/.test(qm)) {
    const out = [];
    for (const m of _modesOf(q)) {
      const rows = byMode(m).filter((c) => c._src === 'edi');
      out.push(`📋 ${m} — EDI에만 있고 리스트에 없는 평택분: ${rows.length}대` + (rows.length ? '\n' + rows.slice(0, 20).map((c) => `  ${c.cn} · ${[c.bay, c.row, c.tier].filter(Boolean).join('-')}`).join('\n') + (rows.length > 20 ? `\n  … 외 ${rows.length - 20}대` : '') : ''));
    }
    return { id: 'ediOnly', a: out.join('\n\n') };
  }
  //  ⓪-6 «근거 리스트 보여줘» — 리퍼·위험물·X-RAY 대수의 근거는 그 목록
  if (/근거/.test(qm)) {
    const kind = /리퍼|냉동/.test(qm) ? '리퍼' : /위험물|DG/i.test(qm) ? '위험물' : /X-?RAY|엑스레이/i.test(qm) ? 'X-RAY' : '';
    if (kind) { const a = ask(`${kind} 위치`); if (a) return { id: 'basis', a }; }
  }
  //  ⓪-7 규격초과(OOG·FR·OT) 치수 — «FR 양하 몇 대고 오버하이트 얼마짜리야» · «OT 오버와이드 양쪽 몇 센티 있는 거 있어»
  if (/(?:FR|OT|OOG|플랫랙|오픈탑)/i.test(qm) && /위치|어디|있는|몇\s*대/.test(qm) && !/뭐|뜻|약자|차이|같은\s*말/.test(qm) && !/오버\s*(?:하이|와이드|렝스)|센티|치수|얼마짜리/.test(qm)) {
    const parts = [];
    if (/FR|플랫랙/i.test(qm)) parts.push(ask('FR 위치'));
    if (/OT|오픈탑/i.test(qm)) parts.push(ask('OT 위치'));
    if (/OOG/i.test(qm) && !parts.length) parts.push(ask('규격초과 컨 있어'));
    const t = parts.filter(Boolean).join('\n\n');
    if (t) return { id: 'specialPos', a: t };
  }
  if (/(?:FR|OT|OOG|플랫랙|오픈탑)/i.test(qm) && /오버\s*(?:하이|와이드|렝스)|초과|센티|치수|얼마짜리/.test(qm) && !/래싱|라싱|체인|고박/.test(qm)) {
    const a = ask('규격초과 컨 있어');
    if (a) return { id: 'oogDims', a };
  }
  //  ⓪-8 트윈 몇 쌍 — 자동 가이드·예상 작업 시간과 같은 트윈 판정 한 벌(mir.twinSplitOf)
  if (/트윈/.test(qm) && /몇\s*(?:쌍|개|대)|쌍/.test(qm) && !/뭐|뜻|콘/.test(qm) && typeof H.twin === 'function') {
    const t = H.twin();
    if (t) return { id: 'twin', a: `🔗 트윈(20피트 두 대 한 번에) — 양하 ${t.byMode.discharge || 0}쌍 · 선적 ${t.byMode.loading || 0}쌍 가능\n자리 짝(홀수 베이 앞·뒤 같은 줄·단) ${t.posPairs}쌍 중 무게 합 초과로 싱글 권유 ${t.over}쌍 · 무게 차 커서 싱글 ${t.diff}쌍${t.noWt ? ` · 무게 몰라 미정 ${t.noWt}쌍` : ''}. 평택분 20피트 ${t.n20}대 기준이에요.` };
  }
  //  ⓪-8c ★ 5.28-05 — 숫자를 준 콘 개수 물음은 원장 셈법(한 줄 N단 = 콘 (N−1)×4 · 데크 1단은 해치커버 소켓)으로 바로 센다(2026-11-27 클로드2 시험 — 같은 설명만 반복).
  //    «20피트 갑판 3단이면 콘 몇 개» = 8개 · «선적 20피트 12대 갑판 2단 쌓으면» = 6줄 × 4 = 24개. 트윈 가운데 코끼리콘처럼 원장에 셈이 없는 것은 세지 않는다.
  if (/콘/.test(qm) && /몇\s*개|몇개|얼마|개수/.test(qm) && !/트윈|코끼리|미들|엘리펀트|싱글/.test(qm)) {
    const mt = qm.match(/(?<!\d)(\d)\s*단/);
    const t = mt ? Number(mt[1]) : 0;
    const mn = qm.match(/(\d{1,3})\s*대/);
    const n = mn ? Number(mn[1]) : 0;
    if (t >= 1 && t <= 9) {
      const per = (t - 1) * 4;
      const deck = !/홀드|선창/.test(qm);
      if (n > 0) {
        const st = Math.ceil(n / t);
        return { id: 'coneCalc', a: `🔩 콘 셈 — ${n}대를 ${t}단으로 쌓으면 ${st}줄이에요. 한 줄 ${t}단 = 콘 (${t}−1)×4 = ${per}개 → ${st}줄 × ${per} = ${st * per}개${n % t ? ` (마지막 줄은 ${n % t}단이라 실제로는 ${(st - 1) * per + (n % t - 1) * 4}개)` : ''}.` + (deck ? '\n데크 1단은 콘이 아니라 해치커버 소켓에 앉아서 안 세요. 20피트 두 대가 40 자리에 앞뒤로 앉으면 가운데 코끼리콘이 따로 들어가요.' : '') + '\n실제 배·베이별 개수는 콘앱 콘 작업표가 세요.' };
      }
      return { id: 'coneCalc', a: `🔩 콘 셈 — 한 줄 ${t}단이면 콘 (${t}−1)×4 = ${per}개예요.` + (deck ? ' 데크 1단은 해치커버 소켓에 앉아서 안 세요.' : '') + '\n줄 수를 같이 말씀해 주시면(«12대 2단») 전체 개수로 세어 드려요. 실제 배·베이별 개수는 콘앱 콘 작업표가 세요.' };
    }
  }
  //  ⓪-9 N호기 담당 베이 — 앱은 크레인 스플릿(호기별 담당 베이) 자료를 받지 않는다 — 호기별 한 대수로 답한다
  if (/\d\s*호(?:기)?\s*(?:크레인)?.{0,12}(?:담당|맡은).{0,12}베이/.test(qm)) {
    //  5.28 건의(1·23·50) — 담당 베이는 갱 배분(chiefAnswers.buildGangShift) 구간으로 답한다. 호기 시작을 알려 준 조면 갱이 호기 이름을 갖는다.
    const _eq = (qm.match(/(\d+)\s*호/) || [])[1];
    //  ★ 5.28-05 — 이 배에서 일하지 않는 호기를 물으면 그렇게 말한다(터미널 호기 표 QC10N → N호기 · 2026-11-27 «3호 크레인 담당 베이» — 이 배는 2·4호기).
    try {
      const _qw = H.raw && H.raw.info && H.raw.info.qcWork;
      const _eqs = _qw && typeof _qw === 'object' ? Object.keys(_qw).map((k) => (String(k).match(/(\d)$/) || [])[1]).filter(Boolean) : [];
      if (_eq && _eqs.length && !_eqs.includes(String(_eq))) return { id: 'craneBay', a: `${_eq}호기는 이 배(${H.vsl || '이 항차'}) 터미널 호기 표에 아직 없어요 — 지금 표에는 ${[...new Set(_eqs)].sort().join('·')}호기만 있어요. 그 호기로 다시 물어봐 주시거나, ${_eq}호기가 새로 붙었으면 «${_eq}호기 시작» 처럼 알려 주세요.` };
    } catch (e) { console.warn('[미르] 일하는 호기 판정 실패:', e); }
    let gs = typeof H.gang === 'function' ? H.gang() : null;
    let _byQc = 0;
    if (gs && gs.askGangs && typeof H.qcN === 'function' && H.qcN() > 0) { _byQc = H.qcN(); gs = H.gang(_byQc); }   // 갱 수를 모르면 터미널 호기 표의 호기 수로
    const gl = gs && Array.isArray(gs.gangs) ? gs.gangs : [];
    if (gl.length) {
      const mine = _eq ? gl.find((g) => String(g.equip || '') === String(_eq)) : null;
      const row = (g) => `${g.equip ? `${g.equip}호기` : `${g.no}번 갱`} — ${g.done || g.fromBay == null ? '맡은 구간 완료' : `베이 ${String(g.fromBay).padStart(2, '0')}~${String(g.toBay).padStart(2, '0')} · 구간 남은 ${g.restTotal != null ? g.restTotal : g.cnt}대 · 이 조 약 ${g.cnt}대`}`;
      const L2 = [`🏗 ${H.vsl ? H.vsl + ' ' : ''}담당 베이 — 갱 배분 기준(${gs.nGangs}갱 · ${gs.shift && gs.shift.name ? gs.shift.name : '이번 조'})`];
      if (mine) L2.push(row(mine)); else gl.forEach((g) => L2.push(row(g)));
      if (_eq && !mine) L2.push(`${_eq}호기가 어느 갱인지는 아직 몰라요 — «${_eq}호기는 19:00 시작» 처럼 호기 시작을 알려 주시면 호기 이름으로 붙여요.`);
      if (_byQc) L2.push(`갱 수는 터미널 호기 표의 호기 ${_byQc}대로 셌어요 — 다르면 «3갱 갱 배분» 처럼 말씀해 주세요.`);
      L2.push('갱 배분은 앱이 계산한 구간이에요 — 최종 배분은 포맨 지시가 우선이에요.');
      return { id: 'craneBay', a: L2.join('\n') };
    }
    const a = ask('호기별 진행');
    return { id: 'craneBay', a: (a ? a + '\n' : '') + (H.app === 'cone' ? '담당 베이(갱 배분)는 검수앱 미르에서 답해요 — 콘앱은 베이사전을 싣지 않아요. 위는 호기마다 지금까지 한 대수예요.'
      : '담당 베이는 갱 배분으로 계산해요 — 이 배는 베이사전이 없어 아직 못 나눠요. 위는 호기마다 지금까지 한 대수예요.') };
  }
  //  ⓪-10 해치커버 위(데크) 첫 단 리퍼
  if (/리퍼|냉동/.test(qm) && /해치\s*커버\s*위|데크|갑판/.test(qm) && /첫\s*단|1\s*단|위치|어디/.test(qm) && !/몇\s*대|몇대/.test(qm)) {
    const a = ask('갑판 리퍼 위치');
    if (a) return { id: 'rfDeck', a };
  }
  //  ⓪-11 실번호로 컨 찾기 — «실번호 K882143 붙은 컨 번호 알려줘요»
  {
    const m = q.toUpperCase().match(/(?:실\s*번호|실번호|씰|봉인)\s*([A-Z]{0,4}\d{4,12})/);
    if (m && /붙은|어느\s*컨|컨\s*번호|무슨\s*컨|찾아/.test(qm)) {
      const key = m[1].replace(/\s/g, '');
      const digits = key.replace(/^[A-Z]+/, '');
      const sealOf = (c) => [c.sl, c.slEdi, c.seal, c.seal_customs].map((x) => S(x).toUpperCase().replace(/\s/g, '')).filter(Boolean);
      const hit = (cs || []).filter((c) => c && sealOf(c).some((x) => x === key || x.endsWith(digits)));
      return { id: 'sealFind', a: hit.length ? `🔎 실번호 ${key} — ${hit.length}대\n` + hit.map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'} · ${[c.bay, c.row, c.tier].filter(Boolean).join('-')} · 실 ${sealOf(c).join(' / ')}`).join('\n') : `실번호 ${key} 가 붙은 컨은 이 항차 자료(EDI·리스트)에 없어요. 실물 실번호를 다시 보거나, 컨번호 끝 4자리로 찾아 주세요.` };
    }
  }
  //  ⓪-12 UN 번호 — «UN번호 1263 컨 있어요»
  {
    const m = q.match(/UN\s*(?:번호)?\s*(\d{4})/i);
    if (m && !/뭐|뜻/.test(qm)) { const a = ask(`위험물 UN${m[1]} 위치`); if (a) return { id: 'unNo', a }; }
  }
  //  ⓪-13 N번 베이 빈 칸 — «양하 끝나면 58베이 홀드 몇 칸 비어» · «14베이 홀드 03로우 빈칸 맞아»
  {
    //  ★ 5.28-05 — 로우까지 붙인 말은 그 줄에 놓인 컨을 모드별로 보인다(«14베이 홀드 03로우 빈칸 맞아? 베이플랜엔 비어있는데»).
    const mr = q.match(/(\d{1,2})\s*번?\s*베이.{0,12}?(\d{1,2})\s*로우.{0,20}(?:빈\s*칸|빈칸|칸\s*비|비어|빈자리|비었|있어|뭐)/);
    if (mr) {
      const bN = Number(mr[1]), rN = Number(mr[2]);
      const zone = /홀드|선창|창내/.test(qm) ? 'hold' : /갑판|데크|덱/.test(qm) ? 'deck' : '';
      const _isDeck = (x) => Number(x.tier) >= 80;
      const near = bN % 2 === 0 ? [bN, bN - 1, bN + 1] : [bN, bN - 1, bN + 1].filter((n) => n === bN || n % 2 === 0);   // 감사 중 4 — 홀수 베이도 겹치는 40피트(짝수) 자리를 본다(noBay 와 같은 한 벌)
      const rows = (cs || []).filter((x) => x && near.includes(Number(x.bay)) && Number(x.row) === rN && (!zone || (zone === 'deck') === _isDeck(x)));
      const zk = zone === 'hold' ? ' 홀드' : zone === 'deck' ? ' 갑판' : '';
      const lab = `${String(bN).padStart(2, '0')}베이${zk} ${String(rN).padStart(2, '0')}로우`;
      if (!rows.length) return { id: 'bayRow', a: `📭 ${lab} — 이번 항차 자료(EDI·리스트)에 놓인 컨이 없어요 — 자료로는 빈칸이에요. 실물이 다르면 그 자리를 확인해 주세요.` };
      const L = [`📍 ${lab} — 이번 항차 컨 ${rows.length}대`];
      for (const m of ['discharge', 'loading']) {
        const r = rows.filter((x) => (m === 'loading') === (x._mode === 'loading')).sort((a1, b1) => Number(a1.tier) - Number(b1.tier));
        if (r.length) L.push(`${m === 'loading' ? '선적' : '양하'} ${r.length}대 — ` + r.map((x) => `${S(x.cn).slice(-4)} @ ${String(x.bay).padStart(2, '0')}-${String(x.row).padStart(2, '0')}-${String(x.tier).padStart(2, '0')}`).join(' · '));
      }
      return { id: 'bayRow', a: L.join('\n') };
    }
    const m = q.match(/(\d{1,2})\s*번?\s*베이.{0,24}(?:빈\s*칸|빈칸|칸\s*비|몇\s*칸|비어|빈자리)/);
    if (m) { const a = ask(`${Number(m[1])}번 베이 빈 슬롯`); if (a) return { id: 'bayVacant', a: /현재 적재 0대 \/ 관측 슬롯 0개|관측 슬롯 0개/.test(S(a).replace(/\n/g, ' / ')) ? `${Number(m[1])}번 베이는 이 배 자료(EDI)에 없어요 — 베이 번호를 다시 봐 주세요.` : a }; }
  }
  //  ① 컨번호 11자리 검산 — «TCLU 123456 8 이거 번호가 맞는 번호인가요» · 앞 4글자 + 숫자 7(띄어 써도)
  {
    //  5.28 건의(신입 43·57) — 숫자 자리에 친 O·I·L 은 0·1 로 읽고 그 사실을 말한다 · 계산 과정을 한 줄로 보인다.
    const m0 = q.toUpperCase().match(/\b([A-Z]{4})\s*([0-9OIL]{6})\s*([0-9OIL])\b/);
    const _dg = (x) => x.replace(/O/g, '0').replace(/[IL]/g, '1');
    const m = m0 && /\d/.test(m0[2] + m0[3]) ? [m0[0], m0[1], _dg(m0[2]), _dg(m0[3])] : null;
    const _misread = m0 && (m0[2] + m0[3]) !== (m[2] + m[3]) ? `\n✍ 숫자 자리에 쓴 ${[...new Set((m0[2] + m0[3]).replace(/\d/g, '').split(''))].join('·')} 는 숫자로 읽었어요(O→0 · I·L→1) — ${m0[1]}${m0[2]}${m0[3]} → ${m[1]}${m[2]}${m[3]}` : '';
    //  ★ 5.28-05 — 컨 속성(하이큐브·규격·무게·온도·위치·실·POD…)을 «맞아요?» 로 물은 말은 검산이 아니다(2026-11-27 «BOMU 8200071 이거 하이큐브 맞아요?» 에 검산만 답했다 — 40HC).
    const _attrAsk = /하이\s*큐브|하이큐|\bHC\b|높이|규격|사이즈|피트|무게|중량|톤|온도|리퍼|위치|어디|실\s*번호|씰|봉인|POD|목적|양하항|선사|엠티|빈\s*컨|풀\b|X-?RAY|엑스레이|위험물|DG|오버|OOG|FR|OT/i.test(qm) && !/검산|체크\s*디지트|체크디짓|번호(?:가|는)?\s*(?:맞|틀|안\s*맞)|맞는\s*번호|틀린\s*번호/.test(qm);
    const _inData = !!m && (cs || []).some((x) => x && S(x.cn).toUpperCase() === m[1] + m[2] + m[3]);   // 감사 중 6 — 자료에 없는 번호는 검산 답(끝자리 고침)이 먼저다
    if (m && !(_attrAsk && _inData) && /맞는|맞아|맞나|검산|체크\s*디지트|체크디짓|안\s*맞|하이\s*큐브|규격|사이즈/.test(qm) && H.isoCheckDigit) {
      const cn = m[1] + m[2] + m[3];
      const _calc = cdCalcLine(cn);
      const ok = H.isoCheckDigit(cn);
      if (ok === true) return { id: 'cdOne', a: `✅ ${cn} — 검산(ISO 6346)이 맞는 번호예요. 체크디지트 ${m[3]} 가 맞아요.${_misread}${_calc ? '\n' + _calc : ''}` };
      if (ok === false) { const fx = H.isoFixLastDigit ? H.isoFixLastDigit(cn) : ''; return { id: 'cdOne', a: `⚠ ${cn} — 검산(ISO 6346)이 안 맞아요.${fx ? ` 앞 10자리가 맞다면 마지막 자리는 ${fx.slice(-1)} 이어야 해요 — ${fx}.` : ''} 실물 번호를 다시 읽어 보세요(한 글자 잘못 본 경우가 많아요).${_misread}${_calc ? '\n' + _calc : ''}` }; }
    }
  }
  //  ② 리스트 전체 검산 — «컨번호 체크디지트 틀린 거 리스트에 있나 검증해줘»
  if (/체크\s*디지트|체크디짓|검산/.test(qm) && /검증|틀린\s*거|있나|전체|목록/.test(qm) && !/달라|다르|한\s*자리/.test(qm) && H.isoCheckDigit) {
    const bad = ptk.filter((c) => c.cn && H.isoCheckDigit(c.cn) === false);
    if (!bad.length) return { id: 'cdList', a: `✅ 이 항차 평택분 ${ptk.length}대 — 컨번호 검산(ISO 6346)이 안 맞는 번호가 없어요.` };
    return { id: 'cdList', a: `⚠ 검산(ISO 6346)이 안 맞는 컨번호 ${bad.length}대\n` + bad.slice(0, 20).map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'}${H.isoFixLastDigit ? ` (맞으려면 ${H.isoFixLastDigit(c.cn).slice(-1)})` : ''}`).join('\n') + (bad.length > 20 ? `\n  … 외 ${bad.length - 20}대` : '') + '\n실물 번호와 대조해 보세요.' };
  }
  //  ③ 앞머리로 찾기 — «HNSU 556 으로 시작하는 거» · «HLXU 라고 적었는데 HLBU 일수도 — 둘다»
  {
    const pref = [...q.toUpperCase().matchAll(/\b([A-Z]{4})\s*(\d{0,6})\b/g)].map((m) => ({ a: m[1], d: m[2] || '' })).filter((x) => !/^(KRPT|TEU|ISO|EDI|BAPL|VGM)/.test(x.a) && !(H.shipCodes && H.shipCodes.has(x.a)));   // 5.28: 배 코드(«TMPZ 무게 차이 큰 컨 뽑아줘»)는 컨 앞자리가 아니다(라이브 실측)
    if (pref.length && /시작|둘\s*다|둘다|일\s*수도|찾아|뽑아/.test(qm) && !/\d{7}/.test(q.replace(/\s/g, ''))) {
      const lines = [];
      for (const x of pref) {
        const hit = (cs || []).filter((c) => c && c.cn && String(c.cn).toUpperCase().startsWith(x.a + x.d));
        lines.push(`${x.a}${x.d ? ' ' + x.d : ''}… — ${hit.length ? hit.length + '대' : '없음'}` + (hit.length ? '\n' + hit.slice(0, 10).map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'} · ${[c.bay, c.row, c.tier].filter(Boolean).join('-') || '자리 없음'}${c._ptk === false ? ' · 통과' : ''}`).join('\n') + (hit.length > 10 ? `\n  … 외 ${hit.length - 10}대` : '') : ''));
      }
      return { id: 'prefix', a: '🔎 앞자리로 찾기 (이 항차 · 통과화물 포함)\n' + lines.join('\n') };
    }
  }
  //  ④ TEU — «오늘 양하 몇 TEU» (+ 계산법)
  if (/TEU|티이유/i.test(qm) && /몇|얼마|계산/.test(qm) && !QUAL.test(qm)) {
    const out = [];
    for (const m of _modesOf(q)) {
      const n20 = _n(ask(`${m} 20피트 몇 대`)), n40 = _n(ask(`${m} 40피트 몇 대`)), n45 = _n(ask(`${m} 45피트 몇 대`)) || 0;
      if (n20 == null || n40 == null) continue;
      const teu = n20 + (n40 + n45) * 2;
      out.push(`${m} ${teu} TEU — 20피트 ${n20}대 × 1 + 40피트 ${n40}대 × 2${n45 ? ` + 45피트 ${n45}대 × 2` : ''}`);
    }
    if (out.length) return { id: 'teu', a: '📦 ' + out.join('\n📦 ') + '\nTEU 계산법 — 20피트 1대 = 1 TEU, 40피트(하이큐브 포함) 1대 = 2 TEU예요(45피트도 보통 2로 셉니다). 평택분 기준이에요.' };
  }
  //  ⑤ POD별·목적지별 — «선적 40HC만 POD별로» · «POD 별로 선적 대수 정리해 주세요»
  if (/(?:POD|포트|목적지|양하항|도착항|항구)\s*별|별로.{0,4}(?:POD|목적지)/i.test(qm) && !QUAL.test(qm) && !/정확도|퍼센트|맞춘|맞힌/.test(qm) && !/리퍼|냉동|위험물|DG|갑판|데크|홀드|베이/i.test(qm)) {
    const out = [];
    for (const m of _modesOf(q).filter((x) => x === '선적' || /양하/.test(qm))) {
      let rows = byMode(m);
      const hc = /하이\s*큐브|HC/i.test(qm);
      if (/40/.test(qm) || hc) { const s = ask(`${m} 40피트 몇 대`); if (s == null) continue; rows = rows.filter((c) => /^4/.test(S(c.iso)) || /^40/.test(S(H.isoToLabel ? H.isoToLabel(c.iso) : ''))); }
      else if (/20/.test(qm)) rows = rows.filter((c) => /^2/.test(S(c.iso)));
      if (hc) rows = rows.filter((c) => /HC|HQ/i.test(S(H.isoToLabel ? H.isoToLabel(c.iso) : '')) || /^4[5-9]/.test(S(c.iso)));
      const key = (c) => S(m === '선적' ? c.pod : c.pol).toUpperCase() || '(없음)';
      const g = {};
      rows.forEach((c) => { const k = key(c); g[k] = g[k] || { n: 0, f: 0, e: 0 }; g[k].n++; if (c.fe === 'E') g[k].e++; else g[k].f++; });
      const ks = Object.keys(g).sort((a, b) => g[b].n - g[a].n);
      const label = `${m}${hc ? ' 40피트 하이큐브' : /40/.test(qm) ? ' 40피트' : /20/.test(qm) ? ' 20피트' : ''} ${m === '선적' ? '목적지(POD)' : '선적항(POL)'}별`;
      out.push(`📊 ${label} — 총 ${rows.length}대\n` + (ks.length ? ks.map((k) => `  ${k}${H.portName && H.portName(k) ? ` ${H.portName(k)}` : ''}: ${g[k].n}대 (풀 ${g[k].f} · 엠티 ${g[k].e})`).join('\n') : '  없음'));
    }
    if (out.length) return { id: 'podSplit', a: out.join('\n\n') };
  }
  //  ⑥ 하이큐브 대수 — «40 하이큐브만 따로 몇 대» · «선적 40HC 는 전부 몇개»
  if (/하이\s*큐브|하이큐|40\s*HC|\bHC\b/i.test(qm) && /몇|얼마|대수|따로|세어|세 줘|세줘|세줄/.test(qm) && !/뭐|뜻|높이만|차이|구분|어떻게/.test(qm) && !QUAL.test(qm) && !/리퍼|냉동|위험물|갑판|데크|홀드|베이/.test(qm)) {
    const out = [];
    for (const m of _modesOf(q)) {
      const rows = byMode(m).filter((c) => /HC|HQ/i.test(S(H.isoToLabel ? H.isoToLabel(c.iso) : '')) || /^4[5-9]/.test(S(c.iso)));
      const f = rows.filter((c) => c.fe !== 'E').length;
      out.push(`📊 ${m} 40피트 하이큐브: ${rows.length}대 (풀 ${f} · 엠티 ${rows.length - f})`);
    }
    return { id: 'hc', a: out.join('\n') + '\n(평택분 · 규격 코드 둘째 자리 5 = 하이큐브)' };
  }
  //  ⑦ 규격 × 풀엠티 나눠 — «양하 20풀 40풀 45 엠티 따로 총대수» · «20이랑 40 나눠서» · «20피트 풀 몇대 20피트 엠티 몇대 따로»
  {
    const sizes = ['20', '40', '45'].filter((s) => new RegExp(`(?:^|[^0-9])${s}(?![0-9])`).test(qm));
    const fes = (/풀/.test(qm) ? 1 : 0) + (/엠티|공컨/.test(qm) ? 1 : 0);
    const want = !QUAL.test(qm) && !/리퍼|냉동|위험물|DG|X-?RAY|갑판|데크|홀드/i.test(qm) && SPLIT_RE.test(qm) && /몇|대수|총|알려|세|나눠|따로/.test(qm) && !/기준|뭐|차이|뜻|어떻게/.test(qm) && (sizes.length >= 2 || (sizes.length >= 1 && fes >= 2) || (/총\s*대수|총대수/.test(qm) && sizes.length + fes >= 2)) && !/베이|번\s*베이|로우|티어|콘|단(?:이면|으로)/.test(qm) && !/\d{4}/.test(qm);
    if (want) {
      const ss = sizes.length ? sizes : ['20', '40', '45'];
      const out = [];
      for (const m of _modesOf(q)) {
        const parts = []; let tot = 0;
        for (const sz of ss) {
          const f = _n(ask(`${m} ${sz}피트 풀 몇 대`)), e = _n(ask(`${m} ${sz}피트 엠티 몇 대`));
          if (f == null && e == null) continue;
          if (sz === '45' && !f && !e && !sizes.includes('45')) continue;
          parts.push(`${sz}피트 풀 ${f || 0} · 엠티 ${e || 0} (계 ${(f || 0) + (e || 0)})`);
          tot += (f || 0) + (e || 0);
        }
        if (parts.length) out.push(`📊 평택 ${m}${ss.length < 2 ? '' : ` — 합계 ${tot}대`}\n  ` + parts.join('\n  '));
      }
      if (out.length) return { id: 'sizeSplit', a: out.join('\n\n') };
    }
  }
  //  ⑧ 갑판·홀드 따로 — «갑판 위 양하분이랑 홀드 안 양하분 대수 따로»
  if (/(?:갑판|데크)/.test(qm) && /홀드|선창/.test(qm) && /따로|각각|씩|나눠|이랑|랑|하고/.test(qm) && /몇|대수|대수\s*따로|알려/.test(qm) && !QUAL.test(qm)) {
    const out = [];
    for (const m of _modesOf(q)) {
      const dk = _n(ask(`갑판 ${m} 몇 대`)), hd = _n(ask(`홀드 ${m} 몇 대`));
      if (dk == null && hd == null) continue;
      out.push(`📊 ${m} — 갑판(데크) ${dk || 0}대 · 홀드 ${hd || 0}대 (계 ${(dk || 0) + (hd || 0)})`);
    }
    if (out.length) return { id: 'deckHold', a: out.join('\n') };
  }
  //  ⓪-14 지난 항차와 견주기 · 리퍼 온도 리스트↔EDI · 무게 차이 큰 컨(5.28 건의)
  {
    const r = fieldExtraAnswer(q, qm, cs, H);
    if (r) return r;
  }
  //  ⑨ 양하·선적 각각/합쳐 — «양하 선적 합쳐서 오늘 전체 물량» · «리퍼 양하 대수랑 선적 대수 각각» · «리퍼 양하 적하 합쳐서 플러그 몇 개»
  if (/양하/.test(qm) && /선적|적하/.test(qm) && /합쳐|합해|전체|각각|따로|이랑|랑|하고|대수랑/.test(qm) && /몇|대수|물량|알려/.test(qm) && !/베이/.test(qm) && !QUAL.test(qm)) {
    const kind = /리퍼|냉동/.test(qm) ? '리퍼 ' : /위험물|DG/i.test(qm) ? '위험물 ' : /엑스레이|X-?RAY/i.test(qm) ? 'X-RAY ' : /엠티/.test(qm) ? '엠티 ' : '';
    const d = _n(ask(`${kind}양하 몇 대`)), l = _n(ask(`${kind}선적 몇 대`));
    if (d != null || l != null) {
      let a = `📊 평택 ${kind.trim() || '전체'} — 양하 ${d || 0}대 · 선적 ${l || 0}대 · 합계 ${(d || 0) + (l || 0)}대`;
      if (/시프팅|리스토|재선적/.test(qm)) { const sh = S(ask('시프팅 몇 대')).split('\n')[0]; if (sh) a += `\n${sh.replace(/^🔄\s*/, '🔄 ')} — 양하·선적 대수에 넣지 않고 따로 세요`; }
      if (kind === '리퍼 ' && /플러그|전원|콘센트/.test(qm)) a += `\n플러그는 풀 리퍼만 세면 돼요 — 양하 ${d || 0}대는 내린 뒤 야드에서, 선적 ${l || 0}대는 실은 뒤 배에서 꽂아요(엠티 리퍼는 전원이 필요 없어요). 같은 시각에 다 꽂혀 있지 않으니 실제 필요한 콘센트 수는 터미널 리퍼 담당이 정해요.`;
      return { id: 'modeSplit', a };
    }
  }
  //  ⑩ 위험물 클래스별 — «DG 컨 클래스별로 몇 대씩» · «DG 컨테이너 몇대고 어느 베이 · 클래스도»
  if (/(?:DG|위험물)/i.test(qm) && /클래스\s*별|클래스도|클래스별|급\s*별/.test(qm)) {
    const rows = ptk.filter((c) => c.dg);
    if (!rows.length) return { id: 'dgClass', a: '📭 위험물(DG) 0대 — 이 항차 평택분에 위험물이 없어요(EDI·리스트 기준).' };
    const g = {};
    rows.forEach((c) => { const k = S(c.dgc || c.imdg || '').split(/[,\s/]+/)[0] || '미상'; g[k] = g[k] || []; g[k].push(c); });
    return { id: 'dgClass', a: `⚠ 위험물 ${rows.length}대 — 클래스별\n` + Object.keys(g).sort().map((k) => `  클래스 ${k}: ${g[k].length}대 — ` + g[k].slice(0, 8).map((c) => `${S(c.cn).slice(-4)}(${c._mode === 'loading' ? '선적' : '양하'} ${[c.bay, c.row, c.tier].filter(Boolean).join('-')}${c.un ? ' UN' + c.un : ''})`).join(' · ')).join('\n') };
  }
  //  ⑪ 리퍼 온도 조건 — «영하 20도 이하만» · «온도 미기재된 컨»
  if (/리퍼|냉동/.test(qm)) {
    const rf = ptk.filter((c) => c.rf && c.fe !== 'E');
    const tOf = (c) => { const t = parseFloat(S(c.tmp).replace(/[^0-9.\-+]/g, '')); return Number.isFinite(t) ? t : null; };
    if (/미기재|없는|빠진|비어|안\s*적/.test(qm) && /온도/.test(qm)) {
      const no = rf.filter((c) => tOf(c) == null);
      return { id: 'rfNoTemp', a: no.length ? `⚠ 설정 온도가 비어 있는 풀 리퍼 ${no.length}대\n` + no.map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'} ${[c.bay, c.row, c.tier].filter(Boolean).join('-')}`).join('\n') : `✅ 풀 리퍼 ${rf.length}대 — 설정 온도가 빠진 컨이 없어요.` };
    }
    const m = q.match(/(영하|마이너스|-)\s*(\d+(?:\.\d+)?)\s*도?\s*(이하|미만|보다\s*(?:낮|추)|아래|이상|보다\s*높)/);
    if (m) {
      const lim = -Number(m[2]); const below = /이하|미만|낮|추|아래/.test(m[3]);
      const hit = rf.filter((c) => { const t = tOf(c); return t != null && (below ? (/미만/.test(m[3]) ? t < lim : t <= lim) : t >= lim); });
      return { id: 'rfTemp', a: `❄ 풀 리퍼 설정 ${lim}°C ${below ? '이하' : '이상'}: ${hit.length}대 (전체 풀 리퍼 ${rf.length}대)` + (hit.length ? '\n' + hit.map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'} ${[c.bay, c.row, c.tier].filter(Boolean).join('-')} · ${S(c.tmp)}°C`).join('\n') : '') };
    }
  }
  //  ⑫ X-RAY 대상 몇 대 + 어디/리스트 · 그중 데크 · 선적분도?
  if (/(?:X-?RAY|엑스레이|엑스선)/i.test(qm) && !/왜|모든|어디로|보내|표시/.test(qm)) {
    if (/양하\s*리스트(?:에|엔|에는)?\s*없|리스트(?:에|엔)?\s*없/.test(qm)) {
      const xs = ptk.concat((cs || []).filter((c) => c && c._ptk === false)).filter((c) => c._xray);
      const noList = xs.filter((c) => c._src === 'edi');   // 리스트 행이 없는 컨(EDI 에만) — flattenVoyages 의 _src
      return { id: 'xrayNoList', a: `🔍 X-RAY 대상 ${xs.length}대 중 양하 리스트에 없는 컨: ${noList.length}대${noList.length ? '\n' + noList.map((c) => '  ' + c.cn).join('\n') : ''}\n(X-RAY 목록 번호가 양하 리스트에 없으면 항차 화면 주의 박스 «자료별 대조» 에도 떠요 — 다른 배 컨이거나 오타일 수 있으니 수석에게 확인해요.)` };
    }
    if (/선적분|선적도|선적.{0,6}있/.test(qm)) {
      const d = _n(ask('X-RAY 양하 몇 대')), l = _n(ask('X-RAY 선적 몇 대'));
      return { id: 'xraySide', a: `🔍 X-RAY 대상 — 양하 ${d || 0}대 · 선적 ${l || 0}대. X-RAY는 세관 수입 검사라 보통 양하분에만 있어요.` };
    }
    if (/데크|갑판/.test(qm) && /총|전체|그중|중에/.test(qm)) {
      const t = _n(ask('X-RAY 몇 대')), dk = _n(ask('갑판 X-RAY 몇 대'));
      return { id: 'xrayDeck', a: `🔍 X-RAY 대상 총 ${t || 0}대 — 그중 데크(갑판) ${dk || 0}대 · 홀드 ${(t || 0) - (dk || 0)}대` };
    }
    if (((/몇\s*대|몇대/.test(qm) && /어디|위치|베이|리스트|목록/.test(qm)) || /정렬|순서대로/.test(qm)) && !/누구|어떻게|말해|해야|꼬이/.test(qm)) {
      const a = ask('X-RAY 대상 위치');
      if (a) return { id: 'xrayList', a };
    }
  }
  //  ⑬ 같은 컨번호가 양하·선적 둘 다
  if (/같은\s*컨\s*번호|같은\s*컨번호|둘\s*다\s*있/.test(qm) && /양하/.test(qm) && /선적/.test(qm)) {
    const dset = new Set((cs || []).filter((c) => c && c._mode !== 'loading').map((c) => c.cn));
    const both = [...new Set((cs || []).filter((c) => c && c._mode === 'loading' && dset.has(c.cn)).map((c) => c.cn))];
    return { id: 'bothModes', a: both.length ? `🔄 양하·선적 둘 다 있는 컨 ${both.length}대 (내렸다 다시 싣는 시프팅·재선적일 수 있어요)\n` + both.slice(0, 20).map((x) => '  ' + x).join('\n') : '✅ 이 항차에 양하·선적 둘 다 있는 컨번호가 없어요.' };
  }
  //  ⑭ 무게 0
  if (/무게|중량|VGM/i.test(qm) && /0\s*(?:으로|톤|kg)|영으로|빈\s*무게|없는/.test(qm) && /있|찍|뽑|몇/.test(qm)) {
    const z = ptk.filter((c) => !(Number(c.wt) > 0) && !(Number(c.wtEdi) > 0));
    return { id: 'wtZero', a: z.length ? `⚠ 무게가 0이거나 빈 컨 ${z.length}대\n` + z.slice(0, 20).map((c) => `  ${c.cn} · ${c._mode === 'loading' ? '선적' : '양하'}`).join('\n') : `✅ 평택분 ${ptk.length}대 — 무게가 0으로 찍힌 컨이 없어요.` };
  }
  //  ⑮ 크레인(호기)별 진척 — «크레인별 진척 지금 몇 퍼센트씩»
  if (/(?:크레인|호기|갱)\s*별|호기마다|크레인마다/.test(qm) && !/20|40|45|규격|보고|표/.test(qm)) {
    const a = ask('호기별 진행');
    if (a) return { id: 'crane', a };
  }
  //  ⑯ 다음 기항지
  if (/다음\s*(?:기항지|항구|기항)|어디로\s*가/.test(qm) && !/컨|\d{4}/.test(qm) && typeof H.nextPort === 'function') {
    const a = H.nextPort();
    if (a) return { id: 'nextPort', a };
  }
  //  ⑰ 출항 예정 — «오늘 이 배 몇 시 출항 예정»
  if (/출항/.test(qm) && /몇\s*시|언제|예정/.test(qm) && !/전에|까지|끝나|남았/.test(qm) && typeof H.depart === 'function') {
    const a = H.depart();
    if (a) return { id: 'depart', a };
  }
  //  ⑱ 남은 물량 정리 — «야간조한테 넘길 남은 물량 정리» → 인계서
  if (/남은\s*(?:물량|작업).{0,10}(?:정리|요약)|넘길\s*남은/.test(qm)) {
    const a = ask('인수인계');
    if (a) return { id: 'remainHand', a };
  }
  return null;
}
