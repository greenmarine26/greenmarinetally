import React, { useState } from 'react';
import { X, Check, Edit3, Snowflake, AlertTriangle, MapPin, Volume2, RotateCcw } from 'lucide-react';
import { isoToLabel, formatWt, fmtPos } from '../utils.js';
import { speakContainer, speakDone } from '../voice.js';
import { fbCompleteContainer, fbCancelComplete, fbToggleXray, fbUpdateRecordSeal } from '../firebase.js';

export default function ContainerDetailModal({ c, comp, isXray, xraySeal, mode, voyageKey, voyageInfo, inspector, onClose }) {
  const [editingSeal, setEditingSeal] = useState(false);
  const [sealVal, setSealVal] = useState(c.sl || '');

  const isDone = !!comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const isFR = c.fr || c.oog;
  const isOT = c.ot;
  const isTK = c.tk;
  const isDG = c.dg;

  const handleComplete = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (isDone) {
      if (!confirm(`${c.cn} 완료를 취소하시겠습니까?`)) return;
      await fbCancelComplete(voyageKey, mode, c.cn);
    } else {
      await fbCompleteContainer(voyageKey, mode, c.cn, inspector);
      speakDone(c);
    }
  };

  const handleSpeak = () => {
    speakContainer(c, { xray: isXray });
  };

  const handleSaveSeal = async () => {
    await fbUpdateRecordSeal(voyageKey, mode, c.cn, sealVal.trim());
    setEditingSeal(false);
  };

  const handleToggleXray = async () => {
    if (mode !== 'discharge') return;
    await fbToggleXray(voyageKey, c.cn);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className={`sticky top-0 px-4 py-3 border-b border-slate-700 flex items-center justify-between ${
          isDone ? 'bg-emerald-950' :
          isXray ? 'bg-purple-950' :
          mode === 'discharge' ? 'bg-blue-950' : 'bg-amber-950'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-3xl font-black mono text-amber-300 tracking-wider">{c.l4 || c.cn?.slice(-4)}</span>
            <button onClick={handleSpeak} className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-700">
              <Volume2 className="w-4 h-4 text-amber-300"/>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400"/>
          </button>
        </div>

        {/* 컨번호 + 상태 뱃지 */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-base mono text-slate-200 font-bold mb-2">{c.cn}</div>
          <div className="flex flex-wrap gap-1.5">
            {isDone && <Badge color="emerald">✓ 완료 [{comp.by}]</Badge>}
            {isXray && <Badge color="purple">🔍 X-RAY</Badge>}
            {isDG && <Badge color="red"><AlertTriangle className="w-3 h-3"/>DG {c.dgc} {c.un}</Badge>}
            {isReefer && <Badge color="cyan"><Snowflake className="w-3 h-3"/>RF{c.tmp ? ` ${c.tmp}°C` : ''}</Badge>}
            {isFR && <Badge color="orange">Flat Rack</Badge>}
            {isOT && <Badge color="yellow">Open Top</Badge>}
            {isTK && <Badge color="pink">Tank</Badge>}
          </div>
        </div>

        {/* 위치 */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">선내 위치</div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400"/>
                <span className="text-2xl font-black mono text-amber-300">{c.bay || '-'}</span>
                <span className="text-slate-500">/</span>
                <span className="text-xl font-bold mono text-slate-300">{c.row || '--'}</span>
                <span className="text-slate-500">/</span>
                <span className="text-xl font-bold mono text-slate-300">{c.tier || '--'}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">베이 / 열 / 단</div>
            </div>
          </div>
        </div>

        {/* 화물 정보 */}
        <div className="px-4 py-3 border-b border-slate-800 grid grid-cols-2 gap-3 text-sm">
          <Field label="규격" value={isoToLabel(c.iso) || c.tp || '-'} mono/>
          <Field label="ISO" value={c.iso || '-'} mono/>
          <Field label="F/E" value={c.fe || '-'} highlight={c.fe === 'F' ? 'rose' : ''}/>
          <Field label="무게" value={c.wt > 0 ? formatWt(c.wt) : '-'}/>
          <Field label="검수업체" value={c.op || '-'} mono/>
          <Field label="POL" value={c.pol || '-'} mono/>
          <Field label="POD" value={c.pod || '-'} mono/>
          {c.npod && <Field label="환적" value={c.npod} mono/>}
        </div>

        {/* 실번호 */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">실번호 (Seal)</div>
          {editingSeal ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={sealVal}
                onChange={e => setSealVal(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-800 border border-amber-500 rounded px-3 py-2 mono text-amber-200 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveSeal()}
              />
              <button onClick={handleSaveSeal} className="px-3 py-2 bg-emerald-700 text-emerald-100 rounded font-bold">저장</button>
              <button onClick={() => { setEditingSeal(false); setSealVal(c.sl || ''); }} className="px-3 py-2 bg-slate-700 text-slate-300 rounded">취소</button>
            </div>
          ) : (
            <button onClick={() => setEditingSeal(true)} className="flex items-center gap-2 w-full text-left">
              <span className={`text-lg mono font-bold ${c.sl ? 'text-amber-200' : 'text-slate-600 italic'}`}>{c.sl || '미입력'}</span>
              <Edit3 className="w-4 h-4 text-slate-500"/>
            </button>
          )}
          {isXray && xraySeal && (
            <div className="mt-2 p-2 bg-purple-950/40 border border-purple-700/30 rounded">
              <div className="text-[10px] text-purple-300 font-bold">X-RAY 봉인:</div>
              <div className="mono text-purple-200">{xraySeal}</div>
            </div>
          )}
        </div>

        {/* B/L */}
        {c.bl && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">B/L</div>
            <div className="mono text-sm text-slate-300">{c.bl}</div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-3 flex gap-2">
          {mode === 'discharge' && (
            <button onClick={handleToggleXray}
              className={`px-4 py-3 rounded-lg font-bold text-sm ${
                isXray ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              🔍 X-RAY {isXray ? '해제' : '추가'}
            </button>
          )}
          <button onClick={handleComplete}
            className={`flex-1 py-3 rounded-lg font-black text-base ${
              isDone
                ? 'bg-rose-800 hover:bg-rose-700 text-rose-100'
                : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100'
            }`}>
            {isDone ? <><RotateCcw className="w-5 h-5 inline mr-1"/>완료 취소</> : <><Check className="w-5 h-5 inline mr-1"/>검수 완료</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  const map = {
    emerald: 'bg-emerald-700/60 text-emerald-100',
    purple: 'bg-purple-700/60 text-purple-100',
    red: 'bg-red-700/60 text-red-100',
    cyan: 'bg-cyan-700/60 text-cyan-100',
    orange: 'bg-orange-700/60 text-orange-100',
    yellow: 'bg-yellow-700/60 text-yellow-100',
    pink: 'bg-pink-700/60 text-pink-100',
  };
  return (
    <span className={`${map[color]} text-[11px] px-2 py-0.5 rounded font-black flex items-center gap-1`}>
      {children}
    </span>
  );
}

function Field({ label, value, mono, highlight }) {
  const colors = {
    rose: 'text-rose-400',
  };
  return (
    <div>
      <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
      <div className={`text-base ${mono ? 'mono' : ''} ${colors[highlight] || 'text-slate-200'} font-bold`}>{value}</div>
    </div>
  );
}
