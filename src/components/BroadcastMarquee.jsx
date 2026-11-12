// 수석 공지를 광고판처럼 흘려보내는 띠 — 로그인된 검수원에게만, "확인" 전까지 계속 흐름.
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

const _useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect;   // 4.87-10: 그리기 전에 잰다(Header 와 같은 꼴)
import { fbSubscribeBroadcast, fbMarkBroadcastRead } from '../firebase.js';

export default function BroadcastMarquee({ inspector }) {
  const [msg, setMsg] = useState(null);
  const [readId, setReadId] = useState(() => {
    try { return localStorage.getItem('gm_broadcast_read') || ''; } catch (e) { return ''; }
  });

  useEffect(() => fbSubscribeBroadcast(setMsg), []);

  //  ★ 4.87-10: 띠 높이를 --bc-h 로 내보낸다(보일 때만 · 확인하면 0). 항차 독·베이 도구줄 sticky top 이 이 높이만큼 더 내려가
  //    공지 띠 뒤로 숨지 않는다(종전 독은 --hdr-h 에 붙어 띠와 같은 자리를 다퉜다).
  const barRef = useRef(null);
  const visible = !!(inspector && msg && msg.text && msg.id && readId !== msg.id);
  _useIsoLayout(() => {
    const put = (h) => { try { document.documentElement.style.setProperty('--bc-h', `${h}px`); } catch (e) { console.warn('[공지 띠] --bc-h 를 못 씀 — 독이 띠 뒤로 숨을 수 있다', e); } };
    const el = barRef.current;
    if (!visible || !el) { put(0); return undefined; }
    const measure = () => put(Math.round(el.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return () => put(0);
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => { ro.disconnect(); put(0); };
  }, [visible]);

  // 로그인된 작업자만. 공지 없거나 이미 확인했으면 표시 안 함.
  if (!inspector) return null;
  if (!msg || !msg.text || !msg.id) return null;
  if (readId === msg.id) return null;

  const onConfirm = () => {
    try { localStorage.setItem('gm_broadcast_read', msg.id); } catch (e) { /* 읽음 표시를 기기에 못 남겨도 화면은 그대로 */ }
    setReadId(msg.id);
    fbMarkBroadcastRead(msg.id, inspector);
  };

  // 글자 수에 따라 흐르는 속도 조정 (길수록 느리게)
  const dur = Math.max(10, Math.min(40, Math.round(String(msg.text).length * 0.45)));

  return (
    <div ref={barRef} data-broadcast-bar="1" className="sticky top-[var(--hdr-h,52px)] z-30 flex items-center gap-2 bg-amber-500 text-ink-950 px-2 py-1 shadow-md border-b-2 border-amber-300">{/* 4.23 2차: 머리띠 실제 높이 밑 */}
      <span className="font-black text-sm shrink-0">📢 수석</span>
      <div className="flex-1 overflow-hidden">
        <div className="gm-marq inline-block whitespace-nowrap font-bold text-sm" style={{ animationDuration: `${dur}s` }}>
          {msg.text}{msg.by ? `   — ${msg.by}` : ''}
        </div>
      </div>
      <button onClick={onConfirm}
        className="shrink-0 text-xs font-black bg-ink-900 text-amber-300 px-3 py-1 rounded hover:bg-ink-750">
        확인
      </button>
      <style>{`@keyframes gm-marq-kf { from { transform: translateX(100%); } to { transform: translateX(-100%); } } .gm-marq { animation-name: gm-marq-kf; animation-timing-function: linear; animation-iteration-count: infinite; }`}</style>
    </div>
  );
}
