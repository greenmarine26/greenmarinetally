// 마감적용 패널(4.12) 렌더 연막검사 진입점 — ATPR 2645W 실제 항차 자료(tools/fixtures/closingedi_atpr.json)로 그린다. firebase 는 tools/fb_stub_search.js
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import ClosingEdiPanel from '../src/components/ClosingEdiPanel.jsx';

const root = createRoot(document.getElementById('root'));
window.__renderPanel = (voyages) => root.render(React.createElement(ClosingEdiPanel, { voyages, by: window.__by }));
