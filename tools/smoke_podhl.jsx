// 3.1 연막검사 진입점 — ATPR 2640W 실데이터(선적 EDI 366·사전 21베이)로 카고플랜 V2·베이플랜을 그려 위해(WEI)행 빗금을 센다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import BayPlan from '../src/components/BayPlan.jsx';
import PrintableBayDetail from '../src/components/PrintableBayDetail.jsx';
import fx from './fixtures/podhl_atpr.json';
window.__fbShipBayDict = { ATPR: fx.dict };
const containers = Object.values(fx.edi).map((c) => ({ ...c, _inList: true }));
window.__PODHL_EXPECT = { wei: containers.filter((c) => c.pod === 'CNWEI').length, dlc: containers.filter((c) => c.pod === 'CNDLC').length };
const voyageInfo = { vsl: 'ATPR', vslFull: 'ATLANTIC PIONEER', voy_l: '2640W', voy: '2640W' };
const which = (window.__SMOKE_WHICH || 'v2');
createRoot(document.getElementById('root')).render(
  which === 'baydetail'
    ? React.createElement(PrintableBayDetail, { containers, mode: 'loading', voyageInfo, shipImo: fx.dict.imo || '', shipName: 'ATLANTIC PIONEER', voyageKey: 'ATPR_2640W', globalRowRange: null, globalTiers: [], onClose: () => {} })
    : which === 'bayplan'
    ? React.createElement(BayPlan, { containers, compMap: {}, xrayMap: {}, restowMap: { needsShift: {} }, mode: 'loading', onOpenContainer: () => {},
        shipImo: fx.dict.imo || '', shipName: 'ATLANTIC PIONEER', voyageInfo, voyageKey: 'ATPR_2640W' })
    : React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: 'ATLANTIC PIONEER', voyNo: '2640W', voyageInfo, mode: 'loading', onClose: () => {} })
);
