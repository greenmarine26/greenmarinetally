// POD 확정(3.53) 문지기 연막 진입점 — `src/firebase.js` 를 **실소스 그대로** 번들하고 Firebase SDK 만
//   `tools/stub_fb_sdk.js` 로 갈아 끼워, `fbPickPod`·`fbClearPickPod` 가 실제로 무엇을 쓰고 무엇을 막는지
//   `globalThis.__fbWrites` 에서 잰다. 판정은 `smoke_podpick.cjs` 가 한다.
//   ⚠ 이름으로 «있다» 를 세지 않는다 — **불러서 결과를 본다**(규범 §6-2).
import { fbPickPod, fbClearPickPod, fbPickIso, fbSaveListRecords } from '../src/firebase.js';
import { runDiagnostics } from '../src/diagnostics.js';   // 3.53: 확정하면 경고가 사라지는가 — 동작으로 잰다
import { podConflictOf } from '../src/utils.js';
import { rememberMe } from '../src/meToday.js';
import { saveWorkChoice, clearWorkChoice, setActiveWorkChoice } from '../src/workChoice.js';
import { setServerRoles, isChief } from '../src/staffList.js';
import { isOwnerName } from '../src/adminGuard.js';
//  3.53(재감사 수리) — «여섯 자리가 같이 움직이는가» 를 **동작으로** 재려고 순수 카운터를 들여온다.
import { _ptkCountOfSection } from '../src/firebase.js';
import { countPtkSection } from '../src/pages/ChiefDashboard.jsx';
import { computeStats } from '../src/pages/HomePage.jsx';
import { isPtkResolved } from '../src/utils.js';

window.__podfb = {
  fbPickPod, fbClearPickPod, fbPickIso, fbSaveListRecords, runDiagnostics, podConflictOf,
  rememberMe, saveWorkChoice, clearWorkChoice, setActiveWorkChoice, setServerRoles, isChief, isOwnerName,
  writes: () => (globalThis.__fbWrites || []),
  setGets: (m) => { globalThis.__fbGetValues = m || {}; },
  ptkCountOfSection: (sec, mode) => _ptkCountOfSection(sec, mode),
  countPtkSection: (sec, mode) => countPtkSection(sec, mode),
  computeStatsPtk: (sec, mode) => computeStats(sec, mode).ptk,
  //  ValidationBox·ediGap 은 컴포넌트·큰 함수 안이라 그 «판정 한 줄» 을 같은 인자로 재현해 잰다.
  validationPtk: (sec, mode) => {
    const recs = Object.values(sec.records || {});
    const byCn = {}; for (const r of recs) if (r && r.cn) byCn[String(r.cn).toUpperCase()] = r;
    return Object.values(sec.ediContainers || {}).filter(c => isPtkResolved(c, byCn[String(c && c.cn || '').toUpperCase()] || null, mode)).length;
  },
  ediGapPtk: (sec, mode) => {
    const edi = sec.ediContainers || {}, list = sec.records || {};
    return Object.keys(edi).filter(k => isPtkResolved(edi[k], list[k] || null, mode)).length;
  },
};
