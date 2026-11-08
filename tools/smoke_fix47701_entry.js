// 4.77-01 연막검사 입구 — 미르 한 벌(콘앱과 같은 번들) + 속도 계산 한 벌 함수를 한 번들로 묶는다
export * from '../src/mirCore.entry.js';
export { paceNowOf, speedFromRecords, recentPaceOf, withRecentPace, recentPaceLine, paceFromRecords, voyageDoneAts } from '../src/nlSearch.js';
export { answerShipSpeed } from '../src/chiefAnswers.js';
