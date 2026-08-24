// M3.74: window.prompt() 대체 - 다중 선택 모달
// 풀스크린 + 풀 너비 카드형 버튼 (44px+) - 모바일 현장 최적화
// 사용: EDI/리스트 업로드 시 충돌 처리 (교체/병합/신규만 등)
import React from 'react';
import { X } from 'lucide-react';

export default function ChoiceModal({
  open,
  title,
  description,
  options,        // [{ key, label, desc, recommended? }, ...]
  onSelect,       // (key) => void
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-ink-900 border border-line rounded-card shadow-card w-full sm:max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-line bg-ink-800 flex items-center gap-2">
          <div className="flex-1 font-black text-base text-st-lodHi">
            {title}
          </div>
          <button onClick={onCancel} className="text-dim-400 hover:text-dim-200 p-1">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* 설명 */}
        {description && (
          <div className="px-4 py-3 border-b border-line bg-ink-950/50 text-xs text-dim-200 whitespace-pre-line leading-relaxed">
            {description}
          </div>
        )}

        {/* 옵션 카드 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(options || []).map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSelect?.(opt.key)}
              className={`w-full text-left px-4 py-4 rounded-btn border transition active:scale-[0.98] ${
                opt.recommended
                  ? 'bg-ink-800 hover:bg-ink-750 border-act'
                  : 'bg-ink-800 hover:bg-ink-750 border-line'
              }`}
              style={{ minHeight: 56 }}
            >
              <div className={`text-base font-black flex items-center gap-2 ${
                opt.recommended ? 'text-dim-100' : 'text-dim-100'
              }`}>
                {opt.recommended && <span className="text-2xs bg-act text-act-on px-2 py-0.5 rounded-pill">추천</span>}
                {opt.label}
              </div>
              {opt.desc && (
                <div className={`text-xs mt-1 ${opt.recommended ? 'text-act-soft' : 'text-dim-300'}`}>
                  {opt.desc}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 취소 버튼 */}
        <div className="p-3 border-t border-line bg-ink-950">
          <button
            onClick={onCancel}
            className="w-full py-3 bg-ink-750 hover:bg-ink-700 text-dim-100 font-bold rounded-btn text-base"
            style={{ minHeight: 60 }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// 함수형 헬퍼
export function useChoice() {
  const [state, setState] = React.useState({ open: false });

  const askChoice = React.useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        options: opts.options,
        onSelect: (key) => {
          setState({ open: false });
          resolve(key);
        },
        onCancel: () => {
          setState({ open: false });
          resolve(null);
        },
      });
    });
  }, []);

  return [state, askChoice];
}
