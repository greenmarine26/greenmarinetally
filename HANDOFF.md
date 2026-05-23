# Tallyman Master M6.86.7.2 인계지침서

작성: 2026-05-23
이전 버전: M6.86.7 → M6.86.7.1 (잘못된 핫픽스, 검정 화면 유발) → **M6.86.7.2 (핫픽스 회귀)**

---

## 0. M6.86.7.2 핫픽스 (2026-05-23) — M6.86.7.1 잘못된 진단 회귀

### 실측 운영 확인 (사용자 검증)
사용자 운영 방식 ↓ (이전 채팅에서 가정만 했다 — 이번에 사실 확인):

> "누적본으로 항상 해왔어요. 메인에 덮어쓰기 후 커밋·푸시만 해왔음"
> "버전 다운하면 또 작동됨"

→ GitHub Pages는 **main 브랜치 루트의 index.html을 직접 서빙**하는 흐름.
→ workflow의 `npm run build` 빨간/초록은 **사이트 작동과 무관** (사실상 장식).
→ 사이트 작동은 **main 루트의 index.html이 빌드본인가**가 결정.

### M6.86.7.1이 틀렸던 점
M6.86.7.1 핫픽스가 가정했던 것:
> "CI가 push 시 npm run build → dist만 artifact 업로드 → Pages가 dist를 서빙"
> "그래서 루트 index.html은 vite 진입점(소스형)이어야 한다"

실제로는:
- Pages 모드가 Actions가 아니라 **Branch (main, /)** 였음
- workflow 색깔이 빨간불이어도 사용자는 main 루트 빌드본 덕에 사이트 작동을 누렸음
- M6.86.7.1이 루트를 소스형(`/src/main.jsx`)으로 바꾸자, 그게 그대로 production에 노출됨
- `/src/main.jsx` 절대경로는 GitHub Pages 도메인 루트(`greenmarine26.github.io/src/main.jsx`)에서 못 찾음 → 404
- 마찬가지로 `/manifest.webmanifest` 404
- React 마운트 실패 → **검정 화면**

### 사용자 콘솔에 찍힌 증거
```
GET https://greenmarine26.github.io/src/main.jsx 404
GET https://greenmarine26.github.io/manifest.webmanifest 404
Manifest fetch ... failed, code 404
```

### M6.86.7.2 변경 — 옛 M6.71 흐름으로 회귀
| 파일 | 변경 |
|------|------|
| `index.html` (루트) | 소스형 → **빌드본** (dist/index.html 복사본, `./assets/index-XXX.js` 참조) |
| `build.sh` | [5/5] `cp dist/index.html ./` 복구, [6/6] `write_source_index_html` 제거 |
| `src/utils.js` | `APP_VERSION = 'M6.86.7.2'` |
| `sw.js` | `VERSION = 'M5.78'` → `'M6.86.7.2'` (한참 안 갱신되던 캐시 무효화 트리거 정상화) |

기능/UI/베이사전/카고플랜 로직 변경 없음 — 순수 빌드 파이프라인 회귀.

### 검증 (실제 실행 완료)
1. ✅ 정적 서버 시뮬레이션: 모든 핵심 자산 200 응답
   - `/` 200
   - `/assets/index-QkqWZ1vV.js` 200
   - `/assets/index-yy8myA9P.css` 200
   - `/manifest.webmanifest` 200
   - `/sw.js` 200
2. ✅ 옛 M6.71 루트 index.html과 구조 1:1 동일 (1159 bytes, 패턴 동일, 해시값만 차이)
3. ✅ 루트 index.html에 절대경로 `/` 진입점 잔존 없음 (favicon `/favicon.svg`만 — 옛것과 동일, 사이트 작동 무관)
4. ✅ 루트 참조 파일이 실제 assets/, dist/assets/에 모두 존재

### 사용자 적용 방법
1. M6.86.7.2 ZIP 풀어서 repo 폴더에 통째로 덮어쓰기
2. `git add -A && git commit -m "M6.86.7.2 hotfix" && git push`
3. **폰 캐시 비우기 필수** (옛 SW가 옛 깨진 페이지를 잡고 있음):
   - 폰 브라우저 사이트 설정 → 저장 데이터 모두 삭제
   - 홈에 추가한 PWA 아이콘은 삭제 후 재추가
4. PC도 Ctrl+F5 강제 새로고침

### ⚠️ 향후 절대 하지 말 것
- **루트 index.html을 절대 소스형(`<script src="/src/main.jsx">`)으로 두지 말 것.** Production에서 모듈 404로 검정 화면.
- **`base: './'` 설정 유지.** 절대경로 `base: '/'`로 바꾸면 GitHub Pages 서브패스(`/greenmarinetally/`)에서 깨짐.
- workflow 빌드 빨간불에 휘둘리지 말 것 — 사이트 작동은 main 루트 빌드본이 결정.

---

