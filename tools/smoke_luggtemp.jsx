// 수화물 리퍼 온도 제외(3.70-01) 연막검사 진입점 — 컨 상세·큰 카드를 실소스로 그린다(검수사 2026-09-30 RZOR R107E CICU9635360).
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import BigResultCard from '../src/components/BigResultCard.jsx';
import * as U from '../src/utils.js';
import * as TR from '../src/tallyReport.js';
import F from './fixtures/lugg_rzor_r107e.json';

window.__F = F;
window.__U = U;
window.__TR = TR;
window.__render = (which, c, vInfo) => {
  const el = document.getElementById('root');
  if (window.__root) window.__root.unmount();
  window.__root = createRoot(el);
  const node = which === 'card'
    ? React.createElement(BigResultCard, { c, voyageKey: 'V1', inspector: '검수원A', allContainers: [c], mode: 'discharge' })
    : React.createElement(ContainerDetailModal, { c, mode: 'discharge', voyageKey: 'V1', inspector: '검수원A', onClose: () => {}, allContainers: [c], voyageInfo: vInfo === undefined ? { forecast: F.forecast } : vInfo });
  window.__root.render(node);
};
