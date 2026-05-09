# HANDOFF_TO_NEXT_CHAT.md — M4.9b → M5.0 인계

> 현재: **M4.9b 빌드 완료 (인쇄 가로 모드 + 페이지룰 + 항차표시)**
> M4.9 픽스(베이상세 크래시 + ISO403) **유지**, 추가로 인쇄 출력 샘플 매칭 작업
> 다음 세션 우선순위: 폰 인쇄 검증 결과 반영

---

## ✅ M4.9b 변경 사항 (이번 세션)

### [수정] 인쇄 가로 모드 (landscape)
- `PrintableBayDetail.jsx`: `@page { size: A4 portrait → landscape; margin: 0.4cm → 0.3cm }`
- `PrintableCargoPlan.jsx`는 원래부터 landscape (확인만)

### [수정] 베이 페이지네이션 룰 변경 — 사용자 정확 매칭
- **이전:** 베이 [7,8,9] → BAY07/BAY08/BAY09 3페이지
- **신규:** 베이 [7,8,9] → BAY07 단독 + BAY(08)09 짝꿍 2페이지
- **알고리즘:** 홀수 n에 대해 left(n-1) 짝수 있으면 짝꿍 `(n-1)n`, 없으면 odd 단독
- **샘플 PDF (TNJP 26334E) 17페이지 100% 매칭 검증:**
  ```
  BAY01 / BAY(02)03 / BAY05 / BAY(06)07 / BAY09 / BAY(10)11
  / BAY13 / BAY(14)15 / BAY17 / BAY(18)19 / BAY21 / BAY(22)23
  / BAY25 / BAY(26)27 / BAY29 / BAY(30)31 / BAY33
  ```

### [수정] 항차 번호 표시 (양하/선적 분리)
- 이전: `voyageInfo={null}` (항상 빈 값) → VOY NO 자리에 voyageKey만 표시
- 신규:
  - `VoyagePage` → `BayPlan` → `PrintableBayDetail`/`PrintableCargoPlan` 체인으로 `voyageInfo` 전달
  - 양하 항차(`voy_d`) ≠ 선적 항차(`voy_l`)이면 → `VOY NO : 양하 26334E / 선적 26334W`
  - 동일 또는 한쪽만 있으면 → 해당 항차만

### [수정] 셀 크기 가로 모드 최적화
- 셀 높이 `32px → 48px` (가로 A4 기준 9단까지 여유)
- 폰트 `5.5pt → 7pt` (5줄 정보 가독성 향상)
- 베이 제목 `14pt → 16pt`

### [수정] POL 빈칸 (샘플 매칭)
- 이전 선적 모드: `POL : PTK` 자동 표기
- 신규: `POL :` (빈칸) — 샘플 PDF와 동일, 검수원이 수기 또는 향후 자동 채움

---

## ✅ M4.9 변경 사항 (이전 세션, 유지됨)

### [긴급] 베이 상세 크래시 수정
- `PrintableBayDetail.jsx` useMemo deps의 `selectedKey` → `selectedKeys` 오타 수정
- ✅ 사용자 폰 검증에서 정상 작동 확인됨

### [방어] ErrorBoundary + formatCellLines try-catch + groupByBay 검증

### [신규] ISO403 자동 검출 + 사진 촬영 워크플로우
- `isISO403(c)`: 4530류, 9500류, L5XX류 검출
- BayPlan 상단 배지 + 미촬영 목록 펼침
- ContainerDetailModal에 ISO403 사진 박스 + 버튼
- `ISO403PhotoModal.jsx`: 1024px JPEG 자동 압축, Firebase RTDB 저장
- `fbSaveISO403Photo`, `fbDeleteISO403Photo`

---

## 🧪 폰 검증 체크리스트 (M4.9b ZIP 배포 후)

### A. 인쇄 가로 모드 ⭐ 이번 핵심
- [ ] 📋 베이상세 → 🖨️ 인쇄 → **가로** 방향으로 미리보기 뜨는지
- [ ] 베이 페이지 순서가 17페이지 (TNJP 26334E 기준) 샘플과 정확히 일치하는지
  - BAY01 / BAY(02)03 / BAY05 / BAY(06)07 / **BAY09** / BAY(10)11 / BAY13 / BAY(14)15 / BAY17 / BAY(18)19 / BAY21 / BAY(22)23 / BAY25 / BAY(26)27 / BAY29 / BAY(30)31 / BAY33
- [ ] (만약 [7,8,9] 같은 케이스가 있는 다른 항차면) BAY07 + BAY(08)09 두 페이지로 분할되는지

### B. 항차 번호 표시
- [ ] 헤더에 `VOY NO : 26334E` 형태로 항차 표시되는지
- [ ] 양하/선적 분리 항차(패턴 B)면 `VOY NO : 양하 XXX / 선적 YYY`로 둘 다 표시되는지

### C. 출력물 디자인 매칭 (BAYPLAN.pdf 샘플 vs 우리 출력)
- [ ] 헤더: `TEN JUPITER VOY NO : 26334E POL :` 동일 레이아웃
- [ ] 셀 5줄 (POL/POD/CN/F·E·무게·ISO/-18.0C 또는 IMDG/위치) 가독 OK
- [ ] tier 라벨(우측, 88/86/.../02) row 라벨(상하단 06/04/02/00/01/03/05) 정상

### D. 카고 플랜 (STOWAGE_PLAN.pdf 샘플 vs)
- [ ] 1페이지 가로 그리드, 양하 모드 = `o` 마킹, 선적 모드 = `L`/`P` 마킹
- [ ] 하단 통계 `20'/40'/45' / PTK 17/33/0 / OPT / TTL` 정상

### E. M4.9 기능 회귀 확인
- [ ] 베이상세 크래시 다시 발생 안 함
- [ ] ISO403 배지 + 사진 촬영 흐름 정상
- [ ] 화면 출력은 그대로 정상

---

## 🎯 M5.0 후보 작업 (다음 세션)

1. **인쇄 결과 미세조정** — 폰 검증에서 셀 크기/폰트/행간 조정 필요 시
2. **카고 플랜 STOWAGE_PLAN.pdf 미세 매칭** — 샘플과 좀 더 비슷하게
3. **POL 자동 채움** — 검수원이 수기로 안 적게 양하/선적 모드별 자동 표기 옵션
4. **ISO403 사진 일괄 다운로드** (M4.9 백로그)
5. **카고 플랜 1페이지 추가 축소** (M4.8 인계 백로그)
6. **미해결 백로그 (M3.86부터):**
   - ISO 변경 후 화면 미반영 보강 검증
   - 리퍼 온도 직접 수정 UI
   - IFCSUM 양식 자동 판별

---

## 📁 파일 위치

- 작업 디렉토리: `/home/claude/m49b_build/`
- ZIP: 사용자에게 전달됨 (`M4_9b_REAL_DEPLOY.zip`)
- 이번 세션 수정 파일:
  - `src/components/PrintableBayDetail.jsx` — buildBayPages 룰, @page landscape, 셀 크기, 항차/POL 표시
  - `src/components/PrintableCargoPlan.jsx` — 양하/선적 항차 표시
  - `src/components/BayPlan.jsx` — voyageInfo, voyageKey prop 전달
  - `src/pages/VoyagePage.jsx` — BayPlan에 voyageInfo, voyageKey 전달
- M4.9에서 추가/변경된 파일은 그대로 유지

---

## 🚀 M5.0 시작 명령

```bash
cd /home/claude/m49b_build
# 0) 폰 인쇄 검증 결과 받기 — 가로 OK / 페이지순서 OK / 항차표시 OK 인지
# 1) 미세조정 (셀 크기/폰트/POL 자동 등)
# 2) 백로그 처리
npx vite build
cp dist/index.html ./ && rm -rf assets && cp -r dist/assets ./
zip -rq M5_0_REAL_DEPLOY.zip . -x "node_modules/*" "dist/*" ".git/*"
```

---

## 💡 다음 세션 첫 메시지 권장

- **"M4.9b 폰 인쇄 결과: 가로 [정상/문제] / 페이지순서 [정상/문제] / 항차표시 [정상/문제]"**
- (문제 있으면) 어느 베이/페이지에서 어떻게 안 맞는지 + 가능하면 캡처
- "M5.0 시작"

ZIP 등 자료 전달 후엔 항상 이 HANDOFF 문서 업데이트.
