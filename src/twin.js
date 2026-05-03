// 트윈 짝꿍 (V2 - EDI 베이 분포 기반 자동 분석)
//
// 알고리즘:
// 1. EDI에 있는 모든 베이 분석
// 2. 짝수 베이(40ft 슬롯)가 있으면 → 양 옆 홀수 베이가 짝꿍
// 3. 짝수 베이가 없으면(통로) → 그 양옆 홀수 베이는 단독
//
// 예: EDI 베이 = [01, 02, 03, 05, 06, 07, 09, 11]
//   - 02 짝수 → 01-03 짝꿍
//   - 04 없음(통로) → 03 다음 짝꿍 시작점
//   - 06 짝수 → 05-07 짝꿍
//   - 08 없음(통로) → 07 다음
//   - 10 없음(통로) → 09 단독
//   - 11도 단독
//
// 한 번 계산하면 캐시 (성능)

const cache = new WeakMap();

function buildBayPairs(allContainers) {
  if (cache.has(allContainers)) return cache.get(allContainers);

  // 모든 베이 수집
  const bays = new Set();
  for (const c of allContainers) {
    if (c.bay) bays.add(c.bay);
  }
  const bayInts = Array.from(bays).map(b => parseInt(b)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  const baySet = new Set(bayInts);

  // 짝꿍 매핑: 홀수 베이 → 짝꿍 베이
  const pairs = {}; // 'XXX' → 'YYY' or null (단독)
  for (const b of bayInts) {
    if (b % 2 === 0) continue; // 짝수(40ft 슬롯)는 짝꿍 대상 X

    const bStr = String(b).padStart(3, '0');
    const evenLeft = b - 1;   // -1 짝수 (작은 쪽)
    const evenRight = b + 1;  // +1 짝수 (큰 쪽)

    let pairBay = null;
    // 우선: +1 짝수 슬롯 있으면 → b+2가 짝
    if (baySet.has(evenRight) && baySet.has(b + 2)) {
      pairBay = String(b + 2).padStart(3, '0');
    }
    // 차선: -1 짝수 슬롯 있으면 → b-2가 짝
    else if (baySet.has(evenLeft) && baySet.has(b - 2)) {
      pairBay = String(b - 2).padStart(3, '0');
    }
    pairs[bStr] = pairBay; // null이면 단독
  }

  cache.set(allContainers, pairs);
  return pairs;
}

// 짝꿍 후보 찾기 (모드별, 위치별)
//   target: 검색된 컨테이너
//   allContainers: 전체 컨테이너
//   excludeCns: 이미 페어링된 컨번호 set (제외)
export function findTwinCandidate(target, allContainers, excludeCns = new Set()) {
  if (!target?.bay || !target?.row || !target?.tier) return null;

  const targetBay = parseInt(target.bay);
  if (!Number.isFinite(targetBay)) return null;
  if (targetBay % 2 === 0) return null; // 짝수 베이는 트윈 대상 아님

  const pairs = buildBayPairs(allContainers);
  const targetBayStr = String(targetBay).padStart(3, '0');
  const pairBayStr = pairs[targetBayStr];

  if (!pairBayStr) return null; // 단독 베이

  // 짝꿍 베이의 같은 row/tier 컨 찾기
  const found = allContainers.find(c =>
    c.cn !== target.cn &&
    !excludeCns.has(c.cn) &&
    c.bay === pairBayStr &&
    c.row === target.row &&
    c.tier === target.tier &&
    c._mode === target._mode
  );
  return found || null;
}

// 베이 짝꿍 맵 가져오기 (UI에서 표시용)
export function getBayPairs(allContainers) {
  return buildBayPairs(allContainers);
}

// 같은 슬롯에 적재된 다른 컨 찾기 (FR 4개 한 자리 등)
export function findStackMates(target, allContainers) {
  if (!target?.bay || !target?.row || !target?.tier) return [];
  return allContainers.filter(c =>
    c.cn !== target.cn &&
    c.bay === target.bay &&
    c.row === target.row &&
    c.tier === target.tier &&
    c._mode === target._mode
  );
}
