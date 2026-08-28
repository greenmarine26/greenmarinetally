// 관리자 이름 보호 — V9.05 (김성일 선택은 신뢰 기기 3대만 무비번, 그 외 기기는 비밀번호)
//
// 저장 구조 (Firebase admin_guard 노드):
//   { pwHash, salt, devices: { [devId]: { label, addedAt } } }   — 비밀번호는 SHA-256 해시만 저장
// 기기 식별: localStorage 'gm_admin_device_id_v1' (기기·브라우저별 1회 생성 UUID)
// 세션 허용: 비신뢰 기기에서 비밀번호 통과 시 sessionStorage 'gm_admin_session_ok' (탭 닫으면 소멸)

import { isChief } from './staffList.js';

export const OWNER_NAME = '김성일';          // V9.10: 소유자(개발·운영자) — 권한 회수 불가, 퇴사해도 유지
export const ADMIN_NAME = OWNER_NAME;        // 하위호환 별칭 (기존 호출부 유지)
//  2.53: 3 → 4 (검수사 확정 2026-08-26 «1대추가면 됩니다»).
//    집 PC · 사무실 PC · 폰 셋을 쓰면 3대가 꽉 차서 새 기기를 등록할 자리가 없다.
//    실측 그날 — 소유자 신뢰 기기 3대(PC 1호·PC 3호·안드로이드 2호)로 이미 한도였다.
//    ⚠ 늘릴수록 그중 하나가 새면 위험도 늘어난다. 검수사가 «1대»라고 못박은 대로 4로만 둔다.
export const MAX_TRUSTED_DEVICES = 4;
const DEVICE_KEY = 'gm_admin_device_id_v1';
const SESSION_KEY = 'gm_admin_session_ok';

/** 이 기기의 고유 ID (없으면 생성) */
export function getAdminDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'dev-unknown';
  }
}

/** SHA-256 해시 (hex) — Web Crypto */
export async function hashPassword(pw, salt) {
  const data = new TextEncoder().encode(`${salt}::${pw}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function makeSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 기기 라벨 자동 생성 (예: "Windows·Chrome", "Android·모바일") */
export function deviceLabel() {
  try {
    const ua = navigator.userAgent;
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : '기기';
    const mob = /Mobi/i.test(ua) ? '모바일' : 'PC';
    return `${os}·${mob}`;
  } catch {
    return '기기';
  }
}


// ── V9.09(2026-07-26): 다중 관리자 · 관리자별 개별 비밀번호 (인수인계용) ──────────
//   왜: 관리자 이름이 소스에 하드코딩(ADMIN_NAME)돼 있어, 담당자가 바뀌면 코드를 고쳐
//   재배포해야만 인수인계가 됐다. 앱 안에서 넘길 방법이 없었다(사용자 요청 2026-07-26).
//
// 저장 구조 (admin_guard):
//   {
//     pwHash, salt, devices: {...}          ← 구버전(단일 관리자) 필드. 마이그레이션용으로 남겨둠
//     admins: {
//       "김성일": { pwHash, salt, devices:{[devId]:{label,addedAt}}, grantedBy, grantedAt },
//       "홍길동": { ... }                    ← 비번 미설정이면 첫 선택 때 본인이 정한다
//     }
//   }
// 원칙 — 비밀번호는 관리자마다 따로. 권한을 넘겨도 기존 비밀번호를 알려줄 필요가 없다.

/** 관리자 이름 목록. admins 노드가 없으면 구버전으로 보고 [ADMIN_NAME] 반환(하위호환). */
export function getAdminNames(guard) {
  const m = guard && guard.admins;
  let names = [];
  if (m && typeof m === 'object') {
    names = Object.keys(m).filter(n => m[n] && m[n].revoked !== true);
  }
  // V9.10: 소유자는 DB 상태와 무관하게 항상 관리자 — 목록에서 빠져 있어도 되살린다.
  return [OWNER_NAME, ...names.filter(n => n !== OWNER_NAME)];
}

/** V9.10: 소유자(개발·운영자) 여부 — 이름 고정. 회수·차단 불가 판정의 단일 기준. */
export function isOwnerName(name) {
  return String(name || '').trim() === OWNER_NAME;
}

/** V9.10: 그 관리자의 권한을 회수할 수 있는가 (소유자 불가 · 마지막 1명 불가) */
export function canRevokeAdmin(guard, name) {
  if (isOwnerName(name)) return false;
  return getAdminNames(guard).length > 1;
}

/** 그 이름이 관리자인가 */
export function isAdminName(guard, name) {
  return getAdminNames(guard).includes(String(name || '').trim());
}

/** 관리자 1명의 인증 정보. admins에 없으면 구버전 최상위 필드로 대체(김성일 한정). */
export function adminEntry(guard, name) {
  const m = guard && guard.admins;
  if (m && m[name]) return m[name];
  if (isOwnerName(name) && guard && guard.pwHash) {
    return { pwHash: guard.pwHash, salt: guard.salt, devices: guard.devices || {} };
  }
  return null;
}

// ── V9.45(2026-08-02): 이름 잠금을 수석검수·부수석까지 확대 ──────────────────
//   왜: 지금까지 비밀번호를 요구한 건 관리자 이름뿐이라, 수석검수사 이름은 누구나
//   골라 로그인할 수 있었다. 수석 대시보드를 막아도(V9.44) 수석 이름으로 들어오면
//   그대로 열린다 — 문 옆에 창문이 열려 있는 꼴이었다(사용자 지적 2026-08-02).
//
// 저장 위치가 갈리는 이유(중요):
//   admins/{이름}  = 관리자.  이 노드에 키가 생기면 getAdminNames가 관리자로 읽는다.
//   locks/{이름}   = 관리자가 아닌 잠금 대상(수석검수·부수석).
//   → 수석 비번을 admins에 저장하면 관리자 권한이 딸려 붙는다. 그래서 노드를 나눈다.

/** V9.45: 이 이름이 잠금 대상인가 (관리자 + 수석검수·부수석) */
export function isLockedName(guard, name) {
  const n = String(name || '').trim();
  return isAdminName(guard, n) || isChief(n);
}

/** V9.45: 잠금 대상 1명의 인증 정보 (관리자는 admins, 그 외는 locks) */
export function lockEntry(guard, name) {
  const a = adminEntry(guard, name);
  if (a) return a;
  const n = String(name || '').trim();
  const l = guard && guard.locks;
  return (l && l[n]) || null;
}

/** V9.45: 저장 경로 — 관리자면 admins/{이름}, 아니면 locks/{이름} */
export function lockPath(guard, name) {
  const n = String(name || '').trim();
  return isAdminName(guard, n) ? `admins/${n}` : `locks/${n}`;
}

/** 그 사람 기준으로 이 기기가 신뢰 기기인가 (V9.45: 관리자 → 잠금 대상 전체로 확대) */
export function isTrustedDeviceFor(guard, name) {
  const e = lockEntry(guard, name);
  return !!(e && e.devices && e.devices[getAdminDeviceId()]);
}

/** 그 사람 비밀번호 검증 (V9.45: 잠금 대상 전체) */
export async function verifyPasswordFor(guard, name, pw) {
  const e = lockEntry(guard, name);
  if (!e || !e.pwHash || !e.salt) return false;
  const h = await hashPassword(pw, e.salt);
  return h === e.pwHash;
}

/** 그 사람이 비밀번호를 아직 안 정했는가 (V9.45: 잠금 대상 전체) */
export function needsPasswordSetup(guard, name) {
  if (!isLockedName(guard, name)) return false;
  const e = lockEntry(guard, name);
  return !e || !e.pwHash;
}

/** V9.45: 소유자가 대신 열 수 있는가 — 소유자 비번이 실제로 설정돼 있을 때만 */
export function ownerCanUnlock(guard, name) {
  if (isOwnerName(name)) return false;
  const e = adminEntry(guard, OWNER_NAME);
  return !!(e && e.pwHash && e.salt);
}

// ── ★ 2.53 복구 코드 ────────────────────────────────────────────────────────
//  왜 있는가 (검수사 2026-08-26 — *«수석 임원 그리고 저 비밀번호 분실시 접속할 방법이 없어요»*).
//    바로 위 `ownerCanUnlock` 이 첫 줄에서 **소유자를 제외**한다. 그래서 구조가 이렇게 갈려 있었다 —
//      수석·임원이 잠기면 → 소유자가 열어 준다 (owner 모드, 구현돼 있음)
//      **소유자가 잠기면 → 아무도 못 연다**
//    지금까지는 신뢰 기기가 버텨 왔을 뿐이다. PC 를 바꾸거나 브라우저 자료를 지우면 그 열쇠가 사라지고,
//    비밀번호를 잊었으면 인원 관리·백업·수석 대시보드·마감 텔리가 통째로 막힌다.
//    ⚠ 그리고 신뢰 기기가 살아 있으면 비밀번호를 칠 일이 없어 **잊게 된다** — 검수사가 실제로 그렇게 됐다
//      (*«내꺼에서만 하다가 다른데에서 할려니 생각이 안나요»*). 잠기는 것은 예외가 아니라 시간문제다.
//
//  ⛔ 여기서 하지 않는 것 — 뒷문을 만들지 않는다.
//    마스터키·개발자 우회·«특정 조건이면 비번 없이 통과» 같은 것은 넣지 않는다.
//    복구 코드는 **검수사가 미리 만들어 자기가 보관한 것**이고, 그것을 아는 사람만 쓸 수 있다.
//
//  ★ 코드는 **브라우저에서** 만든다. 서버도, 클로드도 평문을 보지 못한다.
//    RTDB 에는 해시와 솔트만 남는다(`admin_guard/recovery/{이름}`).
//  ★ 한 번 쓰면 소멸(`usedAt`) — 쓰고 나면 새로 만들어 다시 보관한다.
//  ⚠ 헷갈리는 글자(0·O·1·I·L)는 뺀다 — 종이에 적었다가 다시 칠 때 그것부터 틀린다.
//    첫 시뮬이 이 규칙을 어긴 것을 잡았다(L 이 알파벳에 남아 있었다).

const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 0·O·1·I·L 없음

/** 복구 코드 한 벌 생성 — XXXX-XXXX-XXXX-XXXX. **브라우저에서만 만든다.**
 *  ⚠ 거부 샘플링을 쓴다. 256 을 31 로 그냥 나누면 앞쪽 글자가 더 자주 나온다(편향).
 *    31×8=248 이상은 버리고 다시 뽑아 모든 글자가 똑같은 확률이 되게 한다.
 *  ⚠ `Uint8Array` 를 쓴다 — 같은 파일 `makeSalt` 와 한 벌이고, 8비트면 31글자에 충분하다. */
export function makeRecoveryCode() {
  const A = RECOVERY_ALPHABET, L = A.length;
  const cut = Math.floor(256 / L) * L;      // 이 위는 버린다
  const out = [];
  const buf = new Uint8Array(64);
  while (out.length < 16) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < 16; i++) {
      if (buf[i] >= cut) continue;
      out.push(A[buf[i] % L]);
    }
  }
  return [0, 4, 8, 12].map((i) => out.slice(i, i + 4).join('')).join('-');
}

/** 입력받은 코드를 대조용으로 다듬는다 — 소문자·하이픈·앞뒤 공백을 너그럽게 받는다.
 *  ⚠ 가운데 공백은 다듬지 않는다. 다른 글자를 친 것과 구별이 안 되기 때문이다. */
export function normalizeRecoveryCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/-/g, '');
}

/** 저장할 모양 — 평문은 담지 않는다. */
export async function buildRecoveryRecord(code) {
  const salt = makeSalt();
  return { salt, hash: await hashPassword(normalizeRecoveryCode(code), salt), madeAt: Date.now(), usedAt: 0 };
}

/** 이 사람에게 쓸 수 있는 복구 코드가 있는가 */
export function hasRecoveryCode(guard, name) {
  const r = guard && guard.recovery && guard.recovery[String(name || '').trim()];
  return !!(r && r.hash && r.salt && !r.usedAt);
}

/** 복구 코드 검증 — 결과를 «왜 안 되는지»까지 말한다(조용히 실패하지 않는다). */
//  ★ 2.77 (검수사 신고 2026-08-27 «비밀번호 복구로 받은 비번이 적용이 안됩니다 몇번 시도하다
//    포기했습니다»): 종전엔 «코드가 맞지 않습니다» 한 줄이라 **어느 코드를 봐야 하는지** 알 수 없었다.
//    파일을 여러 번 만들었으면 옛 파일을 보고 있을 수 있다 — 지금 등록된 코드가 **언제 만든 것인지**
//    말해 주면 검수사가 그 시각의 파일을 찾아 볼 수 있다. `madeAt` 은 처음부터 저장돼 있었는데
//    **아무 데서도 읽지 않던 죽은 값**이었다(전수 grep — 쓰기 1곳, 읽기 0곳).
//    ⛔ 코드 자체는 절대 내보이지 않는다 — 해시만 저장돼 있고 평문은 앱에도 없다.
const _madeAtText = (ms) => {
  const t = Number(ms) || 0;
  if (!t) return '';
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export function recoveryMadeAtText(guard, name) {
  const r = guard && guard.recovery && guard.recovery[String(name || '').trim()];
  return r ? _madeAtText(r.madeAt) : '';
}
export async function verifyRecoveryCode(guard, name, entered) {
  const r = guard && guard.recovery && guard.recovery[String(name || '').trim()];
  if (!r || !r.hash || !r.salt) return { ok: false, why: '복구 코드를 만든 적이 없습니다.' };
  const made = _madeAtText(r.madeAt);
  const madeTail = made ? ` 지금 등록된 코드는 ${made} 에 만든 것입니다 — 그때 받은 파일을 보십시오.` : '';
  if (r.usedAt) {
    return { ok: false, why: `이미 사용한 코드입니다. 새 코드를 만들어야 합니다.${made ? ` (${made} 에 만든 코드)` : ''}` };
  }
  const h = await hashPassword(normalizeRecoveryCode(entered), r.salt);
  return h === r.hash ? { ok: true, why: '' }
    : { ok: false, why: `코드가 맞지 않습니다.${madeTail}` };
}

/** 파일로 내려줄 내용 — 검수사가 인쇄하거나 안전한 곳에 보관한다. */
export function recoveryFileText(name, code) {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return [
    `TallyOne 복구 코드 — ${name}`,
    `만든 날 : ${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`,
    '',
    `    ${code}`,
    '',
    '⚠ 이 코드는 다시 보여주지 않습니다. 인쇄하거나 안전한 곳에 보관하십시오.',
    '⚠ 한 번 쓰면 소멸합니다. 쓰고 나면 새로 만드십시오.',
    '⚠ 이 코드를 아는 사람은 관리자 계정을 열 수 있습니다.',
    '',
    '쓰는 법 — 로그인 화면에서 이름을 고르면 나오는 비밀번호 칸 아래',
    '「복구 코드로 열기」를 누르고 위 코드를 입력하면 비밀번호를 새로 정할 수 있습니다.',
  ].join('\n');
}

/** 파일 이름 */
export function recoveryFileName(name) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `TallyOne_복구코드_${name}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.txt`;
}

/** 세션 통과 키를 관리자별로 — 다른 관리자 세션이 서로 열어주지 않게 */
export function hasSessionPassFor(name) {
  try { return sessionStorage.getItem(`${SESSION_KEY}:${name}`) === '1'; } catch { return false; }
}

export function setSessionPassFor(name) {
  try { sessionStorage.setItem(`${SESSION_KEY}:${name}`, '1'); } catch { /* skip */ }
}
