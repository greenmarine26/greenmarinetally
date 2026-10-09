// 회귀 기준표 R16·R17(4.16 · §7.8-①②) 화면 입구 — smoke_regress.cjs 가 묶어 jsdom 에서 돌린다(쓰기 없음 — Firebase 는 메모리 스텁).
//   ① window.__r416.homeTotals — 홈 카드 막대가 쓰는 HomePage.computeStats 실소스(JSON 으로 받아 이 창 안에서 센다 — Set 이 창을 건너지 않게)
//   ② window.__R17 = 'kskm' | 'mcap' 이면 출력 센터(PrintHubModal)를 연다 — 검사가 카고플랜 단추를 누른다.
//      KSKM 2617N — 선사 서류·선적 EDI 가 없는 배(앱 예측만) · MCAP 639N — 선사 RESTOW LIST 5대(확정).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import { computeStats } from '../src/pages/HomePage.jsx';
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
