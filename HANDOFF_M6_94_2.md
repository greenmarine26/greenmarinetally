# Tallyman Master M6.94.2 — 매트릭스 빌더 시뮬 fix

## 추가 fix (M6.94.1 → M6.94.2)

### 버그: 매트릭스 빌더 우측 시뮬에 빈 박스만 표시

**증상**: 좌측 BAY 클릭 → 우측 시뮬 영역에 흰 박스만 보이고 베이 박스 안 그려짐.

**원인 분석**:
- `.cpv2-bay-box` CSS는 `flex: 1 1 0` 기반 → 부모가 flex container이어야 동작
- `PrintableCargoPlanV2`: 부모 `.cpv2-page-row`가 `display: flex` → 정상
- 매트릭스 빌더 시뮬: 부모가 일반 `<div>` (block) → flex 동작 X → height 0 → 빈 박스

**Fix**: `src/components/ShipMatrixBuilderModal.jsx`
- 시뮬 박스 부모 `<div>`에 `display: flex, flexDirection: column` 추가
- `.cpv2-bay-box`에 명시적 `height: 300px`, `flex: 'none'` 추가
- 결과: 부모 flex 여부 무관하게 항상 그려짐

## 누적 변경 (M6.94.0 → M6.94.2)

1. **M6.94.1 BayPlan.jsx**: 카고플랜 그리드 통일 (다른 클로드 작업)
2. **M6.94.1 cargoPlanCore.js**: computeBayRenderData deck/hold 그리드 통일 (이번 클로드)
3. **M6.94.2 ShipMatrixBuilderModal.jsx**: 시뮬 박스 height fix (이번 클로드)

## 빌드 결과 (M6.94.2)
- dist/index.html, dist/assets/index.js, index.css 모두 빌드 완료
- 0 에러

## GitHub Pages 배포 (사용자 운영 환경)

운영 URL: `greenmarine26.github.io/greenmarinetally/`
GitHub repo: `greenmarine26/greenmarinetally`

배포 방법:
1. 이 ZIP을 풀고 `dist/` 폴더 내용을 GitHub repo의 main 브랜치 루트 또는 docs 폴더에 push
2. 또는 별도 gh-pages 브랜치 사용 중이면 그쪽에 push
3. GitHub Actions가 자동 설정되어 있으면 src만 push해도 자동 빌드/배포

사용자가 어떤 방식으로 배포했는지 미확인. 사용자가 자기 방식대로 배포 필요.

