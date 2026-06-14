// M4.1: 베이사전 검증 위젯 (V7.95-02: 데이터소스 통일)
// EDI 컨테이너의 베이 번호와 베이사전(baysSummary)의 베이 번호 매칭률을 표시
// 베이 탭(BayDictStatusWidget)과 동일하게 getShipBayDictData로 조회 — 통계/베이 탭 일치
// 검수 시작 전 베이사전이 정확한지 빠르게 확인

import React, { useMemo } from 'react';
import { getShipBayDictData } from '../shipStructure.js';
import { Database, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function BayDictVerifyWidget({ shipInfo, ediContainers }) {
  const result = useMemo(() => {
    if (!shipInfo) return { status: 'no-ship' };

    // V7.95-02: 베이 탭(BayDictStatusWidget)과 동일 함수로 조회.
    //   (옛 lookupBayDict는 정적 .def 내장 사전만 봐서 Firebase/매트릭스 빌더 등록분을
    //    "미등록"으로 잘못 표시 — 베이 탭은 "매칭됨"인데 통계 탭만 어긋나던 버그.)
    const dict = getShipBayDictData(shipInfo.imo, shipInfo.name);
    if (!dict) {
      return {
        status: 'not-registered',
        shipName: shipInfo.name,
        imo: shipInfo.imo,
      };
    }

    // 베이사전이 보유한 베이 번호 집합 (baysSummary 기준 — 매트릭스 빌더/Firebase 구조).
    //   옛 코드는 bayDef.bays[].idx(.def 전용 필드)를 읽어 matrix_builder본에선 항상 비어 0%.
    const summary = dict.bayDef?.baysSummary || [];
    const knownBays = new Set();
    summary.forEach(b => {
      const n = parseInt(b.bayNum, 10);
      if (!isNaN(n)) knownBays.add(n);
    });

    // EDI 컨테이너가 사용 중인 베이 번호 집합 (숫자로 변환).
    const ediBayNums = new Set();
    const containers = Array.isArray(ediContainers)
      ? ediContainers
      : Object.values(ediContainers || {});
    containers.forEach(c => {
      if (c.bay) {
        const num = parseInt(c.bay, 10);
        if (!isNaN(num)) ediBayNums.add(num);
      }
    });

    // 매칭: 직접 보유하면 매칭. 짝수(40ft 페어) 베이는 양옆 홀수(20ft)로 표현될 수 있으므로
    //   직접 없을 때 n±1 보유로 인정 (앱 pairEven 모델: 짝수 e + 인접 홀수 페어).
    let matched = 0;
    ediBayNums.forEach(n => {
      const hit = knownBays.has(n)
        || (n % 2 === 0 && (knownBays.has(n - 1) || knownBays.has(n + 1)));
      if (hit) matched++;
    });

    const total = ediBayNums.size;
    const rate = total > 0 ? (matched / total) : 0;

    return {
      status: 'matched',
      shipName: dict.name,
      imo: shipInfo.imo,
      dictBayCount: dict.bayDef?.recordCount || summary.length,
      ediBayCount: total,
      matched,
      rate,
      verified: dict.bayDef?.verified || dict.verified || false,
    };
  }, [shipInfo, ediContainers]);

  if (result.status === 'no-ship') return null;

  // 베이사전 미등록
  if (result.status === 'not-registered') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"/>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-300">베이사전 미등록</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {result.shipName || result.imo || '이 선박'}은 베이사전이 등록되지 않았습니다.
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
            {!result.verified && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300">
                미검증 v1.1
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {result.shipName} (IMO: {result.imo || '-'})
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 mono">
            EDI 베이 {result.ediBayCount}개 중 {result.matched}개 베이사전 매칭
            <span className="text-slate-600"> · 사전 {result.dictBayCount}개 보유</span>
          </div>
          {!isGood && (
            <div className={`text-[10px] text-${color}-300 mt-1`}>
              {result.rate < 0.7
                ? '⚠️ 매칭률 낮음 — 베이매트릭스 베이 번호 ↔ EDI 베이 매핑 재검토 필요'
                : '⚠️ 일부 베이 매칭 안 됨 — 매트릭스 빌더에서 베이 확정 권장'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
