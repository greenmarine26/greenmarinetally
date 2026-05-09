// 카고 플랜 인쇄 (M4.8) — 샘플 PDF 1:1 재현 (PCSG2616W.pdf 기준)
//
// M4.8 변경:
//   - 5col → 4col 그리드 (PDF와 일치)
//   - 마크 = 카운터파트 항만 첫 글자 (D=DLC, W=WEI 등)
//     · PTK 화물: discharge 모드 'o', load 모드 'L'
//     · 외부 화물: load 모드 → c.pod 첫 글자, discharge 모드 → c.pol 첫 글자
//   - max-width 제거 (화면 100% width)
//   - Legend = row 4 마지막 칸 (우하단)
//   - AFT pairs ≤3개 가정 (4개 이상 시 자동 줄바꿈)
//   - Legend 항만 라벨 동적 (DLC/WEI 등 실 컨테이너 데이터 기반)

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

// M4.8: 카운터파트 항만 (load=POD, discharge=POL)의 정규화 코드 (3자, KR 접두 제거)
const counterpartPort = (c, mode) => {
  const raw = mode === 'discharge' ? c.pol : c.pod;
  if (!raw) return '';
  return String(raw).replace(/^KR/, '').slice(0, 3).toUpperCase();
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
  let bestGap = 0, splitPoint = bayList[Math.floor(bayList.length / 2)];
  for (let i = 0; i < bayList.length - 1; i++) {
    const gap = bayList[i + 1] - bayList[i];
    if (gap > bestGap) { bestGap = gap; splitPoint = bayList[i]; }
  }
  return {
    fore: bayList.filter(b => b <= splitPoint),
    aft: bayList.filter(b => b > splitPoint),
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
        singles.push({ bay: n });
      } else {
        pairs.push({ even: n, odd: null });
      }
    }
  }
  for (const n of bays) {
    if (n % 2 === 1 && !used.has(n)) singles.push({ bay: n });
  }
  // 큰 베이가 좌측 (선미 방향)
  singles.sort((a, b) => b.bay - a.bay);
  pairs.sort((a, b) => b.even - a.even);
  return { singles, pairs };
}

// M4.8: 마크 결정 — 카운터파트 항만 첫 글자
function getMark(c, mode) {
  if (isPtk(c, mode)) return mode === 'discharge' ? 'o' : 'L';
  const port = counterpartPort(c, mode);
  return port ? port.charAt(0) : 'X';
}

function BayBox({ even, odd, containers, mode, dictBay }) {
  const allConts = [
    ...((even != null && containers[String(even)]) || []),
    ...((odd != null && containers[String(odd)]) || []),
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

  // M4.8: 카운트는 PTK가 아니라 mode의 카운터파트 (PTK 컨테이너 = stowage 대상)
  // 단순화: PTK 컨테이너 카운트만 표시 (기존 로직 유지)
  const cnt = { c20: 0, c40: 0, c45: 0 };
  allConts.forEach(c => {
    if (!isPtk(c, mode)) return;
    const sz = sizeOf(c);
    cnt[sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20']++;
  });

  const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  let title;
  if (even != null && odd != null) title = `BAY (${dispBay(even)}) ${dispBay(odd)}`;
  else if (even != null) title = `BAY ${dispBay(even)}`;
  else title = `BAY ${dispBay(odd)}`;

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
                const cls = m ? `mark-${/^[A-Z]$/.test(m) ? 'letter' : m}` : 'mark-empty';
                return <span key={r} className={`bay-cell ${cls}`}>{m}</span>;
              })}
            </div>
          ))}
          {hasDeck && hasHold && <div className="hatch-break"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bay-grid-row">
              {STD_ROWS.map(r => {
                const c = cellMap[`${t}-${r}`];
                const m = c ? getMark(c, mode) : '';
                const cls = m ? `mark-${/^[A-Z]$/.test(m) ? 'letter' : m}` : 'mark-empty';
                return <span key={r} className={`bay-cell ${cls}`}>{m}</span>;
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

  // M4.8: 카운트 — 카운터파트 항만별로 그룹화 (PTK 외 화물 + PTK 분리)
  const portCounts = useMemo(() => {
    const byPort = {};
    let ptk20 = 0, ptk40 = 0, ptk45 = 0;
    let optAll20 = 0, optAll40 = 0, optAll45 = 0;
    containers.forEach(c => {
      const sz = sizeOf(c);
      const key = sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20';
      if (isPtk(c, mode)) {
        if (key === 'c20') ptk20++; else if (key === 'c40') ptk40++; else ptk45++;
      } else {
        const port = counterpartPort(c, mode);
        if (!port) {
          if (key === 'c20') optAll20++; else if (key === 'c40') optAll40++; else optAll45++;
          return;
        }
        if (!byPort[port]) byPort[port] = { c20: 0, c40: 0, c45: 0 };
        byPort[port][key]++;
      }
    });
    return { byPort, ptk: { c20: ptk20, c40: ptk40, c45: ptk45 }, opt: { c20: optAll20, c40: optAll40, c45: optAll45 } };
  }, [containers, mode]);

  const portsSorted = useMemo(() => {
    return Object.entries(portCounts.byPort)
      .sort(([, a], [, b]) => (b.c20 + b.c40 + b.c45) - (a.c20 + a.c40 + a.c45));
  }, [portCounts]);

  const totalAll = useMemo(() => {
    let c20 = portCounts.ptk.c20 + portCounts.opt.c20;
    let c40 = portCounts.ptk.c40 + portCounts.opt.c40;
    let c45 = portCounts.ptk.c45 + portCounts.opt.c45;
    portsSorted.forEach(([, v]) => { c20 += v.c20; c40 += v.c40; c45 += v.c45; });
    return { c20, c40, c45 };
  }, [portCounts, portsSorted]);

  // M4.8: 4 col 레이아웃 — fore/aft 각 행에 최대 4개
  const foreSinglesByCol = forePages.singles.slice(0, 4);
  const forePairsByCol = forePages.pairs.slice(0, 4);
  const aftSinglesByCol = aftPages.singles.slice(0, 4);
  const aftPairsByCol = aftPages.pairs.slice(0, 4);

  const titleText = mode === 'discharge' ? 'CARGO DISCHARGING PLAN' : 'STOWAGE INSTRUCTION';
  const portText = mode === 'discharge' ? 'POD : PTK' : 'POL : PTK';
  const todayStr = new Date().toISOString().slice(0, 10);
  const vsl = voyageInfo?.vsl || shipName || 'VESSEL';
  const voy = voyageInfo?.voy_d || voyageInfo?.voy_l || voyageInfo?.voy || voyageKey || '';

  // Legend가 row 4 마지막 칸에 들어가도록 padding 계산
  // row 4: aft pairs + (4 - aft pairs.length - 1) 빈칸 + legend
  const aftPairsRowFillers = Math.max(0, 4 - aftPairsByCol.length - 1);

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

          {/* Row 1: Fore singles */}
          <div className="bay-row four-col">
            {foreSinglesByCol.map((p, i) => (
              <BayBox key={`fs-${i}`} even={null} odd={p.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.bay]} />
            ))}
            {Array.from({ length: Math.max(0, 4 - foreSinglesByCol.length) }).map((_, i) =>
              <div key={`fse-${i}`}></div>
            )}
          </div>
          {/* Row 2: Fore pairs */}
          <div className="bay-row four-col">
            {forePairsByCol.map((p, i) => (
              <BayBox key={`fp-${i}`} even={p.even} odd={p.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.even]} />
            ))}
            {Array.from({ length: Math.max(0, 4 - forePairsByCol.length) }).map((_, i) =>
              <div key={`fpe-${i}`}></div>
            )}
          </div>
          {/* Row 3: Aft singles */}
          <div className="bay-row four-col">
            {aftSinglesByCol.map((p, i) => (
              <BayBox key={`as-${i}`} even={null} odd={p.bay} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.bay]} />
            ))}
            {Array.from({ length: Math.max(0, 4 - aftSinglesByCol.length) }).map((_, i) =>
              <div key={`ase-${i}`}></div>
            )}
          </div>
          {/* Row 4: Aft pairs + (fillers) + Legend */}
          <div className="bay-row four-col">
            {aftPairsByCol.map((p, i) => (
              <BayBox key={`ap-${i}`} even={p.even} odd={p.odd} containers={bayMap}
                mode={mode} dictBay={dictBaysSummary[p.even]} />
            ))}
            {Array.from({ length: aftPairsRowFillers }).map((_, i) =>
              <div key={`ape-${i}`}></div>
            )}
            <div className="legend-box">
              <div className="legend-title">20'/40'/45'</div>
              {portsSorted.map(([port, v]) => (
                <div key={port} className="legend-row">
                  <span className="legend-mark mark-letter">{port.charAt(0)}</span>
                  <span className="legend-label">{port}</span>
                  <span className="legend-count">{v.c20} / {v.c40} / {v.c45}</span>
                </div>
              ))}
              {portCounts.ptk.c20 + portCounts.ptk.c40 + portCounts.ptk.c45 > 0 && (
                <div className="legend-row">
                  <span className={`legend-mark mark-${mode === 'discharge' ? 'o' : 'L'}`}>
                    {mode === 'discharge' ? 'o' : 'L'}
                  </span>
                  <span className="legend-label">PTK</span>
                  <span className="legend-count">
                    {portCounts.ptk.c20} / {portCounts.ptk.c40} / {portCounts.ptk.c45}
                  </span>
                </div>
              )}
              <div className="legend-row">
                <span className="legend-mark legend-empty-mark">□</span>
                <span className="legend-label">OPT</span>
                <span className="legend-count">
                  {portCounts.opt.c20} / {portCounts.opt.c40} / {portCounts.opt.c45}
                </span>
              </div>
              <div className="legend-row legend-total">
                <span className="legend-mark legend-empty-mark"></span>
                <span className="legend-label">TTL</span>
                <span className="legend-count">{totalAll.c20} / {totalAll.c40} / {totalAll.c45}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .cargo-plan-page {
            margin: 0 !important;
            padding: 0.3cm !important;
            max-width: none !important;
            width: 100% !important;
          }
          @page { size: A4 landscape; margin: 0.3cm; }
        }
        .cargo-plan-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          font-size: 9pt;
          padding: 12px 16px;
          width: 100%;
          box-sizing: border-box;
        }
        .cargo-header {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 2px;
        }
        .cargo-title { font-size: 13pt; font-weight: 500; }
        .cargo-subheader {
          display: flex; justify-content: center; gap: 80px;
          font-size: 10pt; margin-bottom: 8px;
        }
        .bay-row { display: grid; gap: 4px; margin-bottom: 4px; }
        .four-col { grid-template-columns: repeat(4, 1fr); }
        .bay-box {
          border: 0.5px solid #000; background: white;
          font-size: 7pt;
          page-break-inside: avoid;
        }
        .bay-title-row {
          display: flex; justify-content: space-between;
          padding: 1px 6px; font-size: 9pt;
        }
        .bay-title-label { font-weight: 500; }
        .bay-count { font-size: 9pt; }
        .bay-row-labels {
          display: flex; justify-content: center;
          font-size: 6pt; padding: 0 1px;
        }
        .bay-row-label { width: 14px; text-align: center; }
        .bay-grid-wrap {
          display: flex; align-items: stretch; padding: 1px;
          justify-content: center;
        }
        .bay-grid { display: flex; flex-direction: column; align-items: center; }
        .bay-grid-row { display: flex; }
        .bay-cell {
          width: 14px; height: 11px;
          border: 0.3px solid #aaa;
          text-align: center;
          font-size: 7pt; line-height: 11px;
          font-family: 'Courier New', monospace;
        }
        .mark-letter { color: #000; font-weight: 500; }
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
        .bay-tier-labels span { height: 11px; line-height: 11px; }
        .tier-gap { height: 3px !important; }
        .legend-box {
          padding: 4px 6px;
          display: flex; flex-direction: column; justify-content: flex-end;
          font-family: Arial, sans-serif;
          font-size: 9pt;
          border: 0.5px solid #000;
        }
        .legend-title { margin-bottom: 4px; font-weight: 500; }
        .legend-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 9pt; margin-bottom: 2px;
        }
        .legend-total { border-top: 0.5px solid #000; padding-top: 2px; margin-top: 2px; }
        .legend-mark {
          width: 14px; height: 14px;
          border: 0.5px solid #000;
          text-align: center; line-height: 14px;
          font-size: 9pt;
          font-family: 'Courier New', monospace;
        }
        .legend-empty-mark { color: transparent; border: none !important; }
        .legend-label { width: 36px; font-weight: 500; }
        .legend-count { font-weight: 500; font-family: 'Courier New', monospace; }
      `}</style>
    </div>
  );
}
