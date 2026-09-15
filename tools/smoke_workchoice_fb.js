// «조회만» 문지기(3.50) 실소스 연막 진입점 — src/firebase.js 를 **그대로** 번들하고 Firebase SDK 만 tools/stub_fb_sdk.js 로 갈아 끼워, fbSetInspectorActivity·fbSetInspectorChoice 가 실제로 무엇을 쓰는지 globalThis.__fbWrites 에서 잰다.
//   판정은 smoke_workchoice.cjs 가 한다(같은 jsdom 창에서 평가 — localStorage·meToday 를 같이 쓴다).
import { fbSetInspectorActivity, fbSetInspectorChoice } from '../src/firebase.js';
import { rememberMe } from '../src/meToday.js';
import { saveWorkChoice, clearWorkChoice } from '../src/workChoice.js';

window.__fbgate = { fbSetInspectorActivity, fbSetInspectorChoice, rememberMe, saveWorkChoice, clearWorkChoice, writes: () => (globalThis.__fbWrites || []) };
