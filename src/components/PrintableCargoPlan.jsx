// 카고 플랜 인쇄 컴포넌트 (M4.6 신규)
// PDF 형식: TNJP25323E.pdf / TNJP25323W.pdf와 동일 레이아웃
// - A4 1페이지에 모든 베이를 격자로 표시
// - X = 일반/통과 화물 (POD/POL 평택 아님)
// - o = 양하 대상 (POD=PTK)
// - L = 선적 대상 (POL=PTK)
// - 비어있음 = 화물 없음
// - 각 베이 헤더: 베이 번호 + 평택 카운트 (20'/40'/45')

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';

export default function PrintableCargoPlan({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, onClose
}) {
  // 평택 대상 식별
  const isPtk = (c) => {
    const target = mode === 'discharge' ? (c.pod || '') : (c.pol || '');
    const t = target.toUpperCase();
    return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
  };

  // 베이 그룹 (컨테이너 → 베이별 분류)
  const bayMap = useMemo(() => {
    const m = {};
    containers.forEach(c => {
      if (!c.bay) return;
      const k = normalizeBay(c.bay);
      if (!k) return;
      if (!m[k]) m[k] = [];
      m[k].push(c);
    });
    return m;
  }, [containers]);

  // .def 사전 베이 리스트 (없으면 EDI 기반 폴백)
  const dictBayList = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const dict = getShipBayDictData(shipImo, shipName);
    if (!dict?.bayDef) return null;
    const list = dict.bayDef.bayList || (dict.bayDef.bays?.map(b => b.bayNo)) || null;
    if (!list || list.length < 2) return null;
    return list.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  }, [shipImo, shipName]);

  // 페이지 구성 (BayPlan.jsx와 동일 로직)
  const pages = useMemo(() => {
    const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
    const keyBay = (n) => String(n);

    let bayInts;
    if (dictBayList && dictBayList.length > 0) {
      bayInts = [...dictBayList];
    } else {
      const bays = Object.keys(bayMap);
      bayInts = bays.map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    }
    if (bayInts.length === 0) return [];

    const baySet = new Set(bayInts);
    const out = [];
    const usedOddBays = new Set();
    for (const n of bayInts) {
      if (n % 2 === 0) {
        const evenKey = keyBay(n);
        const evenDisp = dispBay(n);
        const leftIn = baySet.has(n - 1);
        const rightIn = baySet.has(n + 1);
        if (!leftIn && !rightIn) {
          out.push({ title: `BAY ${evenDisp}`, label: `${evenDisp}`, evenBay: null, oddBay: evenKey, kind: '20only' });
        } else if (rightIn) {
          out.push({ title: `BAY (${evenDisp})${dispBay(n + 1)}`, label: `(${evenDisp})${dispBay(n + 1)}`,
                     evenBay: evenKey, oddBay: keyBay(n + 1), kind: 'pair' });
          usedOddBays.add(keyBay(n + 1));
        } else {
          out.push({ title: `BAY ${evenDisp}`, label: `${evenDisp}`, evenBay: evenKey, oddBay: null, kind: '40only' });
        }
      } else {
        const oddKey = keyBay(n);
        if (!usedOddBays.has(oddKey)) {
          out.push({ title: `BAY ${dispBay(n)}`, label: `${dispBay(n)}`, evenBay: null, oddBay: oddKey, kind: 'single' });
        }
      }
    }
    return out;
  }, [bayMap, dictBayList]);

  // 전역 row/tier 풀
  const globalRows = useMemo(() => {
    const s = new Set(['00']);
    containers.forEach(c => { if (c.row) s.add(String(c.row).padStart(2, '0')); });
    return Array.from(s);
  }, [containers]);

  const globalTiers = useMemo(() => {
    const s = new Set();
    containers.forEach(c => { if (c.tier) s.add(String(c.tier).padStart(2, '0')); });
    return Array.from(s);
  }, [containers]);

  // ROW 정렬: 좌현 짝수 ↓, 00 중앙, 우현 홀수 ↑
  const sortedRows = useMemo(() => {
    const all = globalRows.map(r => parseInt(r));
    const lefts = all.filter(n => n > 0 && n % 2 === 0).sort((a, b) => b - a);
    const rights = all.filter(n => n > 0 && n % 2 === 1).sort((a, b) => a - b);
    const result = [...lefts, 0, ...rights];
    return result.map(n => String(n).padStart(2, '0'));
  }, [globalRows]);

  // TIER 정렬: 갑판 위 (큰 짝수, 80+) → 해치커버 → 홀드 (작은 짝수)
  const sortedTiers = useMemo(() => {
    const all = globalTiers.map(t => parseInt(t)).filter(n => !isNaN(n));
    const deck = all.filter(n => n >= 80).sort((a, b) => b - a); // 큰 것이 위
    const hold = all.filter(n => n < 80).sort((a, b) => b - a);  // 큰 것이 위 (홀드 천장이 위)
    return [...deck, ...hold].map(n => String(n).padStart(2, '0'));
  }, [globalTiers]);

  const isHatchBoundary = (tierIdx) => {
    if (tierIdx === 0) return false;
    const cur = parseInt(sortedTiers[tierIdx]);
    const prev = parseInt(sortedTiers[tierIdx - 1]);
    return prev >= 80 && cur < 80;
  };

  // 한 셀 마크 결정
  const getCellMark = (page, row, tier) => {
    // 베이 우선순위: even 우선 (40ft가 슬롯 차지), 그 다음 odd
    const candidates = [];
    if (page.evenBay) {
      const list = bayMap[page.evenBay] || [];
      list.forEach(c => {
        if (String(c.row).padStart(2, '0') === row && String(c.tier).padStart(2, '0') === tier) {
          candidates.push({ c, isEven: true });
        }
      });
    }
    if (page.oddBay && candidates.length === 0) {
      const list = bayMap[page.oddBay] || [];
      list.forEach(c => {
        if (String(c.row).padStart(2, '0') === row && String(c.tier).padStart(2, '0') === tier) {
          candidates.push({ c, isEven: false });
        }
      });
    }
    if (candidates.length === 0) return '';
    const c = candidates[0].c;
    if (mode === 'discharge') {
      return isPtk(c) ? 'o' : 'X';
    } else {
      return isPtk(c) ? 'L' : 'X';
    }
  };

  // 베이별 평택 카운트 (20'/40'/45')
  const bayCounts = (page) => {
    let c20 = 0, c40 = 0, c45 = 0;
    const acc = (cn) => {
      if (!cn) return;
      const list = bayMap[cn] || [];
      list.forEach(c => {
        if (!isPtk(c)) return;
        const lbl = (isoToPdfLabel(c.iso) || '').toUpperCase();
        if (lbl.includes('45')) c45++;
        else if (lbl.includes('40')) c40++;
        else c20++;
      });
    };
    acc(page.evenBay); acc(page.oddBay);
    return { c20, c40, c45 };
  };

  // 전체 카운트
  const totalCounts = useMemo(() => {
    let c20 = 0, c40 = 0, c45 = 0;
    containers.forEach(c => {
      if (!isPtk(c)) return;
      const lbl = (isoToPdfLabel(c.iso) || '').toUpperCase();
      if (lbl.includes('45')) c45++;
      else if (lbl.includes('40')) c40++;
      else c20++;
    });
    return { c20, c40, c45 };
  }, [containers]);

  const titleText = mode === 'discharge' ? 'CARGO DISCHARGING PLAN' : 'STOWAGE INSTRUCTION';
  const portText = mode === 'discharge' ? 'POD : PTK' : 'POL : PTK';
  const todayStr = new Date().toISOString().slice(0, 10);
  const vsl = voyageInfo?.vsl || shipName || 'VESSEL';
  const voy = voyageInfo?.voy_d || voyageInfo?.voy_l || voyageInfo?.voy || voyageKey || '';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* 화면 컨트롤 (인쇄 시 숨김) */}
      <div className="no-print flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
        <div className="text-base font-bold text-slate-100">📄 카고 플랜 인쇄 미리보기</div>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-sm">
            🖨️ 인쇄 / PDF 저장
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded">
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="cargo-plan-page p-4 mx-auto" style={{ maxWidth: '1100px' }}>
          {/* 헤더 */}
          <div className="text-center mb-2">
            <div className="text-base font-bold">{titleText}</div>
            <div className="text-xs">
              {vsl} VOY NO : {voy} {portText} DATE : {todayStr}
            </div>
          </div>

          {/* 베이 격자 — 한 줄에 5~6개씩 자동 wrap */}
          <div className="bay-grid">
            {pages.map((page, idx) => {
              const counts = bayCounts(page);
              const totalForBay = counts.c20 + counts.c40 + counts.c45;
              return (
                <div key={idx} className="bay-box">
                  <div className="bay-cells">
                    {sortedTiers.map((tier, ti) => (
                      <div key={tier} className={`bay-row ${isHatchBoundary(ti) ? 'hatch' : ''}`}>
                        {sortedRows.map(row => {
                          const mark = getCellMark(page, row, tier);
                          return (
                            <span key={row} className={`bay-cell mark-${mark || 'empty'}`}>
                              {mark}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                    {/* row 라벨 (밑) */}
                    <div className="bay-row-labels">
                      {sortedRows.map(r => (
                        <span key={r} className="bay-cell row-label">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bay-title">
                    BAY {page.label} {totalForBay > 0
                      ? `${counts.c20} / ${counts.c40} / ${counts.c45}`
                      : '0'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 합계 */}
          <div className="text-xs text-right mt-2 pr-2">
            20' / 40' / 45'<br />
            {mode === 'discharge' ? 'o = 양하 대상' : 'L = 선적 대상'} ·
            X = 통과 화물 ·
            <strong> 합계: {totalCounts.c20} / {totalCounts.c40} / {totalCounts.c45}</strong>
          </div>
        </div>
      </div>

      {/* 인쇄 CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .cargo-plan-page {
            margin: 0; padding: 0.4cm;
            color: black; background: white;
            font-family: 'Courier New', monospace;
          }
          @page { size: A4 landscape; margin: 0.4cm; }
        }
        .cargo-plan-page {
          color: black; background: white;
          font-family: 'Courier New', monospace;
          font-size: 7pt;
        }
        .bay-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
        }
        .bay-box {
          border: 1px solid #ccc;
          padding: 2px;
          page-break-inside: avoid;
        }
        .bay-title {
          text-align: center;
          font-weight: bold;
          font-size: 7pt;
          margin-top: 2px;
          border-top: 1px solid #999;
          padding-top: 1px;
        }
        .bay-row {
          display: flex;
          justify-content: center;
          gap: 0px;
          line-height: 1;
        }
        .bay-row.hatch {
          border-top: 2px solid #444;
          margin-top: 1px;
          padding-top: 1px;
        }
        .bay-row-labels {
          border-top: 1px solid #999;
          padding-top: 1px;
          display: flex;
          justify-content: center;
        }
        .bay-cell {
          display: inline-block;
          width: 11px;
          text-align: center;
          font-size: 6pt;
          font-weight: bold;
        }
        .bay-cell.row-label {
          font-size: 5pt;
          color: #666;
          font-weight: normal;
        }
        .mark-X { color: #555; }
        .mark-o { color: #d97706; }
        .mark-L { color: #1e40af; }
        .mark-empty { color: transparent; }
      `}</style>
    </div>
  );
}
