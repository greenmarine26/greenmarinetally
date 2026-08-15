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
export function setServerRoles(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    const name = String((v && typeof v === 'object' && v.name) || k).trim();
    const role = typeof v === 'string' ? v.trim() : String((v && v.role) || '').trim();
    if (name && role) out[name] = role;
  }
  SERVER_ROLES = out;
}

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
  return '검수';                                    // 차장·과장·대리 등 직책 없는 직급 → 검수
}

/** 정렬 키 — 1차 직책, 2차 직급. 직급은 화면에 안 보이고 순서에만 쓴다. */
export function staffSortKey(name) {
  const { rank } = splitRole(getStaffRole(name));
  const shown = displayRole(name);
  const dutyIdx = EXEC_RANKS.includes(rank) ? 0 : (DUTY_ORDER.indexOf(shown) < 0 ? DUTY_ORDER.length : DUTY_ORDER.indexOf(shown));
  const rankIdx = RANK_ORDER.indexOf(rank) < 0 ? RANK_ORDER.length : RANK_ORDER.indexOf(rank);
  return [dutyIdx, rankIdx, String(name || '')];
}

/** 배열 정렬용 비교자 — staffSortKey 를 그대로 쓴다. */
export function compareStaff(a, b) {
  const ka = staffSortKey(typeof a === 'string' ? a : a?.name);
  const kb = staffSortKey(typeof b === 'string' ? b : b?.name);
  for (let i = 0; i < 2; i++) { if (ka[i] !== kb[i]) return ka[i] - kb[i]; }
  return ka[2].localeCompare(kb[2], 'ko');
}

// 수석검수 여부 (작업 권한) — 수석검수 또는 부수석 포함
export function isChief(name) {
  const role = getStaffRole(name);
  return /수석검수|부수석/.test(role);
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
