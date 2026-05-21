// 카고 플랜 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323E.pdf / TNJP25323W.pdf 형식
// - 5컬럼 그리드 (FORE 위 / AFT 아래)
// - AFT 좌측 legend 박스
// - 베이 상단: 제목 + 카운트 (20'/40'/45')
// - 데크/홀드 5:5 비율 + 굵은 hatch break
// - row 라벨 상하단, tier 라벨 우측

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel, isReeferContainer, isoToLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';

const STD_ROWS = ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
const STD_DECK = ['90', '88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

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

function splitForeAft(bayList) {
  if (bayList.length === 0) return { fore: [], aft: [] };
  const baySet = new Set(bayList);
  const used = new Set();
  const groups = [];
  // 1) 트리오 [홀, 짝, 홀] 그룹화 — 표준 페어
  for (const n of bayList) {
    if (used.has(n) || n % 2 === 0) continue;
    if (baySet.has(n + 1) && baySet.has(n + 2)) {
      groups.push([n, n + 1, n + 2]);
      used.add(n); used.add(n + 1); used.add(n + 2);
    }
  }
  // 2) 남은 베이 (단독 홀수, 20ft 전용 짝수)
  for (const n of bayList) {
    if (!used.has(n)) { groups.push([n]); used.add(n); }
  }
  groups.sort((a, b) => a[0] - b[0]);
  // 3) 그룹 갯수의 중간으로 분할 — TNJP는 9그룹 → FORE 5 / AFT 4
  const mid = Math.ceil(groups.length / 2);
  return {
    fore: groups.slice(0, mid).flat().sort((a, b) => a - b),
    aft: groups.slice(mid).flat().sort((a, b) => a - b),
  };
}

function buildBayPages(bays) {
  const baySet = new Set(bays);
  const used = new Set();
  const singles = [];
  const pairs = [];
  for (const n of bays) {
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
  for (const n of bays) {
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
//   강화: { letter, type, isXray } — type별 셀 색상 + X-RAY 마커
//   type: 'reefer' / 'dg' / 'fr' / 'ot' / 'tk' / null (일반)
//   letter: 평택 양하 'o', 평택 선적 'L', 통과 'X'
//   특수: 리퍼='R', DG='D', FR='F', OT='A'(Awkward), TK='T' (PDF 표준 표기)
//   isXray: 평택 양하 X-RAY 대상 (true 시 셀에 별표 마커 추가)
function getMark(c, mode, xrayMap) {
  const ptk = isPtk(c, mode);
  // M6.65: 적재 mode에서 'L' 대신 POD 3자 약어 표시 (DLC, LYG, INC 등)
  //   LYG/DLC 같이 L로 시작하는 약어가 헷갈리는 것 방지
  //   KR/CN/VN 같은 2자 국가 코드 제거 후 3자 표기
  let baseLetter;
  let pod3 = null;  // M6.70k: POD 3자 약자 (셀 색상용, 글자는 'L'/'E' 그대로)
  if (ptk) {
    if (mode === 'discharge') {
      baseLetter = 'o';
    } else {
      baseLetter = 'L';
      // 적재 mode — POD 3자 (DLC, WEI 등) 색상용 정보
      if (c.pod) {
        const podUp = String(c.pod).toUpperCase();
        pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : null);
      }
    }
  } else {
    // 통과 (평택 미관여)
    if (mode === 'loading' && c.pod) {
      const podUp = String(c.pod).toUpperCase();
      baseLetter = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : 'X');
      pod3 = baseLetter !== 'X' ? baseLetter : null;
    } else {
      baseLetter = 'X';
    }
  }

  // 특수화물 분류 (BayPlan과 동일 우선순위: DG > 리퍼 > FR > TK > OT)
  const isReefer = isReeferContainer(c);
  let type = null;
  let letter = baseLetter;
  if (c.dg) {
    type = 'dg';
    letter = ptk ? 'D' : 'D';  // DG는 평택/통과 모두 D
  } else if (isReefer) {
    type = 'reefer';
    letter = c.fe === 'E' ? 'r' : 'R';  // 엠티 리퍼는 소문자
  } else if (c.fr) {
    type = 'fr';
    letter = 'F';
  } else if (c.tk) {
    type = 'tk';
    letter = 'T';
  } else if (c.ot || c.oog) {
    type = 'ot';
    letter = 'A';  // PDF 표준: A = Awkward
  }

  // 엠티 표기 — 양하 + 적재 모두 (사용자 양식: E 글자 + POD 색)
  if (!type && c.fe === 'E' && ptk) {
    letter = 'E';
  }

  // X-RAY (평택 양하만)
  const isXray = mode === 'discharge' && ptk && xrayMap && xrayMap[c.cn];

  return { letter, type, isXray, pod3 };
}

function BayBox({ even, odd, containers, pairMap, mode, dictBay, xrayMap, globalRowRange, globalTiers, dictShipMeta, dictBaysSummary = {}, podColorMap = {} }) {
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

  // M6.76 → M6.77: voyage 전체 globalRowRange 우선 + 빈 박스 fallback
  //   사용자 양식: 컨 없는 박스 (BAY 01)도 — voyage 전체 row 자리 셀 표시
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
  // voyage 전체 (globalRowRange) 우선 — 모든 박스 동일 양식
  //   globalRowRange.deck/hold 합산 + globalRowRange.maxLeft 둘 다 시도
  const voyageRangeUnified = (() => {
    if (globalRowRange) {
      const dLeft = globalRowRange.deck?.maxLeft || 0;
      const hLeft = globalRowRange.hold?.maxLeft || 0;
      const dRight = globalRowRange.deck?.maxRight || 0;
      const hRight = globalRowRange.hold?.maxRight || 0;
      const dHas00 = globalRowRange.deck?.has00 || false;
      const hHas00 = globalRowRange.hold?.has00 || false;
      return {
        maxLeft: Math.max(dLeft, hLeft, globalRowRange.maxLeft || 0),
        maxRight: Math.max(dRight, hRight, globalRowRange.maxRight || 0),
        has00: dHas00 || hHas00 || globalRowRange.has00 || false,
      };
    }
    // fallback — 박스 자체 (BAY 01 컨 없으면 빈)
    return {
      maxLeft: Math.max(boxRange.deck.maxLeft, boxRange.hold.maxLeft),
      maxRight: Math.max(boxRange.deck.maxRight, boxRange.hold.maxRight),
      has00: boxRange.deck.has00 || boxRange.hold.has00,
    };
  })();
  const unifiedRows = buildRows(voyageRangeUnified);
  const deckDynRows = unifiedRows;
  const holdDynRows = unifiedRows;
  const maxCols = Math.max(unifiedRows.length, 1);
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
  // M6.66: shadow40Conts의 tier도 포함 — 짝수 베이 40피트 컨이 인접 홀수 베이에 그림자 표시 시
  //   기존: shadow40Conts가 cellMap에만 추가되어 allTiersSet 미포함 → hold tier 자리 없음 → 그림자 X 안 보임
  //   사용자 사례: BAY 23 (홀수 단독)에서 BAY 24의 40피트 hold 08 컨테이너 → BAY 23 hold 08 자리 + X 표시
  const allTierSources = [
    ...allConts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN'),
    ...shadow40Conts.map(c => String(c.tier).padStart(2, '0')).filter(t => t !== 'NaN'),
  ];
  const allTiersSet = hasDictTiers
    ? Array.from(new Set([
        ...pageBayDictTiers.deck,
        ...pageBayDictTiers.hold,
        ...allTierSources
      ]))
    : Array.from(new Set([
        ...(Array.isArray(globalTiers) ? globalTiers.map(t => String(t).padStart(2, '0')) : []),
        ...allTierSources
      ]));
  const deckTiersAll = allTiersSet.filter(t => parseInt(t) >= 80).sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = allTiersSet.filter(t => parseInt(t) < 80).sort((a, b) => parseInt(b) - parseInt(a));
  // M6.63: extraTier(예: 80)가 deckTiers에 이미 있으면 제외 — extra-tier-row로 별도 그려져 중복 방지
  //   BAY (34)35의 EDI 컨테이너가 tier=80이면 allConts에 80 추가됨 → deckTiers에 80 들어감
  //   동시에 extraTier=80이라 또 그려짐 → 80 두 번 표시되는 버그
  const extraTier = dictBay?.extraTier || null;
  const extraTierStr = extraTier ? String(extraTier).padStart(2, '0') : null;
  const deckTiers = extraTierStr ? deckTiersAll.filter(t => t !== extraTierStr) : deckTiersAll;

  // M6.54 → M6.66 → M6.67 → M6.70h → M6.70m: 박스별 사용 tier
  //   M6.70m: 페이지 전체 union으로 모든 박스 같은 행 수 → 정렬 일치 + 셀 크기 일관
  //     단점 - 빈 행 존재 → CSS visibility:hidden로 셀 자체 안 보임 (자리 차지)
  //     useMemo로 캐시해서 폰 먹통 방지
  const pageDeckUnion = useMemo(() => {
    const set = new Set();
    Object.values(dictBaysSummary).forEach(db => {
      if (!db) return;
      (db.deckTiersLocal || db.deckTiers || []).forEach(t => set.add(String(t).padStart(2, '0')));
    });
    return set;
  }, [dictBaysSummary]);

  const pageHoldUnion = useMemo(() => {
    const set = new Set();
    Object.values(dictBaysSummary).forEach(db => {
      if (!db) return;
      (db.holdTiersLocal || db.holdTiers || []).forEach(t => set.add(String(t).padStart(2, '0')));
    });
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

  const hasHold = dictBay ? dictBay.hasHold !== false : (allConts.some(c => parseInt(c.tier) < 80) || (!dictBay));
  const hasDeck = dictBay ? dictBay.hasDeck !== false : true;

  const cnt = { c20: 0, c40: 0, c45: 0 };
  allConts.forEach(c => {
    if (!isPtk(c, mode)) return;
    const sz = sizeOf(c);
    cnt[sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20']++;
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

  return (
    <div className="bay-box" style={{'--col-width': `${colWidthPct}%`}}>
      <div className="bay-title-row">
        <span className="bay-title-label">{title}</span>
        <span className="bay-count">{countStr}</span>
      </div>
      <div className="bay-row-labels deck-row-labels">
        {deckDynRows.map(r => <span key={r} className="bay-row-label">{r}</span>)}
      </div>
      <div className="bay-grid-wrap">
        <div className="bay-grid">
          {hasDeck && deckTiers.map(t => {
            const isUsed = bayDeckTiersUsed.has(t);
            return (
              <div key={t} className={`bay-grid-row deck-row ${!isUsed ? 'tier-hidden' : ''}`}>
                {deckDynRows.map(r => {
                  const c = cellMap[`${t}-${r}`];
                  if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                  if (c._shadow40) return <span key={r} className="bay-cell mark-shadow">X</span>;
                  const m = getMark(c, mode, xrayMap);
                  const cls = `bay-cell mark-${m.letter} ${m.letter.length > 1 ? 'mark-multi' : ''} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                  const podColor = m.pod3 && podColorMap[m.pod3];
                  return <span key={r} className={cls} style={podColor ? {color: podColor, fontWeight: 700} : undefined}>{m.letter}</span>;
                })}
              </div>
            );
          })}
          {hasDeck && (
            extraTier ? (
              <div className="bay-grid-row deck-row extra-tier-row">
                {deckDynRows.map(r => {
                  const tierStr = String(extraTier).padStart(2, '0');
                  const c = cellMap[`${tierStr}-${r}`];
                  if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                  if (c._shadow40) return <span key={r} className="bay-cell mark-shadow">X</span>;
                  const m = getMark(c, mode, xrayMap);
                  const cls = `bay-cell mark-${m.letter} ${m.letter.length > 1 ? 'mark-multi' : ''} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                  const podColor = m.pod3 && podColorMap[m.pod3];
                  return <span key={r} className={cls} style={podColor ? {color: podColor, fontWeight: 700} : undefined}>{m.letter}</span>;
                })}
              </div>
            ) : <div className="bay-grid-row hatch-break"></div>
          )}
          {hasHold && holdTiers.map(t => {
            const isUsed = bayHoldTiersUsed.has(t);
            return (
              <div key={t} className={`bay-grid-row hold-row ${!isUsed ? 'tier-hidden' : ''}`}>
                {holdDynRows.map(r => {
                  const c = cellMap[`${t}-${r}`];
                  if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                  if (c._shadow40) return <span key={r} className="bay-cell mark-shadow">X</span>;
                  const m = getMark(c, mode, xrayMap);
                  const cls = `bay-cell mark-${m.letter} ${m.letter.length > 1 ? 'mark-multi' : ''} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                  const podColor = m.pod3 && podColorMap[m.pod3];
                  return <span key={r} className={cls} style={podColor ? {color: podColor, fontWeight: 700} : undefined}>{m.letter}</span>;
                })}
              </div>
            );
          })}
        </div>
        <div className="bay-tier-labels">
          {hasDeck && deckTiers.map(t => <span key={t} className={!bayDeckTiersUsed.has(t) ? 'tier-hidden' : ''}>{t}</span>)}
          {hasDeck && (
            extraTier ? <span className="extra-tier-label">{extraTier}</span> : <span className="tier-gap"></span>
          )}
          {hasHold && holdTiers.map(t => <span key={t} className={!bayHoldTiersUsed.has(t) ? 'tier-hidden' : ''}>{t}</span>)}
        </div>
      </div>
      <div className="bay-row-labels hold-row-labels">
        {holdDynRows.map(r => <span key={r} className="bay-row-label">{r}</span>)}
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
    if (dictBayList && dictBayList.length > 0) return [...dictBayList].sort((a, b) => a - b);
    return Object.keys(bayMap).map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  }, [dictBayList, bayMap]);

  const { fore, aft } = useMemo(() => splitForeAft(bayList), [bayList]);
  const forePages = useMemo(() => buildBayPages(fore), [fore]);
  const aftPages = useMemo(() => buildBayPages(aft), [aft]);

  // M6.6: 짝수 베이 → 짝꿍 홀수 베이 맵 (shadow40 처리에서 사용)
  //   사용자 버그: BAY 43 단독 박스에서 BAY 44의 40피트가 X로 잘못 표시
  //   원인: BAY 44는 (44)45 짝꿍 → 43에 영향 X (45가 짝꿍이라 43은 빈)
  //   해결: buildBayPages가 결정한 짝꿍 관계 그대로 사용
  const pairMap = useMemo(() => {
    const map = {};  // evenBay (number) → pairOdd (number or null)
    [...forePages.pairs, ...aftPages.pairs].forEach(p => {
      map[p.even] = p.odd;
    });
    return map;
  }, [forePages, aftPages]);

  // M6.70k: POD 3자 약자별 색상 매핑 (등장 순서대로 8색 순환)
  //   카고플랜 셀에 색 표시 → 한눈에 POD 구분 + 범례로 풀네임 매핑
  const POD_PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const podColorMap = useMemo(() => {
    if (mode !== 'loading') return {};
    const pods = new Set();
    containers.forEach(c => {
      if (!isPtk(c, mode)) return;  // 평택 출발만
      if (c.pod) {
        const podUp = String(c.pod).toUpperCase();
        const pod3 = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : null);
        if (pod3 && pod3 !== 'PTK') pods.add(pod3);
      }
    });
    const map = {};
    Array.from(pods).sort().forEach((p, i) => {
      map[p] = POD_PALETTE[i % POD_PALETTE.length];
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

  // M5.33: 컬럼 매칭 (단독 N의 컬럼 아래 = 짝꿍 (N+1)/(N+2) 또는 빈)
  const foreColumns = matchColumns(forePages.singles, forePages.pairs).slice(0, 5);
  const aftColumns = matchColumns(aftPages.singles, aftPages.pairs).slice(0, 5);

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

          {/* M5.33: 컬럼 매칭 — 단독 행과 짝꿍 행이 같은 컬럼 인덱스 (베이 그룹별) */}
          {/* FORE 단독 행 */}
          <div className="bay-row five-col">
            {Array.from({ length: 5 - foreColumns.length }).map((_, i) =>
              <div key={`fse-${i}`} className="bay-box-placeholder"></div>
            )}
            {foreColumns.map((col, i) => col.single ? (
              <BayBox key={`fs-${i}`} even={null} odd={col.single.bay} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap}
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} globalRowRange={effectiveRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
            ) : (
              <div key={`fs-${i}`} className="bay-box-placeholder"></div>
            ))}
          </div>
          {/* FORE 짝꿍 행 */}
          <div className="bay-row five-col">
            {Array.from({ length: 5 - foreColumns.length }).map((_, i) =>
              <div key={`fpe-${i}`} className="bay-box-placeholder"></div>
            )}
            {foreColumns.map((col, i) => col.pair ? (
              <BayBox key={`fp-${i}`} even={col.pair.even} odd={col.pair.odd} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap}
                mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} globalRowRange={effectiveRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
            ) : (
              <div key={`fp-${i}`} className="bay-box-placeholder"></div>
            ))}
          </div>

          {/* AFT 단독 행 */}
          <div className="bay-row five-col">
            {Array.from({ length: 5 - aftColumns.length }).map((_, i) =>
              <div key={`ase-${i}`} className="bay-box-placeholder"></div>
            )}
            {aftColumns.map((col, i) => col.single ? (
              <BayBox key={`as-${i}`} even={null} odd={col.single.bay} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap}
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} globalRowRange={effectiveRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
            ) : (
              <div key={`as-${i}`} className="bay-box-placeholder"></div>
            ))}
          </div>

          {/* AFT 짝꿍 행 + 통계 박스 (좌측 끝 또는 pair null 자리) */}
          <div className="bay-row five-col">
            {/* M5.34: 통계 박스 위치 결정 — 짝꿍 행에 빈 자리(pair=null) 또는 placeholder 자리 */}
            {/* 외부 placeholder가 있는 경우 (aftColumns < 5) 좌측 끝에 / 없는 경우 첫 pair=null 자리에 */}
            {(() => {
              const hasOuterPlaceholder = aftColumns.length < 5;
              const firstEmptyPairIdx = hasOuterPlaceholder ? -1 : aftColumns.findIndex(c => !c.pair);
              const totalAll = totalCounts.total.c20 + totalCounts.total.c40 + totalCounts.total.c45;
              const sortedPods = Object.entries(totalCounts.byPod)
                .sort((a, b) => {
                  const ta = a[1].c20 + a[1].c40 + a[1].c45;
                  const tb = b[1].c20 + b[1].c40 + b[1].c45;
                  return tb - ta;  // 많은 순
                });
              // M5.94: 사이즈+타입별 카테고리 (값 0 아닌 것만 표시)
              const cats = totalCounts.byCategory || {};
              const cat20 = ['20DC', '20HC', '20RF', '20FR', '20OT', '20TK'].filter(k => cats[k] > 0);
              const cat40 = ['40DC', '40HC', '40RF', '40FR', '40OT', '40TK'].filter(k => cats[k] > 0);
              const cat45 = ['45HC', '45DC'].filter(k => cats[k] > 0);
              const statsBox = (
                <div className="bay-stats-inline" key="stats">
                  <div className="stats-title">20'/40'/45'</div>
                  {sortedPods.map(([pod, c]) => {
                    const podColor = podColorMap[pod];
                    return (
                      <div key={pod} className="stats-line">
                        <span style={podColor ? {color: podColor, fontWeight: 700} : undefined}>{pod}</span>: <b>{c.c20} / {c.c40} / {c.c45}</b>
                      </div>
                    );
                  })}
                  <div className="stats-total">총 {totalAll}대</div>
                  {/* M5.94: 사이즈+타입별 상세 (원본 STOWAGE PLAN 양식) */}
                  {(cat20.length > 0 || cat40.length > 0 || cat45.length > 0) && (
                    <div className="stats-detail">
                      {cat20.length > 0 && (
                        <div className="stats-detail-line">
                          {cat20.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}
                        </div>
                      )}
                      {cat40.length > 0 && (
                        <div className="stats-detail-line">
                          {cat40.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}
                        </div>
                      )}
                      {cat45.length > 0 && (
                        <div className="stats-detail-line">
                          {cat45.map(k => <span key={k}>{k.slice(2)} <b>{cats[k]}</b></span>)}
                        </div>
                      )}
                    </div>
                  )}
                  {/* M5.94: 통과 화물 카운트 (있는 경우만) */}
                  {totalCounts.transitTotal > 0 && (
                    <div className="stats-transit">통과 {totalCounts.transitTotal}대 / 전체 {totalCounts.grandTotal}대</div>
                  )}
                  {/* M5.94: 컨테이너 기호 레전드 (페이지 하단보다 통계 박스 안에 컴팩트하게) */}
                  <div className="stats-legend">
                    <span>o {mode === 'discharge' ? '양하' : '적재'}</span>
                    <span>X 통과</span>
                    <span>F FR</span>
                    <span>D DG</span>
                    <span>A AWK</span>
                    <span>G OOG</span>
                  </div>
                  {/* M6.70k: 적재 mode POD 색 + 풀네임 범례 */}
                  {mode === 'loading' && (() => {
                    const podMap = {
                      'KRPTK': '평택', 'KRPYT': '평택신항', 'KRINC': '인천',
                      'KRPUS': '부산', 'KRKAN': '광양', 'KRMSN': '마산',
                      'CNDLC': '다롄', 'CNLYG': '연운항', 'CNXMN': '샤먼',
                      'CNSHK': '산터우', 'CNSHA': '상하이', 'CNTAO': '칭다오',
                      'CNTSN': '톈진', 'CNNGB': '닝보', 'CNXGG': '신강',
                      'CNWEI': '웨이하이', 'CNYTN': '옌톈',
                      'JPTYO': '도쿄', 'JPOSA': '오사카', 'JPNGO': '나고야',
                      'JPYOK': '요코하마', 'JPKBE': '고베', 'JPHKT': '하카타',
                      'VNHPH': '하이퐁', 'VNSGN': '호치민', 'VNDAD': '다낭',
                      'HKHKG': '홍콩', 'TWKEL': '지룽', 'TWKHH': '카오슝',
                      'THLCH': '램차방', 'THBKK': '방콕', 'SGSIN': '싱가포르',
                      'PHMNL': '마닐라', 'MYPKG': '포트클랑',
                    };
                    // 페이지에 등장하는 POD (podColorMap의 key와 일치)
                    const fullByShort = {};
                    Object.values(bayMap).forEach(arr => arr.forEach(c => {
                      if (!c.pod || !isPtk(c, mode)) return;
                      const podUp = String(c.pod).toUpperCase();
                      if (podUp.length < 3) return;
                      const short = podUp.length >= 5 ? podUp.slice(2) : (podUp.length === 3 ? podUp : null);
                      if (short && short !== 'PTK') fullByShort[short] = podUp;
                    }));
                    const podList = Object.keys(podColorMap).sort();
                    if (podList.length === 0) return null;
                    return (
                      <div className="stats-pods">
                        <span style={{fontWeight: 600, marginRight: '4px'}}>목적지:</span>
                        {podList.map(short => {
                          const full = fullByShort[short] || short;
                          const kr = podMap[full] || short;
                          const color = podColorMap[short];
                          return (
                            <span key={short} style={{display: 'inline-block', marginRight: '6px'}}>
                              <span style={{color, fontWeight: 700}}>{short}</span>={kr}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
              const out = [];
              // 외부 placeholder (aftColumns가 5보다 적을 때)
              if (hasOuterPlaceholder) {
                out.push(statsBox);
                for (let i = 0; i < Math.max(0, 5 - aftColumns.length - 1); i++) {
                  out.push(<div key={`ape-${i}`} className="bay-box-placeholder"></div>);
                }
              }
              // 각 컬럼 (pair 또는 빈)
              aftColumns.forEach((col, i) => {
                if (col.pair) {
                  out.push(
                    <BayBox key={`ap-${i}`} even={col.pair.even} odd={col.pair.odd} containers={bayMap} pairMap={pairMap} podColorMap={podColorMap}
                      mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} globalRowRange={effectiveRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} dictBaysSummary={dictBaysSummary} />
                  );
                } else if (i === firstEmptyPairIdx) {
                  // 첫 번째 pair=null 자리에 통계 박스
                  out.push(<React.Fragment key={`ap-${i}`}>{statsBox}</React.Fragment>);
                } else {
                  out.push(<div key={`ap-${i}`} className="bay-box-placeholder"></div>);
                }
              });
              return out;
            })()}
          </div>

          {/* M5.32: cargo-footer 영역 제거 — 통계는 마지막 짝꿍 행 좌측에 인라인 / 범례 제거 */}
        </div>
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
        /* M5.37: 4행이 헤더 외 가용 세로를 자동 균등 분할 (선박별 베이 수와 무관) */
        .bay-row { 
          display: grid; gap: 2px; margin-bottom: 2px; 
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }
        .five-col { grid-template-columns: repeat(5, 1fr); }
        .bay-box {
          border: 0.5px solid #000; background: white;
          font-size: 9pt;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }
        .bay-box-placeholder {
          visibility: hidden;
          height: 100%;
        }
        .bay-title-row {
          display: flex; justify-content: space-between;
          padding: 1px 3px; font-size: 8pt;
          flex-shrink: 0;
        }
        .bay-title-label { font-weight: 500; }
        .bay-count { font-size: 7pt; }
        .bay-row-labels {
          display: flex; justify-content: center;
          font-size: 5pt; padding: 0 1px;
          flex-shrink: 0;
        }
        /* M6.49: row 라벨 폰트 축소 (7pt→5pt) — 큰 선박 27 row까지 겹침 해소 */
        /* M6.73: 셀 너비 고정 + 가운데 정렬 — deck 8칸/hold 7칸 좌우 대칭 (카스피 양식) */
        .bay-row-label { flex: 0 0 var(--col-width, 12.5%); text-align: center; font-size: 5pt; min-width: 0; letter-spacing: -0.3px; line-height: 1; }
        /* M5.37: 베이 그리드가 박스 안 빈 공간을 채움 (선박별 row/tier 다양) */
        .bay-grid-wrap {
          display: flex; align-items: stretch; padding: 1px;
          justify-content: center;
          flex: 1;
          min-height: 0;
        }
        /* M5.38: 그리드/셀/티어 레이블 동적 분배 (선박별 row/tier 수 다름) */
        /* M6.0: V5 양식 복원 (M5.99의 height:1.3em 잘못 → flex:1, min-height:0) */
        .bay-grid { 
          display: flex; flex-direction: column; align-items: stretch;
          flex: 1; min-width: 0; min-height: 0;
        }
        /* M6.73: deck/hold row 가운데 정렬 — column 수 다를 때 좌우 대칭 */
        .bay-grid-row { 
          display: flex; flex: 1; min-height: 0;
          justify-content: center;
        }
        /* M6.0: 사용 안 하는 tier 행 → 자리 차지하되 안 보임 (V5 양식)
           M6.60: visibility:hidden → opacity:0
           이유: Chrome PDF 인쇄에서 flex:1 + visibility:hidden 자식이 자리를 collapse하는 케이스 발견
                 (PCBJ BAY 15 deck 부분이 박스에 자리 차지 못 함)
                 opacity:0은 자리 100% 보장 + 자식 ::after까지 모두 투명 */
        .bay-grid-row.tier-hidden { visibility: hidden; }
        .bay-tier-labels span.tier-hidden { visibility: hidden; }
        .bay-cell {
          flex: 0 0 var(--col-width, 12.5%);
          border: 0.5px solid #999;
          text-align: center;
          font-size: 6pt;
          line-height: 1;
          font-family: 'Courier New', monospace;
          min-width: 0; min-height: 0;
          display: flex; align-items: center; justify-content: center;
        }
        /* M6.65: 3자 POD 약어 (DLC, LYG, PTK 등) 셀에 들어가도록 폰트 축소 */
        .bay-cell.mark-multi { font-size: 3.8pt; font-weight: 600; letter-spacing: -0.3px; }
        .mark-X { color: #000; }
        /* M6.1: 짝수 베이 40피트의 짝꿍 자리 X (단독 박스에서, 다른 컨테이너 적재 불가) */
        .mark-shadow { color: #999; font-style: italic; background: #f0f0f0; }
        .mark-o { color: #d97706; font-weight: 500; }
        .mark-L { color: #c026d3; font-weight: 500; background: #fce7f3 !important; }
        /* M6.58→M6.60: 빈 셀 시각화 - 사용자 요청 "빈 셀로 남겨놔야 함"
           이전 .mark-empty { color: transparent }는 0.3px border만 남아 화면에서 사실상 안 보임.
           M6.58: ::after에 position:absolute로 점 추가 → PDF 인쇄 시 점들이 페이지 하단으로 흘러나오는 버그 발생
           M6.60: position 제거. .bay-cell이 이미 flex+center 정렬이라 ::after가 셀 안에 자연스럽게 가운데 배치 */
        .mark-empty { color: transparent; }
        .mark-empty::after {
          content: '·';
          color: #d1d5db;
          font-size: 8pt;
          line-height: 1;
        }
        /* M5.16: 특수화물 추가 mark */
        .mark-E { color: #6b7280; font-weight: 500; }  /* 엠티 */
        .mark-R { color: #0891b2; font-weight: 700; }  /* 풀 리퍼 */
        .mark-r { color: #67e8f9; font-weight: 500; }  /* 엠티 리퍼 */
        .mark-D { color: #dc2626; font-weight: 700; }  /* DG */
        .mark-F { color: #9333ea; font-weight: 700; }  /* FR */
        .mark-T { color: #ea580c; font-weight: 700; }  /* TK */
        .mark-A { color: #c026d3; font-weight: 700; }  /* OT (Awkward) */

        /* M5.16: type별 셀 배경 (특수화물 강조) */
        .bay-cell.type-reefer { background: #cffafe !important; }  /* 연시안 */
        .bay-cell.type-dg     { background: #fee2e2 !important; }  /* 연빨강 */
        .bay-cell.type-fr     { background: #f3e8ff !important; }  /* 연보라 */
        .bay-cell.type-tk     { background: #ffedd5 !important; }  /* 연주황 */
        .bay-cell.type-ot     { background: #fae8ff !important; }  /* 연마젠타 */

        /* M5.16: X-RAY 마커 (셀 우상단 빨간 점) */
        .bay-cell.xray {
          position: relative;
          background: #fef08a !important;  /* 연노랑 (X-RAY 표시) */
          color: #b91c1c !important;
          font-weight: 700 !important;
        }
        .bay-cell.xray::after {
          content: '★';
          position: absolute;
          top: -2px; right: 0px;
          font-size: 6pt; line-height: 6pt;
          color: #dc2626;
        }
        /* M6.0: hatch-break는 bay-grid-row 클래스와 함께 사용. 한 줄 height 차지 (외곽 정렬) */
        .hatch-break {
          background: repeating-linear-gradient(90deg, #555 0, #555 4px, transparent 4px, transparent 8px) center / 100% 2px no-repeat;
        }
        /* M6.0: extra-tier-label은 점선 자리 라벨 (다른 tier 라벨과 같은 height) */
        .extra-tier-label {
          color: #dc2626; font-weight: 600;
        }
        .bay-tier-labels {
          display: flex; flex-direction: column;
          font-size: 6pt; padding-left: 2px;
          flex-shrink: 0;
        }
        /* M5.38: 티어 레이블 span 각각 flex:1 → 셀 높이와 동기화 */
        .bay-tier-labels span { 
          flex: 1; display: flex; align-items: center;
          font-size: 6pt; min-height: 0;
        }
        /* M6.0: tier-gap도 라벨 한 줄 자리 (점선 자리와 같은 height) */
        .tier-gap { flex: 1; min-height: 0; }
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
        /* M6.65: 목적지 약어 풀네임 표 (적재 mode) */
        .bay-stats-inline .stats-pods {
          margin-top: 2px;
          padding-top: 2px;
          font-size: 5.5pt;
          line-height: 1.3;
          color: #444;
          border-top: 0.5px dotted #ccc;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
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
      `}</style>
    </div>
  );
}
