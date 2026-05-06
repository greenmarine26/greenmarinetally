import React, { useState } from 'react';
import { X, Check, Edit3, Snowflake, AlertTriangle, AlertOctagon, MapPin, Volume2, RotateCcw, History, Lock } from 'lucide-react';
import { isoToLabel, formatWt, getEquipNumber, isUnknownIso } from '../utils.js';
import { speakContainer, speakDone } from '../voice.js';
import { fbCompleteContainer, fbCancelComplete, fbToggleXray, fbUpdateRecordSeal, fbSetXraySeal, fbUpdateRecordField, fbSetEmptySeal } from '../firebase.js';
import PhotoReportModal from './PhotoReportModal.jsx';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';

// ISO 코드 옵션 (현장에서 자주 쓰는 것)
const ISO_OPTIONS = [
  { iso: '22G1', label: '20DC (20피트 일반)', flags: {} },
  { iso: '42G1', label: '40DC (40피트 일반)', flags: {} },
  { iso: '45G1', label: '45HC (45피트 하이큐브)', flags: {} },
  { iso: '22R1', label: '20RF (20피트 리퍼)', flags: { rf: true } },
  { iso: '42R1', label: '40RF (40피트 리퍼)', flags: { rf: true } },
  { iso: '45R1', label: '45RF (45피트 리퍼)', flags: { rf: true } },
  { iso: '22P1', label: '20FR (20피트 플랫랙)', flags: { fr: true } },
  { iso: '42P1', label: '40FR (40피트 플랫랙)', flags: { fr: true } },
  { iso: '45P1', label: '45FR (45피트 플랫랙)', flags: { fr: true } },
  { iso: '22U1', label: '20OT (20피트 오픈탑)', flags: { ot: true } },
  { iso: '22T1', label: '20TK (20피트 탱크)', flags: { tk: true } },
  { iso: '42T1', label: '40TK (40피트 탱크)', flags: { tk: true } },
];

export default function ContainerDetailModal({ c, comp, isXray, xraySeal, mode, voyageKey, voyageInfo, inspector, onClose, sealMode }) {
  const [editingSeal, setEditingSeal] = useState(false);
  const [editingXSeal, setEditingXSeal] = useState(false);
  const [editingIso, setEditingIso] = useState(false);
  const [editingTmp, setEditingTmp] = useState(false);
  const [tmpVal, setTmpVal] = useState(c.tmp || '');
  const [editingEseal, setEditingEseal] = useState(false);
  const [esealVal, setEsealVal] = useState(c.eseal || '');
  const [resealVal, setResealVal] = useState(c.reseal || '');
  const [esealType, setEsealType] = useState('reseal');
  const [photoMode, setPhotoMode] = useState(null);  // M3.5.6: 'seal_error' | 'damage'
  const [showHistory, setShowHistory] = useState(false);
  const [sealVal, setSealVal] = useState(c.sl || '');
  const [xSealVal, setXSealVal] = useState(xraySeal?.seal || '');
  const [xEsealVal, setXEsealVal] = useState(xraySeal?.eseal || '');

  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();

  const isDone = !!comp;
  const isReefer = c.rf || (c.iso && c.iso[2] === 'R');
  const isDG = c.dg;

  const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
  const sealError = c.sl && slOrig && c.sl !== slOrig;
  const xSealOrig = xraySeal?.seal_orig != null ? xraySeal.seal_orig : xraySeal?.seal || '';
  const xSeal = xraySeal?.seal || '';
  const xSealError = xSeal && xSealOrig && xSeal !== xSealOrig;
  const slHistory = c.sl_history || [];
  const xHistory = xraySeal?.history || [];

  const handleComplete = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (isDone) {
      askConfirm({
        title: '완료 취소',
        message: `${c.cn}\n검수 완료를 취소하시겠습니까?`,
        confirmLabel: '취소',
        cancelLabel: '닫기',
        onConfirm: async () => {
          await fbCancelComplete(voyageKey, mode, c.cn);
        },
      });
    } else {
      await fbCompleteContainer(voyageKey, mode, c.cn, inspector);
      speakDone(c);
    }
  };

  const handleSaveSeal = async () => {
    await fbUpdateRecordSeal(voyageKey, mode, c.cn, sealVal.trim(), inspector);
    setEditingSeal(false);
  };

  const handleSaveXSeal = async () => {
    await fbSetXraySeal(voyageKey, c.cn, xSealVal.trim(), xEsealVal.trim(), inspector);
    setEditingXSeal(false);
  };

  // M3.5.4-fix3: 리퍼 온도 직접 수정
  const handleSaveTmp = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const newTmp = String(tmpVal).trim();
    // 유효성: 빈값(미입력) 또는 숫자(소수점 포함, 부호 가능)
    if (newTmp !== '' && !/^[+-]?\d+(\.\d+)?$/.test(newTmp)) {
      alert('온도는 숫자만 입력하세요 (예: -18, 4.5, 0)\n빈칸은 미입력 처리됩니다');
      return;
    }
    // 정규화: "-018" → "-18"
    let norm = newTmp;
    if (norm) {
      const m = norm.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
      if (m) norm = (m[1] || '') + m[2];
    }
    await fbUpdateRecordField(voyageKey, mode, c.cn, 'tmp', norm, inspector);
    // 미입력 플래그도 갱신
    await fbUpdateRecordField(voyageKey, mode, c.cn, 'tmp_missing', norm === '', inspector);
    // 리퍼로 인식되도록 rf=true 명시 (실 있는 리퍼 케이스)
    if (norm !== '' || c.rf) {
      await fbUpdateRecordField(voyageKey, mode, c.cn, 'rf', true, inspector);
    }
    setEditingTmp(false);
  };

  // M3.5.5: 엠티 실 부착/확인 저장
  // 케이스:
  //   1) 처음 입력: eseal에 저장
  //   2) verify 모드 + 이미 입력된 상태에서 수정:
  //      - reseal 종류: 기존 eseal 유지 + reseal에 새 값
  //      - wrong 종류:  기존 eseal 유지 + eseal_wrong에 새 값
  //   3) attach 모드 + 이미 입력된 상태에서 수정: eseal 단순 변경
  const handleSaveEseal = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const newVal = String(esealVal || '').trim().toUpperCase();
    if (!newVal && sealMode === 'attach') {
      alert('엠티실번호를 입력하세요');
      return;
    }

    let fields;
    const hasExisting = !!(c.eseal || '').trim();

    if (!hasExisting) {
      // 처음 입력
      fields = { eseal: newVal };
    } else if (sealMode === 'verify') {
      // verify 모드 + 이미 있음 → 종류에 따라
      if (esealType === 'reseal') {
        fields = { eseal: c.eseal, reseal: newVal };
      } else {
        // wrong
        fields = { eseal: c.eseal, eseal_wrong: newVal };
      }
    } else {
      // attach 모드 + 수정 (단순 교체)
      fields = { eseal: newVal };
    }

    await fbSetEmptySeal(voyageKey, mode, c.cn, fields, inspector, sealMode);
    setEditingEseal(false);
  };

  // M3.5.4-fix2: 규격(ISO) 수정 — rf/fr/ot/tk 플래그 자동 갱신
  const handleChangeIso = async (newIso) => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const opt = ISO_OPTIONS.find(o => o.iso === newIso);
    if (!opt) return;
    askConfirm({
      title: '규격 변경',
      message:
        `현재: ${c.iso || '?'} (${isoToLabel(c.iso) || '?'})\n` +
        `변경: ${opt.iso} (${opt.label})\n\n` +
        `변경 이력에 기록됩니다.`,
      confirmLabel: '변경',
      cancelLabel: '취소',
      onConfirm: async () => {
        // ISO 자체 변경
        await fbUpdateRecordField(voyageKey, mode, c.cn, 'iso', opt.iso, inspector);
        // 플래그 갱신 (rf/fr/ot/tk 모두 명시 - 이전 잘못된 플래그 정리)
        await fbUpdateRecordField(voyageKey, mode, c.cn, 'rf', !!opt.flags.rf, inspector);
        await fbUpdateRecordField(voyageKey, mode, c.cn, 'fr', !!opt.flags.fr, inspector);
        await fbUpdateRecordField(voyageKey, mode, c.cn, 'ot', !!opt.flags.ot, inspector);
        await fbUpdateRecordField(voyageKey, mode, c.cn, 'tk', !!opt.flags.tk, inspector);
        setEditingIso(false);
        alert(`✅ 규격 변경 완료: ${opt.label}`);
      },
    });
  };

  const handleToggleXray = async () => {
    if (mode !== 'discharge') return;
    await fbToggleXray(voyageKey, c.cn);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        {/* 헤더 */}
        <div className={`sticky top-0 px-4 py-3 border-b border-slate-700 flex items-center justify-between ${
          sealError || xSealError ? 'bg-red-950' :
          isDone ? 'bg-emerald-950' :
          isXray ? 'bg-purple-950' :
          mode === 'discharge' ? 'bg-blue-950' : 'bg-amber-950'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black mono text-amber-300 tracking-wider">{c.l4 || c.cn?.slice(-4)}</span>
            <button onClick={() => speakContainer(c, { xray: isXray })} className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-700">
              <Volume2 className="w-4 h-4 text-amber-300"/>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400"/>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-base mono text-slate-200 font-bold mb-2">{c.cn}</div>
          <div className="flex flex-wrap gap-1.5">
            {(sealError || xSealError) && (
              <span className="bg-red-700 text-red-50 text-[11px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                <AlertOctagon className="w-3 h-3"/>실오류 (세관 신고 대상)
              </span>
            )}
            {isDone && <Badge color="emerald">✓ 완료 [{comp.by}]</Badge>}
            {isXray && <Badge color="purple">🔍 X-RAY</Badge>}
            {isDG && <Badge color="red"><AlertTriangle className="w-3 h-3"/>DG {c.dgc} {c.un}</Badge>}
            {isReefer && <Badge color="cyan"><Snowflake className="w-3 h-3"/>RF{c.tmp ? ` ${c.tmp}°C` : ''}</Badge>}
            {c.fr && <Badge color="orange">Flat Rack</Badge>}
            {c.ot && <Badge color="yellow">Open Top</Badge>}
            {c.tk && <Badge color="pink">Tank</Badge>}
          </div>
          {/* M3.5.6: 사진 보고 버튼 (실오류 / 데미지) */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => setPhotoMode('seal_error')}
              className="py-2 bg-red-900/40 hover:bg-red-900/60 active:bg-red-900/80 border border-red-700/50 text-red-200 rounded text-xs font-bold flex items-center justify-center gap-1">
              📷 실오류 보고
            </button>
            <button onClick={() => setPhotoMode('damage')}
              className="py-2 bg-amber-900/40 hover:bg-amber-900/60 active:bg-amber-900/80 border border-amber-700/50 text-amber-200 rounded text-xs font-bold flex items-center justify-center gap-1">
              📷 데미지 보고
            </button>
          </div>
        </div>

        {/* 위치 */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">선내 위치</div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400"/>
            <span className="text-2xl font-black mono text-amber-300">{c.bay || '-'}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold mono text-slate-300">{c.row || '--'}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold mono text-slate-300">{c.tier || '--'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">베이 / 열 / 단</div>
        </div>

        {/* 화물 */}
        <div className="px-4 py-3 border-b border-slate-800">
          {/* M3.5.4-fix2: 규격 수정 영역 */}
          <div className={`mb-3 rounded p-2 ${editingIso ? 'bg-amber-900/20 border border-amber-700/40' : ''}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
              <span>규격 (ISO)</span>
              {!editingIso && (
                <button onClick={() => setEditingIso(true)}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px]">
                  <Edit3 className="w-3 h-3"/>실물과 다름?
                </button>
              )}
            </div>
            {!editingIso ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold mono text-slate-100">{isoToLabel(c.iso) || c.tp || '-'}</span>
                  <span className="text-xs text-slate-500 mono">({c.iso || '-'})</span>
                  {c.iso_orig && c.iso_orig !== c.iso && (
                    <span className="text-[10px] text-amber-400 mono">원본: {c.iso_orig} → 수정됨</span>
                  )}
                </div>
                {/* M3.6: 알 수 없는 ISO 표기 → 사진 보고 강력 유도 */}
                {isUnknownIso(c.iso) && (
                  <div className="mt-2 px-3 py-2 bg-red-950/50 border-2 border-red-600 rounded-lg animate-pulse">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">⚠️</span>
                      <div className="flex-1">
                        <div className="text-xs font-black text-red-200">알 수 없는 규격 표기</div>
                        <div className="text-[11px] text-red-300 mt-0.5">
                          "{c.iso}"는 처음 보는 표기입니다. 실물 사진 촬영 + 1항사 확인 부탁드립니다.
                        </div>
                        <button onClick={() => setPhotoMode('damage')}
                          className="mt-2 w-full py-2 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                          📷 사진 촬영하기
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] text-amber-300 mb-2">
                  실물에 맞는 규격을 선택하세요. 검수원이 본 실물이 정답입니다.
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto">
                  {ISO_OPTIONS.map(opt => (
                    <button key={opt.iso}
                      onClick={() => handleChangeIso(opt.iso)}
                      className={`px-3 py-2 rounded text-left text-xs font-bold border ${
                        c.iso === opt.iso
                          ? 'bg-amber-900/40 border-amber-500 text-amber-200'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="mono">{opt.iso}</span>
                        <span className="text-[10px] text-slate-400">{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setEditingIso(false)}
                  className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">
                  취소
                </button>
              </div>
            )}
          </div>

          {/* M3.5.4-fix3: 리퍼 온도 수정 (리퍼인 경우만 표시) */}
          {isReefer && (
            <div className={`mb-3 rounded p-2 ${editingTmp ? 'bg-cyan-900/20 border border-cyan-700/40' : ''}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3 text-cyan-400"/>리퍼 온도
                </span>
                {!editingTmp && (
                  <button onClick={() => { setTmpVal(c.tmp || ''); setEditingTmp(true); }}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]">
                    <Edit3 className="w-3 h-3"/>{c.tmp_missing || !c.tmp ? '온도 입력' : '수정'}
                  </button>
                )}
              </div>
              {!editingTmp ? (
                <div className="flex items-center gap-2">
                  {c.tmp && !c.tmp_missing ? (
                    <span className="text-base font-bold mono text-cyan-200">{c.tmp}°C</span>
                  ) : c.fe === 'E' ? (
                    /* M3.75: 엠티 리퍼는 온도 없는 게 정상 */
                    <span className="text-sm font-bold text-cyan-400/80">엠티 리퍼 (온도 표시 정상)</span>
                  ) : (
                    <span className="text-sm font-bold text-red-300 animate-pulse">⚠️ 온도 미입력 (현장 확인 필요)</span>
                  )}
                  {c.tmp_orig !== undefined && c.tmp_orig !== c.tmp && (
                    <span className="text-[10px] text-amber-400 mono">원본: {c.tmp_orig || '(없음)'} → 수정됨</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] text-cyan-300">
                    실물 온도계를 보고 입력하세요. 빈칸 = 미입력 처리.
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tmpVal}
                      onChange={e => setTmpVal(e.target.value)}
                      placeholder="예: -18, 4.5, 0"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-base font-bold text-cyan-100 focus:outline-none focus:border-cyan-400 mono"
                      autoFocus
                    />
                    <span className="text-slate-400 text-sm font-bold">°C</span>
                  </div>
                  {/* 빠른 선택 버튼 */}
                  <div className="grid grid-cols-5 gap-1">
                    {['-25', '-18', '-15', '0', '4'].map(t => (
                      <button key={t} onClick={() => setTmpVal(t)}
                        className="py-1.5 bg-slate-800 hover:bg-cyan-900/40 border border-slate-700 rounded text-xs font-bold text-slate-200 mono">
                        {t}°
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditingTmp(false)}
                      className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">
                      취소
                    </button>
                    <button onClick={handleSaveTmp}
                      className="py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-bold">
                      💾 저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* M3.5.5: 엠티 실 부착/확인 (sealMode 있을 때만) */}
          {sealMode && (
            <div className={`mb-3 rounded p-2 ${
              editingEseal
                ? (sealMode === 'attach' ? 'bg-red-900/20 border border-red-700/40' : 'bg-cyan-900/20 border border-cyan-700/40')
                : (sealMode === 'attach' && !c.eseal ? 'bg-red-950/30 border-2 border-red-600 animate-pulse' : '')
            }`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className={`w-3 h-3 ${sealMode === 'attach' ? 'text-red-400' : 'text-cyan-400'}`}/>
                  엠티 실 {sealMode === 'attach' ? '부착 (작업 필요)' : '확인 (이미 부착됨)'}
                </span>
                {!editingEseal && (
                  <button onClick={() => { setEsealVal(c.eseal || ''); setEditingEseal(true); }}
                    className={`hover:opacity-80 flex items-center gap-1 text-[10px] ${
                      sealMode === 'attach' ? 'text-red-300' : 'text-cyan-400'
                    }`}>
                    <Edit3 className="w-3 h-3"/>{c.eseal ? '수정' : '실번호 입력'}
                  </button>
                )}
              </div>
              {!editingEseal ? (
                <div className="space-y-1">
                  {/* 기본 엠티실번호 */}
                  {c.eseal ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base font-bold mono ${sealMode === 'attach' ? 'text-red-200' : 'text-cyan-200'}`}>
                        🔒 {c.eseal}
                      </span>
                      {c.eseal_by && (
                        <span className="text-[10px] text-slate-400">
                          ({c.eseal_by}, {c.eseal_at ? new Date(c.eseal_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={`text-sm font-bold animate-pulse ${
                      sealMode === 'attach' ? 'text-red-300' : 'text-amber-300'
                    }`}>
                      ⚠️ {sealMode === 'attach' ? '실 부착 필요' : '실 확인 필요'}
                    </span>
                  )}
                  {/* 틀린실번호 (있으면) */}
                  {c.eseal_wrong && (
                    <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-amber-950/40 border border-amber-700/40 rounded">
                      <span className="text-[10px] text-amber-400 font-bold">⚠️ 틀린실</span>
                      <span className="text-sm font-bold mono text-amber-200">{c.eseal_wrong}</span>
                    </div>
                  )}
                  {/* 리씰번호 (있으면) */}
                  {c.reseal && (
                    <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-purple-950/40 border border-purple-700/40 rounded">
                      <span className="text-[10px] text-purple-400 font-bold">🔄 리씰</span>
                      <span className="text-sm font-bold mono text-purple-200">{c.reseal}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`text-[10px] ${sealMode === 'attach' ? 'text-red-300' : 'text-cyan-300'}`}>
                    {sealMode === 'attach'
                      ? '실 부착 후 실번호를 입력하세요. POD: ' + (c.pod || '?')
                      : (c.eseal
                          ? '기존 실: ' + c.eseal + ' / 새 번호 입력 후 종류 선택'
                          : '엠티에 부착된 실번호를 입력하세요')}
                  </div>
                  <input
                    type="text"
                    value={esealVal}
                    onChange={e => setEsealVal(e.target.value.toUpperCase())}
                    placeholder="실번호 (예: ABC1234)"
                    className={`w-full bg-slate-800 border-2 rounded px-3 py-2 text-base font-bold mono focus:outline-none ${
                      sealMode === 'attach'
                        ? 'border-red-700 text-red-100 focus:border-red-400'
                        : 'border-cyan-700 text-cyan-100 focus:border-cyan-400'
                    }`}
                    autoFocus
                  />
                  {/* M3.5.5: verify 모드 + 이미 입력된 상태에서 수정 시 종류 선택 */}
                  {sealMode === 'verify' && c.eseal && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded p-2 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold">새 번호의 구분:</div>
                      <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700/50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name="esealType"
                          value="reseal"
                          checked={esealType === 'reseal'}
                          onChange={e => setEsealType(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-purple-300">🔄 리씰 (손상 등으로 재부착)</span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700/50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name="esealType"
                          value="wrong"
                          checked={esealType === 'wrong'}
                          onChange={e => setEsealType(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-amber-300">⚠️ 틀린실 (예상과 다른 번호 발견)</span>
                      </label>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditingEseal(false)}
                      className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">
                      취소
                    </button>
                    <button onClick={handleSaveEseal}
                      className={`py-2 rounded text-xs font-bold text-white ${
                        sealMode === 'attach' ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
                      }`}>
                      💾 저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 나머지 필드 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="F/E" value={c.fe || '-'} highlight={c.fe === 'F' ? 'rose' : ''}/>
            <Field label="무게" value={c.wt > 0 ? formatWt(c.wt) : '-'}/>
            <Field label="검수업체" value={c.op || '-'} mono/>
            <Field label="POL" value={c.pol || '-'} mono/>
            <Field label="POD" value={c.pod || '-'} mono/>
            {c.npod && <Field label="환적" value={c.npod} mono/>}
          </div>
        </div>

        {/* 실번호 */}
        <div className={`px-4 py-3 border-b border-slate-800 ${sealError ? 'bg-red-950/30' : ''}`}>
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
            <span>실번호 (Seal No)</span>
            {sealError && <span className="text-red-400 font-black">⚠ 실오류</span>}
          </div>
          {sealError && (
            <div className="bg-red-950/50 border border-red-700/50 rounded p-2 mb-2 text-[11px]">
              <div className="text-red-300 font-bold mb-0.5">세관 신고 양식:</div>
              <div className="mono text-red-100">원실번호 <span className="font-black">{slOrig}</span> → 실제 <span className="font-black">{c.sl}</span></div>
            </div>
          )}
          {editingSeal ? (
            <div className="flex gap-2">
              <input type="text" value={sealVal}
                onChange={e => setSealVal(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-800 border border-amber-500 rounded px-3 py-2 mono text-amber-200 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveSeal()}/>
              <button onClick={handleSaveSeal} className="px-3 py-2 bg-emerald-700 text-emerald-100 rounded font-bold">저장</button>
              <button onClick={() => { setEditingSeal(false); setSealVal(c.sl || ''); }} className="px-3 py-2 bg-slate-700 text-slate-300 rounded">취소</button>
            </div>
          ) : (
            <button onClick={() => setEditingSeal(true)} className="flex items-center gap-2 w-full text-left">
              <span className={`text-lg mono font-bold ${c.sl ? (sealError ? 'text-red-300' : 'text-amber-200') : 'text-slate-600 italic'}`}>{c.sl || '미입력'}</span>
              <Edit3 className="w-4 h-4 text-slate-500"/>
            </button>
          )}
          {slHistory.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className="mt-2 text-[10px] text-slate-400 hover:text-slate-300 flex items-center gap-1">
              <History className="w-3 h-3"/>수정 이력 ({slHistory.length}회) {showHistory ? '▾' : '▸'}
            </button>
          )}
          {showHistory && slHistory.length > 0 && (
            <div className="mt-1.5 bg-slate-950 rounded p-2 space-y-1 text-[10px] mono">
              {slHistory.map((h, i) => (
                <div key={i} className="text-slate-400">
                  <span className="text-slate-500">{new Date(h.at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-emerald-400 ml-1">[{h.by}]</span>
                  <span className="text-slate-600 ml-1">{h.from || '∅'}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="text-slate-200">{h.to || '∅'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* X-RAY 봉인 (양하 X-RAY 대상) */}
        {mode === 'discharge' && isXray && (
          <div className={`px-4 py-3 border-b border-slate-800 ${xSealError ? 'bg-red-950/30' : 'bg-purple-950/20'}`}>
            <div className="text-[10px] text-purple-400 font-bold uppercase mb-1 flex items-center justify-between">
              <span>X-RAY 봉인 (세관 + 전자)</span>
              {xSealError && <span className="text-red-400 font-black">⚠ 실오류</span>}
            </div>
            {xSealError && (
              <div className="bg-red-950/50 border border-red-700/50 rounded p-2 mb-2 text-[11px]">
                <div className="text-red-300 font-bold mb-0.5">세관 신고 양식:</div>
                <div className="mono text-red-100">원봉인 <span className="font-black">{xSealOrig}</span> → 실제 <span className="font-black">{xSeal}</span></div>
              </div>
            )}
            {editingXSeal ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-purple-400">세관봉인</label>
                  <input type="text" value={xSealVal}
                    onChange={e => setXSealVal(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-purple-500 rounded px-3 py-2 mono text-purple-200 focus:outline-none"
                    autoFocus/>
                </div>
                <div>
                  <label className="text-[10px] text-cyan-400">전자봉인 (E-Seal)</label>
                  <input type="text" value={xEsealVal}
                    onChange={e => setXEsealVal(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-cyan-600 rounded px-3 py-2 mono text-cyan-200 focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSaveXSeal()}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveXSeal} className="flex-1 px-3 py-2 bg-emerald-700 text-emerald-100 rounded font-bold">저장</button>
                  <button onClick={() => { setEditingXSeal(false); setXSealVal(xraySeal?.seal || ''); setXEsealVal(xraySeal?.eseal || ''); }} className="px-3 py-2 bg-slate-700 text-slate-300 rounded">취소</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingXSeal(true)} className="w-full text-left space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">세관:</span>
                  <span className={`text-base mono font-bold ${xSeal ? (xSealError ? 'text-red-300' : 'text-purple-200') : 'text-slate-600 italic'}`}>{xSeal || '미입력'}</span>
                  <Edit3 className="w-3.5 h-3.5 text-slate-500"/>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">전자:</span>
                  <span className={`text-base mono font-bold ${xraySeal?.eseal ? 'text-cyan-200' : 'text-slate-600 italic'}`}>{xraySeal?.eseal || '미입력'}</span>
                </div>
              </button>
            )}
            {xHistory.length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-300">
                  <History className="w-3 h-3 inline mr-1"/>수정 이력 ({xHistory.length}회)
                </summary>
                <div className="mt-1.5 bg-slate-950 rounded p-2 space-y-1 text-[10px] mono">
                  {xHistory.map((h, i) => (
                    <div key={i} className="text-slate-400">
                      <span className="text-slate-500">{new Date(h.at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-emerald-400 ml-1">[{h.by}]</span>
                      <div className="ml-3 text-[9px]">
                        <span className="text-slate-600">세관: {h.from?.seal || '∅'}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-purple-200">{h.to?.seal || '∅'}</span>
                      </div>
                      <div className="ml-3 text-[9px]">
                        <span className="text-slate-600">전자: {h.from?.eseal || '∅'}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-cyan-200">{h.to?.eseal || '∅'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {c.bl && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">B/L</div>
            <div className="mono text-sm text-slate-300">{c.bl}</div>
          </div>
        )}

        {/* 액션 */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-3 flex gap-2">
          {mode === 'discharge' && (
            <button onClick={handleToggleXray}
              className={`px-4 py-3 rounded-lg font-bold text-sm ${
                isXray ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              🔍 {isXray ? '해제' : '추가'}
            </button>
          )}
          <button onClick={handleComplete}
            className={`flex-1 py-3 rounded-lg font-black text-base ${
              isDone
                ? 'bg-rose-800 hover:bg-rose-700 text-rose-100'
                : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100'
            }`}>
            {isDone ? <><RotateCcw className="w-5 h-5 inline mr-1"/>완료 취소</> : <><Check className="w-5 h-5 inline mr-1"/>검수 완료</>}
          </button>
        </div>
      </div>

      {/* M3.5.6: 사진 보고 모달 */}
      {photoMode && (
        <PhotoReportModal
          open={!!photoMode}
          type={photoMode}
          c={c}
          voyageKey={voyageKey}
          voyage={{ info: voyageInfo }}
          equipNo={getEquipNumber()}
          onClose={() => setPhotoMode(null)}
        />
      )}

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />
    </div>
  );
}

function Badge({ color, children }) {
  const map = {
    emerald: 'bg-emerald-700/60 text-emerald-100',
    purple: 'bg-purple-700/60 text-purple-100',
    red: 'bg-red-700/60 text-red-100',
    cyan: 'bg-cyan-700/60 text-cyan-100',
    orange: 'bg-orange-700/60 text-orange-100',
    yellow: 'bg-yellow-700/60 text-yellow-100',
    pink: 'bg-pink-700/60 text-pink-100',
  };
  return <span className={`${map[color]} text-[11px] px-2 py-0.5 rounded font-black flex items-center gap-1`}>{children}</span>;
}

function Field({ label, value, mono, highlight }) {
  const colors = { rose: 'text-rose-400' };
  return (
    <div>
      <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
      <div className={`text-base ${mono ? 'mono' : ''} ${colors[highlight] || 'text-slate-200'} font-bold`}>{value}</div>
    </div>
  );
}
