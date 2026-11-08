// 주간조·야간조 고르기 단추 한 벌(4.79) — 로그인 선택 화면과 옛 로그인(조 값 없음)의 한 번 묻기 창이 같이 쓴다.
import React from 'react';
import { shiftWindowText, nowShift, shiftLabel } from '../workShift.js';

export default function ShiftPick({ value = '', onPick }) {
  const cur = nowShift();
  return (
    <div className="bg-ink-900 border border-sky-700 rounded-pill p-2" data-choice-shift-box="1">
      <div className="text-xxs font-bold text-sky-300 mb-1">근무조 — 주간조입니까 야간조입니까? (지금은 {shiftLabel(cur)} 시간)</div>
      <div className="grid grid-cols-2 gap-1.5">
        {['day', 'night'].map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} data-choice-shift={s}
            className={`py-2.5 rounded-pill border-2 text-sm font-black ${value === s ? 'bg-sky-700 border-sky-300 text-white' : 'bg-ink-800 border-line text-sky-100'}`}>
            {s === 'day' ? '☀ 주간조' : '🌙 야간조'}<span className="block text-xxs font-bold opacity-80">{shiftWindowText(s)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
