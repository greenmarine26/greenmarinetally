// ============================================================
// PrintableCargoPlanV2 — M6.81 Universal 알고리즘 정확 포팅 (M6.86.8)
// ============================================================
// M6.86.5~M6.86.7 회귀 (globalRowRange 페이지 통일, STD baseline 폐기 등) 폐기.
// M6.81 Python 검증 알고리즘 (cargoPlanCore.js) 그대로 사용.
//
// 보존: 검수앱 고유 마크 (AWK='A', OOG='A', Empty='E', Reefer 빈='r'), POD 컬러
// 미통합 (다음 패치 예정): 선사별 별첨, 화물 종류별 별첨, 선적 모드 POD 컬러 매핑
// ============================================================
import React, { useMemo } from 'react';
import { getShipBayDictData } from '../shipStructure.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';
import { isReeferContainer } from '../utils.js';
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
// 검수앱 고유 마크 함수 (M6.81 7기본 + AWK/OOG/Empty/Reefer-Empty 확장)
// ------------------------------------------------------------
function getMarkV2(c, pod, mode) {
  const ptk =
    mode === 'discharge'
      ? c.pod && String(c.pod).toUpperCase().includes('PTK')
      : c.pol && String(c.pol).toUpperCase().includes('PTK');

  if (mode === 'discharge') {
    if (!ptk) return 'X'; // 통과
    if (c.dg) return 'D';
    if (isReeferContainer(c)) return c.fe === 'E' ? 'r' : 'R';
    if (c.fr) return 'F';
    if (c.tk) return 'T';
    if (c.ot || c.oog) return 'A'; // OT/OOG = Awkward
    if (c.fe === 'E') return 'E';
    return 'o';
  }

  // loading 모드 — POD 첫 글자 (KAN=K, PUS=P, SGN=S, MIP=M)
  if (!ptk) return 'X';
  if (c.dg) return 'D';
  if (isReeferContainer(c)) return 'R';
  const podUp = c.pod ? String(c.pod).toUpperCase() : '';
  if (podUp.length >= 3) return podUp.slice(2, 3); // 5자리(KRKAN)→3번째(K), 3자리(KAN)→첫글자
  return 'L';
}

// ------------------------------------------------------------
// CSS (M6.81 HTML 그대로 — 셀 18×13px, tier-row 13px, cell-empty visibility:hidden)
// ------------------------------------------------------------
const CSS = `
.cpv2-overlay { position: fixed; inset: 0; z-index: 50; background: #475569; overflow: auto; padding: 8px; display: flex; align-items: stretch; justify-content: center; }
.cpv2-page { width: 277mm; height: calc(100vh - 16px); min-height: 195mm; background: white; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; font-family: Helvetica, Arial, sans-serif; color: #000; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
.cpv2-page-header { border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; }
.cpv2-page-header .title-center { font-size: 14px; font-weight: bold; flex: 1; text-align: center; }
.cpv2-page-header .col { padding: 0 8px; font-size: 9px; }
.cpv2-page-rows { display: flex; flex-direction: column; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-page-row { display: flex; flex-direction: row; flex: 1 1 0; gap: 3px; min-height: 0; }
.cpv2-bay-box { flex: 1 1 0; min-width: 0; width: 0; border: 1px solid #000; display: flex; flex-direction: column; background: white; overflow: hidden; }
.cpv2-single-box .cpv2-single-half { flex: 1 1 0; display: flex; flex-direction: column; }
.cpv2-single-box .cpv2-empty-half { flex: 1 1 0; }
.cpv2-bay-section { flex: 1 1 0; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 4px 3px; min-height: 0; position: relative; }
.cpv2-trio-divider { border-top: 0.5px solid #999; }
.cpv2-bay-title-row { position: relative; width: 100%; text-align: center; font-weight: bold; font-size: 11px; padding: 0 60px 0 6px; margin-bottom: 2px; box-sizing: border-box; flex-shrink: 0; }
.cpv2-bay-title { display: inline-block; }
.cpv2-bay-count { position: absolute; right: 4px; top: 1px; color: #555; font-size: 8px; font-weight: normal; white-space: nowrap; }
.cpv2-bay-content { display: flex; flex-direction: column; align-items: center; flex: 1; width: 100%; }
.cpv2-deck-area { flex: 6 1 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 100%; min-height: 0; }
.cpv2-hold-area { flex: 4 1 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; min-height: 0; }
.cpv2-row-labels { display: flex; justify-content: center; font-size: 7px; color: #444; gap: 0; margin: 1px 0; margin-right: 16px; }
.cpv2-row-labels > span { flex: 0 0 18px; width: 18px; text-align: center; line-height: 1.2; }
.cpv2-grid-row-wrap { display: flex; flex-direction: row; align-items: stretch; gap: 2px; }
.cpv2-grid { display: flex; flex-direction: column; align-items: center; gap: 0; }
.cpv2-tier-row { display: flex; gap: 0; height: 13px; justify-content: center; }
.cpv2-tier-row.cpv2-invisible-row { visibility: hidden; }
.cpv2-tier-row .cpv2-cell { flex: 0 0 18px; width: 18px; height: 13px; border: 0.5px solid #555; box-sizing: border-box; background: #fff; font-size: 8px; display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: bold; color: #000; }
.cpv2-tier-row .cpv2-cell-empty { flex: 0 0 18px; width: 18px; height: 13px; visibility: hidden; }
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
.cpv2-tier-labels { display: flex; flex-direction: column; align-items: flex-start; font-size: 7px; color: #444; width: 14px; justify-content: center; }
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
  .cpv2-overlay { position: static; background: white; padding: 0; overflow: visible; }
  .cpv2-page { box-shadow: none; margin: 0; }
  .cpv2-noprint { display: none !important; }
  @page { size: A4 landscape; margin: 6mm; }
}
`;

// ------------------------------------------------------------
// BayBox 단일 베이 렌더
// ------------------------------------------------------------
function BayBoxV2({ data, count }) {
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
          <div className="cpv2-row-labels" style={{ width: `${nDeckCols * 18}px` }}>
            {deckRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
          </div>
          <div className="cpv2-grid-row-wrap">
            <div className="cpv2-grid">
              {deckRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) =>
                    cell.active ? (
                      <span key={ci} className={`cpv2-cell${cell.mark ? ` cpv2-mark-${cell.mark}` : ''}`}>
                        {cell.mark || ''}
                      </span>
                    ) : (
                      <span key={ci} className="cpv2-cell-empty"></span>
                    )
                  )}
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
        {/* M6.86.8.3 fix: hold-area는 항상 그림. nHold=0이어도 holdRows가 invisible-row로 자리 차지.
            M6.81 정답: hold 없는 베이도 hatch-break + hold-area 그려서 박스 높이 통일. */}
        <div className="cpv2-hatch-break"></div>
        <div className="cpv2-hold-area">
          <div className="cpv2-grid-row-wrap">
            <div className="cpv2-grid">
              {holdRows.map((row, ri) => (
                <div key={ri} className={`cpv2-tier-row${row.invisible ? ' cpv2-invisible-row' : ''}`}>
                  {row.cells.map((cell, ci) =>
                    cell.active ? (
                      <span key={ci} className={`cpv2-cell${cell.mark ? ` cpv2-mark-${cell.mark}` : ''}`}>
                        {cell.mark || ''}
                      </span>
                    ) : (
                      <span key={ci} className="cpv2-cell-empty"></span>
                    )
                  )}
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
            <div className="cpv2-row-labels" style={{ width: `${nHoldCols * 18}px` }}>
              {holdRowPos.map((rl, i) => <span key={i}>{rl}</span>)}
            </div>
          ) : (
            <div className="cpv2-row-labels" style={{ width: `${nDeckCols * 18}px`, visibility: 'hidden' }}>
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
    const enrichedEntry = enrichBayDef({ bayDef: baseDict.bayDef }, baseDict._v5Matrix, containers);
    return { ...baseDict, bayDef: enrichedEntry.bayDef };
  }, [shipImo, shipName, containers]);

  const matrixBays = useMemo(() => {
    const raw = dictData?._v5Matrix?.matrixBays || [];
    if (raw.length === 0) return raw;
    // M6.86.8.5: EDI 기반 hasHold 자동 추론
    //   v5 매트릭스가 hasHold=false라도 EDI에 tier<80 컨테이너 있으면 hold 있다고 처리.
    //   검수앱 enrichBayDef의 L4 fallback과 동일 원칙.
    const ediTiersByBay = new Map();
    for (const c of containers) {
      const b = Number(c.bay);
      const t = Number(c.tier);
      if (!Number.isFinite(b) || !Number.isFinite(t)) continue;
      if (!ediTiersByBay.has(b)) ediTiersByBay.set(b, new Set());
      ediTiersByBay.get(b).add(t);
    }
    return raw.map((b) => {
      const tiers = ediTiersByBay.get(b.bayNum);
      if (!tiers) return b;
      const hasHoldFromEdi = [...tiers].some((t) => t < 80);
      if (b.hasHold || !hasHoldFromEdi) return b;
      return { ...b, hasHold: true };
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
  const sizeOfC = (c) => {
    const lbl = String(c.isoLabel || c.iso || '').toUpperCase();
    if (lbl.startsWith('45') || /^4[5][A-Z0-9]{2}$/.test(lbl)) return '45';
    if (lbl.startsWith('40') || /^4[0-9][A-Z0-9]{2}$/.test(lbl)) return '40';
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

  // M6.86.8.6: 선사별 / 화물종류별 카운트 (M6.81 정답 별첨1·2)
  const legends = useMemo(() => {
    const carrierCounts = new Map();
    const cargoCounts = new Map();
    const addTo = (map, key, size) => {
      if (!map.has(key)) map.set(key, { '20': 0, '40': 0, '45': 0, total: 0 });
      const e = map.get(key);
      e[size]++;
      e.total++;
    };
    for (const c of containers) {
      if (!matchPodC(c)) continue;
      const size = sizeOfC(c);
      // M6.86.8.7: 선사 = c.op (NAD+CA 파싱 결과, 평택항 선사 10개 초반)
      //   주의: c.cn 첫 3자는 BIC 코드(컨테이너 소유사)이지 선사가 아님 — 절대 사용 금지
      const carrier = (c.op && String(c.op).trim()) || 'UNK';
      addTo(carrierCounts, carrier, size);
      let cat = '일반';
      if (c.dg) cat = 'DG';
      else if (c.iso && c.iso[2] === 'R') cat = 'Reefer';
      else if (c.fr || (c.iso && c.iso[2] === 'P')) cat = 'FR';
      else if (c.ot || c.oog || (c.iso && c.iso[2] === 'U')) cat = 'OT';
      else if (c.tk || (c.iso && c.iso[2] === 'T')) cat = 'Tank';
      addTo(cargoCounts, cat, size);
    }
    const carriers = [...carrierCounts.entries()].sort((a, b) => b[1].total - a[1].total);
    const cargos = [...cargoCounts.entries()].sort((a, b) => {
      if (a[0] === '일반') return -1;
      if (b[0] === '일반') return 1;
      return b[1].total - a[1].total;
    });
    return { carriers, cargos };
  }, [containers, pod]);

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
      map[key] = computeBayRenderData(key, pdfBays, matrixBays, posMap, pod, (c, p) => getMarkV2(c, p, mode));
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

  return (
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
            const emptySlots = isLast && !isFirst ? Math.max(0, 5 - row.length) : 0;
            const slots = [];
            // 마지막 row 좌측 빈 자리에 별첨1·2 배치 (M6.81 정답)
            if (emptySlots >= 1) {
              slots.push(
                <div key="leg1" className="cpv2-bay-box cpv2-legend-box">
                  <Legend title="별첨1 · 선사별 (양하)" headers={['선사', "20'", "40'", "45'", '합계']} rows={legends.carriers} totalRow={true} kind="carrier" />
                </div>
              );
            }
            if (emptySlots >= 2) {
              slots.push(
                <div key="leg2" className="cpv2-bay-box cpv2-legend-box">
                  <Legend title="별첨2 · 화물 종류별 (양하)" headers={['', '종류', "20'", "40'", "45'", '합계']} rows={legends.cargos} totalRow={true} kind="cargo" />
                </div>
              );
            }
            for (let i = 2; i < emptySlots; i++) {
              slots.push(<div key={`pad-${i}`} className="cpv2-bay-box cpv2-empty-slot"></div>);
            }
            // 그 다음 실제 박스들
            row.forEach((box, bi) => {
              if (box.type === 'trio') {
                const topData = renderDataMap[box.topKey];
                const pairData = renderDataMap[box.pairKey];
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-trio-box">
                    <BayBoxV2 data={topData} count={boxCounts[box.topKey]} />
                    <div className="cpv2-trio-divider"></div>
                    <BayBoxV2 data={pairData} count={boxCounts[box.pairKey]} />
                  </div>
                );
              } else {
                slots.push(
                  <div key={`box-${bi}`} className="cpv2-bay-box cpv2-single-box">
                    <div className="cpv2-single-half">
                      <BayBoxV2 data={renderDataMap[box.topKey]} count={boxCounts[box.topKey]} />
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
    </div>
  );
}

// 별첨 렌더링 (선사별 / 화물 종류별)
function Legend({ title, headers, rows, totalRow, kind }) {
  const cargoColors = {
    '일반': { bg: '#fff', fg: '#000', mark: 'o' },
    'Reefer': { bg: '#b2ebf2', fg: '#006064', mark: 'R' },
    'DG': { bg: '#ffcdd2', fg: '#b71c1c', mark: 'D' },
    'FR': { bg: '#c8e6c9', fg: '#1b5e20', mark: 'F' },
    'OT': { bg: '#e1bee7', fg: '#4a148c', mark: 'A' },
    'Tank': { bg: '#ffe0b2', fg: '#e65100', mark: 'T' },
  };
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
            const c = kind === 'cargo' ? (cargoColors[name] || cargoColors['일반']) : null;
            return (
              <tr key={name}>
                {kind === 'cargo' && (
                  <td className="cpv2-legend-mark" style={{ background: c.bg, color: c.fg }}>{c.mark}</td>
                )}
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
              {kind === 'cargo' && <td></td>}
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
