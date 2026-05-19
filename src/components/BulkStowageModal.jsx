// M6.42: STOWAGE PDF 일괄 분석/등록
//   여러 PDF를 한 번에 업로드 → Gemini 순차 분석 → 검토 → 일괄 등록
//   진정한 베이사전 라이브러리 구축 (1:1 매칭 부담 제거)
import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { ocrStowagePdf, stowageToBayDictEntry, GEMINI_API_KEY } from '../gemini.js';
import { addToUserBayDict } from '../data/userBayDict.js';
import { _storage, SK } from '../utils.js';

const PROTECTED_CODES = ['NBTD', 'MCSC', 'ATRP', 'S639'];  // 정밀 등록 보호 선박

export default function BulkStowageModal({ open, onClose, onCompleted, inspector }) {
  const [files, setFiles] = useState([]);
  const [analyzed, setAnalyzed] = useState([]);
  const [phase, setPhase] = useState('select');  // select | analyzing | review | saving | done
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [savedResults, setSavedResults] = useState(null);
  const [overwriteMode, setOverwriteMode] = useState(true);  // 이미 등록된 선박 덮어쓰기
  const fileRef = useRef(null);

  if (!open) return null;

  const onSelectFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    const pdfs = selected.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFiles(pdfs);
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setPhase('analyzing');
    setProgress({ done: 0, total: files.length, current: '' });

    const apiKey = _storage.get(SK.geminiKey) || GEMINI_API_KEY;
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ done: i, total: files.length, current: file.name });
      try {
        const data = await ocrStowagePdf(file, apiKey);
        const vname = (data?.vesselName || '').toUpperCase();
        const code = vname.replace(/\s+/g, '').slice(0, 4);
        results.push({
          file,
          data,
          code,
          callsign: data?.callsign || '',
          imo: data?.imo || '',
          bayCount: data?.bays?.length || 0,
          status: 'pending',
          error: null,
        });
      } catch (e) {
        results.push({
          file,
          data: null,
          code: '',
          callsign: '',
          imo: '',
          bayCount: 0,
          status: 'failed',
          error: e.message || String(e),
        });
      }
    }

    setProgress({ done: files.length, total: files.length, current: '' });
    setAnalyzed(results);
    setPhase('review');
  };

  const updateCard = (idx, field, value) => {
    setAnalyzed(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const saveAll = async () => {
    setPhase('saving');
    const { fbSaveShipBayDict, fbUploadStowagePdf } = await import('../firebase.js');
    const results = { saved: 0, skipped: 0, failed: 0, protected: 0, details: [] };

    for (let i = 0; i < analyzed.length; i++) {
      const item = analyzed[i];
      setProgress({ done: i, total: analyzed.length, current: item.file.name });

      if (item.status === 'failed' || !item.data) {
        results.failed++;
        continue;
      }
      const code = (item.code || '').toUpperCase().trim();
      if (!code || code.length < 2) {
        results.failed++;
        results.details.push({ file: item.file.name, error: '코드 누락' });
        continue;
      }
      if (PROTECTED_CODES.includes(code)) {
        results.protected++;
        results.details.push({ file: item.file.name, error: `${code} 보호 선박 (정밀 등록)` });
        continue;
      }

      try {
        const entry = stowageToBayDictEntry(item.data, item.file.name, {
          code, callsign: item.callsign.toUpperCase().trim(), imo: item.imo.trim(),
        });
        entry.bayDef.verified = true;
        entry.bayDef.grade = 'user-verified-stowage';

        // M6.42: PDF Firebase Storage 업로드 — 같은 선박 이전 자동 삭제 (덮어쓰기)
        let pdfMeta = null;
        try {
          pdfMeta = await fbUploadStowagePdf(code, item.file);
        } catch (e) {
          console.warn(`[M6.42] ${code} PDF 업로드 실패:`, e);
        }

        await fbSaveShipBayDict(code, {
          ...entry,
          source: 'stowage-pdf-ai-bulk',
          _inspector: inspector || '',
          pdfUrl: pdfMeta?.url || '',
          pdfPath: pdfMeta?.path || '',
          pdfName: pdfMeta?.name || item.file.name,
          pdfUploadedAt: pdfMeta?.uploadedAt || Date.now(),
        });
        addToUserBayDict(entry);
        results.saved++;
      } catch (e) {
        results.failed++;
        results.details.push({ file: item.file.name, error: e.message || String(e) });
      }
    }

    setProgress({ done: analyzed.length, total: analyzed.length, current: '' });
    setSavedResults(results);
    setPhase('done');
    if (onCompleted) onCompleted(results);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 w-full sm:max-w-3xl sm:rounded-xl border-t-2 sm:border-2 border-purple-700/60 max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-purple-700/40">
          <h2 className="text-base font-black text-purple-200">📚 STOWAGE PDF 일괄 등록</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-2 -mr-2">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Phase: select */}
          {phase === 'select' && (
            <>
              <div className="text-xs text-slate-300 leading-relaxed">
                여러 STOWAGE PDF를 한 번에 등록합니다. <br/>
                Gemini AI가 순차적으로 분석 → 검토 → 일괄 저장.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={onSelectFiles}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5"/>
                PDF 파일 다중 선택
              </button>
              {files.length > 0 && (
                <div className="bg-slate-800/60 rounded p-2.5 text-xs space-y-1">
                  <div className="font-bold text-purple-300">📄 선택된 파일: {files.length}개</div>
                  <ul className="text-slate-400 space-y-0.5 max-h-40 overflow-y-auto">
                    {files.map((f, i) => (
                      <li key={i} className="truncate">• {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)</li>
                    ))}
                  </ul>
                  <div className="text-amber-300 text-[10px] mt-1.5">
                    ⏱ 예상 시간: 약 {Math.ceil(files.length * 8 / 60)}분 (PDF당 약 8초)
                  </div>
                </div>
              )}
              {files.length > 0 && (
                <button
                  onClick={startAnalysis}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                >
                  🚀 분석 시작 ({files.length}개)
                </button>
              )}
            </>
          )}

          {/* Phase: analyzing */}
          {phase === 'analyzing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-3"/>
              <div className="text-purple-200 font-bold text-base mb-1">
                분석 중 {progress.done} / {progress.total}
              </div>
              <div className="text-slate-400 text-xs truncate mb-3">{progress.current}</div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">중단하지 마세요. 백그라운드 처리 중...</div>
            </div>
          )}

          {/* Phase: review */}
          {phase === 'review' && (
            <>
              <div className="text-xs text-purple-200 font-bold">
                ✅ 분석 완료: {analyzed.filter(a => a.status !== 'failed').length}개 성공 /
                {' '}{analyzed.filter(a => a.status === 'failed').length}개 실패
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                각 카드의 코드/콜사인/IMO를 확인하세요. 코드는 vessel name 앞 4글자로 자동 채워졌습니다.
                필요하면 정확한 코드(예: XINT → XTPG)로 수정.
              </div>
              <div className="space-y-2">
                {analyzed.map((item, i) => (
                  <div
                    key={i}
                    className={`rounded p-2.5 border ${
                      item.status === 'failed'
                        ? 'bg-red-950/40 border-red-700/50'
                        : 'bg-slate-800/60 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {item.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0"/>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 truncate">{item.file.name}</div>
                        {item.error && (
                          <div className="text-[10px] text-red-300">{item.error}</div>
                        )}
                      </div>
                    </div>
                    {item.status !== 'failed' && (
                      <>
                        <div className="text-[10px] text-slate-400 mb-1.5">
                          선박명: <span className="text-cyan-300">{item.data?.vesselName || '?'}</span>
                          {' · '}베이: <span className="text-cyan-300">{item.bayCount}개</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="text-[9px] text-purple-300 block">코드</label>
                            <input
                              type="text"
                              value={item.code}
                              onChange={e => updateCard(i, 'code', e.target.value.toUpperCase())}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono"
                              maxLength={6}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-purple-300 block">콜사인</label>
                            <input
                              type="text"
                              value={item.callsign}
                              onChange={e => updateCard(i, 'callsign', e.target.value.toUpperCase())}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono"
                              maxLength={10}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-purple-300 block">IMO</label>
                            <input
                              type="text"
                              value={item.imo}
                              onChange={e => updateCard(i, 'imo', e.target.value)}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono"
                              maxLength={10}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={saveAll}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold sticky bottom-0"
              >
                💾 일괄 등록 ({analyzed.filter(a => a.status !== 'failed').length}개)
              </button>
            </>
          )}

          {/* Phase: saving */}
          {phase === 'saving' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-3"/>
              <div className="text-emerald-200 font-bold text-base mb-1">
                저장 중 {progress.done} / {progress.total}
              </div>
              <div className="text-slate-400 text-xs truncate mb-3">{progress.current}</div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Phase: done */}
          {phase === 'done' && savedResults && (
            <>
              <div className="bg-emerald-900/40 border-2 border-emerald-700/60 rounded p-3">
                <div className="text-emerald-100 font-black text-base mb-2">✅ 일괄 등록 완료</div>
                <div className="space-y-1 text-xs">
                  <div className="text-emerald-300">✅ 등록 성공: {savedResults.saved}개</div>
                  {savedResults.skipped > 0 && (
                    <div className="text-amber-300">⏭ 스킵: {savedResults.skipped}개</div>
                  )}
                  {savedResults.protected > 0 && (
                    <div className="text-orange-300">⛔ 보호 선박 (수동만): {savedResults.protected}개</div>
                  )}
                  {savedResults.failed > 0 && (
                    <div className="text-red-300">❌ 실패: {savedResults.failed}개</div>
                  )}
                </div>
              </div>
              {savedResults.details.length > 0 && (
                <div className="bg-slate-800/60 rounded p-2.5 text-[10px] space-y-1">
                  <div className="font-bold text-slate-300">상세:</div>
                  {savedResults.details.map((d, i) => (
                    <div key={i} className="text-slate-400">
                      • <span className="text-slate-200">{d.file}</span>: {d.error}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-bold"
              >
                완료
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
