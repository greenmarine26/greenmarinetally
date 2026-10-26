// 4.51 렌더 진입점 — 같은 실데이터 모양(2026-10-26 08:09 KST 실 15항차 + 옛 데이터 SWBT 한 척)으로 홈 목록과 로그인 현황판을 각각 실제로 그린다. window.__MODE = 'home' | 'login'.
//   firebase 는 tools/fb_stub_search.js 스텁(실제 쓰기 없음 — 빌드가 src/firebase.js 를 잠시 바꿔 끼운다). 시각은 그날 기준 상대 날짜+HH:MM 으로 옮겨 날이 지나도 같은 모양이다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from '../src/pages/LoginPage.jsx';
import HomePage from '../src/pages/HomePage.jsx';
import { setActiveWorkChoice } from '../src/workChoice.js';
import F from './fixtures/planorder451.json';

window.__calls = window.__calls || [];   // 스텁 firebase 의 기록 통(홈의 출항 표시 저장 시도가 여기에 쌓일 뿐 실제 쓰기는 없다)
const p2 = (n) => String(n).padStart(2, '0');
const today = new Date(); today.setHours(0, 0, 0, 0);
const at = (day, hm) => { const [h, m] = hm.split(':').map(Number); return new Date(today.getFullYear(), today.getMonth(), today.getDate() + day, h, m); };
const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
let seq = 0;
//  홈의 «자료 대기» 접기와 섞이지 않게 전 배에 평택 양하 컨 한 대씩(자료 있음 — pod 가 평택이어야 홈이 «자료 있음» 으로 센다) — 홈의 주 목록(펼친 묶음·접힘)이 실제로 그려지게 한다.
const oneC = () => { seq++; const cn = `TEST${1000000 + seq}`; return { [cn]: { cn, iso: '2200', fe: 'F', pod: 'KRPTK' } }; };
const voyages = {};
for (const s of F.ships) {
  voyages[s.key] = {
    info: { vsl: s.vsl, voy: s.voy_d, voy_d: s.voy_d, voy_l: s.voy_l, pier: s.pier, berth: s.berth, terminalStatus: s.terminalStatus, workStartAt: s.workStartAt,
            planDate: `${fmt(at(s.startDay, s.startHM))} ~ ${fmt(at(s.endDay, s.endHM))}` },
    discharge: { ediContainers: oneC() },
  };
}
//  옛 데이터 재현 — 수집기가 표의 입항일시(어제 08:00)를 계획 시작으로 쓰던 SWBT(작업 시작 전 · 끝은 모레 17:00). 홈은 맨 위, 로그인은 «지난 배» 로 빠지던 그 모양.
voyages.SWBTOLD_2616N = {
  info: { vsl: 'SWBTOLD', voy: '2616N', voy_d: '2616N', voy_l: '2618S', pier: 'PCTC', berth: '동부두 6번선석', terminalStatus: 'working', workStartAt: '',
          planDate: `${fmt(at(-1, '08:00'))} ~ ${fmt(at(2, '17:00'))}` },
  discharge: { ediContainers: oneC() },
};

//  끝난 배 재현 — 오늘 시작해 계획 끝이 이미 지난 배(작업중 아님). 홈은 «오늘» 묶음의 맨 뒤(끝난 배 등급), 로그인은 «오늘» 줄 맨 위(시작 순)에 올라 있던 모양.
//    자정 직후 20분 안에는 «오늘 시작해 오늘 끝난» 구간을 만들 수 없어 이 배를 빼고 window.__ENDED_OK = false 로 알린다(시험이 이 배 단언을 건너뛰지 않고 «없음» 으로 센다).
{
  const sinceMid = Date.now() - today.getTime();
  window.__ENDED_OK = sinceMid >= 20 * 60e3;
  if (window.__ENDED_OK) {
    voyages.ENDEDTODAY_2601E = {
      info: { vsl: 'ENDEDTODAY', voy: '2601E', voy_d: '2601E', voy_l: '2601W', pier: 'PCTC', berth: '동부두 5번선석', terminalStatus: 'planned', workStartAt: '',
              planDate: `${fmt(new Date(today.getTime() + sinceMid * 0.2))} ~ ${fmt(new Date(today.getTime() + sinceMid * 0.7))}` },
      discharge: { ediContainers: oneC() },
    };
  }
}

//  일찍 떠난 다일 배 재현 — 어제 20:00 시작·계획 끝은 앞으로 9시간 뒤인데 터미널이 «떠남» 으로 적고 작업 끝 시각(workEndAt)이 2시간 전. 계획 끝만 보면 «안 끝난 배» 로 읽히지만 이미 떠난 배다.
{
  const t0 = Date.now();
  voyages.DEPEARLY_2602E = {
    info: { vsl: 'DEPEARLY', voy: '2602E', voy_d: '2602E', voy_l: '2602W', pier: 'PCTC', berth: '동부두 4번선석', terminalStatus: 'departed', workStartAt: fmt(at(-1, '21:00')), workEndAt: fmt(new Date(t0 - 2 * 3600e3)),
            planDate: `${fmt(at(-1, '20:00'))} ~ ${fmt(new Date(t0 + 9 * 3600e3))}` },
    discharge: { ediContainers: oneC() },
  };
}

const inspectors = { a: { name: '김성일', lastActive: Date.now() - 5000, loggedIn: true } };
const mode = window.__MODE || 'login';
const root = createRoot(document.getElementById('root'));
if (mode === 'home') {
  setActiveWorkChoice({ mode: 'view' });
  root.render(React.createElement(HomePage, { voyages, inspectors, inspector: '김성일', portMisData: {}, pilotForecast: {}, heartbeat: null,
    onRefreshData() {}, refreshing: false, refreshedAt: 0, onOpenVoyage() {}, onOpenChiefDashboard() {}, onOpenAux() {} }));
} else {
  root.render(React.createElement(LoginPage, { inspectors, voyages, onSelect: () => {}, extraStaff: {}, deletedStaff: {} }));
}
