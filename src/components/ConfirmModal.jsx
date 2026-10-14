// M3.74: confirm() 대체 모달
// 풀스크린 + 풀 너비 큰 버튼 (44px+) - 모바일 현장 최적화
// 사용: 단순 예/아니오 또는 위험한 작업 확인
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '예',
  cancelLabel = '아니오',
  danger = false,           // true면 빨간색 (삭제 등 되돌릴 수 없는 작업)
  onConfirm,
  onCancel,
  onClose,                  // 4.25-02: ✕(닫기)가 [취소] 단추와 다른 뜻일 때만 준다 — 없으면 종전대로 onCancel
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className={`bg-ink-900 border ${danger ? 'border-st-bad/60' : 'border-line'} rounded-card w-full sm:max-w-md overflow-hidden shadow-card`}>
        {/* 헤더 */}
        <div className={`px-4 py-3 border-b ${danger ? 'bg-st-bad/15 border-st-bad/40' : 'bg-ink-850 border-line'} flex items-center gap-2`}>
          {danger && <AlertTriangle className="w-5 h-5 text-st-bad flex-shrink-0"/>}
          <div className={`flex-1 font-black text-base ${danger ? 'text-st-badHi' : 'text-dim-100'}`}>
            {title || (danger ? '⚠️ 확인 필요' : '확인')}
          </div>
          <button onClick={onClose || onCancel} className="text-dim-400 hover:text-dim-200 p-1">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-4 py-5">
          <div className="text-sm text-dim-100 whitespace-pre-line leading-relaxed">
            {message}
          </div>
        </div>

        {/* 버튼 - 풀 너비 큰 버튼 (44px+) */}
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-line bg-ink-950">
          <button
            onClick={onCancel}
            className="py-3.5 bg-ink-750 hover:bg-ink-700 active:bg-ink-750 text-dim-100 font-bold rounded-btn text-base"
            style={{ minHeight: 60 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`py-3.5 font-bold rounded-btn text-base ${
              danger
                ? 'bg-st-bad hover:brightness-110 active:brightness-95 text-white'
                : 'bg-act hover:bg-act-hi active:bg-act-dn text-act-on'
            }`}
            style={{ minHeight: 60 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// 함수형 헬퍼: 컴포넌트 안에서 useState 한 번 + 호출 한 번으로 confirm 대체
// 사용 예:
//   const [confirmState, askConfirm] = useConfirm();
//   ...
//   askConfirm({
//     title: '완료 취소',
//     message: `${cn} 검수 완료를 취소하시겠습니까?`,
//     onConfirm: async () => { await fbCancelComplete(...); },
//   });
//   ...
//   <ConfirmModal {...confirmState} />
export function useConfirm() {
  const [state, setState] = React.useState({ open: false });
  //  ★ 4.25-02 — 물음 번호. 단추를 눌러 이어진 일이 **곧바로 다음 물음을 열면**(await ask → 또 ask) 앞 물음의 닫기(finally)가 새 물음을 닫아 버려
  //    다음 물음이 영영 안 뜨고 그 일이 멈췄다(감사 — 트윈 «이 한 대만» 뒤 «이 자리 화물이 아닙니다» · 종전에도 단독 수정의 «다른 베이 → 이미 완료된 컨» 이 같았다).
  //    닫기는 «아직 내가 띄운 물음일 때» 만 한다.
  const seqRef = React.useRef(0);

  const askConfirm = React.useCallback((opts) => {
    const my = ++seqRef.current;
    const shut = () => { if (seqRef.current === my) setState({ open: false }); };
    setState({
      open: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel,
      cancelLabel: opts.cancelLabel,
      danger: opts.danger,
      onConfirm: async () => {
        try { await opts.onConfirm?.(); } finally {
          shut();
        }
      },
      onCancel: () => {
        opts.onCancel?.();
        shut();
      },
      //  4.25-02: ✕ 가 «아무것도 안 함» 이어야 하는 물음(두 단추가 둘 다 일을 하는 물음)만 opts.onClose 를 준다.
      onClose: opts.onClose ? () => { opts.onClose(); shut(); } : undefined,
    });
  }, []);

  return [state, askConfirm];
}
