// TallyOne 1.8-15: 카톡 작업방 기록으로 타임시트를 메운다
//
// 왜 (검수사 확정 2026-08-05)
//   해치커버를 앱이 아니라 카톡에 손으로 쳐서 보고한 건이 많다. 그래서 앱 기록엔 오픈만 남고
//   클로즈가 비어, 마감 텔리 타임시트가 "커버가 열린 채 마감"으로 나왔다 — 불가능한 서류다.
//   카톡방에는 실제로 다 남아 있으니 **그 방을 정본으로 삼아 빠진 것만 메운다.**
//   "마감텔리후 부족할걸 카톡 메시지 복사로 해결" — 예보 파서와 같은 방식.
//
// ⚠ 지어내지 않는다. 붙여넣은 글에 있는 것만 담고, 이미 앱에 있는 건 회색으로 빼 둔다.
//   추가는 사람이 눌러야 들어간다.
import React, { useState, useMemo } from 'react';
import { X, ClipboardPaste, Check, Loader2 } from 'lucide-react';
import { parseKakaoWorkLog, diffAgainstReports } from '../kakaoWorkLog.js';
import { bayGroupCenter } from '../swapGrade.js';
import { getBayPairs } from '../twin.js';
import { fbAddReportsAt } from '../firebase.js';

const HHMM = (ms) => new Date(ms).toLocaleString('ko-KR',
  { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const ACT_KO = {
  discharge_start: '양하 시작', discharge_done: '양하 완료',
  loading_start: '선적 시작', loading_done: '선적 완료',
  pause: '중단', resume: '재개',
};

export default function KakaoLogImportModal({ voyage, voyageKey, base, onClose, onDone }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [picked, setPicked] = useState(null);   // null = 아직 안 골랐으면 '빠진 것' 전부 선택

  const bayPairs = useMemo(() => {
    const all = [];
    for (const m of ['discharge', 'loading']) {
      for (const c of Object.values((voyage?.[m] || {}).ediContainers || {})) if (c) all.push(c);
    }
    return getBayPairs(all, voyage?.info?.imo || '', voyage?.info?.vsl || '');
  }, [voyage]);
  const groupOf = (b) => bayGroupCenter(b, bayPairs);

  // 작업 시작일 — 붙여넣은 글에 날짜 전환선이 나오기 전까지의 기준일
  const baseDate = useMemo(() => {
    const pd = String(voyage?.info?.planDate || '');
    const m = pd.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
  }, [voyage]);

  const rows = useMemo(() => {
    if (!text.trim()) return [];
    const { items } = parseKakaoWorkLog(text, { baseDate });
    return diffAgainstReports(items, voyage?.reports || {}, groupOf);
  }, [text, voyage, bayPairs, baseDate]);   // eslint-disable-line react-hooks/exhaustive-deps

  const missing = rows.filter((r) => !r.dup);
  const sel = picked || new Set(missing.map((r) => r.ts + '|' + r.raw));
  const keyOf = (r) => r.ts + '|' + r.raw;
  const toggle = (r) => {
    const n = new Set(sel);
    const k = keyOf(r);
    if (n.has(k)) n.delete(k); else n.add(k);
    setPicked(n);
  };

  const add = async () => {
    const take = missing.filter((r) => sel.has(keyOf(r)));
    if (!take.length) { setMsg('추가할 항목이 없습니다.'); return; }
    setBusy(true); setMsg('');
    try {
      const items = take.map((r) => (r.kind === 'hatch'
        ? { ts: r.ts, type: 'hatch', action: r.action, bays: r.bays, panelCount: r.panelCount ?? null, equip: r.equip || '', message: r.raw }
        : { ts: r.ts, type: 'work_status', action: r.action, mode: r.mode || '', equip: r.equip || '', message: r.raw }));
      const { added, skipped } = await fbAddReportsAt(base, items);
      setMsg(`✅ ${added}건 기록에 추가${skipped ? ` · ${skipped}건 건너뜀(이미 있음)` : ''} — 마감 텔리를 다시 만들면 타임시트에 반영됩니다.`);
      setPicked(new Set());
      if (onDone) onDone();
    } catch (e) {
      setMsg(`추가 실패: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-amber-800/60 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-amber-400"/>
            <span className="font-bold text-amber-200 text-[14px]">카톡 기록으로 타임시트 채우기</span>
          </div>
          <button onClick={onClose} className="text-slate-500 p-2" style={{ minHeight: 40 }}><X className="w-5 h-5"/></button>
        </div>

        <div className="px-4 py-2 border-b border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">
            작업방 대화를 그대로 붙여넣으세요. 앱이 보낸 것·손으로 친 것 섞여 있어도 됩니다.
            <span className="text-slate-500"> (사진·잡담은 자동으로 걸러집니다)</span>
          </div>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setPicked(null); setMsg(''); }}
            rows={5} placeholder={'[검수사] [22:16] 26번베이 커버 2장 오픈\n[검수사] [22:47] 13&15 H/O 2장 입니다'}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-600 rounded px-2 py-1.5 text-[12px] text-slate-200 focus:outline-none"/>
        </div>

        {text.trim() && (
          <div className="px-4 py-1.5 text-[11px] border-b border-slate-800 flex items-center gap-3 flex-wrap">
            <span className="text-slate-400">읽음 <b className="text-slate-200">{rows.length}</b>건</span>
            <span className="text-amber-300">앱에 없음 <b>{missing.length}</b>건</span>
            <span className="text-slate-600">이미 있음 {rows.length - missing.length}건</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {rows.map((r) => {
            const k = keyOf(r);
            const on = !r.dup && sel.has(k);
            const label = r.kind === 'hatch'
              ? `해치커버 ${r.action === 'open' ? '오픈' : '클로즈'} · 베이 ${r.bays.join('&')}${r.panelCount ? ` · ${r.panelCount}장` : ''}`
              : (ACT_KO[r.action] || r.action);
            return (
              <button key={k + Math.random()} onClick={() => !r.dup && toggle(r)} disabled={r.dup}
                className={`w-full text-left px-2 py-1.5 rounded border flex items-start gap-2 ${
                  r.dup ? 'bg-slate-900 border-slate-800 opacity-50'
                    : on ? 'bg-amber-900/25 border-amber-700/60' : 'bg-slate-800/40 border-slate-700'}`}>
                <span className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] ${
                  r.dup ? 'bg-slate-700 text-slate-500' : on ? 'bg-amber-600 text-white' : 'border border-slate-600'}`}>
                  {r.dup ? '–' : on ? '✓' : ''}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-[12px] text-slate-200">{HHMM(r.ts)}</span>
                  <span className="text-[12px] text-amber-200 ml-2">{label}</span>
                  {r.equip && <span className="text-[11px] text-slate-500 ml-2">{r.equip}</span>}
                  {r.dup && <span className="text-[10px] text-slate-500 ml-2">이미 기록됨</span>}
                  <span className="block text-[10px] text-slate-600 truncate">← {r.raw}</span>
                </span>
              </button>
            );
          })}
          {text.trim() && rows.length === 0 && (
            <div className="text-[12px] text-slate-500 py-4 text-center">읽을 수 있는 작업 기록이 없습니다.</div>
          )}
        </div>

        {msg && <div className="px-4 py-1.5 text-[11px] text-emerald-300 border-t border-slate-800">{msg}</div>}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-[12px] bg-slate-800 text-slate-400" style={{ minHeight: 44 }}>닫기</button>
          <button onClick={add} disabled={busy || !missing.length}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] font-bold bg-amber-700 hover:bg-amber-600 text-white flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ minHeight: 44 }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            기록에 추가 ({missing.filter((r) => sel.has(keyOf(r))).length}건)
          </button>
        </div>
      </div>
    </div>
  );
}
