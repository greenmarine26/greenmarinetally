# 📋 다음 채팅 인계 지침서 (HANDOFF)
**최종 업데이트**: 2026-05-04 (M3.5.2 핫픽스 배포)

---

## 🎯 현재 상태
- **앱 버전**: M3.5.2
- **최근 ZIP**: greenmarinetally-M3.5.2.zip
- **배포**: GitHub Pages (greenmarine26/greenmarinetally)

---

## ✅ M3.5.2 핫픽스 (성능 5~6배 개선)

사용자 보고: "믹서기 가동이 너무 오래 걸림"
원인 분석 후 4가지 병목 모두 수정.

### 수정 1: Firebase 쓰기 병렬화 (가장 큰 효과)
- 이전: 5번의 await 순차 (5~15초)
- 이후: Promise.all로 동시 (1~2초)
- 위치: persistData() in MixerUploadModal.jsx

### 수정 2: 파일 분석 병렬화
- 이전: for 루프로 순차 (5×5=25초)
- 이후: Promise.all로 동시 (5초)
- 위치: processFiles() in MixerUploadModal.jsx

### 수정 3: 리스트 중복 제거 (both 모드)
- 이전: 'both'에서 양하/선적 양쪽에 push → 2번 처리
- 이후: 컨번호 매칭율로 한쪽에만 배치
- 위치: processFiles() listFiles.forEach

### 수정 4: 이미지 자동 축소 + 효율적 base64
- 이전: 원본 4MB 이미지 그대로 + spread 연산자 (UI 멈춤)
- 이후: Canvas 1600px 축소 + FileReader (UI 안 막힘)
- 위치: compressImage(), blobToBase64() in mixerUpload.js

### 수정 5: PDF.js/SheetJS 사전 로드
- 이전: 첫 PDF 처리 시 ~2초 CDN 다운로드 대기
- 이후: 모달 열 때 백그라운드 로드 (preloadLibraries)
- 위치: useEffect in MixerUploadModal.jsx

### 예상 성능 (5개 파일 + 둘다 모드)
- 이전: 30~40초
- 이후: **5~8초** (약 5~6배 빠름)

---

## ✅ M3.5에서 완료된 것 (이전 세션)

1. 믹서 업로드 시스템 (EDI/엑셀/PDF/사진 통합)
2. 폰 친화 UI (풀스크린 모달, 큰 버튼, 카메라 직접)
3. 항차 데이터 모델 확장 (voy_d/voy_l)
4. PDF 파서 (pdfjs-dist)
5. 이미지 OCR (Gemini Vision)
6. 항차 자동 매칭

---

## ⚠️ 미완료 (다음 작업 후보)

1. **충돌 확인 UI** ★ 우선
   - mergeWithEdi가 conflicts 반환하지만 화면 표시 안 됨
   
2. **매칭 실패 컨번호 처리 UI**
   - unmatched 컨 추가/무시 선택 UI

3. **항차 매칭 ask 처리 UI**
   - 비슷한 항차번호 (2608N/2608S) 묻는 다이얼로그

4. **다른 선사 PDF 양식**
   - 동진해운만 검증, KMTC/SM Line/흥아/CMA 미검증

5. **리퍼 처리 규칙 C** (메모리 #16)
   - 실 있음 + 온도 미입력 빨강 경고
   - 베이플랜 시안 ring + ❄ 아이콘

6. **오답 신고 데이터 활용**
   - feedback 노드 분석 → 다음 패턴 보강

---

## 🔧 주요 파일 위치

```
src/
├── utils.js              # APP_VERSION='M3.5.2', parseBAPLIE 등
├── firebase.js           # fbDeleteSection 포함
├── gemini.js             # GEMINI_API_KEY export
├── nlSearch.js           # 자연어 검색
├── shipStructure.js      # extractShipInfo
├── mixerUpload.js        # ★ 믹서 시스템 + preloadLibraries
├── voice.js              # 음성 합성
├── components/
│   ├── MixerUploadModal.jsx  # ★ 믹서 UI + 병렬 처리
│   ├── WrongAnswerModal.jsx  # 오답 신고
│   ├── HelpModal.jsx         # 인앱 매뉴얼
│   ├── SearchPanel.jsx       # 검색
│   ├── BayPlan.jsx           # 베이그림
│   └── ...
└── pages/
    ├── HomePage.jsx          # 믹서 진입 + DeleteVoyageModal
    ├── VoyagePage.jsx        # 기존 분리 업로드
    └── ChiefDashboard.jsx    # 선박 라이브러리 + 오답 리포트
```

---

## 📝 작업 원칙

1. EDI 우선 (단일 진실)
2. 추론 X (실데이터 검증)
3. "만들지 마세요" → 즉시 중단
4. ZIP 배포는 누적 완성본
5. 자료 전달 후 인계 지침서 업데이트
6. 폰 친화 UI 우선 (작은 다이얼로그/키보드 입력 금지)

---

## 🐛 알려진 이슈

1. PDF 파서 동진 외 양식 정확도 미검증
2. OCR 결과 검수원 확인 UI 없음
3. 충돌 시 마지막 값으로 덮어씀

---

## 💬 사용자 정보

성일 (평택항 검수). 동시 1~10척, 척당 평균 1000대.
M2.6 → M3.5.2까지 큰 폭 업데이트 완료.
오늘 휴무 → 풀 테스트 → 단점 보강 → 모레 현장 투입 예정.
