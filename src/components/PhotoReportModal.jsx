// 사진 보고 모달 (M3.5.6) - 실오류/데미지
import React, { useState, useRef } from 'react';
import { X, Camera, Send, AlertOctagon, AlertTriangle } from 'lucide-react';
import {
  shareWithPhoto,
  buildSealErrorMessage,
  buildDamageMessage,
  DAMAGE_TYPES,
  DAMAGE_PARTS,
} from '../kakaoShare.js';
import { fbAddWorkReport, fbAddPhotoReport } from '../firebase.js';

export default function PhotoReportModal({ open, type, c, voyageKey, voyage, equipNo, onClose }) {
  // type: 'seal_error' | 'damage'
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [damageTypes, setDamageTypes] = useState([]);
  const [damageParts, setDamageParts] = useState([]);
  const [note, setNote] = useState('');
  const [sealOrig, setSealOrig] = useState(c?.sl_orig || c?.sl || '');
  const [sealNew, setSealNew] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const vsl = voyage?.info?.vsl || '';
  const voy = voyage?.info?.voy_l || voyage?.info?.voy || '';
  const cn = c?.cn || '';

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBlob(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const togglePart = (code) => setDamageParts(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code]);
  const toggleType = (code) => setDamageTypes(t => t.includes(code) ? t.filter(x => x !== code) : [...t, code]);

  const handleSend = async () => {
    if (!photoBlob) {
      alert('사진을 먼저 촬영하세요');
      return;
    }
    setSending(true);
    try {
      const time = Date.now();
      let message = '';
      if (type === 'seal_error') {
        message = buildSealErrorMessage({
          vsl, voy, cn, sealOrig, sealNew, time, equip: equipNo, note,
        });
      } else {
        if (damageTypes.length === 0) {
          alert('데미지 종류를 1개 이상 선택하세요');
          setSending(false);
          return;
        }
        message = buildDamageMessage({
          vsl, voy, cn, types: damageTypes, parts: damageParts, note, time, equip: equipNo,
        });
      }

      // Firebase 저장 (사진 base64)
      const reader = new FileReader();
      reader.readAsDataURL(photoBlob);
      reader.onload = async () => {
        const base64 = reader.result;
        try {
          await fbAddPhotoReport(voyageKey, base64, {
            type, cn, mode: voyage?.mode || 'unknown',
            equip: equipNo,
            damageTypes: type === 'damage' ? damageTypes : null,
            damageParts: type === 'damage' ? damageParts : null,
            sealOrig: type === 'seal_error' ? sealOrig : null,
            sealNew: type === 'seal_error' ? sealNew : null,
            note,
            message,
          });
          await fbAddWorkReport(voyageKey, {
            type,
            cn,
            equip: equipNo,
            message,
            hasPhoto: true,
          });
        } catch (e) {
          console.error('Firebase 저장 실패:', e);
        }
      };

      // 카톡 공유 (사진 + 메시지)
      const result = await shareWithPhoto(message, photoBlob, type === 'seal_error' ? '실오류' : '데미지');
      if (result.photoSeparate) {
        alert('사진은 따로 첨부해주세요');
      }
      onClose();
    } catch (e) {
      alert('전송 실패: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const isError = type === 'seal_error';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-slate-700 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`sticky top-0 border-b border-slate-700 px-4 py-3 flex items-center justify-between ${isError ? 'bg-red-950' : 'bg-amber-950'}`}>
          <div className="flex items-center gap-2">
            {isError ? <AlertOctagon className="w-5 h-5 text-red-300"/> : <AlertTriangle className="w-5 h-5 text-amber-300"/>}
            <span className={`font-bold ${isError ? 'text-red-100' : 'text-amber-100'}`}>
              {isError ? '🚨 실오류 보고' : '⚠️ 데미지 보고'}
            </span>
            {equipNo && <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-bold">{equipNo}</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 컨번호 */}
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase">컨번호</div>
            <div className="text-base font-bold mono text-slate-100">{cn}</div>
          </div>

          {/* 사진 촬영 */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {photoUrl ? (
              <div className="space-y-2">
                <img src={photoUrl} alt="" className="w-full rounded-lg border-2 border-slate-700"/>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-bold">
                  📷 다시 촬영
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className={`w-full py-6 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${
                  isError ? 'bg-red-700 hover:bg-red-600' : 'bg-amber-700 hover:bg-amber-600'
                }`}>
                <Camera className="w-6 h-6"/> 사진 촬영
              </button>
            )}
          </div>

          {/* 실오류 입력 */}
          {isError && (
            <>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">기존 실번호</div>
                <input
                  type="text"
                  value={sealOrig}
                  onChange={e => setSealOrig(e.target.value.toUpperCase())}
                  placeholder="기존 실번호"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm mono text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">발견된 실번호</div>
                <input
                  type="text"
                  value={sealNew}
                  onChange={e => setSealNew(e.target.value.toUpperCase())}
                  placeholder="현장에서 발견한 실번호"
                  className="w-full bg-slate-800 border-2 border-red-700 rounded px-3 py-2 text-sm mono text-red-100 focus:outline-none focus:border-red-400"
                />
              </div>
            </>
          )}

          {/* 데미지 종류 (다중) */}
          {!isError && (
            <>
              <div>
                <div className="text-xs font-bold text-amber-300 mb-2">데미지 종류 (다중 선택)</div>
                <div className="grid grid-cols-2 gap-1">
                  {DAMAGE_TYPES.map(d => (
                    <label key={d.code} className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-[11px] ${
                      damageTypes.includes(d.code) ? 'bg-amber-900/60 border border-amber-500' : 'bg-slate-800 hover:bg-slate-700'
                    }`}>
                      <input type="checkbox" checked={damageTypes.includes(d.code)} onChange={() => toggleType(d.code)} className="w-3.5 h-3.5"/>
                      <span className={`font-bold ${damageTypes.includes(d.code) ? 'text-amber-100' : 'text-slate-300'}`}>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-amber-300 mb-2">부위 (다중 선택)</div>
                <div className="grid grid-cols-2 gap-1">
                  {DAMAGE_PARTS.map(p => (
                    <label key={p.code} className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-[11px] ${
                      damageParts.includes(p.code) ? 'bg-amber-900/60 border border-amber-500' : 'bg-slate-800 hover:bg-slate-700'
                    }`}>
                      <input type="checkbox" checked={damageParts.includes(p.code)} onChange={() => togglePart(p.code)} className="w-3.5 h-3.5"/>
                      <span className={`font-bold ${damageParts.includes(p.code) ? 'text-amber-100' : 'text-slate-300'}`}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 추가 설명 */}
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">추가 설명 (선택)</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isError ? '추가 설명' : '예: 좌측면 30cm 길이 손상'}
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-3">
          <button onClick={handleSend} disabled={sending || !photoBlob}
            className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${
              isError ? 'bg-red-700 hover:bg-red-600' : 'bg-amber-700 hover:bg-amber-600'
            } disabled:opacity-50`}>
            <Send className="w-5 h-5"/> {sending ? '전송 중...' : '카톡으로 전송'}
          </button>
          <div className="text-[10px] text-slate-500 text-center mt-1">
            💡 사진 + 메시지가 카톡 공유창에 자동 들어갑니다
          </div>
        </div>
      </div>
    </div>
  );
}
