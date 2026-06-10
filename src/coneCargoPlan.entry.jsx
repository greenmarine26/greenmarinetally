// 콘앱(cone.html)에서 검수앱 본체 카고플랜 V2를 그대로 띄우는 번들 진입점 (V7.45)
//   본체 PrintableCargoPlanV2 + cargoPlanCore + 베이사전(.def 내장 포함)을 React째 번들.
//   콘앱은 window.ConeCargoPlan.open(props) 한 줄로 본체와 100% 동일한 카고플랜을 연다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from './components/PrintableCargoPlanV2.jsx';

let _root = null;
let _host = null;

function close() {
  try { if (_root) _root.unmount(); } catch (e) {}
  if (_host && _host.parentNode) _host.parentNode.removeChild(_host);
  _root = null; _host = null;
}

function open(props) {
  close();
  _host = document.createElement('div');
  document.body.appendChild(_host);
  _root = createRoot(_host);
  _root.render(
    <PrintableCargoPlanV2 {...props} onClose={close} />
  );
}

window.ConeCargoPlan = { open, close };
