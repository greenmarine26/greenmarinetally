// X-RAY 탭 «① 내 몫 → ② 파트너 몫» 일괄 등록(4.50) 연막검사 진입점 — 실 항차 DXQD 2642E X-RAY 목록 12대로 실제 XrayTab 을 그린다.
//   firebase 는 tools/fb_stub_search.js(fbSetXraySeal 호출을 window.__calls 에 남긴다). 실 Firebase 쓰기 없음.
import React from 'react';
import { createRoot } from 'react-dom/client';
import XrayTab from '../src/components/XrayTab.jsx';
import FX from './fixtures/xray_dxqd2642e.json';
import { xraySealerOf } from '../src/utils.js';

window.__calls = [];
window.__fx = FX;
window.__sealerOf = xraySealerOf;
let root = null;
window.__unmount = () => { if (root) { root.unmount(); root = null; } };   // 탭을 옮겨 화면이 사라지는 경우를 흉내
window.__render = (props) => {
  if (!root) root = createRoot(document.getElementById('root'));
  root.render(React.createElement(XrayTab, props));
};
