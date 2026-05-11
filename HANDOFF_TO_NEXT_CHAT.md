# M5.31 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.31) — 별첨 위치 + 빈 슬롯 표시 한 번에

사용자 보고:
1. ✅ 검수 리스트 75행/단 보장 (M5.30 완료)
2. ✅ 베이 단위 필터 (M5.30 완료)
3. ✅ 별첨 위치 — 마지막 베이 좌측에 absolute (M5.31)
4. ✅ 개별 베이 빈 슬롯 표시 — globalRowRange/Tiers 전달 (M5.31)

## ✅ M5.31 적용

### 1. 카고플랜 별첨 위치 (페이지 추가 방지)

cargo-footer (범례 + 합계)를 페이지 좌하단 absolute로:

```css
.cargo-plan-page { position: relative; }
.cargo-footer {
  position: absolute;
  bottom: 8px;
  left: 16px;
  max-width: 220px;
}
@media print {
  .cargo-footer { position: absolute; bottom: 8px; left: 16px; }
}
```

→ 별첨이 베이 영역 다음에 따로 페이지 차지 X. 마지막 베이가 끝나도 그 페이지 좌하단에 자동 배치.

### 2. 개별 베이 빈 슬롯 표시

PrintHubModal에서 globalRowRange + globalTiers 계산 + PrintableBayDetail에 전달 (BayPlan과 동일 패턴):

```js
let maxLeft = 0, maxRight = 0;
const tierSet = new Set();
printContainers.forEach(c => {
  if (c.row) {
    const n = parseInt(c.row);
    if (n > 0) {
      if (n % 2 === 0) maxLeft = Math.max(maxLeft, n);
      else maxRight = Math.max(maxRight, n);
    }
  }
  if (c.tier) tierSet.add(c.tier);
});
const globalRowRange = { maxLeft, maxRight };
const globalTiers = Array.from(tierSet);
```

PrintableBayDetail은 이미 빈 슬롯 처리 로직 있음 (`renderCell`에서 c 없으면 `<div className="bd-cell empty">` 출력). globalRowRange/Tiers 전달되면 화면 BayPlan과 동일하게 모든 슬롯 표시.

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.31' |
| src/components/PrintHubModal.jsx | globalRowRange/Tiers 계산 + 전달 (null → 실제 값) |
| src/components/PrintableCargoPlan.jsx | cargo-footer absolute 좌하단 + cargo-plan-page position:relative |

## ⚠️ 주의사항

1. **CSS @media print에서 position:absolute 동작**: 일부 브라우저는 absolute footer를 print 시 마지막 페이지에 자동 배치. Chrome/Edge는 정상. Firefox/Safari는 다를 수 있음. 사용자 확인 필요.
2. **베이사전 활용 한계**: 현재 globalRowRange/Tiers는 containers 데이터 기반. 베이사전(dictBay) 자체에 row/tier 정보가 더 정확하다면 그것으로 계산하는 방법도 가능. 현재는 BayPlan과 동일 동작 보장.
3. **별첨 영역 크기**: 베이가 너무 크면 좌하단 absolute footer와 겹칠 수 있음. max-width 220px로 제한했지만 베이 박스 디자인 따라 조정 필요할 수도.

## 영구 규칙 (메모리)

(이전과 동일)

## 🔜 다음 세션 후보

1. 사용자 실제 인쇄 결과 확인 → 별첨 위치 미세 조정
2. 빈 슬롯 표시 검증 — 검수원 현장 사용성 확인
3. 베이사전(dictBay.bayDef)의 row/tier 정보 직접 사용 (containers 데이터 무관하게)
