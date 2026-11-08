// 4.77-01 화면 연막검사 진입점 — ① 작업 보고 창 첫 화면의 «호기 이동» 단추가 실제로 그려지고 눌리는가 ② 수석 상황판에 RZOR R123E 의 «램프(105)» 줄과 3호기 36대가 서는가
//   firebase.js 는 진짜 — SDK 만 메모리 DB(stub_fbdb_mem)로. 실 Firebase 에는 아무것도 안 쓴다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import ChiefDashboard from '../src/pages/ChiefDashboard.jsx';
import { setActiveWorkChoice } from '../src/workChoice.js';
import { qcWorkLoloFix } from '../src/utils.js';   // 앱은 firebase.js 데이터 문(_postVoyage)이 이 보정을 얹는다 — 여기서도 같은 함수를 얹는다
import RZ from './fixtures/rzor_r123e_477.json';

const root = createRoot(document.getElementById('root'));
const nowMs = Date.now();
const p2 = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const mkVoyage = () => {
  const comp = {}; Object.entries(RZ.discharge.completed || {}).forEach(([k, c], i) => { comp[k] = { ...c, at: c.at || (nowMs - (200 - i) * 60000) }; });
  return { info: { ...RZ.info, berth: '동부두 15번선석', terminalStatus: 'working', workStartAt: fmt(new Date(nowMs - 3 * 3600e3)), planDate: `${fmt(new Date(nowMs - 4 * 3600e3))} ~ ${fmt(new Date(nowMs + 4 * 3600e3))}`, voy_d: 'R123E', voy_l: 'R124W' },
    discharge: { ediContainers: RZ.discharge.ediContainers, completed: comp }, loading: {}, reports: {} };
};
window.__mode = window.__MODE || 'modal';
if (window.__mode === 'board') {
  setActiveWorkChoice({ mode: 'work', name: '김성일' });
  const voyages = { RZOR_R123E: qcWorkLoloFix(mkVoyage()) };
  const inspectors = { a: { name: '김성일', lastActive: nowMs - 5000, loggedIn: true } };
  root.render(React.createElement(ChiefDashboard, { voyages, inspectors, inspector: '김성일', onOpenVoyage() {}, onGoHome() {}, onOpenGlobalSearch() {}, collectorHb: null, pilotForecast: {}, portMisData: {}, onRefreshData() {}, refreshing: false, refreshedAt: 0 }));
} else {
  setActiveWorkChoice({ mode: window.__VIEW ? 'view' : 'work', name: '김성일' });
  const voyage = { info: { vsl: 'KKLC', voy: '2610N', voy_d: '2610N', voy_l: '2611S', pier: 'PNCT', berth: '동부두 15번선석' }, discharge: {}, loading: {}, reports: {} };
  window.__memdb = { voyages: { KKLC_2610N: { info: voyage.info, reports: {} } }, activeWork: {} };
  root.render(React.createElement(WorkReportModal, { open: true, voyageKey: 'KKLC_2610N', voyage, onClose() {}, lastEquip: '2호기', pageMode: 'discharge', inspector: '김성일' }));
}
