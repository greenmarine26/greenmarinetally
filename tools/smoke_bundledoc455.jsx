// 4.55 연막검사 진입점 — 터미널 «빈 FR 묶음 목록(BUNDLE LIST)» 서류가 있으면 묶음은 서류가 정본이다. ATPR 2647E 실 RTDB 읽기 사본 + 실서류(수집기 2.48 이 읽어 올린 모양)와 실소스(tallyReport·sourceRecon·diagnostics·utils·화면)로 잰다.
//   firebase.js 는 진짜 — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
//   검수사 2026-10-26 19:14 «그건 동방 자료가 잘못된것입니다. 하지만 앱도 표기를 했어야 합니다. 4개 한묶음 2개로 그래야 양쪽 갯수가 맞는거고 알림을 붉은색으로 보여줄 필요도 없는것입니다» · 19:17 «검수리스트는 182개가 맞는거고 동방은 176(+6)으로 표기하고 FR묶음 설명을 붙이면 됩니다»(282·276 의 오타로 읽음).
import React from 'react';
import { createRoot } from 'react-dom/client';
import VoyageSummaryCard from '../src/components/VoyageSummaryCard.jsx';
import WorkClosingChecklist from '../src/components/WorkClosingChecklist.jsx';
import DiagnosticsPanel from '../src/components/DiagnosticsPanel.jsx';
import { ShipDetail, shipViewOf } from '../src/pages/HomePage.jsx';
import { ptkContainers, bundleFold, bundleKeyOf, emptyFrBundlesOf, frBundlesOf, bundleExplainOf, computeTallyData, bundleDocOf, bundleDocFor, bundleDocWhy, tagBundleDoc, bundleDocNote, bundleSummary, bundleDocMiss, bundleDocSrc, bundleDocExpect, bundleDocOffText } from '../src/tallyReport.js';
import { reconcileSources, reconUnknownText, reconBundleText, reconTermNum } from '../src/sourceRecon.js';
import { loadedSlotClaims, progressOf, ptkDischargeUnitsOf, shiftCnSetOf } from '../src/utils.js';
import { runDiagnostics } from '../src/diagnostics.js';
import FX from './fixtures/bundle454_atpr2647e.json';
import DOC from './fixtures/bundlelist455_atpr2647e.json';

window.__T = { bundleDocOf, bundleDocFor, bundleDocWhy, tagBundleDoc, bundleDocNote, bundleSummary, bundleDocMiss, bundleDocSrc, bundleDocExpect, bundleDocOffText, DOC, ptkContainers, bundleFold, bundleKeyOf, emptyFrBundlesOf, frBundlesOf, bundleExplainOf, computeTallyData, reconcileSources, reconUnknownText, reconBundleText, reconTermNum, loadedSlotClaims, progressOf, ptkDischargeUnitsOf, shiftCnSetOf, runDiagnostics, shipViewOf, FX };
const roots = [];
const fresh = () => {
  roots.forEach((r) => { try { r.unmount(); } catch (e) { /* 이미 정리됨 */ } });
  roots.length = 0;
  const old = document.getElementById('root');
  const el = document.createElement('div'); el.id = 'root';
  old.parentNode.replaceChild(el, old);
  const r = createRoot(el); roots.push(r);
  return r;
};
window.__renderCard = (voyage, voyageKey) => { fresh().render(React.createElement(VoyageSummaryCard, { voyage, mode: 'discharge', voyageKey, reeferCheck: null, rfSkip: true })); };
window.__renderClosing = (voyage) => { fresh().render(React.createElement(WorkClosingChecklist, { open: true, voyage, mode: 'discharge', onClose: () => {}, onJump: () => {}, rfSkip: true })); };
window.__renderDiag = (alerts) => { fresh().render(React.createElement(DiagnosticsPanel, { alerts, autoSpeak: false, onToggleSpeak: () => {}, onDismiss: () => {}, onOpenContainer: () => {} })); };
window.__renderDetail = (voyage) => { fresh().render(React.createElement(ShipDetail, { voyage, activeInspectors: [], onOpen: () => {}, onDelete: () => {}, onComplete: () => {}, inspectorDone: false, modeDone: {}, onUndoComplete: null, pilotForecast: {}, inspector: '검수원', laneRow: null })); };
