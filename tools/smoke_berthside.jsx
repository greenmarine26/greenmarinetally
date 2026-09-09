// 접안 현측이 한 벌로 읽히는지 재는 연막검사 진입점 — NSDC 2608N 10번 실데이터로 자동 가이드를 그린다 (TallyOne 3.40).
//   수집기는 한글('좌현'·'우현')을 적고 앱은 영문('port'·'starboard')을 적는다. 둘이 같은 답이어야 한다.
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import GuidedWorkPanel from '../src/components/GuidedWorkPanel.jsx';
import { berthSideOf } from '../src/utils.js';
import FX from './fixtures/hatch_nsdc.json';

window.__fbShipBayDict = { NSDC: { name: 'STARSHIP DRACO', code: 'NSDC', callsign: 'V7A5151', imo: '9939292', bayDef: FX.dict.bayDef, recordCount: 9, verified: true } };
try { localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { /* jsdom 저장소 없음 */ }
const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };
const containers = Object.values(FX.ediContainers).filter((c) => gOf(c.bay) === 10).map((c) => ({
  ...c, l4: c.cn.slice(-4), _mode: 'discharge', _ptk: c.pod === 'KRPTK', _comp: false,
}));
const root = createRoot(document.getElementById('root'));
//  판정을 검사가 직접 부를 수 있게 연다 — 화면에 안 나오는 가지(모르는 값 등)까지 잰다.
window.__berthSideOf = berthSideOf;
//  side  = 수집기가 적는 칸(info.berthSide) · pick = 검수사가 고른 칸(info.berthSidePick)
window.__render = (side, pick) => {
  const info = { ...FX.info, berthSide: side === undefined ? FX.info.berthSide : side };
  if (pick !== undefined) info.berthSidePick = pick;
  //  ⚠ key 를 바꿔 **새로 그린다** — 같은 인스턴스로 다시 그리면 고른 베이·단이 남아
  //    두 번째 방향을 잴 때 첫 방향의 화면이 그대로 보인다(실측).
  root.render(React.createElement(GuidedWorkPanel, { key: `${side}|${pick}`, voyage: { info, discharge: { ediContainers: FX.ediContainers, completed: {} } },
    voyageKey: 'NSDC_2608N', inspector: '김성일', allContainers: containers, workFilter: 'discharge', onSwitchManual: () => {} }));
};
window.__render();
