import React from 'react';
import { Cloud, CloudOff, RefreshCw, Home, Anchor, Power } from 'lucide-react';
import { exitApp } from '../backHandler.js';

export default function Header({ version, inspector, online, route, voyages, onChangeInspector, onGoHome }) {
  const cur = route.name === 'voyage' ? voyages[route.voyageKey] : null;
  const info = cur?.info;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {route.name !== 'home' ? (
            <button onClick={onGoHome} className="p-1.5 -ml-1 rounded hover:bg-slate-800 active:bg-slate-700 flex-shrink-0">
              <Home className="w-5 h-5 text-blue-300"/>
            </button>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-900/60 border border-blue-700/40 flex items-center justify-center flex-shrink-0">
              <Anchor className="w-5 h-5 text-blue-300"/>
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-blue-100 truncate leading-tight">
              {info ? info.vsl : '평택항 검수'}
            </div>
            <div className="text-[10px] text-slate-500 truncate leading-tight">
              {info ? `${info.voy} · ${info.carrier || ''}` : 'Master · 5명 동시 검수'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {online
            ? <Cloud className="w-3.5 h-3.5 text-emerald-400" title="실시간 연결됨"/>
            : <CloudOff className="w-3.5 h-3.5 text-red-400" title="오프라인"/>}
          <span className="bg-emerald-900/40 border border-emerald-600/40 text-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded mono" title="앱 버전">{version}</span>
          <button
            onClick={onChangeInspector}
            className="bg-amber-900/40 border border-amber-700/40 px-2 py-1 rounded text-xs flex items-center gap-1 active:bg-amber-900/60"
          >
            <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 text-[10px] font-black">
              {(inspector && inspector[0]) || '?'}
            </span>
            <span className="font-bold text-amber-200 max-w-[60px] truncate">{inspector || '검수원'}</span>
            <RefreshCw className="w-3 h-3 text-amber-400"/>
          </button>
          <button
            onClick={exitApp}
            title="앱 종료"
            className="p-1.5 rounded bg-red-900/30 hover:bg-red-900/60 active:bg-red-900/80 border border-red-700/40"
          >
            <Power className="w-4 h-4 text-red-400"/>
          </button>
        </div>
      </div>
    </header>
  );
}
