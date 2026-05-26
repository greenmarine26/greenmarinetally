# MasterPlan MP1.0.0 — 베이사전 빌더

**검수앱(Tallyman Master)과 완전 분리된 별도 앱.**

## 목적
사용자 4단계 아키텍처 중 1번 (베이사전) 전담.
- 선박마다 빈 카고플랜 만들기
- 사용자가 베이 구조 직접 입력 + 저장
- JSON Export로 검수앱에 전달 (검수앱은 import해서 사용)

## 검수앱과 분리
| 항목 | MasterPlan | 검수앱 (Tallyman) |
|---|---|---|
| 코드 | `/MasterPlan` | `/Tallyman_Master` |
| localStorage 키 | `masterplan_dict_v1` | `master_user_bay_dict_v1` |
| 빌드 크기 | 172KB | 2.8MB |
| 데이터 영향 | 0 (분리) | 0 (분리) |
| 전달 방법 | JSON Export → 사용자가 검수앱에 import |

## 기능 (MP1.0.0)

### 1. 메인 (선박 리스트)
- 등록된 선박 목록
- ➕ 신규 선박 등록 (CASP 코드, 선박명, IMO, 콜사인 직접 입력)
- 📥 JSON Import (검수앱 export 파일 가져오기)
- 📤 전체/선박별 Export
- 🗑 선박 삭제

### 2. 베이사전 빌더 (좌우 분할)
- **좌측**: 베이 편집
  - 베이 추가/삭제 (번호 + 페어 짝수 선택)
  - rowCount, hasZero 수정
  - Deck/Hold tier 추가/삭제/수정
  - tier별 cells 갯수 입력
- **우측**: 베이플랜 시뮬 (선택한 베이)
  - 빈 박스 미리보기 (BayBox 컴포넌트)
  - Hold 정렬: 좌/가운데/우
  - 좌측/우측 padding 미세 조정
  - 📋 베이 구조 복사 (다른 베이에 일괄 적용)

### 3. 카고플랜 보기
- 모든 베이를 격자로 배치
- BOW 우측 정렬 (큰 번호 좌측)
- 인쇄 가능 (A4 landscape)
- 컨테이너 없는 빈 도면

## 사용 흐름

```
1. 마스터플랜 앱 열기
2. ➕ 신규 선박 등록 (예: DXQD, XIN QUN DAO, 9388417, H3OI)
3. 베이사전 빌더 자동 진입
4. 베이 추가 (예: 011)
5. 좌측에서 tier, cells 입력 → 우측에 즉시 미리보기
6. padding/align 조정 (필요 시)
7. 베이 11 → 13, 15, 17, ... 일괄 복사
8. 💾 저장
9. 📤 JSON Export
10. 검수앱에서 import → userBayDict에 추가 (검수앱이 그대로 사용)
```

## 데이터 모델

ShipEntry:
```js
{
  code: 'DXQD',
  name: 'XIN QUN DAO',
  imo: '9388417',
  callsign: 'H3OI',
  bays: [BayEntry],
  createdAt, updatedAt
}
```

BayEntry:
```js
{
  bay: '011', bayNo: '11',     // 3자리/2자리 키
  pairEven: '12' | null,        // 페어 짝수
  rowCount: 8, hasZero: false,
  deckTiers: [88,86,84,82],
  holdTiers: [8,6,4,2],
  deckCells: [7,7,7,7],
  holdCells: [7,7,7,7],
  deckAlign: 'center'|'left'|'right',
  deckPadLeft: 0, deckPadRight: 0,
  holdAlign: 'center'|'left'|'right',
  holdPadLeft: 0, holdPadRight: 0,
}
```

## 검수앱 호환 export

`toTallymanFormat(ship)` → Tallyman Master의 `userBayDict[code]` 형식과 100% 일치:
```js
{
  imo, code, name, callsign,
  bayDef: {
    recordCount, sourceFile: 'masterplan_export',
    sourceVersion: 'MP1.0.0', verified: true,
    baysSummary: [...]  // 위 BayEntry + hasDeck/hasHold/source 추가
  }
}
```

## 빌드 + 시뮬 검증

- `npm install`: 25 패키지, 0 vulnerabilities
- `npm run build`: 0 에러, 172KB JS / 14KB CSS
- 데이터 흐름 시뮬: 등록 → 저장 → 리프레쉬 → 복사 → Export 모두 PASS

## 한계 (다음 버전)

- tier별 cells 시각 클릭 편집 (현재 숫자 입력)
- 베이별 deckRowMax ≠ holdRowMax (현재 통일)
- EDI 파싱 직접 (현재는 검수앱에서 사용, MasterPlan은 빈 골격만)
- 페어 박스 시각화 (현재 단독 베이만 최적화)

## 파일 구조

```
MasterPlan/
├── package.json, vite.config.js, tailwind.config.js, postcss.config.js
├── index.html, sw.js
└── src/
    ├── main.jsx, App.jsx, styles.css
    ├── lib/
    │   ├── shipDict.js      ← localStorage + 검수앱 호환 변환
    │   └── bayRender.js     ← 베이 박스 렌더 helper
    ├── components/
    │   └── BayBox.jsx       ← 1베이 시각화 (= 베이플랜)
    └── pages/
        ├── ShipList.jsx     ← 메인 (선박 리스트)
        ├── BayBuilder.jsx   ← 베이사전 빌더 (좌우 분할)
        └── CargoPlanView.jsx ← 전체 카고플랜 (모든 베이 배치)
```
