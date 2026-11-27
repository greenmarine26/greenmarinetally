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
//  ⚠ 이 파일은 localStorage 와 명단만 본다(firebase 를 부르지 않는다 · utils 는 부르지만 utils 는 이 파일을 부르지 않는다) — firebase.fbSetInspectorActivity 가 이 파일을 부르므로 순환을 만들면 안 된다.
import { canOpenChief, isHiddenStaff } from './staffList.js';
import { isOwnerName } from './adminGuard.js';
import { getMeToday, ymdKST } from './meToday.js';
import { isNoShiftShip, shiftAt, serverNow } from './workShift.js';   // 4.79: 주야 근무조 한 벌(순수 모듈)
import { getEquipNumber, craneCrewOf, crewShiftKey, shipHasShifts } from './utils.js';   // 5.20: 관리자 작업 선박 — 호기 검수원 등록(craneCrew) 한 벌로 읽는다(utils 는 workChoice 를 부르지 않아 순환 없음)   // 4.38: mirWorkCtx — 내 호기(utils 는 workChoice 를 부르지 않아 순환 없음)

export const WORK_CHOICE_KEY = 'tallyone_work_choice';


//  ★ 문지기 캐시 — App 이 들고 있는 workChoice(화면이 보여 주는 그것)를 1순위로 본다. undefined = App 이 아직 안 세움(로그인 화면·연막검사) → localStorage 를 본다.
//    localStorage 만 보면 ① KST 자정을 넘긴 조회만 수석이 작업자로 둔갑하고 ② [검수원 변경] 으로 남의 이름을 눌렀다 돌아오면 meToday 가 남이라 문지기가 열리고 ③ 저장이 막힌 기기에서는 처음부터 열려 있다(3.50 감사 지적).
let _active;
export function setActiveWorkChoice(choice) { _active = choice || null; }
/** 4.46 — 지금 이 화면 세션의 로그인 이름(App 이 세운 workChoice.name). App 이 아직 안 세웠으면 ''(로그인 화면·연막검사). 보고 고치기 문지기가 «넘겨받은 이름»만 믿지 않게 대조한다. */
/** 5.26 — 지금 화면 선택의 호기(작업자이면서 관리자면 그 조 등록 호기). */
export function activeChoiceEquip() { return (_active && _active.equip) ? String(_active.equip).trim() : ''; }
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
//  ★ 5.20 관리자 작업 선박 — 검수사 2026-11-22 14:58 «관리자가 작업을 시작할려고 하거나 관리자 모드로 갈려고 할떄 쉽게 바꿀수 있게 해주세요 … 관리자 모드로 되어있어서 작업시작 셋팅을 다시 하는 경우가 다반사 입니다»
//    · 15:01 «관리자가 작업 시작을 누르면 작업자이면서 관리자가 되어야 합니다. 그래야 동시에 문제점을 해결하면서 작업도 할수 있습니다» · 15:03 «다만 관리자가 작업할 선박이 아닌경우에는
//    작업자가 아닌 관리자 모드여만 하고 관리자는 본인이 작업할 선박을 호기를 미르에게 통보합니다».
//    ⇒ 관리자의 «작업 선박·호기» 는 미르 호기 검수원 등록(info.craneCrew/{지금 조}/{N호기} = 본인 이름) 한 벌로 읽는다 — 새 저장 자리를 만들지 않는다.
//      그 배 화면에서만 작업자이면서 관리자(mode 'work' + adminWork) · 그 밖의 배는 관리자뿐(기록 없음). 다음 조가 되거나 그 호기에 다른 사람이 등록되면 저절로 관리자뿐.
//      주야 구분 없는 배(연태·일조)는 가장 최근 등록 조를 36시간까지 본다(crewSegments 의 «다음 등록까지» 와 같은 뜻).
const _NO_SHIFT_SPAN = 36 * 3600000;
/** 관리자 본인이 지금 작업하기로 등록된 선박·호기. 관리자가 아니거나 등록이 없으면 null. { voyageKey, equip:'N호기', shiftKey, shift:'day'|'night'|'', at } */
export function adminWorkOf(name, voyages, nowMs = serverNow()) {
  const n = String(name || '').trim();
  if (!isAdminUser(n) || !voyages || typeof voyages !== 'object') return null;
  const curKey = crewShiftKey(undefined, nowMs, 0).key;
  let best = null;
  for (const vk of Object.keys(voyages)) {
    const info = voyages[vk] && voyages[vk].info;
    if (!info || !info.craneCrew) continue;
    const segs = craneCrewOf(info);
    if (!segs.length) continue;
    let seg = null;
    if (shipHasShifts(info.vsl)) seg = segs.find((s) => s.key === curKey) || null;
    else {
      //  주야 없는 배 — 이 조 키로 적은 등록은 시작 전이어도 든다(17:30~19:00·06:30~08:00 에 한 등록이 늦게 들던 것 · 감사 5.20).
      const past = segs.filter((s) => s.key === curKey || s.startMs <= nowMs + 2 * 3600000);
      seg = past.length ? past[past.length - 1] : null;
      if (seg && nowMs - seg.startMs > _NO_SHIFT_SPAN) seg = null;
    }
    if (!seg) continue;
    //  내 칸 가운데 가장 늦게 적은 칸 — 미르 등록은 옛 호기를 지우지 않아 «1호기 → 3호기» 로 바꾸면 두 칸에 남는다(감사 5.20).
    //  배 사이 비교도 내 칸의 시각으로 한다(그 조 남의 등록 시각에 끌려가지 않게).
    const raw = (info.craneCrew && info.craneCrew[seg.key]) || {};
    const atOf = (no) => { const v = raw[`${no}호기`]; return Number(v && typeof v === 'object' && v.at) || 0; };
    const _left = (no) => { const v = raw[`${no}호기`]; return !!(v && typeof v === 'object' && Number(v.leftAt) > 0); };   // 5.26: 관리자로 돌아간(떠난) 칸은 작업 선박이 아니다
    const nos = Object.keys(seg.cranes).filter((no) => String(seg.cranes[no]).trim() === n && !_left(no)).map(Number).sort((a, b) => (atOf(b) - atOf(a)) || (a - b));
    if (!nos.length) continue;
    const cand = { voyageKey: vk, equip: `${nos[0]}호기`, shiftKey: seg.key, shift: /야간$/.test(seg.key) ? 'night' : (/주간$/.test(seg.key) ? 'day' : ''), at: atOf(nos[0]) || Number(seg.regAt) || 0 };
    if (!shipHasShifts(info.vsl)) cand.shift = '';
    if (!best || cand.at > best.at) best = cand;   // 두 배에 등록돼 있으면 나중에 등록한 배
  }
  return best;
}
/** 화면이 쓸 «지금 상태» — 관리자가 자기 작업 선박(viewingKey)을 보고 있으면 작업자이면서 관리자(mode 'work' · adminWork true), 아니면 고른 그대로. */
export function effectiveWorkChoice(choice, adminWork, viewingKey) {
  if (!choice || choice.mode !== 'admin' || !adminWork || !viewingKey || viewingKey !== adminWork.voyageKey) return choice;
  return { ...choice, mode: 'work', voyageKey: adminWork.voyageKey, equip: adminWork.equip, shift: adminWork.shift, shiftKey: adminWork.shiftKey, adminWork: true };   // 5.26 shiftKey — 헤더 [관리자로] 가 그 조 칸에 떠난 표시
}
//  5.20: 관리자의 지금 조 작업 선박 등록(adminWorkOf 결과) — App 이 렌더 중에 세운다. 활동 기록(fbSetInspectorActivity)이
//    다른 배·홈 화면에서도 workMode 'work' 를 지키게 한다(감사 5.20 — 30초 틱이 'view' 로 덮어 호기가 비어 보이던 것).
let _adminReg = null;
export function setAdminWorkReg(aw) { _adminReg = aw && aw.voyageKey ? aw : null; }
export function adminWorkRegNow() { const c = (_active !== undefined) ? _active : null; return (c && (c.mode === 'admin' || c.adminWork)) ? _adminReg : null; }
//  ★ 5.20 관리자 투명 — 검수사 2026-11-22 15:08 «관리자로 자료를 볼때는 다른 검수원들이 제가 접속한걸 몰랐으면 합니다 투명인간 처럼» ·
//    15:10 «제가 접속하면 제가 몇호기 김성일 이라고 입력하지 않는한 보이면 안된다는겁니다».
//    문지기는 명단이 들어오는 자리(App 의 inspectors 구독) 하나다 — 다른 사람 화면에 넘기기 전에 소유자 줄을 뺀다.
//    «호기를 넣었다» = 명단 줄에 배정 항차·호기(assignVoyage·assignEquip)가 있다(로그인 때 작업 선택이든 미르 N호기 등록이든 fbSetInspectorChoice 한 벌이 적는다).
//    소유자·클로드 화면은 그대로 다 보인다. 클로드 줄은 종전대로 화면마다 isVisibleStaff 가 늘 가린다(HIDDEN_STAFF).
export function ownerShownToOthers(rec) {
  return !!(rec && String(rec.assignVoyage || '').trim() && String(rec.assignEquip || '').trim());
}
//  ★ 5.22-02 — 검수사 2026-11-23 19:37 «제이름을 다른 검수원에게 보이지 말라고 했지 저까지 안보이게 하라고는 안했는데 제컴 제폰에서 이름이 안보입니다.
//    사무실에 업무용 PC에서도 안보이고 매번 이름을 쳐서 들어가야 합니다.» — 로그인 화면은 보는 사람(viewer)을 모른다. 그래서 소유자 신뢰 기기
//    (admin_guard 의 소유자 devices — 비밀번호로 한 번 확인한 검수사 기기)면 소유자가 보는 것으로 친다(ownerDevice). 남의 기기에는 종전대로 안 보인다.
export function inspectorsSeenBy(inspectors, viewer, ownerDevice = false) {
  if (!inspectors || typeof inspectors !== 'object') return inspectors || {};
  if (!viewer && ownerDevice) return inspectors;
  if (viewer && (isOwnerName(viewer) || isHiddenStaff(viewer))) return inspectors;   // 15:11 «클로드나 저는 다 볼수 있지만 다른 사용자는 클로드와 저를 볼수 없는것입니다. 제가 작업자 모드일떄만 보이는거죠»
  let out = null;
  for (const [k, rec] of Object.entries(inspectors)) {
    const nm = (rec && rec.name) || k;
    if (!isOwnerName(nm) || ownerShownToOthers(rec)) continue;
    if (!out) out = { ...inspectors };
    delete out[k];
  }
  return out || inspectors;
}
/** 지금 관리자이면서 작업자인가(자기 작업 선박 화면). 보고 창 문구가 부른다. */
export function isAdminWorkingNow() {
  const c = (_active !== undefined) ? _active : null;
  return !!(c && c.mode === 'work' && c.adminWork);
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
//  ★ 5.12 (검수사 2026-11-18 12:42 «관리자로 들어 가서 앱 상태를 점검 하려고 작업시작을 누르고 장비를 선택했을떄 제이름과 제가 작업한걸로 기록되지 않아야 합니다»):
//    관리자는 고치고 올리는 일(수정·자료 등록)은 전부 되지만 **검수 작업 기록**(완료·보류·초과 컨·작업 보고·사진 보고·교대·해치 자동 보고·X-RAY 봉인자 등록 — 호기 이동·외부 중단 보고와 수화물 확정은 관리 기록이라 열어 둔다)은 남기지 않는다.
//    작업자로 갈 때는 미르 호기 등록(5.20 — 헤더 관리자 칩은 뺐다)으로 그 배에서만 작업자이면서 관리자가 된다(옛 4.30-03 «제가 작업자로 갈 때는 모드를 선택하게 하면 됩니다»).
/** 지금 이 기기에서 검수 작업 기록(완료·보고·해치…)을 내 이름으로 남겨도 되는가 — 조회만·관리자는 아니다. */
export function canRecordWorkNow() { return !isNotWorkerNow(); }
/** 작업 기록이 막혔을 때의 문구 — 관리자면 관리자 문구, 조회만이면 조회만 문구(화면 미리 막기가 부른다). */
export function recordGateText(what) { return isAdminNow() ? adminWorkGateText(what) : workGateText(what); }
/** 관리자라서 작업 기록이 막혔을 때 사람에게 보이는 문구 한 벌. */
export function adminWorkGateText(what) {
  //  5.20: 헤더의 관리자 칩은 뺐다(검수사 2026-11-22 15:06 «아 헤더에서 관리자는 뺴주세요») — 작업은 이 배 호기 등록으로 시작한다.
  return `🛠 관리자로 들어와 있습니다 — 이 배는 작업자로 등록돼 있지 않아 작업으로 기록하지 않습니다.\n\n«${what || '작업'}» 은 이름·호기로 남지 않습니다. 이 배에서 작업하려면 작업 보고 창의 [이 배 N호기로 등록하고 시작]을 누르거나 미르에게 «N호기 이름» 으로 알리세요. 관리자 권한은 그대로입니다.`;
}

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
