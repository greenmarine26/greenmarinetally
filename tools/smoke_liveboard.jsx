// 실시간 작업 보드 카드(3.10) 렌더 연막검사 진입점 — DJCT 0223E 실데이터 사본으로 한 척 카드를 그려 «왼쪽 통계 · 오른쪽 호기별 작업 베이»가 DOM 에 실제로 서는지 본다.
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf } from '../src/utils.js';
import FX from './fixtures/craneboard_djct.json';

window.__calls = [];
const voyage = { info: { ...FX.info, vsl: 'DJCT', voy_d: '0223E', voy_l: '0224W' }, discharge: { termWork: FX.termWork, completed: FX.completed }, loading: {} };
const dis = { total: 251, done: Object.keys(FX.completed).length, pct: 0 };
const loa = { total: 274, done: 0, pct: 0 };
const v = { key: 'DJCT_0223E', info: voyage.info, dis, loa, totalDone: dis.done, totalAll: 525 };
const cranes = craneBoardOf(voyage, []);
const tw = { disPlan: 251, disDone: 126, lodPlan: 274, lodDone: 0, pct: 24, updatedAt: Date.now() - 60000 };
function App() {
  const [focused, setFocused] = React.useState(false);
  window.__setFocused = setFocused;
  return React.createElement(LiveShipCard, {
    v, workers: [], lastReport: null, alerts: null, tw, departed: false, cranes,
    focused, canFocus: true,
    onFocus: () => { window.__calls.push({ fn: 'focus' }); setFocused((f) => !f); },
    onOpen: () => { window.__calls.push({ fn: 'open' }); },
  });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
