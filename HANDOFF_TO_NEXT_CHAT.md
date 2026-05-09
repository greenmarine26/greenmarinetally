# HANDOFF_TO_NEXT_CHAT.md — M4.9b → M5.0

> **M4.9b 빌드 완료** (build.sh로 1643 modules 정상 transform)
> 검증: M4.9b 3, A4 landscape 2, break-after: page 2, iso403_photo 20, eseal_history 10, 수정 리포트 5

---

## ✅ M4.9b 변경 요약

### A. 인쇄 시스템 (이전 빌드 함정 해결됨)
- `index.html`이 항상 vite 진입점 형태 유지 (build.sh가 자동 복원)
- 베이상세 가로 모드 + 베이별 페이지 분리 강제 (`break-after: page` + flex 부모 우회)
- 페이지네이션 7,8,9 → 07 단독 + (08)09 짝꿍
- 카고 플랜 AFT 5-col 통일, legend는 footer
- 항차번호 양하/선적 분리 시 둘 다 표시

### B. 엠티 실 verify 모드 단순화 (TNJP/RZOR) ⭐ 이번 추가
**이전 동작 (사용자 불만):**
- 엠티에 ⚠️ "실 확인 필요" 깜빡 경고
- 수정 시 "리씰" or "틀린실" 라디오 강제 선택

**새 동작 (사용자 요청 반영):**
- ⚠️ 깜빡 경고 제거 → 단순 "실번호 미입력" 표시
- 수정 시 라디오 강제 제거 → 단순 덮어쓰기
- 수정 이력은 자동 저장 (`eseal_history`)
- "엠티 실 표기"로 라벨 변경 (이전 "엠티 실 확인")
- attach 모드(ATRP)는 그대로 — 실제 실 부착 작업이 필요하므로 깜빡 경고 유지

**신규 "엠티 수정 리포트":**
- 보고서 박스에 별도 "엠티 수정 리포트 (N건)" 버튼 추가
- 수정 발생 건수 자동 카운트 (eseal_history에서 from→to 변경만)
- 클릭 시 별도 엑셀: 순번/컨번호/규격/이전번호/새번호/수정자/수정시각
- 수정 0건이면 비활성화 표시
- 메인 보고서도 단일 엠티실번호 컬럼만 (틀린실/리씰 컬럼 제거)

### C. M4.9 핵심 (유지)
- 베이상세 크래시 수정 (selectedKey 오타)
- ErrorBoundary 방어
- ISO403 검출 + 사진 워크플로우

---

## 🧪 폰 검증 체크리스트

### 1. 적용 여부
- [ ] 우측 상단 **M4.9b** 표시
- [ ] (인쇄) 베이상세 가로 + 베이별 페이지 분리
- [ ] (인쇄) 카고플랜에 VOY NO 채워짐, (22)23 정상 위치

### 2. TNJP 엠티 실 단순화 ⭐ 이번 핵심
- [ ] 엠티 컨테이너 상세 모달 → ⚠️ 깜빡 경고 **사라짐**
- [ ] "엠티 실 표기" 박스 (이전 "확인")
- [ ] 실번호 미입력 시 단조로운 회색 텍스트로만 표시
- [ ] 입력 후 수정 → 라디오 선택 **없이** 바로 새 번호 입력
- [ ] 저장 후 작은 "(수정 N회)" 표시
- [ ] 보고서 영역에 "엠티 수정 리포트 (N건)" 버튼
- [ ] 수정 발생 시 클릭 → 엑셀에 from→to 행만 출력

### 3. ATRP 엠티 실 부착 (회귀 확인)
- [ ] POD=CNWEH 엠티에 ⚠️ "실 부착 필요" 깜빡 경고는 **유지**
- [ ] 실 부착 작업 후 입력 정상

### 4. 인쇄 회귀
- [ ] 베이상세 BAY05/BAY(06)07 같은 페이지에 안 들어감
- [ ] 카고플랜 (22)23 외따로 안 떨어짐

---

## 🎯 M5.0 후보

1. **카고 플랜 BAY 38 배치** — 사용자가 어느 위치 원하는지 알려주세요:
   - 옵션 A (현재): AFT singles 행 좌측 첫칸
   - 옵션 B: AFT pairs 행 마지막 칸
   - 옵션 C: 별도 행
2. **엠티 수정 리포트 단축** — 수정 발생 시 자동 알림 (선택)
3. **POL 자동 채움** — 검수원이 매번 수기 안 적게
4. **ISO403 사진 일괄 다운로드**
5. **M3.86 백로그:** 리퍼 온도 직접 수정 UI, IFCSUM 자동 판별

---

## 📁 파일 위치

- 작업 디렉토리: `/home/claude/m49b_build/`
- ZIP: `M4_9b_REAL_DEPLOY.zip`
- **`build.sh`** — 다음 빌드는 `bash build.sh` 한 줄로

이번 세션 수정 파일:
- `src/utils.js` — APP_VERSION 'M4.9b' + 변경 노트
- `src/components/ContainerDetailModal.jsx` — verify 모드 단순화 (UI + handleSaveEseal)
- `src/components/EmptySealReport.jsx` — 새 함수 generateEmptySealEditReport + 수정 리포트 버튼
- `src/components/PrintableBayDetail.jsx` — landscape, page-break 강제, 페이지룰, 셀 크기, 항차/POL
- `src/components/PrintableCargoPlan.jsx` — AFT 5-col, footer legend, 항차
- `src/components/BayPlan.jsx` — voyageInfo 전달, ErrorBoundary 래핑, ISO403 배지
- `src/components/ErrorBoundary.jsx` — 신규
- `src/components/ISO403PhotoModal.jsx` — 신규
- `src/firebase.js` — fbSaveISO403Photo, fbDeleteISO403Photo
- `src/pages/VoyagePage.jsx` — BayPlan에 voyageInfo 전달

---

## 🚀 M5.0 시작 명령

```bash
cd /home/claude/m49b_build
# 폰 검증 결과 받기
# 코드 수정
bash build.sh
zip -rq M5_0_REAL_DEPLOY.zip . -x "node_modules/*" "dist/*" ".git/*"
```
