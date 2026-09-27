// 3.64-01 연막검사 진입점 — «🏗 오늘 장비별 작업 보고» 부두별 줄을 실데이터(09-28 새벽 4호기 두 부두)로 실제 컴포넌트에 그린다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { EquipReportBoard } from '../src/pages/ChiefDashboard.jsx';
import { equipReportBoard, voyagePierOf, getPierFromBerth, EQUIP_UNKNOWN_PIER } from '../src/utils.js';
import FX from './fixtures/equip_reports_real.json';

window.__EQP = { equipReportBoard, voyagePierOf, getPierFromBerth, EQUIP_UNKNOWN_PIER, FX };

//  검사 쪽(smoke_equippier.cjs)이 판을 골라 넣고 다시 그린다.
let setBoardRef = null;
function App() {
  const [board, setBoard] = React.useState({ total: 0, rows: [] });
  setBoardRef = setBoard;
  return React.createElement('div', { id: 'eqp' }, React.createElement(EquipReportBoard, { board, capped: false }));
}
window.__setBoard = (b) => setBoardRef && setBoardRef(b);
createRoot(document.getElementById('root')).render(React.createElement(App));
