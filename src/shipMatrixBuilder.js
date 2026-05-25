// src/shipMatrixBuilder.js
// EDI/사전/PDF에서 베이 매트릭스 구축 — M6.93.1
//
// 우선순위 (사용자 가르침):
//   1. EDI: 적재된 row/tier 실데이터 (가장 신뢰)
//   2. 베이사전: EDI 부족분 보강 (rowCount, hasZero, tier max 등)
//   3. PDF: 베이사전에도 없을 때 사용자 요청 → 추가 보강
//   4. 사용자 폼: 최종 검증/cells 입력

import { getShipBayDictData } from './shipStructure.js';

/**
 * voyage.info에서 선박 메타데이터 자동 추출
 *   M5.87: EDI TDT 세그먼트에서 callsign + vsl 자동 추출됨
 * @param {Object} voyage
 * @returns {Object} { code, name, imo, callsign, voy }
 */
export function extractShipMetaFromVoyage(voyage) {
  const info = voyage?.info || {};
  const callsign = (info.callsign || '').toUpperCase().trim();
  const vsl = info.vsl || info.vesselName || info.name || '';
  const imo = info.imo || '';
  const voy = info.voy_d || info.voy_l || info.voy || '';

  // CASP 코드 자동 추론 (사용자가 모르므로 자동)
  //   우선순위:
  //   1) info.code (베이사전이 이미 매칭됐으면 갖고 있음)
  //   2) callsign 처음 4자 (예: V7A576 → V7A5)
  //   3) vsl 단어들 첫 글자 (예: SAWASDEE ATLANTIC → SAAT)
  //   4) vsl 처음 4자
  let code = info.code || '';
  if (!code && callsign && callsign.length >= 4) {
    code = callsign.substring(0, 4);
  }
  if (!code && vsl) {
    const words = vsl.toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      code = words.slice(0, 4).map(w => w[0]).join('');
      if (code.length < 4 && words[0]) code = (code + words[0].substring(1)).substring(0, 4);
    } else if (words[0]) {
      code = words[0].substring(0, 4);
    }
  }

  return { code: code || '', name: vsl, imo, callsign, voy };
}

/**
 * 빈 베이 엔트리 생성 (사용자가 직접 베이 추가 시)
 * 기본값: 일반 컨선 베이 구조
 * @param {string} bayNum - "001" 형식
 * @param {string|null} pairEven - 페어 짝수 번호 (단독이면 null)
 * @returns {Object} 매트릭스 엔트리
 */
export function createEmptyBayEntry(bayNum, pairEven = null) {
  return {
    bayNum: String(parseInt(bayNum)).padStart(3, '0'),
    pairEven,
    rowCount: 9,
    hasZero: true,
    deckTiers: [88, 86, 84, 82],
    holdTiers: [8, 6, 4, 2],
    deckCells: [9, 9, 9, 9],
    holdCells: [9, 9, 9, 9],
    sourceRows: [],
    sourceTiers: [],
    rowTierPairs: [],
    source: 'user',
  };
}

/**
 * 누락된 베이 추정 (베이 번호 패턴 기반)
 * 예: 01, 03, 05, 09, 11 있음 → 07 누락 의심
 *     02, 06, 08 있음 → 04 누락 의심
 * @param {Object} matrix
 * @returns {Array} [{bayNum, reason}, ...]
 */
export function detectMissingBays(matrix) {
  const present = Object.keys(matrix?.byBay || {}).map(k => parseInt(k)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (present.length < 2) return [];

  const presentSet = new Set(present);
  const suggestions = [];

  // 홀수 베이 누락 (홀수 베이가 2개 이상 있을 때)
  const odds = present.filter(n => n % 2 === 1);
  if (odds.length >= 2) {
    const minO = odds[0];
    const maxO = odds[odds.length - 1];
    for (let n = minO; n <= maxO; n += 2) {
      if (!presentSet.has(n)) suggestions.push({ bayNum: String(n).padStart(3, '0'), reason: '홀수 패턴 누락' });
    }
  }

  // 짝수 베이 누락 (페어의 짝수)
  const evens = present.filter(n => n % 2 === 0);
  if (evens.length >= 2) {
    const minE = evens[0];
    const maxE = evens[evens.length - 1];
    for (let n = minE; n <= maxE; n += 2) {
      if (!presentSet.has(n)) suggestions.push({ bayNum: String(n).padStart(3, '0'), reason: '짝수 패턴 누락' });
    }
  }

  // BAY 01 누락 (홀수 패턴이 03부터 시작하는데 01은 베이 통상 있음)
  if (odds.length > 0 && odds[0] >= 3 && !presentSet.has(1)) {
    suggestions.unshift({ bayNum: '001', reason: 'BAY 01 통상 존재 (선수)' });
  }

  // 중복 제거
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.bayNum)) return false;
    seen.add(s.bayNum);
    return true;
  });
}

/**
 * 매트릭스 분석 요약 (UI 상태 카드용)
 * @param {Object} matrix
 * @returns {Object} { totalBays, pairCount, singleCount, hasHoldCount, deckOnlyCount, needReviewCount }
 */
export function summarizeMatrix(matrix) {
  const bays = Object.values(matrix?.byBay || {});
  let pairCount = 0;
  let singleCount = 0;
  let hasHoldCount = 0;
  let deckOnlyCount = 0;
  let needReviewCount = 0;
  for (const b of bays) {
    if (b.pairEven) pairCount++; else singleCount++;
    if (b.holdTiers && b.holdTiers.length > 0) hasHoldCount++;
    if ((!b.holdTiers || b.holdTiers.length === 0) && b.deckTiers && b.deckTiers.length > 0) deckOnlyCount++;
    if (!b.rowCount || b.rowCount < 5 || (!b.deckTiers?.length && !b.holdTiers?.length)) {
      needReviewCount++;
    }
  }
  return {
    totalBays: bays.length,
    pairCount, singleCount,
    hasHoldCount, deckOnlyCount,
    needReviewCount,
  };
}

/**
 * 매트릭스 분석 요약 (UI 상태 카드용) — pad 헬퍼는 아래
 */

const pad3 = b => String(parseInt(b)).padStart(3, '0');
const pad2 = n => String(n).padStart(2, '0');

/**
 * EDI containers → 베이별 매트릭스 후보
 * @param {Array} containers - parseBAPLIE 결과
 * @returns {Object} { byBay: { '001': {rowCount, hasZero, deckTiers, holdTiers, sourceRows, sourceTiers, deckCells, holdCells}, ... } }
 */
export function buildMatrixFromEdi(containers) {
  const byBay = {};
  for (const c of containers) {
    if (!c.bay || !c.row || !c.tier) continue;
    const b = pad3(c.bay);
    if (!byBay[b]) {
      byBay[b] = {
        bayNum: b,
        sourceRows: new Set(),
        sourceTiers: new Set(),
        rowTierPairs: new Set(), // "row-tier" — cells 계산용
      };
    }
    byBay[b].sourceRows.add(pad2(c.row));
    byBay[b].sourceTiers.add(pad2(c.tier));
    byBay[b].rowTierPairs.add(`${pad2(c.row)}-${pad2(c.tier)}`);
  }

  // 각 베이 매트릭스 계산
  for (const b of Object.keys(byBay)) {
    const entry = byBay[b];
    const rows = Array.from(entry.sourceRows).sort();
    const tiers = Array.from(entry.sourceTiers).sort();

    // rowCount: 실 적재 row max → 일반 컨선 row 패턴 추정
    // hasZero: 00 있으면 true
    const hasZero = rows.includes('00');
    // row max (홀짝 분리)
    const oddMax = Math.max(...rows.filter(r => parseInt(r) % 2 === 1).map(Number), 0);
    const evenMax = Math.max(...rows.filter(r => parseInt(r) % 2 === 0).map(Number), 0);
    // rowCount 추정: max 짝수 + max 홀수 (+1 if hasZero)
    // 예: oddMax=9, evenMax=10, hasZero=true → 11 rows (10,8,6,4,2,0,1,3,5,7,9)
    //     oddMax=9, evenMax=10, hasZero=false → 10 rows
    let rowCount = 0;
    if (oddMax > 0 || evenMax > 0) {
      const odds = oddMax > 0 ? Math.floor(oddMax / 2) + 1 : 0; // 1,3,5,7,9 → max 9면 5개
      const evens = evenMax > 0 ? Math.floor(evenMax / 2) : 0;  // 2,4,6,8,10 → max 10면 5개
      rowCount = odds + evens + (hasZero ? 1 : 0);
    }

    // deck/hold 분리: tier ≥ 80 = deck, < 80 = hold (관행)
    const deckTiers = tiers.filter(t => parseInt(t) >= 80).map(Number).sort((a, b) => b - a);
    const holdTiers = tiers.filter(t => parseInt(t) < 80).map(Number).sort((a, b) => b - a);

    // cells: 각 tier에 실제 적재된 row 개수 (PDF "셀 마크 카운트"와 동등)
    const deckCells = deckTiers.map(t => {
      let cnt = 0;
      for (const p of entry.rowTierPairs) {
        if (p.endsWith('-' + pad2(t))) cnt++;
      }
      return cnt > 0 ? cnt : rowCount; // 빈 tier는 rowCount 기본값
    });
    const holdCells = holdTiers.map(t => {
      let cnt = 0;
      for (const p of entry.rowTierPairs) {
        if (p.endsWith('-' + pad2(t))) cnt++;
      }
      return cnt > 0 ? cnt : rowCount;
    });

    entry.rowCount = rowCount;
    entry.hasZero = hasZero;
    entry.deckTiers = deckTiers;
    entry.holdTiers = holdTiers;
    entry.deckCells = deckCells;
    entry.holdCells = holdCells;
    entry.source = 'edi';
    // 정리 (직렬화 위해)
    entry.sourceRows = rows;
    entry.sourceTiers = tiers;
    entry.rowTierPairs = Array.from(entry.rowTierPairs);
  }

  return { byBay };
}

/**
 * 베이사전 데이터로 EDI 매트릭스 보강
 * @param {Object} matrix - buildMatrixFromEdi 결과
 * @param {string} imo
 * @param {string} code
 * @returns {Object} 보강된 matrix + bayDict 메타
 */
export function augmentMatrixFromBayDict(matrix, imo, code) {
  const dictData = getShipBayDictData(imo, code);
  if (!dictData) {
    return { ...matrix, bayDictUsed: false };
  }

  const baysSummary = dictData.bayDef?.baysSummary || [];
  for (const bs of baysSummary) {
    const bay = pad3(bs.bay);
    if (!matrix.byBay[bay]) {
      // EDI에 없는 베이도 사전에서 추가 (빈 베이)
      matrix.byBay[bay] = {
        bayNum: bay,
        sourceRows: [],
        sourceTiers: [],
        rowTierPairs: [],
        rowCount: 0,
        hasZero: false,
        deckTiers: [],
        holdTiers: [],
        deckCells: [],
        holdCells: [],
        source: 'baydict',
      };
    }
    const entry = matrix.byBay[bay];
    // 베이사전이 더 큰 rowCount/tier 가지고 있으면 그것 사용
    if (bs.rowMaxOdd != null || bs.rowMaxEven != null) {
      // 베이사전 row max 정보로 보강
      const dictOddMax = bs.rowMaxOdd || 0;
      const dictEvenMax = bs.rowMaxEven || 0;
      const dictHasZero = !!bs.hasZero || entry.hasZero;
      const odds = dictOddMax > 0 ? Math.floor(dictOddMax / 2) + 1 : 0;
      const evens = dictEvenMax > 0 ? Math.floor(dictEvenMax / 2) : 0;
      const dictRowCount = odds + evens + (dictHasZero ? 1 : 0);
      if (dictRowCount > entry.rowCount) {
        entry.rowCount = dictRowCount;
        entry.hasZero = dictHasZero;
        entry.source = entry.source === 'edi' ? 'edi+dict' : 'baydict';
      }
    }
    // tier 정보 (사전이 더 풍부하면 채택)
    if (bs.deckTiers && bs.deckTiers.length > entry.deckTiers.length) {
      entry.deckTiers = [...bs.deckTiers].sort((a, b) => b - a);
      // cells 재구성 (cells 정보가 사전에 없으면 rowCount로 기본 채움)
      entry.deckCells = entry.deckTiers.map(() => entry.rowCount);
      entry.source = entry.source.includes('dict') ? entry.source : entry.source + '+dict';
    }
    if (bs.holdTiers && bs.holdTiers.length > entry.holdTiers.length) {
      entry.holdTiers = [...bs.holdTiers].sort((a, b) => b - a);
      entry.holdCells = entry.holdTiers.map(() => entry.rowCount);
      entry.source = entry.source.includes('dict') ? entry.source : entry.source + '+dict';
    }
  }

  return { ...matrix, bayDictUsed: true, bayDictMeta: { imo, code, name: dictData.name } };
}

/**
 * PDF 파싱 결과로 매트릭스 보강
 * @param {Object} matrix
 * @param {Object} pdfResult - pdfBayParser.parsePdfStowage 결과 { bays: [{bayNum, rowCount, hasZero, deckTiers, holdTiers, deckCells, holdCells, pairEven}] }
 * @returns {Object}
 */
export function augmentMatrixFromPdf(matrix, pdfResult) {
  if (!pdfResult || !pdfResult.bays) return matrix;
  for (const pb of pdfResult.bays) {
    const bay = pad3(pb.bayNum);
    if (!matrix.byBay[bay]) {
      matrix.byBay[bay] = { bayNum: bay, source: 'pdf' };
    }
    const entry = matrix.byBay[bay];
    // PDF가 더 큰 rowCount 가지고 있으면 채택
    if ((pb.rowCount || 0) > (entry.rowCount || 0)) {
      entry.rowCount = pb.rowCount;
      entry.hasZero = pb.hasZero;
    }
    // tier: PDF가 더 풍부하면 채택
    if (pb.deckTiers && pb.deckTiers.length > (entry.deckTiers?.length || 0)) {
      entry.deckTiers = [...pb.deckTiers].sort((a, b) => b - a);
      entry.deckCells = pb.deckCells || entry.deckTiers.map(() => entry.rowCount);
    }
    if (pb.holdTiers && pb.holdTiers.length > (entry.holdTiers?.length || 0)) {
      entry.holdTiers = [...pb.holdTiers].sort((a, b) => b - a);
      entry.holdCells = pb.holdCells || entry.holdTiers.map(() => entry.rowCount);
    }
    // 페어 정보
    if (pb.pairEven) entry.pairEven = pb.pairEven;
    entry.source = entry.source ? entry.source + '+pdf' : 'pdf';
  }
  matrix.pdfUsed = true;
  return matrix;
}

/**
 * 매트릭스 → userBayDict entry 형식 변환
 * @param {Object} matrix
 * @param {string} code
 * @param {string} name
 * @param {string} imo
 * @returns {Object} bayDictEntry
 */
export function matrixToBayDictEntry(matrix, code, name, imo) {
  const baysSummary = Object.keys(matrix.byBay).sort().map(bay => {
    const e = matrix.byBay[bay];
    return {
      bay,
      rowCount: e.rowCount,
      hasZero: e.hasZero,
      deckTiers: e.deckTiers,
      holdTiers: e.holdTiers,
      deckCells: e.deckCells,
      holdCells: e.holdCells,
      hasDeck: e.deckTiers && e.deckTiers.length > 0,
      hasHold: e.holdTiers && e.holdTiers.length > 0,
      source: e.source,
    };
  });
  return {
    imo: imo || '',
    code: code || '',
    name: name || '',
    callsign: '',
    bayDef: {
      recordCount: baysSummary.length,
      sourceFile: 'matrix_builder',
      parsedAt: new Date().toISOString(),
      sourceVersion: 'M6.93.1',
      verified: true,
      baysSummary,
    },
  };
}
