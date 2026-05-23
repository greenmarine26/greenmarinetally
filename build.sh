#!/bin/bash
# Tallyman Master M6.86.4 — 재빌드 스크립트
# 사용법: bash build.sh
# 산출물: dist/ 디렉토리

set -e

# 1) 의존성 설치 (이미 있으면 skip)
if [ ! -d node_modules ]; then
  echo "→ npm install"
  npm install
fi

# 2) 빌드
echo "→ vite build"
npx vite build

echo ""
echo "✅ 빌드 완료. 산출물:"
echo "   dist/index.html"
echo "   dist/assets/*.js"
echo "   dist/assets/*.css"
echo ""
echo "정적 호스팅에 dist/ 디렉토리 통째로 업로드하세요."
