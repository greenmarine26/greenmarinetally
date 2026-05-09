// 선박 구조 분석 (M2.6 → M3.90 베이사전 통합)
// EDI BAPLIE에서 선박 정보 + 베이 구조 추출
// IMO 번호로 식별 (전 세계 유일, 절대 안 변함)
//
// M3.90 추가: CASP SHIP DEFINE FILE 베이사전 통합
//   - .def 파일에서 추출한 11척 베이 데이터를 코드에 임베드
//   - EDI 업로드 시 IMO/코드로 자동 매칭
//   - 베이 골격(가용 슬롯, 리퍼 위치 등) 보강
//   - 컨테이너 데이터는 기존 EDI 흐름 유지 (변경 없음)

import { lookupBayDict, getBayDictStats } from './data/shipBayDict.js';
import { SHIP_BAY_DICT_V2, lookupBayDictV2 } from './data/shipBayDict_v2.js';
import { lookupUserBayDict, getUserBayDictStats } from './data/userBayDict.js';

// M4.5: 선박 식별자 정규화 (퍼지 매칭용)
//   "TJ TEN JUPITER" → "TJTENJUPITER"
//   "TEN JUPITER" → "TENJUPITER"
//   "MSC OSCAR " → "MSCOSCAR"
function normalizeShipKey(s) {
  if (!s) return '';
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// M4.5: 사전(임베드 v2 + v1 + userBayDict) 통합 퍼지 조회
//   1) IMO 정확 매칭 (가장 신뢰)
//   2) code 정확 매칭
//   3) 정규화된 선박명 부분 매칭 (양방향) — "TJ TEN JUPITER" ↔ "TEN JUPITER"
//   4) 모두 실패 시 null
//
// 동작 우선순위:
//   userBayDict > SHIP_BAY_DICT_V2 (109척, verified) > SHIP_BAY_DICT (11척, v1.1)
function fuzzyLookupAcrossDicts(imo, vesselNameOrCode) {
  const targets = [
    { name: 'user', dict: null, lookup: () => lookupUserBayDict(imo, vesselNameOrCode) },
    { name: 'v2',   dict: SHIP_BAY_DICT_V2, lookup: () => lookupBayDictV2(vesselNameOrCode) },
    { name: 'v1',   dict: null, lookup: () => lookupBayDict(imo, vesselNameOrCode) },
  ];

  // 1차: 각 사전에서 표준 lookup (IMO/code 정확 매칭)
  for (const t of targets) {
    const r = t.lookup();
    if (r) return { source: t.name, data: r };
  }

  // 2차: 정규화된 선박명 부분 매칭 (가장 흔한 케이스 — EDI vsl="TJ TEN JUPITER" vs 사전 name="TEN JUPITER")
  const targetKey = normalizeShipKey(vesselNameOrCode);
  if (!targetKey || targetKey.length < 3) return null;

  // v2 사전 부분 매칭
  for (const k of Object.keys(SHIP_BAY_DICT_V2)) {
    const entry = SHIP_BAY_DICT_V2[k];
    const dictKey = normalizeShipKey(entry.name || '');
    const codeKey = normalizeShipKey(entry.code || '');
    if (!dictKey && !codeKey) continue;
    // 양방향 substring (둘 중 더 긴 쪽이 짧은 쪽 포함)
    if ((dictKey && (targetKey.includes(dictKey) || dictKey.includes(targetKey))) ||
        (codeKey && targetKey.includes(codeKey) && codeKey.length >= 4)) {
      return { source: 'v2-fuzzy', data: entry };
    }
  }

  // 임베드 v1 사전 부분 매칭 (폴백)
  // 주의: shipBayDict.js는 SHIP_BAY_DICT export하지만 여기서는 lookupBayDict만 import
  // 직접 fuzzy 검색하려면 SHIP_BAY_DICT도 import 필요 — 일단 v2에 없으면 종료
  return null;
}

// EDI 텍스트에서 선박 정보 추출
// 표준: TDT+20+2622E+++SKR:172:20+++9388417:146:11:ATLANTIC PIONEER
//                                     ↑ IMO        ↑ 선박명
// 변형: TDT+20+2608S+++CMA:172:20+++3E8980:103::SUNNY KALMIA
//                                   ↑ Lloyd's 번호 (영숫자)
//
// M3.4 버그 수정:
//   1) parts[7]만 보던 버그 → 끝에서부터 비어있지 않은 part 찾기 (보통 parts[8])
//   2) IMO를 7자리 숫자로만 받던 제한 → 영숫자 5-9자리 허용 (Lloyd's 등)
export function extractShipInfo(ediText) {
  if (!ediText) return null;
  const segs = ediText.replace(/[\r\n]/g, '').split("'");
  for (const s of segs) {
    if (!s.startsWith('TDT+')) continue;
    const parts = s.split('+');
    // IMO 자리 = parts[6] 이후 비어있지 않은 마지막 part (보통 parts[8])
    for (let i = parts.length - 1; i >= 6; i--) {
      if (!parts[i]) continue;
      const tokens = parts[i].split(':');
      if (tokens.length < 2) continue;
      const imo = tokens[0].trim();
      // IMO 패턴: 7자리 숫자(표준) 또는 영숫자 5-9자리(Lloyd's/Q-code 등)
      if (/^[A-Z0-9]{5,9}$/i.test(imo)) {
        // 선박명: tokens[3] 이후 (':'로 구분, 빈 토큰 무시)
        let name = '';
        if (tokens.length >= 4) {
          name = tokens.slice(3).filter(t => t).join(':').trim();
        }
        return { imo: imo.toUpperCase(), name, voyage: parts[2] || '' };
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

// ─────────────────────────────────────────────────────────
// M3.90: 베이사전 통합 (CASP SHIP DEFINE FILE 기반)
// ─────────────────────────────────────────────────────────

/**
 * 베이사전에서 선박 구조 보강 데이터 가져오기
 * @param {string} imo - IMO 번호
 * @param {string} code - CASP 코드 또는 선박명 (둘 다 시도)
 * @returns {object|null}
 *
 * M4.5: fuzzyLookupAcrossDicts 사용 — userBayDict > v2(109척) > v1(11척, 폴백) + 정규화 부분매칭
 */
export function getShipBayDictData(imo, code) {
  const result = fuzzyLookupAcrossDicts(imo, code);
  if (!result) return null;

  const data = result.data;

  // user / v1 / v2 사전 형식이 약간 다름 — 정규화해서 반환
  // (모두 bayDef 객체를 가짐)
  const bayDef = data.bayDef || {};

  // bayList 추출 (v2: bayList, v1: bays.idx로 추정, user: bayList 또는 bays)
  let bayList = bayDef.bayList;
  if (!bayList && Array.isArray(bayDef.bays) && bayDef.bays.length > 0) {
    // 객체 배열에서 bayNo 또는 idx 추출
    bayList = bayDef.bays
      .map(b => b.bayNo || (typeof b.idx === 'number' ? String(b.idx).padStart(2, '0') : null))
      .filter(Boolean);
  }

  return {
    source: result.source,  // 'user' / 'v2' / 'v1' / 'v2-fuzzy'
    name: data.name,
    callsign: data.callsign,
    specs: data.specs || {},
    code: data.code,
    bayDef: {
      ...bayDef,
      bayList: bayList || [],  // 정규화된 bayList 항상 포함
    },
    verified: bayDef.verified || result.source === 'v2' || result.source === 'v2-fuzzy',
  };
}

/**
 * EDI 분석 결과를 베이사전 데이터로 보강
 * - 베이 골격 정보 추가 (gridShape, slotMatrix 등)
 * - 컨테이너 데이터는 건드리지 않음 (EDI 우선 원칙)
 * @param {object} structure - analyzeShipStructure() 결과
 * @param {string} imo - 선박 IMO
 * @param {string} code - 선박 코드 (옵션)
 * @returns {object} 보강된 structure (원본은 변경 없음)
 */
export function augmentStructureWithBayDict(structure, imo, code) {
  const dict = getShipBayDictData(imo, code);
  if (!dict) {
    return {
      ...structure,
      bayDictApplied: false,
      bayDictReason: 'NOT_FOUND',
    };
  }

  // 베이사전의 슬롯 매트릭스를 베이별로 매핑
  // ⚠️ 현재 v1.1: 인덱스 ↔ 베이번호 매핑 미검증
  // 추후 검증 후 정확한 매핑 함수로 교체 예정
  const bayDictGrid = {};
  for (const bay of dict.bayDef.bays) {
    // 임시: 레코드 인덱스를 베이 번호로 직접 사용
    // (검증 후 정확한 매핑으로 교체)
    const bayNo = String(bay.idx).padStart(3, '0');
    bayDictGrid[bayNo] = {
      idx: bay.idx,
      rows: bay.rows,
      slotStats: bay.stats,
    };
  }

  return {
    ...structure,
    bayDictApplied: true,
    bayDictSource: dict.source,
    bayDictVerified: dict.verified,
    bayDictGrid,
    shipMeta: {
      name: dict.name,
      callsign: dict.callsign,
      specs: dict.specs,
    },
  };
}

/**
 * 베이사전 등록 여부 확인 (UI에 배지 표시용)
 * M4.5: user + v2(109척) + v1(11척, 폴백) + fuzzy 매칭
 */
export function isShipInBayDict(imo, code) {
  return getShipBayDictData(imo, code) !== null;
}

/**
 * 베이사전 통계 (디버그/진단용)
 * M4.5: 사용자 사전 + v2(109척) + v1(11척) 합산
 */
export function bayDictInfo() {
  const v1 = getBayDictStats();
  const user = getUserBayDictStats();
  const v2Count = Object.keys(SHIP_BAY_DICT_V2).length;
  return {
    v1: { totalShips: v1.totalShips, version: '1.1-draft', verified: false },
    v2: { totalShips: v2Count, version: '2.0', verified: true },
    user,
    totalShips: v1.totalShips + v2Count + user.totalShips,
  };
}
