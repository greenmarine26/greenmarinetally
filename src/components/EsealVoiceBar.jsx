// ATPR 위해행 엠티 선적 — 자동 가이드 카드 밑에서 «엠티실 뒷 세 자리»를 음성으로 받아 구간 앞 세 자리와 합쳐 저장하는 막대
/* ★ TallyOne 3.71 (검수사 2026-09-30) — 자동 가이드가 컨번호를 부른 뒤, 그 컨이 ATPR 위해행 엠티(엠티실 부착)이면
   «엠티실 뒷 세 자리» 를 말하고 마이크를 연다. 검수원이 세 자리를 부르면 항차 엠티실 구간(선적 목록 🔖 카드)의 앞 세 자리와
   합쳐 여섯 자리 실로 fbSetEmptySeal(컨 상세·기록지 사진과 같은 저장 길)에 넣는다 — 리스트·엠티실 보고서가 그대로 읽는다.
   ⚠ 다른 선박·다른 POD 엠티에는 아무것도 하지 않는다(isAtprWeiEmpty). 트윈이면 컨마다 차례로 묻는다.
   ⚠ 선적확인을 막지는 않는다 — 실 없이 넘기면 붉은 안내가 남는다(컨 상세에서도 넣을 수 있다). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { speak, spellKo } from '../voice.js';
import { fbSetEmptySeal } from '../firebase.js';
import { canWorkNow, workGateText } from '../workChoice.js';
import { isAtprWeiEmpty, esealPoolOf, esealUsedMap, resolveSpokenSeal } from '../esealVoice.js';

const MAX_TRY = 3;   // 못 알아들으면 마이크를 세 번까지 다시 연다

export default function EsealVoiceBar({ voyage, voyageKey, inspector, card, mode, voiceOn = true }) {
  const vsl = voyage?.info?.vsl || '';
  const ranges = voyage?.loading?.esealRanges?.list || null;
  const pool = useMemo(() => esealPoolOf(ranges), [ranges]);
  const records = voyage?.loading?.records || null;
  const edi = voyage?.loading?.ediContainers || null;
  const used = useMemo(() => esealUsedMap(records, edi), [records, edi]);

  const [saved, setSaved] = useState({});        // 방금 저장한 {컨: 실} — 구독이 돌아오기 전에도 다음 컨으로 넘어가게
  const [redo, setRedo] = useState({});          // 고쳐 다시 받을 컨
  const [status, setStatus] = useState('');
  const [choices, setChoices] = useState([]);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const cards = card ? [card.main, card.twin].filter(Boolean) : [];
  const targets = mode === 'loading' ? cards.filter((c) => isAtprWeiEmpty(vsl, c)) : [];
  const curSeal = (c) => String(saved[c.cn] || records?.[c.cn]?.eseal || edi?.[c.cn]?.eseal || c.eseal || '').trim();
  const needs = targets.filter((c) => !curSeal(c) || redo[c.cn]);
  const active = needs[0] || null;
  const activeCn = active ? active.cn : '';
  const canPrompt = !!activeCn && pool.length > 0 && canWorkNow();   // 조회만은 소리로 묻지도 않는다(감사 권고)

  //  최신 값은 ref 로 — 마이크 콜백이 옛 값을 잡지 않게
  const live = useRef({});
  live.current = { pool, used, activeCn, targets, voyageKey, inspector };
  const srRef = useRef(null);
  const tryRef = useRef(0);
  const deadRef = useRef(false);

  const stopMic = useCallback(() => {
    const r = srRef.current; srRef.current = null;
    if (r) { r.onresult = null; r.onend = null; r.onerror = null; try { r.abort(); } catch { /* 이미 멈춤 */ } }
    setListening(false);
  }, []);

  const save = useCallback(async (cn, seal, tail) => {
    if (!canWorkNow()) { setStatus(workGateText('엠티실 입력')); return false; }   // 3.51: 조회만은 보기만
    setBusy(true);
    try {
      await fbSetEmptySeal(live.current.voyageKey, 'loading', cn, { eseal: seal }, live.current.inspector, 'attach');
      setSaved((p) => ({ ...p, [cn]: seal }));
      setRedo((p) => { if (!p[cn]) return p; const n = { ...p }; delete n[cn]; return n; });
      setChoices([]); setTyped(''); setStatus('');
      try { speak(`${spellKo(tail || seal.slice(-3))}`, { conversational: true }); } catch { /* 소리 꺼짐 */ }
      return true;
    } catch (e) {
      console.warn('[3.71] 엠티실 저장 실패', e);
      setStatus('저장이 안 됐어요 — 다시 불러 주세요');
      try { speak('저장이 안 됐어요'); } catch { /* 소리 꺼짐 */ }
      return false;
    } finally { setBusy(false); }
  }, []);

  //  들은 말 → 실 하나로 정해지면 저장, 둘 이상이면 고르게, 못 알아들으면 다시 듣는다
  const handleHeard = useCallback(async (alts, startListen, viaMic = false) => {
    const cn = live.current.activeCn;
    if (!cn) return;
    const res = resolveSpokenSeal(alts, live.current.pool, live.current.used, cn);
    if (res.seal) { await save(cn, res.seal, res.tail); return; }
    if (res.choices.length > 1) {
      setChoices(res.choices); setStatus(res.why);
      try { speak('앞 세 자리가 둘 이상입니다. 화면에서 골라 주세요'); } catch { /* 소리 꺼짐 */ }
      return;
    }
    setStatus(res.why);
    if (viaMic && tryRef.current < MAX_TRY && !deadRef.current) {   // 손으로 친 것은 다시 열지 않는다
      tryRef.current += 1;
      try { speak(`${res.why}. 다시 불러 주세요`); } catch { /* 소리 꺼짐 */ }
      setTimeout(() => { if (!deadRef.current && live.current.activeCn === cn) startListen(); }, 2200);
    }
  }, [save]);

  const startListen = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('이 기기는 음성 입력이 안 돼요 — 숫자로 넣어 주세요'); return; }
    if (!canWorkNow()) { setStatus(workGateText('엠티실 입력')); return; }
    stopMic();
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
    let got = false;
    r.onresult = (e) => {
      got = true;
      const last = e.results[e.results.length - 1];
      const alts = []; for (let i = 0; i < last.length; i++) alts.push(last[i].transcript);
      handleHeard(alts, startListen, true);
    };
    r.onend = () => {
      setListening(false);
      if (got || deadRef.current || srRef.current !== r) return;
      if (tryRef.current < MAX_TRY && live.current.activeCn) {   // 아무 말도 못 들음 — 다시 연다
        tryRef.current += 1;
        setTimeout(() => { if (!deadRef.current && live.current.activeCn) startListen(); }, 500);
      } else setStatus('듣지 못했어요 — 🎤 를 누르거나 숫자로 넣어 주세요');
    };
    r.onerror = (e) => { if (e.error === 'not-allowed') { setStatus('마이크 권한이 필요해요'); try { speak('마이크 권한 필요'); } catch { /* 소리 꺼짐 */ } } };
    srRef.current = r; setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [handleHeard, stopMic]);

  //  컨이 바뀔 때마다 — 컨번호 낭독(GuidedWorkPanel)이 끝나길 기다렸다가 «엠티실 뒷 세 자리» 를 말하고 마이크를 연다
  useEffect(() => {
    if (!canPrompt) return undefined;
    deadRef.current = false; tryRef.current = 0;
    setStatus(''); setChoices([]); setTyped('');
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(() => { if (!deadRef.current) fn(); }, ms)); };
    const whenIdle = (fn, n = 0) => {
      let busySpeak = false;
      try { busySpeak = !!(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)); } catch { /* 무시 */ }
      if (busySpeak && n < 40) later(() => whenIdle(fn, n + 1), 250); else fn();
    };
    if (voiceOn) {
      later(() => whenIdle(() => {
        const who = live.current.targets.length > 1 ? `${spellKo(String(active.l4 || activeCn.slice(-4)))} ` : '';
        try { speak(`${who}엠티실 뒷 세 자리`, { conversational: true }); } catch { /* 소리 꺼짐 */ }
        later(() => whenIdle(() => startListen()), 500);
      }), 900);   // 부모의 «다음, ○○○○» 낭독이 시작될 틈을 준다
    }
    return () => { deadRef.current = true; timers.forEach(clearTimeout); stopMic(); };
  }, [activeCn, canPrompt, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!targets.length) return null;

  const l4 = (c) => String(c.l4 || c.cn.slice(-4));
  const prefixes = Array.from(new Set(pool.map((s) => s.slice(0, s.length - 3))));

  return (
    <div className="bg-cyan-950/40 border border-cyan-700 rounded-xl p-2.5 space-y-2" data-eseal-voice="1">
      <div className="text-xs font-bold text-cyan-200">🔖 엠티실 (위해행) — 뒷 세 자리{prefixes.length ? <span className="text-cyan-400 font-normal"> · 앞 {prefixes.join(' · ')}</span> : null}</div>
      {!pool.length && (
        <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-700 rounded-lg p-2">
          엠티실 구간이 아직 없어요 — 선적 목록의 🔖 «이번 항차 엠티실은 몇 번 실부터…» 에 구간을 먼저 넣어 주세요.
        </div>
      )}
      {targets.map((c) => {
        const s = curSeal(c);
        const isActive = c.cn === activeCn;
        return (
          <div key={c.cn} className={`rounded-lg p-2 ${isActive ? 'bg-cyan-900/40 border border-cyan-500' : 'bg-ink-900 border border-line'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-sm font-bold text-white">{l4(c)}</span>
              {s && !redo[c.cn]
                ? <span className="flex items-center gap-2"><span className="mono text-sm font-bold text-emerald-300">✅ {s}</span>
                    <button onClick={() => { setRedo((p) => ({ ...p, [c.cn]: true })); }} className="text-xxs px-2 py-1 rounded-pill bg-ink-800 text-dim-300">고치기</button></span>
                : <span className="text-xs font-bold text-red-300">실 미입력</span>}
            </div>
            {isActive && pool.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="mono text-sm text-cyan-300 shrink-0">{prefixes.length === 1 ? prefixes[0] : '···'} +</span>
                  <input value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="뒷 세 자리"
                    onKeyDown={(e) => { if (e.key === 'Enter' && typed.length >= 3) handleHeard([typed], startListen); }}
                    className="flex-1 min-w-0 bg-ink-950 border border-line rounded px-2 py-2 text-base mono text-white" />
                  <button onClick={() => handleHeard([typed], startListen)} disabled={busy || typed.length < 3}
                    className="px-3 py-2 rounded-pill font-bold text-sm bg-cyan-700 disabled:opacity-40 text-white">저장</button>
                  <button onClick={() => { tryRef.current = 0; if (listening) stopMic(); else startListen(); }}
                    className={`px-3 py-2 rounded-pill font-bold text-sm ${listening ? 'bg-rose-600 animate-pulse' : 'bg-ink-800'} text-white`} aria-label="엠티실 음성 입력">🎤</button>
                </div>
                {choices.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {choices.map((ch) => (
                      <button key={ch} onClick={() => save(c.cn, ch, ch.slice(-3))} className="px-3 py-1.5 rounded-pill font-bold text-sm mono bg-cyan-800 text-white">{ch}</button>
                    ))}
                  </div>
                )}
                <div className="text-xxs text-cyan-300">{listening ? '🎤 듣는 중 — 뒷 세 자리를 불러 주세요' : (status || '🎤 를 누르고 뒷 세 자리를 불러 주세요')}</div>
              </div>
            )}
          </div>
        );
      })}
      {needs.length === 0 && targets.length > 0 && <div className="text-xxs text-emerald-300">엠티실 입력 끝 — 선적확인을 누르세요</div>}
    </div>
  );
}
