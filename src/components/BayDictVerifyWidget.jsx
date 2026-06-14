// 베이사전 검증 위젯 (통계 탭) — 베이 탭(BayDictStatusWidget)과 동일 사전 조회로 일치.
// V7.96: lookupBayDict(정적 .def 사전만) → getShipBayDictData(Firebase/user/v2/v5)로 교체.
//   증상: 같은 MCSN인데 베이 탭은 "매칭됨", 통계 탭은 "미등록"으로 모순.
//   원인: 통계 탭만 옛 정적 사전(SHIP_BAY_DICT)을 봤고, 사용자 매트릭스(baysSummary)는 안 봄.
//   추가로 matrixBuilder 구조는 bayDef.bays[].idx가 아니라 baysSummary[].bayNo에 데이터가 있음.
import React, { useMemo } from 'react';
import { getShipBayDictData } from '../shipStructure.js';
import { Database, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function BayDictVerifyWidget({ shipInfo, ediContainers }) {
  const result = useMemo(() => {
    if (!shipInfo) return { status: 'no-ship' };

    // EDI 베이 번호 집합 (정규화: 앞 0 제거한 정수)
    const containers = Array.isArray(ediContainers) ? ediContainers : Object.values(ediContainers || {});
    const ediBayNums = new Set();
    containers.forEach(c => {
      if (c && c.bay != null && c.bay !== '') {
        const num = parseInt(c.bay, 10);
        if (!isNaN(num)) ediBayNums.add(num);
      }
    });

    // 베이 탭과 동일 함수로 조회 (EDI 베이수 힌트 전달 → 같은 배 여러 벌 중 알맹이 선택)
    const dict = getShipBayDictData(shipInfo.imo, shipInfo.name, {
      vslFull: shipInfo.name,
      ediBayCount: ediBayNums.size || undefined,
    });
    if (!dict) {
      return { status: 'not-registered', shipName: shipInfo.name, imo: shipInfo.imo };
    }

    // 사전이 아는 베이 번호 집합 (matrix_builder: baysSummary[].bayNo, 폴백: bayList)
    const summary = dict.bayDef?.baysSummary || [];
    const knownBayNums = new Set();
    if (summary.length > 0) {
      summary.forEach(b => {
        const n = parseInt(b.bayNo ?? b.bayNum ?? b.bay, 10);
        if (!isNaN(n)) knownBayNums.add(n);
      });
    } else {
      (dict.bayDef?.bayList || []).forEach(v => {
        const n = parseInt(v, 10);
        if (!isNaN(n)) knownBayNums.add(n);
      });
    }

    // 매칭률: EDI 베이가 사전 베이(또는 페어 묶인 짝수)에 들어가는 비율
    let matched = 0;
    ediBayNums.forEach(num => {
      if (knownBayNums.has(num)) { matched++; return; }
      // 짝수 bay는 pairEven으로 홀수 bay에 묶임 → 홀수 bay가 사전에 있으면 매칭
      if (num % 2 === 0 && summary.some(b => parseInt(b.pairEven, 10) === num)) matched++;
    });
    const total = ediBayNums.size;
    const rate = total > 0 ? (matched / total) : 1;

    return {
      status: 'matched',
      shipName: dict.name || shipInfo.name,
      imo: dict.imo || shipInfo.imo,
      matchedBy: dict.matchedBy || dict.source || '',
      dictBayCount: knownBayNums.size,
      ediBayCount: total,
      matched,
      rate,
      verified: dict.verified || dict.bayDef?.verified || false,
      isUser: dict.source === 'user' || dict.bayDef?._userOwned === true,
    };
  }, [shipInfo, ediContainers]);

  if (result.status === 'no-ship') return null;

  // 베이사전 미등록 — 어떤 사전에도 없음
  if (result.status === 'not-registered') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"/>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-300">베이사전 미등록</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {result.shipName || result.imo || '이 선박'}은 베이사전이 없습니다.
              EDI 좌표 기반으로 베이플랜 자동 형성됩니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 매칭됨
  const ratePct = (result.rate * 100).toFixed(0);
  const isGood = result.rate >= 0.95;
  const isOK = result.rate >= 0.7;
  const color = isGood ? 'emerald' : isOK ? 'amber' : 'red';

  return (
    <div className={`bg-slate-900 border border-${color}-700/40 rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        {isGood ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"/>
        ) : (
          <AlertTriangle className={`w-4 h-4 text-${color}-400 flex-shrink-0 mt-0.5`}/>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="w-3 h-3 text-slate-400"/>
            <span className="text-xs font-bold text-slate-200">베이사전 매칭</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black bg-${color}-900/60 text-${color}-200`}>
              {ratePct}%
            </span>
            {result.isUser ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900/50 text-cyan-200">사용자 매트릭스</span>
            ) : !result.verified && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300">미검증</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {result.shipName} (IMO: {result.imo || '-'})
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 mono">
            EDI 베이 {result.ediBayCount}개 중 {result.matched}개 매칭
            <span className="text-slate-600"> · 사전 {result.dictBayCount}개 보유</span>
          </div>
          {!isGood && (
            <div className={`text-[10px] text-${color}-300 mt-1`}>
              {result.rate < 0.7
                ? '⚠️ 매칭률 낮음 — 베이 번호 매핑 재검토 필요'
                : '⚠️ 일부 베이 매칭 안 됨 — 페어/추가 베이 확인 권장'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
