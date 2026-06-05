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

# 캐시 자동 무효화: sw.js의 VERSION을 utils.js의 APP_VERSION과 동기화.
# sw.js VERSION이 바뀌면 서비스워커가 새 버전으로 인식 → 옛 캐시 삭제 + 자동 새로고침.
# (이전: sw.js가 V7.13에 멈춰 새 배포해도 캐시 안 비워지던 문제 해결)
APPVER=$(grep -E "^export const APP_VERSION" src/utils.js | sed -E "s/.*=\s*['\"]([^'\"]+)['\"].*/\1/")
if [ -n "$APPVER" ]; then
  sed -i "s/^const VERSION = '.*';/const VERSION = '$APPVER';/" public/sw.js
  echo "✓ sw.js VERSION → $APPVER 동기화"
  # 콘앱 화면 버전 라벨도 동기화 — 라벨로 신/구버전 구분 가능하게.
  #   (이전: 코드는 고쳐도 라벨이 V7.01로 박혀 업데이트 여부를 화면에서 알 수 없었음)
  sed -i "s/(주)그린마린 · V[0-9.]*/(주)그린마린 · $APPVER/" public/cone.html
  echo "✓ cone.html 화면 버전 → $APPVER 동기화"
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
# 콘앱(독립 파일): dist의 cone.html을 루트로 복사 (Pages가 루트 서빙). 검수앱과 무관.
[ -f dist/cone.html ] && cp dist/cone.html ./
# M7.18b: sw.js·manifest도 루트로 복사. 이게 빠져서 루트 sw.js가 V7.13에 멈춰
#   새 배포해도 캐시 무효화가 안 되던 문제 해결. 서비스워커 버전 갱신은 루트 sw.js 기준.
[ -f dist/sw.js ] && cp dist/sw.js ./ && echo "  ✓ 루트 sw.js 갱신 (캐시 무효화 반영)"
[ -f dist/manifest.webmanifest ] && cp dist/manifest.webmanifest ./

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

echo ""
echo "ZIP 패키징 가능 상태 (옛 M6.71 흐름과 동일 구조)."
