# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.15 (디버그 패널 + 옛 데이터 호환 + 전 컴포넌트 일관 적용)
**GitHub**: greenmarine26/greenmarinetally

---

## 🔍 M6.93.15 (2026-05-25) — 시뮬-실제 괴리 해결

### 사용자 보고 (M6.93.14 적용 후)
> "데크가 아직도 안 보이네요"

### 진단: 시뮬은 PASS인데 실제 작동 안 함

**3가지 가능 원인 모두 수정**:

1. **옛 user dict 호환성**: M6.93.14의 bayDef.deckTiers union은 새로 저장하는 데이터만 적용. 사용자가 옛 user dict 그대로 사용하면 `bayDef.deckTiers=[]` → 데크 영역 안 그려짐.
2. **다른 컴포넌트 누락**: PrintableCargoPlanV2만 수정. BayPlan, PrintableBayDetail은 여전히 EDI 베이 구조 추정.
3. **사용자 데이터 가시화 부재**: localStorage에 무엇이 저장됐는지 사용자가 모름.

### 4가지 수정

**1. `shipStructure.js getShipBayDictData` — 자동 fallback**
```js
// bayDef.deckTiers 빈 배열 → baysSummary union → v5.baseDeckTiers fallback
if (!Array.isArray(bayDef.deckTiers) || bayDef.deckTiers.length === 0) {
    const set = new Set();
    baysSummary.forEach(b => (b.deckTiers || b.deckTiersLocal || []).forEach(t => set.add(t)));
    if (set.size === 0 && matrixV5?.baseDeckTiers) {
        matrixV5.baseDeckTiers.forEach(t => set.add(t));
    }
    bayDef.deckTiers = [...set].sort((a,b)=>b-a);
}
```

**2. `BayPlan.jsx` — enrichBayDef containers=null**
사용자 통찰 전 컴포넌트 일관 적용.

**3. `PrintableBayDetail.jsx` — enrichBayDef containers=null**
동일.

**4. `ShipMatrixBuilderModal.jsx` — 🔍 디버그 패널**
"🔍 디버그 보기" 버튼 추가. 현재 localStorage 저장본 + 메모리 매트릭스 동시 표시:
- code/imo/name
- bayDef.deckTiers/holdTiers
- 베이별 rowCount/hasZero/deckTiers/deckCells/holdTiers/holdCells

→ **사용자가 화면에서 직접 데이터 검증 가능. 추측 종료.**

### 호환성 매트릭스 (시뮬 ALL PASS)
| 케이스 | 결과 |
|--------|------|
| 옛 user dict (bayDef.deckTiers 없음) | baysSummary union ✅ |
| v2 사전 (baysSummary[i].deckTiers 없음) | bayDef level deckTiers ✅ |
| 둘 다 빈 | v5.baseDeckTiers fallback ✅ |
| 새 M6.93.14+ user dict | 저장 그대로 ✅ |

### 사용자 디버그 절차 (CRITICAL)
1. ZIP 적용 + 브라우저 강력 새로고침 (Ctrl+Shift+R)
2. 매트릭스 빌더 열기 (자료 탭)
3. **🔍 디버그 보기 클릭**
4. 화면에서 확인:
   - `localStorage 저장본`이 있는가? 없으면 빨간 글씨로 "저장본 없음"
   - `bayDef.deckTiers`가 비어있지 않은가?
   - 베이별 `deckCells/holdCells`가 사용자 의도와 같은가?
5. 다르면 → 사용자가 직접 수정 → 저장 버튼
6. 카고플랜에서 검증

### M6.93.x 시리즈 회고
| 버전 | 발견한 원인 | 한계 |
|------|------------|------|
| M6.93.12 | lookupUserBayDict 매칭 6단계 | v2-verified-newer가 위에서 우회 |
| M6.93.13 | user dict 최우선 | cells 덮어쓰기 미발견 |
| M6.93.14 | EDI 추정 차단 + cells 보존 | 옛 데이터 호환 + 다른 컴포넌트 누락 |
| M6.93.15 | **이중 fallback + 전 컴포넌트 + 디버그 패널** | 사용자 실제 화면에서 검증 가능 |

---

## 미해결 작업
1. **M6.93.15 화면 검증** (디버그 패널로 데이터 상태 확인 후 카고플랜 검증)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 붙여넣기
2. M6.93.15 디버그 패널 결과 (스크린샷 또는 텍스트):
   - localStorage 저장본에 무엇이 있는가
   - bayDef.deckTiers 값
   - 베이별 deckCells/holdCells
   → 이 정보로 정확한 다음 수정 가능
