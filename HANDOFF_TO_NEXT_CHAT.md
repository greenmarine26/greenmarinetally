# Tallyman Master 핸드오프 — M6.14a (핫픽스)

## 📌 현재 상태 (2026-05-17)

- **최신 버전**: **M6.14a** (M6.14 STOWAGE PDF + 먹통 핫픽스)
- **이전 버전**: M6.13 (BERTH 자동 정리)
- **작업 디렉토리**: `/home/claude/app/m6_14_build/`

## 🔧 M6.14a 핫픽스 (M6.14 발견 즉시 수정)

### 문제
M6.14 배포 후 "파일 업로드 누르면 먹통" 보고.

### 원인
EDI 업로드 시 PDF 자동 검사 로직(`handleEdiUpload` 내부)이 양하 리스트 PDF(50+ 페이지)에 대해 `extractPdfText()` 호출 → PDF.js로 전체 페이지 파싱하느라 수십 초 블로킹 → 사용자 입장에선 먹통.

### 수정
1. **EDI 업로드 핸들러에서 PDF 텍스트 검사 완전 제거** — 파일명 키워드(STOWAGE/LOAD/PLAN/답안지)만 즉시 판별
2. **자료 탭에 [📄 STOWAGE PDF 등록 (베이사전)] 별도 보라색 버튼 추가** — EDI 업로드와 완전 분리, 명시적 호출
3. 양하 리스트 input의 PDF 처리(`1564, 1575번 라인`)는 기존 동작 그대로 유지

### 변경 파일
- `src/pages/VoyagePage.jsx` — handleEdiUpload PDF 분리 로직 단순화 + 별도 버튼
- `src/utils.js` — APP_VERSION M6.14 → M6.14a
- `src/components/HelpModal.jsx` — M6.14a 핫픽스 항목 추가

## 🎯 M6.14 (기존 내용)

### STOWAGE INSTRUCTION PDF 자동 분석

**배경**: NBTD/MCSC만 정밀 등록, 나머지 ~298척은 자동 추정 → 카고플랜 매번 어긋남

**솔루션**: 자료 탭 [📄 STOWAGE PDF 등록] 버튼 → PDF 1개 선택 → Gemini 2.5 Pro가 PDF를 **네이티브로 분석** → 베이 구조 자동 추출 → 사용자 검토 → localStorage + Firebase 즉시 저장

### 주요 변경 파일
1. **gemini.js** (신규 함수 2개)
   - `ocrStowagePdf(file, apiKey)`: PDF를 `application/pdf` MIME으로 Gemini에 직접 전송. 사진 변환 없음.
   - `stowageToBayDictEntry(data, fname, extra)`: Gemini 결과를 shipBayDict_v2 entry로 변환 (NBTD/MCSC 양식 완전 호환)
   - 모델: **gemini-2.5-pro** (정확도 우선, Flash 아님)
   - PDF 크기 한도: 20MB
2. **mixerUpload.js** (신규 함수 1개)
   - `isStowagePdf(textOrFilename)`: STOWAGE/LOADING/PLAN/답안지 키워드 + BAY/tier 패턴으로 자동 판별
3. **StowageReviewModal.jsx** (신규 컴포넌트)
   - 분석 중 → 검토 → 저장 4단계 UI
   - 베이별 상세 표 (deck/hold/extraTier/적재량)
   - 합계 자동 검증 (PDF 표시 vs 계산 합)
   - 사용자 보완 입력 (코드/콜사인/IMO)
   - **NBTD/MCSC 보호** (PROTECTED_CODES) — 덮어쓰기 차단
4. **VoyagePage.jsx**
   - EDI 업로드 시 PDF 자동 분리 (`.def` 분리 패턴 재사용)
   - 파일명 또는 PDF 텍스트 기반 자동 판별
   - 검출 시 모달 자동 호출
   - 자료 탭 UI에 안내 문구 추가

### 보호 정책
- **PROTECTED_CODES = ['NBTD', 'MCSC']** (StowageReviewModal.jsx)
- 사용자가 NBTD/MCSC 코드로 등록 시도 시 즉시 차단 + 경고
- 기존 `shipBayDict_v2.js` 파일은 일체 수정 안 함 — 새 선박은 모두 localStorage/Firebase로만 저장

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.14 | 5 |
| ocrStowagePdf | 1 |
| stowageToBayDictEntry | 1 |
| StowageReviewModal | 4 |
| application/pdf (PDF 직접 입력) | 1 |
| gemini-2.5-pro (모델) | 1 |
| isStowagePdf (자동 판별) | 2 |
| NBTD/MCSC 보호 | 4 |

## 🚦 사용자 워크플로

```
1. 자료 탭 → EDI 업로드 input에 .pdf 파일 끌어 놓기
   (EDI + def + STOWAGE PDF 한꺼번에도 OK)
   ↓
2. isStowagePdf() 자동 판별
   - 파일명 STOWAGE/LOAD/PLAN/답안지 키워드 또는
   - PDF 텍스트에 BAY 패턴 5개 이상 + tier 10개 이상
   ↓
3. StowageReviewModal 자동 열림
   - "Gemini 2.5 Pro 분석 중..." (10~30초)
   ↓
4. 검토 화면
   - 선박 메타 (이름/항차/POL/DATE)
   - 검출 요약 (베이 수/트윈/단독/데크 전용/extraTier)
   - 합계 자동 검증
   - 베이별 상세 표
   - 코드/콜사인/IMO 입력
   ↓
5. [등록] 클릭
   - localStorage(userBayDict) 저장
   - Firebase ship_bay_dict_v3/{code} 저장
   - 모든 검수원 즉시 공유
   ↓
6. 다음 EDI 업로드 시 자동 매칭 → 정밀 카고플랜
```

## 🛡 보호 규칙 (다음 세션 반드시 준수)

1. **NBTD, MCSC는 절대 건들지 않음** — `shipBayDict_v2.js` 87, 88번 라인
2. M6.14 신규 등록은 모두 localStorage + Firebase 경로만 사용
3. 사용자가 STOWAGE 등록 시 PROTECTED_CODES 검증 통과해야 함
4. 정밀 등록 보호 선박 추가 시 `StowageReviewModal.jsx` 상단 `PROTECTED_CODES` 배열에 추가

## 🚦 미해결 / 대기 작업

### 보류 중
- **APK 배포** — 사용자 "앱 완성 후 진행"
- **로그 기능** (글로벌 활동 로그) — 사용자 "고민 중"
- **권한 시스템 강화** (검수원/수석/관리자 3단계) — 사용자 "고민 중"

### M6.14 후속 후보 (사용자 검증 후 결정)
- STOWAGE PDF 일괄 처리 (현재는 1개씩) — 시간 절약용
- 베이사전 위젯에서 STOWAGE PDF 재업로드 (등록된 선박 갱신)
- row 폭 자동 추출 (현재 default 8/7)
- 미검토 항목(grade=ai-extracted) 자동 알림 배지

## 📁 핵심 파일 (M6.14 신규/변경)

### 신규 (M6.14)
- `src/components/StowageReviewModal.jsx` (검토 모달)
- `src/gemini.js` 내부:
  - `STOWAGE_PROMPT` 상수
  - `ocrStowagePdf()`
  - `stowageToBayDictEntry()`
- `src/mixerUpload.js` 내부:
  - `isStowagePdf()`

### 수정 (M6.14)
- `src/utils.js` — APP_VERSION M6.13 → M6.14
- `src/pages/VoyagePage.jsx`:
  - StowageReviewModal import
  - stowagePdfFile state
  - handleEdiUpload 내부 PDF 자동 분리 로직
  - 자료 탭 UI 안내 문구 추가
- `src/components/HelpModal.jsx` — M6.14 항목 추가

### 절대 건들지 않음
- `src/data/shipBayDict_v2.js` — NBTD/MCSC 정밀 등록 보존

## 🛠 빌드 명령

```bash
cd /home/claude/app/m6_14_build
bash build.sh
```

## 🗂 영구 작업 규칙 (누적)

1. 빌드 전 시뮬레이션 절대 원칙 (실데이터 검증 후 ZIP 제공)
2. 폴더명: `m{버전없는점}_build` (예: m6_14_build)
3. ZIP 파일명: `M{X}_{Y}_FEATURE.zip`
4. **기준/기본을 흔들지 말 것** — 사용자 지시 부분만 수정
5. 베이사전 변경은 영구적 (한 번 등록 후 양식 변경 금지)
6. **NBTD/MCSC 정밀 등록 보호** (M6.14 추가 규칙)
7. 카고플랜: 오른쪽 = BAY 01 (BOW), 왼쪽 = 마지막 베이 (STERN)
8. ZIP 배포 = 누적 완성본 (전 버전 포함)
9. 모든 배포 시 체크리스트: APP_VERSION + HelpModal + HANDOFF
10. 큰 파일 작성 시 잘리지 않게 한 번에 끝까지
11. "만들지 마세요" 명령 시 즉시 중단

## 📞 다음 세션 시작 시 확인 사항

1. 현장 사용자가 실 STOWAGE PDF 1~2장 업로드해서 정확도 확인 (XIN TAI PING의 xtpg0214.pdf 우선 추천)
2. 추출 결과 검토 후 등록 → 다음 EDI 매칭 시 카고플랜 정확도 확인
3. 평택 단골 30척 우선순위 작성 → 1~2주 집중 정밀 등록
