#!/usr/bin/env bash
# M4.9b+ 빌드 자동화 스크립트
# 핵심: index.html은 항상 vite 진입점 형태로 두고, 빌드 후 dist/index.html을 root로 복사
# 이전 함정: root index.html이 빌드 산출물(./assets/index-XXX.js 가리킴) 형태로 남으면
#            vite가 7 modules만 transform하고 변경사항이 빌드에 반영 안 됨.

set -e
cd "$(dirname "$0")"

echo "[1/5] index.html을 진입점 형태로 복원..."
cat > index.html <<'EOF'
<!doctype html>
<html lang="ko" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>Tallyman Master</title>
    <style>
      html, body { background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; touch-action: manipulation; overscroll-behavior-y: contain; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #1e293b; }
      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      input, textarea, select { -webkit-tap-highlight-color: transparent; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

echo "[2/5] 옛 빌드 산출물 / vite 캐시 제거..."
rm -rf dist assets node_modules/.vite

echo "[3/5] 의존성 확인..."
[ ! -d node_modules ] && npm install --silent

echo "[4/5] vite build..."
npx vite build

echo "[5/5] dist → root 배포 형태로 복사..."
cp dist/index.html ./
cp -r dist/assets ./

# 검증: 산출물에 핵심 변경사항이 들어갔는지
echo ""
echo "=== 빌드 산출물 검증 ==="
JSFILE=$(ls assets/index-*.js 2>/dev/null | head -1)
if [ -n "$JSFILE" ]; then
  echo "M4.9b 표시: $(grep -c 'M4\.9b' "$JSFILE")회"
  echo "A4 landscape: $(grep -c 'A4 landscape' "$JSFILE")회"
  echo "break-after: page: $(grep -c 'break-after: page' "$JSFILE")회"
  echo "ISO403: $(grep -oc 'iso403_photo' "$JSFILE" 2>/dev/null || echo 0)회"
  echo ""
  echo "✓ 빌드 완료: $JSFILE"
else
  echo "✗ assets/index-*.js 없음 - 빌드 실패"
  exit 1
fi
