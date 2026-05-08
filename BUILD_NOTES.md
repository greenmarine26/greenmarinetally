# M3.90 빌드 변경 사항 (베이사전 통합)

## 추가된 파일
- `src/data/shipBayDict.js` (347 KB) - 11척 베이사전 데이터

## 수정된 파일
- `src/shipStructure.js` (+95줄) - 베이사전 통합 함수 4개 추가
  - `getShipBayDictData(imo, code)`
  - `augmentStructureWithBayDict(structure, imo, code)`
  - `isShipInBayDict(imo, code)`
  - `bayDictInfo()`
- `src/pages/VoyagePage.jsx` (+5줄) - EDI 업로드 시 베이사전 자동 매칭

## 동작 방식
1. EDI 업로드 → IMO 또는 선박명 추출
2. 베이사전(`shipBayDict.js`)에서 해당 선박 검색
3. 매칭되면 → 베이 골격 데이터 보강 + 알림 표시
4. 매칭 안 되면 → 기존 흐름 그대로 (영향 없음)

## 등록된 11척
| 키 | 코드 | 선박명 | 베이 수 |
|----|------|--------|---------|
| 9946647 | SWSP | SAWASDEE SPICA | 24 |
| DPRT | DPRT | PEGASUS PROTO | 25 |
| DXQD | DXQD | XIN QUN DAO | 15 |
| NBTD | NBTD | NINGBO TRADER | 21 |
| NSFR | NSFR | STAR FRONTIER | 20 |
| LYTJ | LYTJ | TEN JUPITER | 1 (재분석 필요) |
| ATPR | ATPR | ATLANTIC PIONEER | 16 |
| DJCF | DJCF | DONGJIN CONFIDENT | 22 |
| TMPZ | TMPZ | TIANHAI PINGZE | 16 |
| XTPG | XTPG | XIN TAI PING | 15 |
| S639 | S639 | DONGJIN CONTINENTAL | 17 |

## 미해결
- 베이사전 v1.1 = 미검증 상태 (verified: false)
- 레코드 인덱스 ↔ 실제 베이번호 매핑 미확정
- 리퍼/특수 슬롯 의미 추정만 됨
- BayPlan.jsx에서 bayDictGrid 활용 미구현 (다음 빌드)
- v6.10/v6.30 IMO/제원 미파악

## 검증 절차 (다음 항차)
1. SWSP/NBTD/DPRT 중 한 척 입항
2. 평소대로 EDI 업로드 → 콘솔에 "📚 베이사전 매칭" 메시지 확인
3. analyzeShipStructure 결과의 baySlots와 bayDictGrid 비교
4. 매핑률 95%+ 면 → v2.0으로 승격, BayPlan에서 활용 시작
