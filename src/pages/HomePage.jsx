import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ArrowDown, ArrowUp, Trash2, Users, ChevronRight, Search, BarChart3, MapPin, Loader2 } from 'lucide-react';
import { fbCreateVoyage, fbDeleteVoyage, fbDeleteSection } from '../firebase.js';
import { detectPierByGps, getPierFromBerth } from '../utils.js';
import PortMisCaptureModal from '../components/PortMisCaptureModal.jsx';

export default function HomePage({ voyages, inspectors, inspector, portMisData = {}, onOpenVoyage, onOpenGlobalSearch, onOpenChiefDashboard }) {
  const [showCreate, setShowCreate] = useState(null); // 'discharge' | 'loading'
  const [vsl, setVsl] = useState('');
  const [voy, setVoy] = useState('');
  const [showPortMisCapture, setShowPortMisCapture] = useState(false);  // M5.25
  // M5.82: GPS 기반 현 부두 자동 판별
  const [currentPier, setCurrentPier] = useState(null);    // { code, distance, name }
  const [gpsState, setGpsState] = useState('idle');         // 'idle' | 'loading' | 'denied' | 'ok' | 'far'
  const [pierFilter, setPierFilter] = useState('auto');     // 'auto' | 'PCTC' | 'PNCT' | 'all'

  // M5.82: GPS로 현 부두 판별 (한 번만)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState('denied');
      return;
    }
    // 캐시 확인 (localStorage 5분)
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

    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const pier = detectPierByGps(pos.coords.latitude, pos.coords.longitude);
        setCurrentPier(pier);
        setGpsState(pier ? 'ok' : 'far');
        try {
          localStorage.setItem('gm_current_pier', JSON.stringify({ pier, timestamp: Date.now() }));
        } catch (e) {}
      },
      err => {
        console.warn('[HomePage] GPS 실패:', err.message);
        setGpsState('denied');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
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
        const berth = (pm && pm.berth) || info.berth || '';
        const pier = (pm && pm.pier) || info.pier || getPierFromBerth(berth) || '';
        return { key: k, ...v, _berth: berth, _pier: pier };
      })
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages, portMisData]);

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
      if (Date.now() - i.lastActive > 90000) return; // 90초 이내만
      if (!out[i.lastVoyage]) out[i.lastVoyage] = [];
      out[i.lastVoyage].push({ name: i.name, mode: i.lastMode });
    });
    return out;
  }, [inspectors]);

  const handleCreate = async () => {
    if (!vsl.trim() || !voy.trim()) return;
    const key = `${vsl.trim().toUpperCase().replace(/\s+/g, '')}_${voy.trim().toUpperCase()}`;
    await fbCreateVoyage(key, {
      vsl: vsl.trim().toUpperCase(),
      voy: voy.trim().toUpperCase(),
      mode: showCreate,
      createdAt: Date.now(),
      createdBy: inspector || '',
    });
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

  return (
    <div className="max-w-6xl mx-auto px-3 py-3">
      {/* 그린마린 검수팀 전용 배지 */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-teal-900/30 to-cyan-900/30 border border-emerald-700/40 rounded-lg px-3 py-2 mb-3 text-center">
        <div className="text-[10px] text-emerald-400 font-bold tracking-wider">🌊 GREEN MARINE TALLY 🌊</div>
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

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-slate-500 letter-spacing-wide font-bold uppercase mb-0.5">진행 중인 항차</div>
          <div className="text-lg font-bold text-slate-100">{list.length}건</div>
        </div>
        <div className="flex gap-2 flex-wrap">
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

      {/* M5.82: 부두 필터 바 - GPS 자동 판별 + 수동 전환 */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 mb-2 flex items-center gap-2 flex-wrap text-xs">
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
            <MapPin className="w-3 h-3"/> 평택항 외부
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

function VoyageCard({ voyage, activeInspectors, onOpen, onDelete }) {
  const dis = voyage.discharge;
  const loa = voyage.loading;

  const disStats = computeStats(dis);
  const loaStats = computeStats(loa);

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
                📍 PCTC {berth ? `· ${berth}` : ''}
              </span>
            )}
            {pier === 'PNCT' && (
              <span className="text-[9px] bg-purple-900/60 border border-purple-700/50 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                📍 PNCT {berth ? `· ${berth}` : ''}
              </span>
            )}
            {!pier && berth && (
              <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                📍 {berth}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {voyage.info.voy} · {voyage.info.carrier || ''}
          </div>
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
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-900/30 text-slate-600 hover:text-red-400"
            title="항차 삭제"
          >
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
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

function computeStats(section) {
  if (!section) return { total: 0, done: 0, ptk: 0, matched: 0, missing: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};

  // PTK 평택 대상
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  ediValues.forEach(c => {
    const pol = (c.pol || '').toUpperCase();
    const pod = (c.pod || '').toUpperCase();
    if (pol.endsWith('PTK') || pod.endsWith('PTK')) ptkCns.add(c.cn);
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
