// ============================================================
// PrintableCargoPlanV2 — M6.81 Universal 알고리즘 정확 포팅 (M6.86.8)
// ============================================================
// M6.86.5~M6.86.7 회귀 (globalRowRange 페이지 통일, STD baseline 폐기 등) 폐기.
// M6.81 Python 검증 알고리즘 (cargoPlanCore.js) 그대로 사용.
//
// 보존: 검수앱 고유 마크 (AWK='A', OOG='A', Empty='E', Reefer 빈='r'), POD 컬러
// 미통합 (다음 패치 예정): 선사별 별첨, 화물 종류별 별첨, 선적 모드 POD 컬러 매핑
// ============================================================
import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getShipBayDictData } from '../shipStructure.js';
import { extractShipMetaFromVoyage } from '../shipMatrixBuilder.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';
import { isUserOwnedBayDict } from '../utils.js';   // TallyOne 1.11-01: 정본 판정 단일 소스
import { isReeferContainer, isoToLabel, getContainerColorKey, buildContainerColorMap, isPyeongtaekPort } from '../utils.js';
import { getBayOverride } from '../data/shipBayDict_pdf_override.js';
import {
  autoPairBays,
  generatePdfBays,
  autoPageLayout,
  buildPosMap,
  computeBayRenderData,
  STANDARD_DECK,
  STANDARD_HOLD,
} from '../cargoPlanCore.js';

// ------------------------------------------------------------
// 검수앱 마크 규칙 (M6.91.5 사용자 확정):
//   - 일반 Full = 'F', Empty = 'E'
//   - 리퍼 Full = 'RF', Empty = 'RE'   ← 2.38-01 검수사 «RE RF»
//     그림 칸에서만 슬래시를 뺀다. 슬래시는 풀/엠티를 가르려고 있던 것인데
//     이제 «칠했나»가 그 일을 한다 — 검수사 «엠티이니 색이 없으나 풀로 오해 안함».
//     세 글자가 두 글자가 되면서 좁은 배(MCSC 한 줄 12칸 = 칸 17px)에서도 글자를 키울 수 있다.
//     ⚠ 리스트·서류 표기는 R/F·R/E·R/D 그대로다(2026-08-04 확정, utils.js 2226행).
//   - FR = 'FR' (2글자), DG = 'D', Tank = 'T', OOG = 'A'
//   - 양하/선적 동일 마크. 색만 다름 (양하=선사별, 선적=POD별).
//   - PTK = 컬러 배경 + 글자. 통과 = 회색 + 빈(일반) / 글자(특수).
// M6.94.23: 특수화물 마크 여부 — true면 선사/포트 색 대신 특수화물 색(기호) 우선.
//   특수화물: D(위험물) R/r(리퍼) FR(플랫랙) T(탱크) A(OOG/오픈탑).
//   일반 표기(F/E/o/X/L/K/P/S/M 등 PTK·선사 마커)는 false → 선사색 적용 허용.
function isSpecialMark(mark) {
  if (!mark) return false;
  const m = String(mark).toUpperCase();
  return m === 'D' || m === 'R' || m === 'RF' || m === 'RE' ||
         m.startsWith('R') || m === 'FR' || m === 'T' || m === 'A';
}

// V8.88: 20피트 판정 — iso 앞자리(2x=20ft), 없으면 베이 홀수 폴백. 2.38부터 엠티 e/E 분기용.
function _is20ft(c) {
  const iso = String(c.iso || '').trim();
  if (iso) return /^2/.test(iso);
  const b = parseInt(c.bay, 10);
  return Number.isFinite(b) ? (b % 2 === 1) : false;
}

// V8.88: 엠티 마커 여부. 2.38-01: 그림 칸 리퍼 엠티는 RE(슬래시 뺌).
function isMtMark(m) {
  return m === 'e' || m === 'E' || m === 'RE';
}

// V8.88: 엠티 셀 배경 = 그 컨의 포트(선적)/선사(양하) 색을 연하게(파스텔) — 풀/엠티 구역이 면으로 구분.
//   hex(#rrggbb)는 투명도, hsl(자동 생성색)은 명도 상향. 인쇄는 print-color-adjust:exact로 유지.
function pastelOf(col) {
  const s = String(col || '').trim();
  const m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.18)`;
  }
  const h = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(s);
  if (h) return `hsl(${h[1]}, ${h[2]}%, 88%)`;
  return '#eef2f7';
}

// 2.38-01 검수사 확정 — **글자는 언제나 진한 검정, 색은 «칠»이 혼자 말한다.**
//   «기존 특수화물에 고유색이 있지 않았나요?» → 있었는데 목적지/선사 색이 덮고 있었다.
//   «그러면 일반 풀만 하늘색으로 칠하면 될듯합니다» · «엠티든 풀이든 특수화물이든 글자색은 진한 검정».
//   그래서 칠에는 **연한 색**만 쓴다 — 진한 색(DG #b71c1c 같은) 위에서는 검정 글자가 안 읽힌다.
//   값은 별첨2 범례(Legend 의 cargoColors)의 bg 와 **같은 것**을 쓴다. 두 곳이 갈라지면 범례가 거짓말이 된다.
const SPECIAL_FILL = {
  // 2.38-01 흑백 인쇄 대비 — 색조는 그대로 두고 **회색값만 190으로 맞췄다**.
  //   검수사 «흑백프린터로 인쇄하면 어떻게 나오느냐가 문제입니다. 구분이 되나 안되나».
  //   실측(Rec.601): 종전 값은 205~228에 몰려 흰 칸(255)과 27~50밖에 안 벌어졌고,
  //   특히 TK 연주황은 차이 27이라 흑백에서 «칠했나»가 안 보였다.
  //   흑백에서 색끼리 구분하는 건 어차피 불가능하다(여섯 색이 한 줄에 몰린다) —
  //   종류는 글자(DG·TK·FR·A·RF)가 말하므로 흑백에서도 안 잃는다.
  //   그래서 흑백이 지킬 것은 하나, «칠했나 안 칠했나 = 풀이냐 엠티냐»뿐이고
  //   여섯 칠을 모두 회색 190에 맞춰 흰 칸과 65만큼 벌렸다.
  'DG': '#ffa1aa',   // 위험물 = 빨강 계열
  'RF': '#75dbe8',   // 리퍼 풀 = 청록 계열
  'FR': '#9fd3a1',   // 플랫랙 = 초록 계열
  'A': '#d8aae0',    // 오픈탑/OOG = 보라 계열
  'TK': '#ffb445',   // 탱크 = 주황 계열
};
const PLAIN_FULL_BG = '#7dd3fc';   // 일반 풀 = 하늘색
const MARK_FG = '#000';            // 글자는 전부 진한 검정 (검수사 확정)

function getMarkV2(c, pod, mode) {
  // M6.94.34: _inList(리스트=평택)는 선적 모드에서만. 양하는 pod 평택만 인정.
  //   (양하에서 _inList 인정 시 타항 양하분 PHDVO 등이 평택으로 잘못 조회됨)
  const ptk = mode === 'discharge'
    ? isPyeongtaekPort(c.pod)
    : (c._inList || isPyeongtaekPort(c.pol));

  const isEmpty = c.fe === 'E';

  // 특수화물 종류 우선 판정 (PTK든 통과든 같은 글자)
  let specialLetter = null;
  if (c.dg) specialLetter = 'DG';   // 2.38 (검수사): DG는 D가 아니라 DG 2글자
  else if (isReeferContainer(c)) specialLetter = isEmpty ? 'RE' : 'RF';   // 2.38-01: 그림은 RE·RF (리스트는 R/E·R/F 유지)
  else if (c.fr) specialLetter = 'FR';
  else if (c.tk) specialLetter = 'TK';   // 2.38 (검수사): 탱크도 TK 2글자
  else if (c.ot || c.oog) specialLetter = 'A';

  // ★ 2.79-03 (검수사 확정 2026-08-28) — **통과화물은 글자를 안 쓴다. 회색 자리만 남긴다.**
  //   원문 둘을 같이 읽어야 뜻이 맞는다:
//     «타지역화물도 보여줘야 합니다. 선적시 빈곳을 찾기 위해서» → 자리(회색)는 그대로 둔다.
//     «전부 지운다 — 평택분만 그린다»                          → 남의 짐이 무엇인지는 안 그린다.
  //   즉 통과화물은 «차 있다»만 말하면 된다. 종전엔 DG·RF·FR·TK·A 글자를 그대로 찍어
  //   **평택분이 0 인 베이가 남의 위험물·리퍼 글자로 가득 찼다**(실측 MCSC 633N 카고플랜 —
  //   21칸 중 작업은 7칸인데 나머지 14칸이 DG·RF 로 덮여 있었다).
  if (!ptk) return '';
  // PTK: 특수면 특수글자, 일반이면 F / 엠티는 e(20ft)·E(40·45ft)
  //   2.38 검수사 확정: 동그라미(ⓐ 모양)를 없앴다 — «그냥 소문자 e로 40피트는 그냥 E로».
  //   E·F 오독은 이제 «칠했나 아닌가»가 막는다(풀=색 채움·엠티=글자만).
  return specialLetter || (isEmpty ? (_is20ft(c) ? 'e' : 'E') : 'F');
}

// ------------------------------------------------------------
// CSS (M6.81 HTML 그대로 — 셀 18×13px, tier-row 13px, cell-empty visibility:hidden)
// M6.94.0: export하여 매트릭스 빌더에서도 BayBoxV2와 함께 재사용 (베이플랜 시뮬레이션)
// ------------------------------------------------------------
export const CARGO_V2_CSS = `
.cpv2-overlay { position: fixed; inset: 0; z-index: 50; background: #475569; overflow: auto; padding: 8px; -webkit-overflow-scrolling: touch; }
.cpv2-page { width: 277mm; min-width: 1200px; height: 195mm; background: white; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; font-family: Helvetica, Arial, sans-serif; color: #000; box-shadow: 0 0 8px rgba(0,0,0,0.3); margin: 0 auto; }
.cpv2-page-header { border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; }
.cpv2-page-header .title-center { font-size: 14px; font-weight: bold; flex: 1; text-align: center; }
.cpv2-page-header .col { padding: 0 8px; font-size: 9px; }
.cpv2-page-rows { display: flex; flex-direction: column; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-page-row { display: flex; flex-direction: row; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-bay-box { flex: 1 1 0; min-width: 95px; border: 1px solid #000; display: flex; flex-direction: column; background: white; overflow: hidden; }
.cpv2-single-box .cpv2-single-half { flex: 1 1 0; display: flex; flex-direction: column; }
.cpv2-single-box .cpv2-empty-half { flex: 1 1 0; }
.cpv2-bay-section { flex: 1 1 0; display: flex; flex-direction: column; padding: 2px 2px; min-height: 0; position: relative; }
.cpv2-trio-divider { border-top: 0.5px solid #999; }
.cpv2-bay-title-row { position: relative; width: 100%; text-align: center; font-weight: bold; font-size: clamp(10px, 0.85vw, 13px); padding: 0 50px 0 4px; margin-bottom: 1px; box-sizing: border-box; flex-shrink: 0; }
.cpv2-bay-title { display: inline-block; }
.cpv2-bay-count { position: absolute; right: 4px; top: 1px; color: #555; font-size: clamp(8px, 0.65vw, 10px); font-weight: normal; white-space: nowrap; }
.cpv2-bay-content { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; width: 100%; }
.cpv2-deck-area { flex: 1 1 0; display: flex; flex-direction: column; width: 100%; min-height: 0; }
.cpv2-hold-area { flex: 1 1 0; display: flex; flex-direction: column; width: 100%; min-height: 0; }
.cpv2-grid-row-wrap { display: flex; flex-direction: row; align-items: stretch; gap: 2px; flex: 1 1 0; min-height: 0; }
.cpv2-grid { display: flex; flex-direction: column; align-items: stretch; gap: 0; flex: 1 1 0; min-width: 0; }
.cpv2-tier-row { display: flex; gap: 0; flex: 1 1 0; min-height: 0; --mf: 9.6px; }
/* 2.38-03 «--mf» = 칸 마크 글자 크기의 단일 소스. **9.6px 고정**(원래 8px 의 1.2배).
   ⛔ 이 CSS 는 JS 템플릿 문자열 안이다 — 주석에도 백틱을 쓰지 마라(문자열이 끊겨 빌드가 죽는다, 실측 2026-08-25).

   ⛔ clamp(vw) 를 뺀 이유 — 2026-08-25 인쇄본 실측.
      종전 값은 clamp(7.2px, 0.66vw, 9.6px) 였는데 인쇄 뷰포트에서 **최솟값 7.2px 로 떨어졌다**
      (검수사가 보내 준 PDF 실측: 대문자 5.40pt = 7.2px). 즉 내가 시안으로 보여 준 9.6px 과 실제 인쇄가 달랐다.
      칸 폭은 .cpv2-page 의 min-width:1200px 로 정해져 뷰포트와 무관한데 글자만 vw 를 따라가 어긋난 것이다.
      고정값이 맞다. 최악 배 MCSC(가로 12칸·세로 13단 → 칸 17.0×15.7px)에서 가장 넓은 두 글자 DG 가
      14.4px, 글자 높이 11.0px 라 여유 있게 들어간다.

   ⛔ 칸 글자 크기를 여기서 갈라 쓰면 안 되는 이유 — 같은 날 잡은 다른 사고.
      칸 규칙 .cpv2-tier-row .cpv2-cell 과 e 규칙 .cpv2-cell.cpv2-mark-e 는 **명시도가 (0,2,0)로 같다.**
      그래서 나중에 선언된 e 규칙이 칸의 크기를 통째로 덮었고, 거기 쓴 1.1em 은
      «칸 글자의 1.1배»가 아니라 **부모(.cpv2-tier-row, font-size 미지정 → 기본 16px)의 1.1배**로 잡혀
      17.6px 로 나갔다. 인쇄본 실측 대문자 5.40pt 대 소문자 e 13.20pt = 2.4배.
      검수사가 «알파벳이 각자 폰트가 틀리게 보입니다» · «대문자가 소문자보다 작게 보입니다» 라고 한 것이
      전부 이 한 줄 때문이었다. em 은 폰트 크기를 정할 때 **자기 부모**를 본다. */
.cpv2-tier-row.cpv2-invisible-row { display: none; }
.cpv2-tier-row .cpv2-cell { flex: 1 1 0; min-width: 0; min-height: 0; border: 0.5px solid #555; box-sizing: border-box; background: #fff; font-size: var(--mf, 9.6px);   /* 2.38-02 마크 전부 1.2배 — 값은 .cpv2-tier-row 의 --mf 한 곳에서만 정한다(폴백은 같은 값) */ display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: bold; color: #000; position: relative; overflow: hidden; }
.cpv2-tier-row .cpv2-cell-empty { flex: 1 1 0; min-width: 0; min-height: 0; visibility: hidden; }
.cpv2-row-labels { display: flex; flex: 0 0 auto; font-size: clamp(7px, 0.75vw, 10px); color: #444; gap: 0; margin: 1px 0; margin-right: 16px; }
.cpv2-row-labels > span { flex: 1 1 0; min-width: 0; text-align: center; line-height: 1.2; }
/* M6.94.19: XRAY는 ★ 별표만 표시, 배경은 선사 색 그대로 (연노랑 강제 제거) */
.cpv2-cell.cpv2-xray::after { content: '★'; position: absolute; top: -1px; right: 0px; font-size: clamp(7px, 1vw, 12px); color: #dc2626; font-weight: bold; pointer-events: none; text-shadow: 0 0 1px #fff, 0 0 1px #fff, 0 0 1px #fff; }
/* V8.98: 쉬프팅(재적부) = 좌상단 파란 ◆ (XRAY ★는 우상단 — 동시 표기 가능) */
.cpv2-cell.cpv2-shift::before { content: '◆'; position: absolute; top: -1px; left: 0px; font-size: clamp(7px, 0.9vw, 11px); color: #1d4ed8; font-weight: bold; pointer-events: none; text-shadow: 0 0 1px #fff, 0 0 1px #fff, 0 0 1px #fff; }
/* V9.03: 긴급 화물 = 좌하단 빨간 ▲ · 수화물 = 우하단 보라 ■ (쉬프팅◆·XRAY★와 동시 표기 가능)
   V9.06-03: ▲를 ::after → 실요소(.cpv2-um)로 — XRAY ★와 같은 ::after 채널이라 긴급∩XRAY 셀에서
   ★가 지워지던 충돌(사용자 지적 2026-07-23). 이제 ◆(before)·★(after)·▲(요소)·보라테두리 4종 완전 공존. */
.cpv2-cell .cpv2-um { position: absolute; bottom: -1px; left: 0px; font-size: clamp(7px, 0.9vw, 11px); color: #dc2626; font-weight: bold; pointer-events: none; text-shadow: 0 0 1px #fff, 0 0 1px #fff, 0 0 1px #fff; font-style: normal; line-height: 1; }
.cpv2-cell.cpv2-lugg { box-shadow: inset 0 0 0 2px #7c3aed; }
.cpv2-cell.cpv2-mark-o { color: #000; }
.cpv2-cell.cpv2-mark-X { color: #000; }
.cpv2-cell.cpv2-mark-R { color: #006064; }
.cpv2-cell.cpv2-mark-r { color: #00838f; }
.cpv2-cell.cpv2-mark-DG { color: #b71c1c; }
.cpv2-cell.cpv2-mark-F { color: #1b5e20; }
.cpv2-cell.cpv2-mark-A { color: #4a148c; }
.cpv2-cell.cpv2-mark-TK { color: #e65100; }
.cpv2-cell.cpv2-mark-E { color: #555; }
.cpv2-cell.cpv2-mark-e { color: #555; }
/* 2.38-01 (검수사 «소문자 e를 조금 더 크고 잘보이게 해주세요 적어서 안보임»):
   소문자 e는 x-height 만 차지해 같은 폰트 크기에서도 대문자 E보다 눈에 띄게 작다.
   글자를 키워 대문자와 비슷한 높이로 맞춘다 — 20ft/40ft 구분은 «모양»이 하지 «크기»가 하지 않는다. */
.cpv2-cell.cpv2-mark-e { font-size: calc(var(--mf, 9.6px) * 1.1); font-weight: 600; padding-bottom: 0.15em; }  /* 2.38-03: em 대신 **calc(var(--mf) * 1.1)** — 칸 글자 크기를 정확히 1.1배 한다.
     검수사 «1.1로 볼드를 조금만 주고» · 인쇄 기준으로 고른 안(레이저에서 얇은 획은 날아간다).
     가운데 보정: Arial 줄상자 가운데는 0.5em 인데 소문자 e 잉크 가운데는 0.587em 이라 처져 앉는다.
     칸이 flex 가운데 정렬이라 아래 여백을 주면 그 절반만큼 올라온다(padding 의 em 은 자기 크기 기준이라 맞다). */  /* 2.38-01 검수사 «e를 1.1 볼드 없이» + «가운데 보정». 소문자 e는 위로 뻗는 획이 없어 줄 아래쪽에 앉는다 —
     칸이 flex 가운데 정렬이라 아래 여백을 주면 그만큼 올라온다. box-sizing:border-box 라 칸 크기는 안 변한다. */
/* 2.38: 엠티 동그라미 폐지 — 20ft=e · 40/45ft=E 글자만 (검수사 확정) */
.cpv2-cell.cpv2-mark-L { color: #1565c0; }
.cpv2-cell.cpv2-mark-K { color: #0d47a1; }
.cpv2-cell.cpv2-mark-P { color: #6a1b9a; }
.cpv2-cell.cpv2-mark-S { color: #2e7d32; }
.cpv2-cell.cpv2-mark-M { color: #c62828; }
.cpv2-hatch-break { display: flex; gap: 4px; width: calc(100% - 18px); height: 0; margin: 3px 0; flex-shrink: 0; box-sizing: border-box; }
.cpv2-hatch-seg { flex: 1 1 0; border-top: 1.5px solid #000; height: 0; }
.cpv2-tier-labels { display: flex; flex-direction: column; align-items: flex-start; font-size: 9px; color: #444; width: 16px; }
.cpv2-tier-labels > span { flex: 1 1 0; display: flex; align-items: center; line-height: 1; }
.cpv2-tier-labels > span.cpv2-invisible-label { display: none; }
.cpv2-banner { display: none; }
.cpv2-empty-slot { border: none; background: transparent; }
.cpv2-legend-box { border: 1px solid #000; background: white; padding: 4px; display: flex; flex-direction: column; overflow: hidden; }
.cpv2-legend { width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; }
.cpv2-legend-title { font-size: calc(var(--lgf, 8px) * 1.12); font-weight: bold; text-align: center; padding: 2px 0; border-bottom: 0.5px solid #888; margin-bottom: 2px; color: #333; flex-shrink: 0; }
/* ★ TallyOne 1.63: 별첨 표를 비율로 짠다 (검수사 확정 2026-08-13).
   검수사 원문: "항상 크기는 A4수평 절반중 아래쪽입니다. 열과 폭 비율만 정하면 어떤 형태든
     맞출듯 합니다. 베이가 30개든 17개든"
   문제: 별첨 칸의 폭이 배마다 다르다 — 줄당 박스 수로 갈리기 때문이다(베이 30개면 줄당 15칸이라
     좁고, 17개면 9칸이라 넓다). 그런데 표는 width:14px, padding:1px 3px, font-size:8px 로
     전부 고정이라 칸이 좁아져도 안 줄어들고 그대로 넘쳐 글자와 열이 잘렸다.
   해법: 열 폭은 table-layout:fixed + colgroup 퍼센트로, 글자와 여백은 --lgf 한 변수에 묶어
     칸 폭에 따라 함께 줄인다. 베이가 몇 개든 비율이 같으므로 모양이 유지된다.
   (이 블록은 템플릿 문자열 안의 CSS 다 — 백틱을 쓰면 문자열이 끊긴다.) */
.cpv2-legend-table { width: 100%; border-collapse: collapse; table-layout: fixed;
  font-size: calc(var(--lgf, 8px)); }
.cpv2-legend-table th, .cpv2-legend-table td { padding: calc(var(--lgf, 8px) * 0.12) calc(var(--lgf, 8px) * 0.3);
  border: 0.3px solid #aaa; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cpv2-legend-table th { background: #f5f5f5; font-size: calc(var(--lgf, 8px) * 0.88); font-weight: bold; }
.cpv2-legend-mark { text-align: center; font-weight: bold; font-size: calc(var(--lgf, 8px)); }
.cpv2-legend-nm { font-size: calc(var(--lgf, 8px)); font-weight: bold; text-align: center; }
.cpv2-legend-ct { font-size: calc(var(--lgf, 8px) * 0.94); text-align: center; }
.cpv2-legend-total { background: #f0f0f0; }
@media print {
  /* M6.86.8.21: M6.81 ref.html과 동일한 인쇄 처리.
     ref.html은 page height 195mm 고정 (A4 landscape - margin 6mm × 2). 
     V2는 화면에선 viewport 비례지만 인쇄에선 195mm로 강제. */
  html, body { background: white !important; background-color: white !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(.cpv2-overlay):not(.bd-print-modal) { display: none !important; }
  .cpv2-overlay {
    position: static !important;
    inset: auto !important;
    background: white !important;
    padding: 0 !important;
    overflow: visible !important;
    display: block !important;
    width: auto !important;
    height: auto !important;
    box-shadow: none !important;
  }
  .cpv2-page {
    width: 277mm !important;
    min-width: 0 !important;
    height: 195mm !important;
    min-height: 195mm !important;
    max-height: 195mm !important;
    background: white !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 4mm !important;
    page-break-inside: avoid !important;
    page-break-after: avoid !important;
    break-inside: avoid !important;
    break-after: avoid !important;
  }
  .cpv2-bay-box { min-width: 0 !important; }
  .cpv2-noprint { display: none !important; }
  .cpv2-cell, .cpv2-legend-mark, .cpv2-bay-box {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .cpv2-cell.cpv2-shadow20 { background: #e5e7eb !important; color: transparent !important; }
  .cpv2-cell.cpv2-through { background: #d4d4d8 !important; }
  .cpv2-zoom-wrap { transform: none !important; width: auto !important; }
  @page { size: A4 landscape; margin: 6mm; }
}
`;

// ------------------------------------------------------------
// BayBox 단일 베이 렌더
// M6.94.0: export하여 매트릭스 빌더에서도 재사용 (1개 베이 시각 미리보기)
// ------------------------------------------------------------
export function BayBoxV2({ data, count, colorMap = {}, gridCols, applyHatch = true, globalMaxTier, globalHatch, renderCellContent, cellExtra, fixedCellVar = null }) {
  if (!data) return null;
  const {
    bayKey, deckTiers, holdTiers, nHold, nDeckCols, nHoldCols,
    deckRowPos, holdRowPos, deckRows, holdRows,
    deckAlign, deckPadLeft, deckPadRight,
    holdAlign, holdPadLeft, holdPadRight, hatchCount,
  } = data;

  // M6.94.14: 셀 폭 통일은 gridCols 기준 % padding으로 (정수 padCenter 폐기).
  //   M6.94.12 padCenter는 deck/hold 패딩 칸 홀짝이 다르면 중심이 0.5칸 어긋남(중앙정렬 풀림).
  //   deck/hold 모두 grid를 gridCols 기준 %로 가운데 → 셀 폭=박스폭/gridCols 통일 + 0.5칸 정중앙.
  const gc = Math.max(gridCols || 0, nDeckCols || 0, nHoldCols || 0, 1);

  // M6.94.0 padding 계산: 사용자 입력 > alignment > 자동 가운데 (fallback)
  function computePadding(align, padL, padR, smallerN, biggerN) {
    if (padL > 0 || padR > 0) {
      return {
        paddingLeft: `${(padL / biggerN) * 100}%`,
        paddingRight: `${(padR / biggerN) * 100}%`,
      };
    }
    const diff = biggerN - smallerN;
    if (diff <= 0) return { paddingLeft: '0', paddingRight: '0' };
    if (align === 'left') {
      return { paddingLeft: '0', paddingRight: `${(diff / biggerN) * 100}%` };
    }
    if (align === 'right') {
      return { paddingLeft: `${(diff / biggerN) * 100}%`, paddingRight: '0' };
    }
    // center (기본) — % 단위라 홀수 diff도 0.5칸씩 좌우 균등 = 진짜 정중앙
    return {
      paddingLeft: `${(diff / 2) / biggerN * 100}%`,
      paddingRight: `${(diff / 2) / biggerN * 100}%`,
    };
  }

  // deck/hold 둘 다 gridCols(gc) 기준 → 셀 폭 통일 + 중앙선 일치
  // V8.98-14: fixedCellVar(옵트인, 베이상세 인쇄) — 셀 폭이 CSS 변수 고정일 때 패딩도
  //   %(부모폭 기준, 라벨 16px 몫만큼 오차) 대신 '셀 폭 × 칸수' calc로 정확히.
  //   미전달(카고플랜 본체) 시 기존 % 패딩 그대로 (회귀 0).
  const _padCols = (align, padL, padR, smallerN) => {
    if (padL > 0 || padR > 0) return { l: padL, r: padR };
    const diff = gc - smallerN;
    if (diff <= 0) return { l: 0, r: 0 };
    if (align === 'left') return { l: 0, r: diff };
    if (align === 'right') return { l: diff, r: 0 };
    return { l: diff / 2, r: diff / 2 };
  };
  const _mkPad = (align, padL, padR, n) => {
    if (!fixedCellVar) return computePadding(align, padL, padR, n, gc);
    const pc = _padCols(align, padL, padR, n);
    return {
      paddingLeft: `calc(var(${fixedCellVar}) * ${pc.l})`,
      paddingRight: `calc(var(${fixedCellVar}) * ${pc.r})`,
    };
  };
  const deckPadStyle = _mkPad(deckAlign, deckPadLeft, deckPadRight, nDeckCols);
  const holdPadStyle = _mkPad(holdAlign, holdPadLeft, holdPadRight, nHoldCols);

  return (
    <div className="cpv2-bay-section">
      <div className="cpv2-bay-title-row">
        <span className="cpv2-bay-title">BAY {bayKey}</span>
        {count != null && <span className="cpv2-bay-count">{count}</span>}
      </div>
      <div className="cpv2-bay-content">
        <div className="cpv2-deck-area" style={{ flex: `${(nHold > 0 && globalHatch) ? globalHatch.maxDeck : Math.max(deckTiers.length, 1)} 1 0` }}>
          {/* V7.58: 해치선 수평 — 데크는 아래(82)가 해치선에 붙음. 단수 부족분은 위 spacer */}
          {nHold > 0 && globalHatch && globalHatch.maxDeck > deckTiers.length && (
            <div className="cpv2-tier-spacer" style={{ flex: `${globalHatch.maxDeck - deckTiers.length} 1 0` }}></div>
          )}
          <div className="cpv2-row-labels" style={{ paddingLeft: deckPadStyle.paddingLeft, paddingRight: deckPadStyle.paddingRight }}>
            {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
          </div>
          <div className="cpv2-grid-row-wrap" style={nHold > 0 && globalHatch ? { flex: `${Math.max(deckTiers.length, 1)} 1 0` } : undefined}>
            <div className="cpv2-grid" style={{ paddingLeft: deckPadStyle.paddingLeft, paddingRight: deckPadStyle.paddingRight }}>
              {deckRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) => {
                    if (!cell.active) return <span key={ci} className="cpv2-cell-empty"></span>;
                    if (renderCellContent) {
                      return (
                        <span key={ci} className={`cpv2-cell${cell.isXray ? ' cpv2-xray' : ''}${cell.isShift ? ' cpv2-shift' : ''}${cell.isUrgent ? ' cpv2-urgent' : ''}${cell.isLugg ? ' cpv2-lugg' : ''}`} {...(cellExtra ? cellExtra(cell, row.tier) : {})}>
                          {renderCellContent(cell, row.tier)}
                          {cell.isUrgent && <i className="cpv2-um">▲</i>}
                        </span>
                      );
                    }
                    const bg = cell.colorKey && colorMap[cell.colorKey];
                    let style;
                    if (cell.isShadow20) {
                      // M6.86.8.19: 짝수 20ft shadow = 회색 빈 셀 (자리 차지, 글자 없음)
                      style = { background: '#e5e7eb', color: 'transparent' };
                    } else if (cell.isThrough) {
                      style = { background: '#d4d4d8', color: '#52525b' };  // 통과화물 = 회색
                    } else if (bg) {  /* M6.94.35: 특수마크(엠티 리퍼 R/E 등)도 평택분이면 목적지 색 적용. 통과화물은 위 isThrough에서 회색 처리됨 */
                      // 2.38-01 검수사 확정 — **칠은 «리스트가 풀이냐»로 정하고, 색은 특수화물이 우선이다.**
                      //   ㉠ «카고플랜에서 F만이 아니고 리스트에서 F여야만 합니다. 이유는 DG TK FR OT로
                      //      표기되면 풀로 안보일수 있으니까요» → 마크가 아니라 isFull(fe 가 E 가 아님)로 가른다.
                      //   ㉡ «기존 특수화물에 고유색이 있지 않았나요?» → 있다. 별첨2 범례의 그 색을 그림에도 쓴다.
                      //      특수화물은 제 색(DG 빨강·리퍼 청록·FR 초록·OT 보라·TK 주황)으로 칠하고,
                      //      일반 화물만 목적지/선사 색을 쓴다. 범례와 그림이 같은 값을 본다.
                      //   ㉢ X(옆 짝수 40피트가 차지한 홀수 자리)는 자기 셀이 아니라 isFull이 안 붙어
                      //      40피트가 풀이어도 안 칠한다 — «풀이라고 해도 홀수베이에는 셀색을 넣지 않습니다».
                      // 칠은 풀에만, 글자는 언제나 검정. 특수화물은 제 연한 색, 일반 풀은 하늘색.
                      // 엠티·X는 안 칠하고 검정 글자만 남는다(X = 옆 짝수 40피트가 차지한 홀수 자리).
                      style = cell.isFull
                        ? { background: SPECIAL_FILL[cell.mark] || PLAIN_FULL_BG, color: MARK_FG }
                        : { color: MARK_FG };
                    }
                    const displayMark = cell.isShadow20 ? '' : (cell.mark || '');
                    return (
                      <span
                        key={ci}
                        className={`cpv2-cell${cell.mark && !cell.isShadow20 ? ` cpv2-mark-${cell.mark}` : ''}${cell.isXray ? ' cpv2-xray' : ''}${cell.isShift ? ' cpv2-shift' : ''}${cell.isUrgent ? ' cpv2-urgent' : ''}${cell.isLugg ? ' cpv2-lugg' : ''}${cell.isThrough ? ' cpv2-through' : ''}${cell.isShadow20 ? ' cpv2-shadow20' : ''}`}
                        style={style}
                      >
                        {/* 2.38 (검수사): 엠티 동그라미 제거 — 20ft=e · 40ft=E 글자만 */}
                        {displayMark}
                        {cell.isUrgent && <i className="cpv2-um">▲</i>}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="cpv2-tier-labels">
              {STANDARD_DECK.map((t) => (
                <span key={t} className={deckTiers.includes(t) ? '' : 'cpv2-invisible-label'}>
                  {String(t).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* M6.94.14: hold 없는 베이(nHold=0)는 hatch+hold-area 숨김 (deck만) */}
        {nHold > 0 && (<>
        <div className="cpv2-hatch-break">
          {Array.from({ length: applyHatch ? Math.max(0, Math.min(3, (typeof hatchCount === 'number' ? hatchCount : 1))) : 1 }).map((_, i) => (
            <div key={i} className="cpv2-hatch-seg"></div>
          ))}
        </div>
        <div className="cpv2-hold-area" style={{ flex: `${globalHatch ? globalHatch.maxHold : Math.max(holdTiers.length, 1)} 1 0` }}>
          <div
            className="cpv2-grid-row-wrap"
            style={{ width: '100%', flex: `${Math.max(holdTiers.length, 1)} 1 0` }}
          >
            <div className="cpv2-grid" style={{ paddingLeft: holdPadStyle.paddingLeft, paddingRight: holdPadStyle.paddingRight }}>
              {holdRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) => {
                    if (!cell.active) return <span key={ci} className="cpv2-cell-empty"></span>;
                    if (renderCellContent) {
                      return (
                        <span key={ci} className={`cpv2-cell${cell.isXray ? ' cpv2-xray' : ''}${cell.isShift ? ' cpv2-shift' : ''}${cell.isUrgent ? ' cpv2-urgent' : ''}${cell.isLugg ? ' cpv2-lugg' : ''}`} {...(cellExtra ? cellExtra(cell, row.tier) : {})}>
                          {renderCellContent(cell, row.tier)}
                          {cell.isUrgent && <i className="cpv2-um">▲</i>}
                        </span>
                      );
                    }
                    const bg = cell.colorKey && colorMap[cell.colorKey];
                    let style;
                    if (cell.isShadow20) {
                      // M6.86.8.19: 짝수 20ft shadow = 회색 빈 셀 (자리 차지, 글자 없음)
                      style = { background: '#e5e7eb', color: 'transparent' };
                    } else if (cell.isThrough) {
                      style = { background: '#d4d4d8', color: '#52525b' };  // 통과화물 = 회색
                    } else if (bg) {  /* M6.94.35: 특수마크(엠티 리퍼 R/E 등)도 평택분이면 목적지 색 적용. 통과화물은 위 isThrough에서 회색 처리됨 */
                      // 2.38-01 검수사 확정 — **칠은 «리스트가 풀이냐»로 정하고, 색은 특수화물이 우선이다.**
                      //   ㉠ «카고플랜에서 F만이 아니고 리스트에서 F여야만 합니다. 이유는 DG TK FR OT로
                      //      표기되면 풀로 안보일수 있으니까요» → 마크가 아니라 isFull(fe 가 E 가 아님)로 가른다.
                      //   ㉡ «기존 특수화물에 고유색이 있지 않았나요?» → 있다. 별첨2 범례의 그 색을 그림에도 쓴다.
                      //      특수화물은 제 색(DG 빨강·리퍼 청록·FR 초록·OT 보라·TK 주황)으로 칠하고,
                      //      일반 화물만 목적지/선사 색을 쓴다. 범례와 그림이 같은 값을 본다.
                      //   ㉢ X(옆 짝수 40피트가 차지한 홀수 자리)는 자기 셀이 아니라 isFull이 안 붙어
                      //      40피트가 풀이어도 안 칠한다 — «풀이라고 해도 홀수베이에는 셀색을 넣지 않습니다».
                      // 칠은 풀에만, 글자는 언제나 검정. 특수화물은 제 연한 색, 일반 풀은 하늘색.
                      // 엠티·X는 안 칠하고 검정 글자만 남는다(X = 옆 짝수 40피트가 차지한 홀수 자리).
                      style = cell.isFull
                        ? { background: SPECIAL_FILL[cell.mark] || PLAIN_FULL_BG, color: MARK_FG }
                        : { color: MARK_FG };
                    }
                    const displayMark = cell.isShadow20 ? '' : (cell.mark || '');
                    return (
                      <span
                        key={ci}
                        className={`cpv2-cell${cell.mark && !cell.isShadow20 ? ` cpv2-mark-${cell.mark}` : ''}${cell.isXray ? ' cpv2-xray' : ''}${cell.isShift ? ' cpv2-shift' : ''}${cell.isUrgent ? ' cpv2-urgent' : ''}${cell.isLugg ? ' cpv2-lugg' : ''}${cell.isThrough ? ' cpv2-through' : ''}${cell.isShadow20 ? ' cpv2-shadow20' : ''}`}
                        style={style}
                      >
                        {/* 2.38 (검수사): 엠티 동그라미 제거 — 20ft=e · 40ft=E 글자만 */}
                        {displayMark}
                        {cell.isUrgent && <i className="cpv2-um">▲</i>}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="cpv2-tier-labels">
              {STANDARD_HOLD.map((t) => (
                <span key={t} className={holdTiers.includes(t) ? '' : 'cpv2-invisible-label'}>
                  {String(t).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
          {nHold > 0 ? (
            <div className="cpv2-row-labels" style={{ paddingLeft: holdPadStyle.paddingLeft, paddingRight: holdPadStyle.paddingRight }}>
              {holdRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
            </div>
          ) : (
            <div className="cpv2-row-labels" style={{ visibility: 'hidden' }}>
              {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
            </div>
          )}
          {/* V7.58: 홀드는 위가 해치선에 붙음 — 단수 부족분은 아래 spacer */}
          {globalHatch && globalHatch.maxHold > holdTiers.length && (
            <div className="cpv2-tier-spacer" style={{ flex: `${globalHatch.maxHold - holdTiers.length} 1 0` }}></div>
          )}
        </div>
        </>)}
        {(() => {
          // V7.58: 홀드 있는 베이는 maxDeck/maxHold spacer가 높이를 이미 통일 — 말단 spacer 불필요
          if (nHold > 0 && globalHatch) return null;
          const used = deckTiers.length + (nHold > 0 ? holdTiers.length : 0);
          const sp = Math.max(0, (globalMaxTier || used) - used);
          return sp > 0 ? <div className="cpv2-tier-spacer" style={{ flex: `${sp} 1 0` }}></div> : null;
        })()}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 메인 컴포넌트
// ------------------------------------------------------------
const IS_TOUCH_DEVICE = typeof window !== 'undefined' && (('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0));

export default function PrintableCargoPlanV2({
  containers = [],
  structureContainers = null,
  legendContainers = null,   // V8.87: 별첨 전용 목록(리스트=검수 대상 기준). 없으면 containers 폴백(하위호환).
  shipImo,
  shipName,
  voyNo,
  voyageInfo,
  mode = 'discharge',
  xrayMap = {},
  shiftingMap = {},   // V8.98: 쉬프팅(재적부) { cn: {from,to} } — 셀 ◆ 마크 + 헤더 카운트
  pod: explicitPod,
  onClose,
}) {
  // M6.94.26: mode별 항차 선택 (카고플랜1과 통일).
  //   선적 카고플랜인데 양하 항차(voy_d)가 표시되던 버그 fix.
  //   양하 → voy_d, 선적 → voy_l, 폴백 → voy. voyNo prop이 명시되면 그것 우선.
  const _voyD = voyageInfo?.voy_d || '';
  const _voyL = voyageInfo?.voy_l || '';
  const _voyGeneric = voyageInfo?.voy || '';
  let _voyByMode;
  if (mode === 'discharge') _voyByMode = _voyD || _voyGeneric;
  else if (mode === 'loading') _voyByMode = _voyL || _voyGeneric;
  else _voyByMode = (_voyD && _voyL && _voyD !== _voyL) ? `양하 ${_voyD} / 선적 ${_voyL}` : (_voyD || _voyL || _voyGeneric);
  const effVoyNo = voyNo || _voyByMode || '-';
  const effShipName = shipName || voyageInfo?.shipName || '';
  const shiftCount = Object.keys(shiftingMap || {}).length;   // V8.98
  //  ★ 2.83 (검수사 지시 2026-08-29) — *«카고플랜이던지 양하 선적등 갯수가 기록되는부분에
  //    시프팅 갯수도 포함시켜 주시기 바랍니다. 양하279 시프팅95 합 374개 이런식으로.
  //    그래야 **작업량 계산**도 편할것이고 **콘 작업하는 사람**도 콘계산 하는데 도움이 될것입니다»*
  //    종전엔 머리에 «쉬프팅 95» 만 따로 떠 있어 평택분과 더해 보려면 사람이 암산해야 했다.
  //    ⚠ 평택분 판정은 아래 matchPodC 와 **같은 규칙**이어야 한다 — 두 벌이 갈리면 합이 안 맞는다.
  //      그래서 여기서 세지 않고, matchPodC 가 정의된 뒤(_ptkCount) 계산한다.
  // V9.03: 긴급/수화물 카운트 — 컨테이너 플래그(c.urgent/c.lugg) 기반 (예보 저장 시 태깅됨)
  const urgentCount = (containers || []).filter(c => c && c.urgent).length;
  const luggCount = (containers || []).filter(c => c && c.lugg).length;
  // V8.45-02: 골격(구조) 판정 전용 컨 — 양하+선적 합본. 없으면 containers 폴백(하위호환).
  const structCont = (structureContainers && structureContainers.length) ? structureContainers : containers;
  // 베이사전 + v5 매트릭스 로딩
  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    // V7.01: 계열 대체 시 베이 수 비교용으로 현재 EDI의 실제 베이 수를 넘김
    const ediBayCount = (() => {
      const s = new Set();
      for (const c of (structCont || [])) {
        const n = parseInt(c.bay, 10);
        if (Number.isFinite(n) && n > 0) s.add(n);
      }
      return s.size;
    })();
    // V8.22: 빌더와 동일한 코드 신원으로도 조회 → code≠선박명(DJCT 등) user 매트릭스 반영.
    const _vslCode = extractShipMetaFromVoyage({ info: voyageInfo })?.code || '';
    // TallyOne 1.13-02: 신원 검증용 — 코드가 콜사인 앞4자로 추론될 수 있어 사전 항목이 남의 배일 수 있다.
    const baseDict = getShipBayDictData(shipImo, shipName, {
      ediBayCount, vslCode: _vslCode,
      callsign: voyageInfo?.callsign || '', vslFull: voyageInfo?.vslFull || shipName || '',
    });
    if (!baseDict) return null;
    // M6.94.0 사용자 원칙 1: source='user'면 enrichBayDef가 즉시 entry 반환 (어떤 보강도 안 함).
    //   AI 임시 베이사전 (v2/v5/firebase 등)일 때만 EDI 자동 채움 등 보강 동작.
    // TallyOne 1.11-01: 정본 판정은 조회 경로(source)가 아니라 항목 안쪽(isUserOwnedBayDict). Firebase 경유 정본이 자동 사전 취급되던 결함.
    //   특히 아래 `_userOwned: baseDict.source === 'user'` 가 **항목의 정본 표식을 조회 경로로 덮어써**
    //   Firebase 경유일 때 cargoPlanCore의 isUserSource까지 false로 만들었다(NSFR 2026-08-06 실측).
    const _isUser = isUserOwnedBayDict(baseDict);
    const enrichedEntry = enrichBayDef({ bayDef: baseDict.bayDef }, baseDict._v5Matrix, structCont, _isUser ? 'user' : baseDict.source);
    const bayDefWithSource = { ...enrichedEntry.bayDef, source: baseDict.source, _userOwned: _isUser };
    return { ...baseDict, bayDef: bayDefWithSource, _userOwned: _isUser };
  }, [shipImo, shipName, structCont, voyageInfo]);

  const matrixBays = useMemo(() => {
    const raw = dictData?._v5Matrix?.matrixBays || [];
    const v2Def = dictData?.bayDef || {};
    const deckTiersAll = v2Def.deckTiers || [];
    const holdTiersAll = v2Def.holdTiers || [];
    const baysSummary = v2Def.baysSummary || [];
    const summaryByBay = new Map();
    for (const s of baysSummary) {
      const n = Number(s.bayNo);
      if (Number.isFinite(n)) summaryByBay.set(n, s);
    }
    // EDI tier 검증
    const ediTiersByBay = new Map();
    for (const c of structCont) {
      const b = Number(c.bay);
      const t = Number(c.tier);
      if (!Number.isFinite(b) || !Number.isFinite(t)) continue;
      if (!ediTiersByBay.has(b)) ediTiersByBay.set(b, new Set());
      ediTiersByBay.get(b).add(t);
    }

    // M6.86.8.25: v5 매트릭스 없어도 v2.baysSummary로 fallback.
    //   v2.rowMaxOdd/Even으로 row 라벨 결정, cells는 비워서 hull 가득 그림.
    let bays = raw;
    if (bays.length === 0 && baysSummary.length > 0) {
      bays = baysSummary.map((s) => ({
        bayNum: Number(s.bayNo),
        cells: [], // 빈 cells → hull active 모두 가득
        hasHold: !!s.hasHold,
        hasDeck: s.hasDeck !== false,
        isStandalone: !!s.isStandalone,
      }));
    }
    // V7.00 fix: 사용자가 수정한 베이사전(baysSummary)이 있으면 그것이 정답.
    //   v5 raw에는 사용자가 베이사전에서 뺀 베이가 남아있을 수 있어(유령 베이),
    //   baysSummary에 없는 bayNum은 제외한다. (예: 4번 빼서 (4)5로 잘못 페어링되던 문제)
    //   userBayDict 보호 원칙: 사용자 정의 > v5 자동 추출.
    // V9.12: 이 보호는 '사용자가 직접 고친 사전'에만 적용한다.
    //   자동추출 사전(v2/v5/fuzzy)에서 v2.baysSummary가 v5보다 불완전한 경우가 있고
    //   (TEN JUPITER/LYTJ: v2 18베이·페어 0 vs v5 25베이·페어 8), 그때 v2로 거르면
    //   홀수 베이 3·7·11·15…가 전부 날아가 카고플랜 페어가 통째로 붕괴한다.
    //   → user 사전이면 종전대로 v2가 정답, 자동 사전이면 v5에만 있는 베이도 살린다.
    if (raw.length > 0 && baysSummary.length > 0) {
      if (isUserOwnedBayDict(dictData)) {   // TallyOne 1.11-01: 조회 경로가 아니라 정본 여부로 — v5 유령 베이 혼입 차단
        const allowed = new Set(baysSummary.map((s) => Number(s.bayNo)).filter(Number.isFinite));
        bays = raw.filter((b) => allowed.has(Number(b.bayNum)));
      } else {
        const have = new Set(raw.map((b) => Number(b.bayNum)));
        const extra = baysSummary
          .map((s) => Number(s.bayNo))
          .filter((n) => Number.isFinite(n) && n > 0 && !have.has(n))
          .map((n) => {
            const sm = summaryByBay.get(n);
            return { bayNum: n, cells: [], hasHold: !!sm?.hasHold, hasDeck: sm?.hasDeck !== false, isStandalone: !!sm?.isStandalone };
          });
        bays = [...raw, ...extra].sort((a, b) => Number(a.bayNum) - Number(b.bayNum));
      }
    }

    return bays.map((b) => {
      const summary = summaryByBay.get(b.bayNum);
      const hasDeckFromSummary = summary?.hasDeck;
      const hasHoldFromSummary = summary?.hasHold;
      const tiers = ediTiersByBay.get(b.bayNum);
      const ediTiers = tiers ? [...tiers] : [];
      const hasDeckFromEdi = ediTiers.some((t) => t >= 80);
      const hasHoldFromEdi = ediTiers.some((t) => t < 80);
      const hasDeck = hasDeckFromSummary !== undefined ? hasDeckFromSummary : (b.hasDeck !== false || hasDeckFromEdi);
      const hasHold = hasHoldFromSummary !== undefined ? hasHoldFromSummary : (b.hasHold || hasHoldFromEdi);
      const cells = b.cells ? [...b.cells].reverse() : []; // M6.90.2: cells는 아래→위 저장 → reverse로 위→아래 변환
      // M6.93.12 fix #5 (검수앱지침서 §6.2 fix #4): 베이별 summary.deckTiers/holdTiers 우선
      //   사용자가 베이별로 4단/3단 다르게 입력한 정답 보존.
      //   선박 전체 통일값(deckTiersAll/holdTiersAll)은 fallback으로만.
      const summaryDeck = (summary?.deckTiers && summary.deckTiers.length > 0)
        ? summary.deckTiers
        : (summary?.deckTiersLocal && summary.deckTiersLocal.length > 0 ? summary.deckTiersLocal : null);
      const summaryHold = (summary?.holdTiers && summary.holdTiers.length > 0)
        ? summary.holdTiers
        : (summary?.holdTiersLocal && summary.holdTiersLocal.length > 0 ? summary.holdTiersLocal : null);
      const deckTiers = hasDeck ? (summaryDeck ? summaryDeck.map(Number) : deckTiersAll) : [];
      const holdTiers = hasHold ? (summaryHold ? summaryHold.map(Number) : holdTiersAll) : [];
      const nDeck = deckTiers.length;
      const nHold = holdTiers.length;
      // M6.93.12 fix #5b: deck/hold cells도 summary 우선
      const summaryDeckCells = (summary?.deckCells && summary.deckCells.length > 0) ? summary.deckCells : null;
      const summaryHoldCells = (summary?.holdCells && summary.holdCells.length > 0) ? summary.holdCells : null;
      const deckCells = summaryDeckCells
        ? summaryDeckCells.slice(0, nDeck).map(Number)
        : (nDeck > 0 ? cells.slice(0, nDeck) : []);
      const holdCells = summaryHoldCells
        ? summaryHoldCells.slice(0, nHold).map(Number)
        : (nHold > 0 ? cells.slice(nDeck, nDeck + nHold) : []);
      return {
        ...b,
        hasDeck,
        hasHold,
        deckCells,
        holdCells,
        deckTiers,
        holdTiers,
        // V7.98-11: pairEven 전파 — autoPairBays가 짝수 별도 엔트리 없이 페어 인식하도록.
        //   baysSummary(matrixToBayDictEntry)엔 pairEven이 직렬화돼 있으나 여기서 누락돼,
        //   매트릭스 빌더로 만든 페어가 "3 (4)5" 대신 "3 5"로 붕괴하던 버그.
        pairEven: summary?.pairEven || b.pairEven || null,
        isStandalone: summary?.isStandalone || b.isStandalone || false,
      };
    });
  }, [dictData, containers]);

  // POD 추론 (양하 모드)
  const pod = useMemo(() => {
    if (explicitPod) return explicitPod;
    const counts = {};
    for (const c of containers) {
      const p = c.pod;
      if (p) counts[p] = (counts[p] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'KRPTK';
  }, [containers, explicitPod]);

  // M6.81 알고리즘 적용
  const { trios, singles } = useMemo(() => autoPairBays(matrixBays), [matrixBays]);
  const pdfBays = useMemo(() => generatePdfBays(matrixBays, trios, singles), [matrixBays, trios, singles]);
  // 지침서 4.5: deck-only(hold 없는) 단독 베이는 하단 배치 → autoPageLayout에 전달
  const deckOnlyKeys = useMemo(() => {
    const s = new Set();
    for (const [key, pb] of Object.entries(pdfBays || {})) {
      if (pb && (!pb.hold_t || pb.hold_t.length === 0)) {
        const m = key.startsWith('(') ? key.replace('(', '').replace(')', '').slice(2) : key;
        s.add(parseInt(m, 10));
        s.add(key);
      }
    }
    return s;
  }, [pdfBays]);
  const layout = useMemo(() => autoPageLayout(trios, singles, 5, deckOnlyKeys), [trios, singles, deckOnlyKeys]);
  const posMap = useMemo(() => buildPosMap(containers), [containers]);
  // ★ 1.63: 별첨 글자 크기를 **칸 폭에 맞춘다** (검수사 확정 — "열과 폭 비율만 정하면 어떤 형태든 맞을 것").
  //   별첨 칸 폭 = 페이지 폭 ÷ 줄당 박스 수. 박스가 많을수록 칸이 좁으니 글자도 같이 줄여야 한다.
  //   실측 기준점: 줄당 9칸(HAYN 17베이)에서 8px 가 지금 보기 좋다 → 9칸=8px 로 놓고 반비례.
  //   너무 작아지지 않게 5.5px 바닥, 너무 커지지 않게 9.5px 천장을 둔다.
  const legendFont = useMemo(() => {
    const perRow = Math.max(layout[0]?.length || 1, 1);
    // 별첨이 여러 칸으로 흩어지면 한 칸이 지는 표가 줄어 세로 여유가 생긴다 → 글자를 조금 키운다.
    const slots = Math.max(0, perRow - (layout[1]?.length ?? perRow));
    const bonus = slots >= 3 ? 1.25 : slots === 2 ? 1.12 : 1;
    return Math.min(9.5, Math.max(5.5, Math.round((8 * 9 / perRow) * bonus * 10) / 10));
  }, [layout]);

  // 박스별 카운트 (M6.86.8.4: M6.81 정답 포맷)
  //   단독 베이 (single + trio top) = 총합 단일 숫자
  //   페어 박스 (trio pair) = "20피트 / 40피트 / 45피트"
  //   사이즈 판정: ISO 라벨 우선 (45XX → 45, 4XXX → 40, 그 외 → 20)
  // M6.90.1: ISO 6346 표준 사이즈 판정 — 첫 자가 사이즈 코드.
  //   ISO 4자리: [길이][높이][타입][변형]
  // M6.91.2: isoToLabel로 정규화 후 사이즈 결정.
  //   양하/선적이 다른 ISO 표기로 들어와도 (45GP vs L5G1 vs 4500) 일관 분류.
  //   isoToLabel: 45GP/45HC/45R1 → 40HC/40RF, L5G1 → 45HC, 22GP → 20DC 등 ISO 6346 표준 적용.
  const sizeOfC = (c) => {
    const lbl = isoToLabel(c.iso) || '';
    if (lbl.startsWith('45')) return '45';
    if (lbl.startsWith('40')) return '40';
    if (lbl.startsWith('20')) return '20';
    return '20';
  };
  // M6.86.8.7: 양하 별첨/카운트는 평택분(PTK)만 강제 (사용자 약속).
  //   양하 mode → POD가 PTK 포함된 것만
  //   선적 mode → POL이 PTK 포함된 것만
  // M6.94.29: 평택 판정 — 검수리스트와 동일 원칙으로 통일.
  //   "리스트에 등록(_inList)되면 무조건 평택" + EDI POL/POD가 평택이면 평택.
  //   원인: 엠티 선적 리스트는 항구 컬럼이 목적지(CNDLC 등)라 pol 인식 안 됨.
  //   하지만 EDI가 KRPTK로 증명하거나 검수 리스트에 등록돼 있으면 평택 선적분이 맞음.
  //   기존엔 pol만 봐서 엠티 285대가 별첨에서 누락됐다.
  // M6.94.34: _inList(리스트=평택)는 선적 모드에서만. 양하는 pod 평택만 인정.
  //   (양하에서 _inList 인정 시 타항 양하분 PHDVO 등이 평택으로 잘못 잡힘)
  const matchPodC = (c) => {
    if (mode === 'discharge') {
      return isPyeongtaekPort(c.pod);
    }
    if (c._inList) return true;  // 선적: 리스트 등록 = 평택
    return isPyeongtaekPort(c.pol);
  };
  //  2.83: 머리 합계용 평택분 대수 — **별첨·베이 카운트와 같은 판정(matchPodC)** 을 쓴다.
  const _ptkCount = (containers || []).filter((c) => c && matchPodC(c)).length;
  const boxCounts = useMemo(() => {
    const matchBay = (c, num) => Number(c.bay) === num;
    const byBay = new Map();
    for (const c of containers) {
      if (!matchPodC(c)) continue;
      const n = Number(c.bay);
      if (!Number.isFinite(n)) continue;
      if (!byBay.has(n)) byBay.set(n, { '20': 0, '40': 0, '45': 0 });
      byBay.get(n)[sizeOfC(c)]++;
    }
    const get = (n) => byBay.get(n) || { '20': 0, '40': 0, '45': 0 };
    const counts = {};
    trios.forEach(([top, pair]) => {
      const topOdd = parseInt(top, 10);
      const dt = get(topOdd);
      counts[top] = String(dt['20'] + dt['40'] + dt['45']);
      const m = pair.replace('(', '').replace(')', '');
      const even = parseInt(m.slice(0, 2), 10);
      const odd = parseInt(m.slice(2), 10);
      const de = get(even), doB = get(odd);
      counts[pair] = `${de['20'] + doB['20']} / ${de['40'] + doB['40']} / ${de['45'] + doB['45']}`;
    });
    singles.forEach((s) => {
      const d = get(parseInt(s, 10));
      counts[s] = String(d['20'] + d['40'] + d['45']);
    });
    return counts;
  }, [trios, singles, containers, pod]);

  // M6.92.0: 공통 색 함수 (utils.js) 사용 — 베이플랜/카고플랜/베이상세 통일
  const colorMap = useMemo(() => buildContainerColorMap(containers, mode), [containers, mode]);
  const getColorKey = (c) => getContainerColorKey(c, mode);
  // M6.86.8.14: 통과화물 판정 — 양하 mode에서 c.pod가 PTK 아니면 통과, 선적은 c.pol이 PTK 아니면 통과
  const getIsThrough = (c) => !matchPodC(c);

  // M6.86.8.6: 선사별 / 화물종류별 / POD별 카운트
  const legends = useMemo(() => {
    const carrierCounts = new Map();
    const cargoCounts = new Map();
    const podCounts = new Map();
    // V8.44: 별첨3 — 규격(20/40/45)별 Full/Empty 카운트 (평택분만, 기존 별첨 원칙 동일).
    const feCounts = { '20': { F: 0, E: 0 }, '40': { F: 0, E: 0 }, '45': { F: 0, E: 0 } };
    const addTo = (map, key, size) => {
      if (!map.has(key)) map.set(key, { '20': 0, '40': 0, '45': 0, total: 0 });
      const e = map.get(key);
      e[size]++;
      e.total++;
    };
    // V8.87: 별첨은 리스트(검수 대상) 기준 — 카고플랜 그림(containers)은 베이 있는 컨만이라
    //   베이 미배정 리스트 컨(터미널 PRE 등)이 별첨에서 통째로 빠지던 문제 해결.
    //   legendContainers(검수앱 ptkContainers / 콘앱 records 합본)가 오면 그걸로 집계.
    const legendSrc = (legendContainers && legendContainers.length) ? legendContainers : containers;
    for (const c of legendSrc) {
      if (!matchPodC(c)) continue;
      if (c._slot || (typeof c.cn === 'string' && c.cn.startsWith('__SLOT_'))) continue;   // V8.86: 컨번호 미지정 자리는 별첨에서 제외 — 별첨은 리스트(실컨) 기준
      const size = sizeOfC(c);
      const carrier = (c.op && String(c.op).trim()) || 'UNK';
      addTo(carrierCounts, carrier, size);
      let cat = '일반';
      if (c.dg) cat = 'DG';
      else if (c.iso && c.iso[2] === 'R') cat = 'Reefer';
      else if (c.fr || (c.iso && c.iso[2] === 'P')) cat = 'FR';
      else if (c.ot || c.oog || (c.iso && c.iso[2] === 'U')) cat = 'OT';
      else if (c.tk || (c.iso && c.iso[2] === 'T')) cat = 'Tank';
      addTo(cargoCounts, cat, size);
      // M6.94.29: POD 키 직접 추출 (이미 matchPodC 통과 = 평택 확정).
      //   getContainerColorKey는 pol 재검증을 하는데, 엠티는 pol이 목적지로 오염될 수 있어
      //   여기서 null이 나면 POD 별첨에서 누락됨 → POD 3자만 직접 뽑는다.
      feCounts[size][c.fe === 'E' ? 'E' : 'F']++;   // V8.44: 규격별 F/E
      const podRaw = String(c.pod || '').toUpperCase();
      const p3 = podRaw.length >= 5 ? podRaw.slice(2, 5) : podRaw.slice(0, 3);
      if (p3 && p3 !== 'PTK') addTo(podCounts, p3, size);
    }
    const carriers = [...carrierCounts.entries()].sort((a, b) => b[1].total - a[1].total);
    const cargos = [...cargoCounts.entries()].sort((a, b) => {
      if (a[0] === '일반') return -1;
      if (b[0] === '일반') return 1;
      return b[1].total - a[1].total;
    });
    const pods = [...podCounts.entries()].sort((a, b) => b[1].total - a[1].total);
    return { carriers, cargos, pods, feCounts };
  }, [containers, legendContainers, pod, mode]);

  // 모든 베이의 렌더 데이터 미리 계산
  const renderDataMap = useMemo(() => {
    const map = {};
    const allKeys = [];
    trios.forEach(([t, p]) => {
      allKeys.push(t);
      allKeys.push(p);
    });
    singles.forEach((s) => allKeys.push(s));
    for (const key of allKeys) {
      map[key] = computeBayRenderData(key, pdfBays, matrixBays, posMap, pod, (c, p) => getMarkV2(c, p, mode), xrayMap, getColorKey, getIsThrough, dictData?.bayDef, dictData?.code, shiftingMap);
    }
    return map;
  }, [pdfBays, matrixBays, posMap, pod, mode, trios, singles]);

  // M6.94.12: 전체 베이 중 최대 칸 수 → 모든 베이 grid를 이 칸 수로 통일 (셀 폭 일치).
  //   박스 폭은 동일(flex 1), 칸 적은 베이는 빈 칸으로 채워 셀 하나 폭을 모든 베이에서 같게.
  const globalMaxCols = useMemo(() => {
    let m = 0;
    for (const d of Object.values(renderDataMap)) {
      if (d?.nDeckCols && d.nDeckCols > m) m = d.nDeckCols;
      if (d?.nHoldCols && d.nHoldCols > m) m = d.nHoldCols;
    }
    return Math.max(m, 1);
  }, [renderDataMap]);

  // M6.94.16: 전체 베이 중 (deck tier + hold tier) 최대 → 셀 높이 고정 기준.
  //   홀드 없는 베이는 deck만 그리되 아래 spacer로 빈 공간 → deck 셀 높이를 다른 베이와 통일.
  const globalMaxTier = useMemo(() => {
    let m = 0;
    for (const d of Object.values(renderDataMap)) {
      const t = (d?.deckTiers?.length || 0) + (d?.holdTiers?.length || 0);
      if (t > m) m = t;
    }
    return Math.max(m, 1);
  }, [renderDataMap]);

  // V7.58: 해치커버 수평 정렬 기준 — 홀드가 있는 베이들의 최대 데크/홀드 단수 (사용자 확정).
  //   모든 해치 보유 베이의 deck:hold 영역을 maxDeck:maxHold 동일 비율로 → 해치선이 같은 수평선.
  //   데크는 아래(82)가 해치선에 붙으므로 부족분은 위 spacer, 홀드는 위가 붙으므로 아래 spacer.
  const globalHatch = useMemo(() => {
    let maxDeck = 0, maxHold = 0;
    for (const d of Object.values(renderDataMap)) {
      const nH = d?.holdTiers?.length || 0;
      if (nH <= 0) continue;  // deck-only 베이는 해치선이 없어 기준에서 제외
      maxDeck = Math.max(maxDeck, d?.deckTiers?.length || 0);
      maxHold = Math.max(maxHold, nH);
    }
    return { maxDeck: Math.max(maxDeck, 1), maxHold: Math.max(maxHold, 1) };
  }, [renderDataMap]);

  // V8.25: 화면 핀치 줌 (인쇄 무관) — 카고플랜에 두 손가락 확대/축소 추가
  const [zoom, setZoom] = useState(1);  // V8.26-02: 100% 시작
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
  const onTouchStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startZoom: zoom };
    }
  };
  const onTouchMove = (e) => {
    if (pinchRef.current.active && e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const ratio = Math.hypot(dx, dy) / (pinchRef.current.startDist || 1);
      setZoom(Math.min(3, Math.max(0.15, pinchRef.current.startZoom * ratio)));
      e.preventDefault();
    }
  };
  const onTouchEnd = (e) => { if (!e.touches || e.touches.length < 2) pinchRef.current.active = false; };

  const closeBtn = onClose ? (
    <div className="cpv2-noprint" style={{ position: 'fixed', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 6 }}>
      {!IS_TOUCH_DEVICE && (<>
        <button onClick={() => setZoom(z => Math.max(0.15, +(z - 0.1).toFixed(2)))} style={{ padding: '6px 11px', background: '#37474f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>−</button>
        <button onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))} style={{ padding: '6px 11px', background: '#37474f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>＋</button>
        <button onClick={() => setZoom(0.22)} style={{ padding: '6px 10px', background: '#546e7a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>맞춤</button>
      </>)}
      <button onClick={() => window.print()} style={{ padding: '6px 10px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🖨 인쇄</button>
      <button onClick={onClose} style={{ padding: '6px 10px', background: '#37474f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ 닫기</button>
    </div>
  ) : null;

  if (!dictData) {
    // TallyOne 1.14: 사전이 없으면 **없다고 말한다.** 계열 대체(남의 배 골격 빌려 그리기)를 폐지했으므로
    //   여기 도달하는 항차가 늘어난다 — 개발자용 문구 대신 무엇을 해야 하는지 적는다.
    const _c = (() => { try { return extractShipMetaFromVoyage({ info: voyageInfo })?.code || ''; } catch { return ''; } })();
    return (
      <div className="cpv2-overlay-fallback" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0f172a', color: '#fff', padding: 20 }}>
        {closeBtn}
        <div style={{ marginTop: 60, maxWidth: 560, lineHeight: 1.7 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>베이 매트릭스가 없습니다</div>
          <div style={{ color: '#cbd5e1' }}>
            이 배(<b style={{ color: '#fff' }}>{_c || shipName || '선박코드 미상'}</b>)의 베이 구조가 사전에 등록돼 있지 않습니다.
          </div>
          <div style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>
            비슷한 배의 구조를 빌려 그리지 않습니다 — 틀린 그림은 검수를 그르칩니다.
            <br />매트릭스 빌더에서 이 배를 등록한 뒤 다시 열어 주세요.
          </div>
          <div style={{ color: '#64748b', marginTop: 12, fontSize: 11 }}>
            조회 키 — 코드 {_c || '(없음)'} · 선박명 {String(shipName || '(없음)')} · IMO {String(shipImo || '(없음)')}
          </div>
        </div>
      </div>
    );
  }
  if (matrixBays.length === 0) {
    return (
      <div className="cpv2-overlay-fallback" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0f172a', color: '#fff', padding: 20 }}>
        {closeBtn}<div style={{ marginTop: 60 }}>이 선박은 v5 매트릭스가 등록되어 있지 않습니다. (베이사전 v2 entry는 있어도 cells 매트릭스 정보 없음)</div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const title =
    mode === 'discharge'
      ? `${(effShipName || '').toUpperCase()} CARGO DISCHARGING PLAN`
      : `${(effShipName || '').toUpperCase()} CARGO LOADING PLAN`;

  return createPortal(
    <div className="cpv2-overlay" onWheel={(e) => { if (e.ctrlKey) { e.preventDefault(); setZoom(z => Math.min(3, Math.max(0.15, +(z - e.deltaY * 0.002).toFixed(3)))); } }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <style>{CARGO_V2_CSS}</style>
      {closeBtn}
      <div className="cpv2-zoom-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
      <div className="cpv2-page">
        <div className="cpv2-page-header">
          <div className="col">VOY NO : {effVoyNo}</div>
          <div className="title-center">{title}</div>
          <div className="col" style={{ fontSize: 8, color: '#555' }}>칠한 칸=풀(하늘색=일반, 특수화물은 제 색) · 안 칠한 칸=엠티 · e=20ft·E=40ft · X=옆 40ft가 차지 · 회색=통과{shiftCount > 0 ? ' · ◆=쉬프팅' : ''}{urgentCount > 0 ? ' · ▲=긴급' : ''}{luggCount > 0 ? ' · 보라테두리=수화물' : ''}</div>
          {/* 2.83 (검수사): «양하279 시프팅95 합 374개» — 작업량·콘 계산이 한눈에 서게 합을 적는다.
              시프팅이 0이면 종전대로 대수만(없는 줄을 만들지 않는다). */}
          <div className="col" style={{ fontSize: 9, color: '#111', fontWeight: 'bold' }}>
            {mode === 'discharge' ? '양하' : '선적'} {_ptkCount}
            {shiftCount > 0 && (
              <>
                <span style={{ color: '#1d4ed8' }}> · 쉬프팅 {shiftCount}</span>
                {/* 2.83-01 (검수사 문구 확정): «합»이 아니라 «작업분» —
                    *«검수앱은 기존에다 시프팅만 따로 표기 해주면 됩니다.
                      양하 279 시프팅 95 **작업분** 374 이런식으로»*
                    ⚠ 검수앱은 양하 대수(279)를 **그대로 둔다**. 검수 리스트가 그 수이기 때문이다.
                      시프팅을 대수에 **합치는 것은 콘앱만의 계산법**이다(내리고 싣는 것만 세므로). */}
                <span> · 작업분 {_ptkCount + shiftCount}</span>
              </>
            )}
          </div>
          {urgentCount > 0 && <div className="col" style={{ fontSize: 9, color: '#dc2626', fontWeight: 'bold' }}>긴급 {urgentCount}</div>}
          {luggCount > 0 && <div className="col" style={{ fontSize: 9, color: '#7c3aed', fontWeight: 'bold' }}>수화물 {luggCount}</div>}
          {/* V9.05: 어느 베이사전으로 그렸는지 표기 — 오매칭 즉시 식별 (2026-07-21 SWAT 사건 후속) */}
          <div className="col" style={{ fontSize: 8, color: isUserOwnedBayDict(dictData) ? '#555' : '#dc2626', fontWeight: isUserOwnedBayDict(dictData) ? 'normal' : 'bold' }}>
            {dictData
              ? `사전:${dictData.code || '?'}·${dictData.source || '?'}${dictData.bayDef?.parsedAt ? '·' + String(dictData.bayDef.parsedAt).slice(0, 10) : ''}${isUserOwnedBayDict(dictData) ? '' : ' ⚠비정본'}`
              : '사전:⚠미매칭(폴백 구조)'}
          </div>
          <div className="col">DATE : {today}</div>
        </div>
        {dictData && dictData._substituted && (
          <div style={{ background: '#fef3c7', border: '1px solid #d97706', color: '#92400e', padding: '6px 10px', margin: '0 0 6px', fontSize: 12, borderRadius: 4 }}>
            ⚠ {dictData._substituted.fromCode} 베이정보가 없어 같은 계열 {dictData._substituted.usedName ? `${dictData._substituted.usedName}(${dictData._substituted.usedCode})` : dictData._substituted.usedCode}(으)로 대체했습니다. 구조가 미세하게 다를 수 있습니다.
          </div>
        )}
        <div className="cpv2-page-rows">
          {layout.map((row, ri) => {
            const isLast = ri === layout.length - 1;
            const isFirst = ri === 0;
            // M6.86.8.11: 별첨 자리 = 상단 박스 수 - 하단 박스 수
            //   짝수 N → 2자리 (별첨1 + 별첨2), 홀수 N → 1자리 (별첨1+2 통합)
            const topLen = layout[0]?.length || 0;
            const emptySlots = isLast && !isFirst ? Math.max(0, topLen - row.length) : 0;
            // ★ 2.56-03 (검수사 확정 2026-08-26): 빈 칸이 하나뿐이면 별첨3 은 하단 줄의
            //   **첫 단독 박스 빈 아래 반쪽**(cpv2-empty-half — 데크 전용 단독 베이 밑 빈 곳)으로 옮긴다.
            //   원문 — «빈곳을 이용하라고 했는데 별첨 1과 2를 같이 놓고 3을 34번 베이 하단에 놓으면 보기 좋을텐데».
            //   1.63 확정 «빈곳이 있으면 별첨 하나를 옮기면 됩니다» 의 «빈곳»에 단독 박스 아래 반쪽을 포함.
            const leg3InBoxBi = (emptySlots === 1) ? row.findIndex(b => b.type !== 'trio') : -1;
            const slots = [];
            // M6.86.8.13: 별첨 구성 mode별
            //   양하: 별첨1(선사별 + 컬러), 별첨2(화물종류별, 흑백)
            //   선적: 별첨1(POD별 + 컬러), 별첨2(선사별, 흑백) — 사용자 요청 추가
            const isDischarge = mode === 'discharge';
            const leg1Title = isDischarge ? '별첨1 · 선사별 (양하)' : '별첨1 · POD별 (선적)';
            const leg1Rows = isDischarge ? legends.carriers : legends.pods;
            const leg1Kind = isDischarge ? 'carrier' : 'pod';
            const leg1Header = isDischarge ? '선사' : 'POD';
            // 2.38 (검수사 확정 «선적시 선사색은 표기안함»): 선적 별첨2를 선사 → **화물 종류**로 바꾼다.
            //   선적 셀 색은 원래 POD 전용인데(getContainerColorKey), 별첨2에 선사표가 남아 있어
            //   인쇄물에서 «선사 색도 있나» 하고 읽혔다. 선적은 POD 하나로만 구분한다.
            const leg2Title = isDischarge ? '별첨2 · 화물 종류별 (양하)' : '별첨2 · 화물 종류별 (선적)';
            const leg2Rows = legends.cargos;
            const leg2Kind = 'cargo';
            const leg2Header = '종류';
            // ★★★ TallyOne 1.63: 별첨은 **가로 한 칸**을 쓰고, 그 안에서 **위→아래 세 단**으로 놓는다.
            //   검수사 지적 2026-08-13(별첨이 잘려 보인다는 인쇄물 사진과 함께):
            //     *"별첨을 왜 두개를 나란히 놓았나요. **별첨을 좀더 크게하고 상 중 하 단으로** 놔도 될듯한데"*
            //   되물음이 정확했다 — 종전 코드가 실제로 한 칸을 좌우로 반씩 쪼개 놓고 있었다
            //   (`display:flex` 가로 + `flex:1` 둘). 그래서 표 두 개가 각각 칸 절반 폭에 눌려
            //   글자와 열이 잘렸다. 세로로 쌓으면 표 하나하나가 칸 폭을 통째로 쓴다.
            //
            //   자리 수 실측(2026-08-13) — 별첨 칸은 `상단 − 하단` 이고 `topCount=⌈(N+1)/2⌉` 이므로
            //     박스가 **홀수면 1칸**(HAYN 17개 · DXQD 19 · TNJP 25 · OBWH 15),
            //     **짝수면 2칸**(XTPG 20 · MAMP 36). 종전엔 이 1칸/2칸에 따라 배치가 통째로 달라져
            //     같은 서류가 배마다 다른 모양이었다.
            //   → 검수사 확정 "가로 1칸". 칸이 둘 이상 남아도 별첨은 한 칸만 쓰고 나머지는 비운다
            //     (빈 칸을 그대로 두어야 옆 베이 박스 폭이 안 늘어난다).
            // ★★★ TallyOne 1.63: 별첨은 **빈 칸이 있는 만큼 나눠 담는다.**
            //   검수사 확정 2026-08-13 — 처음 답은 *"빈 칸이 어디든 찾아 넣는다"* 였고,
            //   큰 배에서 글자가 5.5px 바닥에 걸린다는 보고에 이렇게 못 박았다:
            //     *"이 이유로 **빈곳이 있으면 별첨 하나를 옮기면** 됩니다."*
            //   즉 "가로 1칸"은 자리가 하나뿐일 때의 이야기지 고정 규칙이 아니다.
            //   빈 칸이 많을수록 표를 흩어 담아 **하나하나를 크게** 만든다.
            //     1칸 → [1+2+3] 한 칸에 세로 3단   (종전처럼, 다만 좌우 분할이 아니라 세로)
            //     2칸 → [1] · [2+3]
            //     3칸 이상 → [1] · [2] · [3]  — 각자 한 칸을 통째로 쓴다
            //   자리 수 실측: `상단 − 하단`, `topCount=⌈(N+1)/2⌉` 이므로 박스 홀수면 1칸·짝수면 2칸이다.
            //   3칸 이상은 지금 배분에서는 안 나오지만, 배분이 바뀌어도 알아서 펼쳐지게 미리 받아 둔다.
            if (emptySlots >= 1) {
              const legend1 = (
                <Legend title={leg1Title} headers={['', leg1Header, "20'", "40'", "45'", '합계']}
                  rows={leg1Rows} totalRow={true} kind={leg1Kind} colorMap={colorMap} />
              );
              const legend2 = (
                <Legend title={leg2Title} headers={['', leg2Header, "20'", "40'", "45'", '합계']}
                  rows={leg2Rows} totalRow={true} kind={leg2Kind} />
              );
              const legend3 = <FeLegend fe={legends.feCounts} />;
              // 칸 하나를 세로로 채우는 껍데기 — 표가 여럿이면 높이를 나눠 갖는다.
              const cell = (key, items) => (
                <div key={key} className="cpv2-bay-box cpv2-legend-box" style={{ '--lgf': `${legendFont}px` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', height: '100%' }}>
                    {items.map((it, k) => (
                      <div key={k} style={{ flex: it.grow ? '1 1 0' : '0 0 auto', minHeight: 0, overflow: 'hidden' }}>
                        {it.node}
                      </div>
                    ))}
                  </div>
                </div>
              );
              if (emptySlots >= 3) {
                slots.push(cell('leg1', [{ node: legend1, grow: true }]));
                slots.push(cell('leg2', [{ node: legend2, grow: true }]));
                slots.push(cell('leg3', [{ node: legend3, grow: true }]));
                for (let i = 3; i < emptySlots; i++) slots.push(<div key={`pad-${i}`} className="cpv2-bay-box cpv2-empty-slot"></div>);
              } else if (emptySlots === 2) {
                slots.push(cell('leg1', [{ node: legend1, grow: true }]));
                slots.push(cell('leg23', [{ node: legend2, grow: true }, { node: legend3, grow: false }]));
              } else if (leg3InBoxBi >= 0) {
                // 별첨3 은 아래 단독 박스 빈 반쪽으로 — 1·2 가 세로 두 단을 통째로 써서 한 단씩 커진다.
                slots.push(cell('leg12', [
                  { node: legend1, grow: true }, { node: legend2, grow: true },
                ]));
              } else {
                slots.push(cell('leg123', [
                  { node: legend1, grow: true }, { node: legend2, grow: true }, { node: legend3, grow: false },
                ]));
              }
            }
            // 그 다음 실제 박스들
            // M6.94.12: 박스 폭은 모두 동일(flex 1). 셀 폭 통일은 grid를 전체 최대 칸 수로
            //   맞추고 칸 적은 베이는 빈 칸으로 채워서 처리 (CASPI식). M6.94.11 박스 비례 폐기.
            row.forEach((box, bi) => {
              if (box.type === 'trio') {
                const topData = renderDataMap[box.topKey];
                const pairData = renderDataMap[box.pairKey];
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-trio-box">
                    <BayBoxV2 data={topData} count={boxCounts[box.topKey]} colorMap={colorMap} gridCols={globalMaxCols} applyHatch={false} globalMaxTier={globalMaxTier} globalHatch={globalHatch} />
                    <div className="cpv2-trio-divider"></div>
                    <BayBoxV2 data={pairData} count={boxCounts[box.pairKey]} colorMap={colorMap} gridCols={globalMaxCols} applyHatch={true} globalMaxTier={globalMaxTier} globalHatch={globalHatch} />
                  </div>
                );
              } else {
                const sData = renderDataMap[box.topKey];
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-single-box">
                    <div className="cpv2-single-half">
                      <BayBoxV2 data={sData} count={boxCounts[box.topKey]} colorMap={colorMap} gridCols={globalMaxCols} globalMaxTier={globalMaxTier} globalHatch={globalHatch} />
                    </div>
                    <div className="cpv2-empty-half">
                      {bi === leg3InBoxBi && (
                        <div className="cpv2-legend-box" style={{ '--lgf': `${legendFont}px`, height: '100%', marginTop: '3px' }}>
                          <FeLegend fe={legends.feCounts} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            });
            return (
              <div key={ri} className="cpv2-page-row">{slots}</div>
            );
          })}
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}

// V8.44: 별첨3 렌더링 — 규격(20/40/45)별 Full/Empty 표 (흑백, 평택분).
function FeLegend({ fe }) {
  const sizes = ['20', '40', '45'];
  const totF = sizes.reduce((a, s) => a + fe[s].F, 0);
  const totE = sizes.reduce((a, s) => a + fe[s].E, 0);
  return (
    <div className="cpv2-legend">
      <div className="cpv2-legend-title">별첨3 · 규격별 F/E</div>
      <table className="cpv2-legend-table">
        <thead>
          <tr><th>규격</th><th>Full</th><th>Empty</th><th>계</th></tr>
        </thead>
        <tbody>
          {sizes.map((sz) => (
            <tr key={sz}>
              <td className="cpv2-legend-nm">{sz}'</td>
              <td className="cpv2-legend-ct">{fe[sz].F}</td>
              <td className="cpv2-legend-ct">{fe[sz].E}</td>
              <td className="cpv2-legend-ct"><b>{fe[sz].F + fe[sz].E}</b></td>
            </tr>
          ))}
          <tr className="cpv2-legend-total">
            <td className="cpv2-legend-nm"><b>합계</b></td>
            <td className="cpv2-legend-ct"><b>{totF}</b></td>
            <td className="cpv2-legend-ct"><b>{totE}</b></td>
            <td className="cpv2-legend-ct"><b>{totF + totE}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 별첨 렌더링 (선사별 / 화물 종류별)
function Legend({ title, headers, rows, totalRow, kind, colorMap = {} }) {
  const cargoColors = {
    '일반': { bg: PLAIN_FULL_BG, fg: MARK_FG, mark: 'o' },   // 2.38-01: 일반 풀 = 하늘색 (그림과 같은 값)
    'Reefer': { bg: SPECIAL_FILL['RF'], fg: MARK_FG, mark: 'R' },
    'DG': { bg: SPECIAL_FILL['DG'], fg: MARK_FG, mark: 'DG' },   // 2.38: 그림이 DG 2글자라 범례도 DG
    'FR': { bg: SPECIAL_FILL['FR'], fg: MARK_FG, mark: 'F' },
    'OT': { bg: SPECIAL_FILL['A'], fg: MARK_FG, mark: 'A' },
    'Tank': { bg: SPECIAL_FILL['TK'], fg: MARK_FG, mark: 'TK' },   // 2.38: 그림이 TK 2글자라 범례도 TK
  };
  // kind: 'carrier' / 'pod' = colorMap 사용 / 'cargo' = cargoColors / 'carrier-bw' = 흑백 (선사 표는 흑백 처리, 사용자 약속)
  const useColorMap = kind === 'carrier' || kind === 'pod';
  const useCargoColor = kind === 'cargo';
  const hasMarkColumn = useColorMap || useCargoColor;
  const tot = rows.reduce((acc, [, v]) => ({
    '20': acc['20'] + v['20'], '40': acc['40'] + v['40'], '45': acc['45'] + v['45'], total: acc.total + v.total,
  }), { '20': 0, '40': 0, '45': 0, total: 0 });
  // M6.94.x fix: carrier-bw(선사별 선적)는 mark 칼럼이 없음.
  //   헤더는 ['', 선사, 20',40',45',합] 6칸으로 들어오는데 본문은 mark 칸을 안 그려 5칸 → 글씨 밀림.
  //   → mark 칼럼 없으면 헤더 첫 빈 칸('')도 제거해 칸 수 일치.
  const effHeaders0 = hasMarkColumn ? headers : headers.filter((h, i) => !(i === 0 && h === ''));
  //  ★ 2.79-03 — **45' 이 한 대도 없으면 그 열을 안 그린다.**
  //    열이 여섯이면 숫자 칸이 15% 밖에 못 받아 세 자리(251·279)가 «2…» 로 잘렸다
  //    (실측 MCSC 633N 인쇄물 — 별첨1 «28 2… 0 2…» · 별첨2 Reefer «0 1… 0 1…»).
  //    45' 은 이 항만에서 드물다. 없으면 빼고 그 폭을 숫자 칸에 준다 — 숨기는 것이 아니라
  //    **없는 것을 안 그리는 것**이고, 있으면 종전대로 여섯 열로 나온다.
  const has45 = tot['45'] > 0;
  const effHeaders = has45 ? effHeaders0 : effHeaders0.filter((h) => h !== "45'");
  const numW = has45 ? '15%' : '20%';
  return (
    <div className="cpv2-legend">
      <div className="cpv2-legend-title">{title}</div>
      <table className="cpv2-legend-table">
        {/* 1.63: 열 폭을 퍼센트로 못 박는다 — 칸이 좁아도 넓어도 같은 비율로 나뉜다.
            마크 · 이름 · 20' · 40' · 45' · 합계 (마크 칸이 없는 표는 이름이 그만큼 넓어진다) */}
        <colgroup>
          {hasMarkColumn && <col style={{ width: '9%' }} />}
          <col style={{ width: hasMarkColumn ? '31%' : '40%' }} />
          <col style={{ width: numW }} />
          <col style={{ width: numW }} />
          {has45 && <col style={{ width: numW }} />}
          <col style={{ width: numW }} />
        </colgroup>
        <thead>
          <tr>{effHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([name, v]) => {
            let markCell = null;
            if (useCargoColor) {
              const c = cargoColors[name] || cargoColors['일반'];
              markCell = <td className="cpv2-legend-mark" style={{ background: c.bg, color: c.fg }}>{c.mark}</td>;
            } else if (useColorMap) {
              const bg = colorMap[name];
              // M6.94.23: 본문이 텍스트 색이므로 범례 견본도 색 글자 ■로 통일
              markCell = <td className="cpv2-legend-mark" style={bg ? { color: bg } : undefined}>{bg ? '■' : ''}</td>;
            }
            return (
              <tr key={name}>
                {markCell}
                <td className="cpv2-legend-nm">{name}</td>
                <td className="cpv2-legend-ct">{v['20']}</td>
                <td className="cpv2-legend-ct">{v['40']}</td>
                {has45 && <td className="cpv2-legend-ct">{v['45']}</td>}
                <td className="cpv2-legend-ct"><b>{v.total}</b></td>
              </tr>
            );
          })}
          {totalRow && (
            <tr className="cpv2-legend-total">
              {hasMarkColumn && <td></td>}
              <td className="cpv2-legend-nm"><b>합계</b></td>
              <td className="cpv2-legend-ct"><b>{tot['20']}</b></td>
              <td className="cpv2-legend-ct"><b>{tot['40']}</b></td>
              {has45 && <td className="cpv2-legend-ct"><b>{tot['45']}</b></td>}
              <td className="cpv2-legend-ct"><b>{tot.total}</b></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
