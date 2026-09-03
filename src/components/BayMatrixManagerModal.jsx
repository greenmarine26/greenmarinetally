// 베이매트릭스 관리 화면 — 항차 없이 선박을 조회해 고치고, 없는 선박은 새로 만든다 (TallyOne 1.60)
//
// 왜 만들었나 (검수사 지시 2026-08-13):
//   *"지금은 베이메트릭스 수정을 할때 **항차목록에 있어야** 수정이 가능했습니다.
//     이걸 베이메트릭스에서 **선박을 조회**할수 있게 하고 조회후에 수정을 할수있게 만들어 주세요."*
//   *"지금 구조는 불편합니다. **업로드를 누른후에** 베이메트릭스가 나옵니다. 그래서 베이메트릭스를
//     **분리** 해주기 바랍니다. 분리해서 **수석대쉬보드 위의 화면**에 넣어 주세요.
//     **업로드를 누르면 일반 검수사도 보이기 때문에 건드릴수 있습니다.**"*
//   *"그리고 **조회가 되지 않는 선박은 추가기능까지 넣어서 추가** 할수 있게 해주세여."*
//
// 종전에는 진입로가 항차 화면의 업로드 영역 하나뿐이었다. 그래서
//   ① 항차가 없는 선박(신규·예정)은 매트릭스를 만들 수가 없었고
//   ② 그 버튼이 일반 검수사에게도 보였다.
// 이 화면은 수석 대시보드(권한 화면) 안에 있고, 목록은 **보관소(정본) 하나만** 읽는다.

import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Lock, Wrench, Trash2, StickyNote } from 'lucide-react';
import ShipMatrixBuilderModal from './ShipMatrixBuilderModal.jsx';
import { canWriteBayDict } from '../bayDictGuard.js';
import { fbSetShipBayDictNote, fbTrashShipBayDict, fbSetShipBayDictSpare } from '../firebase.js';   // 3.5: 비고 얕은 저장 · 휴지통 이동 · 보조 보관함
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';

const U = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

// 보관소 엔트리 → 화면 한 줄
function rowsFromMaster() {
  const fb = (typeof window !== 'undefined' && window.__fbShipBayDict) || {};
  const out = [];
  for (const [code, e] of Object.entries(fb)) {
    if (!e) continue;
    // ★ 1.62: **빈 껍데기를 매트릭스로 세지 않는다.** 검수사 실측 2026-08-13 —
    //   HAYN 이 EDI 자동 등록으로 들어오며 `bayDef: {}` 를 갖게 됐는데, 종전 `!!bd` 판정이
    //   빈 객체를 truthy 로 봐서 목록에 **「0베이 · 🔒 확정」** 이라는 거짓말이 떴다.
    //   실제로는 베이가 하나도 없고 잠기지도 않은 상태다. 베이가 있어야 매트릭스다.
    const bd = e.bayDef || null;
    const bays = bd?.baysSummary || bd?.bayList || bd?.bays || [];
    // ★ 1.66-02: **베이 수는 실제 베이 목록을 센다 — `recordCount` 는 뜻이 소스마다 다르다.**
    //   검수사 실측 2026-08-13 — 화면에 `DPRT · PEGASUS PROTO · 2112베이` 가 떴다.
    //   DPRT 는 `claude 자동생성` 본이라 `recordCount` 에 **슬롯(자리) 수 2112** 가 들어 있고
    //   실제 베이는 28개다. 빌더가 만든 36척은 `recordCount = baysSummary.length` 라 티가 안 났다.
    //   배열이 있으면 그것이 진실이다. `recordCount` 는 배열이 없을 때만 쓴다.
    const n = (Array.isArray(bays) && bays.length) || bd?.recordCount || 0;
    const hasMatrix = !!bd && n > 0;
    out.push({
      code,
      name: String(e.name || '').replace(/\n/g, ' / ').trim(),
      callsign: e.callsign || '',
      imo: e.imo || '',
      carrier: e.carrier || '',
      bays: n,
      hasMatrix,
      provisional: e.provisional === true || bd?.provisional === true,
      note: String(e.note || '').trim(),        // 3.5: 비고(쪽지) — 왜 남겨 두는 배인지 적는 자리
      noteBy: e.noteBy || '',
      spare: e.spare === true,                  // 3.5: 보조 보관함 — 메인 목록에서 가린다(자료는 그대로)
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/* ★ 3.5 — 이 사전 항목이 «실제로 쓰이는 배»인가.
     검수사 지시 2026-09-03 — 08-11 마이그레이션(fbBatchSaveShipBayDict 92건)이 콜사인 앞4자·선박명 앞4자·도면
     제목을 키로 만들어 107키가 됐고, 그중 실제로 불리는 것은 36키뿐이다(실측). 어느 것을 지울지 검수사가
     고를 수 있게 상태를 보인다.
   ⚠ **단정하지 않는다.** 화면이 읽을 수 있는 것은 활성 항차·마감 대기 색인·선박 라이브러리(IMO)뿐이고
     보관소 전수는 요청 폭주라 못 읽는다(firebase.js:1999 사고 기록). 실측 커버리지(2026-09-03 GET, 활성 19·보관 243·
     사전 107·ships 61·마감대기 87) — 실제로 기항한 36척 중 **PCBJ 1척**이 이 재료로 «못 찾음»으로 나온다.
     마감 대기 색인이 없으면(수석 아닌 열람) 5척까지 는다. 그래서 «없다»가 아니라 «기록 못 찾음»이라고 쓰고,
     재료가 덜 왔으면 화면이 그 사실을 함께 말한다. */
function usageOf(code, imo, live, seen) {
  const c = U(code);
  if (live.has(c)) return 'live';
  if (seen.has(c) || (imo && seen.has(U(imo)))) return 'seen';
  return 'unknown';
}

export default function BayMatrixManagerModal({ onClose, voyages = null, shipLib = null, arcList = null, inspector = '' }) {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);      // 빌더에 넘길 선박 {code,name,callsign,imo}
  const [adding, setAdding] = useState(false);     // 신규 추가 입력 폼
  const [newShip, setNewShip] = useState({ code: '', name: '', callsign: '', imo: '' });
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState(() => new Set());     // 3.5: 고른 선박(코드)
  const [filter, setFilter] = useState('all');         // 3.5: all | live | seen | unknown
  const [noteOpen, setNoteOpen] = useState(null);      // 3.5: 비고를 펼친 코드
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);                 // 저장·삭제 뒤 목록 다시 읽기
  const [confirmState, askConfirm] = useConfirm();   // 1.53 한 벌 — 브라우저 confirm 은 화면을 멈춘다
  const ask = (opts) => new Promise((resolve) => {
    askConfirm({ ...opts, onConfirm: () => resolve(true), onCancel: () => resolve(false) });
  });
  const canEdit = canWriteBayDict();

  /* 3.5: «지금 기항»(live) 과 «기항 기록 있음»(seen) 의 재료 — 부모가 이미 들고 있는 것만 쓴다(추가 요청 0). */
  const live = useMemo(() => new Set(Object.values(voyages || {})
    .map(v => U(v?.info?.vsl)).filter(Boolean)), [voyages]);
  const seen = useMemo(() => {
    const s = new Set();
    for (const a of (arcList || [])) { if (a?.vsl) s.add(U(a.vsl)); if (a?.voyageKey) s.add(U(String(a.voyageKey).split('_')[0])); }
    for (const k of Object.keys(shipLib || {})) s.add(U(k));   // ships/{imo}
    return s;
  }, [arcList, shipLib]);
  const all = useMemo(() => rowsFromMaster().map(r => ({ ...r, use: usageOf(r.code, r.imo, live, seen) })),
    [target, tick, live, seen]);   // 저장 후 닫으면 다시 읽는다
  // 1.60-02: 콜사인은 배마다 유일하다 — 겹치면 하나는 남의 것이다(검수사 신고로 PCBJ/PCSZ 실측).
  const csDupes = useMemo(() => {
    const by = {};
    for (const r of all) {
      const c = U(r.callsign);
      if (c) (by[c] ||= []).push(r.code);
    }
    return Object.entries(by).filter(([, ks]) => ks.length > 1);
  }, [all]);
  const hits = useMemo(() => {
    const s = U(q);
    /* 3.5 (검수사 지시 2026-09-03) — 보조 보관함은 **메인 목록에서 뺀다.**
       ⚠ 단 **입항하면 자동으로 돌아온다** — 항차에 뜬 배(use==='live')는 보조 표가 붙어 있어도 메인에 보인다.
         «입항하면 수정해서 사용할수 있게» 라는 뜻 그대로다. 표는 그대로 두고 화면만 되돌린다. */
    let r0 = filter === 'spare' ? all.filter(r => r.spare && r.use !== 'live')
      : (filter === 'all' ? all.filter(r => !r.spare || r.use === 'live')
        : all.filter(r => r.use === filter && (!r.spare || r.use === 'live')));
    if (!s) return r0;
    return r0.filter(r => U(r.code).includes(s) || U(r.name).includes(s)
      || U(r.callsign).includes(s) || U(r.imo).includes(s) || U(r.carrier).includes(s) || U(r.note).includes(s));
  }, [all, q, filter]);
  const counts = useMemo(() => {
    const main = all.filter(r => !r.spare || r.use === 'live');
    return {
      all: main.length,
      live: main.filter(r => r.use === 'live').length,
      seen: main.filter(r => r.use === 'seen').length,
      unknown: main.filter(r => r.use === 'unknown').length,
      spare: all.filter(r => r.spare && r.use !== 'live').length,
    };
  }, [all]);
  const toggle = (code) => setSel(prev => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  /* 3.5: 비고 저장 — 매트릭스를 건드리지 않는 얕은 쓰기(firebase.fbSetShipBayDictNote). */
  const saveNote = async (code) => {
    setBusy(true);
    const okSave = await fbSetShipBayDictNote(code, noteText, inspector);
    setBusy(false);
    if (!okSave) { setMsg(`${code} 비고를 저장하지 못했습니다 — 권한·신호를 확인하세요.`); return; }
    //  전역 사전에도 즉시 반영해 목록이 바로 바뀐다(구독이 오기 전에도).
    try { if (window.__fbShipBayDict?.[code]) window.__fbShipBayDict[code].note = noteText.slice(0, 300); } catch (e) { /* 창 없음 */ }
    setMsg(`${code} 비고를 저장했습니다.`); setNoteOpen(null); setTick(t => t + 1);
  };

  /* 3.5: 고른 선박을 보조 보관함으로 넣거나 뺀다 — 자료는 그대로 두고 목록에서만 가린다. */
  const setSpareSelected = async (on) => {
    const codes = [...sel];
    if (!codes.length) return;
    setBusy(true);
    let done = 0, failed = [];
    for (const c of codes) {
      const r = await fbSetShipBayDictSpare(c, on, inspector);
      if (r) { done++; try { if (window.__fbShipBayDict?.[c]) window.__fbShipBayDict[c].spare = on ? true : undefined; } catch (e) { /* 창 없음 */ } }
      else failed.push(c);
    }
    setBusy(false); setSel(new Set()); setTick(t => t + 1);
    setMsg(failed.length ? `${done}척 ${on ? '보조로' : '메인으로'} · 실패 ${failed.join(', ')}`
      : `${done}척을 ${on ? '보조 보관함으로 옮겼습니다 — 입항하면 자동으로 돌아옵니다.' : '메인 목록으로 되돌렸습니다.'}`);
  };

  /* 3.5: 고른 선박을 휴지통으로 — 지우는 것이 아니라 옮긴다(되돌릴 수 있다). */
  const trashSelected = async () => {
    const codes = [...sel];
    if (!codes.length) return;
    const okGo = await ask({
      title: `선박 ${codes.length}척을 휴지통으로`,
      danger: true,
      message: `${codes.join(' · ')}\n\n사전에서 내립니다. 지우는 것이 아니라 휴지통(ship_bay_dict_trash)으로 옮기는 것이라 되돌릴 수 있습니다.\n항차에 쓰이는 배가 섞여 있지 않은지 한 번 더 보십시오.`,
      confirmLabel: '휴지통으로', cancelLabel: '취소',
    });
    if (!okGo) return;
    setBusy(true);
    let done = 0, failed = [];
    for (const c of codes) { const r = await fbTrashShipBayDict(c, inspector); if (r) { done++; try { delete window.__fbShipBayDict[c]; } catch (e) { /* 창 없음 */ } } else failed.push(c); }
    setBusy(false); setSel(new Set()); setTick(t => t + 1);
    setMsg(failed.length ? `${done}척 옮김 · 실패 ${failed.join(', ')}` : `${done}척을 휴지통으로 옮겼습니다. 되돌리려면 개발자에게 말씀하세요.`);
  };

  // 빌더는 항차를 받도록 만들어져 있다 — 선박만 담은 최소 항차 모양으로 넘긴다.
  //   `info.vsl` 이 곧 선박 약자이고, extractShipMetaFromVoyage 가 그것을 코드로 쓴다(1.58-01).
  const fakeVoyage = target ? { info: { vsl: target.code, code: target.code,
    name: target.name || '', callsign: target.callsign || '', imo: target.imo || '',
    carrier: target.carrier || '' } } : null;

  const startAdd = () => {
    const code = U(newShip.code);
    if (!/^[A-Z0-9]{3,8}$/.test(code)) {
      setMsg('선박 약자는 공백 없는 3~8자 영숫자입니다 (예: HAYN · SWBT · YKTD).');
      return;
    }
    if (all.some(r => U(r.code) === code)) {
      setMsg(`${code} 는 이미 있습니다. 목록에서 골라 수정하세요.`);
      return;
    }
    setMsg('');
    setTarget({ code, name: newShip.name.trim(), callsign: newShip.callsign.trim().toUpperCase(), imo: newShip.imo.trim() });
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-ink-900 border-2 border-emerald-700/60 rounded-card w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line sticky top-0 bg-ink-900 rounded-t-2xl">
          <div>
            <div className="text-base font-bold text-emerald-300">🧱 베이매트릭스</div>
            <div className="text-xxs text-dim-300 mt-0.5">
              보관소가 정본입니다 — 여기서 고치면 폰·엣지·다른 기기에서 같이 보입니다.
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink-750 rounded-pill" aria-label="닫기">
            <X className="w-5 h-5 text-dim-300" />
          </button>
        </div>

        {!canEdit && (
          <div className="mx-4 mt-3 bg-amber-900/40 border border-amber-700/50 rounded-pill px-3 py-2 text-xs2 text-amber-200">
            수정 권한이 없습니다. 조회만 됩니다.
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* 조회 */}
          <div className="relative">
            <Search className="w-4 h-4 text-dim-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="선박 약자 · 선박명 · 선사 · 호출부호 · IMO 로 찾기"
              className="w-full h-11 pl-9 pr-3 rounded-pill bg-ink-800 border border-line text-sm text-dim-100 placeholder-dim-400"
            />
          </div>

          <div className="text-xxs text-dim-400">
            보관소 {all.length}척 · 검색 결과 {hits.length}척{sel.size > 0 && <span className="text-amber-300 font-bold"> · 고른 {sel.size}척</span>}
          </div>

          {/* 3.5: 상태 칩 — «기록 못 찾음»만 골라 보고 지울 것을 고른다(검수사 지시 2026-09-03). */}
          <div className="flex gap-1.5 flex-wrap">
            {[['all', `전체 ${counts.all}`], ['live', `지금 기항 ${counts.live}`], ['seen', `기록 있음 ${counts.seen}`], ['unknown', `기록 못 찾음 ${counts.unknown}`], ['spare', `📦 보조 보관함 ${counts.spare}`]].map(([k, label]) => (
              <button key={k} onClick={() => { setFilter(k); setSel(new Set()); }}   /* 감사 P2-2: 칩을 바꾸면 고른 것을 푼다 — 안 보이는 배에 쓰기가 가지 않게 */
                className={`px-2.5 py-1 rounded-pill text-xxs font-bold border ${filter === k
                  ? (k === 'unknown' ? 'bg-rose-900/60 border-rose-600 text-rose-200'
                    : k === 'spare' ? 'bg-violet-900/60 border-violet-600 text-violet-200'
                      : 'bg-emerald-900/60 border-emerald-600 text-emerald-200')
                  : 'bg-ink-800 border-line text-dim-300 hover:bg-ink-750'}`}>{label}</button>
            ))}
          </div>
          {filter === 'spare' && (
            <div className="text-2xs text-violet-200 bg-violet-950/40 border border-violet-800 rounded px-2 py-1.5">
              📦 지금 다니지 않는 배를 넣어 두는 자리입니다. 자료는 그대로 있고 목록에서만 빠져 있습니다 — <b>입항해 항차가 뜨면 저절로 메인으로 돌아옵니다.</b> 그때 매트릭스를 고쳐 쓰시면 됩니다.
            </div>
          )}
          <div className="text-2xs text-dim-400">
            «기록 못 찾음» = 활성 항차·마감 대기·선박 이력에서 이 배를 못 찾았다는 뜻입니다. 보관소 전체를 뒤지지는 않으니 <b>없다는 단정이 아닙니다</b> — 지우기 전에 배 이름을 보십시오.
            {/* 3.5 감사 지적(P2-1): 마감 대기 색인은 수석 화면에서만 채워진다. 재료가 덜 온 채로 열리면 실제로 기항한 배가 «못 찾음»으로 늘어난다 — 그 사실을 화면이 말한다. */}
            {!arcList && <span className="text-amber-300"> · ⚠ 마감 대기 목록을 아직 못 읽어 «못 찾음»이 실제보다 많이 보일 수 있습니다.</span>}
          </div>


          {/* 3.5: 비고 저장·휴지통 결과를 여기서 알린다 — 종전 msg 자리는 «신규 추가» 폼 안이라 목록에서는 안 보였다. */}
          {msg && !adding && (
            <div className="bg-ink-800/70 border border-line rounded-pill px-3 py-2 text-xs2 text-dim-100 flex items-start gap-2">
              <span className="flex-1">{msg}</span>
              <button onClick={() => setMsg('')} className="text-xxs text-dim-400 shrink-0">닫기</button>
            </div>
          )}

          {csDupes.length > 0 && (
            <div className="bg-rose-900/40 border border-rose-700/50 rounded-pill px-3 py-2 text-xs2 text-rose-200">
              ⚠ 같은 호출부호가 두 선박에 붙어 있습니다 — 하나는 남의 것입니다. 항차 자료의 호출부호가 정답입니다.
              <div className="mt-1 font-bold">
                {csDupes.map(([c, ks]) => `${c} → ${ks.join(', ')}`).join(' · ')}
              </div>
            </div>
          )}

          {/* 목록 */}
          <div className="max-h-[46vh] overflow-y-auto rounded-pill border border-line divide-y divide-line">
            {hits.map(r => (
              <div key={r.code} className="bg-transparent">
                <div className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-ink-750">
                  {/* 3.5: 고르는 칸 — 카톡 기록 가져오기(KakaoLogImportModal)와 같은 벌. 진짜 체크박스가 아니라 눌리는 사각형. */}
                  {canEdit && (
                    <button onClick={() => toggle(r.code)} aria-label={`${r.code} 고르기`}
                      className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-2xs font-black ${sel.has(r.code)
                        ? 'bg-amber-500 border-amber-400 text-ink-950' : 'bg-ink-800 border-line text-transparent'}`}>✓</button>
                  )}
                  <button disabled={!canEdit}
                    onClick={() => setTarget({ code: r.code, name: r.name, callsign: r.callsign, imo: r.imo, carrier: r.carrier })}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left disabled:opacity-60">
                    <span className="font-bold text-dim-100 text-sm w-16 shrink-0">{r.code}</span>
                    <span className="flex-1 text-xs2 text-dim-300 truncate">{r.name || '—'}</span>
                    {r.carrier && <span className="text-2xs font-bold text-sky-300 shrink-0">{r.carrier}</span>}
                    <span className="text-xxs text-dim-400 shrink-0">{r.bays ? `${r.bays}베이` : '매트릭스 없음'}</span>
                    {/* 3.5: 쓰이는 배인지 — 단정하지 않는 세 갈래 */}
                    <span className={`text-2xs font-bold shrink-0 ${r.use === 'live' ? 'text-emerald-300' : r.use === 'seen' ? 'text-dim-300' : 'text-rose-300'}`}>
                      {r.use === 'live' ? '지금 기항' : r.use === 'seen' ? '기록 있음' : '기록 못 찾음'}
                    </span>
                    {r.spare && <span className="text-2xs font-bold text-violet-300 shrink-0">📦{r.use === 'live' ? ' 보조→복귀' : ''}</span>}
                    {r.hasMatrix && (r.provisional
                      ? <span className="text-2xs font-bold text-amber-400 shrink-0 flex items-center gap-0.5"><Wrench className="w-3 h-3" />보정중</span>
                      : <span className="text-2xs font-bold text-emerald-400 shrink-0 flex items-center gap-0.5"><Lock className="w-3 h-3" />확정</span>)}
                  </button>
                  {/* 3.5: 비고 — 왜 남겨 두는 배인지 적는 쪽지 */}
                  {canEdit && (
                    <button onClick={() => { setNoteOpen(noteOpen === r.code ? null : r.code); setNoteText(r.note || ''); }}
                      aria-label={`${r.code} 비고`}
                      className={`p-1 rounded shrink-0 ${r.note ? 'text-amber-300' : 'text-dim-500 hover:text-dim-300'}`}>
                      <StickyNote className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {r.note && noteOpen !== r.code && (
                  <div className="px-3 pb-2 -mt-1 text-2xs text-amber-200/90 truncate">📝 {r.note}</div>
                )}
                {noteOpen === r.code && (
                  <div className="px-3 pb-3 space-y-1.5">
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value.slice(0, 300))} rows={2} autoFocus
                      placeholder="예: 아직 평택에 안 오는 배 · 대체선 · 도면 확인 필요"
                      className="w-full bg-ink-800 border border-line rounded p-2 text-xs2 text-dim-100 placeholder-dim-500" />
                    <div className="flex items-center gap-2">
                      <span className="text-3xs text-dim-500 flex-1">{noteText.length}/300{r.noteBy ? ` · 마지막 ${r.noteBy}` : ''}</span>
                      <button onClick={() => setNoteOpen(null)} className="px-2 py-1 rounded text-xxs bg-ink-800 text-dim-300">취소</button>
                      <button onClick={() => saveNote(r.code)} disabled={busy}
                        className="px-3 py-1 rounded text-xxs font-bold bg-emerald-700 text-white disabled:opacity-50">비고 저장</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {hits.length === 0 && (
              <div className="px-3 py-6 text-center text-xs2 text-dim-400">
                「{q}」 로 찾은 선박이 없습니다.
                {/* 감사 P2-3: 보조 보관함에 있는 배는 이 칩에서 안 보인다 — 새로 만들라고 하면 사전이 또 갈라진다 */}
                {all.some(r => (U(r.code).includes(U(q)) || U(r.name).includes(U(q))) && r.spare)
                  ? <><br/><span className="text-violet-300 font-bold">📦 보조 보관함에 있습니다 — 위 칩에서 보십시오.</span></>
                  : <> 아래에서 새로 추가하세요.</>}
              </div>
            )}
          </div>

          {/* 3.5: 고른 선박 일괄 처리 — 지우는 것이 아니라 휴지통으로 옮긴다(되돌릴 수 있다). */}
          {canEdit && sel.size > 0 && (
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-pill px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs2 font-bold text-amber-200 flex-1">고른 {sel.size}척</span>
              <button onClick={() => setSel(new Set(hits.map(r => r.code)))}
                className="px-2 py-1 rounded text-xxs bg-ink-800 text-dim-300">보이는 것 전부</button>
              <button onClick={() => setSel(new Set())} className="px-2 py-1 rounded text-xxs bg-ink-800 text-dim-300">해제</button>
              <button onClick={() => setSpareSelected(filter !== 'spare')} disabled={busy}
                className="px-3 py-1.5 rounded-pill text-xxs font-bold bg-violet-800 text-white disabled:opacity-50">
                {filter === 'spare' ? '메인으로' : '📦 보조로'}
              </button>
              <button onClick={trashSelected} disabled={busy}
                className="px-3 py-1.5 rounded-pill text-xxs font-bold bg-rose-800 text-white disabled:opacity-50 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />휴지통으로
              </button>
            </div>
          )}

          {/* 신규 추가 — 조회가 안 되는 선박 */}
          {canEdit && (adding ? (
            <div className="bg-ink-800/60 border border-line rounded-pill p-3 space-y-2">
              <div className="text-xs2 font-bold text-dim-100">새 선박 추가</div>
              <div className="text-xxs text-dim-400">
                약자는 <b>현장에서 부르는 그대로</b> 넣습니다. 호출부호·선박명을 약자 자리에 넣지 마세요 — 사전이 갈라집니다.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newShip.code} onChange={e => setNewShip(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="선박 약자 (예: HAYN)" className="h-10 px-2 rounded bg-ink-900 border border-line text-sm text-dim-100 placeholder-dim-500" />
                <input value={newShip.name} onChange={e => setNewShip(s => ({ ...s, name: e.target.value }))}
                  placeholder="선박명 (풀네임)" className="h-10 px-2 rounded bg-ink-900 border border-line text-sm text-dim-100 placeholder-dim-500" />
                <input value={newShip.callsign} onChange={e => setNewShip(s => ({ ...s, callsign: e.target.value.toUpperCase() }))}
                  placeholder="호출부호 (선택)" className="h-10 px-2 rounded bg-ink-900 border border-line text-sm text-dim-100 placeholder-dim-500" />
                <input value={newShip.imo} onChange={e => setNewShip(s => ({ ...s, imo: e.target.value }))}
                  placeholder="IMO (선택)" className="h-10 px-2 rounded bg-ink-900 border border-line text-sm text-dim-100 placeholder-dim-500" />
              </div>
              {msg && <div className="text-xxs text-rose-300">{msg}</div>}
              <div className="flex gap-2">
                <button onClick={startAdd} className="flex-1 h-10 rounded-pill bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold">
                  매트릭스 만들기
                </button>
                <button onClick={() => { setAdding(false); setMsg(''); }} className="px-4 h-10 rounded-pill bg-ink-800 text-dim-200 text-sm font-bold">
                  취소
                </button>
              </div>
              <div className="text-xxs text-dim-400">
                만드는 순서 — <b>.def 읽기 → CASP 플랜(PDF) 읽기 → 뼈대 → 매트릭스 → 확정</b>. 확정하면 그 뒤로 .def·PDF 가 못 고칩니다.
              </div>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); setNewShip({ code: q.trim().toUpperCase(), name: '', callsign: '', imo: '' }); }}
              className="w-full h-11 rounded-pill bg-ink-800 hover:bg-ink-750 border border-line-strong text-sm font-bold text-dim-100 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />조회가 안 되는 선박 추가
            </button>
          ))}

          {/* ★ 1.64: 베이사전 진단 위젯 **철거** (검수사 판단 2026-08-13).
              검수사 원문: *"지금 그림 기준은 틀린것 같습니다. **100% 여야 합니다.** 점수기준이 뭔지
                모르겠습니다. 예전엔 너무 틀린게 많아서 넣었던 기능 같은데 **지금은 필요 없는 기능** 같습니다."*
              실측으로 확인 — 31척 **전부** `deckTiersLocal`·`holdTiersLocal`·`rowMaxLocal` 이 0/N 이었다.
                매트릭스 빌더가 쓰는 필드와 진단이 찾는 필드가 **아예 다르다.** 어느 배도 100점이 못 나온다.
                점수 분포도 52·55·57 세 값뿐이었고, 화면 설명(`baysSummary(30)+…`)은 코드(기본 50+20+15+5+5+3+2)와
                숫자부터 달랐다 — 설명이 옛 판 그대로였다.
              `.def` 자동 파싱으로 사전을 만들던 시절의 "무엇이 덜 채워졌나" 지표라, 검수사가 직접
              매트릭스를 그려 확정하는 지금 구조에서는 **재는 대상 자체가 없다.**
              대신 검수사가 남긴 기준 하나 — *"실갯수와 카고플랜 갯수가 맞나"* — 는 항차 단위라
              카고플랜(PrintableCargoPlanV2)에 넣었다. */}

        </div>
      </div>

      {/* 3.5: 확인 모달은 앱 안에서(1.53 한 벌) — 브라우저 confirm 은 화면을 멈춘다 */}
      <ConfirmModal {...confirmState} />

      {/* 빌더 — 항차 없이, 고른 선박으로 연다 */}
      {target && (
        <ShipMatrixBuilderModal
          voyage={fakeVoyage}
          containers={[]}
          onClose={() => { setTarget(null); setAdding(false); }}
          onSaved={() => { setTarget(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
