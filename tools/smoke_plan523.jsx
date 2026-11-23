// 5.23 연막검사 진입점 — 터미널 시프팅·선적 «예정»을 XTPG 550E 실자료(RTDB GET 2026-11-23 22:12)와 실소스로 잰다. 실 Firebase 쓰기 없음.
//   검수사 2026-11-23 21:45 «다만 예정입니다 확정이 아닙니다» · 22:07 «검수앱에선 카토스라는 문자가 노출되면 안됩니다. 그냥 예정으라고 해야 합니다».
import React from 'react';
import { createRoot } from 'react-dom/client';
import ValidationBox from '../src/components/ValidationBox.jsx';
import { planShiftOf, predictedShiftingForDisplay, shiftingMapForDisplay, isPredShift, shiftEvidenceOf, shiftingListOf } from '../src/utils.js';
import FX from './fixtures/plan523_xtpg550e.json';
window.__T = { React, createRoot, ValidationBox, planShiftOf, predictedShiftingForDisplay, shiftingMapForDisplay, isPredShift, shiftEvidenceOf, shiftingListOf, FX };
