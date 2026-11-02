// 관리앱 화면(OwnerPage) 실제 렌더 연막검사 진입점 — 소유자/비소유자로 그려 본다. firebase 는 메모리 스텁.
import React from 'react';
import { createRoot } from 'react-dom/client';
import OwnerPage from '../src/pages/OwnerPage.jsx';
const root = createRoot(document.getElementById('root'));
window.__renderOwner = (p) => root.render(React.createElement(OwnerPage, { voyages: {}, onGoHome: () => { window.__home = (window.__home || 0) + 1; }, onGoChief: () => { window.__chief = (window.__chief || 0) + 1; }, onOpenStaffManager: () => { window.__staff = (window.__staff || 0) + 1; }, ...p }));
