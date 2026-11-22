// 같은 시각 다른 호기 위치로 컨마다 호기를 따라가는 순수 계산 한 벌 — 여객선 갱별 작업보고(utils.buildGangShiftReport)가 쓴다
//   검수사 2026-11-22 «동시간대 장비들 위치파악이 중요 합니다» · «TNJP14번베이는 4호기가 작업할때는 2호기는 6번이나 그부근 작업을 합니다» ·
//   «반면 2호기가 14번을 가면 4호기는 마지막베이를 작업하거나 합니다». 동방 자료에는 컨별 크레인 칸이 없다(실측) — 컨의 완료 시각·장(해치)만으로 따라간다.
//   규칙 넷 — ① 크레인 한 대는 한 번에 한 장 ② 같은 분에 서로 다른 장이면 다른 크레인 ③ 크레인끼리는 넘지 못한다(선수쪽 호기의 장 ≤ 선미쪽 호기의 장)
//     ④ 다른 호기가 방금까지 일했는데 한 호기가 두 장을 몰아 하지 않는다. 검수원이 호기를 고르고 찍은 완료(pin)는 사실이라 그대로 둔다.
//   실측(보관 28항차 · 끝난 뒤 동방 호기 합계와 대조) — OBWH 27건 중 26건이 0~4대 차이, TNJP 는 장비가 바뀐 항차에서 크게 틀린다 → 부르는 쪽이 합계 문지기로 거른다.

const MOVE = 5;          // 장을 옮김
const SAME_MIN = 200;    // 1분 안에 다른 장 — 같은 크레인이 아니다
const CROSS = 20;        // 넘어감
const HOG = 0.5;         // 쉬는 호기를 두고 몰아 함
const KEEP = 400;        // 남기는 경로 수

/**
 * rows: [{ at(ms), hatch(수), pin(호기 자리 0..K-1 | undefined) }] — 시각순이 아니어도 된다(안에서 정렬).
 * K: 호기 수(선수 → 선미 순서의 자리 수). 반환: rows 와 같은 순서의 자리 번호 배열(못 정하면 null).
 */
export function trackCranes(rows, K) {
  const n = (rows || []).length;
  if (!n || !(K >= 1)) return null;
  if (K === 1) return rows.map(() => 0);
  const idx = rows.map((_, i) => i).sort((a, b) => (rows[a].at - rows[b].at) || (rows[a].hatch - rows[b].hatch));
  const keyOf = (st) => st.join(',');
  let states = new Map([[keyOf(new Array(K).fill(-1)), { st: new Array(K).fill(-1), ts: new Array(K).fill(0), cost: 0 }]]);
  const hist = [];
  for (const ri of idx) {
    const { at, hatch: h, pin } = rows[ri];
    const next = new Map();
    for (const [pk, s] of states) {
      for (let i = 0; i < K; i++) {
        if (pin != null && pin !== i) continue;
        let c = s.cost;
        if (s.st[i] === -1) c += 1;
        else if (s.st[i] !== h) { c += MOVE; if (at - s.ts[i] < 60000) c += SAME_MIN; }
        for (let j = 0; j < K; j++) {
          if (j === i || s.st[j] === -1) continue;
          if ((j < i && s.st[j] > h) || (j > i && s.st[j] < h)) c += CROSS;
          const idle = at - s.ts[j];
          if (idle > 100000 && idle < 900000 && s.st[i] !== -1 && at - s.ts[i] < 100000) c += HOG;
        }
        const st = s.st.slice(); st[i] = h;
        const k = keyOf(st);
        const cur = next.get(k);
        if (!cur || c < cur.cost) { const ts = s.ts.slice(); ts[i] = at; next.set(k, { st, ts, cost: c, prev: pk, pick: i }); }
      }
    }
    if (!next.size) return null;   // pin 이 자리 밖 — 부르는 쪽이 거른다
    let arr = [...next.entries()];
    const keep = K >= 3 ? 120 : KEEP;   // 감사 — 호기 3대부터 상태가 불어 느려진다(600대·4호기 775ms) → 좁힌다
    if (arr.length > keep) { arr.sort((a, b) => a[1].cost - b[1].cost); arr = arr.slice(0, keep); }
    states = new Map(arr);
    hist.push(new Map(arr.map(([k, v]) => [k, [v.prev, v.pick]])));
  }
  let bestK = null, best = Infinity;
  for (const [k, s] of states) if (s.cost < best) { best = s.cost; bestK = k; }
  const out = new Array(n);
  for (let t = idx.length - 1; t >= 0; t--) { const [prev, pick] = hist[t].get(bestK); out[idx[t]] = pick; bestK = prev; }
  return out;
}
