// 화면 밝기·소리 크기를 그 기기에서만 바꾸는 설정 모달 (TallyOne 2.40)
//
//   검수사 확정 2026-08-25 —
//     «앱을 다른 사무실 컴에서 사용해보니 앱이 너무 어둡고 캄캄합니다.»
//     «컴화면을 조정해도 되긴 하는데 검수앱 하나때문에 전체 화면을 바꾸기는 어렵습니다.»
//     «쉽게 컴에선 한다는건 일반 업무용과 같으면 됩니다. 더 바라는건 없습니다.»
//
//   ⚠ 설정은 **기기마다 따로**다(localStorage). 사무실 컴은 밝게, 배에서 쓰는 폰은 어둡게 —
//     같은 사람이라도 기기가 다르면 답이 다르다. 계정에 묶으면 폰까지 같이 밝아진다.
//   ⚠ 값은 여기서 만들지 않는다. utils 의 BRIGHT_STEPS·VOLUME_STEPS 가 단일 소스다.
import React, { useState } from 'react';
import { X, Sun, Volume2 } from 'lucide-react';
import {
  BRIGHT_STEPS, VOLUME_STEPS,
  getBrightness, applyBrightness, getVolumeStep, setVolumeStep,
} from '../utils.js';
import { speak } from '../voice.js';

export default function DisplaySettingsModal({ open, onClose }) {
  const [bright, setBright] = useState(getBrightness);
  const [vol, setVol] = useState(getVolumeStep);
  if (!open) return null;

  //  누르는 즉시 화면이 바뀐다 — 「적용」 버튼을 따로 두지 않는다.
  //  되돌리기가 그 자리에서 되는 조작이라 확인을 붙이면 잔소리가 된다(작업표준 2-0-B 4번).
  const pickBright = (n) => { setBright(applyBrightness(n)); };
  const pickVol = (n) => {
    setVol(setVolumeStep(n));
    //  소리는 귀로 확인해야 정해진다. 고른 즉시 그 크기로 한 마디 들려준다.
    if (n > 0) setTimeout(() => speak('소리 크기 이 정도예요.', { conversational: true }), 60);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose}/>
      <div className="fixed inset-x-3 top-16 z-[61] mx-auto max-w-md bg-ink-850 border border-line-strong rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <Sun className="w-5 h-5 text-st-lodHi"/>
          <span className="text-sm2 text-dim-100 font-bold">화면 · 소리</span>
          <button onClick={onClose} aria-label="닫기" className="ml-auto p-1 -mr-1">
            <X className="w-5 h-5 text-dim-300"/>
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="text-2xs text-dim-300 mb-2">화면 밝기 — 이 기기에서만 바뀝니다</div>
          <div className="grid grid-cols-2 gap-2">
            {BRIGHT_STEPS.map((s) => (
              <button key={s.n} onClick={() => pickBright(s.n)}
                className={`rounded-btn border px-3 py-2.5 text-left ${
                  bright === s.n ? 'border-act bg-act/10' : 'border-line-faint bg-ink-800'}`}>
                <div className={`text-sm2 font-bold ${bright === s.n ? 'text-act' : 'text-dim-100'}`}>{s.label}</div>
                <div className="text-3xs text-dim-400 mt-0.5">{s.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 border-t border-line">
          <div className="text-2xs text-dim-300 mb-2 mt-2 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5"/>소리 크기
          </div>
          <div className="grid grid-cols-4 gap-2">
            {VOLUME_STEPS.map((s) => (
              <button key={s.n} onClick={() => pickVol(s.n)}
                className={`rounded-btn border px-2 py-2 text-center text-xs2 font-bold ${
                  vol === s.n ? 'border-act bg-act/10 text-act' : 'border-line-faint bg-ink-800 text-dim-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-3xs text-dim-400 mt-2">
            미르에게 말로도 됩니다 — 「화면 밝게」 · 「소리 줄여줘」 · 「조용히 해」
          </div>
        </div>
      </div>
    </>
  );
}
