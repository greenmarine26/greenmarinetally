# Tallyman Master M6.86.7 인계지침서

작성: 2026-05-23
이전 버전: M6.86.5/M6.86.6 (회귀로 폐기) → M6.80 베이스로 재시작

---

## 1. 사용자 보고 (M6.86.6 회귀)

> "지금 카고플랜이 전체적인 선박에 영향을 주었습니다. 없던 베이가 생기기도 하고 있어야 베이가 사라지기도 했으면 베이가 있어도 셀이 없는곳도 생기고 또 더 많이 있는곳도 생겼습니다. 이는 앱 어딘가에서 원칙에 위배되는 지점이 있는것 같습니다. 또한 베이사전에도 다 매칭되었는데도 불구하고 틀리다는건 베이사전 마저 오염 되지 않았나 하는 의심이 듭니다."

**→ 사용자 직감 정확. 베이사전 오염 + 코드 변경 둘 다 발견.**

---

## 2. 진단 결과

### 2.1 베이사전 오염 (M6.86.5에서 발생)

`shipBayDict_v2.js` md5 비교:

| 버전 | md5 | 상태 |
|------|-----|------|
| M6.80 | `23f4633cfb0d54a1d4471f93d351cfca` | 정상 |
| M6.86.5 | `fd191e9b0a7fe4f3c516cf8280d0dd3f` | 오염 |
| M6.86.6 | `fd191e9b0a7fe4f3c516cf8280d0dd3f` | 오염 (M6.86.5 그대로) |

**KKLC entry 변경 내역**:
- M6.80: 22개 베이 (`00, 01, 02, 05, 06, 09, 10, 11, 13, 14, 17, 18, 21, 22, 25, 26, 29, 30, 33, 34, 37, 38`), BAY 33-38 hasHold=true
- M6.86.5: 30개 베이 (`01, 02, 03, 05, 06, 07, ..., 37, 38, 39`), BAY 00 제거, BAY 03/07/15/19/23/27/31/35/39 추가, BAY 33-39 hasHold=false
- M6.86.5 메모에 "KKLC2604S PDF 검증판"이라 적혀있지만, 사용자가 평소 보던 양식과 일치 안 함 → 사용자 사전 확인 없이 변경한 점이 문제

`shipBayDict_v5_matrix.js`는 변경 없음 (md5 `e2108ed6...` 동일).

### 2.2 코드 변경 (M6.86.5에서 추가 — 더 큰 영향)

M6.86.5에서 `STD_DECK/STD_HOLD baseline 강제 제거`. 그러나 동일 시점에 `globalRowRange` (페이지 전체 베이 row max union)로 모든 베이 박스를 통일된 폭으로 그리는 로직은 그대로 유지됨.

→ KKLC뿐 아니라 **모든 선박**의 카고플랜 박스가 페이지 max 폭으로 통일됨. 선박마다 다른 hull 모양 (BAY 1=7컬럼, BAY 3=9컬럼, BAY 7+=10컬럼) 무시.

### 2.3 사용자 마스터 플랜 HTML 분석 (정답 양식)

`SITC_SENDAI_2631E_카고플랜.html` (M6.81 Universal Cargo Plan) 분석:

| BAY | maxRow | row labels (deck) | tier |
|-----|--------|------------------|------|
| 01 | 7 | `06,04,02,00 \| 01,03,05` | 92,90,88,86,84,82 (6단) |
| 03 | 9 | `08,06,04,02,00 \| 01,03,05,07` | 동일 |
| (04)05 | 9 | 동일 | 동일 |
| 07~ | 10 | `10,08,06,04,02 \| 01,03,05,07,09` (00 없음) | 동일 |

**규칙 추출**:
- `rowMax 홀수` (BAY 01 maxRow 7, BAY 03 maxRow 9): 짝수쪽이 홀수쪽보다 1 큼 → **has00 = true** (가운데 00 row 포함)
- `rowMax 짝수` (BAY 07 maxRow 10): 짝수쪽=홀수쪽 → **has00 = false** (00 없음, 양옆 분리)
- tier 수는 페이지 통일 (M6.81 양식 — 모든 베이 동일 6단)
- 셀 폭 18px 고정 + 박스 폭 균등 + `justify-content: center` → 작은 베이는 박스 가운데 모임

v5_matrix `cells` 배열도 매핑 가능:
- BAY 01 cells `[1,1,3,7,7,7,7]` → reverse → `[7,7,7,7,3,1,1]` → HTML top-to-bottom `[7,7,7,7,3,1]` (위 좁은 tier는 EDI 빈 데이터로 잘라냄)

---

## 3. M6.86.7 변경 사항

### 3.1 베이스라인
- **M6.80 (md5 23f4633c...)을 베이스로 시작**. 오염된 M6.86.5/M6.86.6 베이사전 + 코드 폐기.
- `m680_check/m6_60_build` → `m6867_build`로 복사 후 작업.

### 3.2 APP_VERSION
- `src/utils.js`: `M6.80 → M6.86.7`

### 3.3 `src/components/PrintableCargoPlan.jsx` BayBox 함수 (라인 287-318)

**변경 전 (M6.80, M6.86.6)**:
```js
const voyDeck = globalRowRange?.deck || { ... boxRange.deck ... };
const voyHold = globalRowRange?.hold || { ... boxRange.hold ... };
```

→ `globalRowRange`는 페이지 전체 베이 union → 모든 박스 동일 폭

**변경 후 (M6.86.7)**:
```js
const dbEven = (even != null) ? dictBaysSummary[parseInt(even, 10)] : null;
const dbOdd  = (odd  != null) ? dictBaysSummary[parseInt(odd, 10)]  : null;
const bayMaxEven = Math.max(dbEven?.rowMaxEvenLocal || 0, dbOdd?.rowMaxEvenLocal || 0);
const bayMaxOdd  = Math.max(dbEven?.rowMaxOddLocal  || 0, dbOdd?.rowMaxOddLocal  || 0);
const bayHas00   = bayMaxEven > bayMaxOdd;
const voyDeck = bayMaxEven > 0 || bayMaxOdd > 0
  ? { maxLeft: bayMaxEven, maxRight: bayMaxOdd, has00: bayHas00 }
  : { maxLeft: boxRange.deck.maxLeft, ... };  // EDI 폴백
```

→ **베이별 dictBaysSummary entry 그대로 사용**. `globalRowRange` 의존성 제거.
→ 페어 박스(짝수+홀수)는 두 dictBay rowMax 중 max 사용.
→ 베이사전에 없으면 EDI `boxRange` 폴백 (기존과 동일).

### 3.4 `src/components/HelpModal.jsx`
- tips 탭 최상단에 M6.86.7 항목 추가 (변경 내역 인앱 표시).

---

## 4. 적용 원칙 (이번 작업과 다음 작업에서 반드시 지킬 것)

### 4.1 베이사전이 진실의 단일 출처
- 선박별 분기, 하드코딩, 강제 baseline 일절 없음
- `dictBaysSummary[bay]`에서 직접 가져옴
- 베이사전에 없으면 EDI 폴백 (정직한 fallback)

### 4.2 베이사전 변경은 사용자 사전 확인 후
- M6.86.5 KKLC entry 변경이 사용자 사전 확인 없이 진행됨 → 본 회귀의 직접 원인
- 베이사전 (shipBayDict_v2.js, shipBayDict_v5_matrix.js) 어떤 entry든 변경 시 사용자에게 먼저 보고
- 변경 후 md5 hash 기록 (HANDOFF.md에 명시)

### 4.3 통일 기제 도입 금지
- `globalRowRange` (페이지 통일), `STD_DECK/STD_HOLD baseline`, `pageBayDictTiers` 같은 통일 기제는 선박마다 다른 hull 모양을 무시함
- 페어 박스 점선 정렬을 위해 유혹 강하지만, 그 대가는 다른 모든 선박의 베이 구조 깨짐
- 정렬은 셀 폭/박스 폭/CSS justify로 해결 (데이터 통일 X)

### 4.4 편법 패치 금지
- 한 선박 맞추려고 분기/특수 처리 넣으면 다른 선박이 깨짐 (순환 반복)
- 항상 일반 알고리즘 — 데이터(베이사전)가 정확하면 모든 선박 자동 처리

---

## 5. 한계 / 다음 작업 후보 (Stage 2~)

### 5.1 v5_matrix.cells 배열 미통합 (Stage 2)
- STSE 같은 v2에 없고 v5_matrix만 있는 선박은 현재 EDI 폴백
- v5_matrix `matrixBays[i].cells` 배열을 tier별 row 수로 사용하면 정확한 hull 모양 그릴 수 있음
- `dictBaysSummary` 생성 시 v5_matrix entry도 같이 lookup 필요

### 5.2 양하/통과 카고플랜 마크 약속 적용 (Stage 3)
- M6.86.6에서 정정한 약속 (PTK=컬러, 통과=흑백, X=shadow전용)을 M6.80 베이스에 다시 적용
- `getMark` `renderCell` 함수 수정 필요
- 현재 M6.86.7은 M6.80 마크 약속 그대로 (사용자가 이전에 보던 양식)

### 5.3 페이지 통일 tier 수 (Stage 4)
- M6.81 마스터 플랜은 모든 베이 동일 tier 수 (페이지 통일)
- 현재 M6.86.7은 베이별 tier 그대로 (M6.80 동작)
- 페이지 통일 tier 도입 시 베이별 데이터 잃지 않는 방식 필요

---

## 6. 검증 권장 사항

배포 후 즉시 확인:
1. **KKLC**: BAY 00 다시 나타나는지 (M6.80 22 베이 양식)
2. **다른 선박들** (DJCF, KKLC, NBTD 등): 박스 폭이 베이별로 다르게 그려지는지 (M6.86.6은 전부 통일 폭이었음)
3. **PCBJ**: M6.62 정정 사항(빈 entry 처리)이 그대로 유지되는지 (M6.80에 포함됨)
4. 카고플랜 출력 시 다른 선박 영향 없는지

문제 시:
- 다시 M6.80으로 즉시 롤백 가능 (이번 변경은 PrintableCargoPlan.jsx 한 파일만)

---

## 7. 파일 변경 요약

| 파일 | 변경 |
|------|------|
| `src/utils.js` | `APP_VERSION = 'M6.86.7'` |
| `src/components/PrintableCargoPlan.jsx` | BayBox 함수 voyDeck/voyHold 계산 로직 (라인 287-318) |
| `src/components/HelpModal.jsx` | tips 탭 최상단 M6.86.7 항목 추가 |
| `HANDOFF.md` | 본 지침서 (신규) |

베이사전 파일은 **건드리지 않음** (M6.80 그대로):
- `src/data/shipBayDict_v2.js` (md5 `23f4633c...`)
- `src/data/shipBayDict_v5_matrix.js` (md5 `e2108ed6...`)
- 기타 사전 파일 동일

---

## 8. ZIP 패키징 구조 (사용자 평소 양식)

```
Tallyman_Master_M6867.zip
├── index.html                  ← 루트 빌드본 (GitHub Pages 직접 서빙)
├── assets/                     ← 빌드본 JS/CSS
├── sw.js, manifest.webmanifest ← PWA 파일
├── src/                        ← 소스 코드
├── package.json, vite.config.js ← 빌드 설정
├── dist/                       ← 빌드 출력
└── HANDOFF.md                  ← 본 지침서
```

사용자가 ZIP 풀어서 GitHub 저장소 루트에 push → GitHub Pages가 즉시 index.html 서빙.
