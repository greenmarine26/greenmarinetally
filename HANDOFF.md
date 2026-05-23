# Tallyman Master M6.86.8 인계지침서

작성: 2026-05-23
이전 버전: M6.86.7.2 (검정화면 핫픽스 회귀) → **M6.86.8 (M6.81 알고리즘 회귀, 카고플랜 V2 도입)**

---

## 0. M6.86.8 핵심 — M6.81 Universal Cargo Plan 알고리즘 회귀

### 사용자 보고
> "베이구조가 업데이트 할때 마다 잘 되던것도 바뀝니다. 요근래 실제 카스피와 같게 만들었었는데 그게 또 이렇게 바꼈씁니다. 완벽한 플랜이었는데... 다른 선박도 HTML에 있는 방식으로 바꿀수 있게 다 고쳐주셨으면 합니다."

검수앱 PDF vs 카스피 PDF vs M6.81 HTML 비교 결과 (STSE 2631E):
- BAY 07: 카스피=10컬럼 / 검수앱=5컬럼 (가운데만)
- BAY 11: 카스피=10컬럼 / 검수앱=9컬럼 (00 잘못 추가, 양끝 잘림)
- BAY 28: 카스피=트리오 (28)29 / 검수앱=BAY 28 단독으로 잘못 표기
- 등 15개 베이 중 12개 불일치

### 진짜 원인
M6.86.7 알고리즘이 **베이사전 hull 정의를 무시하고 EDI 데이터에 있는 컬럼만 그림**. M6.81 정답 알고리즘의 STD 6deck+4hold 자리 통일 + cells 배열 기반 피라미드 단면(`get_active_cols_symmetric`)을 폐기.

지침서 §4.1의 "STD_DECK/STD_HOLD 강제 baseline 없음. ⚠️ 이전 '6 deck + 4 hold baseline' 메모는 잘못" 이 메모 자체가 잘못된 진단의 흔적. **사용자 합의로 이 메모를 다음과 같이 정정**:

> **§4.1 정정**: STD tier 자리 통일 O, hull 모양(컬럼 + 단면) 베이별 cells 기준 O.
> STANDARD_DECK = [92,90,88,86,84,82], STANDARD_HOLD = [8,6,4,2] tier 자리는 모든 베이가 통일되게 렌더링하되,
> 그 안에서 베이별 cells 배열 분포로 deck_t/hold_t/active_cols 결정.
> 페이지 폭 통일 (globalRowRange, pageDeckUnion) 절대 사용 금지.

### M6.86.8 변경
| 파일 | 변경 |
|------|------|
| `src/cargoPlanCore.js` | **신규** — M6.81 Python `build_cargo_plan_universal.py`의 4개 핵심 함수 1:1 포팅 |
| `src/components/PrintableCargoPlanV2.jsx` | **신규** — V1과 병행. M6.81 알고리즘 그대로 + 검수앱 고유 마크 통합 |
| `src/components/PrintHubModal.jsx` | "🆕 카고플랜 V2 · M6.81 회귀" 버튼 추가 (기존 V1 옆) |
| `src/components/HelpModal.jsx` | M6.86.8 항목 + M6.86.7.2 항목 추가 |
| `src/utils.js` | `APP_VERSION = 'M6.86.8'` |
| `sw.js` | `VERSION = 'M6.86.8'` |

### 검수앱 고유 마크 (M6.81 7기본 + 확장)
| 마크 | 의미 | 비고 |
|------|------|------|
| `o` | PTK 양하 일반 | M6.81 |
| `X` | 통과 (또는 짝수40 shadow) | M6.81 |
| `R` | 리퍼 | M6.81 |
| `r` | 빈 리퍼 | 검수앱 확장 |
| `D` | DG | M6.81 |
| `F` | FR | 검수앱 표기 (M6.81의 P 대체) |
| `T` | Tank | M6.81 |
| `A` | OT/OOG (Awkward) | 검수앱 표기 (M6.81의 U 대체) |
| `E` | Empty | 검수앱 확장 |
| `K/P/S/M` | 선적 POD (KAN/PUS/SGN/MIP) | 검수앱 확장 |

### 검증 (Phase 1 완료 · Phase 2 시각 확인 필요)
**Phase 1 (코드 레벨, 자동 검증 통과)**:
- ✅ STSE 2631E 베이사전 데이터로 `cargoPlanCore.js` 결과를 M6.81 Python 결과와 1:1 비교
- ✅ autoPairBays: 트리오 7개 + 단독 1개, M6.81과 일치
- ✅ getRowPositions, getActiveColsSymmetric 케이스 검증 통과
- ✅ STSE 2631E 15개 베이 row_labels 모두 M6.81 HTML 정답과 1:1 일치 (BAY 07=10컬럼, BAY 03=9컬럼, BAY 01=7컬럼 등)

**Phase 2 (사용자 시각 확인 필요)**:
- 빌드 통과 (vite 6.4.2, 12.91초, 0 에러)
- 정적 서버 시뮬레이션 모든 자산 200 응답
- **사용자 단계**: 검수앱에서 "🆕 카고플랜 V2" 버튼 눌러 V2 출력 확인. 카스피 양식과 같은지 검증.

### 적용 방법
1. ZIP 풀어서 repo 폴더에 통째로 덮어쓰기
2. `git add -A && git commit -m "M6.86.8 V2 cargo plan" && git push`
3. 폰 캐시 비우기 (sw.js VERSION이 M6.86.8로 바뀌어 캐시 자동 무효화되지만 한 번은 강제 새로고침)
4. 인쇄 허브 → "🆕 카고플랜 V2 · M6.81 회귀" 버튼 → 카스피 양식과 비교

### 다음 패치 후보 (V2 확장)
1. **선사별 별첨** (M6.81 별첨1) 통합
2. **화물 종류별 별첨** (M6.81 별첨2) 통합
3. **선적 모드** POD 컬러 세부 코딩 (DLC/WEI/LYG 등 다양한 POD)
4. **X-Ray 표시** (셀 모서리에 별 표시)
5. **V1 폐기** (V2 시각 확인 완료 후)

### ⚠️ 절대 하지 말 것
- 루트 index.html을 소스형으로 두지 말 것 (검정 화면, M6.86.7.1 사고)
- STD_DECK/STD_HOLD 자리 통일 없애지 말 것 (베이별 hull 단면이 사라짐, M6.86.7 사고)
- globalRowRange/pageDeckUnion으로 페이지 폭 통일하지 말 것 (베이별 hull 모양 깨짐, M6.86.5 사고)
- 사용자 사전 확인 없이 베이사전 변경 금지 (M6.86.5 베이사전 오염 사고)
- 워크플로 빌드 색깔에 휘둘리지 말 것 (사이트 작동은 main 루트 빌드본이 결정)

