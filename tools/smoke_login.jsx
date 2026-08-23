import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from '../src/pages/LoginPage.jsx';
// 2.22 연막검사 — 로그인 목록 = «지금 로그인한 사람 ∪ 오늘 이 기기에서 로그인한 본인».
//   검수사가 두 번 교정한 규칙이다(2.12-01 → 2.22). 코드가 조용히 되돌아가면 여기서 걸린다.
const now = Date.now();
const inspectors = {
  a: { name: '김성일', lastActive: now - 5000,      loggedIn: true  },   // 지금 작업중
  b: { name: '이영수', lastActive: now - 3*3600e3,  loggedIn: true  },   // 옛 플래그(허상)
  c: { name: '박철민', lastActive: now - 26*3600e3, loggedIn: false },
  d: { name: '최민호', lastActive: now - 48*3600e3, loggedIn: false },
  e: { name: '정대영', lastActive: now - 72*3600e3, loggedIn: false },
};
createRoot(document.getElementById('root')).render(
  React.createElement(LoginPage, { inspectors, onSelect: () => {}, extraStaff: {}, deletedStaff: {} })
);
