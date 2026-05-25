// src/components/ShipMatrixBuilderModal.jsx — M6.93.1
// 신규 선박 베이 매트릭스 빌더
//   1) 현재 항차 EDI 자동 분석
//   2) 베이사전 매칭/보강
//   3) 부족분 시 PDF 업로드 → 파싱 보강
//   4) 사용자 폼 검증/수정
//   5) userBayDict에 저장 → 즉시 카고플랜 사용 가능

import React, { useState, useEffect, useRef } from 'react';
import {
  buildMatrixFromEdi,
  augmentMatrixFromBayDict,
  augmentMatrixFromPdf,
  matrixToBayDictEntry,
} from '../shipMatrixBuilder.js';
import { parsePdfStowage } from '../pdfBayParser.js';
import { addToUserBayDict } from '../data/userBayDict.js';

export default function ShipMatrixBuilderModal({ voyage, containers, onClose, onSaved }) {
  const [step, setStep] = useState('analyze'); // analyze | form | done
  const [matrix, setMatrix] = useState(null);
  const [shipMeta, setShipMeta] = useState({
    code: voyage?.code || voyage?.info?.code || '',
    name: voyage?.info?.vesselName || voyage?.info?.name || '',
    imo: voyage?.info?.imo || '',
  });
  const [pdfStatus, setPdfStatus] = useState('idle'); // idle | parsing | done | error
  const [pdfError, setPdfError] = useState('');
  const fileInputRef = useRef(null);
  const [savingMsg, setSavingMsg] = useState('');

  // 초기 분석 (EDI + 베이사전)
  useEffect(() => {
    if (!containers || containers.length === 0) {
      setMatrix({ byBay: {}, _empty: true });
      return;
    }
    const m1 = buildMatrixFromEdi(containers);
    const m2 = augmentMatrixFromBayDict(m1, shipMeta.imo, shipMeta.code);
    setMatrix(m2);
  }, [containers, shipMeta.imo, shipMeta.code]);

  const handlePdfUpload = async (file) => {
    if (!file) return;
    setPdfStatus('parsing'); setPdfError('');
    try {
      const result = await parsePdfStowage(file);
      // 선박명/항차 자동 채움 (비어 있으면)
      setShipMeta(m => ({
        ...m,
        name: m.name || result.shipName || '',
      }));
      const merged = augmentMatrixFromPdf({ ...matrix }, result);
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
      alert('선박 코드(CASP)를 입력하세요');
      return;
    }
    const entry = matrixToBayDictEntry(matrix, shipMeta.code, shipMeta.name, shipMeta.imo);
    const ok = addToUserBayDict(entry);
    if (ok) {
      setSavingMsg(`✅ ${shipMeta.code} 베이사전 저장 완료 (${entry.bayDef.recordCount} 베이)`);
      setStep('done');
      if (onSaved) onSaved(entry);
    } else {
      alert('저장 실패 — localStorage 용량 확인 필요');
    }
  };

  if (!matrix) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-zinc-900 p-6 rounded-lg text-white">
          <div>매트릭스 분석 중...</div>
        </div>
      </div>
    );
  }

  const bayList = Object.keys(matrix.byBay).sort();
  const totalBays = bayList.length;
  const baysNeedReview = bayList.filter(b => {
    const e = matrix.byBay[b];
    return !e.rowCount || e.rowCount < 5 || (!e.deckTiers?.length && !e.holdTiers?.length);
  }).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-auto py-8">
      <div className="bg-zinc-900 rounded-lg text-white w-full max-w-5xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* 헤더 */}
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">🚢 신규 선박 베이 매트릭스 빌더</h2>
            <div className="text-xs text-zinc-400 mt-1">
              EDI ({matrix._empty ? '없음' : '✓'}) → 베이사전 ({matrix.bayDictUsed ? '✓' : '✗'}) → PDF ({matrix.pdfUsed ? '✓' : '미사용'})
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl px-2">×</button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 선박 정보 */}
          <div className="bg-zinc-800 p-3 rounded mb-4">
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                CASP 코드 *
                <input value={shipMeta.code} onChange={e => setShipMeta(m => ({ ...m, code: e.target.value.toUpperCase() }))}
                       className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded text-sm" placeholder="예: SWAT" />
              </label>
              <label className="text-sm">
                선박명
                <input value={shipMeta.name} onChange={e => setShipMeta(m => ({ ...m, name: e.target.value }))}
                       className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded text-sm" placeholder="예: SAWASDEE ATLANTIC" />
              </label>
              <label className="text-sm">
                IMO (옵션)
                <input value={shipMeta.imo} onChange={e => setShipMeta(m => ({ ...m, imo: e.target.value }))}
                       className="w-full mt-1 px-2 py-1 bg-zinc-700 rounded text-sm" placeholder="9123456" />
              </label>
            </div>
          </div>

          {/* 상태 요약 */}
          <div className="bg-zinc-800 p-3 rounded mb-4 flex justify-between items-center">
            <div className="text-sm">
              총 베이: <b>{totalBays}</b>
              {baysNeedReview > 0 && <span className="ml-3 text-amber-400">⚠ 검토 필요: {baysNeedReview}</span>}
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".pdf" hidden
                     onChange={e => handlePdfUpload(e.target.files?.[0])} />
              <button onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm">
                📄 PDF 업로드 (보강)
              </button>
              {pdfStatus === 'parsing' && <span className="text-xs text-zinc-400 self-center">파싱 중...</span>}
              {pdfStatus === 'error' && <span className="text-xs text-red-400 self-center">{pdfError}</span>}
            </div>
          </div>

          {/* 베이별 검증 폼 */}
          {step !== 'done' && (
            <div className="space-y-2">
              {bayList.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  EDI 데이터 없음. 자료 탭에서 EDI를 먼저 업로드하거나, 위에서 PDF를 업로드하세요.
                </div>
              )}
              {bayList.map(bay => {
                const e = matrix.byBay[bay];
                const needsReview = !e.rowCount || e.rowCount < 5 || (!e.deckTiers?.length && !e.holdTiers?.length);
                return (
                  <div key={bay} className={`border ${needsReview ? 'border-amber-600' : 'border-zinc-700'} rounded p-3 bg-zinc-800`}>
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      <b className="text-base">BAY {bay}</b>
                      {e.pairEven && <span className="text-zinc-400">({e.pairEven}) 페어</span>}
                      <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded">{e.source || '?'}</span>
                      <label className="ml-auto flex items-center gap-1">
                        rowCount:
                        <input type="number" value={e.rowCount || ''} onChange={ev => updateBay(bay, 'rowCount', parseInt(ev.target.value) || 0)}
                               className="w-14 px-2 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={!!e.hasZero} onChange={ev => updateBay(bay, 'hasZero', ev.target.checked)} />
                        00포함
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Deck */}
                      <div>
                        <div className="text-blue-400 font-bold mb-1">Deck Tier ({e.deckTiers?.length || 0}) / cells</div>
                        {(e.deckTiers || []).map((t, idx) => (
                          <div key={t} className="flex items-center gap-2 mb-0.5">
                            <span className="w-10 text-zinc-400">D {t}</span>
                            <span className="text-zinc-500">→</span>
                            <input type="number" value={e.deckCells?.[idx] || 0}
                                   onChange={ev => updateCells(bay, 'deck', idx, ev.target.value)}
                                   className="w-14 px-1 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                          </div>
                        ))}
                        {(!e.deckTiers || e.deckTiers.length === 0) && (
                          <div className="text-zinc-500">없음</div>
                        )}
                      </div>
                      {/* Hold */}
                      <div>
                        <div className="text-green-400 font-bold mb-1">Hold Tier ({e.holdTiers?.length || 0}) / cells</div>
                        {(e.holdTiers || []).map((t, idx) => (
                          <div key={t} className="flex items-center gap-2 mb-0.5">
                            <span className="w-10 text-zinc-400">H {String(t).padStart(2, '0')}</span>
                            <span className="text-zinc-500">→</span>
                            <input type="number" value={e.holdCells?.[idx] || 0}
                                   onChange={ev => updateCells(bay, 'hold', idx, ev.target.value)}
                                   className="w-14 px-1 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                          </div>
                        ))}
                        {(!e.holdTiers || e.holdTiers.length === 0) && (
                          <div className="text-zinc-500">없음</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-12">
              <div className="text-2xl mb-3">{savingMsg}</div>
              <div className="text-sm text-zinc-400">이제 카고플랜에서 이 선박이 정상 표시됩니다.</div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-zinc-700 flex justify-end gap-2">
          {step !== 'done' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">취소</button>
              <button onClick={handleSave} disabled={!shipMeta.code || bayList.length === 0}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50">
                💾 베이사전 저장
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
