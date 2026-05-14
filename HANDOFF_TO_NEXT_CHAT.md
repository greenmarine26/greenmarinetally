# M5.79 인계 — EDI 보강 + 부킹 슬롯 + 수동 보고

## 🎯 M5.79 핵심 변경 (5개)

### 1. parseBAPLIE LOC+83(환적항) + LOC+97/98(최종지) 추가
- **utils.js** `parseBAPLIE` 함수 보강
- 새 필드: `c.tspot` (Transhipment Port), `c.fpod` (Final Discharge Port)
- 실측: SWRG 양하선 290대 / DPRT 적재선 182대가 LOC+83 사용
- 2단 환적 추적 가능 (예: VNSGN → KRPUS → JPSKT)

### 2. 평택 적재 부킹 슬롯 — 빈 컨번호 임시 ID 보존
- **utils.js** EQD+CN++ (cn 빈값) 처리
- 임시 ID 형식: `__BOOK_{bay}_{row}_{tier}` + 중복 카운터
- 새 필드: `c.isBooking=true`, `c.pendingCn=true`, `c.l4=''` (검색 매칭 차단)
- 새 헬퍼: `isBookingSlot(c)`, `bookingLabel(c)` export
- **이전 M5.78**: cn='' 컨테이너가 `if(!c.cn) return;`로 voucher/검색에서 통째 제외됐음
- **M5.79**: DPRT SI 평택 적재 375대 모두 살아남아 voucher·베이그리드·검수리스트에 정상 표시

### 3. DG UN 코드북 신규 (dgUnDict.js)
- 52개 UN 번호 → 화물명·Class·경고 매핑
- 평택 빈출: UN 1170(에탄올), 1759(부식성), 1805(인산), 1993(인화성), 3268(에어백), 3077(환경유해)
- 실측 발견 누락 보강: UN 1307(자일렌), 1593(디클로로메탄)
- export 함수: `lookupUN`, `formatDgLabel`, `formatDgShort`, `normalizeUN`
- DGS+IMD packaging group(`c.pg`) 추출 (PG I/II/III 위험등급)

### 4. ContainerDetailModal 보강
- **ISO 옵션 21개로 확장** (M3.86 보류 작업 마무리):
  - 22G0/G1, 42G0/G1, 45G0/G1, 22R0/R1, 42R0/R1, 45R0/R1 등 끝자리 0(Full)·1(Empty) 분리
  - 라벨에 "· Full" / "· Empty" 명시
- **부킹 슬롯 헤더**: "📝 컨번호 입력대기" + amber 뱃지
- **DG 상세 박스**: UN 화물명 + Class + PG 위험등급
- **환적/최종지 필드**: LOC+83 tspot · LOC+97/98 fpod 표시
- **2단 환적 경고 박스**: "🔁 2단 환적: VNSGN → KRPUS → JPSKT"

### 5. WorkReportModal 수동 보고 섹션 신규
**사용자 강조 요청**: 시작 안 눌러도 중단/재개/완료 버튼 보이게.

- 메인 화면에 [🔧 수동 보고 (시작 안 누른 작업)] 인디고 버튼 추가
- 신규 `manual` view: 장비 선택 + 모드 선택 + 액션 선택 (중단/재개/완료) + 사유 입력 + 실행
- handlePause/Resume/Done에서 `if (!aw) return;` 가드 제거 → 폴백 객체로 진행
- Firebase 현재 상태 카드 표시 (🟢 진행 / ⏸ 중단 / 📭 기록 없음)
- 카톡 메시지에 `manual: true` 마커 (이력 추적)

**해결 시나리오**:
- (1) 다른 검수원이 시작한 작업을 이어받아 중단/완료
- (2) 한 갱이 먼저 작업 끝나서 시작 기록 없이 완료 보고
- (3) 시작 버튼 못 눌렀던 상황

---

## ✅ 빌드 산출물 검증 (assets/index-DzXBuqGn.js)

| 키워드 | 회수 | 비고 |
|---|---|---|
| M5.79 | 2 | APP_VERSION |
| __BOOK_ | 4 | 부킹 슬롯 임시 ID |
| isBookingSlot | 3 | 헬퍼 |
| tspot | 2 | LOC+83 |
| fpod | 2 | LOC+97/98 |
| 에탄올/인산/안전장치/리튬/환경유해/Class 3 | 모두 포함 | UN 사전 |
| 📝 대기 / 컨번호 입력대기 | 4 | 부킹 라벨 |
| 수동 보고 | 2 | WorkReportModal |
| 이어받기 | 2 | 사용자 강조 시나리오 |
| 한 갱 먼저 완료 | 2 | 사용자 강조 시나리오 |
| 20DC Full / Empty | 각 2 | ISO 옵션 분리 |
| 환적항(83) / 최종지(97) / 2단 환적 | 각 2 | 환적 UI |

## ✅ 통합 시뮬레이션 검증 (실 EDI 파일 기반 6개 시나리오)

**SWRG 2604N 양하선 (BAPLIE 표준)**
- 컨테이너 772대 전부 유지 (부킹 0)
- LOC+83 환적: 290대 추출 ✓
- 2단 환적: 82건 (THBKK→KRPUS인데 실제 QDQDA/PUPUS/JPNAO 등 경유)
- DG 10대 + PG 추출 (UN 1170/1759/3268)

**DPRT 2606S 적재선 SI**
- 컨테이너 876대 전부 유지 → **375대 부킹 슬롯 복구** (M5.78에선 누락)
- 부킹 슬롯 임시 ID 중복: 0건
- LOC+83 환적: 182대
- 2단 환적: 88건 (JPSKT, RUVLA, KRKWY 등 일본·러시아·국내 경유)
- DG 15대 모두 UN 화물명 매칭

**OPERATOR 가드 (M5.78 vs M5.79)**
- M5.78: 평택 적재 375대가 cn[:3]='__B'로 잘못된 선사 코드 매핑 → voucher 양식 오염
- M5.79: 부킹 슬롯 가드로 모두 '?'로 정상 처리 (**375건 잘못된 매핑 차단**)

**voucher bucket 카운트**
- 평택 적재 375대 → 12개 bucket에 정확히 분배 (Full 221 / Empty 154)
- POD별/사이즈별 정확 집계

**검색 매칭 안전성**
- l4='' 가드로 부킹 슬롯이 4자리 검색에 의도치 않게 매칭되지 않음
- 임의 검색 6종 테스트 (9025, 1234, 5678, 0001, 0000, 8082): 부킹 매칭 0건

**inspectionList 행 생성**
- 부킹 슬롯 cn 빈 칸 + 비고에 "📝대기" 표시 — 검수원이 출력물에서 손으로 채울 자리

**UN 화물명 매칭**
- 52개 사전 로드
- 실제 DG 15대 전부 매칭 (UN 1805→인산, UN 1593→디클로로메탄, UN 1307→자일렌 등)

---

## 사용자 작업 (배포)

### A. GitHub Actions 자동 배포 (권장)
1. ZIP 풀기
2. `m579_build/` 폴더의 `src/`, `public/`, `package.json`, `vite.config.js`, `index.html` 등을 GitHub repo에 push
3. main 브랜치에 push되면 `.github/workflows/deploy.yml`이 자동 실행 → 빌드 → GitHub Pages 배포
4. 1-3분 후 사이트에서 새 버전 보임

### B. 수동 배포 (Actions 안 될 때)
1. ZIP의 `dist/` 폴더 내용 (index.html, assets/, sw.js)을 GitHub Pages 배포 경로에 푸시

## 사용자 폰에서 새 버전 안 보이면
1. Ctrl+Shift+R (강제 새로고침)
2. 또는 개발자 도구 → Application → Service Workers → Unregister 후 새로고침
3. 또는 사이트 1시간 후 자동 (SW가 1시간마다 update 확인)

---

## 빌드 함정 메모 (계속 유효)
- `index.html`이 옛 빌드 산출물 (`./assets/index-XXX.js`) 가리키면 vite가 5 modules만 transform → 변경 안 반영
- 매 빌드 전 `build.sh` 실행 (진입점 복원 → 캐시 제거 → vite build → dist→root 복사)
- M5.79 빌드 확인: **1655 modules transformed** ✓

## 알려진 잔여 작업 (다음 단계 M5.80 후보)

1. **베이사전 PEGASUS PROTO 베이 00 등록 점검**
   - DPRT General Plan에 Bay 00 사용 — 베이사전이 정상 베이로 등록했는지 확인
   - `shipBayDict_v2.js`에서 PEGASUS PROTO 항목 baysSummary 점검

2. **부킹 슬롯 OCR 워크플로우**
   - 평택 적재 부킹 슬롯에 사진 + Gemini Vision OCR로 컨번호 채우기
   - 검수 화면에서 부킹 슬롯 카드 long-press → 카메라 → OCR → Firebase 동기화
   - 현재 부킹 슬롯은 표시만 됨. 컨번호 입력 UI는 다음 단계.

3. **voucher 결제용에 부킹 슬롯 표시 형식**
   - OPERATOR '?' 행이 voucher에 나옴 (375대) — "선사 미정 (부킹)" 라벨로 명시할지 정책 결정 필요
   - 현재는 정상 동작 (집계됨, '?'로 그룹화)

4. **HelpModal 검색 키워드 추가**
   - 부킹 슬롯, 2단 환적, UN 화물명, 수동 보고 검색어 추가 (사용자 검색 편의)

---

## 이전 M5.78 hotfix 메모 (참조)
- 카메라 안 켜짐 fix: button onClick → label + input 직접 클릭 방식 (PWA user gesture chain)
- PhotoReportModal `cnInputRef/detailInputRef` 제거
