# Tallyman Master V7.97 인계서

## 이번 변경 (V7.97) — 3D 입체 베이뷰 구현 (베이 탭에서 바로 보임)
V7.95에서 검증·추가한 격자 함수(buildBayGrid3D/fillBayGrid3D)를 실제 화면에 연결.

**위치/사용**: 베이 탭 컨트롤 바의 `3D` 버튼 토글 (전체/단일 토글 옆). 켜면 2D 카고플랜 대신 3D 입체 뷰.
- 전체 뷰: 모든 베이를 입체 카드로 나열. 각 카드 = 베이번호 + 적재율 바 + XRAY/리퍼 배지. 카드 클릭 → 상세.
- 상세 뷰: 데크/홀드 격자를 크게. 칸 = 끝4자리 + 색. 컨 클릭 → 컨테이너 상세. 이동 중이면 빈 칸 클릭 → onCommitMove(위치 변경).

**색 규칙 (2D와 100% 일치)**: BayPlan의 `cellColor`/`getOpColor`를 props로 그대로 받음(재발명 없음).
- XRAY = 셀 배경색(보라), 선사 = 글자색 (V7.32 약속 준수).

**구현 (외과적)**:
- 신규: src/components/BayPlan3D.jsx (전체 뷰 + BayGridDetail 상세 격자).
- BayPlan.jsx 4곳만: import 1줄, view3D state 1줄, 토글 버튼 1개, 렌더 분기 1개(view3D ? 3D : allBaysMode ? 전체 : 단일).
- 베이별 컨 그룹은 자기 bay만 (bay99/999 OOG placeholder 제외 = 이중계산 없음). 페어는 표시만 묶음, 컨은 자기 bay 격자에 매칭.

**검증 (MCSN 624S 실 EDI 811컨)**:
- 격자 채움: 실슬롯 810컨 전부 안착, orphan 0. (bay99 HASU1411466 = OOG placeholder, 정상 제외.)
- 첫 시뮬의 이중계산 버그(짝수 bay를 pairEven으로 합쳐 1553컨) → 원인(짝수 bay가 독립 엔트리+pairEven 양쪽 참조) 추적 후 BayPlan 방식(자기 bay만)으로 수정 → 810 일치.
- 시각 렌더 PASS: BAY17 puppeteer PNG — 데크/홀드 분리, center 정렬, XRAY 보라 배경, 빈 슬롯 점선 확인.
- 빌드 JS에 3D 컴포넌트 문구 박힘 확인.

## 누적 이력
- V7.96: 통계 탭 "베이사전 미등록" 모순 수정 (BayDictVerifyWidget을 getShipBayDictData + baysSummary로 교체).
- V7.95: buildBayGrid3D/fillBayGrid3D/resolveBayEntry 추가 (EDI row↔rowPos 810/810=100%, active좌표 3710=cells합 PASS).

## 다음 세션 (미해결)
1. 베이상세 드래그앤드롭(칸↔임시창고 리스트) → fbReassignContainerPosition. (현재는 클릭 이동만.)
2. rubber-band 영역 선택 (기존 selectionMode 확장).
3. 끝자리 4자리 조회를 3D 상세에서 하이라이트.
4. computeBayRenderData cell에 cn 연결 (fillBayGrid3D 패턴).

## 버전
V7.97 (src/utils.js, sw.js, public/sw.js 동기화)

---

## V7.98 — 두 갈래 V7.97 통합 (3D 뷰 채택 + 수석 베이상세 편집 채택, 거부 모달 폐기)

깃허브 origin/main(다른 세션 V7.97)과 본 세션 V7.97이 같은 버전번호로 갈라져, 취사선택 후 V7.98로 통합.

**채택(origin/main에서 취함)**
- BayPlan3D.jsx + BayPlan 3D 토글 — 베이 탭 `3D` 버튼(기본 OFF). 3D 입체 베이뷰(전체 카드/상세 격자). 색 규칙 2D 동일(XRAY 배경·선사 글자, V7.32). MCSN 624S 811컨 실EDI + PNG 검증됨. onCommitMove/pendingMove는 BayPlan 기존 props 재사용(새 편집 surface 아님).
- BayDictVerifyWidget 수정(V7.96) — 통계 탭 "베이사전 미등록" 모순 버그 픽스.

**채택(본 세션에서 유지)**
- ChiefBayEdit.jsx + ChiefDashboard 통합 — 수석 대시보드의 컨번호 베이상세 편집(오선적 정정). 수석/관리자만, pending→[저장]시 fb 커밋→그때 검수사 반영. (사장님 확정 요구.)

**폐기**
- origin/main의 BayDetailEdit.jsx — "BayBoxV2 마크만 크게" 방식. 사장님이 거부한 접근 + 어느 페이지에도 미연결. 삭제.

**정리**: 두 기능은 파일·위치가 달라 충돌 없음(3D=베이탭 뷰, 편집=수석 대시보드). 버전 V7.98(utils.js/sw.js/public/sw.js 동기화).
