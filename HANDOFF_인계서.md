# 평택항 검수 & Tallyman Master 통합 지침서

**최종 업데이트**: 2026-06-04
**작성자**: 성일 (평택항 검수 / Tallyman Master 개발)
**현재 버전**: V7.08 (검수앱) / cone.html (콘앱)

---

## 1. 검수 업무 (본업)

### 1.1 정체성
- **위치**: 대한민국 경기도 평택시 (평택항)
- **역할**: 화물 검수 및 선박 양하 작업 관리
- **언어**: 한국어

### 1.2 자료 분석 원칙
- 제출된 자료(메인플랜·베이플랜·양하 리스트·XRAY 리스트 등)를 **빠짐없이** 분석할 것
- **추론이 아닌 실제 데이터**만을 기준으로 답변할 것
- ⚠️ **가정 금지**: "이렇겠지" 추측으로 작업하지 말 것. 실데이터 직접 확인.

### 1.3 응답 워크플로
| 질문 유형 | 응답 형식 |
|----------|----------|
| 컨테이너 끝자리 4자리만 호출 | 실번호(Seal No) + X-RAY 대상 여부 + 선내 위치 |
| 컨테이너 개수 (예: "20피트 몇 대?") | 규격별(20ft/40ft) × 상태별(Full/Empty) 상세 산출 |
| 특수화물 리스트 | **베이플랜 기본**, 리퍼(온도 포함)·FR·O/T·DG 등 포함 |

### 1.4 보고 형식 선호
- 명확하고 간결하며 스캐닝이 용이한 형식
- 실제 데이터 기반의 정밀한 수치 보고

---

## 2. Tallyman Master 앱

### 2.1 현재 상태
- **앱 이름**: Tallyman Master (greenmarinetally)
- **현재 버전**: M6.91.0
- **GitHub**: greenmarine26/greenmarinetally
- **Firebase**: greenmarinetally (asia-southeast1, Spark 플랜)
- **작업 디렉토리**: `/home/claude/v2work/`

### 2.2 검증 원칙 (절대 원칙)
- **검증되지 않은 앱은 절대 ZIP으로 주지 않는다.**
- 빌드 성공·단위 테스트 통과는 검증이 아님
- 실제 데이터로 흐름을 끝까지 돌려서 문제 없을 때만 = 검증 OK
- 여러 번 테스트 통과 후에만 ZIP 제공

### 2.3 빌드 전 체크리스트
1. `APP_VERSION` 갱신
2. `HelpModal` 사용법 항목 추가 (앱 초보자 교육용)
3. `HANDOFF.md` 갱신

> **HelpModal 규칙**: 새 기능·변경사항 추가 시 반드시 도움말에 사용법 등록할 것.

### 2.4 버전 표기 규칙
- 큰 변화·기능 추가 = 마이너 버전업 (예: M6.86 → M6.90)
- 작은 수정·hotfix = 서브 버전 (예: M6.90.0 → M6.90.1 → M6.90.2)
- 같은 버전 누적 시 업데이트 확인 어려움 → **모든 변경마다 버전 올림**

### 2.5 ZIP 배포 메커니즘 (M6.86.7.2 이후)
- 누적본 ZIP을 repo 루트에 통째로 덮어쓰기 → commit & push
- Pages가 main 루트 index.html을 직접 서빙
- **루트 index.html은 빌드본 그대로** (`./assets/index-XXX.js` 참조)
- 소스형 index.html 두면 vite 6.4.2가 에러로 죽음 → 빌드 시 임시 소스형, 빌드 후 빌드본 복사

---

## 3. 컨선 베이 구조 도메인 지식

### 3.1 짝수 단독 베이 (정상 구조)
짝수 단독 베이는 다음 4곳에서 **정상**:
1. BOW (선수)
2. STERN (선미)
3. 선원건물(superstructure) 앞
4. 선원건물 뒤 (홀드 없는 단독 베이)

- 양옆 홀수가 모두 없는 경우만이 아니라 **한쪽 홀수만 있어도** 정상일 수 있음
- 짝수 단독을 비정상으로 일반화하면 안 됨

### 3.2 베이별 자체 row 구조 (M6.91.0 정정 — 핵심)
**선박 전체 단일 row max 가정 금지**. 베이마다 자체 구조:

| 베이 종류 예 | row count | has_zero | 라벨 |
|------------|-----------|----------|------|
| DJCT BAY 01 | 7 | true | `06,04,02,00,01,03,05` |
| DJCT BAY 03 | 9 | true | `08,06,04,02,00,01,03,05,07` |
| DJCT BAY 07 | 10 | false | `10,08,06,04,02,01,03,05,07,09` |
| SWAT BAY 17 | 11 | true | `10,08,06,04,02,00,01,03,05,07,09` |

- 같은 선박 내에서도 베이/section마다 row 구조 다름
- **deck tiers / hold tiers도 베이별로 다름** (예: DJCT BAY 27 = deck only, hold 없음)
- 단일 `rowMaxOdd/rowMaxEven`은 통일 데이터로 부정확

### 3.3 베이사전 등록 현황
- **v2 verified**: 36척 (옵션 C — PDF에서 추출)
- **v5 매트릭스**: 300척 (Define.zip)
- ⚠️ **v2 + v5 모두 베이별 row 라벨 정보 누락**. 베이마다 다른 row 구조를 사전이 표현 못 함.

### 3.4 PDF override 사전 (M6.91.0 신설)
- **`src/data/shipBayDict_pdf_override.js`**: PDF STOWAGE INSTRUCTION에서 베이별 직접 추출
- 베이별 4가지 필드: `rowCount`, `hasZero`, `deckTiers`, `holdTiers`
- 현재 등록: **DJCT (15 베이), SWAT (19 베이)**
- 다른 선박은 베이사전 fallback (정확도 낮음)

### 3.5 ISO 6346 컨테이너 사이즈 표준 (M6.90.1 정정)
- ISO 코드 첫 자가 사이즈:
  - `2` = 20ft (22G1, 22R1 등)
  - `4` = 40ft (42G1, **45R1 = 40ft hi-cube reefer**, 45G1 등)
  - `L`/`9` = 45ft (L5G1 등)
- 두 번째 자 = 높이 (2=8'6", 5=9'6" hi-cube)
- ⚠️ **45R1을 45ft로 분류하면 안 됨**. 45R1은 40ft.

---

## 4. 카고플랜 V2 약속 (M6.91.0 정정)

### 4.1 베이 구조
- 각 베이는 **PDF STOWAGE INSTRUCTION의 정답 그대로**
- 베이마다 자체 deck/hold tier + row 구조
- 단독 베이 hold 없으면 hold 영역 자체 없음
- **A4 한 장 안에 모두** 들어가야 함
- 좌측 하단 mini-legend

### 4.2 마크 약속 (M6.90.3 정정)

#### 양하 카고플랜
- PTK 양하분 = **컬러 배경** (선사별)
- 통과화물 = **회색 배경, 글자 X 없음**
- 빈 슬롯 (hull 안쪽) = border만
- **사용 못하는 셀 (hull 단면 바깥)** = visibility:hidden (안 보임)
- **X = 짝수 40/45ft shadow 전용** (절대 통과화물 표시로 쓰지 말 것)
- **짝수 20ft shadow = 회색 빈 셀** (글자 없음, 자리 차지)

| 분류 | 표시 방식 |
|------|----------|
| (a) PTK 일반 | 선사별 컬러 배경 + `o` |
| (b) PTK 특수 (R/D/F/T/A/E) | 글자 + 컬러 배경 |
| (c) 통과 일반 | **회색 배경, 글자 없음** |
| (d) 통과 특수 | 글자 + 회색 배경 |
| (e) 빈 슬롯 (hull 안쪽) | border만 |
| (f) 짝수 40/45ft shadow | X (흰 배경) |
| (g) 짝수 20ft shadow | 회색 빈 셀 (자리 차지) |
| (h) Hull 바깥 사용 못하는 셀 | 안 보임 |

#### 선적 카고플랜
- 셀에 POD 첫 글자 표기: K=KAN, P=PUS, S=SGN, M=MIP
- 평택분 = 컬러 배경 (POD별)
- 평택 외 = 회색 또는 빈

#### Legend (좌측 하단)
- 양하 별첨1: 선사별 카운트 (선사 컬러 박스 + 20'/40'/45' + 합계)
- 양하 별첨2: 화물 종류별 카운트 (자체 컬러: o/R/D/F/T/A)
- 선적 별첨1: POD별 카운트 (POD 컬러 박스 + 20'/40'/45')
- 선적 별첨2: 선사별 카운트 (흑백)

### 4.3 컬러 시스템
- 양하 모드: 선사(c.op)별 자동 컬러 (10색 팔레트)
- 선적 모드: POD 3자(KAN/PUS/SGN 등)별 자동 컬러
- ⚠️ **c.cn 첫 3자 BIC 코드는 선사 아님**. 절대 사용 X.

### 4.4 Hold 중앙 정렬 (M6.86.8.20)
- Deck/Hold 폭이 다를 때 hold를 박스 안 horizontal center
- CSS: `width: (nHoldCols/nDeckCols)*100% + marginLeft/Right: auto`
- 1칸 차이 → 좌우 0.5칸씩 자동 분배

### 4.5 Layout 공식 (사용자 확정)
- N개 박스 → 상단 = `⌈(N+1)/2⌉`, 하단 = `N - 상단`
- 별첨 자리 = 상단 - 하단
  - 별첨 2자리: 별첨1 + 별첨2 분리
  - 별첨 1자리: 한 박스에 좌우 분할 통합

### 4.6 카운트 포맷
- 단독 베이 = 총합 단일 숫자
- 페어 박스 = `20' / 40' / 45'` 슬래시 구분
- 양하 별첨/카운트 = 평택분(c.pod includes 'PTK')만

### 4.7 인쇄 처리 (M6.86.8.21)
- **height 195mm 고정** (A4 landscape - margin 6mm × 2)
- `page-break-inside: avoid !important` + `break-inside: avoid` → 한 페이지 강제
- `body > *:not(.cpv2-overlay) { display: none }` + `html, body { background: white }`
- V2 컴포넌트는 `createPortal(document.body)`로 body 직접 자식 마운트
- 검수앱 본체 인쇄에 X

---

## 5. 데이터 검증 원칙 (M6.91.0 신설)

### 5.1 데이터 출처 우선순위
1. **PDF override** (가장 정확, 베이별 직접 입력) — DJCT/SWAT만 현재
2. **v2 베이사전 baysSummary** (베이별 hasDeck/hasHold/isStandalone)
3. **v5_matrix.matrixBays** (베이별 cells/maxRow — ⚠️ PDF와 불일치 가능)
4. **EDI 실데이터** (rows, tiers — fallback)

### 5.2 v5_matrix.cells 주의사항
- 순서: **아래→위** (deck 가장 아래 tier가 맨 뒤)
- 컴포넌트 사용 시 **reverse() 필수**
- v5 cells max가 PDF와 일치 안 할 수 있음 (DXQD 등 부정확 사례)

### 5.3 EDI 실데이터로 검증
- `has_zero` = EDI rows 집합에 0 있는지로 직접 결정
- 베이별 max row, deck/hold tier 분포 추출 가능
- **추측 금지**: rowMaxOdd=7을 "7개 row"로 해석하지 말 것. 실데이터 봐야.

---

## 6. 최근 작업 이력

### 6.1 M6.91.0 (2026-05-23) — PDF Override 시스템
- **`shipBayDict_pdf_override.js`** 신설 (DJCT 15 + SWAT 19 베이 정답)
- `computeBayRenderData`가 `shipCode` 받아 override 우선 사용
- 베이별 정확한 row 라벨 + deck/hold tier 적용

### 6.2 M6.90.x — Deck/Hold 분리 + Hull 단면
- M6.90.0: deck/hold 별도 row max
- M6.90.1: ISO 6346 사이즈 fix (45R = 40ft)
- M6.90.2: v5 cells reverse 복원 (아래→위 순서)
- M6.90.3: hull 단면 안쪽만 active (사용 못하는 셀 안 보임)

### 6.3 M6.86.8.x — 카고플랜 V2 정착
- 컬러 시스템 (양하/선적 mode별)
- 통과화물 회색 처리 (X 폐기)
- Hold 0.5칸 좌우 center 정렬
- 인쇄 height 195mm 고정 + page-break avoid
- Shadow X 40/45ft만, 20ft는 회색 빈 셀

### 6.4 미해결 작업
1. 다른 선박 (DXQD, DJCF 등) PDF override 추가
2. v5_matrix 사전 자동 추출 파서 개선 (옵션 C 완전 구현)
3. Hull 단면 cells 정보를 PDF override에 추가 (현재 hull 가득)
4. 페어 박스 셀 충돌 처리 (짝수 20ft + 홀수 20ft 같은 슬롯)
5. HelpModal 사용법 등록 (M6.91.0)
6. HANDOFF.md 갱신

---

## 부록 A. 2026-05-23 작업 과정 상세 (디버깅 일지)

이 작업이 길어진 핵심 원인은 **데이터 구조를 추측으로 짠 것**. 실데이터 보지 않고 알고리즘 작성 → 사용자가 매번 정답을 짚어줘야 진단 가능. 교훈:

> "있는 데이터를 안 보고 이렇겠지 하고 만드는 거하고는 많이 틀리죠"

### 단계별 진단 과정

| 단계 | 사용자 짚음 | 진단 결과 |
|------|-----------|----------|
| 1 | "통과화물 X 표시 안 함" | shadow X와 혼동되니 회색 배경만 |
| 2 | "인쇄 시 앱 화면 나옴" | createPortal + @media print 추가 |
| 3 | "검정 바탕만 나옴" | body bg dark → body bg white 강제 |
| 4 | "데크/홀드 좌우대칭 안 맞음" | M6.81 정답 알고리즘 정확 포팅 |
| 5 | "홀드가 데크 중심 정렬 안 됨" | hold 자체 폭 + CSS center (0.5칸씩) |
| 6 | "홀수베이 데크에 빈 곳 많음" | shadow X 40/45ft만 (20ft 제외) |
| 7 | "20ft 양쪽 충돌 케이스" | 20ft 짝수 shadow = 회색 빈 셀 |
| 8 | "데크 1칸 많으면 0.5씩" | nHoldCols/nDeckCols 비율 CSS center |
| 9 | "분석 그만, 베이사전 보세요" | v2 사전 직접 조회 |
| 10 | "00 있는지 없는지" | EDI 실데이터로 has_zero 검증 |
| 11 | "DXQD 홀드 7칸, 08 없는 거" | rowMaxOdd vs rowMaxEven 분리 |
| 12 | "데크 08도 사라짐" | cells reverse 복원 (M6.86.8.22 잘못 제거) |
| 13 | "45R = 45ft 잘못" | ISO 6346 첫 자만 사이즈 |
| 14 | "사용 못하는 셀 안 보임" | hull 안쪽만 active, 바깥 invisible |
| 15 | "베이사전이 잘못 만들어진 거" | v2 사전에 베이별 row 정보 누락 확인 |
| 16 | PDF 두 개 첨부 + "A" 선택 | PDF override 사전 신설 (M6.91.0) |

### 잘못된 가정 — 모음

1. **단일 rowMaxOdd/rowMaxEven으로 통일 가능** → 베이마다 다름
2. **rowMaxOdd=7 = "7개 row"** → "가장 큰 row 번호"의 의미일 수 있음, EDI로 검증
3. **has_zero = rowMax % 2 === 1** → EDI에 row 0 있는지로 직접 결정
4. **v5_matrix.cells 신뢰** → DXQD 등은 PDF와 불일치
5. **v5_matrix.cells 위→아래 순서** → 사실 아래→위 (reverse 필요)
6. **45R = 45ft** → 40ft hi-cube reefer
7. **hull 바깥에 mark 있으면 강제 active** → hull 단면 모양 깨짐
8. **deck/hold 같은 row 라벨 공유** → 베이마다 deck 8/hold 7 같은 차이
9. **인쇄 visibility hidden** → 자리 차지로 페이지 끝에 밀림 (display:none + bg white가 맞음)
10. **cells 개수 추측** → 사용자: "갯수 보지 말고 실제 row 번호를 봐라"

### 데이터 출처 발견 경위
- `/mnt/user-data/uploads/DXQD_2620W_EDI_RE.EDI` → has_zero=false, 베이별 row 분포 확정
- `/mnt/user-data/uploads/DJCT__DJCT0186LOAD_PLAN.pdf` → DJCT 정답 row 라벨 추출
- `/mnt/user-data/uploads/SWAT2524S.pdf` → SWAT 정답 row 라벨 추출
- `/home/claude/m681/stse_v5.json` → STSE 사용자 정답 (참고용)
- `/home/claude/m681/build_cargo_plan_universal.py` → `get_active_cols_symmetric` 정확 알고리즘 발견
- `/home/claude/ref.html` → STSE 모든 박스 row 10개 동일 라벨 확인

### 핵심 교훈
1. **알고리즘 작성 전 데이터 구조 직접 확인** (v5 매트릭스, v2 사전, EDI 모두)
2. **단일 값 가정 금지** (베이마다 다를 수 있음)
3. **변수명 명확히** (rowMax vs rowCount, has_zero 의미)
4. **사용자 짚어준 정답을 무시하고 추측 계속 X**
5. **검증 단계 추가**: 빌드 전 실데이터 (PDF/EDI)로 결과 검증

---

## 7. V7 인계 (2026-06-04) — 좌표 기반 베이플랜 + 콘앱

> **다음 클로드가 가장 먼저 읽을 것.** 이번 세션에서 같은 착오를 여러 번 반복했음. 아래를 지키면 시행착오 없이 이어받을 수 있음.

### 7.1 현재 버전 / 파일
- **검수앱**: V7.08. 작업폴더 `/home/claude/v7work/Tallyman_Master_V7_00`. 빌드 `bash build.sh`. 버전=src/utils.js + sw.js + public/sw.js 3곳 동기화 (`sed -i "s/V7.0X/V7.0Y/g" src/utils.js sw.js public/sw.js`).
- **콘앱**: `/home/claude/conework2/cone.html` (~107K). 검수앱 public/cone.html에 cp 후 빌드하면 dist→root 복사.
- **매 수정마다 버전 올림** (서비스워커 캐시 때문 — 버전 같으면 사용자 화면이 옛 코드 그대로. "수정 안 됨"의 첫 번째 의심은 항상 캐시/버전).

### 7.2 베이플랜 = 좌표(absolute) 기반 — 격자 금지 (핵심)
- 베이플랜은 **격자(flex row×col) 아님**. 각 셀이 자기 (row, tier) 좌표에 **absolute 독립 배치**. 부모 박스가 `position:relative`, 셀은 `left/top`으로 위치.
- 격자(flex)로 하면 셀이 손잡고 줄서서 **한 칸 빠지면 옆이 밀림** → 00 정렬·빈셀 문제의 근본 원인. 이걸로 여러 번 헛돎.
- 비유: 주차장 칸. 각 셀이 자기 자리 번호 있어 옆 차 없어도 내 자리 그대로. 부모(주차장) 옮기면 칸들 다 같이 따라감.
- 코드: BayPlan.jsx `pageCoordLayout` useMemo + 그 아래 좌표 렌더. `pageCoordLayout` 없으면 기존 flex 폴백(회귀 방지).
- renderCell은 그대로 쓰고 **위치만** 좌표로. 클릭·X마크 등 기능 유지.

### 7.3 데크/홀드는 끝까지 따로 관리 (사용자 강조)
- **통합 축으로 묶지 말 것.** 묶으면 데크에 없는 00 자리가 생겨 → 작업자가 "여기 컨테이너 추가하나?" 오해. (이 실수 1회 함.)
- 데크는 자기 축(00 없음: `08 06 04 02 01 03 05 07`), 홀드는 자기 축(00 있음: `04 02 00 01 03`).
- 각 축의 **중심선만 맞춤** (deckOff/holdOff = (nCols - 축길이)/2). 데크 02|01 경계 = 홀드 00 = 같은 세로선.
- 홀드가 00 때문에 1칸 넓어 짝수/홀수가 데크와 0.5칸씩 어긋나는 건 **정상** (00 중앙 두면 양옆 0.5칸 밀림). 사용자 확인함.
- 비활성(빈) 셀은 보여도 클릭 안 되니 작업 무관. 거슬리면 테두리 없이 완전 투명 처리 가능.

### 7.4 cells 해석 — 베이플랜 vs 카고플랜 다름 (통일 금지)
- **베이플랜** (`buildEmptyBayRenderData`): cells = 00 **제외** 개수 → `nCols = cellsMax + (hasZero?1:0)` (+1).
- **카고플랜** (`computeBayRenderData`): cells = 00 **포함** 개수 → `getRowPositions(cellsMax, hasZero)` 직접 (+1 안 함).
- ⚠️ **두 함수 통일하려다 카고플랜에 +1 추가 → 모든 셀 1칸 늘어남 회귀(V7.04→V7.05 수정).** 절대 통일하지 말 것. 각자 원래 방식 유지.

### 7.5 데크/홀드 00 = EDI 단일 진실
- 데크 hasZero / 홀드 hasZero **따로**. EDI에 그 구역(데크 tier≥80 / 홀드 tier<80) 컨테이너가 있으면 EDI의 00 유무가 정답 (사전값 무시). EDI에 그 구역 컨테이너 없을 때만 사전 폴백.
- 사전에 deckHasZero가 잘못 켜져 있어도 EDI 데크에 00 없으면 데크는 00 없이 그림 (우측 빈셀 회귀 방지).

### 7.6 ISO 6346 사이즈 = 첫 자리만
- `2`=20ft, `4`=40ft (**4500·45R1·45G1 = 40ft hi-cube**, 45로 시작해도 40ft!), `L`/`9`=45ft (진짜 45ft).
- ⚠️ `iso.startsWith('45')`로 45ft 판정하면 4500을 45ft로 오인 (버그). 첫 자리만 봐야 함.

### 7.7 콘앱 (cone.html)
- **콘 계산**: 선적만/양하만 있어도 작동 (`ready = !!(state.stow||state.disch)`, OR). 양쪽 다 요구(`&&`)하면 회귀.
- **콘 작업표**: 곳당 + **총개수** 둘 다 표시. 총개수 = 곳당 × 곳수 (데크콘 4곳, 코끼리콘 2곳, 홀드콘 1곳=중간). 현장 인력이 곱하기 안 하게.
- 가감 색: 추가=초록(--add), 반납=빨강(--rem). 곳당·총개수 모두 색 구분.
- 카고플랜 베이 짝짓기: existBays에 사전 베이도 포함 → 컨테이너 없는 짝수 베이(2,6,20)도 짝꿍 인식 → 홀수(3,7,21)가 (02)03식 묶임. 안 하면 홀수가 단독으로 흩어짐.
- 콘앱 카고플랜 단면도 검수앱과 동일 로직(cvBayRender) — EDI로 데크/홀드 has00 판단.

### 7.8 작업 원칙 (반복 위반 경고)
1. **추측 금지.** 실데이터(EDI/PDF)로 시뮬레이션 검증 후 ZIP. puppeteer-core+Chrome(`/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`)로 실제 렌더링 가능 — 좌표·정렬은 눈으로 확인할 것.
2. **사용자가 방향 주면 그대로 먼저.** "데크는 데크 홀드는 홀드 따로", "좌표대로 찍어" 등 — 끼워맞추거나 복잡하게 만들지 말 것.
3. **간단한 걸 간단하게.** 통일/최적화 욕심에 잘 돌던 코드 건드리지 말 것 (V7.05 회귀가 그 예).
4. **검수앱 본체와 콘앱은 완전 별개.**
5. **매 수정 버전 올림** (캐시).

---

## 부록 B. 메모리/채팅 운영 팁

- 한 채팅 = 한 선박 = 한 작업 원칙
- 채팅이 길어지면 → 마지막에 "다음 채팅용 인계 요약" 요청 → 새 채팅에 붙여넣기
- 앱 개발 채팅과 검수 업무 채팅 분리 권장
- 이 지침서를 새 채팅 시작 시 첫 메시지로 붙여넣으면 즉시 이어 작업 가능
- **HANDOFF.md 갱신 필수**: 작업 완료 시 다음 사용자/Claude에게 인계

---

## 8. 무결점 테스트 결과 (2026-06-04, V7.09)

실데이터(ATPR EDI 509개, MCAT EDI 872개)로 12개 항목 테스트. puppeteer-core+Chrome 렌더링 병행.

| # | 항목 | 결과 |
|---|------|------|
| 1 | EDI 파싱 (BAPLIE) | ✅ ATPR 509 / MCAT 872 정확 |
| 2 | ISO 사이즈 (45류=40ft) | ✅ 4500/45R1/45GP → 40ft. ATPR 20DC 411+40HC 98 |
| 2b | sizeOf 폴백 (9500) | ✅ 첫자리 9→45ft |
| 3 | 베이매트릭스 단면 | ✅ ATPR BAY1(데크8/홀드5 00중앙), BAY13(홀드전용) |
| 3b | MCAT 00없는 선박 | ✅ 데크/홀드 00없이 정상 |
| 4 | 카고플랜 폭 (V7.01원본 일치) | ✅ 셀 늘어남 회귀 없음 |
| 5b | 카고플랜 데크/홀드 00분리 코드 | ✅ 존재 확인 |
| 6 | 베이플랜 좌표 (데크 00 안만듦) | ✅ 데크 00없음, 홀드 00 중앙(x3.5) |
| 7 | 검수앱 빌드 무결성 | ✅ 에러 없음 |
| 8 | 콘앱 구문 + 콘계산 OR | ✅ 선적만/양하만 작동 |
| 9 | 콘 계산 로직 | ✅ BAY1 데크곳당4/코끼리8/홀드5 (화면 일치) |
| 10 | 총개수 + 가감색 | ✅ 곳당×곳수, 추가초록/반납빨강 |
| 11 | 카고플랜 베이짝짓기 | ✅ 빈 짝수베이로 홀수 묶임 |

### 발견·수정된 결함 (V7.09)
- **콘앱 베이플랜 짝짓기 누락**: 카고플랜(1387)은 existBays에 사전 베이 포함하는데 **베이플랜(1619)은 누락** → 빈 짝수 베이 있으면 홀수 흩어짐. dictBays를 existBays 앞으로 옮기고 `for(const bn of dictBays.keys()) existBays.add(bn)` 추가. 카고플랜과 일관성 확보.

### 남은 결함 (낮은 우선순위)
- **isoToLabel('9500') 라벨 미변환**: 사이즈 판정(sizeOf 폴백)은 45ft로 정확하나, 라벨 텍스트('45HC')는 못 만들어 '9500' 그대로 노출 가능. 실데이터(ATPR/MCAT)엔 9500 없어 영향 없음. 일부 선사 코드라 추후 isoToLabel에 9첫자리 분기 추가 권장.

---

## 9. V7.10 (2026-06-04) — 항차 자동삭제 + 작업량 누적

### 기능
- **작업일 표시**: HomePage 항차 카드에 createdAt 표시 ("N일 전", 7일↑ "곧 자동삭제").
- **자동삭제**: HomePage 마운트 시 createdAt 기준 7일 이상 항차 자동 삭제 (useEffect, 1회). createdAt 없는 옛 항차는 보호.
- **삭제 전 작업량 누적**: `fbArchiveVoyageBeforeDelete(imo, key, voyage)` → ships/{imo}/stats에 양하/선적 누적 + 100% 완료(completed:true) 기록. 항차 사라져도 총 대수 영구 보존.

### 핵심 주의 (사용자 명시)
- **전체 작업량 기준 = EDI 전체 컨테이너 수**, 실제 처리분(completed) 아님. 예: 양하 EDI 559대면 실제 450만 처리해도 **559로 기록**. (테스트 중이라 100% 처리 안 됨.)
- 집계 키: `voyages/{key}/{mode}/ediContainers` (객체 {cn:{...}}). ⚠️ ediRows/containers 아님 — ediContainers가 EDI 전체.
- **중복 집계 방지**: ships/{imo}/voyages/{key}/statsCounted 플래그. 이미 집계된 항차는 재집계 안 함.
- IMO 없으면 선박 식별 불가 → 집계 스킵.

### 코드
- `src/pages/HomePage.jsx`: 자동삭제 useEffect (autoCleanDone state로 1회), 카드에 작업일.
- `src/firebase.js`: fbArchiveVoyageBeforeDelete (countSection=ediContainers 개수, fbAddShipStats + fbAddShipVoyage 호출).

---

## 10. V7.11 (2026-06-04) — 항차 완료 버튼

세 가지 항차 정리 방법 (모두 HomePage 카드):
1. **완료 버튼**(초록 CheckCircle): 작업 끝 → 확인모달(양하/선적 대수) → fbArchiveVoyageBeforeDelete(작업량 100% 기록) + fbDeleteVoyage. `completeTarget` state + performComplete.
2. **자동삭제**(7일): 완료 안 눌러도 createdAt 7일↑ → 완료와 동일 처리(작업량 기록+삭제).
3. **삭제 버튼**(빨강 Trash2): 기록 없이 그냥 삭제. 잘못 만든 항차 제거용. handleDelete/performDelete.

- 완료/자동삭제 모두 작업량 = EDI 전체(ediContainers) 기준, completed 아님. 중복방지 statsCounted.
- 코드: HomePage.jsx (VoyageCard onComplete prop, 완료 모달, performComplete). CheckCircle 아이콘 import.

---

## 11. V7.12 (2026-06-04) — 완료/자동삭제 집계 평택분으로 수정 (중요 버그)

### 버그
- 완료 버튼/자동삭제의 작업량 집계가 ediContainers **전체**(타지역 타항만 양·적하 포함)를 셈 → 평택분보다 많게 기록됨. 항차 리스트는 평택분만 정확히 보여주는데 완료 모달은 선박 전체를 보여주는 불일치.

### 수정
- 집계를 **평택분만**으로: `pol.endsWith('PTK') || pod.endsWith('PTK')`인 컨테이너만 카운트.
- 항차 리스트(computeStats.ptk)와 **동일 기준**으로 통일. 리스트 표시 = 완료 모달 = 실제 누적 저장, 셋 다 일치.
- firebase.js fbArchiveVoyageBeforeDelete countSection: PTK 필터. HomePage 완료 모달: computeStats(sec).ptk 재사용.
- 검증: EDI 1000대(평택559+타지역441) → 559만 집계 ✅.

### 핵심 원칙 (다음 클로드)
- **작업량/카운트는 항상 평택분(PTK) 기준.** pol 또는 pod가 PTK로 끝나는 것만. EDI 전체를 세면 타지역 통과화물까지 포함돼 틀림.
- 평택분 판정 기준 함수 = HomePage computeStats. 새로 만들지 말고 이걸 재사용.

---

## 12. V7.13 (2026-06-04) — 대시보드 선박별 항차/작업대수 집계

### 목표 (사용자 요청)
대시보드에서 선박별로 총 몇 항차, 양하 몇 대, 선적 몇 대. MCAT 선택 → 항차 나열 + 항차별 작업대수 + 합계.

### 데이터 흐름 (기존 ships 구조 활용)
- 완료 버튼/자동삭제 → `fbArchiveVoyageBeforeDelete` → `ships/{선박}/stats`(누계) + `ships/{선박}/voyages/{key}`(항차별 discharge_count/loading_count).
- 대시보드 `ChiefDashboard` → `fbSubscribeShipLibrary`(ships 노드) → ShipLibrarySection. 카드 요약(입항 N회/양하/선적) + 펼침 항차별 표.

### 핵심 수정
- **선박 식별 폴백**: IMO → 콜사인(info.callsign) → 선박명. EDI에 IMO 없는 경우 많음(ATPR/MCAT 둘 다 콜사인만). IMO 없다고 집계 스킵하면 누락 → 폴백 필수.
- **항차별 표**: discharge_count/loading_count 칼럼 + tfoot 합계. (기존 container_count/ptk_count 필드명과 달라 0으로 나오던 것 수정.)
- 양하만/선적만 있는 항차도 각자 정확히 누적 (카드 갈라져도 누락 없음). 검증: 3항차(450/280, 500/0, 0/300) → 입항3 양하950 선적580 ✅.

### 주의
- 양하·선적 항차번호 다르면(0523E/0523W) 키 갈라져 카드 2개 — 정상. 각 카드가 자기 작업량 누적하니 합산 정확. (total_voyages는 카드당 +1이라 같은 기항이 2회로 셀 수 있음 — 대수는 정확, 횟수만 주의.)
