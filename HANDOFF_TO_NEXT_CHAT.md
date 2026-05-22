# Tallyman Master 핸드오프 — M6.83

## 📌 현재 상태 (2026-05-22)

- **최신 버전**: **M6.83** (베이플랜·베이상세 baseline 통합)
- **이전 버전**: M6.82 (PrintableCargoPlan baseline + Special Cargo 페이지)
- **작업 디렉토리**: `m6_83_build/`

---

## 🚨 M6.82 화면 먹통 원인 + 해결

### 원인
M6.82 ZIP 처음 받았을 때 화면 안 열림 → 분석 결과:
- `build.sh`는 5단계로 구성됨
  1. index.html을 진입점 형태로 복원 (`/src/main.jsx`)
  2. dist/ 캐시 제거
  3. npm install
  4. vite build → dist/ 생성
  5. **dist/index.html과 dist/assets/를 root로 복사** ← 정적 호스팅용
- 원본 ZIP은 root에 산출물 없이 진입점 index.html만 있음
- 사용자 호스팅 환경에서 main.jsx 못 찾아 먹통

### 해결
build.sh를 완전 실행하여 root에 dist 산출물 복사. M6.83은 ZIP 안에 root index.html + assets/ 산출물 포함되어 즉시 호스팅 가능.

### 부수 작업
이전 시도한 `hatch-break flex: 0 0 2px` 수정은 일부 박스 layout 깨짐 보고로 원복. M6.82의 자연 11row 분배(54:9:36) 그대로 유지. 시각적 차이 미미하여 문제 없음.

---

## 🎯 M6.83 변경 내역

### [A] BayPlan.jsx — baseline 강제 적용

파일 상단(line 17)에 STD_DECK/STD_HOLD 상수 추가, allTiers 계산 후 length === 0이면 baseline 강제. hold 없는 베이(BAY 27 등)는 강제 보강 X.

### [B] PrintableBayDetail.jsx — baseline 강제 적용

파일 상단에 BD_STD_DECK/BD_STD_HOLD 상수 추가 (PrintableCargoPlan과 동일 값). allTiersSet 계산 후 length === 0이면 baseline 강제. M4.9e-fix의 "화면과 같게" 원칙 유지 — fallback일 때만 baseline 적용.

### [C] utils.js + HelpModal.jsx

- `APP_VERSION = 'M6.83'`
- HelpModal에 M6.83 변경사항 항목 추가

---

## ✅ 검증 결과

```
✓ vite v6.4.2 build in 12.33s
✓ assets/index-DBL35Djo.js (2,423 kB)
✓ APP_VERSION = "M6.83" (번들 내 검증)
✓ STD_DECK ['92','90','88','86','84','82'] (3회 occurrence)
✓ root index.html + assets/ 산출물 복사 완료 (build.sh [5/5])
```

---

## 🔧 사용법

ZIP 압축 해제 후 `m6_83_build/` 디렉토리를 정적 호스팅하면 즉시 동작:
- `m6_83_build/index.html` (root 진입점, 산출물)
- `m6_83_build/assets/` (JS/CSS 번들)
- `m6_83_build/manifest.webmanifest` (PWA)
- `m6_83_build/sw.js` (Service Worker)

소스 수정 후 재빌드 필요 시:
```bash
cd m6_83_build && bash build.sh
```

---

## 📝 다음 세션 작업 후보

1. **다른 선박 검증** — TNJP, RZOR, ATRP, NBTD, MCSC EDI 받으면 M6.81 universal 적용
2. **페이지 3 양식** — Special Type Stowage Plan (HiCube, 53ft 등)
3. **마크 표기 통일** — 메모리 #25 (P/U) vs PDF 표준 (F/A) 결정 후 통일
4. **M6.82 60:40 정확화** — hatch-break flex 수정의 안전한 방법 찾기
   - 옵션: deck/hold를 별도 wrapper div로 감싸기 (현재 11row 균등 → 6:4:4 구조)
   - 옵션: 셀 height 고정 (% flex 대신 px 고정)

---

## 📋 핵심 메모리 참조

- **#24** [항상] 빈 카고플랜 표준 양식 (M6.80 baseline)
- **#25** [항상] EDI→실 카고플랜 변환 (M6.81+)
- **#29** [항상] 베이사전 v2에 300척 등록 완료
- **#30** [항상] 베이사전 = 절대 기준

---

## 🔍 변경 파일 리스트

```
src/components/BayPlan.jsx              (STD_DECK/STD_HOLD 추가 + fallback)
src/components/PrintableBayDetail.jsx   (BD_STD_DECK/BD_STD_HOLD 추가 + fallback)
src/utils.js                            (APP_VERSION: M6.82 → M6.83)
src/components/HelpModal.jsx            (M6.83 변경사항 항목 추가)
```
