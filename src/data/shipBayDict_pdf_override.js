// PDF STOWAGE INSTRUCTION에서 직접 추출한 베이별 정답 데이터.
// 베이마다 row count + has_zero + deck/hold tier가 모두 다름.
// 출처: DJCT 0186W (2025-02-22), SWAT 2524S (2025-11-01) PDF.
//
// rowCount + hasZero → getRowPositions로 row 라벨 생성:
//   7 + true  → [06,04,02,00,01,03,05]
//   9 + true  → [08,06,04,02,00,01,03,05,07]
//   10 + false→ [10,08,06,04,02,01,03,05,07,09]
//   11 + true → [10,08,06,04,02,00,01,03,05,07,09]

export const PDF_BAY_OVERRIDE = {
  // DJCT (DONGJIN CONTINENTAL) — 0186W 기준
  DJCT: {
    "01": { rowCount: 7,  hasZero: true,  deckTiers: [88,86,84],          holdTiers: [8,6,4] },
    "03": { rowCount: 9,  hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "05": { rowCount: 9,  hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },  // (04)05 페어
    "07": { rowCount: 10, hasZero: false, deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "09": { rowCount: 10, hasZero: false, deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },  // (08)09
    "11": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "13": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },  // (12)13
    "15": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "17": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },  // (16)17
    "19": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "21": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },  // (20)21
    "23": { rowCount: 10, hasZero: false, deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "25": { rowCount: 10, hasZero: false, deckTiers: [92,90,88,86,84,82], holdTiers: [8,6,4,2] },  // (24)25
    "27": { rowCount: 10, hasZero: false, deckTiers: [92,90,88,86,84,82], holdTiers: [] },         // hold 없음
    "29": { rowCount: 10, hasZero: false, deckTiers: [92,90,88,86,84,82], holdTiers: [] },         // (28)29 hold 없음
  },

  // SWAT (SAWASDEE ATLANTIC) — 2524S 기준
  SWAT: {
    "01": { rowCount: 7,  hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6] },
    "03": { rowCount: 9,  hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },   // (02)03
    "05": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },
    "07": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },   // (06)07
    "09": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },
    "11": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },   // (10)11
    "13": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2] },
    "15": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2] },   // (14)15
    "17": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2] },
    "19": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2] },   // (18)19
    "21": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2] },
    "23": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2] },   // (22)23
    "25": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4] },
    "27": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4] },     // (26)27
    "29": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [10,8,6,4] },
    "31": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [10,8,6,4] },     // (30)31
    "33": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [] },
    "35": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [] },             // (34)35
    "38": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84],       holdTiers: [] },
  },

  // TNJP (TEN JUPITER) — 25323W PDF 기준
  TNJP: {
    "01": { rowCount: 7, hasZero: true,  deckTiers: [84,82],             holdTiers: [6,4,2] },
    "03": { rowCount: 7, hasZero: true,  deckTiers: [84,82],             holdTiers: [6,4,2] },
    "05": { rowCount: 7, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "07": { rowCount: 7, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "09": { rowCount: 9, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "11": { rowCount: 9, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "13": { rowCount: 9, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "15": { rowCount: 9, hasZero: true,  deckTiers: [88,86,84,82],       holdTiers: [8,6,4,2] },
    "17": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "19": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "21": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "23": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "25": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "27": { rowCount: 9, hasZero: true,  deckTiers: [90,88,86,84,82],    holdTiers: [8,6,4,2] },
    "29": { rowCount: 7, hasZero: true,  deckTiers: [92,90,88,86,84,82], holdTiers: [] },
    "31": { rowCount: 7, hasZero: true,  deckTiers: [92,90,88,86,84,82], holdTiers: [] },
    "33": { rowCount: 7, hasZero: true,  deckTiers: [92,90,88,86,84,82], holdTiers: [] },
  },

  // PCSG (PACIFIC TIANJIN) — 2616W PDF 기준
  PCSG: {
    "01": { rowCount: 4, hasZero: false, deckTiers: [88,86,84,82],       holdTiers: [] },
    "03": { rowCount: 6, hasZero: false, deckTiers: [88,86,84],          holdTiers: [8,6,4] },
    "05": { rowCount: 8, hasZero: false, deckTiers: [88,86,84],          holdTiers: [8,6,4,2] },
    "07": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "09": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "11": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "13": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "15": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "17": { rowCount: 3, hasZero: true,  deckTiers: [90,88,86,84],       holdTiers: [] },
    "19": { rowCount: 8, hasZero: false, deckTiers: [90,88,86,84],       holdTiers: [8,6,4,2] },
    "21": { rowCount: 8, hasZero: false, deckTiers: [92,90,88,86,84],    holdTiers: [8,6,4,2] },
    "23": { rowCount: 8, hasZero: false, deckTiers: [92,90,88,86,84],    holdTiers: [8,6,4,2] },
    "25": { rowCount: 8, hasZero: false, deckTiers: [92,90,88,86,84],    holdTiers: [8,6,4,2] },
    "27": { rowCount: 8, hasZero: false, deckTiers: [92,90,88,86,84,82], holdTiers: [] },
    "29": { rowCount: 8, hasZero: false, deckTiers: [92,90,88,86,84,82], holdTiers: [] },
  },
};

export function getBayOverride(shipCode, bayNo) {
  const ship = PDF_BAY_OVERRIDE[String(shipCode || '').toUpperCase()];
  if (!ship) return null;
  const padded = String(bayNo).padStart(2, '0');
  return ship[padded] || null;
}
