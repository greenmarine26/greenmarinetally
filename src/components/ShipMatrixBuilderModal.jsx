// src/components/ShipMatrixBuilderModal.jsx — M6.93.2
// 신규 선박 베이 매트릭스 빌더
//   - EDI에서 자동 추출된 선박 정보 (콜사인/IMO/선박명) 자동 채움
//   - 베이 분석 상태 요약 카드
//   - 자동 추론된 CASP 코드 (callsign 또는 선박명 약자)
//   - PDF 보강 옵션
//   - 사용자 검증/수정 후 userBayDict 저장

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  buildMatrixFromEdi,
  augmentMatrixFromBayDict,
  augmentMatrixFromPdf,
  matrixToBayDictEntry,
  bayDictEntryToMatrix,
  extractShipMetaFromVoyage,
  summarizeMatrix,
  createEmptyBayEntry,
  detectMissingBays,
  fillEmptyBaysSequential,
} from '../shipMatrixBuilder.js';
import { parsePdfStowage } from '../pdfBayParser.js';
import { addToUserBayDict, lookupUserBayDict } from '../data/userBayDict.js';

export default function ShipMatrixBuilderModal({ voyage, containers, onClose, onSaved }) {
  const [matrix, setMatrix] = useState(null);
  // 선박 메타 자동 채움 (voyage.info의 EDI 자동 추출 데이터)
  const autoMeta = useMemo(() => extractShipMetaFromVoyage(voyage), [voyage]);
  const [shipMeta, setShipMeta] = useState(autoMeta);
  const [editMeta, setEditMeta] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('idle');
  const [pdfError, setPdfError] = useState('');
  const fileInputRef = useRef(null);
  const [savingMsg, setSavingMsg] = useState('');
  const [done, setDone] = useState(false);
  // 베이 추가 폼 상태
  const [addBayInput, setAddBayInput] = useState('');
  const [addPairInput, setAddPairInput] = useState('');

  const addBay = (bayNumRaw, pairEvenRaw) => {
    const n = parseInt(bayNumRaw);
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      alert('베이 번호는 1~999 사이여야 합니다');
      return;
    }
    const bay = String(n).padStart(3, '0');
    if (matrix.byBay[bay]) {
      alert(`BAY ${bay}는 이미 존재합니다`);
      return;
    }
    const pairEven = pairEvenRaw && parseInt(pairEvenRaw) > 0
      ? String(parseInt(pairEvenRaw)).padStart(2, '0')
      : null;
    setMatrix(m => ({
      ...m,
      byBay: { ...m.byBay, [bay]: createEmptyBayEntry(bay, pairEven) },
    }));
    setAddBayInput('');
    setAddPairInput('');
  };

  const deleteBay = (bay) => {
    if (!confirm(`BAY ${bay} 삭제하시겠습니까?`)) return;
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      delete cp.byBay[bay];
      return cp;
    });
  };

  const addTier = (bay, kind, tierValueRaw) => {
    const v = parseInt(tierValueRaw);
    if (!Number.isFinite(v) || v < 1 || v > 99) {
      alert('Tier 번호는 1~99 사이여야 합니다');
      return;
    }
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      const entry = { ...cp.byBay[bay] };
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const cKey = kind === 'deck' ? 'deckCells' : 'holdCells';
      const tiers = [...(entry[tKey] || [])];
      if (tiers.includes(v)) {
        alert(`Tier ${v}은 이미 존재합니다`);
        return cp;
      }
      tiers.push(v);
      // 정렬: deck = 큰 수부터, hold = 큰 수부터 (배열 순서가 top→bottom)
      tiers.sort((a, b) => b - a);
      // cells 동기화: 동일 인덱스에 rowCount 값 채워넣기
      const cells = [...(entry[cKey] || [])];
      const newIdx = tiers.indexOf(v);
      cells.splice(newIdx, 0, entry.rowCount || 9);
      entry[tKey] = tiers;
      entry[cKey] = cells;
      cp.byBay[bay] = entry;
      return cp;
    });
  };

  const deleteTier = (bay, kind, idx) => {
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      const entry = { ...cp.byBay[bay] };
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const cKey = kind === 'deck' ? 'deckCells' : 'holdCells';
      entry[tKey] = (entry[tKey] || []).filter((_, i) => i !== idx);
      entry[cKey] = (entry[cKey] || []).filter((_, i) => i !== idx);
      cp.byBay[bay] = entry;
      return cp;
    });
  };

  const updateTier = (bay, kind, idx, newVal) => {
    const v = parseInt(newVal);
    if (!Number.isFinite(v)) return;
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      const entry = { ...cp.byBay[bay] };
      const tKey = kind === 'deck' ? 'deckTiers' : 'holdTiers';
      const tiers = [...(entry[tKey] || [])];
      tiers[idx] = v;
      entry[tKey] = tiers;
      cp.byBay[bay] = entry;
      return cp;
    });
  };

  // 초기 분석 (저장된 entry 우선 → 없으면 EDI + 베이사전) — 마운트 시 1회만
  const initAnalyzedRef = useRef(false);
  useEffect(() => {
    if (initAnalyzedRef.current) return;
    // 1) 사용자가 이전에 저장한 매트릭스 있으면 그것 우선 복원 (사용자 작업 보호)
    const saved = lookupUserBayDict(autoMeta.imo, autoMeta.code);
    if (saved?.bayDef?.baysSummary?.length > 0) {
      const restored = bayDictEntryToMatrix(saved);
      if (restored) {
        setMatrix(restored);
        initAnalyzedRef.current = true;
        return;
      }
    }
    // 2) 저장 없으면 EDI 분석 + 1~max 자동 채움
    if (!containers || containers.length === 0) {
      setMatrix({ byBay: {}, _empty: true });
      initAnalyzedRef.current = true;
      return;
    }
    const m1 = buildMatrixFromEdi(containers);
    const m2 = augmentMatrixFromBayDict(m1, autoMeta.imo, autoMeta.code);
    const m3 = fillEmptyBaysSequential(m2);  // 1~max 추정 베이 자동 추가
    setMatrix(m3);
    initAnalyzedRef.current = true;
  }, [containers, autoMeta.imo, autoMeta.code]);

  const handlePdfUpload = async (file) => {
    if (!file) return;
    setPdfStatus('parsing'); setPdfError('');
    try {
      const result = await parsePdfStowage(file);
      if (result.shipName && !shipMeta.name) {
        setShipMeta(m => ({ ...m, name: result.shipName }));
      }
      let merged = augmentMatrixFromPdf({ ...matrix }, result);
      merged = fillEmptyBaysSequential(merged); // PDF 보강 후 1~max 다시 채움
      setMatrix(merged);
      setPdfStatus('done');
    } catch (err) {
      console.error('[ShipMatrixBuilder] PDF parse error:', err);
      setPdfError(err.message || 'PDF 파싱 실패');
      setPdfStatus('error');
    }
  };

  const updateBay = (bay, field, value) => {
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      cp.byBay[bay] = { ...cp.byBay[bay], [field]: value };
      return cp;
    });
  };

  const updateCells = (bay, kind, idx, value) => {
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      const entry = { ...cp.byBay[bay] };
      const key = kind === 'deck' ? 'deckCells' : 'holdCells';
      entry[key] = [...(entry[key] || [])];
      entry[key][idx] = parseInt(value) || 0;
      cp.byBay[bay] = entry;
      return cp;
    });
  };

  const handleSave = () => {
    if (!shipMeta.code) {
      alert('CASP 코드를 입력하세요 (자동 추론된 값 사용 권장)');
      return;
    }
    const entry = matrixToBayDictEntry(matrix, shipMeta.code, shipMeta.name, shipMeta.imo);
    // 콜사인 추가
    entry.callsign = shipMeta.callsign || '';
    const ok = addToUserBayDict(entry);
    if (ok) {
      setSavingMsg(`✅ ${shipMeta.code} (${shipMeta.name}) 베이사전 저장 완료 — ${entry.bayDef.recordCount}개 베이`);
      setDone(true);
      if (onSaved) onSaved(entry);
    } else {
      alert('저장 실패 — localStorage 용량 확인 필요');
    }
  };

  if (!matrix) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center">
        <div className="bg-zinc-900 p-6 rounded-lg text-white">
          <div>매트릭스 분석 중...</div>
        </div>
      </div>
    );
  }

  const summary = summarizeMatrix(matrix);
  const bayList = Object.keys(matrix.byBay).sort();

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-start justify-center overflow-auto py-8">
      <div className="bg-zinc-900 rounded-lg text-white w-full max-w-5xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* 헤더 */}
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">🚢 신규 선박 베이 매트릭스 빌더</h2>
            <div className="text-xs text-zinc-400 mt-1">
              현재 항차의 EDI에서 선박 정보 자동 추출 + 베이 구조 분석
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl px-2">×</button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4">
          {/* === 자동 추출 선박 정보 === */}
          <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-700/50 p-4 rounded mb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs text-blue-300 font-bold">📡 EDI 자동 추출 선박 정보 (수정 가능)</div>
              <button
                onClick={() => setEditMeta(!editMeta)}
                className="text-xs px-2 py-0.5 bg-blue-700/50 hover:bg-blue-600 rounded"
              >
                {editMeta ? '✓ 적용' : '✏ 수정'}
              </button>
            </div>
            {!editMeta ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-blue-300/70">선박명</div>
                  <div className="font-bold text-base">{shipMeta.name || <span className="text-zinc-500">미상</span>}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-300/70">콜사인 (호출부호)</div>
                  <div className="font-mono font-bold">{shipMeta.callsign || <span className="text-zinc-500">미상</span>}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-300/70">IMO</div>
                  <div className="font-mono">{shipMeta.imo || <span className="text-zinc-500">미상</span>}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-300/70">CASP 코드 (자동 추론)</div>
                  <div className="font-mono font-bold text-emerald-300">{shipMeta.code || <span className="text-red-400">없음 — 입력 필요</span>}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-blue-300/70">항차</div>
                  <div className="font-mono text-xs">{shipMeta.voy || <span className="text-zinc-500">—</span>}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <label>
                  <div className="text-[10px] text-blue-300/70">선박명</div>
                  <input value={shipMeta.name || ''} onChange={e => setShipMeta(m => ({ ...m, name: e.target.value }))}
                         className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded" />
                </label>
                <label>
                  <div className="text-[10px] text-blue-300/70">콜사인</div>
                  <input value={shipMeta.callsign || ''} onChange={e => setShipMeta(m => ({ ...m, callsign: e.target.value.toUpperCase() }))}
                         className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded font-mono" />
                </label>
                <label>
                  <div className="text-[10px] text-blue-300/70">IMO</div>
                  <input value={shipMeta.imo || ''} onChange={e => setShipMeta(m => ({ ...m, imo: e.target.value }))}
                         className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded font-mono" />
                </label>
                <label>
                  <div className="text-[10px] text-blue-300/70">CASP 코드 *</div>
                  <input value={shipMeta.code || ''} onChange={e => setShipMeta(m => ({ ...m, code: e.target.value.toUpperCase() }))}
                         className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded font-mono font-bold" />
                </label>
              </div>
            )}
          </div>

          {/* === 베이 분석 상태 카드 === */}
          <div className="bg-zinc-800 p-3 rounded mb-4">
            <div className="text-xs text-zinc-400 font-bold mb-2">📊 베이 구조 분석 결과</div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-sm">
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-2xl font-bold text-emerald-400">{summary.totalBays}</div>
                <div className="text-[10px] text-zinc-400">총 베이</div>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-2xl font-bold text-blue-400">{summary.pairCount}</div>
                <div className="text-[10px] text-zinc-400">페어</div>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-2xl font-bold text-purple-400">{summary.singleCount}</div>
                <div className="text-[10px] text-zinc-400">단독</div>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-2xl font-bold text-cyan-400">{summary.hasHoldCount}</div>
                <div className="text-[10px] text-zinc-400">Hold 있음</div>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-2xl font-bold text-yellow-400">{summary.deckOnlyCount}</div>
                <div className="text-[10px] text-zinc-400">Deck only</div>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <div className={`text-2xl font-bold ${summary.needReviewCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {summary.needReviewCount}
                </div>
                <div className="text-[10px] text-zinc-400">검토 필요</div>
              </div>
            </div>
            {summary.estimatedCount > 0 && (
              <div className="text-[11px] text-zinc-400 mt-2">
                ⚠ 추정 베이 {summary.estimatedCount}개 (EDI/PDF 발견 안 됨, 1~max 자동 채움). [×]로 삭제하거나 수정.
              </div>
            )}
            <div className="text-[11px] text-zinc-500 mt-2">
              출처: EDI ({matrix._empty ? '없음' : '✓'}) · 베이사전 ({matrix.bayDictUsed ? '✓ 매칭' : '없음'}) · PDF ({matrix.pdfUsed ? '✓ 보강' : '미사용'})
              {matrix.bayDictMeta?.name && <span className="ml-2 text-cyan-400">(사전: {matrix.bayDictMeta.name})</span>}
            </div>
          </div>

          {/* === PDF 업로드 (옵션 보강) === */}
          <div className="bg-zinc-800 p-3 rounded mb-4 flex justify-between items-center">
            <div className="text-xs text-zinc-400">
              {matrix.fromSaved && (
                <span className="text-emerald-400">✓ 저장된 매트릭스 복원됨{matrix.savedAt && ` (${new Date(matrix.savedAt).toLocaleString('ko-KR')})`}</span>
              )}
              {!matrix.fromSaved && summary.needReviewCount > 0 && (
                <span className="text-amber-400">⚠ {summary.needReviewCount}개 베이 검토 필요. PDF 있으면 업로드해서 보강.</span>
              )}
              {!matrix.fromSaved && summary.needReviewCount === 0 && (
                <span>모든 베이 분석 완료. 필요 시 PDF로 추가 보강 가능.</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input ref={fileInputRef} type="file" accept=".pdf" hidden
                     onChange={e => handlePdfUpload(e.target.files?.[0])} />
              <button onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm">
                📄 PDF 업로드 (선택)
              </button>
              {pdfStatus === 'parsing' && <span className="text-xs text-zinc-400">파싱 중...</span>}
              {pdfStatus === 'done' && matrix.pdfStats && (
                <span className="text-xs text-emerald-400">
                  ✓ 신규 {matrix.pdfStats.added} / 보강 {matrix.pdfStats.augmented} (PDF {matrix.pdfStats.totalPdfBays}베이)
                </span>
              )}
              {pdfStatus === 'error' && <span className="text-xs text-red-400">{pdfError}</span>}
            </div>
          </div>

          {/* === 베이별 검증 폼 === */}
          {!done && (
            <div className="space-y-2">
              {/* 베이 추가 폼 */}
              <div className="bg-zinc-900/60 border border-zinc-700 rounded p-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-emerald-300">➕ 베이 추가</span>
                <input
                  type="number" placeholder="BAY 번호 (예: 1)"
                  value={addBayInput}
                  onChange={e => setAddBayInput(e.target.value)}
                  className="w-32 px-2 py-1 bg-zinc-700 rounded text-sm"
                  min="1" max="999"
                />
                <input
                  type="number" placeholder="페어 짝수 (옵션, 예: 2)"
                  value={addPairInput}
                  onChange={e => setAddPairInput(e.target.value)}
                  className="w-40 px-2 py-1 bg-zinc-700 rounded text-sm"
                  min="2" max="998" step="2"
                />
                <button
                  onClick={() => addBay(addBayInput, addPairInput)}
                  disabled={!addBayInput}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm disabled:opacity-50"
                >
                  추가
                </button>
                <span className="text-[10px] text-zinc-500">
                  ※ 페어 비우면 단독, 채우면 페어 (홀수 → 짝수 짝꿍)
                </span>
              </div>

              {/* 누락 베이 자동 제안 */}
              {(() => {
                const missing = detectMissingBays(matrix);
                if (missing.length === 0) return null;
                return (
                  <div className="bg-amber-900/30 border border-amber-700/50 rounded p-3">
                    <div className="text-xs text-amber-300 font-bold mb-1">⚠ 누락 의심 베이 (베이 번호 패턴 기반)</div>
                    <div className="flex flex-wrap gap-1">
                      {missing.map(s => (
                        <button
                          key={s.bayNum}
                          onClick={() => addBay(s.bayNum, null)}
                          className="px-2 py-0.5 bg-amber-800/40 hover:bg-amber-700 rounded text-xs"
                          title={s.reason}
                        >
                          BAY {s.bayNum} +
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-amber-400/70 mt-1">클릭하면 단독 베이로 추가됩니다. 페어가 필요하면 위 폼 사용.</div>
                  </div>
                );
              })()}

              {bayList.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  EDI 데이터가 없습니다. 위에서 베이를 직접 추가하거나 PDF 업로드 후 진행하세요.
                </div>
              )}
              {bayList.map(bay => {
                const e = matrix.byBay[bay];
                const needsReview = !e.rowCount || e.rowCount < 5 || (!e.deckTiers?.length && !e.holdTiers?.length);
                const isEst = e.isEstimated;
                return (
                  <div key={bay} className={`border ${isEst ? 'border-zinc-700 bg-zinc-900/40 opacity-70' : needsReview ? 'border-amber-600 bg-zinc-800' : 'border-zinc-700 bg-zinc-800'} rounded p-3`}>
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      <b className="text-base">BAY {bay}</b>
                      {e.pairEven && <span className="text-zinc-400">({e.pairEven}) 페어</span>}
                      {isEst && <span className="text-[10px] px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">⚠ 추정 (EDI/PDF 없음)</span>}
                      {!isEst && <span className="text-[10px] px-2 py-0.5 bg-zinc-700 rounded">{e.source || '?'}</span>}
                      <label className="ml-auto flex items-center gap-1">
                        rowCount:
                        <input type="number" value={e.rowCount || ''} onChange={ev => updateBay(bay, 'rowCount', parseInt(ev.target.value) || 0)}
                               className="w-14 px-2 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={!!e.hasZero} onChange={ev => updateBay(bay, 'hasZero', ev.target.checked)} />
                        00포함
                      </label>
                      <button
                        onClick={() => deleteBay(bay)}
                        className="px-2 py-0.5 bg-red-900/50 hover:bg-red-700 rounded text-xs"
                        title="이 베이 삭제"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Deck */}
                      <div className="bg-blue-950/20 rounded p-2">
                        <div className="text-blue-400 font-bold mb-1 flex items-center gap-2">
                          <span>Deck Tier ({e.deckTiers?.length || 0})</span>
                          <TierAddInline onAdd={(v) => addTier(bay, 'deck', v)} placeholder="예: 90" />
                        </div>
                        {(e.deckTiers || []).map((t, idx) => (
                          <div key={`d-${bay}-${idx}`} className="flex items-center gap-1 mb-0.5">
                            <span className="text-zinc-400">D</span>
                            <input type="number" value={t}
                                   onChange={ev => updateTier(bay, 'deck', idx, ev.target.value)}
                                   className="w-12 px-1 py-0.5 bg-zinc-700 rounded text-center font-mono" min="1" max="99" />
                            <span className="text-zinc-500">cells</span>
                            <input type="number" value={e.deckCells?.[idx] || 0}
                                   onChange={ev => updateCells(bay, 'deck', idx, ev.target.value)}
                                   className="w-12 px-1 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                            <button onClick={() => deleteTier(bay, 'deck', idx)}
                                    className="ml-auto w-5 h-5 bg-red-900/50 hover:bg-red-700 rounded text-[10px]"
                                    title="이 tier 삭제">×</button>
                          </div>
                        ))}
                        {(!e.deckTiers || e.deckTiers.length === 0) && (
                          <div className="text-zinc-500 italic text-[11px]">없음 — 위 [+ 추가] 사용</div>
                        )}
                      </div>
                      {/* Hold */}
                      <div className="bg-green-950/20 rounded p-2">
                        <div className="text-green-400 font-bold mb-1 flex items-center gap-2">
                          <span>Hold Tier ({e.holdTiers?.length || 0})</span>
                          <TierAddInline onAdd={(v) => addTier(bay, 'hold', v)} placeholder="예: 6" />
                        </div>
                        {(e.holdTiers || []).map((t, idx) => (
                          <div key={`h-${bay}-${idx}`} className="flex items-center gap-1 mb-0.5">
                            <span className="text-zinc-400">H</span>
                            <input type="number" value={t}
                                   onChange={ev => updateTier(bay, 'hold', idx, ev.target.value)}
                                   className="w-12 px-1 py-0.5 bg-zinc-700 rounded text-center font-mono" min="1" max="99" />
                            <span className="text-zinc-500">cells</span>
                            <input type="number" value={e.holdCells?.[idx] || 0}
                                   onChange={ev => updateCells(bay, 'hold', idx, ev.target.value)}
                                   className="w-12 px-1 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                            <button onClick={() => deleteTier(bay, 'hold', idx)}
                                    className="ml-auto w-5 h-5 bg-red-900/50 hover:bg-red-700 rounded text-[10px]"
                                    title="이 tier 삭제">×</button>
                          </div>
                        ))}
                        {(!e.holdTiers || e.holdTiers.length === 0) && (
                          <div className="text-zinc-500 italic text-[11px]">없음 — 위 [+ 추가] 사용</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {done && (
            <div className="text-center py-12">
              <div className="text-2xl mb-3">{savingMsg}</div>
              <div className="text-sm text-zinc-400">이제 카고플랜에서 이 선박이 정상 표시됩니다.</div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-zinc-700 flex justify-end gap-2">
          {!done ? (
            <>
              <button onClick={onClose} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">취소</button>
              <button onClick={handleSave} disabled={!shipMeta.code || bayList.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold disabled:opacity-50">
                💾 베이사전 저장 ({shipMeta.code || '?'})
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm">완료</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Tier 추가용 inline mini-입력
function TierAddInline({ onAdd, placeholder }) {
  const [v, setV] = useState('');
  const submit = () => {
    if (!v) return;
    onAdd(v);
    setV('');
  };
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <input
        type="number"
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder={placeholder || 'tier'}
        className="w-14 px-1 py-0.5 bg-zinc-700 rounded text-center text-[11px]"
        min="1" max="99"
      />
      <button
        onClick={submit}
        disabled={!v}
        className="px-1.5 py-0.5 bg-emerald-700/60 hover:bg-emerald-600 rounded text-[10px] disabled:opacity-30"
        title="tier 추가"
      >+ 추가</button>
    </span>
  );
}
