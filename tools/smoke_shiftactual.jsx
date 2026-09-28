// 3.65 연막검사 진입점 — 시프팅 목록(양하·선적·실제)을 실데이터(MCSN 639S · XTPG 541W 카토스 사본)로 실제 컴포넌트에 그린다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListTab } from '../src/pages/VoyagePage.jsx';
import ValidationBox from '../src/components/ValidationBox.jsx';
import { shiftingListOf, shiftActualOf, restowActualExtra, fmtShiftPos, restowMapFromDoc } from '../src/utils.js';
import { generateInspectionListHTML } from '../src/inspectionList.js';
import FX from './fixtures/shift_actual_real.json';

window.__SA = { shiftingListOf, shiftActualOf, restowActualExtra, fmtShiftPos, restowMapFromDoc, generateInspectionListHTML, FX };

//  검증 박스는 EDI 가 한 대라도 있어야 그려진다 — 같은 배 일반 선적 한 대(카토스 CAAU4518954 30-10-04 · 09-28 03:13:29)를 준다.
const VB_EDI = [{ cn: 'CAAU4518954', pol: 'KRPTK', pod: 'CNTAO', iso: '4510', fe: 'F', op: 'MAE', bay: '30', row: '10', tier: '04' }];
//  검사 쪽(smoke_shiftactual.cjs)이 목록을 골라 넣고 다시 그린다.
let setRef = null;
function App() {
  const [st, setSt] = React.useState({ list: [], info: null });
  setRef = setSt;
  return React.createElement('div', null,
    React.createElement('div', { id: 'lt' },
      React.createElement(ListTab, { voyageKey: 'MCSN_637N', mode: 'loading', containers: [], ediMap: {}, recMap: {}, xrayMap: {}, xraySeals: {}, compMap: {},
        inspector: '', onOpenContainer: () => {}, shiftingList: st.list, shiftInfo: st.info })),
    React.createElement('div', { id: 'vb' },
      React.createElement(ValidationBox, { ediContainers: VB_EDI, records: [], mode: 'loading', shiftingList: st.list, voyageKey: 'MCSN_637N' })));
}
window.__setShift = (list, info) => setRef && setRef({ list, info });
createRoot(document.getElementById('root')).render(React.createElement(App));
