// 그린마린 평택항 검수 — Master V1.1
// TallyOne 1.0 (판2 팀K): 로그인 화면 강제 · 역할 게이트 · 해시 라우팅 수리(B-1/6/8/12)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';   // 1.41: useMemo — 접근 판정
import { parseViewCommand } from './planCommand.js';   // 2.87-02: 플랜 명령 판정 한 벌
import { APP_VERSION, _storage, SK , setLaneRoutes } from './utils.js';
import {
  fbSubscribeVoyages, fbSubscribeInspectors, fbSetInspector,
  fbSubscribeConnection, fbSetInspectorActivity, fbLogoutInspector, fbSubscribePortMis, fbSubscribePilotForecast, fbSubscribeTerminalWork,
  fbSubscribeStaffList, fbSubscribeDeletedStaff, fbSubscribeDevAccess, fbSubscribeShipBayDict, fbSubscribeHeartbeat,
  fbSubscribeMatrixEditors, fbGetAdminGuard, fbReconnect
, fbSubscribeLaneRoutes } from './firebase.js';
import { isAdminName, isOwnerName } from './adminGuard.js';   // V9.11: 관리자 판정 + TallyOne 1.0: 소유자 판정(라우트 게이트)
import { isChief, setServerRoles, setDevAccess, canOpenChief } from './staffList.js';     // TallyOne 1.0: 역할 게이트 + 서버 직책 캐시(B-4 선행분 연결) // 1.41: 개발용 접근
import { IDLE_LOGOUT_MS, isIdleLogout } from './inspectorStatus.js';   // V9.13: 30분 무조작 자동 로그아웃
import { parseHash, exitApp } from './backHandler.js';        // TallyOne 1.0: 해시 파서 단일 소스 + 홈 뒤로가기 종료(B-6)
import { setActivityUser, logActivity, logView } from './activityLog.js';   // TallyOne 1.3: 활동 로그(로그인·로그아웃·화면 열람)
import HomePage from './pages/HomePage.jsx';
import VoyagePage from './pages/VoyagePage.jsx';
import GlobalSearchPage from './pages/GlobalSearchPage.jsx';
import ChiefDashboard from './pages/ChiefDashboard.jsx';
import HealthPage from './pages/HealthPage.jsx';  // V8.40: 항차 건강 점검
import FoodPage from './pages/FoodPage.jsx';       // V8.60: 맛집 수첩+돌림판
import AuxPage from './pages/AuxPage.jsx';         // TallyOne 1.0: 보조기능 화면(#/aux — 팀M 구현)
import LoginPage from './pages/LoginPage.jsx';     // TallyOne 1.0: 로그인 전용 화면 (구 InspectorModal 승격)
import Header from './components/Header.jsx';
import BroadcastMarquee from './components/BroadcastMarquee.jsx';
import StaffManagerModal from './components/StaffManagerModal.jsx';
import GreetingModal from './components/GreetingModal.jsx';
import { fetchPyeongtaekWeather, buildGreetingMessage, buildFarewellMessage, saveLoginTime, getLoginTime, clearLoginTime } from './greeting.js';
import ContainerDetailModal from './components/ContainerDetailModal.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';

// TallyOne 1.0 (K2): 수석 전용 라우트(#/chief·#/search) 접근 차단 안내 화면
function DeniedChiefOnly({ onGoHome }) {
  return (
    <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-400">
      <div className="text-5xl mb-4">🔒</div>
      <div className="text-lg font-bold text-dim-100 mb-1">수석 검수사 전용</div>
      <div className="text-sm mb-5">이 화면은 수석·부수석 검수사와 소유자만 열 수 있습니다.</div>
      <button onClick={onGoHome} className="px-4 py-2 bg-ink-800 hover:bg-ink-750 rounded text-dim-100 font-bold">홈으로</button>
    </div>
  );
}

export default function App() {
  // TallyOne 1.0 (B-8): 초기 라우트도 해시 파싱으로 — 홈 깜빡임 제거 (단 아래 로그인 강제가 우선)
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  // TallyOne 1.0: 로그인 전에 열려던 딥링크(#/voyage/... 등) — 로그인 후 그 화면으로 보낸다
  const pendingHashRef = React.useRef('');
  const [voyages, setVoyages] = useState({});
  const [voyagesLoaded, setVoyagesLoaded] = useState(false);  // V8.27: 딥링크 #310 방지 — 로드 전엔 VoyagePage 미마운트
  const [inspectors, setInspectors] = useState({});
  const [extraStaff, setExtraStaff] = useState({});
  const [deletedStaff, setDeletedStaff] = useState({});  // M5.74: 퇴사자 마커  // M5.62: 김성일이 추가한 동적 명단
  // V9.11: 관리자 가드 — 종전에는 `inspector === '김성일'` 하드코딩이라 V9.09에서 권한을 넘겨받은
  //   관리자에게 헤더 ⚙(인원 관리) 버튼이 아예 안 보였다(인수인계가 실질적으로 반쪽).
  const [adminGuard, setAdminGuard] = useState(null);
  const [devAccessMap, setDevAccessMap] = useState({});   // 1.41: 개발용 접근 명단(렌더 갱신용 — 판정 자체는 staffList 모듈 캐시)
  // V9.13: 무조작 자동 로그아웃 — 마지막 화면 조작 시각(ref: 리렌더 없이 갱신) + 안내 문구
  const lastInputRef = React.useRef(Date.now());
  const [autoLogoutNotice, setAutoLogoutNotice] = useState('');
  // M5.21: PORT-MIS 입출항 데이터 (Chrome 확장이 저장 — 호출부호로 매칭)
  const [portMisData, setPortMisData] = useState({});
  // V9.33: 평택도선사회 도선 예보(수집기 기록) — 선박코드 키
  const [pilotForecast, setPilotForecast] = useState({});
  // V9.36: 터미널 작업 현황(진행률·출항 ETD) — 작업 마무리 시 출항시간 표기용
  const [terminalWork, setTerminalWork] = useState({});
  /* ★ 2.87 (검수사 지시 2026-08-29) — 미르가 여는 플랜은 **덮개**다. 주소를 바꾸지 않는다.
       «사용자가 원하지 않았는데 위치이동이 됩니다. 홈화면에서 물었으면 홈화면에서 보여주고
         닫아도 홈화면이어야 합니다»
     {voyageKey, mode, what:'bay'|'cargo', bay} | null */
  const [mirPlan, setMirPlan] = useState(null);
  /* ★ 2.87-02 (검수사 2026-08-29) — «여기를 꼭 거쳐야 하나요? 창을 닫으면 여기에 있네요»
       홈 검색창은 무엇을 묻든 통합검색 화면(#/search)으로 **넘겨** 버렸다. 그래서 플랜을 물으면
       ① 화면이 통합검색으로 바뀌고 ② 거기서 컨테이너 목록까지 만들고 ③ 플랜을 닫으면 홈이 아니라
       통합검색에 남았다. 검수사가 «버그가 양하를 인식하고 양하 컨테이너 목록을 만드는것입니다»
       라고 한 것이 ②다 — 열어 달라고 했는데 찾기까지 한 것이다.
     ⇒ 플랜 명령이고 배를 찾을 수 있으면 **아무 데도 가지 않고** 그 자리에서 덮개만 띄운다.
     ⚠ 배를 못 찾으면 종전대로 통합검색으로 넘긴다 — 엉뚱한 배를 여는 것보다 낫다. */
  const _voyFromQuery = React.useCallback((q) => {
    const t = String(q || '').toUpperCase();
    const keys = Object.keys(voyages || {});
    //  약자(키 앞부분) 먼저 — KSKM_2616N 의 KSKM. 그다음 선박명(info.vsl).
    let hit = keys.filter((k) => t.includes(String(k).split('_')[0].toUpperCase()));
    if (!hit.length) {
      hit = keys.filter((k) => {
        const v = String(voyages[k]?.info?.vsl || '').toUpperCase();
        return v.length >= 3 && t.includes(v);
      });
    }
    return hit.length === 1 ? hit[0] : null;   // 여럿이면 미르가 고르게 둔다
  }, [voyages]);
  const _askGlobal = React.useCallback((q) => {
    const text = typeof q === 'string' ? q : '';
    const cmd = parseViewCommand(text);
    if (cmd) {
      const vk = _voyFromQuery(text);
      if (vk) { setMirPlan({ voyageKey: vk, mode: cmd.mode, what: cmd.what, bay: cmd.bay }); return; }
    }
    setSearchInitQ(text); navigate('search');
  }, [_voyFromQuery]);

  const [searchInitQ, setSearchInitQ] = useState('');   // 1.69-01: 홈 검색창 질문을 통합검색으로 들고 간다
  // M3.6: 자동 로그인 제거 - 매번 검수원 입력 (TallyOne 1.0: 모달 → 로그인 화면으로 승격)
  const [inspector, setInspector] = useState('');
  const [showStaffManager, setShowStaffManager] = useState(false);  // M5.73
  const [online, setOnline] = useState(true);
  // TallyOne 1.5: 화면 데이터만 새로고침 — 페이지 리로드 없이 실시간 구독 재연결(로그인 유지).
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const handleRefreshData = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // TallyOne 1.8-12: 재연결 결과를 확인한다. 끊고 다시 붙이는 동작이라, 못 붙으면
      //   상단 배너가 '오프라인'에 멈춘 채 남는다(2026-08-05 실측). 그걸 조용히 넘기지 않는다.
      const r = await fbReconnect();
      setRefreshedAt(Date.now());
      if (r && r.online === false) {
        alert('데이터 새로고침 — 서버 재연결을 확인하지 못했습니다.\n\n상단에 오프라인 표시가 남아 있으면 화면을 새로고침(F5) 해 주세요.\n저장한 내용은 사라지지 않습니다.');
      }
    } catch (e) {
      console.warn('[새로고침] 재연결 실패', e);   // 조용히 실패하지 않는다(3금지 3번)
      alert('데이터 새로고침 실패 — 네트워크를 확인해 주세요.');
    } finally {
      setRefreshing(false);
    }
  };
  const [globalDetail, setGlobalDetail] = useState(null);
  // M3.6: 인사 모달
  const [greeting, setGreeting] = useState(null);  // {type: 'login'|'logout', lines, voice, ...}
  const [weather, setWeather] = useState(null);
  const [heartbeat, setHeartbeat] = useState(null);  // V8.40: 수집기 하트비트
  // 1.58: 「오래됨」 배너 폐기(보관소가 정본이라 로컬과 대조할 이유가 없다).
  //   1.60-01: 업로드 결과 통지도 함께 폐기 — 자동 업로드 자체가 없어졌다.

  // TallyOne 1.0: 앱 시작은 항상 로그인 화면(자동 로그인 없음 — 사용자 확정 사양).
  //   원래 열려던 해시는 pendingHashRef에 보관 → 로그인 성공 시 권한 검사 후 그 해시로 진입.
  //   replaceState라 히스토리에 로그인 이전 엔트리가 쌓이지 않는다.
  useEffect(() => {
    const h = window.location.hash;
    if (h && h !== '#' && h !== '#/' && !h.startsWith('#/login')) pendingHashRef.current = h;
    window.history.replaceState(null, '', '#/login');
    setRoute({ name: 'login' });
  }, []);

  useEffect(() => {
    const u1 = fbSubscribeVoyages((v) => { setVoyages(v); setVoyagesLoaded(true); });
    const u2 = fbSubscribeInspectors(setInspectors);
    // TallyOne 1.0 (K5): 서버 직책을 staffList 모듈 캐시에 먼저 밀어 넣고(setServerRoles),
    //   그 다음 state 반영(setExtraStaff) — 순서가 바뀌면 첫 렌더가 옛 직책으로 판정한다.
    const unsub2 = fbSubscribeStaffList((m) => { setServerRoles(m); setExtraStaff(m); });
    // 1.41: 개발용 접근 명단 — 모듈 캐시(setDevAccess)에 밀어 넣고 state 도 갱신한다.
    //   K5 와 같은 이유로 **캐시 먼저**. 순서가 바뀌면 첫 렌더가 옛 명단으로 판정한다.
    const unsubDev = fbSubscribeDevAccess((m) => { setDevAccess(m); setDevAccessMap(m || {}); });
    const unsub3 = fbSubscribeDeletedStaff(setDeletedStaff);
    const u3 = fbSubscribeConnection(setOnline);
    const u4 = fbSubscribePortMis(setPortMisData);  // M5.21: PORT-MIS 데이터
    const u4b = fbSubscribePilotForecast(setPilotForecast);  // V9.33: 도선 예보
    const u4c = fbSubscribeTerminalWork(setTerminalWork);   // V9.36: 터미널 작업 현황
    const u4d = fbSubscribeLaneRoutes(setLaneRoutes);       // 1.45: 항로 사전(utils 모듈 캐시)
    const u6 = fbSubscribeHeartbeat(setHeartbeat);  // V8.40: 수집기 하트비트
    // M5.88: Firebase 베이사전 구독 — 전역 객체 window.__fbShipBayDict에 저장
    //   shipStructure.js가 이 데이터를 우선 조회 (베이사전 매칭 자동화)
    // M6.94.20: user 소스 매트릭스를 localStorage userBayDict에도 머지
    //   → PC에서 만든 user 매트릭스를 폰에서도 받아서 카고플랜 룩업 가능 (읽기 전용 수신).
    //   원칙 ① 보호: source==='user'(또는 _userOwned) entry만 머지하고,
    //   로컬에 이미 더 최신(updatedAt) user entry가 있으면 덮어쓰지 않는다.
    // V9.05: 베이사전 쓰기 게이트용 권한자 명단 캐시 (bayDictGuard.js가 참조)
    const u7 = fbSubscribeMatrixEditors(list => { window.__gmMatrixEditors = Array.isArray(list) ? list : []; });
    const u5 = fbSubscribeShipBayDict(data => {
      window.__fbShipBayDict = data || {};
      // V7.94-07: 콘앱(Firebase 미로드, 같은 오리진)이 읽을 수 있게 localStorage에 미러.
      //   용량 초과(QuotaExceeded) 시 조용히 생략 — 메인 앱 동작에는 영향 없음.
      try { localStorage.setItem('gm_fb_baydict_cache', JSON.stringify(data || {})); } catch (e) { /* skip */ }
      // ── ★ TallyOne 1.58: 보관소가 정본이다 (검수사 확정 2026-08-13) ──
      //   검수사 원문: *"보관소가 정본입니다. 제가 폰으로 수정을 하든 컴으로 수정을 하든
      //     엣지로 하든 크롬으로 하든 모두 같아야 합니다. 보이는것도 같아야 합니다."*
      //
      //   종전 구조: 조회 1순위가 브라우저 localStorage(`master_user_bay_dict_v1`)였다.
      //     그래서 크롬 프로필·엣지·폰마다 사전이 따로였고, 같은 배가 기기마다 다르게 그려졌다.
      //     게다가 V9.05 「오래됨」 배너는 updatedAt 만 비교해 **내용이 같아도** 알렸고
      //     (2026-08-11 「전체 동기화」 한 번에 92건 도장 → 헛경고 96건),
      //     승인은 병합이 아니라 통째 교체라 그 기기에만 있던 수정이 사라졌다. 배너 자체가 오염 경로였다.
      //
      //   새 구조: 조회는 보관소(shipStructure.getFbBayDict)만 본다. 로컬은 오프라인 캐시로만 남는다.
      //   여기서 하는 일은 **유실 방지 한 가지**다 — 이 기기 사본 중 보관소에 **없는** 코드만 올린다.
      //     · 기존 보관소 항목은 건드리지 않는다(신규만, 덮어쓰기 없음).
      //     · 검수사는 폰·크롬·엣지를 한 번씩 열기만 하면 된다. 누를 것이 없다.
      //     · 편집 권한자는 검수사 한 사람뿐이라(bayDictGuard) 남의 사본이 섞일 위험이 없다.
      //   실패해도 조용히 넘기지 않는다 — 콘솔에 남기고 배너로 알린다.
      // ★ TallyOne 1.60-01: **로컬 사본 자동 업로드를 폐기한다** (2026-08-13 사고).
      //   1.58 에서 "유실 방지"로 넣었다 — 이 기기 사본 중 보관소에 없는 것만 올리는 장치였다.
      //   그런데 같은 날 보관소를 108키 → 30키로 정리하자, 로컬에 남아 있던 허상 키 72개를
      //   **그대로 되살렸다**(XINT·ATLA·STAR·DONG·PEGA…). 검수사 화면에 "72건을 보관소에 올렸습니다"가
      //   떴고 보관소는 102키로 되돌아갔다. 유실 방지 장치가 오염 복구 장치가 된 것이다.
      //
      //   근본은 이것이다 — **사본이 정본에 항목을 더하는 것도 정본을 고치는 일이다.**
      //   검수사 확정: *"베이메트릭스 단 하나만이 정본이며 … 사본이 정본을 고칠 수 없습니다."*
      //   새 매트릭스가 필요하면 수석 대시보드 「🧱 베이매트릭스」에서 사람이 만든다(1.60).
      //   그 길이 생겼으므로 자동 업로드는 존재 이유가 없다.
      //
      //   ⚠ 되살리지 마라. 로컬 사본에는 옛 허상·자동 생성본이 섞여 있고, 그것을 걸러낼 방법이
      //     기계에는 없다. 무엇이 정본인지는 검수사만 안다.
    });
    return () => { u1(); u2(); u3(); u4(); u4b(); u4c(); u5(); u6(); u7(); unsub2(); unsub3(); unsubDev(); };
  }, []);

  useEffect(() => {
    let alive = true;
    fbGetAdminGuard().then(g => { if (alive) setAdminGuard(g); }).catch(() => {});
    return () => { alive = false; };
  }, [inspector]);
  const isAdmin = isAdminName(adminGuard, inspector);
  // TallyOne 1.0 (K2): 라우트 게이트 — 수석(부수석 포함) 또는 소유자만 #/chief·#/search
  // 1.41: 판정을 canOpenChief 한 곳으로 모았다(종전엔 네 곳이 각자 했고 서로 달랐다).
  //   devAccessMap 을 의존성에 넣어 명단이 바뀌면 다시 그린다 — 모듈 캐시만 바뀌면 렌더가 안 돈다.
  const chiefOrOwner = useMemo(
    () => canOpenChief(inspector, isOwnerName(inspector)),
    [inspector, devAccessMap],
  );

  // 1.58: handleApproveBayDictSync 삭제 — 보관소가 정본이라 승인·반영 절차 자체가 없다.

  // TallyOne 1.0 (B-12): 해시 → 라우트 동기화는 parseHash 단일 파서만 쓴다
  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // TallyOne 1.0 (B-6): 홈 뒤로가기 — 종전에는 홈 진입마다 pushState를 무조건 반복해
  //   가짜 엔트리가 무한 누적됐다. 이제 가드 엔트리(gmHomeGuard)를 1개만 유지하고,
  //   홈에서 뒤로가면 종료 확인 → 확인 시 exitApp, 취소 시 가드 재장전.
  useEffect(() => {
    if (route.name !== 'home' || !inspector) return;
    if (!(window.history.state && window.history.state.gmHomeGuard)) {
      window.history.pushState({ gmHomeGuard: true }, '', '#/');
    }
    const handler = () => {
      const h = window.location.hash;
      if (h && h !== '#' && h !== '#/') return;   // 다른 라우트로의 정상 이동은 통과
      const okExit = window.confirm('TallyOne 검수앱을 종료할까요?');
      if (okExit) exitApp();
      else window.history.pushState({ gmHomeGuard: true }, '', '#/');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [route.name, inspector]);

  useEffect(() => {
    if (!inspector) return;
    const tick = () => {
      const voyageKey = route.name === 'voyage' ? route.voyageKey : null;
      const mode = route.name === 'voyage' ? (route.mode || null) : null;
      fbSetInspectorActivity(inspector, voyageKey, mode).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [inspector, route]);

  // TallyOne 1.3: 화면 열람 기록 — 라우트 변경마다 1건(30초 중복 생략은 activityLog가 처리).
  //   voyage는 VoyagePage가 탭·모드까지 붙여 기록하므로 여기서 빼고(이중 기록 방지), login도 제외.
  useEffect(() => {
    if (!inspector) return;
    if (route.name === 'login' || route.name === 'voyage') return;
    logView({ route: route.name });
  }, [inspector, route.name]);

  // TallyOne 1.0: 로그인 화면 강제(자동 로그아웃·로그아웃 완료 시) — replaceState라 스택에 안 쌓임
  const forceLoginScreen = useCallback(() => {
    window.history.replaceState(null, '', '#/login');
    setRoute({ name: 'login' });
  }, []);

  // ── V9.13(2026-07-27): 30분 무조작 자동 로그아웃 (사용자 요청) ───────────────
  //   왜: 로그인해 두고 앱을 만지지 않아도 30초 하트비트 때문에 계속 '로그인/작업중'으로 남았다.
  //   기준은 화면 조작(터치·클릭·키·스크롤). 조작이 30분 없으면 그 기기에서 스스로 로그아웃하고
  //   로그인 화면을 띄운다. 작업 기록은 그대로 남는다(로그아웃 마킹만).
  useEffect(() => {
    if (!inspector) return;
    lastInputRef.current = Date.now();
    const mark = () => { lastInputRef.current = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    evs.forEach(e => window.addEventListener(e, mark, { passive: true, capture: true }));
    const check = () => {
      if (!isIdleLogout(lastInputRef.current)) return;
      // TallyOne 1.3: 자동 로그아웃 기록 — 사용자 이름이 지워지기 전에 남긴다(fire-and-forget)
      logActivity('logout', { via: 'idle' });
      setActivityUser('');
      fbLogoutInspector(inspector).catch(() => {});
      clearLoginTime();
      _storage.set(SK.activeInspector, '');
      setInspector('');
      setAutoLogoutNotice(`${Math.round(IDLE_LOGOUT_MS / 60000)}분 동안 사용이 없어 자동 로그아웃됐습니다. 이름을 다시 선택하세요.`);
      forceLoginScreen();   // TallyOne 1.0: 모달 대신 로그인 화면으로
    };
    const id = setInterval(check, 30000);
    // 폰이 잠겨 타이머가 멈췄다 돌아오는 경우 — 화면 복귀 즉시 한 번 더 검사
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      evs.forEach(e => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, [inspector, forceLoginScreen]);

  // M6.42: STOWAGE PDF는 영구 보관 — 시간 기반 자동 폐기 제거
  //   비용 분석: 300척 × 3MB = 900MB → 월 ₩25 (매우 적음)
  //   사용자 결정: 자동 폐기보다 라이브러리로 영구 보관이 더 가치 있음
  //   같은 선박 새 PDF 등록 시 이전 자동 삭제 (덮어쓰기) 정책은 유지 — fbUploadStowagePdf 내부 로직

  const handleSelectInspector = useCallback(async (name) => {
    setInspector(name);
    lastInputRef.current = Date.now();     // V9.13: 로그인 순간부터 무조작 시간 다시 셈
    setAutoLogoutNotice('');
    _storage.set(SK.activeInspector, name);
    // TallyOne 1.3: 로그인 기록 — 검수원 선택 성공이 유일한 로그인 경로(자동 로그인 없음)
    setActivityUser(name);
    logActivity('login', { via: 'select' });
    await fbSetInspector(name);
    // M3.6: 로그인 시각 저장
    saveLoginTime(name);
    // TallyOne 1.0: 역할별 진입 — 수석·소유자는 #/chief, 그 외 #/.
    //   로그인 전 딥링크(pendingHash)가 있으면 거기로(수석 전용 화면은 권한 통과 시에만).
    //   replaceState로 로그인 엔트리를 대체 — 뒤로가기 스택에 로그인 화면이 남지 않는다.
    const roleGate = canOpenChief(name, isOwnerName(name));   // 1.41: 위 게이트와 같은 판정을 쓴다
    let target = pendingHashRef.current || '';
    pendingHashRef.current = '';
    if (target) {
      const r = parseHash(target);
      if (r.name === 'login') target = '';
      else if (r.name === 'chief' && !roleGate) target = '';   // 1.69-01: #/search는 검수원도 연다(홈 검색 진입 복원)
    }
    if (!target) target = roleGate ? '#/chief' : '#/';
    window.history.replaceState(null, '', target);
    setRoute(parseHash(target));
    // M3.6: 날씨 + 인사 (화면 전환 뒤에 조회 — 날씨 응답을 기다리며 로그인이 멈추지 않게)
    const w = await fetchPyeongtaekWeather();
    setWeather(w);
    // M4.2: 인사말 하루 1회 — 같은 날(YYYY-MM-DD) 재로그인 시 인사말 스킵
    //   사용자 요청: 수시로 접속하는데 매번 인사가 나와서 보기 불편
    //   날짜가 바뀌면 다시 표시 (자정 지나면 새로 인사)
    const today = new Date().toISOString().slice(0, 10);
    const lastGreetingDay = _storage.get(SK.lastGreetingDay);
    if (lastGreetingDay !== today) {
      const g = buildGreetingMessage(name, w);
      setGreeting({ type: 'login', ...g });
      _storage.set(SK.lastGreetingDay, today);
    }
    // M3.88: 로그인 인사 음성 제거 (호불호 많음 - 사용자 요청)
  }, []);

  // M3.6: 로그아웃 처리 — TallyOne 1.0 (B-7): 확인 단계는 Header(ConfirmModal)가 먼저 밟는다.
  //   여기 도달했다는 것은 사용자가 이미 [로그아웃]을 확인했다는 뜻 — 그때만 서버에 마킹한다.
  const handleLogout = useCallback(async () => {
    if (!inspector) return;
    // TallyOne 1.3: 수동 로그아웃 기록 — Header ConfirmModal 확인을 거쳐 여기 도달한 시점이 확정
    logActivity('logout', { via: 'manual' });
    fbLogoutInspector(inspector).catch(() => {});   // V7.94-14: 서버에 로그아웃 즉시 마킹
    const loginTime = getLoginTime();
    const workDuration = loginTime ? (Date.now() - loginTime) : 0;
    // 최신 날씨 다시 조회
    const w = await fetchPyeongtaekWeather();
    const f = buildFarewellMessage(inspector, w, workDuration);
    setGreeting({ type: 'logout', ...f, inspectorName: inspector });
    // M3.88: 로그아웃 인사 음성도 제거
  }, [inspector]);

  // 인사 모달 닫기 + 로그아웃 시 실제 로그아웃 진행
  const handleCloseGreeting = useCallback(() => {
    if (greeting?.type === 'logout') {
      // 실제 로그아웃 진행 → TallyOne 1.0: #/login으로
      clearLoginTime();
      _storage.set(SK.activeInspector, '');
      setInspector('');
      setActivityUser('');   // TallyOne 1.3: 로그아웃 완료 — 이후 열람은 기록하지 않는다
      forceLoginScreen();
    }
    setGreeting(null);
  }, [greeting, forceLoginScreen]);

  const navigate = useCallback((target) => {
    if (target === 'home') window.location.hash = '#/';
    else if (target === 'search') window.location.hash = '#/search';
    else if (target === 'chief') window.location.hash = '#/chief';
    else if (target === 'health') window.location.hash = '#/health';  // V8.40
    else if (target === 'food') window.location.hash = '#/food';      // V8.60
    else if (target === 'aux') window.location.hash = '#/aux';        // TallyOne 1.0: 보조기능
    else if (target === 'login') window.location.hash = '#/login';    // TallyOne 1.0: 검수원 변경
    // TallyOne 1.0 (B-1): 양하/선적 모드까지 해시에 인코딩 — #/voyage/KEY/discharge|loading
    else if (target.voyageKey) window.location.hash = `#/voyage/${encodeURIComponent(target.voyageKey)}${target.mode ? `/${target.mode}` : ''}`;
  }, []);

  // ── TallyOne 1.0: 로그인 게이트 — 로그인 전에는 어떤 라우트도 렌더하지 않는다. ──
  //   로그인 상태에서 #/login에 오면 검수원 변경 화면(돌아가기 버튼 제공).
  if (!inspector || route.name === 'login') {
    //  2.64-01 (검수사 «페이지 스크롤이 생기면 불편합니다 맞춤처럼 한화면에 보였으면»):
    //    PC 는 화면 높이에 딱 맞춘다 — 겉은 절대 안 구르고(overflow-hidden), 화면이 짧으면
    //    안쪽 판이 스스로 구른다. 폰(lg 미만)은 손대지 않았다.
    return (
      <div className="min-h-screen bg-ink-950 text-dim-100 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col">
        <UpdatePrompt/>
        <LoginPage
          pilotForecast={pilotForecast}   // 2.64: 로그인 타임라인 도선 마커
          current={inspector}
          inspectors={inspectors}
          voyages={voyages}
          extraStaff={extraStaff}
          deletedStaff={deletedStaff}
          notice={autoLogoutNotice}
          onSelect={handleSelectInspector}
          onCancel={inspector ? () => window.history.back() : null}
        />
        {/* 로그아웃 작별 인사 모달 — 닫으면 로그인 화면 유지 */}
        {greeting && (
          <GreetingModal
            type={greeting.type}
            lines={greeting.lines}
            workForecast={greeting.workForecast}
            onClose={handleCloseGreeting}
          />
        )}
        <footer className="text-center text-[11px] text-dim-500 pb-8 pt-2 leading-relaxed lg:pb-1.5 lg:pt-0.5 lg:shrink-0">
          © 2026 (주)그린마린(Green Marine) · 개발 연지아빠 · 저작권은 개발자 연지아빠에게 있습니다<br/>
          <span className="opacity-70">{APP_VERSION}</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-dim-100">
      <UpdatePrompt/>
      <Header
        version={APP_VERSION}
        inspector={inspector}
        online={online}
        route={route}
        voyages={voyages}
        onChangeInspector={() => { setAutoLogoutNotice(''); navigate('login'); }}
        onOpenStaffManager={isAdmin ? () => setShowStaffManager(true) : null}
        onGoHome={() => navigate('home')}
        onOpenAux={() => navigate('aux')}
        onLogout={handleLogout}
      />

      <BroadcastMarquee inspector={inspector} />

      {/* 1.58: V9.05 「오래됨」 배너 철거 — 보관소가 정본이라 로컬과 대조할 일이 없다.
          1.60-01: 그 자리에 잠깐 있던 「이 기기 사본을 올렸습니다」 통지도 없앴다.
          자동 업로드가 지운 허상 72건을 되살린 사고(2026-08-13) 뒤 장치 자체를 폐기했다. */}
      <main className="pb-20">
        {route.name === 'home' && (
          <HomePage
            voyages={voyages} inspectors={inspectors} inspector={inspector}
            portMisData={portMisData}
            pilotForecast={pilotForecast}
            terminalWork={terminalWork}
            onRefreshData={handleRefreshData} refreshing={refreshing} refreshedAt={refreshedAt}
            onOpenVoyage={(voyageKey, mode) => navigate(mode ? { voyageKey, mode } : { voyageKey })}
            onOpenChiefDashboard={() => navigate('chief')}
            heartbeat={heartbeat}
            onOpenAux={() => navigate('aux')}
            onOpenGlobalSearch={_askGlobal}   /* 1.69-01: 홈 검색 진입 복원 */
          />
        )}
        {route.name === 'food' && (
          <FoodPage inspector={inspector} onGoHome={() => navigate('home')}/>
        )}
        {route.name === 'health' && (
          <HealthPage
            voyages={voyages} heartbeat={heartbeat}
            onOpenVoyage={(voyageKey, mode) => navigate(mode ? { voyageKey, mode } : { voyageKey })}
          />
        )}
        {/* TallyOne 1.0 (K2): 통합검색은 수석·소유자 전용이었다.
            1.69-01: 검수원에게도 연다(홈 검색 진입 복원 — 검수사: "통합검색이든 자연어 검색이든 검수앱
            홈화면에 넣어 달라"). 컨 조회·용어·기능 설명은 답하고, 수석 전용 통계는 GlobalSearchPage가
            isChief로 걸러 1.69 유도 문구를 답한다. */}
        {route.name === 'search' && (
          <GlobalSearchPage
            voyages={voyages}
            onOpenContainer={(c) => setGlobalDetail(c)}
            portMisData={portMisData}
            terminalWork={terminalWork}
            heartbeat={heartbeat}
            isChief={chiefOrOwner}
            initialQuery={searchInitQ}
            /* ★ 2.87 — 플랜은 **이동이 아니라 덮개**다 (검수사 지시 2026-08-29).
                 «사용자가 원하지 않았는데 위치이동이 됩니다 … 닫아도 홈화면이어야 합니다»
                 주소를 바꾸지 않으므로 뒤로가기 스택도, 이 화면의 검색 결과도 그대로 남는다. */
            onOpenPlan={(p) => setMirPlan(p)}
          />
        )}
        {/* TallyOne 1.0 (K2): 수석 대시보드 게이트 (ChiefDashboard 내부 가드와 이중 방어) */}
        {route.name === 'chief' && (
          chiefOrOwner ? (
            <ChiefDashboard
              voyages={voyages} inspectors={inspectors} inspector={inspector}
              collectorHb={heartbeat}
              pilotForecast={pilotForecast}
              portMisData={portMisData}
              terminalWork={terminalWork}
              onRefreshData={handleRefreshData} refreshing={refreshing} refreshedAt={refreshedAt}
              onOpenVoyage={(voyageKey, mode) => navigate(mode ? { voyageKey, mode } : { voyageKey })}
              onGoHome={() => navigate('home')}
              onMirPlan={(pl) => setMirPlan(pl)}   /* 2.87: 플랜은 덮개 — 수석 화면 그대로 둔다 */
              onOpenGlobalSearch={_askGlobal}   /* 2.03-01: 대시보드 검색창 질문을 들고 간다 */
            />
          ) : (
            <DeniedChiefOnly onGoHome={() => navigate('home')}/>
          )
        )}
        {/* TallyOne 1.0: 보조기능 화면 (#/aux — 구현은 팀M AuxPage) */}
        {route.name === 'aux' && (
          <AuxPage
            inspector={inspector}
            isChief={isChief(inspector)}
            isOwner={isOwnerName(inspector)}
            voyages={voyages}
            collectorHb={heartbeat}
          />
        )}
        {route.name === 'voyage' && (
          voyages[route.voyageKey] ? (
          <VoyagePage
            key={route.voyageKey}
            terminalWork={terminalWork}   /* 1.69-01: 진행 질문 — 터미널 실황 1순위(수석 통합검색과 답의 근본 통일) */   /* 1.55-03: 항차를 바꿔 열면 앞 항차의 모드·탭 state 가 남았다(선적 전용 항차가 빈 양하 화면에 갇힘 — 독립 재검증 P1-9). 재마운트로 initModeOverride 가 다시 읽힌다. */
            initModeOverride={route.mode || null}
            voyageKey={route.voyageKey}
            voyage={voyages[route.voyageKey]}
            voyages={voyages}   /* 2.36: 통합검색 — 항차 화면 미르도 전 항차를 본다 */
            heartbeat={heartbeat}
            inspector={inspector}
            inspectors={inspectors}
            portMisData={portMisData}
            pilotForecast={pilotForecast}
            onGoHome={() => navigate('home')}
            onModeChange={(mode) => {
              // TallyOne 1.0 (B-1/B-2): 모드를 해시에도 기록 — 새로고침·공유 시 모드 유지.
              //   replaceState라 모드 전환이 뒤로가기 스택에 쌓이지 않는다(hashchange 미발화 → setRoute 직접).
              const h = `#/voyage/${encodeURIComponent(route.voyageKey)}${mode ? `/${mode}` : ''}`;
              window.history.replaceState(window.history.state, '', h);
              setRoute(r => ({ ...r, mode }));
            }}
          />
          ) : voyagesLoaded ? (
            <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-400">
              항차를 찾을 수 없습니다.
              <div className="mt-3"><button onClick={() => navigate('home')} className="px-4 py-2 bg-ink-800 rounded text-dim-100">홈으로</button></div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-400">항차 불러오는 중…</div>
          )
        )}
      </main>

      {/* ★ 2.87 — 미르가 부른 플랜. 있던 화면은 **뒤에 그대로 살아 있다.**
           닫으면 이 덮개만 걷히므로 홈에서 물었으면 홈, 수석 화면에서 물었으면 수석 화면이다.
         ⚠ VoyagePage 는 주소(location.hash)를 전혀 쓰지 않는다(실측 0건). 그래서 이렇게 띄워도
           라우팅과 싸우지 않는다 — 이 방법을 고른 근거다. */}
      {mirPlan && voyages[mirPlan.voyageKey] && (
        /* ⛔ 여기에 덮개 div 를 두지 않는다 — 2.87 은 z-[65] 껍데기를 씌웠다가
             카고플랜(createPortal → body 직속 z-50)을 **그 껍데기가 가렸다.**
             VoyagePage 가 mirPlan 이면 플랜 하나만 돌려주므로 껍데기가 필요 없다. */
          <VoyagePage
            key={'mirplan-' + mirPlan.voyageKey + '-' + (mirPlan.mode || '')}
            mirPlan={mirPlan}
            onMirPlanClose={() => setMirPlan(null)}
            initModeOverride={mirPlan.mode || null}
            voyageKey={mirPlan.voyageKey}
            voyage={voyages[mirPlan.voyageKey]}
            voyages={voyages}
            terminalWork={terminalWork}
            heartbeat={heartbeat}
            inspector={inspector}
            inspectors={inspectors}
            portMisData={portMisData}
            pilotForecast={pilotForecast}
            onGoHome={() => setMirPlan(null)}
          />
      )}

      <footer className="text-center text-[11px] text-dim-500 pb-24 pt-4 leading-relaxed">
        © 2026 (주)그린마린(Green Marine) · 개발 연지아빠 · 저작권은 개발자 연지아빠에게 있습니다<br/>
        <span className="opacity-70">{APP_VERSION}</span>
      </footer>

      {showStaffManager && (
        <StaffManagerModal
          current={inspector}
          inspectors={inspectors}
          extraStaff={extraStaff}
          deletedStaff={deletedStaff}
          onClose={() => setShowStaffManager(false)}
        />
      )}

      {/* M3.68: 로그인/로그아웃 인사 모달 + 근무 시간대 예보 */}
      {greeting && (
        <GreetingModal
          type={greeting.type}
          lines={greeting.lines}
          workForecast={greeting.workForecast}
          onClose={handleCloseGreeting}
        />
      )}

      {globalDetail && (() => {
        const v = voyages[globalDetail.voyageKey];
        if (!v) return null;
        const sec = v[globalDetail.mode];
        const xrayMap = sec?.xrayList || {};
        const compMap = sec?.completed || {};
        const xraySeals = sec?.xraySeals || {};
        // M3.87: 위치 수정 충돌 검사용 - 같은 모드의 모든 컨테이너 (EDI + records 머지)
        const ediMap = sec?.ediContainers || {};
        const recMap = sec?.records || {};
        const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
        const allContainers = [...allCnSet].map(cn => {
          const e = ediMap[cn] || {};
          const r = recMap[cn] || {};
          return { ...e, ...Object.fromEntries(Object.entries(r).filter(([k,vv]) => vv !== '' && vv != null)), cn, _comp: compMap[cn] || null };
        });
        return (
          <ContainerDetailModal
            c={globalDetail}
            comp={compMap[globalDetail.cn]}
            isXray={globalDetail.mode === 'discharge' && !!xrayMap[globalDetail.cn]}
            xraySeal={xraySeals[globalDetail.cn] || ''}
            mode={globalDetail.mode}
            voyageKey={globalDetail.voyageKey}
            voyageInfo={v.info}
            inspector={inspector}
            onClose={() => setGlobalDetail(null)}
            allContainers={allContainers}
          />
        );
      })()}
    </div>
  );
}
