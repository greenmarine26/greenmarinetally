// 2.18 렌더 연막검사 — 양하/선적 리스트 탭의 **PC 2단 배치**.
//   빌드 통과는 안전이 아니다(작업표준 §2-2-D). 이 판은 1,300줄짜리 상세 렌더를 함수로 들어내
//   두 자리(오버레이 모달 / 우측 고정 칼럼)에서 같이 쓰게 바꿨다 — 실제로 그려 봐야 잡히는 부류다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListTab } from '../src/pages/VoyagePage.jsx';

const mkCn = (i) => `SMOK${String(1000000 + i).padStart(7, '0')}`;
const containers = [];
for (let i = 0; i < 12; i++) {
  const cn = mkCn(i);
  containers.push({
    cn, l4: cn.slice(-4), bay: '16', row: '02', tier: '84',
    iso: i % 3 === 0 ? '22RF' : '42GP', fe: i % 4 === 0 ? 'E' : 'F',
    pol: 'CNTAO', pod: 'KRPTK', op: 'MSK',
    tmp: i % 3 === 0 ? '14' : '', sl: 'PMBU' + (100000 + i), wt: 12000 + i * 10,
  });
}
const ediMap = Object.fromEntries(containers.map((c) => [c.cn, c]));

createRoot(document.getElementById('root')).render(
  React.createElement(ListTab, {
    voyageKey: 'SMOKE_2601E', mode: 'discharge',
    containers, ediMap, recMap: {}, xrayMap: { [containers[1].cn]: true }, xraySeals: {}, compMap: {},
    inspector: '연막', onOpenContainer: () => {},
    externalFilter: 'all',   // 1.84 기본 닫힘 — 칩을 눌러 둔 상태로 시작한다
    shiftingList: [], shiftInfo: null, onAsk: null,
    vsl: 'SMOKE', pier: 'PNCT', briefCtx: null,
    detailPanel: React.createElement('div', { className: 'card-v2' }, '연막_우측패널_표식'),
  })
);
