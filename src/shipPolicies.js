// 선박 엠티 실 정책 (M3.5.5)
// 일부 선박은 엠티 컨테이너에도 실 작업이 필요함
// - 'verify': 엠티에 실이 이미 부착됨 (확인/리씰)
// - 'attach': 엠티에 실을 부착해야 함 (작업)
//
// 데이터 모델:
//   /shipPolicies/{vsl_uppercase} = {
//     mode: 'verify' | 'attach',
//     target: 'all_empty' | 'empty_with_pod',
//     pod: ['CNWEH', ...],   // empty_with_pod인 경우만
//     label: '설명',
//     registered_at, registered_by
//   }
import { ref, set, onValue } from 'firebase/database';   // 3.60-03: off 는 더 안 쓴다(구독 해제는 unsub)

//  ★ 4.40 — 기본 정책표·선박명 맞추기·LOLO 판정은 shipPolicyCore.js(파이어베이스 없음)로 옮겼다 — 미르 엔진이 콘앱 번들에 firebase 없이 같은 판정을 쓰게. 여기서 그대로 다시 내보낸다.
import { DEFAULT_SHIP_POLICIES, normalizeVslName, matchShipPolicy, isLoloShipByPolicy } from './shipPolicyCore.js';
export { DEFAULT_SHIP_POLICIES, normalizeVslName, matchShipPolicy, isLoloShipByPolicy };

// 컨테이너에 정책 적용 → sealMode 결정
// 결과: 'attach' | 'verify' | null (해당 없음)
export function applyPolicyToContainer(policy, container) {
  if (!policy || !container) return null;
  const fe = String(container.fe || '').toUpperCase();
  if (fe !== 'E') return null;  // Empty가 아니면 적용 X

  if (policy.target === 'all_empty') {
    // 1.83: «일반(실 작업 없음)» 정책은 실 UI 를 열지 않는다 — 종전엔 문자열 'none'(truthy)이
  //   그대로 나가 정책상 실 작업이 없는 배에도 실 입력칸·경고가 열렸다(검수사: "필요 없는데 말이죠").
  if (policy.mode === 'none') return null;
  return policy.mode;  // 'verify' 또는 'attach'
  }

  if (policy.target === 'empty_with_pod') {
    const pod = String(container.pod || '').toUpperCase();
    const targetPods = (policy.pod || []).map(p => p.toUpperCase());
    if (targetPods.includes(pod)) return policy.mode;
    // 특정 POD가 아니면 일반 처리
    return null;
  }

  return null;
}

export function fbSubscribeShipPolicies(db, callback) {
  const r = ref(db, 'shipPolicies');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;   // 3.60-03 (진단 M12): `off(r)` 는 같은 노드의 **모든** 구독을 끊는다 — 미르 플랜 덮개(두 번째 VoyagePage)가 닫히면 뒤 화면(홈·수석·항차)의 정책 구독까지 죽었다
}

export async function fbSaveShipPolicy(db, vsl, policy, by) {
  const norm = normalizeVslName(vsl);
  if (!norm) throw new Error('선박명 비어있음');
  const r = ref(db, `shipPolicies/${norm.replace(/[.#$\[\]\/]/g, '_')}`);
  await set(r, {
    ...policy,
    name: policy.name || norm,
    registered_at: Date.now(),
    registered_by: by || '',
  });
}





// ★ 1.83: 정책 조합 라벨 — 검수사 표현 그대로 (RZOR = LOLO+실확인이 한눈에).
//   «일반 / 엠티실 확인 / 엠티실 부착 / LOLO» 의 조합. 홈 「선박 실 정책」 판과 모달 요약이 같이 쓴다.
export function policyComboLabel(policy) {
  if (!policy) return '';
  const seal = policy.mode === 'attach' ? '엠티실 부착'
    : policy.mode === 'verify' ? '엠티실 확인' : '일반';
  const base = policy.lolo ? (policy.mode && policy.mode !== 'none' ? `LOLO+${seal}` : 'LOLO') : seal;
  return policy.rfSkip ? `${base}·리퍼 체크 없음` : base;   // 1.86: 머스크류 — 리퍼 다수라 체크 안 함
}
