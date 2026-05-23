#!/usr/bin/env bash
# M6.86.7.1+ 빌드 자동화 스크립트
#
# 핵심: 루트 index.html은 항상 vite 진입점 형태여야 함.
#       CI(.github/workflows/deploy.yml)가 push 시 npm run build로 dist/를 만들어 배포하기 때문.
#       루트에 빌드본 index.html(./assets/index-XXX.js 가리킴)이 들어가면 vite 6.4.2가
#       "Failed to resolve ./assets/index-XXX.js from index.html" 로 죽음.
#
# ZIP 패키징 규칙:
#   - 루트 index.html = 소스형 (<script src="/src/main.jsx">)
#   - dist/, assets/ = 빌드본 보존 (누적 검증용, 배포 영향 없음)
#   - 절대 루트 index.html을 빌드본으로 덮어쓰지 말 것

set -e
cd "$(dirname "$0")"

# 소스형 index.html 내용 (단일 진실의 원천)
write_source_index_html() {
  cat > index.html <<'HTML'
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
HTML
}

echo "[1/6] index.html을 진입점 형태로 복원..."
write_source_index_html

echo "[2/6] 옛 빌드 산출물 / vite 캐시 제거..."
rm -rf dist assets node_modules/.vite

echo "[3/6] 의존성 확인..."
[ ! -d node_modules ] && npm install --silent

echo "[4/6] vite build..."
npx vite build

echo "[5/6] dist → root 검증용 복사 (assets만, index.html은 복사 안 함)..."
cp -r dist/assets ./
# 주의: cp dist/index.html ./ 하지 말 것 — 루트 index.html은 소스형 유지!

echo "[6/6] ZIP-safe 보장: 루트 index.html을 다시 소스형으로 확정..."
write_source_index_html

# 검증
echo ""
echo "=== 빌드 산출물 검증 ==="
JSFILE=$(ls assets/index-*.js 2>/dev/null | head -1)
if [ -n "$JSFILE" ]; then
  echo "M6.86 표시: $(grep -c 'M6\.86' "$JSFILE")회"
  echo "✓ 빌드 완료: $JSFILE"
else
  echo "✗ assets/index-*.js 없음 - 빌드 실패"
  exit 1
fi

# 루트 index.html이 소스형인지 최종 확인
if grep -q '/src/main.jsx' index.html; then
  echo "✓ 루트 index.html: 소스형 (CI 빌드 가능)"
else
  echo "✗ 경고: 루트 index.html에 /src/main.jsx 참조 없음! CI가 깨질 수 있음"
  exit 1
fi
if grep -q '\./assets/index-' index.html; then
  echo "✗ 경고: 루트 index.html에 빌드본 해시 참조가 남아있음! CI가 깨짐"
  exit 1
fi
echo ""
echo "ZIP 패키징 가능 상태."
