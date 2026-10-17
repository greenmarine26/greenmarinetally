// 출력센터 X-RAY 리스트 출구(양하만)와 X-RAY 탭 자동 출력을 재는 연막검사 진입점 (TallyOne 4.33).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import XrayTab from '../src/components/XrayTab.jsx';
import fx from './fixtures/printhub_kbtr.json';

window.__DOCS = [];
window.open = function () {
  const doc = { html: '', write(h) { this.html += String(h); }, close() {}, createElement: () => ({ click() {}, style: {}, textContent: '', setAttribute() {}, appendChild() {} }), body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} }, head: { appendChild() {} } };
  const w = { document: doc, focus() {}, close() {}, print() {} };
  window.__DOCS.push(w);
  return w;
};
window.alert = function (m) { (window.__ALERTS = window.__ALERTS || []).push(String(m)); };
window.print = function () {};
window.__XCALLS = 0; window.__XPRINTED = 0;

//  (a) 양하로 연 허브 · (b) 선적으로 연 허브 · (c) 자동 출력하는 X-RAY 탭
createRoot(document.getElementById('rootDis')).render(
  React.createElement(PrintHubModal, { voyage: fx, voyageKey: 'KBTR_2606E', onClose: () => {}, inspector: '테스트검수원', initialMode: 'discharge', onXrayPrint: () => { window.__XCALLS++; }, xrayPrintOk: true })
);
createRoot(document.getElementById('rootLod')).render(
  React.createElement(PrintHubModal, { voyage: fx, voyageKey: 'KBTR_2606E', onClose: () => {}, inspector: '테스트검수원', initialMode: 'loading', onXrayPrint: () => { window.__XCALLS++; }, xrayPrintOk: true })
);
const C = (cn, bay, row, tier, iso) => ({ cn, bay, row, tier, iso });
const containers = [C('SMOKU100001', '2', '01', '84', '45G1'), C('SMOKU100002', '2', '02', '82', '45R1')];
const K = (seal, kind, iso) => ({ at: 1, seal, kind, iso, dest: '평택 제2컨테이너검색기' });
createRoot(document.getElementById('rootAuto')).render(
  React.createElement(XrayTab, {
    voyage: { info: { vsl: 'SMOKE', voy_d: '2601E', callsign: 'SMK9', pier: 'PNCT' } }, voyageKey: 'SMOKE_2601E', mode: 'discharge',
    containers, xrayMap: { SMOKU100001: K('011074', 'X-RAY', '45GP'), SMOKU100002: K('S38233', 'X-RAY', '45RE') },
    xraySeals: { SMOKU100001: { seal: 'KC0012345', sealer: '김성일' } }, compMap: {}, portMisData: {},
    autoPrint: true, onPrinted: () => { window.__XPRINTED++; },
  })
);
