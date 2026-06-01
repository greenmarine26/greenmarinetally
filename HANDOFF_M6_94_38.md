# Tallyman Master M6.94.38 — 콘 계산기(cone.html) 묶음 + 빌드본 포함 배포

## 이번 변경
- 콘 계산기 앱 추가: 루트 `cone.html` (서빙용) + `public/cone.html` (소스).
- M6.94.37(매트릭스 빌더 저장 후 베이 안 보임 fix) 포함 — 빌드된 assets/index-*.js에 반영 확인.

## 배포 방법 (ZIP을 저장소에 올리고 commit & push)
- 이 ZIP은 원본 M6.94.36과 동일하게 **루트에 빌드본 포함**:
  - 루트 index.html = 빌드본 (./assets/index-XXX.js 참조)
  - assets/index-*.js, *.css = 빌드 산출물
  - 루트 cone.html = 콘앱 (그대로 서빙됨)
- 따라서 ZIP을 저장소 루트에 통째로 덮어쓰고 commit & push 하면 끝.
  별도 빌드 불필요. 검수앱 + 콘앱이 동시에 배포됨.

## 배포 후
- 검수앱(기존 사용자): 폰에서 새로고침 → 최신본 자동 반영.
- 콘앱(신규): 인력에게 cone.html 링크 공유 → 폰에서 열기 (새 페이지라 새로고침할 것 없음).

## 접속 주소
- 검수앱: https://greenmarine26.github.io/greenmarinetally/
- 콘앱:   https://greenmarine26.github.io/greenmarinetally/cone.html

## 콘앱 기능 요약
- 검수앱 Firebase(voyages/{key}/{mode}/raw/edi)에서 EDI 원문 직접 읽기 (파일 업로드 불필요).
- 항차 선택 → 양하/선적 EDI 자동 로드 → 콘 계산(데크/코끼리/홀드, +추가 −반납).
- "베이 위치 보기": 베이별 격자로 양하(파랑)/선적(초록)/공통(주황), 40ft●/20ft○.

## 검증
- _index.entry.html 진입점으로 vite build → dist를 루트로 복사 (build.sh 방식).
- 루트 index.html = 빌드본, 참조 assets 실존, /src/main.jsx 소스형 없음 — 통과.
- 빌드된 JS에 baysSummary 폴백(M6.94.37) 반영 확인.
- 루트 cone.html = public/cone.html 바이트 동일.

## 주의
- 콘앱 항차 목록은 Firebase voyages read 권한이 비인증 허용이어야 보임.
  목록이 안 뜨면 보안 규칙 확인.

## 다음 작업 참고
- 다음 수정 시: src에서 고친 뒤 build.sh(또는 _index.entry.html → vite build → dist를 루트 복사)로
  루트 빌드본 갱신 후 push. 루트 index.html이 소스형(/src/main.jsx)이면 production 404.
