# M6.66 패치 (M6.61~M6.66 누적)

## 적용 양식

1. ZIP 풀기 (`M6_66_patch/` 폴더 생성)
2. **greenmarinetally 폴더에서** 다음 파일들을 덮어쓰기:
   ```
   M6_66_patch/src/ → greenmarinetally/src/
   ```
3. 빌드 + push:
   ```bash
   cd greenmarinetally
   bash build.sh
   git add . && git commit -m "M6.66" && git push
   ```
4. GitHub Actions 자동 배포 → 검수원 새로고침

## 누적 변경 (M6.61 ~ M6.66)

- M6.61: PCBJ 베이사전 STOWAGE PDF 기반 정확 재등록
- M6.62: v2 verified 최신본이 Firebase 옛 정정본보다 우선
- M6.63: BAY (34)35 extraTier 80 중복 표시 수정
- M6.64: KRPYT (평택신항) 코드 인식 (115개 양하 컨 추가 매칭)
- M6.65: 적재 mode mark 'L' → POD 3자 약어 (DLC, LYG, INC 등) + 범례 추가 + DXQD 베이사전 정정
- M6.66: hold tier 그림자 표시 — 짝수 베이 40피트가 인접 홀수 베이 hold에도 X 표시 (deck처럼)

## 수정 파일 (11개)

- src/utils.js (APP_VERSION M6.66 + KRPYT)
- src/shipStructure.js (M6.62 v2 우선)
- src/diagnostics.js, src/workingReport.js, src/mixerUpload.js (KRPYT)
- src/data/shipBayDict_v2.js (PCBJ + DXQD 정확 베이사전)
- src/components/PrintableCargoPlan.jsx (양식 핵심 — M6.63/M6.65/M6.66)
- src/components/PrintHubModal.jsx (KRPYT)
- src/components/PrintableBayDetail.jsx (KRPYT)
- src/components/BayPlan.jsx (KRPYT)
- src/components/ValidationBox.jsx (KRPYT)
- src/components/HelpModal.jsx (M6.61~M6.66 항목)
