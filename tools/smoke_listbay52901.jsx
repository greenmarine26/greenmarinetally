// 5.29-01 연막검사 진입점 — 선적 EDI 가 오기 전(선사 리스트만 = 가상 선적 EDI) OBWH 2801E 실자료로 항차 화면 본체(VoyagePage)를 통째로 그린다.
//   검수사 2026-11-28 «선적 자료가 없다고 빈베이도 안보여준다는건 이해가 안됩니다» · «OBWH는 선적 후반쯤에 EDI가 나오는 경우가 많습니다».
//   firebase.js 는 진짜 — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import VoyagePage from '../src/pages/VoyagePage.jsx';
import { buildBayPagesFromSummary } from '../src/cargoPlanCore.js';
import { listOnlyUnplacedOf, listOnlyBaysOf, listOnlyCellKeysOf, unplacedTargetBayOf, listOnlyCellTakenOf } from '../src/utils.js';
import FX from './fixtures/listonly_obwh2801.json';

window.__fbShipBayDict = { OBWH: FX.dict };
const VK = 'OBWH_2801E';
const clone = (o) => JSON.parse(JSON.stringify(o));
//  가상 선적 EDI — autoRegApi 407-411 과 같은 꼴(리스트 행 + POL 평택 + _virtualFromList · 자리 없음)
const virtualEdi = () => {
  const out = {};
  for (const [cn, r] of Object.entries(FX.records)) out[cn] = { ...r, cn, pol: 'KRPTK', _slotKey: cn, _mode: 'loading', _virtualEdi: true, _virtualFromList: true };
  return out;
};
//  kind 'list' = 리스트만(가상 EDI) · 'edi' = 실 EDI 가 온 뒤(같은 리스트 + 실 EDI 행)
window.__voy = (kind = 'list') => {
  const v = { key: VK, info: clone(FX.info), discharge: {}, loading: { records: clone(FX.records), ediContainers: kind === 'edi' ? clone(FX.realEdi) : virtualEdi(), completed: {} } };
  return v;
};
window.__T = { FX, buildBayPagesFromSummary, listOnlyUnplacedOf, listOnlyBaysOf, listOnlyCellKeysOf, unplacedTargetBayOf, listOnlyCellTakenOf };
const root = createRoot(document.getElementById('root'));
let mk = 0;
window.__renderVP = (voyage) => { mk += 1; root.render(React.createElement(VoyagePage, { key: 'vp' + mk, voyageKey: VK, voyage, inspector: '김성일', inspectors: [], onGoHome: () => {}, initModeOverride: 'loading' })); };
//  같은 마운트에 항차만 바꿔 다시 그린다(RTDB 구독이 새 값을 내려 준 때)
window.__rerenderVP = (voyage) => { root.render(React.createElement(VoyagePage, { key: 'vp' + mk, voyageKey: VK, voyage, inspector: '김성일', inspectors: [], onGoHome: () => {}, initModeOverride: 'loading' })); };
