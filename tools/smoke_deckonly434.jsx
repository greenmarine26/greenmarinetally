// 데크만 있는 베이의 셀 높이가 단 표기와 맞는지 재는 연막검사 진입점 (TallyOne 4.34) — MCAT 실사전(41·43·44/45 데크 8단)과 실 양하 EDI 321대.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import fx from './fixtures/deckonly434_mcat.json';

window.__fbShipBayDict = { MCAT: fx.dict };
window.alert = function () {};
window.print = function () {};
const containers = Object.values(fx.discharge).map((c) => ({ ...c }));
const voyageInfo = { vsl: 'MCAT', vslFull: 'ARTOTINA', voy_d: '640N', voy_l: '642S', voy: '640N' };
createRoot(document.getElementById('root')).render(
  React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: 'ARTOTINA', voyNo: '640N', voyageInfo, mode: 'discharge', inspector: '김성일', onClose: () => {} })
);
