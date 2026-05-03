import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, X, Volume2, ArrowDown, ArrowUp, MapPin, ChevronRight } from 'lucide-react';
import { isoToLabel } from '../utils.js';
import { speakContainer, spellKo, speak } from '../voice.js';

export default function GlobalSearchPage({ voyages, onOpenContainer, onGoHome }) {
  const [q, setQ] = useState('');

  // 모든 항차 양/선적 컨테이너 펼치기
  const flat = useMemo(() => {
    const arr = [];
    Object.entries(voyages || {}).forEach(([vKey, v]) => {
      if (!v || !v.info) return;
      ['discharge', 'loading'].forEach(mode => {
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const xrayMap = sec.xrayList || {};
        const compMap = sec.completed || {};
        const merged = {};
        Object.values(ediMap).forEach(c => { merged[c.cn] = { ...c }; });
        Object.values(recMap).forEach(r => { merged[r.cn] = { ...(merged[r.cn] || {}), ...r }; });
        Object.values(merged).forEach(c => {
          if (!c.cn) return;
          arr.push({
            ...c,
            voyageKey: vKey,
            vsl: v.info.vsl,
            voy: v.info.voy,
            mode,
            isXray: mode === 'discharge' && !!xrayMap[c.cn],
            comp: compMap[c.cn] || null,
          });
        });
      });
    });
    return arr;
  }, [voyages]);

  const matches = useMemo(() => {
    if (!q || q.length < 2) return [];
    const Q = q.toUpperCase();
    return flat.filter(c =>
      c.cn?.includes(Q) || c.l4?.includes(Q) ||
      c.bay?.includes(Q) || c.op?.includes(Q) ||
      c.sl?.includes(Q) || c.vsl?.includes(Q)
    ).slice(0, 50); // 너무 많으면 50개로 제한
  }, [flat, q]);

  // 4자리 숫자 정확 + 결과 1개 → 자동 음성
  useEffect(() => {
    if (q.length === 4 && /^\d{4}$/.test(q) && matches.length === 1) {
      const c = matches[0];
      speakContainer(c, { xray: c.isXray });
    }
  }, [q, matches]);

  return (
    <div className="max-w-2xl mx-auto px-3 py-3">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-3">
        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
          <SearchIcon className="w-3 h-3"/>통합 검색 — 모든 항차·양하·선적
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            placeholder="끝 4자리 / 컨번호 / 베이 / 선사"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-3 text-2xl font-black mono text-amber-200 text-center tracking-widest focus:outline-none focus:border-amber-500"
          />
          {q && <button onClick={() => setQ('')} className="p-2"><X className="w-5 h-5 text-slate-500"/></button>}
        </div>
        <div className="text-[11px] text-slate-500 text-center mt-2">
          {q.length === 0 && `전체 ${flat.length.toLocaleString()}대 중 검색`}
          {q.length > 0 && q.length < 2 && '2자리 이상 입력'}
          {q.length >= 2 && matches.length === 0 && '일치 없음'}
          {q.length >= 2 && matches.length === 1 && <span className="text-emerald-400 font-bold">✓ 1개 일치 — 자동 음성</span>}
          {q.length >= 2 && matches.length > 1 && <span className="text-amber-400 font-bold">⚠ {matches.length}개 일치{matches.length === 50 ? '+ ' : ''} — 정확히 입력 권장</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        {matches.map(c => (
          <GlobalResultCard key={`${c.voyageKey}/${c.mode}/${c.cn}`} c={c} onOpen={() => onOpenContainer(c)} />
        ))}
      </div>
    </div>
  );
}

function GlobalResultCard({ c, onOpen }) {
  const isDone = !!c.comp;
  return (
    <button onClick={onOpen}
      className={`w-full text-left bg-slate-900 border rounded-lg p-2.5 flex items-center gap-2 ${
        isDone ? 'border-emerald-700/30 bg-emerald-950/10' :
        c.isXray ? 'border-purple-700/30 bg-purple-950/10' :
        'border-slate-700 hover:bg-slate-800/50'
      }`}>
      <div className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-black ${
        c.mode === 'discharge' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'
      }`}>
        {c.mode === 'discharge' ? <ArrowDown className="w-3 h-3 inline"/> : <ArrowUp className="w-3 h-3 inline"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-[11px] text-slate-400 mono truncate">{c.cn}</span>
          {c.isXray && <span className="bg-purple-700/60 text-purple-100 text-[9px] px-1 rounded font-black">🔍</span>}
          {isDone && <span className="bg-emerald-700/60 text-emerald-100 text-[9px] px-1 rounded font-black">✓</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mono mt-0.5">
          <span className="text-slate-300 font-bold">{c.vsl}</span>
          <span>·</span>
          <span>{c.voy}</span>
          {c.bay && <><span>·</span><MapPin className="w-2.5 h-2.5"/><span className="text-amber-300">{c.bay}-{c.row}-{c.tier}</span></>}
          {c.op && <><span>·</span><span className="text-slate-400">{c.op}</span></>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0"/>
    </button>
  );
}
