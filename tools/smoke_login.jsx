import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from '../src/pages/LoginPage.jsx';
// 2.22 연막검사 -- 로그인 목록 = «지금 로그인한 사람 ∪ 오늘 이 기기에서 로그인한 본인».
//   검수사가 두 번 교정한 규칙이다(2.12-01 → 2.22). 코드가 조용히 되돌아가면 여기서 걸린다.
// 2.4x 증설 -- PC 좌측 현황판 리뉴얼(헤더 통합·선박 2열 카드·수량 배지·인원 0 경고·터미널별 KPI 분해).
//   voyages 픽스처를 실물 모양으로 짠다: berth "동부두 15번선석"·pier "PCTC"·terminalStatus "working"·
//   planDate 과거/미래 둘 다(2026-08-25 NSFR 사고 -- 시작 전인데 "작업중"으로 뜬 것 -- 재현 케이스 포함).
const now = Date.now();
const inspectors = {
  a: { name: '김성일', lastActive: now - 5000,      loggedIn: true  },   // 지금 작업중 (배 미배정)
  b: { name: '이영수', lastActive: now - 3 * 3600e3, loggedIn: true  },  // 옛 플래그(허상)
  c: { name: '박철민', lastActive: now - 26 * 3600e3, loggedIn: false },
  d: { name: '최민호', lastActive: now - 48 * 3600e3, loggedIn: false },
  e: { name: '정대영', lastActive: now - 72 * 3600e3, loggedIn: false },
  // THIRDSHIP 담당으로 최근 활동 중 -- "인원 0 경고"가 뜨면 안 되는 대조군.
  f: { name: '오현우', lastActive: now - 4000, loggedIn: true, lastVoyage: 'THIRDSHIP_9001W' },
};

function fmt(d) {
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
let _seq = 0;
function mkC(iso, fe, rf) {
  _seq++;
  const cn = `TEST${1000000 + _seq}`;
  return { cn, iso, fe, rf: rf || undefined };
}
function mkContainers(list) {
  const out = {};
  list.forEach((c) => { out[c.cn] = c; });
  return out;
}

const voyages = {
  // 지금 실제로 작업중인 배 -- berthNo "15번" 렌더 + 수량 배지(20FT·MTY·리퍼·XRAY) 확인용.
  //   활동 중인 검수원을 아무도 안 붙였다 -- "검수원 0명" 경고가 떠야 하는 케이스.
  TESTSHIP_2601E: {
    info: {
      vsl: 'TESTSHIP', voy: '2601E', berth: '동부두 15번선석', pier: 'PCTC',
      terminalStatus: 'working',
      planDate: `${fmt(new Date(now - 3 * 3600e3))} ~ ${fmt(new Date(now + 6 * 3600e3))}`,
    },
    discharge: {
      ediContainers: mkContainers([
        mkC('2200', 'F'), mkC('2200', 'F'), mkC('2200', 'E'),   // 20DC Full x2 + Empty x1
        mkC('2230', 'F', true),                                  // 20RF(리퍼)
        mkC('4500', 'F'),                                        // 40HC
      ]),
      xrayList: { TESTCN0001111: {}, TESTCN0002222: {} },        // XRAY 2대
    },
    loading: { ediContainers: mkContainers([mkC('4500', 'F')]) },
  },
  // 2026-08-25 사고 재현 -- terminalStatus="working" 이지만 시작 시각(planDate 시작)이 아직 안 지났다.
  //   "작업중"으로 뜨면 안 되고(isWorkingNow 게이트), 시작 전이라 "검수원 0명" 경고도 뜨면 안 된다.
  NSFR_0138E: {
    info: {
      vsl: 'NSFR', voy: '0138E', berth: '동부두 13번선석', pier: 'PNCT',
      terminalStatus: 'working',
      planDate: `${fmt(new Date(now + 30 * 60e3))} ~ ${fmt(new Date(now + 8 * 3600e3))}`,
    },
    discharge: { ediContainers: mkContainers([mkC('2200', 'F')]) },
  },
  // pier 미상(실측 OBWH·RZOR 류) + 활동 검수원 있음 -- "검수원 0명" 경고가 뜨면 안 되는 대조군.
  THIRDSHIP_9001W: {
    info: {
      vsl: 'THIRDSHIP', voy: '9001W', berth: '', pier: '',
      terminalStatus: 'working',
      planDate: `${fmt(new Date(now - 1 * 3600e3))} ~ ${fmt(new Date(now + 5 * 3600e3))}`,
    },
    discharge: { ediContainers: mkContainers([mkC('2200', 'F')]) },
  },
  //  ★ 2.82 — «오늘·내일»이 아닌 **차순** 배들. 검수사 지시로 화면이 빌 때 이것으로 6대를 채운다.
  //    D+3 부터라 종전 코드에서는 board.ships 에 아예 안 담겼다(화면에서 통째로 사라졌다).
  ...Object.fromEntries([3, 4, 5, 6, 7].map((d, i) => [`FUTURE${i + 1}_100${i}E`, {
    info: {
      vsl: `FUTURE${i + 1}`, voy: `100${i}E`, berth: '동부두 5번선석', pier: 'PCTC',
      terminalStatus: 'planned',
      planDate: `${fmt(new Date(now + d * 86400e3))} ~ ${fmt(new Date(now + d * 86400e3 + 8 * 3600e3))}`,
    },
    discharge: { ediContainers: mkContainers([mkC('2200', 'F')]) },
  }])),
};

createRoot(document.getElementById('root')).render(
  React.createElement(LoginPage, { inspectors, voyages, onSelect: () => {}, extraStaff: {}, deletedStaff: {} })
);
