// 모든 항차 + 양/선적 통합 검색 + 음성 입력
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, ArrowDown, ArrowUp, MapPin, ChevronRight } from 'lucide-react';
import { speakContainer, parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos } from '../utils.js';

export default function GlobalSearchPage({ voyages, onOpenContainer }) {
  const [query, setQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef(null);

  // 모든 항차 양/선적 펼치기
  const flat = useMemo(() => {
    const arr = [];
    Object.entries(voyages || {}).forEach(([vKey, v]) => {
      if (!v || !v.info) return;
      ['discharge', 'loading'].forEach(mode => {
        const sec = v[mode];
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
            ...c,
            voyageKey: vKey,
            vsl: v.info.vsl,
            voy: v.info.voy,
            mode,
            isXray: mode === 'discharge' && !!xrayMap[c.cn],
            comp: compMap[c.cn] || null,
            xraySeal: xraySeals[c.cn] || null,
          });
        });
      });
    });
    return arr;
  }, [voyages]);

  const matches = useMemo(() => {
    if (!query || query.length < 2) return [];
    const Q = query.toUpperCase();
    // 숫자만 입력 → 컨번호 + 끝4자리만 (실번호/베이/B/L 제외)
    // 알파벳 포함 → 컨번호 + 끝4자리 + 선박명 (선박 찾기 가능)
    const isOnlyDigits = /^\d+$/.test(Q);
    return flat.filter(c => {
      if (isOnlyDigits) {
        return c.cn?.includes(Q) || c.l4?.includes(Q);
      }
      return c.cn?.includes(Q) || c.l4?.includes(Q) || c.vsl?.includes(Q);
    }).slice(0, 50);
  }, [flat, query]);

  // Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    const r = new SR();
    r.lang = 'ko-KR';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      if (last.isFinal) {
        const digits = parseSpokenDigits(text);
        if (digits && digits.length >= 2) setQuery(digits);
        else speak('숫자를 인식하지 못했습니다.');
      }
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') speak('마이크 권한이 필요합니다.');
    };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch(_) {} };
  }, []);

  // 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!query || query.length < 2) return;
    const sig = `${query}-${matches.length}-${matches[0]?.cn || 'none'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    if (matches.length === 0) {
      speak(`${spellKo(query.replace(/\D/g, ''))}, 컨테이너 없음`);
    } else if (matches.length === 1) {
      const c = matches[0];
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      const parts = [spellKo(last4)];
      if (c.sl) parts.push(`실번호 ${spellKo(c.sl)}`);
      else parts.push('실번호 미입력');
      if (c.isXray) parts.push('엑스레이');
      speak(parts.join(', '));
    } else if (matches.length <= 5) {
      speak(`${matches.length}개 일치. 첫번째. ${spellKo(matches[0].cn?.slice(-4) || '')}`);
    } else {
      speak(`${matches.length}개 일치. 더 자세히`);
    }
  }, [matches, query, autoSpeak]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setIsListening(true);
    stopSpeak();
    try { recognitionRef.current.start(); }
    catch (e) { setIsListening(false); }
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-3">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-3">
        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center justify-between">
          <span>통합 검색 — 모든 항차·양/선적</span>
          <span className="text-slate-400 mono">전체 {flat.length.toLocaleString()}대</span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="🎤 마이크 / 끝4자리 / 컨번호 / 선박명"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="w-full pl-9 pr-32 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {voiceSupported && (
              <button onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded flex items-center justify-center transition ${
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
        <div className="text-[11px] text-slate-500 text-center mt-2">
          {!isListening && query.length === 0 && '🎤 마이크 누르고 "공구일오" 식으로 또박또박'}
          {!isListening && query.length > 0 && query.length < 2 && '2자리 이상 입력'}
          {!isListening && query.length >= 2 && matches.length === 0 && '일치 없음'}
          {!isListening && query.length >= 2 && matches.length === 1 && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && matches.length > 1 && <span className="text-amber-400 font-bold">⚠ {matches.length}개 일치{matches.length === 50 ? '+' : ''}</span>}
          {isListening && '🎙 듣는 중... 또박또박 말씀하세요'}
        </div>
      </div>

      <div className="space-y-1.5">
        {matches.map(c => (
          <GlobalResultCard key={`${c.voyageKey}/${c.mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer(c)} />
        ))}
      </div>
    </div>
  );
}

function GlobalResultCard({ c, onOpen }) {
  const isDone = !!c.comp;
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border rounded-lg p-2.5 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30 bg-emerald-950/10' :
        c.isXray ? 'border-purple-700/30 bg-purple-950/10' :
        'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <div className={`flex-shrink-0 px-2 py-1.5 rounded text-[10px] font-black flex flex-col items-center gap-0.5 ${
        c.mode === 'discharge' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {c.mode === 'discharge'
          ? <ArrowDown className="w-3.5 h-3.5"/>
          : <ArrowUp className="w-3.5 h-3.5"/>}
        <span>{c.mode === 'discharge' ? '양하' : '선적'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-[11px] text-slate-400 mono truncate">{c.cn}</span>
          {c.isXray && <span className="bg-purple-700/60 text-purple-100 text-[9px] px-1 rounded font-black">🔍</span>}
          {isDone && <span className="bg-emerald-700/60 text-emerald-100 text-[9px] px-1 rounded font-black">✓</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mono mt-0.5">
          <span className="text-slate-300 font-bold">{c.vsl}</span>
          <span>·</span>
          <span>{c.voy}</span>
          {c.bay && <><span>·</span><MapPin className="w-2.5 h-2.5"/><span className="text-amber-300">{fmtPos(c)}</span></>}
          {c.op && <><span>·</span><span className="text-slate-400">{c.op}</span></>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0"/>
    </button>
  );
}
