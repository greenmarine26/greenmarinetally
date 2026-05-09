// M4.9e 3단계: 자리 뺏긴 컨테이너 사이드바
//   사용자 요청: "수정 때문에 자리 뺏긴 컨테이너들을 모아 놓아주세요"
//   현재 빌드: 검출 + 표시 + 카드 클릭 → 모달 열기 (수정 위치 입력 유도)
//   다음 빌드 예정: PC 마우스 드래그 영역 선택, 보관박스 ↔ 셀 DnD
import React from 'react';
import { AlertTriangle, MapPin, ArrowRight } from 'lucide-react';

export default function DisplacedSidebar({ displaced, onOpenContainer }) {
  if (!displaced || displaced.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
        <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">자리 뺏긴 컨테이너</div>
        <div className="text-xs text-slate-500">없음</div>
      </div>
    );
  }

  return (
    <div className="bg-amber-900/20 border-2 border-amber-700/50 rounded-lg overflow-hidden">
      <div className="bg-amber-800/40 px-3 py-2 flex items-center gap-2 border-b border-amber-700/40">
        <AlertTriangle className="w-4 h-4 text-amber-300"/>
        <span className="text-[11px] font-black uppercase text-amber-100">
          자리 뺏긴 컨테이너 {displaced.length}대
        </span>
      </div>
      <div className="text-[10px] text-amber-200/70 px-3 py-1 border-b border-amber-700/30 leading-tight">
        다른 컨이 이 자리로 이동했음 — 새 위치를 결정해 주세요
      </div>
      <div className="max-h-96 overflow-y-auto">
        {displaced.map(c => (
          <button key={c.cn}
            onClick={() => onOpenContainer && onOpenContainer(c)}
            className="w-full text-left px-3 py-2 border-b border-amber-700/20 hover:bg-amber-800/20 active:bg-amber-800/40 transition">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-black mono text-amber-100">{c.cn}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                c.fe === 'F' ? 'bg-emerald-700 text-emerald-50' : 'bg-slate-600 text-slate-200'
              }`}>{c.fe || '?'}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-200/80">
              <MapPin className="w-3 h-3 text-amber-400"/>
              <span className="mono">
                {c._bay_planned || c.bay || '--'}/
                {c._row_planned || c.row || '--'}/
                {c._tier_planned || c.tier || '--'}
              </span>
              {c._displacedBy && (
                <>
                  <ArrowRight className="w-3 h-3 text-amber-400 mx-0.5"/>
                  <span className="text-[10px] text-amber-300/70">
                    {c._displacedBy} 점유
                  </span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
