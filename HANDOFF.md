# Tallyman Master M6.93.12 — 사용자 데이터 보호 + 좌우 대칭 + 컨테이너 누락 방지

**날짜**: 2026-05-26
**버전**: M6.93.12 (fix #1~11 + 폰트 축소)

## 핵심 변경 11개 fix

| # | 파일 | 수정 |
|---|------|-----|
| 1 | `userBayDict.js` | `lookupUserBayDict` 6단계 fuzzy 매칭 |
| 2 | `cargoPlanCore.js` | userBay > override 우선순위 역전 |
| 3 | `shipStructure.js` | `mergeBayDef`에 source!=user (v2 union 차단) |
| 4 | `shipStructure.js` | `fuzzyLookupAcrossDicts` user 최우선 |
| 5 | `bayDictAutoEnrich.js` | user 시 EDI 자동 채움 차단 (CASPI 무결성) |
| 6 | `PrintableCargoPlanV2.jsx` | matrixBays 베이별 summary 우선 |
| 7 | `cargoPlanCore.js` | `STANDARD_DECK` 원복 [94,92,90,88,86,84,82] (M6.81 표준) |
| 8 | `cargoPlanCore.js` | deck/hold rowMax 자동 추론 (선박마다 cells max) |
| 9 | `cargoPlanCore.js` | (롤백) — 강제 -1 잘못 |
| 10 | `cargoPlanCore.js` | **EDI tier 자동 union** — hold 4단 컨테이너 누락 방지 |
| 11 | `cargoPlanCore.js` + `PrintableCargoPlanV2.jsx` | **hold cells nDeckCols 폭** (좌우 대칭) |
| 추가 | CSS | 셀 폰트 한 단계 작게 `clamp(4px, 0.55vw, 8px)` |

## fix #10 — 컨테이너 누락 방지 (사용자 통찰)

**원인**: shipMatrixBuilder.analyzeMatrix 라인 232-233이 EDI tier 분포로 holdTiers 자동 분류. EDI에 tier 08 없던 베이는 [6,4,2] 3단 저장 → 새 컨테이너가 tier 08에 들어와도 invisible.

**해결**: cargoPlanCore가 baysSummary.holdTiers + 현재 EDI hold tier 자동 union. 사용자 입력 우선 + EDI 실데이터 누락 방지.

## fix #11 — 좌우 대칭 (사용자 통찰: 0.5 시프트)

**원인**: hold cells가 nHoldCols 폭(7)으로만 그려져 deck 폭(8)보다 좁아 한쪽 쏠림.

**해결**:
- cargoPlanCore: hold cells를 nDeckCols 폭으로 그림. offset = floor((nDeckCols - nHoldCols)/2)로 가운데 정렬. 양옆 invisible cell.
- PrintableCargoPlanV2: hold grid wrap width 100% (cells가 deck 폭). margin auto 제거.
- hold row 라벨: paddingLeft/Right로 cells offset 위치와 정렬.

**원리** (사용자 설명): "데크 8 / 홀드 7. 8-7=1. 1/2=0.5. 좌우 끝에서 0.5씩 떨어트리면 가운데 정렬. 데크 4:4 중심선 = 홀드 3.5:3.5 중심선."

## 폰트 축소

`.cpv2-tier-row .cpv2-cell` font-size: `clamp(5px, 0.7vw, 10px)` → `clamp(4px, 0.55vw, 8px)`. 셀 안 표시 문자 잘림 방지.

## 현장 검증 절차

1. ZIP 받아 GitHub repo 루트 덮어쓰기 → commit & push
2. DXQD/STSE/NBTD/MCSC 4척 중 한 척 카고플랜 V2 렌더
3. 검증 포인트:
   - **Hold tier 08에 컨테이너 표시되는지** (fix #10)
   - **Hold가 deck 가운데 정렬되어 좌우 대칭인지** (fix #11)
   - **셀 안 문자 잘림 없는지** (폰트 축소)
   - **CASPI PDF와 100% 일치**

## 참조 자료

- `M681_Universal_CargoPlan/build_cargo_plan_universal.py` (M6.81 표준)
- `검수앱지침서_M6_93_12.md` (사용자 데이터 보호 원칙)

## 옛 LOCK 폐기

`/home/claude/work/M6_93_11_base/v2work/` (LOCK1~9 누적, 잘못된 fix) → 폐기
