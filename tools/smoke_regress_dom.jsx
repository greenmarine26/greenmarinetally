// 회귀 기준표 R16·R17(4.16 · §7.8-①②) 화면 입구 — smoke_regress.cjs 가 묶어 jsdom 에서 돌린다(쓰기 없음 — Firebase 는 메모리 스텁).
//   ① window.__r416.homeTotals — 홈 카드 막대가 쓰는 HomePage.computeStats 실소스(JSON 으로 받아 이 창 안에서 센다 — Set 이 창을 건너지 않게)
//   ② window.__R17 = 'kskm' | 'mcap' 이면 출력 센터(PrintHubModal)를 연다 — 검사가 카고플랜 단추를 누른다.
//   ③ 4.19 R24 — window.__R24 = 항차 키(dictmissing419.json 의 info)면 그 배로 항차 목록 카드·헤더·베이플랜 머리를 그린다(사전 = 그 사본의 키·bayDef 유무).
//      KSKM 2617N — 선사 서류·선적 EDI 가 없는 배(앱 예측만) · MCAP 639N — 선사 RESTOW LIST 5대(확정).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import { computeStats, VoyageCard } from '../src/pages/HomePage.jsx';
import Header from '../src/components/Header.jsx';   // 4.19 R24 — 헤더 «사전에 없음»
import BayPlan from '../src/components/BayPlan.jsx';   // 4.19 R24 — 베이플랜 머리 «사전에 없음»
import DiagnosticsPanel from '../src/components/DiagnosticsPanel.jsx';   // 4.22 R27 — 주의 박스 «자료별 대조»·잘라 보이기
import dm419 from './fixtures/dictmissing419.json';
import * as U from '../src/utils.js';
import kskm from './fixtures/shifting_pregone.json';
import mcap from './fixtures/shiftbay_mcap639n.json';

window.__r416 = {
  homeTotals(json, key) {
    const v = JSON.parse(json);
    const ss = U.shiftCnSetOf(key, v);
    const d = computeStats(v.discharge, 'discharge', v.info, key, ss), l = computeStats(v.loading, 'loading', v.info, key, ss);
    return JSON.stringify({ dis: { done: d.done, total: d.total, workDone: d.workDone, workTotal: d.workTotal }, lod: { done: l.done, total: l.total, workDone: l.workDone, workTotal: l.workTotal } });
  },
};

//  실제 앱은 App.jsx 가 RTDB lane_routes 를 setLaneRoutes 로 넣는다(smoke_pregone 과 같은 주입).
U.setLaneRoutes({ IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } });
const which = window.__R17 || '';
if (which) {
  let voyage, key;
  if (which === 'kskm') {
    window.__fbShipBayDict = { KSKM: { bayDef: { baysSummary: kskm.bay27 } } };
    key = 'KSKM_2617N';
    voyage = { key, info: { ...kskm.info }, discharge: { raw: { edi: { text: kskm.text, fileName: 'KSKM2617NXMNB.ASC' } } }, loading: {} };
  } else {
    window.__fbShipBayDict = { MCAP: mcap.dict };
    key = 'MCAP_639N';
    voyage = { key, info: mcap.info, discharge: mcap.discharge, loading: {}, restowList: mcap.restowList };
  }
  createRoot(document.getElementById('root')).render(
    React.createElement(PrintHubModal, { voyage, voyageKey: key, onClose: () => {}, initialMode: 'discharge', inspector: '연막' })
  );
}

//  ③ 4.19 R24 (§7.8-⑬) — 사전(ship_bay_dict_v3 읽기 사본의 키·bayDef 유무·신원)을 window.__fbShipBayDict 로 넣고 세 화면을 그린다. window.__R24dict 가 있으면 그 항목을 덧댄다(껍데기 등록 뒤 · 매트릭스 만든 뒤).
const r24 = window.__R24 || '';
if (r24) {
  window.__fbShipBayDict = Object.fromEntries(Object.entries(dm419.dict).map(([k, e]) => [k, { code: k, name: e.name || '', callsign: e.callsign || '', imo: e.imo || '', ...(e.hasBayDef ? { bayDef: { recordCount: 1 } } : {}) }]));
  Object.assign(window.__fbShipBayDict, window.__R24dict || {});
  const info = dm419.voyages[r24];
  const voyage = { key: r24, info };
  const root = document.getElementById('root');
  const mk = (id) => { const d = document.createElement('div'); d.id = id; root.appendChild(d); return d; };
  createRoot(mk('r24card')).render(React.createElement(VoyageCard, { voyage, activeInspectors: [], onOpen: () => {}, onDelete: null, onComplete: null, inspectorDone: false, modeDone: { d: false, l: false, hasD: false, hasL: false }, onUndoComplete: () => {} }));
  createRoot(mk('r24head')).render(React.createElement(Header, { version: '', inspector: '연막', online: true, route: { name: 'voyage', voyageKey: r24 }, voyages: { [r24]: voyage }, onChangeInspector: () => {}, onGoHome: () => {}, onLogout: () => {} }));
  //  베이플랜은 컨이 있어야 머리를 그린다 — 사전 없는 배의 EDI 꼴(베이·로우·단만) 네 대(내용은 시험 대상이 아니다 · 머리 딱지만 본다)
  const cs = ['02-01-82', '02-02-82', '03-01-84', '06-01-02'].map((p, i) => { const [bay, row, tier] = p.split('-'); return { cn: `TEST000000${i}`, bay: String(parseInt(bay, 10)), row, tier, iso: '45G1', fe: 'F', pod: 'KRPTK', pol: 'CNSHA', _mode: 'discharge' }; });
  createRoot(mk('r24bay')).render(React.createElement(BayPlan, { containers: cs, compMap: {}, xrayMap: {}, restowMap: {}, mode: 'discharge', onOpenContainer: () => {}, shipImo: info.imo || '', shipName: info.vsl, voyageInfo: info }));
}

//  ④ 4.22 R27 — window.__R27 = JSON {판 id: 경고 배열(runDiagnostics 출력)} 이면 판마다 주의 박스(DiagnosticsPanel 실소스)를 그린다. 컨을 누르면 window.__R27open 에 쌓인다.
const r27 = window.__R27 || '';
if (r27) {
  const root = document.getElementById('root');
  for (const [id, alerts] of Object.entries(JSON.parse(r27))) {
    const el = document.createElement('div'); el.id = id; root.appendChild(el);
    //  showOk — 항차 화면처럼 켠다(경고가 없으면 «이상없음 (세관 코드 OKY)» 한 줄). 판 id 가 n 으로 시작하면 끈 채(종전 호출).
    //  listRows — window.__R27rows = JSON {판 id: 비교한 리스트·세관 행 수(diagListRowCount)} · 없으면 0
    const rows = (() => { try { return JSON.parse(window.__R27rows || '{}')[id] || 0; } catch (e) { return 0; } })();
    createRoot(el).render(React.createElement(DiagnosticsPanel, { alerts, showOk: !id.startsWith('n'), listRows: rows, autoSpeak: false, onToggleSpeak: () => {}, onDismiss: () => {}, onOpenContainer: (cn) => { (window.__R27open = window.__R27open || []).push(cn); } }));
  }
}
