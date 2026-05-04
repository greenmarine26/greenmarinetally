# 📋 다음 채팅 인계 지침서 (HANDOFF)
**최종 업데이트**: 2026-05-04 (M3.5.3 배포)

---

## 🎯 현재 상태
- **앱 버전**: M3.5.3
- **최근 ZIP**: greenmarinetally-M3.5.3.zip
- **배포**: GitHub Pages (greenmarine26/greenmarinetally)

---

## ✅ M3.5.3 변경 (믹서 제거 + 안정성 보강)

### 배경
M3.5 믹서 시스템이 현장에서 "Firebase 저장에서 hang" 보고.
복잡한 통합 처리 → 기존 검증된 분리 업로드로 복귀.
대신 핵심 단점 3가지 보강.

### 변경 1: 믹서 UI 제거
- HomePage에서 믹서 버튼/state/마운트 제거
- mixerUpload.js / MixerUploadModal.jsx 파일은 보관 (재활용)

### 변경 2: Firebase 청크 분할 ★ 안정성 핵심
- 504대 set() → 50대씩 분할 (set + update 병렬)
- 5~30초 hang → 1~2초 안정
- 적용: fbSaveEdiContainers / fbSaveListRecords / fbSaveXrayList
- 위치: firebase.js의 chunkedReplace()

### 변경 3: 리스트 입력칸 모든 형식 지원
- 엑셀(.xls .xlsx .csv) — 기존
- PDF(.pdf) — 신규 (pdfjs-dist 동적 로드)
- 사진(.jpg .png) — 신규 (Gemini Vision OCR)
- 📷 카메라 촬영 버튼 추가 (capture="environment")
- 위치: VoyagePage.jsx handleListUpload + 리스트 입력 영역

---

## ✅ 누적 완료 (M2.6 ~ M3.5.3)

- 자연어 검색 (베이/항구/구역/무게/UN/Class/단수/용량/빈자리)
- 인앱 매뉴얼 (11탭, 130+ 예시)
- 그린마린 검수팀 전용 (인원 무제한)
- EDI 파싱 핫픽스 (extractShipInfo)
- 답변 오답 신고 (Firebase /feedback)
- 항차 분리 삭제 (양하만/선적만/전체)
- 항차 데이터 모델 확장 (voy_d, voy_l)
- accept="*/*" 핫픽스 (폰에서 모든 파일)
- Firebase 청크 분할 (M3.5.3)
- PDF/사진 자동 인식 (M3.5.3)

---

## ⚠️ 미완료 (다음 작업 후보)

1. **리퍼 처리 규칙 C** (메모리 #16) — 우선순위 높음
   - 실 있음 + 온도 미입력 빨강 경고
   - 베이플랜 시안 ring + ❄ 아이콘
   - 특수화물 리스트 상단 경고 배너

2. **다른 선사 PDF 양식 검증**
   - 동진해운만 검증, KMTC/SM Line/흥아/CMA 미검증
   - 샘플 받으면 parsePdfContainers 보강

3. **사진 OCR 결과 검수원 확인 UI**
   - 현재 자동 신뢰 → 수정 가능 UI 필요할 수도

4. **충돌 컨번호 처리**
   - EDI에 있는데 리스트에 없는 / 반대 케이스
   - 현재 단순 병합 (덮어쓰기)

5. **오답 신고 데이터 활용**
   - feedback 노드 분석 → 다음 패턴 보강

---

## 🔧 주요 파일 위치

```
src/
├── utils.js                      # APP_VERSION='M3.5.3', parseBAPLIE 등
├── firebase.js                   # chunkedReplace, fbDeleteSection 등
├── gemini.js                     # GEMINI_API_KEY export
├── nlSearch.js                   # 자연어 검색 (M3.3)
├── shipStructure.js              # extractShipInfo (M3.4)
├── mixerUpload.js                # PDF/OCR 함수 (보관, 재사용)
├── voice.js                      # 음성 합성
├── components/
│   ├── MixerUploadModal.jsx      # 보관 (제거됨, 향후 활용 가능)
│   ├── WrongAnswerModal.jsx      # 오답 신고
│   ├── HelpModal.jsx             # 인앱 매뉴얼
│   ├── SearchPanel.jsx           # 검색
│   ├── BayPlan.jsx               # 베이그림
│   └── ...
└── pages/
    ├── HomePage.jsx              # 양하/선적 버튼 + DeleteVoyageModal
    ├── VoyagePage.jsx            # ★ EDI/리스트(엑셀/PDF/사진)/X-RAY 업로드
    └── ChiefDashboard.jsx        # 선박 라이브러리 + 오답 리포트
```

---

## 📝 작업 원칙

1. EDI 우선 (단일 진실)
2. 추론 X (실데이터 검증)
3. "만들지 마세요" → 즉시 중단
4. ZIP 배포는 누적 완성본
5. 자료 전달 후 인계 지침서 업데이트
6. 폰 친화 UI 우선
7. **검증된 단순 흐름이 복잡한 통합보다 안전** (M3.5.3 교훈)

---

## 🐛 알려진 이슈

1. PDF 파서 동진 외 양식 정확도 미검증
2. 사진 OCR 결과 자동 신뢰 (확인 UI 없음)

---

## 💬 사용자 정보

성일 (평택항 검수). 동시 1~10척, 척당 평균 1000대.
M2.6 → M3.5.3까지 큰 폭 업데이트.
오늘 휴무 → 풀 테스트 → 단점 보강 → 모레 현장 투입.
