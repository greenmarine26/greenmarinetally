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
import { canOpenChief, isHiddenStaff } from './staffList.js';
import { isOwnerName } from './adminGuard.js';
import { getMeToday, ymdKST } from './meToday.js';
import { isNoShiftShip, shiftAt, serverNow } from './workShift.js';   // 4.79: 주야 근무조 한 벌(순수 모듈)
import { getEquipNumber } from './utils.js';   // 4.38: mirWorkCtx — 내 호기(utils 는 workChoice 를 부르지 않아 순환 없음)

export const WORK_CHOICE_KEY = 'tallyone_work_choice';


//  ★ 문지기 캐시 — App 이 들고 있는 workChoice(화면이 보여 주는 그것)를 1순위로 본다. undefined = App 이 아직 안 세움(로그인 화면·연막검사) → localStorage 를 본다.
//    localStorage 만 보면 ① KST 자정을 넘긴 조회만 수석이 작업자로 둔갑하고 ② [검수원 변경] 으로 남의 이름을 눌렀다 돌아오면 meToday 가 남이라 문지기가 열리고 ③ 저장이 막힌 기기에서는 처음부터 열려 있다(3.50 감사 지적).
let _active;
export function setActiveWorkChoice(choice) { _active = choice || null; }
/** 4.46 — 지금 이 화면 세션의 로그인 이름(App 이 세운 workChoice.name). App 이 아직 안 세웠으면 ''(로그인 화면·연막검사). 보고 고치기 문지기가 «넘겨받은 이름»만 믿지 않게 대조한다. */
export function activeChoiceName() { return (_active && _active.name) ? String(_active.name).trim() : ''; }

/** 이 선택이 «내 선박» 으로 들고 있는 항차 키 — 작업자의 선박, 또는 근무시간 밖 조회만(4.79)이 고른 선박. 일반 검수원은 이 배 하나만 본다. 없으면 ''. */
export function ownVoyageOf(choice) {
  if (!choice || !choice.voyageKey) return '';
  return (choice.mode === 'work' || (choice.mode === 'view' && choice.offShift)) ? String(choice.voyageKey) : '';
}

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
    if (v.mode !== 'work' && v.mode !== 'view' && v.mode !== 'admin') return null;   // 4.30-03: 'admin' = 관리자(제약 없이 수정·자료 등록, 작업량·호기에는 안 잡힌다)
    if (v.mode === 'work' && !v.voyageKey) return null;
    if (v.mode === 'view' && v.offShift && !v.voyageKey) return null;   // 4.79: 근무시간 밖 조회만은 고른 선박을 들고 있다
    return v;
  } catch (e) { return null; }
}

export function saveWorkChoice(choice) {
  if (!choice || !choice.name) return null;
  //  4.79: 근무시간 밖 조회만(offShift)은 고른 선박·호기·조를 들고 있다 — 그 배만 보고(일반 검수원), «작업자로 전환» 때 그대로 쓴다. 그 밖의 조회만·관리자는 종전처럼 비운다.
  const off = choice.mode === 'view' && !!choice.offShift && !!choice.voyageKey;
  const bare = (choice.mode === 'view' || choice.mode === 'admin') && !off;
  const v = { name: String(choice.name), ymd: ymdKST(), mode: (choice.mode === 'view' || choice.mode === 'admin') ? choice.mode : 'work', voyageKey: bare ? '' : String(choice.voyageKey || ''), equip: bare ? '' : String(choice.equip || ''), shift: (choice.shift === 'day' || choice.shift === 'night') ? choice.shift : '', offShift: off, at: Date.now() };
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

//  ★ 4.30-03 (검수사 2026-10-17 «클로드나 저나 관리자 모드로 제약 없이 수정이나 자료 등록을 할 수 있게 해야 합니다. 제가 작업자로 갈 때는 모드를 선택하게 하면 됩니다» ·
//    «업로드 하기 위해 로그인 한 건데 매번 작업중 문구가 뜨고 있습니다»)
//    관리자 = 검수사(소유자)·클로드(개발·시험 계정). 로그인하면 선택 없이 곧바로 관리자다. 쓰는 일(업로드·수정)은 **전부 열려 있다** — isViewOnlyNow 가 false 라 assertCanWork·canWorkNow 가 그대로 통과한다.
//    다만 작업자가 아니다 — 호기·작업중·작업량에는 안 잡힌다(isNotWorkerNow). 서버 명단에는 workMode 'view' 로 적어 수석 보드·작업중 판정(inspectorStatus)이 손대지 않고 «작업중 아님» 으로 읽는다.
/** 관리자 모드로 들어갈 수 있는 사람 — 소유자(검수사)·클로드(HIDDEN_STAFF). */
export function isAdminUser(name) {
  const n = String(name || '').trim();
  return !!n && (isOwnerName(n) || isHiddenStaff(n));
}
/** 지금 이 기기의 오늘 본인이 «관리자» 로 들어와 있는가. */
export function isAdminNow() {
  if (_active !== undefined) return !!(_active && _active.mode === 'admin');
  const c = readWorkChoice(getMeToday());
  return !!(c && c.mode === 'admin');
}
/** 작업자가 아닌가 — 조회만 또는 관리자. 호기·작업중·활동 기록 문지기가 부른다(쓰기 문지기 isViewOnlyNow 와 다르다). */
export function isNotWorkerNow() { return isViewOnlyNow() || isAdminNow(); }

/** 지금 이 기기의 본인이 «작업자» 로 고른 작업 선박 키 — 조회만·미선택이면 ''. 활동 기록 문지기가 «지금 보는 화면이 내 작업 선박인가» 를 잴 때 부른다(판정 한 벌). */
export function myWorkVoyageNow() {
  const c = (_active !== undefined) ? _active : readWorkChoice(getMeToday());
  return (c && c.mode === 'work' && c.voyageKey) ? String(c.voyageKey) : '';
}

/** ★ 4.38 — 미르가 «이 검수원이 지금 작업 중인가»(작업 중 사담 미루기)를 잴 때 화면이 ctx.work 로 싣는 내 작업 표지 한 벌.
 *  { voyageKey, worker, equip } — 작업자로 고른 배가 없거나 조회만·관리자면 worker=false. mir.js 는 콘앱 번들에도 실려 이 파일을 직접 부르지 않는다. */
export function mirWorkCtx() {
  let voyageKey = '', worker = false, equip = '';
  try { voyageKey = myWorkVoyageNow() || ''; worker = !!voyageKey && !isNotWorkerNow(); } catch (e) { voyageKey = ''; worker = false; }
  try { equip = getEquipNumber() || ''; } catch (e) { equip = ''; }
  return { voyageKey, worker, equip };
}

/** ★ 4.08 — 이 사람이 서버에서 **어디까지 받아야 하는가**. 'all' = 항차 뿌리 전체 · 'body:항차키' = 그 항차 본문 하나만(다른 항차는 받지 않는다) · 'light' = 항차마다 info 만(선택 화면 목록).
 *  자유 열람(수석·부수석·테스터·소유자·개발 열람)은 전부를 본다. 일반 검수원은 고른 선박 하나뿐이라 그 본문만 받는다(뿌리 구독이 연결마다 3.6MB 를 다시 받던 것을 끊는다).
 *  이름이 아직 없으면(로그인 전) PC(wide)는 로그인 화면 현황판이 항차 본문(컨 수)을 세므로 전부, 폰은 info 만. */
export function voyagesScopeOf(name, choice, wide, onLoginRoute = false) {
  const n = String(name || '').trim();
  if (!n) return wide ? 'all' : 'light';
  if (isFreeRoamer(n)) return 'all';
  //  ★ 4.08-01 — 로그인해 있는 일반 검수원이 헤더 «검수원 변경»(#/login)을 열면 그 화면은 다른 사람이 «아무 선박이나» 고르는 로그인 화면이다.
  //    4.08 은 이때도 고른 선박 하나(body:키)만 받아 다른 사람의 선택 목록에 그 배 한 척만 떴다. 로그인 화면은 이름이 없을 때와 같은 범위로 되돌린다.
  if (onLoginRoute) return wide ? 'all' : 'light';
  const own = ownVoyageOf(choice);
  return own ? 'body:' + own : 'light';
}

/** 이 사람이 볼 수 있는 항차만 — 자유 열람이면 전부, 작업자면 고른 선박 하나. 선택이 없으면(로그인 직후) 빈 것. */
export function visibleVoyagesOf(choice, name, voyages) {
  const all = voyages || {};
  if (isFreeRoamer(name)) return all;
  const own = ownVoyageOf(choice);
  if (!own) return {};
  return all[own] ? { [own]: all[own] } : {};
}

export function canSeeVoyage(choice, name, voyageKey) {
  if (isFreeRoamer(name)) return true;
  const own = ownVoyageOf(choice);
  return !!own && own === voyageKey;
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

//  ★ 4.79 (검수사 2026-11-08) — 선박을 고르면 주간조·야간조를 묻고, 근무시간 밖에 접속하면 조회만이다.
//    «만약 야간조인데 지금 접속해 있다면 그인원은 보기만 하러 온것입니다» · «반대로 주간조인데 야간에 접속해있어도 조회만 하는 인원입니다» · «연태obwh 일조 rzor» 는 주야 구분이 없다.
//    «클로드»·«클로드2»(동시 테스트)와 검수사·수석·테스터는 시간 제한 없이 고른 대로 일한다 — 조는 묻지 않고 지금 서버 시각의 조로 자동 기록한다(호기 보유 키가 조를 쓰기 때문).
/** 조를 묻지 않고 시간 제한도 두지 않는 사람 — 자유 열람(수석·부수석·테스터·소유자·개발 열람)과 관리자(소유자·클로드·클로드2). */
export function isShiftExempt(name) { return isFreeRoamer(name) || isAdminUser(name); }
/** 이 사람이 이 항차에서 «주간조/야간조» 를 골라야 하는가 — 예외 인원·주야 구분 없는 배(OBWH·RZOR)는 아니다. */
export function shiftRequiredFor(name, voyageKey) { return !!voyageKey && !isShiftExempt(name) && !isNoShiftShip(null, voyageKey); }
/** 고른 조(picked)와 서버 시각으로 최종 모드를 가른다. 예외 인원·주야 없는 배는 시간 제한이 없다. { shift, offShift } — offShift 면 조회만으로 들어간다. */
export function resolveShift(name, voyageKey, picked, now = serverNow()) {
  if (!voyageKey) return { shift: '', offShift: false };
  if (isNoShiftShip(null, voyageKey)) return { shift: '', offShift: false };
  if (isShiftExempt(name)) return { shift: shiftAt(now), offShift: false };
  const sh = picked === 'day' || picked === 'night' ? picked : '';
  return { shift: sh, offShift: !!sh && sh !== shiftAt(now) };
}

/** 4.79-01: 오늘 기억해 둔 선택을 «지금 서버 시각의 조» 로 다시 판정한다 — 같은 날 재로그인·새로고침이 시간 판정을 건너뛰지 않게(감사 지적).
 *  낮에 고른 주간조가 밤에 다시 들어오면 조회만, 낮에 조회만이던 야간조가 저녁에 다시 들어오면 작업자. 조를 안 고른 것·조 없는 배·면제 인원은 그대로. */
export function reshiftChoice(ch, now = serverNow()) {
  if (!ch || !ch.voyageKey || (ch.shift !== 'day' && ch.shift !== 'night')) return ch;
  if (ch.mode !== 'work' && !(ch.mode === 'view' && ch.offShift)) return ch;
  const r = resolveShift(ch.name, ch.voyageKey, ch.shift, now);
  if (ch.mode === 'work' && r.offShift) return { ...ch, mode: 'view', offShift: true };
  if (ch.mode === 'view' && ch.offShift && !r.offShift) return { ...ch, mode: 'work', offShift: false };
  return ch;
}
/** 지금 이 기기의 본인이 쥔 조('day'|'night') — 조가 없는 선택·주야 없는 배는 ''. 호기 보유 판정(equipHolderOf)이 «내 조» 로 쓴다. */
export function myShiftNow() {
  const c = (_active !== undefined) ? _active : readWorkChoice(getMeToday());
  return (c && c.shift) ? String(c.shift) : '';
}
/** 4.79 이전에 로그인해 조 값이 없는 작업자인가 — 한 번만 묻는다. */
export function needsShiftAsk(choice, name) {
  return !!(choice && choice.mode === 'work' && choice.voyageKey && !choice.shift && shiftRequiredFor(name, choice.voyageKey));
}
/** 근무시간 밖이라 조회만으로 들어와 있는가 — 헤더에 «작업자로 전환» 이 선다. */
export function isOffShiftView(choice) { return !!(choice && choice.mode === 'view' && choice.offShift && choice.voyageKey); }
