// 수석(소유자) 전용 — 작업이 끝난 동방 선적을 마감텔리 선적 EDI 기준으로 마무리(앱에서 안 찍은 컨만 완료로 채움)하는 «마감적용» 화면
import React, { useMemo, useState } from 'react';
import { fbApplyClosingEdi } from '../firebase.js';
import { closingEdiEntries, closingEdiPlan } from '../loadingEdiExport.js';
import { parseBAPLIE, loadSheetJS } from '../utils.js';
import { isDeckPlanWorkbook, parseDeckPlanWorkbook, deckPlanRows } from '../rzorPlan.js';   // 4.21: RZOR 수석 마감텔리 STOWAGE PLAN(xlsx)

//  4.12 — 검수사 2026-10-07 21:54 «PCTC는 PDA입력 데이터이니 정확한데 동방은 동방계획에 따라 선적이 됩니다. 그래서 완료가 되었다고 해도 정확하다고 볼수가 없습니다.
//         그럴때엔 수석 마감텔리 안에 있는 선적EDI로 선적 완료를 해야 합니다» · 22:01 «앱으로 선적한것은 그래로 적용하고 마감텔리EDI를 적용하면 앱으로 사용안한부분만 덮어쓰는것입니다» · 22:02 «동방 선박만 그렇습니다».
//         2026-10-08 04:25 «마감텔리 선적 EDI 기준 선적 완료처리(동방 선박만, 앱에서 안 찍은 컨만 채움) … =마감적용».
//  ⚠ 이 화면은 구독하지 않는다 — 이미 받아 둔 항차 자료로 세기만 하고, 쓰는 순간 fbApplyClosingEdi 가 항차 info·loading 을 한 번 새로 읽어 정한다.
//  ⚠ 쓰기는 completed 에 «추가만» 한다(앱에 완료가 있는 컨은 건너뜀). 대상 컨·시각·동방/작업 끝 판정은 화면이 아니라 쓰는 자리가 다시 정한다.
const pad = (n) => String(n).padStart(2, '0');
const hm = (ms) => {
  const n = Number(ms);
  if (!n) return '—';
  const d = new Date(n);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ClosingEdiPanel({ voyages, by }) {
  const [busyKey, setBusyKey] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [files, setFiles] = useState({});   // 4.17 — 항차별로 올린 마감텔리 선적 EDI {name, rows, err} · 4.21 — STOWAGE PLAN(xlsx)이면 {name, rows, plan, fmt:'deck'}

  const { rows, waiting } = useMemo(() => {
    const out = [];
    let wait = 0;
    for (const [vk, v] of Object.entries(voyages || {})) {
      const info = (v && v.info) || {};
      if (String(info.pier || '').toUpperCase() !== 'PNCT') continue;   // 동방 선박만
      if (!v.loading || typeof v.loading !== 'object') continue;
      const r = closingEdiEntries(v);
      if (!r.total) continue;
      const started = !!info.workStartAt || r.appDone > 0;
      if (!started && !r.gate.ok) { wait++; continue; }                 // 작업 시작 전 배는 목록에서 뺀다(개수만 알린다)
      out.push({
        vk, ...r, info,
        vsl: info.vsl || vk.split('_')[0],
        voy: info.voy_l || info.voy_d || '',
        todo: r.cns.length,
      });
    }
    //  할 일이 있는 배(끝난 배) → 작업 중인 배 → 다 끝난 배 순
    const rank = (x) => (x.gate.ok && x.todo > 0 ? 0 : !x.gate.ok ? 1 : 2);
    out.sort((a, b) => rank(a) - rank(b) || a.vsl.localeCompare(b.vsl));
    return { rows: out, waiting: wait };
  }, [voyages]);

  //  4.17 — 마감텔리 선적 EDI 파일 올리기(읽기만 · 쓰기는 «예» 뒤에 fbApplyClosingEdi 가 한다)
  //  ★ 4.21 — 검수사 2026-10-10 05:31 «RZOR 마감적용에서 EDI대신에 위 파일로 되어 있습니다. 앱은 EDI만 받게 되어 있어서 적용이 되지 않습니다»:
  //    xlsx 는 수석 마감텔리 STOWAGE PLAN(검수사 양식 — 항차 업로드와 같은 파서)으로 읽는다. 선사 rzdf(양하 그림)는 받지 않는다. 행은 rzorPlan.deckPlanRows 한 벌.
  const onFile = async (vk, f) => {
    if (!f) return;
    const bad = { name: f.name, rows: [], err: '컨테이너와 자리를 읽지 못했습니다(.EDI 나 STOWAGE PLAN(xlsx)인지 확인).' };
    try {
      if (/\.xlsx?$/i.test(f.name)) {
        const XLSX = await loadSheetJS();
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array', cellStyles: true });
        const plan = isDeckPlanWorkbook(wb) ? parseDeckPlanWorkbook(wb, XLSX) : null;
        if (plan && plan._fmt !== 'checker') {   // 4.21 감사 — 선사 rzdf 는 양하 그림이다
          setFiles((o) => ({ ...o, [vk]: { name: f.name, rows: [], err: '선사 덱플랜(양하 그림)은 마감적용 파일이 아닙니다 — 수석 마감텔리의 STOWAGE PLAN(xlsx)을 올리세요.' } }));
          return;
        }
        const rows = plan ? deckPlanRows(plan) : [];
        setFiles((o) => ({ ...o, [vk]: rows.length ? { name: f.name, rows, plan, fmt: 'deck' } : bad }));
        return;
      }
      const txt = await f.text();
      const p = parseBAPLIE(txt);
      const rows = (p.containers || []).filter((c) => c.cn);
      setFiles((o) => ({ ...o, [vk]: rows.length ? { name: f.name, rows } : bad }));
    } catch (e) {
      setFiles((o) => ({ ...o, [vk]: { name: f.name, rows: [], err: `파일을 읽지 못했습니다 — ${e?.message || e}` } }));
    }
  };

  const doApplyFile = async (row) => {
    setBusyKey(row.vk);
    try {
      const fl = files[row.vk];
      const res = await fbApplyClosingEdi(row.vk, by, fl.rows, fl.plan, fl.name);
      const dk = res.fmt === 'deck', w = dk ? '플랜' : 'EDI';   // 4.21: STOWAGE PLAN 이면 «플랜»
      setNotice({ kind: res.bad ? 'warn' : 'ok', text: `🏁 ${row.vsl} ${row.voy} ${dk ? '수석 마감텔리 STOWAGE PLAN' : '마감텔리 선적 EDI'} 적용 — 완료 확정 ${res.confirmed}대(시각 그대로) · 새로 완료 ${res.added}대 · 자리 바뀐 컨 ${res.moved}대. 사람이 찍은 ${res.human}대는 ${dk ? '완료를 ' : ''}그대로 뒀습니다.${dk ? ` 덱플랜 좌표 저장${res.assignOver ? ` · 검수원 지정 자리와 다른 ${res.assignOver}대는 수석 플랜 자리로` : ''}${res.madeAdded ? ` · 제작컨 ${res.madeAdded}대 추가(대수에 넣음)` : ''}.` : ''}${res.ediOnly ? ` 앱 선적분에 없는 ${w} 컨 ${res.ediOnly}대는 넣지 않았습니다.` : ''}${res.planOnly ? ` ${w}에 없는 앱 완료 ${res.planOnly}대는 그대로 뒀습니다.` : ''}${res.bad ? ` 컨 번호 모양이 키로 못 쓰는 ${res.bad}대는 넣지 못했습니다.` : ''}` });
      setFiles((o) => { const n = { ...o }; delete n[row.vk]; return n; });
    } catch (e) {
      setNotice({ kind: 'err', text: `마감적용 실패(${row.vsl} ${row.voy}) — ${e?.message || e}` });
    }
    setBusyKey(null);
    setConfirmKey(null);
  };

  const doApply = async (row) => {
    setBusyKey(row.vk);
    try {
      const res = await fbApplyClosingEdi(row.vk, by);
      setNotice(res.applied > 0
        ? { kind: res.bad ? 'warn' : 'ok', text: `🏁 ${row.vsl} ${row.voy} 선적 ${res.applied}대를 마감텔리 선적 EDI 기준으로 완료 처리했습니다(완료 시각 ${hm(res.at)}). 앱에서 찍은 ${res.appDone}대는 건드리지 않았습니다.${res.bad ? ` 컨 번호 모양이 보관소 키로 못 쓰는 ${res.bad}대는 넣지 못했습니다.` : ''}` }
        : { kind: 'warn', text: res.bad ? `${row.vsl} ${row.voy} 선적 — 컨 번호 모양이 보관소 키로 못 쓰는 ${res.bad}대는 넣지 못했고, 채울 수 있는 컨은 없었습니다.` : `채울 것이 없습니다 — ${row.vsl} ${row.voy} 선적은 앱 완료가 이미 전부 있습니다.` });
    } catch (e) {
      setNotice({ kind: 'err', text: `마감적용 실패(${row.vsl} ${row.voy}) — ${e?.message || e}` });   // 조용한 실패 금지
    }
    setBusyKey(null);
    setConfirmKey(null);
  };

  const noticeCls = (k) => (k === 'err' ? 'bg-red-950/40 border-red-800/60 text-red-200'
    : k === 'warn' ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200');

  return (
    <div className="space-y-2">
      <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1">
        <div>동방(PNCT) 선적은 동방 계획에 따라 실려서, 터미널이 «완료»라고 해도 확정으로 볼 수 없습니다. 작업이 끝난 뒤 <b className="text-dim-100">마감텔리 선적 EDI</b> 기준으로 마무리합니다.</div>
        <div>앱에서 이미 찍은 컨은 그대로 두고, 앱에서 안 찍은 컨만 완료로 채웁니다. 단추를 눌러 «예»를 해야만 들어가고, 자동으로는 아무것도 바뀌지 않습니다. 동방 선박만 나옵니다.</div>
      </div>

      {notice && <div className={`rounded-btn border px-3 py-2 text-xs2 ${noticeCls(notice.kind)}`}>{notice.text}</div>}

      {rows.length === 0 && (
        <div className="text-xs2 text-dim-300 px-1">마감적용을 쓸 동방 선적 항차가 없습니다(작업이 시작된 동방 선박이 없음).</div>
      )}

      {rows.map((r) => {
        const done = r.gate.ok && r.todo === 0;
        return (
          <div key={r.vk} className="rounded-btn border border-line bg-ink-900 px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm2 font-bold text-dim-100">{r.vsl} {r.voy}</span>
              <span className="text-xs2 font-bold text-dim-100">선적</span>
              <span className={`text-2xs px-2 py-0.5 rounded-pill border ${r.gate.ok ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200' : 'bg-amber-950/40 border-amber-700/50 text-amber-200'}`}>
                {r.gate.ok ? '작업 끝' : '작업 중'}
              </span>
            </div>
            <div className="text-xs2 text-dim-200">
              평택 선적분 <b className="text-dim-100">{r.total}</b>대
              {' '}· 앱 완료 <b className="text-dim-100">{r.appDone}</b>
              {' '}· 채울 컨 <b className="text-amber-200">{r.todo}</b>대
            </div>
            <div className="rounded-btn border border-line bg-ink-950 px-2 py-1.5 space-y-1 mt-1">
              <div className="text-2xs text-dim-300">📎 <b>마감텔리 선적 EDI 또는 STOWAGE PLAN(xlsx)</b> 파일을 올리면 실제 실린 자리와 비교합니다. 동방 완료의 선적 시각은 그대로 두고 자리만 바꿉니다. RZOR 는 수석 마감텔리의 STOWAGE PLAN 을 올립니다.</div>
              <input type="file" accept=".edi,.EDI,.txt,.xlsx,.xls" onChange={(e) => { onFile(r.vk, e.target.files && e.target.files[0]); e.target.value = ''; }} className="text-2xs text-dim-200" />
              {files[r.vk] && files[r.vk].err && <div className="text-2xs text-red-300">{files[r.vk].err}</div>}
              {files[r.vk] && !files[r.vk].err && (() => {
                const pl = closingEdiPlan({ info: r.info, loading: (voyages[r.vk] || {}).loading }, files[r.vk].rows);
                if (!pl.ok) return <div className="text-2xs text-amber-300">{pl.why}</div>;
                const c = pl.counts;
                const dk = pl.fmt === 'deck', w = dk ? '플랜' : 'EDI';   // 4.21: STOWAGE PLAN(덱플랜 좌표)
                return (
                  <div className="space-y-1">
                    <div className="text-2xs text-dim-200">{files[r.vk].name} — {dk ? '덱플랜 좌표 · STOWAGE PLAN' : 'EDI'} {c.ediTotal}대 · 동방 계획 완료 확정 <b className="text-dim-100">{c.confirm}</b> · 완료 새로 채움 <b className="text-dim-100">{c.add}</b> · 자리 바뀜 <b className="text-amber-200">{c.posDiff}</b> / 같음 {c.posSame}{c.posKeep ? ` · 사람이 고친 자리 ${c.posKeep}대는 그대로` : ''} · 사람이 찍은 {c.human}대는 {dk ? '완료 그대로' : '그대로'}{c.assignOver ? ` · 검수원 지정 자리와 다름 ${c.assignOver}대 — 수석 플랜 자리로` : ''}{pl.madeOnly.length > 0 ? ` · 제작컨 ${pl.madeOnly.length}대(${pl.madeOnly.map((x) => x.cn).join(', ')}) 대수에 추가` : ''}</div>
                    {(pl.ediOnly.length > 0 || pl.planOnly.length > 0) && (
                      <div className="text-2xs text-amber-300">
                        {pl.ediOnly.length > 0 && <>앱 선적분에 없는 {w} 컨 {pl.ediOnly.length}대({pl.ediOnly.slice(0, 5).map((x) => x.cn).join(', ')}{pl.ediOnly.length > 5 ? ' …' : ''}) · </>}
                        {pl.planOnly.length > 0 && <>{w}에 없는 앱 완료 {pl.planOnly.length}대({pl.planOnly.slice(0, 5).map((x) => x.cn).join(', ')}{pl.planOnly.length > 5 ? ' …' : ''})</>}
                        {' '}— 이 컨들은 건드리지 않습니다.
                      </div>
                    )}
                    {confirmKey === 'F' + r.vk ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xs text-amber-300">{r.vsl} {r.voy} 에 이 {dk ? 'STOWAGE PLAN 을' : 'EDI 를'} 적용? (완료 시각은 안 바뀝니다)</span>
                        <button onClick={() => doApplyFile(r)} disabled={busyKey === r.vk} style={{ minHeight: 36 }} className="text-xxs px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50">{busyKey === r.vk ? '적용 중…' : '예'}</button>
                        <button onClick={() => setConfirmKey(null)} style={{ minHeight: 36 }} className="text-xxs px-3 rounded bg-ink-750 hover:bg-ink-700 text-dim-100">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmKey('F' + r.vk)} disabled={c.confirm + c.add + c.posDiff + pl.madeOnly.length === 0} style={{ minHeight: 36 }}
                        className="text-xxs px-3 rounded-pill bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 font-bold disabled:opacity-40">
                        🏁 이 {dk ? 'STOWAGE PLAN' : 'EDI'} 적용
                      </button>
                    )}
                    {c.confirm + c.add + c.posDiff + pl.madeOnly.length === 0 && (
                      <div className="text-2xs text-dim-400">적용할 것이 없습니다 — 확정·채움·자리 바뀜·제작컨 0{dk && c.human > 0 && c.confirm + c.add === 0 ? ' · 사람이 전부 찍은 배입니다. 플랜 그림만 바꾸려면 선적 탭 덱플랜 올리기로' : ''}</div>
                    )}
                  </div>
                );
              })()}
            </div>
            {r.gate.ok && (
              <div className="text-2xs text-dim-400">완료 시각은 작업 끝 시각 {hm(r.gate.at)} 로 들어갑니다 · 완료자 칸은 «마감 EDI 적용»</div>
            )}
            {!r.gate.ok && (
              <div className="text-2xs text-amber-300">{r.gate.why}</div>
            )}
            {done && <div className="text-2xs text-dim-400">앱 완료가 전부 있어 채울 것이 없습니다.</div>}
            {r.gate.ok && r.todo > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {confirmKey === r.vk ? (
                  <>
                    <span className="text-2xs text-amber-300">{r.vsl} {r.voy} 선적 {r.todo}대를 마감텔리 선적 EDI 기준으로 완료 처리? 앱에서 찍은 {r.appDone}대는 그대로 둡니다.</span>
                    <button onClick={() => doApply(r)} disabled={busyKey === r.vk} style={{ minHeight: 36 }}
                      className="text-xxs px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50">
                      {busyKey === r.vk ? '적용 중…' : '예'}
                    </button>
                    <button onClick={() => setConfirmKey(null)} style={{ minHeight: 36 }}
                      className="text-xxs px-3 rounded bg-ink-750 hover:bg-ink-700 text-dim-100">취소</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmKey(r.vk)} style={{ minHeight: 36 }}
                    className="text-xxs px-3 rounded-pill bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 font-bold"
                    title="마감텔리 선적 EDI 가 고르는 평택 선적분 중 앱에 완료가 안 찍힌 컨만 완료로 — 앱 완료 기록은 덮지 않음">
                    🏁 마감적용 {r.todo}대
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {waiting > 0 && <div className="text-2xs text-dim-400 px-1">작업 시작 전인 동방 선적 {waiting}척은 표시하지 않았습니다.</div>}
    </div>
  );
}
