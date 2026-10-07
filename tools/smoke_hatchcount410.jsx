// 해치커버 보고 직전 «장수 확인» 창(4.10) 렌더 연막검사 진입점 — NSDC 2608N 10번 실데이터로 자동 가이드를 그리고 [해치커버 오픈] 을 실제로 누른다.
//   검수사 2026-10-07 «보고 직전에 커버 장수를 맞는지 확인하고 보고 … 무심코 보고 했다가 6장 오픈을 보고 했으니까요». firebase 는 tools/fb_stub_search.js 스텁(쓰기 없음, 호출만 window.__calls 에 남김).
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import GuidedWorkPanel from '../src/components/GuidedWorkPanel.jsx';
import HatchCountConfirm from '../src/components/HatchCountConfirm.jsx';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import HatchAlertBanner from '../src/components/HatchAlertBanner.jsx';
import { buildAutoHatchMessage } from '../src/hatchReport.js';
import FX from './fixtures/hatch_nsdc.json';
import STSE from './fixtures/hatch_stse.json';

window.__fbShipBayDict = { STSE: STSE.dict, NSDC: { name: 'STARSHIP DRACO', code: 'NSDC', callsign: 'V7A5151', imo: '9939292', bayDef: FX.dict.bayDef, recordCount: 9, verified: true } };
try { localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { /* jsdom 저장소 없음 */ }
const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };
//  10번 그룹 — 데크 평택분은 전부 내렸고 홀드 평택 12대가 남은 때(자동 가이드가 «커버 오픈» 배너를 띄우는 순간)
const completed = {};
const containers = Object.values(FX.ediContainers).filter((c) => gOf(c.bay) === 10).map((c) => {
  const deckPtk = c.pod === 'KRPTK' && parseInt(c.tier, 10) >= 80;
  if (deckPtk) completed[c.cn] = { by: '시험' };
  return { ...c, l4: c.cn.slice(-4), _mode: 'discharge', _ptk: c.pod === 'KRPTK', _comp: deckPtk };
});
const root = createRoot(document.getElementById('root'));
window.__render = () => {
  const voyage = { info: { ...FX.info }, discharge: { ediContainers: FX.ediContainers, completed } };
  root.render(React.createElement(GuidedWorkPanel, { voyage, voyageKey: 'NSDC_2608N', inspector: '김성일',
    allContainers: containers, workFilter: 'discharge', onSwitchManual: () => {} }));
};
//  창만 따로 — 앱이 못 셌을 때(count 0)·사전보다 많을 때(옛 6장 오류 모양)의 화면
window.__renderConfirm = (props) => root.render(React.createElement(HatchCountConfirm, { open: true, onConfirm: (n) => { window.__confirmed = n; }, onCancel: () => { window.__confirmed = null; }, ...props }));
//  수동 작업 보고 창 — STSE 2677E 실데이터로 [해치커버] 화면을 그린다(23 (24)25 는 사전 2장인데 옛 코드는 6장으로 셌다)
window.__renderManual = (vsl) => {   // vsl 를 바꿔 넣으면 사전·자료가 없는 배가 된다
  const voyage = { info: { ...STSE.info, ...(vsl ? { vsl, imo: '' } : {}) }, discharge: { ediContainers: STSE.ediContainers, completed: STSE.completed }, loading: { ediContainers: {}, completed: {} } };
  root.render(React.createElement(WorkReportModal, { open: true, voyageKey: 'STSE_2677E', voyage, lastEquip: '1호기', inspector: '김성일', onClose: () => { window.__closed = (window.__closed || 0) + 1; } }));
};
window.__render();
//  알림 배너(3.49 + 4.10) — 사건 한 건을 주고 장수 계산 함수(panelCountOf)를 바꿔 끼울 수 있다. 따라가기 자동 기록 문구는 buildAutoHatchMessage 를 직접 부른다.
window.__buildAuto = buildAutoHatchMessage;
window.__renderBanner = (events, panelCountOf) => root.render(React.createElement(HatchAlertBanner, { events, voyageKey: 'STSE_2677E', vsl: 'STELLAR SEA', voyOf: () => '2677E', equip: '1호기', inspector: '김성일', panelCountOf, mute: true }));
