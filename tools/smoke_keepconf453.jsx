// 4.53 연막검사 진입점 — 선적 EDI(출항본)에 다른 자리로 실린 선사 지시 «본선 잔류»는 «확정»(양하 315 · 시프팅 파란 ◆ 64)이다. MAMP 641N 실 RTDB 읽기 사본과 실소스로 잰다.
//   firebase.js 는 진짜 — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
//   검수사 2026-10-26 14:50 «양하는 315 시프팅은 64개로 확정된듯합니다» · 15:02 «시프팅 예정건이 선적플랜 10번 데크에 존재하는걸 볼수있습니다. 이로서 확정합니다.»
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import VoyagePage, { ListTab } from '../src/pages/VoyagePage.jsx';
import { keepOnboardOf, keepConfirmedOf, keepConfirmedFromMaps, keepShiftForecastOf, ptkDischargeUnitsOf, progressOf, computeShiftingMapCached, shiftingMapForDisplay,
  shiftSplitOf, shiftEvidenceOf, shiftingListOf, shiftSetForUnitsOf, isKeepShift, isPredShift, fmtShiftPos, applyDischargeUnits } from '../src/utils.js';
import { voyageCountsOf } from '../src/mir.js';
import { generateLocalAnswer, parseNaturalQuery } from '../src/nlSearch.js';
import { runDiagnostics } from '../src/diagnostics.js';
import { parseBAPLIE, computeShiftingMap, restowMapFromDoc, shiftEvidenceCore, applySwapFix, swapFixList, loadEdiIsDeparture, shiftCnSetOf } from '../src/utils.js';   // 콘앱(ConeParse) 쪽 재료 — 콘앱 함수를 실제로 돌릴 때 쓴다
import { computeStats } from '../src/pages/HomePage.jsx';
import { computeStats as chiefComputeStats } from '../src/pages/ChiefDashboard.jsx';
import { answerTotalMoves } from '../src/chiefAnswers.js';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import DiagnosticsPanel from '../src/components/DiagnosticsPanel.jsx';
import { reconcileSources } from '../src/sourceRecon.js';
import FX from './fixtures/keepconf453_mamp641n.json';

window.__T = { keepOnboardOf, keepConfirmedOf, keepConfirmedFromMaps, keepShiftForecastOf, ptkDischargeUnitsOf, progressOf, computeShiftingMapCached, shiftingMapForDisplay,
  shiftSplitOf, shiftEvidenceOf, shiftingListOf, shiftSetForUnitsOf, isKeepShift, isPredShift, fmtShiftPos, applyDischargeUnits, voyageCountsOf, generateLocalAnswer, parseNaturalQuery,
  runDiagnostics, reconcileSources, parseBAPLIE, computeShiftingMap, restowMapFromDoc, shiftEvidenceCore, applySwapFix, swapFixList, loadEdiIsDeparture, shiftCnSetOf, computeStats, chiefComputeStats, answerTotalMoves, FX };
window.__renderPlan = (props) => { __mk += 1; root.render(React.createElement(PrintableCargoPlanV2, { key: 'p' + __mk, onClose: () => {}, ...props })); };
const root = createRoot(document.getElementById('root'));
let __mk = 0;
window.__renderDetail = (props) => { __mk += 1; root.render(React.createElement(ContainerDetailModal, { key: 'd' + __mk, onClose: () => {}, ...props })); };
window.__renderVP = (voyage, voyageKey) => { __mk += 1; root.render(React.createElement(VoyagePage, { key: 'vp' + __mk, voyageKey, voyage, inspector: '연막', inspectors: [], onGoHome: () => {}, initModeOverride: 'discharge' })); };
window.__renderListTab = (props) => { __mk += 1; root.render(React.createElement(ListTab, { key: 'lt' + __mk, mode: 'discharge', ediMap: {}, recMap: {}, xrayMap: {}, xraySeals: {}, compMap: {}, inspector: '연막', onOpenContainer: () => {}, externalFilter: null, onAsk: null, vsl: 'MAMP', pier: 'PCTC', briefCtx: null, ...props })); };
window.__renderDiag = (alerts) => { __mk += 1; root.render(React.createElement(DiagnosticsPanel, { key: 'g' + __mk, alerts, autoSpeak: false, onToggleSpeak: () => {}, onDismiss: () => {}, onOpenContainer: () => {} })); };
