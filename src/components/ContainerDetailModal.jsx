import React, { useState } from 'react';
import { X, Check, Edit3, Snowflake, AlertTriangle, AlertOctagon, MapPin, Volume2, RotateCcw, History } from 'lucide-react';
import { isoToLabel, formatWt } from '../utils.js';
import { speakContainer, speakDone } from '../voice.js';
import { fbCompleteContainer, fbCancelComplete, fbToggleXray, fbUpdateRecordSeal, fbSetXraySeal } from '../firebase.js';

export default function ContainerDetailModal({ c, comp, isXray, xraySeal, mode, voyageKey, voyageInfo, inspector, onClose }) {
  const [editingSeal, setEditingSeal] = useState(false);
  const [editingXSeal, setEditingXSeal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
  const slHistory = c.sl_history || [];
  const xHistory = xraySeal?.history || [];

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

  const handleSaveSeal = async () => {
    await fbUpdateRecordSeal(voyageKey, mode, c.cn, sealVal.trim(), inspector);
    setEditingSeal(false);
  };

  const handleSaveXSeal = async () => {
    await fbSetXraySeal(voyageKey, c.cn, xSealVal.trim(), xEsealVal.trim(), inspector);
    setEditingXSeal(false);
  };

  const handleToggleXray = async () => {
    if (mode !== 'discharge') return;
    await fbToggleXray(voyageKey, c.cn);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        {/* 헤더 */}
        <div className={`sticky top-0 px-4 py-3 border-b border-slate-700 flex items-center justify-between ${
          sealError || xSealError ? 'bg-red-950' :
          isDone ? 'bg-emerald-950' :
          isXray ? 'bg-purple-950' :
          mode === 'discharge' ? 'bg-blue-950' : 'bg-amber-950'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black mono text-amber-300 tracking-wider">{c.l4 || c.cn?.slice(-4)}</span>
            <button onClick={() => speakContainer(c, { xray: isXray })} className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-700">
              <Volume2 className="w-4 h-4 text-amber-300"/>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400"/>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-base mono text-slate-200 font-bold mb-2">{c.cn}</div>
          <div className="flex flex-wrap gap-1.5">
            {(sealError || xSealError) && (
              <span className="bg-red-700 text-red-50 text-[11px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                <AlertOctagon className="w-3 h-3"/>실오류 (세관 신고 대상)
              </span>
            )}
            {isDone && <Badge color="emerald">✓ 완료 [{comp.by}]</Badge>}
            {isXray && <Badge color="purple">🔍 X-RAY</Badge>}
            {isDG && <Badge color="red"><AlertTriangle className="w-3 h-3"/>DG {c.dgc} {c.un}</Badge>}
            {isReefer && <Badge color="cyan"><Snowflake className="w-3 h-3"/>RF{c.tmp ? ` ${c.tmp}°C` : ''}</Badge>}
            {c.fr && <Badge color="orange">Flat Rack</Badge>}
            {c.ot && <Badge color="yellow">Open Top</Badge>}
            {c.tk && <Badge color="pink">Tank</Badge>}
          </div>
        </div>

        {/* 위치 */}
        <div className="px-4 py-3 border-b border-slate-800">
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

        {/* 화물 */}
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
        <div className={`px-4 py-3 border-b border-slate-800 ${sealError ? 'bg-red-950/30' : ''}`}>
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
            <span>실번호 (Seal No)</span>
            {sealError && <span className="text-red-400 font-black">⚠ 실오류</span>}
          </div>
          {sealError && (
            <div className="bg-red-950/50 border border-red-700/50 rounded p-2 mb-2 text-[11px]">
              <div className="text-red-300 font-bold mb-0.5">세관 신고 양식:</div>
              <div className="mono text-red-100">원실번호 <span className="font-black">{slOrig}</span> → 실제 <span className="font-black">{c.sl}</span></div>
            </div>
          )}
          {editingSeal ? (
            <div className="flex gap-2">
              <input type="text" value={sealVal}
                onChange={e => setSealVal(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-800 border border-amber-500 rounded px-3 py-2 mono text-amber-200 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveSeal()}/>
              <button onClick={handleSaveSeal} className="px-3 py-2 bg-emerald-700 text-emerald-100 rounded font-bold">저장</button>
              <button onClick={() => { setEditingSeal(false); setSealVal(c.sl || ''); }} className="px-3 py-2 bg-slate-700 text-slate-300 rounded">취소</button>
            </div>
          ) : (
            <button onClick={() => setEditingSeal(true)} className="flex items-center gap-2 w-full text-left">
              <span className={`text-lg mono font-bold ${c.sl ? (sealError ? 'text-red-300' : 'text-amber-200') : 'text-slate-600 italic'}`}>{c.sl || '미입력'}</span>
              <Edit3 className="w-4 h-4 text-slate-500"/>
            </button>
          )}
          {slHistory.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className="mt-2 text-[10px] text-slate-400 hover:text-slate-300 flex items-center gap-1">
              <History className="w-3 h-3"/>수정 이력 ({slHistory.length}회) {showHistory ? '▾' : '▸'}
            </button>
          )}
          {showHistory && slHistory.length > 0 && (
            <div className="mt-1.5 bg-slate-950 rounded p-2 space-y-1 text-[10px] mono">
              {slHistory.map((h, i) => (
                <div key={i} className="text-slate-400">
                  <span className="text-slate-500">{new Date(h.at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-emerald-400 ml-1">[{h.by}]</span>
                  <span className="text-slate-600 ml-1">{h.from || '∅'}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="text-slate-200">{h.to || '∅'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* X-RAY 봉인 (양하 X-RAY 대상) */}
        {mode === 'discharge' && isXray && (
          <div className={`px-4 py-3 border-b border-slate-800 ${xSealError ? 'bg-red-950/30' : 'bg-purple-950/20'}`}>
            <div className="text-[10px] text-purple-400 font-bold uppercase mb-1 flex items-center justify-between">
              <span>X-RAY 봉인 (세관 + 전자)</span>
              {xSealError && <span className="text-red-400 font-black">⚠ 실오류</span>}
            </div>
            {xSealError && (
              <div className="bg-red-950/50 border border-red-700/50 rounded p-2 mb-2 text-[11px]">
                <div className="text-red-300 font-bold mb-0.5">세관 신고 양식:</div>
                <div className="mono text-red-100">원봉인 <span className="font-black">{xSealOrig}</span> → 실제 <span className="font-black">{xSeal}</span></div>
              </div>
            )}
            {editingXSeal ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-purple-400">세관봉인</label>
                  <input type="text" value={xSealVal}
                    onChange={e => setXSealVal(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-purple-500 rounded px-3 py-2 mono text-purple-200 focus:outline-none"
                    autoFocus/>
                </div>
                <div>
                  <label className="text-[10px] text-cyan-400">전자봉인 (E-Seal)</label>
                  <input type="text" value={xEsealVal}
                    onChange={e => setXEsealVal(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-cyan-600 rounded px-3 py-2 mono text-cyan-200 focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSaveXSeal()}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveXSeal} className="flex-1 px-3 py-2 bg-emerald-700 text-emerald-100 rounded font-bold">저장</button>
                  <button onClick={() => { setEditingXSeal(false); setXSealVal(xraySeal?.seal || ''); setXEsealVal(xraySeal?.eseal || ''); }} className="px-3 py-2 bg-slate-700 text-slate-300 rounded">취소</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingXSeal(true)} className="w-full text-left space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">세관:</span>
                  <span className={`text-base mono font-bold ${xSeal ? (xSealError ? 'text-red-300' : 'text-purple-200') : 'text-slate-600 italic'}`}>{xSeal || '미입력'}</span>
                  <Edit3 className="w-3.5 h-3.5 text-slate-500"/>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">전자:</span>
                  <span className={`text-base mono font-bold ${xraySeal?.eseal ? 'text-cyan-200' : 'text-slate-600 italic'}`}>{xraySeal?.eseal || '미입력'}</span>
                </div>
              </button>
            )}
            {xHistory.length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-300">
                  <History className="w-3 h-3 inline mr-1"/>수정 이력 ({xHistory.length}회)
                </summary>
                <div className="mt-1.5 bg-slate-950 rounded p-2 space-y-1 text-[10px] mono">
                  {xHistory.map((h, i) => (
                    <div key={i} className="text-slate-400">
                      <span className="text-slate-500">{new Date(h.at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-emerald-400 ml-1">[{h.by}]</span>
                      <div className="ml-3 text-[9px]">
                        <span className="text-slate-600">세관: {h.from?.seal || '∅'}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-purple-200">{h.to?.seal || '∅'}</span>
                      </div>
                      <div className="ml-3 text-[9px]">
                        <span className="text-slate-600">전자: {h.from?.eseal || '∅'}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-cyan-200">{h.to?.eseal || '∅'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {c.bl && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">B/L</div>
            <div className="mono text-sm text-slate-300">{c.bl}</div>
          </div>
        )}

        {/* 액션 */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-3 flex gap-2">
          {mode === 'discharge' && (
            <button onClick={handleToggleXray}
              className={`px-4 py-3 rounded-lg font-bold text-sm ${
                isXray ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              🔍 {isXray ? '해제' : '추가'}
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
  return <span className={`${map[color]} text-[11px] px-2 py-0.5 rounded font-black flex items-center gap-1`}>{children}</span>;
}

function Field({ label, value, mono, highlight }) {
  const colors = { rose: 'text-rose-400' };
  return (
    <div>
      <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
      <div className={`text-base ${mono ? 'mono' : ''} ${colors[highlight] || 'text-slate-200'} font-bold`}>{value}</div>
    </div>
  );
}
