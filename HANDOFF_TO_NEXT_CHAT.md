# M5.55 인계 - voucher 양식 + sw.js fix

## 완료 작업
1. workingReport.js 완전 재작성 (370줄) - DJCF 양식 확정판
2. parseListExcel - 선사부호/TSPORT/PRINTPOD/CARGO TYPE 컬럼 추가
3. **public/sw.js 신규** - service worker (이전엔 파일 자체가 없어서 업데이트 안 됨)
4. HelpModal voucher 매뉴얼 3개 추가
5. **build.sh로 빌드** - vite 진입점 복원 + 캐시 제거 후 빌드 필수

## 빌드 후 검증 결과 (dist/assets/index-Co61nTNB.js)
- M5.55: 2회 ✓
- DJSC (CARRIER_MAP): 2회 ✓
- GREEN MARINE (voucher 제목): 2회 ✓
- tsport (parseListExcel 필드): 2회 ✓
- SNKO: 2회 ✓

## 사용자 작업 (배포)
### A. GitHub Actions로 자동 배포 (권장)
1. ZIP 풀기
2. m555_build/ 폴더의 src/, public/, package.json, vite.config.js, index.html 등을 GitHub repo에 push
3. main 브랜치에 push되면 .github/workflows/deploy.yml이 자동 실행 → 빌드 → GitHub Pages 배포
4. 1-3분 후 사이트에서 새 버전 보임

### B. 수동 배포 (Actions 안 될 때)
1. ZIP의 dist/ 폴더 내용 (index.html, assets/, sw.js)을 직접 GitHub Pages 배포 경로에 푸시

## 사용자 폰에서 새 버전 안 보이면
1. Ctrl+Shift+R (강제 새로고침)
2. 또는 개발자 도구 → Application → Service Workers → Unregister 후 새로고침
3. 또는 사이트 1시간 후 자동 (SW가 1시간마다 update 확인)

## 검증된 데이터 (DJCF 0145N&0146S)
- DISCH 199, LOAD 255 사진 양식과 100% 일치
- 선사: SKR 62, NSL 47, DJS 134, HAS 9, HSL 3
- DJS DONGJIN 양식 (D2/D5, Cargo Type F/P) 인식
- NSL JDCF 양식 (BL prefix BSE→PUS, HCC→SGN, LCC→LCH) 인식
- SKR 마스터 TSPORT 우선 처리 (KAN 환적 12대 정확)

## 이전 빌드 함정 메모
- index.html이 옛 빌드 산출물 (./assets/index-XXX.js) 가리키면 vite 7 modules만 transform → 변경 안 반영
- 매 빌드 전 build.sh 실행 또는 수동으로:
  1. index.html 진입점 복원 (`/src/main.jsx`)
  2. dist + node_modules/.vite + 옛 assets 삭제
  3. npm run build

## M5.55 추가 fix #2
- **voucher 버튼 안 보임 문제 해결** — PrintHubModal에서 voucher 버튼이 `{count === 0 ? ... : (...)}` 조건 안에 있어서 현재 모드(양하/선적)에 데이터 없으면 안 보임
- **수정**: voucher 버튼을 항목 리스트 최상단으로 이동 + 항상 표시 (mode 무관)
- 노란 강조 색상 적용 (border-amber, bg-amber-900/30) — 다른 버튼과 시각적 구분

## M5.56 - voucher 두 가지 모드
- **결제용 (settlement)**: EDI/LIST 전체 컨테이너로 voucher 생성 (작업 완료 가정) — 선사 제출용
- **작업용 (actual)**: records에 등록된 (실제 검수 완료) 컨테이너만 — 현장 진행 확인용

### 구현
- workingReport.js: `buildBuckets(voyage, mode)` + `generateVoucherHTML(voyage, mode)` + `openWorkingReportPrint(voyage, info, mode)`
- mode='actual'이면 voyage.records의 cn에 있는 컨테이너만 필터링
- subtitle에 "— 작업용 (현재 진행)" 표시 (actual 모드)

### UI
- PrintHubModal에 두 버튼:
  - 🟡 "📄 FINAL WORKING REPORT (결제용)" — amber 색상
  - 🔵 "📄 FINAL WORKING REPORT (작업용)" — blue 색상
- 항목 리스트 최상단, 양하/선적 모드 무관 항상 표시

### 빌드 검증
- M5.56: 2회 / settlement: 2회 / 결제용/작업용: 5회 — 모두 dist 반영 ✓

## M5.57 - voucher 빈 화면 원인 fix
- **원인**: 실제 voyage 구조는 `voyage.discharge.ediContainers` / `voyage.loading.ediContainers` 객체. 내 코드는 `voyage.disch / voyage.load`로 찾아서 빈 화면.
- **수정**: 
  - voyage.discharge.ediContainers / voyage.loading.ediContainers 객체에서 Object.values()로 컨테이너 추출
  - 작업용(actual): section.records의 cn 기준 필터링 (전체 voyage.records 아님)
  - processContainers 함수 인라인 처리로 변경

## M5.58 - voucher LIST 기반 계산
- **이슈**: M5.57은 ediContainers 전체 사용 → 선박 전체 컨테이너 포함 (평택 외도)
- **수정**: LIST 기반(section.records) 사용
  - 결제용(settlement): section.records의 모든 cn (LIST = 평택 대상)
  - 작업용(actual): section.completed의 cn (실제 작업 완료)
  - records 비어 있으면 ediContainers의 PTK 필터로 폴백
  - 컨테이너 데이터: records 우선 + ediContainers 보강 (병합)

## M5.59 - 선박 이름 + 선사 매핑 fix
- **선박 이름 안 나옴**: info.vesselName 사용 → 실제 필드 info.vsl 로 수정
  - vesselName: info.vsl || info.vessel || info.vesselName || 'VESSEL'
  - voyNo: info.voy 등
  - info 폴백: voyage.info → voyage.discharge.info → voyage.loading.info
- **선사 매핑 안 됨**: records의 빈 op(''')가 EDI의 op('DJS')를 덮어쓰는 버그
  - 이전: `{...ediC, ...recC}` — recC의 모든 필드(빈 값 포함) 덮어씀
  - 수정: 빈 값(null/undefined/'')은 덮어쓰지 않음. EDI 데이터 보존
- 우선순위: records 채워진 값 > EDI 데이터 > cn prefix

## M5.60 - 검수리스트 + voucher 선사 매핑 통일
- **이슈**: 같은 컨테이너가 검수리스트엔 "DJSC", voucher엔 "DJS"로 다르게 표시
- **원인**: 검수리스트는 `c.op` 그대로, voucher는 CARRIER_MAP 변환 적용
- **수정**: inspectionList.js에 normalizeCarrier 함수 추가 (voucher와 동일 매핑)
  - DJSC → DJS, NSSL → NSL, HASL → HAS, SNKO → SKR, HSLI → HSL
  - 우선순위: c.op > BL prefix > cn prefix
- 결과: 검수리스트와 voucher의 선사가 동일하게 3자 약어로 표시

## M5.61 - 검수원 이름 정확 매칭 + 현 접속자 명단
### 정확한 이름 매칭
- **이슈**: "이종현"과 "이종현 ,"가 다른 사용자로 등록됨
- **수정**: InspectorModal에 normalizeName + handleAdd 강화
  - 한글/영문/숫자만 허용 (2~10자), 특수문자 차단
  - 정규화(공백/콤마/마침표/대시/언더바/슬래시 제거 + 소문자) 후 기존 사용자와 비교
  - 정규화 같지만 표기 다르면 기존 이름으로 통합 (사용자 확인)
  - 신규 이름은 추가 전 확인 다이얼로그

### 현 접속자 명단 (헤더)
- InspectorModal 상단에 "● 현재 N명 작업중: 이름1, 이름2" 표시 (emerald 색상)
- 60초 내 활동한 검수원 기준 (기존 lastActive 로직)
- 다른 폰으로 새 접속 시 자기 이름 선택 → 진입 후 다른 작업자 누구 있는지 즉시 확인 가능

## 미해결 (다음 단계)
- **회사 직원 화이트리스트** — 사용자가 직원 이름 명단 제공해야 적용 가능
  - 명단 받으면 src/staffList.js에 export const STAFF_NAMES = [...] 형태 등록
  - InspectorModal handleAdd에서 STAFF_NAMES.includes(norm) 검사 추가
  - 명단 외 이름 접속 차단

## M5.62-M5.63 — 직원 화이트리스트 + 관리자 권한
### staffList.js (29명 그린마린 직원 명단)
- 임원: 최관묵(회장), 신성호(대표이사), 표인수(상무이사), 황창웅(이사)
- 부장~과장 8명, 대리 4명, 검수 13명
- isStaff(name) / getStaffRole(name) / isChief(name) export

### InspectorModal 화이트리스트 검사
- 정확한 이름만 접속 ("이종현 ,"같이 콤마/공백 변형 차단)
- 명단에 없으면 alert + 비슷한 이름 힌트
- 정규화(공백/콤마/마침표 등 제거) 후 비교
- 직책 표시 (이름 아래 작은 글씨)

### 관리자(김성일) 전용 권한
- ADMIN_NAME = '김성일' (코드 상수)
- **삭제**: 다른 검수원 옆에 🗑 버튼 (Firebase inspectors 노드 + staffList 노드)
- **추가**: 명단 외 새 직원 추가 (Firebase staffList 노드에 영구 저장 — 전 직원 접속 가능)
- 다른 사람이면 화이트리스트 검사 필수, 명단 외 입력 시 차단

### Firebase 동적 명단 (M5.62)
- fbAddStaff(name, role) — 신규 직원 추가
- fbDeleteStaff(name) — 명단 삭제
- fbSubscribeStaffList — 실시간 구독
- 코드 STAFF_NAMES + Firebase extraStaff 합쳐서 화이트리스트
- 새 직원 입사 시 김성일이 추가 → 즉시 전 직원 접속 가능

## M5.633 - CARRIER_MAP 추가 매핑
- DWIC → DWS
- EAS → EASK
- TJM → TJMS
- WDF → WDFC
- SCLK → SIT
- workingReport.js + inspectionList.js 양쪽 동기화
- HelpModal 매핑 정보 갱신

## M5.634 - voucher 항차 표시 양하+선적 통합
- 이전: info.voy 단일 항차만 표시 (양하 또는 선적)
- 수정: voyage.discharge.info.voy + voyage.loading.info.voy 둘 다 가져와서 합침
  - 둘 다 있고 다르면: "0145N & 0146S"
  - 양하만: "0145N"
  - 선적만: "0146S"
  - 둘 다 같으면 한 번만

## M5.64 - voucher 입력 폼 (선적 항차 + BERTH 수동 입력)
- 이슈: 양하 항차만 자동 인식, 선적 항차 누락. BERTH도 정보 부족.
- 수정: PrintHubModal의 voucher 버튼을 입력 폼으로 변경
  - 양하 항차 input (자동값 + 수정 가능)
  - 선적 항차 input (자동값 + 수정 가능)
  - BERTH input
  - [📄 결제용] / [📄 작업용] 두 버튼 — 입력값 overrides로 전달
- workingReport.js: openWorkingReportPrint(voyage, info, mode, overrides) — overrides {dischVoy, loadVoy, berth, date}

## M5.65 - voucher 사이즈 인식 fix (40HC를 40으로 잘못 분류)
- 이슈: NSL JDCF의 SZTY '4HDC'/'4HRF'가 first='4', second='H' (≠'5')로 '40' 잘못 분류
- 수정: SZTY 양식 우선 검사 (includes 매칭이 먼저)
  - '4H' / '40HC' / '45' 패턴 → HC
  - 'L' 시작 → 45
  - '20' 시작/포함 → 20
  - '4' 시작 (HC 매칭 안 됨) → 40
- 결과: 4HDC/4HRF/40HC 모두 HC로 정확 분류

## M5.66 — 모든 출력물 3가지 옵션 (인쇄/PDF/엑셀)
### 공통 헬퍼 src/printHelper.js
- openPrintWindow(html, title) — 새 창 열고 자동 toolbar 주입
- injectPrintToolbar(w) — 기존 창에 toolbar 추가
- TOOLBAR_HTML/CSS/JS — 재사용 가능 상수

### 적용된 출력물
- workingReport.js (voucher 결제용/작업용) — openPrintWindow 사용
- inspectionList.js (검수리스트) — openPrintWindow 사용
- PrintableCargoPlan.jsx (카고플랜) — 페이지 내 3개 버튼
- PrintableBayDetail.jsx (베이상세) — 페이지 내 3개 버튼

### Toolbar 구성
- 🖨 프린터 인쇄 (emerald) → window.print()
- 📄 PDF 저장 (sky) → 인쇄 대화상자 + 안내 alert
- 📊 엑셀 다운로드 (amber) → SheetJS CDN 동적 로드 + table_to_sheet
- ✕ 닫기 (slate)

### 엑셀 다운로드 동작
- 페이지 내 모든 table 자동 감지 → 각각 시트로
- 파일명: {title}_{날짜}.xlsx
- @media print 에서 toolbar 자동 숨김

### 다른 인쇄 함수 (미적용 — 차후 단계)
- EmptySealReport, WorkClosingChecklist 등은 React 컴포넌트 형식 — 필요시 동일 패턴 적용 가능

## M5.661 hotfix — voucher에 엑셀 옵션 안 나오던 문제
- 원인: openWorkingReportPrint가 옛 코드 그대로 (window.open + write + 자동 print). printHelper 적용 안 됨.
- 수정: openPrintWindow(html, 'FINAL_WORKING_REPORT') 사용 + import 추가
- 결과: voucher 새 창에 toolbar (인쇄/PDF/엑셀/닫기) 표시

## M5.67 - voucher 사이즈/목적항 EDI 우선
- 이슈: voucher의 사이즈(40 vs HC) + 목적항(POD)이 EDI와 다름
- 원인: LIST(records) 데이터가 EDI 위에 덮어씀 → LIST의 부정확한 ISO/POD 사용
- 수정 (workingReport.js만):
  - 컨테이너 필터: records (LIST 평택 대상) 그대로
  - 컨테이너 속성: **EDI 우선** (POD/ISO/OP 정확)
  - LIST에만 있는 컨테이너(33개)는 LIST 데이터 사용
  - 검수리스트는 records 그대로 (다른 곳에선 변경 없음)
- 결과: voucher의 사이즈/목적항이 EDI와 일치

## M5.68 - voucher 양식 fix (E 정렬 + Remarks 비율)
### 1. Total E 행 컬럼 정렬 오류
- 원인: 빈 행의 OPERATOR rowspan="3"이 고정값. 빈 행 갯수가 3의 배수 아니면 마지막 그룹 rowspan이 Total 행 침범 → E 셀이 OPERATOR 위치로 밀려남
- 수정: 마지막 그룹 rowspan을 남은 행 수에 맞춰 동적 조정 (`Math.min(3, needed - idx)`)

### 2. Remarks 박스 좌우 비율
- 원인: bottom-row가 1fr 1fr (50/50). 표의 DISCH/LOAD 경계는 약 46/54 (OPERATOR+PORT+F/E+DISCH 7컬럼 : LOAD+SHIFT 8컬럼) → 경계 불일치
- 수정: grid-template-columns 7fr 8fr (표 컬럼 비율과 정확히 일치)

## M5.69 - 선사 약자 3자 영구 규칙
### 영구 규칙
- voucher OPERATOR / 검수리스트 선사 = **항상 3자**
- 4자 약자는 앞 3자만 표시 (뒷자리 자름)

### CARRIER_MAP 정정 (4자 → 3자)
- EASK → EAS (이전 잘못: EAS→EASK)
- TJMS → TJM (이전 잘못: TJM→TJMS)
- WDFC → WDF (이전 잘못: WDF→WDFC)
- DWIC → DWS, SNKO → SKR, DJSC → DJS 등 기존 3자 유지

### normalizeOp / normalizeCarrier 3자 강제
- to3 헬퍼: String(s).slice(0, 3).toUpperCase()
- CARRIER_MAP 매핑된 값은 이미 3자 → 그대로
- 매핑 안 된 값은 앞 3자만
- workingReport.js + inspectionList.js 양쪽 동기화

## M5.70 - PORT-MIS 캡처 Gemini 키 자동 폴백
- 이슈: PortMisCaptureModal이 localStorage(_storage)의 키만 확인 → 사용자가 직접 입력 안 했으면 "Gemini API 키 없음" 에러
- 수정: src/gemini.js의 GEMINI_API_KEY를 폴백으로 사용
  - 사용자 입력 키 우선 (커스텀 키 있으면)
  - 없으면 내장 키 사용 → 별도 설정 불필요
- 결과: 별도 설정 없이 PORT-MIS 캡처 → OCR 즉시 작동

## M5.71 - PORT-MIS 매칭 강화 + 디버그
### 5단계 매칭 (기존 4단계 + 정규화)
1. callsign 정확
2. callsign prefix
3. IMO
4. 선박명 includes
5. **선박명 정규화 매칭 (M5.71 신규)** — 공백/특수문자 제거 + 5자 이상 부분 일치

### 매칭 실패 시 디버그 카드
- "⚠ PORT-MIS 매칭 미확인" orange 카드 표시
- 현재 선박명 + 콜사인 + PORT-MIS 후보 3개 표시
- 사용자가 어떤 선박이 안 매칭되는지 즉시 파악
- 베이사전 callsign/선박명 정정하면 자동 매칭

### 다음 단계 (사용자 필요 시)
- 어떤 선박이 매칭 안 되는지 알려주시면 그 선박 callsign 정확 등록
- shipBayDict_v2.js 또는 dictShipMeta에 추가

## M5.72 - PORT-MIS 베이사전 풀네임 매칭
### 이슈
- 앱 voyage.info.vsl = 약자 "DJCF"
- PORT-MIS vesselName = 풀네임 "DONGJIN CONFIDENT"
- 약자-풀네임 매칭 안 됨

### 해결
- 베이사전(SHIP_BAY_DICT_V2)의 name 필드에 풀네임 포함됨 (예: "DJCFDONGJIN CONFIDENT D7XF 4")
- 매칭 6단계 추가: 베이사전 name과 PORT-MIS vesselName 정규화 매칭
- dictData.name 안에 portMisData.vesselName 포함되거나, PORT-MIS 풀네임이 dictData.name의 코드(4자) 다음 부분과 매칭

### 6단계 전체 매칭 순서
1. callsign 정확 매칭
2. callsign prefix
3. IMO
4. 선박명 includes
5. 선박명 정규화 (M5.71)
6. **베이사전 풀네임 매칭 (M5.72 신규)** — 약자↔풀네임 변환

매칭 실패 시 orange 디버그 카드로 PORT-MIS 후보 표시 (M5.71)

## M5.73 - 인원 관리 별도 모달 분리
### 이슈
- InspectorModal 안에 관리 권한 통합 → 삭제 버튼 사라지는 등 충돌
- 사용자 요청: 관리 모드 별도 분리

### StaffManagerModal.jsx (신규)
- 김성일 접속 시 헤더 우측 [⚙ 관리] 버튼 표시
- 전체 직원 명단 (STAFF_LIST 29명 + Firebase staffList 동적)
- 필터: 전체 / 현재 접속만
- 신규 직원 추가 (이름 + 직책 선택: 검수/대리/과장/차장/부장)
- 명단 삭제 (🗑 영구 — extraStaff + inspectors 둘 다)
- 접속 기록만 제거 (🔄 — inspectors만, 명단 유지)
- 관리자 본인 보호 (자기 삭제 불가)
- 동적 추가된 직원 [추가됨] 라벨 표시

### InspectorModal 단순화
- 화이트리스트 검사만 (선택 전용)
- 관리 권한 모두 제거 → StaffManagerModal로 이동
- 삭제 버튼 제거 (현재 검수원 카드 단순)
- 권한 충돌 가능성 사라짐

## M5.74 - 퇴사자 처리 (deletedStaff 마커)
### 이슈
- 이전: fbDeleteStaff는 Firebase staffList에만 작동 → 코드 STAFF_LIST 29명은 삭제 불가
- 결과: 퇴사자가 코드 명단에 있으면 그대로 표시 + 접속 가능

### 수정 (deletedStaff 마커 방식)
- 새 Firebase 노드: `deletedStaff/{name}` — 퇴사자 마커
- 코드 명단 + 동적 명단 모두에 적용 가능
- 삭제 시: extraStaff(있으면) + inspectors + deletedStaff 마커 추가
- 화이트리스트(InspectorModal) + 명단(StaffManagerModal)에서 자동 제외

### UI 갱신
- 필터 탭: 재직 / 접속 / **퇴사** (3개)
- 퇴사자 카드: [퇴사] 빨강 라벨 + [복구] 버튼 (emerald)
- 영구 삭제가 아닌 마커 — 실수해도 복구 가능

### firebase.js 신규 함수
- fbMarkDeletedStaff(name) — 퇴사 처리
- fbUnmarkDeletedStaff(name) — 복구
- fbSubscribeDeletedStaff(cb) — 실시간 구독

## M5.75 - 검색 작업 모드 분리 (양하/선적/완료)
### 이슈
- 양하 작업 중에도 선적 컨테이너 검색됨 (혼란)
- 완료된 컨테이너도 검색되어 같은 컨테이너 중복 처리 위험

### 수정 (SearchPanel.jsx)
- 새 탭 3개 추가: ⬇ 양하 작업 / ⬆ 선적 작업 / ✓ 완료
- 각 탭에 대기 갯수 표시 (실시간)
- 필터링 로직:
  - 양하 작업: _mode === 'discharge' && !_comp
  - 선적 작업: _mode === 'loading' && !_comp
  - 완료: _comp (양하+선적 모두)
- SingleSearch + TwinSearch에 filteredContainers 전달 (allContainers 그대로 X)

### UI 색상
- 양하: rose-700 (붉은계열)
- 선적: sky-700 (파란계열)
- 완료: emerald-700 (녹색)

기존 싱글/트윈 탭은 그대로 유지 (작업 모드와 별개)

## M5.76 - 작업 중단 외부 요인 + 빠른 선택
### pause 화면 (양하/선적 중단)
- 사유 빠른 선택 버튼 6개: 장비 고장 / 강풍 대기 / 안개 대기 / 우천 대기 / 화물 이상 / 점심 식사
- 직접 텍스트 입력도 가능 (기타 사유)

### 메인 화면 [⚠ 작업 중단 (외부 요인)] 추가
- 작업 시작 안 한 상태에서도 보고 가능
- 사유: 장비 고장 / 강풍 대기 / 안개 대기 / 우천 대기 / 항만 사정 / 기타
- 기타 선택 시 세부 사유 입력
- 카톡 공유 + Firebase external_pause 저장

## M5.77 - 데미지/실오류 사진 2장 필수
### PhotoReportModal 변경
- 사진 1장 → **2장 필수** (각각 별도 촬영 슬롯)
- 데미지: (1) 컨테이너 번호 (2) 데미지 부분
- 실오류: (1) 컨테이너 번호 (2) 액츄얼 실
- 두 장 모두 촬영 안 하면 전송 불가 (alert)
- 촬영 완료 후 ✓ 라벨 + 다시 촬영 버튼

### kakaoShare.js
- shareWithPhoto가 배열도 받게 (호환성)
- 첫 장 우선, 나머지는 Web Share API multi-file 시도

### Firebase 저장
- fbAddPhotoReport에 detailPhoto (base64) 추가
- 두 장 모두 영구 저장
