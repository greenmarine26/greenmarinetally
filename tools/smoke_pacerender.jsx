// 3.5-01 화면 연막검사 진입점 — 통계 탭 「시간대별 처리량」 제목이 실제로 무엇을 찍는지 눈으로 본다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import StatsTab from '../src/components/StatsTab.jsx';
import fx from './fixtures/pace_nsdc.json';

//  real = 그날 실기록 전체 · burst = 전부 몰아 찍은 날 · leejb = 이종부 혼자 찍은 80대(107초)
const which = window.__SMOKE_WHICH || 'real';
const ats = which === 'burst'
  ? fx.doneAts.map((_, i) => fx.doneAts[0] + Math.round(i * (31 * 60000 / fx.doneAts.length)))
  : which === 'leejb' ? fx.doneAtsLeeJB
  : fx.doneAts;

//  컨테이너·완료 기록은 실제 대수만큼 만든다(자리 정보는 이 화면 계산에 안 쓰인다).
const containers = ats.map((_, i) => ({
  cn: `TEST${String(1000000 + i)}`, bay: '01', row: '01', tier: '82',
  size: '20', type: 'GP', pod: 'KRPUS', pol: 'KRPTK', _ptk: true,
}));
const compMap = {};
containers.forEach((c, i) => { compMap[c.cn] = { at: ats[i], by: i < 34 ? '김성일' : '이종부' }; });

createRoot(document.getElementById('root')).render(
  React.createElement(StatsTab, { containers, compMap, xrayMap: {}, mode: 'loading', info: { pier: fx.pier } })
);
