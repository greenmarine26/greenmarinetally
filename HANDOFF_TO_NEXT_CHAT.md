# M5.11 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.11) — 베이사전 매칭 강화 + EDI 자료 재처리

M5.1 배포 후 사용자가 베이사전 매칭 로직에 의문 제기 → 분석 결과 진짜 큰 버그 발견 → M5.11 hotfix.

## ✅ 이번 빌드 변경 사항 (M5.1 → M5.11)

### 베이사전 매칭 로직 강화 (대형 fix)

**진단된 핵심 버그**:
- `lookupBayDictV2(code)`가 단순 키 매칭만 함 → 4글자 코드(TNJP)가 아닌 선박명(SAWASDEE SPICA)이 들어가면 항상 실패
- fuzzy 매칭의 entry.name 데이터가 "AKGAA KEIGA 5BAL4" 같이 4글자 prefix + 콜사인 + garbage가 섞여 있어 정규화 후 매칭 실패
- IMO와 callsign 매칭이 v2에 없었음
- 결과: 109척 등록되어 있어도 실제 적용은 일부만 → 사용자 사진(BAY 01 중복+EDI 폴백 패턴)이 그 증거

**수정**:
- 새 함수 `lookupBayDictV2Enhanced(imo, vesselName)` — 4가지 매칭 시도:
  1. 4글자 코드 직접 키 매칭
  2. IMO 숫자 매칭 (name+callsign 검색)
  3. callsign 매칭 (양방향 substring)
  4. 선박명 fuzzy — entry.name에서 4글자 prefix + garbage 바이트 제거 후 양방향 substring
- `fuzzyLookupAcrossDicts` 강화 — 새 enhanced lookup 우선 사용 + matchedBy 정보 보존
- `getShipBayDictData`에 matchedBy 필드 추가 (진단용)

### BayDictStatusWidget 강화

- 매칭 실패 시: ⚠️ 명확한 진단 표시 + 시도된 EDI IMO/선박명/시도 키 모두 펼쳐서 보임
- 매칭 성공 시: 어떤 키로 매칭됐는지 표시 (🟢 IMO 정확 / 🟢 콜사인 / 🟢 코드 정확 / 🟡 이름 fuzzy / 🔵 사용자 사전 / 🟠 v1 폴백)
- 펼치기 토글로 진단 정보 (사전 코드, 콜사인, 출처) 표시

### EDI 원본 보관 + [🔄 자료 재처리] 버튼 (큰 신규 기능)

**배경**: 사용자가 매번 앱 업데이트 후 자료를 다시 올렸음 → 비효율적. 이번엔 매칭 강화라 표시 시점 자동 적용이지만, 미래 EDI 파싱 변경(M3.86 ISO 정정 같은 케이스) 대비 필요.

**구현**:
- 새 Firebase 함수: `fbSaveEdiRaw(voyageKey, mode, rawText, meta)` / `fbGetEdiRaw(voyageKey, mode)`
- 저장 경로: `voyages/{key}/{mode}/raw/edi` (text, uploadedAt, fileName, parserVersion, sizeBytes)
- 안전 제한: 5MB까지
- EDI 업로드 시점에 원본 텍스트 자동 보관 (BAPLIE/ASC 모두 합쳐서, 파일명 구분자 `----- FILE: ... -----` 포함)
- 자료 탭 EDI 카드에 [🔄 EDI 원본으로 자료 재처리] 큰 amber 버튼 (보관된 원본이 있을 때만)
- 재처리 시: 원본 텍스트를 파일별로 split → parseBAPLIE/parseAscFile로 다시 파싱 → ediContainers 덮어쓰기
- **검수 입력 데이터(records, completed, xrayList, eseal 등)는 보존** (ediContainers만 갱신)
- 재처리 버튼 누르면 확인 모달 + 결과 메시지

### 자료 재처리 사용 시나리오 (사용자 명령)

```
[검수원]                    [관리자]                    [앱]
새 항차 작업 시작
  ↓
EDI 업로드  ───────────────────────────→ Firebase에 EDI 원본 자동 보관
  ↓
검수 작업 진행 (실번호/사진 입력)
  ↓                                                       ↓
                          앱 업데이트 발생              [기존엔: 자료 다시 올려야]
                          (예: 새 ISO 코드)              [지금은: 자료 재처리 1번]
                                ↓
검수원 [🔄 자료 재처리] 누름 ─────────────→ 보관된 원본 다시 파싱 → ediContainers 갱신
                                            (records 보존)
  ↓
계속 작업 (새 로직 적용된 상태)
```

### 검증 결과 (산출물 grep)

- 버전 M5.11: 3회 ✓ / M5.1 5회 (도움말) ✓
- 매칭 강화: matchedBy 13회 / name-fuzzy 3회 / IMO 정확 / 콜사인 / 코드 정확 모두 정상
- BayDictStatusWidget: 매칭됨/매칭 실패/EDI 폴백/매칭 방식/사전 출처 모두 정상
- 재처리: 재처리 9회 / EDI 원본 보관 2회 / 원본 재파싱 1회
- 기존 M5.1 잔존: 보관함 13회 / 마감 점검 5회 / 🏁 / __STG__ / 🔲 모두 정상

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.11' |
| src/data/shipBayDict_v2.js | **lookupBayDictV2Enhanced** 신규 — IMO/callsign/code/name 4가지 매칭 |
| src/shipStructure.js | fuzzyLookupAcrossDicts 강화 — enhanced lookup 사용, matchedBy 보존 / getShipBayDictData에 matchedBy 추가 |
| src/firebase.js | **fbSaveEdiRaw / fbGetEdiRaw** 신규 |
| src/components/BayDictStatusWidget.jsx | 매칭 진단 표시 강화 + 펼치기 토글 |
| src/pages/VoyagePage.jsx | EDI 업로드 시 원본 자동 보관 / DataTab에 rawMeta state + handleReprocess + [🔄 재처리] 버튼 |
| src/components/HelpModal.jsx | M5.11 변경사항 |
| SHIPMENT_MANUAL.md / HANDOFF | 갱신 |

## 사용자 시점 핵심 메시지

1. **이번 매칭 강화는 자동 적용** — 새 빌드만 받으면 기존 항차에도 즉시 적용 (자료 재업로드 X)
2. **자료 재처리 기능 = 미래 보험** — 다음 EDI 업로드부터 원본이 자동 보관됨. 미래 어떤 EDI 파싱 변경이 와도 [🔄 재처리] 한 번이면 끝

## ⚠️ 잠재 이슈

1. **EDI 원본 크기**: 5MB 제한 걸어둠. 큰 선박 EDI(CMA CGM 50+ bays)는 ~1MB 정도라 안전. 그래도 누적되면 Firebase Spark 1GB 한도 부담될 수 있음 — 모니터링 필요
2. **재처리 시 `_mode` 결정**: 양하/선적 모드별로 재처리하니 mode='discharge'면 BAPLIE에서 평택 양하만 'discharge', 나머지 'transit'. 선적이면 반대. 사용자가 잘못된 모드에서 재처리하면 데이터 어긋날 수 있음
3. **자리 뺏긴 컨/보관함과의 상호작용**: 재처리는 ediContainers만 덮어쓰니, records의 bay_actual 등은 그대로. 그러나 EDI 원본의 위치가 바뀌면(거의 없는 케이스) actual_position이 의미 잃을 수 있음
4. **베이사전 매칭 강화**가 잘못된 선박을 매칭할 가능성: 이름 fuzzy가 너무 관대하면 비슷한 이름의 다른 선박이 매칭될 수도. → BayDictStatusWidget의 펼치기로 사용자가 직접 확인 가능하게 만든 이유

## 🔜 다음 세션

### M5.12 hotfix 후보 (실데이터 검증 후)
- 매칭 강화로 잘못 매칭되는 케이스가 있다면 fuzzy 임계값 강화
- 재처리 버튼 위치/UX 개선

### M5.2 후보 (큰 변화)
- 리스트(엑셀/PDF/이미지)도 원본 보관 + 재처리
- HTML5 Drag & Drop (보관함 ↔ 베이 그리드)

## 영구 규칙 (메모리)

1. 빌드 전 체크리스트: APP_VERSION + HelpModal 사용법 + HANDOFF.md 갱신
2. 버전 표기: 큰 변화 = M5.0 → M5.1, 작은 수정 = M5.0 → M5.01 → M5.02
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
