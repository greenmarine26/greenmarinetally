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

// 로그인해 있고 이 항차에 작업자로 지정됐지만 지금(90초 안) 입력이 없는 «눈으로만 보는» 사람 이름들 — 화면이 «대기» 로 따로 보인다(작업 중으로 세지 않는다)
//   검수사 2026-11-06 22:57 «작업자는 있습니다. 다만 입력이 없을뿐입니다. 눈으로만 보고 있다는 뜻이죠»
export function standbyNamesOf(inspectors, voyageKey, activeNames = [], visible = () => true, now = Date.now()) {
  if (!voyageKey) return [];
  const have = new Set(activeNames);
  const out = [];
  for (const i of Object.values(inspectors || {})) {
    if (!i || !i.name || have.has(i.name) || i.loggedIn !== true || i.workMode === 'view') continue;
    if (i.assignVoyage !== voyageKey) continue;
    if (i.loggedOutAt && i.loginAt && i.loggedOutAt > i.loginAt) continue;
    const at = Number(i.lastActive) || Number(i.assignAt) || 0;
    if (!at || now - at > EQUIP_HOLD_STALE_MS) continue;
    if (!visible(i.name)) continue;
    out.push(i.name);
  }
  return out;
}
