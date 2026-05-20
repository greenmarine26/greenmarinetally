# Tallyman Master 핸드오프 — M6.57

## 📌 현재 상태 (2026-05-20)

- **최신 버전**: **M6.57** (베이사전 자동 보정 시스템)
- **이전 버전**: M6.56 (PCBJ 박스 크기 fallback, 한 곳만)
- **작업 디렉토리**: `/home/claude/app/m6_57_build/`

---

## 🎯 M6.57 — 관점 전환

**이전 패턴 (Reactive):**
```
사용자가 카고플랜에서 오류 발견
  → 스크린샷/PDF 업로드
  → 클로드 세션 디버깅
  → 한 곳 수정 후 ZIP
  → 다음 오류 발견...반복
```

**새 패턴 (Proactive):**
```
앱이 베이사전 데이터 자동 정밀 분석
  → 비어있는 필드를 자체 데이터로 자동 보정
  → 사용자 발견 못 해도 정상 출력
  → 클로드 세션은 새 패턴 추가 / 복잡 디버깅에만
```

---

## ✅ 핵심: Multi-level Fallback Enrichment

### 신규 모듈: `src/bayDictAutoEnrich.js`

각 베이 entry의 비어있는 필드를 다단계 fallback으로 자동 채움.
**verified 데이터는 절대 미수정** (deep clone 후 보강).

### Fallback 우선순위 (필드별)

```
L1 베이 entry 자체값 (verified — 사용자 STOWAGE PDF 등록 등)
   ↓ 없으면
L2 v5 매트릭스 (.def 자동 추출 — M6.55 신규)
   ↓ 없으면
L3 v2 사전 level (전체 deckTiers/holdTiers/rowMaxEven/Odd)
   ↓ 없으면
L4 안전한 default
```

### 보정 대상 필드

| 필드 | 효과 |
|---|---|
| `deckTiersLocal` | 박스 deck 영역 자리 |
| `holdTiersLocal` | 박스 hold 영역 자리 |
| `rowMaxEvenLocal` | 짝수 베이 row 폭 |
| `rowMaxOddLocal` | 홀수 베이 row 폭 |

→ M6.54 "tier-hidden으로 자리 통일" 효과가 verified 아닌 선박에도 자동 적용

---

## 📊 시뮬레이션 검증 결과

| 선박 | 보정 결과 | 영향 |
|---|---|---|
| **PCBJ** | **72개 필드 자동 보정** | 24 베이 × 3필드 — PDF 박스 크기 문제 완전 해결 |
| KSKM | 보정 불필요 (verified) | 회귀 없음 ✅ |
| NBTD | 27개 부분 보정 | 비어있던 일부만 채움 |
| PAVA | rowMax 22개 보정 | tier는 entry/사전 둘 다 없으면 보강 안 함 (안전) |
| DAP/PCBS | 보정 불필요 | v5-supplement 생성 시 이미 채움 |

---

## 🌐 적용 범위 — M6.56 대비 압도적 확대

M6.56은 PrintableCargoPlan 한 곳 fallback. M6.57은 `getShipBayDictData()` 반환 직전 보정.

**9개 호출처 모두 혜택:**
- `PrintableCargoPlan.jsx` (카고플랜)
- `PrintableBayDetail.jsx` (베이상세)
- `BayPlan.jsx` (베이플랜)
- `BayDictStatusWidget.jsx`
- `pages/VoyagePage.jsx`
- `pages/ChiefDashboard.jsx`
- `twin.js`
- `HelpModal.jsx`
- 기타

베이상세/베이플랜에서도 같은 문제가 있었다면 자동 해결.

---

## 📁 변경 파일 (M6.57)

### 신규
- **`src/bayDictAutoEnrich.js`** — 자동 보정 모듈 (160줄)
  - `enrichBayDef(entry, v5Matrix)`: 핵심 보정 함수
  - `describeEnrichment(enriched)`: 보정 결과 요약 (디버그용)

### 수정
- **`src/shipStructure.js`** — `getShipBayDictData()` 반환 직전 `enrichBayDef()` 호출
- **`src/utils.js`** — APP_VERSION M6.56 → M6.57
- **`src/components/HelpModal.jsx`** — M6.57 항목 추가

### 절대 건들지 않음
- `src/data/shipBayDict_v2.js` (M6.14 + M6.55 + M6.57 보호)
- `src/data/shipBayDict_v5_*` (M6.55 신규)
- `src/components/PrintableCargoPlan.jsx` M6.56 fallback (방어 코드로 유지)

---

## 🛡 보호 규칙 준수

| 규칙 | 상태 |
|---|---|
| shipBayDict_v2.js 미수정 | ✅ |
| verified 데이터 절대 미수정 (deep clone 후 보강만) | ✅ |
| NBTD/MCSC v2 그대로 | ✅ |
| M6.54 점선 통일 의도 강화 (자동 적용) | ✅ |
| M6.49 row 폭 통일 원칙 유지 (globalRowRange 그대로) | ✅ |
| Firebase 최우선 유지 | ✅ |
| M6.56 fallback 유지 (방어 코드) | ✅ |

---

## 🚦 다음 세션 권장 작업

### 1. 💡 L4 EDI 실측 fallback 추가
- 현재 항차의 컨테이너 row/tier 분포에서 자동 추정
- 베이사전 + v5 모두 없는 매우 새로운 선박 대응
- 컨텍스트 필요 — `enrichBayDef(entry, v5Matrix, ediContainers)`로 확장

### 2. 💡 자동 보정 표시 위젯
- 검수원이 "이 베이는 자동 보정됨" 시각적으로 인지
- `_enrichedFrom: {deckTiersLocal: 'L3-ship-deckTiers'}` 메타 활용
- 베이사전 위젯에 ⚙️ 아이콘 + 호버 시 출처 표시

### 3. ⚠ v5 6.10 hold 검출 알고리즘 (181척 영향, M6.55 미해결)
- 6.10 포맷의 hasHold가 모두 false 상태 → L2 fallback 약화
- 해결 시 자동 보정 정확도 더 상승

### 4. ⚠ 누락 5척 베이 번호 (HAHM, KANP, RZIN, SDHI, SWIC, TSPS)

---

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.57 | 2 |
| enrichBayDef | 1 (minify 후) |
| _enrichedFrom | 2 |
| _enrichMeta | 1 |

빌드 크기: 2.6 MB (gzip 433 KB)

---

## 📞 다음 세션 권장 시작 메시지

```
M6.58 인계받습니다. M6.57 베이사전 자동 보정 시스템 완료.

현 상태:
- bayDictAutoEnrich.js 모듈 신규
- getShipBayDictData() 반환 시 자동 보정
- L1(verified) → L2(v5) → L3(사전) → L4(default) fallback
- PCBJ 72개 필드 자동 보정 시뮬레이션 통과
- 9개 호출처 모두 자동 보정 효과

권장 다음 작업:
1. L4 EDI 실측 fallback (현 항차 컨테이너 row/tier 분포 활용)
2. 자동 보정 표시 위젯 (검수원 인지)
3. v5 6.10 hold 검출 (181척, hasHold 정확화)
4. 누락 5척 베이 번호

원칙 유지: verified 절대 미수정, 추론 금지, deep clone 후 보강만.
```

---

생성일: 2026-05-20  
세션: M6.56 → M6.57  
관점 전환: Reactive (사후 수정) → Proactive (자동 보정)
