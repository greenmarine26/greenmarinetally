// 4.45-01 연막검사 진입점 — XTPG 545W·STSE 2678W 실데이터로 자동 가이드(선적)와 작업 보고 창을 그린다.
//   검수사 2026-10-23 «수동으로 해치 커버를 5개 베이를 2번에 걸쳐서 했는데 수동 작업 보고한것을 자동가이드에서 인식을 못하고 다시 어떻게 할건지 묻는일» ·
//   «호기를 정하고 작업을 하면 모든 보고에도 그 호기를 기본으로 지정되어 있어야 하는데 다시 호기를 선택해야 하는 경우». firebase 는 스텁(쓰기 없음, 호출만 window.__calls).
import React from 'react';
import { createRoot } from 'react-dom/client';
import GuidedWorkPanel from '../src/components/GuidedWorkPanel.jsx';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { isPyeongtaekPort } from '../src/utils.js';
import FX from './fixtures/hatchequip44501.json';

window.__calls = [];
window.__fbShipBayDict = { XTPG: FX.xtpg.dict, STSE: FX.stse.dict };
const KEY = { xtpg: 'XTPG_545E', stse: 'STSE_2677E' };

//  선적 목록 — SearchPanel 과 같은 뜻으로 만든다: EDI 행 + 리스트 기록(빈 값 제외) · 1.35 «실체 위치(bay_actual)를 계획 자리로 승격» ·
//  선적 평택분 = 리스트 등재(isPtk «리스트 등재 = 평택») 또는 POL 평택 · 완료는 시각 T 까지만.
const containersAt = (S, T) => {
  const L = S.loading;
  const out = new Map();
  for (const e of Object.values(L.ediContainers || {})) if (e && e.cn) out.set(e.cn, { ...e });
  for (const [cn, r] of Object.entries(L.records || {})) {
    const c = out.get(cn) || { cn };
    for (const [k, v] of Object.entries(r || {})) if (v !== '' && v != null && typeof v !== 'object') c[k] = v;
    if (r && r.bay_actual) { c.bay = r.bay_actual; c.row = r.row_actual || c.row; c.tier = r.tier_actual || c.tier; }
    out.set(cn, c);
  }
  return [...out.values()].map((c) => {
    const comp = (L.completed || {})[c.cn];
    const done = comp && Number(comp.at) <= T ? comp : null;
    return { ...c, cn: c.cn, l4: String(c.cn).slice(-4), _mode: 'loading', _ptk: !!(L.records || {})[c.cn] || isPyeongtaekPort(c.pol), _comp: done };
  });
};
const completedAt = (S, T) => Object.fromEntries(Object.entries(S.loading.completed || {}).filter(([, v]) => v && Number(v.at) <= T));

const root = createRoot(document.getElementById('root'));
let seq = 0;
//  ship 'xtpg'|'stse' · T(ms) · keep(r) — 보고 거르기 · extra — 덧붙일 보고(가이드에서 누른 닫힘이 보관소에 들어온 뒤를 흉내)
window.__renderGuide = (ship, T, keep = null, extra = []) => {
  const S = FX[ship];
  const reports = {};
  for (const [k, r] of Object.entries(S.reports || {})) if (r && Number(r.ts) <= T && (!keep || keep(r))) reports[k] = r;
  for (const r of extra) reports[String(r.ts)] = r;
  const voyage = { info: { ...S.info }, loading: { ediContainers: S.loading.ediContainers, completed: completedAt(S, T), records: S.loading.records }, reports };
  root.render(React.createElement(GuidedWorkPanel, { key: 'g' + (++seq), voyage, voyageKey: KEY[ship], inspector: '김성일',
    allContainers: containersAt(S, T), workFilter: 'loading', onSwitchManual: () => {} }));
};
//  같은 마운트에 보고만 바꿔 다시 그린다(보관소 구독이 새 보고를 내려 준 때)
window.__rerenderGuideSame = (ship, T, reportsObj) => {
  const S = FX[ship];
  const voyage = { info: { ...S.info }, loading: { ediContainers: S.loading.ediContainers, completed: completedAt(S, T), records: S.loading.records }, reports: reportsObj };
  root.render(React.createElement(GuidedWorkPanel, { key: 'g' + seq, voyage, voyageKey: KEY[ship], inspector: '김성일',
    allContainers: containersAt(S, T), workFilter: 'loading', onSwitchManual: () => {} }));
};
window.__guideReports = (ship, T, keep = null) => {
  const S = FX[ship]; const o = {};
  for (const [k, r] of Object.entries(S.reports || {})) if (r && Number(r.ts) <= T && (!keep || keep(r))) o[k] = r;
  return o;
};

//  작업 보고 창 — activeWork(진행 중 작업)·앱 호기·항차 화면 모드를 넣고 open 을 껐다 켤 수 있다(같은 마운트).
let rseq = 0, rprops = null;
window.__renderReport = ({ activeWork = {}, pageMode = 'loading', lastEquip = '1호기', open = true, fresh = true } = {}) => {
  if (fresh) { rseq++; window.__memdb = { activeWork: { XTPG_545E: activeWork } }; }
  const S = FX.xtpg;
  const voyage = { info: { ...S.info }, discharge: { ediContainers: {}, completed: {} }, loading: { ediContainers: S.loading.ediContainers, completed: S.loading.completed, records: S.loading.records } };
  rprops = { key: 'r' + rseq, open, voyageKey: 'XTPG_545E', voyage, lastEquip, pageMode, inspector: '김성일', onClose: () => { window.__closed = (window.__closed || 0) + 1; } };
  root.render(React.createElement(WorkReportModal, rprops));
};
