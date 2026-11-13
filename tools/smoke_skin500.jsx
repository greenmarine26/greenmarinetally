// 5.00 화면 고르기 연막검사용 하네스 — 실 Firebase 대신 메모리 스텁, 주요 화면·창을 픽스처로 하나씩 그린다(tools/smoke_skin500.cjs 가 번들해 쓴다).
import React from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../src/components/Header.jsx';
import HomePage from '../src/pages/HomePage.jsx';
import VoyagePage from '../src/pages/VoyagePage.jsx';
import ChiefDashboard from '../src/pages/ChiefDashboard.jsx';
import LoginPage from '../src/pages/LoginPage.jsx';
import GlobalSearchPage from '../src/pages/GlobalSearchPage.jsx';
import OwnerPage from '../src/pages/OwnerPage.jsx';
import AuxPage from '../src/pages/AuxPage.jsx';
import HealthPage from '../src/pages/HealthPage.jsx';
import DataCenterPage from '../src/pages/DataCenterPage.jsx';
import ContainerDetailModal from '../src/components/ContainerDetailModal.jsx';
import DisplaySettingsModal from '../src/components/DisplaySettingsModal.jsx';
import HelpModal from '../src/components/HelpModal.jsx';
import ConfirmModal from '../src/components/ConfirmModal.jsx';
import { APP_VERSION } from '../src/utils.js';
import ErrorBoundary from '../src/components/ErrorBoundary.jsx';
import { setMirDock, setMirOpener } from '../src/faceDock.js';   // 5.00-02: 수석 상황판 미르 줄 — 시트가 있는 것처럼(ready) 세우고 여닫이 부름을 센다
import UpdatePrompt from '../src/components/UpdatePrompt.jsx';
import GreetingModal from '../src/components/GreetingModal.jsx';
import { showToast } from '../src/toast.js';
import { SkinIntro as _SkinIntro } from '../src/components/SkinIntro.jsx';
import { setActiveWorkChoice } from '../src/workChoice.js';
import { SkinIntro } from '../src/components/SkinIntro.jsx';

let root = null;
const noop = () => {};
const shell = (route, voyages, inspector, wc, page) => React.createElement('div', { className: 'min-h-screen bg-ink-950 text-dim-100' },
  React.createElement(Header, { version: APP_VERSION, inspector, online: true, route: { name: route }, voyages, workChoice: wc, onChangeWork: noop, onChangeInspector: noop, onOpenStaffManager: null, onGoHome: noop, onOpenAux: noop, onLogout: noop }),
  React.createElement('main', { className: 'pb-20', 'data-app-main': '1' }, page));

window.__H = {
  unmount() { if (root) { root.unmount(); root = null; } },
  mount(name, p) {
    const voyages = p.voyages || {};
    const wc = { mode: 'work', voyageKey: p.voyKey || '' };
    setActiveWorkChoice(wc);
    const insp = p.inspector || '김성일';
    let el = null;
    if (name === 'login') el = React.createElement('div', { className: 'min-h-screen bg-ink-950 text-dim-100' }, React.createElement(LoginPage, { inspectors: p.inspectors, voyages, onSelect: noop, extraStaff: {}, deletedStaff: {} }));
    else if (name === 'home') el = shell('home', voyages, insp, wc, React.createElement(HomePage, { voyages, inspectors: p.inspectors, inspector: insp, portMisData: p.pm, pilotForecast: p.pf, heartbeat: p.hb, onRefreshData: noop, refreshing: false, refreshedAt: 0, onOpenVoyage: noop, onOpenChiefDashboard: noop, onOpenAux: noop }));
    else if (name === 'voyage') { const v = voyages[p.voyKey]; el = shell('voyage', voyages, insp, wc, React.createElement(VoyagePage, { voyageKey: p.voyKey, voyage: v, inspector: insp, inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome: noop, onModeChange: noop, initModeOverride: p.mode })); }
    else if (name === 'chief' && (setMirOpener((from) => { window.__mirOpened = (window.__mirOpened || []).concat(from); }), setMirDock({ ready: true }), false)) el = null;
    else if (name === 'chief') el = shell('chief', voyages, insp, wc, React.createElement(ChiefDashboard, { voyages, inspectors: p.inspectors, inspector: insp, collectorHb: p.hb, pilotForecast: {}, portMisData: {}, onRefreshData: noop, refreshing: false, refreshedAt: 0, onOpenVoyage: noop, onGoHome: noop, onMirPlan: noop, onOpenGlobalSearch: noop, onOpenStaffManager: null }));
    else if (name === 'search') el = shell('search', voyages, insp, wc, React.createElement(GlobalSearchPage, { voyages, onOpenContainer: noop, portMisData: {}, heartbeat: p.hb, isChief: true, initialQuery: p.q || '' }));
    else if (name === 'owner') el = shell('owner', voyages, insp, wc, React.createElement(OwnerPage, { inspector: insp, voyages, onGoHome: noop, onGoChief: noop, onOpenStaffManager: noop }));
    else if (name === 'aux') el = shell('aux', voyages, insp, wc, React.createElement(AuxPage, { inspector: insp, isChief: true, isOwner: true, voyages, collectorHb: p.hb }));
    else if (name === 'health') el = shell('health', voyages, insp, wc, React.createElement(HealthPage, { voyages, heartbeat: p.hb, onOpenVoyage: noop }));
    else if (name === 'data') el = shell('data', voyages, insp, wc, React.createElement(DataCenterPage, { voyages, onDo: noop }));
    else if (name === 'card') {
      const v = voyages[p.voyKey]; const sec = v[p.mode]; const c = sec.ediContainers[p.cn];
      el = shell('voyage', voyages, insp, wc, React.createElement(ContainerDetailModal, { c, comp: null, isXray: false, mode: p.mode, voyageKey: p.voyKey, voyageInfo: v.info, inspector: insp, onClose: noop, allContainers: Object.values(sec.ediContainers), records: sec.records || {} }));
    }
    else if (name === 'display') el = shell('home', voyages, insp, wc, React.createElement(DisplaySettingsModal, { open: true, onClose: noop }));
    else if (name === 'help') el = shell('home', voyages, insp, wc, React.createElement(HelpModal, { open: true, onClose: noop, inspector: insp }));
    else if (name === 'intro') el = shell('home', voyages, insp, wc, React.createElement(SkinIntro, { onDone: noop }));
    else if (name === 'empty') el = shell('home', {}, insp, wc, React.createElement(HomePage, { voyages: {}, inspectors: p.inspectors, inspector: insp, portMisData: {}, pilotForecast: {}, heartbeat: p.hb, onRefreshData: noop, refreshing: false, refreshedAt: 0, onOpenVoyage: noop, onOpenChiefDashboard: noop, onOpenAux: noop }));
    else if (name === 'crash') { const Boom = () => { throw new Error('연막 — 일부러 낸 오류'); }; el = shell('home', voyages, insp, wc, React.createElement(ErrorBoundary, { name: '항차 화면', reloadButton: true }, React.createElement(Boom))); }
    else if (name === 'toast') { el = shell('home', voyages, insp, wc, React.createElement(HomePage, { voyages, inspectors: p.inspectors, inspector: insp, portMisData: p.pm, pilotForecast: p.pf, heartbeat: p.hb, onRefreshData: noop, refreshing: false, refreshedAt: 0, onOpenVoyage: noop, onOpenChiefDashboard: noop, onOpenAux: noop })); setTimeout(() => { showToast('저장했습니다'); showToast('저장 실패 — 다시 눌러 주세요', { error: true }); }, 50); }
    else if (name === 'intro2') el = shell('home', voyages, insp, wc, React.createElement(_SkinIntro, { onDone: noop }));
    else if (name === 'update') {
      //  새 버전 띠 — 대기 중인 서비스워커를 흉내 낸다(버전을 물으면 다음 판을 답한다). 실제 등록·새로고침은 없다.
      const fakeSW = { state: 'installed', addEventListener() {}, postMessage(msg, ports) { if (ports && ports[0]) ports[0].postMessage({ version: 'TallyOne 9.99', note: '연막 — 새 판 시험 문구입니다' }); } };
      try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: () => Promise.resolve({ waiting: fakeSW, installing: null, addEventListener() {}, update: () => Promise.resolve() }), addEventListener() {}, removeEventListener() {}, controller: {} } }); } catch (e) { console.warn('서비스워커 흉내 실패', e); }
      el = shell('home', voyages, insp, wc, React.createElement(React.Fragment, null, React.createElement(UpdatePrompt, { inspector: insp }), React.createElement(HomePage, { voyages, inspectors: p.inspectors, inspector: insp, portMisData: p.pm, pilotForecast: p.pf, heartbeat: p.hb, onRefreshData: noop, refreshing: false, refreshedAt: 0, onOpenVoyage: noop, onOpenChiefDashboard: noop, onOpenAux: noop })));
    }
    else if (name === 'greet') el = shell('home', voyages, insp, wc, React.createElement(GreetingModal, { type: p.gtype || 'login', lines: ['안녕하세요 김성일 검수사님.', '오늘 작업 2척입니다.'], workForecast: null, onClose: noop }));
    else if (name === 'confirm') el = shell('home', voyages, insp, wc, React.createElement(ConfirmModal, { open: true, title: '양하 완료로 표시합니까?', message: 'OBWH 2763E 양하를 완료로 표시합니다. 되돌릴 수 있습니다.', confirmText: '완료 표시', cancelText: '취소', onConfirm: noop, onCancel: noop }));
    if (!root) root = createRoot(document.getElementById('root'));
    root.render(el);
  },
};
