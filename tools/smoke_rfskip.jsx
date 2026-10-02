// 리퍼 체크 안 하는 배(3.72-02) 연막검사 진입점 — 마감 점검·항차 요약 카드를 실소스로 그린다(검수사 2026-10-02 «머스크 계열은 냉동 검사를 안한다고 알람 띄우지 말라고 했는데 계속 띄우는 이유는?»).
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkClosingChecklist from '../src/components/WorkClosingChecklist.jsx';
import VoyageSummaryCard from '../src/components/VoyageSummaryCard.jsx';
import BayPlan from '../src/components/BayPlan.jsx';
import * as U from '../src/utils.js';
import F from './fixtures/rfskip_mamp636n_discharge.json';
import SHIPS from './fixtures/rfskip_ships_real.json';
import ARCH from './fixtures/rfskip_archive_info.json';

window.__F = F;
window.__U = U;
window.__SHIPS = SHIPS;
window.__ARCH = ARCH;

//  그릴 때마다 새 자리(div)를 만든다 — 이전 root 와 DOM 이 엉키지 않게.
const roots = [];
const fresh = () => {
  roots.forEach((r) => { try { r.unmount(); } catch (e) { /* 이미 정리됨 */ } });
  roots.length = 0;
  const old = document.getElementById('root');
  const el = document.createElement('div'); el.id = 'root';
  old.parentNode.replaceChild(el, old);
  const r = createRoot(el); roots.push(r);
  return r;
};
const closing = (voyage, rfSkip) => React.createElement(WorkClosingChecklist, { open: true, voyage, mode: 'discharge', onClose: () => {}, onJump: () => {}, rfSkip });

window.__renderV = (voyage, rfSkip) => { fresh().render(closing(voyage, rfSkip)); };
window.__render = (rfSkip) => window.__renderV({ info: { vsl: 'MAMP' }, discharge: F.discharge }, rfSkip);
//  같은 root 에서 rfSkip 만 바꿔 다시 그린다 — 마감 점검 메모 의존(deps)에 rfSkip 이 빠지면 화면이 안 바뀐다.
let tgRoot = null;
window.__toggle = (voyage, rfSkip) => { if (!tgRoot) tgRoot = fresh(); tgRoot.render(closing(voyage, rfSkip)); };
window.__renderCard = (voyage, rfSkip, withCheck = true) => {
  tgRoot = null;
  fresh().render(React.createElement(VoyageSummaryCard, { voyage, mode: 'discharge', voyageKey: 'MAMP_636N', rfSkip, reeferCheck: withCheck ? { total: 192, unchecked: rfSkip ? 0 : 192, onOpen: () => {} } : null }));
};

//  베이 그림(BayPlan) — 온도 없는 풀 리퍼 칸의 «!» 가 rfSkip 에서 꺼지는지 실제로 그린다(감사 2회전: BayPage 안에서 rfSkip 이 정의되지 않아 모든 칸이 죽었다 — 문자열 검사로는 못 잡는다).
const mkBay = (bayNo) => ({ bay: '0' + bayNo, bayNo, deckAlign: 'center', deckCells: [6, 6, 6], deckHasZero: false, deckTiers: [86, 84, 82], hasDeck: true, hasHold: false, hasZero: false,
  hatchCount: 1, holdAlign: 'center', holdCells: [], holdTiers: [], rowCount: 6, source: 'edi' });
const bayDict = () => ({ SMOKE: { name: 'SMOKE', code: 'SMOKE', callsign: 'SMOKE1', imo: '', bayDef: { baysSummary: ['01', '02', '03'].map(mkBay), recordCount: 3, verified: true, deckTiers: [86, 84, 82], holdTiers: [] } } });
const bayBox = (i, row, tmp, extra = {}) => ({ cn: 'TEST' + String(2000000 + i).padStart(7, '0'), bay: '02', row, tier: '82', iso: '45R1', rf: true, fe: 'F', tmp, pol: 'CNTAO', pod: 'KRPTK', _mode: 'discharge', ...extra });
const bayBoxes = () => [bayBox(1, '02', ''), bayBox(2, '04', ''), bayBox(3, '06', '-18'), bayBox(4, '01', '', { fe: 'E' })];   // 온도 없는 풀 리퍼 2 · 온도 있는 풀 리퍼 1 · 엠티 리퍼 1(온도 없어도 정상)
window.__renderBay = (rfSkip, onlyBay) => {
  tgRoot = null;
  window.__fbShipBayDict = bayDict();
  fresh().render(React.createElement(BayPlan, { containers: bayBoxes(), compMap: {}, xrayMap: {}, restowMap: { needsShift: {} }, mode: 'discharge', onOpenContainer: () => {},
    shipImo: '', shipName: 'SMOKE', voyageInfo: { vsl: 'SMOKE' }, voyageKey: 'SMOKE_1', rfSkip, ...(onlyBay ? { onlyBay, compactZoom: 0.4 } : {}) }));   // 칸 너비가 42px 미만이면 «!» 를 안 그리는 좁은 칸이다 — 베이뷰는 배율 0.4 로
};
//  전체 보기는 기본 배율 22%(칸 31px · 좁은 칸 — 칸 안에 끝4자리만) — Ctrl+휠로 키운다(폰 터치 환경이라 ＋ 단추는 없다). 칸 42px 이상이어야 «!» 가 그려진다.
window.__zoomIn = (n) => {
  const t = document.getElementById('bay-page-0');
  for (let i = 0; i < n; i += 1) if (t) t.dispatchEvent(new window.WheelEvent('wheel', { ctrlKey: true, deltaY: -50, bubbles: true, cancelable: true }));
};
