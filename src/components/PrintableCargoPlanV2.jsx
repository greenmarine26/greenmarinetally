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
import { isReeferContainer, isoToLabel, getContainerColorKey, buildContainerColorMap } from '../utils.js';
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
function getMarkV2(c, pod, mode) {
  const ptk =
    mode === 'discharge'
      ? c.pod && String(c.pod).toUpperCase().includes('PTK')
      : c.pol && String(c.pol).toUpperCase().includes('PTK');

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
// ------------------------------------------------------------
const CSS = `
.cpv2-overlay { position: fixed; inset: 0; z-index: 50; background: #475569; overflow: auto; padding: 8px; -webkit-overflow-scrolling: touch; }
.cpv2-page { width: 277mm; min-width: 1200px; height: 195mm; background: white; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; font-family: Helvetica, Arial, sans-serif; color: #000; box-shadow: 0 0 8px rgba(0,0,0,0.3); margin: 0 auto; }
.cpv2-page-header { border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; }
.cpv2-page-header .title-center { font-size: 14px; font-weight: bold; flex: 1; text-align: center; }
.cpv2-page-header .col { padding: 0 8px; font-size: 9px; }
.cpv2-page-rows { display: flex; flex-direction: column; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-page-row { display: flex; flex-direction: row; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-bay-box { flex: 1 1 0; min-width: 130px; border: 1px solid #000; display: flex; flex-direction: column; background: white; overflow: hidden; }
.cpv2-single-box .cpv2-single-half { flex: 1 1 0; display: flex; flex-direction: column; }
.cpv2-single-box .cpv2-empty-half { flex: 1 1 0; }
.cpv2-bay-section { flex: 1 1 0; display: flex; flex-direction: column; padding: 2px 2px; min-height: 0; position: relative; }
.cpv2-trio-divider { border-top: 0.5px solid #999; }
.cpv2-bay-title-row { position: relative; width: 100%; text-align: center; font-weight: bold; font-size: clamp(10px, 0.85vw, 13px); padding: 0 50px 0 4px; margin-bottom: 1px; box-sizing: border-box; flex-shrink: 0; }
.cpv2-bay-title { display: inline-block; }
.cpv2-bay-count { position: absolute; right: 4px; top: 1px; color: #555; font-size: clamp(8px, 0.65vw, 10px); font-weight: normal; white-space: nowrap; }
.cpv2-bay-content { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; width: 100%; }
.cpv2-deck-area { flex: 6 1 0; display: flex; flex-direction: column; width: 100%; min-height: 0; }
.cpv2-hold-area { flex: 4 1 0; display: flex; flex-direction: column; width: 100%; min-height: 0; }
.cpv2-grid-row-wrap { display: flex; flex-direction: row; align-items: stretch; gap: 2px; flex: 1 1 0; min-height: 0; }
.cpv2-grid { display: flex; flex-direction: column; align-items: stretch; gap: 0; flex: 1 1 0; min-width: 0; }
.cpv2-tier-row { display: flex; gap: 0; flex: 1 1 0; min-height: 0; }
.cpv2-tier-row.cpv2-invisible-row { visibility: hidden; }
.cpv2-tier-row .cpv2-cell { flex: 1 1 0; min-width: 0; min-height: 0; border: 0.5px solid #555; box-sizing: border-box; background: #fff; font-size: clamp(7px, 0.9vw, 12px); display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: bold; color: #000; position: relative; overflow: hidden; }
.cpv2-tier-row .cpv2-cell-empty { flex: 1 1 0; min-width: 0; min-height: 0; visibility: hidden; }
.cpv2-row-labels { display: flex; flex: 0 0 auto; font-size: clamp(7px, 0.75vw, 10px); color: #444; gap: 0; margin: 1px 0; margin-right: 16px; }
.cpv2-row-labels > span { flex: 1 1 0; min-width: 0; text-align: center; line-height: 1.2; }
/* XRAY: 연노랑 배경 + ★ 별표 (V1 양식) */
.cpv2-cell.cpv2-xray { background: #fef08a !important; }
.cpv2-cell.cpv2-xray::after { content: '★'; position: absolute; top: -1px; right: 0px; font-size: clamp(6px, 0.8vw, 10px); color: #dc2626; font-weight: bold; pointer-events: none; }
.cpv2-cell.cpv2-mark-o { color: #000; }
.cpv2-cell.cpv2-mark-X { color: #000; background: #f0f0f0; }
.cpv2-cell.cpv2-mark-R { color: #006064; background: #b2ebf2; }
.cpv2-cell.cpv2-mark-r { color: #006064; background: #e0f7fa; }
.cpv2-cell.cpv2-mark-D { color: #b71c1c; background: #ffcdd2; }
.cpv2-cell.cpv2-mark-F { color: #1b5e20; background: #c8e6c9; }
.cpv2-cell.cpv2-mark-A { color: #4a148c; background: #e1bee7; }
.cpv2-cell.cpv2-mark-T { color: #e65100; background: #ffe0b2; }
.cpv2-cell.cpv2-mark-E { color: #555; background: #fafafa; }
.cpv2-cell.cpv2-mark-L { color: #1565c0; background: #bbdefb; }
.cpv2-cell.cpv2-mark-K { color: #0d47a1; background: #e3f2fd; }
.cpv2-cell.cpv2-mark-P { color: #6a1b9a; background: #f3e5f5; }
.cpv2-cell.cpv2-mark-S { color: #2e7d32; background: #e8f5e9; }
.cpv2-cell.cpv2-mark-M { color: #c62828; background: #ffebee; }
.cpv2-hatch-break { height: 0; border-top: 1.5px solid #000; width: 180px; margin: 0; flex-shrink: 0; }
.cpv2-tier-labels { display: flex; flex-direction: column; align-items: flex-start; font-size: 9px; color: #444; width: 16px; justify-content: center; }
.cpv2-tier-labels > span { height: 13px; line-height: 13px; display: block; }
.cpv2-tier-labels > span.cpv2-invisible-label { visibility: hidden; }
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
// ------------------------------------------------------------
function BayBoxV2({ data, count, colorMap = {} }) {
  if (!data) return null;
  const { bayKey, deckTiers, holdTiers, nHold, nDeckCols, nHoldCols, deckRowPos, holdRowPos, deckRows, holdRows } = data;
  return (
    <div className="cpv2-bay-section">
      <div className="cpv2-bay-title-row">
        <span className="cpv2-bay-title">BAY {bayKey}</span>
        {count != null && <span className="cpv2-bay-count">{count}</span>}
      </div>
      <div className="cpv2-bay-content">
        <div className="cpv2-deck-area">
          <div className="cpv2-row-labels">
            {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
          </div>
          <div className="cpv2-grid-row-wrap">
            <div className="cpv2-grid">
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
                    } else if (bg) {
                      style = { background: bg, color: '#fff' };
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
        {/* M6.93.12 fix #11: hold cells가 nDeckCols 폭으로 그려짐 (deck와 통일).
            cells 안에서 active 위치만 가운데 (offset). width 100%, margin 자동 제거.
            좌우 대칭 보장. */}
        <div className="cpv2-hatch-break"></div>
        <div className="cpv2-hold-area">
          <div
            className="cpv2-grid-row-wrap"
            style={{ width: '100%' }}
          >
            <div className="cpv2-grid">
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
                    } else if (bg) {
                      style = { background: bg, color: '#fff' };
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
            <div
              className="cpv2-row-labels"
              style={{
                // M6.93.12 fix #11: cells가 nDeckCols 폭이고 hold cells는 offset만큼 가운데.
                //   라벨도 offset에 맞춰 좌우 padding으로 정렬. cells active 위치 = 라벨 위치.
                paddingLeft: nDeckCols > nHoldCols ? `${Math.floor((nDeckCols - nHoldCols) / 2) / nDeckCols * 100}%` : '0',
                paddingRight: nDeckCols > nHoldCols ? `${Math.ceil((nDeckCols - nHoldCols) / 2) / nDeckCols * 100}%` : '0',
              }}
            >
              {holdRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
            </div>
          ) : (
            <div className="cpv2-row-labels" style={{ visibility: 'hidden' }}>
              {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
            </div>
          )}
        </div>
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
  const effVoyNo = voyNo || voyageInfo?.voy || '-';
  const effShipName = shipName || voyageInfo?.shipName || '';
  // 베이사전 + v5 매트릭스 로딩
  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const baseDict = getShipBayDictData(shipImo, shipName);
    if (!baseDict) return null;
    // M6.93.12 fix #4: source='user'면 enrichBayDef가 EDI 자동 채움 차단
    const enrichedEntry = enrichBayDef({ bayDef: baseDict.bayDef }, baseDict._v5Matrix, containers, baseDict.source);
    return { ...baseDict, bayDef: enrichedEntry.bayDef };
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
  const matchPodC = (c) => {
    if (mode === 'discharge') {
      return c.pod && String(c.pod).toUpperCase().includes('PTK');
    }
    return c.pol && String(c.pol).toUpperCase().includes('PTK');
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
      // POD (선적 모드에서 사용) - getContainerColorKey로 통일
      const p3 = getContainerColorKey(c, 'loading');
      if (p3) addTo(podCounts, p3, size);
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
      <style>{CSS}</style>
      {closeBtn}
      <div className="cpv2-page">
        <div className="cpv2-page-header">
          <div className="col">VOY NO : {effVoyNo}</div>
          <div className="title-center">{title}</div>
          <div className="col">DATE : {today}</div>
        </div>
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
            row.forEach((box, bi) => {
              if (box.type === 'trio') {
                const topData = renderDataMap[box.topKey];
                const pairData = renderDataMap[box.pairKey];
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-trio-box">
                    <BayBoxV2 data={topData} count={boxCounts[box.topKey]} colorMap={colorMap} />
                    <div className="cpv2-trio-divider"></div>
                    <BayBoxV2 data={pairData} count={boxCounts[box.pairKey]} colorMap={colorMap} />
                  </div>
                );
              } else {
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-single-box">
                    <div className="cpv2-single-half">
                      <BayBoxV2 data={renderDataMap[box.topKey]} count={boxCounts[box.topKey]} colorMap={colorMap} />
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
              markCell = <td className="cpv2-legend-mark" style={bg ? { background: bg, color: '#fff' } : undefined}>{bg ? '■' : ''}</td>;
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
