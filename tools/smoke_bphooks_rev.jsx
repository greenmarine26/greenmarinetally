// BayPlan 훅 순서 — 자료가 «없다 ↔ 있다» 로 바뀌어도 화면이 안 죽는가(3.35).
//   ⛔ 3.35 첫 판이 훅 셋을 `containers.length === 0` 조기 반환 **뒤**에 두어 React 가 통째로 죽었다.
//   감사 실측 — «Rendered more hooks than during the previous render» · 화면 0자.
//   EDI 가 늦게 오거나 양하↔선적 탭을 누르면 걸리는 길이라 보드·베이플랜 탭이 같이 죽었다.
// (원래 주석) 감사 — BayPlan 훅 순서: containers 가 [] → 채워짐 으로 바뀌면 React 가 «Rendered more hooks» 로 죽는가.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf, applyCatosPos, applyAutoSwap } from '../src/utils.js';
import FX from './fixtures/craneboard_djct.json';

window.__calls = [];
window.__err = [];
window.__fbShipBayDict = { DJCT: FX.bayDict };

const mk = (withEdi) => applyAutoSwap(applyCatosPos({
  info: { ...FX.info, vsl: 'DJCT', voy_d: '0223E', voy_l: '0224W' },
  discharge: { termWork: FX.termWork, completed: FX.completed, ediContainers: withEdi ? FX.ediContainers : {}, records: withEdi ? FX.records : {} },
  loading: { ediContainers: withEdi ? FX.loadingEdi : {}, termWork: FX.loading_termWork || {}, completed: FX.loading_completed || {}, records: withEdi ? (FX.loading_records || {}) : {} },
}));

const vEmpty = mk(false), vFull = mk(true);
const dis = { total: 251, done: Object.keys(FX.completed).length, pct: 0 };
const loa = { total: 274, done: 0, pct: 0 };
const v = { key: 'DJCT_0223E', info: vFull.info, dis, loa, totalDone: dis.done, totalAll: 525 };
const cranes = craneBoardOf(vFull, []);   // 호기·베이는 termWork 기준이라 두 경우가 같다 — BayPlan 이 계속 붙어 있다

function App() {
  const [full, setFull] = React.useState(true);
  window.__setFull = (x) => setFull(!x);
  return React.createElement(LiveShipCard, {
    v, workers: [], lastReport: null, alerts: null, tw: null, departed: false, cranes,
    voyage: full ? vFull : vEmpty, rows: 1, focused: false, canFocus: true,
    onFocus: () => {}, onOpen: () => {}, onOpenContainer: () => {},
  });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
