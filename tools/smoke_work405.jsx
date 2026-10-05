// 4.05 렌더 진입점 — ① 수석 실시간 보드: 앱 입력이 멈춘 배(OBWH 2757E 실데이터)는 터미널 본선 현황 표, 접속 검수원이 있거나 방금 찍은 배는 베이 그림 ② 항차 목록 카드: 터미널 작업중 표시·본선 집계.
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음). 숫자는 보관소 실측(2026-10-05 15:5x KST, 읽기 전용) — tools/fixtures/work405_realtime.json.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveShipCard } from '../src/pages/ChiefDashboard.jsx';
import { VoyageCard } from '../src/pages/HomePage.jsx';
import { craneBoardOf, applyCatosPos } from '../src/utils.js';
import F from './fixtures/work405_realtime.json';

window.__calls = [];
const now = Date.now();
const emptySec = () => ({ ediContainers: {}, completed: {}, termWork: {}, records: {} });

const card = (id, key, info, voyage, workers = []) => {
  const dis = { total: 183, done: 2, pct: 1 }, loa = { total: 254, done: 0, pct: 0 };
  const v = { key, info, dis, loa, totalDone: 2, totalAll: 437 };
  const cranes = craneBoardOf(voyage, workers);
  const tw = { disPlan: 183, disDone: 2, lodPlan: 254, lodDone: 0, pct: 0, updatedAt: now - 60000 };
  return React.createElement('div', { key: id, 'data-scn': id, style: { width: 900, height: 360, display: 'flex' } },
    React.createElement(LiveShipCard, { v, workers, lastReport: null, alerts: null, tw, departed: false, cranes, voyage, rows: 1, focused: false, canFocus: false, onFocus: () => {}, onOpen: () => {}, onOpenContainer: () => {} }));
};

//  G: OBWH 2757E 실데이터 — 앱 완료 2건(3.5시간 전, 이인철 1호기)이 마지막이고 접속 검수원 없음
const vG = applyCatosPos({ info: { ...F.info, vsl: 'OBWH' }, discharge: { ...emptySec(), completed: F.discharge.completed, ediContainers: F.discharge.ediContainers, records: F.discharge.records }, loading: emptySec() });
//  H: 같은 자료 + 접속 검수원이 있다 — 그림이 그대로
const wH = [{ name: '이인철', equip: '1호기', bay: '2', tier: '', mode: 'discharge' }];
//  I: 같은 자료인데 마지막 앱 완료가 5분 전 — 그림이 그대로
const compI = {}; for (const [cn, r] of Object.entries(F.discharge.completed)) compI[cn] = { ...r, at: now - 5 * 60000 };
const vI = applyCatosPos({ info: { ...F.info, vsl: 'OBWH' }, discharge: { ...emptySec(), completed: compI, ediContainers: F.discharge.ediContainers, records: F.discharge.records }, loading: emptySec() });

//  M: 감사 발견 — A(1호기·자리 있음·3시간 전) + B(호기를 안 고름·5분 전). 접속 검수원 없음(폰 잠금 90초 뒤). 마지막 앱 입력은 5분 전이므로 그림이 그대로여야 한다.
const cnsM = Object.keys(F.discharge.ediContainers);
const [cA, cB] = cnsM;
const recsM = JSON.parse(JSON.stringify(F.discharge.records));
recsM[cA] = { ...(recsM[cA] || {}), bay_actual: '02', row_actual: '02', tier_actual: '82' };
const compM = { [cA]: { at: now - 3 * 3600000, by: '이인철', equip: '1호기' }, [cB]: { at: now - 5 * 60000, by: '김검수' } };
const vM = applyCatosPos({ info: { ...F.info, vsl: 'OBWH' }, discharge: { ...emptySec(), completed: compM, ediContainers: F.discharge.ediContainers, records: recsM }, loading: emptySec() });
//  M2: 경계 — 같은 자료에서 B 가 29분 전(그림 유지) / 31분 전(표)
const mkBnd = (min) => applyCatosPos({ info: { ...F.info, vsl: 'OBWH' }, discharge: { ...emptySec(), completed: { [cA]: { at: now - 3 * 3600000, by: '이인철', equip: '1호기' }, [cB]: { at: now - min * 60000, by: '김검수' } }, ediContainers: F.discharge.ediContainers, records: recsM }, loading: emptySec() });
const vB29 = mkBnd(29), vB31 = mkBnd(31);

//  항차 목록 카드 — RZOR R109E 실데이터(작업중·작업시작 10:25 · 동방 호기 합계) · 검수원 접속 없음
const mkVoy = (key, info, d, l, extra = {}) => ({ key, info, discharge: d, loading: l, _pier: 'PNCT', _berth: info.berth, _etaMs: now - 5 * 3600000, _etdMs: now + 3 * 3600000, _hasData: true, ...extra });
//  시각은 지금 기준(KST 문자열)으로 맞춘다 — 보관 값(10-05 10:25)을 그대로 쓰면 날이 지난 뒤 «작업 시간 밖» 판정이 달라져 검사가 흔들린다. 숫자(호기 합계 등)는 실측 그대로.
const kst = (ms) => { const d = new Date(ms); const p2 = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };   // 감사(4.05): 앱은 기계 시각을 KST 로 읽는다 — 로컬 getter 로 만들어야 빌드 기계가 UTC 여도 같다
const liveInfo = { ...F.rzorInfo, atbActual: kst(now - 4 * 3600000), workStartAt: kst(now - 3.5 * 3600000), planDate: `${kst(now - 4 * 3600000)} ~ ${kst(now + 5 * 3600000)}`, planDis: 148, planLod: 162 };
const vR = mkVoy('RZOR_R109E', liveInfo, { ...emptySec(), ediContainers: F.rzorDisEdi }, { ...emptySec(), ediContainers: F.rzorLodEdi });
//  동방 화면(2026-10-05 15:10:42 캡처)의 QC 표 그대로 — QC103 총74 완료 29·3 잔여 0·42 / QC105 총236 완료 119·72 잔여 0·45 → 합계 완료 148·75 잔여 0·87
const qcShot = { QC103: { qc: 'QC103', total: 74, disDone: 29, lodDone: 3, disRest: 0, lodRest: 42 }, QC105: { qc: 'QC105', total: 236, disDone: 119, lodDone: 72, disRest: 0, lodRest: 45 } };
const vS = mkVoy('RZOR_R109E', { ...liveInfo, qcWork: qcShot }, { ...emptySec(), ediContainers: F.rzorDisEdi }, { ...emptySec(), ediContainers: F.rzorLodEdi });
//  동방이 작업중이 아니라고 하는 배(예정) — 대기 중으로 남아야 한다
const iWait = { ...F.rzorInfo, terminalStatus: 'planned', workStartAt: '', qcWork: undefined, atbActual: '', planDate: `${kst(now + 20 * 3600000)} ~ ${kst(now + 30 * 3600000)}` };
const vW = mkVoy('RZOR_R110E', iWait, { ...emptySec(), ediContainers: F.rzorDisEdi }, { ...emptySec(), ediContainers: F.rzorLodEdi }, { _etaMs: now + 20 * 3600000, _etdMs: now + 30 * 3600000 });
const home = (id, voyage, act = [], over = {}) => React.createElement('div', { key: id, 'data-scn': id, style: { width: 900 } },
  React.createElement(VoyageCard, { voyage, activeInspectors: act, onOpen: () => {}, onDelete: () => {}, onComplete: () => {}, ...over, inspectorDone: false, modeDone: {}, onUndoComplete: null, pilotForecast: {}, inspector: '검수원', laneRow: null, showRoute: false }));

function App() {
  return React.createElement('div', null,
    card('G', 'OBWH_2757E', vG.info, vG),
    card('H', 'OBWH_2757E', vG.info, vG, wH),
    card('I', 'OBWH_2757E', vI.info, vI),
    card('M', 'OBWH_2757E', vM.info, vM),
    card('B29', 'OBWH_2757E', vB29.info, vB29),
    card('B31', 'OBWH_2757E', vB31.info, vB31),
    home('R', vR),
    home('S', vS),
    home('W', vW),
    home('RA', vR, [{ name: '이인철', mode: 'discharge' }]),
    home('V', vR, [], { onDelete: null, onComplete: null }));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
