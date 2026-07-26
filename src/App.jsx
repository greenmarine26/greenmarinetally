// 그린마린 평택항 검수 — Master V1.1
import React, { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, _storage, SK } from './utils.js';
import { loadUserBayDict, entryTimestamp, applyApprovedSync } from './data/userBayDict.js';
import {
  fbSubscribeVoyages, fbSubscribeInspectors, fbSetInspector,
  fbSubscribeConnection, fbSetInspectorActivity, fbLogoutInspector, fbSubscribePortMis,
  fbSubscribeStaffList, fbSubscribeDeletedStaff, fbSubscribeShipBayDict, fbSubscribeHeartbeat,
  fbSubscribeMatrixEditors, fbGetAdminGuard
} from './firebase.js';
import { isAdminName } from './adminGuard.js';   // V9.11: 관리자 판정은 Firebase 목록 기준(하드코딩 제거)
import HomePage from './pages/HomePage.jsx';
import VoyagePage from './pages/VoyagePage.jsx';
import GlobalSearchPage from './pages/GlobalSearchPage.jsx';
import ChiefDashboard from './pages/ChiefDashboard.jsx';
import HealthPage from './pages/HealthPage.jsx';  // V8.40: 항차 건강 점검
import FoodPage from './pages/FoodPage.jsx';       // V8.60: 맛집 수첩+돌림판
import Header from './components/Header.jsx';
import BroadcastMarquee from './components/BroadcastMarquee.jsx';
import InspectorModal from './components/InspectorModal.jsx';
import StaffManagerModal from './components/StaffManagerModal.jsx';
import GreetingModal from './components/GreetingModal.jsx';
import { fetchPyeongtaekWeather, buildGreetingMessage, buildFarewellMessage, speakGreeting, saveLoginTime, getLoginTime, clearLoginTime } from './greeting.js';
import ContainerDetailModal from './components/ContainerDetailModal.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';

export default function App() {
  const [route, setRoute] = useState({ name: 'home' });
  const [voyages, setVoyages] = useState({});
  const [voyagesLoaded, setVoyagesLoaded] = useState(false);  // V8.27: 딥링크 #310 방지 — 로드 전엔 VoyagePage 미마운트
  const [inspectors, setInspectors] = useState({});
  const [extraStaff, setExtraStaff] = useState({});
  const [deletedStaff, setDeletedStaff] = useState({});  // M5.74: 퇴사자 마커  // M5.62: 김성일이 추가한 동적 명단
  // V9.11: 관리자 가드 — 종전에는 `inspector === '김성일'` 하드코딩이라 V9.09에서 권한을 넘겨받은
  //   관리자에게 헤더 ⚙(인원 관리) 버튼이 아예 안 보였다(인수인계가 실질적으로 반쪽).
  const [adminGuard, setAdminGuard] = useState(null);
  // M5.21: PORT-MIS 입출항 데이터 (Chrome 확장이 저장 — 호출부호로 매칭)
  const [portMisData, setPortMisData] = useState({});
  // M3.6: 자동 로그인 제거 - 매번 검수원 입력
  const [inspector, setInspector] = useState('');
  const [showInspectorModal, setShowInspectorModal] = useState(true);
  const [showStaffManager, setShowStaffManager] = useState(false);  // M5.73
  const [online, setOnline] = useState(true);
  const [globalDetail, setGlobalDetail] = useState(null);
  // M3.6: 인사 모달
  const [greeting, setGreeting] = useState(null);  // {type: 'login'|'logout', lines, voice, ...}
  const [weather, setWeather] = useState(null);
  const [heartbeat, setHeartbeat] = useState(null);  // V8.40: 수집기 하트비트
  // V9.05: 공유 정본보다 오래된 로컬 베이사전 사본 목록 (관리자 승인 후 갱신)
  const [bayDictSyncPending, setBayDictSyncPending] = useState([]);

  useEffect(() => {
    const u1 = fbSubscribeVoyages((v) => { setVoyages(v); setVoyagesLoaded(true); });
    const u2 = fbSubscribeInspectors(setInspectors);
    const unsub2 = fbSubscribeStaffList(setExtraStaff);
    const unsub3 = fbSubscribeDeletedStaff(setDeletedStaff);
    const u3 = fbSubscribeConnection(setOnline);
    const u4 = fbSubscribePortMis(setPortMisData);  // M5.21: PORT-MIS 데이터
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
      // ── V9.05: 조용한 자동 덮어쓰기 제거 (관리자 원칙: 매트릭스는 앱이 스스로 수정 금지) ──
      //   기존 M6.94.20 자동 머지는 ①타임스탬프 비교가 NaN(ISO 문자열)으로 깨져 있었고
      //   ②알림·이력 없이 로컬 user 사전을 덮어썼다 (2026-07-21 SWAT 사건 계기 재설계).
      //   이제는 "공유 정본이 로컬 사본보다 최신"인 항목을 탐지만 하고,
      //   관리자가 배너에서 승인해야 applyApprovedSync로 반영한다.
      //   (오프라인 조회는 gm_fb_baydict_cache 폴백이 있어 자동 머지 없이도 동작.)
      try {
        const fb = data || {};
        const local = loadUserBayDict() || {};
        const pending = [];
        for (const code of Object.keys(fb)) {
          const e = fb[code];
          const isUser =
            e?.source === 'user' || e?.bayDef?.source === 'user' ||
            e?._userOwned === true || e?.bayDef?._userOwned === true;
          if (!isUser || !e?.bayDef) continue;
          const cur = local[code];
          if (!cur) continue;   // 로컬에 사본이 없으면 FB 폴백 조회 — 문제 없음
          if (entryTimestamp(e) > entryTimestamp(cur)) pending.push(code);
        }
        setBayDictSyncPending(pending);
      } catch (err) {
        console.error('[App] 베이사전 정본 대조 실패', err);
      }
    });
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    let alive = true;
    fbGetAdminGuard().then(g => { if (alive) setAdminGuard(g); }).catch(() => {});
    return () => { alive = false; };
  }, [inspector]);
  const isAdmin = isAdminName(adminGuard, inspector);

  // V9.05: 관리자 승인 시 공유 정본을 로컬 사본에 반영
  const handleApproveBayDictSync = useCallback(() => {
    const codes = bayDictSyncPending;
    if (!codes || codes.length === 0) return;
    const okGo = window.confirm(`베이사전 로컬 사본 ${codes.length}건(${codes.join(', ')})을 공유 정본으로 갱신할까요?`);
    if (!okGo) return;
    const res = applyApprovedSync(window.__fbShipBayDict || {}, codes);
    if (res.ok && res.applied > 0) {
      setBayDictSyncPending([]);
      alert(`✅ ${res.applied}건 갱신 완료`);
    } else if (!res.ok) {
      alert('갱신 실패 — 권한 또는 저장 오류. 콘솔을 확인하세요.');
    }
  }, [bayDictSyncPending]);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      const v = h.match(/^#\/voyage\/([^/]+)/);
      if (v) setRoute({ name: 'voyage', voyageKey: decodeURIComponent(v[1]) });
      else if (h === '#/search') setRoute({ name: 'search' });
      else if (h === '#/chief') setRoute({ name: 'chief' });
      else if (h === '#/health') setRoute({ name: 'health' });  // V8.40: 항차 건강 점검
      else if (h.startsWith('#/food')) setRoute({ name: 'food' });  // V8.60: 맛집
      else setRoute({ name: 'home' });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // 뒤로가기 가로채기 - 홈에서 뒤로가기 누르면 앱 종료 막기
  useEffect(() => {
    if (route.name !== 'home') return;
    // 홈일 때만 가짜 history 추가 → 뒤로가기 시 그냥 홈에 머무름
    const handler = () => {
      // 홈에서 뒤로가기 누름 → 다시 홈으로 강제
      if (window.location.hash !== '' && window.location.hash !== '#/') {
        // 다른 페이지로 이동된 경우는 무시 (정상 라우팅)
        return;
      }
      // 가짜 항목 다시 추가
      window.history.pushState({ home: true }, '', '#/');
    };
    // 진입 시 1번 가짜 항목 추가
    window.history.pushState({ home: true }, '', '#/');
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [route.name]);

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

  // M6.42: STOWAGE PDF는 영구 보관 — 시간 기반 자동 폐기 제거
  //   비용 분석: 300척 × 3MB = 900MB → 월 ₩25 (매우 적음)
  //   사용자 결정: 자동 폐기보다 라이브러리로 영구 보관이 더 가치 있음
  //   같은 선박 새 PDF 등록 시 이전 자동 삭제 (덮어쓰기) 정책은 유지 — fbUploadStowagePdf 내부 로직

  const handleSelectInspector = useCallback(async (name) => {
    setInspector(name);
    _storage.set(SK.activeInspector, name);
    await fbSetInspector(name);
    setShowInspectorModal(false);
    // M3.6: 로그인 시각 저장 + 날씨 + 인사
    saveLoginTime(name);
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

  // M3.6: 로그아웃 처리
  const handleLogout = useCallback(async () => {
    if (!inspector) return;
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
      // 실제 로그아웃 진행
      clearLoginTime();
      _storage.set(SK.activeInspector, '');
      setInspector('');
      setShowInspectorModal(true);
    }
    setGreeting(null);
  }, [greeting]);

  const navigate = useCallback((target) => {
    if (target === 'home') window.location.hash = '';
    else if (target === 'search') window.location.hash = '#/search';
    else if (target === 'chief') window.location.hash = '#/chief';
    else if (target === 'health') window.location.hash = '#/health';  // V8.40
    else if (target === 'food') window.location.hash = '#/food';      // V8.60
    else if (target.voyageKey) window.location.hash = `#/voyage/${encodeURIComponent(target.voyageKey)}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <UpdatePrompt/>
      <Header
        version={APP_VERSION}
        inspector={inspector}
        online={online}
        route={route}
        voyages={voyages}
        onChangeInspector={() => setShowInspectorModal(true)}
        onOpenStaffManager={isAdmin ? () => setShowStaffManager(true) : null}
        onGoHome={() => navigate('home')}
        onLogout={handleLogout}
      />

      <BroadcastMarquee inspector={inspector} />

      {/* V9.05: 베이사전 정본 갱신 대기 배너 — 관리자에게만, 승인해야 반영 */}
      {isAdmin && bayDictSyncPending.length > 0 && (
        <div className="bg-amber-900/60 border-b border-amber-600/50 text-amber-100 text-xs px-3 py-2 flex items-center justify-between gap-2">
          <span>📚 베이사전 로컬 사본 {bayDictSyncPending.length}건이 공유 정본보다 오래됨: {bayDictSyncPending.slice(0, 6).join(', ')}{bayDictSyncPending.length > 6 ? ' 외' : ''}</span>
          <button onClick={handleApproveBayDictSync} className="bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1 rounded flex-shrink-0">정본으로 갱신</button>
        </div>
      )}
      <main className="pb-20">
        {route.name === 'home' && (
          <HomePage
            voyages={voyages} inspectors={inspectors} inspector={inspector}
            portMisData={portMisData}
            onOpenVoyage={(voyageKey, mode) => navigate(mode ? { voyageKey, mode } : { voyageKey })}
            onOpenGlobalSearch={() => navigate('search')}
            onOpenChiefDashboard={() => navigate('chief')}
            heartbeat={heartbeat}
            onOpenHealth={() => navigate('health')}
            onOpenFood={() => navigate('food')}
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
        {route.name === 'search' && (
          <GlobalSearchPage
            voyages={voyages}
            onOpenContainer={(c) => setGlobalDetail(c)}
            onGoHome={() => navigate('home')}
          />
        )}
        {route.name === 'chief' && (
          <ChiefDashboard
            voyages={voyages} inspectors={inspectors} inspector={inspector}
            onOpenVoyage={(voyageKey, mode) => navigate(mode ? { voyageKey, mode } : { voyageKey })}
            onGoHome={() => navigate('home')}
          />
        )}
        {route.name === 'voyage' && (
          voyages[route.voyageKey] ? (
          <VoyagePage
            initModeOverride={route.mode || null}
            voyageKey={route.voyageKey}
            voyage={voyages[route.voyageKey]}
            inspector={inspector}
            inspectors={inspectors}
            portMisData={portMisData}
            onGoHome={() => navigate('home')}
            onModeChange={(mode) => setRoute(r => ({ ...r, mode }))}
          />
          ) : voyagesLoaded ? (
            <div className="max-w-3xl mx-auto px-3 py-16 text-center text-slate-400">
              항차를 찾을 수 없습니다.
              <div className="mt-3"><button onClick={() => navigate('home')} className="px-4 py-2 bg-slate-800 rounded text-slate-200">홈으로</button></div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 py-16 text-center text-slate-400">항차 불러오는 중…</div>
          )
        )}
      </main>

      <footer className="text-center text-[11px] text-slate-600 pb-24 pt-4 leading-relaxed">
        © 2026 (주)그린마린(Green Marine) · 개발 연지아빠 · 저작권은 개발자 연지아빠에게 있습니다<br/>
        <span className="opacity-70">{APP_VERSION}</span>
      </footer>

      {showInspectorModal && (
        <InspectorModal
          current={inspector}
          inspectors={inspectors}
          extraStaff={extraStaff}
          deletedStaff={deletedStaff}
          onSelect={handleSelectInspector}
          onClose={() => inspector && setShowInspectorModal(false)}
        />
      )}

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
