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

const STD_ROWS = ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
const STD_DECK = ['90', '88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

const isPtk = (c, mode) => {
  const t = ((mode === 'discharge' ? c.pod : c.pol) || '').toUpperCase();
  return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
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
  const baseLetter = ptk ? (mode === 'discharge' ? 'o' : 'L') : 'X';

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

  // 엠티 표기 (특수화물 아닌 일반 엠티)
  if (!type && c.fe === 'E' && ptk) {
    letter = 'E';
  }

  // X-RAY (평택 양하만)
  const isXray = mode === 'discharge' && ptk && xrayMap && xrayMap[c.cn];

  return { letter, type, isXray };
}

function BayBox({ even, odd, containers, mode, dictBay, xrayMap, globalRowRange, globalTiers, dictShipMeta }) {
  const allConts = [
    ...(even != null && containers[String(even)] || []),
    ...(odd != null && containers[String(odd)] || []),
  ];

  const cellMap = {};
  allConts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row).padStart(2, '0');
    cellMap[`${t}-${r}`] = c;
  });

  // M5.47: row를 베이사전 Local + 실제 컨테이너 row union으로
  //   베이사전 값이 작아도 실제 컨테이너가 더 크면 확장 → row 부족 방지
  const dynRows = (() => {
    const dictMaxEven = dictBay?.rowMaxEvenLocal ?? dictShipMeta?.rowMaxEven ?? globalRowRange?.maxLeft;
    const dictMaxOdd = dictBay?.rowMaxOddLocal ?? dictShipMeta?.rowMaxOdd ?? globalRowRange?.maxRight;
    
    // 실제 컨테이너의 최대 row (짝수/홀수)
    let actualMaxEven = 0, actualMaxOdd = 0;
    allConts.forEach(c => {
      const r = parseInt(c.row);
      if (!isNaN(r) && r > 0) {
        if (r % 2 === 0 && r > actualMaxEven) actualMaxEven = r;
        if (r % 2 === 1 && r > actualMaxOdd) actualMaxOdd = r;
      }
    });
    
    // union — 베이사전 + 실제 데이터 중 큰 값
    const maxEven = Math.max(dictMaxEven || 0, actualMaxEven);
    const maxOdd = Math.max(dictMaxOdd || 0, actualMaxOdd);
    
    if (maxEven || maxOdd) {
      const left = [], right = [];
      for (let r = maxEven; r >= 2; r -= 2) left.push(String(r).padStart(2, '0'));
      left.push('00');
      for (let r = 1; r <= maxOdd; r += 2) right.push(String(r).padStart(2, '0'));
      return [...left, ...right];
    }
    return ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
  })();

  // M5.97: 베이별 정확한 tier만 그림 (사용 안 하는 tier 줄 완전히 없앰)
  //   사용자 확정: "전체를 없애는게 아니고 80이 없는곳만 없애야함"
  //   - dictBay.deckTiers/holdTiers (베이사전 베이별) 우선
  //   - 없으면 dictShipMeta.deckTiers/holdTiers (선박 전역) fallback
  //   외곽 통일 X, 점선 위치 베이별 다름 (정상)
  const deckTiers = (() => {
    if (dictBay?.deckTiers && Array.isArray(dictBay.deckTiers) && dictBay.deckTiers.length > 0) {
      return dictBay.deckTiers.map(t => String(t).padStart(2, '0'));
    }
    // Fallback: 선박 전역
    if (dictShipMeta?.deckTiers && dictShipMeta.deckTiers.length > 0) {
      return dictShipMeta.deckTiers.map(t => String(t).padStart(2, '0'));
    }
    const src = globalTiers && globalTiers.length > 0
      ? globalTiers.map(t => String(t).padStart(2, '0'))
      : [];
    const deck = src.filter(t => parseInt(t) >= 80);
    if (deck.length > 0) {
      const nums = deck.map(t => parseInt(t));
      const min = Math.min(...nums), max = Math.max(...nums);
      const out = [];
      for (let t = max; t >= min; t -= 2) out.push(String(t).padStart(2, '0'));
      return out;
    }
    return ['92', '90', '88', '86', '84', '82', '80'];
  })();

  const holdTiers = (() => {
    if (dictBay?.holdTiers && Array.isArray(dictBay.holdTiers)) {
      // 빈 배열도 의미 있음 (hold 없음 = BAY 33 등)
      return dictBay.holdTiers.map(t => String(t).padStart(2, '0'));
    }
    if (dictShipMeta?.holdTiers && dictShipMeta.holdTiers.length > 0) {
      return dictShipMeta.holdTiers.map(t => String(t).padStart(2, '0'));
    }
    const src = globalTiers && globalTiers.length > 0
      ? globalTiers.map(t => String(t).padStart(2, '0'))
      : [];
    const hold = src.filter(t => parseInt(t) < 80);
    if (hold.length > 0) {
      const nums = hold.map(t => parseInt(t));
      const min = Math.min(...nums), max = Math.max(...nums);
      const out = [];
      for (let t = max; t >= min; t -= 2) out.push(String(t).padStart(2, '0'));
      return out;
    }
    return ['08', '06', '04', '02'];
  })();

  // M5.97: bayDeckTiersUsed/HoldTiersUsed는 더 이상 필요 없음 (deckTiers 자체가 베이별)
  //   visibility:hidden 로직 제거 — 사용 안 하는 tier는 아예 그리지 않음
  const bayDeckTiersUsed = useMemo(() => new Set(deckTiers), [deckTiers]);
  const bayHoldTiersUsed = useMemo(() => new Set(holdTiers), [holdTiers]);

  // M5.98: extraTier — 점선 위치에 그릴 베이별 특수 tier
  //   사용자 요구: NBTD BAY 33의 80을 다른 베이의 점선 위치 (deck 끝 다음 한 줄)에 그림
  //   격자 외곽은 통일 (deck 6 + hold 4), BAY 33의 80은 점선 자리에 셀
  const extraTier = dictBay?.extraTier || null;

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
    <div className="bay-box">
      <div className="bay-title-row">
        <span className="bay-title-label">{title}</span>
        <span className="bay-count">{countStr}</span>
      </div>
      <div className="bay-row-labels">
        {dynRows.map(r => <span key={r} className="bay-row-label">{r}</span>)}
      </div>
      <div className="bay-grid-wrap">
        <div className="bay-grid">
          {hasDeck && deckTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {dynRows.map(r => {
                const c = cellMap[`${t}-${r}`];
                if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                const m = getMark(c, mode, xrayMap);
                const cls = `bay-cell mark-${m.letter} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                return <span key={r} className={cls}>{m.letter}</span>;
              })}
            </div>
          ))}
          {/* M5.98: 점선/extraTier 영역 — 베이별 extraTier 있으면 그 셀, 없으면 점선
              사용자 요구: NBTD의 BAY 33 등에서 80을 다른 베이의 점선 위치에 그리기 */}
          {hasDeck && hasHold && (
            extraTier ? (
              <div className="bay-grid-row extra-tier-row">
                {dynRows.map(r => {
                  const tierStr = String(extraTier).padStart(2, '0');
                  const c = cellMap[`${tierStr}-${r}`];
                  if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                  const m = getMark(c, mode, xrayMap);
                  const cls = `bay-cell mark-${m.letter} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                  return <span key={r} className={cls}>{m.letter}</span>;
                })}
              </div>
            ) : <div className="hatch-break"></div>
          )}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {dynRows.map(r => {
                const c = cellMap[`${t}-${r}`];
                if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                const m = getMark(c, mode, xrayMap);
                const cls = `bay-cell mark-${m.letter} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                return <span key={r} className={cls}>{m.letter}</span>;
              })}
            </div>
          ))}
        </div>
        <div className="bay-tier-labels">
          {hasDeck && deckTiers.map(t => <span key={t}>{t}</span>)}
          {hasDeck && hasHold && (
            extraTier ? <span className="extra-tier-label">{extraTier}</span> : <span className="tier-gap"></span>
          )}
          {hasHold && holdTiers.map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
      <div className="bay-row-labels">
        {dynRows.map(r => <span key={r} className="bay-row-label">{r}</span>)}
      </div>
    </div>
  );
}

export default function PrintableCargoPlan({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, xrayMap = {}, 
  globalRowRange, globalTiers, onClose
}) {
  const bayMap = useMemo(() => groupByBay(containers), [containers]);

  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    return getShipBayDictData(shipImo, shipName);
  }, [shipImo, shipName]);

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
  // M4.9b: 항차 번호 - 양하/선적 분리 시 둘 다 표시
  const voyD = voyageInfo?.voy_d || '';
  const voyL = voyageInfo?.voy_l || '';
  const voyFallback = voyageInfo?.voy || voyageKey || '';
  let voy;
  if (voyD && voyL && voyD !== voyL) {
    voy = `양하 ${voyD} / 선적 ${voyL}`;
  } else {
    voy = voyD || voyL || voyFallback;
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
              <BayBox key={`fs-${i}`} even={null} odd={col.single.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} globalRowRange={globalRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} />
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
              <BayBox key={`fp-${i}`} even={col.pair.even} odd={col.pair.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} globalRowRange={globalRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} />
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
              <BayBox key={`as-${i}`} even={null} odd={col.single.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} globalRowRange={globalRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} />
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
                  {sortedPods.map(([pod, c]) => (
                    <div key={pod} className="stats-line">
                      {pod}: <b>{c.c20} / {c.c40} / {c.c45}</b>
                    </div>
                  ))}
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
                    <BayBox key={`ap-${i}`} even={col.pair.even} odd={col.pair.odd} containers={bayMap}
                      mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} globalRowRange={globalRowRange} globalTiers={globalTiers} dictShipMeta={dictShipMeta} />
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
          font-size: 6pt; padding: 0 1px;
          flex-shrink: 0;
        }
        .bay-row-label { flex: 1; text-align: center; font-size: 7pt; min-width: 0; }
        /* M5.37: 베이 그리드가 박스 안 빈 공간을 채움 (선박별 row/tier 다양) */
        .bay-grid-wrap {
          display: flex; align-items: flex-start; padding: 1px;
          justify-content: center;
          flex: none;
          min-height: 0;
        }
        /* M5.38: 그리드/셀/티어 레이블 동적 분배 (선박별 row/tier 수 다름) */
        /* M5.99: 줄당 height 고정 (베이별 셀 크기 통일) */
        .bay-grid { 
          display: flex; flex-direction: column; align-items: stretch;
          flex: none;
        }
        .bay-grid-row { 
          display: flex; 
          flex: none;
          height: 1.3em;
        }
        /* M5.96 → M5.97: 베이가 사용 안 하는 tier 행 — display:none으로 자리 자체 없앰 */
        .bay-grid-row.tier-hidden { display: none; }
        .bay-tier-labels span.tier-hidden { display: none; }
        .bay-cell {
          flex: 1;
          border: 0.3px solid #aaa;
          text-align: center;
          font-size: 6pt;
          line-height: 1;
          font-family: 'Courier New', monospace;
          min-width: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .mark-X { color: #000; }
        .mark-o { color: #d97706; font-weight: 500; }
        .mark-L { color: #c026d3; font-weight: 500; background: #fce7f3 !important; }
        .mark-empty { color: transparent; }
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
        .hatch-break {
          height: 2px; background: #000; margin: 1px 0; width: 100%;
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
        .tier-gap { flex: 0 0 2px !important; background: #000; margin: 1px 0; }
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
