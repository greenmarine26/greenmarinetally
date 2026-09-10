// 떠 있는 미르 — 검수앱 어느 화면에서든 오른쪽 아래 얼굴을 누르면 시트가 올라와 모든 질문을 받는다(콘앱 bindMirFab 과 같은 꼴).
/* ★ TallyOne 3.41 (검수사 2026-09-10 «미르를 앱 어디에든 항상 띄워서 모든 질문을 받을수 있게 해주세요»)
   - 답은 `mirAnswer.answerOne` 한 벌 — 작업창·양하선적 탭·홈·콘앱과 같은 함수다.
   - 재료: 항차 화면이 열려 있으면 그 화면이 `publishMirCtx` 로 놓아 둔 것(컨·완료·시프팅·트윈 짝…)을 읽고,
     아니면 질문 속 배 이름으로 항차를 고른다(홈 통합검색 pickShipCtx 와 같은 규칙). 배가 없으면 전 항차 재료로 답한다.
   - 플랜 명령(«KBTR 카고플랜 보여줘»)은 App 의 mirPlan 덮개를 연다(홈과 같은 길).
   - 못 답하면 «못 배웠어요» + 받은함 자동 신고(mir_unanswered, 홈과 같은 규칙) — 판 B 에서 이 자리에 모델이 붙는다.
   - 자리: 오른쪽 아래, TOP 버튼(ScrollTopButton bottom-5 right-4) 바로 위. 콘앱 미르 얼굴·마이크·목소리와 같은 벌. */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import mirFaceUrl from '../assets/mir-face.png';
import { answerOne } from '../mirAnswer.js';
import { parseNaturalQuery } from '../nlSearch.js';
import { parseViewCommand } from '../planCommand.js';
import { flattenVoyages, readMirCtx, subscribeMirCtx, pickShipCtx } from '../mirCtx.js';
import { computeTallyData } from '../tallyReport.js';
import { matchPortMis } from '../portMisMatch.js';
import { getBayPairs } from '../twin.js';
import { speak, stopSpeak, speakLong, parseSpokenDigits, pickSpeechAlternative, fixSpeechDomain } from '../voice.js';
import { logQuerySettled } from '../activityLog.js';
import { fbAddClaudeMemo, fbGetSimple, fbListArchive, fbSetVoyageCraneCrew, fbSetVoyageGangs, fbSetVoyageWorkStart } from '../firebase.js';
import { fetchWeatherText } from '../weatherText.js';   // 3.41: 날씨 문장 한 벌(작업창과 공용)
import { resolveCrewSides, crewShiftKey, gangKeyFromWords, koJosa, parseSpokenTimeMs } from '../utils.js';
import { useCarrierContacts, useShipSpeed, useEdiPattern } from '../useCarrierContacts.js';

const CLEAN_RE = /[📋📌⚠↩·❄🔁📊📦📖🐱🐟😺😻🎵📍⏳⏱🗺🚢✅📝🧳🌤📈]/g;

export default function MirFab({ voyages, inspector, isChief = false, portMisData = {}, terminalWork = {}, pilotForecast = {}, heartbeat = null, onOpenPlan = null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState(() => readMirCtx());
  const lastRef = useRef('');
  const reportedRef = useRef(new Set());
  const sideRef = useRef('');
  const chiefRef = useRef({});
  const carrierContacts = useCarrierContacts();
  const shipSpeed = useShipSpeed();
  const ediPattern = useEdiPattern();
  useEffect(() => subscribeMirCtx(setLive), []);
  const flat = useMemo(() => { try { return flattenVoyages(voyages, terminalWork); } catch (e) { console.warn('[미르] 전 항차 펼치기 실패:', e); return []; } }, [voyages, terminalWork]);

  //  수석 노드(feedback·tally_pending·archive)는 물었을 때 1회 — 홈 통합검색과 같은 절제(1.69: 자동 호출 금지).
  const ensureChiefData = useCallback(async (text, shipless) => {
    if (!isChief) return chiefRef.current;
    const want = [];
    if (/오답|미회신|피드백/.test(text) && chiefRef.current.feedback === undefined) want.push(['feedback', () => fbGetSimple('feedback')]);
    if (/마감|텔리/.test(text) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(text) && chiefRef.current.tallyPending === undefined) want.push(['tallyPending', () => fbGetSimple('tally_pending')]);
    //  감사 지적(중 9) — 보관소(월 통계·어제 실적·완료 배·«보관 몇 항차»)도 홈과 같은 규칙으로 1회 읽는다(1.6 사고 — 자동 호출 금지, 물었을 때만).
    if (/이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*(?:항차|된\s*배)|보관|몇\s*항차|최근\s*완료/.test(text) && chiefRef.current.archiveList === undefined) want.push(['archiveList', fbListArchive]);
    //  완료·보관된 배의 «진행» — 홈과 같이 **배를 못 찾았을 때만**(1.69-06) 보관소를 1회 읽는다.
    if (shipless && /진행|얼마나\s*(?:했|됐)|어디까지|다\s*했|몇\s*프로|퍼센트|끝났|몇\s*대\s*(?:했|됐)/.test(text) && !/자료/.test(text) && chiefRef.current.archiveList === undefined) want.push(['archiveList', fbListArchive]);
    for (const [k, fn] of want) {
      try { chiefRef.current[k] = (await fn()) ?? (k === 'archiveList' ? [] : {}); } catch (e) { console.warn('[미르] 수석 노드 읽기 실패 —', k, e); chiefRef.current[k] = { __error: true }; }
    }
    return chiefRef.current;
  }, [isChief]);

  //  «1호기 김판석 2호기 이종부»·«3갱으로 기억해»·«22시 시작» — 작업창과 같은 저장(말만 하고 안 적으면 거짓말이다).
  const applySideEffects = useCallback((parsed, voyageKey, voyage, text) => {
    if (!parsed || !voyageKey) return;
    try {
      const cs = resolveCrewSides(parsed.crewSet, voyage);
      if (cs && Array.isArray(cs.crew) && cs.crew.length) {
        const sk = crewShiftKey(cs.shift, Date.now(), cs.dayOff || 0);
        const key = `crew|${voyageKey}|${sk.key}|${cs.crew.map((x) => x.no + ':' + x.name).join(',')}`;
        if (sideRef.current !== key) {
          sideRef.current = key;
          fbSetVoyageCraneCrew(voyageKey, sk.key, cs.crew)
            .then((txt) => { try { speak(`${sk.key}조 ${koJosa(String(txt), '으로')} 기억했어요`, { conversational: true }); } catch (e) { /* 소리 꺼짐 */ } })
            .catch((e) => { console.warn('[미르] 호기 검수원 저장 실패', e); sideRef.current = ''; setOut((o) => (o || '') + '\n⚠ 호기 검수원 저장이 안 됐어요 — 다시 말해 주세요.'); });
        }
      }
      if (parsed.gangSet && parsed.gangSet.n) {
        const key = `gang|${voyageKey}|${parsed.gangSet.n}`;
        if (sideRef.current !== key) { sideRef.current = key; fbSetVoyageGangs(voyageKey, parsed.gangSet.n, inspector || '', gangKeyFromWords(parsed.gangSet.dayOff, parsed.gangSet.shift)).catch((e) => console.warn('[미르] 갱 수 저장 실패', e)); }
      }
      if (parsed.startSet) {
        const cr = parsed.startSet.cranes || [];
        const ms = cr.length ? Math.min(...cr.map((x) => x.ms)) : parseSpokenTimeMs(parsed.startSet.raw || text || '');
        if (ms) {
          const key = `start|${voyageKey}|${ms}|${cr.map((x) => x.no + ':' + x.ms).join(',')}`;
          if (sideRef.current !== key) { sideRef.current = key; fbSetVoyageWorkStart(voyageKey, ms, inspector || '', cr).catch((e) => console.warn('[미르] 시작 시각 저장 실패', e)); }
        }
      }
    } catch (e) { console.warn('[미르] 저장 부작용 실패:', e); }
  }, [inspector]);

  const ask = useCallback(async (text) => {
    const t = String(text || '').trim();
    if (t.length < 2) return;
    setBusy(true); setOut('…');
    try {
      //  ① 플랜 명령 — 열어 준다(홈 _askGlobal 과 같은 길). 배를 못 찾으면 붙이라고 말한다.
      const cmd = parseViewCommand(t);
      const lv = readMirCtx();
      const sc = pickShipCtx(t, voyages, lv && lv.voyageKey ? lv.voyageKey : null);
      if (cmd && onOpenPlan) {
        const vk = (sc && sc.key) || (lv && lv.voyageKey) || null;
        if (vk) {
          const md = cmd.mode || (lv && lv.mode) || 'discharge';
          onOpenPlan({ voyageKey: vk, mode: md, what: cmd.what, bay: cmd.bay });
          const what = cmd.what === 'cargo' ? '카고플랜' : (cmd.bay != null ? `${cmd.bay}번 베이플랜` : '베이플랜');
          const a = `🗺 ${(voyages[vk] && voyages[vk].info && voyages[vk].info.vsl) || ''} ${md === 'loading' ? '선적' : '양하'} ${what}을 열었어요.`;
          setOut(a); try { speak(a.replace(CLEAN_RE, ' '), { conversational: true }); } catch (e) { /* */ }
          logQuerySettled('nls', t, { voyageKey: vk, via: 'mir' });
          return;
        }
        const a = '어느 배의 플랜인지 못 찾았어요 😿 «KBTR 카고플랜» 처럼 배 이름을 붙여 주세요.';
        setOut(a); try { speak(a.replace(CLEAN_RE, ' '), { conversational: true }); } catch (e) { /* */ }
        return;
      }
      //  ② 재료 — 열린 항차(live) > 질문 속 배(shipCtx) > 전 항차(flat).
      const useLive = lv && lv.voyageKey && (!sc || sc.key === lv.voyageKey);
      const chiefData = await ensureChiefData(t, !useLive && !sc);
      //  날씨는 물었을 때만 받는다(작업창과 같은 한 벌 fetchWeatherText).
      let weatherText = null;
      if (parseNaturalQuery(t).weatherQuery) { try { weatherText = await fetchWeatherText(); } catch (e) { weatherText = null; } }
      const ctx = {
        app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, weatherText,
        inspector, isChief, chiefData, heartbeat, portMisData, terminalWork, pilotForecast,
        carrierContacts, shipSpeed, ediPattern, voyages, flat,
        computeTallyData, matchPortMis,
        ...(useLive ? lv : (sc ? { shipCtx: sc } : {})),
      };
      if (!useLive && sc && sc.v) {
        try { ctx.bayPairs = getBayPairs(flat.filter((x) => x.voyageKey === sc.key), String(sc.info.imo || ''), String(sc.info.vsl || '')); } catch (e) { /* 짝 없이 */ }
      }
      if (ctx.shipContacts === undefined && parseNaturalQuery(t).contactQuery) {
        try { ctx.shipContacts = (await fbGetSimple('shipContacts')) || {}; } catch (e) { ctx.shipContacts = {}; }
      }
      let a = null;
      try { a = answerOne(t, ctx); } catch (e) { console.warn('[미르] 답 실패:', e); a = null; }
      const vk = useLive ? lv.voyageKey : (sc && sc.key) || null;
      try { applySideEffects(parseNaturalQuery(t), vk, useLive ? lv.voyage : (sc && sc.v), t); } catch (e) { /* */ }
      if (!a) {
        a = '그건 아직 못 배웠어요 😿 지어내지 않을게요. 개발자에게 전달해 둘게요.';
        if (!reportedRef.current.has(t) && /[가-힣]{2,}/.test(t)) {
          reportedRef.current.add(t);
          fbAddClaudeMemo({ kind: 'mir_unanswered', status: 'new', at: Date.now(), inspector: '미르(자동)', text: `미르 무응답 질문 — "${t}" (떠 있는 미르${vk ? ' · ' + vk : ''}). 답할 수 있게 배워서 반영할 것.` }).catch(() => { /* 신고 실패는 무해 */ });
        }
      }
      lastRef.current = a;
      setOut(a);
      logQuerySettled('nls', t, { voyageKey: vk || '', via: 'mir' });
      try { const plain = String(a).replace(CLEAN_RE, ' '); if (plain.length > 400 && speakLong) speakLong(plain); else speak(plain.slice(0, 400), { conversational: true }); } catch (e) { /* 소리 꺼짐 */ }
    } finally { setBusy(false); }
  }, [voyages, flat, inspector, isChief, heartbeat, portMisData, terminalWork, pilotForecast, carrierContacts, shipSpeed, ediPattern, onOpenPlan, ensureChiefData, applySideEffects]);

  //  마이크 — 콘앱 질문바와 같은 교정(후보 5개 → 도메인 사전 → 숫자만이면 끝네자리).
  const recRef = useRef(null);
  const mic = useCallback(() => {
    if (listening) { try { recRef.current && recRef.current.stop(); } catch (e) { /* */ } setListening(false); return; }
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setOut('이 브라우저는 음성 인식을 지원하지 않아요.'); return; }
    try {
      const r = new SR(); r.lang = 'ko-KR'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
      r.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        const alts = []; for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        let text = '';
        try { text = pickSpeechAlternative ? pickSpeechAlternative(alts) : alts[0]; } catch (er) { text = alts[0] || ''; }
        try { text = fixSpeechDomain ? fixSpeechDomain(text) : text; } catch (er) { /* */ }
        text = String(text || '').trim();
        if (text.length < 2) { const d = parseSpokenDigits(alts[0] || ''); if (d && d.length >= 2) text = d; }
        if (text) { setQ(text); ask(text); }
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recRef.current = r; r.start(); setListening(true); try { stopSpeak(); } catch (e) { /* */ }
    } catch (e) { setListening(false); setOut('마이크를 켜지 못했어요 — 브라우저 마이크 권한을 확인해 주세요.'); }
  }, [listening, ask]);

  if (!inspector) return null;   // 로그인 전에는 안 띄운다
  const ctxLabel = live && live.voyageKey ? `${(live.info && live.info.vsl) || live.voyageKey} · ${live.mode === 'loading' ? '선적' : '양하'} 자료로 답해요` : '배 이름을 붙이면 그 항차로 답해요';
  return (
    <>
      <button type="button" aria-label="미르에게 묻기" onClick={() => setOpen((o) => !o)}
        className="fixed right-4 z-[10001] w-12 h-12 rounded-full border-2 border-amber-500 shadow-lg shadow-black/50 active:scale-95"
        style={{ bottom: 76, background: `#f7f8fa url(${mirFaceUrl}) center/cover no-repeat` }} />
      {open && (
        <div className="fixed left-0 right-0 bottom-0 z-[10002] bg-ink-900 border-t-2 border-amber-500 rounded-t-2xl px-3 pt-3 pb-4 shadow-[0_-6px_24px_rgba(0,0,0,.5)]" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex-none" style={{ background: `#f7f8fa url(${mirFaceUrl}) center/cover no-repeat` }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white">미르에게 묻기</div>
              <div className="text-2xs text-dim-300 truncate">{ctxLabel} · "3426 온도" · "브리핑" · "접안 현측" · "마감텔리 수치"</div>
            </div>
            <button type="button" onClick={() => { setOpen(false); try { stopSpeak(); } catch (e) { /* */ } }} className="w-9 h-9 rounded bg-ink-800 border border-line text-dim-100">✕</button>
          </div>
          <div className="flex gap-1.5">
            <input id="mirFabIn" type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(q); }}
              placeholder="예: 0230 실번호 · 엠티실 몇 대 남았어" className="flex-1 min-w-0 bg-ink-950 border border-line rounded px-2 py-2 text-sm text-white" />
            <button type="button" onClick={mic} className={`w-11 rounded border border-line ${listening ? 'bg-red-700 text-white' : 'bg-ink-800 text-dim-100'}`} aria-label="말로 묻기">🎤</button>
            <button type="button" onClick={() => { try { stopSpeak(); const plain = String(lastRef.current || out || '').replace(CLEAN_RE, ' '); if (plain) speak(plain.slice(0, 400), { conversational: true }); } catch (e) { /* */ } }} className="w-11 rounded border border-line bg-ink-800 text-dim-100" aria-label="다시 읽어 주기">🔊</button>
            <button type="button" onClick={() => ask(q)} disabled={busy} className="px-3 rounded bg-amber-500 text-[#1a1206] font-black text-sm disabled:opacity-60">질문</button>
          </div>
          {out && (
            <div className="mt-2 p-2.5 rounded bg-ink-950 text-[15px] leading-relaxed font-semibold text-white whitespace-pre-line select-text">{out}</div>
          )}
        </div>
      )}
    </>
  );
}
