# M5.18 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.18) — 카고플랜 footer fix

M5.16 범례 추가 후 페이지 좌하단 벗어남 + 사용자 "범례를 합계 위로" 요청 → footer 재배치.

## ✅ 변경 사항 (M5.17 → M5.18)

### footer 레이아웃 변경 (PrintableCargoPlan.jsx)

**M5.16/17 (이전)**:
```
[합계표]
  20'/40'/45'
  o PTK 549/8/1
[구분선]
  E Empty
  R Reefer
  D DG
  F FR
  A OT
  T TK
  o X-RAY
```
→ 7-9 줄, 페이지 하단 벗어남

**M5.18 (현재)**:
```
[범례 가로 2열]
  E Empty | R Reefer
  D DG    | F FR
  A OT    | T TK
  ──── o X-RAY ────  (양하 모드만, 한 줄 통째)
[구분선]
[합계표]
  20'/40'/45'
  o PTK 549/8/1
```
→ 4-5 줄로 컴팩트, PDF STOWAGE 표준 순서 (범례 → 합계)

### CSS

```css
display: grid;
gridTemplateColumns: '1fr 1fr';
gap: '0 6px';
```

X-RAY는 `gridColumn: '1 / -1'`로 전체 너비 사용 (양하 모드만 표시).

### 검증

- 버전 M5.18: 2회 ✓
- gridTemplateColumns 3회 / 1fr 1fr 1회 / borderBottom 1회 (합계 위 구분선) ✓
- 모든 mark/type 클래스 잔존 ✓
- M5.17 scroll-snap, M5.16 카고플랜, M5.15 ATRP alias 모두 잔존 ✓

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.18' |
| src/components/PrintableCargoPlan.jsx | legend-box 내부 순서 변경 + 범례 가로 2열 grid |
| src/components/HelpModal.jsx | M5.18 변경사항 |

## 사용자 시점

- 범례가 합계 위에 위치
- 범례 항목 가로 2열로 컴팩트
- 페이지 하단 벗어남 사라짐
- A4 landscape 안에 모든 컨텐츠 들어감

## 🔜 다음 세션 후보

1. 사용자 테스트 후 추가 미세 조정 (폰트 크기, 간격 등)
2. PDF STOWAGE INSTRUCTION 표준에 더 가까운 표기 검토
3. 베이 상세 인쇄(PrintableBayDetail)에도 같은 범례 적용 확인

## 영구 규칙 (메모리)

1. 빌드 전 시뮬레이션 절대 원칙 (이전 사용자 지적 후 적용 중)
2. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. 선박 코드 alias: ATPR ↔ ATRP 같은 케이스 발견 시 즉시 alias 추가
