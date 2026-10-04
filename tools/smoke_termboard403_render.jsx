// 4.03 수석 실시간 보드 카드 렌더 진입점 — 검수원 기록이 없는 PCTC·동방 배에 «터미널 본선 현황» 표가 서고, 호기 그림이 그려지는 배에는 안 서는지 DOM 으로 본다.
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음). 숫자는 실데이터 보관본(MCSC 638N 2026-10-04 16:22 · RZOR 10-03).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { craneBoardOf, applyCatosPos, applyAutoSwap } from '../src/utils.js';
import PCTC from './fixtures/termboard403_pctc_real.json';
import RZOR from './fixtures/termeta_rzor.json';
import DJCT from './fixtures/craneboard_djct.json';

window.__calls = [];
window.__fbShipBayDict = { DJCT: DJCT.bayDict };

const card = (id, key, info, voyage, extra = {}, cranesOverride = null) => {
  const dis = { total: extra.dTot || 0, done: 0, pct: 0 }, loa = { total: extra.lTot || 0, done: 0, pct: 0 };
  const v = { key, info, dis, loa, totalDone: 0, totalAll: dis.total + loa.total };
  const cranes = cranesOverride || craneBoardOf(voyage, []);
  const tw = { disPlan: dis.total, disDone: 0, lodPlan: loa.total, lodDone: 0, pct: 0, updatedAt: Date.now() - 60000 };
  return React.createElement('div', { key: id, 'data-scn': id, style: { width: 900, height: 360, display: 'flex' } },
    React.createElement(LiveShipCard, { v, workers: [], lastReport: null, alerts: null, tw, departed: false, cranes, voyage, rows: 1, focused: false, canFocus: false, onFocus: () => {}, onOpen: () => {}, onOpenContainer: () => {} }));
};

//  A: PCTC — 검수원 기록 0건, 터미널 본선작업현황만 있다
const infoA = { ...PCTC.MCSC_638N, vsl: 'MCSC' };
const vA = { info: infoA, discharge: { ediContainers: {}, completed: {}, termWork: {} }, loading: { ediContainers: {}, completed: {}, termWork: {} } };
//  B: 동방 — 검수원 기록 0건, qcWork(QC별) 만 있다(호기 칸은 «완료 기록이 와야 그림이 뜹니다» 로 서던 자리)
const infoB = { ...RZOR, vsl: 'RZOR' };
const vB = { info: infoB, discharge: { ediContainers: {}, completed: {}, termWork: {} }, loading: { ediContainers: {}, completed: {}, termWork: {} } };
//  C: 호기 그림이 그려지는 배(DJCT 실데이터) — 같은 info 에 PCTC termStat 이 있어도 표는 안 서야 한다
const vC0 = applyAutoSwap(applyCatosPos({ info: { ...DJCT.info, vsl: 'DJCT', voy_d: '0223E', voy_l: '0224W', termStat: PCTC.MCSC_638N.termStat },
  discharge: { termWork: DJCT.termWork, completed: DJCT.completed, ediContainers: DJCT.ediContainers, records: DJCT.records },
  loading: { ediContainers: DJCT.loadingEdi, termWork: DJCT.loading_termWork || {}, completed: DJCT.loading_completed || {}, records: DJCT.loading_records || {} } }));
//  D: 터미널 자료도 검수원 기록도 없는 배 — 종전 안내 한 줄 그대로
const infoD = { vsl: 'ZZZZ', berth: '동부두 8번선석', pier: 'PCTC' };
const vD = { info: infoD, discharge: { ediContainers: {}, completed: {}, termWork: {} }, loading: { ediContainers: {}, completed: {}, termWork: {} } };

//  E: 동방 QC 4개(전부 완료 있음)·검수원 기록 0건·자리 없음 — 표가 서고 «+N칸 더» 단추는 펼칠 것이 없어 서지 않는다
const infoE = { ...RZOR, vsl: 'RZOR', qcWork: { QC101: { qc: 'QC101', total: 40, disDone: 20, lodDone: 20, disRest: 0, lodRest: 0 }, QC102: { qc: 'QC102', total: 40, disDone: 20, lodDone: 20, disRest: 0, lodRest: 0 }, QC103: RZOR.qcWork.QC103, QC104: { qc: 'QC104', total: 30, disDone: 10, lodDone: 10, disRest: 5, lodRest: 5 } } };
const vE = { info: infoE, discharge: { ediContainers: {}, completed: {}, termWork: {} }, loading: { ediContainers: {}, completed: {}, termWork: {} } };
//  F: 접혀서 안 보이는 4번째 호기에 그림이 그려질 자리(bay)가 있다 — 표가 서면 안 된다(종전 화면 그대로 «+1칸 더»)
const infoF = { ...RZOR, vsl: 'RZOR' };
const vF = { info: infoF, discharge: { ediContainers: {}, completed: {}, termWork: {} }, loading: { ediContainers: {}, completed: {}, termWork: {} } };
const mkCrane = (no, extra) => ({ no, name: '', mode: 'discharge', bay: '', row: '', tier: '', cn: '', done: 20, dis: 10, lod: 10, lastAt: Date.now() - 60000, src: 'qc', qc: true, ...extra });
const cranesF = [mkCrane(1), mkCrane(2), mkCrane(3), mkCrane(4, { bay: '18', src: 'live', qc: false, name: '김검수' })];

function App() {
  return React.createElement('div', null,
    card('A', 'MCSC_638N', infoA, vA, { dTot: 277, lTot: 230 }),
    card('B', 'RZOR_R110E', infoB, vB, { dTot: 164, lTot: 194 }),
    card('C', 'DJCT_0223E', vC0.info, vC0, { dTot: 251, lTot: 274 }),
    card('D', 'ZZZZ_0001E', infoD, vD, {}),
    card('E', 'RZOR_R111E', infoE, vE, { dTot: 164, lTot: 194 }),
    card('F', 'RZOR_R112E', infoF, vF, { dTot: 164, lTot: 194 }, cranesF));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
