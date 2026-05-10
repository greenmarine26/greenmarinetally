# M5.19 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.19) — 완료 처리 listener fix (CRITICAL) + zoom 30%

M5.18 배포 후 사용자가 **컨테이너 완료 처리 후 화면 갱신 안 되고 F5해야 보이는 버그** 보고. 진단 결과 9개 fbSubscribe 함수의 cleanup 잘못 → 일괄 fix. 추가로 zoom 초기값 30% 변경 요청 반영.

## ✅ 변경 사항 (M5.18 → M5.19)

### 🔥 CRITICAL — Firebase listener cleanup fix

**진단된 root cause**:
- `fbSubscribeVoyages`와 `fbSubscribeAllReports`가 같은 `ref(db, 'voyages')` 사용
- 각 함수의 cleanup이 `() => off(r)` — ref의 **모든 listener를 끔**
- 시나리오: 수석 대시보드 방문 → 떠남 → off(r) → App의 voyages listener 같이 죽음 → 완료 처리 후 UI 갱신 안 됨 → F5하면 새 listener 등록되어 보임

**Fix**: firebase v9 modular API의 `onValue`는 unsubscribe 함수를 반환하므로 그걸 그대로 return하도록 9개 함수 모두 일괄 수정:
```js
// 이전
const handler = onValue(r, callback);
return () => off(r);  // ❌ ref 전체 listener 끔

// 현재
const unsub = onValue(r, callback);
return unsub;  // ✓ 본인 listener만 unsubscribe
```

수정된 함수 (firebase.js):
- `fbSubscribeVoyages` (line 379)
- `fbSubscribeVoyage` (line 388)
- `fbSubscribeInspectors` (line 404)
- `fbSubscribeConnection` (line 418)
- `fbSubscribeShipLibrary` (line 449)
- `fbSubscribeFeedback` (line 495)
- `fbSubscribeWorkReports` (line 568)
- `fbSubscribeAllReports` (line 575)

### 🔍 베이 초기 zoom 30% (사용자 요청)

**변경 (BayPlan.jsx)**:
- 이전: 모바일 0.5, PC 1.0 (M3.78에서 0.3→0.5 격상했던 것)
- 현재: 모바일/PC 모두 0.3 (30%)
- 사용자가 필요 시 +/- 버튼, 핀치, 휠로 확대 가능 (최소 0.3, 최대 3.0)

### 시뮬레이션 결과

listener 격리 3 시나리오 검증:
- ✓ 옛 버그 재현 (A listener가 B unsubscribe로 같이 죽음)
- ✓ 새 fix 패턴 정상 격리
- ✓ 사용자 시나리오: 대시보드 떠난 후 완료 처리 시 UI 갱신 정상

### 검증 결과

- 버전 M5.19: 2회 ✓
- 옛 `)=>off(` 패턴: **0회** (8개 모두 fix됨) ✓
- zoom 0.3 적용 ✓
- M5.18 footer 재배치, M5.17 scroll-snap, M5.16 카고플랜 특수화물, M5.15 ATRP alias 모두 잔존 ✓

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.19' |
| src/firebase.js | **9개 fbSubscribe* 함수 cleanup 일괄 fix** (handler → unsub, off(r) → return unsub) |
| src/components/BayPlan.jsx | zoom 초기값 0.3 |
| src/components/HelpModal.jsx | M5.19 변경사항 |

## 사용자 시점 핵심 메시지

1. **🔥 완료 처리 즉시 반영** — F5 없이도 완료 탭으로 이동
2. **🔍 베이 30% 시작** — 한 화면에 더 많은 베이 보임, 필요 시 확대
3. **기존 모든 기능 그대로**

## ⚠️ 잠재 영향

- 이번 listener fix는 모든 Firebase 구독 흐름에 영향. 다른 곳에서 비슷한 버그가 있었다면 같이 해결됨
- 예: 다른 검수원의 작업이 실시간으로 안 보이던 경우, 사진 업데이트 안 보이던 경우 등
- 사용자 테스트 시 다른 실시간 갱신도 잘 동작하는지 확인 권장

## 🔜 다음 세션 후보

1. zoom 30%가 너무 작으면 폰트/심볼 조정
2. 다른 실시간 갱신 이슈 발견 시 추가 검토

## 영구 규칙 (메모리)

1. **빌드 전 시뮬레이션 절대 원칙** — 이번 listener fix는 시뮬레이션으로 정확히 검증
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: ATPR ↔ ATRP 같은 케이스 대응
5. **Firebase listener cleanup**: 같은 ref에 다중 listener 시 `off(r)`는 ref 전체 끔. v9 `onValue` 반환값(unsub 함수)을 그대로 return해야 안전
