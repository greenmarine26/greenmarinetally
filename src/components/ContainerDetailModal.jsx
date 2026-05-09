import React, { useState } from 'react';
import { X, Check, Edit3, Snowflake, AlertTriangle, AlertOctagon, MapPin, Volume2, RotateCcw, History, Lock, Camera } from 'lucide-react';
import { isoToLabel, formatWt, getEquipNumber, isUnknownIso, isReeferContainer, isISO403, isISO403PhotoTaken } from '../utils.js';
import { speakContainer, speakDone } from '../voice.js';
import { fbCompleteContainer, fbCancelComplete, fbToggleXray, fbUpdateRecordSeal, fbSetXraySeal, fbUpdateRecordField, fbSetEmptySeal, fbReassignContainerPosition } from '../firebase.js';
import PhotoReportModal from './PhotoReportModal.jsx';
import ISO403PhotoModal from './ISO403PhotoModal.jsx';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import PositionEditModal from './PositionEditModal.jsx';

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

export default function ContainerDetailModal({ c, comp, isXray, xraySeal, mode, voyageKey, voyageInfo, inspector, onClose, sealMode, allContainers = [] }) {
  const [editingSeal, setEditingSeal] = useState(false);
  const [editingXSeal, setEditingXSeal] = useState(false);
  const [editingIso, setEditingIso] = useState(false);
  const [editingTmp, setEditingTmp] = useState(false);
  const [tmpVal, setTmpVal] = useState(c.tmp || '');
  const [editingEseal, setEditingEseal] = useState(false);
  // M4.9b-fix: 실오류 / 리씰 별도 입력 모드
  const [editingEsealWrong, setEditingEsealWrong] = useState(false);
  const [editingReseal, setEditingReseal] = useState(false);
  const [esealWrongVal, setEsealWrongVal] = useState('');
  const [esealVal, setEsealVal] = useState(c.eseal || '');
  const [resealVal, setResealVal] = useState(c.reseal || '');
  const [esealType, setEsealType] = useState('reseal');
  const [photoMode, setPhotoMode] = useState(null);  // M3.5.6: 'seal_error' | 'damage'
  const [iso403PhotoOpen, setIso403PhotoOpen] = useState(false);  // M4.9: ISO403 사진 모달
  const [showHistory, setShowHistory] = useState(false);
  const [sealVal, setSealVal] = useState(c.sl || '');
  const [xSealVal, setXSealVal] = useState(xraySeal?.seal || '');
  const [xEsealVal, setXEsealVal] = useState(xraySeal?.eseal || '');
  // M3.87: 위치 수정 모달 (선적 모드 전용)
  const [showPosEdit, setShowPosEdit] = useState(false);

  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();

  const isDone = !!comp;
  const isReefer = isReeferContainer(c);
  const isDG = c.dg;
  // M4.9: ISO403 (사진 촬영 의무 대상)
  const needsISO403Photo = isISO403(c);
  const iso403PhotoTaken = isISO403PhotoTaken(c);

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
        message: `${c.cn}\n${mode === 'discharge' ? '양하확인을' : '선적확인을'} 취소하시겠습니까?`,
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

  // M3.5.5/M4.9b: 엠티 실 저장 (단순화)
  //   verify 모드(TNJP/RZOR): 단순 덮어쓰기. 수정 이력은 fbSetEmptySeal에서 자동 저장.
  //                           수정 발생 시 별도 "엠티 수정 리포트"로 출력.
  //   attach 모드(ATRP): 단순 덮어쓰기.
  //   M4.9b 변경: 리씰/틀린실 라디오 강제 선택 제거 (사용자 요청 — 경고 메시지 불필요)
  const handleSaveEseal = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const newVal = String(esealVal || '').trim().toUpperCase();
    if (!newVal && sealMode === 'attach') {
      alert('엠티실번호를 입력하세요');
      return;
    }
    // 단순 덮어쓰기 (verify/attach 동일). 이력은 firebase에서 자동 저장.
    await fbSetEmptySeal(voyageKey, mode, c.cn, { eseal: newVal }, inspector, sealMode);
    setEditingEseal(false);
  };

  // M4.9b-fix: 실오류 보고 — 발견된 잘못된 번호를 c.eseal_wrong에 별도 기록
  //   기존 c.eseal은 유지 (계획상 번호), eseal_wrong에 현장 발견 번호
  const handleSaveEsealWrong = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const newVal = String(esealWrongVal || '').trim().toUpperCase();
    if (!newVal) { alert('실제 발견된 실번호를 입력하세요'); return; }
    await fbSetEmptySeal(voyageKey, mode, c.cn, {
      eseal: c.eseal || '',
      eseal_wrong: newVal,
      reseal: c.reseal || '',
    }, inspector, sealMode);
    setEditingEsealWrong(false);
    setEsealWrongVal('');
  };

  // M4.9b-fix: 리씰 등록 — 실이 없거나 손상되어 새로 부착한 번호를 c.reseal에 기록
  //   기존 c.eseal은 유지, reseal에 새로 부착한 번호
  const handleSaveReseal = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const newVal = String(resealVal || '').trim().toUpperCase();
    if (!newVal) { alert('새로 부착한 실번호를 입력하세요'); return; }
    await fbSetEmptySeal(voyageKey, mode, c.cn, {
      eseal: c.eseal || '',
      eseal_wrong: c.eseal_wrong || '',
      reseal: newVal,
    }, inspector, sealMode);
    setEditingReseal(false);
    setResealVal('');
  };

  // M4.9b-fix: 실오류/리씰 삭제 (잘못 등록한 경우)
  const handleClearEsealWrong = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (!confirm('실오류 기록을 삭제하시겠습니까?')) return;
    await fbSetEmptySeal(voyageKey, mode, c.cn, {
      eseal: c.eseal || '',
      eseal_wrong: '',
      reseal: c.reseal || '',
    }, inspector, sealMode);
  };
  const handleClearReseal = async () => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    if (!confirm('리씰 기록을 삭제하시겠습니까?')) return;
    await fbSetEmptySeal(voyageKey, mode, c.cn, {
      eseal: c.eseal || '',
      eseal_wrong: c.eseal_wrong || '',
      reseal: '',
    }, inspector, sealMode);
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
            {/* M4.9: ISO403 배지 */}
            {needsISO403Photo && (
              iso403PhotoTaken
                ? <Badge color="emerald"><Camera className="w-3 h-3"/>ISO403 ✓</Badge>
                : <Badge color="blue"><Camera className="w-3 h-3"/>ISO403 사진 필요</Badge>
            )}
          </div>

          {/* M4.9: ISO403 사진 의무 강조 박스 (미촬영 시) */}
          {needsISO403Photo && !iso403PhotoTaken && (
            <div className="mt-3 px-3 py-2 bg-blue-950/50 border-2 border-blue-600 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-xl">📷</span>
                <div className="flex-1">
                  <div className="text-xs font-black text-blue-200">ISO403 사진 촬영 필요</div>
                  <div className="text-[11px] text-blue-300 mt-0.5">
                    이 컨테이너는 ISO403 대상입니다 (코드 {c.iso}). 사진 1장 촬영이 필요합니다.
                  </div>
                  <button onClick={() => setIso403PhotoOpen(true)}
                    className="mt-2 w-full py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded font-bold text-sm flex items-center justify-center gap-1.5">
                    <Camera className="w-4 h-4"/>📷 ISO403 사진 촬영
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* M4.9: ISO403 사진 촬영 완료 시 - 다시 촬영/보기 */}
          {needsISO403Photo && iso403PhotoTaken && (
            <div className="mt-2 px-3 py-2 bg-emerald-950/30 border border-emerald-700/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400"/>
                <span className="text-xs font-bold text-emerald-200">ISO403 사진 촬영 완료</span>
                {c.iso403_photo_by && (
                  <span className="text-[10px] text-emerald-400/80">({c.iso403_photo_by})</span>
                )}
              </div>
              <button onClick={() => setIso403PhotoOpen(true)}
                className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-50 rounded text-[10px] font-bold flex items-center gap-1">
                <Camera className="w-3 h-3"/>보기/재촬영
              </button>
            </div>
          )}

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
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
            <span>선내 위치</span>
            {/* M3.87: 선적 모드만 위치 수정 버튼 (양하 시 위치 변경은 의미 없음) */}
            {mode === 'loading' && (
              <button onClick={() => setShowPosEdit(true)}
                className="bg-amber-700 hover:bg-amber-600 text-amber-50 px-2 py-1 rounded text-[10px] font-black flex items-center gap-1">
                <Edit3 className="w-3 h-3"/>위치 수정
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400"/>
            <span className="text-2xl font-black mono text-amber-300">{c.bay || '-'}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold mono text-slate-300">{c.row || '--'}</span>
            <span className="text-slate-500">/</span>
            <span className="text-xl font-bold mono text-slate-300">{c.tier || '--'}</span>
            {!c.bay && mode === 'loading' && (
              <span className="ml-2 bg-orange-700 text-orange-50 text-[10px] px-1.5 py-0.5 rounded font-black">선적대상</span>
            )}
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
          {/* M4.9b: verify 모드 단순화 — TNJP/RZOR 등 verify 선박에서는
              경고 깜빡임 / 리씰·틀린실 라디오 강제 선택 제거.
              실 입력만 받고, 수정 이력은 자동 저장 (eseal_history),
              수정된 것만 별도 "엠티 수정 리포트"로 출력 가능 */}
          {sealMode && (
            <div className={`mb-3 rounded p-2 ${
              editingEseal
                ? (sealMode === 'attach' ? 'bg-red-900/20 border border-red-700/40' : 'bg-cyan-900/20 border border-cyan-700/40')
                : (sealMode === 'attach' && !c.eseal ? 'bg-red-950/30 border-2 border-red-600 animate-pulse' : '')
            }`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className={`w-3 h-3 ${sealMode === 'attach' ? 'text-red-400' : 'text-cyan-400'}`}/>
                  엠티 실 {sealMode === 'attach' ? '부착 (작업 필요)' : '표기'}
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
                      {/* M4.9b: 수정 이력 있으면 작은 표시 (경고 아님, 단순 정보) */}
                      {Array.isArray(c.eseal_history) && c.eseal_history.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-bold">
                          (수정 {c.eseal_history.length}회)
                        </span>
                      )}
                    </div>
                  ) : (
                    /* M4.9b: verify 모드는 깜빡 경고 제거. attach만 깜빡임 (실제 부착 작업 필요) */
                    sealMode === 'attach' ? (
                      <span className="text-sm font-bold animate-pulse text-red-300">
                        ⚠️ 실 부착 필요
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        실번호 미입력
                      </span>
                    )
                  )}
                  {/* M4.9b: verify 모드의 옛 틀린실/리씰 표시는 호환 위해 유지 (이미 저장된 데이터 있을 수 있음) */}
                  {c.eseal_wrong && (
                    <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-amber-950/40 border border-amber-700/40 rounded">
                      <span className="text-[10px] text-amber-400 font-bold">⚠️ 실오류</span>
                      <span className="text-sm font-bold mono text-amber-200">{c.eseal_wrong}</span>
                      <button onClick={handleClearEsealWrong}
                        className="ml-auto text-[10px] text-amber-400 hover:text-amber-200">삭제</button>
                    </div>
                  )}
                  {c.reseal && (
                    <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-purple-950/40 border border-purple-700/40 rounded">
                      <span className="text-[10px] text-purple-400 font-bold">🔄 리씰</span>
                      <span className="text-sm font-bold mono text-purple-200">{c.reseal}</span>
                      <button onClick={handleClearReseal}
                        className="ml-auto text-[10px] text-purple-400 hover:text-purple-200">삭제</button>
                    </div>
                  )}

                  {/* M4.9b-fix: 실오류 / 리씰 액션 버튼 — 사용자 요청
                      - 실오류: 발견된 잘못된 번호를 별도 기록 (eseal_wrong)
                      - 리씰:   실 없거나 손상되어 새로 부착한 번호 (reseal) */}
                  {!editingEsealWrong && !editingReseal && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button onClick={() => { setEsealWrongVal(''); setEditingEsealWrong(true); }}
                        className="py-1.5 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/50 text-amber-200 rounded text-xs font-bold flex items-center justify-center gap-1">
                        ⚠️ 실오류 등록
                      </button>
                      <button onClick={() => { setResealVal(''); setEditingReseal(true); }}
                        className="py-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 rounded text-xs font-bold flex items-center justify-center gap-1">
                        🔄 리씰 등록
                      </button>
                    </div>
                  )}

                  {/* 실오류 입력 폼 */}
                  {editingEsealWrong && (
                    <div className="mt-2 p-2 bg-amber-950/30 border border-amber-700/50 rounded space-y-2">
                      <div className="text-[10px] text-amber-300 font-bold">
                        ⚠️ 실오류 — 현장에서 발견한 실제 번호 입력 (계획 번호와 다름)
                      </div>
                      <input
                        type="text"
                        value={esealWrongVal}
                        onChange={e => setEsealWrongVal(e.target.value.toUpperCase())}
                        placeholder="실제 발견 실번호"
                        className="w-full bg-slate-800 border-2 border-amber-700 rounded px-3 py-2 text-base font-bold mono text-amber-100 focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setEditingEsealWrong(false); setEsealWrongVal(''); }}
                          className="py-2 bg-slate-700 text-slate-300 rounded text-xs font-bold">취소</button>
                        <button onClick={handleSaveEsealWrong}
                          className="py-2 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-bold">저장</button>
                      </div>
                    </div>
                  )}

                  {/* 리씰 입력 폼 */}
                  {editingReseal && (
                    <div className="mt-2 p-2 bg-purple-950/30 border border-purple-700/50 rounded space-y-2">
                      <div className="text-[10px] text-purple-300 font-bold">
                        🔄 리씰 — 실이 없거나 손상되어 새로 부착한 실번호 입력
                      </div>
                      <input
                        type="text"
                        value={resealVal}
                        onChange={e => setResealVal(e.target.value.toUpperCase())}
                        placeholder="새로 부착한 실번호"
                        className="w-full bg-slate-800 border-2 border-purple-700 rounded px-3 py-2 text-base font-bold mono text-purple-100 focus:outline-none focus:border-purple-400"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setEditingReseal(false); setResealVal(''); }}
                          className="py-2 bg-slate-700 text-slate-300 rounded text-xs font-bold">취소</button>
                        <button onClick={handleSaveReseal}
                          className="py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold">저장</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`text-[10px] ${sealMode === 'attach' ? 'text-red-300' : 'text-cyan-300'}`}>
                    {sealMode === 'attach'
                      ? '실 부착 후 실번호를 입력하세요. POD: ' + (c.pod || '?')
                      : (c.eseal
                          ? '기존: ' + c.eseal + ' → 새 번호 입력 (이력 자동 기록)'
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
                  {/* M4.9b: 라디오 강제 선택 제거 — 단순 덮어쓰기, 이력 자동 저장 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditingEseal(false)}
                      className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">
                      취소
                    </button>
                    <button onClick={handleSaveEseal}
                      className={`py-2 rounded text-xs font-bold text-white ${
                        sealMode === 'attach' ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
                      }`}>
                      저장
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
              {c.sl ? (
                <span className={`text-lg mono font-bold ${sealError ? 'text-red-300' : 'text-amber-200'}`}>{c.sl}</span>
              ) : c.fe === 'E' ? (
                // M3.88: 엠티는 실번호 없는 게 정상
                <span className="text-lg mono font-bold text-slate-300">📦 엠티 (실번호 없음)</span>
              ) : (
                <span className="text-lg mono font-bold text-slate-600 italic">미입력</span>
              )}
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
            {isDone
              ? <><RotateCcw className="w-5 h-5 inline mr-1"/>{mode === 'discharge' ? '양하확인 취소' : '선적확인 취소'}</>
              : <><Check className="w-5 h-5 inline mr-1"/>{mode === 'discharge' ? '양하확인' : '선적확인'}</>
            }
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

      {/* M4.9: ISO403 사진 촬영 모달 */}
      <ISO403PhotoModal
        open={iso403PhotoOpen}
        c={c}
        voyageKey={voyageKey}
        mode={mode}
        inspector={inspector}
        onClose={() => setIso403PhotoOpen(false)}
      />

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />

      {/* M3.87: 위치 수정 모달 (선적 모드) */}
      <PositionEditModal
        open={showPosEdit}
        container={{ ...c, _comp: comp }}
        allContainers={allContainers}
        onClose={() => setShowPosEdit(false)}
        onSave={async (newBay, newRow, newTier) => {
          if (!inspector) { alert('검수원을 먼저 선택하세요'); return { ok: false }; }
          const result = await fbReassignContainerPosition(voyageKey, mode, c.cn, newBay, newRow, newTier, inspector);
          return result;
        }}
      />
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
    blue: 'bg-blue-700/60 text-blue-100',
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
