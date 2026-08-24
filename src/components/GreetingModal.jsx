// 로그인/로그아웃 인사 모달 (M3.6)
import React, { useEffect, useState } from 'react';
import { useBackHandler } from '../backHandler.js';   // TallyOne 1.0 (K3): 안드로이드 뒤로가기 = 닫기

export default function GreetingModal({ type, lines, workForecast, onClose }) {
  // 자동 닫힘 카운트다운 (로그인 12초 · 로그아웃 15초 — 2.20 부터 미르 10초 쇼가 돌아간다)
  const totalSec = type === 'login' ? 12 : 15;
  const [remaining, setRemaining] = useState(totalSec);

  // TallyOne 1.0 (K3): 폰 뒤로가기로도 인사 모달을 닫는다 (앱 이탈 방지)
  useBackHandler(onClose, true);

  useEffect(() => {
    if (remaining <= 0) {
      onClose();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onClose]);

  const isLogin = type === 'login';

  /* ★ 2.20 (검수사 지시) — **로그아웃 인사를 「미르 10초 쇼」로 바꾼다.**
       왜 하필 여기인가: 소리는 «사람이 누른 뒤»에만 브라우저가 허용한다.
       로그아웃은 손으로 누른 동작이라 **여기서는 소리가 난다.** (앱 켜질 때 넣었으면
       그림만 나오고 소리는 안 났을 자리다 — 그래서 로딩화면 대신 여기로 왔다.)
       10초도 여기서는 부담이 아니다. 일이 끝난 뒤니까.
     ⚠ 쇼는 시안 원본을 **그대로** 쓴다(`intro.html`). 다시 그리면 로고 그림이 달라진다 —
       로고는 시안 안에 이미지로 박혀 있다.
     ⚠ 인사 문구는 **버리지 않는다.** 「오늘 N시간 작업하셨습니다」는 지어낸 말이 아니라
       실제 근무 시간이다. 쇼 위 아래에 얹는다. */
  if (!isLogin) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <iframe
          src="./intro.html?auto=1"
          title="미르 인사"
          className="flex-1 w-full border-0"
          allow="autoplay"
        />
        <div className="shrink-0 bg-ink-950/95 border-t border-line px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {lines.map((line, i) => (
              <div key={i} className={`${i === 0 ? 'text-[15px] font-black text-white' : 'text-xs2 text-dim-200'} leading-snug truncate`}>
                {line}
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="h-12 px-5 shrink-0 rounded-pill bg-act text-act-on font-bold text-sm whitespace-nowrap"
          >
            로그아웃 완료
          </button>
        </div>
      </div>
    );
  }

  const bgGradient = isLogin
    ? 'from-emerald-900 via-teal-900 to-blue-900'
    : 'from-purple-900 via-indigo-900 to-slate-900';
  const borderColor = isLogin ? 'border-emerald-500' : 'border-purple-500';
  const titleColor = isLogin ? 'text-emerald-300' : 'text-purple-300';
  const title = isLogin ? '✨ 환영합니다' : '👋 수고하셨습니다';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-gradient-to-br ${bgGradient} border-2 ${borderColor} rounded-card w-full max-w-md p-6 shadow-card max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`text-xs font-bold ${titleColor} mb-3 uppercase tracking-wider`}>
          {title}
        </div>

        <div className="space-y-3 mb-4">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${i === 0 ? 'text-2xl font-black text-white' : 'text-base text-dim-100'} leading-snug`}
            >
              {line}
            </div>
          ))}
        </div>

        {/* M3.68: 근무 시간대 예보 (로그인 시만) */}
        {isLogin && workForecast && workForecast.length > 0 && (
          <div className="mb-4 p-3 bg-ink-900/50 border border-line-strong rounded-pill">
            <div className="text-2xs font-bold text-dim-300 mb-2 uppercase">근무 시간 예보</div>
            <div className="space-y-1.5">
              {workForecast.map((line, i) => (
                <div key={i} className="text-sm font-mono text-dim-100">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 text-xxs text-dim-300">
          <div className="flex-1 bg-ink-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full ${isLogin ? 'bg-emerald-500' : 'bg-purple-500'} transition-all duration-1000`}
              style={{ width: `${(remaining / totalSec) * 100}%` }}
            />
          </div>
          <span className="font-mono">{remaining}s</span>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-3 rounded-pill font-bold text-base ${
            isLogin
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {isLogin ? '시작하기' : '로그아웃 완료'}
        </button>
      </div>
    </div>
  );
}
