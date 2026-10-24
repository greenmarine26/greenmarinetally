// 4.47 연막검사 진입점 — 같은 호기 양하↔선적 바꿈(중단 사유를 앱이 적고 카톡 한 번)을 보관 실보고 흐름(XTPG 545E · TMPZ 2023E)으로 실소스 작업 보고 창에서 재생한다.
//   firebase.js 는 진짜 — SDK 만 메모리 DB(stub_fbdb_mem)로. 실 Firebase 에는 아무것도 안 쓴다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { switchReasonOf, otherRunningWork, pauseSwitchReasonsFor } from '../src/utils.js';
import { buildTimeSheet } from '../src/tallyReport.js';
import FX from './fixtures/hatchequip44501.json';

window.__T = { switchReasonOf, otherRunningWork, pauseSwitchReasonsFor, buildTimeSheet, FX };
const root = createRoot(document.getElementById('root'));
let n = 0;
let last = null;
window.__renderModal = (props) => { n += 1; last = props; root.render(React.createElement(WorkReportModal, { key: 'm' + n, open: true, onClose: () => { window.__closed = (window.__closed || 0) + 1; }, ...props })); };
//  같은 창을 닫았다 다시 연다(늘 마운트된 채 open 만 바뀌는 실제 앱과 같게)
window.__reopen = async (over) => { if (over) last = { ...last, ...over }; const mk = (open) => root.render(React.createElement(WorkReportModal, { key: 'm' + n, open, onClose: () => {}, ...last })); mk(false); await new Promise((r) => setTimeout(r, 80)); mk(true); };
