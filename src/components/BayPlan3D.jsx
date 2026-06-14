// 3D 입체 베이뷰 — 전체 베이를 원근 카드로 나열 + 베이 클릭 시 격자 상세 (V7.95 검증 함수 사용)
//   격자 진실원: cargoPlanCore.buildBayGrid3D/fillBayGrid3D (MCSN 624S 810컨 100% PASS).
//   색·XRAY 규칙은 BayPlan과 100% 일치하도록 cellColor/getOpColor를 props로 받음(재발명 금지).
import React, { useMemo, useState } from 'react';
import { ChevronLeft, Box, Layers } from 'lucide-react';
import { buildBayGrid3D, fillBayGrid3D } from '../cargoPlanCore.js';
import { normalizeBay, isReeferContainer } from '../utils.js';

export default function BayPlan3D({
  containers = [], dictBaysSummary = {}, mode = 'discharge',
  compMap = {}, xrayMap = {}, shiftingMap = {},
  cellColor, getOpColor, onOpenContainer, onCommitMove, pendingMove,
}) {
  const [selectedBay, setSelectedBay] = useState(null); // null = 전체 뷰

  // 베이별 컨 그룹 (자기 bay만 — 이중계산 없음. 페어는 표시만 묶음)
  const byBay = useMemo(() => {
    const m = {};
    for (const c of containers) {
      if (!c || !c.cn || !c.bay) continue;
      const bn = parseInt(c.bay, 10);
      if (!Number.isFinite(bn) || bn >= 99) continue; // bay99/999 = OOG placeholder 제외
      (m[bn] ||= []).push(c);
    }
    return m;
  }, [containers]);

  // 사전 baysSummary를 bayNo(정수) → entry 로 (BayPlan dictBaysSummary와 동일 형식)
  const byPrimary = useMemo(() => {
    const m = {};
    const arr = Array.isArray(dictBaysSummary)
      ? dictBaysSummary
      : Object.values(dictBaysSummary || {});
    for (const b of arr) {
      if (!b) continue;
      const n = parseInt(b.bayNo ?? b.bayNum ?? b.bay, 10);
      if (Number.isFinite(n)) m[n] = b;
    }
    return m;
  }, [dictBaysSummary]);

  // 전체 베이 목록: EDI에 컨이 있는 모든 bay + 사전 격자 적재율
  const bayCards = useMemo(() => {
    const bayNums = [...new Set(Object.keys(byBay).map(Number))].sort((a, b) => a - b);
    return bayNums.map((bn) => {
      const entry = byPrimary[bn];
      const mine = byBay[bn] || [];
      if (!entry) {
        return { bayNum: bn, cap: 0, loaded: mine.length, noDict: true,
                 xray: mine.filter(c => xrayMap[c.cn]).length };
      }
      const g = buildBayGrid3D(entry, entry.bayNo, false);
      const cap = g.cells.length;
      const loaded = mine.length;
      const xray = mine.filter(c => xrayMap[c.cn]).length;
      const reefer = mine.filter(c => isReeferContainer(c)).length;
      return { bayNum: bn, cap, loaded, xray, reefer, pairEven: entry.pairEven };
    });
  }, [byBay, byPrimary, xrayMap]);

  // 선택된 베이 격자 (상세 뷰)
  const detail = useMemo(() => {
    if (selectedBay == null) return null;
    const entry = byPrimary[selectedBay];
    const mine = byBay[selectedBay] || [];
    if (!entry) return { noDict: true, containers: mine };
    return fillBayGrid3D(entry, entry.bayNo, mine);
  }, [selectedBay, byPrimary, byBay]);

  // ── 전체 뷰 ──
  if (selectedBay == null) {
    if (bayCards.length === 0) {
      return (
        <div className="text-center text-slate-500 text-sm py-8">
          <Box className="w-8 h-8 mx-auto mb-2 opacity-40" />
          적재된 컨테이너가 없습니다.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>베이를 누르면 입체 격자로 펼쳐집니다 · 총 {bayCards.length}개 베이</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {bayCards.map((b) => {
            const pct = b.cap > 0 ? Math.round((b.loaded / b.cap) * 100) : 0;
            const barColor = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-cyan-500';
            return (
              <button
                key={b.bayNum}
                onClick={() => setSelectedBay(b.bayNum)}
                className="group relative text-left bg-slate-800/80 hover:bg-slate-700 border border-slate-600 hover:border-cyan-500 rounded-lg p-2.5 transition-all"
                style={{ transform: 'perspective(400px) rotateX(2deg)' }}
              >
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-base font-black text-slate-100">
                    BAY {String(b.bayNum).padStart(2, '0')}
                    {b.pairEven && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        (+{String(parseInt(b.pairEven, 10)).padStart(2, '0')})
                      </span>
                    )}
                  </span>
                  {b.noDict && <span className="text-[9px] text-amber-400">사전없음</span>}
                </div>
                <div className="text-[11px] mono text-slate-300 mb-1.5">
                  <span className="text-cyan-300 font-bold">{b.loaded}</span>
                  {b.cap > 0 && <span className="text-slate-500"> / {b.cap}</span>}
                  <span className="text-slate-500"> 적재</span>
                  {b.cap > 0 && <span className="text-slate-400 ml-1.5">{pct}%</span>}
                </div>
                {b.cap > 0 && (
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="flex gap-1.5 text-[9px]">
                  {b.xray > 0 && (
                    <span className="bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                      XRAY {b.xray}
                    </span>
                  )}
                  {b.reefer > 0 && (
                    <span className="bg-cyan-900/50 text-cyan-200 px-1.5 py-0.5 rounded font-bold">
                      ❄ {b.reefer}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 베이 상세 뷰 ──
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedBay(null)}
          className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200 font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> 전체 베이
        </button>
        <span className="text-lg font-black text-slate-100 ml-1">
          BAY {String(selectedBay).padStart(2, '0')}
        </span>
        {pendingMove && (
          <span className="text-[11px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded ml-auto">
            이동 중 · 빈 칸을 누르세요
          </span>
        )}
      </div>

      {detail?.noDict ? (
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3 text-xs text-amber-200">
          이 베이는 사전 매트릭스가 없습니다. 컨테이너 {detail.containers.length}개:
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.containers.map((c) => (
              <button key={c.cn} onClick={() => onOpenContainer?.(c)}
                className="mono text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded">
                {c.cn.slice(-4)}
              </button>
            ))}
          </div>
        </div>
      ) : detail ? (
        <BayGridDetail
          rd={detail.rd} cells={detail.cells} mode={mode}
          compMap={compMap} xrayMap={xrayMap} shiftingMap={shiftingMap}
          cellColor={cellColor} getOpColor={getOpColor}
          onOpenContainer={onOpenContainer}
          onEmptyCellClick={pendingMove ? (row, tier) => onCommitMove?.(selectedBay, row, tier) : null}
        />
      ) : null}
    </div>
  );
}

// 베이 상세 격자: 데크/홀드를 BayBoxV2처럼 크게. 색은 BayPlan과 동일(props).
function BayGridDetail({ rd, cells, mode, compMap, xrayMap, shiftingMap, cellColor, getOpColor, onOpenContainer, onEmptyCellClick }) {
  // 빠른 조회: `${tier}|${rowLbl}` → cell(with container)
  const cellMap = useMemo(() => {
    const m = new Map();
    for (const c of cells) m.set(`${c.tier}|${c.rowLbl}`, c);
    return m;
  }, [cells]);

  const CELL = 38, GAP = 3;

  const renderLayer = (rows, label) => {
    const visRows = rows.filter(r => !r.invisible);
    if (visRows.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="text-[11px] font-black text-emerald-400 mb-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          {label}
        </div>
        <div className="inline-block">
          {visRows.map((r, ri) => (
            <div key={ri} className="flex items-center" style={{ gap: GAP, marginBottom: GAP }}>
              <span className="text-[9px] text-slate-500 mono w-6 text-right shrink-0">T{r.tier}</span>
              {r.cells.map((cell, ci) => {
                if (!cell.active) {
                  return <div key={ci} className="bg-slate-900/40 border border-slate-800/60 rounded-sm shrink-0"
                    style={{ width: CELL, height: CELL }} />;
                }
                const found = cellMap.get(`${r.tier}|${cell.rowLbl}`);
                const c = found?.container;
                if (!c) {
                  // 빈 active 슬롯
                  return (
                    <button key={ci}
                      onClick={onEmptyCellClick ? () => onEmptyCellClick(cell.rowLbl, r.tier) : undefined}
                      className={`border border-dashed rounded-sm shrink-0 flex items-center justify-center transition-colors ${
                        onEmptyCellClick ? 'border-amber-500/60 hover:bg-amber-900/30 cursor-pointer' : 'border-slate-700 cursor-default'
                      }`}
                      style={{ width: CELL, height: CELL }}>
                      <span className="text-[8px] text-slate-600 mono">{cell.rowLbl}</span>
                    </button>
                  );
                }
                // 컨테이너 칸 — BayPlan과 동일 색 규칙
                const bgCls = cellColor ? cellColor(c) : 'bg-slate-700 text-slate-200 border-slate-600';
                const opC = getOpColor ? getOpColor(c) : null;
                const reefer = isReeferContainer(c);
                return (
                  <button key={ci}
                    onClick={() => onOpenContainer?.(c)}
                    className={`border rounded-sm shrink-0 flex flex-col items-center justify-center leading-none ${bgCls}`}
                    style={{ width: CELL, height: CELL }}
                    title={`${c.cn} · ${c.bay}/${cell.rowLbl}/${r.tier}`}>
                    <span className="text-[7px] opacity-70 mono">{cell.rowLbl}</span>
                    <span className="text-[8.5px] font-bold mono" style={opC ? { color: opC } : undefined}>
                      {c.cn.slice(-4)}
                    </span>
                    {reefer && <span className="text-[7px] text-cyan-300">❄</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 overflow-x-auto">
      {renderLayer(rd.deckRows, 'DECK (데크)')}
      {renderLayer(rd.holdRows, 'HOLD (홀드)')}
      <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <span><span className="inline-block w-3 h-3 bg-purple-700 rounded-sm align-middle mr-1" />XRAY</span>
        <span><span className="inline-block w-3 h-3 border border-dashed border-slate-600 rounded-sm align-middle mr-1" />빈 슬롯</span>
        <span className="text-cyan-300">❄ 리퍼</span>
        <span className="text-slate-600">선사 구분은 글자색</span>
      </div>
    </div>
  );
}
