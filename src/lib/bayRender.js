// 베이 박스 렌더링 helper — 검수앱 cargoPlanCore 로직과 호환

// 표준 tier 자리 (모든 베이 같은 자리에 그리기 위한 padding용)
export const STANDARD_DECK = [94, 92, 90, 88, 86, 84, 82];
export const STANDARD_HOLD = [10, 8, 6, 4, 2];

// row 라벨 생성 (cellCount, hasZero에 따라 좌측 짝수 + (00) + 우측 홀수)
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
    const halfEvens = Math.floor(cellCount / 2);
    const halfOdds = cellCount - halfEvens;
    const evens = [];
    for (let n = halfEvens * 2; n > 0; n -= 2) evens.push(pad(n));
    const odds = [];
    for (let n = 1; n <= halfOdds * 2 - 1; n += 2) odds.push(pad(n));
    return [...evens, ...odds];
  }
}

// active cells set (cells가 row 위치들 중 어디에 칠해질지)
// 가운데 정렬 기본 + 짝수/홀수 cells 대응
export function getActiveColsSymmetric(cellCount, nTotal) {
  const active = new Set();
  if (cellCount >= nTotal) {
    for (let i = 0; i < nTotal; i++) active.add(i);
    return active;
  }
  if (cellCount <= 0) return active;

  const center = Math.floor(nTotal / 2);
  if (nTotal % 2 === 1) {
    // 홀수 nTotal (hasZero=true → row 00이 center)
    if (cellCount % 2 === 1) {
      const half = Math.floor((cellCount - 1) / 2);
      for (let i = center - half; i <= center + half; i++) active.add(i);
    } else {
      // 짝수 cells + 홀수 total: 가운데 두 자리 (row 00, 01)
      const half = cellCount / 2;
      for (let i = center - half + 1; i <= center + half; i++) active.add(i);
    }
  } else {
    // 짝수 nTotal (hasZero=false)
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

// 빈 베이 박스 렌더 데이터 생성 (BayBox 컴포넌트에 그대로 전달)
export function buildBayRenderData(bay) {
  if (!bay) return null;
  const {
    rowCount = 8, hasZero = false,
    deckTiers = [], holdTiers = [],
    deckCells = [], holdCells = [],
    holdAlign = 'center', holdPadLeft = 0, holdPadRight = 0,
  } = bay;

  const nCols = rowCount + (hasZero ? 1 : 0);
  const rowPos = getRowPositions(nCols, hasZero);
  const nHoldCols = nCols; // 단순화

  // deck rows
  const deckRows = STANDARD_DECK.map(stdT => {
    const idx = deckTiers.map(Number).indexOf(stdT);
    if (idx === -1) {
      return { tier: stdT, invisible: true, cells: new Array(nCols).fill({ active: false }) };
    }
    const cc = deckCells[idx] || 0;
    const active = getActiveColsSymmetric(cc, nCols);
    const cells = [];
    for (let c = 0; c < nCols; c++) {
      cells.push({ active: active.has(c), rowLbl: active.has(c) ? rowPos[c] : null });
    }
    return { tier: stdT, invisible: false, cells };
  });

  // hold rows + offset (사용자 정렬/padding)
  const _diff = nCols - nHoldCols; // 0 (단순화 시)
  let offsetHold;
  if (holdPadLeft > 0 || holdPadRight > 0) offsetHold = holdPadLeft;
  else if (holdAlign === 'left') offsetHold = 0;
  else if (holdAlign === 'right') offsetHold = Math.max(0, _diff);
  else offsetHold = Math.floor(_diff / 2);

  const holdRows = STANDARD_HOLD.map(stdT => {
    const idx = holdTiers.map(Number).indexOf(stdT);
    if (idx === -1) {
      return { tier: stdT, invisible: true, cells: new Array(nCols).fill({ active: false }) };
    }
    const cc = holdCells[idx] || 0;
    const activeInHold = getActiveColsSymmetric(cc, nHoldCols);
    const activeInDeck = new Set([...activeInHold].map(a => a + offsetHold));
    const cells = [];
    for (let c = 0; c < nCols; c++) {
      cells.push({ active: activeInDeck.has(c), rowLbl: activeInDeck.has(c) ? rowPos[c] : null });
    }
    return { tier: stdT, invisible: false, cells };
  });

  return {
    rowPos, nCols, nHoldCols,
    deckTiers: deckTiers.map(Number),
    holdTiers: holdTiers.map(Number),
    deckRows, holdRows,
    offsetHold,
  };
}

// 베이 키 (단독: '11', 페어: '(12)13')
export function bayKey(bay) {
  if (!bay) return '';
  if (bay.pairEven) return `(${bay.pairEven})${bay.bayNo}`;
  return bay.bayNo;
}
