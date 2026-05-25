# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-26
**현재 버전**: M6.93.18 (신규선박 매트릭스 화면 안 보임 hotfix + VoyagePage 잠재 hooks 위반 정리)

---

## 🩹 M6.93.18 (2026-05-26) — React Hooks Rules 위반 hotfix

### 사용자 보고
> "신규선박 매트릭스를 클릭하면 화면이 안보이는 현상"

### 진짜 원인 (ShipMatrixBuilderModal.jsx)
- 242줄에 `const [showDebug, setShowDebug] = useState(false);` 가 있었음
- 그런데 228줄에 `if (!matrix) return ...` 조기 return 존재
- 첫 렌더(matrix=null): hooks 13개 호출 후 조기 return → showDebug useState 호출 안 됨
- useEffect 실행 → setMatrix(non-null) → 재렌더
- 두 번째 렌더: 조기 return 건너뛰고 14번째 hook 호출 시도
- React 에러: "Rendered more hooks than during the previous render"
- 컴포넌트 크래시 → **화면 새하얗게 됨** = 사용자 보고 현상

### 수정 (ShipMatrixBuilderModal)
- `const [showDebug, setShowDebug] = useState(false);` 를 컴포넌트 최상단 (line 42)으로 이동
- 다른 useState들과 같은 위치, 조기 return 위에 둠 → Rules of Hooks 준수

### 추가 발견: VoyagePage.jsx도 동일 패턴
AST 스캐너로 전체 .jsx 검사 결과 VoyagePage에도 잠재 버그:
- line 144: `if (!voyage) return ...`
- line 176, 267, 355, 361, 381, 427: useMemo/useEffect 6개 (조기 return 이후!)
- voyage가 null→truthy로 토글되는 케이스에서 동일 크래시 가능
- 사용자 보고 없었으나 잠재 버그라 같이 수정

### 수정 (VoyagePage)
1. `const sec = voyage[mode] || {}` → `const sec = (voyage && voyage[mode]) || {}` (null-safe)
2. ediMap/recMap/xrayMap/xraySeals/compMap은 이미 `|| {}` 처리됨
3. `if (!voyage) return ...` 조기 return을 line 450 (모든 hook 호출 이후)으로 이동
4. 기존 hooks 안에서는 이미 `voyage?.info?.vsl` 같은 optional chaining 사용 중이라 voyage=null이어도 안전

### 검증
- AST 스캐너: 전체 .jsx 파일에서 hooks-after-early-return 위반 0건
- Vite 빌드: 성공 (2.88MB chunk, 11.9초)
- 시뮬레이션: 
  - ShipMatrixBuilderModal 마운트 → 모든 hooks(14개) 호출 → 조기 return → useEffect setMatrix → 재렌더 → 동일 14개 hooks 호출 ✅
  - VoyagePage voyage=null → 모든 hooks 호출(빈 데이터) → 조기 return "항차 없음" → voyage 도착 → 동일 hooks 호출 ✅

### ConfirmModal/ChoiceModal는 false positive
스캐너가 의심했으나 실제로는 `useConfirm`/`useChoice` 라는 별도 hook 함수 안에 useState/useCallback이 있음. 컴포넌트 본문이 아님 → 위반 아님.

---

## 🔧 M6.93.17 (2026-05-26) — 페어 매칭 버그 해결
- cargoPlanCore.js autoPairBays: usedOdds 체크 + 사전 짝수 우선 정렬
- DXQD 2621E 실데이터 시뮬: trios 6개 = OOCL과 100% 일치

## 🔑 M6.93.16 (2026-05-25) — 저장 키 / 검색 키 mismatch 해결
- alias 정보 보존 + alias 키로도 user dict 저장
- lookupUserBayDict에 alias 매칭 추가

---

## M6.93.x 시리즈 회고
| 버전 | 발견한 원인 | 결과 |
|------|------------|------|
| M6.93.12 | lookupUserBayDict 매칭 보강 | 6단계 fuzzy 추가 |
| M6.93.13 | v2-verified-newer가 user 우회 | user dict 최우선 |
| M6.93.14 | EDI 베이 구조 추정 + bayDef union | 사용자 통찰 반영 |
| M6.93.15 | 옛 데이터 호환 + 디버그 패널 + 전 컴포넌트 | 가시화 + 일관 적용 ※디버그 패널 추가하면서 hook 위치 버그 만듦 |
| M6.93.16 | 저장/검색 키 mismatch | alias 보존 + 전체 워크플로 시뮬 |
| M6.93.17 | autoPairBays used 체크 누락 | 사전 짝수 우선 정렬 |
| **M6.93.18** | **Rules of Hooks 위반 (M6.93.15 회귀)** | **컴포넌트 크래시 해결 + 전체 .jsx 스캔** |

### M6.93.x 교훈
- 매칭 알고리즘만 강화하지 말고 호출 인자 먼저 비교
- 한 함수 시뮬 대신 사용자 전체 워크플로 시뮬
- 디버그 패널 필수 (사용자가 데이터 직접 확인)
- 변수 mismatch는 5초면 보임 — 코드 흐름을 끝까지 추적
- **신규 hook 추가 시 무조건 컴포넌트 최상단 (조기 return 위)에 배치할 것**
- eslint-plugin-react-hooks (rules-of-hooks 룰) 활성화 검토 권장

---

## 미해결 작업
1. **M6.93.18 화면 검증** (신규선박 매트릭스 클릭 → 모달 정상 표시 + 디버그 패널 토글 동작)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가
