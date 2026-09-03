// 3.5-01 화면 연막검사 진입점 — 통계 탭 「시간대별 처리량」 제목이 실제로 무엇을 찍는지 눈으로 본다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import StatsTab from '../src/components/StatsTab.jsx';
import fx from './fixtures/pace_nsdc.json';

//  real = 그날 실기록 전체 · burst = 전부 한 순간에 몰아 찍은 날 · noinfo = 접안·이안 시각을 모르는 항차
const which = window.__SMOKE_WHICH || 'real';
const base = fx.doneAtsAll;
const ats = which === 'burst' ? base.map(() => base[base.length - 1]) : base;
const info = which === 'noinfo' ? { pier: fx.info.pier } : fx.info;

//  컨테이너·완료 기록은 실제 대수만큼 만든다(자리 정보는 이 화면 계산에 안 쓰인다).
const containers = ats.map((_, i) => ({
  cn: `TEST${String(1000000 + i)}`, bay: '01', row: '01', tier: '82',
  size: '20', type: 'GP', pod: 'KRPUS', pol: 'KRPTK', _ptk: true,
}));
const compMap = {};
const completed = {};
containers.forEach((c, i) => {
  const rec = { at: ats[i], by: i < 136 ? '김성일' : '이종부' };
  compMap[c.cn] = rec; completed[c.cn] = rec;
});
//  StatsTab 은 이제 항차를 통째로 받는다 — 페이스는 양하+선적 합계로 잰다.
const voyage = { info, loading: { completed }, discharge: { completed: {} } };

createRoot(document.getElementById('root')).render(
  React.createElement(StatsTab, { containers, compMap, xrayMap: {}, mode: 'loading', voyage, terminalWork: null })
);
