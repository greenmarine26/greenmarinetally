// 배 화면 «💬 카톡» 상자 — 수집기가 열린 카톡 방 창에서 읽어 온 이 배 글(voyages/{키}/kakao)을 최신순으로 보인다(TallyOne 5.29)
//   검수사 2026-11-28 «연태 11/4는 실시간 작업내용이 보일것입니다». 기록은 아니다 — 작업 시작·종료와 예보만 수집기가 따로 적는다.
import React, { useState } from 'react';
import { kakaoLinesOf } from '../kakaoLive.js';

const hm = (t) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export default function KakaoLiveBox({ voyage }) {
  const [open, setOpen] = useState(false);
  const lines = kakaoLinesOf(voyage, 40);
  if (!lines.length) return null;
  const last = lines[0];
  return (
    <div className="w-full mb-2 px-3 py-2 rounded-pill border border-yellow-600/60 bg-yellow-950/20 text-left" data-kakao-live={lines.length}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <div className="text-sm font-black text-yellow-200">💬 카톡 {lines.length}줄 <span className="text-xxs font-normal text-dim-300">{open ? '접기' : '펼치기'}</span></div>
        {!open && <div className="text-xxs text-dim-200 mt-0.5 truncate">{hm(last.at)} {last.who} · {String(last.body).split('\n')[0]}</div>}
      </button>
      {open && (
        <div className="mt-1 space-y-1 max-h-72 overflow-y-auto">
          {lines.map((x) => (
            <div key={x.id} className="text-xxs leading-snug">
              <span className="text-dim-400 font-mono">{hm(x.at)}</span>{' '}
              <span className={x.kind === 'crew' ? 'text-sky-300' : 'text-orange-300'}>{x.room}</span>{' '}
              <span className="text-dim-200 font-bold">{x.who}</span>
              <div className="text-dim-100 whitespace-pre-wrap break-all">{x.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
