# M5.20 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.20) — 완료 음성 보호 fix

M5.19 listener fix 후 사용자가 "완료 음성이 안 나옴" 보고. 진단 결과: listener fix로 voyage 갱신이 정상 동작 → DiagnosticsPanel 자동 음성이 600ms 후 사용자 완료 음성을 즉시 cancel. 두 가지 안전장치 적용.

## ✅ 변경 사항 (M5.19 → M5.20)

### 1. 진단 자동 음성 기본 OFF (VoyagePage.jsx)

```js
// 이전
const [diagAutoSpeak, setDiagAutoSpeak] = useState(true);

// 현재
const [diagAutoSpeak, setDiagAutoSpeak] = useState(false);
```

사용자가 필요시 진단 패널의 🔊 아이콘으로 켤 수 있음. 평소 검수 작업 방해 X.

### 2. speak() priority 시스템 추가 (voice.js)

```js
// 핵심 변경
let currentSpeakPriority = null;

export function speak(text, opts = {}) {
  const isHigh = opts.priority === 'high';
  if (window.speechSynthesis.speaking && !opts.append) {
    // 현재 high 음성 출력 중인데 새 음성이 high 아니면 무시
    if (currentSpeakPriority === 'high' && !isHigh) return;
    window.speechSynthesis.cancel();
  }
  currentSpeakPriority = isHigh ? 'high' : null;
  const u = new SpeechSynthesisUtterance(spoken);
  u.onend = () => { currentSpeakPriority = null; };
  ...
}

export function speakDone(c) {
  speak(`${spellKo(last4)} 완료`, { rate: 1.5, priority: 'high' });
}
```

- 사용자 완료 음성은 priority='high' → 다른 음성이 와도 끊기지 않음
- 일반 음성끼리는 기존 동작 그대로 (새 음성이 이전 cancel)
- 새 완료 음성은 이전 완료 음성을 cancel (연속 완료 작업)
- u.onend 콜백으로 priority 자동 reset

### 시뮬레이션 결과

6/6 통과:
- ✓ 일반 → 일반: 두 번째가 첫번째 cancel
- ✓ 완료(high) → 진단(일반): 진단 무시 (보호됨)
- ✓ 완료 끝난 후 → 진단: 정상 출력
- ✓ 완료(high) → 완료(high): 새 완료가 cancel & 출력
- ✓ 사용자 시나리오: 600ms 후 진단 → 완료 음성 보호
- ✓ 연속 완료: 정상 동작

## 검증 결과

- 버전 M5.20: 2회 ✓
- priority 시스템 적용 (priority/high 키워드 다수) ✓
- M5.19 listener fix, M5.18 footer, M5.17 scroll-snap, M5.16 카고플랜, M5.15 ATRP alias 모두 잔존 ✓

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.20' |
| src/pages/VoyagePage.jsx | diagAutoSpeak 기본값 true → false |
| src/voice.js | speak() priority 시스템 + speakDone high priority |
| src/components/HelpModal.jsx | M5.20 변경사항 |

## 사용자 시점 핵심 메시지

1. **🔥 완료 음성 정상 출력** — "3050 완료" 끊김 없이 들림
2. **진단 자동 음성 기본 OFF** — 평소 방해 X, 필요시 토글로 켜기
3. **이중 안전장치** — priority 시스템으로 미래 비슷한 충돌 예방

## ⚠️ 부수 효과

- 진단 패널이 켜 있어도 자동 음성 X. 사용자가 의도적으로 켜는 액션 필요
- 검색 음성, 알림 음성 등 다른 일반 음성은 완료 음성 진행 중일 때 무시됨 (의도된 동작)
- 만약 사용자가 진단 자동 음성을 자주 사용한다면 매번 켜야 함 — localStorage로 토글 상태 저장 검토 필요 (M5.21 후보)

## 🔜 다음 세션 후보

1. diagAutoSpeak 토글 상태 localStorage 저장 (사용자 선호 영구 기억)
2. priority 시스템 적용 범위 확장 (검색 결과 음성, X-RAY 알림 등 분류)
3. 베이 30% zoom 사용 결과 따라 미세 조정

## 영구 규칙 (메모리)

1. **빌드 전 시뮬레이션 절대 원칙** — 이번 voice priority도 시뮬레이션으로 검증
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: ATPR ↔ ATRP
5. **Firebase listener cleanup**: 같은 ref 다중 listener 시 onValue 반환값(unsub)을 그대로 return
6. **음성 priority 시스템**: 완료 음성은 high priority로 보호 (다른 음성이 cancel 못 함)
