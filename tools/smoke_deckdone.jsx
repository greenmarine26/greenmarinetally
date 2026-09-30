// RZOR 양하 덱플랜 «완료 칸이 눌러 보지 않고도 보인다»(3.72)를 실소스 DeckPlanView 로 그리는 연막검사 진입점 — 검수사 2026-09-30 «RZOR 양하시 실시간으로 덱플랜에서 확인할수 있게 해주세요 지금은 클릭해야 양하 되었는지 안되었는지 알수 있습니다».
//   실데이터 tools/fixtures/rzor_discharge_R107E_deckdone.json(RTDB voyages/RZOR_R107E/discharge — 선사 덱플랜 196대 · 완료 116대(전부 터미널 반영) · 2026-09-30 16:48 KST).
import React from 'react';
import { createRoot } from 'react-dom/client';
import DeckPlanView from '../src/components/DeckPlanView.jsx';
import F from './fixtures/rzor_discharge_R107E_deckdone.json';

window.__F = F;
window.__opened = [];
//  화면은 RTDB 구독으로 완료가 오면 같은 컴포넌트를 다시 그린다 — 검사는 그 다시 그림을 이 함수로 흉내 낸다(같은 뿌리에 다시 render).
window.__render = ({ plan = F.plan, compMap = F.completed, nowMs = 0, mode = 'discharge', containers = F.containers } = {}) => {
  const el = document.getElementById('root');
  if (!window.__root) window.__root = createRoot(el);
  window.__root.render(React.createElement(DeckPlanView, { plan, containers, compMap, xrayMap: {}, voyageKey: 'RZOR_R107E', mode, inspector: '검수원A', nowMs, onOpenContainer: (c) => window.__opened.push(c && c.cn) }));
};
window.__unmount = () => { if (window.__root) { window.__root.unmount(); window.__root = null; } };
