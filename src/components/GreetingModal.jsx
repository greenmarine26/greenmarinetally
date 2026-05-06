// 로그인/로그아웃 인사 모달 (M3.6)
import React, { useEffect, useState } from 'react';

export default function GreetingModal({ type, lines, onClose }) {
  // 자동 닫힘 카운트다운 (로그인 시 8초, 로그아웃 시 5초)
  const totalSec = type === 'login' ? 8 : 5;
  const [remaining, setRemaining] = useState(totalSec);

  useEffect(() => {
    if (remaining <= 0) {
      onClose();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onClose]);

  const isLogin = type === 'login';
  const bgGradient = isLogin
    ? 'from-emerald-900 via-teal-900 to-blue-900'
    : 'from-purple-900 via-indigo-900 to-slate-900';
  const borderColor = isLogin ? 'border-emerald-500' : 'border-purple-500';
  const titleColor = isLogin ? 'text-emerald-300' : 'text-purple-300';
  const title = isLogin ? '✨ 환영합니다' : '👋 수고하셨습니다';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-gradient-to-br ${bgGradient} border-2 ${borderColor} rounded-2xl w-full max-w-md p-6 shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`text-xs font-bold ${titleColor} mb-3 uppercase tracking-wider`}>
          {title}
        </div>

        <div className="space-y-3 mb-5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${i === 0 ? 'text-2xl font-black text-white' : 'text-base text-slate-100'} leading-snug`}
            >
              {line}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-400">
          <div className="flex-1 bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full ${isLogin ? 'bg-emerald-500' : 'bg-purple-500'} transition-all duration-1000`}
              style={{ width: `${(remaining / totalSec) * 100}%` }}
            />
          </div>
          <span className="font-mono">{remaining}s</span>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-3 rounded-lg font-bold text-base ${
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
