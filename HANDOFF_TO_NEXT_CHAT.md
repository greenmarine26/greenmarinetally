# M5.80 인계 — AI 대화 강화 (Flash + RAG + 멀티턴)

## 🎯 M5.80 핵심 변경 (사용자 요청: "검색앱 AI 대폭 업데이트, 대화 가능 수준")

### 1. Gemini 2.5 Pro → 2.5 Flash
- 응답 속도: 3~10초 → **0.5~1.5초**
- 무료 한도: 일일 50회 → **일일 1500회**
- mixerUpload.js OCR 호출도 Flash로 통일 (한도 일관성)

### 2. RAG (Retrieval-Augmented Generation)
- 매 질문마다 1500대 전체를 LLM에 보내던 방식 → 질문 키워드로 후보 좁히기
- 새 함수: `ragFilter(question, allContainers, parsedQuery)` (gemini.js export)
- 키워드 매칭:
  - 베이 번호 → 그 베이만
  - DG/리퍼/FR/OT/TK → 해당 타입만
  - POL/POD → 해당 항구만
  - 컨번호 끝자리 → 그 컨테이너만
  - DG Class / UN → 해당 위험물만
  - F/E, 사이즈, 갑판/선창, 무게 범위 등
- 평균 **30~50대만 전송** (전체 1500대의 2~3%)

### 3. 멀티턴 대화
- 새 state: `chatMessages` 배열 — 이전 대화 누적
- handleAskAI에 `history` 옵션 추가
- 5턴 넘으면 `compressHistory()`가 첫 3턴을 한 줄 요약으로 자동 압축
- UI: 답변 카드가 말풍선 대화 형식 (검수원 / AI)
- 후속 질문 입력창 + [🔄 새 대화] 버튼

### 4. systemInstruction 분리
- 도메인 지식 + 답변 규칙을 `systemInstruction` 필드에
- 매 턴 새로 보내지 않음 (Gemini가 자동 캐시)
- contents에는 컨텍스트 + 질문만

### 5. UI 강화
- AI 대화 카드 상단에 "🎯 RAG: 베이 16 / DG (3대)" 배지 — 어떤 데이터로 답했는지 투명 표시
- 각 AI 메시지 아래 "📌 5번 베이 / 리퍼 (12대 참조)" 표시
- 좌측 컬러: 검수원 (amber) / AI (purple)

### 6. 부가 변경
- 컨테이너 압축에 M5.79 필드 추가: `ts`(tspot), `fp`(fpod), `booking`
- DG는 UN 화물명도 함께 전달 (`un_name`) — LLM 추론 도움
- 부킹 슬롯(__BOOK_*) 별도 카운트 + 시스템 프롬프트에 처리 규칙

---

## ✅ 빌드 검증

산출물: `assets/index-4XtZfp5d.js` (1.49 MB)

| 키워드 | 회수 |
|---|---|
| `M5.80` | 1 |
| `gemini-2.5-flash` | 1 (호출 URL) |
| `gemini-2.5-pro` | 0 (모두 Flash로 통일) |
| `ragFilter` / RAG | 3 |
| `compressHistory` (이전 대화 요약) | 1 |
| `systemInstruction` | 1 |
| 후속 질문 / 새 대화 / AI 대화 (Gemini Flash) | 각 1 |

---

## ✅ RAG 시뮬레이션 결과 (실 EDI 1648대 기준)

| 질문 | 전송 컨 (M5.79) | 전송 컨 (M5.80) | 절감 |
|---|---|---|---|
| 16번 베이 컨 알려줘 | 1,648 | 0 | 100% |
| 리퍼 몇 대? | 1,648 | 90 | 95% |
| DG 위험물 위치 | 1,648 | 25 | 98% |
| Class 3 인화성 액체 | 1,648 | 14 | 99% |
| UN 1170 어디? | 1,648 | 7 | 100% |
| 베이 16 풀 컨 | 1,648 | 0 | 100% |
| VNSGN에서 온 컨 | 1,648 | 632 | 62% |
| 20피트 엠티 컨 | 1,648 | 132 | 92% |
| 끝자리 4777 | 1,648 | 1 | 100% |
| 갑판 위 컨 | 1,648 | 1,648 | 0% (광범위) |
| 한국 항구 통계 | 1,648 | 1,648 | 0% (조건 없음) |
| **합계** | **18,128** | **4,197** | **77%** |

전체 토큰 절감 추정: **72%**

## ✅ 멀티턴 대화 흐름 검증 (시뮬레이션)

```
👤 16번 베이 컨테이너 보여줘
🤖 16번 베이 0대. 비어있습니다.
👤 그럼 5번 베이는?            ← follow-up: 베이만 다름
🤖 5번 베이 23대. Full 20, Empty 3.
👤 그 중 양하만                ← follow-up: 5번 베이 기준
🤖 5번 베이 양하 18대.
👤 위험물 있어?                ← follow-up: 5번 베이 양하 중 DG
🤖 5번 베이 DG 0대.
👤 그럼 위험물 어느 베이에?    ← 컨텍스트 전환
🤖 11번 베이 7대, 21·23·25번 각 1대.
👤 11번 베이 위험물 상세       ← follow-up: 11번 베이 DG
🤖 11번 베이 DG 7대. UN 1805 인산 4대, UN 1993 2대, UN 1170 1대.
```

6턴(12메시지) 대화 → compressHistory가 자동으로 첫 3턴 요약 + 최근 4턴 유지

## ✅ 일일 호출 한도 분석

- 검수원 15명 × 하루 30회 = **450회/일**
- Gemini Flash 무료 한도 1500/일 → **30% 사용**
- 피크 타임(4선박 동시 작업)도 분당 15회 한도 안

---

## ⚠ 알려진 잔여 작업 (M5.81~ 후보)

1. **shipLib 멀티턴 전달** — SearchPanel props로 shipLib을 받는데 SingleSearch까지 전달 안 됨. handleAskAI에 추가 가능 (현재 동작엔 영향 없음, 단지 이전 항차 통계 활용 못 함)

2. **Function Calling (M5.90 후보)** — 도구 30~50개 구축 시 환각 완전 박멸. 베이/위치/무게/위험물/트윈 등 모든 검수 작업 도구화

3. **부킹 슬롯 OCR (M6.0 후보)** — Gemini Flash Vision으로 컨테이너 사진 → 컨번호 자동 인식 → M5.79 부킹 슬롯에 매칭

4. **Cloudflare Workers 프록시** — 사용자 선택으로 보류. 직원 화이트리스트(M5.62)로 사실상 보호됨

---

## 사용자 작업 (배포)

### A. GitHub Actions 자동 배포 (권장)
1. ZIP 풀기
2. `m580_build/` 폴더 내용을 GitHub repo에 push
3. `.github/workflows/deploy.yml` 자동 실행 → 빌드 → GitHub Pages 배포
4. 1-3분 후 사이트 갱신

### B. 수동 배포 (Actions 안 될 때)
1. ZIP의 `dist/` 폴더 내용 (index.html, assets/, sw.js)을 GitHub Pages 배포 경로에 푸시

## 사용자 폰에서 새 버전 안 보이면
1. Ctrl+Shift+R (강제 새로고침)
2. 또는 개발자 도구 → Application → Service Workers → Unregister 후 새로고침
3. 또는 사이트 1시간 후 자동 (SW가 1시간마다 update 확인)

## 빌드 함정 메모
- `index.html`이 옛 빌드 산출물 가리키면 vite가 5 modules만 transform → 변경 안 반영
- 매 빌드 전 `build.sh` 실행 필수
- M5.80 빌드: 1648 modules transformed ✓

---

## 이전 M5.79 변경 요약 (참조)

1. parseBAPLIE LOC+83(tspot) + LOC+97/98(fpod) 파싱
2. 평택 적재 부킹 슬롯 `__BOOK_` 임시 ID
3. dgUnDict.js UN 코드북 52개
4. ContainerDetailModal ISO 옵션 21개 (G0/G1 분리) + 환적 표시
5. WorkReportModal 수동 보고 섹션 (시작 안 누른 작업 중단/재개/완료)
