import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, ArrowDown, ArrowUp, Trash2, Users, CheckCircle } from 'lucide-react';
import { fbSubscribeLaneInfo, fbSubscribeFeedback, fbCreateVoyage, fbDeleteVoyage, fbDeleteSection, fbSubscribePierCoords, fbUpdateVoyageInfo, fbArchiveVoyageBeforeDelete , fbRequestProcessNow, fbSubscribeProcessDone, fbSaveSectionData} from '../firebase.js';   // 1.42: 예보가 선적칸을 만든다
import ShipPolicyModal from '../components/ShipPolicyModal.jsx';   // 1.83: 실 정책 수정 모드
import { fbSubscribeShipPolicies, policyComboLabel, DEFAULT_SHIP_POLICIES, matchShipPolicy } from '../shipPolicies.js';   // 1.83: 선박 실 정책 판 · 4.25: 상세에 그 배 정책 한 줄(matchShipPolicy)
import { db as _fbdb } from '../firebase.js';
import { matchPortMis } from '../portMisMatch.js';   // 2.78: PORT-MIS 호출 한 벌(베이매트릭스 신원)
import { resolvedPod, podConflictOf } from '../utils.js';   // 3.53: POD 확정 반영 · 자료 갈림 판정 한 벌
import { setPodFocus } from '../podFocus.js';   // 3.53: 홈 카드 알림 → 그 컨 상세로
import DictMissingChip from '../components/DictMissingChip.jsx';   // 4.19: 베이사전에 없는 배 «사전에 없음»(§7.8-⑬)
import { detectPierByGps, getPierFromBerth, formatBerth, isValidBerth, isPyeongtaekPort, ownDirCns, computeShiftingMapCached, shiftEvidenceOf, parsePortMisDateTime, parseCargoForecast, isVirtualCn, isLuggageCn, shipLuggageCount, pilotToWorkMin, laneRouteOf, dayDiff, dayLabel, nextPortAfterPtk, normPortCode, isWorkingNow, sideCancelled, shiftCnSetOf, keepInShiftOf, progressOf, bookingFillOfSec, isShiftOffPtk, isListOriginRecord, planIsPast, planIsLive, planEndCompare} from '../utils.js';   // 1.77-02: 도선→작업시작 환산 · 2.24: 평택 다음 항
import { frBundlesOf, bundleExplainOf } from '../tallyReport.js';   // 4.54: 터미널은 빈 FR 묶음을 1대로 센다 — «배정 276(+6)» 설명(마감텔리와 같은 묶음 판정 한 벌)
import { termAggOf } from '../termBoard.js';   // 4.05: 항차 카드에 터미널 본선 집계(완료·잔여)를 참고 숫자로 — 숫자는 termBoardOf 한 벌
import { paceFromRecords, voyageDoneAts, voyageFirstTermAt } from '../nlSearch.js';
import { isViewOnlyNow } from '../workChoice.js';   // 3.55-01: 조회만이면 쓰는 버튼을 아예 안 그린다   // 3.6-01: 페이스 한 벌 — 분모는 배가 일한 시간
import { healthSummary, heartbeatState } from '../health.js';  // V8.40: 항차 건강 요약
// V9.57: PortMisCaptureModal 임포트 제거 — V9.42에서 홈 상단 카드가 ChiefDashboard로 이동한 뒤
//   여는 버튼 없이 마운트만 남은 고아 코드였다(showPortMisCapture를 켜는 곳이 없음).
import { decideBadge, DEPART_REMAIN_MAX, inWindow } from '../badgeRule.js';   // V9.57: ±12h 창 가드 단일화(inWindow)
import RefreshDataButton from '../components/RefreshDataButton.jsx';   // TallyOne 1.5: 화면 데이터만 새로고침
import { canOpenChief, isVisibleStaff } from '../staffList.js';   // 1.41: 수석 대시보드 버튼 노출 판정 단일화
import { isOwnerName } from '../adminGuard.js';   // TallyOne 1.19: 오답 미회신 줄은 소유자에게만   // V9.44: 수석 대시보드 버튼은 수석에게만  // V9.38: 배지 판정 단일 규칙(콘앱과 공용)
import ScrollTopButton from '../components/ScrollTopButton.jsx';   // 2.82-02: 스크롤 긴 화면 TOP 버튼(공용 한 벌)
import { setHomeSheetClose } from '../backHandler.js';   // 4.25 2차: 폰 시트가 열려 있으면 뒤로가기(App 홈 가드)가 시트만 닫는다

// 항차의 마지막 작업 활동 시각(ms). 활동 증거가 하나도 없으면 0 반환 → 자동삭제 대상 제외.
//   V8.01: 자동삭제 기준을 createdAt → 작업 활동 시각으로 바꾸기 위한 공용 헬퍼.
//   HomePage(삭제 판정)와 VoyageCard("곧 자동삭제" 표시) 양쪽에서 동일 기준으로 쓴다.

// V9.36: 작업 마무리 판정 기준(터미널 합계 진행률 %). 이 값 이상이면 카드가 '출항시간'으로 바뀐다.
//   기준을 바꿔야 하면 이 한 줄만 고친다 (사용자 확정 2026-08-01: 터미널 진행률 기준).
// V9.38: 출항 전환 기준은 badgeRule.js 로 이관 — 퍼센트가 아니라 **남은 개수**(사용자 확답 2026-08-02).
//   "600개의 10%는 60개, 2갱이면 한 시간 이상 / 100개의 10%면 10개, 2갱이면 5분이면 끝남."
//   같은 10%가 한 시간도 5분도 되므로 준비 시간 확보에 쓸 수 없다. → DEPART_REMAIN_MAX(=20)
// ── 2.09: 날짜 라벨 한 벌 (검수사 확정 2026-08-23 «작업중인 선박과 당일 명일 최대 3일치») ──
//   종전엔 같은 식이 VoyageCard 안에 두 벌 복제돼 있었다. 접기 판정까지 쓰면 세 벌이 된다 — 여기로 올린다.
//   2.10: dayDiff/dayLabel 은 utils 로 승격(LoginPage 공용). 여기선 import 해 쓴다.
const _two = (n) => String(n).padStart(2, '0');
/** 홈 목록에서 **펼쳐 두는** 항차인가 — 검수사 확정: 작업중 ∨ 당일 ∨ 명일.
 *  작업중인 배가 어제 시작했으면 어제·오늘·내일 3일치가 펼쳐진다(«최대 3일치»의 뜻). */
function isOpenVoyage(v) {
  //  2.40-02: 종전엔 터미널 상태만 보고 **시각을 안 봤다** — 시작 전 배가 종일 «작업중»으로 펼쳐졌다.
  if (isWorkingNow(v)) return true;
  const n = dayDiff(v?._etaMs ?? v?._etdMs ?? null);
  //  ★ 2.82-01 (검수사가 이유를 밝혀 줌 2026-08-29) —
  //    *«이렇게 바꾼이유는 **내일 아님 모레 작업이 있는 선박**인데 그밖의 선박을 눌러야만 보여서였습니다»*
  //    2.82 는 «기본 6개»로만 막았는데, 실측에서 **모레(D+2) 5척 중 2척(TNJP·XTPG)이 6개에 잘려**
  //    여전히 접혔다. 같은 날 작업인데 셋만 보이고 둘은 눌러야 보이는 꼴이었다.
  //    ⇒ 숫자가 아니라 **날짜로 연다** — 당일·명일·**모레**까지. 6개 하한은 그 아래 보험으로 남긴다.
  return n === 0 || n === 1 || n === 2;
}

function lastWorkAt(v) {
  let last = 0;
  const scanAt = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const rec of Object.values(obj)) {
      const t = rec && typeof rec === 'object' ? rec.at : null;
      if (typeof t === 'number' && t > last) last = t;
    }
  };
  scanAt(v?.discharge?.completed);   // 양하 완료 기록 = 실제 검수 활동 증거
  scanAt(v?.loading?.completed);     // 선적 완료 기록
  const scanActual = (recs) => {     // 선적 실체 위치 입력도 활동으로 인정
    if (!recs || typeof recs !== 'object') return;
    for (const r of Object.values(recs)) {
      const t = r && typeof r === 'object' ? r.actual_at : null;
      if (typeof t === 'number' && t > last) last = t;
    }
  };
  scanActual(v?.loading?.records);
  const la = v?.info?.lastActive;    // 검수원 활동 핑
  if (typeof la === 'number' && la > last) last = la;
  //  ★ 3.60-14: 보관소에서 복원한 시각도 센다(firebase fbRestoreVoyageFromArchive 가 남긴다).
  //    종전엔 복원한 옛 항차가 홈이 열리는 순간 «마지막 작업 7일 경과»로 다시 보관·삭제됐다
  //    (검수사 «복원 시켰는데 자동으로 사라지는 버그» — 5~6번 복원). 복원 뒤 7일은 자동 정리가 건드리지 않는다.
  const rs = v?.info?.restoredAt;
  if (typeof rs === 'number' && rs > last) last = rs;
  return last;
}

// V9.57: 항차 핵심번호 비교 — 방향 접미사(E/W/N/S)·앞0·구분자 무시. utils voyCore 승격(팀F) 전까지 지역 헬퍼.
// ── TallyOne 1.42: 예보 그림 축소 → base64 ───────────────────────────────────
//   카톡에서 온 덱 그림·물량표 사진을 예보에 함께 담는다(검수사 확정 2026-08-10).
//   ⚠ RTDB 에 base64 로 들어가므로 **반드시 줄인다.** 원본 그대로 넣으면 10~20MB 쓰기가 되어
//     연결이 끊긴다(2026-08-05 STMJ 사진 보고에서 실제로 겪은 일 — 같은 축소기를 쓴다).
//   실패하면 조용히 넘기지 않고 null 을 돌려 호출부가 알리게 한다(3금지③).
async function shrinkToBase64(file) {
  try {
    const { compressForReport } = await import('../mixerUpload.js');
    const small = await compressForReport(file, 1400);
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = () => rej(new Error('read fail'));
      r.readAsDataURL(small || file);
    });
  } catch (e) {
    console.error('[예보 그림] 축소·변환 실패', e);
    return null;
  }
}

const _voyCore = (x) => {
  const n = String(x || '').toUpperCase().replace(/[\s\-_.]/g, '');
  return n.replace(/[EWNS]+$/, '').replace(/^0+/, '') || n;
};

// V9.57: 죽은 prop onOpenGlobalSearch 제거 — 이 컴포넌트 안에서 쓰는 곳이 없었다(App쪽 전달부 정리는 판2).
// TallyOne 1.0 (K5): 맛집(onOpenFood)·건강점검(onOpenHealth) 개별 진입 → 보조기능(onOpenAux, #/aux) 하나로 교체
export default function HomePage({ voyages, inspectors, inspector, portMisData = {}, pilotForecast = {}, onOpenVoyage, onOpenChiefDashboard, heartbeat = null, onOpenAux, onRefreshData, refreshing = false, refreshedAt = 0 }) {   // 1.69-01: 홈 검색 진입 복원
  const [showCreate, setShowCreate] = useState(null); // 'discharge' | 'loading'
  const [vsl, setVsl] = useState('');
  const [voy, setVoy] = useState('');
  // V9.57: showPortMisCapture 상태 제거 — 켜는 버튼이 V9.42에 삭제돼 항상 false였던 고아 상태
  // V9.02: 카톡 물량 예보 붙여넣기
  const [showForecast, setShowForecast] = useState(false);
  const [fcText, setFcText] = useState('');
  const [fcImage, setFcImage] = useState('');   // 1.42: 카톡 그림(덱 그림 등) base64
  // M5.82: GPS 기반 현 부두 자동 판별
  const [currentPier, setCurrentPier] = useState(null);    // { code, distance, name }
  const [gpsState, setGpsState] = useState('idle');         // 'idle' | 'loading' | 'denied' | 'ok' | 'far'
  const [topMenu, setTopMenu] = useState('');               // 3.55: 진행 줄의 펼침 메뉴 — '' | 'pier' | 'new'
  const [pierFilter, setPierFilter] = useState('auto');     // 'auto' | 'PCTC' | 'PNCT' | 'all'
  // M6.17: 현재 GPS 좌표 (부두 좌표 등록용)
  // V8.35: 수집기 통보(신호) 기능 제거 — 자동 항차 등록이 대체(사용자 확정 2026-07-03).

  // 1주일(7일) 이상 지난 항차 자동 삭제. voyages 로드 후 1회 실행.
  //   V8.01: 기준을 createdAt → "마지막 작업 활동" 시각으로 변경 (사용자 확정 2026-06-16).
  //   배경: EDI를 작업 일주일 전에 미리 넣는 운영에서, createdAt 기준이면 작업 시작도 안 한
  //         항차가 7일 경과로 사라진다. 자동삭제는 실제 작업이 있었던 항차에만 적용해야 한다.
  //   안전장치 ①: 작업 활동(완료/실체위치 등)이 전혀 없는 항차는 절대 삭제하지 않음.
  //   안전장치 ②: createdAt 없는 옛 항차는 건드리지 않음(기존 보호 유지).
  const [autoCleanDone, setAutoCleanDone] = useState(false);
  useEffect(() => {
    if (autoCleanDone) return;
    //  3.60-18 (M16): 조회만 기기는 정본을 지우지 않는다(3.51 «조회만은 보기만») — 종전엔 모든 기기(조회만 폰 포함)가 이 정리를 돌려
    //    복원한 항차가 다른 폰에서 다시 지워지는 일(3.60-14 «복원 시켰는데 자동으로 사라지는 버그»)의 한 원인이었다. 조회만이면 1회 표식만 남기고 끝.
    if (isViewOnlyNow()) { setAutoCleanDone(true); return; }
    const entries = Object.entries(voyages || {});
    if (entries.length === 0) return;              // 아직 로드 전
    const WEEK = 7 * 86400000;
    const now = Date.now();
    const expired = entries.filter(([k, v]) => {
      const created = v?.info?.createdAt;
      if (typeof created !== 'number') return false;   // 안전장치 ②: createdAt 없는 옛 항차 보호
      const worked = lastWorkAt(v);
      if (worked === 0) return false;                  // 안전장치 ①: 작업 미시작 항차 절대 보호
      return (now - worked) > WEEK;                     // 마지막 작업 활동 기준 7일
    });
    setAutoCleanDone(true);                          // 1회만
    if (expired.length === 0) return;
    (async () => {
      for (const [key, v] of expired) {
        try {
          // 1주일 경과 = 작업 끝난 것으로 보고 archive 백업 → 성공 시에만 카드 삭제.
          //   M7.18b: 백업 실패 시 삭제 보류 — 다음 기회에 재시도(데이터 유실 방지).
          const ok = await fbArchiveVoyageBeforeDelete(v?.info?.imo, key, v);
          if (!ok) {
            console.warn(`[자동삭제] 백업 실패로 삭제 보류: ${key} (${v?.info?.vsl || ''})`);
            continue;
          }
          await fbDeleteVoyage(key, { archived: true });   // 3.60-19: 바로 위에서 보관소에 넣었다 — 휴지통 복사는 건너뜀
          console.log(`[자동삭제] 1주일 경과 항차 백업+삭제: ${key} (${v?.info?.vsl || ''})`);
        } catch (e) { console.error('[자동삭제] 실패:', key, e); }
      }
    })();
  }, [voyages, autoCleanDone]);

  // M6.17: Firebase 공유 부두 좌표 구독 — 다른 검수원이 등록한 좌표 자동 수신
  useEffect(() => {
    const unsub = fbSubscribePierCoords((coords) => {
      if (coords && Object.keys(coords).length > 0) {
        try {
          // Firebase 좌표를 localStorage에도 즉시 미러링 (detectPierByGps가 localStorage 봄)
          localStorage.setItem('master_pier_coords_v1', JSON.stringify(coords));
        } catch {}
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);


  // M6.17: GPS 측정 함수 분리 (재측정 가능)
  const measureGps = (force = false) => {
    if (!navigator.geolocation) {
      setGpsState('denied');
      return;
    }
    if (!force) {
      try {
        const cached = localStorage.getItem('gm_current_pier');
        if (cached) {
          const { pier, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setCurrentPier(pier);
            setGpsState(pier ? 'ok' : 'far');
            return;
          }
        }
      } catch (e) {}
    }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coord = { lat, lng };
        const pier = detectPierByGps(lat, lng);
        setCurrentPier(pier);
        setGpsState(pier ? 'ok' : 'far');
        try {
          localStorage.setItem('gm_current_pier', JSON.stringify({ pier, coord, timestamp: Date.now() }));
        } catch (e) {}
      },
      err => {
        console.warn('[HomePage] GPS 실패:', err.message);
        setGpsState('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: force ? 0 : 300000 }
    );
  };

  // M5.82: GPS로 현 부두 판별 (한 번만)
  useEffect(() => {
    measureGps(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // M5.82: 항차마다 부두 정보 매칭
  //   M5.82 hotfix: PORT-MIS를 voyage.info보다 우선 (더 최신 데이터)
  //                 선박이 부두를 옮기면 PORT-MIS 갱신만으로 즉시 반영
  // V8.40: 항차 건강 요약(이상 건수) + 수집기 하트비트 상태 — 30초마다 경과 재계산.
  const [hbNow, setHbNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setHbNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const healthIssueCount = useMemo(() => healthSummary(voyages).issueCount, [voyages]);
  const hbView = heartbeatState(heartbeat, hbNow);

  // ── 1.83 (검수사 확정 2026-08-19): 선박 실 정책 판 ──────────────────────────
  //   *"이미 지정한 선박은 선박메인 화면 한쪽에 보여주면 될듯합니다."*
  //   한번 정하면 거의 안 변하는 속성이라 조회가 목적 — 접이식, 탭하면 수정 모달(선박수정 모드).
  const [shipPols, setShipPols] = useState({});
  const [polOpen, setPolOpen] = useState(false);
  const [polEdit, setPolEdit] = useState(null);   // { vsl, policy } — 수정 모달 대상
  useEffect(() => {
    try { return fbSubscribeShipPolicies(_fbdb, setShipPols) || undefined; } catch (e) { return undefined; }
  }, []);

  // ── 2.09 (검수사 지시 2026-08-23): 각 선박 카드에 **항로 약자 + 항로 전체(기항 순서)** ──
  //   자료원은 수집기(MailPilot 2.0-05)가 올리는 `lane_info` — PCTC 「코드조회 › 서비스 Lane」 표.
  //   배정목록에는 항로 약자(info.lane)만 있고 기항 순서가 없다.
  //   ⛔ 시프팅 판정(portsBeforePtk)은 계속 lane_routes 를 쓴다 — 두 노드를 섞지 않는다.
  //   폴백은 lane_routes ∨ 내장 시드(laneRouteOf) — PNCT 전용 항로(KPX·PLS·PTLY·YTFF 등)는 터미널 표에 없다.
  const [laneInfo, setLaneInfo] = useState({});
  useEffect(() => {
    try { return fbSubscribeLaneInfo(setLaneInfo) || undefined; } catch (e) { return undefined; }
  }, []);
  const laneOf = useMemo(() => (lane) => {
    const k = String(lane || '').trim().toUpperCase();
    if (!k) return null;
    const e = laneInfo[k];
    if (e && Array.isArray(e.ports) && e.ports.length) {
      return { lane: k, name: e.name || '', ports: e.ports, src: e.src || '터미널 항로표' };
    }
    const r = laneRouteOf(k);
    if (r && Array.isArray(r.rotation) && r.rotation.length) {
      return { lane: k, name: '', ports: r.rotation, src: '앱 사전' };
    }
    return { lane: k, name: '', ports: [], src: '' };
  }, [laneInfo]);

  const voyagesWithPier = useMemo(() => {
    // ★ 1.77-02 — **선박 단위 값(도선 예보·PORT-MIS)을 아무 항차에나 붙이지 않는다.**
    //   검수사 지적 2026-08-17: *"089항차랑 088항차랑 같이 들어 오나요?"* — RZOR 한 배의 두 항차
    //   R088E·R089E 가 **둘 다 오늘 일정**으로 떴다. 오늘 도선은 한 번(09:30 입항 / 17:30 출항)뿐이고
    //   그건 배정표 현재 기항인 R088E 것이다.
    //   원인: `pilot_forecast[선박코드]` 는 **선박 단위**라 항차 구분이 없다. 수집기는 이미 이것을 알고
    //   배정과 대조해 «이 항차 것이 아니면 안 붙인다»(autoreg `_voy_scoped` H-11) — 그래서 R089E 에는
    //   planDate 가 없다. 그런데 **앱이 그 판정을 우회해** 선박 단위 값으로 직접 채웠다.
    //   → 같은 선박의 항차가 둘 이상이면, planDate 가 없는 쪽에는 선박 단위 값을 안 쓴다(일정 미상으로 둔다).
    const _voyCntByVsl = {};
    Object.values(voyages || {}).forEach((v) => {
      const s = String((v && v.info && v.info.vsl) || '').toUpperCase();
      if (s) _voyCntByVsl[s] = (_voyCntByVsl[s] || 0) + 1;
    });
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        const info = v.info || {};
        // PORT-MIS에서 매칭 시도 — 우선
        // 2.08-10 (검수사 «PORT-MIS 매칭 미확인 RZOR — 여러번 수정한거 같은데 어디를 수정?»):
        //   항차 화면(dictCallsign)은 베이사전 콜사인 폴백이 있는데 홈 카드는 info.callsign 만 봤다.
        //   RZOR 처럼 수집기가 콜사인을 못 싣는 배는 사전(ship_bay_dict_v3/{VSL}.callsign)이 정본.
        //  ★ 2.78 (검수사 «포트미스 호출 자료를 베이메트릭스 자료로 호출 바랍니다. 자꾸 틀리게
        //    호출하니 포트미스에 등록이 안되었다고 합니다» · «약자로 포트미스 조회하는 오류는
        //    없었으면 합니다. 선박 풀네임으로 조회하세요»):
        //    ⛔ 여기가 **4자 선박코드(info.vsl)를 선명과 앞 5자로 비교**하던 자리다 —
        //      SWTD 는 SAWASDEETHAILAND 와 영영 안 맞고 엉뚱한 배와 걸릴 수도 있었다.
        //    ⇒ 손매칭 4단계를 걷어내고 베이매트릭스 신원으로 찾는 공용 매처 한 벌을 부른다.
        const pm = matchPortMis(portMisData, info);
        // PORT-MIS 우선, 없으면 voyage.info 폴백
        // M6.18: 잘못된 berth 형식 (MBM 등) 필터링 — 표시 + 자동 정리
        const rawBerth = (pm && pm.berth) || info.berth || '';
        const berth = isValidBerth(rawBerth) ? rawBerth : '';
        const pier = (pm && pm.pier) || info.pier || getPierFromBerth(berth) || '';
        // V9.06-01: 예정작업일자(planDate — 수집기 예정 등록 "ETA ~ ETD") 폴백 (사용자 요청 2026-07-23)
        //   PORT-MIS 레코드가 없는 예정 항차가 '일정 미상'(④)으로 밀리던 것을 작업(예정)일자 순 정렬에 태움.
        //   PORT-MIS(신고·선석배정 기록)가 있으면 그대로 우선 — planDate는 없을 때만.
        const _pd = String(info.planDate || '');
        const _pdEta = _pd ? parsePortMisDateTime(_pd.split('~')[0].trim()) : null;
        const _pdEtd = _pd.includes('~') ? parsePortMisDateTime(_pd.split('~')[1].trim()) : null;
        // V9.34: 정렬 시각 선택 — '지나지 않은 일정'을 우선한다 (사용자 신고 2026-08-01, MCAP 629N).
        //   종전: PORT-MIS가 있으면 무조건 그것만 봤다(`pm ? pm.eta : null ?? planDate`).
        //   그래서 같은 콜사인의 '지난 기항' 레코드(MCAP V2EE9 = 6/28~6/29)가 남아 있으면,
        //   선석배정 planDate(08-02)와 도선 예보(08-02 04:30)가 미래를 가리켜도 '출항 지남'으로
        //   판정돼 홈 맨 아래로 밀렸다. 새 키(OBWH 2703E 등)는 PORT-MIS 매칭이 없어 정상이었고
        //   MCAP만 틀렸던 이유가 이것이다.
        //   규칙: 후보(도선예보 > 선석배정 > PORT-MIS) 중 ① 아직 안 끝난 것(etd 없음 또는 미래)을
        //   우선순위 높은 순으로 채택 ② 전부 지났으면 가장 최근 것. 세 출처가 다 없으면 종전대로 null.
        // V9.35: 작업일시의 진실은 **선석배정**이다 (사용자 확정 2026-08-01).
        //   "작업일시는 선석배정목록이 먼저 입니다. 도선만 해놓고 대기 하는 경우도 있으니까요."
        //   → 도선 예보는 도선사 배정일 뿐 작업 시작이 아니다. V9.34에서 도선을 1순위로 둔 것을 교정한다.
        //   출항 시각 표시(항차 상세의 ⚓ 도선 예보 줄)는 그대로 — 거기선 도선이 확정에 가깝다.
        // 1.77-02: 같은 선박 항차가 둘 이상인데 이 항차엔 planDate 가 없다 = 수집기가 «이 항차 것 아니다»로
        //   판정한 것이다. 그러면 선박 단위 값(도선·PORT-MIS)을 끌어오지 않는다.
        const _shipWide = !(_voyCntByVsl[(info.vsl || '').toUpperCase()] > 1 && _pdEta == null && _pdEtd == null);
        const _pfRec = _shipWide ? pilotForecast[(info.vsl || '').toUpperCase()] : null;
        const _pmRec = _shipWide ? pm : null;
        // 1.77-02: 도선 예보를 **직접** 쓸 때는 작업시작으로 환산한다(PNCT +120 · PCTC +90).
        //   ⚠ planDate 는 수집기가 이미 환산해 넣은 값이라 손대지 않는다(1.40-01 이중가산 사고).
        //     여기서 더하는 것은 planDate 가 없어 도선 원본을 그대로 쓰는 경우뿐이다.
        //     안 더하면 카드가 「09:30 ⚓도선」처럼 **도선 시각을 작업시작인 양** 보여준다
        //     (오답 1786057401908 «도선이 08시 30분인데 작업시간이 08시 30분 가능한가요?»의 뿌리).
        //   출항(nextDep)은 그대로 — 오프셋은 앞자리에만.
        const _pfArr = _pfRec ? parsePortMisDateTime(_pfRec.nextArr) : null;
        const _cands = [
          { p: 3, src: 'plan', eta: _pdEta, etd: _pdEtd },                        // ① 선석배정(작업일시의 기준)
          { p: 2, src: 'pilot', eta: _pfArr != null ? _pfArr + pilotToWorkMin(pier) * 60000 : null,
                  etd: _pfRec ? parsePortMisDateTime(_pfRec.nextDep) : null },     // ② 도선 예보(작업시작 환산)
          { p: 1, src: 'portmis', eta: _pmRec ? parsePortMisDateTime(_pmRec.eta) : null,
                  etd: _pmRec ? parsePortMisDateTime(_pmRec.etd) : null },         // ③ PORT-MIS 신고
        ].filter(c => c.eta != null || c.etd != null);
        const _now = Date.now();
        const _live = _cands.filter(c => (c.etd == null ? (c.eta == null || c.eta >= _now) : c.etd >= _now));
        const _pick = _live.length
          ? _live.sort((a, b) => b.p - a.p || (a.eta ?? a.etd) - (b.eta ?? b.etd))[0]
          : (_cands.sort((a, b) => (b.etd ?? b.eta ?? 0) - (a.etd ?? a.eta ?? 0))[0] || null);
        // TallyOne 1.12: **자료 완성율** — 홈 목록 1차 정렬키 (검수사 확정 2026-08-06).
        //   "자료가 완성된 걸 맨 위에 올리고 완성율을 기준으로. 금일 작업 선박이라도 자료가 없으면
        //    자료 있는 선박 밑에 놓고, 자료가 올라오면 작업순서 순으로 위로."
        //   "양하/선적 둘 다 완성된 게 우선. 단 양하만·선적만 있는 것은 그에 해당하는 것이 완성되면 그것도 우선."(ATPR류)
        //   완성 = **EDI와 리스트가 맞아떨어짐** → 완성율 = 매칭 / 모수. 카드의 '매칭' 숫자와 같은 규칙을 쓴다
        //   (computeStats와 어긋나면 카드는 100%인데 순서는 아래인 일이 생긴다).
        const _readyOf = (sec, m) => {
          if (!sec) return null;                       // 섹션 자체가 없는 항차 — 계산에서 뺀다
          const _edi = sec.ediContainers || {};
          const _ptk = new Set();
          Object.entries(_edi).forEach(([key, c]) => {
            if (!c) return;
            if (m === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol)) _ptk.add(c.cn || key);
          });
          const _rec = new Set(ownDirCns(sec.records || {}, m));   // 1.11: 반대 방향 리스트 제외
          const matched = [...(_ptk)].filter(cn => _rec.has(cn)).length;
          // 플랜 슬롯(__SLOT_ — 컨번호 미배정 자리)은 매칭될 수 없으므로 모수에서 뺀다.
          const slots = [...(_ptk)].filter(cn => String(cn).startsWith('__')).length;   // 3.26: `__BOOK_` 도 자리
          //   모수는 EDI 평택분과 리스트 중 **큰 쪽**. 한쪽만 있으면 완성율이 낮게 나오고,
          //   둘 다 있고 맞아떨어져야 1.0 이 된다.
          //   3.26: 부킹 자리가 있으면 «자리를 채운 실번호 수»가 매칭에 더해지고 분모는 실번호 EDI + 자리(계획 전체)와 리스트 중 큰 쪽
          //     — 실번호 EDI 와 자리가 섞인 배(부분 부킹)에서도 실번호 매칭을 버리지 않는다(3차 감사).
          const _bf = bookingFillOfSec(sec, m);
          const matchedAll = matched + (_bf ? Math.min(_bf.real, _bf.slots) : 0);
          const den = Math.max(_ptk.size - slots + (_bf ? _bf.slots : 0), _rec.size);
          return den > 0 ? { matched: matchedAll, den } : null;    // 자료가 아예 없는 섹션
        };
        // TallyOne 1.13-01: **예정 섹션은 voy_d / voy_l 이 진실이다.** 섹션 노드 유무로 보면 안 된다.
        //   사건(검수사 신고 2026-08-06): 양하만 들어온 배가 `✅ 자료 확정`으로 떴다. 양하·선적을
        //   둘 다 하는 배인데도. 원인 — 선적 섹션 노드가 아직 없으니 계산에서 통째로 빠져
        //   "양하 하나만 100%" = 전체 100% 가 됐다.
        //   실측: TNJP 26356E(voy_d 26356E · voy_l 26356W) — discharge 만 존재. SWDN 2608N 도 같다.
        //   ATPR 2636E 처럼 voy_d 만 있는 배는 양하만으로 확정이 맞다(검수사: "ATPR은 양하만 선적만이 있으니").
        const _info = v.info || {};
        const _expect = [];
        if (_info.voy_d) _expect.push('discharge');
        if (_info.voy_l) _expect.push('loading');
        if (!_expect.length) _expect.push(_info.mode === 'loading' ? 'loading' : 'discharge');   // 옛 항차 폴백
        // 섹션마다 완성율을 따로 낸다. 자료가 아직 없는 예정 섹션은 0 — 몇 대일지 모르므로 가중치는 균등하다.
        const _srAll = _expect.map(m => {
          const r = _readyOf(m === 'discharge' ? v.discharge : v.loading, m);
          return { mode: m, ratio: r ? r.matched / r.den : 0, has: !!r };
        });
        // 1.93-03 (검수사 실측 SWSP — 터미널 «P/I, 양하 없음»·배정 0 인데 카드엔 «⏳ 양하자료 대기중»):
        //   배정목록에도 0 인 모드는 기다릴 자료가 아니다 — 예정 섹션에서 뺀다(자료가 실제로 오면 다시 포함).
        //   MissingSideNote(1.78)와 같은 판정: 배정 수량이 «확인된 0»(null 아님) && 그 모드 자료 없음.
        const _srKept = _srAll.filter(x => {
          const q = x.mode === 'discharge' ? _info.planDis : _info.planLod;
          //  2.67-02: 자료가 **와 있어도** 배정이 0 이면 기다릴 것이 아니다 — 전량 캔슬(PCSZ 2626W).
          //    종전 조건은 «자료 없음» 일 때만 걸러서 캔슬 항차에 «⏳ 선적자료 대기중» 이 남았다.
          if (sideCancelled(_info, x.mode)) return false;
          return !(q != null && Number(q) === 0 && !x.has);
        });
        const _sr = _srKept.length ? _srKept : _srAll;   // 전부 걸러지면 폴백(왜곡 방지)
        const _rDen = _sr.filter(x => x.has).length;   // 자료가 들어온 예정 섹션 수
        const _done = _sr.filter(x => x.ratio >= 0.9999);
        const _wait = _sr.filter(x => x.ratio < 0.9999);
        return { key: k, ...v, _berth: berth, _pier: pier, _rawBerth: rawBerth,
                 _pm: pm,   // 2.26: 「평택 다음」 판정용 — PORT-MIS 차항지가 1순위다
                 // 1.40-01: PORT-MIS **항 도착** 시각 원본 (검수사 확정 2026-08-10).
                 //   "포트미스는 항 도착시간이고 도선은 도선 시작입니다. 그리고 포트미스는 세관에 신고된
                 //    시간이기 때문에 따로 표기 해야 합니다."
                 //   → 작업시작으로 환산하지 않는다(+30분은 수집기가 planDate 에만 적용). 여기는 신고 원본.
                 _pmEta: (pm && pm.eta) || '',
                 // TallyOne 1.13-01: 예정 섹션들의 완성율 평균. 둘 다 해야 하는 배는 둘 다 채워야 1.0 이 된다.
                 _ready: _sr.length ? _sr.reduce((t, x) => t + x.ratio, 0) / _sr.length : 0,
                 _hasData: _rDen > 0,                     // TallyOne 1.12: 자료가 하나라도 있는가(EDI든 리스트든)
                 // 일부만 끝났으면 무엇을 기다리는지 카드에 적는다 — '선적자료 대기중'(검수사 요청 2026-08-06).
                 _waitFor: (_done.length > 0 && _wait.length > 0)
                   ? _wait.map(x => (x.mode === 'discharge' ? '양하' : '선적')).join('·') : '',
                 // 예정 섹션 중 **자료가 한 번도 안 들어온** 것이 있는가 — 확정 자격 판정에 쓴다.
                 _missingSection: _sr.some(x => !x.has),
                 // TallyOne 1.13: 자료가 마지막으로 들어온 시각. EDI·리스트만 본다(X-RAY 제외 — 확정 뒤 붙는 자료).
                 //   `{mode}/dataAt` 이 1.13 부터 기록된다. 그 전에 등록된 항차는 EDI 업로드 시각으로 폴백한다.
                 _dataAt: Math.max(
                   Number(v.discharge?.dataAt) || 0, Number(v.loading?.dataAt) || 0,
                   Number(v.discharge?.raw?.edi?.uploadedAt) || 0, Number(v.loading?.raw?.edi?.uploadedAt) || 0,
                 ),
                 _etaMs: _pick ? _pick.eta : null,     // V9.01: 작업시간 근접 정렬용
                 _etdMs: _pick ? _pick.etd : null,
                 _etaSrc: _pick ? _pick.src : '' };    // V9.35: 작업일시 배지 출처 표기용
      })
      .sort((a, b) => {
        // ★ TallyOne 1.77 — **작업일시가 1순위다** (검수사 확정 2026-08-17: "선박 순서도 작업 일시순으로").
        //   종전(1.12)엔 ①자료 완성율 ②자료 유무가 앞에 있어 시간 순서가 통째로 깨졌다.
        //   그 규칙(검수사 원문 "금일 작업 선박이라도 자료가 없으면 자료 있는 선박 밑에 놓고")은
        //   **폐기가 아니라 동률 판정으로 내려왔다** — 검수사 확답: "작업일시 먼저, 같은 시간대면 자료 있는 배 위".
        //   08:00 처럼 같은 시각에 여러 배가 서는 일이 흔해서 그 동률 판정이 실제로 쓰인다.
        //   등급: ⓪작업 중·예정(작업시작 빠른 순 한 줄) ①출항 지남(최근 순) ②일정 미상(등록 최신순)
        //   ⚠ 종전엔 '작업 중'과 '입항 예정'이 다른 등급이라 두 덩어리로 갈렸다 — 그것도 시간순을 깨는 요인이었다.
        const now = Date.now();
        const rank = (v) => {
          const eta = v._etaMs, etd = v._etdMs;
          if (planIsLive(eta, etd, now)) return [0, eta];   // 4.51: 로그인 현황판과 한 벌(utils.planIsLive)
          // V9.36-01: 도선만 있는 항차(nextArr 없이 nextDep만 — "도선만 잡고 대기")가 미상으로
          //   떨어지던 결함. etd만 미래면 같은 급에 두고 그 시각으로 줄 세운다.
          if (eta == null && etd != null && etd >= now) return [0, etd];
          if (etd != null && etd < now) return [1, -etd];
          return [2, -(v.info.createdAt || 0)];
        };
        const ra = rank(a), rb = rank(b);
        if (ra[0] !== rb[0]) return ra[0] - rb[0];
        if (ra[1] !== rb[1]) return ra[1] - rb[1];
        // ── 여기부터는 작업시작이 **같을 때만** 갈린다 ──
        // 1.77-01 검수사 확정 2026-08-17: *"같은 시작시간이라고 끝나는 시간이 먼저인 걸 앞에 놓겠습니다.
        //   이유는 먼저 사라지기 때문입니다."* · *"같이 08시 시작이지만 하나는 16:00 하나는 중간
        //   하나는 그 다음날까지 갑니다."* → **끝나는 시각이 빠른 배가 위.** 종료 미상은 뒤로.
        {   // 4.51: 이 동률 규칙은 utils.planEndCompare 한 벌 — 로그인 현황판도 같은 함수로 잇는다
          const te = planEndCompare(a._etdMs, b._etdMs);
          if (te) return te;
        }
        if (!!b._hasData !== !!a._hasData) return (b._hasData ? 1 : 0) - (a._hasData ? 1 : 0);
        return (b._ready || 0) - (a._ready || 0);
      });
  }, [voyages, portMisData, pilotForecast]);

  // TallyOne 1.19: 미회신 오답 감시 — **소유자에게만.**
  //   검수사 지시 2026-08-06: 오답 리포트는 #/chief 안에 있어서 그 화면을 열어야만 보인다.
  //   전 검수원 방송(fbSetBroadcast)은 쓰지 않는다 — 현장 검수원이 할 수 있는 일이 아니라
  //   화면만 시끄러워진다. 권한 판정은 이미 있는 isOwnerName 을 그대로 쓴다.
  const [fbUnanswered, setFbUnanswered] = useState(0);
  useEffect(() => {
    if (!isOwnerName(inspector)) return;            // 소유자가 아니면 구독 자체를 안 건다
    return fbSubscribeFeedback((fb) => {
      const n = Object.values(fb || {}).filter(f =>
        f && (f.query || '').trim() && !f.claudeStatus && !f.resolved).length;
      setFbUnanswered(n);
    });
  }, [inspector]);

  // TallyOne 1.13: **자료 확정 시각 자동 기록** (검수사 확정 2026-08-06 — "앱이 자동으로").
  //   완성율(EDI·리스트 100% 매칭)이 처음 1.0 이 된 순간 `info.dataFixedAt` 을 남긴다.
  //   이 시각이 있어야 그 뒤 자료가 또 들어왔을 때 "수정본"으로 구분할 수 있다.
  //   이미 있으면 절대 덮지 않는다 — 확정은 한 번뿐이고, 덮으면 수정본 판정이 영영 안 뜬다.
  const _fixedWrote = useRef(new Set());
  useEffect(() => {
    for (const v of voyagesWithPier) {
      if (!v?.key || v._ready < 0.9999) continue;
      if (v.info?.dataFixedAt) continue;
      if (_fixedWrote.current.has(v.key)) continue;   // 같은 화면에서 중복 쓰기 방지
      _fixedWrote.current.add(v.key);
      fbUpdateVoyageInfo(v.key, { dataFixedAt: Date.now() })
        .catch(e => console.warn('[dataFixedAt] 자료 확정 시각 기록 실패 —', v.key, e));
    }
  }, [voyagesWithPier]);

  // TallyOne 1.13-01: **잘못 찍힌 확정 기록 자동 정리.**
  //   1.13 이 예정 섹션을 섹션 노드 유무로 봐서, 양하만 들어온 배(선적 예정)를 확정으로 기록해 버렸다
  //   (실측 2026-08-06 17:14 — TNJP 26356E · SWDN 2608N). 코드만 고치면 그 기록이 남아 계속 '확정'으로 뜬다.
  //   지우는 조건을 **좁게** 잡는다: 예정 섹션 중 **자료가 한 번도 안 들어온** 것이 있을 때만.
  //   정상적인 '수정본'(모든 섹션에 자료가 있는데 매칭이 잠깐 어긋난 상태)은 건드리지 않는다 —
  //   거기서 확정 기록을 지우면 수정본 표기가 사라진다.
  const _fixedCleared = useRef(new Set());
  useEffect(() => {
    for (const v of voyagesWithPier) {
      if (!v?.key || !v.info?.dataFixedAt) continue;
      if (!v._missingSection) continue;
      if (_fixedCleared.current.has(v.key)) continue;
      _fixedCleared.current.add(v.key);
      console.warn('[dataFixedAt] 자료 없는 예정 섹션이 있어 확정 기록을 지웁니다 —', v.key);
      fbUpdateVoyageInfo(v.key, { dataFixedAt: null })
        .catch(e => console.warn('[dataFixedAt] 확정 기록 정리 실패 —', v.key, e));
    }
  }, [voyagesWithPier]);

  // M6.18: 잘못된 berth가 voyage.info에 저장되어 있으면 백그라운드 자동 정리
  //   M6.13 자동 정리는 VoyagePage 진입 시에만 동작 — HomePage에서도 처리
  useEffect(() => {
    voyagesWithPier.forEach(v => {
      const info = v.info || {};
      const stored = info.berth || '';
      if (stored && !isValidBerth(stored)) {
        fbUpdateVoyageInfo(v.key, { berth: '', pier: '' }).catch(e =>
          console.warn('[M6.18] HomePage berth 자동 정리 실패:', v.key, e)
        );
      }
    });
  }, [voyagesWithPier]);

  // M5.82: 부두별 그룹화 + 현 부두 우선
  const _chiefBtn = canOpenChief(inspector, isOwnerName(inspector));
  const _viewOnly = isViewOnlyNow();   // 3.55-01   // 3.54: 수집기 줄 옆 절반 자리 — 보이는 사람에게만
  const effectivePier = pierFilter === 'auto' ? currentPier?.code : (pierFilter === 'all' ? null : pierFilter);
  // ★ 4.01(검수사 2026-10-04 «자료 없음 선박까지 보여줄 필요는 없다고 생각합니다. 자료가 들어 오면 그때 보여주는게 나을듯 합니다»):
  //   자료가 하나도 없는 항차(카드에 «자료 없음» 이 뜨는 것)는 목록에서 빼고 맨 아래 «자료 대기» 한 줄에 접어 둔다. 자료가 들어오면 저절로 위 목록으로 올라온다.
  //   판정은 카드 문구와 같은 `_hasData`(EDI든 리스트든 한쪽이라도) + 카톡 물량 예보(info.forecast) — 물량 예보가 있는 배는 자료가 있는 것으로 본다.
  //   ⚠ 아예 지우지 않는다 — 자료가 없는 배는 목록에서 열어야만 EDI 를 직접 올릴 수 있다(새로 만든 항차도 처음엔 자료가 없다).
  //   ⚠ 접은 줄도 언마운트하지 않는다(`hidden`) — VoyageCard 의 departBadgeAt sticky 기록이 죽으면 콘앱 출항 표시가 멈춘다.
  const _isWaitData = (v) => !v._hasData && !v.info?.forecast;
  //  이미 지난 배(출항 — 없으면 작업시작 — 이 지금보다 앞) · 2.82-01 채움에서 건너뛰는 배와 같은 판정 한 벌
  const _isPastVoy = (v, now) => planIsPast(v?._etaMs, v?._etdMs, now);   // 4.51: 판정은 utils.planIsPast 한 벌(로그인 현황판 공용)
  const _pierFirst = (arr) => {
    if (!effectivePier) return arr;
    const here = arr.filter(v => v._pier === effectivePier);   // 현 부두 위로
    const others = arr.filter(v => v._pier !== effectivePier);
    return [...here, ...others];
  };
  const list = useMemo(() => _pierFirst(voyagesWithPier.filter(v => !_isWaitData(v))), [voyagesWithPier, effectivePier]);
  const waitList = useMemo(() => _pierFirst(voyagesWithPier.filter(_isWaitData)), [voyagesWithPier, effectivePier]);

  // ── 2.09: 펼침(작업중 ∨ 당일 ∨ 명일) / 접힘 두 벌 ──
  //   ⚠ 접힘 그룹은 **언마운트하지 않는다**(`hidden`). VoyageCard 안의 departBadgeAt sticky useEffect 가
  //     죽으면 콘앱(cone.html 이 이 값을 그대로 읽는다)의 출항 표시가 멈춘다. 표시 계층만 바꾼다.
  const [foldOpen, setFoldOpen] = useState(false);
  const [waitOpen, setWaitOpen] = useState(false);   // 4.01: 자료 대기 줄
  const { openList, foldList } = useMemo(() => {
    const o = [], f = [];
    for (const v of list) (isOpenVoyage(v) ? o : f).push(v);
    //  ★ 2.82 (검수사 지시 2026-08-29) — *«검수앱 홈화면 항차 목록도 기본 6개는 보이게 해주세요.
    //    작업 일시 순으로»*. 실측 2026-08-29: 활성 15항차 중 펼쳐지는 것이 **2개**뿐이었다
    //    (나머지는 D+2 이후라 접힌 채였고, 화면이 비어 보였다).
    //    ⇒ 작업중·당일·명일이 6개에 못 미치면 **접힘 앞에서 끌어와** 6개를 채운다.
    //    `list` 는 이미 ①현 부두 우선(현장순) ②작업일시 순으로 서 있으므로 **앞에서 가져오면 순서가 맞다** —
    //    여기서 다시 정렬하지 않는다(정렬 두 벌 금지).
    //  ⛔ 2.82-01: 채울 때 **이미 지난 배는 건너뛴다.** 실측 — TMPZ 2027E(작업 08-18, 열흘 전)가
    //    채움에 끌려 목록 맨 위로 올라올 수 있었다. 검수사가 원한 것은 «앞으로 올 배»다.
    const MIN_OPEN = 6;
    const _now = Date.now();
    const _past = (v) => _isPastVoy(v, _now);   // 4.25 2차: 판정 한 벌 — 컴 날짜 묶음(아래 groups)도 같은 함수로 «그 밖의 배»를 고른다
    const _rest = [];
    while (o.length < MIN_OPEN && f.length) {
      const v = f.shift();
      if (_past(v)) { _rest.push(v); continue; }   // 지난 배는 접힘에 그대로 둔다
      o.push(v);
    }
    return { openList: o, foldList: [..._rest, ...f] };
  }, [list]);

  const activeInspectors = useMemo(() => {
    const out = {};
    Object.values(inspectors || {}).forEach(i => {
      if (!i || !i.lastVoyage || !i.lastActive) return;
      if (i.loggedIn === false) return;              // V7.94-14: 로그아웃 마킹 제외
      if (Date.now() - i.lastActive > 90000) return; // 90초 이내만
      if (!isVisibleStaff(i.name, isOwnerName(inspector))) return;   // 1.73: 개발·시험 계정은 소유자에게만
      if (!out[i.lastVoyage]) out[i.lastVoyage] = [];
      out[i.lastVoyage].push({ name: i.name, mode: i.lastMode });
    });
    return out;
  }, [inspectors, inspector]);

  const handleCreate = async () => {
    if (!vsl.trim() || !voy.trim()) return;
    const key = `${vsl.trim().toUpperCase().replace(/\s+/g, '')}_${voy.trim().toUpperCase()}`;
    const upVoy = voy.trim().toUpperCase();
    // M6.46: mode별로 voy_d / voy_l 명시 저장 (EDI에 의존하지 않음)
    //   양하 항차 생성 → voy_d 정확. 선적 항차 생성 → voy_l 정확.
    //   "다른 mode 섹션 추가" 시 별도 voy 입력 받음 (VoyagePage)
    const info = {
      vsl: vsl.trim().toUpperCase(),
      voy: upVoy,
      mode: showCreate,
      createdAt: Date.now(),
      createdBy: inspector || '',
    };
    if (showCreate === 'discharge') info.voy_d = upVoy;
    else if (showCreate === 'loading') info.voy_l = upVoy;
    await fbCreateVoyage(key, info);
    setVsl(''); setVoy(''); setShowCreate(null);
    onOpenVoyage(key);
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (key, vsl, voy) => {
    const v = voyages[key];
    const hasD = v?.discharge && Object.keys(v.discharge).length > 0;
    const hasL = v?.loading && Object.keys(v.loading).length > 0;
    //  3.60-09 (진단 T11): 완료 기록 수 — 삭제는 보관소를 안 거치므로 확인 단계에서 알린다.
    const doneD = Object.keys(v?.discharge?.completed || {}).length;
    const doneL = Object.keys(v?.loading?.completed || {}).length;
    setDeleteTarget({ key, vsl, voy, hasD, hasL, doneD, doneL });
  };

  const performDelete = async (action) => {
    if (!deleteTarget) return;
    const { key } = deleteTarget;
    // V9.05-03: 섹션 삭제 시 해당 voy 필드도 함께 제거 — 한쪽만 지웠는데 info.voy_d/voy_l이
    //   남아 목록·검색(599행 some)·수집기 재등록 판정이 유령 항차를 계속 보던 버그.
    //   RTDB update에 null을 주면 그 키가 삭제된다.
    // V9.57: 잔재 정리 확대 — 해당 모드의 완료 표시({mode}Done/{mode}DoneAt)도 지우고,
    //   info.voy는 남은 쪽 항차(voy_l 또는 voy_d, 둘 다 없으면 null)로, info.mode도 남은 쪽으로 재기입.
    //   종전엔 삭제된 쪽의 voy·mode·완료 기록이 남아 목록 표기·검수완료 판정·재등록이 어긋났다.
    const v = voyages[key];
    if (action === 'discharge') {
      await fbDeleteSection(key, 'discharge');
      const hasL = !!(v?.loading && Object.keys(v.loading).length > 0);
      await fbUpdateVoyageInfo(key, {
        voy_d: null, dischargeDone: null, dischargeDoneAt: null,
        voy: v?.info?.voy_l || null,
        mode: hasL ? 'loading' : null,
      });
    } else if (action === 'loading') {
      await fbDeleteSection(key, 'loading');
      const hasD = !!(v?.discharge && Object.keys(v.discharge).length > 0);
      await fbUpdateVoyageInfo(key, {
        voy_l: null, loadingDone: null, loadingDoneAt: null,
        voy: v?.info?.voy_d || null,
        mode: hasD ? 'discharge' : null,
      });
    }
    else if (action === 'all') await fbDeleteVoyage(key);
    setDeleteTarget(null);
  };
  //  3.60-19 (진단 T11·감사): 삭제 실패(휴지통 복사 실패·조회만 등)가 화면에 닿게 — 종전엔 catch 가 없어 조용히 끝났다.
  const performDeleteSafe = async (action) => {
    try { await performDelete(action); }
    catch (e) { console.error('[홈 삭제] 실패:', e); alert(`삭제하지 못했습니다 — ${e && e.message ? e.message : e}`); }
  };

  // 완료 버튼: 작업 끝난 항차 → 전체 작업량을 선박 누적에 100% 완료 기록 후 삭제.
  //   (삭제 버튼은 기록 없이 그냥 삭제 — 잘못 만든 항차 제거용)
  // M7.23: 이중 확인 1단계 — 검수사가 항차에서 누르는 '완료'는 삭제가 아니라
  //   '검수 완료(수석 확인 대기)' 표시만. 실제 archive 백업+보관소 기록+삭제는
  //   수석이 대시보드 진행 상황에서 최종 '완료 저장'을 누를 때만 실행.
  //   (2명이 나눠 작업 중 한 명이 자기 자리 완료를 전체 완료로 잘못 눌러 삭제되는 사고 방지)
  const [completeTarget, setCompleteTarget] = useState(null);
  // V7.90: 완료를 양하/선적으로 분리 — 작업시간 구분 + 콘앱 분리작업 자동 판정의 근거.
  //   mode='discharge'|'loading'. 보유 모드가 전부 완료되면 기존 "수석 대기" 상태가 됨.
  const performComplete = async () => {
    if (!completeTarget) return;
    const { key, mode } = completeTarget;
    try {
      const f = mode === 'discharge'
        ? { dischargeDone: true, dischargeDoneAt: Date.now() }
        : { loadingDone: true, loadingDoneAt: Date.now() };
      await fbUpdateVoyageInfo(key, f);
    } catch (e) {
      console.error('[검수완료 표시] 실패:', key, e);
      alert('검수 완료 표시 중 오류가 발생했습니다.');
    }
    setCompleteTarget(null);
  };
  // 검수사가 누른 모드별 완료를 수석 확인 전 되돌리기
  const undoInspectorDone = async (key, mode) => {
    try {
      const f = mode === 'discharge'
        ? { dischargeDone: false, dischargeDoneAt: null }
        : { loadingDone: false, loadingDoneAt: null };
      await fbUpdateVoyageInfo(key, f);
    } catch (e) { console.error('[검수완료 취소] 실패:', key, e); }
  };
  // 보유 모드 전부 완료 여부 (구 inspectorDone 데이터 하위호환)
  const isAllDone = (v) => {
    if (v?.info?.inspectorDone) return true;
    const hasD = v?.discharge && Object.keys(v.discharge).length > 0;
    const hasL = v?.loading && Object.keys(v.loading).length > 0;
    if (!hasD && !hasL) return false;
    return (!hasD || !!v?.info?.dischargeDone) && (!hasL || !!v?.info?.loadingDone);
  };

  // ── ★ 4.25 홈 배치(판 D) ─────────────────────────────────────────────────
  //   검수사 2026-10-12 19:42 «검수앱과 수석대쉬보드의 폰화면과 컴퓨터의 화면이 복잡하고 난해 합니다 … 간결하고 보기 좋게»
  //   · 불편 «한 화면에 항목이 너무 많다 · 글자가 작아 안 보인다 · 어디에 뭐가 있는지 찾기 어렵다» · 2026-10-13 00:53 «전부 클로드 안대로».
  //   컴(1024px 이상) — 상태 띠 한 줄 + 왼쪽 배 목록(묶음 작업 중 → 오늘 → 내일 → 날짜 → 그 밖의 배 · 맨 아래 접힘 둘) + 오른쪽 고른 배 상세
  //     (종전 카드 한 장의 내용 전부 + 베이별 진행 · 자료 대수). 페이지 스크롤 없음 — 목록·상세는 칸 안에서 구른다.
  //   폰 — 상태 띠 + 조작 줄(같은 높이 셋) + 배 줄. 줄을 누르면 그 배 전체화면 시트(컴 상세와 같은 내용 · [양하 열기][선적 열기]).
  //   처리기(새 항차·예보·삭제·완료·되돌리기·지금 처리·목적지 확인·실 정책)는 자리만 옮겼다 — 본문은 그대로다.
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 1024);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const [selKey, setSelKey] = useState('');       // 컴 — 오른쪽 상세에 편 배
  const [sheetKey, setSheetKey] = useState('');   // 폰 — 전체화면 시트로 연 배
  const [meOpen, setMeOpen] = useState(false);    // 상태 띠 «나 오늘» 칩 — 누르면 종전 «오늘의 나» 줄(시간당·마지막 완료)
  //  ⚡ 지금 처리 상태 — 종전엔 카드마다 따로 있었다. 상세는 고른 배 하나라 배마다 여기 둔다(다른 배를 보고 와도 결과가 남는다).
  const [zapMap, setZapMap] = useState({});
  const zapOf = (key) => {
    const cur = zapMap[key] || {};
    const put = (field) => (val) => setZapMap((m) => {
      const c = m[key] || {};
      const nv = typeof val === 'function' ? val(c[field] || '') : val;
      return { ...m, [key]: { ...c, [field]: nv } };
    });
    return { zap: cur.zap || '', zapMsg: cur.zapMsg || '', setZap: put('zap'), setZapMsg: put('zapMsg') };
  };
  //  컴 — 두 칸 높이를 «칸 위 끝 → 화면 바닥 − 8px» 로 잰다(4.24 수석 상황판 보드와 같은 수법). 위 띠가 줄거나 늘어도(공지 띠·글자 크게) 1초마다 다시 잰다.
  const panesRef = useRef(null);
  const [paneH, setPaneH] = useState(0);
  useEffect(() => {
    if (!wide) return undefined;
    const fit = () => {
      const el = panesRef.current; if (!el) return;
      const top = Math.max(0, el.getBoundingClientRect().top);
      const h = Math.floor(window.innerHeight - top - 8);
      if (h > 240 && Math.abs(h - paneH) > 1) setPaneH(h);
    };
    fit(); const t = setTimeout(fit, 300);
    const iv = setInterval(fit, 1000);
    window.addEventListener('resize', fit);
    let ro = null;
    try {
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fit); ro.observe(document.body); }
    } catch (e) { console.warn('[홈] 칸 높이 관찰자를 못 걸었다 — 창 크기·1초마다로만 다시 잽니다', e); }
    return () => { clearTimeout(t); clearInterval(iv); window.removeEventListener('resize', fit); if (ro) ro.disconnect(); };
  }, [wide, paneH]);
  //  컴 홈은 페이지가 화면 한 장이다 — 앱 본문 아래 여백(pb-20)·바닥글이 페이지를 늘리지 않게 그때만 접는다(index.css data-home-fill). 폰·다른 화면은 종전 그대로.
  useEffect(() => {
    const el = document.documentElement;
    if (wide) el.setAttribute('data-home-fill', '1'); else el.removeAttribute('data-home-fill');
    return () => el.removeAttribute('data-home-fill');
  }, [wide]);
  //  목록 묶음 — 종전 openList(작업중·당일·명일·모레 + 6개 채움 · 2.82)를 날짜로 묶는다. 묶음 순서는 날짜, 묶음 안 순서는 종전(현 부두 우선 → 작업일시).
  //    폰 — 그 밖의 배(foldList)는 접힘 한 줄(종전과 같다). 판정(isOpenVoyage·MIN_OPEN·자료 대기)은 위 그대로다 — 첫 화면에 서는 배가 4.24 와 같다.
  //    컴 — 4.25 2차(감사 하-1): 컴은 그 밖의 배까지 다 펴므로 목록 전체를 날짜로 묶는다(6개 채움은 폰 접힘용). 채움이 현 부두의 먼 배를 끌어와
  //      «10-17·10-18» 묶음이 다른 부두의 더 가까운 배(10-15·10-16 — «그 밖의 배» 묶음) 위에 서던 날짜 역전이 없어진다. 지난 배만 맨 아래 «🗓 그 밖의 배».
  const groups = useMemo(() => {
    const now = Date.now();
    const openSet = new Set(openList.map((v) => v.key));
    const out = new Map();
    const dateGroupOf = (v) => {
      if (isWorkingNow(v)) return { id: 'work', rank: -100, ico: '⚓', label: '작업 중' };
      const t = v._etaMs ?? v._etdMs ?? null;
      const n = dayDiff(t);
      return n == null ? { id: 'nodate', rank: 999, ico: '🗓', label: '일정 미상' }
        : n === 0 ? { id: 'd0', rank: 0, ico: '📅', label: '오늘' }
        : n === 1 ? { id: 'd1', rank: 1, ico: '📅', label: '내일' }
        : { id: `d${n}`, rank: n, ico: '📅', label: dayLabel(t) };
    };
    //  list 순서(현 부두 우선 → 작업일시)대로 넣는다 — 폰은 openList 만(종전과 같은 줄·같은 순서), 컴은 나머지도.
    for (const v of list) {
      let g;
      if (openSet.has(v.key)) g = dateGroupOf(v);
      else if (wide) g = _isPastVoy(v, now) ? { id: 'other', rank: 10000, ico: '🗓', label: '그 밖의 배' } : dateGroupOf(v);
      else continue;
      const e = out.get(g.id) || { ...g, rows: [] };
      e.rows.push(v);
      out.set(g.id, e);
    }
    return [...out.values()].sort((a, b) => a.rank - b.rank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, openList, wide, Math.floor(hbNow / 60000)]);
  //  그 밖의 배 이름(폰 접힘 줄) — 모두 앞으로 7일 안이면 «이번 주»(설계), 지난 배·먼 배가 섞이면 종전 이름 «그 밖의 배».
  const otherLabel = (() => {
    const now = Date.now();
    return foldList.length && foldList.every((v) => { const t = v._etaMs ?? v._etdMs; return t != null && t >= now && t - now < 7 * 86400000; }) ? '이번 주' : '그 밖의 배';
  })();
  const byKey = useMemo(() => Object.fromEntries(voyagesWithPier.map((v) => [v.key, v])), [voyagesWithPier]);
  const orderKeys = [...groups.flatMap((g) => g.rows.map((v) => v.key)), ...(wide ? [] : foldList.map((v) => v.key)), ...waitList.map((v) => v.key)];
  const curKey = selKey && byKey[selKey] ? selKey : (orderKeys[0] || '');
  const curV = byKey[curKey] || null;
  const sheetV = !wide && sheetKey ? byKey[sheetKey] || null : null;
  //  4.25 2차(모의 확인 ④): 시트가 열려 있는 동안 폰 «뒤로» 는 시트만 닫는다 — App 홈 가드가 종료 확인 앞에서 이 함수를 부른다(backHandler 한 벌).
  const _sheetOpen = !!sheetV;
  useEffect(() => {
    if (!_sheetOpen) return undefined;
    setHomeSheetClose(() => setSheetKey(''));
    return () => setHomeSheetClose(null);
  }, [_sheetOpen]);
  //  같은 배에 같은 재료 — 줄·상세·시트가 이 두 묶음만 받는다(종전 VoyageCard 에 넘기던 값 그대로).
  const modeDoneOf = (v) => ({
    d: v.info?.inspectorDone || !!v.info?.dischargeDone,
    l: v.info?.inspectorDone || !!v.info?.loadingDone,
    hasD: !!(v.discharge && Object.keys(v.discharge).length),
    hasL: !!(v.loading && Object.keys(v.loading).length),
  });
  const rowOf = (v) => (
    <ShipRow key={v.key} voyage={v} pilotForecast={pilotForecast} activeInspectors={activeInspectors[v.key] || []}
      selected={wide && v.key === curKey} canComplete={!_viewOnly} inspectorDone={isAllDone(v)} modeDone={modeDoneOf(v)}
      onOpen={(m) => onOpenVoyage(v.key, m)}
      onSelect={() => { if (wide) setSelKey(v.key); else setSheetKey(v.key); }} />
  );
  const detailOf = (v, showOpen) => (
    <ShipDetail key={v.key} voyage={v} inspector={inspector} pilotForecast={pilotForecast} showOpen={showOpen}
      activeInspectors={activeInspectors[v.key] || []}
      onOpen={(m) => onOpenVoyage(v.key, m)}
      onDelete={_viewOnly ? null : () => handleDelete(v.key, v.info.vsl, v.info.voy)}
      onComplete={_viewOnly ? null : (mode) => setCompleteTarget({ key: v.key, vsl: v.info.vsl, voy: v.info.voy, mode })}
      inspectorDone={isAllDone(v)}
      modeDone={modeDoneOf(v)}
      onUndoComplete={(mode) => undoInspectorDone(v.key, mode)}
      laneRow={laneOf(v.info?.lane)}
      zapSt={zapOf(v.key)}
      policy={matchShipPolicy(v.info?.vsl || '', shipPols)}
      onEditPolicy={(pol) => setPolEdit({ vsl: pol.name || v.info?.vsl || '', policy: pol })} />
  );
  const waitRef = useRef(null);
  const polRef = useRef(null);
  //  컴 — 접힘 둘은 목록 칸 맨 아래에 붙어 있다(목록이 길어도 첫 화면). 펴면 그 내용이 목록 끝에 서고 그 자리로 굴러간다.
  const reveal = (ref) => { if (!wide) return; try { requestAnimationFrame(() => { if (ref.current) ref.current.scrollIntoView({ block: 'nearest' }); }); } catch (e) { console.warn('[홈] 펼친 자리로 못 굴렀다', e); } };
  const _me = computeMyToday(voyages, inspector, Date.now());
  const _hbText = hbView.state === 'ok' ? `수집기 ${hbView.ageMin}분 전`
    : hbView.state === 'down' ? `수집기 끊김 ${hbView.ageMin}분 — 숫자 갱신 정지` : '수집기 자료 없음';
  const _hbTitle = hbView.state === 'none' ? '수집기 상태 자료 없음 — 하트비트 미수신 · 누르면 보조기능(항차 건강 점검 · 맛집 수첩 …)'
    : `수집기 v${heartbeat?.version || '?'} · ${hbView.ageMin}분 전 갱신 · 주기 ${hbView.cycleMin}분${hbView.state === 'down' ? ` · 끊김 기준 주기 ${hbView.cycleMin}분×2` : ''} — 누르면 보조기능(항차 건강 점검 · 맛집 수첩 …)`;
  const _workN = (groups.find((g) => g.id === 'work') || { rows: [] }).rows.length;
  const _waitNames = (() => {
    const cnt = {}; for (const v of voyagesWithPier) { const s = v.info?.vsl || ''; cnt[s] = (cnt[s] || 0) + 1; }
    return waitList.map((v) => (cnt[v.info?.vsl || ''] > 1 ? `${v.info?.vsl} ${v.info?.voy_d || v.info?.voy || ''}`.trim() : (v.info?.vsl || v.key))).join(' · ');
  })();

  //  상태 띠 조각 — 컴은 한 줄(오른쪽에 조작 단추), 폰은 상태 띠 + 조작 줄(같은 높이 셋). 문은 종전과 같은 처리기를 부른다.
  const collectorBtn = (
    //  TallyOne 1.0 (K5) 수집기 줄 → 보조기능(#/aux) 그대로. 3.54 «수집기표시는 수석대쉬보드 표기를 … 같이 사용» — 글자는 4.24 수석 상황판 상태 줄과 같은 꼴.
    <button type="button" onClick={() => onOpenAux && onOpenAux()} title={_hbTitle} data-home-chip="collector" data-hb={hbView.state}
      className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 max-w-full text-left rounded-pill px-1.5 hover:bg-ink-800 text-sm2 font-bold text-dim-200" style={{ minHeight: 'var(--tap-chip)' }}>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hbView.state === 'ok' ? 'bg-emerald-400' : hbView.state === 'down' ? 'bg-red-500 animate-pulse' : 'bg-dim-500'}`} aria-hidden="true" />
      <span className={`whitespace-nowrap ${hbView.state === 'down' ? 'text-red-300' : hbView.state === 'none' ? 'text-dim-400' : ''}`}>{_hbText}</span>
      <span className="w-px h-4 bg-line-strong shrink-0 mx-0.5" aria-hidden="true" />
      <span className={`whitespace-nowrap ${healthIssueCount ? 'text-amber-300' : 'text-emerald-300'}`} data-home-health={healthIssueCount}>
        {healthIssueCount ? `⚠ 검증 필요 ${healthIssueCount}건` : '✓ 자료 정상'}
      </span>
    </button>
  );
  //  TallyOne 1.19: 미회신 오답 — 소유자만 본다. 누르면 수석 상황판(오답 리포트)으로.
  const fbChip = fbUnanswered > 0 && isOwnerName(inspector) ? (
    <button type="button" onClick={onOpenChiefDashboard} data-home-chip="feedback" title={`오답 ${fbUnanswered}건 — 아직 회신 안 함 · 눌러서 보기`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 border-2 border-red-800/60 bg-red-950/40 text-red-200 text-sm2 font-bold hover:bg-red-900/40" style={{ minHeight: 'var(--tap-chip)' }}>
      ❌ 오답 <b className="mono">{fbUnanswered}</b>
    </button>
  ) : null;
  //  V9.16: 오늘의 나 — 내 완료 기록이 있을 때만. 칩을 누르면 종전 줄(오늘 N대 · 시간당 · 마지막 완료)이 띠 아래에 펴진다.
  const meChip = _me && _me.count > 0 ? (
    <button type="button" onClick={() => setMeOpen((o) => !o)} aria-expanded={meOpen} data-home-chip="me" title="오늘 내 처리량 — 누르면 시간당·마지막 완료"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 border-2 border-emerald-800/60 bg-ink-900 text-dim-200 text-sm2 font-bold" style={{ minHeight: 'var(--tap-chip)' }}>
      🙋 나 오늘 <b className="text-emerald-300 mono">{_me.count}</b>대
    </button>
  ) : null;
  const meLine = meOpen && _me && _me.count > 0 ? (() => {
    const me = _me;
    const ago = me.lastAt ? Math.round((Date.now() - me.lastAt) / 60000) : null;
    return (
      <div className="flex items-center gap-3 bg-ink-900 border border-emerald-800/50 rounded-pill px-3 py-2 mb-2" data-home-me="1">
        <span className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-ink-950 text-xs font-black shrink-0">{inspector[0]}</span>
        <div className="flex items-baseline gap-3 flex-wrap text-xs">
          <span className="text-dim-200">오늘 <b className="text-emerald-300 text-base mono">{me.count}</b>대</span>
          {me.perHour != null && <span className="text-dim-300">시간당 <b className="text-emerald-300 mono">{me.perHour}</b>대<span className="text-dim-500"> (내 몫)</span></span>}
          {me.perHour == null && me.paceNote && <span className="text-dim-400">페이스 못 잼 · {me.paceNote}</span>}
          {ago != null && <span className="text-dim-400">마지막 완료 {ago < 1 ? '방금' : `${ago}분 전`}</span>}
        </div>
      </div>
    );
  })() : null;
  //  3.54(검수사 2026-09-21 «수집기표시는 수석대쉬보드 표기를 절반으로 같이 사용합니다»): 수석 상황판 입구는 상태 띠에. V9.44·1.41 그대로 — canOpenChief 인 사람에게만.
  const chiefBtn = _chiefBtn ? (
    <button type="button" onClick={onOpenChiefDashboard} data-home-chip="chief" title="수석 상황판 — 전체 검수원 진행률·통계"
      className="lift3 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-3 border-2 border-purple-600/70 bg-purple-950/50 text-purple-100 text-sm2 font-black hover:bg-purple-900/60" style={{ minHeight: 'var(--tap-chip)' }}>
      📊 수석 상황판 →
    </button>
  ) : null;
  //  3.55: 부두 고르기(자동·PCTC·PNCT·전체 · 위치 다시 재기)와 새 항차(양하·선적·예보)는 누르면 펼쳐지는 단추 하나씩 — 처리기 그대로.
  const pierMenu = (() => {
    const _autoLabel = currentPier ? `자동·${currentPier.code}` : gpsState === 'loading' ? '자동…' : gpsState === 'far' ? '자동·외부' : gpsState === 'denied' ? '자동·위치꺼짐' : '자동';
    const _cur = pierFilter === 'auto' ? _autoLabel : pierFilter === 'all' ? '전체' : pierFilter;
    const _tone = pierFilter === 'PCTC' ? 'is-blue' : pierFilter === 'PNCT' ? 'is-violet' : '';   // 4.01: 눌린 칩(chip-v2 is-on) — 부두 색
    const _opts = [{ id: 'auto', label: _autoLabel }, { id: 'PCTC', label: 'PCTC' }, { id: 'PNCT', label: 'PNCT' }, { id: 'all', label: '전체' }];
    return (
      <div className="relative min-w-0" data-home-menu="pier">
        <button onClick={() => setTopMenu(m => (m === 'pier' ? '' : 'pier'))} aria-haspopup="menu" aria-expanded={topMenu === 'pier'}
          className={`chip-v2 is-on ${_tone} max-w-full w-full justify-center ${wide ? '' : '!h-[var(--tap)]'}`}>
          <span className="truncate">📍 {_cur} ▾</span>
        </button>
        {topMenu === 'pier' && (
          <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[150px] bg-ink-900 border border-line rounded-btn shadow-lg p-1">
            {_opts.map(b => (
              <button key={b.id} role="menuitem" onClick={() => { setPierFilter(b.id); setTopMenu(''); }}
                className={`w-full text-left px-3 py-2.5 rounded text-sm font-bold ${pierFilter === b.id ? 'bg-ink-750 text-dim-100' : 'text-dim-200 hover:bg-ink-800'}`}>
                {pierFilter === b.id ? '✓ ' : ''}{b.label}
              </button>
            ))}
            <button role="menuitem" onClick={() => { measureGps(true); setPierFilter('auto'); setTopMenu(''); }}
              className="w-full text-left px-3 py-2.5 rounded text-sm text-dim-300 hover:bg-ink-800 border-t border-line-soft mt-1">
              🔄 위치 다시 재기
            </button>
          </div>
        )}
      </div>
    );
  })();
  //  3.55-01(검수사 2026-09-22): 조회만은 보기만 — 새 항차·완료·삭제 버튼을 그리지 않는다(3.51 은 눌렀을 때 막았다).
  const newMenu = !_viewOnly ? (
    <div className="relative min-w-0" data-home-menu="new">
      <button onClick={() => setTopMenu(m => (m === 'new' ? '' : 'new'))} aria-haspopup="menu" aria-expanded={topMenu === 'new'}
        className={`pop-btn pop-green pop-sm whitespace-nowrap w-full ${wide ? '' : '!h-[var(--tap)]'}`}>
        <Plus className="ico-s"/>새 항차 ▾
      </button>
      {topMenu === 'new' && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-ink-900 border border-line rounded-btn shadow-lg p-1">
          <button role="menuitem" onClick={() => { setTopMenu(''); setShowCreate('discharge'); }}
            className="w-full text-left px-3 py-2.5 rounded text-sm font-bold text-blue-200 hover:bg-ink-800 flex items-center gap-1"><ArrowDown className="ico-s"/>양하 항차</button>
          <button role="menuitem" onClick={() => { setTopMenu(''); setShowCreate('loading'); }}
            className="w-full text-left px-3 py-2.5 rounded text-sm font-bold text-amber-200 hover:bg-ink-800 flex items-center gap-1"><ArrowUp className="ico-s"/>선적 항차</button>
          <button role="menuitem" onClick={() => { setTopMenu(''); setShowForecast(true); setFcText(''); }}
            title="카톡으로 받은 물량 예보 붙여넣기 — EDI 도착 전 개수 먼저 등록"
            className="w-full text-left px-3 py-2.5 rounded text-sm font-bold text-orange-200 hover:bg-ink-800">📋 물량 예보 붙여넣기</button>
        </div>
      )}
    </div>
  ) : null;
  //  TallyOne 1.5: 화면 데이터만 새로고침 — 로그인을 유지한 채 구독만 재연결한다.
  const refreshBtn = <RefreshDataButton onRefreshData={onRefreshData} refreshing={refreshing} refreshedAt={refreshedAt} className={`lift3 border-2 !px-2 ${wide ? '!min-h-[var(--tap-chip)]' : '!min-h-[var(--tap)] !h-[var(--tap)] min-w-[var(--tap)]'}`}/>;

  //  목록 몸통 — 컴·폰 같은 줄. 묶음 머리 «⚓ 작업 중 3» · 줄 · 그 밖의 배 · 자료 대기 · 선박 실 정책.
  //  4.25 2차: 컴은 날짜 묶음이 하나 둘 늘어난다(그 밖의 배까지 날짜로 편다) — 머리 위 여백을 4→2px 로 줄여 1440 보통에서 종전처럼 마지막 줄까지 첫 화면.
  const grpHead = (id, text) => <div className="text-xs font-black text-dim-400 tracking-wide px-1.5 pt-0.5" data-home-group={id}>{text}</div>;
  const foldBar = (id, ico, title, sub, open, onToggle) => (
    <button type="button" onClick={onToggle} aria-expanded={open} data-home-fold={id}
      className="fold-bar w-full min-w-0 flex items-center gap-2 px-2.5 py-1 text-left" style={{ minHeight: 'var(--tap)' }}>
      <span className="fold-ico">{ico}</span>
      <span className="text-sm2 font-black text-dim-200 whitespace-nowrap">{title}</span>
      <span className="text-xs text-dim-400 min-w-0 truncate">{sub}</span>
      <span className="ml-auto text-dim-500 shrink-0">{open ? '▾' : '▸'}</span>
    </button>
  );
  const waitBar = waitList.length > 0 ? foldBar('wait', '⏳', `자료 대기 ${waitList.length}척`, _waitNames, waitOpen, () => { setWaitOpen(o => { if (!o) reveal(waitRef); return !o; }); }) : null;
  const polBar = foldBar('policy', '🔒', '선박 실 정책', `${Object.keys({ ...DEFAULT_SHIP_POLICIES, ...shipPols }).length}척 등록 · 탭하면 수정`, polOpen, () => { setPolOpen(o => { if (!o) reveal(polRef); return !o; }); });
  const listBody = (
    <>
      {list.length === 0 && waitList.length === 0 && (
        <div className="bg-ink-900 border border-line rounded-btn p-10 text-center">
          <div className="text-dim-400 text-sm mb-2">진행 중인 항차가 없습니다</div>
          <div className="text-xs text-dim-500">위 [＋ 새 항차] 버튼으로 새 항차를 만드세요</div>
        </div>
      )}
      {groups.map((g) => (
        <React.Fragment key={g.id}>
          {grpHead(g.id, `${g.ico} ${g.label} ${g.rows.length}`)}
          {g.rows.map(rowOf)}
        </React.Fragment>
      ))}
      {/* ── 2.09: 나머지 배(foldList) — 폰은 접힘 한 줄(컴은 위 날짜 묶음 안에 이미 섰다 — 4.25 2차). ⚠ 줄은 언마운트하지 않는다(hidden) — 출항 배지 sticky 기록(departBadgeAt)이 줄 안에서 쓰인다(콘앱 출항 표시). ── */}
      {!wide && foldList.length > 0 && foldBar('other', '🗓', `${otherLabel} ${foldList.length}척`, foldList.map((v) => v.info?.vsl || v.key).join(' · '), foldOpen, () => setFoldOpen(o => !o))}
      {!wide && foldList.length > 0 && <div className={foldOpen ? 'space-y-1.5' : 'hidden'} data-home-other="1">{foldList.map(rowOf)}</div>}
      {/* ── 4.01: 자료 대기 — 자료가 하나도 없는 배는 목록에서 빼고 한 줄로 접어 둔다(위 list 주석). 펼치면 그 배 줄. 폰은 접힘 줄 바로 아래, 컴은 목록 끝(접힘 줄은 칸 맨 아래에 붙어 있다). ── */}
      {!wide && waitBar}
      {waitList.length > 0 && (
        //  ⚠ 언마운트하지 않는다 — departBadgeAt sticky 기록(콘앱 출항 표시)이 줄 안에서 쓰인다.
        <div ref={waitRef} className={waitOpen ? 'space-y-1.5' : 'hidden'} data-home-wait="1">
          {wide && grpHead('wait', `⏳ 자료 대기 ${waitList.length}`)}
          {waitList.map(rowOf)}
        </div>
      )}
      {/* ── 1.83: 선박 실 정책 판 — 조합(LOLO+실확인)이 한눈에. 탭하면 수정 모드. ── */}
      {!wide && polBar}
      {polOpen && (() => {
        const all = { ...DEFAULT_SHIP_POLICIES, ...shipPols };
        const groups = {};
        Object.entries(all).forEach(([k, pol]) => {
          const lbl = policyComboLabel(pol) || '일반';
          (groups[lbl] = groups[lbl] || []).push({ k, pol });
        });
        const order = ['일반', '엠티실 확인', '엠티실 부착', 'LOLO', 'LOLO+엠티실 확인', 'LOLO+엠티실 부착'];
        const keys = [...order.filter(o => groups[o]), ...Object.keys(groups).filter(g => !order.includes(g))];
        return (
          <div ref={polRef} className="fold-bar px-3 py-2.5 space-y-1.5" data-home-policy="1">
            {wide && <div className="text-sm2 font-black text-dim-200">🔒 선박 실 정책</div>}
            {keys.map(g => (
              <div key={g} className="flex items-start gap-2 text-sm">
                <span className={`flex-none px-1.5 py-0.5 rounded font-bold ${g === '일반' ? 'bg-ink-800 text-dim-300'
                  : g.startsWith('LOLO') ? 'bg-purple-900/60 text-purple-200' : 'bg-cyan-900/50 text-cyan-200'}`}>{g}</span>
                <span className="flex flex-wrap gap-1">
                  {groups[g].map(({ k, pol }) => (
                    <button key={k} onClick={() => setPolEdit({ vsl: pol.name || k, policy: pol })}
                      className="px-2 py-0.5 rounded bg-ink-800/80 hover:bg-ink-750 text-dim-100">
                      {pol.code || pol.name || k}
                    </button>
                  ))}
                </span>
              </div>
            ))}
            <div className="text-xs text-dim-500">신규 선박은 선적 화면을 처음 열 때 한 번만 묻습니다.</div>
          </div>
        );
      })()}
    </>
  );

  return (
    <div className={`home-stage px-3 ${wide ? 'pt-2' : 'pt-2 pb-4'}`} data-home-root="1" data-home-layout={wide ? 'pc' : 'phone'}>
      {/* V9.15 브랜드 배지 삭제 · V9.42 상단 3카드 삭제 · 3.54 «검색창을 없애고 미르로 대체» — 질문은 떠 있는 미르가 같은 답 엔진으로 받는다. */}
      {wide ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2" data-home-strip="pc">
          {collectorBtn}
          <span className="w-px h-4 bg-line-strong shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap text-sm2 font-bold text-dim-300 px-1" data-home-chip="count"
            title={`자료 있는 항차 ${list.length} · 자료 대기 ${waitList.length}`}>
            🚢 항차 {list.length + waitList.length} · <b className="text-dim-100">작업 중 {_workN}</b>
          </span>
          {fbChip}
          {meChip}
          <span className="flex-1" />
          {pierMenu}
          {newMenu}
          {refreshBtn}
          {chiefBtn}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-1.5" data-home-strip="phone">
            {collectorBtn}
            {fbChip}
            {meChip}
            <span className="flex-1" />
            {chiefBtn}
          </div>
          <div className={`grid ${newMenu ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'} gap-2 pb-2 items-stretch`} data-home-ctrl="1">
            {pierMenu}
            {newMenu}
            {refreshBtn}
          </div>
        </>
      )}
      {meLine}
      {/* 펼친 메뉴 밖을 누르면 닫힌다 */}
      {topMenu && <div className="fixed inset-0 z-20" onClick={() => setTopMenu('')} />}

      {wide ? (
        <div ref={panesRef} className="grid grid-cols-[minmax(380px,38%)_minmax(0,1fr)] gap-3" style={{ height: paneH ? paneH + 'px' : 'calc(100vh - 7rem)' }} data-home-panes="1">
          <div className="min-h-0 flex flex-col gap-1.5" data-home-list="1">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'thin' }} data-home-scroll="1">{listBody}</div>
            {waitBar}
            {polBar}
          </div>
          <div key={curKey || 'none'} className="min-h-0 overflow-y-auto pb-32" style={{ scrollbarWidth: 'thin' }} data-home-detail="1">
            {curV ? detailOf(curV, true) : <div className="text-sm text-dim-400 text-center py-16">배를 고르면 여기에 자세히 나옵니다</div>}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5" data-home-list="1">{listBody}</div>
      )}

      {/* 폰 — 줄을 누르면 그 배만 전체화면(컴 오른쪽 상세와 같은 내용). [‹ 목록] 으로 닫는다. 4.24 수석 상황판 폰 시트와 같은 그릇(z-45 · 창은 그 위 z-50). */}
      {sheetV && (
        <div className="fixed inset-0 z-[45] bg-ink-950 overflow-y-auto" role="dialog" aria-label={`${sheetV.info.vsl} 전체화면`} data-home-sheet={sheetV.key}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-ink-950 border-b border-line">
            <button type="button" onClick={() => setSheetKey('')} className="chip-v2 shrink-0 !h-[var(--tap)]" data-home-sheet-close="1">‹ 목록</button>
            <span className="flex-1" />
            <ShipOpenButtons voyage={sheetV} onOpen={(m) => onOpenVoyage(sheetV.key, m)} />
          </div>
          {/* 아래 여백 pb-36(144px) — 떠 있는 미르 얼굴(바닥에서 76~124px · 오른쪽)이 끝까지 내린 마지막 줄(🗑 삭제 · 조회만이면 자료 대수 줄)을 덮지 않게(4.25 2차 · 모의 확인 ②) */}
          <div className="px-3 pt-3 pb-36" data-home-sheet-body="1">{detailOf(sheetV, false)}</div>
        </div>
      )}

      {polEdit && (
        <ShipPolicyModal open vsl={polEdit.vsl} code={polEdit.policy?.code || ''} inspector={inspector}
          initial={polEdit.policy} onSaved={() => setPolEdit(null)} onClose={() => setPolEdit(null)} />
      )}

      {/* TallyOne 1.0 (K5): 맛집 수첩 개별 버튼 제거 — 보조기능(#/aux) 안으로 통합 */}

      {showCreate && (
        <CreateVoyageModal
          mode={showCreate}
          vsl={vsl}
          voy={voy}
          setVsl={setVsl}
          setVoy={setVoy}
          onClose={() => { setShowCreate(null); setVsl(''); setVoy(''); }}
          onCreate={handleCreate}
        />
      )}

      {/* V9.02: 카톡 물량 예보 붙여넣기 모달 — EDI 도착 전 규격별 개수 선등록 (사용자 확정 2026-07-17) */}
      {showForecast && (() => {
        const fc = fcText.trim() ? parseCargoForecast(fcText) : null;
        const vv = fc && fc.voy ? fc.voy.toUpperCase() : '';
        // V9.57: 항차 매칭에 voyCore 비교 적용 — 0패딩·방향 표기 차이(0529W vs 529W)로 예보가
        //   등록 항차를 못 찾던 문제. 정확 일치 → 핵심번호 일치 순으로 본다.
        // 1.43: 항차번호가 없는 예보(연태훼리 등)는 **담당자로 추정한 선박 + 그 날짜**로 찾는다.
        //   검수사 지적: "판단할 근거가 있습니다. 일자와 담당자입니다."
        //   순서 — ① 항차번호 정확·핵심 일치 ② 선박코드 일치 ③ 선박코드 + planDate 날짜 일치.
        //   ③은 같은 배가 여러 항차로 떠 있을 때 그날 것을 고르기 위한 것이다.
        const match = fc ? (voyagesWithPier.find(v =>
          vv && [v.info.voy, v.info.voy_d, v.info.voy_l].some(x => x && _voyCore(x) === _voyCore(vv)))
          || (fc.vsl ? (
               // 같은 배가 둘 이상이면 예보 일자와 작업일이 같은 것을 먼저 본다
               (fc.date ? voyagesWithPier.find(v =>
                 (v.info.vsl || '').toUpperCase().replace(/\s+/g, '').startsWith(fc.vsl)
                 && String(v.info.planDate || '').startsWith(fc.date)) : null)
               || voyagesWithPier.find(v => (v.info.vsl || '').toUpperCase().replace(/\s+/g, '').startsWith(fc.vsl))
             ) : null)) : null;
        const fmt = (o) => Object.entries(o || {}).map(([s, n]) => `${s}×${n}`).join('  ');
        const totalTeu = fc ? (fc.teu ? fc.teu.total : fc.calc.full + fc.calc.empty + fc.calc.luggage) : 0;
        const save = async () => {
          if (!fc || !match) return;
          // ── TallyOne 1.42: **예보가 자기 칸을 알아서 만든다** (검수사 확정 2026-08-10) ──
          //   검수사 신고: *"선적자료인데 맨밑에 보여주는곳은 양하 항차에 저장이라고 되어 있습니다."*
          //   저장 위치는 틀리지 않았다(이 앱은 항차 키 하나에 양하·선적 섹션이 같이 산다).
          //   진짜 문제는 **그 항차에 선적칸(voy_l)이 없었던 것**이고, 그래서 이런 일이 줄줄이 났다.
          //     voy_l 없음 → loading 섹션 없음 → 선적 탭 안 뜸 → 자료 넣을 곳이 없다(검수사 신고)
          //   직전 항차 R084E 에는 voy_l=R084W 가 있었다. 이번 R085E 만 손으로 만들며 빠졌다 —
          //   같은 날 아침에 고친 planDate 결측과 **같은 뿌리**(수동 생성 시 칸이 안 채워진다).
          //   ⛔ 값이 있는 칸은 덮지 않는다. 비어 있을 때만 원문 항차번호로 채운다.
          const _isL = (fc.mode || 'loading') === 'loading';
          const _slot = _isL ? 'voy_l' : 'voy_d';
          const _sec = _isL ? 'loading' : 'discharge';
          const _patch = {};
          if (fc.voy && !match.info[_slot]) _patch[_slot] = fc.voy;
          // ⚠ 1.43-01: **섹션 생성은 칸 채우기와 독립이다.**
          //   1.42 는 섹션 생성을 `칸이 비었을 때` 조건 **안에** 두었다. 그래서 OBWH 2709E 처럼
          //   `voy_l=2710W` 는 있는데 loading 섹션이 없는 항차에서 통째로 건너뛰었다 —
          //   예보는 저장됐는데 **선적 탭이 안 생겼다**(검수사 신고 2026-08-10).
          //   → 이 모드의 항차번호가 정해져 있으면(원래 있었든 방금 넣었든) 섹션이 없을 때 만든다.
          const _slotVoy = match.info[_slot] || _patch[_slot];
          if (_slotVoy && !match[_sec]) {
            try { await fbSaveSectionData(match.key, _sec, { _created: Date.now() }); }
            catch (e) { console.error('[예보] 섹션 생성 실패', match.key, _sec, e); }
          }
          await fbUpdateVoyageInfo(match.key, { ..._patch, forecast: {
            voy: fc.voy, mode: fc.mode || 'loading', full: fc.full, empty: fc.empty, luggage: fc.luggage,
            teu: fc.teu || null, calc: fc.calc, vans: fc.vans, summary: fc.summary || '',
            // V9.03: 긴급/수화물 컨번호 — 리스트·카고플랜 마커는 렌더 시점에 이 목록으로 주입
            //   (EDI가 예보보다 늦게 와도, EDI가 갱신돼도 마커 유지 — 연태훼리 CLL 메일)
            urgentCns: fc.urgentCns || [], luggageCns: fc.luggageCns || [], luggageSeals: fc.luggageSeals || {},
            ...(fc.lolo ? { lolo: fc.lolo } : {}),   // 4.30: 크레인(LO LO) 대수 — 덱플랜 자동 입력이 쓴다(개수 집계와 별개)
            // 1.42: 카톡으로 온 **그림**(덱 그림 등). 검수사 확정 — "덱플랜파일이 아니라 그림을 올리는것입니다."
            //   1600px JPEG 로 줄여 담는다(사진 보고와 같은 축소기). 없으면 기존 그림을 지우지 않는다.
            ...(fcImage ? { image: fcImage, imageAt: Date.now() } : {}),
            raw: fcText, at: Date.now(), by: inspector || '',
          } });
          setShowForecast(false); setFcText(''); setFcImage('');
        };
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForecast(false)}>
            <div className="bg-ink-900 border-2 border-orange-700 rounded-btn p-4 w-full max-w-lg space-y-2.5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
              onPaste={async (e) => {
                // 1.42: 카톡에서 그림을 복사해 바로 붙여넣는 길. 글자 붙여넣기는 그대로 통과시킨다.
                const items = e.clipboardData && e.clipboardData.items;
                if (!items) return;
                for (const it of items) {
                  if (it.type && it.type.startsWith('image/')) {
                    const f0 = it.getAsFile();
                    if (!f0) continue;
                    e.preventDefault();
                    const b64 = await shrinkToBase64(f0);
                    if (b64) setFcImage(b64); else alert('그림을 읽지 못했습니다.');
                    return;
                  }
                }
              }}>
              <div className="font-bold text-orange-300">📋 물량 예보 붙여넣기 <span className="text-xxs font-normal text-dim-400">카톡 원문 그대로 — EDI 오면 자동 대체</span></div>
              <textarea autoFocus value={fcText} onChange={e => setFcText(e.target.value)} rows={8}
                placeholder={'카톡 물량 예보를 그대로 붙여넣으세요\n(RZOR: *FULL / 20D X 9 …  ·  OBWH: FULL 20GPX19 + 40HQX33 …)'}
                className="w-full bg-ink-800 border border-line rounded-pill p-2 text-xs2 text-dim-100 font-mono"/>
              {/* 1.42: 카톡 그림 첨부 — 검수사 확정 "덱플랜파일이 아니라 그림을 올리는것입니다."
                  ⚠ 파일 선택뿐 아니라 **붙여넣기(Ctrl+V)** 도 받는다 — 카톡에서 그림 복사가 제일 빠르다. */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-2.5 py-1.5 rounded-pill bg-ink-800 border border-line text-xxs font-bold text-dim-200 cursor-pointer hover:border-orange-600">
                  🖼 그림 넣기
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const f0 = e.target.files && e.target.files[0];
                      e.target.value = '';
                      if (!f0) return;
                      const b64 = await shrinkToBase64(f0);
                      if (b64) setFcImage(b64); else alert('그림을 읽지 못했습니다.');
                    }}/>
                </label>
                <span className="text-2xs text-dim-400">덱 그림·물량표 사진 — 여기 붙여넣기(Ctrl+V)도 됩니다</span>
                {fcImage && (
                  <button onClick={() => setFcImage('')}
                    className="ml-auto px-2 py-1 rounded bg-ink-800 text-dim-300 text-2xs font-bold">그림 빼기</button>
                )}
              </div>
              {fcImage && (
                <img src={fcImage} alt="예보 그림"
                  className="w-full rounded-pill border border-line max-h-52 object-contain bg-ink-950"/>
              )}
              {fc && (
                <div className="bg-ink-800/70 border border-line rounded-pill p-2.5 space-y-1 text-xs2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-dim-100">{fc.vsl || (match ? match.info.vsl : '')} {fc.voy || '항차 미인식'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-2xs font-bold ${fc.mode === 'loading' ? 'bg-amber-900/70 text-amber-200' : fc.mode === 'discharge' ? 'bg-blue-900/70 text-blue-200' : 'bg-ink-750 text-dim-200'}`}>
                      {fc.mode === 'loading' ? '선적' : fc.mode === 'discharge' ? '양하' : '모드 미상'}
                    </span>
                    {/* 1.43: 원문에 없어서 **추정한** 것은 반드시 티를 낸다 — 검수사가 눈으로 확인해야 한다. */}
                    {(fc.guessedVsl || fc.guessedMode) && (
                      <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-purple-900/70 text-purple-200"
                        title={`원문에 없어 추정했습니다 — ${[fc.guessedVsl && '선박(담당자 이름)', fc.guessedMode && '양하/선적(본문 낱말)'].filter(Boolean).join(' · ')}. 틀리면 저장하지 마세요.`}>
                        🔍 추정 {[fc.guessedVsl && '선박', fc.guessedMode && '모드'].filter(Boolean).join('·')}
                      </span>
                    )}
                    {fc.date && <span className="text-2xs text-dim-400">{fc.date}</span>}
                    <span className="font-bold text-orange-300">{totalTeu}TEU</span>
                    {fc.teu && (fc.teuOk
                      ? <span className="text-emerald-400 text-2xs font-bold">✓ TEU 검산 일치</span>
                      : <span className="text-rose-400 text-2xs font-bold">⚠ TEU 검산 불일치 (원문 확인)</span>)}
                  </div>
                  {Object.keys(fc.full).length > 0 && <div><span className="text-emerald-300 font-bold">FULL</span> <span className="text-dim-100">{fmt(fc.full)}</span> <span className="text-dim-400">({fc.vans.full}대 {fc.calc.full}TEU)</span></div>}
                  {Object.keys(fc.empty).length > 0 && <div><span className="text-sky-300 font-bold">EMPTY</span> <span className="text-dim-200">{fmt(fc.empty)}</span> <span className="text-dim-400">({fc.vans.empty}대 {fc.calc.empty}TEU)</span></div>}
                  {Object.keys(fc.luggage).length > 0 && <div><span className="text-violet-300 font-bold">수화물</span> <span className="text-dim-200">{fmt(fc.luggage)}</span></div>}
                  {/* V9.03: 긴급/수화물 컨번호 미리보기 — 저장 시 리스트·카고플랜에 마커로 표시 */}
                  {fc.urgentCns && fc.urgentCns.length > 0 && (
                    <div><span className="text-rose-300 font-bold">▲ 긴급 {fc.urgentCns.length}대</span>{' '}
                      <span className="text-dim-300 mono text-2xs break-all">{fc.urgentCns.join(' ')}</span></div>
                  )}
                  {fc.luggageCns && fc.luggageCns.length > 0 && (
                    <div><span className="text-violet-300 font-bold">🧳 수화물 컨 {fc.luggageCns.length}대</span>{' '}
                      <span className="text-dim-300 mono text-2xs break-all">
                        {fc.luggageCns.map(cn => fc.luggageSeals && fc.luggageSeals[cn] ? `${cn}(실 ${fc.luggageSeals[cn]})` : cn).join(' ')}
                      </span></div>
                  )}
                  {fc.summary && <div className="text-2xs text-dim-400">요약 원문: {fc.summary}</div>}
                  <div className={`text-xxs font-bold ${match ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {/* 1.42: 라벨을 정확히 — 종전엔 voy_d 만 찍어 "선적 예보인데 양하 항차에 저장"으로 보였다.
                        실제로는 그 항차의 **선적 칸**에 들어간다. 칸이 없으면 만든다는 것도 함께 알린다. */}
                    {match ? (() => {
                      const isL = (fc.mode || 'loading') === 'loading';
                      const slotVoy = isL ? match.info.voy_l : match.info.voy_d;
                      const label = isL ? '선적' : '양하';
                      return slotVoy
                        ? `→ ${match.info.vsl} ${slotVoy} ${label}칸에 저장`
                        : `→ ${match.info.vsl} 항차에 ${label}칸(${fc.voy || '항차번호 미인식'})을 만들고 저장합니다`;
                    })() : '연결할 항차를 못 찾음 — 수집기 등록 후 다시 시도하거나 항차를 먼저 만드세요'}
                  </div>
                </div>
              )}
              {/* V9.15: 버튼 순서 통일 — 이 모달만 [저장][취소] 역순이라 근육기억 오작동(전면 점검 1-6) */}
              <div className="flex gap-2">
                <button onClick={() => setShowForecast(false)} className="px-4 rounded-pill bg-ink-800 text-dim-300 text-sm" style={{ minHeight: 44 }}>취소</button>
                <button onClick={save} disabled={!fc || !match}
                  style={{ minHeight: 44 }}
                  className={`flex-1 py-2.5 rounded-pill text-sm font-bold ${fc && match ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-ink-800 text-dim-500'}`}>
                  예보 저장
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 항차 삭제 모달 (폰 친화) */}
      {deleteTarget && (
        <DeleteVoyageModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={performDeleteSafe}
        />
      )}

      {/* 완료 확인 모달 — 평택분 작업량 저장 후 삭제 */}
      {completeTarget && (() => {
        const v = voyages[completeTarget.key];
        // 항차 리스트와 동일 기준: 평택분(PTK)만 (타지역 제외)
        const dCnt = computeStats(v?.discharge, 'discharge', undefined, undefined, v ? shiftCnSetOf(completeTarget.key, v) : undefined, v?.keepOnboard).ptk;   // 4.53: 선적 EDI 가 확정한 본선 잔류는 평택분에서 뺌(예정은 자료대로 — 4.48-03)
        const lCnt = computeStats(v?.loading, 'loading').ptk;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setCompleteTarget(null)}>
            <div className="bg-ink-900 border border-emerald-700/50 rounded-btn p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400"/>
                <h3 className="text-lg font-bold text-dim-100">{completeTarget.mode === 'discharge' ? '⬇ 양하 완료' : '⬆ 선적 완료'}</h3>
              </div>
              <p className="text-sm text-dim-200 mb-1">{completeTarget.vsl} {completeTarget.voy}</p>
              <p className="text-sm text-dim-300 mb-3">이 항차의 <b className="text-emerald-300">{completeTarget.mode === 'discharge' ? '양하 작업' : '선적 작업'}</b>을 완료로 표시합니다 (완료 시각 기록). 자료는 삭제되지 않으며, 모든 작업이 완료되면 수석검수사가 최종 확인합니다.</p>
              <div className="bg-ink-800/60 rounded-pill p-3 mb-4 text-sm">
                {completeTarget.mode === 'discharge'
                  ? <div className="flex justify-between"><span className="text-blue-300">양하</span><span className="font-bold text-dim-100">{dCnt}대</span></div>
                  : <div className="flex justify-between"><span className="text-amber-300">선적</span><span className="font-bold text-dim-100">{lCnt}대</span></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCompleteTarget(null)} className="flex-1 py-2.5 rounded-pill bg-ink-750 hover:bg-ink-700 text-dim-100 font-bold text-sm">취소</button>
                <button onClick={performComplete} className="flex-1 py-2.5 rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm">{completeTarget.mode === 'discharge' ? '양하 완료 표시' : '선적 완료 표시'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* V9.57: PORT-MIS 캡처 모달 마운트 제거 — 여는 경로가 없는 고아 코드(ChiefDashboard에 이관됨) */}
      <ScrollTopButton />   {/* 2.82-02: 스크롤이 긴 화면엔 TOP (검수사 지시 2026-08-29) */}
    </div>
  );
}

// M3.5: 항차 삭제 모달 - 큰 버튼, 폰 친화
function DeleteVoyageModal({ target, onClose, onConfirm }) {
  const { vsl, voy, hasD, hasL, doneD = 0, doneL = 0 } = target;
  const [confirming, setConfirming] = useState(null); // 'discharge' | 'loading' | 'all'

  // 둘 다 비어있으면 → 항차 전체 삭제만
  // 하나만 있으면 → 항차 전체 삭제
  // 둘 다 있으면 → 3택
  const showSplit = hasD && hasL;

  if (confirming) {
    // M3.74: 색깔 표준 통일 - 양하=blue, 선적=amber (VoyagePage와 일치)
    const labels = {
      discharge: { title: '양하 데이터 삭제', desc: '선적 데이터는 유지됩니다.', color: 'blue' },
      loading: { title: '선적 데이터 삭제', desc: '양하 데이터는 유지됩니다.', color: 'amber' },
      all: { title: '항차 전체 삭제', desc: '양하/선적/검수 데이터가 모두 삭제됩니다. 앱에서는 되돌릴 수 없습니다.', color: 'red' },
    };
    const L = labels[confirming];
    //  3.60-09 (진단 T11): 지울 쪽에 완료 기록이 있으면 먼저 말한다 — 삭제는 보관소를 안 거쳐 되돌릴 수 없다.
    const doneN = confirming === 'discharge' ? doneD : confirming === 'loading' ? doneL : doneD + doneL;
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4">
        <div className="bg-ink-900 border-2 border-red-700/50 rounded-card w-full sm:max-w-md overflow-hidden">
          <div className="p-4 border-b border-line bg-red-950/40">
            <div className="text-base font-black text-red-200">⚠️ {L.title}</div>
            <div className="text-xs text-dim-300 mt-1">{vsl} {voy}</div>
          </div>
          <div className="p-4">
            <div className="text-sm text-dim-100 mb-4">{L.desc}</div>
            {doneN > 0 && (
              <div className="text-xs text-red-200 bg-red-950/50 border border-red-700/50 rounded p-2 mb-3 leading-relaxed" data-delete-done-warn="1">
                ⚠ 완료 기록 {doneN}대가 있습니다. 작업이 끝난 항차면 삭제가 아니라 카드의 «양하 완료·선적 완료»로 처리해야 보관소에 남습니다. 삭제하면 완료 기록까지 되돌릴 수 없습니다.
              </div>
            )}
            <div className="text-xs text-dim-300">정말 진행하시겠습니까?</div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 border-t border-line bg-ink-950">
            <button onClick={() => setConfirming(null)}
              className="py-3 bg-ink-750 hover:bg-ink-700 text-dim-100 font-bold rounded"
              style={{ minHeight: 48 }}>
              ← 뒤로
            </button>
            <button onClick={() => onConfirm(confirming)}
              className="py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded"
              style={{ minHeight: 48 }}>
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-ink-900 border-2 border-line rounded-card w-full sm:max-w-md overflow-hidden">
        <div className="p-4 border-b border-line">
          <div className="text-base font-black text-dim-100">항차 삭제</div>
          <div className="text-xs text-dim-300 mt-1">{vsl} {voy}</div>
        </div>
        <div className="p-3 space-y-2">
          {showSplit && (
            <>
              {/* M3.74: 색깔 통일 - 양하=blue (VoyagePage 모드 탭과 일치) */}
              <button onClick={() => setConfirming('discharge')}
                className="w-full py-4 bg-blue-900/30 hover:bg-blue-900/50 border-2 border-blue-700/40 rounded-pill text-left px-4"
                style={{ minHeight: 56 }}>
                <div className="text-base font-bold text-blue-300">⬇️ 양하만 삭제</div>
                <div className="text-xs text-blue-400/70 mt-0.5">선적은 유지됩니다</div>
              </button>
              {/* M3.74: 색깔 통일 - 선적=amber */}
              <button onClick={() => setConfirming('loading')}
                className="w-full py-4 bg-amber-900/30 hover:bg-amber-900/50 border-2 border-amber-700/40 rounded-pill text-left px-4"
                style={{ minHeight: 56 }}>
                <div className="text-base font-bold text-amber-300">⬆️ 선적만 삭제</div>
                <div className="text-xs text-amber-400/70 mt-0.5">양하는 유지됩니다</div>
              </button>
            </>
          )}
          <button onClick={() => setConfirming('all')}
            className="w-full py-4 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-700/40 rounded-pill text-left px-4">
            <div className="text-base font-bold text-red-300">🗑 항차 전체 삭제</div>
            <div className="text-xs text-red-400/70 mt-0.5">
              {showSplit ? '양하 + 선적 + 정보 모두 삭제' : '모든 데이터 삭제'}
            </div>
          </button>
        </div>
        <div className="p-3 border-t border-line">
          <button onClick={onClose}
            className="w-full py-3 bg-ink-800 hover:bg-ink-750 text-dim-200 font-bold rounded">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ★ 4.25 배 한 척의 재료 한 벌 — 줄(ShipRow)·상세(ShipDetail)·시트가 이것 하나를 부른다(종전 VoyageCard 본문의 계산을 그대로 옮겼다). ──
//   막대·대수 = computeStats(평택분 · progressOf 한 벌) · 터미널 본선 = termAggOf 한 벌 · 출항 배지 = badgeRule.decideBadge 한 벌.
//  ★ 4.54 — 터미널 배정 수량과 맞대는 «앱 수» 한 벌(SideBox 와 shipViewOf 가 같은 수를 쓴다) · 빈 FR 묶음이 그 차이를 얼마나 설명하는가.
//    검수사 2026-10-26 19:17 «검수리스트는 182개가 맞는거고 동방은 176(+6)으로 표기하고 FR묶음 설명을 붙이면 됩니다»(282·276 의 오타로 읽음) — 앱 수(282)는 낱개 그대로, 터미널 쪽에 «(+6)» 을 붙인다.
export function planCompareAppOf(stats) {
  return stats.planOnly ? stats.planSlots
    : (stats.forecastEdi || stats.listOnly || stats.partialEdi || stats.luggage > 0) ? stats.recCount
    : stats.ptk;
}
export function frBundleOf(voyage, mode, stats) {
  if (!stats || !(stats.planQty > 0)) return null;
  const gap = (Number(planCompareAppOf(stats)) || 0) - stats.planQty;
  if (!(gap > 0)) return null;   // 앱이 많을 때만 — 터미널이 묶음을 1대로 센 만큼
  const b = frBundlesOf(voyage, mode);
  if (!b.length) return null;
  const diff = b.reduce((a, x) => a + x.n - 1, 0);
  const explained = bundleExplainOf(b, gap);   // sourceRecon 과 같은 산식 한 벌 — 묶음으로 맞아떨어지는 차이만
  if (!(explained > 0)) return null;
  return { bundles: b.length, cns: b.reduce((a, x) => a + x.n, 0), diff, explained, ns: [...new Set(b.map((x) => x.n))] };
}
export function shipViewOf(voyage, pilotForecast = {}) {
  const dis = voyage.discharge;
  const loa = voyage.loading;

  const _shiftSet = shiftCnSetOf(voyage.key, voyage);   // 2.89-06: 평택 축에서 뺄 시프팅 컨
  const disStats = computeStats(dis, 'discharge', voyage.info, voyage.key, _shiftSet, voyage.keepOnboard);   // 4.48 감사(상 1): 선사 지시 본선 잔류를 평택 양하분에서 뺀다
  const loaStats = computeStats(loa, 'loading', voyage.info, voyage.key, _shiftSet);   // V9.03: info.emptyConfirmed(엠티 확정) 표시용
  // 1.82(검수사 요청 2026-08-17): *"항차목록에 터미널과 수집량을 비교할 수 있도록"*
  //   수집기 1.6 이 PCTC·PNCT 배정목록에서 HTTP 로 직접 받아 info.planDis/planLod 에 실어 온다
  //   (1.6 전에는 PCTC 만 왔다 — 이제 양쪽 다 온다). 앱이 모은 수와 나란히 놓아 눈으로 대조한다.
  //   ⚠ 이 값은 **대조용 참고치**다 — 카운트 기준으로 쓰지 않는다(예정 수량이 섞인다, 수집기 v2.17.26 교훈).
  disStats.planQty = voyage.info?.planDis != null ? Number(voyage.info.planDis) : null;
  loaStats.planQty = voyage.info?.planLod != null ? Number(voyage.info.planLod) : null;
  disStats.frBundle = frBundleOf(voyage, 'discharge', disStats);   // 4.54: «배정 276(+6)» — 빈 FR 묶음 설명(앱이 터미널보다 많을 때만 · 없으면 null)
  loaStats.frBundle = frBundleOf(voyage, 'loading', loaStats);
  // V8.98-03: 쉬프팅(재적부) 개수 — 양하·선적 공통(같은 기항의 재적부 컨). 캐시라 스냅샷 틱에도 가벼움.
  const _shiftMap = computeShiftingMapCached(voyage.key, voyage) || {};
  const shiftCount = Object.keys(_shiftMap).length;
  if (shiftCount > 0) {
    disStats.shiftCount = shiftCount; loaStats.shiftCount = shiftCount;
    //  4.13: 항차 목록 카드에도 상태(미확정·확정·불일치) — «시프팅 5건»이 확정인지 모르는 채로 보이지 않게(검수사 2026-10-09). EDI 는 다시 파싱하지 않는다(light).
    try { const _se = shiftEvidenceOf(voyage.key, voyage, _shiftMap, { light: true }); disStats.shiftState = _se.label || ''; loaStats.shiftState = _se.label || ''; } catch (e) { console.warn('[4.13] 시프팅 상태 판정 실패 — 카드에 상태를 안 적습니다:', e); }
    // 1.78-01(인계함 2026-08-16): 모브 수를 «×2 고정»이 아니라 **실제 완료로** 센다.
    //  2.89-07 (검수사 «양하는 양하 선적은 선적이지») — 모브를 모드별로 가른다.
    //    양하 줄 = 내림(시프팅∩양하완료)만, 선적 줄 = 실음(시프팅∩선적완료)만.
    const _dc = voyage.discharge?.completed || {}, _lc = voyage.loading?.completed || {};
    let _mvIn = 0, _mvOut = 0;
    for (const _cn of Object.keys(_shiftMap)) { if (_dc[_cn]) _mvIn += 1; if (_lc[_cn]) _mvOut += 1; }
    disStats.shiftMoves = _mvIn; disStats.shiftMoveLabel = '내림';
    loaStats.shiftMoves = _mvOut; loaStats.shiftMoveLabel = '실음';
  }

  // M5.82: 부두 정보 (voyage._pier가 HomePage에서 채워짐)
  const pier = voyage._pier || '';
  const berth = voyage._berth || '';

  // V9.57: ±12h 창 검사 인라인 2벌 → badgeRule.inWindow(WINDOW_H) 한 곳으로 단일화.
  const pfDep = (() => {
    // V9.36-01: 도선 nextDep에도 같은 작업창 가드 — 도선 예보는 '다음 출항'으로 계속 갱신되므로
    //   이 항차 출항이 예보에서 빠지면 다음 기항 출항이 이번 카드에 붙는다.
    const r = pilotForecast[(voyage.info?.vsl || '').toUpperCase()];
    const t = r ? parsePortMisDateTime(r.nextDep) : null;
    return (t != null && inWindow(t, voyage._etaMs, voyage._etdMs)) ? t : null;
  })();
  //  3.53-13 (검수사 «출항 시간은 포트미스 도선협회 두곳자료로 사용합니다») — 도선 예보가 없으면 PORT-MIS 신고 출항. 같은 작업창(±12h) 가드.
  const pmDep = (() => { const t = voyage._pm && voyage._pm.etd ? parsePortMisDateTime(voyage._pm.etd) : null; return (t != null && inWindow(t, voyage._etaMs, voyage._etdMs)) ? t : null; })();
  // V9.38: 판정은 badgeRule.decideBadge 한 곳에서. 잔여의 출처는 **검수앱 자신**(총−완료).
  const _hasLoad = !!(voyage.loading && (loaStats.total > 0 || loaStats.ptk > 0 || loaStats.workTotal > 0));
  const _rem = (st) => (st.total > 0 ? Math.max(0, st.total - st.done) : null);
  //  ★ 4.16: 출항 배지는 **작업량**(평택분 + 이 모드 시프팅 모브)이 남았는지로 판정한다 — 종전 값 그대로. 막대·«남음» 은 평택분(§7.8-①).
  const _remW = (st) => (st.workTotal > 0 ? Math.max(0, st.workTotal - st.workDone) : null);
  //  2.67-02: 캔슬된 쪽은 «남음» 도 없다 — 남은 일이 아니라 없는 일이다.
  const remD = sideCancelled(voyage.info, 'discharge') ? null : _rem(disStats);
  const remL = sideCancelled(voyage.info, 'loading') ? null : _rem(loaStats);
  //  ★ 4.05 (검수사 2026-10-05 «앱 항차목록은 작업중인지도 모르는 화면» · «1개 단위로 맞추긴 힘들지만 어느정도는 맞아야») —
  //    ① 터미널이 작업 중으로 알리면(isWorkingNow — 작업시작일시를 지난 것만) «본선 작업중».
  //    ② 터미널 호기 합계(termBoardOf)의 완료·잔여를 참고 숫자로 곁들인다. 완료 기록·남음 계산은 그대로.
  //    4.25: 같은 숫자를 한 번만 — 상세 칸 아래 «본선 n/전체» 한 자리(종전 청록 막대·글줄·오른쪽 패널 «본선 잔여» 는 그 한 자리로 모았다 · 설계 ⑥).
  const _termWorking = isWorkingNow(voyage);
  const _tp = termAggOf(voyage.info);
  const _tpOf = (side) => (_tp && _tp[side] && (_tp[side].done + _tp[side].rest) > 0 ? _tp[side] : null);
  const _tpDis = _tpOf('dis'), _tpLod = _tpOf('lod');
  const departBadge = decideBadge({
    remainLoad: _remW(loaStats), remainDis: _remW(disStats), hasLoad: _hasLoad,
    terminalStatus: voyage.info?.terminalStatus || '',   // 판B(수집기)가 채우면 즉시 동작
    pfDep, pmDep, stickyAt: voyage.info?.departBadgeAt || null,
    eta: voyage._etaMs, etd: voyage._etdMs, src: voyage._etaSrc,
  });
  // ★ 4.01: 오늘 작업하는 배 — 작업일시 배지의 «오늘»과 같은 판정(dayLabel). 이미 끝났으면(출항 지남) 아니다. 줄 테두리만 밝힌다.
  const _isToday = (() => {
    const e = voyage._etaMs, t = voyage._etdMs;
    if (t != null && t < Date.now()) return false;
    return e != null ? (dayLabel(e) === '오늘' || e <= Date.now()) : (t != null && dayLabel(t) === '오늘');
  })();
  return { dis, loa, disStats, loaStats, pier, berth, pfDep, pmDep, remD, remL, _termWorking, _tp, _tpDis, _tpLod, departBadge, _isToday };
}

const _hm2 = (ms) => { const x = new Date(ms); return `${_two(x.getHours())}:${_two(x.getMinutes())}`; };
//  줄 오른쪽 일정 글 — 오늘·내일·어제는 그 말로, 그 밖은 «10/15 08:00»(설계 줄 모양).
const _dayShort = (ms) => { const d = dayLabel(ms); if (d === '오늘' || d === '내일' || d === '어제') return d; const x = new Date(ms); return `${x.getMonth() + 1}/${x.getDate()}`; };
const _agoTxt = (t) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 ${m % 60}분 전` : `${Math.floor(h / 24)}일 전`;
};
const _lastDoneAt = (sec) => { let t = 0; for (const r of Object.values(sec?.completed || {})) { const a = r && typeof r === 'object' ? Number(r.at) || 0 : 0; if (a > t) t = a; } return t; };
//  3.53 목적지 확인 칩을 누르면 그 컨 상세로 — 줄·상세 같은 처리(종전 카드 머리 칩 그대로).
const _podGo = (voyage, cns, onOpen) => { setPodFocus({ voyageKey: voyage.key, mode: 'discharge', cn: cns[0] }); onOpen('discharge'); };
function PodIssueChip({ voyage, cns, onOpen, big = false }) {
  if (!cns || !cns.length) return null;
  //  ★ 3.53 — **선박명 옆 문제 알림.** 검수사 2026-09-16 *«진행상황에서 선박명 옆빈곳에 발생된 문제 알림을 주었으면 합니다. 둘중 한군데를 누르면 상세카드가 나오고 수정 할수 있게»*
  //    ⚠ 줄(`<button>`) 안에도 서므로 `<span role="button">` 으로 둔다(단추 속 단추는 HTML 이 아니다). 세는 자리는 utils 한 벌(`podConflictOf`).
  return (
    <span role="button" tabIndex={0} data-pod-issue={cns.length}
      onClick={(e) => { e.stopPropagation(); _podGo(voyage, cns, onOpen); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); _podGo(voyage, cns, onOpen); } }}
      title="목적지(POD)가 자료마다 다른 컨이 있습니다 — 눌러서 확인·확정"
      className={`${big ? 'text-sm px-2.5 py-1' : 'text-xs px-1.5 py-0'} inline-flex items-center bg-amber-900/70 border border-amber-500 text-amber-100 rounded-pill font-black leading-none whitespace-nowrap active:bg-amber-800`}>
      ⚠ {big ? '목적지 확인 ' : '목적지 '}{cns.length}
    </span>
  );
}

//  줄 안 작은 막대 — 이름표 · 막대 · 완료/전체(상세 큰 숫자와 같은 computeStats 값).
function RowBar({ label, mode, stats }) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const lod = mode === 'loading';
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5" data-row-bar={mode} data-done={stats.done} data-total={stats.total}>
      <span className={`${lod ? 'lbl-lod' : 'lbl-dis'} !border !rounded-md px-1.5 text-xs font-black leading-4`}>{label}</span>
      <span className="xp-bar xp-sm block"><span className={`xp-fill block ${pct >= 100 ? 'xp-done' : lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${pct}%` }}/></span>
      <span className="mono text-xs font-black text-dim-100 whitespace-nowrap">{stats.done}<span className="text-dim-400">/{stats.total}</span></span>
    </span>
  );
}

// ── ★ 4.25 배 줄(설계 «한 줄 = 부두 띠·선박명·항차·선석·막대 둘·상태») — 누르면 컴은 오른쪽 상세, 폰은 전체화면 시트(onSelect). ──
//   V9.57(H6) 출항 배지 «한 번 뜨면 유지»(departBadgeAt) 기록은 이 줄이 한다. 줄은 접힌 묶음 안에서도 언마운트하지 않는다(hidden) — 콘앱(cone.html)이 이 값으로 출항을 표시한다.
export function ShipRow({ voyage, pilotForecast = {}, activeInspectors = [], selected = false, onSelect, onOpen = null, canComplete = false, inspectorDone = false, modeDone = null }) {
  const { dis, loa, disStats, loaStats, pier, berth, departBadge, _termWorking, _isToday } = shipViewOf(voyage, pilotForecast);
  // V9.57(H6): 한 번 뜨면 유지(sticky) 기록 — departBadgeAt이 이미 있으면 발화하지 않고, 실패는 console.warn으로 드러낸다.
  const _isDepart = !!(departBadge && departBadge.kind === 'depart');
  useEffect(() => {
    if (!_isDepart || voyage.info?.departBadgeAt) return;
    try {
      fbUpdateVoyageInfo(voyage.key, { departBadgeAt: Date.now() })
        .catch(e => console.warn('[배지] sticky 저장 실패', voyage.key, e));
    } catch (e) { console.warn('[배지] sticky 저장 실패', voyage.key, e); }
  }, [_isDepart, voyage.key, voyage.info?.departBadgeAt]);
  const voyTxt = voyage.info.voy_d || voyage.info.voy_l || voyage.info.voy || '';
  const sub = [voyTxt, formatBerth(berth) || pier].filter(Boolean).join(' · ');
  //  상태 — 접속 검수원 > (작업자면) 검수 완료 표시 > 본선 작업중 > 일정(출항 배지면 출항 시각)
  const doneTxt = canComplete && (inspectorDone || modeDone?.d || modeDone?.l)
    ? (inspectorDone ? '검수 완료 · 수석 대기' : [modeDone?.d && '양하 완료 ✓', modeDone?.l && '선적 완료 ✓'].filter(Boolean).join(' · ')) : '';
  let st = '', stCls = 'text-dim-300', stTitle = '';
  if (activeInspectors.length) { st = `● ${activeInspectors.map(a => a.name).join(', ')} 작업중`; stCls = 'text-emerald-300'; }
  else if (doneTxt) { st = doneTxt; stCls = 'text-amber-300'; }
  else if (_termWorking) { st = '본선 작업중'; stCls = 'text-cyan-200'; stTitle = '터미널(동방·PCTC)이 이 배를 작업 중으로 알리고 있습니다. 앱에 접속한 검수원은 없습니다.'; }
  else if (departBadge && departBadge.kind === 'depart') { st = `출항 ${_dayShort(departBadge.at)} ${_hm2(departBadge.at)}`; stCls = 'text-amber-200'; }
  else if (voyage._etaMs != null) st = `${_dayShort(voyage._etaMs)} ${_hm2(voyage._etaMs)}`;
  else if (voyage._etdMs != null) st = `~ ${_dayShort(voyage._etdMs)} ${_hm2(voyage._etdMs)}`;
  else { st = '일정 미상'; stCls = 'text-dim-500'; }
  const podCns = disStats.podIssueCns || [];
  //  알림 줄 — 목적지 확인 · 사전에 없음 · 누락 · 예상(3.55 «누락은 접혀 있어도 보인다»). 없으면 줄을 안 만든다.
  const alertOf = (st0, lbl) => [
    !st0.forecastEdi && !st0.listOnly && !st0.partialEdi && st0.missing > 0 ? <span key={lbl + 'm'} className="text-xs font-bold text-red-300 whitespace-nowrap">{lbl} 누락 {st0.missing}</span> : null,
    (st0.planOnly || st0.forecastEdi) ? <span key={lbl + 'f'} className="text-xs font-black px-1 rounded bg-orange-900/60 text-orange-200 border border-orange-700/40 whitespace-nowrap" title="확정 자료가 아닌 예상 수치입니다 — 상세에 내역이 나옵니다">{lbl} 예상</span> : null,
  ];
  const alerts = [...(dis && !sideCancelled(voyage.info, 'discharge') ? alertOf(disStats, '양하') : []), ...(loa && !sideCancelled(voyage.info, 'loading') ? alertOf(loaStats, '선적') : [])].filter(Boolean);
  return (
    <button type="button" onClick={onSelect} data-ship-row={voyage.key} aria-pressed={selected}
      className={`home-row ${pier === 'PCTC' ? 'pier-pctc' : pier === 'PNCT' ? 'pier-pnct' : ''} ${_isToday ? 'is-today' : ''} ${selected ? 'is-on' : ''}`}>
      <span className="home-rail" aria-hidden="true" />
      <span className="home-row-name min-w-0 flex flex-col">
        <span className="text-lg font-black text-dim-100 leading-tight truncate">{voyage.info.vsl}</span>
        <span className="text-xs text-dim-400 font-bold truncate">{sub}</span>
      </span>
      <span className="home-row-bars min-w-0 flex flex-col gap-1">
        {dis && (sideCancelled(voyage.info, 'discharge')
          ? <span className="text-xs font-black text-st-badHi" data-row-bar="discharge" data-cancelled="1">양하 ⛔ 전량 캔슬</span>
          : <RowBar label="양하" mode="discharge" stats={disStats} />)}
        {loa && (sideCancelled(voyage.info, 'loading')
          ? <span className="text-xs font-black text-st-badHi" data-row-bar="loading" data-cancelled="1">선적 ⛔ 전량 캔슬</span>
          : <RowBar label="선적" mode="loading" stats={loaStats} />)}
        {!dis && !loa && <span className="text-xs text-dim-400">자료 대기</span>}
      </span>
      {/* 오른쪽 — 상태 한 줄 + (있으면) 알림 한 줄: 목적지 확인 · 사전에 없음 · 누락 · 예상(3.55 «누락은 접혀 있어도 보인다»). 줄 높이는 그대로(A4 «크기가 틀려 다음줄을 만들기도»). */}
      <span className="home-row-side min-w-0 flex flex-col items-end gap-0.5">
        <span className={`home-row-st text-xs font-bold ${stCls}`} title={stTitle || st} data-row-status="1">{st}</span>
        {/* 감싸개는 늘 그린다 — 비면 CSS(.home-row-al:empty)가 숨긴다. «사전에 없음» 딱지가 베이사전이 늦게 와도 그 자리에서 뜬다(딱지가 스스로 다시 그린다 · 4.25 2차 감사 기록). */}
        <span className="home-row-al" data-row-alerts="1">
          <PodIssueChip voyage={voyage} cns={podCns} onOpen={(m) => { if (onOpen) onOpen(m); }} />
          <DictMissingChip info={voyage.info} className="!text-xs !px-1.5 !py-0" />
          {alerts}
        </span>
      </span>
    </button>
  );
}

//  상세 머리·폰 시트 위 — 그 배 화면을 연다. 구역이 있으면 [양하 열기][선적 열기], 하나도 없으면(자료 대기) [항차 열기 →] — 자료 없는 배도 열어야 EDI 를 직접 올린다(4.01).
export function ShipOpenButtons({ voyage, onOpen }) {
  const hasD = !!voyage.discharge, hasL = !!voyage.loading;
  const cls = 'pop-btn pop-sm whitespace-nowrap !h-[var(--tap)]';
  return (
    <span className="inline-flex items-center gap-2 shrink-0" data-ship-open="1">
      {hasD && <button type="button" onClick={() => onOpen('discharge')} className={`${cls} pop-blue`} data-act="open-discharge">양하 열기</button>}
      {hasL && <button type="button" onClick={() => onOpen('loading')} className={`${cls} pop-amber`} data-act="open-loading">선적 열기</button>}
      {!hasD && !hasL && <button type="button" onClick={() => onOpen()} className={`${cls} pop-slate`} data-act="open">항차 열기 →</button>}
    </span>
  );
}

//  4.25 베이별 진행 — 상세 칸의 «완료/전체» 와 같은 유닛 한 벌(computeStats.units = progressOf 의 분모 집합)을 계획 베이(EDI bay → 리스트 bay)로 나눈다.
//    자리를 모르는 유닛(리스트만 온 컨 등)은 «자리 없음» 한 칸 — 칸들의 합 = 상세 대수. 그림이 아니라 숫자 칸이다(그림은 항차 화면 베이 탭).
function bayProgressOf(section, units) {
  const edi = section?.ediContainers || {}, rec = section?.records || {}, comp = section?.completed || {};
  const byCn = {};
  for (const [k, c] of Object.entries(edi)) if (c) byCn[c.cn || k] = c;
  const out = new Map();
  for (const cn of units || []) {
    const c = byCn[cn], r = rec[cn];
    const b = parseInt((c && c.bay) || (r && r.bay) || '', 10);
    const key = Number.isFinite(b) ? b : -1;
    const e = out.get(key) || { bay: key, n: 0, done: 0 };
    e.n += 1;
    if (comp[cn]) e.done += 1;
    out.set(key, e);
  }
  return [...out.values()].sort((a, b) => ((a.bay < 0) - (b.bay < 0)) || (a.bay - b.bay));
}

// ── ★ 4.25 고른 배 상세 — 종전 카드 한 장의 내용 전부(배지·항로·예보·대수 내역·상태·완료·지금 처리·삭제)를 한 판에 편다 + 베이별 진행 · 자료 대수 · 실 정책 한 줄. ──
//   컴은 오른쪽 칸, 폰은 전체화면 시트 안. 처리기(onOpen·onDelete·onComplete·onUndoComplete·지금 처리)는 종전 카드에 넘기던 그대로다.
export function ShipDetail({ voyage, activeInspectors = [], onOpen, onDelete, onComplete, inspectorDone, modeDone, onUndoComplete, pilotForecast = {}, inspector = '', laneRow = null, zapSt = null, policy = null, onEditPolicy = null, showOpen = true }) {
  // 2.19: 카드 하단 액션 버튼 **한 규격**. 높이 한 칸 · 한 줄 고정 · 폰 균등.
  //   ⚠ 여기에 색만 이어 붙인다. 높이·패딩·글자 크기를 개별 버튼에서 다시 주지 않는다.
  //   4.25 2차(모의 확인 ①): 폰에서 단추가 줄지 않는다(flex 1 0 auto — 글자 너비 밑으로 안 줄고 남는 폭만 나눠 갖는다). 한 줄에 안 들어가면 다음 줄로 내려간다.
  //     종전 flex-1 min-w-0 은 셋(⚡·⬇·⬆)이 한 줄에서 51~65px 까지 줄어 «지금 처i» 처럼 글자가 잘렸다(360·390·412).
  const ACT_BTN = 'min-h-[var(--tap)] px-3 rounded-pill text-sm font-bold border-2 flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden flex-[1_0_auto] min-[700px]:flex-none';
  // V9.37-01: ⚡ 지금 처리 상태 ''|run|ok|fail|timeout — 4.25: 배마다 HomePage 가 들고 있다(상세를 다른 배로 바꿔도 남는다)
  const { zap, setZap, zapMsg, setZapMsg } = zapSt || { zap: '', zapMsg: '', setZap: () => {}, setZapMsg: () => {} };
  const sv = shipViewOf(voyage, pilotForecast);
  const { dis, loa, disStats, loaStats, pier, berth, pfDep, pmDep, remD, remL, _termWorking, _tp, _tpDis, _tpLod, departBadge } = sv;
  const TAG = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill border-2 text-xs font-bold whitespace-nowrap';
  //  베이별 진행 — 지금 하는 쪽이 먼저(양하가 다 끝났고 선적이 있으면 선적). 둘 다 있으면 [양하][선적] 으로 바꿔 본다.
  const bayModes = ['discharge', 'loading'].filter((m) => (m === 'discharge' ? dis : loa) && !sideCancelled(voyage.info, m) && (m === 'discharge' ? disStats : loaStats).total > 0);
  const _bayDefault = bayModes.includes('discharge') && !(disStats.done >= disStats.total && bayModes.includes('loading')) ? 'discharge' : (bayModes[0] || '');
  const [bayPick, setBayPick] = useState('');
  const bayMode = bayModes.includes(bayPick) ? bayPick : _bayDefault;
  const voyPair = (() => {
    // M6.45: voy_d / voy_l 다르면 둘 다 표시 (예: 0523E/0523W)
    const d = voyage.info.voy_d, l = voyage.info.voy_l, v = voyage.info.voy;
    if (d && l && d !== l) return `${d} / ${l}`;
    return d || l || v || '';
  })();
  return (
    <div className="home-detail space-y-3" data-ship-detail={voyage.key}>
      {/* 머리 — 선박명(누르면 그 배 화면 · 종전 카드 머리) · 정식 이름 · 항차 · 선사 · 문제 알림 · 열기 단추 */}
      <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
        <button type="button" onClick={() => onOpen()} className="text-left shrink-0" title="눌러서 이 항차 열기" data-act="open-head">
          <span className="text-3xl font-black text-dim-100 leading-none">{voyage.info.vsl}</span>
        </button>
        <span className="text-sm text-dim-300 min-w-0" data-ship-head="1">
          {[voyage.info.vslFull, voyPair, voyage.info.carrier].filter(Boolean).join(' · ')}
        </span>
        <PodIssueChip voyage={voyage} cns={disStats.podIssueCns || []} onOpen={onOpen} big />
        <DictMissingChip info={voyage.info} />
        {showOpen && <span className="ml-auto"><ShipOpenButtons voyage={voyage} onOpen={onOpen} /></span>}
      </div>

      {/* 배지 — 부두·선석 · 작업일시(또는 출항) · 신고도착 · 출항 예보 · 자동 등록 · 자료 상태 · 곧 자동삭제 */}
      <div className="flex flex-wrap gap-1.5" data-ship-tags="1">
        {/* M5.82: 부두 배지 */}
        {pier === 'PCTC' && <span className={`${TAG} bg-blue-900/60 border-blue-700/60 text-blue-200`}>📍 PCTC {berth ? `· ${formatBerth(berth)}` : ''}</span>}
        {pier === 'PNCT' && <span className={`${TAG} bg-purple-900/60 border-purple-700/60 text-purple-200`}>📍 PNCT {berth ? `· ${formatBerth(berth)}` : ''}</span>}
        {!pier && berth && <span className={`${TAG} bg-ink-750 border-line text-dim-300`}>📍 {berth}</span>}
        {/* V9.35: 작업일시 배지 — 항상 표시. 출처는 항상 표기 — 📋 선석배정 · ⚓ 도선 예보 · 🚢 PORT-MIS 신고.
            V9.36·V9.38: 작업이 마무리될 무렵(선적 잔여 ≤ DEPART_REMAIN_MAX)이면 '출항시간' — 판정은 badgeRule.decideBadge 한 곳(shipViewOf). */}
        {(() => {
          const _b = departBadge;
          if (_b && _b.kind === 'depart') {
            const dep = _b.at;
            const day = dayLabel(dep);   // 2.09: 복제본 제거 — 모듈 공용 한 벌
            const src = _b.src === 'pilot' ? '⚓도선' : '🚢PORT-MIS';
            const late = _b.delayed;
            const _why = { departed: '터미널 출항 처리됨', sticky: '이미 출항 표시로 전환됨' }[_b.reason]
              || `선적 잔여 ${String(_b.reason).replace('remain', '')}개 이하 (기준 ${DEPART_REMAIN_MAX}개 · 갱당 시간당 20개 ≈ 1시간분)`;
            return (
              <span title={`출항 표시 이유: ${_why}`} data-ship-depart="1"
                className={`${TAG} ${dep < Date.now() ? 'bg-ink-800 border-line-strong text-dim-300' : 'bg-amber-900/60 border-amber-700/50 text-amber-200'}`}>
                🚢 출항 {day} {_hm2(dep)} {src}
                {late ? <span className="text-red-300 ml-1">· 지연</span> : ''}
              </span>
            );
          }
          const eta = voyage._etaMs, etd = voyage._etdMs;
          //  종전 카드의 «🗓 작업 … 일정 미상» 줄 — 일정이 없으면 이 배지가 그 말을 한다.
          if (!eta && !etd) return <span className={`${TAG} bg-ink-800 border-line text-dim-400`}>📅 일정 미상</span>;
          // V9.40·V9.41·V9.43: 출처를 **자리별로** — 수집기 planSrc 는 한 출처면 'pilot', 자리별로 다르면 '입항출처|출항출처'.
          //   ★ 사용자 확정(2026-08-02): **표시 자체가 확정/예정을 말한다.** 둘 다 ⚓도선이면 확정.
          const _MK = { mail: '📧메일', pilot: '⚓도선', portmis: '🚢신고', plan: '📋배정' };
          const _pSrc = voyage.info?.planSrc || '';
          const _pp = _pSrc.split('|');
          const _srcIn = _MK[_pp[0]] || '';
          const _srcOut = _MK[_pp[1] || _pp[0]] || '';
          const _perSlot = !!(voyage._etaSrc === 'plan' && _pSrc);
          const srcMark = _perSlot ? ''
            : ({ plan: '📋배정', pilot: '⚓도선', portmis: '🚢신고' }[voyage._etaSrc] || '');
          const srcTip = _perSlot
            ? '⚓도선이 양쪽에 붙으면 확정입니다. 🚢신고·📋배정이 붙은 쪽은 예정값이며, 도선 예보가 올라오면 자동으로 바뀝니다.'
            : '';
          const head = eta ? `${dayLabel(eta)} ${_hm2(eta)}` : '';
          const tail = etd ? (eta && dayLabel(etd) !== dayLabel(eta) ? `${dayLabel(etd)} ${_hm2(etd)}` : _hm2(etd)) : '';
          const _h = head && _perSlot && _srcIn ? `${head} ${_srcIn}` : head;
          const _t = tail && _perSlot && _srcOut ? `${tail} ${_srcOut}` : tail;
          const body = _h && _t ? `${_h} ~ ${_t}` : (_h || `~ ${_t}`);
          const past = etd && etd < Date.now();
          //  TallyOne 1.13 «작업일자를 표기» — 날짜(MM-DD)는 배지 제목에(종전 «🗓 작업 MM-DD HH:MM ~» 줄과 같은 값).
          const _md = (ms) => { const d = new Date(ms); return `${_two(d.getMonth() + 1)}-${_two(d.getDate())} ${_hm2(ms)}`; };
          const _work = eta && etd ? `${_md(eta)} ~ ${_md(etd)}` : (eta ? _md(eta) : `~ ${_md(etd)}`);
          return (
            <span title={`작업 ${_work}${srcTip ? ' — ' + srcTip : ''}`} data-ship-plan="1"
              className={`${TAG} ${past ? 'bg-ink-800 border-line-strong text-dim-300' : 'bg-sky-900/60 border-sky-700/50 text-sky-200'}`}>
              📅 {body}{srcMark ? ` ${srcMark}` : ''}
            </span>
          );
        })()}
        {/* 1.40-01: 🚢 신고도착 — PORT-MIS 세관 신고 항 도착시각. 도선(도선 시작)과 다른 사건이라 따로 세운다. 값은 신고 원본 그대로. */}
        {(() => {
          const ms = voyage._pmEta ? parsePortMisDateTime(voyage._pmEta) : null;
          if (ms == null) return null;
          return (
            <span title="PORT-MIS 세관 신고 기준 항 도착시각입니다. 도선 시작·작업시작과는 다릅니다."
              className={`${TAG} bg-ink-800/70 border-line-strong text-dim-200`}>
              🚢신고도착 {_hm2(ms)}
            </span>
          );
        })()}
        {/* 4.25(설계 ④ 상세): 출항 예보 — 3.53-13 «출항 시간은 포트미스 도선협회 두곳자료로» · 같은 작업창(±12h) 가드(shipViewOf). 출항 배지로 바뀐 뒤에는 그 배지가 같은 시각을 말한다. */}
        {!(departBadge && departBadge.kind === 'depart') && (pfDep ?? pmDep) != null && (() => {
          const t = pfDep ?? pmDep;
          const d = new Date(t);
          return (
            <span className={`${TAG} bg-amber-950/40 border-amber-700/50 text-amber-200`} data-ship-dep="1"
              title={pfDep != null ? '도선 예보의 출항 시각입니다.' : 'PORT-MIS 신고 출항 시각입니다(도선 예보가 아직 없음).'}>
              ⚓ 출항 {_two(d.getMonth() + 1)}-{_two(d.getDate())} {_hm2(t)} {pfDep != null ? '도선' : '신고'}
            </span>
          );
        })()}
        {/* V8.32: 수집기 자동 등록 항차 표시 — 수집중(가등록)/확정. V9.06: expected는 위 예정 배지가 대신. */}
        {voyage.info?.autoRegistered && voyage.info?.autoStatus !== 'confirmed' && voyage.info?.autoStatus !== 'expected' && (
          <span className={`${TAG} bg-amber-900/60 border-amber-700/50 text-amber-200`}>🤖 자동(수집중)</span>
        )}
        {voyage.info?.autoRegistered && voyage.info?.autoStatus === 'confirmed' && (
          <span className={`${TAG} bg-emerald-900/60 border-emerald-700/50 text-emerald-200`}>🤖 자동(확정)</span>
        )}
        {(() => {
          // TallyOne 1.13: 자료 상태 — 확정 > 수정본 > 갱신일시 > 자료 없음.
          const fixed = Number(voyage.info?.dataFixedAt) || 0;
          const at = Number(voyage._dataAt) || 0;
          const fmt2 = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
            return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
          if (fixed) {
            // 확정 뒤에 자료가 또 들어왔으면 수정본. 1분 여유 — 확정 기록과 저장이 거의 동시일 수 있다.
            if (at > fixed + 60000) {
              return <span className={`${TAG} bg-amber-950/40 border-amber-700/50 text-amber-300`} data-ship-data="revised">✏ 수정본 {fmt2(at)}</span>;
            }
            return <span className={`${TAG} bg-emerald-950/40 border-emerald-700/50 text-emerald-300`} data-ship-data="fixed">✅ 자료 확정</span>;
          }
          // TallyOne 1.13-01: 한쪽만 끝난 배 — 무엇을 기다리는지 적는다(검수사 요청).
          if (voyage._waitFor) {
            return <span className={`${TAG} bg-sky-950/40 border-sky-700/50 text-sky-300`} data-ship-data="wait">⏳ {voyage._waitFor}자료 대기중{at ? ` · 갱신 ${fmt2(at)}` : ''}</span>;
          }
          if (at) return <span className={`${TAG} bg-ink-800 border-line text-dim-300`} data-ship-data="at">갱신 {fmt2(at)}</span>;
          if (voyage._hasData) return <span className={`${TAG} bg-ink-800 border-line text-dim-500`} data-ship-data="at">갱신 —</span>;
          return <span className={`${TAG} bg-ink-800 border-line text-dim-500`} data-ship-data="none">자료 없음</span>;
        })()}
        {(() => {
          // V8.01: '곧 자동삭제'는 실제 삭제 기준(마지막 작업 활동)과 일치시킨다. 이 경고만 남긴다.
          const worked = lastWorkAt(voyage);
          if (worked > 0) {
            const workDays = Math.floor((Date.now() - worked) / 86400000);
            if (workDays >= 7) return <span className={`${TAG} bg-amber-950/40 border-amber-600/60 text-amber-400`}>작업 {workDays}일 전 (곧 자동삭제)</span>;
          }
          return null;
        })()}
      </div>

      {/* ── 2.09 (검수사 지시 2026-08-23 «각선박의 자세히 항로 약자와 항로 전체를 홈화면 각선박에 등록») — 4.25 상세는 늘 기항 순서까지 ── */}
      {laneRow && laneRow.lane && (
        <div className="text-sm leading-snug" data-ship-lane="1">
          <span className="text-dim-400">항로 </span>
          <span className="font-bold text-cyan-300">{laneRow.lane}</span>
          {laneRow.name ? <span className="text-dim-400"> · {laneRow.name}</span> : null}
          {laneRow.ports.length > 0 && (() => {
            /* ★ 2.24 (검수사 신고 2026-08-23) — «평택 다음»은 **이번 항차 화물이 정본이다.** (nextPortAfterPtk — 화물 최다가 2등의 1.5배 이상일 때만 헤더를 이긴다)
               ⚠ 색은 하나만 칠한다 — 못 가리면 종전 항로표 자리를 칠하고 «항로표 기준»이라고 밝힌다. */
            const nx = nextPortAfterPtk(voyage, voyage._pm);
            const pi = laneRow.ports.findIndex(p => isPyeongtaekPort(p));
            const rot = pi >= 0 ? normPortCode(laneRow.ports[(pi + 1) % laneRow.ports.length]) : '';
            const pick = (nx && nx.port) || rot;
            return (
              <div className="mt-0.5 text-xs text-dim-300 break-words">
                {laneRow.ports.map((pt, i) => (
                  <span key={`${pt}-${i}`}>
                    {i > 0 && <span className="text-dim-500"> › </span>}
                    {isPyeongtaekPort(pt)
                      ? <span className="text-emerald-300 font-bold">평택</span>
                      : (pick && normPortCode(pt) === pick)
                        ? <span className="text-amber-300 font-bold">{pt}</span>
                        : <span>{pt}</span>}
                  </span>
                ))}
                {pick && <span className="text-amber-400/70"> ← 평택 다음</span>}
                {/* 근거를 같이 적는다 — 검수사 확정 «화물 최다 + 근거 표기». 조용히 단정하지 않는다. */}
                {nx && nx.basis === 'portmis' && <span className="text-dim-400"> · PORT-MIS 차항지</span>}
                {nx && nx.basis === 'cargo' && (
                  <span className="text-dim-400"> · 남는 화물 {nx.cnt}대{nx.hdrDisagree ? ` (자료 헤더는 ${nx.hdr})` : ''}</span>
                )}
                {nx && nx.basis === 'header' && <span className="text-dim-400"> · 자료 헤더</span>}
                {(!nx || nx.basis === 'unsure') && (
                  <span className="text-dim-400"> · 항로표 기준{nx ? ` (화물로는 ${nx.cargo} ${nx.cnt} · ${nx.second} ${nx.secondCnt} — 못 가림)` : ''}</span>
                )}
                {laneRow.src ? <span className="text-dim-500"> · {laneRow.src}</span> : null}
              </div>
            );
          })()}
          {laneRow.ports.length === 0 && (
            <span className="text-amber-400/80"> · 기항 순서 미등록</span>
          )}
        </div>
      )}

      {(() => {
        // V9.02: 카톡 물량 예보 — 해당 모드의 EDI(컨 리스트)가 아직 없을 때만 표시, 생기면 자동 대체(숨김)
        const f = voyage.info?.forecast;
        if (!f) return null;
        const isL = (f.mode || 'loading') === 'loading';
        // V9.02-01: 'EDI 도착' 판정은 실제 EDI 컨테이너(ediContainers)로만.
        const hasReal = isL ? !!(loa && Object.keys(loa.ediContainers || {}).length)
          : !!(dis && Object.keys(dis.ediContainers || {}).length);
        const fmt = (o) => Object.entries(o || {}).map(([s, n]) => `${s}×${n}`).join(' ');
        const tot = (f.teu && f.teu.total) || ((f.calc?.full || 0) + (f.calc?.empty || 0) + (f.calc?.luggage || 0));
        // 2.06-03: 물량(teu/full/empty/calc)이 하나도 없으면 예보 카드가 아니다 — 수화물·긴급 배지만 모드 라벨 없이 한 줄로.
        const hasQty = !!(tot || (f.full && Object.keys(f.full).length) || (f.empty && Object.keys(f.empty).length));
        if (!hasQty) {
          const nUrg = (f.urgentCns || []).length, nLug = (f.luggageCns || []).length;
          if (!nUrg && !nLug) return null;
          return (
            <div className="flex gap-2 flex-wrap text-xs font-bold" data-ship-forecast="marks">
              {nUrg > 0 && <span className="text-rose-300">▲ 긴급 {nUrg}대</span>}
              {nLug > 0 && <span className="text-violet-300">🧳 수화물 컨 {nLug}대</span>}
            </div>
          );
        }
        if (hasReal) return null;
        return (
          <div className="rounded-pill border border-dashed border-orange-600/50 bg-orange-950/30 px-3 py-2" data-ship-forecast="box">
            <div className="text-sm font-bold text-orange-300">
              📋 {isL ? '선적' : '양하'} 예보 {f.voy || ''} · {tot}TEU
              <span className="font-normal text-orange-400/60 ml-1 text-xs">(EDI 도착 시 자동 대체)</span>
            </div>
            {f.full && Object.keys(f.full).length > 0 && <div className="text-xs text-dim-200">FULL {fmt(f.full)}</div>}
            {f.empty && Object.keys(f.empty).length > 0 && <div className="text-xs text-dim-300">EMPTY {fmt(f.empty)}</div>}
            {f.luggage && Object.keys(f.luggage).length > 0 && <div className="text-xs text-dim-400">수화물 {fmt(f.luggage)}</div>}
            {/* V9.03: 긴급/수화물 컨번호 — EDI 도착 후엔 리스트·카고플랜에 ▲·보라 마커로 표시됨 */}
            {f.urgentCns && f.urgentCns.length > 0 && <div className="text-xs text-rose-300 font-bold">▲ 긴급 {f.urgentCns.length}대</div>}
            {f.luggageCns && f.luggageCns.length > 0 && <div className="text-xs text-violet-300 font-bold">🧳 수화물 컨 {f.luggageCns.length}대</div>}
          </div>
        );
      })()}

      {/* 양하·선적 — 큰 숫자 + 막대 한 벌(설계 ⑥ «진행률은 상세의 큰 숫자+막대 하나, 본선·남음은 그 아래 작은 글»). 누르면 그 작업으로 들어간다(V8.81). */}
      <div className="grid gap-2.5 min-[700px]:grid-cols-2" data-side-boxes="1">
        {/*  ★ 2.67-01 (검수사): 캔슬이면 숫자를 지우고 캔슬 한 줄만 — 누르기 **전에** 알아야 한다. */}
        {dis && (sideCancelled(voyage.info, 'discharge')
          ? <div className="home-big is-dis" data-side-box="discharge" data-cancelled="1"><CancelledSide label="양하"/></div>
          : <SideBox label="양하" mode="discharge" stats={disStats} rem={remD} term={_tpDis} termOver={!!(_tp && _tp.overPlan)} lastAt={_lastDoneAt(dis)} onOpen={onOpen}/>)}
        {loa && (sideCancelled(voyage.info, 'loading')
          ? <div className="home-big is-lod" data-side-box="loading" data-cancelled="1"><CancelledSide label="선적"/></div>
          : <SideBox label="선적" mode="loading" stats={loaStats} rem={remL} term={_tpLod} termOver={!!(_tp && _tp.overPlan)} lastAt={_lastDoneAt(loa)} onOpen={onOpen}/>)}
        {/* 1.78: 한쪽이 통째로 없으면 «없음»의 근거를 말한다 (인계함 2026-08-17, TNJP 26359E 사건). */}
        {(dis || loa) && !dis && <div className="home-big is-none"><MissingSideNote label="양하" qty={voyage.info?.planDis}/></div>}
        {(dis || loa) && !loa && <div className="home-big is-none"><MissingSideNote label="선적" qty={voyage.info?.planLod}/></div>}
        {!dis && !loa && (
          <div className="home-big is-none text-sm text-dim-300 min-[700px]:col-span-2" data-side-box="none">
            아직 자료가 없습니다 — EDI·리스트·카톡 물량 예보가 들어오면 여기에 대수가 나옵니다. 직접 올리려면 [항차 열기].
          </div>
        )}
      </div>

      {/* 상태 — 접속 검수원 · 본선 작업중(4.05) · 대기 중 */}
      <div className="text-sm text-dim-300 flex items-center gap-1.5 flex-wrap" data-ship-status="1">
        {activeInspectors.length > 0 ? (
          <>
            <Users className="ico-s text-emerald-400"/>
            <b className="text-emerald-300">● {activeInspectors.map(a => a.name).join(', ')} 작업중</b>
          </>
        ) : _termWorking ? (
          <span title="터미널(동방·PCTC)이 이 배를 작업 중으로 알리고 있습니다. 앱에 접속한 검수원은 없습니다.">
            <b className="text-cyan-200">본선 작업중</b> · 접속 검수원 없음
          </span>
        ) : <span>대기 중</span>}
        {/* 1.83 선박 실 정책 — 이 배 방침 한 줄(설계 ⑤ «상세에 그 배 정책 한 줄»). 누르면 홈 실 정책 판과 같은 수정 창. */}
        {policy && onEditPolicy && (
          <button type="button" onClick={() => onEditPolicy(policy)} data-act="policy"
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill border-2 border-line bg-ink-850 text-xs font-bold text-dim-200 hover:bg-ink-800 whitespace-nowrap">
            🔒 실 정책 · {policyComboLabel(policy) || '일반'} ›
          </button>
        )}
      </div>

      {/* 4.25 베이별 진행 — 위 큰 숫자와 같은 유닛(computeStats.units)을 계획 베이로 나눈 칸. 칸 합 = 위 대수. */}
      {bayMode && (() => {
        const st = bayMode === 'discharge' ? disStats : loaStats;
        const cells = bayProgressOf(bayMode === 'discharge' ? dis : loa, st.units);
        const lod = bayMode === 'loading';
        return (
          <div className="space-y-1.5" data-ship-bays={bayMode}>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <b className="text-dim-100">베이별 진행 ({lod ? '선적' : '양하'})</b>
              <span className="text-dim-400">· 평택분 {st.total}대 · {cells.filter((c) => c.bay >= 0).length}개 베이</span>
              {bayModes.length > 1 && (
                <span className="ml-auto inline-flex gap-1">
                  {bayModes.map((m) => (
                    <button key={m} type="button" onClick={() => setBayPick(m)} aria-pressed={bayMode === m} data-bay-mode={m}
                      className={`px-2.5 rounded-pill border-2 text-xs font-bold ${bayMode === m ? (m === 'loading' ? 'lbl-lod' : 'lbl-dis') : 'border-line bg-ink-850 text-dim-300'}`} style={{ minHeight: 'var(--tap-chip-pc)' }}>
                      {m === 'loading' ? '선적' : '양하'}
                    </button>
                  ))}
                </span>
              )}
            </div>
            <div className="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]">
              {cells.map((c) => {
                const p = c.n > 0 ? Math.round((c.done / c.n) * 100) : 0, full = c.done >= c.n;
                return (
                  <div key={c.bay} className="rounded-pill border border-line bg-ink-850 px-2 py-1" data-bay-cell={c.bay} data-done={c.done} data-total={c.n}>
                    <div className="flex items-baseline justify-between gap-1 mono text-xs">
                      <b className="text-dim-100">{c.bay >= 0 ? `B${_two(c.bay)}` : '자리 없음'}</b>
                      <span className={full ? 'text-emerald-300' : 'text-dim-300'}>{c.done}/{c.n}</span>
                    </div>
                    <div className="xp-bar xp-sm mt-1"><div className={`xp-fill ${full ? 'xp-done' : lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${p}%` }}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 4.25 자료 대수 — 이 항차에 들어온 자료 그대로(EDI 전체 행 · 세관 목록 행 · 선사 리스트 행). 대조는 항차 화면 주의 박스가 한다. */}
      {(dis || loa) && (
        <div className="text-sm text-dim-300" data-ship-data-counts="1">
          자료 — {['discharge', 'loading'].filter((m) => voyage[m]).map((m) => {
            const sec = voyage[m] || {};
            const recs = Object.values(sec.records || {});
            const nE = Object.keys(sec.ediContainers || {}).length;
            const nC = recs.filter((r) => r && r._customs).length;
            const nL = recs.filter((r) => isListOriginRecord(r)).length;
            return (
              <span key={m} data-ship-data-mode={m}>
                {m === 'loading' && voyage.discharge ? ' / ' : ''}{m === 'loading' ? '선적' : '양하'} EDI <b className="text-dim-100">{nE}</b>
                {nC > 0 && <> · 세관 목록 <b className="text-dim-100">{nC}</b></>}
                {' · '}리스트 <b className="text-dim-100">{nL}</b>
              </span>
            );
          })}
        </div>
      )}

      {/* 동작 — 지금 처리 · 양하/선적 완료(되돌리기) · 검수 완료 표시 … 떨어진 자리에 🗑 삭제(D9 «수석은 한번 실수로 … 많은 자료를 잃을수가»). 조회만이면 통째로 없다(3.55-01). */}
      {onDelete && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3" data-ship-acts="1">
          {/* V9.37-01(사용자 지시 2026-08-01): ⚡ 지금 처리 — **홈에** 둔다. "홈화면에 있어야 하죠 거기에 정보가 거의 있는데" —
              자료를 폴더에 넣은 직후 수집기 5분 사이클을 기다리지 않고 이 항차만 즉시 합본·등록시킨다. */}
          {(() => {
            const _vsl = voyage?.info?.vsl || '';
            const _voy = voyage?.info?.voy_l || voyage?.info?.voy || voyage?.info?.voy_d || '';
            if (!_vsl || !_voy) return null;
            const busy = zap === 'run';
            return (
              <button data-act="zap"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (busy) return;
                  setZap('run'); setZapMsg('요청 보냄');
                  try {
                    const k = await fbRequestProcessNow(_vsl, _voy, inspector || '');
                    const off = fbSubscribeProcessDone(k, (r) => {
                      if (!r) return;
                      setZap(r.ok ? 'ok' : 'fail');
                      setZapMsg(r.ok ? `✅ ${r.msg || ''}` : `❌ ${r.msg || ''}`);
                      try { off && off(); } catch { /* skip */ }
                      setTimeout(() => { setZap(''); setZapMsg(''); }, 20000);
                    });
                    setTimeout(() => setZap((s) => (s === 'run' ? 'timeout' : s)), 180000);
                  } catch (err) {
                    setZap('fail'); setZapMsg('❌ 요청 실패');
                  }
                }}
                className={`${ACT_BTN} ${busy
                  ? 'bg-ink-800 border-line text-dim-400'
                  : zap === 'ok' ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300'
                  : zap === 'fail' || zap === 'timeout' ? 'bg-red-900/40 border-red-700/50 text-red-300'
                  : 'bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 border-amber-800/40'}`}
                title={zapMsg || '수집기에 이 항차를 지금 처리하라고 요청 (메일박스 폴더에 자료를 넣은 직후 사용)'}
              >{busy ? '⚡ 처리 중…' : zap === 'timeout' ? '⚡ 응답 없음' : zapMsg ? `⚡ ${zapMsg.slice(0, 8)}` : '⚡ 지금 처리'}</button>
            );
          })()}
          {/* V7.90: 완료 분리 — 양하/선적 각각 완료 표시 (작업시간 구분 + 콘앱 분리작업 자동 판정 근거) */}
          {onComplete && inspectorDone && (
            <span className={`${ACT_BTN} bg-amber-900/40 text-amber-300 border-amber-700/40`} title="모든 작업 완료 — 수석검수사 최종 확인 대기 중" data-act="all-done">
              <CheckCircle className="ico-s"/>검수 완료 · 수석 대기
            </span>
          )}
          {onComplete && modeDone?.hasD && (
            modeDone.d ? (
              <button data-act="undo-discharge"
                onClick={(e) => { e.stopPropagation(); if (onUndoComplete) onUndoComplete('discharge'); }}
                className={`${ACT_BTN} bg-blue-900/40 text-blue-300 border-blue-700/40`}
                title="양하 완료됨 — 누르면 취소 (수석 확인 전까지)"
              >⬇ 양하 완료 ✓</button>
            ) : (
              <button data-act="done-discharge"
                onClick={(e) => { e.stopPropagation(); onComplete('discharge'); }}
                className={`${ACT_BTN} bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 border-blue-800/50`}
                title="양하 작업 완료 표시 — 삭제 안 됨"
              >⬇ 양하 완료</button>
            )
          )}
          {onComplete && modeDone?.hasL && (
            modeDone.l ? (
              <button data-act="undo-loading"
                onClick={(e) => { e.stopPropagation(); if (onUndoComplete) onUndoComplete('loading'); }}
                className={`${ACT_BTN} bg-amber-900/40 text-amber-300 border-amber-700/40`}
                title="선적 완료됨 — 누르면 취소 (수석 확인 전까지)"
              >⬆ 선적 완료 ✓</button>
            ) : (
              <button data-act="done-loading"
                onClick={(e) => { e.stopPropagation(); onComplete('loading'); }}
                className={`${ACT_BTN} bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 border-amber-800/50`}
                title="선적 작업 완료 표시 — 삭제 안 됨"
              >⬆ 선적 완료
              </button>
            )
          )}
          {/* V9.15 → 4.25(D9): 삭제는 평범한 단추와 떨어진 자리(줄 오른쪽 끝 · 폰은 다음 줄 오른쪽)에 빨간 테두리. 확인창은 종전 그대로(양하만·선적만·전체 → 한 번 더).
              폰(700px 미만)은 빈칸이 한 줄을 다 차지해(basis-full) 🗑 이 늘 다음 줄 오른쪽에 선다 — 4.25 2차(모의 확인 ①) */}
          <span className="flex-1 basis-full min-[700px]:basis-8" aria-hidden="true" data-act-gap="1" />
          <button data-act="delete" data-danger="1"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="ml-auto min-h-[var(--tap)] px-3 rounded-pill border-2 border-red-700/70 bg-red-950/30 hover:bg-red-900/40 text-red-200 text-sm font-bold flex items-center gap-1 whitespace-nowrap"
            title="항차 삭제 (기록 없이 제거 — 양하만·선적만·전체를 고르고 한 번 더 묻습니다)"
          >
            <Trash2 className="ico-s"/>삭제
          </button>
        </div>
      )}
    </div>
  );
}

// ── TallyOne 1.78: 한쪽 섹션이 없을 때 «없음»의 근거 (인계함 2026-08-17) ──
//   검수사 확정 — *"선적만 있을수도 있습니다. 세관 자료에도 안보입니다. 양하가 안넘어 왔거나 없다는 이야기."*
//   지금까지는 «자료 미도착(재촉)»과 «해당 없음(정상)»이 화면에서 똑같이 '없음'이라
//   검수사가 기다려야 하는지·재촉해야 하는지·원래 없는지 구분할 수 없었다.
//   근거는 수집기 1.5-06 이 배정목록에서 실어 오는 info.planDis/planLod (PCTC 수량 열).
//   ⚠ 이 수치는 근거 표시 전용 — 카운트 기준으로 쓰지 않는다(예정 수량이 섞인다, v2.17.26 교훈).
//   ⚠ PNCT 배정표에는 수량 열이 없다(실측) — 판정 불가를 넘겨짚지 않고 «수량 미상»으로 말한다.
function MissingSideNote({ label, qty }) {
  const has = qty != null;
  const n = Number(qty) || 0;
  if (has && n > 0) {
    return (
      <div className="text-xxs text-amber-300"
        title={`배정목록에 ${label} ${n} 이 잡혀 있는데 자료(EDI·리스트)가 아직 없습니다 — 자료를 재촉할 대상입니다.`}>
        ⏳ {label} 자료 미도착 — 배정 {label} {n}
      </div>
    );
  }
  if (has) {
    return (
      <div className="text-xxs text-dim-400"
        title={`배정목록에도 ${label} 0 — 이 항차는 ${label} 작업이 원래 없는 배입니다. 기다릴 자료가 아닙니다.`}>
        {label} 없음 — 배정에도 0 (정상)
      </div>
    );
  }
  return (
    <div className="text-xxs text-dim-500"
      title={`배정표에 수량 정보가 없는 부두(PNCT 등)라 자료 대기인지 ${label} 없음인지 판정할 수 없습니다.`}>
      {label} 자료 없음 · 배정 수량 미상
    </div>
  );
}

//  ★ 2.67-01: 전량 캔슬된 쪽 — 항차 카드에서 숫자를 아예 안 보여준다(누르기 전에 알아야 한다).
function CancelledSide({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm2 sm:text-xxs min-h-[36px] sm:min-h-0 opacity-90">
      <span className="bg-st-bad/20 text-st-badHi border border-st-bad/40 px-2 sm:px-1.5 py-1 sm:py-0.5 rounded font-black leading-none">{label}</span>
      <span className="font-black text-st-badHi">⛔ 전량 캔슬</span>
      <span className="text-dim-500">— 배정목록 {label} 0대</span>
    </div>
  );
}

// ── ★ 4.25 상세의 양하·선적 칸 — 종전 SectionBar(카드 막대 + «자세히» 내역)를 한 칸에 편다. ──
//   머리 줄 = 대수 내역(평택·매칭·LUG·예상 EDI·부분 EDI·리스트만·컨펌전·실/가상E/E확정·쉬프팅·가상/리스트·누락 — 종전 식 그대로)
//   큰 숫자 + 막대 = 완료/전체(평택분 · computeStats 한 벌 — 목록 줄·수석 상황판 보드와 같은 값)
//   아래 작은 글 = 남음 · 본선 n/전체(터미널 호기 합계 · 참고) · 배정(터미널 배정목록 · 대조용 참고치) · 마지막 완료. 누르면 그 작업으로 들어간다.
function SideBox({ label, mode, stats, rem = null, term = null, termOver = false, lastAt = 0, onOpen }) {
  const lod = mode === 'loading';
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <button type="button" onClick={() => onOpen(mode)} title={`눌러서 ${label} 열기`}
      className={`home-big ${lod ? 'is-lod' : 'is-dis'} text-left w-full`} data-side-box={mode} data-done={stats.done} data-total={stats.total}>
      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-xs">
        <span className={`${lod ? 'lbl-lod' : 'lbl-dis'} px-2 py-0.5 font-black text-sm leading-none`}>{label}</span>
        {/* V8.90: 예상 EDI 구분(사용자 확정 2026-07-13, SWDN 2608S 사건) — 매칭 0이면 예상(프리스토우)본. */}
        {stats.planOnly ? (
          /* V9.37-02: 프리스토우 플랜 자리(TMPZ) — 컨번호 없는 __SLOT_ 이라 매칭·누락이 성립하지 않는다. 사용자 확답 2026-07-11 ④. */
          <>
            <span className="text-dim-300">평택 <span className="text-emerald-300 font-bold">{stats.planSlots}</span><span className="text-dim-400">자리</span></span>
            <span className="text-dim-500">·</span>
            <span className="text-dim-300">리스트 <span className={`${stats.recCount > 0 ? 'text-emerald-300' : 'text-amber-300'} font-bold`}>{stats.recCount}</span></span>
            <span className="px-1 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/40 font-black" title="컨펌전 플랜 — 선사가 선적 EDI 대신 프리스토우 플랜(격자)만 보내는 선박. 자리마다 규격은 정해져 있고 컨번호만 배정하면 되는 상태입니다(컨번호는 NOLIST 담당). 일항사가 컨펌하면 규격 자리는 그대로지만 개별 컨의 위치는 바뀔 수 있습니다 — 확정 위치가 아닙니다. 자리와 리스트는 서로 다른 것을 세므로 매칭·누락을 표시하지 않습니다.">컨펌전</span>
          </>
        ) : stats.forecastEdi ? (
          <>
            <span className="text-dim-300">평택 <span className="text-emerald-300 font-bold">{stats.recCount}</span></span>
            <span className="text-dim-500">·</span>
            <span className="text-dim-400">예상EDI {stats.ptk}</span>
            <span className="px-1 py-0.5 rounded bg-orange-900/60 text-orange-200 border border-orange-700/40 font-black" title="EDI 컨번호가 리스트(실데이터)와 하나도 일치하지 않음 — 예상(프리스토우) EDI로 판단. 평택 개수는 리스트 기준. 확정 EDI가 오면 자동으로 매칭·누락 표기로 전환됩니다.">예상 EDI · 확정 대기</span>
          </>
        ) : stats.listOnly ? (
          /* V8.91: 리스트만(EDI 없음) — 평택 = 리스트 개수(실데이터 기준), MAMP 628S 사건 */
          <>
            <span className="text-dim-300">평택 <span className="text-emerald-300 font-bold">{stats.recCount}</span></span>
            <span className="px-1 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-700/40 font-black" title="EDI가 아직 없음 — 수집된 리스트(실데이터) 기준 개수. EDI가 오면 매칭·누락 표기로 전환됩니다.">리스트만 · EDI 대기</span>
          </>
        ) : stats.partialEdi ? (
          /* V8.91: 부분 EDI(리스트 > EDI) — 평택 = 리스트 개수, EDI·매칭은 참고, TNJP 26349W 사건 */
          <>
            <span className="text-dim-300">평택 <span className="text-emerald-300 font-bold">{stats.recCount}</span></span>
            <span className="text-dim-500">·</span>
            <span className="text-dim-400">매칭 {stats.matched}</span>
            <span className="px-1 py-0.5 rounded bg-orange-900/60 text-orange-200 border border-orange-700/40 font-black" title="EDI가 리스트 일부(한 선사분 등)만 담은 부분본 — 평택 개수는 리스트(실데이터) 기준. 전체 EDI가 오면 매칭·누락 표기로 전환됩니다.">부분 EDI {stats.ptk}</span>
          </>
        ) : stats.luggage > 0 ? (
          /* TallyOne 1.52: LUGGAGE(여객 수하물) 만큼 차이가 나는 것은 **부분본이 아니다.** 검수사 확정 2026-08-12 — *"170 169 LUG1이 맞습니다."*
             ⚠ LUGGAGE 는 **양하 개수에 포함되지 않는다** — 컨RORO·벌크와 반대다. */
          <>
            <span className="text-dim-300">평택 <span className="text-emerald-300 font-bold">{stats.recCount}</span></span>
            <span className="text-dim-500">·</span>
            <span className="text-dim-300">매칭 <span className="text-emerald-300 font-bold">{stats.matched}</span></span>
            <span className="px-1 py-0.5 rounded bg-teal-900/60 text-teal-200 border border-teal-700/40 font-black"
              title="여객 수하물 컨테이너 — EDI로 오지 않는 것이 정상입니다. 자료가 덜 온 것이 아니며, 양하 개수에는 포함되지 않습니다.">LUG {stats.luggage}</span>
          </>
        ) : (
          <>
            <span className="text-dim-300">평택 <span className={`${stats.matched > 0 ? 'text-emerald-300' : 'text-amber-300'} font-bold`}>{stats.ptk}</span></span>
            <span className="text-dim-500">·</span>
            <span className="text-dim-300">매칭 {stats.matched > 0 ? <span className="text-emerald-300 font-bold">{stats.matched}</span> : stats.matched}</span>
            {/* 1.51: LUGGAGE(여객 수하물) — EDI로 오지 않는 것이 정상이므로 부족이 아니다. 따로 센다. */}
            {stats.luggage > 0 && (
              <span className="px-1 py-0.5 rounded bg-teal-900/60 text-teal-200 border border-teal-700/40 font-black"
                title="여객 수하물 컨테이너 — EDI로 오지 않는 것이 정상입니다. 리스트에는 있고 EDI에는 없지만 자료가 덜 온 것이 아닙니다. 선적 요약에서도 FULL·EMPTY와 섞지 않고 LUG 로 따로 셉니다.">LUGGAGE {stats.luggage}</span>
            )}
          </>
        )}
        {/* V9.03: 선적 가상엠티(DUME)·엠티확정 분리 — MCSN 629S 사건(앱 212 vs PCTC 287). */}
        {(stats.dummyE > 0 || stats.emptyConfirmed > 0) && (
          <>
            <span className="text-dim-500">·</span>
            <span className="text-purple-300" title="실 = EDI 실번호. E확정 = 선사가 엑셀로 준 엠티 실번호(수집기 기록). 총 = 실 + E확정 — 터미널 선적 집계와 대조용. 가상E는 EDI의 엠티 예약자리(예상치)라 확정이 오면 표시하지 않는다 — 예상과 확정 수가 달라도 부족이 아니다.">
              실 {stats.ptk - stats.dummyE}
              {/* V9.08(2026-07-26, 사용자 확정): 가상E는 '예상치'다. 확정이 있으면 예상 자리수는 표시하지 않는다. */}
              {stats.dummyE > 0 && !(stats.emptyConfirmed > 0) ? `+가상E${stats.dummyE}` : ''}
              {/* V9.04-03: E확정은 EDI에 없는 엠티 실번호만 총계에 가산(emptyConfirmedAdd) — 실번호 EDI면 '반영됨' 표기 */}
              {stats.emptyConfirmed > 0 ? (stats.emptyConfirmedAdd > 0
                ? ` + E확정 ${stats.emptyConfirmed} = 총 ${stats.ptk - stats.dummyE + stats.emptyConfirmedAdd}`
                : ` + E확정 ${stats.emptyConfirmed} ✓EDI반영`) : ''}
            </span>
          </>
        )}
        {stats.shiftCount > 0 && (
          <>
            <span className="text-dim-500">·</span>
            <span className="text-sky-300 font-bold" title="쉬프팅(재적부) — 실제로 옮기는 통과화물(동형 공컨 서류교환 제외). 양하 줄은 내림만, 선적 줄은 실음만 센다(내림 1 + 실음 1 = 2 TIME). 4.16~ 막대와 대수는 평택분만이고 시프팅은 이 줄에서 따로 센다(검수사 «양하리스트와 분리 시프팅 리스트 별도 관리»). 카고플랜의 파란 ◆.">쉬프팅 {stats.shiftCount}{stats.shiftState ? ` ${stats.shiftState}` : ''} ({(stats.shiftMoves || 0) > 0 ? `${stats.shiftMoveLabel || '모브'} ${stats.shiftMoves}/${stats.shiftCount}` : `예정 ${stats.shiftCount}`})</span>
          </>
        )}
        {stats.virtualFromList && (
          <span className="px-1 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/40 font-black" title="선적 EDI 미도착 — 선적 리스트로 채운 가상 카운트(베이 없음). 실 EDI 도착 시 자동 대체.">가상/리스트</span>
        )}
        {!stats.forecastEdi && !stats.listOnly && !stats.partialEdi && stats.missing > 0 && (
          <>
            <span className="text-dim-500">·</span>
            <span className="text-red-300 font-bold">누락 {stats.missing}</span>
          </>
        )}
      </div>
      <div className="flex items-baseline gap-2 mono mt-1.5">
        <span className="text-3xl font-black text-dim-100 leading-none">{stats.done}</span>
        <span className="text-base font-bold text-dim-400">/ {stats.total}</span>
        <span className={`text-base font-black ${lod ? 'text-amber-300' : 'text-blue-300'}`}>{pct}%</span>
      </div>
      <div className="xp-bar mt-1.5"><div className={`xp-fill ${pct >= 100 ? 'xp-done' : lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${pct}%` }}/></div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-dim-300 mt-1.5">
        {rem != null && <span>남음 <b className="text-dim-100">{rem}</b></span>}
        {/*  ★ 4.05-01 (검수사 «진행상황을 안보임 · 터미널별 본선작업현황에 있는 갯수라도 표기»): 터미널(동방 QC 합계·PCTC 본선작업현황)이 말하는 완료/전체.
            참고 숫자 — 앱 완료·남음·작업중 판정에 섞지 않는다(컨 단위 터미널 완료는 안 받는다 — 검수사 2026-10-03). 4.25: 같은 숫자를 한 자리에만(설계 ⑥). */}
        {term && (() => {
          const _tot = term.done + term.rest, _tpct = _tot > 0 ? Math.min(100, Math.round((term.done / _tot) * 100)) : 0;
          return (
            <span className="text-cyan-300" data-term={`${term.done}/${_tot}`}
              title={`터미널 본선 작업 현황(호기 합계)이 말하는 ${label} 완료 ${term.done} · 잔여 ${term.rest} (${_tpct}%) — 검수원이 앱에서 누른 완료와는 별개이며 다를 수 있습니다.${termOver ? ' 계획보다 커서 타 항 하역분이 섞였을 수 있습니다.' : ''}`}>
              본선 <b>{term.done}</b>/{_tot}{termOver ? ' ⚠' : ''}
            </span>
          );
        })()}
        {/* 1.82: 터미널 배정 수량 ↔ 앱 수집량 대조. 같으면 ✓, 어긋나면 호박색으로 차이를 적는다.
            4.25(설계 critique 7 «터미널 0 (+250)»): 배정이 0 이면 대조할 수가 없다(수량을 안 주는 배정표·아직 안 잡힌 배정) — 경고처럼 «+250» 을 붙이지 않고 «배정 0» 만 적는다. */}
        {stats.planQty != null && (() => {
          const app = planCompareAppOf(stats);
          const gap0 = (Number(app) || 0) - stats.planQty;
          //  ★ 4.54: 터미널은 같은 칸의 빈 FR 묶음을 1대로 센다 — 그만큼은 «(+6)» 으로 적고 호박색을 끈다(앱 수는 낱개 그대로).
          const fb = stats.frBundle || null, bx = fb ? fb.explained : 0;
          const gap = gap0 - bx;
          const warn = gap !== 0 && stats.planQty > 0;
          const fbWhat = fb ? (fb.ns.length === 1 ? `빈 FR ${fb.ns[0]}대 한 묶음 ${fb.bundles}곳` : `빈 FR 묶음 ${fb.bundles}곳`) : '';
          return (
            <span className={warn ? 'text-amber-300 font-bold' : 'text-dim-400'} data-plan-qty={stats.planQty} data-fr-bundle={bx || undefined}
              title={gap0 === 0
                ? `터미널 배정 ${stats.planQty}대 = 앱 ${app}대 — 일치합니다.`
                : stats.planQty > 0
                  ? (bx > 0 ? `터미널 배정 ${stats.planQty}대(+${bx}) ${gap === 0 ? '= ' : '· '}앱 ${app}대${gap === 0 ? '' : ` (${gap > 0 ? '앱이 ' + gap + '대 많음' : '앱이 ' + (-gap) + '대 적음'})`} — ${fbWhat}, 터미널은 한 묶음을 1대로 세어 ${bx}대 적게 셉니다(앱 컨 대수는 낱개 그대로). ` : `터미널 배정 ${stats.planQty}대 · 앱 ${app}대 (${gap > 0 ? '앱이 ' + gap + '대 많음' : '앱이 ' + (-gap) + '대 적음'}). `)
                    + (gap === 0 ? '' : '배정 수량은 예정치가 섞일 수 있어 참고치입니다 — 확정(작업중·완료) 전에는 어긋나는 것이 정상입니다.')
                  : `터미널 배정목록 수량이 0 입니다 — 수량을 안 주는 배정표이거나 배정이 아직 안 잡힌 것이라 대조하지 않습니다(앱 ${app}대). 대조용 참고치입니다.`}>
              배정 {stats.planQty}{bx > 0 ? `(+${bx})` : ''}{gap === 0 ? ' ✓' : warn ? ` (앱 ${gap > 0 ? '+' : ''}${gap})` : ''}
            </span>
          );
        })()}
        {lastAt > 0 && <span className="text-dim-400">마지막 {_agoTxt(lastAt)}</span>}
      </div>
    </button>
  );
}

export function computeStats(section, mode, info, voyageKey, shiftSet, keepOnboard) {   // 3.53: 연막검사가 **동작으로** 재도록 내보낸다(순수 함수)   // 2.89-06: 시프팅 제외 집합
  // V7.40: 평택분 판정 모드별 정확화 (지침 7.1 — 양하=POD평택, 선적=POL평택).
  //  ★ 4.25 (4.24 감사 기록 7 — 수석 상황판 computeStats 와 같은 수리): 구역이 없을 때도 아래 끝 줄과 **같은 모양**을 돌려준다.
  //    종전엔 workTotal·workDone 등이 없어 한쪽 구역만 있는 항차에서 합산하는 쪽이 undefined 를 더할 수 있었다(4.24 수석 보드 «NaN /NaN» 의 같은 뿌리).
  if (!section) return { total: 0, done: 0, workTotal: 0, workDone: 0, ptk: 0, matched: 0, missing: 0, virtual: false, podIssueCns: [], virtualFromList: false, forecastEdi: false, listOnly: false, partialEdi: false, luggage: 0, recCount: 0, dummyE: 0, emptyConfirmed: 0, emptyConfirmedAdd: 0, planSlots: 0, planOnly: false, units: new Set() };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};

  // PTK 평택 대상 (모드별)
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  // V9.37-02: 식별자는 `cn || 키`. 플랜 가상 EDI(TMPZ 프리스토우)는 **cn 필드가 없다** —
  //   사용자 확답 2026-07-11 ④ "자리만 등록(__SLOT_ 키), 컨번호 임의 배정 금지".
  //   종전엔 c.cn(undefined) 370개가 Set에서 1개로 합쳐져 카드가 '선적 평택 1 · 매칭 0 · 누락 1'
  //   이었다(TMPZ 2023E 실측 2026-08-02, 슬롯 370 전부 pol=KRPTK).
  Object.entries(ediContainers).forEach(([key, c]) => {
    if (!c) return;
    //  ★ 3.53: **POD 확정을 반영한다**(utils 한 벌). 안 하면 홈 카드만 확정 전 숫자에 머문다.
    const _rec = records[c.cn] || records[key] || records[String(c.cn || '').toUpperCase()] || null;
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(resolvedPod(c, _rec))
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(resolvedPod(c, _rec)));
    if (isPtk) ptkCns.add(c.cn || key);
  });
  // TallyOne 1.11: 모수에서 **반대 방향 리스트**를 뺀다. 항차번호가 방향까지 같은 배(N_N 타입)는
  //   메일함 폴더가 하나라 양하·선적 리스트가 섞여 들어와, 양하 카드가 두 리스트를 합산해
  //   `평택 778`(= 양하 371 + 선적 407) 로 나왔다(SWSP 2606N, 2026-08-06 실측).
  //   POL/POD 로 확정된 것만 뺀다 — 근거 없는 레코드는 그대로 센다.
  const recordCns = new Set(ownDirCns(records, mode).filter((cn) => !isShiftOffPtk(shiftSet, records, mode, cn)));   // 2.89-06 · 4.16: 문지기 한 벌(리스트에 실려 온 시프팅은 평택분에도)
  //  3.26: 부킹 자리를 실번호가 다 채운 모드 — 자리를 채운 실번호가 곧 EDI 평택 대상이다(자리는 빼고 실번호를 넣는다).
  //    종전엔 `__BOOK_` 316 이 전부 «누락»으로 섰다(SWBT 2614N). 부분 리스트면 자리를 두고 아래 planSlots 로 «누락» 에서만 뺀다.
  const _bfill = bookingFillOfSec(section, mode);
  if (_bfill && _bfill.filled) {
    [...ptkCns].filter(cn => String(cn).startsWith('__')).forEach(cn => ptkCns.delete(cn));
    recordCns.forEach(cn => ptkCns.add(cn));
  }
  //  ★ 4.53 — 선적 EDI 가 확정한 본선 잔류(시프팅 집합에 든 지시 컨)는 양하 EDI 가 아직 평택 POD 여도 평택 양하분이 아니다 — EDI 평택분에서 뺀다(안 빼면 «누락 2»). 예정은 그대로(4.48-03).
  if (mode === 'discharge') for (const cn of keepInShiftOf(keepOnboard, shiftSet)) ptkCns.delete(cn);
  //  ★ 4.48 감사(상 1) — 선사 지시 본선 잔류 컨은 평택에서 안 내린다. EDI 평택분(ptk — 홈 «완료 확인» 창의 평택분 작업량)에서도 뺀다(MAMP 641N 317 → 315).
  //  4.48-03: 선사 지시 본선 잔류는 예정 — 평택분 합계에서 빼지 않는다(자료대로 · 검수사 2026-10-24 20:07 «예정으로만 남겨도 되는걸 실제처럼 수정해서 그렇습니다»).
  const matched = [...ptkCns].filter(cn => recordCns.has(cn)).length;
  // V9.04-01: 가상(더미) 자리는 '누락' 대상이 아님 — 실번호 미배정 엠티 자리(가상E)로 별도 표기.
  //   (MCSN 629S: 가상 187이 전부 누락으로 잡혀 '누락 187' 허수. dummyE는 아래에서 계산 — 선적만.)
  const dummyECount = mode === 'loading' ? [...ptkCns].filter(cn => isVirtualCn(cn)).length : 0;
  // V9.37-02: 플랜 슬롯(자리)은 컨번호가 배정될 대상이지 '누락'이 아니다. 컨번호는 NOLIST 담당.
  const planSlots = [...ptkCns].filter(cn => String(cn).startsWith('__')).length;   // 3.26: 부킹 자리 `__BOOK_` 도 자리다(부분 리스트 때 «누락»이 아니다)
  const missing = Math.max(0, ptkCns.size - matched - dummyECount - planSlots);
  //  2.89-07 (검수사 «항차목록은 변치 않습니다 … 변하는건 작업내용이 실시간 카운트 될뿐») —
  //    작업량·완료는 progressOf 한 벌(작업량 = 리스트+시프팅 · 완료 = 리스트완료+이 모드 모브).
  //    recordCns(위)는 매칭·수화물 판정용으로 그대로 둔다 — 분모에는 안 쓴다.
  const prog = progressOf(section, mode, shiftSet, ptkCns, keepOnboard);   // 4.48: 본선 잔류(양하만 쓴다)
  //  ★ 4.16 (§7.8-① · Fable 판정 ①): 막대·대수 = **평택분**. 시프팅은 SectionBar 의 «쉬프팅 N (내림 x/N)» 줄이 따로 센다.
  //    작업량(평택분 + 이 모드 모브 — «279+95»)은 workTotal·workDone 으로 남겨 출항 배지가 쓴다.
  const total = prog.ptk.total;
  const done = prog.ptk.done;
  const workTotal = prog.total, workDone = prog.done;
  const virtual = ediValues.some(c => c && (c._virtualFromList || c._virtualFromPlan));   // V8.84-02: 플랜 가상도 배지
  // V9.37-03: 배지는 **출처별로** 나눈다(사용자 지적 2026-08-02 "가상/리스트?").
  //   '가상/리스트'는 리스트로 채운 가상(베이 없음)을 뜻하는데, 플랜 슬롯은 리스트가 아니라
  //   플랜에서 왔고 bay/row/tier 도 있다 — 문구와 툴팁이 둘 다 사실과 달랐다.
  //   플랜 가상은 '컨펌전' 배지가 이미 정확히 설명하므로 여기서는 리스트 가상만 남긴다.
  const virtualFromList = ediValues.some(c => c && c._virtualFromList);
  // V8.90: 예상 EDI 판정 — 리스트(실데이터)가 있는데 EDI 평택분과 컨번호가 하나도 안 겹치면
  //   그 EDI는 확정본이 아니라 예상(프리스토우)본(SWDN 2608S: EDI 293 vs 리스트 284, 매칭 0).
  //   가상 EDI(리스트 승격)는 리스트에서 만든 것이라 제외.
  const forecastEdi = !virtual && ptkCns.size > 0 && recordCns.size > 0 && matched === 0;
  // V8.91: 리스트만(EDI 0) — MAMP 628S 사건: 리스트 324가 올라와 있는데 카드가 '평택 0'으로 보임.
  //   리스트가 실데이터이므로 평택 자리에 리스트 개수를 보여준다(EDI 대기 배지).
  const listOnly = !virtual && ptkCns.size === 0 && recordCns.size > 0;
  // V8.91: 부분 EDI — TNJP 26349W 사건: EDI가 리스트 일부(한 선사분 46/313)만 커버.
  //   리스트가 기준 수치(녹색), EDI·매칭은 참고로 표기. 누락 표기는 무의미하므로 숨김.
  // TallyOne 1.51: **LUGGAGE 는 EDI로 오지 않는다** — 그 대수를 빼고 비교한다.
  //   검수사 확정 2026-08-11: 그 컨번호를 기억했다가 있으면 「매칭 정상 + LUGGAGE N」.
  //   ⚠ 뺀 나머지가 여전히 EDI보다 많으면 그때는 진짜 부분본이다(TNJP 26349W 46/313) — 그대로 잡힌다.
  //   1.52: 번호로 잡히면 그것으로, 아니면 **선박 상시 대수**로 잡는다(번호가 항차마다 바뀐다).
  //   양하만 — LUGGAGE 는 양하에 실려 오는 물건이다.
  const lugByCn = [...recordCns].filter(cn => isLuggageCn(cn) && !ptkCns.has(cn)).length;
  const gap = Math.max(0, recordCns.size - ptkCns.size);
  // 1.56-02: 게이트 제거 — 검수사 확정 "선적에도 같이 별도 1개를 표기". RZOR 는 양방향 모두 수화물 1대가 상시다.
  const lugCap = shipLuggageCount(voyageKey);
  // 1.56-02: 선적은 가상 EDI(리스트 승격)가 수화물을 품어 gap 이 0 이 된다 — 예보(카톡 물량예보)가
  //   이 항차의 수화물 대수를 이미 선언하고 있으면(calc.luggage) 그것으로 표기한다. 번호 기억(isLuggageCn)도 겹으로.
  // 2.08-08 (검수사 실화면 — OBWH 선적 줄만 LUG 배지 없음): forecast.mode 게이트가 여기에도 있었다.
  //   2.08-07 원칙 그대로 — 물량 선언(calc.luggage)은 mode 게이트 유지, **컨번호(luggageCns)는
  //   이 모드 자료(records·EDI)에 실재하는 컨만 세되 mode 무관**(수집기가 만든 mode 딱지에 안 걸리게).
  const _fcLugQty = (String(info?.forecast?.mode || 'loading') === mode)
    ? Number(info?.forecast?.calc?.luggage || 0) : 0;
  const _fcLugCns = (info?.forecast?.luggageCns || [])
    .filter(cn => recordCns.has(cn) || ptkCns.has(cn)).length;
  const fcLug = Math.max(_fcLugQty, _fcLugCns);   // 1.56-04: CLL 선언 번호 수도 근거
  const lugMarked = [...recordCns].filter(cn => isLuggageCn(cn)).length;
  const luggage = Math.max(lugByCn, Math.min(gap, lugCap), Math.min(Math.max(fcLug, lugMarked), Math.max(lugCap, fcLug)));
  const partialEdi = !virtual && matched > 0 && (recordCns.size - luggage) > ptkCns.size;
  // V9.03: 선적 가상엠티 분리 — MCSN 629S 사건(앱 212 vs PCTC 287).
  //   BAPLIE의 엠티 예약자리는 실번호가 없어 수집기(DUME…)나 선사 플래너(CASP69: CASP0000001…)가 더미번호로 채운다.
  //   실번호 개수와 섞이면 터미널 집계와 대조가 안 되므로 분리해 보여준다.
  //   V9.04-01: /^DUME/ 프리픽스 → isVirtualCn(ISO 6346 규칙) — CASP 77대 오집계(실 177·총 364) 수정.
  const dummyE = dummyECount;
  // V9.03: 엠티 확정 개수 — 선사가 EDI 대신 엑셀(MAE EMPTY LOAD LIST 등)로만 주는 최종 엠티 실번호 개수.
  //   수집기가 voyages/{key}/info.emptyConfirmed로 기록하면 "실번호+E확정" 총계로 터미널과 맞춰볼 수 있다.
  const emptyConfirmed = mode === 'loading' ? (parseInt(info?.emptyConfirmed, 10) || 0) : 0;
  // V9.04-03: E확정 중복가산 방지 — EDI에 엠티 '실번호'가 이미 있으면(카스피 LOAD EDI 등)
  //   그 엠티는 실 카운트에 포함돼 있으므로 E확정을 총계에 다시 더하지 않는다.
  //   (629S: 실번호 EDI 등록 시 실 287 + E확정 187 = 총 474 허수 방지. BAPLIE(가상만)면 realE=0 → 기존 총계 유지.)
  const realEPtk = mode === 'loading'
    ? ediValues.filter(c => isPyeongtaekPort(c.pol) && String(c.fe || '').toUpperCase() === 'E' && !isVirtualCn(c.cn)).length
    : 0;
  const emptyConfirmedAdd = Math.max(0, emptyConfirmed - realEPtk);
  // V9.37-02: 플랜 자리만 있는 상태(TMPZ) — 슬롯엔 컨번호가 없어 '매칭'이 성립하지 않는다.
  //   자리 수와 리스트 수를 나란히 보여주고 매칭·누락 표기는 숨긴다.
  // ★ V9.37-04 도메인(사용자 확답 2026-08-02): 이 플랜은 **컨펌전 플랜**이다.
  //   "그 자리에 컨번호만 배정하면 되는 자리. 일항사의 의지대로 컨펌하면 (규격)자리는 맞는데
  //    컨 위치만 바뀌는 거지요."
  //   → 자리의 **규격·개수는 신뢰**하되 **개별 컨의 위치는 확정이 아니다.**
  //     이 자료로 만든 위치를 확정처럼 다루면 안 된다(카고플랜·베이플랜 표기 시 주의).
  const planOnly = planSlots > 0 && matched === 0;
  //  ★ 3.53 — **자료가 갈리는 컨(POD 미확정)을 센다.** 검수사 «진행상황에서 선박명 옆빈곳에
  //    발생된 문제 알림을 주었으면 합니다». 판정은 utils 한 벌(`podConflictOf`) — 진단·컨 상세와 같은 답이다.
  const podIssueCns = [];
  if (mode === 'discharge') {
    for (const [key, c] of Object.entries(ediContainers)) {
      if (!c) continue;
      const _r = records[c.cn] || records[key] || records[String(c.cn || '').toUpperCase()] || null;
      if (_r && podConflictOf(c.pod, _r)) podIssueCns.push(c.cn || key);
    }
  }
  //  4.25: units = 막대 분모 집합 그대로(progressOf 한 벌) — 상세 «베이별 진행» 칸이 이것을 베이로 나눈다(칸 합 = 이 total).
  return { total, done, workTotal, workDone, ptk: ptkCns.size, matched, missing, virtual, podIssueCns, virtualFromList, forecastEdi, listOnly, partialEdi, luggage, recCount: recordCns.size, dummyE, emptyConfirmed, emptyConfirmedAdd, planSlots, planOnly, units: prog.set || new Set() };
}

function CreateVoyageModal({ mode, vsl, voy, setVsl, setVoy, onClose, onCreate }) {
  const isDis = mode === 'discharge';
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-900 border border-line rounded-btn p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg flex items-center gap-2">
            {isDis
              ? <><ArrowDown className="w-5 h-5 text-blue-400"/><span className="text-blue-200">양하 항차 추가</span></>
              : <><ArrowUp className="w-5 h-5 text-amber-400"/><span className="text-amber-200">선적 항차 추가</span></>}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xxs text-dim-300 font-bold block mb-1">선박명 (VSL)</label>
            <input
              type="text"
              value={vsl}
              onChange={e => setVsl(e.target.value)}
              placeholder="예: XIN TAI PING"
              className="w-full bg-ink-800 border border-line rounded px-3 py-2 text-sm uppercase mono focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xxs text-dim-300 font-bold block mb-1">항차 (VOY)</label>
            <input
              type="text"
              value={voy}
              onChange={e => setVoy(e.target.value)}
              placeholder="예: 0521W"
              className="w-full bg-ink-800 border border-line rounded px-3 py-2 text-sm uppercase mono focus:outline-none focus:border-blue-500"
              onKeyDown={e => e.key === 'Enter' && onCreate()}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-ink-800 hover:bg-ink-750 rounded text-sm font-bold text-dim-200"
          >
            취소
          </button>
          <button
            onClick={onCreate}
            disabled={!vsl.trim() || !voy.trim()}
            className={`flex-1 px-3 py-2 rounded text-sm font-bold ${
              isDis
                ? 'bg-blue-700 hover:bg-blue-600 disabled:bg-ink-750 text-blue-100'
                : 'bg-amber-700 hover:bg-amber-600 disabled:bg-ink-750 text-amber-100'
            } disabled:text-dim-400`}
          >
            만들기 + 자료 업로드 →
          </button>
        </div>

        <div className="mt-3 text-2xs text-dim-400 text-center">
          만든 후 EDI/엑셀 자료를 업로드합니다
        </div>
      </div>
    </div>
  );
}

// ── V9.16(2026-07-27): "오늘의 나" — 검수원 개인 지표 (전면 점검 §3: 개인 화면 0이었다) ──
//   모든 항차의 completed에서 by=나·오늘 것만 센다.
//   ★ 3.6 — 페이스는 «최근 20건 간격»이 아니라 **첫 완료~마지막 완료 실작업 시간**으로 잰다.
//     몰아 입력(한 번에 여러 대 찍기)이 섞이면 간격은 시간당 수천 대를 낸다(NSDC 2608N 선적 실측).
//     한 사람은 크레인 한 대에 붙으므로 갱 수는 1로 본다.
//   ★ 3.6-01 — 분모는 «내가 앱을 누른 구간»이 아니라 **그 배가 일한 시간**(접안~이안, 쉬는 시간 뺀 것)이다.
//     검수사 정정 — «1초에 몰아 찍건 실시간으로 입력하든 총 걸린 작업시간은 같습니다».
export function computeMyToday(voyages, inspector, now = Date.now()) {
  if (!inspector) return null;
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const t0 = dayStart.getTime();
  const mine = [];
  const hits = {}; const infoOf = {};
  Object.values(voyages || {}).forEach(v => {
    const key = String(v?.info?.vsl || '') + '_' + String(v?.info?.voy || '');
    ['discharge', 'loading'].forEach(m => {
      const comp = v?.[m]?.completed || {};
      Object.values(comp).forEach(r => {
        if (!(r && r.by === inspector && r.at >= t0 && r.at <= now)) return;
        mine.push(r.at);
        hits[key] = (hits[key] || 0) + 1;
        //  3.6-01: 분모는 «그 배가 일한 시간»이다 — 부두·선석뿐 아니라 접안·이안 시각까지 넘긴다.
        //  ⚠ 분자는 **오늘 것만** 세므로 분모도 오늘 자정부터로 자른다(paceFrom) —
        //    안 자르면 어제 접안부터 나눠 통계탭·미르보다 25% 낮게 나온다(감사 P1-B 실측).
        //  분모의 끝은 «그 배의 마지막 완료»다 — 내 마지막으로 자르면 사람마다 분모가 갈린다(감사 실측).
        if (!infoOf[key]) infoOf[key] = { ...(v?.info || {}), paceFrom: t0, paceTo: 0 };
        const vAll = voyageDoneAts(v);
        if (vAll.length) { infoOf[key].paceTo = vAll[vAll.length - 1]; infoOf[key].firstDoneAt = voyageFirstTermAt(v); }   // 3.53-12: 작업 시작의 대역 — 그 항차 첫 완료(외부 합계 startAt 을 뗀 자리)
      });
    });
  });
  mine.sort((a, b) => a - b);
  //  오늘 내 기록이 가장 많은 항차의 작업 구간으로 잰다(두 배를 뛴 날은 그 배 기준 — 인계함에 적어 둔다).
  const topKey = Object.keys(hits).sort((a, b) => hits[b] - hits[a])[0] || '';
  const count = mine.length;
  //  갱 수 1 — 한 사람은 크레인 한 대에 붙는다(다른 두 화면은 항차 갱 수를 쓴다).
  //  3.53-12: 외부 합계 시작 시각은 분모에 쓰지 않는다(피드를 떼어 냈다) — 검수 시작 보고·접안·작업 시작 순.
  const _P = paceFromRecords(mine, infoOf[topKey] || {}, 1);
  //  ⚠ 개인 몫은 **배가 일한 시간을 알 때만** 낸다(감사 P1-A).
  //    작업 구간을 모르면 분모가 «내가 찍은 구간»이 되어, 몰아 찍은 사람이 시간당 77대로 나온다.
  //    그때는 «오늘 N대»만 보여준다 — 숫자를 지어내지 않는다.
  const perHour = (_P.ok && _P.basis === 'work') ? Math.round(_P.perHour) : null;
  //  못 잰 이유가 «기록이 오해를 부르는 것»이면 밝힌다. «아직 안 쌓였다»(few·short)면 조용히 둔다.
  const paceNote = _P.why === 'dirty' ? '기록 고르지 않음' : '';
  const lastAt = count ? mine[mine.length - 1] : null;
  return { count, perHour, paceNote, lastAt };
}
