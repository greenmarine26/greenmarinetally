// 3.2 연막검사 진입점 — 실데이터 두 항차(ATPR 2640W 전체선적 366 · MCSC 633N 일부선적 1093/평택분 213)로 카고플랜 V2·베이플랜·베이상세를 그려 POD 무늬를 센다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import BayPlan from '../src/components/BayPlan.jsx';
import PrintableBayDetail from '../src/components/PrintableBayDetail.jsx';
import atpr from './fixtures/podpat_atpr.json';
import mcsc from './fixtures/podpat_mcsc.json';
const FX = { ATPR: { fx: atpr, key: 'ATPR_2640W', name: 'ATLANTIC PIONEER', voy: '2640W' }, MCSC: { fx: mcsc, key: 'MCSC_633N', name: 'SEASPAN CALICANTO', voy: '633N' } };
const ship = window.__SMOKE_SHIP || 'ATPR';
const { fx, key, name, voy } = FX[ship];
window.__fbShipBayDict = { [ship]: fx.dict };
const containers = Object.values(fx.edi).map((c) => ({ ...c }));
const voyageInfo = { vsl: ship, vslFull: name, voy_l: voy, voy };
const which = (window.__SMOKE_WHICH || 'v2');
const mode = window.__SMOKE_MODE || 'loading';
createRoot(document.getElementById('root')).render(
  which === 'baydetail'
    ? React.createElement(PrintableBayDetail, { containers, mode, voyageInfo, shipImo: fx.dict.imo || '', shipName: name, voyageKey: key, globalRowRange: null, globalTiers: [], onClose: () => {} })
    : which === 'bayplan'
    ? React.createElement(BayPlan, { containers, compMap: {}, xrayMap: {}, restowMap: { needsShift: {} }, mode, onOpenContainer: () => {},
        shipImo: fx.dict.imo || '', shipName: name, voyageInfo, voyageKey: key })
    : React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: name, voyNo: voy, voyageInfo, mode, onClose: () => {} })
);
