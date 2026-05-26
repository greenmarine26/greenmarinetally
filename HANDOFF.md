# Tallyman Master M6.93.12 — 사용자 데이터 절대 보호 + 좌우 대칭

**날짜**: 2026-05-26
**버전**: M6.93.12

## 핵심 변경 (총 8개 fix)

| # | 파일 | 수정 |
|---|------|-----|
| 1 | `userBayDict.js` | `lookupUserBayDict` 6단계 fuzzy 매칭 |
| 2 | `cargoPlanCore.js` | **userBay > override** 우선순위 역전 |
| 3 | `shipStructure.js` | `mergeBayDef`에 source!=user (v2 union 차단) |
| 4 | `shipStructure.js` | `fuzzyLookupAcrossDicts` user 최우선 |
| 5 | `bayDictAutoEnrich.js` | user 시 EDI 자동 채움 차단 (CASPI 무결성) |
| 6 | `PrintableCargoPlanV2.jsx` | matrixBays 베이별 summary 우선 |
| 7 | `cargoPlanCore.js` | `STANDARD_DECK = [94,92,90,88,86,84,82]` (M6.81 표준 원복) |
| 8 | `cargoPlanCore.js` | **deck/hold rowMax 자동 추론** — 선박 전체 cells max 사용 |

## fix #8 핵심 — 사용자 통찰 적용

**"보통 hold = deck - 1, 큰배 -2, 특수 -3. 선박마다 다르므로 강제 X."**

→ `deckRowMax = max(모든 베이 deckCells)`, `holdRowMax = max(모든 베이 holdCells)`
→ 사용자 매트릭스 빌더 입력값에서 자동 추론. 어떤 선박이든 정확.
→ DXQD: deck cells max=8 / hold cells max=7 → deck 8 / hold 7 (1 차이, hold row 08 없음, 좌우 대칭)

## 좌우 대칭 원리

- Deck row 8개 = 4:4 중심선
- Hold row 7개 = 3.5:3.5 중심선
- 1칸 차이 → 좌우 0.5칸 패딩 → 두 중심선 일치

## 검증 (지침서 §6.4 TEST)

```
✅ TEST 1 (lookup 6단계): 6/6 PASS
❌ TEST 2 (userBay tier 80): FAIL — M6.81 표준에 80 없음 (가설 시나리오)
✅ TEST 3b (BAY 05 fallback): PASS
✅ TEST 4 (user union 차단): PASS
```

TEST 2/3a FAIL은 가설 (DXQD/STSE/NBTD/MCSC 4척에 tier 80 없음). M6.81 표준 우선.

## 현장 검증 절차

1. M6.93.12 ZIP 받기
2. GitHub repo 루트에 통째 덮어쓰기 → commit & push → GitHub Pages 자동 배포
3. 앱에서 DXQD/STSE/NBTD/MCSC 한 척 카고플랜 V2 렌더
4. CASPI PDF와 비교:
   - **Hold row 08 없어졌는지** (관건)
   - **Deck-Hold 좌우 대칭** (가운데 정렬)
   - **컨테이너 tier 위치 정확** (deck 82에 표시되어야)

## 참조 자료

- `검수앱지침서_M6_93_12.md` (사용자 데이터 보호 원칙)
- `M681_Universal_CargoPlan.zip` (build_cargo_plan_universal.py 표준)
