// 베이 상세 인쇄 컴포넌트 (M4.6 신규)
// PDF 형식: TNJP25323EBAY.pdf / TNJP25323WBAY.pdf와 동일 레이아웃
// - 베이당 1페이지
// - 각 셀에 4줄 정보:
//   line 1: POL/POD *via   (예: "PTK/ *LYG")
//   line 2: 컨테이너 번호    (예: "CKFU2190050")
//   line 3: 선사 F/E 중량 종류 (예: "C_K F27.2 20DC")
//   line 4: 위치 (BBBRRTT)  (예: "....050404")
// - 평택 대상은 강조 (POL/POD에 PTK 포함)

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';

export default function PrintableBayDetail({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, onClose
}) {
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

  const dictBayList = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const dict = getShipBayDictData(shipImo, shipName);
    if (!dict?.bayDef) return null;
    const list = dict.bayDef.bayList || (dict.bayDef.bays?.map(b => b.bayNo)) || null;
    if (!list || list.length < 2) return null;
    return list.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  }, [shipImo, shipName]);

  // 페이지 구성 (BayPlan과 동일 로직)
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
    const used = new Set();
    for (const n of bayInts) {
      if (n % 2 === 0) {
        const evenKey = keyBay(n);
        const evenDisp = dispBay(n);
        const leftIn = baySet.has(n - 1);
        const rightIn = baySet.has(n + 1);
        if (!leftIn && !rightIn) {
          out.push({ title: `BAY ${evenDisp}`, evenBay: null, oddBay: evenKey });
        } else if (rightIn) {
          out.push({ title: `BAY (${evenDisp})${dispBay(n + 1)}`, evenBay: evenKey, oddBay: keyBay(n + 1) });
          used.add(keyBay(n + 1));
        } else {
          out.push({ title: `BAY ${evenDisp}`, evenBay: evenKey, oddBay: null });
        }
      } else {
        const oddKey = keyBay(n);
        if (!used.has(oddKey)) {
          out.push({ title: `BAY ${dispBay(n)}`, evenBay: null, oddBay: oddKey });
        }
      }
    }
    // 빈 페이지(베이에 컨테이너 0대) 제거 — 상세 페이지에서는 의미 없음
    return out.filter(p => {
      const e = (p.evenBay && bayMap[p.evenBay]) || [];
      const o = (p.oddBay && bayMap[p.oddBay]) || [];
      return e.length + o.length > 0;
    });
  }, [bayMap, dictBayList]);

  // 컨테이너 정보 4줄 포맷
  const formatCellLines = (c) => {
    const pol = (c.pol || '').replace('KR', '').slice(0, 4) || '   ';
    const pod = (c.pod || '').replace('KR', '').slice(0, 4) || '   ';
    const via = c.via || '';
    const line1 = `${pol}/${via ? via : ' '}*${pod}`;
    const line2 = c.cn || '';
    const carrier = c.line || c.carrier || 'C_K';
    const fe = c.fe || (c.iso?.endsWith('0') ? 'E' : 'F');
    const wt = c.wt ? (parseFloat(c.wt) / 1000).toFixed(1) : '0.0';
    const isoLbl = isoToPdfLabel(c.iso) || '';
    const line3 = `${carrier} ${fe}${wt.padStart(5)} ${isoLbl}`;
    // 위치: BBBRRTT
    const bay = String(c.bay).padStart(3, '0').slice(-3);
    const row = String(c.row || '00').padStart(2, '0');
    const tier = String(c.tier || '00').padStart(2, '0');
    const line4 = `....${bay}${row}${tier}`;
    return { line1, line2, line3, line4 };
  };

  const isPtk = (c) => {
    const t = (mode === 'discharge' ? c.pod : c.pol || '').toUpperCase();
    return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
  };

  const vsl = voyageInfo?.vsl || shipName || 'VESSEL';
  const voy = voyageInfo?.voy_d || voyageInfo?.voy_l || voyageInfo?.voy || voyageKey || '';
  const portLabel = mode === 'discharge' ? 'POL : ' : 'POL : PTK';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="no-print flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
        <div className="text-base font-bold text-slate-100">📄 베이 상세 인쇄 미리보기 ({pages.length}페이지)</div>
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

      <div className="flex-1 overflow-auto bg-white">
        {pages.map((page, pageIdx) => {
          const containers = [
            ...(page.evenBay ? bayMap[page.evenBay] || [] : []),
            ...(page.oddBay ? bayMap[page.oddBay] || [] : []),
          ];
          // tier 그룹 → row 그룹 (PDF는 tier별 가로 행)
          const byTier = {};
          containers.forEach(c => {
            const t = String(c.tier || '00').padStart(2, '0');
            if (!byTier[t]) byTier[t] = [];
            byTier[t].push(c);
          });
          // 각 tier에서 row 정렬 (좌현 짝수 ↓, 00, 우현 홀수 ↑)
          const sortedTiers = Object.keys(byTier).sort((a, b) => parseInt(b) - parseInt(a));
          return (
            <div key={pageIdx} className="bay-detail-page">
              <div className="text-sm font-bold mb-1">{page.title}</div>
              <div className="text-xs mb-2">{vsl} VOY NO : {voy} {portLabel}</div>

              <div className="bay-detail-grid">
                {sortedTiers.map(tier => {
                  const list = byTier[tier].sort((a, b) => {
                    const ra = parseInt(a.row), rb = parseInt(b.row);
                    // 좌현(짝수) ↓ → 00 → 우현(홀수) ↑
                    const aOrd = ra === 0 ? 0 : (ra % 2 === 0 ? -ra : ra);
                    const bOrd = rb === 0 ? 0 : (rb % 2 === 0 ? -rb : rb);
                    return aOrd - bOrd;
                  });
                  return (
                    <div key={tier} className="bay-tier-row">
                      <span className="tier-label">{tier}</span>
                      {list.map(c => {
                        const lines = formatCellLines(c);
                        return (
                          <div key={c.cn} className={`bay-detail-cell ${isPtk(c) ? 'ptk' : ''}`}>
                            <div className="line1">{lines.line1}</div>
                            <div className="line2">{lines.line2}</div>
                            <div className="line3">{lines.line3}</div>
                            <div className="line4">{lines.line4}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .bay-detail-page { page-break-after: always; padding: 0.4cm; }
          @page { size: A4 portrait; margin: 0.4cm; }
        }
        .bay-detail-page {
          color: black; background: white;
          font-family: 'Courier New', monospace;
          padding: 8px 12px;
          border-bottom: 2px dashed #ccc;
          page-break-after: always;
        }
        .bay-detail-grid {
          display: flex; flex-direction: column; gap: 2px;
        }
        .bay-tier-row {
          display: flex; align-items: stretch; gap: 1px;
        }
        .tier-label {
          font-size: 7pt; font-weight: bold;
          width: 16px; text-align: center; padding-top: 4px;
          border-right: 1px solid #999;
        }
        .bay-detail-cell {
          border: 1px solid #999;
          padding: 1px 2px;
          width: 65px;
          font-size: 5.5pt;
          line-height: 1.1;
        }
        .bay-detail-cell.ptk {
          background: #fef3c7;
          border-color: #f59e0b;
        }
        .line1 { font-weight: bold; }
        .line2 { font-family: 'Courier New', monospace; }
        .line3 { font-size: 5pt; }
        .line4 { font-size: 5pt; color: #666; }
      `}</style>
    </div>
  );
}
