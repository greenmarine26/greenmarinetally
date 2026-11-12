// 4.89 연막 진입점 — 미르 시트(MirFab, 앱과 같이 얼굴 단추 없음)와 작업 틀을 그려 «검색줄 호출어 → 시트·인사 / 호출어+물음 → 바로 답 / 바깥 닫힘 / 무입력 닫힘» 을 눌러 본다
import React from 'react';
import { createRoot } from 'react-dom/client';
import MirFab from '../src/components/MirFab.jsx';
import WorkFrame from '../src/components/WorkFrame.jsx';
import { summonMirIfCalled } from '../src/faceDock.js';
import { parseNaturalQuery } from '../src/nlSearch.js';
import { answerOneRaw, flattenVoyages, pickShipCtx, MIR_CALL_HINT, askMir } from '../src/mir.js';
import FX from './fixtures/mirone_live_260910.json';

window.__fbShipBayDict = {};
window.__mirLexicon = {};
window.__summon = (t) => summonMirIfCalled(t, parseNaturalQuery(t), 'smoke');
window.__HINT = MIR_CALL_HINT;
window.__called = (t) => !!parseNaturalQuery(t).mirCalled;
//  작업용 검색줄과 같은 재료(workOnly) — 검색줄이 엔진을 부르는 그대로(VoyagePage·SearchPanel·GlobalSearchPage 의 ctx 모양)
window.__work = (q) => { const sc = pickShipCtx(q, FX, null); const tr = {}; const a = answerOneRaw(q, { app: 'tally', smallTalkLast: true, workOnly: true, execDevice: false, modeChoice: 'both', countFallback: true, voyages: FX, flat: flattenVoyages(FX), ...(sc ? { shipCtx: sc } : {}), _trace: tr }); return { a, via: tr.via || '' }; };
function App() {
  return React.createElement(React.Fragment, null,
    React.createElement('header', { 'data-app-header': '1' }, React.createElement('div', { 'data-hdr-right': '1' }, '머리띠')),
    React.createElement(WorkFrame, { bar: React.createElement('span', null, '양하'), top: null, action: null, bottom: null, onBack() {}, name: 'smoke' }),
    React.createElement(MirFab, { voyages: FX, inspector: '연막', isChief: false, portMisData: {}, pilotForecast: {}, heartbeat: null, onOpenPlan() {}, soloButton: false }));
}
createRoot(document.getElementById('root')).render(React.createElement(App));


//  4.89 감사 막음 2 — 검색줄 엔진 길 전체(규칙 → 약하면 모델)를 작업용(workOnly)으로 돌린다. 검수앱(smallTalkLast)·콘앱(app cone) 두 재료.
window.__fetchN = 0;
window.fetch = function () { window.__fetchN += 1; return Promise.reject(new Error('연막: 네트워크 없음')); };
window.__workAsk = async (q, app) => {
  const base = app === 'cone'
    ? { app: 'cone', containers: [], cone: { rows: [] }, accepted: true, workOnly: true }
    : { app: 'tally', smallTalkLast: true, workOnly: true, execDevice: false, modeChoice: 'both', countFallback: true, voyages: FX, flat: flattenVoyages(FX) };
  const r = await askMir(q, base, (cq, trace) => answerOneRaw(cq, { ...base, _trace: trace }), { who: '연막' });
  return { text: r && r.text, via: r && r.via, tv: r && r.trace && r.trace.via };
};
