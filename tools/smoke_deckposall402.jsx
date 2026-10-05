// 4.04-02 연막검사 진입점 — RZOR 선내위치 «덱_줄_칸» 이 미르·통계 탭·CSV·검색 목록에서 X-RAY 탭과 같은 좌표로 나오는지 실소스로 그려 본다. 검수사 2026-10-05 «같은 좌표로 맞출까요? 네 맞춰주세요»
import React from 'react';
import { createRoot } from 'react-dom/client';
import StatsTab from '../src/components/StatsTab.jsx';
import { exportSectionToCSV } from '../src/components/CSVExport.jsx';
import { parseDeckPlanWorkbook, deckCoordMap, withDeckPos } from '../src/rzorPlan.js';
import { fmtPos } from '../src/utils.js';
import { flattenVoyages, answerOne } from '../src/mir.js';
import { toMirContainers } from '../src/mirCore.entry.js';

//  덱플랜 읽기·좌표 붙이기·미르 답·통계·CSV 는 전부 앱 함수 그대로 — 파일·자료는 검사(.cjs)가 넣는다.
window.__P = { React, createRoot, StatsTab, exportSectionToCSV, parseDeckPlanWorkbook, deckCoordMap, withDeckPos, fmtPos, flattenVoyages, answerOne, toMirContainers };
