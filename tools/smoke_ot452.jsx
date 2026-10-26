// 4.52 렌더 진입점 — 연태 오픈탑 실 컨(OBWH 2775E·2765E)으로 컨 상세 화면(실소스)을 그려 «하이큐 오픈탑» 표기와 규격 갈림 카드를 잰다.
//   firebase 는 실 firebase.js 를 두고 SDK 만 tools/stub_fbdb_mem.js 메모리 DB 로 바꾼다(실제 쓰기 없음 — 빌드 블록이 --alias 로 건다).
//   검수사 2026-10-26 08:51 «오픈탑중에 일반 20OT와 20 하이큐 OT이 있는데 표기가 여러개 입니다» · 09:16 «오픈탑으로 잡고 하이큐 오픈탑으로 표기 하면되는것인데»
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import F from './fixtures/ot452_ytf_opentop.json';

window.__calls = window.__calls || [];   // 스텁 firebase 의 기록 통
window.__F = F;
const root = createRoot(document.getElementById('root'));
let mk = 0;
window.__renderDetail = (c) => { mk += 1; root.render(React.createElement(ContainerDetailModal, { key: 'd' + mk, c, comp: null, mode: 'discharge', voyageKey: 'OBWH_2775E', inspector: '연막', onClose: () => {} })); };
