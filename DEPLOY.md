# 배포 — 이 저장소를 건드리는 모든 클로드 필독

> **정본 전문**: 구글 드라이브 `CLAUDE_SHARED\★배포_표준절차_모든클로드_필독.md`
> 이 파일은 저장소만 보고 있는 클로드를 위한 **자립 요약**이다. 절차·판단은 이것만으로 충분하다.
> 개정 2026-07-26 (V9.07-01 배포 실측 반영)

## 0. 절대 원칙

- **배포는 클로드가 끝까지 직접 한다.** 아래 문장은 전부 금지다.
  "이제 git push 하시면 됩니다" · "ZIP 압축 푸신 뒤 덮어써 주세요" ·
  "명령어 드릴 테니 붙여넣으세요" · "권한만 열리면 제가 할 수 있습니다"
  사용자가 여러 번 교정한 사항이다. 사용자 개입은 1장의 모든 경로가 실제로 막혔을 때뿐이다.
- 작업 파일 정리도 클로드가 한다.
- 버전 문자열을 안 올리면 폰 서비스워커 캐시가 안 비워져 배포해도 화면이 그대로다.
- 루트 `index.html`은 반드시 빌드본이어야 한다. 소스형으로 두면 production 404.

## 1. 방법 판단 (여기서 갈라진다 — 고르지 말고 따른다)

| 내 세션에 있는 것 | 방법 |
|---|---|
| bash + 마운트된 `C:\TALLYTEST` + computer-use | **A. 커밋 배치 (정본)** — 3장 |
| Chrome 확장만 (로컬 파일 접근 없음) | B. 브라우저 업로드 (`/upload/main/<경로>`, 커밋 버튼은 좌표 클릭) |
| Chrome 확장인데 file_upload 거부됨 | C. 바이트 패치 주입 (raw fetch → sha 검증 → DataTransfer 주입) |

A가 되면 무조건 A다. **코워크 샌드박스의 git에는 push 자격증명이 없다**(실측). 클론만 된다.
A는 사용자 PC의 GitHub Desktop git을 배치파일로 돌리는 방식이다.

## 2. 완료의 정의 (비협상 — 전부 통과해야 "완료")

1. 실데이터 시뮬 PASS (추론 금지)  2. `bash build.sh` 성공  3. 번들 grep으로 새 문자열·APP_VERSION 확인
4. push 로그에 `xxxxxxx..yyyyyyy  main -> main`  5. 라이브 `sw.js?v=캐시버스터`의 VERSION 확인
+ blob 해시 전수 대조 권장 (`git rev-parse origin/main:<파일>` vs `git hash-object <검증본>`)

## 3. 방법 A 절차

1. **VM 내부**(`/tmp/repo`)에 클론해 수정·빌드한다. ⚠ 마운트 폴더에서 git 실행 금지 (4장 1번).
2. `src/utils.js`의 `APP_VERSION`을 올린다 (단일 소스). 기능=마이너 두 자리 / 픽스=빌드번호. 언더스코어 금지.
3. `bash build.sh` (npm run build 직접 호출 금지).
4. 변경 목록에서 **삭제분(`^ D`)은 제외**한다 — 옛 해시 assets는 지우지 않는다(누적 무해).
5. payload tgz는 `./` 접두사·디렉터리 엔트리 없이 파일만 (`tar -czf out.tgz --no-recursion -T list`).
6. **한글 파일명은 tar에 안 태운다.** 워킹카피에 직접 복사 → `reset --hard`가 안 지우므로 `add -A`가 잡는다.
7. bat 작성 후 **CRLF 변환 필수** (`sed -i 's/$/\r/'`). 커밋 메시지는 영문 (코드페이지).
8. 실행은 computer-use `open_application("실행")` → 입력칸 클릭 ×2 → `ctrl+a` → `Delete` → 경로 타이핑 → zoom 확인 → Enter.
   ⚠ `triple_click`으로는 기존 텍스트가 안 지워진다(실측, 경로 깨짐).

```bat
@echo off
set LOG=C:\TALLYTEST\_vXXXXX_commit_log.txt
set GIT=git
for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do if exist "%%D\resources\app\git\cmd\git.exe" set GIT=%%D\resources\app\git\cmd\git.exe
echo GIT=%GIT% > %LOG%
set REPO=C:\TALLYTEST\_v90604_repo
if not exist %REPO% "%GIT%" clone --depth 1 https://github.com/greenmarine26/greenmarinetally.git %REPO% >> %LOG% 2>&1
cd /d %REPO%
if exist "%REPO%\.git\index.lock" del /f /q "%REPO%\.git\index.lock" >> %LOG% 2>&1
"%GIT%" fetch origin >> %LOG% 2>&1
"%GIT%" reset --hard origin/main >> %LOG% 2>&1
tar -xzf C:\TALLYTEST\_vXXXXX_payload.tgz >> %LOG% 2>&1
"%GIT%" add -A >> %LOG% 2>&1
"%GIT%" -c user.name=greenmarine26 -c user.email=yjkim1313@gmail.com commit -m "Vx.xx <english summary>" >> %LOG% 2>&1
"%GIT%" push origin main >> %LOG% 2>&1
echo ---LOG---- >> %LOG%
"%GIT%" log --oneline -3 >> %LOG% 2>&1
echo ---STATUS---- >> %LOG%
"%GIT%" status --short >> %LOG% 2>&1
echo DONE %DATE% %TIME% >> %LOG%
```

## 4. 함정 (전부 실측)

1. **마운트 폴더에서 샌드박스 git 실행 금지** — 삭제 권한이 없어 `.git/index.lock`이 남고 안 지워진다.
   이후 모든 git이 "Another git process seems to be running"으로 죽는다(V9.07 첫 커밋 통째 실패).
2. `build.sh`의 `rm`이 마운트에서 실패한다 → VM 내부 사본에서 빌드하고 산출물만 되가져온다.
3. bat는 CRLF 아니면 실행조차 안 된다.
4. 한글 파일명 tar 추출 시 "Invalid empty pathname". 지워야 할 땐 ASCII 와일드카드로.
   `powershell -NoProfile -Command "Get-ChildItem -Filter '*_V9.07.md' | Remove-Item -Force"`
5. **큰 base64를 클로드가 직접 옮기지 말 것** — V8.85에서 두 번 다 글자 유실로 훼손됐다.
   4.2MB ZIP은 base64로 약 139만 토큰이라 애초에 컨텍스트를 통과할 수 없다.
6. `.gitignore`가 없으면 `add -A`가 node_modules 19,027개를 쓸어담는다 (V9.07에서 신설).
7. 컨테이너에서 github.io로 curl 불가(HTTP 000). 라이브 확인은 Chrome MCP `javascript_tool` + fetch.
8. 샌드박스에 Chromium 설치 불가(dl.google.com 차단). CSS·렌더 검증은 사용자 Chrome에서 `getComputedStyle`.
9. `raw.githubusercontent`는 CDN이 낡다 — **커밋 목록이 진실**. raw 검증 시 `?v=` 필수.
10. `Edit` 도구는 대형 파일을 조용히 자를 수 있다 — 대형 jsx는 python 치환 + 치환 횟수 assert.

## 5. 배포 후 인계 (여기까지가 완료)

1. 누적 ZIP — 전체 소스+dist+build.sh+통합지침서+README. 부분 ZIP 금지.
   최상위 폴더 하나(`Tallyman_Master_Vx.xx/`), `node_modules`·`.git` 제외.
   위치 `Downloads\Tallyman_Master_Vx.xx.zip` (+`C:\TALLYTEST` 사본).
2. 통합지침서 갱신 — 파일명 버전과 최상단 "최종 버전" 줄을 함께 바꾸고 이번 판 이력 append. 옛 버전 파일은 삭제.
3. 드라이브 정본 문서의 배포 이력에 한 줄 추가.

## 6. 이 저장소 밖

| 대상 | 배포 |
|---|---|
| 콘앱 `cone.html` · 벌크탤리 | **같은 저장소** — 위 절차 그대로 |
| TWA APK | PC에서 `C:\TALLYTEST\_twa_build.bat`. `greenmarine26.github.io` 리포에 커밋 → `/tally.apk` `/cone.apk`. 웹 배포만으로 내용은 자동 반영되므로 재배포는 아이콘·버전 변경 시만 |
| 수집기 TallymanMailCollector | PC 로컬 프로그램. GitHub 배포 아님 |
