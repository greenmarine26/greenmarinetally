// 칸에 맞춰 그림을 자동 축소·확대하는 상자(FitBox) — 수석 실시간 작업 보드(3.11·3.19)와 베이뷰 작업(3.48)이 같은 한 벌을 쓴다. ChiefDashboard 에 있던 것을 옮겼다(동작 무변경).
import React, { useState, useEffect } from 'react';

//  3.11: 그림을 칸 **폭**에 맞춰 자동 축소 — 검수사 «베이그림은 너무 큽니다. 화면을 벗어남» · «전체화면으로 놓으면 베이가 안보입니다».
//    폭만 재서 배율을 정하고 높이는 배율만큼 줄어든 자연 높이로 둔다(높이를 flex 에 맡기면 0 이 돼 그림이 통째로 잘린다 — 실측). 키우지는 않는다.
//    검수사 «스크롤 없는상태 에서 최적의 화면을» — 폭뿐 아니라 **줄 높이(maxH)** 에도 맞춘다(둘 중 작은 배율). 그래서 해치 두 장을 쌓아도 한 줄 안에 든다.
//    검수사 «밑에 여백이 너무 많습니다» — fill 이면(가로 배치 = 줄 높이가 정해진 PC) 칸이 실제로 받은 높이(box.clientHeight)를 재서 그 높이까지 꽉 채운다.
//    fill 이 아니면(폰 세로 쌓임 = 높이가 안 정해짐) 폭 + maxH 추정으로 맞추고 높이를 명시한다(높이를 flex 에 맡기면 0 이 돼 통째로 잘린다 — 실측). 키우지는 않는다는 말은 틀렸다 — 칸에 맞춰 키운다(상한 2.5).
//    ★ fill 의 높이는 flex 가 준 칸 높이가 아니라 **카드(줄) 바닥까지 남은 거리**로 잰다(boundsRef) — flex 사슬은 어디 하나만 auto 여도 칸 높이 = 내용 높이가 돼
//      배율이 1 에 묶인다(검수사 «저와 보는 관점이 틀리신가 봅니다» — 큰 화면에서 밑·오른쪽이 비던 원인).
//  ★ 3.19 — `onFit`·`force` 를 받는다. 검수사 2026-09-06 «이화면만 균등크기로 조정해주고 확대시 중앙정렬되게 해주시고».
//    호기 칸마다 제 그림에 맞춰 배율을 따로 잡으니 **칸마다 그림 크기가 달랐다**(실화면 — 4호기만 크게 보였다).
//    ⇒ 각 칸이 «나 혼자면 이 배율»을 알려 주고(`onFit`), 카드가 그중 **가장 작은 것**을 골라 전부에 되돌려 준다(`force`).
//    그러면 한 배의 호기 칸들이 같은 크기로 선다.
export function FitBox({ children, className = '', maxH = null, fill = false, boundsRef = null, boost = 1, onFit = null, force = null }) {
  const boxRef = React.useRef(null); const innerRef = React.useRef(null);
  const [fit, setFit] = useState({ s: 1, h: null, x: 0 });
  useEffect(() => {
    const box = boxRef.current, inner = innerRef.current; if (!box || !inner) return undefined;
    const measure = () => {
      const bw = box.clientWidth, iw = inner.scrollWidth, ih = inner.scrollHeight;
      if (!bw || !iw || !ih) return;
      let bh = 0;
      if (fill) {
        const bounds = boundsRef && boundsRef.current;
        //  3.49-01: bounds 가 스크롤 칸이면(베이뷰 아래 칸) 스크롤한 만큼 box 가 위로 올라가 bh 가 부풀어 그림이 자란다(감사 실측 0.73→0.85) — 스크롤량을 뺀다. 안 스크롤한 칸(수석 보드 카드)은 0.
        if (bounds) { const r = box.getBoundingClientRect(), c = bounds.getBoundingClientRect(); bh = Math.floor(c.bottom - r.top) - 6 - (bounds.scrollTop || 0); }
        if (!(bh > 0)) bh = box.clientHeight;
      }
      const mh = fill ? bh : (typeof maxH === 'function' ? maxH() : maxH);
      //  검수사 «지금이 아까보다 밑과 우측에 여백이 더 생겼습니다» — 배율을 1 로 막아 두면 큰 화면에서 그림이 칸보다 작아 양쪽이 빈다. 칸에 맞춰 키우기도 한다(상한 2.5 — DOM 변환이라 글자는 또렷하다).
      //  검수사 «베이를 중앙정렬 해주시고 1.05배를 해주세요» · «지금의 1.05배 더요» — 맞춘 배율 그대로(3.11-01 — ×1.05³ 는 잘림), 남는 폭의 절반만큼 오른쪽으로 밀어 가운데 둔다
      //  3.11-01: ×1.05³ 는 미리보기(카드가 화면보다 컸다)에서 정한 값 — 실제 줄에선 높이가 먼저 닿아 밑 두 단이 잘렸다(검수사 화면 실측). 칸에 **딱** 맞춘다.
      //  ★ 3.17 — 검수사 «작업이 2척이다 보니 수석 화면이 작아 졌습니다. 확대기능 가능한지요?»
      //    척수로 높이를 등분하니 2척이면 그림이 반이 된다. 맞춤 배율에 **사람이 정한 배율**을 곱한다.
      //    1보다 크면 칸을 넘치므로 그 칸 안에서만 스크롤한다 — 보드 전체가 밀리지 않게.
      const z = Number(boost) > 0 ? Number(boost) : 1;
      const own = Math.min(2.5, bw / iw, (mh && mh > 0) ? mh / ih : 2.5);
      if (onFit) onFit(own);                       // 3.19: «나 혼자면 이 배율» — 카드가 모아 가장 작은 것을 고른다
      const base = (Number(force) > 0 ? Number(force) : own);
      const s = base * z; const h = Math.ceil(ih * s);
      //  3.19: 확대해도 가운데 — 칸보다 좁으면 여백을 반씩, 넓으면 스크롤을 가운데로 민다.
      const x = Math.max(0, Math.floor((bw - iw * s) / 2));
      setFit((f) => (Math.abs(f.s - s) < 0.005 && f.h === h && f.x === x) ? f : { s, h, x });
      if (z > 1 && iw * s > bw) { try { box.scrollLeft = Math.floor((iw * s - bw) / 2); } catch (e) { /* 스크롤 못 옮겨도 그림은 보인다 */ } }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) { ro.observe(box); ro.observe(inner); }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [children, maxH, fill, boost, force]);
  return (
    <div ref={boxRef} className={`${Number(boost) > 1 ? 'overflow-auto' : 'overflow-hidden'} w-full ${className}`} style={fit.h != null ? { height: fit.h } : undefined}>
      <div ref={innerRef} style={{ transform: `translateX(${fit.x || 0}px) scale(${fit.s})`, transformOrigin: 'top left', width: 'max-content' }}>{children}</div>
    </div>
  );
}
