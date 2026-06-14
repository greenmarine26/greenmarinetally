# Tallyman Master V7.94-25 인계서

## 이번 변경 (V7.94-25) — 베이매트릭스 해치커버 일괄 적용
신규 선박마다 베이별 '해치' select를 일일이 만지던 것을 버튼으로 일괄 처리.

**위치**: ShipMatrixBuilderModal 베이 목록 상단 "⚓ 해치 일괄" 컨트롤 줄.

**버튼 동작**
- `홀드=2 · 데크=0` : 홀드 있는 베이 전부 hatchCount=2, 홀드 없는 데크전용 베이 0. (가장 흔한 패턴)
- `전부 자동` : 전 베이 hatchCount=null → 저장 시 홀드 유무로 자동(홀드 1·데크 0). 해치가 자동인 선박용.
- `1번 베이만 [2]/[3]` : 가장 앞 베이(사전순 첫번째)만 해당 값. 보통 1번 베이만 다른 값일 때.
- 예외 베이는 기존처럼 각 베이 '해치' select로 개별 조정.

**일반 작업 흐름**: [홀드=2·데크=0] 클릭 → [1번 베이만 3] 클릭 → 끝. (예외 베이만 추가 조정)

**구현 (외과적)**
- src/components/ShipMatrixBuilderModal.jsx: applyHatchBulk(mode) / applyHatchFirstBay(value) 핸들러 추가(copyBayStructure 패턴 재사용), 베이 목록 위 컨트롤 UI 1줄.
- 기존 updateBay·setMatrix만 사용, 새 의존성/파일 없음.
- 저장 직렬화는 기존 그대로(shipMatrixBuilder.js: hatchCount 명시값 우선, 없으면 홀드 1/데크 0).

**검증**: 로직 단위 시뮬 13/13 PASS (홀드/데크 혼재 6베이 실모사 — hold2·firstBay·auto·데크전용 0 보장·정렬). 빌드 성공 + 신규 UI 라벨 5종 빌드 JS 박힘 확인.

## 버전
V7.94-25 (src/utils.js, sw.js, public/sw.js 동기화)
