import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, X, Volume2 } from 'lucide-react';
import ContainerList from './ContainerList.jsx';
import { speakContainer, stopSpeak } from '../voice.js';

export default function SearchPanel({ containers, compMap, xrayMap, xraySeals, mode, voyageKey, inspector, onOpenContainer }) {
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    if (!q || q.length < 2) return [];
    const Q = q.toUpperCase();
    return containers.filter(c =>
      c.cn?.includes(Q) || c.l4?.includes(Q) ||
      c.bay?.includes(Q) || c.op?.includes(Q) || c.sl?.includes(Q)
    );
  }, [containers, q]);

  useEffect(() => {
    if (q.length === 4 && /^\d{4}$/.test(q) && matches.length === 1) {
      const c = matches[0];
      speakContainer(c, { xray: !!xrayMap[c.cn] });
    }
  }, [q, matches]);

  const handleManualSpeak = () => {
    if (matches.length !== 1) return;
    speakContainer(matches[0], { xray: !!xrayMap[matches[0].cn] });
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <SearchIcon className="w-5 h-5 text-amber-400 flex-shrink-0"/>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            placeholder="끝 4자리 (예: 1402)"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-3 text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"
          />
          {q && <button onClick={() => { setQ(''); stopSpeak(); }}><X className="w-5 h-5 text-slate-500"/></button>}
          {matches.length === 1 && (
            <button onClick={handleManualSpeak} className="p-2 bg-amber-700 hover:bg-amber-600 rounded">
              <Volume2 className="w-4 h-4 text-amber-100"/>
            </button>
          )}
        </div>
        <div className="text-[11px] text-slate-500 text-center">
          {q.length === 0 && '컨테이너 끝 4자리를 입력하세요'}
          {q.length > 0 && q.length < 2 && '2자리 이상 입력'}
          {q.length >= 2 && matches.length === 0 && '일치하는 컨테이너 없음'}
          {q.length >= 2 && matches.length === 1 && <span className="text-emerald-400 font-bold">✓ 1개 일치 — 자동 음성</span>}
          {q.length >= 2 && matches.length > 1 && <span className="text-amber-400 font-bold">⚠ {matches.length}개 일치 — 정확히 4자리 입력 권장</span>}
        </div>
      </div>

      {matches.length > 0 && (
        <ContainerList
          list={matches} compMap={compMap} xrayMap={xrayMap} xraySeals={xraySeals}
          mode={mode} voyageKey={voyageKey} inspector={inspector}
          onOpenContainer={onOpenContainer}
        />
      )}
    </div>
  );
}
