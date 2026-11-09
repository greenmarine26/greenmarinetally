// 선적 화면의 «＋ 시프팅 추가» — 양하 직후 같은 배에 다시 실은 컨을 번호와 도착 자리로 시프팅 리스트에 넣는다(양하 모드 컨 상세의 표기와 같은 저장)
import React, { useMemo, useState } from 'react';
import { fmtShiftPos, shiftManualFromOf, shiftTargetOccupiedBy } from '../utils.js';
import { fbSetShiftManual } from '../firebase.js';
import { isChief } from '../staffList.js';
import { isOwnerName } from '../adminGuard.js';
import { canWorkNow } from '../workChoice.js';   // 조회만이면 쓰는 단추를 그리지 않는다(3.55-01 규칙)

// 숫자만 받아 n 자리로 채운다. min 보다 작거나 n 자리를 넘으면 빈 값(4.82 감사와 같은 범위 검사)
const dig = (v, n, min = 0) => {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  const k = parseInt(d, 10);
  return (k < min || String(k).length > n) ? '' : String(k).padStart(n, '0');
};

export default function ShiftAddBox({ voyageKey, inspector, mode, dischargeEdi, loadingEdi, cands = [] }) {
  const podCan = (() => { try { return isChief(inspector) || isOwnerName(inspector); } catch (e) { console.warn('[4.83 시프팅 추가] 권한 판정 실패 — 숨깁니다:', e); return false; } })();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cn, setCn] = useState('');
  const [bay, setBay] = useState('');
  const [row, setRow] = useState('');
  const [tier, setTier] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const ediKeys = useMemo(() => Object.keys(dischargeEdi || {}), [dischargeEdi]);
  const found = useMemo(() => {
    const t = String(q || '').trim().toUpperCase();
    if (t.length < 3) return [];
    return ediKeys.filter((k) => (/^\d+$/.test(t) ? k.endsWith(t) : k.includes(t))).slice(0, 6);
  }, [q, ediKeys]);
  const candSet = useMemo(() => new Set((cands || []).map((x) => x.cn)), [cands]);
  const vObj = useMemo(() => ({ discharge: { ediContainers: dischargeEdi || {} }, loading: { ediContainers: loadingEdi || {} } }), [dischargeEdi, loadingEdi]);
  const from = cn ? shiftManualFromOf(vObj, cn) : '';
  const to = (dig(bay, 3, 1) && dig(row, 2) && dig(tier, 2, 1)) ? `${dig(bay, 3, 1)}${dig(row, 2)}${dig(tier, 2, 1)}` : '';
  const occ = useMemo(() => (cn && to ? shiftTargetOccupiedBy(vObj, to, cn) : []), [cn, to, vObj]);

  if (mode !== 'loading' || !podCan || !voyageKey || !canWorkNow()) return null;

  const pick = (k) => { setCn(k); setQ(k); setErr(''); setDone(''); setOpen(true); };
  const reset = () => { setCn(''); setQ(''); setBay(''); setRow(''); setTier(''); setNote(''); setErr(''); };
  const save = async () => {
    if (busy) return;
    if (!inspector) { setErr('검수원을 먼저 선택하세요.'); return; }
    const cn0 = cn;
    setBusy(true); setErr(''); setDone('');
    try {
      await fbSetShiftManual(voyageKey, cn0, { from, to, note }, inspector);
      setDone(`${cn0} 시프팅 저장 — 쉬프팅(재적부) 목록에 올라옵니다.`);
      reset(); setOpen(false);
    } catch (e) { setErr(`저장하지 못했습니다 — ${(e && e.message) || e}`); }   // 조용히 실패 금지
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3" data-shift-add-box="1">
      {cands.length > 0 && (
        <div className="mb-2 px-3 py-2 bg-amber-950/40 border border-amber-700/50 rounded-pill text-xxs text-amber-200 leading-snug" data-shift-cand={cands.length}>
          양하 EDI 에는 있는데 양하 리스트에 없는 컨 {cands.length}대 — 시프팅인지 확인하세요.
          <div className="flex gap-1.5 flex-wrap mt-1">
            {cands.slice(0, 6).map((x) => (
              <button key={x.cn} type="button" onClick={() => pick(x.cn)} data-shift-cand-pick={x.cn}
                className="px-2 py-0.5 rounded bg-ink-800 border border-amber-700/60 text-2xs mono text-amber-100">{x.cn}{x.from ? ` · ${fmtShiftPos(x.from)}` : ''}</button>
            ))}
          </div>
        </div>
      )}
      {done && <div className="mb-2 px-3 py-2 bg-emerald-950/40 border border-emerald-700/50 rounded-pill text-xxs text-emerald-200" data-shift-add-done="1">{done}</div>}
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setDone(''); }} data-shift-add-open="1"
          className="px-2 py-1 rounded bg-ink-800 border border-line text-2xs font-bold text-dim-300">＋ 시프팅 추가 (양하하고 바로 실은 컨)</button>
      ) : (
        <div className="px-3 py-2 bg-ink-900 border border-blue-700/60 rounded-pill" data-shift-add-form="1">
          <div className="text-xs font-black text-blue-200">🔵 시프팅 추가 — 양하하고 같은 배에 바로 실은 컨</div>
          <div className="text-3xs text-dim-300 mt-0.5 leading-snug">컨 번호나 끝 4자리를 치면 양하 EDI 에서 찾습니다. 도착 베이·열·단을 적으면 쉬프팅(재적부) 목록에 오르고 평택 양하 대수에서 빠집니다.</div>
          <input value={q} onChange={(e) => { setQ(e.target.value.toUpperCase()); setCn(''); setErr(''); }} placeholder="컨 번호 · 끝 4자리 (예 7307)" data-shift-add-q="1"
            className="w-full mt-1.5 px-2 py-1 rounded bg-ink-800 border border-line text-xs mono text-dim-100"/>
          {!cn && found.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {found.map((k) => (
                <button key={k} type="button" onClick={() => pick(k)} data-shift-add-found={k}
                  className="px-2 py-0.5 rounded bg-ink-800 border border-line text-2xs mono text-dim-100">{k}{candSet.has(k) ? ' · 리스트에 없음' : ''}</button>
              ))}
            </div>
          )}
          {!cn && q.trim().length >= 3 && found.length === 0 && <div className="text-xxs text-amber-200 mt-1">양하 EDI 에 그 번호가 없습니다.</div>}
          {cn && (
            <>
              <div className="text-xxs text-dim-100 mt-1.5" data-shift-add-from={from}>{cn} · 지금 자리 {from ? fmtShiftPos(from) : '읽지 못함'}</div>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                <input value={bay} onChange={(e) => setBay(e.target.value)} placeholder="베이 (예 2)" inputMode="numeric" data-shift-add-bay="1"
                  className="px-2 py-1 rounded bg-ink-800 border border-line text-xs mono text-dim-100"/>
                <input value={row} onChange={(e) => setRow(e.target.value)} placeholder="열 (예 01)" inputMode="numeric" data-shift-add-row="1"
                  className="px-2 py-1 rounded bg-ink-800 border border-line text-xs mono text-dim-100"/>
                <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="단 (예 04)" inputMode="numeric" data-shift-add-tier="1"
                  className="px-2 py-1 rounded bg-ink-800 border border-line text-xs mono text-dim-100"/>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모(선택)" data-shift-add-note="1"
                  className="col-span-3 px-2 py-1 rounded bg-ink-800 border border-line text-xs text-dim-100"/>
              </div>
              {to && <div className="text-xxs text-blue-100/90 mt-1" data-shift-add-to={to}>도착 자리 {fmtShiftPos(to)}</div>}
              {occ.length > 0 && (
                <div className="text-xxs text-amber-200 mt-0.5 leading-snug" data-shift-add-occ="1">⚠ 그 자리에 이미 {occ.slice(0, 3).map((x) => `${x.cn}(${x.where})`).join(' · ')}{occ.length > 3 ? ` 외 ${occ.length - 3}대` : ''} 가 있습니다. 맞는 자리인지 확인하십시오.</div>
              )}
            </>
          )}
          <div className="flex gap-1.5 mt-1.5">
            <button type="button" onClick={save} disabled={busy || !cn || !to || !from} data-shift-add-save="1"
              className="flex-1 px-2 py-1 rounded bg-blue-700 text-ink-950 text-2xs font-black disabled:opacity-50">{busy ? '저장 중…' : '저장'}</button>
            <button type="button" onClick={() => { reset(); setOpen(false); }} disabled={busy}
              className="px-2 py-1 rounded bg-ink-800 border border-line text-2xs text-dim-300 disabled:opacity-50">취소</button>
          </div>
          {err && <div className="text-3xs text-rose-300 mt-1">{err}</div>}
        </div>
      )}
    </div>
  );
}
