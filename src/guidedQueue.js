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
//   V8.50 (사용자 확정 2026-07-06 — 양하 우선순위 협의):
//     ① 기본 순서는 층(티어) 단위 절대 유지 — V8.09-04의 스택 통째 배치(로우 단위 붕괴) 폐기.
//        (실증: 625N bay26 위엠티/풀리퍼/바닥엠티 홀드에서 로우 단위로 파고들던 문제.)
//     ③ 갈림(지금 내릴 수 있는 카드에 부류 혼재) 시 검수사 선택 = streamPref('F'|'E'|'RF'|'GEN'|'40'|'20').
//        선택 부류를 물리 종속을 지키며 앞당겨 연속 제시(내리던 흐름 계속), 막히면 기본 순서 잔류.
//     ④ 예측과 다른 컨이 내려오면 그 부류로 자동 재앵커(무언 적응 — GuidedWorkPanel에서 처리).
//   ★ TallyOne 1.57 (검수사 확정 2026-08-13) — 부류 우선을 '고정 규칙'에서 '감지'로 옮긴다.
//     검수사 원문: "일단 모든 컨테이너를 기본 컨테이너 취급을 하고 같은 순서로 선적하거나 양하를 합니다.
//                   그렇게 하다가 혼재 되어 있을때 연속으로 리퍼(또는 20피트) 먼저 양하를 하는것 같으면
//                   그 순서를 감지 하고 방식을 바꿉니다."
//     ⓐ 기본 순서에서 부류 가산점을 전부 뺀다 — 폐기: V8.50②(풀일반→풀리퍼→엠티) ·
//        V7.99-6/V8.09-03(같은 층 40ft 먼저 · 40ft 모아 먼저) · 선적 '트윈 전부 → 40ft 전부'.
//        남는 것은 순수 물리 순서(데크/홀드 → 층 → 로우)뿐이다.
//     ⓑ 선적 20싱글 우선은 유지하되 **아래 단이 안 채워졌으면 못 당긴다**(허공 적재 금지).
//        검수사 원문: "20피트 트윈은 40피트 한개랑 같습니다. 그래서 40피트가 먼저 선적되면 40피트부터,
//                      20피트 트윈이 먼저 실리면 20피트 트윈부터."
//     ⓒ 흐름 감지(streamPref)를 **선적에도** 건다. 종전엔 양하 전용이었다.
//     ⓓ 리퍼는 **풀일 때만** 리퍼로 센다. 검수사 원문: "리퍼 엠티는 일반 엠티랑 같습니다."
//        실증(DJCF 0149N 선적): 리퍼 15대가 전부 엠티인데 종전 「리퍼 흐름」이 15대를 다 끌어왔다.
//     ⓔ EDI 순번(`eseq`)대로 연속 진행 중이면 흐름 전환을 하지 않는다 — GuidedWorkPanel 에서 판정.
//        검수사 원문: "단 연속으로 EDI대로 선적할때는 그게 우선입니다."

const isDeckTier = (t) => parseInt(t, 10) >= 80;
const is20ft = (c) => String(c.tp || '').startsWith("20") || String(c.iso || '')[0] === '2';
const is40ft = (c) => { const f = String(c.iso || '')[0]; return f === '4' || f === 'L' || f === '9' || String(c.tp || '').includes('40'); };

// 같은 티어 안 로우 정렬 순위 (작을수록 먼저)
function rowRank(rowStr, { evenRowsSeaSide, landToSea }) {
  const r = parseInt(rowStr, 10);
  let seaToLand;
  if (r === 0) seaToLand = 1000;
  else if (evenRowsSeaSide ? r % 2 === 0 : r % 2 === 1) seaToLand = 1000 - r;
  else seaToLand = 1000 + r;
  return landToSea ? -seaToLand : seaToLand;
}

export function buildGuidedQueue({ containers, mode, evenRowsSeaSide, findTwin = null, streamPref = null }) {
  const landToSea = mode === 'discharge';
  const topFirst = mode === 'discharge';

  // V7.94-23: 선적 시 같은 베이 안에서 POD(목적항)별로 묶어 제시 (현장: 포트별 선적).
  //   베이 순서·물리 적재순서(데크/홀드·티어)는 유지하고, 같은 베이+같은 단 안에서 POD가 같은 것끼리 인접.
  //   POD 우선순위 = 그 베이에서 먼저 등장하는 POD 순 (베이별 독립).
  const podOrderByBay = {};
  if (mode === 'loading') {
    const seen = {};
    for (const c of containers) {
      const b = String(parseInt(c.bay, 10));
      const pod = c.pod || '';
      podOrderByBay[b] ||= {};
      if (!(pod in podOrderByBay[b])) { seen[b] = (seen[b] || 0); podOrderByBay[b][pod] = seen[b]++; }
    }
  }
  const podRank = (c) => {
    if (mode !== 'loading') return 0;
    const b = String(parseInt(c.bay, 10));
    return podOrderByBay[b]?.[c.pod || ''] ?? 99;
  };

  const cmp = (a, b) => {
    const aDeck = isDeckTier(a.tier), bDeck = isDeckTier(b.tier);
    if (aDeck !== bDeck) return (mode === 'discharge') === aDeck ? -1 : 1;
    // 선적: 같은 단(데크/홀드) 안에서 같은 베이면 POD별로 묶기 (물리 적재순서보다 우선하지 않게 — 베이·단 동일 시에만)
    if (mode === 'loading' && parseInt(a.bay, 10) === parseInt(b.bay, 10)) {
      const ap = podRank(a), bp = podRank(b);
      if (ap !== bp) return ap - bp;
    }
    const at = parseInt(a.tier, 10), bt = parseInt(b.tier, 10);
    if (at !== bt) return topFirst ? bt - at : at - bt;
    // 1.57: 같은 층 안 부류 가산점(40ft 먼저 · 풀일반→풀리퍼→엠티) 전부 제거.
    //   기본은 순수 물리 순서다. 부류를 앞당기는 것은 흐름 감지(streamPref)가 맡는다.
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
    // V8.09-03 (사용자 확정 2026-06-17): 양하는 "40ft 작업 전부 끝낸 뒤 20ft 작업".
    //   ★1.57 폐기 — 스프레더 전환을 줄이려는 이 규칙이 '고정'이라 현장이 반대로 갈 때도 밀어붙였다.
    //   검수사 확정 2026-08-13: 40/20 어느 쪽을 먼저 하는지는 배마다·날마다 다르므로 감지에 맡긴다.
    //   40ft 를 모아 먼저 내리는 흐름이면 「40피트」 칩이 걸리거나 3연속 감지가 잡아 같은 결과가 된다.
    const base = [...pureFrs, ...flow, ...pureSingles];
    // V8.50 ③: 고른 부류를 물리 종속 지키며 앞당김. FR 우선 양하는 그대로 고정.
    if (streamPref) return [...pureFrs, ...pullStreamForward(base.slice(pureFrs.length), streamPref)];
    return base;
  }
  // ── 선적 (1.57 개편). 단 사이 순서는 종전대로 홀드 먼저 → 데크. ──
  //   폐기: "단 내부 = 20싱글 → 트윈 → 40ft" 고정.
  //     검수사 확정 2026-08-13 — "20피트 트윈은 40피트 한개랑 같습니다."
  //     트윈과 40ft 는 같은 크기의 자리를 먹으므로 둘 사이에 고정 순서가 성립하지 않는다.
  //     어느 쪽을 먼저 싣는지는 그날 현장이 정하고, 앱은 그것을 감지해 따라간다.
  //   남기는 것: 20싱글 우선. 단 **아래 단이 아직 안 실린 싱글은 못 당긴다**(허공 적재 금지).
  //     종전엔 이 검사가 홀드에만 있어(`singles` 수집 조건이 `!isDeckTier`) 데크 20싱글이
  //     아래 단 트윈보다 먼저 갔다 — DJCF 0149N `7-07-84` 싱글이 `7-07-82` 트윈보다 앞선 실증.
  const buildStageOrder = (cards) => {
    const ordered = [...cards].sort((a, b) => cmp(a.main, b.main));   // 순수 물리 순서(층 → 로우)
    return pullStreamForward(ordered, '20SINGLE', 'below');           // 20싱글을 종속 지키며 앞으로
  };
  const holdOrdered = buildStageOrder(flow.filter(card => !isDeckTier(card.main.tier)));
  const deckOrdered = buildStageOrder(flow.filter(card => isDeckTier(card.main.tier)));
  // 1.57: 흐름 감지를 선적에도 건다(종전엔 양하 전용이라 선적은 고정 순서만 나왔다).
  //   FR·OT 마지막 선적은 그대로 고정 — 검수사 확정 "FR/OT는 그대로".
  let body = [...holdOrdered, ...deckOrdered];
  if (streamPref) body = pullStreamForward(body, streamPref, 'below');
  // pureSingles(홀드 짝없는 20ft) → 홀드 → 데크 → FR·OT(마지막)
  return [...pureSingles, ...body, ...pureFrs];
}

// 카드의 대표 규격이 40ft인지 (트윈 카드는 20ft 짝이므로 20ft 취급)
function cardIs40(card) {
  if (card.twin) return false;            // 트윈 = 20ft 두 개
  return is40ft(card.main);
}

// 1.57: reorder40FirstForDischarge(양하 40ft 모아 먼저) 삭제 — 고정 규칙을 감지로 옮겼다(호출부 0).

// 리퍼 판정 (이 모듈 자체 완결성 위해 로컬 헬퍼 — ISO 3번째 글자 R 또는 변형코드)
function cardIsReefer(c) {
  if (!c) return false;
  if (c.rf === true) return true;
  const iso = String(c.iso || '').toUpperCase();
  if (iso.length >= 3 && iso[2] === 'R') return true;
  if (/^R[FE]/.test(iso)) return true;
  if (/^[24]58[25]$/.test(iso)) return true;
  return false;
}

// ── V8.50: 부류·물리 종속 헬퍼 (V8.09-04 reorderFullReeferLast 대체) ──
// 컨테이너 부류 — 패널의 갈림 감지·무언 적응과 공용.
export function conClassOf(c) {
  return { size: is40ft(c) ? '40' : '20', fe: c.fe === 'E' ? 'E' : 'F', rf: cardIsReefer(c) };
}
// 1.57: conClassRank(풀일반0→풀리퍼1→엠티2) 삭제 — 기본 순서에서 부류 가산점을 뺐다(호출부 0).
// 카드가 선호 부류에 맞는지.
export function cardMatchesPref(card, pref) {
  const c = card.main;
  if (pref === 'F') return c.fe !== 'E';
  if (pref === 'E') return c.fe === 'E';
  // 1.57: 리퍼는 풀일 때만. 엠티 리퍼는 일반 엠티와 같다(검수사 확정 2026-08-13).
  //   종전 `cardIsReefer(c)` 만 보던 식이 엠티 리퍼까지 「리퍼 흐름」으로 끌어왔다.
  //   화면 칩 개수(GuidedWorkPanel forkChips)는 처음부터 풀 기준이라 표시와 동작이 어긋나 있었다.
  if (pref === 'RF') return c.fe !== 'E' && cardIsReefer(c);
  if (pref === 'GEN') return c.fe !== 'E' && !cardIsReefer(c);
  if (pref === '40') return cardIs40(card);
  if (pref === '20') return !cardIs40(card);
  // 1.57: 선적 20싱글 우선 — 물리 종속을 지키며 당기기 위해 내부 전용 키로 둔다.
  if (pref === '20SINGLE') return !card.twin && !cardIs40(card);
  return true;
}
// 같은 수직 스택 판정 — 같은 로우 + (같은 베이거나 한쪽이 짝수베이 40(양쪽 20슬롯에 걸침)).
function sameStackPos(a, b) {
  if (a.row !== b.row) return false;
  const ab = parseInt(a.bay, 10), bb = parseInt(b.bay, 10);
  if (ab === bb) return true;
  return ab % 2 === 0 || bb % 2 === 0;
}
function cardPositions(card) { return card.twin ? [card.main, card.twin] : [card.main]; }
// 남은 카드들 중 이 카드 '위'(같은 스택·더 높은 티어)에 안 내린 게 있는지. 단(데크/홀드)이 다르면 비교 안 함.
function blockedByAbove(card, cards) {
  const poss = cardPositions(card);
  return cards.some(o => {
    if (o === card) return false;
    if (isDeckTier(o.main.tier) !== isDeckTier(card.main.tier)) return false;
    return cardPositions(o).some(op => poss.some(p =>
      sameStackPos(op, p) && parseInt(op.tier, 10) > parseInt(p.tier, 10)));
  });
}
// 지금 바로 내릴 수 있는 카드들 — 패널의 갈림 감지용.
export function availableCardsOf(queue) { return queue.filter(card => !blockedByAbove(card, queue)); }
// 1.57: 선적은 '아래 단이 아직 안 실렸으면' 못 당긴다 — 양하의 blockedByAbove 와 대칭.
//   이것이 없으면 20싱글 우선이 아래 단을 건너뛰고 허공에 얹는다(DJCF 0149N 선적 `7-07-84` 실증).
//   검수사 교정 2026-08-11: "2단이 비었는데 3단 즉 허공에 띄웠습니다."
function blockedByBelow(card, cards) {
  const poss = cardPositions(card);
  return cards.some(o => {
    if (o === card) return false;
    if (isDeckTier(o.main.tier) !== isDeckTier(card.main.tier)) return false;
    return cardPositions(o).some(op => poss.some(p =>
      sameStackPos(op, p) && parseInt(op.tier, 10) < parseInt(p.tier, 10)));
  });
}
// 선호 부류를 물리 종속 지키며 앞으로 — 막힌 카드는 못 당기고, 못 당긴 것은 기본 순서에 남는다.
//   dir='above' = 양하(위가 안 내려갔으면 못 당김) · dir='below' = 선적(아래가 안 실렸으면 못 당김).
function pullStreamForward(cards, pref, dir = 'above') {
  const blocked = dir === 'below' ? blockedByBelow : blockedByAbove;
  const rest = [...cards];
  const out = [];
  for (;;) {
    const idx = rest.findIndex(card => cardMatchesPref(card, pref) && !blocked(card, rest));
    if (idx === -1) break;
    out.push(...rest.splice(idx, 1));
  }
  return [...out, ...rest];
}

// V9.57: resolveBayGroup 삭제 — 저장소 전체 grep 참조 0 (베이 그룹 선택 UI가 쓰지 않는 잔재).
