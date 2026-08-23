// 화면이 넓은가(PC 배치)를 알려주는 훅 — 컴/폰 배치를 JS 로 가를 때 쓴다.
import { useState, useEffect } from 'react';

// 2.18 — 검수사 «반드시 컴용화면 폰용화면이 달라야 합니다. 항목이 다른게 아니고 **디자인 구성 배치**가 달라야».
//   CSS 만으로 가르려면 같은 컴포넌트를 **두 번 그려야** 한다(하나는 lg:hidden, 하나는 hidden lg:block).
//   컨테이너 상세는 Firebase 구독과 입력 상태를 달고 있어 두 벌이 뜨면 **구독도 두 벌**이 된다.
//   그래서 «어디에 그릴지»는 JS 로 정한다 — 인스턴스는 언제나 하나다.
//   ⚠ 앱에 미디어쿼리 훅이 없었다(있던 것은 BayPlan 의 1회성 innerWidth 뿐 — 창을 줄여도 안 바뀐다).
export default function useIsWide(query = '(min-width: 1024px)') {
  const get = () => (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(query).matches : false);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = (e) => setWide(e.matches);
    setWide(mq.matches);
    // 구형 Safari 는 addEventListener 가 없다 — 조용히 실패하지 않게 둘 다 시도한다.
    if (mq.addEventListener) { mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }
    mq.addListener(on); return () => mq.removeListener(on);
  }, [query]);
  return wide;
}
