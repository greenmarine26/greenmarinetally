// V9.51: [↩ 원래 자리로] — 미배정된 컨을 계획 자리(bay_orig)로 되돌린다.
//
// 왜: 위치 수정·번호 수정 과정에서 컨이 그 자리에서 밀려나면(displacedMode:'unassign')
//   미배정이 된다. 그런데 되돌리는 길이 없어, 베이 화면에서 빈 칸을 손으로 다시 찾아야 했다
//   (사용자 요청 2026-08-03: "원래 자리로 복귀시키는 방법은?").
//   원래 자리는 항상 남아 있다 — _updatePositionFields 가 bay_orig/row_orig/tier_orig 를 보존한다.
//
// 원칙: **남의 자리를 뺏지 않는다.** 원자리에 다른 컨이 들어가 있으면 버튼을 잠그고 누가 있는지 보여준다.
import React, { useState, useMemo } from 'react';
import { fbReassignContainerPosition } from '../firebase.js';
import { seqFullConfirmText } from '../utils.js';   // 1.54: 시퀀스 되묻기 문구는 한 벌만 둔다
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';   // 1.53: 네이티브 confirm() 은 렌더러를 멈춘다

const bn = (v) => (v !== undefined && v !== null && v !== '' ? String(parseInt(v, 10)) : '');

/** 이 컨을 원자리로 되돌릴 수 있는가 — { pos, occupiedBy } (pos 없으면 대상 아님) */
export function origSlotOf(c, allContainers = []) {
  if (!c || c.bay) return { pos: null, occupiedBy: null };          // 이미 자리가 있으면 대상 아님
  const b = bn(c.bay_orig), r = c.row_orig || '', t = c.tier_orig || '';
  if (!b || !r || !t) return { pos: null, occupiedBy: null };       // 원래부터 좌표가 없던 컨
  const occupiedBy = allContainers.find(x =>
    x && x.cn !== c.cn && x._mode === c._mode && x.bay &&
    bn(x.bay) === b && x.row === r && x.tier === t) || null;
  return { pos: { bay: b, row: r, tier: t }, occupiedBy };
}

export default function RestoreOrigButton({ c, allContainers = [], voyageKey, inspector, mode, onDone, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [confirmState, askConfirm] = useConfirm();   // 1.53
  const { pos, occupiedBy } = useMemo(() => origSlotOf(c, allContainers), [c, allContainers]);
  if (!pos) return null;

  const label = `${pos.bay}-${pos.row}-${pos.tier}`;

  const run = async (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (occupiedBy) return;
    // 1.53: 네이티브 confirm() 제거 — 브라우저가 페이지 밖에 그리는 창이라 뜨는 순간 앱이 통째로 멈춘다.
    askConfirm({
      title: '원래 자리로 되돌리기',
      message: `${c.cn}\n원래 계획 자리 ${label} 로 되돌립니다.\n\n진행할까요?`,
      confirmLabel: '되돌리기',
      onConfirm: () => { doRun(); },   // 1.54: await 하지 않는다 — doRun 이 또 모달을 열 수 있는데 useConfirm 이 finally 로 닫아버린다.
    });
  };

  const doRun = async (opts = null) => {
    setBusy(true);
    try {
      const r = await fbReassignContainerPosition(voyageKey, mode || c._mode, c.cn,
        pos.bay, pos.row, pos.tier, inspector, opts || undefined);
      // TallyOne 1.54: 시퀀스 항차에서는 원자리에 이름을 걸어둔 풀 컨이 자리 주인일 수 있다.
      //   그때 firebase 는 **아무것도 쓰지 않고** `needConfirm:'seqFull'` 로 돌아선다 —
      //   여기서 안 받으면 버튼을 눌러도 **아무 일도 안 일어난다**(조용한 실패).
      //   ⛔ 네이티브 confirm() 은 쓰지 않는다(뜨는 순간 앱이 통째로 멈춘다).
      if (r && r.ok === false && r.needConfirm === 'seqFull') {
        setBusy(false);
        askConfirm({
          title: '시퀀스 자리입니다',
          message: seqFullConfirmText(r),
          confirmLabel: '그래도 되돌린다',
          danger: true,
          onConfirm: () => { doRun({ ...(opts || {}), seqConfirmed: true }); },
        });
        return;
      }
      if (r && r.ok === false) { alert('되돌리지 못했습니다. 다시 시도하세요.'); return; }
      onDone?.(c, pos);
    } catch (err) {
      alert(`되돌리기 실패: ${err?.message || err}`);
    } finally { setBusy(false); }
  };

  if (occupiedBy) {
    return (
      <div className={`${compact ? 'px-2 py-1' : 'w-full px-3 py-2'} rounded bg-ink-900 border border-line text-xxs text-dim-400 text-center`}>
        원자리 {label} 에 <span className="mono text-dim-300">{occupiedBy.cn?.slice(-4)}</span> 있음 — 되돌릴 수 없습니다
      </div>
    );
  }

  return (
    <>
      <button onClick={run} disabled={busy}
        className={`${compact ? 'px-3 py-1.5 text-xs' : 'w-full py-2.5 text-sm'} rounded font-bold bg-sky-800 hover:bg-sky-700 border border-sky-600 text-sky-100 disabled:opacity-50 flex items-center justify-center gap-1.5`}>
        {busy ? '되돌리는 중…' : <>↩ 원래 자리로 <span className="mono font-black">{label}</span></>}
      </button>
      <ConfirmModal {...confirmState} />
    </>
  );
}
