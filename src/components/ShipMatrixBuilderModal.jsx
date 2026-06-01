// src/components/ShipMatrixBuilderModal.jsx — M6.94.0
// 베이사전 빌더 (사용자 원칙):
//   - 좌측: 베이 편집 (선박 메타 + 베이별 tier/cells/padding)
//   - 우측: 선택한 베이 시뮬레이션 (= 베이플랜, 빈 카고플랜 박스)
//   - 사용자 저장 후 AI 절대 수정 금지 (M6.94.0)
//   - 베이 복사 기능 (같은 사이즈 베이 일괄 적용)

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
import { addToUserBayDict, lookupUserBayDict, loadUserBayDict } from '../data/userBayDict.js';
import {
  fbSubscribeMatrixEditors, fbSetMatrixEditors, fbSaveShipBayDict,
  fbBatchSaveShipBayDict,
} from '../firebase.js';
import { _storage, SK } from '../utils.js';
// M6.94.0: 빈 카고플랜 박스 시각 미리보기 (베이플랜)
import { BayBoxV2, CARGO_V2_CSS } from './PrintableCargoPlanV2.jsx';
import { buildEmptyBayRenderData } from '../cargoPlanCore.js';

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

  // ── M6.94.20: 매트릭스 권한자 ──────────────────────────────────────────
  //   현재 검수자(activeInspector)가 Firebase 권한자 명단에 있어야 저장/명단수정 가능.
  const currentInspector = useMemo(
    () => String(_storage.get(SK.activeInspector) || '').trim(),
    []
  );
  const [editors, setEditors] = useState(null);     // null = 로딩중
  const [showEditorMgr, setShowEditorMgr] = useState(false);
  const [editorInput, setEditorInput] = useState('');
  const [editorMsg, setEditorMsg] = useState('');
  const [bulkSyncMsg, setBulkSyncMsg] = useState('');
  const [bulkSyncing, setBulkSyncing] = useState(false);

  useEffect(() => {
    const unsub = fbSubscribeMatrixEditors(list => setEditors(list || []));
    return () => { try { unsub && unsub(); } catch { /* noop */ } };
  }, []);

  // 권한 판정: 명단 로딩 전(null)에는 false로 취급 (안전).
  const canEdit = useMemo(() => {
    if (!Array.isArray(editors)) return false;
    return !!currentInspector && editors.includes(currentInspector);
  }, [editors, currentInspector]);

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

  // M6.94.0: padding/alignment 업데이트
  const updateAlignPad = (bay, field, value) => {
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      const entry = { ...cp.byBay[bay] };
      entry[field] = value;
      cp.byBay[bay] = entry;
      return cp;
    });
  };

  // M6.94.0: 베이 구조 복사 (한 베이 → 선택한 여러 베이)
  //   소스 베이의 deckTiers/holdTiers/deckCells/holdCells/rowCount/hasZero/padding/align 복사.
  //   pairEven은 복사 안 함 (각 베이 고유). bay/bayNum도 안 바뀜.
  const copyBayStructure = (sourceBay, targetBays) => {
    if (!matrix?.byBay[sourceBay]) return;
    const src = matrix.byBay[sourceBay];
    const copyFields = [
      'rowCount', 'hasZero',
      'deckTiers', 'holdTiers', 'deckCells', 'holdCells',
      'deckAlign', 'deckPadLeft', 'deckPadRight',
      'holdAlign', 'holdPadLeft', 'holdPadRight',
    ];
    setMatrix(m => {
      const cp = { ...m, byBay: { ...m.byBay } };
      for (const tgt of targetBays) {
        if (tgt === sourceBay) continue;
        if (!cp.byBay[tgt]) continue;
        const entry = { ...cp.byBay[tgt] };
        for (const f of copyFields) {
          if (Array.isArray(src[f])) entry[f] = [...src[f]];
          else entry[f] = src[f];
        }
        cp.byBay[tgt] = entry;
      }
      return cp;
    });
  };

  // M6.94.0: 선택한 베이 (우측 시뮬에 표시)
  const [selectedBay, setSelectedBay] = useState(null);
  // M6.94.0: 베이 복사 모달 상태
  const [copyMode, setCopyMode] = useState(null); // null | { sourceBay, selectedTargets: Set }

  const handleSave = () => {
    if (!canEdit) {
      alert('매트릭스 저장 권한이 없습니다. 권한자에게 문의하세요.');
      return;
    }
    if (!shipMeta.code) {
      alert('CASP 코드를 입력하세요 (자동 추론된 값 사용 권장)');
      return;
    }
    // M6.94.5: callsign을 인자로 직접 전달 (이전엔 사후 보강 → 단일 책임 어김)
    const entry = matrixToBayDictEntry(
      matrix,
      shipMeta.code,
      shipMeta.name,
      shipMeta.imo,
      shipMeta.callsign || ''
    );
    // M6.94.20: user 소스 + 편집자 + 시각 마킹 (Firebase 보호/충돌 판정 기준)
    const stamp = Date.now();
    entry.source = 'user';
    entry._userOwned = true;
    entry.editorName = currentInspector;
    entry.updatedAt = stamp;
    if (entry.bayDef) {
      entry.bayDef.source = 'user';
      entry.bayDef._userOwned = true;
    }
    const ok = addToUserBayDict(entry);
    if (ok) {
      setSavingMsg(`✅ ${shipMeta.code} (${shipMeta.name}) 베이사전 저장 완료 — ${entry.bayDef.recordCount}개 베이`);
      setDone(true);
      // M6.94.20: Firebase 업로드 (다른 기기 수신용) — fire-and-forget
      fbSaveShipBayDict(entry.code, {
        code: entry.code,
        name: entry.name,
        callsign: entry.callsign || '',
        imo: entry.imo || '',
        source: 'user',
        _userOwned: true,
        bayDef: entry.bayDef,
        editorName: currentInspector,
        updatedAt: stamp,
        _inspector: currentInspector,
      }).then(r => {
        if (r) setSavingMsg(s => s + ' · ☁ 동기화됨 (다른 기기에서도 보임)');
        else setSavingMsg(s => s + ' · ⚠ 동기화 실패 (이 기기에는 저장됨)');
      }).catch(() => {
        setSavingMsg(s => s + ' · ⚠ 동기화 실패 (이 기기에는 저장됨)');
      });
      if (onSaved) onSaved(entry);
    } else {
      alert('저장 실패 — localStorage 용량 확인 필요');
    }
  };

  // M6.94.22: 일괄 동기화 — 이 기기 localStorage의 user 매트릭스 전부를 Firebase로 업로드.
  //   동기화 기능(M6.94.20) 이전에 만든 기존 매트릭스를 폰에서도 보이게 하기 위함.
  //   권한자만 실행 가능. bayDef 있는 것만 대상(빈 껍데기 제외).
  const handleBulkSync = async () => {
    if (!canEdit) {
      setBulkSyncMsg('권한이 없습니다.');
      return;
    }
    const dict = loadUserBayDict() || {};
    const stamp = Date.now();
    const payload = {};
    let skipped = 0;
    for (const code of Object.keys(dict)) {
      const e = dict[code];
      if (!e || !e.bayDef) { skipped++; continue; }  // 빈 껍데기 제외
      payload[code] = {
        code: e.code || code,
        name: e.name || '',
        callsign: e.callsign || '',
        imo: e.imo || '',
        source: 'user',
        _userOwned: true,
        bayDef: { ...e.bayDef, source: 'user', _userOwned: true },
        editorName: currentInspector,
        // 기존 updatedAt 보존(있으면) → 다기기 충돌 시 최신 판정 정확.
        updatedAt: Number(e.updatedAt) || stamp,
        _inspector: currentInspector,
      };
    }
    const total = Object.keys(payload).length;
    if (total === 0) {
      setBulkSyncMsg(`동기화할 매트릭스가 없습니다${skipped ? ` (빈 항목 ${skipped}개 제외)` : ''}.`);
      return;
    }
    if (!confirm(`이 기기의 매트릭스 ${total}개를 전체 동기화할까요?\n(다른 기기에서도 보이게 됩니다)`)) return;
    setBulkSyncing(true);
    setBulkSyncMsg(`동기화 중... (0/${total})`);
    try {
      const res = await fbBatchSaveShipBayDict(payload);
      setBulkSyncMsg(
        `✅ 동기화 완료 — 성공 ${res.saved}개${res.failed ? `, 실패 ${res.failed}개` : ''}` +
        `${skipped ? ` (빈 항목 ${skipped}개 제외)` : ''}. 폰에서 새로고침하면 보입니다.`
      );
    } catch (err) {
      console.error('[handleBulkSync] 실패', err);
      setBulkSyncMsg('⚠ 동기화 실패 — 네트워크를 확인하세요.');
    } finally {
      setBulkSyncing(false);
    }
  };

  // M6.94.20: 권한자 추가
  const handleAddEditor = async () => {
    const name = String(editorInput || '').trim();
    if (!name) return;
    if (!Array.isArray(editors)) return;
    if (editors.includes(name)) {
      setEditorMsg(`이미 명단에 있습니다: ${name}`);
      return;
    }
    setEditorMsg('저장 중...');
    const res = await fbSetMatrixEditors(currentInspector, [...editors, name]);
    if (res.ok) {
      setEditorInput('');
      setEditorMsg(`✅ 추가됨: ${name}`);
    } else if (res.reason === 'not_authorized') {
      setEditorMsg('권한이 없어 명단을 수정할 수 없습니다.');
    } else {
      setEditorMsg('저장 실패 — 네트워크를 확인하세요.');
    }
  };

  // M6.94.20: 권한자 삭제
  const handleRemoveEditor = async (name) => {
    if (!Array.isArray(editors)) return;
    if (editors.length <= 1) {
      setEditorMsg('마지막 권한자는 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`권한자에서 "${name}"을(를) 삭제할까요?`)) return;
    setEditorMsg('저장 중...');
    const res = await fbSetMatrixEditors(
      currentInspector,
      editors.filter(e => e !== name)
    );
    if (res.ok) {
      setEditorMsg(`삭제됨: ${name}`);
    } else if (res.reason === 'not_authorized') {
      setEditorMsg('권한이 없어 명단을 수정할 수 없습니다.');
    } else {
      setEditorMsg('저장 실패 — 네트워크를 확인하세요.');
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
      <div className="bg-zinc-900 rounded-lg text-white w-full max-w-7xl mx-2 flex flex-col" style={{ maxHeight: '95vh' }}>
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
          {/* === 자동 추출 선박 정보 (전체 폭) === */}
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

          {/* === 베이별 검증 폼 — 좌우 분할: 좌측 편집 + 우측 베이플랜 시뮬 === */}
          {/* M6.94.4: 모바일 반응형 — 좁은 폭(폰)에서는 세로 분할 (좌측 편집 위, 우측 시뮬 아래).
              이전: flex gap-3 (무조건 가로) → 모바일에서 우측(420px 고정)이 화면 다 차지 → 좌측 안 보임. */}
          {!done && (
            <div className="flex flex-col lg:flex-row gap-3" style={{ minHeight: '60vh' }}>
              {/* === 좌측: 베이 편집 영역 === */}
              <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
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
                const isSelected = selectedBay === bay;
                return (
                  <div key={bay}
                    className={`border ${isSelected ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500' : isEst ? 'border-zinc-700 bg-zinc-900/40 opacity-70' : needsReview ? 'border-amber-600 bg-zinc-800' : 'border-zinc-700 bg-zinc-800'} rounded p-3 transition-colors`}>
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      <button
                        onClick={() => setSelectedBay(isSelected ? null : bay)}
                        className={`px-2 py-1 rounded font-bold ${isSelected ? 'bg-cyan-500 text-white' : 'bg-zinc-700 hover:bg-cyan-700'}`}
                        title="우측 미리보기 표시">
                        👁 BAY {bay}
                      </button>
                      {isSelected && <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600 rounded font-bold">미리보기 →</span>}
                      {e.pairEven && <span className="text-zinc-400">({e.pairEven}) 페어</span>}
                      {isEst && <span className="text-[10px] px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">⚠ 추정 (EDI/PDF 없음)</span>}
                      {!isEst && <span className="text-[10px] px-2 py-0.5 bg-zinc-700 rounded">{e.source || '?'}</span>}
                      <label className="ml-auto flex items-center gap-1">
                        rowCount:
                        <input type="number" value={e.rowCount || ''} onChange={ev => updateBay(bay, 'rowCount', parseInt(ev.target.value) || 0)}
                               className="w-14 px-2 py-0.5 bg-zinc-700 rounded text-center" min="0" max="20" />
                      </label>
                      <label className="flex items-center gap-1" title="해치커버 수 (deck/hold 경계 굵은선 등분). 0=해치 없음(상시 개방). 홀드 없는 베이는 0.">
                        해치:
                        <select value={(e.hatchCount ?? (e.holdTiers && e.holdTiers.length > 0 ? 1 : 0))} onChange={ev => updateBay(bay, 'hatchCount', parseInt(ev.target.value))}
                                className="px-1 py-0.5 bg-zinc-700 rounded text-center">
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
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
              </div>{/* /좌측 편집 영역 */}

              {/* === 우측: 베이플랜 시뮬레이션 (선택한 베이의 빈 카고플랜 박스) === */}
              {/* M6.94.4: 모바일은 풀폭(w-full), 데스크탑(lg)만 420px 고정. */}
              <div className="w-full lg:w-[420px] lg:flex-shrink-0">
                <style>{CARGO_V2_CSS}</style>
                <div className="sticky top-0 bg-zinc-800 border border-zinc-600 rounded p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="text-sm font-bold text-cyan-300 mb-2 flex items-center justify-between">
                    <span>🎯 베이플랜 시뮬레이션</span>
                    {selectedBay && (
                      <span className="text-xs bg-cyan-900 px-2 py-0.5 rounded">BAY {selectedBay}</span>
                    )}
                  </div>
                  {!selectedBay ? (
                    <div className="text-center text-zinc-500 text-sm py-12 italic">
                      ⬅ 좌측 베이를 클릭하면<br/>여기에 미리보기가 나옵니다
                    </div>
                  ) : (() => {
                    const e = matrix.byBay[selectedBay];
                    if (!e) return <div className="text-red-400">베이 없음</div>;
                    const bayKey = e.pairEven
                      ? `(${e.pairEven})${String(parseInt(selectedBay)).padStart(2, '0')}`
                      : String(parseInt(selectedBay)).padStart(2, '0');
                    const data = buildEmptyBayRenderData(e, bayKey, !!e.pairEven);
                    return (
                      <>
                        {/* 카고플랜 V2 스타일 박스 (BayBoxV2 재사용) */}
                        {/* M6.94.2 fix: cpv2-bay-box는 flex:1 1 0 기반이라 부모가 flex container이어야 그려짐.
                            매트릭스 빌더 시뮬은 일반 div 안이라 height가 0이 되어 빈 박스만 보이던 버그.
                            해결: 부모를 flex container로 + cpv2-bay-box에 명시적 height. */}
                        <div className="bg-white rounded p-2 mb-3" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
                          <div className="cpv2-bay-box" style={{ minWidth: '380px', height: '300px', flex: 'none' }}>
                            <BayBoxV2 data={data} count={null} colorMap={{}} />
                          </div>
                        </div>

                        {/* === Padding/Alignment 컨트롤 === */}
                        <div className="bg-zinc-900/50 rounded p-2 mb-2">
                          <div className="text-xs text-zinc-300 font-bold mb-2">📐 데크-홀드 정렬</div>
                          {/* Hold align */}
                          <div className="mb-2">
                            <div className="text-[10px] text-zinc-400 mb-1">Hold 정렬</div>
                            <div className="flex gap-1">
                              {['left', 'center', 'right'].map(a => (
                                <button key={a}
                                  onClick={() => updateAlignPad(selectedBay, 'holdAlign', a)}
                                  className={`flex-1 px-2 py-1 text-xs rounded ${e.holdAlign === a || (!e.holdAlign && a === 'center') ? 'bg-cyan-600 font-bold' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                  {a === 'left' ? '← 좌' : a === 'center' ? '∙ 가운데' : '우 →'}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Hold padding micro — M6.94.3: 0.5 단위 미세 조정 (사용자 요청) */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex items-center gap-1">
                              <span className="text-zinc-400">왼쪽 +</span>
                              <input type="number" min="0" max="20" step="0.5" value={e.holdPadLeft || 0}
                                onChange={ev => updateAlignPad(selectedBay, 'holdPadLeft', parseFloat(ev.target.value) || 0)}
                                className="w-14 px-1 py-0.5 bg-zinc-700 rounded text-center" />
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-zinc-400">오른쪽 +</span>
                              <input type="number" min="0" max="20" step="0.5" value={e.holdPadRight || 0}
                                onChange={ev => updateAlignPad(selectedBay, 'holdPadRight', parseFloat(ev.target.value) || 0)}
                                className="w-14 px-1 py-0.5 bg-zinc-700 rounded text-center" />
                            </label>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">cells 단위 미세 조정 (0.5 가능). 0이면 위 정렬 자동.</div>
                        </div>

                        {/* === 베이 복사 === */}
                        <div className="bg-amber-900/20 border border-amber-700/50 rounded p-2">
                          <div className="text-xs text-amber-300 font-bold mb-1">📋 베이 구조 복사</div>
                          <div className="text-[10px] text-zinc-400 mb-2">
                            이 베이 (BAY {selectedBay})의 tier/cells/정렬을 다른 베이에 복사
                          </div>
                          <button
                            onClick={() => setCopyMode({ sourceBay: selectedBay, selectedTargets: new Set() })}
                            className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 rounded text-xs font-bold">
                            📋 다른 베이에 복사하기
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>{/* /우측 시뮬 */}
            </div>
          )}

          {/* === 베이 복사 모달 (대상 베이 선택) === */}
          {copyMode && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                 onClick={() => setCopyMode(null)}>
              <div className="bg-zinc-900 rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto"
                   onClick={e => e.stopPropagation()}>
                <div className="text-base font-bold mb-1">📋 BAY {copyMode.sourceBay} 구조를 복사할 대상 베이 선택</div>
                <div className="text-xs text-zinc-400 mb-3">tier/cells/정렬/padding 모두 복사. 페어 짝수는 안 바뀜.</div>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {Object.keys(matrix.byBay).sort().map(bay => {
                    if (bay === copyMode.sourceBay) return null;
                    const checked = copyMode.selectedTargets.has(bay);
                    return (
                      <button key={bay}
                        onClick={() => {
                          const next = new Set(copyMode.selectedTargets);
                          if (checked) next.delete(bay); else next.add(bay);
                          setCopyMode({ ...copyMode, selectedTargets: next });
                        }}
                        className={`p-2 rounded text-sm font-bold ${checked ? 'bg-emerald-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                        BAY {bay}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center">
                  <button onClick={() => setCopyMode({ ...copyMode, selectedTargets: new Set(Object.keys(matrix.byBay).filter(b => b !== copyMode.sourceBay)) })}
                    className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded">전체 선택</button>
                  <div className="flex gap-2">
                    <button onClick={() => setCopyMode(null)}
                      className="px-4 py-2 bg-zinc-700 rounded">취소</button>
                    <button
                      disabled={copyMode.selectedTargets.size === 0}
                      onClick={() => {
                        copyBayStructure(copyMode.sourceBay, [...copyMode.selectedTargets]);
                        setCopyMode(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold disabled:opacity-30">
                      {copyMode.selectedTargets.size}개 베이에 복사
                    </button>
                  </div>
                </div>
              </div>
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
        <div className="p-4 border-t border-zinc-700 flex justify-between items-center gap-2 flex-wrap">
          {/* 좌측: 권한자만 명단 관리 버튼 */}
          <div className="flex items-center gap-2">
            {canEdit && !done && (
              <button onClick={() => { setShowEditorMgr(v => !v); setEditorMsg(''); }}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
                👤 권한자 관리{Array.isArray(editors) ? ` (${editors.length})` : ''}
              </button>
            )}
            {canEdit && !done && (
              <button onClick={handleBulkSync} disabled={bulkSyncing}
                      className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded text-xs disabled:opacity-50">
                {bulkSyncing ? '동기화 중…' : '☁ 전체 동기화'}
              </button>
            )}
            {!canEdit && editors !== null && (
              <span className="text-xs text-amber-400">
                🔒 저장 권한 없음{currentInspector ? ` — 현재: ${currentInspector}` : ' — 검수자 미선택'}
              </span>
            )}
            {canEdit && bulkSyncMsg && (
              <span className="text-[11px] text-indigo-300">{bulkSyncMsg}</span>
            )}
          </div>
          {/* 우측: 취소/저장 */}
          <div className="flex justify-end gap-2">
            {!done ? (
              <>
                <button onClick={onClose} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">취소</button>
                {canEdit && (
                  <button onClick={handleSave} disabled={!shipMeta.code || bayList.length === 0}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold disabled:opacity-50">
                    💾 베이사전 저장 ({shipMeta.code || '?'})
                  </button>
                )}
              </>
            ) : (
              <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm">완료</button>
            )}
          </div>
        </div>

        {/* M6.94.20: 권한자 관리 패널 (권한자만) */}
        {canEdit && showEditorMgr && (
          <div className="px-4 pb-4 border-t border-zinc-700 pt-3">
            <div className="text-sm font-bold text-white mb-2">👤 매트릭스 권한자 명단</div>
            <div className="text-[11px] text-zinc-400 mb-2">
              명단에 있는 검수자만 매트릭스를 저장하고 이 명단을 수정할 수 있습니다. 일반 사용자는 자동으로 받아보기만 합니다.
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {Array.isArray(editors) && editors.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-white">
                  {name}
                  {editors.length > 1 && (
                    <button onClick={() => handleRemoveEditor(name)}
                            className="text-red-400 hover:text-red-300 ml-1">×</button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={editorInput} onChange={e => setEditorInput(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') handleAddEditor(); }}
                     placeholder="검수자 이름 (예: 김성일)"
                     className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm text-white" />
              <button onClick={handleAddEditor}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold">추가</button>
            </div>
            {editorMsg && <div className="text-xs text-zinc-300 mt-2">{editorMsg}</div>}
            <div className="text-[10px] text-amber-400 mt-2">
              ⚠ 이름은 검수자 로그인 이름과 정확히 일치해야 합니다 (공백·철자 주의).
            </div>
          </div>
        )}
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
