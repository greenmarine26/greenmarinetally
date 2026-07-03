import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ArrowDown, ArrowUp, Trash2, Users, ChevronRight, Search, BarChart3, MapPin, Loader2, Anchor, CheckCircle, X } from 'lucide-react';
import { fbCreateVoyage, fbDeleteVoyage, fbDeleteSection, fbSavePierCoord, fbSubscribePierCoords, fbUpdateVoyageInfo, fbArchiveVoyageBeforeDelete } from '../firebase.js';
import { detectPierByGps, getPierFromBerth, APP_VERSION, formatBerth, savePierCoord, getStoredPierCoords, isValidBerth, isPyeongtaekPort } from '../utils.js';
import PortMisCaptureModal from '../components/PortMisCaptureModal.jsx';

// 항차의 마지막 작업 활동 시각(ms). 활동 증거가 하나도 없으면 0 반환 → 자동삭제 대상 제외.
//   V8.01: 자동삭제 기준을 createdAt → 작업 활동 시각으로 바꾸기 위한 공용 헬퍼.
//   HomePage(삭제 판정)와 VoyageCard("곧 자동삭제" 표시) 양쪽에서 동일 기준으로 쓴다.
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
  return last;
}

export default function HomePage({ voyages, inspectors, inspector, portMisData = {}, onOpenVoyage, onOpenGlobalSearch, onOpenChiefDashboard }) {
  const [showCreate, setShowCreate] = useState(null); // 'discharge' | 'loading'
  const [vsl, setVsl] = useState('');
  const [voy, setVoy] = useState('');
  const [showPortMisCapture, setShowPortMisCapture] = useState(false);  // M5.25
  // M5.82: GPS 기반 현 부두 자동 판별
  const [currentPier, setCurrentPier] = useState(null);    // { code, distance, name }
  const [gpsState, setGpsState] = useState('idle');         // 'idle' | 'loading' | 'denied' | 'ok' | 'far'
  const [pierFilter, setPierFilter] = useState('auto');     // 'auto' | 'PCTC' | 'PNCT' | 'all'
  // M6.17: 현재 GPS 좌표 (부두 좌표 등록용)
  const [currentCoord, setCurrentCoord] = useState(null);   // { lat, lng }
  const [pierRegisterState, setPierRegisterState] = useState({ msg: '', error: false });
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
          await fbDeleteVoyage(key);
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
          const { pier, coord, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setCurrentPier(pier);
            setCurrentCoord(coord || null);
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
        setCurrentCoord(coord);
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

  // M6.17: 현재 위치를 부두 좌표로 등록 (검수원이 현장에서 직접)
  const handleRegisterPier = async (code) => {
    if (!currentCoord) {
      setPierRegisterState({ msg: 'GPS 좌표 없음 — 먼저 [위치 다시 측정]', error: true });
      return;
    }
    if (!confirm(`현재 위치(${currentCoord.lat.toFixed(5)}, ${currentCoord.lng.toFixed(5)})를\n${code} 부두 좌표로 등록하시겠습니까?\n\n모든 검수원에게 즉시 공유됩니다.`)) {
      return;
    }
    const saved = savePierCoord(code, currentCoord.lat, currentCoord.lng, inspector || '');
    if (!saved) {
      setPierRegisterState({ msg: '저장 실패', error: true });
      return;
    }
    try {
      await fbSavePierCoord(code, saved);
      setPierRegisterState({ msg: `✅ ${code} 등록 완료 + Firebase 동기화`, error: false });
    } catch (e) {
      setPierRegisterState({ msg: `⚠️ localStorage 저장됨 (Firebase 동기화 실패)`, error: false });
    }
    // GPS 캐시 무효화 → 재측정
    try { localStorage.removeItem('gm_current_pier'); } catch {}
    setTimeout(() => measureGps(true), 500);
    setTimeout(() => setPierRegisterState({ msg: '', error: false }), 4000);
  };

  // M5.82: GPS로 현 부두 판별 (한 번만)
  useEffect(() => {
    measureGps(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // M5.82: 항차마다 부두 정보 매칭
  //   M5.82 hotfix: PORT-MIS를 voyage.info보다 우선 (더 최신 데이터)
  //                 선박이 부두를 옮기면 PORT-MIS 갱신만으로 즉시 반영
  const voyagesWithPier = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        const info = v.info || {};
        // PORT-MIS에서 매칭 시도 — 우선
        const callsign = info.callsign || '';
        const imo = info.imo || '';
        const vsl = (info.vsl || '').toUpperCase();
        let pm = null;
        if (callsign && portMisData[callsign]) pm = portMisData[callsign];
        if (!pm && callsign) {
          const cs = callsign.toUpperCase();
          pm = Object.values(portMisData).find(p => {
            const pcs = (p.callsign || '').toUpperCase();
            return pcs && pcs.length >= 4 && (pcs.startsWith(cs) || cs.startsWith(pcs));
          });
        }
        if (!pm && imo) pm = Object.values(portMisData).find(p => p.imo === imo);
        if (!pm && vsl) {
          const normVsl = vsl.replace(/[\s\-_\.]/g, '');
          pm = Object.values(portMisData).find(p => {
            const pn = (p.vesselName || '').toUpperCase().replace(/[\s\-_\.]/g, '');
            return pn && pn.length >= 5 && (pn.includes(normVsl.slice(0, 5)) || normVsl.includes(pn.slice(0, 5)));
          });
        }
        // PORT-MIS 우선, 없으면 voyage.info 폴백
        // M6.18: 잘못된 berth 형식 (MBM 등) 필터링 — 표시 + 자동 정리
        const rawBerth = (pm && pm.berth) || info.berth || '';
        const berth = isValidBerth(rawBerth) ? rawBerth : '';
        const pier = (pm && pm.pier) || info.pier || getPierFromBerth(berth) || '';
        return { key: k, ...v, _berth: berth, _pier: pier, _rawBerth: rawBerth };
      })
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages, portMisData]);

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
  const effectivePier = pierFilter === 'auto' ? currentPier?.code : (pierFilter === 'all' ? null : pierFilter);
  const list = useMemo(() => {
    if (!effectivePier) return voyagesWithPier;
    // 현 부두 위로
    const here = voyagesWithPier.filter(v => v._pier === effectivePier);
    const others = voyagesWithPier.filter(v => v._pier !== effectivePier);
    return [...here, ...others];
  }, [voyagesWithPier, effectivePier]);

  const activeInspectors = useMemo(() => {
    const out = {};
    Object.values(inspectors || {}).forEach(i => {
      if (!i || !i.lastVoyage || !i.lastActive) return;
      if (i.loggedIn === false) return;              // V7.94-14: 로그아웃 마킹 제외
      if (Date.now() - i.lastActive > 90000) return; // 90초 이내만
      if (!out[i.lastVoyage]) out[i.lastVoyage] = [];
      out[i.lastVoyage].push({ name: i.name, mode: i.lastMode });
    });
    return out;
  }, [inspectors]);

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
    setDeleteTarget({ key, vsl, voy, hasD, hasL });
  };

  const performDelete = async (action) => {
    if (!deleteTarget) return;
    const { key } = deleteTarget;
    if (action === 'discharge') await fbDeleteSection(key, 'discharge');
    else if (action === 'loading') await fbDeleteSection(key, 'loading');
    else if (action === 'all') await fbDeleteVoyage(key);
    setDeleteTarget(null);
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

  return (
    <div className="max-w-6xl mx-auto px-3 py-3">
      {/* 그린마린 검수팀 전용 배지 */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-teal-900/30 to-cyan-900/30 border border-emerald-700/40 rounded-lg px-3 py-2 mb-3 text-center">
        <div className="text-[10px] text-emerald-400 font-bold tracking-wider">🌊 GREEN MARINE TALLY 🌊 <span className="text-amber-300 ml-1">{APP_VERSION}</span></div>
        <div className="text-xs text-emerald-200 font-bold">그린마린 검수팀 전용 · 평택항</div>
      </div>

      {/* 빠른 진입 - 통합검색 + 수석대시보드 + PORT-MIS 캡처 (M5.25) */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button onClick={onOpenGlobalSearch}
          className="bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-700/40 rounded-xl p-3 text-left hover:from-amber-900/60 active:scale-95 transition">
          <Search className="w-5 h-5 text-amber-300 mb-1"/>
          <div className="font-bold text-sm text-amber-100">통합 검색</div>
          <div className="text-[10px] text-amber-300/70">모든 항차·양/선적</div>
        </button>
        <button onClick={onOpenChiefDashboard}
          className="bg-gradient-to-br from-purple-900/40 to-purple-950/40 border border-purple-700/40 rounded-xl p-3 text-left hover:from-purple-900/60 active:scale-95 transition">
          <BarChart3 className="w-5 h-5 text-purple-300 mb-1"/>
          <div className="font-bold text-sm text-purple-100">수석 대시보드</div>
          <div className="text-[10px] text-purple-300/70">전체 검수원 진행률·통계</div>
        </button>
        <button onClick={() => setShowPortMisCapture(true)}
          className="bg-gradient-to-br from-cyan-900/40 to-cyan-950/40 border border-cyan-700/40 rounded-xl p-3 text-left hover:from-cyan-900/60 active:scale-95 transition">
          <span className="text-xl mb-1 block">📸</span>
          <div className="font-bold text-sm text-cyan-100">PORT-MIS 캡처</div>
          <div className="text-[10px] text-cyan-300/70">⚓ 입출항 자동 등록</div>
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="shrink-0">
          <div className="text-[10px] text-slate-500 letter-spacing-wide font-bold uppercase mb-0.5">진행 중인 항차</div>
          <div className="text-lg font-bold text-slate-100">{list.length}건</div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <button
            onClick={() => setShowCreate('discharge')}
            className="bg-blue-900/50 hover:bg-blue-800 border border-blue-700/50 text-blue-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5"/><ArrowDown className="w-3.5 h-3.5"/>양하
          </button>
          <button
            onClick={() => setShowCreate('loading')}
            className="bg-amber-900/50 hover:bg-amber-800 border border-amber-700/50 text-amber-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5"/><ArrowUp className="w-3.5 h-3.5"/>선적
          </button>
        </div>
      </div>

      {/* M5.82: 부두 필터 바 - GPS 자동 판별 + 수동 전환 / M6.17: 부두 좌표 등록 추가 */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {gpsState === 'loading' && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin"/> 위치 확인 중...
            </span>
          )}
          {gpsState === 'ok' && currentPier && (
            <span className="flex items-center gap-1.5">
              <MapPin className={`w-3.5 h-3.5 ${currentPier.code === 'PCTC' ? 'text-blue-300' : 'text-purple-300'}`}/>
              <span className={`font-bold ${currentPier.code === 'PCTC' ? 'text-blue-200' : 'text-purple-200'}`}>
                현 위치: {currentPier.code}
              </span>
              <span className="text-slate-500 text-[10px]">({currentPier.distance}m)</span>
            </span>
          )}
          {gpsState === 'far' && (
            <span className="flex items-center gap-1.5 text-amber-300">
              <MapPin className="w-3 h-3"/> 평택항 외부 (저장된 부두에서 5km 이상)
            </span>
          )}
          {gpsState === 'denied' && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3 h-3"/> 위치 안 씀 — 수동 선택 ▶
            </span>
          )}
          <div className="flex gap-1 ml-auto">
            {[
              { id: 'auto', label: '자동' },
              { id: 'PCTC', label: 'PCTC' },
              { id: 'PNCT', label: 'PNCT' },
              { id: 'all', label: '전체' },
            ].map(b => (
              <button key={b.id} onClick={() => setPierFilter(b.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pierFilter === b.id
                    ? (b.id === 'PCTC' ? 'bg-blue-700 text-white' :
                       b.id === 'PNCT' ? 'bg-purple-700 text-white' :
                       'bg-amber-600 text-slate-950')
                    : 'bg-slate-800 text-slate-400'
                }`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* M6.17: 현재 좌표 + 부두 등록 버튼 — '외부' 또는 잘못 잡힌 경우 사용 */}
        {(gpsState === 'far' || gpsState === 'ok') && currentCoord && (
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500 mono">
                현재 좌표: {currentCoord.lat.toFixed(5)}, {currentCoord.lng.toFixed(5)}
              </span>
              <button
                onClick={() => measureGps(true)}
                className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                🔄 다시 측정
              </button>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => handleRegisterPier('PCTC')}
                  className="text-[10px] px-2 py-1 bg-blue-900/60 hover:bg-blue-800/80 rounded text-blue-200 font-bold border border-blue-700/40"
                  title="현재 GPS 위치를 PCTC 부두 좌표로 등록"
                >
                  <Anchor className="w-3 h-3 inline mr-1"/>
                  여기를 PCTC로 등록
                </button>
                <button
                  onClick={() => handleRegisterPier('PNCT')}
                  className="text-[10px] px-2 py-1 bg-purple-900/60 hover:bg-purple-800/80 rounded text-purple-200 font-bold border border-purple-700/40"
                >
                  <Anchor className="w-3 h-3 inline mr-1"/>
                  여기를 PNCT로 등록
                </button>
              </div>
            </div>
            {pierRegisterState.msg && (
              <div className={`mt-1 text-[10px] font-bold ${pierRegisterState.error ? 'text-red-300' : 'text-emerald-300'}`}>
                {pierRegisterState.msg}
              </div>
            )}
            <div className="mt-1 text-[10px] text-slate-500">
              💡 '외부'로 잡히면 부두에서 위 버튼 클릭 → 좌표 자동 등록 (모든 검수원 공유)
            </div>
          </div>
        )}
      </div>

      {list.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <div className="text-slate-500 text-sm mb-2">진행 중인 항차가 없습니다</div>
          <div className="text-xs text-slate-600">위 + 양하 / + 선적 버튼으로 새 항차를 만드세요</div>
        </div>
      )}

      <div className="space-y-2">
        {list.map((v, idx) => {
          const isHerePier = effectivePier && v._pier === effectivePier;
          const isFirstHere = isHerePier && (idx === 0 || list[idx - 1]._pier !== effectivePier);
          const isFirstOther = effectivePier && !isHerePier && idx > 0 && list[idx - 1]._pier === effectivePier;
          return (
            <React.Fragment key={v.key}>
              {isFirstHere && effectivePier && (
                <div className={`text-[10px] font-bold uppercase tracking-wider px-2 ${
                  effectivePier === 'PCTC' ? 'text-blue-300' : 'text-purple-300'
                }`}>
                  📍 {effectivePier} (현 위치)
                </div>
              )}
              {isFirstOther && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mt-3">
                  ── 다른 부두 ──
                </div>
              )}
              <VoyageCard
                voyage={v}
                activeInspectors={activeInspectors[v.key] || []}
                onOpen={() => onOpenVoyage(v.key)}
                onDelete={() => handleDelete(v.key, v.info.vsl, v.info.voy)}
                onComplete={(mode) => setCompleteTarget({ key: v.key, vsl: v.info.vsl, voy: v.info.voy, mode })}
                inspectorDone={isAllDone(v)}
                modeDone={{
                  d: v.info?.inspectorDone || !!v.info?.dischargeDone,
                  l: v.info?.inspectorDone || !!v.info?.loadingDone,
                  hasD: !!(v.discharge && Object.keys(v.discharge).length),
                  hasL: !!(v.loading && Object.keys(v.loading).length),
                }}
                onUndoComplete={(mode) => undoInspectorDone(v.key, mode)}
              />
            </React.Fragment>
          );
        })}
      </div>

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

      {/* 항차 삭제 모달 (폰 친화) */}
      {deleteTarget && (
        <DeleteVoyageModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={performDelete}
        />
      )}

      {/* 완료 확인 모달 — 평택분 작업량 저장 후 삭제 */}
      {completeTarget && (() => {
        const v = voyages[completeTarget.key];
        // 항차 리스트와 동일 기준: 평택분(PTK)만 (타지역 제외)
        const dCnt = computeStats(v?.discharge, 'discharge').ptk;
        const lCnt = computeStats(v?.loading, 'loading').ptk;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setCompleteTarget(null)}>
            <div className="bg-slate-900 border border-emerald-700/50 rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400"/>
                <h3 className="text-lg font-bold text-slate-100">{completeTarget.mode === 'discharge' ? '⬇ 양하 완료' : '⬆ 선적 완료'}</h3>
              </div>
              <p className="text-sm text-slate-300 mb-1">{completeTarget.vsl} {completeTarget.voy}</p>
              <p className="text-sm text-slate-400 mb-3">이 항차의 <b className="text-emerald-300">{completeTarget.mode === 'discharge' ? '양하 작업' : '선적 작업'}</b>을 완료로 표시합니다 (완료 시각 기록). 자료는 삭제되지 않으며, 모든 작업이 완료되면 수석검수사가 최종 확인합니다.</p>
              <div className="bg-slate-800/60 rounded-lg p-3 mb-4 text-sm">
                {completeTarget.mode === 'discharge'
                  ? <div className="flex justify-between"><span className="text-blue-300">양하</span><span className="font-bold text-slate-100">{dCnt}대</span></div>
                  : <div className="flex justify-between"><span className="text-amber-300">선적</span><span className="font-bold text-slate-100">{lCnt}대</span></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCompleteTarget(null)} className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">취소</button>
                <button onClick={performComplete} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm">{completeTarget.mode === 'discharge' ? '양하 완료 표시' : '선적 완료 표시'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* M5.25: PORT-MIS 캡처 업로드 모달 */}
      {showPortMisCapture && (
        <PortMisCaptureModal onClose={() => setShowPortMisCapture(false)} />
      )}
    </div>
  );
}

// M3.5: 항차 삭제 모달 - 큰 버튼, 폰 친화
function DeleteVoyageModal({ target, onClose, onConfirm }) {
  const { vsl, voy, hasD, hasL } = target;
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
      all: { title: '항차 전체 삭제', desc: '양하/선적/검수 데이터 모두 삭제됩니다. 복구 불가.', color: 'red' },
    };
    const L = labels[confirming];
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4">
        <div className="bg-slate-900 border-2 border-red-700/50 rounded-2xl w-full sm:max-w-md overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-red-950/40">
            <div className="text-base font-black text-red-200">⚠️ {L.title}</div>
            <div className="text-xs text-slate-400 mt-1">{vsl} {voy}</div>
          </div>
          <div className="p-4">
            <div className="text-sm text-slate-200 mb-4">{L.desc}</div>
            <div className="text-xs text-slate-400">정말 진행하시겠습니까?</div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 border-t border-slate-700 bg-slate-950">
            <button onClick={() => setConfirming(null)}
              className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded"
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
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full sm:max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="text-base font-black text-slate-100">항차 삭제</div>
          <div className="text-xs text-slate-400 mt-1">{vsl} {voy}</div>
        </div>
        <div className="p-3 space-y-2">
          {showSplit && (
            <>
              {/* M3.74: 색깔 통일 - 양하=blue (VoyagePage 모드 탭과 일치) */}
              <button onClick={() => setConfirming('discharge')}
                className="w-full py-4 bg-blue-900/30 hover:bg-blue-900/50 border-2 border-blue-700/40 rounded-lg text-left px-4"
                style={{ minHeight: 56 }}>
                <div className="text-base font-bold text-blue-300">⬇️ 양하만 삭제</div>
                <div className="text-xs text-blue-400/70 mt-0.5">선적은 유지됩니다</div>
              </button>
              {/* M3.74: 색깔 통일 - 선적=amber */}
              <button onClick={() => setConfirming('loading')}
                className="w-full py-4 bg-amber-900/30 hover:bg-amber-900/50 border-2 border-amber-700/40 rounded-lg text-left px-4"
                style={{ minHeight: 56 }}>
                <div className="text-base font-bold text-amber-300">⬆️ 선적만 삭제</div>
                <div className="text-xs text-amber-400/70 mt-0.5">양하는 유지됩니다</div>
              </button>
            </>
          )}
          <button onClick={() => setConfirming('all')}
            className="w-full py-4 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-700/40 rounded-lg text-left px-4">
            <div className="text-base font-bold text-red-300">🗑 항차 전체 삭제</div>
            <div className="text-xs text-red-400/70 mt-0.5">
              {showSplit ? '양하 + 선적 + 정보 모두 삭제' : '모든 데이터 삭제'}
            </div>
          </button>
        </div>
        <div className="p-3 border-t border-slate-700">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function VoyageCard({ voyage, activeInspectors, onOpen, onDelete, onComplete, inspectorDone, modeDone, onUndoComplete }) {
  const dis = voyage.discharge;
  const loa = voyage.loading;

  const disStats = computeStats(dis, 'discharge');
  const loaStats = computeStats(loa, 'loading');

  // M5.82: 부두 정보 (voyage._pier가 HomePage에서 채워짐)
  const pier = voyage._pier || '';
  const berth = voyage._berth || '';

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden ${
      pier === 'PCTC' ? 'border-blue-700/40' :
      pier === 'PNCT' ? 'border-purple-700/40' :
      'border-slate-800'
    }`}>
      <button
        onClick={onOpen}
        className="w-full px-3 py-2.5 hover:bg-slate-800/50 flex items-center justify-between gap-2"
      >
        <div className="text-left min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-100 truncate">{voyage.info.vsl}</span>
            {/* M5.82: 부두 배지 */}
            {pier === 'PCTC' && (
              <span className="text-[9px] bg-blue-900/60 border border-blue-700/50 text-blue-200 px-1.5 py-0.5 rounded font-bold">
                📍 PCTC {berth ? `· ${formatBerth(berth)}` : ''}
              </span>
            )}
            {pier === 'PNCT' && (
              <span className="text-[9px] bg-purple-900/60 border border-purple-700/50 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                📍 PNCT {berth ? `· ${formatBerth(berth)}` : ''}
              </span>
            )}
            {!pier && berth && (
              <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                📍 {berth}
              </span>
            )}
            {/* V8.32: 수집기 자동 등록 항차 표시 — 수집중(가등록)/확정 */}
            {voyage.info?.autoRegistered && voyage.info?.autoStatus !== 'confirmed' && (
              <span className="text-[9px] bg-amber-900/60 border border-amber-700/50 text-amber-200 px-1.5 py-0.5 rounded font-bold">
                🤖 자동(수집중)
              </span>
            )}
            {voyage.info?.autoRegistered && voyage.info?.autoStatus === 'confirmed' && (
              <span className="text-[9px] bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 px-1.5 py-0.5 rounded font-bold">
                🤖 자동(확정)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {/* M6.45: voy_d / voy_l 다르면 둘 다 표시 (예: 0523E/0523W) */}
            {(() => {
              const d = voyage.info.voy_d, l = voyage.info.voy_l, v = voyage.info.voy;
              if (d && l && d !== l) return `${d} / ${l}`;
              return d || l || v || '';
            })()}
            {' · '}{voyage.info.carrier || ''}
          </div>
          {/* 작업일 표시 (수동/자동 삭제 구분용) */}
          {voyage.info.createdAt && (
            <div className="text-[10px] text-slate-600 mt-0.5">
              📅 {new Date(voyage.info.createdAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {(() => {
                // V8.01: '곧 자동삭제'는 실제 삭제 기준(마지막 작업 활동)과 일치시킨다.
                //   작업 활동이 없으면 자동삭제 대상이 아니므로 경고를 띄우지 않는다(불안 방지).
                const worked = lastWorkAt(voyage);
                const createdDays = Math.floor((Date.now() - voyage.info.createdAt) / 86400000);
                if (worked > 0) {
                  const workDays = Math.floor((Date.now() - worked) / 86400000);
                  if (workDays >= 7) return <span className="text-amber-500 ml-1">· 작업 {workDays}일 전 (곧 자동삭제)</span>;
                }
                if (createdDays >= 1) return <span className="ml-1">· {createdDays}일 전</span>;
                return <span className="ml-1">· 오늘</span>;
              })()}
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0"/>
      </button>

      <div className="px-3 pb-3 space-y-2">
        {dis && <SectionBar label="양하" color="blue" stats={disStats} onClick={onOpen}/>}
        {loa && <SectionBar label="선적" color="amber" stats={loaStats} onClick={onOpen}/>}
      </div>

      {(activeInspectors.length > 0 || onDelete) && (
        <div className="px-3 pb-2 flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 flex-1 min-w-0">
            {activeInspectors.length > 0 ? (
              <>
                <Users className="w-3 h-3 text-emerald-400"/>
                <span className="text-emerald-300 font-bold">●</span>
                <span className="truncate">{activeInspectors.map(a => a.name).join(', ')} 작업중</span>
              </>
            ) : <span className="text-slate-600">대기 중</span>}
          </div>
          <div className="flex items-center gap-1">
            {/* V7.90: 완료 분리 — 양하/선적 각각 완료 표시 (작업시간 구분 + 콘앱 분리작업 자동 판정 근거) */}
            {onComplete && inspectorDone && (
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-900/40 text-amber-300 text-[10px] font-bold border border-amber-700/40" title="모든 작업 완료 — 수석검수사 최종 확인 대기 중">
                <CheckCircle className="w-3.5 h-3.5"/>검수 완료 · 수석 대기
              </span>
            )}
            {onComplete && modeDone?.hasD && (
              modeDone.d ? (
                <button
                  onClick={(e) => { e.stopPropagation(); if (onUndoComplete) onUndoComplete('discharge'); }}
                  className="px-2 py-1 rounded bg-blue-900/40 text-blue-300 text-[10px] font-bold border border-blue-700/40"
                  title="양하 완료됨 — 누르면 취소 (수석 확인 전까지)"
                >⬇ 양하 ✓</button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete('discharge'); }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 text-[10px] font-bold border border-blue-800/40"
                  title="양하 작업 완료 표시 — 삭제 안 됨"
                >⬇ 양하 완료</button>
              )
            )}
            {onComplete && modeDone?.hasL && (
              modeDone.l ? (
                <button
                  onClick={(e) => { e.stopPropagation(); if (onUndoComplete) onUndoComplete('loading'); }}
                  className="px-2 py-1 rounded bg-amber-900/40 text-amber-300 text-[10px] font-bold border border-amber-700/40"
                  title="선적 완료됨 — 누르면 취소 (수석 확인 전까지)"
                >⬆ 선적 ✓</button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete('loading'); }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-amber-900/30 hover:bg-amber-800/50 text-amber-400 text-[10px] font-bold border border-amber-800/40"
                  title="선적 작업 완료 표시 — 삭제 안 됨"
                >⬆ 선적 완료
                </button>
              )
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-red-900/30 text-slate-600 hover:text-red-400"
              title="항차 삭제 (기록 없이 제거)"
            >
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionBar({ label, color, stats, onClick }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-500', label: 'bg-blue-900/50 text-blue-200 border-blue-700/40' },
    amber: { bg: 'bg-amber-500', label: 'bg-amber-900/50 text-amber-200 border-amber-700/40' },
  }[color];

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div onClick={onClick} className="cursor-pointer">
      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
        <span className={`${colorClasses.label} border px-1.5 py-0.5 rounded font-black`}>{label}</span>
        <span className="text-slate-400">평택 <span className="text-amber-300 font-bold">{stats.ptk}</span></span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">매칭 {stats.matched}</span>
        {stats.missing > 0 && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-red-300">누락 {stats.missing}</span>
          </>
        )}
      </div>
      <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className={`${colorClasses.bg} h-full transition-all`} style={{ width: `${pct}%` }}/>
      </div>
      <div className="flex items-center justify-between text-[10px] mt-0.5 text-slate-500">
        <span>완료 {stats.done}/{stats.total} ({pct}%)</span>
      </div>
    </div>
  );
}

function computeStats(section, mode) {
  // V7.40: 평택분 판정 모드별 정확화 (지침 7.1 — 양하=POD평택, 선적=POL평택).
  if (!section) return { total: 0, done: 0, ptk: 0, matched: 0, missing: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};

  // PTK 평택 대상 (모드별)
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  ediValues.forEach(c => {
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(c.pod)
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(c.pod));
    if (isPtk) ptkCns.add(c.cn);
  });
  const recordCns = new Set(Object.keys(records));
  const matched = [...ptkCns].filter(cn => recordCns.has(cn)).length;
  const missing = ptkCns.size - matched;
  const total = recordCns.size > 0 ? recordCns.size : ptkCns.size;
  const done = Object.keys(completed).length;
  return { total, done, ptk: ptkCns.size, matched, missing };
}

function CreateVoyageModal({ mode, vsl, voy, setVsl, setVoy, onClose, onCreate }) {
  const isDis = mode === 'discharge';
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg flex items-center gap-2">
            {isDis
              ? <><ArrowDown className="w-5 h-5 text-blue-400"/><span className="text-blue-200">양하 항차 추가</span></>
              : <><ArrowUp className="w-5 h-5 text-amber-400"/><span className="text-amber-200">선적 항차 추가</span></>}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">선박명 (VSL)</label>
            <input
              type="text"
              value={vsl}
              onChange={e => setVsl(e.target.value)}
              placeholder="예: XIN TAI PING"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm uppercase mono focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">항차 (VOY)</label>
            <input
              type="text"
              value={voy}
              onChange={e => setVoy(e.target.value)}
              placeholder="예: 0521W"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm uppercase mono focus:outline-none focus:border-blue-500"
              onKeyDown={e => e.key === 'Enter' && onCreate()}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-bold text-slate-300"
          >
            취소
          </button>
          <button
            onClick={onCreate}
            disabled={!vsl.trim() || !voy.trim()}
            className={`flex-1 px-3 py-2 rounded text-sm font-bold ${
              isDis
                ? 'bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 text-blue-100'
                : 'bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 text-amber-100'
            } disabled:text-slate-500`}
          >
            만들기 + 자료 업로드 →
          </button>
        </div>

        <div className="mt-3 text-[10px] text-slate-500 text-center">
          만든 후 EDI/엑셀 자료를 업로드합니다
        </div>
      </div>
    </div>
  );
}
