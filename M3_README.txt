═══════════════════════════════════════════════════════════════════
  GREENMARINE TALLY — M3.5.3 (2026-05-04)
  믹서기 제거 + 기존 시스템 안정성/형식 지원 보강
  🌊 그린마린 검수팀 전용
═══════════════════════════════════════════════════════════════════

■ 변경 배경

  M3.5/M3.5.2 믹서 시스템은 야심차게 만들었으나
  현장 사용 중 "Firebase 저장에서 계속 돌고만 있음" 보고.
  복잡한 통합 처리보다 기존 검증된 흐름 + 핵심 보강이 안전.

  → 믹서 UI 제거, 기존 분리 업로드 유지
  → 필수 보강: Firebase 안정성 + 모든 자료 형식 지원

■ 변경 사항 (3가지)

  [1] 믹서 UI 제거
      - HomePage 상단 큰 "믹서" 버튼 제거
      - 기존 양하/선적 흐름으로 복귀
      - mixerUpload.js / MixerUploadModal.jsx 파일은 보관
        (PDF 파서, OCR 함수 등 재사용)

  [2] Firebase 청크 분할 ★ 안정성 핵심
      - 504대 통째 set() → 50대씩 분할 (set + update 병렬)
      - 5~30초 hang → 1~2초 안정
      - 적용: fbSaveEdiContainers / fbSaveListRecords / fbSaveXrayList

  [3] 모든 자료 형식 지원 (리스트 입력칸)
      ✅ 엑셀 (.xls .xlsx .csv) — 기존
      ✅ PDF (.pdf) — 신규 (pdfjs-dist 동적 로드)
      ✅ 사진 (.jpg .png 등) — 신규 (Gemini Vision OCR)
      ✅ 카메라 촬영 버튼 추가 (📷, 후면 카메라 즉시)

  → 폰에서 받은 어떤 형식이든 바로 업로드 가능
  → "오늘 같은 일 (자료 형식 때문에 막힘) 반복 X"

■ 사용법

  [기존과 동일]
  1. 항차 생성 (양하 또는 선적)
  2. 항차 페이지 진입
  3. 1번 칸: EDI/ASC 업로드 (필수)
  4. 2번 칸: 리스트 업로드
     - 엑셀이면 그대로
     - PDF면 자동 텍스트 추출
     - 사진이면 자동 OCR (Gemini Vision)
     - 📷 버튼 누르면 카메라로 즉시 촬영
  5. 3번 칸: X-RAY (양하만)

  [폰에서 모든 파일 보임]
  accept="*/*" 그대로 유지 (M3.4.1 핫픽스 포함)

■ 기술 세부

  [Firebase 청크 분할]
  function chunkedReplace(path, obj):
    if size <= 50:
      set(path, obj)              ← 작은 데이터는 한 번에
    else:
      set(path, firstChunk)       ← 첫 50대 (기존 정리)
      Promise.all([                ← 나머지 병렬 update
        update(path, chunk2),
        update(path, chunk3),
        ...
      ])

  [PDF 처리 흐름]
  파일 업로드 → detectFileType() → 'pdf'
    → extractPdfText() (pdfjs-dist)
    → parsePdfContainers() (행 단위 컨번호 추출)
    → records 배열 → fbSaveListRecords (청크 분할)

  [사진 처리 흐름]
  카메라/파일 업로드 → detectFileType() → 'image'
    → compressImage() (1600px 축소, JPEG 90%)
    → ocrImageContainers() (Gemini Vision API)
    → records 배열 → fbSaveListRecords (청크 분할)

■ 변경 파일

  src/utils.js                 → APP_VERSION = 'M3.5.3'
  src/firebase.js              → chunkedReplace 함수, 3개 저장 함수 청크 적용
  src/pages/HomePage.jsx       → 믹서 버튼/state/마운트 제거
  src/pages/VoyagePage.jsx     → handleListUpload 확장 (PDF/사진), 카메라 버튼
  (보관) src/mixerUpload.js                  → PDF/OCR 함수 재사용
  (보관) src/components/MixerUploadModal.jsx → 향후 재활용 가능

■ 누적 이력

  M3.5.3 ★ 믹서 제거 + Firebase 청크 + 모든 형식 지원
  M3.5.2   믹서 성능 5~6배 (실패한 시도)
  M3.5     믹서 업로드 시도
  M3.4     EDI 핫픽스 + 오답 신고
  M3.3     진행/단수/바닥/꼭대기/용량
  M3.2     자연어 대폭 확장 + 인앱 매뉴얼

═══════════════════════════════════════════════════════════════════
