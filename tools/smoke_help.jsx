// 2.27 매뉴얼 연막검사 진입점 — 두 권을 **실제로 열어 본다.**
//   확인하는 것: ①공용 권 카테고리가 전부 열리는가 ②수석 권이 열리는가(2.27 이전엔 눌러도 아무 데도 안 갔다)
//                ③화면 그림(HelpShot)이 실제로 그려지는가 ④수석 전용 항목이 공용 권에 남아 있지 않은가.
//   ⚠ 매뉴얼은 «있는 줄도 모르면 안 만든 것과 같다»(CLAUDE.md 0-B). 안 열리는 권은 없는 권이다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import HelpModal from '../src/components/HelpModal.jsx';

createRoot(document.getElementById('root')).render(
  React.createElement(HelpModal, {
    open: true, onClose: () => {},
    //  2.27-01: 로그아웃 경우도 같은 번들로 본다 — 이름이 없으면 «잠김»이어야 한다.
    inspector: (typeof window !== 'undefined' && window.__SMOKE_NO_INSPECTOR) ? '' : '김성일',
  })
);
