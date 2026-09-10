// 미르 재료 창고 — 전 항차 컨 펼치기(홈·수석·떠 있는 미르 공용 한 벌)와 «지금 열린 항차» 재료를 화면이 놓고 미르가 읽는 자리.
/* ★ TallyOne 3.41 (검수사 «미르를 앱 어디에든 항상 띄워서 모든 질문을 받을수 있게»)
   떠 있는 미르(MirFab)는 App 에 산다 — 항차 화면의 재료(컨·완료·시프팅·트윈 짝…)를 prop 으로 받을 길이 없다.
   그래서 항차 화면이 재료를 **여기에 놓고**(publishMirCtx) 미르가 물을 때 **읽는다**(readMirCtx). 화면이 닫히면 비운다.
   ⚠ 전 항차 컨 펼치기(flattenVoyages)는 종전 GlobalSearchPage 의 useMemo 본문을 그대로 옮긴 것이다 — 두 곳이 각자 펼치면
     «홈은 이 컨을 알고 미르는 모르는» 일이 생긴다(§4-4). 홈도 이 함수를 부른다. */
import { isPyeongtaekPort, isPtk, sideCancelled, isWorkingNow } from './utils.js';
import { terminalWorkFor } from './nlSearch.js';
import { shipOpMapper } from './data/tallyFormats.js';

/** 전 항차의 양하·선적 컨을 한 줄로 편다 — 홈 통합검색·떠 있는 미르가 같은 벌을 쓴다. */
export function flattenVoyages(voyages, terminalWork) {
  const arr = [];
  Object.entries(voyages || {}).forEach(([vKey, v]) => {
    if (!v || !v.info) return;
    ['discharge', 'loading'].forEach((mode) => {
      const sec = v[mode];
      if (!sec) return;
      //  2.66-01: 전량 캔슬된 쪽 컨은 검색에서도 빠진다(다른 배에 실리므로 끝 4자리 조회에 두 배가 걸린다).
      if (sideCancelled(v.info, mode, terminalWorkFor(v.info, terminalWork))) return;
      const ediMap = sec.ediContainers || {};
      const recMap = sec.records || {};
      const xrayMap = sec.xrayList || {};
      const xraySeals = sec.xraySeals || {};
      const compMap = sec.completed || {};
      const merged = {};
      //  3.31: 항차 화면·마감텔리와 같은 선사 코드로(같은 배를 두 화면이 다르게 답하면 안 된다).
      const _spOpG = shipOpMapper(String(v.info?.vsl || '').toUpperCase(),
        [...Object.values(ediMap), ...Object.values(recMap)].map((c) => c && c.op));
      Object.values(ediMap).forEach((c) => { merged[c.cn] = { ...c, _src: 'edi', op: c.op ? _spOpG(c.op) : c.op }; });
      Object.values(recMap).forEach((r) => {
        const safeR = {};
        Object.keys(r).forEach((k) => {
          const x = r[k];
          if (x !== '' && x !== 0 && x !== null && x !== undefined && !(Array.isArray(x) && x.length === 0)) safeR[k] = x;
        });
        if (safeR.op) safeR.op = _spOpG(safeR.op);
        merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR, _src: merged[r.cn] ? 'both' : 'list' };
      });
      Object.values(merged).forEach((c) => {
        if (!c.cn) return;
        arr.push({
          ...c,
          /* 1.55-03: 실체 위치 승격 — 창고(__)는 제외. */
          ...((c.bay_actual && c.row_actual && c.tier_actual && !String(c.bay_actual).startsWith('__')) ? { bay: c.bay_actual, row: c.row_actual, tier: c.tier_actual } : {}),
          voyageKey: vKey,
          vsl: v.info.vsl,
          voy: v.info.voy,
          mode,
          _mode: mode,
          _ptk: mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPtk({ ...c, _inList: !!recMap[c.cn] }, mode),
          isXray: mode === 'discharge' && !!xrayMap[c.cn],
          _xray: mode === 'discharge' && !!xrayMap[c.cn],
          comp: compMap[c.cn] || null,
          _comp: compMap[c.cn] || null,
          xraySeal: xraySeals[c.cn] || null,
          _xraySeal: xraySeals[c.cn] || null,
        });
      });
    });
  });
  return arr;
}

/* ── «지금 열린 항차» 재료 — 항차 화면이 놓고 떠 있는 미르가 읽는다 ── */
let _live = null;            // { voyageKey, voyage, containers, mode, compMap, shiftMap, bayPairs, rfSkip, esealBrief, diagAlerts, … }
const _subs = new Set();
export function publishMirCtx(ctx) {
  _live = ctx ? { ...ctx, _at: Date.now() } : null;
  _subs.forEach((f) => { try { f(_live); } catch (e) { /* 구독자 하나가 죽어도 나머지는 산다 */ } });
}
export function readMirCtx() { return _live; }
export function subscribeMirCtx(f) { _subs.add(f); return () => _subs.delete(f); }

/*  ★ 3.41-01 — «작업중인 선박 언제 끝나» 처럼 이름 대신 **«지금 일하는 배»** 로 부른 말.
    검수사 2026-09-10 «작업중인 선박 언제끝나 하면 선박명을 쳐달라고 함. 이미 작업중인 선박이라고 했는데...».
    판정은 utils.isWorkingNow 한 벌(수석 보드·홈·로그인 화면이 쓰는 그것)이다. 한 척이면 그 배, 여럿이면
    `ambiguous`(이름들)로 돌려 부르는 쪽이 «어느 배?» 하고 되묻는다 — 아무 배나 고르지 않는다. */
export const WORKING_SHIP_RE = /작업\s*중인?\s*(선박|배)|지금\s*(하는|작업하는|일하는|작업\s*중인)\s*(선박|배)|(우리|이|지금|그)\s*(배|선박)/;
export function workingShipCtx(voyages) {
  const now = Date.now();
  const list = Object.entries(voyages || {}).filter(([, v]) => v && v.info && isWorkingNow(v, now));
  if (!list.length) return null;
  if (list.length === 1) { const [k, v] = list[0]; return { key: k, info: v.info, v, has: !!(v.discharge?.ediContainers || v.loading?.ediContainers), working: true }; }
  return { ambiguous: list.map(([, v]) => String(v.info.vsl || v.info.vslFull || '')).filter(Boolean), working: true };
}

/** 질문 속 배 이름으로 항차를 고른다 — 홈 통합검색(shipCtx)과 같은 규칙(정확 포함 → 편집거리 1 유일). */
export function pickShipCtx(query, voyages, ctxVoyageKey = null) {
  const Q = String(query || '').toUpperCase();
  const _fallback = () => {
    if (ctxVoyageKey) {
      const v = (voyages || {})[ctxVoyageKey];
      if (v?.info) return { key: ctxVoyageKey, info: v.info, v, has: true };
    }
    //  이름도 열린 항차도 없는데 «작업중인 배» 라고 불렀으면 지금 일하는 배(3.41-01). 여럿이면 여기서는 고르지 않는다 —
    //  떠 있는 미르가 workingShipCtx 로 «어느 배?» 하고 되묻는다.
    if (WORKING_SHIP_RE.test(String(query || ''))) { const w = workingShipCtx(voyages); return (w && w.key) ? w : null; }
    return null;
  };
  if (Q.length < 3) return _fallback();
  let best = null;
  Object.entries(voyages || {}).forEach(([k, v]) => {
    const i = v?.info; if (!i) return;
    const names = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
    if (names.some((nm) => nm.length >= 3 && Q.includes(nm))) {
      const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
      if (!best || (has && !best.has)) best = { key: k, info: i, v, has };
    }
  });
  if (!best) {
    const dl1 = (a, b) => {
      if (a === b) return true;
      const la = a.length, lb = b.length;
      if (Math.abs(la - lb) > 1) return false;
      if (la === lb) {
        const diff = [];
        for (let x = 0; x < la; x++) if (a[x] !== b[x]) diff.push(x);
        if (diff.length === 1) return true;
        if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
        return false;
      }
      const [s, l] = la < lb ? [a, b] : [b, a];
      let si = 0, li = 0, used = false;
      while (si < s.length && li < l.length) {
        if (s[si] === l[li]) { si++; li++; continue; }
        if (used) return false;
        used = true; li++;
      }
      return true;
    };
    const toks = Q.split(/[^A-Z0-9]+/).filter((w) => /^[A-Z]{3,8}$/.test(w));
    const byShip = new Map();
    Object.entries(voyages || {}).forEach(([k, v]) => {
      const i = v?.info; if (!i) return;
      const names2 = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
      if (names2.some((nm) => nm.length >= 3 && toks.some((tk) => dl1(tk, nm)))) {
        const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
        const shipId = String(i.vsl || names2[0] || k).toUpperCase();
        const prev = byShip.get(shipId);
        if (!prev || (has && !prev.has)) byShip.set(shipId, { key: k, info: i, v, has });
      }
    });
    if (byShip.size === 1) best = [...byShip.values()][0];
  }
  return best || _fallback();
}
