# M5.21 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.21) — PORT-MIS 입출항 자동 표시 + Chrome 확장

사용자가 "선박 입출항 자동 표시" 요청 → API 없이 Chrome 확장 + Firebase 연동으로 구현.

## ✅ 두 가지 결과물 (별도 ZIP)

### 1. Chrome 확장 (portmis_ext.zip)

PORT-MIS 페이지에서 자동으로 데이터 추출 → Firebase 전송:
- `manifest.json`: Manifest V3, host_permissions for portmis.go.kr + Firebase URL
- `content.js`: gridList2 tbody의 `td[col_id="..."]` 패턴으로 데이터 추출. MutationObserver로 검색 후 데이터 로드 감지. 500ms 디바운스. lastSignature로 중복 전송 방지
- `background.js`: Firebase REST API로 `port_mis_data/{callsign}.json` PUT (callsign별 덮어씀)
- `popup.html` + `popup.js`: 통계 표시 + 🔄 강제 전송 버튼
- `icon.png`: 간단한 배 모양 아이콘 (PIL로 생성)
- `README.md`: 5단계 설치 가이드

### 2. Tallyman M5.21 (M5_21_REAL_DEPLOY.zip)

PORT-MIS 데이터 listener + 항차 카드 상단 표시:
- `src/firebase.js`: `fbSubscribePortMis` 함수 추가 (port_mis_data 노드 구독)
- `src/App.jsx`: portMisData state + listener 등록 (u4) + VoyagePage에 prop 전달
- `src/pages/VoyagePage.jsx`: 항차 카드 영역에 ⚓ PORT-MIS 카드 추가
  - 콜사인 매칭 (shipBayDictData callsign 우선)
  - 선박명 fuzzy 매칭 fallback
  - 평택 외 항만 시 ⚠ 경고
  - 항해구분 표시 (변경/최종/최초)

## 동작 흐름

```
[PORT-MIS 페이지]
   ↓ 검수반장(또는 누구든) 선박입출항현황 검색
[Chrome 확장 (content.js)]
   ↓ gridList2 tbody에서 14건 데이터 추출
   ↓ chrome.runtime.sendMessage({ type: 'PORTMIS_DATA', data })
[Chrome 확장 (background.js)]
   ↓ Firebase REST PUT: port_mis_data/{callsign}.json
[Firebase Realtime Database]
   ↓ onValue listener trigger
[Tallyman 모든 검수원 앱 (App.jsx)]
   ↓ setPortMisData → 리렌더
[VoyagePage 항차 카드 상단]
   ⚓ PORT-MIS 입항 05/23 23:00 · 출항 05/25 09:00 [변경]
```

## 시뮬레이션 결과 ✅ 7/7 통과

PORT-MIS 매칭 시뮬레이션:
- 콜사인 매칭 (ATPR/ATRP, TMPZ) 정확
- 선박명 부분 매칭 (스카이미르, NO.375 ORYONG) 정확
- 콜사인 잘못된 경우 vsl 폴백 동작
- 매칭 안 됨 → null (방해 X)

## 검증 결과

- 버전 M5.21: 2회 ✓
- port_mis_data, portMisData, PORT-MIS, ⚓ 4종 모두 적용 ✓
- 기존 기능 모두 잔존 (M5.20 priority, M5.19 listener fix, M5.18 footer, M5.17 scroll-snap, M5.16 카고플랜, M5.15 ATRP)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.21' |
| src/firebase.js | fbSubscribePortMis 함수 추가 |
| src/App.jsx | portMisData state + listener u4 + VoyagePage prop |
| src/pages/VoyagePage.jsx | getShipBayDictData import + ⚓ PORT-MIS 카드 UI |
| src/components/HelpModal.jsx | M5.21 변경사항 |

## 설치 순서 (사용자 시점)

### Step 1: Chrome 확장 설치 (한 명만, 5분)
1. portmis_ext.zip 다운로드 + 압축 해제
2. Chrome → chrome://extensions → 개발자 모드 ON
3. "압축해제된 확장 프로그램 로드" → 폴더 선택
4. 확장 아이콘 툴바에 고정 (선택)

### Step 2: PORT-MIS 사용
1. PORT-MIS 로그인
2. 선박입출항현황 검색
3. 자동 전송 (확장 아이콘 클릭하면 통계 확인 가능)

### Step 3: Tallyman M5.21 배포
1. M5_21_REAL_DEPLOY.zip → GitHub Pages 배포
2. 모든 검수원이 새 빌드 받음
3. 항차 화면에 ⚓ PORT-MIS 카드 자동 표시

## ⚠️ 잠재 이슈 / 향후 fix 후보

1. **Firebase write rules**: 확장이 익명으로 port_mis_data PUT 시 rules.json에 `.write: true` 필요. 현재 Spark 플랜 rules 확인 필요
2. **PORT-MIS 페이지 구조 변경 시**: WebSquare col_id 변경되면 확장 동작 안 함. 그 경우 content.js의 selector 수정 필요
3. **로그인 세션 만료**: 검수반장이 PORT-MIS 로그아웃되면 데이터 안 옴. 매일 한 번 PORT-MIS 페이지 열어주는 운영 필요
4. **충돌 가능성**: 두 명 이상 확장 설치 시 중복 PUT (덮어쓰니까 결과 동일하지만 트래픽 늘어남)
5. **항차 매칭 정확도**: 선박명에 특수문자 있거나 형식 다르면 매칭 실패. callsign이 가장 정확

## 🔜 다음 세션 후보

### M5.22 hotfix 후보
- 사용자 테스트 후 매칭 문제 발견되면 매칭 로직 강화
- PORT-MIS 카드에 더 많은 정보 (계선장소, 차항지 등) 표시 토글
- Firebase rules 점검

### 큰 빌드 (M5.3)
- Chrome 확장에 옵션 페이지 (Firebase 프로젝트 키 입력 등) — 다른 항만 확장 가능
- 자동 검색 기능 (확장이 자동으로 평택항 검색 클릭)

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: ATPR ↔ ATRP
5. Firebase listener cleanup: onValue 반환값(unsub)을 그대로 return
6. 음성 priority 시스템: 완료 음성은 high priority로 보호
7. **Chrome 확장 활용**: 정부/공공 사이트의 데이터를 API 없이 활용할 때 효과적 (사용자가 로그인 + 페이지 열기만 하면 됨)
