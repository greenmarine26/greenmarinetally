# M5.17 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.17) — 베이 화면 scroll-snap 한 페이지 스크롤

M5.16 배포 후 사용자가 "베이 화면 스크롤 시 베이 하나씩 정확히 화면에 들어와야 하는데 조금씩 겹쳐서 나옴" 보고. CSS scroll-snap 적용으로 fix.

## ✅ 이번 빌드 변경 사항 (M5.16 → M5.17)

### CSS scroll-snap 적용 (BayPlan.jsx)

**변경 전**:
```jsx
<div ref={scrollRef} className="..." style={{ maxHeight: '78vh' }}>
  <div className="space-y-6">
    {pages.map((page, pIdx) => (
      <div key={pIdx} id={`bay-page-${pIdx}`}>
        <BayPage ... />
      </div>
    ))}
  </div>
</div>
```

**변경 후**:
```jsx
<div ref={scrollRef} className="..."
     style={{ maxHeight: '78vh', scrollSnapType: 'y mandatory' }}>
  <div className="space-y-6">
    {pages.map((page, pIdx) => (
      <div key={pIdx} id={`bay-page-${pIdx}`}
           style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
        <BayPage ... />
      </div>
    ))}
  </div>
</div>
```

### 효과

- 스크롤 컨테이너에 `scroll-snap-type: y mandatory` → 자식 페이지의 가장 가까운 snap point에 강제 정지
- 각 페이지 div에 `scroll-snap-align: start` → 페이지 시작점이 컨테이너 상단과 정렬
- `scroll-snap-stop: always` → 빠른 스크롤에도 한 페이지 건너뛰지 않고 정확히 한 베이씩 정지

## 검증 결과

- 버전 M5.17: 2회 ✓
- scrollSnapType / scrollSnapAlign / scrollSnapStop / 'y mandatory' 모두 정상
- 기존 기능 모두 잔존 (M5.16 카고플랜 특수화물, M5.15 ATRP alias, M5.11 매칭 강화 등)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.17' |
| src/components/BayPlan.jsx | scroll-snap inline style 추가 (스크롤 컨테이너 + 각 페이지) |
| src/components/HelpModal.jsx | M5.17 변경사항 |

## ⚠️ 잠재 이슈 (브라우저 호환성)

- CSS scroll-snap은 모든 모던 브라우저 지원 (Chrome 69+, Safari 11+, Firefox 68+, Edge 79+)
- 사용자 환경(Chrome on Windows + 폰)에서는 문제 없음
- 단, 베이 페이지가 컨테이너 높이(78vh)보다 크면 스냅이 조금 어색할 수 있음 — 사용자 테스트 필요

## 사용자 시점 핵심 메시지

1. **베이 스크롤 한 페이지씩 정확히 멈춤** — 손가락 떼면 자동 스냅
2. **위/아래 베이가 겹쳐 보이는 문제 해결**
3. **CSS 기본 기능** — 메모리/배터리 영향 없음

## 🔜 다음 세션 후보

### 사용자 테스트 후 fine-tune 가능한 점
- 페이지 사이 간격(space-y-6 = 24px)이 스냅에 맞지 않으면 조정
- 큰 베이(많은 row/tier)에서 스냅 위치 미세 조정
- 단일 페이지 모드(allBaysMode=false)에는 scroll-snap 적용 X (한 페이지만 보이므로 불필요)

### 큰 빌드 후보 (M5.2)
- 베이 상세 인쇄(PrintableBayDetail)에도 특수화물/X-RAY 강화 (현재 어떻게 되어있는지 확인 필요)
- 카고플랜 별도 SPECIAL CARGO 페이지 추가 (PDF처럼)

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙 — CSS 변경은 단위 테스트 어려우니 코드 grep 검증 필수
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: 같은 선박이 EDI 시스템마다 다른 코드 사용 가능
