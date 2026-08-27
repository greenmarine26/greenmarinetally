// 오늘·내일 작업 타임라인 — PC 로그인 화면 하단(검수사 확정 2026-08-27: «컴화면 로그인 화면에 공백이
//   있어 보입니다. 여기 밑부분을 정리하면 적당할듯 합니다. 폰은 지금도 좋은거 같아요» — 폰은 안 그린다).
//   Premium-Vessel-Tracker(검수사 제공)에서 채택한 유일한 아이디어 «시간축 그림» — 수치는 전부 실데이터:
//   작업시작 = board.ships.ms(planDate — 도선+90/120 이 이미 가산된 정본), 작업중 = rank 0(isWorkingNow
//   한 벌), 도선 = pilot_forecast(2.5-02 콜사인 수집). 지어낸 날씨·조석·+30분 규칙은 가져오지 않았다.
import React, { useEffect, useState } from 'react';

//  축 위치(%) — 오늘 00:00 기준 48시간. smoke 가 이 수식을 잰다.
export function tlPos(ms, day0) {
  if (!ms) return null;
  const p = ((ms - day0) / (48 * 3600000)) * 100;
  return p < 0 ? 0 : p > 100 ? 100 : p;
}

export default function WorkTimeline({ ships = [], pilotForecast = {} }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const day0 = d0.getTime();
  const H = 3600000;
  const rows = ships.slice(0, 8);
  if (!rows.length) return null;
  const fmt = (ms) => `${String(new Date(ms).getHours()).padStart(2, '0')}:${String(new Date(ms).getMinutes()).padStart(2, '0')}`;
  const pfArr = (vsl) => {   //  도선 예보 입항 시각(ms) — 코드 키(수집기가 코드로 저장)
    const p = pilotForecast[String(vsl || '').toUpperCase()];
    const m = String(p?.nextArr || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null;
  };
  //  조 경계(주간 08:00~17:30 · 야간 19:00~06:30) — 이틀치. 교대 공백은 옅은 밴드.
  const gaps = [];
  for (const d of [0, 1, 2]) {
    gaps.push([day0 + d * 24 * H + 6.5 * H, day0 + d * 24 * H + 8 * H]);      // 06:30~08:00
    gaps.push([day0 + d * 24 * H + 17.5 * H, day0 + d * 24 * H + 19 * H]);    // 17:30~19:00
  }
  return (
    <div className="mt-5 bg-ink-950/60 border border-line rounded-card p-4">
      <div className="text-[10.5px] tracking-[0.16em] text-dim-300 mb-3 font-bold">■ 오늘 · 내일 작업 타임라인 — LIVE</div>
      <div className="relative border border-line rounded overflow-hidden bg-ink-900/40" style={{ height: 28 + rows.length * 26 }}>
        {gaps.map(([a, b], i) => { const pa = tlPos(a, day0), pb = tlPos(b, day0); if (pa == null || pb == null || pb <= pa) return null;
          return <div key={'g' + i} className="absolute top-0 bottom-0 bg-ink-700/25" style={{ left: pa + '%', width: (pb - pa) + '%' }} title="교대 공백 (06:30~08:00 · 17:30~19:00)" />; })}
        {[0, 1].map((d) => (
          <React.Fragment key={'b' + d}>
            <div className="absolute top-0 bottom-4 border-l border-dashed border-dim-500/60" style={{ left: tlPos(day0 + d * 24 * H + 17.5 * H, day0) + '%' }} title="주간 끝 17:30" />
            <div className="absolute top-0 bottom-4 border-l border-dashed border-dim-500/60" style={{ left: tlPos(day0 + d * 24 * H + 19 * H, day0) + '%' }} title="야간 시작 19:00" />
          </React.Fragment>
        ))}
        <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10" style={{ left: tlPos(now, day0) + '%' }}>
          <span className="absolute top-0 left-0.5 text-[9px] text-red-400 font-bold whitespace-nowrap">NOW {fmt(now)}</span>
        </div>
        {rows.map((sp, i) => {
          const y = 14 + i * 26;
          const start = tlPos(sp.ms, day0);
          const pilotMs = pfArr(sp.vsl);
          const pilot = pilotMs ? tlPos(pilotMs, day0) : null;
          const working = sp.rank === 0;
          return (
            <React.Fragment key={sp.key}>
              {pilot != null && start != null && pilot < start && (
                <div className="absolute h-px bg-sky-500/60" style={{ top: y + 10, left: pilot + '%', width: (start - pilot) + '%' }} />)}
              {pilot != null && (
                <span className="absolute text-[9.5px] text-sky-300 whitespace-nowrap" style={{ top: y, left: pilot + '%' }} title={`도선 ${fmt(pilotMs)}`}>⚓{fmt(pilotMs)}</span>)}
              {start != null && (
                <span className={`absolute text-[10px] font-bold rounded px-1.5 py-0.5 whitespace-nowrap border ${working
                  ? 'bg-emerald-600/80 text-white border-emerald-400/50'
                  : (sp.ms - day0 < 24 * H ? 'bg-sky-700/80 text-sky-50 border-sky-500/50' : 'bg-amber-800/70 text-amber-100 border-amber-600/50')}`}
                  style={{ top: y, left: `min(${start}%, 93%)` }}
                  title={`${sp.vsl} 작업 ${fmt(sp.ms)}${working ? ' (작업중)' : ''}`}>
                  {sp.vsl} {working ? '작업중' : fmt(sp.ms)}
                </span>)}
            </React.Fragment>
          );
        })}
        <div className="absolute bottom-0 left-0 right-0 flex text-[9px] text-dim-400 border-t border-line bg-ink-950/70">
          {['오늘 00', '04', '08', '12', '16', '20', '내일 00', '04', '08', '12', '16', '20'].map((t, i) => (
            <span key={i} className={`flex-1 px-1 ${i === 6 ? 'border-l border-line' : ''}`}>{t}</span>))}
        </div>
      </div>
      <div className="text-[10px] text-dim-400 mt-1.5">빨간 선 = 지금 · 점선 = 조 경계(17:30 / 19:00) · 회색 밴드 = 교대 공백 · ⚓ = 도선 예보 · 초록 = 작업중 · 파랑 = 오늘 · 주황 = 내일</div>
    </div>
  );
}
