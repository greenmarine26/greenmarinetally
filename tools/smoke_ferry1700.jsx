// 3.63 연막검사 진입점 — 카페리 17시 갱별 주간 작업보고(계산 한 벌 + 알림 창)를 실데이터로 그려 잰다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Ferry1700Alert, { ferry1700Speech, ferryPagesOf } from '../src/components/Ferry1700Alert.jsx';
import { buildGangShiftReport, ferry1700Due, shiftReportContainers, buildShiftReport, isFerry1700Ship, quayOrderOf, setEquipNumber, shiftCutMs } from '../src/utils.js';
import { buildFerry1700Message } from '../src/kakaoShare.js';
import { buildBayPagesFromSummary } from '../src/cargoPlanCore.js';

let root = null;
function render(el) {
  if (!root) root = createRoot(document.getElementById('root'));
  root.render(el);
}
window.__F = { React, Ferry1700Alert, ferry1700Speech, ferryPagesOf, buildGangShiftReport, ferry1700Due, shiftReportContainers, buildShiftReport,
  isFerry1700Ship, quayOrderOf, setEquipNumber, shiftCutMs, buildFerry1700Message, buildBayPagesFromSummary, render };
