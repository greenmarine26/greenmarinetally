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
