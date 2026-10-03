// 「작업 시작」 화면 맨 위 «예상 작업 시간» 한 줄 — 무브(트윈 쌍은 1, 나머지는 한 대당 1) ÷ (갱 수 × 갱당 시간당 25 또는 30무브)
import React, { useMemo } from 'react';
import { expectedWorkTimeOf } from '../mir.js';
import { shiftCnSetOf } from '../utils.js';

const hm = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`; };

export default function ExpectedTimeLine({ voyage, voyageKey = '' }) {
  const E = useMemo(() => {
    try { return expectedWorkTimeOf(voyage, shiftCnSetOf(voyageKey || voyage?.info?.vsl || '', voyage)); }
    catch (e) { console.warn('[예상 작업 시간] 계산 실패 — 줄을 그리지 않습니다:', e); return null; }
  }, [voyage, voyageKey]);
  //  완료가 10대를 넘으면 실측 페이스가 잡힌다 — 그때부터는 미르 «몇 시에 끝나»(실측)가 말한다. 이 줄은 «처음 시작할 때»의 계획값이다.
  if (!E || E.done >= 10) return null;
  return (
    <div className="eta-line" data-eta-minutes={E.minutes} data-eta-moves={E.moves} data-eta-units={E.units}>
      <span className="eta-ico" aria-hidden="true">⏱</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm2 font-black text-dim-100">예상 작업 시간 <span className="eta-big">약 {E.exact ? hm(E.minutes) : `${hm(E.minutesMin)} ~ ${hm(E.minutes)}`}</span></div>
        <div className="text-xxs text-dim-300">20피트 {E.n20}대 · 40피트 {E.n40}대 · 트윈 {E.twinLifts}번({E.twinLifts * 2}대) + 한 대씩 {E.singles}번 → <b>{E.moves}무브</b></div>
        <div className="text-xxs text-dim-300">{E.moves}무브 ÷ ({E.gangs}갱 × 시간당 {E.rate}무브) — 트윈 {Math.round(E.twinShare * 100)}%라 {E.rate === 30 ? '트윈이 있는 작업(30)' : '싱글이 많은 작업(25)'}으로 셈</div>
        {E.posPairs > 0 && <div className="text-xxs text-dim-400">20피트 앞뒤 짝 {E.posPairs}쌍 중 트윈 {E.twinLifts}쌍{E.posPairs - E.twinLifts > 0 ? ` · 못 하는 쌍: 합계 55톤 초과 ${E.twinOver} · 무게차 초과 ${E.twinDiff}${E.twinNoWt ? ` · 무게 모름 ${E.twinNoWt}` : ''}` : ''}</div>}
        {!E.exact && <div className="text-xxs text-amber-300">⚠ 20피트 {E.unres20}대는 자리나 무게를 몰라 트윈을 못 정해 한 대씩으로 셌습니다. 트윈이 되면 최대 {E.twinMaybe}번 줄어 {E.movesMin}무브까지 빨라집니다.</div>}
        <div className="text-xxs text-dim-400">정상 작업 기준{!E.gangsKnown ? ` · 갱 수 미등록이라 ${E.gangs}갱으로 셈 — 1갱이면 약 ${hm(E.minutes1)}` : ''}</div>
        {E.planGap && <div className="text-xxs text-amber-300">⚠ 터미널 배정은 {E.planTotal}대 — 자료가 덜 들어와 앱의 {E.units}대로 셌습니다.</div>}
      </div>
    </div>
  );
}
