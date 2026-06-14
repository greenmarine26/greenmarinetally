# Tallyman Master V7.95 인계서

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
