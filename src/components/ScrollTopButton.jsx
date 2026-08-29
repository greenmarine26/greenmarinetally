// 화면 맨 위로 돌아가는 TOP 버튼 — 스크롤이 긴 화면 공용 한 벌
//
//   ★ 검수사 요청 2026-08-17 «TOP화면버튼» → 수석 대시보드에만 붙어 있었다(1.81-01).
//     2026-08-29 검수사 *«스크롤이 많이 생기는 화면에 **항상** TOP을 넣어 주세요»*
//     ⇒ 대시보드 안에 있던 것을 **그대로** 여기로 올려 한 벌로 쓴다(두 벌 금지).
//       모양·색을 바꾸지 않았다 — 검수사가 이미 쓰던 버튼이라 같아야 알아본다.
//
//   ⚠ 스크롤 주체는 **window** 다. 홈·항차·검색·대시보드 넷 다 최상위가
//     `max-w-* mx-auto px-3 py-3` 라 페이지가 통째로 구른다(실측 2026-08-29).
//     안쪽 div 가 구르는 화면(베이플랜 무대 등)에 붙일 때는 그 컨테이너를 받아야 한다 —
//     지금은 그런 소비처가 없어 만들지 않는다(쓰지 않는 갈래를 미리 만들지 않는다).
import React from 'react';

export default function ScrollTopButton() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } }}
      className="fixed bottom-5 right-4 z-40 w-12 h-12 rounded-full bg-purple-700/90 hover:bg-purple-600 active:scale-95 border border-purple-500/60 shadow-lg shadow-black/40 text-white font-black text-xxs leading-tight"
      title="맨 위로">
      ▲<br/>TOP
    </button>
  );
}
