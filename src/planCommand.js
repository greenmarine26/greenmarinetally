// 미르에게 «플랜 보여줘» 라고 한 것인지 가려내는 한 벌 — 검수앱·콘앱이 함께 쓴다
/* ★ 2.87-02 (검수사 2026-08-29 «여기를 꼭 거쳐야 하나요? 창을 닫으면 여기에 있네요»)

   ── 왜 파일로 뺐나
   같은 판정이 **세 군데**에 복사돼 있었다 — mirCore.entry.js(콘앱) · GlobalSearchPage(통합검색)
   · SearchPanel(항차 화면). 오늘 하루에만 «한 곳 고치고 쌍둥이를 놓친» 일이 다섯 번 났다
   (작업표준 §2-2-S). 홈 검색창까지 네 번째 사본을 만들 자리라서, 그 전에 한 벌로 모은다.

   ── 이것은 «답»이 아니라 «화면을 열어라»다
   그래서 여기서는 해석만 하고 **열지 않는다.** 화면 구조는 앱마다 다르니 여는 일은 각 앱이 한다.
   nlSearch.js 가 deviceCmd·startSet 을 다루는 방식 그대로다. */

/**
 * 반환 { mode:'discharge'|'loading'|null, bay:number|null, what:'bay'|'cargo' } · 명령이 아니면 null.
 * ⚠ mode 를 못 정하면 null 을 준다 — 부르는 쪽이 «그 화면에서 보고 있던 쪽»으로 고르라는 뜻이다.
 *   검수사 «양하자리에 있으면 양하 베이플랜 카고플랜을 열게 하면 되고 선적자리에서 말하면 선적꺼».
 */
export function parseViewCommand(query) {
  const t = String(query || '').trim();
  if (!t) return null;
  //  «보여줘/열어/띄워/가자/이동» 이 있어야 명령이다 — «5번 베이» 만 물으면 조회로 답해야 한다.
  if (!/보여|보자|열어|띄워|가\s*자|이동|가\s*줘|펼쳐/.test(t)) return null;

  const mode = /선적|싣|적하|로딩/.test(t) ? 'loading'
    : (/양하|내림|내리|디스차지/.test(t) ? 'discharge' : null);

  const m = t.match(/(\d{1,3})\s*(?:번)?\s*베이|베이\s*(\d{1,3})/);
  const bay = m ? parseInt(m[1] || m[2], 10) : null;

  //  어느 화면을 여는가 — 카고플랜은 «전체 화물 비교», 베이플랜은 «양하·선적 비교»다.
  const what = /카고\s*플랜|카고플렌|적하도|화물\s*플랜/.test(t) ? 'cargo'
    : (/베이\s*플랜|베이플렌|플랜|플렌|도면|계획도/.test(t) || bay != null ? 'bay' : null);
  if (!what) return null;
  return { mode, bay, what };
}
