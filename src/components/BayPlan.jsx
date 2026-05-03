import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, MapPin, Snowflake, AlertTriangle } from 'lucide-react';
import { isoToLabel } from '../utils.js';

// 입체적 베이플랜 — V37 알고리즘 + 다크 + 색상 코드 + 깊이감
// 색상 의미:
//   회색 = 통과/타지역 (완료된 것 X)
//   파랑 = 미완 (양하)
//   주황 = 미완 (선적)
//   초록 = 완료
//   보라 = X-RAY 대상
//   노랑테 = 평택 (POD/POL)
//   빨강 = DG (위험물)
//   하늘 = RF (리퍼)

export default function BayPlan({ containers, compMap, xrayMap, mode, onOpenContainer }) {
  const [zoom, setZoom] = useState(1);
  const [activeBay, setActiveBay] = useState(null);

  // 베이별 컨테이너 그룹
  const bayPages = useMemo(() => buildBayPages(containers), [containers]);

  if (containers.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
        베이 데이터 없음 — 자료 탭에서 EDI/ASC 업로드
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 줌 컨트롤 + 베이 점프 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2 flex-wrap sticky top-0 z-10">
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
            <ZoomOut className="w-4 h-4"/>
          </button>
          <span className="text-xs mono text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
            <ZoomIn className="w-4 h-4"/>
          </button>
          <button onClick={() => setZoom(1)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
            <Maximize2 className="w-4 h-4"/>
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto flex-1 max-w-full">
          <span className="text-[10px] text-slate-500 font-bold uppercase flex-shrink-0">베이</span>
          {bayPages.map((p, i) => (
            <button key={i}
              onClick={() => {
                const el = document.getElementById(`bay-page-${i}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveBay(i);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] mono font-black flex-shrink-0 ${
                activeBay === i
                  ? 'bg-amber-600 text-amber-100'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2 flex-wrap text-[10px]">
        <span className="text-slate-500 font-bold uppercase">범례:</span>
        <Legend color={mode === 'discharge' ? 'bg-blue-600' : 'bg-amber-600'} label="평택 미완"/>
        <Legend color="bg-emerald-600" label="완료"/>
        <Legend color="bg-purple-600" label="X-RAY"/>
        <Legend color="bg-cyan-600" label="RF"/>
        <Legend color="bg-red-600" label="DG"/>
        <Legend color="bg-slate-700" label="통과"/>
      </div>

      {/* 베이 페이지들 */}
      <div className="space-y-3" style={{ fontSize: `${zoom}rem` }}>
        {bayPages.map((page, i) => (
          <BayPage key={i} id={`bay-page-${i}`}
            page={page}
            compMap={compMap}
            xrayMap={xrayMap}
            mode={mode}
            zoom={zoom}
            onOpenContainer={onOpenContainer}
          />
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`${color} w-2.5 h-2.5 rounded-sm`}/>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

function BayPage({ id, page, compMap, xrayMap, mode, zoom, onOpenContainer }) {
  const evenContainers = page.evenBay ? page.bayGroups[page.evenBay] || [] : [];
  const oddContainers = page.oddBay ? page.bayGroups[page.oddBay] || [] : [];
  const allContainers = [...evenContainers, ...oddContainers];

  // 40피트 X 마크
  const xMarks = useMemo(() => {
    const marks = new Set();
    const occupied = new Set();
    allContainers.forEach(c => {
      if (c.row && c.tier) occupied.add(`${c.row}-${c.tier}`);
    });
    evenContainers.forEach(c => {
      if (!c.row || !c.tier) return;
      const evenN = parseInt(c.row);
      if (evenN === 0 || evenN % 2 !== 0) return;
      const oddRow = String(evenN - 1).padStart(2, '0');
      const k = `${oddRow}-${c.tier}`;
      if (occupied.has(k)) return;
      marks.add(k);
    });
    return marks;
  }, [evenContainers, allContainers]);

  // ROW 정렬 (좌현 짝수 ↓, 00, 우현 홀수 ↑)
  const allRows = useMemo(() => {
    const rowSet = new Set();
    allContainers.forEach(c => c.row && rowSet.add(c.row));
    Array.from(xMarks).forEach(k => rowSet.add(k.split('-')[0]));
    const arr = Array.from(rowSet);
    const left = arr.filter(r => parseInt(r) > 0 && parseInt(r) % 2 === 0).sort((a,b) => parseInt(b) - parseInt(a));
    const right = arr.filter(r => parseInt(r) > 0 && parseInt(r) % 2 === 1).sort((a,b) => parseInt(a) - parseInt(b));
    const center = arr.includes('00') ? ['00'] : [];
    return [...left, ...center, ...right];
  }, [allContainers, xMarks]);

  // TIER (DECK / HOLD)
  const allTiers = useMemo(() => {
    const tierSet = new Set();
    allContainers.forEach(c => c.tier && tierSet.add(c.tier));
    Array.from(xMarks).forEach(k => tierSet.add(k.split('-')[1]));
    return Array.from(tierSet);
  }, [allContainers, xMarks]);

  const deckTiers = allTiers.filter(t => parseInt(t) >= 80).sort((a,b) => parseInt(b) - parseInt(a));
  const holdTiers = allTiers.filter(t => parseInt(t) < 80).sort((a,b) => parseInt(b) - parseInt(a));

  const cellW = Math.round(56 * zoom);
  const cellH = Math.round(56 * zoom);

  const getCell = (row, tier) => allContainers.find(c => c.row === row && c.tier === tier);
  const isXmark = (row, tier) => xMarks.has(`${row}-${tier}`);

  const totalCells = allContainers.length;
  const doneCells = allContainers.filter(c => compMap[c.cn]).length;
  const xrayCount = allContainers.filter(c => xrayMap[c.cn]).length;
  const pct = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <div id={id} className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      {/* 베이 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400"/>
          <div>
            <div className="font-black text-base text-amber-300 mono">베이 {page.label}</div>
            <div className="text-[10px] text-slate-500">{page.evenBay && `40ft: ${page.evenBay}`}{page.evenBay && page.oddBay && ' · '}{page.oddBay && `20ft: ${page.oddBay}`}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500">진행</div>
          <div className="text-sm font-black mono">
            <span className="text-emerald-400">{doneCells}</span>
            <span className="text-slate-600">/{totalCells}</span>
            <span className="text-slate-400 ml-1">({pct}%)</span>
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="bg-slate-800 h-1 overflow-hidden">
        <div className={`h-full ${mode === 'discharge' ? 'bg-blue-500' : 'bg-amber-500'} transition-all`} style={{ width: `${pct}%` }}/>
      </div>

      {/* 그리드 본체 */}
      <div className="overflow-x-auto p-2">
        <div className="inline-block">
          {/* DECK */}
          {deckTiers.length > 0 && (
            <>
              <div className="text-[9px] text-cyan-400 font-bold uppercase mb-0.5 ml-8">▴ Deck</div>
              {deckTiers.map(tier => (
                <TierRow key={`d-${tier}`}
                  tier={tier} rows={allRows} getCell={getCell} isXmark={isXmark}
                  compMap={compMap} xrayMap={xrayMap} mode={mode} cellW={cellW} cellH={cellH}
                  onOpenContainer={onOpenContainer}
                />
              ))}
              {holdTiers.length > 0 && (
                <div className="border-t-2 border-dashed border-slate-600 my-1 relative">
                  <span className="absolute -top-2 left-2 bg-slate-900 text-[9px] text-slate-500 px-1">─ Hatch ─</span>
                </div>
              )}
            </>
          )}
          {/* HOLD */}
          {holdTiers.length > 0 && (
            <>
              {holdTiers.map(tier => (
                <TierRow key={`h-${tier}`}
                  tier={tier} rows={allRows} getCell={getCell} isXmark={isXmark}
                  compMap={compMap} xrayMap={xrayMap} mode={mode} cellW={cellW} cellH={cellH}
                  onOpenContainer={onOpenContainer}
                />
              ))}
              <div className="text-[9px] text-amber-500 font-bold uppercase mt-0.5 ml-8">▾ Hold</div>
            </>
          )}

          {/* ROW 헤더 (하단) */}
          <div className="flex items-center mt-1 ml-8 gap-0">
            {allRows.map(row => (
              <div key={row} className="flex-shrink-0 flex items-center justify-center text-[9px] text-slate-500 font-bold mono"
                style={{ width: cellW }}>
                {row}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 푸터 — 통계 */}
      {(xrayCount > 0 || allContainers.some(c => c.rf || c.dg)) && (
        <div className="px-3 py-2 border-t border-slate-800 flex items-center gap-2 flex-wrap text-[10px]">
          {xrayCount > 0 && (
            <span className="bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded font-bold">🔍 X-RAY {xrayCount}</span>
          )}
          {allContainers.filter(c => c.rf).length > 0 && (
            <span className="bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <Snowflake className="w-2.5 h-2.5"/>RF {allContainers.filter(c => c.rf).length}
            </span>
          )}
          {allContainers.filter(c => c.dg).length > 0 && (
            <span className="bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5"/>DG {allContainers.filter(c => c.dg).length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TierRow({ tier, rows, getCell, isXmark, compMap, xrayMap, mode, cellW, cellH, onOpenContainer }) {
  return (
    <div className="flex items-center gap-0">
      {/* TIER 라벨 (좌측) */}
      <div className="flex-shrink-0 text-[9px] text-slate-500 mono font-bold w-8 text-center">{tier}</div>
      {rows.map(row => {
        const c = getCell(row, tier);
        const isX = !c && isXmark(row, tier);
        return (
          <Cell key={`${row}-${tier}`}
            c={c}
            isX={isX}
            isDone={c && !!compMap[c.cn]}
            isXray={c && mode === 'discharge' && !!xrayMap[c.cn]}
            mode={mode}
            cellW={cellW}
            cellH={cellH}
            onClick={c ? () => onOpenContainer(c) : null}
          />
        );
      })}
    </div>
  );
}

function Cell({ c, isX, isDone, isXray, mode, cellW, cellH, onClick }) {
  // 빈 셀
  if (!c && !isX) {
    return (
      <div className="flex-shrink-0 border border-slate-800/50 bg-slate-950/40"
        style={{ width: cellW, height: cellH }}/>
    );
  }
  // X 마크 (40피트 점유)
  if (isX) {
    return (
      <div className="flex-shrink-0 border border-slate-700 bg-slate-800/60 flex items-center justify-center"
        style={{ width: cellW, height: cellH }}>
        <span className="text-slate-600 font-black" style={{ fontSize: cellH * 0.4 }}>×</span>
      </div>
    );
  }

  // 컨테이너 셀
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const isDG = c.dg;
  const isPtk = mode === 'discharge'
    ? (c.pod || '').toUpperCase().endsWith('PTK')
    : (c.pol || '').toUpperCase().endsWith('PTK');

  // 색 결정 (우선순위: 완료 > X-RAY > 특수 > 평택 > 통과)
  let bg, border, text;
  if (isDone) {
    bg = 'bg-emerald-700'; border = 'border-emerald-400'; text = 'text-emerald-50';
  } else if (isXray) {
    bg = 'bg-purple-700'; border = 'border-purple-400'; text = 'text-purple-50';
  } else if (isDG) {
    bg = 'bg-red-700'; border = 'border-red-400'; text = 'text-red-50';
  } else if (isReefer) {
    bg = 'bg-cyan-700'; border = 'border-cyan-400'; text = 'text-cyan-50';
  } else if (isPtk) {
    bg = mode === 'discharge' ? 'bg-blue-700' : 'bg-amber-700';
    border = mode === 'discharge' ? 'border-blue-400' : 'border-amber-400';
    text = mode === 'discharge' ? 'text-blue-50' : 'text-amber-50';
  } else {
    bg = 'bg-slate-700'; border = 'border-slate-600'; text = 'text-slate-300';
  }

  const last4 = c.l4 || c.cn?.slice(-4) || '';
  const op = (c.op || '').slice(0, 3);
  const lbl = isoToLabel(c.iso) || c.tp || '';

  return (
    <button onClick={onClick}
      className={`flex-shrink-0 border-2 ${border} ${bg} ${text} flex flex-col items-center justify-center mono text-[8px] hover:brightness-125 active:brightness-90 transition leading-tight overflow-hidden p-0.5 shadow-md`}
      style={{ width: cellW, height: cellH }}
      title={`${c.cn} ${c.bay}-${c.row}-${c.tier} ${lbl} ${c.fe || ''}`}
    >
      {isXray && <span className="absolute top-0 right-0 text-[7px]">🔍</span>}
      <div className="font-black truncate w-full text-center" style={{ fontSize: cellH * 0.18 }}>
        {last4}
      </div>
      <div className="opacity-80 truncate w-full text-center" style={{ fontSize: cellH * 0.12 }}>
        {op || lbl}
      </div>
      <div className="opacity-60 truncate w-full text-center" style={{ fontSize: cellH * 0.11 }}>
        {c.fe} {c.wt > 0 ? (c.wt/1000).toFixed(1) : ''}
      </div>
    </button>
  );
}

// V37 알고리즘: 짝수+홀수 베이 페어로 묶기
function buildBayPages(containers) {
  const bayGroups = {};
  containers.forEach(c => {
    if (!c.bay) return;
    if (!bayGroups[c.bay]) bayGroups[c.bay] = [];
    bayGroups[c.bay].push(c);
  });
  const bays = Object.keys(bayGroups).sort((a, b) => parseInt(a) - parseInt(b));
  const pages = [];
  const used = new Set();
  bays.forEach(bay => {
    if (used.has(bay)) return;
    const n = parseInt(bay);
    if (n % 2 === 0) {
      // 짝수 (40ft) — 인접 홀수 (n-1, n+1) 찾기
      const oddBay = String(n - 1).padStart(2, '0');
      pages.push({ label: `${bay} / ${oddBay}`, evenBay: bay, oddBay: bays.includes(oddBay) ? oddBay : null, bayGroups });
      used.add(bay);
      if (bays.includes(oddBay)) used.add(oddBay);
    } else {
      // 홀수 단독 (20ft only)
      pages.push({ label: bay, evenBay: null, oddBay: bay, bayGroups });
      used.add(bay);
    }
  });
  return pages;
}
