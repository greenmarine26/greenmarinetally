// 콘앱(cone.html)에서 검수앱 본체 카고플랜 V2를 그대로 띄우는 번들 진입점 (V7.45)
//   본체 PrintableCargoPlanV2 + cargoPlanCore + 베이사전(.def 내장 포함)을 React째 번들.
//   콘앱은 window.ConeCargoPlan.open(props) 한 줄로 본체와 100% 동일한 카고플랜을 연다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableCargoPlanV2 from './components/PrintableCargoPlanV2.jsx';
import { parseBAPLIE, parseAscFile } from './utils.js';   // V9.05-03: 콘앱 파서 통합용

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

// V9.05-03: 파서 단일 소스 통합 — 콘앱(cone.html)이 본체 parseBAPLIE/parseAscFile을 그대로 쓰도록 노출.
//   콘앱 내부 약식 파서의 Full/Empty 미인식(실측: EQD 상태 +5/+4 안 읽음)·ISO 불일치 해소.
//   숫자코드 BAPLIE(CASP)·IFCSUM(RIZHAO)도 parseBAPLIE가 내부 라우팅하므로 콘앱에서 그대로 처리됨.
window.ConeParse = { parseBAPLIE, parseAscFile };
