# M5.26 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.26) — 검수 자료 출력 통합 허브

사용자 발견: M3.86에서 작업한 inspectionList.js가 코드베이스에 머지 안 됨. 복구 + 통합 출력 허브로 확장.

## ✅ 변경 사항 (M5.25 → M5.26)

### 1. inspectionList.js 복구 (M3.86 명세 그대로)

| 항목 | 명세 |
|---|---|
| 용지 | A4 세로, 여백 0.4cm |
| 레이아웃 | 좌우 2단 |
| 페이지당 | 140대 (단당 70대) |
| 컬럼 | 순번/컨번호/실번호/규격/F/E/비고 |
| 정렬 | 20풀 → 20엠티 → 20특수 → 40풀 → 40엠티 → 40특수 |
| 색상 | 풀=흰색 / 엠티=#e5e5e5 / 리퍼=#cce6ff / FR=#d4edda / OT=#fff3cd / TK=#ffe5d0 |
| 시트1 | 전체 |
| 시트2 | 특수화물 별첨 |
| 출력 | 새 창에 HTML → Ctrl+P → 인쇄 또는 PDF |

### 2. PrintHubModal — 통합 출력 허브

```
[📄 검수 자료 출력]
├─ 양하 탭 (개수 표시)
│   ├─ 📋 검수 리스트 (inspectionList.js)
│   ├─ 📐 카고플랜 (PrintableCargoPlan)
│   └─ 🚢 베이 상세 (PrintableBayDetail)
└─ 선적 탭 (개수 표시)
    └─ (양하와 동일 3가지)
```

**진입점**: 자료 탭 맨 위 [📄 검수 자료 출력] 버튼 (대형 amber 카드)

각 항목 클릭 → 모달 내부에서 카고플랜/베이상세 ErrorBoundary 감싸 표시 / 검수 리스트는 새 창

### 3. 평택분만 처리

- 양하 mode 컨테이너 = 평택 양하 대상 (voyage.discharge.containers)
- 선적 mode = 평택 선적 대상 (voyage.loading.containers)
- 기존 mode 분리 그대로 사용 → 다른 항만 통과분 자동 제외

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.26' |
| **src/inspectionList.js** | 신규 (검수 리스트 HTML 생성, M3.86 복구) |
| **src/components/PrintHubModal.jsx** | 신규 (양하/선적 × 3항목 통합) |
| src/pages/VoyagePage.jsx | DataTab에 [📄 검수 자료 출력] 진입 버튼 + showPrintHub state + PrintHubModal import |
| src/components/HelpModal.jsx | M5.26 변경사항 |

## 사용자 시점 핵심 메시지

1. **검수 리스트 복구** — M3.86 명세 그대로
2. **통합 출력 허브** — 양하/선적 × 3가지 출력 = 6가지를 한 곳에
3. **자료 탭 맨 위** [📄 검수 자료 출력] 버튼

## 검증 결과

- 버전 M5.26: 2회 ✓
- 검수 자료 출력 / 검수 리스트 / 시트1 / 시트2 / 특수화물 별첨 모두 적용 ✓
- 기존 기능 (M5.25 OCR, M5.24 9V7919, M5.23 BULK_AUTO 192, M5.20 priority) 잔존 ✓

## ⚠️ 잠재 이슈

1. **팝업 차단**: 검수 리스트는 새 창에서 열림 → 브라우저 팝업 차단 시 안 열림. 안내 메시지 포함
2. **카고플랜/베이상세 인쇄**: 기존 컴포넌트 그대로 활용 (ErrorBoundary 감쌈)
3. **베이 상세 globalRowRange**: 현재 null로 전달 — 컴포넌트 내부에서 자동 계산 가정. 안 되면 BayPlan에서 사용하는 값 전달 필요
4. **컬러 인쇄**: 색상 구분이 핵심. 흑백 인쇄면 정보 손실

## 🔜 다음 세션 후보

1. 사용자 실제 인쇄 결과 확인 → 양식 미세 조정
2. inspectionList의 ISO 코드 → 규격 변환 로직 검증 (R/P/U/T 판별)
3. 출력 양식별 옵션 (예: 검수원명 자동 입력, 페이지 번호 형식)

## 영구 규칙 (메모리)

(이전과 동일)
1~12: 빌드/시뮬 원칙, 베이 구조, alias, listener, 음성 priority, Chrome 확장, EDI vs PORT-MIS, 매칭 우선순위, 베이사전 300척, 베이 표시 절대 원칙, PORT-MIS 매칭
