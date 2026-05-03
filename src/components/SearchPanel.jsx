// 싱글/트윈 검색
//  - 검색 대상: 컨번호 + 끝 4자리만 (실번호/베이/B/L 검색 안 함!)
//  - 싱글: 음성 OK
//  - 트윈: 음성 X (오류 방지)
//  - 결과 카드 우선순위:
//      1순위: 실번호 거대 + 반짝임
//      2순위: X-RAY 대상
//      3순위: 특수화물 (RF/DG/FR/OT/TK)
//  - 음성: 컨번호 + 실번호 + X-RAY 만 (간결)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, Truck, AlertOctagon, Snowflake, AlertTriangle } from 'lucide-react';
import { parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos } from '../utils.js';

export default function SearchPanel({ voyage, voyageKey, inspector, onOpenContainer }) {
  const [searchMode, setSearchMode] = useState('single');

  const allContainers = useMemo(() => {
    const arr = [];
    ['discharge', 'loading'].forEach(m => {
      const sec = voyage?.[m];
      if (!sec) return;
      const ediMap = sec.ediContainers || {};
      const recMap = sec.records || {};
      const xrayMap = sec.xrayList || {};
      const xraySeals = sec.xraySeals || {};
      const compMap = sec.completed || {};
      const merged = {};
      Object.values(ediMap).forEach(c => { merged[c.cn] = { ...c }; });
      Object.values(recMap).forEach(r => { merged[r.cn] = { ...(merged[r.cn] || {}), ...r }; });
      Object.values(merged).forEach(c => {
        if (!c.cn) return;
        arr.push({
          ...c, _mode: m,
          _xray: m === 'discharge' && !!xrayMap[c.cn],
          _xraySeal: xraySeals[c.cn] || null,
          _comp: compMap[c.cn] || null,
        });
      });
    });
    return arr;
  }, [voyage]);

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex gap-1">
        <button onClick={() => setSearchMode('single')}
          className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 ${
            searchMode === 'single' ? 'bg-amber-700 text-amber-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <Truck className="w-4 h-4"/>싱글 🎤
        </button>
        <button onClick={() => setSearchMode('twin')}
          className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 ${
            searchMode === 'twin' ? 'bg-blue-700 text-blue-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <Truck className="w-4 h-4"/><Truck className="w-4 h-4"/>트윈
        </button>
      </div>

      {searchMode === 'single'
        ? <SingleSearch allContainers={allContainers} onOpenContainer={onOpenContainer}/>
        : <TwinSearch allContainers={allContainers} onOpenContainer={onOpenContainer}/>}
    </div>
  );
}

// 음성: 컨번호 + 실번호 + X-RAY만 (간결)
function announceContainer(c) {
  const last4 = c.l4 || c.cn?.slice(-4) || '';
  const parts = [spellKo(last4)];
  if (c.sl) parts.push(`실번호 ${spellKo(c.sl)}`);
  else parts.push('실번호 미입력');
  if (c._xray) parts.push('엑스레이');
  speak(parts.join(', '));
}

// 검색 대상: 컨번호 + 끝 4자리만 (실번호/베이/B/L 검색 X)
function searchByCn(allContainers, q) {
  if (!q || q.length < 2) return [];
  const Q = q.toUpperCase();
  return allContainers.filter(c =>
    c.cn?.includes(Q) || c.l4?.includes(Q)
  );
}

// ─────────── 싱글 ───────────
function SingleSearch({ allContainers, onOpenContainer }) {
  const [query, setQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef(null);

  const results = useMemo(() => searchByCn(allContainers, query), [allContainers, query]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 3;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      if (last.isFinal) {
        const digits = parseSpokenDigits(text);
        if (digits && digits.length >= 2) setQuery(digits);
        else speak('숫자 인식 실패');
      }
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => { setIsListening(false); if (e.error === 'not-allowed') speak('마이크 권한 필요'); };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch(_) {} };
  }, []);

  useEffect(() => {
    if (!autoSpeak) return;
    if (!query || query.length < 2) return;
    const sig = `${query}-${results.length}-${results[0]?.cn || 'none'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;
    if (results.length === 0) speak(`${spellKo(query.replace(/\D/g, ''))}, 컨테이너 없음`);
    else if (results.length === 1) announceContainer(results[0]);
    else if (results.length <= 5) speak(`${results.length}개 일치`);
    else speak(`${results.length}개 일치, 더 자세히`);
  }, [results, query, autoSpeak]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript(''); setIsListening(true); stopSpeak();
    try { recognitionRef.current.start(); } catch (e) { setIsListening(false); }
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  };

  return (
    <>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="text-[10px] text-slate-500 font-bold mb-2">
          싱글 — 컨번호 끝4자리 검색 · 전체 {allContainers.length}대
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="🎤 / 끝 4자리"
            inputMode="numeric" autoComplete="off"
            className="w-full pl-9 pr-32 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {voiceSupported && (
              <button onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded flex items-center justify-center ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                }`}>
                {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
              </button>
            )}
            <button onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-7 h-10 rounded flex items-center justify-center ${autoSpeak ? 'text-amber-300' : 'text-slate-500'}`}>
              {autoSpeak ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>
            {query && (
              <button onClick={() => { setQuery(''); stopSpeak(); }} className="w-7 h-10 rounded hover:bg-slate-700 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500"/>
              </button>
            )}
          </div>
        </div>
        {isListening && transcript && (
          <div className="mt-2 text-xs text-red-300 mono bg-red-900/20 px-2 py-1.5 rounded border border-red-800/40">
            🎙 {transcript}
          </div>
        )}
        <div className="text-[11px] text-center mt-2">
          {!isListening && query.length === 0 && <span className="text-slate-500">🎤 마이크 또는 키보드</span>}
          {!isListening && query.length >= 2 && results.length === 0 && <span className="text-red-400 font-bold">⚠ 컨테이너 없음 (실번호 ≠ 컨번호)</span>}
          {!isListening && query.length >= 2 && results.length === 1 && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && results.length > 1 && <span className="text-amber-400 font-bold">⚠ {results.length}개 일치</span>}
          {isListening && <span className="text-red-300 font-bold">🎙 듣는 중...</span>}
        </div>
      </div>

      {results.length === 1 && <BigResultCard c={results[0]} onOpen={() => onOpenContainer?.(results[0])}/>}
      {results.length > 1 && results.slice(0, 20).map(c => (
        <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} />
      ))}
    </>
  );
}

// ─────────── 트윈 (음성 X) ───────────
function TwinSearch({ allContainers, onOpenContainer }) {
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');

  const r1 = useMemo(() => searchByCn(allContainers, q1), [q1, allContainers]);
  const r2 = useMemo(() => searchByCn(allContainers, q2), [q2, allContainers]);

  return (
    <>
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-2 text-xs text-blue-300 text-center">
        🚛 트윈: 한 트레일러 컨 2개 — 앞/뒤 동시 (음성 비활성)
      </div>

      <div className="bg-slate-900 border border-amber-700/40 rounded-lg p-3">
        <div className="text-[10px] text-amber-400 font-bold mb-2 flex items-center gap-1">
          <span className="bg-amber-700 text-amber-50 px-1.5 py-0.5 rounded text-[10px] font-black">앞</span>
          앞 컨테이너
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={q1}
            onChange={e => setQ1(e.target.value.toUpperCase())}
            placeholder="끝 4자리"
            inputMode="numeric" autoComplete="off"
            className="w-full pl-9 pr-10 py-3 bg-slate-800 border border-amber-700/40 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          {q1 && <button onClick={() => setQ1('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-slate-500"/></button>}
        </div>
        {q1.length >= 2 && r1.length === 0 && <div className="mt-2 text-[11px] text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
        {r1.length > 1 && <div className="mt-2 text-[11px] text-amber-400 text-center">⚠ {r1.length}개 일치 — 더 자세히</div>}
      </div>

      {r1.length === 1 && <BigResultCard c={r1[0]} onOpen={() => onOpenContainer?.(r1[0])} label="앞" labelColor="amber"/>}

      <div className="flex items-center gap-2 px-2">
        <div className="flex-1 border-t border-slate-700"/>
        <div className="text-[10px] text-slate-500 font-bold">↕ 트윈 ↕</div>
        <div className="flex-1 border-t border-slate-700"/>
      </div>

      <div className="bg-slate-900 border border-cyan-700/40 rounded-lg p-3">
        <div className="text-[10px] text-cyan-400 font-bold mb-2 flex items-center gap-1">
          <span className="bg-cyan-700 text-cyan-50 px-1.5 py-0.5 rounded text-[10px] font-black">뒤</span>
          뒤 컨테이너
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={q2}
            onChange={e => setQ2(e.target.value.toUpperCase())}
            placeholder="끝 4자리"
            inputMode="numeric" autoComplete="off"
            className="w-full pl-9 pr-10 py-3 bg-slate-800 border border-cyan-700/40 rounded text-2xl font-black mono text-cyan-200 text-center tracking-widest focus:outline-none focus:border-cyan-500"/>
          {q2 && <button onClick={() => setQ2('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-slate-500"/></button>}
        </div>
        {q2.length >= 2 && r2.length === 0 && <div className="mt-2 text-[11px] text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
        {r2.length > 1 && <div className="mt-2 text-[11px] text-amber-400 text-center">⚠ {r2.length}개 일치 — 더 자세히</div>}
      </div>

      {r2.length === 1 && <BigResultCard c={r2[0]} onOpen={() => onOpenContainer?.(r2[0])} label="뒤" labelColor="cyan"/>}

      {r1.length === 1 && r2.length === 1 && <TwinComparison a={r1[0]} b={r2[0]}/>}
    </>
  );
}

function TwinComparison({ a, b }) {
  const sameBay = a.bay && b.bay && a.bay === b.bay;
  const sameOp = a.op && b.op && a.op === b.op;
  const sameMode = a._mode === b._mode;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
      <div className="text-[11px] font-bold text-slate-300 mb-2">📋 트윈 비교</div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <CompareItem label="모드" ok={sameMode} a={a._mode === 'discharge' ? '양하' : '선적'} b={b._mode === 'discharge' ? '양하' : '선적'}/>
        <CompareItem label="베이" ok={sameBay} a={a.bay || '-'} b={b.bay || '-'}/>
        <CompareItem label="검수업체" ok={sameOp} a={a.op || '-'} b={b.op || '-'}/>
        <CompareItem label="F/E" ok={a.fe === b.fe} a={a.fe || '-'} b={b.fe || '-'}/>
      </div>
    </div>
  );
}

function CompareItem({ label, ok, a, b }) {
  return (
    <div className={`p-2 rounded ${ok ? 'bg-emerald-950/30 border border-emerald-800/40' : 'bg-amber-950/30 border border-amber-800/40'}`}>
      <div className="text-[9px] text-slate-500 mb-0.5">{label} {ok ? '✓일치' : '⚠불일치'}</div>
      <div className="mono font-bold text-[11px]">
        <span className={ok ? 'text-emerald-300' : 'text-amber-300'}>{a}</span>
        <span className="text-slate-600 mx-1">/</span>
        <span className={ok ? 'text-emerald-300' : 'text-amber-300'}>{b}</span>
      </div>
    </div>
  );
}

// ─── 결과 카드: 실번호 거대 강조 ───
function BigResultCard({ c, onOpen, label, labelColor = 'amber' }) {
  const isDone = !!c._comp;
  const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
  const sealError = c.sl && slOrig && c.sl !== slOrig;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const hasTmp = c.tmp && String(c.tmp).trim() !== '' && String(c.tmp).trim() !== '0';
  const isReeferF = c.rf && hasTmp && c.fe === 'F';

  const labelMap = {
    amber: 'bg-amber-700 text-amber-50',
    cyan: 'bg-cyan-700 text-cyan-50',
  };

  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border-2 rounded-xl p-3 transition ${
        sealError ? 'border-red-600 bg-red-950/30' :
        c._xray ? 'border-purple-600 bg-purple-950/20' :
        'border-amber-600 bg-amber-950/10'
      }`}>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {label && <span className={`${labelMap[labelColor]} px-2 py-0.5 rounded text-[10px] font-black`}>{label}</span>}
        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
          c._mode === 'discharge' ? 'bg-blue-900 text-blue-200' : 'bg-amber-900 text-amber-200'
        }`}>
          {c._mode === 'discharge' ? '양하' : '선적'}
        </span>
        <span className="font-black text-base text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
        <span className="text-[11px] text-slate-400 mono truncate flex-1">{c.cn}</span>
        {isDone && <span className="bg-emerald-700 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-black">✓완료</span>}
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
        ) : c.sl ? (
          <div className="text-4xl sm:text-5xl font-black mono text-amber-300 tracking-wider text-center py-1 animate-pulse"
            style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.6)' }}>
            {c.sl}
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
          {isReeferF && <span className="bg-cyan-600 text-cyan-50 px-2 py-1 rounded font-black text-sm flex items-center gap-1"><Snowflake className="w-3.5 h-3.5"/>RF {c.tmp}°C</span>}
          {!isReeferF && isReefer && <span className="bg-cyan-700/60 text-cyan-100 px-2 py-1 rounded font-black text-xs"><Snowflake className="w-3 h-3 inline mr-0.5"/>리퍼</span>}
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
        <span className={c.fe === 'F' ? 'text-rose-400' : ''}>{c.fe}</span>
        {c.op && <span className="bg-slate-800 px-1 py-0.5 rounded">{c.op}</span>}
        {c.pol && <span>POL {c.pol}</span>}
        {c.pod && <span>POD {c.pod}</span>}
      </div>
    </button>
  );
}

// 다중 결과 시 작은 카드
function SmallResultCard({ c, onOpen }) {
  const isDone = !!c._comp;
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border rounded-lg p-2 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30' : c._xray ? 'border-purple-700/30' : 'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
        c._mode === 'discharge' ? 'bg-blue-900 text-blue-200' : 'bg-amber-900 text-amber-200'
      }`}>{c._mode === 'discharge' ? '양하' : '선적'}</span>
      <span className="font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
      <span className="text-[10px] text-slate-400 mono truncate flex-1">{c.cn}</span>
      {c._xray && <span className="text-purple-400">🔍</span>}
      {isDone && <span className="text-emerald-400">✓</span>}
    </button>
  );
}
