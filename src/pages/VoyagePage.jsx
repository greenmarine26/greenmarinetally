import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseViewCommand } from '../planCommand.js';   // 2.87-02: 플랜 명령 판정 한 벌
import { speakContainer, parseSpokenDigits, pickSpeechAlternative, speak, speakLong } from '../voice.js';   // 2.65: speakLong — 브리핑 낭독   // 1.84-01: 양하 탭 통합검색(음성·자동 읽기)
import { parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing, briefingVoiceLines, generateSealAuditAnswer } from '../nlSearch.js';   // 2.65: briefingVoiceLines
import { buildGangShift, gangBriefLines, answerGangShift } from '../chiefAnswers.js';   // 2.62: 조 단위 갱 배분 — 계산 한 벌
import GangStrip from '../components/GangStrip.jsx';   // 2.63: 카고플랜 조감 스트립   // 1.85-05: 질문한 탭에서 바로 답(인라인 즉답 카드) · 2.01: 브리핑·실번호 점검도 그 자리에서
import { matchPortMis } from '../portMisMatch.js';   // 2.78: PORT-MIS 호출 한 벌(베이매트릭스 신원)
import { getBayPairs } from '../twin.js';   // 2.01: 인라인 브리핑의 트윈 무게 예견
import { mirSee } from '../mirEyes.js';   // 2.50-01: 미르가 순서를 부른다 — 못 보면 null 로 옛 미르에게 넘긴다
import { mirTone } from '../mirChat.js';   // ★ 2.57: 말투 출구 겹 — 세 화면 중 여기만 없어 같은 답이 딱딱하게 나왔다(SearchPanel:27 과 같은 방식)
import { useCarrierContacts, useShipSpeed } from '../useCarrierContacts.js';   // 1.89·1.93-01
import {
  ArrowDown, ArrowUp, Upload, Search as SearchIcon, ListChecks, MapPin,
  AlertCircle, Plus, FileSpreadsheet, FileText, X, RotateCcw, Download, Camera,
  BarChart3, FileCheck, Package as PackageIcon
} from 'lucide-react';
import {
  parseBAPLIE, parseAscFile, parseListExcel, parseXrayList, loadSheetJS,
  isoToLabel, isoCategory, formatWt, fmtPos, shipLuggageCount
, formatBerth, isValidBerth, getShipStatus, parsePortMisDateTime, _storage, computeShiftingMapCached, ediMapFromRaw , tagForecastMarks, bayParityError, slotAdjacencyError, podZoneMismatch, ediOriginOf, ediNextPortOf, portsBeforePtk, loadEdiIsDeparture, shiftingTruthCheck, solveHatchRows, dupSealMap, shiftingMapForDisplay, isSentenceQuery, sideCancelled, gangKeyFromWords, parseSpokenTimeMs} from '../utils.js';   // 1.76: 배정표 이적 자가 대조 · 커버 역산   // 1.76-05: 실번호 중복 판정 단일 소스
import {
  fbSaveEdiContainers, fbSaveListRecords, fbSaveXrayList,
  fbSaveEdiRaw, fbGetEdiRaw,
  fbCompleteContainer, fbCancelComplete, fbToggleXray,
  fbUpdateRecordSeal, fbUpdateVoyageInfo, fbSaveSectionData,
  fbSaveShipStructure, fbGetShipStructure, fbAddShipVoyage, fbAddShipStats,
  fbSetActualPosition, fbClearActualPosition,
  fbBatchMoveToStorage, fbBatchClearActual
  , fbSetVoyageSeqMode, resolveSeqMode, fbSetShipSeqPref, fbGetShipSeqPref   // TallyOne 1.55: 작업 개념은 셋. 1.56: 선박별 기억(검수사 확정 — 항차마다 다시 묻지 않게).
  , fbSubscribeWorkReports, fbSetStowagePlan , fbRequestProcessNow, fbSubscribeProcessDone, fbSetSimple, fbSetVoyageGangs, fbSetVoyageWorkStart} from '../firebase.js';   // 1.87: 엠티실 범위 저장
import { extractShipInfo, analyzeShipStructure, compareStructures, augmentStructureWithBayDict, isShipInBayDict, getShipBayDictData, getShipIdentity } from '../shipStructure.js';
// M4.4: CASP .def 런타임 파서 + 사용자 베이사전
import { analyzeDefFile, isCaspDefFile, analysisToBayDictEntry } from '../defParser.js';
import { addToUserBayDict } from '../data/userBayDict.js';
import ContainerList from '../components/ContainerList.jsx';
import ValidationBox from '../components/ValidationBox.jsx';
import SearchPanel from '../components/SearchPanel.jsx';
import GlobalSearchPage from './GlobalSearchPage.jsx';
import { isChief } from '../staffList.js';   // 2.36: 항차 미르도 수석 전용 통계는 가린다   // 2.36: 항차 화면에도 **같은 미르** — 검수사 «검색은 어디서든 같아야 합니다»
import BayPlan from '../components/BayPlan.jsx';
import StatsTab from '../components/StatsTab.jsx';
import BayDictVerifyWidget from '../components/BayDictVerifyWidget.jsx';
import ReportTab from '../components/ReportTab.jsx';
import XrayTab from '../components/XrayTab.jsx';   // 2.26: X-RAY 조회 + 세관봉인 확인서 인쇄
import ContainerDetailModal from '../components/ContainerDetailModal.jsx';
import useIsWide from '../useIsWide.js';
import WorkReportModal from '../components/WorkReportModal.jsx';
import { getEquipNumber, isPyeongtaekPort, isOppositeDirRecord, ownDirCns, resolveShipKey, parseListWeightKg, effectivePos } from '../utils.js';   // 1.23: parseListWeightKg — 리스트 무게 톤 표기 보정(단일 소스)
import DiagnosticsPanel from '../components/DiagnosticsPanel.jsx';
import ShipIntroCard from '../components/ShipIntroCard.jsx';   // V9.18: 선박 소개·이름 유래
import ConflictReviewModal from '../components/ConflictReviewModal.jsx';
import ChoiceModal, { useChoice } from '../components/ChoiceModal.jsx';
import ShipPolicyModal from '../components/ShipPolicyModal.jsx';
import DisplacedSidebar from '../components/DisplacedSidebar.jsx';
import StorageBox from '../components/StorageBox.jsx';
import VoyageSummaryCard from '../components/VoyageSummaryCard.jsx';
import WorkClosingChecklist from '../components/WorkClosingChecklist.jsx';
import StowageReviewModal from '../components/StowageReviewModal.jsx'; // M6.14
import VoyFixWidget from '../components/VoyFixWidget.jsx'; // M6.46
import { runDiagnostics } from '../diagnostics.js';
import { logView, logQuerySettled } from '../activityLog.js';   // TallyOne 1.3: 활동 로그(열람·조회 기록)
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies, isLoloShipByPolicy } from '../shipPolicies.js';
import { isDeckPlanWorkbook, parseDeckPlanWorkbook } from '../rzorPlan.js';
import DeckPlanView from '../components/DeckPlanView.jsx';
import MailboxFilePicker from '../components/MailboxFilePicker.jsx';   // V9.46: 메일함 폴더 직결
import { db } from '../firebase.js';
import { fbGetPendingDamage, fbPromotePendingDamage } from '../firebase.js';   // 2.03: 데미지 예약 승격
import { exportSectionToCSV } from '../components/CSVExport.jsx';
import PrintHubModal from '../components/PrintHubModal.jsx';
import TestLabModal from '../components/TestLabModal.jsx';   // V9.25: 검증 모드 — 성일님 전용
import ReeferMemoModal from '../components/ReeferMemoModal.jsx';
import PrintableCargoPlanV2 from '../components/PrintableCargoPlanV2.jsx';   // 2.87-01: 미르가 «카고플랜 보여줘» 하면 이것만 띄운다   // TallyOne 1.8: 리퍼 온도 확인
import ScrollTopButton from '../components/ScrollTopButton.jsx';   // 2.82-02: 스크롤 긴 화면 TOP 버튼(공용 한 벌)

export default function VoyagePage({ voyageKey, voyage, inspector, inspectors, portMisData = {}, pilotForecast = {}, terminalWork = {}, onGoHome, onModeChange, initModeOverride = null, voyages = null, heartbeat = null,
  /* ★ 2.87 (검수사 지시 2026-08-29) — «홈화면에서 물었으면 홈화면에서 보여주고 닫아도 홈화면이어야 합니다».
       홈 미르가 «플랜 보여줘» 하면 App 이 **주소를 바꾸지 않고** 홈 위에 이 화면을 덮어 띄운다.
       그때 mirPlan={what,bay} 이 들어온다 — 플랜만 보이면 되므로 그 화면의 자동 팝업은 재운다. */
  mirPlan = null, onMirPlanClose = null }) {   // 2.36: voyages·heartbeat — 항차 화면 미르도 홈과 **같은 범위**로 답한다(검수사 «홈이든 작업중이든 수석화면이든 말그대로 통합검색»)   // 1.69-01: terminalWork — 진행 질문을 터미널 실황으로
  // 양하/선적 모드 — 둘 다 있으면 토글, 하나만 있으면 자동
  // 1.94 (검수사 실측 SWSP — 선적 243 매칭까지 된 배가 들어가면 빈 양하부터 열림): 노드 껍데기가 아니라
  //   **실자료(ediContainers·records) 유무**로 판정한다 — 양하 없는 배는 선적이 바로 열린다.
  const _secCnt = (sec) => (sec ? Object.keys(sec.ediContainers || {}).length + Object.keys(sec.records || {}).length : 0);
  const hasDis = _secCnt(voyage?.discharge) > 0;
  const hasLoa = _secCnt(voyage?.loading) > 0;
  // 2.08-13 (검수사 확정 «문제는 자료가 없다고 열어 놓지 않아서 세관 리스트를 선적카드에 등록시키는
  //   오류가 발생됩니다» — DJCT 0222E 실측: 양하 EDI 미도착이라 양하 탭이 없어 세관 리스트를 올릴 곳이
  //   선적뿐이었다): **작업이 예정된 모드는 자료가 없어도 탭을 연다.** 근거 = 배정 수량(planDis/planLod)
  //   또는 항차번호(voy_d/voy_l). 진입 기본 모드는 종전대로 «자료 있는 쪽»(1.94-01) — 표시만 넓힌다.
  const _pd = Number(voyage?.info?.planDis || 0), _pl = Number(voyage?.info?.planLod || 0);
  const showDis = hasDis || _pd > 0 || !!voyage?.info?.voy_d;
  const showLoa = hasLoa || _pl > 0 || !!voyage?.info?.voy_l;
  // V8.81: 홈에서 양하/선적 막대로 연 경우 그 모드 우선 (route.mode 전달).
  // V8.82-01: 양하·선적이 둘 다 있으면 양하 우선 — 수집기가 선적 항차를 먼저 등록해 info.mode='loading'이
  //   박혀 있어도, 작업 순서(양하→선적)대로 양하부터 연다. 양하가 완료 표시된 항차만 선적으로 바로.
  const dischargeMarkedDone = !!(voyage?.info?.inspectorDone || voyage?.info?.dischargeDone);
  // 1.94-01 (검수사 실측 — 1.94 후에도 SWSP 가 양하로 열림): 한쪽만 자료가 있으면 **자료 있는 쪽이 info.mode 를 이긴다.**
  //   수집기가 등록 때 박은 info.mode='discharge' 폴백이 실자료 판정보다 앞서 있었다. info.mode 는 자료가 아예 없을 때만.
  const initMode = initModeOverride
    || (hasDis && hasLoa
      ? (dischargeMarkedDone ? 'loading' : 'discharge')
      : hasDis ? 'discharge'
        : hasLoa ? 'loading'
          : (voyage?.info?.mode || 'discharge'));
  const [mode, setMode] = useState(initMode);
  const [tab, setTab] = useState('list');
  const [moreTabs, setMoreTabs] = useState(false);   // 1.84: 통계·결과·업로드 접이 메뉴(표시 전용)
  const [detailC, setDetailC] = useState(null); // 컨테이너 상세 (넓은 화면 = 우측 고정 칼럼 / 폰 = 바텀시트)
  const isWide = useIsWide();   // 2.18: **어디에 그릴지**를 JS 로 정한다 — 인스턴스는 하나(구독 중복 방지)
  const [procState, setProcState] = useState('');  // V9.37(판6): ⚡ 지금 처리 상태 ''|run|ok|fail|timeout
  const [procMsg, setProcMsg] = useState('');
  const [showWorkReport, setShowWorkReport] = useState(false);  // M3.5.6: 작업 보고 모달
  const [shipLib, setShipLib] = useState(null); // M3.0: 선박 라이브러리 (AI 컨텍스트용)
  // M3.5.4: 자동 진단 state (메인 컴포넌트에 두어야 useMemo에서 접근 가능)
  // M5.20: 기본값 false — 자동 진단 음성이 사용자 완료 음성을 cancel하지 않게.
  //   사용자가 필요 시 DiagnosticsPanel의 스피커 아이콘으로 켤 수 있음.
  //   배경: M5.19 listener fix 후 voyage 갱신 → DiagnosticsPanel useEffect 트리거 →
  //         600ms 후 진단 음성 호출 → speak()가 speaking=true 시 cancel() →
  //         사용자가 방금 시작한 "3050 완료" 음성이 끊김
  const [diagAutoSpeak, setDiagAutoSpeak] = useState(false);
  const [diagDismissed, setDiagDismissed] = useState(false);
  // M3.5.5: 선박 엠티 실 정책
  const [extraPolicies, setExtraPolicies] = useState({});
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAsked, setPolicyAsked] = useState(false);
  // M4.9f 5단계 단순: 이동 진행 중 상태 (선적 모드 전용)
  //   { cn, fromBay, fromRow, fromTier } 또는 null
  //   pendingMove 설정 시 → 베이그리드 빈 셀 클릭 → 그 자리로 fbSetActualPosition
  const [pendingMove, setPendingMove] = useState(null);
  // M5.1 G: 작업 마감 체크리스트 모달
  const [closingOpen, setClosingOpen] = useState(false);
  // M5.1: 리스트 탭 필터 외부 제어 (마감 체크리스트 점프용)
  const [listFilter, setListFilter] = useState(null);
  /* ★ 2.85-01 — 미르가 «플랜 보여줘» 하면 여는 자리. **한 벌**로 두고 세 화면(ListTab·LoloTab·SearchPanel)이 쓴다.
       ⚠ 2.85 는 SearchPanel 에만 넣어 양하·선적 탭에서는 안 열렸다(실측).
       검수사 — «양하자리에 있으면 양하 것, 선적자리에서 말하면 선적 것» — 여는 것은 지금 탭 것이다. */
  /* ★ 2.87 (검수사 지시 2026-08-29) — «홈화면에서 물었으면 홈화면에서 보여주고 닫아도 홈화면이어야 합니다»
       종전엔 플랜을 열려고 **화면을 옮겼다**(탭 이동·항차 이동). 그래서 ① 리퍼 온도 모달 같은
       그 화면의 자동 팝업이 끼어들었고 ② 닫으면 있던 자리가 아니라 베이 탭에 남았다.
       ⇒ 이제 **아무 데도 안 간다.** 있던 화면 위에 플랜만 덮는다. 닫으면 그 자리 그대로다. */
  const [planOv, setPlanOv] = useState(null);   // {what:'bay'|'cargo', bay:number|null} | null
  const _mirOpenPlan = React.useCallback(({ what, bay }) => {
    /* BayPlan 은 마운트하며 이 신호를 읽는다 — 오버레이를 켜기 **직전**에 세운다(같은 tick). */
    try {
      if (what === 'cargo') window.__mirOpenCargo = Date.now();
      if (bay != null) window.__mirGoBay = bay;
    } catch (e) {}
    setPlanOv({ what, bay: bay == null ? null : bay });
  }, []);
  /* 홈에서 물은 경우 — App 이 mirPlan 을 넘긴다. 마운트하자마자 그 플랜을 덮는다. */
  useEffect(() => {
    if (!mirPlan) return;
    try {
      if (mirPlan.what === 'cargo') window.__mirOpenCargo = Date.now();
      if (mirPlan.bay != null) window.__mirGoBay = mirPlan.bay;
    } catch (e) {}
    setPlanOv({ what: mirPlan.what, bay: mirPlan.bay == null ? null : mirPlan.bay });
  }, [mirPlan]);
  /* 닫기 — 홈에서 물었으면 **홈으로** 돌려주고(이 화면째 걷힌다), 항차 화면에서 물었으면
     덮개만 걷어 있던 탭 그대로 남긴다. 어느 쪽이든 화면이 옮겨 가지 않는다. */
  const _closePlanOv = React.useCallback(() => {
    setPlanOv(null);
    if (mirPlan && onMirPlanClose) onMirPlanClose();
  }, [mirPlan, onMirPlanClose]);
  /* ★ 2.86 — 홈(수석 대시보드) 미르가 «플랜 보여줘» 하면 그 배로 넘어오면서 신호를 남긴다.
       여기서 받아 **베이 탭을 연다**(카고플랜은 BayPlan 이 이어받는다).
     ⚠ 신호는 한 번만 쓰고 지운다 — 안 지우면 이 항차에 올 때마다 베이 탭이 열린다. */
  useEffect(() => {
    try {
      /* 2.87: 옛 판이 남긴 신호는 **지우기만** 한다 — 이제 플랜은 이동이 아니라 오버레이로 연다.
         (지우지 않으면 이 항차에 올 때마다 베이 탭이 저 혼자 열린다) */
      if (window.__mirOpenBayTab) { window.__mirOpenBayTab = 0; }
    } catch (e) { /* 못 열어도 화면은 그대로 */ }
  }, []);
  const [relayQ, setRelayQ] = useState('');   // 1.84-01: 양하 탭 검색창의 문장 질문을 「작업 시작」 탭으로 릴레이   // 1.84: 기본 미선택 — 목록은 칩을 눌러야 연다(검수사 확정)
  // TallyOne 1.54: 「풀 컨테이너 시퀀스 작업입니까?」를 다시 여는 스위치(이미 정해진 뒤 바꿀 때만).
  const [seqEdit, setSeqEdit] = useState(false);
  // 1.56-01: 선박 기억은 **추천으로만** 쓴다 — 검수사 정정 2026-08-12:
  //   *"상황에 따라 틀려집니다. 선박당 1회는 매항차마다 물어야 합니다."*
  //   1.56 이 답 없는 항차에 지난 답을 자동 적용했는데 **틀린 설계**였다. 질문은 항차마다 한 번 뜨고,
  //   지난 답은 카드 안에 「이 배의 지난 답」으로 보여 주기만 한다(강조 링).
  const [shipSeqPref, setShipSeqPref] = useState(null);
  useEffect(() => {
    if (mode !== 'loading') { setShipSeqPref(null); return; }
    const vsl = voyage?.info?.vsl;
    if (!vsl) { setShipSeqPref(null); return; }
    let alive = true;
    fbGetShipSeqPref(vsl).then(m3 => { if (alive) setShipSeqPref(m3 || null); }).catch(() => { if (alive) setShipSeqPref(null); });
    return () => { alive = false; };
  }, [voyageKey, mode, voyage?.info?.vsl]);

  // 선박 정책 Firebase 구독
  useEffect(() => {
    const unsub = fbSubscribeShipPolicies(db, (data) => setExtraPolicies(data || {}));
    return () => { try { unsub && unsub(); } catch (e) { console.warn('[선박정책] 구독 해제 실패', e); } };  // V9.57: 조용한 실패 금지
  }, []);

  useEffect(() => { onModeChange?.(mode); }, [mode]);

  //  ★ 2.66-01 (검수사 «다 지우고 이번항차 전량 캔슬이 표기 되어야 합니다»):
  //    배정목록이 이 쪽 0 이면 이 화면은 **아무것도 안 보여준다** — 요약·시퀀스·목록·검증·예상EDI 전부.
  //    ⚠ 이 파일은 컴포넌트가 여럿이다 — 이 상수는 **VoyagePage 안**에 있어야 한다(2.50-01 교훈:
  //      ListTab 안에 두면 voyage 가 없어 렌더가 통째로 죽는다. 실제로 한 번 밟았다).
  const _sideCanc = sideCancelled(voyage?.info, mode, (terminalWork || {})[String(voyage?.info?.vsl || '').toUpperCase()] || null);



  // TallyOne 1.3: 열람 기록 — 항차 진입·탭 전환·모드 전환마다 1건.
  //   같은 대상(voyageKey+mode+tab) 30초 안 중복은 activityLog가 생략한다.
  useEffect(() => {
    logView({ route: 'voyage', voyageKey, mode, tab });
  }, [voyageKey, mode, tab]);

  // M3.0: 항차 IMO로 선박 라이브러리 로드 (AI에게 이전 항차 패턴 컨텍스트 제공)
  // 1.26: **IMO 가 없으면 콜사인으로 찾는다.** 항차 info 에 imo·callsign 이 아예 없는 배가 있다
  //   (OBWH 2707E 실측 — info 에 vsl 뿐). 그러면 shipLib 이 늘 null 이라 본선 구조(베이·슬롯)와
  //   실적(항차수·선적 누계)을 **앱이 들고도 못 썼다.** ships 노드 키는 콜사인인 경우가 많고
  //   (ships/D5MO4 = OBWH), 그 콜사인은 베이사전에 있다.
  //   검수사 질문 "몇 대까지 선적이 가능한가요?" 에 답하려면 이 연결이 있어야 한다.
  useEffect(() => {
    const info = voyage?.info || {};
    let cancelled = false;
    const tryKeys = [];
    if (info.imo) tryKeys.push(info.imo);
    if (info.callsign) tryKeys.push(info.callsign);
    // 베이사전에서 콜사인 보강 — 선박코드(vsl)로 찾는다.
    const code = String(info.vsl || '').toUpperCase().trim();
    if (code) {
      const d = getShipBayDictData(info.imo, info.vslFull || code, { vslFull: info.vslFull });
      if (d?.callsign) tryKeys.push(d.callsign);
      tryKeys.push(code);
    }
    if (!tryKeys.length) { setShipLib(null); return; }
    (async () => {
      for (const k of tryKeys) {
        try {
          const data = await fbGetShipStructure(k);
          // structure 가 실제로 있는 것만 채택 — 빈 껍데기는 넘긴다.
          if (data && (data.structure || data.stats)) { if (!cancelled) setShipLib(data); return; }
        } catch { /* 다음 키로 */ }
      }
      if (!cancelled) setShipLib(null);
    })();
    return () => { cancelled = true; };
  }, [voyage?.info?.imo, voyage?.info?.callsign, voyage?.info?.vsl]);

  // M6.39: 항차 진입 시 voy_d/voy_l 자동 복구 — 사용자 액션 0
  //   ediContainers의 첫 컨테이너에서 c.voy 추출 → voy_d/voy_l 자동 백필
  //   목적: 이전에 잘못 저장된 voy_d/voy_l을 EDI 재업로드 없이 자동 정정
  //   조건: c.voy가 있는 경우 (M6.39 이후 업로드된 EDI는 c.voy 메타 포함)
  useEffect(() => {
    if (!voyage?.info || !voyageKey) return;
    const info = voyage.info;
    const patch = {};

    // M6.46: 자동 복구 정책 변경
    //   - EDI의 c.voy로 voy_d/voy_l 덮어쓰기 ❌ (송신측 voy일 수도 있음 — 인천 등에서 양하 EDI 줄 때 자기네 선적 voy 포함)
    //   - 사용자가 항차 생성 시 입력한 voy (mode 일치) 신뢰
    //   - voy_d/voy_l 비어있는 케이스만 자동 채우기 시도
    //
    //   양하 EDI 있고 voy_d 비어있음:
    //     - mode='discharge'이면 voyage.info.voy = 양하 voy → voy_d로 백필
    //     - mode!='discharge'이면 voyage.info.voy = 다른 mode voy → 자동 백필 안 함 (사용자 입력 필요)
    const dischConts = Object.values(voyage?.discharge?.ediContainers || {});
    if (dischConts.length > 0 && !info.voy_d) {
      if (info.mode === 'discharge' && info.voy) {
        patch.voy_d = info.voy;
      }
      // mode !== 'discharge' 케이스는 자동 백필 안 함 — 자료 탭 정정 UI에서 사용자 입력
    }

    const loadConts = Object.values(voyage?.loading?.ediContainers || {});
    if (loadConts.length > 0 && !info.voy_l) {
      if (info.mode === 'loading' && info.voy) {
        patch.voy_l = info.voy;
      }
    }

    if (Object.keys(patch).length > 0) {
      fbUpdateVoyageInfo(voyageKey, patch).catch(e => console.error('[voy 자동 복구]', e));
    }
  }, [voyageKey, voyage?.discharge?.ediContainers, voyage?.loading?.ediContainers]);

  if (!voyage) {
  return (
      <div className="max-w-3xl mx-auto px-3 py-10 text-center">
        <div className="text-dim-300">항차를 찾을 수 없습니다</div>
        <button onClick={onGoHome} className="mt-4 px-4 py-2 bg-ink-800 rounded text-sm">홈으로</button>
      </div>
    );
  }

  const sec = voyage[mode] || {};
  const ediMap = sec.ediContainers || {};
  // TallyOne 1.11: 이 화면 몫의 리스트만 본다 — POL/POD 로 **반대 방향이 확정된** 레코드는 뺀다.
  //   항차번호가 방향까지 같은 배(N_N 타입)는 메일함 폴더가 하나라 양하·선적 리스트가 섞여 들어와,
  //   양하 records 에 선적분이 얹혀 있었다(SWSP 2606N: 371 + 407 = 778 로 표시, 2026-08-06 실측).
  //   유입은 autoRegApi·handleListUpload 에서 막지만, **이미 저장된 오염분**은 여기서 걸러야
  //   컨 목록·평택 판정·요약이 함께 바로잡힌다. 근거 없는 레코드(POL/POD 없음)는 그대로 둔다.
  const recMapRaw = sec.records || {};
  const recMap = useMemo(() => {
    const own = ownDirCns(recMapRaw, mode);
    if (own.length === Object.keys(recMapRaw).length) return recMapRaw;   // 오염 없음 — 원본 그대로(참조 유지)
    const out = {};
    own.forEach(cn => { out[cn] = recMapRaw[cn]; });
    return out;
  }, [recMapRaw, mode]);
  const xrayMap = sec.xrayList || {};
  const xraySeals = sec.xraySeals || {};
  const compMap = sec.completed || {};
  // V8.98-01: 쉬프팅(재적부) — raw EDI 원문 기반 대조 (ediContainers엔 통과화물 없음, MAMP 실측).
  // TallyOne 1.27(검수사 확정 2026-08-08): 선적 EDI 는 **작업 결과물**이라 그걸 기다리면 늦다.
  //   *"홀드 양하를 하려면 커버를 열어야 하는데, 그 컨테이너들을 치워야만 알 수 있습니다."*
  //   → 두 EDI 대조가 비면 **양하 EDI 하나로 예측**한다(utils.predictShifting · 현측 커버 규칙).
  //     선적 EDI 가 오면 대조값이 채워지고 그쪽이 자동으로 우선한다 — 예측은 그때까지의 다리다.
  const shiftingMap = useMemo(
    () => {
      // 2.08-15: 확정∨예측 폴백은 utils 한 벌(shiftingMapForDisplay)로 — 배정표 확정 이적 0이면
      //   예측을 대수에서 빼되 «의심 자리»는 _meta.suspects 로 넘어와 화면이 커버 영역을 알린다.
      return shiftingMapForDisplay(voyageKey, voyage);
    },
    [voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.uploadedAt,
     voyage?.discharge?.raw?.edi?.sizeBytes, voyage?.loading?.raw?.edi?.sizeBytes, voyageKey,
     voyage?.info?.lane]   // 1.45: 항로가 나중에 등록돼도 예측을 다시 계산
  );

  // 평택 대상 (양하=POD, 선적=POL)
  //   V9.29: 양하도 '리스트(records)에 있으면 평택분' — 선적에 이미 있던 원칙을 맞춘다.
  //   근거(MCAP 629N 실측 2026-07-31): 선사 양하리스트·터미널 화면 278대인데 앱은 216대만 셌다.
  //   차이 62대는 POD가 CNTXG인 엠티 — 평택에서 내렸다가 다시 싣는 **환적(TS)** 화물이다
  //   (선사 메일 "please declare 62 x 40'HDRY empty ex L77-629N as TS ... create load plan in KRPYOTM").
  //   POD만 보면 이 62대가 통째로 빠진다. 선사가 양하리스트에 올린 컨은 평택에서 내리는 것이 진실.
  const isPtk = (c) => {
    if (!c) return false;
    if (mode === 'discharge') {
      if (isPyeongtaekPort(c.pod)) return true;
      return !!(c.cn && recMap && recMap[c.cn]);   // 양하리스트 등재분(TS 포함)
    }
    return (!!(c.cn && recMap && recMap[c.cn])) || isPyeongtaekPort(c.pol);
  };

  // M3.89: 베이플랜 전용 - 전체 EDI 컨테이너 (isPtk 필터 X)
  //   원칙: 베이플랜은 선박 적부도 = 모든 화물 표시. 평택 화물 0대 베이도 누락 X
  //   기존 containers는 평택만 (검색/통계/검수용)
  //   베이플랜에만 이 allEdiContainers 전달 → 어떤 EDI 와도 베이 누락 X
  // V8.98-02: 베이플랜/카고플랜 소스 = raw EDI 전문(통과화물 포함). 저장본 키는 저장본 우선. raw 없으면 기존 ediMap.
  const fullEdiMap = useMemo(() => {
    const rawMap = ediMapFromRaw(sec);
    if (!rawMap) return ediMap;
    // V8.98-04: raw(확정 EDI 전문)가 있으면 그것이 단일 진실.
    //   raw에 있는 키 = 저장본 필드 우선 병합(기존 동작). raw에 없는 저장본 키는
    //   실번호 형식(4영문+7숫자)이면 구판/가상(예: MAMP DUME 더미, pol=PTK) 잔재로 보고 표시에서 제외 —
    //   별첨·카고플랜이 평택 선적분으로 잘못 집계하던 원인. 컨번호 없는 자리(__SLOT_ 부킹 등)는 보존.
    const m = { ...rawMap };
    for (const [k, v] of Object.entries(ediMap)) {
      if (rawMap[k]) { m[k] = { ...rawMap[k], ...v }; continue; }
      if (!/^[A-Z]{4}\d{7}$/.test(String(k))) m[k] = v;
    }
    return m;
  }, [sec?.raw?.edi?.uploadedAt, sec?.raw?.edi?.sizeBytes, ediMap]);

  // V8.98-05: 검수 리스트용 쉬프팅 목록 — shiftingMap + 컨 정보(규격/POD) 보강
  // 1.76-05: **작업 항목으로 승격할 수 있는 것 = 확정 대조뿐.** 예측은 알림·예보로만 쓴다.
  //   예측은 대기 단계 자료다 — 그걸 카드로 만들면 KSKM 2615N 4대(인천 하선분)·XTPG 536E 7대
  //   (접안 8/17 예정, 아직 인천 작업 중) 같은 허수가 「치우라」는 작업 지시가 된다.
  const shiftingConfirmed = useMemo(() => {
    try { return computeShiftingMapCached(voyageKey, voyage) || {}; } catch (e) { return {}; }
  }, [voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.uploadedAt,
      voyage?.discharge?.raw?.edi?.sizeBytes, voyage?.loading?.raw?.edi?.sizeBytes, voyageKey]);

  const shiftingList = useMemo(() => {
    const keys = Object.keys(shiftingMap || {});
    if (!keys.length) return [];
    return keys.map(cn => {
      const c = fullEdiMap[cn] || {};
      const s = shiftingMap[cn] || {};   // 1.43-02: 예측 경로엔 from이 없었다 — 결측이 와도 안 죽게
      return { cn, from: s.from || s.pos || '', to: s.to || '', iso: c.iso || '', pod: c.pod || '', fe: c.fe || '' };
    }).sort((a, b) => String(a.from || '').localeCompare(String(b.from || '')));
  }, [shiftingMap, fullEdiMap]);

  // TallyOne 1.69-10: 선적 EDI 미도착(=평택 출항본 아님) — 조용히 0 으로 두지 않고 화면에 말한다.
  //   판정은 utils.loadEdiIsDeparture 한 벌만 쓴다(같은 판정을 두 기준으로 하지 않는다).
  const loadEdiPending = useMemo(() => {
    const lm = ediMapFromRaw(voyage?.loading);
    return !!lm && !loadEdiIsDeparture(lm);
  }, [voyage?.loading?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.sizeBytes]);

  // ── 1.76: 정답표(배정표 이적) 자가 대조 — 어긋나면 **조용히 두지 않는다** ──
  //   검수사 지적 2026-08-15: *"앱이 똑똑 하다면 왜 배정목록에 시프팅 0인데 커버가 어떻해야
  //   시프팅이 0인지를 계산 했을것입니다."* 정답은 `info.berthShift` 로 이미 들어와 있었는데
  //   앱은 두 숫자를 나란히 보여주기만 하고 «틀렸다» 고 말하지 않았다.
  //   그래서 KSKM 2615N 4대·XTPG 536E 7대 허수가 조용히 떠 있었다.
  const truthChk = useMemo(
    () => shiftingTruthCheck(voyage, shiftingList.length),
    [voyage?.info?.berthShift, shiftingList.length]);
  //   불일치면 커버 분할을 역산한다. 축이 길면 조합이 폭주하므로 상한을 둔다(무응답 방지).
  const hatchSolve = useMemo(() => {
    if (!truthChk || truthChk.pending || truthChk.ok) return null;   // 1.76-01: 확정 전에는 역산도 하지 않는다
    try {
      // 사전 접근 경로는 predictShiftingFromVoyage 와 같은 한 벌을 쓴다(전역 __fbShipBayDict).
      const vsl = String(voyage?.info?.vsl || '').toUpperCase();
      const de = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[vsl] : null;
      if (!de) return null;
      return solveHatchRows(voyage, de, truthChk.truth);
    } catch (e) { return null; }
  }, [truthChk?.ok, truthChk?.truth, voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.info?.vsl]);

  // 1.45: 시프팅 근거 — 예측이면 출항본·제외 기항, 배정표 이적(수집기 berthShift)이 있으면 그것이 정본
  const shiftInfo = {
    meta: (shiftingMap && shiftingMap._meta) || null,
    berthShift: (voyage?.info?.berthShift ?? null),
    lane: voyage?.info?.lane || '',
    loadEdiPending,
    truthChk,
    hatchSolve,
  };

  // ── TallyOne 1.69-06: 전항 양하 예정 통과분(평택 도착 전 하선) — 베이플랜 **화면**에서 숨긴다 ──
  //   검수사 확정(2026-08-14, MAMP 631N): "미리 양하하고 오는 거라면 차라리 화면에 안 보여야 함."
  //   근거는 1.45 예측 제외와 동일 — 출항본(LOC+5) + 항로 사전(portsBeforePtk). 판정 불가면 null(숨김 없음).
  //   1.69-07: 다음 기항(LOC+61)이 정본 — MAMP 631N 실측 «다바오→평택 직항»이라 신강분은 배에 실려
  //   온다(숨기면 안 됨 — 검수사 «30번 베이 1개» = 그 위 신강 엠티가 진짜 시프팅). 직항이면 before=[].
  const preGoneInfo = useMemo(() => {
    if (mode !== 'discharge') return null;
    const origin = ediOriginOf(sec);
    const before = portsBeforePtk(voyage?.info?.lane, origin, ediNextPortOf(sec));
    if (!before || !before.length) return null;
    return { ports: new Set(before.map((p) => String(p).toUpperCase())), list: before, origin };
  }, [mode, sec?.raw?.edi?.uploadedAt, voyage?.info?.lane]);

  // V9.03: 긴급/수화물 컨번호 세트 — forecast.mode가 현재 모드와 일치할 때만 적용
  //   (선적 예보 마커가 양하 리스트에 새지 않게). 상세는 tagForecastMarks 주석.
  const _fc = voyage?.info?.forecast;
  const _fcApply = _fc && (_fc.mode || 'loading') === mode;
  // 2.08-07 (검수사 «긴급화물을 카고플랜이 표기를 안하고 있는데» — OBWH 2720W 실측): forecast.mode 가
  //   양하(2719E 카톡 예보)로 먼저 잡혀 있으면, 수집기가 선적 CLL 긴급 28대를 실어도(mode 보존 원칙)
  //   선적 화면 _fcApply 가 false 라 ▲가 전부 숨었다. **컨번호 마커(긴급·수화물)는 모드 게이트를 떼고
  //   그 모드 컨 목록에 실재하는 컨에만 마킹**한다(tagForecastMarks 가 base 에 있는 컨만 찍으므로
  //   다른 모드 컨번호는 자동 무시 — 오적용 없음). 물량 예보(full/empty 카드)는 종전대로 _fcApply.
  const urgentSet = useMemo(
    () => new Set(Array.isArray(_fc?.urgentCns) ? _fc.urgentCns : []), [_fc]);
  const luggSet = useMemo(
    () => new Set(Array.isArray(_fc?.luggageCns) ? _fc.luggageCns : []), [_fc]);

  const allEdiContainersBase = useMemo(() => {
    const merged = {};
    // V8.87-01: 컨번호 없는 실자리(터미널 PRE 등)가 merged['']로 1개로 붕괴하던 버그 수정.
    //   베이플랜 화면 인쇄(카고플랜 V2)가 이 목록을 쓰는데, 붕괴+_inList 누락으로 별첨이 35(pol 있는 34+팬텀 1)로 잘못 집계됐다.
    //   메인 병합(containers)과 동일하게 __SLOT_ 키로 개별 유지 + 대기 표식.
    let _slotSeq2 = 0;
    Object.values(fullEdiMap).forEach(c => {
      if (c.cn) { merged[c.cn] = { ...c, _src: 'edi' }; return; }
      let k = `__SLOT_${c.bay || ''}_${c.row || ''}_${c.tier || ''}`;
      if (merged[k]) k = `${k}_${_slotSeq2++}`;
      merged[k] = { ...c, cn: k, pendingCn: true, _slot: true, _src: 'edi' };
    });
    // recMap에서 EDI에 없는 컨도 포함 (참고용) + EDI 매칭된 컨에는 records 전체 필드 보강
    Object.values(recMap).forEach(r => {
      if (!merged[r.cn]) {
        merged[r.cn] = { ...r, _src: 'list', _inList: true };   // V8.87-01: 별첨 평택 판정용(리스트=검수 대상)
      } else {
        // M4.9e-fix: 베이그리드용 컨테이너에도 records 핵심 필드 전부 보강
        //   사용자 신고: "검색은 수정 반영되는다 베이는 안 됨"
        //   원인: allEdiContainers가 sl/wt만 보강하고 bay_actual/eseal 등 누락
        // M6.21: ISO/op/pol/pod 보강
        //   증상: 같은 컨이 자연어 검색은 ISO "20DC" / 검수업체 "KMTC" / POL "CNAQG" 정상,
        //         베이 클릭은 ISO "XXXX" / 검수업체 "KMD" / POL "CNTCA" 비정상
        //   원인: EDI(BAPLIE)에 placeholder/약어/부정확 정보가 들어옴.
        //         LIST(IFCSUM/엑셀)에는 정확한 정보 → 보강 시 누락되어 베이 클릭 시 EDI 그대로 표시.
        //   해결: LIST 데이터가 있으면 항상 우선 (검수원이 직접 다루는 정확한 자료).
        //         단 LIST가 비어있으면 EDI 값 보존.
        const safeR = {};
        if (r.iso) safeR.iso = r.iso;
        if (r.op)  safeR.op  = r.op;
        // M6.94.31: EDI에 pol/pod 있으면 리스트가 덮지 못함 (EDI = 단일 진실).
        //   원인: 엠티 선적 엑셀(MCAT EMPTY)은 헤더가 없어 fallback 파서가 목적지(CNDLC 등)를
        //   pol 자리에 넣음 → 리스트 pol=CNDLC가 EDI pol=KRPTK를 덮어 카고플랜에서 285대 누락.
        //   EDI에 pol/pod 없을 때만 리스트로 보강.
        if (r.pol && !merged[r.cn].pol) safeR.pol = r.pol;
        if (r.pod && !merged[r.cn].pod) safeR.pod = r.pod;
        if (r.sl) safeR.sl = r.sl;
        if (r.sl_orig) safeR.sl_orig = r.sl_orig;
        // M8.07: EDI 실번호가 잘린 경우(IFCSUM 20자 컷 등) records의 완전한 실번호 우선.
        //   판정: EDI sl이 records sl의 앞부분이면서 더 짧으면 = 잘린 것.
        //   예) EDI 'LF102261LF102262LF10' ⊂ records 'LF102261LF102262LF102263LF102264'.
        {
          const ediSl = String(merged[r.cn].sl || '').trim();
          const recSl = String(r.sl || '').trim();
          if (recSl && ediSl && recSl.length > ediSl.length && recSl.startsWith(ediSl)) {
            safeR.sl = recSl;
          }
        }
        // 1.23: 무게는 리스트 기준. 단 B/L 총중량 복사분은 컨별 실중량이 아니라 EDI 를 유지.
        //   ⚠ 이미 저장된 톤 값(1.22 이전 파서가 `12.4`→`12` 로 남긴 것)이 EDI 를 덮지 않도록
        //   같은 보정을 여기서도 건다. 재업로드 없이도 옛 자료가 스스로 낫는다.
        if (r.wt) safeR.wt = parseListWeightKg(r.wt);
        // M8.07: 온도·품명·F/E·리퍼 보강.
        //   RIZHAO처럼 EDI에 온도/품명이 없는 양식에서 엑셀 리스트 값을 반영.
        //   EDI에 값이 있으면 보존(EDI 우선) — 다른 선박 영향 없음.
        if (r.tmp !== undefined && r.tmp !== '' && (merged[r.cn].tmp === undefined || merged[r.cn].tmp === '')) {
          safeR.tmp = r.tmp;
          if (r.tmp_missing !== undefined) safeR.tmp_missing = r.tmp_missing;
        }
        if (r.desc && !merged[r.cn].desc) safeR.desc = r.desc;
        if (r.fe && !merged[r.cn].fe) safeR.fe = r.fe;
        if (r.rf === true && merged[r.cn].rf !== true) safeR.rf = true;
        if (r.fr === true && merged[r.cn].fr !== true) safeR.fr = true;
        // 엠티실/리씰
        if (r.eseal) safeR.eseal = r.eseal;
        if (r.eseal_wrong) safeR.eseal_wrong = r.eseal_wrong;
        if (r.reseal) safeR.reseal = r.reseal;
        if (r.eseal_at) safeR.eseal_at = r.eseal_at;
        if (r.eseal_by) safeR.eseal_by = r.eseal_by;
        if (r.eseal_history) safeR.eseal_history = r.eseal_history;
        // ISO403 사진
        if (r.iso403_photo_ts) safeR.iso403_photo_ts = r.iso403_photo_ts;
        if (r.iso403_photo_by) safeR.iso403_photo_by = r.iso403_photo_by;
        // 실체 위치 (선적)
        if (r.bay_actual) safeR.bay_actual = r.bay_actual;
        if (r.row_actual) safeR.row_actual = r.row_actual;
        if (r.tier_actual) safeR.tier_actual = r.tier_actual;
        if (r.actual_at) safeR.actual_at = r.actual_at;
        if (r.actual_by) safeR.actual_by = r.actual_by;
        // M6.94.32: EDI에 위치(bay)가 있으면 리스트 bay/row/tier가 덮지 못함.
        //   원인: 엠티 선적 엑셀(MCAT EMPTY)에는 진짜 선내 위치가 없고 그룹 카운트만 있어,
        //   파서가 만든 가짜 bay/row/tier가 EDI의 정확한 위치(BAPLIE LOC+147)를 덮어
        //   카고플랜 그림이 엉뚱하게 그려짐. EDI 위치 = 단일 진실 (카스피도 EDI 위치 그대로 사용).
        //   EDI에 위치가 없을 때만(리스트 단독 컨 등) 리스트 위치 사용.
        //
        // ── TallyOne 1.55 재점검: **이 차단은 그대로 둔다.** ──
        //   1.55 부터 `_updatePositionFields` 가 `ediContainers.bay/row/tier` 를 덮어쓰지 않는다
        //   (덮어쓰던 3줄을 지웠다). 그래서 `merged[cn].bay` 는 **순수한 선사 계획**이고,
        //   검수원이 지정한 자리는 `records.bay_actual/row_actual/tier_actual` 로만 들어온다
        //   (바로 위에서 그대로 실어 보내고, 아래 승격 블록이 그림·목록에 올린다).
        //   즉 여기서 막히는 `r.bay` 는 **리스트 파서가 만든 값**뿐이고 검수원 편집이 아니다.
        //   계획이 계획을 이긴다 — 리스트의 가짜 좌표가 선사 계획을 덮지 못하게 막는 것이 맞다.
        const ediHasPos = merged[r.cn].bay !== undefined && merged[r.cn].bay !== '';
        if (!ediHasPos) {
          if (r.bay !== undefined) safeR.bay = r.bay;
          if (r.row !== undefined) safeR.row = r.row;
          if (r.tier !== undefined) safeR.tier = r.tier;
        }
        merged[r.cn] = { ...merged[r.cn], ...safeR, _inList: true };   // V8.87-01: 리스트 등록 표식(별첨 평택 판정)
      }
    });
    const list = Object.values(merged);

    // M4.9e-fix 2단계: 선적 모드 effective 위치 적용 (베이그리드도 실체 위치에 그려지게)
    // M5.1 I: STG 보관 컨은 베이 그리드에서 숨김 (bay='' 처리, _in_storage 플래그)
    //
    // ── TallyOne 1.54: **창고 컨은 「자리 미지정」이 아니다. 계획이 살아 있는 상태다.** ──
    //   검수사 확정 2026-08-12 — *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
    //   1.54 부터 계획 자리를 남에게 내준 컨은 **계획(bay/row/tier)을 그대로 둔 채 몸만** 창고로 간다
    //   (firebase.js `_markPlanTaken`). 그러니 여기서 bay 를 비우는 것은 **그림에서 빼기 위한 것뿐**이고,
    //   계획 좌표는 `_bay_planned` 에 그대로 살아 있다 — 화면은 그 값을 「이름 걸린 자리」로 보여줘야 한다.
    //   ⛔ 창고 컨을 미배정으로 세지 마라. 「자리 미지정」(계획도 없음)과 「창고」(계획은 있음)는 다른 상태다.
    // 1.55-03: 모드 게이트 제거 — 1.55가 ediContainers 동기화를 지운 뒤 양하에서 자리를 옮기면
    //   (records.bay 는 ediHasPos 에 막혀) 그림·리스트가 계획 칸을 계속 그렸다(독립 재검증 P1-1).
    //   실체(bay_actual)가 있으면 양하도 실체로 승격한다. 실체 없는 컨은 종전 그대로다.
    {
      return list.map(c => {
        if (c.bay_actual === '__STG__') {
          // 보관함으로 빠진 컨 — 그리드에는 안 보이고 별도 StorageBox에서 처리
          return {
            ...c,
            _bay_planned: c.bay,
            _row_planned: c.row,
            _tier_planned: c.tier,
            // TallyOne 1.55: 계획 좌표를 `_edi_*` 이름으로도 같이 내려보낸다.
            //   `utils.buildSlotUniverse`·`effectivePos` 가 **그 이름으로** 계획 좌표를 찾는다.
            //   여기서 bay 를 비우는 것은 그림에서 빼기 위한 것뿐인데, 그 값만 보면
            //   **칸(자리)까지 같이 사라진다** — 손님이 나가는데 방이 나가버리는 그 증상이다.
            _edi_bay: c.bay,
            _edi_row: c.row,
            _edi_tier: c.tier,
            bay: '',  // 그리드에서 빠짐 (bayGroups에 안 들어감)
            row: '',
            tier: '',
            _in_storage: true,
          };
        }
        if (c.bay_actual && c.row_actual && c.tier_actual) {
          return {
            ...c,
            bay: c.bay_actual,
            row: c.row_actual,
            tier: c.tier_actual,
            _bay_planned: c.bay,
            _row_planned: c.row,
            _tier_planned: c.tier,
            // TallyOne 1.55: 계획 좌표는 `_edi_*` 이름으로도 내려보낸다(위 창고 가지와 같은 이유).
            _edi_bay: c.bay,
            _edi_row: c.row,
            _edi_tier: c.tier,
            _position_moved: true,
          };
        }
        return c;
      });
    }
    return list;
  }, [fullEdiMap, recMap, mode]);

  // V9.03: 베이플랜/카고플랜용 목록에 긴급/수화물 마커 주입
  const allEdiContainers = useMemo(
    () => tagForecastMarks(allEdiContainersBase, urgentSet, luggSet, _fc?.luggageSeals || null),   // 2.08-07: 씰도 컨 실재 기준
    [allEdiContainersBase, urgentSet, luggSet, _fc, _fcApply]);

  // 표시용 컨테이너 (EDI 평택 + 리스트 병합)
  // M3.5.4-fix2: EDI = 단일 진실 원칙 강화
  //   - 리스트는 sl/wt 같은 보강 필드만 채울 수 있음
  //   - ISO, rf, fe, dg, bay/row/tier 등 핵심 필드는 EDI 절대 우선
  //   - 리스트가 EDI 리퍼를 일반 컨으로 덮어쓰는 사고 방지
  const containersBase = useMemo(() => {
    const merged = {};
    // V8.86: 컨번호 없는 EDI = '실제 자리'(규격·자리 확정, 컨번호 미지정 — 예: 터미널 PRE) →
    //   컨번호 키로 뭉개지 말고 자리별 __SLOT_ 키로 각각 유지(그림에 그려지고, 별첨·검수집계에선 제외).
    let _slotSeq = 0;
    Object.values(ediMap).forEach(c => {
      if (!isPtk(c)) return;
      if (c.cn) { merged[c.cn] = { ...c, _src: 'edi' }; return; }
      let k = `__SLOT_${c.bay || ''}_${c.row || ''}_${c.tier || ''}`;
      if (merged[k]) k = `${k}_${_slotSeq++}`;
      merged[k] = { ...c, cn: k, pendingCn: true, _slot: true, _src: 'edi' };
    });

    // ★ 1.76-05: 시프팅 컨을 **검수 리스트에 올린다 — 양하 처리가 되어야 한다.**
    //   검수사 확정 원문 2026-08-16: *"TCLU9762509는 앱에서 양하처리 되어야 합니다.
    //   그런데 시프팅이라고 알려는 주었지만 양하 리스트 아니면 시프팅 리스트를 보여주지
    //   않았던게 문제였습니다."*
    //   → 「알려주기」로는 부족하다. 완료 체크가 되는 **작업 항목**이어야 한다.
    //   실측 MAMP 631N — TCLU9762509(30-10-86 → 22-10-90, 배정표 이적 2모브=1대와 일치)는
    //   POD 가 평택이 아니고 선사 양하리스트(records)에도 없어 isPtk 두 조건이 다 false 였다.
    //   그래서 리스트에도 큐에도 없이 화면 아래 파란 박스로만 «보여지고» 있었다.
    //   ⚠ 자리 정보는 fullEdiMap(raw 전문) — ediMap 은 통과화물을 못 들고 오는 경로가 있다.
    //   ⚠ 카운트는 섞지 않는다(검수사 확정) — _shift 는 stats 총계·진행률에서 빼고 별도로 센다.
    //   ⛔ shiftingMap(확정∨예측)이 아니라 **확정 대조만** 쓴다 — 예측은 작업 항목이 아니다.
    for (const [cn, s] of Object.entries(shiftingConfirmed || {})) {
      if (!cn || cn.startsWith('__') || merged[cn]) continue;
      const c = fullEdiMap[cn];
      if (!c) continue;
      merged[cn] = {
        ...c, cn, _src: 'shift',
        _shift: mode === 'discharge' ? 'out' : 'in',
        _shiftFrom: s.from || s.pos || '', _shiftTo: s.to || '',
      };
    }

    // 리스트가 채울 수 있는 필드 (보강 정보만)
    // EDI 핵심 필드(iso, rf, fr, ot, tk, dg, fe, bay, row, tier, pol, pod 등)는 제외
    // M4.9b-fix: 검수원이 폰에서 입력한 엠티실/ISO403 사진 필드도 records 단일 진실 원천
    //   → 이전: 화이트리스트에 없어서 c.eseal 등이 화면/보고서에서 누락되던 치명적 버그
    //   → 사용자 신고: "엠티에 실 다 입력했는데 표기 안 되고 보고서에도 비어있음"
    const ALLOWED_LIST_FIELDS = new Set([
      'sl', 'sl_orig', 'sl_history', 'wt',
      'bl', 'sh', 'gi', 'op',  // B/L, Shipper, Gross Index, Operator
      'tmp',  // 온도는 리스트가 보강 가능 (단, 비어있을 때만)
      'rfdry',  // V9.20-04: 리퍼드라이(넌플러그) — records/수집기 패치가 화면까지 오도록
      'mkcon',  // V9.23: 제작컨테이너 — 리스트 REMARK '특수컨' 자동 인식분이 화면까지 오도록
      // TallyOne 1.8-07: 리퍼 온도 확인값 — **여기 없으면 저장돼도 화면이 못 읽는다.**
      //   1.8 에서 이 다섯을 빠뜨려, 사진 판독·확인 완료까지 해도 재로그인하면 '미확인'으로
      //   되돌아가고 온도가 EDI 값으로 초기화됐다(검수사 신고 2026-08-04).
      //   ⚠ 바로 위 M4.9b-fix 주석의 엠티실 사고와 **같은 실수를 반복한 것**이다.
      //     records 에 새 필드를 만들면 이 목록에 넣었는지 반드시 확인할 것.
      'rfSet', 'rfAct', 'rfSrc', 'rfCheckedAt', 'rfCheckedBy',
      'sl_conflict',   // 1.8-03: 리스트끼리 실번호가 다를 때 두 값 모두 — 배지가 이걸 읽는다
      '_source',       // 2.06-06: 이 컨을 채운 리스트 파일명 — 세관리스트 존재 판정(sealIssuesOf)이 읽는다
      'sl_src',        // 2.06-07: 채택 씰(sl)의 진짜 출처 — _source 는 마지막 파일로 덮이므로 따로 지킨다
      'desc',  // M8.07: 품명(내용물) — EDI에 없는 참조 정보, 카고플랜 그림에 영향 없음
      // M4.9b-fix: 엠티 실 — EDI에 봉인 정보 없는 게 일반적, records가 진실
      'eseal', 'eseal_orig', 'eseal_wrong', 'reseal',
      'eseal_at', 'eseal_by', 'eseal_mode', 'eseal_history',
      // M4.9b-fix: ISO403 사진 마킹
      'iso403_photo_ts', 'iso403_photo_by', 'iso403_photo_history',
      // M4.9d-fix: 선적 실체 위치 (계획 c.bay/row/tier는 보존, 실체는 별도)
      'bay_actual', 'row_actual', 'tier_actual',
      'actual_at', 'actual_by',
      // M6.72: 선적 위치 수정 — bay/row/tier records 우선 (사용자 위치 변경 + displaced 미배정)
      'bay', 'row', 'tier',
      'bay_orig', 'row_orig', 'tier_orig',
      'edits',
    ]);
    // M6.72: 빈 문자열을 명시 삭제로 인정할 필드 (위치 수정 시 displaced 컨 보관상자 이동)
    const POSITION_FIELDS = new Set(['bay', 'row', 'tier']);

    Object.values(recMap).forEach(r => {
      const ediBase = merged[r.cn];
      const safeR = {};
      Object.keys(r).forEach(k => {
        const v = r[k];
        const isPositionField = POSITION_FIELDS.has(k);
        // M6.72: bay/row/tier 빈 문자열은 명시 삭제 (보관상자 이동 의도)
        if (v === null || v === undefined) return;
        if (v === '' && !isPositionField) return;
        if (Array.isArray(v) && v.length === 0) return;

        if (ediBase) {
          // V9.23: 가상 EDI(실 EDI 없이 리스트로 만든 스텁 — cn/pol/wt뿐)는 규격·F/E의 진실이 아니다.
          //   스텁이거나 EDI 값이 비어 있으면 리스트가 핵심 필드를 채운다 (OBWH 2699E 실측:
          //   records엔 fe/iso 전수 있는데 화면은 미정·기타 — 사용자 신고 "풀엠티·규격 다 있는데 적용 안 됨").
          //   실 EDI에 값이 있으면 기존 원칙 그대로 EDI가 진실.
          const CORE_FILL = k === 'fe' || k === 'iso' || k === 'tp' || k === 'rf' || k === 'fr' ||
            k === 'ot' || k === 'tk' || k === 'dg' || k === 'dgc' || k === 'un' || k === 'pg' || k === 'pod' || k === 'tmp_missing';
          // TallyOne 2.00-01: 특수화물 플래그는 EDI 초기값 false 가 «정보 없음»이다 — DGS 없는 EDI(연운항형)의
          //   dg:false 가 리스트의 true 를 막아 DG 23대가 화면·미르 답에서 사라졌다(TNJP 26360E 실측).
          //   false→true 승격만 허용. tmp_missing 은 대상 아님(EDI 온도가 있는데 «미기재»로 뒤집히면 안 된다).
          const FLAG_FILL = (k === 'rf' || k === 'fr' || k === 'ot' || k === 'tk' || k === 'dg' || k === 'oog') &&
            v === true && ediBase[k] !== true;
          // 2.05-05 (검수사 실측 CAAU4289478 — 배지는 RF -2°C 인데 아래는 «온도 미입력»): 자료 온도(tmp)가
          //   이미 있으면 리스트의 «미기재» 마킹(tmp_missing:true)을 얹지 않는다 — EDI 에 tmp_missing 이
          //   없어서(undefined) CORE_FILL 이 true 를 채우던 모순.
          if (k === 'tmp_missing' && v === true && ediBase.tmp) return;
          if ((CORE_FILL && (ediBase._virtualEdi || ediBase[k] === undefined || ediBase[k] === '')) || FLAG_FILL) {
            safeR[k] = v; return;
          }
          //  ★ 2.77 (검수사 확정 2026-08-28 «앱의 판단도 틀리다고는 할수없습니다. 컨테이너
          //    상세화면엔 분명히 목적지가 평택이 아니었으니»): EDI 가 이기는 것은 그대로 두되,
          //    **리스트가 뭐라 했는지를 버리지 않는다.** 종전엔 이 줄에서 통째로 사라져
          //    컨 상세에 EDI 값만 남았고, 검수사가 그것을 보고 «평택이 아닌데» 가 됐다.
          //    ⚠ 판정은 바꾸지 않는다 — 보여 주기만 한다(2.76 판정은 리스트가 기본).
          if (k === 'pod' && v && String(v).toUpperCase() !== String(ediBase[k] || '').toUpperCase()) {
            safeR._podList = String(v).toUpperCase();
            safeR._podEdi = String(ediBase[k] || '').toUpperCase();
          }
          // EDI 매칭됨 → 핵심 필드는 보호, 보강 필드만 허용
          if (!ALLOWED_LIST_FIELDS.has(k)) return;  // 핵심 필드 무시
          // M6.94.32: EDI에 위치(bay)가 있으면 리스트 bay/row/tier가 덮지 못함.
          //   엠티 선적 엑셀엔 진짜 위치가 없어 가짜 값이 EDI 정확한 위치를 덮으면 그림이 깨짐.
          // TallyOne 1.55 재점검: **그대로 둔다.** `ediContainers.bay` 는 이제 선사 계획 전용이고
          //   (`_updatePositionFields` 의 덮어쓰기 삭제), 검수원이 지정한 자리는 `bay_actual` 로 와서
          //   아래 승격 블록을 탄다. 여기서 막히는 것은 리스트 파서가 만든 좌표뿐이다.
          if (isPositionField && ediBase.bay !== undefined && ediBase.bay !== '') return;
          // tmp는 EDI에 이미 있으면 덮어쓰지 않음 (EDI가 진실)
          if (k === 'tmp' && ediBase.tmp && !ediBase.tmp_missing) return;
          // 무게는 **리스트가 기준**이다 — TallyOne 1.23 (검수사 확정 2026-08-07).
          //   왜 뒤집었나 — 종전엔 EDI 값이 있으면 리스트를 무시했다. 그런데
          //   "검수의 기본은 리스트입니다. EDI 는 처음에 컨번호 없이 자리만 지정하는 경우가 많고
          //    그때 오기입이 들어갈 수 있습니다."
          //   실측 근거 — TNJP 26356E CKFU9806127: EDI 4,000kg(43DC 타레 3,900) 인데
          //   리스트는 20,385kg 에 실번호 LYG465484 까지 있다. EDI 쪽이 틀렸다.
          //   ⛔ 예외를 만들지 마라 — "같은 B/L 에서 20ft·40ft 무게가 같으면 총중량 복사" 라는
          //   예외를 넣었다가 교정받았다(2026-08-07). **20ft 도 30톤까지 싣고, 20ft 가 40ft 보다
          //   무거울 수도 있다**(40ft 에 부피만 큰 가벼운 화물을 넣기도 한다).
          //  ★ 2.52-03 — **리스트 무게가 «빈칸/0» 이면 EDI 무게를 지우지 않는다.**
          //    규칙(1.23 «무게는 리스트가 기준»)은 그대로다 — 다만 그것은 **리스트에 값이 있을 때** 하는 말이다.
          //    실측: `records.wt = 0` 이 `parseListWeightKg(0) → 0` 으로 EDI 27,600kg 을 덮고 있었다.
          //    NSFR 2616N 은 **140대 전부**, 전 항차 합계 **1,032대** 가 이렇게 무게를 잃고 있었다.
          //    ⚠ 화면 두 곳이 서로 다른 값을 보고 있었다 —
          //      자동 가이드(SearchPanel.allContainers 경로)는 «27.6t» 로 트윈 하중까지 계산해 막는데,
          //      양하 탭 리스트·미르(이 경로)는 무게 칸이 통째로 비어 있었다(실선 확인).
          //    ⚠ 0kg 컨테이너는 없다 — 타레만 2톤이다. 0 은 언제나 «값 없음»이지 «0킬로»가 아니다.
          if (k === 'wt') { const _w = parseListWeightKg(v); if (_w > 0) safeR.wt = _w; return; }   // 톤 보정 후 리스트 값 채택
          safeR[k] = v;
        } else {
          // EDI에 없는 컨번호 → 리스트만 있는 항목 (참고용으로 허용)
          if (v !== 0) safeR[k] = v;
        }
      });
      merged[r.cn] = { ...(ediBase || {}), ...safeR, _inList: true, _src: ediBase ? 'both' : 'list' };   // V8.86: 리스트 등록 표식(선적 평택 판정 — 별첨·베이와 동일 원칙)
    });
    // V7.99-16: 초과 컨(리스트·EDI에 없는데 내려진 것) 합치기 — 양하신고 점검이 보도록.
    //   completed에도 flag:'extra'로 기록되지만, 컨 목록에 없으면 집계에서 빠지므로 여기서 추가.
    const extrasMap = (mode === 'discharge' ? (sec.extras || {}) : {});
    Object.keys(extrasMap).forEach(cn => {
      if (!merged[cn]) merged[cn] = { cn, _src: 'extra', pod: 'KRPTK', _extraNote: extrasMap[cn]?.note || '' };
    });
    // 2.08-11 (검수사 확정 «실 리스트가 존재 하는데 예상EDI에 있는 가상리스트를 선적리스트에
    //   포함시키는것은 없어야 합니다 — 원천봉쇄», SWAT 2607N 실측: 실번호 리스트 523(F166·E357)이
    //   있는데 예상 EDI 의 __BOOK 자리 523이 별도 행으로 잡혀 목록이 1046으로 두 배):
    //   실번호 리스트가 F/E 각각 가상 자리 수를 채우면 그 가상 자리는 작업 목록에서 뺀다.
    //   부분 리스트만 온 배(실번호 < 자리)는 보수적으로 유지 — 자리 그림(베이플랜·카고플랜)은
    //   raw 전문(fullEdiMap) 기준이라 여기서 빼도 그대로 그려진다. V9.08 원칙: 확정이 오면 그것이 진실.
    {
      const _isSlot = (c) => !!(c._slot || c.pendingCn || String(c.cn || '').startsWith('__'));
      const _cnt = { F: { real: 0, slot: 0 }, E: { real: 0, slot: 0 } };
      for (const c of Object.values(merged)) {
        const fe = c.fe === 'E' ? 'E' : 'F';
        if (_isSlot(c)) _cnt[fe].slot++;
        else if (recMap[c.cn]) _cnt[fe].real++;
      }
      for (const [k, c] of Object.entries(merged)) {
        if (!_isSlot(c)) continue;
        const fe = c.fe === 'E' ? 'E' : 'F';
        if (_cnt[fe].slot > 0 && _cnt[fe].real >= _cnt[fe].slot) delete merged[k];
      }
    }
    const baseContainers = Object.values(merged).sort((a, b) => {
      const ka = `${a.bay || 'zz'}-${a.row || 'zz'}-${a.tier || 'zz'}`;
      const kb = `${b.bay || 'zz'}-${b.row || 'zz'}-${b.tier || 'zz'}`;
      return ka.localeCompare(kb);
    });

    // M4.9e-fix 2단계: 선적 모드 — 실체 위치 적용
    //   actual 있으면 → 실체 위치로 그리드에 그려짐
    //   계획 위치는 _bay_planned/_row_planned/_tier_planned에 보존 (보고서/UI용)
    //   1.55-03: 양하도 실체가 있으면 승격 — 양하 EDI 는 원래 실체지만, 검수원이 자리를 고치면 bay_actual 이 새 실체다.
    {
      return baseContainers.map(c => {
        if (c.bay_actual && c.row_actual && c.tier_actual) {
          return {
            ...c,
            // 그리드/검색용 effective 위치
            bay: c.bay_actual,
            row: c.row_actual,
            tier: c.tier_actual,
            // 계획 위치 보존 (보고서/모달 표시용)
            _bay_planned: c.bay,
            _row_planned: c.row,
            _tier_planned: c.tier,
            // TallyOne 1.55: 같은 계획 좌표를 `_edi_*` 이름으로도 내려보낸다 —
            //   `utils.buildSlotUniverse`·`effectivePos` 가 그 이름으로 계획 좌표를 찾는다.
            //   (`effectivePos` 는 실체가 있으면 실체를 먼저 쓰므로 판정은 바뀌지 않는다.)
            _edi_bay: c.bay,
            _edi_row: c.row,
            _edi_tier: c.tier,
            _position_moved: true,
          };
        }
        return c;
      });
    }
    return baseContainers;
  }, [ediMap, recMap, mode, sec.extras, shiftingConfirmed, fullEdiMap]);   // 1.76-05: 시프팅(확정)이 리스트에 들어가려면 의존에 있어야 한다

  // V9.03: 검수 리스트/검색/출력허브용 목록에 긴급/수화물 마커 주입
  const containers = useMemo(
    () => {
      const base = tagForecastMarks(containersBase, urgentSet, luggSet, _fc?.luggageSeals || null);   // 2.08-07
      // 1.85-06 (검수사 지적 «덱이 보이면 컨이 지정되어 있는거 아닙니까» — 맞다): 덱플랜(stowagePlan)의
      //   갠트리(lolo)·자리(pos)·2단(dbl) 지정을 조회용 컨 속성에 병합한다. RZOR R089E 실측 — 덱플랜은
      //   와 있는데(갠트리 49) ediContainers 엔 주입 전이라 «LOLO 리스트» 조회가 0건이었다.
      //   화면(DeckPlanView)은 plan 을 직접 그려 보였고, 조회(nlSearch)만 못 보던 불일치를 여기서 없앤다.
      const decks = sec.stowagePlan?.decks;
      if (!Array.isArray(decks) || !decks.length) return base;
      const mark = {};
      for (const dk of decks) for (const s of (dk?.slots || [])) if (s && s.cn && !s.empty) mark[s.cn] = s;
      if (!Object.keys(mark).length) return base;
      const out = base.map(c => {
        const s = mark[c.cn];
        if (!s) return c;
        // 2.06 (검수사 실측 «RZOR 자료에서 수화물이 안보입니다» — SPSU2019220): RZOR 수화물은 별도 리스트가
        //   아니라 **덱플랜 칸의 LUG 마킹**으로 온다. 파서(rzorPlan)는 flags 로 뽑고 있었는데 여기 병합이
        //   버려서 보라 박스·브리핑·«수화물» 조회에 안 잡혔다. 긴급 플래그도 같이 얹는다.
        const _fl = Array.isArray(s.flags) ? s.flags : [];
        return { ...c, lolo: c.lolo || !!s.lolo, pos: c.pos || s.pos || '', dbl: c.dbl || !!s.dbl,
          lugg: c.lugg || _fl.includes('LUG'), urgent: c.urgent || _fl.includes('긴급') };
      });
      // 2.06-02 (검수사 «리스트 목록에도 카드색이 반영안됨» — R090E 실측): SPSU2019220 은 EDI(208)에도
      //   양하 리스트(208)에도 없고 **덱플랜에만 있다**. 그래서 리스트에 행 자체가 없어 보라 카드가
      //   나올 수 없었다. 덱플랜 전용 LUG(수화물) 컨만 행으로 추가한다 — R087E(163/164, 수화물 +1)처럼
      //   수화물은 실작업 대상이라 총계에 드는 것이 현장과 맞다. 다른 덱 전용 컨은 추가하지 않는다(외과적).
      const have = new Set(out.map(c => c.cn));
      for (const [cn, s] of Object.entries(mark)) {
        if (have.has(cn)) continue;
        const _fl = Array.isArray(s.flags) ? s.flags : [];
        if (!_fl.includes('LUG')) continue;
        // 2.06-04: 카톡·메시지로 «내린다» 통보가 오면 카드의 [양하 확정] 버튼으로 확정 —
        //   확정(luggConfirm)되면 _deckOnly 가 풀려 총계(전체)에 편입되고 미정 칸에서 빠진다.
        const _cf = !!(sec.luggConfirm && sec.luggConfirm[cn]);
        out.push({ cn, l4: cn.slice(-4), iso: String(s.iso || '').replace(/\s/g, ''), fe: s.fe || '',
          bay: s.bay || '', row: s.row || '', tier: s.tier || '', pos: s.pos || '',
          lugg: true, urgent: _fl.includes('긴급'), lolo: !!s.lolo, dbl: !!s.dbl,
          _deckOnly: !_cf, _luggConfirmed: _cf });
      }
      return out;
    },
    [containersBase, urgentSet, luggSet, _fc, _fcApply, sec.stowagePlan, sec.luggConfirm]);

  // ── TallyOne 1.8: 리퍼 온도 확인 ─────────────────────────────────────────
  //   "작업전 먼저 선박을 선택합니다. 그러면 앱은 리퍼 유무를 판단하고 있으면 리퍼메모 화면을
  //    띄워 줍니다"(검수사 확정 2026-08-04). 아직 확인 안 한 리퍼가 남아 있을 때만 자동으로 뜬다.
  //   확인을 마치면 다시 안 뜨고, 상단 「❄ 리퍼 N」 버튼으로 언제든 다시 연다.
  //   대상 = **풀 리퍼만**(검수사 확정 2026-08-04). 공 리퍼는 전원을 안 꽂아 잴 것이 없다.
  //   ReeferMemoModal.isReefer 와 **같은 식**이어야 한다 — 버튼 숫자와 모달 줄 수가 어긋나면 안 된다.
  const reefers = useMemo(
    () => (containers || []).filter((c) => {
      const rf = !!c.rf || String(c.iso || '').toUpperCase()[2] === 'R' || /^45[38]/.test(String(c.iso || ''));
      if (!rf || c.rfdry || c.mkcon) return false;
      return c.fe === 'F' || !c.fe;
    }),
    [containers]);
  const rfUnchecked = useMemo(() => reefers.filter(c => !c.rfCheckedAt).length, [reefers]);
  const [showReefer, setShowReefer] = useState(false);
  const rfAutoRef = React.useRef('');
  React.useEffect(() => {
    // 항차·모드가 바뀔 때 한 번만 판단한다(자료가 늦게 도착해 재렌더돼도 다시 띄우지 않는다).
    const key = `${voyageKey}|${mode}`;
    if (rfAutoRef.current === key) return;
    if (!reefers.length) return;          // 리퍼 자체가 없으면 아무 일 없다
    rfAutoRef.current = key;
    /* 2.87: mirPlan — 홈 미르가 플랜만 보려고 덮어 띄운 화면이다. 여기서 온도 모달이 튀어나오면
       검수사가 부른 적 없는 팝업이 플랜을 가린다(실측 KSKM 2617S — 카고플랜 위에 모달이 떴다). */
    if (rfUnchecked > 0 && !shipPolicy?.rfSkip && !mirPlan) setShowReefer(true);   // 1.86: 리퍼 체크 안 함 배는 자동으로 안 띄움
  }, [voyageKey, mode, reefers.length, rfUnchecked]);

  // V8.06: LOLO/IFCSUM 선박 판정 — 컨테이너에 베이 위치가 하나도 없으면 LOLO 전용.
  //   RIZHAO ORIENT 등 RORO/LOLO 혼용선은 IFCSUM(베이 없음)으로 명세만 제공된다.
  //   베이 그림이 무의미하므로 리스트 기반 LOLO 탭을 노출한다(기존 베이 선박엔 영향 0).
  const isLoloShip = useMemo(() => {
    // V8.09-07: LOLO 판정을 선박정책(lolo 플래그)으로 변경 (사용자 확정 2026-06-18).
    //   기존 "모든 컨에 bay/row/tier 없음"은 일반 베이 선박(TPMZ)이 위치정보 없이 올라오면
    //   LOLO로 오판 → LOLO 탭 자동전환·수석 LOLO 리스트 오생성. LOLO는 RZOR만.
    const vsl = voyage?.info?.vsl || '';
    const hints = [voyage?.info?.voy, voyage?.info?.voyage, voyage?.info?.callsign].filter(Boolean);
    return isLoloShipByPolicy(vsl, extraPolicies, hints);
  }, [voyage, extraPolicies]);

  // V8.06: LOLO 선박(베이 없는 IFCSUM)이면 최초 1회 자동으로 LOLO 탭으로 전환.
  //   양하 탭의 EDI↔리스트 매칭 경고("리스트에 없음")는 이 선박엔 부적절(EDI가 곧 리스트)하므로
  //   LOLO 탭을 기본으로 열어 검수사가 바로 작업하게 한다. 이후 사용자가 탭을 바꾸면 그 선택을 존중.
  const loloAutoSwitched = useRef(false);
  useEffect(() => {
    if (isLoloShip && !loloAutoSwitched.current) {
      loloAutoSwitched.current = true;
      setTab('lolo');
    }
  }, [isLoloShip]);

  // M3.5.5: 선박 정책 매칭 (DEFAULT + Firebase extra)
  const shipPolicy = useMemo(() => {
    const vsl = voyage?.info?.vsl || '';
    return matchShipPolicy(vsl, extraPolicies);
  }, [voyage, extraPolicies]);

  // M3.5.5: 정책 적용 대상 컨테이너 (sealMode 표시용)
  const sealTargets = useMemo(() => {
    if (!shipPolicy) return { byCn: {}, list: [] };
    const byCn = {};
    const list = [];
    (containers || []).forEach(c => {
      const sm = applyPolicyToContainer(shipPolicy, c);
      if (sm) {
        byCn[c.cn] = sm;
        list.push({ ...c, _sealMode: sm });
      }
    });
    return { byCn, list };
  }, [shipPolicy, containers]);

  // ── 1.87 (검수사 확정 — ATPR·WEIHAI 엠티실): 항차 엠티실 범위(복수 구간)와 정리 ──
  //   «엠티실이 6자리인데 앞세자리는 같습니다 … 100개가 넘어가면 앞자리 세자리가 바뀝니다.
  //    그때는 1. 521001~522000 2. 523001~524000 이런식으로» — 구간 여러 개.
  //   «번호가 입력되면 그걸 정리해서 리스트로 제출 … 200개를 입력했고 컨테이너가 168개라면
  //    32개의 잔여 실번호 리스트도 제출해야 합니다. 그래야 오기입 문제를 찾습니다.»
  const esealRanges = voyage?.loading?.esealRanges?.list || null;   // [{from,to}]
  const esealInfo = useMemo(() => {
    if (shipPolicy?.mode !== 'attach' || !sealTargets.list.length) return null;
    const targets = sealTargets.list;
    // 베이별·규격별 분포
    const byBay = {};
    for (const c of targets) {
      const b = parseInt(c.bay, 10);
      const k = Number.isFinite(b) ? b : '?';
      const sz = (String(c.iso || '')[0] === '2') ? '20' : '40';
      const v = byBay[k] = byBay[k] || { n: 0, s20: 0, s40: 0 };
      v.n++; v[sz === '20' ? 's20' : 's40']++;
    }
    // 범위 전개(구간당 10,000 가드) — 사용/잔여
    const pool = [];
    for (const r of (esealRanges || [])) {
      const f = parseInt(r.from, 10), t = parseInt(r.to, 10);
      if (!Number.isFinite(f) || !Number.isFinite(t) || t < f || t - f > 10000) continue;
      for (let n = f; n <= t; n++) pool.push(String(n).padStart(String(r.from).length, '0'));
    }
    const usedPairs = [];
    for (const c of targets) {
      const e = String(recMap[c.cn]?.eseal ?? c.eseal ?? '').trim();
      if (e) usedPairs.push({ cn: c.cn, seal: e });
    }
    const usedSet = new Set(usedPairs.map(u => u.seal));
    const remain = pool.filter(s => !usedSet.has(s));
    return { targets, byBay, ranges: esealRanges || [], pool, usedPairs, remain };
  }, [sealTargets, esealRanges, recMap, shipPolicy]);

  // TallyOne 2.01 (검수사 확정 «양하 탭이든 선적 탭이든 어디든 브리핑 해달라고 하면 그자리에서» ):
  //   인라인 즉답 카드가 브리핑을 직접 내도록 재료 한 벌(briefCtx)로 묶어 내린다 — SearchPanel 1043행과 같은 재료.
  //   ⚠ prop 체인: VoyagePage → ListTab/LoloTab → InlineAnswerCard (1.98 교훈 — 시그니처 전부 갱신).
  // 2.03: 데미지 예약 승격 — 자료가 도착해 예약 컨이 이 항차(양하·선적 어느 쪽이든)에 나타나면
  //   pendingDamage → voyages/{key}/photos 로 옮긴다(멱등 — waiting 만, 승격 후 promoted 마킹).
  //   승격되면 기존 경로(CARGO DAMAGE REPORT·조회 사진·색인)가 그대로 동작한다.
  // 2.06-01 (검수사 «항차 목록에서도 LUG 표기가 없습니다»): 수화물의 정본 통로는 info.forecast.luggageCns —
  //   홈 항차 카드(🧳 배지)·검증 면제(lugCns)·브리핑이 전부 이걸 본다. RZOR 은 수화물이 덱플랜 LUG 로만 와서
  //   이 통로가 비어 있었다. 덱플랜에서 발견한 LUG 컨을 forecast.luggageCns 로 승격(합집합, 다를 때만 1회 PATCH).
  const lugPromoRef = useRef('');
  useEffect(() => {
    if (lugPromoRef.current === voyageKey) return;
    const found = new Set();
    for (const _m of ['discharge', 'loading']) {
      const decks = voyage?.[_m]?.stowagePlan?.decks;
      if (!Array.isArray(decks)) continue;
      for (const dk of decks) for (const sl of (dk?.slots || []))
        if (sl && sl.cn && !sl.empty && Array.isArray(sl.flags) && sl.flags.includes('LUG')) found.add(String(sl.cn).toUpperCase());
    }
    if (!found.size) return;
    const cur = (voyage?.info?.forecast?.luggageCns || []).map((x) => String(x || '').trim().toUpperCase()).filter(Boolean);
    const merged = Array.from(new Set([...cur, ...found]));
    if (merged.length === cur.length) { lugPromoRef.current = voyageKey; return; }   // 이미 다 있음
    lugPromoRef.current = voyageKey;
    fbUpdateVoyageInfo(voyageKey, { 'forecast/luggageCns': merged }).catch(() => {});
  }, [voyageKey, voyage]);

  const dmgPromoRef = useRef('');
  useEffect(() => {
    if (dmgPromoRef.current === voyageKey) return;
    const cns = new Set();
    for (const _m of ['discharge', 'loading']) {
      const sec2 = voyage?.[_m] || {};
      Object.keys(sec2.ediContainers || {}).forEach((k) => { if (/^[A-Z]{4}\d{7}$/.test(k)) cns.add(k.toUpperCase()); });
      Object.keys(sec2.records || {}).forEach((k) => { if (/^[A-Z]{4}\d{7}$/.test(k)) cns.add(k.toUpperCase()); });
    }
    if (!cns.size) return;   // 자료가 아직 — 다음 갱신 때 다시
    dmgPromoRef.current = voyageKey;
    (async () => {
      try {
        const pend = await fbGetPendingDamage();
        for (const [cn, entries] of Object.entries(pend || {})) {
          if (!cns.has(String(cn).toUpperCase())) continue;
          const waiting = Object.values(entries || {}).filter((e) => e && e.status === 'waiting');
          if (waiting.length) await fbPromotePendingDamage(voyageKey, cn, waiting);
        }
      } catch (e) { console.warn('[데미지 예약] 승격 확인 실패:', e); }
    })();
  }, [voyage, voyageKey]);

  const briefCtx = useMemo(() => ({
    //  ★ 2.50-02 — `info` 를 같이 싣는다. 미르가 순서를 부르려면 접안 방향(`berthSide`)·IMO 가 필요한데,
    //    `InlineAnswerCard` 는 `voyage` 를 안 받는다(prop 체인: VoyagePage → ListTab/LoloTab → InlineAnswerCard).
    //    🔴 2.50-01 이 그 자리에서 `voyage?.info` 를 그대로 참조해 **앱 전체 크래시**를 냈다.
    //      898행 주석이 «시그니처 전부 갱신 (1.98 교훈)» 이라고 이미 경고하고 있었는데 또 밟았다.
    info: voyage?.info || null,
    //  ★ 2.62: 조 단위 갱 배분 — **함수로** 싣는다(값으로 실으면 memo 가 낡아 «일이 끝나가도 답이 같다»).
    //    InlineAnswerCard 는 voyage 를 안 받는다(1.98·2.50-01 교훈) — 여기서 클로저로 감싼다.
    gangBrief: () => { try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[String(voyage?.info?.vsl || '').toUpperCase()] : null; const de = d ? (d.bayDef || d) : null; return gangBriefLines(buildGangShift(voyage, de, { tw: (terminalWork || {})[String(voyage?.info?.vsl || '').toUpperCase()] || null, compMap: compMap || null })); } catch (e) { return null; } },
    gangShift: (n) => { try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[String(voyage?.info?.vsl || '').toUpperCase()] : null; const de = d ? (d.bayDef || d) : null; return answerGangShift(voyage, de, { nGangs: n || null, tw: (terminalWork || {})[String(voyage?.info?.vsl || '').toUpperCase()] || null, compMap: compMap || null }); } catch (e) { return null; } },
    //  2.63: 스트립용 구조 데이터 — 그림은 GangStrip 이 그린다(계산은 buildGangShift 한 벌).
    gangShiftData: (n) => { try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[String(voyage?.info?.vsl || '').toUpperCase()] : null; const de = d ? (d.bayDef || d) : null; return buildGangShift(voyage, de, { nGangs: n || null, tw: (terminalWork || {})[String(voyage?.info?.vsl || '').toUpperCase()] || null, compMap: compMap || null }); } catch (e) { return null; } },
    //  ★ 2.52-01 — **완료 표를 같이 싣는다.** 이 화면의 `containers` 에는 `_comp` 가 없다.
    //    완료는 별도 `compMap` 으로 다니는데(GuidedWorkPanel 도 둘을 따로 받는다), 미르는 `_comp` 를
    //    보고 있어서 한 대를 내린 직후에도 «남은 140대 (완료 0대)» 라고 답했다 — 실선에서 잡혔다.
    //    ⚠ SearchPanel 의 `allContainers` 는 `_comp` 가 붙어 오므로 그쪽은 안 넘긴다(그대로 동작).
    comp: compMap || null,
    //  2.54-01: 터미널 실적(트레드링스) — 미르의 «얼마나 걸릴까» 가 앱 기록 대신 이것으로 잰다.
    //    ⚠ `InlineAnswerCard` 는 `terminalWork` prop 을 안 받는다(briefCtx 만 받는다) — 여기 실어 보낸다.
    terminalWork: terminalWork || null,
    photos: voyage?.photos || null,   // 2.05: 조회 결과 컨의 사진(데미지·메일 사진)을 인라인 카드가 보여준다
    //  ★ 2.57: 시프팅 맵 — 이 화면 ctx 에만 빠져 있어 시프팅 질문이 «없다»로 나왔다. SearchPanel:1109 와 같은 벌.
    //    InlineAnswerCard 는 voyageKey·voyage 를 안 받으므로(1.98·2.50-01 교훈 — 부모 변수 직접 참조 금지) 여기 실어 내린다.
    shiftMap: (() => { try { return shiftingMapForDisplay(voyageKey, voyage); } catch (e) { return null; } })(),
    pairs: (() => { try { return getBayPairs(containers, voyage?.info?.imo || '', voyage?.info?.vsl || ''); } catch (e) { return null; } })(),
    rfSkip: !!shipPolicy?.rfSkip,
    eseal: esealInfo ? {
      n: esealInfo.targets.length, byBay: esealInfo.byBay, ranges: esealInfo.ranges,
      poolN: esealInfo.pool.length, usedN: esealInfo.usedPairs.length, remainN: esealInfo.remain.length,
    } : null,
  }), [containers, voyage, shipPolicy, esealInfo, terminalWork, voyageKey]);   // ★ 2.57: terminalWork 가 빠져 실적 갱신이 답에 안 실렸다 · voyageKey 는 shiftMap 재료

  // 새 선박 정책 묻기 (M6.45: 1일 1회 — localStorage에 마지막 묻기 날짜 저장)
  //   - 정책 등록되면 shipPolicy 매칭되어 다시 안 뜸 (기존 동작)
  //   - 등록 안 하고 닫기 → 같은 날 다시 안 뜸, 다음 날부터 다시 표시
  //   - 선박별 키 (IMO 또는 vsl)로 구분 — 다른 선박 작업하면 그건 또 뜰 수 있음
  // M6.45: Firebase 백업 추가 — localStorage 작동 안 하는 환경에서도 적용
  //   다른 폰/브라우저에서 같은 검수원이 접속해도 1일 1회 보장
  useEffect(() => {
    if (policyAsked) return;
    if (!voyage?.info?.vsl) return;
    if (shipPolicy) return;  // 이미 매칭됨 — 1.83: «일반»도 저장되므로 등록된 배는 여기서 걸러진다(신규만 묻는다)
    if (mode !== 'loading') return;   // 1.83: 엠티 실은 선적 작업(M8.08) — 양하 화면에서 묻지 않는다
    const hasEdi = (containers || []).length > 0;
    if (!hasEdi) return;

    const policyAskKey = voyage?.info?.imo || voyage?.info?.vsl || voyageKey;
    const todayStr = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
    const lastAskedKey = `policyAsked:${policyAskKey}`;

    // M6.45: localStorage 우선, 다음 Firebase 백업
    (async () => {
      const lsLastAsked = _storage.get(lastAskedKey);
      if (lsLastAsked === todayStr) {
        setPolicyAsked(true);
        return;
      }
      // Firebase 백업 확인 (다른 기기에서 오늘 이미 물어봤을 가능성)
      try {
        const fb = await import('../firebase.js');   // 1.83: default export 가 없어 항상 예외 → 기기 간 1일 1회 가드가 죽어 있었다
        // inspectorActivity에 정책 확인 기록 — 검수원별
        const inspName = inspector || 'anon';
        const fbKey = `policyAsked/${inspName}/${policyAskKey}`;
        const snap = await fb.fbGetSimple ? await fb.fbGetSimple(fbKey) : null;
        if (snap === todayStr) {
          setPolicyAsked(true);
          _storage.set(lastAskedKey, todayStr);  // 로컬에도 동기화
          return;
        }
      } catch (_) { /* Firebase 실패해도 localStorage로 폴백 */ }

      setShowPolicyModal(true);
      setPolicyAsked(true);
      _storage.set(lastAskedKey, todayStr);  // 로컬 기록
      // Firebase 백업 저장 (실패해도 무시)
      try {
        const fb = await import('../firebase.js');
        if (fb.fbSetSimple) {
          await fb.fbSetSimple(`policyAsked/${inspector || 'anon'}/${policyAskKey}`, todayStr);
        }
      } catch (e) { console.warn('[정책질문 기록] Firebase 백업 저장 실패(로컬 기록은 유지)', e); }  // V9.57: 조용한 실패 금지
    })();
  }, [voyage, shipPolicy, policyAsked, containers, voyageKey, inspector, mode]);

  // M3.5.4: 자동 진단 (containers/recMap/xrayMap 변경 시 재계산)
  const diagAlerts = useMemo(() => {
    if (!containers || containers.length === 0) return [];
    if (diagDismissed) return [];
    // 평택 화물만 필터된 ediMap 만들기
    const ediPtkObj = {};
    Object.values(ediMap || {}).forEach(c => {
      const isPtkC = isPtk(c);   // V9.29: TS 화물 포함 — 판정 단일 소스
      if (!isPtkC) return;
      // M8.07: 진단용 보강 — EDI에 온도/F/E가 없으면 검수 리스트(records) 값으로 채움.
      //   RIZHAO 등 IFCSUM은 EDI에 온도 필드가 없고 검수 엑셀에만 있음.
      //   EDI에 값이 있으면 보존(EDI 우선). 진단 입력만 보강, 원본 ediMap 불변.
      const r = recMap[c.cn];
      let merged = c;
      if (r) {
        const patch = {};
        const ediTmp = String(c.tmp || '').trim();
        const recTmp = String(r.tmp || '').trim();
        if (!ediTmp && recTmp) { patch.tmp = r.tmp; patch.tmp_missing = false; }
        if (!c.fe && r.fe) patch.fe = r.fe;
        if (Object.keys(patch).length) merged = { ...c, ...patch };
      }
      ediPtkObj[c.cn] = merged;
    });
    return runDiagnostics({
      ediContainers: ediPtkObj,
      listRecords: recMap,
      xrayList: xrayMap,
      mode,
      carrier: voyage?.info?.carrier || '',
      sealPolicy: shipPolicy,  // M3.5.5
      lugCount: shipLuggageCount(voyageKey),  // 1.56-02: 수화물은 검증 대상이 아니다(검수사 확정)
      // 1.56-03: 이 항차의 수화물 **번호**까지 넘긴다 — 번호는 항차마다 바뀌지만, 양하에서
      //   「리스트에만 있고 EDI에 없는 컨(상시 대수 이내)」으로 판정된 그 번호가 선적 검사(엠티 실 등)에도 그 컨이다.
      lugCns: (() => {
        // 1.56-04: CLL 본문이 선언한 수화물 번호(수집기 → forecast.luggageCns)가 1순위 —
        //   상시 대수(SHIP_LUGGAGE) 미등록 선박(OBWH 등)도 이것으로 면제된다.
        const out = new Set((voyage?.info?.forecast?.luggageCns || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean));
        const cap = shipLuggageCount(voyageKey);
        if (cap) {
          const dis = voyage?.discharge;
          if (dis) {
            const ediCns = new Set(Object.values(dis.ediContainers || {}).map(x => x?.cn).filter(Boolean));
            const extras = Object.keys(dis.records || {}).filter(cn => !ediCns.has(cn));
            if (extras.length <= cap) extras.forEach(cn => out.add(cn));
          }
        }
        return [...out];
      })(),
    });
  }, [containers, ediMap, recMap, xrayMap, mode, diagDismissed, voyage, shipPolicy]);

    // 2.18 — 컨테이너 상세는 **한 벌**만 만들고 담기는 자리만 바꾼다.
  //   넓은 화면(lg+) 이고 리스트 탭이면 → 우측 고정 칼럼(variant='panel').
  //   그 외(폰·다른 탭·검색 결과) → 종전대로 오버레이(폰에서는 바텀시트).
  //   ⚠ 두 자리에 각각 그리면 Firebase 구독과 입력 상태가 두 벌이 된다 — 그래서 조건은 JS 로 가른다.
  const detailPanelHere = isWide && tab === 'list' && !!detailC && !detailC._mode;
  const renderDetail = (variant) => {
        // 검색에서 온 경우 _mode 사용, 아니면 현재 mode
    const cMode = detailC._mode || mode;
    const cSec = voyage[cMode] || {};
    // M3.87: 위치 수정 충돌 검사용 - 같은 모드 전체 컨테이너 머지
    const ediMap = cSec.ediContainers || {};
    const recMap = cSec.records || {};
    const compMap = cSec.completed || {};
    const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
    const allContainersForMode = [...allCnSet].map(cn => {
      const e = ediMap[cn] || {};
      const r = recMap[cn] || {};
      return { ...e, ...Object.fromEntries(Object.entries(r).filter(([k,vv]) => vv !== '' && vv != null)), cn, _comp: compMap[cn] || null };
    });
    return (
      <ContainerDetailModal
        variant={variant}
        c={detailC}
        workBay={detailC.bay || detailC.bay_orig || (recMap[detailC.cn]?.bay_orig) || null}
        workTier={(() => { const t = parseInt(detailC.tier || detailC.tier_planned || recMap[detailC.cn]?.tier_orig || '', 10); return Number.isFinite(t) ? (t < 80 ? 'hold' : 'deck') : null; })()}
        comp={cSec.completed?.[detailC.cn]}
        isXray={cMode === 'discharge' && !!(cSec.xrayList?.[detailC.cn])}
        xraySeal={cSec.xraySeals?.[detailC.cn] || null}
        mode={cMode}
        voyageKey={voyageKey}
        voyageInfo={voyage.info}
        inspector={inspector}
        sealMode={sealTargets.byCn[detailC.cn] || null}
        onClose={() => setDetailC(null)}
        allContainers={allContainersForMode}
      />
    );
  };

  /* ★ 2.87-01 — 플랜 덮개를 한 군데서 만든다.
       ⚠ 홈에서 물었을 때(mirPlan) 본문까지 그리면, App 쪽 덮개가 다시 카고플랜(포털·z-50)을
         가린다 — 2.87 이 그렇게 깨졌다. 그래서 그때는 **플랜만** 돌려준다. 홈 화면은 뒤에 그대로 산다. */
  const _planOverlay = planOv && (planOv.what === 'cargo' ? (
        /* 카고플랜은 제 힘으로 화면을 덮는다(createPortal → body 직속, z-50).
           ⛔ 그래서 덮개 «안»에 두면 안 된다 — 2.87 이 그렇게 해서 덮개(z-70)가 카고플랜을 가렸다.
              제목만 「카고플랜」이고 화면은 베이플랜이었다(검수사 «카고플랜과 베이플랜 구분 못함?»).
           ⇒ 카고플랜을 물으면 **덮개 없이 카고플랜만** 띄운다. 그 화면의 ✕ 닫기가 곧 되돌아가기다. */
        <PrintableCargoPlanV2
          /* BayPlan(995행)과 같은 변환 — 카고플랜은 «계획»이라 실체로 승격된 좌표를 계획으로 되돌린다.
             ⚠ 여기를 고치면 저기도 본다. 두 벌이 갈리면 같은 배가 두 그림으로 나온다. */
          containers={allEdiContainers.map(c => (c._edi_bay !== undefined && c._edi_bay !== '') ? { ...c, bay: c._edi_bay, row: c._edi_row, tier: c._edi_tier } : c)}
          mode={mode}
          voyageInfo={voyage?.info}
          shipImo={voyage?.info?.imo}
          shipName={voyage?.info?.vsl}
          xrayMap={xrayMap}
          shiftingMap={shiftingMap}
          onClose={_closePlanOv}
        />
      ) : (
        <div className="fixed inset-0 z-[70] bg-ink-950 overflow-auto">
          <div className="sticky top-0 z-[71] flex items-center gap-2 px-3 py-2 bg-ink-900 border-b border-line">
            <div className="text-xs2 font-bold text-amber-300">
              {voyage?.info?.vsl || ''} {mode === 'loading' ? '선적' : '양하'}
              {planOv.bay != null ? ` ${planOv.bay}번 베이` : ' 베이플랜'}
            </div>
            <button onClick={_closePlanOv}
              className="ml-auto px-3 py-1.5 rounded-btn bg-ink-750 text-dim-200 text-xs2 font-bold">닫기</button>
          </div>
          <BayPlan
            containers={allEdiContainers} compMap={compMap} xrayMap={xrayMap} restowMap={shiftingMap} mode={mode}
            preGoneInfo={preGoneInfo}
            onOpenContainer={(c) => setDetailC(c)}
            shipImo={voyage?.info?.imo}
            shipName={voyage?.info?.vsl}
            voyageInfo={voyage?.info}
            voyageKey={voyageKey}
          />
        </div>
      ));
  if (mirPlan) return _planOverlay;

  return (
    <div className="max-w-6xl mx-auto px-3 py-2">
      {/* 모드 탭 (둘 다 있을 때만) */}
      {showDis && showLoa && (
        <div className="flex gap-1 mb-3 bg-ink-900 border border-line rounded-pill p-1">
          <button
            onClick={() => setMode('discharge')}
            className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'discharge' ? 'bg-blue-700 text-blue-100' : 'text-dim-300 hover:bg-ink-750'
            }`}
          >
            <ArrowDown className="w-4 h-4"/>양하{!hasDis && <span className="text-2xs font-normal opacity-70">(자료 대기)</span>}
          </button>
          <button
            onClick={() => setMode('loading')}
            className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'loading' ? 'bg-amber-700 text-amber-100' : 'text-dim-300 hover:bg-ink-750'
            }`}
          >
            <ArrowUp className="w-4 h-4"/>선적{!hasLoa && <span className="text-2xs font-normal opacity-70">(자료 대기)</span>}
          </button>
        </div>
      )}
      {!showDis && !showLoa && <ModeSetup voyageKey={voyageKey} />}

      {/* 모드 라벨 (한 모드만 있을 때) */}
      {(showDis !== showLoa) && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black ${
            mode === 'discharge' ? 'bg-blue-900/50 text-blue-200' : 'bg-amber-900/50 text-amber-200'
          }`}>
            {mode === 'discharge' ? <><ArrowDown className="w-3 h-3"/>양하</> : <><ArrowUp className="w-3 h-3"/>선적</>}
          </span>
        </div>
      )}

      {/* V9.17: 출항 임박 마감 경고 — ETD 2시간 전인데 미완·X-RAY·리퍼 온도가 남아 있으면 붉은 배너.
          데이터(ETD·미완 판정)는 전부 있었는데 능동 경고가 0이었다(전면 점검 §6). */}
      {(() => {
        try {
          const info = voyage?.info || {};
          //  ★ 2.78: 콜사인+IMO 손매칭 → 베이매트릭스 신원(공용 매처 한 벌).
          //    콜사인이 비면 여기도 조용히 null 이라 출항 임박 경고가 아예 안 떴다.
          const pm = matchPortMis(portMisData, info);
          if (!pm) return null;
          const etd = parsePortMisDateTime(pm.etd);
          if (!etd) return null;
          const left = etd - Date.now();
          if (left <= 0 || left > 2 * 3600000) return null;
          const undone = containers.filter(c => !compMap[c.cn]).length;
          const xrayPend = mode === 'discharge' ? Object.keys(xrayMap || {}).filter(cn => !(xraySeals || {})[cn]?.seal).length : 0;
          const rfMiss = containers.filter(c => (c.rf || (c.iso && c.iso[2] === 'R')) && !c.rfdry && !c.mkcon &&
            (c.fe === 'F' || !c.fe) && (!c.tmp || String(c.tmp).trim() === '')).length;
          if (!undone && !xrayPend && !rfMiss) return null;
          const mins = Math.round(left / 60000);
          const parts = [];
          if (undone) parts.push(`미완 ${undone}대`);
          if (xrayPend) parts.push(`X-RAY 미처리 ${xrayPend}대`);
          if (rfMiss) parts.push(`리퍼 온도 미입력 ${rfMiss}대`);
          return (
            <button onClick={() => setClosingOpen(true)}
              className="w-full mb-3 bg-red-950/70 border-2 border-red-600 rounded-pill px-3 py-2.5 text-left active:scale-[0.99]">
              <div className="text-sm2 font-black text-red-200">
                🚨 출항 {mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`} 전 — {parts.join(' · ')}
              </div>
              <div className="text-xxs text-red-300/80 mt-0.5">탭하면 마감 점검이 열립니다</div>
            </button>
          );
        } catch { return null; }
      })()}

      {/* M5.0: 항차 요약 카드 — 진입 시 즉시 상황 파악 */}
      {!_sideCanc && <VoyageSummaryCard voyage={voyage} mode={mode}
        reeferCheck={reefers.length > 0
          ? { total: reefers.length, unchecked: shipPolicy?.rfSkip ? 0 : rfUnchecked, onOpen: () => setShowReefer(true) }   // 1.86: rfSkip 배는 미확인 배지 끔
          : null} />}

      {/* M5.1 G: 작업 보고 + 마감 점검 두 큰 버튼 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <button onClick={() => setShowWorkReport(true)}
          className="py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-pill font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
          📤 작업 보고
        </button>
        <button onClick={() => setClosingOpen(true)}
          className="py-3 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-pill font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
          🏁 마감 점검
        </button>
      </div>

      {/* ── TallyOne 1.55: 「풀 컨테이너 시퀀스 작업입니까?」 — **작업 개념은 셋이다.** ── (검수사 확정 2026-08-12)
          원문 — *"선적을 하기 전에 묻습니다. 풀 컨테이너 시퀀스 작업인지 아닌지를.
                   엠티는 안 묻는 이유는 포트만 바뀌지 않으면 언제든 액츄얼이 가능하기 때문입니다."*
          ⚠ 1.54 는 「예/아니오」 두 갈래뿐이라 *"풀만 시퀀스"* 와 *"풀·엠티 둘 다 시퀀스"* 를 구분하지 못했다.
            실제 사고 — DXQD 2631W 는 **풀만 시퀀스**였는데(풀 11대는 계획대로, 엠티 324대 중 173칸의 번호만 섞였다)
            작업자가 「아니오 — 액츄얼」을 골라 **풀 어긋남 방어가 꺼진 채 335대를 실었다.**
          ⚠ **항차 속성이다.** 자연어 탭의 자동/수동 모드와 별개다 — 자동/수동은 **가이드를 받을지 말지**이고
            시퀀스/액츄얼은 **일항사가 정하는 적재 방침**이다.
          한 번 답하면 끝이다(작업 흐름을 막지 않는다). 답이 있으면 작은 칩만 남고, 눌러서 바꿀 수 있다.
          답을 안 하면(미정) 앱은 **액츄얼**로 본다(firebase.js — 모르면 안 막는 쪽이 안전하다). */}
      {!_sideCanc && mode === 'loading' && (tab === 'list' || tab === 'search' || tab === 'bay' || tab === 'lolo') && (() => {
        // 작업하는 탭에서만 묻는다 — 업로드·통계·결과 탭에서까지 붙잡지 않는다.
        //   ⛔ `info.seqFull` 을 직접 읽지 않는다. 옛 항차는 `seqFull` 만 있고 새 항차는 `seqMode` 라
        //   두 모양을 아는 곳은 `resolveSeqMode` 하나뿐이다. 미정이면 null 이고 그때만 묻는 카드를 띄운다.
        const _mode3 = resolveSeqMode(voyage?.info);
        const _save = async (m3) => {
          try {
            await fbSetVoyageSeqMode(voyageKey, m3, inspector || '');
            // 1.56: 선박별로 기억한다(검수사 확정) — 다음 항차는 안 묻고 이 답을 자동 적용.
            fbSetShipSeqPref(voyage?.info?.vsl, m3, inspector || '').catch(() => {});
            setSeqEdit(false);
          }
          catch (e) { alert('저장 실패: ' + (e?.message || e)); }
        };
        // 문구는 **검수사 표현 그대로** 쓴다. 지어낸 용어를 넣지 않는다.
        const _CH = [
          { m: 'fullSeq', t: '풀 시퀀스 (풀+엠티)', lock: true,
            d: '풀도 엠티도 계획 자리 주인이 그 자리를 지킵니다 — 남의 자리에 넣으면 한 번 더 묻습니다.',
            cls: 'bg-amber-700 hover:bg-amber-600 text-white' },
          { m: 'fullOnlySeq', t: '풀만 시퀀스 (엠티는 액츄얼)', lock: true,
            d: '풀만 자리를 지킵니다. 엠티 자리는 안 묻고 바로 내줍니다.',
            cls: 'bg-amber-800 hover:bg-amber-700 text-white' },
          { m: 'allActual', t: '풀 액츄얼 (풀+엠티)', lock: false,
            d: '풀도 엠티도 계획은 예약일 뿐 — 안 묻고 바로 내주고, 자리를 내준 컨은 몸만 창고로 갑니다.',
            cls: 'bg-ink-750 hover:bg-ink-700 text-dim-100' },
        ];
        const _cur = _CH.find(x => x.m === _mode3) || null;
        // 1.56: 옛 2갈래 답(seqFull)만 있는 항차는 **한 번 재확인**한다 — 두 갈래엔 「풀 시퀀스」가 없어
        //   답이 자동 매핑으로 조용히 굳었다(독립 재검증 P1-7). 확인 전에도 방어는 종전 답대로 동작한다.
        const _legacyOnly = !voyage?.info?.seqMode && voyage?.info?.seqFull !== undefined && voyage?.info?.seqFull !== null;
        const _chipCls = { fullSeq: 'text-rose-300', fullOnlySeq: 'text-amber-300', allActual: 'text-dim-100' };
        if (_cur && !seqEdit && !_legacyOnly) {
          return (
            <button onClick={() => setSeqEdit(true)}
              className="mb-3 px-2 py-1 rounded border border-line bg-ink-900 text-xxs text-dim-200 flex items-center gap-1.5">
              <span className={`font-black ${_chipCls[_cur.m] || 'text-dim-100'}`}>
                {_cur.lock ? '🔒' : '↔'} {_cur.t}
              </span>
              <span className="text-dim-400">— 눌러서 바꾸기</span>
            </button>
          );
        }
        return (
          <div className="mb-3 bg-amber-950/40 border-2 border-amber-700/60 rounded-pill p-3">
            <div className="text-sm2 font-black text-amber-200">풀 컨테이너 시퀀스 작업입니까?</div>
            {(!voyage?.info?.seqMode && voyage?.info?.seqFull !== undefined && voyage?.info?.seqFull !== null) && (
              <div className="text-xxs text-amber-100 bg-amber-900/40 rounded px-2 py-1 mt-1">
                종전 답(예/아니오)이 있습니다 — 세 갈래로 한 번만 확정해 주세요. 확정 전에도 방어는 종전 답({resolveSeqMode(voyage?.info) === 'fullOnlySeq' ? '풀만 시퀀스' : '풀 액츄얼'})대로 동작합니다.
              </div>
            )}
            <div className="text-xxs text-amber-300/80 mt-0.5 leading-snug">
              시퀀스면 계획 자리 주인이 그 자리를 지킵니다 — 다른 컨을 넣을 때 한 번 더 묻습니다.
              <br/>액츄얼이면 계획은 예약일 뿐이라 바로 내주고, 자리를 내준 컨은 몸만 창고로 갑니다.
              <br/>풀과 엠티가 다를 수 있으니 셋 중에서 고르세요.
            </div>
            {shipSeqPref && !_mode3 && (
              <div className="text-xxs text-dim-200 mt-1">
                이 배의 지난 답: <b className="text-amber-200">{_CH.find(x => x.m === shipSeqPref)?.t || shipSeqPref}</b> — 이번 항차도 같으면 그걸 누르세요. 상황이 다르면 다르게 고르면 됩니다.
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 mt-2.5">
              {_CH.map(ch => (
                <button key={ch.m} onClick={() => _save(ch.m)}
                  className={`py-2.5 px-3 rounded text-left ${ch.cls} ${ch.m === (_mode3 || shipSeqPref) ? 'ring-2 ring-amber-300' : ''}`}>
                  <div className="font-bold text-sm">{ch.lock ? '🔒' : '↔'} {ch.t}</div>
                  <div className="text-xxs opacity-80 mt-0.5 leading-snug">{ch.d}</div>
                </button>
              ))}
            </div>
            {seqEdit && (
              <button onClick={() => setSeqEdit(false)}
                className="w-full mt-1.5 text-xxs text-dim-300 py-1">그대로 두기</button>
            )}
          </div>
        );
      })()}

      {/* V9.15: 진단 경고는 탭 바 위(눈에 띄어야 하는 경고) — PORT-MIS 카드는 탭 본문 아래로 내림(전면 점검 2-1) */}
      {/* M3.5.4: 자동 진단 경고 패널 */}
      {diagAlerts.length > 0 && (
        <div className="mb-3">
          <DiagnosticsPanel
            alerts={diagAlerts}
            autoSpeak={diagAutoSpeak}
            onToggleSpeak={() => setDiagAutoSpeak(v => !v)}
            onDismiss={() => setDiagDismissed(true)}
            onOpenContainer={(cn) => {
              const c = (containers || []).find(x => x.cn === cn);
              if (c) setDetailC(c);
            }}
          />
        </div>
      )}


      {/* 탭 네비게이션 — M5.0: 명칭 산뜻하게 정리 */}
      <nav className="bg-ink-900 border border-line rounded-pill flex mb-3 overflow-x-auto sticky top-[52px] z-20 shadow-lg shadow-slate-950/60">
        {/* ★ 1.84 (검수사 확정 2026-08-19, UI 1차 판2): 탭 «표시»만 정리 — tab state·점프 경로는 불변.
            ① 「🎤 자연어」 → 「▶ 작업 시작」 — *"자연어는 이름이 검수용어가 아닙니다. 작업시작 모드가 되어야겠죠."*
            ② 통계·결과·업로드는 요약·필터 칩과 겹쳐(*"중복 되는거 같습니다"*) 「더보기 ⋯」 한 버튼으로 접었다.
              누르면 그 자리에서 셋 중 고른다. jumpTo(tab:'report' 등 8곳)는 setTab 그대로라 전부 살아 있다. */}
        {[
          { k: 'list', t: mode === 'discharge' ? '양하' : '선적', i: ListChecks },
          { k: 'search', t: '▶ 작업 시작', i: SearchIcon },
          ...(isLoloShip
            ? [{ k: 'lolo', t: 'LOLO', i: ListChecks }]
            : [{ k: 'bay', t: '베이', i: MapPin }]),
        ].map(({ k, t, i: Icon }) => (
          <button key={k} onClick={() => { setTab(k); setMoreTabs(false); }}
            className={`flex-1 px-2 py-2.5 text-xs2 font-bold flex items-center justify-center gap-1 border-b-2 whitespace-nowrap ${
              tab === k ? 'border-amber-400 text-amber-300 bg-ink-800/30' : 'border-transparent text-dim-300'
            }`}>
            <Icon className="w-3.5 h-3.5"/>{t}
          </button>
        ))}
        <button onClick={() => setMoreTabs(v => !v)}
          className={`flex-none px-3 py-2.5 text-xs2 font-bold border-b-2 whitespace-nowrap ${
            ['stats', 'report', 'data', 'xray'].includes(tab) ? 'border-amber-400 text-amber-300 bg-ink-800/30' : 'border-transparent text-dim-400'
          }`} title="통계 · 결과 · 업로드 · X-RAY">
          {['stats', 'report', 'data', 'xray'].includes(tab) ? ({ stats: '통계', report: '결과', data: '업로드', xray: 'X-RAY' })[tab] : '⋯'}
        </button>
      </nav>
      {moreTabs && (
        <div className="flex gap-1.5 mb-3 -mt-1.5">
          {/* 2.26: X-RAY 는 양하에서만 — 세관 검사 대상은 내리는 화물이다 */}
          {[['stats', '📊 통계'], ['report', '📋 결과'], ['data', '📤 업로드'],
            ...(mode === 'discharge' ? [['xray', '🔍 X-RAY']] : [])].map(([k, t]) => (
            <button key={k} onClick={() => { setTab(k); setMoreTabs(false); }}
              className={`flex-1 py-2 rounded-pill text-xs2 font-bold ${tab === k ? 'bg-ink-750 text-amber-300' : 'bg-ink-900 border border-line text-dim-200'}`}>{t}</button>
          ))}
        </div>
      )}

      {/* TallyOne 1.8: 리퍼가 있으면 언제든 온도 확인 화면을 다시 연다.
          미확인이 남아 있으면 숫자를 붉게 띄워 '아직 안 봤다'를 숨기지 않는다. */}
      {/* ⚠ 모달은 이 버튼 바로 옆(VoyagePage 트리 안)에 둔다. 1.8 첫 배포에서 파일 아래쪽
          DataTab(업로드 탭) 안에 넣는 바람에 상태는 켜지는데 그릴 곳이 없어 아무 일도 안 났다. */}
      {showReefer && (
        <ReeferMemoModal containers={containers} voyageKey={voyageKey} mode={mode} inspector={inspector}
          onClose={() => setShowReefer(false)}/>
      )}

      {/* ★ 2.87 플랜 오버레이 (검수사 지시 2026-08-29) —
           «사용자가 원하지 않았는데 위치이동이 됩니다. 홈화면에서 물었으면 홈화면에서 보여주고
             닫아도 홈화면이어야 합니다»
         있던 화면은 **그대로 뒤에 남는다.** 이것만 덮었다가 닫으면 있던 자리다.
         ⚠ 리퍼 모달(z-50)보다 위에 둔다 — 플랜을 가리는 팝업이 다시 생기지 않게. */}
      {_planOverlay}
      {/* TallyOne 1.15: **리퍼 온도 확인 배너 삭제** (검수사 신고 2026-08-06 — "중복 건입니다").
          바로 아래 현황 요약 줄에 이미 「리퍼 N대」 칩이 있고, 확인 유무까지 거기로 합쳤다.
          다시 열기는 요약 줄의 「리퍼 확인」 칩을 누르면 된다 — 진입점은 유지된다.
          자동으로 뜨는 동작(선박 선택 시 미확인이 있으면 모달)은 그대로다. */}

      {/* M8.08: 양하/선적 작업 화면의 엠티 실 정책 배너·보고서 블록 제거.
          사용자 요구: 작업 화면엔 상단 요약만, 실번호 수정은 개별 카드, 보고서는 수석 대시보드.
          (EmptySealReportButton·SealPolicyBanner는 ChiefDashboard에 이미 구현됨.) */}

      {/* 탭 본문 */}
      {/* ── TallyOne 1.42: 예보 카드 — 이 모드의 EDI 가 아직 없을 때만 (검수사 확정 2026-08-10) ──
          검수사 원문: *"말 그대로 예보입니다. 선적 갯수를 리스트 형식에 맞춰 보여 줘야하고 덱 그림도 보여 줘야 합니다."*
          ⚠ 배치가 아니다 — *"덱에 넣으라는 이야기가 아니고요"*. 개수와 그림을 **보여주기만** 한다.
          리스트가 들어오면 이 카드는 사라지고 실자료가 그 자리를 대신한다. */}
      {/* ★ 2.66-01 (검수사 확정): 캔슬이면 **이 쪽 화면은 이것 하나만** 남는다.
          원문 — *«다 지우고 이번항차 전량 캔슬이 표기 되어야 합니다»* ·
          이유 — *«다른선박에 실릴때 컨번호 중복이 일어납니다»* (그래서 통합검색 풀에서도 뺀다). */}
      {_sideCanc && (
        <div className="mx-3 lg:mx-0 rounded-card border border-st-bad/50 bg-st-bad/10 px-4 py-6 text-center">
          <div className="text-2xl font-black text-st-badHi">⛔ 이번 항차 {mode === 'discharge' ? '양하' : '선적'} 전량 캔슬</div>
          {/* 2.87-05: 문구 오기 — 양하인데 «실을 화물» 이라고 적혀 있었다. 양하는 **내리는** 일이다. */}
          <div className="text-sm2 text-dim-200 mt-2">배정목록 {mode === 'discharge' ? '양하' : '선적'} <b>0대</b> — 이 배에서 {mode === 'discharge' ? '내릴' : '실을'} 화물이 없습니다.</div>
          <div className="text-xs2 text-dim-400 mt-3 leading-relaxed">
            받아 둔 리스트·EDI 는 <b>세지도 보여주지도 않습니다</b> — 그 컨테이너들은 다른 배에 실리므로<br/>
            여기 남겨 두면 컨번호 조회에 두 배가 걸립니다.<br/>
            <span className="text-dim-500">자료는 지우지 않았습니다. 배정목록이 다시 수량을 올리면 자동으로 풀립니다.</span>
          </div>
        </div>
      )}
      {!_sideCanc && tab === 'list' && <ForecastCard voyage={voyage} mode={mode} />}
      {!_sideCanc && tab === 'list' && mode === 'loading' && esealInfo && (
        <EsealRangeCard voyageKey={voyageKey} info={esealInfo} inspector={inspector} />
      )}
      {!_sideCanc && tab === 'list' && (
        <ListTab
          onOpenPlan={_mirOpenPlan}
          vsl={voyage?.info?.vsl || ''} pier={voyage?.info?.pier || ''}
          voyageKey={voyageKey} mode={mode}
          containers={containers} ediMap={ediMap} recMap={recMap}
          xrayMap={xrayMap} xraySeals={xraySeals} compMap={compMap}
          inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
          externalFilter={listFilter}
          shiftingList={shiftingList} shiftInfo={shiftInfo}
          briefCtx={briefCtx}
          onAsk={(q) => { setRelayQ(q); setTab('search'); }}
          detailPanel={!isWide ? null : (detailPanelHere ? renderDetail('panel') : (
            /* 2.18 — 아무것도 안 골랐을 때 **칼럼을 비워 두지 않는다.**
               검수사 «어쩔수 없이 여백이 남으면 관련그림이나 부가 설명을 넣고».
               칼럼 자체는 늘 있어야 한다 — 고를 때마다 목록 폭이 출렁이면 그게 더 불편하다. */
            <div className="card-v2 bg-ink-900 p-5 text-center">
              <PackageIcon className="ico-l mx-auto text-dim-500 mb-2.5"/>
              <div className="text-sm2 font-bold text-dim-200 mb-1.5">컨테이너를 고르면 여기 열립니다</div>
              <div className="text-xs2 text-dim-300 leading-relaxed">
                선내 위치 · 실번호 · 규격 · 무게 · 리퍼 온도를 보고<br/>그 자리에서 고칠 수 있습니다.
              </div>
              <div className="text-xxs text-dim-500 mt-3 pt-3 border-t border-line">
                목록을 훑는 동안 <b className="text-dim-200">닫히지 않고 붙어 있습니다</b>
              </div>
            </div>
          ))}
        />
      )}
      {!_sideCanc && tab === 'search' && (
        // TallyOne 1.3: 조회(lookup)·자연어(nls) 기록 — 검색 실행부는 별도 파일
        //   (components/SearchPanel.jsx)이라 이번 판 수정 범위 밖. prop 계약을 건드리지 않고
        //   input 이벤트를 캡처해 질의를 기록한다. 숫자만이면 끝4 조회, 그 외는 자연어.
        //   textarea(인계 메모)는 제외. 확정 판정(타이핑 멈춤 1.2초)·중복 생략은 activityLog 담당.
        //   한계 — 음성 입력은 state로 직접 들어와 input 이벤트가 없어 기록되지 않는다
        //   (SearchPanel의 setQuery 지점에 1줄 보강 필요 — 다음 판).
        <div onInputCapture={(e) => {
          const t = e.target;
          if (!t || t.tagName !== 'INPUT') return;
          const v = String(t.value || '').trim();
          if (/^[0-9\s]+$/.test(v)) logQuerySettled('lookup', v, { voyageKey, mode });
          else logQuerySettled('nls', v, { voyageKey });
        }}>
        {/* 2.36 (검수사 확정 «누구는 안다고 하고 누구는 모른다고 하면 안되니까요. 지금 통합해주세요»):
            항차 화면에도 홈과 **같은 미르**를 심는다. 배 이름을 안 붙여도 ctxVoyageKey 로 이 배가 맥락이 된다.
            ⚠ 아래 SearchPanel 은 그대로 둔다 — 컨 조회·자동 가이드·트윈 짝꿍·완료 처리는 그쪽이 정본이다.
            즉 «묻는 것»은 미르가, «작업하는 것»은 SearchPanel 이 맡는다. */}
        <div className="mb-2">
          <GlobalSearchPage embedded
            voyages={voyages || { [voyageKey]: voyage }}
            ctxVoyageKey={voyageKey}
            portMisData={portMisData}
            terminalWork={terminalWork}
            heartbeat={heartbeat}
            isChief={isChief(inspector)}
            onOpenContainer={(c) => setDetailC(c)}/>
        </div>
        <SearchPanel
          rfSkip={!!shipPolicy?.rfSkip}
          esealBrief={esealInfo ? {
            n: esealInfo.targets.length, byBay: esealInfo.byBay, ranges: esealInfo.ranges,
            poolN: esealInfo.pool.length, usedN: esealInfo.usedPairs.length, remainN: esealInfo.remain.length,
          } : null}
          relayQuery={relayQ}
          voyage={voyage}
          voyageKey={voyageKey}
          inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
          shipLib={shipLib}
          portMisData={portMisData}
          pilotForecast={pilotForecast}
          terminalWork={terminalWork}
          isLoloShip={isLoloShip}
          diagAlerts={diagAlerts}
          mode={mode}
          onWorkFilterChange={(m) => setMode(m)}
          /* ★ 2.85 — 미르가 «베이플랜/카고플랜 보여줘» 하면 **여기서 연다.**
               해석은 SearchPanel 이, 여는 것은 탭·인쇄 상태를 쥔 이 자리가 한다.
             검수사 — «양하자리에 있으면 양하 것, 선적자리에서 말하면 선적 것» — 지금 탭 것을 열면 된다.
             ⚠ 카고플랜은 베이 탭 안(BayPlan)의 인쇄 메뉴에 있다. 그래서 탭을 먼저 열고 신호를 남긴다. */
          onOpenPlan={_mirOpenPlan}
          onPlaceUnassigned={(c) => {
            // V9.28: 미배정 = 빈자리가 있다는 뜻 — 검수원이 베이 탭 빈 칸에 직접 배치 (사용자 확정:
            //   "앱이 빈자리를 보여주고 거기에 맞는 컨을 넣어야 한다. 수석 편집은 오입력 교정용")
            setPendingMove({ cn: c.cn, fromBay: '', fromRow: '', fromTier: '', fe: c.fe || '', iso: c.iso || c.tp || '' });
            setTab('bay');
          }}
        />
        </div>
      )}
      {!_sideCanc && tab === 'lolo' && (
        <>
        <DeckPlanView
          plan={voyage?.[mode]?.stowagePlan}
          containers={containers} compMap={compMap} xrayMap={xrayMap}
          voyageKey={voyageKey} mode={mode} inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
        />
        <LoloTab
          onOpenPlan={_mirOpenPlan}
          vsl={voyage?.info?.vsl || ''} pier={voyage?.info?.pier || ''}
          briefCtx={briefCtx}
          onAsk={(q) => { setRelayQ(q); setTab('search'); }}
          voyageKey={voyageKey} mode={mode}
          containers={containers} compMap={compMap}
          xrayMap={xrayMap} xraySeals={xraySeals}
          inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
        />
        </>
      )}
      {!_sideCanc && tab === 'bay' && (() => {
        // M4.9e 3단계: 자리 뺏긴 컨테이너 검출 (사용자 요청)
        //   컨 X가 actual 위치(11/11/11)로 이동 → 거기 원래 계획된 컨 Y는 자리 뺏김
        //   Y는 actual 없고, Y의 계획 위치를 다른 컨이 actual로 점유
        const displaced = (() => {
          if (mode !== 'loading') return [];
          // 1) 그 칸을 실제로 차지한 컨 맵.
          //   TallyOne 1.55: **실렸는지는 `completed` 로만 판단한다.**
          //   1.55 부터 `_updatePositionFields` 가 선적확인 전에도 `bay_actual` 을 쓰므로
          //   "실체가 있으면 실린 것"이라는 옛 암묵 규칙이 깨졌다. 실체 유무로 세면
          //   아직 안 실은 컨이 남의 자리를 뺏은 것으로 잡힌다.
          const occupiedBy = new Map();
          allEdiContainers.forEach(c => {
            if (!compMap[c.cn]) return;                   // 실린 것만 칸을 차지한다
            const p = effectivePos(c);
            if (!p.bay || !p.row || !p.tier) return;      // 창고(`__`)·미배정은 자리가 아니다
            occupiedBy.set(`${p.bay}-${p.row}-${p.tier}`, c.cn);
          });
          // 2) 자기 계획 위치를 다른 컨이 점유했는데 자기는 actual 없음
          return allEdiContainers.filter(c => {
            if (compMap[c.cn]) return false;        // 이미 실린 컨은 이름표를 잃은 것이 아니다
            // _bay_planned가 있으면 그것이 진짜 계획 (effective 변환된 경우)
            // 없으면 c.bay (원본 그대로)
            const planBay = c._bay_planned || c.bay;
            const planRow = c._row_planned || c.row;
            const planTier = c._tier_planned || c.tier;
            if (!planBay || !planRow || !planTier) return false;
            const key = `${planBay}-${planRow}-${planTier}`;
            const occupier = occupiedBy.get(key);
            if (!occupier || occupier === c.cn) return false;
            // 점유자 컨번호 부착 (UI 표시용)
            c._displacedBy = occupier;
            return true;
          });
        })();

        // M5.1 I: STG 보관 컨 검출 (선적 전용)
        const storedContainers = mode === 'loading'
          ? allEdiContainers.filter(c => c._in_storage)
          : [];

        return (
          <div className="space-y-2">
            {/* V9.57: BayDictStatusWidget 제거 — bayNum 결함으로 오표시, 기능은 자료 탭 BayDictVerifyWidget으로 이관(팀I) */}
            {/* 선적 모드 + 자리 뺏긴 컨 있을 때만 표시 */}
            {mode === 'loading' && displaced.length > 0 && (
              <DisplacedSidebar
                displaced={displaced}
                onOpenContainer={(c) => setDetailC(c)}
                onStartMove={(c) => {
                  // M4.9f 5단계: 이동 모드 진입 (토글)
                  if (pendingMove?.cn === c.cn) { setPendingMove(null); return; }
                  setPendingMove({
                    cn: c.cn,
                    fromBay: c._bay_planned || c.bay || '',
                    fromRow: c._row_planned || c.row || '',
                    fromTier: c._tier_planned || c.tier || '',
                    fe: c.fe || '', iso: c.iso || c.tp || '',
                  });
                }}
                pendingMoveCn={pendingMove?.cn}
              />
            )}
            {/* M5.1 I: 보관함 박스 (선적 전용)
                TallyOne 1.54: 여기 들어오는 컨은 **계획이 살아 있는** 컨이다 —
                StorageBox 가 `_bay_planned` 를 읽어 「이름 걸린 자리」를 같이 보여준다. */}
            {mode === 'loading' && storedContainers.length > 0 && (
              <StorageBox
                stored={storedContainers}
                onOpenContainer={(c) => setDetailC(c)}
                onStartMove={(c) => {
                  if (pendingMove?.cn === c.cn) { setPendingMove(null); return; }
                  // 보관함에서 이동: 본위치는 계획 위치 사용 (짝/홀 매칭용)
                  setPendingMove({
                    cn: c.cn,
                    fromBay: c._bay_planned || '',
                    fromRow: c._row_planned || '',
                    fromTier: c._tier_planned || '',
                    fe: c.fe || '', iso: c.iso || c.tp || '',
                  });
                }}
                pendingMoveCn={pendingMove?.cn}
                onBatchRestore={async () => {
                  if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
                  if (!confirm(`보관함의 ${storedContainers.length}대를 모두 계획 위치로 복원하시겠습니까?`)) return;
                  try {
                    await fbBatchClearActual(voyageKey, mode, storedContainers.map(c => c.cn));
                  } catch (e) {
                    alert('복원 실패: ' + (e?.message || e));
                  }
                }}
              />
            )}
            <BayPlan
              containers={allEdiContainers} compMap={compMap} xrayMap={xrayMap} restowMap={shiftingMap} mode={mode}
              preGoneInfo={preGoneInfo}
              onOpenContainer={(c) => setDetailC(c)}
              shipImo={voyage?.info?.imo}
              shipName={voyage?.info?.vsl}
              voyageInfo={voyage?.info}
              voyageKey={voyageKey}
              pendingMove={pendingMove}
              onCancelMove={() => setPendingMove(null)}
              onCommitMove={async (bay, row, tier) => {
                // M4.9f 5단계: 빈 셀 클릭 시 그 자리로 이동
                if (!pendingMove) return;
                if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
                // V9.28: 물리 불가 가드 — 이 경로도 좌표 기록처다 (V9.27와 동일 원칙)
                const _pe = bayParityError({ iso: pendingMove.iso }, bay);
                if (_pe) { alert('⛔ ' + _pe); return; }
                // V9.28-04: 인접 슬롯 검사 — 40ft는 양옆 홀수 슬롯이 비어야 한다
                const _ae = slotAdjacencyError({ cn: pendingMove.cn, iso: pendingMove.iso }, bay, row, tier, allEdiContainers);
                if (_ae) { alert('⛔ ' + _ae); return; }
                // V9.28-05: POD 구역 경고 — 오선적 맞바꿈의 세 번째 그물 (경고 후 허용)
                const _pm = allEdiContainers.find(x => x.cn === pendingMove.cn);
                const _pz = podZoneMismatch({ cn: pendingMove.cn, pod: _pm?.pod }, bay, tier, allEdiContainers);
                if (_pz) { alert(`⛔ 이 구역은 ${_pz.zone} 화물 자리입니다 (주변 ${_pz.count}대). ${pendingMove.cn}의 포트는 ${_pz.pod}.\n계획에 없는 포트 섞임은 실을 수 없습니다 — 현장에서 막고 제 구역 빈자리로 보내세요.\n불가피한 변경은 수석검수사가 베이상세편집 또는 EDI 수정으로 처리합니다.`); return; }
                try {
                  await fbSetActualPosition(voyageKey, mode, pendingMove.cn,
                    String(bay).padStart(2,'0'),
                    String(row).padStart(2,'0'),
                    String(tier).padStart(2,'0'),
                    inspector);
                  setPendingMove(null);
                } catch (e) {
                  console.error(e);
                  alert('이동 저장 실패: ' + (e?.message || e));
                }
              }}
              // M5.1 I: 영역 선택 → 일괄 보관 (선적 전용)
              enableSelection={mode === 'loading'}
              onBatchToStorage={async (cns) => {
                if (!cns || cns.length === 0) return;
                if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
                if (!confirm(`선택된 ${cns.length}대를 보관함으로 보내시겠습니까?\n(언제든 보관함에서 [이동] 버튼으로 다시 배치 가능)`)) return;
                try {
                  await fbBatchMoveToStorage(voyageKey, mode, cns, inspector);
                } catch (e) {
                  console.error(e);
                  alert('보관 실패: ' + (e?.message || e));
                }
              }}
            />
          </div>
        );
      })()}
      {!_sideCanc && tab === 'stats' && (
        <div className="space-y-3">
          {/* V9.15: BayDictVerifyWidget(자료 진단)은 업로드 탭으로 — 통계 탭 첫 화면은 통계여야 한다(전면 점검 2-5) */}
          <StatsTab containers={containers} compMap={compMap} xrayMap={xrayMap} mode={mode}/>
        </div>
      )}
      {!_sideCanc && tab === 'xray' && (
        <XrayTab voyage={voyage} voyageKey={voyageKey} mode={mode} containers={containers}
                 inspector={inspector}
                 xrayMap={xrayMap} xraySeals={xraySeals} compMap={compMap} portMisData={portMisData}/>
      )}
      {!_sideCanc && tab === 'report' && (
        <div className="space-y-3">
          {/* V9.19-01: 마감 텔리 카드는 수석 대시보드로 이동 — 검수원이 보면 안 되는 서류(사용자 확정 2026-07-28) */}
          <ReportTab
            voyageKey={voyageKey} mode={mode} voyageInfo={voyage.info}
            containers={containers} compMap={compMap} xrayMap={xrayMap} xraySeals={xraySeals}
          />
          {/* V9.16: 이 항차 작업 보고 이력 — 구독 함수는 있었는데 호출 0회였다(전면 점검 §1-7).
              검수원이 자기가 보낸 시작·중단·해치·콘박스 보고를 여기서 확인한다. */}
          <WorkReportHistory voyageKey={voyageKey}/>
        </div>
      )}
      {!_sideCanc && tab === 'data' && (
        <div className="space-y-3">
          {/* V9.15: 자료 진단은 자료 화면에 — 통계 탭에서 이사 */}
          <BayDictVerifyWidget
            shipInfo={voyage?.info ? { imo: voyage.info.imo, name: voyage.info.vsl } : null}
            ediContainers={Object.values(ediMap)}
          />
          <DataTab voyageKey={voyageKey} mode={mode} voyage={voyage} setMode={setMode} inspector={inspector} />
        </div>
      )}

      {/* 컨테이너 상세 모달 */}
      {detailC && !detailPanelHere && renderDetail('modal')}

      {/* M3.5.5: 새 선박 정책 등록 모달 */}
      <ShipPolicyModal
        open={showPolicyModal}
        vsl={voyage?.info?.vsl || ''}
        code={voyage?.info?.imo || ''}
        inspector={inspector}
        onSaved={() => { /* Firebase 구독으로 자동 반영 */ }}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* M3.5.6: 작업 보고 모달 (양하/선적/해치/콘박스 + 카톡 공유) */}
      <WorkReportModal
        open={showWorkReport}
        voyageKey={voyageKey}
        voyage={voyage}
        lastEquip={getEquipNumber()}
        onClose={() => setShowWorkReport(false)}
      />

      {/* V9.18: 선박 소개 · 이름 유래 — 하단 정보 구역 */}
      <ShipIntroCard info={voyage?.info} inspector={inspector} portMisData={portMisData}/>

      {/* V9.37-01: ⚡ 지금 처리 버튼은 **홈 카드로 이동**(사용자 지시 2026-08-01) — 여기 중복 제거. */}
      {/* V9.15: PORT-MIS 카드 — 탭을 눌러도 이 카드 때문에 내용이 안 보이던 문제로 본문 아래 이동 */}
      {/* M5.21: PORT-MIS 입출항 정보 (Chrome 확장이 자동 수집한 데이터) */}
      {/* M5.23: 매칭 로직 강화 — 콜사인 prefix + IMO 매칭 fallback 추가 */}
      {/* M5.87: voyage.info의 callsign + vslFull 우선 사용 (베이사전 의존도 제거, EDI 자동 추출) */}
      {(() => {
        const vsl = (voyage?.info?.vsl || '').toUpperCase();
        const vslFull = (voyage?.info?.vslFull || '').toUpperCase();  // M5.87: EDI에서 자동 추출된 풀네임
        const dictData = (() => {
          try { return getShipBayDictData(voyage?.info?.imo, voyage?.info?.vsl, { vslFull: voyage?.info?.vslFull || '' }); }
          catch { return null; }
        })();
        // M5.87: voyage.info.callsign 우선 (EDI 자동 추출), 없으면 베이사전
        // ★ 2.23 (검수사 «이 문제도 해결한 거 같은데 또 나오고») — **껍데기 항목에서도 신원을 읽는다.**
        //   `getShipBayDictData` 는 «베이 구조»를 주는 함수라 구조 없는 항목을 일부러 버린다.
        //   RZOR(RIZHAO ORIENT)는 LOLO 라 베이 매트릭스가 애초에 없다 — 사전에 콜사인 HOAG 가
        //   멀쩡히 있는데도 조회가 언제나 null 이라 이 카드가 매번 «콜사인: 없음» 을 띄웠다.
        //   PORT-MIS 에는 그 배가 키 HOAG 로 들어와 있었다 — **콜사인만 있으면 붙는 자리였다.**
        const identData = (() => {
          try { return getShipIdentity(voyage?.info?.imo, voyage?.info?.vsl); } catch { return null; }
        })();
        const dictCallsign = voyage?.info?.callsign || dictData?.callsign || dictData?.bayDef?.callsign || identData?.callsign || '';
        const dictImo = dictData?.imo || voyage?.info?.imo || identData?.imo || '';
        //  ★★ 2.78 (검수사 지시 2026-08-28) — **PORT-MIS 는 베이매트릭스 신원으로 부른다.**
        //    *«포트미스 호출 자료를 베이메트릭스 자료로 호출 바랍니다. 자꾸 틀리게 호출하니
        //      포트미스에 등록이 안되었다고 합니다»* · *«약자로 포트미스 조회하는 오류는 없었으면
        //      합니다. 선박 풀네임으로 조회하세요»*
        //
        //    여기 있던 **6단계 손매칭 130줄**을 걷어내고 공용 매처(`portMisMatch.matchPortMis`)로
        //    바꾼다. 그 130줄이 남긴 병이 셋이었다.
        //      ① 4단계(선명 원문 부분포함)가 **정규화·콜사인배제·신선도 없이** 5단계보다 먼저 돌아
        //         2.5-02 가 5단계에 채운 가드를 무력화했다.
        //      ② `_nameMatchesPm` 이 **앞 5자 슬라이스**라 SAWASDEE 시리즈가 «SAWAS» 로 뭉갰다
        //         (2.5-02 가 고친 그 병이 이 가드에 그대로 남아 있었다).
        //      ③ 콜사인 배제에 `dictData.callsign` 만 써서, 애써 만든 `dictCallsign` 폴백을 안 봤다.
        //    ⇒ 같은 규칙이 여덟 벌이던 것을 한 벌로 모은다(XrayTab·HomePage·ChiefDashboard·
        //      ShipIntroCard·출항임박·질문기까지 전부 같은 함수를 부른다).
        //    ⚠ 아래 평택 우선/폴백(M5.90)과 표시 문구는 **그대로 둔다** — 이번 판은 «찾는 법» 만 바꾼다.
        let matchedBy = '';
        let matchedKey = '';
        let pm = matchPortMis(portMisData, { ...(voyage?.info || {}),
          //  베이매트릭스 신원을 매처에 그대로 넘긴다(매처도 스스로 찾지만, 화면이 이미 푼 값이 있으면 그것이 빠르다).
          callsign: dictCallsign || voyage?.info?.callsign || '',
          vslFull: voyage?.info?.vslFull || dictData?.name || '' });
        if (pm) {
          matchedKey = Object.keys(portMisData || {}).find((k) => portMisData[k] === pm) || '';
          matchedBy = 'dict-identity';
        }
        // M5.90: 매칭 결과를 후처리 — 평택 우선, 평택 없으면 인천 fallback 표시
        //   - 같은 선박이 평택 + 인천 둘 다 있으면 평택 데이터 사용
        //   - 평택만 없으면 인천 데이터 사용하되 "인천 출항 정보" 명시
        let fallbackInfo = null;  // { fromPort, etd } 평택 외 항만의 출항 정보
        if (pm) {
          const isPyeongtaek = (p) => {
            const port = (p?.port || '').toUpperCase().trim();
            return !port || port === '평택' || port === '평택항' || port === 'PYEONGTAEK';
          };
          // 매칭 결과가 평택이 아니면 같은 선박의 평택 데이터 검색
          if (!isPyeongtaek(pm)) {
            const matchedCs = (pm.callsign || '').toUpperCase();
            const matchedName = String(pm.vesselName || '').toUpperCase().replace(/\s+/g, '');
            const pyeongtaekEntry = Object.entries(portMisData).find(([k, p]) => {
              if (!p || k === matchedKey) return false;
              if (!isPyeongtaek(p)) return false;
              const pcs = (p.callsign || '').toUpperCase();
              const pn = String(p.vesselName || '').toUpperCase().replace(/\s+/g, '');
              // 콜사인 매칭
              if (pcs && matchedCs) {
                if (pcs === matchedCs) return true;
                if (pcs.length >= 4 && matchedCs.length >= 4 &&
                    (pcs.startsWith(matchedCs) || matchedCs.startsWith(pcs))) return true;
              }
              // 선박명 매칭
              if (pn && matchedName && pn.length >= 5 && matchedName.length >= 5 &&
                  (pn.includes(matchedName.slice(0, 5)) || matchedName.includes(pn.slice(0, 5)))) {
                return true;
              }
              return false;
            });
            if (pyeongtaekEntry) {
              // 평택 데이터 발견 → 그것을 메인으로 사용
              fallbackInfo = { fromPort: pm.port, etd: pm.etd, eta: pm.eta };
              pm = pyeongtaekEntry[1];
              matchedKey = pyeongtaekEntry[0];
              matchedBy += '+pyeongtaek-pref';
            } else {
              // 평택 데이터 없음 → 인천 등 외부 항만 정보 사용
              fallbackInfo = { fromPort: pm.port, etd: pm.etd, eta: pm.eta, isFallback: true };
            }
          }
        }

        //  ★ 2.63-03 (검수사 지시 «포트미스에 없을시 베이메트릭스에 자료와 도선사이트를 매칭해서 올려 노면
        //    됩니다»): 도선 예보 매칭 한 벌 — 코드 키 직접, 없으면 **사전 콜사인**으로 도선사이트 항목을 찾는다.
        const _pfMatch = (() => {
          try {
            //  2.63-03 보강 (검수사 «현실성 없는 정보를 올리는건 안되는것입니다»): 지나간 도선 시각은
            //  현실이 아니다 — 미래(±12h 유예)인 예보만 올린다. 둘 다 낡았으면 카드를 안 올린다.
            const _fresh = (p) => {
              if (!p) return null;
              const _t = (v) => { const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
              const lim = Date.now() - 12 * 3600000;
              const arrOk = _t(p.nextArr) != null && _t(p.nextArr) >= lim;
              const depOk = _t(p.nextDep) != null && _t(p.nextDep) >= lim;
              if (!arrOk && !depOk) return null;
              return { ...p, nextArr: arrOk ? p.nextArr : '', nextArrBerth: arrOk ? p.nextArrBerth : '', nextDep: depOk ? p.nextDep : '', nextDepBerth: depOk ? p.nextDepBerth : '' };
            };
            const direct = _fresh(pilotForecast[vsl]);
            if (direct) return direct;
            const _cs = String(dictCallsign || voyage?.info?.callsign || '').toUpperCase().trim();
            if (!_cs) return null;
            const byCs = Object.values(pilotForecast || {}).find((p) => p && String(p.callsign || '').toUpperCase().trim() === _cs);
            return _fresh(byCs);
          } catch (e) { return null; }
        })();
        // M5.71 디버그 카드 → 2.78-01: 후보 줄 제거(slice(0,3)은 후보가 아니라 목록 앞 3개였다 — MCSC 실물 보고).
        //   문구도 «매칭 미확인»이 아니라 «신고가 없습니다»로 — 매처(2.78)는 제대로 돌았고 자료가 없는 것이다.
        if (!pm) {
          //  2.63-03: PORT-MIS 미등록이어도 도선 예보가 있으면 그것을 정식 카드로 — SWTD 류(등록 없는 배).
          if (_pfMatch) {
            const fmtPf = (v) => { if (!v) return ''; const [d, t] = String(v).split(' '); return `${(d || '').slice(5)} ${t || ''}`.trim(); };
            return (
              <div className="mb-3 bg-sky-950/50 border border-sky-800/50 rounded-pill px-3 py-2 text-sm">
                <span className="text-sky-300 font-bold text-xs">⚓ 도선 예보 (평택도선사회)</span>
                {_pfMatch.nextArr && <span className="text-dim-100 ml-2">입항 <b className="text-emerald-300">{fmtPf(_pfMatch.nextArr)}</b>{_pfMatch.nextArrBerth ? ` (${_pfMatch.nextArrBerth})` : ''}</span>}
                {_pfMatch.nextDep && <span className="text-dim-100 ml-2">출항 <b className="text-amber-300">{fmtPf(_pfMatch.nextDep)}</b>{_pfMatch.nextDepBerth ? ` (${_pfMatch.nextDepBerth})` : ''}</span>}
                <div className="text-2xs text-dim-400 mt-0.5">평택 PORT-MIS 미등록 — 베이사전 신원(콜사인 {String(dictCallsign || '?')})으로 도선사이트와 매칭 · 확정에 가까움</div>
              </div>
            );
          }
          if (Object.keys(portMisData).length === 0) return null;
          //  2.78-02 (검수사 «왜 아직도 선박명이 약자 MCSC인가요? 그걸로 조회가 되나요?»):
          //    조회는 2.78부터 약자를 안 쓰는데 이 칸의 «선박명»이 4자 코드(vsl)를 보여주고 있었다.
          //    베이매트릭스 풀네임을 보이고 약자는 괄호 참고로만. (사전 이름의 탭·전각공백도 걷는다)
          const _cardNm = String(voyage?.info?.vslFull || dictData?.name || '').replace(/[\t\u3000]/g, ' ').replace(/\s+/g, ' ').trim();
          return (
            <div className="mb-3 bg-orange-950/40 border border-orange-700/50 rounded-pill px-3 py-2 text-xs">
              <span className="text-orange-300 font-bold">평택 PORT-MIS에 이 배 신고가 없습니다</span>
              <span className="text-dim-200 ml-2">선박명: <b>{_cardNm || vsl}</b>{_cardNm ? ` (${vsl})` : ''} · 콜사인: <b>{dictCallsign || '없음'}</b></span>
              <div className="text-dim-400 text-2xs mt-0.5">PORT-MIS 자동 등록(하루 1회)이나 엑셀 업로드가 들어오면 자동으로 다시 매칭됩니다</div>
            </div>
          );
        }
        const fmtDT = (s) => {
          if (!s) return '-';
          const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
          return m ? `${m[2]}/${m[3]} ${m[4]}:${m[5]}` : s;
        };
        // M5.82: PORT-MIS의 berth/pier를 voyage.info에 자동 저장
        //   - voyage.info의 berth/pier가 PORT-MIS와 다르면 갱신 (선박 부두 이동 대응)
        //   - 다른 검수원도 즉시 공유 (Firebase 동기화)
        //   - voucher의 PIER/BERTH 자동 채움 효과
        // M6.13: 잘못된 berth 값 (MBM 등 코드) 검증 + 자동 정리
        // M6.18c: utils.js의 isValidBerth 사용 (블랙리스트 방식)
        //   확장 v1.0.0 또는 옛 PORT-MIS 파서가 "MBM" 같은 시설 코드를 berth로 저장한 경우 정리
        if (pm.berth && voyage?.info) {
          const currentBerth = voyage.info.berth || '';
          const currentPier = voyage.info.pier || '';
          const pmBerthValid = isValidBerth(pm.berth);
          const currentBerthInvalid = currentBerth && !isValidBerth(currentBerth);
          // 케이스 1: pm.berth가 잘못된 형식 (MBM 등) → 갱신 skip
          // 케이스 2: pm.berth가 정상 + currentBerth가 잘못된 형식 → 갱신
          // 케이스 3: 둘 다 정상 + 다른 값 → 갱신
          // 케이스 4: currentBerth가 잘못된 형식 + pm.berth 없음 → Firebase 정리 (berth: null)
          if (pmBerthValid) {
            const needsUpdate = (currentBerth !== pm.berth) ||
                                (pm.pier && currentPier !== pm.pier);
            if (needsUpdate) {
              const patch = {};
              if (currentBerth !== pm.berth) patch.berth = pm.berth;
              if (pm.pier && currentPier !== pm.pier) patch.pier = pm.pier;
              fbUpdateVoyageInfo(voyageKey, patch).catch(e =>
                console.warn('[M6.13] voyage.info berth 자동 저장 실패:', e)
              );
            }
          } else if (currentBerthInvalid) {
            // 옛 잘못된 값 정리 — berth, pier 둘 다 초기화 (사용자가 엑셀 재업로드 시 정상 채워짐)
            fbUpdateVoyageInfo(voyageKey, { berth: '', pier: '' }).catch(e =>
              console.warn('[M6.13] voyage.info berth 자동 정리 실패:', e)
            );
          }
        } else if (voyage?.info?.berth && !isValidBerth(voyage.info.berth)) {
          // pm 없어도 voyage.info.berth가 잘못된 형식이면 정리
          fbUpdateVoyageInfo(voyageKey, { berth: '', pier: '' }).catch(e =>
            console.warn('[M6.13] voyage.info berth 자동 정리 실패:', e)
          );
        }
        // V8.09-11/14: 선박 현재 상태 판정. ETD 지나도 작업 미완료면 '일정 미확정'(입항지연 등).
        //   작업 진행률(현재 모드 기준 완료/전체)을 함께 넘겨 '출항함'을 작업 완료 시에만 판정.
        const _wkTotal = containers.length;
        const _wkDone = containers.filter(c => compMap[c.cn]).length;
        const shipSt = getShipStatus(pm, Date.now(), { done: _wkDone, total: _wkTotal });
        const toneClass = {
          sailing: 'bg-sky-900/50 border-sky-700/50 text-sky-200',
          berthed: 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200',
          departed: 'bg-ink-750/60 border-line-strong/50 text-dim-200',
          unsure: 'bg-amber-900/40 border-amber-600/50 text-amber-200',
          unknown: 'bg-ink-750 border-line-strong text-dim-200',
        }[shipSt.tone] || 'bg-ink-750 text-dim-200';
        return (
          <div className="mb-3 bg-cyan-950/40 border border-cyan-700/50 rounded-pill px-3 py-2 text-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-cyan-300 font-bold">⚓ PORT-MIS</span>
              {/* V8.09-11: 평택 정박중 + 부두 있음 → 부두 배지 */}
              {shipSt.showBerth && pm.pier === 'PCTC' && pm.berth && (
                <span className="bg-blue-900/60 border border-blue-700/50 text-blue-200 px-2 py-0.5 rounded font-bold text-xs">
                  📍 PCTC · {formatBerth(pm.berth)}
                </span>
              )}
              {shipSt.showBerth && pm.pier === 'PNCT' && pm.berth && (
                <span className="bg-purple-900/60 border border-purple-700/50 text-purple-200 px-2 py-0.5 rounded font-bold text-xs">
                  📍 PNCT · {formatBerth(pm.berth)}
                </span>
              )}
              {shipSt.showBerth && !pm.pier && pm.berth && (
                <span className="bg-ink-750 text-dim-200 px-2 py-0.5 rounded text-xs">
                  📍 {formatBerth(pm.berth)}
                </span>
              )}
              {/* 평택 정박중인데 부두 없음 → 옛 데이터 경고 */}
              {shipSt.showBerth && !pm.berth && !fallbackInfo?.isFallback && (
                <span className="bg-red-900/40 border border-red-700/40 text-red-300 px-2 py-0.5 rounded text-xs font-bold">
                  ⚠ 부두 정보 없음 (옛 데이터)
                </span>
              )}
              {/* 평택 정박중이 아니면 상태 라벨 (항해중·출항·타항만) */}
              {!shipSt.showBerth && !fallbackInfo?.isFallback && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${toneClass}`}>
                  {shipSt.label}
                </span>
              )}
              <span className="text-dim-100">
                입항 <span className="font-bold text-emerald-300">{fmtDT(pm.eta)}</span>
              </span>
              <span className="text-dim-400">·</span>
              <span className="text-dim-100">
                출항 <span className="font-bold text-amber-300">{fmtDT(pm.etd)}</span>
              </span>
              {pm.voyageType && <span className="text-dim-300 text-xs">[{pm.voyageType}]</span>}
            </div>
            {/* V9.33: 평택도선사회 도선 예보 (사용자 확정 2026-08-01 — "포트미스는 예보 성격,
                도선사협회는 확정과 비슷"). PORT-MIS 값을 덮지 않고 아래 줄에 확정시각으로 함께 표시. */}
            {(() => {
              const pf = _pfMatch;   // 2.63-03: 코드 키 + 콜사인 폴백 한 벌
              if (!pf || (!pf.nextDep && !pf.nextArr)) return null;
              const fmtPf = (v) => {
                if (!v) return '';
                const [d, t] = String(v).split(' ');
                return `${(d || '').slice(5)} ${t || ''}`.trim();
              };
              return (
                <div className="mt-1 flex items-center gap-2 flex-wrap text-sm bg-sky-950/50 border border-sky-800/50 rounded px-2 py-1">
                  <span className="text-sky-300 font-bold text-xs">⚓ 도선 예보</span>
                  {pf.nextArr && (
                    <span className="text-dim-100">
                      입항 <span className="font-bold text-emerald-300">{fmtPf(pf.nextArr)}</span>
                      {pf.nextArrBerth && <span className="text-dim-300 text-xs ml-1">({pf.nextArrBerth})</span>}
                    </span>
                  )}
                  {pf.nextArr && pf.nextDep && <span className="text-dim-400">·</span>}
                  {pf.nextDep && (
                    <span className="text-dim-100">
                      출항 <span className="font-bold text-amber-300">{fmtPf(pf.nextDep)}</span>
                      {pf.nextDepBerth && <span className="text-dim-300 text-xs ml-1">({pf.nextDepBerth})</span>}
                    </span>
                  )}
                  <span className="text-sky-400/70 text-2xs">평택도선사회 · 확정에 가까움</span>
                </div>
              );
            })()}
            {/* M5.90: 평택 데이터 없음 — 인천/타항만 출항 정보 fallback */}
            {fallbackInfo?.isFallback && (
              <div className="mt-1 bg-amber-950/50 border border-amber-700/50 rounded px-2 py-1 text-xs">
                <span className="text-amber-300 font-bold">⚠ 평택 PORT-MIS 등록 없음</span>
                <span className="text-amber-200 ml-2">
                  → <b>{fallbackInfo.fromPort}</b> 출항 <b>{fmtDT(fallbackInfo.etd)}</b> 정보로 평택 도착 예상 표시
                </span>
              </div>
            )}
            {/* M5.83: 매칭 진단 정보 (작은 글씨로 카드 아래) */}
            <div className="text-2xs text-dim-400 mt-1 font-mono flex gap-3 flex-wrap">
              <span>매칭: <span className="text-cyan-400">{matchedBy}</span></span>
              <span>키: <span className="text-amber-400">{matchedKey || '?'}</span></span>
              <span>선박명: <span className="text-emerald-400">{pm.vesselName || '?'}</span></span>
              <span>저장: <span className="text-purple-400">{pm.updatedAt ? new Date(pm.updatedAt).toLocaleString('ko-KR', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : '?'}</span></span>
              {!pm.berth && !fallbackInfo?.isFallback && (
                <button
                  onClick={async () => {
                    // V7.99-13: 삭제 확인에 선박명 명시. 오매칭(엉뚱한 배)이 잡혔을 때
                    //   키 번호만 보면 무슨 배인지 모르고 멀쩡한 데이터를 지우는 사고가 남.
                    if (!confirm(`PORT-MIS 데이터를 Firebase에서 삭제하시겠습니까?\n\n선박명: ${pm.vesselName || '?'}\n키: ${matchedKey}\n\n⚠ 이 선박명이 지금 작업 중인 배(${vsl})와 다르면, 잘못 매칭된 다른 배입니다. 그 경우 삭제하지 말고 새 PORT-MIS 엑셀을 업로드하세요.`)) return;
                    try {
                      const { ref, remove } = await import('firebase/database');
                      const { db } = await import('../firebase.js');
                      await remove(ref(db, `port_mis_data/${matchedKey}`));
                      alert(`✓ ${matchedKey} 삭제 완료. 화면 새로고침하세요.`);
                    } catch (e) {
                      alert(`삭제 실패: ${e.message}`);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 underline"
                >
                  🗑 이 옛 데이터 삭제
                </button>
              )}
            </div>
          </div>
        );
      })()}


      {/* M5.1 G: 작업 마감 체크리스트 */}
      <WorkClosingChecklist
        open={closingOpen}
        voyage={voyage}
        mode={mode}
        onClose={() => setClosingOpen(false)}
        onJump={(target) => {
          // target: { tab, filter?, search? }
          if (target.tab) setTab(target.tab);
          if (target.filter) setListFilter(target.filter);   // V9.14: reeferTemp 필터 추가 — 리퍼 온도 미입력만
        }}
      />
      <ScrollTopButton />   {/* 2.82-02: 스크롤이 긴 화면엔 TOP (검수사 지시 2026-08-29) */}
    </div>
  );
}

// === 리스트 탭 ===
export function ListTab({ onOpenPlan = null, voyageKey, mode, containers, ediMap, recMap, xrayMap, xraySeals, compMap, inspector, onOpenContainer, externalFilter, shiftingList = [], shiftInfo = null, onAsk = null , vsl = '', pier = '', briefCtx = null, detailPanel = null }) {
  //  ★ 2.68: «3갱으로 기억해» — 이 탭에서 물어도 같은 한 벌로 이 항차에 저장한다(SearchPanel 과 동일).
  //    ⚠ 이 파일은 컴포넌트가 여럿이다 — `ask` 를 가진 **이 컴포넌트 안**에 둔다(2.50-01·2.66-01 교훈).
  const gangSetRef = useRef('');   // 2.01: briefCtx — 인라인 브리핑 재료
  const [filter, setFilter] = useState(null); // 1.84: null=목록 닫힘 — 평소엔 안 보여주고 필요할 때만(검수사 확정)
  // 1.84-01: 통합검색줄 상태 — 숫자판/문자 자판, 음성, 자동 읽기
  const [ask, setAsk] = useState(null);           // 1.85-05: 인라인 즉답 {q, stack[]} — 질문한 탭에서 바로 답
  useEffect(() => {
    const q = String(ask?.q || '').trim();
    if (!q || !voyageKey) return;
    let g = null;
    try { g = parseNaturalQuery(q).gangSet; } catch (e) { g = null; }
    if (!g) return;
    const key = `${voyageKey}|${g.n}|${q}`;
    if (gangSetRef.current === key) return;
    gangSetRef.current = key;
    fbSetVoyageGangs(voyageKey, g.n, inspector || '', gangKeyFromWords(g.dayOff, g.shift)).catch((e) => console.warn('[2.68] 갱 수 저장 실패', e));
  }, [ask, voyageKey, inspector]);
  //  ★ 2.73: «22:00부터 재계산» — 말로 알린 시작 시각도 같은 자리에서 항차에 적는다.
  const startSetRef = useRef('');
  useEffect(() => {
    const q = String(ask?.q || '').trim();
    if (!q || !voyageKey) return;
    let ss = null;
    try { ss = parseNaturalQuery(q).startSet; } catch (e) { ss = null; }
    if (!ss) return;
    //  ★ 2.74: «2호기는 23:15 3호기는 23:20» — 호기별 시작도 같은 자리에서 적는다.
    const cr = ss.cranes || [];
    const ms = cr.length ? Math.min(...cr.map((c) => c.ms)) : parseSpokenTimeMs(q);
    if (!ms) return;
    const key = `${voyageKey}|${ms}|${q}`;
    if (startSetRef.current === key) return;
    startSetRef.current = key;
    fbSetVoyageWorkStart(voyageKey, ms, inspector || '', cr).catch((e) => console.warn('[2.74] 시작 시각 저장 실패', e));
  }, [ask, voyageKey, inspector]);
  const [kb, setKb] = useState('numeric');        // 폰 자판: 작업(숫자) 기본, ⌨로 질문(문자)
  const [listening, setListening] = useState(false);
  const [autoRead, setAutoRead] = useState(true);  // 조회 결과 1건이면 위치를 읽어준다
  const searchRef = useRef(null);
  const srRef = useRef(null);
  const toggleListen = () => {
    if (listening) { try { srRef.current?.stop(); } catch (e) { /* 무시 */ } return; }
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { speak('이 기기는 음성 입력이 안 됩니다'); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const alts = []; for (let i = 0; i < last.length; i++) alts.push(last[i].transcript);
      const t = pickSpeechAlternative(alts).trim();
      const digits = parseSpokenDigits(t);
      if (digits && digits.length >= 2) setSearch(digits);          // 숫자 = 즉시 조회(종전 규칙)
      else if (t.length >= 2) setAsk({ q: t, stack: [] });          // 1.85-05: 문장 = 이 화면에서 바로 답
      else speak('인식 실패');
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => { setListening(false); if (e.error === 'not-allowed') speak('마이크 권한 필요'); };
    srRef.current = r; setListening(true);
    try { r.start(); } catch (e) { setListening(false); }
  };
  const [search, setSearch] = useState('');

  // M5.1: 외부 filter (마감 체크리스트 점프) 동기화
  useEffect(() => {
    if (externalFilter && externalFilter !== filter) setFilter(externalFilter);
  }, [externalFilter]);

  // TallyOne 1.3: 조회 기록 — 이 검색창은 라이브 필터라 확정 버튼이 없다.
  //   타이핑 멈춤을 확정으로 본다(판정·중복 생략은 activityLog가 담당, 타이핑마다 기록 아님).
  useEffect(() => { logQuerySettled('lookup', search, { voyageKey, mode }); }, [search, voyageKey, mode]);

  const filtered = useMemo(() => {
    if (!filter && !search) return [];   // 1.84: 칩 미선택·검색어 없음 = 목록 안 연다
    let arr = containers;
    if (filter === 'done') arr = arr.filter(c => compMap[c.cn]);
    else if (filter === 'undone') arr = arr.filter(c => !compMap[c.cn]);
    else if (filter === 'xray') arr = arr.filter(c => xrayMap[c.cn]);
    else if (filter === 'shift') arr = arr.filter(c => c._shift);   // 1.76-05: 시프팅만 보기
    else if (filter === 'lugg') arr = arr.filter(c => c._deckOnly || c.lugg);   // 2.06-04: 수화물(미정)만 보기
    // V9.14: 마감 점검 「리퍼 온도 미입력」 점프용 — Full 리퍼인데 온도 빈 것만 (판정은 체크리스트와 동일)
    else if (filter === 'reeferTemp') arr = arr.filter(c =>
      (c.rf || /^..R/.test(c.iso || '')) && !c.rfdry && !c.mkcon &&
      (c.fe === 'F' || c.fe === '' || c.fe == null) && (!c.tmp || String(c.tmp).trim() === ''));
    //  ★ 2.55-01: **문장은 치는 중에 거르지 않는다.** «FR» 이 컨번호로 잡혀 100대를 뿌리고 있었다
    //    (검수사 신고 · activity_log 260826 12:34~35 에 8단계가 그대로 찍혀 있다).
    //    숫자·컨번호는 종전대로 즉답 — 갑판에서 쓰는 빠른 길이라 막지 않는다.
    if (search && !isSentenceQuery(search)) {
      const q = search.toUpperCase();
      arr = arr.filter(c => c.cn?.includes(q) || c.l4?.includes(q) || c.bay?.includes(q));
    }
    return arr;
  }, [containers, filter, search, compMap, xrayMap]);

  // 1.84-01: 자동 읽기 — 끝4자리 조회 결과가 딱 1건이면 위치를 말해준다(장갑 낀 손, 화면 안 봐도 되게).
  const readRef = useRef('');
  useEffect(() => {
    if (!autoRead || !search || search.trim().length < 4) { readRef.current = ''; return; }
    if (filtered.length !== 1) return;
    const c = filtered[0];
    if (readRef.current === c.cn + search) return;   // 같은 결과 반복 낭독 방지
    readRef.current = c.cn + search;
    try { speakContainer(c, { xray: !!xrayMap[c.cn] }); } catch (e) { /* 낭독 실패는 조용히 — 조회는 화면에 있다 */ }
  }, [autoRead, search, filtered, xrayMap]);

  // 1.76-05: 실번호 중복(두 컨에 한 실) — **거른 목록이 아니라 `containers` 전체**로 판정한다.
  const dupSeals = useMemo(() => dupSealMap(containers), [containers]);

  // 1.76-05: 시프팅은 **총계에 섞지 않는다**(검수사 확정 2026-08-16 «별도 칸으로 따로»).
  //   리스트 진행률은 선사 양하리스트 대수 그대로 두고, 시프팅은 자기 칸에서 센다.
  //   그래야 «리스트 190대 중 N대 완료»가 선사·터미널 숫자와 계속 맞는다.
  const stats = useMemo(() => {
    // 2.06-04 (검수사 확정 «실려 있는건 209개가 맞는거죠 내리는거 확정은 208이고» + «LUG는 미정으로 노면 됩니다»):
    //   덱 전용 수화물(_deckOnly — EDI·리스트에 없고 덱플랜에만, 내릴지 미정)은 시프팅(1.76-05)처럼
    //   총계에 섞지 않고 자기 칸(미정)에서 센다. 전체=확정분(선사·터미널 숫자와 일치) 유지.
    const base = containers.filter(c => !c._shift && !c._deckOnly);
    const sh = containers.filter(c => c._shift);
    const lg = containers.filter(c => c._deckOnly);
    return {
      total: base.length,
      done: base.filter(c => compMap[c.cn]).length,
      xray: mode === 'discharge' ? base.filter(c => xrayMap[c.cn]).length : 0,
      shift: sh.length,
      shiftDone: sh.filter(c => compMap[c.cn]).length,
      lug: lg.length,
      lugDone: lg.filter(c => compMap[c.cn]).length,
    };
  }, [containers, compMap, xrayMap, mode]);

  const handleExport = () => {
    exportSectionToCSV(voyageKey, mode, containers, compMap, xrayMap, xraySeals);
  };

  return (
    /* 2.18 — **PC 는 2단, 폰은 1단.** 검수사 «컴용은 여백이 많은곳이 많다» 에 대한 답이다.
       컨을 고르면 오른쪽 340px 칼럼에 상세가 **붙어 있는다** — 종전엔 모달이 떴다 닫혔다 해서
       다음 컨으로 넘어갈 때마다 목록을 다시 찾아야 했다. 폰에는 이 칼럼이 없다(바텀시트로 간다). */
    <div className={detailPanel ? 'lg:flex lg:gap-5 lg:items-start' : ''}>
    <div className="space-y-3 lg:flex-1 lg:min-w-0">
      <ValidationBox
        ediContainers={Object.values(ediMap)}
        records={Object.values(recMap)}
        mode={mode}
        shiftingList={shiftingList}
        voyageKey={voyageKey}
      />

      {/* ★ 1.84-01 (검수사 확정 2026-08-19): **검색창은 통합검색 하나로.**
          *"작업전 선박화면에서 앞사진을 빼고 두번째 통합검색으로 바꾸자는 이야기. 마이크 스피커 키보드 csv 네개가 우측에."*
          숫자·컨번호·베이 = 종전 라이브 필터 그대로(기능 불변). 문장은 Enter/음성으로 「작업 시작」 탭에 릴레이.
          폰 자판은 **숫자판이 기본**(작업용), ⌨ 를 누르면 문자 키보드(질문용) — 검수사 확정. */}
      <div className="bg-ink-850 border border-line rounded-card p-2 flex items-center gap-1.5">
        <div className="relative flex-1">
          <SearchIcon className="ico absolute left-2.5 top-1/2 -translate-y-1/2 text-dim-200"/>
          <input
            key={kb}
            ref={searchRef}
            type="text"
            value={search}
            inputMode={kb}
            onChange={e => {
              const v = e.target.value.toUpperCase();
              setSearch(v);
              // ★ 2.57: 고치면 다시 답한다(화법 규칙 5) — 새 입력이 보낸 질문과 다르면 옛 답 카드를 내린다(SearchPanel:1382 와 같은 정신)
              setAsk(a => (a && v !== a.q ? null : a));
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim().length >= 2 && isSentenceQuery(search.trim())) {   // 2.55-01: 판정 한 벌
                e.preventDefault(); const q = search.trim(); setSearch(''); setAsk({ q, stack: [] });   // 1.85-05
              }
            }}
            placeholder={kb === 'numeric' ? '🎤 / 4777 / 베이 — ⌨로 질문' : '자유 질문 — Enter로 전송'}
            autoComplete="off"
            className="w-full h-12 sm:h-11 bg-ink-900 border border-line rounded-pill pl-9 pr-2 text-base mono font-black text-amber-200 text-center tracking-wider focus:outline-none focus:bg-ink-800 focus:border-amber-500"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-dim-400"><X className="w-4 h-4"/></button>}
        </div>
        <button onClick={toggleListen} title="음성 입력"
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-ink-950'}`}>
          🎤
        </button>
        <button onClick={() => setAutoRead(v => !v)} title="조회 결과 자동 읽기"
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none text-[15px] ${autoRead ? 'bg-ink-750 text-amber-300' : 'bg-ink-800 text-dim-400'}`}>
          {autoRead ? '🔊' : '🔇'}
        </button>
        <button onClick={() => { setKb(k => (k === 'numeric' ? 'text' : 'numeric')); setTimeout(() => searchRef.current?.focus(), 50); }}
          title={kb === 'numeric' ? '문자 키보드로 (질문 입력)' : '숫자판으로 (작업 조회)'}
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none text-[15px] ${kb === 'text' ? 'bg-ink-750 text-amber-300' : 'bg-ink-800 text-dim-300'}`}>
          ⌨
        </button>
        <button
          onClick={handleExport}
          className="h-11 sm:h-9 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/40 text-emerald-200 px-2.5 rounded-pill text-xs font-bold flex items-center gap-1 flex-none"
          title="CSV 내보내기"
        >
          <Download className="ico-s"/>CSV
        </button>
      </div>

      {ask && <InlineAnswerCard ask={ask} setAsk={setAsk} containers={containers} mode={mode} onFallback={onAsk} onOpenPlan={onOpenPlan} vsl={vsl} pier={pier} briefCtx={briefCtx} />}

      <div className="flex gap-1.5 flex-wrap text-xs2 sm:text-xxs">
        {[
          { k: 'all', t: `전체 ${stats.total}` },
          { k: 'undone', t: `미완 ${stats.total - stats.done}` },
          { k: 'done', t: `완료 ${stats.done}` },
          ...(mode === 'discharge' ? [{ k: 'xray', t: `🔍 X-RAY ${stats.xray}` }] : []),
          // 1.76-05: 시프팅 별도 칸 — 총계에 안 섞고 따로 센다(검수사 확정). 탭하면 시프팅만 본다.
          ...(stats.shift > 0 ? [{ k: 'shift', t: `◆ 시프팅 ${stats.shiftDone}/${stats.shift}` }] : []),
          // 2.06-04: 덱 전용 수화물 = 미정 칸 — 총계(확정분)에 안 섞는다 (검수사 «LUG는 미정으로 노면 됩니다»)
          ...(stats.lug > 0 ? [{ k: 'lugg', t: `🧳 수화물(미정) ${stats.lugDone}/${stats.lug}` }] : []),
        ].map(({ k, t }) => (
          <button key={k} onClick={() => setFilter(f => (f === k ? null : k))}
            className={`inline-flex items-center h-9 sm:h-8 px-3 rounded-pill font-bold transition-colors ${
              filter === k ? 'bg-amber-700 text-amber-100' : 'bg-ink-850 text-dim-200 hover:bg-ink-750'
            }`}>{t}</button>
        ))}
      </div>

      {/* ★ 2.57: 다 듣고 말한다(화법 규칙 1) — 문장을 치는 동안 전량 목록을 뿌리지 않는다. 숫자·컨번호 즉답과 칩·전송된 답(ask)은 그대로 */}
      {(filter || (search && !isSentenceQuery(search))) ? (
            <ContainerList
        list={filtered}
        compMap={compMap}
        xrayMap={xrayMap}
        xraySeals={xraySeals}
        mode={mode}
        voyageKey={voyageKey}
        inspector={inspector}
        onOpenContainer={onOpenContainer}
        dupSeals={dupSeals}
      />
      ) : (
        <div className="text-center text-sm2 sm:text-xs2 text-dim-300 py-8 bg-ink-900/40 border border-line rounded-card">
          위 칩을 누르거나 검색하면 그 컨테이너만 보입니다
        </div>
      )}

      {/* V8.98-05: 쉬프팅(재적부) 목록 — 통과화물이라 검수 완료 대상은 아니지만 크레인 작업 확인용 */}
      {(shiftingList.length > 0 || shiftInfo?.loadEdiPending || (shiftInfo && (shiftInfo.berthShift != null || (shiftInfo.meta && (shiftInfo.meta.excludedCnt > 0 || (shiftInfo.meta.customsFixed || []).length > 0))))) && (
        <div className="mt-3 bg-ink-900 border border-blue-800/50 rounded-pill overflow-hidden">
          <div className="px-3 py-2 bg-blue-950/60 text-blue-200 text-xs2 font-black flex items-center gap-1.5 flex-wrap">
            <span className="text-blue-400">◆</span> 쉬프팅(재적부) {shiftingList.length}
            {/* 2.79 (검수사 확정 2026-08-28): 삼자 일치는 «불일치»가 아니라 **결론이 난 것**이다.
                *«선사 세관 항만(배정) 그러므르 시프팅은 없습니다»* — ⛔ 를 띄우면 안 된다. */}
            {/* ⛔ 2.82-03: «시프팅 없음»은 **실제로 0일 때만** 쓴다. 목록에 95대를 띄워 놓고
                그 옆에 «없음»을 적으면 검수사가 무엇을 믿어야 할지 모른다(2026-08-29 실물 보고). */}
            {shiftingList.length === 0 && shiftInfo?.truthChk?.srcAgree ? (
              <span className="text-emerald-300">
                · 선사·세관·배정 {shiftInfo.truthChk.srcs?.plan}대 <b>일치</b> ✓ 시프팅 없음
              </span>
            ) : shiftInfo?.berthShift != null && (
              <span className={shiftInfo?.truthChk?.pending ? 'text-dim-300'
                : (shiftInfo?.truthChk && !shiftInfo.truthChk.ok ? 'text-rose-300' : 'text-amber-300')}>
                · 배정표 이적 {shiftInfo.berthShift}모브
                {shiftInfo?.truthChk?.pending ? ' (작업 전 — 대조 보류)'
                  : shiftInfo?.truthChk ? `(${shiftInfo.truthChk.truth}대)${shiftInfo.truthChk.ok ? ' ✓ 일치' : ' ⛔ 불일치'}` : '(정본)'}
              </span>
            )}
            <span className="ml-auto text-2xs font-normal text-dim-400">평택 작업에 걸려 옮기는 화물 — 1대 = 크레인 2모브</span>
          </div>
          {/* TallyOne 1.76: 정답표 불일치 — 어느 한쪽이 틀렸다는 것을 화면이 말한다. */}
          {shiftInfo?.truthChk?.pending && (
            <div className="px-3 py-1.5 text-xxs text-dim-200 bg-ink-950/60 border-b border-line">
              ⏳ 배정표 이적 대조 <b>보류</b> — 아직 작업 시작 전({shiftInfo.truthChk.terminalStatus})입니다.
              <span className="text-dim-300"> 이적 칸이 채워지기 전의 0은 «이적 없음»이 아니라 «아직 안 나온 것»이라 판정하지 않습니다.</span>
            </div>
          )}
          {/* ★ 2.08-15 (검수사 지시 2026-08-23 — *"그래도 의심은 지우지 말고 커버영역 알림을 띄워주세요."*)
              배정목록 이적이 확정 0이라 예측을 대수에서 뺐다. 그러나 **어느 커버 어느 자리를 의심했는지는 남긴다.** */}
          {shiftInfo?.meta?.truthZero > 0 && (
            <div className="px-3 py-1.5 text-xxs text-amber-100 bg-amber-950/40 border-b border-amber-800/50 space-y-0.5">
              {/* ⚠ 2.79-02 (검수사 2026-08-28): **삼자가 일치하면 이 칸 자체가 안 뜬다.**
                  *«MCSC에 기록한 시프팅 안내는 불필요 합니다. 혼란을 줍니다.»*
                  아래 문구는 삼자 대조가 안 되는 배(배정표 이적만 0인 경우)에만 남는다. */}
              <div>🔍 <b>커버 영역 확인 {shiftInfo.meta.truthZero}대</b> — 앱은 커버 위로 봤는데 <b>배정목록 이적은 확정 0모브</b>입니다. 작업 대수에서는 뺐습니다.</div>
              {(shiftInfo.meta.suspects || []).slice(0, 6).map(sp => (
                <div key={sp.cn} className="mono text-2xs text-amber-300">
                  · {sp.cn} <b>{sp.pos || `${parseInt(sp.bay, 10)}-${sp.row}-${sp.tier}`}</b>
                  {sp.pod ? ` POD ${sp.pod}` : ''}{sp.why ? ` — ${sp.why}` : ''}
                </div>
              ))}
              {(shiftInfo.meta.suspects || []).length > 6 && <div className="text-2xs text-amber-400">… 외 {shiftInfo.meta.suspects.length - 6}대</div>}
              <div className="text-2xs text-amber-200/80">
                커버가 이 자리를 무는지 현장에서 봐 주십시오. 물면 그대로 시프팅이고, 안 물면
                <b> 베이매트릭스에 그 베이 커버 경계</b>를 저장해 주십시오 — 다음 항차부터 예측도 0이 됩니다.
              </div>
            </div>
          )}
          {/* ★ 2.21 (검수사 확정 2026-08-23) — **환적분을 시프팅에서 뺐다.** 뺀 이유를 남긴다.
              검수사: *«조회 해보니 인천짐으로 되어 있지만 이선박은 인천엔 가지 않습니다. 그리고
              세관리스트에는 평택짐으로 양하목록에 포함되어 있습니다. 제생각엔 평택에서 양하후에
              다른선박으로 환적할것 같습니다. 고로 시프팅은 없는듯 합니다.»* */}
          {/* ★ 2.76 (검수사 확정 2026-08-28) — **기본이 리스트다.** 양하 리스트에 실려 있으면 평택 양하로 본다.
              ⛔ 화면에 근거를 늘어놓지 않는다 — 검수사 확정: *«화면에 넣으면 안됩니다.»*
                 자료가 어떻게 어긋났는지(EDI 는 시프팅·배정표는 279·세관이 결론)는 **판단 근거이지 화면에 쓸 말이 아니다.**
                 검수사가 화면에서 알아야 하는 것은 «몇 대가 왜 빠졌나» 뿐이다. */}
          {/* ★ 2.76 (검수사 확정 2026-08-28) — **기본이 리스트다. 그리고 숫자 하나로 확인한다.**
              *«기본이 리스트입니다. 리스트 목록에 앱이 말한 쉬프팅 대상 컨테이너랑 매칭이 된다면
                시프팅 보다는 평택 양하가 맞다고 판단해야 할것입니다.»*
              *«양하갯수가 평택항에서 확정이 되었습니다. 지금 리스트와 평택항 양하 대상을 맞추시면
                됩니다. 그러면 바로 확인 가능 합니다.»* · *«47개만 비교하면 됩니다.»*
              ⇒ **배정표 확정 양하 − EDI 평택분 = 모자란 수**. 그 수와 리스트에서 되찾은 수가 같으면 확정이다.
                 MCSC 633N 실측: 279 − 232 = 47, 리스트에서 되찾은 것도 47 → 맞아떨어진다.
              ⛔ 화면에 근거를 늘어놓지 않는다 — *«화면에 넣으면 안됩니다»* · *«그러면 앱의 판단력을
                 믿지 않게 됩니다»*. 판단을 먼저 말하고 숫자 한 줄로 보인다. */}
          {(shiftInfo?.meta?.customsFixed || []).length > 0 && (() => {
            const cf = shiftInfo.meta.customsFixed;
            const lm = shiftInfo.meta.listMeta || {};
            const feTxt = Object.entries(lm.fe || {}).map(([k, v]) => `${k === 'E' ? '엠티' : k === 'F' ? '풀' : k} ${v}`).join(' · ');
            const cc = shiftInfo.meta.count || {};   // 2.76: 대조는 utils 한 벌(ptkCountCheck)이 한다
            const planDis = cc.plan || 0, ediPtk = cc.ediN || 0, gap = cc.gap || 0;
            const sure = !!cc.known && gap === cf.length;
            return (
              <div className={`px-3 py-1.5 text-xxs space-y-0.5 border-b ${sure ? 'text-emerald-100 bg-emerald-950/40 border-emerald-800/50' : 'text-cyan-100 bg-cyan-950/40 border-cyan-800/50'}`}>
                {sure ? (
                  <div>✅ <b>평택 양하 {cf.length}대</b>{feTxt ? ` (${feTxt})` : ''} — 시프팅에서 뺐습니다.</div>
                ) : (
                  <div>❓ <b>평택 양하로 보입니다 — {cf.length}대</b>{feTxt ? ` (${feTxt})` : ''} · 양하리스트 기준으로 시프팅에서 뺐습니다.</div>
                )}
                {planDis > 0 && ediPtk > 0 && (
                  <div className="text-2xs opacity-90">
                    배정표 {planDis} · EDI {ediPtk} — 모자란 {gap}대
                    {sure ? '가 리스트에 그대로 있습니다.' : `인데 리스트에서 ${cf.length}대를 찾았습니다 — ${Math.abs(gap - cf.length)}대가 안 맞습니다.`}
                  </div>
                )}
                {cf.slice(0, 6).map(x => (
                  <div key={x.cn} className="mono text-2xs opacity-80">
                    · {x.cn} <b>{x.pos}</b> {x.iso} — EDI {x.ediPod} · 리스트 {x.recPod}
                  </div>
                ))}
                {cf.length > 6 && <div className="text-2xs opacity-70">… 외 {cf.length - 6}대</div>}
              </div>
            );
          })()}
          {shiftInfo?.truthChk && !shiftInfo.truthChk.pending && !shiftInfo.truthChk.ok && (
            <div className="px-3 py-1.5 text-xxs text-rose-200 bg-rose-950/40 border-b border-rose-800/40">
              ⛔ <b>배정표 이적 {shiftInfo.truthChk.truth}대</b>({shiftInfo.truthChk.moves}모브)인데 앱은 <b>{shiftInfo.truthChk.pred}대</b>를 냈습니다 — 어느 한쪽이 틀립니다.
              {shiftInfo.hatchSolve && (
                shiftInfo.hatchSolve.best ? (
                  <div className="mt-1 text-emerald-200">
                    ↳ 해치커버를 <b className="mono">{shiftInfo.hatchSolve.best.map(p => p.map(r => String(r).padStart(2, '0')).join('·')).join(' | ')}</b>
                    {' '}({shiftInfo.hatchSolve.best.length}장)로 보면 정답과 맞습니다.
                    <span className="text-emerald-300/70"> 베이매트릭스에서 이 값으로 저장하면 이 배는 다음 항차부터 맞습니다.</span>
                  </div>
                ) : shiftInfo.hatchSolve.solutions?.length ? (
                  <div className="mt-1 text-dim-200">
                    ↳ 커버 분할 후보 {shiftInfo.hatchSolve.tried}가지 중 {shiftInfo.hatchSolve.solutions.length}가지가 정답과 맞습니다 — <b>아직 하나로 좁혀지지 않았습니다.</b>
                  </div>
                ) : (
                  <div className="mt-1 text-dim-200">
                    ↳ 커버 분할 {shiftInfo.hatchSolve.tried}가지를 전부 돌려도 정답이 안 나옵니다 — <b>커버 문제가 아닙니다.</b>
                    <span className="text-dim-300"> 항로 등록({shiftInfo.lane || '미상'})과 양하 EDI 정본 여부를 보십시오.</span>
                  </div>
                )
              )}
            </div>
          )}
          {/* TallyOne 1.69-10: 선적 EDI 미도착 — 조용히 0 으로 두지 않는다(검수사 확정 2026-08-15, SWBT 2614S). */}
          {shiftInfo?.loadEdiPending && (
            <div className="px-3 py-1.5 text-xxs text-amber-200 bg-amber-950/40 border-b border-amber-800/40">
              ⏳ 선적 EDI 미도착 — 지금 올라온 선적 자료는 <b>평택 도착 적부도</b>(평택에서 싣는 화물이 아직 0)입니다.
              <span className="text-amber-300/80"> 시프팅은 선적 EDI가 와야 확정됩니다.</span>
            </div>
          )}
          {(shiftInfo?.meta?.origin || shiftInfo?.meta?.nextPort) && (
            <div className="px-3 py-1 text-2xs text-dim-300 bg-ink-950/60 border-b border-line">
              {shiftInfo.lane ? `항로 ${shiftInfo.lane} · ` : ''}{shiftInfo.meta.origin || '출항지 미상'} 출항본 기준
              {shiftInfo.meta.rot === 'direct' ? ' — 다음 기항 평택(EDI): 도착 전 하선 없음'
                : shiftInfo.meta.excluded ? ` — 평택 전 기항(${shiftInfo.meta.excluded.join('·')}) 양하 ${shiftInfo.meta.excludedCnt}대 제외${shiftInfo.meta.rot === 'edi' ? ' (다음 기항 EDI 실측)' : ' (항로 사전)'}`
                : ' — 로테이션 미확인: 평택 전 기항 양하분이 섞여 있을 수 있음'}
            </div>
          )}
          <div className="divide-y divide-line">
            {shiftingList.map(sc => (
              <div key={sc.cn} className="px-3 py-1.5 flex items-center gap-2 text-xs2">
                <span className="mono font-bold text-dim-100">{sc.cn}</span>
                <span className="text-dim-400">{sc.iso}</span>
                {sc.pod && <span className="text-dim-400">{sc.pod}</span>}
                <span className="ml-auto mono text-blue-300">{sc.to ? `${sc.from} → ${sc.to}` : `${sc.from} (예측)`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    {detailPanel && (
      <div className="hidden lg:block lg:w-[340px] lg:shrink-0 lg:sticky lg:top-4">{detailPanel}</div>
    )}
    </div>
  );
}

// 옛 BayTab 제거 (BayPlan 컴포넌트로 대체됨)

// === LOLO 탭 (V8.06) ===
// RIZHAO ORIENT 등 RORO/LOLO 혼용선 전용. 베이 그림 없이 리스트로 검수.
//   기존 ContainerList·ContainerDetailModal·firebase 함수를 그대로 재사용.
//   "조회·실체크한 것만 누적" — 검수사가 실제 처리(완료)한 컨만 누적분으로 모음.
// 1.87 (검수사 확정): 엠티실 범위 카드 — ATPR(WEIHAI 부착) 선적에서 «이번 항차 엠티실은 몇 번 실부터
//   ~ 몇 번 실까지입니까?» 를 묻고 구간(복수)을 저장한다. 입력되면 부착 현황·잔여 실 정리를 보여준다.
function EsealRangeCard({ voyageKey, info, inspector }) {
  const has = info.ranges.length > 0;
  const [edit, setEdit] = useState(false);
  const [rows, setRows] = useState(() => (has ? info.ranges.map(r => ({ ...r })) : [{ from: '', to: '' }]));
  const [showList, setShowList] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const list = rows.map(r => ({ from: String(r.from).trim(), to: String(r.to).trim() }))
      .filter(r => /^\d{4,8}$/.test(r.from) && /^\d{4,8}$/.test(r.to) && parseInt(r.to, 10) >= parseInt(r.from, 10));
    if (!list.length) { alert('구간을 확인하세요 — 예: 521001 ~ 522000'); return; }
    setSaving(true);
    try {
      await fbSetSimple(`voyages/${voyageKey}/loading/esealRanges`, { list, by: inspector || '', at: Date.now() });
      setEdit(false);
    } catch (e) { alert('저장 실패: ' + (e?.message || e)); }
    setSaving(false);
  };
  const bays = Object.keys(info.byBay).filter(k => k !== '?').map(Number).sort((a, b) => a - b);
  const dist = bays.map(b => {
    const v = info.byBay[b];
    const p = [v.s20 ? `20×${v.s20}` : null, v.s40 ? `40×${v.s40}` : null].filter(Boolean).join(' ');
    return `${b}(${p})`;
  }).join(' · ');
  return (
    <div className="bg-teal-950/40 border border-teal-700/50 rounded-pill p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs2 font-bold text-teal-200">🔖 엠티실 부착 — 대상 {info.targets.length}대</div>
        {has && !edit && (
          <button onClick={() => { setRows(info.ranges.map(r => ({ ...r }))); setEdit(true); }}
            className="text-2xs text-teal-400 underline">수정</button>
        )}
      </div>
      <div className="text-xxs text-teal-300/90">베이별: {dist || '위치 미상'}</div>
      {(!has || edit) ? (
        <div className="space-y-1.5">
          <div className="text-xs2 text-teal-100 font-bold">이번 항차 엠티실은 몇 번 실부터 ~ 몇 번 실까지입니까?</div>
          <div className="text-2xs text-teal-400/80">실은 6자리 — 100개가 넘어 앞 세 자리가 바뀌면 [+ 구간 추가]로 나눠 넣으세요.</div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={r.from} inputMode="numeric" placeholder="521001"
                onChange={e => setRows(a => a.map((x, j) => (j === i ? { ...x, from: e.target.value.replace(/\D/g, '') } : x)))}
                className="flex-1 bg-ink-800 border border-line rounded px-2 py-1.5 text-sm mono text-center text-teal-100"/>
              <span className="text-teal-400">~</span>
              <input value={r.to} inputMode="numeric" placeholder="522000"
                onChange={e => setRows(a => a.map((x, j) => (j === i ? { ...x, to: e.target.value.replace(/\D/g, '') } : x)))}
                className="flex-1 bg-ink-800 border border-line rounded px-2 py-1.5 text-sm mono text-center text-teal-100"/>
              {rows.length > 1 && (
                <button onClick={() => setRows(a => a.filter((_, j) => j !== i))} className="text-red-400 text-xs px-1">✕</button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setRows(a => [...a, { from: '', to: '' }])}
              className="flex-1 py-2 rounded bg-ink-800 border border-line-strong text-dim-200 text-xs font-bold">+ 구간 추가</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold">{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-xxs mono text-teal-100">
            실 {info.ranges.map(r => `${r.from}~${r.to}`).join(' · ')} — 배정 {info.pool.length}개
          </div>
          <div className="text-xxs text-teal-300">
            부착 {info.usedPairs.length} / 대상 {info.targets.length} · <b>잔여 실 {info.remain.length}개</b>
          </div>
          <button onClick={() => setShowList(v => !v)}
            className="w-full py-2 rounded bg-teal-800/70 hover:bg-teal-700 text-teal-100 text-xs font-bold">
            {showList ? '접기' : '🔖 엠티실 정리 리스트 (제출용)'}
          </button>
          {showList && (() => {
            const usedTxt = info.usedPairs
              .slice().sort((a, b) => a.seal.localeCompare(b.seal))
              .map(u => `${u.seal}  ${u.cn}`).join('\n');
            const remainTxt = info.remain.join('\n');
            const full = `【엠티실 정리 — 부착 ${info.usedPairs.length} / 배정 ${info.pool.length}】\n${usedTxt}\n\n【잔여 실 ${info.remain.length}개】\n${remainTxt}`;
            return (
              <div className="space-y-1.5">
                <textarea readOnly value={full} rows={10}
                  className="w-full bg-ink-950 border border-line rounded p-2 text-2xs mono text-dim-100"/>
                <button onClick={() => { try { navigator.clipboard.writeText(full); alert('복사됐습니다'); } catch (e) { /* 무시 */ } }}
                  className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold">📋 복사 (카톡 제출용)</button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// 1.85-05 (검수사 확정 «양하화면에서 조회했는데 답은 작업시작 화면에서 나옴»): 질문한 탭에서 바로 답.
//   ListTab·LoloTab 공용 — 로컬 즉답만(AI 폴백·오답 신고는 ▶ 작업 시작 탭). 후속 버튼·«← 이전 답으로» 는
//   SearchPanel 1.84-03 과 같은 규칙(검수사: «브리핑에서 누른 버튼은 반드시 되돌아 가기 버튼»).
function InlineAnswerCard({ ask, setAsk, containers, mode, onFallback, onOpenPlan, vsl = '', pier = '', briefCtx = null }) {   // 2.01: briefCtx
  const carrierContacts = useCarrierContacts();   // 1.89: «관련 선사·담당자» 즉답용
  const shipSpeed = useShipSpeed();   // 1.93-01: 시작 전 «얼마나 걸릴까» 실측 예측
  const q = ask?.q || '';
  const parsed = useMemo(() => { try { return parseNaturalQuery(q); } catch (e) { return null; } }, [q]);

  /* ★ 2.85-01 (검수사 실측) — *«미르야 베이플랜/카고플랜 보여줘»* 를 **여기서** 받는다.
       2.85 는 `SearchPanel` 에만 넣었는데, 양하·선적 탭의 질문은 이 카드가 먼저 답한다.
       못 답할 때만 «작업 시작» 탭으로 넘어가므로(onFallback) 거기까지 안 왔다 — 실측으로 확인.
     검수사 — *«양하자리에 있으면 양하 것, 선적자리에서 말하면 선적 것»* — `mode` 가 곧 그 자리다.
     ⚠ 화면은 부모가 연다(`onOpenPlan`). 여기서 탭을 직접 만지지 않는다. */
  const planRanRef = useRef('');
  useEffect(() => {
    const t = (q || '').trim();
    if (!t || !onOpenPlan) return;
    if (planRanRef.current === t) return;
    /* 2.87-02: 판정은 src/planCommand.js 한 벌 — 다섯 번째 사본이던 자리다. */
    const cmd = parseViewCommand(t);
    if (!cmd) return;
    planRanRef.current = t;
    try { onOpenPlan({ what: cmd.what, bay: cmd.bay, mode: cmd.mode || mode }); }
    catch (e) { console.warn('[미르] 플랜 열기 실패:', e); }
  }, [q, onOpenPlan, mode]);
  const results = useMemo(() => { try { return parsed ? applyNLFilter(containers, parsed) : []; } catch (e) { return []; } },
    [containers, parsed]);
  //  2.63: «갱 배분» 답에는 카고플랜 조감 스트립을 같이 그린다 — 인계가 그림 하나로 선다.
  const gangGs = useMemo(() => {
    try { return (parsed?.gangQuery && briefCtx?.gangShiftData) ? briefCtx.gangShiftData(parsed.gangQuery.n || null) : null; } catch (e) { return null; }
  }, [parsed, briefCtx, q]);
  const answer = useMemo(() => {
    try {
      //  ★ 2.50-01 — **여기가 검수사가 실제로 쓰는 검색줄이다.**
      //    2.50 은 `SearchPanel`(수동 모드 안쪽)과 통합검색에만 겹을 붙였는데, 양하 탭 검색줄은
      //    이 자리(VoyagePage:2495)가 직접 답한다. 그래서 «미르야 순서대로 양하하자» 를 쳐도
      //    옛 미르가 140대를 통째로 나열했다 — **화면에서 눌러 보고서야 알았다.**
      //    ⚠ 배선을 붙일 때 «어느 화면이 그 답을 내는가»를 먼저 확인한다. 파일이 있다고 걸리는 것이 아니다.
      const _eyes = mirSee(q, { containers, info: briefCtx?.info || null, mode, compMap: briefCtx?.comp || null,
        bayPairs: briefCtx?.pairs || null });
      if (_eyes) return _eyes;
      // TallyOne 2.01 (검수사 확정 «어디든 브리핑 해달라고 하면 그자리에서 해줘야 합니다. 굳이 작업시작을
      //   누르는 불편함을 주어서는 안됩니다») — 브리핑·실번호 점검을 인라인에서 직접 낸다.
      //   containers 는 이미 현재 모드 병합본(VoyagePage :704)이라 SearchPanel 의 modeCs 와 같은 재료.
      if (parsed?.briefingQuery) {
        //  ★ 2.57: 말투 출구 겹(mirTone) — 다른 화면(SearchPanel:1112)과 동일하게 여기도 입힌다
        return mirTone(generateBriefing(containers, mode === 'discharge' ? '양하' : '선적', mode,
          briefCtx?.pairs || null, pier, { rfSkip: !!briefCtx?.rfSkip, eseal: mode === 'loading' ? (briefCtx?.eseal || null) : null, photos: briefCtx?.photos || null, tw: (briefCtx?.terminalWork || {})[String(vsl || '').toUpperCase()] || null, compMap: briefCtx?.comp || null, gang: (briefCtx?.gangBrief ? briefCtx.gangBrief() : null), cancelled: sideCancelled(briefCtx?.info, mode, (briefCtx?.terminalWork || {})[String(vsl || '').toUpperCase()] || null) }));   // 2.62: 호출 시점 계산 — 실시간
      }
      if (parsed?.sealAuditQuery) return mirTone(generateSealAuditAnswer(containers, mode === 'discharge' ? '양하' : '선적'));   // ★ 2.57: 말투 한 겹
      //  2.54-01: **터미널 실적**을 같이 넘긴다 — 앱 기록(_comp)만 보면 «아직 시작 전» 이 나온다(실측).
      //    ⚠ 이 화면의 `containers` 에는 `_comp` 가 없다(완료는 briefCtx.comp 로 따로 온다 — 2.52-01 교훈).
      //  ★ 2.57: shiftMap(briefCtx 편승) + mirTone 한 겹 — 시프팅 «없다» 오답과 딱딱한 말투를 같이 잡는다
      return parsed ? mirTone(generateLocalAnswer(parsed, results, containers, { mode, carrierContacts, shipSpeed, vsl, vslFull: briefCtx?.info?.vslFull, pier, terminalWork: briefCtx?.terminalWork || null, compMap: briefCtx?.comp || null, photos: briefCtx?.photos || null, shiftMap: briefCtx?.shiftMap || null, gangShift: briefCtx?.gangShift || null })) : null;   // 2.05-01 · 2.62
    } catch (e) { return null; }
  }, [parsed, results, containers, mode, carrierContacts, shipSpeed, vsl, pier, briefCtx, q]);
  const readRef = useRef('');
  useEffect(() => {
    //  ⚠ 2.65-02 (라이브 실측): 브리핑은 **물을 때마다 지금 기준으로 다시 계산**된다(2.62) —
    //    갱 몫이 33대→32대로 바뀌는 순간 답 문자열이 달라져 낭독이 **처음부터 다시** 시작됐다
    //    (검수사 크롬에서 13토막이 두 번 큐에 쌓인 것을 잡았다). 브리핑의 「한 번」은 **질문 기준**이다.
    //  🔴 2.70-03 (검수사 실측 크래시 «Cannot read properties of null (reading 'length')»):
    //    2.65-02 가 `_readKey` 를 **null 검사보다 먼저** 계산해서, 답이 없는 질문마다(«2갱»·
    //    «22:00부터 재계산 해줄래?» 등) `answer.length` 가 터져 **앱 전체가 죽었다.**
    //    종전 코드는 `!answer ||` 가 앞에 있어 단락됐다 — 순서를 되돌린다. **null 검사가 먼저다.**
    if (!answer) return;
    const _readKey = parsed?.briefingQuery ? `brief:${q}` : q + answer.length;
    if (readRef.current === _readKey) return;
    readRef.current = _readKey;
    //  ★ 2.65: 브리핑은 끝까지 읽는다(SearchPanel:1272 와 같은 한 벌 — 화면마다 다르면 안 된다).
    if (parsed?.briefingQuery) {
      try { speakLong(briefingVoiceLines(answer)); } catch (e) { /* 낭독 실패 무시 */ }
      return;
    }
    const first = (answer.split('\n').find(l => l.trim()) || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/[•·⏱«»]/g, ' ').replace(/\s+/g, ' ').trim();   // 1.92-02: 이모지 벗겨 읽기
    if (first) { try { speak(first); } catch (e) { /* 낭독 실패 무시 */ } }
  }, [answer, q, parsed]);   // 2.65: parsed — 브리핑 갈래를 봐야 낭독으로 간다
  // 2.05 (검수사 «제질문은 FR 실위치를 물어봤습니다» · «그냥 FR 정보 알려줘 하면 다알려주고»):
  //   결과 컨(≤12)의 사진(데미지·메일 사진 — 씰 위치·FR 고정 등)을 답 아래 썸네일로. 탭하면 크게.
  const [photoView, setPhotoView] = useState(null);
  const resultPhotos = useMemo(() => {
    try {
      const ph = briefCtx?.photos; if (!ph) return [];
      // 2.05-01: 데미지·수화물 버튼 답은 결과(results)가 아니라 항차 전체 기준 — 그 컨들 사진을 띄운다
      let cns;
      if (parsed?.dmgQuery) cns = new Set(Object.values(ph).filter((p) => p && p.type === 'damage' && p.cn).map((p) => String(p.cn).toUpperCase()));
      else if (parsed?.luggQuery) cns = new Set(containers.filter((c) => c.lugg).map((c) => String(c.cn || '').toUpperCase()));
      else {
        if (!results.length || results.length > 12) return [];
        cns = new Set(results.map((c) => String(c.cn || '').toUpperCase()).filter(Boolean));
      }
      if (!cns.size) return [];
      return Object.values(ph).filter((p) => p && (p.type === 'damage' || p.type === 'mailPhoto') && cns.has(String(p.cn || '').toUpperCase()))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    } catch (e) { return []; }
  }, [briefCtx, results, parsed, containers]);
  if (!ask) return null;
  const hints = [];
  if (answer) {
    hints.push(...[...String(answer).matchAll(/"([^"]{2,14})"\s*[으로]*로?\s*상세 확인/g)].map(m => m[1]));
    [['❄', '리퍼'], ['🩻', '엑스레이'], ['☣', '위험물'], ['⊞', 'FR'], ['△', 'OT'], ['🛢', '탱크'], ['📐', 'OOG'], ['📷', '데미지'], ['🧳', '수화물'], ['⚡', '긴급']]   // 2.05-01
      .forEach(([emo, h]) => { if (String(answer).includes(emo + ' ')) hints.push(h); });
  }
  const uniq = [...new Set(hints)];
  return (
    <div className="bg-ink-900 border border-emerald-700/60 rounded-btn p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xxs text-emerald-300 font-bold">💬 «{q}»</div>
        <button onClick={() => setAsk(null)} className="text-dim-400 hover:text-dim-200 text-xxs font-bold">✕ 닫기</button>
      </div>
      {answer ? (
        <>
        <div className="text-sm text-dim-100 whitespace-pre-wrap leading-relaxed mono">{answer}</div>
        {gangGs ? <GangStrip gs={gangGs} /> : null}
        {resultPhotos.length > 0 && (
          <div className="pt-1">
            <div className="text-2xs font-black text-orange-300 mb-1">📷 사진 {resultPhotos.length}장 — 탭하면 크게 (씰 위치·고정 상태 등)</div>
            <div className="flex gap-1.5 flex-wrap">
              {resultPhotos.map((p) => (
                <button key={p.ts} onClick={() => setPhotoView(p)} className="text-left">
                  <img src={p.data} alt="" className="w-16 h-16 object-cover rounded border border-orange-700" />
                  <div className="text-3xs text-dim-300 w-16 truncate">{p.label || (p.type === 'damage' ? '데미지' : '메일')}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {photoView && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-3 gap-2" onClick={() => setPhotoView(null)}>
            {[photoView.data, photoView.detailPhoto].filter(Boolean).map((src, i) => (
              <img key={i} src={src} alt="" className="max-h-[70vh] max-w-full rounded-pill border border-line-strong" />
            ))}
            <div className="text-dim-100 text-xs2 font-bold text-center">{photoView.cn} — {photoView.label || ''}<br/>화면을 누르면 닫힙니다</div>
          </div>
        )}
        </>
      ) : onFallback ? (
        // ★ 2.57: 릴레이 안내가 뜨는 조건(onFallback 있음)은 종전 그대로 — 새 갈래는 그 조건이 아닌 null 에만
        <div className="text-xs2 text-dim-300">
          이 질문은 여기서 바로 못 냅니다 — 아래 버튼으로 ▶ 작업 시작 탭에서 이어집니다.
          <button onClick={() => { const _q = q; setAsk(null); onFallback(_q); }}
            className="mt-2 w-full py-2.5 rounded-pill bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold text-sm">
            ▶ 작업 시작 탭에서 답 보기
          </button>
        </div>
      ) : (
        // ★ 2.57: 모르면 모른다고 한다(화법 규칙 6) — 릴레이 대상도 아닌 null 은 빈 카드 대신 묻는 법을 알려준다
        <div className="text-xs2 text-dim-300">
          무슨 뜻인지 못 알아들었습니다 😿 «FR이 뭐야»(뜻) · «FR 어디»(자리) · «리퍼 몇 대»(대수)처럼 물어봐 주세요
        </div>
      )}
      {(uniq.length > 0 || (ask.stack || []).length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {uniq.map(h => (
            <button key={h} onClick={() => setAsk(a => ({ q: h, stack: [...(a?.stack || []), a?.q].filter(Boolean) }))}
              className="flex-1 min-w-[110px] py-2.5 rounded-pill bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold text-sm">
              🔍 {h} 보기
            </button>
          ))}
          {(ask.stack || []).length > 0 && (
            <button onClick={() => setAsk(a => {
              const s = [...(a?.stack || [])]; const prev = s.pop();
              return prev ? { q: prev, stack: s } : null;
            })}
              className="flex-1 min-w-[110px] py-2.5 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 font-bold text-sm border border-line-strong">
              ← 이전 답으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LoloTab({ onOpenPlan = null, voyageKey, mode, containers, compMap, xrayMap, xraySeals, inspector, onOpenContainer, onAsk, vsl = '', pier = '', briefCtx = null }) {
  //  ★ 2.68: «3갱으로 기억해» — 이 탭에서 물어도 같은 한 벌로 이 항차에 저장한다(SearchPanel 과 동일).
  //    ⚠ 이 파일은 컴포넌트가 여럿이다 — `ask` 를 가진 **이 컴포넌트 안**에 둔다(2.50-01·2.66-01 교훈).
  const gangSetRef = useRef('');   // 2.01: briefCtx — 인라인 브리핑 재료
  // 1.85-03 (검수사 실측 «여기는 그대로 입니다»): ListTab 1.84와 같은 게이트 — 기본 미선택, 칩·검색 시에만 목록.
  const [filter, setFilter] = useState(null); // null(숨김) | all | done(누적) | undone
  const [search, setSearch] = useState('');
  // 1.85-02 (검수사 실측 «RZOR은 화면이 안바뀌었습니다. LOLO라 빠트리신듯» «검색창도 같이 바꿔 주세요»):
  //   ListTab 1.84-01 통합검색줄을 LOLO에도. ⚠ ListTab 과 복제 두 벌 — 공용 추출은 인계함.
  const [ask, setAsk] = useState(null);   // 1.85-05: 인라인 즉답
  useEffect(() => {
    const q = String(ask?.q || '').trim();
    if (!q || !voyageKey) return;
    let g = null;
    try { g = parseNaturalQuery(q).gangSet; } catch (e) { g = null; }
    if (!g) return;
    const key = `${voyageKey}|${g.n}|${q}`;
    if (gangSetRef.current === key) return;
    gangSetRef.current = key;
    fbSetVoyageGangs(voyageKey, g.n, inspector || '', gangKeyFromWords(g.dayOff, g.shift)).catch((e) => console.warn('[2.68] 갱 수 저장 실패', e));
  }, [ask, voyageKey, inspector]);
  //  ★ 2.73: «22:00부터 재계산» — 말로 알린 시작 시각도 같은 자리에서 항차에 적는다.
  const startSetRef = useRef('');
  useEffect(() => {
    const q = String(ask?.q || '').trim();
    if (!q || !voyageKey) return;
    let ss = null;
    try { ss = parseNaturalQuery(q).startSet; } catch (e) { ss = null; }
    if (!ss) return;
    //  ★ 2.74: «2호기는 23:15 3호기는 23:20» — 호기별 시작도 같은 자리에서 적는다.
    const cr = ss.cranes || [];
    const ms = cr.length ? Math.min(...cr.map((c) => c.ms)) : parseSpokenTimeMs(q);
    if (!ms) return;
    const key = `${voyageKey}|${ms}|${q}`;
    if (startSetRef.current === key) return;
    startSetRef.current = key;
    fbSetVoyageWorkStart(voyageKey, ms, inspector || '', cr).catch((e) => console.warn('[2.74] 시작 시각 저장 실패', e));
  }, [ask, voyageKey, inspector]);
  const [kb, setKb] = useState('numeric');
  const [listening, setListening] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const searchRef = useRef(null);
  const srRef = useRef(null);
  const toggleListen = () => {
    if (listening) { try { srRef.current?.stop(); } catch (e) { /* 무시 */ } return; }
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { speak('이 기기는 음성 입력이 안 됩니다'); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const alts = []; for (let i = 0; i < last.length; i++) alts.push(last[i].transcript);
      const t = pickSpeechAlternative(alts).trim();
      const digits = parseSpokenDigits(t);
      if (digits && digits.length >= 2) setSearch(digits);
      else if (t.length >= 2) setAsk({ q: t, stack: [] });          // 1.85-05: 문장 = 이 화면에서 바로 답
      else speak('인식 실패');
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => { setListening(false); if (e.error === 'not-allowed') speak('마이크 권한 필요'); };
    srRef.current = r; setListening(true);
    try { r.start(); } catch (e) { setListening(false); }
  };

  // TallyOne 1.3: 조회 기록 — ListTab과 같은 기준(타이핑 멈춤 = 조회 확정 1회)
  useEffect(() => { logQuerySettled('lookup', search, { voyageKey, mode }); }, [search, voyageKey, mode]);

  // 1.85-08 (검수사 확정): 양하 LOLO 탭의 기준은 **덱플랜 갠트리 지정분**(RZOR R089E = 49) — 목록·통계·칩 전부.
  //   «LOLO 49개 리스트에서 조회가 안되면 이번항차 203개 안에서 조회가 되어야» — 검색만 항차 전체로 폴백.
  //   덱플랜에 없는 컨이 실물로 나오면 상대 항구 선적 과실 후보라, 폴백 결과에 그 경고를 붙인다.
  //   선적 모드·지정 0(덱플랜 미도착)은 종전대로 전체가 기준.
  const base = useMemo(() => {
    if (mode === 'discharge' && containers.some(c => c.lolo)) return containers.filter(c => c.lolo);
    return containers;
  }, [containers, mode]);
  const { filtered, searchFallback } = useMemo(() => {
    if (!filter && !search) return { filtered: [], searchFallback: false };   // 1.85-03: 기본 숨김
    let arr = base;
    if (filter === 'done') arr = arr.filter(c => compMap[c.cn]);
    else if (filter === 'undone') arr = arr.filter(c => !compMap[c.cn]);
    //  ★ 2.55-01: **문장은 치는 중에 거르지 않는다.** «FR» 이 컨번호로 잡혀 100대를 뿌리고 있었다
    //    (검수사 신고 · activity_log 260826 12:34~35 에 8단계가 그대로 찍혀 있다).
    //    숫자·컨번호는 종전대로 즉답 — 갑판에서 쓰는 빠른 길이라 막지 않는다.
    if (search && !isSentenceQuery(search)) {
      const q = search.toUpperCase();
      const match = (c) => c.cn?.includes(q) || c.l4?.includes(q);
      const hit = arr.filter(match);
      // 1.85-08: 갠트리 지정(base)에서 못 찾으면 이번 항차 전체에서 — 상대 항구 선적 과실 확인용
      if (!hit.length && base !== containers) {
        const whole = containers.filter(match);
        if (whole.length) return { filtered: whole, searchFallback: true };
      }
      return { filtered: hit, searchFallback: false };
    }
    return { filtered: arr, searchFallback: false };
  }, [base, containers, filter, search, compMap]);

  // 1.85-02: 자동 읽기 — 끝4자리 조회 결과 1건이면 위치 낭독 (ListTab 1.84-01과 같은 기준)
  const readRef = useRef('');
  useEffect(() => {
    if (!autoRead || !search || search.trim().length < 4) { readRef.current = ''; return; }
    if (filtered.length !== 1) return;
    const c = filtered[0];
    if (readRef.current === c.cn + search) return;
    readRef.current = c.cn + search;
    try { speakContainer(c, { xray: !!xrayMap[c.cn] }); } catch (e) { /* 낭독 실패는 조용히 */ }
  }, [filtered, search, autoRead, xrayMap]);

  // 1.76-05: 실번호 중복 — LOLO 탭도 같은 벌을 쓴다(ListTab 만 고치고 여기를 빠뜨리던 사고 방지).
  const dupSeals = useMemo(() => dupSealMap(containers), [containers]);

  const stats = useMemo(() => ({
    total: base.length,
    done: base.filter(c => compMap[c.cn]).length,
  }), [base, compMap]);

  // 규격별 누적 집계 (제출 양식 하단 합계와 동일 기준)
  const sizeStats = useMemo(() => {
    const acc = { '20': 0, '40': 0, '45': 0 };
    base.filter(c => compMap[c.cn]).forEach(c => {
      const lbl = isoToLabel(c.iso) || '';
      if (lbl.startsWith('20')) acc['20']++;
      else if (lbl.startsWith('45')) acc['45']++;
      else acc['40']++;
    });
    return acc;
  }, [base, compMap]);

  return (
    <div className="space-y-3">
      <div className="bg-cyan-950/40 border border-cyan-800/40 rounded-pill px-3 py-2 text-xs2 text-cyan-200">
        <b>LOLO 검수</b> — 베이 없이 리스트로 작업합니다. 컨테이너를 조회해 실체크·데미지·확인하면 누적분에 모입니다.
        <div className="mt-1 text-cyan-300/80">
          누적 {stats.done} / 전체 {stats.total}
          <span className="ml-2 text-cyan-400/70">(20′ {sizeStats['20']} · 40′ {sizeStats['40']} · 45′ {sizeStats['45']})</span>
        </div>
      </div>

      <div className="bg-ink-850 border border-line rounded-card p-2 flex items-center gap-1.5">
        <div className="relative flex-1">
          <SearchIcon className="ico absolute left-2.5 top-1/2 -translate-y-1/2 text-dim-200"/>
          <input
            key={kb}
            ref={searchRef}
            type="text"
            value={search}
            inputMode={kb}
            onChange={e => {
              const v = e.target.value.toUpperCase();
              setSearch(v);
              // ★ 2.57: 고치면 다시 답한다(화법 규칙 5) — 새 입력이 보낸 질문과 다르면 옛 답 카드를 내린다(SearchPanel:1382 와 같은 정신)
              setAsk(a => (a && v !== a.q ? null : a));
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim().length >= 2 && isSentenceQuery(search.trim())) {   // 2.55-01: 판정 한 벌
                e.preventDefault(); const q = search.trim(); setSearch(''); setAsk({ q, stack: [] });   // 1.85-05
              }
            }}
            placeholder={kb === 'numeric' ? '🎤 / 4777 / 컨번호 — ⌨로 질문' : '자유 질문 — Enter로 전송'}
            autoComplete="off"
            className="w-full h-12 sm:h-11 bg-ink-900 border border-line rounded-pill pl-9 pr-2 text-base mono font-black text-amber-200 text-center tracking-wider focus:outline-none focus:bg-ink-800 focus:border-cyan-500"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-dim-400"><X className="w-4 h-4"/></button>}
        </div>
        <button onClick={toggleListen} title="음성 입력"
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-ink-950'}`}>
          🎤
        </button>
        <button onClick={() => setAutoRead(v => !v)} title="조회 결과 자동 읽기"
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none text-[15px] ${autoRead ? 'bg-ink-750 text-amber-300' : 'bg-ink-800 text-dim-400'}`}>
          {autoRead ? '🔊' : '🔇'}
        </button>
        <button onClick={() => { setKb(k => (k === 'numeric' ? 'text' : 'numeric')); setTimeout(() => searchRef.current?.focus(), 50); }}
          title={kb === 'numeric' ? '문자 키보드로 (질문 입력)' : '숫자판으로 (작업 조회)'}
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-pill flex items-center justify-center flex-none text-[15px] ${kb === 'text' ? 'bg-ink-750 text-amber-300' : 'bg-ink-800 text-dim-300'}`}>
          ⌨
        </button>
      </div>

      {ask && <InlineAnswerCard ask={ask} setAsk={setAsk} containers={containers} mode={mode} onFallback={onAsk} onOpenPlan={onOpenPlan} vsl={vsl} pier={pier} briefCtx={briefCtx} />}

      <div className="flex gap-1.5 flex-wrap text-xs2 sm:text-xxs">
        {[
          { k: 'all', t: `전체 ${stats.total}` },
          { k: 'undone', t: `미처리 ${stats.total - stats.done}` },
          { k: 'done', t: `누적(처리) ${stats.done}` },
        ].map(({ k, t }) => (
          <button key={k} onClick={() => setFilter(f => (f === k ? null : k))}
            className={`inline-flex items-center h-9 sm:h-8 px-3 rounded-pill font-bold transition-colors ${
              filter === k ? 'bg-cyan-700 text-cyan-100' : 'bg-ink-850 text-dim-200 hover:bg-ink-750'
            }`}>{t}</button>
        ))}
      </div>

      {searchFallback && (
        <div className="bg-amber-950/50 border border-amber-700/60 rounded-pill px-3 py-2 text-xs2 text-amber-200">
          ⚠ <b>갠트리(덱플랜) 지정에 없는 컨</b> — 이번 항차 전체에서 찾았습니다.
          배에는 실었는데 지정 자리에 없는 경우 = <b>상대 항구 선적 과실</b>입니다. 실물 위치를 기록해 두세요.
        </div>
      )}
      {/* ★ 2.57: 다 듣고 말한다(화법 규칙 1) — 문장을 치는 동안 전량 목록을 뿌리지 않는다. 숫자·컨번호 즉답과 칩·전송된 답(ask)은 그대로 */}
      {(filter || (search && !isSentenceQuery(search))) ? (
      <ContainerList
        list={filtered}
        compMap={compMap}
        xrayMap={xrayMap}
        xraySeals={xraySeals}
        mode={mode}
        voyageKey={voyageKey}
        inspector={inspector}
        onOpenContainer={onOpenContainer}
        dupSeals={dupSeals}
      />
      ) : (
        <div className="text-center text-sm2 sm:text-xs2 text-dim-300 py-8 bg-ink-900/40 border border-line rounded-card">
          위 칩을 누르거나 검색하면 그 컨테이너만 보입니다
        </div>
      )}
    </div>
  );
}

// === 자료 탭 ===
function DataTab({ voyageKey, mode, voyage, setMode, inspector }) {
  const [status, setStatus] = useState('');
  // M3.5.4-fix2: 업로드 충돌 검토 모달
  const [conflictData, setConflictData] = useState(null);
  // M3.74: prompt() 대체 - 카드형 3택 모달
  const [choiceState, askChoice] = useChoice();
  // M6.14a: STOWAGE PDF 자동 분석 검토 모달 — DataTab 스코프에서만 사용
  const [stowagePdfFile, setStowagePdfFile] = useState(null);
  // M6.42: 일괄 STOWAGE PDF 등록 모달
  // M6.47: 일괄 ASC 등록 모달 (Gemini 0)
  // M6.93.1: 신규 선박 베이 매트릭스 빌더 (EDI + 사전 + PDF + 사용자 폼)
  const ediRef = useRef(null);
  const listRef = useRef(null);
  const cameraRef = useRef(null);
  const xrayRef = useRef(null);
  const sec = voyage[mode] || {};

  // M5.11: 보관된 EDI 원본 메타데이터 (재처리 가능 여부)
  const [rawMeta, setRawMeta] = useState(null);
  useEffect(() => {
    let alive = true;
    fbGetEdiRaw(voyageKey, mode).then(d => {
      if (alive) setRawMeta(d);
    }).catch(() => {});
    return () => { alive = false; };
  }, [voyageKey, mode]);

  // M5.11: EDI 원본 재처리 — 앱 업데이트 후 자료 재업로드 없이 새 로직 적용
  //   1. 보관된 원본 텍스트 가져옴
  //   2. ----- FILE: ... ----- 구분자로 분할
  //   3. 각 텍스트를 parseBAPLIE/parseAscFile로 다시 파싱
  //   4. ediContainers 덮어쓰기 (records, completed, xrayList 등은 보존)
  const handleReprocess = async () => {
    if (!rawMeta?.text) {
      alert('보관된 EDI 원본이 없습니다.\n다음 EDI 업로드부터 자동으로 보관됩니다.');
      return;
    }
    if (!confirm(
      `보관된 EDI 원본(${(rawMeta.sizeBytes/1024).toFixed(1)}KB)을 현재 앱 로직으로 다시 파싱합니다.\n\n` +
      `· EDI 컨테이너 데이터(베이/위치/POL/POD)는 새로 파싱됨\n` +
      `· 검수원 입력 데이터(실번호/완료/사진/X-RAY)는 보존됨\n` +
      `· 진행 중 작업에 영향 없음\n\n` +
      `진행하시겠습니까?`
    )) return;

    try {
      setStatus('🔄 EDI 원본 재파싱 중...');
      const text = rawMeta.text;
      // 파일 구분자로 분할
      const sections = text.split(/----- FILE: ([^-]+) -----\n/).filter(s => s.trim());
      // 짝수 인덱스: 파일명, 홀수: 내용 (split 결과)
      const files = [];
      for (let i = 0; i < sections.length; i += 2) {
        files.push({ name: sections[i].trim(), text: sections[i + 1] || '' });
      }
      if (files.length === 0) {
        // 구분자 없는 단일 텍스트 (이전 형식)
        files.push({ name: rawMeta.fileName || 'edi', text });
      }

      const allCns = {};
      const messages = [];
      for (const f of files) {
        const isAsc = /\.asc$/i.test(f.name) || /^\$604/.test(f.text.slice(0, 10));
        const r = isAsc ? parseAscFile(f.text) : parseBAPLIE(f.text);
        r.containers.forEach(c => {
          const podPtk = isPyeongtaekPort(c.pod);
          const polPtk = isPyeongtaekPort(c.pol);
          let containerMode;
          if (mode === 'discharge') {
            containerMode = podPtk ? 'discharge' : 'transit';
          } else {
            containerMode = polPtk ? 'loading' : 'transit';
          }
          const key = c.cn && c.cn.length === 11 ? c.cn : `__SLOT_${c.bay}_${c.row}_${c.tier}`;
          allCns[key] = { ...c, _slotKey: key, _mode: containerMode };
        });
        messages.push(`${f.name}: ${r.containers.length}대`);
      }

      // ediContainers 덮어쓰기 (records 등은 그대로)
      // V9.06-05: 0대 가드 — 빈 파싱 결과로 기존 노드를 지우지 않는다 (TNJP 26352E 리퍼 사건 2026-07-24).
      //   보관 raw가 손상·타형식(ASC 인코딩 깨짐 등)이면 파싱이 0대가 되는데, 그대로 저장하면
      //   chunkedReplace가 노드를 삭제해 살아있던 EDI 158대가 증발했다. 0대면 저장 없이 중단.
      if (Object.keys(allCns).length === 0) {
        setStatus(`❌ 재처리 중단 — 파싱 결과 0대 (${messages.join(', ')}). 기존 EDI 데이터는 보존했습니다.\nEDI 파일을 다시 업로드해 주세요.`);
        return;
      }
      await fbSaveEdiContainers(voyageKey, mode, allCns);
      setStatus(`✅ 재처리 완료 — ${messages.join(', ')}\n검수 입력 데이터(실번호 등)는 보존됨`);
    } catch (e) {
      setStatus(`❌ 재처리 실패: ${e?.message || e}`);
    }
  };

  const handleEdiUpload = async (files) => {
    if (!files || files.length === 0) return;
    setStatus(`${files.length}개 파일 처리 중...`);
    const results = [];
    let allCns = {};
    let shipInfo = null;          // EDI에서 추출한 선박 정보
    let allEdiContainers = [];    // 베이 분석용 (평택 필터 X 전체)
    let prevStruct = null;        // 기존 학습된 구조

    // M4.4: .def 파일 분리 처리 — 컨테이너 데이터 없음, 베이사전만 등록
    // M6.14: STOWAGE PDF도 분리 처리 — Gemini Vision으로 베이 구조 추출
    const defFiles = [];
    const stowagePdfFiles = [];  // M6.14
    const ediCandidates = [];
    for (const file of Array.from(files)) {
      const isDefByExt = /\.def$/i.test(file.name);
      if (isDefByExt) {
        defFiles.push(file);
        continue;
      }
      // 매직 바이트로 .def 추가 검사 (확장자 다른 경우 대비)
      try {
        const head = await file.slice(0, 21).arrayBuffer();
        const headBytes = new Uint8Array(head);
        if (isCaspDefFile(headBytes)) {
          defFiles.push(file);
          continue;
        }
      } catch (e) { console.warn('[파일판별] .def 매직바이트 검사 실패 — 일반 파일로 계속 진행:', file.name, e); }  // V9.57: 조용한 실패 금지

      // M6.14a (핫픽스): 파일명 키워드만으로 즉시 판별 — PDF.js 텍스트 추출 안 함
      //   이유: 양하 리스트 PDF(50+페이지)에서 extractPdfText가 수십 초 블로킹 → 먹통 현상
      //   STOWAGE PDF는 파일명에 STOWAGE/LOAD/PLAN/답안지 키워드 사용 권장
      //   파일명 매칭 안 되면 별도 [📄 STOWAGE PDF 등록] 버튼으로 명시적 처리
      const isPdfByExt = /\.pdf$/i.test(file.name);
      if (isPdfByExt) {
        try {
          const { isStowagePdf } = await import('../mixerUpload.js');
          if (isStowagePdf(file.name)) {
            stowagePdfFiles.push(file);
            continue;
          }
        } catch (e) {
          // 판별 실패 → 일반 EDI 후보로 진행
        }
      }

      ediCandidates.push(file);
    }

    // M6.14: STOWAGE PDF 처리 — 첫 번째 파일만 모달로 열기 (사용자 검토)
    //   여러 PDF면 사용자가 하나씩 처리하도록 (정확성 우선)
    if (stowagePdfFiles.length > 0) {
      setStowagePdfFile(stowagePdfFiles[0]);
      if (stowagePdfFiles.length > 1) {
        results.push(`📄 STOWAGE PDF ${stowagePdfFiles.length}개 검출 — 첫 번째 처리 후 나머지는 다시 업로드해주세요`);
      } else {
        results.push(`📄 STOWAGE PDF 자동 분석 시작: ${stowagePdfFiles[0].name}`);
      }
    }

    // .def 파일 먼저 처리 (베이사전 등록)
    for (const file of defFiles) {
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const analysis = analyzeDefFile(bytes);
        const entry = analysisToBayDictEntry(analysis, file.name);
        // 1단계: localStorage 저장 (기존)
        const saved = addToUserBayDict(entry);
        // M5.88: 2단계 — Firebase에도 동시 저장 (모든 검수원 공유)
        let fbSaved = false;
        try {
          const { fbSaveShipBayDict } = await import('../firebase.js');
          fbSaved = await fbSaveShipBayDict(entry.code, {
            ...entry,
            source: 'def-upload',
            _inspector: inspector || '',
          });
        } catch (e) {
          console.warn('[M5.88] Firebase 베이사전 저장 실패:', e);
        }
        const verifiedMark = saved ? '✅' : '⚠️';
        const fbMark = fbSaved ? '☁' : '';
        results.push(
          `${verifiedMark} 📚 ${file.name}: ${analysis.header.vesselName} — ` +
          `${analysis.bayCount}개 베이, ${analysis.structure.sectionCount}섹션 ` +
          `(트리오 ${analysis.structure.trios.length}, 단독 ${analysis.structure.standalone.length}) ` +
          `→ 베이사전 등록${saved ? '됨' : ' 실패'}${fbMark ? ` ${fbMark} 클라우드 동기화` : ''}`
        );
      } catch (e) {
        results.push(`❌ ${file.name} (.def): ${e.message}`);
      }
    }

    // M5.11: EDI 원본 텍스트 누적 — 미래 [🔄 자료 재처리]를 위한 보관
    const rawEdiTexts = [];
    const rawEdiFileNames = [];

    // M7.14: 선박 통계용 평택분 누적 (화면 mode 의존 제거 — EDI 자동 판정 기준)
    //   양하/선적 한쪽만 0으로 박히던 버그 root cause: fbAddShipStats가 화면 mode + 전체 대수(통과 포함)를 썼음.
    //   여기서 EDI 내용으로 판정한 ediKind 기준 평택(PTK)분만 양/적하로 따로 누적.
    let statDischargePtk = 0;
    let statLoadingPtk = 0;

    for (const file of ediCandidates) {
      try {
        const text = await file.text();
        // M5.11: 원본 보관 (BAPLIE/ASC 모두)
        rawEdiTexts.push(text);
        rawEdiFileNames.push(file.name);
        const isAsc = /\.asc$/i.test(file.name) || /^\$604/.test(text.slice(0, 10));
        const r = isAsc ? parseAscFile(text) : parseBAPLIE(text);
        const total = r.containers.length;

        // ===== V8.24-03: 다른 선박/항차 EDI 차단 (사용자 확정 2026-06-24) =====
        //   다른 배 EDI나 항차 안 맞는 EDI를 넣어도 경고 없이 적용되던 위험 버그 차단.
        //   선박: 콜사인(확실) 우선, 없으면 '진짜 선박명'끼리만 비교(코드형 쓰레기값 CNYNT 등은 비교 제외).
        //   항차: 양하 EDI는 voy_d, 선적 EDI는 voy_l 과 대조(평택분 기준 ediKind 자동판정).
        //         항차 안 맞으면 적용 안 함 — 평택분 있으면 "파일명 항차 고쳐 재등록" 유도, 없으면 다른 항차로 차단.
        {
          const _norm = (x) => String(x || '').toUpperCase().replace(/[\s\-_.]/g, '');
          const _looksName = (x) => /\s/.test(String(x || '').trim()) || _norm(x).length >= 7;
          const _voyCs = _norm(voyage.info.callsign), _ediCs = _norm(r.callsign);
          const _voyNm = _norm(voyage.info.vslFull), _ediNm = _norm(r.vsl);
          let _shipBad = '';
          if (_voyCs && _ediCs && _voyCs !== _ediCs) {
            _shipBad = `콜사인 ${voyage.info.callsign} ≠ EDI ${r.callsign}`;
          } else if (_voyNm && _ediNm && _looksName(voyage.info.vslFull) && _looksName(r.vsl)
                     && !(_voyNm.includes(_ediNm.slice(0, 5)) || _ediNm.includes(_voyNm.slice(0, 5)))) {
            _shipBad = `선박명 ${voyage.info.vslFull} ≠ EDI ${r.vsl}`;
          }
          if (_shipBad) {
            results.push(`⛔ ${file.name}: 다른 선박 EDI (${_shipBad}) — 적용 안 함. 이 항차(${voyage.info.vsl}) 자료가 맞는지 확인하세요.`);
            continue;
          }
          let _podPtk = 0, _polPtk = 0;
          r.containers.forEach((c) => { if (isPyeongtaekPort(c.pod)) _podPtk++; if (isPyeongtaekPort(c.pol)) _polPtk++; });
          const _ediKind = _podPtk > _polPtk ? 'discharge' : _polPtk > _podPtk ? 'loading' : mode;
          let _regVoy = _ediKind === 'discharge' ? voyage.info.voy_d : voyage.info.voy_l;
          // V9.57: 수집기 자동등록 항차는 voy_d/voy_l이 비어 있어 항차 대조를 통째로 건너뛰고
          //   무검증 통과하던 구멍. 등록값이 없으면 Firebase 키({VSL}_{VOY} — HomePage handleCreate와
          //   수집기가 같은 구조)의 마지막 '_' 뒤 항차를 추출해 그것과 대조한다.
          let _regVoyFromKey = false;
          if (!_regVoy && typeof voyageKey === 'string' && voyageKey.includes('_')) {
            const _kv = voyageKey.slice(voyageKey.lastIndexOf('_') + 1).trim();
            if (_kv) { _regVoy = _kv; _regVoyFromKey = true; }
          }
          // V8.28: 항차 비교를 '번호 기준'으로 — E/W/N/S 방향·앞0 무시. 인천 출발 선박은 선사가 왕복을
          //   한 항차(예 0529W)로 표기해 평택 양하분도 그 번호로 온다. leg는 위에서 내용(POD/POL)으로 이미
          //   확정했으니 같은 번호면 통과(0529==0529), 번호가 다르면(0530 vs 0529) 그대로 차단.
          const _voyCore = (x) => _norm(x).replace(/[EWNS]+$/, '').replace(/^0+/, '') || _norm(x);
          if (_regVoy && r.voy && _voyCore(r.voy) !== _voyCore(_regVoy)) {
            const _leg = _ediKind === 'discharge' ? '양하' : '선적';
            const _ptkLeg = _ediKind === 'discharge' ? _podPtk : _polPtk;
            // V8.29: 인천발 선박은 평택 항차가 한 항차 낮게·방향이 바뀔 수 있다(사용자 확정).
            //   콜사인이 같고 EDI에 평택분이 있으면 즉시 차단 대신 경고 모달로 사용자가
            //   등록 항차 흡수 여부를 결정. 콜사인 비교 불가하거나 평택분 없으면 기존대로 차단.
            // V9.05-03: 흡수 모달 트리거 확대 — 콜사인 비교 불가 시 모달 없이 즉시 차단되던 버그.
            //   실측 두 갈래: (a) DJCT 계열 EDI는 TDT 식별자가 '9891' 같은 숫자 코드라 콜사인 자체가 없음.
            //   (b) 자동등록(수집기) 항차 info에는 callsign이 아예 저장되지 않아 등록 측이 항상 공란.
            //   여기 도달 = 상단 선박 가드 통과(콜사인·선박명이 '비교 가능한데 다른' EDI는 이미 차단됨)
            //   → 불일치 증거 없음. 평택분이 있으면 식별 근거를 문구로 보여주고 사용자가 결정한다.
            const _csComparable = _voyCs && _ediCs;   // V9.57: 행번호 정정 — 위 선박 가드(_voyCs·_ediCs 계산부, 종전 '1596행' 주석은 옛 위치)
            // V9.39: **IMO도 식별 근거로 쓴다.** SKR·동진 계열 EDI는 콜사인이 없고 IMO만 있어
            //   종전엔 근거가 '비교 불가'로 떨어져, 실제로는 같은 배라는 증거가 있는데도
            //   검수사가 맨눈으로 확인해야 했다. 차단 로직은 건드리지 않는다 — 문구(근거)만 정확해진다.
            const _voyImo = String(voyage.info.imo || '').replace(/\D/g, '');
            const _ediImo = String(r.imo || '').replace(/\D/g, '');
            const _imoSame = !!(_voyImo && _ediImo && _voyImo === _ediImo);
            const _idBasis = _csComparable ? `같은 배 (콜사인 ${voyage.info.callsign})`
              : _imoSame ? `같은 배 (IMO ${_ediImo})`
              : (_voyNm && _ediNm) ? `선박명 대조 통과 (${r.vsl})`
              : `⚠ 선박 식별자 비교 불가 — EDI 선박 '${r.vsl || '미상'}'이 이 배가 맞는지 직접 확인하세요`;
            if (_ptkLeg > 0) {
              const _absorb = await askChoice({
                title: '항차 번호가 다릅니다',
                description:
                  `인천발 선박은 평택 항차가 한 항차 낮게, 방향이 바뀔 수 있습니다.\n\n` +
                  `EDI 항차 ${r.voy} ↔ 등록 ${_leg} 항차 ${_regVoy}${_regVoyFromKey ? ' (항차 키에서 추출)' : ''}\n` +
                  `${_idBasis}\n` +
                  `EDI에 평택 ${_leg}분 ${_ptkLeg}대 있음\n\n` +
                  `등록 항차 ${_regVoy} 로 흡수할까요?`,
                options: [
                  { key: 'absorb', label: `✅ ${_regVoy} 로 흡수`, desc: '같은 입항으로 보고 이 항차에 적용', recommended: true },
                  { key: 'skip', label: '⛔ 적용 안 함', desc: '다른 항차 자료 — 넣지 않음' },
                ],
              });
              if (_absorb !== 'absorb') {
                results.push(`⛔ ${file.name}: 항차 불일치 — EDI ${r.voy} ≠ 등록 ${_leg} ${_regVoy}, 사용자가 적용 안 함 선택.`);
                continue;
              }
              results.push(`🔀 ${file.name}: 인천발 항차 오프셋 — EDI ${r.voy} 를 등록 ${_leg} 항차 ${_regVoy} 로 흡수 (${_csComparable ? `콜사인 ${voyage.info.callsign} 일치` : '사용자 확인'}, 평택 ${_ptkLeg}대).`);
              // 흡수: 가드 통과 (아래 정상 병합 흐름 진입)
              // V9.05-03: 콜사인 비교 불가+평택분 있음의 옛 즉시 차단 분기는 모달로 대체(위).
            } else if (_csComparable || _imoSame) {
              // V9.57: 평택분 0이어도 콜사인·IMO가 같은 배면 즉시 차단하지 않고 사용자 판단(흡수 모달).
              //   여기 도달 = 상단 선박 가드 통과 → 콜사인이 둘 다 있으면 이미 일치한 것.
              //   통과 화물뿐인 EDI일 수 있으므로 기본 권장은 '적용 안 함'.
              const _absorb0 = await askChoice({
                title: '항차 번호가 다릅니다',
                description:
                  `EDI 항차 ${r.voy} ↔ 등록 ${_leg} 항차 ${_regVoy}${_regVoyFromKey ? ' (항차 키에서 추출)' : ''}\n` +
                  `${_idBasis}\n` +
                  `⚠ EDI에 평택 ${_leg}분 없음 — 다른 항차(통과 화물) 자료일 수 있습니다\n\n` +
                  `그래도 등록 항차 ${_regVoy} 로 흡수할까요?`,
                options: [
                  { key: 'absorb', label: `✅ ${_regVoy} 로 흡수`, desc: '같은 입항으로 보고 이 항차에 적용' },
                  { key: 'skip', label: '⛔ 적용 안 함', desc: '다른 항차 자료 — 넣지 않음', recommended: true },
                ],
              });
              if (_absorb0 !== 'absorb') {
                results.push(`⛔ ${file.name}: 항차 불일치 — EDI ${r.voy} ≠ 등록 ${_leg} ${_regVoy}, 평택 ${_leg}분 없음, 사용자가 적용 안 함 선택.`);
                continue;
              }
              results.push(`🔀 ${file.name}: EDI ${r.voy} 를 등록 ${_leg} 항차 ${_regVoy} 로 흡수 (평택 ${_leg}분 없음, 같은 배 확인 후 사용자 결정).`);
            } else {
              results.push(`⛔ ${file.name}: 다른 항차 자료 — EDI 항차 ${r.voy} ≠ 등록 ${_leg} 항차 ${_regVoy}, 평택 ${_leg}분 없음 → 적용 안 함.`);
              continue;
            }
          }
        }
        // ===== 가드 끝 =====

        // 선박 정보 추출 (첫 파일에서). M7.20: ASC도 처리 — 기존엔 BAPLIE만 추출해
        //   ASC로 올린 작업이 ships(선박 라이브러리/통계)에 누락되던 버그.
        if (!shipInfo) {
          if (isAsc) {
            // ASC는 TDT 없음 → parseAscFile의 $604 헤더값(vsl/voy/serviceCode) 사용.
            //   ASC엔 IMO 없으므로 식별키 = serviceCode > 선박명(공백제거). 콜사인 fallback과 동일 취지.
            const ascId = (r.serviceCode || '').toUpperCase().trim()
                       || (r.vsl ? r.vsl.toUpperCase().replace(/\s+/g, '') : '');
            if (ascId) {
              shipInfo = { imo: ascId, name: r.vsl || '', voyage: r.voy || '', callsign: (r.serviceCode || '').toUpperCase(), imoIsNumeric: false };
            }
          } else {
            shipInfo = extractShipInfo(text);
          }
          if (shipInfo) {
            try {
              prevStruct = await fbGetShipStructure(resolveShipKey(shipInfo.imo));   // V8.43: 별칭 → 정식 키
              if (prevStruct?.structure) {
                results.push(`📚 학습된 선박: ${shipInfo.name} (${shipInfo.imoIsNumeric ? 'IMO ' : ''}${shipInfo.imo}) — 이전 분석 ${prevStruct.voyages ? Object.keys(prevStruct.voyages).length : 0}개 항차`);
              } else {
                results.push(`🆕 새 선박: ${shipInfo.name} (${shipInfo.imoIsNumeric ? 'IMO ' : ''}${shipInfo.imo})`);
              }
            } catch (e) { console.warn('[선박 라이브러리] 이전 구조 조회 실패(학습 없이 계속 진행)', e); }  // V9.57: 조용한 실패 금지
          }
        }

        // 베이 분석용 전체 컨테이너 누적
        allEdiContainers.push(...r.containers);

        // M4.3 ★ 진짜 베이 누락 root cause fix
        //   이전 버그: 이 EDI 업로드 경로(VoyagePage 자체 업로드)에 평택 필터가 살아있었음
        //   M3.91 fix는 별도 경로에만 적용 → 이 경로는 여전히 평택 297대만 저장
        //   증상: 사용자님 보고 "새 EDI 업로드해도 297대만 보임" — 진짜 원인이 여기였음
        //   수정: 모든 컨 저장 + _mode 태그로 구분 (discharge/loading/transit)
        // M6.38: EDI 자체에서 양하/선적 자동 판정 — mode 화면 의존 제거 (자동화 원칙)
        //   사용자가 mode 잘못 선택하고 EDI 업로드해도 EDI 내용으로 자동 판정
        //   양하 EDI: POD가 PTK인 컨이 다수 (도착 항구가 평택)
        //   선적 EDI: POL이 PTK인 컨이 다수 (출발 항구가 평택)
        let podPtkTotal = 0;
        let polPtkTotal = 0;
        r.containers.forEach(c => {
          if (isPyeongtaekPort(c.pod)) podPtkTotal++;
          if (isPyeongtaekPort(c.pol)) polPtkTotal++;
        });
        const ediKind = podPtkTotal > polPtkTotal ? 'discharge'
                      : polPtkTotal > podPtkTotal ? 'loading'
                      : mode;  // 동률 — 화면 mode fallback

        let ptkCount = 0;
        r.containers.forEach(c => {
          const podPtk = isPyeongtaekPort(c.pod);
          const polPtk = isPyeongtaekPort(c.pol);
          let containerMode;
          if (ediKind === 'discharge') {
            if (podPtk) { containerMode = 'discharge'; ptkCount++; }
            else containerMode = 'transit';
          } else {
            if (polPtk) { containerMode = 'loading'; ptkCount++; }
            else containerMode = 'transit';
          }
          const key = c.cn && c.cn.length === 11 ? c.cn : `__SLOT_${c.bay}_${c.row}_${c.tier}`;
          allCns[key] = { ...c, _slotKey: key, _mode: containerMode };
        });
        const ediKindLabel = ediKind === 'discharge' ? '양하' : '선적';
        // M7.14: 선박 통계용 — 이 파일의 평택분을 ediKind 기준으로 누적
        if (ediKind === 'discharge') statDischargePtk += ptkCount;
        else statLoadingPtk += ptkCount;
        results.push(`✅ ${file.name}: ${ediKindLabel} EDI 자동 판정 — 평택 ${ptkCount}대 (전체 ${total}, 통과 ${total - ptkCount}대 포함 저장)`);
        // 항차 정보 자동 보완
        // M5.87: callsign + vsl도 자동 저장 (EDI TDT 세그먼트에서 추출 → PORT-MIS 매칭 자동화)
        // M6.16: voy_d / voy_l 자동 저장
        // M6.38: ediKind 기준 — mode 화면 의존 제거
        if (r.vsl && r.voy) {
          const infoPatch = {
            etd: r.etd || voyage.info.etd || '',
            carrier: r.carrier || voyage.info.carrier || '',
          };
          // V9.57: 등록 항차 표기를 EDI 표기로 덮어쓰지 않는다 — 위 대조 가드에서 voyCore 동일
          //   (0패딩·방향 차이, 예 0529W vs 529W)로 통과했거나 사용자가 흡수한 EDI가 여기서
          //   voy_d/voy_l을 갈아치우면 Firebase 키({VSL}_{VOY})·목록 표기와 어긋난다.
          //   등록값이 비어 있을 때만 자동 보완한다. (utils voyCore/voyEq 승격은 팀F 진행 중 —
          //   가드가 핵심번호 불일치를 이미 차단/흡수 처리하므로 여기선 '빈 값만 채움'으로 충분)
          if (ediKind === 'discharge') {
            if (!voyage.info.voy_d) infoPatch.voy_d = r.voy;
          } else if (ediKind === 'loading') {
            if (!voyage.info.voy_l) infoPatch.voy_l = r.voy;
          }
          // M5.87: callsign 자동 저장 (EDI에서 새로 추출됐고 voyage.info에 없거나 다르면)
          if (r.callsign && r.callsign !== voyage.info.callsign) {
            infoPatch.callsign = r.callsign;
          }
          // M5.87: 풀네임 자동 저장 (베이사전 매칭 없어도 PORT-MIS 매칭 가능하게)
          if (r.vsl && r.vsl !== voyage.info.vsl && !voyage.info.vslFull) {
            infoPatch.vslFull = r.vsl;  // 별도 필드 (vsl은 사용자 입력 약자 유지)
          }
          await fbUpdateVoyageInfo(voyageKey, infoPatch);

          // M5.89: EDI에서 추출한 콜사인 + 풀네임으로 베이사전 자동 등록
          //   - 베이사전에 해당 약자(code) 없거나 콜사인이 비어있으면 등록
          //   - def는 베이 구조 / EDI는 콜사인+풀네임 → 보완 관계
          //   - 모든 검수원과 즉시 공유 (Firebase)
          // V7.30: 콜사인 없어도 선박명(r.vsl)이 있으면 사전 교정 (오염 콜사인 자동 정리).
          //   정상 EDI는 TDT 호출부호 칸이 비어 callsign='' 인 경우가 많음 → 선박명으로 교정.
          if ((r.callsign || r.vsl) && (r.vsl || r.carrier)) {
            try {
              const { fbSaveShipBayDict } = await import('../firebase.js');
              const code = (voyage.info.vsl || '').toUpperCase().replace(/\s+/g, '');
              if (code && code.length >= 2 && code.length <= 8) {
                await fbSaveShipBayDict(code, {
                  code,
                  name: r.vsl,
                  callsign: r.callsign || '',
                  source: 'edi-auto',
                  _inspector: inspector || '',
                });
                results.push(`☁ ${file.name}: 베이사전 자동 등록 (${code} · ${r.callsign || '(콜사인없음)'} · ${r.vsl})`);
              }
            } catch (e) {
              console.warn('[M5.89] EDI 베이사전 자동 등록 실패:', e);
            }
          }
        }
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.message}`);
      }
    }

    if (Object.keys(allCns).length > 0) {
      const existing = sec.ediContainers || {};
      const existingCount = Object.keys(existing).length;
      const newCount = Object.keys(allCns).length;

      // M3.5.4-fix2: 기존 EDI 데이터 있으면 사용자에게 처리 방식 묻기
      // M3.74: window.prompt() → ChoiceModal (풀 너비 카드 버튼)
      if (existingCount > 0) {
        const overlap = Object.keys(allCns).filter(cn => existing[cn]).length;
        const onlyNew = newCount - overlap;
        const choice = await askChoice({
          title: '기존 EDI 데이터 처리',
          description:
            `기존 EDI: ${existingCount}대\n` +
            `새로 업로드: ${newCount}대 (중복 ${overlap}대, 신규 ${onlyNew}대)\n\n` +
            `어떻게 할까요?`,
          options: [
            {
              key: '1',
              label: '🔄 교체',
              desc: '기존 모두 삭제 후 새 것만',
              recommended: true,  // 같은 EDI 다시 올릴 때가 가장 흔함
            },
            {
              key: '2',
              label: '📥 추가 병합',
              desc: '중복은 새 값으로 덮어쓰기',
            },
            {
              key: '3',
              label: '➕ 신규만 추가',
              desc: '중복은 기존 유지',
            },
          ],
        });
        if (!choice) {
          setStatus('취소됨');
          if (ediRef.current) ediRef.current.value = '';
          return;
        }
        if (choice === '1') {
          // 교체: 기존 완전 삭제 후 새 것만
          await fbSaveEdiContainers(voyageKey, mode, allCns);
          results.push(`🔄 교체 완료: ${existingCount}대 → ${newCount}대`);
        } else if (choice === '2') {
          await fbSaveEdiContainers(voyageKey, mode, { ...existing, ...allCns });
          results.push(`📥 병합: 기존 ${existingCount}대 + 신규 ${onlyNew}대 (중복 ${overlap}대 덮어씀)`);
        } else if (choice === '3') {
          // 신규만 추가
          const onlyNewObj = {};
          Object.entries(allCns).forEach(([cn, c]) => {
            if (!existing[cn]) onlyNewObj[cn] = c;
          });
          await fbSaveEdiContainers(voyageKey, mode, { ...existing, ...onlyNewObj });
          results.push(`➕ 신규만 추가: ${Object.keys(onlyNewObj).length}대 (기존 ${existingCount}대 유지)`);
        }
      } else {
        // 기존 데이터 없으면 그냥 저장
        await fbSaveEdiContainers(voyageKey, mode, allCns);
      }
    }

    // M5.11: EDI 원본 텍스트 보관 (미래 [🔄 자료 재처리]에 사용)
    //   여러 파일 합쳐서 단일 텍스트로 저장 (구분자: \n----- FILE: ... -----\n)
    if (rawEdiTexts.length > 0) {
      try {
        const combined = rawEdiTexts.map((t, i) =>
          `----- FILE: ${rawEdiFileNames[i]} -----\n${t}`
        ).join('\n\n');
        await fbSaveEdiRaw(voyageKey, mode, combined, {
          fileName: rawEdiFileNames.join(', '),
          parserVersion: 'M5.11',
        });
        results.push(`💾 EDI 원본 자동 보관됨 (${(combined.length / 1024).toFixed(1)}KB)`);
      } catch (e) {
        // 원본 저장 실패해도 메인 흐름엔 영향 없음
        console.warn('EDI raw save failed:', e);
      }
    }

    // 선박 구조 분석 + 저장 (전체 컨테이너 기반, 평택 필터 X)
    if (shipInfo && allEdiContainers.length > 0) {
      try {
        const baseStruct = analyzeShipStructure(allEdiContainers);

        // M3.90: 베이사전(.def 파일 기반) 자동 매칭
        const newStruct = augmentStructureWithBayDict(baseStruct, shipInfo.imo, shipInfo.name);
        if (newStruct.bayDictApplied) {
          results.push(`📚 베이사전 매칭: ${shipInfo.name} (${shipInfo.imo}) - .def 데이터 적용됨`);
        }

        const cmp = compareStructures(prevStruct?.structure, newStruct);
        if (cmp.isFirst) {
          results.push(`📊 선박 구조 학습: 베이 ${newStruct.bay_count}개, 짝꿍 ${Object.keys(newStruct.pairs).length / 2}쌍, 단독 ${newStruct.singles.length}개`);
        } else if (cmp.hasChanges) {
          results.push(`📊 선박 구조 업데이트: ${cmp.changes.join(' / ')}`);
        } else {
          results.push(`📊 선박 구조 일치 (이전 분석과 동일)`);
        }
        // 저장
        // V8.43: ships/{키} 저장은 정식 키로 통일 — BAPLIE/ASC 경로가 같은 배를
        //   다른 키(콜사인 vs 약자/서비스코드)로 갈라 보관소에 중복 표시되던 버그 방지.
        const shipStoreKey = resolveShipKey(shipInfo.imo);
        await fbSaveShipStructure(shipStoreKey, {
          imo: shipInfo.imo,
          name: shipInfo.name,
          structure: newStruct,
        });
        await fbAddShipVoyage(shipStoreKey, voyageKey, {
          voy: shipInfo.voyage,
          // V8.84: 항차 등록 정보의 양하/선적 항차를 보관소 기록에도 — 빈값은 제외(기존 값 보존).
          ...(voyage?.info?.voy_d ? { voy_d: voyage.info.voy_d } : {}),
          ...(voyage?.info?.voy_l ? { voy_l: voyage.info.voy_l } : {}),
          vsl: shipInfo.name,
          mode,
          container_count: allEdiContainers.length,
          ptk_count: Object.keys(allCns).length,
          // M7.15: 항차별 평택 양/적하 대수. _uploadKind로 이번 올린 mode만 덮어쓰기.
          discharge_ptk: statDischargePtk,
          loading_ptk: statLoadingPtk,
          // 이번 업로드에 포함된 mode (값이 집계된 쪽). 둘 다면 'both'.
          _uploadKind: (statDischargePtk > 0 && statLoadingPtk > 0) ? 'both'
                     : statDischargePtk > 0 ? 'discharge'
                     : statLoadingPtk > 0 ? 'loading'
                     : mode,   // 1.55-01: ediKind는 업로드 루프 블록 지역변수 — 여기서 ReferenceError(평택분 0 업로드에서만 발현). 동률 fallback과 같은 mode 사용
          analyzed_by: inspector || '',   // M6.15: EDI 업로드한 검수원
        });
        // M7.15: stats는 voyages에서 합산만 (fbAddShipVoyage가 기록 전담)
        await fbAddShipStats(shipStoreKey, {}, voyageKey);
      } catch (e) {
        console.error('Ship structure save failed:', e);
      }
    }

    // M4.4: .def만 업로드한 경우와 EDI도 같이 한 경우 모두 적절히 표시
    let summary;
    const cnCount = Object.keys(allCns).length;
    const defCount = defFiles.length;
    if (cnCount > 0 && defCount > 0) {
      summary = `\n\n총 평택 대상: ${cnCount}대 · 베이사전 등록: ${defCount}척`;
    } else if (cnCount > 0) {
      summary = `\n\n총 평택 대상: ${cnCount}대`;
    } else if (defCount > 0) {
      summary = `\n\n📚 베이사전 등록: ${defCount}척 (다음 EDI 업로드 시 자동 매칭)`;
    } else {
      summary = '';
    }
    setStatus(results.join('\n') + summary);
    if (ediRef.current) ediRef.current.value = '';
  };

  const handleListUpload = async (files) => {
    if (!files || files.length === 0) return;

    // M3.5.4-fix2: 기존 리스트 데이터 있으면 사용자에게 묻기
    // M3.74: window.prompt() → ChoiceModal
    const existing = sec.records || {};
    const existingCount = Object.keys(existing).length;
    let startMap = { ...existing };
    let skipExisting = false;
    if (existingCount > 0) {
      const choice = await askChoice({
        title: '기존 리스트 데이터 처리',
        description: `기존 리스트: ${existingCount}대\n\n어떻게 할까요?`,
        options: [
          {
            key: '1',
            label: '🔄 교체',
            desc: '기존 모두 삭제 후 새 것만',
            recommended: true,
          },
          {
            key: '2',
            label: '📥 추가 병합',
            desc: '중복은 새 값으로 덮어쓰기',
          },
          {
            key: '3',
            label: '➕ 신규만 추가',
            desc: '중복은 기존 유지',
          },
        ],
      });
      if (!choice) {
        setStatus('취소됨');
        if (listRef.current) listRef.current.value = '';
        return;
      }
      if (choice === '1') {
        startMap = {};  // 교체: 기존 비우고 시작
      }
      // 신규만 모드는 cn별 처리 시 기존 값 보존
      skipExisting = choice === '3';
    }

    setStatus(`${files.length}개 파일 처리 중...`);
    const results = [];
    let cnMap = startMap;
    let added = 0;

    // M3.5.3: PDF/사진 자동 분기 (mixerUpload 모듈 활용)
    // V9.32: 동적 import 실패를 삼키지 않는다 — 새 버전 배포 후 캐시가 옛 청크를 가리키면
    //   여기서 예외가 나고 함수가 조용히 죽어 화면이 "처리 중"에서 영영 멈춘다(사용자 신고 2026-07-31,
    //   OBWH 2702W). 실패하면 이유를 화면에 띄우고 새로고침을 안내한다.
    let detectFileType, extractPdfText, parsePdfContainers, ocrImageContainers, GEMINI_API_KEY, _storage, SK;
    try {
      ({ detectFileType, extractPdfText, parsePdfContainers, ocrImageContainers } = await import('../mixerUpload.js'));
      ({ GEMINI_API_KEY } = await import('../gemini.js'));
      ({ _storage, SK } = await import('../utils.js'));
    } catch (impErr) {
      setStatus(`❌ 업로드 모듈을 불러오지 못했습니다 — 앱이 새 버전으로 갱신되었습니다.\n화면을 새로고침한 뒤 다시 올려 주세요.\n(${impErr?.message || impErr})`);
      if (listRef.current) listRef.current.value = '';
      return;
    }
    const geminiKey = _storage.get(SK.geminiKey) || GEMINI_API_KEY;

    for (const file of Array.from(files)) {
      try {
        const ftype = await detectFileType(file);
        let records = [];

        if (ftype === 'pdf') {
          // PDF 처리
          setStatus(`📄 ${file.name} PDF 분석 중...`);
          const text = await extractPdfText(file);
          const parsed = parsePdfContainers(text);
          records = Object.values(parsed.containers || {});
          if (records.length === 0) {
            results.push(`❌ ${file.name}: PDF에서 컨번호 인식 실패`);
            continue;
          }
        } else if (ftype === 'image') {
          // 사진 OCR
          setStatus(`📷 ${file.name} 사진 분석 중 (Gemini Vision)...`);
          if (!geminiKey) {
            results.push(`❌ ${file.name}: Gemini API 키 없음 (헤더 🔑 버튼에서 설정)`);
            continue;
          }
          try {
            const parsed = await ocrImageContainers(file, geminiKey);
            records = Object.values(parsed.containers || {});
            if (records.length === 0) {
              results.push(`❌ ${file.name}: 사진에서 컨번호 인식 실패 (선명한 사진 권장)`);
              continue;
            }
          } catch (e) {
            results.push(`❌ ${file.name} 사진 OCR 실패: ${e.message}`);
            continue;
          }
        } else {
          // 엑셀/CSV (기존 로직)
          const buf = await file.arrayBuffer();
          // V9.22: RZOR 덱 스토우지 플랜(rzdf_ship_*.xls, 시트 A~E-DECK) 감지 → 플랜으로 저장(리스트 아님)
          //   V9.31: 파일명이 rzdf_ 이거나 RZOR 선박일 때만 검사한다. 종전엔 모든 리스트 파일을
          //   cellStyles:true(스타일 전체 파싱)로 통째 읽어 — 큰 CLL(OBWH 2702W 등)에서 업로드가
          //   "처리 중"에서 수 분간 멈춘 것처럼 보였다(사용자 신고 2026-07-31). 무관한 파일엔 건너뛴다.
          const _mayBeDeckPlan = /rzdf|deck/i.test(file.name) ||
            String(voyage?.info?.vsl || voyageKey || '').toUpperCase().includes('RZOR');
          try {
            if (!_mayBeDeckPlan) throw new Error('skip-deckplan');
            const XLSX0 = await loadSheetJS();
            const wb0 = XLSX0.read(new Uint8Array(buf.slice(0)), { type: 'array', cellStyles: true });   // V9.22-02: 회색(불가) 구역 구분
            if (isDeckPlanWorkbook(wb0)) {
              const plan0 = parseDeckPlanWorkbook(wb0, XLSX0);
              if (plan0.total > 0) {
                await fbSetStowagePlan(voyageKey, mode, plan0);
                results.push(`✅ 🗺 ${file.name}: 덱 플랜 ${plan0.decks.map(d => `${d.deck}${d.slots.length}`).join('/')} = ${plan0.total}대`);
                continue;
              }
            }
          } catch (e0) { /* 덱 플랜 아님 → 리스트 흐름 계속 */ }
          const parseResult = await parseListExcel(buf);
          records = parseResult.records || [];
          if (records.length === 0) {
            if (/cbf|booking|bkg|confirm/i.test(file.name)) {
              results.push(`ℹ️ ${file.name}: 예약 양식 (Booking) — 컨번호 없음, 정상`);
            } else {
              results.push(`❌ ${file.name}: 컨번호 인식 실패 (양식 확인 필요)`);
            }
            continue;
          }
        }

        // 공통: cnMap에 병합 (skipExisting이면 기존 컨번호는 건너뜀)
        // 2.06-10 (2719E 실측 — 검수사가 올린 세관 Excel 148건이 _source 공란): 인앱 업로드는 파일명을
        //   안 실어서, 세관리스트(Excel_타임스탬프)를 올려도 세관 기준 판정(sealIssuesOf hasCustoms)이
        //   인식 못 하고 «세관리스트를 첨부해 주세요»가 계속 떴다. 파일명을 _source 로 싣는다 —
        //   fbSaveListRecords 가 이걸로 sl_src(채택 씰 출처)·sl_conflict 출처를 기록한다.
        for (const r of records) {
          if (!r.cn) continue;
          r._source = file.name;
          if (cnMap[r.cn]) {
            if (skipExisting) continue;  // 신규만 모드 → 기존 유지
            // M8.08: 스마트 병합 — 새 값(주로 세관리스트)이 비어있으면 기존 값(선사리스트) 보존.
            //   작업 순서 EDI→선사→세관: 세관이 마지막이라 온도(빈값)가 선사 온도를 덮던 문제.
            //   실번호는 더 완전한(긴) 쪽 유지 — 세관 20자 컷 vs 선사 완전값.
            const prev = cnMap[r.cn];
            const merged = { ...prev };
            for (const [k, v] of Object.entries(r)) {
              if (v === '' || v == null) continue;          // 빈 새 값은 기존 보존
              if (k === 'tmp' && (v === '' || r.tmp_missing)) continue;  // 빈 온도 보존
              merged[k] = v;
            }
            // 실번호: 한쪽이 다른 쪽의 앞부분이면서 더 길면 긴 쪽 채택(잘림 보정).
            const a = String(prev.sl || '').trim(), b = String(r.sl || '').trim();
            if (a && b) {
              if (a.length > b.length && a.startsWith(b)) merged.sl = a;
              else if (b.length > a.length && b.startsWith(a)) merged.sl = b;
            } else {
              merged.sl = a || b;
            }
            // 온도: 기존(선사)에 유효 온도 있으면 보존.
            const prevTmp = String(prev.tmp || '').trim();
            if (prevTmp && !prev.tmp_missing) { merged.tmp = prev.tmp; merged.tmp_missing = false; }
            merged._source = file.name;   // 2.06-10: 마지막으로 이 컨을 덮은 파일 — _source 의 정의 그대로
            cnMap[r.cn] = merged;
          } else {
            added++;
            cnMap[r.cn] = r;
          }
        }
        const typeLabel = ftype === 'pdf' ? '📄 PDF' : ftype === 'image' ? '📷 사진' : '📊 엑셀';
        results.push(`✅ ${typeLabel} ${file.name}: +${records.length}대`);
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.message}`);
      }
    }

    // TallyOne 1.11: **반대 방향 리스트 배제** — 수동 업로드에도 같은 방어를 건다.
    //   자동등록(autoRegApi)만 막으면, 같은 폴더의 합본을 손으로 올렸을 때 그대로 합산된다.
    //   레코드의 POL/POD 로 반대 방향이 확정된 것만 뺀다(근거 없으면 유지). 뺐으면 화면에 알린다 —
    //   말없이 줄어들면 검수사가 리스트가 모자란 줄 알고 다시 올린다.
    // 2.08-13 (검수사 «세관 리스트를 선적카드에 등록시키는 오류»): 올린 파일의 방향을 POL/POD 로
    //   판정해 현재 탭과 다르면 **묻는다**. 양하분 = POD 평택 / 선적분 = POL 평택. 자동 이동은 하지 않는다
    //   (검수사 확정 없이 남의 섹션에 쓰면 더 큰 사고 — 확인 대화 후 진행/취소만).
    {
      const _vals = Object.values(cnMap);
      const _disN = _vals.filter(r => isPyeongtaekPort(r?.pod)).length;
      const _loaN = _vals.filter(r => isPyeongtaekPort(r?.pol)).length;
      const _guess = (_disN > _loaN * 2 && _disN >= 5) ? 'discharge'
        : (_loaN > _disN * 2 && _loaN >= 5) ? 'loading' : '';
      if (_guess && _guess !== mode) {
        const _kr = (m) => (m === 'discharge' ? '양하' : '선적');
        const ok = window.confirm(
          `⚠ 방향이 달라 보입니다\n\n올린 파일: ${_kr(_guess)}분 (평택 ${_guess === 'discharge' ? '양하(POD)' : '선적(POL)'} ${Math.max(_disN, _loaN)}대)\n` +
          `지금 화면: ${_kr(mode)} 탭\n\n이대로 ${_kr(mode)}에 등록하면 자료가 섞입니다.\n` +
          `취소하고 ${_kr(_guess)} 탭에서 올리시겠어요?\n\n[확인] 취소 · [취소] 그대로 진행`);
        if (ok) { setStatus(`↩ 등록 취소 — ${_kr(_guess)} 탭으로 이동해 다시 올려 주세요.`); if (listRef.current) listRef.current.value = ''; return; }
      }
    }
    const dirDropped = Object.keys(cnMap).filter(cn => isOppositeDirRecord(cnMap[cn], mode));
    dirDropped.forEach(cn => { delete cnMap[cn]; });
    if (dirDropped.length) {
      results.push(`↩️ ${mode === 'discharge' ? '선적' : '양하'} 리스트 ${dirDropped.length}대 제외 — ${mode === 'discharge' ? 'POL' : 'POD'}만 평택인 컨은 이 화면 몫이 아닙니다`);
    }

    // M3.5.4-fix2: 충돌 검출 — EDI vs 리스트 비교
    const ediMap = sec.ediContainers || {};
    const newRecords = {};
    Object.values(cnMap).forEach(r => {
      // 신규 업로드된 것만 비교 (기존 records에 없던 것)
      if (r.cn) newRecords[r.cn] = r;
    });

    const unmatched = [];      // EDI에 없는 컨번호
    const weightDiffs = [];    // 무게 차이 1톤 이상
    const sealDiffs = [];      // 실번호 불일치

    Object.values(newRecords).forEach(r => {
      const ediC = ediMap[r.cn];
      if (!ediC) {
        // EDI에 없는 컨 (단, 기존에 records로 있던 것은 이미 처리된 거니 신규만)
        const wasInRecords = (sec.records || {})[r.cn];
        if (!wasInRecords) {
          unmatched.push({ cn: r.cn, sl: r.sl || '', wt: r.wt || 0, iso: r.iso || '', fe: r.fe || '' });
        }
        return;
      }
      // 무게 차이
      const ediW = parseInt(ediC.wt, 10) || 0;
      const lrW = parseInt(r.wt, 10) || 0;
      if (ediW > 0 && lrW > 0 && Math.abs(ediW - lrW) >= 1000) {
        weightDiffs.push({ cn: r.cn, ediW, listW: lrW });
      }
      // 실번호 불일치 (EDI에 sl 있고 리스트에도 있는데 다름)
      const ediSl = String(ediC.sl || '').trim();
      const lrSl = String(r.sl || '').trim();
      if (ediSl && lrSl && ediSl !== lrSl) {
        sealDiffs.push({ cn: r.cn, ediSl, listSl: lrSl });
      }
    });

    const totalConflicts = unmatched.length + weightDiffs.length + sealDiffs.length;

    if (totalConflicts > 0) {
      // 충돌 있음 → 모달로 검수원에게 확인
      setStatus(results.join('\n') + `\n\n⚠️ 검토 필요 ${totalConflicts}건 — 확인 후 저장`);
      setConflictData({
        cnMap,             // 임시 저장 (적용 시 사용)
        results,
        added,
        conflicts: { unmatched, weightDiffs, sealDiffs },
      });
      if (listRef.current) listRef.current.value = '';
      return;
    }

    // 충돌 없음 → 그대로 저장
    // V9.32-02: 저장 실패(undefined 거부 등)를 삼키지 않는다 — 종전엔 여기서 예외가 나면
    //   함수가 조용히 죽어 "처리 중"이 영영 남았다(OBWH 2702W 재현 확정).
    try {
      await fbSaveListRecords(voyageKey, mode, cnMap);
      setStatus(results.join('\n') + `\n\n전체 ${Object.keys(cnMap).length}대 (신규 ${added})`);
    } catch (e) {
      setStatus(`❌ 리스트 저장 실패 — ${e?.message || e}\n다시 시도하거나 이 메시지를 개발자에게 알려 주세요.`);
    }
    if (listRef.current) listRef.current.value = '';
  };

  // M3.5.4-fix2: 충돌 검토 결과 적용
  const applyConflictResolution = async (resolution) => {
    if (!conflictData) return;
    const { cnMap, results, added } = conflictData;
    const ediMap = sec.ediContainers || {};
    const finalMap = { ...cnMap };

    // 1. EDI에 없는 컨: ignore면 제거, add면 유지
    resolution.unmatchedActions.forEach(a => {
      if (a.action === 'ignore') {
        delete finalMap[a.cn];
      }
      // add는 그대로 두면 됨 (이미 cnMap에 있음)
    });

    // 2. 무게: 'edi' 선택 시 EDI 무게로, 'list'면 리스트 무게 그대로
    resolution.weightActions.forEach(a => {
      if (a.action === 'edi' && finalMap[a.cn]) {
        finalMap[a.cn].wt = a.ediW;
      }
      // list는 그대로 (이미 리스트 값)
    });

    // 3. 실번호: 'edi' 선택 시 EDI 실번호로
    resolution.sealActions.forEach(a => {
      if (a.action === 'edi' && finalMap[a.cn]) {
        finalMap[a.cn].sl = a.ediSl;
      }
    });

    await fbSaveListRecords(voyageKey, mode, finalMap);
    const ignoredCount = resolution.unmatchedActions.filter(a => a.action === 'ignore').length;
    setStatus(results.join('\n') + `\n\n✅ 저장 완료 — 전체 ${Object.keys(finalMap).length}대${ignoredCount > 0 ? ` (무시 ${ignoredCount}대)` : ''}`);
    setConflictData(null);
  };

  const handleXrayUpload = async (files) => {
    if (!files || files.length === 0 || mode !== 'discharge') return;
    setStatus(`${files.length}개 파일 처리 중...`);
    let cnObj = { ...(sec.xrayList || {}) };
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        //  2.26: 세관 파일 6열을 그대로 담는다 — 선사SEAL·화물구분·규격·도착예정지.
        //    `xrayList[cn]` 은 원래부터 객체({at})고 읽는 쪽은 truthy 검사만 하므로 파급 0.
        //    ⚠ 이미 있는 컨도 **덮지 말고 채운다** — 다시 올렸을 때 새 열이 붙게.
        const { containers, rows } = await parseXrayList(buf);
        const byCn = new Map((rows || []).map(r => [r.cn, r]));
        containers.forEach(cn => {
          const r = byCn.get(cn) || null;
          const prev = cnObj[cn];
          if (!prev) added++;
          cnObj[cn] = {
            at: (prev && prev.at) || Date.now(),
            ...(prev || {}),
            ...(r ? { seal: r.seal || '', kind: r.kind || '', iso: r.iso || '', dest: r.dest || '' } : {}),
          };
        });
      } catch (e) { console.warn('[X-RAY] 파일 파싱 실패 — 이 파일은 건너뜀:', file.name, e); }  // V9.57: 조용한 실패 금지
    }
    await fbSaveXrayList(voyageKey, cnObj);
    setStatus(`✅ X-RAY: +${added}대 (전체 ${Object.keys(cnObj).length}대)`);
    if (xrayRef.current) xrayRef.current.value = '';
  };

  // 양하/선적 섹션 추가 (다른 모드)
  const otherMode = mode === 'discharge' ? 'loading' : 'discharge';
  const hasOther = !!voyage[otherMode];
  // M6.46: 다른 mode 섹션 추가 시 voy 입력
  const [otherVoyInput, setOtherVoyInput] = useState('');

  // M5.26: 통합 출력 허브 모달
  const [showPrintHub, setShowPrintHub] = useState(false);
  const [showTestLab, setShowTestLab] = useState(false);   // V9.25: 검증 모드 (검수원 '김성일'만 노출)

  return (
    <div className="space-y-3">
      {/* M6.46: 항차 번호 확인/정정 위젯 — 정확한 voy_d/voy_l 보장 */}
      <VoyFixWidget voyage={voyage} voyageKey={voyageKey}/>
      {/* ★ TallyOne 1.60: 업로드 화면에서 **베이사전 라이브러리·매트릭스 빌더·베이사전 진단**을 전부 뺐다.
          검수사 지시 2026-08-13: *"업로드를 누르면 일반 검수사도 보이기 때문에 건드릴수 있습니다."*
            · *"올리기 전에 업로드 화면에서 이건 안보이게 해주세요 **검수사에겐 필요 없는 기능입니다.**"*
          → 셋 다 수석 대시보드 「🧱 베이매트릭스」(권한 화면)로 옮겼다.
          업로드 화면에는 검수원이 실제로 쓰는 자료 올리기만 남는다. */}
      {/* M5.26: 통합 출력 진입 */}
      <button
        onClick={() => setShowPrintHub(true)}
        className="w-full bg-gradient-to-br from-amber-900/40 to-orange-900/40 hover:from-amber-900/60 border border-amber-700/50 rounded-pill p-3 flex items-center gap-3 active:scale-[0.98] transition"
      >
        <span className="text-2xl">📄</span>
        <div className="flex-1 text-left">
          <div className="font-bold text-amber-100">검수 자료 출력</div>
          <div className="text-2xs text-amber-300/80">양하/선적 × 검수리스트 / 카고플랜 / 베이상세 통합</div>
        </div>
        <span className="text-amber-300">›</span>
      </button>
      {showPrintHub && (
        <PrintHubModal
          voyage={voyage}
          voyageKey={voyageKey}
          onClose={() => setShowPrintHub(false)}
        />
      )}
      {/* V9.25: 🧪 검증 모드 — 검수원 '김성일' 선택 시에만 노출 (사용자 요청: "저만 보이게") */}
      {inspector === '김성일' && (
        <button onClick={() => setShowTestLab(true)}
          className="w-full bg-fuchsia-950/40 hover:bg-fuchsia-900/50 border border-fuchsia-700/50 rounded-pill p-3 flex items-center gap-3 active:scale-[0.98] transition">
          <span className="text-2xl">🧪</span>
          <div className="flex-1 text-left">
            <div className="font-bold text-fuchsia-200">검증 모드 (테스트 랩)</div>
            <div className="text-2xs text-fuchsia-300/70">검수확인 전체 취소 등 재검수 도구 — 성일님 전용</div>
          </div>
          <span className="text-fuchsia-300">›</span>
        </button>
      )}
      {showTestLab && inspector === '김성일' && (
        <TestLabModal voyage={voyage} voyageKey={voyageKey} onClose={() => setShowTestLab(false)}/>
      )}
      {/* M6.14: STOWAGE PDF 자동 분석 검토 모달 */}
      {stowagePdfFile && (
        <StowageReviewModal
          file={stowagePdfFile}
          inspector={inspector}
          voyage={voyage}  /* M6.14e: 항차 정보 자동 채우기용 */
          onClose={() => setStowagePdfFile(null)}
          onRegistered={() => {
            // 등록 성공 시 자동으로 모달 닫고 사용자에게 즉시 반영 안내
            setStatus('✅ 베이사전 등록 완료 — 새로고침하면 베이플랜에 반영됩니다');
          }}
        />
      )}
      {/* TallyOne 1.60: STOWAGE PDF·ASC **일괄 등록**도 여기서 뺐다.
          여는 버튼(베이사전 라이브러리)이 사라져 트리거가 없는 죽은 코드가 됐고,
          내용상으로도 자동 생성본을 대량으로 만드는 경로라 1.58-02 의 정본 원칙과 맞지 않는다
          (검수사 확정: 베이매트릭스 하나가 정본이고 사본이 정본을 고칠 수 없다).
          베이 구조는 수석 대시보드 「🧱 베이매트릭스」에서 한 척씩 만들고 확정한다. */}
      {/* V9.46: 이 항차의 메일함 폴더를 바로 펼친다 — 파일 창에서 찾아 들어갈 필요가 없다.
          지원 안 되는 브라우저(폰 등)에서는 아무것도 안 그리고 아래 파일 입력이 그대로 쓰인다. */}
      <MailboxFilePicker
        vessel={(voyage?.info?.vsl || String(voyageKey || '').split('_')[0] || '').trim()}
        voy={(mode === 'discharge' ? voyage?.info?.voy_d : voyage?.info?.voy_l)
             || voyage?.info?.voy
             || String(voyageKey || '').split('_').slice(1).join('_')}
        voyageKey={voyageKey}
        mode={mode}
        onEdi={handleEdiUpload}
        onList={handleListUpload}
        onXray={handleXrayUpload}
      />
      <div className="bg-ink-900 border border-line rounded-pill p-3">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400"/>
          1. EDI / ASC (필수) <span className="text-2xs text-cyan-400 font-normal">+ .def / STOWAGE PDF</span>
        </div>
        <input ref={ediRef} type="file" multiple accept="*/*"
          onChange={e => handleEdiUpload(e.target.files)}
          className="text-xs text-dim-200 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-700 file:text-blue-100 file:font-bold file:cursor-pointer"/>
        <div className="text-2xs text-dim-400 mt-1">
          현재 EDI 컨테이너: {Object.keys(sec.ediContainers || {}).length}대
          <br/>지원: .edi .asc .txt (확장자 무관, 내용으로 판별)
          <br/><span className="text-cyan-400">📚 .def (CASP) 같이 올리면 베이사전 자동 등록</span>
        </div>

        {/* M6.43: PDF 등록 + 베이사전 라이브러리 현황 통합 위젯 (자료 탭 상단으로 이동) */}

        {/* M5.11: 보관된 EDI 원본 + 재처리 버튼 */}
        {rawMeta?.text ? (
          <div className="mt-2 pt-2 border-t border-line-soft">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xxs text-emerald-400 font-bold">💾 EDI 원본 보관됨</span>
              <span className="text-2xs text-dim-400 mono">
                {(rawMeta.sizeBytes / 1024).toFixed(1)}KB
                · {rawMeta.parserVersion || '?'}
                {rawMeta.uploadedAt && ` · ${new Date(rawMeta.uploadedAt).toLocaleString('ko-KR', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}`}
              </span>
            </div>
            <button onClick={handleReprocess}
              className="mt-1.5 w-full bg-ink-750/60 hover:bg-ink-750 active:bg-ink-750 text-dim-100 px-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5">
              🔄 EDI 다시 분석 <span className="text-dim-300 font-normal">(선택사항)</span>
            </button>
            <div className="text-2xs text-dim-400 mt-1 leading-tight">
              필요시에만. 검수 입력(실번호/사진/완료/X-RAY)은 항상 보존됨.
            </div>
          </div>
        ) : null /* M5.27: "다음 EDI 업로드부터..." 안내 메시지 제거 — 사용자 혼란 유발 */}
      </div>

      <div className="bg-ink-900 border border-line rounded-pill p-3">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400"/>
          2. {mode === 'discharge' ? '양하' : '선적'} 리스트
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input ref={listRef} type="file" multiple
            accept="*/*"
            onChange={e => handleListUpload(e.target.files)}
            className="flex-1 text-xs text-dim-200 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-emerald-700 file:text-emerald-100 file:font-bold file:cursor-pointer"/>
          <button
            onClick={() => cameraRef.current?.click()}
            className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 flex-shrink-0"
            title="카메라로 종이 리스트 촬영"
          >
            <Camera className="w-3.5 h-3.5"/>📷
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={e => { handleListUpload(e.target.files); if (cameraRef.current) cameraRef.current.value = ''; }}
            className="hidden"/>
        </div>
        <div className="text-2xs text-dim-400">
          현재 리스트: {Object.keys(sec.records || {}).length}대
          <br/>📊 엑셀 (.xls .xlsx .csv) · 📄 PDF · 📷 사진 (자동 인식)
        </div>
      </div>

      {mode === 'discharge' && (
        <div className="bg-ink-900 border border-line rounded-pill p-3">
          <div className="text-sm font-bold mb-2 flex items-center gap-2">
            🔍 3. X-RAY 리스트 (양하만)
          </div>
          <input ref={xrayRef} type="file" multiple
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
            onChange={e => handleXrayUpload(e.target.files)}
            className="text-xs text-dim-200 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-purple-700 file:text-purple-100 file:font-bold file:cursor-pointer"/>
          <div className="text-2xs text-dim-400 mt-1">
            현재 X-RAY: {Object.keys(sec.xrayList || {}).length}대
            {(() => {   // V7.94-03: EDI/리스트에 없는 X-RAY 컨번호 노출 + V7.94-04: 잔존 키 정리 버튼
              //   업로드는 누적(merge) 방식 — 이전 업로드의 옛 키가 안 지워져 미매칭 잔존 발생 (사용자 제보)
              const cnSet = new Set([...Object.keys(sec.ediContainers || {}), ...Object.keys(sec.records || {})]);
              const um = Object.keys(sec.xrayList || {}).filter(cn => !cnSet.has(cn));
              if (um.length === 0) return null;
              const cleanUnmatched = async () => {
                if (!window.confirm(`미매칭 X-RAY ${um.length}대를 리스트에서 삭제합니다.\n${um.join(', ')}\n\n(EDI/리스트에 없는 번호 — 이전 업로드 잔존/오타)\n진행할까요?`)) return;
                const kept = {};
                Object.entries(sec.xrayList || {}).forEach(([cn, v]) => { if (cnSet.has(cn)) kept[cn] = v; });
                await fbSaveXrayList(voyageKey, kept);
                setStatus(`🧹 미매칭 X-RAY ${um.length}대 삭제 — 남은 ${Object.keys(kept).length}대`);
              };
              return (
                <span className="text-red-400 font-bold"> · ⚠미매칭 {um.length}대: {um.join(', ')} (EDI/리스트에 없는 번호)
                  <button onClick={cleanUnmatched}
                    className="ml-2 px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-red-100 font-bold">
                    🧹 미매칭 삭제
                  </button>
                </span>
              );
            })()}
            <br/>지원: .xls .xlsx
          </div>
        </div>
      )}

      {!hasOther && (
        <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-2">
          <div className="text-xs text-dim-300">이 항차에 {otherMode === 'discharge' ? '양하' : '선적'} 작업이 같이 있나요?</div>
          {/* M6.46: voy 입력 받기 — 추측하지 않음 */}
          <input
            type="text"
            value={otherVoyInput}
            onChange={e => setOtherVoyInput(e.target.value.toUpperCase())}
            placeholder={`${otherMode === 'discharge' ? '양하' : '선적'} 항차 번호 (예: ${otherMode === 'discharge' ? '0521E' : '0521W'})`}
            className="w-full bg-ink-800 border border-line rounded px-2 py-1.5 text-xs uppercase mono focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={async () => {
              const upVoy = otherVoyInput.trim().toUpperCase();
              if (!upVoy) {
                setStatus('❌ 항차 번호를 입력해주세요');
                return;
              }
              const patch = {};
              if (otherMode === 'discharge') patch.voy_d = upVoy;
              else patch.voy_l = upVoy;
              await fbUpdateVoyageInfo(voyageKey, patch);
              await fbSaveSectionData(voyageKey, otherMode, { _created: Date.now() });
              setOtherVoyInput('');
              setMode(otherMode);
            }}
            disabled={!otherVoyInput.trim()}
            className={`w-full py-2 rounded text-sm font-bold ${
              otherMode === 'discharge'
                ? 'bg-blue-900/50 hover:bg-blue-800 disabled:bg-ink-800 text-blue-100 border border-blue-700/40 disabled:text-dim-400'
                : 'bg-amber-900/50 hover:bg-amber-800 disabled:bg-ink-800 text-amber-100 border border-amber-700/40 disabled:text-dim-400'
            }`}
          >
            + {otherMode === 'discharge' ? '양하' : '선적'} 섹션 추가
          </button>
        </div>
      )}

      {status && (
        <pre className="bg-ink-950 border border-line rounded p-2 text-xxs text-dim-200 whitespace-pre-wrap mono">
{status}
        </pre>
      )}

      {/* M3.5.4-fix2: 충돌 검토 모달 */}
      <ConflictReviewModal
        open={!!conflictData}
        conflicts={conflictData?.conflicts}
        onClose={() => {
          setConflictData(null);
          setStatus(prev => prev + '\n\n❌ 저장 취소됨');
        }}
        onResolve={applyConflictResolution}
      />

      {/* M3.74: prompt() 대체 - EDI/리스트 업로드 충돌 처리 */}
      <ChoiceModal {...choiceState} />
    </div>
  );
}

function ModeSetup({ voyageKey }) {
  return (
    <div className="bg-amber-900/30 border border-amber-800 rounded-pill p-4 text-center mb-3">
      <div className="text-amber-200 text-sm mb-2">자료를 업로드해주세요</div>
      <div className="text-xxs text-amber-300/70">자료 탭에서 EDI/ASC 파일부터 시작하세요</div>
    </div>
  );
}

// M8.08: SealPolicyBanner 제거 — 양하/선적 작업 화면에서 엠티 실 작업 패널 미표시.
//   동일 기능은 수석 대시보드(ChiefDashboard)에 구현됨.

// ── V9.16: 이 항차 작업 보고 이력 (읽기 전용) ─────────────────────────
function WorkReportHistory({ voyageKey }) {
  const [reports, setReports] = useState({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const unsub = fbSubscribeWorkReports(voyageKey, setReports);
    return () => { try { unsub(); } catch { /* skip */ } };
  }, [voyageKey]);
  const list = Object.entries(reports || {})
    .map(([k, r]) => ({ k, ...(r || {}) }))
    .sort((a, b) => (b.ts || b.at || 0) - (a.ts || a.at || 0));
  if (list.length === 0) return null;
  return (
    <div className="bg-ink-900 border border-line rounded-pill overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left" style={{ minHeight: 44 }}>
        <span className="text-sm2 font-bold text-dim-100">📤 이 항차 작업 보고 {list.length}건 {open ? '접기' : '보기'}</span>
        <span className="text-dim-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 max-h-80 overflow-y-auto space-y-1">
          {list.slice(0, 50).map(r => (
            <div key={r.k} className="text-xs2 bg-ink-800/60 rounded px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-dim-100">{({work_status:'작업',hatch:'해치',conbox:'콘박스',daynight:'주야간',stop:'중단'}[r.type]) || r.type || '보고'}{r.action ? ` · ${r.action}` : ''}{r.equip ? ` · ${String(r.equip).endsWith('호기') ? r.equip : `${r.equip}호기`}` : ''}</span>
                <span className="text-dim-400 mono">{(r.ts || r.at) ? new Date(r.ts || r.at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              {(r.text || r.message || r.summary) && (
                <div className="text-dim-300 whitespace-pre-wrap mt-0.5 leading-snug">{String(r.text || r.message || r.summary).slice(0, 200)}</div>
              )}
              {r.by && <div className="text-dim-500 text-xxs mt-0.5">{r.by}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── TallyOne 1.42: 예보 카드 (항차 상세 · 리스트 탭) ─────────────────────────
//   EDI 가 오기 전까지 카톡 예보를 **리스트 형식**으로 보여주고, 같이 온 그림을 붙인다.
//   EDI(ediContainers)가 하나라도 들어오면 스스로 사라진다 — 예보는 실자료를 이기지 않는다.
//   ⚠ '자료 도착' 판정은 ediContainers 로만 한다. _created 같은 메타 키를 도착으로 오인하면
//     예보가 영영 안 보인다(V9.02-01 에서 RZOR_R075E 로 겪은 일).
function ForecastCard({ voyage, mode }) {
  const [zoom, setZoom] = useState(false);
  const f = voyage?.info?.forecast;
  if (!f) return null;
  if ((f.mode || 'loading') !== mode) return null;
  const sec = voyage?.[mode];
  if (sec && Object.keys(sec.ediContainers || {}).length) return null;

  const rows = [];
  const push = (label, obj, cls) => {
    for (const [size, n] of Object.entries(obj || {})) rows.push({ label, size, n, cls });
  };
  push('FULL', f.full, 'text-emerald-300');
  push('EMPTY', f.empty, 'text-sky-300');
  push('수화물', f.luggage, 'text-violet-300');
  if (!rows.length && !f.image) return null;

  const vans = (f.vans || {});
  const totVan = (vans.full || 0) + (vans.empty || 0) + (vans.luggage || 0);
  const totTeu = (f.teu && f.teu.total)
    || ((f.calc?.full || 0) + (f.calc?.empty || 0) + (f.calc?.luggage || 0));

  return (
    <div className="bg-ink-900 border border-dashed border-orange-600/60 rounded-pill p-3 mb-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-sm font-black text-orange-300">
          📋 {mode === 'loading' ? '선적' : '양하'} 예보{f.voy ? ` · ${f.voy}` : ''}
        </span>
        <span className="text-xxs font-bold text-orange-200">{totVan}대 · {totTeu}TEU</span>
        <span className="text-2xs text-dim-400 ml-auto">
          리스트(EDI)가 오면 이 카드는 사라지고 실자료로 바뀝니다
        </span>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs2">
            <thead>
              <tr className="text-dim-400 text-2xs border-b border-line">
                <th className="text-left py-1 pr-2 font-bold">구분</th>
                <th className="text-left py-1 pr-2 font-bold">규격</th>
                <th className="text-right py-1 pr-2 font-bold">대수</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line/70">
                  <td className={`py-1 pr-2 font-bold ${r.cls}`}>{r.label}</td>
                  <td className="py-1 pr-2 text-dim-100 font-mono">{r.size}</td>
                  <td className="py-1 pr-2 text-right text-dim-100 font-bold">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {f.image && (
        <div className="mt-2">
          <img src={f.image} alt="예보 그림" onClick={() => setZoom(true)}
            className="w-full rounded-pill border border-line bg-ink-950 object-contain max-h-72 cursor-zoom-in"/>
          <div className="text-2xs text-dim-400 mt-0.5">그림을 누르면 크게 봅니다</div>
        </div>
      )}
      {zoom && f.image && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2" onClick={() => setZoom(false)}>
          <img src={f.image} alt="예보 그림 크게" className="max-w-full max-h-full object-contain"/>
        </div>
      )}

      {f.raw && (
        <details className="mt-2">
          <summary className="text-2xs text-dim-400 cursor-pointer">카톡 원문 보기</summary>
          <pre className="text-2xs text-dim-300 whitespace-pre-wrap mt-1 leading-relaxed">{f.raw}</pre>
        </details>
      )}
    </div>
  );
}
