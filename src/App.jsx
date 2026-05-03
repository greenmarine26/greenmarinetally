// 그린마린 평택항 검수 — Master V1
// 양하 + 선적 통합, 다크 테마, Firebase 실시간 동기화
import React, { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, _storage, SK } from './utils.js';
import {
  fbSubscribeVoyages, fbSubscribeInspectors, fbSetInspector,
  fbSubscribeConnection, fbSetInspectorActivity
} from './firebase.js';
import HomePage from './pages/HomePage.jsx';
import VoyagePage from './pages/VoyagePage.jsx';
import Header from './components/Header.jsx';
import InspectorModal from './components/InspectorModal.jsx';

export default function App() {
  // 라우팅: 'home' | 'voyage'
  const [route, setRoute] = useState({ name: 'home' });
  const [voyages, setVoyages] = useState({});       // 전체 항차 데이터
  const [inspectors, setInspectors] = useState({}); // 등록된 검수원
  const [inspector, setInspector] = useState(_storage.get(SK.activeInspector) || '');
  const [showInspectorModal, setShowInspectorModal] = useState(!_storage.get(SK.activeInspector));
  const [online, setOnline] = useState(true);

  // Firebase 구독
  useEffect(() => {
    const unsub1 = fbSubscribeVoyages(setVoyages);
    const unsub2 = fbSubscribeInspectors(setInspectors);
    const unsub3 = fbSubscribeConnection(setOnline);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // URL hash 라우팅 (#/voyage/XINTAIPING_0521W → 항차 페이지)
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      const m = h.match(/^#\/voyage\/([^/]+)/);
      if (m) setRoute({ name: 'voyage', voyageKey: decodeURIComponent(m[1]) });
      else setRoute({ name: 'home' });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // 검수원 활동 갱신 (5초마다)
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
  }, []);

  const navigate = useCallback((target) => {
    if (target === 'home') {
      window.location.hash = '';
    } else if (target.voyageKey) {
      window.location.hash = `#/voyage/${encodeURIComponent(target.voyageKey)}`;
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        version={APP_VERSION}
        inspector={inspector}
        online={online}
        route={route}
        voyages={voyages}
        onChangeInspector={() => setShowInspectorModal(true)}
        onGoHome={() => navigate('home')}
      />

      <main className="pb-20">
        {route.name === 'home' && (
          <HomePage
            voyages={voyages}
            inspectors={inspectors}
            inspector={inspector}
            onOpenVoyage={(voyageKey) => navigate({ voyageKey })}
          />
        )}

        {route.name === 'voyage' && (
          <VoyagePage
            voyageKey={route.voyageKey}
            voyage={voyages[route.voyageKey] || null}
            inspector={inspector}
            inspectors={inspectors}
            onGoHome={() => navigate('home')}
            onModeChange={(mode) => setRoute(r => ({ ...r, mode }))}
          />
        )}
      </main>

      {showInspectorModal && (
        <InspectorModal
          current={inspector}
          inspectors={inspectors}
          onSelect={handleSelectInspector}
          onClose={() => inspector && setShowInspectorModal(false)}
        />
      )}
    </div>
  );
}
