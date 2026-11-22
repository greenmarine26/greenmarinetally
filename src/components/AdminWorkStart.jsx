// 관리자가 등록 안 된 배에서 작업 보고·사진 보고를 열었을 때 «이 배 N호기로 등록하고 시작» — 미르 호기 검수원 등록과 같은 저장(fbSetVoyageCraneCrew) 한 벌(5.20).
//   검수사 2026-11-22 14:58 «관리자 모드로 되어있어서 작업시작 셋팅을 다시 하는 경우가 다반사 입니다» · 15:01 «관리자가 작업 시작을 누르면 작업자이면서 관리자가 되어야 합니다» ·
//   15:03 «관리자는 본인이 작업할 선박을 호기를 미르에게 통보합니다». 등록이 서면 App(adminWorkOf)이 이 배를 작업 선박으로 보고 보고 창이 그대로 열린다(다시 고르는 화면 없음).
import React, { useState } from 'react';
import { crewShiftKey, getEquipNumber } from '../utils.js';
import { fbSetVoyageCraneCrew } from '../firebase.js';
import { serverNow } from '../workShift.js';   // 조 키는 App(adminWorkOf)과 같은 서버 시각으로 잰다
import { parseHash } from '../backHandler.js';   // 지금 그 배 화면인가 — App 의 viewingKey 와 같은 판정(route.name 'voyage' · voyageKey)

export default function AdminWorkStart({ voyageKey, voyage, name }) {
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const me = String(name || '').trim();
  if (!voyageKey || !me) return null;
  const sk = crewShiftKey(undefined, serverNow(), 0).key;
  const cc = (voyage && voyage.info && voyage.info.craneCrew && voyage.info.craneCrew[sk]) || {};
  const holderOf = (no) => { const v = cc[`${no}호기`]; return v ? String(typeof v === 'object' ? (v.name || '') : v).trim() : ''; };
  const myEq = String(getEquipNumber() || '');
  //  재감사 5.20 — 수석 상황판·통합검색의 컨 상세에서도 이 창이 열린다. 거기서는 등록해도 작업자로 바뀌지 않으므로(작업자이면서 관리자는 그 배 화면에서만)
  //    단추 대신 그 배 화면을 여는 단추를 준다. 등록만 남고 보고는 막히는 일을 만들지 않는다.
  let onShip = false;
  try { const r = parseHash(window.location.hash || ''); onShip = !!(r && r.name === 'voyage' && r.voyageKey === voyageKey); } catch (e) { console.warn('[5.20] 화면 판정 실패 — 배 화면이 아닌 것으로 봅니다', e); }
  if (!onShip) {
    return (
      <div className="space-y-2 text-left" data-admin-work-start="1" data-admin-work-offship="1">
        <div className="text-xs text-amber-100 font-bold">이 배에서 작업하려면 이 배 화면을 열고 작업 보고의 [N호기] 를 누르거나 미르에게 «N호기 {me}» 로 알리세요.</div>
        <button onClick={() => { window.location.hash = `#/voyage/${encodeURIComponent(voyageKey)}`; }} className="w-full py-2 rounded-pill border-2 border-violet-300 bg-violet-700 text-white font-black text-sm">이 배 화면 열기</button>
      </div>
    );
  }
  const reg = async (no) => {
    const h = holderOf(no);
    if (h && h !== me) { setErr(`${no}호기는 이 조에 ${h} 님이 등록돼 있습니다. 넘겨받으려면 미르에게 교대로 알려 주세요.`); return; }
    setBusy(no); setErr(''); setDone('');
    try {
      const r = await fbSetVoyageCraneCrew(voyageKey, sk, [{ no, name: me }]);
      if (!r) throw new Error('등록할 내용이 없습니다');
      //  등록이 서면 App 이 곧 이 배를 작업 선박으로 보고 이 창이 보고 화면으로 바뀐다. 바뀌지 않으면 안내를 남기고 단추를 푼다(조용한 실패 금지).
      setBusy(0); setDone(`${no}호기 ${me} 로 등록했습니다. 몇 초 안에 작업자로 바뀌지 않으면 창을 닫았다 다시 열어 주세요.`);
    } catch (e) {
      console.warn('[5.20] 관리자 호기 등록 실패', e);
      setErr(`등록하지 못했습니다 — ${(e && e.message) || e}. 다시 누르거나 미르에게 «${no}호기 ${me}» 로 알려 주세요.`);
      setBusy(0);
    }
  };
  return (
    <div className="space-y-2 text-left" data-admin-work-start="1">
      <div className="text-xs text-amber-100 font-bold">이 배에서 작업하려면 호기를 누르세요 — {sk} 조에 «N호기 {me}» 로 등록되고 바로 작업자이면서 관리자가 됩니다.</div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((no) => {
          const h = holderOf(no); const mine = myEq === `${no}호기`;
          const other = !!h && h !== me;
          return (
            <button key={no} disabled={!!busy || other} onClick={() => reg(no)} data-admin-work-crane={no}
              className={`py-2 rounded-pill border-2 font-black text-sm ${mine ? 'bg-violet-700 border-violet-300 text-white' : 'bg-ink-800 border-line text-dim-100'} disabled:opacity-60`}>
              {busy === no ? '등록 중…' : `${no}호기`}
              {h && <div className="text-2xs font-bold opacity-80 truncate">{h === me ? '나' : h}</div>}
            </button>
          );
        })}
      </div>
      <div className="text-2xs text-dim-400">다른 사람이 등록된 호기는 여기서 바꾸지 않습니다 — 넘겨받으려면 미르에게 교대로 알려 주세요.</div>
      {done && <div className="text-xs text-emerald-300" data-admin-work-done="1">{done}</div>}
      {err && <div className="text-xs text-rose-300" data-admin-work-err="1">{err}</div>}
    </div>
  );
}
