// 출력 허브(검수 리스트·카고플랜·베이 상세·VGM)가 실제로 열리고 종이까지 나오는지 재는 연막검사 진입점 (TallyOne 3.39-03).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import fx from './fixtures/printhub_kbtr.json';

//  종이는 새 창으로 나간다(`window.open` → `document.write`). jsdom 에는 그 창이 없으므로
//  받아 적는 가짜 창을 세워 **나간 HTML 을 그대로** 검사에 넘긴다.
window.__DOCS = [];
window.open = function () {
  const doc = {
    html: '',
    write(h) { this.html += String(h); },
    close() {},
    //  ⚠ 종이에는 인쇄·엑셀 단추 띠(printHelper.injectPrintToolbar)가 얹힌다 — 그것이 쓰는
    //    자리를 다 열어 둔다. 안 열어 두면 앱이 «toolbar 주입 실패» 로 물러나 검사 화면이
    //    스택으로 덮이고, 다음 판의 진짜 오류가 그 잡음에 묻힌다.
    createElement: () => ({ click() {}, style: {}, textContent: '', setAttribute() {}, appendChild() {} }),
    body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} },
    head: { appendChild() {} },
  };
  const w = { document: doc, focus() {}, close() {}, print() {} };
  window.__DOCS.push(w);
  return w;
};
window.alert = function (m) { (window.__ALERTS = window.__ALERTS || []).push(String(m)); };
window.print = function () {};

createRoot(document.getElementById('root')).render(
  React.createElement(PrintHubModal, { voyage: fx, voyageKey: 'KBTR_2606E', onClose: () => {} })
);
