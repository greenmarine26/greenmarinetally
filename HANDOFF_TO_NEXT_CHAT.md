# 검수앱 인계 지침서 — M3.5.6 (2026.05.05)

## M3.5.6 신규 기능: 카톡 작업 보고 시스템 ⭐

### 작동 방식
검수원이 검수앱에서 [📤 작업 보고] 버튼 누르고 → 카톡 단톡방 한 번 선택 → 자동 전송. 앱 안 나가도 보고 끝.

### 보고 종류 (모두 카톡 자동 발송)
1. **양하/선적 시작/중단/재개/완료** (1~4호기 별 + 양하/선적 동시 추적)
2. **해치커버 OPEN/CLOSE** (베이 다중 입력)
3. **콘박스** (20자/40자, 1~3개)
4. **실오류 사진** (사진 + 컨번호 + 기존실/발견실)
5. **데미지 사진** (사진 + 종류 16종 + 부위 13종 + 설명)

### 핵심: 한 장비가 양하 + 선적 동시 진행 가능
1호기가 5번 베이는 양하 끝, 10번 베이는 양하 진행 중일 때:
- 5번 베이에 선적 시작 가능
- 10번 베이 양하는 그대로 계속
- 두 작업 독립적으로 추적

데이터 모델:
```
activeWork/{voyageKey}/{equipNo}/{discharge|load} = { status, startedAt, ... }
```

### 화면 (검수원 폰)
```
[작업 보고 메인]
─────────────────────
진행 중인 작업:

🏗 1호기
  ⬇ 양하 [🟢 진행]   [⏸중단][✅완료]
  ⬆ 선적 [🟢 진행]   [⏸중단][✅완료]

🏗 2호기
  ⬇ 양하 [⏸ 중단]    [▶재개][✅완료]
  사유: 강풍

[▶ 새 작업 시작]
[🔓 해치] [📦 콘박스]
```

### 화면 (수석검수 대시보드)
```
🏗 장비별 오늘 작업 보고
1호기: 12건 (📤8, 🔓3, 📦1)
2호기: 8건
3호기: 작업 없음
4호기: 5건

📋 최근 작업 보고 (시간순)
14:23 ATRP 1호기 양하 시작
15:00 ATRP 1호기 선적 시작
15:30 ATRP 2호기 양하 중단 (강풍)
...
```

## 카톡 메시지 형식

```
[양하 시작]
📍 ATRP 2621W
🟢 양하 시작
시각: 5/7 14:23
1호기

[중단]
📍 ATRP 2621W
⏸ 양하 중단
시각: 14:50
사유: 강풍 10m/s
1호기

[해치]
📍 ATRP 2621W
🔓 해치커버 OPEN
베이: 1, 3, 5
총 3장
시각: 14:25
1호기

[콘박스]
📍 ATRP 2621W
📦 콘박스 20자 1개
시각: 14:30
1호기

[데미지]
📍 ATRP 2621W
⚠️ DAMAGE
컨번호: BEAU4211950
종류: DENTED, BULGED
부위: LEFT SIDE, ROOF
설명: 좌측면 30cm 손상
시각: 14:35
1호기

[실오류]
📍 ATRP 2621W
🚨 실오류
컨번호: BEAU4211950
기존실: 12345
발견실: 67890
시각: 14:40
1호기
```

## 데미지 표준 용어

### 종류 (16개)
DENTED, BENT, BULGED, PUSHED IN, HOLE, TORN, CUT, SCRATCH,
CRACKED, BROKEN, LOOSE, MISSING, RUST, DIRTY, WET, CONTAMINATED

### 부위 (13개)
ROOF, FLOOR, LEFT SIDE, RIGHT SIDE, FRONT END, BACK END/DOOR,
DOOR HANDLE, DOOR LATCH, DOOR HINGE, DOOR GASKET,
CORNER POST, LOCK ROD, SEAL

## 신규 파일

```
src/kakaoShare.js                       - 카톡 공유 헬퍼 (Web Share API)
src/components/WorkReportModal.jsx      - 작업 보고 통합 모달
src/components/PhotoReportModal.jsx     - 사진 보고 모달
```

## 수정 파일

```
src/utils.js                            - getEquipNumber/setEquipNumber 추가
src/firebase.js                         - fbAddWorkReport/fbSubscribeAllReports/fbAddPhotoReport
src/components/Header.jsx               - 장비 번호 표시 + 변경 모달
src/components/ContainerDetailModal.jsx - 사진 보고 버튼
src/pages/VoyagePage.jsx                - 작업 보고 큰 버튼 + 모달 마운트
src/pages/ChiefDashboard.jsx            - 장비별 통계 + 최근 보고
```

## 작동 흐름

### 검수원 (모바일)
1. 검수앱 켬
2. 항차 페이지에서 [📤 작업 보고] 클릭
3. [▶ 새 작업 시작] → 장비 + 양하/선적 선택 → [시작]
4. 카톡 공유창 자동 열림 → 단톡방 선택 → 전송
5. 앱 자동 복귀

### 추가 보고 (작업 중)
- [📤 작업 보고] → 진행 중 작업 카드에서 [중단][재개][완료]
- 또는 [해치][콘박스] 빠른 보고
- 컨테이너 모달에서 [📷 실오류][📷 데미지]

### 수석검수 (모니터)
- 수석 대시보드에서 실시간 확인
- 장비별 통계
- 최근 30건 메시지 그대로

## Web Share API 작동 환경

- ✅ Android Chrome, Samsung Internet
- ✅ iOS Safari (15+)
- ⚠️ PC Chrome: 클립보드 복사 폴백 (수동 붙여넣기)

미지원 시 자동으로 클립보드에 복사 → 검수원이 카톡에 붙여넣기.

## 다음 작업 우선순위

### 완성도 (현재 95%)
M3.5.6으로 검수업 핵심 + 작업 보고까지 완성. 남은 5%:

1. **통계 강화** (검수원/장비별 작업량)
2. **데이터 보관/아카이브** (Firebase 자동 백업)
3. **인계 문서** (시스템 구조도, 운영 매뉴얼)

### 미해결 작업
- ISO 변경 추적 UI (M3.5.5에서 미완)
- 베이플랜 다중 적재 ⊕N 표시

### 보류된 기능
- PORT-MIS 평택 스케줄 (개인 명의 인증키 회피, 회사 결정 사항)
- 카카오 알림톡 완전 자동 (사업자등록 필요, 회사 결정)
- 명단 시스템 (성일님 결정으로 보류)
- DG/무게 참고 표시 (현장 테스트 후 결정)

## 작업 원칙 (고정)

- EDI 우선, ASC는 검증용
- 추론 금지, 실제 데이터 검증 후 답변
- "만들지 마세요" 명령 시 즉시 중단
- ZIP 배포 시 항상 HANDOFF_TO_NEXT_CHAT.md 함께 제공

## 운영 정보

- GitHub: greenmarine26/greenmarinetally
- 사이트: https://greenmarine26.github.io/greenmarinetally/
- Firebase: greenmarinetally (asia-southeast1, Spark 무료)
- DB URL: https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app
- AI: Gemini 2.5 Pro (무료, 충분)
- 운영 규모: 동시 4척, 척당 ~1000대, 검수원 최대 15명

## 다음 채팅 시작 시

1. M3.5.6 ZIP의 모든 파일 확인
2. 모레 현장 테스트 결과 들고 시작
3. 통계 강화 또는 인계 준비 작업

