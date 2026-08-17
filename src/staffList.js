// (주)그린마린 직원 명단 — 접속 화이트리스트 + 직책 정보
// 작성: 2026-05-12 / 명단 사진 기준
// 새 직원 추가/퇴사자 삭제 시 이 파일 직접 편집

export const STAFF_LIST = [
  // 임원진
  { name: '최관묵', role: '회장' },
  { name: '신성호', role: '대표이사' },
  { name: '표인수', role: '상무이사' },
  { name: '황창웅', role: '이사' },

  // 실장/부장/차장/과장
  { name: '최장욱', role: '실장' },
  { name: '이현규', role: '부장(수석검수)' },
  { name: '김명보', role: '부장(수석검수)' },
  { name: '권수안', role: '차장' },
  { name: '정영배', role: '차장' },
  { name: '오승택', role: '차장(수석검수)' },
  { name: '성창모', role: '과장(수석검수)' },
  { name: '이강익', role: '과장(수석검수)' },

  // 대리
  { name: '김유신', role: '대리' },
  { name: '김석', role: '대리' },
  { name: '전우수', role: '대리(수석검수)' },
  { name: '김성일', role: '대리(부수석)' },

  // 검수
  { name: '장문영', role: '검수' },
  { name: '김판석', role: '검수' },
  { name: '최관식', role: '검수' },
  { name: '길태윤', role: '검수' },
  { name: '최유택', role: '검수' },
  { name: '김홍규', role: '검수' },
  { name: '천희준', role: '검수' },
  { name: '한성호', role: '검수' },
  { name: '이병진', role: '검수' },
  { name: '오종하', role: '검수' },
  { name: '이인철', role: '검수' },
  { name: '이종부', role: '검수' },
  { name: '최원형', role: '검수' },
];

// 이름만 배열로 (화이트리스트 검사용)
export const STAFF_NAMES = STAFF_LIST.map(s => s.name);

// 이름 → 직책 매핑
export const STAFF_ROLES = Object.fromEntries(STAFF_LIST.map(s => [s.name, s.role]));

// 정규화 (공백/특수문자 제거 후 비교용)
export function isStaff(name) {
  if (!name) return false;
  const norm = String(name).trim().replace(/[,\s\.\-_\/\\]/g, '');
  return STAFF_NAMES.some(n => n === norm || n.replace(/\s/g, '') === norm);
}

// V9.57(B-4 선행): 서버 staffList 직책 캐시 — Firebase 구독(fbSubscribeStaffList) 데이터를
//   구독부(App 등, 연결은 판2)가 setServerRoles로 밀어 넣는다. 모듈 캐시 방식이라 React 의존이 없고
//   getStaffRole/isChief는 순수 함수 형태를 유지한다. 서버 값 우선, 코드 STAFF_ROLES는 폴백.
let SERVER_ROLES = {};
let SERVER_ADDED = {};   // TallyOne 1.74: 앱에서 추가한 시각 — 새 인원끼리의 순서에 쓴다
export function setServerRoles(map) {
  const out = {}; const at = {};
  for (const [k, v] of Object.entries(map || {})) {
    const name = String((v && typeof v === 'object' && v.name) || k).trim();
    const role = typeof v === 'string' ? v.trim() : String((v && v.role) || '').trim();
    if (name && role) out[name] = role;
    const t = Number(v && typeof v === 'object' && v.addedAt) || 0;
    if (name && t) at[name] = t;
  }
  SERVER_ROLES = out; SERVER_ADDED = at;
}
export function getStaffAddedAt(name) { return SERVER_ADDED[String(name || '').trim()] || 0; }

export function getStaffRole(name) {
  if (!name) return '';
  const norm = String(name).trim();
  // V9.57: 서버 명단(관리자가 앱에서 추가/변경한 직책) 우선 — 코드 명단은 폴백
  return SERVER_ROLES[norm] || STAFF_ROLES[norm] || '';
}

// ─── TallyOne 1.71: 화면에 보이는 직책 (검수사 확정 2026-08-15) ────────────────
//   *"이사급이상만 직급을 보여주고 그 이하는 직책만 보여주세요. 직책이 없는 인원은 검수로 적어주세요."*
//   *"정렬순은 같은 직책이면 직급순위로 보여주시면 됩니다. (직급은 정렬용으로만, 보여주지 말고)"*
//
//   명단의 `role` 은 「직급(직책)」 한 덩어리다 — 예 `부장(수석검수)` · `대리(부수석)` · `차장` · `검수`.
//   ⚠ 판정은 여기 한 벌만 둔다. 인원관리·로그인 화면이 같은 함수를 쓴다(같은 판정 두 벌 금지).
const EXEC_RANKS = ['회장', '대표이사', '부사장', '전무이사', '상무이사', '이사'];   // 이사급 이상 = 직급을 그대로 보여준다
const RANK_ORDER = ['회장', '대표이사', '부사장', '전무이사', '상무이사', '이사', '실장', '부장', '차장', '과장', '대리'];
const DUTY_ORDER = ['__EXEC__', '실장', '수석검수', '부수석', '검수'];   // 검수사 확정 순서

// TallyOne 1.72: **직급 없는 인원은 입사일 순** (검수사가 직접 준 순서 2026-08-15).
//   *"검수들도 직급순 정렬 부탁드립니다. 직급이 없으면 입사일 순입니다."*
//   ⚠ 입사일 자체는 앱 어디에도 없다 — 검수사가 불러 준 **순서**가 정본이다.
//     `staffList/{name}.addedAt` 은 «앱에 등록한 시각»이지 입사일이 아니다(실측 — 2026-06 이후만 있다).
//   ⚠ 여기 없는 이름(신규 입사)은 이 배열 뒤에 붙고, 그 안에서는 이름순이다.
//     새 사람이 들어오면 **이 배열에 자리를 넣어 줘야** 순서가 맞는다.
const HIRE_ORDER = [
  '장문영', '오종하', '최관식', '김판석', '한성호', '이인철', '이종부',
  '이종현', '송제욱', '박진우', '고현석', '이형출',
];

// TallyOne 1.74: **맨 아래 고정** (검수사 확정 2026-08-15)
//   *"지금이후 부터 인원 추가를 누르면 김유신 최원형 위로 올라가게 하면 됩니다."*
//   → 이 둘은 앞으로 들어오는 사람보다 항상 아래다. 새로 추가되는 사람은 그 위에 쌓인다.
const TAIL_ORDER = ['김유신', '최원형'];

/** role 문자열을 { rank, duty } 로 가른다. `부장(수석검수)` → { rank:'부장', duty:'수석검수' } */
export function splitRole(role) {
  const s = String(role || '').trim();
  const m = s.match(/^([^(（]*)[\s]*[(（]([^)）]*)[)）]\s*$/);
  const rank = (m ? m[1] : s).trim();
  const duty = (m ? m[2] : '').trim();
  return { rank, duty };
}

/** 화면에 찍을 한 줄. 이사급 이상 = 직급, 그 이하 = 직책(없으면 '검수'). */
export function displayRole(name) {
  const { rank, duty } = splitRole(getStaffRole(name));
  if (EXEC_RANKS.includes(rank)) return rank;      // 임원은 직급 그대로
  if (duty) return duty;                            // 부장(수석검수) → 수석검수
  if (rank === '실장') return '실장';               // 실장은 직책으로 본다(검수사 확정)
  if (rank === '검수' || !rank) return '검수';
  // TallyOne 1.74: 괄호 없이 **직책만** 적힌 경우(직급 없는 수석검수·부수석 등) — 그대로 직책이다.
  //   1.71 은 이 경우를 「검수」로 떨어뜨렸다(인원 추가 폼에서 직급 없이 직책만 고르면 바로 걸린다).
  if (!RANK_ORDER.includes(rank)) return rank;
  return '검수';                                    // 차장·과장·대리 등 직책 없는 직급 → 검수
}

/** 정렬 키 — 1차 직책, 2차 직급, 3차 입사일(직급 없는 사람끼리). 직급·입사일은 화면에 안 보인다. */
export function staffSortKey(name) {
  const nm = String(name || '').trim();
  const { rank } = splitRole(getStaffRole(nm));
  const shown = displayRole(nm);
  const dutyIdx = EXEC_RANKS.includes(rank) ? 0 : (DUTY_ORDER.indexOf(shown) < 0 ? DUTY_ORDER.length : DUTY_ORDER.indexOf(shown));
  // HIRE_ORDER 에 이름이 있으면 **직급을 무시하고** 입사일 순으로 본다.
  //   검수사 확정 2026-08-15 — *"김유신도 퇴사자이지만 **지원인원이므로 직급 무시** 했습니다."*
  //   (명단 role 은 '대리'로 두고 정렬만 검수 취급한다 — 원 명단을 고치지 않는다.)
  const _hi = HIRE_ORDER.indexOf(nm);
  const _ti = TAIL_ORDER.indexOf(nm);
  // 직급 없는 사람 안에서의 자리 — 3덩이. 검수사 확정 2026-08-15.
  //   0) 기존 입사순 명단  1) 그 뒤에 새로 추가된 사람(추가 시각순)  2) 맨 아래 고정
  const grp = _hi >= 0 ? 0 : (_ti >= 0 ? 2 : 1);
  const sub = _hi >= 0 ? _hi : (_ti >= 0 ? _ti : getStaffAddedAt(nm));
  // 기존 명단·맨아래 고정에 이름이 있으면 **직급을 무시**한다(지원인원 등).
  const rankIdx = (_hi >= 0 || _ti >= 0) ? RANK_ORDER.length
    : (RANK_ORDER.indexOf(rank) < 0 ? RANK_ORDER.length : RANK_ORDER.indexOf(rank));
  return [dutyIdx, rankIdx, grp, sub, nm];
}

/** 배열 정렬용 비교자 — staffSortKey 를 그대로 쓴다. */
export function compareStaff(a, b) {
  const ka = staffSortKey(typeof a === 'string' ? a : a?.name);
  const kb = staffSortKey(typeof b === 'string' ? b : b?.name);
  for (let i = 0; i < 4; i++) { if (ka[i] !== kb[i]) return ka[i] - kb[i]; }
  return ka[4].localeCompare(kb[4], 'ko');
}

// ─── TallyOne 1.73: 소유자에게만 보이는 계정 (검수사 확정 2026-08-15) ────────────
//   *"클로드는 제 눈에만 보이게 할수 있나요? 접속인원에서도 안보이게"*
//   개발·시험용 계정이라 다른 검수원 화면에 뜨면 «누구지?» 가 된다.
//   ⚠ **로그인 화면에서는 보는 사람이 누군지 알 수 없으므로 무조건 숨긴다.**
//     숨겨도 「목록에 없으면 이름 직접 입력」으로 그대로 로그인된다(화이트리스트는 손대지 않음).
//   ⚠ 권한·집계에는 쓰지 않는다 — **보이기만** 가린다.
export const HIDDEN_STAFF = ['클로드'];
export function isHiddenStaff(name) {
  return HIDDEN_STAFF.includes(String(name || '').trim());
}
/** 그 사람을 이 화면에 보여도 되는가. viewer 가 소유자면 다 보인다. */
export function isVisibleStaff(name, viewerIsOwner = false) {
  return viewerIsOwner || !isHiddenStaff(name);
}

// 수석검수 여부 (작업 권한) — 수석검수 또는 부수석 포함
// ★ 1.79 (검수사 확정 2026-08-17): **테스터 편입** — "모든 기능을 사용하되 제(소유자) 고유 기능만 빼고".
//   수석 게이트 전부(대시보드 입장 canOpenChief·마감텔리 생성·완료 저장·복원·정리·수석 노드 조회)와
//   비번 잠금(isLockedName)이 이 한 함수를 보므로 여기 한 곳 편입으로 빠지는 게이트가 없다.
//   쓰기까지 전부 허용 + 잠금 포함은 검수사 확답. 소유자 고유(isOwnerName)·인원 관리(isAdminName)는
//   다른 축이라 자동 제외된다. 화면 호칭만 isTester 로 갈라 '테스터'라고 보여준다(Header·AuxPage).
export function isChief(name) {
  const role = getStaffRole(name);
  return /수석검수|부수석|테스터/.test(role);
}

// 1.79: 테스터 여부 — 권한은 isChief 와 동일, **표시(호칭)** 전용 판정.
export function isTester(name) {
  return /테스터/.test(getStaffRole(name));
}

// ─── TallyOne 1.41: **개발용 접근 명단** (검수사 지시 2026-08-10) ───────────────
//   검수사 원문: *"클로드가 코드수정을 수월하게 하기 위해서 입니다. 직급은 없이 개발용으로 하면 됩니다."*
//   ⛔ **isChief 를 건드려서 해결하지 않는다.** `isLockedName = isAdminName || isChief` 라서,
//     isChief 에 이 명단을 더하면 **비밀번호 잠금 대상까지 딸려 늘어난다.**
//     검수사 확답: *"개발자용으로 들어온 인원은 (비밀번호) 없어도 됨."*
//   → 직급 판정(isChief)은 그대로 두고, **화면 접근 판정만** canOpenChief 로 따로 세운다.
//   명단은 RTDB `dev_access` 노드. 관리자만 고칠 수 있다(인원 관리 ⚙ 화면).
let DEV_ACCESS = {};
/** App 이 fbSubscribeDevAccess 로 받은 명단을 여기에 넣는다. setServerRoles 와 같은 방식. */
export function setDevAccess(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    const name = String((v && typeof v === 'object' && v.name) || k).trim();
    if (name && v) out[name] = true;
  }
  DEV_ACCESS = out;
}
export function isDevViewer(name) {
  return !!DEV_ACCESS[String(name || '').trim()];
}

// ─── TallyOne 1.41: 수석 대시보드를 **열 수 있는가**의 단일 진입점 ──────────────
//   왜 만들었나 — 같은 판단을 **네 곳이 각자** 하고 있었고 서로 달랐다(2026-08-10 조사).
//     · App.jsx 라우트 게이트      isChief || isOwnerName   (소유자 포함)
//     · App.jsx 로그인 직후 착지    isChief || isOwnerName   (소유자 포함)
//     · ChiefDashboard 내부 가드    isChief 만               ← 소유자 빠짐
//     · HomePage 진입 버튼 노출     isChief 만               ← 소유자 빠짐
//   지금은 소유자(김성일)의 직책이 '대리(부수석)' 이라 우연히 넷 다 통과해 안 드러날 뿐이다.
//   한 곳만 고치면 나머지 셋에서 막힌다 → **네 곳 모두 이 함수를 쓴다.**
//   ⚠ 이것은 **화면을 여는 권한**이다. 화면 안의 마감 텔리 생성·아카이브 복원·정리·최종 저장은
//     종전대로 `isChief` 로 막는다 — 되돌릴 수 없는 행위는 개발용에게 열지 않는다.
export function canOpenChief(name, isOwner = false) {
  return isChief(name) || isOwner || isDevViewer(name);
}
