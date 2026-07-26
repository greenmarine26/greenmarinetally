// 관리자 이름 보호 — V9.05 (김성일 선택은 신뢰 기기 3대만 무비번, 그 외 기기는 비밀번호)
//
// 저장 구조 (Firebase admin_guard 노드):
//   { pwHash, salt, devices: { [devId]: { label, addedAt } } }   — 비밀번호는 SHA-256 해시만 저장
// 기기 식별: localStorage 'gm_admin_device_id_v1' (기기·브라우저별 1회 생성 UUID)
// 세션 허용: 비신뢰 기기에서 비밀번호 통과 시 sessionStorage 'gm_admin_session_ok' (탭 닫으면 소멸)

export const ADMIN_NAME = '김성일';          // 초기 관리자(하위호환 기본값) — 인수인계 후에도 목록의 한 명일 뿐
export const MAX_TRUSTED_DEVICES = 3;
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

/** 이 기기가 신뢰 기기인가 */
export function isTrustedDevice(guard) {
  if (!guard || !guard.devices) return false;
  return !!guard.devices[getAdminDeviceId()];
}

/** 이 세션(탭)에서 이미 비밀번호를 통과했는가 */
export function hasSessionPass() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

export function setSessionPass() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* skip */ }
}

/** 비밀번호 검증 */
export async function verifyPassword(guard, pw) {
  if (!guard || !guard.pwHash || !guard.salt) return false;
  const h = await hashPassword(pw, guard.salt);
  return h === guard.pwHash;
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
  if (m && typeof m === 'object') {
    const names = Object.keys(m).filter(n => m[n] && m[n].revoked !== true);
    if (names.length) return names;
  }
  return [ADMIN_NAME];
}

/** 그 이름이 관리자인가 */
export function isAdminName(guard, name) {
  return getAdminNames(guard).includes(String(name || '').trim());
}

/** 관리자 1명의 인증 정보. admins에 없으면 구버전 최상위 필드로 대체(김성일 한정). */
export function adminEntry(guard, name) {
  const m = guard && guard.admins;
  if (m && m[name]) return m[name];
  if (name === ADMIN_NAME && guard && guard.pwHash) {
    return { pwHash: guard.pwHash, salt: guard.salt, devices: guard.devices || {} };
  }
  return null;
}

/** 그 관리자 기준으로 이 기기가 신뢰 기기인가 */
export function isTrustedDeviceFor(guard, name) {
  const e = adminEntry(guard, name);
  return !!(e && e.devices && e.devices[getAdminDeviceId()]);
}

/** 그 관리자 비밀번호 검증 */
export async function verifyPasswordFor(guard, name, pw) {
  const e = adminEntry(guard, name);
  if (!e || !e.pwHash || !e.salt) return false;
  const h = await hashPassword(pw, e.salt);
  return h === e.pwHash;
}

/** 그 관리자가 비밀번호를 아직 안 정했는가 (권한만 부여된 상태) */
export function needsPasswordSetup(guard, name) {
  if (!isAdminName(guard, name)) return false;
  const e = adminEntry(guard, name);
  return !e || !e.pwHash;
}

/** 세션 통과 키를 관리자별로 — 다른 관리자 세션이 서로 열어주지 않게 */
export function hasSessionPassFor(name) {
  try { return sessionStorage.getItem(`${SESSION_KEY}:${name}`) === '1'; } catch { return false; }
}

export function setSessionPassFor(name) {
  try { sessionStorage.setItem(`${SESSION_KEY}:${name}`, '1'); } catch { /* skip */ }
}
