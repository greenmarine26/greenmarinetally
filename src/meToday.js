// 오늘 이 기기에서 로그인한 «본인» 이름을 하루 기억한다 — 로그인 화면에서 매번 이름을 입력하지 않게.
//
// 2.22 (검수사 확정 2026-08-23) — *«한번 로그인하면 그날 하루는 **본인것은 지워지지 않게**
//   매번 이름을 넣지 않게. 아까도 이야기 했듯이 **로그인중인 사람과 본인은 보이게** 해야 한다고.»*
//
// 2.12-01 은 목록을 «지금 로그인한 사람»만 남겼다. 그 자체는 맞는데, **본인이 로그아웃하거나
// 30분 신선도가 지나면 본인 이름까지 목록에서 사라졌다.** 그러면 다시 들어올 때마다 이름을 쳐야 한다.
// → 목록 = **지금 로그인한 사람 ∪ 오늘 이 기기에서 로그인한 본인**.
//
// ⚠ 기기에만 둔다(localStorage). 서버에 올리면 «어느 기기에서 로그인했나»가 흐려지고,
//   같은 폰을 두 사람이 쓰는 경우를 다룰 수 없다. 이건 그 기기 주인의 편의값이다.
// ⚠ 날짜는 **KST 기준**(작업표준 §2-0). 기기 시간대가 달라도 평택 날짜로 끊는다.
// ⚠ 저장 실패(사파리 프라이빗 등)는 조용히 넘긴다 — 편의값이라 없어도 앱은 돌아간다.

const KEY = 'tallyone_me_today';

/** 평택(KST) 기준 오늘 YYYY-MM-DD. */
export function ymdKST(ts = Date.now()) {
  return new Date(ts + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 로그인 확정 시 호출 — 오늘 날짜와 함께 이름을 기억한다. */
export function rememberMe(name) {
  const n = String(name || '').trim();
  if (!n) return;
  try { localStorage.setItem(KEY, JSON.stringify({ name: n, ymd: ymdKST() })); } catch (e) { /* 편의값 */ }
}

/** 오늘 이 기기에서 로그인한 본인 이름. 날이 바뀌었거나 없으면 ''. */
export function getMeToday() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!v || !v.name) return '';
    if (v.ymd !== ymdKST()) return '';   // 날이 바뀌었다 — 오늘의 본인이 아니다
    return String(v.name);
  } catch (e) { return ''; }
}

/** 기억을 지운다(다른 사람에게 기기를 넘길 때). */
export function forgetMe() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 편의값 */ }
}
