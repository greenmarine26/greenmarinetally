// «로그인 뒤 작업자/조회만» 선택(3.50) 렌더 연막검사 진입점 — 실 명단·항차 15척 사본(tools/fixtures/workchoice_live.json)으로 LoginPage 선택 단계를 실제로 그리고 누른다.
//   firebase 는 tools/fb_stub_search.js 스텁(쓰기 없음). 판정은 smoke_workchoice.cjs 가 DOM·window.__calls·순수 함수 결과를 읽어 한다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from '../src/pages/LoginPage.jsx';
import { setServerRoles } from '../src/staffList.js';
import { isFreeRoamer, readWorkChoice, saveWorkChoice, clearWorkChoice, setActiveWorkChoice, isViewOnlyNow, visibleVoyagesOf, canSeeVoyage, equipGateText } from '../src/workChoice.js';
import { getEquipNumber, setEquipNumber } from '../src/utils.js';
import { inspectorStatus } from '../src/inspectorStatus.js';
import { rememberMe } from '../src/meToday.js';
import FX from './fixtures/workchoice_live.json';

window.__calls = [];
setServerRoles(FX.staffList);
try { localStorage.clear(); } catch (e) { /* */ }
window.__wc = { isFreeRoamer, readWorkChoice, saveWorkChoice, clearWorkChoice, setActiveWorkChoice, isViewOnlyNow, visibleVoyagesOf, canSeeVoyage, equipGateText, getEquipNumber, setEquipNumber, inspectorStatus, rememberMe, voyages: FX.voyages };

//  로그인 화면을 이름·choiceFor 바꿔 가며 다시 그릴 수 있게 둔다
let root = null;
window.__mount = (props) => {
  if (root) { root.unmount(); root = null; }
  const el = document.getElementById('root'); el.innerHTML = '';
  root = createRoot(el);
  root.render(React.createElement(LoginPage, {
    current: '', inspectors: FX.inspectors, voyages: FX.voyages, extraStaff: {}, deletedStaff: {}, notice: '',
    onSelect: (name, choice) => { window.__calls.push({ fn: 'select', name, choice: choice || null }); },
    onCancel: null,
    ...(props || {}),
  }));
};
window.__mount({});
