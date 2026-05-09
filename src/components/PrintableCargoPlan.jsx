// 카고 플랜 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323E.pdf / TNJP25323W.pdf 형식
// - 5컬럼 그리드 (FORE 위 / AFT 아래)
// - AFT 좌측 legend 박스
// - 베이 상단: 제목 + 카운트 (20'/40'/45')
// - 데크/홀드 5:5 비율 + 굵은 hatch break
// - row 라벨 상하단, tier 라벨 우측

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel } from '../utils.js';
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

function getMark(c, mode) {
  if (isPtk(c, mode)) return mode === 'discharge' ? 'o' : 'L';
  return 'X';
}

function BayBox({ even, odd, containers, mode, dictBay }) {
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
                const m = c ? getMark(c, mode) : '';
                return <span key={r} className={`bay-cell mark-${m || 'empty'}`}>{m}</span>;
              })}
            </div>
          ))}
          {hasDeck && hasHold && <div className="hatch-break"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {STD_ROWS.map(r => {
                const c = cellMap[`${t}-${r}`];
                const m = c ? getMark(c, mode) : '';
                return <span key={r} className={`bay-cell mark-${m || 'empty'}`}>{m}</span>;
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
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, onClose
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

  // M4.9b: AFT 영역 5-col로 확장 (legend는 footer로)
  //   이전: AFT singles slice(0,4) + AFT pairs slice(0,4)에서 페어 행 5-col에 빈2+페어4=6슬롯이 들어가
  //         (22)23이 다음 행/페이지로 밀려나는 버그
  //   수정: AFT 영역을 5-col로 통일하여 5개까지 깔끔히 들어가게
  const foreSinglesByCol = forePages.singles.slice(0, 5);
  const forePairsByCol = forePages.pairs.slice(0, 5);
  const aftSinglesByCol = aftPages.singles.slice(0, 5);
  const aftPairsByCol = aftPages.pairs.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
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

          <div className="bay-row five-col">
            {foreSinglesByCol.map((p, i) => (
              <BayBox key={`fs-${i}`} even={null} odd={p.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.bay]} />
            ))}
            {Array.from({ length: 5 - foreSinglesByCol.length }).map((_, i) =>
              <div key={`fse-${i}`}></div>
            )}
          </div>
          <div className="bay-row five-col">
            {forePairsByCol.map((p, i) => (
              <BayBox key={`fp-${i}`} even={p.even} odd={p.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.even]} />
            ))}
            {Array.from({ length: 5 - forePairsByCol.length }).map((_, i) =>
              <div key={`fpe-${i}`}></div>
            )}
          </div>

          <div className="bay-row five-col">
            {aftSinglesByCol.map((p, i) => (
              <BayBox key={`as-${i}`} even={null} odd={p.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.bay]} />
            ))}
            {Array.from({ length: 5 - aftSinglesByCol.length }).map((_, i) =>
              <div key={`ase-${i}`}></div>
            )}
          </div>

          <div className="bay-row five-col">
            {aftPairsByCol.map((p, i) => (
              <BayBox key={`ap-${i}`} even={p.even} odd={p.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.even]} />
            ))}
            {Array.from({ length: 5 - aftPairsByCol.length }).map((_, i) =>
              <div key={`ape-${i}`}></div>
            )}
          </div>

          {/* M4.9b: legend를 footer로 분리 (페이지 좌하단) */}
          <div className="cargo-footer">
            <div className="legend-box">
              <div className="legend-title">20'/40'/45'</div>
              {mode === 'discharge' ? (
                <div className="legend-row">
                  <span className="legend-mark mark-o">o</span>
                  <span className="legend-label">PTK</span>
                  <span className="legend-count">{totalCounts.c20} / {totalCounts.c40} / {totalCounts.c45}</span>
                </div>
              ) : (
                <>
                  <div className="legend-row">
                    <span className="legend-mark mark-L">L</span>
                    <span className="legend-label">LYG</span>
                    <span className="legend-count">{totalCounts.c20} / {totalCounts.c40} / {totalCounts.c45}</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-mark legend-empty-mark">□</span>
                    <span className="legend-label">OPT</span>
                    <span className="legend-count">0 / 0 / 0</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-mark legend-empty-mark">□</span>
                    <span className="legend-label">TTL</span>
                    <span className="legend-count">{totalCounts.c20} / {totalCounts.c40} / {totalCounts.c45}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .cargo-plan-page { margin: 0 !important; padding: 0.4cm !important; }
          @page { size: A4 landscape; margin: 0.4cm; }
        }
        .cargo-plan-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          font-size: 9pt;
          padding: 12px 16px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .cargo-header {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 4px;
        }
        .cargo-title { font-size: 14pt; font-weight: 500; }
        .cargo-subheader {
          display: flex; justify-content: center; gap: 80px;
          font-size: 10pt; margin-bottom: 12px;
        }
        .bay-row { display: grid; gap: 4px; margin-bottom: 4px; }
        .five-col { grid-template-columns: repeat(5, 1fr); }
        .bay-box {
          border: 0.5px solid #000; background: white;
          font-size: 7pt;
          page-break-inside: avoid;
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
        .bay-row-label { width: 7px; text-align: center; font-size: 5pt; }
        .bay-grid-wrap {
          display: flex; align-items: stretch; padding: 1px;
          justify-content: center;
        }
        .bay-grid { display: flex; flex-direction: column; align-items: center; }
        .bay-grid-row { display: flex; }
        .bay-cell {
          width: 7px; height: 6px;
          border: 0.3px solid #aaa;
          text-align: center;
          font-size: 5pt; line-height: 6px;
          font-family: 'Courier New', monospace;
        }
        .mark-X { color: #000; }
        .mark-o { color: #d97706; font-weight: 500; }
        .mark-L { color: #c026d3; font-weight: 500; background: #fce7f3 !important; }
        .mark-empty { color: transparent; }
        .hatch-break {
          height: 2px; background: #000; margin: 1px 0; width: 100%;
        }
        .bay-tier-labels {
          display: flex; flex-direction: column;
          font-size: 6pt; padding-left: 2px;
        }
        .bay-tier-labels span { height: 6px; line-height: 6px; font-size: 5pt; }
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
        /* M4.9b: cargo-footer - legend를 페이지 하단 좌측에 배치 */
        .cargo-footer {
          margin-top: 6px;
          display: flex;
          justify-content: flex-start;
        }
        .cargo-footer .legend-box {
          min-width: 200px;
          border-top: 0.5px solid #000;
          padding-top: 4px;
        }
      `}</style>
    </div>
  );
}
