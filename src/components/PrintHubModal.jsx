// M5.26: 통합 출력 허브 모달
// 양하/선적 탭 × 항목별 (검수 리스트 / 카고플랜 / 베이 상세) 출력
//   - 평택분만 (양하 mode = 평택 양하 대상, 선적 mode = 평택 선적 대상)
//   - 컨테이너는 이미 mode별로 분리되어 voyage.discharge / voyage.loading에 있음
import React, { useState } from 'react';
import { X, FileText, Grid3x3, Ship, ArrowDown, ArrowUp, Printer } from 'lucide-react';
import { openInspectionListPrint } from '../inspectionList.js';
import PrintableCargoPlan from './PrintableCargoPlan.jsx';
import PrintableBayDetail from './PrintableBayDetail.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function PrintHubModal({ voyage, voyageKey, onClose }) {
  const [mode, setMode] = useState('discharge');  // 'discharge' | 'loading'
  const [printSub, setPrintSub] = useState(null);  // 'cargo' | 'detail' | null

  // M5.26-fix: ediContainers + records 머지 (VoyagePage와 동일 패턴)
  //   원인: 컨테이너 데이터는 ediContainers/records로 분산 저장됨. .containers 단일 키 없음
  //   평택분 필터: 양하=POD, 선적=POL이 PTK/KRPTK
  const sec = voyage?.[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};
  const compMap = sec.completed || {};
  const xrayMap = sec.xrayList || {};

  const isPtk = (c) => {
    if (!c) return false;
    if (mode === 'discharge') {
      const pod = String(c.pod || '').toUpperCase();
      return !pod || pod === 'PTK' || pod === 'KRPTK' || pod.endsWith('PTK');
    } else {
      const pol = String(c.pol || '').toUpperCase();
      return !pol || pol === 'PTK' || pol === 'KRPTK' || pol.endsWith('PTK');
    }
  };

  // 머지: EDI + records (records가 EDI 컨에 추가 필드, 또는 list-only 컨)
  const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
  const containers = [...allCnSet]
    .map(cn => {
      const e = ediMap[cn] || {};
      const r = recMap[cn] || {};
      const merged = { ...e };
      // records의 비어있지 않은 필드만 덮어씀
      Object.entries(r).forEach(([k, v]) => {
        if (v !== '' && v != null) merged[k] = v;
      });
      merged.cn = cn;
      merged._comp = compMap[cn] || null;
      // X-RAY 대상 표시
      if (xrayMap[cn]) merged._xray = true;
      return merged;
    })
    .filter(isPtk);  // 평택분만

  const voyageInfo = voyage?.info || {};
  const shipImo = voyageInfo.imo || '';
  const shipName = voyageInfo.vsl || '';
  const globalRowRange = null;
  const globalTiers = null;

  const count = containers.length;
  const modeKo = mode === 'discharge' ? '양하' : '선적';

  // 양하/선적 카운트 (탭 라벨용)
  const countMode = (m) => {
    const s = voyage?.[m] || {};
    const ed = s.ediContainers || {};
    const rc = s.records || {};
    const cnSet = new Set([...Object.keys(ed), ...Object.keys(rc)]);
    let n = 0;
    cnSet.forEach(cn => {
      const c = { ...(ed[cn] || {}), ...(rc[cn] || {}) };
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
    openInspectionListPrint(containers, mode, voyageInfo);
  };

  // 서브 모달 (카고플랜/베이 상세) 표시 중이면 그것만
  if (printSub === 'cargo') {
    return (
      <ErrorBoundary name="카고 플랜 인쇄" onClose={() => setPrintSub(null)}>
        <PrintableCargoPlan
          containers={containers}
          mode={mode}
          voyageInfo={voyageInfo}
          voyageKey={voyageKey}
          shipImo={shipImo}
          shipName={shipName}
          xrayMap={xrayMap}
          onClose={() => setPrintSub(null)}
        />
      </ErrorBoundary>
    );
  }
  if (printSub === 'detail') {
    return (
      <ErrorBoundary name="베이 상세 인쇄" onClose={() => setPrintSub(null)}>
        <PrintableBayDetail
          containers={containers}
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
