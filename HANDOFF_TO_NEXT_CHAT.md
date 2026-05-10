# M4.9f → 다음 세션 인계 (HANDOFF)

## ⚠️ 첫 빌드 사고 기록 (학습용)

처음 M4.9f ZIP 배포 시 두 곳 누락 발견 (사용자 지적으로 발견):
1. `src/utils.js`의 `APP_VERSION` 갱신 누락 (M4.9e 그대로) — 헤더 라벨이 옛 버전이라 업데이트 여부 확인 불가
2. `src/components/HelpModal.jsx`(앱 도움말) 갱신 누락 — 새 기능 사용법이 도움말에 없음 → 초보 검수원 교육 불가

**빌드 전 체크리스트 (영구 규칙)**:
- [ ] `APP_VERSION` 갱신
- [ ] HelpModal에 새 기능 사용법 추가 (초보자 교육용)
- [ ] SHIPMENT_MANUAL.md 갱신 (해당 시)
- [ ] HANDOFF.md 갱신
- [ ] grep으로 산출물 검증

## 현재 상태 (M4.9f) — 5단계 "단순 이동" 완성

### ✅ 완료된 변경 (M4.9e → M4.9f)

#### 5단계 단순 — 자리 뺏긴 컨 ↔ 빈 셀 클릭 이동 (DnD 없이)

**워크플로우 (사용자 시각):**
1. 베이 탭 → 상단 노란 박스 "자리 뺏긴 컨테이너 N대"
2. 카드 우측 **[📦 이동]** 버튼 누름 → 카드가 노랑 하이라이트(선택중)
3. 화면 상단에 큰 노란 안내 바 등장:
   - "본위치 NN/NN/NN → 베이그리드에서 빈 셀(점선/X)을 누르세요"
   - 우측에 [취소] 버튼
4. 베이 그리드의 빈 셀들이 노란 테두리 + "📦+" 마크로 활성화
5. 빈 셀 클릭 → fbSetActualPosition 호출 → 안내 바 사라짐
6. 카드 본문(왼쪽 큰 영역) 클릭은 기존대로 ContainerDetailModal 열림 — 직접 입력 경로 보존 (두 진입점 공존)

**자동 매칭 로직:**
- pendingMove의 fromBay가 짝수(40ft) → 페이지의 evenBay만 활성화
- pendingMove의 fromBay가 홀수(20ft) → 페이지의 oddBay만 활성화
- 같은 종류 슬롯 보장 (40ft를 20ft 자리로 못 보냄)
- X마크 셀(다른 컨이 점유)은 비활성 — 안전

### 🎯 핵심 검증 결과 (빌드 산출물 grep)
- pendingMove props 전달 정상
- 한국어 텍스트 모두 노출됨 (본위치 1회, 자리 뺏긴 2회, 이동 시작 1회, 📦+ 1회)
- Firebase 호출 흔적 정상 (bay_actual 16회, actual_at 6회, actual_by 8회)

### 🔧 코드 변경 위치

| 파일 | 변경 |
|---|---|
| src/components/DisplacedSidebar.jsx | 카드 우측 [📦 이동] 버튼 신설, pendingMoveCn props로 선택중 시각화 |
| src/pages/VoyagePage.jsx | pendingMove state + onStartMove + onCommitMove(fbSetActualPosition 호출) |
| src/components/BayPlan.jsx | pendingMove props 받음, 상단 안내 바, BayPage에 props 전달 |
| src/components/BayPlan.jsx (BayPage) | moveTargetBay 결정 + renderCell 빈 셀 button화 |

---

## 🔜 다음 세션 (M4.9g) — 4단계 + 보관함 + DnD

### 4단계: PC 마우스 영역 선택 (PC 전용)

설계 (HANDOFF 원안 기준):

```js
// BayPlan에 다시 추가:
const [selectionMode, setSelectionMode] = useState(false);
const [selectedKeys, setSelectedKeys] = useState(new Set());  // "bay-row-tier"
const [dragRect, setDragRect] = useState(null);  // {startX, startY, curX, curY}
```

**컨트롤 바 토글**: `🔲 선택` 버튼 (모바일+pendingMove 활성 시 자동 OFF)

**드래그 처리** (BayPlan 그리드 본체 div에서):
- mousedown → dragRect 시작 (단, button 위에서 시작했으면 무시)
- mousemove → curX/curY 업데이트, 시각 사각형 그리기 (absolute div)
- mouseup → 사각형과 셀 getBoundingClientRect 교차 검사 → selectedKeys에 추가
- 셀 단일 클릭(짧은 마우스다운) → toggleSelectKey

**시각 하이라이트**: renderCell에서 selectedKeys.has(key) → 파란 ring

### 5단계 추가: 보관함(STG) + 일괄 보관 / 일괄 이동

**보관함 도입 이유**: 4단계로 여러 셀을 골라서 "임시 빼기"가 가능해야 정리 작업이 됨.

**데이터 모델**:
```js
// Firebase: voyages/{key}/loading/records/{cn}
{
  bay_actual: '__STG__',  // 또는 별도 필드 in_storage: true
  row_actual: '00',
  tier_actual: '00',
  actual_at, actual_by
}
```

**UI**:
- DisplacedSidebar 위 또는 옆에 별도 보관함 박스 신설 (또는 통합 탭)
- 보관 컨 카드들 (drag 가능 또는 클릭 → pendingMove)
- "일괄 보관 → 보관함" 버튼: 선택된 셀의 컨들을 한 번에 STG로
- "보관함 비우기" / "일괄 복원" 버튼

**렌더링**:
- bay_actual === '__STG__' 인 컨은 베이 그리드에서 숨김 (STORAGE 처리)
- 보관함 박스에만 표시

### 6단계: HTML5 DnD (옵션)

5단계 클릭→클릭이 검증되면 그 위에 DnD 추가:
```jsx
<button draggable={true}
  onDragStart={e => e.dataTransfer.setData('cn', c.cn)}
  onDragOver={e => e.preventDefault()}
  onDrop={handleDrop}>
```
폰에서는 long-press → pendingMove 진입(현재 클릭 동작과 동일).

### 다음 세션 우선순위
1. **사용자 검증 결과 듣기** (M4.9f 5단계 단순)
   - 실제 선박 데이터로 동작 확인
   - 페이지 전환(다른 베이) 후에도 pendingMove 유지되는지
   - 짝/홀 매칭이 자연스러운지
2. 4단계 영역 선택 (PC 전용)
3. 보관함 신설
4. 일괄 보관/이동 액션
5. DnD (옵션)

---

## 검증 원칙 (불변)

1. 빌드 후 grep 핵심 텍스트 확인
2. 시뮬레이션 알고리즘 검증
3. ZIP → GitHub push → PWA 캐시 클리어 → 폰/PC 검증
4. 사용자 도메인 지식 우선
5. 추측 빌드 금지 — 시뮬 가능한 건 시뮬, 안 되는 건 명시

## 사용자 누적 피로 (불변)

- 큰 변경 한 번에 묶지 말고 단계 분할 ✅ (M4.9f가 그 적용)
- 시뮬 가능 vs 실환경 검증 필요 부분 명확히 분리 ✅
- "한 번에 다" 요청해도 검증 어려운 부분은 별도 빌드 권장

## 사용자 환경 (불변)
- 성일, 평택항 검수, TNJP/SWSP 등
- 핸드폰 PWA(메인) + PC 둘 다
- 4번은 PC 환경에서만 검증 가능

## 빌드

```bash
cd /home/claude/m49f_build  # 또는 새 m49g_build
bash build.sh
```

## 잠재 이슈 (M4.9f)

1. **다중 적재 셀** — 같은 row/tier에 컨이 여러 개(stackCount≥2) 있는 경우 빈 셀 검출 우선순위? 현재는 첫 컨 기준이라 OK
2. **xMarks 계산** — pendingMove 컨이 자기 본위치(xMarks 차지자)에서 빠지지 않음. 검수원이 "본위치로 복귀"를 원하면 ContainerDetailModal에서 [수정 위치 삭제]로 가야 함
3. **fromBay parity** — bow/stern 단독 베이(예: 19) 같은 경우 짝수 베이가 없으면 옆 페이지로 스크롤해야 옮김 가능. 의도된 동작이지만 사용자에게 모호할 수 있음
4. **pendingMove 유지 범위** — 베이 페이지 스크롤 + 페이지 점프 시 유지됨(VoyagePage state). 단, 다른 탭 이동 시도 유지(state는 VoyagePage 레벨). 의도된 동작
