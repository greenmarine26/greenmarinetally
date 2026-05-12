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
