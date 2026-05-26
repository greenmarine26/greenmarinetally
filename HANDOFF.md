# Tallyman Master M6.93.13 — 카고플랜 V2 가독성 개선 (보기 좋게)

**날짜**: 2026-05-26
**버전**: M6.93.13 (CSS만 변경, 데이터 로직 무관)
**기반**: M6.93.12 fix #1~11 모두 그대로 유지

## 사용자 요청

> "업데이트 후에 카고플랜 베이가 줄어들었음 (베이 박스 자체가 좁아짐).
> 원인 파악 말고 보기 좋게 만들어 주세요. (DXQD2621E PDF 같은 양식으로)"

## 변경 사항 (CSS만, 8개)

| # | 셀렉터 | 이전 (M6.93.12) | 이후 (M6.93.13) |
|---|--------|-----------------|-----------------|
| 1 | `.cpv2-tier-row .cpv2-cell` font-size | `clamp(4px, 0.55vw, 8px)` | `clamp(7px, 0.9vw, 12px)` |
| 2 | `.cpv2-cell.cpv2-xray::after` font-size | `clamp(4px, 0.6vw, 7px)` | `clamp(6px, 0.8vw, 10px)` |
| 3 | `.cpv2-bay-title-row` font-size | `clamp(8px, 0.7vw, 11px)` | `clamp(10px, 0.85vw, 13px)` |
| 4 | `.cpv2-bay-count` font-size | `clamp(6px, 0.5vw, 8px)` | `clamp(8px, 0.65vw, 10px)` |
| 5 | `.cpv2-row-labels` font-size | `clamp(5px, 0.6vw, 8px)` | `clamp(7px, 0.75vw, 10px)` |
| 6 | `.cpv2-tier-labels` font-size, width | `7px`, `14px` | `9px`, `16px` |
| 7 | `.cpv2-bay-box` min-width | `0` | `130px` (화면) / `0` (인쇄) |
| 8 | `.cpv2-page` min-width | (없음) | `1200px` (화면) / `0` (인쇄) |

## 동작 원리

### 화면 모드
- 페이지 폭이 1200px 이상 보장 (좁은 화면이면 가로 스크롤)
- 베이 박스가 130px 미만으로 안 좁아짐
- 한 줄에 박스가 많아도 베이가 작아지지 않고 페이지가 옆으로 늘어남
- 폰트가 더 커서 셀 안 내용, BAY 제목, row/tier 라벨 모두 잘 보임

### 인쇄 모드 (`@media print`)
- `.cpv2-page` min-width: 0 → 277mm × 195mm 페이지 안에 정확히 들어감
- `.cpv2-bay-box` min-width: 0 → flex로 균등 분할
- 인쇄 결과는 M6.93.12와 동일

## 변경 안 한 것 (M6.93.12 유지)

| 영역 | 상태 |
|------|------|
| userBayDict 보호 (fix #1~5) | 그대로 |
| baysSummary 우선 (fix #6) | 그대로 |
| STANDARD_DECK 7tier (fix #7) | 그대로 |
| EDI tier union (fix #10) | 그대로 |
| Hold nDeckCols 폭, 좌우 대칭 (fix #11) | 그대로 |
| autoPairBays, autoPageLayout, computeBayRenderData | 그대로 |

**즉 데이터/매트릭스/매핑 로직 100% 무관, CSS만 시각 개선.**

## 현장 검증 절차

1. ZIP 받아 GitHub repo 루트 덮어쓰기 → commit & push
2. DXQD2621E 카고플랜 V2 렌더 → 화면에서 베이 박스가 충분히 크게 보이는지
3. 화면이 좁으면 가로 스크롤로 베이 보이는지
4. 셀 안 'o' / 'X' / 'R' 등 마크가 잘 보이는지
5. BAY 제목과 카운트(20/40/45)가 잘 읽히는지
6. 인쇄 (또는 PDF 저장) → 1페이지 277mm × 195mm에 모두 들어가는지
7. CASPI PDF와 데이터/배치 일치하는지 (M6.93.12 fix 그대로라 변화 없어야 함)

## 만약 검증 실패 시 조정

- 화면 너무 좁아 베이 안 들어감 → `.cpv2-page` min-width 1200 → 1100/1000으로 줄이기
- 베이 130px도 좁아 보임 → `.cpv2-bay-box` min-width 130 → 150/170px로 키우기
- 폰트 너무 커서 셀 잘림 → clamp 상한값(12px) 줄이기
- 인쇄에서 베이가 페이지 넘침 → `@media print` 강제 unset 확인 (이미 적용됨)

## 옛 ZIP 처리

- `Tallyman_Master_M6_93_12__3_.zip` (사용자가 보낸 원본) → 보존, 비교용
- M6.93.13 ZIP이 새 표준
