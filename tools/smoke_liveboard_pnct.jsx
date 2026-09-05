// 동방(PNCT) 실시간 작업 보드 카드(3.15) 렌더 진입점 — OBWH 2731E 실데이터 사본으로 «지금 작업 중인 베이» 그림이 실제로 서는지 본다.
//   동방은 컨별 자리·호기가 안 오므로(termWork 에 pos·equip 없음) 호기 칸 대신 베이 칸이 서야 한다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf, applyCatosPos, applyAutoSwap } from '../src/utils.js';
import FX from './fixtures/liveboard_obwh.json';

window.__calls = [];
window.__fbShipBayDict = { OBWH: FX.bayDict };
const voyage = applyAutoSwap(applyCatosPos({ info: { ...FX.info, vsl: 'OBWH' },
  discharge: FX.discharge, loading: FX.loading }));
const dis = { total: Object.keys(FX.discharge.ediContainers).length, done: Object.keys(FX.discharge.completed).length, pct: 0 };
const loa = { total: Object.keys(FX.loading.ediContainers).length, done: Object.keys(FX.loading.completed).length, pct: 0 };
const v = { key: 'OBWH_2731E', info: voyage.info, dis, loa, totalDone: dis.done + loa.done, totalAll: dis.total + loa.total };
const cranes = craneBoardOf(voyage, []);
const tw = { disPlan: dis.total, disDone: dis.done, lodPlan: loa.total, lodDone: loa.done, pct: 100, updatedAt: Date.now() - 60000 };
function App() {
  const [focused, setFocused] = React.useState(false);
  window.__setFocused = setFocused;
  return React.createElement(LiveShipCard, {
    v, workers: [], lastReport: null, alerts: null, tw, departed: false, cranes,
    voyage, rows: 1, focused, canFocus: true,
    onFocus: () => { window.__calls.push({ fn: 'focus' }); setFocused((f) => !f); },
    onOpen: () => { window.__calls.push({ fn: 'open' }); },
    onOpenContainer: (c, mode) => { window.__calls.push({ fn: 'detail', cn: c && c.cn, mode }); },
  });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
