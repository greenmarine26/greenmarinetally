// 4.04-01 연막검사 진입점 — RZOR X-RAY 탭 «선내위치» 가 덱플랜 좌표(C_8_21 형식)로 나오는지 실소스로 그려 본다. 검수사 2026-10-05 «XRAY실번호를 넣으면 위치표기가 안됩니다. 위치를 C_8_21 D_5_04 이런식으로 실제 위치를 넣어 주세요»
import React from 'react';
import { createRoot } from 'react-dom/client';
import XrayTab from '../src/components/XrayTab.jsx';
import { parseDeckPlanWorkbook, deckCoordMap, deckCoordCode } from '../src/rzorPlan.js';

//  덱플랜 파일 읽기는 앱과 같은 함수, 그리기는 앱의 XrayTab 그대로 — 파일·자료는 검사(.cjs)가 넣는다.
window.__P = { React, createRoot, XrayTab, parseDeckPlanWorkbook, deckCoordMap, deckCoordCode };
