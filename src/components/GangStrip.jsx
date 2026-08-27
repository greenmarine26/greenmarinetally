// 갱 배분 카고플랜 조감 스트립 — 조가 바뀌며 같은 그림이 «앞 조 실적 + 내 조 예상 + 남은 몫»으로 굴러간다 (2.63)
//   검수사 확정: «첫조는 일할 범위를 봐야 하고, 두번째조는 첫번째조가 어디까지 했는지 + 자기 몫,
//   마무리조는 조별 실적과 잔여. 양하에서 선적까지 이어지는거죠» — 인계가 이 그림 하나로 선다.
//   입력은 chiefAnswers.buildGangShift 의 strip/gangs/shift — 계산은 전부 한 벌에서 온다(여긴 그림만).
import React from 'react';

const GANG_C = ['', '#378ADD', '#ea8a4a', '#8b7cf0', '#4ac0a8'];   // 1~4번 갱
const GANG_LIGHT = ['', 'rgba(55,138,221,0.28)', 'rgba(234,138,74,0.28)', 'rgba(139,124,240,0.28)', 'rgba(74,192,168,0.28)'];

export default function GangStrip({ gs }) {
  //  2.70-01: 갱 수를 몰라 되묻는 상태(askGangs)면 그림이 없다 — gangs 까지 확인한다(48행이 map 한다).
  if (!gs || gs.askGangs || !Array.isArray(gs.strip) || !gs.strip.length || !Array.isArray(gs.gangs)) return null;
  const doneShiftKeys = [...new Set(gs.strip.flatMap((g) => Object.keys(g.doneBy || {})))];
  return (
    <div className="mt-2 bg-ink-950 border border-line rounded-btn p-2">
      <div className="text-xxs text-dim-300 mb-1.5">
        칸 = 베이(위 단 데크 · 아래 단 홀드) · 진한 = 이 조 작업 · 빗금 = 걸침 · 연한 = 다음 조 몫 · 회색✔ = 완료 · 진행은 각 구간 뒤쪽 끝→앞, 데크 먼저
      </div>
      <div className="flex items-stretch gap-px overflow-x-auto pb-1">
        <div className="text-2xs text-dim-400 font-bold self-center pr-1 shrink-0">선수◀</div>
        {gs.strip.map((g) => {
          //  2.63-01 (검수사 조언 «데크우선 작업»): 칸을 카고플랜처럼 위(데크)/아래(홀드) 두 단으로.
          //  단별 상태 — 잔여 0 = 회색✔ · 이 조 도달 full = 진한 갱색 · partial = 빗금 · 그 외 = 연한 색.
          const base = GANG_C[g.gang] || '#64748b';
          const light = GANG_LIGHT[g.gang] || 'rgba(100,116,139,0.25)';
          const cellStyle = (rest, total, rc) => {
            if (total <= 0) return null;
            if (rest <= 0) return { background: '#3f3f46', color: '#a1a1aa' };
            if (rc === 'full') return { background: base, color: '#fff' };
            if (rc === 'partial') return { background: `repeating-linear-gradient(45deg, ${base} 0 6px, ${light} 6px 12px)`, color: '#fff' };
            return { background: light, color: '#cbd5e1' };
          };
          const dSt = cellStyle(g.deckRest, g.deckN, g.reach && g.reach.deck);
          const hSt = cellStyle(g.holdRest, g.holdN, g.reach && g.reach.hold);
          const sp = `${g.fr > 0 ? ' ⊞' + g.fr : ''}${g.rf > 0 ? ' ❄' + g.rf : ''}${g.dg > 0 ? ' ☣' + g.dg : ''}`;
          return (
            <div key={g.label} title={`${g.label} — 전체 ${g.mv}대 (데크 ${g.deckN}·홀드 ${g.holdN} / 양하 ${g.dis}·선적 ${g.lod}) · 완료 ${g.doneN} · 잔여 ${g.restN}${Object.entries(g.doneBy || {}).map(([k, v]) => `\n${k} ${v}대`).join('')}`}
              style={{ flexGrow: Math.max(g.mv, 6), flexBasis: 0, minWidth: 30 }}
              className="rounded overflow-hidden border border-ink-900 flex flex-col">
              <div className="text-2xs font-bold leading-tight text-center text-dim-200 bg-ink-900 px-0.5">{g.label}{sp}</div>
              {dSt ? <div style={dSt} className="text-2xs leading-tight text-center px-0.5 py-0.5 flex-1">{g.deckRest <= 0 ? `✔${g.deckN}` : g.deckRest}</div> : null}
              {hSt ? <div style={hSt} className="text-2xs leading-tight text-center px-0.5 py-0.5 flex-1 border-t border-ink-900">{g.holdRest <= 0 ? `✔${g.holdN}` : g.holdRest}</div> : null}
            </div>
          );
        })}
        <div className="text-2xs text-dim-400 font-bold self-center pl-1 shrink-0">▶선미</div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xxs text-dim-200">
        {gs.gangs.map((g) => g.done
          ? <span key={g.no}><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: GANG_C[g.no] }} />{g.no}번 갱 — 구간 완료</span>
          : <span key={g.no}><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: GANG_C[g.no] }} />{g.no}번 갱({String(g.fromBay).padStart(2, '0')}~{String(g.toBay).padStart(2, '0')}) {g.from}→{g.to} 약 {g.cnt}대</span>)}
        {doneShiftKeys.length > 0 && <span className="text-dim-300">완료 실적: {doneShiftKeys.join(' · ')} (칸에 ✔)</span>}
      </div>
    </div>
  );
}
