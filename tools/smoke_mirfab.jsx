// 떠 있는 미르(3.41) 렌더 연막검사 진입점 — 실데이터(KBTR 2606E·NSFR 2617N, 2026-09-10 RTDB 사본)로 App 밖의 MirFab 을 그려 «얼굴 → 시트 → 질문 → 답» 을 실제로 눌러 본다.
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음). 홈(배 이름으로)과 항차 화면(publishMirCtx) 두 길을 다 잰다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import MirFab from '../src/components/MirFab.jsx';
import { publishMirCtx, flattenVoyages } from '../src/mirCtx.js';
import FX from './fixtures/mirone_live_260910.json';

window.__calls = [];
window.__fbShipBayDict = {};
window.__mirLexicon = {};
window.__publish = (key) => {
  const v = FX[key];
  publishMirCtx({ voyageKey: key, voyage: v, info: v.info, mode: 'discharge', containers: flattenVoyages({ [key]: v }, {}), compMap: Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {}) });
};
window.__unpublish = () => publishMirCtx(null);
function App() {
  return React.createElement(MirFab, { voyages: FX, inspector: '김성일', isChief: true, portMisData: {}, terminalWork: {}, pilotForecast: {}, heartbeat: null,
    onOpenPlan: (p) => { window.__calls.push({ fn: 'plan', ...p }); } });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
