// 작업 보고 모달 (M3.5.6)
// 흐름: 작업 시작 → 장비+작업종류 선택 → 카톡 발송
//       이후 중단/완료/해치/콘박스는 활성 장비 자동 사용
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, X, Play, Pause, CheckCircle2, Lock, Unlock, Box, Send, Truck, RefreshCw } from 'lucide-react';
import {
  shareText,
  buildWorkStatusMessage,
  buildHatchMessage,
  buildConBoxMessage,
} from '../kakaoShare.js';
import { fbAddWorkReport, fbUpdateVoyageInfo } from '../firebase.js';
import { canWorkNow } from '../workChoice.js';   // 3.51: 조회만은 보고를 쓰지 않는다
// TallyOne 1.8-09: 수동 해치 보고도 자동 유도와 **같은** 그룹 계산·같은 표시를 쓰게 한다.
import { bayGroupCenter } from '../swapGrade.js';
import { getBayPairs } from '../twin.js';
import { cleanReportBays, canEditReport, otherRunningWork, switchReasonOf, pauseSwitchReasonsFor, getPierFromBerth, equipNumbersForPier, reportShiftToShow, buildShiftReport, shiftReportContainers, isFerry1700Ship, ferryReportCuts, isHatchSkipShipInfo, hatchOpenableFor, hatchPanelDetailOf, formatHatchBays, getEquipNumber, setEquipNumber, buildGangShiftReport, crewCraneNo, shiftCutMs, shiftReportKey } from '../utils.js';   // 3.36: 시작보고 호기 = 앱 호기(한 벌)
import { VoyageBlock, ferryPagesOf, ferryCutItem } from './Ferry1700Alert.jsx';   // 3.66: 주야간 작업보고도 17시 창과 같은 갱별 카드·계산 한 벌
import { ref, set, onValue } from 'firebase/database';  // V9.57(I9): off 미사용 — 광역 해제 제거
import { db } from '../firebase.js';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import { useHatchCountConfirm } from './HatchCountConfirm.jsx';   // 4.10: 해치 보고 직전 장수 확인
import { getShipBayDictData } from '../shipStructure.js';
import ReportEditRow from './ReportEditRow.jsx';   // 4.46: 내가 보낸 보고 고치기·지우기

// 활성 작업 Firebase 경로: /activeWork/{voyageKey}/{equipNo} = { mode, startedAt, ... }

export default function WorkReportModal({ open, voyageKey, voyage, onClose, lastEquip, pageMode = '', inspector = '' }) {   // 4.46: inspector — 보고에 보낸 사람 이름(보고 고치기는 보낸 사람만)   // 4.45-01: pageMode — 항차 화면에서 지금 보고 있는 작업(양하·선적)
  // M5.79: view에 'manual' 추가 — 시작 안 눌러도 중단/재개/완료 직접 보고
  //  사유: (1) 전 작업을 이어받을 때 (다른 검수원이 시작한 작업) (2) 한 갱 먼저 작업 완료
  const [view, setView] = useState('main');  // main | start | pause | hatch | conbox | external | manual | daynight
  // V8.10: 현재 항차 부두 기준 장비 목록(PCTC 1~4 / PNCT 1~5). 항차 없으면 1~5 전체.
  const equipNumbers = equipNumbersForPier(getPierFromBerth(voyage?.info?.berth || ''));
  // V8.10: 해치 제외 4척(TMPZ·TNJP·RZOR·OBWH)은 해치커버 대신 주야간 작업갯수를 작업보고로 기록한다.
  const isHatchSkipShip = isHatchSkipShipInfo(voyage?.info);   // 1.56-06: 단일 소스(utils) — ATPR 추가(자동 해치, 검수사 확정 2026-08-12)
  // V8.10: 주야간 보고 — 진입 시 시각 자동 판정(reportShiftToShow), 토글로 수동 전환.
  const [dnShift, setDnShift] = useState(null);   // null이면 자동, '주간'|'야간'이면 수동 고정

  // V8.10: 해치 제외 4척 주야간 집계용 — 양하·선적 양쪽 평택분 컨을 모달 안에서 직접 조립.
  //   집계는 작업 모드(가이드/수동)와 무관하게 Firebase 완료 레코드(completed/{cn}={by,at})가 근거.
  //   호출부(VoyagePage)는 건드리지 않는다 — voyage prop만으로 조립(외과적 변경 유지).
  const dnContainers = useMemo(() => {
    if (!isHatchSkipShip) return { discharge: [], loading: [] };
    const buildMode = (m) => shiftReportContainers(voyage, m);   // 3.63: 조립 한 벌(17시 갱별 보고 창과 같은 목록)
    return { discharge: buildMode('discharge'), loading: buildMode('loading') };
  }, [voyage, isHatchSkipShip]);

  // 현재 보여줄 시프트(자동 또는 수동 고정) + 양하/선적 보고서.
  const dnActiveShift = dnShift || reportShiftToShow(Date.now());
  //  3.66: 종전 배 전체 표 — 갱별 계산이 실패했을 때만 쓴다. 창이 닫혀 있으면 세지 않는다(2차 감사 — 항차 화면에 늘 붙어 있어 틱마다 돌았다).
  const dnOn = !!open && view === 'daynight';
  const dnReportD = useMemo(() => (dnOn ? buildShiftReport(dnContainers.discharge, dnActiveShift, Date.now()) : null), [dnOn, dnContainers, dnActiveShift]);
  const dnReportL = useMemo(() => (dnOn ? buildShiftReport(dnContainers.loading, dnActiveShift, Date.now()) : null), [dnOn, dnContainers, dnActiveShift]);
  //  ★ 3.66 — **갱별로 나눈다.** 검수사 2026-09-28 12:34 «여기서 보면 갱호수별이 아니고 전체가 보입니다. 갱별로 나누어져 있어야 합니다.» · 관문 4 «갱별 + 배 전체 합계».
  //    계산은 17시 창·보고 보관과 같은 한 벌(utils.buildGangShiftReport — 3.63 «갱별보고여야함»). 못 나누는 배(호기 순서·베이사전·오차 문지기)는 그 이유와 터미널 호기 집계 대수.
  //    실패하면 조용히 넘기지 않고 콘솔에 남기고 종전 배 전체 표로 보인다.
  //    마감이 지난 보고(17:00~17:29 · 05:30~05:59 자동 선택, 또는 지난 근무를 눌렀을 때)는 17시 창·보고 보관과 같은 한 벌(ferryCutItem) —
  //    적어 둔 마감 보고가 있으면 그것, 없으면 마감 시각으로 다시 세고 «다시 센 값»이라고 밝힌다(2차 감사 — 지금 자료로 세면 보관 창과 갱 숫자가 갈렸다).
  //    마감 전(근무 중)은 지금 자료로 센다.
  const dnGang = useMemo(() => {
    if (!isHatchSkipShip || !dnOn) return null;
    try {
      const now = Date.now();
      const cutMs = shiftCutMs(dnActiveShift, now);
      if (now > cutMs) return { ...ferryCutItem(voyageKey, voyage, { shift: dnActiveShift, cutMs, key: shiftReportKey(dnActiveShift, cutMs) }, now), archive: true };
      return { key: voyageKey, info: voyage?.info || {}, rep: buildGangShiftReport(voyage, ferryPagesOf(voyage, voyageKey), now, { shift: dnActiveShift }) };
    } catch (e) { console.warn('[3.66] 주야간 작업보고 갱별 계산 실패 — 배 전체 표로 보입니다', e); return null; }
  }, [voyage, voyageKey, isHatchSkipShip, dnActiveShift, dnOn]);
  const [activeWork, setActiveWork] = useState({});  // {1호기: {mode, started, paused, reason}, ...}
  //  ★ 3.36 — **시작보고 호기 = 앱 호기.** 검수사 메모 2026-09-06 21:27
  //    *«약간의 버그 4호기로 양하시작보고를 하고 3호기로 양하를 하는데 제재가 없음»* ·
  //    확답 2026-09-09 *«보고 호기를 따라간다 — 갱진행상황에 따라 검수사 스스로 호기를 바꿀수 있다»*.
  //    실사건 — `archive/ATPR_2640E` 09-06 20:45:33 «4호기 양하 시작» 뒤 같은 김성일이 21:10~21:24 **3호기**로 20대를 찍었다(메모 2분 전).
  //    뿌리는 두 값이 **따로 놀았다**는 것이다 — 이 화면의 호기는 `selectedEquip`(제 state)이고,
  //    컨을 찍을 때 박히는 호기는 `localStorage.gm_equip_no`(`getEquipNumber`)인데 서로 한 번도 안 만났다.
  //    (헤더 장비 모달은 «작업 보고에 자동 포함됩니다» 라고 이미 적어 두었는데 코드가 그 약속을 안 지켰다.)
  //    ⛔ **막지 않는다.** 2·3갱 동시작업이 정상이고(273항차 실측 — 어긋난 9건 중 7건이 정상 동시작업),
  //      갱이 바뀌면 검수사가 스스로 호기를 바꾼다. 여기서는 **두 값을 한 벌로 묶기만** 한다.
  // 시작 화면
  const [selectedEquip, setSelectedEquip] = useState(() => getEquipNumber() || lastEquip || '1호기');
  const [selectedMode, setSelectedMode] = useState('discharge');  // 'discharge' | 'loading'
  // 중단 사유
  const [pauseReason, setPauseReason] = useState('');
  const [externalReason, setExternalReason] = useState('');
  const [externalDetail, setExternalDetail] = useState('');
  const [pauseTarget, setPauseTarget] = useState({ equip: '', mode: '' });
  // M5.79 수동 보고용
  const [manualEquip, setManualEquip] = useState(lastEquip || '1호기');
  const [manualMode, setManualMode] = useState('discharge');
  const [manualAction, setManualAction] = useState('');   // 'pause' | 'resume' | 'done'
  const [manualReason, setManualReason] = useState('');
  // 해치
  const [hatchAction, setHatchAction] = useState('open');
  const [bayInput, setBayInput] = useState('');
  const [hatchEquip, setHatchEquip] = useState('');
  const [hatchPanels, setHatchPanels] = useState(1);  // V8.31: 해치커버 장수 수동 선택(1~3장) — 자동계산 제거
  const [hatchPanelsTouched, setHatchPanelsTouched] = useState(false);   // 4.10: 검수사가 장수 버튼을 직접 눌렀는가(안 눌렀으면 기본값 1 은 «고른 것» 이 아니다)
  // 콘박스
  const [conBoxType, setConBoxType] = useState('20');
  const [conBoxCount, setConBoxCount] = useState(1);
  const [conBoxEquip, setConBoxEquip] = useState('');
  // 4.46: 첫 화면 아래 «내가 보낸 보고» — 접어 둔다
  const [myRepOpen, setMyRepOpen] = useState(false);
  // 4.47: 같은 호기 양하↔선적 바꿈 물음 — {equip, fromMode, toMode, verb}
  const [switchCtx, setSwitchCtx] = useState(null);
  const [switchBusy, setSwitchBusy] = useState(false);

  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  const [hatchCountEl, askHatchCount] = useHatchCountConfirm();   // 4.10

  // Firebase에서 활성 작업 구독
  useEffect(() => {
    if (!voyageKey) return;
    const r = ref(db, `activeWork/${voyageKey}`);
    const unsub = onValue(r, (snap) => {
      setActiveWork(snap.val() || {});
    });
    // V9.57(I9): off(r)는 해당 ref의 리스너를 전부 떼어내 다른 구독자까지 끊는다 — 반환된 unsub만 해제
    return () => unsub();
  }, [voyageKey]);

  // TallyOne 1.26-02: 이 useMemo 는 원래 `if (!open) return null;` **뒤**에 있었다.
  //   닫힌 상태(open=false)에선 실행되지 않고 열리는 순간 훅이 하나 늘어 렌더마다 훅 개수가 달라졌다
  //   → React error #310 "Rendered more hooks than during the previous render" = 앱 전체 크래시.
  //   작업 보고 카드를 누르면 무조건 터졌다(검수사 신고 2026-08-08 09:47).
  //   지침 Ⅱ-6 원칙 그대로 — **모든 Hook 은 최상단, 조기 반환은 훅 선언 이후.**
  // TallyOne 1.8-09: 해치 그룹 계산용 베이 짝 사전 — GuidedWorkPanel(150행)과 같은 소스.
  //   양하·선적 컨을 모두 넣어야 짝이 온전하다(한쪽만 보면 홀수 베이 짝을 못 찾는다).
  const bayPairsForHatch = useMemo(() => {
    const all = [];
    for (const m of ['discharge', 'loading']) {
      const sec = voyage?.[m] || {};
      for (const c of Object.values(sec.ediContainers || {})) if (c) all.push(c);
    }
    return getBayPairs(all, voyage?.info?.imo || '', voyage?.info?.vsl || '');
  }, [voyage]);

  /* ⛔ 이 두 훅은 반드시 `if (!open) return null;` **앞**이다 — 2.88-01 에서 뒤에 놓아
       React error #310 으로 **앱 전체가 죽었다.** 바로 위 1.26-02 주석이 같은 사고를 적어 둔
       자리인데 그 아래에서 똑같이 반복했다. 훅은 최상단, 조기 반환은 훅 뒤. */
  /* ★ 2.88-01 (검수사 지시 2026-08-30) — **장수를 묻지 않는다. 앱이 센다.**
       검수사 — *«클로드님은 38번 베이에 커버를 몇장을 열어야 합니까»* → 답은 **1장**이었다.
       사전은 3장이라 하지만 양옆 커버 위에 통과화물이 80대 얹혀 있어 실제로 열리는 것은 가운데 1장뿐이다.
       V8.31 이 «자동계산 제거 — 검수사가 선택» 으로 돌린 뒤, 앱은 알 수 있는 것을 매번 물어 왔다.
     ⚠ 판정 못 하면(사전 없음·자료 없음) null — 그때만 종전처럼 손으로 고른다. */
  const hatchHint = useMemo(() => {
    const bays = String(bayInput || '').split(/[,\s]+/).map((b) => parseInt(b, 10)).filter(Number.isFinite);
    if (!bays.length) return null;
    const md = selectedMode === 'loading' ? 'loading' : 'discharge';
    /* 2.98-12 — 같은 해치(물리 커버)를 베이 수만큼 다시 세지 않는다. 트리오 «21, 22, 23» 입력이
       종전엔 같은 커버를 3줄로 보여주고 합산도 3배(6장)로 했다. 그룹(r.group)당 한 줄만. */
    const byGroup = new Map();
    for (const b of bays) {
      const r = hatchOpenableFor(voyage, md, b, null);
      if (!r) continue;
      const g = r.group ?? b;
      if (!byGroup.has(g)) { byGroup.set(g, { bay: b, bays: [b], ...r }); continue; }
      const e = byGroup.get(g);
      e.bays.push(b);
      //  감사 지적(2.98-12): 대표는 **아는 쪽** — total 큰 답 우선(1.69-07 «큰 장수로 올림» 한 벌,
      //    MCAP 0/3/0 → 3장 · STMJ 2/1/1 → 2장), 같으면 그룹 중심(b === g) 베이의 답.
      if (r.total > e.total || (r.total === e.total && b === g)) Object.assign(e, r, { bay: e.bay, bays: e.bays });
    }
    const out = [...byGroup.values()];
    return out.length ? out : null;
  }, [bayInput, voyage, selectedMode]);
  //  센 값이 있으면 장수 버튼을 그 값으로 맞춰 둔다 — 검수사가 다르게 보면 눌러서 바꾼다.
  useEffect(() => {
    if (!hatchHint) return;
    const sum = hatchHint.reduce((a, x) => a + (x.needed ?? x.openable), 0);   // 3.2-01: 열어야 할 장
    if (sum >= 1 && sum <= 3) { setHatchPanels(sum); setHatchPanelsTouched(false); }
  }, [hatchHint]);

  //  3.36: 이 창은 항차 화면에서 **조건 없이 마운트**되므로 위 초기값은 첫 마운트 때 한 번만 잡힌다.
  //    그 뒤 헤더에서 호기를 바꾸면 시작 화면은 옛 값을 그대로 들고 있었다 — 열 때마다 지금 앱 호기로 맞춘다.
  useEffect(() => {
    if (!open) return;
    const now = getEquipNumber();
    if (now) setSelectedEquip(now);
    /* ★ 4.45-01 (검수사 2026-10-23 «호기를 정하고 작업을 하면 모든 보고에도 그 호기를 기본으로 지정되어 있어야 하는데 다시 호기를 선택해야 하는 경우가 발생되곤 합니다.
         그러다 클릭 미스나 무심코 보고를 누르면 잘못된 호기로 보고가 됩니다») — 해치커버·콘박스·수동 보고도 **열 때마다 앱 호기**로 맞춘다.
         종전 해치·콘박스 기본값은 «이 배에서 작업 시작을 누른 호기 중 첫 번호»(activeWork 첫 키)였다 — 앱 호기와 무관했고 끝난 배에 남은 «진행 중» 기록까지 끌어왔다
         (실측 DJCF 0152N 10-22 02:56 김성일 4호기인데 기본 3호기 · SWBT 2614N 09-08 박진우 3호기인데 4호기로 콘박스·해치 보고 · XTPG 542E 10-02 박진우 3호기인데 기본 2호기).
         수동 보고는 항차 화면에 처음 들어온 때의 호기(lastEquip)에 머물렀다. 한 번 누른 다른 호기는 창을 닫았다 열어도 남았다.
         다른 갱 몫을 대신 보고할 때는 눌러 바꾼다 — 그 값은 이번 열림에만 쓰인다(STMJ 2663E 10-15 05:43 3호기 작업 중 2호기 몫 닫힘, 정상).
         앱 호기가 없거나 이 부두에 없는 번호면 종전대로(해치·콘박스 = 진행 중 호기). */
    setHatchEquip(''); setConBoxEquip('');
    if (equipNumbers.includes(now)) setManualEquip(now);
    /*   양하·선적도 지금 보고 있는 작업으로 맞춘다 — 호기의 진행 중 작업이 하나가 아니면(시작을 안 눌렀거나 양하·선적 둘 다) 보고 모드·항차를 이것으로 정한다(equipModeOf).
         종전엔 지난번 시작 화면에서 고른 값(처음엔 양하)이라, 선적 중 닫힘이 양하 항차로 나갔다(실측 STMJ 2663E 10-15 05:43 2호기 6번 CLOSE — 선적 중인데 mode discharge). */
    if (pageMode === 'loading' || pageMode === 'discharge') setSelectedMode(pageMode);
    //  4.47(감사 중2): 닫았다 다시 열면 묵은 바꿈 물음을 띄우지 않는다
    setSwitchCtx(null);
    setView((v) => (v === 'switch' ? 'main' : v));
  }, [open]);
  //  3.36(감사 딸림): 창이 열려 있는 동안 **헤더에서** 호기를 바꿔도 따라간다 —
  //    안 그러면 두 값이 다시 갈라져 이 판이 없앤 어긋남이 되살아난다(`Header`·`GuidedWorkPanel`·`SearchPanel` 과 같은 알림을 듣는다).
  //  4.45-01(감사 하2): 알림 처리는 첫 렌더에 한 번 붙으므로 부두 번호 목록은 ref 로 그때그때 읽는다 — 열림 때와 같이 이 부두 번호일 때만 수동 보고 호기를 맞춘다.
  const equipNumbersRef = useRef(equipNumbers);
  equipNumbersRef.current = equipNumbers;
  useEffect(() => {
    //  4.45-01: 앱 호기가 바뀌면 해치·콘박스·수동 보고도 따라간다(위 열림 때와 같은 뜻).
    const onEq = (e) => { const n = (e && e.detail) || getEquipNumber() || '1호기'; setSelectedEquip(n); setHatchEquip(''); setConBoxEquip(''); if (equipNumbersRef.current.includes(n)) setManualEquip(n); };
    window.addEventListener('equipChanged', onEq);
    return () => window.removeEventListener('equipChanged', onEq);
  }, []);

  if (!open) return null;
  //  ★ 3.51: 조회만은 보고를 쓰지 않는다 — 열어서 채우다 저장이 막히면 «보냈다»고 오해한다. 들어올 때 말한다(검수사 «조회만으로는 아무 작업을 할수 없습니다. 보기만 할뿐»).
  if (!canWorkNow()) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose} data-view-only-report="1">
        <div className="bg-ink-900 border-2 border-sky-700 rounded-card p-5 max-w-sm w-full space-y-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-base font-black text-sky-200">🔍 조회만으로 들어와 있습니다</div>
          <div className="text-xs text-dim-300 leading-relaxed">보고는 기록되지 않습니다. 화면과 호기는 그대로 보실 수 있고, 작업하려면 헤더의 [🔍 조회만]을 눌러 작업자(선박·호기)로 바꾸세요.</div>
          <button onClick={onClose} className="w-full py-3 rounded-pill bg-ink-800 border border-line text-dim-100 font-bold">닫기</button>
        </div>
      </div>
    );
  }

  const vsl = voyage?.info?.vsl || '';
  // V9.57(I9): 미사용 shipImo 제거
  // M6.37: mode 기반 voy 선택 — 양하 보고는 voy_d (양하 항차), 선적 보고는 voy_l (선적 항차)
  //   예: XTPG 양하 0523E, 선적 0523W → 양하 보고에 0523E, 선적 보고에 0523W
  //   각 핸들러 진입 시 자신의 mode로 voy를 shadowing해서 정확한 항차 전달
  const getVoy = (m) => {
    if (m === 'discharge') return voyage?.info?.voy_d || voyage?.info?.voy || '';
    if (m === 'loading')   return voyage?.info?.voy_l || voyage?.info?.voy || '';
    return voyage?.info?.voy_d || voyage?.info?.voy_l || voyage?.info?.voy || '';
  };
  const voy = getVoy(selectedMode);  // 기본 fallback (UI 표시용) — 현재 선택 모드 항차

  // 활성 작업: [equipNo, mode, awData] 배열로 평탄화
  const activeWorkList = [];
  Object.entries(activeWork || {}).forEach(([equip, modes]) => {
    if (!modes || typeof modes !== 'object') return;
    Object.entries(modes).forEach(([mode, data]) => {
      if (data && (data.status === 'running' || data.status === 'paused')) {
        activeWorkList.push({ equip, mode, ...data });
      }
    });
  });
  // 장비별로 그룹화
  const activeByEquip = {};
  activeWorkList.forEach(w => {
    if (!activeByEquip[w.equip]) activeByEquip[w.equip] = [];
    activeByEquip[w.equip].push(w);
  });
  //  4.45-01: 앱 호기(이 부두 번호일 때만) — 해치·콘박스 기본값의 첫째. 없을 때만 진행 중 호기 첫 번호(종전).
  const myEquip = equipNumbers.includes(getEquipNumber()) ? getEquipNumber() : '';
  const defaultReportEquip = myEquip || Object.keys(activeByEquip)[0] || '';

  /*  ★ 2.98-11 — **조용한 실패 금지** (3금지 ③).
        작업 보고의 다섯 쓰기에 try/catch 가 없어, RTDB 쓰기가 거부되면(권한·오프라인)
        프라미스가 그대로 죽고 뒤의 setView·onClose 가 안 돌아 **화면이 멈춘 채 아무 말도 안 했다.**
        검수원은 «보고했다»고 믿고 배를 마친다. ⇒ 실패를 화면에 띄우고 false 를 돌려준다.
      ⚠ 훅이 아니다 — «if (!open) return null» 뒤에 두어도 안전(2.88-01 error #310 함정 회피). */
  const setActiveWorkSafe = async (path, val, what) => {
    try { await set(ref(db, path), val); return true; }
    catch (e) {
      alert('\u26a0 ' + what + ' \uc800\uc7a5 \uc2e4\ud328\n\n\uc2e0\ud638\ub97c \ud655\uc778\ud558\uace0 \ub2e4\uc2dc \ub20c\ub7ec \uc8fc\uc138\uc694.\n(' + (e && e.message ? e.message : e) + ')');
      return false;
    }
  };

  /*  ★ 4.47 — 시작·중단·재개·완료의 «기록» 한 벌(카톡 공유·창 닫기는 부르는 쪽). 성공하면 카톡 글, 실패하면 null.
        양하↔선적 바꿈(runSwitch)이 두 보고를 이어 기록하고 카톡을 한 번에 보내려고 나눴다. 기록 내용은 종전과 같다. */
  const startCore = async (equipNo, modeArg) => {
    const voy = getVoy(modeArg);  // M6.37: mode 기반 voy
    const time = Date.now();
    const action = `${modeArg}_start`;
    const message = buildWorkStatusMessage({
      vsl, voy, action, time, equip: equipNo,
    });

    // M3.5.6-fix: mode별로 별도 저장 (장비 1대가 양하+선적 동시 가능)
    if (!await setActiveWorkSafe(`activeWork/${voyageKey}/${equipNo}/${modeArg}`, {
      mode: modeArg,
      status: 'running',
      startedAt: time,
      vsl, voy,
    }, '작업 시작 보고')) return null;

    // 보고 이력 저장
    //  4.47(감사 중·기존): 보고 쓰기가 거부되면 조용히 죽지 않고 알린다(종전엔 activeWork 만 바뀌고 unhandled rejection 으로 끝났다)
    try {
      await fbAddWorkReport(voyageKey, { by: inspector || '',
        type: 'work_status',
        action,
        mode: modeArg,
        equip: equipNo,
        message,
      });
    } catch (e) {
      console.error('[4.47] 작업 보고 저장 실패', equipNo, modeArg, e);
      alert('\u26a0 작업 보고 저장 실패 — 진행 중 표시는 바뀌었을 수 있습니다. 작업 보고 창을 다시 열어 확인하십시오.\n(' + (e && e.message ? e.message : e) + ')');
      return null;
    }
    return message;
  };
  const pauseCore = async (equipNo, modeArg, reason) => {
    const voy = getVoy(modeArg);  // M6.37
    const time = Date.now();
    // M5.79: aw 없으면(시작 기록 없음) 폴백 객체로 진행 — 이어받기/수동 보고 케이스
    const aw = activeWork[equipNo]?.[modeArg] || { mode: modeArg, vsl, voy };
    const action = `${modeArg}_pause`;
    const message = buildWorkStatusMessage({
      vsl, voy, action, time, reason, equip: equipNo,
    });

    if (!await setActiveWorkSafe(`activeWork/${voyageKey}/${equipNo}/${modeArg}`, {
      ...aw,
      status: 'paused',
      pausedAt: time,
      pauseReason: reason,
    }, '작업 중단 보고')) return null;

    //  4.47(감사 중·기존): 보고 쓰기가 거부되면 조용히 죽지 않고 알린다(종전엔 activeWork 만 바뀌고 unhandled rejection 으로 끝났다)
    try {
      await fbAddWorkReport(voyageKey, { by: inspector || '',
        type: 'work_status',
        action,
        mode: modeArg,
        equip: equipNo,
        reason,
        message,
      });
    } catch (e) {
      console.error('[4.47] 작업 보고 저장 실패', equipNo, modeArg, e);
      alert('\u26a0 작업 보고 저장 실패 — 진행 중 표시는 바뀌었을 수 있습니다. 작업 보고 창을 다시 열어 확인하십시오.\n(' + (e && e.message ? e.message : e) + ')');
      return null;
    }
    return message;
  };
  const resumeCore = async (equipNo, modeArg) => {
    const voy = getVoy(modeArg);  // M6.37
    const time = Date.now();
    // M5.79: aw 없으면 폴백 (이어받기 시 시작 기록 부재 가능)
    const aw = activeWork[equipNo]?.[modeArg] || { mode: modeArg, vsl, voy };
    const action = `${modeArg}_start`;
    const message = buildWorkStatusMessage({
      vsl, voy, action, time, equip: equipNo,
    }) + '\n(재개)';

    if (!await setActiveWorkSafe(`activeWork/${voyageKey}/${equipNo}/${modeArg}`, {
      ...aw,
      status: 'running',
      resumedAt: time,
      pauseReason: null,
    }, '작업 재개 보고')) return null;

    //  4.47(감사 중·기존): 보고 쓰기가 거부되면 조용히 죽지 않고 알린다(종전엔 activeWork 만 바뀌고 unhandled rejection 으로 끝났다)
    try {
      await fbAddWorkReport(voyageKey, { by: inspector || '',
        type: 'work_status',
        action: `${modeArg}_resume`,
        mode: modeArg,
        equip: equipNo,
        message,
      });
    } catch (e) {
      console.error('[4.47] 작업 보고 저장 실패', equipNo, modeArg, e);
      alert('\u26a0 작업 보고 저장 실패 — 진행 중 표시는 바뀌었을 수 있습니다. 작업 보고 창을 다시 열어 확인하십시오.\n(' + (e && e.message ? e.message : e) + ')');
      return null;
    }
    return message;
  };
  const doneCore = async (equipNo, modeArg) => {
    const aw = activeWork[equipNo]?.[modeArg] || null;
    const voy = getVoy(modeArg);  // M6.37
    const time = Date.now();
    const action = `${modeArg}_done`;
    const message = buildWorkStatusMessage({
      vsl, voy, action, time, equip: equipNo,
    });

    // mode별로 활성 작업 종료 (이미 없는 경우도 null 세팅으로 안전)
    if (!await setActiveWorkSafe(`activeWork/${voyageKey}/${equipNo}/${modeArg}`, null, '작업 완료 보고')) return null;

    //  4.47(감사 중·기존): 보고 쓰기가 거부되면 조용히 죽지 않고 알린다(종전엔 activeWork 만 바뀌고 unhandled rejection 으로 끝났다)
    try {
      await fbAddWorkReport(voyageKey, { by: inspector || '',
        type: 'work_status',
        action,
        mode: modeArg,
        equip: equipNo,
        message,
        ...(aw ? {} : { manual: true }),   // M5.79: 수동 완료 마커
      });
    } catch (e) {
      console.error('[4.47] 작업 보고 저장 실패', equipNo, modeArg, e);
      alert('\u26a0 작업 보고 저장 실패 — 진행 중 표시는 바뀌었을 수 있습니다. 작업 보고 창을 다시 열어 확인하십시오.\n(' + (e && e.message ? e.message : e) + ')');
      return null;
    }
    return message;
  };

  /*  ★ 4.47 — **같은 호기의 다른 작업이 진행 중이면, 시작·재개 전에 한 번 묻는다.** 검수사 2026-10-24 «양하중단사유 선적시작 또는 선적재개 떄문에 선적중단 사유 양하 재개 때문에» · «따로 적는게 불편합니다».
        [양하 중단하고 선적 시작] — 사유는 앱이 적는다(utils.switchReasonOf) · [양하 완료하고 선적 시작] — 양하가 끝났는데 완료를 안 누른 때(보관 TMPZ 2023E·SWSP 2609N) · [취소] — 아무것도 안 보낸다.
        두 보고는 종전처럼 따로 기록하고(타임시트·미르가 그대로 읽는다) 카톡은 한 글로 묶어 공유창을 한 번만 연다. 다른 호기는 묻지 않는다(2·3갱 동시 작업 정상). */
  const askSwitchIfBusy = (equipNo, modeArg, verb) => {
    const o = otherRunningWork(activeWork, equipNo, modeArg);
    if (!o) return false;
    setSwitchCtx({ equip: equipNo, fromMode: o.mode, toMode: modeArg, verb });
    setView('switch');
    return true;
  };
  const runSwitch = async (kind) => {
    const c = switchCtx;
    if (!c || switchBusy) return;
    setSwitchBusy(true);
    try {
      const reason = switchReasonOf(c.toMode, c.verb);
      //  누르는 순간 다시 본다(감사 중2) — 그 사이 다른 폰에서 이미 중단·완료했으면 둘째 작업만 한다(중단을 두 번 쓰거나 사유를 덮지 않는다)
      const still = otherRunningWork(activeWork, c.equip, c.toMode);
      const m1 = !still ? '' : kind === 'pause' ? await pauseCore(c.equip, c.fromMode, reason) : await doneCore(c.equip, c.fromMode);
      if (m1 == null) return;
      const m2 = c.verb === 'resume' ? await resumeCore(c.equip, c.toMode) : await startCore(c.equip, c.toMode);
      //  둘째가 실패하면 기록된 첫째만 보낸다 — 보냈다고 말하지 않은 것을 보내지 않는다(그리고 창을 닫아 중단이 두 번 기록되지 않게)
      const msg = [m1, m2].filter((x) => x).join('\n\n');
      if (msg) await shareText(msg, '검수 보고');
      setSwitchCtx(null); setView('main'); onClose();
    } catch (e) {
      console.error('[4.47] 양하·선적 바꿈 보고 실패', c, e);
      alert('\u26a0 보고 저장 실패\n\n' + (e && e.message ? e.message : e));
    } finally { setSwitchBusy(false); }
  };

  const handleStartWork = async () => {
    if (!selectedEquip) { alert('장비를 선택하세요'); return; }
    if (askSwitchIfBusy(selectedEquip, selectedMode, 'start')) return;   // 4.47
    const message = await startCore(selectedEquip, selectedMode);
    if (message == null) return;
    await shareText(message, '검수 보고');
    setView('main');
    onClose();
  };

  const handlePause = async (equipNo, modeArg) => {
    if (!pauseReason.trim()) { alert('중단 사유를 입력하세요'); return; }
    const message = await pauseCore(equipNo, modeArg, pauseReason);
    if (message == null) return;
    await shareText(message, '검수 보고');
    setPauseReason('');
    setView('main');
    onClose();
  };

  // M5.76: 외부 요인 작업 중단 (작업 시작 안 한 상태에서도 보고 가능)
  const handleExternalPause = async () => {
    const reason = externalReason === '기타' ? externalDetail.trim() : externalReason;
    if (!reason) return;
    const time = Date.now();
    const timeStr = new Date(time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const message = `[작업 중단 보고]\n선박: ${vsl}\n항차: ${voy}\n시간: ${timeStr}\n사유: ${reason}`;
    await fbAddWorkReport(voyageKey, { by: inspector || '',
      type: 'external_pause',
      reason,
      message,
    });
    await shareText(message, '검수 보고');
    setExternalReason('');
    setExternalDetail('');
    setView('main');
    onClose();
  };

  const handleResume = async (equipNo, modeArg) => {
    if (askSwitchIfBusy(equipNo, modeArg, 'resume')) return 'asked';   // 4.47 — 부르는 쪽(수동 보고)이 화면을 첫 화면으로 돌리지 않게 알린다
    const message = await resumeCore(equipNo, modeArg);
    if (message == null) return;
    await shareText(message, '검수 보고');
    onClose();
  };

  const handleDone = async (equipNo, modeArg) => {
    const modeLabel = modeArg === 'discharge' ? '양하' : '선적';
    // M5.79: aw 없어도 완료 보고 가능 — 한 갱 먼저 작업 끝났을 때 시작 기록 없는 케이스
    const aw = activeWork[equipNo]?.[modeArg] || null;
    askConfirm({
      title: '작업 완료 보고',
      message: `${equipNo} ${modeLabel}\n완료 보고하시겠습니까?${aw ? '' : '\n(시작 기록 없이 수동 완료)'}`,
      confirmLabel: '완료 보고',
      cancelLabel: '취소',
      onConfirm: async () => {
        const message = await doneCore(equipNo, modeArg);
        if (message == null) return;
        await shareText(message, '검수 보고');
        onClose();
      },
    });
  };

  // V7.94-16: 항차 오표시 수정 — (구) activeByEquip[equip][0].mode 고정: 활성 작업이 없거나
  //   한 장비에 양하+선적 동시 활성이면 엉뚱한 항차(특히 voy_d 폴백 → 선적인데 양하 항차)로 발송.
  //   (신) 장비의 활성 모드가 정확히 1개면 그것, 아니면 화면에서 선택된 모드(selectedMode)를 사용.
  const equipModeOf = (eq) => {
    const ms = activeByEquip[eq];
    if (ms && ms.length === 1) return ms[0].mode;
    return selectedMode;
  };

  const handleHatch = async () => {
    const equip = hatchEquip || defaultReportEquip;   // 4.45-01: 앱 호기 먼저
    if (!equip) { alert('장비를 선택하세요 (작업 중인 장비 없음)'); return; }
    const bays = cleanReportBays(bayInput);   // 4.46: 베이 칸은 숫자만 — «10번베이» 가 타임시트에 글자째 찍혔다(보관 22건)
    if (bays.length === 0) { alert('베이 번호를 입력하세요'); return; }
    const voy = getVoy(equipModeOf(equip));

    //  4.10 (검수사 2026-10-07 «보고 직전에 커버 장수를 맞는지 확인하고 보고 … 무심코 보고 했다가 6장 오픈을 보고 했으니까요»)
    //   보고를 쓰기 직전에 베이·앱이 센 장수·장별 홀드 평택 대수를 보이고 장수를 확인받는다. 취소하면 아무것도 저장·공유하지 않는다.
    //   처음 값 — 검수사가 위 화면에서 장수 버튼을 직접 눌렀으면 그 값, 안 눌렀으면 앱이 센 값(못 셌으면 비워서 직접 고르게 한다 — 기본값 1 이 눈에 안 띄고 나가던 것).
    //   앱이 센 값과 다르게 고르면 창이 «앱이 센 장수는 N장» 을 알린다.
    const _md = equipModeOf(equip) === 'loading' ? 'loading' : 'discharge';
    const countDetail = hatchPanelDetailOf(voyage, _md, bays, getShipBayDictData(voyage?.info?.imo || '', voyage?.info?.vsl || ''), (b) => bayGroupCenter(b, bayPairsForHatch));
    const chosen = await askHatchCount({ action: hatchAction, bays, detail: countDetail, initial: hatchPanelsTouched ? hatchPanels : (countDetail.count > 0 ? countDetail.count : null) });
    if (chosen == null) return;
    setHatchPanels(chosen); setHatchPanelsTouched(false);   // 고른 값은 이번 보고에 쓰였다 — 다음 보고에서 «직접 누른 값» 으로 남겨 두지 않는다(이 창은 닫아도 상태가 남는다)

    const time = Date.now();
    const panelCount = chosen;  // V8.31: 자동계산 제거 → 4.10: 보고 직전 확인 창에서 검수사가 확인해 고른 장수
    const message = buildHatchMessage({ vsl, voy, bays, action: hatchAction, time, equip, panelCount });

    await fbAddWorkReport(voyageKey, { by: inspector || '',
      type: 'hatch',
      action: hatchAction,
      // TallyOne 1.8-10: mode 를 함께 남긴다 — 자동 유도가 reports 로 소급 인식할 때
      //   양하 close 와 선적 close 를 구분하려면 이 값이 있어야 한다(옛 기록엔 없다).
      mode: equipModeOf(equip) === 'loading' ? 'loading' : 'discharge',
      bays,
      equip,
      panelCount,
      message,
    });

    // TallyOne 1.8-09: **수동으로 닫은 것을 자동 유도가 알게 한다.**
    //   자동 유도(GuidedWorkPanel)가 "해치커버 닫을까요?"를 묻지 않는 근거는 오직
    //   `info.hatchDone["{mode}_{center}"]` 하나다. 종전엔 수동 보고가 카톡과 reports 에만
    //   남기고 이 표시를 안 찍어, 수동으로 닫아도 자동모드가 되물었다
    //   (검수사 신고 2026-08-05 — STMJ 2644W 베이 18을 수동으로 CLOSE 했는데 또 물음).
    //   ⚠ 실패해도 보고 자체는 이미 나갔으므로 막지 않는다. 다만 조용히 넘기지는 않는다.
    try {
      /* ★ 2.88 — 키에서 **모드를 뺀다**. 커버는 배에 하나뿐이다.
           종전엔 `{mode}_{center}` 였고 그 mode 는 **장비**로 정했다(equipModeOf). 그래서
           선적 중에 닫아도 장비가 양하로 잡히면 `discharge_38` 로 들어갔고, 선적 화면은
           `loading_38` 을 찾아 **닫은 커버를 못 봤다**(실측 MCSC 633N 15:28).
         ⚠ 옛 키는 지우지 않는다 — 읽는 쪽이 폴백으로 받는다. */
      const prev = voyage?.info?.hatchDone || {};
      const next = { ...prev };
      for (const b of bays) {
        const center = bayGroupCenter(b, bayPairsForHatch);
        if (center != null) next[String(center)] = hatchAction;
      }
      if (Object.keys(next).length !== Object.keys(prev).length ||
          JSON.stringify(next) !== JSON.stringify(prev)) {
        await fbUpdateVoyageInfo(voyageKey, { hatchDone: next });
      }
    } catch (e) {
      console.warn('[해치 수동보고] hatchDone 표시 저장 실패 — 자동 유도가 다시 물을 수 있습니다', e);
    }

    await shareText(message, '해치커버');
    setBayInput('');
    setView('main');
    onClose();
  };

  const handleConBox = async () => {
    const equip = conBoxEquip || defaultReportEquip;   // 4.45-01: 앱 호기 먼저
    if (!equip) { alert('장비를 선택하세요 (작업 중인 장비 없음)'); return; }
    const voy = getVoy(equipModeOf(equip));  // V7.94-16: 항차 오표시 수정
    const time = Date.now();
    const message = buildConBoxMessage({ vsl, voy, type: conBoxType, count: conBoxCount, time, equip });

    await fbAddWorkReport(voyageKey, { by: inspector || '',
      type: 'conbox',
      conBoxType, conBoxCount, equip,
      message,
    });

    await shareText(message, '콘박스');
    setView('main');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4" onClick={onClose}>
      <div className="bg-ink-900 border-2 border-line rounded-t-2xl md:rounded-card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-ink-900 border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400"/>
            <span className="font-bold text-emerald-300">작업 보고</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-ink-750 rounded">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* 메인 화면: 활성 작업 + 새 작업 시작 */}
        {view === 'main' && (
          <div className="p-3 space-y-3">
            {/* 활성 작업 카드 - 장비별 양하/선적 분리 */}
            {Object.keys(activeByEquip).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-dim-200">진행 중인 작업</div>
                {/* 4.45-01: 내 호기 줄을 맨 위에 «내 호기» 로 — 옆 줄의 중단·완료를 잘못 누르지 않게(검수사 «클릭 미스나 무심코 보고를 누르면 잘못된 호기로 보고가 됩니다») */}
                {Object.entries(activeByEquip).sort(([a], [b]) => (b === myEquip) - (a === myEquip)).map(([equip, works]) => (
                  <div key={equip} className="bg-ink-800/40 border border-line rounded-pill p-2 space-y-2" data-my-equip={equip === myEquip ? '1' : undefined}>
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-orange-400"/>
                      <span className="font-bold text-base text-orange-200">{equip}</span>
                      {equip === myEquip && <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-orange-700 text-white">내 호기</span>}
                    </div>
                    {works.map(w => {
                      const isPaused = w.status === 'paused';
                      const modeLabel = w.mode === 'discharge' ? '양하' : '선적';
                      const modeIcon = w.mode === 'discharge' ? '⬇' : '⬆';
                      return (
                        <div key={w.mode} className={`border-2 rounded p-2 ${isPaused ? 'border-amber-700 bg-amber-950/30' : 'border-emerald-700 bg-emerald-950/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm">{modeIcon} {modeLabel}</span>
                              <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${isPaused ? 'bg-amber-700 text-white' : 'bg-emerald-700 text-white'}`}>
                                {isPaused ? '⏸ 중단' : '🟢 진행'}
                              </span>
                            </div>
                          </div>
                          <div className="text-2xs text-dim-300">
                            시작: {w.startedAt ? new Date(w.startedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            {w.pauseReason && <div className="text-amber-300 mt-0.5">사유: {w.pauseReason}</div>}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {!isPaused ? (
                              <button onClick={() => { setPauseTarget({ equip, mode: w.mode }); setView('pause'); }}
                                className="py-2 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                                <Pause className="w-3.5 h-3.5"/> {modeLabel} 중단
                              </button>
                            ) : (
                              <button onClick={() => handleResume(equip, w.mode)}
                                className="py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                                <Play className="w-3.5 h-3.5"/> {modeLabel} 재개
                              </button>
                            )}
                            <button onClick={() => handleDone(equip, w.mode)}
                              className="py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5"/> {modeLabel} 완료
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* 새 작업 시작 */}
            <button onClick={() => setView('start')}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-pill font-bold text-base flex items-center justify-center gap-2">
              <Play className="w-5 h-5"/> 새 작업 시작
            </button>

            {/* 추가 보고 (해치/콘박스) */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setView('hatch')}
                className="py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-pill font-bold text-xs flex items-center justify-center gap-1">
                <Unlock className="w-4 h-4"/> 해치커버
              </button>
              <button onClick={() => setView('conbox')}
                className="py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-pill font-bold text-xs flex items-center justify-center gap-1">
                <Box className="w-4 h-4"/> 콘박스
              </button>
            </div>
            {/* V8.10: 해치 제외 4척(TMPZ·TNJP·RZOR·OBWH)은 해치커버 대신 주야간 작업보고를 쓴다. */}
            {isHatchSkipShip && (
              <button onClick={() => { setDnShift(null); setView('daynight'); }}
                className="w-full py-3 bg-teal-700 hover:bg-teal-600 text-white rounded-pill font-bold text-sm flex items-center justify-center gap-2 border border-teal-500">
                📋 주야간 작업보고
              </button>
            )}
            {/* M5.79: 수동 보고 (시작 안 누른 작업) — 이어받기 / 한 갱 먼저 완료 케이스 */}
            {/* 4.47: 수동 보고의 작업 종류는 열 때 지금 화면의 작업(양하 화면이면 양하, 선적 화면이면 선적) — 종전엔 늘 «양하»로 켜져 선적 이어받기 중단·재개가 양하로 나갈 수 있었다 */}
            <button onClick={() => { setManualAction(''); setManualReason(''); if (pageMode === 'loading' || pageMode === 'discharge') setManualMode(pageMode); setView('manual'); }}
              className="w-full py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-pill font-bold text-sm flex items-center justify-center gap-2 border border-indigo-500">
              <RefreshCw className="w-4 h-4"/> 🔧 수동 보고 (시작 안 누른 작업)
            </button>
            {/* M5.76: 외부 요인 작업 중단 (장비고장/강풍/안개/기타) */}
            <button onClick={() => setView('external')}
              className="w-full py-3 bg-red-800 hover:bg-red-700 text-white rounded-pill font-bold text-sm flex items-center justify-center gap-2 border border-red-600">
              <AlertTriangle className="w-4 h-4"/> 작업 중단 (장비고장 / 강풍 / 안개 / 기타)
            </button>

            {/* 4.46: 내가 보낸 보고 — 보낸 사람만 고치고 지운다(검수사 2026-10-24 «잘못된 보고 수정기능은 보고자만 수정또는 삭제 할수 있게»). 보고 탭 목록과 같은 줄(ReportEditRow). */}
            {(() => {
              const mine = Object.values(voyage?.reports || {}).filter((r) => canEditReport(r, inspector)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
              if (!mine.length) return null;
              return (
                <div className="bg-ink-800/40 border border-line rounded-pill" data-my-reports={mine.length}>
                  <button type="button" onClick={() => setMyRepOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                    <span className="text-xs font-bold text-dim-100">✏ 내가 보낸 보고 {mine.length}건 — 잘못 보냈으면 고치기·지우기</span>
                    <span className="text-dim-400 text-xs">{myRepOpen ? '▲' : '▼'}</span>
                  </button>
                  {myRepOpen && (
                    <div className="px-3 pb-2 space-y-1.5 max-h-72 overflow-y-auto">
                      {mine.slice(0, 20).map((r) => (
                        <div key={r.ts} className="text-xs2 bg-ink-900/60 rounded px-2.5 py-1.5">
                          <div className="text-dim-200 whitespace-pre-wrap leading-snug">{String(r.message || '').split('\n').slice(0, 5).join(' · ')}</div>
                          <ReportEditRow voyageKey={voyageKey} voyage={voyage} reports={voyage?.reports || {}} report={r} me={inspector}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="text-2xs text-dim-400 text-center">
              💡 카톡 공유창이 열리면 단톡방을 선택하세요
            </div>
          </div>
        )}

        {/* 작업 시작 화면 */}
        {view === 'start' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-2">1) 장비 선택</div>
              {/*  3.36: 아래 단추는 고르는 그 순간 **앱 호기도 같이 바꾼다** — 컨을 찍을 때 박히는 호기(`gm_equip_no`)와 한 벌이 된다.
                   헤더 장비 모달과 같은 일을 한다(`Header.handleSelectEquip`) — 그래서 같은 알림(`equipChanged`)을 낸다. */}
              <div className="grid grid-cols-2 gap-2">
                {equipNumbers.map(n => (
                  <button key={n} onClick={() => { setSelectedEquip(n); setEquipNumber(n); try { window.dispatchEvent(new CustomEvent('equipChanged', { detail: n })); } catch (e) {} }}
                    className={`py-3 rounded-pill font-bold ${selectedEquip === n ? 'bg-orange-600 text-white border-2 border-orange-300' : 'bg-ink-800 text-dim-200'}`}>
                    🏗 {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-2">2) 작업 종류</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedMode('discharge')}
                  className={`py-3 rounded-pill font-bold ${selectedMode === 'discharge' ? 'bg-emerald-600 text-white border-2 border-emerald-300' : 'bg-ink-800 text-dim-200'}`}>
                  ⬇ 양하
                </button>
                <button onClick={() => setSelectedMode('loading')}
                  className={`py-3 rounded-pill font-bold ${selectedMode === 'loading' ? 'bg-emerald-600 text-white border-2 border-emerald-300' : 'bg-ink-800 text-dim-200'}`}>
                  ⬆ 선적
                </button>
              </div>
            </div>

            <div className="bg-ink-800 rounded p-2 text-xs text-dim-200">
              <div>📍 {vsl} {voy}</div>
              <div>🏗 {selectedEquip} - {selectedMode === 'discharge' ? '양하' : '선적'} 시작</div>
            </div>

            <button onClick={handleStartWork}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-pill font-bold flex items-center justify-center gap-2">
              <Send className="w-4 h-4"/> ▶ 시작 + 카톡 보고
            </button>
          </div>
        )}

        {/* 4.47: 같은 호기의 다른 작업이 진행 중일 때 — 한 번 묻고 두 보고를 이어 기록, 카톡은 한 번 */}
        {view === 'switch' && switchCtx && (() => {
          const L = (m) => (m === 'loading' ? '선적' : '양하');
          const subj = (m) => (m === 'loading' ? '선적이' : '양하가'), obj = (m) => (m === 'loading' ? '선적을' : '양하를');
          const to = `${L(switchCtx.toMode)} ${switchCtx.verb === 'resume' ? '재개' : '시작'}`;
          return (
            <div className="p-3 space-y-3" data-switch-ask="1">
              <div className="bg-amber-950/30 border border-amber-700 rounded p-3">
                <div className="font-bold text-amber-200 text-base">{switchCtx.equip} {subj(switchCtx.fromMode)} 진행 중입니다.</div>
                {(() => { const row = activeWork?.[switchCtx.equip]?.[switchCtx.fromMode]; const at = row && (row.resumedAt || row.startedAt); return at ? <div className="text-2xs text-dim-400" data-switch-since="1">{L(switchCtx.fromMode)} {row.resumedAt ? '재개' : '시작'} {new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div> : null; })()}
                <div className="text-xs text-dim-300 mt-1">{to} 전에 {obj(switchCtx.fromMode)} 어떻게 할지 고르십시오. 중단 사유 «{switchReasonOf(switchCtx.toMode, switchCtx.verb)}»{switchCtx.verb === 'resume' ? '는' : '은'} 앱이 적고, 두 보고를 카톡 한 번으로 보냅니다.</div>
              </div>
              <button type="button" disabled={switchBusy} onClick={() => runSwitch('pause')} data-switch-pause="1"
                className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-ink-750 text-white rounded-pill font-bold text-sm">
                {L(switchCtx.fromMode)} 중단하고 {to}
              </button>
              <button type="button" disabled={switchBusy} onClick={() => runSwitch('done')} data-switch-done="1"
                className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:bg-ink-750 text-white rounded-pill font-bold text-sm">
                {L(switchCtx.fromMode)} 완료하고 {to}
              </button>
              {switchBusy && <div className="text-xs text-amber-200 text-center" data-switch-busy="1">저장 중… 끝날 때까지 기다리십시오.</div>}
              <button type="button" disabled={switchBusy} onClick={() => { if (switchBusy) return; setSwitchCtx(null); setView('main'); }} data-switch-cancel="1"
                className="w-full py-2.5 bg-ink-800 disabled:opacity-50 text-dim-200 rounded-pill font-bold text-sm">취소</button>
            </div>
          );
        })()}

        {/* 중단 화면 */}
        {view === 'pause' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>
            <div className="bg-amber-950/30 border border-amber-700 rounded p-2 text-sm">
              <div className="font-bold text-amber-200">
                {pauseTarget.equip} {pauseTarget.mode === 'discharge' ? '양하' : '선적'} 중단
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">중단 사유 — 빠른 선택</div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[...pauseSwitchReasonsFor(pauseTarget.mode), '장비 고장', '강풍 대기', '안개 대기', '우천 대기', '화물 이상', '점심 식사'].map(r => (
                  <button key={r} type="button" onClick={() => setPauseReason(r)}
                    className={`py-2 rounded text-xs font-bold border ${pauseReason === r ? 'bg-amber-700 text-white border-amber-500' : 'bg-ink-800 text-dim-200 border-line'}`}>{r}</button>
                ))}
              </div>
              <input type="text" value={pauseReason} onChange={e => setPauseReason(e.target.value)}
                placeholder="또는 기타 사유 직접 입력"
                className="w-full bg-ink-800 border border-amber-600 rounded px-3 py-2 text-sm text-dim-100"/>
            </div>
            <button onClick={() => handlePause(pauseTarget.equip, pauseTarget.mode)}
              className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-pill font-bold flex items-center justify-center gap-2">
              <Pause className="w-4 h-4"/> 중단 보고
            </button>
          </div>
        )}

        {/* M5.76: 외부 요인 작업 중단 화면 */}
        {view === 'external' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>
            <div className="bg-red-950/40 border border-red-700 rounded p-2">
              <div className="font-bold text-red-200 text-sm flex items-center gap-1">
                <AlertTriangle className="w-4 h-4"/> 작업 중단 보고 (외부 요인)
              </div>
              <div className="text-xxs text-red-300/80 mt-1">전체 작업 중단 — 작업 시작 안 한 상태에서도 보고 가능</div>
            </div>
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">중단 사유</div>
              <div className="grid grid-cols-2 gap-1.5">
                {['장비 고장', '강풍 대기', '안개 대기', '우천 대기', '항만 사정', '기타'].map(r => (
                  <button key={r} type="button" onClick={() => setExternalReason(r)}
                    className={`py-2.5 rounded text-xs font-bold border ${externalReason === r ? 'bg-red-700 text-white border-red-500' : 'bg-ink-800 text-dim-200 border-line'}`}>{r}</button>
                ))}
              </div>
              {externalReason === '기타' && (
                <input type="text" value={externalDetail} onChange={e => setExternalDetail(e.target.value)}
                  placeholder="세부 사유 입력"
                  className="w-full mt-2 bg-ink-800 border border-red-600 rounded px-3 py-2 text-sm text-dim-100" autoFocus/>
              )}
            </div>
            <button onClick={handleExternalPause}
              disabled={!externalReason || (externalReason === '기타' && !externalDetail.trim())}
              className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:bg-ink-750 disabled:text-dim-400 text-white rounded-pill font-bold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4"/> 작업 중단 보고
            </button>
          </div>
        )}

        {/* M5.79: 수동 보고 화면 — 시작 안 누른 작업의 중단/재개/완료 */}
        {view === 'manual' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>
            <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-pill p-3">
              <div className="text-base font-black text-indigo-200 flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4"/> 수동 보고
              </div>
              <div className="text-xxs text-indigo-300/90 leading-relaxed">
                • 다른 검수원이 시작한 작업을 <b>이어받아</b> 중단/완료할 때<br/>
                • 한 갱이 먼저 완료하여 <b>시작 기록 없이 완료 보고</b>가 필요할 때<br/>
                • 시작 버튼을 못 누른 상태에서 <b>장비/모드 직접 선택</b>해 보고
              </div>
            </div>

            {/* 장비 선택 */}
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">장비</div>
              <div className="grid grid-cols-4 gap-1">
                {equipNumbers.map(n => (
                  <button key={n} onClick={() => setManualEquip(n)}
                    className={`py-2 rounded font-bold text-xs ${manualEquip === n ? 'bg-indigo-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 모드 선택 */}
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">작업 종류</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setManualMode('discharge')}
                  className={`py-3 rounded-pill font-bold text-sm ${manualMode === 'discharge' ? 'bg-blue-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  ⬇ 양하
                </button>
                <button onClick={() => setManualMode('loading')}
                  className={`py-3 rounded-pill font-bold text-sm ${manualMode === 'loading' ? 'bg-amber-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  ⬆ 선적
                </button>
              </div>
            </div>

            {/* 현재 Firebase 상태 표시 */}
            {(() => {
              const aw = activeWork[manualEquip]?.[manualMode];
              if (aw) {
                const isPaused = aw.status === 'paused';
                return (
                  <div className={`px-3 py-2 rounded border ${isPaused ? 'bg-amber-950/40 border-amber-700/50' : 'bg-emerald-950/40 border-emerald-700/50'}`}>
                    <div className="text-xs font-bold mb-0.5">
                      {isPaused ? '⏸ 중단 상태' : '🟢 진행 중'} — Firebase에 기록 있음
                    </div>
                    {aw.startedAt && <div className="text-2xs text-dim-300">시작: {new Date(aw.startedAt).toLocaleString('ko-KR')}</div>}
                    {aw.pauseReason && <div className="text-2xs text-amber-300">사유: {aw.pauseReason}</div>}
                  </div>
                );
              }
              return (
                <div className="px-3 py-2 rounded border bg-ink-800/40 border-line">
                  <div className="text-xs font-bold text-dim-200">📭 Firebase에 시작 기록 없음</div>
                  <div className="text-2xs text-dim-300 mt-0.5">수동 완료/중단 보고 가능 (이어받기·한 갱 먼저 완료 케이스)</div>
                </div>
              );
            })()}

            {/* 액션 선택 */}
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">보고 종류</div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setManualAction('pause')}
                  className={`py-3 rounded-pill font-bold text-xs flex items-center justify-center gap-1 ${manualAction === 'pause' ? 'bg-amber-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  <Pause className="w-3.5 h-3.5"/> 중단
                </button>
                <button onClick={() => setManualAction('resume')}
                  className={`py-3 rounded-pill font-bold text-xs flex items-center justify-center gap-1 ${manualAction === 'resume' ? 'bg-emerald-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  <Play className="w-3.5 h-3.5"/> 재개
                </button>
                {/*  ★ 4.33-02 — 검수사 2026-10-18 «이어서 작업을 하면 수동 작업보고에서 양하완료 선적완료가 없습니다» · «전 근무자가 시작보고를 안해서 입니다».
                    전 근무자가 시작보고를 안 했으면 활성 작업 기록이 없어 메인 화면에 «완료» 단추가 안 나온다 — 그때 시작 보고를 억지로 눌렀다 끝내야 했다.
                    ⇒ 작업 종류를 따로 고르지 않아도 «양하완료» «선적완료» 한 번으로 그 종류의 완료 보고가 선택된다(기존 완료 보고 그대로, 시작 기록 없으면 수동 완료 표시). */}
                <button onClick={() => { setManualMode('discharge'); setManualAction('done'); }}
                  className={`py-3 rounded-pill font-bold text-xs flex items-center justify-center gap-1 ${manualAction === 'done' && manualMode === 'discharge' ? 'bg-blue-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5"/> 양하완료
                </button>
                <button onClick={() => { setManualMode('loading'); setManualAction('done'); }}
                  className={`py-3 rounded-pill font-bold text-xs flex items-center justify-center gap-1 ${manualAction === 'done' && manualMode === 'loading' ? 'bg-amber-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5"/> 선적완료
                </button>
              </div>
            </div>

            {/* 중단 사유 (pause만) */}
            {manualAction === 'pause' && (
              <div>
                <div className="text-xs font-bold text-dim-200 mb-1">중단 사유 — 빠른 선택</div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[...pauseSwitchReasonsFor(manualMode), '장비 고장', '강풍 대기', '안개 대기', '우천 대기', '화물 이상', '점심 식사'].map(r => (
                    <button key={r} onClick={() => setManualReason(r)}
                      className={`py-2 rounded text-xs font-bold ${manualReason === r ? 'bg-amber-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <input type="text" value={manualReason} onChange={(e) => setManualReason(e.target.value)}
                  placeholder="또는 직접 입력"
                  className="w-full bg-ink-800 border border-line rounded px-3 py-2 text-sm text-dim-100"/>
              </div>
            )}

            {/* 실행 버튼 */}
            <button
              disabled={!manualAction || (manualAction === 'pause' && !manualReason.trim())}
              onClick={async () => {
                const voy = getVoy(manualMode);  // M6.37
                if (manualAction === 'pause') {
                  setPauseReason(manualReason);
                  // 직접 handlePause 호출 (pauseReason state 비동기 반영 회피)
                  if (!manualReason.trim()) return;
                  const time = Date.now();
                  const aw = activeWork[manualEquip]?.[manualMode] || { mode: manualMode, vsl, voy };
                  const action = `${manualMode}_pause`;
                  const message = buildWorkStatusMessage({ vsl, voy, action, time, reason: manualReason, equip: manualEquip });
                  if (!await setActiveWorkSafe(`activeWork/${voyageKey}/${manualEquip}/${manualMode}`, {
                    ...aw, status: 'paused', pausedAt: time, pauseReason: manualReason,
                  }, '수동 중단 보고')) return;
                  await fbAddWorkReport(voyageKey, { by: inspector || '',
                    type: 'work_status', action, mode: manualMode, equip: manualEquip,
                    reason: manualReason, message, manual: true,
                  });
                  await shareText(message, '검수 보고');
                  setManualReason(''); setManualAction(''); setView('main'); onClose();
                } else if (manualAction === 'resume') {
                  const asked = await handleResume(manualEquip, manualMode);
                  setManualAction(''); if (asked !== 'asked') setView('main');   // 4.47: 바꿈 물음이 떴으면 그 화면을 둔다
                } else if (manualAction === 'done') {
                  await handleDone(manualEquip, manualMode);
                  setManualAction(''); setView('main');
                }
              }}
              className="w-full py-3 bg-indigo-700 hover:bg-indigo-600 disabled:bg-ink-750 disabled:text-dim-400 text-white rounded-pill font-bold flex items-center justify-center gap-2">
              <Send className="w-4 h-4"/>
              {manualAction === 'pause' ? '중단 보고' :
               manualAction === 'resume' ? '재개 보고' :
               manualAction === 'done' ? `${manualMode === 'discharge' ? '양하' : '선적'} 완료 보고` : '보고 종류 선택'}
            </button>
          </div>
        )}

        {/* 해치 화면 */}
        {view === 'hatch' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">장비</div>
              <div className="grid grid-cols-4 gap-1">
                {equipNumbers.map(n => (
                  <button key={n} onClick={() => setHatchEquip(n)}
                    className={`py-2 rounded text-xs font-bold ${(hatchEquip || defaultReportEquip) === n ? 'bg-orange-600 text-white' : 'bg-ink-800 text-dim-300'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setHatchAction('open')}
                className={`py-3 rounded-pill font-bold flex items-center justify-center gap-2 ${hatchAction === 'open' ? 'bg-emerald-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                <Unlock className="w-4 h-4"/> OPEN
              </button>
              <button onClick={() => setHatchAction('close')}
                className={`py-3 rounded-pill font-bold flex items-center justify-center gap-2 ${hatchAction === 'close' ? 'bg-blue-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                <Lock className="w-4 h-4"/> CLOSE
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">베이 번호</div>
              <input
                type="text"
                value={bayInput}
                onChange={e => setBayInput(e.target.value)}
                placeholder="예: 1, 3, 5"
                className="w-full bg-ink-800 border border-line-strong rounded px-3 py-3 text-base mono text-dim-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* 2.88-01: 앱이 센 «열 수 있는 장수» 를 근거와 함께 보여준다 (검수사 «몇장을 열어야 합니까») */}
            {hatchHint && (
              <div className="rounded-card border border-cyan-700/50 bg-cyan-950/30 px-3 py-2 space-y-1">
                {hatchHint.map((h) => (
                  <div key={h.bay} className="text-xs2">
                    <span className="font-black text-cyan-200">{formatHatchBays(h.bays) || h.bay}번 — {h.total}장 중 </span>
                    <span className="font-black text-amber-300">{h.needed ?? h.openable}장</span>
                    <span className="text-dim-300"> 열면 됩니다</span>
                    {/* 3.2-01: 평택 홀드분이 있는 장만 센다 — 열 수 있는 장이 더 많으면 그 수도 같이 */}
                    {(h.needed != null && h.needed !== h.openable) && <span className="text-dim-400"> (열 수 있는 장 {h.openable})</span>}
                    {h.panels.filter((x) => x.blocked).map((x) => (
                      <div key={x.idx} className="text-2xs text-dim-400 mt-0.5">
                        · {x.idx + 1}번째 장 — 위에 화물 {x.blockers.length}대 (치워야 열립니다)
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {/* V8.31: 해치커버 장수 수동 선택(1~3장) — 2.88-01 부터 위 값으로 미리 맞춰 둔다 */}
            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">장수 선택{hatchHint ? ' (앱이 센 값 — 다르면 눌러서 바꾸세요)' : ''}</div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => { setHatchPanels(n); setHatchPanelsTouched(true); }}
                    className={`py-3 rounded-pill font-bold ${hatchPanels === n ? 'bg-orange-600 text-white' : 'bg-ink-800 text-dim-300'}`}>
                    {n}장
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleHatch}
              className={`w-full py-3 rounded-pill font-bold text-white flex items-center justify-center gap-2 ${hatchAction === 'open' ? 'bg-emerald-700' : 'bg-blue-700'}`}>
              <Send className="w-4 h-4"/> 해치 {hatchAction === 'open' ? 'OPEN' : 'CLOSE'} 보고
            </button>
          </div>
        )}

        {/* 콘박스 화면 */}
        {view === 'conbox' && (
          <div className="p-3 space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">장비</div>
              <div className="grid grid-cols-4 gap-1">
                {equipNumbers.map(n => (
                  <button key={n} onClick={() => setConBoxEquip(n)}
                    className={`py-2 rounded text-xs font-bold ${(conBoxEquip || defaultReportEquip) === n ? 'bg-orange-600 text-white' : 'bg-ink-800 text-dim-300'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">규격</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConBoxType('20')}
                  className={`py-3 rounded-pill font-bold ${conBoxType === '20' ? 'bg-purple-700 text-white' : 'bg-ink-800 text-dim-300'}`}>20자</button>
                <button onClick={() => setConBoxType('40')}
                  className={`py-3 rounded-pill font-bold ${conBoxType === '40' ? 'bg-purple-700 text-white' : 'bg-ink-800 text-dim-300'}`}>40자</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-dim-200 mb-1">개수</div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setConBoxCount(n)}
                    className={`py-3 rounded-pill font-bold text-lg ${conBoxCount === n ? 'bg-purple-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
                    {n}개
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-ink-800 rounded p-2 text-center text-sm font-bold">
              📦 콘박스 {conBoxType}자 {conBoxCount}개
            </div>

            <button onClick={handleConBox}
              className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-pill font-bold flex items-center justify-center gap-2">
              <Send className="w-4 h-4"/> 콘박스 보고
            </button>
          </div>
        )}

        {/* V8.10: 주야간 작업보고 (해치 제외 4척 전용) */}
        {view === 'daynight' && (
          <div className="space-y-3">
            <button onClick={() => setView('main')} className="text-xs text-dim-300">← 돌아가기</button>
            <div className="text-sm font-bold text-teal-300 text-center">📋 주야간 작업보고</div>
            {/* 주/야 토글 (자동 선택이 기본, 수동 전환 가능) */}
            <div className="grid grid-cols-2 gap-2">
              {['주간', '야간'].map(s => (
                <button key={s} onClick={() => setDnShift(s)}
                  className={`py-2.5 rounded-pill font-bold text-sm border ${
                    dnActiveShift === s
                      ? (s === '주간' ? 'bg-amber-700 border-amber-400 text-white' : 'bg-sky-800 border-sky-400 text-white')
                      : 'bg-ink-800 border-line text-dim-200 hover:bg-ink-750'
                  }`}>
                  {s === '주간' ? '☀ 주간보고 08–17' : '🌙 야간보고 19–05:30'}
                </button>
              ))}
            </div>
            <div className="text-2xs text-dim-400 text-center">
              {dnShift ? '수동 선택됨' : '현재 시각 기준 자동 선택'} · 보고 마감 +30분 여유
            </div>
            {/* ★ 3.64 카페리(TNJP·OBWH·RZOR) — 17:00·05:30 마감 갱별 보고 보관(검수사 «놓쳐서 작업 보고를 못했을떄 17시 기준으로 갱별 작업 보고 자료가 남아 있어야 합니다»).
                 창은 Ferry1700Alert 한 곳에서만 그린다 — 여기서는 열라고 알리기만(이벤트). */}
            {isFerry1700Ship(voyage?.info, voyageKey) && (() => {
              const n = ferryReportCuts(voyage, Date.now(), voyageKey).length;
              return (
                <button onClick={() => window.dispatchEvent(new CustomEvent('ferry1700Open', { detail: { voyageKey } }))} data-f1700-open="1"
                  className="w-full py-2.5 rounded-pill font-bold text-sm bg-amber-600 text-black">
                  📋 갱별 보고 보관 {n}건 — 17:00·05:30 마감 기준 · 💬 카톡 보고
                </button>
              );
            })()}
            {/* 3.66: 갱별 카드(내 갱 위) + 배 전체 합계 — 17시 창과 같은 모양 */}
            {dnGang && (
              <div data-dn-gang="1">
                <VoyageBlock item={dnGang} myNo={crewCraneNo(getEquipNumber())} shipAlways />
              </div>
            )}
            {/* 양하/선적 각 표 — 3.66: 갱별 계산이 실패했을 때만(종전 배 전체 표) */}
            {!dnGang && [['discharge', '양하', dnReportD], ['loading', '선적', dnReportL]].map(([m, label, rep]) => (
              <div key={m} className="bg-ink-900 border border-line rounded-pill p-2">
                <div className="text-xs font-bold text-dim-100 mb-1 flex items-center justify-between">
                  <span>{label}</span>
                  {!rep.excluded && (
                    <span className="text-2xs text-teal-300">
                      {rep.basis} 기준 (완료 {rep.doneTotal} · 잔여 {rep.remainTotal})
                    </span>
                  )}
                </div>
                {rep.excluded ? (
                  <div className="text-xxs text-dim-400 text-center py-2">{rep.reason}</div>
                ) : (
                  <table className="w-full text-xxs tabular-nums">
                    <thead>
                      <tr className="text-dim-300 border-b border-line">
                        <th className="text-left py-1">규격</th><th>F</th><th>E</th><th>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="text-dim-100">
                      {[['20ft', rep.tbl.s20], ['40ft', rep.tbl.s40], ['45ft', rep.tbl.s45]].map(([nm, o]) => (
                        <tr key={nm} className="border-b border-line">
                          <td className="text-left py-1 text-dim-200">{nm}</td>
                          <td className="text-center">{o.F}</td><td className="text-center">{o.E}</td>
                          <td className="text-center font-bold">{o.F + o.E}</td>
                        </tr>
                      ))}
                      <tr className="text-teal-300 font-bold">
                        <td className="text-left py-1">풀엠티토탈</td>
                        <td className="text-center">{rep.total.F}</td>
                        <td className="text-center">{rep.total.E}</td>
                        <td className="text-center">{rep.total.total}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            ))}
            <div className="text-2xs text-dim-400 text-center">
              💡 적은 쪽(작업량/잔여)을 세는 게 빠릅니다. 어느 기준인지 표에 표기됩니다.{dnGang && dnGang.rep && dnGang.rep.perGang ? ' 갱별 규격표는 선내위치로 호기를 붙인 값이고, 호기 옆 숫자는 터미널이 주는 호기별 합계입니다.' : ''}
            </div>
          </div>
        )}
      </div>
      {/* M5.92 fix: ConfirmModal 렌더 누락 — handleDone의 askConfirm 다이얼로그가 안 떠서
          완료 보고가 카톡으로 전송 안 되던 버그 수정 */}
      <ConfirmModal {...confirmState} />
      {hatchCountEl}{/* 4.10: 해치 보고 직전 장수 확인 창 */}
    </div>
  );
}
