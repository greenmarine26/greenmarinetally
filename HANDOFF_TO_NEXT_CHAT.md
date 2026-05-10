# M5.16 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.16) — 카고플랜에 특수화물 + X-RAY 표시 추가

M5.15 배포 후 사용자가 "카고플랜에 특수화물(리퍼/DG 등) + X-RAY 표시" 요청. PrintableCargoPlan에는 'o'/'L'/'X' 한 글자만 있고 특수화물/X-RAY 정보 빠져있던 문제 fix.

## ✅ 이번 빌드 변경 사항 (M5.15 → M5.16)

### PrintableCargoPlan 강화

**이전 (M5.15까지)**:
- `getMark()` 함수가 'o'(평택 양하), 'L'(평택 선적), 'X'(통과) 한 글자만 반환
- 특수화물(리퍼/DG/FR/OT/TK)이나 X-RAY 정보 인쇄에 전혀 표시 안 됨
- xrayMap 자체가 PrintableCargoPlan에 props로 전달조차 안 됐음

**M5.16 변경**:
- `getMark(c, mode, xrayMap)` 객체 반환: `{letter, type, isXray}`
- `letter`: 평택 양하 'o', 평택 선적 'L', 통과 'X', 엠티 'E'
  - 특수화물 우선: 리퍼 풀 'R' / 엠티 리퍼 'r' / DG 'D' / FR 'F' / TK 'T' / OT 'A' (Awkward, PDF 표준)
- `type`: 'reefer' / 'dg' / 'fr' / 'tk' / 'ot' / null — CSS 클래스로 셀 배경색 적용
- `isXray`: 평택 양하 X-RAY 대상 → 노란 배경 + 우상단 ★ 마커
- 우선순위: DG > 리퍼 > FR > TK > OT (BayPlan과 동일)
- BayPlan에서 PrintableCargoPlan 호출 시 `xrayMap` props 전달 추가

### CSS 추가 (셀 배경색 + X-RAY 마커)

```css
.bay-cell.type-reefer { background: #cffafe; }  /* 연시안 */
.bay-cell.type-dg     { background: #fee2e2; }  /* 연빨강 */
.bay-cell.type-fr     { background: #f3e8ff; }  /* 연보라 */
.bay-cell.type-tk     { background: #ffedd5; }  /* 연주황 */
.bay-cell.type-ot     { background: #fae8ff; }  /* 연마젠타 */
.bay-cell.xray { background: #fef08a; ... }     /* 연노랑 + ★ 마커 */
```

### 범례 강화

기존 PTK/LYG/OPT/TTL 카운트 + 구분선 + 추가:
- E (Empty)
- R (Reefer)
- D (DG)
- F (FR)
- A (OT)
- T (TK)
- ★ (X-RAY) — 양하 모드만 표시

### BayPlan은 변경 X

기존부터 잘 표시되어 있음 (검토 완료):
- X-RAY: cellColor 함수에서 `bg-purple-700` 보라 셀 + ring (line 317~323)
- 특수화물: 셀 좌측 컬러 바 + 우상단 큰 흰배경 컬러 심볼 (line 1030~1095)
  - DG ⚠ 빨강 / 리퍼 ❄ 시안 / FR ⊞ 보라 / TK ▣ 주황 / OT △ 마젠타
- X-RAY + 특수화물 동시: 3 layer (셀 배경 + 좌측 바 + 우상단 심볼) 모두 표시됨

### 시뮬레이션 결과

`getMark()` 26 케이스 모두 통과:
- 일반 (평택 양하/선적/통과/엠티) 4건
- 특수화물 8건 (리퍼 풀/엠티/통과, DG, FR, OT, TK, oog→OT)
- X-RAY 5건 (일반, 리퍼, DG, 선적 무시, 통과 무시)
- 우선순위 3건 (DG>리퍼, 리퍼>FR, FR>TK)
- POD 변형 2건 (KRPTK, ABCPTK)
- Edge case 4건 (xrayMap null/다른 컨, fe 없음, oog)

### 검증 결과

- 버전 M5.16: 5회 ✓
- mark-R/r/D/F/T/A/E 7개 letter 클래스 모두 정상 (각 1-2회)
- type-reefer/dg/fr/tk/ot 5개 클래스 모두 정상 (각 2회)
- ★ X-RAY 마커 9회 / X-RAY 텍스트 48회
- Reefer 범례 3회
- 기존 기능 (ATRP/ATPR alias, 재처리, 보관함, 마감 점검) 모두 잔존

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.16' |
| src/components/PrintableCargoPlan.jsx | getMark 강화 + xrayMap props + 셀 렌더링 + CSS + 범례 |
| src/components/BayPlan.jsx | PrintableCargoPlan 호출 시 xrayMap prop 전달 |
| src/components/HelpModal.jsx | M5.16 변경사항 |

## 사용자 시점 핵심 메시지

1. **카고플랜에 특수화물 표시** — R(리퍼), D(DG), F(FR), A(OT), T(TK), E(엠티)
2. **카고플랜에 X-RAY 표시** — 노란 배경 + ★ 우상단 마커
3. **범례에 모두 명시** — 좌하단 범례에 7종 모두 표시
4. **BayPlan은 기존 그대로** — 이미 잘 표시되고 있음
5. **시뮬레이션 26/29 통과** — 빌드 전 충분히 검증

## 🔜 다음 세션 후보

### M5.17 hotfix 후보 (사용자 검토 후)
- 글자 선택이 헷갈리면 변경 (예: 'A' 대신 'O', 'r' 대신 'r' 표시 강화 등)
- 셀 배경색 인쇄 시 잉크 절약 옵션
- PDF STOWAGE INSTRUCTION 표준에 더 가까운 표기 ('S'/'N'/'H' POD 첫글자 등)

### 큰 빌드 (M5.2)
- 베이 상세 인쇄(PrintableBayDetail)에도 특수화물/X-RAY 강화 (현재 어떻게 되어있는지 확인 필요)
- 카고플랜 별도 SPECIAL CARGO 페이지 추가 (PDF처럼)

## 영구 규칙 (메모리)

1. **빌드 전 시뮬레이션 절대 원칙** — 실제 데이터로 흐름 끝까지 돌린 후에만 ZIP 배포 (이번에 사용자 지적으로 확인됨)
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: 같은 선박이 EDI 시스템마다 다른 코드 사용 가능 (ATPR ↔ ATRP)
