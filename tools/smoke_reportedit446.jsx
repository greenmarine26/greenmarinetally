// 4.46 연막검사 진입점 — 작업 보고 고치기·지우기(보낸 사람만)를 XTPG 545E 실보고(보관소 archive/XTPG_545E reports 17건)와 실소스로 잰다.
//   firebase.js 는 진짜(쓰는 자리 문지기까지) — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
//   검수사 2026-10-23 15:31 «14번 해치인데 10번 해치로 잘못기재 하거나 할때 수정내용을 기록할수 있게» · 2026-10-24 08:46 «보고자만 수정또는 삭제 할수 있게».
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReportEditRow, { reportMessageOf, DeletedReports } from '../src/components/ReportEditRow.jsx';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { canEditReport, cleanReportBays, applyReportEdit, reportEditSummary, activeWorkStateFromReports, isLastWorkStatusOfSlot, hatchDoneAfterReports } from '../src/utils.js';
import { fbAddWorkReport, fbEditWorkReport, fbDeleteMyWorkReport, fbSyncActiveWorkSlot } from '../src/firebase.js';
import { buildTimeSheet } from '../src/tallyReport.js';
import { bayGroupCenter } from '../src/swapGrade.js';
import { setActiveWorkChoice } from '../src/workChoice.js';
import { parseKakaoWorkLog, diffAgainstReports } from '../src/kakaoWorkLog.js';
import FX from './fixtures/hatchequip44501.json';

window.__T = { canEditReport, cleanReportBays, applyReportEdit, reportEditSummary, activeWorkStateFromReports, isLastWorkStatusOfSlot, hatchDoneAfterReports,
  fbAddWorkReport, fbEditWorkReport, fbDeleteMyWorkReport, fbSyncActiveWorkSlot, buildTimeSheet, bayGroupCenter, reportMessageOf, FX, setActiveWorkChoice, parseKakaoWorkLog, diffAgainstReports };
const root = createRoot(document.getElementById('root'));
window.__renderRow = (props) => root.render(React.createElement('div', null,
  React.createElement(ReportEditRow, props),
  React.createElement(DeletedReports, { deleted: props.deleted || null })));
let __mk = 0;
window.__renderModal = (props) => { __mk += 1; root.render(React.createElement(WorkReportModal, { key: 'm' + __mk, open: true, onClose: () => {}, ...props })); };
