// 결과 카드 (실번호 거대 + 직접 완료 + 리퍼 온도 Full만)
import React, { useState } from 'react';
import { Check, RotateCcw, Snowflake, AlertTriangle, AlertOctagon, MapPin } from 'lucide-react';
import { isoToLabel, fmtPos, isReeferContainer } from '../utils.js';
import { fbCompleteContainer, fbCancelComplete, fbReassignContainerPosition } from '../firebase.js';
import { speakDone } from '../voice.js';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import PositionEditModal from './PositionEditModal.jsx';

export default function BigResultCard({ c, onOpen, onAfterComplete, voyageKey, inspector, label, labelColor = 'amber', allContainers = [] }) {
  const isDone = !!c._comp;
  const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
  const sealError = c.sl && slOrig && c.sl !== slOrig;
  const isReefer = isReeferContainer(c);
  const hasTmp = c.tmp != null && String(c.tmp).trim() !== '';
  // 리퍼 + 온도 있으면 무조건 표시 (Empty + 온도는 현장에 없음)
  // 온도 자체가 Full의 증거 - F/E 데이터가 잘못되어 있어도 온도 표시
  const showTmp = isReefer && hasTmp;

  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  // M3.87: 위치 수정 모달 (선적 모드)
  const [showPosEdit, setShowPosEdit] = useState(false);
  const isLoading = c._mode === 'loading';

  const labelMap = {
    amber: 'bg-amber-700 text-amber-50',
    cyan: 'bg-cyan-700 text-cyan-50',
  };

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (isDone) {
      askConfirm({
        title: '완료 취소',
        message: `${c.cn}\n검수 완료를 취소하시겠습니까?`,
        confirmLabel: '취소',
        cancelLabel: '닫기',
        onConfirm: async () => {
          await fbCancelComplete(voyageKey, c._mode, c.cn);
        },
      });
    } else {
      await fbCompleteContainer(voyageKey, c._mode, c.cn, inspector);
      speakDone(c);
      // 완료 후 자동 비우기 콜백
      if (onAfterComplete) {
        setTimeout(() => onAfterComplete(c), 500);
      }
    }
  };

  return (
    <div className={`bg-slate-900 border-2 rounded-xl p-3 ${
      sealError ? 'border-red-600 bg-red-950/30' :
      isDone ? 'border-emerald-600 bg-emerald-950/30' :
      c._xray ? 'border-purple-600 bg-purple-950/20' :
      'border-amber-600 bg-amber-950/10'
    }`}>
      <button onClick={onOpen} className="w-full text-left">
        {/* M3.86: 라벨/모드 배지만 한 줄에 (컨번호는 다음 줄에 크게) */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {label && <span className={`${labelMap[labelColor]} px-2 py-0.5 rounded text-[10px] font-black`}>{label}</span>}
          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
            c._mode === 'discharge' ? 'bg-blue-900 text-blue-200' : 'bg-amber-900 text-amber-200'
          }`}>
            {c._mode === 'discharge' ? '양하' : '선적'}
          </span>
          {isDone && <span className="bg-emerald-700 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-black">✓완료</span>}
        </div>
        {/* M3.86: 컨번호 한 줄 별도, 크게 표시 (끝4 + 전체 컨번호) */}
        <div className="flex items-baseline gap-2 mb-3 px-1">
          <span className="text-3xl font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-lg sm:text-xl font-bold mono text-slate-200 truncate flex-1">{c.cn}</span>
        </div>

        {/* 1순위: 실번호 거대 + 반짝임 */}
        <div className={`bg-slate-950 rounded-lg p-3 mb-2 border-2 ${sealError ? 'border-red-500' : c.sl ? 'border-amber-700/50' : 'border-slate-700'}`}>
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
            <span>실번호 (Seal No)</span>
            {sealError && (
              <span className="bg-red-700 text-red-50 text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse flex items-center gap-0.5">
                <AlertOctagon className="w-2.5 h-2.5"/>실오류
              </span>
            )}
          </div>
          {sealError ? (
            <div>
              <div className="text-[10px] text-slate-500">원: <span className="text-slate-400 line-through mono">{slOrig}</span></div>
              <div className="text-3xl sm:text-4xl font-black mono text-red-300 tracking-wider text-center py-1 animate-pulse"
                style={{ textShadow: '0 0 20px rgba(248, 113, 113, 0.6)' }}>
                {c.sl}
              </div>
            </div>
          ) : (c.sl && (c.fe !== 'E' || c.sl.length >= 5)) ? (
            // 풀(또는 미정)일 때만 sl 표시. 엠티+짧은 sl(<5자)은 잘못된 데이터로 간주
            <div className="text-4xl sm:text-5xl font-black mono text-amber-300 tracking-wider text-center py-1 animate-pulse"
              style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.6)' }}>
              {c.sl}
            </div>
          ) : c.fe === 'E' ? (
            // M3.88: 엠티 컨테이너는 실번호 없는 게 정상 → 엠티 표시
            // M3.88.1: 엠티에 짧은/이상 sl이 들어있어도 무시 ("1", "TJM" 같은 잘못된 데이터)
            <div className="text-3xl font-black mono text-slate-300 text-center py-2 bg-slate-800/40 rounded">
              📦 엠티 (실번호 없음 정상)
              {c.sl && c.sl.length < 5 && (
                <div className="text-[10px] text-slate-500 italic mt-1">
                  (데이터 sl="{c.sl}" 무시 - 의심값)
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl font-bold mono text-slate-600 italic text-center py-2">
              ⚠ 실번호 미입력
            </div>
          )}
        </div>

        {/* 2순위: X-RAY */}
        {c._xray && (
          <div className="bg-purple-950 border-2 border-purple-500 rounded-lg p-2.5 mb-2 animate-pulse">
            <div className="text-center font-black text-lg text-purple-200 flex items-center justify-center gap-2">
              🔍 X-RAY 대상
            </div>
            {c._xraySeal?.seal && (
              <div className="text-center text-purple-300 mono text-sm mt-1">
                세관: {c._xraySeal.seal}
                {c._xraySeal.eseal && <span className="text-cyan-300"> / 전자: {c._xraySeal.eseal}</span>}
              </div>
            )}
          </div>
        )}

        {/* 3순위: 특수화물 */}
        {(isReefer || c.dg || c.fr || c.ot || c.tk) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {showTmp && <span className="bg-cyan-600 text-cyan-50 px-2 py-1 rounded font-black text-sm flex items-center gap-1"><Snowflake className="w-3.5 h-3.5"/>RF {c.tmp}°C</span>}
            {/* M3.75: 엠티 리퍼는 정상 - 경고 X */}
            {!showTmp && isReefer && c.fe === 'E' && (
              <span className="bg-cyan-800/60 text-cyan-200 px-2 py-1 rounded font-bold text-sm flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5"/>
                리퍼 엠티
              </span>
            )}
            {!showTmp && isReefer && c.fe !== 'E' && (
              <span className="bg-red-700 text-white px-2 py-1 rounded font-black text-sm flex items-center gap-1 animate-pulse border-2 border-red-400">
                <Snowflake className="w-3.5 h-3.5"/>
                <AlertTriangle className="w-3 h-3"/>
                리퍼 · 온도 미입력 ⚠️
              </span>
            )}
            {c.dg && <span className="bg-red-600 text-red-50 px-2 py-1 rounded font-black text-sm flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>DG{c.un ? ` UN${c.un}` : ''}</span>}
            {c.fr && <span className="bg-orange-600 text-orange-50 px-2 py-1 rounded font-black text-sm">FR (Flat Rack)</span>}
            {c.ot && <span className="bg-yellow-600 text-yellow-50 px-2 py-1 rounded font-black text-sm">OT (Open Top)</span>}
            {c.tk && <span className="bg-pink-600 text-pink-50 px-2 py-1 rounded font-black text-sm">TK (Tank)</span>}
          </div>
        )}

        {/* 부가 정보 */}
        <div className="flex items-center gap-2 text-[11px] mono flex-wrap text-slate-400 pt-2 border-t border-slate-800">
          {c.bay && <span className="text-amber-300 font-bold">{fmtPos(c)}</span>}
          <span>{isoToLabel(c.iso) || c.tp || ''}</span>
          <span className={c.fe === 'F' ? 'text-rose-400' : ''}>{c.fe || '?'}</span>
          {c.op && <span className="bg-slate-800 px-1 py-0.5 rounded">{c.op}</span>}
          {c.pol && <span>POL {c.pol}</span>}
          {c.pod && <span>POD {c.pod}</span>}
        </div>
      </button>

      {/* 완료 버튼 (직접 누르면 검색창 자동 비워짐) */}
      <button onClick={handleComplete}
        className={`w-full mt-3 py-3 rounded-lg font-black text-base flex items-center justify-center gap-1.5 ${
          isDone
            ? 'bg-rose-800 hover:bg-rose-700 text-rose-100'
            : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100'
        }`}>
        {isDone ? <><RotateCcw className="w-5 h-5"/>완료 취소</> : <><Check className="w-5 h-5"/>검수 완료</>}
      </button>

      {/* M3.87: 선적 모드 - 위치 수정 버튼 (위치 다른 자리로 보내거나 미배정 처리) */}
      {isLoading && (
        <button onClick={() => setShowPosEdit(true)}
          className="w-full mt-2 py-2.5 rounded-lg font-black text-sm bg-amber-700 hover:bg-amber-600 text-amber-50 flex items-center justify-center gap-1.5">
          <MapPin className="w-4 h-4"/>위치 수정 / 다른 자리에 배정
        </button>
      )}

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />

      {/* M3.87: 위치 수정 모달 */}
      <PositionEditModal
        open={showPosEdit}
        container={c}
        allContainers={allContainers}
        onClose={() => setShowPosEdit(false)}
        onSave={async (newBay, newRow, newTier) => {
          if (!inspector) { alert('검수원을 먼저 선택하세요'); return { ok: false }; }
          const result = await fbReassignContainerPosition(voyageKey, c._mode, c.cn, newBay, newRow, newTier, inspector);
          return result;
        }}
      />
    </div>
  );
}
