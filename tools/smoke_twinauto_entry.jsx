// 수동 트윈 선적 연막검사용 번들 입구 — React·react-dom·PositionEditModal 을 한 번들로 묶어 같은 React 사본을 쓰게 한다
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PositionEditModal from '../src/components/PositionEditModal.jsx';
export { React, act, createRoot, PositionEditModal };
