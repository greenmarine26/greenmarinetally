#!/usr/bin/env bash
# M6.86.8.25 빌드 자동화 스크립트
#
# 실제 운영 흐름 (deploy.yml 검증):
#   - 사용자가 ZIP을 받아 repo 루트에 덮어쓰고 commit & push
#   - GitHub Actions(.github/workflows/deploy.yml)가:
#       1) npm install
#       2) npm run build  ← 이게 통과해야 사이트가 배포됨
#       3) ./dist 폴더만 GitHub Pages artifact로 업로드 → 배포
#   - 즉 production에 서빙되는 건 actions가 새로 빌드한 dist/뿐
#   - 루트 index.html은 production에서는 안 쓰임 (workflow가 dist/만 배포)
#
# 결론: 루트 index.html은 반드시 "소스형"(<script src="/src/main.jsx">) 이어야 함
#   - 빌드본을 루트에 두면 vite 6.x가 entry 충돌로 npm run build 실패
#   - → GitHub Actions 빌드 실패 → 사이트 배포 실패 → 사용자 입장에선 "또 안 되네"
#   - 이전 build.sh / HANDOFF의 "루트는 빌드본" 가정은 옛 운영 흐름 흔적 (현 workflow와 불일치)

set -e
cd "$(dirname "$0")"

echo "[1/4] 옛 빌드 산출물 / vite 캐시 제거..."
rm -rf dist node_modules/.vite

echo "[2/4] 의존성 확인..."
[ ! -d node_modules ] && npm install --silent

echo "[3/4] vite build (workflow와 동일)..."
npx vite build

echo "[4/4] 검증..."
# 루트 index.html이 소스형인지
if ! grep -q '/src/main.jsx' index.html; then
  echo "✗ 루트 index.html이 소스형이 아님 — vite build가 entry 충돌로 죽을 위험"
  echo "  → 다음과 같이 복원해야 함:"
  echo '  <script type="module" src="/src/main.jsx"></script>'
  exit 1
fi
if grep -q '\./assets/index-' index.html; then
  echo "✗ 루트 index.html에 빌드본 해시 참조가 남아있음 — production 부정합"
  exit 1
fi
echo "✓ 루트 index.html: 소스형 (workflow npm run build 통과 가능)"

# dist/ 산출물 검증
JSFILE=$(ls dist/assets/index-*.js 2>/dev/null | head -1)
CSSFILE=$(ls dist/assets/index-*.css 2>/dev/null | head -1)
if [ -z "$JSFILE" ] || [ -z "$CSSFILE" ]; then
  echo "✗ dist/assets/index-*.js 또는 .css 없음 - 빌드 실패"
  exit 1
fi
echo "✓ 빌드 산출물: $JSFILE, $CSSFILE"

# dist/index.html이 자기 assets 참조하는지
if ! grep -q '\./assets/index-' dist/index.html; then
  echo "✗ dist/index.html이 ./assets/ 참조 안 함"
  exit 1
fi
echo "✓ dist/index.html: 자체 assets 참조 정상"

echo ""
echo "ZIP 패키징 가능 상태 (GitHub Actions npm run build 동일 환경 통과)."
