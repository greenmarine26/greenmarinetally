// 완료 직전 «이 베이는 터미널이 N호기로 기록 중입니다» 를 한 번 묻는 창 — 항차 화면에 붙어 craneAsk 중계에 현재 항차 읽기·묻기를 등록한다
//   검수사 2026-11-10 «입력 시점에 한 번 묻기» (4.85). 판정은 utils.craneAskOf 한 벌. 이 파일은 창과 등록만 맡는다.
import React, { useEffect, useRef, useState } from 'react';
import { registerCraneAsk } from '../craneAsk.js';

export default function CraneAskHost({ voyageKey, voyage }) {
  const vRef = useRef(voyage);
  vRef.current = voyage;
  const [q, setQ] = useState(null);   // { to, from, bay, done(bool) }
  const openRef = useRef(null);       // 열린 질문 { promise, done } — 겹친 호출은 같은 답을 나눠 받는다
  useEffect(() => {
    if (!voyageKey) return undefined;
    const unreg = registerCraneAsk({
      getVoyage: (k) => (k === voyageKey ? vRef.current : null),
      ask: ({ to, from, bay }) => {
        if (openRef.current) return openRef.current.promise;   // 이미 묻는 중 — 같은 답을 쓴다(앞 호출이 영영 멈추지 않게)
        let done;
        const promise = new Promise((resolve) => { done = (yes) => { openRef.current = null; setQ(null); resolve(!!yes); }; });
        openRef.current = { promise, done };
        setQ({ to, from, bay });
        return promise;
      },
    });
    return () => { unreg(); if (openRef.current) openRef.current.done(false); };   // 화면을 떠나면 «그대로» 로 닫는다 — 완료가 멈춘 채 사라지지 않게
  }, [voyageKey]);
  if (!q) return null;
  const close = (yes) => { if (openRef.current) openRef.current.done(yes); };
  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/80 p-4" data-crane-ask="1">
      <div className="bg-ink-900 border border-st-lod rounded-card shadow-card w-full max-w-sm p-4">
        <div className="font-black text-base text-st-lodHi mb-2">호기가 맞습니까?</div>
        <div className="text-sm text-dim-100 leading-relaxed mb-4">
          {q.bay}베이는 터미널이 {q.to}호기로 기록 중입니다. {q.to}호기로 기록할까요?
        </div>
        <div className="grid grid-cols-1 gap-2">
          <button onClick={() => close(true)} data-crane-ask-yes="1" className="py-4 rounded-btn font-black text-base bg-st-lod text-ink-950">{q.to}호기로 기록</button>
          <button onClick={() => close(false)} data-crane-ask-no="1" className="py-3 rounded-btn font-bold text-sm bg-ink-800 text-dim-200 hover:bg-ink-750">{q.from}호기 그대로</button>
        </div>
      </div>
    </div>
  );
}
