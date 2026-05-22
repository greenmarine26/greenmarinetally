# Tallyman Master M6.86.5 — HANDOFF

**Date**: 2026-05-22
**Previous**: M6.86.4
**Build**: `vite v6.4.2` · 성공 · `dist/assets/index-ZQ_yjlE8.js` (2,447 kB / gzip 434 kB)

---

## 🎯 사용자 보고

> "앱 출력물이 샘플과 같다고 하셨나요?" → KKLC2604S.pdf + KKLC.def 직접 첨부

**핵심 정정**: 이전 메모리 "표준 6 deck + 4 hold baseline. 실제 없는 자리는 invisible"이 잘못된 메모리였음.
샘플 PDF 검증 결과 진짜 약속은:
1. **각 베이는 베이사전(.def) / EDI 실 hull 구조 그대로** — baseline 강제 X, 가짜 셀 X
2. **단독 베이 hold 없으면 hold 영역 자체 없음** (BAY 33-39 등)
3. **A4 한 장 fit** — 별첨 별도 페이지 X
4. **마크는 모드별**: 선적=POD 첫 글자 셀 표기, 양하=선사 색만 셀에 + 별첨에 선사 3자리

---

## 🔧 수정 내역 (M6.86.5)

### [1] STD_DECK/STD_HOLD baseline 강제 제거 + 페이지 union 제거

**파일**: `src/components/PrintableCargoPlan.jsx` BayBox (약 447행)

```js
// 이전 (M6.86.4): allTiersSet에 STD_DECK/STD_HOLD 강제 + pageBayDictTiers/globalTiers union
// M6.86.5: 베이별 dictBay.deckTiersLocal/holdTiersLocal만 사용 + 페어(짝수+홀수) union + EDI 실 컨 추가
const localDeckTiers = new Set();
const localHoldTiers = new Set();
[dictBayEven, dictBayOdd, dictBay].forEach(db => {
  if (!db) return;
  (db.deckTiersLocal || []).forEach(t => localDeckTiers.add(...));
  (db.holdTiersLocal || []).forEach(t => localHoldTiers.add(...));
});
// 베이사전 + EDI 실 tier — 페이지 union 제거 (베이마다 독립)
```

**효과**: BAY 33-39처럼 hold 없는 베이는 hold 영역 자체 안 그려짐. BAY 37-39처럼 deck tier 94 있고 82 없는 베이도 정확히 표시.

### [2] area-invisible 클래스 복원 + 페어 dictBay 체크

**파일**: 같은 파일, 약 540, 605, 635행

```jsx
// hasHold: 페어인 경우 even/odd entry 둘 다 체크
const hasHold = anyDictBay
  ? (dictHasHold(dictBayEven) || dictHasHold(dictBayOdd) || dictHasHold(dictBay))
  : hasHoldCont;
// hold-area에 area-invisible 클래스 (M6.86.4에서 제거했던 것 복원)
<div className={`hold-area ${!hasHold ? 'area-invisible' : ''}`}>
```

### [3] 별첨 페이지(appendix-page) 통째 삭제 — A4 한 장 유지

**파일**: 같은 파일, 약 1312~1412 (102줄 JSX 삭제) + 약 1825~1885 (CSS 통째 삭제)

선사/POD 통계는 좌측 하단 mini-legend(`.bay-stats-inline`)에 통합.

### [4] getMark — 모드별 분기 전면 재작성

**파일**: 같은 파일, 약 240행

```js
// 특수화물 우선순위 (양 모드 공통): DG > Reefer > FR > Tank > OT > 엠티
// 그 외 일반 컨:
//   - mode === 'loading': letter = POD 첫 글자, podFirst = 색상 키
//   - mode === 'discharge': letter = '' (빈 공백), opCode = c.op (선사 색상 키)
return { letter, type, isXray, pod3, podFirst, opCode };
```

### [5] 셀 렌더 모드별 — renderCell 재작성

```jsx
// 특수화물: mark-R/D/F/T/A/E 자체 색
// 선적 일반: <span className="cell mark-pod" style={{color, fontWeight:700}}>K</span>
// 양하 일반: <span className="cell mark-op" style={{background: '#3b82f633', borderColor:'#3b82f6'}}>&nbsp;</span>
```

### [6] mini-legend 모드별 + 자동 축소 (carrier-mid/small/tiny)

- 선적: POD 첫 글자(색) + POD 3자 + 풀명 + 20/40/45
- 양하: op-swatch(색박스) + 선사 3자리 + 20/40/45
- 동적 클래스:
  - 6 선사 이하: 기본
  - 7~10: `carrier-mid` (폰트 7→6.8pt)
  - 11~16: `carrier-small` (풀명 숨김, 6pt)
  - 17+: `carrier-tiny` (사이즈 상세도 숨김, 5.2pt)

A4 한 장 유지를 위해 별첨이 1페이지 안에 자동 축소.

### [7] KKLC 베이사전 v2 통째 교체

**파일**: `src/data/shipBayDict_v2.js` 19행 (KKLC entry)

| 항목 | 기존 (M6.71 PDF 자동 파서) | M6.86.5 (.def + PDF 검증) |
|---|---|---|
| 베이 수 | 22 (BAY 00 포함, 일부 누락) | **30** (BAY 01-39 모두) |
| BAY 00 | hasHold:true, isStandalone:false | **제거** (실제 없음) |
| BAY 33-35 | hasHold:**true**, hold:[8,6,4]/[8,6] | **hasHold:false**, hold:[] |
| BAY 37-39 | hasHold:**true**, hold:[2], deck:[94,92,90,88,86,84] | **hasHold:false**, hold:[], deck:[94,92,90,88,86,84] |
| 콜사인/IMO | 없음 | **D5MP9** / **9772230** |
| grade | auto-box-region | **user-def-verified** |

### 버전 + HelpModal

- `src/utils.js`: `APP_VERSION = 'M6.86.5'`
- `src/components/HelpModal.jsx`: M6.86.5 tips 최상단 항목 추가

---

## ✅ 검증 체크리스트 (KKLC2605S 양하 + KKLC2604S 선적)

**구조**:
- [ ] BAY 33-39 hold 영역 자체 안 보임 (단독 박스 키도 짧음)
- [ ] BAY 37/(38)39 deck에 tier 94 보이고 82 안 보임
- [ ] BAY 21~31 deck/hold 정상 (tier 92~82 + 10~02)
- [ ] BAY 01~03 작은 베이 정상
- [ ] A4 한 장 안에 모두 들어감 (별첨 별도 페이지 없음)

**마크 (선적 KKLC2604S 양식)**:
- [ ] 셀에 K/P/S/M 글자 + 색 표시
- [ ] 좌측 하단 mini-legend에 "K KAN 40/15/0", "P PUS 0/8/0" 등
- [ ] 특수화물 R/D/F/T/A/E는 글자+자체색 그대로

**마크 (양하 KKLC2605S)**:
- [ ] 셀에 글자 없음, 배경색만 (선사별)
- [ ] 좌측 하단에 색박스 + 선사 3자리 + 카운트
- [ ] 선사 많으면 자동 축소 (10+ → mid, 16+ → small, 17+ → tiny)
- [ ] 특수화물은 글자+자체색 그대로

**다른 선박 동작 (회귀 방지)**:
- [ ] STSE, TNJP, RZOR, ATRP 카고플랜 정상 (각자 베이사전 deckTiersLocal/holdTiersLocal 그대로 사용)
- [ ] PCBJ, DJCF 등 PDF 자동 파서 등록 선박도 정상

---

## 📁 변경 파일

```
src/components/PrintableCargoPlan.jsx  (전면 - getMark, BayBox, statsBox, CSS)
src/utils.js                            (APP_VERSION M6.86.4 → M6.86.5)
src/components/HelpModal.jsx           (M6.86.5 tips 추가)
src/data/shipBayDict_v2.js             (KKLC entry .def+PDF 검증판 교체)
```

다른 파일 무변경.

---

## 🚀 배포 방법

ZIP 풀면 `tallyman_m6865/` 한 디렉토리에 **소스 + 빌드 산출물(dist) + build.sh + HANDOFF** 모두 들어있습니다.

### A. 빌드 산출물 즉시 배포
`tallyman_m6865/dist/` 디렉토리를 정적 호스팅(Firebase Hosting 등)에 통째로 업로드.

### B. 소스 수정 후 재빌드
`tallyman_m6865/` 안에서 `bash build.sh` → 새 `dist/` 생성.

---

## 📝 다음 세션 작업 후보

1. **KKLC 양하 EDI 실데이터 검증** — 선사 c.op 필드 분포 확인. 누락된 선사 NAD+CA 파싱 보강.
2. **다른 PDF 자동 파서 등록 선박 점검** — BAY hold false 가짜 베이 있는지 (예: ATPR, DPRT, GUBR 등에 hold-region scan 미스가 있을 수 있음).
3. **선사 풀명 매핑 추가** — opCode 3자(MSC, CMA, HJM 등)별 풀명 매핑 (현재는 코드만 표시).
4. **새 .def 업로드 UI** — 사용자 첨부한 .def 파일을 앱 내에서 직접 베이사전 v2에 등록(현재는 빌드 시점에 수동 정정).
5. **A4 fit 자동 폰트 추가 축소** — 베이 수 35+ 선박 (예: HAMB, MCAT 34 베이)에서 카고플랜이 한 장 안 들어가면 셀 12×9 → 10×8로 축소 옵션.
