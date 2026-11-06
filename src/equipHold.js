// 로그아웃하지 않은 검수원이 쥔 호기를 찾는다 — 로그인 선택 화면이 같은 호기를 둘이 고르지 못하게 막는 데 쓴다
//   검수사 2026-11-06 22:19~22:21 «최원형이 로그아웃을 안하면 3호기 작업중입니다. 다른 사람이 3호기 오등록을 하지 못하도록 보여주고 있어야» ·
//   «회사 방침이 주야 각1인이 한크레인씩 담당합니다. 크레인 대체시에는 이동할수 있지만요»
//   검수사 2026-11-07 05:46 «야간 근무시간이 정해져 있습니다. 활동은 없지만 그 검수원이 3호기에서 작업하고 있는건 맞습니다»
//   ⚠ 앱을 닫아 로그아웃이 안 된 채 남은 사람이 호기를 영원히 막지 않게, 마지막 활동이 속한 근무조(주간 08:00~17:30 · 야간 19:00~익일 06:30)가 끝나고 30분이 지나면 놓아준다.
//   (4.75 — 앞 판은 마지막 활동 4시간 고정이라 입력 없이 지켜보는 야간 근무자가 한밤에 풀렸다)
export function equipHoldUntil(at) {
  const KST = 9 * 3600 * 1000, H = 3600 * 1000;
  const k = new Date(at + KST);
  const min = k.getUTCHours() * 60 + k.getUTCMinutes();
  const base = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST;
  const end = (min >= 390 && min < 1050) ? base + 17.5 * H : (min >= 1050 ? base + 24 * H + 6.5 * H : base + 6.5 * H);
  return end + 0.5 * H;
}
const SKIP_HOLDERS = ['클로드'];

export function equipHolderOf(inspectors, voyageKey, equip, myName, now = Date.now()) {
  if (!voyageKey || !equip) return '';
  for (const i of Object.values(inspectors || {})) {
    if (!i || !i.name || i.name === myName || SKIP_HOLDERS.includes(i.name)) continue;
    if (i.loggedIn !== true || i.workMode === 'view') continue;
    //  지금 쥔 호기 — 로그인 때 지정(assignEquip)과 작업 중 바꾼 호기(workEquip) 가운데 더 나중에 정한 쪽(4.74: 작업 중 바꾸는 길도 같은 판정)
    const curEq = (i.lastVoyage === voyageKey && i.workEquip && (Number(i.workAt) || 0) > (Number(i.assignAt) || 0)) ? i.workEquip : (i.assignVoyage === voyageKey ? i.assignEquip : '');
    if (curEq !== equip) continue;
    if (i.loggedOutAt && i.loginAt && i.loggedOutAt > i.loginAt) continue;
    const at = Number(i.lastActive) || Number(i.assignAt) || 0;
    if (!at || now > equipHoldUntil(at)) continue;
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
    if (!at || now > equipHoldUntil(at)) continue;
    if (!visible(i.name)) continue;
    out.push(i.name);
  }
  return out;
}
