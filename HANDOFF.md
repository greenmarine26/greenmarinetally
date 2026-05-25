# Tallyman Master — HANDOFF.md

**최종 갱신**: 2026-05-25
**현재 버전**: M6.93.1 (검증 대기 — 사용자 화면 OK 후 정식 배포)
**GitHub**: greenmarine26/greenmarinetally

---

## M6.93.1 신규 (2026-05-25) — 신규 선박 베이 매트릭스 빌더

### 목적
신규 선박 입항 시 베이사전 없어도 즉시 카고플랜 사용 가능.

### 진입점
**자료 탭 > "🚢 신규 선박 베이 매트릭스 빌더"** (BayDictLibraryWidget 아래)

### 분석 우선순위 (사용자 가르침)
1. EDI (1차, 가장 신뢰) — 적재된 row/tier 실데이터
2. 베이사전 (2차) — EDI 부족분 보강
3. PDF (3차) — 베이사전에도 없을 때 사용자 요청 → 파싱 보강
4. 사용자 폼 — 최종 검증/cells 입력

### 신규 파일
- `src/shipMatrixBuilder.js` (4 함수: buildFromEdi, augmentFromBayDict, augmentFromPdf, toBayDictEntry)
- `src/pdfBayParser.js` (parsePdfStowage)
- `src/components/ShipMatrixBuilderModal.jsx`

### 수정 파일
- package.json (pdfjs-dist ^4.0.379)
- src/utils.js (APP_VERSION = 'M6.93.1')
- src/pages/VoyagePage.jsx (진입점 + 모달 마운트)
- src/components/HelpModal.jsx (사용법 등재)

### PDF 자동 파싱 한계 (정직한 보고)
- 베이/페어 100%, hasZero 95-100%, rowCount 70-95%
- cells: 마크만 카운트 → 사용자 폼 보강 필수

---

## M6.93.0 (2026-05-24) — 이전 (배포됨)
| 버전 | 내용 |
|------|------|
| M6.93.0 | 마스터플랜 전면 재작성, STANDARD_HOLD tier 10 추가 |
| M6.92.9 | 홀수 단독 deck=9 / 짝수 페어 deck=11 |
| M6.91.0 | PDF override (DJCT 15 + SWAT 19) |

---

## 미해결 작업
1. **M6.93.1 사용자 화면 검증** (자료 탭 진입 / EDI 분석 / PDF 업로드 / 저장)
2. SWAT 실 EDI 컨테이너 그림 테스트
3. 36척 엑셀 일괄 변환
4. PDF override deckCells/holdCells (hull 단면 정확도)

---

## 다음 채팅 시작 시
1. 검수앱지침서.md 붙여넣기
2. M6.93.1 검증 결과 보고 (사용자 화면 OK / 수정 필요)
