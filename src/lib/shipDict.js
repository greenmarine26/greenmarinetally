// MasterPlan 베이사전 데이터 저장 — 검수앱과 별도 키
// 데이터 스키마: { [shipCode]: ShipEntry }
//
// ShipEntry:
//   imo, code, name, callsign
//   bays: [BayEntry]  // 베이 정렬 순서 = bay 번호 오름차순
//   createdAt, updatedAt
//
// BayEntry:
//   bay: '011' (3자리)
//   bayNo: '11' (2자리, 검수앱 v2 호환)
//   pairEven: '12' | null  // 페어 짝수 번호 (단독이면 null)
//   rowCount: 8
//   hasZero: false
//   deckTiers: [88, 86, 84, 82]
//   holdTiers: [8, 6, 4, 2]
//   deckCells: [7, 7, 7, 7]
//   holdCells: [7, 7, 7, 7]
//   deckAlign: 'center' | 'left' | 'right'
//   holdAlign: 'center' | 'left' | 'right'
//   deckPadLeft, deckPadRight: 0 (cells 단위 미세조정)
//   holdPadLeft, holdPadRight: 0

const STORAGE_KEY = 'masterplan_dict_v1';

const _ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

export function loadAll() {
  const raw = _ls.get(STORAGE_KEY);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function saveAll(dict) {
  return _ls.set(STORAGE_KEY, JSON.stringify(dict));
}

export function getShip(code) {
  const dict = loadAll();
  return dict[code] || null;
}

export function saveShip(ship) {
  if (!ship?.code) return false;
  const dict = loadAll();
  ship.updatedAt = new Date().toISOString();
  if (!ship.createdAt) ship.createdAt = ship.updatedAt;
  dict[ship.code] = ship;
  return saveAll(dict);
}

export function deleteShip(code) {
  const dict = loadAll();
  if (!(code in dict)) return false;
  delete dict[code];
  return saveAll(dict);
}

export function listShips() {
  const dict = loadAll();
  return Object.values(dict).map(s => ({
    code: s.code,
    name: s.name,
    imo: s.imo,
    callsign: s.callsign,
    bayCount: (s.bays || []).length,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));
}

// ──── 신규 베이 entry 기본값 ────────────────────────────
export function createBayEntry(bayNum, pairEven = null) {
  const num = parseInt(bayNum);
  const bay = String(num).padStart(3, '0');
  const isEven = num % 2 === 0;
  return {
    bay,
    bayNo: String(num).padStart(2, '0'),
    pairEven,
    rowCount: 8,
    hasZero: false,
    // 짝수 베이 (40ft)는 보통 hold tier 1개 (예: 06만)
    // 홀수 베이 (20ft)는 deck + hold 모두
    deckTiers: isEven && pairEven == null ? [82] : [88, 86, 84, 82],
    holdTiers: isEven && pairEven == null ? [6] : [8, 6, 4, 2],
    deckCells: isEven && pairEven == null ? [7] : [7, 7, 7, 7],
    holdCells: isEven && pairEven == null ? [7] : [7, 7, 7, 7],
    deckAlign: 'center', deckPadLeft: 0, deckPadRight: 0,
    holdAlign: 'center', holdPadLeft: 0, holdPadRight: 0,
  };
}

// ──── 검수앱 호환 export 형식 ────────────────────────────
// Tallyman Master의 userBayDict entry 형식과 일치 → import 시 그대로 사용 가능
export function toTallymanFormat(ship) {
  const baysSummary = (ship.bays || []).map(b => ({
    bay: b.bay,
    bayNo: b.bayNo,
    rowCount: b.rowCount,
    hasZero: b.hasZero,
    deckTiers: b.deckTiers,
    holdTiers: b.holdTiers,
    deckCells: b.deckCells,
    holdCells: b.holdCells,
    hasDeck: b.deckTiers && b.deckTiers.length > 0,
    hasHold: b.holdTiers && b.holdTiers.length > 0,
    pairEven: b.pairEven || null,
    source: 'masterplan',
    deckAlign: b.deckAlign,
    deckPadLeft: b.deckPadLeft,
    deckPadRight: b.deckPadRight,
    holdAlign: b.holdAlign,
    holdPadLeft: b.holdPadLeft,
    holdPadRight: b.holdPadRight,
  }));
  return {
    imo: ship.imo || '',
    code: ship.code || '',
    name: ship.name || '',
    callsign: ship.callsign || '',
    bayDef: {
      recordCount: baysSummary.length,
      sourceFile: 'masterplan_export',
      sourceVersion: 'MP1.0.0',
      parsedAt: new Date().toISOString(),
      verified: true,
      baysSummary,
    },
  };
}

// ──── 검수앱 entry → MasterPlan ship 형식 (import용) ──────
export function fromTallymanFormat(entry) {
  if (!entry?.bayDef?.baysSummary) return null;
  const bays = entry.bayDef.baysSummary.map(bs => ({
    bay: bs.bay || String(parseInt(bs.bayNo) || 0).padStart(3, '0'),
    bayNo: bs.bayNo || String(parseInt(bs.bay) || 0).padStart(2, '0'),
    pairEven: bs.pairEven || null,
    rowCount: bs.rowCount || 8,
    hasZero: !!bs.hasZero,
    deckTiers: Array.isArray(bs.deckTiers) ? bs.deckTiers : [],
    holdTiers: Array.isArray(bs.holdTiers) ? bs.holdTiers : [],
    deckCells: Array.isArray(bs.deckCells) ? bs.deckCells : [],
    holdCells: Array.isArray(bs.holdCells) ? bs.holdCells : [],
    deckAlign: bs.deckAlign || 'center',
    deckPadLeft: bs.deckPadLeft || 0,
    deckPadRight: bs.deckPadRight || 0,
    holdAlign: bs.holdAlign || 'center',
    holdPadLeft: bs.holdPadLeft || 0,
    holdPadRight: bs.holdPadRight || 0,
  }));
  return {
    imo: entry.imo || '',
    code: entry.code || '',
    name: entry.name || '',
    callsign: entry.callsign || '',
    bays,
  };
}
