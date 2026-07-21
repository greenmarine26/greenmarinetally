// 관리자 이름 보호 — V9.05 (김성일 선택은 신뢰 기기 3대만 무비번, 그 외 기기는 비밀번호)
//
// 저장 구조 (Firebase admin_guard 노드):
//   { pwHash, salt, devices: { [devId]: { label, addedAt } } }   — 비밀번호는 SHA-256 해시만 저장
// 기기 식별: localStorage 'gm_admin_device_id_v1' (기기·브라우저별 1회 생성 UUID)
// 세션 허용: 비신뢰 기기에서 비밀번호 통과 시 sessionStorage 'gm_admin_session_ok' (탭 닫으면 소멸)

export const ADMIN_NAME = '김성일';
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
