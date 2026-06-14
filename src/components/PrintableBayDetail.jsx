// 베이 상세 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323EBAY.pdf / TNJP25323WBAY.pdf 형식
// - 베이당 1페이지
// - 제목 BAY05/BAY(02)03 상단 중앙 (큰 글자)
// - 헤더: TEN JUPITER / VOY NO / POL or POD
// - row 라벨 상하단 (06 04 02 00 01 03 05)
// - 굵은 hatch break
// - 데크 (위) / 홀드 (아래) 분리
// - 각 셀 4-5줄 정보 또는 빈칸
// - tier 라벨 우측 (88 86 84 82 / 08 06 04 02)
//
// 출력 모드 3종:
//   * 전체 일괄 (all): 모든 베이
//   * 평택분만 (ptk): PTK 컨테이너 있는 베이만
//   * 베이 지정 (single): 1개 베이 선택

import React, { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel, getContainerColorKey, buildContainerColorMap, isPyeongtaekPort } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';
import { buildEmptyBayRenderData } from '../cargoPlanCore.js';
import { BayBoxV2, CARGO_V2_CSS } from './PrintableCargoPlanV2.jsx';
import { enrichBayDef } from '../bayDictAutoEnrich.js';

// M4.9e-fix: STD_DECK/STD_HOLD/STD_ROWS 모두 동적 (globalTiers + globalRowRange 기준)
//   사용자 지적: "베이마다 / 선박마다 row/tier 다름, 일괄 X, 화면과 같게"
// (STD_DECK / STD_HOLD 제거됨 — globalTiers 동적 사용)

// M6.94.34: _inList(리스트=평택)는 선적 모드에서만. 양하는 pod 평택만.
const isPtk = (c, mode) => mode === 'discharge'
  ? isPyeongtaekPort(c.pod)
  : (c._inList || isPyeongtaekPort(c.pol));

export function groupByBay(containers) {
  const m = {};
  // M4.9: containers 검증 (배열 아니면 빈 객체 반환)
  if (!Array.isArray(containers)) return m;
  containers.forEach(c => {
    if (!c || !c.bay) return;
    const k = normalizeBay(c.bay);
    if (k) (m[k] = m[k] || []).push(c);
  });
  return m;
}

function splitForeAft(bayList) {
  if (bayList.length === 0) return { fore: [], aft: [] };
  const baySet = new Set(bayList);
  const used = new Set();
  const groups = [];
  // 1) 트리오 [홀, 짝, 홀] 그룹화 — 표준 페어
  for (const n of bayList) {
    if (used.has(n) || n % 2 === 0) continue;
    if (baySet.has(n + 1) && baySet.has(n + 2)) {
      groups.push([n, n + 1, n + 2]);
      used.add(n); used.add(n + 1); used.add(n + 2);
    }
  }
  // 2) 남은 베이 (단독 홀수, 20ft 전용 짝수)
  for (const n of bayList) {
    if (!used.has(n)) { groups.push([n]); used.add(n); }
  }
  groups.sort((a, b) => a[0] - b[0]);
  // 3) 그룹 갯수의 중간으로 분할 — TNJP는 9그룹 → FORE 5 / AFT 4
  const mid = Math.ceil(groups.length / 2);
  return {
    fore: groups.slice(0, mid).flat().sort((a, b) => a - b),
    aft: groups.slice(mid).flat().sort((a, b) => a - b),
  };
}

// 베이상세 페이지 빌드 — 페어(홀-짝-홀 트리오)를 베이매트릭스 구조 기준으로 판정
//   요구사항: 7,8,9 베이 → "BAY 07 단독" + "BAY (08)09 짝꿍" = 2페이지
//   페어 표기: (작은 짝수)(큰 홀수). 예 (02)03 (04)05 (08)09 (24)25
//   V7.98-12: 페어 판정을 EDI 적재 여부(bays에 짝수 키 존재)에 의존하지 않는다.
//     그 항차에 40ft가 안 실리면 짝수 베이가 EDI/bayMap에서 빠져, 사전엔 (04)05 페어인데도
//     05가 단독 "BAY05"로 표기되던 버그(REF_베이페어링 §3 절대원칙2 위반)를 수정.
//     summary(=dictBaysSummary, {bayNum:{section, pairEven?}})가 있으면 그 구조로 페어 복원.
//     summary 없으면 기존 (n-1) 휴리스틱 그대로 폴백(사전 없는 선박 회귀 0).
export function buildBayPages(bays, summary) {
  summary = summary || {};
  const hasSummary = Object.keys(summary).length > 0;
  const baySet = new Set(bays);

  // 구조상 짝수 → 묶일 홀수 맵 (EDI 적재 무관, 매트릭스/사전 기준)
  const evenToOdd = new Map();
  if (hasSummary) {
    // (a) pairEven 흡수형: 홀수 entry가 pairEven=짝수를 보유
    for (const [k, v] of Object.entries(summary)) {
      const odd = parseInt(k, 10);
      if (v && v.pairEven != null && odd % 2 === 1) {
        const ev = parseInt(v.pairEven, 10);
        if (Number.isFinite(ev)) evenToOdd.set(ev, odd);
      }
    }
    // (b) section 묶음형: 같은 section의 짝수+홀수 → (짝)(짝+1) 우선, 없으면 (짝-1)(짝)
    const bySec = {};
    for (const [k, v] of Object.entries(summary)) {
      if (!v || v.section == null) continue;
      (bySec[v.section] = bySec[v.section] || []).push(parseInt(k, 10));
    }
    for (const sec of Object.values(bySec)) {
      const odds = sec.filter(n => n % 2 === 1);
      for (const ev of sec.filter(n => n % 2 === 0)) {
        if (evenToOdd.has(ev)) continue;
        if (odds.includes(ev + 1)) evenToOdd.set(ev, ev + 1);
        else if (odds.includes(ev - 1)) evenToOdd.set(ev, ev - 1);
      }
    }
  }

  const used = new Set();
  const pages = [];
  // 1) 홀수 기준 페어링
  for (const odd of bays.filter(n => n % 2 === 1).sort((a, b) => a - b)) {
    if (used.has(odd)) continue;
    let pairedEven = null;
    for (const [ev, od] of evenToOdd) { if (od === odd) { pairedEven = ev; break; } }
    // 구조 정보가 짝꿍을 못 주면 기존 (n-1) 휴리스틱으로 보조
    if (pairedEven == null && baySet.has(odd - 1) && !used.has(odd - 1) && !evenToOdd.has(odd - 1)) {
      pairedEven = odd - 1;
    }
    if (pairedEven != null) {
      pages.push({ even: pairedEven, odd, key: `${pairedEven}-${odd}` });
      used.add(odd); used.add(pairedEven);
    } else {
      pages.push({ even: null, odd, key: `${odd}` });
      used.add(odd);
    }
  }
  // 2) 페어 못 이룬 짝수 단독 (bays의 짝수 ∪ 구조상 짝수)
  const evensAll = new Set([...bays.filter(n => n % 2 === 0), ...evenToOdd.keys()]);
  for (const ev of [...evensAll].sort((a, b) => a - b)) {
    if (used.has(ev)) continue;
    pages.push({ even: ev, odd: null, key: `${ev}` });
    used.add(ev);
  }
  // 작은 베이 → 큰 베이 순서로 정렬 (FORE → AFT)
  pages.sort((a, b) => (a.even ?? a.odd) - (b.even ?? b.odd));
  return pages;
}

// 컨테이너 4-5줄 텍스트 포맷
// M4.9: 모든 입력 String 변환 + try-catch로 방어 (한 셀 에러가 전체 페이지 크래시 방지)
export function formatCellLines(c) {
  try {
    const pol = String(c.pol || '').replace(/^KR/, '').slice(0, 3) || '   ';
    const pod = String(c.pod || '').replace(/^KR/, '').slice(0, 3) || '   ';
    const via = String(c.via || '');
    // POL POD via 표기
    let line1;
    if (pol === pod) {
      line1 = `${pol}/${pod}*${via || ' '}`;
    } else {
      line1 = `${pol}/${' '}*${via || pod}`;
    }
    const line2 = String(c.cn || '');
    // 선사 약어
    const carrierRaw = String(c.line || c.carrier || '').toUpperCase();
    let carrier = 'C_K';
    if (carrierRaw === 'CKL' || carrierRaw === 'CK') carrier = 'C_K';
    else if (carrierRaw === 'SOC' || carrierRaw.includes('SOC')) carrier = 'SOC';
    else if (carrierRaw) carrier = carrierRaw.slice(0, 3);

    const fe = c.fe || (String(c.iso || '').endsWith('0') ? 'E' : 'F');
    // M4.9: wt 안전 처리 (number/string/null 모두 OK)
    let wt = '0.0';
    try {
      const wtNum = parseFloat(c.wt);
      if (Number.isFinite(wtNum)) wt = (wtNum / 1000).toFixed(1);
    } catch (_) {}
    const isoLbl = String(isoToPdfLabel(c.iso) || '');
    const line3 = `${carrier} ${fe}${String(wt).padStart(5)} ${isoLbl}`;
    // IMDG/위험물
    const line4 = c.imdg ? ` ${String(c.imdg)}` : '';
    // 위치
    // M6.35: BAY 2자리 정규화 (100+ 만 3자리 유지) — 7자리(0010002) → 6자리(010082)
    //   기존: padStart(3,'0') → "001" → ....0010002 7자리
    //   변경: 100 미만이면 2자리, 이상이면 3자리 그대로
    const bayInt = parseInt(c.bay, 10);
    const bay = Number.isFinite(bayInt) && bayInt >= 100
      ? String(bayInt)
      : String(Number.isFinite(bayInt) ? bayInt : 0).padStart(2, '0');
    const row = String(c.row ?? '00').padStart(2, '0');
    const tier = String(c.tier ?? '00').padStart(2, '0');
    const lineLast = `....${bay}${row}${tier}`;
    return { line1, line2, line3, line4, lineLast };
  } catch (e) {
    // 한 컨테이너 에러가 전체 페이지를 무너뜨리지 않게
    console.error('[formatCellLines] error', e, c);
    return {
      line1: '?',
      line2: String(c?.cn || '?'),
      line3: '? ?',
      line4: '',
      lineLast: '?',
    };
  }
}

function BayDetailPage({ even, odd, bayMap, mode, voyageInfo, voyageKey, shipName, dictBay, dictBaysSummary = {}, globalRowRange, globalTiers, dictShipMeta, colorMap = {}, isPrintTarget = true }) {
  // allConts 먼저 계산 (STD_ROWS가 union용으로 사용)
  const allConts = [
    ...(even != null && bayMap[String(even)] || []),
    ...(odd != null && bayMap[String(odd)] || []),
  ];

  // M6.26: 베이플랜과 100% 동일 로직 — 베이플랜만 정확하므로 그것에 맞춤
  //   사용자 지시: "베이플랜에 다 맞춰주세요. 지금 베이플랜만 아주 정확합니다."

  // STD_ROWS: 베이플랜은 globalRowRange 사용 (전 베이 통일 폭) — 동일 적용
  // M6.77: has00 자동 감지 + tier 검증 + 컨 없는 박스 voyage 전체 fallback
  const STD_ROWS = useMemo(() => {
    // V7.98-02: 베이별 매트릭스 row (전역 globalRowRange 미사용).
    //   원인: row99 OOG가 전역 maxRight=99로 오염 → 전 베이 56칸 도배.
    //   해결: 이 페이지 베이의 사전 rowMax(rowMaxEvenLocal/OddLocal → rowMaxEven/Odd) ∪ 이 베이 실제 컨(OOG row>=90 제외).
    let maxLeft = 0, maxRight = 0, has00 = false;
    // 1) 사전(매트릭스) 베이별 rowMax
    for (const bn of [even, odd]) {
      if (bn == null) continue;
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (!db) continue;
      const me = db.rowMaxEvenLocal ?? db.rowMaxEven;
      const mo = db.rowMaxOddLocal ?? db.rowMaxOdd;
      if (me) maxLeft = Math.max(maxLeft, me);
      if (mo) maxRight = Math.max(maxRight, mo);
    }
    // 2) 이 베이 실제 컨과 union (데이터 손실 방지, OOG row>=90 제외)
    for (const c of allConts) {
      const n = parseInt(c.row);
      const tier = parseInt(c.tier);
      if (!Number.isFinite(n) || !tier || n >= 90) continue;
      if (n === 0) { has00 = true; continue; }
      if (n % 2 === 0) maxLeft = Math.max(maxLeft, n);
      else maxRight = Math.max(maxRight, n);
    }
    if (!maxLeft && !maxRight) {
      // 데이터 없음 — 기본 8 col 양식
      return ['08', '06', '04', '02', '01', '03', '05', '07'];
    }
    const left = [];
    for (let n = maxLeft; n >= 2; n -= 2) left.push(String(n).padStart(2, '0'));
    const right = [];
    for (let n = 1; n <= maxRight; n += 2) right.push(String(n).padStart(2, '0'));
    return has00 ? [...left, '00', ...right] : [...left, ...right];
  }, [even, odd, dictBaysSummary, allConts]);
  const colCount = STD_ROWS.length;

  const cellMap = {};
  allConts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row || '00').padStart(2, '0');
    cellMap[`${t}-${r}`] = c;
  });

  // V7.98-04: 인쇄 베이상세도 매트릭스 진실원(buildEmptyBayRenderData)으로 통일.
  //   matrix_builder본은 rowMax 없이 deckCells/holdCells만 저장 → STD_ROWS(rowMax 기반)는 695베이/36% 미적용.
  //   deckCells 유효하면 matrixRender(tier별 active cell·좁아짐·가운데 정렬, 3D·편집과 동일) 사용,
  //   없으면(PDF 자동본) 기존 STD_ROWS 폴백 유지. 컨번호는 그대로(renderCell 재사용).
  const matrixRender = useMemo(() => {
    const isPair = even != null && odd != null;
    const primaryBn = even != null ? even : odd;
    if (primaryBn == null) return null;
    const e = dictBaysSummary[parseInt(primaryBn, 10)];
    const hasCells = !!e && (
      (Array.isArray(e.deckCells) && e.deckCells.length > 0) ||
      (Array.isArray(e.holdCells) && e.holdCells.length > 0)
    );
    if (!hasCells) return null;
    // EDI has00 반영 (매트릭스 명시값 우선) — BayPlan/ChiefBayEdit과 동일 패턴
    let ediHas00 = false;
    for (const c of allConts) { if (parseInt(c.row, 10) === 0) { ediHas00 = true; break; } }
    const effEntry = {
      ...e,
      deckHasZero: e.deckHasZero != null ? e.deckHasZero : (e.hasZero != null ? e.hasZero : ediHas00),
      holdHasZero: e.holdHasZero != null ? e.holdHasZero : (e.hasZero != null ? e.hasZero : ediHas00),
    };
    const bayKey = isPair
      ? `(${String(even).padStart(2, '0')})${String(odd).padStart(2, '0')}`
      : String(primaryBn).padStart(2, '0');
    try { return buildEmptyBayRenderData(effEntry, bayKey, isPair) || null; }
    catch (e2) { return null; }
  }, [even, odd, dictBaysSummary, allConts]);

  // M6.26: 베이플랜 로직 그대로 이식 — 페이지 두 베이의 dictBay tier union + 실제 컨 tier + 80 기준 분리
  //   사용자 지시: "베이플랜에 다 맞춰주세요. 지금 베이플랜만 아주 정확합니다."
  //   BayPlan.jsx:926-953의 로직 100% 동일
  const pageBayDictTiers = useMemo(() => {
    const deck = new Set();
    const hold = new Set();
    [even, odd].forEach(bn => {
      if (bn == null) return;
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (!db) return;
      (db.deckTiersLocal || db.deckTiers || []).forEach(t => deck.add(String(t).padStart(2, '0')));
      (db.holdTiersLocal || db.holdTiers || []).forEach(t => hold.add(String(t).padStart(2, '0')));
    });
    return { deck, hold };
  }, [even, odd, dictBaysSummary]);

  const hasDictTiers = pageBayDictTiers.deck.size > 0 || pageBayDictTiers.hold.size > 0;

  // M6.94.15: 해치는 짝수(even)/단독 베이 기준. even 우선, 없으면 단독 odd.
  const hatchCount = useMemo(() => {
    for (const bn of [even, odd]) {
      if (bn == null) continue;
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (db?.hatchCount) return Math.max(1, Math.min(3, db.hatchCount));
    }
    return 1;
  }, [odd, even, dictBaysSummary]);
  const allTiersSet = hasDictTiers
    ? Array.from(new Set([
        ...pageBayDictTiers.deck,
        ...pageBayDictTiers.hold,
        ...allConts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN')
      ]))
    : Array.from(new Set([
        ...(Array.isArray(globalTiers) ? globalTiers.map(t => String(t).padStart(2, '0')) : []),
        ...allConts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN')
      ]));
  const deckTiers = allTiersSet.filter(t => parseInt(t) >= 80).sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = allTiersSet.filter(t => parseInt(t) < 80).sort((a, b) => parseInt(b) - parseInt(a));

  // M6.29: 베이상세는 deck/hold 별도 격자 — 패딩 제거 (02 아래 빈 줄 안 보임)
  //   각 영역은 자체 정렬, deck/hold 갯수 다른 베이에서도 자연스럽게 표시

  const hasHold = dictBay ? dictBay.hasHold !== false : allConts.some(c => parseInt(c.tier) < 80);
  const hasDeck = dictBay ? dictBay.hasDeck !== false : true;

  const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  let title;
  if (even != null && odd != null) title = `BAY(${dispBay(even)})${dispBay(odd)}`;
  else if (even != null) title = `BAY${dispBay(even)}`;
  else title = `BAY${dispBay(odd)}`;

  // M6.16: mode 기반 항차번호 단일 표시 (PrintableCargoPlan과 동일 패턴)
  // M6.37: voyageKey fallback 제거 — key는 voy가 아님 ("XTPG_0523E" 같은 키 형식이 표시되면 잘못)
  const voyD = voyageInfo?.voy_d || '';
  const voyL = voyageInfo?.voy_l || '';
  const voyGeneric = voyageInfo?.voy || '';
  let voyDisplay;
  if (mode === 'discharge') {
    voyDisplay = voyD || voyGeneric;
  } else if (mode === 'loading') {
    voyDisplay = voyL || voyGeneric;
  } else {
    if (voyD && voyL && voyD !== voyL) voyDisplay = `양하 ${voyD} / 선적 ${voyL}`;
    else voyDisplay = voyD || voyL || voyGeneric;
  }

  // M4.9b: POL 빈칸 (샘플 PDF와 동일 — 검수원이 수기 또는 향후 자동 채움)
  const portLabel = 'POL : ';

  const renderCell = (t, r) => {
    const c = cellMap[`${t}-${r}`];
    if (!c) return <div key={`${t}-${r}`} className="bd-cell empty"></div>;
    const lines = formatCellLines(c);
    const ptk = isPtk(c, mode);
    const colorKey = ptk ? getContainerColorKey(c, mode) : null;
    const bgColor = colorKey ? colorMap[colorKey] : null;
    return (
      <div key={`${t}-${r}`}
        className={`bd-cell filled ${ptk ? 'ptk' : ''}`}
        style={bgColor ? { background: bgColor, color: '#fff' } : undefined}
      >
        <div>{lines.line1}</div>
        <div>{lines.line2}</div>
        <div className="bd-line3">{lines.line3}</div>
        {lines.line4 && <div>{lines.line4}</div>}
        <div className="bd-pos">{lines.lineLast}</div>
      </div>
    );
  };

  // V7.98-04: 매트릭스 격자 한 층 렌더 — 전체 폭(maxCols) 고정 grid에 active cell만 그 위치에(좁아짐=양끝 빈칸)
  // V7.98-06: 베이플랜과 동일한 0.5칸 단위 중심정렬 (BayPlan pageCoordLayout 로직 이식).
  //   데크 축(00 없음)·홀드 축(00 가운데)을 각자 만들고, (nCols-축길이)/2로 0.5칸 단위 offset.
  //   CSS grid를 half-column(2배)으로 깔아 0.5칸을 정수 half-column으로 표현. 각 셀은 2칸 span.
  //   데크 02|01 경계와 홀드 00이 같은 세로선에 옴.
  // V7.98-08: 인쇄 베이상세도 카고플랜 BayBoxV2 그대로 사용 — 편집화면과 동일 일원화.
  //   셀 내용만 주입: 카고플랜=마크, 베이상세=5줄(POL/POD·컨번호·선사F/E무게타입·특수·위치).
  const mrRenderCellContent = (cell, tier) => {
    const c = cellMap[`${String(tier).padStart(2, '0')}-${cell.rowLbl}`];
    if (!c) return null; // 빈 active 슬롯 — 테두리만, 내용 없음
    const lines = formatCellLines(c);
    return (
      <div className="bd-cell-lines">
        <div>{lines.line1}</div>
        <div>{lines.line2}</div>
        <div className="bd-line3">{lines.line3}</div>
        {lines.line4 && <div>{lines.line4}</div>}
        <div className="bd-pos">{lines.lineLast}</div>
      </div>
    );
  };
  const mrCellExtra = (cell, tier) => {
    const c = cellMap[`${String(tier).padStart(2, '0')}-${cell.rowLbl}`];
    if (!c) return {};
    const ptk = isPtk(c, mode);
    const colorKey = ptk ? getContainerColorKey(c, mode) : null;
    const bg = colorKey ? colorMap[colorKey] : null;
    return { className: `cpv2-cell bd-fill${ptk ? ' ptk' : ''}`, style: bg ? { color: bg } : undefined };
  };

  return (
    <div className={`bd-page${isPrintTarget ? '' : ' bd-noprint'}`}>
      {!isPrintTarget && (
        <div className="bd-noprint-badge no-print">인쇄 제외 (화면 표시용)</div>
      )}
      <div className="bd-title">{title}</div>
      <div className="bd-header">
        <span>{voyageInfo?.vsl || shipName || ''}</span>
        <span>VOY NO : {voyDisplay}</span>
        <span>{portLabel}</span>
      </div>

      {matrixRender ? (
        <div className="bd-cargo-wrap">
          <BayBoxV2
            data={matrixRender}
            colorMap={colorMap}
            gridCols={Math.max(matrixRender.nDeckCols || 0, matrixRender.nHoldCols || 0)}
            renderCellContent={mrRenderCellContent}
            cellExtra={mrCellExtra}
          />
        </div>
      ) : (
        <>
          <div className="bd-row-labels-top">
            {STD_ROWS.map((r, i) => <span key={`${r}-${i}`} className="bd-rl">{r}</span>)}
          </div>
          <div className="bd-grid-wrap">
            <div className="bd-grid">
              {hasDeck && deckTiers.map(t => (
                <div key={t} className="bd-tier-row" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
                  {STD_ROWS.map(r => renderCell(t, r))}
                </div>
              ))}
              {hasDeck && hasHold && (
                <div className="bd-hatch">
                  {Array.from({ length: hatchCount }).map((_, i) => <div key={i} className="bd-hatch-seg"></div>)}
                </div>
              )}
              {hasHold && holdTiers.map(t => (
                <div key={t} className="bd-tier-row" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
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
        </>
      )}
    </div>
  );
}

export default function PrintableBayDetail({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, globalRowRange, globalTiers, onClose
}) {
  const [printMode, setPrintMode] = useState('all');  // 'all' | 'ptk' | 'single'
  const [selectedKeys, setSelectedKeys] = useState([]);  // M4.8 다중 선택

  // V7.01: 폰 화면용 확대/축소 (핀치 + 버튼). 인쇄에는 영향 없음(@media print에서 무시).
  const [zoom, setZoom] = useState(1);
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
  const onTouchStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startZoom: zoom };
    }
  };
  const onTouchMove = (e) => {
    if (pinchRef.current.active && e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / (pinchRef.current.startDist || 1);
      const next = Math.min(3, Math.max(0.4, pinchRef.current.startZoom * ratio));
      setZoom(next);
      e.preventDefault();
    }
  };
  const onTouchEnd = (e) => {
    if (!e.touches || e.touches.length < 2) pinchRef.current.active = false;
  };

  // M6.92.0: 공통 색 함수 — 양하=선사, 선적=POD (베이플랜/카고플랜과 동일)
  const colorMap = useMemo(() => buildContainerColorMap(containers || [], mode), [containers, mode]);

  // M6.77 → M6.78: voyage 전체 deck/hold 별 row range
  const computedRowRange = useMemo(() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    for (const c of containers) {
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
      maxLeft: Math.max(deckLeft, holdLeft),
      maxRight: Math.max(deckRight, holdRight),
      has00: deckHas00 || holdHas00,
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
  }, [containers]);
  const effectiveRowRange = globalRowRange || computedRowRange;

  const bayMap = useMemo(() => groupByBay(containers), [containers]);

  // V7.01: 계열 대체 시 베이 수 비교용 — 현재 EDI 실제 베이 수
  const ediBayCount = useMemo(() => {
    const s = new Set();
    for (const c of (containers || [])) {
      const n = parseInt(c.bay, 10);
      if (Number.isFinite(n) && n > 0) s.add(n);
    }
    return s.size;
  }, [containers]);

  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const baseDict = getShipBayDictData(shipImo, shipName, { ediBayCount });
    if (!baseDict) return null;
    // M6.94.0 사용자 원칙: source='user'면 enrichBayDef 보강 차단 (사용자 데이터 그대로)
    const enrichedEntry = enrichBayDef(
      { bayDef: baseDict.bayDef },
      baseDict._v5Matrix,
      containers,
      baseDict.source
    );
    return {
      ...baseDict,
      bayDef: { ...enrichedEntry.bayDef, source: baseDict.source, _userOwned: baseDict.source === 'user' },
      _enrichMeta: enrichedEntry._enrichMeta || baseDict._enrichMeta,
    };
  }, [shipImo, shipName, containers]);

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

  // M5.40: 베이사전 명시 필드 (PDF 추출 row/tier) — 절대 기준
  const dictShipMeta = useMemo(() => ({
    rowMaxEven: dictData?.bayDef?.rowMaxEven,
    rowMaxOdd: dictData?.bayDef?.rowMaxOdd,
    deckTiers: dictData?.bayDef?.deckTiers,
    holdTiers: dictData?.bayDef?.holdTiers,
  }), [dictData]);

  const bayList = useMemo(() => {
    // V7.98-02: bay99/999 OOG placeholder 제외 (BayPlan3D와 동일 원칙 — row99 오염 방지)
    const drop99 = (arr) => arr.filter(n => Number.isFinite(n) && n < 99);
    if (dictBayList && dictBayList.length > 0) return drop99([...dictBayList]).sort((a, b) => a - b);
    return drop99(Object.keys(bayMap).map(b => parseInt(b, 10))).sort((a, b) => a - b);
  }, [dictBayList, bayMap]);

  const allPages = useMemo(() => buildBayPages(bayList, dictBaysSummary), [bayList, dictBaysSummary]);

  // V7.98-13: 화면은 항상 전체 베이를 빠짐없이 보여준다 (빈자리도 자리 — 양하/선적 대상이
  //   아닌 베이도 표시). 인쇄 대상만 printMode로 선별한다.
  //   화면용 = allPages 전부. 인쇄 제외 베이는 화면엔 보이되 @media print에서 숨김(아래 isPrintTarget).
  const filteredPages = allPages;

  // 각 페이지가 인쇄 대상인지 판정 (화면 표시와 무관 — 인쇄 시에만 적용)
  const isPrintTarget = useMemo(() => {
    const set = new Set();
    for (const p of allPages) {
      const conts = [
        ...(p.even != null && bayMap[String(p.even)] || []),
        ...(p.odd != null && bayMap[String(p.odd)] || []),
      ];
      let ok;
      if (printMode === 'all') ok = conts.length > 0;
      else if (printMode === 'ptk') ok = conts.some(c => isPtk(c, mode));
      else if (printMode === 'single') ok = selectedKeys.includes(p.key);
      else ok = false;
      if (ok) set.add(p.key);
    }
    return set;
  }, [allPages, bayMap, printMode, selectedKeys, mode]);
  const printCount = isPrintTarget.size;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col bd-print-modal">
      <div className="no-print flex flex-col p-3 bg-slate-900 border-b border-slate-700 gap-2">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-slate-100">📋 베이 상세 미리보기 (전체 {filteredPages.length}베이 · 인쇄 {printCount})</div>
          <div className="flex gap-2">
            <div className="flex gap-2 print:hidden">
            <button onClick={() => { if (printCount === 0) { alert('인쇄할 베이가 없습니다. 출력 모드(전체/평택분/베이 지정)를 확인하세요.'); return; } window.print(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">🖨 인쇄</button>
            <button onClick={() => { if (printCount === 0) { alert('인쇄할 베이가 없습니다. 출력 모드를 확인하세요.'); return; } alert('인쇄 창에서 "PDF로 저장" 선택하세요'); setTimeout(() => window.print(), 100); }} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded">📄 PDF</button>
            <button onClick={async () => {
              if (typeof window.XLSX === 'undefined') {
                const s = document.createElement('script');
                s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
                document.head.appendChild(s);
                await new Promise(r => s.onload = r);
              }
              try {
                const tables = document.querySelectorAll('table');
                if (!tables.length) { alert('테이블 없음'); return; }
                const wb = window.XLSX.utils.book_new();
                tables.forEach((t, i) => {
                  const ws = window.XLSX.utils.table_to_sheet(t);
                  window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet' + (i+1));
                });
                const d = new Date().toISOString().slice(0,10);
                window.XLSX.writeFile(wb, document.title + '_' + d + '.xlsx');
              } catch (e) { alert('엑셀 실패: ' + e.message); }
            }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded">📊 엑셀</button>
          </div>
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
          <button onClick={() => setPrintMode('single')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'single' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>🎯 베이 지정</button>
          {/* V7.01: 화면 확대/축소 (인쇄 무관) */}
          <span className="ml-2 text-xs text-slate-400 font-bold">화면크기:</span>
          <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
            className="px-2 py-1.5 rounded text-xs font-bold bg-slate-700 text-white">➖</button>
          <span className="text-xs text-slate-300 font-bold mono" style={{ minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}
            className="px-2 py-1.5 rounded text-xs font-bold bg-slate-700 text-white">➕</button>
          <button onClick={() => setZoom(1)}
            className="px-2 py-1.5 rounded text-xs font-bold bg-slate-600 text-white">100%</button>
          {printMode === 'single' && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs text-slate-400">선택({selectedKeys.length}):</span>
              {allPages.map(p => {
                const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
                let label;
                if (p.even != null && p.odd != null) label = `(${dispBay(p.even)})${dispBay(p.odd)}`;
                else if (p.even != null) label = dispBay(p.even);
                else label = dispBay(p.odd);
                const selected = selectedKeys.includes(p.key);
                return (
                  <button key={p.key}
                    onClick={() => {
                      setSelectedKeys(selected
                        ? selectedKeys.filter(k => k !== p.key)
                        : [...selectedKeys, p.key]);
                    }}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      selected ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                    {selected ? '✓ ' : ''}{label}
                  </button>
                );
              })}
              {selectedKeys.length > 0 && (
                <button onClick={() => setSelectedKeys([])}
                  className="px-2 py-1 rounded text-xs bg-red-700 text-white">전체해제</button>
              )}
              <button onClick={() => setSelectedKeys(allPages.map(p => p.key))}
                className="px-2 py-1 rounded text-xs bg-slate-600 text-slate-100">전체선택</button>
            </div>
          )}
        </div>
      </div>

      {dictData && dictData._substituted && (
        <div className="bg-amber-100 border border-amber-600 text-amber-900 px-3 py-2 text-xs">
          ⚠ {dictData._substituted.fromCode} 베이정보가 없어 같은 계열 {dictData._substituted.usedName ? `${dictData._substituted.usedName}(${dictData._substituted.usedCode})` : dictData._substituted.usedCode}(으)로 대체했습니다. 구조가 미세하게 다를 수 있습니다.
        </div>
      )}
      <div className="flex-1 overflow-auto bg-white bd-print-container"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="bd-zoom-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: zoom !== 1 ? `${100 / zoom}%` : '100%' }}>
        {filteredPages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            표시할 베이가 없습니다. (EDI/베이사전에서 베이 정보를 찾지 못함)
          </div>
        ) : (
          filteredPages.map(p => {
            const dictBay = p.even != null ? dictBaysSummary[p.even] : dictBaysSummary[p.odd];
            return (
              <BayDetailPage key={p.key}
                even={p.even} odd={p.odd}
                bayMap={bayMap} mode={mode}
                voyageInfo={voyageInfo} voyageKey={voyageKey}
                shipName={shipName} dictBay={dictBay}
                dictBaysSummary={dictBaysSummary}
                globalRowRange={effectiveRowRange}
                globalTiers={globalTiers}
                colorMap={colorMap}
                isPrintTarget={isPrintTarget.has(p.key)}
                dictShipMeta={dictShipMeta} />
            );
          })
        )}
        </div>
      </div>

      <style>{CARGO_V2_CSS}</style>
      <style>{`
        .bd-cargo-wrap { background: white; padding: 4px 8px; width: 100%; flex: 1 1 0; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; }
        .bd-cargo-wrap .cpv2-bay-section { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
        .bd-cargo-wrap .cpv2-cell.bd-fill { flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; overflow: hidden; font-weight: normal; }
        .bd-cargo-wrap .cpv2-cell .bd-cell-lines { display: flex; flex-direction: column; width: 100%; font-size: 7pt; font-family: 'Courier New', monospace; line-height: 1.1; }
        .bd-cargo-wrap .cpv2-cell .bd-cell-lines > div { white-space: nowrap; overflow: hidden; text-overflow: clip; text-align: left; padding: 0 2px; }
        .bd-cargo-wrap .cpv2-cell .bd-line3 { font-size: 6pt; letter-spacing: -0.2px; }
        .bd-cargo-wrap .cpv2-cell .bd-pos { font-size: 6pt; color: #888; }
        @media print {
          .bd-cargo-wrap { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
      <style>{`
        /* M4.9d-fix: 베이상세 인쇄 — 좌우 짤림 종합 픽스
           1. box-sizing: border-box 전역 적용 (padding/border가 width에 포함되어 폭 초과 방지)
           2. visibility 토글 패턴으로 메인 화면 숨김 (M4.9c)
           3. @page margin 0.5cm — 폰/프린터 자체 minimum margin 절충
           4. 셀 폰트/패딩 축소로 11자리 컨번호 안전 표시 */
        @media print {
          /* V7.01: 화면 확대/축소는 인쇄에 영향 없게 — scale 무시 */
          .bd-zoom-wrap {
            transform: none !important;
            width: 100% !important;
          }
          /* 0. 모든 요소에 box-sizing 강제 — padding/border 폭 초과 방지 */
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          /* 1. 모든 컨텐츠 숨김 */
          body * {
            visibility: hidden !important;
          }
          /* 2. 인쇄 모달과 그 자식만 보이게 */
          .bd-print-modal,
          .bd-print-modal * {
            visibility: visible !important;
          }
          /* 3. 모달 위치 절대 좌상단 — width 100% 명시로 페이지 폭에 맞춤 */
          .bd-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }
          .bd-print-container {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            flex: none !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .bd-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
            margin: 0 !important;
            border-bottom: none !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .bd-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* V7.98-13: 인쇄 제외 베이는 인쇄에서만 숨김 (화면엔 보임) */
          .bd-page.bd-noprint { display: none !important; }
          /* 페어 짝꿍으로 인쇄 대상이 마지막일 때 빈 페이지 방지 — noprint 다음의 마지막 출력 페이지 */
          /* 폰/프린터 minimum margin 대응 */
          @page { size: A4 landscape; margin: 0.3cm; }
        }
        .bd-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          padding: 4px 8px;
          border-bottom: 1px dashed #ddd;
          /* M5.37: 페이지 고정 + flex column → 선박별 티어/로우 수에 따라 셀이 자동 분배 */
          width: 291mm;
          min-height: 204mm;
          height: 204mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          page-break-after: always;
          position: relative;
        }
        /* V7.98-13: 화면에서 인쇄 제외 베이는 살짝 흐리게 (보이되 구분). 인쇄엔 영향 없음 */
        .bd-page.bd-noprint { opacity: 0.45; background: #fafafa; }
        .bd-noprint-badge {
          position: absolute; top: 6px; right: 8px; z-index: 2;
          background: #64748b; color: #fff; font-size: 10pt; font-weight: 700;
          padding: 2px 8px; border-radius: 4px;
        }
        .bd-title {
          text-align: center; font-size: 20pt; font-weight: 500;
          margin-bottom: 3px;
          flex-shrink: 0;
        }
        .bd-header {
          display: flex; justify-content: space-between;
          font-size: 10pt; margin-bottom: 3px;
          flex-shrink: 0;
        }
        .bd-row-labels-top, .bd-row-labels-bot {
          display: flex; justify-content: space-evenly;
          font-size: 7pt;
          margin: 1px 4px;
          flex-shrink: 0;
        }
        .bd-rl { flex: 1; text-align: center; }
        /* M5.37: 그리드가 페이지 안 빈 세로 공간 자동 차지 */
        .bd-grid-wrap {
          display: flex; align-items: stretch;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
        }
        .bd-grid {
          flex: 1;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        /* M6.30: 셀 높이 CSS 변수로 통합 — 한 곳만 바꾸면 셀+tier 라벨 자동 동기화
           --bd-row-h: 셀 한 행 높이 (인쇄 기준).
           셀 안 텍스트 4-5줄 (CNT/PTK, 컨번호, ISO/무게, 실번호, 위치) 들어가도록 충분히 크게.
           7pt × 1.05 × 5줄 ≈ 49px + padding/border ≈ 52px */
        .bd-grid-wrap, .bd-tier-labels {
          --bd-row-h: 52px;
        }
        .bd-tier-row {
          display: grid;
          border: 0.5px solid #000;
          flex: 1 1 0;                  /* M6.94.17: 페이지 세로 가득 채움 (고정 52px→동적). tier 적은 베이 여백 제거 */
          min-height: var(--bd-row-h);  /* 텍스트 4-5줄 최소 보장 */
          box-sizing: border-box;
        }
        .bd-cell {
          border: 0.3px solid #555;
          padding: 1px 2px;
          font-size: 7pt;
          line-height: 1.1;
          font-family: 'Courier New', monospace;
          overflow: hidden;
          min-width: 0;
          /* M6.32: 단어 절대 안 깨짐 — "DC20", "BEAU2917911" 한 단위 유지
             기존 anywhere가 keep-all을 무력화 → "DC"와 "20" 분리 발생
             변경: normal — 공백/하이픈에서만 wrap, 단어 내부는 절대 안 깨짐
             단어가 셀 폭보다 길면 overflow: hidden으로 잘림 (4줄 보장 우선) */
          word-break: keep-all;
          overflow-wrap: normal;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        /* M6.32: 셀 안 각 줄도 nowrap 보장 — 한 항목이 두 줄로 안 나뉨 */
        .bd-cell > div {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }
        /* M6.33: 3번째 줄(상태+무게+규격)만 폰트 축소 — 정보 밀도 높아 한 줄에 안 들어감
           예: "C_K E 2.2 DC20" → 14자 + 공백 → 6pt로 줄여서 한 줄 보장 */
        .bd-cell .bd-line3 {
          font-size: 6pt;
          letter-spacing: -0.2px;
        }
        .bd-cell.empty { background: white; }
        .bd-cell.filled.ptk { background: #fef3c7; }
        .bd-cell.filled { background: white; }
        .bd-pos { color: #555; }
        .bd-hatch {
          height: 4px; margin: 2px 0; display: flex; gap: 6px;
        }
        .bd-hatch-seg { flex: 1 1 0; height: 4px; background: #000; }
        .bd-tier-labels {
          display: flex; flex-direction: column;
          padding-left: 6px;
          font-size: 9pt;
          flex-shrink: 0;
        }
        /* tier 라벨 높이도 셀 행과 동일하게 flex로 동기화 (M6.94.17) */
        .bd-tier-labels span {
          flex: 1 1 0;
          min-height: var(--bd-row-h);
          display: flex; align-items: center; justify-content: center;
        }
        .bd-tier-gap { height: 8px !important; }
      `}</style>
    </div>,
    document.body
  );
}
