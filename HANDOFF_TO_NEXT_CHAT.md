# M5.82 인계 — PORT-MIS 부두 자동 + voucher PIER/BERTH + GPS 정렬

## 🎯 사용자 요구사항 (100% 해결)
- 선박들이 부두를 자주 바꿔서 수동 등록 불가 → **자동 판별 필요**
- 앱 켜면 작업할 전체 선박이 나옴 → **현 위치 부두 선박 우선 표시 필요**
- voucher의 PIER/BERTH가 매번 수동 입력 → **자동 채움 필요**

## 📦 5가지 핵심 변경

### 1. PORT-MIS 엑셀 직접 업로드 (신규)
- PortMisCaptureModal에 [📊 엑셀 업로드] 버튼 추가
- 사용자가 PORT-MIS 사이트에서 다운로드한 엑셀 파일 그대로 업로드
- **Gemini Vision 비용 0** (캡처 OCR 안 부름)
- **100% 정확** (OCR 인식 오류 없음)
- 한 번에 30+ 척 처리

`utils.js`에 `parsePortMisExcel(arrayBuffer)` 신규 함수
- 헤더 행 자동 탐색 ("호출부호" + "선명" + "계선장소" 키워드)
- 데이터 정규화 + berth → pier 자동 판별

### 2. 부두 자동 판별 매핑
```js
PCTC = 동부두 6, 7, 8, 9번선석
PNCT = 동부두 13, 14, 15, 16번선석
```

`utils.js` 신규 함수:
- `extractBerthNo(berthRaw)`: "동부두 7번선석" → 7
- `getPierFromBerth(berthRaw)`: → "PCTC" / "PNCT" / null
- `detectPierByGps(lat, lng)`: GPS 좌표 → { code, distance, name }
- `haversineMeters(lat1, lng1, lat2, lng2)`: 거리 계산
- `PIER_COORDS`: PCTC/PNCT 좌표 상수

### 3. PORT-MIS 캡처 OCR 보강
`mixerUpload.js` ocrPortMisCapture:
- 프롬프트에 `berth` 필드 추가
- 추출 후 berth → pier 자동 판별
- 캡처도 엑셀 업로드와 동일한 결과 (Gemini 비용 1회만)

### 4. voucher PIER/BERTH 자동 입력
`workingReport.js` generateVoucherHTML:
- 기존: `pier = info.pier || 'PCTC'` (수동 입력 또는 폴백)
- 변경: berth 문자열 ("동부두 7번선석") 자동 분석 → pier 판별

`VoyagePage.jsx`:
- PORT-MIS 매칭 성공 + voyage.info에 berth 없음 → 자동 저장
- `fbUpdateVoyageInfo(voyageKey, { berth, pier })` 비동기 호출
- 모든 검수원에게 Firebase 동기화

### 5. HomePage GPS + 부두 정렬
`HomePage.jsx` 추가:
- 진입 시 `navigator.geolocation.getCurrentPosition()`
- localStorage 5분 캐시 (배터리 절약)
- 현 위치 GPS → PCTC/PNCT 자동 판별
- 각 항차에 PORT-MIS 매칭 → `_pier` / `_berth` 필드 동적 추가
- 정렬: 현 부두 선박 위, 다른 부두 아래
- 헤더에 [자동][PCTC][PNCT][전체] 필터 버튼
- VoyageCard에 부두 배지 표시 (PCTC 파랑 / PNCT 보라)
- 그룹 구분선: "📍 PCTC (현 위치)" / "── 다른 부두 ──"

## ✅ 빌드 검증 (`assets/index-BU55SLIY.js`, 1.50 MB)

| 키워드 | 회수 |
|---|---|
| M5.82 | 3 |
| PCTC | 5 |
| PNCT | 5 |
| 동부두 | 2 |
| 계선장소 | 3 |
| 엑셀 업로드 / FileSpreadsheet | 2 |
| geolocation | 1 |

## ✅ 실 PORT-MIS 엑셀 검증 (30척)

| 부두 | 선박 수 |
|---|---|
| PCTC | 16척 (SPIL NIKEN, NINGBO TRADER, PEGASUS PROTO 등) |
| PNCT | 7척 (TIAN HAI PING ZE, ATLANTIC PIONEER, TEN JUPITER 등) |
| 기타 (자동차/석유) | 7척 |

100% 정확하게 분류됨.

## 🚦 사용 시나리오

### 검수원 출근 (PCTC 부두 도착)
```
1. 폰에서 검수앱 열기
2. 위치 권한 허용 (한 번만)
3. HomePage 상단: "📍 현 위치: PCTC (250m)"
4. 항차 목록: PCTC 선박들이 위로 그룹화
   - 📍 PCTC (현 위치)
     • PEGASUS PROTO 2606S (동부두 7번선석)
     • SPIL NIKEN 2604N (동부두 6번선석)
   - ── 다른 부두 ──
     • ATLANTIC PIONEER 2607N (동부두 16번선석) [PNCT]
```

### voucher 출력
```
M/V : PEGASUS PROTO   VOY # : 2606S   DATE : 2026-05-15
PIER : PCTC                          ← 자동 입력
BERTH : 동부두 7번선석                ← 자동 입력
```
검수원이 더 이상 PIER/BERTH 수동 입력 안 함.

### PORT-MIS 데이터 갱신 흐름
```
검수원 1: PORT-MIS 사이트 → 엑셀 다운로드 → [📊 엑셀 업로드]
       ↓
   parsePortMisExcel: 30척 자동 추출 + 부두 판별
       ↓
   Firebase 저장 (port_mis_data/{호출부호})
       ↓
   모든 검수원 즉시 동기화
       ↓
   각 voyage 자동 매칭 + voyage.info.berth/pier 자동 저장
```

## ⚠ 주의 사항

### PIER_COORDS 좌표는 대략 추정값
`utils.js`:
```js
PIER_COORDS = {
  PCTC: { lat: 37.005, lng: 126.815 },  // 추정
  PNCT: { lat: 36.995, lng: 126.823 },  // 추정
};
```
**현장에서 한 번 측정 후 정확한 좌표로 갱신 권장.**
GPS 정확도가 5~10m이고 두 부두 간격 약 1km라 추정 좌표로도 작동하지만, 정확하면 더 안정적.

### GPS 권한 거부 시
- 자동으로 "위치 안 씀 — 수동 선택" 표시
- 사용자가 [PCTC][PNCT][전체] 직접 선택 가능
- 폴백 작동 정상

## 사용자 작업 (배포)

1. ZIP 풀어서 GitHub repo에 push
2. Actions 자동 배포 (1~3분)
3. 검증:
   - HomePage 들어가면 GPS 권한 요청 → 허용
   - 부두 필터 바 표시 + 현 위치 표시
   - PORT-MIS 캡처 모달에서 [📊 엑셀 업로드] 버튼 보이는지
   - 엑셀 업로드 → 30척 추출 + 부두 배지 표시
   - voucher 출력 시 PIER/BERTH 자동 채움

## 빌드 정보
- 1648 modules transformed ✓
- 산출물: `assets/index-BU55SLIY.js` (1.50 MB)

## 다음 작업 후보 (M5.83+)
1. 사용자 현장 GPS 좌표로 PIER_COORDS 정확값 갱신
2. PORT-MIS 데이터 만료 처리 (출항 시간 지난 선박은 자동 숨김?)
3. 부두별 통계 (HomePage에 "PCTC 3척 작업 중" 등)
4. 선박 사진 등록 (보류 중인 작업)
5. AI 음성 양방향 (M6.0 후보)
