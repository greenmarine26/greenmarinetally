// 그린마린 평택항 검수 — Master V1.1
import React, { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, _storage, SK } from './utils.js';
import {
  fbSubscribeVoyages, fbSubscribeInspectors, fbSetInspector,
  fbSubscribeConnection, fbSetInspectorActivity, fbSubscribePortMis,
  fbSubscribeStaffList, fbSubscribeDeletedStaff
} from './firebase.js';
import HomePage from './pages/HomePage.jsx';
import VoyagePage from './pages/VoyagePage.jsx';
import GlobalSearchPage from './pages/GlobalSearchPage.jsx';
import ChiefDashboard from './pages/ChiefDashboard.jsx';
import Header from './components/Header.jsx';
import InspectorModal from './components/InspectorModal.jsx';
import StaffManagerModal from './components/StaffManagerModal.jsx';
import GreetingModal from './components/GreetingModal.jsx';
import { fetchPyeongtaekWeather, buildGreetingMessage, buildFarewellMessage, speakGreeting, saveLoginTime, getLoginTime, clearLoginTime } from './greeting.js';
import ContainerDetailModal from './components/ContainerDetailModal.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';

export default function App() {
  const [route, setRoute] = useState({ name: 'home' });
  const [voyages, setVoyages] = useState({});
  const [inspectors, setInspectors] = useState({});
  const [extraStaff, setExtraStaff] = useState({});
  const [deletedStaff, setDeletedStaff] = useState({});  // M5.74: 퇴사자 마커  // M5.62: 김성일이 추가한 동적 명단
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

  useEffect(() => {
    const u1 = fbSubscribeVoyages(setVoyages);
    const u2 = fbSubscribeInspectors(setInspectors);
    const unsub2 = fbSubscribeStaffList(setExtraStaff);
    const unsub3 = fbSubscribeDeletedStaff(setDeletedStaff);
    const u3 = fbSubscribeConnection(setOnline);
    const u4 = fbSubscribePortMis(setPortMisData);  // M5.21: PORT-MIS 데이터
    return () => { u1(); u2(); u3(); u4(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      const v = h.match(/^#\/voyage\/([^/]+)/);
      if (v) setRoute({ name: 'voyage', voyageKey: decodeURIComponent(v[1]) });
      else if (h === '#/search') setRoute({ name: 'search' });
      else if (h === '#/chief') setRoute({ name: 'chief' });
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
        onOpenStaffManager={inspector === '김성일' ? () => setShowStaffManager(true) : null}
        onGoHome={() => navigate('home')}
        onLogout={handleLogout}
      />

      <main className="pb-20">
        {route.name === 'home' && (
          <HomePage
            voyages={voyages} inspectors={inspectors} inspector={inspector}
            onOpenVoyage={(voyageKey) => navigate({ voyageKey })}
            onOpenGlobalSearch={() => navigate('search')}
            onOpenChiefDashboard={() => navigate('chief')}
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
            voyages={voyages} inspectors={inspectors}
            onOpenVoyage={(voyageKey) => navigate({ voyageKey })}
            onGoHome={() => navigate('home')}
          />
        )}
        {route.name === 'voyage' && (
          <VoyagePage
            voyageKey={route.voyageKey}
            voyage={voyages[route.voyageKey] || null}
            inspector={inspector}
            inspectors={inspectors}
            portMisData={portMisData}
            onGoHome={() => navigate('home')}
            onModeChange={(mode) => setRoute(r => ({ ...r, mode }))}
          />
        )}
      </main>

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
