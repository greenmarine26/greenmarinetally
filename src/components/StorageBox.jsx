// M5.1 I: 보관함 박스
//   bay_actual === '__STG__' 인 컨들을 별도 박스에 표시
//   카드 우측 [📦 이동] 버튼 — 다시 베이 그리드로 보내기 (DisplacedSidebar와 같은 패턴)
//   카드 본문 클릭 — 컨 모달 (수정 위치 직접 입력)
//   헤더 [일괄 복원] — 모두 bay_actual 클리어 → 계획 위치로 돌아감
//
// ── TallyOne 1.54: **여기 있는 컨은 계획이 살아 있다.** (검수사 확정 2026-08-12) ──
//   원문 — *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
//         *"계획된 자리가 다른 컨으로 선적이 되었다면 그걸로 끝입니다. 그냥 몸만 창고로 가면 됩니다."*
//   1.54 부터 계획 자리를 내준 컨은 `bay/row/tier`(계획)를 **그대로 둔 채** 실체만 `__STG__` 가 된다.
//   그런데 VoyagePage 가 그림에서 빼려고 `bay` 를 비우고 계획을 `_bay_planned` 로 옮기므로,
//   여기서 `c.bay` 만 읽으면 **계획이 늘 `--/--/--` 로 보인다.** `_bay_planned` 를 먼저 읽는다.
//   ⛔ 「자리 미지정」과 「창고」는 다른 상태다 — 이름 걸린 자리를 함께 적어 구분되게 한다.
import React from 'react';
import { Archive, MapPin, Move, RotateCcw } from 'lucide-react';

export default function StorageBox({ stored, onOpenContainer, onStartMove, pendingMoveCn, onBatchRestore }) {
  if (!stored || stored.length === 0) return null;

  return (
    <div className="bg-ink-800/40 border-2 border-line-strong/50 rounded-pill overflow-hidden">
      <div className="bg-ink-750/50 px-3 py-2 flex items-center gap-2 border-b border-line-strong/40">
        <Archive className="w-4 h-4 text-dim-100"/>
        <span className="text-xxs font-black uppercase text-dim-100 flex-1">
          계획 자리를 내준 컨 {stored.length}대 <span className="font-normal text-dim-300 normal-case">— 야적장에서 대기 중입니다. 실을 자리를 정해 주세요</span>
        </span>
        {onBatchRestore && (
          <button onClick={onBatchRestore}
            className="px-2 py-0.5 bg-ink-900/60 hover:bg-ink-850 text-dim-100 rounded text-2xs font-bold flex items-center gap-1"
            title="이 컨들을 원래 계획 자리로 되돌립니다">
            <RotateCcw className="w-3 h-3"/>일괄 복원
          </button>
        )}
      </div>
      <div className="text-2xs text-dim-300 px-3 py-1 border-b border-line/30 leading-tight">
        📦 [이동] 누르면 → 베이그리드 빈 셀 클릭 / 카드 본문은 직접 입력
      </div>
      <div className="max-h-72 overflow-y-auto">
        {stored.map(c => {
          const isPending = pendingMoveCn === c.cn;
          return (
            <div key={c.cn}
              className={`flex items-stretch border-b border-line/20 ${
                isPending ? 'bg-ink-700/40 ring-2 ring-amber-300' : 'hover:bg-ink-750/20'
              } transition`}>
              <button
                onClick={() => onOpenContainer && onOpenContainer(c)}
                className="flex-1 text-left px-3 py-2 active:bg-ink-700/40">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-black mono text-dim-100">{c.cn}</span>
                  <span className={`text-3xs px-1.5 py-0.5 rounded font-bold ${
                    c.fe === 'F' ? 'bg-emerald-700 text-emerald-50' : 'bg-ink-700 text-dim-100'
                  }`}>{c.fe || '?'}</span>
                </div>
                {/* 1.54: 계획은 살아 있다 — `_bay_planned` 를 먼저 읽는다(VoyagePage 가 그림용으로 bay 를 비운다). */}
                {(() => {
                  const pb = c._bay_planned || c.bay || '';
                  const pr = c._row_planned || c.row || '';
                  const pt = c._tier_planned || c.tier || '';
                  const has = pb && pr && pt;
                  return (
                    <div className="flex items-center gap-1 text-xxs text-dim-200/80">
                      <MapPin className="w-3 h-3 text-dim-300"/>
                      <span className="mono">
                        {has
                          ? `창고 · 이름 걸린 자리 ${String(parseInt(pb, 10)).padStart(2, '0')}-${pr}-${pt}`
                          : '야적장 대기 · 걸린 자리 없음'}
                      </span>
                    </div>
                  );
                })()}
              </button>
              <button
                onClick={() => onStartMove && onStartMove(c)}
                className={`px-3 flex flex-col items-center justify-center gap-0.5 border-l border-line/30 ${
                  isPending
                    ? 'bg-amber-500 text-ink-950'
                    : 'bg-ink-750/30 text-dim-100 hover:bg-ink-700/50 active:bg-ink-700'
                } transition`}
                title="베이 그리드 빈 셀로 이동"
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
