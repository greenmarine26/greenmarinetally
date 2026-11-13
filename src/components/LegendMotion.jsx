// 역할: 수석 상황판 별첨1·2 «움직이는 그림» — 고리 + 큰 «남은 N대» + 한 줄 결론 · 안 끝난 줄만 펼침(20'/40' 막대) · 끝난 줄은 ✓ 칩 · 4척 한 줄 요약(5.02).
import React from 'react';
import { CountUp } from './MotionBits.jsx';

//  별첨 L(legendLiveOf) 한 벌에서만 읽는다 — 새 계산이 아니라 같은 수를 다른 모양으로 그린다.
//  rows = [[이름, {'20':{n,done},'40':..,'45':..,total}], ...] (앱이 주는 순서 그대로 — 남은 순으로 다시 세우지 않는다)
const SZ = ['20', '40', '45'];
const remOf = (e) => (e && e.total ? e.total.n - e.total.done : 0);

//  전체 합 — 규격별 n/done
export function legendSumOf(rows) {
  const t = { '20': { n: 0, done: 0 }, '40': { n: 0, done: 0 }, '45': { n: 0, done: 0 }, total: { n: 0, done: 0 } };
  for (const [, e] of rows || []) for (const k of ['20', '40', '45', 'total']) { if (!e || !e[k]) continue; t[k].n += e[k].n; t[k].done += e[k].done; }
  return t;
}

//  한 줄 결론 — «40피트는 전부 끝, 남은 22대는 모두 20피트». 하드코딩 없이 합에서 만든다.
export function legendHeadline(sum) {
  const rem = sum.total.n - sum.total.done;
  if (sum.total.n <= 0) return '';
  if (rem <= 0) return '전부 끝났습니다.';
  const present = SZ.filter((s) => sum[s].n > 0);
  const remSz = present.filter((s) => sum[s].n > sum[s].done);
  const finSz = present.filter((s) => sum[s].n === sum[s].done);
  if (remSz.length === 1) {
    const f = finSz.length ? `${finSz.map((s) => s + '피트').join('·')}는 전부 끝, ` : '';
    return `${f}남은 ${rem}대는 모두 ${remSz[0]}피트`;
  }
  return `남은 ${rem}대 — ${remSz.map((s) => `${s}피트 ${sum[s].n - sum[s].done}`).join(' · ')}`;
}

//  고리 — 완료 비율. 색은 양하(sky) · 선적(amber) 클래스가 준다(새 색 없음).
function Ring({ pct, lod }) {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 76 76" className={`w-16 h-16 shrink-0 -rotate-90 ${lod ? 'text-amber-300' : 'text-sky-300'}`} aria-hidden="true">
      <circle cx="38" cy="38" r={R} fill="none" stroke="currentColor" strokeWidth="7" className="opacity-20" />
      <circle cx="38" cy="38" r={R} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(100, pct)) / 100)} className="mo-ring" />
    </svg>
  );
}

//  머리 — 고리 · 큰 «남은 N대» · 한 줄 결론
export function LegendHero({ L, rows, mode }) {
  const sum = legendSumOf(rows);
  const n = L.n, done = L.done, rem = Math.max(0, n - done);
  const pct = n > 0 ? Math.round((done / n) * 100) : 0;
  const lod = mode === 'loading';
  const head = legendHeadline(sum);
  return (
    <div className="flex items-center gap-3 px-1 py-1.5" data-legend-hero={mode}>
      <div className="relative">
        <Ring pct={pct} lod={lod} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-dim-100">{pct}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-dim-300">{lod ? '선적' : '양하'}</span>
          {rem > 0
            ? <span className="text-amber-300 font-black leading-none"><span className="text-xs mr-1">남은</span><span className="text-3xl" data-legend-rem={rem}><CountUp value={rem} /></span><span className="text-base">대</span></span>
            : <span className="text-emerald-300 font-black text-xl" data-legend-rem="0">✓ 전부 끝</span>}
          <span className="text-xs text-dim-400 mono">{done}/{n}</span>
        </div>
        {head && <div className="text-xs font-bold text-dim-100 break-keep" data-legend-headline>{head}</div>}
      </div>
    </div>
  );
}

//  막대 한 줄 — 규격 이름 · 막대 · 완료/전체
function SzBar({ label, e, lod }) {
  if (!e || !e.n) return null;
  const p = Math.round((e.done / e.n) * 100);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="w-7 shrink-0 text-xs text-dim-400 mono">{label}'</span>
      <div className="xp-bar xp-sm flex-1 min-w-0"><div className={`xp-fill mo-grow ${lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${p}%` }} /></div>
      <span className={`shrink-0 text-xs mono ${e.done === e.n ? 'text-emerald-300 font-bold' : 'text-dim-200'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{e.done}/{e.n}</span>
    </div>
  );
}

//  별첨 한 묶음(선사별 · 화물 종류별) — 안 끝난 줄은 펼치고 끝난 줄은 ✓ 칩으로 접는다. 순서는 앱 순서 그대로.
export function LegendRows({ title, rows, mode }) {
  const lod = mode === 'loading';
  const list = (rows || []).filter(([, e]) => e && e.total && e.total.n > 0);
  if (!list.length) return null;
  const open = list.filter(([, e]) => remOf(e) > 0), shut = list.filter(([, e]) => remOf(e) <= 0);
  return (
    <div data-legend-block={title.split(' ')[0]}>
      <div className="font-bold text-dim-300 px-1 text-sm2">{title}</div>
      <div className="space-y-1.5 px-1">
        {open.map(([k, e]) => (
          <div key={k} className="rounded-btn border border-line bg-ink-850 px-2 py-1.5 mo-up" data-legend-open={k}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-dim-100 truncate min-w-0 flex-1">{k}</span>
              <span className="shrink-0 rounded-pill border border-current text-amber-300 text-xs font-black px-2 py-px whitespace-nowrap">남음 {remOf(e)}</span>
              <span className="shrink-0 text-xs text-dim-400 mono">{e.total.done}/{e.total.n}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {SZ.map((s) => <SzBar key={s} label={s} e={e[s]} lod={lod} />)}
            </div>
          </div>
        ))}
        {shut.length > 0 && (
          <div className="flex flex-wrap gap-1" data-legend-done-chips>
            {shut.map(([k, e]) => (
              <span key={k} className="rounded-pill border border-current text-emerald-300 text-xs font-bold px-2 py-px whitespace-nowrap" data-legend-done={k}>✓ {k} {e.total.n}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//  4척 한 줄 요약 — 작은 막대 · «남음 N대» · 안 끝난 선사 이름표 셋(외 n) · 끝난 개수. 한 줄(nowrap)·칸 안에서 넘치면 잘린다(줄 높이는 그대로).
export function LegendCompactRow({ L, mode, line }) {
  const lod = mode === 'loading';
  const rem = Math.max(0, L.n - L.done);
  const pct = L.n > 0 ? Math.round((L.done / L.n) * 100) : 0;
  const carriers = (L.carriers || []).filter(([, e]) => e && e.total && e.total.n > 0);
  const open = carriers.filter(([, e]) => remOf(e) > 0), shut = carriers.length - open.length;
  const tags = open.slice(0, 3), more = open.length - tags.length;
  return (
    <div className="w-full shrink-0 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-dim-200" title={line} data-legend-compact={mode}>
      <b className={`shrink-0 ${lod ? 'text-amber-300' : 'text-blue-300'}`}>{lod ? '선적' : '양하'}</b>
      <span className="xp-bar xp-sm w-14 shrink-0 inline-block"><span className={`xp-fill mo-grow block ${lod ? 'xp-lod' : 'xp-dis'}`} style={{ width: `${pct}%` }} /></span>
      {rem > 0
        ? <span className="shrink-0 rounded-pill border border-current text-amber-300 font-black px-1.5 leading-tight">남음 {rem}대</span>
        : <span className="shrink-0 rounded-pill border border-current text-emerald-300 font-black px-1.5 leading-tight">✓ 끝</span>}
      {tags.map(([k, e]) => <span key={k} className="shrink-0 text-dim-100">{k} <span className="text-amber-300 font-bold">{remOf(e)}</span></span>)}
      {more > 0 && <span className="shrink-0 text-dim-400">외 {more}</span>}
      {shut > 0 && <span className="shrink-0 text-emerald-300">✓{shut}</span>}
    </div>
  );
}
