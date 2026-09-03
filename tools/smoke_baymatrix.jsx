// 베이매트릭스 관리 화면(3.5) 렌더 연막검사 진입점 — 실제 사전 스냅샷으로 그리고 눌러 본다.
//   검수사 지시 2026-09-03 — «19개를 선택할수있는 칸을 만들어 화면에 띄우고 선박마다 비고란을 만들어 주세요»
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음, window.__calls 에 인자만 남긴다).
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import BayMatrixManagerModal from '../src/components/BayMatrixManagerModal.jsx';
import FX from './fixtures/baymatrix_rows.json';

window.__gmMatrixEditors = ['김성일'];
try { localStorage.setItem('master_active_inspector_v1', '김성일'); } catch (e) { /* jsdom 저장소 없음 */ }
window.__fbShipBayDict = FX.dict;
createRoot(document.getElementById('root')).render(
  React.createElement(BayMatrixManagerModal, {
    onClose: () => { window.__calls.push({ fn: 'close' }); },
    voyages: FX.voyages, shipLib: FX.shipLib, arcList: FX.arcList, inspector: '김성일',
  })
);
