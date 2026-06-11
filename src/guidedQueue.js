// 가이드 양하/선적 예측 큐 생성 — 베이·모드·접안방향 기준 크레인 순서 정렬
// 규칙 (사용자 확정 2026-06-11):
//   양하: 데크→홀드, 맨 위 티어부터, 같은 티어는 육상→해상 로우 순.
//   선적: 홀드→데크, 맨 아래 티어부터, 같은 티어는 해상→육상 로우 순.
//   로우 육상/해상 = 접안 방향 (우현 접안 = 짝수 로우가 해상쪽).
//   트윈: 홀수베이 짝(findTwinCandidate) 한 카드로 묶음. 40ft는 일반 작업.
//   싱글모드: 짝 없는 20ft — 양하는 맨 마지막, 선적은 맨 처음 (크레인 모드 전환 1회).
//     단, 적재 종속 예외: 싱글 아래에 일반 작업분이 있으면(위에 얹힌 싱글) 층 순서 유지.
//   쉬프팅: 가이드 모드에서 감지하지 않음 — 발생 시 수동 모드 사용 (사용자 결정).

const isDeckTier = (t) => parseInt(t, 10) >= 80;
const is20ft = (c) => String(c.tp || '').startsWith("20") || String(c.iso || '')[0] === '2';

// 같은 티어 안 로우 정렬 순위 (작을수록 먼저)
function rowRank(rowStr, { evenRowsSeaSide, landToSea }) {
  const r = parseInt(rowStr, 10);
  let seaToLand;
  if (r === 0) seaToLand = 1000;
  else if (evenRowsSeaSide ? r % 2 === 0 : r % 2 === 1) seaToLand = 1000 - r;
  else seaToLand = 1000 + r;
  return landToSea ? -seaToLand : seaToLand;
}

export function buildGuidedQueue({ containers, mode, evenRowsSeaSide, findTwin = null }) {
  const landToSea = mode === 'discharge';
  const topFirst = mode === 'discharge';

  const cmp = (a, b) => {
    const aDeck = isDeckTier(a.tier), bDeck = isDeckTier(b.tier);
    if (aDeck !== bDeck) return (mode === 'discharge') === aDeck ? -1 : 1;
    const at = parseInt(a.tier, 10), bt = parseInt(b.tier, 10);
    if (at !== bt) return topFirst ? bt - at : at - bt;
    const ar = rowRank(a.row, { evenRowsSeaSide, landToSea });
    const br = rowRank(b.row, { evenRowsSeaSide, landToSea });
    if (ar !== br) return ar - br;
    return parseInt(a.bay, 10) - parseInt(b.bay, 10); // 같은 슬롯은 낮은 베이(앞) 먼저
  };

  const sorted = [...containers].sort(cmp);

  // 1차: 트윈 짝짓기 → 카드화 + 싱글모드(짝 없는 20ft) 식별
  const used = new Set();
  const normal = [], singles = [];
  for (const c of sorted) {
    if (used.has(c.cn)) continue;
    used.add(c.cn);
    let twin = null;
    if (findTwin && is20ft(c)) {
      twin = findTwin(c, containers, used);
      if (twin) used.add(twin.cn);
    }
    const card = { kind: 'work', main: c, twin, pos: `${c.bay}-${c.row}-${c.tier}`, single: false };
    if (is20ft(c) && !twin && !isDeckTier(c.tier)) { card.single = true; singles.push(card); }
    else normal.push(card);
  }

  // 적재 종속 예외: 싱글 '아래'(양하) / '위'(선적)에 일반 작업분이 같은 그룹 로우에 있으면 일반 흐름에 둠
  const normalSlots = normal.filter(card => !isDeckTier(card.main.tier));
  const keepInFlow = [];
  const pureSingles = [];
  for (const s of singles) {
    const st = parseInt(s.main.tier, 10), srow = s.main.row;
    // 싱글 '아래'에 일반 작업분이 있으면 단계 분리 불가(양하: 먼저 내려야 / 선적: 나중에 올려야) → 층 순서 유지
    const conflict = normalSlots.some(card => {
      const t = parseInt(card.main.tier, 10);
      if (card.main.row !== srow && card.twin?.row !== srow) return false;
      return t < st;
    });
    (conflict ? keepInFlow : pureSingles).push(s);
  }

  // 최종 순서: 양하 = 일반(+예외 싱글 병합) → 순수 싱글 / 선적 = 순수 싱글 → 일반(+예외)
  const flow = [...normal, ...keepInFlow].sort((a, b) => cmp(a.main, b.main));
  return mode === 'discharge' ? [...flow, ...pureSingles] : [...pureSingles, ...flow];
}

// 선택 베이 → 같은 슬롯 그룹 (예: 20 → [19,20,21])
export function resolveBayGroup(bayNo, bayPairs) {
  const n = parseInt(bayNo, 10);
  const group = new Set([n]);
  if (n % 2 === 0) { group.add(n - 1); group.add(n + 1); }
  else {
    const pair = bayPairs?.[String(n)];
    if (pair) { group.add(parseInt(pair, 10)); group.add((n + parseInt(pair, 10)) / 2); }
  }
  return group;
}
