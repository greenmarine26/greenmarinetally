import React, { useState } from 'react';
import { Check, Edit3, Snowflake, AlertTriangle, AlertOctagon } from 'lucide-react';
import { fbCompleteContainer, fbCancelComplete, fbToggleXray, fbUpdateRecordSeal, fbSetXraySeal } from '../firebase.js';
import { isoToLabel, formatWt, fmtPos } from '../utils.js';
import { speakDone } from '../voice.js';

export default function ContainerList({ list, compMap, xrayMap, xraySeals, mode, voyageKey, inspector, onOpenContainer }) {
  if (!list || list.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
        컨테이너 없음
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {list.map(c => (
        <ContainerCard
          key={c.cn}
          c={c}
          comp={compMap[c.cn]}
          isXray={mode === 'discharge' && !!xrayMap[c.cn]}
          xraySeal={xraySeals[c.cn] || null}
          mode={mode}
          voyageKey={voyageKey}
          inspector={inspector}
          onOpenContainer={onOpenContainer}
        />
      ))}
    </div>
  );
}

function ContainerCard({ c, comp, isXray, xraySeal, mode, voyageKey, inspector, onOpenContainer }) {
  const [editingSeal, setEditingSeal] = useState(false);
  const [editingXSeal, setEditingXSeal] = useState(false);
  const [sealVal, setSealVal] = useState(c.sl || '');
  const [xSealVal, setXSealVal] = useState(xraySeal?.seal || '');
  const [xEsealVal, setXEsealVal] = useState(xraySeal?.eseal || '');

  const isDone = !!comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const isDG = c.dg;
  const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
  const sealError = c.sl && slOrig && c.sl !== slOrig;
  const xSealOrig = xraySeal?.seal_orig != null ? xraySeal.seal_orig : xraySeal?.seal || '';
  const xSeal = xraySeal?.seal || '';
  const xSealError = xSeal && xSealOrig && xSeal !== xSealOrig;

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (isDone) {
      if (!confirm(`${c.cn} 검수 완료를 취소하시겠습니까?`)) return;
      await fbCancelComplete(voyageKey, mode, c.cn);
    } else {
      await fbCompleteContainer(voyageKey, mode, c.cn, inspector);
      speakDone(c);
    }
  };

  const handleSaveSeal = async (e) => {
    e?.stopPropagation();
    await fbUpdateRecordSeal(voyageKey, mode, c.cn, sealVal.trim(), inspector);
    setEditingSeal(false);
  };

  const handleSaveXSeal = async (e) => {
    e?.stopPropagation();
    await fbSetXraySeal(voyageKey, c.cn, xSealVal.trim(), xEsealVal.trim(), inspector);
    setEditingXSeal(false);
  };

  const handleToggleXray = async (e) => {
    e.stopPropagation();
    if (mode !== 'discharge') return;
    await fbToggleXray(voyageKey, c.cn);
  };

  const handleCardClick = () => {
    if (editingSeal || editingXSeal) return;
    onOpenContainer?.(c);
  };

  return (
    <div onClick={handleCardClick}
      className={`bg-slate-900 border rounded-lg p-2.5 transition cursor-pointer hover:bg-slate-800/50 ${
        sealError || xSealError ? 'border-red-700/60 bg-red-950/30' :
        isDone ? 'border-emerald-700/40 bg-emerald-950/20' :
        isXray ? 'border-purple-700/40 bg-purple-950/20' :
        'border-slate-700'
      }`}>
      <div className="flex items-start gap-2">
        <button onClick={handleComplete}
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-black ${
            isDone ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
          }`}>
          {isDone ? <Check className="w-5 h-5"/> : '✓'}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-sm text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
            <span className="text-[11px] text-slate-400 mono truncate">{c.cn}</span>
            {(sealError || xSealError) && (
              <span className="bg-red-700/80 text-red-50 text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                <AlertOctagon className="w-2.5 h-2.5"/>실오류
              </span>
            )}
            {isXray && <span className="bg-purple-700/60 text-purple-100 text-[9px] px-1.5 py-0.5 rounded font-black">🔍XRAY</span>}
            {isDG && <span className="bg-red-700/60 text-red-100 text-[9px] px-1.5 py-0.5 rounded font-black"><AlertTriangle className="w-2.5 h-2.5 inline mr-0.5"/>DG</span>}
            {isReefer && <span className="bg-cyan-700/60 text-cyan-100 text-[9px] px-1.5 py-0.5 rounded font-black"><Snowflake className="w-2.5 h-2.5 inline mr-0.5"/>RF{c.tmp ? ` ${c.tmp}°` : ''}</span>}
            {c.fr && <span className="bg-orange-700/60 text-orange-100 text-[9px] px-1.5 py-0.5 rounded font-black">FR</span>}
            {c.ot && <span className="bg-yellow-700/60 text-yellow-100 text-[9px] px-1.5 py-0.5 rounded font-black">OT</span>}
            {c.tk && <span className="bg-pink-700/60 text-pink-100 text-[9px] px-1.5 py-0.5 rounded font-black">TK</span>}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[10px] mono flex-wrap">
            {c.bay && <span className="text-amber-200 font-bold">{fmtPos(c)}</span>}
            <span className="text-slate-500">{isoToLabel(c.iso) || c.tp || ''}</span>
            <span className={c.fe === 'F' ? 'text-rose-400' : 'text-slate-500'}>{c.fe}</span>
            {c.wt > 0 && <span className="text-slate-400">{formatWt(c.wt)}</span>}
            {c.op && <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">{c.op}</span>}
            {comp?.by && <span className="text-emerald-400">[{comp.by}]</span>}
          </div>

          {/* 실번호 (원본 vs 실제) */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="text-[10px] text-slate-500">실:</span>
            {editingSeal ? (
              <div onClick={e => e.stopPropagation()} className="flex items-center gap-1">
                <input type="text" value={sealVal}
                  onChange={e => setSealVal(e.target.value.toUpperCase())}
                  className="bg-slate-800 border border-amber-600 rounded px-1.5 py-0.5 text-[11px] mono text-amber-200 w-32 focus:outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveSeal(e)}/>
                <button onClick={handleSaveSeal} className="text-emerald-400 text-xs px-1">저장</button>
                <button onClick={(e) => { e.stopPropagation(); setEditingSeal(false); setSealVal(c.sl || ''); }} className="text-slate-500 text-xs px-1">×</button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setEditingSeal(true); setSealVal(c.sl || ''); }} className="flex items-center gap-1 text-[11px] mono">
                {sealError ? (
                  <>
                    <span className="text-slate-500 line-through">{slOrig}</span>
                    <span className="text-red-400 mx-0.5">→</span>
                    <span className="text-red-300 font-black">{c.sl}</span>
                  </>
                ) : (
                  <span className={c.sl ? 'text-amber-200 font-bold' : 'text-slate-600 italic'}>{c.sl || '미입력'}</span>
                )}
                <Edit3 className="w-3 h-3 text-slate-600"/>
              </button>
            )}
          </div>

          {/* X-RAY 봉인 (양하 X-RAY 대상만) */}
          {mode === 'discharge' && isXray && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-[10px] text-purple-400">XRAY:</span>
              {editingXSeal ? (
                <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 flex-wrap">
                  <input type="text" value={xSealVal}
                    onChange={e => setXSealVal(e.target.value.toUpperCase())}
                    placeholder="세관"
                    className="bg-slate-800 border border-purple-600 rounded px-1.5 py-0.5 text-[11px] mono text-purple-200 w-20 focus:outline-none"
                    autoFocus/>
                  <input type="text" value={xEsealVal}
                    onChange={e => setXEsealVal(e.target.value.toUpperCase())}
                    placeholder="전자"
                    className="bg-slate-800 border border-purple-600 rounded px-1.5 py-0.5 text-[11px] mono text-purple-200 w-20 focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSaveXSeal(e)}/>
                  <button onClick={handleSaveXSeal} className="text-emerald-400 text-xs px-1">저장</button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingXSeal(false); setXSealVal(xraySeal?.seal || ''); setXEsealVal(xraySeal?.eseal || ''); }} className="text-slate-500 text-xs px-1">×</button>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setEditingXSeal(true); setXSealVal(xraySeal?.seal || ''); setXEsealVal(xraySeal?.eseal || ''); }} className="flex items-center gap-1 text-[11px] mono">
                  {xSealError ? (
                    <>
                      <span className="text-slate-500 line-through">{xSealOrig}</span>
                      <span className="text-red-400 mx-0.5">→</span>
                      <span className="text-red-300 font-black">{xSeal}</span>
                    </>
                  ) : (
                    <span className={xSeal ? 'text-purple-200 font-bold' : 'text-slate-600 italic'}>
                      {xSeal || '미입력'}
                      {xraySeal?.eseal && <span className="text-cyan-300"> / {xraySeal.eseal}</span>}
                    </span>
                  )}
                  <Edit3 className="w-3 h-3 text-slate-600"/>
                </button>
              )}
            </div>
          )}
        </div>

        {mode === 'discharge' && (
          <button onClick={handleToggleXray}
            className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-black ${
              isXray ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
            }`}>
            🔍
          </button>
        )}
      </div>
    </div>
  );
}
