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
