// M5.25: PORT-MIS 캡처 업로드 모달 (폰 전용 활용)
//   사용자가 폰 Chrome으로 PORT-MIS 검색 → 화면 캡처 → 이 모달에 업로드
//   → Gemini Vision OCR → Firebase port_mis_data 저장 → 모든 검수원에게 ⚓ 카드 표시
import React, { useState } from 'react';
import { X, Camera, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ocrPortMisCapture } from '../mixerUpload.js';
import { fbSavePortMisBatch } from '../firebase.js';
import { _storage, SK } from '../utils.js';
import { GEMINI_API_KEY } from '../gemini.js';

export default function PortMisCaptureModal({ onClose }) {
  const [step, setStep] = useState('pick');  // pick → analyzing → review → saving → done
  const [imageUrl, setImageUrl] = useState(null);
  const [ships, setShips] = useState([]);
  const [error, setError] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageUrl(URL.createObjectURL(f));
    setError(null);
    setStep('analyzing');

    // M5.70: 사용자 입력 키 > 내장 키 폴백
    const key = _storage.get(SK.geminiKey) || GEMINI_API_KEY;
    if (!key) {
      setError('Gemini API 키 없음 (관리자에게 문의)');
      setStep('pick');
      return;
    }

    try {
      const result = await ocrPortMisCapture(f, key);
      if (!result || result.length === 0) {
        setError('이미지에서 선박 정보를 추출하지 못했습니다. 더 선명한 캡처로 다시 시도해주세요.');
        setStep('pick');
        return;
      }
      setShips(result);
      setStep('review');
    } catch (err) {
      setError(err.message || String(err));
      setStep('pick');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      const r = await fbSavePortMisBatch(ships);
      setSaveResult(r);
      setStep('done');
    } catch (err) {
      setError(err.message || String(err));
      setStep('review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-slate-900 w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl max-h-[95vh] overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-cyan-300">📸 PORT-MIS 캡처 업로드</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1">
          {/* 단계 1: 파일 선택 */}
          {step === 'pick' && (
            <div>
              <p className="text-slate-300 text-sm mb-3">
                폰 Chrome으로 PORT-MIS 선박입출항현황 검색 후 <strong className="text-amber-300">화면 캡처 1장</strong>을 올려주세요.
                Gemini Vision이 자동으로 호출부호/선박명/입출항 시간을 추출해 모든 검수원과 공유합니다.
              </p>
              {error && (
                <div className="bg-red-950/50 border border-red-700 rounded p-3 mb-3 text-red-300 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
              <label className="block bg-cyan-600 hover:bg-cyan-700 text-white text-center font-bold py-4 rounded-lg cursor-pointer flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                캡처 이미지 선택
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                💡 팁: 평택항 + 입출항 기간으로 검색 후 결과 표가 잘 보이는 상태에서 캡처하면 정확도 ↑.
                작업 중인 선박의 호출부호로 직접 검색하면 더 정확합니다.
              </p>
            </div>
          )}

          {/* 단계 2: 분석 중 */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              {imageUrl && <img src={imageUrl} alt="" className="max-h-48 mx-auto mb-4 rounded border border-slate-700" />}
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
              <p className="text-cyan-300 font-bold">Gemini Vision 분석 중...</p>
              <p className="text-slate-400 text-sm mt-1">10~20초 정도 걸립니다</p>
            </div>
          )}

          {/* 단계 3: 결과 검토 */}
          {step === 'review' && (
            <div>
              <p className="text-emerald-400 font-bold mb-3">✓ {ships.length}척 추출 완료</p>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {ships.map((s, i) => (
                  <div key={i} className="bg-slate-800 rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-cyan-300">{s.callsign || '(콜사인 없음)'}</span>
                      <span className="text-slate-200">{s.vesselName}</span>
                      {s.port && <span className="text-xs text-slate-400">[{s.port}]</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex gap-3">
                      {s.eta && <span>입 {s.eta}</span>}
                      {s.etd && <span>출 {s.etd}</span>}
                      {s.voyageType && <span>[{s.voyageType}]</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSave} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg">
                Firebase 저장 → 모든 검수원에게 공유
              </button>
              <button onClick={() => setStep('pick')} className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm">
                다른 이미지로 다시
              </button>
            </div>
          )}

          {/* 단계 4: 저장 중 */}
          {step === 'saving' && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
              <p className="text-cyan-300">Firebase 저장 중...</p>
            </div>
          )}

          {/* 단계 5: 완료 */}
          {step === 'done' && (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-emerald-300 mb-1">
                {saveResult?.saved || 0}건 저장 완료
              </p>
              {saveResult?.failed > 0 && (
                <p className="text-amber-400 text-sm">실패 {saveResult.failed}건</p>
              )}
              <p className="text-slate-400 text-sm mt-3">
                모든 검수원의 항차 화면에 ⚓ PORT-MIS 카드가 자동 표시됩니다
              </p>
              <button onClick={onClose} className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-8 py-3 rounded-lg">
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
