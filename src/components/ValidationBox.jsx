import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ValidationBox({ ediContainers, records, mode }) {
  const v = useMemo(() => {
    if (!ediContainers || ediContainers.length === 0) return null;
    const isPtk = (c) => {
      if (mode === 'discharge') return (c.pod || '').toUpperCase().endsWith('PTK');
      return (c.pol || '').toUpperCase().endsWith('PTK');
    };
    const ptkInEdi = ediContainers.filter(isPtk);
    const recCns = new Set((records || []).map(r => r.cn));
    const ediCns = new Set(ediContainers.map(c => c.cn));
    const missingInList = ptkInEdi.filter(c => !recCns.has(c.cn));
    const extraInList = (records || []).filter(r => !ediCns.has(r.cn));

    // 선사별 누락
    const missingByOp = {};
    missingInList.forEach(c => {
      const op = c.op || '미지정';
      missingByOp[op] = (missingByOp[op] || 0) + 1;
    });

    // 선사별 추가
    const extraByOp = {};
    extraInList.forEach(r => {
      const op = r.op || '미지정';
      extraByOp[op] = (extraByOp[op] || 0) + 1;
    });

    return {
      ediTotal: ediContainers.length,
      ptkTotal: ptkInEdi.length,
      listTotal: (records || []).length,
      matched: ptkInEdi.filter(c => recCns.has(c.cn)).length,
      missingCount: missingInList.length,
      missingByOp,
      missingDetails: missingInList.slice(0, 5),
      extraCount: extraInList.length,
      extraByOp,
      extraDetails: extraInList.slice(0, 5),
    };
  }, [ediContainers, records, mode]);

  if (!v) return null;
  const allOk = v.missingCount === 0 && v.extraCount === 0 && v.listTotal > 0;

  return (
    <div className={`rounded-lg p-3 ${
      allOk ? 'bg-emerald-950/40 border border-emerald-800' : 'bg-slate-900 border border-slate-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {allOk ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400"/>
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400"/>
        )}
        <div className="text-xs font-bold text-slate-200">
          데이터 검증 (EDI ↔ 리스트)
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-2">
        <div className="bg-slate-800/60 rounded p-1.5">
          <div className="text-slate-500 text-[10px]">EDI 평택</div>
          <div className="text-amber-300 font-black mono">{v.ptkTotal}</div>
        </div>
        <div className="bg-slate-800/60 rounded p-1.5">
          <div className="text-slate-500 text-[10px]">리스트</div>
          <div className="text-slate-200 font-black mono">{v.listTotal}</div>
        </div>
        <div className="bg-slate-800/60 rounded p-1.5">
          <div className="text-slate-500 text-[10px]">매칭</div>
          <div className="text-emerald-400 font-black mono">{v.matched}</div>
        </div>
      </div>

      {v.missingCount > 0 && (
        <div className="bg-red-950/40 border border-red-800/50 rounded p-2 mb-2">
          <div className="text-[11px] text-red-300 font-bold mb-1.5">
            🚢 EDI 평택 대상 → 리스트에 없음: {v.missingCount}대
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 rounded p-1.5 mb-1.5">
            <div className="text-[10px] text-amber-300/80 mb-1">▼ 선사별 누락 (해당 검수업체 리스트 추가 필요)</div>
            {Object.entries(v.missingByOp).sort((a, b) => b[1] - a[1]).map(([op, n]) => (
              <div key={op} className="flex items-center gap-1.5 text-amber-200 text-[11px] font-bold">
                <span className="bg-amber-700/60 text-amber-100 px-1.5 py-0.5 rounded text-[10px] mono">{op}</span>
                <span>{n}대</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-orange-300/70 mb-0.5">샘플:</div>
          {v.missingDetails.map((c, i) => (
            <div key={i} className="text-[10px] text-orange-200 mono">
              • {c.cn} ({c.op || '?'}) {c.bay ? `${c.bay}-${c.row}-${c.tier}` : ''}
            </div>
          ))}
          {v.missingCount > 5 && <div className="text-[10px] text-red-400/60">... 외 {v.missingCount - 5}대</div>}
        </div>
      )}

      {v.extraCount > 0 && (
        <div className="bg-orange-950/40 border border-orange-800/50 rounded p-2">
          <div className="text-[11px] text-orange-300 font-bold mb-1.5">
            📋 리스트에 있는데 EDI에 없음: {v.extraCount}대
          </div>
          {Object.entries(v.extraByOp).sort((a, b) => b[1] - a[1]).map(([op, n]) => (
            <div key={op} className="text-[11px] text-orange-200 ml-1">
              • {op}: {n}대 (해당 선사 EDI 추가 필요)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
