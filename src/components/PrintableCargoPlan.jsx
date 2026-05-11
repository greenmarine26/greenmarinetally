// 카고 플랜 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323E.pdf / TNJP25323W.pdf 형식
// - 5컬럼 그리드 (FORE 위 / AFT 아래)
// - AFT 좌측 legend 박스
// - 베이 상단: 제목 + 카운트 (20'/40'/45')
// - 데크/홀드 5:5 비율 + 굵은 hatch break
// - row 라벨 상하단, tier 라벨 우측

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel, isReeferContainer } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';

const STD_ROWS = ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
const STD_DECK = ['90', '88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

const isPtk = (c, mode) => {
  const t = ((mode === 'discharge' ? c.pod : c.pol) || '').toUpperCase();
  return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
};

const sizeOf = (c) => {
  const lbl = (isoToPdfLabel(c.iso) || '').toUpperCase();
  if (lbl.includes('45')) return '45';
  if (lbl.includes('40')) return '40';
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

function BayBox({ even, odd, containers, mode, dictBay, xrayMap }) {
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

  const allTiers = new Set();
  allConts.forEach(c => allTiers.add(String(c.tier).padStart(2, '0')));
  const deckTiers = [...new Set([...STD_DECK, ...[...allTiers].filter(t => parseInt(t) >= 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = [...new Set([...STD_HOLD, ...[...allTiers].filter(t => parseInt(t) < 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));

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
        {STD_ROWS.map(r => <span key={r} className="bay-row-label">{r}</span>)}
      </div>
      <div className="bay-grid-wrap">
        <div className="bay-grid">
          {hasDeck && deckTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {STD_ROWS.map(r => {
                const c = cellMap[`${t}-${r}`];
                if (!c) return <span key={r} className="bay-cell mark-empty"></span>;
                const m = getMark(c, mode, xrayMap);
                const cls = `bay-cell mark-${m.letter} ${m.type ? `type-${m.type}` : ''} ${m.isXray ? 'xray' : ''}`;
                return <span key={r} className={cls}>{m.letter}</span>;
              })}
            </div>
          ))}
          {hasDeck && hasHold && <div className="hatch-break"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {STD_ROWS.map(r => {
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
          {hasDeck && hasHold && <span className="tier-gap"></span>}
          {hasHold && holdTiers.map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
      <div className="bay-row-labels">
        {STD_ROWS.map(r => <span key={r} className="bay-row-label">{r}</span>)}
      </div>
    </div>
  );
}

export default function PrintableCargoPlan({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, xrayMap = {}, onClose
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

  const bayList = useMemo(() => {
    if (dictBayList && dictBayList.length > 0) return [...dictBayList].sort((a, b) => a - b);
    return Object.keys(bayMap).map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  }, [dictBayList, bayMap]);

  const { fore, aft } = useMemo(() => splitForeAft(bayList), [bayList]);
  const forePages = useMemo(() => buildBayPages(fore), [fore]);
  const aftPages = useMemo(() => buildBayPages(aft), [aft]);

  const totalCounts = useMemo(() => {
    const c = { c20: 0, c40: 0, c45: 0 };
    containers.forEach(ct => {
      if (!isPtk(ct, mode)) return;
      const sz = sizeOf(ct);
      c[sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20']++;
    });
    return c;
  }, [containers, mode]);

  const titleText = mode === 'discharge' ? 'CARGO DISCHARGING PLAN' : 'STOWAGE INSTRUCTION';
  const portText = mode === 'discharge' ? 'POD : PTK' : 'POL : PTK';
  const todayStr = new Date().toISOString().slice(0, 10);
  const vsl = voyageInfo?.vsl || shipName || 'VESSEL';
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
          <button onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-sm">
            🖨️ 인쇄 / PDF 저장
          </button>
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
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} />
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
                mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} />
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
                mode={mode} dictBay={dictBaysSummary[col.single.bay]} xrayMap={xrayMap} />
            ) : (
              <div key={`as-${i}`} className="bay-box-placeholder"></div>
            ))}
          </div>

          {/* AFT 짝꿍 행 + 통계 박스 (좌측 끝) */}
          <div className="bay-row five-col">
            {/* M5.32: 통계 박스 = 좌측 끝 (placeholder 자리 활용) */}
            {aftColumns.length < 5 && (
              <div className="bay-stats-inline">
                <div className="stats-title">20'/40'/45'</div>
                <div className="stats-line">
                  {mode === 'discharge' ? 'PTK' : 'LYG'}: <b>{totalCounts.c20} / {totalCounts.c40} / {totalCounts.c45}</b>
                </div>
                <div className="stats-total">총 {totalCounts.c20 + totalCounts.c40 + totalCounts.c45}대</div>
              </div>
            )}
            {Array.from({ length: Math.max(0, 5 - aftColumns.length - (aftColumns.length < 5 ? 1 : 0)) }).map((_, i) =>
              <div key={`ape-${i}`} className="bay-box-placeholder"></div>
            )}
            {aftColumns.map((col, i) => col.pair ? (
              <BayBox key={`ap-${i}`} even={col.pair.even} odd={col.pair.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[col.pair.even]} xrayMap={xrayMap} />
            ) : (
              <div key={`ap-${i}`} className="bay-box-placeholder"></div>
            ))}
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
          @page { size: A4 landscape; margin: 0.5cm; }
        }
        .cargo-plan-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          font-size: 10pt;
          padding: 12px 16px;
          margin: 0 auto;
          position: relative;  /* M5.31: footer absolute 기준 */
        }
        .cargo-header {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 6px;
        }
        .cargo-title { font-size: 18pt; font-weight: 500; }
        .cargo-subheader {
          display: flex; justify-content: center; gap: 80px;
          font-size: 12pt; margin-bottom: 14px;
        }
        /* M4.9b-fix: 행 그리드 — 좌측 기준 stretch 정렬 명시 */
        .bay-row { display: grid; gap: 4px; margin-bottom: 4px; align-items: stretch; }
        .five-col { grid-template-columns: repeat(5, 1fr); }
        /* M4.9b-fix: 모든 베이 박스 동일 min-height 통일.
           가용 세로 ~180mm = 약 680px 중 헤더~50px → 4행 × ~155px = 620px (가용 91%) */
        .bay-box {
          border: 0.5px solid #000; background: white;
          font-size: 9pt;
          page-break-inside: avoid;
          min-height: 150px;
          display: flex;
          flex-direction: column;
        }
        .bay-box-placeholder {
          min-height: 150px;
          visibility: hidden;
        }
        .bay-title-row {
          display: flex; justify-content: space-between;
          padding: 1px 3px; font-size: 8pt;
        }
        .bay-title-label { font-weight: 500; }
        .bay-count { font-size: 7pt; }
        .bay-row-labels {
          display: flex; justify-content: center;
          font-size: 6pt; padding: 0 1px;
        }
        .bay-row-label { width: 11px; text-align: center; font-size: 7pt; }
        .bay-grid-wrap {
          display: flex; align-items: stretch; padding: 1px;
          justify-content: center;
        }
        .bay-grid { display: flex; flex-direction: column; align-items: center; }
        .bay-grid-row { display: flex; }
        .bay-cell {
          width: 11px; height: 9px;
          border: 0.3px solid #aaa;
          text-align: center;
          font-size: 7pt; line-height: 9px;
          font-family: 'Courier New', monospace;
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
          font-size: 7pt; padding-left: 2px;
        }
        .bay-tier-labels span { height: 9px; line-height: 9px; font-size: 7pt; }
        .tier-gap { height: 3px !important; }
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
          padding: 4px 8px;
          font-size: 10pt;
          line-height: 1.5;
          border: 0.5px dashed #999;
          background: #fafafa;
        }
        .bay-stats-inline .stats-title { font-weight: bold; margin-bottom: 4px; font-size: 9pt; }
        .bay-stats-inline .stats-line { font-size: 9pt; }
        .bay-stats-inline .stats-total { 
          font-weight: bold; 
          margin-top: 4px; 
          padding-top: 3px;
          border-top: 0.5px solid #999;
          font-size: 9pt;
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
