// V9.22: RZOR 덱 스토우지 플랜 뷰 — LOLO 선박용 카고플랜 (선사 rzdf 플랜 자동 파싱분)
//   덱 칩 선택 → CSS grid. 셀: 끝4 + 규격, 완료=초록, 리퍼=청록 테두리, 긴급/활어 배지.
//   셀 클릭 → 컨 상세(기존 모달).
import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';

export default function DeckPlanView({ plan, containers = [], compMap = {}, xrayMap = {}, onOpenContainer }) {
  const decks = plan?.decks || [];
  const [sel, setSel] = useState(0);
  const byCn = useMemo(() => {
    const m = {};
    for (const c of containers) if (c && c.cn) m[c.cn] = c;
    return m;
  }, [containers]);
  if (!decks.length) return null;
  const d = decks[Math.min(sel, decks.length - 1)];
  const done = d.slots.filter((s) => compMap[s.cn]).length;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-black text-cyan-200 flex items-center gap-1">
          <Layers className="w-4 h-4" /> 덱 플랜{plan.voy ? ` · ${plan.voy}` : ''}
        </span>
        {decks.map((dk, i) => (
          <button key={dk.deck} onClick={() => setSel(i)}
            className={`px-2.5 py-1 rounded text-xs font-black ${i === sel ? 'bg-cyan-600 text-cyan-50' : 'bg-slate-800 text-slate-300'}`}>
            {dk.deck}덱 {dk.slots.filter((s) => compMap[s.cn]).length}/{dk.slots.length}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">이 덱 {done}/{d.slots.length} 완료</span>
      </div>
      <div className="overflow-auto">
        <div className="grid gap-0.5 min-w-[720px]"
             style={{ gridTemplateColumns: `repeat(${d.cols}, minmax(30px, 1fr))`, gridTemplateRows: `repeat(${d.rows}, 58px)` }}>
          {d.slots.map((s) => {
            const isDone = !!compMap[s.cn];
            const c = byCn[s.cn];   // V9.22-01: 리스트(records) 정보 합류 — 실번호·온도·DG·POD (사용자 요청)
            const fe = (c && (c.fe === 'F' || c.fe === 'E')) ? c.fe : s.fe;
            const isRf = /RH|RF/.test(s.iso) || (c && c.rf);
            const isDg = !!(c && c.dg);
            const isXray = !!xrayMap[s.cn];
            const tmp = c && c.tmp != null && String(c.tmp).trim() !== '' ? String(c.tmp) : '';
            const sl = c && c.sl ? String(c.sl) : (c && c.eseal ? String(c.eseal) : '');
            const marks = [isRf ? (tmp ? `❄${tmp}` : '❄') : '', isDg ? '⚠DG' : '',
                           s.flags && s.flags.length ? s.flags.join('·') : ''].filter(Boolean).join(' ');
            return (
              <button key={`${s.cn}${s.ri}${s.ci}`}
                onClick={() => onOpenContainer?.(c || { cn: s.cn, iso: s.iso.replace(/\s/g, ''), fe })}
                className={`rounded-sm border text-left px-1 py-0.5 overflow-hidden leading-tight
                  ${isDone ? 'bg-emerald-800/90 border-emerald-500' : fe === 'E' ? 'bg-slate-700/80 border-slate-500' : 'bg-sky-900/80 border-sky-600'}
                  ${isRf ? 'ring-1 ring-cyan-400' : ''} ${isXray ? 'ring-2 ring-yellow-400' : ''}`}
                style={{ gridColumn: `${s.ci + 1} / span ${s.span}`, gridRow: `${s.ri + 1}` }}>
                <div className="text-[10px] font-black mono text-slate-100 truncate">
                  {s.cn.slice(-4)}{isDone ? ' ✓' : ''}{marks ? <span className="text-cyan-300 font-bold"> {marks}</span> : null}
                </div>
                <div className="text-[8.5px] text-slate-300 truncate">{s.iso} {fe}</div>
                {sl ? <div className="text-[8.5px] mono text-amber-200/90 truncate">🔒{sl}</div> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-slate-400 flex-wrap">
        <span><span className="inline-block w-2.5 h-2.5 bg-sky-900 border border-sky-600 rounded-sm mr-1" />풀</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-slate-700 border border-slate-500 rounded-sm mr-1" />엠티</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-emerald-800 border border-emerald-500 rounded-sm mr-1" />완료</span>
        <span><span className="inline-block w-2.5 h-2.5 border border-cyan-400 rounded-sm mr-1" />리퍼</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-yellow-400 rounded-sm mr-1" />X-RAY</span>
      </div>
    </div>
  );
}
