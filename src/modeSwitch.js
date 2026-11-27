// 관리자로 막힌 자리에서 그 자리에 호기 단추 창을 띄워 작업자로 바꾸고 하던 일을 잇는다 — 검수사(소유자) 본인만 (TallyOne 5.26)
//   검수사 2026-11-27 07:14 «관리자 모드라 작업을 할수 없다면 그자리에서 토글 버튼을 띄우고 그자리에서 바꾼다음 작업 할수 있게 해주세요 왔다 갔다 번거롭지 않게» ·
//   07:45 «제가 막히는 부분만 수정해주세요 제가 적업을 관리자 모드에서 작업자 모드로 상황에 따라 그자리에서 아무문제없이 바꿀수 있게» · 07:51 «네 이대로 해주세요»(미리보기).
//   판정 한 벌 — 화면이 미리 막던 자리(alert(recordGateText)) 스물다섯 곳이 이것을 부른다. 소유자가 아니면 종전과 같은 알림창 한 번.
import { canRecordWorkNow, recordGateText, isAdminNow, activeChoiceName, activeChoiceEquip } from './workChoice.js';
import { getEquipNumber, setEquipNumber } from './utils.js';
import { isOwnerName } from './adminGuard.js';
import { parseHash } from './backHandler.js';

export const MODE_SWITCH_EVT = 'modeSwitchAsk';

//  감사 중6 — 그 자리에서 작업자로 바뀐 시각. 따라가기 해치 자동 보고가 이보다 앞선 사건을 내 이름으로 몰아 적지 않게 한다.
let _switchedAt = 0;
export function markSwitched(ms = Date.now()) { _switchedAt = ms; }
export function switchedAt() { return _switchedAt; }

/** 지금 보고 있는 배 화면의 항차 키 — 배 화면이 아니면 ''. (AdminWorkStart 와 같은 판정) */
export function viewingVoyageKey() {
  try { const r = parseHash((typeof window !== 'undefined' && window.location.hash) || ''); return (r && r.name === 'voyage' && r.voyageKey) ? String(r.voyageKey) : ''; }
  catch (e) { console.warn('[5.26] 화면 판정 실패 — 배 화면이 아닌 것으로 봅니다', e); return ''; }
}

/** 소유자가 관리자로 배 화면에 있어 그 자리에서 작업자로 바꿀 수 있는가. */
export function canSwitchHere() {
  return !!(isOwnerName(activeChoiceName()) && isAdminNow() && viewingVoyageKey());
}

/** 호기 단추 창을 연다. 바뀌면 true, 취소·실패면 false 로 풀린다. 창을 받을 화면이 없으면 null(부른 쪽이 종전 알림). */
export function openModeSwitch(what, opts = {}) {   // opts.again — 하던 일이 이미 끝나(쓰는 자리에서 막힘) 한 번 더 눌러야 하는 경우
  const vk = viewingVoyageKey();
  if (!vk) return null;
  return new Promise((resolve) => {
    const detail = { what: what || '작업', voyageKey: vk, resolve, handled: false, again: !!(opts && opts.again) };
    try { window.dispatchEvent(new CustomEvent(MODE_SWITCH_EVT, { detail })); } catch (e) { console.warn('[5.26] 바꾸기 창 알림 실패', e); }
    if (!detail.handled) resolve(null);
  });
}

/** 작업 기록을 남겨도 되는가 — 되면 true. 소유자 관리자면 그 자리 호기 창을 띄워 바뀐 뒤 true(하던 일을 잇는다). 그 밖은 종전 알림창 뒤 false. */
export async function askRecordSwitch(what) {
  if (canRecordWorkNow()) return true;
  if (canSwitchHere()) {
    const r = await openModeSwitch(what);
    if (r === true) {
      //  재감사 중B — 돌려주기 전에 기기 호기를 등록 호기로 맞춘다(이어지는 완료가 옛 호기·빈 호기로 적히지 않게).
      const eq = activeChoiceEquip();
      if (eq && getEquipNumber() !== eq) { try { setEquipNumber(eq); window.dispatchEvent(new CustomEvent('equipChanged', { detail: eq })); } catch (e) { console.warn('[5.26] 기기 호기 맞춤 실패', e); } }
      return canRecordWorkNow();
    }
    if (r === false) return false;   // 사람이 취소 — 창에서 이미 말했다
  }
  alert(recordGateText(what));
  return false;
}
