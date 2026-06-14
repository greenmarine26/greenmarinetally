# Tallyman Master V7.96 인계서

## 이번 변경 (V7.96) — 통계 탭 "베이사전 미등록" 모순 수정
**증상**: 같은 MCSN인데 베이 탭은 "베이사전 매칭됨 · 34개 베이", 통계 탭은 "베이사전 미등록"으로 모순.

**원인 (데이터 확정, 추측 아님)**: 두 위젯이 서로 다른 함수로 사전을 조회.
- 베이 탭 BayDictStatusWidget → `getShipBayDictData` (Firebase/user/v2/v5 전부 조회) → MCSN 찾음.
- 통계 탭 BayDictVerifyWidget → `lookupBayDict` (정적 내장 사전 SHIP_BAY_DICT만) → MCSN 없음 → "미등록".
- 추가: 옛 위젯은 `bayDef.bays[].idx`(구 .def 구조)를 읽는데, 사용자 매트릭스 데이터는 `baysSummary[].bayNo`에 있어 못 읽음.

**수정 (외과적, src/components/BayDictVerifyWidget.jsx)**: 조회 useMemo만 교체. 표시 JSX 동일.
- `lookupBayDict` → `getShipBayDictData(imo, name, { vslFull, ediBayCount })`로 변경 (베이 탭과 동일 함수).
- 사전 베이 집합 = `baysSummary[].bayNo` (폴백 bayList). 짝수 bay는 pairEven 묶임 처리.
- 호출부(VoyagePage) props 변경 없음. 새 의존성/파일 없음.

**검증 (MCSN 624S 실 EDI)**:
- 모순 해소: "미등록" → "매칭됨" 상태 PASS.
- 매칭률: 실제 경로(`pickBestVariant`)가 두 본 중 `_realBayCount`로 알맹이 본을 골라 **3E39본(34베이) 선택 → 26/26 = 100%**.
  (MCSN 키 22베이 본은 baysSummary에 `bay` 필드 없어 _realBayCount=0 → 빈 깡통으로 제외됨 = 발견① 두 키 분열의 정상 동작.)
- 빌드 JS 검증: 새 문구("베이사전이 없습니다") 1건 박힘 / 옛 문구(".def 파일이 등록되지") 0건.

## V7.95 (직전 누적) — 3D 좌표 매핑 함수 (격자=진실)
src/cargoPlanCore.js 끝에 추가 (화면 변경 없음, 다음 세션 UI에서 사용):
- `buildBayGrid3D` / `fillBayGrid3D` / `resolveBayEntry`.
- MCSN 624S 검증: EDI row↔격자 rowPos 810/810=100%, active좌표 3710=cells합 3710, orphan 0.
- 발견①: 콜사인 `3E3921` 공유, matrix_builder본(3E39, cells 보유) 우선 / ASC 자동본(MCSN, cells 없음) 후순위.

## 다음 세션 (미해결)
1. buildBayGrid3D 출력 → 3D 뷰 컴포넌트(베이 선택 시 빈 격자+실시간 채움).
2. 베이상세 = BayBoxV2 크게 + 페어 trio + 임시창고 리스트. 드래그앤드롭 → fbReassignContainerPosition.
3. rubber-band 영역 선택 (기존 selectionMode 확장).
4. computeBayRenderData cell에 cn 연결 (fillBayGrid3D 패턴 적용).

## 버전
V7.96 (src/utils.js, sw.js, public/sw.js 동기화)
