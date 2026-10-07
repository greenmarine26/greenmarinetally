// 해치커버 보고 직전 «장수 확인» 창(4.10) — 앱이 센 장수·장별 홀드 평택 대수를 보여 주고 검수사가 맞는지 보고 고른 뒤에야 보고가 나간다.
//   검수사 2026-10-07 «해치커버 문제도 보고 직전에 커버 장수를 맞는지 확인하고 보고 할수 있을수 있게 해야 할것 같습니다. 무심코 보고 했다가 6장 오픈을 보고 했으니까요».
//   계산은 utils.hatchPanelDetailOf 한 벌(자동 가이드·수동 작업 보고가 같은 창을 쓴다), 경고 문구는 utils.hatchCountFlags 한 벌.
//   쓰는 법 — const [hatchCountEl, askHatchCount] = useHatchCountConfirm(); … const n = await askHatchCount({ action, bays, detail, initial }); (null = 취소) … 화면에 {hatchCountEl}.
import React, { useCallback, useState } from 'react';
import { formatHatchBays, hatchCountFlags } from '../utils.js';

const ordinal = (i) => `${i + 1}번째 장`;

export default function HatchCountConfirm({ open, action, bays, detail, initial, onConfirm, onCancel }) {
  const [sel, setSel] = useState(null);
  const [seen, setSeen] = useState(null);
  //  창이 새로 열릴 때마다 초기값을 다시 잡는다(같은 컴포넌트를 재사용하므로 열림 순간을 key 로 본다).
  const openKey = open ? `${action}|${(bays || []).join(',')}|${initial}` : null;
  if (openKey !== seen) {
    setSeen(openKey);
    const i0 = Number(initial);
    setSel(open && Number.isFinite(i0) && i0 >= 1 ? i0 : null);
  }
  if (!open) return null;
  const d = detail || { count: 0, source: 'none', max: 0, groups: [] };
  const cap = Math.min(9, Math.max(3, d.max || 0, Number(initial) || 0, d.count || 0));
  const flags = hatchCountFlags(d, sel);
  const blocked = sel == null;
  const isOpen = action === 'open';
  const verb = isOpen ? '오픈' : '클로즈';
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4" data-hatch-confirm={action} onClick={(e) => e.stopPropagation()}>   {/* 작업 보고 창 바깥을 누르면 창이 닫히는 부모(WorkReportModal)로 클릭이 새지 않게 */}
      <div className="bg-ink-900 border border-line rounded-card w-full sm:max-w-md overflow-hidden shadow-card flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="px-4 py-3 border-b bg-ink-850 border-line">
          <div className="font-black text-base text-dim-100">{isOpen ? '🔓' : '🔒'} 해치커버 {verb} 보고 — 장수 확인</div>
          <div className="text-xxs text-dim-300 mt-0.5">보고하기 전에 커버 장수가 맞는지 확인하십시오.</div>
        </div>
        <div className="px-4 py-4 space-y-3 overflow-y-auto">   {/* 수동 입력으로 그룹이 여러 개 쌓여도 위가 잘리지 않게(감사 하-5) */}
          <div>
            <div className="text-xxs text-dim-400">베이</div>
            <div className="text-lg font-black text-amber-100 mono" data-hatch-bays>{formatHatchBays(bays) || (bays || []).join(', ') || '—'}</div>
          </div>
          {d.groups && d.groups.length > 0 && (
            <div className="space-y-1.5">
              {d.groups.map((g) => (
                <div key={g.group} className="bg-ink-950 border border-line rounded px-2 py-1.5" data-hatch-group={g.group}>
                  <div className="text-xs text-dim-200">
                    <b className="mono">{formatHatchBays(g.bays.length ? g.bays : [g.group]) || (Number.isFinite(Number(g.group)) ? g.group : '?')}</b>
                    <span className="text-dim-400"> · 사전 해치 {g.total}장 · </span>
                    <span className="font-bold text-emerald-300">{isOpen ? '열' : '닫을'} 장 {g.needed}장</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {g.panels.map((p) => (
                      <span key={p.idx} className={`px-1.5 py-0.5 rounded text-2xs border ${p.nHold > 0 ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : 'bg-ink-900 border-line text-dim-400'}`}>
                        {ordinal(p.idx)} · {p.nHold > 0 ? `홀드 평택 ${p.nHold}대` : '홀드 평택 없음'}
                        {isOpen && p.blocked ? ` · 위 화물 ${p.nBlock}대` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="text-xxs text-dim-400 mb-1">보고할 장수 {d.count > 0 ? <span className="text-dim-300">(앱이 센 장수 {d.count}장)</span> : <span className="text-st-badHi">(앱이 못 셌습니다)</span>}</div>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" data-hatch-count={n} aria-pressed={sel === n} onClick={() => setSel(n)}
                  className={`flex-1 min-w-[56px] py-3 rounded-btn font-black text-lg border ${sel === n ? 'bg-act text-act-on border-act' : 'bg-ink-800 text-dim-100 border-line-strong hover:bg-ink-750'}`}
                  style={{ minHeight: 56 }}>{n}장</button>
              ))}
            </div>
          </div>
          {flags.length > 0 && (
            <div className="space-y-1">
              {flags.map((f) => (
                <div key={f.key} data-hatch-flag={f.key}
                  className={`text-xxs rounded px-2 py-1.5 border ${f.level === 'block' ? 'bg-rose-950/50 border-rose-700 text-rose-200' : f.level === 'warn' ? 'bg-amber-950/50 border-amber-700 text-amber-200' : 'bg-sky-950/40 border-sky-800 text-sky-200'}`}>
                  {f.level === 'info' ? 'ℹ ' : '⚠ '}{f.text}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-line bg-ink-950">
          <button type="button" data-hatch-cancel onClick={onCancel} className="py-3.5 bg-ink-750 hover:bg-ink-700 text-dim-100 font-bold rounded-btn text-base" style={{ minHeight: 60 }}>취소</button>
          <button type="button" data-hatch-ok disabled={blocked} onClick={() => { if (!blocked) onConfirm(sel); }}
            className="py-3.5 font-bold rounded-btn text-base bg-act hover:bg-act-hi text-act-on disabled:opacity-40" style={{ minHeight: 60 }}>
            {blocked ? '장수를 고르세요' : `${sel}장 ${verb} 보고`}
          </button>
        </div>
      </div>
    </div>
  );
}

//  기다릴 수 있는 물음으로 쓰는 훅(ConfirmModal 의 useConfirm 과 같은 방식). askHatchCount(opts) → 고른 장수(숫자) 또는 null(취소).
export function useHatchCountConfirm() {
  const [st, setSt] = useState({ open: false });
  const ask = useCallback((opts) => new Promise((resolve) => setSt({ open: true, ...opts, resolve })), []);
  const finish = (v) => { const r = st.resolve; setSt({ open: false }); if (r) r(v); };
  const el = <HatchCountConfirm {...st} onConfirm={(n) => finish(n)} onCancel={() => finish(null)} />;
  return [el, ask];
}
