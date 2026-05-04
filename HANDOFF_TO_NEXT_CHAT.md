# 📋 다음 채팅 인계 지침서
**최종**: 2026-05-04 (M3.5.4-fix2)

## 현재 상태
- 버전: M3.5.4-fix2
- 최근 ZIP: greenmarinetally-M3.5.4-fix2.zip

## M3.5.4-fix2 완료
1. 양하 검정 에러 수정 (state 위치 버그)
2. EDI=진실 원칙 강화 (리퍼 분류 정확화)
3. X-RAY 카운트 정확화
4. 자료 업로드 중복 처리 옵션 (교체/병합/신규만)
5. 컨테이너 규격(ISO) 직접 수정 UI
6. 알 수 없는 ISO 자동 감지 경고
7. 진단 경고에서 컨번호 클릭 → 모달 직접 열기

## 다음 작업 후보

1. **Error Boundary** — 한 컴포넌트 에러로 전체 다운 방지
2. **stable 백업 URL** — 현장에서 검수원이 안정 버전 우회
3. **GitHub Actions 자동 빌드** — 매번 npm build 안 해도 됨
4. **다른 선사 PDF 양식** (KMTC/SM Line/흥아/CMA)
5. **사진 OCR 결과 검수원 확인 UI**

## 작업 원칙
1. EDI 우선 (단일 진실)
2. 추론 X
3. "만들지 마세요" → 즉시 중단
4. ZIP은 누적 완성본
5. 자료 전달 후 인계 지침서 업데이트
6. 폰 친화 UI
7. 검증된 단순 흐름 > 복잡한 통합
8. state 위치 신중히 (메인 컴포넌트 vs 하위)

## 핵심 파일
```
src/
├── utils.js              APP_VERSION, parseBAPLIE
├── firebase.js           chunkedReplace, fbUpdateRecordField
├── diagnostics.js        ★ 자동 진단 (M3.5.4)
├── components/
│   ├── DiagnosticsPanel.jsx     ★ 음성 + 경고등 + 컨번호 클릭
│   ├── ContainerDetailModal.jsx ★ 규격 수정 UI (fix2)
│   ├── BayPlan.jsx             리퍼 ring + ❄
│   └── ...
└── pages/
    ├── VoyagePage.jsx          ★ state 위치 + EDI 보호 + 중복 처리
    └── ...
```

## 사용자 정보
성일 (평택항 검수). 동시 1~10척, 척당 ~1000대.
M2.6 → M3.5.4-fix2 하루 만에 큰 폭 업데이트.
