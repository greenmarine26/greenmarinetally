// 로그아웃하지 않은 검수원이 쥔 호기를 찾는다 — 로그인 선택 화면이 같은 호기를 둘이 고르지 못하게 막는 데 쓴다
//   검수사 2026-11-06 22:19~22:21 «최원형이 로그아웃을 안하면 3호기 작업중입니다. 다른 사람이 3호기 오등록을 하지 못하도록 보여주고 있어야» ·
//   «회사 방침이 주야 각1인이 한크레인씩 담당합니다. 크레인 대체시에는 이동할수 있지만요»
//   ⚠ 앱을 닫아 로그아웃이 안 된 채 남은 사람이 호기를 영원히 막지 않게, 마지막 활동이 STALE_MS 보다 오래되면 놓아준다.
export const EQUIP_HOLD_STALE_MS = 4 * 3600 * 1000;
const SKIP_HOLDERS = ['클로드'];

export function equipHolderOf(inspectors, voyageKey, equip, myName, now = Date.now()) {
  if (!voyageKey || !equip) return '';
  for (const i of Object.values(inspectors || {})) {
    if (!i || !i.name || i.name === myName || SKIP_HOLDERS.includes(i.name)) continue;
    if (i.loggedIn !== true || i.workMode === 'view') continue;
    if (i.assignVoyage !== voyageKey || i.assignEquip !== equip) continue;
    if (i.loggedOutAt && i.loginAt && i.loggedOutAt > i.loginAt) continue;
    const at = Number(i.lastActive) || Number(i.assignAt) || 0;
    if (!at || now - at > EQUIP_HOLD_STALE_MS) continue;
    return i.name;
  }
  return '';
}
