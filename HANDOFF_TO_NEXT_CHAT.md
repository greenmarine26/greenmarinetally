# M5.22 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.22) — NSDC (STARSHIP DRACO) 추가

사용자가 STARSHIP DRACO (NSDC) 작업 중인데 베이사전 미등록 → ⚓ PORT-MIS 카드 매칭 안 됨. NSDC.def 받아서 등록.

## ✅ 변경 사항 (M5.21 → M5.22)

### NSDC entry 추가

| 항목 | 값 |
|---|---|
| 코드 | NSDC |
| 선박명 | STARSHIP DRACO |
| **콜사인** | **V7A5451** (PORT-MIS 매칭 키) |
| IMO | 9939292 |
| CASP | 6.50 |
| 베이 | 26개 자동 추출 (needs-review) |

**핵심 효과**:
- 베이사전 매칭 성공 → 베이 화면 정상 표시
- callsign='V7A5451' → PORT-MIS 데이터와 자동 매칭 → ⚓ 입출항 카드 표시
- totalShips 115 → 116

### needs-review 배지

자동 추출 베이 26개:
`01, 02, 03, 05, 06, 10, 11, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 33, 34, 35, 38, 39`

누락 의심: 07, 09, 13, 37 (일반 컨선 패턴 기준)
→ STARSHIP DRACO STOWAGE INSTRUCTION PDF 받으면 정확히 정정 가능 (DJCT/TMPZ 케이스처럼)

## 검증 결과

- 버전 M5.22: 3회 ✓
- NSDC 7회 / STARSHIP DRACO 3회 / V7A5451 3회 / 9939292 2회 ✓
- 기존 기능 모두 잔존 (PORT-MIS listener, priority, ATRP/ATPR alias, scroll-snap, mark-R 등)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.22' |
| src/data/shipBayDict_v2.js | NSDC entry 추가 + totalShips 116 |
| src/components/HelpModal.jsx | M5.22 변경사항 |

## 사용자 시점 핵심 메시지

1. **STARSHIP DRACO 작업 즉시 정상화** — 베이 화면 + ⚓ PORT-MIS 카드 둘 다 표시
2. **베이는 needs-review 상태** — PDF 받으면 정확히 정정 (M5.23 hotfix)
3. **다른 작업 항차도 PORT-MIS에 평택항 검색되면 자동 표시**

## 🔜 다음 세션 후보

1. **NSDC STOWAGE INSTRUCTION PDF 받기** → 베이 26 → 정확한 30개 정도로 정정 (M5.23)
2. 다른 미등록 선박 발견되면 같은 방식으로 추가
3. PORT-MIS 매칭 안 되는 케이스 추가 진단 (콜사인 형식 차이 등)

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: ATPR ↔ ATRP
5. Firebase listener cleanup: onValue 반환값 그대로 return
6. 음성 priority 시스템: 완료 음성은 high priority
7. Chrome 확장 활용: 정부/공공 사이트 데이터 API 없이 활용
8. **EDI 코드 vs PORT-MIS 콜사인**: 같은 선박 다른 식별자 가능 (NSDC ↔ V7A5451). 베이사전 entry에 callsign 필드를 PORT-MIS 콜사인으로 등록해야 매칭됨
