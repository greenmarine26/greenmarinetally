# 📋 다음 채팅 인계 지침서 (HANDOFF)
**최종 업데이트**: 2026-05-04 (M3.5.4 배포)

## 🎯 현재 상태
- **앱 버전**: M3.5.4
- **최근 ZIP**: greenmarinetally-M3.5.4.zip
- **배포**: GitHub Pages (greenmarine26/greenmarinetally)

## ✅ M3.5.4 완료 (오늘 부족 사항 모두 보완)

### 1. EDI 000 온도 미입력 처리
- TMP+2+000:CEL 같은 케이스를 "미입력"으로 정규화
- tmp_missing 플래그 추가
- 엑셀 파서도 동일 적용

### 2. 자동 진단 + 음성 경고 시스템 ★ 핵심
**diagnostics.js (신규)**:
- runDiagnostics() — 7가지 검사
- buildVoiceMessage() — 우선순위순 짧게
- summarizeAlerts() — 화면 배지용

**DiagnosticsPanel.jsx (신규)**:
- 자동 음성 (한 번만, sig 변경 시 다시)
- critical: 빨강 점멸 + 음성
- warning: 주황 + 음성
- info: 파랑 (음성 X)
- 음성 토글, 펼침, 닫기

### 3. 리퍼 처리 규칙 C
- BigResultCard: 온도 미입력 빨강 점멸 배지
- 실 있는 리퍼는 온도 무관 리스트 포함

### 4. 베이플랜 리퍼 강조
- 시안 ring + ❄ 아이콘
- 온도 미입력 시 ❗ 빨강 점멸
- 셀 안 텍스트도 빨강 (⚠NO TEMP)

### 5. CSV 온도미입력 컬럼

## ✅ M3.5.3 (직전)
- 믹서 제거 + 기존 분리 업로드 복귀
- Firebase 청크 분할 (504대 5~30초 → 1~2초)
- 리스트 입력칸 모든 형식 지원 (엑셀/CSV/PDF/사진)

## ⚠️ 미완료 (다음 작업 후보)

1. 다른 선사 PDF 양식 검증 (KMTC/SM Line/흥아/CMA)
2. 사진 OCR 결과 검수원 확인 UI
3. ISO 수정 추적 UI (firebase.js 함수는 있음)
4. 베이플랜 다중 적재 ⊕N 표시 (FR 4개 한 자리)
5. 특수화물 그룹 필터 (펼침)
6. 통합 검색 항차별 분리 표시
7. 보고 양식 (통계 자료 검토)
8. Firebase Blaze 전환 가이드 (필요 시)

## 🔧 주요 파일 위치

```
src/
├── utils.js                       # APP_VERSION='M3.5.4', tmp_missing 처리
├── firebase.js                    # chunkedReplace, fbDeleteSection
├── gemini.js                      # GEMINI_API_KEY export
├── nlSearch.js                    # 자연어 검색
├── shipStructure.js               # extractShipInfo
├── diagnostics.js                 # ★ 자동 진단 엔진 (M3.5.4)
├── mixerUpload.js                 # PDF/OCR 함수 (재사용)
├── voice.js                       # 음성 합성
├── components/
│   ├── DiagnosticsPanel.jsx       # ★ 자동 음성 + 경고등 (M3.5.4)
│   ├── BigResultCard.jsx          # 온도 미입력 빨강 점멸 (M3.5.4)
│   ├── BayPlan.jsx                # 리퍼 ring + ❄ (M3.5.4)
│   ├── CSVExport.jsx              # 온도미입력 컬럼 (M3.5.4)
│   ├── MixerUploadModal.jsx       # 보관 (제거됨)
│   ├── WrongAnswerModal.jsx       # 오답 신고
│   ├── HelpModal.jsx              # 인앱 매뉴얼
│   └── ...
└── pages/
    ├── HomePage.jsx               # DeleteVoyageModal
    ├── VoyagePage.jsx             # 진단 패널 자동 호출 (M3.5.4)
    └── ChiefDashboard.jsx         # 선박 라이브러리 + 오답 리포트
```

## 📝 작업 원칙

1. EDI 우선 (단일 진실)
2. 추론 X (실데이터 검증)
3. "만들지 마세요" → 즉시 중단
4. ZIP 배포는 누적 완성본
5. 자료 전달 후 인계 지침서 업데이트
6. 폰 친화 UI 우선
7. 검증된 단순 흐름이 복잡한 통합보다 안전
8. 자동 음성은 검수원이 수동 조작 안 해도 들어와야 함

## 💬 사용자 정보

성일 (평택항 검수). 동시 1~10척, 척당 평균 1000대.
M2.6 → M3.5.4까지 하루 만에 큰 폭 업데이트.
오늘 휴무 → 풀 테스트 → 모레 현장 투입 예정.
