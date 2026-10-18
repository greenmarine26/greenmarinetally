// 자료 센터 — 할 일(등록·검수 리스트·카고플랜·베이 상세·엠티실 리스트·X-RAY 리스트)을 먼저 고르고, 선박·항차(양하/선적)를 고르면 바로 실행하는 화면 (TallyOne 4.34)
//  검수사 2026-10-17 «통합 자료 센터» · «네 이쁘게 만들어 주세요» — 항차 홈 + 자료 센터 두 칸, 미리보기 4판 확정.
//  지금 볼 수 있는 선박만 나온다(일반 검수원은 고른 1척 · 수석은 전부) — 목록은 App 이 넘기는 visibleVoyages 그대로이고 여기서 따로 읽지 않는다.
import React, { useMemo, useState } from 'react';
import { isViewOnlyNow } from '../workChoice.js';
import { shiftCnSetOf } from '../utils.js';
import { computeStats } from './HomePage.jsx';
import { matchShipPolicy } from '../shipPolicies.js';

//  m: 이 일을 할 수 있는 모드('d'=양하 · 'l'=선적). only: 엠티실 «부착» 정책 선박에서만 나온다. write: 조회만이면 숨긴다.
export const DC_ACTS = [
  { k: 'reg',        t: '📥 등록',        s: 'EDI · 세관 리스트 · X-RAY 올리기', m: ['d', 'l'], write: true },
  { k: 'inspection', t: '📋 검수 리스트',  s: '인쇄 창이 바로 열림',               m: ['d', 'l'] },
  { k: 'cargo',      t: '📐 카고플랜',     s: '컬러 / 흑백',                       m: ['d', 'l'] },
  { k: 'detail',     t: '🚢 베이 상세',    s: '평택분 / 전체 / 베이',              m: ['d', 'l'] },
  { k: 'eseal',      t: '🔖 엠티실 리스트', s: '엠티실 부착 선박만 · 선적',          m: ['l'], only: 'attach' },
  { k: 'xray',       t: '🔍 X-RAY 리스트', s: '선박명 + X-RAY 리스트 (양하만)',      m: ['d'] },
];

//  선박 한 척이 이 일에 나오는가 — 모드마다 자료가 있어야 하고(양하/선적 구역), 엠티실은 «부착» 정책 선박만.
export function dcModesOf(act, voyage) {
  const out = [];
  for (const m of act.m) {
    const sec = m === 'd' ? voyage?.discharge : voyage?.loading;
    if (!sec) continue;
    if (act.only === 'attach') {
      let p = null;
      try { p = matchShipPolicy(voyage?.info?.vsl || ''); } catch (e) { p = null; }
      if (!p || p.mode !== 'attach') continue;
    }
    out.push(m === 'd' ? 'discharge' : 'loading');
  }
  return out;
}

function subOf(key, voyage) {
  try {
    const set = shiftCnSetOf(key, voyage);
    const d = voyage.discharge ? computeStats(voyage.discharge, 'discharge', voyage.info, key, set) : null;
    const l = voyage.loading ? computeStats(voyage.loading, 'loading', voyage.info, key, set) : null;
    const parts = [];
    if (d && d.total > 0) parts.push(`양하 ${d.done}/${d.total}`);
    if (l && l.total > 0) parts.push(`선적 ${l.done}/${l.total}`);
    return parts.join(' · ');
  } catch (e) { return ''; }
}

function planStampOf(voyage) {
  const s = String(voyage?.info?.planDate || '');
  return s.slice(0, 16);
}

export default function DataCenterPage({ voyages = {}, onDo }) {
  const [cur, setCur] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const viewOnly = isViewOnlyNow();
  const acts = DC_ACTS.filter((a) => !(a.write && viewOnly));
  const act = acts.find((a) => a.k === cur) || null;

  //  선박 목록 — 예정 일시가 늦은 것(곧 작업할 배)이 위. 일시가 없으면 뒤.
  const ships = useMemo(() => Object.entries(voyages || {})
    .filter(([, v]) => v && v.info)
    .map(([key, v]) => ({ key, v, stamp: planStampOf(v) }))
    .sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : a.key < b.key ? -1 : 1)), [voyages]);

  const rows = act ? ships.map((s) => ({ ...s, modes: dcModesOf(act, s.v) })).filter((s) => s.modes.length > 0) : [];
  const shown = showAll ? rows : rows.slice(0, 12);

  return (
    <div className="max-w-3xl mx-auto px-3 py-3 space-y-3" data-data-center="1">
      <div>
        <div className="text-lg font-black text-dim-100">자료 센터</div>
        <div className="text-xs text-dim-400">먼저 할 일을 누르고, 선박·항차를 고르면 바로 열립니다.</div>
      </div>
      <div className="bg-ink-850 border border-line rounded-pill p-3">
        <div className="text-sm font-bold text-dim-200 mb-2">무엇을 할까요?</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {acts.map((a) => (
            <button key={a.k} data-dc-act={a.k} onClick={() => { setCur(a.k); setShowAll(false); }}
              className={`text-left px-3 py-3 rounded-pill border ${cur === a.k ? 'border-2 border-sky-400 bg-sky-950/40 text-dim-100' : 'border-line bg-ink-800 text-dim-200'}`}>
              <div className="font-bold text-sm">{a.t}</div>
              <div className="text-xxs text-dim-400">{a.s}</div>
            </button>
          ))}
        </div>
        {!act && <div className="text-xs text-dim-400 mt-3">할 일을 하나 누르세요. 그러면 선박과 항차가 나옵니다.</div>}
        {act && (
          <div className="mt-3">
            <div className="text-sm font-bold text-dim-100">{act.t} <span className="text-xs text-dim-400 font-normal">— 선박·항차를 고르세요</span></div>
            {rows.length === 0 && (
              <div className="text-xs text-dim-400 mt-2" data-dc-empty="1">
                {ships.length === 0 ? '지금 볼 수 있는 선박이 없습니다.' : '이 일을 할 수 있는 선박이 없습니다.'}
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              {shown.map((s) => {
                const info = s.v.info || {};
                const sub = subOf(s.key, s.v);
                return (
                  <div key={s.key} data-dc-ship={s.key} className="flex items-center gap-2 flex-wrap border border-line rounded-pill px-3 py-2 bg-ink-800">
                    <div className="min-w-0 flex-1" style={{ flexBasis: '9rem' }}>
                      <div className="font-black text-dim-100">{info.vsl || s.key} <span className="text-xs text-dim-400 font-normal">{info.voy_d || info.voy || ''}{info.voy_l && info.voy_l !== info.voy_d ? ` / ${info.voy_l}` : ''}</span></div>
                      {sub && <div className="text-xxs text-dim-400">{sub}</div>}
                    </div>
                    {s.modes.map((m) => (
                      <button key={m} data-dc-go={`${s.key}:${m}`} onClick={() => onDo && onDo(act.k, s.key, m)}
                        className="px-4 py-2 rounded-pill border border-sky-500 text-sky-300 font-bold text-sm hover:bg-sky-600 hover:text-white">
                        {m === 'discharge' ? '양하' : '선적'}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
            {rows.length > 12 && !showAll && (
              <button onClick={() => setShowAll(true)} className="mt-2 text-xs text-sky-300 underline">나머지 {rows.length - 12}척 보기</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
