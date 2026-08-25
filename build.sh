#!/usr/bin/env bash
# M6.86.7.2 빌드 자동화 스크립트
#
# 운영 실측 (사용자 확인):
#   - GitHub Pages는 main 브랜치 루트의 index.html을 직접 서빙하는 흐름으로 운영됨
#   - workflow의 빌드 색깔은 사이트 작동과 무관
#   - 사용자는 누적 ZIP을 repo 루트에 통째로 덮어쓴 후 commit & push 만 함
#
# 결론: 루트 index.html은 반드시 "빌드본"이어야 사이트 작동
#   - 루트 index.html = dist/index.html 복사본 (./assets/index-XXX.js 참조, base:'./')
#   - 절대 소스형(/src/main.jsx 진입점)으로 두지 말 것 — 그러면 production에서 모듈 404
#
# M6.86.7.1의 핫픽스(소스형 루트 index.html)는 잘못된 진단이었음 → 본 스크립트로 회귀

set -e
cd "$(dirname "$0")"

# ─── 2026-08-06: 판 쪼개기 게이트 (GitHub Pages 배포 거부 사고 재발 방지) ───
#   사고: 1.11~1.20 을 하루 15판으로 나눠 올렸다. 각 판은 작았고 검증도 했지만
#         묶었어야 할 것들이었다(화면 수정 셋=1.15, 표기 둘=1.19·1.20).
#         푸시마다 워크플로 2개가 돌아 하루 ~30 배포가 걸렸고, 13번째 판(1.20)부터
#         Pages 의 deploy 단계가 죽기 시작했다. build 는 22초에 통과하고 아티팩트도
#         9.4MB 로 정상인데 **배포 호출만** 거부됐다:
#             #1022  "Timeout reached, aborting!"
#             #1023  "Deployment failed, try again later."   ← GitHub 이 직접 나중에 하라고 한다
#         커밋·푸시가 전부 정상이라 원인이 안 보였고, 라이브는 1.19 에 멈춰 있었다.
#   교훈: 판을 나누는 비용은 내 시간이 아니라 **배포 파이프라인 예산**이다.
#         작게 나눈 판은 하나하나는 안전해 보인다. 예산을 다 쓰면 라이브가 통째로 멈춘다.
#
#   임계치는 그날 실데이터로 잡았다:
#       시간당  최대 3판  → 시간당으로는 못 잡는다. 경고만.
#       24시간  15판      → 여기서 터졌다. 8판에서 끊으면 그날 9번째 판에서 멈췄다.
#
# ★★★ 2026-08-13 정정 — **판수가 원인이 아니었다.** 차단을 경고로 낮춘다.
#   그날 하루 배포 **18판**을 올렸고 8판째부터 `TALLY_BATCH_OK=1` 로 다섯 번 넘겼는데
#   **Actions 16건이 전부 success, 실패 0건**이었다(로그인 없이 API 로 실측).
#   검수사 관찰: *"깃헙을 보니 제한이 아니라 **트래픽** 같습니다. 시간대에 여러 곳에서 올리면
#     실패가 뜨는듯 합니다."* · *"클로드가 안된다고 할때도 **다시 진행을 누르면 되었던 적이
#     여러 차례**입니다."*
#   즉 8/06 의 실패는 **일시적**이었고(재실행하면 통과), 진짜 원인은 판수보다
#   ① 그 시간대 GitHub 혼잡 ② 그날 저장소가 1,337MB 로 Pages 1GB 한도를 넘긴 것
#   쪽일 가능성이 크다(그 뒤 assets 정리가 들어가 지금은 여유가 있다).
#   ⚠ 판수 게이트를 **차단으로 두면 다음 클로드가 "8판이 한계"라며 그날 할 일을 미룬다.**
#     그것이 미완 이월 금지(작업표준 §2-3)와 정면으로 부딪힌다.
#   → 차단 폐지. 경고만 남긴다. 판을 묶는 것은 여전히 좋은 습관이므로 안내는 유지한다.
#   → 실제로 거부당하면 새 커밋을 만들지 말고 **Actions 에서 「재실행」** 을 누른다(1.55-01 실측: 24초 만에 성공).
if git rev-parse --git-dir >/dev/null 2>&1; then
  if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "true" ]; then
    git fetch --deepen=40 --quiet 2>/dev/null || true
  fi
  N1H=$(git log --since="1 hour ago"   --pretty=%H 2>/dev/null | wc -l | tr -d ' ')
  N24=$(git log --since="24 hours ago" --pretty=%H 2>/dev/null | wc -l | tr -d ' ')
  if [ "${N24:-0}" -ge 8 ]; then
    echo ""
    echo "⚠ 판이 많다 — 최근 24시간 ${N24}판 (최근 1시간 ${N1H}판)."
    echo "   **막지는 않는다.** 2026-08-13 실측 — 하루 18판을 올려 Actions 16건 전부 성공,"
    echo "   실패 0건이었다. 판수가 배포 실패의 원인이 아니다(그날 8/06 실패는 일시적이었고,"
    echo "   재실행하면 통과한다 · 진짜 원인은 그 시간대 혼잡과 1GB 한도 쪽이다)."
    echo ""
    echo "   그래도 묶을 수 있으면 묶는 편이 낫다 — 검수사가 새로고침을 그만큼 덜 한다:"
    echo "     · ★인계함_밀린작업.md 에 지금 같이 갈 항목이 있나?"
    echo "     · 이번 세션에서 '나중에' 로 미룬 화면 수정·표기 수정이 있나?"
    echo ""
    echo "   배포가 실제로 거부되면 → 새 커밋 만들지 말고 Actions 에서 「재실행」."
    echo ""
  elif [ "${N24:-0}" -ge 6 ] || [ "${N1H:-0}" -ge 3 ]; then
    echo "⚠ 판이 쌓인다 — 최근 1시간 ${N1H}판 · 24시간 ${N24}판. 묶을 수 있으면 묶어라(차단은 없다)."
  fi
fi


# 캐시 자동 무효화: sw.js의 VERSION을 utils.js의 APP_VERSION과 동기화.
# sw.js VERSION이 바뀌면 서비스워커가 새 버전으로 인식 → 옛 캐시 삭제 + 자동 새로고침.
# (이전: sw.js가 V7.13에 멈춰 새 배포해도 캐시 안 비워지던 문제 해결)
APPVER=$(grep -E "^export const APP_VERSION" src/utils.js | sed -E "s/.*=\s*['\"]([^'\"]+)['\"].*/\1/")
# ⛔ 2.26-07 사고 — APP_VERSION 주석에 따옴표가 들어가면 위 sed 가 **주석 속 문자열**을 잡는다.
#   실측: 주석에 kind===<작은따옴표>X-RAY<작은따옴표> 를 적었더니 APPVER 가 "X-RAY" 가 됐고
#   sw.js 와 콘앱 캐시키(__APPV)가 통째로 "X-RAY" 로 동기화됐다(배포 직전 발견).
#   ⇒ 형식(«이름 숫자.숫자[-숫자]»)에 안 맞으면 여기서 멈춘다. 조용히 나가면 캐시가 통째로 어긋난다.
if ! echo "$APPVER" | grep -qE "^[A-Za-z][A-Za-z ]* [0-9]+\.[0-9]+(-[0-9]+)?$"; then
  echo "✗ APP_VERSION 추출 실패 — 뽑힌 값: '"'"'$APPVER'"'"'"
  echo "   src/utils.js 의 APP_VERSION 줄 주석에 따옴표가 있는지 확인하십시오."
  exit 1
fi
if [ -n "$APPVER" ]; then
  sed -i "s/^const VERSION = '.*';/const VERSION = '$APPVER';/" public/sw.js
  echo "✓ sw.js VERSION → $APPVER 동기화"
  # 콘앱 화면 버전 라벨도 동기화 — 라벨로 신/구버전 구분 가능하게.
  #   (이전: 코드는 고쳐도 라벨이 V7.01로 박혀 업데이트 여부를 화면에서 알 수 없었음)
  # V7.91: V[0-9.]* → V[0-9.-]* — 빌드번호 하이픈을 패턴이 못 잡아 라벨이 누적 오염되던 버그 수정.
  # ConeOne 1.0: 콘앱 라벨은 검수앱 버전이 아니라 콘앱 자체 버전(__CONEV, cone.html 단일 소스)에서 동기화.
  CONEVER=$(grep -oE "window.__CONEV='[^']*'" public/cone.html | head -1 | sed -E "s/.*'([^']*)'.*/\\1/")
  sed -i "s/(주)그린마린 · \(V[0-9.-]*\|ConeOne [0-9.-]*\)/(주)그린마린 · $CONEVER/" public/cone.html
  echo "✓ cone.html 화면 버전 → $CONEVER 동기화(콘앱 자체 버전)"
  # V8.98-05: 콘앱 카고플랜 모듈 캐시키(__APPV)도 버전과 동기화 — 고정값(C7.67)이라
  #   cone-cargoplan.js를 새로 배포해도 폰이 옛 번들을 캐시로 계속 쓰던 사고 방지.
  sed -i "s/window.__APPV='[^']*'/window.__APPV='$APPVER'/" public/cone.html
  echo "✓ cone.html 모듈 캐시키(__APPV) → $APPVER 동기화"
  # __CONEV(콘앱 화면 자동갱신 감지 키)도 동기화 — V8.46에 멈춰 폰이 새 cone.html을 감지 못 하던 문제.
  # ConeOne 1.0: __CONEV는 콘앱 자체 버전 단일 소스 — 검수앱 버전으로 덮지 않는다(콘앱 수정 시 수동으로 올림).
  echo "✓ cone.html 화면 갱신키(__CONEV) = $CONEVER (콘앱 단일 소스, 동기화 안 함)"
  # V9.05-03: README 제목 버전도 동기화 — V8.09-03에 멈춰 있던 불일치 재발 방지.
  sed -i "s/^# \(Tallyman Master\|TallyOne\).*/# $APPVER (구 Tallyman Master)/" README.md
  echo "✓ README.md 제목 버전 → $APPVER 동기화"
  # V9.07-05 정리: 벌크탤리 버전 라벨도 동기화 — 이전엔 버전 문자열 자체가 없어
  #   벌크탤리만 "언제 판인지" 알 수 없었다(지침서에 '2026-06-12판'으로 방치).
  sed -i "s/<meta name=\"app-version\" content=\"(주)그린마린 · [^\"]*\">/<meta name=\"app-version\" content=\"(주)그린마린 · $APPVER\">/" bulk_tally.html
  echo "✓ bulk_tally.html 버전 라벨 → $APPVER 동기화"
  # V9.07-05 정리: 통합지침서는 최신 1개만 남긴다 — 누적 재발(저장소 48개·드라이브 28개) 원천 차단.
  KEEPGUIDE="평택항_검수_통합지침서_3앱통합본_$APPVER.md"
  if [ -f "$KEEPGUIDE" ]; then
    find . -maxdepth 1 -name '평택항_검수_통합지침서_3앱통합본_V*.md' ! -name "$KEEPGUIDE" -delete
    echo "✓ 구버전 통합지침서 정리 — $KEEPGUIDE 만 유지"
  else
    echo "⚠ $KEEPGUIDE 없음 — 지침서 파일명 버전을 APP_VERSION에 맞춰 갱신할 것"
  fi
  # V9.07-05 정리: 한글 파일명이 '#Uxxxx'로 깨진 채 커밋된 사본 제거(정상 파일과 중복된 낡은 사본).
  find . -maxdepth 2 -name '*#U*' -not -path './.git/*' -delete 2>/dev/null && echo "✓ 깨진 파일명(#Uxxxx) 정리"
else
  echo "⚠ APP_VERSION 추출 실패 — sw.js 수동 확인 필요"
fi

echo "[1/6] 옛 빌드 산출물 / vite 캐시 제거..."
rm -rf dist assets node_modules/.vite

echo "[2/6] 의존성 확인..."
[ ! -d node_modules ] && npm install --silent

# M6.94.5: vite build는 root index.html을 진입점으로 사용.
# 운영용 root index.html은 빌드본 (./assets/index-XXX.js 참조)이라
# vite가 이미 삭제된 옛 해시 파일을 import하려다 빌드 실패함.
# 해결: 빌드 직전에 진입 소스형 _index.entry.html을 root로 임시 복사.
# 빌드 후 dist/index.html (vite 생성 빌드본)을 root로 복원.
echo "[3/6] 빌드 직전: 진입 소스형으로 임시 교체..."
[ -f index.html ] && cp index.html index.html.production.bak
if [ ! -f _index.entry.html ]; then
  echo "✗ _index.entry.html 없음 — 진입 소스형 파일 누락"
  exit 1
fi
cp _index.entry.html index.html

echo "[4/6] vite build..."
npx vite build

echo "[5/6] dist → root 복사 (assets + index.html 모두)..."
cp -r dist/assets ./
cp dist/index.html ./
# V9.19-02: 마감 텔리 템플릿도 루트로 — Pages는 두 워크플로(Actions dist / 브랜치 루트)가
#   경합해 마지막에 끝난 쪽이 서빙된다(2026-07-28 실측). 루트·dist 양쪽 다 완전해야 한다.
[ -d dist/tally_templates ] && rm -rf ./tally_templates && cp -r dist/tally_templates ./
# 콘앱(독립 파일): dist의 cone.html을 루트로 복사 (Pages가 루트 서빙). 검수앱과 무관.
[ -f dist/cone.html ] && cp dist/cone.html ./
# V7.46: 콘앱용 본체 카고플랜 V2 번들 — 같은 소스(PrintableCargoPlanV2+cargoPlanCore+사전)를 React째 번들
echo "[+] 콘앱 카고플랜 V2 번들 생성 (cone-cargoplan.js)..."
node_modules/.bin/esbuild src/coneCargoPlan.entry.jsx --bundle --outfile=public/cone-cargoplan.js \
  --format=iife --loader:.js=jsx --jsx=automatic --define:process.env.NODE_ENV='"production"' --minify --target=es2017 --log-level=error
cp public/cone-cargoplan.js dist/ 2>/dev/null || true
cp public/cone-cargoplan.js ./
echo "✓ cone-cargoplan.js 생성·복사 ($(du -h public/cone-cargoplan.js | cut -f1))" 
# M7.18b: sw.js·manifest도 루트로 복사. 이게 빠져서 루트 sw.js가 V7.13에 멈춰
#   새 배포해도 캐시 무효화가 안 되던 문제 해결. 서비스워커 버전 갱신은 루트 sw.js 기준.
[ -f dist/sw.js ] && cp dist/sw.js ./ && echo "  ✓ 루트 sw.js 갱신 (캐시 무효화 반영)"
[ -f dist/manifest.webmanifest ] && cp dist/manifest.webmanifest ./

# ★ TallyOne 1.61-01: public/ 의 루트 자산을 **목록에 기대지 않고** 전부 복사한다.
#   사고 2026-08-13 — 검수사가 CASP 플랜 PDF 를 올리자
#     `Failed to fetch dynamically imported module: .../pdf.worker.min.mjs` 로 막혔다.
#   원인: `public/pdf.worker.min.mjs` 는 있는데 **루트로 복사하는 줄이 없었다.**
#     이 위 복사문들은 sw.js·manifest·cone.html 처럼 **파일 이름을 하나씩 적어 둔** 방식이라,
#     public/ 에 새 파일이 생기면 누가 여기 한 줄을 더 적어야만 배포된다. 워커는 그 줄이 없었다.
#     (1GB 정리 커밋 3e36816 이 dist/pdf.worker.min.mjs 를 지운 뒤로 루트에도 없는 상태였다.)
#   pdfBayParser.js:15 는 `BASE_URL + 'pdf.worker.min.mjs'` 로 **루트**를 찾으므로 404 였다.
#   → 이름을 적는 대신 public/ 의 최상위 파일을 통째로 민다. 다음에 무엇이 추가돼도 안 빠진다.
echo "[+] public/ 루트 자산 복사..."
_pub=0
for f in public/*; do
  [ -f "$f" ] || continue                       # 디렉터리는 위에서 개별 처리(tally_templates 등)
  b=$(basename "$f")
  cp "$f" ./ && cp "$f" dist/ 2>/dev/null
  _pub=$((_pub+1))
done
echo "  ✓ public 루트 파일 ${_pub}개 복사 (pdf.worker.min.mjs 포함)"
# 워커는 PDF 파싱의 필수 자산이라 없으면 빌드를 세운다 — 조용히 나가면 현장에서 막힌다.
if [ ! -f ./pdf.worker.min.mjs ]; then
  echo "⛔ pdf.worker.min.mjs 가 루트에 없습니다 — CASP 플랜 PDF 읽기가 통째로 막힙니다."
  exit 1
fi
# 1.61-02: 파일이 있어도 **번들이 찾는 경로**가 틀리면 소용없다(그래서 한 번 놓쳤다).
#   base:'./' 라 `workerSrc="./pdf.worker.min.mjs"` 가 박히면 브라우저가 assets/ 안을 찾아 404 다.
#   문서 기준 절대 URL(new URL(...,document.baseURI))이 박혔는지 번들에서 직접 본다.
_WJS=$(ls assets/index-*.js 2>/dev/null | head -1)
if [ -n "$_WJS" ] && grep -q 'workerSrc="\./pdf\.worker\.min\.mjs"' "$_WJS"; then
  echo "⛔ 번들에 상대 경로 workerSrc 가 박혔습니다 — assets/ 안을 찾아 404 가 납니다(2026-08-13 사고)."
  exit 1
fi

echo "[6/6] 검증..."
JSFILE=$(ls assets/index-*.js 2>/dev/null | head -1)
if [ -z "$JSFILE" ]; then
  echo "✗ assets/index-*.js 없음 - 빌드 실패"
  exit 1
fi
echo "✓ 빌드 산출물: $JSFILE"

# 루트 index.html이 빌드본인지 확인
if ! grep -q '\./assets/index-' index.html; then
  echo "✗ 루트 index.html이 빌드본 아님 — production에서 작동 안 함"
  exit 1
fi
if grep -q '/src/main.jsx' index.html; then
  echo "✗ 루트 index.html에 소스형 진입점이 남아있음"
  exit 1
fi
echo "✓ 루트 index.html: 빌드본 (./assets/index-XXX.js 참조, production 작동)"

# 루트 index.html이 참조하는 해시 파일이 실제 assets/에 존재하는지
# M6.94.5: grep을 script/link 태그 안으로 한정. 주석 안 placeholder 매칭 방지.
REFJS=$(grep -oE '<script[^>]*src="\./assets/index-[a-zA-Z0-9_-]+\.js"' index.html | grep -oE 'assets/index-[a-zA-Z0-9_-]+\.js' | head -1)
REFCSS=$(grep -oE '<link[^>]*href="\./assets/index-[a-zA-Z0-9_-]+\.css"' index.html | grep -oE 'assets/index-[a-zA-Z0-9_-]+\.css' | head -1)
if [ ! -f "$REFJS" ]; then
  echo "✗ 참조 $REFJS 가 실제 파일 없음"
  exit 1
fi
if [ ! -f "$REFCSS" ]; then
  echo "✗ 참조 $REFCSS 가 실제 파일 없음"
  exit 1
fi
echo "✓ 루트 참조 파일 존재 확인: $REFJS, $REFCSS"

# V9.23-06: 렌더 연막검사 — 실제로 한 번 그려 본다.
#   빌드 성공·번들 grep 통과에도 앱이 죽은 사고(hidden→issues TDZ)를 겪었다.
echo "[+] 렌더 연막검사 (BayGridEditor)..."
SMOKE_OUT=$(mktemp /tmp/_smoke_XXXXXX.js)   # V9.24: 고정 경로가 타 세션 잔재(권한 다른 uid)와 충돌해 검사가 통째로 건너뛰어졌다
if npx esbuild tools/smoke_entry.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
     --outfile="$SMOKE_OUT" --define:process.env.NODE_ENV='"development"' --log-level=error; then
  node tools/smoke_render.cjs "$SMOKE_OUT" || { echo "✗ 렌더 연막검사 실패 — 배포 금지"; exit 1; }
  SMOKE_BP=$(mktemp /tmp/_smokebp_XXXXXX.js)
  if npx esbuild tools/smoke_bayplan.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
       --outfile="$SMOKE_BP" --define:process.env.NODE_ENV='"development"' --log-level=error; then
    node tools/smoke_bayplan.cjs "$SMOKE_BP" || { echo "✗ BayPlan 연막검사 실패 — 배포 금지"; exit 1; }
  else
    echo "✗ BayPlan 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.18: 리스트 탭 연막검사 — PC 2단 배치(우측 고정 상세 칼럼)가 실제로 그려지는지 본다.
  #   이 판에서 1,300줄짜리 상세 렌더를 함수로 들어내 두 자리에서 같이 쓰게 바꿨다.
  #   빌드와 번들 grep 은 «어디에 그려지는가»를 모른다 — 그려 봐야 안다.
  SMOKE_LT=$(mktemp /tmp/_smokelt_XXXXXX.js)
  #  ⚠ 2.46 — X-RAY 와 **같은 병**이 여기서도 조용히 돌고 있었다.
  #    inspectionList → tallyExcel 로 이어지는 경로에 Node 전용 `await import('fs')` 가 있어
  #    esbuild 번들이 «Could not resolve fs» 로 깨졌고, 이 자리는 그걸 «건너뜀» 으로 삼켰다.
  #    X-RAY 쪽은 2.45 에서 고쳤는데 **여기는 안 고쳤다** — 한쪽만 고치고 같은 병을 남긴 것이다.
  if npx esbuild tools/smoke_listtab.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
       --external:fs --external:path --external:url \
       --outfile="$SMOKE_LT" --define:process.env.NODE_ENV='"development"' --log-level=error; then
    node tools/smoke_listtab.cjs "$SMOKE_LT" || { echo "✗ 리스트 탭 연막검사 실패 — 배포 금지"; exit 1; }
  else
    #  ⛔ «건너뜀» 금지 — 검사가 안 돌면 검증이 없는 것이다(3금지 ③).
    echo "✗ 리스트 탭 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.26-10: 미르가 «EDI 가 아직 안 와서 위치를 모른다» 고 답하는가 (검수사 확정 — 경보는 빼되 물으면 답한다)
  node --input-type=module -e "
    const N = await import('$PWD/src/nlSearch.js');
    const q = N.parseNaturalQuery('1200 어디야');
    const noPos = [{ cn: 'GWSU8001200', iso: '40DC', fe: 'F', pod: 'KRPTK' }];
    const yesPos = [{ cn: 'GWSU8001200', bay: '07', row: '02', tier: '84', iso: '40DC', fe: 'F', pod: 'KRPTK' }];
    const a1 = N.generateLocalAnswer(q, noPos, noPos) || '';
    const a2 = N.generateLocalAnswer(q, yesPos, yesPos) || '';
    if (!/EDI.*아직 안 와서/.test(a1)) { console.log('✗ EDI 없을 때 사유를 안 알려준다'); process.exit(1); }
    if (/EDI.*아직 안 와서/.test(a2)) { console.log('✗ EDI 있는데도 사유를 붙인다 — 잔소리'); process.exit(1); }
    console.log('✓ 미르 EDI 미도착 안내 통과 (없을 때 알림 O · 있을 때 조용 O)');
  " || { echo "✗ 미르 EDI 안내 검사 실패 — 배포 금지"; exit 1; }
  # 2.26: X-RAY 탭 연막검사 — 조인이 넷(xrayList·EDI·xraySeals·completed)이라 그려 봐야 안다.
  #   정렬(베이별순+우선양하순)·화물구분 4종·«미입력» 표시가 살아 있는지 본다.
  SMOKE_XR=$(mktemp /tmp/_smokexr_XXXXXX.js)
  #  ⚠ --external:fs — inspectionList 가 2.41 부터 tallyExcel(ExcelJS) 을 동적 import 하는데
  #    그 안에 Node 전용 `await import('fs')` 가 있다(템플릿 읽기용, 브라우저에서는 안 탄다).
  #    브라우저 빌드(vite)는 갈라 내지만 esbuild 연막 번들은 못 갈라 «Could not resolve fs» 로 깨진다.
  if npx esbuild tools/smoke_xray.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
       --external:fs --external:path --external:url \
       --outfile="$SMOKE_XR" --define:process.env.NODE_ENV='"development"' --log-level=error; then
    node tools/smoke_xray.cjs "$SMOKE_XR" || { echo "✗ X-RAY 탭 연막검사 실패 — 배포 금지"; exit 1; }
  else
    #  ⛔ «건너뜀» 으로 넘어가지 않는다 — 검사가 안 돌면 검증이 없는 것이다(3금지 ③).
    #    실제로 2.41 은 이 자리가 조용히 건너뛴 채 배포됐다(2026-08-25).
    echo "✗ X-RAY 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.40: 화면 밝기·소리 연막검사 — 색은 «빌드 통과»로 증명되지 않는다.
  #   변수가 안 걸리면 화면만 캄캄한 채로 빌드는 성공한다. 눌러서 실제로 갈리는지 본다.
  SMOKE_BR=$(mktemp /tmp/_smokebr_XXXXXX.cjs)
  if npx esbuild tools/smoke_bright_entry.js --bundle --platform=node --format=cjs \
       --outfile="$SMOKE_BR" --log-level=error; then
    BUILT_CSS=$(ls -t assets/index-*.css 2>/dev/null | head -1)
    node tools/smoke_bright.cjs "$SMOKE_BR" "$BUILT_CSS" || { echo "✗ 밝기·소리 연막검사 실패 — 배포 금지"; exit 1; }
  else
    echo "✗ 밝기·소리 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.27: 매뉴얼 연막검사 — 두 권을 **눌러서** 열어 본다.
  #   2.27 이전 판에서 수석 권 버튼이 setView('chief') 로 가는데 그 화면이 없어 **눌러도 아무 데도 안 갔다.**
  #   매뉴얼은 «있는 줄도 모르면 안 만든 것과 같다»(CLAUDE.md 0-B) — 안 열리는 권은 없는 권이다.
  SMOKE_HP=$(mktemp /tmp/_smokehelp_XXXXXX.js)
  if npx esbuild tools/smoke_help.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
       --outfile="$SMOKE_HP" --define:process.env.NODE_ENV='"development"' --log-level=error; then
    node tools/smoke_help.cjs "$SMOKE_HP" || { echo "✗ 매뉴얼 연막검사 실패 — 배포 금지"; exit 1; }
  else
    echo "✗ 매뉴얼 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.27: 수석 전용 항목이 공용 권에 되돌아왔는지 — 검수원이 보면 안 되는 서류다(V9.19-01).
  for _t in "마감 텔리 (DEP.TALLY REPORT)" "베이매트릭스 만들기"; do
    if grep -qF "$_t" src/data/helpData.js; then
      echo "✗ 수석 전용 «$_t» 이 공용 매뉴얼(helpData.js)에 있다 — 배포 금지"; exit 1
    fi
  done
  echo "   ✓ 수석 전용 항목 공용 권 이탈 0건"
  # 2.29: 로고 — 아이콘 6장이 다 있고 «옛 자리표시 그림»이 아닌지 본다.
  #   종전 아이콘은 1.7KB·4.3KB 짜리 단색 그림이었다. 새것은 배지 사진이라 10KB 아래로 내려올 수 없다.
  for _i in icon-192 icon-512 icon-maskable-512 cone-icon-192 cone-icon-512 cone-icon-maskable-512; do
    _f="public/$_i.png"
    [ -f "$_f" ] || { echo "✗ 아이콘 없음: $_f — 배포 금지"; exit 1; }
    _sz=$(wc -c < "$_f")
    [ "$_sz" -gt 10000 ] || { echo "✗ 아이콘이 너무 작다($_sz B): $_f — 옛 자리표시 그림일 수 있다"; exit 1; }
  done
  echo "   ✓ 아이콘 6장 확인"
  # 콘앱 매니페스트가 파일로 빠졌는지 (data: URL 로 되돌아가면 아이콘 base64 가 다시 박힌다)
  grep -q 'rel="manifest" href="./cone.webmanifest"' public/cone.html \
    || { echo "✗ cone.html 매니페스트가 파일 참조가 아니다 — 배포 금지"; exit 1; }
  [ -f public/cone.webmanifest ] || { echo "✗ public/cone.webmanifest 없음 — 배포 금지"; exit 1; }
  echo "   ✓ 콘앱 매니페스트 파일 참조"
  # 2.30: 미르 교관 — 매뉴얼을 **가르치는지** 본다.
  #   매뉴얼이 단일 소스다(nlSearch 가 helpData·helpDataChief 를 읽는다).
  #   전 블록에 「왜」가 있는지, 실제로 순서·경고까지 답하는지, 수석 전용을 검수원에게 펴지 않는지 본다.
  node tools/smoke_teach.mjs || { echo "✗ 미르 교관 연막검사 실패 — 배포 금지"; exit 1; }
  # 2.29: 빌드본 파비콘이 **public 의 새 아이콘**을 가리키는지.
  #   실측 — 진입 html 이 "./icon-192.png" 였을 때 vite 가 **루트에 남은 직전 판 아이콘**을 집어
  #   해시 자산으로 만들어 버렸다(assets/icon-192-Cf9ehjsD.png, 1.2KB 짜리 옛 그림).
  #   public/ 자산은 "/" 로 시작해야 해시 없이 그대로 나간다.
  if grep -q 'rel="icon"[^>]*href="./assets/icon-' index.html; then
    echo "✗ 빌드본 파비콘이 해시 자산을 가리킨다 — 루트에 남은 옛 아이콘을 집었다. 배포 금지"; exit 1
  fi
  grep -q 'rel="icon"[^>]*href="./icon-192.png"' index.html \
    || { echo "✗ 빌드본에 파비콘 링크가 없다 — 배포 금지"; exit 1; }
  echo "   ✓ 빌드본 파비콘 = ./icon-192.png"
  # 2.22: 로그인 목록 연막검사 — «지금 로그인한 사람 ∪ 오늘의 본인» 규칙이 살아 있는지 본다.
  #   검수사가 두 번 교정한 규칙이라(2.12-01 → 2.22) 조용히 되돌아가면 매번 이름을 쳐야 한다.
  SMOKE_LG=$(mktemp /tmp/_smokelg_XXXXXX.js)
  if npx esbuild tools/smoke_login.jsx --bundle --loader:.jsx=jsx --loader:.png=dataurl --jsx=automatic \
       --outfile="$SMOKE_LG" --define:process.env.NODE_ENV='"development"' --log-level=error; then
    node tools/smoke_login.cjs "$SMOKE_LG" || { echo "✗ 로그인 목록 연막검사 실패 — 배포 금지"; exit 1; }
  else
    echo "✗ 로그인 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  # 2.46: **작업중 판정 전수 회귀** — 고친 배 하나가 아니라 **그날 떠 있는 배 전부**를 돌린다.
  #   검수사 — «하나가 살면 하나가 죽고 시뮬레이션은 하는 건가요?»
  #   실제로 그랬다: KBTR 을 고친 2.44 가 NSFR 을 죽였고, 그 판은 **KBTR 자신도** 19시 이후 영영
  #   「예정」이 되게 만들고 있었는데 아무도 못 봤다. 한 척만 돌려 보면 그렇게 된다.
  #   ⇒ RTDB 실항차 스냅샷 전부 × 하루 13시각을 기준표와 대조하고, 한 척이라도 바뀌면 **여기서 선다.**
  #     그 위에 검수사가 확답한 12건은 절대 조항이라 기준표를 다시 떠도 통과 못 한다.
  #   ⚠ 「건너뜀」 금지 — X-RAY 검사가 2.41~2.44 동안 조용히 건너뛰어져 버그를 놓친 전례가 있다.
  node tools/smoke_voyage_state.cjs || { echo "✗ 작업중 판정 전수 회귀 실패 — 배포 금지"; exit 1; }
  # 2.47: **미르의 눈** — 「끝4자리 + 실번호/온도/중량」을 답하는가, 그리고 옛 미르를 안 가로채는가.
  #   ⚠ 뒤쪽 8건이 더 중요하다 — 겹을 앞에 세우면 **멀쩡하던 기능을 가로채는** 사고가 난다.
  #     실제로 첫 판이 「12번 베이」의 12 를 컨 끝자리로 읽어 베이 질문 다섯을 죽였다(파급 검증이 잡았다).
  SMOKE_ME=$(mktemp /tmp/_smokeme_XXXXXX.cjs)
  if npx esbuild src/mirEyes.js --bundle --platform=node --format=cjs --outfile="$SMOKE_ME" --log-level=error; then
    node tools/smoke_mireyes.cjs "$SMOKE_ME" || { echo "✗ 미르의 눈 연막검사 실패 — 배포 금지"; exit 1; }
  else
    echo "✗ 미르의 눈 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
  fi
  rm -f "$SMOKE_ME"
else
  echo "✗ 렌더 연막 번들 실패 — 검사를 못 돌렸다. 배포 금지"; exit 1
fi

# M6.94.5: 빌드된 JS 안에 APP_VERSION 문자열이 박혀있는지 검증.
# 이전 실패 (M6.94.5 0건): vite 캐시 문제로 옛 코드가 번들에 들어감.
# 매 빌드마다 src/utils.js의 APP_VERSION을 자동 추출해 빌드 산출물에서 grep.
VERSION=$(grep -E "^export const APP_VERSION" src/utils.js | sed -E "s/.*=\s*['\"]([^'\"]+)['\"].*/\1/")
if [ -n "$VERSION" ]; then
  VCOUNT=$(grep -c "$VERSION" "$JSFILE" 2>/dev/null || echo 0)
  if [ "$VCOUNT" -eq 0 ]; then
    echo "✗ 빌드된 JS에 APP_VERSION ($VERSION) 0건 — 캐시 문제 또는 빌드 누락"
    exit 1
  fi
  echo "✓ 빌드된 JS에 APP_VERSION ($VERSION) $VCOUNT건 박힘"
fi

# ─── 2026-08-06: 옛 해시 자산 정리 (GitHub Pages 1GB 한도 사고 재발 방지) ───
#   사고: 빌드 2,103회분 해시 자산이 루트 assets/ 에 누적돼 저장소가 1,337MB 가 됐고
#         Pages 사이트 크기 한도(1GB)를 넘겨 **배포가 통째로 실패**했다(1.20, 2026-08-06).
#         옛 DEPLOY.md 는 "옛 해시 assets 는 지우지 않는다(누적 무해)" 였다 — 무해하지 않았다.
#   규칙: 지금 사이트가 실제로 참조하는 것만 남긴다. 참조는 **파일명 문자열**로 추적한다
#         (Vite 동적 import 는 `./exceljs.min-XXXX.js` 처럼 assets/ 접두어 없이 나온다 —
#          경로로 찾으면 청크를 통째로 놓친다. 한 번 헛짚었다.)
echo "[+] 옛 해시 자산 정리..."
python3 - <<'PRUNE'
import os
seeds=[f for f in ['index.html','cone.html','bulk_tally.html','sw.js','cone-sw.js',
                   'manifest.webmanifest','cone-cargoplan.js'] if os.path.exists(f)]
if os.path.isdir('assets'):
    assets=os.listdir('assets')
    def text(p):
        try: return open(p,'rb').read().decode('utf-8','ignore')
        except Exception: return ''
    keep=set(); frontier=list(seeds); seen=set()
    while frontier:
        p=frontier.pop()
        if p in seen: continue
        seen.add(p); t=text(p)
        for a in assets:
            if a not in keep and a in t:
                keep.add(a); frontier.append(os.path.join('assets',a))
    drop=[a for a in assets if a not in keep]; sz=0
    for a in drop:
        fp=os.path.join('assets',a); sz+=os.path.getsize(fp); os.remove(fp)
    print(f"  \u2713 \ucc38\uc870 {len(keep)}\uac1c \uc720\uc9c0 \u00b7 \ubbf8\ucc38\uc870 {len(drop)}\uac1c \uc0ad\uc81c ({sz/1048576:.0f} MB)")
PRUNE

echo ""
echo "ZIP 패키징 가능 상태 (옛 M6.71 흐름과 동일 구조)."
