# M3.91 빌드 변경 사항 (평택 필터 fix - 진짜 베이 누락 root cause 해결)

## 핵심 fix
**MixerUploadModal.jsx 라인 274-296** 평택 필터 버그 수정.

### 이전 버그
```js
if (isDischarge) dischargeData.edi[c.cn] = ...;
if (isLoading) loadingData.edi[c.cn] = ...;
// → POD/POL 둘 다 평택이 아닌 transit 컨이 양쪽에서 누락됨
// → 베이 골격 일부 사라짐 (베이 누락의 진짜 원인)
```

### M3.91 fix
```js
let containerMode;
if (isDischarge) containerMode = 'discharge';
else if (isLoading) containerMode = 'loading';
else containerMode = 'transit';  // 평택 무관 화물도 저장

const tagged = { ...c, _mode: containerMode };
dischargeData.edi[c.cn] = tagged;  // 모든 컨이 양쪽에 저장
loadingData.edi[c.cn] = tagged;
// → Firebase에 모든 EDI 컨테이너 저장
// → 베이 골격 완성
// → _mode 태그로 다운스트림 분리
```

## 다운스트림 변경 (transit 처리)

### 통계 카운트 (MixerUploadModal.jsx)
```js
dischargeContainers: _mode='discharge' 만 카운트
loadingContainers:   _mode='loading' 만 카운트
transitContainers:   _mode='transit' 분리 카운트 (신규)
```

### UI 배지 (BigResultCard.jsx, SearchPanel.jsx)
```
양하 (파랑)  - 평택 양하 (POD=KRPTK)
선적 (주황)  - 평택 선적 (POL=KRPTK)
중계 (회색)  - 평택 무관 화물 (베이 골격용)  ← 신규
```

## 변경 파일
- `src/components/MixerUploadModal.jsx` (+18줄 / -5줄)
- `src/components/BigResultCard.jsx` (+5줄 / -3줄)
- `src/components/SearchPanel.jsx` (+5줄 / -3줄)

## 누적 적용 (M3.90 + M3.91)
- M3.90: 베이사전 통합 (.def 데이터 11척 임베드)
- M3.91: 평택 필터 fix (transit 컨 보존)

## 동작 원리

### Before (M3.89.1)
```
EDI 100대 (평택 양하 30, 평택 선적 20, 통과 50)
    ↓
평택 필터 → 50대 만 Firebase에 저장
    ↓
통과 50대 = 사라짐 → 그 베이들 골격 누락
```

### After (M3.91)
```
EDI 100대 (평택 양하 30, 평택 선적 20, 통과 50)
    ↓
모두 Firebase에 저장 (_mode 태그로 구분)
    ↓
양하 페이지: discharge 30대 검수
선적 페이지: loading 20대 검수
베이플랜:    100대 모두 표시 (베이 골격 완성)
검수 카드:   transit 50대는 '중계' 배지 (검수 대상 아님)
```

## 영향 범위 검증

### ✅ 영향 없음
- 검수 진행률 계산 (discharge/loading만 카운트)
- 양하/선적 통계
- Excel 보고서 (mode별 분리)

### ⚠️ 영향 있음 (긍정적)
- 베이 골격: 누락 사라짐
- 베이플랜: transit 컨 회색 표시
- 검색 결과: transit 컨도 검색됨 (배지로 구분)

### 🔍 추가 검증 필요
- nlSearch 양하/선적 카운트 (transit 추가 표시 검토)
- 베이 통계 (총 컨 수에 transit 포함 여부)

## 다음 작업 (M3.92+)

1. BayPlan에서 transit 컨 시각화 (회색 슬롯)
2. 베이사전 검증 (이번 항차 EDI로 매핑 검증)
3. nlSearch에 transit 카운트 추가
4. transit 컨 통계 위젯 (사무실용)
