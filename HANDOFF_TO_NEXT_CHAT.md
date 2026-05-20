# Tallyman Master 핸드오프 — M6.56

## 📌 현재 상태 (2026-05-20)

- **최신 버전**: **M6.56** (PCBJ 박스 크기/점선 일치 — baysSummary 비어있을 때 fallback)
- **이전 버전**: M6.55 (.def 매트릭스 디코드 + v5 통합)
- **작업 디렉토리**: `/home/claude/app/m6_56_build/`

---

## 🎯 M6.56 변경 요약

PCBJ 양하 카고플랜에서 BAY 15/23(hold만), BAY 01/03/34(deck만) 박스가 다른 박스보다 작고 점선 위치가 안 맞는 문제 해결. v2 미수정.

---

## 🔍 근본 원인 (실데이터 기반 진단)

**M6.54 점선 통일이 PCBJ에서 작동 안 한 이유:**

```js
// PrintableCargoPlan.jsx line 244 (M6.54)
Object.values(dictBaysSummary).forEach(db => {
  (db.deckTiersLocal || db.deckTiers || []).forEach(...);
  (db.holdTiersLocal || db.holdTiers || []).forEach(...);
});
```

v2 PCBJ의 baysSummary 각 베이 entry:
```json
{"bayNo": "01", "section": 1, "hasHold": true, "hasDeck": true, "isStandalone": false}
```

→ `deckTiersLocal`, `deckTiers`, `holdTiersLocal`, `holdTiers` 모두 **베이 entry에 없음**  
→ `pageBayDictTiers.deck/hold = empty set`  
→ `hasDictTiers = false`  
→ 박스별 실제 컨테이너 tier만 그림 → 박스 크기 불일치

**그러나 v2 PCBJ entry 자체에는** (사전 level):
```json
"deckTiers": [92, 90, 88, 86, 84, 82, 80],
"holdTiers": [8, 6, 4, 2]
```
이 정보를 fallback으로 사용하면 해결됨.

---

## ✅ M6.56 수정 (한 곳)

**`src/components/PrintableCargoPlan.jsx`** — pageBayDictTiers useMemo에 2차 fallback 추가:

```js
// 1차: baysSummary 각 entry의 tier 필드 (M6.54 그대로)
Object.values(dictBaysSummary).forEach(db => {
  (db.deckTiersLocal || db.deckTiers || []).forEach(...);
  (db.holdTiersLocal || db.holdTiers || []).forEach(...);
});
// M6.56 2차 fallback: 베이별 tier 비어있으면 사전 level 전체
if (deck.size === 0 && hold.size === 0 && dictShipMeta) {
  (dictShipMeta.deckTiers || []).forEach(t => deck.add(...));
  (dictShipMeta.holdTiers || []).forEach(t => hold.add(...));
}
```

회귀 영향 없음 — 1차가 채워지면 2차 fallback 발동 안 함.

---

## ✅ 시뮬레이션 검증 (PCBJ)

| 단계 | deck set | hold set |
|---|---|---|
| 1차 (M6.54) | `[]` | `[]` |
| **2차 (M6.56 fallback)** | `[80,82,84,86,88,90,92]` | `[02,04,06,08]` |

**결과:** 모든 박스가 deck 7 tier + hold 4 tier 자리 확보 → tier-hidden으로 자리 통일 → 점선 위치 모든 박스 정렬

---

## 📁 변경 파일 (M6.56)

- **`src/components/PrintableCargoPlan.jsx`** — pageBayDictTiers fallback (11줄 추가)
- **`src/utils.js`** — APP_VERSION M6.55 → M6.56
- **`src/components/HelpModal.jsx`** — M6.56 항목 추가

### 절대 건들지 않음
- `src/data/shipBayDict_v2.js` (M6.14 + M6.55 보호)
- `src/data/shipBayDict_v5_supplement.js`, `shipBayDict_v5_matrix.js` (M6.55 신규)
- 다른 출력 컴포넌트 (PrintableBayDetail/BayPlan/PrintHubModal)

---

## ⚠ v5 매트릭스는 왜 안 썼는가? (사용자 의도 vs 실제 효과)

사용자 요청은 "v5 매트릭스를 카고플랜에 활용". 그런데:

1. **row 폭에 v5 cells_per_row 적용 보류** — M6.49 사용자 명시 원칙 "박스마다 row 폭 다르면 전보다 나빠짐"과 충돌. globalRowRange(EDI 기반 통일) 유지.

2. **deck/hold 분리에 v5 hasHold 활용 보류** — PCBJ는 6.10 포맷이라 v5 매트릭스의 hasHold가 모두 false (Phase 7 6.10 hold 검출 미완). 즉 v5 매트릭스가 deck/hold 분리에 도움 안 됨.

3. **실제로 도움이 된 것:** dictShipMeta(v2 사전 level deckTiers/holdTiers) fallback. 이미 v2가 가진 데이터를 활용 — v5 매트릭스 직접 활용은 아니지만 결과적으로 PCBJ 문제 해결.

→ v5 매트릭스 활용은 **다음 세션 6.10 hold 검출 알고리즘 완성 후 본격 진행** 권장.

---

## 🚦 다음 세션 권장 작업

### 1. ⚠ 6.10 포맷 hold 분리 검출 (181척 영향, M6.55 미해결)
- 현재 zero gap 알고리즘이 6.10에 안 통함
- 해결 시 v5 _v5Matrix.matrixBays[].hasHold가 정확해짐
- 그 후 PrintableCargoPlan에서 _v5Matrix를 3차 fallback으로 활용 가능 (PCBJ 같이 v2 dictShipMeta도 부족한 케이스 대비)

### 2. ⚠ 누락 5척 베이 번호 (M6.55 미해결)
- HAHM, KANP, RZIN, SDHI, SWIC, TSPS

### 3. 💡 v5 매트릭스의 cells_per_row 활용 검토
- 현재는 globalRowRange(EDI max)로 통일
- 일부 베이에 EDI 컨테이너 없는 경우 v5 매트릭스로 박스 외곽 추정 가능 (다만 사용자 M6.49 원칙 재확인 필요)

### 4. ⚠ v2 baysSummary 빈 entry 점검
- PCBJ 외에 비슷한 케이스 있는지 v2 전체 스캔
- 발견 시 STOWAGE PDF로 정밀 등록 (M6.14 양식)

---

## 🛡 보호 규칙 준수

| 규칙 | 상태 |
|---|---|
| shipBayDict_v2.js 미수정 | ✅ |
| NBTD/MCSC v2 그대로 | ✅ |
| M6.54 점선 통일 의도 유지 (강화) | ✅ |
| M6.49 row 폭 통일 원칙 유지 | ✅ |
| Firebase 최우선 유지 | ✅ |

---

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.56 | 2 |
| dictShipMeta (fallback) | 4 |
| baysSummary | 9 |

빌드 크기: 2.6 MB (gzip 433 KB) — M6.55 대비 +1 KB

---

## 📞 다음 세션 권장 시작 메시지

```
M6.57 인계받습니다. M6.56 PCBJ 박스 크기/점선 일치 완료.

현 상태:
- PrintableCargoPlan pageBayDictTiers 2차 fallback 적용
- baysSummary 베이 entry 비어있어도 dictShipMeta.deckTiers/holdTiers 사용
- PCBJ 시뮬레이션 검증 통과
- KSKM/NBTD/PAVA 회귀 없음 (1차에서 처리)

미해결 (M6.55부터):
1. 6.10 포맷 hold 분리 검출 (181척)
2. 누락 5척 베이 번호 (HAHM 등)
3. v5 매트릭스 cells_per_row 활용 (사용자 의향 재확인 필요)
4. v2 baysSummary 빈 케이스 전체 스캔

원칙 유지: 추론 금지, 실데이터 기반, v2/NBTD/MCSC 보호.
```

---

생성일: 2026-05-20  
세션: M6.55 → M6.56
