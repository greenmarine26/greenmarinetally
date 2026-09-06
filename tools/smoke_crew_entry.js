// 3.8 호기–검수원 연막검사 진입점 — 명단(서버 주입)·파서·집계·답을 한 번들로 묶어 같은 모듈 인스턴스를 쓴다
export { setServerRoles, allStaffNames } from '../src/staffList.js';
export { parseNaturalQuery, hasAnyCondition, answerCraneCrew, crewSetText, generateLocalAnswer } from '../src/nlSearch.js';
export { parseCraneCrew, crewShiftKey, crewWorkStats, craneCrewOf, matchStaffName, craneBowSternOf, resolveCrewSides } from '../src/utils.js';   // 3.21: 선수·선미 유도
