# M5.27 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.27) — 자료 못 읽어옴 fix + 재업로드 부담 제거

M5.26 첫 빌드의 두 가지 문제 hotfix.

## ✅ 변경 사항 (M5.26 → M5.27)

### 1. PrintHubModal 자료 못 읽어옴 fix (CRITICAL)

**원인**: PrintHubModal에서 `voyage[mode].containers`로 가져오려 했는데 실제 구조는 `ediContainers + records`로 분산.

**Fix**:
```js
// 이전 (잘못된 접근)
const containers = modeData?.containers ? Object.values(modeData.containers) : [];

// 현재 (VoyagePage와 동일 머지 패턴)
const ediMap = sec.ediContainers || {};
const recMap = sec.records || {};
const compMap = sec.completed || {};
const xrayMap = sec.xrayList || {};

const isPtk = (c) => {
  const target = mode === 'discharge' ? c.pod : c.pol;
  const t = String(target || '').toUpperCase();
  return !t || t === 'PTK' || t === 'KRPTK' || t.endsWith('PTK');
};

const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
const containers = [...allCnSet]
  .map(cn => { ...edi 머지 + records 보강 ... })
  .filter(isPtk);  // 평택분만
```

→ 검수 리스트 + 카고플랜 + 베이상세 모두 정상 데이터 받음

### 2. 재업로드 안내 메시지 제거

**문제**: 자료 탭의 "💾 다음 EDI 업로드부터 원본이 자동 보관됩니다 → 미래 앱 업데이트 시 자료 재업로드 없이 [🔄 재처리]로 적용 가능" 메시지가 검수원에게 "매 업데이트마다 재업로드 필요"로 오해받음.

**Fix**: 
- 이 안내 메시지 제거 (line 1508-1510)
- 재처리 버튼 텍스트 부드럽게: 
  - 이전: "🔄 EDI 원본으로 자료 재처리 (앱 업데이트 후 적용용)" + amber 색상 (눈에 띔 → 부담)
  - 현재: "🔄 EDI 다시 분석 (선택사항)" + slate 색상 (선택사항임 강조)
- EDI 업로드 status: "💾 EDI 원본 보관됨 — 자료 탭에서 재처리 가능" → "💾 EDI 원본 자동 보관됨"

**운영 원칙 명확화**: EDI 한 번 업로드 → Firebase 영구 보관 → 앱 업데이트마다 재업로드 X.

## 검증

- 버전 M5.27: 2회 ✓
- 새 텍스트 "EDI 다시 분석" / "선택사항" / "EDI 원본 자동 보관됨" 적용 ✓
- isPtk 머지 로직 적용 (PrintHubModal) ✓
- 기존 기능 모두 잔존 (검수 자료 출력 5회, 검수 리스트 5회, BULK_AUTO 192회 등)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.27' |
| src/components/PrintHubModal.jsx | **ediContainers + records 머지 + isPtk 필터 추가** |
| src/pages/VoyagePage.jsx | 재업로드 안내 메시지 제거 + [재처리] 버튼 부드럽게 + status 메시지 정리 |
| src/components/HelpModal.jsx | M5.27 변경사항 |

## 사용자 시점 핵심 메시지

1. **검수 자료 출력 정상 동작** — 양하/선적 탭에서 컨테이너 카운트 + 출력 모두 정상
2. **재업로드 부담 없음** — EDI는 자동 보관됨. 매 업데이트마다 다시 안 올려도 됨
3. **재처리 버튼은 선택사항** — 필요시에만 누르고, 안 눌러도 옛 결과 그대로 사용

## ⚠️ 잠재 운영 이슈 / 후속 작업

1. **M5.11 이전 자료** — EDI 원본 보관 안 됐을 수 있음. 새 업데이트 적용 후 BAY/ISO 등 변경되면 자료 한 번만 재업로드 필요. 그 후엔 영구 자동.
2. **자동 재처리 옵션** — 향후 빌드 업데이트 감지 시 자동 재처리 토글 추가 가능 (현재는 수동만)
3. **인쇄 결과 검증** — M5.26 검수 리스트 양식 실제 인쇄해보고 미세 조정 필요할 수 있음

## 🔜 다음 세션 후보

1. 사용자 인쇄 결과 따라 검수 리스트 양식 미세 조정
2. ISO 코드 → 규격 변환 로직 검증 (R/P/U/T 판별 정확도)
3. 자동 재처리 옵션 (사용자 설정)

## 영구 규칙 (메모리)

(이전과 동일 — 베이사전 우선, PORT-MIS 매칭 4단계, Chrome 확장 등)
