# Tallyman Master 핸드오프 — M6.59

## 📌 현재 상태 (2026-05-20)

- **최신 버전**: **M6.59** (EDI 실측 L4 fallback — 한계 극복)
- **이전 버전**: M6.58 (STSE 자동 생성 + 빈 셀 시각화)
- **작업 디렉토리**: `/home/claude/app/m6_59_build/`

---

## 🎯 M6.59 — 관점 전환

성일님 지적: **"한계라 말하지 말고 그 한계를 극복하자."**

M6.58에서 "STSE deckTiers/holdTiers는 EDI 컨텍스트 없어서 다음 세션에"라고 미뤘던 작업.  
사실 EDI 컨텍스트는 PrintableCargoPlan/PrintableBayDetail/BayPlan에 이미 있었음 — enrichBayDef에 전달만 하면 됨.

**한계가 아니라 호출 패턴 추가만 필요했음.** 즉시 처리.

---

## ✅ M6.59 변경

### 1. enrichBayDef 시그니처 확장

```js
enrichBayDef(entry, v5Matrix, ediContainers = null)
```

ediContainers 주어지면:
- 베이별 컨테이너 tier 분포에서 deck(>=80) / hold(<80) 자동 분리
- 비어있는 deckTiersLocal/holdTiersLocal 자동 채움
- 짝수 베이는 양옆 홀수 베이의 40/45ft 컨테이너도 포함 (짝꿍)
- hasHold/hasDeck도 EDI 실측 발견 시 자동 true

### 2. 3개 호출처에서 EDI 보정 호출

- `PrintableCargoPlan.jsx` — dictData useMemo에서 enrichBayDef 2차 호출
- `PrintableBayDetail.jsx` — 동일
- `BayPlan.jsx` — dictBaysSummary useMemo에서 호출

---

## 📊 STSE 시뮬레이션 결과

| 베이 | M6.58 | M6.59 (EDI 보정 후) |
|---|---|---|
| BAY 11 | hasHold=false, holdTiersLocal=∅ | **hasHold=true, holdTiersLocal=[8,6,4,2]** |
| BAY 19 | deckTiersLocal=∅, holdTiersLocal=∅ | **deckTiersLocal=[88,86,84,82], holdTiersLocal=[8,6]** |
| BAY 03 | 비어있음 | **deckTiersLocal=[90,88], holdTiersLocal=[4]** |

→ STSE 카고플랜 박스에 deck/hold 자리 + 점선 자동 정상화

---

## 🛡 회귀 검증 (verified 보호)

KSKM/NBTD/PAVA/PCBJ — deckTiersLocal/holdTiersLocal 이미 채워져 있으면 **EDI fallback 발동 안 함**. 자동 보정은 "비어있는 필드만" 원칙 유지.

| 선박 | EDI fallback 발동? |
|---|---|
| KSKM (PDF verified) | ❌ 이미 완전 |
| NBTD (PDF verified) | ❌ 부분만 비어있을 때만 |
| PCBJ (M6.56/57로 보정됨) | ❌ M6.57에서 채워진 상태 |
| STSE (M6.58 자동 생성) | ✅ EDI에서 deckTiers/holdTiers 채움 |

---

## 📁 변경 파일 (M6.59)

- **`src/bayDictAutoEnrich.js`** — enrichBayDef에 ediContainers 옵션 + L4 fallback 로직 약 70줄 추가
- **`src/components/PrintableCargoPlan.jsx`** — import + dictData useMemo에서 enrichBayDef 호출
- **`src/components/PrintableBayDetail.jsx`** — 동일
- **`src/components/BayPlan.jsx`** — 동일
- **`src/utils.js`** — APP_VERSION M6.58 → M6.59
- **`src/components/HelpModal.jsx`** — M6.59 항목 추가

### 절대 건들지 않음
- `src/data/shipBayDict_v2.js` (M6.14~M6.59 보호)
- v5 데이터 (M6.55)
- M6.56 PrintableCargoPlan fallback (방어 코드)
- M6.57/M6.58 enrichBayDef 기존 로직 (확장만)

---

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.59 표시 | 2 |
| L4-edi-actual | 2 |
| ediContainers/ediUsed | 21 |

---

## 🚦 다음 세션 권장 작업 (계속 극복할 것들)

### 1. v5 6.10 포맷 hasHold 정확화 (181척)
- STSE 외 다른 6.10 포맷 선박들도 hasHold=false 상태
- 자동 보정 정확도 ↑

### 2. 누락 5척 베이 번호
HAHM, KANP, RZIN, SDHI, SWIC, TSPS — .def 다른 영역 분석

### 3. 자동 보정 표시 위젯
- `_enrichedFrom` 메타 활용
- 카고플랜에 ⚙️ 아이콘 + 호버 시 출처 표시
- 검수원이 "이 베이는 EDI 실측 보정" 인지 가능

### 4. 베이사전 일괄 진단
- 앱 시작 시 325척 전체 정밀 스캔
- 자동 보정으로 해결 가능한 선박 / 추가 데이터 필요한 선박 분리

### 5. 짝수 베이 짝꿍 처리 정밀화
- 현재: 짝수 베이가 양옆 홀수 베이의 40/45ft 컨테이너 포함
- 정밀화: pairMap 활용해서 정확한 짝꿍만 처리

---

## 📞 다음 세션 권장 시작 메시지

```
M6.60 인계받습니다. M6.59 EDI 실측 L4 fallback 완료.

현 상태:
- enrichBayDef(entry, v5Matrix, ediContainers) 4단계 fallback 완성
- L1 verified → L2 v5 매트릭스 → L3 사전 level → L4 EDI 실측
- 3개 호출처 모두 EDI 컨텍스트 전달
- STSE deckTiers/holdTiers 자동 완성 검증 통과

권장 다음 작업:
1. v5 6.10 포맷 hasHold 정확화 (181척)
2. 누락 5척 베이 번호 (HAHM/KANP/RZIN/SDHI/SWIC/TSPS)
3. 자동 보정 표시 위젯 (_enrichedFrom 메타 활용)
4. 베이사전 일괄 진단

원칙 유지: verified 절대 미수정, 추론 금지, "한계" 언급 자제 — 극복 양식으로 답할 것.
```

---

생성일: 2026-05-20  
세션: M6.58 → M6.59  
관점: "한계를 극복하자" — 사용자 통찰의 직접 적용
