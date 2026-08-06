// 폰 푸시 알림 (FCM) — TallyOne 1.20
//
// 왜 — 오답 리포트는 소유자 화면 안에 있어서 그 화면을 열어야만 보인다(1.19에서 눈에 띄게는 했다).
//   화면을 안 열어도 알게 하려면 폰이 울려야 한다. 검수사 확정 2026-08-06.
//
// 왜 FCM 인가 — **새로 늘어나는 것이 없다.**
//   이미 쓰는 Firebase 프로젝트 안에 있다(messagingSenderId 981192728666).
//   컨테이너 자료를 이미 그 Firebase 에 올리고 있으므로 새 반출처가 아니고, 나가는 것은 알림 문구뿐이다.
//   외부 API 를 못 쓰는 회사 정책과 충돌하지 않는다. 배포처가 늘어도 조건이 안 늘어난다(범용화).
//
// 구조
//   앱   : 권한 요청 → 토큰 발급 → RTDB `push_tokens/{사람}/{토큰끝자리}` 에 저장
//   수집기: 미회신 오답 감지 → 그 토큰들로 **data-only** 메시지 발송
//   sw.js: push 이벤트를 받아 알림을 그린다
//
// ⚠ 수집기는 **data-only** 로 보내야 한다. `notification` 블록을 넣으면 브라우저가 자동으로도 띄워
//   알림이 두 번 뜬다(자동 1 + 우리 push 핸들러 1).
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { app, fbSavePushToken, fbDeletePushToken } from './firebase.js';

// Firebase 콘솔 → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 (공개 키라 번들에 박혀도 안전)
export const VAPID_KEY = 'BIzvoa06xL90HYzpTaQ7huRVpxXra-Soxh6ja4xh5qL8BTUFHLycE9G42sXO90v6mM_2xpM8MEid6CmgPG_nKVA';

const LS_KEY = 'gm_push_token_v1';

/** 이 브라우저가 푸시를 지원하는가 (사파리 구버전·시크릿 모드 등 방어) */
export async function pushSupported() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
    return await isSupported();
  } catch { return false; }
}

/** 현재 상태 — 'on' | 'off' | 'denied' | 'unsupported' */
export async function pushState() {
  if (!(await pushSupported())) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try { return localStorage.getItem(LS_KEY) ? 'on' : 'off'; } catch { return 'off'; }
}

/**
 * 알림 켜기 — 권한을 묻고 토큰을 받아 서버에 등록한다.
 * @returns {Promise<{ok:boolean, reason?:string, token?:string}>}
 */
export async function enablePush(inspector) {
  if (!(await pushSupported())) return { ok: false, reason: '이 브라우저는 푸시를 지원하지 않습니다.' };
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, reason: perm === 'denied'
      ? '알림이 차단돼 있습니다. 브라우저 사이트 설정에서 알림을 허용한 뒤 다시 시도하세요.'
      : '알림 권한을 받지 못했습니다.' };
  }
  try {
    // 우리 서비스워커를 그대로 쓴다 — firebase-messaging-sw.js 를 따로 두지 않는다.
    //   (파일이 둘이면 캐시 전략이 갈리고 배포 때 하나를 빠뜨린다.)
    const reg = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: '토큰을 받지 못했습니다. 잠시 후 다시 시도하세요.' };
    await fbSavePushToken(inspector, token);
    try { localStorage.setItem(LS_KEY, token); } catch { /* 저장 실패해도 등록은 됐다 */ }
    return { ok: true, token };
  } catch (e) {
    console.error('[push] 등록 실패', e);
    return { ok: false, reason: `등록 실패 — ${e?.message || e}` };
  }
}

/** 알림 끄기 — 서버에서 토큰을 지우고 이 기기 토큰도 폐기 */
export async function disablePush(inspector) {
  let token = '';
  try { token = localStorage.getItem(LS_KEY) || ''; } catch { /* skip */ }
  try { if (token) await fbDeletePushToken(inspector, token); } catch (e) { console.warn('[push] 서버 토큰 삭제 실패', e); }
  try { await deleteToken(getMessaging(app)); } catch (e) { console.warn('[push] 토큰 폐기 실패', e); }
  try { localStorage.removeItem(LS_KEY); } catch { /* skip */ }
  return { ok: true };
}

/** 앱이 열려 있을 때 온 메시지 — 조용히 삼키지 않고 콘솔에 남긴다(화면 표시는 호출부가 정한다) */
export function onPushForeground(cb) {
  pushSupported().then((ok) => {
    if (!ok) return;
    try { onMessage(getMessaging(app), (payload) => { console.info('[push] 수신(앱 열림)', payload); cb && cb(payload); }); }
    catch (e) { console.warn('[push] 포그라운드 수신 설정 실패', e); }
  });
  return () => {};
}
