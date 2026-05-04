# 📋 다음 채팅 인계 지침서
**최종**: 2026-05-05 (M3.5.4-fix3)

## 현재 상태
- 버전: M3.5.4-fix3
- 최근 ZIP: greenmarinetally-M3.5.4-fix3.zip
- AI 모델: Gemini 2.5 Pro

## M3.5.4-fix3 완료 (오늘 새벽~아침)

1. **규격(ISO) 수정 실제 반영** ★ 어제 미해결 버그 해결
   - fbUpdateRecordField가 records + ediContainers 둘 다 업데이트
   - 모든 진단 경고에서 수정한 것 즉시 반영

2. **리퍼 온도 수정 UI 추가** ★ 어제 미해결 신규 기능
   - ContainerDetailModal에 온도 입력 필드
   - 빠른 선택 버튼 (-25/-18/-15/0/4)
   - 빈칸 = 미입력 처리

3. **Gemini 2.5 Pro 업그레이드**
   - 자연어 답변 + 사진 OCR 둘 다 향상
   - API 키 그대로, 무료 한도 충분

## 다음 작업 후보

1. **현장 테스트 결과 반영** ← 모레 현장 투입 후
2. **다른 선사 PDF 양식** (KMTC/SM Line/흥아/CMA)
3. **사진 OCR 결과 검수원 확인 UI**
4. **Error Boundary** (한 컴포넌트 에러 → 전체 다운 방지)
5. **stable 백업 URL** (현장에서 안정 버전 우회)
6. **GitHub Actions 자동 빌드**

## 핵심 파일

```
src/
├── utils.js              APP_VERSION='M3.5.4-fix3'
├── firebase.js           fbUpdateRecordField (records + ediContainers 둘 다)
├── gemini.js             gemini-2.5-pro
├── mixerUpload.js        gemini-2.5-pro (OCR)
├── diagnostics.js        자동 진단
├── components/
│   ├── DiagnosticsPanel.jsx     음성 + 경고등 + 컨번호 클릭
│   ├── ContainerDetailModal.jsx ★ 규격+온도 수정 UI
│   ├── BayPlan.jsx             리퍼 ring + ❄
│   └── ...
└── pages/
    ├── VoyagePage.jsx          ★ 진단 + EDI 보호 + 중복 처리
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
8. state 위치 신중히 (메인 컴포넌트 vs 하위)
9. records 수정 시 ediContainers도 함께 (화면 보는 노드)

## 사용자 정보

성일 (평택항 검수). 동시 1~10척, 척당 ~1000대.
M2.6 → M3.5.4-fix3 큰 폭 업데이트.
오늘(2026-05-05) 휴무, 모레 현장 투입 예정.
