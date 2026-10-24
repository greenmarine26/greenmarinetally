// 4.49 연막검사 진입점 — 실번호 판정 한 벌(utils.sealCheckOf)을 MAMP 641N 선사·세관 리스트 실파일 사본과 보관 항차 기록으로 잰다.
//   firebase.js 는 진짜(fbSaveListRecords 병합까지) — SDK 만 메모리 DB(stub_fbdb_mem)로 갈아 끼운다. 실 Firebase 에는 아무것도 안 쓴다.
//   검수사 2026-10-24 12:50 확정(통합운영지침서 7.8-F 7·8·9) — «ML Seal 이 주실» · «다 보이고 하나만 맞으면 맞음» · «큰 글씨 실은 세관 값» · «MLPH 끝자리 빠짐은 실오류로 센다».
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import SealKnownLine from '../src/components/SealKnownLine.jsx';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import { parseListExcel, sealCheckOf, sealKnownOf, isSealError, inspectionSealOf, mergeUploadSeal, isCustomsSrc, APP_NOTE, APP_VERSION } from '../src/utils.js';
import { fbSaveListRecords } from '../src/firebase.js';
import { buildSealList } from '../src/tallyReport.js';
import { sealIssuesOf, generateHandover } from '../src/nlSearch.js';
import { HELP_DATA } from '../src/data/helpData.js';
import FX from './fixtures/seal449_real.json';
import { answerOneRaw, flattenVoyages, _mirThreadReset } from '../src/mir.js';   // 감사(중-3) — 두 앱 같은 답
import { toMirContainers } from '../src/mirCore.entry.js';
import { applyDischargeUnits, sealLegacyOf } from '../src/utils.js';
import { exportSectionToCSV } from '../src/components/CSVExport.jsx';   // 재감사 — 결재용 CSV 실제 행
import { generateInspectionListHTML } from '../src/inspectionList.js';   // 감사 3차(하) — 종이 검수리스트 제작컨 큰 실

window.XLSX = XLSX;
window.__T = { parseListExcel, sealCheckOf, sealKnownOf, isSealError, inspectionSealOf, mergeUploadSeal, isCustomsSrc, APP_NOTE, APP_VERSION,
  fbSaveListRecords, buildSealList, sealIssuesOf, generateHandover, HELP_DATA, FX, answerOneRaw, flattenVoyages, _mirThreadReset, toMirContainers, applyDischargeUnits, sealLegacyOf, exportSectionToCSV, generateInspectionListHTML };
const root = createRoot(document.getElementById('root'));
let __mk = 0;
window.__renderLine = (props) => { __mk += 1; root.render(React.createElement(SealKnownLine, { key: 'l' + __mk, ...props })); };
window.__renderDetail = (props) => { __mk += 1; root.render(React.createElement(ContainerDetailModal, { key: 'd' + __mk, onClose: () => {}, ...props })); };
