// 2.26 X-RAY 탭 연막검사 진입점 — 세관 목록·위치·봉인을 붙여 **실제로 그려 본다.**
//   확인하는 것: ①정렬이 «베이별순 + 우선양하순»인가 ②화물구분 4종 집계 ③값 없는 칸이 «미입력»으로 보이는가.
//   ⚠ 빌드 통과는 안전이 아니다(§2-2-D). 이 탭은 조인이 넷(xrayList·EDI·xraySeals·completed)이라 그려 봐야 안다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import XrayTab from '../src/components/XrayTab.jsx';

//  일부러 섞어 넣는다 — 정렬이 살아 있으면 아래 기대 순서로 나와야 한다.
//    베이 2 데크 84 → 베이 2 데크 82 → 베이 2 홀드 08 → 베이 2 홀드 06 → 베이 10 데크 88
const C = (cn, bay, row, tier, iso) => ({ cn, bay, row, tier, iso });
const containers = [
  C('SMOKU100006', '10', '01', '88', '45G1'),
  C('SMOKU100003', '2', '01', '06', '22G1'),
  C('SMOKU100001', '2', '01', '84', '45G1'),
  C('SMOKU100002', '2', '02', '82', '45R1'),
  C('SMOKU100004', '2', '03', '08', '22G1'),
  C('SMOKU100005', '2', '04', '08', '22G1'),
];
const K = (seal, kind, iso) => ({ at: 1, seal, kind, iso, dest: '평택 제2컨테이너검색기' });
const xrayMap = {
  SMOKU100001: K('011074', 'X-RAY', '45GP'),
  SMOKU100002: K('S38233', 'X-RAY', '45RE'),
  SMOKU100003: K('004819', 'Sea & Air', '22GP'),
  SMOKU100004: K('326798', '반입후검사', '22GP'),
  SMOKU100005: K('903170', '즉시검사', '22GP'),
  SMOKU100006: K('540921', 'X-RAY', '45GP'),
};
//  봉인은 **하나만** 채운다 — 나머지는 «미입력»으로 보여야 하고, 인쇄에서는 밑줄 칸이 된다.
const xraySeals = { SMOKU100001: { seal: 'KC0012345', sealer: '김성일' } };
//  봉인자 폴백 — 따로 적은 게 없으면 그 컨을 완료한 검수자가 봉인자다.
const compMap = { SMOKU100002: { by: '박철민', at: 1, equip: '4호기' } };

createRoot(document.getElementById('root')).render(
  React.createElement(XrayTab, {
    voyage: { info: { vsl: 'SMOKE', voy_d: '2601E', callsign: 'SMK9', pier: 'PNCT' } },
    voyageKey: 'SMOKE_2601E', mode: 'discharge',
    containers, xrayMap, xraySeals, compMap,
    portMisData: { SMK9: { callsign: 'SMK9', mrnIn: '26SMOK2601I', mrnOut: '26SMOK2602E' } },
  })
);
