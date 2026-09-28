// 3.66 연막검사 진입점 — 주야간 작업보고 화면을 실데이터(OBWH 2751E · RZOR R106E 09-28 12:36 사본)로 실제로 그려 갱별 카드를 잰다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { setEquipNumber } from '../src/utils.js';
import FX from './fixtures/daynight_gang_real.json';
import FF from './fixtures/ferry1700.json';   // 마감 뒤(17:05·17:20) 한 벌 검사 — OBWH 2749E 09-26 17:00:30 실자료 사본
import { ferryCutItem } from '../src/components/Ferry1700Alert.jsx';
import { shiftReportKey } from '../src/utils.js';

window.__fbShipBayDict = FX.dict;   // 베이사전 정본(보관소) 사본 — 앱이 구독해 두는 자리와 같다
window.__DN = { FX, FF, setEquipNumber, ferryCutItem, shiftReportKey };
let setRef = null;
function App() {
  const [st, setSt] = React.useState({ key: '', n: 0, v: null });
  setRef = setSt;
  if (!st.key) return null;
  return React.createElement(WorkReportModal, { key: st.key + st.n, open: true, voyageKey: st.key, voyage: st.v || FX[st.key], lastEquip: '1호기', onClose: () => {} });
}
window.__open = (key, v = null) => setRef && setRef((s) => ({ key, v, n: s.n + 1 }));
createRoot(document.getElementById('root')).render(React.createElement(App));
