# DEPLOY.md — 배포 절차 정본(하나) · DEPLOY v2.0-03 · 2026-10-26

> **판.** DEPLOY v2.0-03 · 2026-10-26 · 규범 v2.1 §8의 절차 전문이다. 배포 절차 정본은 **이 파일 하나**다. G드라이브 `★배포_표준절차_모든클로드_필독.md`는 이 파일을 가리키는 글만 둔다(두 사본 체계는 2026-10-22 폐기 — 25KB 대 56KB로 갈라져 서로를 정본이라 가리키고 있었다).
> **대상.** 저장소 `greenmarine26/greenmarinetally` — TallyOne(검수앱)·ConeOne(콘앱)·벌크탤리가 한 저장소. MailPilot(수집기)은 §6. 배포 경로는 push → `.github/workflows/deploy.yml`(«Deploy to GitHub Pages», 저장소 루트 그대로) → Pages. Pages Source는 **GitHub Actions**(branch 모드로 되돌리지 않는다).
> **세 줄 요약.** ① 배포는 클로드가 끝까지 직접 한다 — «push 하시면 됩니다»·«푸시 권한이 없다» 금지. ② 길은 하나 — 고정 이름 넷 + `_deploy_run.bat` 워처(§3). ③ 완료는 라이브 되읽기까지(§4) — 커밋·푸시 «성공»은 완료가 아니다.
> 이 파일을 고치면 규범 §8·`tally-deploy` 스킬·모드 `tally-guard`의 점검표를 같은 날 맞춘다(규범 §10-7).

---

## 1. 배포 전 — 지키는 선(규범 §0·§2·§3·§6의 배포 부분)

1. **수정 지시가 곧 배포 지시다.** «올려도 되겟습니까»를 묻지 않는다. 올리기 직전 «지금 올립니다(폰에 업데이트 배너가 뜹니다)» 한 줄로 알리고 바로 올린다(시각 통지이지 승인 요청이 아니다 — 검수사 2026-10-17 «수정 즉시 묻지 말고 올려 주세요,,, 단 테스트 완벽 통과시에...» · 2026-10-21 «수정지시를 내리면 배포지시를 내린것과 같습니다»).
2. **한 판에 하나, 묶을 수 있으면 묶는다.** 급한 수리와 신규 기능은 두 판. 같은 성격의 수정 셋은 한 판(검수사가 새로고침을 덜 한다). **판수 상한은 없다**(하루 18판 실측).
3. **수정 전** — 호출부 전수 grep(Explore 서브에이전트) → 실근거(어느 배·어느 항차의 무엇이 틀렸나)를 화면으로, 수정안을 아티팩트로(규범 §2-0) → 외과 수정 → 실데이터 검증 → 다른 클로드의 2차 시뮬 «가»·코드 감사 «가».
4. **버전** — TallyOne `src/utils.js` APP_VERSION(기능 = 0.1 올림 4.42→4.43, 수리 = -NN 4.42-04, 언더스코어 금지), ConeOne `public/cone.html` __CONEV, MailPilot `app_gui.py` VERSION. 앱 동작이 바뀌면 반드시 올린다(안 올리면 SW 캐시로 화면이 그대로다). `APP_NOTE`는 그 판 내용 두 문장 이내, 개발자용 수정은 배너에 내지 않는다. 새 화면·버튼·인텐트면 매뉴얼(`helpData.js`)·연막검사(`tools/smoke_*.cjs`)를 같은 판에.
5. **빌드** — 저장소 최신본을 **VM 안이나 컨테이너 안에 새로 클론**해서(`git clone --depth 30 https://github.com/greenmarine26/greenmarinetally.git`), 마운트 폴더(`C:\TALLYTEST\*`)에서는 git을 돌리지 않고 윈도우 작업본 `_v90604_repo`를 복사해 오지도 않는다(CRLF). `npm ci` → **`bash build.sh`** 만(`npm run build` 직접 호출 금지). 클라우드 컨테이너에서는 `TZ=Asia/Seoul bash build.sh`. 끝나면 **번들 grep**(버전 문자열 + 이번 판 핵심 문자열 + 지운 식별자 0건), babel 미정의 참조 0, 연막검사 «건너뜀» 0, `du -sh assets`(수십 MB면 잘못된 것). 빌드 통과는 안전이 아니다 — 화면은 jsdom·브라우저로 눌러 본다.

---

## 2. 자가 점검 10항 — 채팅에 ✔/✘로 찍는다(✘ 하나면 올리지 않는다)

1. 실데이터 시뮬 PASS(관문 4 확정본과 같은 결과)
2. `bash build.sh` 종료코드 0 · 연막검사 «건너뜀» 0 · babel 미정의 참조 0
3. 번들 grep — 버전 문자열 + 이번 판 핵심 문자열 · 지운 식별자 0건
4. 다른 클로드의 2차 시뮬 «가» · 코드 감사 «가»
5. 새 UI면 매뉴얼·연막검사·APP_NOTE 동반 수정(개발자용 수정은 배너 금지)
6. 페이로드 3대조 — 묶음 `index.html`의 번들 해시 = 작업본 · 묶음 `sw.js` 버전 = APP_VERSION · `index.html`이 부르는 js·css가 묶음 안에 실재
7. `tar` 종료코드 확인(`2>/dev/null` 금지) · `/tmp` 고정 이름 금지(`p_$$.tgz`) · 한글 파일명은 CP949 바이트 이름으로 tar에 넣었다 · **클라우드 컨테이너에서 `device_commit_files` 로 넣었으면 기기에서 `md5sum`·크기가 컨테이너 원본과 같은지 확인한 뒤 트리거한다**(2026-10-26 `9fe7874` — 같은 이름의 앞 판 payload 가 덮이지 않아 4.49-03 내용이 4.51 메시지로 나갔다)
8. `_deploy_del.txt`는 로컬에 실재하지 않는 파일만 · 백슬래시 · CRLF
9. `_deploy_base.txt` = **밀기 직전 다시 받은** origin/main 해시(다른 세션이 올렸으면 새 origin 위에 재빌드)
10. «지금 올립니다» 한 줄을 알렸다(묻지 않았다)

---

## 3. 채널 — 고정 이름 넷 + 트리거 하나(실제 `_deploy.bat` 동작 그대로)

| 파일(이름 고정, 매번 덮어쓴다) | 내용 | bat이 하는 일 |
|---|---|---|
| `C:\TALLYTEST\_deploy_payload.tgz` | 빌드 산출물 묶음(§3-1) | 없으면 `[ERROR] payload missing` |
| `C:\TALLYTEST\_deploy_msg.txt` | 커밋 메시지 — **UTF-8·한글**(bat은 `chcp 65001` + `commit -F`, 4.43 한글 커밋 실측) | 없으면 `[ERROR]` |
| `C:\TALLYTEST\_deploy_base.txt` | `git rev-parse origin/main` 한 줄 | 없으면 `[ABORT] _deploy_base.txt missing`, 지금 origin과 다르면 `[ABORT] build base differs from current origin` — 둘 다 reset 전에 멈춘다(fail closed). push 뒤 지운다 |
| `C:\TALLYTEST\_deploy_del.txt` (선택) | 지울 경로, 줄마다 `assets\index-xxx.js` 꼴, CRLF | `if exist` → `del /q`, 끝나면 파일 삭제 |
| 트리거 `_deploy.bat` → `_deploy_run.bat` 복사 | — | 작업 스케줄러 `TallyDeployWatcher`(1분)가 vbs로 실행, 끝나면 `_deploy_last.bat`으로 옮겨 두 번 안 돌게 한다 |
| 결과 `C:\TALLYTEST\_deploy_log.txt` | 매 실행 덮어쓴다, CP949+UTF-16 혼재 | `tr -d '\000' < 로그 \| grep -a` 로 읽는다. `---RESULT---` 아래 `git log -2` |
| bat 자체 출력 `C:\TALLYTEST\_deploy_out_last.txt` | 워처가 bat의 stdout·stderr를 담는다 | **정상이면 0바이트.** 한 줄이라도 있으면 bat이 깨진 것이다 — 배포 후 확인(§4)에서 같이 본다 |

`_deploy.bat`은 **ASCII 전용**이다(주석·로그 문구까지, 규범 §4-8). `chcp 65001` 뒤의 cmd는 한글이 든 줄의 꼬리를 새 명령으로 다시 읽는다 — 2026-10-22 15:00 실행이 한글 주석 꼬리에서 `'면' is not recognized`·tar 사용법을 찍었고, 꼬리가 `goto :end`에 걸리면 push 없이 조용히 끝난다. 그래서 16:50에 주석·로그 문구만 ASCII로 바꿨다(명령 줄은 한 바이트도 안 바꿈, 백업 `_claude\backup\_deploy.bat.20261022_1540_korean`). 커밋 메시지 한글은 `_deploy_msg.txt`에 있어 영향 없다. bat을 고칠 때 한글을 다시 넣지 않는다.

bat 순서 — `index.lock` 제거 → `fetch origin` → 기준 대조 → `reset --hard origin/main` → `tar -xzf payload` → del.txt → `add -A` → `commit -F msg` → `push origin main` → `del base` → `---RESULT---`. payload·msg는 **지우지 않는다**(끝나면 내가 치운다). 같은 채널(`_deploy_run.bat`)을 수집기 재시작·`_gbridge`도 쓴다 — 넣은 뒤 1분 안에 실행됐는지 로그로 확인하고, 사이에 딴 일을 하지 않는다.

### 3-1. 묶기(클론 폴더 안에서, 빌드 직후)

```bash
cd <클론>
git fetch -q origin                                   # 밀기 직전 origin 재확인(두 세션이 같은 저장소를 고친다)
git status --porcelain | grep -E '^( M|\?\?|A |M |MM)' | sed 's/^...//' | grep -v '^"' > /tmp/plist_$$.txt
tar -czf /tmp/p_$$.tgz --no-recursion -T /tmp/plist_$$.txt; echo TAR_EXIT=$?      # 0 이 아니면 멈춘다
git status --porcelain | grep -E '^( D|D )' | sed 's/^...//' \
  | while read -r f; do [ -e "$f" ] || echo "$f"; done | sed 's#/#\\#g; s/$/\r/' > /tmp/del_$$.txt
git rev-parse origin/main > /tmp/base_$$.txt
```
- `git status --porcelain`이 정본이다 — untracked(새 해시 자산)를 포함한다. `git diff --name-only`·`git diff HEAD~1`은 새 자산을 놓쳐 라이브 백지 사고를 냈다.
- 한글 이름 파일(`"…"`로 감싸인 줄)은 목록에서 빼고, **파일명을 CP949 바이트로 복사한 스테이징 폴더**를 따로 tar에 넣는다(`shutil.copyfile(src, name.encode('cp949'))`). 윈도우 bsdtar는 이름을 CP949로 읽어 UTF-8 이름 항목을 조용히 건너뛴다(2026-09-03 실측, 커밋 9c38726). 「직접 복사」는 tracked 파일을 `reset --hard`가 되돌리므로 폐기.
- **페이로드 3대조**(점검 6) — `tar -tzf`로 목록을 보고, 묶음 속 `index.html` 해시 = 작업본, `sw.js` 버전 = APP_VERSION, 그 js·css가 목록에 있는지. 2.38 배포에서 `2>/dev/null`에 가려진 tar 실패로 어제자 묶음이 올라가 라이브가 2.30으로 돌아갔다.
- del.txt — 로컬에 **없는** 파일만. `git diff origin/main`의 `D`를 그대로 쓰면 아직 안 올라간 untracked 산출물이 섞여 라이브 CSS·컴포넌트를 지운다(2.63-01). 슬래시로 적으면 `del`이 스위치로 읽어 조용히 안 지워진다(2.64) — 백슬래시 + CRLF. 옛 해시 assets는 «누적 무해»가 아니다 — 1,337MB로 Pages 1GB를 넘겨 배포가 통째로 실패했다(2026-08-06). 삭제도 전파한다.
- md5로 전송 무결성을 확인한다(묶음 md5를 넣기 전·후 대조).

### 3-2. 넣기와 쏘기

로컬 VM(마운트 `$HOME/mnt/TALLYTEST`)이면 `cp`로, 클라우드 컨테이너면 `device_commit_files`로 — **넷을 한 번에 넣고 바로 트리거**.
```bash
M=$HOME/mnt/TALLYTEST
cp /tmp/p_$$.tgz   $M/_deploy_payload.tgz
cp /tmp/del_$$.txt $M/_deploy_del.txt            # 비어 있으면 넣지 않는다
cp /tmp/base_$$.txt $M/_deploy_base.txt
printf 'TallyOne 4.44: 한 줄 한글 요약\r\n' > $M/_deploy_msg.txt
cp $M/_deploy.bat $M/_deploy_run.bat             # ← «지금 올립니다» 한 줄을 채팅에 적은 다음
sleep 100
tr -d '\000' < $M/_deploy_log.txt | grep -a -v "^warning: in the working copy" | tail -20
```
- **넣은 뒤 트리거 전에 기기 쪽 파일을 원본과 대조한다(클라우드 컨테이너 경로).** `device_commit_files` 가 같은 이름의 앞 판 파일을 못 덮는 일이 있다(큰 payload 만 — 작은 msg·base 는 정상이라 메시지만 새것으로 나간다). 스테이징은 **그때그때 새 파일명**으로 하고, 기기에서 `device_bash` 로 `md5sum $M/_deploy_payload.tgz` 가 컨테이너 원본 `md5sum` 과 같은지(크기도) 본 다음에만 `_deploy_run.bat` 을 복사한다. 다르면 트리거하지 않고 새 이름으로 다시 올린다. 이미 잘못 나갔으면 `git reset -q origin/main`(mixed)으로 payload·del 목록을 현재 origin 기준으로 새로 계산해 바로잡는다.
- 로그에 `[ABORT]`면 payload는 그대로 두고 클론을 `git fetch && git reset --hard origin/main` 한 뒤 재빌드·재묶기한다(다른 세션이 먼저 올린 것을 소리 없이 되돌리지 않기 위한 잠금 — 2026-09-04).
- `_deploy_run.bat`이 사라지고 `_deploy_last.bat`이 생겼으면 실행된 것이다. `---RESULT---` 아래에 **내 커밋 메시지**와 `xxxxxxx..yyyyyyy main -> main`을 확인한다(같은 1분 안에 둘이 복사하면 한쪽 트리거가 없어진다).
- 검수사는 아무것도 안 누른다. Win+R 실행창·computer-use는 쓰지 않는다(2026-07-26·08-03 두 번 막혔다).

---

## 4. 배포 후 — 확인 선언(규범 §0-B-③)과 폰 알림

```bash
B=https://greenmarine26.github.io/greenmarinetally
curl -s "$B/sw.js?cb=$(date +%s)" | grep -oE "TallyOne [0-9.]+(-[0-9]+)?" | head -1       # 새 버전
for f in $(curl -s "$B/index.html?cb=$(date +%s)" | grep -oE 'assets/[A-Za-z0-9_.-]+\.(js|css)'); do
  echo "$f $(curl -s -o /dev/null -w '%{http_code}' "$B/$f?cb=$(date +%s)")"; done        # 파일마다 200
curl -s "$B/<새 번들>" | grep -c "<이번 판 핵심 문자열>"                                    # 라이브 번들 되읽기
curl -s "https://api.github.com/repos/greenmarine26/greenmarinetally/actions/runs?per_page=1"  # 결론 success
```
1. 라이브 `sw.js?cb=` 버전 · `index.html`이 부르는 **js·css 파일마다** HTTP 200(sw.js만 보면 CSS 404를 못 잡는다) · 옛 번들 404 · 라이브 번들에서 새 문자열 되읽기 · `git ls-tree origin/main`/`git show FETCH_HEAD --stat --name-only`로 payload 파일(한글 이름 포함)이 실제로 들어갔는지. Pages 반영은 푸시 뒤 2~3분. `C:\TALLYTEST\_deploy_out_last.txt`가 **0바이트**인지(한 줄이라도 있으면 bat이 깨진 것 — 2026-10-22 한글 꼬리 사고). «새로고침 해보세요»는 검증이 아니다.
2. Actions — 결론 `success`. **10분 넘게 queued**면 폴링만 하지 말고 githubstatus(`https://www.githubstatus.com/api/v2/status.json`)를 보고 검수사에게 «Actions 화면에서 재실행/승인 클릭»을 청한다(시작 안 된 런을 푸는 클릭이다 — 2026-08-27 침묵으로 1시간을 버렸다). **실패한 deploy 잡의 Re-run은 금지** — github-pages 아티팩트가 둘이 되어 «Multiple artifacts named "github-pages"»로 즉사한다(#1085). 새 커밋 또는 Actions 탭 → Run workflow(workflow_dispatch)로 새 런을 만든다. actions/deploy-pages 타임아웃은 상한 10분(설정 30분은 10분으로 잘린다) — 백엔드가 10분 넘게 걸리는 동안은 기다리는 것이 유일한 해법이다.
3. `python C:\TALLYTEST\_claude\healthcheck.py` — **윈도 호스트에서**(리눅스 VM에서 돌리면 `C:\` 경로를 못 봐 «배포 채널 없음» 4건이 헛경보). ⚠가 뜨면 그것부터.
4. 라이브 화면은 **클로드 내장 브라우저**(데스크톱 앱의 브라우저 창)로 연다 — 검수사 2026-10-23 «클로드는 자체 내장 브라우저를 사용하기로 정했습니다». 크롬에는 붙지 않는다. 로그인 이름 칸에 «클로드»(암행 테스터, 비밀번호 없음)를 쳐서 들어가 검수사 눈으로 눌러 본다. 수집기 크롬(9222, tallyman-chrome)에는 어떤 자동화도 붙지 않는다.
5. 채팅에 **배포 후 확인 선언**(위 1~3)을 찍은 뒤 — 그리고 그때만 — 폰 알림 한 번(«배포 완료 TallyOne x.xx»). 빌드 중·대기 중은 폰 알림 금지(규범 §0-2).

---

## 5. 기록과 정리(여기까지가 완료)

1. `★앱_통합지침서.md` 작업 기록부(최신이 위) — 날짜·버전·커밋 해시·무엇을 왜(검수사 원문 «…»)·검증·배포 확인. 확정 규칙은 `★통합운영지침서`로 승격.
2. `★인계함_밀린작업.md` — 업데이트 내용(무엇을·어디를·주의) 세 줄 안팎. 남은 일을 넘기지 않는다.
3. 프로젝트 문서 «클로드_공유_완료_…» 한 장(기록부 사본).
4. 정리 — 실행 끝난 payload·msg·`/tmp/p_$$.tgz`·일회성 조사 스크립트·판별 로그는 그 자리에서 치운다. 남긴다 — `_deploy.bat`·워처 vbs·`_gbridge.bat`·`_gpush.bat`·`_fcm_key.json`·`_mp_which.txt`·`_v90604_repo`·실데이터 표본. 클로드 부산물은 `C:\TALLYTEST\_claude\` 아래. 애매하면 남기고 지운 목록을 보고에 적는다.
5. 누적 ZIP(`Tallyman_Master_Vx.xx.zip`)은 검수사가 달라고 할 때만.

**완료 보고 형식**
```
배포 완료 — TallyOne 4.43 → 4.44 (커밋 xxxxxxx, 12:37)
- 수정: <파일:함수> (호출부 n곳 전부 반영)
- 검증: 실데이터 시뮬 PASS · 기준표 diff 악화 0 · 2차 시뮬 «가» · 감사 «가»
- 빌드: build.sh 0 · 건너뜀 0 · babel 0 · 번들 grep «4.44»·«<핵심>»
- 채널: base=<origin 해시> · ---RESULT--- 에 내 메시지 · main -> main
- 라이브: sw.js 4.44 · index-xxxx.js 200 · index-xxxx.css 200 · 옛 번들 404 · Actions success · healthcheck 정상
- 기록: 기록부 · 인계함 · 프로젝트 문서 / 정리: 지운 것 n건
```

---

## 6. MailPilot(수집기) — 경로가 다르다

1. 소스 수정(`C:\TALLYTEST\TallymanMailCollector_*\app_gui.py` 등, VERSION 올림) → `python -m py_compile`.
2. 파서를 고쳤으면 `collector/autoreg_helper.html` 재생성(안 하면 옛 파서로 돈다).
3. **버전을 올렸으면 묻지 않고 그 자리에서 재가동**(검수사 2026-10-17 «항시 버전업이 되면 그시점에 바로 재가동 해야 합니다. 물을 필요도 없이») — 재시작 배치(ASCII·CRLF)를 `_deploy_run.bat`으로 워처 실행. 수집기 콘솔 창은 닫지 않고 그 창에 print를 남기지 않는다.
4. 확인 — `collector_heartbeat.json`의 version·at·mailOkAt, «연결됨 · 열린 탭 N개» 로그, 첫 실전 사이클 로그, healthcheck.
5. 설정 실사용 경로는 `%LOCALAPPDATA%\TallymanCollector\config.json` 하나.

---

## 7. 폐기 목록 — 보이면 지우고, 따르지 않는다

| 폐기된 것 | 언제·왜 |
|---|---|
| «지금 올려도 되겟습니까» 묻고 답 기다리기 | 2026-10-17·10-21 검수사. 통지 한 줄만 |
| 판별 이름 bat·payload·로그(`_vXXXX_commit.bat` 등), 판마다 새 bat | 2026-08-09. 하루 59개 쌓이고 경로 오타로 실패 — 고정 이름 넷만 |
| 실행 대화상자(Win+R)·computer-use로 bat 실행 | 2026-07-26·08-03 두 번 막힘. 워처만 |
| GitHub 웹 편집·브라우저 업로드(방법 B)·바이트 패치 주입(방법 C) | 2026-07-13 로컬 git 성공 뒤 대체, 09-25 권한 분류기가 막음 |
| 샌드박스·VM·컨테이너에서 `git push` | 자격증명이 없고, 있어도 채널 밖 배포 |
| ZIP을 검수사에게 주고 덮어쓰게 하기, 매 배포 누적 ZIP | 규범 §8. ZIP은 검수사가 달라고 할 때만 |
| «푸시 권한이 없다»는 말 | 2026-10-19 검수사 «권한을 드리면 혼동을 일으킨다고 막았던것이 클로드들 입니다» |
| 판수 상한 «8판»·«배포 예산 유한»·`TALLY_BATCH_OK` | 2026-08-13 실측(18판 전부 성공) |
| 커밋 메시지 영문 | bat이 `chcp 65001`+`commit -F` — 한글이 된다(4.43 실측) |
| 한글 파일명 «직접 복사» | 2026-09-03. tracked 파일은 `reset --hard`가 되돌린다 — CP949 이름으로 tar |
| 크롬 라이브 확인 전면 금지·«사용자 Chrome에 붙어» | 2026-08-09 프로필 셋으로 분리 — «클로드 전용»만 |
| «클로드 전용» 크롬 프로필로 라이브 확인(`switch_browser`) | 2026-10-23 검수사 — 클로드 내장 브라우저로 |
| «옛 해시 assets는 누적 무해» | 2026-08-06 1GB 사고 |
| 실패한 deploy 잡 Re-run | 2026-08-07 #1085 — 새 커밋 또는 workflow_dispatch |
| 임시 payload·bat·로그 «그대로 둬도 된다» | 2026-08-09·08-10 — 그 자리에서 치운다 |
| 인계함에 남은 일 넘기기 | 2026-09-17 검수사 — 업데이트 내용만 |

---

## 개정 이력
- 2026-10-26 v2.0-03 — 기기 쪽 payload 대조 규칙. 09:43 `9fe7874` 가 4.51 메시지로 나갔는데 묶음은 4.49-03 옛 내용이었다(윈도 쪽 `_deploy_payload.tgz` 가 앞 판으로 남은 채 같은 이름의 `device_commit_files` 가 덮이지 않음). §2 7항·§3-2 에 «기기에서 md5sum 대조 뒤 트리거 · 스테이징은 새 파일명»을 적었다. 규범 §8·`tally-deploy` 스킬·`tally-guard` 점검표는 같은 날 맞춘다.
- 2026-10-22 v2.0-01 — `_deploy.bat` ASCII화(한글 주석·로그 문구 → 영문, 명령 줄 불변)에 맞춰 §3 표의 bat 메시지 문구와 `_deploy_out_last.txt`(정상이면 0바이트) 확인 항목을 적었다. 규범 §4-8(bat은 주석까지 ASCII) 적용.
- 2026-10-22 v2.0 — 배포 절차 정본을 이 파일 하나로 통일(규범 v2.0 표준화). 두 사본(저장소 25KB 2026-07-26 체계 · G드라이브 56KB 2026-09-25)과 `tally-deploy` 스킬을 대조해 갈린 23곳을 정리 — 채널 넷(`_deploy_base.txt` 포함)·한 벌 절차·자가 점검 10항·배포 후 확인·폰 알림 한 번·폐기 목록. 옛 판의 사고 기록(2.38 tar 실패·2.63-01 del.txt·2.64 슬래시·CP949·1GB·#1085·2026-08-27 queued·2026-09-04 잠금)은 §3·§4·§7에 압축해 남겼다.
- 2026-09-25 — 3.60-18 실측 정정(30분 표기·버전 규칙·github.io curl). 2026-09-04 §0-G 잠금 장치. 2026-08-27 §0-F del.txt. 2026-08-25 §0-E 3대조. 2026-08-07 §0-D Actions. 2026-07-26 코워크 워처 채널 신설.
