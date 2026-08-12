// 검색 패널 (M2.0)
// - 싱글: AI 자유 질문 + 키워드 + 음성
// - 트윈: 자동 짝꿍 + 양쪽 동시 완료
// - 결과 카드: 실번호 거대 + 완료 버튼
// - Gemini API: 자연어 자유 질의
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search as SearchIcon, X, Volume2, VolumeX, Mic, MicOff, Truck, AlertOctagon, Snowflake, AlertTriangle, Check, RotateCcw, Sparkles, Loader2, Link2, HelpCircle, SendHorizontal } from 'lucide-react';   // TallyOne 1.22: 전송키
import { parseSpokenDigits, speak, stopSpeak, spellKo, fixSpeechDomain, pickSpeechAlternative, speakDone } from '../voice.js';
import { isoToLabel, fmtPos, isPyeongtaekPort, resolveShipKey, computeShiftingMapCached, predictShiftingFromVoyage, effectivePos, formatWt, seqFullConfirmText, buildSlotUniverse, buildOccupancy, getEquipNumber } from '../utils.js';   // TallyOne 1.53: 위치 판정은 effectivePos 하나로 · 트윈 안내 무게   // 1.54: 시퀀스 되묻기 문구(한 벌)
import { parseNaturalQuery, applyNLFilter, describeQuery, hasAnyCondition, generateLocalAnswer, generateBriefing, generateSealAuditAnswer, generateIntroAnswer, generateTimeAnswer, generateWakeAnswer, generatePilotAnswer, generateTwinCheckAnswer, generateHandover, generateFoodAnswer, answerAboutAlert } from '../nlSearch.js';   // 1.23: answerAboutAlert
import { matchPortMis } from '../portMisMatch.js';   // V7.92: 입출항 질문 답변용 간이 매처
import { fixQuestionWithAI } from '../gemini.js';
import { askGemini, isFreeFormQuestion } from '../gemini.js';
import { findTwinCandidate, getBayPairs } from '../twin.js';   // V7.93: getBayPairs — 트윈 무게 점검
import { fbCompleteContainer, fbCancelComplete, fbSetInspectorActivity, fbAddExtraContainer, fbRemoveExtraContainer, fbReassignContainerPosition, fbCompleteContainersAtomic, fbUnassignContainer } from '../firebase.js';
import BigResultCard from './BigResultCard.jsx';
import RestoreOrigButton from './RestoreOrigButton.jsx';   // V9.51
import HelpModal from './HelpModal.jsx';
import ExtraContainerModal from './ExtraContainerModal.jsx';
import WrongAnswerModal from './WrongAnswerModal.jsx';
import { logQuerySettled } from '../activityLog.js';   // TallyOne 1.3: 조회 활동 기록(음성 포함)
import GuidedWorkPanel from './GuidedWorkPanel.jsx';   // V7.94: 자동 가이드 모드
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';   // 1.49: 브라우저 confirm() 은 화면을 얼린다 — 실측 2026-08-11

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
const CN_FULL_RE = /^[A-Z]{4}\d{6,7}$/;
function fullCnOf(v) {
  const s = String(v || '').replace(/[\s-]/g, '').toUpperCase();
  return CN_FULL_RE.test(s) ? s : '';
}
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

export default function SearchPanel({ voyage, voyageKey, inspector, onOpenContainer, shipLib = null, portMisData = {}, pilotForecast = {}, isLoloShip = false, diagAlerts = [], mode = null, onWorkFilterChange = null, onPlaceUnassigned = null }) {   // TallyOne 1.22: pilotForecast — 도선→작업개시 답변용   // 1.23: diagAlerts — 경고 문장을 그대로 물으면 그 경고를 설명한다   // V9.28: 미배정→빈자리 배치   // V7.92: portMisData 추가 · V8.11: isLoloShip · V8.82: mode 동기화(상단 양하/선적 탭과 한 몸)
  const [searchMode, setSearchMode] = useState('single');
  // V9.49: 선적 트윈 방식 — 'auto'(양하와 같은 화면·기본) | 'manual'(위치 지정)
  const [loadTwinMode, setLoadTwinMode] = useState('auto');
  // V7.94: 자동 가이드 모드 — 앱이 크레인 순서대로 다음 컨을 예측 제시 (수동 = 기존 검색 방식)
  const [guideMode, setGuideMode] = useState(false);
  // M5.75: 작업 모드 필터 (양하/선적/완료) — 현재 작업 중인 모드만 검색
  const [workFilter, setWorkFilter] = useState(mode === 'loading' ? 'loading' : 'discharge');  // 'discharge' | 'loading' | 'completed'
  // V8.82: 상단 양하/선적 탭(VoyagePage mode)이 바뀌면 작업 모드도 따라간다 — 위·아래가 반대로 엇갈리던 혼선 제거.
  useEffect(() => {
    if ((mode === 'discharge' || mode === 'loading') && workFilter !== mode) setWorkFilter(mode);
  }, [mode]);
  // V8.82: 아래 탭을 누르면 상단 모드도 따라가게 상위로 알림.
  const pickWorkFilter = (m) => { setWorkFilter(m); if (m !== 'completed') onWorkFilterChange?.(m); };
  const [extraModalOpen, setExtraModalOpen] = useState(false);   // V8.04: 초과 컨 입력 모달
  const equipNo = useEquipNo();   // TallyOne 1.55: 지금 갱(호기) — 완료 기록·수석 전달에 같이 실린다

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
          // V7.92-02: 평택분 여부 — 양하=POD평택, 선적=POL평택 (7.1). 집계는 평택분만.
          _ptk: m === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol),
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
  }, [voyage]);

  // M5.75: 작업 모드 필터 적용 — 양하 작업 중엔 양하만, 선적엔 선적만, 완료는 별도
  const filteredContainers = useMemo(() => {
    if (workFilter === 'completed') {
      return allContainers.filter(c => c._comp);  // 양하/선적 구분 없이 완료된 것
    }
    return allContainers.filter(c => c._mode === workFilter && !c._comp);
  }, [allContainers, workFilter]);

  // 갯수 표시용
  const dischCount = useMemo(() => allContainers.filter(c => c._mode === 'discharge' && c._ptk && !c._comp).length, [allContainers]);   // V7.92-02: 평택분만
  const loadCount = useMemo(() => allContainers.filter(c => c._mode === 'loading' && c._ptk && !c._comp).length, [allContainers]);   // V7.92-02: 평택분만
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
    allContainers.forEach(c => {
      if (c._mode !== workFilter || !c._ptk || c._comp) return;
      const center = c.bay ? manualGroupCenterOf(c.bay) : NOBAY;
      if (center == null) return;
      if (center === NOBAY) {
        const g0 = (map[NOBAY] ||= { center: NOBAY, noBay: true, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0 });
        g0.count++;
        return;
      }
      const g = (map[center] ||= { center, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0 });
      g.bays.add(parseInt(c.bay, 10)); g.count++;
      const isDeck = parseInt(c.tier, 10) >= 80, big = is40(c);
      if (isDeck) { g.deck++; big ? g.deck40++ : g.deck20++; } else { g.hold++; big ? g.hold40++ : g.hold20++; }
    });
    return Object.values(map).sort((a, b) => a.center - b.center);   // 자리 미지정(-1)이 맨 앞
  }, [allContainers, workFilter, manualBayPairs]);
  // TallyOne 1.53: **작업이 끝나면 검색창까지 사라졌다.**
  //   실측 2026-08-12(선적 335대 완주) — 남은 작업이 0이 되자 수동 모드가
  //   「선적 작업이 없습니다」만 띄우고 **조회창 자체가 없어졌다.** 「✓ 완료」 탭을 눌러야 검색창이 나왔다.
  //   그런데 *"이 컨 어디 있지"* 는 **작업이 끝난 뒤에 나오는 질문**이다.
  //   → 남은 작업이 없으면 베이·단 게이트를 건너뛰고 바로 조회창을 연다(게이트는 작업용이지 조회용이 아니다).
  const noWorkLeft = workFilter !== 'completed' && manualGroups.length === 0;
  // 작업 모드 바뀌면 선택 리셋
  useEffect(() => { setManualBay(null); setManualTier(null); }, [workFilter]);
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
  const manualCtx = { mode: workFilter, bayPairs: manualBayPairs, selectedGroup: manualBay, selectedTier: manualTier, shipLib };

  return (
    <div className="space-y-3">
      {/* M5.75: 작업 모드 탭 (양하/선적/완료) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex gap-1">
        <button onClick={() => pickWorkFilter('discharge')}
          className={`flex-1 py-2 rounded text-xs font-bold flex flex-col items-center ${
            workFilter === 'discharge' ? 'bg-rose-700 text-rose-100' : 'text-slate-400 hover:bg-slate-800'
          }`}>
          <span>⬇ 양하 작업</span>
          <span className="text-[10px] opacity-80">대기 {dischCount}대</span>
        </button>
        <button onClick={() => pickWorkFilter('loading')}
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
      {/* V7.99-16 / V8.04: 양하 — 신고 리스트에 없는데 내려진 컨(초과) 기록 (모달) */}
      {workFilter === 'discharge' && (
        <button
          onClick={() => {
            if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
            setExtraModalOpen(true);
          }}
          className="w-full mt-1.5 py-2 rounded-lg font-bold text-xs bg-slate-900 hover:bg-amber-900 text-amber-300 border border-amber-800 flex items-center justify-center gap-1.5">
          ➕ 초과 컨 추가 (리스트에 없는데 내려진 컨)
        </button>
      )}
      {/* V8.04: 초과분 별도 집계·제출 (검수리스트처럼) + 잘못 넣은 것 삭제 */}
      {workFilter === 'discharge' && extraList.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-700/50 rounded-lg p-2.5 mt-1.5">
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
              className="text-[10px] px-2 py-0.5 rounded border border-amber-600 bg-amber-900/40 text-amber-200 hover:bg-amber-800/60 font-bold">
              📥 초과분 내보내기 (CSV)
            </button>
          </div>
          <div className="space-y-1">
            {extraList.map(c => (
              <div key={c.cn} className="flex items-center gap-2 text-[11px] bg-slate-900/60 rounded px-2 py-1">
                <span className="mono font-bold text-amber-300 flex-1 truncate">{c.cn}</span>
                <span className="text-slate-400">{c._extraSize} · {c.fe} · {c._extraType}</span>
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
        <div className={`rounded-lg p-1.5 flex gap-1 border-2 ${guideMode ? 'bg-violet-950/60 border-violet-600' : 'bg-amber-950/40 border-amber-700'}`}>
          <button onClick={() => setGuideMode(true)}
            className={`flex-1 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 ${
              guideMode ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}>
            🤖 자동 가이드
          </button>
          <button onClick={() => setGuideMode(false)}
            className={`flex-1 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 ${
              !guideMode ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}>
            ✋ 수동
          </button>
        </div>
      )}
      {guideMode && workFilter !== 'completed' && (
        <div className="text-center text-[11px] font-bold text-violet-300 -mt-1">
          자동 가이드 모드 — 앱이 다음 컨테이너를 순서대로 제시합니다
        </div>
      )}

      {guideMode && workFilter !== 'completed' && !isLoloShip ? (
        <GuidedWorkPanel
          onPlaceUnassigned={onPlaceUnassigned}
          voyage={voyage} voyageKey={voyageKey} inspector={inspector}
          allContainers={allContainers} workFilter={workFilter}
          onSwitchManual={() => setGuideMode(false)}
          onOpenContainer={onOpenContainer}
        />
      ) : (
      <>
      {/* V7.99-10 (메모6 수동): 베이→홀드/데크 선택 게이트 (A안). 완료 탭은 게이트 없이 자유 조회. */}
      {/* V8.11: LOLO선(RZOR 등)은 베이가 없으므로 게이트를 건너뛰고 바로 조회창으로. 베이만 못 알려줄 뿐 실번호·규격·F/E·온도·XRAY는 정상 조회. */}
      {workFilter !== 'completed' && !noWorkLeft && manualBay == null && !isLoloShip ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="text-sm font-bold text-amber-300">작업할 베이를 선택하세요 <span className="text-[11px] text-slate-500 font-normal">(수동)</span></div>
          {manualGroups.length === 0 && <div className="text-xs text-slate-500 text-center py-4">남은 {workFilter === 'discharge' ? '양하' : '선적'} 작업이 없습니다.</div>}
          <div className="grid grid-cols-3 gap-2">
            {manualGroups.map(g => g.noBay ? (
              <button key="nobay" onClick={() => { setManualBay(g.center); setManualTier('none'); }}
                className="py-3 rounded-lg bg-amber-950/60 hover:bg-amber-800 border border-amber-600 text-amber-100 col-span-3">
                <div className="font-bold text-base">⚠ 자리 미지정</div>
                <div className="text-[10px] text-amber-300">남은 {g.count}대 — 리스트엔 있는데 적부 좌표가 없습니다</div>
                <div className="text-[10px] text-slate-400 mt-0.5">눌러서 목록 → 🅿 베이 빈자리에 배치</div>
              </button>
            ) : (
              <button key={g.center} onClick={() => setManualBay(g.center)}
                className="py-3 rounded-lg bg-slate-800 hover:bg-amber-800 border border-slate-700 text-slate-100">
                <div className="font-bold text-base">B{[...g.bays].sort((a, b) => a - b).join('·')}</div>
                <div className="text-[10px] text-slate-400">남은 {g.count}대</div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[10px] font-bold">
                  {g.deck > 0 && <span className="text-sky-300">데크 {g.deck}</span>}
                  {g.deck > 0 && g.hold > 0 && <span className="text-slate-600">·</span>}
                  {g.hold > 0 && <span className="text-amber-300">홀드 {g.hold}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : workFilter !== 'completed' && !noWorkLeft && manualTier == null && !isLoloShip ? (
        (() => {
          const g = manualGroups.find(x => x.center === manualBay);
          const bayLbl = g ? `B${[...g.bays].sort((a, b) => a - b).join('·')}` : `B${manualBay}`;
          return (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setManualBay(null)} className="text-xs text-slate-400 hover:text-amber-300">‹ 베이</button>
                <div className="text-sm font-bold text-amber-300">{bayLbl} — 작업할 단을 선택하세요</div>
              </div>
              <button disabled={!g || g.deck === 0} onClick={() => setManualTier('deck')}
                className={`w-full py-4 rounded-lg border text-left px-4 ${!g || g.deck === 0 ? 'bg-slate-800/40 border-slate-800 text-slate-600' : 'bg-sky-950/40 border-sky-700 hover:bg-sky-900/50 text-sky-100'}`}>
                <div className="flex items-center justify-between"><span className="font-bold text-base">🔵 데크 {g ? g.deck : 0}개</span><span className="text-xs mono text-sky-300">20FT:{g ? g.deck20 : 0} / 40FT:{g ? g.deck40 : 0}</span></div>
              </button>
              <button disabled={!g || g.hold === 0} onClick={() => setManualTier('hold')}
                className={`w-full py-4 rounded-lg border text-left px-4 ${!g || g.hold === 0 ? 'bg-slate-800/40 border-slate-800 text-slate-600' : 'bg-amber-950/40 border-amber-700 hover:bg-amber-900/50 text-amber-100'}`}>
                <div className="flex items-center justify-between"><span className="font-bold text-base">🟠 홀드 {g ? g.hold : 0}개</span><span className="text-xs mono text-amber-300">20FT:{g ? g.hold20 : 0} / 40FT:{g ? g.hold40 : 0}</span></div>
              </button>
            </div>
          );
        })()
      ) : (
      <>
      {/* TallyOne 1.53: 잔여 0대 — 작업은 끝났지만 조회는 계속 된다는 것을 알린다. */}
      {noWorkLeft && (
        <div className="bg-emerald-950/40 border border-emerald-700 rounded-lg px-3 py-2 text-[11px] text-emerald-200 font-bold">
          ✅ 남은 {workFilter === 'discharge' ? '양하' : '선적'} 작업이 없습니다 — 조회·검색은 그대로 됩니다. 끝 4자리를 넣어 보세요.
        </div>
      )}
      {/* V8.11: LOLO선 안내 — 베이(위치)만 없고 나머지 정보는 정상 조회됨을 알림. */}
      {isLoloShip && (
        <div className="bg-teal-950/50 border border-teal-700 rounded-lg px-3 py-2 text-[11px] text-teal-200">
          🚢 LOLO 선박 — 끝 4자리로 조회하세요. 덱플랜이 올라오면 <b className="text-lime-300">자리(D덱 3줄 5칸)</b>와 <b className="text-lime-300">🏗갠트리 대상</b>까지 함께 나옵니다.
        </div>
      )}
      {workFilter !== 'completed' && manualBay != null && manualTier && (() => {
        const g = manualGroups.find(x => x.center === manualBay);
        const noBay = !!g?.noBay;
        const bayLbl = noBay ? '자리 미지정' : (g ? [...g.bays].sort((a, b) => a - b).join('·') : String(manualBay));
        // V8.09-17 (메모5): 수동도 자동 가이드처럼 진행상태(잔여 N대)를 보이게. 현재 단의 미완료 잔여.
        const remain = noBay ? (g?.count || 0) : (g ? (manualTier === 'hold' ? g.hold : g.deck) : 0);
        return (
          <div className="flex items-center gap-2 text-[11px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="font-bold text-amber-300">📍 {noBay ? '⚠ 자리 미지정 작업 중' : `${bayLbl}번 ${manualTier === 'hold' ? '홀드' : '데크'} 작업 중`}</span>
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
              return <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-800 text-rose-100 font-black text-[10px]">✋ 싱글 먼저 {n}대 — 짝 없는 자리</span>;
            })()}
            <span className="font-black text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded px-1.5 py-0.5">잔여 {remain}대</span>
            <button onClick={() => { setManualTier(null); }} className="text-slate-400 hover:text-amber-300">단 변경</button>
            <button onClick={() => { setManualBay(null); setManualTier(null); }} className="text-slate-400 hover:text-amber-300">베이 변경</button>
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
        const left = noBay ? (g?.count || 0) : (g ? (manualTier === 'hold' ? g.hold : g.deck) : 0);
        if (left > 0) return null;
        // 같은 베이의 다른 단이 남았으면 그쪽을 먼저 권한다(스프레더를 덜 바꾼다).
        const otherTier = manualTier === 'hold' ? 'deck' : 'hold';
        const otherLeft = (!noBay && g) ? (otherTier === 'hold' ? g.hold : g.deck) : 0;
        const nextG = manualGroups.find(x => x.center !== manualBay && !x.noBay && x.count > 0)
                   || manualGroups.find(x => x.center !== manualBay && x.count > 0);
        const lbl = (x) => (x.noBay ? '자리 미지정' : `B${[...x.bays].sort((a, b) => a - b).join('·')}`);
        const hereLbl = g ? lbl(g) : `B${manualBay}`;
        return (
          <div className="bg-emerald-950/50 border-2 border-emerald-600 rounded-lg p-3 space-y-2">
            <div className="text-sm font-black text-emerald-200">
              ✅ {hereLbl}{noBay ? '' : ` ${manualTier === 'hold' ? '홀드' : '데크'}`} 끝났습니다 — 남은 작업 0대
            </div>
            {otherLeft > 0 && (
              <button onClick={() => setManualTier(otherTier)}
                className="w-full py-2.5 rounded-lg font-bold text-sm bg-sky-700 hover:bg-sky-600 text-sky-50">
                같은 베이 {otherTier === 'hold' ? '홀드' : '데크'} {otherLeft}대 남았습니다 — 이어서 →
              </button>
            )}
            {nextG && (
              <button onClick={() => { setManualBay(nextG.center); setManualTier(nextG.noBay ? 'none' : null); }}
                className="w-full py-3 rounded-lg font-black text-base bg-emerald-600 hover:bg-emerald-500 text-white">
                다음 {lbl(nextG)} 로 → <span className="text-[11px] font-bold opacity-90">(남은 {nextG.count}대)</span>
              </button>
            )}
            <button onClick={() => { setManualBay(null); setManualTier(null); }}
              className="w-full py-2 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300">
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
        <div className="bg-slate-900 border border-amber-800/60 rounded-lg p-2 space-y-1">
          <div className="text-[11px] text-amber-300 font-bold">🅿 배치 — 누르면 베이 화면으로 가서 빈 칸(📦+)을 고릅니다</div>
          {allContainers.filter(c => c._mode === workFilter && !c._comp && (!c.bay || c.bay_actual === '__STG__')).map(c => (
            <div key={c.cn} className="flex items-center gap-1.5">
              <button onClick={() => onOpenContainer?.(c)} className="flex-1 text-left bg-slate-800 rounded px-2 py-1.5 text-xs mono font-bold text-slate-100">
                {c.cn} <span className="text-[10px] text-slate-400 font-normal">{isoToLabel(c.iso) || c.tp || ''} {c.fe || ''}</span>
                {c.bay_actual === '__STG__'
                  ? <span className="ml-1 text-[10px] font-bold text-sky-300">
                      📦 창고{c.bay && c.row && c.tier ? ` · 이름 걸린 자리 ${String(parseInt(c.bay, 10)).padStart(2, '0')}-${c.row}-${c.tier}` : ''}
                    </span>
                  : <span className="ml-1 text-[10px] font-bold text-orange-300">자리 미지정</span>}
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
        ? <SingleSearch voyage={voyage} voyageKey={voyageKey} inspector={inspector} allContainers={allContainers} workFilter={workFilter} onOpenContainer={onOpenContainer} portMisData={portMisData} pilotForecast={pilotForecast} diagAlerts={diagAlerts} manualCtx={manualCtx} />
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
          await fbAddExtraContainer(voyageKey, 'discharge', cn, inspector, info);
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
  const pos = mp.bay ? `${String(parseInt(mp.bay, 10)).padStart(2, '0')}-${mp.row}-${mp.tier}` : '미배정';
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
    <div className="bg-sky-950/60 border border-sky-600 rounded-lg px-3 py-2 mb-1 text-[12px] text-sky-100 font-bold leading-snug">
      <Link2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/>
      짝 자리 {h.pos} 에 {h.l4} 가 있습니다. 트윈으로 두 대 한 번에 가능합니다.
      <div className="mt-0.5 font-normal text-[11px]">
        (무게 {h.wt} · <span className={h.samePod ? '' : warn}>{h.podText}</span> · <span className={h.sameIso ? '' : warn}>{h.isoText}</span>)
      </div>
      <div className="mt-0.5 font-normal text-[11px] text-slate-300">
        싱글로 계속해도 됩니다 — 무겁다 · 포트가 틀리다 · 규격이 틀리다면 싱글이 맞습니다. 트윈으로 할 거면 위 [트윈] 탭으로 가세요.
      </div>
    </div>
  );
}

function SingleSearch({ voyage, voyageKey, inspector, allContainers, workFilter = 'discharge', onOpenContainer, portMisData = {}, pilotForecast = {}, diagAlerts = [], manualCtx = null }) {   // V7.92 / V7.99-10 manualCtx / 1.22 pilotForecast / 1.23 diagAlerts
  const [query, setQuery] = useState('');
  // TallyOne 1.22: **문장은 다 쓴 뒤에 답한다** (검수사 메모 2026-08-07 —
  //   "숫자가 아닌 텍스트가 입력이 될때는 대기 하고 전송키로 전송을 누르면 질문에 답을 해주게").
  //   종전엔 글자마다 즉답을 만들어 "…컨테이너가 없습니다"가 타이핑 중에 튀어나왔다.
  //   ⚠ 숫자(끝 4자리)와 음성은 종전대로 즉답 — 현장 조회 속도를 늦추지 않는다.
  const [draft, setDraft] = useState('');
  // TallyOne 1.55: 전체 컨번호(DWSU3000276)는 **문장이 아니다.**
  //   종전엔 글자가 섞였다는 이유로 문장으로 갈려, 다 치고 전송키를 누르기 전까지 아무것도 안 나왔다.
  const isSentence = (v) => !fullCnOf(v) && /[가-힣A-Za-z]/.test(String(v || '')) && !/^[\d\s-]+$/.test(String(v || ''));
  const submitDraft = () => { const v = draft.trim(); if (!v) return; setQuery(v); logQuerySettled(v); };
  const [weatherText, setWeatherText] = useState(null);   // V7.92: 날씨 질문 비동기 답변
  const voiceQueryRef = useRef('');   // V7.80: 음성으로 들어온 질문 추적
  const fixTriedRef = useRef('');     // V7.80: AI 복원 1회 제한
  const [fixingVoice, setFixingVoice] = useState(false);
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
  // V8.00: 인계 질문이 아니게 되면 메모 상태 리셋 (다른 질문으로 넘어갈 때)
  useEffect(() => {
    if (!parsed.handoverQuery) { setHandoverFinalized(false); }
  }, [parsed.handoverQuery]);
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
    // V7.99-10 (메모6 수동): 작업 단 선택 시, 끝4자리 조회 후보 중 현재 단(베이+홀드/데크) 컨을 최우선.
    //   완전히 숨기지 않음(통과화물·단 밖도 찾아줘야 함 — V7.53 회귀 방지) — 우선 정렬로 오선택만 방지.
    const inManualTier = (c) => {
      if (!manualCtx || manualCtx.selectedGroup == null || !manualCtx.selectedTier) return false;
      if (manualCtx.selectedGroup === -1) return !c.bay;   // V9.23-08: 자리 미지정 묶음
      const bp = manualCtx.bayPairs || {};
      const gc = (bs) => { const b = parseInt(bs, 10); if (!Number.isFinite(b)) return null; if (b % 2 === 0) return b; const p = bp[String(b)]; return p ? (b + parseInt(p, 10)) / 2 : b; };
      if (gc(c.bay) !== manualCtx.selectedGroup) return false;
      return manualCtx.selectedTier === 'deck' ? parseInt(c.tier, 10) >= 80 : parseInt(c.tier, 10) < 80;
    };
    const rank = (c) => {
      if (parsed.digits && inManualTier(c)) return -1;  // 현재 단 최우선
      return c._comp ? 2 : (c._mode === workFilter ? 0 : 1);
    };
    return [...r].sort((a, b) => rank(a) - rank(b));
  }, [allContainers, query, parsed, workFilter, manualCtx]);

  // M3.2: 로컬 답변 (AI 의존 없이 즉답)
  // 베이/POL/POD/구역/무게합/위치 질문은 모두 여기서 처리
  // 단, 단순 컨번호 검색(digits만)이거나 결과가 단 1개면 BigResultCard 우선
  const localAnswer = useMemo(() => {
    if (!query || query.length < 2) return null;
    // 1.23: **경고 문장을 그대로 물은 것인가**를 가장 먼저 본다.
    //   검색 파서보다 앞에 둬야 한다 — 뒤에 두면 `풀` 한 글자와 `5톤 이상` 이 먼저 잡혀
    //   "풀 5톤 이상 98대" 같은 엉뚱한 답이 나간다(오답 리포트 2건, 2026-08-07).
    {
      const a = answerAboutAlert(query, diagAlerts);
      if (a) return a;
    }
    // V8.00: 인수인계 — 남은 작업+양하신고+특이사항 정리 + 되묻기. 최우선.
    if (parsed.handoverQuery) {
      const ptk = allContainers.filter(c => c._ptk);
      const info = {
        byInspector: inspector || '',
        shipName: voyage?.info?.vslFull || voyage?.info?.vsl || '',
        voyageLabel: voyage?.info?.voyNo || voyage?.info?.voy || '',
        extraNote: handoverFinalized ? handoverNote : '',
      };
      const body = generateHandover(ptk, info);
      if (handoverFinalized) {
        return `인계서 정리했어요. 다음 검수사에게 이 내용 전달하세요.\n\n${body}`;
      }
      // 1단계: 초안 + 되묻기 (첫 줄은 음성으로 읽힘)
      return `인계서 초안이에요. 특이사항이나 더 전달할 내용 있으면 아래에 적어 주세요. 없으면 그대로 두셔도 됩니다.\n\n${body}\n\n— 더 전달할 내용이 있으면 아래 칸에 적고 [인계 메모 추가]를 누르세요.`;
    }
    // V7.92: 챗봇형 질문 — 자기소개·시간·입출항·날씨 (사용자 요청: "넌 뭐야"에 답하기)
    if (parsed.foodQuery) return generateFoodAnswer(parsed.foodQuery);   // V8.60: 맛집 돌림판
    if (parsed.introQuery) return generateIntroAnswer(voyage?.info?.vslFull || voyage?.info?.vsl || '');
    // V9.18: 선박 소개·이름 유래 — ShipIntroCard가 캐시해 둔 소개가 있으면 바로 읽어준다.
    if (parsed.shipIntroQuery) {
      const _sid = (() => { try {
        const inf = voyage?.info || {};
        return resolveShipKey(inf.imo || inf.callsign || String(inf.vsl || '').toUpperCase().replace(/\s+/g, ''));
      } catch { return ''; } })();
      const cached = _sid && window.__shipIntroCache && window.__shipIntroCache[_sid];
      if (cached) return `🚢 ${voyage?.info?.vslFull || voyage?.info?.vsl || ''}\n${cached}`;
      return '이 배의 정보가 아직 없습니다.\n화면 아래 「🚢 이 배는?」 카드에서 [AI로 선박 정보 찾기]를 누르면 제원·선사·항로와 이름 유래를 정리해 드립니다.';
    }
    // ⚠ 입출항을 시간보다 먼저 — "입항 시간 알려줘"는 timeQuery에도 걸리므로 순서가 답을 가른다.
    if (parsed.schedQuery) {
      const pm = matchPortMis(portMisData, voyage?.info || {});
      const fmtDT = (x) => {
        if (!x) return null;
        const m = String(x).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
        return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 ${m[4]}:${m[5]}` : String(x);
      };
      if (!pm) return '입출항 정보가 아직 없습니다. PORT-MIS 데이터가 수집되면 자동으로 답합니다.';
      const ship = voyage?.info?.vslFull || voyage?.info?.vsl || pm.vesselName || '이 선박';
      const lines = [];
      const eta = fmtDT(pm.eta), etd = fmtDT(pm.etd);
      lines.push(`${ship} — ` + [eta ? `입항 ${eta}` : null, etd ? `출항 ${etd}` : null].filter(Boolean).join(', ') + '.');
      if (pm.pier || pm.berth) lines.push(`부두: ${[pm.pier, pm.berth].filter(Boolean).join(' ')}`);
      if (pm.port && pm.port !== '평택') lines.push(`⚠ ${pm.port} 항만 데이터입니다.`);
      return lines.join('\n');
    }
    // TallyOne 1.22: 도선·작업개시 — 도선 시각은 입항 시각이라 부두별 소요(PCTC 90분·PNCT 120분)를 더해 답한다.
    if (parsed.pilotQuery) return generatePilotAnswer(voyage?.info || {}, pilotForecast[String(voyage?.info?.vsl || '').toUpperCase()] || null);
    // TallyOne 1.21: 기상 시각 — timeQuery보다 먼저. 그 선박 일정(planDate)으로 작업시작을 잡는다.
    if (parsed.wakeQuery) return generateWakeAnswer(voyage?.info || {});
    if (parsed.timeQuery) return generateTimeAnswer();
    if (parsed.weatherQuery) return weatherText || '🌤 평택항 날씨 조회 중…';
    // V7.93: 트윈 작업 무게 점검 — "20번 베이 트윈 가능해" (합계 55톤↑ 불가 + 불균형 수평 주의)
    if (parsed.twinCheckQuery) {
      const m = parsed.mode || workFilter;
      const pool = allContainers.filter(c => c._ptk && c._mode === m && !c._comp);
      const pairs = getBayPairs(allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || '');
      return generateTwinCheckAnswer(parsed, pool, pairs, voyage?.info?.pier || '');   // V7.93-02: 부두별 무게차 한계
    }
    // V7.90-04: 브리핑 — 현재 작업(탭 모드) 기준 요약 (음성 "브리핑" 한 마디)
    if (parsed.briefingQuery) {
      const modeCs = allContainers.filter(c => c._mode === workFilter);
      const pairs = getBayPairs(allContainers, voyage?.info?.imo || '', voyage?.info?.vsl || '');   // V7.93: 트윈 무게 예견
      return generateBriefing(modeCs, workFilter === 'discharge' ? '양하' : '선적', workFilter, pairs, voyage?.info?.pier || '');
    }
    // V7.90-05: 실번호 점검 (사용자 요청 — 씰 오류 사전 예측)
    if (parsed.sealAuditQuery) {
      const modeCs = allContainers.filter(c => c._mode === workFilter);
      return generateSealAuditAnswer(modeCs, workFilter === 'discharge' ? '양하' : '선적');
    }
    if (!hasAnyCondition(parsed)) return null;   // V9.14: 챗봇 8종이 hasAnyCondition에 흡수됨 — 수동 나열(구조적 부채) 제거
    // 단순 컨번호만 입력한 경우는 BigResultCard 우선
    const onlyDigits = parsed.digits && !parsed.bay && !parsed.pol && !parsed.pod &&
                       !parsed.portAny && !parsed.zone && !parsed.dgClass && !parsed.un &&
                       !parsed.size && !parsed.fe && !parsed.type && !parsed.weightSum &&
                       !parsed.posQuery && !parsed.listQuery && !parsed.bayDistQuery && !parsed.isStat;
    if (onlyDigits) return null;
    // TallyOne 1.27: 시프팅은 **평택분 필터 전** 원본 voyage 로 계산해 넘긴다(통과화물이 대상이라서).
    return generateLocalAnswer(parsed, results, allContainers.filter(c => c._ptk),
      { ...manualCtx, shiftMap: (() => { const c = computeShiftingMapCached(voyageKey, voyage);
          return (c && Object.keys(c).length) ? c : predictShiftingFromVoyage(voyage); })() });   // V7.92-02: 집계는 평택분만 / V7.99-10: 작업 단 맥락
  }, [parsed, results, allContainers, query, workFilter, weatherText, portMisData, voyage, manualCtx, handoverNote, handoverFinalized, inspector, diagAlerts]);

  // V7.92: 날씨 질문 — Open-Meteo(무키) 평택항 좌표. 실패 시 조용히 안내문.
  useEffect(() => {
    if (!parsed.weatherQuery) { setWeatherText(null); return; }
    let alive = true;
    const WMO = { 0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림', 45: '안개', 48: '안개', 51: '이슬비', 53: '이슬비', 55: '이슬비', 61: '비', 63: '비', 65: '강한 비', 66: '진눈깨비', 67: '진눈깨비', 71: '눈', 73: '눈', 75: '강한 눈', 77: '눈날림', 80: '소나기', 81: '소나기', 82: '강한 소나기', 85: '소낙눈', 86: '소낙눈', 95: '뇌우', 96: '뇌우', 99: '뇌우' };
    const dir16 = (d) => ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'][Math.round((((d % 360) + 360) % 360) / 22.5) % 16];
    fetch('https://api.open-meteo.com/v1/forecast?latitude=36.967&longitude=126.822&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Asia%2FSeoul&wind_speed_unit=ms')
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!alive) return;
        const c = j?.current, d = j?.daily;
        if (!c) { setWeatherText('날씨 정보를 가져오지 못했습니다. 신호를 확인해 주세요.'); return; }
        const lines = [`평택항 날씨 — ${WMO[c.weather_code] ?? ''} 기온 ${Math.round(c.temperature_2m)}도, 바람 ${dir16(c.wind_direction_10m)}풍 초속 ${Math.round(c.wind_speed_10m)}미터.`];
        if (d) lines.push(`오늘 최저 ${Math.round(d.temperature_2m_min?.[0])}° / 최고 ${Math.round(d.temperature_2m_max?.[0])}° · 강수확률 ${d.precipitation_probability_max?.[0] ?? '-'}%`);
        setWeatherText(lines.join('\n'));
      })
      .catch(() => { if (alive) setWeatherText('날씨 정보를 가져오지 못했습니다. 신호를 확인해 주세요.'); });
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
        if (t.length >= 2) { voiceQueryRef.current = t; setDraft(t); setQuery(t); logQuerySettled(t); }   // 1.22: 음성은 종전대로 즉답   // TallyOne 1.3: 음성 조회 기록
        else {
          const digits = parseSpokenDigits(text);
          if (digits && digits.length >= 2) { setDraft(digits); setQuery(digits); logQuerySettled(digits); }
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
    const KNOWN = /베이|번|리퍼|냉동|엠티|풀|위험물|디지|엑스레이|갑판|데크|홀드|선창|컨테이너|피트|온도|영하|영상|실번호|씰|무게|톤|위치|어디|몇|대|개|남은|남았|완료|진행|전체|전부|모두|몽땅|싹|죄다|도합|통틀어|합쳐|합치|수량|불러|뽑아|달라|다오|내렸|내린|누구|소개|시야|시간|지금|오늘|날씨|기온|바람|입항|출항|입출항|접안|언제|며칠|요일|날짜|트윈|가능|불가|초과|불균형|수평|크레인|목록|리스트|양하|선적|쌓|단|빈자리|자리|평택|항|끝|끝나|페이스|속도|퇴근|점심|걸려|걸리|쯤|예상|마치|종료|신고|세관|누락|초과|바뀜|리씰|이상|건|인계|인수|교대|넘겨|특이사항|전달|에서|온|가는|있|없|찾|알려|보여|줘|주세요|해|야|니|나요|입니까|은|는|이|가|을|를|에|의|와|과|도|만|좀|요|다/g;
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
        if (hasAnyCondition(p2)) { voiceQueryRef.current = fixed; setDraft(fixed); setQuery(fixed); logQuerySettled(fixed); }
      }
    }).catch(() => { if (alive) setFixingVoice(false); });
    return () => { alive = false; };
  }, [query, parsed, localAnswer]);

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
    const sig = `${query}-${results.length}-${parsed.isStat}-${results[0]?.cn || 'none'}-${localAnswer ? '1' : '0'}`;
    if (lastSpokenRef.current === sig) return;
    lastSpokenRef.current = sig;

    // V7.80: 음성 답변 간결화 — 핵심 한 문장만 (상세는 화면). 0대면 "~없습니다" (사용자 확정 형식).
    if (localAnswer) {
      const first = (localAnswer.split('\n').find(l => l.trim()) || '').replace(/[📊📍📭⚖️•·⏱🎉]/g, '').trim();
      const zm = first.match(/^(.+?):\s*0대/);
      if (zm) speak(`${zm[1].trim()} 없습니다`);
      else if (first) speak(first.replace(/:\s*/, ' '), (parsed.etaQuery || parsed.handoverQuery || parsed.customsReportQuery) ? { conversational: true } : {});  // V7.99-15/V8.00: 대화형 답변은 부드럽게
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
        if (autoSpeak) speak(res.answer);
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
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-slate-500 font-bold">
            🤖 검색/AI — 4자리 / 전체번호 / "리퍼 몇개" / "16번 베이" / 자유 질문 · 작업 {allContainers.filter(c => c._ptk).length}대
          </div>
          <button onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 text-[10px] font-bold border border-amber-700/40">
            <HelpCircle className="w-3 h-3"/>
            예시
          </button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={draft}
            onChange={e => {
              const v = e.target.value;
              setDraft(v);
              // 숫자·빈 입력은 즉답(종전 동작). 문장은 전송키를 누를 때까지 답하지 않는다.
              if (!isSentence(v)) { setQuery(v); logQuerySettled(v); }
              else if (query) setQuery('');
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitDraft(); } }}
            placeholder="🎤 / 4777 / DWSU3000276 / 40피트 4777 / 자유 질문"
            autoComplete="off"
            inputMode={manualCtx && manualCtx.selectedGroup != null && manualCtx.selectedTier ? 'numeric' : 'text'}
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
            {/* TallyOne 1.22: 전송키 — 문장을 다 쓰고 누르면 그때 답한다. */}
            {isSentence(draft) && draft.trim() !== query && (
              <button onClick={submitDraft} title="질문 전송"
                className="w-10 h-10 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-900">
                <SendHorizontal className="w-5 h-5"/>
              </button>
            )}
            {(draft || query || chatMessages.length > 0) && (
              <button onClick={() => { setDraft(''); setQuery(''); handleNewChat(); }} className="w-7 h-10 rounded hover:bg-slate-700 flex items-center justify-center">
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
          {parsed.foodQuery && (
            <button onClick={() => { window.location.hash = `#/food?spin=${parsed.foodQuery}`; }}
              className="mt-2 w-full py-2.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-bold text-sm">
              🎰 돌림판 돌리기
            </button>
          )}
        </div>
      )}

      {/* V8.00: 인수인계 되묻기 — 검수사가 특이사항/전달사항 직접 입력 */}
      {parsed.handoverQuery && localAnswer && !handoverFinalized && chatMessages.length === 0 && (
        <div className="bg-slate-900 border border-amber-700 rounded-xl p-3 space-y-2">
          <div className="text-[12px] text-amber-300 font-bold">📝 더 전달할 내용 (특이사항·다음 검수사 참고)</div>
          <textarea
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
            placeholder="예: 12번 베이 리퍼 1대 온도 확인 필요. 3호기 크레인 점심 후 점검 예정. 없으면 비워두세요."
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setHandoverFinalized(true)}
              className="flex-1 py-2.5 rounded-lg font-black text-sm bg-emerald-700 hover:bg-emerald-600 text-emerald-50">
              ✓ 인계서 완성
            </button>
            <button onClick={() => { setHandoverNote(''); setHandoverFinalized(true); }}
              className="px-4 py-2.5 rounded-lg font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600">
              특이사항 없음
            </button>
          </div>
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
        // TallyOne 1.53: **완료분을 찾으면 한 줄 요약만 나왔다.**
        //   실측 2026-08-12 — 선적을 끝내고 `7722` 로 찾으니 「✓ 1개 일치」인데 카드가 안 열리고
        //   「▼ 다른 작업·완료분에 1건 — 보기」뿐이었고, 펴도 한 줄 요약이라 **위치도 이력도 안 보였다.**
        //   원인 둘 — ⓐ 「✓ 완료」 탭(workFilter='completed')에서는 `c._mode === workFilter` 가
        //   영원히 거짓이라 main 이 항상 비었다. ⓑ 완료분 큰 카드(V8.70)가 현재 작업 모드로만 한정돼,
        //   양하를 보다 선적 완료분을 찾으면 걸리지 않았다.
        //   → 완료 탭은 완료분이 본목록이고, 번호 조회로 완료분 한 건이 잡히면 모드와 무관하게 정식 카드로 편다.
        const doneTab = workFilter === 'completed';
        const main = doneTab ? results.filter(c => c._comp)
                             : results.filter(c => !c._comp && c._mode === workFilter);
        const others = doneTab ? results.filter(c => !c._comp)
                               : results.filter(c => c._comp || c._mode !== workFilter);
        // V8.70: 완료된 컨도 번호 단일 매칭이면 큰 카드로 — 취소·위치수정 접근(완료 후 재검색 시 막다른 골목 제거).
        //   ※ 같은 번호가 양하·선적 양쪽에 완료로 있으면(중계) 종전대로 현재 모드 쪽을 편다.
        const doneAll = (main.length === 0 && parsed.digits) ? results.filter(c => c._comp) : [];
        const doneSolo = doneAll.length > 1 ? doneAll.filter(c => c._mode === workFilter) : doneAll;
        const othersRest = (doneSolo.length === 1) ? others.filter(c => c !== doneSolo[0]) : others;
        // TallyOne 1.53: 완료 탭에서는 접힌 쪽이 '아직 안 한 작업'이다 — 라벨이 반대로 읽히면 안 눌러 본다.
        const othersLabel = (n) => (doneTab ? `아직 안 한 작업에 ${n}건 — 보기` : `다른 작업·완료분에 ${n}건 — 보기`);
        return (
          <>
            {/* TallyOne 1.53: 싱글로 하려는데 트윈이 되면 한 줄로 알린다(막지 않는다). */}
            {main.length === 1 && <TwinPossibleHint c={main[0]} allContainers={allContainers} voyage={voyage}/>}
            {main.length === 1 && (
              <BigResultCard c={main[0]} allContainers={allContainers}
                voyageKey={voyageKey} inspector={inspector}
                onOpen={() => onOpenContainer?.(main[0])}
                /* TallyOne 1.48: 싱글도 같다 — 작업 구역을 골랐으면 위치 지정에서 다시 묻지 않는다. */
                workGroup={manualCtx?.selectedGroup ?? null} workTier={manualCtx?.selectedTier ?? null} slotSource={allContainers} bayPairsIn={manualCtx?.bayPairs ?? null}
                onAfterComplete={() => { setDraft(''); setQuery(''); stopSpeak(); }}
              />
            )}
            {main.length === 0 && doneSolo.length === 1 && (
              /* TallyOne 1.53: 완료분도 위치·지나온 자리·버튼이 다 있는 정식 카드로 편다(요약 한 줄 금지). */
              <BigResultCard c={doneSolo[0]} allContainers={allContainers}
                voyageKey={voyageKey} inspector={inspector}
                onOpen={() => onOpenContainer?.(doneSolo[0])}
                workGroup={manualCtx?.selectedGroup ?? null} workTier={manualCtx?.selectedTier ?? null}
                slotSource={allContainers} bayPairsIn={manualCtx?.bayPairs ?? null}
                onAfterComplete={() => { setDraft(''); setQuery(''); stopSpeak(); }}
              />
            )}
            {main.length > 1 && main.slice(0, 30).map(c => (
              <SmallResultCard key={`${c._mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer?.(c)} />
            ))}
            {othersRest.length > 0 && results.length > 0 && (
              <div className="mt-1">
                <button onClick={() => setShowOthers(v => !v)}
                  className="w-full py-1.5 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 font-bold">
                  {showOthers ? '▲ 접기' : `▼ ${othersLabel(othersRest.length)}`}
                </button>
                {showOthers && othersRest.slice(0, 20).map(c => (
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
  const pool = useMemo(() => allContainers.filter(c => c._mode === 'loading'), [allContainers]);
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
    const done = [c1, c2].filter(c => c._comp);
    // 1.53: 네이티브 confirm() 제거 — 브라우저 확인창은 뜨는 순간 앱이 통째로 멈춘다(실측 2026-08-12).
    if (done.length && !(await askYN('이미 선적확인된 컨입니다',
      `${done.map(c => c.cn.slice(-4)).join(', ')}는 이미 선적확인 기록이 있습니다.\n계속할까요?`))) return;
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
  const confirmManual = async () => {
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
      const b0 = c1.bay ? String(parseInt(c1.bay, 10)) : '';
      if (b0 && c1.row && c1.tier) { setPickBay(b0); setBay(b0); setRow(c1.row); setTier(c1.tier); }
      setStep('pos');
    } catch (e) { alert(`미배정 처리 실패: ${e?.message || e}`); }
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
    setBusy(true);
    try {
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
      await fbCompleteContainersAtomic(voyageKey, 'loading', [c1.cn, c2.cn], inspector, equipNo);   // 1.55: 갱(호기)
      speakDone({ cn: c1.cn }); setTimeout(() => speakDone({ cn: c2.cn }), 900);
      resetAll();
    } catch (e) { alert(`처리 실패 — 선적확인은 찍지 않았습니다. 다시 시도하세요.\n${e?.message || e}`); }
    finally { setBusy(false); }
  };

  const pickBox = (label, color, q, setQ, cSel, setCSel, rr) => (
    <div className={`bg-slate-900 border ${color === 'amber' ? 'border-amber-700/40' : 'border-cyan-700/40'} rounded-lg p-3`}>
      <div className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>
        <span className={`${color === 'amber' ? 'bg-amber-700 text-amber-50' : 'bg-cyan-700 text-cyan-50'} px-1.5 py-0.5 rounded text-[10px] font-black`}>{label}</span>
        {label} 컨테이너 — 끝4자리
      </div>
      <input type="text" value={q} onChange={e => setQ(e.target.value.toUpperCase())}
        placeholder="끝 4자리 또는 컨번호" inputMode="numeric" autoComplete="off"
        className={`w-full px-3 py-3 bg-slate-800 border rounded text-2xl font-black mono text-center tracking-widest focus:outline-none ${color === 'amber' ? 'border-amber-700/40 text-amber-200 focus:border-amber-500' : 'border-cyan-700/40 text-cyan-200 focus:border-cyan-500'}`}/>
      {cSel ? (
        <div className="mt-2 flex items-center justify-between bg-slate-800 rounded px-2 py-1.5">
          <div>
            <span className="mono text-sm font-bold text-slate-100">{cSel.cn}</span>
            <span className="ml-2 text-[10px] mono text-slate-400">기존 위치 {cSel.bay ? fmtPos(cSel) : '미배정'}</span>
            {cSel._comp && <span className="ml-1 px-1 rounded bg-rose-800 text-rose-200 text-[10px] font-bold">⚠ 완료기록</span>}
          </div>
          <button onClick={() => { setCSel(null); setQ(''); }} className="text-[11px] text-slate-400 px-1.5">✕</button>
        </div>
      ) : (
        <>
          {q.length >= 2 && rr.length === 0 && <div className="mt-2 text-[11px] text-red-400 text-center font-bold">⚠ 컨테이너 없음</div>}
          {rr.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {rr.map(c => (
                <button key={c.cn} onClick={() => setCSel(c)}
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] mono text-slate-200">
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
          className="w-full text-[11px] text-slate-300 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700">
          ← 조회 방식으로 돌아가기 (실번호 확인 화면)
        </button>
      )}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-2 text-xs text-blue-300 text-center">
        📍 위치 지정 방식 — 두 컨을 직접 묶고 자리를 새로 정합니다
        <div className="text-[10px] text-blue-400/70 mt-0.5">지정 자리대로면 그대로 확인 · 실제가 다를 때만 위치를 고칩니다</div>
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
            <div className="bg-indigo-950/50 border border-indigo-700 rounded-lg p-3 space-y-2">
              <div className="text-[12px] text-indigo-200 leading-snug">
                ⚠ 플랜상 앞은 <b className="mono">{c2.cn?.slice(-4)}</b>(B{_bn(c2.bay)}) 입니다 — 앞뒤가 반대로 들어왔습니다.
                <div className="text-[11px] text-indigo-300/80 mt-1 leading-snug">
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
              <div className={`rounded-lg p-3 border ${planPair.swapped ? 'bg-indigo-950/30 border-indigo-700/60' : 'bg-emerald-950/40 border-emerald-700/60'}`}>
                <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${planPair.swapped ? 'text-indigo-300' : 'text-emerald-300'}`}>
                  <Link2 className="w-3.5 h-3.5"/>{planPair.swapped ? '지정 자리 — 앞뒤가 플랜과 반대입니다' : '지정 자리 — 플랜 그대로 (짝 확인됨)'}
                </div>
                <div className="flex items-center justify-center gap-3 text-sm mono">
                  <span className="text-amber-200 font-black">{c1.cn?.slice(-4)} <span className="text-slate-400 font-normal">{fmtPos(c1)}</span></span>
                  <span className="text-slate-600">+</span>
                  <span className="text-cyan-200 font-black">{c2.cn?.slice(-4)} <span className="text-slate-400 font-normal">{fmtPos(c2)}</span></span>
                </div>
              </div>
              {/* 자리를 옮기지 않고 확인만 찍는다 — 앞뒤 입력 순서와 무관하게 안전하다. */}
              <button onClick={completeAtPlan} disabled={busy}
                className="w-full py-4 rounded-lg font-bold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                {busy ? '처리 중…' : '✅ 지정 자리 그대로 트윈 선적확인'}
              </button>
              {/* ── TallyOne 1.55: 액츄얼 작업에서 다른 것은 **자리가 아니라 번호**다(검수사 확정 2026-08-12).
                  종전 문구 「실제 자리가 다릅니다 — 위치 지정하기」는 **오도한다** — 자리는 계획대로 전부 찬다.
                  예외 경로로 내리고 문구를 사실에 맞게 고친다. 다만 앞뒤가 반대로 실린 경우는
                  이것이 **사실대로 적는 유일한 길**이라 접지 않고 그대로 내놓는다. */}
              {planPair.swapped ? (
                <button onClick={confirmManual} disabled={busy}
                  className="w-full py-3 rounded-lg font-bold text-sm bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-indigo-50">
                  ⇄ 실제로 맞바뀌어 실렸습니다 — 위치 지정
                </button>
              ) : (
                <details className="bg-slate-900 border border-slate-800 rounded-lg">
                  <summary className="px-3 py-2 text-[11px] text-slate-400 font-bold cursor-pointer">▼ 예외 — 계획에 없는 칸에 실렸습니다</summary>
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    <div className="text-[10px] text-slate-500 leading-snug">
                      번호가 다른 컨이 온 것이라면 이 길이 아닙니다 — 카드의 <b className="text-cyan-300">[컨테이너 번호 수정]</b> 을 쓰세요.
                    </div>
                    <button onClick={confirmManual} disabled={busy}
                      className="w-full py-2 rounded-lg text-[12px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-50">
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
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-2 text-[11px] text-amber-200 text-center leading-snug">
                {(!c1.bay || !c2.bay)
                  ? '두 컨 중 지정 자리가 없는 쪽이 있습니다 — 위치를 지정하세요.'
                  : '플랜상 짝 자리가 아닙니다 — 위치를 지정하세요.'}
              </div>
              <button onClick={confirmManual} disabled={busy}
                className="w-full py-3 rounded-lg font-bold text-base bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                <Link2 className="w-5 h-5"/>{busy ? '처리 중…' : '수동 배정 확인 — 두 컨 미배정 후 위치 지정'}
              </button>
            </>
          )}
        </>
      )}
      {step === 'pos' && c1 && c2 && (
        <div className="bg-slate-900 border border-amber-700 rounded-lg p-3 space-y-3">
          <div className="text-xs text-amber-300 font-bold">앞 {c1.cn?.slice(-4)} 위치 — 자리 선택</div>
          {/* TallyOne 1.55: 칸의 세 갈래를 그대로 적어 준다 — 「이름표만 걸린 칸」은 고를 수 있다. */}
          <div className="text-[10px] text-slate-400 leading-snug">
            <span className="text-slate-500">✓회색</span> = 그 칸에 <b>실린 컨</b>이 있습니다(선택 불가) ·
            <span className="text-sky-300"> 🏷파랑</span> = <b>이름표만</b> 걸린 칸(주인은 창고, 선택 가능) · 나머지 = 빈 칸
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
                    className={`py-2.5 rounded-lg border font-black ${remain > 0 ? 'bg-slate-800 hover:bg-amber-800 border-slate-600 hover:border-amber-500 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                    <div className="mono text-base">B{b}</div>
                    <div className="text-[10px] font-bold text-slate-400">
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
                <button onClick={() => { setPickBay(null); setBay(''); setRow(''); setTier(''); }} className="text-[11px] text-slate-400 px-2 py-1 border border-slate-700 rounded">← 베이 다시 선택</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(slotsByBay[pickBay] || []).map(sl => sl.done ? (
                  /* done — 그 칸에 **완료된 컨이 실제로** 있다. 선택 불가. */
                  <span key={`${sl.row}-${sl.tier}`} title={sl.cn || ''}
                    className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 mono text-sm font-bold text-slate-600 cursor-not-allowed">✓{sl.row}-{sl.tier}</span>
                ) : (
                  /* named — 이름표만 걸린 칸(계획 주인은 아직 창고). **선택 가능**하고 그 컨 끝4자리를 같이 보여 준다.
                     empty — 진짜 빈 칸. */
                  <button key={`${sl.row}-${sl.tier}`} onClick={() => { setBay(sl.bay); setRow(sl.row); setTier(sl.tier); }}
                    className={`px-2.5 py-2 rounded-lg border mono text-sm font-bold flex flex-col items-center leading-tight ${
                      row === sl.row && tier === sl.tier && bay === sl.bay
                        ? 'bg-amber-700 border-amber-400 text-amber-50'
                        : sl.named
                          ? 'bg-slate-800 hover:bg-amber-800 border-sky-700/70 hover:border-amber-500 text-slate-100'
                          : 'bg-slate-800 hover:bg-amber-800 border-slate-600 hover:border-amber-500 text-slate-100'}`}>
                    <span>{sl.row}-{sl.tier}</span>
                    {sl.named && <span className="text-[9px] font-bold text-sky-300">🏷{String(sl.cn || '').slice(-4)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setManualOpen(v => !v)}
            className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 border border-dashed border-slate-700 rounded">
            {manualOpen ? '▲ 직접 입력 닫기' : '▼ 직접 입력 (플랜에 없는 자리)'}
          </button>
          {manualOpen && (
          <div className="grid grid-cols-3 gap-2">
            {[['BAY', bay, setBay, 3], ['ROW', row, setRow, 2], ['TIER', tier, setTier, 2]].map(([lb, v, setV, mx]) => (
              <div key={lb}>
                <label className="text-[10px] text-slate-500 font-bold">{lb}</label>
                <input type="text" inputMode="numeric" value={v}
                  onChange={e => setV(e.target.value.replace(/[^\d]/g, '').slice(0, mx))}
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center"/>
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
            className="w-full py-3 rounded-lg font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center gap-2">
            <Check className="w-5 h-5"/>{busy ? '처리 중…' : '트윈 선적확인 (두 대 한 번에)'}
          </button>
          <button onClick={() => setStep('pick')} className="w-full text-[11px] text-slate-400 py-1">← 컨 선택으로</button>
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
      setC2(twin);
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
      return !!(live && live._comp);
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
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-2 text-xs text-blue-300 text-center">
        🚛 트윈: 앞 컨 입력 → EDI 베이 분석으로 짝꿍 자동 추천
        <div className="text-[10px] text-blue-400/70 mt-0.5">완료된 컨은 짝 후보 제외 · 통로 사이 단독 베이는 짝 없음</div>
      </div>

      {/* TallyOne 1.55: 액츄얼 항차에서 주 경로는 **번호 수정**이다 — 자리는 계획대로 전부 찬다. */}
      {seqMode === 'allActual' && (
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-[11px] text-cyan-200 leading-snug">
          🔁 액츄얼 작업 — <b>자리는 계획대로</b> 찹니다. 다른 컨이 왔으면 카드의 <b>[컨테이너 번호 수정 (다른 컨이 옴)]</b> 을 쓰세요.
        </div>
      )}

      <div className="bg-slate-900 border border-amber-700/40 rounded-lg p-3">
        <div className="text-[10px] text-amber-400 font-bold mb-2 flex items-center gap-1">
          <span className="bg-amber-700 text-amber-50 px-1.5 py-0.5 rounded text-[10px] font-black">앞</span>
          앞 컨테이너 — 끝4자리
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input type="text" value={q1}
            onChange={e => { setReplaced(false); setQ1(e.target.value.toUpperCase()); }}
            placeholder="끝 4자리 또는 컨번호"
            inputMode="numeric" autoComplete="off"
            className="w-full pl-9 pr-10 py-3 bg-slate-800 border border-amber-700/40 rounded text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"/>
          {q1 && <button onClick={() => { setReplaced(false); setQ1(''); setC1(null); setC2(null); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-slate-500"/></button>}
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

      {/* TallyOne 1.46: 트윈 확인 버튼을 **카드 위로** 올린다 (검수사 지적 2026-08-11).
          원인 원문 — *"그이유가 버튼 위치입니다. 맨밑에 있을 것입니다 '두 컨테이너 동시 선적' 비슷하게.
          그게 안보이면 그냥 선적을 누릅니다."*
          종전에는 앞 카드·뒤 카드 두 장을 지나 맨 아래에 있어서 스크롤하지 않으면 안 보였다.
          각 카드 안에는 개별 「선적확인」이 있으므로, 검수원은 먼저 보이는 그것을 누르고
          **앞 컨만 기록되고 뒤 컨은 미배정으로 떠돌았다**(실측: 5881 완료 / 짝 5755 자리·완료 모두 없음). */}
      {c1 && c2 && (
        <button onClick={handleCompleteBoth} disabled={twinBusy}
          className="w-full py-3 rounded-lg font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
          <Link2 className="w-5 h-5"/>
          {twinBusy ? '처리 중…' : (c1._mode === 'discharge' ? '트윈 한 번에 양하확인 (두 대)' : '트윈 한 번에 선적확인 (두 대)')}
        </button>
      )}

      {c1 && (
        <BigResultCard c={c1} allContainers={allContainers}
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
          onReplace={replaceBack}
          workGroup={workGroup} workTier={workTier} twinPartner={c1} slotSource={slotSource} bayPairsIn={bayPairsIn}
          label={c2._replaced ? '뒤 (실제 온 컨)' : '뒤 (자동)'} labelColor="cyan"
        />
      )}

      {c1 && !c2 && (
        <ManualTwinPicker allContainers={allContainers} c1={c1} onPick={setC2}/>
      )}

      {c1 && c2 && (
        <button onClick={handleSwapTwin} className="w-full text-xs text-slate-400 hover:text-amber-300 py-2 bg-slate-900 rounded">
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
        <details className="bg-slate-900 border border-slate-800 rounded">
          <summary className="px-3 py-2 text-[11px] text-slate-400 font-bold cursor-pointer">▼ 예외 — 계획에 없는 칸에 실렸습니다</summary>
          <div className="px-3 pb-3 pt-1 space-y-2">
            <div className="text-[10px] text-slate-500 leading-snug">
              번호가 다른 컨이 온 것이라면 이 길이 아닙니다 — 위 카드의 <b className="text-cyan-300">[컨테이너 번호 수정]</b> 을 쓰세요.
            </div>
            <button onClick={onManualMode}
              className="w-full text-[11px] text-slate-300 hover:text-amber-300 py-2 bg-slate-800 border border-slate-700 rounded">
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
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      if (Q.length === 4) return last4 === Q;
      // TallyOne 1.55: 전체 컨번호도 받는다 — 다른 입력칸과 규칙을 하나로.
      return last4.endsWith(Q) || (c.cn || '').toUpperCase().includes(Q);
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
          inputMode="numeric" autoComplete="off"
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
        c._extra ? 'border-amber-500/70 bg-amber-950/20' : isDone ? 'border-emerald-700/30' : c._xray ? 'border-purple-700/30' : 'border-slate-700 hover:bg-slate-800/50'
      }`}>
      {c._extra && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">초과</span>}
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
        c._mode === 'discharge' ? 'bg-blue-900 text-blue-200'
        : c._mode === 'loading' ? 'bg-amber-900 text-amber-200'
        : 'bg-gray-700 text-gray-300'
      }`}>{c._mode === 'discharge' ? '양하' : c._mode === 'loading' ? '선적' : '중계'}</span>
      <span className="font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
      {c.bay_orig !== undefined && ((c.bay || '') !== (c.bay_orig || '') || (c.row || '') !== (c.row_orig || '') || (c.tier || '') !== (c.tier_orig || '')) &&
        <span className="px-1 rounded text-[9px] font-black bg-indigo-900 text-indigo-200">수정</span>}
      <span className="text-[10px] text-slate-400 mono truncate flex-1">{c.cn}</span>
      <span className="text-[9px] mono text-slate-400">{isoToLabel(c.iso) || c.tp || c._extraSize || ''}</span>
      <span className={`text-[9px] mono px-1 rounded font-bold ${
        c.fe === 'F' ? 'bg-emerald-900/60 text-emerald-300' :
        c.fe === 'E' ? 'bg-slate-700 text-slate-300' :
        'bg-amber-900/60 text-amber-300'
      }`}>{c.fe || '?'}</span>
      {isReeferF && <span className="bg-cyan-700/60 text-cyan-100 text-[9px] px-1 rounded font-bold">❄{c.tmp}°</span>}
      {!isReeferF && isReefer && <span className="text-cyan-400 text-xs">❄</span>}
      {c.dg && <span className="text-red-400 text-xs">🔥</span>}
      {c._xray && <span className="text-purple-400 text-xs">🔍</span>}
      {c._extra && c._extraDamage && c._extraDamage !== '없음' && <span className="text-orange-400 text-xs" title="데미지">⚠</span>}
      {isDone && <span className="text-emerald-400 text-xs">✓</span>}
    </button>
  );
}
