// 트윈 짝꿍 찾기 (EDI 분석 결과 기반)
//
// 평택항 컨테이너 적재 패턴:
//  - 짝수 베이 (002, 004, 006...) = 40ft
//  - 홀수 베이 (001, 003, 005...) = 20ft
//  - 트윈 트레일러 = 20ft 2개를 한 트럭에 = 같은 짝수 위치를 차지하는 인접 두 홀수 베이의 컨
//
// 예: 베이 005 (20ft 짝수 베이) row=02, tier=04
//     → 짝꿍 = 베이 003 또는 007 (인접 홀수 베이) 같은 row=02, tier=04
//
// 100% 자동은 아님 — 같은 자리에 컨이 없을 수도 있고, 트럭이 트윈이 아닐 수도 있음
// 검수원이 보고 다르면 수정

export function findTwinCandidate(target, allContainers) {
  if (!target?.bay || !target?.row || !target?.tier) return null;

  const targetBay = parseInt(target.bay);
  if (!Number.isFinite(targetBay)) return null;
  if (targetBay % 2 === 0) return null; // 40ft 베이 (짝수)는 트윈 대상 아님

  // 인접 홀수 베이 = ±2
  const candidateBays = [
    String(targetBay - 2).padStart(target.bay.length, '0'),
    String(targetBay + 2).padStart(target.bay.length, '0'),
  ];

  // 같은 row + 같은 tier
  for (const bay of candidateBays) {
    const found = allContainers.find(c =>
      c.cn !== target.cn &&
      c.bay === bay &&
      c.row === target.row &&
      c.tier === target.tier &&
      c._mode === target._mode  // 같은 양/선적 모드
    );
    if (found) return found;
  }

  return null;
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
