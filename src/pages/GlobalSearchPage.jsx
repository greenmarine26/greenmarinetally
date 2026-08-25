// 모든 항차 + 양/선적 통합 검색 + 음성 입력 + AI 자연어 (M1.9)
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, ArrowDown, ArrowUp, MapPin, ChevronRight, Snowflake, SendHorizontal } from 'lucide-react';   // 1.69-05: 전송 버튼
import { speakContainer, parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos, isPyeongtaekPort } from '../utils.js';
import { parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, generateTimeAnswer, generateWakeAnswer, generateIntroAnswer, generateHowToAnswer, isRealtimeProgressQuery, formatTerminalWorkAnswer, formatAppTallyAnswer, generateBriefing, formatCarriers, generateContactAnswer } from '../nlSearch.js';   // 1.85: 통합검색 브리핑 즉답 · 1.89: 관련 선사 · 2.41: 선박 연락처
import { useCarrierContacts, useShipSpeed, useEdiPattern, useDamageIndex } from '../useCarrierContacts.js';   // 1.89·1.92·1.97·2.03
import { diffEdiList, explainEdiGap } from '../ediGap.js';   // 2.35: EDI↔리스트 대수 차이 자가 진단
import { mirTone, mirSmallTalk } from '../mirChat.js';
import { mirKnowledge } from '../data/mirKnowledge.js';
import { mirSee } from '../mirEyes.js';   // 2.47: 한 대를 보는 겹   // 2.34: 검수 실무 기본 지식(검수사 «기본 지식이 없어요»)   // 2.33: 미르 말투(출구 한 겹)·잡담 그물
import mirFaceUrl from '../assets/mir-face.png';   // 2.33: 미르 얼굴 — 검수사 제공 그림
import { fbGetDamagePhoto, fbAddClaudeMemo } from '../firebase.js';   // 2.03: 데미지 사진 단건 · 2.06: 무응답 자동 신고
import { buildReadiness, describeReadiness } from '../dataReadiness.js';   // 1.66-03: "어느 선박 자료 다 있어" · "어느 선사 것이 없지"
import { matchPortMis } from '../portMisMatch.js';   // 1.68: "STSE 출항 몇 시" — 배 이름 맥락으로 즉답
import { fbGetSimple, fbListArchive } from '../firebase.js';   // 1.69: 오답·마감·월통계 — 물었을 때 1회 읽고 캐시
import { answerFeedback, answerCollector, answerTallyPending, answerArchiveStats, answerOverlaps, answerDataArrival, answerHatchStatus, answerGangSplit, answerTotalMoves, answerFirstStart, answerXrayShifts, answerShiftBriefing, isDataArrivalQuery, answerPlanOutlook, answerPlanOutlookBoth, isPlanOutlookQuery, outlookModeOf, answerShipSpeed, isSpeedQuery, answerShipOverview } from '../chiefAnswers.js';   // 1.69: 수석 통계·이력·계산(96~100)
import { runDeviceCmd } from '../utils.js';   // 2.40: 미르 조작(밝기·소리) 실행 단일 벌

// 1.69-05: HH:MM 표기 — «질문 접수»·«다시 확인했습니다» 공용
const _hm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// 2.03 (검수사 확정 «SPSU2041959 혹시 17일날 데미지 잡힌게 있었을까요? 가끔 이런 메시지가 옵니다» ·
//   «쉽게 미르에게 8월 17일에 발생한 데미지건 알려줘 하면 보여줄수 있게»):
//   데미지 이력 질의 — 컨번호(전체) 또는 날짜(8월 17일 / 17일)와 «데미지» 가 같이 오면 색인을 뒤진다.
export function parseDamageHistoryQuery(q) {
  const t = String(q || '');
  if (!/데미지|damage|손상/i.test(t)) return null;
  const cnM = t.toUpperCase().replace(/\s/g, '').match(/[A-Z]{4}\d{7}/);
  let day = null;
  let m = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) day = { mo: parseInt(m[1], 10), d: parseInt(m[2], 10) };
  else { m = t.match(/(\d{1,2})\s*일/); if (m) day = { mo: null, d: parseInt(m[1], 10) }; }
  if (!cnM && !day) return { recent: true };   // «데미지 기록/데미지건» — 최근 전부
  return { cn: cnM ? cnM[0] : null, day };
}
export function filterDamageHits(damageIndex, dq, now = new Date()) {
  const rows = [];
  Object.values(damageIndex || {}).forEach((m) => Object.values(m || {}).forEach((e) => { if (e && e.ts) rows.push(e); }));
  rows.sort((a, b) => b.ts - a.ts);
  if (!dq) return [];
  if (dq.recent) return rows.slice(0, 20);
  return rows.filter((e) => {
    if (dq.cn && String(e.cn).toUpperCase() !== dq.cn) return false;
    if (dq.day) {
      const d = new Date(e.ts);
      if (d.getDate() !== dq.day.d) return false;
      if (dq.day.mo != null && (d.getMonth() + 1) !== dq.day.mo) return false;
      if (dq.day.mo == null && (now - d) > 62 * 86400000) return false;   // 월 없이 «17일» = 최근 두 달 안
    }
    return true;
  });
}

export default function GlobalSearchPage({ voyages, onOpenContainer, portMisData, terminalWork, heartbeat, isChief = true, initialQuery = '', embedded = false, ctxVoyageKey = null }) {   // 2.36: ctxVoyageKey — 항차 화면에 심을 때 배 이름을 안 붙여도 그 배로 답한다(검수사 «검색은 어디서든 같아야»)   // 2.03-02: embedded — 수석 대시보드 안에 심을 때(나가기 줄 숨김, 화면 전환 없음)   // 1.69: heartbeat — 수집기 상태 즉답 · 1.69-01: 검수원 진입(홈 검색) — isChief로 수석 전용 통계만 거른다
  const [query, setQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef(null);
  // 1.69-05: 같은 질문 두 번 — 재제출 판정·접수 표시 (검수사 신고 2026-08-14 "같은 질문 두 번 하면 반응 없음. 엔터 기능이 없어서 전달되었는지 모름")
  const lastAskRef = useRef('');                  // 마지막으로 물은 질문 — 재질문 판정
  const [askedAt, setAskedAt] = useState(null);   // 질문 접수 시각 — «질문 접수 HH:MM» + 재발화 트리거
  const [reasked, setReasked] = useState(false);  // 같은 질문 재제출 — 답 박스에 «다시 확인했습니다»

  // M6.10: debounce — 키 입력마다 즉시 검색하지 않고 200ms 후 검색
  //   대용량 (수천 대 컨테이너) 환경에서 입력 반응성 개선
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    if (!query.trim()) lastSpokenRef.current = null;   // 1.69-05: 지웠다가 다시 물으면 다시 말한다
    return () => clearTimeout(t);
  }, [query]);
  // 1.69-05: 방금 물어서 답이 붙은 질문을 기억 — 같은 질문 재제출(엔터·전송·음성) 판정용
  useEffect(() => { if (debouncedQuery.trim().length >= 2) lastAskRef.current = debouncedQuery.trim(); }, [debouncedQuery]);

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
        Object.values(recMap).forEach(r => {
          const safeR = {};
          Object.keys(r).forEach(k => {
            const v = r[k];
            if (v !== '' && v !== 0 && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) safeR[k] = v;
          });
          merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR };
        });
        Object.values(merged).forEach(c => {
          if (!c.cn) return;
          arr.push({
            ...c,
            /* 1.55-03: 실체 위치 승격 — fbSetActualPosition 은 bay_actual 만 쓰므로 승격이 없으면 계획 자리로 답했다(독립 재검증 P1-6). 창고(__)는 제외. */
            ...((c.bay_actual && c.row_actual && c.tier_actual && !String(c.bay_actual).startsWith('__')) ? { bay: c.bay_actual, row: c.row_actual, tier: c.tier_actual } : {}),
            voyageKey: vKey,
            vsl: v.info.vsl,
            voy: v.info.voy,
            mode,
            _mode: mode,
            _ptk: mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol),   // V7.93-02: 평택분 (7.1)
            isXray: mode === 'discharge' && !!xrayMap[c.cn],
            _xray: mode === 'discharge' && !!xrayMap[c.cn],
            comp: compMap[c.cn] || null,
            _comp: compMap[c.cn] || null,
            xraySeal: xraySeals[c.cn] || null,
          });
        });
      });
    });
    return arr;
  }, [voyages]);

  // 자연어 파싱 (M6.10: debouncedQuery 사용)
  const parsed = useMemo(() => parseNaturalQuery(debouncedQuery), [debouncedQuery]);

  // ── TallyOne 1.69: 물었을 때만 1회 읽는 노드 (feedback·tally_pending·archive 메타) ──
  //   구독이 없는 노드라 질문이 오면 그때 GET 하고 세션 동안 캐시한다.
  //   ⚠ fbListArchive 는 키당 메타 4건 GET — 자동 호출 금지(1.6 사고: 요청 1,120건). 질문이 왔을 때만 1회.
  const [chiefData, setChiefData] = useState({});
  useEffect(() => {
    if (!isChief) return;   // 1.69-01: 검수원은 수석 노드(feedback·tally_pending·archive)를 읽지 않는다
    const q = debouncedQuery || '';
    if (q.length < 2) return;
    const want = [];
    if (/오답|미회신|피드백/.test(q) && chiefData.feedback === undefined) want.push(['feedback', () => fbGetSimple('feedback'), {}]);
    if (/마감|텔리/.test(q) && chiefData.tallyPending === undefined) want.push(['tallyPending', () => fbGetSimple('tally_pending'), {}]);
    if (/이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*(?:항차|된\s*배)|보관|몇\s*항차|최근\s*완료/.test(q) && chiefData.archiveList === undefined) want.push(['archiveList', fbListArchive, []]);   // 2.37: «보관»·«몇 항차»(검수사 «몇항차 텔리 보관하고 있어»)
    if (!want.length) return;
    setChiefData((d) => { const n = { ...d }; want.forEach(([k]) => { n[k] = null; }); return n; });   // null = 읽는 중
    want.forEach(([k, fn, fallback]) => fn()
      .then((v) => setChiefData((d) => ({ ...d, [k]: v ?? fallback })))
      .catch((e) => { console.warn('[통합검색] 노드 읽기 실패 —', k, e); setChiefData((d) => ({ ...d, [k]: { __error: true } })); }));
  }, [debouncedQuery, chiefData]);

  // TallyOne 2.41: 미르 — 선박 연락처(RTDB shipContacts). 수석·검수원 공용(chiefData와 별도 — isChief로 안 가른다).
  //   물었을 때만 1회 GET하고 세션 캐시 — chiefData와 같은 방식(1.69).
  const [shipContacts, setShipContacts] = useState(undefined);   // undefined=아직 안 물음, null=읽는 중
  useEffect(() => {
    if (!parsed.contactQuery) return;
    if (shipContacts !== undefined) return;
    setShipContacts(null);
    fbGetSimple('shipContacts').then((v) => setShipContacts(v || {})).catch(() => setShipContacts({}));
  }, [parsed.contactQuery, shipContacts]);

  // ── TallyOne 1.68: 배 이름 맥락 ──
  //   "STSE 출항 몇 시"·"HAYN 양하 자료 다 있어"처럼 질문에 배가 지정되면 그 항차를 맥락으로 잡는다.
  //   종전에는 배를 지정해도 무시하고 "항차 화면 가서 물어보세요"로 떠넘겼다(검수사 지적 2026-08-13).
  const carrierContacts = useCarrierContacts();   // 1.89
  const shipSpeed = useShipSpeed();   // 1.92
  const ediPattern = useEdiPattern();   // 1.97
  const damageIndex = useDamageIndex();   // 2.03: 데미지 색인(메타만)
  const [dmgPhotoView, setDmgPhotoView] = useState(null);   // 2.03: { loading } | { imgs:[..], cn } | { err }
  const dmgQ = useMemo(() => parseDamageHistoryQuery(debouncedQuery), [debouncedQuery]);
  const dmgHits = useMemo(() => (dmgQ ? filterDamageHits(damageIndex, dmgQ) : []), [damageIndex, dmgQ]);
  const openDmgPhoto = async (e) => {
    setDmgPhotoView({ loading: true });
    try {
      const p = await fbGetDamagePhoto(e.voyageKey, e.ts);
      const imgs = [p?.data, p?.detailPhoto].filter(Boolean);
      setDmgPhotoView(imgs.length ? { imgs, cn: e.cn } : { err: '사진을 찾지 못했습니다 — 보관에서 지워졌을 수 있습니다' });
    } catch (er) { setDmgPhotoView({ err: '사진 불러오기 실패: ' + (er?.message || er) }); }
  };
  const shipCtx = useMemo(() => {
    const Q = String(debouncedQuery || '').toUpperCase();
    // 2.36: 항차 화면에 심긴 경우 — 질의에 배 이름이 없어도 **그 배**가 맥락이다.
    //   («해치 열렸어?» 를 그 배 화면에서 물으면 그 배 답이 나와야 한다)
    const _ctxFallback = () => {
      if (!ctxVoyageKey) return null;
      const v = (voyages || {})[ctxVoyageKey];
      return v?.info ? { key: ctxVoyageKey, info: v.info, v, has: true } : null;
    };
    if (Q.length < 3) return _ctxFallback();
    let best = null;
    Object.entries(voyages || {}).forEach(([k, v]) => {
      const i = v?.info; if (!i) return;
      const names = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
      if (names.some((nm) => nm.length >= 3 && Q.includes(nm))) {
        // 자료가 실린 항차 우선(같은 배 예정/진행 중복 대비)
        const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
        if (!best || (has && !best.has)) best = { key: k, info: i, v, has };
      }
    });
    // 1.85 (검수사 실측): «OWBH 브리핑» — 실제 코드는 OBWH(전위 오타)인데 정확 포함 매칭뿐이라 못 알아들었다.
    //   질의의 영문 토큰과 편집거리(교환 포함) 1 이내인 선박이 **유일할 때만** 교정해 붙인다 —
    //   두 배 이상 걸리면 오답 위험이므로 종전대로 되묻는다.
    if (!best) {
      const dl1 = (a, b) => {   // Damerau–Levenshtein ≤1 (교환 1회 포함)
        if (a === b) return true;
        const la = a.length, lb = b.length;
        if (Math.abs(la - lb) > 1) return false;
        if (la === lb) {
          const diff = [];
          for (let x = 0; x < la; x++) if (a[x] !== b[x]) diff.push(x);
          if (diff.length === 1) return true;
          if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
          return false;
        }
        const [s, l] = la < lb ? [a, b] : [b, a];
        let si = 0, li = 0, used = false;
        while (si < s.length && li < l.length) {
          if (s[si] === l[li]) { si++; li++; continue; }
          if (used) return false;
          used = true; li++;
        }
        return true;
      };
      const toks = Q.split(/[^A-Z0-9]+/).filter((w) => /^[A-Z]{3,8}$/.test(w));
      const byShip = new Map();   // vsl → 후보 항차 (선박 단위 유일성 판정)
      Object.entries(voyages || {}).forEach(([k, v]) => {
        const i = v?.info; if (!i) return;
        const names2 = [i.vsl, i.vslFull].filter(Boolean).map((x) => String(x).toUpperCase());
        if (names2.some((nm) => nm.length >= 3 && toks.some((tk) => dl1(tk, nm)))) {
          const has = !!(v.discharge?.ediContainers || v.loading?.ediContainers);
          const shipId = String(i.vsl || names2[0] || k).toUpperCase();
          const prev = byShip.get(shipId);
          if (!prev || (has && !prev.has)) byShip.set(shipId, { key: k, info: i, v, has });
        }
      });
      if (byShip.size === 1) best = [...byShip.values()][0];
    }
    return best || _ctxFallback();
  }, [voyages, debouncedQuery, ctxVoyageKey]);

  // ── 1.69-06: 진행 질문인데 배가 현재 항차에 없으면 — 보관소 메타 1회 GET (완료·보관 답 준비) ──
  //   검수사 신고(2026-08-14): "이미 완료된 작업을 물어보면 언제 작업 종료했는지 알려줘야 함."
  //   STSE처럼 수석 완료 저장으로 voyages에서 빠진 배는 종전엔 무응답이었다.
  //   shipCtx가 이 이펙트보다 아래 선언이면 TDZ라 — 반드시 shipCtx 메모 **뒤에** 둔다.
  useEffect(() => {
    if (!isChief) return;   // 검수원은 수석 노드(archive)를 읽지 않는다(1.69-01 K2)
    const q = debouncedQuery || '';
    if (q.length < 3 || shipCtx) return;
    if (!/진행|얼마나\s*(?:했|됐)|어디까지|다\s*했|몇\s*프로|퍼센트|현황(?!\s*판)|끝났|몇\s*대\s*(?:했|됐)/.test(q) || /자료/.test(q)) return;
    if (chiefData.archiveList !== undefined) return;
    setChiefData((d) => ({ ...d, archiveList: null }));   // null = 읽는 중
    fbListArchive()
      .then((v) => setChiefData((d) => ({ ...d, archiveList: v ?? [] })))
      .catch((e) => { console.warn('[통합검색] 보관소 읽기 실패 —', e); setChiefData((d) => ({ ...d, archiveList: { __error: true } })); });
  }, [debouncedQuery, shipCtx, chiefData, isChief]);

  // ── V9.14: 통합검색 즉답 — 종전에는 "브리핑·몇 시야·날씨" 등이 여기서 전부 무응답이었다.
  //   시간·자기소개처럼 항차와 무관한 질문은 바로 답하고,
  //   항차 맥락이 필요한 질문(브리핑·점검·인계·ETA·날씨 등)은 어디서 물어야 하는지 안내한다.
  const _localAnswerRaw = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return null;
    const p = parsed;
    const Q = debouncedQuery;
    // 1.91-03 (검수사 실측 — 통합검색 «미르야»가 인사 대신 컨 100개 나열): 미르 호출 즉답을 최우선으로.
    // 2.35 (검수사 실측 KBTR 2605E «양하갯수가 하나 틀리는데 뭐가 틀리는지»):
    //   «대수가 안 맞아»·«몇 대 차이»·«왜 다르지» 류에 **어느 컨이 왜인지**를 답한다.
    //   배 이름이 붙었을 때만(shipCtx) — 전 항차 스캔은 느리고 답도 흐려진다.
    if (shipCtx && /(안\s*맞|다르|차이|틀리|어긋|왜\s*(달라|다르))/.test(Q) && /(대수|갯수|개수|양하|선적|EDI|리스트|숫자)/i.test(Q)) {
      const _mode = /선적|LOLO|로딩/i.test(Q) ? 'loading' : 'discharge';
      const _sec = shipCtx.v?.[_mode];
      const _raw = shipCtx.v?.[_mode]?.raw?.edi?.text || shipCtx.v?.raw?.edi?.text || '';
      const _d = diffEdiList(_sec, _raw);
      if (_d) return explainEdiGap(_d, shipCtx.info?.vsl);
      if (_sec?.ediContainers && _sec?.records) return `${shipCtx.info?.vsl || ''} ${_mode === 'loading' ? '선적' : '양하'} — EDI와 리스트가 딱 맞아요. 어긋나는 컨이 없어요 😺`;
    }
    if (p.mirHello) return '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "미르야 OBWH 브리핑" · "미르야 이번 선적 계획 어떻게 진행 될것 같아")';
    // TallyOne 2.41: 미르 — 선박 연락처(이메일). «PCSZ 이메일»·«본선 메일»·«이 배 메일 주소 찾기».
    //   검수사 원문 «본선 일항사와 메일로 컨펌» · «답만 해주면 됩니다»(발송·추적은 범위 밖).
    //   ⚠ howToQuery·isChief 게이트보다 먼저 — "PCSZ 메일주소 뭐야"의 '뭐야'가 기능색인에 먹히면 안 된다.
    if (p.contactQuery) {
      if (shipContacts == null) return '연락처를 불러오는 중입니다 — 잠시 후 다시 물어봐 주세요.';
      if (shipCtx) {
        const code = String(shipCtx.info.vsl || '').toUpperCase();
        const label = shipCtx.info.vslFull || shipCtx.info.vsl || '';
        if (code) return generateContactAnswer(shipContacts[code] || null, label, p.contactQuery.onboardOnly);
      }
      const rawCand = p.contactQuery.code ? String(p.contactQuery.code).toUpperCase() : '';
      if (rawCand && !/\s/.test(rawCand)) {
        return generateContactAnswer(shipContacts[rawCand] || null, p.contactQuery.code, p.contactQuery.onboardOnly);
      }
      return '어느 배 말씀인지 배 이름을 붙여 주시면 연락처를 찾아 드립니다. (예: "PCSZ 이메일")';
    }
    // 1.69-01: 검수원 진입(홈 검색) — 컨 조회·용어·기능 설명은 그대로 답하고,
    //   수석 전용 통계·자료현황은 1.69 유도 문구로 넘긴다(검수사 확정 계열).
    //   ⚠ 기능 질문("마감 텔리 어디서 만들어")까지 막지 않게, 수석 통계 분기와 같은 모양만 잡는다.
    if (!isChief && (
      /오답|미회신|피드백|수집기|하트비트|mailpilot/i.test(Q)
      || (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q))
      || /이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*항차/.test(Q)
      || /자료\s*(?:현황|다\s*있|준비|빠|없|부족|미도착|왔)/.test(Q)
    )) {
      return '수석 전용 정보입니다. 자세한 내용은 수석 검수사에게 문의하세요.';
    }
    // ── 1.69: 수석 통계·이력 — 배 이름 없이 묻는 것 (학습서 ②′) ──
    //   ⚠ 전부 howToQuery 판정보다 앞이다 — '뭐 있어'·'어떻게' 류가 기능 색인에 먼저 먹히면 안 된다.
    const _err = (v, what) => (v && v.__error) ? `${what}를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.` : null;
    if (/오답|미회신|피드백/.test(Q)) {
      return _err(chiefData.feedback, '오답 리포트') || answerFeedback(chiefData.feedback ?? null);
    }
    if (/수집기|메일\s*수집|하트비트|mailpilot/i.test(Q)) {
      return answerCollector(heartbeat);
    }
    if (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q)) {
      return _err(chiefData.tallyPending, '마감 목록') || answerTallyPending(chiefData.tallyPending ?? null);
    }
    if (/이번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위/.test(Q) || /지난\s*달|저번\s*달/.test(Q)) {
      return _err(chiefData.archiveList, '보관소')
        || answerArchiveStats(Array.isArray(chiefData.archiveList) ? chiefData.archiveList : null,
             { bayDict: (typeof window !== 'undefined' && window.__fbShipBayDict) || {}, prevMonth: /지난\s*달|저번\s*달/.test(Q) });
    }
    if (/어제\s*실적|완료\s*(?:항차|된\s*배)/.test(Q)) {
      return _err(chiefData.archiveList, '보관소')
        || answerArchiveStats(Array.isArray(chiefData.archiveList) ? chiefData.archiveList : null,
             { kind: /어제/.test(Q) ? 'yesterday' : 'recent' });
    }
    if (/(?:배|선박|항차|작업|시간).{0,10}겹치|겹치는\s*(?:배|선박|항차|시간)/.test(Q) && !/끝\s*자리|끝자리|번호/.test(Q)) {
      return answerOverlaps(voyages);
    }
    // 2.37 (검수사 «쉽게 몇항차 텔리 보관하고 있어 등등»): 보관소에 무엇이 몇 건 있는지 — 배 이름 없이.
    if (isChief && /(보관|아카이브)/.test(Q) && /(몇|얼마|있어|있나|현황|목록|뭐)/.test(Q) && !shipCtx) {
      const arch = chiefData.archiveList;
      if (arch === null || arch === undefined) return '보관소를 읽는 중이에요 — 잠시 후 다시 물어봐 주세요.';
      if (arch && arch.__error) return '보관소를 읽지 못했어요 — 네트워크 확인 후 다시 물어봐 주세요.';
      const list = Array.isArray(arch) ? arch : [];
      if (!list.length) return '보관소에 완료 저장된 항차가 아직 없어요.';
      const ships = new Set(list.map((a) => a.vsl));
      const sorted = list.slice().sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
      const _t = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; };
      const L = [`📦 보관소에 완료 항차 ${list.length}건이 있어요 (${ships.size}척).`];
      L.push(`가장 최근: ${_t(sorted[0].archivedAt)} ${String(sorted[0].voyageKey || '').replace('_', ' ')}`);
      L.push(`가장 오래된 것: ${_t(sorted[sorted.length - 1].archivedAt)} ${String(sorted[sorted.length - 1].voyageKey || '').replace('_', ' ')}`);
      L.push('');
      L.push('최근 5항차');
      sorted.slice(0, 5).forEach((a) => L.push(`· ${_t(a.archivedAt)} ${String(a.voyageKey || '').replace('_', ' ')} — 양하 ${a.discharge_ptk ?? '?'} · 선적 ${a.loading_ptk ?? '?'}`));
      L.push('');
      L.push('배 이름을 붙여 물으면 그 배 것만 짚어 드려요 — 예: «DXQD 완료됐어?»');
      return L.join('\n');
    }
    // TallyOne 1.66-03: **수석 화면에서도 기능 위치를 묻는다.**
    //   검수사 지적 2026-08-13 — *"수석 대시보드에선 자연어 즉 도우미 기능을 어디에서 사용하나요?"*
    //   1.65 에서 기능 설명을 항차 화면에만 붙였다. **수석 전용 기능일수록 수석이 묻는 자리에서 답해야 하는데 거꾸로였다.**
    //   여기는 수석·소유자만 들어오는 라우트라(App.jsx 가드) 수석 기준으로 답한다.
    // 1.69-02: 배가 지정된 «진행» 질문 — 두 갈래 (검수사 확정 2026-08-14). 항차 화면
    //   SearchPanel과 근본 하나(nlSearch formatTerminalWorkAnswer·formatAppTallyAnswer).
    //   «실제·실시간·실황·터미널» → 터미널 실황 작업보드 / 없으면 → 앱 검수 기록 기준.
    if (shipCtx && /진행|얼마나\s*(?:했|됐)|어디까지|다\s*했|몇\s*프로|퍼센트|현황(?!\s*판)|끝났|몇\s*대\s*(?:했|됐)/.test(debouncedQuery)
        && !/자료/.test(debouncedQuery)) {
      const ship = shipCtx.info.vslFull || shipCtx.info.vsl;
      if (isRealtimeProgressQuery(debouncedQuery)) {
        return formatTerminalWorkAnswer(ship, (terminalWork || {})[String(shipCtx.info.vsl || '').toUpperCase()]);
      }
      return formatAppTallyAnswer(ship, flat.filter((c) => c.voyageKey === shipCtx.key));
    }
    // 1.69-06: 완료·보관된 배의 진행 질문 — 보관소에서 찾아 «완료·보관됨»으로 결론부터 (검수사 신고 2026-08-14).
    if (!shipCtx && isChief
        && /진행|얼마나\s*(?:했|됐)|어디까지|다\s*했|몇\s*프로|퍼센트|현황(?!\s*판)|끝났|몇\s*대\s*(?:했|됐)/.test(debouncedQuery)
        && !/자료/.test(debouncedQuery)) {
      const Q2 = String(debouncedQuery).toUpperCase();
      const arch = chiefData.archiveList;
      if (Array.isArray(arch)) {
        const hits = arch.filter((a) => a && a.vsl && String(a.vsl).length >= 3 && Q2.includes(String(a.vsl).toUpperCase()));
        if (hits.length) {
          const h = hits.reduce((m, a) => (((a.archivedAt || 0) > (m.archivedAt || 0)) ? a : m));
          const t = h.archivedAt ? new Date(h.archivedAt) : null;
          const f = t ? `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '';
          const voy = String(h.voyageKey || '').split('_')[1] || '';
          return `✅ ${h.vsl}${voy ? ' ' + voy : ''} — ${f ? f + ' ' : ''}완료·보관됨 (수석 완료 저장 기준).\n평택분 양하 ${h.discharge_ptk ?? '?'} · 선적 ${h.loading_ptk ?? '?'} — 상세는 보관소에서.`;
        }
      } else if (arch === null || arch === undefined) {
        // 이펙트가 곧 채운다 — 배 이름이 보관소에 있을지 모르니 정직하게 '읽는 중'
        if (/[A-Z]{3,}/.test(Q2)) return '보관소 기록을 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.';
      } else if (arch && arch.__error) {
        return '보관소를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.';
      }
    }
    // 1.68: 배가 지정된 콜사인·IMO 질문 — 기능 설명(howTo)보다 먼저.
    //   "STSE 콜사인 뭐야"의 '뭐야'가 기능 색인에 먼저 걸려 VRSC3 대신 기능 안내가 나왔다(시뮬 실측). — ship_bay_dict·info에 이미 있다.
    if (/콜사인|호출\s*부호|\bIMO\b|아이엠오/i.test(debouncedQuery) && shipCtx) {
      const dict = (typeof window !== 'undefined' && window.__fbShipBayDict) || {};
      const d = dict[String(shipCtx.info.vsl || '').toUpperCase()] || {};
      const L = [];
      const cs = shipCtx.info.callsign || d.callsign; if (cs) L.push(`콜사인 ${cs}`);
      if (d.imo) L.push(`IMO ${d.imo}`);
      if (L.length) return `${shipCtx.info.vslFull || shipCtx.info.vsl} — ${L.join(' · ')}`;
      return `${shipCtx.info.vslFull || shipCtx.info.vsl} — 콜사인·IMO가 아직 등록 전입니다.`;
    }
    // ── 1.69: 배 지정 — 자료 도착 시각·해치 실황·작업 준비 계산(학습서 2-F 96~100) ──
    //   ⚠ 전부 howToQuery·자료현황 판정보다 앞 — '언제 왔'은 자료현황 정규식에도 걸린다.
    {
      const _dict = (typeof window !== 'undefined' && window.__fbShipBayDict) || {};
      const _bayDef = shipCtx ? (_dict[String(shipCtx.info.vsl || '').toUpperCase()] || {}).bayDef : null;
      const _voy = shipCtx ? { ...shipCtx.v, key: shipCtx.key, _key: shipCtx.key } : null;
      const _ship = shipCtx ? (shipCtx.info.vslFull || shipCtx.info.vsl) : '';
      const isArrivalQ = isDataArrivalQuery(Q);   // 1.90: «받은거야»·«최종본 맞아» 포함 — 공용 트리거
      const isHatchQ = /해치|커버/.test(Q) && /(?:열|오픈|개방|닫|몇\s*장|실황|상태|어디)/.test(Q);
      const isGangQ = /(?:갱|크레인).{0,14}(?:분배|나눠|나누|분할)|분배.{0,10}(?:갱|크레인)|(?:갱|크레인)\s*2\s*개/.test(Q);
      const isMoveQ = /무브/.test(Q) && /(?:몇|총|얼마)/.test(Q);
      const isFirstQ = /(?:최초|처음|어디서?\s*부터|몇\s*번\s*부터).{0,10}(?:양하|시작|해)|양하.{0,12}(?:어디부터|어디서\s*시작|시작\s*어디|몇\s*번\s*부터)/.test(Q);
      const isXrayShiftQ = /엑스레이|x[\s.\-]*ray|xray/i.test(Q) && /(?:조별|주간|야간|부착|몇\s*대\s*가능)/.test(Q);
      const isShiftBriefQ = /교대.{0,8}브리핑|브리핑.{0,8}교대|교대\s*준비|인수\s*브리핑/.test(Q);
      const anyCalc = isArrivalQ || isHatchQ || isGangQ || isMoveQ || isFirstQ || isXrayShiftQ || isShiftBriefQ;
      if (anyCalc && !shipCtx) {
        return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 계산합니다. (예: "HAYN 갱 2개로 분배")';
      }
      if (shipCtx) {
        if (isArrivalQ) return answerDataArrival(_voy, _ship);
        if (isHatchQ) return answerHatchStatus(_voy, _bayDef, _ship);
        if (isGangQ) return answerGangSplit(_voy, _bayDef, _ship);
        if (isMoveQ) return answerTotalMoves(_voy, _ship);
        if (isFirstQ) return answerFirstStart(_voy, _bayDef, _ship);
        if (isXrayShiftQ) return answerXrayShifts(_voy, _bayDef, { shipName: _ship, pier: shipCtx.info.pier });
        if (isShiftBriefQ) return answerShiftBriefing(_voy, _bayDef, { shipName: _ship, voyages });
      }
    }
    if (p.howToQuery) {
      const _a = generateHowToAnswer(debouncedQuery, p, { isChief });
      if (_a) return _a;
    }
    // 자료 현황 — "어느 선박 자료 다 있어" · "어느 선사 것이 없지" · "빠진 자료"
    //   항차 하나가 아니라 **전체를 가로질러** 봐야 하는 물음이라 통합 검색이 제자리다.
    if (/자료\s*(?:현황|다\s*있|준비|빠|없|부족|미도착|왔)|어느\s*(?:선박|배|선사)[^?]*(?:없|빠|안\s*왔)|안\s*온\s*자료|EDI\s*(?:없|왔)|리스트\s*(?:없|왔)/.test(debouncedQuery)) {
      try {
        const rd = buildReadiness(voyages, (typeof window !== 'undefined' && window.__fbShipBayDict) || null);
        // 1.68: 배가 지정되면 그 배만 — "STSE 양하 자료 다 있어" → 결론부터.
        //   검수사 지적: "준비 되었으면 준비 되었다, 출력만 하면 된다고 답해야 하는데 필요없는 말만 합니다."
        if (shipCtx) {
          const wantMode = /양하/.test(debouncedQuery) ? 'discharge' : /선적/.test(debouncedQuery) ? 'loading' : null;
          const mine = (rd.rows || []).filter((r) => r.key === shipCtx.key && (!wantMode || r.mode === wantMode));
          if (mine.length) {
            const lines = [];
            let allReady = true;
            mine.forEach((r) => {
              if (r.state === 'ready') {
                const cnt = r.edi && r.list && r.edi !== r.list ? ` (⚠ EDI ${r.edi} vs 리스트 ${r.list} — ${Math.abs(r.edi - r.list)}건 차이)` : ` — EDI ${r.edi || 0}건 = 리스트 ${r.list || 0}건`;
                if (r.edi && r.list && r.edi !== r.list) allReady = false;
                lines.push(`${r.modeKr}${cnt}`);
              } else {
                allReady = false;
                lines.push(`${r.modeKr} — ${r.label}${r.carrier ? ` (${r.carrier})` : ''}`);
              }
            });
            const ship = shipCtx.info.vslFull || shipCtx.info.vsl;
            return (allReady ? `예. ${ship} 자료 준비돼 있습니다. 출력만 하면 됩니다.\n` : `⚠ ${ship} 자료가 아직입니다.\n`) + lines.join('\n');
          }
          return `${shipCtx.info.vslFull || shipCtx.info.vsl} — 등록만 있고 자료가 아직 안 왔습니다.`;
        }
        return describeReadiness(rd);
      }
      catch (e) { /* 아래 종전 경로로 */ }
    }
    // 1.68: 배가 지정된 입출항 질문은 그 자리에서 답한다 — "STSE 출항 몇 시".
    //   종전에는 PORT-MIS 데이터가 옆에 있는데도 안 읽고 떠넘겼다.
    if (p.schedQuery && shipCtx) {
      const pm = matchPortMis(portMisData || {}, shipCtx.info);
      const ship = shipCtx.info.vslFull || shipCtx.info.vsl;
      if (pm) {
        const f = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 ${m[4]}:${m[5]}` : null; };
        const L = [`${ship} — ` + [f(pm.eta) ? `입항 ${f(pm.eta)}` : null, f(pm.etd) ? `출항 ${f(pm.etd)}` : null].filter(Boolean).join(', ') + '.'];
        if (pm.pier || pm.berth) L.push(`부두: ${[pm.pier, pm.berth].filter(Boolean).join(' ')}`);
        if (pm.nextPort) L.push(`다음 항구: ${pm.nextPort}`);
        // 1.68-01: 터미널 ETD가 PORT-MIS와 다르면 병기 — 실측: STSE 출항이 21:00 신고 후 12:00으로 당겨졌는데 터미널 피드에만 있었다.
        const _tw = (terminalWork || {})[String(shipCtx.info.vsl || '').toUpperCase()];
        if (_tw?.depEtd && String(_tw.depEtd).slice(0, 16) !== String(pm.etd || '').slice(0, 16))
          L.push(`⚠ 터미널 기준 출항 ${String(_tw.depEtd).slice(5, 16)} — 신고(${f(pm.etd) || '?'})와 다릅니다`);
        return L.join('\n');
      }
      if (shipCtx.info.planDate) return `${ship} — 작업 계획 ${shipCtx.info.planDate} (PORT-MIS 신고는 아직).`;
    }
    // 1.92-04 (검수사 실측 «SWSP 작업 얼마나 걸릴까?» 가 물량 답으로 빠짐): 속도 질문은 물량(isStat)보다 먼저.
    if (isSpeedQuery(debouncedQuery) && shipCtx) {
      try { const a = answerShipSpeed(shipCtx.v, shipSpeed, shipCtx.info.vslFull || shipCtx.info.vsl); if (a) return a; } catch (e) { /* 아래로 */ }
    }
    // 1.68: 배가 지정된 물량 질문 — "STSE 양하 몇 개야" 를 여기서 바로 센다(평택분).
    if (shipCtx && (p.isStat || p.isAll || /몇\s*(?:개|대)/.test(debouncedQuery))) {
      const mine = flat.filter((c) => c.voyageKey === shipCtx.key && c._ptk);
      if (mine.length) {
        const mk = (mode, kr) => {
          const arr = mine.filter((c) => c._mode === mode);
          if (!arr.length) return null;
          const f = arr.filter((c) => c.fe === 'F').length;
          const deck = arr.filter((c) => parseInt(String(c.tier || '0'), 10) >= 80).length;
          return `${kr} 평택분 ${arr.length}대 — Full ${f} / Empty ${arr.length - f} · 데크 ${deck} / 홀드 ${arr.length - deck}`;
        };
        const wantMode = p.mode || (/양하/.test(debouncedQuery) ? 'discharge' : /선적/.test(debouncedQuery) ? 'loading' : null);
        const L = wantMode ? [mk(wantMode, wantMode === 'discharge' ? '양하' : '선적')] : [mk('discharge', '양하'), mk('loading', '선적')];
        const body = L.filter(Boolean).join('\n');
        if (body) return `${shipCtx.info.vslFull || shipCtx.info.vsl}\n${body}`;
      }
    }
    // 1.91-01: 배 지정 양하·선적 계획 전망 (공용)
    if (isPlanOutlookQuery(debouncedQuery) && shipCtx) {
      try {
        const _m = outlookModeOf(debouncedQuery);
        const _ship = shipCtx.info.vslFull || shipCtx.info.vsl;
        const a = _m ? answerPlanOutlook(shipCtx.v, _m, _ship) : answerPlanOutlookBoth(shipCtx.v, _ship);   // 1.91-02
        if (a) return a;
      } catch (e) { /* 아래로 */ }
    }
    // 1.89 (검수사 예시 «이번 SWSP 관련선사는 몇군데이고 각각 몇대씩이고 담당자가 누구지?»)
    if (p.carrierQuery && shipCtx) {
      const mine = flat.filter((c) => c.voyageKey === shipCtx.key && c._ptk);
      const ship = shipCtx.info.vslFull || shipCtx.info.vsl;
      return `${ship}\n` + formatCarriers(mine, { carrierContacts });
    }
    // 1.85 (검수사 실측 «OWBH 브리핑»): 배가 지정된 브리핑은 통합검색에서도 즉답 — 종전엔 배 이름이 있어도 되물었다.
    if (p.briefingQuery && shipCtx) {
      const mine = flat.filter((c) => c.voyageKey === shipCtx.key && c._ptk);
      if (mine.length) {
        const ship = shipCtx.info.vslFull || shipCtx.info.vsl;
        const wantMode = p.mode || (/양하/.test(debouncedQuery) ? 'discharge' : /선적/.test(debouncedQuery) ? 'loading' : null);
        const parts = [];
        for (const [mode, kr] of [['discharge', '양하'], ['loading', '선적']]) {
          if (wantMode && mode !== wantMode) continue;
          const arr = mine.filter((c) => c._mode === mode);
          if (!arr.length) continue;
          try { parts.push(`【${kr}】\n` + generateBriefing(arr, kr, mode, null, '', { photos: shipCtx.v?.photos || null })); } catch (e) { /* 폴백 아래로 */ }
        }
        if (parts.length) return `${ship}\n` + parts.join('\n\n') + '\n\n(상세 확인 버튼은 항차 화면 ▶ 작업 시작 탭에 있습니다)';
      }
      // 1.97 (검수사 확정): 컨 자료가 없으면 컨 나열 대신 **홈 카드 수준 개요 브리핑** — 부두·일정·자료 상태·EDI 도착 패턴.
      try {
        const pmv = matchPortMis(portMisData || {}, shipCtx.info);
        const ov = answerShipOverview(shipCtx.v, shipCtx.info.vslFull || shipCtx.info.vsl, pmv, ediPattern);
        if (ov) return ov;
      } catch (e) { /* 아래로 */ }
    }
    // 2.01 (검수사 확정 «항차목록에서 브리핑은 선박명을 특정 안하면 그날 작업할 선박들 전부를 브리핑»):
    //   배 미지정 «브리핑» = planDate 가 오늘과 겹치는 항차 전부 — 배별 개요 브리핑(1.97 answerShipOverview)
    //   + 컨 자료가 있으면 특수화물 한 줄. 오늘 배가 없으면 아래 기존 안내로 폴백.
    // 2.06 (검수사 실측 «실오류가 있는 선박은?» — 무응답·컨 100개 나열): 실오류/실번호 불일치 현황.
    //   실오류 = 검수원이 실물로 고친 기록(sl_orig ≠ sl) · 불일치 = 리스트끼리 값이 다름(sl_conflict).
    if (/[실씰]\s*오류|실번호\s*(불일치|오류)/.test(debouncedQuery)) {
      try {
        const _rows = [];
        for (const c of flat) {
          if (!c || !c.cn) continue;
          const _fix = c.sl_orig && c.sl && String(c.sl) !== String(c.sl_orig);
          const _cf = Array.isArray(c.sl_conflict) && [...new Set(c.sl_conflict.map((h) => String(h.sl || '').trim().toUpperCase()))].length > 1;
          if (_fix || _cf) _rows.push({ c, _fix, _cf });
        }
        if (!_rows.length) return '실오류·실번호 불일치로 기록된 컨이 없습니다 (앱 기록 기준 — 현장 발견분은 실오류 보고로 남겨 주세요).';
        const _byShip = new Map();
        for (const r of _rows) { const k = r.c.voyageKey || '?'; if (!_byShip.has(k)) _byShip.set(k, []); _byShip.get(k).push(r); }
        const L = [`⚠ 실오류·실번호 불일치 ${_rows.length}건 — ${_byShip.size}척`];
        for (const [k, arr] of _byShip) {
          L.push(`【${k}】 ${arr.length}건`);
          arr.slice(0, 10).forEach(({ c, _fix, _cf }) => {
            const d = _fix ? `리스트 ${c.sl_orig} → 실물 ${c.sl}` :
              `불일치 ${[...new Set(c.sl_conflict.map((h) => String(h.sl || '').trim()))].join(' ↔ ')}`;
            L.push(`  ${c.cn} — ${d}`);
          });
          if (arr.length > 10) L.push(`  … 외 ${arr.length - 10}건`);
        }
        return L.join('\n');
      } catch (e) { /* 아래로 */ }
    }
    // 2.03-04 (검수사 실측 «미르야 PCSZ 우리가 작업해야해?» — 무응답): «우리가 작업하는 배인가» 판정.
    //   항차 목록(수집기가 배정·메일로 만든 카드 포함)에 있으면 = 저희 배 — 개요로 답.
    //   없으면 = 저희 부두 배정·자료에 안 잡힌 배 — 근거와 함께 아니라고 답한다.
    if (/(우리|저희)\s*(가|는|도)?\s*(작업|검수)|작업\s*해야|검수\s*해야|우리\s*배/.test(debouncedQuery)) {
      if (shipCtx) {
        // 2.04 (검수사 확정 «답은 이번 항차는 PSS입니다. 저희 작업 대상선박입니다. 라고 알리고
        //   양하 선적 구분은 안하는게 좋습니다. 만약 물어보면 자세한건 수석검수사에게 물어 보라고 넘기십시요»):
        //   항로(lane)는 수집기가 배정목록에서 info.lane 으로 실어 온다(push_sched_extras v1.1 — 이미 있었다).
        //   같은 배라도 항로가 바뀔 수 있고 담당(양하만/선적만/둘다)은 입항 시점에야 확정되므로 구분하지 않는다.
        try {
          const _i = shipCtx.info || {};
          const pmv = matchPortMis(portMisData || {}, _i);
          const ov = answerShipOverview(shipCtx.v, _i.vslFull || _i.vsl, pmv, ediPattern);
          const _detail = /양하|선적|하역만|어느\s*쪽/.test(debouncedQuery)
            ? '\n양하·선적 구분 같은 자세한 것은 수석검수사에게 확인해 주세요.' : '';
          if (_i.lane) {
            return `이번 항차는 ${_i.lane}입니다. 저희 작업 대상 선박입니다.${_detail}\n\n${ov || ''}`.trim();
          }
          // lane 미수집 — 근거 등급 폴백(2.03-05)
          const _assigned = _i.planDis != null || _i.planLod != null;
          if (_assigned) {
            return `저희 작업 대상 선박입니다 — 선석배정목록에 잡혀 있습니다. (항로는 다음 배정 수집 때 표시됩니다)${_detail}\n\n${ov || ''}`.trim();
          }
          if (pmv) {
            return `입항 신고(PORT-MIS)는 있는데 선석배정에는 아직입니다 — 배정이 뜨면 확정입니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
          }
          return `⚠ 판단 유보 — ${_i.vslFull || _i.vsl} 항차 카드는 있지만(메일 자료로 생성) 선석배정·PORT-MIS 에는 안 잡혔습니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
        } catch (e) { return `${shipCtx.info.vslFull || shipCtx.info.vsl} — 항차 목록에는 있습니다 (${shipCtx.key}). 자세한 것은 수석검수사에게 확인해 주세요.`; }
      }
      // 배 이름 후보(영문 3~5자 토큰) — 항차 목록에 없다
      const _tok = (String(debouncedQuery).toUpperCase().match(/\b[A-Z]{3,5}\b/g) || []).filter((t) => !['PTK', 'PCTC', 'PNCT'].includes(t));
      if (_tok.length) {
        return `${_tok[0]} — 지금 항차 목록·선석배정 자료에 없는 배입니다. 저희가 작업할 배로 잡혀 있지 않습니다.\n(배정목록·메일에 뜨면 수집기가 자동으로 항차 카드를 만듭니다 — 그때 다시 물으면 «네»라고 답합니다)`;
      }
      return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: "PCSZ 우리가 작업해야해?"';
    }
    // 2.03-02 (검수사 실측 «내일 작업 대상 선박은?» — 통합검색이 무응답): 오늘/내일/모레 작업 선박 질의.
    //   «(오늘|내일|명일|모레) … 작업 … (선박|배|대상)» → 그날 planDate 가 겹치는 항차를 시작순으로 나열.
    const _dayOff = /모레/.test(debouncedQuery) ? 2 : /내일|명일/.test(debouncedQuery) ? 1 : 0;
    if (/오늘|내일|명일|모레/.test(debouncedQuery) && /작업|양하|선적|일정/.test(debouncedQuery) && /선박|배|대상|뭐|뭔|몇|무슨/.test(debouncedQuery) && !shipCtx) {
      try {
        const _now = new Date();
        const _b0 = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + _dayOff).getTime();
        const _b1 = _b0 + 24 * 3600 * 1000;
        const _pT2 = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
        const _ships = Object.entries(voyages || {}).map(([k, v]) => {
          const seg = String(v?.info?.planDate || '').split('~');
          const a = _pT2(seg[0]); const b = seg[1] ? _pT2(seg[1]) : a;
          return { k, v, a, b: (b == null ? a : b) };
        }).filter(x => x.a != null && x.a < _b1 && x.b >= _b0).sort((x, y) => x.a - y.a);
        const _lbl = _dayOff === 2 ? '모레' : _dayOff === 1 ? '내일' : '오늘';
        if (!_ships.length) return `${_lbl} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 아직이면 수집기가 잡는 대로 항차 카드에 뜹니다.`;
        const L = [`${_lbl} 작업 선박 ${_ships.length}척`];
        for (const { k, v, a } of _ships) {
          const i2 = v?.info || {};
          const t = new Date(a);
          const hh = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
          const amt = [i2.planDis != null && Number(i2.planDis) > 0 ? `양하 ${i2.planDis}` : null, i2.planLod != null && Number(i2.planLod) > 0 ? `선적 ${i2.planLod}` : null].filter(Boolean).join(' · ');
          // 2.03-05: 선석배정에 안 잡힌 배는 ⚠ — 수집기가 잘못 물어온 카드(항로 변경)일 수 있다(검수사 교정, PCSZ 사건)
          const _mark = (i2.planDis != null || i2.planLod != null) ? '' : ' ⚠배정 미확인 — 저희 항차가 아닐 수 있음';
          L.push(`${i2.vslFull || i2.vsl || k} — ${i2.pier || '?'} ${hh} 시작${amt ? ` (${amt})` : ''}${_mark}`);
        }
        L.push(`\n«${_lbl === '오늘' ? '' : _lbl + ' '}브리핑» 이라고 하면 배별 상세까지 답합니다.`);
        return L.join('\n');
      } catch (e) { /* 아래로 */ }
    }
    if (p.briefingQuery && !shipCtx) {
      try {
        const _now = new Date();
        const _pT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
        const _shipsOf = (off) => {
          const d0 = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + off).getTime();
          const d1 = d0 + 24 * 3600 * 1000;
          return Object.entries(voyages || {}).map(([k, v]) => {
            const seg = String(v?.info?.planDate || '').split('~');
            const a = _pT(seg[0]); const b = seg[1] ? _pT(seg[1]) : a;
            return { k, v, a, b: (b == null ? a : b) };
          }).filter(x => x.a != null && x.a < d1 && x.b >= d0).sort((x, y) => x.a - y.a);
        };
        // 2.05-03 (검수사 확정 «특정 선박명이 없으면 그날 작업할 선박 전부 브리핑 해야 하는데 없으면
        //   작업할 선박이 없습니다. 내일 작업할것을 브리핑 할까요? 네 아니오 선택할수 있게»):
        //   오늘 0척이면 자동 진행이 아니라 **되묻는다** — [네]는 «내일 브리핑» 질의로 이어진다(아래 버튼 렌더).
        const _off = _dayOff;
        const _today = _shipsOf(_off);
        if (!_today.length) {
          if (_dayOff === 0 && _shipsOf(1).length) {
            return `오늘 작업할 선박이 없습니다. 내일 작업할 것을 브리핑할까요?`;
          }
          const _lbl0 = _dayOff === 2 ? '모레' : _dayOff === 1 ? '내일' : '오늘·내일';
          return `${_lbl0} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 잡히면 항차 카드에 뜹니다.\n배 이름을 붙이면 그 배 브리핑을 바로 합니다 (예: "TNJP 브리핑").`;
        }
        if (_today.length) {
          const _parts = [`📋 ${_off === 2 ? '모레' : _off === 1 ? '내일' : '오늘'} 작업 선박 ${_today.length}척 브리핑 — 배 이름을 붙이면 그 배만 자세히 (예: "${_today[0].v?.info?.vsl || 'SWSP'} 브리핑")`];
          for (const { k, v } of _today) {
            const _ship = v?.info?.vslFull || v?.info?.vsl || k;
            let _blk = null;
            try { const _pmv = matchPortMis(portMisData || {}, v?.info || {}); _blk = answerShipOverview(v, _ship, _pmv, ediPattern); } catch (e) { /* 배 하나 실패해도 계속 */ }
            if (!_blk) continue;
            const _lines = _blk.split('\n').filter(l => !l.startsWith('(컨테이너 상세'));   // 다척 나열에선 안내 줄 생략
            try {
              const _mine = flat.filter(c => c.voyageKey === k && c._ptk);
              if (_mine.length) {
                const _c = (f) => _mine.filter(f).length;
                const _sp = [];
                const _rfF = _c(c => c.rf && String(c.fe).toUpperCase() === 'F'); if (_rfF) _sp.push(`리퍼 ${_rfF}`);
                const _dg = _c(c => c.dg); if (_dg) _sp.push(`위험물 ${_dg}`);
                const _fr = _c(c => c.fr); if (_fr) _sp.push(`FR ${_fr}`);
                const _ot = _c(c => c.ot); if (_ot) _sp.push(`OT ${_ot}`);
                const _tk = _c(c => c.tk); if (_tk) _sp.push(`탱크 ${_tk}`);
                const _xr = _c(c => c._xray); if (_xr) _sp.push(`X-RAY ${_xr}`);
                if (_sp.length) _lines.push(`특수: ${_sp.join(' · ')}`);
              }
            } catch (e) { /* 특수 줄만 생략 */ }
            _parts.push(`【${_ship}】\n` + _lines.join('\n'));
          }
          if (_parts.length > 1) return _parts.join('\n\n');
        }
      } catch (e) { /* 아래 안내로 */ }
    }
    if ((p.briefingQuery && !shipCtx) || p.sealAuditQuery || p.twinCheckQuery || p.etaQuery ||
        p.customsReportQuery || p.handoverQuery || p.weatherQuery || p.foodQuery || (p.schedQuery && !shipCtx)) {
      return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 답합니다. (예: "STSE 출항 몇 시")\n작업 중 상세(브리핑·ETA·인계)는 항차 화면 [▶ 작업 시작] 탭의 미르가 더 자세합니다.';
    }
    // TallyOne 1.21: 기상 시각 — 통합검색엔 항차 맥락이 없어 근무조(주간 08시·야간 19시) 기준으로 답한다.
    if (p.wakeQuery) { try { return generateWakeAnswer({}); } catch { return null; } }
    if (p.timeQuery) { try { return generateTimeAnswer(); } catch { return null; } }
    if (p.introQuery) { try { return generateIntroAnswer(''); } catch { return null; } }
    return null;
  }, [parsed, debouncedQuery, voyages, shipCtx, flat, portMisData, terminalWork, chiefData, heartbeat, isChief, shipContacts]);   // 1.68-01: 진행 실황·터미널 ETD · 1.69: 통계·계산 · 1.69-01: 검수원 게이트 · 2.41: 선박 연락처

  // 2.33: 출구 한 겹 — 데이터는 그대로, 종결어미만 미르 말투로(검수사 확정 «살짝 친근»).
  //   업무 인텐트 전부 침묵일 때만 잡담 그물(검수사 제공 대본)이 받는다 —
  //   잡담이 답하면 아래 _mirDontKnow 가 자연히 false 라 무응답 신고도 안 나간다.
  // 2.34: 기본 지식 층 — «FR이 뭐야»에 앱 기능 안내만 나오던 것(검수사 «기본 지식이 없어요»).
  //   지식이 있으면 위에 붙이고 기존 앱 안내는 아래에 잇는다. 지식은 질문형에만 나선다(집계는 업무 몫).
  const _mirAnswer = useMemo(() => {
    const raw = mirTone(_localAnswerRaw);
    //  ★ 2.47 — 한 대를 묻는 말은 새 겹이 먼저 본다(SearchPanel 과 같은 한 벌).
    let eyes = null;
    try { eyes = mirSee(debouncedQuery, { containers: flat }); }
    catch (e) { console.warn('[미르의 눈] 실패 — 옛 미르로 넘깁니다:', e); }
    if (eyes) return eyes;
    const know = mirKnowledge(debouncedQuery);
    if (know && raw) return know + '\n\n────────\n' + raw;
    return know || raw || mirSmallTalk(debouncedQuery);
  }, [_localAnswerRaw, debouncedQuery, flat]);
  /*  ★ 2.40 미르 조작 — 밝기·소리. **접수된 질문에서만** 실행한다(타이핑 중에 화면이 바뀌면 안 된다).
      실행은 utils.runDeviceCmd 한 벌이 한다(두 검색 화면이 같은 답을 낸다).
      ⚠ 같은 접수를 두 번 실행하지 않게 키로 막는다 — 재렌더마다 밝기가 계속 올라가면 안 된다. */
  const [devAnswer, setDevAnswer] = useState(null);
  const devRanRef = useRef('');
  useEffect(() => {
    const cmd = parsed.deviceCmd;
    if (!cmd) { return; }
    //  ⚠ 2.40-01: 종전엔 `askedAt`(전송 누름)을 요구했다. 그래서 검수사가 「미르야 화면이 너무 밝아」를
    //    **치기만 하고** 전송을 안 누르자 아무 일도 안 일어났다 — 다른 조회는 치기만 해도 답이 나오는데.
    //    ⇒ 디바운스된 질의로 곧장 실행한다. 같은 문장을 두 번 실행하지 않게 **질의+명령**을 키로 잠근다.
    const key = String(debouncedQuery || '').trim() + '|' + JSON.stringify(cmd);
    if (devRanRef.current === key) return;
    devRanRef.current = key;
    let msg = null;
    try { msg = runDeviceCmd(cmd); }
    catch (e) { console.warn('[미르 조작] 실패', e); msg = '그건 지금 바꾸지 못했어요.'; }
    if (msg) { setDevAnswer(msg); try { speak(msg, { conversational: true }); } catch { /* 소리 꺼짐 */ } }
  }, [parsed.deviceCmd, debouncedQuery]);
  //  조작이 아닌 새 질문이 오면 조작 답을 걷는다.
  useEffect(() => { if (!parsed.deviceCmd) setDevAnswer(null); }, [parsed.deviceCmd, debouncedQuery]);
  //  조작 답이 있으면 그것이 먼저다 — 방금 누른 결과를 보여 줘야 한다.
  const localAnswer = devAnswer || _mirAnswer;


  // 검색 결과 (AI 자연어 적용)
  const matches = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    if (!hasAnyCondition(parsed)) return [];
    // 알파벳 포함 → 선박명 검색도 포함
    if (parsed.mirHello) return [];   // 1.91-03: «미르야» 단독 — 컨 나열 억제(인사 카드만)
    if (parsed.briefingQuery) return [];   // 1.97: 브리핑 질의 — 컨 100개 나열이 답을 가리지 않게(검수사 실측 tnjp 브리핑)
    if (/[실씰]\s*오류|실번호\s*(불일치|오류)/.test(debouncedQuery)) return [];   // 2.06: 실오류 질의 — 컨 나열 억제
    const Q = debouncedQuery.toUpperCase();
    const isOnlyDigits = /^\d+$/.test(Q.replace(/\s/g, ''));
    let r = applyNLFilter(flat, parsed);
    // V7.93-02: 조건·집계 검색은 평택분만 (7.1) — 컨번호(digits) 단건 조회는 전체 유지 (V7.92-02 동일 규칙)
    if (!parsed.digits) r = r.filter(c => c._ptk);
    // 자연어 조건이 없는 알파벳 → 선박명 매칭도 시도
    if (!parsed.size && !parsed.fe && !parsed.type && !parsed.isAll && !isOnlyDigits) {
      const vslMatches = flat.filter(c => c.vsl?.toUpperCase().includes(Q));
      r = [...new Set([...r, ...vslMatches])];
    }
    return r.slice(0, 100);
  }, [flat, debouncedQuery, parsed]);

  // 2.06 (검수사 확정 «답을 모를때는 솔직하게 — 아직은 저 미르가 그기능을 할수가 없습니다. 열심히 배워서
  //   알려 드리겠습니다» + «답을 못했을때는 그 문제를 클로드에게 보냅니다. 자동으로»):
  //   문장형 질문(한글 포함)이 즉답·데미지·컨 일치 전부 0이면 = 미르가 모르는 질문.
  const _mirDontKnow = useMemo(() => {
    const q = String(debouncedQuery || '').trim();
    if (q.length < 4 || !/[가-힣]{2,}/.test(q)) return false;   // 문장형(한글)만 — 끝4·컨번호 조회는 제외
    //  ⚠ 2.40-01: 조작 명령(밝기·소리)은 **할 수 있는 일**이다. 여기서 «못 한다»고 말하면
    //    검수사가 되는 기능을 안 되는 줄 알고 접는다. 실제로 2.40 에서 그렇게 보였다.
    if (parsed.deviceCmd) return false;
    return !localAnswer && !dmgQ && matches.length === 0;
  }, [debouncedQuery, localAnswer, dmgQ, matches, parsed.deviceCmd]);
  const _reportedRef = useRef(new Set());
  useEffect(() => {
    // 질문이 «접수»(엔터·전송)된 것만 1회 자동 신고 — 타이핑 중 오발송 방지
    if (!_mirDontKnow || !askedAt) return;
    const q = String(debouncedQuery || '').trim();
    if (!q || _reportedRef.current.has(q)) return;
    _reportedRef.current.add(q);
    fbAddClaudeMemo({
      kind: 'mir_unanswered', status: 'new', at: Date.now(),
      inspector: '미르(자동)',
      text: `미르 무응답 질문 — "${q}" (통합검색). 답할 수 있게 배워서 반영할 것.`,
    }).catch(() => { /* 신고 실패는 무해 — 다음 질문 때 재시도 */ });
  }, [_mirDontKnow, askedAt, debouncedQuery]);


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
        // 자연어 그대로 저장
        const t = text.trim();
        if (t.length >= 2) submitNow(t);   // 1.69-05: 같은 질문을 다시 말해도 답한다(종전 setQuery는 같은 문자열이면 무반응)
        else {
          const digits = parseSpokenDigits(text);
          if (digits && digits.length >= 2) submitNow(digits);
          else speak('인식 실패');
        }
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

  // 1.68: 음성은 «타자가 멈춘 뒤 한 번만» — 검수사 신고: "글 칠 때마다 전체없음을 외칩니다."
  //   200ms 검색 debounce와 별도로, 1.2초 더 조용해야 말한다. 스피커 끄면 화면만(검수사 확정).
  const [settledQuery, setSettledQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSettledQuery(query), 1200);
    return () => clearTimeout(t);
  }, [query]);

  // 1.69-05: 엔터·전송 버튼·음성 제출 — debounce(200ms)·침묵 대기(1.2초)를 건너뛰고 바로 답한다.
  //   같은 질문을 다시 물어도 lastSpokenRef를 풀어 다시 말하고(음성 켜져 있으면),
  //   답 박스에 «다시 확인했습니다 (HH:MM 기준)» 한 줄로 갱신이 보이게 한다.
  const submitNow = (raw) => {
    const t = String(raw ?? '').trim();
    if (t.length < 2) return;
    setReasked(t === lastAskRef.current);
    lastSpokenRef.current = null;
    setAskedAt(Date.now());
    setQuery(t);
    setDebouncedQuery(t);
    setSettledQuery(t);
  };

  // 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    if (settledQuery !== debouncedQuery) return;   // 1.68: 아직 치는 중 — 침묵
    const sig = `${debouncedQuery}-${matches.length}-${parsed.isStat}-${matches[0]?.cn || 'none'}-${(localAnswer || '').slice(0, 24)}`;   // 1.69: 비동기 답(보관소 조회)이 도착해도 읽는다
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    if (localAnswer) {
      // 1.92-02: 미르 인사는 짧게, 이모지 벗겨 읽기 — «미르야» 낭독이 이상하게 들리던 문제(검수사).
      const first = parsed.mirHello ? '네, 말씀하세요'
        : (localAnswer.split('\n').find(l => l.trim()) || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/[•·«»]/g, ' ').replace(/\s+/g, ' ').trim();
      if (first) speak(first);
      return;
    }
    if (parsed.isStat) {
      speak(`${describeQuery(parsed)} ${matches.length}대`);
      return;
    }

    if (matches.length === 0) {
      // 1.68: 조건을 하나도 못 알아들었으면 "전체 없음"을 외치지 않는다 — 문장 질문을 컨 검색으로
      //   오인해 매 타자마다 외치던 원인(검수사 신고). 화면은 종전대로 조용히 비워 둔다.
      if (!hasAnyCondition(parsed)) return;
      speak(`${describeQuery(parsed)} 없음`);
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
  }, [matches, debouncedQuery, parsed, autoSpeak, localAnswer, settledQuery, askedAt]);   // 1.69-05: 재제출 시 재발화

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setIsListening(true);
    stopSpeak();
    try { recognitionRef.current.start(); } catch (e) { setIsListening(false); }
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-3">
      <div className="bg-ink-900 border border-line rounded-btn p-3 mb-3">
        <div className="text-2xs text-dim-400 font-bold uppercase mb-2 flex items-center justify-between gap-2">
          {/* 1.81-01(검수사 요청 2026-08-17): 나가기 — 검색을 마치면 들어온 화면(수석 대시보드/홈)으로 돌아간다.
              해시 라우팅이라 history.back 이 직전 화면을 그대로 되살린다. 이력이 없으면(직접 진입) 홈으로. */}
          {!embedded && <button onClick={() => { try { if (window.history.length > 1) window.history.back(); else window.location.hash = '#/'; } catch (e) { window.location.hash = '#/'; } }}
            className="shrink-0 px-2.5 py-1.5 rounded-pill bg-ink-800 hover:bg-ink-750 active:bg-ink-700 border border-line-strong text-dim-100 text-xs font-bold normal-case"
            title="검색을 마치고 들어온 화면으로 돌아갑니다">
            ← 나가기
          </button>}
          <span className="min-w-0 truncate flex items-center gap-1.5"><img src={mirFaceUrl} alt="미르" className="w-5 h-5 rounded-full inline-block"/>미르 통합 검색 — 모든 항차·양/선적</span>
          <span className="text-dim-300 mono shrink-0">전체 {flat.length.toLocaleString()}대</span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim-400"/>
          <input type="text" value={query}
            onChange={e => { setQuery(e.target.value); setAskedAt(null); setReasked(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitNow(query); } }}
            placeholder="🎤 / 4777 / 40피트 4777 / 리퍼 몇개"
            autoComplete="off"
            autoFocus
            className="w-full pl-9 pr-40 py-3 bg-ink-800 border border-line rounded text-xl font-black mono text-amber-200 text-center tracking-wider focus:outline-none focus:border-amber-500"/>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {voiceSupported && (
              <button onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded flex items-center justify-center transition ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-ink-950'
                }`}>
                {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
              </button>
            )}
            <button onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-7 h-10 rounded flex items-center justify-center ${autoSpeak ? 'text-amber-300' : 'text-dim-400'}`}>
              {autoSpeak ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>
            {/* 1.69-05: 전송 버튼 — 폰 자판에 엔터가 없어도 질문을 보낸다. 같은 질문도 다시 답한다. */}
            {query.trim().length >= 2 && (
              <button onClick={() => submitNow(query)} title="질문 전송"
                className="w-10 h-10 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-ink-950">
                <SendHorizontal className="w-5 h-5"/>
              </button>
            )}
            {query && (
              <button onClick={() => { setQuery(''); setAskedAt(null); setReasked(false); stopSpeak(); }} className="w-7 h-10 rounded hover:bg-ink-750 flex items-center justify-center">
                <X className="w-4 h-4 text-dim-400"/>
              </button>
            )}
          </div>
        </div>
        {isListening && transcript && (
          <div className="mt-2 text-xs text-red-300 mono bg-red-900/20 px-2 py-1.5 rounded border border-red-800/40">
            🎙 {transcript}
          </div>
        )}
        {/* AI 인식 결과 표시 */}
        {hasAnyCondition(parsed) && (
          <div className="mt-2 text-xxs text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">
            🤖 인식: <span className="font-bold">{describeQuery(parsed)}</span>
            {parsed.isStat && <span className="ml-1 text-amber-300">(개수 질의)</span>}
          </div>
        )}
        <div className="text-xxs text-center mt-2">
          {!isListening && query.length === 0 && <span className="text-dim-400">🎤 마이크 또는 키보드</span>}
          {!isListening && query.length >= 2 && matches.length === 0 && hasAnyCondition(parsed) && !localAnswer && !dmgQ && <span className="text-red-400 font-bold">⚠ 일치 없음</span>}   {/* 2.05-04: 즉답·데미지 답이 있으면 컨 매칭 표시는 혼란만(검수사 «중간에 일치 없음?») */}
          {!isListening && query.length >= 2 && matches.length === 1 && !parsed.isStat && !localAnswer && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && matches.length > 1 && !parsed.isStat && !localAnswer && <span   /* 2.34-08: 즉답 있으면 숨김 — 답과 딴소리(검수사 실측 «24개 일치는 오류») */ className="text-amber-400 font-bold">⚠ {matches.length}개 일치{matches.length === 100 ? '+' : ''}</span>}
          {isListening && <span className="text-red-300 font-bold">🎙 듣는 중...</span>}
          {askedAt && !isListening && <span className="text-emerald-400 font-bold ml-2">✓ 질문 접수 {_hm(askedAt)}</span>}
        </div>
      </div>

      {/* 2.03: 데미지 이력 카드 — 컨번호·날짜로 과거(보관 포함) 데미지 조회 + 사진 */}
      {dmgQ && (
        <div className="bg-orange-950/40 border-2 border-orange-700 rounded-btn p-4 mb-3">
          <div className="text-xxs text-orange-400 font-bold uppercase mb-1">📷 데미지 이력</div>
          {damageIndex == null ? (
            <div className="text-sm text-dim-300">색인 불러오는 중…</div>
          ) : dmgHits.length === 0 ? (
            <div className="text-sm text-dim-100">기록 없음 — {dmgQ.cn ? `${dmgQ.cn} 의 데미지 기록이 없습니다` : '해당 날짜의 데미지 기록이 없습니다'} (앱으로 보고·예약한 건 기준)</div>
          ) : (
            <div className="space-y-2">
              {dmgHits.map((e) => {
                const d = new Date(e.ts);
                const when = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                return (
                  <div key={`${e.cn}_${e.ts}`} className="flex items-center gap-2 bg-ink-900/60 border border-line rounded-pill px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm2 mono font-bold text-dim-100">{e.cn} <span className="text-dim-300 font-normal">{when} · {e.voyageKey}</span></div>
                      <div className="text-xxs text-dim-200 truncate">
                        {(e.damageParts || []).join(' & ')} {(e.damageTypes || []).join(' & ')}{e.points ? ` ${e.points}P` : ''}{e.dims ? ` (${e.dims})` : ''}{e.note ? ` — ${e.note}` : ''}
                      </div>
                    </div>
                    <button onClick={() => openDmgPhoto(e)} className="px-3 py-2 rounded-pill bg-orange-700 hover:bg-orange-600 text-white text-xs2 font-bold shrink-0">📷 사진</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {dmgPhotoView && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-3 gap-2" onClick={() => setDmgPhotoView(null)}>
          {dmgPhotoView.loading && <div className="text-dim-100 font-bold">사진 불러오는 중…</div>}
          {dmgPhotoView.err && <div className="text-red-300 font-bold text-sm">{dmgPhotoView.err}</div>}
          {(dmgPhotoView.imgs || []).map((src, i) => (
            <img key={i} src={src} alt="" className="max-h-[45vh] max-w-full rounded-pill border border-line-strong" />
          ))}
          {dmgPhotoView.imgs && <div className="text-dim-200 text-xs2 font-bold">{dmgPhotoView.cn} — 화면을 누르면 닫힙니다</div>}
        </div>
      )}

      {/* 2.06: 미르가 모르는 질문 — 솔직하게 + 자동으로 개발에 전달됐음을 알림 (검수사 확정 문구 그대로) */}
      {_mirDontKnow && (
        <div className="bg-ink-900 border-2 border-line-strong rounded-btn p-4 mb-3">
          <div className="text-xxs text-dim-300 font-bold uppercase mb-1 flex items-center gap-1.5"><img src={mirFaceUrl} alt="" className="w-5 h-5 rounded-full"/>미르</div>
          <div className="text-sm text-dim-100 leading-relaxed">
            아직은 미르가 그 기능을 할 수 없어요 😿 열심히 배워서 꼭 알려드릴게요!
            {askedAt ? <span className="block text-xxs text-dim-300 mt-1">이 질문은 개발자에게 자동 전달됐습니다.</span>
              : <span className="block text-xxs text-dim-400 mt-1">전송(➤)을 누르면 이 질문이 개발자에게 자동 전달됩니다.</span>}
          </div>
        </div>
      )}
      {/* V9.14: 즉답/안내 카드 */}
      {localAnswer && (
        <div className="bg-emerald-950/40 border-2 border-emerald-700 rounded-btn p-4 mb-3">
          <div className="text-xxs text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1.5"><img src={mirFaceUrl} alt="" className="w-5 h-5 rounded-full"/>미르 즉답</div>
          {reasked && askedAt && <div className="text-xxs text-emerald-300 font-bold mb-1">다시 확인했습니다 ({_hm(askedAt)} 기준)</div>}
          <div className="text-sm text-dim-100 whitespace-pre-wrap leading-relaxed">{localAnswer}</div>
          {/* 2.05-03 (검수사 확정): «내일 작업할 것을 브리핑할까요?» — [네][아니오] 선택 */}
          {/내일 작업할 것을 브리핑할까요/.test(localAnswer) && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => setQuery('내일 브리핑')}
                className="flex-1 py-2.5 rounded-pill bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm">네 — 내일 브리핑</button>
              <button onClick={() => setQuery('')}
                className="flex-1 py-2.5 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-200 font-bold text-sm border border-line-strong">아니오</button>
            </div>
          )}
          {/* 2.05-03: 통합검색에도 유도 버튼 규격("라벨"로 상세 확인 — 1.84-03) — 브리핑 주의 버튼 등 */}
          {(() => {
            const _hs = [...new Set([...String(localAnswer).matchAll(/"([^"]{2,14})"\s*[으로]*로?\s*상세 확인/g)].map((m) => m[1]))];
            return _hs.length ? (
              <div className="flex gap-2 flex-wrap mt-3">
                {_hs.map((h) => (
                  <button key={h} onClick={() => setQuery(h)}
                    className="flex-1 min-w-[110px] py-2.5 rounded-pill bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold text-sm">🔍 {h} 보기</button>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* 통계 답변 카드 */}
      {!localAnswer && parsed.isStat && hasAnyCondition(parsed) && query.length >= 2 && (
        <div className="bg-gradient-to-br from-cyan-950 to-ink-900 border-2 border-cyan-600 rounded-btn p-4 text-center mb-3">
          <div className="text-xxs text-cyan-400 font-bold uppercase mb-1">🤖 AI 답변</div>
          <div className="text-base text-dim-200 mb-2">{describeQuery(parsed)}</div>
          <div className="text-6xl sm:text-7xl font-black mono text-cyan-300 my-2"
            style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.6)' }}>
            {matches.length}
          </div>
          <div className="text-lg text-cyan-400 font-bold">대</div>
        </div>
      )}

      {/* 일반 결과 */}
      {!localAnswer && !parsed.isStat && (
        <div className="space-y-1.5">
          {matches.map(c => (
            <GlobalResultCard key={`${c.voyageKey}/${c.mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalResultCard({ c, onOpen }) {
  const isDone = !!c.comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const hasTmp = c.tmp && String(c.tmp).trim() !== '' && String(c.tmp).trim() !== '0';
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-ink-900 border rounded-pill p-2.5 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30 bg-emerald-950/10' :
        c.isXray ? 'border-purple-700/30 bg-purple-950/10' :
        'border-line hover:bg-ink-750/50'
      }`}>
      <div className={`flex-shrink-0 px-2 py-1.5 rounded text-2xs font-black flex flex-col items-center gap-0.5 ${
        c.mode === 'discharge' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {c.mode === 'discharge' ? <ArrowDown className="w-3.5 h-3.5"/> : <ArrowUp className="w-3.5 h-3.5"/>}
        <span>{c.mode === 'discharge' ? '양하' : '선적'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-xxs text-dim-300 mono truncate">{c.cn}</span>
          <span className={`text-3xs mono px-1 rounded font-bold ${
            c.fe === 'F' ? 'bg-emerald-900/60 text-emerald-300' :
            c.fe === 'E' ? 'bg-ink-750 text-dim-200' :
            'bg-amber-900/60 text-amber-300'
          }`}>{c.fe || '?'}</span>
          {isReefer && hasTmp && <span className="bg-cyan-700/60 text-cyan-100 text-3xs px-1 rounded font-bold flex items-center gap-0.5"><Snowflake className="w-2.5 h-2.5"/>{c.tmp}°</span>}
          {c.isXray && <span className="bg-purple-700/60 text-purple-100 text-3xs px-1 rounded font-bold">🔍</span>}
          {c.dg && <span className="text-red-400 text-xs">🔥</span>}
          {isDone && <span className="bg-emerald-700/60 text-emerald-100 text-3xs px-1 rounded font-bold">✓</span>}
        </div>
        <div className="flex items-center gap-2 text-2xs text-dim-400 mono mt-0.5">
          <span className="text-dim-200 font-bold">{c.vsl}</span>
          <span>·</span>
          <span>{c.voy}</span>
          {c.bay && <><span>·</span><MapPin className="w-2.5 h-2.5"/><span className="text-amber-300">{fmtPos(c)}</span></>}
          {c.op && <><span>·</span><span className="text-dim-300">{c.op}</span></>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-dim-500 flex-shrink-0"/>
    </button>
  );
}
