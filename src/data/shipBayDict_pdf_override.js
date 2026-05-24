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
    // M6.92.9: 이미지 픽셀 분석으로 정확 추출 — 핵심 발견: 홀수 단독 deck=9, 짝수 페어 deck=11 (가득).
    //   M6.92.8은 row 09 라벨 영역 누락으로 페어 박스도 9로 잘못 추출. 다시 정밀.
    "01": { rowCount: 7,  hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6],
            deckCells: [7,7,7,7,7], holdCells: [5,1,1] },
    "03": { rowCount: 9,  hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],     // (02)03 페어
            deckCells: [9,9,9,9,9], holdCells: [7,3,3,1,1] },
    "05": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],
            deckCells: [9,9,9,9,9], holdCells: [9,5,5,3,1] },
    "07": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],     // (06)07 페어
            deckCells: [11,11,11,11,11], holdCells: [9,7,5,5,3] },
    "09": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],
            deckCells: [9,9,9,9,9], holdCells: [9,9,7,7,5] },
    "11": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],     // (10)11 페어
            deckCells: [11,11,11,11,11], holdCells: [9,9,9,7,5] },
    "13": { rowCount: 11, hasZero: true,  deckTiers: [90,88,86,84,82],          holdTiers: [10,8,6,4,2],
            deckCells: [9,9,9,9,9], holdCells: [9,9,9,9,7] },
    "15": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2],     // (14)15 페어
            deckCells: [10,11,11,11,11,11], holdCells: [9,9,9,9,7] },
    "17": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2],
            deckCells: [9,9,9,9,9,9], holdCells: [9,9,9,9,9] },
    "19": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2],     // (18)19 페어
            deckCells: [11,11,11,11,11,11], holdCells: [9,9,9,9,9] },
    "21": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2],
            deckCells: [9,9,9,9,9,9], holdCells: [9,9,9,9,9] },
    "23": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4,2],     // (22)23 페어
            deckCells: [11,11,11,11,11,11], holdCells: [9,9,9,9,9] },
    "25": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4],
            deckCells: [9,9,9,9,9,9], holdCells: [9,9,9,9] },
    "27": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [10,8,6,4],       // (26)27 페어
            deckCells: [11,11,11,11,11,11], holdCells: [9,9,9,9] },
    "29": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [10,8,6,4],
            deckCells: [9,9,9,9,9,9,9], holdCells: [9,9,9,9] },
    "31": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [10,8,6,4],       // (30)31 페어
            deckCells: [11,11,11,11,11,11,10], holdCells: [9,9,9,7] },
    "33": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84,82],    holdTiers: [],
            deckCells: [10,10,10,10,10,10,9], holdCells: [] },
    "35": { rowCount: 11, hasZero: true,  deckTiers: [92,90,88,86,84,82],       holdTiers: [],               // (34)35 페어
            deckCells: [11,11,11,11,11,9], holdCells: [] },
    "38": { rowCount: 11, hasZero: true,  deckTiers: [94,92,90,88,86,84],       holdTiers: [],
            deckCells: [11,11,11,11,11,11], holdCells: [] },
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
