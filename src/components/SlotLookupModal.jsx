// 선적 베이플랜 칸에서 «다른 컨이 옴» — 끝자리로 찾아 고른 컨을 그 칸에 싣는 조회창(RZOR 덱플랜의 빈자리 조회창과 같은 방식을 일반 선박 베이플랜에 적용)
//   검수사 2026-10-16 (최원형 민원 «선적시 베이플랜에서 컨테이너 번호 바로바로 수정» · «RZOR의 방법을 다른선박에도» · «베이를 누르면 그안에서 컨 조회로 입력»).
//   고른 컨의 자리·교환·충돌·시퀀스 판정은 새로 만들지 않고 큰 카드의 [컨테이너 번호 수정]과 같은 PositionEditModal·fbReassignContainerPosition 한 벌을 쓴다.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';   // PC 우측 패널(조상에 transform 이 있으면 fixed 가 잘린다) 밖, body 직속으로 그린다
import { effectivePos, getEquipNumber, canCompleteContainer, isoToLabel, fmtPos } from '../utils.js';
import { equipGateText, canWorkNow, workGateText } from '../workChoice.js';
import { fbCompleteContainer, fbReassignContainerPosition } from '../firebase.js';
import { speakDone } from '../voice.js';
import { getBayPairs } from '../twin.js';
import PositionEditModal from './PositionEditModal.jsx';

export default function SlotLookupModal({ open, base, voyageKey, voyageInfo = null, inspector, allContainers = [], mode = 'loading', records = null, shiftCns = null, onClose, onDone }) {   // records·shiftCns — 통과분 문지기 재료(컨 상세 창과 같은 판정)
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const cardPos = useMemo(() => (base ? effectivePos(base) : null), [base]);
  const bayPairs = useMemo(() => {
    try { return getBayPairs(allContainers.filter((x) => x && (!x._mode || x._mode === mode))); } catch { return null; }
  }, [allContainers, mode]);
  const hits = useMemo(() => {
    const k = q.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!base || k.length < 3) return [];
    return allContainers
      .filter((x) => x && x.cn && x.cn !== base.cn && (!x._mode || x._mode === mode) && (x.cn.includes(k) || (x.l4 || x.cn.slice(-4)).includes(k)))
      .sort((a, b) => (!!a._comp - !!b._comp) || a.cn.localeCompare(b.cn))   // 안 실은 컨 먼저
      .slice(0, 8);
  }, [q, base, allContainers, mode]);
  if (!open || !base) return null;
  const close = () => { setQ(''); setPicked(null); onClose?.(); };
  const posTxt = cardPos ? fmtPos(cardPos) : '';
  return (
    <>
      {!picked && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center p-3" onClick={close}>
          <div className="bg-ink-900 border border-line rounded-pill w-full max-w-md p-3 mt-16 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-cyan-200">📍 {posTxt || '이 칸'}</span>
              <button onClick={close} className="ml-auto px-2 py-0.5 rounded text-xs font-black bg-ink-800 text-dim-200">닫기</button>
            </div>
            <div className="text-2xs text-dim-300 mb-2">계획 컨 {String(base.cn).slice(-4)} 대신 실제로 온 컨을 끝자리로 찾아 고르세요. 고르면 이 칸에 싣는 확인 창으로 갑니다.</div>
            <input autoFocus inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value)} placeholder="컨번호 끝자리 (3자리부터)"
              className="w-full px-3 py-2 rounded bg-ink-800 border border-line text-sm mono text-white mb-2" />
            {q.replace(/[^A-Za-z0-9]/g, '').length < 3 ? <div className="text-xs text-dim-300">끝 3자리 이상을 치면 맞는 컨이 나옵니다.</div>
              : hits.length === 0 ? <div className="text-xs text-dim-300">맞는 컨이 없습니다 — 이 항차 선적 목록에 없는 번호입니다.</div>
              : (
                <div className="flex flex-col gap-1.5">
                  {hits.map((h) => {
                    const p = effectivePos(h);
                    const ok = canCompleteContainer(h, mode, records, shiftCns);
                    return (
                      <button key={h.cn} disabled={!ok} onClick={() => { if (!canWorkNow()) { alert(workGateText('선적 완료')); return; } if (!getEquipNumber()) { alert(equipGateText()); return; } setPicked(h); }}
                        className={`text-left px-3 py-2 rounded border text-xs ${ok ? 'bg-ink-800 border-line hover:bg-ink-700' : 'bg-ink-950 border-line opacity-40'}`}>
                        <span className="mono font-black text-white">{h.cn}</span>
                        <span className="text-dim-200 ml-2">{isoToLabel(h.iso || '') || h.iso || ''} {h.fe || ''}</span>
                        <span className="text-dim-300 ml-2">{p ? fmtPos(p) : '자리 없음'}</span>
                        {h._comp ? <span className="ml-2 text-amber-300 font-black">⚠ 이미 선적확인됨</span> : null}
                        {!ok ? <span className="ml-2 text-rose-300">통과화물 — 선적 불가</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        </div>,
        document.body)}
      <PositionEditModal
        open={!!picked}
        container={picked ? { ...picked, bay: '', row: '', tier: '' } : base}
        allContainers={allContainers}
        onClose={() => setPicked(null)}
        defaultAlsoComplete
        shipCode={(voyageInfo && voyageInfo.vsl) || String(voyageKey || '').split('_')[0]}
        defaultPos={cardPos}
        bayPairs={bayPairs}
        slotSource={allContainers}
        onSave={async (newBay, newRow, newTier, opts) => {
          if (!inspector) { alert('검수원을 먼저 선택하세요'); return { ok: false }; }
          const r = await fbReassignContainerPosition(voyageKey, mode, picked.cn, newBay, newRow, newTier, inspector, { actualWork: true, ...(opts || {}) });
          return r;
        }}
        onSavePartner={async (cn, b2, r2, t2, opts) => fbReassignContainerPosition(voyageKey, mode, cn, b2, r2, t2, inspector, { actualWork: true, ...(opts || {}) })}
        onCompleteBoth={async (cns) => {
          const bad = cns.map((cn) => allContainers.find((x) => x && x.cn === cn)).filter((o) => o && !canCompleteContainer(o, mode, records, shiftCns));
          if (bad.length) { alert(`평택 작업 대상이 아닙니다 — 통과화물 ${bad.map((o) => o.cn?.slice(-4)).join(', ')}은 확인할 수 없습니다.`); return; }
          if (!canWorkNow()) { alert(workGateText('완료')); return; }
          if (!getEquipNumber()) { alert(equipGateText()); return; }
          for (const cn of cns) await fbCompleteContainer(voyageKey, mode, cn, inspector, 'normal', '', getEquipNumber());
          cns.forEach((cn2, i) => setTimeout(() => speakDone({ cn: cn2 }), i * 900));
          setQ(''); setPicked(null); onDone?.(); onClose?.();
        }}
      />
    </>
  );
}
