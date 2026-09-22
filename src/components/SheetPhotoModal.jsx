// 선적 기록지 사진 넣기 — 사진을 AI 로 읽어 «칸 자리 → 실제 컨» 표를 보이고, 검수원이 확인하면 기존 저장 함수로 선적 자리·완료를 기록한다
/* ★ TallyOne 3.58 (검수사 2026-09-22 «이것을 넣을수 있게 앱을수정해야»). 읽기·맞추기는 src/sheetPhoto.js 한 벌.
   저장은 검수원이 손으로 «실제 위치 지정 → 선적 완료» 한 것과 **같은 길**이다 — fbSetActualPosition → fbCompleteContainer(계획 자리 ediContainers 는 건드리지 않는다).
   새 저장 함수를 만들지 않는다. 조회만·호기 없음은 사진을 읽기 전에 기존 게이트(canWorkNow·getEquipNumber)로 먼저 막는다. 콘앱은 이 기록(records.*_actual·completed)을 읽어 그린다. */
import React, { useMemo, useState } from 'react';
import { readSheetPhoto, matchSheetRuns, sheetCandidates, isoOk } from '../sheetPhoto.js';
import { fbSetActualPosition, fbCompleteContainer } from '../firebase.js';
import { getEquipNumber } from '../utils.js';
import { equipGateText, canWorkNow, workGateText } from '../workChoice.js';

export default function SheetPhotoModal({ voyage, voyageKey, inspector, onClose }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [rows, setRows] = useState(null);
  const [done, setDone] = useState(null);
  const cands = useMemo(() => sheetCandidates(voyage), [voyage]);
  const rec = (voyage && voyage.loading && voyage.loading.records) || {};
  const comp = (voyage && voyage.loading && voyage.loading.completed) || {};
  const posOf = (cn) => { const r = rec[cn]; return r && r.bay_actual && !String(r.bay_actual).startsWith('__') ? `${r.bay_actual}-${r.row_actual}-${r.tier_actual}` : ''; };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (!canWorkNow()) { alert(workGateText('선적 자리 기록')); return; }   // 조회만은 보기만 — AI 를 부르기 전에 막는다
    if (!getEquipNumber()) { alert(equipGateText()); return; }
    setErr(''); setDone(null); setBusy('기록지를 읽는 중이에요 (30초쯤)…');
    try {
      const items = await readSheetPhoto(f);
      if (items.length < 2) setErr('한 번만 읽혔어요 — 두 번 대조를 못 했으니 자동 체크된 칸도 한 번 더 봐 주세요.');
      const m = matchSheetRuns(items, cands).map((r) => ({ ...r, use: !!r.cn, pick: r.cn || r.best || '' }));
      m.sort((a, b) => a.slot.localeCompare(b.slot));
      setRows(m);
      if (!m.length) setErr('손으로 고쳐 적은 칸을 못 찾았어요 — 기록지 한 장이 다 나오게 위에서 다시 찍어 주세요.');
    } catch (ex) { setErr(String(ex && ex.message || ex)); }
    finally { setBusy(''); }
  };
  const setRow = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const list = (rows || []).filter((r) => r.use && /^[A-Z]{4}\d{7}$/.test(r.pick));
    if (!list.length) return;
    const dup = list.map((r) => r.pick).filter((c, i, a) => a.indexOf(c) !== i);
    if (dup.length) { setErr(`같은 컨이 두 칸에 있어요: ${Array.from(new Set(dup)).join(', ')}`); return; }
    const slots = list.map((r) => `${r.bay}${r.row}${r.tier}`);
    const badSlot = list.filter((r) => !/^\d{6}$/.test(`${r.bay}${r.row}${r.tier}`)).map((r) => r.pick);
    if (badSlot.length) { setErr(`칸 번호는 여섯 자리(베이·열·단)로 적어 주세요: ${badSlot.join(', ')}`); return; }
    const dupS = slots.filter((c, i, a) => a.indexOf(c) !== i);
    if (dupS.length) { setErr(`한 칸에 컨이 둘이에요: ${Array.from(new Set(dupS)).join(', ')} — 칸 번호를 고쳐 주세요`); return; }
    if (!window.confirm(`${list.length}대의 선적 자리를 기록할까요?\n(이미 같은 자리인 컨은 건너뜁니다)`)) return;
    setBusy('기록하는 중…'); setErr('');
    const by = inspector || ''; const equip = getEquipNumber ? (getEquipNumber() || '') : '';
    let n = 0, skip = 0; const fail = [];
    for (const r of list) {
      const to = `${r.bay}-${r.row}-${r.tier}`;
      try {
        if (posOf(r.pick) === to && comp[r.pick]) { skip++; continue; }
        await fbSetActualPosition(voyageKey, 'loading', r.pick, r.bay, r.row, r.tier, by);
        if (!comp[r.pick]) await fbCompleteContainer(voyageKey, 'loading', r.pick, by, 'normal', '', equip);
        n++;
      } catch (ex) { fail.push(`${r.pick}: ${ex && ex.message || ex}`); }
    }
    setBusy(''); setDone({ n, skip, fail });
  };

  const nAuto = rows ? rows.filter((r) => r.cn).length : 0;
  return (
    <div className="fixed inset-0 z-[10005] bg-black/70 flex items-end sm:items-center justify-center" role="dialog" aria-label="기록지 사진 넣기">
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-ink-900 border-t-2 sm:border-2 border-amber-500 sm:rounded-2xl rounded-t-2xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 text-sm font-black text-white">📷 기록지 사진으로 선적 자리 넣기</div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded bg-ink-800 border border-line text-dim-100" aria-label="닫기">✕</button>
        </div>
        <div className="text-2xs text-dim-300 mb-2 leading-relaxed">베이플랜 인쇄물에 손으로 고쳐 적은 기록지를 한 장이 다 나오게 위에서 찍어 주세요. 미르가 칸마다 손글씨 번호를 읽고, 이 배의 컨 목록(선적 계획·시프팅 {cands.length}대)과 맞춰 봅니다. 확인한 뒤에 기록합니다.</div>
        {/* 3.58-04: capture 가 붙으면 폰이 카메라만 연다(검수사 «카메라로 찍어야만 되게 되어 있음 앨범에서 선택되고 해주면») — 찍기와 앨범 두 단추로 나눈다 */}
        <div className="flex gap-2">
          <label className="flex-1 text-center py-3 rounded-lg bg-amber-500 text-[#1a1206] font-black text-sm cursor-pointer">
            📷 사진 찍기
            <input id="sheetPhotoCam" type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          </label>
          <label className="flex-1 text-center py-3 rounded-lg bg-ink-800 border-2 border-amber-500 text-amber-200 font-black text-sm cursor-pointer">
            🖼 앨범에서 고르기
            <input id="sheetPhotoIn" type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>
        {busy && <div className="mt-2 text-xs text-amber-200 font-bold animate-pulse">{busy}</div>}
        {err && <div className="mt-2 text-xs text-red-300 font-bold">⚠ {err}</div>}
        {rows && rows.length > 0 && (
          <>
            <div className="mt-3 text-xs text-white font-bold">읽은 칸 {rows.length} · 자동으로 맞춘 칸 {nAuto} · 확인 필요 {rows.length - nAuto}</div>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-2xs text-dim-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead><tr className="text-dim-300"><th className="text-left p-1">넣기</th><th className="text-left p-1">칸</th><th className="text-left p-1">컨번호</th><th className="text-left p-1">읽은 글자</th><th className="text-left p-1">지금 앱</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const now = posOf(r.pick); const same = now === `${r.bay}-${r.row}-${r.tier}`;
                    return (
                      <tr key={i} className={`border-t border-line ${r.cn ? '' : 'bg-amber-900/30'}`} data-slot={r.slot}>
                        <td className="p-1"><input type="checkbox" checked={r.use} onChange={(e) => setRow(i, { use: e.target.checked })} aria-label={`${r.slot} 넣기`} /></td>
                        <td className="p-1">
                          <input value={`${r.bay}${r.row}${r.tier}`} inputMode="numeric" onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setRow(i, { bay: v.slice(0, 2), row: v.slice(2, 4), tier: v.slice(4, 6) }); }}
                            className={`w-16 bg-ink-950 border rounded px-1 py-0.5 font-mono font-bold ${r.dupSlot ? 'border-amber-400 text-amber-200' : 'border-line text-white'}`} aria-label={`${r.slot} 칸 번호`} />
                        </td>
                        <td className="p-1">
                          <input value={r.pick} onChange={(e) => setRow(i, { pick: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                            className={`w-28 bg-ink-950 border rounded px-1 py-0.5 font-mono ${isoOk(r.pick) ? 'border-line text-white' : 'border-red-500 text-red-200'}`} aria-label={`${r.slot} 컨번호`} />
                          {!r.cn && <div className="text-amber-200">{r.why}{r.second ? ` · 2위 ${r.second}` : ''}</div>}
                        </td>
                        <td className="p-1 font-mono text-dim-300">{r.prefix || '····'} {r.digits}</td>
                        <td className="p-1">{now ? (same ? <span className="text-emerald-300">같은 자리</span> : <span className="text-amber-200">{now} → 옮김</span>) : (comp[r.pick] ? '자리 없음' : '새로')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={save} disabled={!!busy} className="mt-3 w-full py-3 rounded-lg bg-emerald-600 text-white font-black text-sm disabled:opacity-60">확인한 칸 기록하기</button>
          </>
        )}
        {done && (
          <div className="mt-2 text-xs font-bold text-emerald-200">기록 {done.n}대 · 이미 같은 자리 {done.skip}대{done.fail.length ? <span className="text-red-300"> · 실패 {done.fail.length}대 — {done.fail.join(' / ')}</span> : ''}</div>
        )}
      </div>
    </div>
  );
}
