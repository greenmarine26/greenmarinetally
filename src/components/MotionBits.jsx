// 역할: 홈·수석 상황판 «움직이는 그림» 부품 — 숫자가 올라가는 CountUp · 모션 줄이기 설정을 한 곳에서 읽는다(5.02).
import React, { useEffect, useRef, useState } from 'react';

//  운영체제의 «움직임 줄이기» 설정이면 숫자도 바로 값으로 찍는다(막대·깜빡임은 index.css 가 같은 설정으로 끈다).
export function reducedMotion() {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

//  숫자 올라가기 — 처음 그려질 때 0 에서, 값이 바뀌면 이전 값에서 새 값까지. 끝 값은 항상 정확히 value 다.
export function CountUp({ value, ms = 900, className = '' }) {
  const to = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [shown, setShown] = useState(() => (reducedMotion() ? to : 0));
  const from = useRef(reducedMotion() ? to : 0);   // 지금 화면에 찍힌 값(애니메이션 도중 값이 바뀌어도 거기서 이어 올라간다)
  useEffect(() => {
    if (reducedMotion() || from.current === to) { from.current = to; setShown(to); return undefined; }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const v = Math.round(a + (to - a) * (1 - Math.pow(1 - p, 3))); from.current = v; setShown(v);
      if (p < 1) raf = requestAnimationFrame(step); else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); };
  }, [to, ms]);
  return <span className={className} data-count-to={to}>{shown}</span>;
}
