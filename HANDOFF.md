# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-26
**현재 버전**: M6.93.18 (신규선박 매트릭스 화면 안 보임 hotfix + SW 캐시 무한 유지 사고 해결)

---

## 🩹 M6.93.18 (2026-05-26)

### 사용자 보고
> "신규선박 매트릭스를 클릭하면 화면이 안보이는 현상"

### 발견한 버그 3개 (전부 수정)

#### 1) ShipMatrixBuilderModal.jsx — React Hooks 위반 (보고된 본 버그)
- 242줄에 `const [showDebug, setShowDebug] = useState(false);` 가 있었음
- 그런데 228줄에 `if (!matrix) return ...` 조기 return 존재
- 첫 렌더(matrix=null): hooks 13개 호출 → 조기 return → showDebug useState 호출 안 됨
- useEffect가 setMatrix(non-null) → 재렌더 → 14번째 hook 호출 시도
- React 에러 #310 ("Rendered more hooks than during the previous render") → 컴포넌트 크래시 → 화면 새하얗게 됨

**수정**: showDebug useState를 다른 useState들과 함께 컴포넌트 최상단 (line 42)으로 이동.

#### 2) VoyagePage.jsx — 동일 패턴 잠재 버그 (사용자 보고 X, 스캐너로 발견)
- line 144 `if (!voyage) return ...` 이후 line 176, 267, 355, 361, 381, 427에 useMemo/useEffect 6개
- voyage가 null↔truthy 토글되면 동일 React 에러 #310 가능

**수정**:
- `const sec = voyage[mode] || {}` → `const sec = (voyage && voyage[mode]) || {}` (null-safe)
- early return을 모든 hook 이후 (line 447)로 이동
- 기존 hooks는 이미 `voyage?.info?.vsl` optional chaining 사용 중이라 안전

#### 3) sw.js VERSION 미동기화 — 캐시 무한 유지 사고
**증상**: 사용자가 새 ZIP을 적용해도 폰에서는 옛 빌드 (index-Fb2AjMQy.js)가 그대로 실행되어
M6.93.18 수정이 전혀 반영 안 됨.

**진짜 원인**:
- `public/sw.js`의 VERSION이 'M5.78'에 하드코딩되어 있고 매 빌드마다 안 바뀜
- sw.js가 byte-level 동일 → 브라우저가 "변경 없음" 판단 → 새 SW install 안 함
- activate 핸들러 안 돌아감 → 옛 캐시 (tallyman-M5.78) 영원히 유지
- 폰의 옛 캐시 index.html이 옛 hash JS를 가리킴 → 새 서버에 그 hash 없음 → 캐시 fallback으로 옛 JS 반환 → 옛 버그 그대로

**수정 (재발 방지 포함)**:
- public/sw.js, v2work/sw.js (루트), dist/sw.js 모두 VERSION = 'M6.93.18'로 동기화
- `build.sh` 첫 단계 [0/5]에 자동 동기화 sed 추가: 매 빌드마다 utils.js의 APP_VERSION을 읽어
  public/sw.js의 VERSION으로 자동 주입. 앞으로 같은 사고 절대 안 남.
- `build.sh` [1.5/5] 추가: 빌드 직전 root index.html을 vite-source 템플릿으로 임시 교체
  (옛 hash가 root index.html에 남아 있어 vite 빌드 실패하던 회귀 방지)

### 검증
- AST 스캐너: 전체 .jsx 파일에서 hooks-after-early-return 0건
- Vite 빌드: 성공, 새 hash = `index-DAvMNuw4.js` (옛 `index-Fb2AjMQy.js`와 다름)
- 새 번들에 M6.93.18 문자열 포함 확인
- sw.js 3곳 모두 VERSION = M6.93.18 일관성 확인

### 사용자 적용 절차
1. **ZIP을 GitHub repo (또는 배포 서버)에 통째로 push**
2. 검수원 폰에서 사이트 첫 방문 시:
   - 새 sw.js 다운로드됨 (VERSION 변경 감지)
   - install → activate → 옛 캐시 tallyman-M5.78 자동 삭제 → 새 캐시 tallyman-M6.93.18 생성
   - UpdatePrompt 배너 "🆕 새 버전 출시" 표시되면 [업데이트] 탭 → 자동 새로고침 → M6.93.18 작동
   - 배너 안 떠도 자동 활성화됨 (그 다음 새로고침부터 새 버전)
3. **드물게** 캐시가 끈질긴 경우 (이전 sw.js가 깨져 있던 폰 등):
   - 브라우저 설정 > 사이트 설정 > 해당 사이트 데이터 삭제
   - 또는 시크릿 창에서 한번 접속 후 일반 창 새로고침

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
| **M6.93.18** | **Rules of Hooks (M6.93.15 회귀) + sw.js VERSION 미동기화 (장기 누적)** | **컴포넌트 크래시 해결 + 캐시 자동 무효화 + 빌드 자동 동기화** |

### M6.93.x 교훈
- **신규 hook 추가 시 무조건 컴포넌트 최상단 (조기 return 위)에 배치**
- **sw.js VERSION은 절대 손으로 안 바꿔도 되게** — APP_VERSION에서 자동 주입
- eslint-plugin-react-hooks (rules-of-hooks 룰) 활성화 검토 권장
- 사용자가 "수정한 것이 반영 안 됨" 보고 시 캐시 의심 — 빌드 hash, sw.js VERSION 모두 확인

---

## 미해결 작업
1. **M6.93.18 사용자 검증** (신규선박 매트릭스 클릭 → 모달 정상 + 디버그 토글 동작)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가
