// 가이드 양하/선적 예측 큐 생성 — 베이·모드·접안방향 기준 크레인 순서 정렬
// 규칙 (사용자 확정 2026-06-11):
//   양하: 데크→홀드, 맨 위 티어부터, 같은 티어는 육상→해상 로우 순.
//   선적: 홀드→데크, 맨 아래 티어부터, 같은 티어는 해상→육상 로우 순.
//   로우 육상/해상 = 접안 방향 (우현 접안 = 짝수 로우가 해상쪽).
//   트윈: 홀수베이 짝(findTwinCandidate) 한 카드로 묶음. 40ft는 일반 작업.
//   싱글모드: 짝 없는 20ft — 양하는 맨 마지막, 선적은 맨 처음 (크레인 모드 전환 1회).
//     단, 적재 종속 예외: 싱글 아래에 일반 작업분이 있으면(위에 얹힌 싱글) 층 순서 유지.
//   FR(플랫랙) 특수화물: 우선 양하 / 마지막 선적 (사용자 확정 2026-06-12).
//   V7.94-08 선적 추가 규칙 (사용자 메모 확정 2026-06-12):
//     ① 선적 마지막 단계는 FR + OT (양하는 기존대로 FR만 우선).
//     ② 혼재 베이 선적: 20ft 트윈을 같은 로우 스택 단위로 바닥부터 연속으로 쌓고(로우는 해상→육상),
//        트윈 아래 깔린 40ft가 있으면 그 40ft를 먼저 끌어와 적재 종속을 지킨 뒤, 남은 40ft는 층 순서.
//     단, 물리 제약 예외 — 같은 줄 위에 다른 작업분이 있거나 홀드 FR인데 데크 작업이 남아 있으면
//     양하 우선 불가(층 순서 유지). 선적은 FR 위에 실릴 작업분이 있으면 마지막 불가(층 순서 유지).
//   40ft/20ft 혼재 시 40ft 먼저: 별도 규칙이 아니라 층 단위 정렬에서 자연 충족
//     (양하: 트윈 위 40ft가 위층 차례에 먼저 / 선적: 바닥 40ft가 아래층 차례에 먼저).
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

  // 1차: 트윈 짝짓기 → 카드화 + 싱글모드(짝 없는 20ft)·FR 식별
  const used = new Set();
  const normal = [], singles = [], frs = [];
  for (const c of sorted) {
    if (used.has(c.cn)) continue;
    used.add(c.cn);
    let twin = null;
    if (findTwin && is20ft(c)) {
      twin = findTwin(c, containers, used);
      if (twin) used.add(twin.cn);
    }
    const card = { kind: 'work', main: c, twin, pos: `${c.bay}-${c.row}-${c.tier}`, single: false, fr: false };
    const isSpecialLast = mode === 'loading'
      ? (c.fr || c.ot || c.oog || twin?.fr || twin?.ot || twin?.oog)   // 선적: FR+OT 마지막 (V7.94-15: oog 필드 누락 — SWRG 오픈탑 ISO 2261이 oog만 참)
      : (c.fr || twin?.fr);                       // 양하: FR만 우선
    if (isSpecialLast) { card.fr = true; frs.push(card); }
    else if (is20ft(c) && !twin && !isDeckTier(c.tier)) { card.single = true; singles.push(card); }
    else normal.push(card);
  }

  // 같은 줄(로우) 비교 헬퍼
  const sameRow = (card, row) => card.main.row === row || card.twin?.row === row;

  // 적재 종속 예외 ①: 싱글 '아래'에 일반/FR 작업분이 있으면 단계 분리 불가 → 층 순서 유지
  const slotCards = [...normal, ...frs].filter(card => !isDeckTier(card.main.tier));
  const keepInFlow = [];
  const pureSingles = [];
  for (const s of singles) {
    const st = parseInt(s.main.tier, 10), srow = s.main.row;
    const conflict = slotCards.some(card => {
      if (!sameRow(card, srow)) return false;
      return parseInt(card.main.tier, 10) < st;
    });
    (conflict ? keepInFlow : pureSingles).push(s);
  }

  // 적재 종속 예외 ②: FR 우선양하/마지막선적의 물리 제약
  //   양하 우선 불가: 같은 줄 '위'에 비FR 작업분 존재, 또는 홀드 FR인데 데크 작업이 남음
  //   선적 마지막 불가: 같은 줄 '위'에 비FR 작업분 존재(FR 위에 실어야 함), 또는 홀드 FR인데 데크 작업이 남음
  const nonFr = [...normal, ...singles];
  const deckWorkExists = nonFr.some(card => isDeckTier(card.main.tier));
  const pureFrs = [];
  for (const f of frs) {
    const ft = parseInt(f.main.tier, 10), frow = f.main.row;
    const frIsHold = !isDeckTier(f.main.tier);
    const aboveExists = nonFr.some(card => {
      if (!sameRow(card, frow)) return false;
      if (isDeckTier(card.main.tier) !== !frIsHold && frIsHold) return false; // 홀드 FR과 데크 컨은 위아래 비교 대신 deckWorkExists로 처리
      if (isDeckTier(card.main.tier) !== isDeckTier(f.main.tier)) return false;
      return parseInt(card.main.tier, 10) > ft;
    });
    const conflict = aboveExists || (frIsHold && deckWorkExists);
    (conflict ? keepInFlow : pureFrs).push(f);
  }
  pureFrs.sort((a, b) => cmp(a.main, b.main));

  // 최종 순서:
  //   양하 = FR(우선) → 일반(+예외 병합) → 순수 싱글
  //   선적 = 순수 싱글 → 트윈(같은 로우 스택 연속, 아래 깔린 40ft 종속 끌어오기) → 남은 40ft(층 순서) → FR·OT(마지막)
  const flow = [...normal, ...keepInFlow].sort((a, b) => cmp(a.main, b.main));
  if (mode === 'discharge') {
    return [...pureFrs, ...flow, ...pureSingles];
  }
  // ── 선적: 홀드는 트윈 스택 우선, 데크는 기존 층 순서 ──
  const holdFlow = flow.filter(card => !isDeckTier(card.main.tier));
  const deckFlow = flow.filter(card => isDeckTier(card.main.tier));
  const holdTwins = holdFlow.filter(card => card.twin);
  const holdRest = holdFlow.filter(card => !card.twin);
  // 트윈: 로우(해상→육상) 우선, 같은 로우는 티어 오름차순 = 한 줄을 바닥부터 연속으로 쌓음
  holdTwins.sort((a, b) => {
    const ar = rowRank(a.main.row, { evenRowsSeaSide, landToSea: false });
    const br = rowRank(b.main.row, { evenRowsSeaSide, landToSea: false });
    if (ar !== br) return ar - br;
    return parseInt(a.main.tier, 10) - parseInt(b.main.tier, 10);
  });
  const emitted = new Set();
  const ordered = [];
  const emit = (card) => { if (!emitted.has(card)) { emitted.add(card); ordered.push(card); } };
  for (const tw of holdTwins) {
    // 적재 종속: 이 트윈과 같은 로우에서 더 아래 티어에 있는 일반(40ft 등) 카드를 먼저 끌어옴
    const tRow = tw.main.row, tTier = parseInt(tw.main.tier, 10);
    holdRest
      .filter(card => !emitted.has(card) && sameRow(card, tRow) && parseInt(card.main.tier, 10) < tTier)
      .sort((a, b) => parseInt(a.main.tier, 10) - parseInt(b.main.tier, 10))
      .forEach(emit);
    emit(tw);
  }
  // 남은 홀드 일반분(40ft 등): 기존 층 순서
  holdRest.filter(card => !emitted.has(card)).sort((a, b) => cmp(a.main, b.main)).forEach(emit);
  return [...pureSingles, ...ordered, ...deckFlow, ...pureFrs];
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
