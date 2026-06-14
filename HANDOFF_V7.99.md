# Tallyman Master V7.99 인계서

## 작업 요약 (2026-06-15 세션)
경쟁사 AI 분석서를 실데이터로 검증해 타당한 2건만 채택·구현. (구조 진단은 정확, 자동화 제안 5번은 이미 구현된 기능 다수 오판 → 기각)

### ① alert → 토스트 전환 (작업 흐름 끊김 제거)
- 신규 `src/toast.js`: window.alert를 가로채 화면 하단 토스트로 표시.
- 성공·안내 = 초록 2.6초, 실패·오류 = 빨강 6초(탭 즉시 닫기). confirm/prompt는 미변경(사용자 선택 보존).
- `src/main.jsx`에서 `installToastAlert()` 1회 호출 — 31개 파일 119개 alert를 호출부 무수정으로 전부 전환.
- 검증: 실제 메시지 10건 성공/오류 분류 10/10 PASS.

### ② v1.1 베이사전(미검증 11척) 제거 (초기 로딩·안정성)
- `src/data/shipBayDict.js`(18,903줄, verified:false) → `shipStructure.js`에서 import·폴백·통계 제거.
- 근거: 11척 전부 v2(verified) 사전에 존재 확인. 코드 조회 9척 + 선박명 조회 2척(S639, SAWASDEE SPICA=SWSP).
- 검증: 11/11 PASS (코드 우선, 미스 시 선박명 fuzzy).
- ⚠️ S639/9946647은 v2에 선박명으로만 등록 — 코드 단독 조회 경로가 있다면 선박명 병행 필요. (v1.1도 미검증이라 회귀 아님.)
- 파일 자체는 보존(tree-shaking으로 번들 미포함). 완전 삭제는 차후 판단.

## 미채택 (분석서에서 기각)
- 검수원 실적·AIS·실시간 대시보드: 이미 구현됨(V7.40 대시보드 / PORT-MIS / V7.94-14).
- AI 자동 Bay 배치: 검수 본업(계획→실체 검증)과 충돌.
- firebase.js/VoyagePage 파일 분리: 화면 변화 없음 + 회귀 위험 → 보류.

## 검증
- bash build.sh 성공. APP_VERSION V7.99 (utils.js/sw.js/public/sw.js 동기화).
- v1.1 고유 마커("1024B 레코드" 등) 번들에서 제거 확인.
