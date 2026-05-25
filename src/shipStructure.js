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
import { SHIP_BAY_DICT_V2, lookupBayDictV2, lookupBayDictV2Enhanced } from './data/shipBayDict_v2.js';
import { lookupUserBayDict, getUserBayDictStats } from './data/userBayDict.js';
// M6.55: v5 — .def 매트릭스 디코드 자동 추출
//   - supplement: v2에 없는 13척 (DAP, DBM, DHA, ESTM, FN7, FSR, HAHM, HECN, MDB, MEB, ORT, PCBS, WBC)
//   - matrix: 311척의 row 폭/cells_per_row 정보 (v2 verified 데이터에 보조 첨부)
import { lookupBayDictV5SupplementEnhanced } from './data/shipBayDict_v5_supplement.js';
import { getMatrixV5 } from './data/shipBayDict_v5_matrix.js';
// M6.57: 베이사전 자동 보정 — verified 보존, 비어있는 필드만 다단계 fallback으로 채움
import { enrichBayDef } from './bayDictAutoEnrich.js';

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
//   M5.88: Firebase 베이사전(window.__fbShipBayDict) > userBayDict (localStorage) > V2 (109척) > V1 (11척)
//   Firebase = 모든 검수원 공유 (def/EDI 업로드 시 자동 동기화)
//
// M5.11: v2에 대해 lookupBayDictV2Enhanced 사용 — IMO/callsign/code/이름 4가지 매칭
//   기존 fuzzy 매칭이 prefix 4글자 + garbage 콜사인 때문에 자주 실패하던 문제 해결
function fuzzyLookupAcrossDicts(imo, vesselNameOrCode) {
  // M6.62: v2 verified 최신본이 Firebase 옛 정정본보다 우선
  //   같은 선박이 Firebase + v2 양쪽에 있을 때
  //   - v2의 parsedAt이 Firebase보다 최신 + verified=true → v2 사용
  //   - 안 그러면 기존 우선순위 (Firebase > user > v2)
  //   이유: PCBJ 같은 케이스 — Firebase에 옛 부정확 entry, v2에 STOWAGE PDF 재정정.
  //   클로드가 v2 정정해도 Firebase가 가려서 사용자가 새 버전 못 봄.
  try {
    const v2Enhanced = lookupBayDictV2Enhanced(imo, vesselNameOrCode);
    if (v2Enhanced && !v2Enhanced.matchedBy.startsWith('name-fuzzy')) {
      const def = v2Enhanced.entry?.bayDef;
      if (def?.verified === true && def?.parsedAt) {
        const fbDict = window.__fbShipBayDict || {};
        // 같은 선박 Firebase entry 찾기
        const fbEntry = Object.values(fbDict).find(e => 
          e && ((imo && e.imo === imo) || (v2Enhanced.entry.code && e.code === v2Enhanced.entry.code))
        );
        const fbParsedAt = fbEntry?.bayDef?.parsedAt;
        if (!fbParsedAt || def.parsedAt > fbParsedAt) {
          return { 
            source: 'v2-verified-newer', 
            data: v2Enhanced.entry, 
            matchedBy: 'v2-verified-override-firebase-' + v2Enhanced.matchedBy
          };
        }
      }
    }
  } catch (e) { /* fallthrough */ }

  // M5.88: 0. Firebase 베이사전 (최우선 — 모든 검수원 공유)
  try {
    const fbDict = window.__fbShipBayDict || {};
    if (Object.keys(fbDict).length > 0) {
      const search = String(vesselNameOrCode || '').toUpperCase().replace(/\s+/g, '');
      // 1) code 정확 매칭
      if (search && fbDict[search]) {
        return { source: 'firebase', data: fbDict[search], matchedBy: 'fb-code' };
      }
      // 2) IMO 매칭
      if (imo) {
        const entry = Object.values(fbDict).find(e => e && e.imo === imo);
        if (entry) return { source: 'firebase', data: entry, matchedBy: 'fb-imo' };
      }
      // 3) name fuzzy 매칭 (4글자 이상 prefix)
      if (search && search.length >= 4) {
        const entry = Object.values(fbDict).find(e => {
          const en = String(e?.name || '').toUpperCase().replace(/\s+/g, '');
          return en && (en.includes(search.slice(0, 5)) || search.includes(en.slice(0, 5)));
        });
        if (entry) return { source: 'firebase', data: entry, matchedBy: 'fb-name-fuzzy' };
      }
      // 4) callsign 매칭 (fbDict의 callsign이 search prefix 또는 vice versa)
      if (search && search.length >= 4) {
        const entry = Object.values(fbDict).find(e => {
          const ec = String(e?.callsign || '').toUpperCase();
          return ec && ec.length >= 4 && (ec.startsWith(search) || search.startsWith(ec));
        });
        if (entry) return { source: 'firebase', data: entry, matchedBy: 'fb-callsign' };
      }
    }
  } catch (e) { /* fallthrough */ }

  // 1. user 사전 (localStorage)
  const userResult = lookupUserBayDict(imo, vesselNameOrCode);
  if (userResult) return { source: 'user', data: userResult, matchedBy: 'user-dict' };

  // 2. v2 사전 — 강화된 매칭 (IMO + callsign + code + name 4가지 시도)
  //   M6.55: 정확 매칭(code/IMO/callsign)과 fuzzy(name-fuzzy) 분리.
  //          정확 매칭 v2 > 정확 매칭 v5 > fuzzy v2 > fuzzy v5 순.
  //          이전엔 v2 fuzzy가 v5 정확보다 먼저라 DHA → CNGS 같은 오매칭 발생.
  const v2Enhanced = lookupBayDictV2Enhanced(imo, vesselNameOrCode);
  // 2a. v2 정확 매칭 (code/IMO/callsign) — 즉시 사용
  if (v2Enhanced && !v2Enhanced.matchedBy.startsWith('name-fuzzy')) {
    return { source: 'v2', data: v2Enhanced.entry, matchedBy: v2Enhanced.matchedBy };
  }

  // 2b. M6.55: v5 supplement 정확 코드 매칭 — v2 fuzzy보다 우선 (정확 > 추측)
  const v5Result = lookupBayDictV5SupplementEnhanced(imo, vesselNameOrCode);
  if (v5Result && v5Result.matchedBy === 'v5-code') {
    return { source: 'v5-supplement', data: v5Result.entry, matchedBy: v5Result.matchedBy };
  }

  // 2c. v2 fuzzy 매칭 (name-fuzzy) — 정확 매칭 모두 실패 후
  if (v2Enhanced) {
    return { source: 'v2-fuzzy', data: v2Enhanced.entry, matchedBy: v2Enhanced.matchedBy };
  }

  // 2d. M6.55: v5 supplement fuzzy 매칭
  if (v5Result) {
    return { source: 'v5-supplement', data: v5Result.entry, matchedBy: v5Result.matchedBy };
  }

  // 3. v1 사전 (legacy 폴백)
  const v1Result = lookupBayDict(imo, vesselNameOrCode);
  if (v1Result) return { source: 'v1', data: v1Result, matchedBy: 'v1-lookup' };

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
  const bayDef = data.bayDef || {};

  // bayList 추출 (v2: bayList, v1: bays.idx로 추정, user: bayList 또는 bays)
  let bayList = bayDef.bayList;
  if (!bayList && Array.isArray(bayDef.bays) && bayDef.bays.length > 0) {
    bayList = bayDef.bays
      .map(b => b.bayNo || (typeof b.idx === 'number' ? String(b.idx).padStart(2, '0') : null))
      .filter(Boolean);
  }

  // M6.25: v3(Firebase)/user 데이터에 v2 정밀 데이터 union 보완
  //   증상: 사용자가 STOWAGE PDF로 등록한 v3 데이터에서 Gemini가 일부 tier 누락 (예: BAY 25 80 tier).
  //         v2 임베드엔 수동 정밀 등록 데이터 있음.
  //         v3 우선이라 v2의 정확한 정보가 가려짐.
  //   해결: v3/user 데이터 사용 시 v2와 union — baysSummary의 deck/holdTiers 합쳐서 더 완전한 데이터
  //   M6.62: v3 baysSummary가 빈/없으면 v2를 강제 우선 (PCBJ 케이스 — Firebase에 빈 entry 있을 때)
  let finalBayDef = { ...bayDef, bayList: bayList || [] };
  if (result.source === 'firebase' || result.source === 'user') {
    try {
      const v2Backup = lookupBayDictV2Enhanced(imo, code);
      const v2HasData = v2Backup?.entry?.bayDef?.baysSummary && v2Backup.entry.bayDef.baysSummary.length > 0;
      const v3HasData = finalBayDef.baysSummary && finalBayDef.baysSummary.length > 0;
      if (v2HasData && !v3HasData) {
        // M6.62: Firebase/User entry가 baysSummary 빈 — v2 정밀 데이터로 완전 교체
        finalBayDef = { ...v2Backup.entry.bayDef, bayList: v2Backup.entry.bayDef.bayList || bayList || [] };
      } else if (v2HasData && v3HasData && result.source !== 'user') {
        // M6.25: 둘 다 있으면 union (Firebase 케이스만)
        // M6.93.12: user 소스는 union 금지 — 사용자가 ShipMatrixBuilderModal에서 직접 수정한 데이터는
        //           사용자 외 변경 불가. v2 tier가 v3 union으로 다시 들어오면 사용자가 제거한 행이 복원됨.
        finalBayDef = mergeBayDef(finalBayDef, v2Backup.entry.bayDef);
      }
      // user 소스에 v2 데이터 있는 경우: finalBayDef 그대로 (사용자 수정 보존)
    } catch (e) { /* fallback: 기존 데이터 그대로 */ }
  }

  // M6.57: 자동 보정 — 베이별 비어있는 필드를 다단계 fallback으로 채움
  //   verified는 절대 덮어쓰지 않음. _enrichedFrom 메타로 출처 표시.
  //   원본 entry 미수정 (deep clone 후 보강).
  const matrixV5 = getMatrixV5(data.code);
  const wrappedEntry = enrichBayDef({ bayDef: finalBayDef }, matrixV5);
  const enrichedBayDef = wrappedEntry.bayDef;

  return {
    source: result.source,
    matchedBy: result.matchedBy || result.source,
    name: data.name,
    callsign: data.callsign,
    specs: data.specs || {},
    code: data.code,
    bayDef: enrichedBayDef,
    verified: bayDef.verified || result.source === 'v2' || result.source === 'v2-fuzzy',
    // M6.40: STOWAGE PDF 메타 (Firebase 사전에서만 — v1/v2 임베드에는 없음)
    pdfUrl: data.pdfUrl || '',
    pdfName: data.pdfName || '',
    pdfPath: data.pdfPath || '',
    pdfUploadedAt: data.pdfUploadedAt || 0,
    // M6.55: v5 매트릭스 보강 (베이별 cells_per_row + rows + maxRow + hasHold)
    //   v2 verified 데이터를 override하지 않는 보조 정보
    //   카고플랜 표시에서 row 폭 default(8/7) 대신 실측값 사용 가능
    _v5Matrix: matrixV5,
    // M6.57: 자동 보정 메타 (디버그용 — _enrichMeta는 enrichedBayDef를 통해 접근)
    _enrichMeta: wrappedEntry._enrichMeta || null,
  };
}

// M6.25: v3 + v2 baysSummary union
//   각 베이의 deckTiers/holdTiers는 두 소스의 union (더 완전한 데이터)
//   rowMaxEvenLocal/rowMaxOddLocal은 v3 우선 (사용자 등록 신뢰), v3에 없으면 v2
function mergeBayDef(v3BayDef, v2BayDef) {
  const merged = { ...v3BayDef };
  if (!v2BayDef?.baysSummary || !v3BayDef?.baysSummary) return merged;

  // 베이별 v2 맵
  const v2Map = {};
  v2BayDef.baysSummary.forEach(b => {
    v2Map[String(parseInt(b.bayNo, 10))] = b;
  });

  // v3 baysSummary 순회 — 각 베이별로 v2 정보 보완
  merged.baysSummary = v3BayDef.baysSummary.map(v3Bay => {
    const bayKey = String(parseInt(v3Bay.bayNo, 10));
    const v2Bay = v2Map[bayKey];
    if (!v2Bay) return v3Bay;

    // deck tier union (v2의 누락 tier 보완)
    const deckSet = new Set();
    (v3Bay.deckTiers || v3Bay.deckTiersLocal || []).forEach(t => deckSet.add(parseInt(t, 10)));
    (v2Bay.deckTiersLocal || v2Bay.deckTiers || []).forEach(t => deckSet.add(parseInt(t, 10)));
    const deckUnion = Array.from(deckSet).filter(Number.isFinite).sort((a,b)=>b-a);

    // hold tier union
    const holdSet = new Set();
    (v3Bay.holdTiers || v3Bay.holdTiersLocal || []).forEach(t => holdSet.add(parseInt(t, 10)));
    (v2Bay.holdTiersLocal || v2Bay.holdTiers || []).forEach(t => holdSet.add(parseInt(t, 10)));
    const holdUnion = Array.from(holdSet).filter(Number.isFinite).sort((a,b)=>b-a);

    return {
      ...v3Bay,
      deckTiers: deckUnion,
      holdTiers: holdUnion,
      deckTiersLocal: deckUnion,
      holdTiersLocal: holdUnion,
      // row 정보는 v3(사용자 등록) 우선, 없으면 v2(정밀)
      rowMaxEvenLocal: v3Bay.rowMaxEvenLocal ?? v3Bay.rowMaxEven ?? v2Bay.rowMaxEvenLocal ?? v2Bay.rowMaxEven,
      rowMaxOddLocal:  v3Bay.rowMaxOddLocal  ?? v3Bay.rowMaxOdd  ?? v2Bay.rowMaxOddLocal  ?? v2Bay.rowMaxOdd,
    };
  });

  // 선박 전역 tier도 union
  const allDeck = new Set();
  (v3BayDef.deckTiers || []).forEach(t => allDeck.add(parseInt(t, 10)));
  (v2BayDef.deckTiers || []).forEach(t => allDeck.add(parseInt(t, 10)));
  merged.deckTiers = Array.from(allDeck).filter(Number.isFinite).sort((a,b)=>b-a);

  const allHold = new Set();
  (v3BayDef.holdTiers || []).forEach(t => allHold.add(parseInt(t, 10)));
  (v2BayDef.holdTiers || []).forEach(t => allHold.add(parseInt(t, 10)));
  merged.holdTiers = Array.from(allHold).filter(Number.isFinite).sort((a,b)=>b-a);

  // 전역 rowMax도 v3 우선, 없으면 v2
  merged.rowMaxEven = v3BayDef.rowMaxEven ?? v2BayDef.rowMaxEven;
  merged.rowMaxOdd  = v3BayDef.rowMaxOdd  ?? v2BayDef.rowMaxOdd;

  return merged;
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
