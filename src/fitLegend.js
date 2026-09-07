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
//  ★ 3.27 — «한 칸에 표기 불가능» 의 잣대(검수사 2026-09-08 — *«나눔건은 조건이 한칸에 표기 불가능할
//    경우만입니다»* · *«축소기능 사용 안하고 평상시대로 사용하면서»*).
//    즉 **글자를 줄여서 억지로 넣은 것은 «들어간 것»이 아니다.** 평상시 크기(legendFontFor 가 정한 값)
//    그대로 한 칸에 안 들어가면 그것이 «표기 불가능»이고, 그때 호출부가 빈 칸으로 나눈다.
//    줄이기는 **나눌 빈 칸이 없을 때만** 쓰는 마지막 수단이다.
const STEP = 0.25;

/** 상자 하나를 맞춘다. 맞았으면 true, 하한까지 줄여도 넘치면 false. */
function fitOne(box) {
  //  ⚠ 평상시 값은 **상자에 새겨 둔 것**(data-lgf0)에서 읽는다. `--lgf` 를 그대로 믿으면,
  //    앞 그림에서 이 함수가 줄여 놓은 값이 남아 있을 때(React 는 같은 값이면 DOM 을 안 되쓴다)
  //    그것을 «평상시»로 오인해 «안 넘쳤다»고 답한다 — 조용한 실패다(규범 §4-3).
  const f0 = parseFloat((box.dataset && box.dataset.lgf0) || '') || parseFloat(box.style.getPropertyValue('--lgf')) || 9.5;
  box.style.setProperty('--lgf', `${f0}px`);
  let f = f0;
  //  ★ 3.27 — **이 안전망은 한 번도 발동한 적이 없었다.**
  //    종전에는 상자의 «첫 자식 하나»(감싸개 div)만 보고 `scrollHeight <= clientHeight` 를 물었는데,
  //    그 감싸개 안의 별첨 칸들이 저마다 `overflow:hidden` 이라 **안엣것이 잘려도 감싸개는 안 넘친다.**
  //    그래서 언제나 «다 들어갔다»로 읽혔고, 실제로는 XTPG 539E 처럼 별첨1 합계 줄이 잘려 나갔다
  //    (검수사 2026-09-08 실화면 — «잘림인지 겹칩인지 구분이 안감»).
  //    ⇒ 상자 자신과 **잘라 내는 칸들을 전부** 훑어 하나라도 넘치면 줄인다.
  const parts = () => [box, ...box.querySelectorAll('.cpv2-legend, .cpv2-legend-slot')];
  //  1px 여유 — 소수점 반올림으로 마지막 줄이 잘리는 것을 막는다.
  const over = () => parts().some((el) => el.scrollHeight > el.clientHeight + 1);
  //  평상시 크기로 이미 넘치는가 — 이것이 «한 칸에 표기 불가능»의 판정이다.
  const tight = over();
  let guard = 40;
  while (over() && f > MIN && guard-- > 0) {
    f = Math.max(MIN, Math.round((f - STEP) * 100) / 100);
    box.style.setProperty('--lgf', `${f}px`);
  }
  return { ok: !over(), tight, from: f0, to: f };
}

/** 한 페이지의 별첨 상자를 전부 맞춘다.
 *  돌려주는 값 — { bad: 하한까지 줄여도 넘치는 상자 수, tight: **평상시 크기로는 안 들어가 줄여야 했던** 상자 수 }.
 *  조용히 넘어가지 않는다(규범 §4-3). tight 가 있으면 호출부가 «한 칸에 표기 불가능»으로 보고 빈 칸으로 나눈다. */
export function fitLegendBoxes(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return { bad: 0, tight: 0 };
  let bad = 0, tight = 0;
  for (const box of root.querySelectorAll('.cpv2-legend-box')) {
    const r = fitOne(box);
    if (!r.ok) bad++;
    if (r.tight) tight++;
  }
  if (bad) console.warn('[별첨] 하한까지 줄여도 넘치는 상자', bad, '개 — 표가 너무 길다');
  return { bad, tight };
}
