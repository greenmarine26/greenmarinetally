// V37 BaySection 100% 이식 (다크 테마 매핑)
// 핵심 디테일 모두 보존:
//  - 짝수/홀수 베이 페어링 (40ft 짝수 + 20ft 홀수)
//  - 40ft 컨이 점유한 자리에 X 표시 (단, 컨테이너 있는 자리엔 X 안 그림)
//  - DECK (TIER ≥ 80) / HOLD 분리 + 해치커버
//  - ROW 정렬: 좌현 짝수 ↓, 00 가운데, 우현 홀수 ↑
//  - 좌우 5:5 균형 (globalRowRange)
//  - 상하 5:5 균형 (TIER padding)
//  - PDF 5줄 셀 (POL/POD, 컨번호, 선사 F/E 무게 타입, 특수정보, 위치)
//  - 셀 색상: 평택=노랑, X-RAY=보라, 시프팅=주황, 완료=흰색, 통과=회색
//  - 시프팅 계산 (양하 위에 있는 컨 = needsShift)
//  - 줌 + 핀치 줌 + Ctrl+휠 + 마우스/터치 드래그
//  - 모바일/데스크톱 자동 셀 크기

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { isoToLabel, isoToPdfLabel, fmtPos, normalizeBay, getPortColor, isReeferContainer } from '../utils.js';
import SlotPickerModal from './SlotPickerModal.jsx';
import UnassignedListModal from './UnassignedListModal.jsx';

export default function BayPlan({ containers, compMap, xrayMap, mode, onOpenContainer }) {
  const [pageIdx, setPageIdx] = useState(0);
  const [allBaysMode, setAllBaysMode] = useState(true); // 기본 ON: 모든 베이 세로 스크롤
  const [zoom, setZoom] = useState(() => {
    // M3.78: 모바일 기본 zoom 0.3 → 0.5로 (❄/⚠ 같은 종류 심볼 잘 보이게)
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 0.5;
    return 1.0;
  });
  // M3.74: 다중 적재 슬롯 선택 모달
  const [slotPicker, setSlotPicker] = useState(null);  // { slot: {bay,row,tier}, containers: [...] }
  // M3.87: 선적대상(미배정) 모달
  const [showUnassigned, setShowUnassigned] = useState(false);
  const unassignedCount = useMemo(() =>
    containers.filter(c => !c.bay).length, [containers]);
  const scrollRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // 평택 대상 (모드별)
  const isPtk = (c) => {
    if (mode === 'discharge') {
      const pod = (c.pod || '').toUpperCase();
      return pod === 'PTK' || pod === 'KRPTK' || pod.endsWith('PTK');
    } else {
      const pol = (c.pol || '').toUpperCase();
      return pol === 'PTK' || pol === 'KRPTK' || pol.endsWith('PTK');
    }
  };

  // 평택 컨번호 set
  const dischargeCns = useMemo(() => {
    const s = new Set();
    containers.forEach(c => { if (isPtk(c)) s.add(c.cn); });
    return s;
  }, [containers, mode]);

  // 베이별 그룹화 (전체 EDI 컨테이너로)
  // M3.1: 키를 정규화된 정수 문자열("016"→"16")로 통일 — 이전 데이터/혼합 형식 호환
  const bayGroups = useMemo(() => {
    const g = {};
    containers.forEach(c => {
      if (!c.bay) return;
      const key = normalizeBay(c.bay);
      if (!key) return;
      if (!g[key]) g[key] = [];
      g[key].push(c);
    });
    return g;
  }, [containers]);

  // 베이별 구조 (행/단 모두)
  const bayStructureMap = useMemo(() => {
    const map = {};
    Object.entries(bayGroups).forEach(([bay, list]) => {
      const rows = new Set();
      const tiers = new Set();
      list.forEach(c => {
        if (c.row) rows.add(c.row);
        if (c.tier) tiers.add(c.tier);
      });
      map[bay] = { rows: Array.from(rows), tiers: Array.from(tiers) };
    });
    return map;
  }, [bayGroups]);

  // 시프팅 분석 (양하 모드일 때만 의미있음)
  const shiftingMap = useMemo(() => {
    const result = { needsShift: {}, shiftCns: {} };
    if (!dischargeCns || dischargeCns.size === 0) return result;
    const tierZone = (t) => parseInt(t) >= 80 ? 'deck' : 'hold';
    for (const c of containers) {
      if (!dischargeCns.has(c.cn)) continue;
      if (!c.bay || !c.tier) continue;
      const zone = tierZone(c.tier);
      const tier = parseInt(c.tier);
      const above = containers.filter(o =>
        o.cn !== c.cn && !dischargeCns.has(o.cn) &&
        o.bay === c.bay && o.row === c.row && tierZone(o.tier) === zone &&
        parseInt(o.tier) > tier
      );
      if (above.length > 0) {
        result.needsShift[c.cn] = above.length;
        above.forEach(s => { result.shiftCns[s.cn] = true; });
      }
    }
    return result;
  }, [containers, dischargeCns]);

  // 좌우 균형 (전 베이 통일)
  const globalRowRange = useMemo(() => {
    let maxLeft = 0, maxRight = 0;
    for (const c of containers) {
      if (!c.row) continue;
      const n = parseInt(c.row);
      if (n === 0) continue;
      if (n % 2 === 0) maxLeft = Math.max(maxLeft, n);
      else maxRight = Math.max(maxRight, n);
    }
    return { maxLeft, maxRight };
  }, [containers]);

  // M3.87: 선박 전체 tier 풀 (베이가 한 컨만 있어도 모든 tier 슬롯 표시)
  //   원칙: "베이는 풀로 차있다고 생각하고 다 보여줘야 함"
  //   이전: BayPage 내부에서 그 페이지의 컨테이너만 보고 tier 추출 → 달랑 한 줄
  const globalTiers = useMemo(() => {
    const ts = new Set();
    for (const c of containers) {
      if (c.tier) ts.add(c.tier);
    }
    return Array.from(ts);
  }, [containers]);

  // 페이지 = 짝수/홀수 베이 한 쌍 (PDF 처럼)
  // M3.1: bay 키가 정규화된 정수 문자열("1","16","100" 등) 형태이므로 정수 기반 페어링
  const pages = useMemo(() => {
    const bays = Object.keys(bayGroups);
    const bayInts = bays.map(b => parseInt(b, 10)).filter(n => !isNaN(n));
    // 화면 표시용: 베이 번호는 항상 2자리 padStart (보기 좋게), 100+는 3자리 그대로
    const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
    // 키 매칭용: 정규화된 형태("16", "100")
    const keyBay = (n) => String(n);

    // M3.89.1 근본 fix: 사용자 원칙 #8
    //   "EDI 파악할 때 모든 베이를 풀로 채운 것처럼 생각해서 만들어라"
    //   → 선박 구조 전체 (1번~maxBay)를 무조건 페이지로 추가. EDI 데이터는 그 위에 채워짐.
    //   → 빈 베이도 페이지로 표시 (빈 그리드). 베이 누락 절대 X.
    const maxBay = bayInts.length > 0 ? Math.max(...bayInts) : 0;
    if (maxBay === 0) return [];  // EDI 자체가 비어있을 때만 빈 배열

    const out = [];
    const usedOddBays = new Set();
    for (let n = 1; n <= maxBay; n++) {
      if (n % 2 === 0) {
        // 짝수 = 40ft 베이 + 다음 홀수(20ft) 짝꿍 페어
        const evenKey = keyBay(n);
        const oddKey = keyBay(n + 1);
        const evenDisp = dispBay(n);
        const oddDisp = dispBay(n + 1);
        // 짝꿍 홀수가 maxBay 이내면 페어, 초과면 단독
        const oddInRange = (n + 1) <= maxBay;
        out.push({
          title: oddInRange ? `BAY ${evenDisp} (40ft) / BAY ${oddDisp} (20ft)` : `BAY ${evenDisp} (40ft)`,
          evenBay: evenKey,
          oddBay: oddInRange ? oddKey : null,
        });
        if (oddInRange) usedOddBays.add(oddKey);
      } else {
        // 홀수 = 20ft 단독 (이미 페어로 처리되지 않은 경우만)
        const oddKey = keyBay(n);
        if (!usedOddBays.has(oddKey)) {
          out.push({
            title: `BAY ${dispBay(n)} (20ft)`,
            evenBay: null,
            oddBay: oddKey,
          });
        }
      }
    }
    return out;
  }, [bayGroups]);

  // 셀 색상 — V37 cellColor + M3.77: 양하/선적 통일 POL/POD 색깔
  // 정책:
  //   - 양하 모드: 셀 = POL(출발지) 색깔, 평택 도착이면 노랑 ring 강조
  //   - 선적 모드: 셀 = POD(목적지) 색깔, 평택 출발이면 노랑 ring 강조
  //   - 노랑 ring = 우리 작업 대상 식별
  //   - X-RAY/시프팅/완료는 우선순위 더 높음
  const cellColor = (c) => {
    if (compMap[c.cn]) {
      // 완료 = 어두운 흰색 (다크 배경 위 잘 보이게)
      return 'bg-slate-300 text-slate-900 border-slate-500';
    }
    if (xrayMap[c.cn]) {
      // X-RAY = 보라 (강조)
      return 'bg-purple-700 text-purple-50 border-purple-400 ring-1 ring-purple-300';
    }
    if (shiftingMap.shiftCns[c.cn]) {
      // 시프팅 대상 = 주황
      return 'bg-orange-600 text-orange-50 border-orange-400';
    }

    // M3.77: 양하 = POL 색깔, 선적 = POD 색깔
    const portCode = mode === 'discharge' ? c.pol : c.pod;
    const pc = portCode ? getPortColor(portCode) : null;
    const isOurContainer = isPtk(c) || dischargeCns.has(c.cn);

    if (pc) {
      // 색깔 매칭됨 - 평택 작업 대상이면 노랑 ring 추가
      return `${pc.bg} ${pc.text} ${isOurContainer
        ? 'border-amber-300 ring-2 ring-amber-400'
        : 'border-slate-600'}`;
    }

    // 색깔 없는 항구 - 평택 작업 대상이면 노랑(기본), 통과면 슬레이트
    if (isOurContainer) {
      return 'bg-amber-500 text-amber-950 border-amber-300 ring-1 ring-amber-400';
    }
    return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  // 셀 크기 (zoom 적용) - PDF 5줄 다 보이게
  const baseW = isMobile ? 110 : 140;
  const baseH = isMobile ? 88 : 108;
  const cellW = Math.round(baseW * zoom);
  const cellH = Math.round(baseH * zoom);
  const fontSize = Math.max(8, Math.round(10 * zoom));

  // 마우스/터치 드래그 + 휠 + 핀치 줌
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
    let pinchStartDist = 0, pinchStartZoom = 1;

    const onMouseDown = (e) => {
      if (e.target.closest('button')) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      startY = e.pageY - el.offsetTop;
      scrollLeft = el.scrollLeft;
      scrollTop = el.scrollTop;
      el.style.cursor = 'grabbing';
    };
    const onMouseUp = () => { isDown = false; el.style.cursor = 'grab'; };
    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - ((e.pageX - el.offsetLeft) - startX);
      el.scrollTop = scrollTop - ((e.pageY - el.offsetTop) - startY);
    };
    const onWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
      } else if (e.shiftKey) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches);
        pinchStartZoom = zoom;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDist = dist(e.touches);
        const ratio = newDist / pinchStartDist;
        setZoom(Math.max(0.3, Math.min(3, pinchStartZoom * ratio)));
      }
    };
    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoom]);

  if (containers.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
        베이 데이터 없음 — 자료 탭에서 EDI/ASC 업로드
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
        베이 정보 없음
      </div>
    );
  }

  const curPage = pages[pageIdx] || pages[0];

  return (
    <div className="space-y-2">
      {/* 컨트롤 바 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2 flex-wrap sticky top-0 z-10">
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
            <ZoomOut className="w-4 h-4"/>
          </button>
          <span className="text-xs mono text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">
            <ZoomIn className="w-4 h-4"/>
          </button>
          <button onClick={() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            setZoom(isMobile ? 0.3 : 1.0);
          }} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" title="기본 배율">
            <Maximize2 className="w-4 h-4"/>
          </button>
        </div>

        {/* 전체 모드 토글 (기본 ON) */}
        <button onClick={() => setAllBaysMode(!allBaysMode)}
          className={`px-2 py-1.5 rounded text-xs font-bold ${
            allBaysMode ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
          }`}>
          {allBaysMode ? '✓ 전체 세로' : '단일 페이지'}
        </button>

        {/* M3.87: 선적 모드 - 미배정(선적대상) 배지 */}
        {mode === 'loading' && unassignedCount > 0 && (
          <button onClick={() => setShowUnassigned(true)}
            className="px-2 py-1.5 rounded text-xs font-black bg-orange-700 hover:bg-orange-600 text-orange-50 flex items-center gap-1">
            🚛 선적대상 {unassignedCount}대
          </button>
        )}

        {/* 페이지 네비 (단일 모드일 때만) */}
        {!allBaysMode && (
          <>
            <button onClick={() => setPageIdx(i => Math.max(0, i - 1))}
              disabled={pageIdx === 0}
              className="px-2 py-1 bg-slate-800 disabled:opacity-30 rounded text-xs font-bold text-slate-300">◀</button>
            <span className="text-xs mono text-slate-300 font-bold">{pageIdx + 1} / {pages.length}</span>
            <button onClick={() => setPageIdx(i => Math.min(pages.length - 1, i + 1))}
              disabled={pageIdx === pages.length - 1}
              className="px-2 py-1 bg-slate-800 disabled:opacity-30 rounded text-xs font-bold text-slate-300">▶</button>
          </>
        )}

        {/* 베이 점프 */}
        <select value={pageIdx} onChange={e => {
            const i = parseInt(e.target.value);
            setPageIdx(i);
            if (allBaysMode) {
              const el = document.getElementById(`bay-page-${i}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 mono px-1 py-1 ml-auto">
          {pages.map((p, i) => (
            <option key={i} value={i}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* 범례 - M3.77: 양하/선적 통일 (POL/POD 색깔 + 평택 노랑 ring) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-500 font-bold uppercase w-12">셀색:</span>
          <span className="text-cyan-300 font-bold">
            {mode === 'discharge' ? 'POL(출발지)' : 'POD(목적지)'} 색깔
          </span>
          <span className="text-amber-300 font-bold">+ 노랑 ring = 평택</span>
          <Legend color="bg-purple-700" label="X-RAY"/>
          <Legend color="bg-orange-600" label="시프팅"/>
          <Legend color="bg-slate-300" label="완료"/>
          <Legend color="bg-slate-700" label="통과(색깔없음)"/>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-500 font-bold uppercase w-12">종류:</span>
          <span className="flex items-center gap-1"><span className="bg-red-500 w-1 h-3 inline-block rounded-sm"/><span className="text-red-300 font-bold">⚠ DG</span></span>
          <span className="flex items-center gap-1"><span className="bg-cyan-400 w-1 h-3 inline-block rounded-sm"/><span className="text-cyan-300 font-bold">❄ 리퍼</span></span>
          <span className="flex items-center gap-1"><span className="bg-purple-500 w-1 h-3 inline-block rounded-sm"/><span className="text-purple-300 font-bold">⊞ FR</span></span>
          <span className="flex items-center gap-1"><span className="bg-orange-500 w-1 h-3 inline-block rounded-sm"/><span className="text-orange-300 font-bold">▣ TK</span></span>
          <span className="flex items-center gap-1"><span className="bg-fuchsia-500 w-1 h-3 inline-block rounded-sm"/><span className="text-fuchsia-300 font-bold">△ OT</span></span>
        </div>
      </div>

      {/* 베이 그리드 본체 */}
      <div ref={scrollRef} className="bg-slate-950 border border-slate-700 rounded-lg p-3 overflow-auto" style={{ maxHeight: '78vh' }}>
        {allBaysMode ? (
          // 전체 베이 세로 스크롤 (V37 기본 모드)
          <div className="space-y-6">
            {pages.map((page, pIdx) => (
              <div key={pIdx} id={`bay-page-${pIdx}`}>
                <BayPage
                  page={page}
                  bayGroups={bayGroups}
                  completedMap={compMap}
                  xrayList={xrayMap}
                  dischargeCns={dischargeCns}
                  shiftingMap={shiftingMap}
                  isPtk={isPtk}
                  onCellClick={(c, multi) => {
                    // M3.74: 다중 적재면 SlotPickerModal, 단일이면 기존 동작
                    if (multi?.multi && multi.containers?.length >= 2) {
                      setSlotPicker({ slot: multi.slot, containers: multi.containers });
                    } else {
                      onOpenContainer?.(c);
                    }
                  }}
                  cellW={cellW}
                  cellH={cellH}
                  fontSize={fontSize}
                  isMobile={isMobile}
                  cellColor={cellColor}
                  globalRowRange={globalRowRange}
                  globalTiers={globalTiers}
                  bayStructureMap={bayStructureMap}
                />
              </div>
            ))}
          </div>
        ) : (
          // 단일 페이지 모드
          <BayPage
            page={curPage}
            bayGroups={bayGroups}
            completedMap={compMap}
            xrayList={xrayMap}
            dischargeCns={dischargeCns}
            shiftingMap={shiftingMap}
            isPtk={isPtk}
            onCellClick={(c, multi) => {
              if (multi?.multi && multi.containers?.length >= 2) {
                setSlotPicker({ slot: multi.slot, containers: multi.containers });
              } else {
                onOpenContainer?.(c);
              }
            }}
            cellW={cellW}
            cellH={cellH}
            fontSize={fontSize}
            isMobile={isMobile}
            cellColor={cellColor}
            globalRowRange={globalRowRange}
                  globalTiers={globalTiers}
            bayStructureMap={bayStructureMap}
          />
        )}
      </div>

      {/* M3.74: 다중 적재 슬롯 컨테이너 선택 모달 */}
      <SlotPickerModal
        open={!!slotPicker}
        slot={slotPicker?.slot}
        containers={slotPicker?.containers}
        onPick={(c) => {
          setSlotPicker(null);
          onOpenContainer?.(c);
        }}
        onClose={() => setSlotPicker(null)}
      />

      {/* M3.87: 선적대상(미배정) 목록 모달 */}
      <UnassignedListModal
        open={showUnassigned}
        containers={containers}
        onClose={() => setShowUnassigned(false)}
        onPickContainer={(c) => {
          setShowUnassigned(false);
          onOpenContainer?.(c);  // ContainerDetailModal 열림 → 거기서 위치 수정
        }}
      />
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`${color} w-3 h-3 rounded-sm border border-slate-600`}/>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

// V37 BaySection 100% 이식
function BayPage({ page, bayGroups, completedMap, xrayList, dischargeCns, shiftingMap, isPtk, onCellClick, cellW, cellH, fontSize, isMobile, cellColor, globalRowRange, bayStructureMap, globalTiers = [] }) {
  const evenContainers = page.evenBay ? (bayGroups[page.evenBay] || []) : [];
  const oddContainers = page.oddBay ? (bayGroups[page.oddBay] || []) : [];
  const allContainers = [...evenContainers, ...oddContainers];

  // 40피트 X 마크
  const xMarks = useMemo(() => {
    const marks = new Set();
    const occupied = new Set();
    for (const c of allContainers) {
      if (c.row && c.tier) occupied.add(`${c.row}-${c.tier}`);
    }
    for (const c of evenContainers) {
      if (!c.row || !c.tier) continue;
      const evenN = parseInt(c.row);
      if (evenN === 0 || evenN % 2 !== 0) continue;
      const oddN = evenN - 1;
      if (oddN < 0) continue;
      const oddRow = String(oddN).padStart(2, '0');
      const xKey = `${oddRow}-${c.tier}`;
      if (occupied.has(xKey)) continue;
      marks.add(xKey);
    }
    return marks;
  }, [evenContainers, allContainers]);

  // 좌우 균형 (전 베이 통일 폭)
  const maxLeft = globalRowRange?.maxLeft || 0;
  const maxRight = globalRowRange?.maxRight || 0;

  const allLeftRows = [];
  for (let n = maxLeft; n >= 2; n -= 2) {
    allLeftRows.push(String(n).padStart(2, '0'));
  }
  const allRightRows = [];
  for (let n = 1; n <= maxRight; n += 2) {
    allRightRows.push(String(n).padStart(2, '0'));
  }
  const centerRows = ['00'];
  const allRows = [...allLeftRows, ...centerRows, ...allRightRows];

  // DECK / HOLD 분리 + 상하 균형
  // M3.87: globalTiers 사용 (선박 전체 tier 풀) — 베이가 한 컨만 있어도 모든 슬롯 표시
  //   "베이는 풀로 차있다고 생각하고 다 보여줘야 함" 원칙
  const allTiers = Array.from(new Set([
    ...globalTiers,
    ...allContainers.map(c => c.tier).filter(Boolean),
    ...Array.from(xMarks).map(k => k.split('-')[1])
  ]));
  const deckTiers = allTiers.filter(t => parseInt(t) >= 80).sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = allTiers.filter(t => parseInt(t) < 80).sort((a, b) => parseInt(b) - parseInt(a));

  const tierMax = Math.max(deckTiers.length, holdTiers.length);
  const deckTiersPadded = [...Array(tierMax - deckTiers.length).fill(null), ...deckTiers];
  const holdTiersPadded = [...holdTiers, ...Array(tierMax - holdTiers.length).fill(null)];

  // M3.74: 다중 적재 지원 - 같은 슬롯 컨테이너 모두 반환
  // 우선순위: 평택 화물 > 다른 화물 (평택이 첫 번째로 표시)
  const getCellAll = (row, tier) => {
    if (!row || !tier) return [];
    const matches = allContainers.filter(c => c.row === row && c.tier === tier);
    if (matches.length <= 1) return matches;
    // 평택 화물 우선 정렬
    return [...matches].sort((a, b) => {
      const aPtk = isPtk(a) ? 0 : 1;
      const bPtk = isPtk(b) ? 0 : 1;
      return aPtk - bPtk;
    });
  };
  const getCell = (row, tier) => {
    const all = getCellAll(row, tier);
    return all.length > 0 ? all[0] : null;
  };
  const isXmark = (row, tier) => {
    if (!row || !tier) return false;
    return xMarks.has(`${row}-${tier}`);
  };

  // 한 셀 렌더링 — V37 PDF 5줄 형식
  const renderCell = (row, tier) => {
    const key = `${row || '_'}-${tier || '_'}`;
    if (!row || !tier) {
      return <div key={key} className="border border-dashed border-slate-800 flex-shrink-0 bg-slate-950"
        style={{ width: cellW, height: cellH }}/>;
    }
    // M3.74: 다중 적재 검출
    const cellList = getCellAll(row, tier);
    const c = cellList[0] || null;
    const stackCount = cellList.length;  // 1이면 단일, 2+면 다중
    if (!c && isXmark(row, tier)) {
      return (
        <div key={key} className="border border-slate-700 bg-slate-800 flex-shrink-0 flex items-center justify-center"
          style={{ width: cellW, height: cellH }}>
          <span className="text-slate-500 font-black" style={{ fontSize: fontSize * 2.5 }}>×</span>
        </div>
      );
    }
    if (!c) {
      return <div key={key} className="border border-dashed border-slate-800 flex-shrink-0 bg-slate-950/40"
        style={{ width: cellW, height: cellH }}/>;
    }

    const needsShift = shiftingMap.needsShift[c.cn];
    const ptk = isPtk(c);
    const fe = c.fe || 'F';
    const wt = c.wt > 0 ? (c.wt / 1000).toFixed(1) : '0.0';
    const typeLabel = isoToPdfLabel ? isoToPdfLabel(c.iso, c.tp) : (isoToLabel(c.iso) || '');
    const polLabel = (c.pol || '').replace(/^KR/, '').slice(0, 3).padEnd(3, ' ');
    const podLabel = (c.pod || '').replace(/^KR/, '').slice(0, 3);
    const transit = (c.transit || c.tr || '').slice(0, 3);
    const opLabel = (c.op || '').slice(0, 3).padEnd(3, ' ');
    const bay2 = String(parseInt(c.bay || '0')).padStart(2, '0');
    const posStr = `....${bay2}${row}${tier}`;

    const isReefer = isReeferContainer(c);
    const tmpStr = String(c.tmp || '').trim();
    // M3.75 fix: 엠티 리퍼는 온도 없는 게 정상 → 경고 X (Full 또는 fe 미정만 경고)
    const isFullReefer = isReefer && (c.fe === 'F' || c.fe === '' || c.fe == null);
    const tmpMissing = isFullReefer && (c.tmp_missing || tmpStr === '');

    let specialLine = '';
    let specialColor = 'text-slate-500';
    if (c.dg) {
      specialLine = c.un ? `DG UN${c.un}` : 'DG';
      specialColor = 'text-red-300 font-bold';
    } else if (isReefer && tmpStr) {
      // 온도 있으면 무조건 표시 (엠티 리퍼도 온도 입력 가능)
      specialLine = `${tmpStr}C`;
      specialColor = 'text-cyan-200 font-bold';
    } else if (isReefer && c.fe === 'E') {
      // M3.75: 엠티 리퍼는 정상 (온도 없는 게 맞음)
      specialLine = 'RF EMPTY';
      specialColor = 'text-cyan-400/70 font-bold';
    } else if (isReefer) {
      // 풀 리퍼 또는 fe 미정 + 온도 없음 → 경고
      specialLine = '⚠NO TEMP';
      specialColor = 'text-red-300 font-black animate-pulse';
    } else if (c.tk) {
      specialLine = 'TANK';
      specialColor = 'text-orange-200 font-bold';
    } else if (c.fr) {
      specialLine = 'FR';
      specialColor = 'text-purple-200 font-bold';
    } else if (c.oog) {
      specialLine = 'OOG';
      specialColor = 'text-purple-200 font-bold';
    }

    // M3.74: 클릭 핸들러 - 다중이면 SlotPickerModal, 단일이면 기존 동작
    const handleCellClick = () => {
      if (stackCount >= 2) {
        onCellClick?.(c, { multi: true, slot: { bay: c.bay, row, tier }, containers: cellList });
      } else {
        onCellClick?.(c);
      }
    };

    // M3.76+M3.78: 컨 종류별 좌측 컬러 바 + 우상단 큰 심볼 (강한 대비)
    // 어떤 셀 배경색(POL/POD 색깔)에서도 명확히 보이도록 흰색 배경 + 컬러 외곽선/글씨
    let typeBarBg = '';      // 좌측 바 배경 (강한 색깔)
    let typeBarBorder = '';  // 좌측 바 우측 테두리 (대비용)
    let typeSymbol = '';
    let typeSymbolColor = '';  // 심볼 글씨색
    if (c.dg) {
      typeBarBg = 'bg-red-600';
      typeBarBorder = 'border-r-2 border-white';
      typeSymbol = '⚠';
      typeSymbolColor = 'text-red-700';
    } else if (isReefer) {
      // 엠티 리퍼는 약간 흐리게, 풀 리퍼는 강하게
      typeBarBg = c.fe === 'E' ? 'bg-cyan-600' : 'bg-cyan-500';
      typeBarBorder = 'border-r-2 border-white';
      typeSymbol = '❄';
      typeSymbolColor = c.fe === 'E' ? 'text-cyan-700' : 'text-cyan-600';
    } else if (c.fr) {
      typeBarBg = 'bg-purple-600';
      typeBarBorder = 'border-r-2 border-white';
      typeSymbol = '⊞';
      typeSymbolColor = 'text-purple-700';
    } else if (c.tk) {
      typeBarBg = 'bg-orange-600';
      typeBarBorder = 'border-r-2 border-white';
      typeSymbol = '▣';
      typeSymbolColor = 'text-orange-700';
    } else if (c.ot || c.oog) {
      typeBarBg = 'bg-fuchsia-600';
      typeBarBorder = 'border-r-2 border-white';
      typeSymbol = '△';
      typeSymbolColor = 'text-fuchsia-700';
    }

    return (
      <button
        key={key}
        onClick={handleCellClick}
        className={`relative border ${cellColor(c)} hover:brightness-125 active:scale-95 transition flex-shrink-0 overflow-hidden`}
        style={{ width: cellW, height: cellH, padding: '3px 4px', fontSize }}
      >
        {/* M3.78: 좌측 컬러 바 - 두껍고 흰색 테두리로 어떤 셀 색깔에도 잘 보임 */}
        {typeBarBg && (
          <div className={`absolute top-0 left-0 bottom-0 ${typeBarBg} ${typeBarBorder} z-10`}
               style={{ width: Math.max(6, Math.round(cellW * 0.1)) }}/>
        )}
        {/* M3.78: 우상단 큰 심볼 - 흰색 배경 + 컬러 글씨 + 컬러 외곽선 (강한 대비) */}
        {typeSymbol && (
          <div className={`absolute top-0 right-0 z-20 bg-white ${typeSymbolColor} font-black leading-none rounded-bl border-2 ${
            isReefer ? 'border-cyan-500' :
            c.dg ? 'border-red-600' :
            c.fr ? 'border-purple-600' :
            c.tk ? 'border-orange-600' :
            'border-fuchsia-600'
          }`}
               style={{ fontSize: Math.max(13, fontSize * 2), padding: '1px 4px', lineHeight: 1 }}>
            {typeSymbol}
            {tmpMissing && (
              <span className="text-red-600 ml-0.5 animate-pulse">!</span>
            )}
          </div>
        )}
        {needsShift && (
          <div className="absolute top-0 left-0 bg-amber-400 text-slate-900 px-0.5 font-black leading-none rounded-br z-10"
            style={{ fontSize: fontSize - 1, marginLeft: typeBarBg ? Math.max(6, Math.round(cellW * 0.1)) + 2 : 0 }}>
            ⬆{needsShift}
          </div>
        )}
        {/* M3.74: 다중 적재 ⊕N 배지 (우상단, 심볼 옆) */}
        {stackCount >= 2 && (
          <div className="absolute top-0 right-0 z-30 bg-amber-500 text-slate-900 font-black leading-none rounded-bl px-0.5"
            style={{ fontSize: fontSize + 1, marginRight: typeSymbol ? Math.max(13, fontSize * 2) + 10 : 0 }}>
            ⊕{stackCount - 1}
          </div>
        )}
        <div className="text-left mono leading-tight w-full" style={{
          whiteSpace: 'pre',
          fontFamily: 'Consolas, "Courier New", monospace',
          paddingLeft: typeBarBg ? Math.max(6, Math.round(cellW * 0.1)) + 2 : 0,
        }}>
          <div className="font-bold" style={{ fontSize: fontSize - 1 }}>
            {polLabel}/{transit ? transit : '   '}<span className={ptk ? 'text-red-700 font-black' : ''}>*{podLabel}</span>
          </div>
          <div className="font-black" style={{ fontSize }}>
            {c.cn || ''}
          </div>
          <div style={{ fontSize: fontSize - 1 }}>
            {opLabel} {fe}{wt.padStart(4, ' ')} {typeLabel}
          </div>
          <div className={specialColor} style={{ fontSize: fontSize - 1, minHeight: fontSize }}>
            {specialLine || '\u00A0'}
          </div>
          <div className="text-slate-600" style={{ fontSize: fontSize - 1 }}>
            {posStr}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-1 inline-block min-w-full">
      {/* 페이지 제목 */}
      <div className="text-center font-black text-amber-300 mb-1" style={{ fontSize: fontSize + 4 }}>
        {page.title}
      </div>

      {/* DECK */}
      <div>
        <div className="text-[10px] text-cyan-400 mb-0.5 font-bold">⬆ DECK</div>
        <div className="flex gap-0.5 mb-0.5">
          <div style={{ width: 24 }}></div>
          {allRows.map((row, idx) => (
            <div key={`dh-${idx}`} className="text-center text-[9px] text-slate-500 mono font-bold flex-shrink-0"
              style={{ width: cellW }}>{row || ''}</div>
          ))}
          <div style={{ width: 24 }}></div>
        </div>
        {deckTiersPadded.map((tier, ti) => (
          <div key={`dt-${ti}`} className="flex gap-0.5 mb-0.5 items-center">
            <div className="text-[9px] text-slate-500 mono font-bold flex-shrink-0 text-right pr-1" style={{ width: 24 }}>{tier || ''}</div>
            {allRows.map((row, ri) => (
              <React.Fragment key={`d-${ti}-${ri}`}>{renderCell(row, tier)}</React.Fragment>
            ))}
            <div className="text-[9px] text-slate-500 mono font-bold flex-shrink-0 pl-1" style={{ width: 24 }}>{tier || ''}</div>
          </div>
        ))}
      </div>

      {/* 해치커버 */}
      <div className="border-t-4 border-slate-100 my-2"></div>

      {/* HOLD */}
      <div>
        <div className="text-[10px] text-amber-400 mb-0.5 font-bold">⬇ HOLD</div>
        {holdTiersPadded.map((tier, ti) => (
          <div key={`ht-${ti}`} className="flex gap-0.5 mb-0.5 items-center">
            <div className="text-[9px] text-slate-500 mono font-bold flex-shrink-0 text-right pr-1" style={{ width: 24 }}>{tier || ''}</div>
            {allRows.map((row, ri) => (
              <React.Fragment key={`h-${ti}-${ri}`}>{renderCell(row, tier)}</React.Fragment>
            ))}
            <div className="text-[9px] text-slate-500 mono font-bold flex-shrink-0 pl-1" style={{ width: 24 }}>{tier || ''}</div>
          </div>
        ))}
        <div className="flex gap-0.5 mt-0.5">
          <div style={{ width: 24 }}></div>
          {allRows.map((row, idx) => (
            <div key={`hb-${idx}`} className="text-center text-[9px] text-slate-500 mono font-bold flex-shrink-0"
              style={{ width: cellW }}>{row || ''}</div>
          ))}
          <div style={{ width: 24 }}></div>
        </div>
      </div>
    </div>
  );
}
