# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-24
**현재 버전**: M6.93.0 (배포 예정)
**GitHub**: greenmarine26/greenmarinetally
**작업 디렉토리**: `/home/claude/v2work/`

---

## 현재 상태 요약

### 완료된 주요 작업 (M6.91~M6.93)
| 버전 | 내용 |
|------|------|
| M6.93.0 | 마스터플랜 기준 전면 재작성: STANDARD_HOLD tier 10 추가 + 베이별 rowCount 다양화 + BAY 34 신설 |
| M6.92.9 | 홀수 단독 deck=9 / 짝수 페어 deck=11 분리 |
| M6.92.8 | SWAT cells 영역 버그 fix |
| M6.92.7 | SWAT 19베이 hull cells 정밀 입력 + 짝수 cells 가운데 정렬 fix |
| M6.91.0 | PDF override 사전 신설 (DJCT 15베이 + SWAT 19베이) |
| M6.91.1~4 | viewport fix, 스크롤 복구, PWA manifest 404 fix |
| M6.91.5 | 마크 규칙 개편 (Full=F, Empty=E, R/F, R/E, FR) |
| M6.92.0 | 색 통일 (선사/POD), shiftingMap compMap 연동, STANDARD_DECK 94 |
| M6.92.1 | BayPage getCellBg props fix, podOf 에러 fix, 베이상세 색 통일 |

### 핵심 파일
- `src/components/PrintableCargoPlanV2.jsx` — 카고플랜 V2 (인쇄)
- `src/components/BayPlan.jsx` — 베이플랜 (메인 화면)
- `src/components/PrintableBayDetail.jsx` — 베이상세 인쇄
- `src/cargoPlanCore.js` — V2 렌더 로직 (M6.81 포팅)
- `src/data/shipBayDict_pdf_override.js` — DJCT/SWAT 베이별 정답
- `src/utils.js` — 공통 함수 (getContainerColorKey, buildContainerColorMap 포함)

### 색 통일 규칙 (M6.92.0~)
- **양하**: 선사(c.op)별 컬러 — `getContainerColorKey(c, 'discharge')`
- **선적**: POD 3자별 컬러 — `getContainerColorKey(c, 'loading')`
- 3화면 (카고플랜V2/베이플랜/베이상세) 모두 동일 기준

### 마크 규칙 (M6.91.5~)
- 일반 Full=`F`, Empty=`E`
- 리퍼 Full=`R/F`, Empty=`R/E`
- FR=`FR`, DG=`D`, Tank=`T`, OOG=`A`

---

## 미해결 작업

1. **PDF override deckCells/holdCells** — DJCT hull 단면 정확도 (v5 없음, 수동 입력 필요)
2. **v5_matrix 파서 개선** — 300척 자동 cells 추출 (정확도 개선 필요)
3. **페어 박스 셀 충돌** — 짝수 20ft + 홀수 20ft 같은 슬롯
4. **HelpModal 등록** — 완료 (M6.92.1)
5. **지침서 갱신** — 완료 (M6.92.1)

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 첫 메시지에 붙여넣기
2. EDI/PDF 파일 첨부
3. 이 HANDOFF.md 참고하여 컨텍스트 복구
