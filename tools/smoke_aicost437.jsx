// 소유자 «💳 AI 비용» 패널(4.37) 렌더 연막검사 진입점 — 2026-10-19 실기록(픽스처)으로 그린다. firebase 는 tools/fb_stub_search.js(window.__aiDays 등)
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import AiCostPanel from '../src/components/AiCostPanel.jsx';

const root = createRoot(document.getElementById('root'));
window.__renderPanel = () => root.render(React.createElement(AiCostPanel, { by: window.__by }));
