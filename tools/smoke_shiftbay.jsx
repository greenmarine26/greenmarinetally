// 4.12-04 연막검사 진입점 — MCAP 639N 실데이터로 출력허브(PrintHubModal)를 열어 카고플랜을 누른다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import * as U from '../src/utils.js';
import fx from './fixtures/shiftbay_mcap639n.json';

window.__fbShipBayDict = { MCAP: fx.dict };
const voyage = { info: fx.info, discharge: fx.discharge, loading: {}, restowList: fx.restowList };
//  항차 화면 카고플랜(VoyagePage planOv)과 콘앱이 그리는 길 — 선박 전체 891대를 그대로 넘긴다. 출력허브가 이것과 같은 그림이어야 한다.
const direct = Object.values(U.ediMapFromRaw(fx.discharge)).map((c) => ({ ...c }));
window.__direct = direct.length;
createRoot(document.getElementById('root')).render(
  window.__SMOKE_WHICH === 'direct'
    ? React.createElement(PrintableCargoPlanV2, { containers: direct, shipImo: fx.dict.imo || '', shipName: 'AS PIA', voyNo: '639N', voyageInfo: fx.info, mode: 'discharge', shiftingMap: U.shiftingMapForDisplay('MCAP_639N', voyage), onClose: () => {} })
    : React.createElement(PrintHubModal, { voyage, voyageKey: 'MCAP_639N', onClose: () => {}, initialMode: window.__SMOKE_MODE || 'discharge', inspector: '연막' })
);
