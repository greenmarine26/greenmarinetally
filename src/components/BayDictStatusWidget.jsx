// 베이사전 검증 위젯 (M4.1 신규)
// 현재 항차의 선박이 베이사전(.def)에 등록되어 있는지 표시 + 매핑률 통계
// 데이터 흐름: VoyagePage → 이 위젯이 voyage.info.imo로 베이사전 조회

import React, { useMemo } from 'react';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { isShipInBayDict, getShipBayDictData } from '../shipStructure.js';

export default function BayDictStatusWidget({ shipImo, shipName, ediContainerCount = 0 }) {
  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    return getShipBayDictData(shipImo, shipName);
  }, [shipImo, shipName]);

  if (!dictData) {
    // 베이사전 미등록 선박
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2 text-xs">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1">
          <span className="text-slate-400 font-bold">베이사전 미등록</span>
          <span className="text-slate-500 ml-2">EDI 좌표 기반 베이 골격으로 작동</span>
        </div>
        <span className="text-[10px] text-slate-600 mono">v1.1</span>
      </div>
    );
  }

  // 베이사전 등록된 선박
  const bayDef = dictData.bayDef || {};
  const bayCount = bayDef.recordCount || 0;
  const verified = bayDef.verified || false;

  return (
    <div className="bg-cyan-950/30 border border-cyan-700/50 rounded-lg p-2.5 flex items-center gap-2 text-xs">
      <Database className="w-4 h-4 text-cyan-400 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-cyan-300 font-black">📚 베이사전 매칭</span>
          {verified ? (
            <span className="bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />검증됨
            </span>
          ) : (
            <span className="bg-amber-700/60 text-amber-100 px-1.5 py-0.5 rounded text-[9px] font-black">
              검증 전 (v1.1)
            </span>
          )}
        </div>
        <div className="text-[10px] text-cyan-400/80 mt-0.5 mono">
          {dictData.name} · {bayCount}개 베이 정의
          {ediContainerCount > 0 && ` · EDI ${ediContainerCount}대`}
        </div>
      </div>
      <div className="text-right text-[10px] text-cyan-500/70">
        <div className="mono">{dictData.code || '?'}</div>
        {dictData.specs?.loa && <div>LOA {dictData.specs.loa}m</div>}
      </div>
    </div>
  );
}
