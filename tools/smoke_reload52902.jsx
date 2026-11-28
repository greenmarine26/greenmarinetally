// 5.29-02 연막검사 번들 입구 — 선사 시프팅 목록에 있어도 양하 리스트에 양하로 등록된 컨은 양하분(MAMP 646N 실자료 · 실 Firebase 쓰기 없음).
import FXJ from './fixtures/reload52902_mamp646n.json';
import { restowMapFromDoc, computeShiftingMapCached, ptkDischargeUnitsOf, shiftEvidenceOf, shiftingTruthCheck, listSaysTransship, isListedPtkDischarge } from '../src/utils.js';
window.__T = { FX: FXJ, restowMapFromDoc, computeShiftingMapCached, ptkDischargeUnitsOf, shiftEvidenceOf, shiftingTruthCheck, listSaysTransship, isListedPtkDischarge };
