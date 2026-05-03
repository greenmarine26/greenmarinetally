import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Download, ArrowDown, ArrowUp } from 'lucide-react';
import { exportSectionToCSV } from './CSVExport.jsx';

export default function ReportTab({ voyageKey, mode, voyageInfo, containers, compMap, xrayMap, xraySeals }) {
  const [groupBy, setGroupBy] = useState('time'); // time | inspector

  const records = useMemo(() => {
    return Object.entries(compMap || {})
      .map(([cn, c]) => {
        const cont = containers.find(x => x.cn === cn);
        return cont ? { ...cont, ...c, completedAt: c.at } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [compMap, containers]);

  const groups = useMemo(() => {
    if (groupBy === 'inspector') {
      const g = {};
      records.forEach(r => {
        const k = r.by || '미지정';
        if (!g[k]) g[k] = [];
        g[k].push(r);
      });
      return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
    } else {
      // 시간 그룹 (1시간 단위)
      const g = {};
      records.forEach(r => {
        if (!r.completedAt) return;
        const d = new Date(r.completedAt);
        const k = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}시`;
        if (!g[k]) g[k] = [];
        g[k].push(r);
      });
      return Object.entries(g);
    }
  }, [records, groupBy]);

  const handleExport = () => {
    exportSectionToCSV(voyageKey, mode, containers, compMap, xrayMap, xraySeals);
  };

  return (
    <div className="space-y-3">
      {/* 헤더 + 요약 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {mode === 'discharge'
              ? <ArrowDown className="w-4 h-4 text-blue-400"/>
              : <ArrowUp className="w-4 h-4 text-amber-400"/>}
            <div className="text-sm font-bold text-slate-100">검수 보고서</div>
          </div>
          <button onClick={handleExport}
            className="bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/40 text-emerald-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5"/>CSV 다운로드
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-[10px] text-slate-500 font-bold">전체</div>
            <div className="text-2xl font-black mono text-slate-100">{containers.length}</div>
          </div>
          <div className="bg-emerald-900/30 rounded p-2">
            <div className="text-[10px] text-emerald-400 font-bold">완료</div>
            <div className="text-2xl font-black mono text-emerald-300">{records.length}</div>
          </div>
          <div className="bg-amber-900/30 rounded p-2">
            <div className="text-[10px] text-amber-400 font-bold">미완</div>
            <div className="text-2xl font-black mono text-amber-300">{containers.length - records.length}</div>
          </div>
        </div>
      </div>

      {/* 그룹 선택 */}
      <div className="flex gap-1">
        <button onClick={() => setGroupBy('time')}
          className={`flex-1 py-2 rounded text-xs font-bold ${groupBy === 'time' ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400'}`}>
          시간순
        </button>
        <button onClick={() => setGroupBy('inspector')}
          className={`flex-1 py-2 rounded text-xs font-bold ${groupBy === 'inspector' ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400'}`}>
          검수원별
        </button>
      </div>

      {/* 보고서 본문 */}
      {records.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          아직 완료된 검수 없음
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(([key, items]) => (
            <ReportGroup key={key} title={key} items={items} groupBy={groupBy}/>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportGroup({ title, items, groupBy }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 bg-slate-800/50 flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          {groupBy === 'inspector' ? (
            <span className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-amber-100 text-xs font-black">{title[0]}</span>
          ) : (
            <Clock className="w-4 h-4 text-slate-400"/>
          )}
          <span className="font-bold text-sm text-slate-200">{title}</span>
          <span className="bg-emerald-900/50 text-emerald-300 text-[10px] px-1.5 rounded font-black">{items.length}</span>
        </div>
        <span className="text-xs text-slate-500">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="p-2 space-y-1">
          {items.map(r => (
            <div key={r.cn} className="bg-slate-950/50 rounded px-2 py-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/>
              <span className="font-black text-amber-300 mono text-sm">{r.l4 || r.cn?.slice(-4)}</span>
              <span className="text-[11px] mono text-slate-400 truncate flex-1">{r.cn}</span>
              {r.bay && <span className="text-[10px] mono text-amber-400">{r.bay}-{r.row}-{r.tier}</span>}
              {groupBy === 'time' && r.by && (
                <span className="text-[10px] text-emerald-400 font-bold">[{r.by}]</span>
              )}
              {r.completedAt && (
                <span className="text-[10px] text-slate-500 mono">{new Date(r.completedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
