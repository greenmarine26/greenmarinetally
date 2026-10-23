// 4.45-02 연막검사 진입점 — 주의 박스 «예상 실오류»(자릿수 부족·컨번호와 같은 씰)와 «씰 모양 다름»(참고)을 실데이터(MAMP 641N · MCAP 639N)로 나눠 본다.
//   검수사 2026-10-24 06:28 «씰모양이 다른거랑 실번호 즉 실오류 와는 다른 관점으로 봐야 합니다. 말대로 씰 모양이 다르면 실번호 형식도 다를수 있습니다» · «mamp 선박입니다».
import React from 'react';
import { createRoot } from 'react-dom/client';
import DiagnosticsPanel from '../src/components/DiagnosticsPanel.jsx';
import { runDiagnostics } from '../src/diagnostics.js';
import { sealFormatAnomalies, ediSealMapOf } from '../src/utils.js';
import { answerAboutAlert, sealPredictOf } from '../src/nlSearch.js';
import FX from './fixtures/sealkind44502.json';
import MCAP from './fixtures/mcap639N_seals.json';

window.__T = { runDiagnostics, sealFormatAnomalies, ediSealMapOf, answerAboutAlert, sealPredictOf, FX, MCAP };
const root = createRoot(document.getElementById('root'));
window.__opened = [];
window.__renderDiag = (alerts) => {
  root.render(React.createElement(DiagnosticsPanel, { alerts, autoSpeak: false, onToggleSpeak: () => {}, onOpenContainer: (cn) => window.__opened.push(cn) }));
};
