// RZOR 선적 덱플랜 빈자리 조회창(3.70)을 실소스로 그리는 연막검사 진입점 — 검수사 2026-09-30 «빈덱에서 빈곳을 클릭하면 컨번호 조회가 되게하고 조회후 컨을 선택할수 있게».
//   실데이터 tools/fixtures/rzor_termwork_R106E.json(RTDB voyages/RZOR_R106E/loading 의 컨 191대·동방 실적). 실적을 비우면 «선적 전»(전부 빈자리), 일부만 주면 예측 컨이 생긴다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import DeckPlanView from '../src/components/DeckPlanView.jsx';
import { buildRzorLoadingDeckPlan } from '../src/rzorDeckPredict.js';
import F from './fixtures/rzor_termwork_R106E.json';

window.__F = F;
window.__conts = F.containers.map((c) => ({ ...c, pod: 'CNRZH' }));
//  화면은 RTDB 구독으로 확정 자리(assign)·완료가 오면 다시 그린다 — 검사는 그 다시 그림을 이 함수로 흉내 낸다.
window.__render = ({ containers = window.__conts, termWork = {}, assign = null, uploadedPlan = null, compMap = {}, mode = 'loading' } = {}) => {
  const plan = uploadedPlan || buildRzorLoadingDeckPlan({ containers, termWork, bayWork: F.bayWork || null, assign, voy: 'R106W' });
  window.__plan = plan;
  const el = document.getElementById('root');
  if (window.__root) window.__root.unmount();
  window.__root = createRoot(el);
  window.__root.render(React.createElement(DeckPlanView, { plan, containers, compMap, xrayMap: {}, voyageKey: 'V1', mode, inspector: '검수원A', onOpenContainer: () => {} }));
};
