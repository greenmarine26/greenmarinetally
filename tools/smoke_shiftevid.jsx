// 4.13 연막검사 진입점 — 시프팅 근거 표시(상태 딱지·근거 한 줄·컨별 대조)를 MCAP 639N 실자료로 실제 ListTab 에 그린다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListTab } from '../src/pages/VoyagePage.jsx';
import * as U from '../src/utils.js';
import { answerOneRaw } from '../src/mir.js';
import FX from './fixtures/shiftevid_mcap639n.json';
import FX2 from './fixtures/shift_actual_real.json';

window.__SE = { U, FX, FX2, answerOneRaw };
let setRef = null;
function App() {
  const [st, setSt] = React.useState({ list: [], info: null });
  setRef = setSt;
  return React.createElement('div', { id: 'lt' },
    React.createElement(ListTab, { voyageKey: 'MCAP_639N', mode: 'discharge', containers: [], ediMap: {}, recMap: {}, xrayMap: {}, xraySeals: {}, compMap: {},
      inspector: '', onOpenContainer: () => {}, shiftingList: st.list, shiftInfo: st.info }));
}
window.__setShift = (list, info) => setRef && setRef({ list, info });
createRoot(document.getElementById('root')).render(React.createElement(App));
