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

// M4.9e-fix: STD_DECK/STD_HOLD/STD_ROWS 모두 동적 (globalTiers + globalRowRange 기준)
//   사용자 지적: "베이마다 / 선박마다 row/tier 다름, 일괄 X, 화면과 같게"
// (STD_DECK / STD_HOLD 제거됨 — globalTiers 동적 사용)

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

function BayDetailPage({ even, odd, bayMap, mode, voyageInfo, voyageKey, shipName, dictBay, globalRowRange, globalTiers }) {
  // M4.9d-fix: globalRowRange 기준 동적 row 생성 — 화면 BayPlan과 통일
  //   maxLeft (예: 10) → 짝수 큰→작은 [10, 08, 06, 04, 02]
  //   maxRight (예: 09) → 홀수 작은→큰 [01, 03, 05, 07, 09]
  //   center ['00']
  //   사용자 지적: "베이마다 다름, 일괄 적용 X, 베이사전 준해 화면과 같게"
  const STD_ROWS = useMemo(() => {
    const maxLeft = globalRowRange?.maxLeft || 6;
    const maxRight = globalRowRange?.maxRight || 5;
    const left = [];
    for (let n = maxLeft; n >= 2; n -= 2) left.push(String(n).padStart(2, '0'));
    const right = [];
    for (let n = 1; n <= maxRight; n += 2) right.push(String(n).padStart(2, '0'));
    return [...left, '00', ...right];
  }, [globalRowRange]);
  const colCount = STD_ROWS.length;
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
  // M4.9e-fix: 화면 BayPlan과 동일하게 globalTiers (선박 전체 tier 풀) 사용
  //   사용자 지적: "티어도 안 맞음, 베이마다 / 선박마다 다름"
  //   이전: STD_DECK/STD_HOLD 하드코딩과 합쳐 사용 → 선박마다 안 맞음
  //   수정: globalTiers 우선, 그 다음 컨테이너 데이터의 tier (보강)
  if (Array.isArray(globalTiers) && globalTiers.length > 0) {
    globalTiers.forEach(t => allTiers.add(String(t).padStart(2, '0')));
  }
  allConts.forEach(c => allTiers.add(String(c.tier).padStart(2, '0')));
  const deckTiers = [...allTiers].filter(t => parseInt(t) >= 80)
    .sort((a, b) => parseInt(b) - parseInt(a));
  const holdTiers = [...allTiers].filter(t => parseInt(t) < 80)
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
            <div key={t} className="bd-tier-row" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
              {STD_ROWS.map(r => renderCell(t, r))}
            </div>
          ))}
          {hasDeck && hasHold && <div className="bd-hatch"></div>}
          {hasHold && holdTiers.map(t => (
            <div key={t} className="bd-tier-row" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
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
  containers, mode, voyageInfo, shipImo, shipName, voyageKey, globalRowRange, globalTiers, onClose
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
                shipName={shipName} dictBay={dictBay}
                globalRowRange={globalRowRange}
                globalTiers={globalTiers} />
            );
          })
        )}
      </div>

      <style>{`
        /* M4.9d-fix: 베이상세 인쇄 — 좌우 짤림 종합 픽스
           1. box-sizing: border-box 전역 적용 (padding/border가 width에 포함되어 폭 초과 방지)
           2. visibility 토글 패턴으로 메인 화면 숨김 (M4.9c)
           3. @page margin 0.5cm — 폰/프린터 자체 minimum margin 절충
           4. 셀 폰트/패딩 축소로 11자리 컨번호 안전 표시 */
        @media print {
          /* 0. 모든 요소에 box-sizing 강제 — padding/border 폭 초과 방지 */
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          /* 1. 모든 컨텐츠 숨김 */
          body * {
            visibility: hidden !important;
          }
          /* 2. 인쇄 모달과 그 자식만 보이게 */
          .bd-print-modal,
          .bd-print-modal * {
            visibility: visible !important;
          }
          /* 3. 모달 위치 절대 좌상단 — width 100% 명시로 페이지 폭에 맞춤 */
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
          .bd-print-container {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            flex: none !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .bd-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
            margin: 0 !important;
            border-bottom: none !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .bd-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* 폰/프린터 minimum margin 대응 */
          @page { size: A4 landscape; margin: 0.5cm; }
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
          font-size: 7pt;
          margin: 1px 4px;
        }
        .bd-rl { flex: 1; text-align: center; }
        .bd-grid-wrap {
          display: flex; align-items: stretch;
          /* M4.9c/d-fix: 좌우 짤림 방지 — 컨테이너가 페이지 폭 초과 못함 */
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .bd-grid {
          flex: 1;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }
        .bd-tier-row {
          display: grid;
          /* grid-template-columns은 inline style로 동적 적용 (베이/선박별) */
          border: 0.5px solid #000;
        }
        /* M4.9c-fix: 셀 padding/폰트 축소로 11자리 컨번호 안전하게 들어가게 */
        /* M4.9d-fix: 셀 폰트/패딩 최소화로 11자리 컨번호 안전하게 표시
           가용 폭 297mm - margin 10mm = 287mm. 7컬럼 = 41mm 각자.
           폰트 7pt courier, padding 1px = 컨텐츠 영역 약 38mm. 컨번호 11자 약 28mm OK. */
        .bd-cell {
          border: 0.3px solid #555;
          height: 58px;
          padding: 1px;
          font-size: 7pt;
          line-height: 1.05;
          font-family: 'Courier New', monospace;
          overflow: hidden;
          min-width: 0;
          word-break: break-all;  /* 단어 짤려도 페이지 안에 들어가게 */
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
          padding-left: 6px;
          font-size: 9pt;
          flex-shrink: 0;
        }
        .bd-tier-labels span {
          height: 58px; line-height: 58px;
        }
        .bd-tier-gap { height: 8px !important; }
      `}</style>
    </div>
  );
}
