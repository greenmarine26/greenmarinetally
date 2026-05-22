# Tallyman Master 핸드오프 — M6.82

## 📌 현재 상태 (2026-05-22)

- **최신 버전**: **M6.82** (Universal Cargo Plan baseline 통합 + Special Cargo 페이지 추가)
- **이전 버전**: M6.80 (Deck/Hold separator)
- **건너뛴 버전**: M6.81 (Python 검증용 스크립트 — React 통합 안 됨, 본 버전에서 흡수)
- **작업 디렉토리**: `m6_82_build/`

---

## 🎯 M6.82 핵심 — 4개 파일 분석 후 통합

### 입력 자료 (이번 세션)
1. **M6.80 코드베이스** (`M6_80_DECK_HOLD_SEPARATE.zip`) — 현재 앱
2. **M6.81 검증 스크립트** (`M681_Universal_CargoPlan.zip`) — STSE 525컨 검증된 Python
3. **검증된 HTML 출력** (`SITC_SENDAI_2631E_카고플랜.html`) — M6.81 결과물
4. **인계 지침서** (`HANDOFF_2026-05-22.md`) — "다음 세션 작업 후보 #3: React 컴포넌트 통합"

### 작업 범위 (옵션 C — 사용자 선택)
- **A**: M6.81 baseline 양식만 React에 적용 (6단 deck, 60:40, 18×13)
- **B**: A + 빈 카고플랜 baseline 강제 적용 (모든 선박 통일)
- **C**: A + B + 페이지 2 (Special Cargo Stowage) 추가 ← 선택됨

---

## 🔧 변경 내역

### [A] M6.81 baseline 양식 React 적용

**`src/components/PrintableCargoPlan.jsx`**
- `STD_DECK`: `['90','88','86','84','82']` (5단) → `['92','90','88','86','84','82']` (6단)
- `STD_HOLD`: `['08','06','04','02']` (4단, 변경 없음)
- CSS `.bay-grid-row.deck-row` / `.hold-row` 명시적 `flex: 1 1 0` 추가
- 자연 60:40 비율 (6 deck-row + 4 hold-row = 자동)
- `_M682_BASELINE` 상수 추가 (디버그/검증용)

### [B] 빈 카고플랜 baseline 강제 적용

**`src/components/PrintableCargoPlan.jsx`**
- `pageDeckUnion` useMemo 끝에 `if (set.size === 0) STD_DECK.forEach(t => set.add(t))` 추가
- `pageHoldUnion` 동일 처리
- 베이사전 부재/부족 케이스에서도 모든 박스 통일된 6+4 자리

### [C] 페이지 2: Special Cargo Stowage 추가

**`src/components/PrintableCargoPlan.jsx`**
- `specialCargo` useMemo 추가 (베이플랜 기반 특수화물 추출)
  - Reefer(`isReeferContainer`), DG(`c.dg || c.imdgClass`), FR, OT, Tank
  - 우선순위: DG > Reefer > FR > Tank > OT
  - 정렬: kind → bay → tier(큰 것부터) → row
- `specialCounts` useMemo 추가 (종류별 카운트)
- `.special-page` 렌더링 블록 추가 (page-break-before)
  - 헤더: 선박 / SPECIAL CARGO STOWAGE / 날짜
  - 서브헤더: 항차 / POL→POD / 총 N대
  - 종류별 색상 뱃지 (Reefer 시안, DG 빨강, FR 보라, Tank 주황, OT 마젠타)
  - 11 컬럼 테이블 (NO/TYPE/BAY/위치/CN/SIZE/F·E/POL→POD/WT/특수정보/실번호)
  - 종류별 행 배경 색 (1페이지 셀 색과 일관)
- 특수화물 0대인 항차는 페이지 2 자체 미생성

---

## ✅ 검증 결과

### 빌드
```
✓ vite v6.4.2 build in 11.30s
✓ dist/assets/index-dn6za9X9.js  2,410.74 kB
```

### M6.82 페이지 2 분류 로직 ↔ M6.81 검증 결과 (STSE 2631E 525컨)
| 종류 | M6.82 React | M6.81 Python | 일치 |
|---|---|---|---|
| DG | 9 | 9 | ✓ |
| Reefer | 58 | 58 | ✓ |
| FR | 8 | 8 | ✓ |
| OT | 1 | 1 | ✓ |
| Tank | 0 | 0 | ✓ |
| **합계** | **76** | **76** | ✓ |

EDI 직접 파싱(STSE_2631E_KRPTK.EDI) 결과 100% 일치.

---

## 📂 변경된 파일 (이 ZIP)

```
src/utils.js                                — APP_VERSION 'M6.80' → 'M6.82' + 변경점 주석
src/components/PrintableCargoPlan.jsx       — 핵심 변경 (A/B/C 모두 여기)
src/components/HelpModal.jsx                — M6.82 사용법 항목 (tips 배열 맨 위)
HANDOFF_TO_NEXT_CHAT.md                     — 이 파일
dist/                                       — vite build 결과 (배포용)
```

---

## ⚠️ 미검증 사항 (다음 세션 우선)

1. **다른 선박 페이지 2 출력 직접 검증**
   - TNJP, RZOR, ATRP, NBTD, MCSC 등 EDI 받으면 즉시 적용 가능
   - 핵심 확인: 리퍼 온도(`TMP+2+`), DG UN/Class(`DGS+IMD+`) 추출 여부
2. **실 번호(seal No) 표시 보강**
   - 현재 `c.sealNo || c.seal` 폴백 — EDI 양식별 필드명 다를 수 있음
   - C-K BAPLIE의 `51:` 라인, BAPLIE D95B의 `RFF+BN:` 등 확인 필요
3. **페이지 3 (Special Type Stowage) 양식**
   - 사이즈+타입별 매트릭스
4. **PDF 직접 출력**
   - 현재 HTML → 인쇄 → PDF로 저장 (Chrome 기본)

---

## 🚀 배포

배포 방법: `dist/` 폴더를 정적 호스팅에 업로드 또는 기존 위치에 덮어쓰기.

---

## 🧠 영구 원칙 재확인 (메모리 #24/#25)

- **빈 카고플랜 baseline**: 6 deck [92,90,88,86,84,82] + 4 hold [8,6,4,2]
- **EDI → 실 카고플랜**: 짝수 베이 40ft → 짝꿍 홀수 박스에 X 표시
- **단독 홀수 박스**: 자체 마크 + 양옆 짝수 40ft 자리 X
- **베이사전 = 절대 기준**, EDI는 보조 역할
