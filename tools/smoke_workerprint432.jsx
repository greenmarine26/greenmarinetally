// 카고플랜 머리줄 «# ___ , 이름» 과 인쇄 직전 짝 이름 질문 창·한 장 더 찍기를 재는 연막검사 진입점 (TallyOne 4.32).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from '../src/components/PrintableCargoPlanV2.jsx';
import fx from './fixtures/frmark_swtd.json';

//  베이사전은 SWTD 9013E 실사전 사본을 넣는다(frmark 연막검사와 같은 자료) — 사전이 없으면 «베이 매트릭스가 없습니다» 화면이라 머리줄을 못 잰다.
window.__fbShipBayDict = { SWTD: fx.dict };

window.__DOCS = [];
window.open = function () { return { document: { write() {}, close() {}, createElement: () => ({ click() {}, style: {}, textContent: '', setAttribute() {}, appendChild() {} }), body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} }, head: { appendChild() {} } }, focus() {}, close() {}, print() {} }; };
window.alert = function () {};
//  인쇄 창이 열리는 순간을 흉내 낸다 — 브라우저처럼 beforeprint → (인쇄) → afterprint 를 쏘고 그 사이의 화면을 적어 둔다.
window.__PRINTS = [];
window.print = function () {
  window.dispatchEvent(new window.Event('beforeprint'));
  const wraps = [...document.querySelectorAll('.cpv2-zoom-wrap')];
  window.__PRINTS.push(wraps.map((w) => {
    const n = w.querySelector('.cpv2-wk-name');
    return { name: n ? n.textContent : null, empty: !!(n && /cpv2-wk-empty/.test(n.className)), breakBefore: w.style.breakBefore || w.style.pageBreakBefore || '', head: (w.querySelector('.cpv2-page-header') || {}).textContent || '' };
  }));
  window.dispatchEvent(new window.Event('afterprint'));
};
const containers = Object.values(fx.loading).map((c) => ({ ...c }));
const voyageInfo = { vsl: 'SWTD', vslFull: 'SAWASDEE THAILAND', voy_l: '9013E', voy: '9013E' };
createRoot(document.getElementById('root')).render(
  React.createElement(PrintableCargoPlanV2, { containers, shipImo: fx.dict.imo || '', shipName: 'SAWASDEE THAILAND', voyNo: '9013E', voyageInfo, mode: 'loading', inspector: '김성일', onClose: () => {} })
);
