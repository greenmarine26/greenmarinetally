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
import { Maximize2, Printer } from 'lucide-react';   // V8.25: ZoomIn/ZoomOut 제거(핀치 전용)
import { isoToLabel, isoToPdfLabel, fmtPos, normalizeBay, getPortColor, isReeferContainer, isISO403, isISO403PhotoTaken, isBookingSlot, getContainerColorKey, buildContainerColorMap, COLOR_PALETTE, isPyeongtaekPort , slotAdjacencyError } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';
import { extractShipMetaFromVoyage } from '../shipMatrixBuilder.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';
import { isUserOwnedBayDict } from '../utils.js';   // TallyOne 1.11-01: 정본 판정 단일 소스
import { buildEmptyBayRenderData, buildBayGrid, buildBayPagesFromSummary, buildPosMap } from '../cargoPlanCore.js';   // ★ 2.56: 격자·짝은 cargoPlanCore 한 벌
import ShipProfileView from './ShipProfileView.jsx';
import SlotPickerModal from './SlotPickerModal.jsx';
import UnassignedListModal from './UnassignedListModal.jsx';
import { formatDgShort } from '../dgUnDict.js';
// M4.6: 인쇄 컴포넌트
import PrintableCargoPlanV2 from './PrintableCargoPlanV2.jsx';
import PrintableBayDetail from './PrintableBayDetail.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

const IS_TOUCH_DEVICE = typeof window !== 'undefined' && (('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0));

export default function BayPlan({ containers, compMap, xrayMap, restowMap, mode, onOpenContainer, shipImo, shipName, voyageInfo, voyageKey,
  // M4.9f: 5단계(이동) + M5.1: 영역 선택 + 일괄 보관 (선적 전용)
  pendingMove, onCancelMove, onCommitMove,
  enableSelection = false, onBatchToStorage,
  preGoneInfo = null   // 1.69-06: 전항 양하 예정(평택 도착 전 하선) — {ports:Set, list, origin} 또는 null
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [allBaysMode, setAllBaysMode] = useState(true); // 기본 ON: 모든 베이 세로 스크롤
  const [view3D, setView3D] = useState(false); // V7.97: 3D 입체 베이뷰 토글
  // M4.6: 인쇄 모달 상태
  const [printMode, setPrintMode] = useState(null);  // null | 'cargo' | 'detail'

  /* ★ 2.85 — 미르가 «카고플랜 보여줘» 하면 부모가 베이 탭을 열고 신호를 남긴다. 여기서 받아 연다.
       ⚠ 신호는 **한 번만** 쓰고 지운다 — 안 지우면 이 화면에 올 때마다 카고플랜이 다시 열린다. */
  useEffect(() => {
    try {
      if (window.__mirOpenCargo) { window.__mirOpenCargo = 0; setPrintMode('cargo-v2'); }
      /* 2.86: «N번 베이 보여줘» — 그 베이 장으로 옮긴다(BayPlan 이 쓰는 bay-page 앵커). */
      if (window.__mirGoBay != null) {
        const want = window.__mirGoBay; window.__mirGoBay = null;
        setTimeout(() => {
          try {
            const el = document.getElementById('bay-page-' + want)
              || [...document.querySelectorAll('[id^=bay-page-]')].find((n) => {
                const ns = (n.textContent || '').match(/\d+/g) || [];
                if (!ns.length) return false;
                const a = Math.min(...ns.map(Number)), z = Math.max(...ns.map(Number));
                return want >= a && want <= z;
              });
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (e) { /* 못 가도 화면은 열려 있다 */ }
        }, 700);
      }
    } catch (e) { /* 못 열어도 화면은 그대로 */ }
  }, []);
  // M5.0: 인쇄 드롭다운 열림 상태 (컨트롤 바 산뜻하게)
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(() => {
    // V7.99-12: 기본 22% (30%는 큰 베이(데크 많음+홀드)가 한 화면에 안 들어와 홀드가 잘림 — 사용자 제보).
    //   하한 0.15·버튼 0.01단위로 낮춰 현장 미세 조정. +/− 버튼·핀치·휠로 확대 가능.
    return 0.22;
  });
  // M3.74: 다중 적재 슬롯 선택 모달
  const [slotPicker, setSlotPicker] = useState(null);  // { slot: {bay,row,tier}, containers: [...] }
  // M3.87: 선적대상(미배정) 모달
  const [showUnassigned, setShowUnassigned] = useState(false);
  const unassignedCount = useMemo(() =>
    containers.filter(c => !c.bay).length, [containers]);
  // M4.9: ISO403 사진 촬영 통계
  // V9.05-01: 평택분 필터 추가 — 통과화물 리퍼(타항행)까지 사진 대상으로 세던 버그
  //   (SWAT 2607S: 평택 선적 리퍼 0인데 통과 리퍼 16대가 알람 ⚠16으로 표시, 9.2-② 패턴 재발).
  //   판정은 아래 isPtk와 동일 규칙(선적=_inList||POL평택, 양하=POD평택) — TDZ 때문에 지역 정의.
  const iso403Stats = useMemo(() => {
    const ptk = (c) => mode === 'discharge'
      ? isPyeongtaekPort(c.pod)
      : (c._inList || isPyeongtaekPort(c.pol));
    const targets = containers.filter(c => ptk(c) && isISO403(c));
    const taken = targets.filter(c => isISO403PhotoTaken(c));
    return {
      total: targets.length,
      taken: taken.length,
      pending: targets.length - taken.length,
      pendingList: targets.filter(c => !isISO403PhotoTaken(c)),
    };
  }, [containers, mode]);
  // M4.9: ISO403 미촬영 목록 펼치기
  const [showISO403List, setShowISO403List] = useState(false);
  const scrollRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // M5.1 I: 영역 선택 모드 — PC 마우스 드래그로 셀 다중 선택
  //   selectionMode: 토글 (PC만, isMobile에선 자동 OFF)
  //   selectedCns: Set<컨번호> — 선택된 컨테이너들
  //   pendingMove 활성 시 자동 OFF (충돌 방지)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCns, setSelectedCns] = useState(() => new Set());
  useEffect(() => { if (!selectionMode) setSelectedCns(new Set()); }, [selectionMode]);
  useEffect(() => { if (isMobile && selectionMode) setSelectionMode(false); }, [isMobile, selectionMode]);
  useEffect(() => { if (pendingMove && selectionMode) setSelectionMode(false); }, [pendingMove, selectionMode]);

  const toggleCnSelection = (cn) => {
    setSelectedCns(prev => {
      const next = new Set(prev);
      if (next.has(cn)) next.delete(cn); else next.add(cn);
      return next;
    });
  };

  // 평택 대상 (모드별)
  // M6.94.34: _inList(리스트=평택)는 선적 모드에서만. 양하는 pod 평택만.
  //   (양하에서 _inList 인정 시 타항 양하분이 평택으로 잘못 잡힘)
  const isPtk = (c) => mode === 'discharge'
    ? isPyeongtaekPort(c.pod)
    : (c._inList || isPyeongtaekPort(c.pol));

  // 평택 컨번호 set
  // V9.39: **컨번호가 있는 것만** 넣는다. 컨펌전 플랜 슬롯(__SLOT_)은 컨번호가 없어서(확답 ④)
  //   종전엔 `s.add(undefined)`가 되고, 그러면 `has(undefined)`가 true라 **cn 없는 셀이 전부
  //   '우리 화물'로 통과**했다(442행 isOurContainer). 홈 카드에서 370이 1로 뭉개진 것과 같은 원인,
  //   증상만 다르다(개수가 아니라 그림 판정이 뒤집힘). TMPZ처럼 플랜만 오는 배에서 나타난다.
  const dischargeCns = useMemo(() => {
    const s = new Set();
    containers.forEach(c => { if (c.cn && isPtk(c)) s.add(c.cn); });
    return s;
  }, [containers, mode]);

  // ── TallyOne 1.69-06: 전항 양하 예정 통과분은 **화면에서만** 숨긴다 (검수사 확정 2026-08-14, MAMP) ──
  //   "미리 양하하고 오는 거라면 차라리 화면에 안 보여야 함." — 평택 도착 시점엔 이미 내린 화물이라
  //   그 칸은 실제로 빈다. 예측 시프팅(1.45 항로 제외)과 화면이 서로 다른 말을 하던 것을 맞춘다.
  //   ⚠ 리스트(records) 등재분은 POD가 타항이라도 평택 검수 대상(TS — MCAP 62대 사건)이라 숨기지 않고(_inList),
  //   완료 기록이 있는 컨도 숨기지 않는다. 인쇄물(카고플랜 V2·베이상세)은 선사 원본 전체를 그대로 쓴다.
  const preGoneCns = useMemo(() => {
    if (mode !== 'discharge' || !preGoneInfo || !preGoneInfo.ports) return null;
    const hide = new Set();
    containers.forEach((c) => {
      if (!c.cn || c._inList) return;
      if (compMap && compMap[c.cn]) return;
      if (isPyeongtaekPort(c.pod)) return;   // 이중 안전 — 평택분은 어떤 경우에도 숨기지 않는다
      if (preGoneInfo.ports.has(String(c.pod || '').toUpperCase())) hide.add(c.cn);
    });
    return hide.size ? hide : null;
  }, [containers, preGoneInfo, mode, compMap]);
  const viewContainers = useMemo(
    () => (preGoneCns ? containers.filter((c) => !preGoneCns.has(c.cn)) : containers),
    [containers, preGoneCns]);

  // 베이별 그룹화 (전체 EDI 컨테이너로)
  // M3.1: 키를 정규화된 정수 문자열("016"→"16")로 통일 — 이전 데이터/혼합 형식 호환
  const bayGroups = useMemo(() => {
    const g = {};
    viewContainers.forEach(c => {   // 1.69-06: 화면 격자는 숨김 적용본
      if (!c.bay) return;
      const key = normalizeBay(c.bay);
      if (!key) return;
      if (!g[key]) g[key] = [];
      g[key].push(c);
    });
    return g;
  }, [viewContainers]);

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

  // 시프팅 분석: 양하 화물 위에 있는 비양하 컨테이너 = 시프팅 대상(주황+⬆)
  // M6.92.0: compMap 연동 — 시프팅 화물 선적 완료 시 above에서 제외 → ⬆ 사라짐
  const shiftingMap = useMemo(() => {
    const result = { needsShift: {}, shiftCns: {} };
    if (!dischargeCns || dischargeCns.size === 0) return result;
    const tierZone = (t) => parseInt(t) >= 80 ? 'deck' : 'hold';
    for (const c of viewContainers) {   // 1.69-06: 숨김 적용본 — 전항 양하 예정분을 '위에 얹힌 화물'로 안 센다
      if (!c.cn || !dischargeCns.has(c.cn)) continue;   // V9.39: 컨번호 미배정 자리는 쉬프팅 대상이 아니다
      if (!c.bay || !c.tier) continue;
      const zone = tierZone(c.tier);
      const tier = parseInt(c.tier);
      const above = viewContainers.filter(o =>
        // V9.39: 아직 컨번호가 배정되지 않은 자리(플랜 슬롯)는 '위에 얹힌 화물'로 세지 않는다
        o.cn && o.cn !== c.cn && !dischargeCns.has(o.cn) &&
        !(compMap && compMap[o.cn]) &&
        o.bay === c.bay && o.row === c.row && tierZone(o.tier) === zone &&
        parseInt(o.tier) > tier
      );
      if (above.length > 0) {
        result.needsShift[c.cn] = above.length;
        above.forEach(s => { result.shiftCns[s.cn] = true; });
      }
    }
    return result;
  }, [viewContainers, dischargeCns, compMap]);

  // 좌우 균형 (전 베이 통일)
  const globalRowRange = useMemo(() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    for (const c of containers) {
      if (!c.row || !c.tier) continue;
      const n = parseInt(c.row);
      const tier = parseInt(c.tier || 0);
      if (!tier) continue;
      const isDeck = tier >= 80;
      if (n === 0) {
        if (isDeck) deckHas00 = true; else holdHas00 = true;
        continue;
      }
      if (isDeck) {
        if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
        else deckRight = Math.max(deckRight, n);
      } else {
        if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
        else holdRight = Math.max(holdRight, n);
      }
    }
    return {
      maxLeft: Math.max(deckLeft, holdLeft),
      maxRight: Math.max(deckRight, holdRight),
      has00: deckHas00 || holdHas00,
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
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

  // M4.5: .def 베이사전 조회 (진짜 선박 골격 정보)
  //   - 있으면: .def에 등록된 베이만 페이지로 → 빈 베이도 표시, 통로(.def에 없는 짝수)는 자동 생략
  //   - 없으면: 기존 EDI 기반 폴백 (M3.89.1 동작)
  // M5.01 fix: 중복 제거 (Set) — .def 데이터에 베이 번호가 두 번 들어간 케이스 방지
  //   증상: 베이 점프 select에 "BAY 01"이 두 번 나오던 버그
  // V7.01: 계열 대체 시 베이 수 비교용 — 현재 EDI 실제 베이 수
  const ediBayCount = useMemo(() => {
    const s = new Set();
    for (const c of (containers || [])) {
      const n = parseInt(c.bay, 10);
      if (Number.isFinite(n) && n > 0) s.add(n);
    }
    return s.size;
  }, [containers]);

  // V8.22: 빌더와 동일 코드 신원 (code≠선박명 배의 user 매트릭스 조회용)
  // TallyOne 1.13-02: 신원 검증용 — 코드가 콜사인 앞4자로 추론될 수 있어 사전 항목이 남의 배일 수 있다.
  const _vslCode = useMemo(() => {
    try { return extractShipMetaFromVoyage({ info: voyageInfo })?.code || ''; } catch { return ''; }
  }, [voyageInfo]);

  // V7.01: 계열 대체 여부 (배너 표시용)
  const bayDictSubstituted = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const dict = getShipBayDictData(shipImo, shipName, { ediBayCount, vslCode: _vslCode, callsign: voyageInfo?.callsign || '', vslFull: voyageInfo?.vslFull || shipName || '' });
    return dict?._substituted || null;
  }, [shipImo, shipName, ediBayCount, _vslCode]);

  const dictBayList = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const dict = getShipBayDictData(shipImo, shipName, { ediBayCount, vslCode: _vslCode, callsign: voyageInfo?.callsign || '', vslFull: voyageInfo?.vslFull || shipName || '' });
    if (!dict?.bayDef) return null;
    // V7.01: 베이 목록은 baysSummary(카고플랜·빌더와 동일 소스)를 우선.
    //   원인: 일부 사전은 baysSummary가 비었는데 bayList에만 베이 번호가 남아있음(ATRP 등).
    //   bayList를 쓰면 카고플랜·빌더(baysSummary 사용)와 달리 베이플랜만 유령 베이를 그림.
    //   baysSummary의 유효 베이를 우선 사용, 없으면 null → EDI 기반 폴백(유령 bayList 안 씀).
    const summary = dict.bayDef.baysSummary;
    let list = null;
    if (Array.isArray(summary) && summary.length > 0) {
      const sBays = summary
        .map(b => (b.bayNo != null ? b.bayNo : b.bay))
        .filter(x => x != null && String(x).trim() !== '');
      if (sBays.length > 0) list = sBays;
    }
    // baysSummary가 비어있으면 EDI 폴백으로 (bayList는 유령일 수 있어 사용 안 함)
    if (!list) return null;
    if (list.length < 2) return null;
    // 정수 정규화 ("01" → 1, "33" → 33) + 중복 제거 + 정렬
    const ints = list.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n) && n > 0);
    if (ints.length < 2) return null;
    return [...new Set(ints)].sort((a, b) => a - b);
  }, [shipImo, shipName, ediBayCount, _vslCode]);

  // M6.19: 베이사전의 baysSummary를 베이번호 키로 맵핑 (BayPlan에서 베이별 tier 정밀 적용)
  //   v2(deckTiersLocal/holdTiersLocal) + STOWAGE PDF 등록(deckTiers/holdTiers) 양쪽 인식
  // M6.94.0: source='user'면 enrichBayDef 보강 차단 (사용자 데이터 그대로)
  const dictBaysSummary = useMemo(() => {
    if (!shipImo && !shipName) return {};
    const dict = getShipBayDictData(shipImo, shipName, { ediBayCount, vslCode: _vslCode, callsign: voyageInfo?.callsign || '', vslFull: voyageInfo?.vslFull || shipName || '' });
    if (!dict?.bayDef?.baysSummary) return {};
    // source='user'면 보강 차단, AI 임시는 L4 EDI 보정
    // TallyOne 1.11-01: 정본 판정은 조회 경로(source)가 아니라 항목 안쪽(isUserOwnedBayDict). Firebase 경유 정본이 자동 사전 취급되던 결함.
    const enrichedEntry = enrichBayDef(
      { bayDef: dict.bayDef },
      dict._v5Matrix,
      containers,
      isUserOwnedBayDict(dict) ? 'user' : dict.source
    );
    const m = {};
    enrichedEntry.bayDef.baysSummary.forEach(b => {
      m[parseInt(b.bayNo, 10)] = b;
    });
    return m;
  }, [shipImo, shipName, containers, _vslCode]);

  // ★ 2.56: 격자 한 벌(buildBayGrid)·짝 한 벌(buildBayPagesFromSummary)에 넘길 전체 bayDef.
  //   source/_userOwned 를 카고플랜(PrintableCargoPlanV2 dictData)과 같은 방식으로 붙인다.
  const dictBayDefObj = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const dict = getShipBayDictData(shipImo, shipName, { ediBayCount, vslCode: _vslCode, callsign: voyageInfo?.callsign || '', vslFull: voyageInfo?.vslFull || shipName || '' });
    if (!dict?.bayDef?.baysSummary) return null;
    const _isUser = isUserOwnedBayDict(dict);
    const enrichedEntry = enrichBayDef({ bayDef: dict.bayDef }, dict._v5Matrix, containers, _isUser ? 'user' : dict.source);
    return { ...enrichedEntry.bayDef, source: dict.source, _userOwned: _isUser, code: dict.code || '' };
  }, [shipImo, shipName, containers, _vslCode]);

  // V7.52: 전 베이 최대 그리드 폭 — 베이 간 세로 정렬 기준 (사용자 확정).
  //   deck-only 베이(예: TMPZ BAY 01, 4칸)가 좌측 정렬돼 옆 베이(6칸)의 06 위치에
  //   04가 오던 문제 — 모든 베이를 전체 최대 폭 기준 가운데(0.5칸 단위)에 배치.
  //   폭 = 사전 베이들의 max(rowCount, deckCells, holdCells)와 EDI 전체 range 중 최대.
  const globalGridCols = useMemo(() => {
    let w = 1;
    for (const k in dictBaysSummary) {
      const e = dictBaysSummary[k];
      if (!e) continue;
      const dc = Array.isArray(e.deckCells) && e.deckCells.length ? Math.max(...e.deckCells.map(n => parseInt(n) || 0)) : 0;
      const hc = Array.isArray(e.holdCells) && e.holdCells.length ? Math.max(...e.holdCells.map(n => parseInt(n) || 0)) : 0;
      w = Math.max(w, parseInt(e.rowCount) || 0, dc, hc);
    }
    const r = globalRowRange;
    const lenOf = (g) => (g ? Math.ceil((g.maxLeft || 0) / 2) + Math.ceil((g.maxRight || 0) / 2) + (g.has00 ? 1 : 0) : 0);
    w = Math.max(w, lenOf(r?.deck), lenOf(r?.hold));
    return w;
  }, [dictBaysSummary, globalRowRange]);


  // 페이지 = 짝수/홀수 베이 한 쌍 (PDF 처럼)
  // M4.5: .def 베이사전 우선 사용. 사용자 원칙 #8 + 통로 구분 추가
  //   - .def에 있는 베이만 페이지로 (빈 베이도 포함)
  //   - 트리오 [홀수, 짝수, 홀수]: 짝수 베이 = 40ft 페어 페이지
  //   - 단독 홀수 (페어 없음): 단독 페이지
  //   - .def에 없는 짝수 (예: TNJP의 04, 08, 12...) = 통로 → 페이지 생략
  const pages = useMemo(() => {
    const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
    const keyBay = (n) => String(n);

    // 베이 정수 리스트 결정: .def 우선, 없으면 EDI 기반 (폴백)
    let bayInts;
    let usingDictBays = false;
    if (dictBayList && dictBayList.length > 0) {
      bayInts = [...dictBayList];
      usingDictBays = true;
    } else {
      const bays = Object.keys(bayGroups);
      bayInts = bays.map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    }

    if (bayInts.length === 0) return [];

    const out = [];
    const usedOddBays = new Set();

    if (usingDictBays) {
      // ★ 2.56: 짝 짓기는 cargoPlanCore.autoPairBays 한 벌 — 페이지 목록을 buildBayPagesFromSummary 로 받는다.
      //   종전 이 자리의 자체 루프가 «제 짝 짓기 규칙»을 따로 들고 있어 카고플랜과 갈렸다(2.55-02/-03 의 그 자리).
      //   pairEven 만 있고 짝수 entry 가 없는 배(XTPG (08)09 등)도 이제 카고플랜과 같게 짝이 선다.
      const corePages = dictBayDefObj ? buildBayPagesFromSummary(dictBayDefObj) : null;
      if (corePages && corePages.length > 0) {
        for (const p of corePages) {
          if (p.even != null && p.odd != null) {
            out.push({ title: `BAY (${dispBay(p.even)})${dispBay(p.odd)}`, evenBay: keyBay(p.even), oddBay: keyBay(p.odd) });
            usedOddBays.add(keyBay(p.odd));
          } else if (p.even != null) {
            out.push({ title: `BAY ${dispBay(p.even)}`, evenBay: keyBay(p.even), oddBay: null, isStandalone: !!p.isStandalone });
          } else {
            out.push({ title: `BAY ${dispBay(p.odd)}`, evenBay: null, oddBay: keyBay(p.odd) });
          }
        }
      }
    } else {
      // 폴백: 기존 M3.89.1 로직 (EDI 기반)
      const maxBay = Math.max(...bayInts);
      for (let n = 1; n <= maxBay; n++) {
        if (n % 2 === 0) {
          const evenKey = keyBay(n);
          const oddKey = keyBay(n + 1);
          const evenDisp = dispBay(n);
          const oddDisp = dispBay(n + 1);
          const oddInRange = (n + 1) <= maxBay;
          out.push({
            title: oddInRange ? `BAY (${evenDisp})${oddDisp}` : `BAY ${evenDisp}`,
            evenBay: evenKey,
            oddBay: oddInRange ? oddKey : null,
          });
          if (oddInRange) usedOddBays.add(oddKey);
        } else {
          const oddKey = keyBay(n);
          if (!usedOddBays.has(oddKey)) {
            out.push({
              title: `BAY ${dispBay(n)}`,
              evenBay: null,
              oddBay: oddKey,
            });
          }
        }
      }
    }

    return out;
  }, [bayGroups, dictBayList, dictBayDefObj]);

  // M6.92.0: 공통 색 함수 — 양하=선사(c.op), 선적=POD별 (카고플랜 V2와 동일 기준)
  const bayColorMap = useMemo(() => buildContainerColorMap(containers, mode), [containers, mode]);

  // V7.32: 셀 배경색 폐지 — XRAY/선사 배경색이 보라 계열로 겹쳐 혼동(양하 중단 유발).
  //   약속: 셀 배경색은 XRAY 전용. 선사는 글자색(opLabel 색)으로 구분. (cellColor/opColor로 이동)
  //   카고플랜 V2(인쇄물)는 별도 색함수라 4.2 약속(선사 배경) 그대로 유지.
  // V9.57(I12): 항상 null만 돌려주던 getCellBg 죽은 체인(정의→prop→backgroundColor) 제거.

  // V7.32: 선사 글자색 — 양하=선사(c.op)별, 선적=POD별 hex. 셀 배경 대신 opLabel에 적용.
  const getOpColor = (c) => {
    if (!c?.cn) return null;
    if ((xrayMap && xrayMap[c.cn]) || (compMap && compMap[c.cn])) return null;
    const k = getContainerColorKey(c, mode);
    return k ? bayColorMap[k] : null;
  };

  // 셀 Tailwind 클래스
  // V7.32: 선사 배경색 폐지 → 배경은 우리화물/통과만 구분. 선사는 글자색(getOpColor). XRAY만 배경 보라.
  const cellColor = (c) => {
    // V8.25-06: 흰 배경 + 지정색 글자(B안). XRAY 보라 배경 제거(붉은 별로 대체).
    if (!c?.cn) return 'bg-white text-dim-300 border-slate-300';
    if (xrayMap && xrayMap[c.cn]) {
      if (compMap && compMap[c.cn]) return 'bg-emerald-100 text-dim-400 border-emerald-500 ring-1 ring-emerald-400';   // V8.85: XRAY 완료도 초록 배경
      return 'bg-white text-ink-950 border-red-400';
    }
    if (compMap && compMap[c.cn]) return 'bg-emerald-100 text-dim-400 border-emerald-400';   // V8.85: 완료 = 초록 배경(연회색은 통과화물과 혼동 — 사용자 확답 2026-07-12)
    /* ★ 2.84 (검수사 확정 2026-08-29) — **시프팅 칠하기는 정본(restowMap) 한 벌을 쓴다.**
         종전엔 이 화면이 «내 양하분 위에 얹힌 것»을 그 자리에서 세어 칠했다(shiftingMap.shiftCns).
         실측 MCSC 633N — 그렇게 세면 **50대**, 정본은 **95대**. 50 은 전부 95 안에 들어 있었고
         (베이플랜에만 있는 것 0건) 나머지 45 는 «선적 자리를 비우려고 옮기는 컨»이라 안 칠해졌다.
         검수사 — *«베이플랜의 50이 틀렸다가 맞습니다. 분명 시프팅 리스트가 있을 것입니다. 그걸 반영안했습니다»*
       ⛔ 정본을 **이미 prop 으로 받고 있으면서**(restowMap) 카고플랜에 넘기기만 하고 자기 계산을 썼다 —
         그래서 같은 항차 같은 화면 두 장이 시프팅을 50 과 95 로 다르게 셌다.
       ⚠ `shiftingMap.needsShift`(⬆N 배지 — 이 컨 위에 몇 개 얹혔나)는 **다른 정보**라 그대로 둔다. */
    /* ★ 2.84-01 (검수사 실측 2026-08-29) — **선적 베이플랜에도 칠한다.**
         2.84 는 자료만 정본으로 바꾸고 `mode === 'discharge'` 를 그대로 뒀다 —
         그래서 양하는 95, **선적은 0** 이었다.
         검수사 — *«설마 양하는 고치고 선적은 그대로 놓아둘 클로드님이 아닐테니»*
       시프팅은 «내렸다 다시 싣는 것»이라 선적 자리에도 그만큼 있다.
       실측 MCSC — 시프팅 95대가 양하 EDI 95 · 선적 EDI 95 · **양쪽 다 95**.
         표본 MRKU4002140 — 26/04/02 에서 내려 26/02/82 에 다시 실린다.
       그러니 모드를 가리지 않고 같은 컨번호로 칠하면 양쪽이 맞는다. */
    if (restowMap && restowMap[c.cn]) return 'bg-orange-50 text-ink-950 border-orange-500 ring-1 ring-orange-400';
    const isOurContainer = isPtk(c) || (!!c.cn && dischargeCns.has(c.cn));   // V9.39: undefined 오염 차단
    if (isOurContainer) return 'bg-white text-ink-950 border-line-strong';
    return 'bg-slate-50 text-dim-300 border-slate-200';
  };

  // 셀 크기 (zoom 적용) - PDF 5줄 다 보이게
  const baseW = isMobile ? 110 : 140;
  const baseH = isMobile ? 88 : 108;
  const cellW = Math.round(baseW * zoom);
  const cellH = Math.round(baseH * zoom);
  const fontSize = Math.max(8, Math.round(10 * zoom));

  // V8.25-01: 핀치 시작 시점의 줌을 읽기 위한 ref. (useEffect가 zoom마다 재실행되며
  //   pinchStartDist를 0으로 리셋 → 두 번째 손가락 이동에서 ratio=Inf → 300% 고정되던 버그 수정)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
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
        setZoom(z => Math.max(0.15, Math.min(3, z - e.deltaY * 0.001)));
      } else if (e.shiftKey) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches);
        pinchStartZoom = zoomRef.current;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDist = dist(e.touches);
        const ratio = newDist / pinchStartDist;
        setZoom(Math.max(0.15, Math.min(3, pinchStartZoom * ratio)));
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
  }, []);

  if (containers.length === 0) {
    return (
      <div className="bg-ink-900 border border-line rounded-pill p-8 text-center text-dim-400 text-sm">
        베이 데이터 없음 — 자료 탭에서 EDI/ASC 업로드
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-ink-900 border border-line rounded-pill p-8 text-center text-dim-400 text-sm">
        베이 정보 없음
      </div>
    );
  }

  const curPage = pages[pageIdx] || pages[0];

  return (
    <div className="space-y-2">
      {/* V7.01: 계열 대체 안내 — 정확한 베이정보 없어 같은 계열 선박으로 대체 시 */}
      {bayDictSubstituted && (
        <div className="bg-amber-100 border border-amber-600 text-amber-900 rounded-pill p-2 text-xs">
          ⚠ {bayDictSubstituted.fromCode} 베이정보가 없어 같은 계열 {bayDictSubstituted.usedName ? `${bayDictSubstituted.usedName}(${bayDictSubstituted.usedCode})` : bayDictSubstituted.usedCode}(으)로 대체했습니다. 구조가 미세하게 다를 수 있습니다.
        </div>
      )}
      {/* 1.69-06: 전항 양하 예정 통과분 숨김 안내 — 무엇이 왜 안 보이는지 근거를 남긴다 */}
      {preGoneCns && (
        <div className="bg-sky-100 border border-sky-600 text-sky-900 rounded-pill p-2 text-xs">
          ⚓ 전항 양하 예정 {preGoneCns.size}대를 화면에서 숨겼습니다 — {preGoneInfo?.origin || '출항지'} 출항본의 {(preGoneInfo?.list || []).join('·')} 양하분(평택 도착 전 하선). 인쇄물에는 그대로 나옵니다.
        </div>
      )}
      {pendingMove && (
        <div className="bg-amber-500 text-ink-950 rounded-pill p-3 flex items-center gap-3 sticky top-0 z-30 shadow-lg border-2 border-amber-300">
          <span className="text-xl">📦</span>
          <div className="flex-1">
            <div className="text-sm font-black mono">{pendingMove.cn}</div>
            <div className="text-xxs font-bold leading-tight">
              본위치 {pendingMove.fromBay}/{pendingMove.fromRow}/{pendingMove.fromTier} →
              <span className="ml-1 underline">베이그리드에서 빈 셀(점선/X)을 누르세요</span>
            </div>
          </div>
          <button onClick={() => onCancelMove && onCancelMove()}
            className="px-3 py-2 bg-ink-900 text-amber-200 hover:bg-ink-750 rounded text-xs font-black">
            취소
          </button>
        </div>
      )}

      {/* M5.1 I: 영역 선택 진행 바 — 선택 모드 + 1개 이상 */}
      {selectionMode && selectedCns.size > 0 && (
        <div className="bg-sky-700 text-sky-50 rounded-pill p-3 flex items-center gap-2 sticky top-0 z-20 shadow-lg border-2 border-sky-400 flex-wrap">
          <span className="text-base">🔲</span>
          <span className="text-sm font-black">선택 {selectedCns.size}대</span>
          <span className="text-xxs text-sky-200 flex-1 leading-tight min-w-[120px]">
            컨 셀을 더 클릭해서 추가/제외하세요
          </span>
          <button onClick={() => {
              const cns = Array.from(selectedCns);
              onBatchToStorage?.(cns);
              setSelectedCns(new Set());
              setSelectionMode(false);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-black">
            📦 보관함으로
          </button>
          <button onClick={() => setSelectedCns(new Set())}
            className="px-2 py-1.5 bg-sky-900 hover:bg-sky-800 rounded text-xxs font-bold">
            해제
          </button>
        </div>
      )}

      {/* 컨트롤 바 — M5.0: 산뜻하게 정리 (줌 컴팩트 + 인쇄 드롭다운 + 시각적 분리) */}
      {/* TallyOne 1.15: **고정 위치 교정** (검수사 신고 2026-08-06 — "스크롤 대상이 아니다. 베이만 스크롤되고
          이 부분은 고정되어야 한다"). sticky 는 걸려 있었지만 `top-0` 이라 앱 헤더(52px)와
          항차 탭 네비(`sticky top-[52px]`, 높이 ≈38px) 뒤로 숨어 안 보였다. 그 아래로 내린다. */}
      <div className="bg-ink-900 border border-line rounded-pill p-2 flex items-center gap-1.5 flex-wrap sticky top-[92px] z-10 shadow-lg shadow-slate-950/60">
        {/* V8.25-06: PC(터치없음)만 +/− 버튼 표시. 폰은 핀치, PC는 버튼+Ctrl휠 */}
        {!IS_TOUCH_DEVICE && (
          <div className="flex items-center bg-ink-800 rounded-pill overflow-hidden">
            <button onClick={() => setZoom(z => Math.max(0.15, Math.round((z - 0.05) * 100) / 100))} className="px-2 py-1.5 hover:bg-ink-750 text-dim-100 font-black" title="축소">−</button>
            <button onClick={() => setZoom(isMobile ? 0.22 : 1.0)} className="text-xs mono text-dim-200 font-bold px-2 py-1.5 hover:bg-ink-750 border-x border-line" title="기본 배율">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(z => Math.min(3, Math.round((z + 0.05) * 100) / 100))} className="px-2 py-1.5 hover:bg-ink-750 text-dim-100 font-black" title="확대">＋</button>
          </div>
        )}

        {/* 시각적 분리선 */}
        <div className="w-px h-6 bg-ink-750"/>

        {/* 전체 모드 토글 (기본 ON) */}
        <button onClick={() => setAllBaysMode(!allBaysMode)}
          className={`px-2.5 py-1.5 rounded-pill text-xs font-bold transition ${
            allBaysMode ? 'bg-emerald-700 text-emerald-50' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'
          }`}>
          {allBaysMode ? '✓ 전체' : '단일'}
        </button>

        {/* V7.97: 3D 입체 베이뷰 토글 */}
        <button onClick={() => setView3D(v => !v)}
          className={`px-2.5 py-1.5 rounded-pill text-xs font-bold transition ${
            view3D ? 'bg-cyan-600 text-cyan-50' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'
          }`}
          title="3D 입체 베이뷰">
          {view3D ? '✓ ⛴ 측면' : '⛴ 측면'}
        </button>

        {/* M5.0: 인쇄 드롭다운 — 2개 버튼 → 1개 메뉴 */}
        <div className="relative">
          <button onClick={() => setPrintMenuOpen(v => !v)}
            className="px-2.5 py-1.5 rounded-pill text-xs font-bold bg-cyan-800 hover:bg-cyan-700 text-cyan-50 flex items-center gap-1"
            title="인쇄 옵션">
            <Printer className="w-3.5 h-3.5"/>인쇄 ▾
          </button>
          {printMenuOpen && (
            <>
              {/* 백드롭 — 바깥 클릭으로 닫기 */}
              <div className="fixed inset-0 z-20" onClick={() => setPrintMenuOpen(false)}/>
              <div className="absolute top-full left-0 mt-1 bg-ink-800 border border-line-strong rounded-pill shadow-xl z-30 min-w-[180px] overflow-hidden">
                <button onClick={() => { setPrintMode('cargo-v2'); setPrintMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-900 text-xs text-emerald-100 border-b border-line flex items-center gap-2 bg-emerald-950">
                  <span className="text-base">🆕</span>
                  <div>
                    <div className="font-black">카고 플랜 V2 · M6.81 회귀</div>
                    <div className="text-2xs text-emerald-300">카스피 양식 그대로</div>
                  </div>
                </button>
                <button onClick={() => { setPrintMode('detail'); setPrintMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-cyan-900 text-xs text-cyan-100 flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <div className="font-black">베이 상세</div>
                    <div className="text-2xs text-dim-300">베이당 1페이지</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* M5.1 I: PC 영역 선택 토글 (모바일/이동중 비활성, 선적 전용) */}
        {enableSelection && !isMobile && !pendingMove && (
          <button onClick={() => setSelectionMode(v => !v)}
            className={`px-2.5 py-1.5 rounded-pill text-xs font-bold ${
              selectionMode ? 'bg-sky-600 text-sky-50' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'
            }`}
            title="선택 모드 — 컨 셀 클릭하여 다중 선택 → 보관함으로 일괄 이동">
            🔲 {selectionMode ? '선택 ✓' : '선택'}
          </button>
        )}

        {/* 시각적 분리선 — 알림 배지 영역 시작 */}
        {(iso403Stats.total > 0 || (mode === 'loading' && unassignedCount > 0)) && (
          <div className="w-px h-6 bg-ink-750"/>
        )}

        {/* M4.9: ISO403 사진 미촬영 배지 */}
        {iso403Stats.total > 0 && (
          <button onClick={() => setShowISO403List(v => !v)}
            className={`px-2 py-1.5 rounded-pill text-xs font-black flex items-center gap-1 ${
              iso403Stats.pending > 0
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-50 animate-pulse'
                : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
            }`}
            title="풀 리퍼 사진 촬영 대상">
            📷 {iso403Stats.taken}/{iso403Stats.total}
            {iso403Stats.pending > 0 && <span className="bg-blue-900/60 px-1 rounded text-2xs">⚠{iso403Stats.pending}</span>}
          </button>
        )}

        {/* M3.87: 선적 모드 - 미배정(선적대상) 배지 */}
        {mode === 'loading' && unassignedCount > 0 && (
          <button onClick={() => setShowUnassigned(true)}
            className="px-2 py-1.5 rounded-pill text-xs font-black bg-orange-700 hover:bg-orange-600 text-orange-50 flex items-center gap-1">
            🚛 선적대상 {unassignedCount}
          </button>
        )}

        {/* 페이지 네비 (단일 모드일 때만) */}
        {!allBaysMode && (
          <>
            <button onClick={() => setPageIdx(i => Math.max(0, i - 1))}
              disabled={pageIdx === 0}
              className="px-2 py-1 bg-ink-800 disabled:opacity-30 rounded text-xs font-bold text-dim-200">◀</button>
            <span className="text-xs mono text-dim-200 font-bold">{pageIdx + 1} / {pages.length}</span>
            <button onClick={() => setPageIdx(i => Math.min(pages.length - 1, i + 1))}
              disabled={pageIdx === pages.length - 1}
              className="px-2 py-1 bg-ink-800 disabled:opacity-30 rounded text-xs font-bold text-dim-200">▶</button>
          </>
        )}

        {/* 베이 점프 */}
        <select value={pageIdx} onChange={e => {
            const i = parseInt(e.target.value);
            setPageIdx(i);
            if (allBaysMode) {
              // V7.99-11 (메모8): 선택 베이의 "한 페이지 앞"으로 스크롤 → 24 선택 시 23이 맨 위로 와서
              //   23 · (24)25가 한 화면에 같이 보인다. 첫 페이지면 자기 자신.
              const target = Math.max(0, i - 1);
              const el = document.getElementById(`bay-page-${target}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="bg-ink-800 border border-line rounded text-xs text-dim-100 mono px-1 py-1 ml-auto">
          {pages.map((p, i) => (
            <option key={i} value={i}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* M4.9: ISO403 미촬영 목록 펼침 패널 */}
      {showISO403List && iso403Stats.total > 0 && (
        <div className={`border-2 rounded-pill p-3 ${
          iso403Stats.pending > 0
            ? 'bg-blue-950/40 border-blue-700'
            : 'bg-emerald-950/30 border-emerald-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-black flex items-center gap-2">
              <span className="text-lg">📷</span>
              <span className={iso403Stats.pending > 0 ? 'text-blue-200' : 'text-emerald-200'}>
                풀 리퍼 사진 촬영
              </span>
              <span className="text-xs font-bold text-dim-300 mono">
                {iso403Stats.taken}/{iso403Stats.total} 완료
              </span>
              {iso403Stats.pending > 0 && (
                <span className="bg-blue-700 text-white text-2xs px-2 py-0.5 rounded font-black">
                  미촬영 {iso403Stats.pending}대
                </span>
              )}
            </div>
            <button onClick={() => setShowISO403List(false)}
              className="text-xs text-dim-300 hover:text-dim-100">접기 ▲</button>
          </div>
          {iso403Stats.pending === 0 ? (
            <div className="text-xs text-emerald-300 font-bold flex items-center gap-1">
              ✅ 풀 리퍼 모두 사진 촬영 완료
            </div>
          ) : (
            <>
              <div className="text-xxs text-blue-300 mb-2">
                아래 컨테이너를 탭해 사진 촬영 모달을 여세요.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                {iso403Stats.pendingList.map(c => (
                  <button key={c.cn} onClick={() => onOpenContainer && onOpenContainer(c)}
                    className="px-2 py-1.5 bg-ink-800 hover:bg-blue-900 active:bg-blue-800 border border-line hover:border-blue-600 rounded text-left flex items-center gap-2">
                    <span className="text-blue-400 text-base">📷</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black mono text-dim-100 truncate">{c.cn}</div>
                      <div className="text-2xs text-dim-300 mono">
                        {c.iso || '-'} · {c.bay || '-'}/{c.row || '-'}/{c.tier || '-'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 범례 - M3.77: 양하/선적 통일 (POL/POD 색깔 + 평택 노랑 ring) */}
      <div className="bg-ink-900 border border-line rounded-pill p-2 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-2xs">
          <span className="text-dim-400 font-bold uppercase w-12">셀색:</span>
          <span className="text-cyan-300 font-bold">흰 배경 · 글자색 = {mode === 'discharge' ? '선사(양하)' : 'POD(선적)'} 지정색</span>
          <span className="text-red-400 font-bold">★ 붉은별 = X-RAY</span>
          <Legend color="bg-orange-400" label="시프팅"/>
          <Legend color="bg-emerald-200" label="✔ 완료"/>
          <span className="text-dim-400 font-bold">검정 글자 = 비평택</span>
          {/* TallyOne 1.29: 빈 자리와 '배에 칸이 없는 곳'을 눈으로 가른다 */}
          <Legend color="bg-slate-100" label="빈 자리 (아직 안 실림)"/>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-2xs">
          <span className="text-dim-400 font-bold uppercase w-12">종류:</span>
          <span className="flex items-center gap-1"><span className="bg-red-500 w-1 h-3 inline-block rounded-sm"/><span className="text-red-300 font-bold">⚠ DG</span></span>
          <span className="flex items-center gap-1"><span className="bg-cyan-400 w-1 h-3 inline-block rounded-sm"/><span className="text-cyan-300 font-bold">❄ 리퍼</span></span>
          <span className="flex items-center gap-1"><span className="bg-purple-500 w-1 h-3 inline-block rounded-sm"/><span className="text-purple-300 font-bold">⊞ FR</span></span>
          <span className="flex items-center gap-1"><span className="bg-orange-500 w-1 h-3 inline-block rounded-sm"/><span className="text-orange-300 font-bold">▣ TK</span></span>
          <span className="flex items-center gap-1"><span className="bg-fuchsia-500 w-1 h-3 inline-block rounded-sm"/><span className="text-fuchsia-300 font-bold">△ OT</span></span>
        </div>
      </div>

      {/* 베이 그리드 본체 */}
      <div ref={scrollRef} className="bg-ink-950 border border-line rounded-pill p-3 overflow-auto"
           style={{ maxHeight: '78vh' }}>
        {view3D ? (
          // V9.20: 배 옆모습 프로파일 뷰 — 3D 카드뷰 대체 (사용자 선택). 베이 클릭 → 2D 해당 베이로.
          <ShipProfileView
            containers={containers}
            dictBaysSummary={dictBaysSummary}
            mode={mode}
            compMap={compMap}
            xrayMap={xrayMap}
            onPickBay={(bn) => {
              const i = pages.findIndex((pg) => {
                const e = parseInt(pg.evenBay, 10), o = parseInt(pg.oddBay, 10);   // keyBay는 문자열
                return e === bn || o === bn || e === bn - 1 || o === bn + 1;
              });
              if (i >= 0) {
                setView3D(false);
                setPageIdx(i);
                setTimeout(() => {
                  const el = document.getElementById(`bay-page-${Math.max(0, i - 1)}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }
            }}
          />
        ) : allBaysMode ? (
          // 전체 베이 세로 스크롤 (V37 기본 모드)
          // V7.99-11 (메모8): scroll-snap 제거 — 베이를 한 화면에 한 개씩 스냅하던 것이
          //   "23 (24)25를 같이 보고 싶다"를 막았다. 스냅 없이 이어 그리면 한 화면에 여러 베이가
          //   들어오고, 베이 선택 시 scrollIntoView(block:'start')로 그 베이가 맨 위로 와 아래 베이도 보인다.
          <div className="space-y-3">
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
                    // M5.1: 선택 모드면 컨 토글 (모달 안 열림)
                    if (selectionMode && c?.cn) {
                      toggleCnSelection(c.cn);
                      return;
                    }
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
                  getOpColor={getOpColor}
                  globalRowRange={globalRowRange}
            globalGridCols={globalGridCols}
                  globalTiers={globalTiers}
                  dictBaysSummary={dictBaysSummary}
                  dictBayDef={dictBayDefObj}
                  bayStructureMap={bayStructureMap}
                  pendingMove={pendingMove}
                  onEmptyCellClick={(bay, row, tier) => onCommitMove?.(bay, row, tier)}
                  selectionMode={selectionMode}
                  selectedCns={selectedCns}
                  mode={mode}
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
              if (selectionMode && c?.cn) {
                toggleCnSelection(c.cn);
                return;
              }
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
            getOpColor={getOpColor}
            globalRowRange={globalRowRange}
            globalGridCols={globalGridCols}
                  globalTiers={globalTiers}
                  dictBaysSummary={dictBaysSummary}
            dictBayDef={dictBayDefObj}
            bayStructureMap={bayStructureMap}
            pendingMove={pendingMove}
            onEmptyCellClick={(bay, row, tier) => onCommitMove?.(bay, row, tier)}
            selectionMode={selectionMode}
            selectedCns={selectedCns}
            mode={mode}
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

      {/* M4.6: 인쇄 모달 — M4.9: ErrorBoundary로 격리 */}
            {printMode === 'cargo-v2' && (
        <ErrorBoundary name="카고 플랜 V2 (M6.81 회귀)" onClose={() => setPrintMode(null)}>
          <PrintableCargoPlanV2
            /* 1.55-03: 카고플랜은 계획이다 — 부모가 실체로 승격한 좌표를 계획(_edi_*)으로 되돌려 그린다.
               종전엔 PrintHub 경유(계획)와 이 버튼 경유(실적)가 같은 종이에 다른 그림을 냈다(독립 재검증 P1-2). */
            containers={containers.map(c => (c._edi_bay !== undefined && c._edi_bay !== '') ? { ...c, bay: c._edi_bay, row: c._edi_row, tier: c._edi_tier } : c)}
            mode={mode}
            voyageInfo={voyageInfo}
            shipImo={shipImo}
            shipName={shipName}
            xrayMap={xrayMap}
            shiftingMap={restowMap}
            onClose={() => setPrintMode(null)}
          />
        </ErrorBoundary>
      )}
      {printMode === 'detail' && (
        <ErrorBoundary name="베이 상세 인쇄" onClose={() => setPrintMode(null)}>
          <PrintableBayDetail
            containers={containers}
            mode={mode}
            voyageInfo={voyageInfo}
            voyageKey={voyageKey}
            shipImo={shipImo}
            shipName={shipName}
            globalRowRange={globalRowRange}
            globalGridCols={globalGridCols}
            globalTiers={globalTiers}
                  dictBaysSummary={dictBaysSummary}
            dictBayDef={dictBayDefObj}
            onClose={() => setPrintMode(null)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`${color} w-3 h-3 rounded-sm border border-line-strong`}/>
      <span className="text-dim-300">{label}</span>
    </span>
  );
}

// V37 BaySection 100% 이식
function BayPage({ page, bayGroups, completedMap, xrayList, dischargeCns, shiftingMap, isPtk, onCellClick, cellW, cellH, fontSize, isMobile, cellColor, getOpColor, globalRowRange, globalGridCols = 0, bayStructureMap, globalTiers = [], dictBaysSummary = {}, dictBayDef = null,  // V9.57(I12): getCellBg 죽은 체인 제거
  // M4.9f 5단계: 이동 모드 (선적 모드 + pendingMove 활성)
  pendingMove, onEmptyCellClick,
  // M5.1 I: 영역 선택 모드 (선적 전용, PC)
  selectionMode = false, selectedCns,
  // M6.92.5: 양하/선적 모드 (needsShift 표시 제어)
  mode = 'discharge'
}) {
  const evenContainers = page.evenBay ? (bayGroups[page.evenBay] || []) : [];
  const oddContainers = page.oddBay ? (bayGroups[page.oddBay] || []) : [];
  const allContainers = [...evenContainers, ...oddContainers];

  // 40피트/45피트 X 마크
  // M6.2 → M6.3 → M6.7: 짝수 row 컨테이너는 짝꿍 슬롯 차지 → row-1 자리에 X
  //   사용자 버그 (M6.6): isLongContainer가 너무 엄격해서 ISO/라벨 매핑 실패 시 false → X 표시 안 됨
  //   복원: 20ft가 명확한 경우만 제외. 짝수 row에 적재된 컨테이너는 40/45ft로 추정 (실무 일관성)
  const xMarks = useMemo(() => {
    const marks = new Set();
    // V9.24-01: 도메인 규칙으로 교체 (TNJP 26354E 사용자 신고 — 22베이 82단 01/03/05열 가짜 X).
    //   종전 M6.2~M6.7 규칙은 "짝수 열(row)의 40ft가 옆 홀수 열을 차지"라는 추정이었는데,
    //   열은 배 폭 방향이라 물리적으로 잠식이 없다. 40ft 잠식은 베이(앞뒤) 방향뿐이다.
    //   카고플랜(cargoPlanCore 단독 홀수 박스)·베이상세편집(adjMap)과 동일 규칙로 통일:
    //   단독 홀수 베이 페이지에서 인접 짝수 베이(±1)의 40/45ft가 같은 단·열을 차지하면 X.
    //   페어 페이지는 40ft가 병합 박스에 이미 그려지므로 X 없음 (카고플랜·편집기와 동일).
    if (!page.oddBay || page.evenBay) return marks;
    const occupied = new Set();
    for (const c of allContainers) {
      if (c.row && c.tier) occupied.add(`${c.row}-${c.tier}`);
    }
    const isLongContainer = (c) => {
      const iso = c.iso || '';
      const lbl = (isoToLabel ? isoToLabel(iso) : '') || '';
      if (lbl.startsWith('20')) return false;
      if (/^2/.test(iso)) return false;
      return true;
    };
    const oddN = parseInt(page.oddBay, 10);
    for (const adjEven of [oddN - 1, oddN + 1]) {
      if (adjEven <= 0) continue;
      for (const c of (bayGroups[String(adjEven)] || [])) {
        if (!c.row || !c.tier) continue;
        if (!isLongContainer(c)) continue;
        const xKey = `${c.row}-${c.tier}`;
        if (occupied.has(xKey)) continue;
        marks.add(xKey);
      }
    }
    return marks;
  }, [page.oddBay, page.evenBay, allContainers, bayGroups]);

  // M6.75: deck/hold 별 row 양식 — 베이별 다름
  //   페이지 단위 — page.evenBay + page.oddBay 컨테이너 검사
  //   카스피 양식 — deck 8칸 / hold 7칸 (또는 다른) 좌우 대칭
  const pageRange = useMemo(() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    for (const c of allContainers) {
      if (!c.row || !c.tier) continue;
      const n = parseInt(c.row);
      const tier = parseInt(c.tier);
      if (!tier) continue;
      const isDeck = tier >= 80;
      if (n === 0) {
        if (isDeck) deckHas00 = true; else holdHas00 = true;
        continue;
      }
      if (isDeck) {
        if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
        else deckRight = Math.max(deckRight, n);
      } else {
        if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
        else holdRight = Math.max(holdRight, n);
      }
    }
    return {
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
  }, [allContainers]);

  // M6.79 → M6.80: deck/hold 별 row 양식 (특이 선박 지원)
  //   일반: deck/hold 같음 / 특이: deck에 00 있고 hold에 없음 등
  const buildPageRows = (range) => {
    const ml = range?.maxLeft || 0, mr = range?.maxRight || 0;
    if (!ml && !mr) return [];
    const left = []; for (let n = ml; n >= 2; n -= 2) left.push(String(n).padStart(2, '0'));
    const right = []; for (let n = 1; n <= mr; n += 2) right.push(String(n).padStart(2, '0'));
    return range.has00 ? [...left, '00', ...right] : [...left, ...right];
  };

  // ═════════════════════════════════════════════════════════════════
  // M6.94.1: 사전 기반 페이지 그리드 결정 — 사용자 매트릭스 빌더 등록값 우선
  // ─────────────────────────────────────────────────────────────────
  // 증상 fix: 어제 새벽 진단된 카고플랜 3대 버그
  //   ① Hold 3 tier (정상 4) → tier 풀은 pageBayDictTiers로 일부 fix됐으나 row 폭 무관
  //   ② Deck row 7개 (정상 8) → globalRowRange가 EDI 적재만 봐서 rowCount 무시
  //   ③ Deck-Hold 좌우 비대칭 → deck/hold 별 maxLeft/maxRight 따로 계산
  // 해결: 사전이 있으면 deck/hold 통일 그리드 + 시각 중앙선 일치 (사용자 정정 모델)
  //   사용자 정정: "deck 5 + hold 8 양쪽 8칸 통일은 잘못. 중앙선(2.5와 4)이 같아야 대칭"
  //   → 그리드 폭 = max(deckCells, holdCells), 좁은 쪽은 align/padding으로 위치 결정
  //   → 영역 밖 null padding → 빈 placeholder 셀로 시각 정렬 자동
  // 3대 원칙:
  //   ① userBayDict 읽기만 (수정/추론/union 없음)
  //   ② 6단계 fuzzy 매칭은 dictBaysSummary 결정 단계에서 처리됨 (lookupUserBayDict)
  //   ③ 시뮬레이션 → PASS → 빌드 → ZIP
  // ═════════════════════════════════════════════════════════════════
  const pageBayDictGrid = useMemo(() => {
    const bays = [page.evenBay, page.oddBay].filter(bn => bn != null);
    if (bays.length === 0) return null;

    let deckMaxCells = 0, holdMaxCells = 0;
    let pageRowCount = 0;
    let pageHasZero = false;
    let deckAlign = 'center', holdAlign = 'center';
    let deckPadLeft = 0, deckPadRight = 0;
    let holdPadLeft = 0, holdPadRight = 0;
    let foundAny = false;

    bays.forEach(bn => {
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (!db) return;
      foundAny = true;
      // tier별 cells 중 max (가장 넓은 tier의 폭)
      if (Array.isArray(db.deckCells) && db.deckCells.length > 0) {
        const mDeck = Math.max(...db.deckCells.map(n => parseInt(n) || 0));
        if (mDeck > deckMaxCells) deckMaxCells = mDeck;
      }
      if (Array.isArray(db.holdCells) && db.holdCells.length > 0) {
        const mHold = Math.max(...db.holdCells.map(n => parseInt(n) || 0));
        if (mHold > holdMaxCells) holdMaxCells = mHold;
      }
      // rowCount/hasZero (베이 통일 값) — fallback
      if (typeof db.rowCount === 'number' && db.rowCount > pageRowCount) {
        pageRowCount = db.rowCount;
      }
      if (db.hasZero) pageHasZero = true;
      // M6.94.0 align/padding (사용자 시각 편집 필드)
      if (db.deckAlign) deckAlign = db.deckAlign;
      if (db.holdAlign) holdAlign = db.holdAlign;
      if (typeof db.deckPadLeft === 'number') deckPadLeft = db.deckPadLeft;
      if (typeof db.deckPadRight === 'number') deckPadRight = db.deckPadRight;
      if (typeof db.holdPadLeft === 'number') holdPadLeft = db.holdPadLeft;
      if (typeof db.holdPadRight === 'number') holdPadRight = db.holdPadRight;
    });

    if (!foundAny) return null;
    // 그리드 폭 = deck/hold/rowCount 중 가장 넓은 값
    const gridCells = Math.max(deckMaxCells, holdMaxCells, pageRowCount);
    if (gridCells === 0) return null;

    return {
      gridCells,
      hasZero: pageHasZero,
      deckCells: deckMaxCells || gridCells,
      holdCells: holdMaxCells || gridCells,
      deckAlign, holdAlign,
      deckPadLeft, deckPadRight,
      holdPadLeft, holdPadRight,
    };
  }, [page.evenBay, page.oddBay, dictBaysSummary]);

  // ── 매트릭스(베이매트릭스 빌더)와 100% 동일한 단면 렌더 데이터 ──────────
  //   베이플랜이 자체 계산하지 않고, 매트릭스가 쓰는 buildEmptyBayRenderData를 그대로 호출.
  //   "각 선박은 자기 베이매트릭스를 갖고 있고, 베이플랜은 그걸 갖다 쓰기만 한다."
  //   → 매트릭스 미리보기와 베이플랜이 항상 일치. 컨테이너는 active 셀(rowLbl)에 좌표대로 들어감.
  const pageMatrixRender = useMemo(() => {
    const evenBn = page.evenBay != null ? parseInt(page.evenBay, 10) : null;
    const oddBn = page.oddBay != null ? parseInt(page.oddBay, 10) : null;
    const primaryBn = evenBn != null ? evenBn : oddBn;
    if (primaryBn == null) return null;
    const isPair = evenBn != null && oddBn != null;
    const bayKey = isPair
      ? `(${String(evenBn).padStart(2, '0')})${String(oddBn).padStart(2, '0')}`
      : String(primaryBn).padStart(2, '0');

    // ★ 2.56: 격자는 cargoPlanCore.buildBayGrid 한 벌 — «자료만 받고 그림은 베이매트릭스대로».
    //   종전엔 짝 박스 entry 를 짝수 키로 찾았는데 매트릭스는 페어를 홀수 키에 저장한다 —
    //   그래서 entry 를 놓치고 EDI 폴백 격자가 그려졌다(베이플랜이 카고플랜과 갈리던 근본 원인).
    //   buildBayGrid 가 홀수 키로 정규화해 찾고 짝수 entry 의 blockedCells·hatchCount 를 합친다.
    //   posMap 은 매트릭스에 00 명시값이 없을 때 EDI 폴백 판정에만 쓰인다(카고플랜과 같은 규칙).
    if (dictBayDef) {
      try {
        const g = buildBayGrid(dictBayDef, bayKey, { posMap: buildPosMap(allContainers) });
        if (g) return g;
      } catch (e) {
        console.warn('[2.56] buildBayGrid 실패 — EDI 폴백', bayKey, e);
      }
    }

    // 사전(매트릭스)에 이 베이가 없으면 EDI 실데이터로 단면 골격 생성 (신선박·미등록 베이 폴백).
    //   "컨테이너 좌표가 있으니 그 자리에 넣으면 된다" — EDI 컨테이너로 tier별 cells(00 제외 row 수)를 직접 셈.
    let entry = null;
    {
      if (!allContainers || allContainers.length === 0) return null;
      const deckTierSet = new Set(), holdTierSet = new Set();
      const deckRowsByTier = {}, holdRowsByTier = {};
      let dHas0 = false, hHas0 = false;
      for (const c of allContainers) {
        if (!c.row || !c.tier) continue;
        const t = parseInt(c.tier, 10);
        if (!t) continue;
        const isDeck = t >= 80;
        const isZero = parseInt(c.row, 10) === 0;
        if (isDeck) {
          deckTierSet.add(t);
          (deckRowsByTier[t] = deckRowsByTier[t] || new Set()).add(c.row);
          if (isZero) dHas0 = true;
        } else {
          holdTierSet.add(t);
          (holdRowsByTier[t] = holdRowsByTier[t] || new Set()).add(c.row);
          if (isZero) hHas0 = true;
        }
      }
      const deckTiers = [...deckTierSet].sort((a, b) => b - a);
      const holdTiers = [...holdTierSet].sort((a, b) => b - a);
      // tier별 cells = 그 tier의 row 수 (00 제외). buildEmptyBayRenderData가 00칸을 따로 +1.
      const deckCells = deckTiers.map(t => [...(deckRowsByTier[t] || [])].filter(r => parseInt(r, 10) !== 0).length);
      const holdCells = holdTiers.map(t => [...(holdRowsByTier[t] || [])].filter(r => parseInt(r, 10) !== 0).length);
      entry = {
        bayNo: String(primaryBn).padStart(2, '0'),
        deckTiers, holdTiers, deckCells, holdCells,
        deckHasZero: dHas0, holdHasZero: hHas0, hasZero: dHas0 || hHas0,
      };
    }

    // 베이매트릭스가 기본(진실). 매트릭스에 deck/holdHasZero가 명시돼 있으면 그것을 우선.
    //   사용자가 매트릭스에 데크00 체크 → 그 베이는 00 구조(09 안 생김). EDI에 00 화물이 없어도 매트릭스 따름.
    //   (이전 버그: EDI has00으로 매트릭스를 덮어써서, 선적분에 00 화물 없으면 09가 생기던 문제.)
    //   매트릭스에 값이 없을 때만 EDI 실데이터로 폴백 판정.
    const ediHasDeck = pageRange.deck.maxLeft > 0 || pageRange.deck.maxRight > 0 || pageRange.deck.has00;
    const ediHasHold = pageRange.hold.maxLeft > 0 || pageRange.hold.maxRight > 0 || pageRange.hold.has00;
    const matrixDeckZero = (entry.deckHasZero != null) ? entry.deckHasZero : (entry.hasZero != null ? entry.hasZero : null);
    const matrixHoldZero = (entry.holdHasZero != null) ? entry.holdHasZero : (entry.hasZero != null ? entry.hasZero : null);
    const effEntry = {
      ...entry,
      // 매트릭스 명시값 우선 → 없으면(null) EDI 판정 → 그것도 없으면 EDI 컨테이너 있을 때 has00
      deckHasZero: matrixDeckZero != null ? matrixDeckZero : (ediHasDeck ? pageRange.deck.has00 : false),
      holdHasZero: matrixHoldZero != null ? matrixHoldZero : (ediHasHold ? pageRange.hold.has00 : false),
    };
    try {
      return buildEmptyBayRenderData(effEntry, bayKey, isPair);
    } catch (e) {
      // V9.57(I12): 빈 catch — 매트릭스 렌더 실패가 조용히 빈 베이로 보이던 것. 로그 남김.
      console.warn('[V9.57] 베이 매트릭스 렌더 실패', bayKey, e);
      return null;
    }
  }, [page.evenBay, page.oddBay, dictBayDef, pageRange, allContainers]);

  // 좌표 기반 레이아웃: 데크/홀드 각자 자기 축으로 배치 (데크엔 00 자리 안 만듦).
  //   두 축의 '중심선'을 맞춰 정렬 → 데크 02|01 경계와 홀드 00이 같은 세로선. 데크에 빈 00 칸 안 생김.
  // ★ 2.56-01: 이 페이지 실컨의 «열-단» 집합 — 차단 자리에 실데이터가 있으면 자리만 비우지 않고 그린다.
  const pageCellCns = useMemo(() => {
    const st = new Set();
    for (const c of allContainers) {
      if (c.row == null || c.tier == null) continue;
      st.add(`${String(c.row).padStart(2, '0')}-${String(c.tier).padStart(2, '0')}`);
    }
    return st;
  }, [allContainers]);

  const pageCoordLayout = useMemo(() => {
    if (!pageMatrixRender) return null;
    const deckRows = pageMatrixRender.deckRows.filter(r => !r.invisible);
    const holdRows = pageMatrixRender.holdRows.filter(r => !r.invisible);
    // ★ 2.56-01: 축은 격자 한 벌의 rowPos 그대로 — 차단열(blockedCells)도 «자리»는 남긴다.
    //   종전엔 active 셀의 rowLbl 만 모아 축을 만들어 차단열이 통째로 접혔다 — SWTD 09베이의
    //   00·01(전단 차단)이 사라져 좌우 블록이 붙었고, 33베이의 09(우현 끝 한 줄)가 가운데로 왔다.
    //   CASP 실물은 차단 자리를 비워 두고 좌우가 갈라진다. 검수사 «베이플랜은 바뀐게 없습니다» 의 원인.
    //   rowPos 는 EDI 폴백 격자에도 있다(그땐 전 칸 active — 축이 종전과 같아 회귀 없음).
    const deckAxis = deckRows.length > 0 ? (pageMatrixRender.deckRowPos || []).slice() : [];
    // 홀드 단이 하나도 없으면(데크 전용 베이) 축도 비운다 — 라벨만 홀로 찍히지 않게.
    const holdAxis = holdRows.length > 0 ? (pageMatrixRender.holdRowPos || []).slice() : [];
    const deckRowX = {}; deckAxis.forEach((r, i) => { deckRowX[r] = i; });
    const holdRowX = {}; holdAxis.forEach((r, i) => { holdRowX[r] = i; });
    // 중심선 정렬: 각 축의 중심(칸 수/2)을 맞춤.
    // V7.52: 기준 폭 = 전 베이 최대(globalGridCols) — 베이 내부(데크↔홀드)와
    //   베이 간(위아래 박스) 정렬을 같은 공식으로. 0.5칸 단위 보정 (지침 4.4 확장).
    const nCols = Math.max(deckAxis.length, holdAxis.length, globalGridCols || 0);
    const deckOff = (nCols - deckAxis.length) / 2;     // 데크를 중앙에 (0.5칸 단위 가능)
    const holdOff = (nCols - holdAxis.length) / 2;
    return { deckRows, holdRows, deckAxis, holdAxis, deckRowX, holdRowX, deckOff, holdOff, nCols };
  }, [pageMatrixRender, globalGridCols]);

  //   N=8 hasZero=false → [08,06,04,02,01,03,05,07]
  const buildGridRowsFromCells = (cells, hasZero) => {
    if (!cells || cells === 0) return [];
    const nonZero = hasZero ? Math.max(0, cells - 1) : cells;
    const leftCount = Math.ceil(nonZero / 2);
    const rightCount = nonZero - leftCount;
    const left = [];
    for (let i = leftCount; i >= 1; i--) left.push(String(i * 2).padStart(2, '0'));
    const right = [];
    for (let i = 1; i <= rightCount; i++) right.push(String(i * 2 - 1).padStart(2, '0'));
    return hasZero ? [...left, '00', ...right] : [...left, ...right];
  };

  // 그리드 안에서 own 영역을 align/padding 기준 위치에 배치 (영역 밖 = null)
  //   align='center' default → 중앙선 일치 (사용자 정정 모델)
  //   align='left'/'right' → padLeft/padRight 미세 조정 가능
  const sliceWithAlign = (gridRowsArr, ownCells, align, padLeftAdj, padRightAdj) => {
    const grid = gridRowsArr.length;
    if (ownCells >= grid) return [...gridRowsArr]; // 풀 차지
    const remain = grid - ownCells;
    let padLeft = Math.floor(remain / 2);
    let padRight = remain - padLeft;
    if (align === 'left') { padLeft = 0; padRight = remain; }
    else if (align === 'right') { padLeft = remain; padRight = 0; }
    padLeft = Math.max(0, Math.min(grid, padLeft + (padLeftAdj || 0)));
    padRight = Math.max(0, Math.min(grid - padLeft, padRight + (padRightAdj || 0)));
    const ownStart = padLeft;
    const ownEnd = grid - padRight;
    return gridRowsArr.map((r, i) => (i >= ownStart && i < ownEnd) ? r : null);
  };

  // voyage 전체 deck/hold 별 (EDI 기반 — fallback용)
  const voyDeck = globalRowRange?.deck || pageRange.deck;
  const voyHold = globalRowRange?.hold || pageRange.hold;
  const baseDeckRowsArr = buildPageRows(voyDeck);
  const baseHoldRowsArr = buildPageRows(voyHold);

  // 최종 row 배열: 사전 있으면 그리드+align, 없으면 기존 EDI 동작 (회귀 없음)
  const gridRowsArr = pageBayDictGrid
    ? buildGridRowsFromCells(pageBayDictGrid.gridCells, pageBayDictGrid.hasZero)
    : null;
  const deckRowsArr = pageBayDictGrid && gridRowsArr
    ? sliceWithAlign(gridRowsArr, pageBayDictGrid.deckCells, pageBayDictGrid.deckAlign,
                     pageBayDictGrid.deckPadLeft, pageBayDictGrid.deckPadRight)
    : baseDeckRowsArr;
  const holdRowsArr = pageBayDictGrid && gridRowsArr
    ? sliceWithAlign(gridRowsArr, pageBayDictGrid.holdCells, pageBayDictGrid.holdAlign,
                     pageBayDictGrid.holdPadLeft, pageBayDictGrid.holdPadRight)
    : baseHoldRowsArr;
  // M6.94.3 fix: 헤더용 row 배열도 deck/hold 각자 own 폭만 (가운데 정렬)
  //   증상: hold cells=7인데 헤더에 row 08 (deck 8 grid의 가장 왼쪽)이 표시됨 — 사용자 정정.
  //   원인: 이전 M6.94.1에서 헤더를 그리드 풀폭(gridRowsArr)으로 통일 → 없는 row까지 라벨 표시.
  //   해결: 헤더도 own cells 폭으로 만들고 sliceWithAlign으로 가운데 배치 → 중앙선은 유지, 없는 row는 안 보임.
  //   sliceWithAlign 결과의 null은 row 라벨 렌더링 시 빈 칸으로 처리됨 (cells와 동일 흐름).
  const deckHeaderRowsArr = pageBayDictGrid && gridRowsArr
    ? sliceWithAlign(gridRowsArr, pageBayDictGrid.deckCells, pageBayDictGrid.deckAlign,
                     pageBayDictGrid.deckPadLeft, pageBayDictGrid.deckPadRight)
    : deckRowsArr;
  const holdHeaderRowsArr = pageBayDictGrid && gridRowsArr
    ? sliceWithAlign(gridRowsArr, pageBayDictGrid.holdCells, pageBayDictGrid.holdAlign,
                     pageBayDictGrid.holdPadLeft, pageBayDictGrid.holdPadRight)
    : holdRowsArr;

  // 좌우 균형 (전 베이 통일 폭) — fallback 양식
  const maxLeft = globalRowRange?.maxLeft || 0;
  const maxRight = globalRowRange?.maxRight || 0;
  const has00 = globalRowRange?.has00 || false;

  const allLeftRows = [];
  for (let n = maxLeft; n >= 2; n -= 2) {
    allLeftRows.push(String(n).padStart(2, '0'));
  }
  const allRightRows = [];
  for (let n = 1; n <= maxRight; n += 2) {
    allRightRows.push(String(n).padStart(2, '0'));
  }
  const centerRows = has00 ? ['00'] : [];
  // allRows (legacy fallback) — deck/hold union
  const allRows = (deckRowsArr.length || holdRowsArr.length)
    ? [...new Set([...deckRowsArr, ...holdRowsArr])].sort((a, b) => {
        const an = a === '00' ? 0 : parseInt(a);
        const bn = b === '00' ? 0 : parseInt(b);
        const aIsEven = an > 0 && an % 2 === 0;
        const bIsEven = bn > 0 && bn % 2 === 0;
        if (aIsEven && !bIsEven) return -1;
        if (!aIsEven && bIsEven) return 0.18;
        if (aIsEven) return bn - an;
        return an - bn;
      })
    : [...allLeftRows, ...centerRows, ...allRightRows];

  // DECK / HOLD 분리 + 상하 균형
  // M3.87: globalTiers 사용 (선박 전체 tier 풀) — 베이가 한 컨만 있어도 모든 슬롯 표시
  // M6.19: 페이지 베이의 베이사전 정밀 tier 데이터 우선 포함
  //   v2(deckTiersLocal/holdTiersLocal) + STOWAGE PDF(deckTiers/holdTiers) 양쪽 인식
  const pageBayDictTiers = useMemo(() => {
    const deck = new Set();
    const hold = new Set();
    [page.evenBay, page.oddBay].forEach(bn => {
      if (bn == null) return;
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (!db) return;
      (db.deckTiersLocal || db.deckTiers || []).forEach(t => deck.add(String(t).padStart(2, '0')));
      (db.holdTiersLocal || db.holdTiers || []).forEach(t => hold.add(String(t).padStart(2, '0')));
    });
    return { deck, hold };
  }, [page.evenBay, page.oddBay, dictBaysSummary]);

  const hasDictTiers = pageBayDictTiers.deck.size > 0 || pageBayDictTiers.hold.size > 0;
  const allTiers = hasDictTiers
    ? Array.from(new Set([
        ...pageBayDictTiers.deck,
        ...pageBayDictTiers.hold,
        ...allContainers.map(c => c.tier).filter(Boolean),
        ...Array.from(xMarks).map(k => k.split('-')[1])
      ]))
    : Array.from(new Set([
        ...globalTiers,
        ...allContainers.map(c => c.tier).filter(Boolean),
        ...Array.from(xMarks).map(k => k.split('-')[1])
      ]));
  const deckTiers = allTiers.filter(t => parseInt(t) >= 80).sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = allTiers.filter(t => parseInt(t) < 80).sort((a, b) => parseInt(b) - parseInt(a));

  const tierMax = Math.max(deckTiers.length, holdTiers.length);
  const deckTiersPadded = [...Array(tierMax - deckTiers.length).fill(null), ...deckTiers];
  const holdTiersPadded = [...holdTiers, ...Array(tierMax - holdTiers.length).fill(null)];

  // M4.9f 5단계: pendingMove 타겟 베이 결정
  //   원본 베이가 짝수면 페이지의 evenBay로, 홀수면 oddBay로 (같은 종류 슬롯 보장)
  //   매칭 안 되면 이 페이지에서는 클릭 못 함 (다른 페이지로 스크롤해서 옮기기)
  const moveTargetBay = (() => {
    if (!pendingMove) return null;
    if (!pendingMove.fromBay) {
      // V9.28: 미배정 컨(본위치 없음) — 규격으로 짝/홀 판정 (40/45=짝수 베이, 20=홀수 베이)
      const lbl = (isoToLabel ? isoToLabel(pendingMove.iso || '') : '') || '';
      if (lbl.startsWith('40') || lbl.startsWith('45')) return page.evenBay || null;
      if (lbl.startsWith('20')) return page.oddBay || (page.isStandalone ? page.evenBay : null);
      return null;   // 규격 미상 — 안전측 (배치 불가)
    }
    const fromN = parseInt(pendingMove.fromBay);
    if (!fromN) return null;
    if (fromN % 2 === 0) return page.evenBay || null;
    return page.oddBay || null;
  })();
  const isMoveActiveHere = !!pendingMove && !!moveTargetBay;

  // V9.28-02: 배치 후보 = "화물이 실리는 단의 빈 칸" (사용자 정정 2차 — "미배정이 14대면 빈 곳도 14곳,
  //   빈 자리를 찾아야 하는 것").  좌표 하나하나가 계획에 있어야 하는 게 아니라(그러면 1곳뿐),
  //   계획이 화물을 올리는 단(예: 88단 만적인데 비어 있는 86단 칸들)의 빈 칸이 곧 빈 자리다.
  //   같은 베이·같은 단에 화물(계획·실체)이 하나라도 있으면 그 단의 빈 칸을 📦+ 후보로 켠다.
  //   V9.28-03: 이 지점은 페이지 하위 스코프 — containers가 없어 'containers is not defined' 크래시.
  //   같은 스코프의 bayGroups(전 베이 컨 묶음)로 계산한다.
  // V9.28-04: 물리 검사용 전 컨 유효 좌표 평탄 목록 (인접 40ft·40위20 규칙 — utils.slotAdjacencyError 단일 소스)
  const effAll = useMemo(() => {
    const out = [];
    for (const [bk, list] of Object.entries(bayGroups)) {
      for (const c of list) if (c.row && c.tier) out.push({ cn: c.cn, bay: bk, row: c.row, tier: c.tier, iso: c.iso || c.tp || '' });
    }
    return out;
  }, [bayGroups]);
  const occupiedTierSet = useMemo(() => {
    const set = new Set();
    for (const [bk, list] of Object.entries(bayGroups)) {
      const bn = parseInt(bk, 10);
      if (!Number.isFinite(bn)) continue;
      for (const c of list) if (c.tier) set.add(`${bn}-${c.tier}`);
    }
    return set;
  }, [bayGroups]);

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
  // V9.57(I12): 미호출 getCell 제거 — 실제 사용은 getCellAll(다중 적재)뿐
  const isXmark = (row, tier) => {
    if (!row || !tier) return false;
    return xMarks.has(`${row}-${tier}`);
  };

  // 한 셀 렌더링 — V37 PDF 5줄 형식
  const renderCell = (row, tier) => {
    const key = `${row || '_'}-${tier || '_'}`;
    if (!row || !tier) {
      return <div key={key} className="border border-dashed border-line flex-shrink-0 bg-ink-950"
        style={{ width: cellW, height: cellH }}/>;
    }
    // M3.74: 다중 적재 검출
    const cellList = getCellAll(row, tier);
    const c = cellList[0] || null;
    const stackCount = cellList.length;  // 1이면 단일, 2+면 다중
    if (!c && isXmark(row, tier)) {
      // M4.9f 5단계: 이동 모드에서도 X마크는 다른 컨이 점유 → 비활성 (클릭 무시)
      return (
        <div key={key} className="border border-line bg-ink-800 flex-shrink-0 flex items-center justify-center"
          style={{ width: cellW, height: cellH }}>
          <span className="text-dim-400 font-black" style={{ fontSize: fontSize * 2.5 }}>×</span>
        </div>
      );
    }
    if (!c) {
      // M4.9f 5단계: 이동 모드 + 같은 종류(짝/홀) 베이 페이지에서만 빈 셀 클릭 가능
      // V9.28-02: + 화물이 실리는 단의 빈 칸만 (완전히 빈 단·계획 밖 공간은 후보 아님)
      // V9.28-04: 물리 검사 통과 칸만 후보 — 40ft 양옆 홀수 점유(FBIU 20-03-82)·40ft 위 20ft(SEGU 25-06-90) 차단.
      //   저장 가드(slotAdjacencyError)와 같은 함수를 써서 표시와 저장이 절대 어긋나지 않게 한다.
      const _tbN = parseInt(moveTargetBay, 10);
      const _phyErr = isMoveActiveHere
        ? slotAdjacencyError({ cn: pendingMove.cn, iso: pendingMove.iso }, _tbN, row, tier, effAll)
        : 'off';
      if (isMoveActiveHere && !_phyErr && occupiedTierSet.has(`${_tbN}-${tier}`)) {
        return (
          <button key={key}
            onClick={() => onEmptyCellClick?.(moveTargetBay, row, tier)}
            className="border-2 border-amber-400 bg-amber-500/20 hover:bg-amber-400/40 active:bg-amber-300/60 flex-shrink-0 flex items-center justify-center transition cursor-pointer"
            style={{ width: cellW, height: cellH }}
            title={`${moveTargetBay}/${row}/${tier} 로 이동`}>
            <span className="text-amber-200 font-black" style={{ fontSize: Math.max(10, fontSize) }}>📦+</span>
          </button>
        );
      }
      // TallyOne 1.29: **컨이 떠난 자리를 '배에 없는 칸'처럼 어둡게 남기지 않는다.**
      //   검수사 지적 2026-08-08: *"비어 있다면 빈자리가 표시되어야 합니다. 그런데 검은색입니다.
      //   뭔가 있는거죠 고스트"* — 컨을 88단에서 84단으로 옮기면 88단이 어둡게 남아, 배에 칸이
      //   아예 없는 90단(`bg-ink-950`)과 눈으로 구분이 안 됐다. 실제로는 **그냥 빈 자리**다.
      //   → 화물이 실리는 단이면 흰 빈 칸으로 그린다. 화물이 안 실리는 단·구조 밖은 종전대로 어둡게.
      //   TallyOne 1.32 정정: **단이 아니라 자리(열+단) 기준으로 본다.**
      //     1.29는 `some(x => x.tier === tier)` 로 단만 보고 그 단의 **전 열**을 빈 자리로 그렸다.
      //     그래서 배에 아예 없는 칸까지 흰 자리가 됐다 — 검수사 지적 2026-08-09:
      //     *"앞베이는 선적할 자리는 다 채웠는데 임의로 빈곳을 만들어 놨습니다."*
      //     실측: BAY(34)35 82단은 계획에 3~6자리뿐인데 11자리가 그려졌다. 없는 자리에 컨을 배정할 수 있게 된다.
      //   → 계획(`_row_planned`)이든 현재 위치든 **그 자리를 쓰는 컨이 하나라도 있었으면** 자리가 있는 것이다.
      //     8587이 떠난 BAY38 09-88 은 계획에 있으므로 빈 자리로 남고, BAY34 82단 10·09 는 어둡게 남는다.
      const slotExists = allContainers.some(x =>
        (x.row === row && x.tier === tier) ||
        (x._row_planned === row && x._tier_planned === tier)
      );
      if (slotExists) {
        return <div key={key} className="border border-line-strong flex-shrink-0 bg-slate-100"
          style={{ width: cellW, height: cellH }}/>;
      }
      return <div key={key} className="border border-dashed border-line flex-shrink-0 bg-ink-950/40"
        style={{ width: cellW, height: cellH }}/>;
    }

    const needsShift = mode === 'discharge' ? shiftingMap.needsShift[c.cn] : null;
    // V7.99-14: 셀이 좁아 전체 정보(5줄)가 안 들어가면 끝4자리 컴팩트 모드.
    //   기준은 줌 값이 아니라 실제 셀 폭(cellW) — baseW와 무관하게 일관 동작.
    //   monospace 4자(+여백) ≈ 폰트*2.6 이므로 폭에서 역산, 6~13px로 클램프.
    const compactCell = cellW < 42;
    const compactFont = compactCell ? Math.max(6, Math.min(13, Math.floor((cellW - 4) / 2.6))) : fontSize;
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
    let specialColor = 'text-dim-400';
    if (c.dg) {
      // M5.79: UN 코드북에서 짧은 화물명 (예: "에탄올 (Cl.3)") - 베이 셀이 좁아서 짧게
      specialLine = c.un ? formatDgShort(c.un) : 'DG';
      specialColor = 'text-red-300 font-bold';
    } else if (isBookingSlot(c)) {
      // M5.79: 평택 적재 부킹 슬롯 (컨번호 미입력) — 베이그리드에 표시
      specialLine = '📝대기';
      specialColor = 'text-amber-300 font-bold';
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

    // M5.1 I: 선택 모드 시 선택된 컨 시각 표시
    const isSelected = selectionMode && selectedCns && selectedCns.has(c.cn);

    return (
      <button
        key={key}
        onClick={handleCellClick}
        className={`relative border ${cellColor(c)} hover:brightness-125 active:scale-95 transition flex-shrink-0 overflow-hidden ${
          isSelected ? 'ring-4 ring-sky-400 ring-inset' : ''
        }`}
        style={{ width: cellW, height: cellH, padding: compactCell ? '1px' : '3px 4px', fontSize }}
      >
        {/* M3.78: 좌측 컬러 바 - 두껍고 흰색 테두리로 어떤 셀 색깔에도 잘 보임 */}
        {typeBarBg && !compactCell && (
          <div className={`absolute top-0 left-0 bottom-0 ${typeBarBg} ${typeBarBorder} z-10`}
               style={{ width: Math.max(6, Math.round(cellW * 0.1)) }}/>
        )}
        {/* M3.78: 우상단 큰 심볼 - 흰색 배경 + 컬러 글씨 + 컬러 외곽선 (강한 대비) */}
        {typeSymbol && !compactCell && (
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
        {needsShift && !compactCell && (
          <div className="absolute top-0 left-0 bg-amber-400 text-ink-950 px-0.5 font-black leading-none rounded-br z-10"
            style={{ fontSize: fontSize - 1, marginLeft: typeBarBg ? Math.max(6, Math.round(cellW * 0.1)) + 2 : 0 }}>
            ⬆{needsShift}
          </div>
        )}
        {/* M3.74: 다중 적재 ⊕N 배지 (우상단, 심볼 옆) */}
        {stackCount >= 2 && !compactCell && (
          <div className="absolute top-0 right-0 z-30 bg-amber-500 text-ink-950 font-black leading-none rounded-bl px-0.5"
            style={{ fontSize: fontSize + 1, marginRight: typeSymbol ? Math.max(13, fontSize * 2) + 10 : 0 }}>
            ⊕{stackCount - 1}
          </div>
        )}
        {/* V8.25-06: XRAY = 붉은 별(한쪽 구석). 보라 배경 폐지 */}
        {xrayList && xrayList[c.cn] && !compactCell && (
          <div className="absolute z-40" style={{ top: 0, right: 1, color: '#dc2626', fontSize: Math.max(12, Math.round(fontSize * 1.7)), lineHeight: 1, fontWeight: 'bold', textShadow: '0 0 1px #fff,0 0 1px #fff' }}>★</div>
        )}
        {/* V8.85: 완료 = 중앙 ✔ 워터마크 — 야외에서 완료/미완료 한눈 구분(초록 배경과 세트, 사용자 확답 2026-07-12) */}
        {completedMap && completedMap[c.cn] && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
               style={{ color: '#059669', opacity: 0.32, fontWeight: 900, fontSize: Math.max(12, Math.round(cellH * 0.6)), lineHeight: 1 }}>✔</div>
        )}
        {compactCell ? (
          <div className="w-full h-full flex items-center justify-center mono font-black leading-none" style={{ position: 'relative', fontFamily: 'Consolas, "Courier New", monospace', fontSize: compactFont, color: getOpColor && getOpColor(c) ? getOpColor(c) : '#111' }}>
            {xrayList && xrayList[c.cn] && <span style={{ position: 'absolute', top: 0, right: 1, color: '#dc2626', fontSize: Math.max(8, Math.round(compactFont * 0.95)), lineHeight: 1 }}>★</span>}
            {isBookingSlot(c) ? '📝' : ((c.cn || '').slice(-4) || '')}
          </div>
        ) : (() => {
          // V8.25-06: 새 분배 배치 + B안 색(선사=양하/POD=선적 + 특수만 지정색, 나머지 검정)
          const cc = getOpColor && getOpColor(c);
          const isLoad = mode === 'loading';
          const podColor = isLoad ? cc : null;
          const carrierColor = isLoad ? null : cc;
          const specCol = (specialLine && specialLine.indexOf('⚠') >= 0) ? '#b91c1c' : (cc || null);
          return (
          <div className="mono leading-tight w-full" style={{
            fontFamily: 'Consolas, "Courier New", monospace', fontWeight: 'bold', color: '#111',
            paddingLeft: typeBarBg ? Math.max(6, Math.round(cellW * 0.1)) + 2 : 1, paddingRight: 1,
            display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-evenly',
          }}>
            <div style={{ fontSize: fontSize - 1, display: 'flex', justifyContent: 'space-between' }}>
              <span>{polLabel}/{transit ? transit : '   '}</span>
              <span style={podColor ? { color: podColor } : undefined}>*{podLabel}</span>
            </div>
            <div style={{ fontSize, textAlign: 'left', letterSpacing: '0.3px' }}>
              {isBookingSlot(c) ? <span style={{ color: '#b45309' }}>📝 대기</span> : (c.cn || '')}
            </div>
            <div style={{ fontSize: fontSize - 1, display: 'flex', justifyContent: 'space-between' }}>
              <span style={carrierColor ? { color: carrierColor } : undefined}>{(opLabel || '').trim()}</span>
              <span>{fe}{wt}</span>
              <span>{typeLabel}</span>
            </div>
            <div style={{ fontSize: fontSize - 1, minHeight: fontSize, textAlign: 'center', color: specCol || undefined }}>
              {specialLine || '\u00A0'}
            </div>
            <div style={{ fontSize: fontSize - 1, textAlign: 'center', color: '#666' }}>
              {posStr}
            </div>
          </div>
          );
        })()}
      </button>
    );
  };

  return (
    <div className="space-y-1 inline-block min-w-full">
      {/* 페이지 제목 */}
      <div className="text-center font-black text-amber-300 mb-1" style={{ fontSize: fontSize + 4 }}>
        {page.title}
      </div>

      {pageCoordLayout ? (() => {
        // ── 좌표 기반: 데크/홀드 각자 자기 축. 중심선 맞춤. 데크엔 00 칸 없음 ──
        const { deckRows, holdRows, deckAxis, holdAxis, deckRowX, holdRowX, deckOff, holdOff, nCols } = pageCoordLayout;
        const LBL = 24;
        const STEP = cellW + 2;
        const gridW = nCols * STEP;
        const rowH = cellH + 2;
        let hc = 1;
        // ★ 2.56: 해치 수는 격자 한 벌(buildBayGrid)의 hatchCount — 짝수 우선·0 허용(카고플랜과 동일).
        if (pageMatrixRender && typeof pageMatrixRender.hatchCount === 'number') {
          hc = pageMatrixRender.hatchCount;
        } else for (const bn of [page.evenBay, page.oddBay]) {
          if (bn == null) continue;
          const db = dictBaysSummary[parseInt(bn, 10)];
          if (db?.hatchCount) { hc = Math.max(1, Math.min(3, db.hatchCount)); break; }
        }
        const HATCH = 10;
        const deckH = deckRows.length * rowH;
        const holdH = holdRows.length * rowH;
        const totalH = deckH + (holdH > 0 ? HATCH + holdH : 0);
        return (
          <div>
            <div className="text-2xs text-cyan-400 mb-0.5 font-bold">⬆ DECK / ⬇ HOLD</div>
            {/* 상단 row 라벨 = 데크 축 (00 없음) */}
            <div style={{ position: 'relative', height: 12, marginLeft: LBL, width: gridW }}>
              {deckAxis.map((r, i) => (
                <div key={`dl-${i}`} style={{ position: 'absolute', left: (deckOff + i) * STEP, width: cellW, textAlign: 'center', fontSize: 9, fontWeight: 'bold' }} className="text-dim-400 mono">{r}</div>
              ))}
            </div>
            <div style={{ position: 'relative', height: totalH, marginLeft: LBL, width: gridW }}>
              {/* 데크 셀 */}
              {deckRows.map((tr, ti) => {
                const y = ti * rowH;
                return (
                  <React.Fragment key={`d-${ti}`}>
                    <div style={{ position: 'absolute', left: -LBL, top: y, width: LBL - 2, height: rowH, fontSize: 9, lineHeight: `${cellH}px`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} className="text-dim-400 mono font-bold">{tr.tier}</div>
                    <div style={{ position: 'absolute', left: gridW + 2, top: y, width: LBL - 2, height: rowH, fontSize: 9, lineHeight: `${cellH}px`, display: 'flex', alignItems: 'center' }} className="text-dim-400 mono font-bold">{tr.tier}</div>
                    {tr.cells.map((c, ci) => {
                      // ★ 2.56-01: 차단(blocked) 자리는 비워 둔다 — 단 실컨이 있으면 그린다(사전 오설정 안전장치).
                      const lbl = c.rowLbl != null ? c.rowLbl : deckAxis[ci];
                      if (lbl == null || deckRowX[lbl] == null) return null;
                      const tier2 = String(tr.tier).padStart(2, '0');
                      if (!(c.active || (c.blocked && pageCellCns.has(`${lbl}-${tier2}`)))) return null;
                      return (
                        <div key={`dc-${ti}-${lbl}`} style={{ position: 'absolute', left: (deckOff + deckRowX[lbl]) * STEP, top: y, width: cellW, height: rowH, display: 'flex', alignItems: 'center' }}>
                          {renderCell(lbl, tier2)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* 해치 구분선 */}
              {holdH > 0 && (
                <div style={{ position: 'absolute', top: deckH + HATCH / 2 - 2, left: 0, width: gridW, display: 'flex', gap: 6 }}>
                  {Array.from({ length: hc }).map((_, i) => <div key={i} className="border-t-4 border-slate-100" style={{ flex: 1 }} />)}
                </div>
              )}
              {/* 홀드 셀 (자기 축, 00 가운데) */}
              {holdRows.map((tr, ti) => {
                const y = deckH + HATCH + ti * rowH;
                return (
                  <React.Fragment key={`h-${ti}`}>
                    <div style={{ position: 'absolute', left: -LBL, top: y, width: LBL - 2, height: rowH, fontSize: 9, lineHeight: `${cellH}px`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} className="text-dim-400 mono font-bold">{tr.tier}</div>
                    <div style={{ position: 'absolute', left: gridW + 2, top: y, width: LBL - 2, height: rowH, fontSize: 9, lineHeight: `${cellH}px`, display: 'flex', alignItems: 'center' }} className="text-dim-400 mono font-bold">{tr.tier}</div>
                    {tr.cells.map((c, ci) => {
                      // ★ 2.56-01: 차단 자리 비움 + 실컨 데이터 우선 (데크와 같은 규칙)
                      const lbl = c.rowLbl != null ? c.rowLbl : holdAxis[ci];
                      if (lbl == null || holdRowX[lbl] == null) return null;
                      const tier2 = String(tr.tier).padStart(2, '0');
                      if (!(c.active || (c.blocked && pageCellCns.has(`${lbl}-${tier2}`)))) return null;
                      return (
                        <div key={`hc-${ti}-${lbl}`} style={{ position: 'absolute', left: (holdOff + holdRowX[lbl]) * STEP, top: y, width: cellW, height: rowH, display: 'flex', alignItems: 'center' }}>
                          {renderCell(lbl, tier2)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
            {/* 하단 row 라벨 = 홀드 축 (00 포함) */}
            {holdAxis.length > 0 && (
              <div style={{ position: 'relative', height: 12, marginTop: 2, marginLeft: LBL, width: gridW }}>
                {holdAxis.map((r, i) => (
                  <div key={`hbl-${i}`} style={{ position: 'absolute', left: (holdOff + i) * STEP, width: cellW, textAlign: 'center', fontSize: 9, fontWeight: 'bold' }} className="text-dim-400 mono">{r}</div>
                ))}
              </div>
            )}
          </div>
        );
      })() : (<>
      {/* DECK (기존 flex 폴백) */}
      <div>
        <div className="text-2xs text-cyan-400 mb-0.5 font-bold">⬆ DECK</div>
        <div className="flex gap-0.5 mb-0.5 justify-center">
          <div style={{ width: 24 }}></div>
          {deckHeaderRowsArr.map((row, idx) => (
            <div key={`dh-${idx}`} className="text-center text-3xs text-dim-400 mono font-bold flex-shrink-0"
              style={{ width: cellW }}>{row || ''}</div>
          ))}
          <div style={{ width: 24 }}></div>
        </div>
        {deckTiersPadded.map((tier, ti) => (
          <div key={`dt-${ti}`} className="flex gap-0.5 mb-0.5 items-center justify-center">
            <div className="text-3xs text-dim-400 mono font-bold flex-shrink-0 text-right pr-1" style={{ width: 24 }}>{tier || ''}</div>
            {deckRowsArr.map((row, ri) => (
              <React.Fragment key={`d-${ti}-${ri}`}>{renderCell(row, tier)}</React.Fragment>
            ))}
            <div className="text-3xs text-dim-400 mono font-bold flex-shrink-0 pl-1" style={{ width: 24 }}>{tier || ''}</div>
          </div>
        ))}
      </div>

      {/* 해치커버 */}
      {(() => {
        let hc = 1;
        // ★ 2.56: 해치 수는 격자 한 벌(buildBayGrid)의 hatchCount — 짝수 우선·0 허용(카고플랜과 동일).
        if (pageMatrixRender && typeof pageMatrixRender.hatchCount === 'number') {
          hc = pageMatrixRender.hatchCount;
        } else for (const bn of [page.evenBay, page.oddBay]) {
          if (bn == null) continue;
          const db = dictBaysSummary[parseInt(bn, 10)];
          if (db?.hatchCount) { hc = Math.max(1, Math.min(3, db.hatchCount)); break; }
        }
        return (
          <div className="my-2 flex gap-1.5">
            {Array.from({ length: hc }).map((_, i) => (
              <div key={i} className="border-t-4 border-slate-100 flex-1"></div>
            ))}
          </div>
        );
      })()}

      {/* HOLD (기존 flex 폴백) */}
      <div>
        <div className="text-2xs text-amber-400 mb-0.5 font-bold">⬇ HOLD</div>
        {holdTiersPadded.map((tier, ti) => (
          <div key={`ht-${ti}`} className="flex gap-0.5 mb-0.5 items-center justify-center">
            <div className="text-3xs text-dim-400 mono font-bold flex-shrink-0 text-right pr-1" style={{ width: 24 }}>{tier || ''}</div>
            {holdRowsArr.map((row, ri) => (
              <React.Fragment key={`h-${ti}-${ri}`}>{renderCell(row, tier)}</React.Fragment>
            ))}
            <div className="text-3xs text-dim-400 mono font-bold flex-shrink-0 pl-1" style={{ width: 24 }}>{tier || ''}</div>
          </div>
        ))}
        <div className="flex gap-0.5 mt-0.5 justify-center">
          <div style={{ width: 24 }}></div>
          {holdHeaderRowsArr.map((row, idx) => (
            <div key={`hb-${idx}`} className="text-center text-3xs text-dim-400 mono font-bold flex-shrink-0"
              style={{ width: cellW }}>{row || ''}</div>
          ))}
          <div style={{ width: 24 }}></div>
        </div>
      </div>
      </>)}
    </div>
  );
}
