// 4.89 연막 진입점 — 항차 화면(VoyagePage 실소스)을 그 mode 로 그린다. firebase SDK 는 메모리 스텁(tools/stub_fbdb_mem.js — 쓰기는 메모리만)
import React from 'react';
import { createRoot } from 'react-dom/client';
import VoyagePage from '../src/pages/VoyagePage.jsx';
import { setActivityUser } from '../src/activityLog.js';   // 4.89 재감사: 활동 사용자를 세워야 쓰기 검사가 실제로 무언가를 본다
setActivityUser('연막');
import FX from './fixtures/mirone_live_260910.json';
window.__renderVoyage = (key, mode) => {
  const el = document.getElementById('root');
  createRoot(el).render(React.createElement(VoyagePage, { voyageKey: key, voyage: FX[key], inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode }));
};
