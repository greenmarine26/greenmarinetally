# HANDOFF_TO_NEXT_CHAT.md — M4.9b → M5.0 인계

> 현재: **M4.9b 빌드 완료 (빌드 함정 해결, 진정한 변경 반영)**
> ⚠️ 이전 ZIP들은 빌드 함정으로 인해 변경사항이 반영 안 된 상태였음
> 이번 빌드는 검증 통과: M4.9b 3회, A4 landscape 2회, break-after: page 2회, ISO403 20회

---

## 🐛 이전 빌드들이 무효였던 이유

**원인:** `index.html`이 vite 진입점이 아니라 빌드 산출물 형태였음.
- 이전 흐름: `dist/index.html` (빌드 결과) → root에 복사 → 그 안에 `<script src="./assets/index-XXX.js">` 박힘
- 다음 빌드 시 vite가 root의 index.html을 읽고, 거기 있는 빌드된 JS 경로를 따라 7 modules만 transform → 소스 변경(예: 'M4.9' → 'M4.9b')이 무시됨

**해결:** `build.sh` 스크립트 추가
- 빌드 시작 시 `index.html`을 항상 진입점 형태로 (`<script src="/src/main.jsx">`) 복원
- vite build → dist/index.html을 root로 다시 복사 (배포 형태)
- 검증 단계: 산출물에 핵심 키워드 카운트 출력

다음 세션에선 `bash build.sh`로 빌드하면 됨.

---

## ✅ M4.9b 변경 사항 (이번에 진짜 들어간 것들)

### 1. APP_VERSION = 'M4.9b'
- `utils.js` — 화면 우측 상단 표시로 적용 여부 즉시 확인 가능

### 2. 베이상세 인쇄 (PrintableBayDetail)
- `@page { size: A4 landscape }` (이전: portrait)
- **베이별 페이지 분리 강제** — 폰 Chrome에서 `page-break-after: always` 무시 이슈 해결:
  - 모던 표준 `break-after: page`, `break-inside: avoid` 추가
  - 인쇄 시 flex 부모를 `display: block`으로 강제 (`bd-print-container` 클래스)
  - `page-break-after: always !important` (specificity 강화)
  - 마지막 페이지는 `break-after: auto`
- 페이지네이션 룰 변경 — 7,8,9 → BAY07 단독 + BAY(08)09 짝꿍 (샘플 PDF 매칭)
- 셀 크기 가로용 최적화 (32→48px, 폰트 5.5→7pt)
- POL 빈칸 (샘플 매칭)

### 3. 카고 플랜 인쇄 (PrintableCargoPlan)
- AFT 영역 5-col 통일 — 이전 (22)23이 외따로 떨어진 버그 해결
- legend를 페이지 하단 footer로 분리

### 4. 항차 번호 표시 (양하/선적 분리)
- VoyagePage → BayPlan → 인쇄 컴포넌트 체인으로 voyageInfo 전달
- voy_d ≠ voy_l이면 → `VOY NO : 양하 26334E / 선적 26334W`

### 5. M4.9 핵심 (유지)
- 베이상세 크래시 수정 (selectedKey 오타)
- ErrorBoundary 방어
- ISO403 검출 + 사진 워크플로우

---

## 🧪 폰 검증 체크리스트

### A. 적용 여부 (가장 먼저)
- [ ] 우측 상단 버전 표시가 **M4.9b**로 보임 (M4.9가 아님)

### B. 베이상세 인쇄 (PrintableBayDetail) ⭐ 이번 핵심
- [ ] **가로 모드** 미리보기
- [ ] **베이별 페이지 분리** — BAY05와 BAY(06)07이 다른 페이지에 있는지
- [ ] 페이지 순서 — BAY01, BAY(02)03, BAY05, BAY(06)07, BAY09, BAY(10)11, ...
- [ ] VOY NO 헤더 채워짐

### C. 카고 플랜 인쇄 (PrintableCargoPlan)
- [ ] 모든 베이 1페이지에 들어감
- [ ] (22)23 같은 페어가 다른 페어들과 같은 행에
- [ ] 하단 footer에 "20'/40'/45' o PTK 297/0/0"
- [ ] (사용자 지적) 배치 어색한 부분 — BAY 38 (짝수 단독)이 어디에 있는 게 자연스러운지 알려주세요:
  - 옵션 A (현재): AFT singles 행 좌측 첫칸 (38, 33, 29, 25, 21)
  - 옵션 B: AFT pairs 행 마지막 칸 (33, 29, 25, 21 + 빈) / ((34)35, (30)31, (26)27, (22)23, **38**)
  - 옵션 C: 별도 행
  - 옵션 D: 그밖에...

### D. M4.9 회귀 확인
- [ ] 베이상세 크래시 안 남
- [ ] ISO403 배지 + 사진 촬영 흐름

---

## 🎯 M5.0 후보 작업

1. **카고 플랜 BAY 38 배치** — 사용자 의도 반영 (위 옵션 중 선택)
2. **인쇄 결과 미세조정** — 폰 검증 결과 셀/폰트 미세조정
3. **POL 자동 채움 옵션** — 검수원이 매번 수기 안 적게
4. **ISO403 사진 일괄 다운로드** (M4.9 백로그)
5. **M3.86 미해결 백로그:**
   - 리퍼 온도 직접 수정 UI
   - IFCSUM 양식 자동 판별

---

## 📁 파일 위치

- 작업 디렉토리: `/home/claude/m49b_build/`
- ZIP: 사용자에게 전달됨 (`M4_9b_REAL_DEPLOY.zip`)
- **신규 `build.sh`** — 다음 빌드부터 이걸로 (함정 방지)

---

## 🚀 M5.0 시작 명령

```bash
cd /home/claude/m49b_build
# 0) 폰 검증 결과 받기:
#    - M4.9b 버전 표시? → 적용 OK
#    - 베이별 페이지 분리? → page-break 동작 OK
#    - 카고 플랜 BAY 38 배치 → 사용자 옵션 선택
# 1) 코드 수정
# 2) 빌드 (자동화 스크립트로):
bash build.sh
# 3) 검증 출력 확인 후 ZIP:
zip -rq M5_0_REAL_DEPLOY.zip . -x "node_modules/*" "dist/*" ".git/*"
```

---

## 💡 다음 세션 첫 메시지 권장

- **"M4.9b 적용 확인: 버전표시 [M4.9b/M4.9] / 베이상세 페이지분리 [정상/문제] / 카고플랜 BAY 38 위치 [현재 OK / 옵션 X로 변경]"**
- "M5.0 시작"
