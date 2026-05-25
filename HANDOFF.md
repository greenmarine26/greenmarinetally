# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.16 (저장/검색 키 mismatch 해결 + 전체 워크플로 시뮬 검증)

---

## 🔑 M6.93.16 (2026-05-25) — 저장 키 / 검색 키 mismatch 해결

### 사용자 보고
> "또 수동으로 베이를 수정하고 저장후 다시 불러오면 수정전 데이터로 돌아옴"

### 진짜 원인 (ShipMatrixBuilderModal.jsx)
- **저장**: `matrixToBayDictEntry(matrix, shipMeta.code, ...)` — 사용자 수정값
- **검색**: `lookupUserBayDict(autoMeta.imo, autoMeta.code)` — EDI 자동값
- 사용자가 code/imo/name 수정하면 키가 달라져 검색 fail → modal 재오픈 시 EDI 재분석 → 사용자 수정 사라진 것처럼 보임

### 수정 (3가지)
**1. handleSave에 alias 정보 보존**
```js
entry.aliasCode = autoMeta.code;
entry.aliasName = autoMeta.name;
entry.aliasImo = autoMeta.imo;
```

**2. alias 키로도 user dict 저장**
```js
if (autoMeta.code && autoMeta.code !== entry.code) {
  addToUserBayDict({ ...entry, code: autoMeta.code });  // alias 키 등록
}
```

**3. lookupUserBayDict에 alias 매칭 추가**
```js
// entry.imo OR entry.aliasImo 매칭
// entry.code OR entry.aliasCode 매칭
// entry.name OR entry.aliasName fuzzy 매칭
```

### 전체 워크플로 시뮬레이션 ALL PASS
이번엔 한 함수가 아니라 사용자가 실제로 거치는 전체 흐름 시뮬:
1. EDI 분석 → matrix 생성 ✅
2. 베이사전 보강 (cells 보존) ✅
3. 사용자가 code/name/imo 수정 + cells 수정 ✅
4. 저장 (alias 정보 + alias 키 둘 다) ✅
5. modal 닫기 ✅
6. modal 재오픈 → lookup으로 saved 매칭 ✅
7. 복원된 매트릭스가 사용자 수정 그대로 ✅
8. 카고플랜 (voyage.info.vsl로 lookup) → user 매칭 ✅
9. deckTiersAll 빈 배열 아님 → 데크 영역 그려짐 ✅
10. 사용자 deckCells/holdCells 그대로 최종 출력 ✅

### 사용자 검증 절차
1. ZIP 적용 + 강력 새로고침 (Ctrl+Shift+R)
2. 매트릭스 빌더 열기 → "🔍 디버그 보기" 클릭하여 초기 상태 확인
3. 메타 정보 수정 (필요시) + 베이 cells 수정
4. **저장 버튼**
5. modal 닫기 → 다시 열기 → "🔍 디버그 보기" → 저장본 == 수정값 확인
6. 카고플랜 → 데크 영역 + 사용자 cells + 컨테이너 마크 확인

---

## M6.93.x 시리즈 회고
| 버전 | 발견한 원인 | 결과 |
|------|------------|------|
| M6.93.12 | lookupUserBayDict 매칭 보강 | 6단계 fuzzy 추가 |
| M6.93.13 | v2-verified-newer가 user 우회 | user dict 최우선 |
| M6.93.14 | EDI 베이 구조 추정 + bayDef union | 사용자 통찰 반영 |
| M6.93.15 | 옛 데이터 호환 + 디버그 패널 + 전 컴포넌트 | 가시화 + 일관 적용 |
| M6.93.16 | **저장/검색 키 mismatch** | **alias 보존 + 전체 워크플로 시뮬** |

### M6.93.x 교훈
- 매칭 알고리즘만 강화하지 말고 호출 인자 먼저 비교
- 한 함수 시뮬 대신 사용자 전체 워크플로 시뮬
- 디버그 패널 필수 (사용자가 데이터 직접 확인)
- 변수 mismatch는 5초면 보임 — 코드 흐름을 끝까지 추적

---

## 미해결 작업
1. **M6.93.16 화면 검증** (저장→재오픈 데이터 유지 + 카고플랜 정상)
2. SWAT 실 EDI 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells 추가
