import React, { useState, useMemo } from 'react';
import { Plus, ArrowDown, ArrowUp, Trash2, Users, ChevronRight, Search, BarChart3 } from 'lucide-react';
import { fbCreateVoyage, fbDeleteVoyage, fbDeleteSection } from '../firebase.js';

export default function HomePage({ voyages, inspectors, inspector, onOpenVoyage, onOpenGlobalSearch, onOpenChiefDashboard }) {
  const [showCreate, setShowCreate] = useState(null); // 'discharge' | 'loading'
  const [vsl, setVsl] = useState('');
  const [voy, setVoy] = useState('');

  const list = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages]);

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

      {/* 빠른 진입 - 통합검색 + 수석대시보드 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
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

      {list.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <div className="text-slate-500 text-sm mb-2">진행 중인 항차가 없습니다</div>
          <div className="text-xs text-slate-600">위 + 양하 / + 선적 버튼으로 새 항차를 만드세요</div>
        </div>
      )}

      <div className="space-y-2">
        {list.map(v => (
          <VoyageCard
            key={v.key}
            voyage={v}
            activeInspectors={activeInspectors[v.key] || []}
            onOpen={() => onOpenVoyage(v.key)}
            onDelete={() => handleDelete(v.key, v.info.vsl, v.info.voy)}
          />
        ))}
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
    const labels = {
      discharge: { title: '양하 데이터 삭제', desc: '선적 데이터는 유지됩니다.', color: 'amber' },
      loading: { title: '선적 데이터 삭제', desc: '양하 데이터는 유지됩니다.', color: 'blue' },
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
              className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded">
              ← 뒤로
            </button>
            <button onClick={() => onConfirm(confirming)}
              className="py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded">
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
              <button onClick={() => setConfirming('discharge')}
                className="w-full py-4 bg-amber-900/30 hover:bg-amber-900/50 border-2 border-amber-700/40 rounded-lg text-left px-4">
                <div className="text-base font-bold text-amber-300">⬇️ 양하만 삭제</div>
                <div className="text-xs text-amber-400/70 mt-0.5">선적은 유지됩니다</div>
              </button>
              <button onClick={() => setConfirming('loading')}
                className="w-full py-4 bg-blue-900/30 hover:bg-blue-900/50 border-2 border-blue-700/40 rounded-lg text-left px-4">
                <div className="text-base font-bold text-blue-300">⬆️ 선적만 삭제</div>
                <div className="text-xs text-blue-400/70 mt-0.5">양하는 유지됩니다</div>
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onOpen}
        className="w-full px-3 py-2.5 hover:bg-slate-800/50 flex items-center justify-between gap-2"
      >
        <div className="text-left min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-100 truncate">{voyage.info.vsl}</div>
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
