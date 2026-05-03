// 선박 구조 분석 (M2.6)
// EDI BAPLIE에서 선박 정보 + 베이 구조 추출
// IMO 번호로 식별 (전 세계 유일, 절대 안 변함)

// EDI 텍스트에서 선박 정보 추출
// TDT+20+2622E+++SKR:172:20+++9388417:146:11:ATLANTIC PIONEER
//                                   ↑ IMO        ↑ 선박명
export function extractShipInfo(ediText) {
  if (!ediText) return null;
  // 작은따옴표 또는 줄바꿈으로 구분
  const segs = ediText.replace(/\n/g, '').split("'");
  for (const s of segs) {
    if (s.startsWith('TDT+')) {
      // TDT+20+VOY+++CARRIER:172:20+++IMO:146:11:VESSEL_NAME
      const parts = s.split('+');
      // parts[7]: "IMO:146:11:NAME"
      if (parts.length >= 8) {
        const last = parts[7];
        const tokens = last.split(':');
        if (tokens.length >= 4) {
          const imo = tokens[0].trim();
          const name = tokens.slice(3).join(':').trim();
          if (/^\d{7}$/.test(imo)) {
            return { imo, name, voyage: parts[2] || '' };
          }
        }
      }
    }
  }
  return null;
}

// 컨테이너 배열에서 베이 구조 분석
// 출력:
//   bays: [001, 002, 003, ...] (정렬됨)
//   pairs: { "001": "003", "003": "001", ... }
//   singles: ["028"] (짝꿍 없는 단독 베이)
//   slots: { "002": ["006","008",...], ... } (각 짝수 베이의 row-tier 슬롯)
export function analyzeShipStructure(containers) {
  const bays = new Set();
  const bayContents = {}; // bay → [{row, tier, iso, fe, ...}]

  for (const c of containers) {
    if (!c.bay) continue;
    bays.add(c.bay);
    if (!bayContents[c.bay]) bayContents[c.bay] = [];
    bayContents[c.bay].push({ row: c.row, tier: c.tier, iso: c.iso });
  }

  const baysArr = Array.from(bays).sort();
  const bayInts = baysArr.map(b => parseInt(b)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  const baySet = new Set(bayInts);

  // 짝꿍 페어링: 사용자 알고리즘 ("통로 = 짝수 슬롯 없음")
  const pairs = {};
  const singles = [];
  for (const b of bayInts) {
    if (b % 2 === 0) continue; // 짝수(40ft 슬롯)는 짝꿍 대상 X
    const bStr = String(b).padStart(3, '0');
    const evenLeft = b - 1;
    const evenRight = b + 1;
    const pairCandidate = baySet.has(evenRight) && baySet.has(b + 2)
      ? String(b + 2).padStart(3, '0')
      : (baySet.has(evenLeft) && baySet.has(b - 2) ? String(b - 2).padStart(3, '0') : null);
    if (pairCandidate) pairs[bStr] = pairCandidate;
    else singles.push(bStr);
  }

  // 각 베이의 row/tier 분포
  const slots = {};
  for (const [bay, contents] of Object.entries(bayContents)) {
    const positions = new Set();
    for (const c of contents) {
      if (c.row && c.tier) positions.add(`${c.row}-${c.tier}`);
    }
    slots[bay] = Array.from(positions).sort();
  }

  // 통계
  const total_slots = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);
  const has_deck = baysArr.some(b => bayContents[b].some(c => parseInt(c.tier) >= 80));
  const has_hold = baysArr.some(b => bayContents[b].some(c => parseInt(c.tier) < 80));

  return {
    bays: baysArr,
    bay_count: baysArr.length,
    pairs,
    singles,
    slots,
    total_slots,
    has_deck,
    has_hold,
    odd_bays: bayInts.filter(b => b % 2 === 1).map(b => String(b).padStart(3, '0')),
    even_bays: bayInts.filter(b => b % 2 === 0).map(b => String(b).padStart(3, '0')),
  };
}

// 두 구조 비교 (변경 사항 감지)
export function compareStructures(oldStruct, newStruct) {
  if (!oldStruct) return { isFirst: true, changes: [] };
  const changes = [];
  const oldBays = new Set(oldStruct.bays || []);
  const newBays = new Set(newStruct.bays || []);
  const added = newStruct.bays.filter(b => !oldBays.has(b));
  const removed = (oldStruct.bays || []).filter(b => !newBays.has(b));
  if (added.length) changes.push(`새 베이 ${added.length}개 추가: ${added.join(', ')}`);
  if (removed.length) changes.push(`베이 ${removed.length}개 사라짐: ${removed.join(', ')}`);

  // 페어링 변화
  const oldPairs = oldStruct.pairs || {};
  const newPairs = newStruct.pairs || {};
  const pairChanges = [];
  for (const [bay, pair] of Object.entries(newPairs)) {
    if (oldPairs[bay] && oldPairs[bay] !== pair) {
      pairChanges.push(`${bay}↔${pair} (이전 ${bay}↔${oldPairs[bay]})`);
    }
  }
  if (pairChanges.length) changes.push(`짝꿍 변경: ${pairChanges.join(', ')}`);

  return { isFirst: false, changes, hasChanges: changes.length > 0 };
}
