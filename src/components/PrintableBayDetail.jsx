// 베이 상세 인쇄 (M4.7) — 샘플 PDF 1:1 재현
// TNJP25323EBAY.pdf / TNJP25323WBAY.pdf 형식
// - 베이당 1페이지
// - 제목 BAY05/BAY(02)03 상단 중앙 (큰 글자)
// - 헤더: TEN JUPITER / VOY NO / POL or POD
// - row 라벨 상하단 (06 04 02 00 01 03 05)
// - 굵은 hatch break
// - 데크 (위) / 홀드 (아래) 분리
// - 각 셀 4-5줄 정보 또는 빈칸
// - tier 라벨 우측 (88 86 84 82 / 08 06 04 02)
//
// 출력 모드 3종:
//   * 전체 일괄 (all): 모든 베이
//   * 평택분만 (ptk): PTK 컨테이너 있는 베이만
//   * 베이 지정 (single): 1개 베이 선택

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeBay, isoToPdfLabel } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';

const STD_ROWS = ['06', '04', '02', '00', '01', '03', '05'];
const STD_DECK = ['88', '86', '84', '82'];
const STD_HOLD = ['08', '06', '04', '02'];

const isPtk = (c, mode) => {
  const t = ((mode === 'discharge' ? c.pod : c.pol) || '').toUpperCase();
  return t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
};

function groupByBay(containers) {
  const m = {};
  // M4.9: containers 검증 (배열 아니면 빈 객체 반환)
  if (!Array.isArray(containers)) return m;
  containers.forEach(c => {
    if (!c || !c.bay) return;
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

// M4.9b: 페이지 빌드 룰 변경
//   요구사항: 7,8,9 베이 → "BAY 07 단독" + "BAY (08)09 짝꿍" = 2페이지
//   샘플 PDF 패턴 분석: 짝꿍은 항상 (even-1)(odd) 형태 (작은 짝수가 큰 홀수와)
//     - (02)03, (06)07, (08)09, (10)11, (14)15, (18)19, (22)23, (26)27, (30)31
//     - 단독은 항상 odd 단독 (01, 05, 09 또는 짝꿍 없는 odd)
//   알고리즘:
//     1) 홀수 n에 대해 (n-1)이 있으면 짝꿍 (n-1)n
//     2) 홀수 n에 대해 (n-1)이 없으면 n 단독
//     3) 짝수 중 양옆 홀수 모두 없는 것만 단독 처리 (예외 케이스)
function buildBayPages(bays) {
  const baySet = new Set(bays);
  const used = new Set();
  const pages = [];
  // 1) 홀수 베이 처리 - left(n-1) 짝수와 짝꿍 시도
  for (const n of bays) {
    if (n % 2 !== 1) continue;
    if (used.has(n)) continue;
    if (baySet.has(n - 1) && !used.has(n - 1)) {
      // (n-1)n 짝꿍 페이지
      pages.push({ even: n - 1, odd: n, key: `${n-1}-${n}` });
      used.add(n - 1);
      used.add(n);
    } else {
      // 홀수 단독 페이지
      pages.push({ even: null, odd: n, key: `${n}` });
      used.add(n);
    }
  }
  // 2) 짝꿍에 들어가지 못한 짝수 (양옆 홀수 없는 케이스)
  for (const n of bays) {
    if (n % 2 !== 0 || used.has(n)) continue;
    pages.push({ even: n, odd: null, key: `${n}` });
    used.add(n);
  }
  // 작은 베이 → 큰 베이 순서로 정렬 (FORE → AFT)
  pages.sort((a, b) => (a.even ?? a.odd) - (b.even ?? b.odd));
  return pages;
}

// 컨테이너 4-5줄 텍스트 포맷
// M4.9: 모든 입력 String 변환 + try-catch로 방어 (한 셀 에러가 전체 페이지 크래시 방지)
function formatCellLines(c) {
  try {
    const pol = String(c.pol || '').replace(/^KR/, '').slice(0, 3) || '   ';
    const pod = String(c.pod || '').replace(/^KR/, '').slice(0, 3) || '   ';
    const via = String(c.via || '');
    // POL POD via 표기
    let line1;
    if (pol === pod) {
      line1 = `${pol}/${pod}*${via || ' '}`;
    } else {
      line1 = `${pol}/${' '}*${via || pod}`;
    }
    const line2 = String(c.cn || '');
    // 선사 약어
    const carrierRaw = String(c.line || c.carrier || '').toUpperCase();
    let carrier = 'C_K';
    if (carrierRaw === 'CKL' || carrierRaw === 'CK') carrier = 'C_K';
    else if (carrierRaw === 'SOC' || carrierRaw.includes('SOC')) carrier = 'SOC';
    else if (carrierRaw) carrier = carrierRaw.slice(0, 3);

    const fe = c.fe || (String(c.iso || '').endsWith('0') ? 'E' : 'F');
    // M4.9: wt 안전 처리 (number/string/null 모두 OK)
    let wt = '0.0';
    try {
      const wtNum = parseFloat(c.wt);
      if (Number.isFinite(wtNum)) wt = (wtNum / 1000).toFixed(1);
    } catch (_) {}
    const isoLbl = String(isoToPdfLabel(c.iso) || '');
    const line3 = `${carrier} ${fe}${String(wt).padStart(5)} ${isoLbl}`;
    // IMDG/위험물
    const line4 = c.imdg ? ` ${String(c.imdg)}` : '';
    // 위치
    const bay = String(c.bay ?? '0').padStart(3, '0').slice(-3);
    const row = String(c.row ?? '00').padStart(2, '0');
    const tier = String(c.tier ?? '00').padStart(2, '0');
    const lineLast = `....${bay}${row}${tier}`;
    return { line1, line2, line3, line4, lineLast };
  } catch (e) {
    // 한 컨테이너 에러가 전체 페이지를 무너뜨리지 않게
    console.error('[formatCellLines] error', e, c);
    return {
      line1: '?',
      line2: String(c?.cn || '?'),
      line3: '? ?',
      line4: '',
      lineLast: '?',
    };
  }
}

function BayDetailPage({ even, odd, bayMap, mode, voyageInfo, voyageKey, shipName, dictBay }) {
  const allConts = [
    ...(even != null && bayMap[String(even)] || []),
    ...(odd != null && bayMap[String(odd)] || []),
  ];

  const cellMap = {};
  allConts.forEach(c => {
    const t = String(c.tier).padStart(2, '0');
    const r = String(c.row || '00').padStart(2, '0');
    cellMap[`${t}-${r}`] = c;
  });

  const allTiers = new Set();
  allConts.forEach(c => allTiers.add(String(c.tier).padStart(2, '0')));
  const deckTiers = [...new Set([...STD_DECK, ...[...allTiers].filter(t => parseInt(t) >= 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = [...new Set([...STD_HOLD, ...[...allTiers].filter(t => parseInt(t) < 80)])]
    .sort((a, b) => parseInt(b) - parseInt(a));

  const hasHold = dictBay ? dictBay.hasHold !== false : allConts.some(c => parseInt(c.tier) < 80);
  const hasDeck = dictBay ? dictBay.hasDeck !== false : true;

  const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  let title;
  if (even != null && odd != null) title = `BAY(${dispBay(even)})${dispBay(odd)}`;
  else if (even != null) title = `BAY${dispBay(even)}`;
  else title = `BAY${dispBay(odd)}`;

  // M4.9b: 항차 번호 표기 (양하 + 선적 분리 시 둘 다 표시)
  const voyD = voyageInfo?.voy_d || '';
  const voyL = voyageInfo?.voy_l || '';
  const voyFallback = voyageInfo?.voy || voyageKey || '';
  let voyDisplay;
  if (voyD && voyL && voyD !== voyL) {
    voyDisplay = `양하 ${voyD} / 선적 ${voyL}`;
  } else {
    voyDisplay = voyD || voyL || voyFallback;
  }

  // M4.9b: POL 빈칸 (샘플 PDF와 동일 — 검수원이 수기 또는 향후 자동 채움)
  const portLabel = 'POL : ';

  const renderCell = (t, r) => {
    const c = cellMap[`${t}-${r}`];
    if (!c) return <div key={`${t}-${r}`} className="bd-cell empty"></div>;
    const lines = formatCellLines(c);
    return (
      <div key={`${t}-${r}`} className={`bd-cell filled ${isPtk(c, mode) ? 'ptk' : ''}`}>
        <div>{lines.line1}</div>
        <div>{lines.line2}</div>
        <div>{lines.line3}</div>
        {lines.line4 && <div>{lines.line4}</div>}
        <div className="bd-pos">{lines.lineLast}</div>
      </div>
    );
  };

  return (
    <div className="bd-page">
      <div className="bd-title">{title}</div>
      <div className="bd-header">
        <span>{voyageInfo?.vsl || shipName || ''}</span>
        <span>VOY NO : {voyDisplay}</span>
        <span>{portLabel}</span>
      </div>

      <div className="bd-row-labels-top">
        {STD_ROWS.map(r => <span key={r} className="bd-rl">{r}</span>)}
      </div>

      <div className="bd-grid-wrap">
        <div className="bd-grid">
          {hasDeck && deckTiers.map(t => (
            <div key={t} className="bd-tier-row">
              {STD_ROWS.map(r => renderCell(t, r))}
            </div>
          ))}
          {hasDeck && hasHold && <div className="bd-hatch"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bd-tier-row">
              {STD_ROWS.map(r => renderCell(t, r))}
            </div>
          ))}
        </div>
        <div className="bd-tier-labels">
          {hasDeck && deckTiers.map(t => <span key={t}>{t}</span>)}
          {hasDeck && hasHold && <span className="bd-tier-gap"></span>}
          {hasHold && holdTiers.map(t => <span key={t}>{t}</span>)}
        </div>
      </div>

      <div className="bd-row-labels-bot">
        {STD_ROWS.map(r => <span key={r} className="bd-rl">{r}</span>)}
      </div>
    </div>
  );
}

export default function PrintableBayDetail({
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, onClose
}) {
  const [printMode, setPrintMode] = useState('all');  // 'all' | 'ptk' | 'single'
  const [selectedKeys, setSelectedKeys] = useState([]);  // M4.8 다중 선택

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

  const allPages = useMemo(() => buildBayPages(bayList), [bayList]);

  const filteredPages = useMemo(() => {
    if (printMode === 'all') {
      return allPages.filter(p => {
        const conts = [
          ...(p.even != null && bayMap[String(p.even)] || []),
          ...(p.odd != null && bayMap[String(p.odd)] || []),
        ];
        return conts.length > 0;
      });
    }
    if (printMode === 'ptk') {
      return allPages.filter(p => {
        const conts = [
          ...(p.even != null && bayMap[String(p.even)] || []),
          ...(p.odd != null && bayMap[String(p.odd)] || []),
        ];
        return conts.some(c => isPtk(c, mode));
      });
    }
    if (printMode === 'single' && selectedKeys.length > 0) {
      return allPages.filter(p => selectedKeys.includes(p.key));
    }
    return [];
  }, [allPages, bayMap, printMode, selectedKeys, mode]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col bd-print-modal">
      <div className="no-print flex flex-col p-3 bg-slate-900 border-b border-slate-700 gap-2">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-slate-100">📋 베이 상세 인쇄 미리보기 ({filteredPages.length}페이지)</div>
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
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-slate-400 font-bold">출력 모드:</span>
          <button onClick={() => setPrintMode('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>📋 전체 일괄</button>
          <button onClick={() => setPrintMode('ptk')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'ptk' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>⚓ 평택분만</button>
          <button onClick={() => setPrintMode('single')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${
              printMode === 'single' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>🎯 베이 지정</button>
          {printMode === 'single' && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs text-slate-400">선택({selectedKeys.length}):</span>
              {allPages.map(p => {
                const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
                let label;
                if (p.even != null && p.odd != null) label = `(${dispBay(p.even)})${dispBay(p.odd)}`;
                else if (p.even != null) label = dispBay(p.even);
                else label = dispBay(p.odd);
                const selected = selectedKeys.includes(p.key);
                return (
                  <button key={p.key}
                    onClick={() => {
                      setSelectedKeys(selected
                        ? selectedKeys.filter(k => k !== p.key)
                        : [...selectedKeys, p.key]);
                    }}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      selected ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                    {selected ? '✓ ' : ''}{label}
                  </button>
                );
              })}
              {selectedKeys.length > 0 && (
                <button onClick={() => setSelectedKeys([])}
                  className="px-2 py-1 rounded text-xs bg-red-700 text-white">전체해제</button>
              )}
              <button onClick={() => setSelectedKeys(allPages.map(p => p.key))}
                className="px-2 py-1 rounded text-xs bg-slate-600 text-slate-100">전체선택</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white bd-print-container">
        {filteredPages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            출력할 페이지가 없습니다. 모드를 변경하거나 베이를 선택하세요.
          </div>
        ) : (
          filteredPages.map(p => {
            const dictBay = p.even != null ? dictBaysSummary[p.even] : dictBaysSummary[p.odd];
            return (
              <BayDetailPage key={p.key}
                even={p.even} odd={p.odd}
                bayMap={bayMap} mode={mode}
                voyageInfo={voyageInfo} voyageKey={voyageKey}
                shipName={shipName} dictBay={dictBay} />
            );
          })
        )}
      </div>

      <style>{`
        /* M4.9c: 인쇄 표준 패턴 — visibility 토글
           이전 (M4.9b) 문제: position: static !important로 모달 fixed 해제 →
                            메인 페이지가 인쇄 캔버스에 함께 그려져 "엄한 화면이 출력됨"
           해결: body의 모든 자식을 visibility: hidden으로 숨기고,
                인쇄 모달과 그 자식만 visible로 처리 (표준 패턴) */
        @media print {
          /* 1. 모든 컨텐츠 숨김 (visibility만 변경 — display: none이면 모달도 영향) */
          body * {
            visibility: hidden !important;
          }
          /* 2. 인쇄 모달과 그 모든 자식만 보이게 */
          .bd-print-modal,
          .bd-print-modal * {
            visibility: visible !important;
          }
          /* 3. 모달 위치를 페이지 좌상단으로 (fixed → absolute) */
          .bd-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }
          /* 4. 모달 안의 컨테이너도 일반 block */
          .bd-print-container {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            flex: none !important;
            background: white !important;
          }
          /* 5. no-print 영역 (헤더/버튼바) 숨기기 */
          .no-print {
            display: none !important;
          }
          /* 6. 베이별 페이지 분리 */
          .bd-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
            border-bottom: none !important;
          }
          .bd-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* 사용자 요청: 여백 1.5cm */
          @page { size: A4 landscape; margin: 1.5cm; }
        }
        .bd-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          padding: 10px 16px;
          border-bottom: 1px dashed #ddd;
        }
        .bd-title {
          /* 페이지 가득 활용 — 베이 제목 더 크게 */
          text-align: center; font-size: 22pt; font-weight: 500;
          margin-bottom: 8px;
        }
        .bd-header {
          display: flex; justify-content: space-between;
          font-size: 11pt; margin-bottom: 10px;
        }
        .bd-row-labels-top, .bd-row-labels-bot {
          display: flex; justify-content: space-evenly;
          font-size: 9pt;
          margin: 2px 14px;
        }
        .bd-rl { flex: 1; text-align: center; }
        .bd-grid-wrap {
          display: flex; align-items: stretch;
        }
        .bd-grid { flex: 1; }
        .bd-tier-row {
          display: grid; grid-template-columns: repeat(7, 1fr);
          border: 0.5px solid #000;
        }
        .bd-cell {
          border: 0.3px solid #555;
          /* 가용 세로 공간 활용 — 9단 × 60px = 540px */
          height: 60px;
          padding: 2px 4px;
          font-size: 8.5pt;
          line-height: 1.15;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
          padding: 2px 3px;
          font-size: 7pt;
          line-height: 1.1;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
        .bd-cell.empty { background: white; }
        .bd-cell.filled.ptk { background: #fef3c7; }
        .bd-cell.filled { background: white; }
        .bd-pos { color: #555; }
        .bd-hatch {
          height: 4px; background: #000; margin: 2px 0;
        }
        .bd-tier-labels {
          display: flex; flex-direction: column;
          padding-left: 8px;
          font-size: 10pt;
        }
        .bd-tier-labels span {
          height: 60px; line-height: 60px;
        }
        .bd-tier-gap { height: 8px !important; }
      `}</style>
    </div>
  );
}
