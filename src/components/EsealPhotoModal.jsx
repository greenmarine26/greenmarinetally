// 엠티실 기록지 사진 넣기 — 손글씨 실 끝 세 자리를 AI 로 읽어 배정 구간의 여섯 자리로 만들고, 검수원이 확인하면 컨 상세 입력과 같은 저장 함수로 기록한다
/* ★ TallyOne 3.60 (검수사 2026-09-24 «ATPR 엠티실 자료도 카메라 또는 사진 자료로 첨부 할수 있게 해주고 … 036 이라고 자료를 받으면 6자리로 만들어서 리스트에 기록»).
   읽기·맞추기는 src/esealPhoto.js 한 벌. 저장은 fbSetEmptySeal(컨 상세의 엠티실 입력과 같은 길 — 이력·ediContainers 반영 포함). 새 저장 함수를 만들지 않는다.
   조회만은 사진을 읽기 전에 막는다(canWorkNow). 기록지 사진(SheetPhotoModal)과 같은 손 조작 — 찍기·앨범 두 단추, 모두 선택/해제, 확인 필요만 보기, 기록한 줄 잠금. */
import React, { useMemo, useState } from 'react';
import { readEsealPhoto, matchEsealRuns } from '../esealPhoto.js';
import { fbSetEmptySeal } from '../firebase.js';
import { canWorkNow, workGateText } from '../workChoice.js';

export default function EsealPhotoModal({ voyageKey, info, inspector, onClose }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [onlyChk, setOnlyChk] = useState(false);
  const [rows, setRows] = useState(null);
  const [done, setDone] = useState(null);
  const targets = useMemo(() => (info.targets || []).map((c) => c.cn).filter(Boolean), [info]);
  const pool = info.pool || [];
  const poolSet = useMemo(() => new Set(pool), [pool]);
  const cur = useMemo(() => { const m = {}; for (const u of (info.usedPairs || [])) m[u.cn] = u.seal; return m; }, [info]);   // 컨 → 지금 붙은 실
  const used = useMemo(() => { const m = {}; for (const u of (info.usedPairs || [])) m[u.seal] = u.cn; return m; }, [info]); // 실 → 붙은 컨

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (rows && rows.some((r) => !r.saved) && !window.confirm('아직 기록하지 않은 줄이 있어요. 새 사진으로 바꾸면 지금 표(손으로 고친 것 포함)가 사라집니다. 바꿀까요?')) return;
    if (!canWorkNow()) { alert(workGateText('엠티실 기록')); return; }
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    setErr(''); setNote(''); setDone(null); setBusy('엠티실 기록지를 읽는 중이에요 (30초~1분)…');
    try {
      const runs = await readEsealPhoto(f);
      if (runs.length < 2) setNote('한 번만 읽혔어요 — 두 번 대조를 못 했으니 자동 체크된 줄도 한 번 더 봐 주세요.');
      const m = matchEsealRuns(runs, targets, pool, used).map((r) => ({ ...r, use: runs.length >= 2 && !!r.ok }));   // 3.60-06 (진단 M29): 한 번만 읽혔으면 자동 체크하지 않는다
      m.sort((a, b) => (a.no || 999) - (b.no || 999));
      setRows(m);
      if (!m.length) setErr('손으로 적은 실 번호를 못 찾았어요 — 목록 한 장이 다 나오게 위에서 다시 찍어 주세요.');
    } catch (ex) { setErr(String(ex && ex.message || ex)); }
    finally { setBusy(''); }
  };
  const setRow = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const valid = (r) => targets.includes(r.pick) && poolSet.has(r.sealPick);

  const save = async () => {
    const list = (rows || []).filter((r) => r.use && !r.saved);
    if (!list.length) return;
    const bad = list.filter((r) => !valid(r));
    if (bad.length) { setErr(`컨번호가 대상에 없거나 실이 배정 구간 밖이에요: ${bad.map((r) => r.pick || '?').join(', ')}`); return; }
    const dupC = list.map((r) => r.pick).filter((c, i, a) => a.indexOf(c) !== i);
    if (dupC.length) { setErr(`같은 컨이 두 줄에 있어요: ${Array.from(new Set(dupC)).join(', ')}`); return; }
    const dupS = list.map((r) => r.sealPick).filter((c, i, a) => a.indexOf(c) !== i);
    if (dupS.length) { setErr(`같은 실이 두 컨에 있어요: ${Array.from(new Set(dupS)).join(', ')}`); return; }
    const taken = list.filter((r) => used[r.sealPick] && used[r.sealPick] !== r.pick);
    if (taken.length) { setErr(`이미 다른 컨에 붙은 실이에요: ${taken.map((r) => `${r.sealPick}(${used[r.sealPick]})`).join(', ')}`); return; }
    const chg = list.filter((r) => cur[r.pick] && cur[r.pick] !== r.sealPick).length;
    if (!window.confirm(`${list.length}대의 엠티실을 기록할까요?${chg ? `\n(이미 다른 실이 적힌 ${chg}대는 사진 번호로 바뀝니다 — 이력은 남습니다)` : ''}\n(같은 실이 이미 적힌 컨은 건너뜁니다)`)) return;
    setBusy('기록하는 중…'); setErr('');
    let n = 0, skip = 0; const fail = []; const ok = new Set();
    for (const r of list) {
      try {
        if (cur[r.pick] === r.sealPick) { skip++; ok.add(r.pick); continue; }
        await fbSetEmptySeal(voyageKey, 'loading', r.pick, { eseal: r.sealPick }, inspector, 'attach');
        n++; ok.add(r.pick);
      } catch (ex) { fail.push(`${r.pick}: ${ex && ex.message || ex}`); }
    }
    setRows((rs) => rs.map((r) => (r.use && ok.has(r.pick) ? { ...r, use: false, saved: true } : r)));
    setBusy(''); setDone({ n, skip, fail });
  };

  const nAuto = rows ? rows.filter((r) => r.ok).length : 0;
  return (
    <div className="fixed inset-0 z-[10005] bg-black/70 flex items-end sm:items-center justify-center" role="dialog" aria-label="엠티실 기록지 사진 넣기">
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-ink-900 border-t-2 sm:border-2 border-teal-500 sm:rounded-2xl rounded-t-2xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 text-sm font-black text-white">📷 엠티실 기록지 사진으로 넣기</div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded bg-ink-800 border border-line text-dim-100" aria-label="닫기">✕</button>
        </div>
        <div className="text-2xs text-dim-300 mb-2 leading-relaxed">컨 목록 종이의 Seal 칸에 손으로 적은 실 번호를, 목록 한 장이 다 나오게 위에서 찍어 주세요. 끝 세 자리만 적었으면 이 항차 배정 구간({(info.ranges || []).map((r) => `${r.from}~${r.to}`).join(' · ')})에서 여섯 자리를 찾아 채웁니다. 확인한 뒤에 기록합니다.</div>
        <div className="flex gap-2">
          <label className="flex-1 text-center py-3 rounded-lg bg-teal-500 text-[#04201c] font-black text-sm cursor-pointer">
            📷 사진 찍기
            <input id="esealPhotoCam" type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          </label>
          <label className="flex-1 text-center py-3 rounded-lg bg-ink-800 border-2 border-teal-500 text-teal-200 font-black text-sm cursor-pointer">
            🖼 앨범에서 고르기
            <input id="esealPhotoIn" type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>
        {busy && <div className="mt-2 text-xs text-teal-200 font-bold animate-pulse">{busy}</div>}
        {err && <div className="mt-2 text-xs text-red-300 font-bold">⚠ {err}</div>}
        {note && <div className="mt-2 text-xs text-amber-200 font-bold">{note}</div>}
        {rows && rows.length > 0 && (
          <>
            <div className="mt-3 text-xs text-white font-bold">읽은 줄 {rows.length} · 자동으로 맞춘 줄 {nAuto} · 확인 필요 {rows.length - nAuto}</div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setRows((rs) => rs.map((r) => (r.saved ? r : { ...r, use: valid(r) })))} className="flex-1 py-2 rounded-lg bg-ink-800 border border-line text-dim-100 text-xs font-bold">모두 선택</button>
              <button type="button" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, use: false })))} className="flex-1 py-2 rounded-lg bg-ink-800 border border-line text-dim-100 text-xs font-bold">모두 해제</button>
              <button type="button" onClick={() => setOnlyChk((v) => !v)} className={`flex-1 py-2 rounded-lg border text-xs font-bold ${onlyChk ? 'bg-amber-500 border-amber-300 text-[#1a1206]' : 'bg-ink-800 border-amber-500 text-amber-200'}`}>{onlyChk ? '전부 보기' : '확인 필요만'}</button>
            </div>
            <div className="mt-2 space-y-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {rows.map((r, i) => {
                if (onlyChk && r.ok) return null;
                const now = cur[r.pick] || '';
                return (
                  <div key={i} className={`rounded-lg border p-2 ${r.saved ? 'border-emerald-700 bg-emerald-950/40 opacity-70' : r.ok ? 'border-line bg-ink-800' : 'border-amber-500 bg-amber-900/30'}`} data-cn={r.pick}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="w-6 h-6 shrink-0" checked={!!r.use} disabled={!!r.saved} onChange={(e) => setRow(i, { use: e.target.checked })} aria-label={`${r.pick} 넣기`} />
                      <span className="w-7 text-2xs text-dim-300 text-right shrink-0">{r.no || ''}</span>
                      <input value={r.pick} disabled={!!r.saved} onChange={(e) => setRow(i, { pick: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                        className={`flex-1 min-w-0 bg-ink-950 border rounded px-2 py-2 font-mono text-sm ${targets.includes(r.pick) ? 'border-line text-white' : 'border-red-500 text-red-200'}`} aria-label={`${r.no} 컨번호`} />
                      <input value={r.sealPick} inputMode="numeric" disabled={!!r.saved} onChange={(e) => setRow(i, { sealPick: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                        className={`w-[5.5rem] bg-ink-950 border rounded px-2 py-2 font-mono font-bold text-sm ${poolSet.has(r.sealPick) ? 'border-line text-white' : 'border-red-500 text-red-200'}`} aria-label={`${r.pick} 실번호`} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
                      <span className="font-mono text-dim-300">손글씨 {r.hand || '?'}</span>
                      <span>{r.saved ? <span className="text-emerald-300 font-bold">기록됨</span> : now ? (now === r.sealPick ? <span className="text-emerald-300">같은 실 이미 기록</span> : <span className="text-amber-200">지금 {now} → 바꿈</span>) : '새로 기록'}</span>
                    </div>
                    {!r.ok && !r.saved && (
                      <div className="mt-1 text-2xs text-amber-200">{r.why}
                        {(r.choices || []).filter((x) => x && x !== r.sealPick).map((x) => (
                          <button key={x} type="button" onClick={() => setRow(i, { sealPick: x, use: true })} className="ml-2 px-2 py-1 rounded bg-amber-500 text-[#1a1206] font-bold font-mono">{x}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={save} disabled={!!busy} className="mt-3 w-full py-3 rounded-lg bg-emerald-600 text-white font-black text-sm disabled:opacity-60">확인한 줄 기록하기</button>
          </>
        )}
        {done && (
          <div className="mt-2 text-xs font-bold text-emerald-200">기록 {done.n}대 · 이미 같은 실 {done.skip}대{done.fail.length ? <div className="text-red-300 mt-1">실패 {done.fail.length}대{done.fail.map((f) => <div key={f}>· {f}</div>)}</div> : ''}</div>
        )}
      </div>
    </div>
  );
}
