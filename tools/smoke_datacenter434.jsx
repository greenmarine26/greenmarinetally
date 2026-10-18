// 자료 센터 화면(DataCenterPage)과 출력 허브 «바로 열기»(autoAction)·주소·대기 저장소를 jsdom 에서 재는 연막검사 진입점 (TallyOne 4.34).
import React from 'react';
import { createRoot } from 'react-dom/client';
import DataCenterPage from '../src/pages/DataCenterPage.jsx';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import { parseHash, setPendingDo, takePendingDo } from '../src/backHandler.js';
import kbtr from './fixtures/printhub_kbtr.json';
import atpr from './fixtures/atpr_2644W_loading_plan.json';
import swtd from './fixtures/frmark_swtd.json';
import mcat from './fixtures/deckonly434_mcat.json';

//  출력 허브 바로 열기는 베이사전이 있는 배(MCAT 640N 양하 321대 · 실사전)로 잰다 — 사전이 없으면 카고플랜이 «베이 매트릭스가 없습니다» 화면이다.
window.__fbShipBayDict = { MCAT: mcat.dict };
const mcatVoy = { key: 'MCAT_640N', info: { vsl: 'MCAT', vslFull: 'ARTOTINA', voy: '640N', voy_d: '640N', voy_l: '642S' }, discharge: { ediContainers: mcat.discharge, completed: {}, records: {} } };

window.__DOCS = [];
window.open = function () {
  const doc = { html: '', write(h) { this.html += String(h); }, close() {}, createElement: () => ({ click() {}, style: {}, textContent: '', setAttribute() {}, appendChild() {} }), body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} }, head: { appendChild() {} } };
  const w = { document: doc, focus() {}, close() {}, print() {} };
  window.__DOCS.push(w);
  return w;
};
window.alert = function (m) { (window.__ALERTS = window.__ALERTS || []).push(String(m)); };
window.print = function () {};
window.__BH = { parseHash, setPendingDo, takePendingDo };
window.__DO = [];
window.__CLOSED = 0;

//  실자료 항차 셋 — KBTR 2606E(양하·선적 둘 다) · ATPR 2644W(선적만, 엠티실 부착 선박) · SWTD 9013E(양하·선적).
const voyages = {
  KBTR_2606E: { ...kbtr, key: 'KBTR_2606E', info: { ...(kbtr.info || {}), vsl: (kbtr.info || {}).vsl || 'KBTR', voy_d: '2606E', voy_l: '2606E', planDate: '2026-10-20 10:00 ~ 2026-10-21 03:00' } },
  ATPR_2644W: { key: 'ATPR_2644W', info: { vsl: 'ATPR', voy: '2644W', voy_l: '2644W', planDate: '2026-10-19 08:00 ~ 2026-10-19 20:00' }, loading: { ediContainers: atpr.ediContainers, completed: {}, records: {} } },
  SWTD_9013E: { key: 'SWTD_9013E', info: { vsl: 'SWTD', voy: '9013E', voy_d: '9013E', voy_l: '9013E', planDate: '2026-10-18 09:00 ~ 2026-10-18 21:00' },
    discharge: { ediContainers: swtd.discharge || {}, completed: {}, records: {} }, loading: { ediContainers: swtd.loading || {}, completed: {}, records: {} } },
};
window.__VOYS = Object.keys(voyages);

const root = document.getElementById('root');
window.__RENDER = (which, props) => {
  if (window.__ROOT) window.__ROOT.unmount();
  window.__ROOT = createRoot(root);
  if (which === 'center') window.__ROOT.render(React.createElement(DataCenterPage, { voyages, onDo: (a, k, m) => window.__DO.push([a, k, m]) }));
  else window.__ROOT.render(React.createElement(PrintHubModal, { voyage: mcatVoy, voyageKey: 'MCAT_640N', inspector: '김성일', onClose: () => { window.__CLOSED += 1; }, ...(props || {}) }));
};
window.__RENDER('center');
