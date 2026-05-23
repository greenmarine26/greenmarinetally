// ============================================================
// Tallyman Master · Cargo Plan Core (M6.81 Universal 포팅)
// ============================================================
// M6.81 build_cargo_plan_universal.py의 핵심 4함수를 JS로 그대로 포팅.
// 검증된 정답 알고리즘 (STSE 2631E 525 컨테이너 검증 완료).
//
// 베이사전 = 절대 기준. 각 베이의 cells 배열로 hull 단면 결정.
// STANDARD_DECK [92,90,88,86,84,82] + STANDARD_HOLD [8,6,4,2] tier 자리 통일.
// 각 베이의 실제 deck_t/hold_t는 그 베이의 cells 분포로 결정.
// 페이지 폭 통일 (globalRowRange/pageDeckUnion) 절대 사용 금지.
// ============================================================

export const STANDARD_DECK = [92, 90, 88, 86, 84, 82];
export const STANDARD_HOLD = [8, 6, 4, 2];

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
export function getRowPositions(cellCount, hasZero) {
  if (cellCount <= 0) return [];
  const pad = (n) => String(n).padStart(2, '0');
  if (hasZero) {
    const half = Math.floor((cellCount - 1) / 2);
    const evens = [];
    for (let n = half * 2; n > 0; n -= 2) evens.push(pad(n));
    const odds = [];
    for (let n = 1; n < half * 2; n += 2) odds.push(pad(n));
    return [...evens, '00', ...odds];
  } else {
    const half = Math.floor(cellCount / 2);
    const evens = [];
    for (let n = half * 2; n > 0; n -= 2) evens.push(pad(n));
    const odds = [];
    for (let n = 1; n < half * 2; n += 2) odds.push(pad(n));
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
      const half = Math.floor(cellCount / 2);
      for (let i = center - half; i < center; i++) active.add(i);
      for (let i = center + 1; i < center + 1 + half; i++) active.add(i);
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
export function buildBayMarks(bayKey, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn) {
  const marks = new Map();
  const xrays = new Map();
  const colors = new Map();
  const throughs = new Map(); // tier → Map<rowLbl, true>
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
            for (const rowLbl of rowMap.keys()) {
              if (!tierMap.has(rowLbl)) tierMap.set(rowLbl, 'X'); // shadow X (40ft 그림자)
            }
          }
        }
      }
    }
  }
  return { marks, xrays, colors, throughs };
}

// ------------------------------------------------------------
// 6. 한 베이의 모든 렌더 데이터를 한 번에 계산 (편의 함수)
// ------------------------------------------------------------
// 컴포넌트는 이 함수가 반환하는 객체를 그대로 JSX로 렌더.
export function computeBayRenderData(bayKey, pdfBays, matrixBays, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn) {
  const pdf = pdfBays[bayKey];
  if (!pdf) return null;

  let oddNum;
  if (bayKey.startsWith('(')) {
    oddNum = parseInt(bayKey.replace('(', '').replace(')', '').slice(2), 10);
  } else {
    oddNum = parseInt(bayKey, 10);
  }
  const bayData = matrixBays.find(b => b.bayNum === oddNum);

  const deckTiers = pdf.deck_t;
  const holdTiers = pdf.hold_t;
  const nDeck = deckTiers.length;
  const nHold = holdTiers.length;
  const hasZero = pdf.has_zero;

  let deckCells, holdCells;
  if (bayData && bayData.cells && bayData.cells.length > 0) {
    const cells = [...bayData.cells].reverse(); // tier 위→아래
    deckCells = cells.slice(0, nDeck);
    holdCells = cells.length > nDeck ? cells.slice(nDeck, nDeck + nHold) : new Array(nHold).fill(8);
    if (deckCells.length < nDeck) deckCells = [...deckCells, ...new Array(nDeck - deckCells.length).fill(10)];
  } else {
    deckCells = new Array(nDeck).fill(10);
    holdCells = new Array(nHold).fill(8);
  }

  const deckMax = deckCells.length > 0 ? Math.max(...deckCells) : 10;
  // M6.86.8.10: 카스피 정답 양식 — hold 폭을 deck 폭과 통일.
  //   M6.81 Python은 hold_max 따로 계산했지만 카스피는 deck/hold 동일 row 라벨.
  //   hull 단면 차이는 active cells로만 표현 (hold cells가 작으면 active 좁고 나머지 invisible).
  //   효과: deck/hold has_zero 일관, hold 우측 셀 잘림 없음 (cell-empty 자리만 차지).
  const deckRowPos = getRowPositions(deckMax, hasZero);
  const holdRowPos = deckRowPos;
  const nDeckCols = deckRowPos.length;
  const nHoldCols = nDeckCols;

  const { marks: bayMarks, xrays: bayXrays, colors: bayColors, throughs: bayThroughs } = buildBayMarks(bayKey, posMap, pod, getSelfMarkFn, xrayMap, getColorKeyFn, isThroughFn);

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
      const cells = [];
      for (let c = 0; c < nDeckCols; c++) {
        if (activeSet.has(c)) {
          const rowLbl = deckRowPos[c];
          cells.push({ active: true, rowLbl, mark: rowMarks.get(rowLbl) || null, isXray: !!rowXrays.get(rowLbl), colorKey: rowColors.get(rowLbl) || null, isThrough: !!rowThroughs.get(rowLbl) });
        } else {
          cells.push({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false });
        }
      }
      return { tier: stdT, invisible: false, cells };
    } else {
      const cells = new Array(nDeckCols).fill(null).map(() => ({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false }));
      return { tier: stdT, invisible: true, cells };
    }
  });

  // hold tier별 셀 배열 (카스피 정답: deck 폭과 동일, hull 단면은 active cells로)
  const holdRows = STANDARD_HOLD.map((stdT) => {
    if (holdTiers.includes(stdT)) {
      const idx = holdTiers.indexOf(stdT);
      const cc = idx < holdCells.length ? holdCells[idx] : 0;
      const activeInDeck = getActiveColsSymmetric(cc, nDeckCols);
      const rowMarks = bayMarks.get(stdT) || new Map();
      const rowXrays = bayXrays.get(stdT) || new Map();
      const rowColors = bayColors.get(stdT) || new Map();
      const rowThroughs = bayThroughs.get(stdT) || new Map();
      const cells = [];
      for (let c = 0; c < nDeckCols; c++) {
        if (activeInDeck.has(c)) {
          const rowLbl = deckRowPos[c];
          cells.push({ active: true, rowLbl, mark: rowMarks.get(rowLbl) || null, isXray: !!rowXrays.get(rowLbl), colorKey: rowColors.get(rowLbl) || null, isThrough: !!rowThroughs.get(rowLbl) });
        } else {
          cells.push({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false });
        }
      }
      return { tier: stdT, invisible: false, cells };
    } else {
      const cells = new Array(nDeckCols).fill(null).map(() => ({ active: false, rowLbl: null, mark: null, isXray: false, colorKey: null, isThrough: false }));
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
