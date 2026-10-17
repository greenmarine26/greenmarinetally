// 출력 센터의 수석 전용 자료(VGM·작업 보고서·특수화물 별첨)가 검수원에게 안 보이는지 재는 연막검사 진입점 (TallyOne 4.31).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import fx from './fixtures/printhub_kbtr.json';

window.__DOCS = [];
window.open = function () {
  const doc = {
    html: '', write(h) { this.html += String(h); }, close() {},
    createElement: () => ({ click() {}, style: {}, textContent: '', setAttribute() {}, appendChild() {} }),
    body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} }, head: { appendChild() {} },
  };
  const w = { document: doc, focus() {}, close() {}, print() {} };
  window.__DOCS.push(w);
  return w;
};
window.alert = function () {};
window.print = function () {};

//  특수화물이 한 대도 없는 자료로는 별첨이 «안 나오는 것»을 증명할 수 없다(공허 통과) — 복사본 선적 컨 세 대를 위험물(DG)로 바꿔 넣는다.
const vx = JSON.parse(JSON.stringify(fx));
{
  //  선적 자료의 실제 컨은 records(컨번호 키 객체)에 있다 — ediContainers 는 부킹 자리뿐이다.
  let n = 0;
  for (const k of Object.keys(vx.loading.records || {})) {
    if (n >= 3) break;
    const c = vx.loading.records[k];
    if (c && c.cn) { c.dg = true; c.dgc = '3'; c.un = '1203'; n++; }
  }
  window.__DGMARKED = n;
}
//  같은 항차를 검수원(수석 아님)과 소유자 두 사람 눈으로 따로 그린다.
for (const [id, who] of [['rootInsp', '테스트검수원'], ['rootChief', '김성일']]) {
  createRoot(document.getElementById(id)).render(
    React.createElement(PrintHubModal, { voyage: vx, voyageKey: 'KBTR_2606E', onClose: () => {}, inspector: who, initialMode: 'loading' })
  );
}
