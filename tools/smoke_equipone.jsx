// 3.36 연막검사 진입점 — 작업 보고 창을 실제로 그려 «시작보고 호기 = 앱 호기» 를 잰다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkReportModal from '../src/components/WorkReportModal.jsx';
import { getEquipNumber, setEquipNumber } from '../src/utils.js';

//  3.36: 헤더 배지가 호기 바뀜을 따라가는지 재려고 **같은 규칙**(equipChanged 를 듣는다)으로 작은 배지를 하나 둔다.
//    Header.jsx 전체를 그리려면 화면 뼈대가 다 필요해, 이 검사는 «리스너가 실제로 도는가»만 본다 —
//    Header 자체가 그 리스너를 갖고 치우는지는 소스로 함께 확인한다(smoke_equipone.cjs).
function EquipBadge() {
  const [eq, setEq] = React.useState(getEquipNumber());
  React.useEffect(() => {
    const on = (e) => setEq((e && e.detail) || getEquipNumber());
    window.addEventListener('equipChanged', on);
    return () => window.removeEventListener('equipChanged', on);
  }, []);
  return React.createElement('span', { id: 'smokeHeaderEquip' }, eq || '');
}

window.__EQ = { getEquipNumber, setEquipNumber };

//  실데이터 모양 그대로 — `archive/ATPR_2640E`(검수사가 메모를 남긴 그 항차)의 info 를 베낀다.
const voyage = {
  info: { vsl: 'ATPR', vslFull: 'ATLANTIC PIONEER', voy: '2640E', voy_d: '2640E', voy_l: '2640W',
          pier: 'PCTC', berth: '동부두 6번선석', berthSide: '우현', lane: 'PDX4' },
  discharge: { ediContainers: {}, completed: {}, records: {} },
  loading: { ediContainers: {}, completed: {}, records: {} },
};

createRoot(document.getElementById('root')).render(
  React.createElement(React.Fragment, null,
    React.createElement(EquipBadge, null),
    React.createElement(WorkReportModal, {
    open: true,
    voyageKey: 'ATPR_2640E',
    voyage,
    lastEquip: window.__SMOKE_LAST || '1호기',
    inspector: '김성일',
      onClose: () => {},
    })
  )
);
