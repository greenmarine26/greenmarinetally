// 결과 카드 (실번호 거대 + 직접 완료 + 리퍼 온도 Full만)
import React, { useState, useMemo } from 'react';
import { Check, RotateCcw, Snowflake, AlertTriangle, AlertOctagon, MapPin } from 'lucide-react';
import { isoToLabel, fmtPos, isReeferContainer } from '../utils.js';
import { NUM_INPUT_PROPS } from '../inputUtils.js';
import { fbCompleteContainer, fbCancelComplete, fbReassignContainerPosition } from '../firebase.js';
import { speakDone, speak } from '../voice.js';
import { getBayPairs } from '../twin.js';
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
  const [posTarget, setPosTarget] = useState(null);   // V7.94-10: 위치 선택창 대상 컨 (c 또는 번호수정으로 고른 실제 컨)
  // V8.70: 출발지(계획 위치) 기준 트윈 짝꿍 자동 계산 제거 — 싱글 자리 배정에 유령 짝꿍이 붙어
  //   존재하지 않는 자리에 무단 배정·완료되던 원인. 트윈 배정은 PositionEditModal 안에서
  //   도착지(배정 자리) 기준 + 검수사의 "트윈 지정"으로만 이뤄진다.
  const posEditBayPairs = useMemo(() => {
    try { return getBayPairs(allContainers.filter(x => x._mode === c?._mode)); } catch { return null; }
  }, [allContainers, c]);

  // M3.87: 위치 수정 모달 (선적 모드)
  // V7.94-10: 컨테이너 번호 수정 — 다른 컨이 왔을 때: 실제 컨 검색·선택 → [위치 선택] → 남은 자리 창
  const [cnFixOpen, setCnFixOpen] = useState(false);
  const [cnFixQuery, setCnFixQuery] = useState('');
  const [cnFixPick, setCnFixPick] = useState(null);
  const cnFixMatches = useMemo(() => {
    const q = cnFixQuery.replace(/\s/g, '').toUpperCase();
    if (q.length < 3) return [];
    return allContainers.filter(x => x && x._mode === c._mode && !x._comp && x.cn !== c.cn &&
      (x.cn.includes(q) || (x.l4 || x.cn.slice(-4)).includes(q))).slice(0, 6);
  }, [cnFixQuery, allContainers, c]);
  const isLoading = c._mode === 'loading';

  const labelMap = {
    amber: 'bg-amber-700 text-amber-50',
    cyan: 'bg-cyan-700 text-cyan-50',
  };

  // V7.99-16: 누락 완료 — 신고 리스트엔 있으나 선박에 없는 컨. 'missing' flag로 완료 기록.
  const handleMissing = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    askConfirm({
      title: '누락 처리',
      message: `${c.cn}\n선박에 없는 컨테이너로 기록하고 완료합니다.\n(양하신고 점검에 '누락'으로 잡힙니다)`,
      confirmLabel: '누락 완료',
      cancelLabel: '취소',
      onConfirm: async () => {
        await fbCompleteContainer(voyageKey, c._mode, c.cn, inspector, 'missing', '선박에 없음');
        speak(`${(c.cn || '').slice(-4)} 누락 처리`, { conversational: true });
        if (onAfterComplete) setTimeout(() => onAfterComplete(c), 500);
      },
    });
  };

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const isDischarge = c._mode === 'discharge';
    const verb = isDischarge ? '양하확인' : '선적확인';
    if (isDone) {
      askConfirm({
        title: `${verb} 취소`,
        message: `${c.cn}\n${verb}을 취소하시겠습니까?`,
        confirmLabel: '취소',
        cancelLabel: '닫기',
        onConfirm: async () => {
          await fbCancelComplete(voyageKey, c._mode, c.cn);
        },
      });
    } else {
      // V8.09-06: XRAY 대상은 XRAY 실번호(seal) 입력 전까지 양하확인 차단.
      if (isDischarge && c._xray && !String(c._xraySeal?.seal || '').trim()) {
        alert(`XRAY 실번호를 먼저 입력하세요.\n${c.cn?.slice(-4)}은 XRAY 대상으로 실번호 입력 전까지 양하확인할 수 없습니다.`);
        return;
      }
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
            c._mode === 'discharge' ? 'bg-blue-900 text-blue-200'
            : c._mode === 'loading' ? 'bg-amber-900 text-amber-200'
            : 'bg-gray-700 text-gray-300'
          }`}>
            {c._mode === 'discharge' ? '양하'
              : c._mode === 'loading' ? '선적'
              : '중계'}
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
        {isDone
          ? <><RotateCcw className="w-5 h-5"/>{c._mode === 'discharge' ? '양하확인 취소' : '선적확인 취소'}</>
          : <><Check className="w-5 h-5"/>{c._mode === 'discharge' ? '양하확인' : '선적확인'}</>
        }
      </button>

      {/* V7.99-16: 양하 모드 — 선박에 없는 컨(누락) 처리. V8.09-17: 양하 전용 — 선적엔 위치/번호수정이 따로 있어 누락 버튼이 뜨면 안 됨(메모1). */}
      {!isLoading && !isDone && c._mode === 'discharge' && (
        <button onClick={handleMissing}
          className="w-full mt-2 py-2.5 rounded-lg font-black text-sm bg-slate-800 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center justify-center gap-1.5">
          🚫 선박에 없음 (누락 처리)
        </button>
      )}

      {/* M3.87: 선적 모드 - 위치 수정 버튼 (위치 다른 자리로 보내거나 미배정 처리) */}
      {isLoading && (
        <button onClick={() => setPosTarget(c)}
          className="w-full mt-2 py-2.5 rounded-lg font-black text-sm bg-amber-700 hover:bg-amber-600 text-amber-50 flex items-center justify-center gap-1.5">
          <MapPin className="w-4 h-4"/>위치 수정 (같은 컨, 자리만 변경)
        </button>
      )}
      {isLoading && !cnFixOpen && (
        <button onClick={() => { setCnFixOpen(true); setCnFixQuery(''); setCnFixPick(null); }}
          className="w-full mt-2 py-2.5 rounded-lg font-black text-sm bg-slate-800 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center justify-center gap-1.5">
          <RotateCcw className="w-4 h-4"/>컨테이너 번호 수정 (다른 컨이 옴)
        </button>
      )}
      {isLoading && cnFixOpen && (
        <div className="mt-2 bg-slate-900 border border-cyan-800 rounded-lg p-2 space-y-2">
          <div className="text-[11px] text-cyan-300 font-bold">실제 온 컨테이너 번호 (끝 4자리 이상)</div>
          {cnFixPick ? (
            <>
              <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-700 rounded px-2 py-2">
                <div>
                  <div className="mono text-sm font-bold text-cyan-200">{cnFixPick.cn}</div>
                  <div className="text-[10px] mono text-slate-400">
                    계획 {cnFixPick.bay ? `${parseInt(cnFixPick.bay, 10)}-${cnFixPick.row}-${cnFixPick.tier}` : '미배정'} · {cnFixPick.pod || '-'}
                    {cnFixPick.bay && c.bay && parseInt(cnFixPick.bay, 10) !== parseInt(c.bay, 10) &&
                      <span className="ml-1 px-1 rounded bg-amber-800 text-amber-200 font-bold">⚠ 다른 베이</span>}
                  </div>
                </div>
                <button onClick={() => setCnFixPick(null)} className="text-[11px] text-slate-400 px-1.5">✕</button>
              </div>
              <button onClick={() => { setPosTarget(cnFixPick); setCnFixOpen(false); }}
                className="w-full py-2.5 rounded-lg font-black text-sm bg-cyan-700 hover:bg-cyan-600 text-white flex items-center justify-center gap-1.5">
                <MapPin className="w-4 h-4"/>위치 선택 →
              </button>
            </>
          ) : (
            <>
              <input autoFocus value={cnFixQuery} onChange={e => setCnFixQuery(e.target.value)} {...NUM_INPUT_PROPS}
                placeholder="예: 1234 또는 SKLU1972626"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm mono text-slate-100"/>
              {cnFixMatches.map(x => (
                <button key={x.cn} onClick={() => setCnFixPick(x)}
                  className="w-full flex justify-between items-center bg-slate-800 hover:bg-cyan-900 rounded px-2 py-1.5 text-xs">
                  <span className="mono font-bold text-slate-100">{x.cn}</span>
                  <span className="mono text-slate-400">
                    {x.bay ? `${parseInt(x.bay, 10)}-${x.row}-${x.tier}` : '미배정'} · {x.pod || '-'}
                  </span>
                </button>
              ))}
              {cnFixQuery.length >= 3 && cnFixMatches.length === 0 &&
                <div className="text-[11px] text-slate-500 text-center">남은 작업분에 일치하는 컨이 없습니다.</div>}
            </>
          )}
          <button onClick={() => setCnFixOpen(false)} className="w-full text-[11px] text-slate-400 py-1">닫기</button>
        </div>
      )}

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />

      {/* M3.87: 위치 수정 모달 */}
      <PositionEditModal
        open={!!posTarget}
        container={posTarget || c}
        allContainers={allContainers}
        onClose={() => setPosTarget(null)}
        onSave={async (newBay, newRow, newTier) => {
          if (!inspector) { alert('검수원을 먼저 선택하세요'); return { ok: false }; }
          const result = await fbReassignContainerPosition(voyageKey, c._mode, (posTarget || c).cn, newBay, newRow, newTier, inspector);
          return result;
        }}
        bayPairs={posEditBayPairs}
        onSavePartner={async (cn, b2, r2, t2) => fbReassignContainerPosition(voyageKey, c._mode, cn, b2, r2, t2, inspector)}
        onCompleteBoth={async (cns) => {
          for (const cn of cns) await fbCompleteContainer(voyageKey, c._mode, cn, inspector);
          // V8.70: 자동 선적확인에도 완료 음성·화면 정리 — 무음이라 "처리 안 된 줄" 오해하던 문제.
          cns.forEach((cn2, i) => setTimeout(() => speakDone({ cn: cn2 }), i * 900));
          if (onAfterComplete) setTimeout(() => onAfterComplete(c), 600);
        }}
      />
    </div>
  );
}
