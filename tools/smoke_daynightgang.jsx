// 3.66 연막검사 진입점 — 주야간 작업보고 화면을 실데이터(OBWH 2751E · RZOR R106E 09-28 12:36 사본)로 실제로 그려 갱별 카드를 잰다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { setEquipNumber } from '../src/utils.js';
import FX from './fixtures/daynight_gang_real.json';
import FF from './fixtures/ferry1700.json';
import FO from './fixtures/daynight_gang_obwh_1612.json';   // 3.66-02: 검수사 16:04 캡처 «규격표 없음» 그 상태(OBWH 2751E 16:12 사본)   // 마감 뒤(17:05·17:20) 한 벌 검사 — OBWH 2749E 09-26 17:00:30 실자료 사본
import { ferryCutItem, ferryRepShapeOk } from '../src/components/Ferry1700Alert.jsx';
import { buildFerry1700Message } from '../src/kakaoShare.js';   // 3.66-02: 카톡 문구도 같은 보고로
import { buildGangShiftReport } from '../src/utils.js';
import { getShipBayDictData } from '../src/shipStructure.js';
import { buildBayPagesFromSummary } from '../src/cargoPlanCore.js';
import { shiftReportKey } from '../src/utils.js';

window.__fbShipBayDict = FX.dict;   // 베이사전 정본(보관소) 사본 — 앱이 구독해 두는 자리와 같다
window.__DN = { FX, FF, FO, setEquipNumber, ferryCutItem, shiftReportKey, ferryRepShapeOk, buildFerry1700Message, buildGangShiftReport,
  pagesOf: (v) => { const i = v.info || {}; const d = getShipBayDictData(i.imo, i.vsl, { vslCode: i.vsl, callsign: '', vslFull: i.vslFull || i.vsl }); return d && d.bayDef ? buildBayPagesFromSummary(d.bayDef) : null; } };
let setRef = null;
function App() {
  const [st, setSt] = React.useState({ key: '', n: 0, v: null });
  setRef = setSt;
  if (!st.key) return null;
  return React.createElement(WorkReportModal, { key: st.key + st.n, open: true, voyageKey: st.key, voyage: st.v || FX[st.key], lastEquip: '1호기', onClose: () => {} });
}
window.__open = (key, v = null) => setRef && setRef((s) => ({ key, v, n: s.n + 1 }));
createRoot(document.getElementById('root')).render(React.createElement(App));
