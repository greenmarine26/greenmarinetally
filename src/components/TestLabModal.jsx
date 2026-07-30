// V9.25: 🧪 검증 모드 (테스트 랩) — 성일님(검수원 '김성일') 전용.
//   실항차로 기능을 재검수할 때 쓰는 도구 모음. 첫 도구: 검수확인 전체 취소.
//   위험 작업이므로 이중 확인 + 실행 결과를 숫자로 보고한다.
import React, { useMemo, useState } from 'react';
import { FlaskConical, X, Loader2 } from 'lucide-react';
import { fbBulkCancelComplete } from '../firebase.js';

export default function TestLabModal({ voyage, voyageKey, onClose }) {
  const [busy, setBusy] = useState(false);
  const [resetActuals, setResetActuals] = useState(true);
  const [log, setLog] = useState([]);

  const stat = useMemo(() => {
    const s = {};
    for (const mode of ['discharge', 'loading']) {
      const sec = voyage?.[mode] || {};
      const comp = Object.keys(sec.completed || {}).length;
      let actuals = 0;
      for (const r of Object.values(sec.records || {})) {
        if (r && r.bay_actual !== undefined && r.bay_actual !== null && r.bay_actual !== '') actuals++;
      }
      s[mode] = { comp, actuals };
    }
    return s;
  }, [voyage]);

  const run = async (mode) => {
    if (busy) return;
    const name = mode === 'loading' ? '선적' : '양하';
    const st = stat[mode];
    if (!window.confirm(`⚠ ${name}확인 ${st.comp}건을 전체 취소합니다.${resetActuals ? `\n수동 배치·임시창고 기록 ${st.actuals}건도 원계획으로 원복됩니다.` : ''}\n\n검증(재검수)용 도구입니다. 계속할까요?`)) return;
    if (!window.confirm(`정말입니까? ${voyageKey} ${name} 검수 기록이 지워집니다.\n(리스트·EDI·실번호는 유지)`)) return;
    setBusy(true);
    try {
      const r = await fbBulkCancelComplete(voyageKey, mode, { resetActuals });
      setLog(l => [`✅ ${name}: 확인 취소 ${r.canceled}건 · 배치 원복 ${r.actualsReset}건 · 마감 플래그 해제`, ...l]);
    } catch (e) {
      setLog(l => [`❌ ${name}: 실패 — ${e?.message || e}`, ...l]);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-fuchsia-700 rounded-2xl w-full sm:max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-fuchsia-400"/>
            <div>
              <div className="text-base font-black text-fuchsia-300">검증 모드 (테스트 랩)</div>
              <div className="text-[10px] text-slate-400">{voyageKey} · 성일님 전용 — 다른 검수원에겐 보이지 않습니다</div>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 rounded-lg px-3 py-2.5">
            <input type="checkbox" checked={resetActuals} onChange={e => setResetActuals(e.target.checked)} className="w-4 h-4"/>
            수동 배치·임시창고 기록도 원계획으로 원복 (완전 초기화)
          </label>
          {['loading', 'discharge'].map(mode => (
            <button key={mode} onClick={() => run(mode)} disabled={busy || !stat[mode].comp}
              className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border ${mode === 'loading' ? 'bg-rose-900/60 hover:bg-rose-800 border-rose-600 text-rose-100' : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-600 text-indigo-100'} disabled:opacity-40`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : '🧨'}
              {mode === 'loading' ? '선적' : '양하'}확인 전체 취소 — {stat[mode].comp}건{resetActuals && stat[mode].actuals ? ` (+배치 원복 ${stat[mode].actuals})` : ''}
            </button>
          ))}
          <div className="text-[10px] text-slate-500 leading-relaxed">
            리스트·EDI·실번호·X-RAY 기록은 지우지 않습니다. 완료 체크와 (옵션) 수동 배치만 초기화해
            처음부터 다시 검수 흐름을 태울 수 있습니다.
          </div>
          {log.length > 0 && (
            <div className="bg-slate-950 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-[11px] mono text-slate-300">{l}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
