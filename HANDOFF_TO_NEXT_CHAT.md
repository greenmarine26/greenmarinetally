# HANDOFF_TO_NEXT_CHAT.md — M4.8 인계 지침서

> **현재 상태:** M4.8 빌드 완료 — 가로 모드 + 다중 베이 선택 + 마크/legend 동적
> **이전 버전:** M4.7 (PDF 1차 재현)
> **인계 일자:** 2026-05-09
> **참고 PDF:** PCSG2616W.pdf (PACIFIC TIANJIN VOY 2616W, POL=PTK)

---

## 1. M4.8 핵심 변경 — 사용자 정정 4건 + PDF 분석 반영

### 사용자 요청 (M4.7 출력물 검토 후)
1. ✅ **A4 가로 모드** — 카고 플랜 + 베이 상세 둘 다
2. ✅ **베이 다중 지정** — 체크박스로 여러 베이 한 번에 선택
3. ✅ **빈 베이 식별** — 옵션 라벨에 컨테이너 수 표시
4. ✅ **한 페이지 fitting** — 카고 플랜 max-width 제거 + 4col 그리드

### PDF 분석으로 발견한 추가 차이 (PCSG2616W 기준)
5. ✅ **카고 플랜 그리드 5col → 4col**
6. ✅ **마크 = 카운터파트 항만 첫 글자**
   - 외부 화물: load → c.pod 첫 글자 (D=DLC, W=WEI)
   - 외부 화물: discharge → c.pol 첫 글자
   - PTK 화물: discharge 'o', load 'L'
7. ✅ **베이 상세 line 1 모드별**
   - load: `[POD]/ *[POL]` (예: "DLC/ *PTK")
   - discharge: `[POL]/ *[POD]` (예: "LYG/ *PTK")
8. ✅ **Legend 항만 라벨 동적** (D DLC 126/117/0, W WEI 0/100/0, …)
9. ✅ **Legend 위치 = row 4 마지막 칸** (우하단)

### 미해결 (다음 라운드)
- ❌ 페이지 2 (SPECIAL CARGO STOWAGE PLAN)
- ❌ 페이지 2 우하단 legend (E/R/IMDG/B/A/N/D)
- ❌ carrier 약어 매핑 확장 (SKR 추가됨, 다른 선사 필요)

---

## 2. 변경 파일

- src/utils.js: APP_VERSION = 'M4.8'
- src/components/PrintableCargoPlan.jsx: 전면 재작성
- src/components/PrintableBayDetail.jsx: 전면 재작성

---

## 3. 빌드 결과

- index.html: 1.16 kB
- assets/index-E79AzV4J.css: 55.95 kB (gzip 9.54)
- assets/index-VUogN9Gn.js: 1,190.74 kB (gzip 252.23)
- assets/mixerUpload-Chlf3K91-DamaaUCK.js: 6.83 kB

번들 변화: M4.7 (1191/252) → M4.8 (1191/252) — 변동 없음

---

## 4. 검증 필요 (현장 테스트)

### 카고 플랜 (PCSG2616W 항차로)
- [ ] 4col 4행 한 페이지 fit
- [ ] 마크 D/W 등 항만 첫 글자
- [ ] Legend 우하단 (D DLC, W WEI, PTK, OPT, TTL)
- [ ] 베이 카운트 (예: BAY (14)15 6/42/0)

### 베이 상세 (BAY01, BAY(02)03, BAY(06)07)
- [ ] 가로 한 페이지에 셀 fit
- [ ] line 1 = `DLC/ *PTK` (load 모드)
- [ ] 다중 선택 체크박스 동작
- [ ] 빈 베이 회색 식별
- [ ] PTK 셀 노란 강조

---

## 5. 알려진 제한

1. discharge 모드 line 1은 추측 (양하 PDF 미검증)
2. 마크 = 첫 글자 1자 → 첫 글자 충돌 가능 (DLC/DAL 모두 D)
3. AFT pairs 4개 이상이면 legend가 다음 행으로 밀림 (현재 ≤3개 가정)
4. OPT 정의 = pol/pod 빈 컨테이너 (실 정의 다를 수 있음)

---

## 6. 다음 세션 후보

### 우선순위 최상
1. PCSG2616W EDI 실제 업로드 → 카고/베이 출력 → PDF 비교
2. line 1, 마크, legend 카운트 정확도

### 우선순위 상
3. **페이지 2 SPECIAL CARGO STOWAGE PLAN 구현**
4. carrier 약어 매핑 확장
5. AFT pairs 4+ 케이스

### 오래된 숙제
6. ISO 변경 후 화면 미반영
7. 리퍼 온도 직접 수정 UI

---

## 7. 자체 평가

- 사용자 요청 4건: 10/10
- PDF 분석 반영: 8/10 (페이지 2 미구현)
- 검증 충실도: 5/10 (실 출력 미확인)
- 종합: 7.5/10

---

## 8. 다음 세션 첫 메시지 권장

- "M4.8 PCSG2616W 출력 결과" + 스크린샷
- "페이지 2 특수화물 구현"
- "M4.8 + 미해결 버그 수정"

---

M4.8 빌드 완료 / 사용자 4건 + PDF 분석 5건 / 다음: PCSG 실 출력 검증
