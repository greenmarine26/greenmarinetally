# Tallyman Master V7.95-02 인계서

## 이번 변경 (V7.95-02) — 통계 탭 베이사전 위젯 데이터소스 통일 (버그 수정)
**증상**: 같은 선박(MCSN)인데 베이 탭은 "베이사전 매칭됨", 통계 탭은 "베이사전 미등록" — 두 화면 모순.
**원인 (데이터 확정)**: 통계 탭 `BayDictVerifyWidget`이 옛 `lookupBayDict`(정적 .def 내장 사전 `SHIP_BAY_DICT`만 조회)와
`bayDef.bays[].idx`(.def 전용 필드)를 사용. Firebase/매트릭스 빌더 등록분(MCSN=3E39, baysSummary 보유)은
정적 사전에 없어 "미등록", 설령 찾아도 bays[]가 비어 매칭률 0%. 베이 탭 `BayDictStatusWidget`은
`getShipBayDictData`+`baysSummary`를 써서 "매칭됨"이 맞음.
**수정 (외과적, BayDictVerifyWidget.jsx 한 파일)**
- 조회 함수 `lookupBayDict` → `getShipBayDictData(imo, name)` (베이 탭과 동일 — Firebase/user/v2/v5 fuzzy 포함).
- 베이 집합 `bayDef.bays[].idx` → `bayDef.baysSummary[].bayNum` (matrix_builder 구조).
- 매칭에 짝수(40ft 페어) 베이 ±1 보정 추가 (앱 pairEven 모델 — 짝수는 인접 홀수로 표현 가능).
- 화면 문구 ".def" → "베이사전"으로 정확화 (조회 소스가 .def 전용이 아님).
**검증**: 위젯 매칭 로직 합성 단위테스트 7/7 PASS (등록 매트릭스 26베이→매칭됨 100%, null→미등록,
짝수 페어 ±1 매칭, 과매칭 없음, 옛 0% 케이스→100%). `bash build.sh` PASS — 빌드 JS에 V7.95-02 + 새 위젯 문구 박힘.
- ⚠ 실 MCSN EDI/JSON 재업로드 시 동일 시뮬 재확인 가능 (이번 턴 미업로드 — 합성 구조 검증으로 대체).
**버전**: 버그 수정이므로 지침서 2.5 규칙대로 V7.95-02 (V7.96은 기능 추가용).

## 이번 변경 (V7.95) — 3D 좌표 매핑 기반 함수 추가 (격자=진실)
3D 입체 카고플랜·베이상세 드래그 편집의 토대인 좌표 매핑 함수 3종을 cargoPlanCore.js에 추가.
EDI에서 좌표를 역산하지 않고, 검증된 진실원 `buildEmptyBayRenderData` 출력을 좌표로 사용한다.

**추가 함수 (src/cargoPlanCore.js 끝)**
- `buildBayGrid3D(bayEntry, bayKey, isPair)` : 빈 3D 격자 좌표 생성.
  각 active cell = { bay, layer('deck'|'hold'), tier, rowLbl, colIdx, cn:null }.
  x=colIdx(center 정렬 화면 컬럼, 라벨 rowLbl), y=tier, z=bay.
- `fillBayGrid3D(bayEntry, bayKey, containers, isPair)` : EDI 컨테이너를 격자에 채움.
  매칭 키 `${tier}|${rowLbl}` (rowLbl = EDI row 2자리 padStart). 반환 { rd, cells, placed, emptyActive, orphans }.
- `resolveBayEntry(bayList, bayNum)` : 짝수 bay를 pairEven으로 묶인 홀수 bay 엔트리로 해석.
  baysSummary(list)·bays(dict) 양쪽 지원. 모든 선박 범용.

**검증 (MCSN 624S 실 EDI 811컨, OOG placeholder 1 제외 810컨)**
- EDI row ↔ 격자 rowPos 매칭: **810/810 = 100% PASS** (지침서 "11.9%"는 격자 버그 아님 — 단순 숫자비교 탓이 데이터로 확정).
- 전 34베이 active 좌표 3710 = cells 합 3710 (**발견② 기준 100% PASS**).
- 격자 채움 무결성: 810컨 전부 active셀 안착, **orphan 0**.
- 끝자리 4자리 조회 위치 정확.
- 시각 렌더 PASS (BAY17 puppeteer PNG — 데크/홀드 분리·center 정렬·빈칸/채움 구분 확인).
- 범용: cells 보유 matrix_builder본 PASS. PDF 자동본(cells 없음)은 기존 경로 사용.

**발견① 재확인 (두 키 분열, 데이터 확정)**
- 콜사인 `3E3921` 공유. `3E39`(matrix_builder, 34베이, cells 완비) 100% / `MCSN`(ASC 자동본, 22베이, cells 없음) 0%.
- 조회 시 source='user'/sourceFile='matrix_builder'(cells 보유) 본을 ASC 자동본보다 우선.

**구현 (외과적)**
- src/cargoPlanCore.js 끝에 함수 3종 추가만. 기존 함수·호출부 변경 없음. 새 의존성/파일 없음.
- 기존 buildEmptyBayRenderData/getRowPositions/getActiveColsSymmetric 그대로 재사용.

## 다음 세션 (미해결)
1. buildBayGrid3D 출력 → 3D 뷰 컴포넌트(베이 선택 시 빈 격자+실시간 채움) UI 작성.
2. 베이상세 = BayBoxV2 크게 + 페어 trio + 임시창고 리스트. 드래그앤드롭 → fbReassignContainerPosition.
3. rubber-band 영역 선택 (기존 selectionMode 확장).
4. computeBayRenderData cell에 cn 연결 (드래그 식별용 — fillBayGrid3D 패턴 적용 가능).
5. KSKM 등 일반선 범용 렌더 확인.

## 버전
V7.95 (src/utils.js, sw.js, public/sw.js 동기화)

---

## V7.96 — 베이상세 드래그 편집 (신규 기능)

수석 검수사가 베이상세에서 컨테이너를 **마우스 드래그**로 임시창고↔베이 이동. 새 백엔드 로직 없음 — 기존 함수 재사용, 마우스 입력만 추가.

**진입**: 베이 탭 우측 상단 `🖐 베이 편집 (드래그)` 버튼 → 모달.

**구성/동작**
- 카고플랜 `BayBoxV2`를 그대로 크게 표시(별도 격자 작성 안 함). 페어는 trio(상단 홀수 + 구분선 + 짝수).
- 상단 베이 버튼으로 베이 전환.
- **드래그**: 베이 칸 컨 → 임시창고(드롭존) = `fbBatchMoveToStorage`(__STG__). 임시창고 칩 → 베이 칸 = `fbSetActualPosition`.
  - 페어 칸에 배치 시 대상 베이는 컨 사이즈로 결정(40/45→짝수, 20→홀수).
- **영역(rubber-band) 선택**: 베이 빈 곳에서 마우스 드래그 → 사각 범위 내 컨 일괄 선택 → `선택분 → 임시창고`.
- 임시창고 목록 = 기존 `storedContainers`(선적 모드 _in_storage). 양하 모드에선 비어 있음(보관함=선적 개념).

**구현 핵심**
- `cargoPlanCore.js` `buildBayMarks`가 self 컨테이너 cn을 (tier|row)별 반환 → `computeBayRenderData` 셀에 `cn` 부착(기존 cn:null 해결). 드래그 식별 기반.
- `PrintableCargoPlanV2.jsx` `BayBoxV2`에 옵션 props 추가(editable/onCellDrop/onCellDragStart/selectedCns) — **기본 off → 카고플랜/매트릭스 동작 무변경**. `getMarkV2` export.
- `src/components/BayDetailEdit.jsx` 신규 — 카고플랜과 동일 prep(getShipBayDictData→matrixBays→autoPairBays→generatePdfBays→buildPosMap→computeBayRenderData)으로 한 베이 렌더 + 임시창고 + 드래그/영역선택.
- `VoyagePage.jsx` 베이 탭에 버튼 + 모달 마운트(콜백을 기존 fb 함수에 연결).

**검증(PASS)**: 편집 BayBoxV2 렌더(draggable/data-cn/선택표시/마크) + 비편집 무영향 14/14, cell↔cn 5/5, 빌드(V7.96).
**실기기 확인 필요**: 실제 HTML5 드래그 제스처·영역선택은 브라우저 상호작용이라 앱에서 동작 확인 권장(핸들러·렌더·백엔드는 검증됨).

**같이 포함된 수정**: V7.95-02 — 통계탭 "베이사전 미등록" vs 베이탭 "매칭됨" 모순 버그 fix (BayDictVerifyWidget가 getShipBayDictData 기준 + 짝수베이 ±1 매칭).
