// 모든 항차 + 양/선적 통합 검색 + 음성 입력 + AI 자연어 (M1.9)
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, ArrowDown, ArrowUp, MapPin, ChevronRight, Snowflake, SendHorizontal } from 'lucide-react';   // 1.69-05: 전송 버튼
import { speakContainer, parseSpokenDigits, speak, stopSpeak, spellKo } from '../voice.js';
import { isoToLabel, fmtPos, isPyeongtaekPort } from '../utils.js';
import { parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, generateTimeAnswer, generateWakeAnswer, generateIntroAnswer, generateHowToAnswer, isRealtimeProgressQuery, formatTerminalWorkAnswer, formatAppTallyAnswer } from '../nlSearch.js';   // V9.14: 통합검색에도 즉답 연결 · 1.66-03: 기능 설명
import { buildReadiness, describeReadiness } from '../dataReadiness.js';   // 1.66-03: "어느 선박 자료 다 있어" · "어느 선사 것이 없지"
import { matchPortMis } from '../portMisMatch.js';   // 1.68: "STSE 출항 몇 시" — 배 이름 맥락으로 즉답
import { fbGetSimple, fbListArchive } from '../firebase.js';   // 1.69: 오답·마감·월통계 — 물었을 때 1회 읽고 캐시
import { answerFeedback, answerCollector, answerTallyPending, answerArchiveStats, answerOverlaps, answerDataArrival, answerHatchStatus, answerGangSplit, answerTotalMoves, answerFirstStart, answerXrayShifts, answerShiftBriefing } from '../chiefAnswers.js';   // 1.69: 수석 통계·이력·계산(96~100)

// 1.69-05: HH:MM 표기 — «질문 접수»·«다시 확인했습니다» 공용
const _hm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export default function GlobalSearchPage({ voyages, onOpenContainer, portMisData, terminalWork, heartbeat, isChief = true, initialQuery = '' }) {   // 1.69: heartbeat — 수집기 상태 즉답 · 1.69-01: 검수원 진입(홈 검색) — isChief로 수석 전용 통계만 거른다
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
    if (/이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*(?:항차|된\s*배)/.test(q) && chiefData.archiveList === undefined) want.push(['archiveList', fbListArchive, []]);
    if (!want.length) return;
    setChiefData((d) => { const n = { ...d }; want.forEach(([k]) => { n[k] = null; }); return n; });   // null = 읽는 중
    want.forEach(([k, fn, fallback]) => fn()
      .then((v) => setChiefData((d) => ({ ...d, [k]: v ?? fallback })))
      .catch((e) => { console.warn('[통합검색] 노드 읽기 실패 —', k, e); setChiefData((d) => ({ ...d, [k]: { __error: true } })); }));
  }, [debouncedQuery, chiefData]);

  // ── TallyOne 1.68: 배 이름 맥락 ──
  //   "STSE 출항 몇 시"·"HAYN 양하 자료 다 있어"처럼 질문에 배가 지정되면 그 항차를 맥락으로 잡는다.
  //   종전에는 배를 지정해도 무시하고 "항차 화면 가서 물어보세요"로 떠넘겼다(검수사 지적 2026-08-13).
  const shipCtx = useMemo(() => {
    const Q = String(debouncedQuery || '').toUpperCase();
    if (Q.length < 3) return null;
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
    return best;
  }, [voyages, debouncedQuery]);

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
  const localAnswer = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return null;
    const p = parsed;
    const Q = debouncedQuery;
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
      const isArrivalQ = /(?:자료|리스트|EDI).{0,12}(?:언제|몇\s*시).{0,8}(?:왔|도착|들어)|(?:자료|리스트|EDI).{0,8}(?:언제|몇\s*시)$|도착\s*시각|확정\s*(?:뒤|후|이후).{0,10}(?:왔|갱신|자료)/.test(Q);
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
    if (p.briefingQuery || p.sealAuditQuery || p.twinCheckQuery || p.etaQuery ||
        p.customsReportQuery || p.handoverQuery || p.weatherQuery || p.foodQuery || (p.schedQuery && !shipCtx)) {
      return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 답합니다. (예: "STSE 출항 몇 시")\n작업 중 상세(브리핑·ETA·인계)는 항차 화면 🎤 자연어 탭이 더 자세합니다.';
    }
    // TallyOne 1.21: 기상 시각 — 통합검색엔 항차 맥락이 없어 근무조(주간 08시·야간 19시) 기준으로 답한다.
    if (p.wakeQuery) { try { return generateWakeAnswer({}); } catch { return null; } }
    if (p.timeQuery) { try { return generateTimeAnswer(); } catch { return null; } }
    if (p.introQuery) { try { return generateIntroAnswer(''); } catch { return null; } }
    return null;
  }, [parsed, debouncedQuery, voyages, shipCtx, flat, portMisData, terminalWork, chiefData, heartbeat, isChief]);   // 1.68-01: 진행 실황·터미널 ETD · 1.69: 통계·계산 · 1.69-01: 검수원 게이트

  // 검색 결과 (AI 자연어 적용)
  const matches = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    if (!hasAnyCondition(parsed)) return [];
    // 알파벳 포함 → 선박명 검색도 포함
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
      const first = localAnswer.split('\n').find(l => l.trim());
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
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-3">
        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center justify-between gap-2">
          {/* 1.81-01(검수사 요청 2026-08-17): 나가기 — 검색을 마치면 들어온 화면(수석 대시보드/홈)으로 돌아간다.
              해시 라우팅이라 history.back 이 직전 화면을 그대로 되살린다. 이력이 없으면(직접 진입) 홈으로. */}
          <button onClick={() => { try { if (window.history.length > 1) window.history.back(); else window.location.hash = '#/'; } catch (e) { window.location.hash = '#/'; } }}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 text-slate-200 text-xs font-bold normal-case"
            title="검색을 마치고 들어온 화면으로 돌아갑니다">
            ← 나가기
          </button>
          <span className="min-w-0 truncate">🤖 AI 통합 검색 — 모든 항차·양/선적</span>
          <span className="text-slate-400 mono shrink-0">전체 {flat.length.toLocaleString()}대</span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={query}
            onChange={e => { setQuery(e.target.value); setAskedAt(null); setReasked(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitNow(query); } }}
            placeholder="🎤 / 4777 / 40피트 4777 / 리퍼 몇개"
            autoComplete="off"
            autoFocus
            className="w-full pl-9 pr-40 py-3 bg-slate-800 border border-slate-700 rounded text-xl font-black mono text-amber-200 text-center tracking-wider focus:outline-none focus:border-amber-500"/>
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
            {/* 1.69-05: 전송 버튼 — 폰 자판에 엔터가 없어도 질문을 보낸다. 같은 질문도 다시 답한다. */}
            {query.trim().length >= 2 && (
              <button onClick={() => submitNow(query)} title="질문 전송"
                className="w-10 h-10 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-900">
                <SendHorizontal className="w-5 h-5"/>
              </button>
            )}
            {query && (
              <button onClick={() => { setQuery(''); setAskedAt(null); setReasked(false); stopSpeak(); }} className="w-7 h-10 rounded hover:bg-slate-700 flex items-center justify-center">
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
        {/* AI 인식 결과 표시 */}
        {hasAnyCondition(parsed) && (
          <div className="mt-2 text-[11px] text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">
            🤖 인식: <span className="font-bold">{describeQuery(parsed)}</span>
            {parsed.isStat && <span className="ml-1 text-amber-300">(개수 질의)</span>}
          </div>
        )}
        <div className="text-[11px] text-center mt-2">
          {!isListening && query.length === 0 && <span className="text-slate-500">🎤 마이크 또는 키보드</span>}
          {!isListening && query.length >= 2 && matches.length === 0 && hasAnyCondition(parsed) && <span className="text-red-400 font-bold">⚠ 일치 없음</span>}
          {!isListening && query.length >= 2 && matches.length === 1 && !parsed.isStat && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && matches.length > 1 && !parsed.isStat && <span className="text-amber-400 font-bold">⚠ {matches.length}개 일치{matches.length === 100 ? '+' : ''}</span>}
          {isListening && <span className="text-red-300 font-bold">🎙 듣는 중...</span>}
          {askedAt && !isListening && <span className="text-emerald-400 font-bold ml-2">✓ 질문 접수 {_hm(askedAt)}</span>}
        </div>
      </div>

      {/* V9.14: 즉답/안내 카드 */}
      {localAnswer && (
        <div className="bg-emerald-950/40 border-2 border-emerald-700 rounded-xl p-4 mb-3">
          <div className="text-[11px] text-emerald-400 font-bold uppercase mb-1">🤖 즉답</div>
          {reasked && askedAt && <div className="text-[11px] text-emerald-300 font-bold mb-1">다시 확인했습니다 ({_hm(askedAt)} 기준)</div>}
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{localAnswer}</div>
        </div>
      )}

      {/* 통계 답변 카드 */}
      {!localAnswer && parsed.isStat && hasAnyCondition(parsed) && query.length >= 2 && (
        <div className="bg-gradient-to-br from-cyan-950 to-slate-900 border-2 border-cyan-600 rounded-xl p-4 text-center mb-3">
          <div className="text-[11px] text-cyan-400 font-bold uppercase mb-1">🤖 AI 답변</div>
          <div className="text-base text-slate-300 mb-2">{describeQuery(parsed)}</div>
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
      className={`w-full text-left bg-slate-900 border rounded-lg p-2.5 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30 bg-emerald-950/10' :
        c.isXray ? 'border-purple-700/30 bg-purple-950/10' :
        'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <div className={`flex-shrink-0 px-2 py-1.5 rounded text-[10px] font-black flex flex-col items-center gap-0.5 ${
        c.mode === 'discharge' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {c.mode === 'discharge' ? <ArrowDown className="w-3.5 h-3.5"/> : <ArrowUp className="w-3.5 h-3.5"/>}
        <span>{c.mode === 'discharge' ? '양하' : '선적'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-[11px] text-slate-400 mono truncate">{c.cn}</span>
          <span className={`text-[9px] mono px-1 rounded font-bold ${
            c.fe === 'F' ? 'bg-emerald-900/60 text-emerald-300' :
            c.fe === 'E' ? 'bg-slate-700 text-slate-300' :
            'bg-amber-900/60 text-amber-300'
          }`}>{c.fe || '?'}</span>
          {isReefer && hasTmp && <span className="bg-cyan-700/60 text-cyan-100 text-[9px] px-1 rounded font-bold flex items-center gap-0.5"><Snowflake className="w-2.5 h-2.5"/>{c.tmp}°</span>}
          {c.isXray && <span className="bg-purple-700/60 text-purple-100 text-[9px] px-1 rounded font-bold">🔍</span>}
          {c.dg && <span className="text-red-400 text-xs">🔥</span>}
          {isDone && <span className="bg-emerald-700/60 text-emerald-100 text-[9px] px-1 rounded font-bold">✓</span>}
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
