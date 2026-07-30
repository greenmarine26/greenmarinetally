// V9.23-06: 렌더 연막검사 진입점.
//   사고: hidden useMemo 가 아래 선언된 issues 를 참조 → 배포본이 앱 전체 크래시
//   ("Cannot access 'ge' before initialization"). 빌드도 번들 grep도 못 잡았다.
//   실제로 한 번 그려 보는 것만이 이 부류를 잡는다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import BayGridEditor from '../src/components/BayGridEditor.jsx';

const mkCn = (i) => `TEST${String(1000000 + i).padStart(7, '0')}`;
const containers = [];
let i = 0;
for (const bay of ['01', '03', '04', '05']) {
  for (const row of ['01', '02', '03', '04']) {
    for (const tier of ['82', '84', '86']) {
      containers.push({ cn: mkCn(i++), bay, row, tier, iso: bay === '04' ? '42GP' : '22GP',
        pol: 'KRPTK', pod: 'CNTAO', fe: 'F', _mode: 'loading' });
    }
  }
}
// 좌표 없는 컨(미배정) — 임시창고로 가야 한다
for (let k = 0; k < 3; k++) containers.push({ cn: mkCn(i++), bay: '', row: '', tier: '', iso: '22GP', pol: 'KRPTK', pod: 'CNTAO', fe: 'E' });

createRoot(document.getElementById('root')).render(
  React.createElement(BayGridEditor, {
    containers, mode: 'loading', shipName: 'SMOKE', shipImo: '',
    lockedCns: new Set(), storageCns: [], shiftCns: [],
    title: '연막검사', onSave: () => {}, onClose: () => {},
  })
);
