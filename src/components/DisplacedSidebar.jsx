// M4.9e 3단계: 이름표가 내려온 컨 사이드바 (구 「자리 뺏긴 컨테이너」)
// TallyOne 1.55: 자리를 뺏은 것이 아니다 — 검수사 확정 2026-08-12.
//   *"이름만 빌려줬다고 이야기 한걸 잊으면 안됩니다. 그자리는 빈자리라고 분명히 이야길 했습니다."*
//   칸(방)은 안 없어지고 카고플랜 이름표도 안 변한다. 컨은 창고에서 자기 차례를 기다린다.
//   ⚠ prop 이름 `displaced` 는 호출부(VoyagePage)와 맞춰 그대로 둔다 — 문구만 개념에 맞춘다.
// M4.9f: 5단계 단순 — 카드에 "📦 이동" 버튼 추가
//   클릭 → onStartMove(c) 호출 → VoyagePage가 pendingMove 설정
//   이후 베이 그리드의 빈 셀 클릭하면 그 자리로 이동(fbSetActualPosition)
//   기존 카드 본문 클릭은 계속 모달(수정 위치 입력) 열기 — 두 진입점 공존
import React from 'react';
import { AlertTriangle, MapPin, ArrowRight, Move } from 'lucide-react';

export default function DisplacedSidebar({ displaced, onOpenContainer, onStartMove, pendingMoveCn }) {
  if (!displaced || displaced.length === 0) {
    return (
      <div className="bg-ink-800/40 border border-line rounded-pill p-3">
        <div className="text-xxs font-bold uppercase text-dim-300 mb-1">이름표가 내려온 컨</div>
        <div className="text-xs text-dim-400">없음</div>
      </div>
    );
  }

  return (
    <div className="bg-amber-900/20 border-2 border-amber-700/50 rounded-pill overflow-hidden">
      <div className="bg-amber-800/40 px-3 py-2 flex items-center gap-2 border-b border-amber-700/40">
        <AlertTriangle className="w-4 h-4 text-amber-300"/>
        <span className="text-xxs font-black uppercase text-amber-100">
          계획 자리를 내준 컨 {displaced.length}대 — 아직 안 실렸습니다
        </span>
      </div>
      <div className="text-2xs text-amber-200/70 px-3 py-1 border-b border-amber-700/30 leading-tight">
        📦 [이동] 누르면 → 베이그리드 빈 셀 클릭 / 카드 본문은 직접 입력
      </div>
      <div className="max-h-96 overflow-y-auto">
        {displaced.map(c => {
          const isPending = pendingMoveCn === c.cn;
          return (
            <div key={c.cn}
              className={`flex items-stretch border-b border-amber-700/20 ${
                isPending ? 'bg-amber-700/40 ring-2 ring-amber-300' : 'hover:bg-amber-800/20'
              } transition`}>
              {/* 본문 — 클릭 시 모달 (수정 위치 직접 입력) */}
              <button
                onClick={() => onOpenContainer && onOpenContainer(c)}
                className="flex-1 text-left px-3 py-2 active:bg-amber-800/40">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-black mono text-amber-100">{c.cn}</span>
                  <span className={`text-3xs px-1.5 py-0.5 rounded font-bold ${
                    c.fe === 'F' ? 'bg-emerald-700 text-emerald-50' : 'bg-ink-700 text-dim-100'
                  }`}>{c.fe || '?'}</span>
                </div>
                <div className="flex items-center gap-1 text-xxs text-amber-200/80">
                  <MapPin className="w-3 h-3 text-amber-400"/>
                  <span className="mono">
                    {c._bay_planned || c.bay || '--'}/
                    {c._row_planned || c.row || '--'}/
                    {c._tier_planned || c.tier || '--'}
                  </span>
                  {c._displacedBy && (
                    <>
                      <ArrowRight className="w-3 h-3 text-amber-400 mx-0.5"/>
                      <span className="text-2xs text-amber-300/70">
                        지금 {c._displacedBy}가 실려 있음
                      </span>
                    </>
                  )}
                </div>
              </button>
              {/* 📦 이동 버튼 — 클릭 시 pendingMove 진입 */}
              <button
                onClick={() => onStartMove && onStartMove(c)}
                className={`px-3 flex flex-col items-center justify-center gap-0.5 border-l border-amber-700/30 ${
                  isPending
                    ? 'bg-amber-500 text-ink-950'
                    : 'bg-amber-800/30 text-amber-200 hover:bg-amber-700/50 active:bg-amber-600'
                } transition`}
                title="이동 시작 — 빈 셀 누르세요"
              >
                <Move className="w-4 h-4"/>
                <span className="text-3xs font-black">{isPending ? '선택중' : '이동'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
