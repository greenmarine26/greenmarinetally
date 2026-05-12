// M5.26: 통합 출력 허브 모달
// 양하/선적 탭 × 항목별 (검수 리스트 / 카고플랜 / 베이 상세) 출력
//   - 평택분만 (양하 mode = 평택 양하 대상, 선적 mode = 평택 선적 대상)
//   - 컨테이너는 이미 mode별로 분리되어 voyage.discharge / voyage.loading에 있음
import React, { useState } from 'react';
import { X, FileText, Grid3x3, Ship, ArrowDown, ArrowUp, Printer } from 'lucide-react';
import { openInspectionListPrint } from '../inspectionList.js';
import { openWorkingReportPrint } from '../workingReport.js';
import PrintableCargoPlan from './PrintableCargoPlan.jsx';
import PrintableBayDetail from './PrintableBayDetail.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function PrintHubModal({ voyage, voyageKey, onClose }) {
  const [mode, setMode] = useState('discharge');  // 'discharge' | 'loading'
  const [printSub, setPrintSub] = useState(null);  // 'cargo' | 'detail' | null

  // M5.30-fix: 카고플랜/베이상세는 전체 컨테이너 (평택+통과), 검수리스트는 평택만
  //   원인: 카고플랜은 선박 적부도라 모든 화물 표시 필요. 평택 필터 X
  //         빈 슬롯도 베이사전 기준으로 표시 (영구 규칙 #30)
  const sec = voyage?.[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};
  const compMap = sec.completed || {};
  const xrayMap = sec.xrayList || {};

  const isPtk = (c) => {
    if (!c) return false;
    // M5.50: 리스트에 있는 컨테이너는 무조건 평택 화물로 인식
    //   (사용자가 평택에서 검수하는 모든 컨테이너 = 리스트 등록 = 검수 대상)
    //   EDI POL/POD가 KRPTK 아닌 환적 표기여도 리스트 등록되면 평택분
    if (c.cn && recMap[c.cn]) return true;
    if (mode === 'discharge') {
      const pod = String(c.pod || '').toUpperCase();
      return !pod || pod === 'PTK' || pod === 'KRPTK' || pod.endsWith('PTK');
    } else {
      const pol = String(c.pol || '').toUpperCase();
      return !pol || pol === 'PTK' || pol === 'KRPTK' || pol.endsWith('PTK');
    }
  };

  // 머지 (모든 컨테이너)
  const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
  const allContainers = [...allCnSet].map(cn => {
    const e = ediMap[cn] || {};
    const r = recMap[cn] || {};
    const merged = { ...e };
    Object.entries(r).forEach(([k, v]) => {
      if (v !== '' && v != null) merged[k] = v;
    });
    merged.cn = cn;
    merged._comp = compMap[cn] || null;
    if (xrayMap[cn]) merged._xray = true;
    return merged;
  });

  // M5.30-fix: 베이 단위 필터
  //   평택 화물이 1개라도 있는 베이의 전체 슬롯 표시 (그 베이의 통과 화물 + 빈 슬롯 포함)
  //   사용자 명세: "평택분 화물이 하나라도 있다면 그 베이 전체 티어/로우를 다 보여줘야 함"
  //   베이 번호 추출: bay_actual (검수원 수정) 우선, 없으면 pos[0:3]
  const getBay = (c) => {
    if (!c) return '';
    const b = c.bay_actual || c.bay || (c.pos ? String(c.pos).slice(0, 3) : '');
    return String(b).padStart(3, '0').slice(0, 3);
  };

  // 평택분 컨테이너의 베이 set (포함된 베이만 표시 대상)
  const ptkBays = new Set();
  allContainers.forEach(c => {
    if (isPtk(c)) {
      const b = getBay(c);
      if (b && b !== '000') ptkBays.add(b);
    }
  });

  // 카고플랜/베이상세용: 평택 화물 있는 베이의 전체 컨테이너
  const printContainers = allContainers.filter(c => {
    const b = getBay(c);
    return b && ptkBays.has(b);
  });

  // 검수 리스트용 — 평택분만
  const ptkContainers = allContainers.filter(isPtk);

  // M5.31: 베이상세용 row/tier 계산 (BayPlan과 동일 패턴)
  //   "빈 슬롯도 표시"를 위해 — 베이가 한 컨만 있어도 모든 tier/row 슬롯 표시
  let maxLeft = 0, maxRight = 0;
  const tierSet = new Set();
  printContainers.forEach(c => {
    if (c.row) {
      const n = parseInt(c.row);
      if (n > 0) {
        if (n % 2 === 0) maxLeft = Math.max(maxLeft, n);
        else maxRight = Math.max(maxRight, n);
      }
    }
    if (c.tier) tierSet.add(c.tier);
  });
  const globalRowRange = { maxLeft, maxRight };
  const globalTiers = Array.from(tierSet);

  const voyageInfo = voyage?.info || {};
  const shipImo = voyageInfo.imo || '';
  const shipName = voyageInfo.vsl || '';

  const count = ptkContainers.length;        // 검수 리스트 카운트 (평택만)
  const allCount = allContainers.length;     // 카고플랜/베이상세 카운트 (전체)
  const modeKo = mode === 'discharge' ? '양하' : '선적';

  // 양하/선적 카운트 (탭 라벨용 — 평택만)
  // M5.51: 리스트 등록 컨테이너는 무조건 평택분 (isPtk와 동기화)
  const countMode = (m) => {
    const s = voyage?.[m] || {};
    const ed = s.ediContainers || {};
    const rc = s.records || {};
    const cnSet = new Set([...Object.keys(ed), ...Object.keys(rc)]);
    let n = 0;
    cnSet.forEach(cn => {
      if (rc[cn]) { n++; return; }  // M5.51: 리스트에 있으면 무조건 평택
      const c = { ...(ed[cn] || {}) };
      const target = m === 'discharge' ? String(c.pod || '').toUpperCase() : String(c.pol || '').toUpperCase();
      if (!target || target === 'PTK' || target === 'KRPTK' || target.endsWith('PTK')) n++;
    });
    return n;
  };
  const dischargeCount = countMode('discharge');
  const loadingCount = countMode('loading');

  const handlePrintInspection = () => {
    if (count === 0) {
      alert(`${modeKo} 컨테이너가 없습니다`);
      return;
    }
    openInspectionListPrint(ptkContainers, mode, voyageInfo);
  };

  // 서브 모달 (카고플랜/베이 상세) 표시 중이면 그것만
  if (printSub === 'cargo') {
    return (
      <ErrorBoundary name="카고 플랜 인쇄" onClose={() => setPrintSub(null)}>
        <PrintableCargoPlan
          containers={printContainers}
          mode={mode}
          voyageInfo={voyageInfo}
          voyageKey={voyageKey}
          shipImo={shipImo}
          shipName={shipName}
          xrayMap={xrayMap}
          globalRowRange={globalRowRange}
          globalTiers={globalTiers}
          onClose={() => setPrintSub(null)}
        />
      </ErrorBoundary>
    );
  }
  if (printSub === 'detail') {
    return (
      <ErrorBoundary name="베이 상세 인쇄" onClose={() => setPrintSub(null)}>
        <PrintableBayDetail
          containers={printContainers}
          mode={mode}
          voyageInfo={voyageInfo}
          voyageKey={voyageKey}
          shipImo={shipImo}
          shipName={shipName}
          globalRowRange={globalRowRange}
          globalTiers={globalTiers}
          onClose={() => setPrintSub(null)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-slate-900 w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[95vh] overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-300" />
            검수 자료 출력
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 양하/선적 탭 */}
        <div className="flex border-b border-slate-700 sticky top-[65px] bg-slate-900 z-10">
          <button
            onClick={() => setMode('discharge')}
            className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 ${
              mode === 'discharge'
                ? 'bg-blue-900/40 text-blue-200 border-b-2 border-blue-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            양하 ({dischargeCount})
          </button>
          <button
            onClick={() => setMode('loading')}
            className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 ${
              mode === 'loading'
                ? 'bg-amber-900/40 text-amber-200 border-b-2 border-amber-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
            선적 ({loadingCount})
          </button>
        </div>

        {/* 항목 리스트 */}
        <div className="p-4 space-y-3">
          {count === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>이 모드에 컨테이너 자료가 없습니다</p>
              <p className="text-xs mt-1">자료 탭에서 EDI/리스트 업로드 후 사용</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                {modeKo} <strong className="text-slate-200">{count}대</strong> · 평택항 {modeKo} 대상만 포함
              </p>

              {/* 1. 검수 리스트 */}
              <button
                onClick={handlePrintInspection}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left flex items-center gap-3"
              >
                <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-slate-100">📋 검수 리스트</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    A4 세로, 좌우 2단, 페이지당 140대 · 시트1(전체) + 시트2(특수화물 별첨)
                  </div>
                </div>
                <Printer className="w-4 h-4 text-slate-500" />
              </button>

              {/* 1.5. FINAL WORKING REPORT (M5.53) — 양하+선적 통합 */}
              <button
                onClick={() => openWorkingReportPrint(voyage, voyage?.info || {})}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left flex items-center gap-3"
              >
                <FileText className="w-8 h-8 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-slate-100">📄 FINAL WORKING REPORT (VOUCHER)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    작업 완료 보고서 · 양하+선적 통합 · 선사×항구×F/E×사이즈 집계
                  </div>
                </div>
                <Printer className="w-4 h-4 text-slate-500" />
              </button>

              {/* 2. 카고플랜 */}
              <button
                onClick={() => setPrintSub('cargo')}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left flex items-center gap-3"
              >
                <Grid3x3 className="w-8 h-8 text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-slate-100">📐 카고플랜</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    베이별 컨테이너 배치도 · 특수화물 + X-RAY 표시
                  </div>
                </div>
                <Printer className="w-4 h-4 text-slate-500" />
              </button>

              {/* 3. 베이 상세 */}
              <button
                onClick={() => setPrintSub('detail')}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left flex items-center gap-3"
              >
                <Ship className="w-8 h-8 text-purple-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-slate-100">🚢 베이 상세</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    베이별 슬롯 단위 컨테이너 위치 · 검수 현장용
                  </div>
                </div>
                <Printer className="w-4 h-4 text-slate-500" />
              </button>
            </>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 leading-relaxed">
          출력 클릭 → 새 창 미리보기 → Ctrl+P (인쇄 또는 PDF 저장)<br />
          💡 컬러 인쇄 권장 (특수화물 색상 구분)
        </div>
      </div>
    </div>
  );
}
