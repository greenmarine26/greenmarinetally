# M5.81 인계 — voucher 사이즈 분류 hotfix

## 🐛 발견된 버그 (사용자 제보 + 실제 voucher PDF 분석)

DPRT 2605N voucher에 **40 standard 103대 표시** (실제 평택항 도메인: 40DC는 하루 1~2개).

### 정확한 원인 추적

1. **NSL LIST**의 SZTY 컬럼 = `4HDC` (40HC 의미, 108대 분포)
2. **DJS LIST**의 Type/Size 컬럼 = `D2`/`D5` (DJS 자체 코드)
3. utils.js `deriveIso`가 이 두 양식을 못 잡음 → `iso = ''` (빈 값)
4. workingReport.js `getSizeKey`가 빈 iso 받으면 cn 폴백 → 11번째 숫자 ≥4면 무조건 '40'
5. **NSL 108대 + DJS 35대 = 143대가 잘못 '40 standard'로 분류**

### LIST 분석 vs voucher PDF 비교 (DPRT 2606S 적재 375대)

| 분류 | voucher PDF | 진실 (LIST) | M5.80 차이 |
|---|---|---|---|
| 20 F | 121 | 99 | -22 |
| 20 E | 67 | 5 | -62 |
| **40 F** | **37** | **0** | **+37 잘못** |
| **40 E** | **66** | **0** | **+66 잘못** |
| HC F | 63 | 71 | +8 |
| HC E | 21 | 121 | +100 (HC가 40으로 빠짐) |

## 🔧 M5.81 수정 사항

### 1. utils.js `deriveIso` 보강
- **DJS 비표준 코드 인식**: `D2→22G1`, `D5→45G1`, `D4→42G1`, `R2→22R1`, `R5→45R1`
- **NSL 영문 자연어 인식**: `4HDC/40HC/40HQ→45G1`, `4HRF/40HR→45R1`, `20DC/20GP→22G1`, `20RF→22R1`, `40DC/42GP→42G1` 등
- 특수 화물: `4HFR/40FR→45P1`, `4HOT→45U1`, `20TK→22T1` 등

### 2. utils.js `parseListExcel` fallback 매칭 보강
- `40HC|40HQ|4HDC|45GP|^D5$|^R5$` → `45G1` (40HC)
- `20DC|20GP|^D2$` → `22G1`
- `40DC|40GP|^D4$` → `42G1`

### 3. workingReport.js `getSizeKey` 정확도 향상
- **42xx만 진짜 `'40'`으로 분류** (42GP/42G0/42G1/42RE/42UT 등)
- 그 외 4로 시작은 `'HC'` (평택 도메인 안전 디폴트)
- ISO 없을 때 cn 폴백: `'40'` → `'HC'` (모호하면 HC가 안전)

## ✅ 시뮬레이션 검증 (5개 LIST 합산 375대)

| 분류 | M5.80 (옛) | M5.81 (수정) | 비고 |
|---|---|---|---|
| 40 F | 37 | **0** | 진짜 40DC 0대 ✓ |
| 40 E | 66 | **0** | 진짜 40DC 0대 ✓ |
| HC F | 63 | 71 | +8 |
| HC E | 21 | 121 | +100 (제자리로 돌아감) |

**ISO 빈 채로 남은 컨테이너: 0대** (모든 양식 인식 성공)

### 선사별 분류 결과 (M5.81 적용 후)
- NSL: 20=60, **HC=108** (4HDC 108대 모두 정확)
- DJS: 20=44, **HC=35** (D5 35대 모두 정확)
- HAS: 20=4, HC=35
- HSL: HC=2
- SKR: 20=40, HC=47

## ✅ 빌드 검증 (`assets/index-BajnGwSy.js`)

| 키워드 | 결과 |
|---|---|
| M5.81 버전 | 1회 ✓ |
| `"D5"` → `"45G1"` 매핑 | 정상 포함 |
| `4HDC` 패턴 | 1회 |
| DJS 코드 (D2/D4/D5 등) | 12회 |
| 42xx 정규식 (`^4[02]`) | 1회 |
| cn 폴백 `'HC'` | 2회 |

## 🚨 남은 이슈 — F/E 인식 불완전 (M5.82 후보)

이번 hotfix는 **사이즈** 분류는 완전 해결. 그러나 **F/E** 인식은 일부 미흡:

- DJS LIST에 F/E 컬럼 없음 (Cargo Weight = 0이면 Empty 추정 가능)
- NSL LIST의 일부 행에서 F/E 누락

별도 M5.82에서 처리:
- LIST의 Cargo Weight·Package 0 → Empty 추정
- DJS 양식 cargoType `F`/`P` → `F`/`E` 매핑 강화

## 사용자 작업 (배포)

1. ZIP 풀기
2. `m581_build/` 폴더를 GitHub repo에 push
3. Actions 자동 배포 → 1~3분 후 사이트 갱신
4. **검증 방법**: DPRT 2606S 항차 다시 처리 후 voucher 출력
   - 40 standard 컬럼이 **0~2대** 사이여야 정상 (이전: 103대)
   - HC 컬럼에 정확히 192대 표시되어야 정상

## 빌드 정보
- 1648 modules transformed ✓
- 산출물: `assets/index-BajnGwSy.js` (1.49 MB)
