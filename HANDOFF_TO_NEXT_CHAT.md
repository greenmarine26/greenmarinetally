# M5.24 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.24) — 선박명 정확 매칭 최우선 + ATPR 콜사인 정정

ATRP/ATLANTIC PIONEER 매칭 실패 진단:
- ATPR.def 헤더 콜사인: D5RR5 (2023년 4월 .def 작성 시점)
- PORT-MIS 현재 콜사인: **9V7919** (변경됨)
- 사용자 통찰: "콜사인보다 선박명이 정확하다" — 정확! 콜사인은 변경 가능, 선박명은 안정

## ✅ 변경 사항 (M5.23 → M5.24)

### 1. 매칭 순서 재구성 (선박명 최우선)

```
기존 (M5.23):  콜사인 정확 → 콜사인 prefix → IMO → 선박명 fuzzy
개선 (M5.24):  선박명 정확 → 콜사인 정확 → 콜사인 prefix → IMO → 선박명 fuzzy
```

선박명 정확 매칭은:
- 대소문자 무시 (`.toUpperCase()`)
- 공백 trim
- 정확 일치만 (부분 매칭은 마지막 fallback)

→ ATRP가 콜사인 변경(D5RR5→9V7919) 케이스에서도 **선박명 ATLANTIC PIONEER로 자동 매칭**

### 2. ATPR/ATRP entry callsign 정정 (안전망)

- callsign: `D5RR5` → `9V7919` (PORT-MIS 진실)
- **oldCallsign: `D5RR5`** 보존 (옛 데이터 추적용)

선박명 매칭이 우선이지만, 이중 안전망으로 콜사인도 PORT-MIS와 일치하게 정정.

### 시뮬레이션 7/7 통과

- ✓ ATRP 선박명 정확 매칭 (콜사인 변경 케이스) → 9V7919 [name-exact]
- ✓ NSDC 선박명 정확 매칭 [name-exact]
- ✓ 대소문자 무시 매칭
- ✓ 공백 trim 매칭
- ✓ 선박명 fuzzy fallback (잘린 데이터)
- ✓ 콜사인만 일치 (선박명 다름) → 콜사인 단계로
- ✓ 매칭 안 됨

## 검증 결과

- 버전 M5.24: 2회 ✓
- 9V7919: 6회 (ATPR/ATRP 모두 정정됨) ✓
- oldCallsign: 4회 (보존 필드) ✓
- name-fuzzy: 3회 (fallback 작동) ✓
- 기존 기능 모두 잔존 (BULK_AUTO 192회, needs-review 198회, ACACIA LIBRA, STARSHIP DRACO)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.24' |
| src/data/shipBayDict_v2.js | ATPR/ATRP callsign D5RR5 → 9V7919, oldCallsign 보존 |
| src/pages/VoyagePage.jsx | PORT-MIS 매칭 — 선박명 정확을 1단계로 |
| src/components/HelpModal.jsx | M5.24 변경사항 |

## 사용자 시점 핵심 메시지

1. **ATRP/ATLANTIC PIONEER 자동 매칭** — 선박명 정확 매칭으로 즉시
2. **다른 콜사인 변경 케이스도 자동 해결** — 굳이 사전 정정 안 해도 선박명 매칭됨
3. **이중 안전망** — ATPR/ATRP는 콜사인도 정정 (선박명 + 콜사인 모두 매칭)

## 영구 규칙 추가 후보

- **PORT-MIS 매칭 우선순위**: 1) 선박명 정확 → 2) 콜사인 정확 → 3) 콜사인 prefix → 4) IMO → 5) 선박명 fuzzy
- **.def 콜사인 신뢰도**: .def 파일은 작성 시점 데이터. 콜사인은 변경 가능. 매칭 실패 시 PORT-MIS 콜사인을 신뢰

## 🔜 다음 세션 후보

1. **다른 콜사인 변경된 선박들 발견되면** → 선박명 매칭이 자동 해결할 것
2. **needs-review 192개** → 작업 중 베이 누락 발견 시 PDF로 정정
3. **EDI 선박명과 PORT-MIS vesselName 형식 차이** 발생 시 정규화 로직 추가 (현재는 대소문자/공백만)

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤
4. 선박 코드 alias: ATPR ↔ ATRP, NSDC ↔ V7A5451 (PORT-MIS 콜사인)
5. Firebase listener cleanup: onValue 반환값 그대로 return
6. 음성 priority: 완료 음성 high priority
7. Chrome 확장: 정부/공공 사이트 데이터 API 없이 활용
8. EDI 코드 vs PORT-MIS 콜사인: 다를 수 있음
9. **PORT-MIS 매칭 우선순위 (M5.24)**: 선박명 정확 → 콜사인 정확 → prefix → IMO → 선박명 fuzzy
10. 베이 자동 추출 한계: 일부 PDF 검증 필요
11. **베이사전 v2 300척 등록 완료** — "사전에 없다"고 답하지 말 것
12. **베이 표시 절대 원칙**: 베이사전이 기준, EDI는 보조
