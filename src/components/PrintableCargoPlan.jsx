// 카고 플랜 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323E.pdf / TNJP25323W.pdf 형식
// - 5컬럼 그리드 (FORE 위 / AFT 아래)
// - AFT 좌측 legend 박스
// - 베이 상단: 제목 + 카운트 (20'/40'/45')
// - 데크/홀드 6:4 비율 + 굵은 hatch break  ← M6.82: 5:5 → 6:4 (BAY 라벨 보호)
// - row 라벨 상하단, tier 라벨 우측
//
// M6.82 BASELINE (STSE 2631E 525컨 검증 — Python build_cargo_plan_universal.py 이식):
//   STD_DECK 6단 [92,90,88,86,84,82] (기존 5단에서 92 추가)
//   STD_HOLD 4단 [08,06,04,02]
//   deck:hold = 60:40 비율
//   셀 18×13px, hold 폭 = deck 폭 통일
//   has_zero 좌우 대칭 row 알고리즘 (09 제외)
//   모든 박스 데크 라인 정확 정렬 (page union)

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel, isReeferContainer, isoToLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';

// M6.82 [A]: M6.81 검증된 baseline (6단 deck + 4단 hold) — 빈 카고플랜 표준
//   기존 STD_DECK 5단 ['90','88','86','84','82'] → 6단 (92 추가)
//   STSE SENDAI 등 신규 선박 deck tier 92 사용 케이스 검증됨
// M6.84: 7단 확장 — KKLC 카스피 양식 검증 (KMTC LAEM CHABANG 등 큰 베이 deck tier 94 사용)
//   안전성: 94 tier 없는 베이는 invisible로 자리만 차지 → 모든 박스 데크 라인 정렬 유지
const STD_ROWS = ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
const STD_DECK = ['94', '92', '90', '88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

// M6.82: baseline 진단용 상수 (디버그 로깅 및 fallback baseline 적용 시 사용)
const _M682_BASELINE = {
  deck: STD_DECK,
  hold: STD_HOLD,
  deckHoldRatio: [6, 4],  // flex 비율 (deck-area 6 / hold-area 4)
  cellW: 18, cellH: 13,    // 표준 셀 크기 (px)
  validatedBy: 'STSE_2631E (525 containers, 2026-05-22)',
};

const isPtk = (c, mode) => {
  const t = ((mode === 'discharge' ? c.pod : c.pol) || '').toUpperCase();
  return t === 'PTK' || t === 'KRPTK' || t === 'KRPYT' || t.endsWith('PTK');
};

// M5.93: isoToPdfLabel은 40HC → "DCHC", 40RF → "RFHC"로 매핑되어 "40"이 포함 안 됨!
//   기존 sizeOf가 모두 20으로 분류하던 치명적 버그.
//   해결: isoToLabel(원본 라벨, 예: "40HC")로 첫 2글자 검사
const sizeOf = (c) => {
  const lbl = (isoToLabel(c.iso) || '').toUpperCase();
  if (lbl.startsWith('45')) return '45';
  if (lbl.startsWith('40')) return '40';
  // ISO 라벨 없으면 iso 코드 직접 검사 (4자리 숫자 코드)
  const iso = String(c.iso || '').trim();
  if (/^4[5][A-Z0-9]{2}$/.test(iso) || iso.startsWith('45')) return '45';
  if (/^4[0-9][A-Z0-9]{2}$/.test(iso) || iso.startsWith('4')) return '40';
  return '20';
};

function groupByBay(containers) {
  const m = {};
  containers.forEach(c => {
    if (!c.bay) return;
    const k = normalizeBay(c.bay);
    if (k) (m[k] = m[k] || []).push(c);
  });
  return m;
}

// M6.86: 카스피 양식 trio 빌더 - 단독 holes + 자동 페어 (N+1, N+2)
//   기존 splitForeAft + buildBayPages + matchColumns 통합
//   카스피 STOWAGE INSTRUCTION 양식: 모든 trio = single odd + 자기 짝수 페어
//   예: BAY 21 + (22)23, BAY 17 + (18)19, BAY 13 + (14)15, ...
//   분할: 베이 번호 24 기준 (< 24 FORE, >= 24 AFT) — 선박 일반 hatch break 위치
//   M6.86.2: EDI 베이 범위 확장 (사용자: "빈자리도 자리다" - BAY 01부터 모든 자리 표시)
//     EDI에 BAY 09부터 있어도 BAY 01, 03, 05, 07 자동 추가 → trio 박스 자리 보장
function buildTriosAndSplit(bayList) {
  const ediBays = [...new Set(bayList.filter(n => Number.isFinite(n) && n > 0))];
  if (ediBays.length === 0) return { foreColumns: [], aftColumns: [] };

  // M6.86.2: EDI 베이 범위 확장 - 1부터 EDI 최대값+padding까지 모든 홀수 자동 추가
  //   카스피 양식: BAY 01~39 모두 자리 표시 (KKLC2604S PDF 검증, max=39)
  //   EDI에 컨테이너 없는 BAY 01-07, BAY 37-39도 자동 trio 생성 (베이사전 없는 경우 fallback)
  //   padding 4: EDI max=35라도 BAY 37, 39 자동 추가 (KKLC 양식 일치)
  const maxBay = Math.max(...ediBays);
  const expandTo = maxBay + 4;
  const validBays = new Set(ediBays);
  for (let n = 1; n <= expandTo; n++) {
    if (n % 2 === 1) validBays.add(n);  // 모든 홀수 (자동 단독 + 페어 생성)
  }
  const sortedBays = [...validBays].sort((a, b) => a - b);

  // 1) 짝수 N → (N, N+1) 페어 강제. odd N+1을 페어 odd로 마킹
  const pairs = [];
  const usedAsPairOdd = new Set();
  for (const n of sortedBays) {
    if (n % 2 === 0) {
      pairs.push({ even: n, odd: n + 1 });
      usedAsPairOdd.add(n + 1);
    }
  }

  // 2) 홀수 single + 자동 페어 (N+1, N+2) — 카스피 양식 핵심
  //   각 홀수 single은 자신의 짝수 짝꿍 페어 (N+1, N+2)를 함께 만든다.
  //   페어가 만들어지면 N+2를 usedAsPairOdd로 마킹해 다음 홀수가 single 안 되도록.
  const singles = [];
  const sortedHoles = sortedBays.filter(n => n % 2 === 1);
  for (const n of sortedHoles) {
    if (usedAsPairOdd.has(n)) continue;  // 이미 다른 페어의 odd
    singles.push({ bay: n });
    // 자동 페어 (N+1, N+2) — 없으면 추가
    if (!pairs.find(p => p.even === n + 1)) {
      pairs.push({ even: n + 1, odd: n + 2 });
      usedAsPairOdd.add(n + 2);
    }
  }

  // 3) trio 매칭: single.bay + 1 === pair.even
  const trios = singles.map(s => {
    const pair = pairs.find(p => p.even === s.bay + 1) || null;
    return { single: s, pair };
  });
  // 매칭 안 된 페어 (예: 단독 짝수 베이): single null + pair
  const matchedEvens = new Set(trios.filter(t => t.pair).map(t => t.pair.even));
  for (const p of pairs) {
    if (!matchedEvens.has(p.even)) trios.push({ single: null, pair: p });
  }

  // 4) FORE/AFT 분할 - 베이 번호 24 기준 (선박 hatch break 위치)
  //   < 24 = FORE, >= 24 = AFT
  //   주의: 선박마다 다를 수 있으나 일반 컨테이너 선박은 BAY 23/25 사이가 hatch break
  const triosFore = trios.filter(t => {
    const b = t.single?.bay ?? t.pair?.even ?? 0;
    return b < 24;
  });
  const triosAft = trios.filter(t => {
    const b = t.single?.bay ?? t.pair?.even ?? 0;
    return b >= 24;
  });

  // 좌측 = 큰 베이 (STERN 방향)
  const sortBig = (a, b) => (b.single?.bay ?? b.pair?.even ?? 0) - (a.single?.bay ?? a.pair?.even ?? 0);
  triosFore.sort(sortBig);
  triosAft.sort(sortBig);

  return {
    foreColumns: triosFore.slice(0, 6),
    aftColumns: triosAft.slice(0, 6),
  };
}

function buildBayPages(bays) {
  // M6.84: 짝수 베이의 짝꿍 홀수 자동 추가 (양하 0대지만 페어 박스 만들기 위해)
  //   원인: KKLC 카스피 양식 검증 — BAY 14 (40ft 24대) + BAY 15 (양하 0대) → 페어 (14)15
  //   기존: BAY 15가 bayMap에 없으면 페어 안 만들어짐 → BAY 14가 단독 박스로 (잘못)
  //   해결: 짝수 N → 양옆 홀수 N-1, N+1 자동 set에 추가 (n > 0 보장)
  // M6.85 fix: BAY 0 무효 베이 필터링 (선박 도메인상 BAY 01부터 시작)
  //   원인: dictBayList/bayMap에 BAY 0이 포함되면 (00)01 페어 만들어짐 →
  //         used에 BAY 01 들어가 single BAY 01 사라짐 → layout 깨짐
  // M6.86: 카스피 양식 trio-box 완성을 위해 단독 홀수 베이의 짝수 짝꿍 자동 추가
  //   원인: 카스피 양식은 BAY 21(단독) + (22)23(페어) = 한 trio-box.
  //         (22)23 페어가 양하 0이라 EDI에 없어도 박스는 자리 차지해야 함.
  //   해결: 모든 홀수 N에 대해 N+1 (짝수) 추가 → 그 짝수가 페어 처리 단계에서 (N+1, N+2) 페어 됨.
  //         단 (1)21 → (22)23 페어처럼 N+2 (홀수)도 expanded에 들어가야 함.
  const validBays = bays.filter(n => Number.isFinite(n) && n > 0);
  const expanded = new Set(validBays);
  for (const n of validBays) {
    if (n % 2 === 0) {
      if (n - 1 > 0) expanded.add(n - 1);
      expanded.add(n + 1);
    } else {
      // 홀수 N → (N+1) 짝수 페어의 even 자리, (N+2) 짝수+1 odd 자리
      // 둘 다 expanded에 추가하면 페어 (N+1, N+2) 만들어짐
      expanded.add(n + 1);
      expanded.add(n + 2);
    }
  }
  const expandedBays = [...expanded].filter(n => n > 0).sort((a, b) => a - b);
  const baySet = new Set(expandedBays);
  const used = new Set();
  const singles = [];
  const pairs = [];
  for (const n of expandedBays) {
    if (n % 2 === 0) {
      const leftIn = baySet.has(n - 1);
      const rightIn = baySet.has(n + 1);
      if (rightIn) {
        pairs.push({ even: n, odd: n + 1 });
        used.add(n + 1);
      } else if (!leftIn) {
        singles.push({ bay: n });  // 20ft 전용
      } else {
        pairs.push({ even: n, odd: null });
      }
    }
  }
  for (const n of expandedBays) {
    if (n % 2 === 1 && !used.has(n)) singles.push({ bay: n });
  }
  // 베이 번호 큰 것이 좌측 (STERN 방향)
  singles.sort((a, b) => b.bay - a.bay);
  pairs.sort((a, b) => b.even - a.even);
  return { singles, pairs };
}

// M5.33: 단독 베이와 짝꿍 베이를 컬럼 단위로 매칭
//   사용자 명세: "1번이 단독이면 그 밑 짝꿍 자리 비워둠 — 다른 짝꿍이 끼어들지 않음"
//   매칭 규칙: single.bay + 1 === pair.even (예: single 01의 컬럼 아래 = pair (02, 03))
//             통로 (짝수 없음)면 양 홀수 모두 단독 → 그 컬럼 아래 빈 칸
//   결과: [{ single, pair }] 배열 (베이 번호 큰 것이 좌측)
function matchColumns(singles, pairs) {
  const usedPairs = new Set();
  const columns = [];
  // 작은 베이부터 매칭 (우측이 작은 베이 = 01부터)
  const sortedSingles = [...singles].sort((a, b) => a.bay - b.bay);
  for (const single of sortedSingles) {
    // 매칭 짝꿍: pair.even === single.bay + 1
    const pair = pairs.find(p => !usedPairs.has(p.even) && p.even === single.bay + 1);
    if (pair) usedPairs.add(pair.even);
    columns.push({ single, pair: pair || null });
  }
  // 매칭 안 된 짝꿍 (예: 양옆 홀수 없는 경우, 또는 single 없는 짝꿍)
  for (const pair of pairs) {
    if (!usedPairs.has(pair.even)) columns.push({ single: null, pair });
  }
  // 정렬: 큰 베이 좌측, 작은 베이 우측
  columns.sort((a, b) => {
    const aBay = a.single?.bay ?? a.pair?.even ?? 0;
    const bBay = b.single?.bay ?? b.pair?.even ?? 0;
    return bBay - aBay;
  });
  return columns;
}

// M5.16: 특수화물 + X-RAY 표시 정보 반환
//   기존: 'o' / 'L' / 'X' 한 글자만
// M6.86.5: 카스피 STOWAGE INSTRUCTION (KKLC2604S) 양식 마크 약속 — 양하/선적 분기
//   ▶ 선적(loading): 일반 컨 = POD 첫 글자 (K=KAN, P=PUS, S=SGN, M=MIP, ...)
//      모든 POL이 PTK라 POL 그룹핑 의미 없음 → "변하는 쪽" POD로 그룹
//   ▶ 양하(discharge): 일반 컨 = letter 없음(공백), 셀 색만으로 선사 구분
//      모든 POD가 PTK라 POD 그룹핑 의미 없음 → 선사(operator)로 그룹
//      별첨에서 선사 3자리 코드 + 풀명 + 카운트
//   ▶ 공통: 특수화물(R 리퍼, D DG, F FR, T Tank, A OT, E 엠티) 최우선 letter
//      40ft shadow(짝수40ft가 양옆 홀수 차지)는 X
//   ▶ X-RAY (평택 양하만): 셀 우상단 ★ 마커
//
// returns: { letter, type, isXray, podFirst, opCode, isThrough }
//   - letter: 셀에 표시할 글자 (없으면 빈 문자열). 색은 podFirst(선적) 또는 opCode(양하)로 결정.
//   - type: 'reefer' / 'dg' / 'fr' / 'ot' / 'tk' / 'empty' / null
//   - podFirst: 선적 모드 일반 컨의 POD 첫 글자 (cell 색상용)
//   - opCode: 양하 모드 일반 컨의 선사 3자리 코드 (cell 색상용)
//   - isThrough: M6.86.6 — 양하 모드에서 PTK 아닌 컨 = 통과 (회색 처리용)
function getMark(c, mode, xrayMap) {
  const ptk = isPtk(c, mode);
  // M6.86.6: 양하 카고플랜에서 PTK 아니면 통과 화물 (회색 처리)
  const isThrough = mode === 'discharge' && !ptk;

  // 특수화물 우선순위 (양 모드 공통): DG > Reefer > FR > Tank > OT > 엠티
  const isReefer = isReeferContainer(c);
  const isFr = !!c.fr;
  const isTk = !!c.tk;
  const isOt = !!c.ot || !!c.oog;
  const isDg = !!c.dg;
  const isEmpty = c.fe === 'E';

  let type = null;
  let letter = '';
  if (isDg)        { type = 'dg';     letter = 'D'; }
  else if (isReefer) { type = 'reefer'; letter = isEmpty ? 'r' : 'R'; }
  else if (isFr)   { type = 'fr';     letter = 'F'; }
  else if (isTk)   { type = 'tk';     letter = 'T'; }
  else if (isOt)   { type = 'ot';     letter = 'A'; }
  else if (isEmpty){ type = 'empty';  letter = 'E'; }

  // 일반 컨 (특수 아님): 모드별 분기
  let podFirst = null;
  let opCode = null;
  if (!type) {
    if (mode === 'loading') {
      // 선적: 일반 컨은 POD 첫 글자
      //   - PTK 출발 컨 (도착지 = 외항): POD 첫 글자
      //   - 통과 컨 (POL≠PTK): 같은 규칙 (어차피 POD가 다르므로 POD로 그룹화)
      const podUp = String(c.pod || '').toUpperCase();
      const pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : '');
      if (pod3) {
        podFirst = pod3.charAt(0);
        letter = podFirst;
      } else {
        letter = '?';
      }
    } else {
      // 양하: 일반 컨은 letter 없음, 셀 색만
      //   - PTK 도착 컨 (= 양하 대상): 셀 색만 (선사별 색)
      //   - M6.86.6: 통과 컨 (POD≠PTK)은 opCode 안 잡음 → renderCell에서 회색 처리
      if (ptk) {
        const op = String(c.op || '').toUpperCase().trim();
        if (op) opCode = op;
      }
      letter = '';  // 글자 없음, 색만
    }
  }

  // X-RAY (평택 양하 대상만)
  const isXray = mode === 'discharge' && ptk && xrayMap && xrayMap[c.cn];

  // pod3 backward compat (기존 호출자 호환용)
  const pod3 = podFirst || null;

  return { letter, type, isXray, pod3, podFirst, opCode, isThrough };
}

function BayBox({ even, odd, containers, pairMap, mode, dictBay, xrayMap, globalRowRange, globalTiers, dictShipMeta, dictBaysSummary = {}, podColorMap = {}, podFirstColorMap = {}, opColorMap = {} }) {
  const allConts = [
    ...(even != null && containers[String(even)] || []),
    ...(odd != null && containers[String(odd)] || []),
  ];

  // M6.1 → M6.3 → M6.9: 단독 박스(even=null)의 경우, 양옆 짝수 베이의 40/45피트 컨테이너
  //   → 그 컨테이너 row+tier 자리에 X 표시 (다른 컨테이너 적재 불가)
  //   NBTD PDF 답안지 양식: 40ft = 양옆 두 홀수 베이 모두 차지 → 양쪽 모두 X
  //   짝꿍 베이 (예: BAY 24의 짝꿍 = BAY 25)이라도 BAY 23 (왼쪽 홀수)에도 X 표시
  let shadow40Conts = [];
  if (even == null && odd != null) {
    const oddNum = parseInt(odd);
    [oddNum - 1, oddNum + 1].forEach(evenBay => {
      if (evenBay <= 0) return;
      if (!containers[String(evenBay)]) return;
      const longConts = containers[String(evenBay)].filter(c => {
        const sz = sizeOf(c);
        return sz === '40' || sz === '45';
      });
      shadow40Conts.push(...longConts);
    });
  }

  const cellMap = {};
  allConts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row).padStart(2, '0');
    cellMap[`${t}-${r}`] = c;
  });
  // M6.1 → M6.9: 짝수 베이 40피트의 짝꿍 자리에 X 표시 (단독 박스만)
  //   NBTD PDF 답안지(NBTD2520E.pdf) 양식 — row 짝수 + row 홀수 모두에 X (row 그대로)
  //   양옆 짝수 베이의 40ft 컨테이너가 양쪽 홀수 베이 모두 차지
  shadow40Conts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row).padStart(2, '0');
    const key = `${t}-${r}`;
    if (!cellMap[key]) {
      cellMap[key] = { ...c, _shadow40: true };
    }
  });

  // M6.75: 박스 자체 row range (베이별로 다른 양식 — 카스피)
  //   페이지 max cols로 셀 너비 고정 → row 적은 박스는 가운데 정렬
  const boxRange = (() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    const checkConts = [...allConts, ...shadow40Conts];
    for (const c of checkConts) {
      if (!c.row || !c.tier) continue;
      const n = parseInt(c.row);
      const tier = parseInt(c.tier);
      if (!tier) continue;
      const isDeck = tier >= 80;
      if (n === 0) {
        if (isDeck) deckHas00 = true; else holdHas00 = true;
        continue;
      }
      if (isDeck) {
        if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
        else deckRight = Math.max(deckRight, n);
      } else {
        if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
        else holdRight = Math.max(holdRight, n);
      }
    }
    return {
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
  })();

  // M6.26: 베이플랜 로직 100% 이식 — 사용자 지시 "베이플랜에 다 맞춰주세요"
  //   1) row: globalRowRange 사용 (전 베이 통일 폭)
  //   2) tier: 페이지 두 베이 dictBay tier union + 실제 컨 tier + 80 기준 분리
  //   V5 외곽 통일 양식 → 베이플랜 양식으로 변경 (베이별 격자)

  // M6.77 → M6.78 → M6.79 → M6.80: deck/hold 별 row 양식 (사용자 PDF 검증)
  //   일반 선박: deck/hold 같은 row 양식 (DJCF, TMPZ 등)
  //   특이 선박: hold에 00 없는데 deck에 00 있음 → 별도 양식
  //   각 영역 안 모든 row 자리 셀 (border) — 컨 없으면 빈 셀
  const buildRows = (range) => {
    const maxLeft = range?.maxLeft || 0;
    const maxRight = range?.maxRight || 0;
    const has00 = range?.has00 || false;
    if (!maxLeft && !maxRight) return [];
    const left = [];
    for (let r = maxLeft; r >= 2; r -= 2) left.push(String(r).padStart(2, '0'));
    const right = [];
    for (let r = 1; r <= maxRight; r += 2) right.push(String(r).padStart(2, '0'));
    return has00 ? [...left, '00', ...right] : [...left, ...right];
  };
  // voyage 전체 deck/hold 별 (globalRowRange.deck/hold) — 모든 박스 동일
  const voyDeck = globalRowRange?.deck || {
    maxLeft: boxRange.deck.maxLeft, maxRight: boxRange.deck.maxRight, has00: boxRange.deck.has00
  };
  const voyHold = globalRowRange?.hold || {
    maxLeft: boxRange.hold.maxLeft, maxRight: boxRange.hold.maxRight, has00: boxRange.hold.has00
  };
  const deckDynRows = buildRows(voyDeck);
  const holdDynRows = buildRows(voyHold);
  // 셀 너비 — deck/hold max 기준 (큰 쪽 기준 + 가운데 정렬)
  const maxCols = Math.max(deckDynRows.length, holdDynRows.length, 1);
  const colWidthPct = 100 / maxCols;

  // M6.54: 점선 위치 통일 (사용자 선택 A)
  //   카고플랜 전체 베이의 deck/hold tier 합치기 → 모든 박스에 같은 자리
  //   박스별 사용 안 하는 tier는 hidden (자리 차지) → tier 82↔08 라인 모든 박스 정렬
  //
  // M6.56: PCBJ 같은 선박 — v2 baysSummary 각 베이 entry가 {} 빈 객체라
  //        deckTiersLocal/holdTiersLocal/deckTiers/holdTiers를 entry에서 못 가져오는 케이스 fallback.
  //        해결책 (v2 미수정):
  //          1차) baysSummary 각 entry의 tier 필드 (M6.54 그대로)
  //          2차) dictShipMeta.deckTiers/holdTiers (전체, bayDef 사전 level)
  //          3차) _v5Matrix 매트릭스 (.def 자동 추출 베이별 정보)
  const pageBayDictTiers = useMemo(() => {
    const deck = new Set();
    const hold = new Set();
    Object.values(dictBaysSummary).forEach(db => {
      if (!db) return;
      (db.deckTiersLocal || db.deckTiers || []).forEach(t => deck.add(String(t).padStart(2, '0')));
      (db.holdTiersLocal || db.holdTiers || []).forEach(t => hold.add(String(t).padStart(2, '0')));
    });
    // M6.56 2차 fallback: 베이별 tier 비어있으면 사전 level 전체 deckTiers/holdTiers
    if (deck.size === 0 && hold.size === 0 && dictShipMeta) {
      (dictShipMeta.deckTiers || []).forEach(t => deck.add(String(t).padStart(2, '0')));
      (dictShipMeta.holdTiers || []).forEach(t => hold.add(String(t).padStart(2, '0')));
    }
    return { deck, hold };
  }, [dictBaysSummary, dictShipMeta]);

  const hasDictTiers = pageBayDictTiers.deck.size > 0 || pageBayDictTiers.hold.size > 0;
  // M6.86.5: 약속 정정 — STD_DECK/STD_HOLD baseline 강제 제거 + 페이지 union 제거.
  //   사용자 검증 (KKLC2604S PDF + KKLC.def): 베이마다 실제 tier 구성이 다름. baseline 강제하면 가짜 셀 양산.
  //   원칙: dictBay(베이사전 entry).deckTiersLocal/holdTiersLocal → 이 베이의 실제 tier 그대로 사용.
  //         페어(짝수+홀수)는 둘 entry의 union (페어 박스 전체 정렬용).
  //         dictBay 없으면 EDI 실 컨테이너 tier만 사용 (베이별, 페이지 union 안 함).
  const allTierSources = [
    ...allConts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN'),
    ...shadow40Conts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN'),
  ];

  // 페어 베이(BAY 22 + BAY 23 같은) 경우 두 entry의 tier union 사용
  const dictBayEven = even != null ? dictBaysSummary[String(even).padStart(2, '0')] || dictBaysSummary[String(even)] : null;
  const dictBayOdd  = odd  != null ? dictBaysSummary[String(odd).padStart(2, '0')]  || dictBaysSummary[String(odd)]  : null;
  const localDeckTiers = new Set();
  const localHoldTiers = new Set();
  [dictBayEven, dictBayOdd, dictBay].forEach(db => {
    if (!db) return;
    (db.deckTiersLocal || db.deckTiers || []).forEach(t => localDeckTiers.add(String(t).padStart(2, '0')));
    (db.holdTiersLocal || db.holdTiers || []).forEach(t => localHoldTiers.add(String(t).padStart(2, '0')));
  });

  // 베이사전 없으면 EDI tier로 fallback (단, 페이지 union/global tier는 사용 안 함 — 베이마다 독립)
  if (localDeckTiers.size === 0 && localHoldTiers.size === 0) {
    allTierSources.forEach(t => {
      const n = parseInt(t);
      if (Number.isFinite(n) && n >= 80) localDeckTiers.add(t);
      else if (Number.isFinite(n) && n > 0) localHoldTiers.add(t);
    });
  } else {
    // 베이사전 + EDI tier (EDI에 베이사전 없는 tier 있으면 추가 — 검수원이 실 데이터 우선해야)
    allTierSources.forEach(t => {
      const n = parseInt(t);
      if (Number.isFinite(n) && n >= 80) localDeckTiers.add(t);
      else if (Number.isFinite(n) && n > 0) localHoldTiers.add(t);
    });
  }

  const deckTiersAll = Array.from(localDeckTiers).sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = Array.from(localHoldTiers).sort((a, b) => parseInt(b) - parseInt(a));
  const extraTier = dictBay?.extraTier || null;
  const extraTierStr = extraTier ? String(extraTier).padStart(2, '0') : null;
  const deckTiers = extraTierStr ? deckTiersAll.filter(t => t !== extraTierStr) : deckTiersAll;

  // M6.54 → M6.66 → M6.67 → M6.70h → M6.70m: 박스별 사용 tier
  //   M6.70m: 페이지 전체 union으로 모든 박스 같은 행 수 → 정렬 일치 + 셀 크기 일관
  //     단점 - 빈 행 존재 → CSS visibility:hidden로 셀 자체 안 보임 (자리 차지)
  //     useMemo로 캐시해서 폰 먹통 방지
  //   M6.82 [B]: 베이사전 부재/부족 시 STD_DECK / STD_HOLD baseline 강제 적용
  //     dictBaysSummary가 비어있거나 deckTiersLocal이 비어있는 케이스 → 표준 baseline
  //     모든 선박 동일 양식 통일 (STSE 2631E 525컨 검증 baseline)
  const pageDeckUnion = useMemo(() => {
    const set = new Set();
    Object.values(dictBaysSummary).forEach(db => {
      if (!db) return;
      (db.deckTiersLocal || db.deckTiers || []).forEach(t => set.add(String(t).padStart(2, '0')));
    });
    // M6.82 [B]: 베이사전 데이터 없으면 baseline (6단 deck) 적용
    if (set.size === 0) STD_DECK.forEach(t => set.add(t));
    return set;
  }, [dictBaysSummary]);

  const pageHoldUnion = useMemo(() => {
    const set = new Set();
    Object.values(dictBaysSummary).forEach(db => {
      if (!db) return;
      (db.holdTiersLocal || db.holdTiers || []).forEach(t => set.add(String(t).padStart(2, '0')));
    });
    // M6.82 [B]: 베이사전 데이터 없으면 baseline (4단 hold) 적용
    if (set.size === 0) STD_HOLD.forEach(t => set.add(t));
    return set;
  }, [dictBaysSummary]);

  const bayDeckTiersUsed = useMemo(() => {
    const set = new Set(pageDeckUnion);
    allConts.forEach(c => {
      const t = String(c.tier).padStart(2, '0');
      if (parseInt(t) >= 80) set.add(t);
    });
    shadow40Conts.forEach(c => {
      const t = String(c.tier).padStart(2, '0');
      if (parseInt(t) >= 80) set.add(t);
    });
    return set;
  }, [pageDeckUnion, allConts, shadow40Conts]);

  const bayHoldTiersUsed = useMemo(() => {
    const set = new Set(pageHoldUnion);
    allConts.forEach(c => {
      const t = String(c.tier).padStart(2, '0');
      if (parseInt(t) < 80) set.add(t);
    });
    shadow40Conts.forEach(c => {
      const t = String(c.tier).padStart(2, '0');
      if (parseInt(t) < 80) set.add(t);
    });
    return set;
  }, [pageHoldUnion, allConts, shadow40Conts]);

  // M5.98 → M6.63: extraTier는 deckTiers/holdTiers 계산 후 위쪽에서 처리됨

  // M6.86.5: hasHold/hasDeck 결정 — 베이사전(dictBay/dictBayEven/dictBayOdd) 직접 사용.
  //   페어 박스(BAY (22)23 등)는 even/odd 두 entry 중 하나라도 hasHold=true면 hold-area 그림.
  //   둘 다 hasHold=false (예: BAY (38)39 KKLC)면 hold-area 자체 안 그림 (area-invisible).
  //   베이사전 없으면 EDI 컨 기반 fallback.
  const allBayConts = [...allConts, ...shadow40Conts];
  const hasHoldCont = allBayConts.some(c => {
    const t = parseInt(c.tier);
    return Number.isFinite(t) && t > 0 && t < 80;
  });
  const hasDeckCont = allBayConts.some(c => {
    const t = parseInt(c.tier);
    return Number.isFinite(t) && t >= 80;
  });
  // dictBay 우선 + 페어 entry 모두 확인
  const dictHasHold = (db) => db && db.hasHold !== false;
  const dictHasDeck = (db) => db && db.hasDeck !== false;
  const anyDictBay = dictBayEven || dictBayOdd || dictBay;
  const hasHold = anyDictBay
    ? (dictHasHold(dictBayEven) || dictHasHold(dictBayOdd) || dictHasHold(dictBay))
    : hasHoldCont;
  const hasDeck = anyDictBay
    ? (dictHasDeck(dictBayEven) || dictHasDeck(dictBayOdd) || dictHasDeck(dictBay))
    : (hasDeckCont || Object.values(containers || {}).some(arr => arr.some(c => parseInt(c.tier) >= 80)));

  // M6.86.4: 카운트는 전체 컨테이너 (적재 + 통과). 적재만 세는 기존 로직은 KKLC 카스피처럼
  //   PTK 미관여 항차에서 모든 베이 0/0/0이 되는 회귀 버그의 원인.
  //   PTK 분류 정보는 좌측 하단 통계 박스에서 별도 표시.
  const cnt = { c20: 0, c40: 0, c45: 0 };
  const cntPtk = { c20: 0, c40: 0, c45: 0 };
  allConts.forEach(c => {
    const sz = sizeOf(c);
    const k = sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20';
    cnt[k]++;
    if (isPtk(c, mode)) cntPtk[k]++;
  });

  const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  let title;
  if (even != null && odd != null) title = `BAY (${dispBay(even)})${dispBay(odd)}`;
  else if (even != null) title = `BAY ${dispBay(even)}`;
  else title = `BAY ${dispBay(odd)}`;

  // 카운트: 페어이거나 짝수 단독 → "20/40/45", 홀수 단독 → 합계
  const isPaired = even != null;
  const total = cnt.c20 + cnt.c40 + cnt.c45;
  const countStr = isPaired ? `${cnt.c20} / ${cnt.c40} / ${cnt.c45}` : String(total);

  // M6.86.6: 셀 렌더 — 양하 카고플랜은 PTK=컬러, 통과=회색(흑백)
  //   ▶ 양하 PTK 일반: 선사별 컬러 배경 (opCode 없으면 기본 파랑)
  //   ▶ 양하 PTK 특수: 글자 + 자체 컬러 (R=시안, D=빨강 등)
  //   ▶ 양하 통과 일반: 회색 배경
  //   ▶ 양하 통과 특수: 글자 + 회색 (E/R/D 표시는 하되 흑백)
  //   ▶ 선적: 일반=POD 첫 글자 + 글자색, 특수=글자 + 자체색
  //   ▶ X-RAY: 우상단 ★ 마커 (양하 PTK만)
  //   ▶ shadow40: X (짝수40ft가 양옆 홀수 차지) — X는 오직 이 용도
  //   ▶ 빈 자리: 셀 border만 (글자/색 없음)
  const renderCell = (c, keyR) => {
    if (!c) return <span key={keyR} className="cell"></span>;
    if (c._shadow40) return <span key={keyR} className="cell mark-shadow">X</span>;
    const m = getMark(c, mode, xrayMap);
    // 특수화물 (R/D/F/T/A/E): 글자 + 색. 양하 통과면 회색.
    if (m.type) {
      const throughCls = m.isThrough ? 'through' : '';
      const cls = `cell mark-${m.letter} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''} ${throughCls}`;
      return <span key={keyR} className={cls}>{m.letter}</span>;
    }
    // 일반 컨: 모드별
    if (mode === 'loading') {
      // 선적: POD 첫 글자 + 글자색
      const podColor = m.podFirst && podFirstColorMap[m.podFirst];
      const cls = `cell mark-pod ${m.isXray ? 'xray' : ''}`;
      return <span key={keyR} className={cls} style={podColor ? { color: podColor, fontWeight: 700 } : undefined}>{m.letter}</span>;
    } else {
      // 양하: M6.86.6 — PTK=컬러, 통과=회색
      if (m.isThrough) {
        // 통과 컨테이너: 회색 배경 (글자 없음)
        return <span key={keyR} className="cell mark-through">&nbsp;</span>;
      }
      // PTK 양하 대상: 선사별 컬러 (opCode 없으면 기본 파랑 — 색이 무조건 보이게)
      const opColor = (m.opCode && opColorMap[m.opCode]) || '#3b82f6';
      const cls = `cell mark-op ${m.isXray ? 'xray' : ''}`;
      const style = { background: opColor + '55', borderColor: opColor, color: opColor };  // 55 = 33% opacity (더 잘 보이게)
      return <span key={keyR} className={cls} style={style}>&nbsp;</span>;
    }
  };

  return (
    <div className="bay-section">
      <div className="bay-title-row">
        <span className="bay-title">{title}</span>
        <span className="bay-count">{countStr}</span>
      </div>
      <div className="bay-content">
        {/* DECK 영역 - M6.86.5: hasDeck=false면 영역 자체 invisible (사실상 모든 베이에 deck 있음). 셀은 베이사전 deckTiersLocal 그대로. */}
        <div className={`deck-area ${!hasDeck ? 'area-invisible' : ''}`}>
          <div className="row-labels">
            {deckDynRows.map(r => <span key={r}>{r}</span>)}
          </div>
          <div className="grid-row-wrap">
            <div className="grid">
              {/* M6.86 fix: invisible-row 제거 → 모든 tier 항상 visible. 컨테이너 없는 자리도 빈 박스로 표시 (사용자: "빈자리도 자리다") */}
              {deckTiers.map(t => (
                <div key={t} className="tier-row">
                  {deckDynRows.map(r => renderCell(cellMap[`${t}-${r}`], r))}
                </div>
              ))}
              {extraTier && (
                <div className="tier-row extra-tier-row">
                  {deckDynRows.map(r => {
                    const tierStr = String(extraTier).padStart(2, '0');
                    return renderCell(cellMap[`${tierStr}-${r}`], r);
                  })}
                </div>
              )}
            </div>
            <div className="tier-labels">
              {deckTiers.map(t => <span key={t}>{t}</span>)}
              {extraTier && <span className="extra-tier-label">{extraTier}</span>}
            </div>
          </div>
        </div>
        {/* DECK / HOLD 사이 굵은 검은 가로선 (해치 커버 표시) */}
        <div className="hatch-break"></div>
        {/* HOLD 영역 - M6.86.5: hasHold=false면 영역 자체 invisible (BAY 33-39 KKLC 등 hull 후방 hold 없음). 셀은 베이사전 holdTiersLocal 그대로. */}
        <div className={`hold-area ${!hasHold ? 'area-invisible' : ''}`}>
          <div className="grid-row-wrap">
            <div className="grid">
              {holdTiers.map(t => (
                <div key={t} className="tier-row">
                  {holdDynRows.map(r => renderCell(cellMap[`${t}-${r}`], r))}
                </div>
              ))}
            </div>
            <div className="tier-labels">
              {holdTiers.map(t => <span key={t}>{t}</span>)}
            </div>
          </div>
          {/* 하단 row 라벨 자리 (visibility:hidden) — 다음 베이와 정렬 유지 */}
          <div className="row-labels row-labels-hidden">
            {holdDynRows.map(r => <span key={r}>{r}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintableCargoPlan({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, xrayMap = {}, 
  globalRowRange, globalTiers, onClose
}) {
  // M6.72 → M6.73 → M6.74: deck/hold 별 row 범위 + tier 검증
  //   사용자: DXQD 카고플랜에 00 row 잘못 표시 → 컨테이너에 row=0 있지만 tier 없는 미배정 양식
  //   해결: row + tier 모두 있어야 진짜 좌표 (미배정 row=0 무시)
  const computedRowRange = useMemo(() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    for (const c of containers) {
      if (!c.row || !c.tier) continue;  // M6.74: tier 없으면 미배정 — 무시
      const n = parseInt(c.row);
      const tier = parseInt(c.tier || 0);
      if (!tier) continue;
      const isDeck = tier >= 80;
      if (n === 0) {
        if (isDeck) deckHas00 = true; else holdHas00 = true;
        continue;
      }
      if (isDeck) {
        if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
        else deckRight = Math.max(deckRight, n);
      } else {
        if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
        else holdRight = Math.max(holdRight, n);
      }
    }
    return {
      maxLeft: Math.max(deckLeft, holdLeft),
      maxRight: Math.max(deckRight, holdRight),
      has00: deckHas00 || holdHas00,
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
  }, [containers]);

  const effectiveRowRange = globalRowRange || computedRowRange;

  const bayMap = useMemo(() => groupByBay(containers), [containers]);

  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const baseDict = getShipBayDictData(shipImo, shipName);
    if (!baseDict) return null;
    // M6.59: EDI 컨테이너로 L4 fallback 추가 보정
    //   STSE 같은 선박 — baysSummary 자동 생성됐지만 deckTiersLocal/holdTiersLocal 비어있음
    //   EDI 실측 컨테이너 tier 분포에서 베이별 deck(>=80)/hold(<80) 자동 분리
    const enrichedEntry = enrichBayDef(
      { bayDef: baseDict.bayDef },
      baseDict._v5Matrix,
      containers
    );
    return {
      ...baseDict,
      bayDef: enrichedEntry.bayDef,
      _enrichMeta: enrichedEntry._enrichMeta || baseDict._enrichMeta,
    };
  }, [shipImo, shipName, containers]);

  const dictBayList = useMemo(() => {
    if (!dictData?.bayDef?.bayList) return null;
    return dictData.bayDef.bayList.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n));
  }, [dictData]);

  const dictBaysSummary = useMemo(() => {
    if (!dictData?.bayDef?.baysSummary) return {};
    const m = {};
    dictData.bayDef.baysSummary.forEach(b => { m[parseInt(b.bayNo, 10)] = b; });
    return m;
  }, [dictData]);

  // M5.39: 베이사전 명시 필드 (PDF 추출 row/tier) — 절대 기준
  //   bayDef.rowMaxEven, rowMaxOdd, deckTiers, holdTiers
  const dictShipMeta = useMemo(() => ({
    rowMaxEven: dictData?.bayDef?.rowMaxEven,
    rowMaxOdd: dictData?.bayDef?.rowMaxOdd,
    deckTiers: dictData?.bayDef?.deckTiers,
    holdTiers: dictData?.bayDef?.holdTiers,
  }), [dictData]);

  const bayList = useMemo(() => {
    // M6.85: BAY 0 무효 베이 필터링 (선박 도메인상 BAY 01부터 시작)
    if (dictBayList && dictBayList.length > 0) {
      return [...dictBayList].filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    }
    return Object.keys(bayMap).map(b => parseInt(b, 10)).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
  }, [dictBayList, bayMap]);

  // M6.86: 통합 trio 빌더 (splitForeAft + buildBayPages + matchColumns 대체)
  const { foreColumns, aftColumns } = useMemo(() => buildTriosAndSplit(bayList), [bayList]);

  // M6.6: 짝수 베이 → 짝꿍 홀수 베이 맵 (shadow40 처리에서 사용)
  //   M6.86: 새 trio 구조에서 pairMap 추출
  const pairMap = useMemo(() => {
    const map = {};
    [...foreColumns, ...aftColumns].forEach(col => {
      if (col.pair) map[col.pair.even] = col.pair.odd;
    });
    return map;
  }, [foreColumns, aftColumns]);

  // M6.86.5: 모드별 셀 색상 매핑
  //   선적: POD 첫 글자(K/P/S/M ...)별 8색 순환 (셀 글자 색 + legend 색)
  //   양하: 선사(operator/NAD+CA) 3자리 코드별 8색 순환 (셀 배경 색 + legend 색)
  //   양 모드 공통: 등장 순서대로 8색 순환 (모든 POD/선사 다 색상 부여)
  const COLOR_PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // 선적 모드: POD 첫 글자 → 색
  const podFirstColorMap = useMemo(() => {
    if (mode !== 'loading') return {};
    const firsts = new Set();
    containers.forEach(c => {
      if (!c.pod) return;
      const podUp = String(c.pod).toUpperCase();
      const pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : null);
      if (pod3) firsts.add(pod3.charAt(0));
    });
    const map = {};
    Array.from(firsts).sort().forEach((p, i) => {
      map[p] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return map;
  }, [containers, mode]);

  // 양하 모드: 선사 3자리 코드 → 색
  const opColorMap = useMemo(() => {
    if (mode !== 'discharge') return {};
    const ops = new Set();
    containers.forEach(c => {
      const op = String(c.op || '').toUpperCase().trim();
      if (op) ops.add(op);
    });
    const map = {};
    // 등장 컨테이너 수 기준 내림차순 정렬 (큰 선사가 안정된 색상)
    const opCount = {};
    containers.forEach(c => {
      const op = String(c.op || '').toUpperCase().trim();
      if (op) opCount[op] = (opCount[op] || 0) + 1;
    });
    Array.from(ops)
      .sort((a, b) => (opCount[b] || 0) - (opCount[a] || 0) || a.localeCompare(b))
      .forEach((op, i) => {
        map[op] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      });
    return map;
  }, [containers, mode]);

  // 기존 podColorMap 호환 (M6.65 podColorMap 호출 코드용 — 선적 모드 PTK PODs 전체)
  const podColorMap = useMemo(() => {
    if (mode !== 'loading') return {};
    const pods = new Set();
    containers.forEach(c => {
      if (!isPtk(c, mode)) return;
      if (c.pod) {
        const podUp = String(c.pod).toUpperCase();
        const pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : null);
        if (pod3 && pod3 !== 'PTK') pods.add(pod3);
      }
    });
    const map = {};
    Array.from(pods).sort().forEach((p, i) => {
      map[p] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return map;
  }, [containers, mode]);

  // M5.91: 선적 모드는 POD별로 그룹화 (양하는 PTK 단일)
  // M5.94: 사이즈별 상세 분류(20DC/20RF/40DC/40HC...) + 통과 화물 카운트 추가
  const totalCounts = useMemo(() => {
    const result = {
      byPod: {},     // POD별 { c20, c40, c45 }
      total: { c20: 0, c40: 0, c45: 0 },
      byCategory: {  // 사이즈+타입별 상세
        '20DC': 0, '20HC': 0, '20RF': 0, '20FR': 0, '20OT': 0, '20TK': 0,
        '40DC': 0, '40HC': 0, '40RF': 0, '40FR': 0, '40OT': 0, '40TK': 0,
        '45HC': 0, '45DC': 0, 'other': 0,
      },
      special: { dg: 0, oog: 0, rf: 0 },  // 특수 화물 (별도 마커)
      ptkTotal: 0,
      transitTotal: 0,
      grandTotal: 0,
    };
    containers.forEach(ct => {
      result.grandTotal++;
      const isOurs = isPtk(ct, mode);
      if (!isOurs) {
        result.transitTotal++;
        return;
      }
      result.ptkTotal++;
      // 사이즈
      const sz = sizeOf(ct);
      const key = sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20';
      // POD
      let pod = String(ct.pod || '').toUpperCase().trim();
      if (mode === 'discharge') {
        pod = 'PTK';
      } else if (pod) {
        if (pod.length === 5 && (pod.startsWith('CN') || pod.startsWith('KR') ||
            pod.startsWith('JP') || pod.startsWith('TW') || pod.startsWith('VN') ||
            pod.startsWith('TH') || pod.startsWith('MY') || pod.startsWith('ID') ||
            pod.startsWith('PH') || pod.startsWith('SG') || pod.startsWith('HK') ||
            pod.startsWith('US') || pod.startsWith('RU'))) {
          pod = pod.slice(-3);
        }
      } else {
        pod = '?';
      }
      if (!result.byPod[pod]) result.byPod[pod] = { c20: 0, c40: 0, c45: 0 };
      result.byPod[pod][key]++;
      result.total[key]++;
      // 카테고리별
      const lbl = (isoToLabel(ct.iso) || '').toUpperCase();
      if (result.byCategory[lbl] !== undefined) {
        result.byCategory[lbl]++;
      } else {
        result.byCategory.other++;
      }
      // 특수 화물
      if (ct.dg || (ct.imdgClass && String(ct.imdgClass).trim())) result.special.dg++;
      if (ct.oog || lbl.includes('OT') || lbl.includes('FR')) result.special.oog++;
      if (lbl.includes('RF') || isReeferContainer(ct)) result.special.rf++;
    });
    return result;
  }, [containers, mode]);

  const titleText = mode === 'discharge' ? 'CARGO DISCHARGING PLAN' : 'STOWAGE INSTRUCTION';
  // M5.94: POL/POD 둘 다 표시 (양하: POL: 외항 → POD: PTK / 적재: POL: PTK → POD: 외항)
  //   pol/pod 정보를 voyageInfo와 컨테이너에서 추출
  const inferPol = useMemo(() => {
    if (mode === 'discharge') {
      // 양하: 컨테이너의 POL (가장 흔한)
      const polCounts = {};
      containers.forEach(c => {
        const pol = (c.pol || '').toUpperCase().trim();
        if (!pol) return;
        const short = pol.length === 5 ? pol.slice(-3) : pol;
        polCounts[short] = (polCounts[short] || 0) + 1;
      });
      const top = Object.entries(polCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      return top || (voyageInfo?.pol ? voyageInfo.pol.slice(-3) : '?');
    } else {
      return 'PTK';  // 적재: 평택
    }
  }, [containers, mode, voyageInfo?.pol]);
  const inferPod = useMemo(() => {
    if (mode === 'discharge') return 'PTK';
    // 적재: 가장 흔한 POD
    const podCounts = {};
    containers.forEach(c => {
      const pod = (c.pod || '').toUpperCase().trim();
      if (!pod) return;
      const short = pod.length === 5 ? pod.slice(-3) : pod;
      podCounts[short] = (podCounts[short] || 0) + 1;
    });
    const top = Object.entries(podCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return top || '?';
  }, [containers, mode]);
  const portText = `POL : ${inferPol}  →  POD : ${inferPod}`;
  const todayStr = new Date().toISOString().slice(0, 10);

  // M6.82 [C]: 페이지 2 — Special Cargo Stowage (베이플랜 기반 특수화물 리스트)
  //   사용자 핵심 요구 (userPreferences #4): "특수 화물 리스트 = 베이플랜이 기본"
  //   포함 타입: 리퍼 (R, 온도 포함), DG (D, UN/Class), FR (F), OT (A), Tank (T)
  //   양하 모드: PTK 양하 컨만 / 적재 모드: PTK 출발 컨만
  const specialCargo = useMemo(() => {
    const list = [];
    containers.forEach(c => {
      if (!isPtk(c, mode)) return;
      const isReefer = isReeferContainer(c);
      const isDg = !!c.dg || !!c.imdgClass;
      const isFr = !!c.fr || (isoToLabel(c.iso) || '').toUpperCase().includes('FR');
      const isOt = !!c.ot || !!c.oog || (isoToLabel(c.iso) || '').toUpperCase().includes('OT');
      const isTk = !!c.tk || (isoToLabel(c.iso) || '').toUpperCase().includes('TK');
      if (!isReefer && !isDg && !isFr && !isOt && !isTk) return;
      // 우선순위 분류 (BayPlan과 동일): DG > Reefer > FR > TK > OT
      let kind;
      if (isDg) kind = 'DG';
      else if (isReefer) kind = 'Reefer';
      else if (isFr) kind = 'FR';
      else if (isTk) kind = 'Tank';
      else kind = 'OT';
      list.push({
        cn: c.cn || '',
        bay: c.bay ? String(c.bay).padStart(2, '0') : '',
        row: c.row != null ? String(c.row).padStart(2, '0') : '',
        tier: c.tier != null ? String(c.tier).padStart(2, '0') : '',
        iso: (isoToLabel(c.iso) || c.iso || '').toString(),
        fe: c.fe || '',
        weight: c.weight || '',
        pol: (c.pol || '').toUpperCase(),
        pod: (c.pod || '').toUpperCase(),
        kind,
        temp: c.reefer_temp || c.tmp || c.temp || '',  // 리퍼 온도
        un: c.un || '',                                  // DG UN 번호
        imdgClass: c.imdgClass || c.dgc || '',           // DG IMDG class
        sealNo: c.sealNo || c.seal || '',                // 실 번호 (가능시)
      });
    });
    // 정렬: kind → bay → tier → row
    const kindOrder = { 'DG': 1, 'Reefer': 2, 'FR': 3, 'Tank': 4, 'OT': 5 };
    list.sort((a, b) => {
      const ko = (kindOrder[a.kind] || 9) - (kindOrder[b.kind] || 9);
      if (ko !== 0) return ko;
      const ba = parseInt(a.bay) || 0, bb = parseInt(b.bay) || 0;
      if (ba !== bb) return ba - bb;
      const ta = parseInt(a.tier) || 0, tb = parseInt(b.tier) || 0;
      if (ta !== tb) return tb - ta;  // tier 큰 것부터 (상단)
      return (parseInt(a.row) || 0) - (parseInt(b.row) || 0);
    });
    return list;
  }, [containers, mode]);

  // M6.82 [C]: 종류별 카운트 (페이지 2 상단)
  const specialCounts = useMemo(() => {
    const c = { Reefer: 0, DG: 0, FR: 0, Tank: 0, OT: 0 };
    specialCargo.forEach(s => { c[s.kind] = (c[s.kind] || 0) + 1; });
    return c;
  }, [specialCargo]);

  // M6.86.4: 별첨1 — 선사(operator)별 카운트 (NAD+CA / c.op)
  //   메모리 #2: "별첨1=선사별 카운트(NAD+CA)". sz × F/E 매트릭스로 표시.
  const carrierBreakdown = useMemo(() => {
    const byCarrier = {};
    containers.forEach(c => {
      const op = String(c.op || '').toUpperCase().trim() || '-';
      const sz = sizeOf(c);
      const fe = (c.fe === 'E') ? 'E' : 'F';  // 미확정도 F로 (보수적)
      const key = sz + fe;  // 예: '20F', '40E', '45F'
      if (!byCarrier[op]) {
        byCarrier[op] = { '20F': 0, '20E': 0, '40F': 0, '40E': 0, '45F': 0, '45E': 0, total: 0, ptk: 0, transit: 0 };
      }
      byCarrier[op][key] = (byCarrier[op][key] || 0) + 1;
      byCarrier[op].total++;
      if (isPtk(c, mode)) byCarrier[op].ptk++; else byCarrier[op].transit++;
    });
    const rows = Object.entries(byCarrier)
      .map(([op, v]) => ({ op, ...v }))
      .sort((a, b) => b.total - a.total);
    const totals = rows.reduce((acc, r) => {
      ['20F', '20E', '40F', '40E', '45F', '45E', 'total', 'ptk', 'transit'].forEach(k => {
        acc[k] = (acc[k] || 0) + r[k];
      });
      return acc;
    }, {});
    return { rows, totals };
  }, [containers, mode]);

  // M6.86.4: 별첨2 — 화물종류별 카운트 (베이마크와 색 일치)
  //   메모리 #2: "별첨2=화물종류별(베이마크와 색 일치)"
  //   분류 우선순위: DG > Reefer > FR > Tank > OT > Empty(엠티) > 일반
  //   통과/적재 분리해서 표시 (양쪽 합 = grandTotal)
  const cargoTypeBreakdown = useMemo(() => {
    const cats = {
      reefer: { label: '리퍼 (R)',  mark: 'R', ptk: 0, transit: 0 },
      dg:     { label: 'DG (D)',    mark: 'D', ptk: 0, transit: 0 },
      fr:     { label: 'FR (F)',    mark: 'F', ptk: 0, transit: 0 },
      tk:     { label: 'TK (T)',    mark: 'T', ptk: 0, transit: 0 },
      ot:     { label: 'OT (A)',    mark: 'A', ptk: 0, transit: 0 },
      empty:  { label: '엠티 (E)',  mark: 'E', ptk: 0, transit: 0 },
      general:{ label: '일반 (o/L)',mark: 'o', ptk: 0, transit: 0 },
    };
    containers.forEach(c => {
      const isReefer = isReeferContainer(c);
      const isDg = !!c.dg || !!c.imdgClass;
      const isFr = !!c.fr || (isoToLabel(c.iso) || '').toUpperCase().includes('FR');
      const isOt = !!c.ot || !!c.oog || (isoToLabel(c.iso) || '').toUpperCase().includes('OT');
      const isTk = !!c.tk || (isoToLabel(c.iso) || '').toUpperCase().includes('TK');
      let key;
      if (isDg) key = 'dg';
      else if (isReefer) key = 'reefer';
      else if (isFr) key = 'fr';
      else if (isTk) key = 'tk';
      else if (isOt) key = 'ot';
      else if (c.fe === 'E') key = 'empty';
      else key = 'general';
      const bucket = isPtk(c, mode) ? 'ptk' : 'transit';
      cats[key][bucket]++;
    });
    const rows = Object.values(cats).map(r => ({ ...r, total: r.ptk + r.transit }));
    const totals = rows.reduce((acc, r) => ({
      ptk: (acc.ptk || 0) + r.ptk,
      transit: (acc.transit || 0) + r.transit,
      total: (acc.total || 0) + r.total,
    }), {});
    return { rows, totals };
  }, [containers, mode]);


  // M5.94: 선박 풀네임 + 약자 (vslFull은 EDI에서 자동 추출된 풀네임, vsl은 사용자 약자)
  const vslShort = voyageInfo?.vsl || shipName || 'VESSEL';
  const vslFull = voyageInfo?.vslFull || '';
  const vsl = vslFull ? `${vslShort} ${vslFull}` : vslShort;
  // M6.16: mode 기반 항차번호 단일 표시
  //   양하 카고플랜 → voy_d (양하 EDI 업로드 시 자동 저장)
  //   선적 카고플랜 → voy_l (선적 EDI 업로드 시 자동 저장)
  //   둘 다 없으면 voyage.info.voy (등록 시 입력값) 폴백
  // M6.37: voyageKey("XTPG_0523E" 같은 키)는 voy가 아니므로 fallback에서 제거
  //   사용자 보고: 카고플랜에 양하/선적 항차 정확히 안 나옴
  //   원인: voy_d 또는 voy_l이 비어있을 때 voyageKey가 표시되거나
  //         다른 mode의 voy가 generic으로 fallback되어 잘못 표시
  const voyD = voyageInfo?.voy_d || '';
  const voyL = voyageInfo?.voy_l || '';
  const voyGeneric = voyageInfo?.voy || '';
  let voy;
  if (mode === 'discharge') {
    voy = voyD || voyGeneric;
  } else if (mode === 'loading') {
    voy = voyL || voyGeneric;
  } else {
    // 모드 미상 (모달 직접 호출 등) — 양/선 둘 다 보이게
    if (voyD && voyL && voyD !== voyL) voy = `양하 ${voyD} / 선적 ${voyL}`;
    else voy = voyD || voyL || voyGeneric;
  }

  // M6.86: foreColumns/aftColumns는 위 useMemo의 buildTriosAndSplit에서 이미 만들어짐

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col bd-print-modal">
      <div className="no-print flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
        <div className="text-base font-bold text-slate-100">📄 카고 플랜 인쇄 미리보기</div>
        <div className="flex gap-2">
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">🖨 인쇄</button>
            <button onClick={() => { alert('인쇄 창에서 "PDF로 저장" 선택하세요'); setTimeout(() => window.print(), 100); }} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded">📄 PDF</button>
            <button onClick={async () => {
              if (typeof window.XLSX === 'undefined') {
                const s = document.createElement('script');
                s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
                document.head.appendChild(s);
                await new Promise(r => s.onload = r);
              }
              try {
                const tables = document.querySelectorAll('table');
                if (!tables.length) { alert('테이블 없음'); return; }
                const wb = window.XLSX.utils.book_new();
                tables.forEach((t, i) => {
                  const ws = window.XLSX.utils.table_to_sheet(t);
                  window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet' + (i+1));
                });
                const d = new Date().toISOString().slice(0,10);
                window.XLSX.writeFile(wb, document.title + '_' + d + '.xlsx');
              } catch (e) { alert('엑셀 실패: ' + e.message); }
            }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded">📊 엑셀</button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded">
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <div className="cargo-plan-page">
          <div className="cargo-header">
            <span>{vsl}</span>
            <span className="cargo-title">{titleText}</span>
            <span>DATE : {todayStr}</span>
          </div>
          <div className="cargo-subheader">
            <span>VOY NO : {voy}</span>
            <span>{portText}</span>
          </div>

          {/* M6.86: 참조 양식 (SITC SENDAI 2631E, M6.81 Universal Cargo Plan) — 2행 6열 trio-box
              한 trio-box = 단독 odd (위) + trio-divider + 페어 (아래)
              FORE/AFT 행 각각 6 컬럼. AFT 좌측에 legend + 통계 박스 (컬럼 부족 시) */}
          {(() => {
            // M6.86.4: 총량 = grandTotal (적재 + 통과). 적재/통과는 별도 라인.
            const totalPtk = totalCounts.total.c20 + totalCounts.total.c40 + totalCounts.total.c45;
            const totalTransit = totalCounts.transitTotal;
            const totalAll = totalCounts.grandTotal;
            const sortedPods = Object.entries(totalCounts.byPod).sort((a, b) => {
              const ta = a[1].c20 + a[1].c40 + a[1].c45;
              const tb = b[1].c20 + b[1].c40 + b[1].c45;
              return tb - ta;
            });
            const cats = totalCounts.byCategory || {};
            const cat20 = ['20DC', '20HC', '20RF', '20FR', '20OT', '20TK'].filter(k => cats[k] > 0);
            const cat40 = ['40DC', '40HC', '40RF', '40FR', '40OT', '40TK'].filter(k => cats[k] > 0);
            const cat45 = ['45HC', '45DC'].filter(k => cats[k] > 0);
            // 베이 박스 한 컬럼 (trio-box: 위 단독, 아래 페어)
            const renderTrioCol = (col, key) => {
              const hasSingle = !!col?.single;
              const hasPair = !!col?.pair;
              return (
                <div key={key} className="bay-box trio-box">
                  {hasSingle ? (
                    <BayBox even={null} odd={col.single.bay} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap} podFirstColorMap={podFirstColorMap} opColorMap={opColorMap}
                      mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap}
                      globalRowRange={effectiveRowRange} globalTiers={globalTiers}
                      dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
                  ) : <div className="bay-section bay-section-empty"></div>}
                  <div className="trio-divider"></div>
                  {hasPair ? (
                    <BayBox even={col.pair.even} odd={col.pair.odd} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap} podFirstColorMap={podFirstColorMap} opColorMap={opColorMap}
                      mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap}
                      globalRowRange={effectiveRowRange} globalTiers={globalTiers}
                      dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
                  ) : <div className="bay-section bay-section-empty"></div>}
                </div>
              );
            };
            // M6.86.5: 통계 박스 — 모드별 분기
            //   선적: POD 첫 글자별 + 글자 색 + POD 풀명 + 20/40/45 카운트
            //   양하: 선사 3자리 색박스 + 풀명 + 20/40/45 카운트 (선사 많으면 자동 축소)
            //   양 모드 공통: 총 + 적재/통과 분리, 사이즈+타입별 상세, 특수 마크 범례
            // POD 풀명 매핑 (선적 모드용)
            const podFullMap = {
              'KAN': 'KAOHSIUNG', 'PUS': 'BUSAN', 'SGN': 'HO CHI MINH', 'MIP': 'MANILA',
              'INC': 'INCHEON', 'PTK': 'PYEONGTAEK',
              'DLC': 'DALIAN', 'LYG': 'LIANYUNGANG', 'XMN': 'XIAMEN',
              'SHK': 'SHEKOU', 'SHA': 'SHANGHAI', 'TAO': 'QINGDAO',
              'TSN': 'TIANJIN', 'NGB': 'NINGBO', 'XGG': 'XINGANG',
              'WEI': 'WEIHAI', 'YTN': 'YANTIAN', 'HKG': 'HONG KONG',
              'TYO': 'TOKYO', 'OSA': 'OSAKA', 'NGO': 'NAGOYA',
              'YOK': 'YOKOHAMA', 'KBE': 'KOBE', 'HKT': 'HAKATA',
              'HPH': 'HAIPHONG', 'DAD': 'DA NANG',
              'KEL': 'KEELUNG', 'KHH': 'KAOHSIUNG',
              'LCH': 'LAEM CHABANG', 'BKK': 'BANGKOK',
              'SIN': 'SINGAPORE', 'MNL': 'MANILA', 'PKG': 'PORT KLANG',
            };
            // 선적 모드: POD 첫 글자별 그룹화
            const podFirstGroups = {};  // 'K': { c20, c40, c45, fullNames: Set }
            const otherTotal = { c20: 0, c40: 0, c45: 0 };
            if (mode === 'loading') {
              containers.forEach(c => {
                if (!c.pod) return;
                const podUp = String(c.pod).toUpperCase();
                const pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : '');
                if (!pod3) return;
                const first = pod3.charAt(0);
                const sz = sizeOf(c);
                const k = sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20';
                if (!podFirstGroups[first]) {
                  podFirstGroups[first] = { c20: 0, c40: 0, c45: 0, fullName: pod3 };
                }
                podFirstGroups[first][k]++;
              });
            }
            // 양하 모드: 선사별 카운트 (carrierBreakdown 활용)
            const carrierRows = mode === 'discharge' ? carrierBreakdown.rows : [];
            // 선사 수에 따라 자동 폰트 축소
            const carrierCount = carrierRows.length;
            const carrierFontClass = carrierCount > 16 ? 'tiny' : carrierCount > 10 ? 'small' : carrierCount > 6 ? 'mid' : '';
            // 통계 박스
            const statsBox = (
              <div className={`bay-stats-inline ${carrierFontClass ? `carrier-${carrierFontClass}` : ''}`} key="stats">
                <div className="stats-title">20'/40'/45'</div>
                {mode === 'loading' && Object.keys(podFirstGroups).sort().map(first => {
                  const g = podFirstGroups[first];
                  const color = podFirstColorMap[first];
                  const full = g.fullName;
                  const fullName = podFullMap[full] || full;
                  return (
                    <div key={first} className="stats-line">
                      <span className="stats-letter" style={color ? { color, fontWeight: 700 } : undefined}>{first}</span>
                      {' '}<span className="stats-podcode">{full}</span>
                      {' '}<b>{g.c20} / {g.c40} / {g.c45}</b>
                      {fullName !== full && <span className="stats-podfull"> ({fullName})</span>}
                    </div>
                  );
                })}
                {mode === 'discharge' && carrierRows.map((r) => {
                  const color = opColorMap[r.op];
                  return (
                    <div key={r.op} className="stats-line">
                      <span
                        className="op-swatch"
                        style={color ? { background: color + '33', borderColor: color } : undefined}
                      />
                      <span className="stats-opcode">{r.op}</span>
                      {' '}<b>{(r['20F']||0)+(r['20E']||0)} / {(r['40F']||0)+(r['40E']||0)} / {(r['45F']||0)+(r['45E']||0)}</b>
                    </div>
                  );
                })}
                <div className="stats-total">TTL {totalAll}대</div>
                <div className="stats-breakdown">
                  적재 <b style={{color: '#d97706'}}>{totalPtk}</b>
                  {' / '}
                  통과 <b style={{color: '#6b7280'}}>{totalTransit}</b>
                </div>
                {(cat20.length > 0 || cat40.length > 0 || cat45.length > 0) && (
                  <div className="stats-detail">
                    {cat20.length > 0 && <div className="stats-detail-line">{cat20.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}</div>}
                    {cat40.length > 0 && <div className="stats-detail-line">{cat40.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}</div>}
                    {cat45.length > 0 && <div className="stats-detail-line">{cat45.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}</div>}
                  </div>
                )}
                <div className="stats-legend">
                  <span>R 리퍼</span>
                  <span>D DG</span>
                  <span>F FR</span>
                  <span>T TK</span>
                  <span>A OT</span>
                  <span>E 엠티</span>
                  <span>X 통과/shadow</span>
                </div>
              </div>
            );
            // 한 행 (6 컬럼 trio-box 또는 legend 자리)
            // FORE: 우측 정렬 (작은 베이 우측), AFT: 좌측 placeholder + legend + 페어 컬럼
            const renderForeRow = () => {
              // foreColumns가 6보다 적으면 좌측에 placeholder
              const ph = Math.max(0, 6 - foreColumns.length);
              return (
                <div className="page-row">
                  {Array.from({ length: ph }).map((_, i) => (
                    <div key={`fph-${i}`} className="col-placeholder"></div>
                  ))}
                  {foreColumns.map((col, i) => renderTrioCol(col, `fc-${i}`))}
                </div>
              );
            };
            const renderAftRow = () => {
              const ph = Math.max(0, 6 - aftColumns.length);
              // 좌측 placeholder 1개는 통계 박스로 대체
              return (
                <div className="page-row">
                  {ph > 0 ? (
                    <>
                      <div key="legend-col" className="col-placeholder col-legend">{statsBox}</div>
                      {Array.from({ length: ph - 1 }).map((_, i) => (
                        <div key={`aph-${i}`} className="col-placeholder"></div>
                      ))}
                    </>
                  ) : null}
                  {aftColumns.map((col, i) => renderTrioCol(col, `ac-${i}`))}
                </div>
              );
            };
            return (
              <div className="page-rows">
                {renderForeRow()}
                {renderAftRow()}
              </div>
            );
          })()}

          {/* M5.32: cargo-footer 영역 제거 — 통계는 마지막 짝꿍 행 좌측에 인라인 / 범례 제거 */}
        </div>

        {/* M6.82 [C]: 페이지 2 — Special Cargo Stowage (베이플랜 기반 특수화물 리스트)
            사용자 핵심 요구: "특수 화물 리스트 = 베이플랜이 기본"
            특수화물 0대면 페이지 자체 미생성 */}
        {specialCargo.length > 0 && (
          <div className="cargo-plan-page special-page">
            <div className="cargo-header">
              <span>{vsl}</span>
              <span className="cargo-title">SPECIAL CARGO STOWAGE</span>
              <span>DATE : {todayStr}</span>
            </div>
            <div className="cargo-subheader">
              <span>VOY NO : {voy}</span>
              <span>{portText}</span>
              <span>총 {specialCargo.length}대</span>
            </div>
            <div className="special-summary">
              {specialCounts.Reefer > 0 && <span className="sc-pill sc-reefer">Reefer {specialCounts.Reefer}</span>}
              {specialCounts.DG > 0 && <span className="sc-pill sc-dg">DG {specialCounts.DG}</span>}
              {specialCounts.FR > 0 && <span className="sc-pill sc-fr">FR {specialCounts.FR}</span>}
              {specialCounts.Tank > 0 && <span className="sc-pill sc-tank">Tank {specialCounts.Tank}</span>}
              {specialCounts.OT > 0 && <span className="sc-pill sc-ot">OT {specialCounts.OT}</span>}
            </div>
            <table className="special-table">
              <thead>
                <tr>
                  <th>NO</th>
                  <th>TYPE</th>
                  <th>BAY</th>
                  <th>위치 (R/T)</th>
                  <th>CN/NO</th>
                  <th>SIZE</th>
                  <th>F/E</th>
                  <th>POL → POD</th>
                  <th>WT(KG)</th>
                  <th>특수정보</th>
                  <th>실번호</th>
                </tr>
              </thead>
              <tbody>
                {specialCargo.map((s, i) => {
                  let extraInfo = '';
                  if (s.kind === 'Reefer' && s.temp) extraInfo = `${s.temp}°C`;
                  else if (s.kind === 'DG') {
                    const cls = s.imdgClass ? `Class ${s.imdgClass}` : '';
                    const un = s.un ? `UN${s.un}` : '';
                    extraInfo = [cls, un].filter(Boolean).join(' / ');
                  }
                  const kindClass = `sc-row sc-row-${s.kind.toLowerCase()}`;
                  return (
                    <tr key={`${s.cn}-${i}`} className={kindClass}>
                      <td>{i + 1}</td>
                      <td><b>{s.kind}</b></td>
                      <td>{s.bay}</td>
                      <td>{s.row}-{s.tier}</td>
                      <td className="cn-cell">{s.cn}</td>
                      <td>{s.iso}</td>
                      <td>{s.fe}</td>
                      <td>{s.pol} → {s.pod}</td>
                      <td className="num-cell">{s.weight ? Number(s.weight).toLocaleString() : ''}</td>
                      <td className="extra-cell">{extraInfo}</td>
                      <td className="seal-cell">{s.sealNo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="special-footnote">
              ※ 베이플랜 기준 추출 · 우선순위: DG &gt; Reefer &gt; FR &gt; Tank &gt; OT · {todayStr}
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* M4.9d-fix: 카고 플랜 인쇄 — box-sizing 전역 + visibility 토글 */
        @media print {
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          body * {
            visibility: hidden !important;
          }
          .bd-print-modal,
          .bd-print-modal * {
            visibility: visible !important;
          }
          .bd-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          .cargo-plan-page {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          @page { size: A4 landscape; margin: 0.3cm; }
        }
        .cargo-plan-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          font-size: 10pt;
          padding: 4px 8px;
          margin: 0 auto;
          position: relative;
          /* M5.37: 페이지 고정 높이 + flex column → 선박별 베이 갯수와 무관하게 자동 분배 */
          width: 291mm;
          min-height: 204mm;
          height: 204mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .cargo-header {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 2px;
          flex-shrink: 0;
        }
        .cargo-title { font-size: 16pt; font-weight: 500; }
        .cargo-subheader {
          display: flex; justify-content: center; gap: 80px;
          font-size: 11pt; margin-bottom: 4px;
          flex-shrink: 0;
        }
        /* M6.86: 페이지 그리드 — 2행 6열 (참조 SITC SENDAI 2631E 양식)
           .page-rows = 세로 flex (2 행), .page-row = 가로 flex (6 컬럼) */
        .page-rows {
          display: flex; flex-direction: column;
          flex: 1; min-height: 0;
          gap: 3px;
        }
        .page-row {
          display: flex; flex-direction: row;
          flex: 1 1 0; min-height: 0;
          gap: 3px;
        }
        .page-row > .bay-box,
        .page-row > .col-placeholder {
          flex: 1 1 0; width: 0; min-width: 0;
        }
        .col-placeholder {
          /* AFT 좌측 빈 컬럼: legend 또는 진짜 빈 자리 */
          display: flex; flex-direction: column;
          justify-content: flex-end; align-items: flex-start;
        }
        .col-placeholder.col-legend {
          justify-content: flex-end;
        }
        /* trio-box: 한 박스 안에 단독 (위) + trio-divider + 페어 (아래) */
        .bay-box.trio-box {
          border: 1px solid #000; background: white;
          display: flex; flex-direction: column;
          page-break-inside: avoid;
          overflow: hidden;
        }
        .bay-box.trio-box > .bay-section {
          flex: 1 1 0; min-height: 0;
        }
        .trio-divider {
          border-top: 0.5px solid #999;
          flex-shrink: 0;
        }
        /* bay-section = 한 베이 영역 (단독 또는 페어) */
        .bay-section {
          display: flex; flex-direction: column;
          align-items: center; padding: 3px 3px;
          min-height: 0; position: relative;
          font-size: 9pt;
        }
        .bay-section-empty { background: transparent; }
        .bay-title-row {
          position: relative; width: 100%;
          text-align: center; font-weight: bold;
          font-size: 10pt; padding: 0 6px;
          margin-bottom: 1px;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .bay-title { display: inline-block; }
        .bay-count {
          position: absolute; right: 6px; top: 0;
          color: #555; font-size: 8pt; font-weight: normal;
        }
        .bay-content {
          display: flex; flex-direction: column;
          align-items: center;
          flex: 1; width: 100%; min-height: 0;
        }
        /* deck:hold = 6:4 비율 (BAY 라벨 영역 보호, STSE 2631E 검증) */
        .deck-area {
          flex: 6 1 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-end;
          width: 100%; min-height: 0;
        }
        .hold-area {
          flex: 4 1 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          width: 100%; min-height: 0;
        }
        /* row 라벨 (위/아래) — M6.86.6: span도 flex로 셀과 정렬 */
        .row-labels {
          display: flex; justify-content: stretch;
          font-size: 6pt; color: #444;
          gap: 0; margin: 1px 0;
          margin-right: 14px;  /* tier 라벨 자리 보정 */
          width: calc(100% - 14px);  /* tier-labels 12px + gap 2px 빼고 */
          box-sizing: border-box;
        }
        .row-labels > span {
          flex: 1 1 0; min-width: 0;
          text-align: center; line-height: 1.2;
          overflow: hidden;
        }
        .row-labels-hidden > span { visibility: hidden; }
        /* 그리드 + tier 라벨 가로 wrap */
        .grid-row-wrap {
          display: flex; flex-direction: row;
          align-items: stretch; gap: 2px;
          width: 100%;  /* M6.86.6: 박스 폭 채우기 */
        }
        .grid {
          display: flex; flex-direction: column;
          align-items: stretch; gap: 0;
          flex: 1 1 0; min-width: 0;  /* M6.86.6: 셀이 박스 폭 채우게 */
        }
        /* tier-row = 한 줄 — M6.86.6: width 100% + 셀이 flex 균등 분할 */
        .tier-row {
          display: flex; gap: 0;
          height: 12px;
          width: 100%;
          box-sizing: border-box;
        }
        .tier-row.invisible-row { visibility: hidden; }
        /* M6.86: hold-area 또는 deck-area 전체 invisible (단독 odd 박스의 hold 영역 등 - 정렬용) */
        .area-invisible { visibility: hidden; }
        /* cell = M6.86.6: 동적 폭 (박스 폭 / 컬럼수로 자동 분할). 양끝 잘림 방지. */
        .cell {
          flex: 1 1 0; min-width: 0; width: auto;
          height: 12px;
          border: 0.5px solid #555;
          box-sizing: border-box;
          background: #fff;
          font-size: 7pt;
          display: flex; align-items: center; justify-content: center;
          line-height: 1;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
        .cell-empty {
          flex: 1 1 0; min-width: 0; width: auto;
          height: 12px;
          visibility: hidden;
        }
        /* DECK / HOLD 사이 굵은 검은 가로선 (해치 커버 표시) */
        .hatch-break {
          height: 0;
          border-top: 1.5px solid #000;
          width: 100%;  /* M6.86.6: 박스 폭 채우기 */
          margin: 1px 0;
          flex-shrink: 0;
        }
        /* tier 라벨 (우측) */
        .tier-labels {
          display: flex; flex-direction: column;
          align-items: flex-start;
          font-size: 6pt; color: #444;
          width: 12px;
          justify-content: center;
        }
        .tier-labels > span {
          height: 12px; line-height: 12px;
          display: block;
        }
        .tier-labels > span.invisible-label { visibility: hidden; }
        /* extra-tier (예: 80) — 빨간 라벨 */
        .extra-tier-label { color: #dc2626; font-weight: 600; }
        .tier-row.extra-tier-row { /* deck 마지막 줄로 처리 */ }
        /* mark 색상 (참조 양식 색) */
        /* M6.86.5: 셀 마크 색상 — 특수화물(R/D/F/T/A/E)만 자체 배경. 일반(POD/선사)은 inline style로 색 적용 */
        .cell.mark-X { color: #000; background: #f0f0f0; }
        .cell.mark-shadow { color: #999; font-style: italic; background: #f0f0f0; }
        .cell.mark-E { color: #6b7280; background: #e5e7eb; }
        .cell.mark-R { color: #006064; background: #b2ebf2 !important; font-weight: bold; }
        .cell.mark-r { color: #67e8f9; background: #ecfeff !important; }
        .cell.mark-D { color: #b71c1c; background: #ffcdd2 !important; font-weight: bold; }
        .cell.mark-F { color: #1b5e20; background: #c8e6c9 !important; font-weight: bold; }
        .cell.mark-T { color: #e65100; background: #ffe0b2 !important; font-weight: bold; }
        .cell.mark-A { color: #4a148c; background: #e1bee7 !important; font-weight: bold; }
        /* M6.86.5: 일반 컨 셀 — 선적 mode(POD 첫 글자, inline color)와 양하 mode(선사 색박스, inline bg) */
        .cell.mark-pod { font-weight: 700; }
        .cell.mark-op { /* inline style: background, borderColor */ }
        /* M6.86.6: 통과 화물 (양하 카고플랜에서 PTK 아님) — 회색 배경 */
        .cell.mark-through {
          background: #e8e8e8;
          border-color: #aaa;
        }
        /* M6.86.6: 특수화물도 통과면 회색 override (글자는 보이게 회색) */
        .cell.through {
          background: #ececec !important;
          color: #888 !important;
          border-color: #bbb !important;
          font-weight: normal !important;
        }
        /* X-RAY 마커 (셀 우상단 별표) */
        .cell.xray {
          position: relative;
          background: #fef08a !important;
          color: #b91c1c !important;
        }
        .cell.xray::after {
          content: '★';
          position: absolute;
          top: -2px; right: 0px;
          font-size: 6pt; line-height: 6pt;
          color: #dc2626;
        }
        .legend-box {
          padding: 6px 4px;
          display: flex; flex-direction: column; justify-content: flex-end;
          font-family: Arial, sans-serif;
          font-size: 9pt;
        }
        .legend-title { margin-bottom: 6px; }
        .legend-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 9pt; margin-bottom: 3px;
        }
        .legend-mark {
          width: 14px; height: 14px;
          border: 0.5px solid #000;
          text-align: center; line-height: 14px;
          font-size: 9pt;
          font-family: 'Courier New', monospace;
        }
        .legend-empty-mark { color: transparent; }
        .legend-label { width: 32px; }
        .legend-count { font-weight: 500; }
        /* M5.32: 통계 박스 - 마지막 짝꿍 행의 좌측 placeholder 자리 (베이 박스와 같은 flex) */
        .bay-stats-inline {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3px 6px;
          font-size: 9pt;
          line-height: 1.25;
          border: 0.5px dashed #999;
          background: #fafafa;
          overflow: hidden;
        }
        .bay-stats-inline .stats-title { font-weight: bold; margin-bottom: 2px; font-size: 8pt; }
        /* M5.91: POD별 한 줄씩 표시 — 압축 폰트 */
        .bay-stats-inline .stats-line { font-size: 8pt; white-space: nowrap; }
        .bay-stats-inline .stats-total { 
          font-weight: bold; 
          margin-top: 2px; 
          padding-top: 2px;
          border-top: 0.5px solid #999;
          font-size: 8pt;
        }
        /* M6.86.4: 적재/통과 분리 표시 — "총 N대" 바로 아래 */
        .bay-stats-inline .stats-breakdown {
          font-size: 7pt;
          line-height: 1.25;
          padding-bottom: 1px;
        }
        .bay-stats-inline .stats-breakdown b { font-weight: 700; }
        /* M5.91: POD가 많을 때 (5개 이상) 더 작게 */
        .bay-stats-inline:has(.stats-line:nth-child(7)) .stats-line { font-size: 7pt; line-height: 1.15; }
        /* M5.94: 사이즈+타입별 상세 */
        .bay-stats-inline .stats-detail {
          margin-top: 3px;
          padding-top: 2px;
          border-top: 0.5px dashed #aaa;
        }
        .bay-stats-inline .stats-detail-line {
          font-size: 6.5pt;
          line-height: 1.2;
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
        }
        .bay-stats-inline .stats-detail-line b { font-weight: bold; }
        .bay-stats-inline .stats-transit {
          margin-top: 2px;
          padding-top: 1px;
          font-size: 6.5pt;
          color: #666;
          border-top: 0.5px dotted #ccc;
        }
        .bay-stats-inline .stats-legend {
          margin-top: 2px;
          padding-top: 2px;
          font-size: 6pt;
          line-height: 1.2;
          color: #555;
          border-top: 0.5px dotted #ccc;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        /* M6.86.5: stats-line 안의 POD/선사 상세 */
        .bay-stats-inline .stats-line { font-size: 7.5pt; line-height: 1.3; white-space: nowrap; display: flex; align-items: center; gap: 2px; }
        .bay-stats-inline .stats-letter { font-family: 'Courier New', monospace; font-size: 9pt; min-width: 10px; display: inline-block; }
        .bay-stats-inline .stats-podcode,
        .bay-stats-inline .stats-opcode { font-family: 'Courier New', monospace; font-weight: 700; }
        .bay-stats-inline .stats-podfull { color: #888; font-size: 6.5pt; }
        /* 양하 모드: 선사 색박스 (셀 색과 동일 톤) */
        .bay-stats-inline .op-swatch {
          display: inline-block;
          width: 10px; height: 10px;
          border: 1px solid #999;
          margin-right: 2px;
          vertical-align: middle;
          flex-shrink: 0;
        }
        /* M6.86.5: 선사 수에 따른 동적 축소 — A4 한 장 유지를 위한 자동 축소 */
        .bay-stats-inline.carrier-mid  .stats-line { font-size: 6.8pt; line-height: 1.2; }
        .bay-stats-inline.carrier-mid  .stats-letter,
        .bay-stats-inline.carrier-mid  .op-swatch { font-size: 7pt; width: 9px; height: 9px; }
        .bay-stats-inline.carrier-small .stats-line { font-size: 6pt;   line-height: 1.15; }
        .bay-stats-inline.carrier-small .stats-letter,
        .bay-stats-inline.carrier-small .op-swatch { font-size: 6.5pt; width: 8px; height: 8px; }
        .bay-stats-inline.carrier-small .stats-podfull { display: none; }
        .bay-stats-inline.carrier-tiny  .stats-line { font-size: 5.2pt; line-height: 1.1; }
        .bay-stats-inline.carrier-tiny  .stats-letter,
        .bay-stats-inline.carrier-tiny  .op-swatch { font-size: 5.5pt; width: 7px; height: 7px; }
        .bay-stats-inline.carrier-tiny  .stats-podfull { display: none; }
        .bay-stats-inline.carrier-tiny  .stats-detail { display: none; }
        /* M5.31: cargo-footer를 페이지 좌하단 absolute로 (별첨 페이지 추가 방지) */
        .cargo-footer {
          position: absolute;
          bottom: 8px;
          left: 16px;
          max-width: 220px;
        }
        .cargo-footer .legend-box {
          min-width: 200px;
          border-top: 0.5px solid #000;
          padding-top: 4px;
          background: white;
        }
        @media print {
          .cargo-footer { position: absolute; bottom: 8px; left: 16px; }
        }

        /* M6.82 [C]: 페이지 2 — Special Cargo Stowage 양식 */
        .special-page {
          page-break-before: always;
          padding: 12px 16px;
        }
        .special-page .cargo-title { color: #b91c1c; }  /* 빨강 — 특수화물 강조 */
        .special-summary {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 6px 0; margin-bottom: 6px;
          border-bottom: 1px solid #999;
        }
        .sc-pill {
          display: inline-block;
          padding: 3px 10px;
          font-size: 9pt; font-weight: 700;
          border: 1px solid #555; border-radius: 4px;
        }
        .sc-pill.sc-reefer { background: #cffafe; color: #0e7490; border-color: #06b6d4; }
        .sc-pill.sc-dg     { background: #fee2e2; color: #b91c1c; border-color: #dc2626; }
        .sc-pill.sc-fr     { background: #f3e8ff; color: #6b21a8; border-color: #9333ea; }
        .sc-pill.sc-tank   { background: #ffedd5; color: #c2410c; border-color: #ea580c; }
        .sc-pill.sc-ot     { background: #fae8ff; color: #86198f; border-color: #c026d3; }
        .special-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-top: 4px;
        }
        .special-table th, .special-table td {
          border: 0.5px solid #555;
          padding: 3px 5px;
          text-align: left;
          line-height: 1.2;
        }
        .special-table th {
          background: #f3f4f6;
          font-weight: 700;
          text-align: center;
          font-size: 8.5pt;
        }
        .special-table td { vertical-align: middle; }
        .special-table .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
        .special-table .cn-cell  { font-family: 'Courier New', monospace; font-weight: 600; }
        .special-table .seal-cell{ font-family: 'Courier New', monospace; font-size: 8pt; }
        .special-table .extra-cell { font-weight: 600; }
        /* 종류별 행 배경 — 카고플랜 1페이지 셀 색과 일관성 */
        .special-table tr.sc-row-reefer { background: #ecfeff; }
        .special-table tr.sc-row-dg     { background: #fef2f2; }
        .special-table tr.sc-row-fr     { background: #faf5ff; }
        .special-table tr.sc-row-tank   { background: #fff7ed; }
        .special-table tr.sc-row-ot     { background: #fdf4ff; }
        .special-table tr.sc-row-dg td:nth-child(10) { font-weight: 700; color: #b91c1c; }
        .special-table tr.sc-row-reefer td:nth-child(10) { font-weight: 700; color: #0e7490; }
        .special-footnote {
          margin-top: 8px;
          padding-top: 4px;
          font-size: 8pt; color: #555;
          border-top: 0.5px dashed #ccc;
          text-align: right;
        }
        @media print {
          .special-page { page-break-before: always !important; }
          @page { size: A4 landscape; margin: 0.5cm; }
        }
        /* M6.86.5: 별첨 페이지(.appendix-page) CSS 제거 — A4 한 장 유지를 위해 별첨 JSX 자체 삭제됨. 선사/POD 통계는 좌측 하단 mini-legend(.bay-stats-inline)에 통합. */
      `}</style>
    </div>
  );
}
