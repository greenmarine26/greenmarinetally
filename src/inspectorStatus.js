// 검수원 로그인/작업중 상태 판정 유틸 (V7.94-14) — InspectorModal·StaffManagerModal·HomePage 공용
// 상태 3종: 'working'(로그인+최근 활동) / 'online'(로그인했지만 활동 끊김) / null(로그아웃 또는 이력 없음)
// 하위호환: loggedIn 필드가 없는 과거 데이터는 활동 시각만으로 판정 (기존 동작 유지)

export const WORKING_WINDOW_MS = 90000; // 최근 90초 내 활동 = 작업중

export function inspectorStatus(i, now = Date.now()) {
  if (!i) return null;
  if (i.loggedIn === false) return null;                       // 명시 로그아웃 — 배지 없음
  const recentlyActive = i.lastActive && (now - i.lastActive) < WORKING_WINDOW_MS;
  if (recentlyActive) return 'working';
  if (i.loggedIn === true) return 'online';                    // 로그인 상태지만 활동 끊김
  return null;                                                 // 과거 데이터(필드 없음) + 활동 오래됨
}
