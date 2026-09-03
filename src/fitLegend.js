// 별첨 상자가 넘치지 않게 글자 크기를 «실제로 재서» 줄이는 함수. 최대 발생조건(선사·포트·특수화물이 많을 때)용.
//
//  ★ 3.7-05 — 검수사 *«크기를 맞춰도 이런 조건이면 선사가 많거나 포트가 많거나 특수 화물이 많으면
//    겹칩이 일어납니다. 최대 발생조건을 생각하셔야 합니다.»*
//
//  종전 legendFont 는 «한 줄에 박스 몇 개냐»만 보고 정했다 — 표가 몇 줄인지는 식에 아예 없었다.
//  그래서 포트 다섯·특수화물 여럿인 항차에서 별첨2·3 의 «합계» 줄이 잘렸다.
//  계산으로 맞히려 해도 머리글·바닥글·테두리·줄간격이 배마다 달라 어긋난다.
//  ⇒ 그리고 나서 **브라우저에 직접 물어본다.** 넘치면 한 눈금 줄이고 다시 잰다.
//    인쇄 전에 끝나는 동기 작업(useLayoutEffect)이라 화면이 깜빡이지 않는다.

const MIN = 4.6;      // 이보다 작으면 종이에서 못 읽는다 — 여기까지 줄여도 안 되면 그대로 둔다(잘리는 것을 숨기지 않는다)
const STEP = 0.25;

/** 상자 하나를 맞춘다. 맞았으면 true, 하한까지 줄여도 넘치면 false. */
function fitOne(box) {
  const inner = box.firstElementChild;
  if (!inner) return true;
  let f = parseFloat(box.style.getPropertyValue('--lgf')) || 9.5;
  //  1px 여유 — 소수점 반올림으로 마지막 줄이 잘리는 것을 막는다.
  const fits = () => inner.scrollHeight <= box.clientHeight - (box.clientHeight - inner.clientHeight) + 1
    && inner.scrollHeight <= inner.clientHeight + 1;
  let guard = 40;
  while (!fits() && f > MIN && guard-- > 0) {
    f = Math.max(MIN, Math.round((f - STEP) * 100) / 100);
    box.style.setProperty('--lgf', `${f}px`);
  }
  return fits();
}

/** 한 페이지의 별첨 상자를 전부 맞춘다. 못 맞춘 상자 수를 돌려준다(조용히 넘어가지 않게). */
export function fitLegendBoxes(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  let bad = 0;
  for (const box of root.querySelectorAll('.cpv2-legend-box')) {
    if (!fitOne(box)) bad++;
  }
  if (bad) console.warn('[별첨] 하한까지 줄여도 넘치는 상자', bad, '개 — 표가 너무 길다');
  return bad;
}
