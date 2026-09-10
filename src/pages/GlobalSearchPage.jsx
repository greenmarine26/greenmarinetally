// 모든 항차 + 양/선적 통합 검색 + 음성 입력 + AI 자연어 (M1.9)
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { parseViewCommand } from '../planCommand.js';   // 2.87-02: 플랜 명령 판정 한 벌
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, ArrowDown, ArrowUp, MapPin, ChevronRight, Snowflake, SendHorizontal } from 'lucide-react';   // 1.69-05: 전송 버튼
import { speakContainer, parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos, isSentenceQuery, crewShiftKey, resolveCrewSides, koJosa, _storage, SK } from '../utils.js';   // 3.42: _storage·SK — 모델 호출 기록에 검수원 이름   // 3.8: crewShiftKey·koJosa
import { parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, crewSetText } from '../nlSearch.js';   // 3.8: 호기–검수원   // 1.85: 통합검색 브리핑 즉답 · 1.89: 관련 선사 · 2.41: 선박 연락처
import { logQuerySettled } from '../activityLog.js';   // 2.55-01: 홈·수석창 질문 기록
import { useCarrierContacts, useShipSpeed, useEdiPattern, useDamageIndex } from '../useCarrierContacts.js';   // 1.89·1.92·1.97·2.03
import { mirTone, mirSmallTalk } from '../mirChat.js';
import { answerOneRaw } from '../mirAnswer.js';   // 3.41: 답 고르기 한 벌
import { askMirModel, isWeakAnswer } from '../mirModel.js';   // 3.42 판 B: 약한 답일 때만 모델(번역 → 규칙 재실행 → 자료 답)
import { flattenVoyages, pickShipCtx } from '../mirCtx.js';   // 3.41: 전 항차 펼치기 한 벌(떠 있는 미르와 공용)
import { computeTallyData } from '../tallyReport.js';   // 3.41: 마감텔리 수치 창구
import { getBayPairs } from '../twin.js';   // 3.41: 배 지정 트윈 짝
import { mirKnowledge } from '../data/mirKnowledge.js';
import { mirSee } from '../mirEyes.js';   // 2.47: 한 대를 보는 겹   // 2.34: 검수 실무 기본 지식(검수사 «기본 지식이 없어요»)   // 2.33: 미르 말투(출구 한 겹)·잡담 그물
import mirFaceUrl from '../assets/mir-face.png';   // 2.33: 미르 얼굴 — 검수사 제공 그림
import { fbGetDamagePhoto, fbAddClaudeMemo, fbSetVoyageCraneCrew } from '../firebase.js';   // 3.8: 홈에서 «OBWH 1호기 이인철» 등록   // 2.03: 데미지 사진 단건 · 2.06: 무응답 자동 신고
import { matchPortMis } from '../portMisMatch.js';   // 1.68: "STSE 출항 몇 시" — 배 이름 맥락으로 즉답
import { fbGetSimple, fbListArchive } from '../firebase.js';   // 1.69: 오답·마감·월통계 — 물었을 때 1회 읽고 캐시
import { runDeviceCmd } from '../utils.js';   // 2.40: 미르 조작(밝기·소리) 실행 단일 벌
import ScrollTopButton from '../components/ScrollTopButton.jsx';   // 2.82-02: 스크롤 긴 화면 TOP 버튼(공용 한 벌)

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

export default function GlobalSearchPage({ onOpenPlan = null, voyages, onOpenContainer, portMisData, terminalWork, heartbeat, isChief = true, initialQuery = '', embedded = false, ctxVoyageKey = null }) {   // 2.36: ctxVoyageKey — 항차 화면에 심을 때 배 이름을 안 붙여도 그 배로 답한다(검수사 «검색은 어디서든 같아야»)   // 2.03-02: embedded — 수석 대시보드 안에 심을 때(나가기 줄 숨김, 화면 전환 없음)   // 1.69: heartbeat — 수집기 상태 즉답 · 1.69-01: 검수원 진입(홈 검색) — isChief로 수석 전용 통계만 거른다
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
  const traceRef = useRef({});                    // 3.42: 규칙이 어느 길에서 답했는지(mirAnswer _trace)
  const [askedAt, setAskedAt] = useState(null);   // 질문 접수 시각 — «질문 접수 HH:MM» + 재발화 트리거
  const [reasked, setReasked] = useState(false);  // 같은 질문 재제출 — 답 박스에 «다시 확인했습니다»

  // M6.10: debounce — 키 입력마다 즉시 검색하지 않고 200ms 후 검색
  //   대용량 (수천 대 컨테이너) 환경에서 입력 반응성 개선
  useEffect(() => {
    // ★ 2.55-01 (검수사 신고 2026-08-26): **문장은 치는 중에 답하지 않는다.**
    //   *«문자를 입력 받을때는 질문을 다 받고 답하는걸 가르치세요»* — 종전엔 200ms 마다
    //   자동으로 답이 나가, 한 질문을 치는 동안 답이 서너 번 바뀌었다.
    //   숫자·컨번호는 종전 그대로 즉답한다(갑판에서 쓰는 빠른 길).
    if (!query.trim()) { lastSpokenRef.current = null; setDebouncedQuery(''); return; }
    if (isSentenceQuery(query)) {
      //  새 문장을 치기 시작하면 옛 답을 내린다 — 안 그러면 지난 답이 새 질문의 답처럼 보인다.
      //  (작업창 SearchPanel 이 쓰는 검증된 방식과 같은 벌: else if (query) setQuery(''))
      if (debouncedQuery && query.trim() !== debouncedQuery) setDebouncedQuery('');
      return;                                          // 전송키(Enter)·음성이 submitNow 로 넣어 준다
    }
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query, debouncedQuery]);
  // 1.69-05: 방금 물어서 답이 붙은 질문을 기억 — 같은 질문 재제출(엔터·전송·음성) 판정용
  useEffect(() => { if (debouncedQuery.trim().length >= 2) lastAskRef.current = debouncedQuery.trim(); }, [debouncedQuery]);

  // 모든 항차 양/선적 펼치기 — 3.41: 떠 있는 미르와 **같은 벌**(mirCtx.flattenVoyages). 홈이 아는 컨을 미르가 모르면 안 된다(§4-4).
  const flat = useMemo(() => flattenVoyages(voyages, terminalWork), [voyages, terminalWork]);

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
  //  ★ 2.58: 뜻·방법 갈래(asking)가 잡힌 질문에는 이력 카드를 띄우지 않는다 — «물이 새는데 데미지
  //    어떻게 잡아야 해» 에 남의 항차 이력 목록이 나오던 자리(검수사 실측). «데미지 이력 보여줘»는 그대로.
  const dmgQ = useMemo(() => (parsed && parsed.asking) ? null : parseDamageHistoryQuery(debouncedQuery), [debouncedQuery, parsed]);
  const dmgHits = useMemo(() => (dmgQ ? filterDamageHits(damageIndex, dmgQ) : []), [damageIndex, dmgQ]);
  const openDmgPhoto = async (e) => {
    setDmgPhotoView({ loading: true });
    try {
      const p = await fbGetDamagePhoto(e.voyageKey, e.ts);
      const imgs = [p?.data, p?.detailPhoto].filter(Boolean);
      setDmgPhotoView(imgs.length ? { imgs, cn: e.cn } : { err: '사진을 찾지 못했습니다 — 보관에서 지워졌을 수 있습니다' });
    } catch (er) { setDmgPhotoView({ err: '사진 불러오기 실패: ' + (er?.message || er) }); }
  };
  /* ★ 2.86 (검수사 실측 2026-08-29) — 홈(수석 대시보드) 미르도 플랜을 연다.
       검수사 기록 — «20:29 질문 '카고플랜 보여줘'» → 열리지 않았다. 2.85-01 은 항차 화면에만 넣었고
       이 화면은 다른 컴포넌트다.
     ⚠ 여기는 **아직 배를 안 고른 자리**다. 그래서 질문에서 배를 찾아(shipCtx) 그 배를 열면서 신호를 남긴다.
       배를 못 찾으면 아무것도 하지 않는다 — 엉뚱한 배를 여는 것보다 안 여는 편이 낫다. */
  const planRanRef = useRef('');

  //  3.41: 질문 속 배 고르기는 mirCtx.pickShipCtx 한 벌(떠 있는 미르와 공용) — 정확 포함 → 편집거리 1 유일(1.85) → 심긴 항차(2.36).
  const shipCtx = useMemo(() => pickShipCtx(debouncedQuery, voyages, ctxVoyageKey), [voyages, debouncedQuery, ctxVoyageKey]);

  /* 2.86 — «플랜 보여줘» 면 그 배를 열면서 신호를 남긴다. 여는 것은 부모(onOpenPlan)가 한다.
       ⚠ 홈은 **아직 배를 안 고른 자리**다. 질문에서 배를 못 찾으면(shipCtx 없음) 아무것도 열지 않는다 —
         엉뚱한 배를 여는 것보다 안 여는 편이 낫다. 검수사도 «MCSC» 를 붙여 다시 물었다(20:29 기록).
       양/선은 질문에 있으면 그것을, 없으면 양하를 기본으로 한다. */
  useEffect(() => {
    const t = String(debouncedQuery || '').trim();
    if (!t || !onOpenPlan) return;
    if (planRanRef.current === t) return;
    /* 2.87-02: 판정은 src/planCommand.js 한 벌이다 — 여기 사본을 두면 홈·항차 화면과 갈린다. */
    const cmd = parseViewCommand(t);
    if (!cmd) return;
    if (!shipCtx || !shipCtx.key) return;
    planRanRef.current = t;
    const mode = cmd.mode || 'discharge';
    try { onOpenPlan({ voyageKey: shipCtx.key, mode, what: cmd.what, bay: cmd.bay }); }
    catch (e) { console.warn('[미르] 플랜 열기 실패:', e); }
  }, [debouncedQuery, shipCtx, onOpenPlan]);

  /* ★ 3.8 (검수사 2026-09-05 «OWBH 1호기 이인철 3호기 최관식») — 홈에서 말하면 **그 배의 지금 항차**에 적는다.
       배를 못 찾으면(shipCtx 없음) 적지 않는다 — 답 본문이 «배 이름을 붙여 주세요» 라고 말한다. 확인 글은 본문(crewSetText)이 낸다. */
  const crewRanRef = useRef('');
  useEffect(() => {
    const t = String(debouncedQuery || '').trim();
    if (!t) return;
    let cs = null;
    if (!shipCtx || !shipCtx.key) return;
    try { cs = resolveCrewSides(parseNaturalQuery(t).crewSet, shipCtx.v); } catch (e) { cs = null; }   // 3.21: «선수·선미» 유도 한 벌
    if (!cs || !Array.isArray(cs.crew) || !cs.crew.length) return;
    const sk = crewShiftKey(cs.shift, Date.now(), cs.dayOff || 0);
    const key = `${shipCtx.key}|${sk.key}|${cs.crew.map((c) => c.no + ':' + c.name).join(',')}`;
    if (crewRanRef.current === key) return;
    crewRanRef.current = key;
    fbSetVoyageCraneCrew(shipCtx.key, sk.key, cs.crew)
      .then((txt) => { try { speak(`${shipCtx.info?.vsl || ''} ${sk.key}조 ${koJosa(String(txt), '으로')} 기억했어요`, { conversational: true }); } catch (e) { /* 소리 꺼짐 */ } })
      .catch((e) => { console.warn('[3.8] 호기 검수원 저장 실패', e); crewRanRef.current = ''; try { speak('호기 검수원 저장이 안 됐어요 — 다시 말해 주세요'); } catch (e2) { /* 소리 꺼짐 */ } });
  }, [debouncedQuery, shipCtx]);

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
    const Q = debouncedQuery;
    /* ★ 3.2-01 (받은함 08-29 «MCSC 카고플랜»·«MCSC 633N 양하 카고 플랜» 무응답 6건) — 플랜 명령이면 «열었어요» 한 줄.
         종전엔 플랜이 열려도(위 useEffect) 답 카드가 비어 _mirDontKnow 가 참이 되고 «무응답»으로 신고됐다.
         배를 못 찾으면 무엇을 붙이라고 말한다 — 엉뚱한 배를 여느니 안 여는 편이 낫다(2.86). */
    {
      const _pc = onOpenPlan ? parseViewCommand(Q) : null;   // 여는 손(onOpenPlan)이 없는 자리에선 «열었어요»라 말하지 않는다
      if (_pc) {
        const _md = _pc.mode || 'discharge';
        const _what = _pc.what === 'cargo' ? '카고플랜' : (_pc.bay != null ? `${_pc.bay}번 베이플랜` : '베이플랜');
        if (shipCtx && shipCtx.key) {
          const _voy = (_md === 'loading' ? shipCtx.info?.voy_l : shipCtx.info?.voy_d) || shipCtx.info?.voy || '';
          return `🗺 ${shipCtx.info?.vsl || ''} ${_voy} ${_md === 'loading' ? '선적' : '양하'} ${_what}을 열었어요.`;
        }
        return `어느 배의 ${_what}인지 못 찾았어요 😿 «MCSC 카고플랜» 처럼 배 이름을 붙여 주세요.`;
      }
    }
    /* ★ 3.41 — 답 고르기는 `mirAnswer.answerOneRaw` **한 벌**(검수사 «미르를 하나로»). 종전 이 자리의 450여 줄(EDI 차이·인사·연락처·
         수석 통계·진행·보관·콜사인·배 지정 계산·뜻·방법·기능·자료현황·입출항·속도·물량·전망·선사·브리핑·실오류·우리 배·오늘 작업 선박)은
         전부 그리로 옮겼다. 여기 남는 것은 재료(ctx)를 싣는 일뿐이다 — 판정을 여기서 다시 세우지 않는다(§4-4). */
    traceRef.current = {};
    return answerOneRaw(Q, {
      app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', _trace: traceRef.current,
      voyages, flat, shipCtx: shipCtx || null, isChief, chiefData, heartbeat, portMisData, terminalWork, carrierContacts, shipSpeed, ediPattern, shipContacts,
      bayPairs: (shipCtx && shipCtx.v) ? (() => { try { return getBayPairs(flat.filter((c) => c.voyageKey === shipCtx.key), String(shipCtx.info?.imo || ''), String(shipCtx.info?.vsl || '')); } catch (e) { return null; } })() : null,
      computeTallyData, matchPortMis,   // 콘앱 번들을 무겁게 하지 않으려고 화면이 싣는 두 함수
    });
  }, [parsed, debouncedQuery, voyages, shipCtx, flat, portMisData, terminalWork, chiefData, heartbeat, isChief, shipContacts, onOpenPlan, carrierContacts, shipSpeed, ediPattern]);   // 3.41: 한 벌 엔진 ctx

  /* ★ 3.42 (판 B) — 약한 답일 때만 모델. 접수된 질문(askedAt)만, 같은 문장은 한 번. 번역문은 같은 재료로 규칙을 다시 돌린다(두 벌 금지). */
  const [modelState, setModelState] = useState({ q: '', pending: false, text: null, via: null });
  const _rulesFor = (cq) => answerOneRaw(cq, {
    app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both',
    voyages, flat, shipCtx: shipCtx || null, isChief, chiefData, heartbeat, portMisData, terminalWork, carrierContacts, shipSpeed, ediPattern, shipContacts,
    bayPairs: (shipCtx && shipCtx.v) ? (() => { try { return getBayPairs(flat.filter((c) => c.voyageKey === shipCtx.key), String(shipCtx.info?.imo || ''), String(shipCtx.info?.vsl || '')); } catch (e) { return null; } })() : null,
    computeTallyData, matchPortMis,
  });
  useEffect(() => {
    const q = String(debouncedQuery || '').trim();
    if (!q || q.length < 4 || !askedAt || !/[가-힣]{2,}|[A-Za-z]{3,}/.test(q) || /^[0-9\s]+$/.test(q)) { setModelState((m) => (m.q === q ? m : { q, pending: false, text: null, via: null })); return undefined; }
    if (parsed.deviceCmd || parsed.crewSet || parsed.startSet || parsed.gangSet) return undefined;
    if (!isWeakAnswer(q, _localAnswerRaw, traceRef.current)) { setModelState((m) => (m.q === q && !m.pending ? m : { q, pending: false, text: null, via: null })); return undefined; }
    let alive = true;
    setModelState({ q, pending: true, text: null, via: null });
    const _who = _storage.get(SK.activeInspector) || '';   // 이 화면은 inspector prop 이 없다 — 저장된 검수원 이름(App 과 같은 키)
    const ctx = { app: 'tally', voyages, voyageKey: shipCtx && shipCtx.key, voyage: shipCtx && shipCtx.v, info: (shipCtx && shipCtx.info) || null,
      containers: (shipCtx && shipCtx.key) ? flat.filter((c) => c.voyageKey === shipCtx.key) : flat, inspector: _who };
    askMirModel(q, ctx, (cq) => _rulesFor(cq), { who: _who, weakText: _localAnswerRaw, weakVia: traceRef.current && traceRef.current.via })
      .then((m) => { if (!alive) return; setModelState({ q, pending: false, text: (m && m.text) ? m.text : null, via: (m && m.via) || null }); if (m && m.text) logQuerySettled('nls', q, { voyageKey: (shipCtx && shipCtx.key) || '', via: m.via }); })
      .catch((e) => { console.warn('[미르 모델] 실패:', e && e.message); if (alive) setModelState({ q, pending: false, text: null, via: null }); });
    return () => { alive = false; };
  }, [debouncedQuery, askedAt]);   // eslint-disable-line react-hooks/exhaustive-deps — 접수된 문장 하나에 한 번

  // 2.33: 출구 한 겹 — 데이터는 그대로, 종결어미만 미르 말투로(검수사 확정 «살짝 친근»).
  //   업무 인텐트 전부 침묵일 때만 잡담 그물(검수사 제공 대본)이 받는다 —
  //   잡담이 답하면 아래 _mirDontKnow 가 자연히 false 라 무응답 신고도 안 나간다.
  // 2.34: 기본 지식 층 — «FR이 뭐야»에 앱 기능 안내만 나오던 것(검수사 «기본 지식이 없어요»).
  //   지식이 있으면 위에 붙이고 기존 앱 안내는 아래에 잇는다. 지식은 질문형에만 나선다(집계는 업무 몫).
  const _mirAnswer = useMemo(() => {
    const raw = mirTone(_localAnswerRaw);
    //  ★ 2.47 — 한 대를 묻는 말은 새 겹이 먼저 본다(SearchPanel 과 같은 한 벌).
    let eyes = null;
    //  ★ 2.57: 종전엔 info 없이 불러 mirEyes 게이트(배가 안 정해지면 «순서»가 뜻이 없다)에서 항상 null —
    //    이 화면에서 미르의 눈이 영구 침묵이었다. 질의 속 배 이름·심긴 항차(shipCtx)가 있으면 그 항차로
    //    컨을 좁히고 info 를 준다. shipCtx 없으면 종전 그대로 침묵 — 배가 안 정해진 홈에서 순서를 부르면 안 된다.
    try {
      eyes = shipCtx
        ? mirSee(debouncedQuery, {
            containers: flat.filter((c) => c.voyageKey === shipCtx.key),   // flat 에 _mode·_comp·_ptk 가 실려 있어 mirEyes 판정이 그대로 선다
            info: shipCtx.info,
            mode: (shipCtx.v?.discharge ? 'discharge' : 'loading'),
          })
        : mirSee(debouncedQuery, { containers: flat });
    }
    catch (e) { console.warn('[미르의 눈] 실패 — 옛 미르로 넘깁니다:', e); }
    if (eyes) return eyes;
    //  ★ 2.57: 뜻 갈래(asking=def)는 본체가 이미 지식으로 답했다 — 여기서 또 붙이면 두 번 나온다.
    const know = (parsed && parsed.asking) ? null : mirKnowledge(debouncedQuery);   /* 2.59-01: def 만 거르니 how 가 새서 본체 답과 겹으로 두 번 나왔다(라이브 실측) — asking 갈래(def·how)는 본체가 답하므로 겹은 물러난다 */
    if (know && raw && raw !== know && mirTone(know) !== raw) return know + '\n\n────────\n' + raw;   // 3.41: 한 벌 엔진이 지식으로 답한 것을 또 붙이지 않는다
    return know || raw || mirSmallTalk(debouncedQuery);
  }, [_localAnswerRaw, debouncedQuery, flat, parsed, shipCtx]);   // ★ 2.57: shipCtx — 미르의 눈 배선
  /*  ★ 2.40 미르 조작 — 밝기·소리. **접수된 질문에서만** 실행한다(타이핑 중에 화면이 바뀌면 안 된다).
      실행은 utils.runDeviceCmd 한 벌이 한다(두 검색 화면이 같은 답을 낸다).
      ⚠ 같은 접수를 두 번 실행하지 않게 키로 막는다 — 재렌더마다 밝기가 계속 올라가면 안 된다. */
  const [devAnswer, setDevAnswer] = useState(null);
  const devRanRef = useRef('');
  useEffect(() => {
    const cmd = parsed.deviceCmd;
    if (!cmd) { return; }
    //  ⚠ 2.40-01 은 askedAt(전송 누름) 요구를 걷고 «치기만 해도 실행»으로 갔었다.
    //  ★ 2.57 주석 정정 — 2.55-01(문장은 전송까지 대기) 뒤로 조작 문장도 전송(엔터·➤·음성)해야
    //    debouncedQuery 에 들어오므로, 실동작은 다시 «전송해야 실행»이다. 동작은 이대로 둔다 —
    //    치는 중에 밝기가 바뀌면 안 되고, 옛 주석을 믿을 다음 클로드가 헛디디지 않게 글만 고친다.
    //    같은 문장을 두 번 실행하지 않는 **질의+명령** 키 잠금은 종전 그대로.
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
  //  조작 답이 있으면 그것이 먼저다 — 방금 누른 결과를 보여 줘야 한다. 3.42: 모델이 받은 답이 있으면 약한 규칙 답 대신 그것.
  const _modelAnswer = (modelState.q === String(debouncedQuery || '').trim() && modelState.text) ? mirTone(modelState.text) : null;
  //  3.42: 렌더 시점에 «이 문장은 모델로 간다»를 미리 안다 — effect 가 pending 을 세우기 전 첫 커밋에 발화·신고가 먼저 나가던 것(감사 jsdom 실측)
  const _dq = String(debouncedQuery || '').trim();
  const _willAskModel = !!(askedAt && _dq.length >= 4 && /[가-힣]{2,}|[A-Za-z]{3,}/.test(_dq) && !/^[0-9\s]+$/.test(_dq) && !(parsed.deviceCmd || parsed.crewSet || parsed.startSet || parsed.gangSet) && isWeakAnswer(_dq, _localAnswerRaw, traceRef.current));
  const _modelPending = _willAskModel && !(modelState.q === _dq && !modelState.pending);
  const localAnswer = devAnswer || _modelAnswer || _mirAnswer;


  // 검색 결과 (AI 자연어 적용)
  const matches = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    if (!hasAnyCondition(parsed)) return [];
    // 알파벳 포함 → 선박명 검색도 포함
    if (parsed.mirHello) return [];   // 1.91-03: «미르야» 단독 — 컨 나열 억제(인사 카드만)
    if (parsed.briefingQuery) return [];   // 1.97: 브리핑 질의 — 컨 100개 나열이 답을 가리지 않게(검수사 실측 tnjp 브리핑)
    if (parsed.factQuery && parsed.bay == null && !parsed.howToQuery) return [];   // 3.41: 항차 창구(마감텔리·해치·현측…) — 컨 나열은 답이 아니다(«12번 해치 몇 대»는 베이 조회라 남긴다)
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
    if (_modelPending) return false;   // 3.42: 모델이 생각 중 — 아직 «못 한다»가 아니다
    return !localAnswer && !dmgQ && matches.length === 0;
  }, [debouncedQuery, localAnswer, dmgQ, matches, parsed.deviceCmd, _modelPending]);
  // ★ 2.57: «아직 못 배웠습니다» 답(뜻 질문에 지식이 없을 때 nlSearch 가 내는 솔직 답)도 무응답으로 친다.
  //   답 카드가 떠서 _mirDontKnow 는 false 지만, 신고가 빠지면 «못 답한 질문 → 받은함 → 다음 클로드가
  //   가르침» 파이프라인(2.06 mir_unanswered)이 끊긴다. 화면 카드는 그대로 — 신고 조건만 넓힌다.
  //   ⚠ mirTone 이 «배웠습니다»를 «배웠어요»로 바꿔 내보내므로 어미 앞 «아직 못 배웠»까지만 본다.
  const _unlearned = /아직 못 배웠/.test(String(localAnswer || ''));
  const _reportedRef = useRef(new Set());
  useEffect(() => {
    // 질문이 «접수»(엔터·전송)된 것만 1회 자동 신고 — 타이핑 중 오발송 방지
    if ((!_mirDontKnow && !_unlearned) || !askedAt) return;
    if (_modelPending) return;                                                    // 3.42: 모델이 생각 중 — 아직 «무응답»이 아니다
    if (modelState.q === String(debouncedQuery || '').trim() && modelState.text) return;   // 3.42: 모델이 답했다 — 신고 안 한다(mir_misses 에는 mirModel 이 남긴다)
    const q = String(debouncedQuery || '').trim();
    if (!q || _reportedRef.current.has(q)) return;
    _reportedRef.current.add(q);
    fbAddClaudeMemo({
      kind: 'mir_unanswered', status: 'new', at: Date.now(),
      inspector: '미르(자동)',
      text: `미르 무응답 질문 — "${q}" (통합검색). 답할 수 있게 배워서 반영할 것.`,
    }).catch(() => { /* 신고 실패는 무해 — 다음 질문 때 재시도 */ });
  }, [_mirDontKnow, _unlearned, askedAt, debouncedQuery, _modelPending, modelState]);


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
    logQuerySettled('nls', t, { voyageKey: shipCtx?.key || '' });   // 2.55-01: 홈·수석창도 남긴다(종전엔 안 불렀다)
  };
  // ★ 2.57: initialQuery 가 문장이면 접수 경로로 — 2.55-01(문장은 전송까지 대기) 뒤로 문장은 디바운스를
  //   안 타므로 useState 씨앗만으론 debouncedQuery 가 영영 비어 답이 안 나왔다(홈 검색 폼·수석 대시보드가
  //   문장을 initialQuery 로 넘긴다). 숫자·컨번호는 종전 디바운스로 충분해 그대로 둔다.
  //   submitNow 선언 **뒤**에 둔다 — 스코프·선언 순서 사고 이력(2.48·2.50-01)이 있는 저장소다.
  useEffect(() => {
    if (initialQuery && isSentenceQuery(initialQuery)) submitNow(initialQuery);
  }, [initialQuery]);   // submitNow 는 렌더마다 새로 나므로 의존에 안 넣는다(안의 setter·ref 는 전부 안정)

  // 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    if (settledQuery !== debouncedQuery) return;   // 1.68: 아직 치는 중 — 침묵
    if (_modelPending) return;   // 3.42: 모델이 생각 중 — 약한 답을 먼저 읽지 않는다
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
  }, [matches, debouncedQuery, parsed, autoSpeak, localAnswer, settledQuery, askedAt, _modelPending]);   // 1.69-05: 재제출 시 재발화 · 3.42: 모델 결과

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

      {_modelPending && (
        <div className="text-xxs text-center text-sky-300 font-bold animate-pulse mb-2">🐱 미르가 다시 생각하는 중…</div>
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
              <button onClick={() => submitNow('내일 브리핑')}   /* ★ 2.57: 2.55-01 뒤로 문장은 디바운스를 안 타 setQuery 만으론 답이 영영 안 나왔다 — submitNow 로 접수 */
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
                  <button key={h} onClick={() => submitNow(h)}   /* ★ 2.57: 유도 버튼도 접수 경로로 — setQuery 만으론 문장이 답을 못 받는다 */
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
          {/* ★ 2.57 (화법 규칙 ③ 쏟지 않기): 홈에서 FR 치면 카드 100장이 쏟아졌다(검수사 실측) — 30대까지만
              그린다. 검색창 밑 «N개 일치» 표시는 종전 그대로 살아 있어 전체 수는 거기서 보인다. */}
          {matches.length > 30 && (
            <div className="text-xxs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1.5">
              전체 {matches.length}{matches.length === 100 ? '+' : ''}대 중 30대만 보여드려요 — 더 필요하면 조건을 좁히거나 «FR 목록»처럼 물어봐 주세요
            </div>
          )}
          {matches.slice(0, 30).map(c => (
            <GlobalResultCard key={`${c.voyageKey}/${c.mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer(c)} />
          ))}
        </div>
      )}
      <ScrollTopButton />   {/* 2.82-02: 스크롤이 긴 화면엔 TOP (검수사 지시 2026-08-29) */}
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
