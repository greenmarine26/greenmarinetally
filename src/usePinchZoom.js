// 두 손가락 확대(핀치) 한 벌 — 베이플랜·베이뷰·베이 상세·카고플랜이 같은 처리를 쓴다(4.80, 검수사 «조금만 키워도 민감하게 반응하여 너무 커지거나 베이범위를 넘어 다른곳으로 이동»).
//   불안정했던 까닭(소스 근거) — ① React onTouchMove 는 passive 라 preventDefault 가 안 먹어(베이 상세·카고플랜) 브라우저 페이지 확대가 같이 걸리고
//   ② touch-action 이 없어 브라우저가 핀치를 먼저 가로채며 ③ 거리비를 그대로 곱해 손가락이 조금만 움직여도 배율이 튀었고
//   ④ 시작 거리가 0 이면 비가 무한대가 되어 300% 로 박혔다(V8.25-01 에서 한 군데만 고침) ⑤ 베이뷰의 베이 그림(BayPlan onlyBay)은 핀치 처리 자체가 없었다.
//   한 벌 규칙 — 요소에 touch-action: pan-x pan-y(브라우저 핀치 차단·한 손가락 스크롤은 그대로) + 비 passive 리스너 + 불감대 + 완화(거듭제곱) + 한 번 움직임 상한 + 세 손가락 이상은 무시.
import { useEffect, useRef } from 'react';

export const PINCH_DEAD_PX = 6;      // 두 손가락 사이가 이만큼 변하기 전에는 배율을 건드리지 않는다
export const PINCH_EXP = 0.6;        // 거리비의 거듭제곱 — 1 이면 손가락 비율 그대로(민감), 작을수록 느긋
export const PINCH_STEP = 0.06;      // 한 번 움직임에 바뀔 수 있는 최대 비율(±6%)

/** 배율 계산 한 벌 — 시작 배율·시작 거리·지금 거리·직전 배율 → 다음 배율. 시작 거리가 없거나 불감대 안이면 직전 배율 그대로. */
export function pinchNext(startZoom, startDist, dist, lastZoom, min, max) {
  const last = Number.isFinite(lastZoom) ? lastZoom : startZoom;
  if (!(startDist > 0) || !(dist > 0) || Math.abs(dist - startDist) < PINCH_DEAD_PX) return last;
  let next = startZoom * Math.pow(dist / startDist, PINCH_EXP);
  next = Math.min(last * (1 + PINCH_STEP), Math.max(last * (1 - PINCH_STEP), next));
  return Math.min(max, Math.max(min, next));
}

const distOf = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

/** ref 요소에 핀치 확대를 건다. getZoom() 은 지금 배율, setZoom(v) 는 새 배율. 요소가 바뀌면(조건부 렌더) 다시 건다. */
export function usePinchZoom(ref, getZoom, setZoom, { min = 0.15, max = 3 } = {}) {
  const fnRef = useRef({ getZoom, setZoom, min, max });
  fnRef.current = { getZoom, setZoom, min, max };
  const attached = useRef({ el: null, off: null });
  useEffect(() => {
    const el = ref && ref.current;
    if (el === attached.current.el) return undefined;       // 같은 요소면 그대로 둔다
    if (attached.current.off) attached.current.off();
    attached.current = { el: null, off: null };
    if (!el) return undefined;
    const st = { active: false, startDist: 0, startZoom: 1, last: 1 };
    const prevTA = el.style.touchAction;
    el.style.touchAction = 'pan-x pan-y';                    // 브라우저 페이지 확대가 핀치를 먼저 가져가지 못하게
    const onStart = (e) => {
      if (e.touches && e.touches.length === 2) {
        const d = distOf(e.touches);
        const z = Number(fnRef.current.getZoom());
        st.active = d > 0; st.startDist = d; st.startZoom = z > 0 ? z : 1; st.last = st.startZoom;
      } else st.active = false;                              // 한 손가락·세 손가락 이상은 핀치가 아니다
    };
    const onMove = (e) => {
      if (!st.active || !e.touches || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const f = fnRef.current;
      const next = pinchNext(st.startZoom, st.startDist, distOf(e.touches), st.last, f.min, f.max);
      if (next !== st.last) { st.last = next; f.setZoom(next); }
    };
    const onEnd = (e) => { if (!e.touches || e.touches.length < 2) st.active = false; };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    const off = () => {
      el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd);
      el.style.touchAction = prevTA;
    };
    attached.current = { el, off };
    return undefined;
  });
  useEffect(() => () => { if (attached.current.off) attached.current.off(); attached.current = { el: null, off: null }; }, []);
}
