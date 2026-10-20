// 미르 [이동] — «N번 베이로 옮겨 드릴까요?» 에 이동을 누르면 그 요청을 받아 두었다가 항차 화면이 꺼내 가는 한 벌(4.40)
/* ★ TallyOne 4.40 (검수사 2026-10-20 18:18 «25번 베이로 옮겨 드릴까요? 되묻고 이동 또는 취소 버튼을 보여주고 이동을 누르면 25번 베이 작업으로 갈수 있게»
     · 18:19 «모든 베이를 미르가 이동 시킬수 있게 해주시면 됩니다»)
   흐름 — 미르 답(mir.guideGotoAnswerOf) → 화면이 [이동]·[취소] 단추(mirThreadCommit) → «이동» 을 대화 층이 kind 'act' 로 받음
        → 화면이 mirGotoRequest(act) → 알림 'gm-mir-goto'
        → 그 항차 화면(VoyagePage)이 열려 있으면 바로 꺼내 가고(작업 시작 탭 · 기존 방식 · 그 모드), 아니면 App 이 그 항차로 옮긴 뒤 화면이 열리면서 꺼내 간다
        → SearchPanel 이 자동 가이드를 켜고 → GuidedWorkPanel 이 그 베이가 든 장 · 단 · «N번 베이 먼저»(3.77 bayFirst)로 맞춘다.
   ⚠ 요청은 한 번만 꺼내 간다(take). 60초가 지나면 버린다 — 늦게 열린 화면이 옛 요청으로 장을 바꾸지 않게.
   ⚠ 끝난 요청(seq)은 여기 한 곳에 «끝남» 으로 적는다(모듈 수준 — 화면이 다시 그려져도 남는다). 4.40 감사 상-1 — 상태가 화면에만 있어
     작업 시작 탭을 떠났다 오거나 수동 → 자동을 누르면 끝난 [이동] 이 다시 돌아 다른 장을 하던 검수원을 25번으로 되돌렸다.
     단계 — 'taken'(항차 화면이 꺼냄) → 'busy'(자동 가이드가 맡음) → 'done'(옮김·못 옮김 모두). */
export const MIR_GOTO_EVENT = 'gm-mir-goto';
const MIR_GOTO_TTL_MS = 60 * 1000;
let _pending = null;

/** [이동] — act = { voyageKey, mode, bay }. 받아 두고 알린다. 잘못된 요청이면 false. */
export function mirGotoRequest(act, now = Date.now()) {
  const bay = parseInt(act && act.bay, 10);
  if (!act || !act.voyageKey || !Number.isFinite(bay)) return false;
  _pending = { voyageKey: String(act.voyageKey), mode: act.mode === 'loading' ? 'loading' : 'discharge', bay, seq: now };
  try { window.dispatchEvent(new CustomEvent(MIR_GOTO_EVENT, { detail: { ..._pending } })); } catch (e) { console.warn('[미르 이동] 알림 실패 — 화면이 열리면서 꺼내 갑니다:', e); }
  return true;
}

/** 그 항차 화면이 꺼내 간다(한 번). 다른 항차·오래된 요청이면 null. */
export function mirGotoTake(voyageKey, now = Date.now()) {
  if (!_pending || _pending.voyageKey !== String(voyageKey || '') || now - _pending.seq > MIR_GOTO_TTL_MS) return null;
  const p = _pending;
  _pending = null;
  _setState(p.seq, 'taken');
  return p;
}

const _state = new Map();   // seq → 'taken' | 'busy' | 'done' (최근 20개)
function _setState(seq, st) {
  if (!seq) return;
  if (_state.get(seq) === 'done') return;   // 끝난 것은 되살리지 않는다
  _state.set(seq, st);
  if (_state.size > 20) _state.delete(_state.keys().next().value);
}
/** 자동 가이드가 맡았다(항차 화면의 «못 옮김» 시계가 이것을 본다) */
export function mirGotoTouch(seq) { _setState(seq, 'busy'); }
/** 끝났다 — 다시 그려져도 다시 돌지 않는다 */
export function mirGotoFinish(seq) { if (seq) { _state.set(seq, 'done'); if (_state.size > 20) _state.delete(_state.keys().next().value); } }
//  오래된 요청은 끝난 것으로 본다(4.40 재감사 하-1 — [이동] 직후 1초 안에 [✋ 수동]·다른 탭으로 가면 'busy' 로 남아, 몇십 분 뒤 작업 시작 탭에 돌아올 때
//    사람이 고른 수동을 덮고 옛 [이동] 을 마저 했다). 꺼내 가는 시한(60초)과 같다 — «다른 갱» 물음에 60초 넘게 머물면 장만 바뀌고 «베이 먼저» 는 안 건다.
export function mirGotoFinished(seq, now = Date.now()) { return !!seq && (_state.get(seq) === 'done' || now - seq > MIR_GOTO_TTL_MS); }
export function mirGotoState(seq) { return (seq && _state.get(seq)) || ''; }

/** 아직 꺼내 가지 않은 요청(App 이 항차를 옮길지 볼 때) */
export function mirGotoPeek(now = Date.now()) {
  return (_pending && now - _pending.seq <= MIR_GOTO_TTL_MS) ? { ..._pending } : null;
}
