// 3.2 연막검사 진입점 — 실데이터 두 항차(ATPR 2640W 전체선적 366 · MCSC 633N 일부선적 1093/평택분 213)로 카고플랜 V2·베이플랜·베이상세를 그려 POD 무늬를 센다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import BayPlan from '../src/components/BayPlan.jsx';
import PrintableBayDetail from '../src/components/PrintableBayDetail.jsx';
import { podFeStyle, darkenTo } from '../src/utils.js';
import atpr from './fixtures/podpat_atpr.json';
import mcsc from './fixtures/podpat_mcsc.json';
import mamp from './fixtures/hatchmid_mamp.json';   // 3.36: 가장 큰 배(36베이) — **데크 전용 베이 42·43·45·46** 이 있는 유일한 픽스처
const FX = { ATPR: { fx: atpr, key: 'ATPR_2640W', name: 'ATLANTIC PIONEER', voy: '2640W' }, MCSC: { fx: mcsc, key: 'MCSC_633N', name: 'SEASPAN CALICANTO', voy: '633N' }, MAMP: { fx: mamp, key: 'MAMP_631N', name: 'MARSA PRIDE', voy: '631N', mode: 'discharge' } };
const ship = window.__SMOKE_SHIP || 'ATPR';
const { fx, key, name, voy } = FX[ship];
window.__fbShipBayDict = { [ship]: fx.dict };
const containers = Object.values(fx.edi).map((c) => ({ ...c }));
const voyageInfo = { vsl: ship, vslFull: name, voy_l: voy, voy };
//  3.39(감사 지적) — 수화물·규격초과·긴급 칸이 세 픽스처에 **0개**라 «새 칠이 그 표시를 안 덮는다» 항이
//    공허 통과였다. 검사가 직접 심을 수 있게 연다. **앱 코드가 아니라 이 진입점에서만** 손댄다.
if (window.__SMOKE_MARK) {
  const mt = containers.filter((c) => String(c.fe || '').toUpperCase() === 'E');
  const fu = containers.filter((c) => String(c.fe || '').toUpperCase() !== 'E');
  mt.slice(0, 6).forEach((c) => { c.lugg = true; });
  fu.slice(0, 2).forEach((c) => { c.lugg = true; });
  mt.slice(6, 12).forEach((c) => { c.ovw = 300; });
  mt.slice(12, 18).forEach((c) => { c.ovw = 300; c.ovh = 300; });
  mt.slice(18, 24).forEach((c) => { c.urgent = true; });
}
//  3.39 — 풀·엠티 차림 판정을 검사가 **직접** 부를 수 있게 연다(그림에 안 나오는 가지까지 잰다 · 감사 A6).
window.__podFeStyle = podFeStyle;
window.__darkenTo = darkenTo;
const which = (window.__SMOKE_WHICH || 'v2');
const mode = window.__SMOKE_MODE || FX[ship].mode || 'loading';
createRoot(document.getElementById('root')).render(
  which === 'baydetail'
    ? React.createElement(PrintableBayDetail, { containers, mode, voyageInfo, shipImo: fx.dict.imo || '', shipName: name, voyageKey: key, globalRowRange: null, globalTiers: [], onClose: () => {} })
    : which === 'bayplan'
    ? React.createElement(BayPlan, { containers, compMap: {}, xrayMap: {}, restowMap: { needsShift: {} }, mode, onOpenContainer: () => {},
        shipImo: fx.dict.imo || '', shipName: name, voyageInfo, voyageKey: key })
    //  3.33: 콘앱 뒤집기 검사용 — 'omit' 이면 prop 을 아예 안 넘겨 **기본값 자체**를 잰다.
    : React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: name, voyNo: voy, voyageInfo, mode, onClose: () => {},
        ...(window.__SMOKE_FLIP === 'omit' ? {} : { flipBays: !!window.__SMOKE_FLIP }) })
);
