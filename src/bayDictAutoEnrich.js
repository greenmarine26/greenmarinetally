// 베이사전 자동 보정 (M6.57)
//
// 목적:
//   v2 베이사전의 baysSummary가 entry별로 비어있거나 (예: PCBJ가 {bayNo, section, hasHold, hasDeck, isStandalone}만 있음),
//   사용자가 STOWAGE PDF로 정밀 등록하지 않은 선박이라도,
//   사용 가능한 모든 데이터 소스를 활용해서 카고플랜이 정상 그려질 수 있는 상태로 자동 보정.
//
// 설계 원칙:
//   1. verified 데이터는 절대 덮어쓰지 않음 — "비어있는 필드만" 채움
//   2. 보정 출처를 _enrichedFrom 메타로 명시 (디버그/검수용)
//   3. 부수 효과 없음 — 원본 entry 미수정, deep clone 후 보강
//
// Fallback 우선순위 (각 필드별):
//   L1: 베이 entry 자체에 이미 값 있음 (verified) → 그대로
//   L2: v5 매트릭스 (.def 자동 추출)
//   L3: v2 사전 level (전체 deckTiers/holdTiers, rowMaxEven/Odd)
//   L4: 안전한 default
//
// 변경 양식:
//   원본 entry: {bayNo: "01", hasHold: true, hasDeck: true}
//   보정 후:    {bayNo: "01", hasHold: true, hasDeck: true,
//                deckTiersLocal: [92,90,88,86,84,82,80],  // L3에서 보강
//                holdTiersLocal: [8,6,4,2],                // L3에서 보강
//                rowMaxEvenLocal: 8, rowMaxOddLocal: 7,   // L2 또는 L3
//                _enrichedFrom: {deckTiersLocal: 'L3', rowMaxEvenLocal: 'L2-v5'}}

/**
 * 베이사전 entry를 자동 보정.
 *
 * @param {object} entry      v2/v5/user/firebase의 베이사전 entry
 * @param {object} v5Matrix   v5 매트릭스 정보 (없으면 null)
 * @returns {object}          보정된 entry (deep clone, 원본 미수정)
 */
export function enrichBayDef(entry, v5Matrix) {
  if (!entry || !entry.bayDef) return entry;

  // deep clone (원본 보호)
  const enriched = JSON.parse(JSON.stringify(entry));
  const bd = enriched.bayDef;
  if (!Array.isArray(bd.baysSummary)) return enriched;

  // 사전 level fallback 소스
  const shipDeckTiers = Array.isArray(bd.deckTiers) ? bd.deckTiers.map(Number) : [];
  const shipHoldTiers = Array.isArray(bd.holdTiers) ? bd.holdTiers.map(Number) : [];
  const shipRowMaxEven = typeof bd.rowMaxEven === 'number' ? bd.rowMaxEven : null;
  const shipRowMaxOdd = typeof bd.rowMaxOdd === 'number' ? bd.rowMaxOdd : null;

  // v5 매트릭스를 bayNum 기준 맵으로
  const v5ByBayNum = new Map();
  if (v5Matrix && Array.isArray(v5Matrix.matrixBays)) {
    v5Matrix.matrixBays.forEach(b => {
      if (b.bayNum != null) v5ByBayNum.set(b.bayNum, b);
    });
  }

  // 각 베이 entry 보정
  let totalEnriched = 0;
  const enrichSources = {};

  bd.baysSummary = bd.baysSummary.map(orig => {
    const bay = { ...orig };
    const bayNum = parseInt(bay.bayNo, 10);
    if (isNaN(bayNum)) return bay;
    const isEvenBay = bayNum % 2 === 0;
    const v5b = v5ByBayNum.get(bayNum);

    const sourcesUsed = bay._enrichedFrom || {};

    // ── deckTiersLocal ──────────────────────────────────────
    // L1 verified가 있으면 그대로
    if (!Array.isArray(bay.deckTiersLocal) || bay.deckTiersLocal.length === 0) {
      if (Array.isArray(bay.deckTiers) && bay.deckTiers.length > 0) {
        // L1 bay.deckTiers (옛 필드명)
        bay.deckTiersLocal = bay.deckTiers.map(Number);
        sourcesUsed.deckTiersLocal = 'L1-bay-deckTiers';
      } else if (bay.hasDeck !== false && shipDeckTiers.length > 0) {
        // L3 사전 level deckTiers
        bay.deckTiersLocal = [...shipDeckTiers];
        sourcesUsed.deckTiersLocal = 'L3-ship-deckTiers';
        totalEnriched++;
      }
    }

    // ── holdTiersLocal ──────────────────────────────────────
    if (!Array.isArray(bay.holdTiersLocal) || bay.holdTiersLocal.length === 0) {
      if (Array.isArray(bay.holdTiers) && bay.holdTiers.length > 0) {
        bay.holdTiersLocal = bay.holdTiers.map(Number);
        sourcesUsed.holdTiersLocal = 'L1-bay-holdTiers';
      } else if (bay.hasHold !== false && shipHoldTiers.length > 0) {
        bay.holdTiersLocal = [...shipHoldTiers];
        sourcesUsed.holdTiersLocal = 'L3-ship-holdTiers';
        totalEnriched++;
      }
    }

    // ── rowMaxEvenLocal / rowMaxOddLocal ────────────────────
    if (typeof bay.rowMaxEvenLocal !== 'number' || typeof bay.rowMaxOddLocal !== 'number') {
      // L2 v5 매트릭스 maxRow
      if (v5b && typeof v5b.maxRow === 'number' && v5b.maxRow > 0) {
        // v5의 maxRow는 해당 베이의 cell 폭. 짝수 베이면 maxRow가 짝수, 홀수 베이면 홀수에 가까움
        // 안전한 규칙: maxRow 그대로 + 반대편은 maxRow-1
        if (isEvenBay) {
          if (typeof bay.rowMaxEvenLocal !== 'number') {
            bay.rowMaxEvenLocal = v5b.maxRow % 2 === 0 ? v5b.maxRow : v5b.maxRow + 1;
            sourcesUsed.rowMaxEvenLocal = 'L2-v5-maxRow';
            totalEnriched++;
          }
          if (typeof bay.rowMaxOddLocal !== 'number') {
            bay.rowMaxOddLocal = Math.max(bay.rowMaxEvenLocal - 1, 1);
            sourcesUsed.rowMaxOddLocal = 'L2-v5-maxRow-derived';
          }
        } else {
          if (typeof bay.rowMaxOddLocal !== 'number') {
            bay.rowMaxOddLocal = v5b.maxRow % 2 === 1 ? v5b.maxRow : v5b.maxRow - 1;
            if (bay.rowMaxOddLocal < 1) bay.rowMaxOddLocal = 1;
            sourcesUsed.rowMaxOddLocal = 'L2-v5-maxRow';
            totalEnriched++;
          }
          if (typeof bay.rowMaxEvenLocal !== 'number') {
            bay.rowMaxEvenLocal = bay.rowMaxOddLocal + 1;
            sourcesUsed.rowMaxEvenLocal = 'L2-v5-maxRow-derived';
          }
        }
      } else {
        // L3 사전 level rowMaxEven/Odd
        if (typeof bay.rowMaxEvenLocal !== 'number' && shipRowMaxEven != null) {
          bay.rowMaxEvenLocal = shipRowMaxEven;
          sourcesUsed.rowMaxEvenLocal = 'L3-ship-rowMaxEven';
          totalEnriched++;
        }
        if (typeof bay.rowMaxOddLocal !== 'number' && shipRowMaxOdd != null) {
          bay.rowMaxOddLocal = shipRowMaxOdd;
          sourcesUsed.rowMaxOddLocal = 'L3-ship-rowMaxOdd';
          totalEnriched++;
        }
      }
    }

    // 보강 출처 기록 (있을 때만)
    if (Object.keys(sourcesUsed).length > 0) {
      bay._enrichedFrom = sourcesUsed;
      Object.keys(sourcesUsed).forEach(k => {
        enrichSources[k] = (enrichSources[k] || 0) + 1;
      });
    }

    return bay;
  });

  // 사전 level _enrichedMeta (디버그용)
  if (totalEnriched > 0) {
    enriched._enrichMeta = {
      totalFieldsEnriched: totalEnriched,
      sourceCounts: enrichSources,
      v5MatrixUsed: v5MaT_used(v5Matrix),
    };
  }

  return enriched;
}

function v5MaT_used(v5) {
  if (!v5 || !v5.matrixBays) return false;
  return v5.matrixBays.length > 0;
}

/**
 * 보정 결과를 사람 읽기 좋은 형태로 (디버그용)
 */
export function describeEnrichment(enriched) {
  if (!enriched?._enrichMeta) return '보정 없음 (이미 완전)';
  const m = enriched._enrichMeta;
  const sources = Object.entries(m.sourceCounts)
    .map(([k, n]) => `${k}×${n}`).join(', ');
  return `필드 ${m.totalFieldsEnriched}개 자동 보정 (${sources})`;
}
