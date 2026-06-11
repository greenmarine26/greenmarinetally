// 검색 패널 (M2.0)
// - 싱글: AI 자유 질문 + 키워드 + 음성
// - 트윈: 자동 짝꿍 + 양쪽 동시 완료
// - 결과 카드: 실번호 거대 + 완료 버튼
// - Gemini API: 자연어 자유 질의
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, Truck, AlertOctagon, Snowflake, AlertTriangle, Check, RotateCcw, Sparkles, Loader2, Link2, HelpCircle } from 'lucide-react';
import { parseSpokenDigits, speak, stopSpeak, spellKo, fixSpeechDomain, pickSpeechAlternative } from '../voice.js';
import { isoToLabel, fmtPos } from '../utils.js';
import { parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, generateLocalAnswer, generateBriefing, generateSealAuditAnswer } from '../nlSearch.js';
import { fixQuestionWithAI } from '../gemini.js';
import { askGemini, isFreeFormQuestion } from '../gemini.js';
import { findTwinCandidate } from '../twin.js';
import { fbCompleteContainer, fbCancelComplete } from '../firebase.js';
import BigResultCard from './BigResultCard.jsx';
import HelpModal from './HelpModal.jsx';
import WrongAnswerModal from './WrongAnswerModal.jsx';

export default function SearchPanel({ voyage, voyageKey, inspector, onOpenContainer, shipLib = null }) {
  const [searchMode, setSearchMode] = useState('single');
  // M5.75: 작업 모드 필터 (양하/선적/완료) — 현재 작업 중인 모드만 검색
  const [workFilter, setWorkFilter] = useState('discharge');  // 'discharge' | 'loading' | 'completed'

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
      // M6.94.31: EDI에 있는 컨은 핵심 필드를 리스트가 덮지 못함 (EDI = 단일 진실).
      //   원인: 엠티 선적 엑셀(헤더 없는 EMPTY)은 fallback 파서가 목적지(CNDLC)를 pol에 넣음.
      //   리스트 pol=CNDLC가 EDI pol=KRPTK를 덮어 상세/카고플랜에서 평택 누락.
      const PROTECTED_EDI = new Set(['pol', 'pod', 'npod', 'fpod', 'iso', 'fe', 'rf', 'fr', 'ot', 'tk', 'dg', 'oog', 'vsl', 'voy']);
      Object.values(recMap).forEach(r => {
        const hasEdi = !!merged[r.cn];
        const safeR = {};
        Object.keys(r).forEach(k => {
          const v = r[k];
          if (v === '' || v === 0 || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return;
          if (hasEdi && PROTECTED_EDI.has(k)) return;  // EDI 핵심 필드 보호
          safeR[k] = v;
        });
        merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR };
      });
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

  // M5.75: 작업 모드 필터 적용 — 양하 작업 중엔 양하만, 선적엔 선적만, 완료는 별도
  const filteredContainers = useMemo(() => {
    if (workFilter === 'completed') {
      return allContainers.filter(c => c._comp);  // 양하/선적 구분 없이 완료된 것
    }
    return allContainers.filter(c => c._mode === workFilter && !c._comp);
  }, [allContainers, workFilter]);

  // 갯수 표시용
  const dischCount = useMemo(() => allContainers.filter(c => c._mode === 'discharge' && !c._comp).length, [allContainers]);
  const loadCount = useMemo(() => allContainers.filter(c => c._mode === 'loading' && !c._comp).length, [allContainers]);
  const completedCount = useMemo(() => allContainers.filter(c => c._comp).length, [allContainers]);

  return (
    <div className="space-y-3">
      {/* M5.75: 작업 모드 탭 (양하/선적/완료) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex gap-1">
        <button onClick={() => setWorkFilter('discharge')}
          className={`flex-1 py-2 rounded text-xs font-bold flex flex-col items-center ${
            workFilter === 'discharge' ? 'bg-rose-700 text-rose-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <span>⬇ 양하 작업</span>
          <span className="text-[10px] opacity-80">대기 {dischCount}대</span>
        </button>
        <button onClick={() => setWorkFilter('loading')}
          className={`flex-1 py-2 rounded text-xs font-bold flex flex-col items-center ${
            workFilter === 'loading' ? 'bg-sky-700 text-sky-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <span>⬆ 선적 작업</span>
          <span className="text-[10px] opacity-80">대기 {loadCount}대</span>
        </button>
        <button onClick={() => setWorkFilter('completed')}
          className={`flex-1 py-2 rounded text-xs font-bold flex flex-col items-center ${
            workFilter === 'completed' ? 'bg-emerald-700 text-emerald-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <span>✓ 완료</span>
          <span className="text-[10px] opacity-80">{completedCount}대</span>
        </button>
      </div>
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
        ? <SingleSearch voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={allContainers} workFilter={workFilter} onOpenContainer={onOpenContainer}/>
        : <TwinSearch voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={filteredContainers} workFilter={workFilter} onOpenContainer={onOpenContainer}/>}
    </div>
  );
}

function announceContainer(c) {
  const last4 = c.l4 || c.cn?.slice(-4) || '';
  const parts = [spellKo(last4)];
  if (c.sl) parts.push(`실번호 ${spellKo(c.sl)}`);
  else parts.push('실번호 미입력');
  if (c._xray) parts.push('엑스레이');
  speak(parts.join(', '));
}

function SingleSearch({ voyage, voyageKey, inspector, allContainers, workFilter = 'discharge', onOpenContainer }) {
  const [query, setQuery] = useState('');
  const voiceQueryRef = useRef('');   // V7.80: 음성으로 들어온 질문 추적
  const fixTriedRef = useRef('');     // V7.80: AI 복원 1회 제한
  const [fixingVoice, setFixingVoice] = useState(false);
  const [showOthers, setShowOthers] = useState(false);  // V7.90: 반대 모드·완료분 접이식
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongPayload, setWrongPayload] = useState(null);
  // M5.80: 멀티턴 대화 state
  const [chatMessages, setChatMessages] = useState([]);  // [{role:'user'|'model', content, ragInfo?}]
  const [followupQuery, setFollowupQuery] = useState('');
  const [ragInfo, setRagInfo] = useState(null);
  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef(null);

  const parsed = useMemo(() => parseNaturalQuery(query), [query]);
  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    if (!hasAnyCondition(parsed)) return [];
    // V7.53: 전체 자료에서 검색하되 현재 작업 모드(미완료) 우선 정렬.
    //   (구) 탭 필터 데이터만 검색 → 완료·반대 모드 컨테이너는 "없습니다" — 있는 자료를 못 알려주던 원인.
    const r = applyNLFilter(allContainers, parsed);
    const rank = (c) => (c._comp ? 2 : (c._mode === workFilter ? 0 : 1));
    return [...r].sort((a, b) => rank(a) - rank(b));
  }, [allContainers, query, parsed, workFilter]);

  // M3.2: 로컬 답변 (AI 의존 없이 즉답)
  // 베이/POL/POD/구역/무게합/위치 질문은 모두 여기서 처리
  // 단, 단순 컨번호 검색(digits만)이거나 결과가 단 1개면 BigResultCard 우선
  const localAnswer = useMemo(() => {
    if (!query || query.length < 2) return null;
    // V7.90-04: 브리핑 — 현재 작업(탭 모드) 기준 요약 (음성 "브리핑" 한 마디)
    if (parsed.briefingQuery) {
      const modeCs = allContainers.filter(c => c._mode === workFilter);
      return generateBriefing(modeCs, workFilter === 'discharge' ? '양하' : '선적', workFilter);
    }
    // V7.90-05: 실번호 점검 (사용자 요청 — 씰 오류 사전 예측)
    if (parsed.sealAuditQuery) {
      const modeCs = allContainers.filter(c => c._mode === workFilter);
      return generateSealAuditAnswer(modeCs, workFilter === 'discharge' ? '양하' : '선적');
    }
    if (!hasAnyCondition(parsed) && !parsed.weightSum && !parsed.posQuery && !parsed.listQuery && !parsed.bayDistQuery && !parsed.briefingQuery && !parsed.sealAuditQuery) return null;
    // 단순 컨번호만 입력한 경우는 BigResultCard 우선
    const onlyDigits = parsed.digits && !parsed.bay && !parsed.pol && !parsed.pod &&
                       !parsed.portAny && !parsed.zone && !parsed.dgClass && !parsed.un &&
                       !parsed.size && !parsed.fe && !parsed.type && !parsed.weightSum &&
                       !parsed.posQuery && !parsed.listQuery && !parsed.bayDistQuery && !parsed.isStat;
    if (onlyDigits) return null;
    return generateLocalAnswer(parsed, results, allContainers);
  }, [parsed, results, allContainers, query, workFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 5;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      if (last.isFinal) {
        // V7.56: 후보 전체에서 항만 용어가 든 것을 채택 + 오인식 교정(양아→양하 등).
        //   "양하"를 6번 말해야 인식되던 문제 — STT가 일반어로 받아 적는 것을 사전으로 보정.
        const alts = []; for (let i = 0; i < last.length; i++) alts.push(last[i].transcript);
        const t = pickSpeechAlternative(alts).trim();
        setTranscript(t);
        if (t.length >= 2) { voiceQueryRef.current = t; setQuery(t); }
        else {
          const digits = parseSpokenDigits(text);
          if (digits && digits.length >= 2) setQuery(digits);
          else speak('인식 실패');
        }
      }
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => { setIsListening(false); if (e.error === 'not-allowed') speak('마이크 권한 필요'); };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch(_) {} };
  }, []);

  // V7.80: 음성 질문 자동 복원 — 음성으로 들어온 문장에 못 알아들은 단어가 있으면
  //   AI(질문 번역기)가 오인식을 교정한 문장으로 1회 재시도. AI는 답하지 않음(환각 차단).
  //   ⚠ 완전 실패만 잡으면 안 됨: "20번 베이 잇퍼 몇대야"는 베이만 잡혀 전체 개수를
  //   답해버림(사용자 증상) — 미해석 단어가 남아도 복원 대상.
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 4) return;
    if (voiceQueryRef.current !== q) return;          // 음성으로 들어온 질문만
    if (/^[0-9\s]+$/.test(q)) return;                 // 숫자(끝4자리)는 제외
    const KNOWN = /베이|번|리퍼|냉동|엠티|풀|위험물|디지|엑스레이|갑판|데크|홀드|선창|컨테이너|피트|온도|영하|영상|실번호|씰|무게|톤|위치|어디|몇|대|개|남은|남았|완료|진행|전체|전부|모두|몽땅|싹|죄다|도합|통틀어|합쳐|합치|수량|불러|뽑아|달라|다오|내렸|내린|목록|리스트|양하|선적|쌓|단|빈자리|자리|평택|항|에서|온|가는|있|없|찾|알려|보여|줘|주세요|해|야|니|나요|입니까|은|는|이|가|을|를|에|의|와|과|도|만|좀|요|다/g;
    const leftover = q.replace(/[0-9A-Za-z\s.,?!]/g, ' ').replace(KNOWN, ' ').trim()
      .split(/\s+/).filter(t => t.length >= 2);
    const understood = hasAnyCondition(parsed) || !!localAnswer;
    if (understood && leftover.length === 0) return;   // 전부 알아들음 — 그대로
    if (fixTriedRef.current === q) return;             // 같은 문장 1회만
    fixTriedRef.current = q;
    let alive = true;
    setFixingVoice(true);
    fixQuestionWithAI(q).then(fixed => {
      if (!alive) return;
      setFixingVoice(false);
      if (fixed && fixed !== q) {
        const p2 = parseNaturalQuery(fixed);
        if (hasAnyCondition(p2)) { voiceQueryRef.current = fixed; setQuery(fixed); }
      }
    }).catch(() => { if (alive) setFixingVoice(false); });
    return () => { alive = false; };
  }, [query, parsed, localAnswer]);

  // 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!query || query.length < 2) return;
    if (aiLoading || aiAnswer) return; // AI 답변 중엔 안내 X
    if (chatMessages.length > 0) return;  // M5.80: 대화 중에도 안내 X (AI 답변에 자동 발음됨)
    const sig = `${query}-${results.length}-${parsed.isStat}-${results[0]?.cn || 'none'}-${localAnswer ? '1' : '0'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    // V7.80: 음성 답변 간결화 — 핵심 한 문장만 (상세는 화면). 0대면 "~없습니다" (사용자 확정 형식).
    if (localAnswer) {
      const first = (localAnswer.split('\n').find(l => l.trim()) || '').replace(/[📊📍📭⚖️•·]/g, '').trim();
      const zm = first.match(/^(.+?):\s*0대/);
      if (zm) speak(`${zm[1].trim()} 없습니다`);
      else if (first) speak(first.replace(/:\s*/, ' '));
      return;
    }

    if (parsed.isStat) {
      const n = results.length;
      speak(n === 0 ? `${describeQuery(parsed)} 없습니다` : `${describeQuery(parsed)} ${n}대`);
      return;
    }
    if (results.length === 0 && hasAnyCondition(parsed)) {
      speak(`${describeQuery(parsed)} 없습니다`);
    } else if (results.length === 1) {
      announceContainer(results[0]);
    } else if (results.length <= 5) {
      speak(`${results.length}개 일치`);
    } else {
      speak(`${results.length}개 일치, 더 자세히`);
    }
  }, [results, query, parsed, autoSpeak, aiLoading, aiAnswer, localAnswer]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript(''); setIsListening(true); stopSpeak();
    setAiAnswer(null);
    try { recognitionRef.current.start(); } catch (e) { setIsListening(false); }
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  };

  // M5.80: AI 자유 질문 — 멀티턴 + RAG
  //   첫 질문: chatMessages 비어있음 → 새 대화 시작
  //   후속 질문 (followupQuery): chatMessages에 누적된 history 전달
  const handleAskAI = async (questionOverride = null) => {
    const q = questionOverride || query;
    if (!q) return;
    setAiLoading(true);
    setAiAnswer(null);
    stopSpeak();

    // 멀티턴 히스토리 구성 (chatMessages → askGemini용 history)
    const history = chatMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await askGemini(q, voyage, allContainers, {
        history,
        parsedQuery: questionOverride ? parseNaturalQuery(q) : parsed,
        // shipLib 옵션은 SearchPanel props로 받으면 여기 추가
      });
      if (res.ok) {
        setAiAnswer(res.answer);
        setRagInfo(res.ragInfo);
        // 대화 히스토리에 추가
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: q },
          { role: 'model', content: res.answer, ragInfo: res.ragInfo },
        ]);
        if (autoSpeak) speak(res.answer);
      } else {
        setAiAnswer(`오류: ${res.error}`);
      }
    } catch (e) {
      setAiAnswer(`오류: ${e.message}`);
    } finally {
      setAiLoading(false);
      setFollowupQuery('');
    }
  };

  // M5.80: 새 대화 시작 (대화 히스토리 초기화)
  const handleNewChat = () => {
    setChatMessages([]);
    setAiAnswer(null);
    setRagInfo(null);
    setFollowupQuery('');
    stopSpeak();
  };

  // M5.80: 후속 질문 보내기
  const handleSendFollowup = () => {
    const q = followupQuery.trim();
    if (!q) return;
    handleAskAI(q);
  };

  const showAIButton = query.length >= 4 && !parsed.isStat;

  return (
    <>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-slate-500 font-bold">
            🤖 검색/AI — 4자리 / "리퍼 몇개" / "16번 베이" / 자유 질문 · 전체 {allContainers.length}대
          </div>
          <button onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 text-[10px] font-bold border border-amber-700/40">
            <HelpCircle className="w-3 h-3"/>
            예시
          </button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={query}
            onChange={e => { setQuery(e.target.value); }}
            placeholder="🎤 / 4777 / 40피트 4777 / 자유 질문"
            autoComplete="off"
            className="w-full pl-9 pr-32 py-3 bg-slate-800 border border-slate-700 rounded text-xl font-black mono text-amber-200 text-center tracking-wider focus:outline-none focus:border-amber-500"/>
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
            {(query || chatMessages.length > 0) && (
              <button onClick={() => { setQuery(''); handleNewChat(); }} className="w-7 h-10 rounded hover:bg-slate-700 flex items-center justify-center">
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

        {hasAnyCondition(parsed) && !aiAnswer && chatMessages.length === 0 && (
          <div className="mt-2 text-[11px] text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">
            🤖 인식: <span className="font-bold">{describeQuery(parsed)}</span>
            {parsed.isStat && <span className="ml-1 text-amber-300">(개수)</span>}
          </div>
        )}

        {/* AI 자유 질문 버튼 */}
        {showAIButton && (
          <button onClick={handleAskAI} disabled={aiLoading}
            className="mt-2 w-full py-2 rounded bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin"/>AI 생각 중...</> : <><Sparkles className="w-4 h-4"/>AI에게 물어보기 (Gemini)</>}
          </button>
        )}

        {fixingVoice && (
          <div className="mt-2 text-[11px] text-center text-sky-300 font-bold animate-pulse">🎙 문장 복원 중…</div>
        )}
        {/* V7.54: 못 알아들었거나 일치 0인 질문 기록 — 나중에 지원 추가용 (사용자 요청) */}
        {!isListening && !fixingVoice && query.length >= 4 && !aiLoading && !aiAnswer && chatMessages.length === 0 && !localAnswer
          && (!hasAnyCondition(parsed) || results.length === 0)
          && !/^\d+$/.test(query.trim()) && (
          <button onClick={() => {
              setWrongPayload({ query, answerType: 'unanswered', answerText: hasAnyCondition(parsed) ? '(일치 결과 없음)' : '(질문 인식 실패)', parsed });
              setWrongOpen(true);
            }}
            className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-amber-700/50 text-amber-300 text-[11px] font-bold">
            📌 이 질문을 기록 (나중에 답할 수 있게 개선)
          </button>
        )}

        <div className="text-[11px] text-center mt-2">
          {!isListening && query.length === 0 && <span className="text-slate-500">🎤 마이크 또는 키보드</span>}
          {!isListening && query.length >= 2 && results.length === 0 && hasAnyCondition(parsed) && <span className="text-red-400 font-bold">⚠ 일치 없음</span>}
          {!isListening && query.length >= 2 && results.length === 1 && !parsed.isStat && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && results.length > 1 && !parsed.isStat && <span className="text-amber-400 font-bold">⚠ {results.length}개 일치</span>}
          {isListening && <span className="text-red-300 font-bold">🎙 듣는 중...</span>}
        </div>
      </div>

      {/* M5.80: 멀티턴 AI 대화 카드 */}
      {chatMessages.length > 0 && (
        <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-cyan-950 border-2 border-purple-500 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-300"/>
              <div className="text-[11px] text-purple-300 font-bold uppercase">
                AI 대화 (Gemini Flash)
              </div>
              {ragInfo && ragInfo.narrowed && (
                <span className="text-[10px] text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded font-bold">
                  🎯 RAG: {ragInfo.filterDesc} ({ragInfo.candidateCount}대)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => {
                const lastModel = [...chatMessages].reverse().find(m => m.role === 'model');
                const lastUser = [...chatMessages].reverse().find(m => m.role === 'user');
                setWrongPayload({
                  query: lastUser?.content || query,
                  answerType: 'ai',
                  answerText: lastModel?.content || aiAnswer,
                  parsed,
                });
                setWrongOpen(true);
              }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 text-[10px] font-bold border border-red-700/40">
                ❌ 오답
              </button>
              <button onClick={handleNewChat}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-[10px] font-bold border border-slate-600/40">
                🔄 새 대화
              </button>
            </div>
          </div>

          {/* 대화 메시지들 (말풍선) */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-amber-700/40 border border-amber-600/40 text-amber-100 text-sm'
                    : 'bg-slate-800/60 border border-purple-600/30 text-slate-100 text-base'
                }`}>
                  <div className="text-[9px] uppercase font-bold mb-0.5 opacity-70">
                    {m.role === 'user' ? '검수원' : 'AI'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  {m.role === 'model' && m.ragInfo && m.ragInfo.narrowed && (
                    <div className="mt-1 text-[9px] text-cyan-400/80 font-bold">
                      📌 {m.ragInfo.filterDesc} ({m.ragInfo.candidateCount}대 참조)
                    </div>
                  )}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-purple-600/30">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300 inline"/>
                  <span className="ml-2 text-xs text-slate-400">AI 생각 중...</span>
                </div>
              </div>
            )}
          </div>

          {/* 후속 질문 입력창 */}
          {!aiLoading && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={followupQuery}
                onChange={e => setFollowupQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && followupQuery.trim()) handleSendFollowup();
                }}
                placeholder="후속 질문 (예: 그 중 양하만, 위험물은?)"
                className="flex-1 px-3 py-2 bg-slate-800 border border-purple-700/40 rounded text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              />
              <button onClick={handleSendFollowup}
                disabled={!followupQuery.trim()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-bold text-sm">
                보내기
              </button>
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-500">
            💡 이전 대화 기억함 — "그 중...", "위에 뭐 있어?" 같은 후속 질문 가능 · {chatMessages.length / 2}턴
          </div>
        </div>
      )}

      {/* M3.2: 로컬 답변 카드 (베이/POL/POD/구역/무게합/위치 등 - AI 의존 X) */}
      {localAnswer && chatMessages.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border-2 border-emerald-600 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-300"/>
              <div className="text-[11px] text-emerald-300 font-bold uppercase">즉답 (로컬 분석)</div>
            </div>
            <button onClick={() => {
              setWrongPayload({ query, answerType: 'local', answerText: localAnswer, parsed });
              setWrongOpen(true);
            }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 text-[10px] font-bold border border-red-700/40">
              ❌ 오답
            </button>
          </div>
          <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed mono">{localAnswer}</div>
        </div>
      )}

      {/* 통계 답변 카드 (단순 카운트) — 로컬 답변이 없을 때만 */}
      {parsed.isStat && hasAnyCondition(parsed) && query.length >= 2 && !aiAnswer && !localAnswer && chatMessages.length === 0 && (
        <div className="bg-gradient-to-br from-cyan-950 to-slate-900 border-2 border-cyan-600 rounded-xl p-4 text-center">
          <div className="text-[11px] text-cyan-400 font-bold uppercase mb-1">개수 답변</div>
          <div className="text-base text-slate-300 mb-2">{describeQuery(parsed)}</div>
          <div className="text-6xl sm:text-7xl font-black mono text-cyan-300 my-2"
            style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.6)' }}>
            {results.length}
          </div>
          <div className="text-lg text-cyan-400 font-bold">대</div>
        </div>
      )}

      {/* 일반 결과 (로컬 답변/통계 카드 없을 때만 표시)
          V7.90: 현재 작업(모드·미완료)만 기본 표시 — 반대 모드·완료분은 접이식.
          선적 중 양하분이 조회에 나와 방해·중복되던 문제(사용자 제보) 해결.
          접이식이라 "있는 자료를 못 찾는" V7.53 이전 문제로는 돌아가지 않음. */}
      {!parsed.isStat && !aiAnswer && !localAnswer && chatMessages.length === 0 && (() => {
        const main = results.filter(c => !c._comp && c._mode === workFilter);
        const others = results.filter(c => c._comp || c._mode !== workFilter);
        const othersLabel = (n) => `다른 작업·완료분에 ${n}건 — 보기`;
        return (
          <>
            {main.length === 1 && (
              <BigResultCard c={main[0]} allContainers={allContainers}
                voyageKey={voyageKey} inspector={inspector}
                onOpen={() => onOpenContainer?.(main[0])}
                onAfterComplete={() => { setQuery(''); stopSpeak(); }}
              />
            )}
            {main.length > 1 && main.slice(0, 30).map(c => (
              <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} />
            ))}
            {others.length > 0 && results.length > 0 && (
              <div className="mt-1">
                <button onClick={() => setShowOthers(v => !v)}
                  className="w-full py-1.5 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 font-bold">
                  {showOthers ? '▲ 접기' : `▼ ${othersLabel(others.length)}`}
                </button>
                {showOthers && others.slice(0, 20).map(c => (
                  <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} />
                ))}
              </div>
            )}
          </>
        );
      })()}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)}/>
      <WrongAnswerModal
        open={wrongOpen}
        onClose={() => setWrongOpen(false)}
        query={wrongPayload?.query || ''}
        answerType={wrongPayload?.answerType || 'unknown'}
        answerText={wrongPayload?.answerText || ''}
        parsed={wrongPayload?.parsed || null}
        voyageKey={voyageKey}
        voyageVsl={voyage?.info?.vsl || ''}
        inspector={inspector}
      />
    </>
  );
}

// ─── 트윈 모드 (자동 짝꿍) ───
function TwinSearch({ voyage, voyageKey, inspector, allContainers, workFilter, onOpenContainer }) {
  const [q1, setQ1] = useState('');
  const [c1, setC1] = useState(null); // 앞 컨테이너 (선택됨)
  const [c2, setC2] = useState(null); // 뒤 컨테이너 (선택됨, 자동 짝꿍)
  const [autoTwin, setAutoTwin] = useState(true); // 자동 짝꿍 ON/OFF
  const [twinBusy, setTwinBusy] = useState(false); // 통합 완료 처리 중

  // 이미 검수 완료된 컨번호 = 짝 후보에서 제외
  // 같은 트윈 작업으로 묶이지 않도록
  const r1 = useMemo(() => {
    if (!q1 || q1.length < 2) return [];
    const Q = q1.toUpperCase();
    return allContainers.filter(c => {
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      if (Q.length === 4) return last4 === Q;
      return last4.endsWith(Q) || c.cn?.includes(Q);
    });
  }, [q1, allContainers]);

  // 앞 컨이 1개로 좁혀지면 자동 선택 + 짝꿍 찾기
  // M6.22: voyage.info의 imo/vsl 전달 → 베이사전 활용으로 매칭 정확도 향상
  //        (EDI에 짝수 베이 누락된 경우에도 짝꿍 매칭 보장)
  const shipImo = voyage?.info?.imo || '';
  const shipName = voyage?.info?.vsl || '';
  useEffect(() => {
    if (r1.length === 1 && autoTwin) {
      const front = r1[0];
      // 증상2 수정: 같은 앞 컨이 이미 선택돼 있으면(완료로 인한 재실행 등)
      //   화면을 다시 계산해 갈아엎지 않고 현재 짝꿍을 유지한다.
      if (c1 && c1.cn === front.cn) return;
      setC1(front);
      // 짝꿍 탐색 시 완료된 컨도 후보에 포함(excludeCns 비움)해야
      //   앞을 먼저 완료해도 뒤 컨이 계속 보인다.
      const twin = findTwinCandidate(front, allContainers, new Set(), shipImo, shipName);
      setC2(twin);
    } else if (r1.length === 0) {
      setC1(null);
      setC2(null);
    } else if (r1.length > 1) {
      // V7.60: 끝4자리 중복 — 사용자가 선택 버튼으로 고른 컨이 후보 안에 있으면 유지.
      //   (구) 무조건 null → 버튼 클릭으로 선택해도 즉시 지워져 "선택이 안 됨" (메모 버그).
      if (!c1 || !r1.some(c => c.cn === c1.cn)) { setC1(null); setC2(null); }
    }
  }, [r1, autoTwin, allContainers, shipImo, shipName, c1]);

  // 증상3 수정: 옛 c1/c2 객체의 _comp는 갱신되지 않으므로,
  //   최신 allContainers에서 두 컨의 완료 여부를 다시 조회해 판단한다.
  const handleAfterComplete = () => {
    if (!c1) return;
    const isComp = (cn) => {
      const live = allContainers.find(x => x.cn === cn);
      return !!(live && live._comp);
    };
    const c1Done = isComp(c1.cn);
    const c2Done = c2 ? isComp(c2.cn) : true; // 짝꿍 없으면 앞 컨만으로 판단
    if (c1Done && c2Done) {
      setQ1(''); setC1(null); setC2(null);
    }
  };

  // 통합 완료: 앞+뒤를 한 번에 처리
  const handleCompleteBoth = async () => {
    if (!c1 || !c2 || twinBusy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    setTwinBusy(true);
    try {
      if (!c1._comp) await fbCompleteContainer(voyageKey, c1._mode, c1.cn, inspector);
      if (!c2._comp) await fbCompleteContainer(voyageKey, c2._mode, c2.cn, inspector);
      setTimeout(() => { setQ1(''); setC1(null); setC2(null); }, 500);
    } finally {
      setTwinBusy(false);
    }
  };

  const handleSwapTwin = () => {
    setC2(null);
  };

  return (
    <>
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-2 text-xs text-blue-300 text-center">
        🚛 트윈: 앞 컨 입력 → EDI 베이 분석으로 짝꿍 자동 추천
        <div className="text-[10px] text-blue-400/70 mt-0.5">완료된 컨은 짝 후보 제외 · 통로 사이 단독 베이는 짝 없음</div>
      </div>

      <div className="bg-slate-900 border border-amber-700/40 rounded-lg p-3">
        <div className="text-[10px] text-amber-400 font-bold mb-2 flex items-center gap-1">
          <span className="bg-amber-700 text-amber-50 px-1.5 py-0.5 rounded text-[10px] font-black">앞</span>
          앞 컨테이너 — 끝4자리
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={q1}
            onChange={e => setQ1(e.target.value.toUpperCase())}
            placeholder="끝 4자리 또는 컨번호"
            inputMode="text" autoComplete="off"
            className="w-full pl-9 pr-10 py-3 bg-slate-800 border border-amber-700/40 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          {q1 && <button onClick={() => { setQ1(''); setC1(null); setC2(null); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-slate-500"/></button>}
        </div>
        {q1.length >= 2 && r1.length === 0 && <div className="mt-2 text-[11px] text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
        {r1.length > 1 && (
          <div className="mt-2 text-[11px] text-amber-400 text-center">
            {r1.length}개 일치 — 정확히 입력 또는 선택:
            <div className="flex flex-wrap gap-1 mt-1 justify-center">
              {r1.slice(0, 8).map(c => (
                <button key={c.cn} onClick={() => { setC1(c); setC2(findTwinCandidate(c, allContainers, new Set(), shipImo, shipName)); }}
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] mono text-amber-300">
                  {c.cn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {c1 && (
        <BigResultCard c={c1} allContainers={allContainers}
          voyageKey={voyageKey} inspector={inspector}
          onOpen={() => onOpenContainer?.(c1)}
          onAfterComplete={handleAfterComplete}
          label="앞" labelColor="amber"
        />
      )}

      {/* 짝꿍 표시 / 수정 */}
      {c1 && (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 border-t border-slate-700"/>
          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
            <Link2 className="w-3 h-3"/>트윈 짝꿍
          </div>
          <div className="flex-1 border-t border-slate-700"/>
        </div>
      )}

      {c1 && c2 && (
        <BigResultCard c={c2} allContainers={allContainers}
          voyageKey={voyageKey} inspector={inspector}
          onOpen={() => onOpenContainer?.(c2)}
          onAfterComplete={handleAfterComplete}
          label="뒤 (자동)" labelColor="cyan"
        />
      )}

      {c1 && !c2 && (
        <ManualTwinPicker allContainers={allContainers} c1={c1} onPick={setC2}/>
      )}

      {c1 && c2 && (
        <button onClick={handleCompleteBoth} disabled={twinBusy}
          className="w-full py-3 rounded-lg font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
          <Link2 className="w-5 h-5"/>
          {twinBusy ? '처리 중…' : (c1._mode === 'discharge' ? '트윈 한 번에 양하확인' : '트윈 한 번에 선적확인')}
        </button>
      )}

      {c1 && c2 && (
        <button onClick={handleSwapTwin} className="w-full text-xs text-slate-400 hover:text-amber-300 py-2 bg-slate-900 rounded">
          뒤 컨 짝꿍 변경 (수동 선택)
        </button>
      )}
    </>
  );
}

function ManualTwinPicker({ allContainers, c1, onPick }) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    if (!q || q.length < 2) return [];
    const Q = q.toUpperCase();
    return allContainers.filter(c => {
      if (c.cn === c1.cn) return false;
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      if (Q.length === 4) return last4 === Q;
      return last4.endsWith(Q);
    }).slice(0, 8);
  }, [q, allContainers, c1]);

  return (
    <div className="bg-slate-900 border border-cyan-700/40 rounded-lg p-3">
      <div className="text-[10px] text-cyan-400 font-bold mb-2 flex items-center gap-1">
        <span className="bg-cyan-700 text-cyan-50 px-1.5 py-0.5 rounded text-[10px] font-black">뒤</span>
        짝꿍 자동 못 찾음 — 수동 입력
      </div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
        <input type="text" value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          placeholder="끝 4자리"
          inputMode="text" autoComplete="off"
          className="w-full pl-9 pr-3 py-3 bg-slate-800 border border-cyan-700/40 rounded text-2xl font-black mono text-cyan-200 text-center tracking-widest focus:outline-none focus:border-cyan-500"/>
      </div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {matches.map(c => (
            <button key={c.cn} onClick={() => onPick(c)}
              className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-[11px] mono text-cyan-300">
              {c.cn}
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && matches.length === 0 && (
        <div className="mt-2 text-[11px] text-red-400 text-center">컨테이너 없음</div>
      )}
    </div>
  );
}

function SmallResultCard({ c, onOpen }) {
  const isDone = !!c._comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const hasTmp = c.tmp != null && String(c.tmp).trim() !== '';
  const isReeferF = c.rf && hasTmp && c.fe === 'F';
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border rounded-lg p-2 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30' : c._xray ? 'border-purple-700/30' : 'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
        c._mode === 'discharge' ? 'bg-blue-900 text-blue-200'
        : c._mode === 'loading' ? 'bg-amber-900 text-amber-200'
        : 'bg-gray-700 text-gray-300'
      }`}>{c._mode === 'discharge' ? '양하' : c._mode === 'loading' ? '선적' : '중계'}</span>
      <span className="font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
      <span className="text-[10px] text-slate-400 mono truncate flex-1">{c.cn}</span>
      <span className="text-[9px] mono text-slate-400">{isoToLabel(c.iso) || c.tp || ''}</span>
      <span className={`text-[9px] mono px-1 rounded font-bold ${
        c.fe === 'F' ? 'bg-emerald-900/60 text-emerald-300' :
        c.fe === 'E' ? 'bg-slate-700 text-slate-300' :
        'bg-amber-900/60 text-amber-300'
      }`}>{c.fe || '?'}</span>
      {isReeferF && <span className="bg-cyan-700/60 text-cyan-100 text-[9px] px-1 rounded font-bold">❄{c.tmp}°</span>}
      {!isReeferF && isReefer && <span className="text-cyan-400 text-xs">❄</span>}
      {c.dg && <span className="text-red-400 text-xs">🔥</span>}
      {c._xray && <span className="text-purple-400 text-xs">🔍</span>}
      {isDone && <span className="text-emerald-400 text-xs">✓</span>}
    </button>
  );
}
