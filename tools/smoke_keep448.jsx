// 4.48 연막검사 진입점 — 선사 지시 «본선 잔류»를 MAMP 641N 22베이 실자료(베이플랜 · 양하 리스트 · 선사 시프팅 목록 · 베이사전)와 실소스로 잰다.
//   firebase.js 는 진짜(쓰는 자리 문지기까지) — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
//   검수사 2026-10-24 12:49 선사 메일 «Pls keep below cntrs onboard for CNDAI discharge» · «메일대로 315 (평택 아님)» · 13:09 «노란 다이아 몬드로 시프팅 대상» · «플래너가 확정하면 그떄 같이 바뀌게».
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import ValidationBox from '../src/components/ValidationBox.jsx';
import { keepOnboardOf, keepShiftForecastOf, ptkDischargeUnitsOf, shiftingMapForDisplay, isKeepShift, isPredShift, shiftEvidenceOf, shiftSplitOf, shiftingListOf, computeShiftingMapCached } from '../src/utils.js';
import { buildPosMap, buildBayMarks } from '../src/cargoPlanCore.js';
import { reconcileSources } from '../src/sourceRecon.js';
import { fbSetKeepOnboard, fbClearKeepOnboard, fbGetKeepOnboard } from '../src/firebase.js';
import { setActiveWorkChoice } from '../src/workChoice.js';
import FX from './fixtures/keep448_mamp641n.json';
//  4.48 감사(«부» 상 3 · 중 3 · 하 6) — 연막이 재지 않던 입구를 잰다: 진행 숫자(홈 카드·수석 보드·현황 요약) · 미르 분모·콘앱 미르 행 · 종이 카고플랜 머리 · 주의 박스 · 총 무브수 답 · 확정 없는 배 예측.
import { progressOf, applyDischargeUnits, predictedShiftingForDisplay, setLaneRoutes } from '../src/utils.js';
import { voyageCountsOf } from '../src/mir.js';
import { answerTotalMoves } from '../src/chiefAnswers.js';
import { runDiagnostics } from '../src/diagnostics.js';
import { computeStats } from '../src/pages/HomePage.jsx';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import PREGONE from './fixtures/shifting_pregone.json';
import KKAK from './fixtures/keep448_kkak2606n.json';   // 재감사 하-A: 예측 갈래에서 지시 컨이 ◇ 로 잡히는 실자료(KKAK 2606N 04~06베이)
import { generateHowToAnswer, answerAboutAlert } from '../src/nlSearch.js';   // 4.48-01 감사 — «본선 잔류 뭐야»
import DiagnosticsPanel from '../src/components/DiagnosticsPanel.jsx';   // 4.48-01 재감사(하-2) — 펼친 칸을 실제로 그린다

window.__T = { keepOnboardOf, keepShiftForecastOf, ptkDischargeUnitsOf, shiftingMapForDisplay, isKeepShift, isPredShift, shiftEvidenceOf, shiftSplitOf, shiftingListOf, computeShiftingMapCached,
  buildPosMap, buildBayMarks, reconcileSources, fbSetKeepOnboard, fbClearKeepOnboard, fbGetKeepOnboard, setActiveWorkChoice, FX,
  progressOf, applyDischargeUnits, predictedShiftingForDisplay, setLaneRoutes, voyageCountsOf, answerTotalMoves, runDiagnostics, computeStats, PREGONE, KKAK, generateHowToAnswer, answerAboutAlert };
const root = createRoot(document.getElementById('root'));
let __mk = 0;
window.__renderDetail = (props) => { __mk += 1; root.render(React.createElement(ContainerDetailModal, { key: 'd' + __mk, onClose: () => {}, ...props })); };
window.__renderValidation = (props) => { __mk += 1; root.render(React.createElement(ValidationBox, { key: 'v' + __mk, ...props })); };
window.__renderDiag = (alerts) => { __mk += 1; root.render(React.createElement(DiagnosticsPanel, { key: 'g' + __mk, alerts, autoSpeak: false, onToggleSpeak: () => {}, onDismiss: () => {}, onOpenContainer: () => {} })); };
window.__renderPlan = (props) => { __mk += 1; root.render(React.createElement(PrintableCargoPlanV2, { key: 'p' + __mk, onClose: () => {}, ...props })); };
window.__renderDetailSame = (props) => { root.render(React.createElement(ContainerDetailModal, { key: 'same', onClose: () => {}, ...props })); };   // 재감사 하-A: key 없이 그리는 자리(App·수석 보드) 흉내 — 컨만 바뀐다
