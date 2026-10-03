// 3.76 연막검사 진입점 — 접근 온오프 판정(staffList)·저장 함수(firebase.js)·자물쇠 화면을 실소스 그대로 묶는다
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccessLockScreen from '../src/components/AccessLockScreen.jsx';
export { setStaffOff, isStaffOff, lockedNameOf, ACCESS_DENIED_MSG, STAFF_LIST } from '../src/staffList.js';
export { fbSetStaffOff } from '../src/firebase.js';
export const lockMarkup = () => renderToStaticMarkup(React.createElement(AccessLockScreen));
