// PORT-MIS 입출항 레코드를 항차 정보(콜사인·선박명)로 찾는 간이 매처 — 질문기 답변 전용
//   - VoyagePage의 화면용 매칭(베이사전·fallback 포함 160줄)을 건드리지 않고,
//     질문 답변에 필요한 핵심 규칙만 독립 구현.
//   - 7.8 방향: 후보가 여럿이면 최신 updatedAt 우선 (stale 키 문제 회피)
//   - V7.30 가드: 콜사인이 맞아도 선박명이 명백히 다르면 오염으로 보고 버림
export function matchPortMis(portMisData, info) {
  const entries = Object.values(portMisData || {}).filter(p => p && (p.eta || p.etd));
  if (!entries.length) return null;
  const norm = (x) => String(x || '').toUpperCase().replace(/[\s\-_.]/g, '');
  const myName = norm(info?.vslFull || info?.vsl);
  const nameOk = (p) => {
    const pn = norm(p.vesselName);
    if (!myName || myName.length < 5 || !pn || pn.length < 5) return true; // 검증 불가 → 통과
    return myName.includes(pn.slice(0, 5)) || pn.includes(myName.slice(0, 5));
  };
  const latest = (arr) => arr.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;

  // 1) 콜사인 (정확 + prefix 양방향) + 선박명 가드
  const cs = String(info?.callsign || '').toUpperCase().trim();
  if (cs && cs.length >= 4) {
    const hit = entries.filter(p => {
      const pc = String(p.callsign || '').toUpperCase().trim();
      return pc && (pc === cs || pc.startsWith(cs) || cs.startsWith(pc)) && nameOk(p);
    });
    const m = latest(hit);
    if (m) return m;
  }
  // 2) 선박명 (앞 5자 포함 매칭)
  if (myName && myName.length >= 5) {
    const hit = entries.filter(p => {
      const pn = norm(p.vesselName);
      return pn.length >= 5 && (myName.includes(pn.slice(0, 5)) || pn.includes(myName.slice(0, 5)));
    });
    const m = latest(hit);
    if (m) return m;
  }
  return null;
}
