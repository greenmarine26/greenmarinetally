// 스코프 전수 검사 — **정의 안 된 변수 참조는 문법 오류가 아니라 실행 시점 크래시다.**
//
// 왜 있는가. 2026-08-25 하루에 앱 전체 크래시를 **두 번** 냈다. 둘 다 같은 병이다 —
//   ① 2.48  `manualBayPairs is not defined` — `_mirAnswer` 가 `SingleSearch` 안인데 부모 변수를 참조했다.
//   ② 2.50-01 `voyage is not defined` — 인라인 답이 `InlineAnswerCard` 안인데 `voyage` 를 참조했다.
// 두 번 다 **빌드·연막검사·전수 회귀·번들 grep·라이브 바이트 대조가 전부 통과**한 뒤,
// 검수사가 버튼을 누른 지 3초 만에 드러났다. 검수사 — *«작업중에 이런게 하나라도 있으면 폰을 거둡니다.»*
//
// ⚠ 그리고 2.50-01 때는 스코프 검사를 **돌리고도 통과했다.** `path.scope.hasGlobal(name)` 으로 걸러서,
//   같은 파일 **다른 컴포넌트**에 같은 이름(`voyage`)이 있으면 있는 것으로 봤기 때문이다.
//   ⇒ `hasBinding(name, true)`(noGlobals)로 **엄격하게** 본다. 이것이 이 파일이 존재하는 이유다.
//
// 작업표준 §2-2-D — «판을 올리기 전, 그 판에서 새로 만들거나 지운 이름의 정의·임포트·사용을 전수 대조한다.»
const p = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');

const OK = new Set(['window','document','console','Object','Array','String','Number','Math','JSON','Date','Set','Map',
'Boolean','RegExp','Promise','Error','parseInt','parseFloat','isNaN','isFinite','navigator','localStorage','sessionStorage',
'setTimeout','clearTimeout','setInterval','clearInterval','fetch','alert','confirm','prompt','React','undefined','NaN',
'Infinity','requestAnimationFrame','cancelAnimationFrame','structuredClone','Intl','URL','URLSearchParams','Blob','File',
'FileReader','Image','speechSynthesis','SpeechSynthesisUtterance','AbortController','TextDecoder','TextEncoder','crypto',
'ResizeObserver','process','globalThis','DOMParser','XMLSerializer','Worker','IntersectionObserver','MutationObserver',
'history','location','CustomEvent','Event','KeyboardEvent','MouseEvent','FormData','atob','btoa','encodeURIComponent',
'decodeURIComponent','queueMicrotask','Uint8Array','Uint16Array','Float64Array','ArrayBuffer','DataView','WeakMap','WeakSet',
'Symbol','BigInt','performance','Notification','matchMedia','getComputedStyle','scrollTo','print','open','close','self',
'HTMLInputElement','HTMLElement','Node','NodeList','Element','SVGElement','Response','Request','Headers','AbortSignal','MessageChannel','MessagePort','indexedDB','IDBKeyRange','BroadcastChannel','showDirectoryPicker','showOpenFilePicker','showSaveFilePicker','ClipboardItem','MediaRecorder','AudioContext','OffscreenCanvas','WebSocket','EventSource','caches','ServiceWorkerRegistration','PushManager','geolocation','webkitSpeechRecognition','SpeechRecognition','wakeLock','BarcodeDetector']);

const SRC = path.resolve(__dirname, '..', 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(f);
  }
})(SRC);

let bad = 0, checked = 0;
for (const f of files) {
  let ast;
  try { ast = p.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }); }
  catch (e) { console.error(`  ✗ ${path.relative(SRC, f)} — 파싱 실패: ${e.message}`); bad++; continue; }
  checked++;
  traverse(ast, {
    ReferencedIdentifier(pth) {
      const n = pth.node.name;
      if (OK.has(n)) return;
      //  ⚠ noGlobals=true — 같은 파일 다른 컴포넌트의 같은 이름을 «있다»로 세지 않는다.
      if (pth.scope.hasBinding(n, true)) return;
      console.error(`  ✗ ${path.relative(SRC, f)}:${pth.node.loc.start.line}  ${n}`);
      bad++;
    },
  });
}
if (bad) { console.error(`✗ 스코프 검사 실패 — 미정의 참조 ${bad}건. **배포하면 그 화면에서 앱이 통째로 죽는다.**`); process.exit(1); }
console.log(`✓ 스코프 전수 검사 통과 (${checked}개 파일 · 미정의 참조 0건)`);
