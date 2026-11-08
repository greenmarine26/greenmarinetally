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
 * 반환 { state:'ok'|'done'|'held', c, center, tier } — 'ok' 일 때만 장·단으로 간다.
 *   done = 남은 목록에 없다(이미 완료됐거나 평택 양하분이 아님) → 호출부가 종전대로 컨 상세를 연다.
 *   held = 보류 중 → 해제는 보류 목록에서(보류 UI 를 새로 만들지 않는다).
 */
export function bayModeTargetOf(remaining, heldSet, cn, groupCenterOf) {
  const u = String(cn || '').toUpperCase();
  const c = (remaining || []).find((x) => String(x.cn || '').toUpperCase() === u);
  if (!c) return { state: 'done', c: null, center: null, tier: null };
  if (heldSet && heldSet.has(u)) return { state: 'held', c, center: groupCenterOf(c.bay), tier: parseInt(c.tier, 10) >= 80 ? 'deck' : 'hold' };
  return { state: 'ok', c, center: groupCenterOf(c.bay), tier: parseInt(c.tier, 10) >= 80 ? 'deck' : 'hold' };
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
