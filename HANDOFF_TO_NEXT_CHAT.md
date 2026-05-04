# 📋 다음 채팅 인계 지침서
**최종**: 2026-05-05 (M3.5.5)

## 현재 상태
- 버전: M3.5.5
- ZIP: greenmarinetally-M3.5.5.zip
- AI: Gemini 2.5 Pro

## M3.5.5 완료 (오늘 진행)

### 엠티 실 작업 시스템 ★ 신규
1. shipPolicies.js: 정책 사전 (TNJP/RZOR=verify, ATRP=attach)
2. ContainerDetailModal: 엠티 실 입력 (3가지 - 기본/리씰/틀린실)
3. ShipPolicyModal: 새 선박 정책 등록
4. EmptySealReport: 엑셀 보고서 (사용자 형식)
5. ChiefDashboard: 실시간 부착 현황 표
6. diagnostics: 엠티 실 누락 검사 + 음성
7. VoyagePage: 정책 자동 적용 + 배너

### 검증 완료
- ATRP 2621W: 위해행 엠티 50대 정확히 매칭
- TNJP 25333W: 엠티 213대 모두 매칭
- 선박명 별칭 처리 (ATPR↔ATRP, LYTJ↔TNJP)
- POD 코드 별칭 처리 (CNWEI↔CNWEH)

### 보강 사항
- 규격 수정 화면 반영 (records + ediContainers 동시)
- 리퍼 온도 수정 UI
- Gemini 2.5 Pro 업그레이드

## 다음 작업 후보

1. 현장 테스트 결과 반영 (모레)
2. 다른 선사 PDF 양식 검증
3. 사진 OCR 결과 확인 UI
4. Error Boundary (안전장치)
5. stable 백업 URL (현장 우회)

## 핵심 파일

```
src/
├── utils.js              APP_VERSION='M3.5.5'
├── firebase.js           fbSetEmptySeal (eseal/eseal_wrong/reseal)
├── shipPolicies.js       ★ 정책 사전 + 매칭
├── diagnostics.js        엠티 실 검사 추가
├── components/
│   ├── ShipPolicyModal.jsx       ★ 새 선박 등록
│   ├── EmptySealReport.jsx       ★ 엑셀 보고서
│   ├── ContainerDetailModal.jsx  엠티 실 입력 UI (3종류)
│   ├── DiagnosticsPanel.jsx     엠티 실 경고
│   └── ...
└── pages/
    ├── VoyagePage.jsx          정책 자동 적용 + 배너
    ├── ChiefDashboard.jsx      ★ 실시간 부착 현황
    └── ...
```

## 작업 원칙
1. EDI 우선 (단일 진실)
2. 추론 X
3. "만들지 마세요" → 즉시 중단
4. ZIP은 누적 완성본
5. 자료 전달 후 인계 지침서 업데이트
6. 폰 친화 UI
7. 검증된 단순 흐름 > 복잡한 통합
8. records 수정 시 ediContainers도 함께
9. state 위치 신중히 (메인 컴포넌트 vs 하위)
10. 자동 음성은 검수원 수동 조작 X 들어와야

## 사용자 정보
성일 (평택항 검수). 동시 1~10척, 척당 ~1000대.
오늘(2026-05-05) 휴무, 모레 현장 투입.
