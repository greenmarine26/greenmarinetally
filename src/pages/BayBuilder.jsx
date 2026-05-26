import React, { useState, useMemo } from 'react';
import BayBox from '../components/BayBox.jsx';
import { saveShip, createBayEntry } from '../lib/shipDict.js';

/**
 * 베이사전 빌더 - 좌측 편집 + 우측 시뮬레이션(베이플랜)
 *
 * Props:
 *   ship: { code, name, imo, callsign, bays: [BayEntry] }
 *   onBack: 뒤로가기 (선박 리스트)
 *   onSaved: 저장 완료 콜백
 */
export default function BayBuilder({ ship: initialShip, onBack, onSaved }) {
  const [ship, setShip] = useState(initialShip);
  const [selectedBay, setSelectedBay] = useState(null);
  const [copyMode, setCopyMode] = useState(null); // null | { sourceBay, selectedTargets }
  const [addBayInput, setAddBayInput] = useState('');
  const [addPairInput, setAddPairInput] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const bays = ship.bays || [];
  const baySorted = useMemo(() => [...bays].sort((a, b) => parseInt(a.bay) - parseInt(b.bay)), [bays]);
  const selectedBayEntry = useMemo(() => bays.find(b => b.bay === selectedBay), [bays, selectedBay]);

  // ──── 베이 추가 ────────────────────────────────────────
  const handleAddBay = () => {
    const n = parseInt(addBayInput);
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      alert('베이 번호 1~999');
      return;
    }
    const bay = String(n).padStart(3, '0');
    if (bays.some(b => b.bay === bay)) {
      alert(`BAY ${bay} 이미 존재`);
      return;
    }
    const pairEven = addPairInput && parseInt(addPairInput) > 0
      ? String(parseInt(addPairInput)).padStart(2, '0')
      : null;
    const newBay = createBayEntry(n, pairEven);
    setShip(s => ({ ...s, bays: [...(s.bays || []), newBay] }));
    setAddBayInput('');
    setAddPairInput('');
    setSelectedBay(newBay.bay);
  };

  // ──── 베이 삭제 ────────────────────────────────────────
  const handleDeleteBay = (bay) => {
    if (!confirm(`BAY ${bay} 삭제?`)) return;
    setShip(s => ({ ...s, bays: s.bays.filter(b => b.bay !== bay) }));
    if (selectedBay === bay) setSelectedBay(null);
  };

  // ──── 베이 entry 업데이트 ─────────────────────────────
  const updateBay = (bayId, updater) => {
    setShip(s => ({
      ...s,
      bays: s.bays.map(b => b.bay === bayId ? updater(b) : b),
    }));
  };

  // ──── tier 추가/삭제/수정 ─────────────────────────────
  const addTier = (bayId, kind, value) => {
    const v = parseInt(value);
    if (!Number.isFinite(v) || v < 1 || v > 99) { alert('Tier 1~99'); return; }
    updateBay(bayId, b => {
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const cKey = kind === 'deck' ? 'deckCells' : 'holdCells';
      if (b[tKey].includes(v)) { alert(`Tier ${v} 이미 존재`); return b; }
      const tiers = [...b[tKey], v].sort((a, c) => c - a); // 큰 수부터
      const cells = [...b[cKey]];
      const newIdx = tiers.indexOf(v);
      cells.splice(newIdx, 0, b.rowCount || 7);
      return { ...b, [tKey]: tiers, [cKey]: cells };
    });
  };
  const deleteTier = (bayId, kind, idx) => {
    updateBay(bayId, b => {
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const cKey = kind === 'deck' ? 'deckCells' : 'holdCells';
      const tiers = [...b[tKey]]; tiers.splice(idx, 1);
      const cells = [...b[cKey]]; cells.splice(idx, 1);
      return { ...b, [tKey]: tiers, [cKey]: cells };
    });
  };
  const updateTier = (bayId, kind, idx, value) => {
    const v = parseInt(value);
    updateBay(bayId, b => {
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const tiers = [...b[tKey]];
      tiers[idx] = isNaN(v) ? 0 : v;
      return { ...b, [tKey]: tiers };
    });
  };
  const updateCells = (bayId, kind, idx, value) => {
    const v = parseInt(value);
    updateBay(bayId, b => {
      const cKey = kind === 'deck' ? 'deckCells' : 'holdCells';
      const cells = [...b[cKey]];
      cells[idx] = isNaN(v) ? 0 : v;
      return { ...b, [cKey]: cells };
    });
  };

  // ──── 베이 복사 ────────────────────────────────────────
  const handleCopyBay = (sourceBay, targetBays) => {
    const src = bays.find(b => b.bay === sourceBay);
    if (!src) return;
    const copyFields = [
      'rowCount', 'hasZero',
      'deckTiers', 'holdTiers', 'deckCells', 'holdCells',
      'deckAlign', 'deckPadLeft', 'deckPadRight',
      'holdAlign', 'holdPadLeft', 'holdPadRight',
    ];
    setShip(s => ({
      ...s,
      bays: s.bays.map(b => {
        if (b.bay === sourceBay || !targetBays.includes(b.bay)) return b;
        const copy = { ...b };
        for (const f of copyFields) {
          copy[f] = Array.isArray(src[f]) ? [...src[f]] : src[f];
        }
        return copy;
      }),
    }));
  };

  // ──── 저장 ────────────────────────────────────────────
  const handleSave = () => {
    const ok = saveShip(ship);
    if (ok) {
      setSavedMsg(`✓ ${ship.code} 저장 완료 (${bays.length}개 베이)`);
      setTimeout(() => setSavedMsg(''), 3000);
      if (onSaved) onSaved(ship);
    } else {
      alert('저장 실패 — localStorage 용량 확인');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3">
        <button onClick={onBack} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          ← 선박 리스트
        </button>
        <div className="flex-1">
          <div className="text-base font-bold">{ship.name || '(이름 없음)'} <span className="text-cyan-400 font-mono">{ship.code}</span></div>
          <div className="text-xs text-slate-400">IMO: {ship.imo || '-'} · 콜사인: {ship.callsign || '-'} · 등록 베이: {bays.length}</div>
        </div>
        <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold">
          💾 저장
        </button>
        {savedMsg && <span className="text-emerald-400 text-sm">{savedMsg}</span>}
      </div>

      {/* 본문 좌우 분할 */}
      <div className="flex-1 flex overflow-hidden">
        {/* === 좌측: 베이 편집 === */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* 베이 추가 폼 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
            <div className="text-sm font-bold text-emerald-300 mb-2">➕ 베이 추가</div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs">
                <span className="text-slate-400 mr-1">번호:</span>
                <input type="number" value={addBayInput} onChange={e => setAddBayInput(e.target.value)}
                  placeholder="예: 11" min="1" max="999"
                  className="w-20 px-2 py-1 bg-slate-700 rounded text-center font-mono" />
              </label>
              <label className="text-xs">
                <span className="text-slate-400 mr-1">페어 짝수 (선택):</span>
                <input type="number" value={addPairInput} onChange={e => setAddPairInput(e.target.value)}
                  placeholder="예: 12 (단독은 비움)" min="1" max="99"
                  className="w-24 px-2 py-1 bg-slate-700 rounded text-center font-mono" />
              </label>
              <button onClick={handleAddBay} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-sm font-bold">
                + 추가
              </button>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              홀수 베이 = 20ft. 페어 짝수가 있으면 그 짝수 (40ft)와 묶임. 예: 11 단독 / 13 페어(짝수 12)
            </div>
          </div>

          {/* 베이 리스트 */}
          {baySorted.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              아직 등록된 베이가 없습니다. 위 폼으로 추가하세요.
            </div>
          ) : (
            baySorted.map(b => {
              const isSelected = selectedBay === b.bay;
              return (
                <div key={b.bay} className={`border ${isSelected ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500' : 'border-slate-700 bg-slate-800'} rounded p-3`}>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <button
                      onClick={() => setSelectedBay(isSelected ? null : b.bay)}
                      className={`px-2 py-1 rounded font-bold ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-cyan-700'}`}
                      title="우측에 미리보기 표시">
                      👁 BAY {b.bay}
                    </button>
                    {b.pairEven && <span className="text-slate-400 text-xs">({b.pairEven}) 페어</span>}
                    {isSelected && <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600 rounded font-bold">미리보기 →</span>}
                    <label className="ml-auto flex items-center gap-1 text-xs">
                      <span className="text-slate-400">rowCount:</span>
                      <input type="number" min="0" max="20" value={b.rowCount || ''}
                        onChange={e => updateBay(b.bay, x => ({ ...x, rowCount: parseInt(e.target.value) || 0 }))}
                        className="w-14 px-2 py-0.5 bg-slate-700 rounded text-center" />
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={!!b.hasZero}
                        onChange={e => updateBay(b.bay, x => ({ ...x, hasZero: e.target.checked }))} />
                      00포함
                    </label>
                    <button onClick={() => handleDeleteBay(b.bay)}
                      className="px-2 py-1 bg-red-900/50 hover:bg-red-700 rounded text-xs">×</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Deck */}
                    <TierEditor
                      label="Deck Tier"
                      labelColor="text-blue-400"
                      bgClass="bg-blue-950/20"
                      tiers={b.deckTiers || []}
                      cells={b.deckCells || []}
                      rowCount={b.rowCount || 7}
                      onAdd={v => addTier(b.bay, 'deck', v)}
                      onDelete={i => deleteTier(b.bay, 'deck', i)}
                      onUpdateTier={(i, v) => updateTier(b.bay, 'deck', i, v)}
                      onUpdateCells={(i, v) => updateCells(b.bay, 'deck', i, v)}
                    />
                    {/* Hold */}
                    <TierEditor
                      label="Hold Tier"
                      labelColor="text-green-400"
                      bgClass="bg-green-950/20"
                      tiers={b.holdTiers || []}
                      cells={b.holdCells || []}
                      rowCount={b.rowCount || 7}
                      onAdd={v => addTier(b.bay, 'hold', v)}
                      onDelete={i => deleteTier(b.bay, 'hold', i)}
                      onUpdateTier={(i, v) => updateTier(b.bay, 'hold', i, v)}
                      onUpdateCells={(i, v) => updateCells(b.bay, 'hold', i, v)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* === 우측: 베이플랜 시뮬레이션 === */}
        <div className="w-[440px] flex-shrink-0 border-l border-slate-700 bg-slate-800/50 overflow-y-auto">
          <div className="p-3">
            <div className="text-sm font-bold text-cyan-300 mb-2 flex items-center justify-between">
              <span>🎯 베이플랜 시뮬</span>
              {selectedBay && <span className="text-xs bg-cyan-900 px-2 py-0.5 rounded">BAY {selectedBay}</span>}
            </div>

            {!selectedBayEntry ? (
              <div className="text-center text-slate-500 text-sm py-12 italic">
                ⬅ 좌측 베이 선택<br/>여기에 미리보기 표시
              </div>
            ) : (
              <>
                <div className="bg-white rounded p-2 mb-3" style={{ minHeight: 280 }}>
                  <BayBox bay={selectedBayEntry} count={null} />
                </div>

                {/* 데크-홀드 정렬 */}
                <div className="bg-slate-900/50 rounded p-2 mb-2">
                  <div className="text-xs font-bold mb-2">📐 데크-홀드 정렬</div>
                  <div className="mb-2">
                    <div className="text-[10px] text-slate-400 mb-1">Hold 정렬</div>
                    <div className="flex gap-1">
                      {['left', 'center', 'right'].map(a => (
                        <button key={a}
                          onClick={() => updateBay(selectedBayEntry.bay, x => ({ ...x, holdAlign: a }))}
                          className={`flex-1 px-2 py-1 text-xs rounded ${selectedBayEntry.holdAlign === a ? 'bg-cyan-600 font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                          {a === 'left' ? '← 좌' : a === 'center' ? '∙ 가운데' : '우 →'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-1">
                      <span className="text-slate-400">왼쪽 +</span>
                      <input type="number" min="0" max="20" value={selectedBayEntry.holdPadLeft || 0}
                        onChange={e => updateBay(selectedBayEntry.bay, x => ({ ...x, holdPadLeft: parseInt(e.target.value) || 0 }))}
                        className="w-12 px-1 py-0.5 bg-slate-700 rounded text-center" />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-slate-400">오른쪽 +</span>
                      <input type="number" min="0" max="20" value={selectedBayEntry.holdPadRight || 0}
                        onChange={e => updateBay(selectedBayEntry.bay, x => ({ ...x, holdPadRight: parseInt(e.target.value) || 0 }))}
                        className="w-12 px-1 py-0.5 bg-slate-700 rounded text-center" />
                    </label>
                  </div>
                </div>

                {/* 베이 복사 */}
                <div className="bg-amber-900/20 border border-amber-700/50 rounded p-2">
                  <div className="text-xs text-amber-300 font-bold mb-1">📋 베이 구조 복사</div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    BAY {selectedBayEntry.bay}의 tier/cells/정렬을 다른 베이에 일괄 적용
                  </div>
                  <button
                    onClick={() => setCopyMode({ sourceBay: selectedBayEntry.bay, selectedTargets: new Set() })}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-600 rounded text-sm font-bold">
                    📋 다른 베이에 복사하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 베이 복사 모달 */}
      {copyMode && (
        <CopyModal
          sourceBay={copyMode.sourceBay}
          bays={bays}
          selectedTargets={copyMode.selectedTargets}
          onChange={set => setCopyMode({ ...copyMode, selectedTargets: set })}
          onCancel={() => setCopyMode(null)}
          onConfirm={() => {
            handleCopyBay(copyMode.sourceBay, [...copyMode.selectedTargets]);
            setCopyMode(null);
          }}
        />
      )}
    </div>
  );
}

// ──── Tier Editor (deck/hold 공통) ────────────────────────
function TierEditor({ label, labelColor, bgClass, tiers, cells, rowCount, onAdd, onDelete, onUpdateTier, onUpdateCells }) {
  const [addInput, setAddInput] = useState('');
  const handleAdd = () => {
    if (!addInput) return;
    onAdd(addInput);
    setAddInput('');
  };

  return (
    <div className={`${bgClass} rounded p-2`}>
      <div className={`${labelColor} font-bold mb-1 flex items-center gap-1 text-xs`}>
        <span>{label} ({tiers.length})</span>
        <input type="number" value={addInput} onChange={e => setAddInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="tier" min="1" max="99"
          className="w-14 px-1 py-0.5 bg-slate-700 rounded text-center text-[11px] ml-2" />
        <button onClick={handleAdd}
          className="px-1.5 py-0.5 bg-emerald-700/60 hover:bg-emerald-600 rounded text-[10px]">+</button>
      </div>
      {tiers.length === 0 ? (
        <div className="text-slate-500 italic text-[11px]">없음 — 위 [+] 사용</div>
      ) : (
        tiers.map((t, idx) => (
          <div key={idx} className="flex items-center gap-1 mb-0.5">
            <input type="number" value={t}
              onChange={e => onUpdateTier(idx, e.target.value)}
              className="w-12 px-1 py-0.5 bg-slate-700 rounded text-center font-mono" min="1" max="99" />
            <span className="text-slate-500">cells</span>
            <input type="number" value={cells[idx] || 0}
              onChange={e => onUpdateCells(idx, e.target.value)}
              className="w-12 px-1 py-0.5 bg-slate-700 rounded text-center" min="0" max="20" />
            <button onClick={() => onDelete(idx)}
              className="ml-auto w-5 h-5 bg-red-900/50 hover:bg-red-700 rounded text-[10px]">×</button>
          </div>
        ))
      )}
    </div>
  );
}

// ──── 베이 복사 모달 ──────────────────────────────────
function CopyModal({ sourceBay, bays, selectedTargets, onChange, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-900 rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}>
        <div className="text-base font-bold mb-1">📋 BAY {sourceBay} → 복사 대상 선택</div>
        <div className="text-xs text-slate-400 mb-3">tier/cells/정렬/padding 모두 복사 (pairEven 제외)</div>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {bays
            .filter(b => b.bay !== sourceBay)
            .sort((a, b) => parseInt(a.bay) - parseInt(b.bay))
            .map(b => {
              const checked = selectedTargets.has(b.bay);
              return (
                <button key={b.bay}
                  onClick={() => {
                    const next = new Set(selectedTargets);
                    if (checked) next.delete(b.bay); else next.add(b.bay);
                    onChange(next);
                  }}
                  className={`p-2 rounded text-sm font-bold ${checked ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  BAY {b.bay}
                </button>
              );
            })}
        </div>
        <div className="flex justify-between items-center">
          <button onClick={() => onChange(new Set(bays.filter(b => b.bay !== sourceBay).map(b => b.bay)))}
            className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded">전체 선택</button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 bg-slate-700 rounded">취소</button>
            <button onClick={onConfirm} disabled={selectedTargets.size === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold disabled:opacity-30">
              {selectedTargets.size}개 베이에 복사
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
