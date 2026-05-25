# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.12 (사용자 데이터 보호 긴급 수정)
**GitHub**: greenmarine26/greenmarinetally

---

## 🚨 M6.93.12 (2026-05-25) — 사용자 데이터 보호 긴급 수정

### 사용자 보고
> "사용자가 입력한 데이터를 어디에선가 수정하고 있습니다. 사용자 데이터는 사용자 외에 변경하지 못하게 해주세요. M6.93.11D는 이상없이 들어가 있는데 제가 드린 파일로 업데이트하면 사용자가 수정한 베이데이터가 사라집니다. DXQD가 오늘 작업할 선박인데 데크 08 ROW가 카고플랜에서 사라져 있습니다. 데크와 홀드 셀들이 사용자가 베이데이터 수정한 대로 되어 있지 않습니다."

### 진단: 3가지 연쇄 버그

**Bug 1 (CRITICAL): lookupUserBayDict 매칭 실패**
- 사용자가 `DXQD` 키로 저장 → 카고플랜이 `(imo=9388417, vsl="XIN QUN DAO")`로 검색 → MISS → v2 사전 사용 → 사용자 수정 무시
- 기존 함수: 키 = imo 또는 code 정확 매칭만. entry.imo/callsign/name fuzzy 매칭 없음.

**Bug 2 (CRITICAL): cargoPlanCore.js 우선순위 역전**
- M6.93.10 주석: "override > userBay > v5 cells > fallback" — 사용자 입력 보호 원칙 위배
- override(개발자 박아둔 정답)가 userBay(사용자 직접 수정)보다 우선이면 사용자 수정 무시됨

**Bug 3: mergeBayDef user union**
- user source일 때도 v2와 deckTiers/holdTiers union → 사용자가 제거한 tier가 v2에서 복원
- 사용자가 베이 03 deck tier를 [88,86,84]로 줄여도 v2의 [88,86,84,82]와 union → [88,86,84,82] 복원

### 수정 (4개 파일)

**1. src/data/userBayDict.js — lookupUserBayDict 6단계 매칭**
```js
// (1) 키=IMO → (2) 키=code → (3) entry.imo === imo → (4) entry.code === code
// → (5) entry.callsign === code → (6) entry.name fuzzy (5자 prefix 양방향)
```

**2. src/cargoPlanCore.js — 우선순위 역전**
```js
// 변경 전: override > userBay > v5
// 변경 후: userBay > override > v5 > fallback
// rowCount, hasZero, deckTiers, holdTiers, deckCells, holdCells 모두
```

**3. src/shipStructure.js — mergeBayDef user 차단**
```js
} else if (v2HasData && v3HasData && result.source !== 'user') {
    // user 소스는 v2와 union 안 함 (사용자 보호)
    finalBayDef = mergeBayDef(finalBayDef, v2Backup.entry.bayDef);
}
```

**4. src/components/PrintableCargoPlanV2.jsx — 베이별 tier 보존**
```js
const userDeckTiers = summary?.deckTiers?.length > 0 ? summary.deckTiers : null;
const deckTiers = hasDeck ? (userDeckTiers || deckTiersAll) : [];
// 베이별 사용자 수정 우선, 없으면 선박 전체 통일 deckTiersAll fallback
```

### 시뮬레이션 검증 (4 TEST × 다중 케이스 — 모두 PASS)
- **TEST 1**: 6가지 호출 시나리오 모두 lookupUserBayDict 매칭 ✅
- **TEST 2**: userBay 있으면 override 무시, 없으면 override 사용 ✅
- **TEST 3**: BAY 03 사용자 80 추가 보존, BAY 05 미수정은 fallback ✅
- **TEST 4**: firebase는 union, user는 union 차단 ✅

### 회귀 영향
- 사용자가 저장 안 한 베이/선박 → fallback 그대로 작동 (변화 없음)
- DJCT/SWAT override는 사용자가 수정 안 했으면 그대로 사용

---

## M6.93.11 (2026-05-25) — 카고플랜 V2만 사용 (배포 X — 버그 발견)

V1 토글 제거, V2만 표시. 단 사용자 데이터 보호 버그가 있어서 M6.93.12로 긴급 수정.

---

## 미해결 작업
1. **M6.93.12 사용자 화면 검증** (DXQD 데크 08 ROW 표시 + 사용자 수정 cells 반영)
2. SWAT 실 EDI 컨테이너 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가 (hull 단면 정확도)
5. ShipMatrixBuilderModal 저장 시 verified 덮어쓰기 경고 다이얼로그

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 붙여넣기
2. M6.93.12 검증 결과 보고 (DXQD 카고플랜 화면 OK / 수정 필요)
