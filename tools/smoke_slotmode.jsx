// 자리 확인 모드 렌더 검사 진입점 — 선적 엠티 카드에서 «이 자리에 실제로 실은 컨테이너» 칸이
//   실제로 그려지고, 끝4자리를 치면 후보가 뜨고, 규격 다른 후보에 경고가 붙는지 눈으로 확인한다.
//   (2.80 — 검수사 «말로는 모르겠습니다. 실물을 사용해보고»)
import React from 'react';
import { createRoot } from 'react-dom/client';
//  ⚠ 실제로 눌러 본다 — 코드만 읽고 «이론상 된다»로 넘기지 않는다(검수사 지적 2026-08-28).
//    firebase 를 메모리 스텁으로 갈아 끼워, 버튼을 눌렀을 때 **어떤 인자로 무엇이 불렸는지**를 잡는다.
window.__calls = [];
import GuidedWorkPanel from '../src/components/GuidedWorkPanel.jsx';

window.__fbShipBayDict = { SMOKE: { name: 'SMOKE', code: 'SMOKE', callsign: 'SMOKE1', imo: '',
  bayDef: { baysSummary: [{ bay: '24', bayNo: 24, deckAlign: 'center', deckCells: [6,6,6], deckHasZero: false,
    deckTiers: [88,86,84], hasDeck: true, hasHold: false, hasZero: false, hatchCount: 1,
    holdAlign: 'center', holdCells: [], holdTiers: [], rowCount: 6, source: 'edi' }], recordCount: 1, verified: true } } };
try { localStorage.setItem('gm_equip_number', '4호기'); } catch (e) { /* jsdom 저장소 없음 */ }

// 실측 모양 그대로 — STSE 2666W 24베이 데크 엠티 구간
const mk = (cn, bay, row, tier, fe, iso) => ({ cn, bay, row, tier, fe, iso, pol: 'KRPTK', pod: 'CNSHD',
  _mode: 'loading', _ptk: true, _comp: false, l4: cn.slice(-4) });
const containers = [
  mk('TCNU8123456', '24', '03', '84', 'E', '22GE'),   // 이 자리의 계획 컨
  mk('BEAU2977719', '24', '05', '84', 'E', '22GE'),   // 실제로 온 컨 (규격 같음 — 초록)
  mk('TEMU4477719', '24', '07', '84', 'F', '42GP'),   // 끝4 같지만 규격 다름 (경고)
  mk('SKLU1002233', '24', '01', '84', 'E', '22GE'),
];
const voyage = { info: { vsl: 'SMOKE', imo: '', berth: '동부두 6번선석', voy_l: '2666W', berthSide: 'starboard' } };
createRoot(document.getElementById('root')).render(
  React.createElement(GuidedWorkPanel, { voyage, voyageKey: 'SMOKE_1E', inspector: '클로드',
    allContainers: containers, workFilter: 'loading', onSwitchManual: () => {} })
);
