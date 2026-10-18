// 시프팅 대상이 양하 리스트에 섞여 든 경우(MCAT 640N MRSU7262992) 데이터 검증 상자·진단 경고를 재는 연막검사 진입점 (TallyOne 4.34-03)
import React from 'react';
import { createRoot } from 'react-dom/client';
import ValidationBox from '../src/components/ValidationBox.jsx';
import { runDiagnostics } from '../src/diagnostics.js';
import fx from './fixtures/shiftlist434_mcat640n.json';

window.alert = function () {};
window.print = function () {};
const ediArr = Object.values(fx.edi);
const recArr = Object.entries(fx.records).map(([cn, r]) => ({ ...r, cn }));
const shiftingList = fx.restow.map((cn) => ({ cn }));
const mount = (id, list) => {
  const el = document.createElement('div'); el.id = id; document.body.appendChild(el);
  createRoot(el).render(React.createElement(ValidationBox, { ediContainers: ediArr, records: recArr, mode: 'discharge', shiftingList: list, voyageKey: fx.voyageKey, dischargeEdi: fx.edi }));
};
mount('vb-before', []);
mount('vb-after', shiftingList);
const diag = (shiftCns) => runDiagnostics({ ediContainers: fx.edi, listRecords: fx.records, xrayList: {}, mode: 'discharge', shiftCns });
window.__diagBefore = diag([]);
window.__diagAfter = diag(fx.restow);
window.__fx = { edi: ediArr.length, rec: recArr.length, shift: shiftingList.length, cn: 'MRSU7262992' };
