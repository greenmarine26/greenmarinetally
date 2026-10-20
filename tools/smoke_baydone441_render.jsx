// 수석 상황판 «완료·남은 베이»(4.41) 렌더 연막 진입점 — TMPZ 2035E·DXQD 2641E·STSE 2681E 실데이터 사본으로 배 카드(LiveShipCard)를 그려 그림 칸 머리줄에 줄이 서는지 본다(STSE 는 검수원 접속 — 호기 그림 머리줄, 나머지는 터미널 표 머리줄 · firebase 는 스텁).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf, applyCatosPos, applyAutoSwap } from '../src/utils.js';
import FX from './fixtures/baydone441.json';

window.__calls = [];
window.__fbShipBayDict = FX.bayDict;
const cards = ['TMPZ_2035E', 'DXQD_2641E', 'STSE_2681E'].map((vk) => {
  const raw = FX.voyages[vk];
  const code = vk.split('_')[0];
  const voyage = applyAutoSwap(applyCatosPos({ info: { ...raw.info, vsl: code }, discharge: raw.discharge, loading: raw.loading }));
  const n = (m) => Object.keys((raw[m] || {}).ediContainers || {}).length, d = (m) => Object.keys((raw[m] || {}).completed || {}).length;
  const dis = { total: n('discharge'), done: d('discharge'), pct: 0 }, loa = { total: n('loading'), done: d('loading'), pct: 0 };
  const v = { key: vk, info: voyage.info, dis, loa, totalDone: dis.done + loa.done, totalAll: dis.total + loa.total };
  return { vk, voyage, v, cranes: craneBoardOf(voyage, []) };
});
function App() {
  return React.createElement('div', null, cards.map(({ vk, voyage, v, cranes }) => React.createElement('div', { key: vk, 'data-card': vk },
    React.createElement(LiveShipCard, { v, workers: vk === 'STSE_2681E' ? [{ name: '검수원', mode: 'discharge' }] : [], lastReport: null, alerts: null, departed: false, cranes, voyage, rows: 3, focused: false, canFocus: true,
      onFocus: () => {}, onOpen: () => {}, onOpenContainer: () => {} }))));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
