// 베이 상세에 X-RAY 세관봉인 실번호가 나오는지 재는 연막검사 진입점 (TallyOne 3.46).
//   검수사 2026-09-14 «베이상세(출력포함)에도 XRAY 실번호는 표기 바랍니다.
//   적정공간을 찾아서 외관을 해치지 않게 주의 하여 주시기 바랍니다.»
//   ⚠ 두 진입 경로를 **둘 다** 그린다 — 출력 허브(컨에 표식이 얹혀 온다)와 베이플랜(지도만 온다).
import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintableBayDetail from '../src/components/PrintableBayDetail.jsx';
import { MID_FIT, MID_W } from '../src/components/PrintableBayDetail.jsx';
import PrintHubModal from '../src/components/PrintHubModal.jsx';
import fx from './fixtures/xrayseal_pcsz.json';
import mcsc from './fixtures/podpat_mcsc.json';
import hub from './fixtures/printhub_kbtr.json';

//  ⚠ **가장 좁은 배로 잰다.** 칸 폭은 uniformCell 이 정하고 실측 최소는 MCSC 의 87px(안폭 79px)다.
//    사전을 안 깔면 매트릭스 격자(.cpv2-cell)가 아예 안 그려지고 폴백 격자(안폭 174px)로 재게 된다 —
//    2.2배 넓은 자라 «안 넘친다» 가 아무것도 증명하지 못한다(감사 실측).
window.__fbShipBayDict = { MCSC: mcsc.dict };

//  검사가 폭 셈법을 직접 부를 수 있게 내보낸다
if (typeof module !== 'undefined' && module.exports) { module.exports.MID_FIT = MID_FIT; module.exports.MID_W = MID_W; }
window.__MID = { MID_FIT, MID_W };
window.print = function () {};
window.alert = function () {};

const rows = Object.entries(fx.edi).map(([k, e]) => {
  const cn = String((e && e.cn) || k).toUpperCase();
  return Object.assign({}, e, { cn });
});
//  DG 가 겹친 칸을 하나 만든다 — 검수사 «둘 다 표기» 가 베이 상세에서도 지켜지는지 본다
const xcns = Object.keys(fx.xrayList);
rows.forEach((r) => { if (r.cn === xcns[0]) { r.imdg = '9'; } });
//  ⚠ 이 항차 봉인번호는 전부 6자리다. 실제로는 DJCT 처럼 «DJHN225094»(10자) 도 온다 —
//    그 길이가 칸을 넘지 않는지 같이 재야 한다(안 재면 긴 번호가 조용히 잘린다).
const LONG = ['DJHN225094', 'DJHN225094-1', '271282'];
xcns.slice(1, 4).forEach((cn, i) => { fx.xraySeals[cn] = { seal: LONG[i] }; });
//  리퍼 온도와 겹친 칸도 하나 — 온도 + 봉인번호가 같이 나와야 한다
rows.forEach((r) => { if (r.cn === xcns[4]) { r.tmp = '-18'; } });

//  경로 A — 출력 허브처럼 컨에 표식을 미리 얹어 보낸다
const tagged = rows.map((r) => (fx.xrayList[r.cn]
  ? Object.assign({}, r, { _xray: true, _xraySealNo: String((fx.xraySeals[r.cn] || {}).seal || '').trim() })
  : r));
//  경로 B — 베이플랜처럼 **지도만** 넘긴다(컨에는 아무 표식이 없다)
//  ⚠ 위에서 봉인번호를 실제 긴 번호로 바꿨다 — 검사 쪽이 **그린 값**과 맞대려면 이 판을 넘겨야 한다.
window.__FX = { xrayList: fx.xrayList, xraySeals: fx.xraySeals, xcns };

const info = { vsl: 'PCSZ', vslFull: 'PACIFIC SHENZHEN', voy: '2620E' };
//  ⚠ 이 화면은 createPortal 로 **document.body** 에 붙는다 — 세 root 에 따로 그리면 한 자리에 겹친다.
//    그래서 검사 쪽이 시키는 하나만 그린다(WHICH 를 바꿔 가며 세 번 돌린다).
const WHICH = process.env.BDX_WHICH || 'A';

//  경로 D — **가장 좁은 배(MCSC 87px)의 매트릭스 격자**. 여기서 넘치면 종이에서 글자가 사라진다.
if (WHICH === 'D') {
  const mrows = Object.entries(mcsc.edi).map(([k, e]) => Object.assign({}, e, { cn: String((e && e.cn) || k).toUpperCase() }));
  //  실데이터에 X-RAY 를 얹는다 — 실봉인 길이 세 가지(6자 · 10자 · 13자)와 리퍼 온도 겹침까지
  const xl = {}; const xs = {};
  //  실봉인 형식만 쓴다 — 픽스처 실측은 6자(523533·271282)와 10자(DJHN225094)다. 지어내지 않는다.
  const SEALS = ['523533', 'DJHN225094', '271282'];
  mrows.slice(0, 30).forEach((r, i) => { xl[r.cn] = { at: 1 }; xs[r.cn] = { seal: SEALS[i % 3] }; if (i % 2) r.tmp = '-23.5'; });
  window.__FX = { xrayList: xl, xraySeals: xs, xcns: Object.keys(xl) };
  createRoot(document.getElementById('rootA')).render(
    React.createElement(PrintableBayDetail, {
      containers: mrows, mode: 'discharge',
      voyageInfo: { vsl: 'MCSC', vslFull: (mcsc.dict && mcsc.dict.name) || 'MCSC', voy: '1', callsign: (mcsc.dict && mcsc.dict.callsign) || '' },
      shipName: (mcsc.dict && mcsc.dict.name) || 'MCSC', shipImo: (mcsc.dict && mcsc.dict.imo) || '',
      voyageKey: 'MCSC_1', xrayMap: xl, xraySeals: xs, onClose: () => {},
    })
  );
}
//  경로 E — **검수사가 실제로 누르는 길**(출력 허브 → 베이 상세). 배선이 한 줄이라도 빠지면 여기서 드러난다.
if (WHICH === 'E') {
  const v = JSON.parse(JSON.stringify(hub));
  const sec = v.discharge || (v.discharge = {});
  const cns = Object.keys(sec.ediContainers || {}).slice(0, 8);
  sec.xrayList = {}; sec.xraySeals = {};
  cns.forEach((cn, i) => { sec.xrayList[cn] = { at: 1 }; sec.xraySeals[cn] = { seal: 'HUB' + (100000 + i) }; });
  window.__FX = { xrayList: sec.xrayList, xraySeals: sec.xraySeals, xcns: cns };
  createRoot(document.getElementById('rootA')).render(
    React.createElement(PrintHubModal, { voyage: v, voyageKey: 'KBTR_2606E', onClose: () => {} })
  );
}
if (WHICH === 'A') createRoot(document.getElementById('rootA')).render(
  React.createElement(PrintableBayDetail, {
    containers: tagged, mode: 'discharge', voyageInfo: info, voyageKey: 'PCSZ_2620E',
    xrayMap: fx.xrayList, xraySeals: fx.xraySeals, onClose: () => {},
  })
);
if (WHICH === 'B') createRoot(document.getElementById('rootB')).render(
  React.createElement(PrintableBayDetail, {
    containers: rows, mode: 'discharge', voyageInfo: info, voyageKey: 'PCSZ_2620E',
    xrayMap: fx.xrayList, xraySeals: fx.xraySeals, onClose: () => {},
  })
);
//  경로 C — X-RAY 지도를 아예 안 넘긴다. 외관이 3.45 와 같아야 한다(줄 수·칸 크기).
if (WHICH === 'C') createRoot(document.getElementById('rootC')).render(
  React.createElement(PrintableBayDetail, {
    containers: rows, mode: 'discharge', voyageInfo: info, voyageKey: 'PCSZ_2620E', onClose: () => {},
  })
);
