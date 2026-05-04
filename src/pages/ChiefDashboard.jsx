import React, { useMemo, useState, useEffect } from 'react';
import { Users, Anchor, ChevronRight, ArrowDown, ArrowUp, Clock, Library, Ship } from 'lucide-react';
import { fbSubscribeShipLibrary } from '../firebase.js';

export default function ChiefDashboard({ voyages, inspectors, onOpenVoyage, onGoHome }) {
  const [shipLib, setShipLib] = useState({});
  useEffect(() => {
    const u = fbSubscribeShipLibrary(setShipLib);
    return () => u();
  }, []);

  // 항차별 통계
  const voyageStats = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        const dis = computeStats(v.discharge);
        const loa = computeStats(v.loading);
        return {
          key: k,
          info: v.info,
          dis, loa,
          totalDone: dis.done + loa.done,
          totalAll: dis.total + loa.total,
        };
      })
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages]);

  // 검수원별 일일 통계
  const inspectorStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const stats = {};
    Object.values(voyages || {}).forEach(v => {
      ['discharge', 'loading'].forEach(mode => {
        const sec = v?.[mode];
        if (!sec) return;
        Object.values(sec.completed || {}).forEach(comp => {
          if (!comp.by) return;
          if (!stats[comp.by]) stats[comp.by] = { name: comp.by, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
          stats[comp.by].total++;
          if (mode === 'discharge') stats[comp.by].dis++;
          else stats[comp.by].loa++;
          if (comp.at >= todayMs) stats[comp.by].today++;
          if (comp.at > stats[comp.by].lastAt) stats[comp.by].lastAt = comp.at;
        });
      });
    });

    // 활동 정보 합치기
    Object.values(inspectors || {}).forEach(i => {
      if (!i?.name) return;
      if (!stats[i.name]) stats[i.name] = { name: i.name, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
      stats[i.name].active = i.lastActive && (Date.now() - i.lastActive) < 90000;
      stats[i.name].lastVoyage = i.lastVoyage;
      stats[i.name].lastMode = i.lastMode;
    });

    return Object.values(stats).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [voyages, inspectors]);

  // 전체 합계
  const total = useMemo(() => {
    let done = 0, all = 0, ptkAll = 0, missing = 0;
    voyageStats.forEach(v => {
      done += v.totalDone;
      all += v.totalAll;
      ptkAll += v.dis.ptk + v.loa.ptk;
      missing += v.dis.missing + v.loa.missing;
    });
    return { done, all, ptkAll, missing };
  }, [voyageStats]);

  return (
    <div className="max-w-3xl mx-auto px-3 py-3 space-y-3">
      <div>
        <div className="text-[10px] text-purple-400 font-bold uppercase mb-1">수석 검수원 대시보드</div>
        <div className="text-lg font-bold text-slate-100">전체 현황</div>
      </div>

      {/* 전체 카운터 */}
      <div className="grid grid-cols-2 gap-2">
        <BigStat label="전체 검수 완료" value={total.done.toLocaleString()} sub={`/ ${total.all.toLocaleString()}대`} color="emerald"/>
        <BigStat label="누락 (선사 추가 필요)" value={total.missing} sub={`평택 ${total.ptkAll}대 중`} color={total.missing > 0 ? "red" : "slate"}/>
      </div>

      {/* 전체 검수원 진행률 (인원 무제한) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-amber-400"/>
          <div className="text-sm font-bold text-slate-100">검수원 활동 ({inspectorStats.length}명)</div>
        </div>
        {inspectorStats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">아직 검수 기록 없음</div>
        ) : (
          <div className="space-y-1.5">
            {inspectorStats.map(s => (
              <InspectorRow key={s.name} s={s}/>
            ))}
          </div>
        )}
      </div>

      {/* 항차별 진행률 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Anchor className="w-4 h-4 text-blue-400"/>
          <div className="text-sm font-bold text-slate-100">항차별 진행 ({voyageStats.length}건)</div>
        </div>
        {voyageStats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">진행 중 항차 없음</div>
        ) : (
          <div className="space-y-2">
            {voyageStats.map(v => (
              <VoyageStatRow key={v.key} v={v} onOpen={() => onOpenVoyage(v.key)}/>
            ))}
          </div>
        )}
      </div>

      {/* 선박 라이브러리 (학습된 선박 구조) */}
      <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Library className="w-4 h-4 text-purple-400"/>
          <div className="text-sm font-bold text-slate-100">선박 라이브러리 ({Object.keys(shipLib).length}척)</div>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">EDI 분석된 선박은 자동 저장 → 다음 항차에서 즉시 활용</div>
        {Object.keys(shipLib).length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">아직 학습된 선박 없음 (EDI 업로드 시 자동 저장)</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(shipLib).sort((a,b) => (b[1].last_updated||0) - (a[1].last_updated||0)).map(([imo, ship]) => (
              <ShipLibraryRow key={imo} imo={imo} ship={ship}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipLibraryRow({ imo, ship }) {
  const struct = ship.structure || {};
  const stats = ship.stats || {};
  const voyageCount = ship.voyages ? Object.keys(ship.voyages).length : 0;
  const pairCount = struct.pairs ? Object.keys(struct.pairs).length / 2 : 0;
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Ship className="w-3.5 h-3.5 text-purple-400"/>
        <span className="font-bold text-sm text-purple-200">{ship.name || '(이름 없음)'}</span>
        <span className="text-[10px] text-slate-500 mono">IMO {imo}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
        <div>베이 <span className="text-slate-200 font-bold">{struct.bay_count || 0}</span>개</div>
        <div>짝꿍 <span className="text-emerald-300 font-bold">{pairCount}</span>쌍</div>
        <div>단독 <span className="text-amber-300 font-bold">{struct.singles?.length || 0}</span>개</div>
        <div>분석 항차 <span className="text-slate-200 font-bold">{voyageCount}</span></div>
        <div>양하 누적 <span className="text-blue-300 font-bold">{stats.total_discharge || 0}</span></div>
        <div>선적 누적 <span className="text-amber-300 font-bold">{stats.total_loading || 0}</span></div>
      </div>
      {struct.pairs && Object.keys(struct.pairs).length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] text-purple-400 cursor-pointer">짝꿍 베이 상세</summary>
          <div className="mt-1 text-[10px] text-slate-400 mono space-y-0.5">
            {[...new Set(Object.entries(struct.pairs).map(([a,b]) => [a,b].sort().join('↔')))].map(p => (
              <div key={p}>{p}</div>
            ))}
            {struct.singles?.length > 0 && (
              <div className="text-amber-400 mt-1">단독: {struct.singles.join(', ')}</div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, color }) {
  const map = {
    emerald: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
    red: 'border-red-700/40 bg-red-950/30 text-red-300',
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
  };
  return (
    <div className={`rounded-xl border p-3 ${map[color]}`}>
      <div className="text-[10px] uppercase font-bold opacity-70">{label}</div>
      <div className="text-3xl font-black mono mt-0.5">{value}</div>
      <div className="text-[11px] opacity-60 mono">{sub}</div>
    </div>
  );
}

function InspectorRow({ s }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-2 flex items-center gap-2">
      <div className="relative">
        <div className="w-9 h-9 bg-amber-600 rounded-full flex items-center justify-center text-amber-100 font-black">
          {s.name[0]}
        </div>
        {s.active && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-slate-200 truncate">{s.name}</div>
        <div className="text-[10px] text-slate-500 mono flex items-center gap-2 flex-wrap">
          <span><span className="text-emerald-400 font-bold">{s.today}</span> 오늘</span>
          <span>·</span>
          <span><span className="text-slate-300 font-bold">{s.total}</span> 누적</span>
          {s.lastAt > 0 && (
            <>
              <span>·</span>
              <span><Clock className="w-2.5 h-2.5 inline"/> {timeAgo(s.lastAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[10px] mono">
        {s.dis > 0 && <span className="bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded font-black">양 {s.dis}</span>}
        {s.loa > 0 && <span className="bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded font-black">선 {s.loa}</span>}
      </div>
    </div>
  );
}

function VoyageStatRow({ v, onOpen }) {
  const pct = v.totalAll > 0 ? Math.round((v.totalDone / v.totalAll) * 100) : 0;
  return (
    <button onClick={onOpen} className="w-full text-left bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 hover:bg-slate-800/70">
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-200 truncate">{v.info.vsl}</div>
          <div className="text-[10px] text-slate-500">{v.info.voy} · {v.info.carrier || ''}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600"/>
      </div>
      <div className="space-y-1.5 text-[10px] mono">
        {v.dis.total > 0 && <MiniBar label="양하" color="blue" stats={v.dis}/>}
        {v.loa.total > 0 && <MiniBar label="선적" color="amber" stats={v.loa}/>}
      </div>
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-700/50 text-[10px]">
        <span className="text-slate-500">전체</span>
        <span className="text-emerald-300 font-black mono">{v.totalDone}</span>
        <span className="text-slate-500">/{v.totalAll}</span>
        <span className="text-slate-400">({pct}%)</span>
      </div>
    </button>
  );
}

function MiniBar({ label, color, stats }) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const map = {
    blue: { tag: 'bg-blue-900/60 text-blue-200', bar: 'bg-blue-500' },
    amber: { tag: 'bg-amber-900/60 text-amber-200', bar: 'bg-amber-500' },
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`${map[color].tag} px-1.5 rounded text-[9px] font-black w-9 text-center`}>{label}</span>
      <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div className={`${map[color].bar} h-full`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-slate-400 w-16 text-right">{stats.done}/{stats.total}</span>
      {stats.missing > 0 && <span className="text-red-400 w-12 text-right">누락 {stats.missing}</span>}
    </div>
  );
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec/60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec/3600)}시간 전`;
  return `${Math.floor(sec/86400)}일 전`;
}

function computeStats(section) {
  if (!section) return { total: 0, done: 0, ptk: 0, matched: 0, missing: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};
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
