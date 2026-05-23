# Tallyman Master M6.86.8.25 인계지침서

작성: 2026-05-23
이전: M6.86.8.15 (DXQD row 라벨 픽스 중) → **M6.86.8.25 (페어 박스 hold에 08 잘못 들어가던 버그 픽스)**

---

## 0. M6.86.8.25 핵심 — 페어 박스 hold row 라벨 정정

### 사용자 보고 (DXQD 선박)
> "DXQD 선박 홀드는 06 04 02 01 03 05 07 로 구성되어야 합니다."

페어 박스 베이의 HOLD에 row 08이 잘못 표시됨. DXQD hold는 어느 베이든 단독 홀수 박스 구조(7칸)이며 라벨은 `[06,04,02,01,03,05,07]`. 08은 짝수 페어 박스의 DECK(8칸)에만 들어가는 라벨이다.

### 진짜 원인
`src/cargoPlanCore.js` `computeBayRenderData`에 한 줄:
```js
const holdRowPos = deckRowPos; // 같은 row 라벨 공유  ← 버그
```
페어 박스일 때 `rowMax = rowMaxEven = 8`이라 deck가 `[08,06,…,07]` 8칸이 되는데, hold도 그걸 그대로 받아 맨 앞 08이 hold에 박힘.

컨선 구조상 hold cell은 항상 odd-bay에 속한다 (페어 박스라도 hold는 odd 단독 박스). 그래서 hold는 deck와 별개로 `rowMaxOdd` 기준이어야 함.

### M6.86.8.25 변경
| 파일 | 변경 |
|------|------|
| `src/cargoPlanCore.js` | `computeBayRenderData`에서 deck/hold row 라벨 분리: `deckRowPos = getRowPositions(rowMax, hasZero)`, `holdRowPos = getRowPositions(rowMaxOdd \|\| rowMax, hasZero)`. `nHoldCols`도 별도 산출. |
| `src/components/HelpModal.jsx` | M6.86.8.25 항목 최상단 추가 |
| `src/utils.js` | `APP_VERSION = 'M6.86.8.25'` |
| `sw.js` | `VERSION = 'M6.86.8.25'` |
| `build.sh` | 잘못된 운영 가정("루트는 빌드본") 정정 — 실제 workflow는 dist/만 배포하므로 루트는 소스형 필수 |

### 검증
- ✅ `getRowPositions(7, false)` = `[06,04,02,01,03,05,07]` (단독 홀수 hold)
- ✅ `getRowPositions(8, false)` = `[08,06,04,02,01,03,05,07]` (페어 박스 deck)
- ✅ vite 6.x npm run build 통과 (`dist/index.html`, `dist/assets/index-*.js/css` 정상 생성)
- ✅ 빌드본에 APP_VERSION 'M6.86.8.25' 포함 확인
- ✅ `PrintableCargoPlanV2`는 이미 `width: (nHoldCols/nDeckCols)*100%` + `margin auto`로 좁은 hold를 deck 박스 안 가운데 정렬 — CSS 변경 불필요

### 사용자 시각 확인 단계
DXQD 페어 박스 베이의 카고플랜에서 hold row 라벨이 `[06,04,02,01,03,05,07]` 7칸 (08 없음)으로 표시되는지 확인.

---

## 1. 운영 흐름 (반드시 알고 있어야 할 내용)

### 실제 배포 메커니즘 (.github/workflows/deploy.yml 검증)
1. 사용자가 받은 ZIP을 repo 루트에 통째로 덮어쓰고 `git commit && git push`
2. GitHub Actions가 자동 실행:
   - `npm install`
   - `npm run build` ← **이게 통과해야 사이트 배포됨**
   - `./dist` 폴더만 GitHub Pages artifact로 업로드 → Pages 배포
3. production에 서빙되는 건 actions가 새로 빌드한 `dist/` 뿐

### 루트 index.html은 반드시 "소스형"
```html
<script type="module" src="/src/main.jsx"></script>
```
- 빌드본(`./assets/index-XXX.js` 참조)을 루트에 두면 vite가 entry 충돌로 `npm run build` 실패
- → GitHub Actions 빌드 실패 → 사이트 배포 실패 → 사용자: "또 안 됨"
- 옛 build.sh / HANDOFF에 적힌 "루트는 빌드본" 가정은 옛 운영 흔적 (현 workflow와 불일치)

### ZIP 패키징 (지침서 §5)
- 원본 보존: `src/`, `dist/`, `package.json`, `build.sh`, `HANDOFF.md` 등 일체
- 루트 `index.html`만 소스형
- FULL ZIP 크기 ≈ 1.5MB 정상

---

## 2. 검증 후 ZIP 배포 (절대 원칙)

1. 코드 수정 후 **반드시** `npm run build` 통과 확인
2. 빌드본에 변경사항(예: APP_VERSION) 포함 확인
3. 루트 index.html이 소스형인지 확인
4. 그 후 ZIP

검증 안 된 ZIP은 절대 사용자에게 주지 말 것.

---

## 3. 다음 패치 후보
1. **선사별 별첨** (M6.81 별첨1) 통합
2. **화물 종류별 별첨** (M6.81 별첨2) 통합
3. **선적 모드** POD 컬러 세부 코딩
4. **X-Ray 표시** (셀 모서리 별)
5. **V1 카고플랜 폐기** (V2 시각 확인 완료 후)

---

## 4. ⚠️ 절대 하지 말 것
- 루트 index.html을 빌드본으로 두지 말 것 (vite build 실패 → 사이트 다운, 사용자 매번 고생의 원인)
- STD_DECK/STD_HOLD 자리 통일 없애지 말 것 (베이별 hull 단면이 사라짐, M6.86.7 사고)
- globalRowRange/pageDeckUnion으로 페이지 폭 통일하지 말 것 (베이별 hull 모양 깨짐, M6.86.5 사고)
- 사용자 사전 확인 없이 베이사전 변경 금지 (M6.86.5 베이사전 오염 사고)
- **검증되지 않은 ZIP 제공 금지** (지침서 §2.2)
