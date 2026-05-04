# 📋 다음 채팅 인계 지침서 (HANDOFF)
**최종 업데이트**: 2026-05-04 (M3.5 배포)

---

## 🎯 현재 상태
- **앱 버전**: M3.5
- **최근 ZIP**: greenmarinetally-M3.5.zip
- **배포**: GitHub Pages (greenmarine26/greenmarinetally)
- **사용자 평가 목표**: 7~8점 (현재 6.5점, M3.4 기준)

---

## ✅ M3.5에서 완료된 것

1. **믹서 업로드 시스템** (mixerUpload.js + MixerUploadModal.jsx)
   - EDI/엑셀/PDF/사진 한 곳 업로드
   - 자동 파일 종류 판별 (확장자 + 매직바이트 + 내용)
   - PDF 파서 (pdfjs-dist 동적 로드)
   - 이미지 OCR (Gemini Vision API)
   - EDI 기반 데이터 병합 (실번호/무게/X-RAY 플래그)
   - 항차 자동 매칭 (선박명 + 항차번호)

2. **폰 친화 UI 개편**
   - 항차 삭제: prompt() → 풀스크린 모달 (3개 큰 버튼)
   - 믹서 업로드: 4단계 풀스크린 (setup/upload/process/result)
   - 카메라 직접 호출 (capture="environment")

3. **데이터 모델 확장**
   - voyages/{key}/info에 voy_d, voy_l 추가
   - 큰 선박(양하/선적 항차번호 다름) 지원

4. **GEMINI_API_KEY export** (mixerUpload에서 import 가능)

---

## ⚠️ M3.5 미완료/제약 (다음 작업 후보)

1. **충돌 확인 UI** ★ 우선
   - mergeWithEdi가 conflicts 배열 반환하지만 화면 표시 안 됨
   - "EDI 무게 24500kg vs 리스트 무게 28000kg, 어느 쪽?" 묻는 UI 필요

2. **매칭 실패 컨번호 처리 UI**
   - mergeWithEdi의 unmatched 처리 안 됨
   - "리스트엔 있는데 EDI에 없는 컨 5개 — 추가/무시/별도 항차?" UI

3. **항차 매칭 ask 처리 UI**
   - matchVoyage가 'ask' suggestion 반환해도 자동 처리됨 (사용자에게 안 묻음)
   - "이 항차의 양하인가요 선적인가요?" 다이얼로그 필요

4. **다른 선사 PDF 양식**
   - 동진해운만 검증됨
   - KMTC, SM Line, 흥아, CMA 등 샘플 받으면 추가

5. **리퍼 처리 규칙 C** (메모리 #16)
   - 실 달린 리퍼 + 온도 없으면 → 리퍼 리스트에 포함 + 빨강 경고
   - 베이플랜 리퍼 시각 강조 (시안 ring + ❄)
   - **아직 구현 안 됨** (M3.5 작업 양 너무 많아 미룸)

6. **오답 신고 활용**
   - feedback 노드에 데이터 쌓이면 → 다음 버전 패턴 보강

---

## 🔧 주요 파일 위치

```
src/
├── utils.js              # APP_VERSION, parseBAPLIE, parseListExcel 등
├── firebase.js           # DB 함수 (fbCreateVoyage, fbDeleteSection 등)
├── gemini.js             # AI + GEMINI_API_KEY export
├── nlSearch.js           # 자연어 검색 (M3.3까지 패턴)
├── shipStructure.js      # extractShipInfo (M3.4 핫픽스)
├── mixerUpload.js        # ★ M3.5 신규 (믹서 시스템 핵심)
├── voice.js              # 음성 합성 (한국어 좌표 변환)
├── components/
│   ├── MixerUploadModal.jsx  # ★ M3.5 신규 (4단계 풀스크린)
│   ├── WrongAnswerModal.jsx  # M3.4 (오답 신고)
│   ├── HelpModal.jsx         # M3.2~3.3 (인앱 매뉴얼)
│   ├── SearchPanel.jsx       # 검색 + AI + 즉답 카드
│   ├── BayPlan.jsx           # 베이그림 (M3.5 리퍼 시각 강조 미구현)
│   └── ...
└── pages/
    ├── HomePage.jsx          # 믹서 버튼 + DeleteVoyageModal
    ├── VoyagePage.jsx        # 기존 EDI/리스트/X-RAY 분리 업로드 (믹서로 대체 가능)
    └── ChiefDashboard.jsx    # 선박 라이브러리 + 오답 리포트
```

---

## 📝 작업 원칙 (사용자 합의)

1. **EDI 우선** — 단일 진실, 다른 자료는 보강
2. **추론 X** — 실데이터 검증
3. **"만들지 마세요"** 명령 시 즉시 중단
4. **ZIP 배포는 누적 완성본**
5. **자료 전달 후 항상 인계 지침서 업데이트** ← 이 파일
6. **폰 친화 UI 우선** — 작은 다이얼로그/키보드 입력 금지

---

## 🌊 데이터 흐름 (믹서 업로드)

```
검수원 폰
  ↓ 파일 선택 또는 카메라 촬영
믹서 모달 (4단계)
  ↓ processSingleFile (파일별)
  ├─ EDI → parseBAPLIE
  ├─ 엑셀 → parseListExcel / parseXrayList
  ├─ PDF → extractPdfText → parsePdfContainers
  └─ 이미지 → ocrImageContainers (Gemini Vision)
  ↓ 병합 (EDI 베이스)
  ├─ POL/POD로 양하/선적 자동 분류
  ├─ mergeWithEdi (실번호/무게/X-RAY 추가)
  └─ matchVoyage (기존 항차와 매칭)
  ↓ Firebase 저장
voyages/{key}/{discharge|loading}/{ediContainers, records, xrayList}
```

---

## 🐛 알려진 이슈

1. PDF 파서가 동진해운 외 양식에서 정확도 떨어질 수 있음
2. OCR 결과 검수원 확인 UI 없음 (자동 신뢰)
3. 충돌 시 마지막 값으로 덮어씀 (사용자에게 안 묻음)

---

## 💬 사용자 정보 (메모리 #1)

성일은 평택항 화물 검수 / 양하 작업 관리.
하루 검수인원 최대 15명, 동시 1~10척, 척당 평균 1000대.
M2.6 → M3.5까지 큰 폭 업데이트 완료.
