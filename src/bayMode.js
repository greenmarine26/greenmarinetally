// 4.80 베이모드 양하 — 베이 그림에서 컨을 손으로 눌러 내리는 날의 판정 한 벌(어느 컨을 고를 수 있나 · 어느 장·단으로 가나 · 그림에 칠할 칸 · 요청 번호).
//   검수사 2026-11-08 «바라는것은 베이모드 양하입니다. 그걸 누르면 베이가 양하 베이만 확대고정되어 해제를 누르기 전까지 그베이만 보여주는것입니다.»
//   «컨을 선택하면 자동가이드에서 보여준 작은 카드처럼 보였으면 합니다.» «트윈모드도 가능하게 해서 앞베이 20피트를 선택하면 자동 트윈처럼 카드 두개를 보여주고 일괄 양하처리를 할수 있게 하고
//   거기서도 싱글모드 변환 앞베이부터 뒷베이부터 선택 기능도 들어 갔으면 합니다.»
//   ⚠ 여기는 판정만 한다. 카드·일괄 양하·싱글 변환·앞뒤 베이 먼저·보류는 자동 가이드(GuidedWorkPanel)의 것을 그대로 쓴다 — 기록 함수를 두 벌로 만들지 않는다.

/** 베이모드가 되는 모드 — 양하만(검수사 «베이모드 양하»). */
export function bayModeOkFor(mode) { return mode === 'discharge'; }

let _seq = 0;
/** 자동 가이드에 넘기는 «이 컨을 카드로» 요청. seq 는 항상 늘어난다(같은 컨을 다시 눌러도 다시 돈다). */
export function bayPickRequest(cn, now = Date.now()) {
  const c = String(cn || '').trim().toUpperCase();
  if (!c) return null;
  _seq = Math.max(_seq + 1, now);
  return { seq: _seq, cn: c };
}

/**
 * 누른 컨이 지금 카드가 될 수 있나 — remaining = 자동 가이드가 쓰는 «남은 평택 양하분»(완료 제외), heldSet = 보류 중인 컨 번호(대문자).
 * 반환 { state:'ok'|'done'|'held'|'under', c, center, tier } — 'ok' 일 때만 장·단으로 간다. under = 위에 보류 컨이 있어 못 내림(by = 그 보류 컨 번호).
 *   done = 남은 목록에 없다(이미 완료됐거나 평택 양하분이 아님) → 호출부가 종전대로 컨 상세를 연다.
 *   held = 보류 중 → 해제는 보류 목록에서(보류 UI 를 새로 만들지 않는다).
 */
export function bayModeTargetOf(remaining, heldSet, cn, groupCenterOf) {
  const u = String(cn || '').toUpperCase();
  const c = (remaining || []).find((x) => String(x.cn || '').toUpperCase() === u);
  if (!c) return { state: 'done', c: null, center: null, tier: null };
  if (heldSet && heldSet.has(u)) return { state: 'held', c, center: groupCenterOf(c.bay), tier: parseInt(c.tier, 10) >= 80 ? 'deck' : 'hold' };
  const _by = underHeldOf(remaining, heldSet).get(u);   // 4.82-01 — 같은 칸 위에 보류 컨이 얹혀 있으면 못 내린다
  if (_by) return { state: 'under', by: _by, c, center: groupCenterOf(c.bay), tier: parseInt(c.tier, 10) >= 80 ? 'deck' : 'hold' };
  return { state: 'ok', c, center: groupCenterOf(c.bay), tier: parseInt(c.tier, 10) >= 80 ? 'deck' : 'hold' };
}

/**
 * 홀드 컨을 내리기 전에 먼저 내려야 할 데크가 남은 장 — 같은 해치 기준(4.80-02).
 *   종전엔 «누른 컨이 든 장(group) 자기 데크» 만 봤다. 짝이 없는 홀수 베이(11)는 사이 짝수 베이(10)와 다른 장이라 11 홀드는 통과하고 10 홀드는 막혀,
 *   같은 그림(10 / 11)에서 한 번은 되고 한 번은 안 됐다(검수사 2026-11-09 «데크를 내리지 않은 상태에서 홀드를 지정하면 지정이 되고 … 20피트를 선택하니 또 데크 화물이 남아서 안된다고»).
 *   데크는 사이 짝수 베이의 40피트가 양옆 홀수 베이 자리에 걸쳐 같은 커버 위에 얹힌다 — 그래서 옆 베이(번호 차 1, swapGrade.sameBayGroup 과 같은 이웃 규칙)의 데크도 센다.
 *   반환 { center, n, own } = 데크 안내로 갈 장 center · 막는 데크 수 · 자기 장 데크인가. 막을 데크가 없으면 null.
 *   nearBay(a, b) = 두 베이가 같은 해치 이웃인가(호출부가 sameBayGroup 을 넘긴다 — 여기서 새 규칙을 만들지 않는다).
 */
export function bayModeDeckGateOf(remaining, center, groupCenterOf, nearBay) {
  const isDeck = (c) => parseInt(c.tier, 10) >= 80;
  const mine = (remaining || []).filter((c) => groupCenterOf(c.bay) === center);
  const own = mine.filter(isDeck).length;
  if (own > 0) return { center, n: own, own: true };
  const bays = [...new Set(mine.map((c) => parseInt(c.bay, 10)))];
  const near = (remaining || []).filter((c) => isDeck(c) && groupCenterOf(c.bay) !== center && bays.some((b) => nearBay(b, c.bay)));
  if (!near.length) return null;
  const by = {};
  for (const c of near) { const k = groupCenterOf(c.bay); by[k] = (by[k] || 0) + 1; }
  const best = Object.keys(by).map(Number).sort((a, b) => (by[b] - by[a]) || (a - b))[0];
  return { center: best, n: near.length, own: false };
}

const pad2 = (x) => String(x ?? '').padStart(2, '0');
/** 그림에서 고른 카드의 칸 — BayPlan warnCells 와 같은 키('베이-열-단')로 'pick' 을 단다. base 는 불일치 표시 Map(있으면 그 위에 얹는다, 빨강이 이긴다). */
export function bayModeCellsOf(cns, containers, base = null) {
  const m = new Map(base || []);
  const want = new Set((cns || []).map((x) => String(x || '').toUpperCase()));
  if (!want.size) return m;
  for (const c of containers || []) {
    if (!c || !want.has(String(c.cn || '').toUpperCase())) continue;
    const k = `${parseInt(c.bay, 10)}-${pad2(c.row)}-${pad2(c.tier)}`;
    if (!m.has(k)) m.set(k, 'pick');
  }
  return m;
}

/**
 * 4.82-01 — 보류한 컨이 위에 얹혀 있어 아래 컨을 못 내리는 경우. 같은 베이·같은 열·같은 쪽(데크끼리·홀드끼리)에서 단이 더 높은 보류 컨이 아직 남아 있으면 그 아래 컨은 막힌다.
 *   검수사 2026-11-09 14:36 화면(OBWH 2787E 15번 베이) — 15-03-04 SPSU2041959 를 «트윈 무게 초과» 로 보류했는데 바로 아래 15-03-02 SPSU2022558 이 «단독» 으로 올라왔다.
 *   반환 Map(막힌 컨 번호 대문자 → 위의 보류 컨 번호). 보류 컨 자신은 넣지 않는다.
 */
export function underHeldOf(remaining, heldSet) {
  const out = new Map();
  if (!heldSet || !heldSet.size) return out;
  const side = (c) => (parseInt(c.tier, 10) >= 80 ? 'D' : 'H');
  const key = (c) => `${parseInt(c.bay, 10)}-${parseInt(c.row, 10)}-${side(c)}`;
  const top = new Map();   // 칸 열별 보류 컨 중 가장 높은 단
  for (const h of remaining || []) {
    const u = String(h.cn || '').toUpperCase();
    if (!heldSet.has(u)) continue;
    const k = key(h), t = parseInt(h.tier, 10);
    if (!top.has(k) || t > top.get(k).t) top.set(k, { t, cn: u });
  }
  if (!top.size) return out;
  for (const c of remaining || []) {
    const u = String(c.cn || '').toUpperCase();
    if (heldSet.has(u)) continue;
    const g = top.get(key(c));
    if (g && g.t > parseInt(c.tier, 10)) out.set(u, g.cn);
  }
  return out;
}
