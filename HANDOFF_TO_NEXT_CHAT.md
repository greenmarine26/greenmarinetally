# M5.42 — 베이별 tier/row 로컬 오버라이드 + DJCF·XTPG 정정

## 배경
M5.40에서 PrintableCargoPlan과 PrintableBayDetail이 dictShipMeta(선박 전역 deckTiers/holdTiers/rowMaxEven/rowMaxOdd)를 절대 우선시키도록 통일했음. 하지만 한 선박 안에서도 선수·선미 베이는 hull이 좁아지면서 tier/row 폭이 다른 경우가 있어 phantom 슬롯이 출력되었음.

사용자 보고: DJCF (DONGJIN CONFIDENT) STOWAGE INSTRUCTION과 XTPG (XIN TAI PING) CARGO DISCHARGING PLAN PDF 두 장을 보고 비교한 결과:
- **XTPG holdTiers**: 사전 [8,6,4,2] (4단) ≠ 실제 [6,4,2] (3단) — tier 8 phantom 슬롯
- **DJCF2 rowMaxOdd**: 사전 11 ≠ 실제 9 (M5.35 파싱 오류 — 20ft가 40ft보다 넓을 수 없음)
- **BAY 38**: 선미 standalone, deck tier 82 없음 (실제는 [90,88,86,84])
- **BAY 01 (양 선박)**: 선수 좁음, 행/단 모두 일반 베이보다 작음
- **XTPG BAY 21 / BAY 25**: 각각만 tier 90 / tier 80 보유 (다른 베이에는 없음)

## M5.42 변경

### 신규 스키마 (baysSummary 엔트리)
각 베이에 선택 필드 4개 추가:
```js
{
  bayNo: "01", section: 1, hasHold: true, hasDeck: true, isStandalone: false,
  // M5.42 (모두 optional):
  rowMaxEvenLocal: 6,                  // 이 베이의 좌현 행 최대 (선박 전역 무시하고 우선)
  rowMaxOddLocal: 5,                   // 이 베이의 우현 행 최대
  deckTiersLocal: [88,86,84,82],       // 이 베이의 deck 단 (선박 전역 무시하고 우선)
  holdTiersLocal: [10,8,6],            // 이 베이의 hold 단
}
```

### 우선순위 (PrintableCargoPlan + PrintableBayDetail 통일)
1. **dictBay.{필드}Local** (베이별 PDF 검증값)
2. **dictShipMeta.{필드}** (선박 전역 PDF 검증)
3. **globalRowRange / globalTiers** (EDI fallback)
4. fallback 배열

### DJCF2 (DONGJIN CONFIDENT) 적용값
| Bay | rowMaxEvenLocal/OddLocal | deckTiersLocal | holdTiersLocal | 비고 |
|---|---|---|---|---|
| 01 | 6/5 | [88,86,84,82] | [10,8,6] | 선수 |
| 02, 03 | 4/3 | [88,86,84,82] | — | 선수 (40ft) |
| 05~19 | 8/7 | — | — | 전방 일반 |
| 21~35 | — (전역 10/9 사용) | — | — | 후방 일반 |
| 38 | — | [90,88,86,84] | — | standalone, 82 제외 |

전역 rowMaxOdd: 11 → 9 정정.

### XTPG (XIN TAI PING) 적용값
| Bay | rowMaxEvenLocal/OddLocal | deckTiersLocal | 비고 |
|---|---|---|---|
| 01 | 4/3 | [86,84,82] | 선수 최협 |
| 03 | 6/5 | [86,84,82] | 선수 |
| 04, 05 | 4/3 | [86,84,82] | 선수 |
| 07~19, 22~23, 26~27 | — (전역 8/7) | — | 일반 |
| 21 | — | [90,88,86,84,82] | 유일하게 tier 90 보유 |
| 25 | — | [88,86,84,82,80] | 유일하게 tier 80 보유 |

전역 holdTiers: [8,6,4,2] → [6,4,2] 정정.

## 컴포넌트 변경 위치
- `src/components/PrintableCargoPlan.jsx` BayBox 함수 내 `dynRows`, `deckTiers`, `holdTiers` 계산 로직에 dictBay 우선순위 추가
- `src/components/PrintableBayDetail.jsx` BayDetailPage 함수 내 `STD_ROWS`, `deckTiers`, `holdTiers` 계산 로직에 dictBay 우선순위 추가
- `src/data/shipBayDict_v2.js` DJCF2(37개), XTPG(14개) 로컬 필드 추가, 전역 오류 2건 정정

## 검증
- ✅ npm build 성공 (1650 modules transformed)
- ✅ 산출물 검증: M5.42 마커 2회, deckTiersLocal/rowMaxEvenLocal/holdTiersLocal 각 4회 (스키마 정의 + 사용처 2곳씩)
- ✅ DJCF2 rowMaxOdd:9 / XTPG holdTiers:[6,4,2] 번들 반영
- ⚠️ **실선박 데이터로 베이 화면 출력 검증 필요** (현장 검수 전 필수)

## 미해결 / 다음 작업
- **M5.43 후보**: deck/hold 행 폭이 서로 다른 베이(XTPG BAY 13의 deck 8/7 vs hold 6/5 등) 정확 표시. 현재는 단일 rowMaxLocal로 처리되어 hold 외곽 셀이 phantom으로 보일 수 있음. 해결책: `holdRowMaxEvenLocal` / `holdRowMaxOddLocal` 별도 필드 추가 + 컴포넌트의 deck/hold 그리드 분리 렌더링.
- 나머지 ~298개 선박도 PDF로 검증 시 동일한 per-bay override 패턴 적용 필요.

## 누적 변경 이력
- M5.42: 베이별 tier/row 로컬 오버라이드 + DJCF·XTPG 정정 ← **현재**
- M5.41: (스킵 — M5.42에 통합)
- M5.40: 베이 상세에도 dictShipMeta 적용 (PrintableBayDetail fix)
- M5.39: 베이사전 명시 필드 추가 + PrintableCargoPlan 적용
- M5.38: row/tier 동적 + EDI fallback
- M5.37: 페이지 고정 + flex 자동 분배
- M5.36: 페이지 여백 최소화
- M5.35: 36척 베이사전 PDF 정정

## 다음 챗에 전달할 핵심 규칙
1. 베이사전 = 절대 기준. dictBay (per-bay) > dictShipMeta (per-ship) > EDI fallback.
2. PrintableCargoPlan과 PrintableBayDetail 두 곳 다 베이사전 우선 적용 필수. 한쪽만 수정 X.
3. **새 선박 추가 / 기존 선박 정정 시**: 같은 선박 안에서도 베이별로 폭/단이 다른지 PDF 확인. 다르면 baysSummary의 해당 베이에 Local 필드 추가.
4. 빌드는 반드시 `bash build.sh` 사용 (`npm run build`만 하면 root index.html이 진입점 형태로 복원되지 않아 변경사항이 반영 안 됨 — build.sh 주석 참조).
