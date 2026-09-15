// 로그인 뒤 «작업자 / 조회만» 선택 상태 한 벌(3.50) — 누가 어느 선박의 작업자인지, 조회만인지를 기기(localStorage)에 하루 기억하고, 화면·호기·활동 기록 문지기가 전부 여기서 읽는다.
//
//  검수사 2026-09-15 —
//   «앱에 접속했다고 해서 모두 작업자는 아닙니다. 저 같은 경우는 점검차 여러선박을 조회하고 하는데 매번 호기를 기록해야 하는 경우가 있습니다»
//   «저와 수석 그리고 테스터를 제외하곤 모두 본인 작업 선박만 볼수있게 해주세요. 로그인후 작업선박 선택후 앱 작동»
//   «저와 수석이 단순 조회로 접속을 하면 호기에 기록이 안되게 하고 작업자로 선택을 하면 수석에게도 장비가 기록되어 검수가 될수 있게»
//   «대신 저와 수석은 작업자를 고르 더라도 모든 선박을 조회 할수 있어야 합니다»
//
//  규칙 —
//   · 자유 열람(freeRoamer) = 수석·부수석·테스터·소유자·개발 열람(canOpenChief 한 벌 — isChief 는 건드리지 않는다, 잠금 판정이 딸려 있다).
//     로그인 뒤 «조회만 / 작업자» 를 고른다. **조회만은 보기만 된다(3.51)** — 호기 지정·자동 가이드·베이뷰까지 작업자와 똑같이 돌지만 쓰는 일(완료·보고·자리·설정)이 전부 막히고 활동의 작업 자리도 안 적혀 작업중으로 세지 않는다. 작업자면 선박·호기가 기록돼 검수가 된다.
//     어느 쪽이든 모든 선박을 본다.
//   · 그 밖(일반 검수원) = 작업자뿐. 작업 선박(+호기)을 고르지 않으면 들어갈 수 없고, 고른 선박 안에서만 앱이 돈다.
//   · 기억은 기기·이름·오늘(KST) 단위 — meToday 와 같은 규칙. 로그아웃하면 지운다. 헤더 [변경] 으로 다시 고른다.
//  ⚠ 이 파일은 localStorage 와 명단만 본다(utils·firebase 를 부르지 않는다) — utils.setEquipNumber·firebase.fbSetInspectorActivity 가 이 파일을 부르므로 순환을 만들면 안 된다.
import { canOpenChief } from './staffList.js';
import { isOwnerName } from './adminGuard.js';
import { getMeToday, ymdKST } from './meToday.js';

export const WORK_CHOICE_KEY = 'tallyone_work_choice';


//  ★ 문지기 캐시 — App 이 들고 있는 workChoice(화면이 보여 주는 그것)를 1순위로 본다. undefined = App 이 아직 안 세움(로그인 화면·연막검사) → localStorage 를 본다.
//    localStorage 만 보면 ① KST 자정을 넘긴 조회만 수석이 작업자로 둔갑하고 ② [검수원 변경] 으로 남의 이름을 눌렀다 돌아오면 meToday 가 남이라 문지기가 열리고 ③ 저장이 막힌 기기에서는 처음부터 열려 있다(3.50 감사 지적).
let _active;
export function setActiveWorkChoice(choice) { _active = choice || null; }

/** 모든 선박을 자유로 보는 사람인가 — 수석·부수석·테스터·소유자·개발 열람. */
export function isFreeRoamer(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  return canOpenChief(n, isOwnerName(n));
}

/** 오늘 이 기기에서 이 이름이 고른 것. 없거나 날이 바뀌었거나 다른 이름이면 null. { name, ymd, mode:'work'|'view', voyageKey, equip, at } */
export function readWorkChoice(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  try {
    const v = JSON.parse(localStorage.getItem(WORK_CHOICE_KEY) || 'null');
    if (!v || v.name !== n || v.ymd !== ymdKST()) return null;
    if (v.mode !== 'work' && v.mode !== 'view') return null;
    if (v.mode === 'work' && !v.voyageKey) return null;
    return v;
  } catch (e) { return null; }
}

export function saveWorkChoice(choice) {
  if (!choice || !choice.name) return null;
  const v = { name: String(choice.name), ymd: ymdKST(), mode: choice.mode === 'view' ? 'view' : 'work', voyageKey: choice.mode === 'view' ? '' : String(choice.voyageKey || ''), equip: choice.mode === 'view' ? '' : String(choice.equip || ''), at: Date.now() };
  try { localStorage.setItem(WORK_CHOICE_KEY, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 이번 세션은 App state 로 돈다 */ }
  return v;
}

export function clearWorkChoice() {
  try { localStorage.removeItem(WORK_CHOICE_KEY); } catch (e) { /* localStorage 가 막힌 기기 — 읽기도 실패해 null 이라 지울 것이 없다 */ }
}

/** 지금 이 기기의 오늘 본인이 «조회만» 으로 들어와 있는가 — 호기 저장·활동 기록 문지기가 부른다(로그인 화면에서는 false). */
export function isViewOnlyNow() {
  if (_active !== undefined) return !!(_active && _active.mode === 'view');
  const c = readWorkChoice(getMeToday());
  return !!(c && c.mode === 'view');
}

/** 지금 이 기기의 본인이 «작업자» 로 고른 작업 선박 키 — 조회만·미선택이면 ''. 활동 기록 문지기가 «지금 보는 화면이 내 작업 선박인가» 를 잴 때 부른다(판정 한 벌). */
export function myWorkVoyageNow() {
  const c = (_active !== undefined) ? _active : readWorkChoice(getMeToday());
  return (c && c.mode === 'work' && c.voyageKey) ? String(c.voyageKey) : '';
}

/** 이 사람이 볼 수 있는 항차만 — 자유 열람이면 전부, 작업자면 고른 선박 하나. 선택이 없으면(로그인 직후) 빈 것. */
export function visibleVoyagesOf(choice, name, voyages) {
  const all = voyages || {};
  if (isFreeRoamer(name)) return all;
  if (!choice || choice.mode !== 'work' || !choice.voyageKey) return {};
  return all[choice.voyageKey] ? { [choice.voyageKey]: all[choice.voyageKey] } : {};
}

export function canSeeVoyage(choice, name, voyageKey) {
  if (isFreeRoamer(name)) return true;
  return !!(choice && choice.mode === 'work' && choice.voyageKey && choice.voyageKey === voyageKey);
}

/** 호기 없이 완료를 누를 때 보이는 문구(3.51: 조회만도 호기를 쓰므로 이 문구는 «호기 없음» 한 뜻뿐이다). */
export function equipGateText() {
  return '갱(호기)을 먼저 선택하세요 — 상단 호기 버튼.';
}

//  ★ 3.51 (검수사 2026-09-15 확정) — *«전제는 조회만으로는 아무 작업을 할수 없습니다. 보기만 할뿐»* ·
//    *«실테스트를 할려면 작업자로 들어 와야 합니다. 클로드나 저나 테스트후 자료는 초기화 시켜야 합니다»*
//    ⇒ 조회만은 **보기는 전부** 된다(호기 지정·자동 가이드·베이뷰·따라가기 화면). **쓰는 것만** 못 한다 —
//      완료·완료취소·초과 등록·위치 수정·작업 보고. 문지기는 화면이 아니라 **쓰는 자리**(firebase)에 세운다(옆길을 막는다).
/** 지금 «작업»(현장 기록에 쓰는 일)을 할 수 있는가 — 조회만이면 false. */
export function canWorkNow() { return !isViewOnlyNow(); }

/** 조회만이라 막혔을 때 사람에게 보이는 문구 한 벌. what 을 주면 무엇이 막혔는지 앞에 붙는다. */
export function workGateText(what) {
  return `🔍 조회만으로 들어와 있습니다 — 보기만 됩니다.\n\n«${what || '작업'}» 은 기록되지 않습니다. 작업하려면 헤더의 [🔍 조회만]을 눌러 작업자(선박·호기)로 바꾸세요.`;
}
