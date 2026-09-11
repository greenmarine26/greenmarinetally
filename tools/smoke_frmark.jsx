// 3.43-03 연막검사 진입점 — SWTD 9013E 실데이터(양하 859·선적 105)로 카고플랜 V2·베이플랜을 그려 FR·OT 표기를 센다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import BayPlan from '../src/components/BayPlan.jsx';
import * as U from '../src/utils.js';
import { gradeSwap } from '../src/swapGrade.js';
import fx from './fixtures/frmark_swtd.json';

window.__fbShipBayDict = { SWTD: fx.dict };
const mode = window.__SMOKE_MODE || 'discharge';
const containers = Object.values(fx[mode]).map((c) => ({ ...c }));
const voyageInfo = { vsl: 'SWTD', vslFull: 'SAWASDEE THAILAND', voy_l: '9013E', voy: '9013E' };
//  판정 함수를 검사가 직접 부를 수 있게 연다(수정 전 트리에는 없으니 undefined 로 남는다).
window.__U = { isFlatRackContainer: U.isFlatRackContainer, isFlatRackIso: U.isFlatRackIso, legendLiveOf: U.legendLiveOf };
window.__gradeSwap = gradeSwap;
window.__rows = containers;
const which = window.__SMOKE_WHICH || 'v2';
createRoot(document.getElementById('root')).render(
  which === 'bayplan'
    ? React.createElement(BayPlan, { containers, compMap: {}, xrayMap: {}, restowMap: { needsShift: {} }, mode, onOpenContainer: () => {},
        shipImo: fx.dict.imo || '', shipName: 'SAWASDEE THAILAND', voyageInfo, voyageKey: 'SWTD_9013E' })
    : React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: 'SAWASDEE THAILAND', voyNo: '9013E', voyageInfo, mode, onClose: () => {} })
);
