# Tallyman Master M6.94.0 인계서

**버전**: M6.94.0
**일자**: 2026-05-26
**주제**: 베이사전 빌더 강화 + 사용자 데이터 절대 보호 (사용자 4단계 아키텍처 1단계 완성)

## 사용자 5가지 원칙 (코드 구현 완료)

1. **사용자 저장 베이구조는 AI 절대 수정 금지**
2. **사용자 저장 없을 때만 AI가 EDI+PDF로 임시 생성 + 수정 요청**
3. **카고플랜·베이플랜·베이상세도 모두 사용자 > AI 순**
4. **데크-홀드 여백/정렬도 사용자 시각 편집**
5. **베이 구조 복사 기능**

## 핵심 변경 (8가지)

### A. 자동 수정 코드 모두 차단
- `bayDictAutoEnrich.js`: `enrichBayDef`가 source='user'면 entry 즉시 반환
- `cargoPlanCore.js` `computeBayRenderData`: userBay 매칭된 베이는 inferredMax + EDI tier union 차단 (M6.93.12 fix #10을 AI 임시에만 적용)
- 효과: 저장 → 리프레쉬 → 사용자 데이터 그대로

### B. source 정보 전달 흐름
- `PrintableCargoPlanV2.jsx`, `BayPlan.jsx`, `PrintableBayDetail.jsx` 모두 `enrichBayDef`에 source 인자 전달
- dictData.bayDef에 source/_userOwned 필드 포함 → cargoPlanCore가 user 판단 가능

### C. baysSummary 데이터 구조 확장 (6 필드 추가)
- `deckAlign`, `holdAlign` ('left'|'center'|'right')
- `deckPadLeft`, `deckPadRight`, `holdPadLeft`, `holdPadRight` (cells 단위)
- 기존 데이터 100% 호환 (없으면 기본값)
- `createEmptyBayEntry`, `matrixToBayDictEntry`, `bayDictEntryToMatrix` 모두 처리

### D. 카고플랜 padding 사용자 우선
- `BayBoxV2`의 hold cells padding: 사용자 입력 > alignment > 자동 가운데
- `cargoPlanCore.js`의 offsetHold도 사용자 padding/align 반영

### E. 매트릭스 빌더 좌우 분할
- 좌측: 베이 편집 (기존 컨트롤 + 베이 선택 버튼)
- 우측: 선택한 베이 시뮬레이션 (BayBoxV2 재사용, 빈 카고플랜 박스)
- 모달 폭 max-w-5xl → max-w-7xl

### F. 데크-홀드 정렬 시각 컨트롤
- Hold 정렬 버튼 (좌/가운데/우)
- 좌측 padding / 우측 padding 미세 조정 (cells 단위 입력)
- 사용자 입력 우선, 0이면 자동 가운데 fallback

### G. 베이 구조 복사 기능
- 우측 패널에 "📋 다른 베이에 복사하기" 버튼
- 모달 열림: 대상 베이 선택 (전체 선택 가능)
- 복사 필드: rowCount, hasZero, deckTiers, holdTiers, deckCells, holdCells, padding/align 6개
- pairEven은 안 복사 (각 베이 고유)

### H. 빈 카고플랜 박스 생성 함수
- `cargoPlanCore.js`에 `buildEmptyBayRenderData` export
- bayEntry → 컨테이너 없는 빈 박스 데이터 (BayBoxV2에 그대로 전달 가능)
- `BayBoxV2` + `CARGO_V2_CSS`를 PrintableCargoPlanV2에서 export

## 시뮬 검증 결과 (PASS)

```
Step 1: 사용자 [8,6,4,2] + padding=0 + align=center 입력
Step 2: matrixToBayDictEntry → baysSummary에 6필드 모두 저장
Step 3: localStorage 저장 (변경 없음)
Step 4: 리프레쉬 후 lookupUserBayDict → 그대로
Step 5: bayDictEntryToMatrix → 매트릭스 빌더 재오픈 시 그대로
Step 6: enrichBayDef(source='user') → 즉시 entry 반환 (보강 X)
Step 7: computeBayRenderData → isUserOwnedBay=true → [8,6,4,2] 그대로 표시
Step 8: 베이 복사: BAY 11 → BAY 13, 15, 17 정상

✅ 모든 시뮬 PASS
```

## 빌드 검증
- `npm run build` 성공 (0 에러, 0 warning 새로 발생)
- vite 6.4.2, react 18.3.1

## 사용자 4단계 아키텍처 (다음 단계)

```
1. 베이사전 ← M6.94.0 완성 ✅
2. EDI + 리스트 접목 → STOWPLAN / BAYPLAN / BAY상세
3. 양하/선적 (검수, 카운트, 특수화물, 사진 OCR 등)
4. 부가기능
```

기존 2~4 코드는 그대로 유지. 1단계 (베이사전)가 정확해지므로 2~4 자동 정확.

## 변경 파일 (7개)

1. `src/bayDictAutoEnrich.js`
2. `src/cargoPlanCore.js`
3. `src/shipMatrixBuilder.js`
4. `src/components/PrintableCargoPlanV2.jsx`
5. `src/components/PrintableBayDetail.jsx`
6. `src/components/BayPlan.jsx`
7. `src/components/ShipMatrixBuilderModal.jsx`

기타: `src/utils.js` (APP_VERSION), `sw.js` (VERSION), `src/components/HelpModal.jsx` (사용법 추가)

## 한계 (다음 버전)

- 시각 편집은 padding/align만 추가. tier별 cells 시각 클릭 편집 (각 셀 활성/비활성 직접 토글)은 다음 버전
- 베이별 deckRowMax/holdRowMax 따로 (deck 8 row + hold 6 row 같은 차이)도 다음 버전
- 현재는 rowCount 통일 (deck/hold 같은 row 갯수)
