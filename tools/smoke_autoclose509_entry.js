// 5.09 자동 완료 저장 연막검사 입구 — 실소스(utils 판정·autoClose 수석 판정·updateAudience·firebase 쓰기)를 번들로 묶는다
export { AUTO_CLOSE_IDLE_MS, AUTO_CLOSE_FRESH_MS, autoCloseTimingOf, autoCloseDecision, presentChiefsOf, inspectorAllDone, APP_NOTE, APP_VERSION } from '../src/utils.js';
export { splitNoteAudience, canSeeUpdateNote } from '../src/updateAudience.js';
export { isRealChief } from '../src/autoClose.js';
export { setServerRoles } from '../src/staffList.js';
export { fbAutoCloseVoyage, fbStampChiefInput } from '../src/firebase.js';
