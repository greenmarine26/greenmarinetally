# Tallyman Master 핸드오프 — M6.58

## 📌 현재 상태 (2026-05-20)

- **최신 버전**: **M6.58** (STSE 자동 생성 + 빈 셀 시각화)
- **이전 버전**: M6.57 (베이사전 자동 보정 시스템)
- **작업 디렉토리**: `/home/claude/app/m6_58_build/`

---

## 🎯 M6.58 변경 요약

사용자 보고 2건 동시 해결:

### 보고 1: STSE M6.57 효과 0
M6.57 검증용으로 STSE SITC SENDAI 카고플랜 받음 → M6.57 자동 보정이 작동 안 함.

**원인:** STSE는 v2에 등록되어 있지만 grade=needs-review, **baysSummary 빈 배열**, rowMaxEven/Odd/deckTiers/holdTiers 모두 undefined. M6.57은 "비어있는 필드만 채우는" 양식이라 baysSummary 자체가 비어있으면 채울 entry 없음.

**해결:** enrichBayDef 확장 — baysSummary 빈 배열이면 v5 매트릭스로 entry 자체 자동 생성.

### 보고 2: 빈 셀 사라짐
PCBJ/STSE 카고플랜에서 컨테이너 없는 row 자리가 사라져서 박스 좁아 보임.

**원인:** 코드/CSS상 빈 셀 자리 보존 양식 (mark-empty)이지만, `.bay-cell border: 0.3px`라 실질적으로 안 보여서 시각적으로 "사라진 것"처럼 인지.

**해결:** CSS 강화 — border 0.5px + .mark-empty::after 옅은 가운데 점(·).

---

## ✅ M6.58 시뮬레이션 검증

```
STSE: ★ 22개 entries 자동 생성 + 22개 rowMax 보정 (M6.57 0회 → M6.58 44회)
KSKM (verified): 보정 0 (회귀 없음)
NBTD: 27 부분 보정 (M6.57 그대로)
PCBJ: 72 보정 (M6.57 그대로)
PAVA: 22 rowMax 보정 (M6.57 그대로)
DAP/PCBS: 보정 불필요 (v5-supplement 완전)
```

---

## 📁 변경 파일 (M6.58)

### 수정
- **`src/bayDictAutoEnrich.js`**
  - baysSummary 빈 배열 → v5 매트릭스로 자동 entry 생성 로직 (47줄 추가)
  - bayList도 v5 bayNumbers로 보강
  - _enrichMeta 보존 (덮어쓰기 대신 누적)
- **`src/components/PrintableCargoPlan.jsx`** (CSS만)
  - `.bay-cell border` 0.3px → 0.5px solid #999
  - `.mark-empty::after` 가운데 점(·, color #d1d5db, font-size 7pt) 추가
- **`src/utils.js`** — APP_VERSION M6.57 → M6.58
- **`src/components/HelpModal.jsx`** — M6.58 항목 추가

### 절대 건들지 않음
- `src/data/shipBayDict_v2.js` (M6.14~M6.58 보호)
- v5 데이터 (M6.55)
- M6.56 fallback (방어 코드)
- M6.57 enrichBayDef 기존 로직 (확장만)

---

## ⚠ STSE 미완 부분 (M6.59 후보)

baysSummary 22 entries 자동 생성 성공했지만 각 entry의 `deckTiersLocal/holdTiersLocal`은 여전히 비어있음.

**이유:**
- 6.10 포맷 v5의 `hasHold`가 모두 false (Phase 7 미해결)
- v2 사전 level `deckTiers/holdTiers`도 비어있음
- enrichBayDef에 EDI 컨텍스트 없음

**M6.59 해결 방향:**
- `enrichBayDef(entry, v5Matrix, ediContainers)` — EDI 실측 fallback 추가
- 현재 항차 컨테이너 tier 분포에서 deck(>=80) / hold(<80) 자동 분리
- PrintableCargoPlan에서 호출 시 ediContainers 전달

---

## 🌐 적용 범위

M6.57과 동일 — `getShipBayDictData()` 반환 직전 보정. 9개 호출처 모두 혜택.

- 카고플랜 (PrintableCargoPlan)
- 베이상세 (PrintableBayDetail)
- 베이플랜 (BayPlan)
- BayDictStatusWidget, VoyagePage, ChiefDashboard, twin.js, HelpModal 등

---

## 🛡 보호 규칙 준수

| 규칙 | 상태 |
|---|---|
| shipBayDict_v2.js 미수정 | ✅ |
| verified 데이터 절대 미수정 | ✅ |
| NBTD/MCSC/KSKM verified 그대로 | ✅ |
| M6.54 점선 통일 의도 강화 | ✅ |
| M6.49 row 폭 통일 (globalRowRange) 유지 | ✅ |
| M6.56 PrintableCargoPlan fallback 유지 | ✅ |
| M6.57 enrichBayDef 기존 로직 보존 + 확장만 | ✅ |

---

## 🚦 다음 세션 권장 작업 (우선순위)

### 1. ⚠ STSE 같은 선박의 deckTiers/holdTiers EDI 실측 fallback (M6.59)
- enrichBayDef에 ediContainers 파라미터 추가
- 현재 항차 컨테이너 tier 분포 → deck(>=80) / hold(<80) 분리
- PrintableCargoPlan에서 enrichBayDef 호출 시 컨테이너 전달

### 2. ⚠ v5 6.10 포맷 hold 분리 검출 (181척, Phase 7 미해결)
- 해결 시 v5 매트릭스의 hasHold 정확화
- enrichBayDef baysSummary 자동 생성 정밀도 ↑

### 3. ⚠ 누락 5척 베이 번호 (HAHM, KANP, RZIN, SDHI, SWIC, TSPS)

### 4. 💡 자동 보정 표시 위젯
- 검수원이 "이 베이는 자동 보정됨" 시각적 인지
- _enrichedFrom 메타 활용 — ⚙️ 아이콘 + 호버 시 출처 표시

### 5. 💡 베이사전 일괄 진단 (M6.57 권장 작업)
- 앱 시작 시 312척 + 13척 = 325척 전체 정밀 스캔
- 자동 보정으로 해결 가능한 선박 / STOWAGE PDF 필요한 선박 분리
- 미리 알림 → 입항 전 등록 가능

---

## 📞 다음 세션 권장 시작 메시지

```
M6.59 인계받습니다. M6.58 STSE 자동 생성 + 빈 셀 시각화 완료.

현 상태:
- STSE 22 entries 자동 생성 (v5 매트릭스 활용)
- 빈 셀 시각화 (·) 추가
- 9개 호출처 모두 자동 보정 효과

권장 다음 작업:
1. STSE deckTiers/holdTiers EDI 실측 fallback
   - enrichBayDef(entry, v5Matrix, ediContainers) 확장
   - 베이별 deck(>=80) / hold(<80) 자동 분리
2. v5 6.10 포맷 hasHold 정확화 (181척)
3. 누락 5척 베이 번호
4. 자동 보정 표시 위젯

원칙 유지: verified 절대 미수정, 추론 금지, deep clone 후 보강만.
```

---

생성일: 2026-05-20  
세션: M6.57 → M6.58
