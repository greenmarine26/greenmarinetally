// 작업 보고 한 건의 «수정됨» 줄과 고치기·지우기(보낸 사람만) — 4.46. 항차 «보고» 탭 목록과 작업 보고 창 «내가 보낸 보고»가 같이 쓴다.
//   검수사 2026-10-23 15:31 «잘못된 보고는 수정이 가능해야 합니다. 만약 14번 해치인데 10번 해치로 잘못기재 하거나 할때 수정내용을 기록할수 있게» ·
//   2026-10-24 08:46 «잘못된 보고 수정기능은 보고자만 수정또는 삭제 할수 있게».
//   판정은 utils 한 벌(canEditReport · applyReportEdit · reportEditSummary · activeWorkStateFromReports · hatchDoneAfterReports),
//   쓰기는 firebase 한 벌(fbEditWorkReport · fbDeleteMyWorkReport — 둘 다 쓰는 자리에서 보낸 사람을 다시 본다).
//   카톡은 다시 보내지 않는다(«기록만 고친다»). 보고 시각은 고치지 않는다(«내용만»).
import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { canEditReport, REPORT_EDIT_FIELDS, REPORT_PHOTO_TYPES, applyReportEdit, reportEditSummary, workStatusParts, isLastWorkStatusOfSlot, activeWorkStateFromReports,
  hatchDoneAfterReports, cleanReportBays, hatchReportTs, getPierFromBerth, equipNumbersForPier } from '../utils.js';
import { buildAutoHatchMessage } from '../hatchReport.js';   // 자동 해치 기록 글 한 벌(«총 장수 확인 필요» · «판정: …» 줄)
import { fbEditWorkReport, fbDeleteMyWorkReport, fbSyncActiveWorkSlot, fbUpdateVoyageInfo } from '../firebase.js';
import { buildWorkStatusMessage, buildHatchMessage, buildConBoxMessage } from '../kakaoShare.js';
import { bayGroupCenter } from '../swapGrade.js';
import { getBayPairs } from '../twin.js';

const fmtWhen = (ms) => (ms ? new Date(ms).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const voyOf = (info, mode) => (mode === 'loading' ? (info.voy_l || info.voy || '') : (info.voy_d || info.voy || ''));

/** 고친 보고의 앱 안 글(message)을 다시 쓴다 — 보낼 때와 같은 글 한 벌(kakaoShare). 자동 해치 기록의 «판정:» 줄은 살린다. */
export function reportMessageOf(next, info = {}) {
  const old = String(next.orig && next.orig.message != null ? next.orig.message : next.message || '');
  const vsl = info.vsl || ((/📍\s*(\S+)/.exec(old) || [])[1]) || '';
  if (next.type === 'hatch' && next.auto && Number(next.eventTs) > 0) {
    //  자동 판정 기록 — 처음 적을 때와 같은 글(장수를 못 셌으면 «총 장수 확인 필요» · «판정:» 줄의 호기도 고친 호기로 · 감사 하-4)
    const crane = parseInt(String(next.equip || ''), 10);
    const ev = { bays: (next.bays || []).map((b) => parseInt(b, 10)).filter((n) => n > 0), action: next.action, from: Number(next.eventTs), to: Number(next.eventEnd) || Number(next.eventTs), gapMin: next.gapMin, src: next.src, crane: crane > 0 ? crane : null };
    return buildAutoHatchMessage(ev, { vsl, voy: voyOf(info, next.mode), equip: next.equip, panelCount: next.panelCount || 0 });
  }
  if (next.type === 'hatch') {
    return buildHatchMessage({ vsl, voy: voyOf(info, next.mode), bays: next.bays, action: next.action, time: hatchReportTs(next), equip: next.equip, panelCount: next.panelCount });
  }
  if (next.type === 'work_status') {
    const p = workStatusParts(next);
    if (!p) return next.message || '';
    const act = p.verb === 'resume' ? `${p.mode}_start` : `${p.mode}_${p.verb}`;
    return buildWorkStatusMessage({ vsl, voy: voyOf(info, p.mode), action: act, time: next.ts, reason: p.verb === 'pause' ? next.reason : '', equip: next.equip }) + (p.verb === 'resume' ? '\n(재개)' : '');
  }
  if (next.type === 'conbox') {
    const voy = ((/📍\s*\S+\s+(\S+)/.exec(old) || [])[1]) || info.voy || '';
    return buildConBoxMessage({ vsl, voy, type: next.conBoxType, count: next.conBoxCount, time: next.ts, equip: next.equip });
  }
  if (next.type === 'external_pause') return /(^|\n)사유: .*/.test(old) ? old.replace(/(^|\n)사유: .*/, `$1사유: ${next.reason}`) : `${old}\n사유: ${next.reason}`;
  return next.message || old;
}

/** 이 보고의 «수정됨» 줄 — 마지막 고침과 횟수. */
export function ReportEditedLine({ report }) {
  const eds = Array.isArray(report && report.edits) ? report.edits : (report && report.edits ? Object.values(report.edits) : []);
  if (!eds.length) return null;
  const last = eds[eds.length - 1] || {};
  return (
    <div className="text-xxs text-amber-300 mt-0.5" data-report-edited="1">
      ✏ 수정됨 — {last.by || '?'} {fmtWhen(last.at)} · {reportEditSummary(last.from, last.to)}{eds.length > 1 ? ` (고친 횟수 ${eds.length})` : ''}
    </div>
  );
}

export default function ReportEditRow({ voyageKey, voyage, reports, report, me }) {
  const [editing, setEditing] = useState(false);
  const [askDel, setAskDel] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmNext, setConfirmNext] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const info = (voyage && voyage.info) || {};
  const fields = REPORT_EDIT_FIELDS[report && report.type] || [];
  const ws = report && report.type === 'work_status' ? workStatusParts(report) : null;
  const equipNumbers = equipNumbersForPier(getPierFromBerth(info.berth || ''));

  if (!report || !canEditReport(report, me)) return <ReportEditedLine report={report}/>;
  if (REPORT_PHOTO_TYPES.includes(report.type)) {
    return (
      <div>
        <ReportEditedLine report={report}/>
        <div className="text-xxs text-dim-400 mt-0.5" data-report-photo-locked="1">사진 보고(데미지·실오류)는 사진 기록과 묶여 있어 여기서 고치거나 지우지 않습니다 — 잘못 보냈으면 수석에게 알리십시오.</div>
      </div>
    );
  }

  const start = () => {
    setErr(''); setConfirmNext(null); setAskDel(false);
    setDraft({
      equip: report.equip || '', action: String(report.action || '').toLowerCase(), bays: (report.bays || []).join(', '),
      panelCount: report.panelCount || '', mode: ws ? ws.mode : (report.mode || ''), reason: report.reason || '',
      conBoxType: report.conBoxType || '', conBoxCount: report.conBoxCount || '',
    });
    setEditing(true);
  };
  const preview = () => {
    const patch = {};
    for (const k of fields) patch[k] = k === 'bays' ? cleanReportBays(draft.bays) : draft[k];
    const next = applyReportEdit(report, patch, { me, at: Date.now() });
    if (!next) { setErr('바뀐 것이 없습니다.'); return; }
    next.message = reportMessageOf(next, info);
    setErr(''); setConfirmNext(next);
  };

  //  보고를 고치거나 지운 뒤 딸린 상태 — 해치 «열림·닫힘 표시»와 «진행 중인 작업» 줄을 남은 보고에 맞춘다. 실패는 조용히 넘기지 않는다.
  const syncSide = async (before, after, rep, next) => {
    const notes = [];
    if (rep.type === 'hatch') {
      //  해치 장 계산은 작업 보고 창·자동 가이드와 같은 한 벌 — 양하·선적 컨을 모두 넣어야 짝이 온전하다(저장할 때 한 번만 센다 · 감사 하-7).
      const all = [];
      for (const m of ['discharge', 'loading']) for (const c of Object.values(((voyage && voyage[m]) || {}).ediContainers || {})) if (c) all.push(c);
      const bayPairs = getBayPairs(all, info.imo || '', info.vsl || '');
      const groupOf = (b) => bayGroupCenter(String(b), bayPairs);
      const centers = [...(rep.bays || []), ...((next && next.bays) || [])].map(groupOf);
      const hd = hatchDoneAfterReports(info.hatchDone, after, centers, groupOf);
      if (hd) {
        //  4.47(4.46 감사 하-4): 해치 표시 저장에도 12초 제한
        let t;
        try { await Promise.race([fbUpdateVoyageInfo(voyageKey, { hatchDone: hd }), new Promise((_, rej) => { t = setTimeout(() => rej(new Error('12초 안에 서버 확인을 못 받았습니다')), 12000); })]); }
        catch (e) { console.warn('[4.46] 해치 표시 맞추기 실패', e); notes.push(`해치 열림·닫힘 표시를 못 맞췄습니다 — 자동 가이드가 다시 물을 수 있습니다. (${e && e.message ? e.message : e})`); }
        finally { clearTimeout(t); }
      }
    }
    if (rep.type === 'work_status') {
      //  옛 칸(고치기 전 호기·작업) → 새 칸 순서. 줄이 없을 때 새로 만드는 것은 ① 옛 칸 줄을 옮길 때 ② 완료 보고를 지우거나 옮길 때뿐(감사 중-1 —
      //  완료 없이 끝난 칸의 옛 보고를 고쳐 없던 «진행 중» 줄이 생기지 않게).
      const p0 = workStatusParts(rep);
      const p1 = next ? workStatusParts(next) : null;
      const wasDone = !!(p0 && p0.verb === 'done');
      const sync = async (eq, md, allowCreate) => {
        const want = activeWorkStateFromReports(after, eq, md);
        try { return await fbSyncActiveWorkSlot(voyageKey, eq, md, want, { vsl: info.vsl || '', voy: voyOf(info, md), startedAt: want ? want.at : Date.now() }, { allowCreate }); }
        catch (e) { console.warn('[4.46] 진행 중 작업 맞추기 실패', eq, md, e); notes.push(`${eq} ${md === 'loading' ? '선적' : '양하'} 진행 중 표시를 못 맞췄습니다 — ${e && e.message ? e.message : e}`); return { had: false }; }
      };
      let hadOld = false;
      if (p0 && isLastWorkStatusOfSlot(before, rep)) hadOld = (await sync(rep.equip, p0.mode, wasDone)).had;
      if (p1 && (next.equip !== rep.equip || p1.mode !== (p0 && p0.mode)) && isLastWorkStatusOfSlot(after, next)) await sync(next.equip, p1.mode, hadOld || wasDone);
    }
    return notes;
  };

  const save = async () => {
    if (!confirmNext || busy) return;
    setBusy(true); setErr('');
    //  쓰기 전의 보고 묶음을 떠 둔다 — 쓰고 나면 구독 값이 바뀌어 «이 보고가 그 호기·작업의 마지막이었나»를 못 가린다.
    const before = { ...(reports || {}), [String(report.ts)]: report };
    try {
      await fbEditWorkReport(voyageKey, report.ts, confirmNext, me);
      const after = { ...before, [String(report.ts)]: confirmNext };
      const notes = await syncSide(before, after, report, confirmNext);
      setEditing(false); setConfirmNext(null);
      if (notes.length) setErr(notes.join(' '));
    } catch (e) { setErr(e && (e.unverified || e.timeout) ? String(e.message) : `고치지 못했습니다 — ${e && e.message ? e.message : e}`); }
    setBusy(false);
  };
  const del = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    const before = { ...(reports || {}), [String(report.ts)]: report };
    try {
      await fbDeleteMyWorkReport(voyageKey, report.ts, me);
      const after = { ...before }; delete after[String(report.ts)];
      const notes = await syncSide(before, after, report, null);
      setAskDel(false);
      if (notes.length) setErr(notes.join(' '));
    } catch (e) { setErr(e && (e.partial || e.timeout) ? String(e.message) : `지우지 못했습니다 — ${e && e.message ? e.message : e}`); }
    setBusy(false);
  };

  const pill = (on) => `px-2 py-1 rounded text-xs font-bold ${on ? 'bg-indigo-700 text-white' : 'bg-ink-800 text-dim-300'}`;
  const set = (k, v) => { setDraft((d) => ({ ...d, [k]: v })); setConfirmNext(null); };
  return (
    <div className="mt-1" data-report-edit-row={report.ts}>
      <ReportEditedLine report={report}/>
      {!editing && !askDel && (
        <div className="flex gap-1.5 mt-1">
          {fields.length > 0 && <button type="button" onClick={start} className="px-2 py-1 rounded bg-ink-750 text-dim-100 text-xxs font-bold flex items-center gap-1" data-report-edit="1"><Pencil className="w-3 h-3"/> 고치기</button>}
          <button type="button" onClick={() => { setAskDel(true); setEditing(false); setErr(''); }} className="px-2 py-1 rounded bg-ink-750 text-red-300 text-xxs font-bold flex items-center gap-1" data-report-del="1"><Trash2 className="w-3 h-3"/> 지우기</button>
        </div>
      )}
      {askDel && (
        <div className="mt-1 p-2 rounded border border-red-700/60 bg-red-950/30 space-y-1.5">
          <div className="text-xs text-red-200">이 보고를 지웁니까? 지운 보고는 «지운 보고»에 누가·언제 지웠는지와 함께 남습니다. 카톡은 그대로입니다.</div>
          <div className="flex gap-1.5">
            <button type="button" disabled={busy} onClick={del} className="px-3 py-1.5 rounded bg-red-700 text-white text-xs font-bold" data-report-del-ok="1">지우기</button>
            <button type="button" onClick={() => setAskDel(false)} className="px-3 py-1.5 rounded bg-ink-800 text-dim-200 text-xs font-bold">취소</button>
          </div>
        </div>
      )}
      {editing && draft && (
        <div className="mt-1 p-2 rounded border border-indigo-700/60 bg-indigo-950/30 space-y-2">
          {fields.includes('equip') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">호기</div>
              <div className="flex flex-wrap gap-1">{equipNumbers.map((n) => <button key={n} type="button" onClick={() => set('equip', n)} className={pill(draft.equip === n)}>{n}</button>)}</div></div>
          )}
          {fields.includes('action') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">동작</div>
              <div className="flex gap-1">{['open', 'close'].map((a) => <button key={a} type="button" onClick={() => set('action', a)} className={pill(draft.action === a)}>{a.toUpperCase()}</button>)}</div></div>
          )}
          {fields.includes('bays') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">베이(숫자만 — 쉼표·띄어쓰기로 여럿)</div>
              <input id={`rep-bays-${report.ts}`} value={draft.bays} onChange={(e) => set('bays', e.target.value)} inputMode="numeric" className="w-full bg-ink-800 border border-line rounded px-2 py-1.5 text-sm text-dim-100" data-report-bays="1"/></div>
          )}
          {fields.includes('panelCount') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">장수</div>
              <div className="flex gap-1">{[1, 2, 3, 4].map((n) => <button key={n} type="button" onClick={() => set('panelCount', n)} className={pill(Number(draft.panelCount) === n)}>{n}장</button>)}</div></div>
          )}
          {fields.includes('mode') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">작업</div>
              <div className="flex gap-1">{[['discharge', '양하'], ['loading', '선적']].map(([m, l]) => <button key={m} type="button" onClick={() => set('mode', m)} className={pill(draft.mode === m)}>{l}</button>)}</div></div>
          )}
          {fields.includes('reason') && (report.type !== 'work_status' || (ws && ws.verb === 'pause')) && (
            <div><div className="text-xxs text-dim-300 mb-0.5">사유</div>
              <input id={`rep-reason-${report.ts}`} value={draft.reason} onChange={(e) => set('reason', e.target.value)} className="w-full bg-ink-800 border border-line rounded px-2 py-1.5 text-sm text-dim-100"/></div>
          )}
          {fields.includes('conBoxType') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">규격</div>
              <div className="flex gap-1">{['20', '40', '45'].map((t) => <button key={t} type="button" onClick={() => set('conBoxType', t)} className={pill(String(draft.conBoxType) === t)}>{t}자</button>)}</div></div>
          )}
          {fields.includes('conBoxCount') && (
            <div><div className="text-xxs text-dim-300 mb-0.5">개수</div>
              <input id={`rep-cnt-${report.ts}`} value={draft.conBoxCount} onChange={(e) => set('conBoxCount', e.target.value)} inputMode="numeric" className="w-24 bg-ink-800 border border-line rounded px-2 py-1.5 text-sm text-dim-100"/></div>
          )}
          {confirmNext ? (
            <div className="space-y-1.5">
              <div className="text-xs text-amber-200" data-report-edit-summary="1">{reportEditSummary(confirmNext.edits[confirmNext.edits.length - 1].from, confirmNext.edits[confirmNext.edits.length - 1].to)}</div>
              <div className="text-xxs text-dim-400">보고 시각은 그대로입니다. 카톡은 다시 보내지 않습니다.</div>
              <div className="flex gap-1.5">
                <button type="button" disabled={busy} onClick={save} className="px-3 py-1.5 rounded bg-indigo-700 text-white text-xs font-bold" data-report-edit-ok="1">고친 대로 저장</button>
                <button type="button" onClick={() => setConfirmNext(null)} className="px-3 py-1.5 rounded bg-ink-800 text-dim-200 text-xs font-bold">다시 고치기</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button type="button" onClick={preview} className="px-3 py-1.5 rounded bg-indigo-700 text-white text-xs font-bold" data-report-edit-preview="1">바뀌는 것 보기</button>
              <button type="button" onClick={() => { setEditing(false); setErr(''); }} className="px-3 py-1.5 rounded bg-ink-800 text-dim-200 text-xs font-bold">취소</button>
            </div>
          )}
        </div>
      )}
      {err && <div className="text-xxs text-red-300 mt-1" data-report-edit-err="1">{err}</div>}
    </div>
  );
}

/** 지운 보고 목록(«지운 보고 N건») — 누가·언제 지웠는지. 읽기만. */
export function DeletedReports({ deleted }) {
  const [open, setOpen] = useState(false);
  const list = Object.values(deleted || {}).filter(Boolean).sort((a, b) => (b._deletedAt || 0) - (a._deletedAt || 0));
  if (!list.length) return null;
  return (
    <div className="mt-2" data-deleted-reports={list.length}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xxs text-dim-400 underline">🗑 지운 보고 {list.length}건 {open ? '접기' : '보기'}</button>
      {open && list.slice(0, 30).map((r) => (
        <div key={`${r.ts}-${r._deletedAt}`} className="text-xxs text-dim-400 bg-ink-800/40 rounded px-2 py-1 mt-1">
          <div className="line-through">{String(r.message || '').split('\n').slice(0, 4).join(' · ')}</div>
          <div>지운 보고 — {r._deletedBy || '?'} {fmtWhen(r._deletedAt)}</div>
        </div>
      ))}
    </div>
  );
}
