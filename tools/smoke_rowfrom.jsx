// 양하 «해상부터» 칩(3.3) 렌더 연막검사 진입점 — NSDC 2608N 10번 실데이터로 자동 가이드를 그려 칩을 실제로 누른다.
//   김성일 메모 2026-09-03 «양하순서 추가 해상부터». firebase 는 tools/fb_stub_search.js 스텁(쓰기 없음, updateInfo 만 기록).
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import GuidedWorkPanel from '../src/components/GuidedWorkPanel.jsx';
import FX from './fixtures/hatch_nsdc.json';

window.__fbShipBayDict = { NSDC: { name: 'STARSHIP DRACO', code: 'NSDC', callsign: 'V7A5151', imo: '9939292', bayDef: FX.dict.bayDef, recordCount: 9, verified: true } };
try { localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { /* jsdom 저장소 없음 */ }
const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };
const containers = Object.values(FX.ediContainers).filter((c) => gOf(c.bay) === 10).map((c) => ({
  ...c, l4: c.cn.slice(-4), _mode: 'discharge', _ptk: c.pod === 'KRPTK', _comp: false,
}));
const root = createRoot(document.getElementById('root'));
window.__render = (seqRowFrom) => {
  const voyage = { info: { ...FX.info, seqRowFrom: seqRowFrom || '' }, discharge: { ediContainers: FX.ediContainers, completed: {} } };
  root.render(React.createElement(GuidedWorkPanel, { voyage, voyageKey: 'NSDC_2608N', inspector: '김성일',
    allContainers: containers, workFilter: 'discharge', onSwitchManual: () => {} }));
};
window.__render('');
