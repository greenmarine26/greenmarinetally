# M5.0 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.0) — 정리 + 산뜻한 화면 빌드 완료

### ✅ 완료된 변경 (M4.9f → M5.0)

#### A. 죽은 코드 삭제
- `src/components/MixerUploadModal.jsx` 파일 삭제 (27KB)
- `utils.js`, `pages/VoyagePage.jsx`의 관련 주석 정리
- 번들 사이즈 감소 + 코드베이스 정리

#### C. 영어회화집 → 도움말 안으로 통합
- `Header.jsx`에서 [🌐 Languages] 버튼 + ContainerPhrasebook import 제거
- `HelpModal.jsx`에 새 탭 [영어회화] 추가
- 그 탭 활성화 시 안내 카드 + [회화집 열기] 큰 버튼 → 클릭하면 ContainerPhrasebook 모달 호출
- 헤더 우측 버튼 7개 → 6개 (산뜻해짐)

#### E + J. 탭 명칭 정리
| 기존 | 변경 후 |
|---|---|
| 검색 🎤 | 🎤 자연어 |
| 보고서 | 결과 |
| 자료 | 업로드 |

명칭 의미가 더 직관적: "업로드"는 input, "결과"는 output

#### F. 베이 컨트롤 바 산뜻 정리
- 줌 그룹 — 4버튼(축소/100%/확대/리셋) → 3버튼(축소/[100%↻]/확대), 가운데 % 표시 자체가 리셋 버튼 겸용
- 줌 그룹을 한 컨테이너(rounded-lg)로 묶어 시각적 그룹화
- 인쇄 — 2버튼(📄 플랜 + 📋 베이상세) → 1버튼(🖨️ 인쇄 ▾) + 드롭다운 (백드롭으로 바깥 클릭 닫힘)
- 시각적 분리선(`w-px h-6 bg-slate-700`) 도입 — 그룹 간 구분 명확
- ISO403/선적대상 배지 텍스트 짧게 ("ISO403 7/12" → "📷 7/12")

#### H. 항차 요약 카드 (신규 컴포넌트)
- 새 파일: `src/components/VoyageSummaryCard.jsx`
- VoyagePage 상단 (작업보고 버튼 위)에 표시
- 진행률 바 + 모드별 색상 (양하=blue, 선적=amber)
- 주의 항목 칩: 리퍼(온도X 시 빨강 강조) / X-RAY / ISO403(미촬영 시 강조) / 자리 뺏김
- 모든 칩이 0이면 "특이 항목 없음" 1줄로 축소
- 통계 탭 가지 않아도 진입 즉시 작업 우선순위 판단 가능

#### M5.0 변경사항 도움말 자동 안내
- `HelpModal.jsx` tips 탭 맨 앞에 "🆕 M5.0 변경 사항" 섹션 자동 추가
- 모든 변경 사항이 검수원에게 in-app 안내됨 (체크리스트 원칙 준수)

### 🎯 핵심 검증 결과 (빌드 산출물 grep)
- 버전: M5.0 (4회), M4.9e (0회) ✓
- 탭 명칭: "🎤 자연어" 정상 ✓
- 항차 요약: "특이 항목 없음", "온도X", "자리 뺏김" 모두 정상 ✓
- 베이 컨트롤: "인쇄 ▾", "카고 플랜", "베이 상세" 드롭다운 정상 ✓
- 영어회화: "영어회화" 4회, "회화집 열기" 1회 ✓
- M4.9f 기존 기능 (자리 뺏긴 컨 이동) 모두 잔존 ✓
- MixerUploadModal: HelpModal의 변경 안내 1회만 (정상 — 사용자 교육용)

---

## 🔜 다음 세션 (M5.1) — 신규 기능

사용자 요청: 점검 보고서의 모든 권고 적용. M5.0은 정리/리팩터링 + 핵심 신규(요약 카드)에 집중. **M5.1에 큰 신규 기능 두 개:**

### G. 작업 마감 체크리스트 (신규 화면)

**진입**: 결과 탭 위에 [🏁 작업 마감 점검] 큰 버튼

**한 화면에 모든 미완 항목 표시**:
- 미완료 컨 N대 → 클릭 시 리스트 탭 + filter='undone'
- 실 미입력 (선적/엠티) M대 → 클릭 시 리스트 + 필터
- ISO403 사진 미촬영 K대 → 클릭 시 베이 탭 ISO403 패널
- 리퍼 온도 미입력 J대 → 클릭 시 리스트 + 리퍼 필터
- 자리 뺏긴 컨 미해결 P대 → 클릭 시 베이 탭 (DisplacedSidebar)
- 모두 0이면 "✅ 마감 가능" 큰 그린 화면

**구현**:
- 새 컴포넌트 `WorkClosingChecklist.jsx`
- VoyagePage에 모달 state 추가 + 진입 버튼
- 각 항목별 카드 + 점프 핸들러 (setTab + setFilter)

### I. 보관함 + 영역 선택 + DnD (원 M4.9g 계획 그대로)

**4단계 PC 영역 선택**:
- BayPlan 컨트롤 바에 [🔲 선택] 토글 (모바일 자동 비활성)
- mousedown→mousemove→mouseup으로 사각형 드래그
- 사각형 내 셀 검출 (getBoundingClientRect)
- 시각 하이라이트 (파란 ring)

**5단계 추가 (보관함)**:
- DisplacedSidebar 통합 또는 별도 — 결정 필요
- bay_actual === '__STG__' 인 컨은 베이 그리드에서 숨김
- "일괄 보관" 버튼 (영역 선택분 → STG로)
- "보관함 비우기" / "일괄 복원" 버튼

**DnD**:
- HTML5 draggable=true 추가
- 폰: long-press → 현재 클릭→클릭 이동(M4.9f) 동작 그대로

---

## 빌드 전 체크리스트 (영구 규칙)
- [ ] `APP_VERSION` 갱신
- [ ] HelpModal에 새 기능 사용법 추가 (초보자 교육용)
- [ ] SHIPMENT_MANUAL.md 갱신 (해당 시)
- [ ] HANDOFF.md 갱신
- [ ] grep으로 산출물 검증

## 잠재 이슈 (M5.0)

1. **VoyageSummaryCard의 displaced 검출 로직**이 VoyagePage의 베이 탭 로직과 약간 다를 수 있음 (VoyagePage는 `_position_moved` 플래그 사용, 카드는 `bay_actual` 존재 여부로 판정). 실데이터 검증 시 두 카운트가 일치하는지 확인 필요.

2. **인쇄 드롭다운 z-index**: 백드롭은 z-20, 메뉴는 z-30. sticky 컨트롤 바가 z-10이라 안전. 다만 페이지 점프 select 등 다른 sticky 요소와 겹치는지 폰 환경에서 확인 필요.

3. **헤더 [🌐 Languages] 버튼 제거 후** 기존 사용자가 영어회화집 못 찾을 수 있음 → HelpModal 안내문 + tips 탭의 M5.0 변경사항이 가이드 역할.

## 코드 변경 위치

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.0' |
| src/components/MixerUploadModal.jsx | **삭제** |
| src/components/Header.jsx | ContainerPhrasebook import/state/버튼/모달 모두 제거 |
| src/components/HelpModal.jsx | 'english' 탭 추가 + ContainerPhrasebook 인라인 호출 + tips에 M5.0 안내 |
| src/components/VoyageSummaryCard.jsx | **신규** |
| src/components/BayPlan.jsx | 컨트롤 바 산뜻 정리 (줌 그룹 + 인쇄 드롭다운 + 분리선) |
| src/pages/VoyagePage.jsx | 탭 명칭 변경 + VoyageSummaryCard 표시 |

## 사용자 환경 (불변)
- 성일, 평택항 검수, TNJP/SWSP 등
- 핸드폰 PWA(메인) + PC 둘 다
- M5.0 검증 완료 후 → M5.1로 G(마감 체크리스트) + I(보관함/DnD) 진행
