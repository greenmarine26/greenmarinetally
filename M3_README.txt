═══════════════════════════════════════════════════════════════════
  GREENMARINE TALLY — M3.5.2 핫픽스 (2026-05-04)
  믹서 업로드 성능 5~6배 개선
  🌊 그린마린 검수팀 전용
═══════════════════════════════════════════════════════════════════

■ 사용자 보고
  "믹서기 가동이 너무 오래 걸린다"
  "선적 따로 양하 따로 하면 빠른데 동시 작업하면 더 빨라야 하는 것 아닌가?"

■ 원인 분석 결과 (4가지 병목)

  1. Firebase 쓰기 5번 순차 (await × 5)
     - 양하 EDI / 양하 list / 양하 xray / 선적 EDI / 선적 list
     - 각 1~3초 × 5 = 5~15초

  2. 파일 분석 순차 (for 루프)
     - 5개 파일 × 5초 = 25초

  3. 'both' 모드에서 리스트 중복 처리
     - 양하/선적 양쪽 lists에 push → mergeWithEdi 2번 실행
     - 25,200번 비교 × 2 = 50,400번

  4. 이미지 처리 비효율
     - 원본 4MB 그대로 Gemini로 전송
     - btoa(spread) 연산자 → 메인 스레드 블락 + 큰 이미지 스택 오버플로우 위험

  5. PDF.js CDN 첫 로드 대기 (~2초)
     - 첫 PDF 처리 시마다 다운로드 대기

■ 수정 (M3.5.2)

  [수정 1] Firebase 쓰기 병렬화 ★ 가장 큰 효과
    - persistData()에서 await 5번 → Promise.all 1번
    - 5~15초 → 1~2초
    - 위치: components/MixerUploadModal.jsx

  [수정 2] 파일 분석 병렬화
    - for 루프 → Promise.all(files.map())
    - 25초 → 5초
    - 위치: processFiles() in MixerUploadModal.jsx

  [수정 3] 리스트 중복 제거
    - 'both' 모드에서도 컨번호 매칭율로 한쪽에만 배치
    - dischargeMatch vs loadingMatch 비교 → 더 많이 매칭되는 쪽
    - mergeWithEdi 호출 횟수 절반
    - 위치: processFiles() listFiles.forEach

  [수정 4] 이미지 자동 축소 + 효율적 base64
    - compressImage(): Canvas로 1600px 축소 + JPEG 90%
    - blobToBase64(): FileReader 사용 (UI 안 막힘)
    - 4MB → 0.5~1MB (업로드 80% 감소)
    - 위치: mixerUpload.js

  [수정 5] PDF.js / SheetJS 사전 로드
    - preloadLibraries() 함수 추가
    - useEffect로 모달 열 때 백그라운드 다운로드
    - 첫 PDF 처리 ~2초 단축
    - 위치: mixerUpload.js + MixerUploadModal.jsx

■ 예상 성능 (5개 파일 + 둘다 모드)

  이전 (M3.5):  30~40초
  이후 (M3.5.2): 5~8초  (약 5~6배 빠름)

■ 변경 파일

  src/utils.js                       → APP_VERSION = 'M3.5.2'
  src/mixerUpload.js                 → compressImage/blobToBase64/preloadLibraries
  src/components/MixerUploadModal.jsx → 병렬 처리 + 사전 로드 + 중복 제거

■ 누적 이력

  M3.5.2 ★ 믹서 성능 5~6배 개선
  M3.5     믹서 업로드 + 폰 친화 UI + 데이터 모델 확장
  M3.4     EDI 파싱 핫픽스 + 오답 신고
  M3.3     진행/단수/바닥/꼭대기/용량
  M3.2     자연어 대폭 확장 + 인앱 매뉴얼

═══════════════════════════════════════════════════════════════════
