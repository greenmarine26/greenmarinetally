# Tallyman Master M6.93.12 — 사용자 데이터 절대 보호

**날짜**: 2026-05-26
**버전**: M6.93.12
**작성**: Claude (성일님 인계용)

---

## 핵심 변경 (지침서 §6.2 fix 4개 + 보강 2개 = 총 6개)

| # | 파일 | 수정 내용 | 출처 |
|---|------|----------|------|
| 1 | `data/userBayDict.js` | `lookupUserBayDict` 6단계 fuzzy 매칭 (IMO/code/callsign/name) | §6.2 #1 |
| 2 | `cargoPlanCore.js` | **우선순위 역전: userBay > override**. rowCount, hasZero, deckTiers, holdTiers, deckCells, holdCells 모두 사용자 우선 | §6.2 #2 |
| 3 | `shipStructure.js` | `mergeBayDef`에 `source !== 'user'` 조건 (user 시 v2 union 차단) | §6.2 #3 |
| 4 | `shipStructure.js` | `fuzzyLookupAcrossDicts`에서 user 최우선 (이전 3순위) | §6.3 |
| 5 | `bayDictAutoEnrich.js` | `source='user'`면 L4 EDI 자동 채움 차단 (CASPI 빈 구조 무결성) | 사용자 통찰 |
| 6 | `PrintableCargoPlanV2.jsx` | matrixBays에서 베이별 summary 우선 (deckTiers/holdTiers/deckCells/holdCells) | §6.2 #4 |
| 7 | `cargoPlanCore.js` | `STANDARD_DECK = [94,92,90,88,86,84,82,80]` (80 추가) | TEST 2 |

---

## 시뮬레이션 검증 (지침서 §6.4 부록 TEST 1~4)

```
✅ TEST 1 (lookup 6단계): 6/6 PASS
   - (imo, code), (imo, name), (no imo, code), (no imo, name),
   - (no imo, name without space), (callsign, no name)
✅ TEST 2 (userBay > override): PASS — userBay [88,86,84,82,80] 보존
✅ TEST 3a (BAY 03 사용자 80 보존): PASS
✅ TEST 3b (BAY 05 미수정 fallback): PASS
✅ TEST 4 (user union 차단): PASS

ALL PASS — ZIP 가능
```

---

## 사용자 통찰 적용

**"CASPI는 변하지 않는 빈 구조. EDI가 그곳을 채울 뿐."**
→ EDI가 베이사전을 변경하면 안 됨. fix #5 (bayDictAutoEnrich user source 시 EDI 자동 채움 차단).

**"DXQD/STSE/NBTD/MCSC 4척이 CASPI 100% 동일. 클로드가 안 바꿨다면."**
→ 이 4척 매트릭스 빌더 저장본 = CASPI 정답. fix 7개로 절대 보호.

---

## 현장 검증 가이드 (성일님)

1. M6.93.12 ZIP 받아서 GitHub repo 루트에 통째로 덮어쓰기
2. commit & push → GitHub Pages 자동 배포
3. 앱에서 DXQD/STSE/NBTD/MCSC 4척 중 하나 양하 항차로 카고플랜 V2 렌더
4. CASPI PDF와 비교:
   - **CASPI 100% 일치** → fix 성공, LOCK 확정
   - **일부 불일치** → 매트릭스 빌더의 deck/hold rowCount 단일값 한계 가능. fix 8 (cargoPlanCore에 deck/hold rowCount 분리) 필요할 수 있음

---

## 시뮬 한계 (정직한 보고)

`simulate2.mjs` (DXQD2621E EDI + 가정 cells 비교)는 **99.64% 일치** (829/832 cells). 남은 3 cell은 BAY 07/(08)09 deck 82 row 매핑 — 제가 모든 박스 deck 8 row / hold 7 row 통일 가정. 실제 CASPI BAY 07 = deck 6 row / hold 5 row 작은 박스.

→ 시뮬 100%는 실데이터 모르므로 불가능. **지침서 §6.4 TEST는 ALL PASS**.

---

## 다음 작업 후보 (현장 검증 결과에 따라)

### 4척 카고플랜 100% CASPI 일치 확인 시
- LOCK 확정

### 일부 불일치 시
- **fix 8**: cargoPlanCore에 deck/hold rowCount 분리
  - baysSummary[].deckRowCount, holdRowCount 별도 필드
  - matrixToBayDictEntry에서 deck/hold 별도 저장

### X-RAY ★ 매핑 오류 (LOCK9 잔재)
- xrayMap = sec.xrayList. XRAY 리스트 파일 파싱 데이터
- 일반 컨테이너에 ★ 잘못 표시되는 케이스는 XRAY 리스트 파일 검증 필요
- DXQD2621EXRAY.xls 받으면 정밀 진단 가능
