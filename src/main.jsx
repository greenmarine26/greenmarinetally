// 앱 진입점 — 루트 ErrorBoundary로 전체 화면 사라짐(흰 화면) 방지
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { installToastAlert } from './toast.js';
import './index.css';

// alert를 작업 흐름 안 끊는 토스트로 전환 (confirm/prompt는 그대로)
installToastAlert();

// V7.35: 루트 ErrorBoundary — 어디서든 런타임 에러 1건으로 React 트리 전체가
//   언마운트되어 흰 화면 + 카메라 멈춤이 되던 문제 방지. 인쇄 모달에만 있던
//   격리를 앱 전체로 확장. reloadButton으로 현장에서 즉시 복구 가능.
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary name="앱 전체" reloadButton>
    <App />
  </ErrorBoundary>
);
