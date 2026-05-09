# HANDOFF_TO_NEXT_CHAT.md — M4.9 → M5.0 인계

> 현재: **M4.9 빌드 완료 (ZIP 배포 준비됨)**
> 검증 단계: 폰에서 ① 베이상세 크래시 해결 확인 ② ISO403 흐름 실데이터 검증
> 다음 세션 우선순위: 폰 검증 결과 반영 + 미해결 백로그 처리

---

## ✅ M4.9 변경 사항 (완료)

### [긴급] 베이 상세 크래시 수정
- **원인 확정:** `PrintableBayDetail.jsx` 271줄(M4.8 기준) `useMemo` deps 배열에 정의되지 않은 변수 `selectedKey` 참조 (실제 변수명 `selectedKeys` — 220줄 useState로 정의)
- **증상:** ReferenceError 즉시 throw → 컴포넌트 마운트 실패 → 화면 사라지고 페이지 리프레시해야 복구
- **픽스:** `selectedKey` → `selectedKeys` 1글자 수정으로 해결

### [방어] 한 곳 에러가 화면 전체를 무너뜨리지 않게
- `formatCellLines` 전체 `try-catch` + 모든 입력 `String(...)` 변환 — `wt`가 number/null이어도 OK, `iso/bay/row/tier` undefined여도 안전
- `groupByBay` containers 배열 검증
- **신규** `ErrorBoundary.jsx` — 에러 메시지 + 스택 트레이스 펼침 + "다시 시도" / "닫기"
- `PrintableBayDetail`, `PrintableCargoPlan` 둘 다 `<ErrorBoundary>`로 래핑

### [신규] ISO403 자동 검출 + 사진 촬영 워크플로우

**검출 룰** (`utils.js > isISO403`):
```js
- 4530 류 (4530, 4531~4539): 40ft 리퍼 HC
- 9500 류 (9500~9509): 45ft HC 4자리 표기
- L5XX 류 (L5G0, L5G1, L5HC 등): 45ft 알파벳 표기
```
정확한 룰은 사용자 검증 필요. 검출 결과를 화면에 표시해 검수원이 확인.

**워크플로우:**
1. EDI 업로드 → 자동 검출
2. **BayPlan 상단 배지** "📷 ISO403 N/M" — 미촬영 있으면 파란색 깜빡임, 완료 시 녹색
3. **배지 탭** → 미촬영 컨테이너 목록 펼침 (탭하면 상세 모달 열림)
4. **컨테이너 상세 모달**:
   - ISO403 대상이면 강조 박스 + 📷 버튼
   - 촬영 완료 시 녹색 ✓ 표시 + "보기/재촬영" 버튼
5. **신규 `ISO403PhotoModal.jsx`**:
   - 사진 촬영 (`<input capture="environment">` — 폰 카메라 직접 호출)
   - 1024px JPEG quality 0.72 자동 압축 (RTDB 5MB 안전 마진)
   - 기존 사진 미리보기 (RTDB에서 fetch)
   - 저장 / 삭제 / 재촬영
6. **Firebase 저장 구조:**
   - `voyages/{key}/photos/{ts}` — 사진 본체 (base64, type:'iso403', cn, by)
   - `voyages/{key}/{mode}/records/{cn}/iso403_photo_ts` — 촬영 마킹 + 이력
   - `voyages/{key}/{mode}/ediContainers/{cn}/iso403_photo_ts` — 화면 즉시 반영

---

## 🧪 폰 검증 체크리스트 (M4.9 ZIP 배포 후)

다음 세션 첫 메시지로 결과 알려주세요:

### A. 베이 상세 크래시 (가장 먼저)
- [ ] 베이 탭 → 📋 베이상세 누름 → 화면 떠지는지 (이전엔 사라졌음)
- [ ] 출력 모드 3종 (전체/평택/베이지정) 모두 정상
- [ ] 베이 지정 모드에서 다중 선택 토글 정상
- [ ] (혹시 다른 에러 발생 시) ErrorBoundary 에러 화면 캡처

### B. ISO403 검출 정확도
- [ ] EDI 업로드 후 상단 배지에 표시된 카운트 (사용자 신고 26대와 비교)
- [ ] 배지 탭 → 미촬영 목록의 ISO 코드 분포 (4530 / 9500 / 기타)
- [ ] 누락된 컨테이너 있으면 그 컨번호 + ISO 코드 → `isISO403` 룰 보강
- [ ] 잘못 잡힌 컨테이너 있으면 그 컨번호 + ISO 코드 → 룰에서 제외

### C. ISO403 사진 워크플로우
- [ ] 컨테이너 상세 → 📷 ISO403 사진 촬영 버튼 → 폰 카메라 뜨는지
- [ ] 촬영 후 압축 미리보기 → 저장 → ✓ 완료 표시되는지
- [ ] 다른 검수원/다른 폰에서 동일 컨테이너 열었을 때 사진이 동기화되는지
- [ ] 재촬영 / 삭제 동작 확인
- [ ] BayPlan 배지 카운트가 실시간 감소하는지

### D. 회귀 (M4.8까지 잘 되던 것)
- [ ] 카고 플랜 1페이지 출력 (M4.8 OK였음)
- [ ] 일반 베이 플랜 화면 정상

---

## 🎯 M5.0 후보 작업

다음 세션은 **폰 검증 결과 반영**이 1순위. 그 후 백로그:

1. **ISO403 룰 보강** — 폰 검증에서 누락/오탐 발견되면 isISO403 함수 수정
2. **ISO403 사진 일괄 다운로드** — 보고서용 ZIP/PDF 추출 기능
3. **통계 패널에 ISO403 진행률 추가** — 검수 완료율과 별도로
4. **카고 플랜 1페이지 추가 축소** (M4.8 인계에서 발견 — 2페이지 분할 케이스)
5. **미해결 백로그 (M3.86부터):**
   - ISO 변경 후 화면 미반영 (M4.1에서 일부 해결됨, 추가 검증 필요)
   - 리퍼 온도 직접 수정 UI 추가
   - IFCSUM 양식 자동 판별

---

## 📁 파일 위치

- 작업 디렉토리: `/home/claude/m49_build/`
- M4.9 ZIP: 사용자에게 전달됨 (`M4_9_REAL_DEPLOY.zip`)
- 새로 추가된 파일:
  - `src/components/ErrorBoundary.jsx`
  - `src/components/ISO403PhotoModal.jsx`
- 수정된 파일:
  - `src/utils.js` (APP_VERSION → M4.9, isISO403 함수)
  - `src/firebase.js` (fbSaveISO403Photo, fbDeleteISO403Photo)
  - `src/components/PrintableBayDetail.jsx` (크래시 픽스 + 방어)
  - `src/components/BayPlan.jsx` (ErrorBoundary 래핑 + ISO403 배지/패널)
  - `src/components/ContainerDetailModal.jsx` (ISO403 박스 + 버튼)

---

## 🚀 M5.0 시작 명령

```bash
cd /home/claude/m49_build
# 0) 폰 검증 결과 받기 — 베이상세 크래시 해결됐는지 / ISO403 카운트 정확한지
# 1) 결과에 따라 isISO403 룰 미세 조정
# 2) (필요 시) 추가 백로그 처리
npx vite build
cp dist/index.html ./ && rm -rf assets && cp -r dist/assets ./
zip -r M5_0_REAL_DEPLOY.zip . -x "node_modules/*" "dist/*" ".git/*"
```

---

## 💡 다음 세션 첫 메시지 권장

- **"M4.9 폰 검증 결과: 베이상세 [정상/크래시] / ISO403 [숫자]대 검출됨, 누락/오탐 [있음/없음]"**
- (누락 있으면) "누락 컨번호: XXX (ISO XXXX), YYY (ISO YYYY)..."
- (오탐 있으면) "오탐 컨번호: ZZZ (ISO ZZZZ)..."
- "M5.0 시작"

ZIP 등 자료 전달 후엔 항상 이 HANDOFF 문서 업데이트.
