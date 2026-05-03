// 그린마린 평택항 검수 — Master V1.1
import React, { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, _storage, SK } from './utils.js';
import {
  fbSubscribeVoyages, fbSubscribeInspectors, fbSetInspector,
  fbSubscribeConnection, fbSetInspectorActivity
} from './firebase.js';
import HomePage from './pages/HomePage.jsx';
import VoyagePage from './pages/VoyagePage.jsx';
import GlobalSearchPage from './pages/GlobalSearchPage.jsx';
import ChiefDashboard from './pages/ChiefDashboard.jsx';
import Header from './components/Header.jsx';
import InspectorModal from './components/InspectorModal.jsx';
import ContainerDetailModal from './components/ContainerDetailModal.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';

export default function App() {
  const [route, setRoute] = useState({ name: 'home' });
  const [voyages, setVoyages] = useState({});
  const [inspectors, setInspectors] = useState({});
  const [inspector, setInspector] = useState(_storage.get(SK.activeInspector) || '');
  const [showInspectorModal, setShowInspectorModal] = useState(!_storage.get(SK.activeInspector));
  const [online, setOnline] = useState(true);
  const [globalDetail, setGlobalDetail] = useState(null);

  useEffect(() => {
    const u1 = fbSubscribeVoyages(setVoyages);
    const u2 = fbSubscribeInspectors(setInspectors);
    const u3 = fbSubscribeConnection(setOnline);
    return () => { u1(); u2(); u3(); };
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
        onGoHome={() => navigate('home')}
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

      {globalDetail && (() => {
        const v = voyages[globalDetail.voyageKey];
        if (!v) return null;
        const sec = v[globalDetail.mode];
        const xrayMap = sec?.xrayList || {};
        const compMap = sec?.completed || {};
        const xraySeals = sec?.xraySeals || {};
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
          />
        );
      })()}
    </div>
  );
}
