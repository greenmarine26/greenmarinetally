// ============================================================
// Tallyman Master · Cargo Plan Core (M6.81 Universal 포팅)
// ============================================================
// M6.81 build_cargo_plan_universal.py의 핵심 4함수를 JS로 그대로 포팅.
// 검증된 정답 알고리즘 (STSE 2631E 525 컨테이너 검증 완료).
//
// 베이사전 = 절대 기준. 각 베이의 cells 배열로 hull 단면 결정.
// STANDARD_DECK [94,92,90,88,86,84,82] + STANDARD_HOLD [10,8,6,4,2] tier 자리 통일.
// 각 베이의 실제 deck_t/hold_t는 그 베이의 cells 분포로 결정.
// 페이지 폭 통일 (globalRowRange/pageDeckUnion) 절대 사용 금지.
//
// M6.93.0: STANDARD_HOLD에 tier 10 추가 (마스터플랜 비교 결과 hold 가장 위 tier 10 누락 버그 fix).
// ============================================================

export const STANDARD_DECK = [94, 92, 90, 88, 86, 84, 82];
export const STANDARD_HOLD = [10, 8, 6, 4, 2];

// ------------------------------------------------------------
// 1. 베이 자동 페어링 (auto_pair_bays)
// ------------------------------------------------------------
// matrixBays: [{ bayNum, cells, rows, hasHold, ... }, ...]
// 반환: { trios: [[topKey, pairKey], ...], singles: [oddKey, ...], orphanEvens: [evenNum, ...] }
export function autoPairBays(matrixBays) {
  const byNum = new Map();
  matrixBays.forEach(b => byNum.set(b.bayNum, b));
  const evens = matrixBays.map(b => b.bayNum).filter(n => n % 2 === 0).sort((a, b) => a - b);
  const odds = matrixBays.map(b => b.bayNum).filter(n => n % 2 === 1).sort((a, b) => a - b);

  const trios = [];
  const usedOdds = new Set();
  const usedEvens = new Set();

  for (const e of evens) {
    if (byNum.has(e - 1) && byNum.has(e + 1)) {
      const topKey = String(e - 1).padStart(2, '0');
      const pairKey = `(${String(e).padStart(2, '0')})${String(e + 1).padStart(2, '0')}`;
      trios.push([topKey, pairKey]);
      usedOdds.add(e - 1);
      usedOdds.add(e + 1);
      usedEvens.add(e);
    }
  }

  const singles = odds.filter(o => !usedOdds.has(o)).map(o => String(o).padStart(2, '0'));
  const orphanEvens = evens.filter(e => !usedEvens.has(e));

  return { trios, singles, orphanEvens };
}

// ------------------------------------------------------------
// 2. 표준 PDF_BAYS 자동 생성 (generate_pdf_bays)
// ------------------------------------------------------------
// 각 박스의 deck_t / hold_t / has_zero 자동 결정 (v5 매트릭스 cells 기반)
export function generatePdfBays(matrixBays, trios, singles) {
  const baysByNum = new Map();
  matrixBays.forEach(b => baysByNum.set(b.bayNum, b));
  const pdfBays = {};

  const getKeyToOdd = (key) => {
    if (key.startsWith('(')) {
      const m = key.replace('(', '').replace(')', '');
      return parseInt(m.slice(2), 10);
    }
    return parseInt(key, 10);
  };

  const allKeys = [];
  trios.forEach(([top, pair]) => { allKeys.push(top); allKeys.push(pair); });
  singles.forEach(s => allKeys.push(s));

  for (const key of allKeys) {
    const oddNum = getKeyToOdd(key);
    const bay = baysByNum.get(oddNum);
    if (!bay) {
      pdfBays[key] = { deck_t: STANDARD_DECK.slice(1), hold_t: [...STANDARD_HOLD], has_zero: false };
      continue;
    }

    // cells는 매트릭스 정의 순서대로 들어있음. M6.81 Python은 reversed() 사용 → tier 위→아래.
    // 검수앱 baysSummary의 cells는 stse_v5.json과 동일하게 들어있으므로 동일 처리.
    const cells = [...(bay.cells || [])].reverse(); // tier 위→아래
    const nTotal = cells.length;
    if (nTotal === 0) {
      pdfBays[key] = { deck_t: STANDARD_DECK.slice(1), hold_t: [...STANDARD_HOLD], has_zero: false };
      continue;
    }

    const hasHold = bay.hasHold !== undefined ? bay.hasHold : true;
    let nHold, nDeck;
    if (hasHold) {
      nHold = Math.min(4, Math.max(0, nTotal - 4));
      nDeck = nTotal - nHold;
    } else {
      nHold = 0;
      nDeck = nTotal;
    }

    // deck_t: STANDARD_DECK에서 아래부터 nDeck개
    const deck_t = nDeck > 0 ? STANDARD_DECK.slice(-nDeck) : [];
    // hold_t: STANDARD_HOLD에서 위부터 nHold개
    const hold_t = nHold > 0 ? STANDARD_HOLD.slice(0, nHold) : [];

    // has_zero: deck_max가 홀수면 00 row 있음 (좌우 대칭 + 가운데 00)
    const deckCells = cells.slice(0, nDeck);
    const deckMax = deckCells.length > 0 ? Math.max(...deckCells) : 0;
    const has_zero = deckMax % 2 === 1;

    pdfBays[key] = { deck_t, hold_t, has_zero };
  }

  return pdfBays;
}

// ------------------------------------------------------------
// 3. 페이지 layout 자동 결정 (auto_page_layout)
// ------------------------------------------------------------
// 베이 번호 큰 것이 좌측 (선미가 좌측), 작은 번호=위 줄(선수쪽), 큰 번호=아래 줄(선미쪽)
// M6.86.8.11: 사용자 약속 layout 규칙 (확정)
//   상단 박스 수 = ⌈(N+1)/2⌉, 하단 박스 수 = N - 상단
//   별첨 자리 = 상단 - 하단 (짝수 N → 2자리, 홀수 N → 1자리)
//   예시: N=10 → 6+4 (별첨 2), N=11 → 6+5 (별첨 1), N=12 → 7+5 (별첨 2)
//   배치 원칙: 작은 번호(선수쪽) → 위 줄, 큰 번호(선미쪽) → 아래 줄
//             각 행 안에서 큰 번호 좌측 (카스피 정답 양식)
export function autoPageLayout(trios, singles, colsPerRow = 5) {
  const allBoxes = [];
  trios.forEach(([topKey, pairKey]) => {
    const oddNum = parseInt(topKey, 10);
    allBoxes.push({ type: 'trio', oddNum, topKey, pairKey });
  });
  singles.forEach(s => {
    allBoxes.push({ type: 'single', oddNum: parseInt(s, 10), topKey: s, pairKey: null });
  });

  const n = allBoxes.length;
  if (n === 0) return [];

  // 사용자 약속: 상단 = ⌈(N+1)/2⌉
  const topCount = Math.ceil((n + 1) / 2);
  // 작은 번호(선수)→위 줄, 큰 번호(선미)→아래 줄
  const sortedAsc = [...allBoxes].sort((a, b) => a.oddNum - b.oddNum);
  const topBoxes = sortedAsc.slice(0, topCount);
  const bottomBoxes = sortedAsc.slice(topCount);

  // 각 행 내부: 큰 번호 좌측 (카스피 정답)
  topBoxes.sort((a, b) => b.oddNum - a.oddNum);
  bottomBoxes.sort((a, b) => b.oddNum - a.oddNum);
  return bottomBoxes.length > 0 ? [topBoxes, bottomBoxes] : [topBoxes];
}

// ------------------------------------------------------------
// 4. row 위치 / active cols 단면 (get_row_positions, get_active_cols_symmetric)
// ------------------------------------------------------------
// M6.86.8.24: row label 생성. EDI 실데이터 기준 정확한 라벨.
//   - has_zero=true: evens + ['00'] + odds (가운데 00)
//   - has_zero=false: evens + odds (00 없음)
//   - cell_count 홀수 + has_zero=false: 홀수 row가 1개 더 (예: 7개 = evens[06,04,02] + odds[01,03,05,07])
//   - cell_count 짝수 + has_zero=false: evens = odds 동수 (예: 8개 = [08..02] + [01..07])
export function getRowPositions(cellCount, hasZero) {
  if (cellCount <= 0) return [];
  const pad = (n) => String(n).padStart(2, '0');
  if (hasZero) {
    const half = Math.floor((cellCount - 1) / 2);
    const evens = [];
    for (let n = half * 2; n > 0; n -= 2) evens.push(pad(n));
    const odds = [];
    for (let n = 1; n <= half * 2 - 1; n += 2) odds.push(pad(n));
    return [...evens, '00', ...odds];
  } else {
    // has_zero=false: 홀수 cellCount면 odds가 1개 더, 짝수면 동수
    const halfEvens = Math.floor(cellCount / 2);
    const halfOdds = cellCount - halfEvens;
    const evens = [];
    for (let n = halfEvens * 2; n > 0; n -= 2) evens.push(pad(n));
    const odds = [];
    for (let n = 1; n <= halfOdds * 2 - 1; n += 2) odds.push(pad(n));
    return [...evens, ...odds];
  }
}

export function getActiveColsSymmetric(cellCount, nTotal) {
  const active = new Set();
  if (cellCount >= nTotal) {
    for (let i = 0; i < nTotal; i++) active.add(i);
    return active;
  }
  if (cellCount <= 0) return active;

  const center = Math.floor(nTotal / 2);
  if (nTotal % 2 === 1) {
    if (cellCount % 2 === 1) {
      const half = Math.floor((cellCount - 1) / 2);
      for (let i = center - half; i <= center + half; i++) active.add(i);
    } else {
      // M6.92.7: 짝수 cellCount + 홀수 nTotal (hasZero=true). row 라벨 [10,08,...,00,01,...,07,09]
      //   row 00은 idx=center, row 01은 idx=center+1. PDF 정답: 가운데 row 00,01 + 좌우 대칭 채움.
      //   cellCount=2 → {center, center+1} (row 00,01)
      //   cellCount=8 → {center-3..center+4} (row 06,04,02,00,01,03,05,07)
      const half = cellCount / 2;
      for (let i = center - half + 1; i <= center + half; i++) active.add(i);
    }
  } else {
    const half = Math.floor(cellCount / 2);
    for (let i = center - half; i < center; i++) active.add(i);
    for (let i = center; i < center + half; i++) active.add(i);
    if (cellCount % 2 === 1) {
      const extra = center + half;
      if (extra < nTotal) active.add(extra);
    }
  }
  return active;
}

// ------------------------------------------------------------
// 5. 마크 빌드 (build_bay_marks)
// ------------------------------------------------------------
// containers: [{ bay, row, tier, pod, iso, dg, awk, oog, ... }, ...]
// posMap: Map("bay|tier" → Map(rowLbl → container))
// getSelfMarkFn: (container, pod) => 'o'|'R'|'D'|'P'|'U'|'T'|'A'|'G'|'X'
//   (검수앱 자체 마크 로직을 호출자가 주입 — AWK, OOG 등 검수앱 고유 마크 보존)
export function buildPosMap(containers) {
  // bay/tier는 string("01") or number(1) 양쪽 케이스 안전 처리 — Number로 통일
  const posMap = new Map();
  for (const c of containers) {
    const bay = Number(c.bay);
    const tier = Number(c.tier);
    if (!Number.isFinite(bay) || !Number.isFinite(tier)) continue;
    const rowLbl = String(c.row).padStart(2, '0');
    const key = `${bay}|${tier}`;
    if (!posMap.has(key)) posMap.set(key, new Map());
    posMap.get(key).set(rowLbl, c);
  }
  return posMap;
}

// 페어 키 형식: "(EE)OO" — 짝수 EE + 홀수 OO 데이터를 합쳐 그림.
// 단독 키 형식: "OO" — 홀수 OO 자체 + 양옆 짝수 shadow X.
// xrayMap: { cn: true } 형태. 해당 컨테이너 위치에 xray 플래그 표시.
// getColorKeyFn(c): 컨테이너의 컬러 매핑 key 반환 (양하: 선사코드, 선적: POD 3자). 평택분 외엔 null.
// isThroughFn(c): 통과화물 판정. 회색 셀 처리용.
export function buildBayMarks(bayKey, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn) {
  const marks = new Map();
  const xrays = new Map();
  const colors = new Map();
  const throughs = new Map();
  const shadow20s = new Map(); // M6.86.8.19: 양옆 짝수 20ft 자리 = 회색 표시
  const ensureTier = (tier) => {
    if (!marks.has(tier)) marks.set(tier, new Map());
    return marks.get(tier);
  };
  const ensureXrayTier = (tier) => {
    if (!xrays.has(tier)) xrays.set(tier, new Map());
    return xrays.get(tier);
  };
  const ensureColorTier = (tier) => {
    if (!colors.has(tier)) colors.set(tier, new Map());
    return colors.get(tier);
  };
  const ensureThroughTier = (tier) => {
    if (!throughs.has(tier)) throughs.set(tier, new Map());
    return throughs.get(tier);
  };
  const ensureShadow20Tier = (tier) => {
    if (!shadow20s.has(tier)) shadow20s.set(tier, new Map());
    return shadow20s.get(tier);
  };
  const tagXray = (c, tier, rowLbl) => {
    if (xrayMap && c.cn && xrayMap[c.cn]) {
      ensureXrayTier(tier).set(rowLbl, true);
    }
  };
  const tagColor = (c, tier, rowLbl) => {
    if (getColorKeyFn) {
      const k = getColorKeyFn(c);
      if (k) ensureColorTier(tier).set(rowLbl, k);
    }
  };
  const tagThrough = (c, tier, rowLbl) => {
    if (isThroughFn && isThroughFn(c)) {
      ensureThroughTier(tier).set(rowLbl, true);
    }
  };

  if (bayKey.startsWith('(')) {
    const m = bayKey.replace('(', '').replace(')', '');
    const even = parseInt(m.slice(0, 2), 10);
    const odd = parseInt(m.slice(2), 10);
    for (const b of [even, odd]) {
      for (const [key, rowMap] of posMap.entries()) {
        const [bb, tier] = key.split('|').map(Number);
        if (bb === b) {
          const tierMap = ensureTier(tier);
          for (const [rowLbl, c] of rowMap.entries()) {
            tierMap.set(rowLbl, getSelfMarkFn(c, pod));
            tagXray(c, tier, rowLbl);
            tagColor(c, tier, rowLbl);
            tagThrough(c, tier, rowLbl);
          }
        }
      }
    }
  } else {
    const odd = parseInt(bayKey, 10);
    for (const [key, rowMap] of posMap.entries()) {
      const [bb, tier] = key.split('|').map(Number);
      if (bb === odd) {
        const tierMap = ensureTier(tier);
        for (const [rowLbl, c] of rowMap.entries()) {
          tierMap.set(rowLbl, getSelfMarkFn(c, pod));
          tagXray(c, tier, rowLbl);
          tagColor(c, tier, rowLbl);
          tagThrough(c, tier, rowLbl);
        }
      }
    }
    for (const adjEven of [odd - 1, odd + 1]) {
      if (adjEven > 0) {
        for (const [key, rowMap] of posMap.entries()) {
          const [bb, tier] = key.split('|').map(Number);
          if (bb === adjEven) {
            const tierMap = ensureTier(tier);
            for (const [rowLbl, c] of rowMap.entries()) {
              // M6.91.2: ISO 6346 표준 사이즈 판정.
              //   isoToLabel로 정규화 (45GP → 40HC, L5G1 → 45HC, 45R1 → 40RF 등)
              //   → 양하/선적이 다른 표기로 들어와도 일관 분류.
              const lbl = isoToLabel(c.iso) || '';
              const is40OrMore = lbl.startsWith('40') || lbl.startsWith('45');
              if (tierMap.has(rowLbl)) continue;
              if (is40OrMore) {
                tierMap.set(rowLbl, 'X');
              } else {
                // 20ft 짝수: 셀 자리 차지 + 회색 (마크 없음)
                ensureShadow20Tier(tier).set(rowLbl, true);
              }
            }
          }
        }
      }
    }
  }
  return { marks, xrays, colors, throughs, shadow20s };
}

// ------------------------------------------------------------
// 6. 한 베이의 모든 렌더 데이터를 한 번에 계산 (편의 함수)
// ------------------------------------------------------------
// 컴포넌트는 이 함수가 반환하는 객체를 그대로 JSX로 렌더.
import { getBayOverride } from './data/shipBayDict_pdf_override.js';
import { isoToLabel } from './utils.js';

// M6.91.0: PDF STOWAGE INSTRUCTION에서 추출한 베이별 정답 데이터 사용 (DJCT/SWAT 우선).
//   override가 있으면 추측 안 함. 없으면 베이사전 기본 fallback.

export function computeBayRenderData(bayKey, pdfBays, matrixBays, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn, shipBayDef, shipCode) {
  const pdf = pdfBays[bayKey];
  if (!pdf) return null;

  const isPair = bayKey.startsWith('(');
  let oddNum;
  if (isPair) {
    oddNum = parseInt(bayKey.replace('(', '').replace(')', '').slice(2), 10);
  } else {
    oddNum = parseInt(bayKey, 10);
  }
  const bayData = matrixBays.find(b => b.bayNum === oddNum);

  // M6.93.10: 사용자가 매트릭스 빌더로 저장한 cells 우선 사용.
  //   bayData는 v5 matrixBays라 사용자 수정 cells 무시됨 (사용자 보고).
  //   shipBayDef.baysSummary에서 직접 lookup. 필드명 호환 (bayNo 2자리 / bay 3자리).
  const oddKey2 = String(oddNum).padStart(2, '0');
  const oddKey3 = String(oddNum).padStart(3, '0');
  const userBay = shipBayDef?.baysSummary?.find(b =>
    b.bayNo === oddKey2 || b.bay === oddKey3 || b.bay === oddKey2
  );

  // M6.93.12: 우선순위 — userBay(사용자 직접 수정) > override(개발자 박아둔 정답) > v5 > fallback
  //   원칙: 사용자가 ShipMatrixBuilderModal에서 직접 수정한 데이터는 사용자 외에 변경 금지.
  //         override는 사용자가 아직 수정 안 한 베이의 fallback일 뿐.
  //   M6.91.0: PDF override는 DJCT/SWAT 등 추측 안 하기 위한 정답 데이터지만,
  //            사용자가 직접 수정했다면 그 의도가 최우선.
  const override = getBayOverride(shipCode, oddNum);
  const rowMaxOdd = shipBayDef?.rowMaxOdd;
  const rowMaxEven = shipBayDef?.rowMaxEven;

  // rowCount: userBay 우선
  const userRowCount = (typeof userBay?.rowCount === 'number' && userBay.rowCount > 0) ? userBay.rowCount : null;
  const deckRowMax = userRowCount ?? (override ? override.rowCount : (rowMaxEven || rowMaxOdd || 10));
  const holdRowMax = userRowCount ?? (override ? override.rowCount : (rowMaxOdd || rowMaxEven || 9));

  // hasZero: userBay 우선
  let hasZero;
  if (userBay && typeof userBay.hasZero === 'boolean') {
    hasZero = userBay.hasZero;
  } else if (override) {
    hasZero = override.hasZero;
  } else {
    // EDI 검증 fallback
    const ediRows = new Set();
    const bayNumsToCheck = isPair
      ? [parseInt(bayKey.replace('(', '').replace(')', '').slice(0, 2), 10), oddNum]
      : [oddNum];
    for (const [key, rowMap] of posMap.entries()) {
      const [bb] = key.split('|').map(Number);
      if (bayNumsToCheck.includes(bb)) {
        for (const [rowLbl] of rowMap.entries()) ediRows.add(Number(rowLbl));
      }
    }
    hasZero = ediRows.has(0);
  }

  const deckTiers =
       (userBay?.deckTiers && userBay.deckTiers.length > 0 ? userBay.deckTiers : null)
    || (userBay?.deckTiersLocal && userBay.deckTiersLocal.length > 0 ? userBay.deckTiersLocal : null)
    || override?.deckTiers
    || (bayData?.deckTiers && bayData.deckTiers.length > 0 ? bayData.deckTiers : pdf.deck_t);
  const holdTiers =
       (userBay?.holdTiers && userBay.holdTiers.length > 0 ? userBay.holdTiers : null)
    || (userBay?.holdTiersLocal && userBay.holdTiersLocal.length > 0 ? userBay.holdTiersLocal : null)
    || override?.holdTiers
    || (bayData?.holdTiers && bayData.holdTiers.length > 0 ? bayData.holdTiers : pdf.hold_t);
  const nDeck = deckTiers.length;
  const nHold = holdTiers.length;


  // M6.93.12: cells 우선순위 — userBay > override > v5 cells > v5 deckCells > fallback
  //   사용자 직접 수정 최우선 보호.
  let deckCells, holdCells;
  if (userBay?.deckCells && userBay.deckCells.length > 0) {
    deckCells = userBay.deckCells.slice(0, nDeck);
  } else if (override?.deckCells && override.deckCells.length > 0) {
    deckCells = override.deckCells;
  } else if (bayData?.cells && bayData.cells.length > 0) {
    deckCells = bayData.cells.slice(0, nDeck);
  } else if (bayData?.deckCells && bayData.deckCells.length > 0) {
    deckCells = bayData.deckCells.slice(0, nDeck);
  } else {
    deckCells = new Array(nDeck).fill(deckRowMax);
  }
  if (userBay?.holdCells && userBay.holdCells.length > 0) {
    holdCells = userBay.holdCells.slice(0, nHold);
  } else if (override?.holdCells && override.holdCells.length > 0) {
    holdCells = override.holdCells;
  } else if (bayData?.cells && bayData.cells.length > 0) {
    holdCells = bayData.cells.slice(nDeck, nDeck + nHold);
  } else if (bayData?.holdCells && bayData.holdCells.length > 0) {
    holdCells = bayData.holdCells.slice(0, nHold);
  } else {
    holdCells = new Array(nHold).fill(holdRowMax);
  }
  // 길이 보정 (cells 부족하면 rowMax로 채움)
  if (deckCells.length < nDeck) deckCells = [...deckCells, ...new Array(nDeck - deckCells.length).fill(deckRowMax)];
  if (holdCells.length < nHold) holdCells = [...holdCells, ...new Array(nHold - holdCells.length).fill(holdRowMax)];

  // M6.90.0: deck/hold row labels 별도. cells 자체 폭 + CSS center로 박스 안 정렬.
  const deckRowPos = getRowPositions(deckRowMax, hasZero);
  const holdRowPos = getRowPositions(holdRowMax, hasZero);
  const nDeckCols = deckRowPos.length;
  const nHoldCols = holdRowPos.length;
  const holdOffset = 0; // hold 자체 폭 사용 — CSS center 정렬

  const { marks: bayMarks, xrays: bayXrays, colors: bayColors, throughs: bayThroughs, shadow20s: bayShadow20s } = buildBayMarks(bayKey, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn);

  // deck tier별 셀 배열 (자리 통일: STANDARD_DECK 6 tier 모두 렌더)
  const deckRows = STANDARD_DECK.map((stdT) => {
    if (deckTiers.includes(stdT)) {
      const idx = deckTiers.indexOf(stdT);
      const cc = idx < deckCells.length ? deckCells[idx] : 0;
      const activeSet = getActiveColsSymmetric(cc, nDeckCols);
      const rowMarks = bayMarks.get(stdT) || new Map();
      const rowXrays = bayXrays.get(stdT) || new Map();
      const rowColors = bayColors.get(stdT) || new Map();
      const rowThroughs = bayThroughs.get(stdT) || new Map();
      const rowShadow20 = bayShadow20s.get(stdT) || new Map();
      const cells = [];
      for (let c = 0; c < nDeckCols; c++) {
        const rowLbl = deckRowPos[c];
        const inActive = activeSet.has(c);
        const mark = rowLbl ? (rowMarks.get(rowLbl) || null) : null;
        const isShadow20 = rowLbl ? !!rowShadow20.get(rowLbl) : false;
        if (inActive) {
          // M6.90.3: hull 단면 안쪽만 active. 바깥은 cell-empty (visibility:hidden) — 사용 못하는 셀 안 보임.
          cells.push({ active: true, rowLbl, mark, isXray: rowLbl ? !!rowXrays.get(rowLbl) : false, colorKey: rowLbl ? (rowColors.get(rowLbl) || null) : null, isThrough: rowLbl ? !!rowThroughs.get(rowLbl) : false, isShadow20 });
        } else {
          cells.push({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false, isShadow20: false });
        }
      }
      return { tier: stdT, invisible: false, cells };
    } else {
      const cells = new Array(nDeckCols).fill(null).map(() => ({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false, isShadow20: false }));
      return { tier: stdT, invisible: true, cells };
    }
  });

  // hold tier별 셀 배열 — M6.86.8.20: hold 자체 폭(nHoldCols)으로 cells 생성.
  //   deck/hold 폭이 1칸 차이일 때 CSS에서 0.5칸씩 좌우 띄어 박스 안 horizontal center.
  //   이전엔 nDeckCols 폭에 끼워넣어 floor offset으로 비대칭 (좌2/우1 또는 좌0/우1).
  const holdRows = STANDARD_HOLD.map((stdT) => {
    if (holdTiers.includes(stdT)) {
      const idx = holdTiers.indexOf(stdT);
      const cc = idx < holdCells.length ? holdCells[idx] : 0;
      const activeInHold = getActiveColsSymmetric(cc, nHoldCols);
      const rowMarks = bayMarks.get(stdT) || new Map();
      const rowXrays = bayXrays.get(stdT) || new Map();
      const rowColors = bayColors.get(stdT) || new Map();
      const rowThroughs = bayThroughs.get(stdT) || new Map();
      const rowShadow20 = bayShadow20s.get(stdT) || new Map();
      const cells = [];
      for (let c = 0; c < nHoldCols; c++) {
        const rowLbl = holdRowPos[c];
        const inActive = activeInHold.has(c);
        const mark = rowLbl ? (rowMarks.get(rowLbl) || null) : null;
        const isShadow20 = rowLbl ? !!rowShadow20.get(rowLbl) : false;
        if (inActive) {
          cells.push({ active: true, rowLbl, mark, isXray: rowLbl ? !!rowXrays.get(rowLbl) : false, colorKey: rowLbl ? (rowColors.get(rowLbl) || null) : null, isThrough: rowLbl ? !!rowThroughs.get(rowLbl) : false, isShadow20 });
        } else {
          cells.push({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false, isShadow20: false });
        }
      }
      return { tier: stdT, invisible: false, cells };
    } else {
      // invisible row도 nHoldCols 폭 (hold-area 자체 폭과 일관)
      const cells = new Array(nHoldCols).fill(null).map(() => ({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false, isShadow20: false }));
      return { tier: stdT, invisible: true, cells };
    }
  });

  return {
    bayKey,
    isPair: bayKey.startsWith('('),
    deckTiers, holdTiers, nDeck, nHold, hasZero,
    deckRowPos, holdRowPos, nDeckCols, nHoldCols,
    deckRows, holdRows,
  };
}

// ------------------------------------------------------------
// 7. 기본 get_self_mark (검수앱이 확장해서 주입)
// ------------------------------------------------------------
// M6.81 기본 마크 7종: o, R, D, P, U, T, X
export function defaultGetSelfMark(c, pod) {
  if (c.pod !== pod) return 'X';
  if (c.dg) return 'D';
  const iso = c.iso || '';
  const typeChar = iso.length >= 3 ? iso[2] : 'G';
  if (typeChar === 'R') return 'R';
  if (typeChar === 'P') return 'P';
  if (typeChar === 'U') return 'U';
  if (typeChar === 'T') return 'T';
  return 'o';
}
