// 끝4자리 중복 렌더 연막검사 진입점(3.2-01) — NSDC 2608N 실데이터로 SearchPanel(수동 검색)을 그려 «0320» 을 친다.
//   김성일 메모 09-03 «컨번호 중복적으로 문제»: 평택 FFAU4440320 을 완료하자 부산 SEGU2520320 이 완료 카드로 승격돼 4초 뒤 완료됐다.
//   firebase 는 tools/fb_stub_search.js 스텁 — 실제 쓰기 없음. 완료 반영은 window.__render(completed) 로 다시 그려 흉내 낸다.
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__calls = [];
import SearchPanel from '../src/components/SearchPanel.jsx';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import FX from './fixtures/dup4_nsdc.json';
import FXL from './fixtures/dup4_pcbj.json';   // 선적(PCBJ 2609N) — 위치 지정 트윈·리스트 전용 컨

try { localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { /* jsdom 저장소 없음 */ }
const root = createRoot(document.getElementById('root'));
window.__render = (completed) => {
  const voyage = { info: FX.info, discharge: { ediContainers: FX.ediContainers, records: FX.records, completed: completed || {} } };
  root.render(React.createElement(SearchPanel, {
    voyage, voyageKey: 'NSDC_2608N', inspector: '김성일', mode: 'discharge',
    onOpenContainer: (c) => { window.__calls.push({ fn: 'openDetail', cn: c && c.cn }); },
  }));
};
window.__render({});
//  선적 — 위치 지정 방식 트윈(재감사 P1-A)·리스트 전용 컨(P1-1). 새 루트라 양하 쪽 상태와 섞이지 않는다.
const lroot = document.createElement('div'); lroot.id = 'lod'; document.body.appendChild(lroot);
let lr = createRoot(lroot);
window.__renderLoading = (completed) => {
  const voyage = { info: FXL.info, loading: { ediContainers: FXL.ediContainers, records: FXL.records, completed: completed || {} } };
  if (!lr) lr = createRoot(lroot);
  lr.render(React.createElement(SearchPanel, {
    voyage, voyageKey: 'PCBJ_2609N', inspector: '김성일', mode: 'loading',
    onOpenContainer: (c) => { window.__calls.push({ fn: 'openDetail', cn: c && c.cn }); },
  }));
};
window.__unmountLoading = () => { lr.unmount(); lr = null; };
//  옆길(감사 P1-2 a) — 베이플랜→상세창 모양(플래그 없는 컨 객체)으로 통과분을 열어 [양하확인]을 눌러 본다.
const droot = document.createElement('div'); droot.id = 'detail'; document.body.appendChild(droot);
const dr = createRoot(droot);
window.__renderDetail = (c, extra) => {
  dr.render(React.createElement(ContainerDetailModal, {
    c, comp: null, isXray: false, xraySeal: null, mode: 'discharge', voyageKey: 'NSDC_2608N', voyageInfo: FX.info, inspector: '김성일',
    onClose: () => {}, sealMode: null, allContainers: Object.values(FX.ediContainers), records: FX.records, ...(extra || {}),
  }));
};
