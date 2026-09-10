// 검색 패널 (M2.0)
// - 싱글: AI 자유 질문 + 키워드 + 음성
// - 트윈: 자동 짝꿍 + 양쪽 동시 완료
// - 결과 카드: 실번호 거대 + 완료 버튼
// - Gemini API: 자연어 자유 질의
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseViewCommand } from '../planCommand.js';   // 2.87-02: 플랜 명령 판정 한 벌
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, Truck, AlertOctagon, Snowflake, AlertTriangle, Check, RotateCcw, Sparkles, Loader2, Link2, HelpCircle, SendHorizontal } from 'lucide-react';   // TallyOne 1.22: 전송키
import { parseSpokenDigits, speak, speakLong, stopSpeak, spellKo, fixSpeechDomain, pickSpeechAlternative, speakDone } from '../voice.js';   // 2.65: speakLong — 브리핑 낭독
import { isTransitContainer, canCompleteContainer, isoCheckDigit, isoFixLastDigit, dropFilledBookingSlots, isPtk} from '../utils.js';   // 3.2-01: 통과분 판정 한 벌
import { isoToLabel, fmtPos, isPyeongtaekPort, computeShiftingMapCached, shiftingMapForDisplay, effectivePos, formatWt, seqFullConfirmText, buildSlotUniverse, buildOccupancy, getEquipNumber, ediMapFromRaw, applySwapFix, swapFixList, fullContainerNo, isSentenceQuery, gangKeyFromWords, parseSpokenTimeMs, crewShiftKey, resolveCrewSides, koJosa} from '../utils.js';   // TallyOne 1.53: 위치 판정은 effectivePos 하나로 · 트윈 안내 무게   // 1.54: 시퀀스 되묻기 문구(한 벌)
import { terminalWorkFor, parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, briefingVoiceLines, needsModeChoice, voyageDoneAts, voyageReportSpan} from '../nlSearch.js';   // 1.23: answerAboutAlert · 1.65: generateHowToAnswer · 2.41: 선박 연락처
import { useCarrierContacts, useShipSpeed } from '../useCarrierContacts.js';   // 1.89·1.92
import { buildGangShift} from '../chiefAnswers.js';   // 1.90·1.91·1.92 · 2.62 갱 배분
import GangStrip from './GangStrip.jsx';   // 2.63: 카고플랜 조감 스트립
import { isChief as _isChiefName } from '../staffList.js';   // 1.65: 수석 전용 기능인지 밝혀 답하려고
import { matchPortMis } from '../portMisMatch.js';   // V7.92: 입출항 질문 답변용 간이 매처
import { askMirModel, isWeakAnswer } from '../mirModel.js';   // 3.42 판 B: 약한 답일 때만 모델(번역 → 규칙 재실행 → 자료 답) — 종전 fixQuestionWithAI(음성 교정)를 이 한 함수가 대신한다
import { askGemini, isFreeFormQuestion } from '../gemini.js';
import { findTwinCandidate, getBayPairs } from '../twin.js';   // V7.93: getBayPairs — 트윈 무게 점검
import { fbCompleteContainer, fbCancelComplete, fbSetInspectorActivity, fbAddExtraContainer, fbRemoveExtraContainer, fbReassignContainerPosition, fbCompleteContainersAtomic, fbUnassignContainer, fbGetSimple, fbSetVoyageGangs, fbSetVoyageWorkStart, fbSetVoyageCraneCrew} from '../firebase.js';   // 2.41: fbGetSimple — 선박 연락처(shipContacts) 1회 GET
import BigResultCard from './BigResultCard.jsx';
import RestoreOrigButton from './RestoreOrigButton.jsx';   // V9.51
import HelpModal from './HelpModal.jsx';
import ExtraContainerModal from './ExtraContainerModal.jsx';
import WrongAnswerModal from './WrongAnswerModal.jsx';
import { logQuerySettled } from '../activityLog.js';   // TallyOne 1.3: 조회 활동 기록(음성 포함)
import GuidedWorkPanel from './GuidedWorkPanel.jsx';   // V7.94: 자동 가이드 모드
import { mirTone } from '../mirChat.js';
import { answerOneRaw } from '../mirAnswer.js';   // 3.41: 답 고르기 한 벌 — 작업창·양하선적 탭·홈·콘앱·떠 있는 미르가 같은 함수
import { fetchWeatherText } from '../weatherText.js';   // 3.41: 날씨 문장 한 벌
import { computeTallyData } from '../tallyReport.js';   // 3.41: 마감텔리 수치 창구 — 화면이 실어 준다(콘앱 번들 무게)
import { mirKnowledge } from '../data/mirKnowledge.js';
import { mirSee } from '../mirEyes.js';   // 2.47: 한 대를 보는 겹 — 못 보면 null 로 옛 미르에게 넘긴다   // 2.34: 검수 실무 기본 지식   // 2.33: 미르 말투 — 출구 한 겹
import mirFaceUrl from '../assets/mir-face.png';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';   // 1.49: 브라우저 confirm() 은 화면을 얼린다 — 실측 2026-08-11
import { runDeviceCmd } from '../utils.js';   // 2.40: 미르 조작(밝기·소리) 실행 단일 벌

// ── TallyOne 1.55: 지금 어느 갱(호기)으로 작업 중인가 ───────────────────
//   검수사 원문 2026-08-12 — *"장비를 바꿔서 해야 하는데 4호기로 다함.
//   이걸로 제출하면 2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
//   갱은 헤더(Header)·자동 가이드(GuidedWorkPanel)가 이미 localStorage 한 벌로 쓰고 있다.
//   같은 벌을 그대로 본다 — prop 으로 또 내리면 두 벌이 되어 서로 어긋난다.
function useEquipNo() {
  const [equip, setEquip] = useState(() => getEquipNumber());
  useEffect(() => {
    const h = (e) => setEquip((e && e.detail) || getEquipNumber());
    window.addEventListener('equipChanged', h);
    return () => window.removeEventListener('equipChanged', h);
  }, []);
  return equip;
}

// ── TallyOne 1.55: 조회창은 **전체 컨번호**도 받는다 ────────────────────
//   검수사 실측 2026-08-12 — 싱글 조회창에 `DWSU3000276` 을 넣으면 아무것도 안 나왔다.
//   `0276` 은 나왔다. 트윈 입력칸은 전체 번호를 받는데 싱글만 규칙이 달랐다.
//   원인 둘 — ⓐ 글자가 섞였다는 이유로 '문장'으로 갈려 전송키를 눌러야만 답했고,
//   ⓑ 답도 끝 4자리로만 걸러 **끝 4자리가 겹치는 배에서는 두 대가 함께** 떴다.
//   끝 4자리 중복이 있는 배에서 유일하게 안전한 입력이 전체 번호다.
//   ⚠ 조회창은 숫자 패드다(inputUtils 확정) — 영문 4자리를 못 치는 화면이 있으므로
//     숫자부만(`3000276`) 쳐도 같은 한 대로 좁혀 준다.
//  2.55-01: 컨번호 정규식·판정은 utils 한 벌을 쓴다(여기 있던 사본을 걷어냈다).
const fullCnOf = (v) => fullContainerNo(v);   // 2.55-01: utils 한 벌로 이관
// 끝 4자리로 이미 좁혀진 목록을 **전체 번호(또는 숫자부)** 로 한 대까지 좁힌다.
//   못 찾으면 원래 목록을 그대로 돌려준다 — 오타로 "없습니다"가 되지 않게(회귀 방지).
function narrowByFullCn(list, q) {
  const s = String(q || '').replace(/[\s-]/g, '').toUpperCase();
  const full = fullCnOf(s);
  if (full) {
    const hit = list.filter(c => String(c.cn || '').toUpperCase() === full);
    return hit.length ? hit : list;
  }
  const dg = s.replace(/\D/g, '');
  if (dg.length >= 5) {
    const hit = list.filter(c => String(c.cn || '').replace(/\D/g, '').endsWith(dg));
    return hit.length ? hit : list;
  }
  return list;
}

export default function SearchPanel({ onOpenPlan, voyage, voyageKey, inspector, onOpenContainer, shipLib = null, portMisData = {}, rfSkip = false, esealBrief = null, pilotForecast = {}, isLoloShip = false, diagAlerts = [], mode = null, onWorkFilterChange = null, onPlaceUnassigned = null, terminalWork = {}, relayQuery = '' }) {   // 1.84-01: 양하 탭 검색창에서 넘어온 질문   // TallyOne 1.22: pilotForecast — 도선→작업개시 답변용   // 1.23: diagAlerts — 경고 문장을 그대로 물으면 그 경고를 설명한다   // V9.28: 미배정→빈자리 배치   // V7.92: portMisData 추가 · V8.11: isLoloShip · V8.82: mode 동기화(상단 양하/선적 탭과 한 몸)
  const [searchMode, setSearchMode] = useState('single');
  // V9.49: 선적 트윈 방식 — 'auto'(양하와 같은 화면·기본) | 'manual'(위치 지정)
  const [loadTwinMode, setLoadTwinMode] = useState('auto');
  // V7.94: 자동 가이드 모드 — 앱이 크레인 순서대로 다음 컨을 예측 제시 (수동 = 기존 검색 방식)
  const [guideMode, setGuideMode] = useState(false);
  // M5.75: 작업 모드 필터 (양하/선적/완료) — 현재 작업 중인 모드만 검색
  const [workFilter, setWorkFilter] = useState(mode === 'loading' ? 'loading' : 'discharge');
  // 1.84-02: 양하 탭 검색줄에서 질문이 넘어오면 **맨 위에 답 카드**를 바로 띄운다.
  //   종전(1.84-01)엔 릴레이만 하고 답을 그리는 SingleSearch 가 수동 모드+베이 선택 뒤에 있어
  //   검수사가 질문하고 엔터를 쳐도 작업 시작 화면만 보였다(검수사 스크린샷 2026-08-19).
  const [askMode, setAskMode] = useState(false);
  useEffect(() => { if (String(relayQuery || '').trim()) setAskMode(true); }, [relayQuery]);  // 'discharge' | 'loading' | 'completed'
  // V8.82: 상단 양하/선적 탭(VoyagePage mode)이 바뀌면 작업 모드도 따라간다 — 위·아래가 반대로 엇갈리던 혼선 제거.
  useEffect(() => {
    if ((mode === 'discharge' || mode === 'loading') && workFilter !== mode) setWorkFilter(mode);
  }, [mode]);
  // V8.82: 아래 탭을 누르면 상단 모드도 따라가게 상위로 알림.
  const pickWorkFilter = (m) => { setWorkFilter(m); if (m !== 'completed') onWorkFilterChange?.(m); };
  const [extraModalOpen, setExtraModalOpen] = useState(false);   // V8.04: 초과 컨 입력 모달
  const equipNo = useEquipNo();   // TallyOne 1.55: 지금 갱(호기) — 완료 기록·수석 전달에 같이 실린다

  // 1.76-05: 시프팅 판정·자리 정보 — 확정 대조가 있으면 그것, 없으면 예측(양하 EDI 하나로).
  //   판정은 utils 한 벌만 쓴다(같은 판정을 두 기준으로 하지 않는다). raw 서명이 바뀔 때만 다시 푼다.
  const _rawSig = `${voyage?.discharge?.raw?.edi?.uploadedAt || 0}|${voyage?.discharge?.raw?.edi?.sizeBytes || 0}`
    + `|${voyage?.loading?.raw?.edi?.uploadedAt || 0}|${voyage?.loading?.raw?.edi?.sizeBytes || 0}`;
  //   ⛔ **작업 카드는 «확정 대조»만.** 예측으로는 절대 카드를 만들지 않는다 (1.76-05).
  //     예측은 성격상 «대기 단계 자료»다 — §5-1B «판정은 같은 단계 자료끼리».
  //     실측 2026-08-16: 예측을 카드로 올렸다면 KSKM 2615N 4대(인천 하선분)·XTPG 536E 7대
  //     (아직 인천 작업 중, 접안 예정 8/17)가 **없는 시프팅 11대**로 양하 리스트에 올라가
  //     검수사에게 «치우라»고 지시했을 것이다. 지침서에 이미 허수로 기록된 바로 그 건들이다.
  //     예측은 종전대로 «알림·예보»로만 쓴다(챗봇 답·홈 카드) — 작업 항목이 아니다.
  const shiftMapAll = useMemo(() => {
    try { return computeShiftingMapCached(voyageKey, voyage) || {}; }
    catch (e) { console.warn('[SearchPanel] 시프팅 확정 대조 실패 — 작업 카드에서 빠진다:', e); return {}; }
  }, [voyageKey, _rawSig, voyage?.swapFix]);   // 2.89: 맞교환 반영
  // 시프팅 컨의 규격·POD 등 — 통과화물이라 ediContainers 에 없다. raw 전문 재파싱본에서 가져온다.
  const shiftInfoAll = useMemo(() => {
    if (!Object.keys(shiftMapAll || {}).length) return {};
    try { return { ...(ediMapFromRaw(voyage?.loading) || {}), ...(ediMapFromRaw(voyage?.discharge) || {}) }; }
    catch (e) { return {}; }
  }, [shiftMapAll, _rawSig]);

  const allContainers = useMemo(() => {
    const _sw = swapFixList(voyage);   // 2.89-05: 맞교환 겹침 — 이 풀만 안 겹쳐 «자리 뺏김 20» 허깨비 그룹이 떴다
    const arr = [];
    ['discharge', 'loading'].forEach(m => {
      const sec = voyage?.[m];
      if (!sec) return;
      const ediMap = applySwapFix(sec.ediContainers || {}, _sw);   // 2.89-05
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
        merged[r.cn] = { ...(merged[r.cn] || {}), ...safeR, _src: hasEdi ? 'both' : 'list' };   // 3.26: 부킹 자리를 채우는 실번호 표식(utils.bookingFillOf)
      });
      Object.values(merged).forEach(c => {
        if (!c.cn) return;
        arr.push({
          ...c, _mode: m, _src: c._src || 'edi',
          // V7.92-02: 평택분 여부 — 양하=POD평택, 선적=POL평택 (7.1). 집계는 평택분만.
          //  3.26: 선적은 utils.isPtk 한 벌 — **리스트 등재 = 평택**(V8.86·M5.50, 항차 화면·인쇄허브와 같은 규칙). 종전엔 pol 만 봐서
          //    POD·POL 열이 없는 리스트(남성 CLL 104대)가 평택분에서 빠져 «선적 N» 이 212 로 섰다(2차 감사 실측).
          _ptk: m === 'discharge' ? isPyeongtaekPort(c.pod) : isPtk({ ...c, _inList: !!recMap[c.cn] }, m),
          _transit: isTransitContainer(c, m, recMap),   // 3.2-01: 통과분(항구 적혀 있고 평택 아님·리스트 미등재) — 완료 카드가 되지 않는다
          _xray: m === 'discharge' && !!xrayMap[c.cn],
          _xraySeal: xraySeals[c.cn] || null,
          _comp: compMap[c.cn] || null,
        });
      });
      // V8.04: 초과 컨(extras) — EDI/리스트에 없지만 실제 내려진 컨. 정식 목록에 포함하고
      //   _extra 플래그로 색만 강조. 리스트·토탈·집계에 일반 컨처럼 들어간다(평택분 인정).
      const extMap = sec.extras || {};
      Object.entries(extMap).forEach(([cn, e]) => {
        if (!cn || merged[cn]) return;   // 이미 목록에 있으면(EDI/리스트) 중복 추가 안 함
        const label = e.size || '';
        // 신고 기본정보 → 일반 컨 필드로 매핑 (집계·표시가 그대로 활용)
        const iso = label === '20' ? '22G1' : label === '40HC' ? '45G1'
          : label === '45' ? 'L5G1' : label === '40ST' ? '42G1' : '';
        arr.push({
          cn,
          _mode: m, _extra: true,           // ← 색 강조용 플래그
          _ptk: true,                        // 초과는 실제 내려진 평택분
          _comp: { by: e.by, at: e.at, flag: 'extra' },
          iso,
          fe: e.fe || '',
          rf: e.ctype === 'RF', fr: e.ctype === 'FR', ot: e.ctype === 'OT', tk: e.ctype === 'TK',
          tmp: e.temp || '',
          sl: e.seal || '',
          _extraSize: e.size || '', _extraType: e.ctype || '', _extraDamage: e.damage || '',
          note: e.note || '',
          bay: '', row: '', tier: '',        // 위치 미지정(리스트에 없던 컨)
        });
      });

      // ★ 1.76-05: 시프팅 컨을 **작업 대상**으로 올린다.
      //   검수사 메모 2026-08-16 — *"시프팅 화물이 양하대상에 목록에 안보임. 순서에서도 빠짐."*
      //   시프팅은 크레인이 두 번 드는 실작업(양하 1 + 재선적 1)인데, 앱은 「작업 대상 = 평택분」
      //   으로만 정의해 세 곳에서 통째로 빠졌다 — 목록 원천 · 큐 입력(_ptk) · 큐 생성기.
      //   ⚠ 수집기가 올리는 ediContainers 에는 통과화물이 **이미 없다.** 그래서 필터만 풀어서는
      //     안 나온다 — 자리 정보는 raw EDI 재파싱본(shiftMap)에서 가져온다.
      //   ⚠ 카드는 **둘**이다 (검수사 확정 2026-08-16) — 양하 모드에서 «내린다»(_shift:'out'),
      //     선적 모드에서 «싣는다»(_shift:'in'). 크레인 2모브와 1:1로 맞는다.
      //   ⚠ 카운트는 **섞지 않는다** (검수사 확정 2026-08-16) — _shift 는 진행률·리스트 총계에서
      //     빼고 별도 칸으로 센다. §5-2 「평택분만 센다」와 부딪히지 않게 하는 지점이다.
      //   순서는 따로 손대지 않는다 — 시프팅 컨은 물리적으로 걸린 화물 **위**에 있으므로
      //     «위 티어부터» 규칙이 알아서 먼저 내보낸다. 큐에 들어가기만 하면 된다.
      Object.entries(shiftMapAll || {}).forEach(([cn, s]) => {
        if (!cn || cn.startsWith('__')) return;
        const pos = m === 'discharge' ? (s.from || s.pos || '') : (s.to || '');
        if (!pos || pos.length < 7) return;   // 자리를 모르면 큐에 못 넣는다(조용히 빠지지 않게 아래 경고)
        /* ★ 2.89-04 (검수사 실물 2026-08-30 — 자리확인 «1035» 에 UETU6801035 가 안 뜸) —
             시프팅 컨에 리스트 기록(records)이 생기는 순간 merged 에 걸려 시프팅 행이 통째로
             사라졌다. 기록이 있어도 시프팅 표식과 자리는 이어 준다 — 행을 지우지 않는다. */
        if (merged[cn]) {
          const row = arr.find(x => x._mode === m && x.cn === cn);
          if (row) {
            row._shift = m === 'discharge' ? 'out' : 'in';
            row._shiftFrom = s.from || s.pos || ''; row._shiftTo = s.to || '';
            if (!row.bay || !row.tier) { row.bay = pos.slice(0, 3); row.row = pos.slice(3, 5); row.tier = pos.slice(5, 7); }
          }
          return;
        }
        const info = shiftInfoAll?.[cn] || {};
        arr.push({
          ...info, cn,
          _mode: m,
          // ⛔ _ptk 는 **false 로 둔다.** 여기에 true 를 주면 저장소 전체 90곳의 `_ptk` 판정이
          //   한꺼번에 바뀐다(firebase 31 · chiefAnswers 10 · HomePage 5 · ChiefDashboard 5 …).
          //   그러면 마감텔리·수석 대시보드·홈 카드 총계가 조용히 부풀고, 검수사가 확정한
          //   «카운트는 섞지 않는다»를 정면으로 어긴다. 특정 케이스를 공용 경로 앞단에 두지 않는다.
          //   → 큐·목록은 `_ptk || _shift` 로 **입력 쪽에서만** 넓힌다(호출부를 세어 가며).
          _ptk: false,
          _shift: m === 'discharge' ? 'out' : 'in',
          _shiftFrom: s.from || s.pos || '', _shiftTo: s.to || '',
          _comp: sec.completed?.[cn] || null,
          bay: pos.slice(0, 3), row: pos.slice(3, 5), tier: pos.slice(5, 7),
        });
      });
    });
    // TallyOne 1.35: **실체 위치를 계획 자리로 승격한다.**
    //   검수사 신고 2026-08-09: *"한 곳에서 자리를 배정했는데 다른 한 곳은 아직도 미배정으로 뜹니다."*
    //   원인 — 이 패널은 voyage 를 받아 **자체적으로 다시 병합**해서, VoyagePage 가 하는
    //   `bay_actual → bay` 승격(`VoyagePage.jsx:395`)을 전혀 거치지 않았다.
    //   그래서 베이 화면에서 배정해 `bay_actual` 이 채워져도, 이 패널의 "자리 미지정"
    //   판정(`!c.bay || !c.row || !c.tier`)에는 그대로 걸려 **같은 컨이 두 화면에서 다르게 세어졌다.**
    //   임시창고(`__STG__`)는 승격하지 않는다 — 그것은 '자리 없음'을 뜻하는 정상 상태다.
    return arr.map(c => {
      if (c.bay_actual && c.bay_actual !== '__STG__' && c.row_actual && c.tier_actual) {
        return { ...c, bay: c.bay_actual, row: c.row_actual, tier: c.tier_actual,
                 _bay_planned: c.bay, _row_planned: c.row, _tier_planned: c.tier, _position_moved: true };
      }
      return c;
    });
  }, [voyage, shiftMapAll, shiftInfoAll]);   // 1.76-05: 시프팅 카드가 큐·목록에 들어가려면 의존에 있어야 한다

  // M5.75: 작업 모드 필터 적용 — 양하 작업 중엔 양하만, 선적엔 선적만, 완료는 별도
  const filteredContainers = useMemo(() => {
    if (workFilter === 'completed') {
      return allContainers.filter(c => c._comp);  // 양하/선적 구분 없이 완료된 것
    }
    return allContainers.filter(c => c._mode === workFilter && !c._comp);
  }, [allContainers, workFilter]);

  // 갯수 표시용
  //  3.26: 대수는 부킹 자리·실번호를 한 번만 센다(utils.dropFilledBookingSlots — 풀 자체는 자리를 남긴다: 가이드·자리 확인 모드가 자리를 본다).
  const countPool = useMemo(() => dropFilledBookingSlots(allContainers), [allContainers]);
  const dischCount = useMemo(() => countPool.filter(c => c._mode === 'discharge' && c._ptk && !c._comp).length, [countPool]);   // V7.92-02: 평택분만
  const loadCount = useMemo(() => countPool.filter(c => c._mode === 'loading' && c._ptk && !c._comp).length, [countPool]);   // V7.92-02: 평택분만
  const completedCount = useMemo(() => allContainers.filter(c => c._comp).length, [allContainers]);
  // V8.04: 초과분만 따로 — 별도 집계·제출(검수리스트처럼) 및 색 강조용.
  const extraList = useMemo(() => allContainers.filter(c => c._extra), [allContainers]);

  // V7.99-10 (메모6 수동): 수동 작업도 베이→홀드/데크 선택(A안). 가이드와 동일하게 수석에게 작업 위치 전달 + 조회를 그 단으로 좁힘.
  const [manualBay, setManualBay] = useState(null);    // 그룹 center
  const [manualTier, setManualTier] = useState(null);  // 'hold'|'deck'
  const manualBayPairs = useMemo(() => getBayPairs(allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || ''), [allContainers, voyage]);
  const manualGroupCenterOf = (bayStr) => {
    const b = parseInt(bayStr, 10);
    if (!Number.isFinite(b)) return null;
    if (b % 2 === 0) return b;
    const p = manualBayPairs?.[String(b)];
    if (p) return (b + parseInt(p, 10)) / 2;
    return b;
  };
  const manualGroups = useMemo(() => {
    if (workFilter === 'completed') return [];
    const is40 = (c) => { const f = String(c.iso || '')[0]; return f === '4' || f === 'L' || f === '9' || String(c.tp || '').includes('40'); };
    const map = {};
    // V9.23-08: 좌표 없는 컨을 버리지 않는다 — 버리면 "대기 N대"인데 고를 베이가 없어진다.
    //   (2658W 실측: 남은 14대가 전부 좌표 없는 엠티라 화면이 "남은 작업 없음"으로 보였다)
    const NOBAY = -1;
    const swapDestByCn = new Map();   // 1.96-01: 자리 뺏긴 컨 → 맞교환 목적지
    // ── 1.56: **남은 N대 = 빈 칸 수** (검수사 확정 — "remain 은 빈 칸 수. 같은 계산을 「남은 N대」에도").
    //   종전엔 그 베이에 이름이 걸린 **미완료 컨 머릿수**를 세서, 실린 컨이 다른 베이 계획분이면
    //   꽉 찬 베이에 「남은 5대」가 남고(B7·9 실측), 빈 베이가 「남은 0대」로 잠겼다.
    //   DXQD 2631W 809이벤트 리플레이 실측 — 810시점 중 792시점이 빈 칸 수와 어긋났다.
    //   칸 우주(buildSlotUniverse) ∪ 점유(buildOccupancy)는 자리 그리드(slotsByBay)와 같은 한 벌이다.
    const workList = allContainers.filter(c => c._mode === workFilter && c._ptk);
    const planView = workList.map(c => (c._bay_planned
      ? { ...c, _edi_bay: c._bay_planned, _edi_row: c._row_planned, _edi_tier: c._tier_planned }
      : c));
    const uniSrc = [...workList, ...planView];
    const uni20 = buildSlotUniverse(uniSrc, (c) => !is40(c));
    const uni40 = buildSlotUniverse(uniSrc, is40);
    const occ = buildOccupancy(workList, (c) => !!c._comp);
    workList.forEach(c => {
      // 자리 미지정(칸 자체가 없음)만 종전대로 컨 머릿수 — 칸이 없으니 칸으로 못 센다.
      if (c._comp) return;
      const hasPos = (c.bay && c.row && c.tier) || c._edi_bay || c.bay_orig;
      // 1.96 (검수사 확정 «남은컨은 다른방법으로 빈자리에서 배정되어야 합니다» — SWSP 34번 실측):
      //   계획 칸을 다른 컨이 실체로 차지한 «자리 뺏긴» 미완 컨은 그 베이 남은 수가 아니라 **재배정 대상** —
      //   미지정 그룹에 편입해 기존 🅿 빈자리 배치 흐름을 그대로 탄다.
      let displaced = false; let taker = null;
      if (hasPos) {
        const b = parseInt(c.bay, 10);
        const o = occ.get(`${Number.isFinite(b) ? b : c.bay}/${c.row}/${c.tier}`);
        if (o && o.done && o.cn !== c.cn) { displaced = true; taker = o.cn; }
      }
      if (hasPos && !displaced) return;
      // 1.96-01 (검수사 확정 «자리를 빼앗은컨이 갖고있던자리로 가면됩니다 — 그래야 빼앗긴 베이도 갯수가 맞습니다»):
      //   뺏은 컨의 원계획 자리가 비어 있으면 그 자리가 이 컨의 목적지(맞교환) — 그 베이 «남은 컨»으로 센다.
      let swapTo = null;
      if (displaced) {
        const tk = taker && workList.find(x => x.cn === taker);
        const pb = tk && (tk._bay_planned || tk.bay_orig);
        const pr = tk && (tk._row_planned || tk.row_orig);
        const pt = tk && (tk._tier_planned || tk.tier_orig);
        if (pb && pr && pt) {
          const bn = parseInt(pb, 10);
          const po = occ.get(`${Number.isFinite(bn) ? bn : pb}/${pr}/${pt}`);
          if (!(po && po.done)) swapTo = { bay: pb, row: pr, tier: pt };
        }
      }
      const g0 = (map[NOBAY] ||= { center: NOBAY, noBay: true, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0, displaced: 0, swapHints: [] });
      if (displaced && swapTo) {
        // 목적지가 확정된 맞교환 — 재배정 카드 count 엔 안 넣고 안내만. 컨 수는 목적지 베이(contLeft)로 이관.
        g0.swapHints.push({ l4: String(c.cn || '').slice(-4), to: `${String(swapTo.bay).padStart(2, '0')}-${swapTo.row}-${swapTo.tier}`, taker: String(taker).slice(-4) });
        swapDestByCn.set(c.cn, swapTo);   // 아래 contLeft 집계에서 사용 — 지역 Map(원본 객체 오염 금지)
        return;
      }
      g0.count++;
      if (displaced) g0.displaced++;
    });
    const eat = (uni, big) => {
      Object.keys(uni).forEach(b => {
        const center = manualGroupCenterOf(b);
        if (center == null) return;
        uni[b].forEach(sl => {
          const o = occ.get(`${parseInt(sl.bay, 10)}/${sl.row}/${sl.tier}`);
          if (o && o.done) return;   // 실물이 찬 칸은 남은 일이 아니다
          const g = (map[center] ||= { center, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0 });
          g.bays.add(parseInt(sl.bay, 10)); g.count++;
          const isDeck = parseInt(sl.tier, 10) >= 80;
          if (isDeck) { g.deck++; big ? g.deck40++ : g.deck20++; } else { g.hold++; big ? g.hold40++ : g.hold20++; }
        });
      });
    };
    eat(uni20, false); eat(uni40, true);
    // 1.95 (검수사 확정 «빈 칸 수 유지 + 병기» — SWSP 실측: 자동 94 vs 수동 103, 9대가 계획과 다른 자리에 실림):
    //   자동 가이드와 같은 기준(미완 컨 머릿수)을 contLeft 로 같이 센다 — 버튼에 «빈 칸 N · 남은 컨 M» 병기.
    /* ★ 2.88-02 (검수사 «수동작업시 베이 사라짐 · 앱은 이중인격자인가») —
         **자동과 같은 큐를 본다.** 자동은 `_ptk || _shift`(GuidedWorkPanel:214 `_isWork`)인데
         수동은 `_ptk` 만 봤다. 38번 데크에 실을 16대가 **전부 시프팅**이라(내렸다 다시 싣는 것)
         수동 모집단에 아예 없었고, 그래서 빈 칸도 남은 컨도 0 이 되어 목록에서 사라졌다.
       ⚠ 빈 칸(count)은 **종전 그대로 평택 계획 자리**로 센다 — 검수사 확정 «카운트는 섞지 않는다».
         여기서 넓히는 것은 «남은 컨»(contLeft) 하나뿐이고, 그것이 자동이 세는 것과 같은 수다. */
    const contList = allContainers.filter(c => c._mode === workFilter && (c._ptk || c._shift));
    contList.forEach(c => {
      if (c._comp) return;
      const b = parseInt(c.bay, 10);
      const o = occ.get(`${Number.isFinite(b) ? b : c.bay}/${c.row}/${c.tier}`);
      const stolen = !!(o && o.done && o.cn !== c.cn);
      // 1.96-01: 자리 뺏긴 컨 — 맞교환 목적지가 있으면 **그 베이**의 남은 컨으로 센다(«그래야 빼앗긴 베이도 갯수가 맞습니다»).
      const dest = stolen ? swapDestByCn.get(c.cn) : null;
      const center = stolen ? (dest ? manualGroupCenterOf(dest.bay) : null) : manualGroupCenterOf(c.bay);
      if (center == null) return;
      /* ★ 2.88-01 (검수사 2026-08-30 «수동작업시 베이 사라짐 · 앱은 이중인격자인가») —
           종전엔 `const g = map[center]; if (g)` 라 **빈 칸이 없어 map 에 없던 베이는 통째로 사라졌다.**
         실측 MCSC 635S 선적 — 자동은 B3·14·22·26·30·34·38 일곱인데 수동은 B26·B38 이 없었다.
         그 둘은 «빈 칸» 이 0 인 베이다. 38번은 실을 것이 **시프팅**(내렸다 다시 싣는 것)이라
         계획 칸이 없어 빈 칸으로 안 잡힌다 — 그런데 실을 컨은 36대가 남아 있다.
         ⇒ 여기서 묶음을 만들어 준다. 없는 베이가 아니라 «계획 칸이 없는 베이»다. */
      const g = (map[center] ||= { center, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0 });
      g.contLeft = (g.contLeft || 0) + 1;
      const _cb = parseInt((stolen && dest) ? dest.bay : c.bay, 10);
      if (Number.isFinite(_cb)) g.bays.add(_cb);
      //  남은 «컨» 기준 데크/홀드 — 빈 칸(g.deck/g.hold)과 다른 축이라 따로 센다.
      const _ct = parseInt((stolen && dest) ? dest.tier : c.tier, 10);
      //  2.89-02: 단 선택 화면이 컨 축으로도 서야 해서 규격(20/40)까지 나눠 센다 — 빈 칸 축과 섞지 않는다.
      const _c40 = is40(c);
      if (Number.isFinite(_ct)) {
        if (_ct >= 80) { g.contDeck = (g.contDeck || 0) + 1; _c40 ? (g.contDeck40 = (g.contDeck40 || 0) + 1) : (g.contDeck20 = (g.contDeck20 || 0) + 1); }
        else { g.contHold = (g.contHold || 0) + 1; _c40 ? (g.contHold40 = (g.contHold40 || 0) + 1) : (g.contHold20 = (g.contHold20 || 0) + 1); }
      }
    });
    /*  빈 칸 0 인 묶음은 카드에서 내린다 — 끝난 베이가 목록에 남아 "다음"을 가리지 않게.
        ★ 2.88-01: 단 **남은 컨이 있으면 남긴다.** 진짜 끝난 베이는 contLeft 도 0 이라 그대로 빠진다.
          이 한 줄이 B38·B26 을 수동에서 지우고 있었다(자동에는 남아 있어 «이중인격»으로 보였다). */
    return Object.values(map).filter(g => g.count > 0 || (g.contLeft || 0) > 0 || g.noBay).sort((a, b) => a.center - b.center);
  }, [allContainers, workFilter, manualBayPairs]);

  /* ── TallyOne 2.93: **빈 칸이 있어도 갈 컨이 없으면 남은 작업이 아니다.** (검수사 지적 2026-08-31) ──
       실측 MCSC 635S — B38 홀드 20대를 다 싣자 화면이 «같은 베이 데크 26대 남았습니다 — 이어서 →» 를 띄웠다.
       38번 데크에 실을 화물은 EDI 계획도 CATOS 실적도 **0대**다. 26은 그 배 38번 데크의 **빈 칸 수**였다.
       검수사 — *"데크 선적갯수? B3? 어디?"*
       1.56 의 «남은 N대 = 빈 칸 수» 는 그대로 둔다(꽉 찬 베이에 유령 잔여가 남던 것을 고친 규칙이다).
       다만 그 위에 게이트를 하나 세운다 — **실을 컨이 0이면 그 단은 0.**
       ⚠ 2.88-02 의 시프팅 베이(계획 칸이 없어 빈 칸 0인데 실을 컨 36대)는 종전대로 컨 축이 진실이다. */
  const tierLeftOf = React.useCallback((g, tier) => {
    if (!g) return 0;
    if (g.noBay) return g.count || 0;
    const slot = tier === 'hold' ? (g.hold || 0) : (g.deck || 0);
    const cont = tier === 'hold' ? (g.contHold || 0) : (g.contDeck || 0);
    if (cont <= 0) return 0;                 // 실을 것이 없다 — 빈 칸이 몇이든 일이 아니다
    return slot > 0 ? Math.min(slot, cont) : cont;
  }, []);
  // TallyOne 1.53: **작업이 끝나면 검색창까지 사라졌다.**
  //   실측 2026-08-12(선적 335대 완주) — 남은 작업이 0이 되자 수동 모드가
  //   「선적 작업이 없습니다」만 띄우고 **조회창 자체가 없어졌다.** 「✓ 완료」 탭을 눌러야 검색창이 나왔다.
  //   그런데 *"이 컨 어디 있지"* 는 **작업이 끝난 뒤에 나오는 질문**이다.
  //   → 남은 작업이 없으면 베이·단 게이트를 건너뛰고 바로 조회창을 연다(게이트는 작업용이지 조회용이 아니다).
  const noWorkLeft = workFilter !== 'completed' && manualGroups.length === 0;
  // 작업 모드 바뀌면 선택 리셋
  useEffect(() => { setManualBay(null); setManualTier(null); }, [workFilter]);
  //  2.90: 자동에서 물려받은 베이가 수동 묶음 center 와 안 맞으면 그 베이를 품은 묶음으로 —
  //    품은 묶음도 없으면 비운다(게이트가 다시 묻는다). 미지정(-1)은 수동 전용이라 손대지 않는다.
  //  ⚠ 2.90(감사 지적): 정리는 모드가 바뀌어 «물려받은 직후 1회»만 — 그룹 소진(마지막 컨 완료로
  //    묶음이 목록에서 빠진 것)을 이탈로 오판해 «끝났습니다 — 다음 …» 안내를 지우지 않게 한다.
  const _snapArmedRef = useRef(true);
  useEffect(() => { _snapArmedRef.current = true; }, [guideMode]);
  useEffect(() => {
    if (guideMode || manualBay == null || manualBay < 0 || !manualGroups.length) return;
    if (!_snapArmedRef.current) return;
    _snapArmedRef.current = false;
    if (manualGroups.some((g) => g.center === manualBay)) return;
    const host = manualGroups.find((g) => g.bays && g.bays.has(parseInt(manualBay, 10)));
    setManualBay(host ? host.center : null);
  }, [guideMode, manualBay, manualGroups]);
  // 수동 작업 위치를 수석에게 전달 (가이드와 동일, auto=false). 베이/단 미선택이면 클리어.
  useEffect(() => {
    if (guideMode || !inspector) return;  // 가이드는 GuidedWorkPanel이 따로 기록
    if (manualBay == null || !manualTier) { fbSetInspectorActivity(inspector, voyageKey, workFilter).catch(() => {}); return; }
    const g = manualGroups.find(x => x.center === manualBay);
    const bays = g ? [...g.bays].sort((a, b) => a - b) : [manualBay];
    const bayLabel = g?.noBay ? '미지정' : (bays.length > 1 ? `${bays[0]}-${bays[bays.length - 1]}` : String(bays[0]).padStart(2, '0'));
    const remain = g?.noBay ? (g.count || 0) : (manualTier === 'deck' ? (g?.deck || 0) : (g?.hold || 0));
    // TallyOne 1.55: 갱(호기)을 같이 보낸다 — 종전엔 빈 문자열이라 수석 화면에서 어느 갱인지 알 수 없었다.
    fbSetInspectorActivity(inspector, voyageKey, workFilter, { equip: equipNo || '', bayLabel, tier: manualTier, remain, auto: false }).catch(() => {});
  }, [guideMode, inspector, voyageKey, workFilter, manualBay, manualTier, manualGroups, equipNo]);
  // 1.26: shipLib(본선 구조·실적)을 ctx 로 내려보낸다 — "몇 대까지 싣나" 답변 근거.
  const manualCtx = { mode: workFilter, bayPairs: manualBayPairs, selectedGroup: manualBay, selectedTier: manualTier, shipLib,
    pier: voyage?.info?.pier || '',   // 1.68: ETA가 터미널 근무시간표(중식·야식 제외)로 계산하도록
    gangs: voyage?.info?.gangs,
    //  3.6-01: 페이스 분모는 «접안~이안 실작업 시간»이다 — 그 시각과 항차 전체 완료를 같이 내린다.
    //  ⚠ 하나씩 고르지 말고 **항차 info 를 통째로** 싣는다 — 고르면 반드시 빠뜨린다(감사 두 번).
    //  ★ 3.24 — 거기에 **검수 시작·완료(작업 보고)** 두 칸을 얹는다. 검수사 «작업 시작 시간은 검수 시작이 시작입니다».
    //    `reports` 는 info 밖에 있어 통째로 실어도 안 따라온다 — 그래서 여기서 뽑아 붙인다(§4-4 판정 한 벌).
    info: { ...(voyage?.info || {}), ...voyageReportSpan(voyage) },
    voyageDoneAts: voyageDoneAts(voyage) };   // 3.6: 페이스 문지기가 갱 수를 봐야 상한이 맞다 — 종전 ctx.info.gangs 는 아무도 안 넣던 죽은 값이었다(감사 지적)

  return (
    <div className="space-y-3">
      {askMode && (
        <div className="bg-ink-900 border border-amber-700/40 rounded-pill p-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs2 font-bold text-amber-300">💬 질문 답변</span>
            <button onClick={() => setAskMode(false)} className="text-xs2 text-dim-300 px-2 py-1 rounded hover:bg-ink-750">✕ 닫고 작업으로</button>
          </div>
          <SingleSearch onOpenPlan={onOpenPlan} rfSkip={rfSkip} esealBrief={esealBrief} voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={allContainers} workFilter={workFilter} onOpenContainer={onOpenContainer} portMisData={portMisData} pilotForecast={pilotForecast} diagAlerts={diagAlerts} manualCtx={null} terminalWork={terminalWork} relayQuery={relayQuery} />
        </div>
      )}

      {/* ★ 1.84 (검수사 확정 2026-08-19): **지금 모드 것만 크게.** 종전엔 양하·선적 카드가 나란히 서서
          *"잘못해서 선적인데 양하를 누르고 안된다고 할 수 있죠"* — 선택지가 아닌 것을 선택지처럼 보였다.
          모드 전환은 화면 위 양하/선적 토글이 맡는다(검수사: *"따로 선적/양하 모드 변경탭은 필요합니다"* — 이미 있음).
          완료 보기는 작은 칸으로 유지. pickWorkFilter·setWorkFilter 배선은 그대로(표시만 줄임). */}
      <div className="bg-ink-900 border border-line rounded-pill p-1.5 flex gap-1 items-stretch">
        {workFilter !== 'completed' ? (
          <div className={`flex-[3] py-2.5 rounded text-center font-bold ${
            workFilter === 'loading' ? 'bg-sky-800/70 text-sky-100' : 'bg-rose-800/70 text-rose-100'
          }`}>
            <span className="text-[14px]">{workFilter === 'loading' ? '⬆ 선적 시작' : '⬇ 양하 시작'}</span>
            <span className="block text-xxs opacity-80">대기 {workFilter === 'loading' ? loadCount : dischCount}대</span>
          </div>
        ) : (
          <button onClick={() => pickWorkFilter(mode === 'loading' ? 'loading' : 'discharge')}
            className="flex-[3] py-2.5 rounded text-center font-bold bg-ink-800 text-dim-200 text-sm2">
            ← {mode === 'loading' ? '선적' : '양하'} 작업으로 돌아가기
          </button>
        )}
        <button onClick={() => setWorkFilter(workFilter === 'completed' ? (mode === 'loading' ? 'loading' : 'discharge') : 'completed')}
          className={`flex-1 py-2 rounded text-xxs font-bold flex flex-col items-center justify-center ${
            workFilter === 'completed' ? 'bg-emerald-700 text-emerald-100' : 'text-dim-300 hover:bg-ink-750'
          }`}>
          <span>✓ 완료</span>
          <span className="text-2xs opacity-80">{completedCount}대</span>
        </button>
      </div>
      {/* V7.99-16 / V8.04: 양하 — 신고 리스트에 없는데 내려진 컨(초과) 기록 (모달) */}
      {workFilter === 'discharge' && (
        <button
          onClick={() => {
            if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
            setExtraModalOpen(true);
          }}
          className="w-full mt-1.5 py-2 rounded-pill font-bold text-xs bg-ink-900 hover:bg-amber-900 text-amber-300 border border-amber-800 flex items-center justify-center gap-1.5">
          ➕ 초과 컨 추가 (리스트에 없는데 내려진 컨)
        </button>
      )}
      {/* V8.04: 초과분 별도 집계·제출 (검수리스트처럼) + 잘못 넣은 것 삭제 */}
      {workFilter === 'discharge' && extraList.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-700/50 rounded-pill p-2.5 mt-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-300">초과분 {extraList.length}건 (신고 대상)</span>
            <button onClick={() => {
              const lines = ['번호,규격,적공,타입,온도,실번호,데미지,메모,기록자'];
              extraList.forEach(c => {
                lines.push([c.cn, c._extraSize || '', c.fe || '', c._extraType || '', c.tmp || '', c.sl || '', c._extraDamage || '', (c.note || '').replace(/,/g, ' '), c._comp?.by || ''].join(','));
              });
              const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `초과분리스트_${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
              className="text-2xs px-2 py-0.5 rounded border border-amber-600 bg-amber-900/40 text-amber-200 hover:bg-amber-800/60 font-bold">
              📥 초과분 내보내기 (CSV)
            </button>
          </div>
          <div className="space-y-1">
            {extraList.map(c => (
              <div key={c.cn} className="flex items-center gap-2 text-xxs bg-ink-900/60 rounded px-2 py-1">
                <span className="mono font-bold text-amber-300 flex-1 truncate">{c.cn}</span>
                <span className="text-dim-300">{c._extraSize} · {c.fe} · {c._extraType}</span>
                {c.tmp && <span className="text-cyan-300">❄{c.tmp}°</span>}
                {c._extraDamage && c._extraDamage !== '없음' && <span className="text-orange-400" title={c._extraDamage}>⚠</span>}
                <button onClick={async () => {
                  if (!window.confirm(`초과 기록 삭제: ${c.cn}\n잘못 기록한 경우만 삭제하세요.`)) return;
                  try { await fbRemoveExtraContainer(voyageKey, 'discharge', c.cn); }
                  catch (e) { alert('삭제 실패: 신호를 확인하세요.'); }
                }}
                  className="text-red-400 hover:text-red-200 px-1" title="삭제">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {workFilter !== 'completed' && !isLoloShip && (
        <div className={`rounded-pill p-1.5 flex gap-1 border-2 ${guideMode ? 'bg-violet-950/60 border-violet-600' : 'bg-amber-950/40 border-amber-700'}`}>
          <button onClick={() => setGuideMode(true)}
            className={`flex-1 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 ${
              guideMode ? 'bg-violet-600 text-white shadow-lg' : 'text-dim-300 hover:bg-ink-750'
            }`}>
            🤖 자동 가이드
          </button>
          <button onClick={() => setGuideMode(false)}
            className={`flex-1 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 ${
              !guideMode ? 'bg-amber-600 text-white shadow-lg' : 'text-dim-300 hover:bg-ink-750'
            }`}>
            ✋ 수동
          </button>
        </div>
      )}
      {guideMode && workFilter !== 'completed' && (
        <div className="text-center text-xxs font-bold text-violet-300 -mt-1">
          자동 가이드 모드 — 앱이 다음 컨테이너를 순서대로 제시합니다
        </div>
      )}

      {guideMode && workFilter !== 'completed' && !isLoloShip ? (
        <GuidedWorkPanel
          slotGroups={manualGroups}
          workCtx={{ bay: manualBay, tier: manualTier, setBay: setManualBay, setTier: setManualTier }}
          onPlaceUnassigned={onPlaceUnassigned}
          onOpenPlan={onOpenPlan}
          voyage={voyage} voyageKey={voyageKey} inspector={inspector}
          allContainers={allContainers} workFilter={workFilter}
          onSwitchManual={() => setGuideMode(false)}
          onOpenContainer={onOpenContainer}
        />
      ) : (
      <>
      {/* V7.99-10 (메모6 수동): 베이→홀드/데크 선택 게이트 (A안). 완료 탭은 게이트 없이 자유 조회. */}
      {/* V8.11: RORO/LOLO 혼용선(RZOR 등)은 셀 좌표가 없으므로 게이트를 건너뛰고 바로 조회창으로. 베이만 못 알려줄 뿐 실번호·규격·F/E·온도·XRAY는 정상 조회. */}
      {workFilter !== 'completed' && !noWorkLeft && manualBay == null && !isLoloShip ? (
        <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-2">
          <div className="text-sm font-bold text-amber-300">작업할 베이를 선택하세요 <span className="text-xxs text-dim-400 font-normal">(수동)</span></div>
          {manualGroups.length === 0 && <div className="text-xs text-dim-400 text-center py-4">남은 {workFilter === 'discharge' ? '양하' : '선적'} 작업이 없습니다.</div>}
          <div className="grid grid-cols-3 gap-2">
            {manualGroups.map(g => g.noBay ? (
              <button key="nobay" onClick={() => { setManualBay(g.center); setManualTier('none'); }}
                className="py-3 rounded-pill bg-amber-950/60 hover:bg-amber-800 border border-amber-600 text-amber-100 col-span-3">
                {/* 2.94-02: 창고 문구 마지막 한 곳 — 검수앱은 창고를 안 쓴다(검수사 지적 2026-08-31). */}
                <div className="font-bold text-base">⚠ 자리 없음{g.displaced ? '·계획 자리 내줌' : ''}</div>
                <div className="text-2xs text-amber-300">남은 {g.count}대{g.displaced ? ` (계획 자리 내줌 ${g.displaced} — 그 칸에 다른 컨이 실렸습니다. 아직 안 실렸으니 빈 칸을 골라 자리를 정해 주세요)` : ' — 리스트엔 있는데 실을 자리가 아직 없습니다'}</div>
                <div className="text-2xs text-dim-300 mt-0.5">눌러서 목록 → 🅿 베이 빈자리에 배치</div>
                {g.swapHints && g.swapHints.length > 0 && (
                  <div className="mt-1 text-left text-2xs text-emerald-300 mono">
                    {g.swapHints.slice(0, 6).map(h => (
                      <div key={h.l4}>🔁 {h.l4} → {h.to} (그 칸을 채운 {h.taker}의 계획 자리)</div>
                    ))}
                    {g.swapHints.length > 6 && <div>… 외 {g.swapHints.length - 6}건</div>}
                  </div>
                )}
              </button>
            ) : (
              <button key={g.center} onClick={() => setManualBay(g.center)}
                className="py-3 rounded-pill bg-ink-800 hover:bg-amber-800 border border-line text-dim-100">
                <div className="font-bold text-base">B{[...g.bays].sort((a, b) => a - b).join('·')}</div>
                <div className="text-2xs text-dim-300">
                  {g.count > 0 ? `빈 칸 ${g.count} · ` : ''}남은 컨 {g.contLeft || 0}대
                </div>
                {/* 2.88-01: 계획 칸이 없는 베이(시프팅으로 다시 싣는 자리 등)는 «남은 컨» 축으로 보여준다 */}
                <div className="flex items-center justify-center gap-1.5 mt-0.5 text-2xs font-bold">
                  {(g.count > 0 ? g.deck : (g.contDeck || 0)) > 0 && <span className="text-sky-300">데크 {g.count > 0 ? g.deck : g.contDeck}</span>}
                  {(g.count > 0 ? g.deck : (g.contDeck || 0)) > 0 && (g.count > 0 ? g.hold : (g.contHold || 0)) > 0 && <span className="text-dim-500">·</span>}
                  {(g.count > 0 ? g.hold : (g.contHold || 0)) > 0 && <span className="text-amber-300">홀드 {g.count > 0 ? g.hold : g.contHold}</span>}
                </div>
                {g.count === 0 && <div className="text-2xs text-amber-400 mt-0.5">계획 칸 없음 — 실체 자리로 배치</div>}
              </button>
            ))}
          </div>
        </div>
      ) : workFilter !== 'completed' && !noWorkLeft && manualTier == null && !isLoloShip ? (
        (() => {
          const g = manualGroups.find(x => x.center === manualBay);
          const bayLbl = g ? `B${[...g.bays].sort((a, b) => a - b).join('·')}` : `B${manualBay}`;
          return (
            <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setManualBay(null)} className="text-xs text-dim-300 hover:text-amber-300">‹ 베이</button>
                <div className="text-sm font-bold text-amber-300">{bayLbl} — 작업할 단을 선택하세요</div>
              </div>
              {/* ★ 2.89-02 (검수사 실물 «B38 데크 0·홀드 0» — 카드는 데크 16인데 열면 0) —
                    베이 카드(2.88-01)는 빈 칸이 0이면 «남은 컨» 축으로 보여주는데 **이 화면만 빈 칸 축**이라
                    시프팅 재선적분(계획 칸 없음)이 0으로 잠겼다. 같은 규칙으로 폴백한다 — 축은 섞지 않는다. */}
              {(() => {
                const dkPlan = g ? g.deck : 0, hdPlan = g ? g.hold : 0;
                const dk = tierLeftOf(g, 'deck');   // 2.93: 갈 컨이 0인 단은 0
                const hd = tierLeftOf(g, 'hold');
                const dk20 = dkPlan > 0 ? g.deck20 : (g?.contDeck20 || 0), dk40 = dkPlan > 0 ? g.deck40 : (g?.contDeck40 || 0);
                const hd20 = hdPlan > 0 ? g.hold20 : (g?.contHold20 || 0), hd40 = hdPlan > 0 ? g.hold40 : (g?.contHold40 || 0);
                return (<>
              <button disabled={dk === 0} onClick={() => setManualTier('deck')}
                className={`w-full py-4 rounded-pill border text-left px-4 ${dk === 0 ? 'bg-ink-800/40 border-line text-dim-500' : 'bg-sky-950/40 border-sky-700 hover:bg-sky-900/50 text-sky-100'}`}>
                <div className="flex items-center justify-between"><span className="font-bold text-base">🔵 데크 {dk}개</span><span className="text-xs mono text-sky-300">20FT:{dk20} / 40FT:{dk40}</span></div>
                {dkPlan === 0 && dk > 0 && <div className="text-2xs text-amber-400 mt-0.5">계획 칸 없음 — 남은 컨 축 · 실체 자리로 배치</div>}
              </button>
              <button disabled={hd === 0} onClick={() => setManualTier('hold')}
                className={`w-full py-4 rounded-pill border text-left px-4 ${hd === 0 ? 'bg-ink-800/40 border-line text-dim-500' : 'bg-amber-950/40 border-amber-700 hover:bg-amber-900/50 text-amber-100'}`}>
                <div className="flex items-center justify-between"><span className="font-bold text-base">🟠 홀드 {hd}개</span><span className="text-xs mono text-amber-300">20FT:{hd20} / 40FT:{hd40}</span></div>
                {hdPlan === 0 && hd > 0 && <div className="text-2xs text-amber-400 mt-0.5">계획 칸 없음 — 남은 컨 축 · 실체 자리로 배치</div>}
              </button>
                </>);
              })()}
            </div>
          );
        })()
      ) : (
      <>
      {/* TallyOne 1.53: 잔여 0대 — 작업은 끝났지만 조회는 계속 된다는 것을 알린다. */}
      {noWorkLeft && (
        <div className="bg-emerald-950/40 border border-emerald-700 rounded-pill px-3 py-2 text-xxs text-emerald-200 font-bold">
          ✅ 남은 {workFilter === 'discharge' ? '양하' : '선적'} 작업이 없습니다 — 조회·검색은 그대로 됩니다. 끝 4자리를 넣어 보세요.
        </div>
      )}
      {/* V8.11: RORO/LOLO 혼용선 안내 — 베이(위치)만 없고 나머지 정보는 정상 조회됨을 알림. */}
      {isLoloShip && (
        <div className="bg-teal-950/50 border border-teal-700 rounded-pill px-3 py-2 text-xxs text-teal-200">
          🚢 RORO/LOLO 혼용선 — 끝 4자리로 조회하세요. 덱플랜이 올라오면 <b className="text-lime-300">자리(D덱 3줄 5칸)</b>와 <b className="text-lime-300">🏗갠트리 대상</b>까지 함께 나옵니다.
        </div>
      )}
      {workFilter !== 'completed' && manualBay != null && manualTier && (() => {
        const g = manualGroups.find(x => x.center === manualBay);
        const noBay = !!g?.noBay;
        const bayLbl = noBay ? '자리 없음' : (g ? [...g.bays].sort((a, b) => a - b).join('·') : String(manualBay));
        // V8.09-17 (메모5): 수동도 자동 가이드처럼 진행상태(잔여 N대)를 보이게. 현재 단의 미완료 잔여.
        const remain = tierLeftOf(g, manualTier);   // 2.93: 빈 칸 ∩ 남은 컨 (한 곳에서 센다)
        return (
          <div className="flex items-center gap-2 text-xxs bg-ink-900 border border-line rounded-pill px-3 py-1.5">
            <span className="font-bold text-amber-300">📍 {noBay ? '⚠ 자리 없는 컨 작업 중' : `${bayLbl}번 ${manualTier === 'hold' ? '홀드' : '데크'} 작업 중`}</span>
            {/* TallyOne 1.50: **싱글이 먼저다.** 검수사 확정 2026-08-11 —
                *"그자리는 수동모드에서 싱글로 선적을 한후에 트윈으로 가서 선적 하여야 합니다."*
                *"1단은 넣어도 되지만 스프레더를 두번을 더 바꿔야 합니다."*
                규칙은 guidedQueue.js(V8.09-03, 2026-06-17 확정)에 이미 있었는데 **수동에는 없었다.**
                그래서 클로드가 트윈부터 가려 했고 검수사가 말려야 했다. 짝 없는 자리를 세어 먼저 알린다. */}
            {!noBay && manualTier === 'hold' && workFilter === 'loading' && (() => {
              const gg = manualGroups.find(x => x.center === manualBay);
              if (!gg) return null;
              const bays = [...gg.bays];
              const key = (b, r, t) => `${parseInt(b, 10)}-${r}-${t}`;
              const spots = new Set();
              allContainers.forEach(x => {
                if (x._mode !== workFilter || !x._ptk || !x.bay || !x.row || !x.tier) return;
                if (parseInt(x.tier, 10) >= 80) return;
                if (!bays.includes(parseInt(x.bay, 10))) return;
                spots.add(key(x.bay, x.row, x.tier));
              });
              // 짝 없는 자리 = 짝꿍 베이의 같은 열·단에 자리가 아예 없는 곳
              let n = 0;
              allContainers.forEach(x => {
                if (x._mode !== workFilter || !x._ptk || x._comp || !x.bay || !x.row || !x.tier) return;
                if (parseInt(x.tier, 10) >= 80) return;
                if (!bays.includes(parseInt(x.bay, 10))) return;
                const pb = manualBayPairs?.[String(parseInt(x.bay, 10))];
                if (!pb) return;
                if (!spots.has(key(pb, x.row, x.tier))) n++;
              });
              if (!n) return null;
              return <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-800 text-rose-100 font-black text-2xs">✋ 싱글 먼저 {n}대 — 짝 없는 자리</span>;
            })()}
            <span className="font-black text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded px-1.5 py-0.5">잔여 {remain}대</span>
            <button onClick={() => { setManualTier(null); }} className="text-dim-300 hover:text-amber-300">단 변경</button>
            <button onClick={() => { setManualBay(null); setManualTier(null); }} className="text-dim-300 hover:text-amber-300">베이 변경</button>
          </div>
        );
      })()}
      {/* ── TallyOne 1.55: **한 베이·단을 끝내면 다음으로 안내한다.** ──
          검수사 지적 2026-08-12(DXQD 2631W 335대 실작업) — *"한 홀드를 끝냈음에도 조회창이 그대로임."*
          끝났다고 말해 주지 않으면 검수원은 **뭘 빠뜨렸나 다시 센다.** 끝났다고 말하고 갈 곳을 준다.
          ⚠ 잔여가 진짜로 0이 되는 것은 칸 기준 계산(위 slotsByBay·manualGroups)이 맞아야 가능하다 —
            같은 판에서 함께 고쳤다. */}
      {workFilter !== 'completed' && !noWorkLeft && manualBay != null && manualTier && (() => {
        const g = manualGroups.find(x => x.center === manualBay);
        const noBay = !!g?.noBay;
        const left = tierLeftOf(g, manualTier);   // 2.93
        if (left > 0) return null;
        // 같은 베이의 다른 단이 남았으면 그쪽을 먼저 권한다(스프레더를 덜 바꾼다).
        const otherTier = manualTier === 'hold' ? 'deck' : 'hold';
        const otherLeft = noBay ? 0 : tierLeftOf(g, otherTier);   // 2.93
        const nextG = manualGroups.find(x => x.center !== manualBay && !x.noBay && x.count > 0)
                   || manualGroups.find(x => x.center !== manualBay && x.count > 0);
        const lbl = (x) => (x.noBay ? '자리 없음' : `B${[...x.bays].sort((a, b) => a - b).join('·')}`);
        const hereLbl = g ? lbl(g) : `B${manualBay}`;
        return (
          <div className="bg-emerald-950/50 border-2 border-emerald-600 rounded-pill p-3 space-y-2">
            <div className="text-sm font-black text-emerald-200">
              ✅ {hereLbl}{noBay ? '' : ` ${manualTier === 'hold' ? '홀드' : '데크'}`} 끝났습니다 — 남은 작업 0대
            </div>
            {otherLeft > 0 && (
              <button onClick={() => setManualTier(otherTier)}
                className="w-full py-2.5 rounded-pill font-bold text-sm bg-sky-700 hover:bg-sky-600 text-sky-50">
                같은 베이 {otherTier === 'hold' ? '홀드' : '데크'} {otherLeft}대 남았습니다 — 이어서 →
              </button>
            )}
            {nextG && (
              <button onClick={() => { setManualBay(nextG.center); setManualTier(nextG.noBay ? 'none' : null); }}
                className="w-full py-3 rounded-pill font-black text-base bg-emerald-600 hover:bg-emerald-500 text-white">
                다음 {lbl(nextG)} 로 → <span className="text-xxs font-bold opacity-90">(남은 {nextG.count}대)</span>
              </button>
            )}
            <button onClick={() => { setManualBay(null); setManualTier(null); }}
              className="w-full py-2 rounded-pill text-xxs bg-ink-800 hover:bg-ink-750 border border-line text-dim-200">
              베이 목록으로
            </button>
          </div>
        );
      })()}
      {/* V9.28: 미배정 = 빈자리가 있다는 뜻 — 검수원이 베이 탭 빈 칸을 골라 직접 배치한다 (사용자 확정) */}
      {/* ── TallyOne 1.54: **「자리 미지정」과 「창고」는 다른 상태다.** (검수사 확정 2026-08-12) ──
          원문 — *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
          계획 자리를 남에게 내준 컨은 이제 **계획을 그대로 둔 채 몸만** 창고로 간다(`bay_actual==='__STG__'`).
          종전 이 목록은 `!c.bay` 만 봤다 — 창고 컨은 계획이 살아 있어 여기 아예 안 뜨고,
          베이 탭 보관함까지 가야만 보였다. 선적대상에서 **빠져 버린다.**
          → 창고 컨도 여기 세우되 **미배정과 섞지 않는다.** 이름 걸린 자리를 그대로 적어 준다. */}
      {workFilter !== 'completed' && manualBay != null && manualGroups.find(x => x.center === manualBay)?.noBay && onPlaceUnassigned && (
        <div className="bg-ink-900 border border-amber-800/60 rounded-pill p-2 space-y-1">
          <div className="text-xxs text-amber-300 font-bold">🅿 배치 — 누르면 베이 화면으로 가서 빈 칸(📦+)을 고릅니다</div>
          {/* 2.93/2.94-01: 창고 대신 «계획 자리를 내줬다»(`planTaken`)를 본다 — 검수앱은 창고를 쓰지 않는다.
              옛 표식(`__STG__`)이 남은 자료도 같이 잡아 같은 말을 한다(검수사 지적 2026-08-31). */}
          {allContainers.filter(c => c._mode === workFilter && !c._comp && (!c.bay || c.bay_actual === '__STG__' || c.planTaken)).map(c => (
            <div key={c.cn} className="flex items-center gap-1.5">
              <button onClick={() => onOpenContainer?.(c)} className="flex-1 text-left bg-ink-800 rounded px-2 py-1.5 text-xs mono font-bold text-dim-100">
                {c.cn} <span className="text-2xs text-dim-300 font-normal">{isoToLabel(c.iso) || c.tp || ''} {c.fe || ''}</span>
                {(c.planTaken || c.bay_actual === '__STG__')
                  ? (() => {
                      const from = c.planTaken?.from
                        || (c.bay && c.row && c.tier ? `${String(parseInt(c.bay, 10)).padStart(2, '0')}-${c.row}-${c.tier}` : '');
                      return (
                        <span className="ml-1 text-2xs font-bold text-sky-300">
                          🏷 계획 자리를 내줬습니다{from ? ` (${from}${c.planTaken?.byCn ? ` → ${c.planTaken.byCn}` : ''})` : ''}
                        </span>
                      );
                    })()
                  : <span className="ml-1 text-2xs font-bold text-orange-300">자리 없음</span>}
              </button>
              {/* V9.51: 원래 계획 자리가 남아 있으면 한 번에 되돌린다 (빈 칸을 다시 찾을 필요 없음) */}
              <RestoreOrigButton c={c} allContainers={allContainers} voyageKey={voyageKey}
                inspector={inspector} mode={workFilter} compact />
              <button onClick={() => onPlaceUnassigned(c)}
                className="px-3 py-1.5 rounded bg-lime-800 hover:bg-lime-700 border border-lime-600 text-lime-100 text-xs font-black">🅿 배치</button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-ink-900 border border-line rounded-pill p-1.5 flex gap-1">
        <button onClick={() => setSearchMode('single')}
          className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 ${
            searchMode === 'single' ? 'bg-amber-700 text-amber-100' : 'text-dim-300 hover:bg-ink-750'
          }`}>
          <Truck className="w-4 h-4"/>싱글 🎤
        </button>
        <button onClick={() => setSearchMode('twin')}
          className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 ${
            searchMode === 'twin' ? 'bg-blue-700 text-blue-100' : 'text-dim-300 hover:bg-ink-750'
          }`}>
          <Truck className="w-4 h-4"/><Truck className="w-4 h-4"/>트윈
        </button>
      </div>

      {searchMode === 'single'
        ? <SingleSearch onOpenPlan={onOpenPlan} rfSkip={rfSkip} esealBrief={esealBrief} voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={allContainers} workFilter={workFilter} onOpenContainer={onOpenContainer} portMisData={portMisData} pilotForecast={pilotForecast} diagAlerts={diagAlerts} manualCtx={manualCtx} terminalWork={terminalWork} />
        : (workFilter === 'loading' && loadTwinMode === 'manual')
          /* V9.49: 위치 지정 방식(PCTC식 두 조회창) — 실제 자리가 플랜과 다를 때만 쓴다 */
          ? <ManualTwinLoad voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={allContainers} onOpenContainer={onOpenContainer}
              onBackToAuto={() => setLoadTwinMode('auto')}/>
          /* V9.49: 선적 트윈도 **양하와 같은 화면**으로. 실번호(SEAL NO)를 보고 확인해야 하는데
             종전 선적 화면은 끝4자리 두 칸뿐이라 실번호를 볼 수가 없었다(사용자 지적 2026-08-03).
             BigResultCard 는 이미 선적을 완전히 지원한다 — 화면을 새로 만들 필요가 없었다. */
          : <TwinSearch voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={filteredContainers} workFilter={workFilter} onOpenContainer={onOpenContainer}
              /* TallyOne 1.48: 검수원이 이미 고른 작업 구역·단을 위치 지정 모달까지 내린다. */
              workGroup={manualBay} workTier={manualTier} slotSource={allContainers} bayPairsIn={manualBayPairs}
              onManualMode={workFilter === 'loading' ? () => setLoadTwinMode('manual') : null}/>}
      </>
      )}
      </>
      )}
      <ExtraContainerModal
        open={extraModalOpen}
        mode="discharge"
        onClose={() => setExtraModalOpen(false)}
        onSave={async ({ cn, info }) => {
          // 1.56: 초과 컨도 완료 기록이다 — 갱 없이 기록 금지 + equip 동봉(유일하게 빠져 있던 쓰기 경로).
          if (!getEquipNumber()) { alert('갱(호기)을 먼저 선택하세요 — 상단 호기 버튼.'); return; }
          await fbAddExtraContainer(voyageKey, 'discharge', cn, inspector, info, getEquipNumber());
        }}
      />
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

// TallyOne 1.53: **싱글로 하려 할 때 트윈이 되는지 먼저 알린다 — 막지는 않는다.**
//   검수사 원문 2026-08-12 — *"일반 사용자가 싱글로 작업을 하려고 했을 때 경고를 했을 것입니다.
//   트윈 가능 작업이 가능합니다. 싱글 작업을 계속하실 건가요?"*
//   *"다만 특수한 상황엔 싱글 작업을 할 수 있습니다. 무겁다 · 포트가 틀리다 · 규격이 틀리다."*
//   그래서 강제 모달로 흐름을 끊지 않고 한 줄로 띄우고, 다른 항목(무게·목적지·규격)을 눈에 띄게 한다.
//   판정은 새로 만들지 않는다 — 「✋ 싱글 먼저」 배지와 트윈 화면이 쓰는 findTwinCandidate 그 벌을 그대로 쓰고,
//   위치는 effectivePos 하나로 본다(계획 자리와 실체 자리가 갈리면 안내가 엉뚱한 자리를 가리킨다).
function twinHintOf(c, allContainers, shipImo, shipName) {
  if (!c || c._comp || c._mode !== 'loading') return null;
  const p = effectivePos(c);
  if (!p.bay || !p.row || !p.tier) return null;
  const mate = findTwinCandidate({ ...c, bay: p.bay, row: p.row, tier: p.tier }, allContainers, new Set(), shipImo, shipName);
  if (!mate || mate._comp) return null;   // 짝 자리가 비었거나 이미 실었으면 트윈이 아니다.
  const mp = effectivePos(mate);
  const pos = mp.bay ? `${String(parseInt(mp.bay, 10)).padStart(2, '0')}-${mp.row}-${mp.tier}` : '자리 없음';
  const samePod = String(c.pod || '') === String(mate.pod || '');
  const sameIso = isoToLabel(c.iso) === isoToLabel(mate.iso);
  return {
    mate, pos, samePod, sameIso,
    l4: mate.l4 || String(mate.cn || '').slice(-4),
    wt: formatWt(mate.wt),
    podText: samePod ? '목적지 같음' : `목적지 다름 (이 컨 ${c.pod || '-'} · 짝 ${mate.pod || '-'})`,
    isoText: sameIso ? '규격 같음' : `규격 다름 (이 컨 ${isoToLabel(c.iso) || '-'} · 짝 ${isoToLabel(mate.iso) || '-'})`,
  };
}

function TwinPossibleHint({ c, allContainers, voyage }) {
  const h = useMemo(() => twinHintOf(c, allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || ''),
                    [c, allContainers, voyage]);
  if (!h) return null;
  const warn = 'text-amber-300 font-black';
  return (
    <div className="bg-sky-950/60 border border-sky-600 rounded-pill px-3 py-2 mb-1 text-xs2 text-sky-100 font-bold leading-snug">
      <Link2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/>
      짝 자리 {h.pos} 에 {h.l4} 가 있습니다. 트윈으로 두 대 한 번에 가능합니다.
      <div className="mt-0.5 font-normal text-xxs">
        (무게 {h.wt} · <span className={h.samePod ? '' : warn}>{h.podText}</span> · <span className={h.sameIso ? '' : warn}>{h.isoText}</span>)
      </div>
      <div className="mt-0.5 font-normal text-xxs text-dim-200">
        싱글로 계속해도 됩니다 — 무겁다 · 포트가 틀리다 · 규격이 틀리다면 싱글이 맞습니다. 트윈으로 할 거면 위 [트윈] 탭으로 가세요.
      </div>
    </div>
  );
}

// 1.69-05: HH:MM 표기 — «질문 접수»·«다시 확인했습니다» 공용
const _hm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

function SingleSearch({ onOpenPlan, voyage, voyageKey, inspector, allContainers, workFilter = 'discharge', onOpenContainer, portMisData = {}, pilotForecast = {}, diagAlerts = [], manualCtx = null, terminalWork = {}, relayQuery = '', rfSkip = false, esealBrief = null }) {   // 1.98: rfSkip·esealBrief — 부모 prop인데 여기서 참조해 «rfSkip is not defined» 전체 크래시(검수사 실측)   // V7.92 / V7.99-10 manualCtx / 1.22 pilotForecast / 1.23 diagAlerts
  const [query, setQuery] = useState('');
  // TallyOne 1.22: **문장은 다 쓴 뒤에 답한다** (검수사 메모 2026-08-07 —
  //   "숫자가 아닌 텍스트가 입력이 될때는 대기 하고 전송키로 전송을 누르면 질문에 답을 해주게").
  //   종전엔 글자마다 즉답을 만들어 "…컨테이너가 없습니다"가 타이핑 중에 튀어나왔다.
  //   ⚠ 숫자(끝 4자리)와 음성은 종전대로 즉답 — 현장 조회 속도를 늦추지 않는다.
  const [draft, setDraft] = useState('');
  // 1.84-01: 양하 탭 통합검색줄에서 문장이 넘어오면 음성 입력과 같은 규칙으로 즉시 답한다.
  const relayRef = useRef('');
  // 1.84-03 (검수사 확정 2026-08-19): 답변 속 «"실번호 점검"으로 상세 확인» 류 안내를 **버튼**으로.
  //   누르면 그 질문을 바로 제출해 상세를 보여주고, 「← 이전 답으로」 를 누르면 원래 답(브리핑)으로 돌아온다.
  const carrierContacts = useCarrierContacts();   // 1.89: 담당자 명부(1회 로드, 모듈 캐시)
  const shipSpeed = useShipSpeed();   // 1.92: 선박별 작업 속도
  // 1.91-02 (검수사 확정: 되묻고 기다린다 — 양하/선적 선택 시간을 주고, 답 없으면 둘 다):
  const [modeChoice, setModeChoice] = useState(null);   // null(되묻는 중)|'discharge'|'loading'|'both'
  useEffect(() => { setModeChoice(null); }, [query]);
  const [askStack, setAskStack] = useState([]);
  // 1.84-04: **모든 프로그램적 질문은 음성 입력과 같은 제출 경로를 탄다.**
  //   1.84-03 은 setDraft+setQuery 만 해서 askedAt·reasked·낭독 리셋이 빠졌고,
  //   «← 이전 답으로»가 브리핑을 못 되살렸다(검수사: "이전 화면으로 가지 않고 작업시작 화면으로").
  const askProgrammatic = (q) => {
    setReasked(q === lastAskRef.current);
    lastSpokenRef.current = null;
    setAskedAt(Date.now());
    setDraft(q); setQuery(q); logQuerySettled('nls', q, { voyageKey });
  };
  const followUp = (q) => {
    const cur = (draft || query || '').trim();
    if (cur) setAskStack(st => [...st, cur]);
    askProgrammatic(q);
  };
  const backAnswer = () => {
    const prev = askStack[askStack.length - 1];
    setAskStack(st => st.slice(0, -1));   // 부작용은 updater 밖에서 (StrictMode 이중 호출 안전)
    if (prev) askProgrammatic(prev);
  };
  useEffect(() => {
    const q = String(relayQuery || '').trim();
    if (!q || q === relayRef.current) return;
    relayRef.current = q;
    askProgrammatic(q);   // 1.84-04: 릴레이도 같은 제출 경로
  }, [relayQuery]);
  // TallyOne 1.55: 전체 컨번호(DWSU3000276)는 **문장이 아니다.**
  //   종전엔 글자가 섞였다는 이유로 문장으로 갈려, 다 치고 전송키를 누르기 전까지 아무것도 안 나왔다.
  const isSentence = (v) => isSentenceQuery(v);   // 2.55-01: 세 창이 같은 판정을 쓴다(utils 한 벌)
  // 1.69-05: 같은 질문 두 번 — 종전엔 setQuery(같은 문자열)가 무반응이었다(검수사 신고 2026-08-14
  //   "같은 질문 두 번 하면 반응 없음. 엔터 기능이 없어서 전달되었는지 모름").
  //   재제출이면 lastSpokenRef를 풀어 다시 말하고, 답 박스에 «다시 확인했습니다» 한 줄로 갱신을 보여준다.
  const submitDraft = () => {
    const v = draft.trim(); if (!v) return;
    setReasked(v === lastAskRef.current);
    lastSpokenRef.current = null;
    setAskedAt(Date.now());
    setQuery(v); logQuerySettled('nls', v, { voyageKey });
  };
  const [askedAt, setAskedAt] = useState(null);   // 1.69-05: 질문 접수 시각 — «질문 접수 HH:MM» + 재발화 트리거
  const [reasked, setReasked] = useState(false);  // 1.69-05: 같은 질문 재제출 표시
  const lastAskRef = useRef('');                  // 1.69-05: 직전 질문 — 재질문 판정
  const [weatherText, setWeatherText] = useState(null);   // V7.92: 날씨 질문 비동기 답변
  const voiceQueryRef = useRef('');   // V7.80: 음성으로 들어온 질문 추적
  const lastTopicRef = useRef(null);  // 1.69-01: 직전 답 주제 — "83건이 뭐야"류 후속 연결용(간단 캐시)
  const traceRef = useRef({});        // 3.42: 규칙이 어느 길에서 답했는지(mirAnswer _trace) — 약한 답 판정 재료
  const [modelState, setModelState] = useState({ q: '', pending: false, text: null, via: null });   // 3.42: 모델 답(번역→규칙 / 자료)
  const [showOthers, setShowOthers] = useState(false);  // V7.90: 반대 모드·완료분 접이식
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [handoverNote, setHandoverNote] = useState('');     // V8.00: 인계 되묻기 — 검수사 직접 메모
  const [handoverFinalized, setHandoverFinalized] = useState(false); // V8.00: 메모 반영 완료
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
  // TallyOne 2.41: 미르 — 선박 연락처(RTDB shipContacts). 물었을 때만 1회 GET하고 세션 캐시(GlobalSearchPage와 같은 방식).
  const [shipContacts, setShipContacts] = useState(undefined);   // undefined=아직 안 물음, null=읽는 중
  useEffect(() => {
    if (!parsed.contactQuery) return;
    if (shipContacts !== undefined) return;
    setShipContacts(null);
    fbGetSimple('shipContacts').then((v) => setShipContacts(v || {})).catch(() => setShipContacts({}));
  }, [parsed.contactQuery, shipContacts]);
  // 1.69-05: 방금 물은 질문 기억 — 같은 질문 재제출(엔터·전송·음성) 판정용
  useEffect(() => { if (query.trim().length >= 2) lastAskRef.current = query.trim(); }, [query]);
  // V8.00: 인계 질문이 아니게 되면 메모 상태 리셋 (다른 질문으로 넘어갈 때)
  useEffect(() => {
    if (!parsed.handoverQuery) { setHandoverFinalized(false); }
  }, [parsed.handoverQuery]);
  //  ★ V7.99-10 → 3.23: **지금 고른 베이·단인가** — 한 벌로 올린다.
  //    종전엔 `results` useMemo 안에 갇혀 «우선 정렬»에만 쓰였다. 3.23 이 큰 카드 판정에서도 같은 잣대를
  //    써야 해서 밖으로 뺀다(같은 판정이 두 벌이 되면 화면과 카드가 갈린다 — 규범 §4-4).
  //    ⚠ 베이·단을 아직 안 골랐으면 언제나 false — 그때는 종전대로 여럿을 나란히 보인다.
  const inManualTier = React.useCallback((c) => {
    if (!manualCtx || manualCtx.selectedGroup == null || !manualCtx.selectedTier) return false;
    if (manualCtx.selectedGroup === -1) return !c.bay;   // V9.23-08: 자리 미지정 묶음
    const bp = manualCtx.bayPairs || {};
    const gc = (bs) => { const b = parseInt(bs, 10); if (!Number.isFinite(b)) return null; if (b % 2 === 0) return b; const p = bp[String(b)]; return p ? (b + parseInt(p, 10)) / 2 * 2 - (b % 2 === 0 ? 0 : 1) : b - 1; };
    if (gc(c.bay) !== manualCtx.selectedGroup) return false;
    return manualCtx.selectedTier === 'deck' ? parseInt(c.tier, 10) >= 80 : parseInt(c.tier, 10) < 80;
  }, [manualCtx]);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    if (!hasAnyCondition(parsed)) return [];
    // V7.53: 전체 자료에서 검색하되 현재 작업 모드(미완료) 우선 정렬.
    //   (구) 탭 필터 데이터만 검색 → 완료·반대 모드 컨테이너는 "없습니다" — 있는 자료를 못 알려주던 원인.
    let r = applyNLFilter(allContainers, parsed);
    // TallyOne 1.55: 전체 컨번호(또는 숫자부)를 넣었으면 그 한 대로 좁힌다.
    //   applyNLFilter 는 끝 4자리로만 거른다 — 끝 4자리가 겹치는 배에서는 두 대가 함께 떴다.
    r = narrowByFullCn(r, query);
    // V7.92-02: 집계·조건 검색은 평택분만 (7.1) — 양하 탭 숫자와 챗봇 답이 달랐던 원인
    //   (allContainers는 EDI 전체 = 통과화물 포함). 단, 컨번호(digits) 단건 조회는 전체 유지
    //   — 통과화물을 스캔했을 때 "없습니다"가 아니라 찾아서 알려줘야 함 (V7.53 회귀 방지).
    if (!parsed.digits) r = r.filter(c => c._ptk);
    const rank = (c) => {
      if (parsed.digits && inManualTier(c)) return -1;  // 현재 단 최우선
      return c._comp ? 2 : (c._mode === workFilter ? 0 : 1);
    };
    return [...r].sort((a, b) => rank(a) - rank(b));
  }, [allContainers, query, parsed, workFilter, manualCtx, inManualTier]);

  // M3.2: 로컬 답변 (AI 의존 없이 즉답)
  // 베이/POL/POD/구역/무게합/위치 질문은 모두 여기서 처리
  // 단, 단순 컨번호 검색(digits만)이거나 결과가 단 1개면 BigResultCard 우선
  // 1.92-01: 되묻기 무응답 타이머 — ⚠ parsed·results 선언 **뒤**에 둔다(useEffect deps 는 렌더 중 즉시 평가,
  //   1.86-01 TDZ 크래시와 같은 유형이 1.91-02 에서 재발 — «작업시작 누르면 오류뜸» 검수사 실측).
  useEffect(() => {
    if (!(needsModeChoice(parsed, results) && modeChoice === null)) return undefined;
    const tm = setTimeout(() => setModeChoice('both'), 8000);   // 선택 시간 8초 — 답 없으면 둘 다
    return () => clearTimeout(tm);
  }, [parsed, results, modeChoice]);

  const _localAnswerRaw = useMemo(() => {
    if (!query || query.length < 2) return null;
    //  3.2-01: 플랜 명령이면 «열었어요» 한 줄 — 위 useEffect 가 연다. 셋째 쌍둥이(통합검색·양하탭과 한 벌, 감사 P2-2).
    {
      const _pc = onOpenPlan ? parseViewCommand(query) : null;
      if (_pc) {
        const _md = _pc.mode || workFilter;
        const _what = _pc.what === 'cargo' ? '카고플랜' : (_pc.bay != null ? `${_pc.bay}번 베이플랜` : '베이플랜');
        return `🗺 ${voyage?.info?.vsl || ''} ${_md === 'loading' ? '선적' : '양하'} ${_what}을 열었어요.`;
      }
    }
    /* ★ 3.41 — 답 고르기는 `mirAnswer.answerOne` **한 벌**이다(검수사 «미르를 하나로»). 종전 이 자리의 200여 줄(경고문·연락처·
         진행·실점검·기능·자료현황·인계·맛집·소개·입출항·도선·기상·시각·날씨·트윈·속도·전망·자료도착·브리핑·본체)은 전부 그리로 옮겼다.
         여기 남는 것은 **화면 결정** 둘뿐이다 — ① 끝네자리만 쳤으면 큰 카드(BigResultCard)가 답이다(문장 아님)
         ② 재료(ctx)를 싣는 일. 판정을 여기서 다시 세우지 않는다(§4-4). */
    const onlyDigits = parsed.digits && !parsed.entityAttr && !parsed.bay && !parsed.pol && !parsed.pod &&
                       !parsed.portAny && !parsed.zone && !parsed.dgClass && !parsed.un &&
                       !parsed.size && !parsed.fe && !parsed.type && !parsed.weightSum &&
                       !parsed.posQuery && !parsed.listQuery && !parsed.bayDistQuery && !parsed.isStat;
    if (onlyDigits) return null;
    traceRef.current = {};
    return answerOneRaw(query, {
      app: 'tally', smallTalkLast: true, execDevice: false, modeChoice, _trace: traceRef.current,
      voyageKey, voyage, info: (manualCtx && manualCtx.info) || voyage?.info || null, mode: workFilter,
      containers: allContainers, photos: voyage?.photos || null,
      shiftMap: shiftingMapForDisplay(voyageKey, voyage),   // V7.92-02 · 2.08-15: 확정 이적 0이면 허수 제외(한 벌)
      bayPairs: (manualCtx && manualCtx.bayPairs) || getBayPairs(allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || ''),
      rfSkip, esealBrief, terminalWork, portMisData, pilotForecast, weatherText, shipSpeed, carrierContacts, shipContacts, diagAlerts,
      inspector, isChief: _isChiefName(inspector), handover: { note: handoverNote, finalized: handoverFinalized }, lastTopic: lastTopicRef.current,
      manualCtx, selectedGroup: manualCtx?.selectedGroup, selectedTier: manualCtx?.selectedTier, shipLib: manualCtx?.shipLib || null,
      voyageDoneAts: (manualCtx && manualCtx.voyageDoneAts) || voyageDoneAts(voyage),
      computeTallyData, matchPortMis,   // 콘앱 번들을 무겁게 하지 않으려고 화면이 싣는 두 함수
    });
  }, [parsed, results, allContainers, query, workFilter, weatherText, portMisData, voyage, manualCtx, handoverNote, handoverFinalized, inspector, diagAlerts, terminalWork, carrierContacts, modeChoice, shipSpeed, shipContacts, onOpenPlan]);   // 2.41: 선박 연락처 · 3.2-01: onOpenPlan
  //  3.42: 모델이 «미르 말»로 바꾼 문장을 같은 재료로 규칙에 다시 돌린다(위 _localAnswerRaw 와 같은 ctx — 두 벌이 되면 안 된다).
  const _rulesFor = (cq) => answerOneRaw(cq, {
    app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: modeChoice === null ? 'both' : modeChoice,
    voyageKey, voyage, info: (manualCtx && manualCtx.info) || voyage?.info || null, mode: workFilter,
    containers: allContainers, photos: voyage?.photos || null,
    shiftMap: shiftingMapForDisplay(voyageKey, voyage),
    bayPairs: (manualCtx && manualCtx.bayPairs) || getBayPairs(allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || ''),
    rfSkip, esealBrief, terminalWork, portMisData, pilotForecast, weatherText, shipSpeed, carrierContacts, shipContacts, diagAlerts,
    inspector, isChief: _isChiefName(inspector), handover: { note: handoverNote, finalized: handoverFinalized }, lastTopic: lastTopicRef.current,
    manualCtx, selectedGroup: manualCtx?.selectedGroup, selectedTier: manualCtx?.selectedTier, shipLib: manualCtx?.shipLib || null,
    voyageDoneAts: (manualCtx && manualCtx.voyageDoneAts) || voyageDoneAts(voyage),
    computeTallyData, matchPortMis,
  });
  const _mirAnswer = useMemo(() => {   // 2.33: 말투 출구 한 겹 · 2.34: 기본 지식 결합 · 2.47: 미르의 눈
    const raw = mirTone(_localAnswerRaw);
    //  ★ 2.47 — **한 대를 묻는 말은 새 겹이 먼저 본다.** 못 보면 null 이라 옛 미르가 그대로 답한다.
    //    검수사 확정 «원본은 놔두고 사본을 이용하는것이 젤 좋다» — nlSearch·mirKnowledge 는 한 줄도 안 건드렸다.
    //    ⚠ 터져도 앱은 안 멈춘다. 다만 조용히 넘기지 않고 콘솔에 남긴다(3금지 ③).
    let eyes = null;
    try {
      //  🔴 2.48-01 — 여기는 **SingleSearch 안**이다. `manualBayPairs`·`shipLib` 은 부모(SearchPanel) 지역 변수라
      //    이 스코프에 없다. 2.48 이 그것을 그대로 참조해 **앱 전체 크래시**를 냈다(`manualBayPairs is not defined`).
      //    ⚠ 이 함수 머리에 **같은 사고가 이미 적혀 있었다** — «1.98: rfSkip·esealBrief — 부모 prop인데 여기서 참조해
      //      «rfSkip is not defined» 전체 크래시». 같은 자리에서 같은 실수를 반복했다.
      //    ⇒ 부모가 내려주는 `manualCtx` 안에 그 둘이 이미 들어 있다(SearchPanel:372). 그것을 쓴다.
      eyes = mirSee(query, { containers: allContainers, bayPairs: manualCtx?.bayPairs || {},
        info: voyage?.info || null, shipLib: manualCtx?.shipLib || null, mode: workFilter });
    }
    catch (e) { console.warn('[미르의 눈] 실패 — 옛 미르로 넘깁니다:', e); }
    if (eyes) return eyes;
    //  ★ 2.57: 뜻 갈래(asking=def)는 본체(_localAnswerCore)가 이미 지식으로 답했다 — 여기서 또 붙이면 두 번 나온다.
    const know = (parsed && parsed.asking) ? null : mirKnowledge(query);   /* 2.59-01: def 만 거르니 how 가 새서 본체 답과 겹으로 두 번 나왔다(라이브 실측) — asking 갈래(def·how)는 본체가 답하므로 겹은 물러난다 */
    if (know && raw && raw !== know && mirTone(know) !== raw) return know + '\n\n────────\n' + raw;   // 3.41: 한 벌 엔진이 지식으로 답한 것을 또 붙이지 않는다
    return know || raw;
  }, [_localAnswerRaw, query, allContainers, manualCtx, voyage, workFilter, parsed]);
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
    const key = String(query || '').trim() + '|' + JSON.stringify(cmd);
    if (devRanRef.current === key) return;
    devRanRef.current = key;
    let msg = null;
    try { msg = runDeviceCmd(cmd); }
    catch (e) { console.warn('[미르 조작] 실패', e); msg = '그건 지금 바꾸지 못했어요.'; }
    if (msg) { setDevAnswer(msg); try { speak(msg, { conversational: true }); } catch { /* 소리 꺼짐 */ } }
  }, [parsed.deviceCmd, query]);
  //  조작이 아닌 새 질문이 오면 조작 답을 걷는다.
  useEffect(() => { if (!parsed.deviceCmd) setDevAnswer(null); }, [parsed.deviceCmd, query]);

  //  ★ 2.68 (검수사 «SWTD 갱배분은 3갱으로 하시면 편할듯 합니다»): «3갱으로 기억해» 를 이 항차에 저장.
  //    저장만 하고 답은 갱 배분 본체가 낸다 — 저장 뒤 계산이 그 수로 나오는지 바로 보인다.
  //  ★ 2.73: «22:00부터 재계산»·«22시 시작» — 말로 알린 작업 시작 시각을 이 항차에 적어 둔다.
  const startSetRef = useRef('');
  useEffect(() => {
    if (!parsed.startSet || !voyageKey) return;
    //  ★ 2.74: 호기별로 대면 호기마다 적는다(가장 이른 것이 항차 시작). 없으면 종전 한 시각.
    const cr = parsed.startSet.cranes || [];
    const ms = cr.length ? Math.min(...cr.map((c) => c.ms)) : parseSpokenTimeMs(parsed.startSet.raw || query || '');
    if (!ms) return;
    const key = `${voyageKey}|${ms}|${cr.map((c) => c.no + ':' + c.ms).join(',')}`;
    if (startSetRef.current === key) return;
    startSetRef.current = key;
    fbSetVoyageWorkStart(voyageKey, ms, inspector || '', cr)
      .then((txt) => { try { speak(cr.length ? `${String(txt)} 시작으로 다시 계산했어요` : `${String(txt).slice(11)} 시작으로 다시 계산했어요`, { conversational: true }); } catch { /* 소리 꺼짐 */ } })
      .catch((e) => console.warn('[2.74] 시작 시각 저장 실패', e));
  }, [parsed.startSet, voyageKey, inspector, query]);

  const gangSetRef = useRef('');
  useEffect(() => {
    const g = parsed.gangSet;
    if (!g || !voyageKey) return;
    const key = `${voyageKey}|${g.n}`;
    if (gangSetRef.current === key) return;
    gangSetRef.current = key;
    fbSetVoyageGangs(voyageKey, g.n, inspector || '', gangKeyFromWords(g.dayOff, g.shift))
      .then(() => { try { speak(`이 항차 ${g.n}갱으로 기억했어요`, { conversational: true }); } catch { /* 소리 꺼짐 */ } })
      .catch((e) => console.warn('[2.68] 갱 수 저장 실패', e));
  }, [parsed.gangSet, voyageKey, inspector]);
  //  ★ 3.8 (검수사 2026-09-05): «주간 1호기 김판석 2호기 송제욱» — 호기–검수원을 이 항차의 그 조에 적는다.
  //    확인 글은 본체(crewSetText)가 내고, 여기서는 저장 뒤 음성으로 «기억했어요» 를 붙인다. 실패는 말과 콘솔로 드러낸다.
  const crewSetRef = useRef('');
  useEffect(() => {
    const cs = resolveCrewSides(parsed.crewSet, voyage);   // 3.21: «선미 김판석» → 이 배 실적으로 호기 번호를 가린다
    if (!cs || !voyageKey || !Array.isArray(cs.crew) || !cs.crew.length) return;
    const sk = crewShiftKey(cs.shift, Date.now(), cs.dayOff || 0);
    const key = `${voyageKey}|${sk.key}|${cs.crew.map((c) => c.no + ':' + c.name).join(',')}`;
    if (crewSetRef.current === key) return;
    crewSetRef.current = key;
    fbSetVoyageCraneCrew(voyageKey, sk.key, cs.crew)
      .then((txt) => { try { speak(`${sk.key}조 ${koJosa(String(txt), '으로')} 기억했어요`, { conversational: true }); } catch { /* 소리 꺼짐 */ } })
      .catch((e) => { console.warn('[3.8] 호기 검수원 저장 실패', e); crewSetRef.current = ''; try { speak('호기 검수원 저장이 안 됐어요 — 다시 말해 주세요'); } catch { /* 소리 꺼짐 */ } });
  }, [parsed.crewSet, voyageKey]);
  //  조작 답이 있으면 그것이 먼저다 — 방금 누른 결과를 보여 줘야 한다.
  //  3.42: 모델이 받은 답(번역→규칙 / 자료 답)이 있으면 약한 규칙 답 대신 그것이다. 말투는 규칙 답과 같은 한 겹.
  const _modelAnswer = (modelState.q === query.trim() && modelState.text) ? mirTone(modelState.text) : null;
  const localAnswer = devAnswer || _modelAnswer || _mirAnswer;
  //  3.42: 렌더 시점에 «이 문장은 모델로 간다»를 미리 안다 — effect 가 pending 을 세우기 전 첫 커밋에 발화·신고가 먼저 나가던 것(감사 jsdom 실측)
  const _willAskModel = !!(askedAt && query.trim().length >= 4 && !/^[0-9\s]+$/.test(query.trim()) && !(parsed.deviceCmd || parsed.crewSet || parsed.startSet || parsed.gangSet) && isWeakAnswer(query.trim(), _localAnswerRaw, traceRef.current));
  const _modelWait = _willAskModel && !(modelState.q === query.trim() && !modelState.pending);

  /* ★ 2.85 (검수사 지시 2026-08-29) — *«미르야 베이플랜/카고플랜 보여줘»*
       검수사 — *«검수앱은 간단 할것입니다. 양하자리에 있으면 양하 베이플랜 카고플랜을 열게 하면 되고
       선적자리에서 말하면 선적꺼 올리면 되니까여»* — 지금 보고 있는 탭 것을 열면 되니 양/선을 말로 가릴 필요가 없다.
     ⚠ **여기서 화면을 직접 열지 않는다.** 이 자리는 `SingleSearch` 안이라 탭·인쇄 상태가 없다
       (그 스코프를 착각해 전체 크래시가 두 번 났다 — `rfSkip` · `manualBayPairs`).
       부모가 내려준 `onOpenPlan` 만 부른다.
     ⚠ **접수된 질문에서만** 연다(밝기와 같은 원칙) — 타이핑 중에 화면이 바뀌면 안 된다. */
  const planRanRef = useRef('');
  useEffect(() => {
    const q = (query || '').trim();
    if (!q || !onOpenPlan) return;
    if (planRanRef.current === q) return;          // 같은 질문으로 두 번 열지 않는다
    /* 2.87-02: 판정은 src/planCommand.js 한 벌이다 — 사본을 두면 홈·통합검색과 갈린다. */
    const cmd = parseViewCommand(q);
    if (!cmd) return;
    planRanRef.current = q;
    //  여기서는 «보고 있던 쪽»이 기본이다 — 검수사 «양하자리에 있으면 양하…선적자리에서 말하면 선적꺼».
    try { onOpenPlan({ what: cmd.what, bay: cmd.bay, mode: cmd.mode || workFilter }); }
    catch (e) { console.warn('[미르] 플랜 열기 실패:', e); }
  }, [query, onOpenPlan, workFilter]);


  // 1.69-01: 직전 답 주제 캐시 — 브리핑·실 점검을 답했으면 기억해 둔다("N건이 뭐야" 후속용).
  useEffect(() => {
    if (!localAnswer) return;
    if (parsed.sealAuditQuery) lastTopicRef.current = 'seal';
    else if (parsed.briefingQuery) lastTopicRef.current = 'briefing';
  }, [localAnswer, parsed]);

  // V7.92: 날씨 질문 — Open-Meteo(무키) 평택항 좌표. 실패 시 조용히 안내문.
  //   3.41: 문장 만들기는 src/weatherText.js 한 벌(떠 있는 미르와 공용) — 종전 인라인 fetch 를 그리로 옮겼다.
  useEffect(() => {
    if (!parsed.weatherQuery) { setWeatherText(null); return; }
    let alive = true;
    fetchWeatherText().then((t) => { if (alive) setWeatherText(t); });
    return () => { alive = false; };
  }, [parsed.weatherQuery]);

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
        if (t.length >= 2) { voiceQueryRef.current = t; setReasked(t === lastAskRef.current); lastSpokenRef.current = null; setAskedAt(Date.now()); setDraft(t); setQuery(t); logQuerySettled('nls', t, { voyageKey }); }   // 1.22: 음성은 종전대로 즉답   // TallyOne 1.3: 음성 조회 기록   // 1.69-05: 같은 질문 다시 말해도 답한다
        else {
          const digits = parseSpokenDigits(text);
          if (digits && digits.length >= 2) { setReasked(digits === lastAskRef.current); lastSpokenRef.current = null; setAskedAt(Date.now()); setDraft(digits); setQuery(digits); logQuerySettled('lookup', digits, { voyageKey }); }
          else speak('인식 실패');
        }
      }
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => { setIsListening(false); if (e.error === 'not-allowed') speak('마이크 권한 필요'); };
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch(_) {} };
  }, []);

  /* ★ 3.42 (판 B) — **약한 답일 때만 모델.** 종전 V7.80 «음성 질문 자동 복원»(fixQuestionWithAI, 음성만·개인 키·문장 교정만)을
       mirModel.askMirModel 한 함수로 바꿨다 — 타이핑도 받고, 공용 키(검수사 부담)로, ①미르 말로 번역해 규칙을 다시 돌리고 ②없으면 자료를 실어 답한다.
       «약한 답» = 규칙 null · 잡아채는 길(사용법 매뉴얼·현재 시각·베이사전 타령·진행 잡답…, traceRef) · 모르는 낱말이 남음. 강한 규칙 답에는 모델이 끼지 않는다.
       ⚠ 접수된 질문(askedAt — 엔터·전송·음성)만. 타이핑 중엔 부르지 않는다(모델 호출 한 번 = 값). 같은 문장은 mirModel 이 한 번만 부른다. */
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 4 || !askedAt) { setModelState((m) => (m.q === q ? m : { q, pending: false, text: null, via: null })); return undefined; }
    if (/^[0-9\s]+$/.test(q)) return undefined;                 // 숫자(끝4자리)는 화면 카드가 답한다
    if (parsed.deviceCmd || parsed.crewSet || parsed.startSet || parsed.gangSet) return undefined;   // 조작·적는 말은 규칙이 다 한다
    if (!isWeakAnswer(q, _localAnswerRaw, traceRef.current)) { setModelState((m) => (m.q === q && !m.pending ? m : { q, pending: false, text: null, via: null })); return undefined; }
    let alive = true;
    setModelState({ q, pending: true, text: null, via: null });
    const ctx = { app: 'tally', voyageKey, voyage, info: (manualCtx && manualCtx.info) || voyage?.info || null, mode: workFilter, containers: allContainers, inspector };
    askMirModel(q, ctx, (cq) => _rulesFor(cq), { who: inspector || '', weakText: _localAnswerRaw, weakVia: traceRef.current && traceRef.current.via })
      .then((m) => { if (!alive) return; setModelState({ q, pending: false, text: (m && m.text) ? m.text : null, via: (m && m.via) || null }); if (m && m.text) logQuerySettled('nls', q, { voyageKey, via: m.via }); })
      .catch((e) => { console.warn('[미르 모델] 실패:', e && e.message); if (alive) setModelState({ q, pending: false, text: null, via: null }); });
    return () => { alive = false; };
  }, [query, askedAt]);   // eslint-disable-line react-hooks/exhaustive-deps — 접수된 문장 하나에 한 번

  // V8.60: 음성으로 식사 질문("점심 뭐 먹을까") → 맛집 돌림판 자동 오픈. 타이핑은 답변 카드의 버튼으로.
  useEffect(() => {
    if (!parsed.foodQuery) return;
    if (voiceQueryRef.current !== query.trim()) return;   // 음성으로 들어온 질문만 자동 이동
    const t = setTimeout(() => { window.location.hash = `#/food?spin=${parsed.foodQuery}`; }, 1500);
    return () => clearTimeout(t);
  }, [parsed.foodQuery, query]);

  // 자동 음성 안내
  useEffect(() => {
    if (!autoSpeak) return;
    if (!query || query.length < 2) return;
    if (aiLoading || aiAnswer) return; // AI 답변 중엔 안내 X
    if (chatMessages.length > 0) return;  // M5.80: 대화 중에도 안내 X (AI 답변에 자동 발음됨)
    //  2.65: 브리핑만 askedAt 을 섞는다 — 같은 «브리핑» 을 다시 말하면 처음부터 다시 읽어 준다(다시 듣기).
    if (_modelWait) return;   // 3.42: 모델로 갈 문장은 결과가 올 때까지 읽지 않는다(약한 답을 먼저 읽고 또 읽던 것 — 감사 실측)
    const sig = `${query}-${results.length}-${parsed.isStat}-${results[0]?.cn || 'none'}-${localAnswer ? '1' : '0'}${parsed.briefingQuery ? `-${askedAt}` : ''}-${modelState.q === query.trim() ? (modelState.via || 'r') : 'r'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    // V7.80: 음성 답변 간결화 — 핵심 한 문장만 (상세는 화면). 0대면 "~없습니다" (사용자 확정 형식).
    if (localAnswer) {
      //  ★ 2.65 (검수사 확정 «브리핑은 한번은 정확히 들어야 합니다. 보는것만으로는 지나칠수 있습니다»):
      //    브리핑은 첫 줄만이 아니라 **끝까지** 읽는다. 머리에 안 실린 주의사항(탱크·OOG 등)은
      //    종전엔 소리로는 존재조차 없었다(실측 PCSZ 2625E).
      if (parsed.briefingQuery) {
        try { speakLong(briefingVoiceLines(localAnswer)); } catch (e) { /* 낭독 실패 무시 */ }
        return;
      }
      // 1.92-02 (검수사: «미르야 하면 답변이 이상하게 들립니다») — 인사는 짧게, 이모지는 전부 벗겨 읽는다.
      const first = parsed.mirHello ? '네, 말씀하세요'
        : (localAnswer.split('\n').find(l => l.trim()) || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/[•·⏱«»]/g, ' ').replace(/\s+/g, ' ').trim();
      const zm = first.match(/^(.+?):\s*0대/);
      if (zm) speak(`${zm[1].trim()} 없어요`);   // 2.33: 미르 말투
      else if (first) speak(first.replace(/:\s*/, ' '), (parsed.etaQuery || parsed.handoverQuery || parsed.customsReportQuery) ? { conversational: true } : {});  // V7.99-15/V8.00: 대화형 답변은 부드럽게
      return;
    }

    if (parsed.isStat) {
      const n = results.length;
      speak(n === 0 ? `${describeQuery(parsed)} 없어요` : `${describeQuery(parsed)} ${n}대`);   // 2.33
      return;
    }
    if (results.length === 0 && hasAnyCondition(parsed)) {
      speak(`${describeQuery(parsed)} 없어요`);   // 2.33
    } else if (results.length === 1) {
      announceContainer(results[0]);
    } else if (results.length <= 5) {
      speak(`${results.length}개 일치`);
    } else {
      speak(`${results.length}개 일치, 더 자세히`);
    }
  }, [results, query, parsed, autoSpeak, aiLoading, aiAnswer, localAnswer, askedAt, modelState, _modelWait]);   // 1.69-05: 재제출 시 재발화 · 3.42: 모델 결과

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript(''); setIsListening(true); stopSpeak();
    setAiAnswer(null);
    try { recognitionRef.current.start(); } catch (e) { setIsListening(false); }
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch (e) { console.warn('[V9.57] 음성인식 stop 실패(무해)', e); }  // V9.57(I15): 빈 catch 로그
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
        if (autoSpeak) speak(mirTone(res.answer));   // 2.33: AI 답도 같은 말투
      } else {
        // V9.14: 실패 시 aiAnswer를 세우지 않는다 — aiAnswer는 렌더되지 않는 게이트 변수라
        //   '오류:' 문자열을 넣으면 오류도 안 보이고 기존 검색 결과까지 사라졌다(지침서 V9.11 기록).
        alert(`AI 호출 실패: ${res.error}\n검색 결과는 그대로 유지됩니다.`);
      }
    } catch (e) {
      alert(`AI 호출 실패: ${e.message}\n검색 결과는 그대로 유지됩니다.`);
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
      <div className="bg-ink-900 border border-line rounded-pill p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xs text-dim-400 font-bold">
            <img src={mirFaceUrl} alt="미르" className="w-5 h-5 rounded-full inline-block align-middle mr-1"/>미르 검색 — 4자리 / 전체번호 / "리퍼 몇개" / "16번 베이" / 자유 질문 · 작업 {allContainers.filter(c => c._ptk).length}대
          </div>
          <button onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 text-2xs font-bold border border-amber-700/40">
            <HelpCircle className="w-3 h-3"/>
            예시
          </button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim-400"/>
          <input type="text" value={draft}
            onChange={e => {
              const v = e.target.value;
              setDraft(v);
              setAskedAt(null); setReasked(false);           // 1.69-05: 새로 치는 중 — 접수 표시 해제
              if (!v.trim()) lastSpokenRef.current = null;   // 1.69-05: 지웠다가 다시 물으면 다시 말한다
              // 숫자·빈 입력은 즉답(종전 동작). 문장은 전송키를 누를 때까지 답하지 않는다.
              if (!isSentence(v)) { setQuery(v); logQuerySettled('lookup', v, { voyageKey }); }
              else if (query) setQuery('');
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitDraft(); } }}
            placeholder="🎤 / 4777 / DWSU3000276 / 40피트 4777 / 자유 질문"
            autoComplete="off"
            inputMode={manualCtx && manualCtx.selectedGroup != null && manualCtx.selectedTier ? 'numeric' : 'text'}
            className="w-full pl-9 pr-32 py-3 bg-ink-800 border border-line rounded text-xl font-black mono text-amber-200 text-center tracking-wider focus:outline-none focus:border-amber-500"/>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {voiceSupported && (
              <button onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded flex items-center justify-center ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-ink-950'
                }`}>
                {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
              </button>
            )}
            <button onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-7 h-10 rounded flex items-center justify-center ${autoSpeak ? 'text-amber-300' : 'text-dim-400'}`}>
              {autoSpeak ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>
            {/* TallyOne 1.22: 전송키 — 문장을 다 쓰고 누르면 그때 답한다.
                1.69-05: 제출 뒤에도 남긴다 — 같은 질문을 다시 눌러 물을 수 있게(검수사 신고). */}
            {isSentence(draft) && !!draft.trim() && (
              <button onClick={submitDraft} title="질문 전송"
                className="w-10 h-10 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-ink-950">
                <SendHorizontal className="w-5 h-5"/>
              </button>
            )}
            {(draft || query || chatMessages.length > 0) && (
              <button onClick={() => { setDraft(''); setQuery(''); setAskedAt(null); setReasked(false); lastSpokenRef.current = null; handleNewChat(); }} className="w-7 h-10 rounded hover:bg-ink-750 flex items-center justify-center">
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

        {hasAnyCondition(parsed) && !aiAnswer && chatMessages.length === 0 && (
          <div className="mt-2 text-xxs text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">
            🤖 인식: <span className="font-bold">{describeQuery(parsed)}</span>
            {parsed.isStat && <span className="ml-1 text-amber-300">(개수)</span>}
          </div>
        )}

        {/* AI 자유 질문 버튼 */}
        {showAIButton && (
          <button onClick={() => handleAskAI()} disabled={aiLoading}
            className="mt-2 w-full py-2 rounded bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin"/>AI 생각 중...</> : <><Sparkles className="w-4 h-4"/>AI에게 물어보기 (Gemini)</>}
          </button>
        )}

        {_modelWait && (
          <div className="mt-2 text-xxs text-center text-sky-300 font-bold animate-pulse">🐱 미르가 다시 생각하는 중…</div>
        )}
        {/* V7.54: 못 알아들었거나 일치 0인 질문 기록 — 나중에 지원 추가용 (사용자 요청) */}
        {!isListening && !_modelWait && query.length >= 4 && !aiLoading && !aiAnswer && chatMessages.length === 0 && !localAnswer
          && (!hasAnyCondition(parsed) || results.length === 0)
          && !/^\d+$/.test(query.trim()) && (
          <button onClick={() => {
              setWrongPayload({ query, answerType: 'unanswered', answerText: hasAnyCondition(parsed) ? '(일치 결과 없음)' : '(질문 인식 실패)', parsed });
              setWrongOpen(true);
            }}
            className="mt-2 w-full py-1.5 rounded bg-ink-800 hover:bg-ink-750 border border-amber-700/50 text-amber-300 text-xxs font-bold">
            📌 이 질문을 기록 (나중에 답할 수 있게 개선)
          </button>
        )}

        <div className="text-xxs text-center mt-2">
          {!isListening && query.length === 0 && <span className="text-dim-400">🎤 마이크 또는 키보드</span>}
          {!isListening && query.length >= 2 && results.length === 0 && hasAnyCondition(parsed) && <span className="text-red-400 font-bold">⚠ 일치 없음</span>}
          {!isListening && query.length >= 2 && results.length === 1 && !parsed.isStat && !localAnswer && <span className="text-emerald-400 font-bold">✓ 1개 일치</span>}
          {!isListening && query.length >= 2 && results.length > 1 && !parsed.isStat && !localAnswer && <span   /* 2.34-08: 즉답 있으면 숨김 */ className="text-amber-400 font-bold">⚠ {results.length}개 일치</span>}
          {isListening && <span className="text-red-300 font-bold">🎙 듣는 중...</span>}
          {/* 3.6: 온전한 컨번호를 쳤는데 못 찾았다 — 검산으로 «오타인지 진짜 없는 컨인지» 짚어 준다. */}
          {(() => {
            if (isListening || results.length !== 0) return null;
            const q = String(query || '').toUpperCase().replace(/[\s-]/g, '');
            const ok = isoCheckDigit(q);
            if (ok !== false) return null;
            const fix = isoFixLastDigit(q);
            return (
              <div className="mt-1 text-2xs text-red-300">
                ⚠ 이 번호는 검산(ISO 6346)이 안 맞습니다 — 한 글자 잘못 치신 것일 수 있어요.
                {fix && <> 마지막 자리가 <b className="mono text-red-200">{fix.slice(-1)}</b> 이면 맞습니다 — <span className="mono">{fix}</span></>}
              </div>
            );
          })()}
          {askedAt && !isListening && <span className="text-emerald-400 font-bold ml-2">✓ 질문 접수 {_hm(askedAt)}</span>}
        </div>
      </div>

      {/* M5.80: 멀티턴 AI 대화 카드 */}
      {chatMessages.length > 0 && (
        <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-cyan-950 border-2 border-purple-500 rounded-btn p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-300"/>
              <div className="text-xxs text-purple-300 font-bold uppercase">
                AI 대화 (Gemini Flash)
              </div>
              {ragInfo && ragInfo.narrowed && (
                <span className="text-2xs text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded font-bold">
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
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 text-2xs font-bold border border-red-700/40">
                ❌ 오답
              </button>
              <button onClick={handleNewChat}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-ink-750/60 hover:bg-ink-700/60 text-dim-100 text-2xs font-bold border border-line-strong/40">
                🔄 새 대화
              </button>
            </div>
          </div>

          {/* 대화 메시지들 (말풍선) */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-pill ${
                  m.role === 'user'
                    ? 'bg-amber-700/40 border border-amber-600/40 text-amber-100 text-sm'
                    : 'bg-ink-800/60 border border-purple-600/30 text-dim-100 text-base'
                }`}>
                  <div className="text-3xs uppercase font-bold mb-0.5 opacity-70">
                    {m.role === 'user' ? '검수원' : 'AI'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  {m.role === 'model' && m.ragInfo && m.ragInfo.narrowed && (
                    <div className="mt-1 text-3xs text-cyan-400/80 font-bold">
                      📌 {m.ragInfo.filterDesc} ({m.ragInfo.candidateCount}대 참조)
                    </div>
                  )}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-pill bg-ink-800/60 border border-purple-600/30">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300 inline"/>
                  <span className="ml-2 text-xs text-dim-300">AI 생각 중...</span>
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
                className="flex-1 px-3 py-2 bg-ink-800 border border-purple-700/40 rounded text-sm text-dim-100 focus:outline-none focus:border-purple-500"
              />
              <button onClick={handleSendFollowup}
                disabled={!followupQuery.trim()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-ink-750 disabled:text-dim-400 text-white rounded font-bold text-sm">
                보내기
              </button>
            </div>
          )}

          <div className="mt-2 text-2xs text-dim-400">
            💡 이전 대화 기억함 — "그 중...", "위에 뭐 있어?" 같은 후속 질문 가능 · {chatMessages.length / 2}턴
          </div>
        </div>
      )}

      {/* M3.2: 로컬 답변 카드 (베이/POL/POD/구역/무게합/위치 등 - AI 의존 X) */}
      {/* 1.85 (검수사 확정): «브리핑에서 누른 버튼은 반드시 되돌아 가기 버튼이 있어야 합니다» —
          후속 버튼으로 온 화면이 텍스트 답이 아니어도(컨번호 조회·리퍼/OOG 결과가 작업 카드로 그려질 때)
          「← 이전 답으로」 를 결과 위에 상시 노출. 텍스트 답일 땐 종전대로 답 카드 안 버튼만. */}
      {askStack.length > 0 && !localAnswer && chatMessages.length === 0 && (
        <button onClick={backAnswer}
          className="w-full py-2.5 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 font-bold text-sm border border-line-strong">
          ← 이전 답으로
        </button>
      )}

      {localAnswer && chatMessages.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-950 to-ink-900 border-2 border-emerald-600 rounded-btn p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-300"/>
              <div className="text-xxs text-emerald-300 font-bold flex items-center gap-1.5"><img src={mirFaceUrl} alt="" className="w-5 h-5 rounded-full"/>미르 즉답</div>
            </div>
            <button onClick={() => {
              setWrongPayload({ query, answerType: 'local', answerText: localAnswer, parsed });
              setWrongOpen(true);
            }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 text-2xs font-bold border border-red-700/40">
              ❌ 오답
            </button>
          </div>
          {reasked && askedAt && <div className="text-xxs text-emerald-300 font-bold mb-1">다시 확인했습니다 ({_hm(askedAt)} 기준)</div>}
          <div className="text-sm text-dim-100 whitespace-pre-wrap leading-relaxed mono">{localAnswer}</div>
          {(() => { try { const _p = parsed; if (!_p?.gangQuery) return null; const _d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[String(voyage?.info?.vsl || '').toUpperCase()] : null; const _de = _d ? (_d.bayDef || _d) : null; const _gs = buildGangShift(voyage, _de, { nGangs: _p.gangQuery.n || null, tw: terminalWorkFor(voyage?.info, terminalWork) }); return _gs ? <GangStrip gs={_gs} /> : null; } catch (e) { return null; } })()}
          {/* 1.91-02: 되묻기 버튼 — 양하/선적 선택 시간을 주고, 8초 무응답이면 둘 다
              ★ 3.41-01 (검수사 «카고플랜하면 양하 선적 선택화면이 나오고 누른 후에 양하나 선적 중 선택하라고 함»):
                뿌리는 2.85 의 배선 결함 — 이 SingleSearch 를 그리는 두 자리가 `onOpenPlan` 을 안 넘겨(감사 실측) 작업창에서는
                «카고플랜 보여줘» 가 플랜을 **아예 못 열고** 목록 질문(listQuery)으로 떨어져 이 단추가 떴다. 배선을 잇고(위 두 자리),
                플랜 명령이면 단추를 안 띄우며, 누르면 쌓인 발화(되묻는 말)를 끊는다 — 폰 TTS 가 늦게 나와 고른 뒤에 «양하인가요» 가 들렸다. */}
          {needsModeChoice(parsed, results) && modeChoice === null && !(onOpenPlan && parseViewCommand(query)) && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => { try { stopSpeak(); } catch (e) { /* */ } setModeChoice('discharge'); }}
                className="flex-1 py-3 rounded-pill bg-sky-700 hover:bg-sky-600 text-white font-black text-base">⬇ 양하</button>
              <button onClick={() => { try { stopSpeak(); } catch (e) { /* */ } setModeChoice('loading'); }}
                className="flex-1 py-3 rounded-pill bg-emerald-700 hover:bg-emerald-600 text-white font-black text-base">⬆ 선적</button>
              <button onClick={() => { try { stopSpeak(); } catch (e) { /* */ } setModeChoice('both'); }}
                className="flex-1 py-3 rounded-pill bg-ink-750 hover:bg-ink-700 text-dim-100 font-bold text-sm">둘 다</button>
            </div>
          )}
          {parsed.foodQuery && (
            <button onClick={() => { window.location.hash = `#/food?spin=${parsed.foodQuery}`; }}
              className="mt-2 w-full py-2.5 rounded-pill bg-violet-700 hover:bg-violet-600 text-white font-bold text-sm">
              🎰 돌림판 돌리기
            </button>
          )}
          {/* 1.84-03 (검수사 확정): **점검·확인할 내용이 있으면 버튼을 만든다.**
              ① «"질문"으로 상세 확인» 인용 패턴 → 그 질문 버튼(실번호 점검 등)
              ② 브리핑 주의사항 줄의 이모지 → 해당 조건 조회 버튼(리퍼·X-RAY·위험물·FR·O/T·탱크·OOG)
              전부 nlSearch 가 이미 답하는 질의만 연결한다(없는 인텐트로 유도하지 않는다). */}
          {(() => {
            const txt = String(localAnswer);
            const hints = [...txt.matchAll(/"([^"]{2,14})"\s*[으로]*로?\s*상세 확인/g)].map(m => m[1]);
            const WARN_BTN = [['❄', '리퍼'], ['🩻', '엑스레이'], ['☣', '위험물'], ['⊞', 'FR'], ['△', 'OT'], ['🛢', '탱크'], ['📐', 'OOG'], ['📷', '데미지'], ['🧳', '수화물'], ['⚡', '긴급']];   // 2.05-01
            WARN_BTN.forEach(([emo, q]) => { if (txt.includes(emo + ' ')) hints.push(q); });
            const uniq = [...new Set(hints)];
            if (!uniq.length && !askStack.length) return null;
            return (
              <div className="mt-2 flex gap-2 flex-wrap">
                {uniq.map(h => (
                  <button key={h} onClick={() => followUp(h)}
                    className="flex-1 min-w-[120px] py-2.5 rounded-pill bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold text-sm">
                    🔍 {h} 보기
                  </button>
                ))}
                {askStack.length > 0 && (
                  <button onClick={backAnswer}
                    className="flex-1 min-w-[120px] py-2.5 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 font-bold text-sm border border-line-strong">
                    ← 이전 답으로
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* V8.00: 인수인계 되묻기 — 검수사가 특이사항/전달사항 직접 입력 */}
      {parsed.handoverQuery && localAnswer && !handoverFinalized && chatMessages.length === 0 && (
        <div className="bg-ink-900 border border-amber-700 rounded-btn p-3 space-y-2">
          <div className="text-xs2 text-amber-300 font-bold">📝 더 전달할 내용 (특이사항·다음 검수사 참고)</div>
          <textarea
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
            placeholder="예: 12번 베이 리퍼 1대 온도 확인 필요. 3호기 크레인 점심 후 점검 예정. 없으면 비워두세요."
            rows={3}
            className="w-full bg-ink-950 border border-line rounded-pill p-2 text-sm text-dim-100 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setHandoverFinalized(true)}
              className="flex-1 py-2.5 rounded-pill font-black text-sm bg-emerald-700 hover:bg-emerald-600 text-emerald-50">
              ✓ 인계서 완성
            </button>
            <button onClick={() => { setHandoverNote(''); setHandoverFinalized(true); }}
              className="px-4 py-2.5 rounded-pill font-bold text-sm bg-ink-800 hover:bg-ink-750 text-dim-200 border border-line-strong">
              특이사항 없음
            </button>
          </div>
        </div>
      )}

      {/* 통계 답변 카드 (단순 카운트) — 로컬 답변이 없을 때만 */}
      {parsed.isStat && hasAnyCondition(parsed) && query.length >= 2 && !aiAnswer && !localAnswer && chatMessages.length === 0 && (
        <div className="bg-gradient-to-br from-cyan-950 to-ink-900 border-2 border-cyan-600 rounded-btn p-4 text-center">
          <div className="text-xxs text-cyan-400 font-bold uppercase mb-1">개수 답변</div>
          <div className="text-base text-dim-200 mb-2">{describeQuery(parsed)}</div>
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
        // TallyOne 1.53: **완료분을 찾으면 한 줄 요약만 나왔다.**
        //   실측 2026-08-12 — 선적을 끝내고 `7722` 로 찾으니 「✓ 1개 일치」인데 카드가 안 열리고
        //   「▼ 다른 작업·완료분에 1건 — 보기」뿐이었고, 펴도 한 줄 요약이라 **위치도 이력도 안 보였다.**
        //   원인 둘 — ⓐ 「✓ 완료」 탭(workFilter='completed')에서는 `c._mode === workFilter` 가
        //   영원히 거짓이라 main 이 항상 비었다. ⓑ 완료분 큰 카드(V8.70)가 현재 작업 모드로만 한정돼,
        //   양하를 보다 선적 완료분을 찾으면 걸리지 않았다.
        //   → 완료 탭은 완료분이 본목록이고, 번호 조회로 완료분 한 건이 잡히면 모드와 무관하게 정식 카드로 편다.
        const doneTab = workFilter === 'completed';
        /* ★ 3.2-01 (김성일 메모 2026-09-03 «컨번호 중복적으로 문제» — NSDC 2608N 22:16 실측)
             «0320» 에 FFAU4440320(평택)과 SEGU2520320(부산·베이3 통과분)이 같이 잡혔고, 평택 것을 완료하자
             부산 것이 «유일 후보»가 되어 큰 [양하확인] 카드로 자동 승격 → 4초 뒤 부산 컨이 완료로 기록됐다
             (이 항차 평택 123대 중 12대가 타항 컨과 끝4자리가 겹친다). 완료 카드가 되는 것은 **작업분**
             (평택분·시프팅·초과)뿐이다. 통과분은 조회로만 — 아래 목록에 «통과 POD·자리»를 달아 보인다(V7.53 «찾아서 알려줘야» 유지). */
        const _isWork = (c) => canCompleteContainer(c, c._mode);   // utils 한 벌 — 통과분만 아니다(항구 빈칸·리스트 등재는 작업분)
        const mainAll = doneTab ? results.filter(c => c._comp)
                                : results.filter(c => !c._comp && c._mode === workFilter && _isWork(c));
        const others = doneTab ? results.filter(c => !c._comp)
                               : results.filter(c => c._comp || c._mode !== workFilter || !_isWork(c));
        const workHits = results.filter(c => c._mode === workFilter && _isWork(c));
        /* ★ 3.23 — **베이를 지정하고 작업 중이면 그 베이 것이 우선이다.** 검수사 2026-09-07 05:40
             «여기서 저라면 중복이 있더라도 우선권을 줍니다 베이를 지정해서 양하중입니다.
               그러면 리퍼 3290만 보였어야 합니다» ·
             «베이를 지정하지 않았더라면 중복이 많겠지만 베이를 지정한 상태라면 그베이껏이 우선이 되어야 합니다» ·
             «자동 가이드 문제가 아닙니다. 수동양하도 마찬가지 입니다. 항상 베이를 선택하고 양하 합니다».
           실측 ATPR 2640E 양하 — «3290» 이 FBIU5373290(14-08-82 · 리퍼) 과 SKHU8933290(06-04-86) 둘인데,
           검수사는 **B14 를 골라 놓고** 있었다. 그런데 화면은 «자리를 확인하고 고르십시오»를 띄우고
           «전체 번호를 치면 바로 확인 카드가 뜹니다» 라고 11자리를 요구했다 — 4자리로 끝나는 빠름이 사라진다.
           ⚠ 3.3-01 의 금지(둘 이상이면 큰 카드 없음)는 **그대로 둔다** — 그 사고(KSKM 7075: 하나를 완료하면
             남은 하나가 곧바로 큰 카드로 승격)는 «고른 베이 안에 둘»일 때 나는 것이라, 여기서 여는 문은
             **그 베이·단에 정확히 하나일 때**뿐이다. 베이를 안 골랐으면 종전대로 나란히 보인다. */
        const bayHits = workHits.filter(inManualTier);
        const bayPick = (!!parsed.digits && !doneTab && workHits.length > 1 && bayHits.length === 1) ? bayHits[0] : null;
        const dupL4 = !!parsed.digits && !doneTab && workHits.length > 1 && !bayPick;
        //  ★ 3.23 — 고른 베이에 하나면 그 하나로 큰 카드를 세운다(아래 판정 전부가 이 `main` 을 쓴다).
        const main = bayPick ? [bayPick] : mainAll;

        // V8.70: 완료된 컨도 번호 단일 매칭이면 큰 카드로 — 취소·위치수정 접근(완료 후 재검색 시 막다른 골목 제거).
        //   ※ 같은 번호가 양하·선적 양쪽에 완료로 있으면(중계) 종전대로 현재 모드 쪽을 편다.
        const doneAll = (main.length === 0 && parsed.digits) ? results.filter(c => c._comp) : [];
        const doneSolo = doneAll.length > 1 ? doneAll.filter(c => c._mode === workFilter) : doneAll;
        /* ★ 3.3-01 (검수사 2026-09-03 «중복 컨테이너 나올시 맞는거 선택시 다른컨이 화면에 남는건 처리 하셨나요?»)
             3.2-01 은 **통과화물**이 완료 카드가 되던 것을 막았다. 그런데 **작업분끼리** 끝4가 겹치면 같은 일이 남아 있었다 —
             실측 KSKM 2616N 양하 «7075» = FTAU2807075(3-02-04) · SEGU2477075(5-06-08) 둘 다 평택(ATPR 2640W 선적은 9쌍 18대).
             처음엔 «⚠ 2개 일치»로 두 장이 뜨지만 **하나를 완료하면 남은 하나가 곧바로 큰 [양하확인] 카드로 승격**됐다(조회는 «7075» 그대로).
             ⇒ 끝4 조회가 작업분 **둘 이상**을 가리키면(완료분 포함) **큰 카드를 세우지 않는다.** 자리를 붙여 나란히 보이고 고르게 한다.
             전체 컨번호를 치면 narrowByFullCn 이 한 대로 좁히므로 종전대로 큰 카드가 선다(자동 가이드 «⚠️ 끝자리 같은 컨 N대»와 같은 벌). */
        //  감사 지적(3.3-01) — 완료 탭에서도 끝4가 겹치면 자리가 있어야 [취소]·위치수정 대상을 고른다. 큰 카드는 원래 안 선다(main 2대).
        const dupDone = doneTab && !!parsed.digits && main.length > 1;
        //  ★ 3.23 — 베이로 좁혔으면 **가려낸 나머지를 접힌 목록에 넣는다.** 숨기면 «찾아서 알려줘야 한다»(V7.53)가 깨진다.
        const othersRest = bayPick ? [...workHits.filter(c => c !== bayPick), ...others]
                                   : (dupL4 ? others.filter(c => !workHits.includes(c))
                                            : ((doneSolo.length === 1) ? others.filter(c => c !== doneSolo[0]) : others));
        // TallyOne 1.53: 완료 탭에서는 접힌 쪽이 '아직 안 한 작업'이다 — 라벨이 반대로 읽히면 안 눌러 본다.
        const othersLabel = (n) => (doneTab ? `아직 안 한 작업에 ${n}건 — 보기` : `다른 작업·완료·통과분에 ${n}건 — 보기`);   // 3.2-01: 통과분도 여기
        return (
          <>
            {/* 3.3-01: 끝4가 겹치면 자리를 보고 고른다 — 한 번 누르면 완료되는 큰 카드는 안 세운다. */}
            {dupL4 && (
              <div className="text-xxs text-rose-300 font-bold bg-rose-950/40 border border-rose-800 rounded px-2 py-1.5 text-center">
                ⚠️ 끝자리 같은 컨 {workHits.length}대 — 자리를 확인하고 고르십시오
                <div className="text-2xs text-dim-300 font-normal mt-0.5">전체 번호를 치면 바로 확인 카드가 뜹니다</div>
              </div>
            )}
            {/* ★ 3.23: 고른 베이 것으로 좁혔으면 **왜 이 한 대인지**와 «다른 자리에도 있다»를 밝힌다.
                   숨기지 않는다 — 아래 접힌 목록에 그대로 있고, 잘못 짚었으면 거기서 고른다. */}
            {bayPick && (
              <div className="text-xxs text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-800 rounded px-2 py-1.5 text-center">
                📍 지금 하는 자리({String(bayPick.bay).padStart(2, '0')}-{bayPick.row}-{bayPick.tier}) 것으로 골랐습니다
                <div className="text-2xs text-dim-300 font-normal mt-0.5">
                  끝자리 같은 컨이 {workHits.length}대 — 다른 {workHits.length - 1}대는 다른 자리입니다(아래 목록)
                </div>
              </div>
            )}
            {/* TallyOne 1.53: 싱글로 하려는데 트윈이 되면 한 줄로 알린다(막지 않는다). */}
            {!dupL4 && main.length === 1 && <TwinPossibleHint c={main[0]} allContainers={allContainers} voyage={voyage}/>}
            {!dupL4 && main.length === 1 && (
              <BigResultCard voyagePhotos={voyage?.photos || null} c={main[0]} allContainers={allContainers}
                voyageKey={voyageKey} inspector={inspector}
                onOpen={() => onOpenContainer?.(main[0])}
                /* 1.55-02: 번호 수정으로 다른 컨을 배정했으면 그 컨으로 재검색 — 카드가 갈아 끼워진다.
                   종전엔 트윈만 onReplace 를 받아, 싱글은 창고로 간 옛 컨 카드가 남고 [선적확인]이 그대로 눌렸다
                   (fromStorage 부활 → 한 칸 두 대 + 이중 완료, 독립 재검증 P0-1). */
                onReplace={(nc) => { if (nc?.cn) { setDraft(nc.cn); setQuery(nc.cn); } }}
                /* TallyOne 1.48: 싱글도 같다 — 작업 구역을 골랐으면 위치 지정에서 다시 묻지 않는다. */
                workGroup={manualCtx?.selectedGroup ?? null} workTier={manualCtx?.selectedTier ?? null} slotSource={allContainers} bayPairsIn={manualCtx?.bayPairs ?? null}
                onAfterComplete={() => { setDraft(''); setQuery(''); stopSpeak(); }}
              />
            )}
            {!dupL4 && main.length === 0 && doneSolo.length === 1 && (
              /* TallyOne 1.53: 완료분도 위치·지나온 자리·버튼이 다 있는 정식 카드로 편다(요약 한 줄 금지). */
              <BigResultCard voyagePhotos={voyage?.photos || null} c={doneSolo[0]} allContainers={allContainers}
                voyageKey={voyageKey} inspector={inspector}
                onOpen={() => onOpenContainer?.(doneSolo[0])}
                onReplace={(nc) => { if (nc?.cn) { setDraft(nc.cn); setQuery(nc.cn); } }}
                workGroup={manualCtx?.selectedGroup ?? null} workTier={manualCtx?.selectedTier ?? null}
                slotSource={allContainers} bayPairsIn={manualCtx?.bayPairs ?? null}
                onAfterComplete={() => { setDraft(''); setQuery(''); stopSpeak(); }}
              />
            )}
            {(dupL4 ? workHits : (main.length > 1 ? main.slice(0, 30) : [])).map(c => (
              <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} showPos={dupL4 || dupDone} />
            ))}
            {othersRest.length > 0 && results.length > 0 && (
              <div className="mt-1">
                <button onClick={() => setShowOthers(v => !v)}
                  className="w-full py-1.5 rounded bg-ink-800/60 border border-line text-xxs text-dim-300 font-bold">
                  {showOthers ? '▲ 접기' : `▼ ${othersLabel(othersRest.length)}`}
                </button>
                {/* 3.2-01: 완료 후보가 없으면(통과분만 잡힘) 펼쳐 둔다 — 스캔한 통과화물을 «없습니다»로 만들지 않는다 */}
                {(showOthers || (parsed.digits && main.length === 0 && doneSolo.length === 0)) && othersRest.slice(0, 20).map(c => (
                  <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} />
                ))}
              </div>
            )}
          </>
        );
      })()}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} inspector={inspector}/>
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

// ─── V8.80: 수동 트윈 선적 — PCTC식 두 조회창 (사용자 확정 2026-07-08) ───
//   원칙: 수동 작업은 계획 위치에 묶이지 않는다. 두 컨을 직접 입력해 짝꿍으로 묶고,
//   [수동 배정 확인]으로 즉시 미배정 → 앞 위치를 정하면 뒤는 짝꿍 베이 자동 → 선적확인 한 번에 원자 완료.
function ManualTwinLoad({ voyage, voyageKey, inspector, allContainers, onOpenContainer, onBackToAuto = null }) {
  // ── TallyOne 1.54: **이 컴포넌트에는 `askYN` 이 아예 없었다.** ──
  //   아래 두 곳(1.53 에서 네이티브 confirm 을 걷어낸 자리)이 `askYN` 을 부르는데, 그것은
  //   `TwinSearch` 안에 선언된 지역 상수라 여기서는 보이지 않는다 — **완료 기록이 있는 컨을 고르는 순간
  //   ReferenceError 로 손이 멈춘다.** 실오류가 나면 카메라까지 멈추므로 그냥 두면 안 된다.
  //   같은 모양(`useConfirm` + `ConfirmModal`)으로 이 컴포넌트에도 한 벌 둔다.
  const [confirmState, askConfirm] = useConfirm();
  const askYN = (title, message, confirmLabel = '계속') => new Promise(r => askConfirm({
    title, message, confirmLabel, danger: true, onConfirm: () => r(true), onCancel: () => r(false),
  }));
  const [q1, setQ1] = useState(''); const [q2, setQ2] = useState('');
  const [c1, setC1] = useState(null); const [c2, setC2] = useState(null);
  const [step, setStep] = useState('pick');   // 'pick' | 'pos'
  const [bay, setBay] = useState(''); const [row, setRow] = useState(''); const [tier, setTier] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickBay, setPickBay] = useState(null);          // V8.83: 자리 선택 그리드 — 베이 먼저
  const [manualOpen, setManualOpen] = useState(false);   // V8.83: 직접 입력 접이식
  //  3.2-01(재감사 P1-A): 위치 지정 방식도 통과분(POL≠평택·리스트 미등재)은 후보가 아니다 — 선적 EDI(출항본)는 통과분 292/487(PCBJ 2609N)을 그대로 든다.
  const pool = useMemo(() => allContainers.filter(c => c._mode === 'loading' && canCompleteContainer(c, 'loading')), [allContainers]);
  const equipNo = useEquipNo();   // TallyOne 1.55: 완료 기록에 갱(호기)을 남긴다
  // V8.83: 자리 선택 그리드 — 20ft 계획 자리(완료=회색 선택불가). 위치수정 창과 같은 방식(사용자 확정).
  const is20 = (c) => String(c.tp || '').startsWith('20') || String(c.iso || '')[0] === '2';
  // ── TallyOne 1.55: **칸은 컨이 아니다.** ──────────────────────────────
  //   검수사 확정 2026-08-12 — *"컨테이너가 빠져야 하는데 자리가 빠진 이유
  //   (손님이 나가야 하는데 방이 나가버린 상황). 카고플랜은 변함이 없어야 한다."*
  //   *"EDI가 실어라 한대로 실었습니다. 이게 액츄얼 작업입니다."* — 자리는 계획대로 전부 찬다.
  //   바뀌는 것은 그 칸에 걸린 번호뿐이다.
  //   종전 이 자리 그리드는 pool 의 **컨을 하나씩 자리 항목으로 push** 했다. 중복 제거가 없어
  //   ① 같은 칸이 두 번(`√01-02` 와 `01-02` 나란히) ② 다 찬 베이에 「남은 N자리」
  //   ③ 계획 주인이 옮겨 가면 **칸이 소멸** ④ remain===0 으로 **베이 잠김**
  //     (실측 DXQD 2631W: `B11 남은 0자리` 인데 실제로는 4칸이 비어 있었다)
  //   ⑤ 베이를 끝내도 화면이 안 넘어감 — 다섯 증상이 이 한 줄에서 나왔다.
  //   → 칸 목록은 buildSlotUniverse, 점유는 buildOccupancy(utils.js 한 벌)로 낸다.
  //   실측 검증 완료: DXQD 2631W 15개 베이 720건 대조 — 선사 원본 칸과 불일치 0.
  const slotUniverse = useMemo(() => {
    // 이 패널은 상위(allContainers)에서 실체 자리를 c.bay 로 승격시켜 놨다 — 계획 좌표는 _bay_planned 에 있다.
    //   계획 좌표를 _edi_* 로 되살려 같이 넘긴다. 그래야 컨이 옮겨 가도 **계획 칸이 남는다.**
    //   승격 전 원본(실제 실린 자리)도 함께 넘겨 계획에 없던 칸도 목록에서 빠지지 않게 한다.
    const planView = pool.map(c => (c._bay_planned
      ? { ...c, _edi_bay: c._bay_planned, _edi_row: c._row_planned, _edi_tier: c._tier_planned }
      : c));
    return buildSlotUniverse([...pool, ...planView], is20);
  }, [pool]);
  // 점유 — 그 칸에 지금 누가 있는가. 완료된 쪽이 이긴다(실물이 이름표를 이긴다).
  const slotOcc = useMemo(() => buildOccupancy(pool, c => !!c._comp), [pool]);
  // 칸의 상태는 **세 갈래**다.
  //   done  — 그 칸에 완료된 컨이 실제로 있다(선택 불가, ✓)
  //   named — 완료는 아니고 이름표만 걸려 있다(계획 주인이 아직 창고에 있다). **선택 가능**
  //   empty — 진짜 빈 칸. 선택 가능
  const slotsByBay = useMemo(() => {
    const out = {};
    Object.keys(slotUniverse).forEach(b => {
      out[b] = slotUniverse[b].map(sl => {
        const occ = slotOcc.get(`${b}/${sl.row}/${sl.tier}`);
        return {
          bay: b, row: sl.row, tier: sl.tier,
          cn: occ ? occ.cn : null,
          done: !!(occ && occ.done),
          named: !!(occ && !occ.done),
        };
      });
    });
    return out;
  }, [slotUniverse, slotOcc]);
  const findMatches = (q, excludeCn) => {
    if (!q || q.length < 2) return [];
    const Q = q.toUpperCase();
    return pool.filter(c => c.cn !== excludeCn && (() => {
      const l4 = c.l4 || c.cn?.slice(-4) || '';
      return Q.length === 4 ? l4 === Q : (l4.endsWith(Q) || c.cn?.includes(Q));
    })()).sort((a, b) => (!!a._comp) - (!!b._comp)).slice(0, 8);
  };
  const r1 = useMemo(() => findMatches(q1, c2?.cn), [q1, pool, c2]);
  const r2 = useMemo(() => findMatches(q2, c1?.cn), [q2, pool, c1]);
  useEffect(() => { if (r1.length === 1 && (!c1 || c1.cn !== r1[0].cn)) setC1(r1[0]); else if (r1.length === 0 && c1) setC1(null); }, [r1]);
  useEffect(() => { if (r2.length === 1 && (!c2 || c2.cn !== r2[0].cn)) setC2(r2[0]); else if (r2.length === 0 && c2) setC2(null); }, [r2]);

  // V9.48: 앞을 넣으면 **뒤(짝꿍)를 양하처럼 자동으로 불러온다**(사용자 요청 2026-08-03).
  //   근거: 선적이 자동화되면서 플랜 짝 자리 그대로 맞춰 오는 경우가 크게 늘었다.
  //   양하 트윈(TwinSearch)이 쓰는 findTwinCandidate 를 그대로 쓴다 — 판정을 두 벌로 만들지 않는다.
  //   ⚠ 뒤 칸을 검수사가 이미 채웠으면 건드리지 않는다(사람 입력이 우선).
  const shipImo = voyage?.info?.imo || '';
  const shipName = voyage?.info?.vsl || '';
  useEffect(() => {
    if (!c1 || c2 || q2) return;
    const t = findTwinCandidate(c1, pool, new Set(), shipImo, shipName);
    if (t) setC2(t);
  }, [c1, c2, q2, pool, shipImo, shipName]);

  const bayPairs = useMemo(() => {
    try { return getBayPairs(pool, voyage?.info?.imo || '', voyage?.info?.vsl || '') || {}; } catch { return {}; }
  }, [pool, voyage]);
  const pairBay = bay ? (bayPairs[String(parseInt(bay, 10))] || null) : null;
  const rowP = row ? String(row).padStart(2, '0') : '';
  const tierP = tier ? String(tier).padStart(2, '0') : '';
  const backPos = pairBay && rowP && tierP ? { bay: pairBay, row: rowP, tier: tierP } : null;
  // TallyOne 1.55: 짝꿍 자리가 **플랜에 있는가**는 컨이 아니라 **칸**에 물어야 한다.
  //   종전엔 "그 좌표에 지금 컨이 있나"로 봐서, 짝 자리 주인이 다른 데로 옮겨 가면
  //   멀쩡한 플랜 자리에 「⚠ 플랜에 없는 자리(싱글 자리)」 경고가 붙었다(칸 소멸 증상 ③).
  const pairSlotPlanned = backPos ? (slotUniverse[backPos.bay] || []).some(sl => sl.row === backPos.row && sl.tier === backPos.tier) : false;

  const resetAll = () => { setQ1(''); setQ2(''); setC1(null); setC2(null); setStep('pick'); setBay(''); setRow(''); setTier(''); setPickBay(null); setManualOpen(false); };

  // V9.48: **지정 자리가 우선이다**(사용자 확정 2026-08-03).
  //   종전엔 [수동 배정 확인]이 두 컨을 무조건 미배정시키고 자리를 다시 고르게 했다.
  //   플랜 짝 자리 그대로 실려 오는 경우가 늘었는데, 맞는 자리를 지우고 다시 찍는 건 헛일이고
  //   손으로 다시 고르다 틀릴 여지만 만든다. → 자리가 맞으면 **그대로 선적확인**,
  //   실제가 다를 때만 [위치 지정]으로 간다.
  const _bn = (v) => (v ? String(parseInt(v, 10)) : '');
  const planPair = useMemo(() => {
    if (!c1 || !c2) return null;
    const b1 = _bn(c1.bay), b2 = _bn(c2.bay);
    if (!b1 || !b2 || !c1.row || !c1.tier || !c2.row || !c2.tier) return null;
    if (c1.row !== c2.row || c1.tier !== c2.tier) return null;   // 같은 row·tier 여야 한 슬롯
    if (bayPairs[b1] !== b2 && bayPairs[b2] !== b1) return null;
    // 앞뒤: **작은 베이가 앞**(지침 — 방향은 규칙으로 고정, 데이터로 추론하지 않는다).
    //   실선박의 짝 맵은 양방향이라(19↔21) 맵만으로는 앞뒤를 가릴 수 없다 — 번호로 가른다.
    return { ok: true, swapped: parseInt(b1, 10) > parseInt(b2, 10) };
  }, [c1, c2, bayPairs]);

  const swapFrontBack = () => {
    const a = c1, b = c2, qa = q1, qb = q2;
    setC1(b); setC2(a); setQ1(qb); setQ2(qa);
  };

  // [지정 자리 그대로 트윈 선적확인] — 재배정 없이 확인만. 위치는 이미 플랜대로다.
  const completeAtPlan = async () => {
    if (busy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    // 1.56: 갱(호기) 없이 완료 금지 — 인건비 근거(검수사 확정).
    if (!equipNo) { alert('갱(호기)을 먼저 선택하세요 — 상단 호기 버튼.'); return; }
    const done = [c1, c2].filter(c => c._comp);
    // 1.53: 네이티브 confirm() 제거 — 브라우저 확인창은 뜨는 순간 앱이 통째로 멈춘다(실측 2026-08-12).
    if (done.length && !(await askYN('이미 선적확인된 컨입니다',
      `${done.map(c => c.cn.slice(-4)).join(', ')}는 이미 선적확인 기록이 있습니다.\n계속할까요?`))) return;
    {   //  3.2-01: 통과분 문지기 — 쓰는 자리 앞에서 한 번 더
      const _tr = [c1, c2].filter(c => !canCompleteContainer(c, 'loading'));
      if (_tr.length) { alert(`평택 선적 대상이 아닙니다 — 통과화물 ${_tr.map(c => `${c.cn?.slice(-4)}(${c.pol || '?'})`).join(', ')}은 선적확인할 수 없습니다.`); return; }
    }
    setBusy(true);
    try {
      // TallyOne 1.55: 마지막 인자 = 갱(호기). 갱이 안 남으면 갱별 대수를 되살릴 수 없다(인건비가 걸린 값).
      await fbCompleteContainersAtomic(voyageKey, 'loading', [c1.cn, c2.cn], inspector, equipNo);
      speakDone({ cn: c1.cn }); setTimeout(() => speakDone({ cn: c2.cn }), 900);
      resetAll();
    } catch (e) {
      alert(`처리 실패 — 선적확인은 찍지 않았습니다. 다시 시도하세요.\n${e?.message || e}`);
    } finally { setBusy(false); }
  };

  // [수동 배정 확인] — 기존 위치를 보여준 상태에서 확인 = 두 컨 즉시 미배정 (사용자 확정)
  // 1.55-02: 프리필 기준 컨을 인자로 — 맞바뀜(⇄)에서는 앞 실물 = c2 의 계획 칸이다.
  //   종전엔 무조건 c1 계획 칸을 집어 줘서, 그대로 확정하면 맞바뀜의 반대(계획 그대로)가 기록됐다(독립 재검증 P0-2).
  const confirmManual = async (prefillC) => {
    const pf = (prefillC && prefillC.cn) ? prefillC : c1;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const done = [c1, c2].filter(c => c._comp);
    if (done.length && !(await askYN('이미 선적확인된 컨입니다',
      `${done.map(c => c.cn.slice(-4)).join(', ')}는 이미 선적확인 기록이 있습니다.\n오선적 기록일 수 있습니다. 계속할까요?`))) return;
    setBusy(true);
    try {
      await fbUnassignContainer(voyageKey, 'loading', c1.cn, inspector);
      await fbUnassignContainer(voyageKey, 'loading', c2.cn, inspector);
      // TallyOne 1.55: **지금 작업 중인 칸이 기본값이어야 한다.**
      //   종전엔 자리 그리드가 빈 상태로 열려, 방금 화면에 떠 있던 그 칸을 검수원이 다시 골라야 했다
      //   (베이 한 번 + 칸 한 번 = 쌍마다 두 번의 헛클릭). 앞 컨의 계획 칸을 미리 집어 준다.
      const b0 = pf.bay ? String(parseInt(pf.bay, 10)) : '';
      if (b0 && pf.row && pf.tier) { setPickBay(b0); setBay(b0); setRow(pf.row); setTier(pf.tier); }
      setStep('pos');
    } catch (e) { alert(`자리 비우기 실패: ${e?.message || e}`); }
    finally { setBusy(false); }
  };

  // TallyOne 1.54: 자리 배정 한 번 — 시퀀스 항차에서 되물어야 하면 앱 안 모달로 묻고 다시 부른다.
  //   ⛔ 네이티브 confirm() 은 뜨는 순간 앱이 통째로 멈춘다(실측 30분 정지). 1.53 에서 전부 걷어냈다.
  //   실패(취소 포함)면 null 을 돌려준다 — 부르는 쪽이 선적확인을 찍지 않고 멈춘다.
  const _seqAsk = async (cn, b, r, t) => {
    let res = await fbReassignContainerPosition(voyageKey, 'loading', cn, b, r, t, inspector, { actualWork: true });
    if (res && res.ok === false && res.needConfirm === 'seqFull') {
      const ok = await askYN('시퀀스 자리입니다', seqFullConfirmText(res), '그래도 넣는다');
      if (!ok) return null;
      res = await fbReassignContainerPosition(voyageKey, 'loading', cn, b, r, t, inspector,
        { actualWork: true, seqConfirmed: true });
    }
    if (!res || res.ok === false) {
      alert(`${cn.slice(-4)} 자리를 배정하지 못했습니다 — 선적확인은 찍지 않았습니다.`);
      return null;
    }
    return res;
  };

  // [트윈 선적확인] — 앞 지정 위치 + 뒤 짝꿍 자동, 재배정 후 완료 2건 원자 처리
  const completeBoth = async () => {
    if (busy) return;
    const bn = parseInt(bay, 10);
    if (!Number.isFinite(bn) || !rowP || !tierP) { alert('앞 컨 위치(Bay/Row/Tier)를 입력하세요'); return; }
    if (!backPos) { alert('짝꿍 베이가 없는 자리입니다 — 싱글 모드로 처리하세요'); return; }
    // 1.56: 갱(호기) 없이 완료 금지 — 갱 없는 완료는 인건비 근거가 없다(검수사 확정).
    if (!equipNo) { alert('갱(호기)을 먼저 선택하세요 — 상단 호기 버튼.\n갱이 없는 완료는 그 갱의 작업 기록이 남지 않습니다 — 아주 중요한 값입니다.'); return; }
    setBusy(true);
    try {
      // ── 1.56: **이 배 자료에 없는 자리 확인** (검수사 확정 — "들어갈 자리 자체가 없는데 선적이 된다는게
      //   컨테이너 하나 분실". TBJU2326007 19-08-06 실사고). 칸 우주(slotUniverse)에 없는 좌표면
      //   저장 전에 묻는다. 시프팅·특수 적재만 통과 — 이유 없이 계속하면 장부에서 분실된다.
      const _known = (b, r, t) => {
        const bb = String(parseInt(b, 10));
        return (slotUniverse[bb] || []).some(s => s.row === String(r) && s.tier === String(t));
      };
      const _rowsTxt = (b) => {
        const bb = String(parseInt(b, 10));
        return [...new Set((slotUniverse[bb] || []).map(s => s.row))].sort().join(' ');
      };
      for (const [lbl, b, r, t] of [['앞', bay, rowP, tierP], ['뒤', backPos.bay, backPos.row, backPos.tier]]) {
        if (!_known(b, r, t) && !(await askYN('이 배 자료에 없는 자리입니다',
          `${lbl} 컨 자리 B${parseInt(b, 10)} ${r}-${t} 는 이 배의 알려진 칸에 없습니다.\n(B${parseInt(b, 10)}에 있는 열: ${_rowsTxt(b) || '없음'})\n분실 사고가 났던 그 경로입니다 — 시프팅·특수 적재가 확실할 때만 계속하세요.`))) return;
      }
      // ── 1.56: **아래 단이 비어 있으면 허공 적재다** (검수사 확정 — "2단이 비었는데 3단 즉 허공에 띄웠습니다").
      //   홀드 02→04→06(→08), 데크 82→84→86 — 아래 칸이 이 배에 있고 아직 실물이 없으면 묻는다.
      const _belowEmpty = (b, r, t) => {
        const n = parseInt(t, 10);
        if (!Number.isFinite(n) || n <= 2 || n === 80 || n === 82) return null;
        const bt = String(n - 2).padStart(2, '0');
        if (!_known(b, r, bt)) return null;
        const o = slotOcc.get(`${parseInt(b, 10)}/${r}/${bt}`);
        return (o && o.done) ? null : bt;
      };
      for (const [lbl, b, r, t] of [['앞', bay, rowP, tierP], ['뒤', backPos.bay, backPos.row, backPos.tier]]) {
        const bt = _belowEmpty(b, r, t);
        if (bt && !(await askYN('아래 단이 비어 있습니다', `${lbl} 컨 자리 ${r}-${t} 아래(${r}-${bt})에 아직 실물이 없습니다.\n허공에 얹는 기록이 됩니다 — 아래부터가 순서입니다. 그래도 계속할까요?`))) return;
      }
      // 1.55-03: 이미 실물이 실린 칸이면 **배정 전에** 묻는다 — firebase 는 차단하지 않고 밀어내며,
      //   이 경로는 그 반환(displacedWasCompleted)을 안 읽어 조용히 지나갔다(독립 재검증 P1-11).
      const _occAt = (b, r, t) => { const n = parseInt(b, 10); const o = slotOcc.get(`${Number.isFinite(n) ? n : b}/${r}/${t}`); return (o && o.done) ? o : null; };
      const _hits = [_occAt(bay, rowP, tierP), _occAt(backPos.bay, backPos.row, backPos.tier)].filter(Boolean);
      if (_hits.length && !(await askYN('이미 실물이 실린 칸입니다',
        `${_hits.map(o => String(o.cn).slice(-4)).join(', ')} 가 그 칸에 이미 선적확인돼 있습니다.\n계속하면 그 기록이 밀려납니다. 계속할까요?`))) return;
      // V9.52: 자리 교환 — 밀려난 계획 컨은 이 컨의 옛 자리로 옮겨 대기(미배정 떠돌이 방지)
      // TallyOne 1.54: `actualWork` 는 **자연어 탭의 자동/수동 모드**에서 온 것이지 시퀀스 여부가 아니다.
      //   (앞선 판이 "자동=시퀀스, 수동=액츄얼"로 잘못 읽었다 — 검수사가 오늘 정정했다.
      //    시퀀스 여부는 항차 속성 `info.seqFull` 이고, firebase 가 그것으로 판정한다.)
      //   시퀀스 항차면 함수가 **아무것도 쓰지 않고** `needConfirm:'seqFull'` 로 돌아선다 —
      //   안 받으면 조용한 실패다(선적확인만 찍히고 자리는 그대로).
      const r1 = await _seqAsk(c1.cn, bay, rowP, tierP);
      if (!r1) return;
      const r2 = await _seqAsk(c2.cn, backPos.bay, backPos.row, backPos.tier);
      if (!r2) return;
      {   //  3.2-01: 통과분 문지기
        const _tr = [c1, c2].filter(c => !canCompleteContainer(c, 'loading'));
        if (_tr.length) { alert(`평택 선적 대상이 아닙니다 — 통과화물 ${_tr.map(c => `${c.cn?.slice(-4)}(${c.pol || '?'})`).join(', ')}은 선적확인할 수 없습니다.`); return; }
      }
      await fbCompleteContainersAtomic(voyageKey, 'loading', [c1.cn, c2.cn], inspector, equipNo);   // 1.55: 갱(호기)
      speakDone({ cn: c1.cn }); setTimeout(() => speakDone({ cn: c2.cn }), 900);
      resetAll();
    } catch (e) { alert(`처리 실패 — 선적확인은 찍지 않았습니다. 다시 시도하세요.\n${e?.message || e}`); }
    finally { setBusy(false); }
  };

  const pickBox = (label, color, q, setQ, cSel, setCSel, rr) => (
    <div className={`bg-ink-900 border ${color === 'amber' ? 'border-amber-700/40' : 'border-cyan-700/40'} rounded-pill p-3`}>
      <div className={`text-2xs font-bold mb-2 flex items-center gap-1 ${color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>
        <span className={`${color === 'amber' ? 'bg-amber-700 text-amber-50' : 'bg-cyan-700 text-cyan-50'} px-1.5 py-0.5 rounded text-2xs font-black`}>{label}</span>
        {label} 컨테이너 — 끝4자리
      </div>
      <input type="text" value={q} onChange={e => setQ(e.target.value.toUpperCase())}
        placeholder="끝 4자리 또는 컨번호" inputMode="numeric" autoComplete="off"
        className={`w-full px-3 py-3 bg-ink-800 border rounded text-2xl font-black mono text-center tracking-widest focus:outline-none ${color === 'amber' ? 'border-amber-700/40 text-amber-200 focus:border-amber-500' : 'border-cyan-700/40 text-cyan-200 focus:border-cyan-500'}`}/>
      {cSel ? (
        <div className="mt-2 flex items-center justify-between bg-ink-800 rounded px-2 py-1.5">
          <div>
            <span className="mono text-sm font-bold text-dim-100">{cSel.cn}</span>
            <span className="ml-2 text-2xs mono text-dim-300">기존 위치 {cSel.bay ? fmtPos(cSel) : '자리 없음'}</span>
            {cSel._comp && <span className="ml-1 px-1 rounded bg-rose-800 text-rose-200 text-2xs font-bold">⚠ 완료기록</span>}
          </div>
          <button onClick={() => { setCSel(null); setQ(''); }} className="text-xxs text-dim-300 px-1.5">✕</button>
        </div>
      ) : (
        <>
          {q.length >= 2 && rr.length === 0 && <div className="mt-2 text-xxs text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
          {rr.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {rr.map(c => (
                <button key={c.cn} onClick={() => setCSel(c)}
                  className="bg-ink-800 hover:bg-ink-750 px-2 py-0.5 rounded text-2xs mono text-dim-100">
                  {c.cn}{c._comp ? ' ⚠완료' : ''}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* 1.54: 확인창은 앱 안에서 뜬다 — 이 컴포넌트에는 모달이 없어 askYN 이 터졌다. */}
      <ConfirmModal {...confirmState} />
      {onBackToAuto && (
        <button onClick={onBackToAuto}
          className="w-full text-xxs text-dim-200 py-2 bg-ink-800 border border-line rounded hover:bg-ink-750">
          ← 조회 방식으로 돌아가기 (실번호 확인 화면)
        </button>
      )}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-pill p-2 text-xs text-blue-300 text-center">
        📍 위치 지정 방식 — 두 컨을 직접 묶고 자리를 새로 정합니다
        <div className="text-2xs text-blue-400/70 mt-0.5">지정 자리대로면 그대로 확인 · 실제가 다를 때만 위치를 고칩니다</div>
      </div>
      {step === 'pick' && (
        <>
          {pickBox('앞', 'amber', q1, setQ1, c1, setC1, r1)}
          {pickBox('뒤', 'cyan', q2, setQ2, c2, setC2, r2)}

          {/* V9.48: 앞뒤가 바뀌어 들어온 경우 — 지우고 다시 치게 하지 않고 바꿔 준다.
              ── TallyOne 1.55: **막지 않는다.** 검수사 실증 2026-08-12(DXQD 2631W) —
              `15-06-04` 와 `17-06-04` 는 **실제로 서로 맞바뀌어 실렸다.**
              종전에는 뒤바뀜을 보면 「⇅ 앞뒤 바꾸기」만 남기고 진행 버튼을 전부 없애서
              **사실대로 기록할 길이 없었다.** 검수사는 싱글 2건으로 우회해야 했다.
              → 뒤바뀜은 **경고로만** 두고 진행 버튼을 둘 다 남긴다. 고르는 것은 검수원이다. */}
          {c1 && c2 && planPair && planPair.swapped && (
            <div className="bg-indigo-950/50 border border-indigo-700 rounded-pill p-3 space-y-2">
              <div className="text-xs2 text-indigo-200 leading-snug">
                ⚠ 플랜상 앞은 <b className="mono">{c2.cn?.slice(-4)}</b>(B{_bn(c2.bay)}) 입니다 — 앞뒤가 반대로 들어왔습니다.
                <div className="text-xxs text-indigo-300/80 mt-1 leading-snug">
                  입력 순서만 바뀐 것이면 <b>⇅</b> 를 누르세요.<br/>
                  실제로 맞바뀌어 실렸으면 그대로 <b>[위치 지정]</b> 으로 사실대로 적으세요 — 막지 않습니다.
                </div>
              </div>
              <button onClick={swapFrontBack}
                className="w-full px-3 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-indigo-50 text-xs font-bold">
                ⇅ 앞뒤 바꾸기 (입력 순서만 틀렸을 때)
              </button>
            </div>
          )}

          {/* V9.48: 지정 자리가 우선 — 플랜 짝 자리 그대로면 미배정 없이 바로 확인 */}
          {c1 && c2 && planPair && (
            <>
              <div className={`rounded-pill p-3 border ${planPair.swapped ? 'bg-indigo-950/30 border-indigo-700/60' : 'bg-emerald-950/40 border-emerald-700/60'}`}>
                <div className={`text-xxs font-bold mb-1.5 flex items-center gap-1 ${planPair.swapped ? 'text-indigo-300' : 'text-emerald-300'}`}>
                  <Link2 className="w-3.5 h-3.5"/>{planPair.swapped ? '지정 자리 — 앞뒤가 플랜과 반대입니다' : '지정 자리 — 플랜 그대로 (짝 확인됨)'}
                </div>
                <div className="flex items-center justify-center gap-3 text-sm mono">
                  <span className="text-amber-200 font-black">{c1.cn?.slice(-4)} <span className="text-dim-300 font-normal">{fmtPos(c1)}</span></span>
                  <span className="text-dim-500">+</span>
                  <span className="text-cyan-200 font-black">{c2.cn?.slice(-4)} <span className="text-dim-300 font-normal">{fmtPos(c2)}</span></span>
                </div>
              </div>
              {/* 자리를 옮기지 않고 확인만 찍는다 — 앞뒤 입력 순서와 무관하게 안전하다. */}
              <button onClick={completeAtPlan} disabled={busy}
                className="w-full py-4 rounded-pill font-bold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                {busy ? '처리 중…' : '✅ 지정 자리 그대로 트윈 선적확인'}
              </button>
              {/* ── TallyOne 1.55: 액츄얼 작업에서 다른 것은 **자리가 아니라 번호**다(검수사 확정 2026-08-12).
                  종전 문구 「실제 자리가 다릅니다 — 위치 지정하기」는 **오도한다** — 자리는 계획대로 전부 찬다.
                  예외 경로로 내리고 문구를 사실에 맞게 고친다. 다만 앞뒤가 반대로 실린 경우는
                  이것이 **사실대로 적는 유일한 길**이라 접지 않고 그대로 내놓는다. */}
              {planPair.swapped ? (
                <button onClick={() => confirmManual(c2)} disabled={busy}
                  className="w-full py-3 rounded-pill font-bold text-sm bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-indigo-50">
                  ⇄ 실제로 맞바뀌어 실렸습니다 — 위치 지정
                </button>
              ) : (
                <details className="bg-ink-800 border border-line-strong rounded-pill">
                  {/* 1.56-05: 위치 지정임이 먼저 보이게 + 버튼처럼 (검수사 지적 2026-08-12 밤) */}
                  <summary className="px-3 py-2.5 text-sm2 font-bold text-dim-100 cursor-pointer select-none hover:bg-ink-750 rounded-pill">📍 위치 지정 — 계획에 없는 칸에 실렸을 때 <span className="text-dim-300 font-normal">▼ 눌러서 열기</span></summary>
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    <div className="text-2xs text-dim-400 leading-snug">
                      번호가 다른 컨이 온 것이라면 이 길이 아닙니다 — 카드의 <b className="text-cyan-300">[컨테이너 번호 수정]</b> 을 쓰세요.
                    </div>
                    <button onClick={() => confirmManual()} disabled={busy}
                      className="w-full py-2 rounded-pill text-xs2 bg-ink-800 hover:bg-ink-750 border border-line text-dim-200 disabled:opacity-50">
                      계획에 없는 칸에 실렸습니다 — 위치 지정
                    </button>
                  </div>
                </details>
              )}
            </>
          )}

          {/* 짝 자리가 아니거나 미배정 — 종전대로 자리를 지정한다 */}
          {c1 && c2 && !planPair && (
            <>
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-pill p-2 text-xxs text-amber-200 text-center leading-snug">
                {(!c1.bay || !c2.bay)
                  ? '두 컨 중 지정 자리가 없는 쪽이 있습니다 — 위치를 지정하세요.'
                  : '플랜상 짝 자리가 아닙니다 — 위치를 지정하세요.'}
              </div>
              <button onClick={() => confirmManual()} disabled={busy}
                className="w-full py-3 rounded-pill font-bold text-base bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                <Link2 className="w-5 h-5"/>{busy ? '처리 중…' : '수동 배정 확인 — 두 컨 자리를 비우고 위치 지정'}
              </button>
            </>
          )}
        </>
      )}
      {step === 'pos' && c1 && c2 && (
        <div className="bg-ink-900 border border-amber-700 rounded-pill p-3 space-y-3">
          <div className="text-xs text-amber-300 font-bold">앞 {c1.cn?.slice(-4)} 위치 — 자리 선택</div>
          {/* TallyOne 1.55: 칸의 세 갈래를 그대로 적어 준다 — 「이름표만 걸린 칸」은 고를 수 있다. */}
          <div className="text-2xs text-dim-300 leading-snug">
            <span className="text-dim-400">✓회색</span> = 그 칸에 <b>실린 컨</b>이 있습니다(선택 불가) ·
            <span className="text-sky-300"> 🏷파랑</span> = <b>이름표만</b> 걸린 칸(주인은 아직 안 실림, 선택 가능) · 나머지 = 빈 칸
          </div>
          {/* V8.83: 위치수정 창과 같은 자리 선택 그리드 — 직접 입력은 접이식으로 (사용자 확정) */}
          {!pickBay ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(slotsByBay).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(b => {
                // TallyOne 1.55: 남은 자리 = **완료된 컨이 실제로 있는 칸을 뺀 수.**
                //   종전엔 "이 컨이 완료됐나"로 셌다 — 계획 주인이 창고로 가 버리면 칸이 통째로 사라져
                //   다 찬 베이에 「남은 N자리」가 뜨고, 반대로 4칸이 비어 있는데 「남은 0자리」로 잠겼다.
                const remain = slotsByBay[b].filter(s => !s.done).length;
                const named = slotsByBay[b].filter(s => s.named).length;
                return (
                  <button key={b} onClick={() => remain > 0 && setPickBay(b)} disabled={remain === 0}
                    className={`py-2.5 rounded-pill border font-black ${remain > 0 ? 'bg-ink-800 hover:bg-amber-800 border-line-strong hover:border-amber-500 text-dim-100' : 'bg-ink-900 border-line text-dim-500'}`}>
                    <div className="mono text-base">B{b}</div>
                    <div className="text-2xs font-bold text-dim-300">
                      {remain > 0 ? `남은 ${remain}자리` : '끝났습니다'}
                      {named > 0 && <span className="ml-1 text-sky-300">🏷{named}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-amber-300 font-bold">📍 BAY {pickBay} — 자리 선택</div>
                <button onClick={() => { setPickBay(null); setBay(''); setRow(''); setTier(''); }} className="text-xxs text-dim-300 px-2 py-1 border border-line rounded">← 베이 다시 선택</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(slotsByBay[pickBay] || []).map(sl => sl.done ? (
                  /* done — 그 칸에 **완료된 컨이 실제로** 있다. 선택 불가. */
                  <span key={`${sl.row}-${sl.tier}`} title={sl.cn || ''}
                    className="px-2.5 py-2 rounded-pill bg-ink-900 border border-line mono text-sm font-bold text-dim-500 cursor-not-allowed">✓{sl.row}-{sl.tier}</span>
                ) : (
                  /* named — 이름표만 걸린 칸(계획 주인은 아직 창고). **선택 가능**하고 그 컨 끝4자리를 같이 보여 준다.
                     empty — 진짜 빈 칸. */
                  <button key={`${sl.row}-${sl.tier}`} onClick={() => { setBay(sl.bay); setRow(sl.row); setTier(sl.tier); }}
                    className={`px-2.5 py-2 rounded-pill border mono text-sm font-bold flex flex-col items-center leading-tight ${
                      row === sl.row && tier === sl.tier && bay === sl.bay
                        ? 'bg-amber-700 border-amber-400 text-amber-50'
                        : sl.named
                          ? 'bg-ink-800 hover:bg-amber-800 border-sky-700/70 hover:border-amber-500 text-dim-100'
                          : 'bg-ink-800 hover:bg-amber-800 border-line-strong hover:border-amber-500 text-dim-100'}`}>
                    <span>{sl.row}-{sl.tier}</span>
                    {sl.named && <span className="text-3xs font-bold text-sky-300">🏷{String(sl.cn || '').slice(-4)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setManualOpen(v => !v)}
            className="w-full py-1.5 text-xxs text-dim-300 hover:text-dim-100 border border-dashed border-line rounded">
            {manualOpen ? '▲ 직접 입력 닫기' : '▼ 직접 입력 (플랜에 없는 자리)'}
          </button>
          {manualOpen && (
          <div className="grid grid-cols-3 gap-2">
            {[['BAY', bay, setBay, 3], ['ROW', row, setRow, 2], ['TIER', tier, setTier, 2]].map(([lb, v, setV, mx]) => (
              <div key={lb}>
                <label className="text-2xs text-dim-400 font-bold">{lb}</label>
                <input type="text" inputMode="numeric" value={v}
                  onChange={e => setV(e.target.value.replace(/[^\d]/g, '').slice(0, mx))}
                  className="w-full px-3 py-3 bg-ink-800 border border-line rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
            ))}
          </div>
          )}
          {bay && rowP && tierP && (
            backPos ? (
              <div className="bg-cyan-950/40 border border-cyan-800 rounded p-2 text-xs text-cyan-200">
                뒤 <span className="mono font-bold">{c2.cn?.slice(-4)}</span> → 짝꿍 자리 <span className="mono font-black">{backPos.bay}-{backPos.row}-{backPos.tier}</span> 자동 배정
                {!pairSlotPlanned && <div className="mt-1 text-amber-300 font-bold">⚠ 플랜에 없는 자리(싱글 자리)입니다 — 실물 기준으로 진행 가능</div>}
              </div>
            ) : (
              <div className="bg-rose-950/40 border border-rose-800 rounded p-2 text-xs text-rose-300 font-bold">
                ⚠ 베이 {parseInt(bay, 10)}는 짝꿍 베이가 없습니다 — 싱글 자리입니다. 싱글 모드로 처리하세요.
              </div>
            )
          )}
          <button onClick={completeBoth} disabled={busy || !backPos}
            className="w-full py-3 rounded-pill font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center gap-2">
            <Check className="w-5 h-5"/>{busy ? '처리 중…' : '트윈 선적확인 (두 대 한 번에)'}
          </button>
          <button onClick={() => setStep('pick')} className="w-full text-xxs text-dim-300 py-1">← 컨 선택으로</button>
        </div>
      )}
    </>
  );
}

// ─── 트윈 모드 (자동 짝꿍) ───
function TwinSearch({ voyage, voyageKey, inspector, allContainers, workFilter, onOpenContainer, onManualMode = null, workGroup = null, workTier = null, slotSource = null, bayPairsIn = null }) {
  const [confirmState, askConfirm] = useConfirm();   // 1.49: 맞교환 확인창 — 브라우저 confirm 대체
  // 1.53: 기다릴 수 있는 물음 — 네이티브 confirm() 은 렌더러를 멈춰 앱을 굳힌다.
  const askYN = (title, message) => new Promise(r => askConfirm({ title, message, confirmLabel: '계속', danger: true, onConfirm: () => r(true), onCancel: () => r(false) }));
  const [q1, setQ1] = useState('');
  const [c1, setC1] = useState(null); // 앞 컨테이너 (선택됨)
  const [c2, setC2] = useState(null); // 뒤 컨테이너 (선택됨, 자동 짝꿍)
  const autoTwin = true; // V9.57(I15): 죽은 토글 정리 — setAutoTwin 참조 0(전수 grep)·UI 토글 없음 → 상수화
  // V9.50: 검수사가 '실제 온 컨'으로 갈아 끼웠으면 자동 계산이 그걸 덮어쓰면 안 된다.
  const [replaced, setReplaced] = useState(false);
  const [twinBusy, setTwinBusy] = useState(false); // 통합 완료 처리 중
  const equipNo = useEquipNo();   // TallyOne 1.55: 완료 기록에 갱(호기)을 남긴다

  // 이미 검수 완료된 컨번호 = 짝 후보에서 제외
  // 같은 트윈 작업으로 묶이지 않도록
  const r1 = useMemo(() => {
    if (!q1 || q1.length < 2) return [];
    const Q = q1.toUpperCase();
    //  3.2-01: 트윈 앞 컨 후보도 **작업분**(평택분·시프팅·초과)만 — 통과분이 «유일 후보»로 남아 자동 선택되던 자리(싱글과 한 벌).
    return allContainers.filter(c => {
      if (!canCompleteContainer(c, c._mode)) return false;
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
  // TallyOne 1.55: 작업 모드 3갈래 — 'fullSeq' | 'fullOnlySeq' | 'allActual'.
  //   검수사 확정 2026-08-12 — *"EDI가 실어라 한대로 실었습니다. 이게 액츄얼 작업입니다."*
  //   액츄얼에서 검수원이 하는 일은 **칸의 번호를 바꾸는 것**이지 자리를 옮기는 것이 아니다.
  const seqMode = voyage?.info?.seqMode || '';
  useEffect(() => {
    if (replaced) return;   // V9.50: 손으로 바꿔 놓은 카드를 자동 짝꿍이 되돌리지 않는다
    if (r1.length === 1 && autoTwin) {
      const front = r1[0];
      // 증상2 수정: 같은 앞 컨이 이미 선택돼 있으면(완료로 인한 재실행 등)
      //   화면을 다시 계산해 갈아엎지 않고 현재 짝꿍을 유지한다.
      if (c1 && c1.cn === front.cn) return;
      setC1(front);
      // 짝꿍 탐색 시 완료된 컨도 후보에 포함(excludeCns 비움)해야
      //   앞을 먼저 완료해도 뒤 컨이 계속 보인다.
      const twin = findTwinCandidate(front, allContainers, new Set(), shipImo, shipName);
      setC2(twin && canCompleteContainer(twin, twin._mode) ? twin : null);   // 3.2-01: 통과분은 짝꿍이 못 된다(수동 지정으로)
    } else if (r1.length === 0) {
      setC1(null);
      setC2(null);
    } else if (r1.length > 1) {
      // V7.60: 끝4자리 중복 — 사용자가 선택 버튼으로 고른 컨이 후보 안에 있으면 유지.
      //   (구) 무조건 null → 버튼 클릭으로 선택해도 즉시 지워져 "선택이 안 됨" (메모 버그).
      if (!c1 || !r1.some(c => c.cn === c1.cn)) { setC1(null); setC2(null); }
    }
  }, [r1, autoTwin, allContainers, shipImo, shipName, c1, replaced]);

  // 증상3 수정: 옛 c1/c2 객체의 _comp는 갱신되지 않으므로,
  //   최신 allContainers에서 두 컨의 완료 여부를 다시 조회해 판단한다.
  const handleAfterComplete = () => {
    if (!c1) return;
    const isComp = (cn) => {
      const live = allContainers.find(x => x.cn === cn);
      //  3.2-01: allContainers 는 완료분이 빠진 풀(filteredContainers)이라, 완료된 컨은 «없음»으로 온다 — 없으면 완료다.
      //    종전엔 undefined → false 라 q1 이 안 비워져, 남은 후보(통과분)로 카드가 말없이 갈아 끼워졌다.
      return !live || !!live._comp;
    };
    const c1Done = isComp(c1.cn);
    const c2Done = c2 ? isComp(c2.cn) : true; // 짝꿍 없으면 앞 컨만으로 판단
    if (c1Done && c2Done) {
      setReplaced(false); setQ1(''); setC1(null); setC2(null);
    }
  };

  // 통합 완료: 앞+뒤를 한 번에 처리
  const handleCompleteBoth = async () => {
    if (!c1 || !c2 || twinBusy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    // 1.56: 갱(호기) 없이 완료 금지 — 인건비 근거(검수사 확정).
    if (!equipNo) { alert('갱(호기)을 먼저 선택하세요 — 상단 호기 버튼.'); return; }
    //  3.2-01: 통과분은 완료할 수 없다(감사 P1-2 — 뒤 칸에 통과분이 남는 길).
    const _tr = [c1, c2].filter(c => !c._comp && !canCompleteContainer(c, c._mode)).map(c => `${c.cn?.slice(-4)}(${c._mode === 'loading' ? c.pol : c.pod})`);
    if (_tr.length) { alert(`평택 작업 대상이 아닙니다 — 통과화물 ${_tr.join(', ')}은 확인할 수 없습니다.`); return; }
    // V8.09-06: XRAY 대상은 XRAY 실번호(seal) 입력 전까지 양하확인 차단.
    const xMiss = (c) => c._mode === 'discharge' && c._xray && !String(c._xraySeal?.seal || '').trim();
    const miss = [c1, c2].filter(c => !c._comp && xMiss(c)).map(c => c.cn?.slice(-4));
    if (miss.length) {
      alert(`XRAY 실번호를 먼저 입력하세요.\nXRAY 대상 (${miss.join(', ')})은 실번호 입력 전까지 양하확인할 수 없습니다.`);
      return;
    }
    setTwinBusy(true);
    try {
      // TallyOne 1.46: **둘 다 되거나 둘 다 안 되거나** — 순차 2회 write 를 원자 1회로.
      //   종전엔 fbCompleteContainer 를 한 건씩 두 번 불렀다. 앞이 반영되는 순간 그 컨이
      //   목록(filteredContainers)에서 빠져 카드가 통째로 사라지므로, 뒤가 실패해도
      //   화면에는 "처리된 것"처럼 보였다(catch 도 없어 조용히 묻혔다).
      const cns = [c1, c2].filter(c => !c._comp).map(c => c.cn);
      if (cns.length) await fbCompleteContainersAtomic(voyageKey, c1._mode, cns, inspector, equipNo);   // 1.55: 갱(호기)
      setTimeout(() => { setReplaced(false); setQ1(''); setC1(null); setC2(null); }, 500);
    } catch (e) {
      alert('처리 실패 — 선적확인은 찍지 않았습니다. 다시 시도해 주세요.\n' + (e?.message || e));
    } finally {
      setTwinBusy(false);
    }
  };

  // V9.50: 번호 수정으로 '실제 온 컨'이 확정되면 그 카드를 갈아 끼운다.
  //   계획 컨은 그 자리에서 밀려나 **이 컨의 옛 계획 자리로** 옮겨진다(V9.52 자리 교환) — 화면도 그걸 따라간다.
  //   최신 상태(allContainers)가 이미 왔으면 그 값을 쓰고, 아직이면 방금 지정한 자리를 얹는다.
  const _freshen = (nc) => {
    const live = allContainers.find(x => x.cn === nc.cn);
    return { ...(live || {}), ...nc, _replaced: true };
  };
  const replaceFront = (nc) => { setReplaced(true); setC1(_freshen(nc)); };
  const replaceBack = (nc) => { setReplaced(true); setC2(_freshen(nc)); };

  const handleSwapTwin = () => {
    setReplaced(false);
    setC2(null);
  };

  // V8.25: 트윈 앞뒤 위치 맞교환 — 다른 항에서 앞/뒤 자리를 바꿔 적재하고 미수정인 경우 한 번에 교정.
  //   앞(c1)을 뒤(c2) 자리로 보내면 fbReassign swap이 c2를 c1 원자리로 자동 이동. 완료 처리는 안 함.
  const handleSwapPos = () => {
    if (!c1 || !c2 || twinBusy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    // TallyOne 1.49: 브라우저 confirm() 은 렌더러를 통째로 멈춘다 — 검수원에게는 "앱이 굳은" 것으로 보인다.
    //   실측 2026-08-11: 이 버튼을 누르고 30초 무응답이 두 번. 화면이 멈춘 게 아니라 대화상자가 떠 있었다.
    askConfirm({
      title: '앞뒤 위치 맞바꾸기',
      message: `앞 ${c1.cn?.slice(-4)} ↔ 뒤 ${c2.cn?.slice(-4)}\n자리만 교환합니다. 완료 처리는 하지 않습니다.`,
      confirmLabel: '맞바꾸기',
      onConfirm: () => doSwapPos(),
    });
  };

  const doSwapPos = async () => {
    setTwinBusy(true);
    try {
      const _aPos = { bay: c1.bay, row: c1.row, tier: c1.tier };
      const _bPos = { bay: c2.bay, row: c2.row, tier: c2.tier };
      // TallyOne 1.49: **앞 컨만 옮기고 뒤 컨을 그대로 둬서 한 칸을 두 대가 차지했다**
      //   (실측 2026-08-11: DWSU3001185 · DWSU3000276 둘 다 17-06-04).
      //   비우고 → 채우고 → 채운다. 중간 어느 시점에도 중복이 생기지 않는다.
      // TallyOne 1.54: **검수사가 이미 앱 안 모달에서 맞바꾸기를 확인하고 온 길이다.**
      //   시퀀스 항차라고 여기서 또 물으면, 한 번 누른 교환을 두 번 더 확인시키는 꼴이고
      //   중간에 취소되면 앞 컨만 비워진 채 남는다(한 칸 두 대의 반대 사고). → `seqConfirmed` 로 못 박는다.
      await fbReassignContainerPosition(voyageKey, c1._mode, c1.cn, '', '', '', inspector);
      await fbReassignContainerPosition(voyageKey, c2._mode, c2.cn, _aPos.bay, _aPos.row, _aPos.tier, inspector, { seqConfirmed: true });
      await fbReassignContainerPosition(voyageKey, c1._mode, c1.cn, _bPos.bay, _bPos.row, _bPos.tier, inspector, { seqConfirmed: true });
      setC1({ ...c1, ..._bPos });
      setC2({ ...c2, ..._aPos });
      speak('앞뒤 위치를 맞바꿨습니다');
    } finally { setTwinBusy(false); }
  };

  return (
    <>
      <ConfirmModal {...confirmState} />
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-pill p-2 text-xs text-blue-300 text-center">
        🚛 트윈: 앞 컨 입력 → EDI 베이 분석으로 짝꿍 자동 추천
        <div className="text-2xs text-blue-400/70 mt-0.5">완료된 컨은 짝 후보 제외 · 통로 사이 단독 베이는 짝 없음</div>
      </div>

      {/* TallyOne 1.55: 액츄얼 항차에서 주 경로는 **번호 수정**이다 — 자리는 계획대로 전부 찬다. */}
      {seqMode === 'allActual' && (
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-pill px-2.5 py-1.5 text-xxs text-cyan-200 leading-snug">
          🔁 액츄얼 작업 — <b>자리는 계획대로</b> 찹니다. 다른 컨이 왔으면 카드의 <b>[컨테이너 번호 수정 (다른 컨이 옴)]</b> 을 쓰세요.
        </div>
      )}

      <div className="bg-ink-900 border border-amber-700/40 rounded-pill p-3">
        <div className="text-2xs text-amber-400 font-bold mb-2 flex items-center gap-1">
          <span className="bg-amber-700 text-amber-50 px-1.5 py-0.5 rounded text-2xs font-black">앞</span>
          앞 컨테이너 — 끝4자리
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim-400"/>
          <input type="text" value={q1}
            onChange={e => { setReplaced(false); setQ1(e.target.value.toUpperCase()); }}
            placeholder="끝 4자리 또는 컨번호"
            inputMode="numeric" autoComplete="off"
            className="w-full pl-9 pr-10 py-3 bg-ink-800 border border-amber-700/40 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          {q1 && <button onClick={() => { setReplaced(false); setQ1(''); setC1(null); setC2(null); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-dim-400"/></button>}
        </div>
        {q1.length >= 2 && r1.length === 0 && <div className="mt-2 text-xxs text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
        {r1.length > 1 && (
          <div className="mt-2 text-xxs text-amber-400 text-center">
            {r1.length}개 일치 — 정확히 입력 또는 선택:
            <div className="flex flex-wrap gap-1 mt-1 justify-center">
              {r1.slice(0, 8).map(c => (
                <button key={c.cn} onClick={() => { setC1(c); setC2(findTwinCandidate(c, allContainers, new Set(), shipImo, shipName)); }}
                  className="bg-ink-800 hover:bg-ink-750 px-2 py-0.5 rounded text-2xs mono text-amber-300">
                  {c.cn}{/* 3.3-01: 자리까지 보여야 고른다 */}
                  <span className="ml-1 text-3xs text-rose-300 font-black">{c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TallyOne 1.46: 트윈 확인 버튼을 **카드 위로** 올린다 (검수사 지적 2026-08-11).
          원인 원문 — *"그이유가 버튼 위치입니다. 맨밑에 있을 것입니다 '두 컨테이너 동시 선적' 비슷하게.
          그게 안보이면 그냥 선적을 누릅니다."*
          종전에는 앞 카드·뒤 카드 두 장을 지나 맨 아래에 있어서 스크롤하지 않으면 안 보였다.
          각 카드 안에는 개별 「선적확인」이 있으므로, 검수원은 먼저 보이는 그것을 누르고
          **앞 컨만 기록되고 뒤 컨은 미배정으로 떠돌았다**(실측: 5881 완료 / 짝 5755 자리·완료 모두 없음). */}
      {c1 && c2 && (
        <button onClick={handleCompleteBoth} disabled={twinBusy}
          className="w-full py-3 rounded-pill font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
          <Link2 className="w-5 h-5"/>
          {twinBusy ? '처리 중…' : (c1._mode === 'discharge' ? '트윈 한 번에 양하확인 (두 대)' : '트윈 한 번에 선적확인 (두 대)')}
        </button>
      )}

      {c1 && (
        <BigResultCard voyagePhotos={voyage?.photos || null} c={c1} allContainers={allContainers}
          voyageKey={voyageKey} inspector={inspector}
          onOpen={() => onOpenContainer?.(c1)}
          onAfterComplete={handleAfterComplete}
          onReplace={replaceFront}
          workGroup={workGroup} workTier={workTier} twinPartner={c2} slotSource={slotSource} bayPairsIn={bayPairsIn}
          label="앞" labelColor="amber"
        />
      )}

      {/* 짝꿍 표시 / 수정 */}
      {c1 && (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 border-t border-line"/>
          <div className="text-2xs text-dim-400 font-bold flex items-center gap-1">
            <Link2 className="w-3 h-3"/>트윈 짝꿍
          </div>
          <div className="flex-1 border-t border-line"/>
        </div>
      )}

      {c1 && c2 && (
        <BigResultCard voyagePhotos={voyage?.photos || null} c={c2} allContainers={allContainers}
          voyageKey={voyageKey} inspector={inspector}
          onOpen={() => onOpenContainer?.(c2)}
          onAfterComplete={handleAfterComplete}
          onReplace={replaceBack}
          workGroup={workGroup} workTier={workTier} twinPartner={c1} slotSource={slotSource} bayPairsIn={bayPairsIn}
          label={c2._replaced ? '뒤 (실제 온 컨)' : '뒤 (자동)'} labelColor="cyan"
        />
      )}

      {c1 && !c2 && (
        <ManualTwinPicker allContainers={allContainers} c1={c1} onPick={setC2}/>
      )}

      {c1 && c2 && (
        <button onClick={handleSwapTwin} className="w-full text-xs text-dim-300 hover:text-amber-300 py-2 bg-ink-900 rounded">
          뒤 컨 짝꿍 변경 (수동 선택)
        </button>
      )}

      {c1 && c2 && (
        <button onClick={handleSwapPos} disabled={twinBusy}
          className="w-full text-xs font-bold text-indigo-100 py-2 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-50 rounded flex items-center justify-center gap-1">
          ⇅ 앞뒤 맞교환
        </button>
      )}

      {/* V9.49: 선적에서 계획에 없는 칸에 실렸을 때 — 두 컨을 직접 묶어 자리를 새로 정하는 방식.
          ── TallyOne 1.55: 종전 문구 「실제 자리가 플랜과 다릅니다」는 **액츄얼에서 오도한다** —
          액츄얼에서 다른 것은 자리가 아니라 번호다(검수사 확정 2026-08-12). 예외 경로로 접어 둔다. */}
      {onManualMode && (
        <details className="bg-ink-800 border border-line-strong rounded-pill">
          {/* 1.56-05: 위치 지정임이 먼저 보이게 + 버튼처럼 (검수사 지적 2026-08-12 밤) */}
          <summary className="px-3 py-2.5 text-sm2 font-bold text-dim-100 cursor-pointer select-none hover:bg-ink-750 rounded-pill">📍 위치 지정 — 계획에 없는 칸에 실렸을 때 <span className="text-dim-300 font-normal">▼ 눌러서 열기</span></summary>
          <div className="px-3 pb-3 pt-1 space-y-2">
            <div className="text-2xs text-dim-400 leading-snug">
              번호가 다른 컨이 온 것이라면 이 길이 아닙니다 — 위 카드의 <b className="text-cyan-300">[컨테이너 번호 수정]</b> 을 쓰세요.
            </div>
            <button onClick={onManualMode}
              className="w-full text-xxs text-dim-200 hover:text-amber-300 py-2 bg-ink-800 border border-line rounded">
              계획에 없는 칸에 실렸습니다 — 위치 지정 방식으로
            </button>
          </div>
        </details>
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
      if (!canCompleteContainer(c, c._mode)) return false;   // 3.2-01: 통과분은 짝꿍 후보가 아니다
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      if (Q.length === 4) return last4 === Q;
      // TallyOne 1.55: 전체 컨번호도 받는다 — 다른 입력칸과 규칙을 하나로.
      return last4.endsWith(Q) || (c.cn || '').toUpperCase().includes(Q);
    }).slice(0, 8);
  }, [q, allContainers, c1]);

  return (
    <div className="bg-ink-900 border border-cyan-700/40 rounded-pill p-3">
      <div className="text-2xs text-cyan-400 font-bold mb-2 flex items-center gap-1">
        <span className="bg-cyan-700 text-cyan-50 px-1.5 py-0.5 rounded text-2xs font-black">뒤</span>
        짝꿍 자동 못 찾음 — 수동 입력
      </div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim-400"/>
        <input type="text" value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          placeholder="끝 4자리"
          inputMode="numeric" autoComplete="off"
          className="w-full pl-9 pr-3 py-3 bg-ink-800 border border-cyan-700/40 rounded text-2xl font-black mono text-cyan-200 text-center tracking-widest focus:outline-none focus:border-cyan-500"/>
      </div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {matches.map(c => (
            <button key={c.cn} onClick={() => onPick(c)}
              className="bg-ink-800 hover:bg-ink-750 px-2 py-1 rounded text-xxs mono text-cyan-300">
              {c.cn}
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && matches.length === 0 && (
        <div className="mt-2 text-xxs text-red-400 text-center">컨테이너 없음</div>
      )}
    </div>
  );
}

function SmallResultCard({ c, onOpen, showPos = false }) {
  const isDone = !!c._comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const hasTmp = c.tmp != null && String(c.tmp).trim() !== '';
  const isReeferF = c.rf && hasTmp && c.fe === 'F';
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-ink-900 border rounded-pill p-2 flex items-center gap-2 ${
        c._extra ? 'border-amber-500/70 bg-amber-950/20' : isDone ? 'border-emerald-700/30' : c._xray ? 'border-purple-700/30' : 'border-line hover:bg-ink-750/50'
      }`}>
      {c._extra && <span className="px-1.5 py-0.5 rounded text-3xs font-black bg-amber-500 text-ink-950">초과</span>}
      <span className={`px-1.5 py-0.5 rounded text-3xs font-black ${
        c._mode === 'discharge' ? 'bg-blue-900 text-blue-200'
        : c._mode === 'loading' ? 'bg-amber-900 text-amber-200'
        : 'bg-ink-750 text-dim-200'
      }`}>{c._mode === 'discharge' ? '양하' : c._mode === 'loading' ? '선적' : '중계'}</span>
      <span className="font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
      {/* 3.2-01: 통과분(평택 작업 아님) — 끝4자리가 겹칠 때 어느 것이 평택분인지 한눈에. POD(양하)·POL(선적)·자리 */}
      {!canCompleteContainer(c, c._mode) &&
        <span className="px-1 rounded text-3xs font-black bg-ink-750 text-dim-300 whitespace-nowrap">통과 {c._mode === 'loading' ? (c.pol || '') : (c.pod || '')}{c.bay ? ` ${c.bay}-${c.row || ''}-${c.tier || ''}` : ''}</span>}
      {c.bay_orig !== undefined && ((c.bay || '') !== (c.bay_orig || '') || (c.row || '') !== (c.row_orig || '') || (c.tier || '') !== (c.tier_orig || '')) &&
        <span className="px-1 rounded text-3xs font-black bg-indigo-900 text-indigo-200">수정</span>}
      <span className="text-2xs text-dim-300 mono truncate flex-1">{c.cn}</span>
      {/* 3.3-01: 끝4가 겹칠 때는 **자리**가 고르는 근거다 — 번호만 보여 주면 못 고른다(검수사 지적 2026-09-03) */}
      {showPos && <span className={`text-3xs mono font-black px-1 rounded ${c._comp ? 'bg-emerald-900 text-emerald-200' : 'bg-rose-900 text-rose-200'}`}>{c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}</span>}
      <span className="text-3xs mono text-dim-300">{isoToLabel(c.iso) || c.tp || c._extraSize || ''}</span>
      <span className={`text-3xs mono px-1 rounded font-bold ${
        c.fe === 'F' ? 'bg-emerald-900/60 text-emerald-300' :
        c.fe === 'E' ? 'bg-ink-750 text-dim-200' :
        'bg-amber-900/60 text-amber-300'
      }`}>{c.fe || '?'}</span>
      {isReeferF && <span className="bg-cyan-700/60 text-cyan-100 text-3xs px-1 rounded font-bold">❄{c.tmp}°</span>}
      {!isReeferF && isReefer && <span className="text-cyan-400 text-xs">❄</span>}
      {c.dg && <span className="text-red-400 text-xs">🔥</span>}
      {c._xray && <span className="text-purple-400 text-xs">🔍</span>}
      {c._extra && c._extraDamage && c._extraDamage !== '없음' && <span className="text-orange-400 text-xs" title="데미지">⚠</span>}
      {isDone && <span className="text-emerald-400 text-xs">✓</span>}
    </button>
  );
}
