// 홈 카드·진단 경고에서 «그 컨» 으로 바로 데려가는 쪽지 한 장 — 화면 사이를 건너는 한 번짜리 신호다(3.53).
//   검수사 2026-09-16 *«진행상황에서 선박명 옆빈곳에 발생된 문제 알림을 주었으면 합니다.
//   둘중 한군데를 누르면 상세카드가 나오고 수정 할수 있게»*
//   ⚠ 주소(해시)에 컨번호를 싣지 않는다 — 라우트 모양을 바꾸면 옛 딥링크·뒤로가기가 흔들린다.
//     `updateResume.js` 가 쓰는 방식 그대로, 모듈 변수에 한 번 놓고 **한 번 읽으면 사라진다.**
let _focus = null;

export function setPodFocus(v) {
  _focus = (v && v.voyageKey && v.cn) ? { voyageKey: String(v.voyageKey), mode: v.mode || null, cn: String(v.cn).toUpperCase() } : null;
}

/** 이 항차 것이면 꺼내 주고 지운다(한 번짜리). 다른 항차 것이면 그대로 둔다. */
export function consumePodFocus(voyageKey) {
  if (!_focus) return null;
  if (voyageKey && _focus.voyageKey !== voyageKey) return null;
  const f = _focus;
  _focus = null;
  return f;
}
