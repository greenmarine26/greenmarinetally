# Tallyman Master — HANDOFF.md (격리 작업본)

**최종 갱신**: 2026-05-26
**현재 버전**: **M6.93.11.LOCK1** (M6.93.11 베이스 + 잠금 보호 시스템 + BayPlan 통합 + HelpModal)

---

## 작업 배경
- M6.93.12~.18 회귀 누적 (DXQD 짝수 변형 등)
- M6.93.11이 안정 베이스 (매트릭스 빌더 + 사용자 cells 우선 + V2 전용 이미 작동)
- 잠금 보호 + 8단계 흐름 + 시뮬 + 리프레쉬만 추가

## 8단계 흐름 (완전 구현)
```
[1] EDI 자동 분석          ✅ buildMatrixFromEdi (기존)
[2] 부족 → PDF 업로드 요구  ✅ ShipMatrixBuilderModal (기존)
[3] PDF 결정론 파싱        ✅ parsePdfStowage (기존, AI 없음)
[4] 자동 검증              ★ validateMatrixAgainstEdi (신규)
[5] 사용자 수정            ✅ 베이 추가/삭제/수정 폼 (기존)
[6] 시뮬 미리보기          ★ SimulationBox 컴포넌트 (신규)
[7] 🔒 잠금 저장           ★ _lockedDecisions (신규)
[8] 🔄 카고플랜 적용       ★ window.location.reload (신규)
```

## 변경 파일 (5개 + 빌드 설정)

| 파일 | 변경 내용 |
|---|---|
| `src/cargoPlanCore.js` | `autoPairBays(matrixBays, lockedDecisions=null)` — 잠금 우선 분기 |
| `src/shipMatrixBuilder.js` | `matrixToMatrixBays`, `validateMatrixAgainstEdi` 신규 |
| `src/components/PrintableCargoPlanV2.jsx` | `_lockedDecisions` 우선 사용 |
| `src/components/BayPlan.jsx` | 잠금 결정 우회 분기 (페어/단독 영구 보존) |
| `src/components/ShipMatrixBuilderModal.jsx` | SimulationBox + handleLockSave + handleRefresh + 8단계 가이드 헤더 |
| `src/components/HelpModal.jsx` | M6.93.11.LOCK1 사용법 9개 항목 추가 |
| `build.sh` + `public/sw.js` | sw.js VERSION 자동 동기화 + dev-source 임시 복원 |

## 데이터 모델
잠금 저장 후 user dict:
```js
entry.bayDef = {
  ...기존 필드,
  _locked: true,
  _lockedDecisions: {
    trios: [['03', '(04)05'], ['07', '(08)09'], ['11', '(12)13'],
            ['15', '(16)17'], ['19', '(20)21'], ['23', '(24)25']],
    singles: ['01'],
    lockedAt: '2026-05-26T...',
    lockedBy: 'matrix-builder',
  }
}
```

## 검증 (시뮬 PASS)
사용자 디버그 데이터 (짝수 [4,8,12,16,20,24]) 종단간 시뮬:

**PrintableCargoPlanV2 (카고플랜 PDF)**
- 페어 박스: `(04)05, (08)09, (12)13, (16)17, (20)21, (24)25` — OOCL 100% 일치 ✅
- 별도 페이지: `01, 03, 07, 11, 15, 19, 23` — OOCL 100% 일치 ✅

**BayPlan (베이그리드 화면)**
- 13 페이지 모두 CASPI와 100% 일치 ✅
- 페어 6개 + 단독 7개 (top + single) 모두 정확

## 사용자 운영 통합
이 ZIP을 GitHub repo에 통째로 적용 후 push.
- sw.js VERSION 자동 'M6.93.11.LOCK1'로 갱신 → 폰 캐시 자동 무효화
- 강력 새로고침 1회 → 새 빌드 즉시 적용

## 검수원 워크플로 (사용 절차)
1. 신규 선박 항차 → "🚢 신규 선박 베이 매트릭스 빌더" 클릭
2. EDI 자동 분석 → 베이사전 매칭 → 1~max 자동 채움
3. 상단 **"🔍 시뮬레이션 미리보기"** 박스 확인:
   - 초록 = 검증 통과, 빨강 = EDI 모순 감지 (누락 베이 표시)
   - 페어/단독 미리보기 → CASPI/OOCL PDF와 시각 대조
4. 차이 있으면 베이 추가/삭제/수정 → 시뮬 박스 즉시 업데이트
5. 일치 확인 후 [🔒 잠금 저장] 클릭
6. [🔄 카고플랜 적용] 클릭 → 페이지 새로고침
7. 카고플랜 / 베이플랜 출력 → 잠금 결정 그대로 (변형 절대 없음)

## 작업 원칙 준수 (검수앱지침서 M6.93.12)
1. ✅ 사용자 데이터 절대 보호 — autoPairBays/BayPlan 모두 잠금 우선
2. ✅ lookup 매칭 넓게 — 기존 fuzzy 로직 그대로 유지
3. ✅ 시뮬 검증 ZIP 전 필수 — 두 컴포넌트 모두 OOCL 100% 일치 시뮬 PASS

## Rules of Hooks 준수
- BayPlan에 조기 return 없음 (기존)
- ShipMatrixBuilderModal에 새 hook 추가 시 컴포넌트 최상단에 배치
- M6.93.18에서 발생했던 #310 에러 위험 없음

## 미해결 작업 (사용자 결정 후)
1. 시뮬 박스 시각화 강화 (현재 텍스트 → 미니 SVG 미리보기)
2. 기존 user dict entry 일괄 잠금 마이그레이션 도구
3. 검수원이 자주 쓰는 선박 우선 잠금 등록 (NBTD, MCSC 등)
