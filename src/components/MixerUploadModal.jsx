// 믹서 업로드 모달 (M3.5)
// 폰 친화 풀스크린 UI
// 흐름:
//   1. 사전 입력: 모드 선택 (양하/선적/둘다) + 항차 선택 (기존 카드 또는 새로 시작)
//   2. 파일 던지기 (한 곳, 모든 형식)
//   3. 자동 분석 진행 표시
//   4. 결과 요약 + 충돌/매칭 실패 확인
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon, Trash2, Camera, Plus } from 'lucide-react';
import { processSingleFile, mergeWithEdi, matchVoyage, preloadLibraries } from '../mixerUpload.js';
import { fbCreateVoyage, fbSaveEdiContainers, fbSaveListRecords, fbSaveXrayList, fbUpdateVoyageInfo } from '../firebase.js';
import { GEMINI_API_KEY } from '../gemini.js';

export default function MixerUploadModal({ open, onClose, voyages, inspector, onOpenVoyage }) {
  const [step, setStep] = useState('setup');
  const [mode, setMode] = useState(null);
  const [targetVoyage, setTargetVoyage] = useState(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // M3.5.2: 모달 열 때 PDF.js / SheetJS 사전 로드 (첫 처리 시 다운로드 대기 X)
  useEffect(() => {
    if (open) preloadLibraries();
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setStep('setup');
    setMode(null);
    setTargetVoyage(null);
    setFiles([]);
    setProgress({ done: 0, total: 0, current: '' });
    setResults(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ─── 단계 1: 사전 입력 (모드 선택) ───
  if (step === 'setup') {
    return (
      <ModalShell title="자료 업로드" onClose={handleClose}>
        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs text-slate-400 font-bold mb-2">1️⃣ 작업 모드</div>
            <div className="grid grid-cols-3 gap-2">
              <ModeButton active={mode === 'discharge'} onClick={() => setMode('discharge')}
                color="amber" icon="⬇️" label="양하만" />
              <ModeButton active={mode === 'loading'} onClick={() => setMode('loading')}
                color="blue" icon="⬆️" label="선적만" />
              <ModeButton active={mode === 'both'} onClick={() => setMode('both')}
                color="purple" icon="🔄" label="둘 다" />
            </div>
          </div>

          {mode && (
            <div>
              <div className="text-xs text-slate-400 font-bold mb-2">2️⃣ 항차 선택</div>
              <button onClick={() => { setTargetVoyage(null); setStep('upload'); }}
                className="w-full p-4 bg-emerald-900/30 hover:bg-emerald-900/50 border-2 border-emerald-700/40 rounded-lg text-left mb-2">
                <div className="text-base font-bold text-emerald-300">➕ 새 항차 시작</div>
                <div className="text-xs text-emerald-400/70 mt-0.5">
                  EDI에서 선박명/항차번호 자동 추출
                </div>
              </button>
              {Object.entries(voyages || {})
                .filter(([k, v]) => v?.info)
                .sort((a, b) => (b[1].info?.createdAt || 0) - (a[1].info?.createdAt || 0))
                .slice(0, 15)
                .map(([key, v]) => (
                  <button key={key} onClick={() => { setTargetVoyage(key); setStep('upload'); }}
                    className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left mb-2">
                    <div className="text-sm font-bold text-blue-200">🚢 {v.info.vsl}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {v.info.voy_d && <>⬇️ {v.info.voy_d} </>}
                      {v.info.voy_l && <>⬆️ {v.info.voy_l} </>}
                      {!v.info.voy_d && !v.info.voy_l && v.info.voy && <>{v.info.voy}</>}
                      {(v.discharge?.ediContainers && Object.keys(v.discharge.ediContainers).length > 0) && (
                        <span className="ml-2 text-amber-400">양하 {Object.keys(v.discharge.ediContainers).length}대</span>
                      )}
                      {(v.loading?.ediContainers && Object.keys(v.loading.ediContainers).length > 0) && (
                        <span className="ml-2 text-blue-400">선적 {Object.keys(v.loading.ediContainers).length}대</span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  // ─── 단계 2: 파일 업로드 ───
  if (step === 'upload') {
    const addFiles = (newFiles) => {
      const arr = Array.from(newFiles || []);
      setFiles(prev => [...prev, ...arr]);
    };
    const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

    return (
      <ModalShell title="파일 추가" onClose={handleClose} onBack={() => setStep('setup')}>
        <div className="p-4 space-y-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs text-slate-300">
            <div className="font-bold mb-1">
              📋 모드: {mode === 'discharge' ? '양하만' : mode === 'loading' ? '선적만' : '양하+선적'}
            </div>
            <div className="text-slate-400">
              항차: {targetVoyage ? voyages[targetVoyage]?.info?.vsl || targetVoyage : '➕ 새 항차 (EDI 자동 분석)'}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-bold">📁 파일 추가 (모든 형식)</div>

          {/* 파일 선택 버튼들 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="py-4 bg-blue-900/40 hover:bg-blue-900/60 border-2 border-blue-700/40 rounded-lg flex flex-col items-center gap-1">
              <FileText className="w-6 h-6 text-blue-300" />
              <div className="text-sm font-bold text-blue-200">파일에서 선택</div>
              <div className="text-[10px] text-blue-400/70">EDI/엑셀/PDF/이미지</div>
            </button>
            <button onClick={() => cameraRef.current?.click()}
              className="py-4 bg-emerald-900/40 hover:bg-emerald-900/60 border-2 border-emerald-700/40 rounded-lg flex flex-col items-center gap-1">
              <Camera className="w-6 h-6 text-emerald-300" />
              <div className="text-sm font-bold text-emerald-200">카메라로 촬영</div>
              <div className="text-[10px] text-emerald-400/70">종이 리스트</div>
            </button>
          </div>

          <input ref={fileRef} type="file" multiple accept="*/*" className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

          {/* 추가된 파일 목록 */}
          {files.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-bold">추가된 파일 ({files.length}개)</div>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-slate-800 border border-slate-700 rounded p-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {f.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    <div className="text-xs text-slate-200 truncate">{f.name}</div>
                    <div className="text-[10px] text-slate-500 flex-shrink-0">{(f.size / 1024).toFixed(0)}KB</div>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <button onClick={() => processFiles({ files, mode, targetVoyage, voyages, inspector, setStep, setProgress, setResults })}
              className="w-full py-4 bg-gradient-to-r from-emerald-700 to-cyan-700 hover:from-emerald-600 hover:to-cyan-600 text-white font-black rounded-lg text-base">
              🚀 분석 시작 ({files.length}개)
            </button>
          )}
        </div>
      </ModalShell>
    );
  }

  // ─── 단계 3: 처리 중 ───
  if (step === 'process') {
    const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
    return (
      <ModalShell title="분석 중..." onClose={null}>
        <div className="p-6 text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <div className="text-base text-slate-200 font-bold mb-2">
            {progress.done} / {progress.total} 파일 처리 중
          </div>
          <div className="text-xs text-slate-400 truncate">{progress.current}</div>
          <div className="mt-4 bg-slate-800 rounded h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      </ModalShell>
    );
  }

  // ─── 단계 4: 결과 ───
  if (step === 'result' && results) {
    return (
      <ModalShell title="분석 완료" onClose={handleClose}>
        <ResultView results={results} onOpenVoyage={(k) => { handleClose(); onOpenVoyage(k); }} onClose={handleClose} />
      </ModalShell>
    );
  }

  return null;
}

// ─── 모달 셸 ───
function ModalShell({ title, onClose, onBack, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded">
                <span className="text-slate-300">←</span>
              </button>
            )}
            <div className="text-base font-black text-slate-100">{title}</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded">
              <X className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── 모드 버튼 ───
function ModeButton({ active, onClick, color, icon, label }) {
  const colorMap = {
    amber: active ? 'bg-amber-500 text-slate-900 border-amber-300' : 'bg-amber-900/30 text-amber-300 border-amber-700/40',
    blue: active ? 'bg-blue-500 text-slate-900 border-blue-300' : 'bg-blue-900/30 text-blue-300 border-blue-700/40',
    purple: active ? 'bg-purple-500 text-slate-900 border-purple-300' : 'bg-purple-900/30 text-purple-300 border-purple-700/40',
  };
  return (
    <button onClick={onClick} className={`py-4 border-2 rounded-lg font-bold ${colorMap[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs">{label}</div>
    </button>
  );
}

// ─── 파일 처리 메인 함수 (M3.5.2 최적화) ───
async function processFiles({ files, mode, targetVoyage, voyages, inspector, setStep, setProgress, setResults }) {
  setStep('process');
  setProgress({ done: 0, total: files.length, current: '병렬 분석 시작...' });

  // M3.5.2: 파일 병렬 처리 (이전: 순차 5초×5=25초 → 이후: 동시 5초)
  let doneCount = 0;
  const fileResults = await Promise.all(
    files.map(async (f) => {
      const r = await processSingleFile(f, { geminiApiKey: GEMINI_API_KEY });
      doneCount++;
      setProgress({ done: doneCount, total: files.length, current: f.name });
      return r;
    })
  );
  setProgress({ done: files.length, total: files.length, current: '병합 중...' });

  // 모드별 EDI/리스트/X-RAY 분류
  const ediFiles = fileResults.filter(r => r.role === 'edi-base' && !r.error);
  const listFiles = fileResults.filter(r => r.role === 'list' && !r.error);
  const xrayFiles = fileResults.filter(r => r.role === 'xray' && !r.error);
  const errorFiles = fileResults.filter(r => r.error);

  // 양하/선적 분리 (EDI의 POL/POD 또는 PDF/OCR의 mode)
  const dischargeData = { edi: {}, lists: [], xrays: [] };
  const loadingData = { edi: {}, lists: [], xrays: [] };

  ediFiles.forEach(r => {
    const data = r.data;
    if (!data?.containers) return;
    Object.values(data.containers).forEach(c => {
      const isDischarge = (c.pod || '').endsWith('PTK') || (c.pod || '').endsWith('KRPTK');
      const isLoading = (c.pol || '').endsWith('PTK') || (c.pol || '').endsWith('KRPTK');
      if (isDischarge) dischargeData.edi[c.cn] = { ...c, _mode: 'discharge' };
      if (isLoading) loadingData.edi[c.cn] = { ...c, _mode: 'loading' };
    });
    if (data._ship) {
      dischargeData._ship = data._ship;
      loadingData._ship = data._ship;
    }
    if (data.vsl) {
      dischargeData._vsl = data.vsl;
      loadingData._vsl = data.vsl;
    }
    if (data.voy) {
      dischargeData._voy = data.voy;
      loadingData._voy = data.voy;
    }
  });

  // M3.5.2: 리스트는 mode 정보 또는 컨번호 매칭으로 한쪽에만 배치
  // (이전: 'both'에서 양쪽 모두 push → 중복 처리 → 2배 시간)
  listFiles.forEach(r => {
    const data = r.data;
    if (!data?.containers) return;

    // 1순위: 파일 자체의 mode (PDF/OCR이 알려준 것)
    if (data.mode === 'loading') {
      loadingData.lists.push(data);
      return;
    }
    if (data.mode === 'discharge') {
      dischargeData.lists.push(data);
      return;
    }

    // 2순위: 사전 선택 모드
    if (mode === 'loading') {
      loadingData.lists.push(data);
      return;
    }
    if (mode === 'discharge') {
      dischargeData.lists.push(data);
      return;
    }

    // 3순위 (both): 컨번호 일치율로 한쪽에만 배치 (중복 X)
    const listCns = Object.keys(data.containers);
    if (listCns.length === 0) return;
    let dischargeMatch = 0, loadingMatch = 0;
    listCns.forEach(cn => {
      if (dischargeData.edi[cn]) dischargeMatch++;
      if (loadingData.edi[cn]) loadingMatch++;
    });
    if (dischargeMatch > loadingMatch) {
      dischargeData.lists.push(data);
    } else if (loadingMatch > dischargeMatch) {
      loadingData.lists.push(data);
    } else if (dischargeMatch > 0) {
      // 동률 + 매칭 있으면 양하 우선 (보통 양하가 메인)
      dischargeData.lists.push(data);
    } else {
      // 매칭 0 → 사전 모드 또는 양하 기본
      (mode === 'loading' ? loadingData : dischargeData).lists.push(data);
    }
  });

  xrayFiles.forEach(r => {
    const data = r.data;
    if (!data) return;
    dischargeData.xrays.push(data);
  });

  setProgress({ done: files.length, total: files.length, current: 'Firebase 저장 중...' });

  // 항차 매칭 + 저장 (Firebase 쓰기 병렬화)
  const voyageKey = await persistData({
    mode, targetVoyage, voyages, inspector,
    dischargeData, loadingData,
  });

  const summary = {
    totalFiles: files.length,
    ediCount: ediFiles.length,
    listCount: listFiles.length,
    xrayCount: xrayFiles.length,
    errorCount: errorFiles.length,
    dischargeContainers: Object.keys(dischargeData.edi).length,
    loadingContainers: Object.keys(loadingData.edi).length,
  };

  setResults({ fileResults, summary, voyageKey, errorFiles });
  setStep('result');
}

// ─── 데이터 저장 (Firebase) ───
async function persistData({ mode, targetVoyage, voyages, inspector, dischargeData, loadingData }) {
  // 항차 키 결정
  let voyageKey = targetVoyage;
  if (!voyageKey) {
    const vsl = (dischargeData._vsl || loadingData._vsl || 'UNKNOWN').toUpperCase().replace(/\s+/g, '');
    const voy = (dischargeData._voy || loadingData._voy || `V${Date.now().toString().slice(-6)}`).toUpperCase();
    voyageKey = `${vsl}_${voy}`;
    // 새 항차 생성은 동기적으로 (이후 모든 쓰기가 이 키에 의존)
    await fbCreateVoyage(voyageKey, {
      vsl: dischargeData._vsl || loadingData._vsl || 'UNKNOWN',
      voy,
      mode: mode || 'both',
      createdAt: Date.now(),
      createdBy: inspector || '',
    });
  }

  // M3.5.2: 모든 Firebase 쓰기를 병렬로 처리 (5~10배 빠름)
  const writePromises = [];

  // 항차번호 정보 업데이트
  const infoUpdates = {};
  if (dischargeData._voy) infoUpdates.voy_d = dischargeData._voy;
  if (loadingData._voy && loadingData._voy !== dischargeData._voy) infoUpdates.voy_l = loadingData._voy;
  if (Object.keys(infoUpdates).length > 0) {
    writePromises.push(fbUpdateVoyageInfo(voyageKey, infoUpdates));
  }

  // 양하 데이터
  if ((mode === 'discharge' || mode === 'both') && Object.keys(dischargeData.edi).length > 0) {
    const listMerged = {};
    dischargeData.lists.forEach(l => Object.assign(listMerged, l.containers));
    const xrayMerged = {};
    dischargeData.xrays.forEach(x => Object.assign(xrayMerged, x));

    const { merged } = mergeWithEdi(dischargeData.edi, listMerged, xrayMerged, {});
    writePromises.push(fbSaveEdiContainers(voyageKey, 'discharge', merged));

    if (Object.keys(listMerged).length > 0) {
      const records = {};
      Object.values(listMerged).forEach(c => {
        if (!c.cn) return;
        records[c.cn] = { sl: c.sl || '', wt: c.wt || 0 };
      });
      writePromises.push(fbSaveListRecords(voyageKey, 'discharge', records));
    }

    if (Object.keys(xrayMerged).length > 0) {
      writePromises.push(fbSaveXrayList(voyageKey, xrayMerged));
    }
  }

  // 선적 데이터
  if ((mode === 'loading' || mode === 'both') && Object.keys(loadingData.edi).length > 0) {
    const listMerged = {};
    loadingData.lists.forEach(l => Object.assign(listMerged, l.containers));

    const { merged } = mergeWithEdi(loadingData.edi, listMerged, {}, {});
    writePromises.push(fbSaveEdiContainers(voyageKey, 'loading', merged));

    if (Object.keys(listMerged).length > 0) {
      const records = {};
      Object.values(listMerged).forEach(c => {
        if (!c.cn) return;
        records[c.cn] = { sl: c.sl || '', wt: c.wt || 0 };
      });
      writePromises.push(fbSaveListRecords(voyageKey, 'loading', records));
    }
  }

  // 모든 쓰기 동시 실행 (5~10초 → 1~2초)
  await Promise.all(writePromises);

  return voyageKey;
}

// ─── 결과 화면 ───
function ResultView({ results, onOpenVoyage, onClose }) {
  const { summary, fileResults, errorFiles, voyageKey } = results;
  return (
    <div className="p-4 space-y-3">
      <div className="bg-emerald-900/30 border-2 border-emerald-700/40 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div className="text-base font-black text-emerald-200">분석 완료</div>
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <div>• 총 파일: {summary.totalFiles}개</div>
          <div>• EDI 분석: {summary.ediCount}개</div>
          <div>• 리스트(엑셀/PDF/사진): {summary.listCount}개</div>
          <div>• X-RAY: {summary.xrayCount}개</div>
          <div className="pt-2 border-t border-emerald-700/30">
            <div className="font-bold text-amber-300">⬇️ 양하: {summary.dischargeContainers}대</div>
            <div className="font-bold text-blue-300">⬆️ 선적: {summary.loadingContainers}대</div>
          </div>
        </div>
      </div>

      {errorFiles && errorFiles.length > 0 && (
        <div className="bg-red-900/30 border-2 border-red-700/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <div className="text-sm font-bold text-red-200">처리 실패: {errorFiles.length}개</div>
          </div>
          {errorFiles.map((r, i) => (
            <div key={i} className="text-xs text-red-300 mt-1 truncate">
              ✗ {r.fileName}: {r.error}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={onClose}
          className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded">
          닫기
        </button>
        <button onClick={() => onOpenVoyage(voyageKey)}
          className="py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded">
          항차 열기 →
        </button>
      </div>
    </div>
  );
}
