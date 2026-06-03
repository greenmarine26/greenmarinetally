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
import { enrichBayDef } from '../bayDictAutoEnrich.js';
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
//   - 리퍼 Full = 'R/F', Empty = 'R/E'
//   - FR = 'FR' (2글자), DG = 'D', Tank = 'T', OOG = 'A'
//   - 양하/선적 동일 마크. 색만 다름 (양하=선사별, 선적=POD별).
//   - PTK = 컬러 배경 + 글자. 통과 = 회색 + 빈(일반) / 글자(특수).
// M6.94.23: 특수화물 마크 여부 — true면 선사/포트 색 대신 특수화물 색(기호) 우선.
//   특수화물: D(위험물) R/r(리퍼) FR(플랫랙) T(탱크) A(OOG/오픈탑).
//   일반 표기(F/E/o/X/L/K/P/S/M 등 PTK·선사 마커)는 false → 선사색 적용 허용.
function isSpecialMark(mark) {
  if (!mark) return false;
  const m = String(mark).toUpperCase();
  return m === 'D' || m === 'R' || m === 'R/F' || m === 'R/E' ||
         m.startsWith('R') || m === 'FR' || m === 'T' || m === 'A';
}

function getMarkV2(c, pod, mode) {
  // M6.94.34: _inList(리스트=평택)는 선적 모드에서만. 양하는 pod 평택만 인정.
  //   (양하에서 _inList 인정 시 타항 양하분 PHDVO 등이 평택으로 잘못 조회됨)
  const ptk = mode === 'discharge'
    ? isPyeongtaekPort(c.pod)
    : (c._inList || isPyeongtaekPort(c.pol));

  const isEmpty = c.fe === 'E';

  // 특수화물 종류 우선 판정 (PTK든 통과든 같은 글자)
  let specialLetter = null;
  if (c.dg) specialLetter = 'D';
  else if (isReeferContainer(c)) specialLetter = isEmpty ? 'R/E' : 'R/F';
  else if (c.fr) specialLetter = 'FR';
  else if (c.tk) specialLetter = 'T';
  else if (c.ot || c.oog) specialLetter = 'A';

  // 통과화물: 특수면 글자만 (회색 배경은 cell render), 일반은 빈
  if (!ptk) return specialLetter || '';
  // PTK: 특수면 특수글자, 일반이면 F/E
  return specialLetter || (isEmpty ? 'E' : 'F');
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
.cpv2-tier-row { display: flex; gap: 0; flex: 1 1 0; min-height: 0; }
.cpv2-tier-row.cpv2-invisible-row { display: none; }
.cpv2-tier-row .cpv2-cell { flex: 1 1 0; min-width: 0; min-height: 0; border: 0.5px solid #555; box-sizing: border-box; background: #fff; font-size: clamp(6px, 0.55vw, 8px); display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: bold; color: #000; position: relative; overflow: hidden; }
.cpv2-tier-row .cpv2-cell-empty { flex: 1 1 0; min-width: 0; min-height: 0; visibility: hidden; }
.cpv2-row-labels { display: flex; flex: 0 0 auto; font-size: clamp(7px, 0.75vw, 10px); color: #444; gap: 0; margin: 1px 0; margin-right: 16px; }
.cpv2-row-labels > span { flex: 1 1 0; min-width: 0; text-align: center; line-height: 1.2; }
/* M6.94.19: XRAY는 ★ 별표만 표시, 배경은 선사 색 그대로 (연노랑 강제 제거) */
.cpv2-cell.cpv2-xray::after { content: '★'; position: absolute; top: -1px; right: 0px; font-size: clamp(6px, 0.8vw, 10px); color: #000; font-weight: bold; pointer-events: none; text-shadow: 0 0 1px #fff, 0 0 1px #fff, 0 0 1px #fff; }
.cpv2-cell.cpv2-mark-o { color: #000; }
.cpv2-cell.cpv2-mark-X { color: #000; }
.cpv2-cell.cpv2-mark-R { color: #006064; }
.cpv2-cell.cpv2-mark-r { color: #00838f; }
.cpv2-cell.cpv2-mark-D { color: #b71c1c; }
.cpv2-cell.cpv2-mark-F { color: #1b5e20; }
.cpv2-cell.cpv2-mark-A { color: #4a148c; }
.cpv2-cell.cpv2-mark-T { color: #e65100; }
.cpv2-cell.cpv2-mark-E { color: #555; }
.cpv2-cell.cpv2-mark-L { color: #1565c0; }
.cpv2-cell.cpv2-mark-K { color: #0d47a1; }
.cpv2-cell.cpv2-mark-P { color: #6a1b9a; }
.cpv2-cell.cpv2-mark-S { color: #2e7d32; }
.cpv2-cell.cpv2-mark-M { color: #c62828; }
.cpv2-hatch-break { display: flex; gap: 4px; width: 180px; height: 0; margin: 0; flex-shrink: 0; }
.cpv2-hatch-seg { flex: 1 1 0; border-top: 1.5px solid #000; height: 0; }
.cpv2-tier-labels { display: flex; flex-direction: column; align-items: flex-start; font-size: 9px; color: #444; width: 16px; }
.cpv2-tier-labels > span { flex: 1 1 0; display: flex; align-items: center; line-height: 1; }
.cpv2-tier-labels > span { height: 13px; line-height: 13px; display: block; }
.cpv2-tier-labels > span.cpv2-invisible-label { display: none; }
.cpv2-banner { display: none; }
.cpv2-empty-slot { border: none; background: transparent; }
.cpv2-legend-box { border: 1px solid #000; background: white; padding: 4px; display: flex; flex-direction: column; overflow: hidden; }
.cpv2-legend { width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; }
.cpv2-legend-title { font-size: 9px; font-weight: bold; text-align: center; padding: 2px 0; border-bottom: 0.5px solid #888; margin-bottom: 2px; color: #333; flex-shrink: 0; }
.cpv2-legend-table { width: 100%; border-collapse: collapse; font-size: 8px; }
.cpv2-legend-table th, .cpv2-legend-table td { padding: 1px 3px; border: 0.3px solid #aaa; }
.cpv2-legend-table th { background: #f5f5f5; font-size: 7px; font-weight: bold; }
.cpv2-legend-mark { width: 14px; text-align: center; font-weight: bold; font-size: 8px; }
.cpv2-legend-nm { font-size: 8px; font-weight: bold; }
.cpv2-legend-ct { font-size: 7.5px; text-align: center; }
.cpv2-legend-total { background: #f0f0f0; }
@media print {
  /* M6.86.8.21: M6.81 ref.html과 동일한 인쇄 처리.
     ref.html은 page height 195mm 고정 (A4 landscape - margin 6mm × 2). 
     V2는 화면에선 viewport 비례지만 인쇄에선 195mm로 강제. */
  html, body { background: white !important; background-color: white !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(.cpv2-overlay) { display: none !important; }
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
  @page { size: A4 landscape; margin: 6mm; }
}
`;

// ------------------------------------------------------------
// BayBox 단일 베이 렌더
// M6.94.0: export하여 매트릭스 빌더에서도 재사용 (1개 베이 시각 미리보기)
// ------------------------------------------------------------
export function BayBoxV2({ data, count, colorMap = {}, gridCols, applyHatch = true, globalMaxTier }) {
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
  const deckPadStyle = computePadding(deckAlign, deckPadLeft, deckPadRight, nDeckCols, gc);
  const holdPadStyle = computePadding(holdAlign, holdPadLeft, holdPadRight, nHoldCols, gc);

  return (
    <div className="cpv2-bay-section">
      <div className="cpv2-bay-title-row">
        <span className="cpv2-bay-title">BAY {bayKey}</span>
        {count != null && <span className="cpv2-bay-count">{count}</span>}
      </div>
      <div className="cpv2-bay-content">
        <div className="cpv2-deck-area" style={{ flex: `${Math.max(deckTiers.length, 1)} 1 0` }}>
          <div className="cpv2-row-labels" style={{ paddingLeft: deckPadStyle.paddingLeft, paddingRight: deckPadStyle.paddingRight }}>
            {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
          </div>
          <div className="cpv2-grid-row-wrap">
            <div className="cpv2-grid" style={{ paddingLeft: deckPadStyle.paddingLeft, paddingRight: deckPadStyle.paddingRight }}>
              {deckRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) => {
                    if (!cell.active) return <span key={ci} className="cpv2-cell-empty"></span>;
                    const bg = cell.colorKey && colorMap[cell.colorKey];
                    let style;
                    if (cell.isShadow20) {
                      // M6.86.8.19: 짝수 20ft shadow = 회색 빈 셀 (자리 차지, 글자 없음)
                      style = { background: '#e5e7eb', color: 'transparent' };
                    } else if (cell.isThrough) {
                      style = { background: '#d4d4d8', color: '#52525b' };  // 통과화물 = 회색
                    } else if (bg) {  /* M6.94.35: 특수마크(엠티 리퍼 R/E 등)도 평택분이면 목적지 색 적용. 통과화물은 위 isThrough에서 회색 처리됨 */
                      style = { color: bg };  // M6.94.23: line/port color -> text color (bg white)
                    }
                    const displayMark = cell.isShadow20 ? '' : (cell.mark || '');
                    return (
                      <span
                        key={ci}
                        className={`cpv2-cell${cell.mark && !cell.isShadow20 ? ` cpv2-mark-${cell.mark}` : ''}${cell.isXray ? ' cpv2-xray' : ''}${cell.isThrough ? ' cpv2-through' : ''}${cell.isShadow20 ? ' cpv2-shadow20' : ''}`}
                        style={style}
                      >
                        {displayMark}
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
        <div className="cpv2-hold-area" style={{ flex: `${Math.max(holdTiers.length, 1)} 1 0` }}>
          <div
            className="cpv2-grid-row-wrap"
            style={{ width: '100%' }}
          >
            <div className="cpv2-grid" style={{ paddingLeft: holdPadStyle.paddingLeft, paddingRight: holdPadStyle.paddingRight }}>
              {holdRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) => {
                    if (!cell.active) return <span key={ci} className="cpv2-cell-empty"></span>;
                    const bg = cell.colorKey && colorMap[cell.colorKey];
                    let style;
                    if (cell.isShadow20) {
                      // M6.86.8.19: 짝수 20ft shadow = 회색 빈 셀 (자리 차지, 글자 없음)
                      style = { background: '#e5e7eb', color: 'transparent' };
                    } else if (cell.isThrough) {
                      style = { background: '#d4d4d8', color: '#52525b' };  // 통과화물 = 회색
                    } else if (bg) {  /* M6.94.35: 특수마크(엠티 리퍼 R/E 등)도 평택분이면 목적지 색 적용. 통과화물은 위 isThrough에서 회색 처리됨 */
                      style = { color: bg };  // M6.94.23: line/port color -> text color (bg white)
                    }
                    const displayMark = cell.isShadow20 ? '' : (cell.mark || '');
                    return (
                      <span
                        key={ci}
                        className={`cpv2-cell${cell.mark && !cell.isShadow20 ? ` cpv2-mark-${cell.mark}` : ''}${cell.isXray ? ' cpv2-xray' : ''}${cell.isThrough ? ' cpv2-through' : ''}${cell.isShadow20 ? ' cpv2-shadow20' : ''}`}
                        style={style}
                      >
                        {displayMark}
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
        </div>
        </>)}
        {(() => {
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
export default function PrintableCargoPlanV2({
  containers = [],
  shipImo,
  shipName,
  voyNo,
  voyageInfo,
  mode = 'discharge',
  xrayMap = {},
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
  // 베이사전 + v5 매트릭스 로딩
  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    // V7.01: 계열 대체 시 베이 수 비교용으로 현재 EDI의 실제 베이 수를 넘김
    const ediBayCount = (() => {
      const s = new Set();
      for (const c of (containers || [])) {
        const n = parseInt(c.bay, 10);
        if (Number.isFinite(n) && n > 0) s.add(n);
      }
      return s.size;
    })();
    const baseDict = getShipBayDictData(shipImo, shipName, { ediBayCount });
    if (!baseDict) return null;
    // M6.94.0 사용자 원칙 1: source='user'면 enrichBayDef가 즉시 entry 반환 (어떤 보강도 안 함).
    //   AI 임시 베이사전 (v2/v5/firebase 등)일 때만 EDI 자동 채움 등 보강 동작.
    const enrichedEntry = enrichBayDef({ bayDef: baseDict.bayDef }, baseDict._v5Matrix, containers, baseDict.source);
    // M6.94.0: cargoPlanCore가 user source 판단할 수 있게 bayDef에 source 정보 포함
    const bayDefWithSource = { ...enrichedEntry.bayDef, source: baseDict.source, _userOwned: baseDict.source === 'user' };
    return { ...baseDict, bayDef: bayDefWithSource };
  }, [shipImo, shipName, containers]);

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
    for (const c of containers) {
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
    if (raw.length > 0 && baysSummary.length > 0) {
      const allowed = new Set(baysSummary.map((s) => Number(s.bayNo)).filter(Number.isFinite));
      bays = raw.filter((b) => allowed.has(Number(b.bayNum)));
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
  const layout = useMemo(() => autoPageLayout(trios, singles, 5), [trios, singles]);
  const posMap = useMemo(() => buildPosMap(containers), [containers]);

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
    const addTo = (map, key, size) => {
      if (!map.has(key)) map.set(key, { '20': 0, '40': 0, '45': 0, total: 0 });
      const e = map.get(key);
      e[size]++;
      e.total++;
    };
    for (const c of containers) {
      if (!matchPodC(c)) continue;
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
    return { carriers, cargos, pods };
  }, [containers, pod, mode]);

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
      map[key] = computeBayRenderData(key, pdfBays, matrixBays, posMap, pod, (c, p) => getMarkV2(c, p, mode), xrayMap, getColorKey, getIsThrough, dictData?.bayDef, dictData?.code);
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

  const closeBtn = onClose ? (
    <div className="cpv2-noprint" style={{ position: 'fixed', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 6 }}>
      <button onClick={() => window.print()} style={{ padding: '6px 10px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🖨 인쇄</button>
      <button onClick={onClose} style={{ padding: '6px 10px', background: '#37474f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ 닫기</button>
    </div>
  ) : null;

  if (!dictData) {
    return (
      <div className="cpv2-overlay-fallback" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0f172a', color: '#fff', padding: 20 }}>
        {closeBtn}<div style={{ marginTop: 60 }}>선박 정보를 찾을 수 없습니다. (shipImo={String(shipImo)}, shipName={String(shipName)})</div>
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
    <div className="cpv2-overlay">
      <style>{CARGO_V2_CSS}</style>
      {closeBtn}
      <div className="cpv2-page">
        <div className="cpv2-page-header">
          <div className="col">VOY NO : {effVoyNo}</div>
          <div className="title-center">{title}</div>
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
            const slots = [];
            // M6.86.8.13: 별첨 구성 mode별
            //   양하: 별첨1(선사별 + 컬러), 별첨2(화물종류별, 흑백)
            //   선적: 별첨1(POD별 + 컬러), 별첨2(선사별, 흑백) — 사용자 요청 추가
            const isDischarge = mode === 'discharge';
            const leg1Title = isDischarge ? '별첨1 · 선사별 (양하)' : '별첨1 · POD별 (선적)';
            const leg1Rows = isDischarge ? legends.carriers : legends.pods;
            const leg1Kind = isDischarge ? 'carrier' : 'pod';
            const leg1Header = isDischarge ? '선사' : 'POD';
            const leg2Title = isDischarge ? '별첨2 · 화물 종류별 (양하)' : '별첨2 · 선사별 (선적)';
            const leg2Rows = isDischarge ? legends.cargos : legends.carriers;
            const leg2Kind = isDischarge ? 'cargo' : 'carrier-bw';
            const leg2Header = isDischarge ? '종류' : '선사';
            if (emptySlots >= 2) {
              slots.push(
                <div key="leg1" className="cpv2-bay-box cpv2-legend-box">
                  <Legend title={leg1Title} headers={['', leg1Header, "20'", "40'", "45'", '합계']} rows={leg1Rows} totalRow={true} kind={leg1Kind} colorMap={colorMap} />
                </div>
              );
              slots.push(
                <div key="leg2" className="cpv2-bay-box cpv2-legend-box">
                  <Legend title={leg2Title} headers={['', leg2Header, "20'", "40'", "45'", '합계']} rows={leg2Rows} totalRow={true} kind={leg2Kind} />
                </div>
              );
            } else if (emptySlots === 1) {
              slots.push(
                <div key="leg-combined" className="cpv2-bay-box cpv2-legend-box">
                  <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Legend title={leg1Title} headers={['', leg1Header, "20'", "40'", "45'", '합']} rows={leg1Rows} totalRow={true} kind={leg1Kind} colorMap={colorMap} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Legend title={leg2Title} headers={['', leg2Header, "20'", "40'", "45'", '합']} rows={leg2Rows} totalRow={true} kind={leg2Kind} />
                    </div>
                  </div>
                </div>
              );
            }
            for (let i = emptySlots; i < emptySlots && i < 0; i++) {  // padding 자리 (현재 없음)
              slots.push(<div key={`pad-${i}`} className="cpv2-bay-box cpv2-empty-slot"></div>);
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
                    <BayBoxV2 data={topData} count={boxCounts[box.topKey]} colorMap={colorMap} gridCols={globalMaxCols} applyHatch={false} globalMaxTier={globalMaxTier} />
                    <div className="cpv2-trio-divider"></div>
                    <BayBoxV2 data={pairData} count={boxCounts[box.pairKey]} colorMap={colorMap} gridCols={globalMaxCols} applyHatch={true} globalMaxTier={globalMaxTier} />
                  </div>
                );
              } else {
                const sData = renderDataMap[box.topKey];
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-single-box">
                    <div className="cpv2-single-half">
                      <BayBoxV2 data={sData} count={boxCounts[box.topKey]} colorMap={colorMap} gridCols={globalMaxCols} globalMaxTier={globalMaxTier} />
                    </div>
                    <div className="cpv2-empty-half"></div>
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
    </div>,
    document.body
  );
}

// 별첨 렌더링 (선사별 / 화물 종류별)
function Legend({ title, headers, rows, totalRow, kind, colorMap = {} }) {
  const cargoColors = {
    '일반': { bg: '#fff', fg: '#000', mark: 'o' },
    'Reefer': { bg: '#b2ebf2', fg: '#006064', mark: 'R' },
    'DG': { bg: '#ffcdd2', fg: '#b71c1c', mark: 'D' },
    'FR': { bg: '#c8e6c9', fg: '#1b5e20', mark: 'F' },
    'OT': { bg: '#e1bee7', fg: '#4a148c', mark: 'A' },
    'Tank': { bg: '#ffe0b2', fg: '#e65100', mark: 'T' },
  };
  // kind: 'carrier' / 'pod' = colorMap 사용 / 'cargo' = cargoColors / 'carrier-bw' = 흑백 (선사 표는 흑백 처리, 사용자 약속)
  const useColorMap = kind === 'carrier' || kind === 'pod';
  const useCargoColor = kind === 'cargo';
  const hasMarkColumn = useColorMap || useCargoColor;
  const tot = rows.reduce((acc, [, v]) => ({
    '20': acc['20'] + v['20'], '40': acc['40'] + v['40'], '45': acc['45'] + v['45'], total: acc.total + v.total,
  }), { '20': 0, '40': 0, '45': 0, total: 0 });
  return (
    <div className="cpv2-legend">
      <div className="cpv2-legend-title">{title}</div>
      <table className="cpv2-legend-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
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
                <td className="cpv2-legend-ct">{v['45']}</td>
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
              <td className="cpv2-legend-ct"><b>{tot['45']}</b></td>
              <td className="cpv2-legend-ct"><b>{tot.total}</b></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
