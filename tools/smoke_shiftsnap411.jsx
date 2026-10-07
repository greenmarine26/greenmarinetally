// 교대 시각 터미널 기준 패널(4.11) 렌더 연막검사 진입점 — 수집기 shiftsnap 이 실제 동방 서버에서 읽어 만든 스냅샷(ATPR 2645W 선적)으로 그린다. firebase 는 tools/fb_stub_search.js
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import ShiftSnapPanel from '../src/components/ShiftSnapPanel.jsx';

const root = createRoot(document.getElementById('root'));
//  voyages 는 앱이 들고 있는 항차 목록과 같은 모양 — info 와 모드별 completed
window.__renderPanel = (voyages) => root.render(React.createElement(ShiftSnapPanel, { voyages, by: window.__by }));
