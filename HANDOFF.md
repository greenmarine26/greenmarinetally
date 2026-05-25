# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.14 ("베이 구조 먼저, EDI는 그 위에" — 사용자 통찰 반영)
**GitHub**: greenmarine26/greenmarinetally

---

## 🚨 M6.93.14 (2026-05-25) — 사용자 통찰 핵심 반영

### 사용자 통찰
> "edi에서 베이 구조를 같이 가져오다 보니 셀구조가 틀려지지 않았나 싶습니다. 베이 구조 먼저 완성하고 그 위에 edi 데이터를 올리면 되지 않을까요."

### 원칙
**EDI는 컨테이너 적재 위치만, 베이 구조 (deckTiers/holdTiers/cells = hull 단면)는 베이사전 또는 사용자가 결정.**

### 3가지 진짜 원인
1. **`bayDef.deckTiers` 빈 배열** → PrintableCargoPlanV2 `deckTiersAll=[]` → nDeck=0 → **데크 영역 안 그려짐 → 데크 컨테이너 안 보임**
2. **`augmentMatrixFromBayDict`가 cells 덮어쓰기** → 사용자 [1,1,3,5]가 [rowCount, rowCount, ...] = [5,5,5,5]로 변질 → 5×4=20 표시
3. **`buildMatrixFromEdi`가 cells 추정** → 부정확한 데이터가 시작점

### 5가지 수정

**1. `shipMatrixBuilder.js matrixToBayDictEntry`** — bayDef.deckTiers/holdTiers union 저장
```js
const allDeck = new Set();
baysSummary.forEach(b => (b.deckTiers || []).forEach(t => allDeck.add(Number(t))));
bayDef.deckTiers = [...allDeck].sort((a,b)=>b-a);  // 선박 전체 union
```

**2. `shipMatrixBuilder.js buildMatrixFromEdi`** — EDI는 적재 위치만
```js
// 기존: cells = deckTiers.map(() => rowCount)  // 부정확 추정
// 변경: cells = [], deckTiers = [], holdTiers = []  // 베이사전이 채움
```

**3. `shipMatrixBuilder.js augmentMatrixFromBayDict`** — 기존 cells 보존
```js
// 기존: entry.deckCells = deckTiers.map(()=>rowCount)  // 전체 덮어씀
// 변경: 기존 cells 보존, 새 tier에만 rowCount fallback
```

**4. `components/PrintableCargoPlanV2.jsx`** — EDI 추정 차단 + deckTiersAll fallback
```js
// 기존: enrichBayDef(bayDef, v5Matrix, containers)  // EDI로 베이 구조 추정
// 변경: enrichBayDef(bayDef, v5Matrix, null)        // 추정 차단

// deckTiersAll 빈 배열이면 baysSummary union으로 복원
```

**5. `cargoPlanCore.js`** — userBay > override > 분리 cells > raw cells (M6.93.13에서 완료)

### 시뮬레이션 검증 (PASS)
```
DXQD BAY 01 사용자 입력: holdCells=[1,1,3,5], deckCells=[5,5,5,5], rowCount=5
저장 → bayDef.deckTiers=[88,86,84,82] (union 저장) ✅
카고플랜 → deckCells=[5,5,5,5] (5×4=20), holdCells=[1,1,3,5] (피라미드) ✅
deckTiersAll = [88,86,84,82] (빈 배열 아님) → 데크 영역 정상 그려짐 ✅
```

### M6.93.x 시리즈 회고
| 버전 | 원인 식별 | 결과 |
|------|----------|------|
| M6.93.12 | lookupUserBayDict 매칭 | 부분 fix (v2-verified-newer 우회) |
| M6.93.13 | user dict 최우선 | 부분 fix (cells 덮어쓰기 발견 못함) |
| M6.93.14 | **사용자 통찰 반영** | **진짜 원인 — 흐름 자체 수정** |

### 사용자 검증 절차
1. ZIP 적용 후 브라우저 강력 새로고침 (Ctrl+Shift+R)
2. 매트릭스 빌더에서 BAY 01 다시 입력 (holdCells [1,1,3,5] 등)
3. 저장 버튼 누르기
4. 카고플랜에서 데크 영역 + 사용자 cells 정확 표시 확인

---

## 미해결 작업
1. **M6.93.14 화면 검증** (DXQD 카고플랜 정상 표시)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 붙여넣기
2. M6.93.14 화면 검증 결과 보고
