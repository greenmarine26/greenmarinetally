// 5.29-01 선적 EDI 오기 전(리스트만) 빈 칸 넣기 — 베이 그림 ＋ 칸을 누르면 뜨는 끝 4자리 창(ListPlaceModal)과, 자동·수동 베이 칩에서 빈 베이를 고르면 뜨는 안내 카드(ListOnlyBayCard).
//   검수사 2026-11-28 «선적 자료가 없다고 빈베이도 안보여준다는건 이해가 안됩니다» · «OBWH는 선적 후반쯤에 EDI가 나오는 경우가 많습니다».
//   ⚠ 판정(후보·놓을 베이)은 utils.listOnlyPickOf · unplacedTargetBayOf 한 벌. 이 파일은 그리고 누르기만 한다 — 쓰기는 VoyagePage(자리 + 선적 완료).
import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { listOnlyPickOf, isoToLabel, LIST_ONLY_PICK_MAX } from '../utils.js';
import { NUM_INPUT_PROPS } from '../inputUtils.js';
import CnText from './CnText.jsx';

const pad2 = (x) => String(x ?? '').padStart(2, '0');
//  장 이름 «BAY (06)07» · «BAY 05» — BayPlan 제목과 같은 꼴
const pageLbl = (p) => (p ? (p.evenBay && p.oddBay ? `BAY (${pad2(p.evenBay)})${pad2(p.oddBay)}` : `BAY ${pad2(p.evenBay || p.oddBay)}`) : '');

export default function ListPlaceModal({ cell, unplaced, busy = false, onPlace, onClose }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [cell && `${cell.page && cell.page.evenBay}|${cell.page && cell.page.oddBay}|${cell.row}|${cell.tier}`]);
  const picksAll = useMemo(() => (cell ? listOnlyPickOf(unplaced, q, cell.page) : []), [cell, unplaced, q]);
  const picks = picksAll.slice(0, LIST_ONLY_PICK_MAX);
  const more = picksAll.length - picks.length;
  if (!cell) return null;
  const { page, row, tier } = cell;
  const pos = (bay) => `${pad2(bay)}-${row}-${tier}`;
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4" data-list-place-modal="1">
      <div className="bg-ink-900 border-2 border-sky-600 rounded-card w-full sm:max-w-md overflow-hidden shadow-card max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b border-line bg-ink-800 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-dim-300">빈 칸에 실은 컨 넣기 — 선적 자료(EDI) 없음</div>
            <div className="text-base font-black text-sky-200 mono">{pageLbl(page)} · {row}열 · {tier}단</div>
          </div>
          <button onClick={onClose} className="text-dim-400 hover:text-dim-200 p-1" aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-4 py-2 border-b border-line text-xxs text-dim-200 leading-snug">
          이 칸에 실은 컨의 끝 4자리를 넣으세요. 누르면 그 자리로 적고 선적 완료까지 함께 기록합니다. 40·45피트는 짝수 베이, 20피트는 홀수 베이로 들어갑니다.
        </div>
        <div className="p-3 space-y-2 overflow-y-auto">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 11))} {...NUM_INPUT_PROPS}
            placeholder="끝 4자리" data-list-place-q="1"
            className="w-full px-3 py-3 bg-ink-800 border border-sky-600 rounded text-2xl font-black mono text-sky-100 text-center" />
          {String(q).length >= 2 && picks.length === 0 && (
            <div className="text-xs text-amber-300 text-center py-2">자리 모르는 리스트 컨 가운데 «{q}» 가 없습니다 — 이미 넣었거나 리스트에 없는 컨입니다.</div>
          )}
          {picks.map(({ c, bay, why }) => (
            <button key={c.cn} disabled={!bay || busy} onClick={() => bay && onPlace && onPlace(c, bay)} data-list-place-pick={c.cn}
              className={`w-full text-left rounded-pill px-3 py-2 border ${bay ? 'bg-ink-800 hover:bg-sky-900 border-sky-700 text-dim-100' : 'bg-ink-900 border-line text-dim-500'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="mono font-black text-base"><CnText cn={c.cn} /></span>
                <span className="text-xxs mono">{isoToLabel(c.iso || c.tp || '') || c.iso || '규격 미상'} · {String(c.fe || '').toUpperCase() === 'E' ? '엠티' : '풀'} · {c.pod || '-'}</span>
              </div>
              <div className="text-xxs mt-0.5">{bay ? <span className="text-sky-300 font-bold">{busy ? '적는 중…' : `→ ${pos(bay)} 에 싣고 선적 완료`}</span> : <span className="text-amber-400">{why}</span>}</div>
            </button>
          ))}
          {more > 0 && <div className="text-xs text-amber-300 text-center" data-list-place-more={more}>외 {more}대 — 끝 4자리를 더 넣으세요.</div>}
          <div className="text-2xs text-dim-400 leading-snug">실 EDI 가 나중에 오면 EDI 자리가 계획 자리가 되고, 여기서 넣은 자리는 실제 실은 자리로 남습니다(다르면 «📍수정됨» 으로 보입니다).</div>
        </div>
      </div>
    </div>
  );
}

//  자동 가이드·수동 — 선적 자료가 없는 빈 베이를 골랐을 때. onOpenBay 가 있으면(기존 방식) 베이 탭으로, 없으면(베이뷰) 아래 그림을 가리킨다.
export function ListOnlyBayCard({ bayLbl, n = 0, onBack, onOpenBay = null, accent = 'violet' }) {
  return (
    <div className={`bg-ink-900 border-2 ${accent === 'amber' ? 'border-amber-600' : 'border-violet-600'} rounded-pill p-3 space-y-2`} data-list-only-card="1">
      <div className="flex items-center gap-2">
        {onBack && <button onClick={onBack} className="text-xs text-dim-300 hover:text-violet-300">‹ 베이</button>}
        <div className="text-sm font-black text-sky-200">{bayLbl} — 선적 자료(EDI)가 아직 없습니다</div>
      </div>
      <div className="text-xs text-dim-200 leading-snug">
        리스트 {n}대는 실을 자리를 앱이 모릅니다. 베이 그림의 빈 칸 ＋ 를 누르고 실은 컨 끝 4자리를 넣으면 그 자리로 선적 완료가 적힙니다.
        자리 없이 완료는 ✋ 수동에서 끝 4자리로 조회해 선적확인을 누릅니다.
      </div>
      {onOpenBay
        ? <button onClick={onOpenBay} data-list-only-open="1" className="w-full py-3 rounded-pill bg-sky-700 hover:bg-sky-600 border border-sky-400 text-white font-black text-sm">🚢 베이 그림에서 빈 칸 넣기</button>
        : <div className="text-xxs font-bold text-sky-300 text-center">아래 베이 그림의 ＋ 칸을 누르세요.</div>}
    </div>
  );
}
