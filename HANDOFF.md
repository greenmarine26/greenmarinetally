# Tallyman Master M6.93.13 — 데크 ROW + 홀드 표시 + 폰트 잘림 hotfix

**날짜**: 2026-05-26
**버전**: M6.93.13 (M6.93.12에서 hotfix)

## 사용자 보고 버그 (M6.93.12에서 발견)

1. 데크에서 **ROW 8이 안 보임** (tier 88/86/84/82 의 row 08 컨테이너 표시 안 됨)
2. **홀드 4단(tier 04) 컨테이너 안 보임**
3. 셀 안의 **F/E 표시 폰트가 커서 조금 잘림**

## 핵심 변경 (총 4개 fix)

| # | 파일 | 수정 |
|---|------|-----|
| 1 | `cargoPlanCore.js` | `getRowPositions` 짝수 cellCount + hasZero=true에서 max row 누락 버그 (비대칭 처리) |
| 2 | `cargoPlanCore.js` | **mark 있는 row idx 강제 active** — cells가 EDI 컨테이너 위치 못 덮어도 표시 |
| 3 | `PrintableCargoPlanV2.jsx` | 셀 폰트 `clamp(5,0.7vw,10px)` → `clamp(4,0.6vw,8px)`, line-height 1 → 1.1 |
| 4 | `cargoPlanCore.js` | **rowMax 계산에 EDI 컨테이너 row max 반영** — cells에 없는 큰 row도 라벨 보존 |

## fix #1 — getRowPositions 비대칭

### 이전 버그
- cellCount=8, hasZero=true → half=floor(7/2)=3
- evens=[06,04,02], odds=[01,03,05]
- 결과: [06,04,02, 00, 01,03,05] = 7개 (8개 아님, max 08 누락!)

### 수정
- 짝수 cellCount + hasZero=true: nEvens 1개 더 많게 비대칭
- cellCount=8 → nEvens=4, nOdds=3 → [08,06,04,02, 00, 01,03,05] = 8개, max 08 보존
- cellCount=10/12 등 큰 짝수도 동일 원리

## fix #2 — mark 있는 row idx 강제 active

### 시나리오
- HOLD tier 04, cc=4 (사용자 입력)
- EDI에는 tier 4 row 00/01/02/03 컨테이너 존재
- getActiveColsSymmetric(4, 8) → 가운데 4칸만 active (idx 2-5)
- holdRowPos = [08,06,04,02, 00,01,03 ,05]
- idx 6의 row 03은 active 밖 → row 03 컨테이너 안 그려짐

### 수정
mark 있는 row의 idx를 active set에 강제 추가.

### 영향
- HOLD 4단 컨테이너 안 보임 버그 해결
- 부작용: hull 단면이 cells값과 약간 다를 수 있음 (양보 가능)
- 정상 케이스에서는 mark가 이미 active 안에 있어 영향 0개 (회귀 없음)

## fix #3 — 셀 폰트 잘림

이전: font-size clamp(5px, 0.7vw, 10px), line-height 1
수정: font-size clamp(4px, 0.6vw, 8px), line-height 1.1

- max 10px → 8px (잘림 없음)
- line-height 1 → 1.1 (세로 여유)
- ★ X-ray 마크 겹침 완화

## fix #4 — rowMax에 EDI row max 반영

사용자 데이터 절대 보호: EDI에 컨테이너가 있으면 그 row는 반드시 라벨에 포함되어야 함.
deckRowMax = max(baseDeckMax, ediDeckRowMax)
holdRowMax = max(baseHoldMax, ediHoldRowMax)

## 절대 원칙 (메모리)

코드 수정 시:
1. 코드 작성 → 2. 실제 데이터 시뮬레이션 → 3. PASS 확인 → 4. 빌드 → 5. ZIP

빌드 성공만으로 ZIP 금지.

## 시뮬레이션 검증 결과

- 검증 1: getRowPositions 8개 케이스 ALL PASS
- 검증 2: 사용자 보고 시나리오 13/13 컨테이너 모두 표시
- 검증 3: cellsMax<ediMax 케이스 PASS
- 검증 4: 회귀 방지 — 정상 케이스 fix #2 영향 0개

## 이전 M6.93.12의 8개 fix 모두 계승

## 다음 우선순위 (사용자 메모리)

1. 앱에 신규 선박 입력 메뉴 + PDF 자동 파싱 구현 (사용자 핵심 목표)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환

## 검수앱지침서 업데이트 항목

지침서에 추가 권장:

§ getRowPositions 비대칭 규칙
- 짝수 cellCount + hasZero=true 시 evens가 odds보다 1개 많아야 max row 보존
- 검증: getRowPositions(8, true).length === 8 (이전 버전은 7 반환)

§ active cell 결정 규칙 (mark 우선)
- cells값으로 hull 단면을 그리되, mark 있는 row가 active 밖이면 강제 추가
- 원칙: "사용자 데이터(EDI) > 매트릭스 빌더 cells(미관/단면)"

§ rowMax 결정 5단계
1. shipBayDef.rowMaxEven/Odd
2. baysSummary cells max 자동 추론 (M6.93.12 fix #9)
3. userRowCount
4. override.rowCount
5. EDI 컨테이너의 실제 row max (M6.93.13 fix #4)

§ CSS 셀 폰트 가이드
- 폰트 max 8px (이전 10px → 잘림)
- line-height 1.1
