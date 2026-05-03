// V37 SearchTab 100% 이식
//  - Web Speech API (한국어, interimResults=true → 한 템포 빠르게)
//  - 자동 음성 안내 (결과 1개=상세, 2~5개=첫번째, 6+=세부 입력 권장)
//  - 양/선적 통합 검색 (현재 항차의 모든 컨테이너)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, ArrowDown, ArrowUp, MapPin, ChevronRight } from 'lucide-react';
import { speakContainer, parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos } from '../utils.js';

export default function SearchPanel({ voyage, voyageKey, inspector, onOpenContainer }) {
  const [query, setQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef(null);

  // 양/선적 통합 컨테이너 리스트
  const allContainers = useMemo(() => {
    const arr = [];
    ['discharge', 'loading'].forEach(mode => {
      const sec = voyage?.[mode];
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
          _mode: mode,
          _xray: mode === 'discharge' && !!xrayMap[c.cn],
          _xraySeal: xraySeals[c.cn] || null,
          _comp: compMap[c.cn] || null,
        });
      });
    });
    return arr;
  }, [voyage]);

  // 검색 결과
  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const Q = query.toUpperCase();
    return allContainers.filter(c =>
      c.cn?.includes(Q) || c.l4?.includes(Q) ||
      c.bay?.includes(Q) || c.op?.includes(Q) ||
      c.sl?.includes(Q) || c.bl?.includes(Q)
    );
  }, [allContainers, query]);

  // V37: Web Speech API 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    const r = new SR();
    r.lang = 'ko-KR';
    r.continuous = false;
    r.interimResults = true;  // 핵심: 중간 결과 받기 (한 템포 빠르게)
    r.maxAlternatives = 3;

    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      if (last.isFinal) {
        const digits = parseSpokenDigits(text);
        if (digits && digits.length >= 2) {
          setQuery(digits);
        } else {
          speak('숫자를 인식하지 못했습니다. 다시 말씀해주세요.');
        }
      }
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        speak('마이크 권한이 필요합니다.');
      }
    };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch(_) {} };
  }, []);

  // V37: 검색 결과 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!query || query.length < 2) return;
    const sig = `${query}-${results.length}-${results[0]?.cn || 'none'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    if (results.length === 0) {
      const queryDigits = query.replace(/\D/g, '');
      if (queryDigits.length >= 2) {
        speak(`${spellKo(queryDigits)}, 일치하는 컨테이너가 없습니다. 다시 말씀해 주세요.`);
      } else {
        speak('일치하는 컨테이너가 없습니다. 다시 말씀해 주세요.');
      }
      return;
    }

    if (results.length === 1) {
      // 1개 정확 일치 → 전체 안내 + 양하/선적 모드 알림
      const c = results[0];
      const modeLabel = c._mode === 'discharge' ? '양하' : '선적';
      speakContainer(c, { xray: c._xray, suffix: modeLabel });
    } else if (results.length > 1 && results.length <= 5) {
      const cnSpoken = spellKo(results[0].cn?.slice(-4) || '');
      speak(`${results.length}개의 컨테이너가 일치합니다. 첫 번째 결과. ${cnSpoken}`);
    } else if (results.length > 5) {
      speak(`${results.length}개의 컨테이너가 일치합니다. 더 자세한 번호를 말씀해주세요.`);
    }
  }, [results, query, autoSpeak]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setIsListening(true);
    stopSpeak(); // 음성 안내 멈추기
    try { recognitionRef.current.start(); }
    catch (e) { setIsListening(false); }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch (e) {}
    setIsListening(false);
  };

  return (
    <div className="space-y-3">
      {/* 검색창 + 마이크 + 자동 음성 토글 */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center justify-between">
          <span>이 항차 통합 검색 — 양하 + 선적 모두</span>
          <span className="text-slate-400 mono">전체 {allContainers.length}대</span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="🎤 마이크 누르고 말하기 / 끝4자리 / 컨번호"
            inputMode="numeric"
            autoComplete="off"
            className="w-full pl-9 pr-32 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {voiceSupported && (
              <button onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded flex items-center justify-center transition ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                }`} title="음성 검색 (한국어)">
                {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
              </button>
            )}
            <button onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-7 h-10 rounded flex items-center justify-center ${
                autoSpeak ? 'text-amber-300' : 'text-slate-500'
              }`} title={autoSpeak ? '음성 안내 끄기' : '음성 안내 켜기'}>
              {autoSpeak ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>
            {query && (
              <button onClick={() => { setQuery(''); stopSpeak(); }} className="w-7 h-10 rounded hover:bg-slate-700 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500"/>
              </button>
            )}
          </div>
        </div>

        {/* 음성 인식 중 transcript */}
        {isListening && transcript && (
          <div className="mt-2 text-xs text-red-300 mono bg-red-900/20 px-2 py-1.5 rounded border border-red-800/40">
            🎙 {transcript}
          </div>
        )}

        <div className="text-[11px] text-slate-500 text-center mt-2">
          {!isListening && query.length === 0 && '🎤 마이크 누르고 "공구일오" 식으로 말씀하시거나 직접 입력'}
          {!isListening && query.length > 0 && query.length < 2 && '2자리 이상 입력'}
          {!isListening && query.length >= 2 && results.length === 0 && '일치 없음'}
          {!isListening && query.length >= 2 && results.length === 1 && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && results.length > 1 && <span className="text-amber-400 font-bold">⚠ {results.length}개 일치</span>}
          {isListening && '🎙 듣는 중... 또박또박 말씀하세요'}
        </div>
      </div>

      {/* 결과 카드 */}
      <div className="space-y-1.5">
        {results.map(c => (
          <ResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)}/>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ c, onOpen }) {
  const isDone = !!c._comp;
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border rounded-lg p-2.5 flex items-center gap-2 transition ${
        isDone ? 'border-emerald-700/30 bg-emerald-950/10' :
        c._xray ? 'border-purple-700/30 bg-purple-950/10' :
        'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <div className={`flex-shrink-0 px-2 py-1.5 rounded text-[10px] font-black flex flex-col items-center gap-0.5 ${
        c._mode === 'discharge' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {c._mode === 'discharge'
          ? <ArrowDown className="w-3.5 h-3.5"/>
          : <ArrowUp className="w-3.5 h-3.5"/>}
        <span>{c._mode === 'discharge' ? '양하' : '선적'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-base text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-[11px] text-slate-400 mono truncate">{c.cn}</span>
          {c._xray && <span className="bg-purple-700/60 text-purple-100 text-[9px] px-1.5 py-0.5 rounded font-black">🔍 XRAY</span>}
          {isDone && <span className="bg-emerald-700/60 text-emerald-100 text-[9px] px-1.5 py-0.5 rounded font-black">✓완료</span>}
          {c.dg && <span className="bg-red-700/60 text-red-100 text-[9px] px-1.5 py-0.5 rounded font-black">DG</span>}
          {c.rf && <span className="bg-cyan-700/60 text-cyan-100 text-[9px] px-1.5 py-0.5 rounded font-black">❄RF{c.tmp ? ` ${c.tmp}°` : ''}</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mono mt-0.5 flex-wrap">
          {c.bay && <><MapPin className="w-2.5 h-2.5 text-amber-400"/><span className="text-amber-300 font-bold">{fmtPos(c)}</span></>}
          <span>{isoToLabel(c.iso) || c.tp || ''}</span>
          <span>{c.fe || ''}</span>
          {c.op && <span className="text-slate-400">{c.op}</span>}
          {c.pol && <span>POL {c.pol}</span>}
          {c.pod && <span>POD {c.pod}</span>}
          {c.sl && <span className="text-amber-200">실 {c.sl}</span>}
          {c._comp?.by && <span className="text-emerald-400">[{c._comp.by}]</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0"/>
    </button>
  );
}
