# M6.94.5 핸드오프 — DXQD 매트릭스 빌더 정의 반영 안 됨 (4중 결함 수정)

## 증상

DXQD (XIN QUN DAO, callsign H3OI) 항차에서 매트릭스 빌더로 18개 베이 정의 저장 후
카고플랜에 반영 안 됨. F12로 확인 결과 `master_user_bay_dict_v1` 안에 두 entry 존재:

- `dict["DXQD"]` — PDF 자동 파싱본 (`bayDef.sourceFile: "DXQD2615E.pdf"`, source 마킹 없음)
- `dict["H3OI"]` — 매트릭스 빌더 저장본 (`bayDef.source: "user"`, `_userOwned: true`, `recordCount: 18`)

같은 배가 두 개 키로 분리 등록됨 → 카고플랜이 DXQD 키로 룩업 → PDF 자동본 우선 매칭 → user entry 영원히 미참조.

## 근본 원인 (4중 결함)

| # | 위치 | 증상 |
|---|---|---|
| R1 | `shipMatrixBuilder.js:31-43` `extractShipMetaFromVoyage` | `info.code` 없으면 callsign 첫 4자(H3OI) 사용 → PDF 흐름(DXQD)과 다른 키 |
| R2 | `shipMatrixBuilder.js:457` `matrixToBayDictEntry` | `callsign: ''` 하드코딩, 호출처 사후 보강 의존 (단일 책임 깨짐) |
| R3 | `userBayDict.js:109-114` `addToUserBayDict` | `dict[entry.code] = entry`만 — 같은 배 다른 키 entry 식별자 cross-fill 누락 |
| R4 ⭐ | `userBayDict.js:42-101` `lookupUserBayDict` | 6단계 매칭이 source 검증 없이 첫 hit 반환 → PDF 자동본이 user entry 가림 (원칙 ① 위반) |

## 수정 내역

### 1. `src/data/userBayDict.js`

- `lookupUserBayDict` 2-Phase 구조로 재작성
  - **Phase 1**: `bayDef.source === 'user'` 또는 `bayDef._userOwned === true` entry만 대상으로 6단계 매칭
  - **Phase 2**: 전체 dict 대상 6단계 매칭 (현행 호환)
- 6단계 매칭 로직을 `_matchInDict(subDict, imo, codeOrName)` 헬퍼로 추출
- `addToUserBayDict`에 cross-fill 보강 추가
  - 새 entry 추가 시 imo/callsign/name 매칭으로 "같은 배" 다른 키 entry 탐색
  - 양쪽 비어있는 식별자 상호 보완 (후속 fuzzy 매칭 연결 가능하게)

### 2. `src/shipMatrixBuilder.js`

- `matrixToBayDictEntry(matrix, code, name, imo, callsign)` — callsign 인자 추가
- 함수 내부 `callsign: ''` 하드코딩 제거, `callsign: callsign || ''`로 변경
- 버전 마킹 `sourceVersion: 'M6.94.5'`

### 3. `src/components/ShipMatrixBuilderModal.jsx`

- `handleSave`에서 `matrixToBayDictEntry`에 `shipMeta.callsign` 직접 전달
- 사후 보강 코드 `entry.callsign = shipMeta.callsign || ''` 제거

## 검증

### 시뮬레이션 (sim_real_import.mjs) — 9/9 PASS

| # | 케이스 | 기대 | 결과 |
|---|---|---|---|
| T1 | DXQD 룩업 → H3OI user entry | code=H3OI, source=user | ✅ |
| T2 | H3OI 룩업 → H3OI entry | code=H3OI, source=user | ✅ |
| T3 | XIN QUN DAO 이름 룩업 → DXQD (Phase 2 fallback) | code=DXQD | ✅ |
| T4 | 빈 인자 → null | null | ✅ |
| T5 | TNJP IMO 매칭 (영향 없음) | code=TNJP | ✅ |
| T6 | TNJP callsign 매칭 (영향 없음) | code=TNJP | ✅ |
| T7 | 소문자 dxqd 룩업 | code=H3OI | ✅ |
| C1 | cross-fill: TEST.callsign이 V7XYZ로 보완 | callsign=V7XYZ | ✅ |
| C2 | 같은 배 IMO 매칭 시 user entry 우선 | code=TSTC | ✅ |

수정 전 M6.94.4 시뮬레이션은 T1만 FAIL (사용자 보고 증상 직접 재현).

### 빌드 — PASS
```
vite v6.4.2 building for production...
✓ 4 modules transformed.
dist/assets/index-DHL9-VFg.js  2,891.21 kB │ gzip: 567.06 kB
✓ built in 12.71s
```

## 3대 원칙 점검

- ① **userBayDict 절대 보호**: Phase 1에서 user-source entry 우선 매칭으로 강화. PDF 자동 파싱본이 user entry를 가리는 사고 차단.
- ② **6단계 fuzzy 룩업**: 매칭 로직 1:1 보존. Phase 1/2 양쪽에서 동일하게 적용.
- ③ **시뮬레이션 → PASS → 빌드 → ZIP**: 순서 엄수. 9/9 PASS 후 빌드 PASS 확인 후 ZIP.

## React Hook 규칙 (M6.93.18 사고 재발 방지)

수정한 React 컴포넌트는 `ShipMatrixBuilderModal.jsx` 1개. 변경 위치는 `handleSave` 이벤트 핸들러 내부로 Hook 호출 없음. 기존 Hook 배치(useState/useEffect/useRef/useMemo) 모두 컴포넌트 최상단 유지. 조기 반환문(`if (!matrix) return ...`)은 Hook 선언 이후에 배치 (변경 없음).

## 기존 데이터 마이그레이션

기존 dict에 들어있는 H3OI(user) + DXQD(PDF) 두 entry는 그대로 둬도 정상 동작.
M6.94.5 lookupUserBayDict는 Phase 1에서 H3OI(user) 우선 반환 → 카고플랜에 매트릭스 빌더 정의 18건 반영됨.

원하면 매트릭스 빌더 모달 다시 열어서 "저장" 한 번 누르면, cross-fill로 DXQD entry에도 callsign="H3OI"가 채워져 fuzzy 매칭 안정성 추가 확보.

## 변경 파일 (3개)

```
src/data/userBayDict.js              +71 -56  (2-Phase + cross-fill)
src/shipMatrixBuilder.js             +5  -4   (callsign 인자 + 버전 마킹)
src/components/ShipMatrixBuilderModal.jsx  +8 -3 (handleSave callsign 전달)
```
