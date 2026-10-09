// 베이사전에 없는 배인가 — «사전에 없음» 표기의 판정 한 벌(4.19 · 검수사 §7.8-⑬ «항차는 등록하기 사전에 없음 표기»).
import { getFbBayDict, getShipIdentity } from './shipStructure.js';
import { isLoloShipByPolicy } from './shipPolicies.js';

/** ★ 4.19 — **이 배가 베이사전에 없는가.**
 *  사전에 없는 배의 EDI 가 와도 항차는 등록하고, 화면(항차 목록 카드·맨 위 머리줄·베이플랜 머리)에 «사전에 없음» 을 붙인다 — 판정은 이 함수 한 벌(DictMissingChip 이 부른다).
 *  «사전» = 정본 `ship_bay_dict_v3` 의 **베이 구조**(bayDef·baysSummary). 이름·콜사인만 있는 껍데기(EDI 자동 등록 M5.89 가 만드는 것)는 사전이 아니다 —
 *    `getShipBayDictData` 가 껍데기를 버리는 것과 같은 기준(그 배의 베이플랜을 그릴 사전이 없다).
 *  ⚠ 항차 info 에 새 칸을 쓰지 않는다 — 수석이 매트릭스를 만든 순간 표기가 저절로 사라져야 한다(써 둔 표식은 남는다).
 *  ⚠ 덱플랜 배(RZOR — 선박 정책 lolo)는 셀 매트릭스를 만들지 않는 배라(검수사 확정 3.5) 대상이 아니다.
 *  ⚠ 사전을 아직 못 받았으면(부팅 직후·오프라인 첫 실행) 말하지 않는다 — 모르는 것을 «없다» 로 단정하지 않는다.
 *  ⚠ shipStructure 에 두지 않은 까닭 — 선박 정책(shipPolicies)이 firebase/database 를 불러, shipStructure 를 묶는 연막검사들이 Firebase 없이 못 돈다.
 */
export function bayDictMissingOf(info) {
  const code = String((info && info.vsl) || '').toUpperCase().replace(/\s+/g, '');
  if (!code) return false;
  if (!Object.keys(getFbBayDict() || {}).length) return false;
  if (isLoloShipByPolicy(code) || isLoloShipByPolicy((info && info.vslFull) || '')) return false;
  const id = getShipIdentity((info && info.imo) || '', code);
  return !(id && id.hasBayDef);
}
