# M4.9e → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M4.9e)

### 완료된 변경 사항

#### 선적 실체 위치 (1+2+3단계)
1. 모달 UI — "실체 위치 (선적확인 시)" 박스, "수정 위치 입력" 단일 진입점
2. effective 위치 적용 — allEdiContainers + containers 양쪽 모두
3. 자리 뺏긴 컨 검출 + DisplacedSidebar 노란 박스

#### 베이상세/카고 플랜 인쇄
- 베이상세 row 동적 (globalRowRange.maxLeft/maxRight)
- 베이상세 tier 동적 (globalTiers props)
- 카고 플랜 4행 모두 우측 정렬 (FORE/AFT singles+pairs)
- 화면=출력 동일 row/tier 구조
- STD_DECK/STD_HOLD/STD_ROWS 하드코딩 모두 제거

#### 라벨 정정
- "검수 완료" → "양하확인" / "선적확인" (모드별)
- "20ft 전용" / "(40ft) / (20ft)" 라벨 제거

#### 양하리스트 매핑
- SL_HEAD 패턴 확장 (실번호$ 추가)
- ESEAL_HEAD 별도 (엠티실 → c.eseal)

---

## 다음 세션 작업 — 4+5단계

### 4단계: PC 마우스 영역 선택
- 베이 탭 "🔲 선택 모드" 토글
- mousedown→mousemove→mouseup 사각형 선택
- 사각형 내 셀 검출 (getBoundingClientRect 비교)
- 시각 하이라이트
- 폰에서는 비활성화 또는 다중 탭 토글

### 5단계: 보관박스 ↔ 셀 DnD
- 보관박스 신설 (DisplacedSidebar 통합 또는 별도)
- 일괄 보관 이동 버튼 (4단계 선택분 → c.in_storage 또는 bay_actual='STORAGE')
- HTML5 draggable=true + ondragstart/dragover/drop
- 드롭 시 fbSetActualPosition 호출
- 폰: long-press → 모달 또는 두 단계 클릭

### 우선순위 (다음 세션)
1. 5번부터 단순 — 보관박스 컨 클릭 → 셀 클릭 → 이동 (DnD 없이)
2. 4번 — PC 영역 선택
3. HTML5 DnD 추가

## 코드 위치

| 파일 | 역할 |
|---|---|
| src/pages/VoyagePage.jsx | containers useMemo (effective 변환) + displaced 검출 |
| src/components/ContainerDetailModal.jsx | 실체 위치 박스 |
| src/components/DisplacedSidebar.jsx | 자리 뺏긴 컨 사이드바 |
| src/components/BayPlan.jsx | 베이그리드 (4+5단계 확장) |
| src/components/PrintableBayDetail.jsx | 베이상세 인쇄 (동적 row/tier) |
| src/components/PrintableCargoPlan.jsx | 카고 플랜 (4행 우측 정렬) |
| src/firebase.js | fbSetActualPosition / fbClearActualPosition |

## 데이터 모델 (선적 모드)

```js
{
  cn: 'CKFU9213883',
  bay: '11',           // effective (변환된 actual 또는 계획)
  row: '11', tier: '11',
  _bay_planned: '01',  // 계획 (effective 변환된 경우만)
  _row_planned: '00', _tier_planned: '02',
  bay_actual: '11',    // firebase 저장 원본
  row_actual: '11', tier_actual: '11',
  actual_at: timestamp, actual_by: '검수원명',
  _position_moved: true,
  _displacedBy: '점유자_컨번호',
}
```

## Firebase 경로

```
voyages/{voyageKey}/loading/records/{cn}
  ├ bay_actual / row_actual / tier_actual
  ├ actual_at / actual_by
  └ (sl, eseal, ... 기타)
```

## 사용자 환경
- 성일, 평택항 검수, TNJP/SWSP 등
- 핸드폰 PWA + PC 둘 다
- 4+5는 PC 환경 검증 필요

## 빌드

```bash
cd /home/claude/m49b_build
bash build.sh
```

## 검증 원칙

1. 빌드 후 grep 핵심 텍스트 확인
2. 시뮬레이션 알고리즘 검증
3. ZIP → GitHub push → PWA 캐시 클리어 → 폰/PC 검증
4. 사용자 도메인 지식 우선 (베이 구조, 선박 BOW/STERN 단독 베이 등)
5. 추측 빌드 금지 — 시뮬 가능한 건 시뮬, 안 되는 건 명시

## 주의 (사용자 누적 피로)

- 큰 변경 한 번에 묶지 말고 단계 분할
- 시뮬 가능 vs 실환경 검증 필요 부분 명확히 분리
- "한 번에 다" 요청해도 검증 어려운 부분은 별도 빌드 권장
