# M5.23 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.23) — 베이사전 대규모 보강 + 매칭 강화

사용자 요청 "모든 배 정보를 베이사전에서 다시 비교해서 보충" → Define.zip 안의 330개 .def 파일 일괄 분석 → v2 사전과 비교 → 누락/잘못된 entry 일괄 정정.

## ✅ 결과

### 통계

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 사전 entry 수 | 108개 | **300개** |
| 누락 추가 | - | **192개** (베이 자동 추출) |
| 콜사인 정정 | - | **68건** |
| 사전 파일 크기 | 432KB | 540KB |

### 1) 콜사인 정정 68건

기존 사전의 callsign 필드가 선박명/IMO/잘못된 값으로 등록되어 있던 entry를 .def 헤더에서 추출한 정확한 콜사인으로 정정.

샘플:
- CNJL: 'LONDON' → 'A8SN4'
- NTMS: 'MAERSK' → 'OYLF2'
- HNVR: 'HANNOVER' → 'M8L...'
- ASFD: '9292450' → 'S6BC8'
- AKGA: '' → '5BAL4'

→ **PORT-MIS 매칭 정확도 대폭 상승**

### 2) 누락 192개 신규 추가

각 entry 포함 정보:
- code (4글자 EDI 코드)
- name (선박명)
- callsign (.def 헤더 콜사인)
- imo (IMO 번호, 있으면)
- caspVersion
- bayList (자동 추출 베이)
- grade: 'needs-review' (PDF 검증 안 됐음을 표시)

⚠️ 베이 자동 추출이라 일부 부정확 가능. 작업 중 베이 누락 발견되면 PDF STOWAGE INSTRUCTION 받아 정확화 (DJCT/TMPZ/NSDC 케이스처럼).

### 3) PORT-MIS 매칭 로직 4단계 강화

```js
1. 콜사인 정확 매칭 (D5RR5 == D5RR5)
2. 콜사인 prefix 매칭 (D5RR5 ↔ D5RR5xx, V7A545 ↔ V7A5451)
3. IMO 매칭 (콜사인 다르지만 IMO 같음)
4. 선박명 fuzzy 매칭 (부분 포함)
```

이제 .def의 콜사인과 PORT-MIS의 콜사인이 형식 차이가 있어도 자동 매칭됨.

### 시뮬레이션 9/9 통과

- 콜사인 정확 (ATPR D5RR5)
- 콜사인 정확 (NSDC V7A5451)
- 콜사인 prefix 양방향 (V7A545 ↔ V7A5451)
- IMO 매칭 (콜사인 다름, IMO 같음)
- 선박명 fuzzy
- 숫자 시작 콜사인 (3FTE6)
- 매칭 안 됨 / voyage 없음

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.23' |
| src/data/shipBayDict_v2.js | **192 entry 추가 + 68 callsign 정정 + totalShips 300** |
| src/pages/VoyagePage.jsx | PORT-MIS 카드 매칭 4단계로 강화 |
| src/components/HelpModal.jsx | M5.23 변경사항 |

## 사용자 시점 핵심 메시지

1. **사용자가 보낸 Define.zip의 모든 .def 파일 일괄 분석 완료**
2. **108 → 300개 선박 등록** (192척 신규 + 68건 정정)
3. **매칭 로직 4단계** — PORT-MIS와 콜사인 형식 차이도 자동 해결
4. **needs-review 192개** — 작업 중 베이 누락 발견되면 PDF 받아 정확 정정 가능

## ⚠️ 잠재 이슈 / 후속 작업

1. **베이 자동 추출 정확도**: 일부 선박은 PDF 검증 필요 (작업 중 누락 발견 시)
2. **매칭 false positive**: 콜사인 prefix 매칭 시 짧은 콜사인이 다른 긴 콜사인을 의도치 않게 매칭할 가능성 (모니터링)
3. **사전 크기 증가**: 540KB → 빌드 사이즈 1.3MB → 폰 로딩 시간 약간 증가 가능 (체감 미미)

## 🔜 다음 세션 후보

1. 작업 중 베이 누락 발견된 선박의 PDF STOWAGE INSTRUCTION 받아 정정
2. needs-review 일괄 → verified 승급 (사용자 검증 후)
3. 사전 파일 크기 최적화 (필요시 lazy load)

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤
4. 선박 코드 alias: ATPR ↔ ATRP, NSDC ↔ V7A5451
5. Firebase listener cleanup: onValue 반환값 그대로 return
6. 음성 priority: 완료 음성 high priority
7. Chrome 확장: 정부/공공 사이트 데이터 API 없이 활용
8. EDI 코드 vs PORT-MIS 콜사인: 다를 수 있음
9. **PORT-MIS 매칭 4단계**: 콜사인 정확 → prefix → IMO → 선박명 fuzzy
10. **베이 자동 추출 한계**: 일부 선박 PDF 검증 필요. PDF 받으면 grade: 'verified'
