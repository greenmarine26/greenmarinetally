# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.13 (v2-verified-newer 우회 버그 수정)
**GitHub**: greenmarine26/greenmarinetally

---

## 🚨 M6.93.13 (2026-05-25) — v2-verified-newer 우회 버그 (진짜 원인)

### 사용자 보고 (M6.93.12 적용 후에도 발생)
> "수정 안 되어 있습니다. 여전히 데크 08 부분이 누락되어 있고 홀드 부분도 제가 입력한 데이터대로 나오지 않습니다. 데크가 ROW 8개 4단으로 지정하면 8×4=32개의 셀이 있어야 하는데 누락된 곳이 많습니다."

### 진단: 진짜 원인은 fuzzyLookupAcrossDicts 첫 분기

M6.93.12에서 lookupUserBayDict를 6단계 매칭으로 보강했지만, **shipStructure.js fuzzyLookupAcrossDicts의 첫 분기 `v2-verified-newer`가 user dict보다 먼저 실행됨**. DXQD가 v2에 `verified=true, parsedAt="2026-05-11"`로 등록되어 있고 Firebase에 없으니, v2-verified-newer가 매칭되어 **user dict 매칭 시도조차 안 됨**. M6.93.12 수정이 무효화된 진짜 이유.

### 시뮬레이션 결과
| 호출 | M6.93.12 | M6.93.13 |
|------|----------|----------|
| `(imo, 'XIN QUN DAO')` | v2-verified-newer ❌ | user ✅ |
| `(imo, 'DXQD')`        | v2-verified-newer ❌ | user ✅ |
| `(imo, 'DXQD XIN QUN DAO')` | v2-verified-newer ❌ | user ✅ |
| `(imo, 'H3OI')`        | v2-verified-newer ❌ | user ✅ |

**M6.93.12: 0/4 PASS (사용자 보고와 정확히 일치)**
**M6.93.13: 4/4 PASS**

### 수정 (3개 파일)

**1. src/shipStructure.js — fuzzyLookupAcrossDicts user 최우선**
```js
function fuzzyLookupAcrossDicts(imo, vesselNameOrCode) {
  // M6.93.13: user dict 최우선 — v2 verified보다도 위
  try {
    const userResult = lookupUserBayDict(imo, vesselNameOrCode);
    if (userResult) return { source: 'user', data: userResult, matchedBy: 'user-dict' };
  } catch (e) { /* fallthrough */ }
  
  // M6.62: v2-verified-newer
  // M5.88: Firebase
  // v2, v5, v1 ...
}
```

**2. src/components/PrintableCargoPlanV2.jsx — user cells 우선**
- 기존: v5 cells 우선, user cells fallback
- 변경: user cells 우선, v5 cells fallback (이중 안전망)

**3. src/cargoPlanCore.js — raw cells 마지막 fallback**
- 기존: bayData.cells (raw) > bayData.deckCells
- 변경: bayData.deckCells/holdCells (분리된 cells) > raw cells

### 셀 검증 (BAY 03 데크 8 ROW × 4단)
- 사용자 입력: deckCells=[8,8,8,8], holdCells=[7,5,3,1]
- 최종 출력: **[8,8,8,8] × 4단 = 32 셀 정확 보존** ✅
- userBay=null 엣지케이스에서도 bayData.deckCells가 user cells라 보호됨 ✅

---

## M6.93.12 (2026-05-25) — 사용자 데이터 보호 1차 (불완전)

| Fix | 파일 | 내용 | 결과 |
|-----|------|------|------|
| 1 | userBayDict.js | lookupUserBayDict 6단계 매칭 | ✅ 매칭 보강 |
| 2 | cargoPlanCore.js | userBay > override 우선순위 역전 | ✅ |
| 3 | shipStructure.js | mergeBayDef user union 차단 | ✅ |
| 4 | PrintableCargoPlanV2.jsx | 베이별 deckTiers 보존 | ✅ |

하지만 fuzzyLookupAcrossDicts의 v2-verified-newer 우회 분기로 인해 user dict 매칭이 시도조차 안 됨 → **M6.93.13에서 해결**.

---

## 미해결 작업
1. **M6.93.13 사용자 화면 검증** (DXQD 데크 ROW 8 × 4단 = 32 셀, 사용자 cells 정확 표시)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가 (hull 단면)

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 붙여넣기
2. M6.93.13 화면 검증 결과 보고
