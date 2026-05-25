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

echo "[0/5] sw.js VERSION을 APP_VERSION과 동기화..."
# M6.93.18: utils.js의 APP_VERSION을 public/sw.js의 VERSION으로 자동 주입.
#   이유: sw.js VERSION이 byte-level 안 바뀌면 브라우저가 새 SW 등록 안 함
#         → 옛 캐시 영원히 유지 → 사용자 폰에 새 빌드가 도달 못함.
#   M5.78 → M6.93.18 까지 자동 갱신 안 되어 발생했던 사고 재발 방지.
APP_VER=$(grep -oE "APP_VERSION = '[^']+'" src/utils.js | sed -E "s/.*'([^']+)'.*/\1/")
if [ -z "$APP_VER" ]; then
  echo "✗ src/utils.js에서 APP_VERSION 추출 실패"
  exit 1
fi
sed -i "s/^const VERSION = '[^']*';/const VERSION = '$APP_VER';/" public/sw.js
sed -i "s/^const VERSION = '[^']*';/const VERSION = '$APP_VER';/" sw.js 2>/dev/null || true
PUB_VER=$(grep -oE "VERSION = '[^']+'" public/sw.js | sed -E "s/.*'([^']+)'.*/\1/")
if [ "$PUB_VER" != "$APP_VER" ]; then
  echo "✗ public/sw.js VERSION 동기화 실패 (APP=$APP_VER, SW=$PUB_VER)"
  exit 1
fi
echo "✓ sw.js VERSION = $APP_VER (APP_VERSION과 동기화됨)"

echo "[1/5] 옛 빌드 산출물 / vite 캐시 제거..."
rm -rf dist assets node_modules/.vite

# M6.93.18: vite 빌드 직전, root index.html을 dev-source 형태로 임시 교체.
#   배경: build.sh의 마지막 단계에서 dist/index.html을 root로 복사 → root index.html이
#         옛 hash 'index-XXXX.js'를 가리키게 됨. 다음 빌드에서 vite가 root index.html을
#         entry로 읽다가 옛 hash 파일 못 찾아 실패.
#   해결: 빌드 직전 root index.html을 vite-friendly /src/main.jsx 진입점으로 잠시 교체.
#         빌드 후 [4/5]에서 dist/index.html (새 hash)로 다시 덮어씀.
echo "[1.5/5] root index.html을 vite-source 템플릿으로 임시 교체..."
cat > index.html << 'INDEX_EOF'
<!DOCTYPE html>
<html lang="ko" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Tallyman Master</title>
  <meta name="theme-color" content="#0f172a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Tallyman" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  <script type="module" src="/src/main.jsx"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
INDEX_EOF

echo "[2/5] 의존성 확인..."
[ ! -d node_modules ] && npm install --silent

echo "[3/5] vite build..."
npx vite build

echo "[4/5] dist → root 복사 (assets + index.html 모두)..."
cp -r dist/assets ./
cp dist/index.html ./

echo "[5/5] 검증..."
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
REFJS=$(grep -oE './assets/index-[a-zA-Z0-9_-]+\.js' index.html | head -1 | sed 's|^\./||')
REFCSS=$(grep -oE './assets/index-[a-zA-Z0-9_-]+\.css' index.html | head -1 | sed 's|^\./||')
if [ ! -f "$REFJS" ]; then
  echo "✗ 참조 $REFJS 가 실제 파일 없음"
  exit 1
fi
if [ ! -f "$REFCSS" ]; then
  echo "✗ 참조 $REFCSS 가 실제 파일 없음"
  exit 1
fi
echo "✓ 루트 참조 파일 존재 확인: $REFJS, $REFCSS"

echo ""
echo "ZIP 패키징 가능 상태 (옛 M6.71 흐름과 동일 구조)."
