// 베이 상세 인쇄 (M4.8) — 샘플 PDF 1:1 재현
// PCSG2616Wbay.pdf 형식
//
// M4.8 변경:
//   - A4 가로(landscape) 모드로 전환
//   - 베이 지정 = 다중 선택 (체크박스)
//   - 옵션 라벨에 컨테이너 수 표시 → 빈 베이 식별 가능
//   - 빈 베이는 회색 비활성, PTK 있는 베이는 노란 테두리
//
// 출력 모드 3종:
//   * 전체 일괄 (all): 컨테이너 있는 모든 베이
//   * 평택분만 (ptk): PTK 컨테이너 있는 베이만
//   * 베이 지정 (multi): 체크박스로 1~N개 베이 선택

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';

const STD_ROWS = ['06', '04', '02', '00', '01', '03', '05'];
const STD_DECK = ['88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

const isPtk = (c, mode) => {
  const t = ((mode === 'discharge' ? c.pod : c.pol) || '').toUpperCase();
  return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
};

function groupByBay(containers) {
  const m = {};
  containers.forEach(c => {
    if (!c.bay) return;
    const k = normalizeBay(c.bay);
    if (k) (m[k] = m[k] || []).push(c);
  });
  return m;
}

function buildBayPages(bays) {
  const baySet = new Set(bays);
  const used = new Set();
  const pages = [];
  for (const n of bays) {
    if (n % 2 === 0) {
      const leftIn = baySet.has(n - 1);
      const rightIn = baySet.has(n + 1);
      if (rightIn) {
        pages.push({ even: n, odd: n + 1, key: `${n}-${n+1}` });
        used.add(n + 1);
      } else if (!leftIn) {
        pages.push({ even: null, odd: n, key: `${n}` });
      } else {
        pages.push({ even: n, odd: null, key: `${n}` });
      }
    }
  }
  for (const n of bays) {
    if (n % 2 === 1 && !used.has(n)) {
      pages.push({ even: null, odd: n, key: `${n}` });
    }
  }
  pages.sort((a, b) => (a.even || a.odd) - (b.even || b.odd));
  return pages;
}

function formatCellLines(c, mode) {
  const pol = (c.pol || '').replace(/^KR/, '').slice(0, 3) || '   ';
  const pod = (c.pod || '').replace(/^KR/, '').slice(0, 3) || '   ';
  const via = c.via || '';
  // M4.8: 모드별 line 1 순서 (PCSG2616W 샘플 기준)
  //   - load (선적/SI): [POD]/ *[POL]   예) "DLC/ *PTK"
  //   - discharge (양하): [POL]/ *[POD] 예) "LYG/ *PTK"
  let line1;
  const left = mode === 'discharge' ? pol : pod;
  const right = mode === 'discharge' ? pod : pol;
  if (left === right) {
    line1 = `${left}/${right}*${via || ' '}`;
  } else {
    line1 = `${left}/${' '}*${via || right}`;
  }
  const line2 = c.cn || '';
  const carrierRaw = (c.line || c.carrier || '').toUpperCase();
  let carrier = carrierRaw || 'C_K';
  if (carrierRaw === 'CKL' || carrierRaw === 'CK') carrier = 'C_K';
  else if (carrierRaw === 'SOC' || carrierRaw.includes('SOC')) carrier = 'SOC';
  else if (carrierRaw === 'SKR' || carrierRaw.includes('SKR') || carrierRaw.includes('SINOKOR')) carrier = 'SKR';
  else if (carrierRaw) carrier = carrierRaw.slice(0, 3);

  const fe = c.fe || (c.iso?.endsWith('0') ? 'E' : 'F');
  const wt = c.wt ? (parseFloat(c.wt) / 1000).toFixed(1) : '0.0';
  const isoLbl = isoToPdfLabel(c.iso) || '';
  const line3 = `${carrier} ${fe}${wt.padStart(5)} ${isoLbl}`;
  const line4 = c.imdg ? ` ${c.imdg}` : '';
  const bay = String(c.bay).padStart(3, '0').slice(-3);
  const row = String(c.row || '00').padStart(2, '0');
  const tier = String(c.tier || '00').padStart(2, '0');
  const lineLast = `....${bay}${row}${tier}`;
  return { line1, line2, line3, line4, lineLast };
}

function BayDetailPage({ even, odd, bayMap, mode, voyageInfo, voyageKey, shipName, dictBay }) {
  const allConts = [
    ...((even != null && bayMap[String(even)]) || []),
    ...((odd != null && bayMap[String(odd)]) || []),
  ];

  const cellMap = {};
  allConts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row || '00').padStart(2, '0');
    cellMap[`${t}-${r}`] = c;
  });

  const allTiers = new Set();
  allConts.forEach(c => allTiers.add(String(c.tier).padStart(2, '0')));
  const deckTiers = [...new Set([...STD_DECK, ...[...allTiers].filter(t => parseInt(t) >= 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = [...new Set([...STD_HOLD, ...[...allTiers].filter(t => parseInt(t) < 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));

  const hasHold = dictBay ? dictBay.hasHold !== false : allConts.some(c => parseInt(c.tier) < 80);
  const hasDeck = dictBay ? dictBay.hasDeck !== false : true;

  const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  let title;
  if (even != null && odd != null) title = `BAY(${dispBay(even)})${dispBay(odd)}`;
  else if (even != null) title = `BAY${dispBay(even)}`;
  else title = `BAY${dispBay(odd)}`;

  const portLabel = mode === 'discharge' ? 'POD : PTK' : 'POL : PTK';

  const renderCell = (t, r) => {
    const c = cellMap[`${t}-${r}`];
    if (!c) return <div key={`${t}-${r}`} className="bd-cell empty"></div>;
    const lines = formatCellLines(c, mode);
    return (
      <div key={`${t}-${r}`} className={`bd-cell filled ${isPtk(c, mode) ? 'ptk' : ''}`}>
        <div>{lines.line1}</div>
        <div>{lines.line2}</div>
        <div>{lines.line3}</div>
        {lines.line4 && <div>{lines.line4}</div>}
        <div className="bd-pos">{lines.lineLast}</div>
      </div>
    );
  };

  return (
    <div className="bd-page">
      <div className="bd-title">{title}</div>
      <div className="bd-header">
        <span>{voyageInfo?.vsl || shipName || ''}</span>
        <span>VOY NO : {voyageInfo?.voy_d || voyageInfo?.voy_l || voyageKey || ''}</span>
        <span>{portLabel}</span>
      </div>

      <div className="bd-row-labels-top">
        {STD_ROWS.map(r => <span key={r} className="bd-rl">{r}</span>)}
      </div>

      <div className="bd-grid-wrap">
        <div className="bd-grid">
          {hasDeck && deckTiers.map(t => (
            <div key={t} className="bd-tier-row">
              {STD_ROWS.map(r => renderCell(t, r))}
            </div>
          ))}
          {hasDeck && hasHold && <div className="bd-hatch"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bd-tier-row">
              {STD_ROWS.map(r => renderCell(t, r))}
            </div>
          ))}
        </div>
        <div className="bd-tier-labels">
          {hasDeck && deckTiers.map(t => <span key={t}>{t}</span>)}
          {hasDeck && hasHold && <span className="bd-tier-gap"></span>}
          {hasHold && holdTiers.map(t => <span key={t}>{t}</span>)}
        </div>
      </div>

      <div className="bd-row-labels-bot">
        {STD_ROWS.map(r => <span key={r} className="bd-rl">{r}</span>)}
      </div>
    </div>
  );
}

export default function PrintableBayDetail({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, onClose
}) {
  const [printMode, setPrintMode] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const bayMap = useMemo(() => groupByBay(containers), [containers]);

  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    return getShipBayDictData(shipImo, shipName);
  }, [shipImo, shipName]);

  const dictBayList = useMemo(() => {
    if (!dictData?.bayDef?.bayList) return null;
    return dictData.bayDef.bayList.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n));
  }, [dictData]);

  const dictBaysSummary = useMemo(() => {
    if (!dictData?.bayDef?.baysSummary) return {};
    const m = {};
    dictData.bayDef.baysSummary.forEach(b => { m[parseInt(b.bayNo, 10)] = b; });
    return m;
  }, [dictData]);

  const bayList = useMemo(() => {
    if (dictBayList && dictBayList.length > 0) return [...dictBayList].sort((a, b) => a - b);
    return Object.keys(bayMap).map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  }, [dictBayList, bayMap]);

  const allPages = useMemo(() => buildBayPages(bayList), [bayList]);

  // M4.8: 페이지별 컨테이너 수 / PTK 수 / 라벨 미리 계산
  const pagesWithMeta = useMemo(() => {
    return allPages.map(p => {
      const conts = [
        ...((p.even != null && bayMap[String(p.even)]) || []),
        ...((p.odd != null && bayMap[String(p.odd)]) || []),
      ];
      const ptkCnt = conts.filter(c => isPtk(c, mode)).length;
      const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
      let label;
      if (p.even != null && p.odd != null) label = `BAY(${dispBay(p.even)})${dispBay(p.odd)}`;
      else if (p.even != null) label = `BAY${dispBay(p.even)}`;
      else label = `BAY${dispBay(p.odd)}`;
      return { ...p, total: conts.length, ptk: ptkCnt, label };
    });
  }, [allPages, bayMap, mode]);

  const filteredPages = useMemo(() => {
    if (printMode === 'all') {
      return pagesWithMeta.filter(p => p.total > 0);
    }
    if (printMode === 'ptk') {
      return pagesWithMeta.filter(p => p.ptk > 0);
    }
    if (printMode === 'multi') {
      return pagesWithMeta.filter(p => selectedKeys.has(p.key));
    }
    return [];
  }, [pagesWithMeta, printMode, selectedKeys]);

  const toggleKey = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllNonEmpty = () => {
    setSelectedKeys(new Set(pagesWithMeta.filter(p => p.total > 0).map(p => p.key)));
  };
  const selectAllPtk = () => {
    setSelectedKeys(new Set(pagesWithMeta.filter(p => p.ptk > 0).map(p => p.key)));
  };
  const clearSelection = () => setSelectedKeys(new Set());

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="no-print flex flex-col p-3 bg-slate-900 border-b border-slate-700 gap-2">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-slate-100">📋 베이 상세 인쇄 미리보기 ({filteredPages.length}페이지)</div>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              disabled={filteredPages.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold rounded text-sm">
              🖨️ 인쇄 / PDF 저장
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded">
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-slate-400 font-bold">출력 모드:</span>
          <button onClick={() => setPrintMode('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>📋 전체 일괄</button>
          <button onClick={() => setPrintMode('ptk')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'ptk' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>⚓ 평택분만</button>
          <button onClick={() => setPrintMode('multi')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'multi' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>🎯 베이 지정 (다중)</button>
        </div>

        {printMode === 'multi' && (
          <div className="flex flex-col gap-2 bg-slate-800 rounded p-2">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs text-slate-300 font-bold">선택: {selectedKeys.size}개</span>
              <button onClick={selectAllNonEmpty}
                className="px-2 py-1 rounded text-[11px] bg-blue-700 hover:bg-blue-600 text-white">
                컨테이너 있는 베이 전체
              </button>
              <button onClick={selectAllPtk}
                className="px-2 py-1 rounded text-[11px] bg-amber-700 hover:bg-amber-600 text-white">
                PTK 있는 베이 전체
              </button>
              <button onClick={clearSelection}
                className="px-2 py-1 rounded text-[11px] bg-slate-700 hover:bg-slate-600 text-white">
                선택 해제
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 max-h-[40vh] overflow-auto">
              {pagesWithMeta.map(p => {
                const checked = selectedKeys.has(p.key);
                const empty = p.total === 0;
                const hasPtk = p.ptk > 0;
                return (
                  <label key={p.key}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] cursor-pointer
                      ${checked ? 'bg-purple-700 text-white' : empty ? 'bg-slate-900 text-slate-500' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'}
                      ${hasPtk && !checked ? 'ring-1 ring-amber-500' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleKey(p.key)}
                      className="accent-purple-500 w-3.5 h-3.5" />
                    <span className="font-mono">{p.label}</span>
                    <span className={`ml-auto ${empty ? 'text-slate-600' : hasPtk ? 'text-amber-300' : 'text-slate-300'}`}>
                      {p.ptk > 0 ? `${p.ptk}/${p.total}` : p.total}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500">
              숫자 = PTK수/전체수 · 노란 테두리 = PTK 있음 · 회색 = 컨테이너 없음
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {filteredPages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            출력할 페이지가 없습니다. 모드를 변경하거나 베이를 선택하세요.
          </div>
        ) : (
          filteredPages.map(p => {
            const dictBay = p.even != null ? dictBaysSummary[p.even] : dictBaysSummary[p.odd];
            return (
              <BayDetailPage key={p.key}
                even={p.even} odd={p.odd}
                bayMap={bayMap} mode={mode}
                voyageInfo={voyageInfo} voyageKey={voyageKey}
                shipName={shipName} dictBay={dictBay} />
            );
          })
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .bd-page {
            page-break-after: always;
            padding: 0.3cm 0.5cm !important;
            border-bottom: none !important;
          }
          .bd-page:last-child { page-break-after: auto; }
          @page { size: A4 landscape; margin: 0.4cm; }
        }
        .bd-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          padding: 14px 24px;
          page-break-after: always;
          border-bottom: 1px dashed #ddd;
          width: 100%;
          box-sizing: border-box;
        }
        .bd-title {
          text-align: center; font-size: 14pt; font-weight: 500;
          margin-bottom: 4px;
        }
        .bd-header {
          display: flex; justify-content: space-between;
          font-size: 9pt; margin-bottom: 8px;
          padding: 0 4px;
        }
        .bd-row-labels-top, .bd-row-labels-bot {
          display: grid; grid-template-columns: repeat(7, 1fr);
          font-size: 8pt;
          margin: 2px 0;
          padding-right: 22px;
        }
        .bd-rl { text-align: center; }
        .bd-grid-wrap {
          display: flex; align-items: stretch;
        }
        .bd-grid { flex: 1; }
        .bd-tier-row {
          display: grid; grid-template-columns: repeat(7, 1fr);
          border-left: 0.5px solid #000;
          border-right: 0.5px solid #000;
        }
        .bd-tier-row:first-child { border-top: 0.5px solid #000; }
        .bd-tier-row:last-child { border-bottom: 0.5px solid #000; }
        .bd-cell {
          border: 0.3px solid #555;
          height: 56px;
          padding: 2px 3px;
          font-size: 6pt;
          line-height: 1.1;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
        .bd-cell.empty { background: white; }
        .bd-cell.filled.ptk { background: #fef3c7; }
        .bd-cell.filled { background: white; }
        .bd-pos { color: #555; }
        .bd-hatch {
          height: 4px; background: #000; margin: 0;
        }
        .bd-tier-labels {
          display: flex; flex-direction: column;
          padding-left: 6px;
          font-size: 8pt;
          width: 18px;
        }
        .bd-tier-labels span {
          height: 56px; line-height: 56px;
        }
        .bd-tier-gap { height: 4px !important; }
      `}</style>
    </div>
  );
}
