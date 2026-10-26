import React, { useMemo, useState, useEffect } from 'react';
import { FitBox } from '../components/FitBox.jsx';   // 3.48: 한 벌 — 베이뷰 작업과 공용
import { Users, Clock, Library, Ship, AlertTriangle, CheckCircle2, Trash2, Lock, FileSpreadsheet, Truck, Send } from 'lucide-react';   // 4.24: Anchor 는 옛 보드 머리와 함께 뺐다
import { fbApplyTermWork, fbSubscribeShipLibrary, fbSubscribeFeedback, fbResolveFeedback, fbDeleteFeedback, fbClearFeedback, db, fbSubscribeAllReports, fbDeleteWorkReport, fbClearAllReportsAllVoyages, fbClearAllActiveWork, fbArchiveVoyageBeforeDelete, fbDeleteVoyage, fbSubscribeBroadcast, fbSetBroadcast, fbClearBroadcast, fbSubscribeBroadcastReads, fbListArchive, fbListTallyPending, fbRestoreVoyageFromArchive, fbCleanupArchive, fbIsOnline, fbGetActivityDays, fbCleanupActivityLog } from '../firebase.js';   // TallyOne 1.3: 활동 로그 조회·정리
import { isOwnerName } from '../adminGuard.js';   // TallyOne 1.3: 활동 로그는 소유자 전용(판2 "저만 다 볼수있게")
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies, isLoloShipByPolicy } from '../shipPolicies.js';
import { matchPortMis } from '../portMisMatch.js';   // 2.78: PORT-MIS 호출 한 벌
import { resolvedPod, ptkDischargeUnitsOf, keepInShiftOf } from '../utils.js';   // 4.53: keepInShiftOf — 선적 EDI 가 확정한 본선 잔류를 EDI 평택분에서 뺀다 · 3.53: POD 확정 반영 한 벌 · 4.20 감사: 양하 평택분 한 벌
import { isoShown, inspectionSealOf } from '../utils.js';   // 4.49: inspectionSealOf — 큰 실(세관 값) 한 벌   // 4.21: 내부 풀·엠티 표식을 정본 규격 글자로 보여 준다
import { ferryReportCuts } from '../utils.js';   // 4.24 2차: 상황판 상태 줄 «📋 보고 보관 N» — 카페리 창(Ferry1700Alert audience chief)과 같은 한 벌
import { isPyeongtaekPort, ownDirCns, isBookingSlot, bookingFillOfSec, emptySealSpec, equipReportBoard, parsePortMisDateTime, computeTermApply , shiftSplitOf, isShiftOffPtk, progressOf, isWorkingNow, craneBoardOf, boardBaysOf, legendLiveOf, bayDoneSplitOf, bayDoneTextOf, emptySplitLabel, completedByLabel, fullEdiMapOf, applySwapFix, swapFixList, pickCarrierOp, pickDischargePol } from '../utils.js';   // 3.10: 작업 보드는 «작업 중»만 · 3.11: 보이는 베이 + 별첨 실시간   // V9.57: 장비 표 동적화(I1) // TallyOne 1.0: 일정 파싱(L3)  // 1.40-01: planWorkStart 제거(🛠 줄 삭제로 미사용)
import { healthSummary, heartbeatState } from '../health.js';  // TallyOne 1.0(L1): 수집기 상태 배너 — HomePage 204행과 같은 판정 헬퍼
// TallyOne 1.7: 마감 서류 폴더 직결 — 다운로드를 거치지 않고 TALLYBOX에 바로 쓴다.
import { isTallyboxSupported, pickTallyboxRoot, getSavedTallybox, requestWritePermission, readyRoot, writeTallyboxFile } from '../tallyboxFs.js';
import { folderName, fileNameFor } from '../data/tallyBoxRules.js';
import KakaoLogImportModal from '../components/KakaoLogImportModal.jsx';   // TallyOne 1.8-15
import BayMatrixManagerModal from '../components/BayMatrixManagerModal.jsx';   // 1.60: 베이매트릭스 관리
import { buildLoloRows, buildActualSealListText, buildLoadingListText, downloadText } from '../loloReport.js';
import PortMisCaptureModal from '../components/PortMisCaptureModal.jsx';  // V9.42: 홈 상단에서 이리로 이동
import PierRegisterModal from '../components/PierRegisterModal.jsx';   // 3.54: 부두 좌표 등록
import RefreshDataButton from '../components/RefreshDataButton.jsx';   // TallyOne 1.5
import { collectActualLoading, buildActualBaplie, buildActualAsc, buildEditExcel, parseEditExcel, detectEdiVer } from '../loadingEdiExport.js';   // 1.88: 받은 판대로 생성
import { isChief, canOpenChief, isVisibleStaff } from '../staffList.js';   // 1.41: 화면 접근은 canOpenChief, 기능 권한은 isChief 그대로
import { computeTallyData, emptySealSpecTally } from '../tallyReport.js';   // V9.19-01: 마감 텔리(수석 전용 이동)
import { generateEmptySealReport } from '../components/EmptySealReport.jsx';
import EmptyFindPanel, { maerskEmptyCards } from '../components/EmptyFindPanel.jsx';   // 3.73: 머스크 엠티 찾기
import { buildReadiness } from '../dataReadiness.js';   // 1.66: 자료 다 왔나 · 빠진 것은 무엇인가
import { fbSubscribeShipBayDict } from '../firebase.js';   // 1.66: 선사를 베이사전에서 보강
import ConfirmModal, { useConfirm } from '../components/ConfirmModal.jsx';
import ChiefBayEdit from '../components/ChiefBayEdit.jsx';
import BayPlan from '../components/BayPlan.jsx';   // 3.11: 실시간 작업 보드 — 호기가 지금 작업 중인 베이 한 장(onlyBay)
import { getShipBayDictData } from '../shipStructure.js';   // ★ 3.15: 보드가 세는 해치를 그림과 같은 장으로 묶으려면 베이사전이 필요하다
import { buildBayPagesFromSummary } from '../cargoPlanCore.js';   // ★ 3.15: 장 목록 — BayPlan 이 쓰는 것과 같은 한 벌
import ContainerDetailModal from '../components/ContainerDetailModal.jsx';   // 3.11: 보드 그림의 칸을 누르면 컨 상세(베이플랜과 같은 모달 — 검수사 «베이플랜과 동일하게»)
import LoadingPlanEdit from '../components/LoadingPlanEdit.jsx';
import { shipOpMapper } from '../data/tallyFormats.js';
import GlobalSearchPage from './GlobalSearchPage.jsx';   // 2.03-02: 대시보드 안 인라인 통합검색(화면 전환 없음)
import ScrollTopButton from '../components/ScrollTopButton.jsx';   // 2.82-02: TOP 버튼 공용 한 벌(여기 있던 것을 올렸다)
import Ferry1700Alert from '../components/Ferry1700Alert.jsx';   // 3.63: 카페리 17시 갱별 주간 작업보고 — 수석은 작업 중인 배 모아 보기
import TermBoardPanel, { hasTermBoard } from '../components/TermBoardPanel.jsx';   // 4.03: 검수원이 호기를 안 찍어 그림이 안 그려질 때 터미널 본선 현황(PCTC·동방)을 보인다
import ShiftSnapPanel from '../components/ShiftSnapPanel.jsx';   // 4.11: 교대 시각(06:30·17:30) 터미널 기준 — 소유자 메뉴 안
import AiCostPanel from '../components/AiCostPanel.jsx';   // 4.37: AI 비용 — 미르·사진 읽기 클로드 비용과 Console 숫자(소유자 메뉴 안)

// TallyOne 1.0: null 방어용 고정 빈 객체 — prop이 null로 와도 참조가 안 바뀌어 useMemo가 헛돌지 않는다
const _EMPTY_OBJ = {};

// TallyOne 1.0(L2/L3): 항차 일정 합성 — 우선순위는 HomePage 258행과 동일(선석배정 > 도선 예보).
//   PORT-MIS 자료는 이 화면에 없으므로 후보에서 제외. 전부 없으면 null(화면에 '자료 없음' 명시).
function scheduleOf(info, pfMap) {
  const pf = (pfMap || {})[(info?.vsl || '').toUpperCase()] || null;
  const pd = String(info?.planDate || '');
  const pdEta = pd ? parsePortMisDateTime(pd.split('~')[0].trim()) : null;
  const pdEtd = pd.includes('~') ? parsePortMisDateTime(pd.split('~')[1].trim()) : null;
  const pfArr = pf ? parsePortMisDateTime(pf.nextArr) : null;
  const pfDep = pf ? parsePortMisDateTime(pf.nextDep) : null;
  return { pf, planDate: pd, planSrc: String(info?.planSrc || ''),
           etaMs: pdEta ?? pfArr, etdMs: pdEtd ?? pfDep };
}

// ── TallyOne 1.6: 마감 텔리 대상 판정 ─────────────────────────────────────────
//   사고 (2026-08-04) — 수석이 마감 텔리 「엑셀 생성」을 눌렀는데 **엉뚱한 항차**가 나왔다.
//     목록이 `info`만 있으면 전부 넣고 `createdAt` 내림차순으로 세웠다. 그래서
//       TNJP 26356E & 26356W ← 맨 위 (오늘 12:22 예정 등록, 입항 8/6, 작업한 적 없음)
//       TNJP 26355E & 26355W ← 13번째 (7/30 등록, 오늘 실제 작업·완료)
//     같은 TNJP 두 줄 중 위엣것이 아직 배도 안 온 항차였다. 등록 시각 정렬이 원인.
//
//   검수사 확정 흐름 — 「수석 완료 저장」이 마감의 방아쇠다.
//     작업중/검수 완료 → (잠김)  ─ 수석 완료 저장 ─→  보관소 이동 → 마감 텔리 활성
//     "완료 처리가 안되면 눌리면 안됩니다. 수석이 완료로 저장하면 마감텔리에 불이 들어 오게"
//     최종형은 완료 저장 즉시 텔리·마감자료가 TALLYBOX로 자동 생성. 지금은 시험 중이라
//     조각을 떼어 둔 상태이므로 **순서만 강제**한다(자동 생성은 당기지 않는다).
//
//   ⚠ 완료 **기록**(discharge/loading.completed)을 신호로 쓰면 안 된다.
//     TNJP 26355E 실측: dischargeDone·loadingDone 둘 다 true(12:34)인데 completed 는 null.
//     지금은 시험 운용이라 컨을 하나씩 확인하지 않고 완료만 누른다(검수사 확인 2026-08-04).
//     앱이 완성되면 한 대라도 남을 때 완료 버튼이 잠기므로 done 플래그가 곧 전량 확인을 뜻한다.
//     즉 completed 는 지금은 항상 0이고 나중엔 중복이라 쓸 이유가 없다.
//
//   반환: null(입항 전 — 목록에 없음) | 'working'(작업중) | 'done'(검수 완료·수석 대기)
export function tallyTargetState(v, pfMap, now = Date.now()) {
  const info = v?.info;
  if (!info) return null;
  if (info.dischargeDone || info.loadingDone || info.inspectorDone) return 'done';
  const sched = scheduleOf(info, pfMap);
  if (isWorkingNow(v, now)) return 'working';               // 터미널이 «작업 중»이라고 적었다(배정목록 작업시작·동방 호기별 실적 — utils 한 벌)
  if (sched.etaMs != null && sched.etaMs <= now) return 'working';  // 작업 시작 시각이 지났다
  return null;                                             // 아직 배가 없다
}

// TallyOne 1.6: 마감 텔리 목록에 올릴 보관소 하한.
//   보관소에는 1년치(fbCleanupArchive 365일)가 쌓여 있고 그 대부분은 이 기능이 생기기 전에
//   사람이 수기로 만들어 보낸 것들이다. 전부 '미작성'으로 띄우면 목록이 거짓말을 한다.
//   → 이 기능 도입일 이후 완료 저장된 것만 올린다. 그 이전 것은 [완료 보관소] 메뉴에서 본다.
export const TALLY_LIST_SINCE = new Date('2026-08-04T00:00:00+09:00').getTime();

export default function ChiefDashboard({ voyages, inspectors, inspector, onOpenVoyage, onGoHome, onOpenGlobalSearch,
  onMirPlan = null,   // 2.87: 미르 플랜 덮개 — 이 화면을 떠나지 않는다
  // TallyOne 1.0: 팀K가 App에서 전달하는 새 prop 3개 — 전부 옵셔널(미전달·null이어도 기존 화면 동작 불변)
  collectorHb = null, pilotForecast = null, portMisData = null,   // 1.40-01: 🚢신고도착
  onRefreshData, refreshing = false, refreshedAt = 0,   // TallyOne 1.5: 화면 데이터만 새로고침
  onOpenStaffManager = null,   // 4.11: 소유자 메뉴 안 «인원 관리» — 헤더 ⋮ 메뉴와 같은 창(App 이 넘긴다)
}) {
  //  ★ 4.24 — 수석 상황판(검수사 2026-10-12 «화면이 복잡하고 난해 합니다 … 간결하고 보기 좋게» · 불편 «한 화면에 항목이 너무 많다 · 글자가 작아 안 보인다 · 어디에 뭐가 있는지 찾기 어렵다»
  //    · «칩(수석)은 근무중 켜놀것이고 전 필요 할때만 컴과 폰으로 봅니다»). 위 9블록(제목·수집기 배너·BigStat·검색 폼·바로가기 20·접힘 17)을 상태 줄 한 줄과 탭 셋으로 옮겼다.
  //    탭 — ⚓ 상황판(실시간 작업 보드가 첫 화면 전체) · 📋 진행·마감(진행 상황·완료 저장 + 문 다섯) · 🧰 관리(묶음 넷 + 소유자). 기능은 하나도 안 뺐다 — 자리만 옮겼다.
  //    검색 입력칸은 없앴다(B1 «검색창을 없애고 미르로») — 통합 검색 화면은 관리 › 사람·알림 «🔍 통합 검색» 에 그대로 있다.
  const [tab, setTab] = useState('board');
  const [mgGroup, setMgGroup] = useState(null);   // 관리 묶음 — 컴은 하나를 골라 오른쪽에 펴고(없으면 «자료»), 폰은 누른 묶음만 펴는 아코디언(평소엔 닫힘 — A6)
  const [phoneSheet, setPhoneSheet] = useState(null);   // 폰 — 누른 배 하나를 전체화면 시트로(컴의 «행 클릭 = 그 배만 전체화면» 과 같은 재료)
  //  배치는 폭으로 가른다(A1 «컴용화면 폰용화면이 달라야 합니다 … 디자인 구성 배치가 달라야») — 700px 미만 폰(카드·시트) · 이상 컴(보드 전폭). 기준은 독(hud-dock)의 700px 경계와 같다.
  const [wideUI, setWideUI] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 700));
  useEffect(() => {
    const on = () => setWideUI(window.innerWidth >= 700);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const chief = isChief(inspector);  // V7.94-18: 완료 권한 — 수석검수/부수석만
  const owner = isOwnerName(inspector);   // TallyOne 1.3: 활동 로그 섹션 — 소유자가 아니면 렌더 자체를 안 한다
  // 1.41: **화면을 여는 권한**은 따로다. 개발용 접근 명단에 든 사람도 이 화면을 볼 수 있다.
  //   ⚠ chief 는 그대로 둔다 — 마감 텔리 생성·아카이브 복원·정리·최종 저장은 여전히 수석만.
  //   종전 이 자리의 가드는 isChief 뿐이라 **소유자조차 직책이 수석이 아니면 막혔다**(App 게이트와 불일치).
  const canOpen = canOpenChief(inspector, owner);
  const pfMap = pilotForecast || _EMPTY_OBJ;   // TallyOne 1.0: null 방어
  // TallyOne 1.6-01: 마감 텔리 대기 목록 — **작은 색인 노드 하나만** 읽는다.
  //   1.6에서 fbListArchive()(키 1건당 get 7회 × 보관소 160건 = 1,120요청)를 대시보드 열 때마다
  //   돌려 화면이 멈췄다. 목록 때문에 보관소를 훑지 않는다.
  // TallyOne 1.7: TALLYBOX 폴더 직결 — "크롬은 폴더를 지정해야 하고 엣지는 다운로드로 가고
  //   일관성이 없음"(검수사 2026-08-04). 루트를 **한 번만** 지정받아 IndexedDB에 두면
  //   그 뒤로는 안 묻는다. 마감 텔리·실선적 EDI·ASC 가 모두 이 핸들을 쓴다.
  const [boxRoot, setBoxRoot] = useState(null);
  React.useEffect(() => { readyRoot().then(setBoxRoot).catch(() => {}); }, []);
  const onPickBox = React.useCallback(async () => {
    const h = await pickTallyboxRoot();            // 사용자 클릭 안에서만 열린다
    setBoxRoot(h);
    return h;
  }, []);
  // 저장은 돼 있는데 권한이 'prompt' 로 식은 경우가 있다 — 버튼 클릭 안에서 조용히 되살린다.
  const resolveBox = React.useCallback(async () => {
    if (boxRoot) return boxRoot;
    try {
      const saved = await getSavedTallybox();
      if (saved && (await requestWritePermission(saved)) === 'granted') { setBoxRoot(saved); return saved; }
    } catch { /* 폴백: 다운로드 */ }
    return null;
  }, [boxRoot]);

  const [arcList, setArcList] = useState(null);
  const reloadArchive = React.useCallback(() => {
    if (!isChief(inspector)) return;
    fbListTallyPending().then(setArcList).catch(e => console.warn('[마감텔리] 대기 목록 조회 실패:', e));
  }, [inspector]);
  React.useEffect(() => { reloadArchive(); }, [reloadArchive, refreshedAt]);
  // V9.19-02(2026-07-28): 대시보드가 길어 항목을 한참 찾아 내려가야 했다(사용자 보고).
  //   상단 바로가기 + 항목별 접기(버튼 누르면 보임). 작업 보드·진행 상황만 기본 펼침.
  //   4.24: 작업 보드·진행 상황은 접힘이 아니라 탭이 됐다 — 남은 접힘은 전부 평소엔 닫혀 있다(A6).
  const [openSecs, setOpenSecs] = useState({});
  const [boardFocus, setBoardFocus] = useState(null);
  const [boardDetail, setBoardDetail] = useState(null);   // 3.11: 보드 그림에서 누른 컨 {key, mode, c}   // 3.10: 보드에서 고른 배 — 그 배만 전체(검수사 «선박을 선택하면 그 선박만 전체화면, 닫으면 다시 다»)
  // TallyOne 1.66 — 자료 현황. 검수사 지시: *"빠졌다면 뭐가 어느 선사 자료가 비었음을 알리고."*
  //   선사는 항차 info.carrier 가 비어 있는 일이 많아(2026-08-13 실측) 베이사전에서 보강한다.
  const [bayDictAll, setBayDictAll] = useState(null);
  useEffect(() => {
    let off = null;
    try { off = fbSubscribeShipBayDict((d) => setBayDictAll(d || {})); } catch (e) { /* 없어도 선사만 빈다 */ }
    return () => { try { off && off(); } catch (e) {} };
  }, []);
  const readiness = useMemo(() => buildReadiness(voyages, bayDictAll), [voyages, bayDictAll]);
  const [showPier, setShowPier] = useState(false);   // 3.54: 부두 좌표 등록(홈에서 옮겨 옴)
  const [showPortMis, setShowPortMis] = useState(false);   // V9.42: 홈 상단에서 옮겨온 PORT-MIS 캡처
  const [showBayMatrix, setShowBayMatrix] = useState(false);   // 1.60: 베이매트릭스 관리(업로드 화면에서 분리)
  const toggleSec = (id) => setOpenSecs(o => ({ ...o, [id]: !o[id] }));
  const jumpSec = (id) => {
    setOpenSecs(o => ({ ...o, [id]: true }));
    setTimeout(() => { try { document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* skip */ } }, 60);
  };
  //  4.24: 상태 줄 칩(오답·누락)이 여는 자리 — 탭 → (관리 묶음) → 그 항목을 펴고 그리로 간다.
  const goTo = (t, group, secId) => {
    setTab(t);
    if (group) setMgGroup(group);
    if (secId) jumpSec(secId);
  };
  //  4.24: 위험 구역(모든 작업 보고 삭제)의 «한 번 더 묻기» — 기존 ConfirmModal 을 한 벌 더 둔다(D9 «수석은 한번 실수로 … 많은 자료를 잃을수가»).
  //    이 창에서 [예] 를 눌러야 종전 삭제 확인창으로 넘어간다. [취소] 면 아무것도 안 쓴다. (4.39: 마감적용은 검수사 2026-10-19 지시로 기능째 없앴다)
  const [dangerState, askDanger] = useConfirm();
  const [editKey, setEditKey] = useState(null); // V7.97: 베이상세 편집 대상 항차 (수석/관리자만)
  const [planKey, setPlanKey] = useState(null); // V9.07: 컨펌용 플랜편집 대상 항차
  const [shipLib, setShipLib] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showResolved, setShowResolved] = useState(false);
  const [extraPolicies, setExtraPolicies] = useState({});
  const [allReports, setAllReports] = useState([]);  // M3.5.6: 작업 보고 이력
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  // TallyOne 1.0(L5): 결과 통지 alert() → 섹션 안 인라인 알림 — 확인창(confirm) 성격은 유지
  const [fbNotice, setFbNotice] = useState(null);     // 오답 저금통(내보내기·비우기)
  const [repNotice, setRepNotice] = useState(null);   // 작업 보고(전체 삭제·개별 삭제)
  const [loloNotice, setLoloNotice] = useState(null); // LOLO 내보내기
  useEffect(() => {
    const u1 = fbSubscribeShipLibrary(setShipLib);
    const u2 = fbSubscribeFeedback(setFeedback);
    const u3 = fbSubscribeShipPolicies(db, setExtraPolicies);
    // V9.57(I3): 100건 절단으로 다항차·다보고 날에 "오늘 통계"가 조용히 모자랐다 — 300건으로 상향.
    //   그래도 넘치면 장비 표 헤더에 "최근 300건 기준" 캡션으로 절단 사실을 밝힌다(아래 렌더부).
    const u4 = fbSubscribeAllReports(setAllReports, 300);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // TallyOne 1.0(L1): 수집기 생존 판정용 시계 — HomePage 199~203행과 같은 30초 틱.
  //   끊김 기준은 heartbeatState(사이클 주기×2분, 사용자 확정 2026-07-03) 그대로 쓴다.
  const [hbNow, setHbNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setHbNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const hbView = heartbeatState(collectorHb, hbNow);
  // TallyOne 1.0(L1): 항차 건강 요약 — 홈 배지와 같은 healthSummary, 클릭 시 #/health 이동
  const healthIssueCount = useMemo(() => healthSummary(voyages).issueCount, [voyages]);

  // M3.5.6: 오늘 장비별 작업 보고 통계
  //   3.64-01: 부두 → 호기 두 단(utils.equipReportBoard) — 같은 4호기라도 PCTC·PNCT 는 따로 센다
  //   (검수사 2026-09-28 A안 «부두별 줄» · «두 부두 줄 늘»). 부두는 보고의 항차(voyageKey)로 찾는다.
  const equipBoard = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return equipReportBoard(allReports, voyages, today.getTime());
  }, [allReports, voyages]);

  // 최근 작업 보고 (시간순)
  const recentReports = useMemo(() => {
    return (allReports || []).slice(0, 30);
  }, [allReports]);

  // M3.5.5: 엠티 실 작업 중인 항차 (실시간 부착 현황)
  const sealVoyages = useMemo(() => {
    const list = [];
    Object.entries(voyages || {}).forEach(([key, v]) => {
      const policy = matchShipPolicy(v?.info?.vsl || '', extraPolicies);
      if (!policy || !policy.mode || policy.mode === 'none') return;   // 1.83: «일반» 배는 실 카드 없음(LOLO 는 별도 경로라 무관)
      // M8.08: 엠티 실 작업은 선적(loading) 때만 적용. 양하는 제외.
      //   (양하 EDI엔 엠티 실 부착·확인 개념이 없음 — 선적 시 부착/확인하는 작업.)
      // V9.57(I5): 죽은 분기 정리 — ['loading'] 순회 안에서 discharge 비교하던 삼항 제거, mode 상수화.
      {
        const mode = 'loading';
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const targets = [];
        // V9.57(I5): 모수를 EDI만 → EDI∪리스트(records) 합집합으로 (LOLO 카드 156행과 동일 규칙).
        //   EDI 없이 리스트만 올라온 선적분(엠티 실 대상)이 현황에서 통째로 빠지던 것.
        const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
        allCnSet.forEach(cn => {
          const e = ediMap[cn];
          const r = recMap[cn] || {};
          const c = e ? { ...e } : { ...r, cn };
          // V8.98-11: 부킹슬롯(__BOOK_ 예상자리, 실번호 없음) 제외 — 가상 엠티리스트 방지
          if (isBookingSlot(c)) return;
          // 평택만 — EDI가 있으면 POL로 판정. 리스트만 있으면 평택 선적 리스트(세관) 자체가
          // 평택분이므로 통과 (리스트 레코드엔 pol이 없어 판정 불가).
          if (e && !isPyeongtaekPort(c.pol)) return;
          const sm = applyPolicyToContainer(policy, c);
          if (!sm) return;
          // record로 보강 (eseal 등)
          targets.push({
            ...c,
            eseal: r.eseal || c.eseal || '',
            eseal_wrong: r.eseal_wrong || '',
            reseal: r.reseal || '',
            eseal_by: r.eseal_by || '',
            eseal_at: r.eseal_at || 0,
            _sealMode: sm,
          });
        });
        if (targets.length > 0) {
          // 최근 활동순 정렬 (eseal 있는 것 먼저, 없는 것은 위치순)
          targets.sort((a, b) => {
            if (a.eseal && b.eseal) return (b.eseal_at || 0) - (a.eseal_at || 0);
            if (a.eseal) return -1;
            if (b.eseal) return 1;
            return `${a.bay}-${a.row}-${a.tier}`.localeCompare(`${b.bay}-${b.row}-${b.tier}`);
          });
          list.push({
            voyageKey: key,
            voyage: v,
            mode,
            policy,
            targets,
            done: targets.filter(c => c.eseal).length,
            total: targets.length,
          });
        }
      }
    });
    return list;
  }, [voyages, extraPolicies]);

  // V8.06: LOLO 항차 감지 — 컨테이너에 베이 위치가 하나도 없으면 LOLO/IFCSUM 선박.
  //   각 모드(양하/선적)별로 처리된(completed) 건이 있으면 제출 리스트 내보내기 대상.
  const loloVoyages = useMemo(() => {
    const list = [];
    Object.entries(voyages || {}).forEach(([key, v]) => {
      ['discharge', 'loading'].forEach(mode => {
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const ediArr = Object.values(ediMap);
        const recArr = Object.values(recMap);
        // V8.09: EDI 없이 리스트(records)만 있어도 LOLO 카드 생성.
        //   RIZHAO 선적분처럼 IFCSUM/BAPLIE 없이 LOADING LIST 엑셀만 들어오는 경우,
        //   EDI 유무로만 판정하면 선적 카드가 안 떠 "선적이 어디 있나" 문제 발생.
        //   기준: EDI∪리스트에 컨테이너가 있고, 위치좌표(bay/row/tier)가 하나도 없으면 LOLO.
        //   일반 베이 선박은 EDI/리스트에 bay가 있어 isLolo=false → 영향 없음.
        const allArr = [...ediArr, ...recArr];
        if (allArr.length === 0) return;
        // V8.09-07: LOLO 판정을 선박정책(lolo 플래그) 기반으로 변경 (사용자 확정 2026-06-18).
        //   기존 "모든 컨에 bay/row/tier 없음"은 일반 베이 선박(TPMZ 등)이 위치정보 없이
        //   올라오면 LOLO로 오판 → 수석대시보드에 LOLO 리스트 잘못 생성. LOLO는 RZOR만.
        //   선박명/항차코드(voy)로 정책 매칭 후 lolo===true인 선박만 LOLO 카드 생성.
        const hints = [v?.info?.voy, v?.info?.voyage, v?.info?.callsign].filter(Boolean);
        const isLolo = isLoloShipByPolicy(v?.info?.vsl || '', extraPolicies, hints);
        if (!isLolo) return;
        const compMap = sec.completed || {};
        const doneCount = Object.keys(compMap).length;
        // M8.08: 컨테이너별 처리 상태 목록 — 실시간 표용. 리스트(세관) 기준 EDI∪records 합집합.
        const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
        const rows = [...allCnSet].map(cn => {
          const e = ediMap[cn] || {}, r = recMap[cn] || {};
          const comp = compMap[cn] || null;
          return {
            cn,
            iso: r.iso || e.iso || '',
            fe: r.fe || e.fe || '',
            sl: (r.sl ? inspectionSealOf({ ...e, ...r, cn, slEdi: e.sl || '' }) : '') || e.sl || '',   // 4.49 감사(하-7): 큰 실(세관 값 · 고쳤으면 실물) — 작업 화면과 같은 값
            done: !!comp,
            by: completedByLabel(comp, v?.info || null),   // 3.16: 완료자 표기 한 벌(업체 글자 금지)
            at: comp?.at || comp?.ts || 0,
          };
        });
        // 처리된 것 먼저(최근순), 미처리는 컨번호순.
        rows.sort((a, b) => {
          if (a.done && b.done) return (b.at || 0) - (a.at || 0);
          if (a.done) return -1;
          if (b.done) return 1;
          return a.cn.localeCompare(b.cn);
        });
        list.push({
          voyageKey: key,
          voyage: v,
          mode,
          vsl: v?.info?.vsl || '',
          // TallyOne 1.45-03: 항차 표기를 **모드별**로 고른다 (검수사 신고 2026-08-10 —
          //   "선적 리스트라고 해놓고 양하 항차 표기함", RZOR 선적 카드에 R085E).
          //   항차 키가 양하로 만들어지면 `info.voy` 가 양하 항차라, 선적 카드도 그것을 그대로 썼다.
          //   데이터에는 `voy_l`(RZOR=R085W)이 멀쩡히 있다. 기준은 inspectionList.js:216 과 같은 벌.
          //   ⚠ 이 값은 카드 표시뿐 아니라 **내보내기 meta**(제출 리스트 파일 머리)에도 들어간다.
          voy: (mode === 'loading'
            ? (v?.info?.voy_l || v?.info?.voy || v?.info?.voy_d)
            : (v?.info?.voy_d || v?.info?.voy || v?.info?.voy_l)) || v?.info?.voyage || '',
          total: allCnSet.size,        // 리스트(세관) 기준 전체.
          done: doneCount,
          rows,
          sec,
        });
      });
    });
    return list;
  }, [voyages, extraPolicies]);

  // LOLO 제출 리스트 내보내기 (두 양식)
  const exportLolo = (item, kind) => {
    const rows = buildLoloRows(item.sec);
    if (rows.length === 0) { setLoloNotice({ kind: 'err', text: '처리(완료)된 컨테이너가 없습니다. 검수사가 실체크·확인한 뒤 내보낼 수 있습니다.' }); return; }  // TallyOne 1.0(L5)
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const meta = { vsl: item.vsl, voy: item.voy, date: stamp, port: 'PYEONGTAEK, KOREA', mode: item.mode };
    const modeKo = item.mode === 'discharge' ? '양하' : '선적';
    if (kind === 'seal') {
      downloadText(`LOLO_실번호리스트_${item.vsl}_${modeKo}_${stamp}.txt`, buildActualSealListText(meta, rows));
    } else {
      downloadText(`LOLO_검수리스트_${item.vsl}_${modeKo}_${stamp}.txt`, buildLoadingListText(meta, rows));
    }
  };

  // 오답 리포트 정렬 (최신순, 미해결 먼저)
  const feedbackList = useMemo(() => {
    // V9.36-02: 콘앱 신고는 POST(푸시키)라 ts 필드가 없다 — 배지엔 세어지고 목록엔 안 보이는
    //   유령 레코드가 됐다(미해결 1 · "미해결 오답 없음" 모순, 실DB 2026-07-04 1건으로 확인).
    //   DB 키를 _key로 붙이고 ts는 ts→at 폴백. 카운트·목록·해결처리 모두 같은 레코드를 본다.
    return Object.entries(feedback || {})
      .map(([k, f]) => (f ? { ...f, _key: k, ts: f.ts || f.at || 0 } : null))
      .filter(f => f && f.ts)
      .filter(f => showResolved || !f.resolved)
      .sort((a, b) => {
        // 미해결 먼저
        if (!!a.resolved !== !!b.resolved) return a.resolved ? 1 : -1;
        return (b.ts || 0) - (a.ts || 0);
      });
  }, [feedback, showResolved]);

  // V9.57(I6): 배지도 목록(feedbackList)과 같은 모수 — ts→at 폴백 후 ts 없는 유령 레코드 제외.
  //   종전엔 ts 필터 없이 세어 배지 숫자와 목록 건수가 어긋날 수 있었다(V9.36-02 유령 레코드 패턴).
  const unresolvedCount = useMemo(() =>
    Object.values(feedback || {})
      .map(f => (f ? { ...f, ts: f.ts || f.at || 0 } : null))
      .filter(f => f && f.ts && !f.resolved).length, [feedback]);

  // TallyOne 1.19: **미회신**(클로드가 아직 답을 안 단 것) — '미해결'(사람이 ✓ 를 안 누른 것)과 다르다.
  //   배너는 미회신을 센다. 답이 붙었으면 검수사가 볼 것이 있는 상태라 급하지 않다.
  const unansweredCount = useMemo(() =>
    Object.values(feedback || {})
      .filter(f => f && (f.query || '').trim() && !f.claudeStatus && !f.resolved).length, [feedback]);

  // V8.02-02: 오답 '저금통' 내보내기 — 전체를 텍스트 파일로 다운로드.
  //   클로드(또는 개발자)에게 파일 하나로 전달하기 위함. 내보낸 시점의 ts 목록을 기억.
  // V9.57(I6): 내보내기·비우기도 목록(213행대)과 동일하게 _key·at 폴백 적용.
  //   종전엔 Object.values + f.ts 필터라 콘앱 신고(푸시키, ts 없음)가 내보내기에서 빠지고,
  //   비우기도 ts를 키로 삼아 푸시키 레코드를 못 지웠다. 이제 실제 DB 키(_key)로 삭제한다.
  const [exportedTs, setExportedTs] = useState([]);   // 내용물은 feedback DB 키(_key) 목록
  const exportFeedback = () => {
    const all = Object.entries(feedback || {})
      .map(([k, f]) => (f ? { ...f, _key: k, ts: f.ts || f.at || 0 } : null))
      .filter(f => f && f.ts)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (all.length === 0) { setFbNotice({ kind: 'err', text: '내보낼 오답 리포트가 없습니다.' }); return; }  // TallyOne 1.0(L5)
    const lines = [];
    lines.push('# Tallyman 음성/질문 오답 리포트');
    lines.push(`# 내보낸 시각: ${new Date().toLocaleString('ko-KR')}`);
    lines.push(`# 총 ${all.length}건 (미해결 ${all.filter(f => !f.resolved).length}건)`);
    lines.push('');
    all.forEach((f, i) => {
      const d = new Date(f.ts);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      lines.push(`[${i + 1}] ${ds} · ${f.inspector || '익명'} · ${f.resolved ? '해결됨' : '미해결'} · v${f.appVersion || '?'}`);
      lines.push(`  선박: ${f.voyageVsl || '-'}`);
      lines.push(`  질문(Q): ${f.query || ''}`);
      lines.push(`  답변종류: ${f.answerType || '?'}`);
      if (f.answerText) lines.push(`  앱이 한 답: ${f.answerText}`);
      if (f.userNote) lines.push(`  검수사 메모: ${f.userNote}`);
      if (f.parsedSummary && Object.keys(f.parsedSummary).length) {
        lines.push(`  파싱: ${JSON.stringify(f.parsedSummary)}`);
      }
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `오답리포트_${stamp}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedTs(all.map(f => f._key));   // V9.57(I6): 비우기 대상 = 방금 내보낸 것의 실제 DB 키
    setFbNotice({ kind: 'ok', text: `✅ 오답 ${all.length}건 내보냄 — 파일 다운로드 확인 후 [비우기]를 누르세요.` });  // TallyOne 1.0(L5)
  };
  // 내보낸 것만 비우기(안 본 것 보호). 내보내기 후에만 활성.
  const clearExported = async () => {
    if (exportedTs.length === 0) { setFbNotice({ kind: 'err', text: '먼저 내보내기를 하세요. 내보낸 건만 비웁니다.' }); return; }  // TallyOne 1.0(L5)
    try {
      const n = await fbClearFeedback(exportedTs);
      setExportedTs([]);
      setFbNotice({ kind: 'ok', text: `🧹 저금통 비움: ${n}건 삭제. 새 오답은 다시 쌓입니다.` });  // TallyOne 1.0(L5)
    } catch (e) {
      setFbNotice({ kind: 'err', text: '비우기 실패: ' + (e?.message || e) });  // TallyOne 1.0(L5): 조용한 실패 금지
    }
  };

  // 항차별 통계
  const voyageStats = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        //  ★ 4.16 (§7.8-① · Fable 판정 ①): 양하·선적 막대 = 평택분. 시프팅은 «◆ 시프팅 N — 내림 x/N · 실음 y/N» 줄로 따로.
        //    전체 %(totalAll·totalDone)는 작업량(평택분 + 시프팅 2무브)으로 — 종전 숫자 그대로다.
        const _sp = shiftSplitOf(k, v);
        const _ss = _sp.set;   // 2.89-06
        const dis = computeStats(v.discharge, 'discharge', _ss, v.keepOnboard);   // 4.48 감사(상 1): 본선 잔류 뺌
        const loa = computeStats(v.loading, 'loading', _ss);
        return {
          key: k,
          info: v.info,
          dis, loa,
          shift: { n: _sp.n, out: _sp.out.done, in: _sp.in.done, fc: (_sp.forecast && _sp.forecast.n) || 0 },   // 4.48: 본선 잔류 예보
          totalDone: dis.workDone + loa.workDone,
          totalAll: dis.workTotal + loa.workTotal,
        };
      })
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages]);

  // 검수원별 일일 통계
  const inspectorStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const stats = {};
    Object.values(voyages || {}).forEach(v => {
      ['discharge', 'loading'].forEach(mode => {
        const sec = v?.[mode];
        if (!sec) return;
        Object.values(sec.completed || {}).forEach(comp => {
          if (!comp.by) return;
          if (!stats[comp.by]) stats[comp.by] = { name: comp.by, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
          stats[comp.by].total++;
          if (mode === 'discharge') stats[comp.by].dis++;
          else stats[comp.by].loa++;
          if (comp.at >= todayMs) stats[comp.by].today++;
          if (comp.at > stats[comp.by].lastAt) stats[comp.by].lastAt = comp.at;
        });
      });
    });

    // 활동 정보 합치기
    Object.values(inspectors || {}).forEach(i => {
      if (!i?.name) return;
      if (!stats[i.name]) stats[i.name] = { name: i.name, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
      stats[i.name].active = i.lastActive && (Date.now() - i.lastActive) < 90000 && i.workMode !== 'view';   // 3.50: 조회만은 작업중이 아니다
      stats[i.name].viewOnly = i.workMode === 'view';   // 3.50: 표에 «조회» 로 보인다
      stats[i.name].lastVoyage = i.lastVoyage;
      stats[i.name].lastMode = i.lastMode;
    });

    // TallyOne 1.73: 개발·시험 계정은 소유자에게만 보인다(집계에는 손대지 않고 목록에서만 뺀다).
    return Object.values(stats).filter(x => isVisibleStaff(x.name, isOwnerName(inspector)))
      .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [voyages, inspectors, inspector]);

  // V7.40: 실시간 보드용 — 항차별 작업 중 검수원 (90초 이내 활동, HomePage activeInspectors와 동일 기준)
  // V7.99-8 (메모6): 작업 위치(호기·베이·홀드/데크·잔여)도 포함 — 수석이 어디 작업 중인지 본다.
  const activeByVoyage = useMemo(() => {
    const out = {};
    Object.values(inspectors || {}).forEach(i => {
      if (!i?.name || !i.lastVoyage || !i.lastActive) return;
      if (Date.now() - i.lastActive > 90000) return;
      if (!isVisibleStaff(i.name, isOwnerName(inspector))) return;   // 1.73
      if (!out[i.lastVoyage]) out[i.lastVoyage] = [];
      out[i.lastVoyage].push({
        name: i.name, mode: i.lastMode,
        equip: i.workEquip || null, bay: i.workBay || null,
        tier: i.workTier || null, remain: i.workRemain ?? null,
      });
    });
    return out;
  }, [inspectors, inspector]);

  // V7.40: 항차별 마지막 작업 보고 1건
  const lastReportByVoyage = useMemo(() => {
    const out = {};
    (allReports || []).forEach(r => {
      if (!r.voyageKey) return;
      if (!out[r.voyageKey] || (r.ts || 0) > (out[r.voyageKey].ts || 0)) out[r.voyageKey] = r;
    });
    return out;
  }, [allReports]);

  // V7.40: 항차별 오늘 경고(데미지·실오류) 건수
  const todayAlertsByVoyage = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t0 = today.getTime();
    const out = {};
    (allReports || []).forEach(r => {
      if (!r.voyageKey || !r.ts || r.ts < t0) return;
      if (r.type !== 'damage' && r.type !== 'seal_error') return;
      if (!out[r.voyageKey]) out[r.voyageKey] = { damage: 0, sealError: 0 };
      if (r.type === 'damage') out[r.voyageKey].damage++;
      else out[r.voyageKey].sealError++;
    });
    return out;
  }, [allReports]);

  // 전체 합계
  const total = useMemo(() => {
    let done = 0, all = 0, ptkAll = 0, missing = 0;
    voyageStats.forEach(v => {
      done += v.totalDone;
      all += v.totalAll;
      ptkAll += v.dis.ptk + v.loa.ptk;
      // V8.90: 예상 EDI(리스트와 매칭 0) 항차의 '누락'은 허수 — 합계에서 제외(SWDN 2608S 사건)
      missing += (v.dis.forecastEdi ? 0 : v.dis.missing) + (v.loa.forecastEdi ? 0 : v.loa.missing);
    });
    return { done, all, ptkAll, missing };
  }, [voyageStats]);

  // TallyOne 1.0(L2): 작업 보드 행에 터미널 실적·출항 상태 합성.
  //   선박코드 매칭 = info.vsl 대문자(HomePage 908·913행과 동일), ±12h 작업창 가드(twOf).
  //   terminalStatus의 출항 별칭('departed'/'done')은 badgeRule 65행과 같은 판정.
  //   출항 항차는 보드 하단으로 내리고 카드를 흐리게 — 기존 최신순은 그룹 안에서 유지.
  //  ★ 3.10 (검수사 2026-09-05 «실시간 작업보드는 지금 손봐야 합니다. 작업중인 선박만 보여야 하는데 16척을 다 올려놓고 있습니다»):
  //    보드에는 **지금 일하는 배만** 올린다 — ①터미널이 «작업 중»이라고 적은 배(utils.isWorkingNow — 작업시작일시가 지났고 안 끝난 것,
  //    미래 행의 work 는 아님) ②검수원이 앱에 붙어 있는 배(activeByVoyage, 90초) ③최근 30분 안에 앱 완료가 찍힌 배.
  //    출항·예정 항차는 보드에서 뺀다(예정은 홈 카드·일정이 보여 준다). 실측 2026-09-05 20:59 — 활성 16척 중 DJCT 0223E 한 척만 남는다.
  const boardRows = useMemo(() => {
    const now = Date.now();
    const rows = voyageStats
      .filter(v => isWorkingNow(voyages?.[v.key], now)
        || (activeByVoyage[v.key] || []).length > 0
        || (now - lastCompletedAt(voyages?.[v.key])) < 30 * 60000)   // 4.24: 폰 카드의 «최근 완료 N분 전» 과 같은 한 벌(lastCompletedAt)
      .map(v => {
        const ts = String(v.info?.terminalStatus || '').trim().toLowerCase();
        return { ...v, _departed: ts === 'departed' || ts === 'done' };
      });
    return [...rows.filter(r => !r._departed), ...rows.filter(r => r._departed)];
  }, [voyageStats, pfMap, voyages, activeByVoyage]);
  //  감사: 고른 배가 보드에서 빠지면(작업 끝·출항) 포커스도 풀어 다음에 그 배가 돌아와도 저절로 크게 안 뜬다
  useEffect(() => { if (boardFocus && !boardRows.some(r => r.key === boardFocus)) setBoardFocus(null); }, [boardRows, boardFocus]);
  //  4.24: 폰 시트도 같다 — 그 배가 보드에서 빠지면(작업 끝·출항) 시트를 닫는다(다시 와도 저절로 안 열린다)
  useEffect(() => { if (phoneSheet && !boardRows.some(r => r.key === phoneSheet)) setPhoneSheet(null); }, [boardRows, phoneSheet]);
  //  3.11-01: 보드 높이 = **보드 위 끝에서 화면 바닥까지**(검수사 «밑에 다른 항목만큼 화면이 줄어 들었습니다» — 고정 9rem 은 헤더·접기 단추 높이를 추정한 값이라 실제보다 짧았다).
  const boardScrollRef = React.useRef(null);
  //  ★ 3.17 — **보드 확대.** 검수사 2026-09-06 «작업이 2척이다 보니 수석 화면이 작아 졌습니다. 확대기능 가능한지요?»
  //    보드 높이를 척수로 등분하므로 2척이면 그림이 절반이 된다. 사람이 배율을 정하고 그 값을 기억한다.
  //    ⚠ 폰마다 화면이 다르니 기기에 남긴다(localStorage). 읽기·쓰기 모두 try 로 감싼다 — 사생활 모드에서 던진다.
  const BOARD_ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3];   // 3.19: 검수사 «확대는 100-300%로 해주세요» — 줄이는 쪽은 안 쓴다(작아서 문제였다)
  const [boardZoom, setBoardZoom] = useState(() => {
    try { const v = Number(localStorage.getItem('gm_board_zoom')); return BOARD_ZOOMS.includes(v) ? v : 1; } catch (e) { return 1; }   // 옛 값(0.8·0.9 등)은 표에 없으므로 100% 로 돌아온다
  });
  const bumpZoom = (dir) => {
    const i = BOARD_ZOOMS.indexOf(boardZoom);
    const n = BOARD_ZOOMS[Math.max(0, Math.min(BOARD_ZOOMS.length - 1, (i < 0 ? 2 : i) + dir))];
    setBoardZoom(n);
    try { localStorage.setItem('gm_board_zoom', String(n)); } catch (e) { /* 기억 못 해도 이번 화면은 커진다 */ }
  };
  const [boardH, setBoardH] = useState(0);
  //  ★ 3.20-01 — **보드 그릇 높이를 «한 번»이 아니라 «계속» 잰다.** 검수사 2026-09-06 «크롬하고 엣지하고 틀리게 보입니다.
  //    크롬은 그나마 차보이는데 엣지는 많이 비어 보입니다» · «작업중인 작업 보드가 모니터 한 화면에 차 보였으면 좋겠습니다».
  //    실화면 두 장으로 확정 — 크롬은 보드가 화면을 거의 다 쓰는데(2척 잘림 없음) 엣지는 **440px 에 굳어** 위 카드가 잘렸다.
  //    3.11-01 이 «고정 9rem 추정 → 실측»으로 고쳤지만 **재는 때**가 모자랐다 — 아래 접이식 섹션을 펴거나(보드 위치가 내려간다)
  //    페이지를 스크롤하면(보드가 위로 올라간다) 그릇이 따라 커져야 하는데 창 크기 변화에만 걸려 있었다.
  //    브라우저마다 달리 보인 것도 이것이다(크롬은 우연히 맞게 잡혔을 뿐이다).
  //  ⇒ 스크롤·레이아웃 변화에도 다시 잰다. 보드 머리가 화면 위로 나가면 top 이 음수가 되므로 0 으로 눌러 **화면보다 큰 그릇**을 만들지 않는다.
  //    그릇이 커지면 그림 배율(FitBox)은 ResizeObserver 로 저절로 따라 커진다 — 좌우가 잘리지 않는다.
  //  ★ 4.24 — 보드가 상태 줄 바로 밑(첫 화면)에서 시작한다. 그릇이 곧 보드 전체라 «그릇 위 끝 → 화면 바닥 − 8px» 가 그대로 «100vh − 위 높이» 다
  //    (검수사 B13 «페이지 스크롤이 생기면 불편합니다» · D3 «수석 화면 구성도 한화면이면 됩니다»). 폰(카드 목록)은 재지 않는다.
  useEffect(() => {
    const fit = () => {
      const el = boardScrollRef.current; if (!el) return;
      const top = Math.max(0, el.getBoundingClientRect().top);
      const h = Math.floor(window.innerHeight - top - 8);
      if (h > 200 && Math.abs(h - boardH) > 1) setBoardH(h);
    };
    fit(); const t = setTimeout(fit, 300);   // 접기 애니메이션·폰트 로딩 뒤 한 번 더
    //  4.24 2차(모의 확인 중-1): 페이지 스크롤이 없어지자 위 띠가 줄어도(수석 공지 띠 [확인] · 글자 크게→보통) 문서 크기가 그대로라 다시 재는 신호가 안 와
    //    화면 바닥에 42~52px 빈 띠가 남았다 — 1초마다 한 번 더 잰다(위 끝 하나 읽기 · 값이 바뀔 때만 다시 그림).
    const iv = setInterval(fit, 1000);
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, { passive: true });   // 스크롤하면 보드 위 끝이 바뀐다
    //  다른 섹션을 펴고 접으면 보드가 위아래로 밀린다 — 문서 크기 변화로 잡는다(토글 상태를 일일이 의존성에 넣지 않는다).
    let ro = null;
    try {
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fit); ro.observe(document.body); }
    } catch (e) { console.warn('[작업 보드] 높이 관찰자를 못 걸었다 — 창 크기·스크롤로만 다시 잽니다', e); }
    return () => {
      clearTimeout(t); clearInterval(iv);
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit);
      if (ro) ro.disconnect();
    };
  }, [tab, wideUI, boardRows.length, boardH]);
  //  4.24: 3.11 의 «100vw − 스크롤바 폭» 전폭 꼼수(--sbw)는 뺐다 — 상황판 자체가 전폭이라 보드를 화면 밖으로 넓힐 일이 없다.
  //  ★ 4.24 — 컴 상황판 탭은 페이지가 화면 한 장이다. 앱 본문 아래 여백(pb-20)·바닥글이 페이지를 늘려 스크롤을 만들지 않게 그때만 접는다(index.css data-chief-fill).
  //    다른 탭·폰·다른 화면에서는 종전 그대로 — 떠날 때 반드시 걷는다.
  useEffect(() => {
    const el = document.documentElement;
    if (tab === 'board' && wideUI) el.setAttribute('data-chief-fill', '1'); else el.removeAttribute('data-chief-fill');
    return () => el.removeAttribute('data-chief-fill');
  }, [tab, wideUI]);

  //  4.24 2차(감사 하-3): 컴 상황판 탭에서는 떠 있는 «📋 보고 보관 N» 단추를 숨긴다(마지막 행 합계를 가림 — index.css data-chief-fill).
  //    근무 중 켜 두는 그 화면에서 놓친 카페리 보고가 안 보이지 않게 같은 문을 상태 줄 칩으로 — 수는 Ferry1700Alert(audience chief) 와 같은 셈
  //    (모든 항차 × utils.ferryReportCuts), 누르면 같은 창(window 'ferry1700Open').
  //  (훅이라 아래 «수석만 진입» 문지기(return) 앞에 둔다)
  const f1700Count = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(voyages || {})) { const v = voyages[k]; if (!v) continue; try { n += ferryReportCuts(v, hbNow, k).length; } catch (e) { console.warn('[상황판] 카페리 보고 보관 수를 못 셌다', k, e); } }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyages, Math.floor(hbNow / 60000)]);
  // ★ V9.44(사용자 확정 2026-08-02): **수석검수사만 진입한다.**
  //   종전엔 isChief 가 '완료 저장' 버튼에만 걸려 있어(V7.94-18) 일반 검수원도 화면에 들어와
  //   전체 통계·자료보관소·완료보관소·오답·공지작성·편집·항차삭제를 다 볼 수 있었다.
  //   사용자: "이제야 알았네요 일반 검수원이 수석대쉬보드 진입이 가능 하다는걸. 진입을 막아 주세요.
  //           물론 수석검수사만 출입이 가능하다는 문구와 함께."
  //   ⚠ 화면 가드일 뿐 데이터 차단이 아니다 — 진짜 권한 분리는 Firebase 규칙에서 해야 한다(다음 판).
  if (!canOpen) {
    return (
      <div className="max-w-3xl mx-auto px-3 py-10">
        <div className="bg-ink-900 border border-purple-800/50 rounded-card p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-lg font-bold text-purple-200 mb-2">수석 검수원 전용 화면입니다</div>
          <div className="text-sm text-dim-300 leading-relaxed">
            수석 검수원만 출입이 가능합니다.<br/>
            전체 진행률·보관소·편집 기능은 수석 검수원에게 요청해 주세요.
          </div>
          <div className="text-xxs text-dim-400 mt-3">
            현재 로그인: <b className="text-dim-200">{inspector || '미상'}</b>
          </div>
          <button onClick={onGoHome}
            className="mt-5 px-4 py-2 rounded-pill bg-ink-800 hover:bg-ink-750 text-sm font-bold text-dim-100">
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  //  ── 4.24 상태 줄 재료 — 종전 수집기 배너(CollectorStatusBanner)·BigStat 두 칸·미회신 오답 배너가 한 줄로 왔다(같은 판정 그대로: heartbeatState · healthSummary · total · unansweredCount) ──
  const hhmm = (() => { const d = new Date(hbNow); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })();
  const hbText = hbView.state === 'ok' ? `수집기 ${hbView.ageMin}분 전`
    : hbView.state === 'down' ? `수집기 끊김 ${hbView.ageMin}분 — 숫자 갱신 정지`
    : '수집기 자료 없음';
  const hbTitle = hbView.state === 'none' ? '수집기 상태 자료 없음 — 하트비트 미수신 · 누르면 항차 건강 점검'
    : `수집기 v${collectorHb?.version || '?'} · ${hbView.ageMin}분 전 갱신 · 주기 ${hbView.cycleMin}분${hbView.state === 'down' ? ` · 끊김 기준 주기 ${hbView.cycleMin}분×2` : ''} — 누르면 항차 건강 점검`;
  const goHealth = () => { window.location.hash = '#/health'; };
  const chipCls = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-1.5 hover:bg-ink-800';
  const sep = <span className="hidden min-[700px]:block w-px h-4 bg-line-strong shrink-0" aria-hidden="true" />;   // 폰은 줄이 접히므로 칸막이 대신 틈만
  const TABS = [['board', '⚓', '상황판'], ['progress', '📋', '진행·마감'], ['manage', '🧰', '관리']];

  //  ── 4.24 관리 묶음 — 자료(8) · 사람·알림(6) · 편집 (주의)(2) · 소유자 메뉴(소유자만). 안의 항목은 종전 접힘·창 그대로 ──
  const groups = [
    { id: 'data', ico: '📦', name: '자료', sub: '자료 현황 · 베이매트릭스 · PORT-MIS · 엠티 · LOLO',
      badge: readiness.short.length ? `부족 ${readiness.short.length}` : '준비 완료' },
    { id: 'people', ico: '👷', name: '사람·알림', sub: '검수원 활동 · 공지 · 오답 · 통합 검색',
      badge: `${inspectorStats.length}명` },
    { id: 'edit', ico: '🖐', name: '편집 (주의)', sub: '베이상세 · 컨펌용 플랜', badge: '수석 전용', danger: true },
    ...(owner ? [{ id: 'owner', ico: '👑', name: '소유자 메뉴', sub: '교대 시각 · 활동 로그 · AI 비용 · 인원 · 위험 구역', badge: '소유자만' }] : []),
  ];
  const curGroup = (() => {
    const ok = (g) => groups.some((x) => x.id === g);
    if (wideUI) return ok(mgGroup) ? mgGroup : 'data';   // 컴은 늘 하나가 펴져 있다(오른쪽 칸)
    return ok(mgGroup) ? mgGroup : null;                 // 폰은 평소엔 닫힘(A6)
  })();

  //  (종전 «📤 최근 작업 보고» 머리의 [전체 삭제 (테스트용)] — 확인창 문구·처리기 한 글자도 그대로. 자리만 소유자 메뉴 › 위험 구역으로)
  const askClearAllReports = () => {
              askConfirm({
                title: '⚠️ 모든 작업 보고 삭제',
                message: '모든 항차의 작업 보고와 사진을 삭제합니다.\n테스트 데이터 정리용입니다.\n\n되돌릴 수 없습니다. 계속하시겠습니까?',
                confirmLabel: '모두 삭제',
                cancelLabel: '취소',
                danger: true,
                onConfirm: async () => {
                  try {
                    await fbClearAllReportsAllVoyages();
                    await fbClearAllActiveWork();
                    setRepNotice({ kind: 'ok', text: '✅ 모든 작업 보고가 삭제되었습니다' });  // TallyOne 1.0(L5)
                  } catch (e) { setRepNotice({ kind: 'err', text: '삭제 실패: ' + e.message }); }  // TallyOne 1.0(L5)
                },
              });
  };
  //  4.24 위험 구역 «한 번 더 묻기» — 이 창 [다음] 뒤에 종전 확인창이 그대로 뜬다(두 번 다 [예]여야 지운다). [취소]면 아무것도 안 쓴다.
  const askClearAllDanger = () => askDanger({
    title: '⚠️ 위험 구역 — 모든 작업 보고 삭제',
    message: '전 항차의 작업 보고와 사진을 지우는 테스트 정리용 단추입니다.\n현장 보고가 통째로 사라지고 되돌릴 수 없습니다.\n\n그래도 진행할까요? 다음 창에서 한 번 더 묻습니다.',
    confirmLabel: '다음',
    cancelLabel: '취소',
    danger: true,
    onConfirm: () => askClearAllReports(),
  });

  const groupBody = (gid) => {
    if (gid === 'data') return (
      <>
      {/* TallyOne 1.66 — 작업 자료가 다 왔나. 빠졌으면 무엇이·어느 선사 것이 비었는지 이름으로 알린다.
          ⛔ 마감자료는 여기서 안 본다 — 검수사: "마감자료는 작업을 하면 저절로 생김." */}
      <Fold id="ready"
        title={`📦 자료 현황 ${readiness.short.length ? `— 부족 ${readiness.short.length}` : `— 전부 준비완료 (${readiness.total})`}`}
        open={!!openSecs.ready} onToggle={() => toggleSec('ready')}>
      <div className={`bg-ink-900 border rounded-btn p-3 mt-3 ${readiness.short.length ? 'border-amber-700/50' : 'border-emerald-800/40'}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-bold text-dim-100">작업 자료 준비 상태</div>
          <span className="text-2xs text-dim-400">EDI/ASC · 리스트 · 무게(VGM)</span>
        </div>
        <div className="text-2xs text-dim-400 mb-3">
          마감자료(타임시트·실선적 EDI·DEP.TALLY·FINAL WORKING)는 작업하면 저절로 생기므로 여기서 보지 않습니다.
        </div>

        {readiness.total === 0 ? (
          <div className="text-xs text-dim-400 text-center py-4">작업 자료가 올라온 항차가 없습니다.</div>
        ) : (<>
          {readiness.short.length === 0 ? (
            <div className="text-center py-3 text-emerald-300 font-bold text-sm">✅ {readiness.total}개 작업 전부 준비완료</div>
          ) : (
            <div className="mb-3">
              <div className="text-xxs font-bold text-amber-300 mb-1">부족 {readiness.short.length}건</div>
              {readiness.short.map((r) => (
                <button key={r.key + r.mode} onClick={() => onOpenVoyage && onOpenVoyage(r.key, r.mode)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-pill bg-ink-800/60 hover:bg-ink-750 mb-1 text-left">
                  <span className="text-xs2 font-bold text-dim-100 shrink-0">{r.code}</span>
                  <span className="text-xxs text-dim-300 shrink-0">{r.voy} {r.modeKr}</span>
                  {r.carrier && <span className="text-2xs px-1.5 py-0.5 rounded bg-sky-900/50 text-sky-300 shrink-0">{r.carrier}</span>}
                  <span className="text-xxs text-amber-300 truncate ml-auto">{r.missing}</span>
                </button>
              ))}
            </div>
          )}

          {Object.keys(readiness.byCarrier).length > 0 && (
            <div className="mb-3">
              <div className="text-xxs font-bold text-dim-200 mb-1">선사별</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(readiness.byCarrier).sort((a, b) => b[1].length - a[1].length).map(([c, v]) => (
                  <span key={c} className="text-2xs px-2 py-1 rounded bg-ink-800 text-dim-200">
                    {c} <b className="text-amber-300">{v.length}</b> — {v.map(r => `${r.code} ${r.modeKr}`).join(', ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xxs font-bold text-dim-300 mb-1">전체 {readiness.total}건</div>
          {/* 4.23 2차: 줄이 폰 폭보다 길면(4.22-04 도 426px · 크게 473px) 페이지 전체가 옆으로 밀렸다 — 표만 옆으로 민다(표 개편은 상황판 판에서) */}
          <div className="overflow-x-auto" data-ready-table="1">
          <div className="min-w-max">
          {readiness.rows.map((r) => (
            <div key={'a' + r.key + r.mode} className="flex items-center gap-2 px-2 py-1 text-xxs border-b border-line-soft">
              <span className="font-bold text-dim-100 w-12 shrink-0">{r.code}</span>
              <span className="text-dim-400 w-16 shrink-0 truncate">{r.voy}</span>
              <span className="text-dim-300 w-7 shrink-0">{r.modeKr}</span>
              <span className="text-sky-400 w-10 shrink-0 truncate">{r.carrier || '-'}</span>
              <span className="text-dim-400 shrink-0">EDI {r.edi || '-'} · 리스트 {r.list || '-'}</span>
              <span className={`ml-auto shrink-0 ${r.state === 'ready' ? 'text-emerald-400' : 'text-amber-300'}`}>{r.label}</span>
            </div>
          ))}
          </div>
          </div>

          {readiness.noCarrier > 0 && (
            <div className="text-2xs text-dim-400 mt-2">
              ※ {readiness.noCarrier}건은 선사가 기록돼 있지 않습니다 — 「🧱 베이매트릭스」에서 선사를 채우면 선사별로 묶입니다.
            </div>
          )}
        </>)}
      </div>
      </Fold>
      {/* TallyOne 1.60 (검수사 지시 2026-08-13): 베이매트릭스를 업로드 화면에서 **분리**해 여기로 — «업로드를 누르면 일반 검수사도 보이기 때문에 건드릴수 있습니다» */}
      <DoorBtn id="baymatrix" title="🧱 베이매트릭스" sub="항차 없이 선박 조회·수정 · 조회가 안 되는 선박은 새로 만들기" onClick={() => setShowBayMatrix(true)} />
      {/* V9.42: 홈 상단 3카드를 없애면서 옮겨 온 PORT-MIS 캡처 */}
      <DoorBtn id="portmis" title="📸 PORT-MIS 캡처" sub="입출항·부두 자료 올리기" onClick={() => setShowPortMis(true)} />
      {/* 3.54: 홈 화면의 부두 위치 카드에서 옮겨 왔다(검수사 2026-09-21 «기능은 유지하고 화면은 삭제») */}
      <DoorBtn id="pier" title="📍 부두 좌표 등록" sub="지금 GPS 를 PCTC·PNCT 좌표로 — 홈 «📍 자동» 부두 판정에 쓰임" onClick={() => setShowPier(true)} />
      {/* 3.73: 머스크 엠티 찾기 — 엠티 리스트가 없으면 검수 리스트를 못 만든다(검수사 2026-10-03). 정본(머스크 EMPTY LOAD LIST)이 오면 정본 우선. */}
      <Fold id="emptyfind" title={`🔎 머스크 엠티 찾기 (${maerskEmptyCards(voyages, bayDictAll).length})`} open={!!openSecs.emptyfind} onToggle={() => toggleSec('emptyfind')}>
        <EmptyFindPanel voyages={voyages} dictAll={bayDictAll} inspector={inspector} canMake={chief} />
      </Fold>
      {/* M3.5.5: 엠티 실 작업 실시간 현황 — 4.24: 작업 중인 배가 없어도 문은 남긴다(조용히 없애지 않는다) */}
      <Fold id="seal" title={`🔒 엠티 실 작업 현황 (${sealVoyages.length})`} open={!!openSecs.seal} onToggle={() => toggleSec('seal')}>
        {sealVoyages.length > 0 ? (
        <div className="bg-ink-900 border border-amber-700/40 rounded-btn p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-400"/>
            <div className="text-sm font-bold text-amber-100">엠티 실 작업 실시간 현황</div>
            <span className="text-2xs text-dim-400">실시간 갱신</span>
          </div>
          <div className="space-y-3">
            {sealVoyages.map(sv => (
              <SealVoyageCard key={`${sv.voyageKey}-${sv.mode}`} sv={sv} onOpenVoyage={onOpenVoyage}/>
            ))}
          </div>
        </div>
        ) : (
          <div className="text-xs text-dim-400 text-center py-3">지금 엠티 실 작업이 있는 선적 항차가 없습니다.</div>
        )}
      </Fold>
      {/* V8.06: LOLO 검수 제출 리스트 (RIZHAO 등 RORO/LOLO 혼용선) — 4.24: 없어도 문은 남긴다 */}
      <Fold id="lolo" title={`🚛 LOLO 검수 제출 리스트 (${loloVoyages.length})`} open={!!openSecs.lolo} onToggle={() => toggleSec('lolo')}>
        {loloVoyages.length > 0 ? (
        <div className="bg-ink-900 border border-cyan-800/40 rounded-btn p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-cyan-400"/>
            <div className="text-sm font-bold text-dim-100">LOLO 검수 제출 리스트</div>
            <span className="text-2xs text-cyan-300/70">셀 좌표 없는 RORO/LOLO 혼용선 · 처리분만 내보냄</span>
          </div>
          {/* TallyOne 1.0(L5): 내보내기 결과 인라인 통지 */}
          <InlineNotice notice={loloNotice} onClose={() => setLoloNotice(null)} />
          <div className="space-y-2">
            {loloVoyages.map((item, idx) => (
              <LoloVoyageCard key={`${item.voyageKey}-${item.mode}`}
                item={item}
                onOpenVoyage={onOpenVoyage}
                onExport={exportLolo}
              />
            ))}
          </div>
        </div>
        ) : (
          <div className="text-xs text-dim-400 text-center py-3">LOLO 선박(선박 정책 lolo)의 양하·선적 자료가 없습니다.</div>
        )}
      </Fold>
      {/* TallyOne 1.5: 화면 데이터만 새로고침 — 페이지 리로드 없이 구독 재연결(로그인 유지) */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-btn border bg-ink-900 border-line" style={{ minHeight: 44 }} data-door="refresh">
        <span className="min-w-0">
          <span className="block text-sm2 font-bold text-dim-100">🔄 데이터 새로고침</span>
          <span className="block text-xs text-dim-400">로그인을 유지한 채 자료만 다시 받습니다</span>
        </span>
        <RefreshDataButton onRefreshData={onRefreshData} refreshing={refreshing} refreshedAt={refreshedAt} className="shrink-0"/>
      </div>
      </>
    );
    if (gid === 'people') return (
      <>
      {/* 전체 검수원 진행률 (인원 무제한) */}
      <Fold id="inspectors" title={`👷 검수원 활동 (${inspectorStats.length}명)`} open={!!openSecs.inspectors} onToggle={() => toggleSec('inspectors')}>
      <div className="bg-ink-900 border border-line rounded-btn p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-amber-400"/>
          <div className="text-sm font-bold text-dim-100">검수원 활동 ({inspectorStats.length}명)</div>
        </div>
        {inspectorStats.length === 0 ? (
          <div className="text-xs text-dim-400 text-center py-4">아직 검수 기록 없음</div>
        ) : (
          <div className="space-y-1.5">
            {inspectorStats.map(s => (
              <InspectorRow key={s.name} s={s}/>
            ))}
          </div>
        )}
      </div>
      </Fold>
      {/* V8.27: 검수원 공지 (흐르는 띠) */}
      <Fold id="notice" title="📢 검수원 공지 작성" open={!!openSecs.notice} onToggle={() => toggleSec('notice')}>
        <BroadcastComposer inspector={inspector} owner={owner} />
      </Fold>
      {/* M3.4: 오답 리포트 (검수원 신고 → 다음 버전 개선용) — 4.24: 미회신 배너는 상태 줄 «❌ 오답 N» 칩이 맡는다(누르면 여기로) */}
      <Fold id="feedback" title={`❌ 오답 리포트${unresolvedCount > 0 ? ` (미해결 ${unresolvedCount})` : ''}${unansweredCount > 0 ? ` · 미회신 ${unansweredCount}` : ''}`} open={!!openSecs.feedback} onToggle={() => toggleSec('feedback')}>
      <div className="bg-ink-900 border border-red-800/40 rounded-btn p-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400"/>
            <div className="text-sm font-bold text-dim-100">오답 리포트</div>
            {unresolvedCount > 0 && (
              <span className="bg-red-700 text-white text-2xs font-black px-1.5 py-0.5 rounded-full">
                미해결 {unresolvedCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* TallyOne 1.16: 클로드는 서버(feedback 노드)를 직접 읽는다 — 내려받아 전달할 필요가 없다.
                파일이 필요한 때(외부 공유·보관)를 위해 버튼은 남기되 주 용도가 아님을 안내한다. */}
            <button onClick={exportFeedback}
              title="파일로 보관하거나 외부에 전달할 때만 — 개발자는 서버에서 바로 읽습니다"
              className="text-2xs text-dim-300 hover:text-dim-100 px-2 py-0.5 rounded border border-line">
              📥 파일로 저장
            </button>
            <button onClick={clearExported}
              title="방금 내보낸 오답만 비우기 (안 본 것은 보호)"
              disabled={exportedTs.length === 0}
              className={`text-2xs px-2 py-0.5 rounded border ${exportedTs.length === 0
                ? 'text-dim-500 border-line cursor-not-allowed'
                : 'text-amber-300 hover:text-amber-100 border-amber-700/50 bg-amber-900/30'}`}>
              🧹 비우기
            </button>
            <button onClick={() => setShowResolved(v => !v)}
              className="text-2xs text-dim-300 hover:text-dim-100 px-2 py-0.5 rounded border border-line">
              {showResolved ? '미해결만' : '해결된 것도'}
            </button>
          </div>
        </div>
        {/* TallyOne 1.0(L5): 내보내기·비우기 결과 인라인 통지 */}
        <InlineNotice notice={fbNotice} onClose={() => setFbNotice(null)} />
        <div className="text-2xs text-dim-400 mb-2 leading-relaxed">
          검수원이 잘못된 답변에 ❌ 오답 버튼을 누르면 여기 모입니다.
          <br/><b className="text-sky-300">개발자가 서버에서 바로 읽습니다</b> — 파일로 내보내 전달하지 않아도 됩니다.
          처리 계획은 각 건에 <b className="text-sky-300">개발 회신</b>으로 붙습니다.
          <br/><b className="text-amber-300">비우기는 회신이 붙은 뒤에</b> 누르십시오 — 지우면 개발자도 못 봅니다.
        </div>
        {feedbackList.length === 0 ? (
          <div className="text-xs text-dim-400 text-center py-4">
            {showResolved ? '오답 리포트 없음' : '미해결 오답 없음 ✓'}
          </div>
        ) : (
          <div className="space-y-2">
            {feedbackList.slice(0, 50).map(f => (
              <FeedbackRow key={f._key || f.ts} feedback={f}/>
            ))}
            {feedbackList.length > 50 && (
              <div className="text-2xs text-dim-400 text-center pt-1">
                ... {feedbackList.length - 50}건 더 있음
              </div>
            )}
          </div>
        )}
      </div>
      </Fold>
      {/* ★ 3.63 카페리 17:00 주간 작업보고 — 17:00 에는 저절로 뜨고(아래 Ferry1700Alert), 지난 보고는 이 문으로 연다(그 창의 «보고 보관» 과 같은 창) */}
      <DoorBtn id="ferry1700" title="📋 17시 카페리 작업보고 — 보관한 보고 보기" sub="17:00(주간)·05:30(야간) 마감마다 한 건 · 17:00 에는 저절로 뜹니다"
        onClick={() => { try { window.dispatchEvent(new CustomEvent('ferry1700Open')); } catch (e) { console.warn('[4.24] 17시 보고 보관 창을 못 열었다', e); } }} />
      {/* 2.03-02 통합검색 — 화면 전환 없이 이 자리에서 답한다(검수사 «또 수석 홈화면을 벗어 납니다»). 4.24: 위쪽 검색 입력칸은 없앴다(B1) — 이 화면은 그대로 */}
      <Fold id="search" title="🔍 통합 검색 — 이 자리에서 답합니다" open={!!openSecs.search} onToggle={() => toggleSec('search')}>
        <div className="bg-ink-900 border-2 border-emerald-700/60 rounded-btn p-2">
          <GlobalSearchPage key="__open" embedded
            voyages={voyages} portMisData={portMisData}
            heartbeat={collectorHb} isChief initialQuery=""
            onOpenContainer={(c) => { if (c?.voyageKey) onOpenVoyage?.(c.voyageKey, c._mode); }}
            /* ★ 2.87 — 플랜은 **이동이 아니라 덮개**다 (검수사 지시 2026-08-29).
                 수석 화면에서 물었으면 닫았을 때 수석 화면이어야 한다. 덮개는 App 이 든다. */
            onOpenPlan={(pl) => onMirPlan?.(pl)}/>
        </div>
      </Fold>
      {/* TallyOne 1.0(L4): 보조기능 — #/aux 로 간다(이 화면을 떠나는 문은 이것 하나) */}
      <DoorBtn id="aux" title="🧰 보조기능" sub="이 화면을 떠납니다 — 돌아오려면 수석 대시보드로 다시 들어옵니다" label="화면 이동 ▶" onClick={() => { window.location.hash = '#/aux'; }} />
      </>
    );
    if (gid === 'edit') return (
      <>
      <div className="text-sm2 font-bold text-amber-200 bg-amber-950/30 border border-amber-700/50 rounded-btn px-3 py-2" data-edit-caution="1">
        ⚠ 작업 중인 배는 작업이 끝난 뒤에 고치십시오 — [저장]·[확정]을 누르면 검수원 화면이 바로 바뀝니다.
      </div>
      {/* M7.22: 라이브러리(진행 상황) + 선박별 자료 보관소(완료 기록) 분리 */}
      {!chief ? (
        <div className="text-xs text-dim-300 text-center py-3">🔒 편집은 수석검수사만 합니다 (현재 로그인: {inspector || '미상'})</div>
      ) : voyageStats.length === 0 ? (
        <div className="text-xs text-dim-400 text-center py-3">편집할 항차가 없습니다.</div>
      ) : (
        <div className="bg-ink-900 border border-emerald-800/50 rounded-btn p-3">
          <div className="text-sm font-bold text-emerald-200 mb-2">🖐 베이상세 편집 <span className="text-xxs text-dim-300 font-normal">— 오선적 정정 (수석 전용 · [저장]해야 검수사 화면 반영)</span></div>
          <div className="flex flex-wrap gap-2">
            {voyageStats.map(v => (
              <button key={v.key} onClick={() => setEditKey(v.key)}
                className="px-3 py-1.5 rounded-pill text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-600">
                {v.info?.vsl || v.key}
              </button>
            ))}
          </div>

          {/* V9.07: 선적 확정 플랜 편집 — 일항사 협의용. 초안(planDraft) → [확정] 시 검수앱 선적 플랜이 된다.
              실선적 기록(records.bay_actual)은 건드리지 않는다. */}
          <div className="text-sm font-bold text-violet-200 mt-3 mb-2">📐 컨펌용 플랜편집 <span className="text-xxs text-dim-300 font-normal">— 일항사 협의용 ([확정] 눌러야 선적 플랜 반영 · 실선적 무관)</span></div>
          <div className="flex flex-wrap gap-2">
            {voyageStats.filter(v => voyages[v.key]?.loading?.ediContainers).map(v => (
              <button key={'p' + v.key} onClick={() => setPlanKey(v.key)}
                className="px-3 py-1.5 rounded-pill text-sm font-bold bg-violet-700 text-white hover:bg-violet-600">
                {v.info?.vsl || v.key}
              </button>
            ))}
            {voyageStats.filter(v => voyages[v.key]?.loading?.ediContainers).length === 0 && (
              <span className="text-xxs text-dim-400">선적 EDI가 올라온 항차가 없습니다</span>
            )}
          </div>
        </div>
      )}
      </>
    );
    if (gid === 'owner' && owner) return (
      /* 4.11: 소유자 전용 메뉴는 여기 한 곳에 모은다 — 검수사 2026-10-07 22:08 «제가 쓰는 메뉴는 따로 모아주세요 분산시키지 말고요» · 22:09 «인원관리나 활동로그 마감적용 등».
         새 소유자 전용 기능은 이 묶음 안에 넣는다(대시보드 곳곳에 흩지 않는다). 기본 접힘 — 열기 전에는 아무 자료도 읽지 않는다.
         · TallyOne 1.3: 활동 로그 — 소유자 전용. 기본 접힘, 펼칠 때 조회+30일 정리 1회.
         · 4.37: 💳 AI 비용 — 검수사 2026-10-19 «비용관리 보고는 소유자 관리 안에둡니다». 펼칠 때 한 번 읽기(구독 없음), 키 값은 안 그린다.
         · 4.24: 되돌릴 수 없는 것(모든 작업 보고 삭제)은 아래 «위험 구역» 한 곳 — 빨간 테두리 · 누르면 한 번 더 묻는다(D9).
         · 4.39: 🏁 마감적용은 메뉴째 없앴다 — 검수사 2026-10-19 21:25 «마감 적용기능은 없애주세요 앱을 사용하게 되면 필요 없어지는 기능입니다» · 21:26 «메뉴 자체도 없애주세요». */
      <div className="space-y-2" data-owner-menu="1">
        <Fold id="shiftsnap" title="🕰 교대 시각 터미널 기준 (06:30 · 17:30)" open={!!openSecs.shiftsnap} onToggle={() => toggleSec('shiftsnap')}>
          <ShiftSnapPanel voyages={voyages} by={inspector} />
        </Fold>
        <Fold id="actlog" title="🕵️ 활동 로그" open={!!openSecs.actlog} onToggle={() => toggleSec('actlog')}>
          <ActivityLogSection voyages={voyages} />
        </Fold>
        <Fold id="aicost" title="💳 AI 비용 (클로드 · 제미나이)" open={!!openSecs.aicost} onToggle={() => toggleSec('aicost')}>
          <AiCostPanel by={inspector} />
        </Fold>
        {onOpenStaffManager && (
          <button onClick={onOpenStaffManager}
            className="w-full flex items-center justify-between px-3 rounded-btn border bg-ink-900 border-line hover:border-line-strong text-left"
            style={{ minHeight: 44 }}>
            <span className="text-sm2 font-bold text-dim-100">👥 인원 관리</span>
            <span className="text-dim-400 text-xs shrink-0 ml-2">창 열기 ▶</span>
          </button>
        )}
        <div className="rounded-btn border-2 border-red-700/70 bg-red-950/20 p-2 space-y-2" data-danger-zone="1">
          <div className="text-sm2 font-black text-red-200">⚠ 위험 구역 — 되돌릴 수 없습니다 · 누르면 한 번 더 묻습니다</div>
          {recentReports.length > 0 ? (
            <button type="button" onClick={askClearAllDanger} data-danger="clear-reports"
              className="w-full flex items-center justify-between gap-2 px-3 rounded-btn border-2 border-red-700/70 bg-red-950/30 hover:bg-red-900/40 text-left"
              style={{ minHeight: 44 }}>
              <span className="text-sm2 font-bold text-red-200 flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> 모든 작업 보고 삭제 (테스트용) — 위험</span>
              <span className="text-xs text-red-300 shrink-0">전 항차 보고·사진</span>
            </button>
          ) : (
            <div className="text-xs text-dim-400 px-1" data-danger="clear-reports-none">🗑 모든 작업 보고 삭제 (테스트용) — 지울 작업 보고가 없습니다(최근 보고 0건)</div>
          )}
          {/* TallyOne 1.0(L5): 삭제 결과 인라인 통지 */}
          <InlineNotice notice={repNotice} onClose={() => setRepNotice(null)} />
        </div>
      </div>
    );
    return null;
  };

  const boardEmpty = (
    <div className="text-sm text-dim-400 text-center py-10 px-3" data-board-empty="1">
      {hbView.state === 'down'
        ? `수집기가 멈춰 «작업 중»을 판정할 수 없습니다 — 마지막 자료 ${hbView.ageMin}분 전 (앱을 쓰는 검수원이 있는 배는 그대로 뜹니다)`   /* 감사: 빈 보드가 «없다»로 단정하지 않게 */
        : '지금 작업 중인 배가 없습니다 — 예정 항차는 홈 카드·일정에서 봅니다'}
    </div>
  );
  const sheetRow = !wideUI && phoneSheet ? boardRows.find((r) => r.key === phoneSheet) : null;

  return (
    <div className={`px-2 pt-2 space-y-2 ${tab === 'board' && wideUI ? '' : 'pb-4'}`} data-chief-root="1" data-chief-cur={tab} data-chief-layout={wideUI ? 'pc' : 'phone'}>
      {/* 1.81-01(검수사 요청 2026-08-17): TOP 버튼 — 대시보드가 길어서 맨 위로 한 번에. 4.24: 상황판 탭(컴)은 스크롤이 없어 안 뜬다 · 진행·관리 탭엔 뜬다(A19) */}
      <ScrollTopButton />

      {/* ★ 4.24 상태 줄 — «수석 상황판» · 수집기 점+«N분 전» · 검증 · 오답 · 누락 · 시각 · 탭 셋. 칩은 전부 문이다(수집기·검증 → 항차 건강 점검 · 오답 → 관리 › 사람·알림 · 누락 → 관리 › 자료).
          수집기가 끊기면(주기×2분) 점이 빨갛고 «숫자 갱신 정지» 를 그 자리에서 말한다(종전 배너와 같은 판정 heartbeatState). */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm2 font-bold text-dim-200" data-chief-strip="1">
        <span className="text-lg font-black text-dim-100 whitespace-nowrap px-1">수석 상황판</span>
        {sep}
        <button type="button" onClick={goHealth} title={hbTitle} className={chipCls} style={{ minHeight: 36 }} data-chief-chip="collector" data-hb={hbView.state}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hbView.state === 'ok' ? 'bg-emerald-400' : hbView.state === 'down' ? 'bg-red-500 animate-pulse' : 'bg-dim-500'}`} aria-hidden="true" />
          <span className={hbView.state === 'down' ? 'text-red-300' : hbView.state === 'none' ? 'text-dim-400' : ''}>{hbText}</span>
        </button>
        {sep}
        <button type="button" onClick={goHealth} title="항차 건강 점검(#/health)으로 이동" className={`${chipCls} ${healthIssueCount > 0 ? 'text-amber-300' : 'text-emerald-300'}`} style={{ minHeight: 36 }} data-chief-chip="health">
          {healthIssueCount > 0 ? `⚠ 검증 필요 ${healthIssueCount}항차` : '✓ 검증 이상 없음'}
        </button>
        {sep}
        <button type="button" onClick={() => goTo('manage', 'people', 'feedback')} className={`${chipCls} ${unansweredCount > 0 ? 'text-red-300' : ''}`} style={{ minHeight: 36 }} data-chief-chip="feedback"
          title={`아직 회신 안 한 오답 ${unansweredCount}건 · 미해결 ${unresolvedCount}건 — 누르면 관리 › 사람·알림 › 오답 리포트`}>
          ❌ 오답 {unansweredCount}
        </button>
        {sep}
        <button type="button" onClick={() => goTo('manage', 'data', 'ready')} className={`${chipCls} ${total.missing > 0 ? 'text-red-300' : ''}`} style={{ minHeight: 36 }} data-chief-chip="missing"
          title={`누락(선사 추가 필요) — 평택 ${total.ptkAll}대 중 · 누르면 관리 › 자료 › 자료 현황`}>
          누락 {total.missing}
        </button>
        {tab === 'board' && wideUI && f1700Count > 0 && (<>{sep}
          <button type="button" onClick={() => { try { window.dispatchEvent(new CustomEvent('ferry1700Open')); } catch (e) { console.warn('[상황판] 보고 보관 창을 못 열었다', e); } }}
            className={`${chipCls} text-amber-300`} style={{ minHeight: 36 }} data-chief-chip="f1700" title="카페리 17:00·05:30 작업보고 — 보관한 보고 보기(관리 › 사람·알림 «📋 17시 카페리 작업보고» 와 같은 창)">
            📋 보고 보관 {f1700Count}
          </button></>)}
        <span className="hidden min-[700px]:inline-flex items-center gap-1.5">{sep}<span className="whitespace-nowrap px-1" data-chief-clock="1">⏰ {hhmm}</span></span>
        {tab === 'board' && wideUI && boardRows.length > 0 && (
          /* 3.17: 확대 — 2척 이상이면 그림이 작아진다. 누르면 그 칸 안에서 커지고 넘치면 그 칸만 스크롤한다(종전 보드 머리에서 이 줄로) */
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-dim-400 font-bold pl-1" data-chief-zoom="1">
            {sep}
            <span className="ml-1">작업 중 <b className="text-dim-100">{boardRows.length}</b>척{voyageStats.length > boardRows.length ? <span className="hidden min-[1500px]:inline">{` · 등록 ${voyageStats.length}척`}</span> : ''}</span>
            <span className="ml-1.5 mr-0.5">확대</span>
            <button type="button" onClick={() => bumpZoom(-1)} disabled={boardZoom <= BOARD_ZOOMS[0]}
              className="w-7 h-7 rounded bg-ink-800 border border-line text-dim-200 font-black disabled:opacity-30" title="작게">−</button>
            <button type="button" onClick={() => { setBoardZoom(1); try { localStorage.setItem('gm_board_zoom', '1'); } catch (e) { /* 기억 실패는 무시 */ } }}
              className="px-1.5 h-7 rounded bg-ink-800 border border-line mono text-xs text-dim-200 font-bold" title="눌러서 기본으로">{Math.round(boardZoom * 100)}%</button>
            <button type="button" onClick={() => bumpZoom(1)} disabled={boardZoom >= BOARD_ZOOMS[BOARD_ZOOMS.length - 1]}
              className="w-7 h-7 rounded bg-ink-800 border border-line text-dim-200 font-black disabled:opacity-30" title="크게">+</button>
          </span>
        )}
        <span className="flex-1" />
        <nav className="hud-dock w-full min-[700px]:w-auto" role="tablist" aria-label="수석 상황판 탭" data-chief-tabs="1">
          {TABS.map(([id, ico, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-chief-tab={id}
              className="hud-tab min-[700px]:flex-none min-[700px]:px-4" onClick={() => { setTab(id); setPhoneSheet(null); }}>
              <span className="hud-ico" aria-hidden="true">{ico}</span>{label}
            </button>
          ))}
        </nav>
      </div>

      {/* V9.42: PORT-MIS 캡처 모달 — 홈 상단 3카드 정리로 이리로 옮겨왔다 */}
      {showPortMis && <PortMisCaptureModal onClose={() => setShowPortMis(false)} />}
      {showPier && <PierRegisterModal inspector={inspector} onClose={() => setShowPier(false)} />}
      {/* ★ 3.63 — 카페리 17:00 주간 작업보고(갱별) — 그 시각 작업 중인 대상 카페리를 한 창에 모아(보기만) */}
      <Ferry1700Alert audience="chief" voyages={voyages} />
      {/* 1.60: 베이매트릭스 — 항차 없이 선박 조회·수정, 조회가 안 되는 선박은 신규 추가 */}
      {showBayMatrix && (
        /* 3.5: «쓰이는 배»를 화면이 알 수 있게 — 부모가 이미 들고 있는 재료만 넘긴다(추가 요청 0).
           ⚠ fbListArchive 는 부르지 않는다(키 1건당 GET 4회 — firebase.js:1999 요청 폭주 기록). */
        <BayMatrixManagerModal onClose={() => setShowBayMatrix(false)}
          voyages={voyages} shipLib={shipLib} arcList={arcList} inspector={inspector} />
      )}

      {/* V7.40: ⚓ 실시간 작업 보드 — 동시 작업 선박을 카드로 한눈에 (기존 "항차별 진행" 대체) */}
      {/* 3.11: 보드 그림의 칸 → 컨 상세(VoyagePage renderDetail 과 같은 모양 — 같은 모드 전체 컨 병합, 완료·X-RAY·봉인) */}
      {boardDetail && (() => {
        const vy = voyages?.[boardDetail.key]; const sec = vy?.[boardDetail.mode] || {};
        const ediMap = sec.ediContainers || {}, recMap = sec.records || {}, compMap = sec.completed || {};
        //  3.52: 선사는 «더 자세한 쪽» — 여기도 리스트 op 를 EDI 위에 그냥 펼치던 자리다(utils 한 벌).
        //    안 지나면 수석 보드 컨 상세만 세관이 뭉친 값을 보여 마감텔리와 갈린다(감사 실측 22대).
        const _vslB = String(vy?.info?.vsl || '').toUpperCase();
        const all = [...new Set([...Object.keys(ediMap), ...Object.keys(recMap)])].map(cn => {
          const _e = ediMap[cn] || {}, _r = recMap[cn] || {};
          const _m = { ..._e, ...Object.fromEntries(Object.entries(_r).filter(([, vv]) => vv !== '' && vv != null)), cn, _comp: compMap[cn] || null };
          if (_r.op || _e.op) _m.op = pickCarrierOp(_r.op, _e.op, _vslB);
          //  3.52-01: **POL 은 EDI 가 정본이다** — 위 스프레드가 리스트 POL 을 그냥 덮고 있었다(문지기 없음,
          //    mirCtx 와 같은 구멍). 양하는 «양하 직전 마지막 항구» 규칙까지 태운다(utils 한 벌).
          if (_e.pol) _m.pol = boardDetail.mode === 'discharge' ? pickDischargePol(_e.pol, _r.pol, _e.pod) : _e.pol;
          return _m;
        });
        //  3.52: 배별 선사 별칭도 지난다 — `pickCarrierOp` 만 지나면 `opAlias`(DXQD 의 NOL→DWS,
        //    STSE·STMJ 의 WDF→WDG)가 이 화면에만 안 걸려 **수석 보드 컨 상세만 딴 선사**를 보인다
        //    (재감사 실측 — DXQD 2631E 250대가 여기만 NOL, 나머지 네 경로는 DWS).
        const _spB2 = shipOpMapper(_vslB, all.map((c) => c && c.op));
        for (const c of all) { if (!c || !c.op) continue; const o = _spB2(c.op); if (o !== c.op) c.op = o; }
        const dc = all.find(x => x.cn === boardDetail.c?.cn) || boardDetail.c;
        if (!dc?.cn) return null;
        return (
          <ContainerDetailModal variant="modal" c={dc}
            workBay={dc.bay || dc.bay_orig || recMap[dc.cn]?.bay_orig || null}
            workTier={(() => { const t = parseInt(dc.tier || dc.tier_planned || recMap[dc.cn]?.tier_orig || '', 10); return Number.isFinite(t) ? (t < 80 ? 'hold' : 'deck') : null; })()}
            comp={compMap[dc.cn]} isXray={boardDetail.mode === 'discharge' && !!(sec.xrayList?.[dc.cn])} xraySeal={sec.xraySeals?.[dc.cn] || null}
            mode={boardDetail.mode} voyageKey={boardDetail.key} voyageInfo={vy?.info} inspector={inspector} sealMode={null}
            onClose={() => setBoardDetail(null)} allContainers={all} records={recMap} shiftCns={null} />
        );
      })()}

      {/* ★ 4.24 ⚓ 상황판 탭(컴) — 실시간 작업 보드가 상태 줄 바로 밑에서 화면 바닥까지(스크롤 없음). 보드 안은 종전 그대로:
          한 척 = 가로로 긴 한 줄(25% 통계 · 75% 베이). 보드 높이를 척수(최대 4)로 등분하고 5척부터 보드 안에서 스크롤 — 검수사 «세로로 4등분해서 최대 4척, 2척이면 2등분, 5척이면 스크롤» · «1척이면 전체화면»
          · 배를 누르면 그 배만 전체(포커스), [닫기]로 돌아온다. 고른 배가 보드에서 빠지면(작업 끝) 포커스도 풀린다.
          TallyOne 1.0(L2): boardRows = voyageStats + 터미널 실적(_tw)·출항(_departed) 합성, 출항은 하단
          4.24 — 4.23 의 보드 전체 fs-keep 을 걷었다: 통계 칸의 머리·막대·요약·검수원·합계는 글자 모드를 따르고(크게면 커진다) 행이 낮으면 별첨 표 대신 한 줄 요약(index.css lsc-*).
          그림(FitBox·베이 격자)과 별첨 표는 제 fs-keep 이 그대로 4.22-04 글자로 묶는다 · 베이 제목은 boardTitlePx(모드 무관). */}
      {tab === 'board' && wideUI && (boardRows.length === 0 ? boardEmpty : (
        <div ref={boardScrollRef} className="flex flex-col gap-1 overflow-y-auto" data-chief-board="pc" style={{ height: boardH ? boardH + 'px' : 'calc(100vh - 9rem)', minHeight: '20rem' }}>
          {(() => {
            const focusRow = boardFocus ? boardRows.find(r => r.key === boardFocus) : null;
            const shown = focusRow ? [focusRow] : boardRows;
            return shown.map(v => (
              <div key={v.key} className="shrink-0 min-h-0 overflow-y-auto sm:[flex-basis:max(var(--fb),9rem)]" style={{ '--fb': `calc(${100 / Math.min(shown.length, 4)}% - ${shown.length > 1 ? '0.25rem' : '0px'})` }} data-board-row={v.key}>
                {/* 감사: sm 이상은 행 하한(작은 노트북 4척 겹침 방지) · sm 미만(폰, 세로 쌓임)은 자연 높이로 컨테이너가 스크롤.
                    4.24: 하한 12rem → 10rem — 보드가 첫 화면(상태 줄 밑)에서 시작하니 1440×900 4척 한 행이 184px 다. 12rem(192px)이면 넷째 행이 27px 밀려 보드가 스크롤됐다(R34 ①-3 실측).
                    통계 칸은 넘치면 숨김(lsc-stat · 한 줄 요약이 줄어든다)이라 낮아져도 겹치지 않는다.
                    4.24 2차: 10rem → 9rem — 1366·1440×768(노트북) 4척이 한 화면(보드 약 587px ÷ 4). 한 줄 요약은 칸 안에서 스크롤된다. */}
                <LiveShipCard v={v}
                  workers={activeByVoyage[v.key] || []}
                  lastReport={lastReportByVoyage[v.key]}
                  alerts={todayAlertsByVoyage[v.key]}
                  departed={v._departed}
                  cranes={craneBoardOf(voyages?.[v.key], activeByVoyage[v.key] || [])}
                  voyage={voyages?.[v.key]} rows={shown.length}
                  onOpenContainer={(c, mode) => setBoardDetail({ key: v.key, mode, c })}
                  focused={!!focusRow} canFocus={boardRows.length > 1} zoom={boardZoom}
                  onFocus={() => setBoardFocus(focusRow ? null : v.key)}
                  onOpen={() => onOpenVoyage(v.key)}/>
              </div>
            ));
          })()}
        </div>
      ))}

      {/* ★ 4.24 ⚓ 상황판 탭(폰) — 배마다 카드 한 장(선박명·항차·선석·양하/선적 막대+숫자·검수원·최근 완료). 카드를 누르면 그 배만 전체화면 시트(막대 → 별첨 표 → 베이 그림).
          컴의 «행 클릭 = 그 배만 전체화면» 과 같은 재료·같은 판정이고 배치만 다르다(A1). 4척이면 한 화면, 5척부터 아래로. */}
      {tab === 'board' && !wideUI && (
        <div className="space-y-2" data-chief-board="phone">
          <div className="text-xs text-dim-400 font-bold px-1">
            작업 중 {boardRows.length}척{voyageStats.length > boardRows.length ? ` · 등록 ${voyageStats.length}척` : ''}{boardRows.length ? ' · 누르면 그 배만 전체화면' : ''}
          </div>
          {boardRows.length === 0 ? boardEmpty : boardRows.map((v) => (
            <PhoneShipCard key={v.key} v={v} workers={activeByVoyage[v.key] || []} departed={v._departed}
              lastAt={lastCompletedAt(voyages?.[v.key])} onOpen={() => setPhoneSheet(v.key)} />
          ))}
        </div>
      )}
      {sheetRow && (
        <div className="fixed inset-0 !mt-0 z-[45] bg-ink-950 overflow-y-auto" role="dialog" aria-label={`${sheetRow.info.vsl} 전체화면`} data-chief-sheet={sheetRow.key}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-2 py-2 bg-ink-950 border-b border-line">
            <button type="button" onClick={() => setPhoneSheet(null)} className="chip-v2 shrink-0" data-sheet-close="1">‹ 보드</button>
            <div className="min-w-0 flex-1 truncate">
              <b className="text-lg font-black text-dim-100">{sheetRow.info.vsl}</b>{' '}
              <span className="text-xs text-dim-300">{voyPairOf(sheetRow.info)}</span>
            </div>
          </div>
          {/* 640~699px 폰(가로 배치 카드)은 그릇 높이가 있어야 그림이 칸을 채운다 — 컴의 «그 배만 전체» 와 같은 그릇 */}
          <div className="p-1.5 pb-24" style={typeof window !== 'undefined' && window.innerWidth >= 640 ? { height: 'calc(100vh - 64px)' } : undefined}>
            <LiveShipCard v={sheetRow}
              workers={activeByVoyage[sheetRow.key] || []}
              lastReport={lastReportByVoyage[sheetRow.key]}
              alerts={todayAlertsByVoyage[sheetRow.key]}
              departed={sheetRow._departed}
              cranes={craneBoardOf(voyages?.[sheetRow.key], activeByVoyage[sheetRow.key] || [])}
              voyage={voyages?.[sheetRow.key]} rows={1}
              onOpenContainer={(c, mode) => setBoardDetail({ key: sheetRow.key, mode, c })}
              focused={false} canFocus={false} zoom={1}
              onOpen={() => onOpenVoyage(sheetRow.key)}/>{/* 시트가 곧 «그 배만 전체» 다 — 카드 안 [⤢ 크게]·카드 누르기 포커스는 끈다(시트를 닫는 길은 ‹ 보드 하나 · 스크롤하다 닿아 닫히지 않게) */}
          </div>
        </div>
      )}

      {/* ★ 4.24 📋 진행·마감 탭 — 왼쪽 진행 상황·완료 저장(자료 있는 항차 · 자료 대기는 접힘 한 줄), 오른쪽 문 다섯(마감 텔리 · 완료 보관소 · 자료 보관소 · 장비별 보고 · 최근 작업 보고).
          처리기(완료 저장·터미널 실적 반영·EDI/ASC/엑셀·마감 텔리 생성·복원·보고 삭제)는 한 줄도 안 바꿨다 — 자리만. */}
      {tab === 'progress' && (
        <div className="grid gap-3 items-start min-[700px]:grid-cols-[minmax(0,1fr)_minmax(300px,34%)] max-w-app mx-auto" data-chief-pane="progress">
          <div className="min-w-0">
            {/* TallyOne 1.0(L3): 도선 예보 전달 — 진행 상황 줄에 일정 정보(완료 저장 타이밍 판단 근거) */}
            <LiveProgressSection voyages={voyages} onOpenVoyage={onOpenVoyage} chief={chief} inspector={inspector} pilotForecast={pfMap} portMisData={portMisData} resolveBox={resolveBox} />
          </div>
          <div className="min-w-0 space-y-2 min-[700px]:pt-3" data-chief-doors="progress">
            {/* V9.19-01: 마감 텔리 — 검수원이 보면 안 되는 서류라 수석 대시보드로 이동(사용자 확정) */}
            <Fold id="tally" title="📑 마감 텔리 (DEP.TALLY)" open={!!openSecs.tally} onToggle={() => toggleSec('tally')}>
              <TallyExportSection voyages={voyages} chief={chief} pfMap={pfMap}
                archiveList={arcList} onArchiveChanged={reloadArchive}
                boxRoot={boxRoot} onPickBox={onPickBox} resolveBox={resolveBox}/>
            </Fold>
            {/* V9.17: 완료 보관소 열람·복원 — 백엔드(archive/{key} + 복원·정리 함수)는 M7.18b에 완성돼
                있었는데 UI가 0이었다(전면 점검 §1-5). RZOR 통삭제 사건 같은 실수의 되돌리기가 이것. */}
            <Fold id="restore" title="🗄 완료 보관소 (복원)" open={!!openSecs.restore} onToggle={() => toggleSec('restore')}>
              <ArchiveRestoreSection chief={chief} onRestored={() => {}} />
            </Fold>
            <Fold id="archive" title="📚 선박별 자료 보관소" open={!!openSecs.archive} onToggle={() => toggleSec('archive')}>
              <ShipArchiveSection shipLib={shipLib} />
            </Fold>
            {/* M3.5.6: 장비별 오늘 작업 보고 통계 — 3.64-01: 부두별 줄(EquipReportBoard) · 4.24: 보고가 없어도 문은 남긴다 */}
            <Fold id="equip" title={`🏗 오늘 장비별 작업 보고${equipBoard.total > 0 ? '' : ' — 아직 없음'}`} open={!!openSecs.equip} onToggle={() => toggleSec('equip')}>
              {equipBoard.total > 0
                ? <EquipReportBoard board={equipBoard} capped={(allReports || []).length >= 300} />
                : <div className="text-xs text-dim-400 text-center py-3">오늘 들어온 장비별 작업 보고가 아직 없습니다.</div>}
            </Fold>
            {/* M3.5.6: 최근 작업 보고 (시간순) — 4.24: 머리의 [전체 삭제 (테스트용)] 는 👑 소유자 메뉴 › 위험 구역으로 옮겼다(D9) · 보고가 없어도 문은 남긴다 */}
            <Fold id="reports" title={recentReports.length > 0 ? '📤 최근 작업 보고 (30건)' : '📤 최근 작업 보고 — 아직 없음'} open={!!openSecs.reports} onToggle={() => toggleSec('reports')}>
            {recentReports.length > 0 ? (
            <div className="bg-ink-900 border border-emerald-700/40 rounded-btn p-3 mt-3">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Send className="w-4 h-4 text-emerald-400"/>
                <div className="text-sm font-bold text-emerald-100">최근 작업 보고</div>
                <span className="text-2xs text-dim-400">최근 30건</span>
                <div className="flex-1"/>
                <span className="text-2xs text-dim-400">전체 삭제(테스트용)는 👑 소유자 메뉴 › 위험 구역</span>
              </div>
              {/* TallyOne 1.0(L5): 삭제 결과 인라인 통지 */}
              <InlineNotice notice={repNotice} onClose={() => setRepNotice(null)} />
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {recentReports.map((r, i) => {
                  const time = r.ts ? new Date(r.ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                  // V9.57(I2): external_pause(작업중단) 아이콘 누락 → 기본 '📋'로 묻히던 것. 사고성이라 ⛔ + 붉은 테두리.
                  const icon = r.type === 'work_status' ? '📤' : r.type === 'hatch' ? '🔓' : r.type === 'conbox' ? '📦' : r.type === 'damage' ? '⚠️' : r.type === 'seal_error' ? '🚨' : r.type === 'external_pause' ? '⛔' : '📋';
                  // V9.57(I7): 피드 voy는 firebase 구독이 voy_l 고정으로 붙인다 — 보고의 mode를 보고 voy_d/voy_l 선택.
                  const rInfo = voyages?.[r.voyageKey]?.info;
                  const rVoy = r.mode === 'discharge' ? (rInfo?.voy_d || rInfo?.voy || r.voy)
                    : r.mode === 'loading' ? (rInfo?.voy_l || rInfo?.voy || r.voy)
                    : r.voy;
                  return (
                    <div key={i} className={`bg-ink-950 border rounded p-2 text-xs group ${r.type === 'external_pause' ? 'border-red-700/70' : 'border-line'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          <span>{icon}</span>
                          <span className="font-bold text-dim-100">{r.vsl} {rVoy}</span>
                          {r.equip && <span className="text-2xs bg-orange-700 text-white px-1 py-0.5 rounded font-bold">{r.equip}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xs text-dim-400 mono">{time}</span>
                          <button onClick={() => {
                            askConfirm({
                              title: '보고 삭제',
                              message: `${r.vsl} ${r.voy}\n${r.equip || ''} 보고를 삭제하시겠습니까?`,
                              confirmLabel: '삭제',
                              cancelLabel: '취소',
                              danger: true,
                              onConfirm: async () => {
                                try {
                                  await fbDeleteWorkReport(r.voyageKey, r.ts);
                                } catch (e) { setRepNotice({ kind: 'err', text: '삭제 실패: ' + e.message }); }  // TallyOne 1.0(L5)
                              },
                            });
                          }}
                            className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded opacity-50 group-hover:opacity-100"
                            title="이 보고 삭제">
                            <Trash2 className="w-3 h-3"/>
                          </button>
                        </div>
                      </div>
                      <div className="text-xxs text-dim-200 whitespace-pre-line ml-4">{r.message || ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="text-xs text-dim-400 text-center py-3">최근 작업 보고가 없습니다.</div>
            )}
            </Fold>
          </div>
        </div>
      )}

      {/* ★ 4.24 🧰 관리 탭 — 묶음 넷(+소유자). 컴은 왼쪽 묶음 · 오른쪽 그 묶음의 항목, 폰은 누른 묶음만 펴지는 아코디언(평소엔 닫힘). */}
      {tab === 'manage' && (
        <div className="grid gap-3 items-start min-[700px]:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] max-w-app mx-auto" data-chief-pane="manage">
          <div className="space-y-2 min-w-0" data-chief-groups="1">
            {groups.map((g) => (
              <React.Fragment key={g.id}>
                <GroupDoor g={g} on={curGroup === g.id} wide={wideUI}
                  onClick={() => setMgGroup(wideUI ? g.id : (curGroup === g.id ? null : g.id))} />
                {!wideUI && curGroup === g.id && (
                  <div className="space-y-2 pl-1" data-chief-group-body={g.id}>{groupBody(g.id)}</div>
                )}
              </React.Fragment>
            ))}
          </div>
          {wideUI && curGroup && (() => {
            const g = groups.find((x) => x.id === curGroup);
            return (
              <div className={`min-w-0 rounded-card border-2 p-3 space-y-2 ${g && g.danger ? 'border-red-700/60 bg-red-950/10' : 'border-ink-700 bg-ink-900/60'}`} data-chief-group-body={curGroup}>
                <div className="text-lg font-black text-dim-100">{g ? `${g.ico} ${g.name}` : ''}</div>
                {groupBody(curGroup)}
              </div>
            );
          })()}
        </div>
      )}

      {editKey && voyages[editKey] && (
        <ChiefBayEdit voyage={voyages[editKey]} voyageKey={editKey} inspector={inspector} activeWorkers={activeByVoyage[editKey] || []} onClose={() => setEditKey(null)} />
      )}
      {planKey && voyages[planKey] && (
        <LoadingPlanEdit voyage={voyages[planKey]} voyageKey={planKey} inspector={inspector} onClose={() => setPlanKey(null)} />
      )}

      {/* M3.74: confirm() → ConfirmModal · 4.24: 위험 구역 «한 번 더 묻기» 창 */}
      <ConfirmModal {...confirmState} />
      <ConfirmModal {...dangerState} />
    </div>
  );
}

// M8.08: LOLO 검수 항차 카드 (실시간 표). 양하/선적 모두, 처리 현황을 컨테이너별로 표시.
//   ATRP 엠티 실 현황과 동일 형태 — 처리된 건 검수자·시각 표시, 미처리는 흐리게.
function LoloVoyageCard({ item, onOpenVoyage, onExport }) {
  const modeKo = item.mode === 'discharge' ? '양하' : '선적';
  return (
    <div className="border-2 border-cyan-700/50 bg-cyan-950/15 rounded-pill p-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-dim-100">
            🔍 {item.vsl || '(선박명 없음)'} <span className="text-dim-300">{item.voy}</span>
          </div>
          <div className="text-2xs text-dim-400">{modeKo} 검수 · LOLO(베이 없음)</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${item.done === item.total ? 'text-emerald-400' : 'text-amber-400'}`}>
            {item.done} / {item.total}
          </div>
          <div className="text-2xs text-dim-400">{item.total - item.done}대 남음</div>
        </div>
      </div>

      {/* 실시간 표 (최대 50줄) */}
      <div className="bg-ink-950 rounded border border-line overflow-hidden">
        <table className="w-full text-xxs">
          <thead className="bg-ink-800 text-dim-300">
            <tr>
              <th className="px-1.5 py-1 text-left w-8">No</th>
              <th className="px-1.5 py-1 text-left">컨번호</th>
              <th className="px-1.5 py-1 text-left w-14">규격</th>
              <th className="px-1.5 py-1 text-left w-10">F/E</th>
              <th className="px-1.5 py-1 text-left w-24">실번호</th>
              <th className="px-1.5 py-1 text-left w-14">검수자</th>
              <th className="px-1.5 py-1 text-left w-12">시각</th>
            </tr>
          </thead>
          <tbody>
            {item.rows.slice(0, 50).map((c, i) => (
              <tr key={i} className={`border-t border-line ${c.done ? '' : 'opacity-50'}`}>
                <td className="px-1.5 py-1 text-dim-400 mono">{i + 1}</td>
                <td className="px-1.5 py-1 mono text-dim-100">{c.cn}</td>
                <td className="px-1.5 py-1 mono text-dim-300">{isoShown(c.iso)}</td>
                <td className="px-1.5 py-1 mono">
                  {c.fe === 'E'
                    ? <span className="text-amber-300 font-bold">E</span>
                    : <span className="text-rose-300">F</span>}
                </td>
                <td className="px-1.5 py-1 mono text-dim-200 text-2xs break-all">
                  {c.sl || <span className="text-dim-500">-</span>}
                </td>
                <td className="px-1.5 py-1 text-dim-300 text-2xs">
                  {c.done ? (c.by || '✓') : <span className="text-dim-500">⏳ 대기</span>}
                </td>
                <td className="px-1.5 py-1 text-dim-400 text-2xs mono">
                  {c.at ? new Date(c.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {item.rows.length > 50 && (
          <div className="text-2xs text-dim-400 text-center py-1 border-t border-line">
            ... 외 {item.rows.length - 50}대 (엑셀 다운로드로 전체 확인)
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button onClick={() => onOpenVoyage?.(item.voyageKey)}
          className="py-2 bg-ink-750 hover:bg-ink-700 text-dim-100 rounded text-xs font-bold">
          항차 열기
        </button>
        <button onClick={() => onExport(item, 'seal')}
          title="실번호 변경·리씰·실오류 건만 (ACTUAL SEAL LIST 형식)"
          className="py-2 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-200 rounded text-xs font-bold flex items-center justify-center gap-1">
          <Send className="w-3 h-3"/>실번호
        </button>
        <button onClick={() => onExport(item, 'loading')}
          title="처리분 전체 (LOADING LIST 형식)"
          className="py-2 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-200 rounded text-xs font-bold flex items-center justify-center gap-1">
          <FileSpreadsheet className="w-3 h-3"/>검수리스트
        </button>
      </div>
    </div>
  );
}

// M3.5.5: 엠티 실 작업 항차 카드 (실시간 표)
function SealVoyageCard({ sv, onOpenVoyage }) {
  const [downloading, setDownloading] = useState(false);
  // TallyOne 1.0(L5): 다운로드 결과 alert → 카드 안 인라인 통지
  const [notice, setNotice] = useState(null);
  const isAttach = sv.policy.mode === 'attach';
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await generateEmptySealReport({
        voyage: sv.voyage,
        sealTargets: sv.targets,
        sealMode: sv.policy.mode,
      });
      setNotice({ kind: 'ok', text: `✅ 다운로드: ${result.filename}\n${result.rowCount}대` });
    } catch (e) {
      setNotice({ kind: 'err', text: '실패: ' + e.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`border-2 rounded-pill p-2.5 ${isAttach ? 'border-red-700/50 bg-red-950/15' : 'border-cyan-700/50 bg-cyan-950/15'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-dim-100">
            {isAttach ? '🔧' : '🔍'} {sv.voyage?.info?.vsl} <span className="text-dim-300">{sv.voyage?.info?.voy_l || sv.voyage?.info?.voy}</span>
          </div>
          <div className="text-2xs text-dim-400">{sv.policy.label}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${sv.done === sv.total ? 'text-emerald-400' : 'text-amber-400'}`}>
            {sv.done} / {sv.total}
          </div>
          <div className="text-2xs text-dim-400">{sv.total - sv.done}대 남음</div>
        </div>
      </div>

      {/* TallyOne 1.0(L5): 다운로드 결과 인라인 통지 */}
      <InlineNotice notice={notice} onClose={() => setNotice(null)} />

      {/* 실시간 표 (최대 50줄) */}
      <div className="bg-ink-950 rounded border border-line overflow-hidden">
        <table className="w-full text-xxs">
          <thead className="bg-ink-800 text-dim-300">
            <tr>
              <th className="px-1.5 py-1 text-left w-8">No</th>
              <th className="px-1.5 py-1 text-left">컨번호</th>
              <th className="px-1.5 py-1 text-left w-14">규격</th>
              <th className="px-1.5 py-1 text-left w-20">엠티실</th>
              {sv.policy.mode === 'verify' && <th className="px-1.5 py-1 text-left w-20">리씰/틀린</th>}
              <th className="px-1.5 py-1 text-left w-14">검수자</th>
              <th className="px-1.5 py-1 text-left w-12">시각</th>
            </tr>
          </thead>
          <tbody>
            {sv.targets.slice(0, 50).map((c, i) => {
              const filled = !!c.eseal;
              return (
                <tr key={i} className={`border-t border-line ${filled ? '' : 'opacity-50'}`}>
                  <td className="px-1.5 py-1 text-dim-400 mono">{i + 1}</td>
                  <td className="px-1.5 py-1 mono text-dim-100">{c.cn || '(현장부여)'}</td>
                  <td className="px-1.5 py-1 mono text-dim-300">{emptySealSpecTally(c)}</td>
                  <td className="px-1.5 py-1 mono">
                    {c.eseal ? <span className="text-emerald-300 font-bold">{c.eseal}</span> : <span className="text-dim-500">⏳ 대기</span>}
                  </td>
                  {sv.policy.mode === 'verify' && (
                    <td className="px-1.5 py-1 mono">
                      {c.reseal && <span className="text-purple-300">🔄{c.reseal}</span>}
                      {c.eseal_wrong && <span className="text-amber-300 ml-1">⚠️{c.eseal_wrong}</span>}
                    </td>
                  )}
                  <td className="px-1.5 py-1 text-dim-300 text-2xs">{c.eseal_by || '-'}</td>
                  <td className="px-1.5 py-1 text-dim-400 text-2xs mono">
                    {c.eseal_at ? new Date(c.eseal_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sv.targets.length > 50 && (
          <div className="text-2xs text-dim-400 text-center py-1 border-t border-line">
            ... 외 {sv.targets.length - 50}대 (엑셀 다운로드로 전체 확인)
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => onOpenVoyage?.(sv.voyageKey)}
          className="py-2 bg-ink-750 hover:bg-ink-700 text-dim-100 rounded text-xs font-bold">
          항차 열기
        </button>
        <button onClick={handleDownload} disabled={downloading}
          className={`py-2 rounded text-xs font-bold text-white flex items-center justify-center gap-1 ${
            isAttach ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
          } disabled:opacity-50`}>
          <FileSpreadsheet className="w-3 h-3"/>
          {downloading ? '...' : '엑셀'}
        </button>
      </div>
    </div>
  );
}

// 오답 리포트 한 줄
function FeedbackRow({ feedback: f }) {
  const [expanded, setExpanded] = useState(false);
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  const date = new Date(f.ts);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const typeColor = f.answerType === 'ai' ? 'text-purple-300' : 'text-emerald-300';
  const typeLabel = f.answerType === 'ai' ? 'AI' : f.answerType === 'local' ? '즉답' : '?';

  return (
    <div className={`bg-ink-950 border ${f.resolved ? 'border-line opacity-60' : 'border-red-900/40'} rounded-pill p-2.5`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {f.resolved && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0"/>}
          <span className="text-2xs text-dim-400">{dateStr}</span>
          <span className="text-2xs text-amber-300 font-bold">{f.inspector}</span>
          <span className={`text-2xs font-bold ${typeColor}`}>[{typeLabel}]</span>
          {f.voyageVsl && <span className="text-2xs text-dim-400 truncate">{f.voyageVsl}</span>}
          <span className="text-3xs text-dim-500 mono">v{f.appVersion}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => fbResolveFeedback(f._key || f.ts, !f.resolved)}
            title={f.resolved ? '미해결로 되돌리기' : '해결됨 표시'}
            className="text-2xs px-1.5 py-0.5 rounded bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/40">
            {f.resolved ? '↩' : '✓'}
          </button>
          <button onClick={() => askConfirm({
            title: '오답 리포트 삭제',
            message: `Q: ${(f.query || '').slice(0, 50)}\n\n이 오답 리포트를 삭제하시겠습니까?`,
            confirmLabel: '삭제',
            cancelLabel: '취소',
            danger: true,
            onConfirm: async () => { await fbDeleteFeedback(f._key || f.ts); },
          })}
            title="삭제"
            className="text-2xs px-1.5 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/40">
            <Trash2 className="w-2.5 h-2.5"/>
          </button>
        </div>
      </div>
      <ConfirmModal {...confirmState} />
      <div className="text-xs text-amber-200 mono break-all mb-1">Q: {f.query}</div>
      {/* TallyOne 1.16: **클로드 회신** — 접수 확인·처리 계획·예상 시점.
          검수사 지시 2026-08-06: "쉬운 거면 10분 이내, 복잡하면 클로드의 처리 속도에 맞춰 알려줘야
          사용자가 기다리지 않습니다." 회신이 없으면 아직 안 읽은 것이므로 그렇게 적는다. */}
      {(() => {
        const st = f.claudeStatus || '';
        if (!st) {
          return (
            <div className="text-xxs text-dim-400 bg-ink-900/60 border border-line rounded px-2 py-1 mb-1">
              🕐 개발 확인 대기 — 아직 회신이 없습니다
            </div>
          );
        }
        // TallyOne 1.17: **답이 먼저다** (검수사 지시 2026-08-06 —
        //   "질문에 대한 답을 먼저. 4개가 있습니다, 컨번호 알려주고, 대략 30분 후부터는 앱이 자동으로
        //    알려줄 거라는 것입니다"). 검수사는 지금 답이 필요하다. 앱 수정 일정은 그 다음이다.
        const remainMin = f.claudeEtaAt ? Math.round((f.claudeEtaAt - Date.now()) / 60000) : null;
        const tone = st === 'fixed'
          ? { box: 'border-emerald-700/50 bg-emerald-950/30', head: 'text-emerald-300', icon: '✅', label: '반영 완료' }
          : st === 'wontfix'
            ? { box: 'border-line bg-ink-900/60', head: 'text-dim-200', icon: '↩', label: '수정 안 함' }
            : { box: 'border-sky-700/50 bg-sky-950/25', head: 'text-sky-300', icon: '🔧', label: '처리 예정' };
        return (
          <div className={`text-xxs rounded px-2 py-1.5 mb-1 border leading-relaxed ${tone.box}`}>
            {/* 질문에 대한 답 — 앱이 못 낸 답을 클로드가 직접 낸 것. 가장 위에 크게. */}
            {f.claudeAnswer && (
              <div className="mb-1.5 pb-1.5 border-b border-line">
                <div className="text-2xs font-bold text-amber-300 mb-0.5">💬 답</div>
                <div className="text-xxs text-dim-100 whitespace-pre-wrap mono leading-snug">{f.claudeAnswer}</div>
              </div>
            )}
            <div className={`font-bold ${tone.head}`}>
              {tone.icon} 개발 — {tone.label}
              {f.claudeEta && st !== 'fixed' && <span className="ml-1 text-dim-200">· {f.claudeEta}</span>}
              {/* 남은 시간 — 막연한 '곧'이 아니라 숫자로. 지나면 그것도 그대로 적는다. */}
              {remainMin != null && st !== 'fixed' && (
                <span className={`ml-1 ${remainMin >= 0 ? 'text-dim-300' : 'text-amber-400'}`}>
                  {remainMin >= 0 ? `(약 ${remainMin}분 남음)` : `(예정 ${-remainMin}분 지남 — 확인 중)`}
                </span>
              )}
              {f.fixedVersion && st === 'fixed' && <span className="ml-1 text-dim-200 mono">· {f.fixedVersion}</span>}
              {/* 반영된 것은 신고 후 몇 분 만이었는지 남긴다 — 다음에 얼마나 기다리면 되는지의 근거. */}
              {st === 'fixed' && f.claudeAt && f.ts && (
                <span className="ml-1 text-emerald-400/80">· 신고 후 {Math.max(1, Math.round((f.claudeAt - f.ts) / 60000))}분</span>
              )}
            </div>
            {f.claudePlan && <div className="text-dim-200 mt-0.5 whitespace-pre-wrap">{f.claudePlan}</div>}
            {f.claudeAt && (
              <div className="text-2xs text-dim-400 mt-0.5">
                {new Date(f.claudeAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        );
      })()}
      {f.userNote && (
        <div className="text-xs text-dim-200 bg-ink-900/60 rounded px-2 py-1 mb-1 leading-relaxed">
          💬 {f.userNote}
        </div>
      )}
      <button onClick={() => setExpanded(v => !v)}
        className="text-2xs text-dim-400 hover:text-dim-200">
        {expanded ? '▼ 답변 숨기기' : '▶ 앱 답변 보기'}
      </button>
      {expanded && (
        <div className="mt-1 text-xxs text-dim-300 whitespace-pre-wrap leading-relaxed bg-ink-900/40 rounded p-2 max-h-40 overflow-y-auto">
          {f.answerText || '(없음)'}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// M7.22: 선박 라이브러리 (진행 상황) — 현재 살아있는 voyages 기준.
//   수석검수사가 최종 확인 후 [완료 저장] → archive 백업 + 보관소 기록 + voyages 삭제.
//   양하/선적 수는 평택분(tallyVoyagesByShip이 _ptkCountOfSection로 집계).
// ─────────────────────────────────────────────────────────────
function LiveProgressSection({ voyages, onOpenVoyage, chief, inspector, pilotForecast = {}, portMisData = null, resolveBox }) {   // 1.55-01: resolveBox 미전달 ReferenceError — TALLYBOX 저장이 항상 다운로드로 떨어지던 원인   // 1.40-01: 🚢신고도착
  const [busyKey, setBusyKey] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);
  //  2.79: 터미널 실적 반영 — 완료 저장과 같은 2단계 확인·수석 전용 패턴, 상태는 따로 둔다.
  const [confirmTermKey, setConfirmTermKey] = useState(null);
  const [termBusyKey, setTermBusyKey] = useState(null);
  // TallyOne 1.0(L5): 결과 통지 alert() → 섹션 안 인라인 알림(확인창 성격 window.confirm은 유지)
  const [notice, setNotice] = useState(null);
  const [showWaiting, setShowWaiting] = useState(false);   // 4.24: «⏳ 자료 대기 N척» 접힘 — 평소엔 닫힘(A6)

  // 항차별 진행 행 (선박별 합계가 아니라 항차 단위 — 완료는 항차별로 누름)
  const rows = useMemo(() => {
    const out = [];
    for (const [key, v] of Object.entries(voyages || {})) {
      const info = v.info || {};
      const vsl = info.vsl || key.split('_')[0] || '(선박명 미상)';
      const dPtk = countPtkSection(v.discharge, 'discharge', { ...v, key });   // 4.20 감사: 양하는 평택 양하분 한 벌(항차째로 넘겨 시프팅을 뺀다)
      const lPtk = countPtkSection(v.loading, 'loading');
      out.push({
        key, vsl,
        voyD: info.voy_d || '', voyL: info.voy_l || '',
        discharge: dPtk, loading: lPtk,
        //  2.79: CATOS 터미널 실적 반영 대기 수 — 판정은 utils.computeTermApply 한 벌(쓰기와 동일).
        termApplyD: computeTermApply(v.discharge?.termWork, v.discharge?.completed).length,
        termApplyL: computeTermApply(v.loading?.termWork, v.loading?.completed).length,
        // TallyOne 1.0(L3): 일정 정보 — 수집기가 채우는 planDate("ETA ~ ETD")·planSrc(출처 판단 결과)
        planDate: info.planDate || '', planSrc: info.planSrc || '',
        // 1.40-01: PORT-MIS 항 도착(세관 신고) 원본 — 콜사인 매칭. 도선과 다른 사건이라 따로 표기한다.
        //  ★ 2.78: 콜사인 하나만 보던 것 → 베이매트릭스 신원(공용 매처 한 벌).
        //    수집기가 콜사인을 못 싣는 배(RZOR 등)는 여기서 늘 빈칸이었다.
        pmEta: (() => {
          if (!portMisData) return '';
          const rec = matchPortMis(portMisData, info);
          return (rec && rec.eta) || '';
        })(),
        imo: info.imo || '',
        createdAt: info.createdAt || 0,
        // V7.90: 완료 분리 — 보유 모드가 전부 완료되면 수석 최종 저장 가능 (구 inspectorDone 하위호환)
        inspectorDone: !!info.inspectorDone
          || ((dPtk === 0 && lPtk === 0) ? false
              : (dPtk === 0 || !!info.dischargeDone) && (lPtk === 0 || !!info.loadingDone)),
        inspectorDoneAt: info.inspectorDoneAt || Math.max(info.dischargeDoneAt || 0, info.loadingDoneAt || 0),
        dDone: !!(info.inspectorDone || info.dischargeDone), dDoneAt: info.dischargeDoneAt || 0,
        lDone: !!(info.inspectorDone || info.loadingDone), lDoneAt: info.loadingDoneAt || 0,
      });
    }
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [voyages, portMisData]);   // 1.40-01: 신고도착이 늦게 도착해도 다시 계산

  //  2.79: CATOS 터미널 실적을 completed 로 일괄 반영 (검수사 확정 — «수석이 승인 버튼으로 일괄 반영»).
  //    fbApplyTermWork 가 누르는 순간 termWork·completed 를 새로 읽으므로, 그 사이 검수원이 찍은
  //    컨은 자동으로 제외된다(현장 기록 보호 — 추가만, 덮어쓰기 없음).
  const doApplyTerm = async (row) => {
    if (!chief) {
      alert('⚠️ 터미널 실적 반영 권한이 없습니다.\n\n반영은 수석검수사만 할 수 있습니다.\n(현재 로그인: ' + (inspector || '없음') + ')');
      setConfirmTermKey(null);
      return;
    }
    setTermBusyKey(row.key);
    try {
      const parts = [];
      let total = 0;
      for (const mode of ['discharge', 'loading']) {
        const cnt = mode === 'discharge' ? row.termApplyD : row.termApplyL;
        if (!cnt) continue;
        const res = await fbApplyTermWork(row.key, mode);
        total += res.applied;
        parts.push(`${mode === 'discharge' ? '양하' : '선적'} ${res.applied}대`);
      }
      setNotice(total > 0
        ? { kind: 'ok', text: `🏗 터미널 실적 반영 완료 — ${row.vsl} ${parts.join(' · ')} (완료자는 그 조 등록 근무자로 표기되고, 등록이 없으면 «터미널 반영». 시각은 터미널 반입시각). 베이플랜에서 초록·✔ 로 확인하세요.` }
        : { kind: 'warn', text: `반영할 것이 없습니다 — ${row.vsl} 터미널 실적이 전부 앱 완료와 일치합니다.` });
    } catch (e) {
      //  조용한 실패 금지 — 실패는 화면에 드러낸다.
      setNotice({ kind: 'err', text: `터미널 실적 반영 실패(${row.vsl}) — ${e?.message || e}` });
    }
    setTermBusyKey(null);
    setConfirmTermKey(null);
  };

  const doComplete = async (row) => {
    if (!chief) {   // V7.94-18: 수석검수/부수석만 완료 저장 가능
      alert('⚠️ 완료 저장 권한이 없습니다.\n\n항차 완료 저장은 수석검수사만 할 수 있습니다.\n(현재 로그인: ' + (inspector || '미상') + ')\n\n수석검수사에게 완료 저장을 요청하세요.');
      setConfirmKey(null);
      return;
    }
    // V8.92: 선적 미완 가드(RZOR R074E 사건 2026-07-13) — 선적 항차(voy_l)가 배정돼 있는데
    //   선적 완료 표시가 없으면(자료가 아직 안 와 lPtk=0이라 버튼이 열린 경우) 통삭제 전에
    //   명시적 확인을 받는다. 완료 저장은 항차 전체(양하+선적)를 보관소로 옮기고 화면에서 지운다.
    //   (실사고: RZOR 양하 완료 → 수석 완료 저장 → 선적 R074W 진행 예정인데 항차 전체 소실.)
    {
      const _info = (voyages[row.key] || {}).info || {};
      if (_info.voy_l && !_info.loadingDone && !_info.inspectorDone) {
        const go = window.confirm(
          `⚠ 이 항차에는 선적(${_info.voy_l})이 배정되어 있는데 선적 완료 표시가 없습니다.\n\n` +
          `완료 저장은 항차 전체(양하·선적)를 보관소로 옮기고 화면에서 지웁니다.\n` +
          `선적 작업이 남아 있으면 [취소]를 누르세요.\n\n정말 완료 저장할까요?`);
        if (!go) { setConfirmKey(null); return; }
      }
    }
    // TallyOne 1.8-12: **오프라인 배너를 믿고 막지 않는다.**
    //   1.8-11 은 `.info/connected` 가 false 면 완료 저장을 차단했다. 그런데 그 값이 **거짓으로
    //   false 에 멈춰 있는 경우**가 실측됐다(2026-08-05, 집 PC·유선). 배너가 떠 있는 상태에서
    //   누른 검수 완료가 서버에 정상 기록됐다(dischargeDoneAt·loadingDoneAt 11:39).
    //   `fbReconnect()` 의 goOffline→goOnline 이 `.info/connected` 구독을 끊고 복구를 못 한 탓으로
    //   보인다. 그 거짓 신호로 막으면 **완료 저장을 영영 못 하게 된다** — 원래 문제보다 나쁘다.
    //   → 막지 않는다. 아래 시간 제한이 '갇힘'을 막고, 시간이 넘으면 삭제하지 않는다.
    //     연결이 의심스러우면 알리기만 한다.
    if (!(await fbIsOnline())) {
      setNotice({ kind: 'warn', text: '⚠ 연결이 끊긴 것으로 보입니다 — 그래도 저장을 시도합니다.\n1분 안에 끝나지 않으면 중단하고 항차는 그대로 둡니다. (화면 새로고침으로 연결이 되살아나기도 합니다)' });
    }
    setBusyKey(row.key);
    try {
      // TallyOne 1.8-11: 시작한 뒤 신호가 끊겨도 **갇히지 않게** 시간 제한을 둔다.
      //   백업이 끝났는지 모르는 채로 삭제하는 일은 없어야 하므로, 시간이 넘으면 삭제하지 않고
      //   실패로 처리한다. 큐에 남은 쓰기는 연결이 살아나면 archive 에 들어가지만, **삭제는 안 한다.**
      const ok = await Promise.race([
        fbArchiveVoyageBeforeDelete(row.imo, row.key, voyages[row.key]),
        new Promise((res) => setTimeout(() => res('timeout'), 60000)),
      ]);
      if (ok === 'timeout') {
        setNotice({ kind: 'err', text: `완료 저장이 끝나지 않았습니다(${row.vsl}) — 신호가 끊긴 것으로 보입니다.\n항차는 그대로 두었습니다. 신호 잡히는 곳에서 다시 눌러 주세요.` });
        setBusyKey(null); setConfirmKey(null);
        return;
      }
      if (!ok) {
        // TallyOne 1.0(L5): alert → 인라인 알림
        setNotice({ kind: 'err', text: `완료 저장 실패(${row.vsl}) — 백업이 저장되지 않아 삭제하지 않았습니다. 네트워크 확인 후 다시 시도하세요.` });
        setBusyKey(null); setConfirmKey(null);
        return;
      }
      await fbDeleteVoyage(row.key, { archived: true });   // 3.60-19: 보관소 저장 뒤라 휴지통 복사는 건너뜀
      setNotice({ kind: 'ok', text: `✅ ${row.vsl} 완료 저장 — 보관소로 이동했습니다.` });  // TallyOne 1.0(L5): 성공도 화면에 명시
    } catch (e) {
      console.error('[수석 완료] 실패:', row.key, e);
      setNotice({ kind: 'err', text: `완료 저장 중 오류가 발생해 삭제하지 않았습니다(${row.vsl}). ${e?.message || e}` });  // TallyOne 1.0(L5)
    }
    setBusyKey(null); setConfirmKey(null);
  };

  // ── V8.93: 실선적 EDI(표준 BAPLIE) + 수정용 엑셀 왕복 (사용자 확정 2026-07-13) ──
  //   범위 = 평택 선적분(실체 위치 우선). 선적확인된 컨 우선 — 완료 0이면 전체(확인창).
  const ediFileRef = React.useRef(null);
  const [ediUpKey, setEdiUpKey] = useState(null);
  const _ediMeta = (key, v) => {
    const info = (v && v.info) || {};
    // 1.88 (검수사 확정): 그 배가 «받은 판대로» 내보낸다 — 선적 수신 EDI 우선, 없으면 양하 수신 EDI 의 UNH 판.
    const ediVer = detectEdiVer(v?.loading?.raw?.edi?.text || v?.discharge?.raw?.edi?.text || '');
    return { vsl: info.vsl || key.split('_')[0] || 'VSL', vslFull: info.vslFull || '',
             voy: info.voy_l || info.voy || '', callsign: info.callsign || '', imo: info.imo || '',
             carrier: info.carrier || '', ediVer, ascHdr: info.ascHdr || '' };   // 1.88-01: 수집기가 실은 수신 ASC 머리
  };
  const _collectOrWarn = (row) => {
    const v = voyages[row.key];
    if (!v) return null;
    const got = collectActualLoading(v);
    if (!got.rows.length) { setNotice({ kind: 'err', text: '평택 선적분 자료가 없습니다.' }); return null; }  // TallyOne 1.0(L5)
    if (!got.useDoneOnly && !window.confirm(
      `선적확인(완료)된 컨이 아직 없습니다.\n전체 평택 선적분 ${got.totalPtk}대 기준으로 만들까요?`)) return null;
    return { ...got, meta: _ediMeta(row.key, v) };
  };
  // TallyOne 1.7: TALLYBOX가 연결돼 있으면 다운로드 대신 `{선박}\{항차}\` 에 바로 쓴다.
  //   연결 안 됐거나 미지원 브라우저면 종전대로 다운로드(폴백). 실패해도 다운로드로 떨어진다.
  const _saveOrDownload = async (row, kind, filename, text) => {
    const v = voyages[row.key];
    const info = (v && v.info) || {};
    try {
      const root = await resolveBox();
      if (root) {
        const ext = filename.slice(filename.lastIndexOf('.'));
        const name = fileNameFor(kind, info.vsl || row.vsl, info.voy_d, info.voy_l, ext);
        const p = await writeTallyboxFile(root, info.vsl || row.vsl, folderName(info.voy_d, info.voy_l), name,
          new Blob([text], { type: 'text/plain' }));
        setNotice({ kind: 'ok', text: `✅ TALLYBOX\\${p} 저장 — 다운로드 폴더를 거치지 않았습니다.` });
        return;
      }
    } catch (e) {
      setNotice({ kind: 'err', text: `TALLYBOX 저장 실패 — 다운로드로 내려받습니다. (${e?.message || e})` });
    }
    downloadText(filename, text);
  };
  const exportActualEdi = (row) => {
    const got = _collectOrWarn(row);
    if (!got) return;
    _saveOrDownload(row, 'edi', `${got.meta.vsl}_${got.meta.voy}_ACTUAL_BAPLIE.edi`, buildActualBaplie(got.rows, got.meta));
  };
  // V8.94: 실선적 ASC(카스피 $604) — 선박코드는 기본 검수앱 코드, 저장 전 입력창에서 수정 가능(선박별 기억).
  const exportActualAsc = (row) => {
    const got = _collectOrWarn(row);
    if (!got) return;
    const lsKey = 'ascShipCode_' + got.meta.vsl;
    let saved = '';
    try { saved = localStorage.getItem(lsKey) || ''; } catch { /* 무시 */ }
    const input = window.prompt('ASC 선박코드(4자)\n기본은 검수앱 코드입니다. 다른 코드를 쓰면 고쳐 주세요.', saved || got.meta.vsl);
    if (input == null) return;
    const shipCode = (input.trim().toUpperCase() || got.meta.vsl).slice(0, 4);
    try { localStorage.setItem(lsKey, shipCode); } catch { /* 무시 */ }
    _saveOrDownload(row, 'asc', `${got.meta.vsl}${got.meta.voy}.ASC`, buildActualAsc(got.rows, { ...got.meta, shipCode }));
  };
  const exportEditExcel = async (row) => {
    const got = _collectOrWarn(row);
    if (!got) return;
    try {
      const buf = await buildEditExcel(got.rows, got.meta);
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${got.meta.vsl}_${got.meta.voy}_EDIT.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setNotice({ kind: 'err', text: '엑셀 생성 실패: ' + (e && e.message || e) });  // TallyOne 1.0(L5)
    }
  };
  const startExcelToEdi = (row) => {
    setEdiUpKey(row.key);
    if (ediFileRef.current) { ediFileRef.current.value = ''; ediFileRef.current.click(); }
  };
  const onExcelpicked = async (e) => {
    const file = e.target.files && e.target.files[0];
    const key = ediUpKey;
    setEdiUpKey(null);
    if (!file || !key) return;
    try {
      const { rows, errors } = await parseEditExcel(await file.arrayBuffer());
      if (!rows.length) { setNotice({ kind: 'err', text: '엑셀에서 컨테이너를 읽지 못했습니다.\n' + errors.join('\n') }); return; }  // TallyOne 1.0(L5)
      if (errors.length && !window.confirm(`형식 경고 ${errors.length}건:\n` + errors.slice(0, 8).join('\n') + '\n\n그래도 EDI를 만들까요?')) return;
      const meta = _ediMeta(key, voyages[key] || {});
      downloadText(`${meta.vsl}_${meta.voy}_ACTUAL_BAPLIE_수정본.edi`, buildActualBaplie(rows, meta));
      setNotice({ kind: 'ok', text: `✅ 수정본 EDI 생성 완료 — ${rows.length}대 (엑셀 기준)` });  // TallyOne 1.0(L5)
    } catch (err) {
      setNotice({ kind: 'err', text: '엑셀 읽기 실패: ' + (err && err.message || err) });  // TallyOne 1.0(L5)
    }
  };

  //  4.24: «자료 대기» = 평택분이 양하·선적 모두 0 이고, 완료 저장(검수 완료)도 터미널 실적 반영 대기도 없는 항차 — 눌러야 할 단추가 하나도 없는 줄만 접는다.
  const isWaitingRow = (r) => r.discharge === 0 && r.loading === 0 && !r.inspectorDone && (r.termApplyD + r.termApplyL) === 0;
  const liveRows = rows.filter((r) => !isWaitingRow(r));
  const waitRows = rows.filter(isWaitingRow);
  //  4.24: 진행 줄 한 벌 — 자료 있는 항차와 «자료 대기» 접힘 안의 항차가 같은 줄을 쓴다(종전 줄 그대로 · 처리기 그대로)
  const renderRow = (r) => (
    <div key={r.key} className="bg-ink-800/60 border border-line rounded-pill px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenVoyage && onOpenVoyage(r.key)}
          className="font-bold text-dim-100 text-sm flex-1 text-left hover:text-cyan-300 truncate"
          title="항차 열기"
        >
          🚢 {r.vsl}
        </button>
        {confirmKey === r.key ? (
          <div className="flex items-center gap-1">
            <span className="text-2xs text-amber-300 mr-1">최종 저장?</span>
            <button
              onClick={() => doComplete(r)}
              disabled={busyKey === r.key}
              className="text-xxs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
            >{busyKey === r.key ? '저장 중…' : '예'}</button>
            <button
              onClick={() => setConfirmKey(null)}
              className="text-xxs px-2 py-1 rounded bg-ink-750 hover:bg-ink-700 text-dim-100"
            >취소</button>
          </div>
        ) : r.inspectorDone ? (
          chief ? (
            <button
              onClick={() => setConfirmKey(r.key)}
              className="text-xxs px-2 py-1 rounded bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-700/50 font-bold"
              title="검수사 완료 확인됨 — 수석 최종 저장 (보관소로 이동)"
            >✓ 수석 완료 저장</button>
          ) : (
            <button
              onClick={() => alert('⚠️ 완료 저장 권한이 없습니다.\n\n항차 완료 저장은 수석검수사만 할 수 있습니다.\n(현재 로그인: ' + (inspector || '미상') + ')\n\n수석검수사에게 완료 저장을 요청하세요.')}
              className="text-xxs px-2 py-1 rounded bg-ink-750/40 text-dim-300 border border-line-strong/40 font-bold"
              title="수석검수사만 완료 저장할 수 있습니다"
            >🔒 수석 전용</button>
          )
        ) : (
          <span
            className="text-2xs px-2 py-1 rounded bg-ink-750/40 text-dim-300 border border-line-strong/40"
            title="검수사가 항차 화면에서 '검수 완료'를 눌러야 수석이 최종 저장할 수 있습니다"
          >검수 진행 중</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs">
        <span className="text-sky-300">양하 <b className="text-sky-200">{r.discharge}</b>{r.discharge > 0 && r.dDone && <b className="text-emerald-400"> ✓{r.dDoneAt ? new Date(r.dDoneAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</b>}</span>
        <span className="text-emerald-300">선적 <b className="text-emerald-200">{r.loading}</b>{r.loading > 0 && r.lDone && <b className="text-emerald-400"> ✓{r.lDoneAt ? new Date(r.lDoneAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</b>}</span>
        {r.inspectorDone && (
          <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-bold">검수 완료 · 수석 확인 대기</span>
        )}
        {(r.voyD || r.voyL) && (
          <span className="text-dim-400 text-2xs ml-auto">
            {r.voyD && `양하 ${r.voyD}`}{r.voyD && r.voyL && ' · '}{r.voyL && `선적 ${r.voyL}`}
          </span>
        )}
      </div>
      {/* 2.79: CATOS 터미널 실적 반영 — 반영 대기(termWork 반입분 − 앱 완료)가 있을 때만.
          검수사 확정 «수석이 승인 버튼으로 일괄 반영». 수석이 아니면 잠금 표시(자리를 남긴다 — 2-0-D). */}
      {(r.termApplyD + r.termApplyL) > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          {confirmTermKey === r.key ? (
            <>
              <span className="text-2xs text-amber-300">터미널 실적 {r.termApplyD + r.termApplyL}대를 완료로 반영?</span>
              <button
                onClick={() => doApplyTerm(r)}
                disabled={termBusyKey === r.key}
                style={{ minHeight: 36 }}
                className="text-xxs px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50"
              >{termBusyKey === r.key ? '반영 중…' : '예'}</button>
              <button
                onClick={() => setConfirmTermKey(null)}
                style={{ minHeight: 36 }}
                className="text-xxs px-3 rounded bg-ink-750 hover:bg-ink-700 text-dim-100"
              >취소</button>
            </>
          ) : chief ? (
            <button
              onClick={() => setConfirmTermKey(r.key)}
              style={{ minHeight: 36 }}
              className="text-xxs px-3 rounded-pill bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 font-bold"
              title="터미널 검수 입력(실적) 중 앱에 완료가 안 찍힌 컨을 일괄 완료로 — 완료자는 그 조 등록 근무자, 등록이 없으면 «터미널 반영». 검수원 기록은 덮지 않음"
            >🏗 터미널 실적 반영 {r.termApplyD + r.termApplyL}{r.termApplyL > 0 ? ` (양하 ${r.termApplyD} · 선적 ${r.termApplyL})` : ''}</button>
          ) : (
            <span
              className="text-2xs px-2 py-1 rounded bg-ink-750/40 text-dim-300 border border-line-strong/40"
              title="터미널 실적 반영은 수석검수사만 할 수 있습니다"
            >🔒 터미널 실적 {r.termApplyD + r.termApplyL}대 대기 — 수석 전용</span>
          )}
        </div>
      )}
      {/* TallyOne 1.0(L3): 일정 정보 — 작업일자(출처 뱃지)·도선 입출항. 완료 저장 타이밍 판단 근거 */}
      <ScheduleLine planDate={r.planDate} planSrc={r.planSrc} pmEta={r.pmEta}
        pf={(pilotForecast || {})[(r.vsl || '').toUpperCase()]} />
      {/* TallyOne 1.0(L4): V8.93 도구 4종 — 10px 초소형 버튼을 줄 아래 40px 터치 타깃 행으로 재배치(기능 불변) */}
      {r.loading > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
          <button onClick={() => exportActualEdi(r)} style={{ minHeight: 40 }}
            className="px-2 rounded-pill bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/40 text-xxs font-bold"
            title="실선적 EDI 내려받기 — 평택 선적분(실체 위치 기준)을 표준 BAPLIE로 생성. 표준 형식이라 그대로 읽힙니다.">실선적 EDI</button>
          <button onClick={() => exportActualAsc(r)} style={{ minHeight: 40 }}
            className="px-2 rounded-pill bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/40 text-xxs font-bold"
            title="실선적 ASC 내려받기 — 표준 $604 ASC 형식. 선박코드는 저장 전에 고칠 수 있습니다.">실선적 ASC</button>
          <button onClick={() => exportEditExcel(r)} style={{ minHeight: 40 }}
            className="px-2 rounded-pill bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/40 text-xxs font-bold"
            title="EDI 수정용 엑셀 내려받기 — 컨번호·위치·POD 등을 고친 뒤 [엑셀→EDI]로 올리면 수정본 EDI가 나옵니다. 헤더 줄은 그대로 두세요.">수정 엑셀</button>
          <button onClick={() => startExcelToEdi(r)} style={{ minHeight: 40 }}
            className="px-2 rounded-pill bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/40 text-xxs font-bold"
            title="수정한 엑셀을 선택하면 수정본 EDI 파일을 만들어 내려줍니다.">엑셀→EDI</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-ink-900 border border-cyan-800/40 rounded-btn p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Ship className="w-4 h-4 text-cyan-400" />
        <div className="text-base font-bold text-dim-100 flex-1">
          진행 상황 · 완료 저장 <span className="text-sm text-dim-400 font-normal">자료 있는 {liveRows.length}척{waitRows.length ? ` · 자료 대기 ${waitRows.length}척` : ''}</span>
        </div>
      </div>
      {/* TallyOne 1.0(L5): 이 섹션의 결과 통지(완료 저장·EDI/엑셀 생성) 인라인 표시 */}
      <InlineNotice notice={notice} onClose={() => setNotice(null)} />
      {/* V8.93: 엑셀→EDI 업로드용 숨은 파일 선택 */}
      <input ref={ediFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onExcelpicked} />
      {rows.length === 0 ? (
        <div className="text-center text-dim-400 text-xs py-6">현재 작업 중인 항차가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {liveRows.map(renderRow)}
          {/* 4.24: 자료가 아직 없는 항차(양하·선적 평택분 0 · 완료 저장·터미널 반영 대기도 없음)는 한 줄로 접는다(B8 «작업중인지도 모르는 화면» · C15 «몇개외 몇건 … 나머지도 보고자 하면 볼수 있어야»). 펼치면 종전 줄 그대로 */}
          {waitRows.length > 0 && (
            <button type="button" onClick={() => setShowWaiting((o) => !o)} data-waiting-fold={waitRows.length}
              className="w-full flex items-center justify-between gap-2 px-3 rounded-btn border bg-ink-900 border-line hover:border-line-strong text-left" style={{ minHeight: 44 }}>
              <span className="text-sm2 font-bold text-dim-200 truncate tx-lg:whitespace-normal tx-lg:break-keep">⏳ 자료 대기 {waitRows.length}척 — {waitRows.map((r) => `${r.vsl}${r.voyD || r.voyL ? ' ' + (r.voyD || r.voyL) : ''}`).join(' · ')}</span>
              <span className="text-dim-400 text-xs shrink-0">{showWaiting ? '▲ 접기' : '▸ 펼치기'}</span>
            </button>
          )}
          {showWaiting && waitRows.map(renderRow)}
        </div>
      )}
      <div className="text-2xs text-dim-400 mt-2">평택분 기준 · 수석검수사 최종 확인 후 완료 저장 → 자료 보관소로 이동</div>
    </div>
  );
}

// 한 섹션(discharge/loading)의 평택분 컨테이너 수 — UI용 (firebase _ptkCountOfSection과 동일 기준)
export function countPtkSection(section, mode, voyage) {   // 3.53: 연막검사가 **동작으로** 재도록 내보낸다(순수 함수)
  //  ★ 4.20 감사(Fable 판정 상-2 · 3.53 «선박 통계·보관도 마감텔리와 같은 수»): 양하 = 평택 양하분 한 벌(utils.ptkDischargeUnitsOf — 세관 목록 + 추가분 − 시프팅).
  //    수석 보드 «양하 N»이 마감텔리·홈 카드와 같은 수를 말한다(RZOR R106E 190 · PCBJ 2609N 149). 항차(voyage)를 넘기면 그 시프팅을 뺀다. 선적은 종전 그대로.
  if (mode === 'discharge') return section ? ptkDischargeUnitsOf(voyage && voyage.discharge === section ? voyage : { discharge: section }).set.size : 0;
  // V7.40: 평택분 판정 모드별 정확화 (지침 7.1·8.3 — 양하=POD평택, 선적=POL평택).
  if (!section || !section.ediContainers) return 0;
  const set = new Set();
  const _recs = section.records || {};   // 3.53: POD 확정 반영 — 수석 보드도 같은 수를 말해야 한다
  for (const c of Object.values(section.ediContainers)) {
    const _rec = _recs[c.cn] || _recs[String(c.cn || '').toUpperCase()] || null;
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(resolvedPod(c, _rec))
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(c.pod));
    if (isPtk) set.add(c.cn || JSON.stringify(c));
  }
  return set.size;
}

// ─────────────────────────────────────────────────────────────
// M7.22: 선박별 자료 보관소 (완료 기록) — ships 노드 기준, 최근 완료순.
//   선박별 항차 줄(항차·양하·선적·일자) + 누적(항차 수·양하·선적).
// ─────────────────────────────────────────────────────────────
function ShipArchiveSection({ shipLib }) {
  const [search, setSearch] = useState('');

  const ships = useMemo(() => {
    const out = [];
    for (const [imo, s] of Object.entries(shipLib || {})) {
      const voys = s?.voyages || {};
      const voyRows = Object.entries(voys).map(([vk, v]) => ({
        key: vk,
        // V8.43: 항차 표시는 항차 키(검수사가 만든 항차) 기준 — EDI 헤더의 전항차/오기
        //   voy_d가 그대로 떠서 실제와 다른 번호가 보이던 버그(예: NSDC 2605N에 2611N 표시) 수정.
        // V8.84: 양하·선적 항차 둘 다 표시(사용자 요청 2026-07-08 '같이 마감했는데 항차가 둘다 기록 안 됨').
        //   완료 저장이 기록한 info 기반 voy_d/voy_l(신뢰)이 둘 다 있으면 "양하/선적"으로,
        //   아니면 기존대로 항차 키. EDI 헤더 voy 불신은 V8.43 그대로 유지.
        voy: (() => {
          const kv = vk.split('_').slice(1).join('_');
          const vd = String(v?.voy_d || '').trim().toUpperCase();
          const vl = String(v?.voy_l || '').trim().toUpperCase();
          if (vd && vl && vd !== vl) return `${vd}/${vl}`;
          return kv || vd || vl || v?.voy || vk;
        })(),
        discharge: v?.discharge_ptk || 0,
        loading: v?.loading_ptk || 0,
        at: v?.completed_at || v?.analyzed_at || 0,
        vsl: v?.vsl || '',
        vslFull: v?.vslFull || '',
      })).filter(r => r.discharge > 0 || r.loading > 0);
      if (voyRows.length === 0) continue;   // 완료 항차 없는 배(구조만)는 보관소에 안 보임
      voyRows.sort((a, b) => (b.at || 0) - (a.at || 0));
      const totalD = voyRows.reduce((s, r) => s + r.discharge, 0);
      const totalL = voyRows.reduce((s, r) => s + r.loading, 0);
      const lastAt = voyRows[0]?.at || 0;
      // 선박명 결정 (M7.24c): 사용자 입력 약자(vsl, 예 PCBJ/TNJP) 최우선 — 검수사가
      //   약자만 봐도 선박을 식별함. 약자 없으면 ships.name → vslFull(풀네임) → 키 순.
      const pick = (arr) => arr.find(v => v && String(v).trim()) || '';
      let shipName = pick(voyRows.map(r => r.vsl));        // 약자 우선
      if (!shipName) shipName = s?.name && !/^[0-9]{7}$/.test(s.name) ? s.name : '';
      if (!shipName) shipName = pick(voyRows.map(r => r.vslFull));
      if (!shipName) shipName = s?.name || imo;
      out.push({ imo, name: shipName, voyRows, totalD, totalL, lastAt });
    }
    return out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));   // 최근 완료순
  }, [shipLib]);

  const q = search.trim().toLowerCase();
  const filtered = !q ? ships : ships.filter(s =>
    String(s.name).toLowerCase().includes(q) || String(s.imo).toLowerCase().includes(q));

  const fmtDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-ink-900 border border-purple-800/40 rounded-btn p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Library className="w-4 h-4 text-purple-400" />
        <div className="text-sm font-bold text-dim-100 flex-1">
          선박별 자료 보관소 ({ships.length}척)
        </div>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="선박명 / IMO 검색"
        className="w-full mb-2 px-3 py-1.5 rounded-pill bg-ink-800 border border-line text-dim-100 text-xs placeholder-dim-400"
      />
      {filtered.length === 0 ? (
        <div className="text-center text-dim-400 text-xs py-6">완료 저장된 항차가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.imo} className="bg-ink-800/50 border border-line rounded-pill p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-dim-100 text-sm flex-1 truncate">⚓ {s.name}</span>
                <span className="text-2xs text-dim-400">{/^[0-9]{7}$/.test(s.imo) ? `IMO ${s.imo}` : s.imo}</span>
              </div>
              <div className="space-y-0.5">
                {s.voyRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2 text-xs px-1 py-0.5 border-b border-line/30 last:border-0">
                    {/* V8.84-01: 양하/선적 항차가 truncate로 잘려 선적이 안 보이던 문제 — 두 줄로 쌓아 표시 */}
                    <span className="text-amber-300 font-bold w-16 shrink-0 leading-tight">
                      {String(r.voy).includes('/')
                        ? String(r.voy).split('/').map((p, i) => <span key={i} className="block">{p}</span>)
                        : r.voy}
                    </span>
                    <span className="text-sky-300">양하 <b className="text-sky-200">{r.discharge}</b></span>
                    <span className="text-emerald-300">선적 <b className="text-emerald-200">{r.loading}</b></span>
                    <span className="text-dim-400 text-2xs ml-auto">{fmtDate(r.at)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1 pt-1 border-t border-line-strong/40 text-xs">
                <span className="text-dim-300">누적 <b className="text-dim-100">{s.voyRows.length}</b>항차</span>
                <span className="text-sky-400">양하 누적 <b className="text-sky-300">{s.totalD}</b></span>
                <span className="text-emerald-400">선적 누적 <b className="text-emerald-300">{s.totalL}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-2xs text-dim-400 mt-2">평택분 기준 · 최근 완료순 · 완료 저장 시 자동 기록</div>
    </div>
  );
}

// 4.24: 수집기 상태 배너(CollectorStatusBanner)는 상황판 상태 줄 «● 수집기 N분 전» 칩으로 옮겼다 — 같은 판정(heartbeatState · healthSummary), 자세한 판·주기는 칩 title.

// TallyOne 1.0(L3): 진행 상황 줄 일정 표시 — planSrc 출처 뱃지는 HomePage 1026행 _MK와 같은 표기.
//   자리별 출처('입항출처|출항출처')도 같은 규칙으로 풀며, 일정이 전혀 없으면 '자료 없음'을 명시.
function ScheduleLine({ planDate, planSrc, pf, pmEta = '' }) {
  const MK = { mail: '📧메일', pilot: '⚓도선', portmis: '🚢신고', plan: '📋배정' };
  const pp = String(planSrc || '').split('|');
  const srcIn = MK[pp[0]] || '';
  const srcOut = MK[pp[1] || pp[0]] || '';
  const srcLabel = srcIn && srcOut && srcIn !== srcOut ? `${srcIn}/${srcOut}` : (srcIn || srcOut);
  const fmt = (s) => {
    const ms = parsePortMisDateTime(s);
    if (ms == null) return String(s || '');
    const d = new Date(ms);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const hasAny = planDate || (pf && (pf.nextArr || pf.nextDep));
  if (!hasAny) return <div className="text-2xs text-dim-500 mt-0.5">📅 일정 자료 없음 (수집기 미수신)</div>;
  return (
    <div className="text-2xs text-dim-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
      {planDate && <span>📅 {planDate}{srcLabel ? ` (${srcLabel})` : ''}</span>}
      {/* TallyOne 1.40-01: 🛠 작업예정 줄 삭제. planDate 앞자리가 **이미 작업시작**이라(수집기가 환산해
          넣는다) 여기서 부두 소요를 또 더해 2시간 초과 표시가 났다 — 위 📅 줄과 같은 값이므로 중복이기도 했다.
          도선 **입항 원본**은 아래 ⚓ 입항 줄이 그대로 보여준다. 1.22 주석의 오답 1786057401908은
          수집기 v1.0-16 환산이 들어오기 전 이야기다. */}
      {pf?.nextArr && <span className="text-sky-300">⚓ 입항 {fmt(pf.nextArr)}</span>}
      {/* 1.40-01: 🚢 신고도착 — PORT-MIS 세관 신고 항 도착시각(원본). 도선 시작과 다른 사건이다. */}
      {pmEta && <span className="text-dim-300" title="PORT-MIS 세관 신고 기준 항 도착시각">🚢 신고도착 {fmt(pmEta)}</span>}
      {pf?.nextDep && <span className="text-amber-300">⚓ 출항 {fmt(pf.nextDep)}</span>}
    </div>
  );
}

// TallyOne 1.0(L5): 결과 통지 인라인 알림 — alert() 대신 해당 섹션 안에서 보여준다. ✕로 닫음.
function InlineNotice({ notice, onClose }) {
  if (!notice) return null;
  const ok = notice.kind !== 'err';
  return (
    <div className={`flex items-start gap-2 text-xxs rounded-pill border px-2.5 py-1.5 mb-2 ${ok
      ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
      : 'bg-red-950/40 border-red-700/50 text-red-200'}`}>
      <span className="flex-1 whitespace-pre-line break-all">{notice.text}</span>
      <button onClick={onClose} title="알림 닫기"
        className="shrink-0 px-1.5 font-bold text-dim-300 hover:text-dim-100" style={{ minWidth: 28, minHeight: 24 }}>✕</button>
    </div>
  );
}

// 4.24: BigStat(전체 확인 · 누락) 두 칸은 뺐다 — 각 보드 행의 «완료/전체» 가 그 숫자이고(NaN 수리는 computeStats), 누락은 상태 줄 «누락 N» 칩이 말한다.

function InspectorRow({ s }) {
  return (
    <div className="bg-ink-800/40 border border-line rounded-pill p-2 flex items-center gap-2">
      <div className="relative">
        <div className="w-9 h-9 bg-amber-600 rounded-full flex items-center justify-center text-amber-100 font-black">
          {s.name[0]}
        </div>
        {s.active && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-ink-900"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-dim-100 truncate">{s.name}{s.viewOnly && <span className="ml-1.5 text-3xs font-bold text-sky-300 border border-sky-700/60 rounded px-1 align-middle" title="로그인 뒤 «조회만» 을 고른 사람 — 호기·작업량에 안 잡힌다(3.50)">조회</span>}</div>
        <div className="text-2xs text-dim-400 mono flex items-center gap-2 flex-wrap">
          <span><span className="text-emerald-400 font-bold">{s.today}</span> 오늘</span>
          <span>·</span>
          <span><span className="text-dim-200 font-bold">{s.total}</span> 누적</span>
          {s.lastAt > 0 && (
            <>
              <span>·</span>
              <span><Clock className="w-2.5 h-2.5 inline"/> {timeAgo(s.lastAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-2xs mono">
        {s.dis > 0 && <span className="bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded font-black">양 {s.dis}</span>}
        {s.loa > 0 && <span className="bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded font-black">선 {s.loa}</span>}
      </div>
    </div>
  );
}

// V7.40: 실시간 작업 보드 카드 — 한 선박의 진행·작업자·최근 보고·경고를 한눈에
// TallyOne 1.0(L2): tw(터미널 실적, ±12h 창 가드 통과분)·departed(터미널 출항 상태) 추가 — 옵셔널
//  3.11: 별첨 칸 — 완료(오른맞춤)·/전체(왼맞춤) 두 td 라 «/» 가 한 세로줄(검수사 «/ 가 수직으로 같아야 합니다»). 모듈 수준(렌더마다 새 타입이면 td 가 전부 재마운트).
function LegendCell({ e }) {
  if (!e || !e.n) return <><td className="pl-1 pr-0 text-right text-dim-600">-</td><td className="pl-0 pr-1"></td></>;
  return <><td className="pl-1 pr-0 text-right whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}><span className={e.done === e.n ? 'text-emerald-300 font-bold' : e.done ? 'text-dim-100' : 'text-dim-500'}>{e.done}</span></td><td className="pl-0 pr-1 text-left text-dim-500 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>/{e.n}</td></>;
}
//  3.48: FitBox 는 components/FitBox.jsx 로 옮겼다(동작 무변경) — 베이뷰 작업이 같은 상자를 쓰는데, 대시보드에서 가져가면 VoyagePage 가 대시보드 모듈(pdf 파서까지)을 통째로 끌어 연막 번들이 깨진다.
/*  ★ 3.35 — 실시간 작업 보드의 한 칸. **«BAY (12)13» 을 배율 밖에서 크게 그린다.**
    검수사 2026-09-09 — «베이표기 글자 이야기 입니다» · «그걸 한눈에 들어 오게 하되 **베이크기 확대 축소에 상관없이** 크게».
    ⚠ 그림은 `FitBox` 가 `transform: scale()` 로 줄인다. 제목이 그 안에 있으면 같이 줄어
      실측 **11px × 배율 0.6 ≈ 6.6px** — 수석이 한눈에 못 읽었다. 확대해도 그림과 같은 비율로 커질 뿐이라
      «확대 축소에 상관없이» 가 안 됐다.
    ⇒ 제목만 `scale()` **밖**으로 뺀다 — `BayPlan` 이 `onTitles` 로 그 장들의 제목을 올려 주고 여기서 고정 px 로 그린다.
      배율을 아무리 줄여도 이 글자는 그대로다. 그림 안 제목은 `titleOut` 으로 감춰 두 번 안 나오게 한다.
    ⚠ 제목은 **BayPlan 이 만든 그것**이다(«BAY (12)13» 짝 표기 포함) — 여기서 다시 짓지 않는다(규범 §4-4). */
//  칸이 몇이든 같은 자 — 호기 3대까지 24 · 4대 18 · 5대 이상 16px.
export const boardTitlePx = (n) => (n >= 5 ? 16 : n === 4 ? 18 : 24);
function BoardBayCell({ px = 24, fit = {}, plan = {} }) {
  const [titles, setTitles] = useState([]);
  //  ⚠ 제목은 **BayPlan 이 만든 그것 하나뿐**이다 — 여기서 `c.bay` 로 다시 짓지 않는다(규범 §4-4).
  //    아직 안 올라왔거나(첫 렌더) 그 장이 사전에 없으면 **아무것도 안 적는다** — 그림이 그 사정을 말한다.
  const show = titles;
  return (
    <>
      {show.length ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 py-0.5">
          {show.map((t) => (
            <span key={t} className="mono font-black text-amber-300" style={{ fontSize: px, lineHeight: 1.05 }}>{t}</span>
          ))}
        </div>
      ) : null}
      <FitBox {...fit}><BayPlan {...plan} titleOut onTitles={setTitles} /></FitBox>
    </>
  );
}
//  ★ 4.05 (검수사 2026-10-05 «수석 대쉬보드 OBWH는 앱을 사용하다 멈췄으면 본선작업현황이라도 보여 줘야 하는데 몇시간째 멈춰있습니다») —
//    4.03 은 «베이 그림을 하나도 못 그릴 때»만 터미널 본선 현황 표를 냈다. 그런데 검수원이 몇 건 찍고 멈추면(실측 OBWH 2757E — 10:36 작업 시작, 앱 완료 2건이 2시간 전)
//    그 옛 베이 그림이 «지금 작업 중인 베이» 로 계속 남아 터미널 표는 영영 안 나왔다. 앱 입력이 이 시간 넘게 없고 접속 검수원도 없으면 그림 대신 터미널 표를 낸다.
//    시간이 한 곳이라 바꿀 때는 이 줄만 고친다(30분 — 갱 하나가 베이 하나를 도는 시간보다 길고, 점심·교대 사이 쉼보다 짧다).
export const BOARD_APP_STALE_MS = 30 * 60 * 1000;
export function LiveShipCard({ zoom = 1, v, workers, lastReport, alerts, onOpen, departed = false, cranes = [], focused = false, canFocus = false, onFocus = null, voyage = null, rows = 1, onOpenContainer = null }) {   // 3.11: voyage(그림·별첨 자료) · rows(보드에 몇 줄인가 — 칸 배율)   // 3.10: export — 렌더 연막검사(tools/smoke_liveboard)가 직접 그린다   // 3.10: cranes — utils.craneBoardOf 한 벌 · focused/onFocus — 그 배만 전체
  // V9.57(I4): 100% 클램프
  const pct = pctOf(v.totalDone, v.totalAll);   // 4.24: 막대 % 한 벌(pctOf — MiniBar·폰 카드와 같은 식)
  const repIcon = lastReport ? (
    lastReport.type === 'work_status' ? '📤' : lastReport.type === 'hatch' ? '🔓' :
    lastReport.type === 'conbox' ? '📦' : lastReport.type === 'damage' ? '⚠️' :
    lastReport.type === 'seal_error' ? '🚨' :
    lastReport.type === 'external_pause' ? '⛔' : '📋') : null;  // V9.57(I2): 작업중단 아이콘 추가
  //  3.10: 카드 = 한 줄. 왼쪽 통계(진행·터미널 대조·검수원·경고) · 오른쪽 호기별 «지금 작업 베이» — 검수사 «좌측에 통계가 우측에 작업화면».
  const fmtAgo = (t) => { if (!t) return ''; const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`; };
  //  ★ 3.11: 오른쪽 = 호기마다 **지금 작업 중인 베이 그림 한 장**(베이플랜과 같은 BayPlan, onlyBay) — 검수사 «앞에 베이를 원한게 아니고 보이는 베이를 원한것».
  //    컨 목록은 ChiefBayEdit 와 같은 길(fullEdiMapOf + records 실적 자리 — 3.7-08 카토스 자리가 여기 들어 있다). 완료 초록은 completed 한 벌.
  const modeOfBoard = cranes.find(c => c.mode)?.mode || (v.dis.total > 0 ? 'discharge' : 'loading');
  //  감사(성능): voyages 구독은 어느 항차든 바뀌면 통째로 새 객체라 객체 참조를 deps 로 두면 틱마다 raw BAPLIE 를 다시 파싱하고 BayPlan 전부가 다시 돈다.
  //  ⇒ ediMap 은 원시값(uploadedAt·sizeBytes·컨 수·맞교환 수)으로, 실적 자리는 서명 문자열(내용이 같으면 같은 배열)로 붙잡는다.
  const ediMaps = useMemo(() => {
    const out = {};
    for (const mode of ['discharge', 'loading']) { const sec = voyage?.[mode]; out[mode] = sec ? applySwapFix(fullEdiMapOf(sec), swapFixList(voyage)) : {}; }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.discharge?.raw?.edi?.sizeBytes, Object.keys(voyage?.discharge?.ediContainers || {}).length,
      voyage?.loading?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.sizeBytes, Object.keys(voyage?.loading?.ediContainers || {}).length, swapFixList(voyage).length]);
  const recSig = ['discharge', 'loading'].map((mode) => { const r = voyage?.[mode]?.records || {}; let sg = mode; const _oc = {}; for (const cn of Object.keys(r)) { const x = r[cn] || {}; if (x.op) _oc[x.op] = (_oc[x.op] || 0) + 1; if (x.bay_actual != null || x.planTaken || x.bay_assign) sg += `|${cn}:${x.bay_actual}-${x.row_actual}-${x.tier_actual}${x.planTaken ? 'T' : ''}${x.bay_assign ? `>${x.bay_assign}-${x.row_assign}-${x.tier_assign}` : ''}`; } return sg + `§${Object.keys(r).length}` + Object.keys(_oc).sort().map((k) => k + _oc[k]).join(','); }).join('#');   // 3.13: 정해 준 자리도 서명에   // 3.66-01(재감사): 리스트 수·선사 분포도 — 세관이 EDI 뒤에 와도 켜 둔 보드의 그림·별첨 선사가 바로 바뀐다
  //  ★ 3.15: **그 배의 «장(해치)» 목록** — 보드가 세는 묶음과 BayPlan 이 그리는 장을 같게 만든다(`hatchEvenOf` 가 이것을 받는다).
  //    BayPlan 안에서 하는 두 호출(getShipBayDictData → buildBayPagesFromSummary)과 같은 길이다. 사전이 없으면 null 이고,
  //    그때는 홀수를 «홀로 선 앞홀수»로 보는 같은 폴백을 양쪽이 함께 쓴다.
  const boardPages = useMemo(() => {
    const imo = voyage?.info?.imo, nm = voyage?.info?.vsl;
    if (!imo && !nm) return null;
    try {
      const dict = getShipBayDictData(imo, nm, { vslCode: String(v.key || '').split('_')[0], callsign: voyage?.info?.callsign || '', vslFull: voyage?.info?.vslFull || nm || '' });
      if (!dict?.bayDef?.baysSummary) return null;
      return buildBayPagesFromSummary(dict.bayDef) || null;
    } catch (e) { console.warn('[보드] 베이사전 장 목록 실패 — 해치 묶기는 폴백으로 갑니다', e); return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyage?.info?.imo, voyage?.info?.vsl, v.key]);
  const boardContainers = useMemo(() => {
    const out = {};
    //  3.31: 보드 별첨1(선사별)·베이 그림 색도 마감텔리와 같은 선사 코드로(감사 지적).
    const _spOpB = shipOpMapper(String(voyage?.info?.vsl || '').toUpperCase(),
      ['discharge', 'loading'].flatMap((m) => [
        ...Object.values(voyage?.[m]?.ediContainers || {}), ...Object.values(voyage?.[m]?.records || {}),
      ]).map((c) => c && c.op));
    const pad2 = (x) => String(x ?? '').padStart(2, '0');
    for (const mode of ['discharge', 'loading']) {
      const sec = voyage?.[mode]; if (!sec) { out[mode] = []; continue; }
      const recAll = sec.records || {};
      const recMap = {}; for (const cn of ownDirCns(recAll, mode)) recMap[cn] = recAll[cn];   // 감사: 반대 방향 오염 기록은 베이플랜 탭처럼 거른다
      out[mode] = Object.values(ediMaps[mode]).map((e) => {
        const rec = recMap[e.cn] || {};
        const gone = rec.bay_actual === '__STG__' || !!rec.planTaken;   // 감사: 임시창고·자리를 내준 컨은 탭처럼 격자에서 뺀다(한 칸 두 대 방지)
        const hasA = !gone && rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null && !String(rec.bay_actual).startsWith('__');
        const hasG = !gone && !hasA && rec.bay_assign && rec.row_assign && rec.tier_assign && !String(rec.bay_assign).startsWith('__');   // 3.13: 자동 맞교환 자리
        //  3.66-01 (감사): 리스트 선사를 보지 않고 EDI 선사만 찍어, 같은 보드의 컨 상세(pickCarrierOp)와 선사가 갈렸다(DXQD 세관 SKR 이 여기만 DWS).
        const _opB = (rec.op || e.op) ? pickCarrierOp(rec.op, e.op, String(voyage?.info?.vsl || '').toUpperCase()) : e.op;
        return { ...e, op: _opB ? _spOpB(_opB) : _opB, _inList: !!recMap[e.cn] || !!e._inList, _assigned: !!hasG, _assign_warn: hasG ? (rec._assign_warn || '') : '',
          bay: gone ? '' : pad2(hasA ? rec.bay_actual : hasG ? rec.bay_assign : e.bay), row: gone ? '' : pad2(hasA ? rec.row_actual : hasG ? rec.row_assign : e.row), tier: gone ? '' : pad2(hasA ? rec.tier_actual : hasG ? rec.tier_assign : e.tier) };
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ediMaps, recSig, voyage?.info?.vsl]);   // 3.31: 배가 바뀌면 선사 별칭도 다시
  //  그림에 줄 수 있는 높이 — 보드 높이(100vh − 9rem)를 줄 수(최대 4)로 나누고 카드·호기 머리(≈ 60px)를 뺀다. 포커스(그 배만)면 한 줄 전부.
  const wide = typeof window !== 'undefined' && window.innerWidth >= 640;   // sm 이상 = 가로 배치(줄 높이가 정해짐) → 칸 높이를 재서 채운다
  const fitMaxH = React.useCallback(() => {
    const boardH = Math.max(320, window.innerHeight - 144);
    const perRow = boardH / Math.max(1, Math.min(focused ? 1 : rows, 4));
    //  ★ 3.35 — 베이 표기 줄이 그림 **위**에 새로 생겼으므로 그만큼 빼야 예산이 맞다(감사 지적).
    //    안 빼면 칸이 줄 예산보다 그 높이만큼 커져 검수사 «스크롤 없는 상태에서 최적의 화면»(3.11)이 깎인다.
    //    PC 경로(fill)는 `boundsRef` 를 FitBox 제 상단에서 재므로 저절로 빠진다 — 여기는 폰 경로다.
    const titleRow = Math.ceil(24 * 1.05) + 4;   // 고정 px 중 가장 큰 것 + 위아래 여백(py-0.5)
    return Math.max(120, Math.floor(perRow) - 60 - titleRow);
  }, [rows, focused]);
  const cardRef = React.useRef(null);   // 3.11: FitBox 가 «카드 바닥까지 남은 높이»를 재는 기준(cranePanel 보다 먼저 선언)
  //  ★ 3.19 — **호기 칸을 균등 크기로.** 검수사 2026-09-06 «이화면만 균등크기로 조정해주고».
  //    칸마다 제 그림에 맞춰 배율을 따로 잡으면 그림 크기가 제각각이 된다(실화면 — 4호기만 크게 보였다).
  //    각 칸이 알려 준 «혼자면 이 배율» 중 **가장 작은 것**을 모두에 되돌려 준다.
  const fitsRef = React.useRef({});
  const [groupFit, setGroupFit] = useState(null);
  //  ★ 3.30 — **호기 칸 상한 3 을 누르면 펴진다**(검수사 확답 2026-09-08 «③3 유지하고 «+N호기 더»를 누르면 펴지게»).
  //    «최대 3갱까지» 는 2갱 시절 요구인데 부두 정본은 **PCTC 4호기 · 동방 5호기**(utils.equipNumbersForPier)다.
  //    4갱이면 한 갱(25%), 5갱이면 두 갱(40%)의 작업 베이 그림이 화면에서 통째로 사라졌고,
  //    동방 경로(boardBaysOf)는 «+N호기 더» 안내조차 없이 조용히 빠졌다(2026-09-08 감사).
  //    ⇒ 기본은 3칸 그대로 두고(자리가 좁아지는 것을 검수사가 싫어하셨다), 누르면 전부 편다.
  const [craneOpen, setCraneOpen] = useState(false);
  const reportFit = React.useCallback((key) => (v) => {
    if (!(v > 0)) return;
    const cur = fitsRef.current;
    if (cur[key] && Math.abs(cur[key] - v) < 0.005) return;
    cur[key] = v;
    const min = Math.min(...Object.values(cur));
    setGroupFit((g) => (g != null && Math.abs(g - min) < 0.005 ? g : min));
  }, []);
  //  ★ 4.41 «완료·남은 베이» — 검수사 2026-10-21 05:09 «어디가 완료 되었는지 한눈에 보이질 않습니다 … 작업완료된 베이가 많으면 남은 베이를 보여주거나 이제 시작된것이 라면 완료된 베이를».
  //    자리 — 오른쪽 그림 칸 머리줄(«호기별 작업 베이» · «터미널 본선 현황» · «지금 작업 중인 베이»)의 늘 비어 있는 오른쪽.
  //    검수사 06:22 «저는 이곳 우측이 항상 비어 있어서 이곳을 사용할줄 알았는데 지금 사용한곳은 그거 없어도 복잡한곳인데» — 첫 판은 왼쪽 통계 칸에 넣었다가 옮겼다.
  //    판정은 utils.bayDoneSplitOf 한 벌(분모 = 별첨 · 장 = 그림과 같은 boardPages · 사전 없으면 줄 없음).
  const bayLines = !voyage ? [] : ['discharge', 'loading'].filter((m) => (boardContainers[m] || []).length).map((m) => {
    const S = bayDoneSplitOf(boardContainers[m], m, voyage[m]?.completed, boardPages);
    const txt = bayDoneTextOf(S);
    return txt ? { m, S, txt } : null;
  }).filter(Boolean);
  const bayHead = bayLines.length ? (
    <span className="ml-auto min-w-0 flex items-center gap-3 flex-wrap justify-end text-sm font-bold" data-board-baydone="head">
      {/* 재감사 2026-10-21: 줄마다 nowrap 이면 폰 시트(360·390)에서 긴 줄(«남은 — 데크 16(5)·20(40)… 홀드 …» 약 465px)이 칸을 넘어 가로 스크롤이 생긴다 — 폰은 접고 컴(sm)만 한 줄 */}
      {bayLines.map(({ m, S, txt }) => (
        <span key={m} className="min-w-0 sm:whitespace-nowrap [overflow-wrap:anywhere]" data-baydone={m} data-baydone-show={S.show}>
          <span className={m === 'loading' ? 'text-amber-300' : 'text-blue-300'}>{m === 'loading' ? '선적' : '양하'}</span>{' '}
          <span className={S.show === 'left' ? 'text-orange-200' : 'text-emerald-300'}>{txt}</span>
        </span>
      ))}
    </span>
  ) : null;
  const cranePanel = (() => {
    //  검수사 «최대 3갱까지 보이게 — 좌측 통계, 1 2 3호기, 그 밑에 다른 선박» → 호기는 옆으로 최대 3칸(그 이상은 +N).
    //  펼쳐도 상한은 둔다 — 부두 정본이 5호기까지이고, 6칸을 넘으면 격자가 두 줄로 접혀 그림이 뭉갠다.
    const shown = craneOpen ? cranes.slice(0, 5) : cranes.slice(0, 3);
    const more = cranes.length - shown.length;
    //  ★ 3.15: **컨별 자리가 안 오는 배(동방)도 그림을 낸다.** 검수사 2026-09-06 «그림도 보여주세요.
    //    양하는 맞게 내려오고 있고 선적도 계획된 선적이면 맞게 보일테이고 검수앱을 사용하면 맞게보이니까요».
    //    호기→베이를 이을 끈이 동방 자료엔 없으므로(적하목록에 pos·equip 없음) 칸을 **호기가 아니라 베이**로 세운다 —
    //    방금 완료된 컨들의 계획 자리를 해치로 묶은 것(utils.boardBaysOf). 호기별 대수는 머리줄에 그대로 둔다.
    //    ⚠ 게이트는 «동방이냐»가 아니라 «자리를 모르는 호기가 하나라도 있느냐»다(규범 §4-2 — 선박 전용 로직을 앞단에 두지 않는다 · 4.22-03 전에는 «호기 자리가 하나도 없느냐»).
    //    ⚠ 호기 자료(QC 합계)가 **아예 없을 때도** 그린다 — 동방 피드는 완료가 먼저 오고 QC 합계가 늦거나 안 올 수 있다
    //      (실측 ATPR 2640E — 양하 EDI 131대·자리 131, qcWork 아직 없음). 그때는 두 칸으로 본다(동방 기본 2갱).
    //  ★ 4.22-03 감사(중 1) — **호기별 그림은 일한 호기 줄 전부(QC 합계 줄 포함)에 숫자 베이가 있을 때만**(3.38 «전부 아니면 전무»). 하나라도 없으면 «베이로 묶음».
    //    4.22-03 부터 앱 완료가 있는 호기는 계획 EDI 자리를 얻지만 QC 합계만 있는 호기는 자리가 비어, «자리가 하나라도 있으면 호기별» 이던 종전 게이트로는
    //    보관 100척 2173점 중 29점에서 그림이 줄었다(ATPR 2644E 19:47 «양하 28·24» 두 장 → 2호기 24 한 장 + 1호기 «완료 기록이 와야 그림이 뜹니다»).
    //    «일한» = 대수가 있는 줄(done > 0). 호기를 찍은 완료가 터미널 실적에서 다른 호기로 세어져 대수 0 으로만 선 줄(실측 STMJ 2659E 3호기)은 자리를 모르는 «일한 호기» 가 아니다 —
    //    그 줄까지 세면 보관 재생 73점이 호기별에서 묶음으로 바뀌고 그중 1점은 1·2호기 두 장(터미널 자리)이 묶음 한 장으로 줄었다.
    const _hasPos = (c) => !!(c.bay && /\d/.test(String(c.bay)));
    const notAllCranePos = !cranes.some(_hasPos) || cranes.some((c) => c.done > 0 && !_hasPos(c));
    //  3.30: 펼치면 갱 수만큼 낸다 — 접혀 있을 때만 3칸으로 자른다(종전에는 언제나 3이라 4·5갱이 조용히 빠졌다).
    //  3.30: **총량을 먼저 뽑고 화면에서 자른다.** boardBaysOf 는 정렬 뒤 slice(0, want) 만 하므로
    //    크게 뽑아 뒤에서 자르는 것과 작게 뽑는 것이 같은 배열이다 — 접힘 결과가 3.29 와 한 글자도 안 달라진다.
    const bayCapShut = Math.min(3, Math.max(2, cranes.length));   // 감사: QC 가 한 대만 올라온 시점에도 두 갱을 본다(동방 기본 2갱)
    const allBays = notAllCranePos && voyage ? boardBaysOf(voyage, Math.max(2, cranes.length || 2), 30, boardPages) : [];
    const bays = craneOpen ? allBays : allBays.slice(0, bayCapShut);
    const bayMore = allBays.length - bays.length;
    //  ★ 4.05 — 앱 입력이 멈췄는가. 접속 검수원(workers)이 하나라도 있으면 아니다. 마지막 앱 완료 시각은 베이 묶음(lastAt)과 호기(lastAt·«앱 접속»)에서 가장 늦은 것.
    //    시각을 하나도 모르면(앱 완료 0건) 멈춤이 아니라 «아직 입력 없음» — 종전 분기(그림 없음 → 4.03 표)가 맡는다.
    //    ★ 감사(4.05): 호기를 안 고른 완료는 베이 묶음·호기 어느 쪽에도 안 잡힌다 — 항차 전체 완료의 가장 늦은 시각(boardRows 의 lastCompAt 과 같은 기준)을 같이 본다.
    const _lastComp = (() => { let t = 0; for (const m of ['discharge', 'loading']) for (const r of Object.values(voyage?.[m]?.completed || {})) { const a = Number(r && r.at) || 0; if (a > t) t = a; } return t; })();
    const _lastApp = Math.max(0, _lastComp, ...allBays.map((b) => Number(b.lastAt) || 0), ...cranes.map((c) => (c.src === 'live' ? Date.now() : Number(c.lastAt) || 0)));
    const _appStale = !(workers && workers.length) && _lastApp > 0 && (Date.now() - _lastApp) > BOARD_APP_STALE_MS && hasTermBoard(voyage?.info);
    //  단추는 **두 갈래가 함께 쓰는 한 벌**이다 — 종전에는 호기 갈래에만 있어서 동방 배는
    //  «+N 더»를 눌러 볼 길이 아예 없었다(감사가 잡은 «절반 미배송»).
    const openBtn = (hidden) => ((hidden > 0 || craneOpen) && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setCraneOpen((o) => !o); }}
        className="px-1.5 py-0.5 rounded-btn border border-line bg-ink-900/60 text-cyan-200 font-bold hover:bg-ink-800"
        title={craneOpen ? '칸을 셋으로 되돌립니다' : `안 보이는 ${hidden}칸까지 폅니다`}
      >{craneOpen ? '↩ 접기' : `+${hidden}칸 더 ▾`}</button>
    ));
    if (bays.length && !_appStale) return (
      <div className="sm:w-[75%] sm:h-full sm:min-h-0 sm:border-l sm:border-line sm:pl-1 flex flex-col gap-0.5">
        <div className="text-2xs text-dim-400 font-bold flex items-center gap-1.5 flex-wrap">
          <span>지금 작업 중인 베이</span>
          <span className="text-dim-500 font-normal"> · {cranes.length ? `${cranes.map((c) => `${c.no}호기 ${c.done}대`).join(' · ')} — ` : ''}호기별 자리가 안 와 베이로 묶었습니다</span>
          {openBtn(bayMore)}
          {bayHead}
        </div>
        <div className={`grid gap-1 items-start sm:items-stretch sm:flex-1 sm:min-h-0 grid-cols-1 ${bays.length >= 5 ? 'sm:grid-cols-5' : bays.length === 4 ? 'sm:grid-cols-4' : bays.length >= 3 ? 'sm:grid-cols-3' : bays.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>{/* 4.24: 폰(시트)은 베이 그림을 세로로 한 칸씩 — 컴(sm 이상)은 종전 그대로 N칸 */}
          {bays.map((b) => (
            <div key={`${b.mode}-${b.bay}`} className="flex flex-col gap-0 bg-ink-900/60 border border-line rounded-btn px-0.5 py-0.5 min-w-0 sm:min-h-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-baseline gap-1.5 mono text-2xs flex-wrap">
                <span className="text-sm font-black text-cyan-200">베이 {b.bay}</span>
                <span className={b.mode === 'loading' ? 'text-amber-200' : 'text-blue-200'}>{b.mode === 'loading' ? '선적' : '양하'} {b.n}대</span>
                <span className={`ml-auto ${(Date.now() - (b.lastAt || 0)) < 10 * 60000 ? 'text-emerald-300' : 'text-amber-300'}`}>{fmtAgo(b.lastAt)}</span>
              </div>
              <BoardBayCell px={boardTitlePx(bays.length)}
                fit={{ fill: wide, boundsRef: cardRef, maxH: wide ? null : fitMaxH, boost: zoom, onFit: reportFit(`b${b.mode}-${b.bay}`), force: groupFit }}
                plan={{ containers: boardContainers[b.mode] || [], compMap: voyage?.[b.mode]?.completed || {},
                  xrayMap: voyage?.[b.mode]?.xrayList || {}, mode: b.mode,
                  shipImo: voyage?.info?.imo, shipName: voyage?.info?.vsl, voyageInfo: voyage?.info, voyageKey: v.key,
                  onOpenContainer: (cc) => { if (onOpenContainer && cc?.cn) onOpenContainer(cc, b.mode); else onOpen(); },
                  onlyBay: b.bay, compactZoom: 0.36 }} />
            </div>
          ))}
        </div>
      </div>
    );
    //  ★ 4.03 — 이 줄까지 왔다 = 베이 묶음 그림(bays)이 없다. 호기 칸에도 그릴 자리가 하나도 없으면 터미널 본선 현황 표를 낸다.
    const _canDraw = (c) => !!(c.bay && /\d/.test(String(c.bay)) && voyage);
    const _termOnly = (!cranes.some(_canDraw) || _appStale) && hasTermBoard(voyage?.info);   // 접혀서 안 보이는 호기까지 본다 — 그림이 그려질 호기가 하나라도 있으면 종전 화면 그대로 · 4.05: 앱 입력이 멈췄으면 그림이 있어도 표
    const termBlock = _termOnly ? <TermBoardPanel info={voyage.info} /> : null;
    const boxes = _appStale ? [] : _termOnly ? shown.filter((c) => !(c.qc && !_canDraw(c))) : shown;   // 4.05: 멈췄으면 옛 호기 그림을 치우고 표만
    return (
      <div className="sm:w-[75%] sm:h-full sm:min-h-0 sm:border-l sm:border-line sm:pl-1 flex flex-col gap-0.5">   {/* 2갱이면 75/2 · 3갱이면 75/3 (grid-cols-N) · PC 는 줄 높이를 다 쓴다 */}
        <div className="text-2xs text-dim-400 font-bold flex items-center gap-1.5 flex-wrap">
          <span>{_appStale ? '터미널 본선 현황' : '호기별 작업 베이'}</span>
          {_appStale && <span className="text-amber-300 font-normal">· 앱 입력 마지막 {fmtAgo(_lastApp)} — 멈춘 동안은 터미널 표를 보입니다</span>}
          {openBtn(_termOnly && boxes.length === 0 ? 0 : more)}   {/* 4.03: 표가 호기 칸을 대신하면 «+N칸 더» 가 펼칠 것이 없다 */}
          {bayHead}
        </div>
        {/* ★ 4.03 — 검수사 2026-10-04 «수석대쉬보드의 실시간 작업 현황과 콘앱의 실시간 작업 현황이 검수사가 찍지 않으면 안보일 경우 PCTC의 선박별 본선 작업 현황과 동방의 선박별 본선작업 현황을 보여줄수 있게 해주세요».
            호기별 베이 그림을 하나도 못 그릴 때(= 검수원이 호기·자리를 안 찍음)만 터미널 현황 표를 채운다. 그림이 그려지는 배는 종전 그대로.
            동방은 QC 합계로 만든 «완료 기록이 와야 그림이 뜹니다» 칸이 이미 있는데, 그 숫자가 표에 다 들어 있어 표로 대신한다. */}
        {termBlock}
        {boxes.length === 0 ? (
          termBlock ? null : <div className="text-2xs text-dim-500">호기별 실적이 아직 없습니다 — 터미널 자료가 오면 여기 그 베이 그림이 뜹니다</div>
        ) : (
          <div className={`grid gap-1 items-start sm:items-stretch sm:flex-1 sm:min-h-0 grid-cols-1 ${boxes.length >= 5 ? 'sm:grid-cols-5' : boxes.length === 4 ? 'sm:grid-cols-4' : boxes.length >= 3 ? 'sm:grid-cols-3' : boxes.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>{/* 4.24: 폰(시트)은 세로 한 칸씩 · 컴은 종전 N칸 */}
            {boxes.map(c => (
              <div key={c.no} className="flex flex-col gap-0 bg-ink-900/60 border border-line rounded-btn px-0.5 py-0.5 min-w-0 sm:min-h-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-baseline gap-1.5 mono text-2xs flex-wrap">
                  <span className="text-sm font-black text-cyan-200">{c.no}호기</span>
                  <span className={`font-bold ${c.name ? 'text-emerald-200' : 'text-dim-500'}`}>{c.name || '미등록'}</span>
                  <span className={c.mode === 'loading' ? 'text-amber-200' : 'text-blue-200'}>{c.mode === 'loading' ? '선적' : '양하'} {c.done}대</span>
                  {/* 3.38: 동방도 시각으로 호기·베이를 갈랐으면 그 자리를 말한다 — 자리가 붙은 뒤에도 «자리 없음»이 남으면 화면이 거짓말을 한다 */}
                  {c.qc ? <span className="text-dim-400">양 {c.dis} · 선 {c.lod}{c.bay && /\d/.test(String(c.bay)) ? ` · 베이 ${c.bay}` : ' · 자리 없음(동방)'}</span> : (c.row || c.tier) ? <span className="text-dim-400">{c.bay ? `베이 ${c.bay}` : ''} {c.row || '--'}-{c.tier || '--'}</span> : null}
                  <span className={`ml-auto ${(Date.now() - (c.lastAt || 0)) < 10 * 60000 ? 'text-emerald-300' : 'text-amber-300'}`}>{c.src === 'live' ? '앱 접속' : fmtAgo(c.lastAt)}</span>
                </div>
                {c.bay && /\d/.test(String(c.bay)) && voyage ? (
                  <BoardBayCell px={boardTitlePx(boxes.length)}
                    fit={{ fill: wide, boundsRef: cardRef, maxH: wide ? null : fitMaxH, boost: zoom, onFit: reportFit(`c${c.no}`), force: groupFit }}
                    plan={{ containers: boardContainers[c.mode || modeOfBoard] || [], compMap: voyage?.[c.mode || modeOfBoard]?.completed || {},
                      xrayMap: voyage?.[c.mode || modeOfBoard]?.xrayList || {}, mode: c.mode || modeOfBoard,
                      shipImo: voyage?.info?.imo, shipName: voyage?.info?.vsl, voyageInfo: voyage?.info, voyageKey: v.key,
                      onOpenContainer: (cc) => { if (onOpenContainer && cc?.cn) onOpenContainer(cc, c.mode || modeOfBoard); else onOpen(); },
                      onlyBay: c.bay, compactZoom: 0.36 }} />
                ) : (
                  <div className="text-2xs text-dim-500 py-3 text-center">{c.qc ? '완료 기록이 와야 그림이 뜹니다' : '베이 미상'}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })();
  //  ★ 3.20-04 — 검수사 2026-09-06 «두척이니 작게 보이고 원할때는 한척 작업하는것처럼 크게 보고 닫음 처음처럼 두척이 보이게» ·
  //    «가고 싶을때 가야 하는데 클릭한번 실수로» · «수석에서 일반 검수앱을 왔다 갔다 하면 안됩니다».
  //    3.10 은 «배가 하나뿐이면 눌러서 항차로»(onOpen 폴백)를 뒀는데, 그 탓에 카드를 누르면 검수원 화면으로 빠져
  //    작업 보드를 못 보게 됐다. ⇒ **카드 클릭은 크게 보기 하나**다. 항차로 가는 길은 [항차 열기 →] 버튼뿐 — 눌러야 가는 것이지 스쳐서 가는 것이 아니다.
  const clickCard = () => { if (canFocus && onFocus) onFocus(); };
  return (
    <div ref={cardRef} role="button" tabIndex={0} onClick={clickCard} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); clickCard(); } }}
      className={`w-full h-full text-left bg-ink-800/40 border rounded-btn p-1 hover:bg-ink-750/70 flex flex-col sm:flex-row gap-1 cursor-pointer ${focused ? 'border-cyan-500/70' : 'border-line'} ${departed ? 'opacity-60' : ''}`}>
      <div className="lsc-stat flex flex-col gap-1 sm:w-[25%] min-w-0 min-h-0">   {/* 검수사 «화면을 4등분해서 25% 통계 75%로 베이를» · 4.24: lsc-stat — 컴은 이 칸 높이로 별첨 표/한 줄 요약을 고른다(index.css 컨테이너 쿼리) */}
      <div className="flex items-center justify-between">
        {/* 4.24: 선박명·항차를 한 줄로(설계 «DXQD 2640E / 2640W · DWS») — 선박명이 가장 크고(text-base) 항차는 줄임. 두 줄이던 머리 한 줄만큼 통계 칸이 넓어져 «크게»·4척에서도 한 줄 요약 두 줄이 다 보인다(R34 캡처). */}
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="font-black text-base text-dim-100 shrink-0" data-board-vsl="1">{v.info.vsl}</span>
          {/* TallyOne 1.0(L2): 터미널이 출항 처리한 항차 — 흐린 카드 + 출항 뱃지 */}
          {departed && <span className="text-2xs bg-ink-750 text-dim-200 px-1.5 py-0.5 rounded font-bold shrink-0">⚓ 출항</span>}
          {workers.length > 0 && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"/>}
          <span className="text-2xs text-dim-400 truncate min-w-0">
            {voyPairOf(v.info)}{/* 4.24: 항차 표기 한 벌(voyPairOf — 폰 카드·시트 머리와 같은 식) */}
            {v.info.carrier ? ` · ${v.info.carrier}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/*  ★ 3.20-04 — **크게 보는 단추를 눈에 보이게.** 검수사 2026-09-06 «트윈 작업할때 크게 보고 싶은데 …
              선박을 클릭하면 전체화면으로 잘 볼수있고 닫으면 전체선박을 볼수있게 해달라고 했는데 그것만 안되었습니다» ·
              «크게 하는 버튼이 없고 닫는 버튼도 없습니다».
              3.10 은 «카드를 아무 데나 누르면 포커스» 로만 만들었다(clickCard). 그런데 카드 안은 별첨 표와 베이 그림으로 꽉 차 있고
              **그림 칸을 누르면 컨 상세가 뜬다**(3.11) — 누를 빈 곳이 사실상 없어 포커스가 한 번도 안 걸렸고,
              「✕ 닫기」 는 포커스일 때만 뜨니 **영영 안 보였다.** 기능은 있는데 들어가는 문이 없었던 셈이다.
              ⇒ 항차 열기 옆에 **늘 보이는** 「⤢ 크게」 를 둔다. 포커스면 그 자리가 「✕ 닫기」 다(자리를 더 안 먹는다). */}
          {focused
            ? <button onClick={(e) => { e.stopPropagation(); onFocus && onFocus(); }} className="text-2xs bg-ink-750 text-dim-200 px-2 py-0.5 rounded font-bold" title="원래대로 — 작업 중인 배를 모두 봅니다">✕ 닫기</button>
            : (canFocus && <button onClick={(e) => { e.stopPropagation(); onFocus && onFocus(); }} className="text-2xs bg-ink-750 text-dim-200 px-2 py-0.5 rounded font-bold" title="이 배만 화면 가득 — 트윈 작업 볼 때">⤢<span className="lsc-btxt"> 크게</span></button>)}
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="text-2xs bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded font-bold" title="항차 열기"><span className="lsc-btxt">항차 열기 </span>→</button>
        </div>
      </div>
      <div className="space-y-1.5 text-2xs mono">
        {v.dis.total > 0 && <MiniBar label="양하" color="blue" stats={v.dis}/>}
        {v.loa.total > 0 && <MiniBar label="선적" color="amber" stats={v.loa}/>}
        {/*  ★ 4.16: 시프팅은 양하·선적 막대에 안 섞고 따로(검수사 «양하리스트와 분리 시프팅 리스트 별도 관리»). */}
        {v.shift && v.shift.n > 0 && (
          <div className="text-sky-300 font-bold" data-shift-line={v.shift.n}>◆ 시프팅 {v.shift.n} — 내림 {v.shift.out}/{v.shift.n} · 실음 {v.shift.in}/{v.shift.n}{v.shift.fc > 0 && <span className="text-yellow-300"> · ◆ 예보 {v.shift.fc}</span>}</div>
        )}
      </div>
      {/*  3.20 — **터미널 대수는 화면에 안 쓴다.** 검수사 2026-09-06 «카토스(앱) 카운트는 놔두고 터미널 카운트는 이제 없어도 될듯합니다».
          1.0(L2) 의 이 줄은 «앱 숫자를 믿어도 되나»를 외부 합계 실적(disDone/disPlan)과 대조하려던 것이다.
          컨별 터미널 실적(termWork)이 완료로 들어오면 위 진행 막대가 곧 그 숫자라 대조가 두 벌이 된다.
          ⚠ 들어오는 길은 부두마다 다르다 — PCTC 는 수집기(catos.apply_completed)가 1분마다 스스로 넣고, 동방은 수석이 주황 「터미널 실적 반영」을 눌러야 한다.
            그 버튼은 반영할 것이 있을 때만 이 카드 안에 뜨므로(1848행), 남은 격차는 대수 대조가 아니라 그 버튼이 말해 준다.
          ⚠ 줄 자체는 남긴다 — 「지연」과 «자료가 언제 것인가»는 대수가 아니고, 미수신은 자료가 안 오는 신호라 조용히 지우지 않는다(규범 §4-3).
          ⚠ 미르 답(nlSearch)·작업 속도(3.6-01 «1순위는 터미널 실적»)는 검수사 확정 사양이라 그대로 둔다. */}
      {/*  3.20-01 — **「🏗 터미널」 줄을 통째로 없앤다.** 검수사 2026-09-06 실화면 «🏗 터미널 지연 ←????» → «없애주세요»
          · «그거 없애면서 작업중인 작업 보드가 모니터 한 화면에 차 보였으면 좋겠습니다».
          3.20 이 대수를 빼자 꼬리(「지연」·«← 방금»)만 남아 뜻이 안 통했고, 카드마다 한 줄을 그냥 먹고 있었다.
          ⚠ 조용히 사라지는 것이 아니다(규범 §4-3) — 터미널 자료가 멎은 것은 **보드 머리의 수집기 경고**(«수집기가 멈춰 …»)와
            healthcheck 가 말하고, 그 배의 지연·진행은 항차 화면·미르가 답한다. 여기서 없앤 만큼이 그림 높이로 간다. */}
      {/* ★ 3.11: 별첨 표 실시간 — 검수사 «통계는 선박 밑에 빈공간에 별첨 자료처럼 실시간으로 채워 지는걸» · «/ 가 수직으로 같아야» · «통계 글씨는 작고».
          입력은 그림과 같은 목록(boardContainers — 리스트 등재 _inList 포함, 감사: 인쇄 별첨 ptkContainers 와 같은 분모). 칸마다 완료/전체. */}
      {voyage && (() => {
        const modes = ['discharge', 'loading'].filter(m => (boardContainers[m] || []).length);
        if (!modes.length) return null;
        const has45All = modes.some(m => { const L = legendLiveOf(boardContainers[m], m, voyage[m]?.completed); return L.fe['45'].F.n + L.fe['45'].E.n > 0; });
        const ncol = has45All ? 4 : 3;   // 20' 40' (45') 계 — 표 셋이 같은 열 수·같은 colgroup 이라 «/» 가 표 사이에서도 한 줄
        //  검수사 «통계가 항목간 간격이 너무 넓습니다. 조금 줄이면 글자를 조금 키워도» — 라벨 28%, 값 쌍은 «완료|/전체» 붙여 쓰고 줄 여백 0
        //  4.24: 45' 가 있어 값 칸이 여덟이면 라벨 28% → 22% · 글자 16 → 13px(아래 lsc-tables) — 25% 칸(1440 컴 340px)·폰 시트(360~390)에서 «106/106» 이 칸을 넘어 옆 칸과 겹쳤다(R34 실측 OBWH 45칸 · 4.22-04 부터 있던 것). 45' 없는 표는 종전 그대로.
        const lblPct = has45All ? 22 : 28;
        const colgroup = <colgroup><col style={{ width: `${lblPct}%` }} />{Array.from({ length: ncol * 2 }).map((_, i) => <col key={i} style={{ width: `${(100 - lblPct) / (ncol * 2)}%` }} />)}</colgroup>;
        //  제목은 표 위 한 줄(첫 열 안에 넣으면 좁은 폭에서 «20'» 과 겹친다 — 미리보기 실측)
        const head = (labels) => <thead><tr className="text-dim-400"><th className="text-left px-1"></th>{labels.map((l, i) => <th key={i} className="px-0 text-center" colSpan={2}>{l}</th>)}</tr></thead>;
        return (<>
          {/* ★ 4.24 한 줄 요약 — 컴에서 행이 낮으면(통계 칸 높이 210px 미만 · index.css lsc-*) 별첨 표 대신 모드마다 한 줄. 표 전체는 [⤢ 크게]·한 척일 때.
              숫자는 아래 표와 같은 L(legendLiveOf) 한 벌 — 선사별 · 화물 종류(일반 밖) · 규격별 계(별첨3 계 열). 폰(시트)과 높은 행은 표만 보인다. */}
          {/* 줄은 눌리지 않는다(shrink-0 — 낮은 칸(1366×768 «크게» 4척)에서 두 줄이 반씩 눌려 겹쳐 보였다, R34 ①-4).
              4.24 2차(감사 하-1 · 모의 확인 중하-2): 칸에 다 안 들어가는 줄을 칸 밖으로 넘겨(flex-wrap) 숨겼더니 «요약 없는 배» 로 읽혔다 —
              칸 안에서 위아래로 스크롤한다(4.23-01 별첨 표가 칸 안에서 스크롤되던 것과 같다). 줄은 사라지지 않는다. */}
          <div className="lsc-compact flex-1 min-h-0 overflow-y-auto flex-col gap-px text-xs leading-snug" style={{ scrollbarWidth: 'thin' }} data-board-compact="1">
            {modes.map(m => {
              const L = legendLiveOf(boardContainers[m], m, voyage[m]?.completed);
              if (!L.n) return null;
              const line = compactLegendLine(L);
              return <div key={m} className="w-full shrink-0 truncate text-dim-200" title={line}><b className={m === 'loading' ? 'text-amber-300' : 'text-blue-300'}>{m === 'loading' ? '선적' : '양하'}</b> {line}</div>;
            })}
          </div>
          <div className={`lsc-tables fs-keep flex-1 min-h-0 overflow-auto space-y-1 leading-tight ${has45All ? 'text-sm2' : 'text-base'}`}>{/* 4.24: 별첨 표는 그림처럼 4.22-04 글자(fs-keep) — «크게»에서 18px 로 키우면 25% 칸·폰 시트에서 «106/106» 이 칸을 넘었다(R34 실측). 머리·막대·요약·검수원·합계는 글자 모드를 따른다 */}
            {modes.map(m => {
              const L = legendLiveOf(boardContainers[m], m, voyage[m]?.completed);
              if (!L.n) return null;
              const tot = (arr) => { const t = { '20': { n: 0, done: 0 }, '40': { n: 0, done: 0 }, '45': { n: 0, done: 0 }, total: { n: 0, done: 0 } }; for (const [, e] of arr) for (const k of ['20', '40', '45', 'total']) { t[k].n += e[k].n; t[k].done += e[k].done; } return t; };
              const sizes = has45All ? ['20', '40', '45', 'total'] : ['20', '40', 'total'];
              const mk = (title, rowsIn) => (
                <div key={title}>
                  <div className="font-bold text-dim-300 px-1">{title}</div>
                  <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    {colgroup}{head(has45All ? ["20'", "40'", "45'", '계'] : ["20'", "40'", '계'])}
                    <tbody>{rowsIn.map(([k, e]) => <tr key={k} className="border-t border-line/60"><td className="px-1 text-dim-200 whitespace-nowrap truncate">{k}</td>{sizes.map(sz => <LegendCell key={sz} e={e[sz]}/>)}</tr>)}</tbody>
                  </table>
                </div>
              );
              const feRows = ['20', '40', '45'].filter(sz => sz !== '45' || has45All).map(sz => [sz + "'", [L.fe[sz].F, L.fe[sz].E, ...(has45All ? [{ n: 0, done: 0 }] : []), { n: L.fe[sz].F.n + L.fe[sz].E.n, done: L.fe[sz].F.done + L.fe[sz].E.done }]]);
              const modeK = m === 'loading' ? '선적' : '양하';
              return (
                <div key={m} className="space-y-1">
                  {mk(`별첨1 · 선사별 (${modeK}) ${L.done}/${L.n}`, L.carriers.concat([['합계', tot(L.carriers)]]))}
                  {mk(`별첨2 · 화물 종류별 (${modeK})`, L.cargos.concat([['합계', tot(L.cargos)]]))}
                  <div>
                    <div className="font-bold text-dim-300 px-1">{`별첨3 · 규격별 F/E (${modeK})`}</div>
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      {colgroup}{head(has45All ? ['Full', 'Empty', '', '계'] : ['Full', 'Empty', '계'])}
                      <tbody>{feRows.map(([k, cells]) => <tr key={k} className="border-t border-line/60"><td className="px-1 text-dim-200">{k}</td>{cells.map((e, i) => <LegendCell key={i} e={e}/>)}</tr>)}</tbody>
                    </table>
                    {/* 4.15-01 (검수사 2026-10-09 15:37): 리퍼 엠티가 있으면 «엠티 N(일반 · 리퍼 엠티)» — 인쇄 별첨3 과 같은 한 줄(utils.emptySplitLabel) */}
                    {L.emptyRf.n > 0 && <div className="px-1 text-dim-300">{emptySplitLabel(L.fe['20'].E.n + L.fe['40'].E.n + L.fe['45'].E.n, L.emptyRf.n)}</div>}
                  </div>
                  {/* 3.12: 선적은 표 넷 — 검수사 «선적은 표4개가 필요합니다 양하처럼 + 포트별» */}
                  {m === 'loading' && L.pods.length > 0 && mk(`별첨4 · 목적지별 (${modeK})`, L.pods.concat([['합계', tot(L.pods)]]))}
                </div>
              );
            })}
          </div>
        </>);
      })()}
      {/* 작업 중 검수원 */}
      <div className="flex items-center gap-1 flex-wrap min-h-[18px]">
        {workers.length > 0 ? workers.map(w => (
          <span key={w.name} className="inline-flex items-center gap-1 bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-2xs font-bold px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>
            {w.name}{w.mode === 'discharge' ? ' (양하)' : w.mode === 'loading' ? ' (선적)' : ''}
          </span>
        )) : (
          <span className="text-2xs text-dim-500">작업 중 검수원 없음</span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1.5 border-t border-line text-2xs flex-wrap" data-board-foot="1">{/* 4.24: 보드 행 아래 합계(작업량 완료/전체) — 회귀 R34 ④ 가 «NaN» 을 여기서 잰다 */}
        <span className="text-emerald-300 font-black mono">{v.totalDone}</span>
        <span className="text-dim-400">/{v.totalAll} ({pct}%)</span>
        <div className="flex-1"/>
        {alerts?.damage > 0 && <span className="bg-amber-900/60 text-amber-200 px-1.5 rounded font-bold">⚠️ {alerts.damage}</span>}
        {alerts?.sealError > 0 && <span className="bg-red-900/60 text-red-200 px-1.5 rounded font-bold">🚨 {alerts.sealError}</span>}
        {lastReport && (
          <span className="text-dim-400 mono">{repIcon} {lastReport.equip || ''} {timeAgo(lastReport.ts)}</span>
        )}
      </div>
      </div>
      {cranePanel}
    </div>
  );
}

function BroadcastComposer({ inspector, owner = false }) {   // 2.05-07: owner — 소유자 공지는 «개발자» 명의(검수사 확정 «전 개발자로 띄우는거지 개인으로 띄우는게 아닙니다»)
  const [text, setText] = useState('');
  const [cur, setCur] = useState(null);
  const [reads, setReads] = useState({});
  useEffect(() => fbSubscribeBroadcast(setCur), []);
  useEffect(() => {
    if (!cur?.id) { setReads({}); return; }
    return fbSubscribeBroadcastReads(cur.id, setReads);
  }, [cur?.id]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    await fbSetBroadcast(t, owner ? '개발자' : (inspector || '수석'));   // 2.05-07: 소유자 = 개발자 명의(이름 안 나감)
    setText('');
  };
  const clear = async () => { await fbClearBroadcast(); };
  const readNames = Object.keys(reads || {});
  return (
    <div className="bg-ink-900 border border-amber-700/40 rounded-btn p-3">
      <div className="flex items-center gap-2 mb-2">
        <Send className="w-4 h-4 text-amber-400"/>
        <div className="text-sm font-bold text-dim-100">검수원 공지 (흐르는 띠)</div>
        <span className="text-2xs text-dim-400">로그인된 검수원 모든 화면에 흘러감 · 확인 전까지</span>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        placeholder="예: 이번 선박 23번 베이에 중요한 FR 실림 — 사진 촬영 바랍니다"
        className="w-full bg-ink-800 border border-line rounded p-2 text-sm text-dim-100 resize-none"/>
      <div className="flex items-center gap-2 mt-2">
        <button onClick={send} disabled={!text.trim()}
          className="px-3 py-1.5 rounded text-sm font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white flex items-center gap-1">
          <Send className="w-3.5 h-3.5"/> 보내기
        </button>
        {cur?.text && (
          <button onClick={clear} className="px-3 py-1.5 rounded text-sm font-bold bg-ink-750 hover:bg-ink-700 text-dim-100">공지 내리기</button>
        )}
      </div>
      {cur?.text && (
        <div className="mt-2 bg-amber-950/40 border border-amber-800/40 rounded p-2 text-xs">
          <div className="text-amber-200 font-bold">📢 현재 공지: {cur.text}</div>
          <div className="text-dim-300 mt-1">읽음 {readNames.length}명{readNames.length > 0 ? ` · ${readNames.join(', ')}` : ''}</div>
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, color, stats }) {
  // V9.57(I4): 진행률 100% 클램프 — done이 모수 교집합으로 제한됐어도 표시 안전망 유지
  const pct = pctOf(stats.done, stats.total);   // 4.24: 한 벌(pctOf)
  const map = {
    blue: { tag: 'bg-blue-900/60 text-blue-200', bar: 'bg-blue-500' },
    amber: { tag: 'bg-amber-900/60 text-amber-200', bar: 'bg-amber-500' },
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`${map[color].tag} px-1.5 rounded text-3xs font-black w-9 text-center`}>{label}</span>
      <div className="flex-1 bg-ink-900 rounded-full h-1.5 overflow-hidden">
        <div className={`${map[color].bar} h-full`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-dim-300 w-16 text-right">{stats.done}/{stats.total}</span>
      {/* V9.57(I4): 모수 밖 완료(추가컨 등)는 진행률에 안 섞고 따로 알린다 */}
      {stats.extra > 0 && <span className="text-violet-300 text-right whitespace-nowrap" title="리스트(모수) 밖에서 완료 처리된 컨테이너 — 추가컨·리스트 교체 잔재 등">+{stats.extra} 초과</span>}
      {stats.forecastEdi
        ? <span className="text-orange-300 text-right whitespace-nowrap" title="EDI 컨번호가 리스트와 하나도 일치하지 않음 — 예상(프리스토우) EDI. 확정 EDI 대기.">예상EDI</span>
        : stats.missing > 0 && <span className="text-red-400 min-w-[3rem] text-right whitespace-nowrap">누락 {stats.missing}</span>}{/* 4.24: «크게»에서 «누락 59» 가 두 줄로 접혀 막대 줄을 밀었다 — 한 줄로 */}
    </div>
  );
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec/60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec/3600)}시간 전`;
  return `${Math.floor(sec/86400)}일 전`;
}

export function computeStats(section, mode, shiftSet, keepOnboard) {   // 2.89-06 · 4.48 keepOnboard · 4.53: 연막검사가 동작으로 재도록 내보낸다(HomePage.computeStats 와 같은 사정)
  // V7.40: 평택분 판정을 모드별로 정확히 (지침 7.1 — 양하=POD평택, 선적=POL평택).
  //   이전: POL∨POD 평택이면 카운트 → 양하 EDI에서 평택발 타항행 컨까지 평택분으로 잡혀 과대 집계.
  //  ★ 4.24 (NaN 수리) — 구역이 없을 때도 아래 끝 줄과 **같은 모양**을 돌려준다. 종전엔 workTotal·workDone 이 없어
  //    voyageStats 의 totalDone·totalAll 이 undefined + 수 = NaN 이 됐다(한쪽 구역 없는 항차 — 사본 17항차 중 11항차):
  //    「전체 확인」 «NaN / NaN대» · 보드 카드 하단 «NaN /NaN (0%)». 합산하는 쪽(voyageStats·total·LiveShipCard)은 이 값만 더한다 — 판정은 여기 한 곳.
  if (!section) return { total: 0, done: 0, workTotal: 0, workDone: 0, extra: 0, ptk: 0, matched: 0, missing: 0, forecastEdi: false, planSlots: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  // V9.37-02: 홈 카드(HomePage.computeStats)와 **같은 규칙**. 플랜 가상 EDI는 cn 이 없어(확답 ④)
  //   c.cn 으로 넣으면 undefined 가 Set에서 1개로 합쳐진다(TMPZ 370 → 1). 키를 폴백 식별자로.
  Object.entries(ediContainers).forEach(([key, c]) => {
    if (!c) return;
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(c.pod)
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(c.pod));
    if (isPtk) ptkCns.add(c.cn || key);
  });
  // TallyOne 1.11: 모수에서 **반대 방향 리스트**를 뺀다. 항차번호가 방향까지 같은 배(N_N 타입)는
  //   메일함 폴더가 하나라 양하·선적 리스트가 섞여 들어와, 양하 카드가 두 리스트를 합산해
  //   `평택 778`(= 양하 371 + 선적 407) 로 나왔다(SWSP 2606N, 2026-08-06 실측).
  //   POL/POD 로 확정된 것만 뺀다 — 근거 없는 레코드는 그대로 센다.
  const recordCns = new Set(ownDirCns(records, mode).filter((cn) => !isShiftOffPtk(shiftSet, records, mode, cn)));   // 2.89-06 · 4.16: 문지기 한 벌
  //  3.26: 부킹 자리를 실번호가 다 채운 모드 — 자리를 빼고 실번호를 EDI 평택 대상으로(홈 카드 HomePage.computeStats 와 같은 규칙).
  const _bfill = bookingFillOfSec(section, mode);
  if (_bfill && _bfill.filled) {
    [...ptkCns].filter(cn => String(cn).startsWith('__')).forEach(cn => ptkCns.delete(cn));
    recordCns.forEach(cn => ptkCns.add(cn));
  }
  //  ★ 4.53 — 선적 EDI 가 확정한 본선 잔류(시프팅 집합에 든 지시 컨)는 EDI 평택분에서 뺀다(홈 computeStats 와 같은 한 벌 — 안 빼면 보드에 «누락 2»).
  if (mode === 'discharge') for (const cn of keepInShiftOf(keepOnboard, shiftSet)) ptkCns.delete(cn);
  //  4.48-03: 선사 지시 본선 잔류는 예정 — 평택분 합계에서 빼지 않는다(홈 computeStats 와 같은 한 벌
  const matched = [...ptkCns].filter(cn => recordCns.has(cn)).length;
  // V9.37-02: 플랜 슬롯(자리)은 누락이 아니다 — 컨번호는 NOLIST 담당. 3.26: 부킹 자리 `__BOOK_` 도 자리다.
  const planSlots = [...ptkCns].filter(cn => String(cn).startsWith('__')).length;
  const missing = Math.max(0, ptkCns.size - matched - planSlots);
  //  2.89-07: 작업량·완료는 progressOf 한 벌(홈 카드·현황 요약과 같은 숫자) —
  //    작업량 = 리스트+시프팅 · 완료 = 리스트완료+이 모드 모브 · extra = 분모 밖 완료(V9.57 I4 유지).
  const prog = progressOf(section, mode, shiftSet, ptkCns, keepOnboard);   // 4.48: 본선 잔류(양하만 쓴다)
  //  ★ 4.16: 막대 = 평택분(홈 카드와 같은 한 벌). 작업량(평택분 + 이 모드 모브)은 workTotal·workDone — 보드 전체 % 가 쓴다.
  const total = prog.ptk.total;
  const done = prog.ptk.done;
  const workTotal = prog.total, workDone = prog.done;
  const extra = prog.extra;
  // V8.90: 예상 EDI 판정(홈 카드와 동일 규칙) — 리스트가 있는데 매칭 0이면 예상(프리스토우) EDI.
  const virtual = ediValues.some(c => c && (c._virtualFromList || c._virtualFromPlan));
  const forecastEdi = !virtual && ptkCns.size > 0 && recordCns.size > 0 && matched === 0;
  return { total, done, workTotal, workDone, extra, ptk: ptkCns.size, matched, missing, forecastEdi, planSlots };  // V9.57(I4): extra 추가 · 4.16: 작업량
}

// ── V9.17: 완료 보관소 (archive 노드) — 열람·복원·1년 정리. 수석 전용 조작. ──
function ArchiveRestoreSection({ chief }) {
  const [items, setItems] = useState(null);   // null=아직 안 불러옴
  const [busy, setBusy] = useState(false);
  // TallyOne 1.0(L5): 결과 통지 alert → 섹션 안 인라인 알림(권한·확인창은 유지)
  const [notice, setNotice] = useState(null);
  const load = async () => {
    setBusy(true);
    try { setItems(await fbListArchive()); }
    catch (e) { setNotice({ kind: 'err', text: '보관소 조회 실패: ' + (e?.message || e) }); }
    finally { setBusy(false); }
  };
  const restore = async (key) => {
    if (!chief) { alert('🔒 복원은 수석검수사만 가능합니다.'); return; }
    if (!window.confirm(`"${key}" 항차를 보관소에서 복원합니다.\n홈 목록에 다시 나타나고, 수집기도 다시 자료를 받기 시작합니다. 계속할까요?`)) return;
    setBusy(true);
    try {
      const ok = await fbRestoreVoyageFromArchive(key);
      setNotice(ok ? { kind: 'ok', text: `✅ ${key} 복원 완료 — 홈에서 확인하세요.` }
                   : { kind: 'err', text: '복원 실패 — 보관 기록이 없습니다.' });
      await load();
    } catch (e) { setNotice({ kind: 'err', text: '복원 실패: ' + (e?.message || e) }); }
    finally { setBusy(false); }
  };
  const cleanup = async () => {
    if (!chief) { alert('🔒 정리는 수석검수사만 가능합니다.'); return; }
    if (!window.confirm('1년(365일) 지난 보관 항차를 영구 삭제합니다.\n복구할 수 없습니다. 계속할까요?')) return;
    setBusy(true);
    try { const n = await fbCleanupArchive(365); setNotice({ kind: 'ok', text: `🧹 ${n}건 정리 완료` }); await load(); }
    catch (e) { setNotice({ kind: 'err', text: '정리 실패: ' + (e?.message || e) }); }
    finally { setBusy(false); }
  };
  return (
    <section className="bg-ink-900 border border-line rounded-btn p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-dim-100 text-sm">🗄 완료 보관소 (복원)</h2>
        <div className="flex gap-2">
          {items && items.length > 0 && (
            <button onClick={cleanup} disabled={busy}
              className="px-2.5 py-1.5 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-300 text-xxs font-bold border border-line">
              🧹 1년 지난 것 정리
            </button>
          )}
          <button onClick={load} disabled={busy}
            className="px-3 py-1.5 rounded-pill bg-ink-750 hover:bg-ink-700 text-dim-100 text-xs2 font-bold" style={{ minHeight: 36 }}>
            {busy ? '불러오는 중…' : items ? '새로고침' : '목록 불러오기'}
          </button>
        </div>
      </div>
      <div className="text-xxs text-dim-400 mb-2">
        수석 [완료 저장]으로 화면에서 내려간 항차의 원본. 실수로 지웠거나 재작업이 잡히면 여기서 [복원].
      </div>
      {/* TallyOne 1.0(L5): 조회·복원·정리 결과 인라인 통지 */}
      <InlineNotice notice={notice} onClose={() => setNotice(null)} />
      {items === null ? (
        <div className="text-xs2 text-dim-500">버튼을 눌러 목록을 확인하세요 (필요할 때만 읽음).</div>
      ) : items.length === 0 ? (
        <div className="text-xs2 text-dim-500">보관된 항차가 없습니다.</div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {items.map(it => (
            <div key={it.voyageKey} className="flex items-center gap-2 bg-ink-800/60 rounded-pill px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm2 font-bold text-dim-100 mono truncate">{it.voyageKey}</div>
                <div className="text-xxs text-dim-400">
                  {it.archivedAt ? new Date(it.archivedAt).toLocaleDateString('ko-KR') : '?'} 저장
                  {it.discharge_ptk ? ` · 양하 ${it.discharge_ptk}` : ''}{it.loading_ptk ? ` · 선적 ${it.loading_ptk}` : ''}
                </div>
              </div>
              <button onClick={() => restore(it.voyageKey)} disabled={busy}
                className="px-3 py-2 rounded-pill bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs2 font-bold shrink-0" style={{ minHeight: 40 }}>
                복원
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── V9.19-01: 마감 텔리 엑셀 생성 (수석 전용) ─────────────────────────
//   실물 DEP.TALLY 워크북을 배별 템플릿(실물 파일 서식 그대로)에 숫자만 채워 생성.
function TallyExportSection({ voyages, chief, pfMap, archiveList, onArchiveChanged, boxRoot, onPickBox, resolveBox }) {
  const [busyKey, setBusyKey] = useState('');
  const [msg, setMsg] = useState('');

  // 목록 = ① 보관소(수석 완료 저장됨) — 생성 가능  + ② 진행 중인 항차 — 잠김
  //   정렬 기준은 **작업 시각**이다. 등록 시각(createdAt)으로 세우면 오늘 막 예정 등록된
  //   미래 항차가 실제 작업한 항차보다 위로 올라온다(2026-08-04 TNJP 26356/26355 사고).
  const rows = React.useMemo(() => {
    const now = Date.now();
    const out = [];
    const archKeys = new Set();
    for (const a of (archiveList || [])) {
      if (!a || (a.archivedAt || 0) < TALLY_LIST_SINCE) continue;
      archKeys.add(a.voyageKey);
      out.push({ key: a.voyageKey, vsl: a.vsl, voy: [a.voy_d, a.voy_l].filter(Boolean).join(' & '),
                 state: 'ready', at: a.archivedAt || 0, madeAt: a.tallyMadeAt || 0 });
    }
    for (const [key, v] of Object.entries(voyages || {})) {
      if (archKeys.has(key)) continue;           // 복원된 항차가 양쪽에 있으면 보관소 쪽을 쓴다
      const st = tallyTargetState(v, pfMap, now);
      if (!st) continue;                          // 입항 전 — 목록에 올리지 않는다
      const i = v.info || {};
      out.push({ key, vsl: i.vsl || key.split('_')[0] || '', voy: [i.voy_d, i.voy_l].filter(Boolean).join(' & '),
                 state: st, at: scheduleOf(i, pfMap).etaMs || 0, madeAt: 0 });
    }
    const rank = { ready: 0, done: 1, working: 2 };
    return out.sort((a, b) => (rank[a.state] - rank[b.state]) || (b.at - a.at));
  }, [voyages, pfMap, archiveList]);

  const pickBox = async () => {
    try { await onPickBox(); setMsg('📁 TALLYBOX 폴더 연결됨 — 이제 만든 서류가 바로 그 안에 저장됩니다.'); }
    catch (e) { if (e?.name !== 'AbortError') setMsg(`폴더 지정 실패: ${e?.message || e}`); }
  };

  // TallyOne 1.8-15: 카톡 기록 보강 대상 항차. 완료 저장된 항차라 **보관소**에 넣어야
  //   마감 텔리를 다시 만들 때 반영된다.
  const [kakaoKey, setKakaoKey] = useState(null);
  const [kakaoVoyage, setKakaoVoyage] = useState(null);
  React.useEffect(() => {
    if (!kakaoKey) { setKakaoVoyage(null); return; }
    let alive = true;
    import('../firebase.js').then(({ fbGetArchiveVoyage }) => fbGetArchiveVoyage(kakaoKey))
      .then((v) => { if (alive) setKakaoVoyage(v || {}); })
      .catch((e) => { console.warn('[카톡 보강] 항차 조회 실패', e); if (alive) setKakaoVoyage({}); });
    return () => { alive = false; };
  }, [kakaoKey]);

  const gen = async (row) => {
    if (!chief) { alert('🔒 마감 텔리는 수석검수사만 생성할 수 있습니다.'); return; }
    if (row.state !== 'ready') return;            // 잠김 — 완료 저장 전에는 만들지 않는다
    setBusyKey(row.key); setMsg('');
    try {
      const { fbGetArchiveVoyage, fbMarkTallyMade } = await import('../firebase.js');
      const v = await fbGetArchiveVoyage(row.key);
      if (!v) throw new Error('보관소에서 항차를 찾지 못했습니다');
      const D = computeTallyData(v);
      const { generateTallyExcel } = await import('../tallyExcel.js');
      const root = await resolveBox();   // 권한이 식어 있으면 이 클릭 안에서 조용히 되살린다
      const r = await generateTallyExcel(D, { download: !root });
      let where = `${r.fname} 다운로드`;
      if (root) {
        const info = v.info || {};
        const folder = folderName(info.voy_d, info.voy_l);
        const name = fileNameFor('tally', info.vsl || row.vsl, info.voy_d, info.voy_l, '.xlsx');
        const p = await writeTallyboxFile(root, info.vsl || row.vsl, folder, name,
          new Blob([r.buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        where = `TALLYBOX\\${p}`;
      }
      // 2.08 (검수사 확정 «마감 텔리를 작성을 누르면 마감텔리와 EDI ASC VGM리스트 또한 부가 서류등을
      //   한번에 저장되게» + «거기다 부가 자료만 더 첨부 하는 작업입니다»): 텔리와 같은 폴더에
      //   실선적 EDI·ASC·VGM 리스트를 함께 만든다. 선적분 없는 항차(양하만)는 텔리만 — 셋은 선적 산출물.
      const extras = [];
      try {
        const got = collectActualLoading(v);
        if (got.rows.length) {
          const info2 = v.info || {};
          const _voy = (info2.voy_l || info2.voy_d || '').toUpperCase();
          const meta2 = { vsl: (info2.vsl || row.vsl || '').toUpperCase(), voy: _voy,
            carrier: info2.carrier || '',
            ediVer: detectEdiVer(v?.loading?.raw?.edi?.text || v?.discharge?.raw?.edi?.text || ''),
            ascHdr: info2.ascHdr || '' };
          const _put = async (kind, fallbackName, text, mime = 'text/plain') => {
            let name = fallbackName;
            try { name = fileNameFor(kind, meta2.vsl, info2.voy_d, info2.voy_l, null); } catch { /* 규칙 없으면 기본명 */ }
            if (root) {
              await writeTallyboxFile(root, meta2.vsl, folderName(info2.voy_d, info2.voy_l), name,
                new Blob([text], { type: mime }));
            } else {
              const url = URL.createObjectURL(new Blob([text], { type: mime }));
              const a = document.createElement('a'); a.href = url; a.download = name;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            extras.push(name);
          };
          await _put('edi', `${meta2.vsl}_${meta2.voy}_ACTUAL_BAPLIE.edi`, buildActualBaplie(got.rows, meta2));
          // ASC 선박코드 — 저장된 값 있으면 안 묻고 쓴다(일괄 흐름에서 프롬프트 최소화)
          let shipCode = '';
          try { shipCode = localStorage.getItem('ascShipCode_' + meta2.vsl) || ''; } catch { /* 무시 */ }
          if (!shipCode) {
            const input = window.prompt('ASC 선박코드(4자) — 기본은 검수앱 코드', meta2.vsl);
            shipCode = ((input == null ? '' : input.trim().toUpperCase()) || meta2.vsl).slice(0, 4);
            try { localStorage.setItem('ascShipCode_' + meta2.vsl, shipCode); } catch { /* 무시 */ }
          }
          await _put('asc', `${meta2.vsl}${meta2.voy}.ASC`, buildActualAsc(got.rows, { ...meta2, shipCode }));
          const { generateVgmListHTML } = await import('../inspectionList.js');
          await _put('vgm', `${meta2.vsl}_${meta2.voy}_VGM_LIST.html`,
            generateVgmListHTML(got.rows, { vsl: meta2.vsl, voy_l: _voy }), 'text/html');
        }
      } catch (e2) {
        setMsg(`⚠ 부속 서류 일부 실패: ${e2?.message || e2}`);
      }
      await fbMarkTallyMade(row.key);
      if (onArchiveChanged) onArchiveChanged();
      setMsg(`✅ ${where}${r.note ? ` · ${r.note}` : ''}${extras.length ? ` + 부속 ${extras.length}종(${extras.join(', ')})` : ' (선적분 없음 — 텔리만)'} — 발송 전 Final Work 총계 확인.`);
    } catch (e) {
      setMsg(`생성 실패(${row.vsl} ${row.voy}): ${e?.message || e}`);
    } finally {
      setBusyKey('');
    }
  };
  return (
    <section className="bg-ink-900 border border-emerald-800/60 rounded-btn p-4">
      <h2 className="font-bold text-emerald-200 text-sm mb-1">📑 마감 텔리 (DEP.TALLY REPORT) {!chief && <span className="text-2xs text-dim-400">— 🔒 수석 전용</span>}</h2>
      <div className="text-xxs text-dim-400 mb-2">실물 양식 그대로 엑셀 생성 · 선사/포트 순서 선박별 고정 · 발송 전 숫자 확인 필수</div>
      <div className="text-xxs text-amber-300/80 mb-2">🔒 「✓ 수석 완료 저장」을 누른 항차만 생성할 수 있습니다 — 작업 중인 항차는 잠겨 있습니다.</div>
      {/* ⚠ 모달은 이 섹션 트리 안에 둔다 — 1.8 에서 DataTab 안에 넣어 상태만 켜지고 안 뜬 적이 있다. */}
      {kakaoKey && kakaoVoyage && (
        <KakaoLogImportModal voyage={kakaoVoyage} voyageKey={kakaoKey} base={`archive/${kakaoKey}`}
          onClose={() => setKakaoKey(null)}
          onDone={() => { if (onArchiveChanged) onArchiveChanged(); }}/>
      )}
      {/* TallyOne 1.7: 폴더 직결 — 처음 한 번만 고르면 그 뒤로는 안 묻는다(IndexedDB 보관) */}
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        {boxRoot ? (
          <span className="text-xxs text-emerald-300">📁 TALLYBOX 연결됨 — 만든 서류가 <b>{'{선박}\\{항차}'}</b> 폴더에 바로 저장됩니다 (다운로드 거치지 않음)</span>
        ) : isTallyboxSupported() ? (
          <>
            <button onClick={pickBox} className="px-3 py-2 rounded-pill text-xs2 font-bold bg-sky-800 hover:bg-sky-700 text-sky-100" style={{ minHeight: 40 }}>
              📁 TALLYBOX 폴더 지정 (처음 한 번만)
            </button>
            <span className="text-xxs text-dim-400">지정하면 저장창 없이 바로 들어갑니다. 안 하면 종전대로 다운로드됩니다.</span>
          </>
        ) : (
          <span className="text-xxs text-dim-400">이 브라우저는 폴더 직결을 지원하지 않아 다운로드로 저장됩니다 (크롬·엣지 데스크톱에서 지원).</span>
        )}
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const ready = r.state === 'ready';
          return (
            <div key={r.key} className={`flex items-center gap-2 rounded-pill px-3 py-2 border ${
              ready ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-ink-800/40 border-line'}`}>
              <div className="flex-1 min-w-0">
                <span className={`text-sm2 font-bold ${ready ? 'text-emerald-100' : 'text-dim-400'}`}>{r.vsl}</span>
                <span className={`text-xxs ml-2 ${ready ? 'text-emerald-300/70' : 'text-dim-500'}`}>{r.voy}</span>
                <div className="text-2xs mt-0.5">
                  {ready
                    ? (r.madeAt
                        ? <span className="text-emerald-400">✓ 생성함 · {new Date(r.madeAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} — 다시 뽑을 수 있습니다</span>
                        : <span className="text-emerald-300 font-bold">● 완료 저장됨 — 지금 만드세요</span>)
                    : r.state === 'done'
                      ? <span className="text-amber-400/80">검수 완료 · 수석 완료 저장을 누르면 열립니다</span>
                      : <span className="text-dim-500">작업 중</span>}
                </div>
              </div>
              {/* TallyOne 1.8-15: 카톡방 기록으로 타임시트를 메운다 — 손으로 친 해치 보고가 앱에 없을 때 */}
              {ready && (
                <button onClick={() => setKakaoKey(r.key)}
                  title="카톡 작업방 기록을 붙여넣어 빠진 해치·작업 기록을 채웁니다"
                  className="shrink-0 px-2.5 py-2 rounded-pill text-xs2 font-bold bg-amber-800/70 hover:bg-amber-700 text-amber-100"
                  style={{ minHeight: 40 }}>📋 카톡</button>
              )}
              <button onClick={() => gen(r)} disabled={!ready || busyKey === r.key}
                title={ready ? '마감 텔리 엑셀 생성' : '수석 완료 저장 전에는 생성할 수 없습니다'}
                className={`shrink-0 px-3 py-2 rounded-pill text-xs2 font-bold ${
                  ready && chief ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-ink-800 text-dim-500 cursor-not-allowed'}`}
                style={{ minHeight: 40 }}>
                {busyKey === r.key ? '생성 중…' : ready ? '엑셀 생성' : '🔒 잠김'}
              </button>
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-xs2 text-dim-500">작업 중이거나 완료 저장된 항차가 없습니다. (입항 전 항차는 표시하지 않습니다)</div>}
      </div>
      {msg && <div className="mt-2 text-xxs text-dim-200 whitespace-pre-wrap">{msg}</div>}
    </section>
  );
}

// 3.64-01: «🏗 오늘 장비별 작업 보고» 카드 — 부두마다 한 줄, 줄 안은 호기 칸(utils.equipReportBoard 가 센 것을 그리기만 한다).
//   검수사 2026-09-28 «작업 보고에서 위치별 갱이 서로 같은데 동시 작업시 중복되면 어떻게 표기 하나?» → A안 «부두별 줄» · «두 부두 줄 늘».
//   칸 모양·색·셈 종류는 종전(M3.5.6 · V9.57 I1~I3) 그대로. 5칸 격자라 PCTC·PNCT 의 같은 호기가 위아래로 맞는다.
//   export — 연막검사(tools/smoke_equippier)가 실데이터로 직접 그린다.
export function EquipReportBoard({ board, capped = false }) {
  return (
        <div className="bg-ink-900 border border-orange-700/40 rounded-btn p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-orange-400"/>
            <div className="text-sm font-bold text-orange-100">오늘 장비별 작업 보고</div>
            <span className="text-2xs text-dim-400">실시간</span>
            {/* V9.57(I3): 구독 한도(300건)에 걸리면 오늘 통계가 잘렸을 수 있음을 명시 */}
            {capped && (
              <span className="text-2xs text-amber-400 font-bold">최근 300건 기준 (더 오래된 보고는 미집계)</span>
            )}
          </div>
          <div className="space-y-3">
            {((board && board.rows) || []).map(row => (
              <div key={row.pier} data-pier={row.pier}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-orange-300">{row.pier}</span>
                  <span className="text-2xs text-dim-400">{row.total > 0 ? `${row.total}건` : '보고 없음'}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {/* V9.57(I1): 부두 장비 목록 ∪ 실제 보고에 등장한 장비 · '미지정'(장비 없는 보고)은 줄 끝(I2) */}
                  {row.cells.map(({ eq, s }) => {
                    if (!s) return (
                      <div key={eq} className="bg-ink-800/40 border border-line/40 rounded p-2 opacity-50">
                        <div className="text-sm font-bold text-dim-300">🏗 {eq}</div>
                        <div className="text-2xs text-dim-400">작업 없음</div>
                      </div>
                    );
                    return (
                      <div key={eq} className="bg-orange-900/20 border border-orange-700/40 rounded p-2">
                        <div className="text-sm font-bold text-orange-200">🏗 {eq}</div>
                        <div className="text-lg font-black text-orange-100">{s.total}건</div>
                        <div className="text-2xs text-dim-300 space-y-0.5 mt-1">
                          {s.status > 0 && <div>📤 작업상태 {s.status}</div>}
                          {s.hatch > 0 && <div>🔓 해치 {s.hatch}</div>}
                          {s.conbox > 0 && <div>📦 콘박스 {s.conbox}</div>}
                          {s.damage > 0 && <div className="text-amber-300">⚠️ 데미지 {s.damage}</div>}
                          {s.sealError > 0 && <div className="text-red-300">🚨 실오류 {s.sealError}</div>}
                          {/* V9.57(I2): 작업중단(외부요인) — 사고성 보고라 가장 눈에 띄게 */}
                          {s.externalPause > 0 && <div className="text-red-300 font-black">⛔ 작업중단 {s.externalPause}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
  );
}

// ── V9.19-02: 접이식 항목 래퍼 — 대시보드 항목을 버튼으로 열고 닫는다 ─────────
//   상단 바로가기(jumpSec)가 열림 상태를 켜고 스크롤한다. 헤더 44px 터치 타깃.
function Fold({ id, title, open, onToggle, children }) {   // 4.39: 위험 구역 접이(danger — 빨간 테두리)를 쓰던 마감적용을 없애 그 인자도 뺐다
  return (
    <div id={'sec-' + id} className="scroll-mt-16" data-fold={id}>
      <button onClick={onToggle} aria-expanded={!!open}
        className={`w-full flex items-center justify-between px-3 rounded-btn border text-left ${
          open ? 'bg-ink-800/80 border-line-strong' : 'bg-ink-900 border-line hover:border-line-strong'}`}
        style={{ minHeight: 44 }}>
        <span className={`text-sm2 font-bold truncate tx-lg:whitespace-normal tx-lg:break-keep tx-lg:leading-tight tx-lg:py-1 text-dim-100`}>{title}</span>{/* 4.23 2차 «크게»: «…» 로 자르지 않고 두 줄 */}
        <span className="text-dim-400 text-xs shrink-0 ml-2">{open ? '▲ 접기' : '▼ 열기'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// ── 4.24 수석 상황판 조각 ─────────────────────────────────────────────
//  막대 % 한 벌 — MiniBar(보드 행) · LiveShipCard 아래 합계 · 폰 카드가 같은 식으로 센다(100% 클램프 V9.57 I4).
export function pctOf(done, total) { return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0; }
//  그 항차의 가장 늦은 완료 시각(양하·선적) — 보드에 올리는 «30분 안에 완료» 판정과 폰 카드 «최근 완료 N분 전» 이 같이 쓴다.
export function lastCompletedAt(voyage) {
  let t = 0;
  for (const m of ['discharge', 'loading']) for (const r of Object.values(voyage?.[m]?.completed || {})) if (r && r.at > t) t = r.at;
  return t;
}
//  항차 표기 «양하 / 선적» — 보드 카드 머리·폰 카드·폰 시트 머리 한 벌(종전 LiveShipCard 안 식 그대로).
export function voyPairOf(info) {
  const d = info?.voy_d, l = info?.voy_l, vv = info?.voy;
  if (d && l && d !== l) return `${d} / ${l}`;
  return d || l || vv || '';
}
//  보드 통계 칸 «한 줄 요약» — 별첨 표와 같은 L(legendLiveOf) 에서: 선사별 · 화물 종류(일반 밖) · 규격별 계(20'·40'·45' — 별첨3 계 열과 같은 수).
export function compactLegendLine(L) {
  const parts = [];
  for (const [k, e] of L.carriers || []) parts.push(`${k} ${e.total.done}/${e.total.n}`);
  for (const [k, e] of L.cargos || []) if (k !== '일반') parts.push(`${k} ${e.total.done}/${e.total.n}`);
  for (const sz of ['20', '40', '45']) {
    const f = L.fe?.[sz]; if (!f) continue;
    const n = f.F.n + f.E.n; if (!n) continue;
    parts.push(`${sz}' ${f.F.done + f.E.done}/${n}`);
  }
  return parts.join(' · ');
}
//  창을 여는 문 / 화면을 옮기는 문 — 접힘(Fold) 머리와 같은 규격(높이 44 · 같은 글자). 종전 소유자 메뉴 «👥 인원 관리» 단추와 같은 모양.
function DoorBtn({ id, title, sub = '', onClick, label = '창 열기 ▶' }) {
  return (
    <button type="button" onClick={onClick} data-door={id}
      className="w-full flex items-center justify-between gap-2 px-3 py-1 rounded-btn border bg-ink-900 border-line hover:border-line-strong text-left"
      style={{ minHeight: 44 }}>
      <span className="min-w-0">
        <span className="block text-sm2 font-bold text-dim-100 tx-lg:leading-tight">{title}</span>
        {sub && <span className="block text-xs text-dim-400">{sub}</span>}
      </span>
      <span className="text-dim-400 text-xs shrink-0 ml-2">{label}</span>
    </button>
  );
}
//  관리 묶음 문 — 아이콘 · 이름(크게) · 안에 든 것 · 오른쪽 숫자/표시. 편집(주의)은 빨간 테두리.
function GroupDoor({ g, on, onClick, wide }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={!!on} data-chief-group={g.id}
      className={`lift3 w-full flex items-center gap-3 text-left rounded-btn border-2 px-3 py-2 ${g.danger
        ? `border-red-700/70 ${on ? 'bg-red-950/40' : 'bg-red-950/20'}`
        : on ? 'border-emerald-500/80 bg-ink-850' : 'border-ink-700 bg-ink-900'}`}
      style={{ minHeight: 'calc(var(--tap) + 12px)' }}>
      <span className="fold-ico" aria-hidden="true">{g.ico}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-base font-black ${g.danger ? 'text-red-200' : 'text-dim-100'}`}>{g.name}</span>
        <span className="block text-xs text-dim-400 leading-snug break-keep">{g.sub}</span>{/* 낱말 가운데서 안 끊기게(«베이매트릭\n스») */}
      </span>
      <span className="text-sm2 text-dim-400 whitespace-nowrap shrink-0">{g.badge}</span>
      <span className="text-dim-400 text-xs shrink-0" aria-hidden="true">{wide ? '▶' : on ? '▲' : '▼'}</span>
    </button>
  );
}
//  폰 카드의 막대 한 줄 — 양하 파랑 · 선적 호박(항차 화면 seg 와 같은 색 이름표). 숫자는 MiniBar 와 같은 stats.done/total.
function PhoneBar({ kind, stats }) {
  const lod = kind === 'loading';
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 mt-1.5">
      <span className={`${lod ? 'lbl-lod' : 'lbl-dis'} text-xs font-black px-2 leading-5`}>{lod ? '선적' : '양하'}</span>
      <div className="xp-bar xp-sm"><div className={`xp-fill ${lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${pctOf(stats.done, stats.total)}%` }} /></div>
      <span className="mono text-sm font-black text-dim-100 whitespace-nowrap">{stats.done}<span className="text-xs text-dim-400 font-bold">/{stats.total}</span></span>
    </div>
  );
}
//  폰 상황판 카드 — 배 한 척. 누르면 그 배만 전체화면 시트(onOpen). 같은 재료(voyageStats 행 · activeByVoyage · lastCompletedAt).
function PhoneShipCard({ v, workers = [], departed = false, lastAt = 0, onOpen }) {
  const ago = (t) => { if (!t) return ''; const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 ${m % 60}분 전`; };
  const berth = String(v.info?.berth || '').trim();
  return (
    <button type="button" onClick={onOpen} data-phone-ship={v.key}
      className={`ship-card lift3 w-full text-left rounded-btn border-2 border-ink-700 bg-ink-900 px-3 py-2 ${departed ? 'opacity-60' : ''}`}>
      <div className="flex items-baseline gap-2 min-w-0">
        {workers.length > 0 && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0 self-center" aria-hidden="true" />}
        <span className="text-xl font-black text-dim-100 shrink-0">{v.info.vsl}</span>
        <span className="text-xs text-dim-300 truncate min-w-0">{voyPairOf(v.info)}{berth ? ` · ${berth}` : ''}</span>
        {departed && <span className="text-2xs bg-ink-750 text-dim-200 px-1.5 py-0.5 rounded font-bold shrink-0">⚓ 출항</span>}
        <span className="ml-auto text-dim-400 shrink-0" aria-hidden="true">▸</span>
      </div>
      {v.dis.total > 0 && <PhoneBar kind="discharge" stats={v.dis} />}
      {v.loa.total > 0 && <PhoneBar kind="loading" stats={v.loa} />}
      {v.dis.total === 0 && v.loa.total === 0 && <div className="text-xs text-dim-400 mt-1.5">평택분 자료 대기</div>}
      {v.shift && v.shift.n > 0 && <div className="text-xs text-sky-300 font-bold mt-1">◆ 시프팅 {v.shift.n} — 내림 {v.shift.out}/{v.shift.n} · 실음 {v.shift.in}/{v.shift.n}{v.shift.fc > 0 && <span className="text-yellow-300"> · ◆ 예보 {v.shift.fc}</span>}</div>}
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-xs">
        {workers.length > 0 ? workers.map((w) => (
          <span key={w.name} className="inline-flex items-center gap-1 bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 font-bold px-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" aria-hidden="true" />{w.name}
          </span>
        )) : <span className="text-dim-400">작업 중 검수원 없음</span>}
        <span className="ml-auto text-dim-400 whitespace-nowrap">{lastAt ? `최근 완료 ${ago(lastAt)}` : '완료 기록 없음'}</span>
      </div>
    </button>
  );
}

// ── TallyOne 1.3: 활동 로그 뷰어 — 소유자 전용 ─────────────────────────────
//   "검수원들이 로그인만 하고 뭘 보는지"를 시간순으로 보여준다(사용자 확정 2026-08-03).
//   완료 건수는 archive까지 합산하면 무거워 현재 voyages의 completed만 센다(캡션에 명시).

// 타임라인 한 줄 문구 — 순수 함수(노드 시뮬 검증 겸 단일 소스)
const _ACT_ROUTE_KO = { home: '홈', chief: '수석 대시보드', search: '통합 검색', health: '항차 건강', food: '맛집', aux: '보조기능' };
const _ACT_TAB_KO = { list: '검수', search: '작업 시작', bay: '베이', lolo: 'LOLO', stats: '통계', report: '결과', data: '자료' };   // 2.03-01: 자연어 → 실제 탭 이름
export function formatActivityLine(r, voyages) {
  if (!r) return '?';
  if (r.type === 'login') return '로그인';
  if (r.type === 'logout') return r.via === 'idle' ? '자동 로그아웃' : '로그아웃';
  if (r.type === 'view') {
    if (r.route === 'voyage') {
      const info = voyages?.[r.voyageKey]?.info;
      const vsl = info?.vsl || String(r.voyageKey || '').split('_')[0] || '';
      const voy = (r.mode === 'loading' ? info?.voy_l : info?.voy_d) || info?.voy || '';
      const modeKo = r.mode === 'loading' ? '선적' : r.mode === 'discharge' ? '양하' : '';
      const head = [vsl, voy, modeKo].filter(Boolean).join(' ');
      const tabKo = _ACT_TAB_KO[r.tab] ? `${_ACT_TAB_KO[r.tab]}탭 ` : '';
      return `${head || '항차'} · ${tabKo}열람`;
    }
    return `${_ACT_ROUTE_KO[r.route] || r.route || '?'} 열람`;
  }
  if (r.type === 'lookup') return `조회 '${r.q || ''}'`;
  if (r.type === 'nls') return `질문 '${r.q || ''}'`;
  return r.type || '?';
}

const _actHHMM = (at) => {
  const d = new Date(at || 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const _actMD = (at) => {
  const d = new Date(at || 0);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
// 타입별 색 — 열람은 무채색, 조회·질문은 눈에 띄게(뭘 찾으러 왔는지가 핵심 데이터)
const _ACT_COLOR = { login: 'text-emerald-300', logout: 'text-amber-300/80', view: 'text-dim-200', lookup: 'text-cyan-300', nls: 'text-purple-300' };

function ActivityLogSection({ voyages }) {
  const [period, setPeriod] = useState('today');   // today | yesterday | 7d
  const [who, setWho] = useState('');              // '' = 전체
  const [rows, setRows] = useState(null);          // null = 로딩 전·중
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(300);

  // 섹션을 펼칠 때(마운트) 1회 — 30일 지난 버킷 정리. 실패 무해(fb 함수가 warn 1줄).
  useEffect(() => { fbCleanupActivityLog(30); }, []);

  // 기간 변경 시 조회 — 오늘 1일 / 어제 2일 / 7일 버킷 병합
  useEffect(() => {
    let alive = true;
    setRows(null); setError(''); setLimit(300);
    const days = period === 'today' ? 1 : period === 'yesterday' ? 2 : 7;
    fbGetActivityDays(days)
      .then(list => { if (alive) setRows(list); })
      .catch(e => { if (alive) { setRows([]); setError(String((e && e.message) || e)); } });
    return () => { alive = false; };
  }, [period]);

  // 기간 경계(로컬 자정 기준) — 버킷은 일 단위지만 '어제'는 어제 하루만 잘라 보여준다
  const range = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const t0 = d0.getTime();
    if (period === 'today') return { from: t0, to: Infinity };
    if (period === 'yesterday') return { from: t0 - 86400000, to: t0 };
    return { from: t0 - 6 * 86400000, to: Infinity };
  }, [period]);

  const periodRows = useMemo(
    () => (rows || []).filter(r => (r.at || 0) >= range.from && (r.at || 0) < range.to),
    [rows, range]);
  const names = useMemo(() => [...new Set(periodRows.map(r => r.who).filter(Boolean))], [periodRows]);
  const view = useMemo(() => (who ? periodRows.filter(r => r.who === who) : periodRows), [periodRows, who]);

  // 검수원별 요약 — 로그인·열람·조회(lookup+nls)·완료(현재 voyages의 completed by 합산)
  const summary = useMemo(() => {
    const m = {};
    const ensure = (n) => (m[n] = m[n] || { login: 0, view: 0, lookup: 0, done: 0 });
    periodRows.forEach(r => {
      const s = ensure(r.who || '?');
      if (r.type === 'login') s.login++;
      else if (r.type === 'view') s.view++;
      else if (r.type === 'lookup' || r.type === 'nls') s.lookup++;
    });
    Object.values(voyages || {}).forEach(v => {
      ['discharge', 'loading'].forEach(md => {
        Object.values((v && v[md] && v[md].completed) || {}).forEach(c => {
          const _w = completedByLabel(c, (v && v.info) || null);   // 3.16: 터미널 반영분은 조 등록 근무자로
          if (_w && (c.at || 0) >= range.from && (c.at || 0) < range.to) ensure(_w).done++;
        });
      });
    });
    return Object.entries(m).sort((a, b) => (b[1].view + b[1].lookup) - (a[1].view + a[1].lookup));
  }, [periodRows, voyages, range]);

  const shown = view.slice(0, limit);
  return (
    <div className="bg-ink-900 border border-fuchsia-800/40 rounded-btn p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-sm font-bold text-dim-100">🕵️ 활동 로그</div>
        <span className="text-2xs text-fuchsia-300/70">소유자 전용 — 열람 자체를 기록</span>
      </div>
      <div className="text-2xs text-dim-400 mb-2">
        완료 건수는 현재 항차 기준(voyages의 completed만 합산 — 보관소로 넘어간 실적 제외)
      </div>

      {/* 기간 선택 + 검수원 필터 칩 */}
      <div className="flex gap-1 mb-2">
        {[['today', '오늘'], ['yesterday', '어제'], ['7d', '7일']].map(([k, t]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`px-2.5 py-1 rounded text-xxs font-bold ${
              period === k ? 'bg-fuchsia-700 text-fuchsia-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap mb-2">
        <button onClick={() => setWho('')}
          className={`px-2 py-0.5 rounded text-xxs font-bold ${
            who === '' ? 'bg-amber-700 text-amber-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
          전체
        </button>
        {names.map(n => (
          <button key={n} onClick={() => setWho(n)}
            className={`px-2 py-0.5 rounded text-xxs font-bold ${
              who === n ? 'bg-amber-700 text-amber-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
            {n}
          </button>
        ))}
      </div>

      {/* 검수원별 요약 줄 */}
      {summary.length > 0 && (
        <div className="space-y-1 mb-2">
          {summary.map(([n, s]) => (
            <div key={n} className="text-xxs text-dim-200 bg-ink-950/60 border border-line rounded px-2 py-1">
              <b className="text-dim-100">{n}</b>
              <span className="text-dim-400"> — </span>
              로그인 {s.login}회 · 열람 {s.view}건 · 조회 {s.lookup}건 · <span className={s.done > 0 ? 'text-emerald-300' : 'text-dim-400'}>완료 {s.done}건</span>
            </div>
          ))}
        </div>
      )}

      {/* 타임라인 — 최신순, 300건 + 더보기 */}
      {rows === null ? (
        <div className="text-xs text-dim-400 text-center py-4">불러오는 중…</div>
      ) : error ? (
        <div className="text-xs text-red-300 text-center py-3">활동 로그 조회 실패 — {error}</div>
      ) : shown.length === 0 ? (
        <div className="text-xs text-dim-400 text-center py-4">이 기간의 활동 기록이 없습니다</div>
      ) : (
        <div className="bg-ink-950 rounded border border-line divide-y divide-line/60 max-h-[50vh] overflow-y-auto">
          {shown.map((r, i) => {
            const prev = shown[i - 1];
            const dayBreak = !prev || _actMD(prev.at) !== _actMD(r.at);
            return (
              <React.Fragment key={r.day + '_' + r.id}>
                {dayBreak && period !== 'today' && (
                  <div className="px-2 py-0.5 text-2xs font-bold text-dim-400 bg-ink-900/80">{_actMD(r.at)}</div>
                )}
                <div className="px-2 py-1 flex items-baseline gap-2 text-xxs">
                  <span className="mono text-dim-400 shrink-0">{_actHHMM(r.at)}</span>
                  <span className="font-bold text-dim-100 shrink-0">{r.who}</span>
                  <span className={`min-w-0 break-all ${_ACT_COLOR[r.type] || 'text-dim-200'}`}>{formatActivityLine(r, voyages)}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {view.length > limit && (
        <button onClick={() => setLimit(l => l + 300)}
          className="mt-2 w-full py-1.5 rounded bg-ink-800 hover:bg-ink-750 text-xxs font-bold text-dim-200">
          더보기 ({view.length - limit}건 남음)
        </button>
      )}
    </div>
  );
}


