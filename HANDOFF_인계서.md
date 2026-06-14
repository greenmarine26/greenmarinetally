# Tallyman Master V7.98-03 인계서

## 이번 변경 (V7.98-03) — 베이상세 편집(ChiefBayEdit) 매트릭스 격자 통일
**증상**: 베이상세 편집 화면에서 매트릭스 정보를 못 받는(폴백되는) 베이가 다수.

**원인 (데이터 확정)**: ChiefBayEdit이 row 폭을 `rowMaxEven/rowMaxOdd` 필드로만 잡았음.
- 그런데 matrix_builder본은 deckCells/holdCells만 저장하고 rowMax는 안 저장.
- 결과: 전 1949베이 중 **695베이(36%)가 매트릭스 정보(deckCells)를 보유함에도 rowMax 없어 8/7 균일 폴백**.
- MCSN(3E39) 거의 전 베이가 이 경우 — 매트릭스 완벽한데 8칸으로 잘못 그려짐.
- (다른 클로드가 "36척 deckCells 균일"로 오판한 원인도 이것 — rowMax 기준이라 비균일성을 못 봄. 실제론 비균일 79베이 존재: MCSN bay44 deck[12..10] 등.)

**수정 (외과적, src/components/ChiefBayEdit.jsx)**: 격자 모양을 매트릭스 진실원으로 통일.
- view에 matrixRender 추가: deckCells/holdCells 유효하면 `buildEmptyBayRenderData`(3D·카고플랜과 동일 함수)로 tier별 active cell·가운데 정렬·좁아짐 정확히 그림.
- **컨번호 유지**: 격자 "모양"만 매트릭스에서 가져오고 칸 내용은 컨번호 그대로(베이상세 존재 이유). 마크(o/R) 안 씀.
- cells 없는 PDF 자동본(DXQD 등)은 기존 uniform 폴백 유지.
- 드래그·저장·권한·임시창고·rubber-band 전부 그대로. cellMap[tier-row] 컨 매칭도 동일.

**검증 (MCSN 624S 실 EDI)**:
- bay44(좁아짐): matrixRender 생성 PASS, T94~82=12칸·T80=10칸 정확, 컨 58개 전부 active cell 매칭.
- 적용 범위: 695베이(27선박) 매트릭스 정확 적용 / cells 없는 1254베이(56선박) uniform 폴백(회귀 없음).
- 시각 렌더 PASS: bay44 puppeteer PNG — 맨아랫단만 10칸 좁아짐 + 컨번호 표시 확인.
- 빌드 JS에 matrixRender 박힘.

**일관성**: 이제 베이상세 편집·3D 뷰·카고플랜·베이플랜이 모두 buildEmptyBayRenderData 단일 진실원 사용(발견②③ 원칙 충족).

## 누적 이력 (V7.95~)
- V7.97: 3D 입체 베이뷰 + 수석/관리자 전용 권한 게이트(isChief + 대시보드 경유).
- V7.96: 통계 탭 "베이사전 미등록" 모순 수정.
- V7.95: buildBayGrid3D/fillBayGrid3D/resolveBayEntry (EDI row↔rowPos 810/810=100%).

## 다음 세션 (미해결)
1. 인쇄용 PrintableBayDetail도 동일 매트릭스 격자로 통일 (active/invisible cell 맞춘 CSS 조정 필요).
2. rubber-band 영역 선택 (이미 ChiefBayEdit에 일부 구현됨 — 검증 필요).
3. 끝자리 4자리 조회를 베이상세/3D에서 하이라이트.

## 버전
V7.98-03 (src/utils.js, sw.js, public/sw.js 동기화)
