// 보드 확대(3.17) 미리보기 — 같은 카드를 100% 와 150% 로 나란히 그려 단추가 무엇을 하는지 보인다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf, applyCatosPos, applyAutoSwap } from '../src/utils.js';
import FX from './fixtures/liveboard_obwh.json';
window.__fbShipBayDict = { OBWH: FX.bayDict };
const voyage = applyAutoSwap(applyCatosPos({ info: { ...FX.info, vsl: 'OBWH' }, discharge: FX.discharge, loading: FX.loading }));
const dis = { total: Object.keys(FX.discharge.ediContainers).length, done: Object.keys(FX.discharge.completed).length, pct: 0 };
const loa = { total: Object.keys(FX.loading.ediContainers).length, done: Object.keys(FX.loading.completed).length, pct: 0 };
const v = { key: 'OBWH_2731E', info: voyage.info, dis, loa, totalDone: dis.done + loa.done, totalAll: dis.total + loa.total };
const cranes = craneBoardOf(voyage, []);
const tw = { disPlan: dis.total, disDone: dis.done, lodPlan: loa.total, lodDone: loa.done, pct: 100, updatedAt: Date.now() - 60000 };
const card = (z) => React.createElement('div', { style: { height: '46vh', minHeight: 320, marginBottom: 10 } },
  React.createElement(LiveShipCard, { v, workers: [], lastReport: null, alerts: null, tw, departed: false, cranes,
    voyage, rows: 2, focused: false, canFocus: true, zoom: z,
    onFocus: () => {}, onOpen: () => {}, onOpenContainer: () => {} }));
function App() {
  return React.createElement('div', null,
    React.createElement('div', { className: 'pv-h' }, '2척일 때의 한 줄 — 확대 100%'), card(1),
    React.createElement('div', { className: 'pv-h' }, '같은 줄 — 확대 150% (칸 안에서 스크롤)'), card(1.5));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
