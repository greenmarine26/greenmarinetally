# HANDOFF — V7.94 자동 가이드 모드 (2026-06-11)

베이스: GitHub greenmarine26/greenmarinetally V7.93-02 → 이번 작업으로 **V7.94-02**.

## 이번 작업
앱이 크레인 순서대로 다음 컨테이너를 예측 제시하는 **자동 가이드 모드** 신규.
- `src/guidedQueue.js` — 순서 정렬 순수 모듈 (양하: 데크→홀드·위층부터·육상→해상 / 선적: 반대. 접안 방향 파라미터. 짝 없는 20ft 싱글은 양하 끝/선적 처음, 적재 종속 예외 포함).
- `src/components/GuidedWorkPanel.jsx` — 접안 선택(좌/우현, voyage.info.berthSide 저장) → 베이 그룹 선택 → 예측 카드([확인]/[수정]/[수동 전환], 수정 3연속 시 자동 수동 전환, 음성 안내).
- `SearchPanel.jsx` — 상단 🤖자동/✋수동 큰 토글 추가. HelpModal 사용법 등록. 버전 3곳(utils/sw/public sw) V7.94.

## 검증 (절대 원칙 이행)
- ATPR 2627E(양하 222)·2628W(선적 445) 실 EDI — 시뮬 11항목 PASS (사용자 현장 순서 PASS 확정 받음).
- puppeteer + Chrome 실 렌더링: 접안 선택/베이 선택/단독 카드/트윈 카드/토글 화면 PNG 검증, 페이지 에러 0.
- `bash build.sh` 성공, 빌드 JS에 V7.94·가이드 키워드 박힘 확인.

## 다음 후보
- 가이드 모드 현장 실사용 피드백 (순서 미세 조정, 음성 멘트).
- 신규 선박 입력 메뉴 + PDF 자동 파싱 (핵심 미완 과제), .def 파서, PORT-MIS 날짜 동결 영구수정 2종(지침서 7.8).

## V7.94-02 (사용자 피드백 반영)
- 설정 흐름: 장비(호기) 결정 → 좌/우현 결정(confirm 재확인 — 오선택 방지) → 베이 결정. 장비는 헤더/작업보고와 공유(gm_equip_no + equipChanged).
- 설정 칩 바([🏗 N호기][접안][베이]) 항상 표시 — 탭으로 언제든 변경, 접안 변경도 confirm 경유.

## V7.94-03 (사용자 스크린샷 제보)
- X-RAY 상단 0/3 vs 리스트 2 불일치 — 요약 칩을 매칭분 기준으로 통일, 미매칭은 빨강 ⚠N 표시 + 업로드 탭에 미매칭 컨번호 나열(검사 누락 방지). 실 렌더 시뮬 4항목 PASS.

## V7.94-04 (잔존 키 추적)
- X-RAY 업로드가 누적 방식이라 옛 키 잔존 → 업로드 탭에 [🧹 미매칭 삭제] 버튼 추가 (confirm 후 매칭분만 교체 저장).

## V7.94-05 (가이드 카드 정보 보강)
- 카드에 규격/FULL·EMPTY/무게(formatWt)/선사/항로 + 실번호 인라인 확인·수정 + XRAY 번호(E-실 포함) 인라인 입력. 렌더 8항목 PASS.

## V7.94-06 (현장 규칙 메모 반영)
- 40/20 혼재 시 40ft 먼저 = 층 정렬로 이미 충족(무변경, 사용자와 확인). FR 우선양하/마지막선적 단계 구현(물리 제약 예외 포함). 시뮬 8+11항목 PASS.

## V7.94-07 (콘앱 카고플랜 STMJ 조회 실패)
- Firebase 사전을 localStorage에 미러 + shipStructure 캐시 폴백(getFbBayDict) — 콘앱에서 Firebase 전용 선박 카고플랜 가능. 시뮬 3 + 회귀 19 PASS. 폰에서 메인 앱 1회 실행 후 콘앱 사용.

## V7.94-08 (선적 현장 메모 5건)
- 선적 정렬: 싱글→트윈(로우 스택 연속+종속 40ft)→40ft→데크→FR·OT 마지막. 홀드 완료 시 베이 선택 프롬프트. 수정은 위치 재배정(밀려난 컨 자동 미배정+카운터 표시), 트윈은 앞·뒤 동시 수정. 시뮬 28 + 렌더 7 PASS.

## V7.94-09 (위치 수정 개편)
- 남은 자리 선택 그리드(크기 필터) + 트윈 짝꿍 자동 배치(bayPairs) + 배정 후 바로 선적확인. BigResultCard/DetailModal 연결. 렌더·호출 10 + 회귀 28 PASS.

## V7.94-10 (컨번호 수정 + 경고)
- [컨테이너 번호 수정] 버튼(실제 컨 선택→위치 선택창) + 다른 베이·POD 구역 이탈·짝꿍 구역 경고. 훅 순서 함정 2건 수정. 렌더 8 + 회귀 28 PASS.

## V7.94-11 (위치 선택창 베이 우선)
- 베이 먼저 선택 → 그 베이 자리만 (오선적 방지), 완료 자리 ✓회색 비활성 표시. 렌더 8 + 회귀 28 PASS.

## V7.94-12 (MCSN 사전 오염 수정)
- 진상: MCSN=SPIL NIKEN(.def 헤더 확정), V2 entry가 PDF box-region 오염(8척 동일). MCSN entry를 .def(M4.4, 34베이)로 교체 + 오염 패턴·정합성 게이트로 빌더 결합 거부 + bayNo 폴백. 시뮬 36 PASS. MCSN EDI 수령 시 99베이 출처 확인 필요.

## V7.94-13 (MCSN 95베이 종결 + PDF 워커)
- 원인: BAPLIE 위치 미정 코드(99-99-99) 1대가 1~max 채움을 95베이로 부풀림. 99 제외 + 사전 기반 채움 제한 + PDF 워커 public 정적화. MCSN 실EDI = 34베이/추정0 확정. 회귀 36 PASS.

## V7.94-14 (검수원 로그인/작업중 구분)
- 로그아웃 시 fbLogoutInspector(loggedIn:false) 마킹 + inspectorStatus 공용 판정(working/online/null) + 3개 화면 배지(●작업중/○로그인). 시뮬 8 PASS.

## 콘앱 C7.61 (카고플랜 로드 실패 수정)
- 1.6MB 모듈 캐시버스터 제거(?v=__APPV), 재시도 3차, 항차 목록 shallow 경량화. cone.html+public 동시. 모듈 갱신 시 __APPV 같이 올릴 것.

## 콘앱 C7.62 (카고플랜 사전 주입)
- 모듈은 window.__fbShipBayDict 1순위 — 콘앱이 미주입이라 새 기기 매칭 실패(YKTD). openCargoPlanV2에서 v3 주입. puppeteer 3 PASS.

## V7.94-15 (SWRG 풀 테스트)
- 실데이터 전수 교차(XRAY 10·선사 384 일치·LIST 광양 1건 혼입 발견). 수정: guidedQueue oog 인식 + 사전 없는 트리오 구조 선박 4의 배수 추정 금지. 시뮬 10+회귀 44 PASS.

## V7.94-16 (해치커버 프롬프트 통합)
- 가이드: 양하 데크 완료→[오픈→홀드]/[다른 데크], 홀드 완료→[클로즈]/[다른 베이] (보고 자동 발송). WorkReportModal 항차 오표시(equipModeOf) 수정. 시뮬 12+회귀 54 PASS.

## V7.94-17 (PWA 홈화면 404 + 항만 아이콘)
- manifest start_url/scope=/greenmarinetally/ 절대경로, 항만 크레인 PNG 아이콘 3종, apple-touch-icon은 _index.entry.html에 (빌드 생존). puppeteer 7+회귀 66 PASS.

## 콘앱 C7.63 (PWA 설치)
- manifest start_url=/greenmarinetally/cone.html 절대경로, 콘 PNG 아이콘 3종, cone-sw.js 신설+등록(안드로이드 설치 배너). 배포 시 cone-sw.js 동봉 필수. puppeteer 7 PASS.

## 콘앱 C7.64 (설치 scope 충돌 수정)
- 검수앱과 같은 scope라 "이미 설치됨"으로 배너 억제됨. id=/greenmarinetally/cone + scope=cone.html로 분리. puppeteer 6 PASS.

## V7.94-18 (수석 완료 권한)
- 비수석도 완료 저장 가능하던 버그 수정. isChief에 부수석 포함, ChiefDashboard에 inspector 전달, doComplete 권한 차단+경고, 버튼 [🔒 수석 전용] 분기. 권한자 7명. isChief 14+회귀 80 PASS.

## V7.94-19 (페어 인라인 변경)
- 베이매트릭스 짝수 지정을 베이 목록에서 바로 변경(삭제 불필요). updatePairEven(빈값=단독/홀수·범위 거부) + 인라인 입력. sim 9+회귀 89 PASS.

## V7.94-20 (끝4자리 중복 + 위치창 베이 자동선택)
- SWRG BAY38 3523 2대 발견. matchFor 카드위치 우선정렬+중복경고배지, PositionEditModal workBay 자동선택(미배정 컨 재배정 시 베이 재선택 생략). sim 8+회귀 97 PASS.

## V7.94-21 (컨번호 조회 숫자패드)
- 끝4자리 조회칸 3곳 inputMode=numeric (SearchPanel 2 + GuidedWorkPanel 1). 자유질문칸은 text 유지. 미처리 메모: 로우목록 화면(확인 대기).
