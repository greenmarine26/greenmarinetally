// 베이뷰 작업(3.48 · 3.49 해치 자동 판정·좌우 분할) 렌더 연막검사 진입점 — DXQD 2636E 실자료 사본(tools/fixtures/bayview_dxqd.json)으로 BayViewWork 를 실제로 그리고 누른다.
//   firebase 는 tools/fb_stub_search.js 스텁(쓰기 없음). 판정은 smoke_bayview.cjs 가 DOM 을 직접 읽어 한다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import BayViewWork from '../src/components/BayViewWork.jsx';
import { applyCatosPos, applyAutoSwap, bayViewOverlayOf, bayViewFollowOf, ownDirCns, hatchEventsOf, hatchReportedOf } from '../src/utils.js';   // 3.49: 해치 자동 판정
import { buildBayPagesFromSummary } from '../src/cargoPlanCore.js';
import FX from './fixtures/bayview_dxqd.json';

window.__calls = [];
window.__fbShipBayDict = { DXQD: FX.dict, STMJ: FX.stmj.dict };
try { localStorage.setItem('gm_equip_no', '4호기'); localStorage.removeItem('gm_bayview_ratio'); } catch (e) { /* jsdom 저장소 없음 */ }

//  앱 구독 콜백과 같은 순서 — 카토스 자리 얹기(applyCatosPos) → 자동 맞교환(applyAutoSwap)
const voyage = applyAutoSwap(applyCatosPos({ info: { ...FX.info }, discharge: FX.discharge, loading: FX.loading }));
const MODE = 'loading';
//  베이 탭이 BayPlan 에 주는 목록과 같은 꼴(실적 → 맞교환 → 계획 자리 · 반대 방향 오염 거름) — VoyagePage allEdiContainersBase 와 같은 규칙
const pad2 = (x) => String(x ?? '').padStart(2, '0');
const sec = voyage[MODE];
const recAll = sec.records || {}; const recMap = {}; for (const cn of ownDirCns(recAll, MODE)) recMap[cn] = recAll[cn];
const allEdiContainers = Object.values(sec.ediContainers || {}).map((e) => {
  const rec = recMap[e.cn] || {};
  const gone = rec.bay_actual === '__STG__' || !!rec.planTaken;
  const hasA = !gone && rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null && !String(rec.bay_actual).startsWith('__');
  const hasG = !gone && !hasA && rec.bay_assign && rec.row_assign && rec.tier_assign && !String(rec.bay_assign).startsWith('__');
  return { ...e, _inList: !!recMap[e.cn], _assigned: !!hasG, _assign_warn: hasG ? (rec._assign_warn || '') : '',
    bay: gone ? '' : pad2(hasA ? rec.bay_actual : hasG ? rec.bay_assign : e.bay), row: gone ? '' : pad2(hasA ? rec.row_actual : hasG ? rec.row_assign : e.row), tier: gone ? '' : pad2(hasA ? rec.tier_actual : hasG ? rec.tier_assign : e.tier) };
});

//  ① 순수 함수 결과를 검사가 읽게 창에 남긴다(실자료 그대로)
const pages = buildBayPagesFromSummary(FX.dict.bayDef) || null;
window.__bv = {
  overlay: (() => { const o = bayViewOverlayOf(sec); return { comp: Object.keys(o.compMap).length, termOnly: o.termOnly, conflicts: o.conflicts, warn: o.warnCells.size }; })(),
  //  터미널만 칠하는 갈래 — 앱 completed 를 비운 같은 자료(수석 승인 전 PCTC 항차의 모양)
  overlayTermOnly: (() => { const o = bayViewOverlayOf({ ...sec, completed: {} }); return { comp: Object.keys(o.compMap).length, termOnly: o.termOnly, conflicts: o.conflicts.length }; })(),
  //  불일치 세 갈래 — 실측에는 사례가 0 이라(검수원 자리 기록이 있는 항차 6척 전수 0건) 실자료 행을 **그대로 옮겨** 검수원 행 하나를 붙인다.
  //    X = 터미널이 20-05-82 에 실은 컨을 검수원은 20-06-82 에 찍었다고 · Y = 터미널이 20-06-82 에 실은 다른 컨. 판정 가지만 본다.
  overlayConflict: (() => {
    const tw = sec.termWork || {}; const recs = { ...(sec.records || {}) };
    const at = (pos) => Object.keys(tw).find((cn) => tw[cn] && String(tw[cn].pos) === pos);
    const X = at('200582'), Y = at('200682');
    if (!X || !Y) return { skipped: `실자료에 200582/200682 가 없다 ${X}/${Y}` };
    recs[X] = { ...(recs[X] || {}), cn: X, bay_actual: '20', row_actual: '06', tier_actual: '82', actual_by: '김성일' };   // _pos_src 없음 = 검수원 기록
    delete recs[X]._pos_src;
    //  검수원이 찍었는데 터미널이 모르는 컨 — 완료는 있는데 termWork 에 없는 컨 하나(실자료 완료 시각을 30분 전으로)
    const comp = { ...(sec.completed || {}) };
    const Z = Object.keys(sec.ediContainers || {}).find((cn) => !tw[cn]);
    const termAt = Math.max(...Object.values(tw).map((r) => r.at || 0));
    if (Z) comp[Z] = { at: termAt - 30 * 60000, by: '김성일' };
    //  앱 선적확인이 계획을 베껴 적은 자리(moves 마지막 why:'loaded')는 검수원이 «본» 자리가 아니다 — 터미널과 달라도 불일치가 아니어야 한다(감사 지적).
    //    L = 터미널 자리가 계획과 다른 실자료 컨 — 앱 선적확인이 계획을 베낀 행(to = 계획)이면 불일치가 아니어야 하고,
    //    L2 = 같은 꼴인데 to 가 계획과 다른 칸(자리 확인·위치 지정 뒤 선적확인)이면 검수원이 본 자리라 pos 불일치여야 한다.
    const edi = sec.ediContainers || {};
    const planOf = (cn) => { const e = edi[cn] || {}; return e.bay != null ? `${pad2(parseInt(e.bay, 10))}-${pad2(e.row)}-${pad2(e.tier)}` : null; };
    const termOf = (cn) => { const p = String(tw[cn].pos); return `${parseInt(p.slice(0, 2), 10)}-${p.slice(2, 4)}-${p.slice(4, 6)}`; };
    const cand = Object.keys(tw).filter((cn) => cn !== X && cn !== Y && tw[cn] && String(tw[cn].pos).length === 6 && planOf(cn) && `${parseInt(planOf(cn).slice(0, 2), 10)}${planOf(cn).slice(2)}` !== termOf(cn) && String(tw[cn].pos) !== '200682' && String(tw[cn].pos) !== '200582');
    const L = cand[0], L2 = cand[1];
    const asRec = (cn, to) => { const [b, r, t] = to.split('-'); return { ...(recs[cn] || {}), cn, bay_actual: String(parseInt(b, 10)), row_actual: r, tier_actual: t, actual_by: '김성일', moves: [{ at: 1, by: '김성일', why: 'loaded', from: '', to }] }; };
    if (L) { recs[L] = asRec(L, planOf(L)); delete recs[L]._pos_src; }
    const L2to = L2 ? (planOf(L2) === '23-01-82' ? '23-03-82' : '23-01-82') : null;   // 계획과 다른 칸(실자료 23번 베이 칸 모양)
    if (L2) { recs[L2] = asRec(L2, L2to); delete recs[L2]._pos_src; }
    const o = bayViewOverlayOf({ ...sec, records: recs, completed: comp });
    return { X, Y, Z, L, L2, L2to, types: o.conflicts.map((c) => c.type), conflicts: o.conflicts, warn: [...o.warnCells.entries()] };
  })(),
  follow4: bayViewFollowOf(voyage, '4호기', pages),
  follow2: bayViewFollowOf(voyage, '2호기', pages),
  followNone: bayViewFollowOf(voyage, '', pages),
  followStmj: (() => { const v2 = { info: FX.stmj.info, discharge: FX.stmj.discharge, loading: {} }; return bayViewFollowOf(v2, '1호기', buildBayPagesFromSummary(FX.stmj.dict.bayDef) || null); })(),
  //  3.49 해치 자동 판정 — 이 실자료(DXQD 동방)에서 나오는 사건과 «내 호기(4호기) 몫»(호기 미상 추정 + 4호기). SearchPanel 이 같은 함수를 부른다.
  hatch: (() => { const ev = hatchEventsOf(voyage, pages).events; return { all: ev.map((e) => ({ hatch: e.hatch, action: e.action, crane: e.crane, src: e.src, from: e.from })), mine: ev.filter((e) => !e.crane || e.crane === 4).map((e) => `${e.hatch}|${e.action}`) }; })(),
};

//  크레인이 옮겨 간 뒤의 항차 — 실자료에 «다음 분» 터미널 실적 두 줄을 얹는다(2호기는 08 그대로·4호기는 (16)17 로).
//    검수사 «터미널 실적이 옮겨 가면 화면도 따라간다» 갈래를 재현한다. 컨은 EDI 실자료의 그 자리 컨이다.
function movedVoyage() {
  const tw = { ...(FX.loading.termWork || {}) };
  const latest = Math.max(...Object.values(tw).map((r) => (r && r.at) || 0));
  const at = latest + 60000;
  const pick = (bay, tier) => Object.values(FX.loading.ediContainers).find((e) => parseInt(e.bay, 10) === bay && String(e.tier) === tier && !tw[e.cn]);
  const a = pick(16, '84') || pick(16, '82'), b = pick(8, '84') || pick(8, '82') || Object.values(FX.loading.ediContainers).find((e) => parseInt(e.bay, 10) === 8);
  if (!a || !b) return null;
  const pos = (e) => `${String(e.bay).padStart(2, '0')}${String(e.row).padStart(2, '0')}${String(e.tier).padStart(2, '0')}`;
  tw[a.cn] = { ...(tw[a.cn] || {}), src: 'pnct', at, pos: pos(a) };
  tw[b.cn] = { ...(tw[b.cn] || {}), src: 'pnct', at, pos: pos(b) };
  const v2 = applyAutoSwap(applyCatosPos({ info: { ...FX.info }, discharge: FX.discharge, loading: { ...FX.loading, termWork: tw } }));
  window.__moved = { a: a.cn, b: b.cn, at };
  return v2;
}
function App() {
  const [open, setOpen] = React.useState(true);
  const [voy, setVoy] = React.useState(voyage);
  window.__setOpen = setOpen;
  window.__moveCrane = () => { const v2 = movedVoyage(); if (v2) setVoy(v2); return !!v2; };
  //  3.49: 검수원이 직접 보고한 것이 있는 항차 — reports 를 얹어 «보고된 장은 알림에서 빠진다» 갈래를 본다
  window.__withReports = (reports) => setVoy((v) => ({ ...v, reports: { ...(v.reports || {}), ...reports } }));
  window.__reportedKeys = () => [...hatchReportedOf(voy, pages).keys()];
  if (!open) return React.createElement('div', { 'data-closed': '1' }, '닫힘');
  return React.createElement(BayViewWork, {
    voyage: voy, voyageKey: 'DXQD_2636E', inspector: '김성일', mode: MODE,
    allEdiContainers, xrayMap: {}, xraySeals: {}, shiftingMap: {}, preGoneInfo: null,
    onOpenContainer: (c) => { window.__calls.push({ fn: 'detail', cn: c && c.cn }); },
    onClose: () => { window.__calls.push({ fn: 'close' }); setOpen(false); },
    searchPanelProps: {},
  });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
