// 선박 정책 판정 본체(파이어베이스 없음) — 기본 정책표·선박명 맞추기·LOLO 판정. 미르 엔진(콘앱 번들 mir-core.js)도 이것만 부른다(4.40).
// ⚠ 이 파일은 firebase 를 import 하지 않는다 — shipPolicies.js 를 미르가 부르면 firebase/database 145KB 가 콘앱 번들에 딸려 온다(4.40 실측). shipPolicies.js 는 이것을 그대로 다시 내보낸다(부르는 곳은 종전 그대로).

// 하드코딩 기본 정책 (검수원이 알려준 선박들)
// aliases: 같은 선박이지만 다른 코드/표기 (ASC vs 사용자 표기)
export const DEFAULT_SHIP_POLICIES = {
  'TEN JUPITER': {
    name: 'TEN JUPITER',
    code: 'TNJP',
    aliases: ['TNJP', 'LYTJ'],  // ASC는 LYTJ로 표기
    mode: 'verify',
    target: 'all_empty',
    label: '엠티 실 확인 (리씰 가능)',
    description: '엠티 컨테이너에 이미 실이 부착되어 있음. 확인 또는 리씰.',
  },
  'RIZHAO ORIENT': {
    name: 'RIZHAO ORIENT',
    code: 'RZOR',
    aliases: ['RZOR', 'R063'],   // R063 = RZOR 항차 prefix (R063W/R063E). 선박명 누락 리스트도 LOLO 인식.
    mode: 'verify',
    target: 'all_empty',
    /* lolo 플래그 = «셀 좌표가 없어 덱플랜·리스트로 검수하는 배». 3.5 정정(검수사 2026-09-03) —
       RZOR 은 «LOLO선»이 아니라 **RORO선인데 마지막 덱에 LOLO(갠트리) 구역이 있는 혼용선**이다.
       차량은 램프로 실어 앱이 자리를 줄 수 없고(실측 R085E 208대 중 갠트리 43대뿐), 갠트리 적재분만 덱플랜에 셀로 나온다.
       그래서 셀 베이 매트릭스를 만들지 않는다 — 만들어도 차량분은 좌표를 못 받아 «효과가 매우 적다»(검수사 확정). */
    lolo: true,   // V8.09-07: 덱플랜 검수 대상 — IFCSUM(셀 좌표 없음) 명세 선박. RZOR만 이 처리(사용자 확정 2026-06-18).
    label: '엠티 실 확인 (리씰 가능)',
    description: '엠티 컨테이너에 이미 실이 부착되어 있음. 확인 또는 리씰.',
  },
  'ATLANTIC PIONEER': {
    name: 'ATLANTIC PIONEER',
    code: 'ATRP',
    aliases: ['ATRP', 'ATPR'],  // ASC는 ATPR로 표기
    mode: 'attach',
    target: 'empty_with_pod',
    pod: ['CNWEH', 'CNWEI'],   // 위해 (WEH 표준 / WEI 축약 둘 다)
    label: 'POD 위해(CNWEI/CNWEH)행 엠티 실 부착',
    description: '목적지가 위해(CNWEI/CNWEH)인 엠티 컨테이너에 실을 부착해야 함.',
  },
};

// ★ 일괄수리(2026-11-10) — **선박 코드별 성질표 한 곳.** 흩어져 있던 목록(workShift NO_SHIFT_SHIPS · utils FERRY_1700_SHIPS·HATCH_SKIP_RE·SHIP_LUGGAGE ·
//   autoRegApi VIRTUAL_LOAD_SHIPS·PLAN_VIRTUAL_SHIPS · esealVoice ATPR 이름 · tallyExcel OBWH 바우처형)은 이 표에서 만들어 낸다 — 목록 내용은 옮기기 전과 같다.
//   noShift 주야 구분 없음 · ferry1700 17시 기준 보고 · hatchSkip 해치커버 계산·보고 안 함 · luggage 상시 LUGGAGE 대수 · virtualLoad 리스트로 가상 선적 EDI ·
//   planVirtual 플랜 격자로 가상 선적 EDI · voucherTally 마감텔리 바우처형(표준 서식 폴백 안 함) · sealAttachNames 위해행 엠티 실 부착 기능이 알아보는 선박명 ·
//   noRest 휴게 없음(검수사 확정 2026-09-07 «OWBH RZOR은 휴게 타임이 없습니다» — 콘앱 CT_NO_REST 와 같은 두 척. 끝나는 시각·실작업 분 계산이 쉬는 창을 빼지 않는다).
//   ⚠ SMYA 는 noShift 에만 있다(옮기기 전 그대로). 배가 늘면 여기 한 줄만 고친다.
export const SHIP_FLAGS = {
  OBWH: { noShift: true, ferry1700: true, hatchSkip: true, virtualLoad: true, voucherTally: true, noRest: true },
  RZOR: { noShift: true, ferry1700: true, hatchSkip: true, luggage: 1, virtualLoad: true, noRest: true },
  SMYA: { noShift: true },
  TNJP: { ferry1700: true, hatchSkip: true },
  TMPZ: { hatchSkip: true, planVirtual: true },
  ATPR: { hatchSkip: true, sealAttachNames: ['ATPR', 'ATRP', 'ATLANTIC PIONEER'] },
};
const _NO_FLAGS = Object.freeze({});
/** 선박 코드의 성질 — 코드(대문자·공백 제거)가 표에 있으면 그 줄, 없으면 name 을 코드로 다시 읽는다. 둘 다 없으면 빈 객체(모든 성질 거짓). */
export function shipFlag(code, name) {
  for (const v of [code, name]) {
    const k = String(v || '').trim().toUpperCase();
    if (k && Object.prototype.hasOwnProperty.call(SHIP_FLAGS, k)) return SHIP_FLAGS[k];
  }
  return _NO_FLAGS;
}
/** 그 성질이 켜진 선박 코드 목록(표에 적힌 차례). */
export function shipCodesWith(flag) {
  return Object.keys(SHIP_FLAGS).filter((k) => !!SHIP_FLAGS[k][flag]);
}

// 선박명/코드 정규화 (대소문자/공백 무시)
export function normalizeVslName(vsl) {
  return String(vsl || '').toUpperCase().trim().replace(/\s+/g, ' ');
}

// 선박명/코드/항차코드에서 정책 매칭 (DEFAULT + 추가된 정책)
//   vsl: 선박명 (있으면 우선)
//   extraHints: ['ATPR2621W', 'CMA' 등] - 파일명, carrier 등 추가 매칭 단서
export function matchShipPolicy(vsl, extraPolicies = {}, extraHints = []) {
  const norm = normalizeVslName(vsl);
  const all = { ...DEFAULT_SHIP_POLICIES, ...extraPolicies };

  // 1. 선박명 정확 일치 우선
  if (norm && all[norm]) return all[norm];

  // 2. 선박명 부분 일치
  if (norm) {
    for (const [key, p] of Object.entries(all)) {
      if (norm.includes(key) || key.includes(norm)) return p;
    }
  }

  // 3. aliases (코드) 매칭 — 선박명 + extraHints 모두 검사
  const haystack = [norm, ...extraHints.map(h => normalizeVslName(h))].join('|');
  for (const p of Object.values(all)) {
    const aliases = p.aliases || [p.code].filter(Boolean);
    for (const alias of aliases) {
      const aliasNorm = normalizeVslName(alias);
      if (aliasNorm && haystack.includes(aliasNorm)) return p;
    }
  }

  return null;
}

// V8.09-07: LOLO 검수 대상 선박인지 — 선박정책의 lolo 플래그로만 판정.
//   기존엔 "모든 컨테이너에 bay/row/tier 없음"으로 판정했는데, 일반 베이 선박(TPMZ 등)이
//   위치정보 없이 올라오면 LOLO로 오판돼 수석대시보드에 LOLO 리스트가 잘못 생성됐다.
//   → LOLO는 RZOR(RIZHAO ORIENT)만(사용자 확정 2026-06-18). 선박명/코드로 정책 매칭 후 lolo===true만 LOLO.
export function isLoloShipByPolicy(vsl, extraPolicies = {}, extraHints = []) {
  const policy = matchShipPolicy(vsl, extraPolicies, extraHints);
  return !!(policy && policy.lolo === true);
}
