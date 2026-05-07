// M3.87: 컨테이너 위치 변경 모달 (선적 모드 전용)
//   - bay/row/tier 직접 입력 + 충돌 검사 + 풀/엠티 차별 확인
//   - 빈 입력 = 미배정 (선적대상으로 분류)
import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, MapPin } from 'lucide-react';

export default function PositionEditModal({
  open,
  container,
  allContainers = [],
  onClose,
  onSave,  // async (newBay, newRow, newTier) => { ok, displaced }
}) {
  const [bay, setBay] = useState('');
  const [row, setRow] = useState('');
  const [tier, setTier] = useState('');
  const [step, setStep] = useState('input');  // 'input' | 'confirm' | 'saving'
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (open && container) {
      setBay(container.bay || '');
      setRow(container.row || '');
      setTier(container.tier || '');
      setStep('input');
      setErrMsg('');
    }
  }, [open, container]);

  // 충돌 검사: 같은 자리에 있는 다른 컨
  const conflict = useMemo(() => {
    if (!bay || !row || !tier) return null;
    const bayInt = String(parseInt(bay, 10));
    const rowPad = String(row).padStart(2, '0');
    const tierPad = String(tier).padStart(2, '0');
    return allContainers.find(c => {
      if (!c || c.cn === container?.cn) return false;
      const cBay = c.bay ? String(parseInt(c.bay, 10)) : '';
      return cBay === bayInt && c.row === rowPad && c.tier === tierPad;
    }) || null;
  }, [bay, row, tier, allContainers, container]);

  if (!open || !container) return null;

  const isFull = container.fe === 'F';
  const isCompleted = !!container._comp;
  const isUnassign = !bay && !row && !tier;

  const validate = () => {
    if (isUnassign) return '';
    const bn = parseInt(bay, 10);
    if (!Number.isFinite(bn) || bn < 1 || bn > 999) return 'Bay는 1~999 숫자';
    if (!/^\d{1,2}$/.test(row)) return 'Row는 1~2자리 숫자';
    if (!/^\d{1,2}$/.test(tier)) return 'Tier는 1~2자리 숫자';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setErrMsg(err); return; }
    setErrMsg('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('saving');
    try {
      const r = row ? String(row).padStart(2, '0') : '';
      const t = tier ? String(tier).padStart(2, '0') : '';
      const result = await onSave(bay, r, t);
      if (result?.ok) onClose();
      else { setErrMsg('저장 실패'); setStep('input'); }
    } catch (e) {
      setErrMsg(e?.message || String(e));
      setStep('input');
    }
  };

  const oldPosLabel = container.bay
    ? `${String(parseInt(container.bay, 10)).padStart(2, '0')}-${container.row}-${container.tier}`
    : '미배정';
  const newPosLabel = isUnassign
    ? '미배정 (선적대상)'
    : `${String(parseInt(bay, 10) || 0).padStart(2, '0')}-${String(row).padStart(2,'0')}-${String(tier).padStart(2,'0')}`;

  const borderClr = step === 'confirm' && isFull ? 'border-rose-600' : 'border-amber-700';
  const headTxtClr = step === 'confirm' && isFull ? 'text-rose-300' : 'text-amber-300';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`bg-slate-900 border-2 ${borderClr} rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${headTxtClr}`}/>
            <h2 className={`text-lg font-black ${headTxtClr}`}>위치 수정</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-4 border-b border-slate-800">
          <div className="text-2xl font-black mono text-amber-300">{container.l4 || container.cn?.slice(-4)}</div>
          <div className="text-base font-bold mono text-slate-200 mb-2">{container.cn}</div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className={`px-2 py-1 rounded font-black ${isFull ? 'bg-rose-700 text-rose-50' : 'bg-slate-700 text-slate-300'}`}>
              {isFull ? '풀 (F)' : container.fe === 'E' ? '엠티 (E)' : '미정'}
            </span>
            {container.iso && <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded mono">{container.iso}</span>}
            {isCompleted && <span className="bg-emerald-700 text-emerald-50 px-2 py-1 rounded font-black">✓ 선적 완료</span>}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            현재 위치: <span className="text-amber-300 mono font-bold">{oldPosLabel}</span>
          </div>
        </div>

        {step === 'input' && (
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-400">새 위치 (Bay-Row-Tier). 모두 비우면 미배정 처리(선적대상).</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold">BAY</label>
                <input type="text" inputMode="numeric" value={bay}
                  onChange={e => setBay(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                  placeholder="14"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold">ROW</label>
                <input type="text" inputMode="numeric" value={row}
                  onChange={e => setRow(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="00"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold">TIER</label>
                <input type="text" inputMode="numeric" value={tier}
                  onChange={e => setTier(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="02"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
            </div>
            {errMsg && <div className="text-red-400 text-sm font-bold">{errMsg}</div>}
            {conflict && (
              <div className="bg-orange-950/40 border-2 border-orange-700 rounded-lg p-3">
                <div className="text-orange-300 font-black text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4"/>이미 배정된 자리
                </div>
                <div className="mt-1 text-xs text-orange-200">
                  <span className="mono font-black">{conflict.cn}</span> ({conflict.fe === 'F' ? '풀' : '엠티'})이 거기 있습니다.
                </div>
                <div className="mt-1 text-[10px] text-orange-300">
                  → 확인 시 그 컨은 미배정 처리(선적대상으로 분류)됨
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded">
                취소
              </button>
              <button onClick={handleNext}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-black rounded">
                다음 →
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-4 space-y-3">
            {isFull ? (
              <div className="bg-rose-950 border-4 border-rose-600 rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-300"/>
                  <div className="text-rose-200 font-black text-lg">풀 컨테이너 위치 변경</div>
                </div>
                <div className="text-rose-100 text-sm">
                  풀 컨테이너입니다. 변경 시 화물 처리에 영향이 있을 수 있습니다.
                </div>
                <div className="text-rose-200 font-black mt-2">정말 변경하시겠습니까?</div>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="text-slate-200 text-sm">
                  {isCompleted ? '이미 선적 완료된 컨테이너입니다. 위치를 변경하시겠습니까?' : '위치를 변경하시겠습니까?'}
                </div>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs text-slate-400">변경 내용</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 mono">{oldPosLabel}</span>
                <span className="text-amber-400 text-xl">→</span>
                <span className={`mono font-black text-lg ${isUnassign ? 'text-orange-300' : 'text-emerald-300'}`}>{newPosLabel}</span>
              </div>
              {conflict && (
                <div className="text-[11px] text-orange-300 mt-2">
                  ⚠ {conflict.cn} → 미배정 (선적대상으로 분류)
                </div>
              )}
            </div>

            {errMsg && <div className="text-red-400 text-sm font-bold">{errMsg}</div>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep('input')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded">
                ← 돌아가기
              </button>
              <button onClick={handleConfirm}
                className={`flex-1 py-3 font-black rounded ${
                  isFull ? 'bg-rose-700 hover:bg-rose-600 text-rose-50' : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-50'
                }`}>
                {isFull ? '⚠ 변경 확정' : '변경 확정'}
              </button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-pulse text-lg">저장 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}
