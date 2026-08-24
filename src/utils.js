// 공통 유틸리티 — V48 (2026.05.09 / M4.9e)
export const APP_VERSION = 'TallyOne 2.31';   // **공용 3부품에 시안 V2 규격 첫 적용 — 일체감 판 1** — 검수사 «일체감이 있는게 좋습니다. 전부 A안으로» (3안 비교 후 확정). Header·ConfirmModal·ChoiceModal 클래스만 교체, 동작 불변: ink/line/act/st/dim 토큰 + rounded-card/btn/pill + 주버튼 60px. 규격(2.13 신설·2.16 시안V2 값)이 화면에 처음 닿았다 — 종전 적용률 1.1%(토큰 64 vs 구식·임의값 5,979). 확인 버튼 amber→act(민트), danger는 st-bad 유지, 검수원 아바타 호박색은 정체성으로 유지. 복제 오버레이 3곳(GeminiKey·SlotPicker·StowageReview)은 다음 판.

// ── V9.04-01: 가상(더미) 컨번호 판정 — MCSN 629S 사건 2026-07-18 ─────────
//   실번호는 ISO 6346 규칙상 4번째 글자가 항상 U/J/Z (MSKU…, TCLU…). 플래너·수집기가
//   엠티 예약자리에 만드는 가상번호는 이 규칙을 안 따른다 (수집기 DUME9400016…, CASP69 플래너 CASP0000001…).
//   V9.03의 /^DUME/ 프리픽스 판정이 CASP 77대를 실번호로 오집계 → "실 177·총 364·누락 187" 허수.
//   검증(2026-07-18): 4개 선사 EDI 3,728컨 + 리스트 실번호 974컨에서 가상 판정 = DUME 110·CASP 77뿐, 오탐 0.
export function isVirtualCn(cn) {
  const s = String(cn || '').toUpperCase().replace(/\s+/g, '');
  return isValidCn(s) && !/^[A-Z]{3}[UJZ]/.test(s);   // V9.57: 컨번호 형식 검사를 isValidCn 단일 소스로
}

// ── V9.02: 카톡 물량 예보 파서 (RZOR·OBWH 형식 — 사용자 확정 2026-07-17) ─────────
//   예: "R075W / *FULL / 20D X 9 (S X 9) / 40H X 73 ... / FULL-161TEU EMPTY-238TEU LUG-1TEU 400TEU"
//   규칙: *FULL/*EMPTY/*LUGGAGE 섹션 안의 "규격 X 수량"만 집계. '-'로 시작하는 줄(위치·화주 상세,
//   예: -LO LO, -CORNNING, -TRAIN)은 같은 컨을 다시 세는 내역이므로 섹션을 닫고 건너뛴다.
//   첫 요약 줄(S-32 C-110 ... TEU)은 해석하지 않고 원문 그대로 보존(표시용).
//   검산: 20피트=1TEU, 40/45피트=2TEU로 계산한 값과 말미 합계(FULL-…TEU …)가 일치해야 teuOk.
/** TallyOne 1.8-04: 리퍼 풀/공/드라이 표기에서 뒤 글자를 뽑는다 (검수사 확정 2026-08-04).
 *
 *    `RF` `RE` `RD`        규격 없이 쓰는 표기
 *    `R/F` `R-E` `R / D`   슬래시·하이픈, 공백 있어도 됨
 *    `D/F` `D/E`           앞 글자가 R이 아니어도 슬래시형이면 뒤 글자를 쓴다
 *
 *  반환 'F'(풀) | 'E'(공) | 'D'(리퍼드라이 — 넌플러그, 온도 무관) | ''
 *
 *  ⛔ **`45RE` `43RF` 같은 규격형에서 풀/공을 읽지 않는다** (1.8-06에서 되돌림).
 *     검수사 확인 2026-08-04: "F 45RE 온도 이렇게 올수도 있습니다. 이건 풀리퍼라는 이야기 입니다."
 *     → `RE` 는 REEFER 타입 코드지 Empty 가 아니다. 풀/공은 **F/E 열**이 정한다.
 *     1.8-05 가 `45RE`를 무조건 엠티로 읽었다 — 풀 리퍼를 온도 점검에서 빼버리는 오판이라
 *     원래 문제(공 리퍼가 풀로 잡힘)보다 훨씬 나쁘다. 즉시 되돌렸다.
 *     앞선 STMJ 10대가 엠티로 맞았던 것도 `45RE` 때문이 아니라 **F/E 열이 `E`** 였기 때문이다.
 *  ⚠ 진짜 ISO 코드(`45R1` `22R1` `45G1`)도 당연히 안 걸린다.
 */
export function _feFromSlash(raw) {
  const s = String(raw || '').trim().toUpperCase();
  const m = s.match(/^([A-Z]{1,2})\s*[/\-]\s*([FED])$/);
  if (m) return m[2];
  const m2 = s.match(/^R\s*([FED])$/);   // RF · RE · RD — 규격 접두 없이 정확히 두 글자일 때만
  return m2 ? m2[1] : '';
}

// ── TallyOne 1.43: 항차번호 없는 카톡 예보 — **담당자와 일자로** 배를 찾는다 ─────────
//   검수사 지적(2026-08-10): *"항차 기록이 없어서 들어가질 않습니다. 그런데 판단할 근거가
//   있습니다. 일자와 담당자입니다."*  실제 원문에 배도 항차도 없다:
//     `26년 8월 10일` / `[이다희] [10:38] FULL 20GPX6 + 40HQX11`
//   ⚠ **카톡으로 예보를 보내는 선사는 둘뿐이다**(검수사 확답: RZOR·OBWH).
//     수집기 handlers.json(14건)을 통째로 동기화하는 것도 검토했으나 검수사 판단대로 접었다 —
//     *"예보는 2건입니다. RZOR OBWH 그래서 담당자를 직접 넣는게 빠릅니다."*
//   사람이 바뀌면 이 표만 고치면 된다. 수집기 handlers.json 과 이름이 같아야 한다.
export const FORECAST_SENDERS = {
  이다희: 'OBWH', 윤내경: 'OBWH',              // 연태훼리 · OCEAN BLUE WHALE
  김지태: 'RZOR', 안지영: 'RZOR', 박성욱: 'RZOR',   // 일조국제 · RIZHAO ORIENT
};

/** 카톡 원문에서 `[이름]` 을 찾아 선박코드로. 못 찾으면 ''. */
export function forecastVslBySender(text) {
  for (const m of String(text || '').matchAll(/\[([^\]\n]{2,12})\]/g)) {
    const who = m[1].replace(/\s+/g, '');
    if (FORECAST_SENDERS[who]) return FORECAST_SENDERS[who];
  }
  return '';
}

/** `26년 8월 10일` · `2026-08-10` · `8/10` → 'YYYY-MM-DD'. 못 읽으면 ''. */
export function forecastDate(text, now = new Date()) {
  const s = String(text || '');
  let m = s.match(/(20\d{2}|\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    const y = m[1].length === 2 ? 2000 + +m[1] : +m[1];
    return `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
  }
  m = s.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
  return '';
}

export function parseCargoForecast(text) {
  const out = { vsl: '', voy: '', mode: '', full: {}, empty: {}, luggage: {}, teu: null, summary: '',
    vans: { full: 0, empty: 0, luggage: 0 }, calc: { full: 0, empty: 0, luggage: 0 }, teuOk: true,
    urgentCns: [], luggageCns: [], luggageSeals: {} };   // V9.03: 긴급/수화물 컨번호 (연태훼리 CLL 메일)
  const add = (sec, size20, sizeSfx, n) => {
    const size = size20 + sizeSfx;
    out[sec][size] = (out[sec][size] || 0) + n;
    out.vans[sec] += n;
    out.calc[sec] += (size20 === '20' ? 1 : 2) * n;
  };
  const SIZE_G = /(\d{2})\s*([A-Z]{1,2})\s*[Xx×]\s*(\d+)/g;
  let sec = null;
  let cnSec = null;      // V9.03: 'urgent' | 'lugg' — "*** 긴급리스트 ***" / "*** 수화물 컨테이너 ***" 아래 컨번호 나열 구간
  let lastLuggCn = '';   // V9.03: "SEAL NO. : X" 줄을 직전 CNTR와 짝짓기
  for (const raw of String(text || '').split(/\r?\n/)) {
    // ── TallyOne 1.43: 카톡 발신자·시각 머리말을 떼고 읽는다 ──────────────────
    //   카톡에서 복사하면 **말한 사람의 첫 줄에만** `[이다희] [10:38] ` 이 붙는다.
    //   그래서 이어 쓴 줄(EMPTY…)은 읽히는데 **첫 줄(FULL…)만 통째로 누락**됐다.
    //   실측 2026-08-10: `[이다희] [10:38] FULL 20GPX6 + 40HQX11` → FULL 0대(정답 17대 28TEU).
    //   검수사가 화면에서 EMPTY 만 189TEU 로 뜨는 것을 보고 신고했다.
    //   ⚠ `[이름] [시각]` **두 쌍이 연달아** 있을 때만 뗀다 — 다른 대괄호 표기를 건드리지 않기 위해서다.
    const line = raw.trim().replace(/^\[[^\]\n]{1,20}\]\s*\[[^\]\n]{1,20}\]\s*/, '');
    if (!line) continue;
    // V9.03: 별 2개 이상 헤더 — "*** 긴급리스트 ***", "*** 수화물 컨테이너 ***", "**변경사항**".
    //   RZOR 섹션 헤더(*FULL, 별 1개)와 충돌하지 않음. 모르는 ** 헤더는 구간만 닫는다.
    if (/^\*{2,}/.test(line)) {
      sec = null;
      if (/긴급/.test(line)) { cnSec = 'urgent'; }
      else if (/수화물/.test(line)) { cnSec = 'lugg'; lastLuggCn = ''; }
      else cnSec = null;
      continue;
    }
    // 선박+항차 (OBWH형: "OBWH 2690W"가 줄 어디든) / 항차 단독 줄 (RZOR형: "R075W")
    const sv = line.match(/\b([A-Z]{4})\s+([A-Z]?\d{2,5}[EWNS])\b/);
    if (sv && !out.voy) { out.vsl = sv[1]; out.voy = sv[2].toUpperCase(); }
    const vm = line.match(/^([A-Z]?\d{2,5}[EWNS])$/);
    if (vm && !out.voy) { out.voy = vm[1].toUpperCase(); continue; }
    // V9.03: 항차 폴백 — 한글 제목줄("연태훼리 2690W CLL 2차 …")처럼 선박코드 없이 항차만 있는 경우.
    //   숫자 3~5자리+방향(EWNS)이 단어 경계로 홀로 선 첫 토큰. 컨번호(영문4+숫자7)는 형태가 달라 안 걸림.
    if (!out.voy) {
      const va = line.match(/(?:^|[^A-Z0-9])(\d{3,5}[EWNS])(?![A-Z0-9])/);
      if (va) out.voy = va[1].toUpperCase();
    }
    // V9.03: 컨번호 나열 구간 수집 — 그룹 표기 "(20X3)"/"(40X12)"는 규격 안내일 뿐이라 무시.
    if (cnSec) {
      if (/^[([]/.test(line)) continue;
      const cm = line.match(/CNTR[^:：]*[:：]\s*([A-Z]{4})\s?(\d{7})/i);          // "CNTR NO. : SPSU2042317"
      const sl = line.match(/SEAL[^:：]*[:：]\s*([A-Z0-9-]{4,})/i);              // "SEAL NO. : BHGJ048274"
      const bare = line.match(/^([A-Z]{4})\s?(\d{7})\b/);                        // 줄 자체가 컨번호
      const cn = cm ? (cm[1] + cm[2]).toUpperCase() : (bare ? (bare[1] + bare[2]).toUpperCase() : '');
      if (cn) {
        const bucket = cnSec === 'urgent' ? out.urgentCns : out.luggageCns;
        if (!bucket.includes(cn)) bucket.push(cn);
        if (cnSec === 'lugg') lastLuggCn = cn;
        continue;
      }
      if (sl && cnSec === 'lugg' && lastLuggCn) { out.luggageSeals[lastLuggCn] = sl[1].toUpperCase(); continue; }
      continue;   // 구간 내 기타 줄(안내문 등)은 집계에 흘리지 않는다
    }
    // TEU 합계 줄 (RZOR형 말미)
    const tm = line.match(/FULL\s*-\s*(\d+)\s*TEU\s+EMPTY\s*-\s*(\d+)\s*TEU(?:\s+LUG\w*\s*-\s*(\d+)\s*TEU)?\s+(\d+)\s*TEU/i);
    if (tm) { out.teu = { full: +tm[1], empty: +tm[2], luggage: +(tm[3] || 0), total: +tm[4] }; continue; }
    // 요약 줄 (RZOR형 첫 줄 "S-32 C-110 G-7 266TEU") — 해석 없이 원문 보존
    if (/^[A-Z]{1,2}-\d+/.test(line) && /TEU/i.test(line)) { out.summary = line; continue; }
    // OBWH형 인라인: "FULL 20GPX19 + 40HQX33 + ..." — 단 한글 포함 줄은 주석(수화물·긴급분 안내)이라 집계 제외
    const inline = line.match(/^\*?\s*(FULL|EMPTY|LUG\w*)\b/i);
    if (inline && !/[가-힣]/.test(line) && SIZE_G.test(line)) {
      SIZE_G.lastIndex = 0;
      const bucket = /LUG/i.test(inline[1]) ? 'luggage' : inline[1].toLowerCase();
      for (const m of line.matchAll(SIZE_G)) add(bucket, m[1], m[2], +m[3]);
      sec = null;
      continue;
    }
    // RZOR형 섹션 헤더
    if (/^\*\s*FULL\s*$/i.test(line)) { sec = 'full'; continue; }
    if (/^\*\s*EMPTY\s*$/i.test(line)) { sec = 'empty'; continue; }
    if (/^\*\s*LUG/i.test(line)) { sec = 'luggage'; continue; }
    // 위치·화주 상세('-LO LO', '-CORNNING'…)나 온도 상세("40RHX7 (-18'C)") 등은 이중 집계 방지 위해 제외
    if (/^[-=]/.test(line)) { sec = null; continue; }
    if (!sec) continue;
    const m = line.match(/^(\d{2})\s*([A-Z]{1,2})\s*[Xx×]\s*(\d+)/);
    if (m) add(sec, m[1], m[2], +m[3]);
  }
  out.mode = /[WS]$/.test(out.voy) ? 'loading' : (/[EN]$/.test(out.voy) ? 'discharge' : '');
  // 1.43: 항차번호가 없으면 **담당자**로 배를, **글의 낱말**로 모드를 추정한다.
  //   ⚠ 추정한 것은 반드시 표시해서 검수사가 눈으로 확인하게 한다(out.guessed).
  if (!out.vsl) {
    const bySender = forecastVslBySender(text);
    if (bySender) { out.vsl = bySender; out.guessedVsl = true; }
  }
  if (!out.mode) {
    // '긴급선적분'·'선적' 이 있으면 선적, '양하'면 양하. 둘 다면 판단하지 않는다.
    const hasL = /선적/.test(String(text || ''));
    const hasD = /양하|양륙/.test(String(text || ''));
    if (hasL && !hasD) { out.mode = 'loading'; out.guessedMode = true; }
    else if (hasD && !hasL) { out.mode = 'discharge'; out.guessedMode = true; }
  }
  out.date = forecastDate(text);
  if (out.teu) {
    out.teuOk = out.calc.full === out.teu.full && out.calc.empty === out.teu.empty
      && out.calc.luggage === out.teu.luggage;
  }
  return out;
}

// V8.43: 선박 키 별칭 — 같은 배가 BAPLIE(콜사인/IMO)·ASC(약자/서비스코드)·완료저장(vsl 폴백)
//   경로마다 다른 ships/{키}로 갈라지던 것을 정식 키 하나로 수렴시킨다.
//   2026-07-04 Firebase ships 노드 정리(41→27키)와 세트. 백업: /ships_backup_20260704 + 로컬 JSON.
export const SHIP_KEY_ALIAS = {
  OBWH: 'D5MO4', CNYNT: 'D5MO4',        // 연태훼리 OBWH (CNYNT는 항구코드 오염 키)
  RZOR: 'HOAG',                          // RIZHAO ORIENT
  KKLC: 'D5MP9',                         // KMTC LAEM CHABANG
  TNJP: '3E8470',                        // TEN JUPITER
  PCSZ: '9V8012',                        // PACIFIC SHENZHEN
  ATRP: '9388417', D5RR5: '9388417',     // ATLANTIC PIONEER (정식 IMO)
  DONGJINCONTINENTAL: 'DJCT',            // DONGJIN CONTINENTAL (선박명 유령 키)
  V2EE9: '9434450',                      // AS PIA (정식 IMO)
  '9VMY6': '9435038',                    // SEASPAN CALICANTO (정식 IMO)
  SWRG: '9943803', V7A576: '9943803',    // SAWASDEE RIGEL (정식 IMO)
  V7A5451: 'V7A5151',                    // STARSHIP DRACO (콜사인 오타 키)
};

// ships/{키} 저장·조회용 정식 키 변환. 별칭이 아니면 그대로 돌려준다.
export function resolveShipKey(id) {
  const k = String(id || '').toUpperCase().trim();
  return SHIP_KEY_ALIAS[k] || k;
}
// M5.81 변경점 (voucher 사이즈 분류 hotfix):
//   ⚠ 발견: voucher가 LIST의 HC를 40 standard로 잘못 분류 (DPRT 2605N voucher 분석)
//     - NSL "4HDC" → deriveIso 매칭 실패 → iso='' → cn 폴백으로 '40'
//     - DJS "D5" → deriveIso 매칭 실패 → 같은 문제
//   [1] deriveIso 보강: DJS 코드(D2/D5/D4/R2/R5) + NSL 영문(4HDC/20DC/4HRF 등) 인식
//   [2] parseListExcel fallback 매칭 보강: '4HDC' / 'D5' 패턴 추가
//   [3] workingReport.js getSizeKey 정확도 향상:
//        - 42xx만 진짜 '40'으로 분류 (42GP/42G0/42G1/42RE 등)
//        - 그 외 4로 시작은 'HC' (평택 도메인 - 40DC 매우 드묾)
//   [4] cn 폴백 평택 도메인 반영: '40' → 'HC' (모호하면 HC가 안전)
//   효과: NSL 4HDC 108대 + DJS D5 35대 = 143대 모두 정확히 'HC'로 분류
// M5.80 변경점 (AI 강화):
//   [1] Gemini 2.5 Pro → 2.5 Flash (응답 3-10초 → 1초, 무료 1500회/일)
//   [2] RAG: 질문 키워드로 후보 30~50대만 LLM에 전달 (토큰 90% 절감)
//   [3] 멀티턴 대화: 이전 5턴 메모리, 5턴 넘으면 자동 요약 압축
//   [4] systemInstruction 분리 (시스템 프롬프트 + 도메인 지식 + 컨텍스트)
//   [5] askGemini 시그니처 변경: opts { history, shipLib, parsedQuery }
// M5.79 변경점:
//   [1] parseBAPLIE LOC+83(환적항 tspot) + LOC+97/98(최종 목적지 fpod) 추가
//   [2] 빈 cn (EQD+CN++... 평택 부킹) → __BOOK_BAY_ROW_TIER 임시 ID + isBooking 마커
//   [3] DGS+IMD packaging group 추출 (cur.pg)
//   [4] dgUnDict.js 연동 (UN 번호 → 화물명/Class/경고)

// M4.9e 변경점 (선적 실체 위치 1+2+3단계):
//   [1단계] 컨테이너 모달에 "실체 위치 (선적확인 시)" 박스
//          본위치 → 수정위치 입력, firebase에 c.bay_actual 등 별도 저장
//          M3.87 "위치 변경" 버튼 제거 → "수정 위치 입력" 단일 진입점
//   [2단계] 베이그리드/검색에 effective 위치 적용
//          allEdiContainers + containers 양쪽 모두 변환 (베이=검색 동일 동작)
//          ALLOWED_LIST_FIELDS에 actual 위치 필드 추가
//   [3단계] 자리 뺏긴 컨테이너 자동 검출 + 사이드바 표시
//          컨 X가 다른 위치로 이동 → 그 자리 원래 컨 Y는 자리 뺏김
//          DisplacedSidebar에 노란 박스로 표시, 카드 클릭 시 모달 열림
//   [기타] 베이상세 row/tier 동적 (globalRowRange/globalTiers props)
//          카고 플랜 AFT 우측 정렬 (트리오 짝꿍 매칭)
//          "20ft 전용" 단정 라벨 제거 → 단순 "BAY NN"
//          "검수 완료" → "양하확인"/"선적확인" 모드별 라벨
//
// 다음 빌드 예정: PC 마우스 영역 선택 + DnD (보관박스 ↔ 셀)

// M4.9d 변경점 (이전):
//   [수정] 베이 라벨 단순화 — "(20ft 전용)", "(40ft)", "(20ft)" 등 잘못된 단정 라벨 제거
//          사용자 도메인 지식: 선박 BOW/STERN 단독 베이도 40ft(20ft 트윈) 가능
//          → "BAY NN" 또는 "BAY (NN-1)NN" 형태로 단순화
//   [수정] 베이상세 인쇄 좌우 짤림 픽스 — 셀 width: minmax(0, 1fr), min-width: 0
//          폰트 8.5pt → 7.5pt, padding 4px → 2px, tier-label 정리
//          잔재 코드 (이전 변경에서 깔끔히 안 닫힘) 제거
//   [수정] "검수 완료" → mode에 따라 "양하확인" / "선적확인"
//          ContainerDetailModal, BigResultCard, ContainerList 일괄 변경
//
// M4.9c 변경점:
//   [긴급] "출력 시 엄한 화면이 출력됨" 버그 수정
//     · 원인: M4.9b에서 모달 fixed 해제(position: static) → 메인 페이지가 인쇄 캔버스에 함께 그려짐
//     · 해결: 인쇄 표준 패턴(visibility 토글)으로 변경
//       - body * { visibility: hidden } → 모든 컨텐츠 숨김
//       - .bd-print-modal, * { visibility: visible } → 모달만 보임
//       - 모달 위치 absolute로 페이지 좌상단 배치
//   [긴급] 엠티/풀 실 표기 데이터 흐름 수정
//     · 원인: VoyagePage.jsx ALLOWED_LIST_FIELDS 화이트리스트에 'eseal' 등 누락
//             → 검수원이 입력한 실번호가 records에는 저장되지만 화면/보고서로 못 흘러감
//     · 해결: eseal/eseal_wrong/reseal/eseal_at/eseal_by/eseal_history,
//             iso403_photo_ts/iso403_photo_by 모두 화이트리스트에 추가
//   [신규] 실오류/리씰 별도 액션 버튼 (사용자 요청)
//     · ⚠️ 실오류 등록 — 발견된 잘못된 번호 (eseal_wrong, 별도 보존)
//     · 🔄 리씰 등록 — 실 없거나 손상되어 새로 부착한 번호 (reseal)
//
// M4.9b 변경점 (인쇄 가로 + 출력물 샘플 매칭 + 엠티 실 단순화):
//   [수정] PrintableBayDetail @page portrait → landscape
//   [수정] 베이별 페이지 분리 강제 (break-after: page + flex 부모 우회)
//   [수정] 베이 페이지네이션 룰 — 7,8,9 → 07 단독 + (08)09 짝꿍
//   [수정] voyageInfo 체인 연결 + 양하/선적 항차 둘 다 표시
//   [수정] 셀 크기 가로 모드 최적화 (32px → 48px, 폰트 5.5pt → 7pt)
//   [수정] PrintableCargoPlan 그리드 — AFT 페어 행 5열 통일, legend는 footer로
//   [수정] 엠티 실 verify 모드 단순화 (TNJP/RZOR):
//          · 깜빡이는 ⚠️ 경고 메시지 제거 ("실 확인 필요" → "실번호 미입력")
//          · 수정 시 리씰/틀린실 라디오 강제 선택 제거 → 단순 덮어쓰기
//          · 수정 이력은 fbSetEmptySeal에서 자동 저장 (eseal_history)
//          · 신규 "엠티 수정 리포트" 별도 엑셀 — 수정된 것만 출력 (from→to)
//          · 메인 보고서도 단일 엠티실번호 컬럼만 (틀린실/리씰 컬럼 제거)
//
// M4.9 변경점 (긴급 픽스 + ISO403):
//   [긴급] 베이 상세 모달 크래시 수정
//     · PrintableBayDetail.jsx 271줄 useMemo deps의 selectedKey → selectedKeys 오타
//       정의 안 된 변수 참조 → ReferenceError → 컴포넌트 마운트 즉시 크래시
//     · 화면이 사라지고 페이지 리프레시해야 복구되던 증상 해결
//   [방어] formatCellLines 모든 입력 안전 처리 (wt, iso, bay, row, tier 모두 String 변환 후 패딩)
//   [방어] ErrorBoundary 컴포넌트 추가 - PrintableBayDetail 등 위험 영역 래핑
//   [신규] isISO403(c) - 사진 촬영 의무 대상 검출
//     · 4530 류 (4530, 4531~4539): 40ft 리퍼 HC (일부 선사 표준 외 코드)
//     · 9500 류 (9500~9509): 45ft HC (L5)
//     · L5XX 류: 45ft 표기
//     · 정확한 룰은 사용자 검증 필요 - 검출 결과를 화면에 표시해 검수원이 확인
//   [신규] ISO403 사진 추적 - 컨테이너별 photoUrl 저장 (Firebase RTDB)
//     · 미촬영 잔여 카운트 배너 (BayPlan 상단)
//     · 컨테이너 상세 모달 → 📷 ISO403 사진 버튼 (촬영 완료 ✓ 표시)
//
// M4.8 변경점:
//   - splitForeAft 알고리즘 수정 (트리오 [홀,짝,홀] 그룹화 후 중간 분할)
//     · 이전: 첫 갭을 분리점 → TNJP 같이 모든 갭 동일하면 잘못 분할
//     · 수정: 트리오 그룹 갯수의 중간으로 분할
//     · TNJP: 9 트리오 → FORE 5 (1~19) + AFT 4 (21~33) 정확히 매칭
//   - 카고 플랜 셀 사이즈 축소 (1페이지 안에 모두 수용)
//     · bay-cell: 11×9px → 7×6px
//     · 폰트: 7pt → 5pt
//     · 베이 제목: 10pt → 8pt
//   - 베이 상세 셀 사이즈 축소 (페이지 분할 정확)
//     · 셀 높이: 56px → 32px
//     · 폰트: 6pt → 5.5pt
//     · 컨테이너 4-5줄 정보가 셀에 정확히 들어감
//   - 베이 상세 다중 선택 지원 (베이 지정 모드)
//     · 베이 토글 버튼 그리드 (체크 표시)
//     · 전체선택 / 전체해제 버튼
//     · selectedKeys 배열로 변경
//
// M4.7 변경점:
//   - PrintableCargoPlan.jsx 전면 재작성:
//     · 5컬럼 그리드 (FORE 위 / AFT 아래)
//     · AFT 좌하단 legend 박스 (양하: o None / 선적: L LYG + OPT + TTL)
//     · 데크/홀드 5:5 비율 + 굵은 hatch break
//     · 베이 상단 제목 + 카운트 (20'/40'/45')
//     · row 라벨 상하단, tier 라벨 우측
//     · BAY 33/29 같은 deck-only 자동 인식 (작은 박스)
//   - PrintableBayDetail.jsx 전면 재작성:
//     · 베이당 1페이지, 제목 BAY05/(02)03 상단 중앙
//     · 셀 4-5줄 정보 (POL/POD, 컨번호, 선사·F/E·중량·ISO, [IMDG], 위치)
//     · 굵은 hatch break, tier 라벨 우측
//     · 평택 대상 노란 강조
//   - 출력 모드 3종 (베이 상세):
//     · 전체 일괄 (all): 모든 베이
//     · 평택분만 (ptk): PTK 컨테이너 있는 베이만
//     · 베이 지정 (single): 1개 베이 선택 (드롭다운)
//
// M4.6 변경점:
//   - PrintableCargoPlan.jsx 신규: 카고 플랜 1페이지 인쇄 (TNJP25323E.pdf 형식)
//     · 모든 베이를 격자로 표시 (X=일반, o=양하대상, L=선적대상)
//     · A4 가로, 베이당 row×tier 격자 + 카운트 (20'/40'/45')
//   - PrintableBayDetail.jsx 신규: 베이 상세 인쇄 (TNJP25323EBAY.pdf 형식)
//     · 베이당 1페이지, 각 셀에 4줄 정보 (POL/POD, 컨번호, F/E·중량·종류, 위치)
//   - BayPlan.jsx: 📄 플랜 / 📋 베이상세 버튼 2개 추가
//   - 폰에서 "PDF로 저장" 옵션으로 PDF 생성 가능 (브라우저 인쇄 활용)
//
// M4.5 변경점:
//   - BayPlan: .def 베이사전 기반 페이지 구성 (통로 자동 생략)
//     · 이전: 1~maxBay 모두 페이지로 → 통로(04,08,12,...)도 빈 페이지로 표시
//     · 수정: .def 등록된 베이만 페이지로 → 트리오 사이 통로 자동 생략
//   - BayPlan: 빈 베이도 표시 (.def 사전 기반)
//     · 이전: 마지막 컨 이후 빈 베이는 안 그려짐 (TNJP의 베이 33 등)
//     · 수정: .def 사전에 등록된 모든 베이 무조건 페이지 추가, 빈 그리드라도 표시
//   - 통로 정의: .def 베이 리스트에 없는 짝수 = 통로 (gangway). 이전엔 갑판 또는 빈 페이지로 처리
//
// M4.4 변경점:
//   - .def 파일 (CASP SHIP DEFINE FILE) 런타임 파서 추가 (defParser.js)
//   - 사용자 베이사전 (userBayDict.js, localStorage 누적 저장)
//   - mixerUpload: .def 자동 감지 + 처리, 컨테이너 머지 우회
//   - shipStructure: userBayDict 우선 조회 (검증된 M4.4 메서드 우선)
//   - .def-only 업로드도 처리 (컨 없이 베이사전만 등록)
//
// V39 (M4.3) 변경점:
//   - parseBAPLIE: NAD+CA+ 처리 추가 (V37은 NAD+CF만), LOC+76(환적) 처리,
//                  TDT 캐리어 추출, ISO 4500/4200/2500/2200 등 4자리 숫자 코드 매핑,
//                  EQD status 4/5 → F/E 매핑 강화
//   - isoToLabel/isoToPdfLabel: 4자리 숫자 ISO 코드(4500=40HC GP 등) 처리
//   - parseAscFile: 코멘트 라인(***) 무시, NAD 다음 KRPTK 붙은 확장 라인 처리
//   - parseListExcel: 헤더 키워드 대폭 확장(cntno/cont no/cnt#/cntr#/loading list 등),
//                     실번호 키워드 확장(seal#/봉인/sealno1 등), 빈 행 건너뛰기 강화,
//                     fallback 모드 정확도 개선
// V37 출력 필드 100% 호환 (App.jsx 무수정)

export const _storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  remove: (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } },
};

export const SK = {
  inspectors: 'master_inspectors_v1',
  activeInspector: 'master_active_inspector_v1',
  dischargeVoyages: 'discharge_voyages_v1',
  dischargeActive: 'discharge_active_v1',
  dischargeCompleted: 'discharge_completed_v1',
  dischargeXray: 'discharge_xray_v1',
  dischargeXraySeals: 'discharge_xray_seals_v1',
  loadingVoyages: 'loading_voyages_v1',
  loadingActive: 'loading_active_v1',
  loadingCompleted: 'loading_completed_v1',
  // M4.2: 인사말 하루 1회 — 마지막 인사 날짜(YYYY-MM-DD) 저장
  lastGreetingDay: 'master_last_greeting_day_v1',
  // M6.14d: 검수원 본인 Gemini API 키 (localStorage)
  //   M5.70에 패턴만 있고 SK 정의 누락되어 실제로는 작동 안 했던 버그 수정.
  //   검수원이 폰에서 직접 입력 → 노출 차단되어도 5초 내 본인이 새 키 입력해서 복구.
  geminiKey: 'master_gemini_api_key_v1',
  geminiKeyLast6: 'master_gemini_api_key_last6_v1',   // 확인용 마지막 6자리 (UI 표시)
};

// === Helpers ===
// M3.1: bay 정규화 — EDI는 BBBRRTT 7자리지만 검수원 표시는 ##-##-## 형식
// "016" → "16", "001" → "1", "100" → "100" (3자리 베이는 보존)
export const normalizeBay = (b) => {
  if (b === null || b === undefined || b === '') return '';
  const s = String(b).trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? '' : String(n);
};

// 위치 표시: ##-##-## 형식 (베이 1자리는 0 padding, row/tier는 2자리 그대로 텍스트)
// M3.85: 베이 단위 자리수 보장 — bay=1 → "01", bay=16 → "16", bay=100 → "100"
//   row/tier는 EDI에서 이미 2자리 substring으로 저장 ("00", "04", "82" 등 텍스트)
export const fmtPos = (c) => {
  if (!c) return '';
  // V9.56: 배가 자기 표기법을 가지고 있으면 그걸 쓴다.
  //   RZOR 같은 RO/RO 겸용선은 베이 번호가 없고 도면이 "D덱 3줄 5칸"으로 되어 있다.
  //   내부 좌표(bay/row/tier)는 검색·정렬용으로 그대로 두되, **사람에게 보일 때는 도면 말**로.
  //   (덱플랜 파서가 pos 를 넣어 준다 — collector/deckplan.py · src/rzorPlan.js)
  if (c.pos) return String(c.pos);
  if (!c.bay) return '';
  const b = normalizeBay(c.bay);  // "1", "16", "100"
  const bayPad = b.length === 1 ? '0' + b : b;  // 2자리 강제
  return `${bayPad}-${c.row || '00'}-${c.tier || '00'}`;
};

// M3.1: 한국어 음성 읽기 헬퍼 — "16-01-86" → "십육번 베이 공일에 팔육"
// 베이 = 한국어 정수 (16 → 십육), row/tier = 자릿수별 (01 → 공일, 86 → 팔육)
const KR_DIGIT = ['공','일','이','삼','사','오','육','칠','팔','구'];
const sinoKorean = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '';
  if (n === 0) return '공';
  if (n < 10) return KR_DIGIT[n];
  if (n < 20) return n === 10 ? '십' : '십' + KR_DIGIT[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return KR_DIGIT[t] + '십' + (r === 0 ? '' : KR_DIGIT[r]);
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return (h === 1 ? '백' : KR_DIGIT[h] + '백') + (rest === 0 ? '' : sinoKorean(rest));
  }
  return String(n);
};
const spellDigits = (s) => {
  if (!s) return '';
  return String(s).split('').map(d => {
    const n = parseInt(d, 10);
    return isNaN(n) ? d : KR_DIGIT[n];
  }).join('');
};
// V9.57: spellPos(개별 컨 → 음성) 삭제 — 저장소 전체 grep 참조 0 (voice.js는 spellPosString만 사용).
// 좌표 문자열("16-01-86")을 음성용으로 변환 (AI 답변 후처리에 사용)
export const spellPosString = (str) => {
  if (!str) return '';
  // "16-01-86" 또는 "016-01-86" 패턴 매칭
  return String(str).replace(/(\d{1,3})-(\d{2})-(\d{2})/g, (m, b, r, t) => {
    const bayN = parseInt(b, 10);
    if (isNaN(bayN)) return m;
    return `${sinoKorean(bayN)}번 베이 ${spellDigits(r)}에 ${spellDigits(t)}`;
  });
};

export const formatWt = (wt) => {
  if (!wt) return '0kg';
  if (wt > 1000) return `${(wt/1000).toFixed(1)}t`;
  return `${wt}kg`;
};

export const isoToLabel = (iso) => {
  if (!iso) return '';
  let p = String(iso).toUpperCase().trim().replace(/\s+/g, '');
  // V8.98-10: 엠티/풀 마커 복원 — 공컨정규화(utils 993/1131/2051)로 끝자리가 E/F가 된
  //   숫자 ISO를 원 숫자로 되돌려 규격판정. 450E→4500, 453E→4530, 950E→9500.
  //   (loadingEdiExport numericIso/ediIso의 /^\d{3}E$/ 복원과 동일 소스. 없으면 453E→'403' 오탐)
  if (/^\d{3}[EF]$/.test(p)) p = p.slice(0, 3) + '0';
  if (/^95\d\d$/.test(p)) return '45HC';   // V8.98-10: 9500/9530 = 45피트 숫자표기(numericIso 대응) → 45HC (복원된 950E 포함)
  if (p === '2280') return '20HC';   // 2.08-06: OBWH 실측 — CLL «BC20»·EDI 228E(→2280), 발신 카톡 «하이큐 엠티 1대 ZXJU0130421» 명시. 구 숫자코드 둘째자리 8 = 9'6" HC.

  // M3.6: ISO 6346 정확 해석
  // 첫 자리: 길이 (2=20ft, 4=40ft, L=45ft)
  // 둘째 자리: 높이 (0,2=8'6"표준, 5=9'6"Hi-Cube)
  // 셋째 자리: 타입 (G=GP, R=Reefer, P=Platform/FR, U=OT, T=Tank, B=Bulk)
  //
  // 주의:
  //   45G0/45G1 = 40피트 Hi-Cube (45가 45피트 아님!)
  //   45R0/45R1 = 40피트 Hi-Cube Reefer
  //   L5G0/L5G1 = 45피트 GP
  //   L5R0/L5R1 = 45피트 Reefer

  // === 45피트 컨테이너 (첫 자리 = L) ===
  // 현실: 45피트는 GP/HC(드라이)만 존재. 리퍼/FR/OT/TK 컨테이너는 없음.
  // 잘못된 표기(L5R 등)도 45HC로 처리 (검수원이 현장에서 실물 재확인)
  if (/^L[0-9]/.test(p) || /^L[GRPUT]/.test(p)) {
    return '45HC';   // L5G0, L5G1, L5HC 등 = 45피트 드라이
  }

  // === 40피트 Hi-Cube (4500-4699 숫자 + 45GX/45RX 알파벳) ===
  // 4500=40HC, 4582=40RF, 4583=40FR, 4590=40OT
  if (/^45[0-9][0-9]$/.test(p)) {
    if (/^458[3-4]$/.test(p)) return '40FR';   // 4583/4584 = FR (먼저 좁은 범위)
    if (/^458[25]$/.test(p)) return '40RH';    // 4582/4585 = HC 리퍼 — 1.99: 선사 제출 형식(40RH)
    if (/^453/.test(p)) return '40RH';         // V8.98-13/1.99: 4530류 = 40HC 리퍼 → 제출 형식 40RH
    if (/^459/.test(p)) return '40OT';
    return '40HC';   // 4500, 4510 등
  }
  // === 46XX (4로 시작 = 40피트, 잘못된 표기) ===
  // M3.6: ISO 6346 표준상 4XXX는 무조건 40피트. 45피트는 L 시작이어야 함.
  if (/^46/.test(p)) {
    return '40HC';
  }
  // 알파벳 형식: 4로 시작하면 무조건 40피트
  //   45RF/45HC/45GP (신표기) → 모두 40피트 (4=40ft 원칙)
  //   45R0/45R1/45G0/45G1 (ISO 6346) → 40HC/40RF
  if (/^45RF/.test(p)) return '40RH';   // 1.99: 45xx = 하이큐브 그룹
  if (/^45HC/.test(p)) return '40HC';
  if (/^45GP/.test(p)) return '40HC';
  if (/^45[GRPU]/.test(p)) {
    if (/^45P/.test(p)) return '40FR';
    if (/^45U/.test(p)) return '40OT';
    if (/^45R/.test(p)) return '40RH';
    return '40HC';
  }

  // === V38 신규: 4자리 숫자 ISO 코드 (4200, 4210, 2200, 2280 등) ===
  if (/^42[0-9][0-9]$/.test(p)) {
    if (/^428[3-4]$/.test(p)) return '40FR';   // 4283/4284 먼저 (좁은 범위)
    if (/^428[25]$/.test(p)) return '40RF';
    return '40DC';
  }
  if (/^25[0-9][0-9]$/.test(p)) return '20DC';   // 25xx (20HC) = 20DC fallback
  if (/^26[0-9][0-9]$/.test(p)) return '20HC';   // 1.55-01: 26xx = 20ft 하이큐브 숫자표기(2697E ZXJU0130463 실측 — tallyReport 하이큐브 계상과 동일 판정). 종전엔 fallback '20DC'로 떨어져 리스트 '20HC'와 헛불일치.
  if (/^22[0-9][0-9]$/.test(p)) {
    if (/^228[3-4]$/.test(p)) return '20FR';   // 2283/2284 = FR (먼저 좁은 범위)
    if (/^228[25]$/.test(p)) return '20RF';    // 2282/2285 = RF
    if (/^223/.test(p)) return '20RF';         // V8.98-13: 2230류 = 20ft 리퍼(ISO6346 냉동군)
    if (/^227/.test(p)) return '20TK';         // 1.55-01: 227x = 20ft 탱크 숫자표기(구 ISO 타입 7=탱크 — 파서 t==='7' 판정과 동일). ATPR 2637W 실측 2270/22TN 헛불일치 2건.
    return '20DC';
  }

  // === 알파벳 형식 - 40피트 Standard Height ===
  if (/^40HR/.test(p)) return '40RH';   // 1.99: HR = HC 리퍼
  if (/^44R/.test(p)) return '40RH';   // 1.99: 44 = 40HC 그룹
  if (/^42R/.test(p)) return '40RF';   // 42 = 40 표준높이 — 40RF 유지
  if (/^40R/.test(p)) return '40RF';
  if (/^40F[PR]/.test(p)) return '40FR';
  if (/^4[24]P/.test(p)) return '40FR';
  if (/^4[24]O/.test(p)) return '40OT';
  if (/^40O/.test(p)) return '40OT';
  if (/^4[24]U/.test(p)) return '40OT';
  if (/^40T/.test(p)) return '40TK';
  if (/^4[24]T/.test(p)) return '40TK';
  if (/^40HC/.test(p)) return '40HC';
  if (/^4[24]H/.test(p)) return '40HC';
  if (/^43R/.test(p)) return '40RH';   // V9.28-09/1.99: 연운항 43류 = 40HC 리퍼 → 40RH
  if (/^43/.test(p)) return '40HC';
  if (/^40[DG]/.test(p)) return '40DC';
  if (/^44G/.test(p)) return '40HC';   // 1.55-01: 44Gx = 40ft HC급 높이(세관맵 '44GP':'45G1' 과 동일 판정). 종전 42와 한 묶음 40DC라 EDI 45G1과 헛불일치.
  if (/^42[G][P0-9]/.test(p)) return '40DC';

  if (/^20R/.test(p)) return '20RF';
  if (/^2[02][R]/.test(p)) return '20RF';
  if (/^20H/.test(p)) return '20HC';
  if (/^2[25]H/.test(p)) return '20HC';
  if (/^20F[PR]/.test(p)) return '20FR';
  if (/^2[02][P]/.test(p)) return '20FR';
  if (/^20O/.test(p)) return '20OT';
  if (/^2[02][U]/.test(p)) return '20OT';
  if (/^20T/.test(p)) return '20TK';
  if (/^2[02][T]/.test(p)) return '20TK';
  if (/^20[GD]/.test(p)) return '20DC';
  if (/^2[02][G][P0-9]/.test(p)) return '20DC';

  // fallback
  if (p[0] === '4') {
    const t = p[2];
    if (t === 'R') return '40RF';
    if (t === 'P' || t === 'F') return '40FR';
    if (t === 'O' || t === 'U') return '40OT';
    if (t === 'T') return '40TK';
    if (t === 'V') return '40VH';   // V9.21-01: 통풍컨(Ventilated) — 터미널은 DC 취급 (OBWH 2699E 22V7 실측)
    if (t === 'H') return '40HC';
    if (t === 'G' || t === 'D') return '40DC';
    if (t === '0') return '40HC';   // V38: 4500 → 40HC fallback
    return '40' + (t || '?');
  }
  if (p[0] === '2') {
    const t = p[2];
    if (t === 'R') return '20RF';
    if (t === 'P' || t === 'F') return '20FR';
    if (t === 'O' || t === 'U') return '20OT';
    if (t === 'T') return '20TK';
    if (t === 'V') return '20VH';   // V9.21-01: 통풍컨 — PNCT 조회 시 20/DC(2210)로 표기
    if (t === 'H') return '20HC';
    if (t === 'G' || t === 'D') return '20DC';
    if (t === '0') return '20DC';
    return '20' + (t || '?');
  }
  // M3.6: 알 수 없는 표기 → 그대로 반환 (UI에서 ⚠️ 마킹 + 사진 보고 유도)
  return p;
};

// M3.6: ISO 코드가 알려진 규격으로 변환되는지 확인
// 변환 안 되거나 ?가 포함되면 "미지" 표기 → 검수원이 현장 확인 + 사진 필요
export const isUnknownIso = (iso) => {
  if (!iso) return false;
  const label = isoToLabel(iso);
  if (!label) return true;
  // 정상 변환된 라벨 화이트리스트
  const known = new Set([
    '20DC', '20HC', '20RF', '20FR', '20OT', '20TK',
    '40DC', '40HC', '40RF', '40RH', '40FR', '40OT', '40TK',
    '45HC', '45GP',
    '20VH', '40VH',   // V9.21-01: 통풍컨(Ventilated) — 알려진 규격

  ]);
  if (known.has(label)) return false;
  // ?가 포함되거나 알 수 없는 길이/타입
  if (label.includes('?')) return true;
  // 라벨이 정확한 형식 (XXYY, XX 길이 + YY 타입)이 아니면 미지
  if (!/^(20|40|45)[A-Z]{2}$/.test(label)) return true;
  return false;
};

// M3.79+M3.85: 통합 리퍼 판정 헬퍼
//   목표: EDI/ASC/리스트 어떤 양식으로 ISO가 들어오든 정확히 리퍼만 식별
//   ISO 6346에서 리퍼 표기:
//     - "20RF", "40RF", "22RE", "45RE" (정식 표준)
//     - "45R0", "45R1", "22R5" 등 ([2]='R', [3]=숫자/문자)
//     - "40HR", "20HR" (ASC m2 변형 - H+R)
//     - "RFHC", "RFHQ", "RF20" (ASC m4 4글자 tp)
//     - "4582"~"4585", "2282"~"2285" (4자리 숫자 코드)
//   M3.85 fix: FR(Flat Rack)이 R로 끝나서 리퍼로 잘못 인식되던 버그 잡음
//     - "20FR", "40FR", "FR" 등은 리퍼 아님
//     - 안전한 정확 패턴만 사용 (광범위한 /R[FE]?$/ 제거)
export function isReeferIso(iso) {
  if (!iso) return false;
  const upper = String(iso).toUpperCase().trim();
  // (1) "RF" 또는 "RE"로 시작 (RFHC, RFHQ, RF20, RE20 등 ASC tp 형식)
  if (/^R[FE]/.test(upper)) return true;
  // (2) 4자리 숫자 코드 (4582/4585=40RF, 2282/2285=20RF) - ISO 표준 변형
  //     주의: 끝자리 2·5만 리퍼. 끝자리 3·4(4583/4584)는 FR(플랫랙)이므로 제외.
  if (/^[24]58[25]$/.test(upper)) return true;
  // (2b) V8.98-12: 숫자 ISO 냉동코드 — 3번째 자리='3'(ISO6346 냉동군). 4530/2230/9530 + 엠티 453E·풀 453F.
  //     numericIso(40RF→4530) 대응. 4583/4584(FR)는 3번째='8'이라 미해당. 카고플랜 공컨 리퍼 R/E 복구.
  if (/^(22|45|95)3[0-9EF]$/.test(upper)) return true;
  // (3) "[2]가 R" 패턴: 4자리 ISO 표준 (45R0, 22R5, 40RF, 22RE 등)
  //     [0]은 길이코드(2/4), [1]은 높이코드, [2]='R', [3]=문자/숫자
  if (/^[24][0234568L9]R[A-Z0-9]?$/.test(upper)) return true;   // V9.28-09: 높이코드 '3' 포함 (43RF — FR 충돌 없음: 4583/4584는 [2]='8')
  // (4) "40HR", "20HR" (ASC m2 변형: H+R 패턴) - 4글자만 인정
  if (/^[24]0HR$/.test(upper)) return true;
  // 정밀: isoToLabel 결과로 판단 (위 패턴이 못 잡은 변형도 정규화로 잡음)
  const lbl = isoToLabel(upper);
  if (!lbl || lbl === upper) return false;  // 정규화 실패/그대로면 false (안전)
  return lbl.endsWith('RF') || lbl.endsWith('RE');
}

// 통합 컨테이너 종류 판정 (rf 플래그 + ISO 모두 검사)
export function isReeferContainer(c) {
  if (!c) return false;
  if (c.rf) return true;
  return isReeferIso(c.iso);
}

// V8.98-11: 엠티 실 리스트 전용 규격 표기 — 20E / 45GE / 45RE (사용자 확정 형식)
//   메인플랜 TpSz 대응: DC20→20E, DCHC→45GE(40HC 드라이), RFHC→45RE(40HC 리퍼).
//   리퍼 판별은 숫자 ISO 냉동코드(3번째 자리='3', 예 4530) 기준 — 이 리스트 표기 안에서만(전역 isoToLabel 미변경).
export function emptySealSpec(c) {
  if (!c) return '-';
  const raw = String(c.iso || '').toUpperCase().trim().replace(/\s+/g, '');
  if (!raw) return '-';
  const num = /^\d{3}[EF]$/.test(raw) ? raw.slice(0, 3) + '0' : raw;   // 엠티마커 복원(453E→4530)
  const reefer = isReeferContainer(c) || isReeferIso(num) || /^\d\d3\d$/.test(num);
  const twenty = /^2/.test(num) || (isoToLabel(num) || '').startsWith('20');
  if (twenty) return reefer ? '20RE' : '20E';
  return reefer ? '45RE' : '45GE';   // 40ft/40HC → 45xE
}

// M5.79: 부킹 슬롯(컨번호 미입력) 판정
//   parseBAPLIE에서 EQD+CN++... 빈 컨번호 → __BOOK_ 임시 ID 부여
//   검수원이 현장에서 컨번호 입력하면 isBooking=false, cn=실제 번호로 교체
export function isBookingSlot(c) {
  if (!c) return false;
  if (c.isBooking === true) return true;
  if (c.pendingCn === true) return true;
  if (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_')) return true;
  if (typeof c.cn === 'string' && c.cn.startsWith('__SLOT_')) return true;   // V8.86: 컨번호 미지정 실자리(터미널 PRE)도 대기 슬롯 표시
  return false;
}

// V9.57: bookingLabel 삭제 — 저장소 전체 grep 참조 0 (화면은 isBookingSlot 판정 후 문구를 직접 렌더).

// M4.9 → V9.04-04: 풀 리퍼 사진 촬영 대상 검출 (구 ISO403 — 식별자·저장키는 호환 위해 유지)
//   사용자 정의: "리퍼 L5 포함" + "26대" (TNJP 26334W 기준)
//   EDI 분석 결과 패턴:
//     - 4530 류 (4530~4539): 40ft 리퍼 HC (일부 선사가 표준 외 코드로 사용)
//     - 9500 류 (9500~9509): 45ft HC (L5G1 등을 4자리 숫자로 변환한 코드)
//     - L5XX 류 (L5G0, L5G1, L5HC 등): 45피트 표기
//   주의: 실제 룰은 선사/항만별 다를 수 있음. 검출 결과를 화면에 표시해
//         검수원이 1차 확인 후 사진 촬영하도록 함.
export function isISO403(c) {
  if (!c) return false;
  if (c.rfdry) return false;   // V9.20-03: 리퍼드라이(넌플러그) — 온도 확인 불필요, 사진 대상 아님
  if (c.mkcon) return false;   // V9.23: 제작컨테이너 — 컨 자체가 상품(내용물 없음), 온도·사진 대상 아님
  // V9.04-04: 목적 정정 — '규격 확인'이 아니라 '풀 리퍼 온도 확인 사진'(사용자 확정 2026-07-19).
  //   기존 규칙은 4530·9530·L5R 코드만 봐서 두 가지가 어긋나 있었다.
  //   ① 20ft 리퍼(2230류)를 통째로 빠뜨림 — 온도 확인이 목적이면 당연히 대상이어야 한다.
  //   ② 4530처럼 규격이 확정되는 코드에도 'ISO403(규격) 확인' 알림을 보내, 리퍼·풀인 걸
  //      이미 아는 검수원이 왜 찍으라는지 알 수 없었다(DJCF 0148N 화면 25대 전부 4530).
  //   유래: M4.9 주석의 "사용자 정의 '리퍼 L5 포함' + '26대'(TNJP 26334W 기준)" — 의도가 아니라
  //   한 항차 숫자에 맞춘 규칙이었다. 규격 표기 대조는 별건(EDI↔리스트 규격 비교, 미구현).
  //   실측 근거(DJCF 0148N · DJCF0149SINC.EDI 689대): 4530 46대 + 2230 7대 = 냉동군 53대, Empty 0건.
  //   대상 = 리퍼 && 풀. 엠티는 화물이 없어 온도 확인이 불필요하므로 제외(사용자 확정 2026-07-19).
  const code = String(c.iso || '').toUpperCase().trim().replace(/\s+/g, '');
  //   ※ isReeferIso는 L5R 계열(45ft 리퍼 알파표기)을 인식하지 못한다 — 기존 ISO403 규칙에만 있던
  //     조건이라 그대로 보존한다(시뮬에서 L5R1 회귀로 검출). isReeferIso 자체 확장은 전역 리퍼 판정
  //     (온도 미입력 체크·카고플랜 R 표기)에 영향이 있어 별건으로 둔다.
  if (!isReeferContainer(c) && !/^L5R/.test(code)) return false;
  if (c.fe === 'E') return false;   // 앱 표준 F/E 판정('E'만 엠티, 그 외 풀 — utils 2389·2424 동일)
  if (/^\d{3}E$/.test(code)) return false;   // 공컨 정규화 마커(453E·223E·953E) — fe 누락분 보강
  return true;
}

// M4.9: 컨테이너 사진 촬영 완료 여부 판정
//   c.iso403_photo_url 또는 c.iso403_photo_ts가 있으면 촬영 완료
export function isISO403PhotoTaken(c) {
  if (!c) return false;
  return !!(c.iso403_photo_url || c.iso403_photo_ts);
}

export const isoToPdfLabel = (iso, tp) => {
  if (tp && tp.length >= 3) return tp.toUpperCase().trim();
  const lbl = isoToLabel(iso);
  if (!lbl) return '';
  if (lbl === '20DC') return 'DC20';
  if (lbl === '40DC') return 'DC40';
  if (lbl === '40HC') return 'DCHC';
  if (lbl === '20RF') return 'RF20';
  if (lbl === '40RH') return 'RFHC';   // 1.99: HC 리퍼
  if (lbl === '40RF') return 'RF40';   // 표준높이 리퍼
  if (lbl === '20TK') return 'TK20';
  if (lbl === '40TK') return 'TK40';
  if (lbl === '20FR') return 'FR20';
  if (lbl === '40FR') return 'FR40';
  if (lbl === '20OT') return 'OT20';
  if (lbl === '40OT') return 'OT40';
  return lbl;
};

export const isoCategory = (iso) => {
  const lbl = isoToLabel(iso);
  if (!lbl) return '?';
  if (lbl === '20DC' || lbl === '20GP') return '20DC';
  if (lbl === '40DC' || lbl === '40GP') return '40DC';
  if (lbl === '40HC') return '40HC';
  if (lbl.endsWith('RF')) return 'RF';
  if (lbl.endsWith('TK')) return 'TK';
  if (lbl.endsWith('FR')) return 'FR';
  if (lbl.endsWith('OT')) return 'OT';
  return lbl;
};

// === BAPLIE EDI Parser (V38 강화) ===
// 표준 EDIFACT D.95B SMDG22.
// V38 변경: NAD+CA 추가, LOC+76 처리, TDT carrier, 4자리 숫자 ISO 매핑,
//           status 4=Empty/5=Full 매핑 강화 (현장 BAPLIE 통상)
// M5.87: TDT 세그먼트에서 callsign(호출부호) 자동 추출
//   예: TDT+20+2604N+++:172:20+++V7A576:103::SAWASDEE RIGEL
//        → callsign='V7A576', vsl='SAWASDEE RIGEL'
// CASP/CKL 계열 숫자코드 BAPLIE 파서 (V8.05).
//   세그먼트: '00:BAPLIE:BAYPLAN:..., 10:콜사인:선박명:국가:항차:::ETD:ETA:POL...,
//             50:컨번호:ISO:F/E:위치7자리(BBBRRTT):...:무게:..:선사:.., 52:POL::POD::FPOD:::
//   표준 parseBAPLIE와 동일한 반환 구조({vsl,voy,pol,callsign,containers,errors})로 맞춤.
// TallyOne 1.57: EDI 원문에 실린 컨테이너 등장 순번을 남긴다 (`eseq`).
//   검수사 확정 2026-08-13 — "연속으로 EDI대로 선적할 때는 그게 우선입니다."
//   유도 큐가 '지금 EDI 순번대로 가고 있는가'를 판단하려면 원문 순서가 필요한데,
//   RTDB `ediContainers` 는 컨번호 키 맵이라 배열 순서가 남지 않는다 → 필드로 박아야 보존된다.
//   파서 네 벌(BAPLIE·숫자코드 BAPLIE·IFCSUM·ASC)이 전부 이 한 벌을 거친다.
export function stampEdiSeq(result) {
  if (Array.isArray(result?.containers)) result.containers.forEach((c, i) => { if (c) c.eseq = i; });
  return result;
}

export function parseNumericBAPLIE(ediText) {
  const result = { vsl: '', voy: '', pol: '', etd: '', eta: '', carrier: '', callsign: '', containers: [], errors: [] };
  const text = ediText.replace(/\r?\n/g, '');
  const segs = text.split("'").map(s => s.trim()).filter(Boolean);
  let cur = null;
  for (const seg of segs) {
    const p = seg.split(':');
    const tag = p[0];
    if (tag === '10') {
      // 10:콜사인:선박명:국가:항차:::ETD:ETA:POL::...
      result.callsign = (p[1] || '').trim().toUpperCase();
      result.vsl = (p[2] || '').trim();
      result.voy = (p[4] || '').trim();
      result.etd = (p[7] || '').trim();
      result.eta = (p[8] || '').trim();
      result.pol = (p[9] || '').trim();
    } else if (tag === '50') {
      if (cur) result.containers.push(cur);
      const cn = (p[1] || '').replace(/[\s\-]/g, '').toUpperCase();
      const iso = (p[2] || '').toUpperCase();
      const st = (p[3] || '').trim().toUpperCase();
      const loc = (p[4] || '').trim();
      const wt = parseInt(p[14] || '0', 10) || 0;
      const op = (p[16] || '').trim();
      cur = {
        cn, l4: cn ? cn.slice(-4) : '', iso, tp: '',
        fe: st === 'E' ? 'E' : 'F',
        pol: '', pod: '', npod: '', tspot: '', fpod: '',
        wt, wtt: wt ? 'WT' : '',
        bay: '', row: '', tier: '',
        op,
        dg: false, dgc: '', un: '', pg: '',
        rf: false, fr: false, tk: false, oog: false,
        sl: '', sh: '', bl: '',
        tmp: '', st,
        isBooking: false, pendingCn: false,
      };
      // 위치 7자리 BBBRRTT
      if (loc.length >= 7) {
        cur.bay = normalizeBay(loc.substring(0, 3));
        cur.row = loc.substring(3, 5);
        cur.tier = loc.substring(5, 7);
      } else if (loc.length === 6) {
        cur.bay = normalizeBay(loc.substring(0, 2));
        cur.row = loc.substring(2, 4);
        cur.tier = loc.substring(4, 6);
      }
      // ISO 타입 → 특수 컨 플래그 (표준 파서와 동일 규칙)
      // V9.57: 표준 파서(F1)와 동일하게 숫자/알파벳 분기 — 숫자코드 EDI(CASP 2270 탱크·4583 FR 등)는
      //   기존에 rf 외 특수 태깅이 통째로 빠져 있었다(복제 블록 누락 교정, 3금지①).
      if (iso.length >= 3) {
        const t = iso[2];
        if (t >= '0' && t <= '9') {
          if (t === '3' || t === '4') cur.rf = true;
          else if (t === '5') cur.oog = true;
          else if (t === '6') { cur.fr = true; cur.oog = true; }
          else if (t === '7') cur.tk = true;
        } else {
          if (t === 'R') cur.rf = true;
          if (t === 'U' || t === 'O') cur.oog = true;
          if (t === 'T') cur.tk = true;
          if (t === 'P' || t === 'F') { cur.fr = true; cur.oog = true; }
        }
      }
      if (/^[24]58[25]$/.test(iso)) cur.rf = true;
      if (/^[24]59/.test(iso)) cur.oog = true;
      if (/^[24]58[34]$/.test(iso)) { cur.fr = true; cur.oog = true; }
      if (!cur.rf && isReeferIso(iso)) cur.rf = true;
      // V9.06-04: 숫자코드 50 세그먼트 온도 필드(:C:온도:) 추출 — TNJP 26352E 실측
      //   (리퍼 37대 전건 온도X 오경보). 표준 파서 TMP+2와 동일 정규화("-018"→"-18", 0°C는 실온도).
      if ((p[5] || '').trim().toUpperCase() === 'C' && (p[6] || '').trim() !== '') {
        let norm = (p[6] || '').trim();
        const m = norm.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
        if (m) norm = (m[1] || '') + (m[2] === '' ? '0' : m[2]);
        cur.rf = true;
        cur.tmp = norm;
      }
    } else if (tag === '52' && cur) {
      // 52:POL::POD::FPOD:::  (예: CNSHA::KRPTK::KRPTK:::)
      cur.pol = (p[1] || '').trim();
      cur.pod = (p[3] || '').trim();
      cur.fpod = (p[5] || '').trim();
    }
  }
  if (cur) result.containers.push(cur);
  if (result.containers.length === 0) result.errors.push('숫자코드 BAPLIE: 컨테이너(50 세그먼트)를 찾지 못했습니다.');
  return stampEdiSeq(result);
}

// RIZHAO 계열 숫자코드 IFCSUM(매니페스트) 파서 (V8.06).
//   RIZHAO ORIENT 등 RORO/LOLO 혼용선은 BAPLIE 대신 IFCSUM으로 컨테이너 명세만 제공한다.
//   베이 위치가 없으므로(LOLO 작업은 베이 좌표 무의미) 컨테이너 목록만 읽어 리스트로 쓴다.
//   세그먼트: 00:IFCSUM:MANIFEST..., 10:콜사인:선박명:국가:항차:::ETD:ETA::POL,
//             12:B/L:::::POL국가:POL:..., 13:POD코드:POD명:..., 47:품명,
//             51:순번:컨번호:실번호:ISO텍스트:F/E:개수:중량:::CBM
//   같은 컨번호가 여러 51로 나오면(B/L split) 1대로 병합(중량 합산·품명 병기) — 검수는 물리 1대 기준.
//   ISO는 '40HC'/'40RH'/'45HC'/'40FR'/'20GP'/'20RF' 텍스트라 표준 ISO로 정규화 후 기존 로직 재사용.
//   (45HC=L5=진짜 45피트. 40RH=40피트 HC 리퍼=40RF. 40FR은 cat 기준으로 fr 판정, reefer 오탐 방지.)
export function parseNumericIFCSUM(ediText) {
  const ISO_MAP = { '40HC':'4500', '40RH':'45R1', '45HC':'L5G1', '40FR':'42P3', '20GP':'2200', '20RF':'20RF' };
  const result = { vsl:'', voy:'', pol:'', etd:'', eta:'', carrier:'', callsign:'', containers:[], errors:[] };
  const text = ediText.replace(/\r?\n/g, '');
  const segs = text.split("'").map(s => s.trim()).filter(Boolean);
  let curBL = '', curPOL = '', curPOD = '', curDesc = '';
  const byCn = new Map();
  for (const seg of segs) {
    const p = seg.split(':');
    const tag = p[0];
    if (tag === '10') {
      result.callsign = (p[1] || '').trim().toUpperCase();
      result.vsl = (p[2] || '').trim();
      result.voy = (p[4] || '').trim();
      result.etd = (p[7] || '').trim();
      result.eta = (p[8] || '').trim();
      result.pol = (p[10] || '').trim();
    } else if (tag === '12') {
      curBL = (p[1] || '').trim();
      curPOL = (p[7] || '').trim();
      curDesc = '';
    } else if (tag === '13') {
      curPOD = (p[1] || '').trim();
    } else if (tag === '47') {
      if (!curDesc) curDesc = (p[1] || '').trim();
    } else if (tag === '51') {
      const cn = (p[2] || '').replace(/[\s\-]/g, '').toUpperCase();
      if (!cn) continue;
      const sl = (p[3] || '').trim().toUpperCase();
      const ediIso = (p[4] || '').trim().toUpperCase();
      const std = ISO_MAP[ediIso] || ediIso;
      const fe = (p[5] || '').trim().toUpperCase() === 'E' ? 'E' : 'F';
      const wt = parseInt(p[7] || '0', 10) || 0;
      if (byCn.has(cn)) {
        // B/L split: 물리 1대 → 병합(중량 합산, 품명·B/L 병기)
        const ex = byCn.get(cn);
        ex.wt += wt;
        if (curDesc && !ex.desc.includes(curDesc)) ex.desc += ' / ' + curDesc;
        if (curBL && !ex.bl.includes(curBL)) ex.bl += ',' + curBL;
        continue;
      }
      const cat = isoCategory(std);
      const cur = {
        cn, l4: cn.slice(-4), iso: std, ediIso, tp: '',
        fe, pol: curPOL, pod: curPOD, npod: '', tspot: '', fpod: '',
        wt, wtt: wt ? 'WT' : '',
        bay: '', row: '', tier: '',
        op: '',
        dg: false, dgc: '', un: '', pg: '',
        rf: false, fr: false, tk: false, oog: false,
        sl: fe === 'F' ? sl : '', eseal: fe === 'E' ? sl : '', reseal: '',
        bl: curBL, desc: curDesc,
        tmp: '', st: fe,
        isBooking: false, pendingCn: false,
      };
      // 특수 컨 판정은 cat 기준 (40FR이 표준코드 4583으로 매핑되며 isReeferIso 오탐하는 것 방지)
      if (cat === 'RF') cur.rf = true;
      else if (cat === 'FR') { cur.fr = true; cur.oog = true; }
      else if (cat === 'OT') cur.oog = true;
      else if (cat === 'TK') cur.tk = true;
      byCn.set(cn, cur);
    }
  }
  result.containers = [...byCn.values()];
  if (result.containers.length === 0) result.errors.push('숫자코드 IFCSUM: 컨테이너(51 세그먼트)를 찾지 못했습니다.');
  return stampEdiSeq(result);
}

// TallyOne 1.70: BAPLIE 컨 한 대의 빈 틀 — LOC+147(자리 있음)과 EQD+CN(자리 없는 COPRAR) 두 시작점이
//   같은 틀을 써야 한다. 복제하면 한쪽만 고쳐진다(작업표준 §2-2-D).
function newBaplieCont() {
  return {
    cn: '', l4: '', iso: '', tp: '', fe: 'F',
    pol: '', pod: '', npod: '',           // npod = next POD (LOC+76)
    tspot: '',                             // M5.79: 환적항 (LOC+83)
    fpod: '',                              // M5.79: 최종 목적지 (LOC+97 또는 LOC+98)
    wt: 0, wtt: '',
    bay: '', row: '', tier: '',
    op: '',
    dg: false, dgc: '', un: '', pg: '',   // M5.79: pg = packaging group
    rf: false, fr: false, tk: false, oog: false,
    sl: '', sh: '', bl: '',
    tmp: '',
    st: '',                                // V38: raw status code
    isBooking: false,                      // M5.79: 평택 부킹 슬롯 (컨번호 미입력)
    pendingCn: false,                      // M5.79: 컨번호 입력 대기 마커
  };
}

export function parseBAPLIE(ediText) {
  // V8.05: CASP/CKL 계열 숫자코드 BAPLIE 지원 (표준 EDIFACT가 아닌 형식).
  //   헤더가 "00:BAPLIE:BAYPLAN..."이고 세그먼트가 50:/52: 숫자코드면 전용 파서로.
  //   기존엔 CASP→ASC 수동 변환 후 올려야 했던 것을 직접 읽게 함.
  if (/^\s*00:BAPLIE/i.test(ediText) || /'50:[A-Z]{4}\d{6,7}:/.test(ediText)) {
    return parseNumericBAPLIE(ediText);
  }
  // V8.06: RIZHAO 계열 숫자코드 IFCSUM(매니페스트) 지원.
  //   헤더가 "00:IFCSUM:MANIFEST..."이고 컨테이너가 51: 세그먼트면 전용 파서로.
  if (/^\s*00:IFCSUM/i.test(ediText) || /'51:\d+:[A-Z]{4}\d{6,7}:/.test(ediText)) {
    return parseNumericIFCSUM(ediText);
  }
  const result = {
    vsl: '', voy: '', pol: '', etd: '', eta: '',
    carrier: '',                       // V38 신규
    callsign: '',                      // M5.87 신규
    containers: [], errors: [],
  };
  const text = ediText.replace(/\r?\n/g, '');
  const segments = text.split("'").filter(s => s.length > 0);
  let cur = null;

  for (const seg of segments) {
    if (seg.startsWith('TDT+')) {
      // TDT+20+VOY++CARRIER...:::VESSEL_NAME...
      // 양식 1: TDT+20+0521W+++CKL:172:20+++BSDU:103:11:XIN TAI PING (선박명 = 마지막)
      // 양식 2: TDT+20+2633E++VRSC3:103::SITC SENDAI++:172:20 (M3.85: 선박명 = 중간)
      // 양식 3: TDT+20+2604N+++:172:20+++V7A576:103::SAWASDEE RIGEL (M5.87: 콜사인 추출)
      const parts = seg.split('+');
      result.voy = parts[2] || '';
      // carrier (5번째 element의 첫 token)
      if (parts[5]) {
        const cc = parts[5].split(':')[0];
        if (cc) result.carrier = cc;
      }
      // M3.85: 모든 element의 모든 sub-token에서 선박명 후보 검색 (역순)
      //   양식 1/2 둘 다 처리. 영문 포함 + 숫자만 아닌 토큰을 선박명으로 인정
      let vsl = '';
      for (let p = parts.length - 1; p >= 3; p--) {
        const fld = parts[p] || '';
        const subs = fld.split(':');
        for (let i = subs.length - 1; i >= 0; i--) {
          const t = subs[i].trim().replace(/['"]/g, '');
          // 선박명 조건: 비어있지 않고, 숫자만 아니고, 영문자 포함, 길이 3+ (carrier 코드 회피)
          if (t && t.length >= 3 && !/^\d+$/.test(t) && /[A-Z]/i.test(t) && /\s|[A-Z]{4,}/.test(t)) {
            vsl = t;
            break;
          }
        }
        if (vsl) break;
      }
      // fallback: 위 조건이 실패하면 기존 로직 (마지막 영문 토큰)
      if (!vsl) {
        const lastField = parts[parts.length - 1] || '';
        const subTokens = lastField.split(':');
        for (let i = subTokens.length - 1; i >= 0; i--) {
          const t = subTokens[i].trim().replace(/['"]/g, '');
          if (t && !/^\d+$/.test(t) && /[A-Z]/i.test(t)) { vsl = t; break; }
        }
      }
      result.vsl = vsl;
      // M5.87: 콜사인(호출부호) 추출
      //   TDT 세그먼트에서 ":103::" 패턴 앞의 토큰이 콜사인 (qualifier 103 = call sign)
      //   예: V7A576:103::SAWASDEE RIGEL → V7A576
      //   양식: 영문+숫자 4-7자, 선박명 패턴이 아닌 토큰
      for (let p = 3; p < parts.length; p++) {
        const fld = parts[p] || '';
        const subs = fld.split(':');
        for (let i = 0; i < subs.length; i++) {
          const t = subs[i].trim().replace(/['"]/g, '');
          // 콜사인 패턴: 영문/숫자 4-7자, 영문 1자 이상, 공백 없음, 선박명 아님
          if (t && t.length >= 4 && t.length <= 7 && /^[A-Z0-9]+$/i.test(t) &&
              /[A-Z]/i.test(t) && t !== vsl && t !== result.carrier &&
              // 다음 sub가 '103'이면 더 확실 (콜사인 qualifier)
              (subs[i+1] === '103' || /^[A-Z]\d/.test(t) || /\d[A-Z]/.test(t))) {
            result.callsign = t.toUpperCase();
            break;
          }
        }
        if (result.callsign) break;
      }
    } else if (seg.startsWith('LOC+5+') && !cur) {
      result.pol = seg.substring(6).split(':')[0];
    } else if (seg.startsWith('LOC+9+') && !cur) {
      // TallyOne 1.70: 문서 전체의 선적항 — COPRAR 는 컨마다 안 적고 **헤더에 한 번만** 적는다.
      //   (`TDT` 다음 `LOC+9+KRPTK:139:6`). 컨에 pol 이 없으면 아래 마무리 루프에서 이 값을 채운다.
      //   ⚠ 컨이 시작된 뒤의 LOC+9 는 종전대로 그 컨의 pol 이다(이 분기는 `!cur` 일 때만).
      //   회귀 범위 실측 — 메일함 EDI 538개 중 헤더 LOC+9 를 가진 파일은 COPRAR 4개뿐.
      result.docPol = seg.substring(6).split(':')[0];
    } else if (seg.startsWith('DTM+178:') || seg.startsWith('DTM+136:')) {
      const v = seg.split(':')[1];
      if (v) result.etd = v.substring(0, 8);
    } else if (seg.startsWith('LOC+147+')) {
      if (cur) result.containers.push(cur);
      const slot = seg.substring(8).split(':')[0];
      cur = newBaplieCont();
      // 위치는 보통 7자리(BBBRRTT) 또는 6자리(BBRRTT)
      // M3.1: bay는 정규화해서 저장 (앞 0 제거, "016"→"16", "001"→"1")
      if (slot.length >= 7) {
        cur.bay = normalizeBay(slot.substring(0, 3));
        cur.row = slot.substring(3, 5);
        cur.tier = slot.substring(5, 7);
      } else if (slot.length === 6) {
        cur.bay = normalizeBay(slot.substring(0, 2));
        cur.row = slot.substring(2, 4);
        cur.tier = slot.substring(4, 6);
      }
    } else if (seg.startsWith('EQD+CN+')) {
      // TallyOne 1.70 (검수사 지적 2026-08-15): **자리 없는 EDI 도 읽는다.**
      //   COPRAR(선사 선적리스트, `UNH+…+COPRAR:D:95B:UN:SMDG16`)는 선내 자리(LOC+147)가 없고
      //   `EQD+CN` 으로 컨이 시작한다. 종전 파서는 `cur`(=LOC+147 이 만든 것)가 없으면 통째로 건너뛰어
      //   **0건**을 냈다 — MAMP 633S 의 선적 실번호 60대(규격·POD·VGM·씰 포함)가 그렇게 버려졌다.
      //   대조리포트에 `[edi] 0건` 이 찍혀 있었는데 아무도 안 봤다(조용한 실패).
      //   → `cur` 가 없으면 여기서 새로 시작한다. 자리는 빈 채로 둔다(있는 자료만 쓴다).
      //   ⚠ 컨을 끊는 것도 여기다 — COPRAR 는 LOC+147 이 없어 «다음 EQD+CN» 이 유일한 경계다.
      //     안 끊으면 뒤 컨이 앞 컨을 덮어써 파일 하나가 1대로 줄어든다(실측 60대 → 1대).
      //     정상 BAPLIE 는 LOC+147 이 새 컨을 만들어 이 시점 `cur.cn` 이 비어 있으므로 안 걸린다.
      if (!cur || cur.cn) {
        if (cur) result.containers.push(cur);
        cur = newBaplieCont(); cur._noSlot = true;
      }
      const parts = seg.split('+');
      cur.cn = (parts[2] || '').replace(/[\s\-]/g, '').toUpperCase().trim();
      // M5.79: 빈 컨번호 (평택 적재 부킹 슬롯) — 임시 ID로 살려둠
      //   기존: cn='' → workingReport/SearchPanel에서 if(!c.cn) return 으로 통째 제외됨
      //   수정: __BOOK_{bay}_{row}_{tier}_{idx} 임시 ID 부여, 검수원이 폰에서 컨번호 채울 수 있게 보존
      //   동일 위치에 여러 부킹이 들어올 수 있으므로 (희박) 카운터 보강
      if (!cur.cn) {
        const slotKey = `${cur.bay || '00'}_${cur.row || '00'}_${cur.tier || '00'}`;
        let bookId = `__BOOK_${slotKey}`;
        // 중복 방지 (같은 슬롯에 두 줄이 들어오는 비정상 케이스 보호)
        let dup = 0;
        while (result.containers.some(x => x.cn === bookId)) {
          dup++;
          bookId = `__BOOK_${slotKey}_${dup}`;
        }
        cur.cn = bookId;
        cur.isBooking = true;
        cur.pendingCn = true;
        cur.l4 = '';   // 검색 매칭에서 제외 (임시 ID 끝자리가 실 컨번호와 충돌 방지)
      } else {
        cur.l4 = cur.cn.slice(-4);
      }
      const isoField = parts[3] || '';
      cur.iso = (isoField.split(':')[0] || '').toUpperCase();

      // 특수화물 자동 감지 (ISO 3번째 글자)
      // V9.57: 숫자/알파벳 분기 — 기존 `t>='7'&&t<='9'` 탱크 판정이 4582(40RF)·4583/4584(FR)·
      //   4590(OT)·2282(20RF)까지 전부 tk=true로 중복 태깅하던 결함 교정.
      //   숫자면 구형 숫자 규칙(0·1=GP, 2=벌크, 3·4=리퍼, 5=오픈탑, 6=플랫, 7=탱크)으로만 판정하고
      //   (8·9는 아래 458x/459x 정규식이 판정), 알파벳일 때만 현행 문자 규칙을 쓴다.
      if (cur.iso.length >= 3) {
        const t = cur.iso[2];
        if (t >= '0' && t <= '9') {
          if (t === '3' || t === '4') cur.rf = true;
          else if (t === '5') cur.oog = true;
          else if (t === '6') { cur.fr = true; cur.oog = true; }
          else if (t === '7') cur.tk = true;
          // 2(벌크)는 대응 필드 없음 — 태깅 생략(기존 동작 유지)
        } else {
          if (t === 'R') cur.rf = true;
          if (t === 'U' || t === 'O') cur.oog = true;
          if (t === 'T') cur.tk = true;
          // M3.74 fix: FR(P=Platform/F=Flatrack)은 fr 명시 + oog는 호환성 유지
          // 기존: oog만 true → 베이플랜에 'OOG'로 표시 + 상세모달/카드에 FR 배지 안 뜸
          if (t === 'P' || t === 'F') { cur.fr = true; cur.oog = true; }
        }
      }
      // 4자리 숫자 코드 reefer — V9.57: 끝자리 2·5만 리퍼(4582/4585). 3·4는 FR이므로 rf에서 제외
      //   (isReeferIso·guidedQueue cardIsReefer의 /^[24]58[25]$/와 일치 — rf/fr 모순 태깅 제거)
      if (/^[24]58[25]$/.test(cur.iso)) cur.rf = true;
      if (/^[24]59/.test(cur.iso)) cur.oog = true;
      // M3.74 fix: 4자리 숫자 FR 코드 (4583/4584/2283/2284) = FR
      if (/^[24]58[34]$/.test(cur.iso)) { cur.fr = true; cur.oog = true; }
      // M3.85: 변형 ISO 표기 (40HR 등 ASC식 표기가 EDI에 들어온 경우) 리퍼 보강 인식
      if (!cur.rf && isReeferIso(cur.iso)) cur.rf = true;

      // status — BAPLIE EDIFACT: EQD+CN+컨번호+ISO+++status
      // 형식에 따라 parts[5] 또는 parts[6]에 위치
      // M3.71: 가장 마지막 비어있지 않은 요소를 status로 사용 (안전)
      let rawStatus = '';
      for (let i = parts.length - 1; i >= 4; i--) {
        const p = (parts[i] || '').trim();
        if (p && (p === 'F' || p === 'E' || p === '4' || p === '5')) {
          rawStatus = p;
          break;
        }
      }
      cur.st = rawStatus;
      // BAPLIE EDIFACT 표준 (실측 검증):
      //  5 = Full (Loaded) — 8~28톤
      //  4 = Empty — 컨 자체 무게만 (3.8톤 등)
      // 명시적 'F'/'E' 우선
      if (rawStatus === 'F') cur.fe = 'F';
      else if (rawStatus === 'E') cur.fe = 'E';
      else if (rawStatus === '5') cur.fe = 'F';   // 5 = Full
      else if (rawStatus === '4') cur.fe = 'E';   // 4 = Empty
      // M3.72: ISO 끝자리 E (45RE, 22RE 등)도 Empty 표시 (선사 관행)
      // 일부 선사는 EQD status 없이 ISO 코드에만 E 표시
      else if (cur.iso && cur.iso.length >= 4 && /[A-Z][A-Z][A-Z]E$/.test(cur.iso)) {
        // 끝 4자리가 [문자][문자][문자]E (45RE, 22RE 같은 패턴)
        cur.fe = 'E';
        cur.st = 'E(ISO)';
      }
      // M3.67: 기본값 '' (미정) - 무게로 추정 또는 검수원 확인

      // 화면 표시용 tp
      // V9.57: 좁은 패턴(458x=40'RF·228x=20'RF)을 startsWith('45'/'22')보다 앞으로 —
      //   기존엔 넓은 패턴이 선점해 두 분기가 도달 불가(4582가 40'HC, 2282가 20'GP로 표기)였다.
      if (/^458[2-5]$/.test(cur.iso)) cur.tp = "40'RF";
      else if (/^228[2-5]$/.test(cur.iso)) cur.tp = "20'RF";
      else if (cur.iso.startsWith('22')) cur.tp = "20'GP";
      else if (cur.iso.startsWith('25')) cur.tp = "20'HC";
      else if (cur.iso.startsWith('42') || cur.iso.startsWith('44')) cur.tp = "40'GP";
      else if (cur.iso.startsWith('45')) cur.tp = "40'HC";
    } else if (cur && (seg.startsWith('LOC+9+') || seg.startsWith('LOC+6+'))) {
      // M3.85: SITC SENDAI 양식은 LOC+6을 POL로 사용 (표준은 LOC+9)
      cur.pol = seg.substring(seg.indexOf('+', 4) + 1).split(':')[0];
    } else if (cur && (seg.startsWith('LOC+11+') || seg.startsWith('LOC+12+'))) {
      // M3.85: SITC SENDAI 양식은 LOC+12를 POD로 사용 (표준은 LOC+11)
      cur.pod = seg.substring(seg.indexOf('+', 4) + 1).split(':')[0];
    } else if (cur && seg.startsWith('LOC+76+')) {
      // V38 신규: 환적/추가 POL
      cur.npod = seg.substring(7).split(':')[0];
    } else if (cur && seg.startsWith('LOC+83+')) {
      // M5.79: 환적항 (Transhipment Port)
      //   실측: SWRG 양하선 290대, DPRT 적재선 182대가 LOC+83 사용
      //   예: LOC+83+KRPUS  → 부산 환적
      //       LOC+83+JPSKT  → 일본 야츠시로 환적 (2차 환적)
      cur.tspot = seg.substring(7).split(':')[0];
    } else if (cur && (seg.startsWith('LOC+97+') || seg.startsWith('LOC+98+'))) {
      // M5.79: 최종 목적지 (Final Destination)
      //   LOC+97 = Place of Delivery, LOC+98 = Final Port of Discharge
      cur.fpod = seg.substring(seg.indexOf('+', 4) + 1).split(':')[0];
    } else if (cur && seg.startsWith('MEA+')) {
      // MEA+WT++KGM:2100  또는  MEA+VGM++KGM:17272
      const parts = seg.split(':');
      const last = parts[parts.length - 1];
      const num = parseInt(last);
      if (!isNaN(num) && num > 100) {
        // VGM 우선 (실측), 없으면 WT
        const isVGM = seg.includes('VGM');
        if (isVGM || !cur.wt) {
          cur.wt = num;
          cur.wtt = isVGM ? 'VGM' : 'WT';
        }
      }
    } else if (cur && (seg.startsWith('TMP+2+') || seg.startsWith('TMP+'))) {
      const v = seg.substring(6).split(':')[0];
      if (v) {
        // 정규화: "-018" → "-18", "000" → "0", "-02.5" → "-2.5"
        let norm = v.trim();
        const m = norm.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
        if (m) norm = (m[1] || '') + m[2];

        // M3.6: 0°C는 실제 온도 (신선 채소, 의약품 등 0도 운반 화물 존재)
        //   - 검수원이 직접 입력한 0도와 EDI 0도 모두 그대로 0°C로 인식
        //   - 진짜 미입력은 빈 값(공백)인 경우만
        cur.rf = true;
        cur.tmp = norm;  // "0"이든 "-18"이든 그대로
      } else {
        // TMP 세그먼트는 있는데 값이 진짜 비어있는 경우만 미입력
        cur.rf = true;
        cur.tmp = '';
        cur.tmp_missing = true;
      }
    } else if (cur && seg.startsWith('RNG+5+')) {
      const parts = seg.split(':');
      if (parts.length >= 3) {
        cur.tmp = parts[2] + (parts[3] ? '~' + parts[3] : '');
        cur.rf = true;
      }
    } else if (cur && seg.startsWith('DGS+IMD+')) {
      cur.dg = true;
      const parts = seg.split('+');
      cur.dgc = parts[2] || '';
      cur.un = parts[3] || '';
      // M5.79: packaging group (DGS+IMD+클래스+UN++packageGroup)
      //   실측: DGS+IMD+3+1170++2  → PG II (중간 위험)
      //         DGS+IMD+9+3268     → PG 없음 (Class 9 통상)
      //   I = 가장 높은 위험, II = 중간, III = 낮음
      if (parts.length >= 6 && parts[5]) cur.pg = parts[5].trim();
    } else if (cur && seg.startsWith('DIM+')) {
      // 1.84-04 (검수사 확정 2026-08-19): **치수를 버리지 않는다.** 종전엔 oog 표시만 하고
      //   DIM 의 초과 치수(cm)를 버려 FR·OOG 답변에 폭·높이를 말할 수 없었다.
      //   BAPLIE DIM 코드 — 5/6=길이 초과(전/후), 7/8=폭 초과(우/좌), 9=높이 초과. 단위 CMT(cm).
      //   ⚠ 실물 실측(KSKM 2616S LOAD EDI): `DIM+9+CMT:::105`(높이) · `DIM+8+CMT::127`(폭 좌) ·
      //     `DIM+7+CMT::127`(폭 우) — 높이는 표준 문서의 13이 아니라 **9** 로 온다. 둘 다 받는다.
      cur.oog = true;
      try {
        const _dp = seg.split('+');
        const _code = (_dp[1] || '').trim();
        const _meas = (_dp[2] || '').split(':');
        const _val = parseInt(_meas[_meas.length - 1] || _meas[1] || '', 10);
        if (Number.isFinite(_val) && _val > 0) {
          if (_code === '5' || _code === '6') cur.ovl = (cur.ovl || 0) + _val;
          else if (_code === '7' || _code === '8') cur.ovw = (cur.ovw || 0) + _val;
          else if (_code === '9' || _code === '13') cur.ovh = Math.max(cur.ovh || 0, _val);
        }
      } catch (e) { /* 형식 다른 DIM 은 표시(oog)만 유지 */ }
    } else if (cur && seg.startsWith('FTX+AAY+++')) {
      cur.op = seg.substring(10).substring(0, 5).trim();
    } else if (cur && (seg.startsWith('NAD+CF+') || seg.startsWith('NAD+CA+'))) {
      // V38: CF (Container Forwarder) + CA (Carrier) 둘 다 op로 매핑
      // NAD+CA+CLL:172:20  → CLL
      const code = seg.substring(7).split(':')[0];
      if (code && !cur.op) cur.op = code;
    } else if (cur && seg.startsWith('SEL+')) {
      // TallyOne 1.70: 씰번호 — COPRAR(선사 선적리스트)가 `SEL+KR0989283+CA` 로 준다.
      //   종전 파서는 이 세그먼트를 아예 안 읽어 씰이 EDI 에서 하나도 안 들어왔다.
      //   풀은 sl(실번호), 엠티는 eseal 로 나눈다(앱 전역 규약 — 리스트 파서와 같은 갈래).
      const _sv = (seg.split('+')[1] || '').trim();
      if (_sv) { if (String(cur.fe).toUpperCase() === 'E') { if (!cur.eseal) cur.eseal = _sv; } else if (!cur.sl) cur.sl = _sv; }
    } else if (cur && seg.startsWith('RFF+BM:')) {
      // BL 참조
      cur.bl = seg.substring(7);
    }
  }
  if (cur) result.containers.push(cur);

  // M3.73: 무게 기반 F/E 추정 완전 제거
  // 원칙: EDI status 코드만이 진실. 무게로 절대 추정하지 않음.
  // status 없으면 검수원이 현장에서 확인.
  //
  // ISO 끝자리 동기화 + M6.39: result.voy를 각 컨테이너에 c.voy로 복사
  //   목적: 향후 항차 진입 시 ediContainers의 컨 한 개에서 voy 추출 → voy_d/voy_l 자동 백필
  //   사용자 추가 액션 0 — EDI 한 번 업로드하면 영구히 자동 정확
  for (const c of result.containers) {
    // M6.39: voy 메타 저장
    if (result.voy && !c.voy) c.voy = result.voy;
    // TallyOne 1.70: 헤더에만 적힌 선적항(COPRAR) 을 빈 컨에 채운다 — 안 채우면 평택 선적분 0 으로 잡혀
    //   방향 필터에서 전량 제외된다(자료를 읽고도 못 쓰는 상태).
    if (result.docPol && !c.pol) c.pol = result.docPol;

    if (!c.iso || c.iso.length < 4) continue;
    const last = c.iso[c.iso.length - 1];
    if (c.fe === 'E' && last !== 'E') {
      c.iso_orig_parsed = c.iso;
      c.iso = c.iso.slice(0, -1) + 'E';
    } else if (c.fe === 'F' && last === 'E') {
      c.iso_orig_parsed = c.iso;
      c.iso = c.iso.slice(0, -1) + 'F';
    }
  }

  if (!result.vsl) result.errors.push('선박명을 인식하지 못했습니다.');
  if (result.containers.length === 0) result.errors.push('컨테이너를 찾지 못했습니다.');
  return stampEdiSeq(result);
}

// === ASC Parser (V38 보조) ===
// 사용자 지침: ASC 는 참조용 (현장 표준은 EDI). EDI 의 검증/보완 용도로만 사용.
// V38: 코멘트 라인(***) 무시, NAD 다음 KRPTK 붙은 확장 라인(환적) 처리
export function parseAscFile(text) {
  const lines = text.split(/\r?\n/);
  const containers = [];
  let vsl = '', voy = '', serviceCode = '';

  for (const ln of lines) {
    if (ln.startsWith('$604')) {
      const parts = ln.substring(4).split('/');
      if (parts.length >= 3) {
        serviceCode = (parts[0] || '').trim();  // M6.48: KSKM 등 선사/서비스 코드
        vsl = (parts[1] || '').trim();
        voy = (parts[2] || '').trim();
      }
      break;
    }
  }

  for (const line of lines) {
    if (line.length < 50) continue;
    if (line.startsWith('$')) continue;
    if (line.trimStart().startsWith('***')) continue;   // V38: 코멘트 무시

    const slot = line.substring(0, 6).trim();
    if (!/^\d{6}$/.test(slot)) continue;
    const cn = line.substring(7, 18).replace(/[\s\-]/g, '').toUpperCase();
    // M3.5.5: 컨번호 빈 라인(선적 엠티)도 허용 — F/E와 POL/POD 정보는 유효
    //   엠티 실 부착 작업에서는 컨번호 없는 엠티 슬롯도 표시 대상
    const hasCn = isValidCn(cn);   // V9.57: 컨번호 형식 검사 단일 소스
    if (cn && !hasCn) continue;  // 컨번호가 있는데 형식 이상이면 스킵

    const bay = normalizeBay(slot.substring(0, 2));
    const row = slot.substring(2, 4);
    const tier = slot.substring(4, 6);
    // M6.53: BAY 00 그리드 메타 라인 차단
    //   ASC 끝부분의 좌표 점검용 메타 데이터(bay=00, 컨번호 빈 라인)가
    //   "선적 엠티" 허용 로직(line 849)을 우회하여 컨테이너로 처리되던 버그.
    //   영향: KSKM2505S 150건, KSKM2508N 더 많음. row 11~15 + tier 20~70 유령 데이터.
    //   해결: cn='' AND bay='0' 동시 → 메타 라인, 제외.
    //   선적 엠티(bay≠00, NAD 있음)는 영향 없음.
    if (!cn && bay === '0') continue;
    // V38: NAD 위치 19~21 (3글자 표준), 그 다음 추가 KRPTK 5자가 있을 수도
    const nad = line.substring(19, 22).trim();
    const ext = line.substring(22, 27);                 // 공백 또는 KRPTK (확장)
    let op = nad;

    const typeBlock = line.substring(44, 54).trim();
    let tp = '', iso = '', fe = 'F', wt = 0;

    // M6.48: FR/OT/TK/PL 등 특수 컨테이너 코드 우선 인식
    //   universal_asc_analyzer 참조 — 평면(FR), 오픈탑(OT), 탱크(TK), 플랫(PL)
    let mSpec = typeBlock.match(/^(FR40|FR20|OT40|OT20|PL40|PL20)(\d{3})([FE])/);
    let m1 = typeBlock.match(/^([A-Z]{2}\d{2})(\d{3})([FE])/);
    let m2 = typeBlock.match(/^(\d{2}[A-Z]{2})(\d{3})([FE])/);
    let m4 = typeBlock.match(/^([A-Z]{4})(\d{3})([FE])/);

    if (mSpec) {
      tp = mSpec[1];
      fe = mSpec[3];
      const isoMap = {
        FR40: '42PF', FR20: '22PF',
        OT40: '42UT', OT20: '22UT',
        PL40: '42PL', PL20: '22PL',
      };
      iso = isoMap[tp] || tp;
      wt = parseInt(mSpec[2]) * 100;
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      if (wtMatch) wt = parseInt(wtMatch[1]);
    } else if (m1) {
      tp = m1[1]; fe = m1[3];
      // V9.57: ① TK도 크기 토큰 반영 — TK40이 22T6(20피트 탱크)으로 박히던 결함 교정.
      //   ② 기존 기본값 iso = m1[2]+'GP'는 m1[2]가 '무게 3자리'라 '057GP' 같은 쓰레기 ISO를
      //   만들던 결함 — 매칭 안 되는 tp는 종류+크기 최소 매핑으로 유추한다.
      if (tp.startsWith('TK')) iso = tp.endsWith('40') ? '42T6' : '22T6';
      else if (tp.startsWith('RF')) iso = tp.endsWith('20') ? '22R5' : '45R1';
      else if (tp.startsWith('DC') && tp.endsWith('20')) iso = '22GP';
      else if (tp.startsWith('DC') && tp.endsWith('40')) iso = '42GP';
      else if (tp === 'HC40') iso = '45GP';
      else {
        const _sz40 = tp.endsWith('40');
        const _kd = tp.slice(0, 2);
        const _map = {
          GP: _sz40 ? '42GP' : '22GP', HC: _sz40 ? '45GP' : '25GP', HQ: _sz40 ? '45GP' : '25GP',
          RH: _sz40 ? '45R1' : '25R1', OT: _sz40 ? '42U1' : '22U1', OP: _sz40 ? '42U1' : '22U1',
          BK: _sz40 ? '42B0' : '22B0',
        };
        iso = _map[_kd] || (_sz40 ? '42GP' : '22GP');
      }
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      wt = wtMatch ? parseInt(wtMatch[1]) : 0;
    } else if (m4) {
      tp = m4[1];
      fe = m4[3];
      if (tp === 'DCHC') iso = '45GP';
      else if (tp === 'RFHC') iso = '45R1';
      else if (tp === 'RFHQ') iso = '45R1';
      else if (tp === 'DCDC') iso = '42GP';
      else iso = tp;
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      if (wtMatch) wt = parseInt(wtMatch[1]);
      else wt = parseInt(m4[2]) * 100;
    } else if (m2) {
      iso = m2[1];
      wt = parseInt(m2[2]) * 100;
      fe = m2[3];
      tp = iso;
    }

    // POL/POD — 끝 10자리가 가장 안정적 (POL5+POD5)
    let pol = '', pod = '';
    const tail = line.replace(/\u0000/g, '').trim();
    const polPodEnd = tail.match(/([A-Z]{5})([A-Z]{5})$/);
    if (polPodEnd) {
      pol = polPodEnd[1]; pod = polPodEnd[2];
    } else {
      // fallback A: 첫 6자가 영문 = POL3+POD3
      const first6 = line.substring(27, 33);
      if (/^[A-Z]{6}$/.test(first6)) {
        pol = first6.substring(0, 3);
        pod = first6.substring(3, 6);
      } else {
        // fallback B: POL5+공백+POD5
        const posBlock = line.substring(27, 44);
        const m_polpod = posBlock.match(/^([A-Z]{5})\s+([A-Z]{5})/);
        if (m_polpod) { pol = m_polpod[1]; pod = m_polpod[2]; }
      }
    }

    // M3.73: 무게 기반 F/E 추정 완전 제거
    // 원칙: ASC의 F/E 명시값만 사용. 무게로 추정 X.
    let feFinal = fe;
    let isoFinal = iso;

    // ISO 끝자리 동기화: F/E와 ISO 끝자리가 다르면 F/E 우선
    if (isoFinal && isoFinal.length >= 4) {
      const last = isoFinal[isoFinal.length - 1];
      if (feFinal === 'E' && last !== 'E') {
        isoFinal = isoFinal.slice(0, -1) + 'E';
      } else if (feFinal === 'F' && last === 'E') {
        isoFinal = isoFinal.slice(0, -1) + 'F';
      }
    }

    // M6.48: 추가 메타 자동 추출 — universal_asc_analyzer 참조
    //   1) 리퍼 온도: -25C, +05C 등 (RF 컨테이너만, -30~+30 현실 범위)
    //   2) OOG 감지: 'AK' 토큰 (FR/OT의 out-of-gauge 표시)
    //   3) OOG 치수: AK 다음 6자리 숫자
    //   4) routeCode: 끝 10-11자 영문 (POL+VIA+POD)
    const metaArea = line.substring(54).trim();
    let tmp = '';
    if (tp && tp.startsWith('RF')) {
      // M6.48 보강: 리퍼 온도 추출 — 사용자 명시: 반드시 소수점 1자리 (-18.0℃, 15.0℃)
      //   ASC 산업 표준: 3자리 정수 = 소수점 한 자리 표기 (-180 → -18.0)
      //   C 뒤에 숫자 가능 (예: '30C0013' — 온도+시퀀스), lookahead로 처리
      const tmpMatch3 = metaArea.match(/(?:^|\s)(-?\d{3})C(?=\d|\s|$)/);
      if (tmpMatch3) {
        const raw = parseInt(tmpMatch3[1], 10);
        tmp = (raw / 10).toFixed(1) + '℃';
      } else {
        // 2자리 (드문 케이스) — 그대로 정수 해석 + .0
        const tmpMatch2 = metaArea.match(/(?:^|\s)(-?\d{1,2})C(?=\d|\s|$)/);
        if (tmpMatch2) tmp = parseFloat(tmpMatch2[1]).toFixed(1) + '℃';
      }
    }
    const oog = /\bAK\b/.test(metaArea);
    let oogDim = '';
    if (oog) {
      const oogM = metaArea.match(/AK\s*(\d{6})/);
      if (oogM) oogDim = oogM[1];
    }
    // routeCode (끝 10-11자) — POD 백업용
    const rcMatch = line.match(/([A-Z]{10,11})\s*$/);
    const routeCode = rcMatch ? rcMatch[1] : '';
    const podFinal = routeCode.length >= 3 ? routeCode.slice(-3) : '';

    // FR/OT 자동 oog 판정 — 장비 코드만으로도 OOG 처리
    const isFROrOT = tp && (tp.startsWith('FR') || tp.startsWith('OT') || tp.startsWith('PL'));

    containers.push({
      cn, bay, row, tier,
      iso: isoFinal,
      tp,
      fe: feFinal,
      wt, op, pol, pod,
      dg: false, dgc: '', un: '',
      // M3.85: 통합 헬퍼로 리퍼 판정 (40HR, RFHC, 458x 등 모든 변형 인식)
      rf: (tp && tp.startsWith('RF')) || isReeferIso(isoFinal),
      tk: (tp && tp.startsWith('TK')) || (isoFinal && isoFinal[2] === 'T'),
      oog: oog || isFROrOT,
      sl: '', sh: '', bl: '',
      tmp,
      oogDim,
      routeCode,
      podFinal,
    });
  }
  return stampEdiSeq({ vsl, voy, serviceCode, containers });
}

// === M6.47: ASC 파일 → 베이사전 엔트리 변환 (Gemini 호출 0) ===
//   M6.48 보강: serviceCode 우선 사용 (KSKM 등 ASC 헤더 코드)
//   ASC의 컨테이너 좌표(BBBRRTT)로부터 베이 구조 자동 추출:
//   - 사용된 베이 목록
//   - 각 베이의 hold(tier ≤10) / deck(tier ≥80) 분리
//   - 짝수 베이(40ft) / 홀수 베이(20ft) 식별
//   - 홀수 베이의 짝꿍(인접 짝수) 자동 매칭
//   - 짝수 단독 베이(isStandalone) 자동 판정
//
//   한계: 항차마다 "사용된 슬롯"만 반영 (전체 베이 구조는 여러 ASC 누적 시 정확해짐)
//   장점: Gemini 0, 무료, 즉시, 정확도 100% (구조화 데이터)
export function ascToBayDictEntry(ascResult, fileName, extra = {}) {
  // M6.47: 컨번호 있는 실제 컨테이너만 사용 (정렬용 빈 슬롯 라인 무시)
  //   ASC에 종종 "000010", "000020" 같은 빈 슬롯 라인 있음 — BAY 00 오인 원인
  const containers = (ascResult?.containers || []).filter(c => c.cn && isValidCn(c.cn));   // V9.57: 단일 소스
  if (containers.length === 0) {
    return null;
  }

  // 1) 각 베이별 좌표 수집
  const bayMap = {};  // { bayNo: { rowsEven, rowsOdd, holdTiers, deckTiers } }
  containers.forEach(c => {
    if (!c.bay) return;
    const bayNo = parseInt(c.bay, 10);
    if (!Number.isFinite(bayNo)) return;
    const row = parseInt(c.row, 10);
    const tier = parseInt(c.tier, 10);
    if (!Number.isFinite(row) || !Number.isFinite(tier)) return;

    if (!bayMap[bayNo]) {
      bayMap[bayNo] = {
        rowsEven: new Set(),  // 짝수 row (40ft 슬롯)
        rowsOdd: new Set(),   // 홀수 row (20ft 슬롯)
        holdTiers: new Set(),
        deckTiers: new Set(),
      };
    }
    const b = bayMap[bayNo];
    if (row % 2 === 0 && row !== 0) b.rowsEven.add(row);
    else b.rowsOdd.add(row);
    if (tier <= 20) b.holdTiers.add(tier);     // hold: tier 02~20
    else b.deckTiers.add(tier);                 // deck: tier 80~98
  });

  // 2) baysSummary 생성
  const sortedBays = Object.keys(bayMap).map(Number).sort((a, b) => a - b);
  const baysSummary = [];
  const standalone = [];
  const pairs = [];

  sortedBays.forEach(bayNo => {
    const b = bayMap[bayNo];
    // tier 큰 순으로 정렬 (deck: 88, 86, 84, 82 / hold: 08, 06, 04, 02)
    const deckTiers = Array.from(b.deckTiers).sort((a, b) => b - a);
    const holdTiers = Array.from(b.holdTiers).sort((a, b) => b - a);
    const hasHold = holdTiers.length > 0;
    const hasDeck = deckTiers.length > 0;

    const isEven = bayNo % 2 === 0;
    // 짝수 베이 단독: 인접 홀수 베이(N-1, N+1) 데이터 없으면 standalone
    const isStandalone = isEven && !bayMap[bayNo - 1] && !bayMap[bayNo + 1];

    // row 폭 (사용된 max row)
    const rowMaxEven = b.rowsEven.size > 0 ? Math.max(...b.rowsEven) : null;
    const rowMaxOdd = b.rowsOdd.size > 0 ? Math.max(...b.rowsOdd) : null;

    if (isStandalone) standalone.push(bayNo);

    const entry = {
      bayNo: String(bayNo).padStart(2, '0'),
      section: 1,                                  // 단순화 (모두 section 1)
      hasHold,
      hasDeck,
      isStandalone,
      // PrintableCargoPlan/BayDetail 양쪽 호환
      deckTiers,
      holdTiers,
      deckTiersLocal: deckTiers,
      holdTiersLocal: holdTiers,
    };
    if (rowMaxEven != null) { entry.rowMaxEvenLocal = rowMaxEven; entry.rowMaxEven = rowMaxEven; }
    if (rowMaxOdd != null) { entry.rowMaxOddLocal = rowMaxOdd; entry.rowMaxOdd = rowMaxOdd; }
    baysSummary.push(entry);
  });

  // 3) 짝꿍 쌍 식별 (짝수 + 홀수 인접)
  sortedBays.forEach(bayNo => {
    if (bayNo % 2 === 0 && bayMap[bayNo - 1]) pairs.push([bayNo, bayNo - 1]);
    if (bayNo % 2 === 0 && bayMap[bayNo + 1]) pairs.push([bayNo, bayNo + 1]);
  });

  // 4) 코드/이름 추출 — M6.48: 우선순위
  //   1순위: 사용자 입력 (extra.code)
  //   2순위: ASC 헤더 serviceCode (예: KSKM)
  //   3순위: vesselName 앞 4글자 (예: SUNN from SUNNY KALMIA)
  const serviceCode = (ascResult?.serviceCode || '').toUpperCase().trim();
  const vname = (ascResult?.vsl || '').toUpperCase();
  const vname4 = vname.replace(/\s+/g, '').slice(0, 4);
  const code = (extra.code || serviceCode || vname4).toUpperCase();

  return {
    name: ascResult?.vsl || vname,
    code,
    serviceCode,                            // M6.48: 헤더 코드 별도 저장
    vesselCode: vname4,                     // M6.48: 이름 기반 코드 별도 저장
    callsign: extra.callsign || '',
    imo: extra.imo || '',
    voy: ascResult?.voy || '',
    bayDef: {
      baysSummary,
      pairs,
      standalone,
      grade: 'user-verified-asc',
      verified: true,
      source: 'asc-file',
      sourceFile: fileName || '',
      generatedAt: Date.now(),
    },
  };
}
export async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  // V9.32-01: 종전엔 CDN 한 곳을 타임아웃 없이 기다려 — CDN 무응답이면 업로드가
  //   "처리 중"에서 영영 멈췄다(사용자 신고 2026-07-31, OBWH 2702W).
  //   1차: 번들 xlsx를 동적 import (의존성에 이미 있음, planedit.entry와 동일 경로 — 네트워크 불필요)
  //   2차: 번들 실패(옛 캐시가 사라진 청크 참조 등) 시 CDN 2곳을 10초 타임아웃으로 순차 시도
  //   전부 실패 시 조용히 멈추지 않고 이유를 던진다 → 호출부가 화면에 표시.
  try {
    const mod = await import('xlsx');
    const X = (mod && typeof mod.read === 'function') ? mod
      : (mod && mod.default && typeof mod.default.read === 'function') ? mod.default : null;
    if (X) { window.XLSX = X; return X; }
  } catch (e) { /* 번들 청크 실패 → CDN 폴백 */ }
  const _urls = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  ];
  for (const src of _urls) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => { script.remove(); reject(new Error('timeout')); }, 10000);
        script.src = src;
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('script error')); };
        document.head.appendChild(script);
      });
      if (window.XLSX) return window.XLSX;
    } catch (e) { /* 다음 CDN */ }
  }
  throw new Error('엑셀 라이브러리를 불러오지 못했습니다 — 네트워크 확인 후 화면을 새로고침해 주세요.');
}

// === V38 신규: 시트 범위(!ref) 보정 ===
// 일부 회사 시스템이 만든 .xlsx 는 sheet1.xml 안에 dimension(!ref)을
// 잘못 적어둠 (예: 실제 66행인데 A1:Y5로 표기).
// SheetJS는 그 범위만 출력해서 데이터가 누락됨.
// → 실제 셀 키들로부터 범위를 재계산해서 강제 보정.
function fixSheetRange(ws, XLSX) {
  if (!ws) return ws;
  const keys = Object.keys(ws).filter(k => k[0] !== '!');
  if (keys.length === 0) return ws;
  let maxR = 0, maxC = 0;
  for (const k of keys) {
    const m = k.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const col = m[1].split('').reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0) - 1;
    const row = parseInt(m[2]) - 1;
    if (row > maxR) maxR = row;
    if (col > maxC) maxC = col;
  }
  const realRef = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  if (ws['!ref']) {
    try {
      const d = XLSX.utils.decode_range(ws['!ref']);
      if (d.e.r < maxR || d.e.c < maxC) ws['!ref'] = realRef;
    } catch { ws['!ref'] = realRef; }
  } else {
    ws['!ref'] = realRef;
  }
  return ws;
}

// === 양하 / 선적 리스트 Excel Parser (V38 대폭 강화) ===
// 9개 파일 양식 검증 완료:
//   - VSL/VYG/CNTNO/SEAL (마스터 양식)
//   - Container/SEAL (PCCR)
//   - CNTR NO/Seal No (TCL)
//   - Container No/Seal No (JBA, KRPTK)
//   - CONTAINER No./SEAL No. (CLL)
//   - CNTR NO./SEAL (SITC)
//   - Container No. (병합셀 양식)
// M8.08: 세관리스트(적하목록) 전용 파서. 검수의 주 리스트(우선).
//   영문 헤더: B/L TYPE·화물구분·컨테이너번호·규격·Seal No 1~3·적재항·최종항.
//   F/E: B/L TYPE E=Empty, S/C=Full(사용자·데이터 확정).
//   규격: 세관 코드 → 검수앱 표준(선사리스트와 교차 검증).
//   온도는 세관리스트에 없음 → 선사리스트(RIZHAO)에서 보강.
function parseCustomsSheet(grid) {
  if (!grid || grid.length < 2) return null;
  let hdrRow = -1;
  for (let i = 0; i < Math.min(5, grid.length); i++) {
    const cells = (grid[i] || []).map(v => String(v || '').trim());
    if (cells.includes('컨테이너번호') && cells.includes('B/L TYPE') && cells.includes('규격')) {
      hdrRow = i; break;
    }
  }
  if (hdrRow < 0) return null;

  const H = (grid[hdrRow] || []).map(v => String(v || '').trim());
  const col = (name) => H.indexOf(name);
  const ci = {
    cn: col('컨테이너번호'), iso: col('규격'), bl: col('B/L TYPE'),
    s1: col('Seal No 1'), s2: col('Seal No 2'), s3: col('Seal No 3'),
    pol: col('적재항'), pod: col('최종항'), bl_no: col('M-B/L'),
  };
  if (ci.cn < 0 || ci.iso < 0) return null;

  // 세관 규격 → 검수앱 표준 ISO (선사리스트 교차 검증으로 확정).
  const isoMap = {
    '22GP': '22G1', '20GP': '22G1', '20DC': '22G1',
    '20RF': '22R1',
    '44GP': '45G1',                  // 40HC (세관은 40HC를 44GP로 표기, 40HA 포함)
    '40GP': '42G1', '40DC': '42G1',
    '45RE': '45R1', '45RH': '45R1',  // 40HC 리퍼 (온도 전건 확인)
    '40RF': '42R1',
    '40FR': '42P3',
    '45HC': 'L5G1',                  // 진짜 45HC
    '40OT': '45U1', '40TK': '45T1',
  };
  const toIso = (raw) => isoMap[String(raw || '').toUpperCase().trim()] || '';

  const records = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cn = String(row[ci.cn] || '').trim().toUpperCase().replace(/\s/g, '');
    if (!cn) continue;
    if (/[\u4e00-\u9fff]/.test(cn)) continue;  // 합계/한자 행 스킵

    const iso = toIso(row[ci.iso]);
    // F/E: B/L TYPE E = Empty, 그 외(S/C) = Full.
    const blType = String(row[ci.bl] || '').trim().toUpperCase();
    const fe = blType === 'E' ? 'E' : 'F';
    // 실번호: Seal No 1~3 결합(보통 1에만 들어옴).
    const seal = [row[ci.s1], row[ci.s2], row[ci.s3]]
      .map(s => String(s || '').trim()).filter(Boolean).join(' ');
    const pod = ci.pod >= 0 ? String(row[ci.pod] || '').trim() : '';
    const pol = ci.pol >= 0 ? String(row[ci.pol] || '').trim() : '';
    const isoUp = iso.toUpperCase();
    const isRf = isReeferIso(iso);
    const isFr = /^[24][0245689]P/.test(isoUp) || /^45P/.test(isoUp) || /^L5P/.test(isoUp);
    const isOt = /^[24][0245689]U/.test(isoUp) || /^45U/.test(isoUp) || /^L5U/.test(isoUp);
    const isTk = /^[24][0245689]T/.test(isoUp) || /^L5T/.test(isoUp);

    records.push({
      cn, l4: cn.slice(-4),
      sl: seal, sl_orig: seal, eseal: '', eseal_orig: '',
      bl: ci.bl_no >= 0 ? String(row[ci.bl_no] || '').trim() : '',
      sh: '', gi: '',
      wt: 0,                            // 세관리스트엔 무게 없음(선사리스트에서 보강).
      pol, pod,
      fe,
      iso,
      op: '', tsport: '', printpod: '', cargoType: '',
      dg: false,
      rf: isRf, fr: isFr, ot: isOt, tk: isTk,
      tmp: '', tmp_missing: isRf,        // 온도는 선사리스트에서 보강.
      _customs: true,                   // 세관 출신 표식: ISO 끝자리 동기화 제외.
    });
  }
  return records.length ? records : null;
}

// M8.07: RIZHAO ORIENT(日照海通) 예배清单 전용 파서.
//   감지 실패 시 null 반환 → 호출부가 기존 로직으로 진행.
//   양하분 전건 Full(엠티 없음). 품명은 desc에 저장(평소 미표시, 이상 보고 시 참조용).
function parseRizhaoSheet(grid) {
  if (!grid || grid.length < 6) return null;
  // 감지: 상단 6행 안에 提单号 + 箱号 + 箱量 헤더가 모두 있어야 RIZHAO 양식.
  let hdrRow = -1;
  for (let i = 0; i < Math.min(6, grid.length); i++) {
    const cells = (grid[i] || []).map(v => String(v || '').trim());
    if (cells.includes('提单号') && cells.includes('箱号') && cells.includes('箱量')) {
      hdrRow = i; break;
    }
  }
  if (hdrRow < 0) return null;

  const H = (grid[hdrRow] || []).map(v => String(v || '').trim());
  const col = (name) => H.indexOf(name);
  const ci = {
    bl: col('提单号'), cn: col('箱号'), seal: col('封号'),
    qty: col('箱量'), name: col('品名'), goods: col('货物描述'),
    wt: col('重'), temp: col('温度'),
  };
  if (ci.cn < 0 || ci.qty < 0) return null;

  // 目的港(POD): 상단 행에서 라벨 다음 셀 값을 찾음.
  let pod = '';
  for (let i = 0; i <= hdrRow; i++) {
    const cells = (grid[i] || []).map(v => String(v || '').trim());
    const k = cells.indexOf('目的港');
    if (k >= 0 && cells[k + 1]) { pod = cells[k + 1]; break; }
  }

  // 箱量("40FR*1") → 검수앱 표준 ISO.
  const qtyToIso = (raw) => {
    const base = String(raw || '').split('*')[0].toUpperCase().trim();
    const map = {
      '20GP': '22G1', '20DC': '22G1',
      '20RF': '22R1',
      '40GP': '42G1', '40DC': '42G1',
      '40HC': '45G1', '40HA': '45G1',  // HA=40HC(온도無 일반)
      '40RH': '45R1',                  // 40HC 리퍼(온도 전건 확인)
      '40FR': '42P3',
      '40OT': '45U1', '40TK': '45T1',
      '45HC': 'L5G1',                  // 진짜 45HC
    };
    return map[base] || '';
  };
  // 箱量 수량(*N): N==0 행은 빈 슬롯/중복 → 스킵.
  const qtyNum = (raw) => {
    const p = String(raw || '').split('*');
    return p.length > 1 ? parseInt(p[1], 10) : 1;
  };

  const records = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cnRaw = String(row[ci.cn] || '').trim().toUpperCase().replace(/\s/g, '');
    if (!cnRaw) continue;
    // 합계행(重箱合计/整箱重合计 등) 스킵: 컨번호 자리에 한자가 오면 제외.
    if (/[\u4e00-\u9fff]/.test(cnRaw)) continue;
    if (qtyNum(row[ci.qty]) === 0) continue;  // *0 제외

    const iso = qtyToIso(row[ci.qty]);
    const seal = ci.seal >= 0 ? String(row[ci.seal] || '').trim() : '';
    // 1.23: 톤 표기 리스트 대비 — kg 값(200 초과)은 그대로 지나간다(RZOR 실측 7,200·5,364 = kg).
    const wt = ci.wt >= 0 ? parseListWeightKg(row[ci.wt]) : 0;
    const tempRaw = ci.temp >= 0 ? String(row[ci.temp] || '').trim() : '';
    const tmpMissing = tempRaw === '' || tempRaw === '-';
    const isRf = (!tmpMissing) || isReeferIso(iso);
    const isoUp = iso.toUpperCase();
    const isFr = /^[24][0245689]P/.test(isoUp) || /^45P/.test(isoUp) || /^L5P/.test(isoUp);
    const isOt = /^[24][0245689]U/.test(isoUp) || /^45U/.test(isoUp) || /^L5U/.test(isoUp);
    const isTk = /^[24][0245689]T/.test(isoUp) || /^L5T/.test(isoUp);
    // 품명: 品名 + 货物描述 결합(이상 보고 시 참조용).
    const nm = ci.name >= 0 ? String(row[ci.name] || '').trim() : '';
    const gd = ci.goods >= 0 ? String(row[ci.goods] || '').trim().replace(/\n/g, ' ') : '';
    const desc = [nm, gd].filter(Boolean).join(' / ');
    // F/E: 내용물(品名) 유무로 판정. 空箱/空/빈칸 = 내용물 없음 = Empty.
    //   주의: 货物描述은 보지 않음(컨테이너 자체 표기 'CONTAINER' 등이 내용물 아님).
    //   엠티 컨테이너 자체가 상품이어도 내용물 없으면 Empty — 검수 기록 정확성(오기재 책임 방지).
    const isEmptyByName = (nm === '' || /^(空箱?|EMPTY|MT)$/i.test(nm));
    const fe = isEmptyByName ? 'E' : 'F';

    records.push({
      cn: cnRaw, l4: cnRaw.slice(-4),
      sl: seal, sl_orig: seal, eseal: '', eseal_orig: '',
      bl: ci.bl >= 0 ? String(row[ci.bl] || '').trim() : '',
      sh: '', gi: '',
      wt,
      pol: '', pod,
      fe,                               // 품명(내용물) 기준: 空箱/빈칸=E, 품명 있음=F.
      iso,
      op: '', tsport: '', printpod: '', cargoType: '',
      dg: false,
      rf: isRf, fr: isFr, ot: isOt, tk: isTk,
      tmp: tmpMissing ? '' : tempRaw,
      tmp_missing: tmpMissing && isRf,
      desc,                             // 품명/내용물(평소 미표시).
      _rz: true,                        // RIZHAO 출신 표식: ISO 끝자리 동기화 제외(이미 정확).
    });
  }
  return records.length ? records : null;
}

/**
 * 리스트 엑셀의 무게 칸을 **kg 정수**로 읽는다. — TallyOne 1.23
 *
 * 왜 — 종전엔 `parseInt('12.4')` 라 **소수점이 잘렸다.**
 *   선사에 따라 무게 칸을 **톤 소수 한 자리**로 적는다(실측: `PTK CDL OF XTPG 535E.xlsx`
 *   → `DYLU5118230 | 45G0 | 12.4 | F`). 그 12.4 가 `12` 로 저장돼 **12,400kg 이 12kg** 이 됐다.
 *   XTPG 535E 실데이터 61건이 그 상태였고, EDI 와 대조하면 60건 전부
 *   `리스트값 == floor(EDI/1000)` 로 정확히 맞았다(2026-08-07 실측, 불일치 0).
 *
 *   더 위험한 것은 F/E 다 — `mixerUpload` 는 무게 5,000 미만이면 엠티로 추정한다.
 *   12kg 이면 **풀 컨이 통째로 엠티로 들어간다.** XTPG 는 리스트에 F 표기가 따로 있어 살았다.
 *
 * 단위 판정 — 값이 0 초과 200 미만이면 톤으로 본다.
 *   20ft 빈 컨의 타레만 해도 2,200kg 이라 **kg 값이 200 미만일 수 없다.** 톤이면 45t 언저리가 최대다.
 *   즉 두 범위는 겹치지 않는다. 겹치지 않으므로 추측이 아니다.
 */
export function parseListWeightKg(raw) {
  const s = String(raw ?? '').replace(/[,\s]/g, '');
  if (!s) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 200 ? Math.round(n * 1000) : Math.round(n);
}

export async function parseListExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const records = [];
  const seen = new Set();

  // 컨번호 헤더 패턴 (V38 확장 + M3.5.6 중국어/한국어 보강)
  const CN_HEAD = [
    /^container$/, /^containerno$/, /container\s*no/, /^containerno\.?$/,
    /^cntr$/, /^cntrno$/, /cntr\s*no/, /^cntrno\.?$/,
    /^cnt$/, /^cntno$/, /cnt\s*no/, /^cntno\.?$/,
    /^cntno$/, /^cntr#$/, /^cont(ainer)?#$/,
    /컨테이너.*번호/, /^컨테이너$/, /^콘테이너/,
    /^c\/?no$/, /^cont(ainer)?\.?\s*no\.?$/,
    /container.*number/, /^container\s*#/,
    /^cntrno\.$/, /^cntr\s*no\.$/,
    /^箱号$/, /^货柜号$/,  // M3.5.6: 중국어 (VGM 등)
    /^cntno$/i, /^cntr\.?no\.?$/i,
  ];
  // 실번호 헤더 패턴 (V38 확장 + M4.9c "엠티실번호" 등 변형)
  // M4.9c-fix: 사용자 신고 — 우리 앱 보고서 양식("엠티실번호" 헤더)을 다음 항차 선적 리스트로
  //            재사용하는 검수원 워크플로우. /^실번호/는 "실번호"로 시작해야 매칭 (엠티실번호 X).
  //            → "실번호$" (끝나는 패턴) 추가, "엠티실" 명시 추가.
  const SL_HEAD = [
    /^seal$/, /^sealno$/, /seal\s*no/, /^seal\s*no\.?$/,
    /^seal#$/, /^seal\s*number/, /^seal\.?\s*no\.?\s*1?$/,
    /^실번호/, /실번호$/, /^실$/, /^봉인/, /봉인.*번호/, /^seal#?\d?$/,
    // 풀 컨테이너 실 (full container seal)
    /^full.*seal$/, /^f.*seal$/,
    // 2.08-12 (검수사 «머스크 리스트 파서가 잘못된듯» — MCSN 632N 실측): 머스크 StandardDischargeList 는
    //   씰이 Shipper Seal / Customs Seal / ML Seal / Vet Seal 4열 — 어느 것도 종전 패턴에 안 걸려
    //   «컨번호 옆 5칸 자동 탐색»이 Bookno(부킹번호)를 씰로 채택했다(85컨 같은 번호 오탐).
    /^shipper\s*seal$/,
  ];

  // M4.9c-fix: 엠티 실 별도 헤더 — c.eseal에 매핑
  //   "엠티실번호", "Empty Seal", "E-Seal" 등 명시적 엠티실 컬럼
  const ESEAL_HEAD = [
    /^엠티실번호/, /^엠티\s*실$/, /^엠티봉인/,
    /^empty.*seal/, /^e[-\s]?seal/, /^reefer.*seal/,
    /엠티.*실/, /empty.*실/,
  ];

  // M3.86: 헤더 정규화 통일 (점/콤마/괄호 제거 → "Cntr.No", "Seal No.", "Tp/Sz" 등 인식)
  // 슬래시는 유지(F/E, L/S 같은 의미 구분에 필요)
  const normHeader = (s) => String(s || '').trim().toLowerCase()
    .replace(/[\.\,]/g, '').replace(/[\(\)\[\]]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  // M3.86: ISO 합성 함수 (Size + Type 분리 컬럼, "DC43" 합쳐진 표기, 표준 ISO 모두 처리)
  // 평택항 표준 (메모리 #15): 22G1=20DC, 42G1=40DC, 45G1=40HC, L5G1=45HC(진짜), 22R1=20RF, 45R1=40RF, L5R1=45RF
  const composeIso = (lenS, cat) => {
    let prefix = '';
    if (lenS === '20' || lenS === '22') prefix = '22';
    else if (lenS === '40' || lenS === '42') prefix = '42';
    else if (lenS === '40HC' || lenS === '43' || lenS === '4H' || lenS === '4G') prefix = '45';
    else if (lenS === '45') prefix = 'L5';
    if (!prefix) return '';
    const c = String(cat || '').toUpperCase().trim();
    if (/^(DC|GP)$/.test(c)) return prefix + 'G1';
    if (/^HC$/.test(c)) return prefix === '42' ? '45G1' : (prefix + 'G1');
    if (/^(RF|REEF|REEFER|RH)$/.test(c)) return prefix + 'R1';
    if (/^(RHC|RFHC)$/.test(c)) return prefix === '42' ? '45R1' : (prefix + 'R1');
    if (/^(TC|TK|TANK)$/.test(c)) return prefix + 'T6';
    if (/^(OT|OPEN|OP)$/.test(c)) return prefix + 'U1';
    if (/^(FR|PL|PF|FLAT|FLATRACK)$/.test(c)) return prefix + 'P1';
    if (/^(BU|BULK)$/.test(c)) return prefix + 'B0';
    return '';
  };
  const deriveIso = (sizeRaw, typeRaw) => {
    const clean = (v) => String(v || '').toUpperCase().replace(/[\s\-\/]/g, '').replace(/FT$/, '');
    const sz = clean(sizeRaw);
    const tp = clean(typeRaw);
    // V8.09: RIZHAO ORIENT 선적 LOADING LIST 고유 표기 (20'D / 40'H / 40'R / 45'H / 20'L)
    //   따옴표(')를 살린 길이+카테고리 1글자 표기. 작은따옴표 포함이라 타 선사 코드와 충돌 없음.
    //   D=Dry, H=High Cube, R=Reefer, L=Luggage(수하물·20피트 일반 취급).
    for (const v of [clean(typeRaw).replace(/'/g, "'"), String(sizeRaw || '').toUpperCase().trim(), String(typeRaw || '').toUpperCase().trim()]) {
      const rz = v.replace(/\s/g, '');
      if (rz === "20'D" || rz === "20'L") return '22G1';
      if (rz === "20'R") return '22R1';
      if (rz === "40'H") return '45G1';
      if (rz === "40'R") return '45R1';
      if (rz === "40'D") return '42G1';
      if (rz === "45'H") return 'L5G1';
      if (rz === "45'R") return 'L5R1';
    }
    // 1) 입력 자체가 표준 ISO (42HQ, 22G1, L5G1 등)
    for (const v of [tp, sz]) {
      if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$|^L\d[A-Z]\d$/.test(v)) return v;
    }
    // M5.81 신규: DJS DONGJIN 비표준 코드 (D2/D5/D4/R2/R5)
    //   D2=22G1 (20DC), D5=45G1 (40HC), D4=42G1 (40DC), R2=22R1 (20RF), R5=45R1 (40HC RF)
    for (const v of [tp, sz]) {
      if (v === 'D2') return '22G1';
      if (v === 'D5') return '45G1';
      if (v === 'D4') return '42G1';
      if (v === 'R2') return '22R1';
      if (v === 'R5') return '45R1';
    }
    // M5.81 신규: NSL 영문 자연어 양식 (4HDC=40HC, 20DC, 20RF, 4HRF 등)
    //   "4H"는 40HC를 의미하는 NSL 특유의 약어 (4=40ft, H=High Cube)
    for (const v of [tp, sz]) {
      // 40HC 변형
      if (/^(4HDC|40HC|40HQ|4HGP|45DC|45GP|4HC)$/.test(v)) return '45G1';
      // 40HC 리퍼
      if (/^(4HRF|4HRH|40HR|40RH|45RF|45RE|4HRE)$/.test(v)) return '45R1';
      // 40DC (드물지만 정확히 표기된 경우)
      if (/^(40DC|40GP|42DC|42GP|4DC|4GP)$/.test(v)) return '42G1';
      // 40DC 리퍼
      if (/^(40RF|42RF|42RE|40RE)$/.test(v)) return '42R1';
      // 20DC
      if (/^(20DC|20GP|22DC|22GP|2DC|2GP)$/.test(v)) return '22G1';
      // 20RF
      if (/^(20RF|20RH|22RF|22RE|20RE)$/.test(v)) return '22R1';
      // 특수
      if (/^(4HFR|40FR|45FR|42PC|42PF)$/.test(v)) return '45P1';
      if (/^(20FR|22PC|22PF)$/.test(v)) return '22P1';
      if (/^(4HOT|40OT|45OT|42UT)$/.test(v)) return '45U1';
      if (/^(20OT|22UT)$/.test(v)) return '22U1';
      if (/^(20TK|22TN|22T6)$/.test(v)) return '22T1';
      if (/^(40TK|42TN|42T6)$/.test(v)) return '42T1';
      // 진짜 45피트
      if (/^(L5GP|L5DC|45L|L45|45FT)$/.test(v)) return 'L5G1';
      // V9.28-10: 연운항(TNJP) CNTR LIST 축약 SZ 코드 — 26354E 실측: 리스트 118대 전부 iso 미인식.
      //   5R(40리퍼HC=EDI 43RF 24대와 1:1)·4J(40HC=43DC)·2D(20DC)·4D(40DC 표준높이)·2T(20탱크).
      //   REMARK의 RF온도·UN·IMDG는 이미 뽑고 있었는데 SZ를 몰라 rf=false — "리퍼 실종"의 마지막 조각.
      if (/^5R$/.test(v)) return '45R1';
      if (/^4R$/.test(v)) return '45R1';
      if (/^2R$/.test(v)) return '22R1';
      if (/^4J$/.test(v)) return '45G1';
      if (/^2D$/.test(v)) return '22G1';
      if (/^4D$/.test(v)) return '42G1';
      if (/^2T$/.test(v)) return '22T1';
    }
    // 2) "DC43", "RF40" 같은 합쳐진 표기 (CDL Tp/Sz 양식)
    for (const v of [tp, sz]) {
      let m = v.match(/^([A-Z]{2,4})(\d{2,3})$/);   // "DC43"
      if (m) { const r = composeIso(m[2], m[1]); if (r) return r; }
      m = v.match(/^(\d{2,3})([A-Z]{2,4})$/);       // "43DC"
      if (m) { const r = composeIso(m[1], m[2]); if (r) return r; }
    }
    // 3) Size + Type 분리 컬럼 (NGB/SHA: "20"+"DC", "4H"+"RF")
    if (sz && tp) {
      let lenS = '';
      if (/^(20|22)/.test(sz)) lenS = '20';
      else if (/^(40|42)/.test(sz)) lenS = '40';
      else if (/^4[HG]/.test(sz)) lenS = '40HC';
      else if (/^45/.test(sz)) lenS = '45';
      else if (/^4L/.test(sz)) lenS = '45';
      if (lenS) { const r = composeIso(lenS, tp); if (r) return r; }
    }
    return '';
  };

  // V8.09: 정식 헤더(CONTAINER 등) 시트가 하나라도 파싱되면, 헤더 없는 fallback 셀스캔은 끈다.
  //   RIZHAO 선적 엑셀처럼 메인 리스트 시트 + 작업자 메모/이전항차 잡시트가 섞인 경우,
  //   잡시트의 흩어진 컨번호를 주워 과집계하던 문제 차단. (헤더 시트가 전무할 때만 fallback 유지.)
  let formalSheetParsed = false;
  for (const sheetName of wb.SheetNames) {
    const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);   // V38: !ref 보정
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    // M8.08: 세관리스트(적하목록) 전용 파싱 — 검수 주 리스트.
    {
      const cuRecords = parseCustomsSheet(grid);
      if (cuRecords) { records.push(...cuRecords); continue; }
    }

    // M8.07: RIZHAO ORIENT(日照海通) 예배清单 전용 파싱.
    //   주3회 정기 입항선. 중국어 헤더(提单号/箱号/封号/箱量/重/温度/目的港) +
    //   '箱量' 컬럼이 "40FR*1" 형식(규격*수량). 양하분은 전건 Full(엠티 없음).
    //   기존 영문/한국어 양식 로직과 완전 분리: 감지되면 여기서 처리 후 다음 시트로.
    {
      const rzRecords = parseRizhaoSheet(grid);
      if (rzRecords) { records.push(...rzRecords); continue; }
    }

    // M3.86: SOC 양식 감지 (R0~R5 메타 행에 "SOC" 키워드 있으면 SOC 양식으로 판정)
    // SOC는 풀/엠티 모두 가능, F/E 미명시면 Seal 유무로 판정
    let isSocSheet = false;
    for (let i = 0; i < Math.min(6, grid.length); i++) {
      const rowText = (grid[i] || []).map(v => String(v || '')).join(' ').toUpperCase();
      if (/\bSOC\b|SOC\s*NO\.?\s*LIST/.test(rowText)) { isSocSheet = true; break; }
    }

    // 1단계: 헤더 행 찾기 (50줄까지, 한 행에 컨번호 키워드가 있는 셀이 1개라도 있으면 OK)
    let headerRow = -1, headers = null;
    for (let i = 0; i < Math.min(50, grid.length); i++) {
      const row = (grid[i] || []).map(normHeader);
      const hasCN = row.some(c => CN_HEAD.some(p => p.test(c)));
      if (hasCN) {
        headerRow = i;
        headers = (grid[i] || []).map(s => String(s || '').trim());
        break;
      }
    }

    // 2단계: 헤더 못 찾으면 fallback (모든 셀에서 컨번호 패턴 스캔)
    //   V8.09: 단, 앞선 시트에서 정식 헤더 리스트가 이미 파싱됐으면 이 fallback은 건너뛴다.
    //   (작업자 메모·이전 항차 잡시트의 흩어진 컨번호 과집계 방지.)
    if (headerRow < 0 && !formalSheetParsed) {
      for (const row of grid) {
        if (!row) continue;
        for (let ci = 0; ci < row.length; ci++) {
          const cellRaw = String(row[ci] || '');
          const cell = cellRaw.replace(/[\s\-]/g, '').toUpperCase();
          const m = cell.match(/^([A-Z]{4}\d{6,7})$/);
          if (m && !seen.has(m[1])) {
            seen.add(m[1]);
            const cn = m[1];
            const allCells = row.map(v => String(v || '').trim());

            // 실번호: 컨번호 옆 (1~5 컬럼 안)
            let sl = '';
            for (let j = ci + 1; j < Math.min(ci + 6, allCells.length); j++) {
              const v = allCells[j].replace(/[\s\-]/g, '');
              if (/^[A-Z]{0,6}\d{4,}$/i.test(v) && v.length >= 5 && v !== cn) {
                sl = v.toUpperCase();
                break;
              }
            }
            // 무게
            let wt = 0;
            for (const v of allCells) {
              const n = parseInt(String(v).replace(/[,\s]/g, ''));
              if (!isNaN(n) && n >= 1000 && n <= 50000) { wt = n; break; }
            }
            // ISO (M3.86: 4자리 숫자 매칭 제거 - 무게값 "3800"/"2660"이 ISO로 잘못 들어가는 사고 차단)
            let iso = '';
            for (const v of allCells) {
              const t = String(v).trim().toUpperCase().replace(/[\s\-]/g, '');
              // 표준 ISO 6346 형식만: 22G1, 42HQ, L5G1 등
              if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$|^L\d[A-Z]\d$/.test(t)) { iso = t; break; }
            }
            // POL/POD
            let pol = '', pod = '';
            for (const v of allCells) {
              const p = String(v).trim().toUpperCase();
              if (/^[A-Z]{5}$/.test(p) && p !== cn.slice(0, 4)) {
                if (!pol) pol = p;
                else if (!pod && p !== pol) { pod = p; break; }
              }
            }
            records.push({
              cn, l4: cn.slice(-4), sl, sl_orig: sl, wt, iso, pol, pod,
              op: '', bl: '', sh: '', gi: '',
              fe: '', dg: false, rf: false, fr: false, ot: false, tk: false, tmp: ''
            });
            break;
          }
        }
      }
      continue;
    }
    // V8.09: 헤더를 못 찾았고(위 fallback도 건너뛴 경우) 정식 시트가 이미 있었으면 이 시트는 잡시트 → 스킵.
    if (headerRow < 0) continue;

    // 헤더 키워드로 컬럼 인덱스 찾기 (M3.86: normHeader로 통일)
    const findCol = (patterns) => {
      for (let i = 0; i < headers.length; i++) {
        const h = normHeader(headers[i]);
        if (!h) continue;
        for (const p of patterns) if (p.test(h)) return i;
      }
      return -1;
    };

    const cn_i = findCol(CN_HEAD);
    const sl_i = findCol(SL_HEAD);
    // 2.08-12: 머스크 보조 씰 열 — Shipper Seal 이 비어 있으면 ML Seal 값을 쓴다(MCAU5007912 실측: ML만 있음)
    const mlSeal_i = findCol([/^ml\s*seal$/]);
    // M4.9c-fix: 엠티실 별도 컬럼 (예: "엠티실번호") — c.eseal로 매핑
    const eseal_i = findCol(ESEAL_HEAD);
    const bl_i = findCol([/^b\/?l/, /^bl\s*no/, /^m-?b\/?l/, /master.*b\/?l/, /^b\/?l\s*no$/, /^blno$/]);
    const wt_i = findCol([/^cargo\s*weight$|^total\s*weight$/, /gross.*wt|t\.?wgt|total.*wt|^weight|^wgt|^g\.?weight|^t\.?weight/, /무게/, /중량/, /^kg/, /^kgs/]);
    const sh_i = findCol([/shipper|forward|화주|consignor/]);
    const gi_i = findCol([/gate.*in/, /반입/]);
    const pol_i = findCol([/^pol$|load.*port|loading.*port/, /적재항/, /선적항/, /^lp$|^lwharf$/]);
    const pod_i = findCol([/^pod$|dis.*port|dis.*cy|discharge|destination/, /최종항/, /양하항/, /도착항/, /^dp$|^dlv$/]);
    // M3.86: F/E 패턴에서 L/S 제거 (L/S는 Local/SOC 구분이라 F/E 무관)
    const fe_i = findCol([/^f\/?e$|^full\/?empty$|^fe$|^full\/empty$/, /^적공$/, /^empty\/full$/, /^f\/m$/, /soc.*[ef]|[ef].*soc|soc\/e\/f|e\/f|status/]);
    // M3.86: L/S(Local/SOC) 컬럼 별도 추출 — SOC 식별용
    const ls_i = findCol([/^l\/?s$/]);
    // M3.86: type_i에 "Tp/Sz", "Tp.Sz", "Type/Size" 추가 (CDL 양식)
    const type_i = findCol([/^type$|^cntr.*type|^iso|^tysz$|^szty$|^sztp$|^tpsz$|^sz\/?tp$|^sz\s*tp$|^tp\/?sz$|^tp\s*sz$|^ty\/?sz$|^ty\s*sz$|^type\/?size$|^type\s*size$/, /^타입$/, /^컨.*규격/, /^kind$/]);   // V9.30: SzTp(천경 CDL) 추가 — 35대가 규격미상으로 등록되던 결함
    const size_i = findCol([/^size$|^sz$|^len$|^length$/, /^사이즈$/, /^규격$/]);
    let op_i = findCol([/^op$|^operator|^carrier|^line|^oper$|^soc.*line/, /^선사/, /선사부호/]);
    // V9.04-06: 선사·씰 겸용 헤더 가드 (STMJ 2639E 사건 2026-07-20) — 세관 X-RAY 조회 파일
    //   '검수업체컨테이너목록조회'의 B열 헤더가 "선사SEAL NO"라 op(/^선사/)와 sl(SEAL NO)이
    //   같은 열에 매칭 → 실번호 17개가 선사로 들어가 카고플랜 별첨1(선사별)에 1대씩 등재됐다.
    //   op 후보가 씰 컬럼과 같은 열이면 선사 컬럼이 아닌 것 — op 매핑을 포기한다(cargoType X-RAY 등
    //   나머지 컬럼은 그대로 살아 X-RAY 마킹 유지).
    if (op_i >= 0 && op_i === sl_i) op_i = -1;
    // M5.55: voucher 보강 — TSPORT(환적), PRINTPOD(실제 양하 항구), CARGO TYPE(DJS 양식 F/P)
    const tsport_i = findCol([/^tsport$|^ts.*port$|^transhipment.*port$/, /환적/]);
    const printpod_i = findCol([/^printpod$|^print.*pod$/, /^실제.*양하/]);
    const cargotype_i = findCol([/^cargo.*type$|^cargo\s*type$/, /화물구분/]);
    const dg_i = findCol([/^dg$|hazmat|imdg/, /위험물/]);
    // V9.21-03: REMARK 자유 텍스트 열 — 연운항(TNJP) 리스트는 DG·온도를 REMARK에 실는다
    //   (실측 26353E: "RF +23  IMDG 9 UN_CD 3480" × 33 — 수석 ( DG x 33 )의 출처).
    const rmk_i = findCol([/^remarks?$/, /^비고$/]);
    // V8.09: ITEM 컬럼 (RIZHAO 선적 LOADING LIST 공컨 표기). "공컨테이너"=Empty, 빈칸=Full.
    const item_i = findCol([/^item$/, /^품목$/, /^공컨/]);
    // TallyOne 1.8-04: `R/F`·`R/E`·`R/D` 표기 (검수사 확정 2026-08-04).
    //   "각종 리스트 플랜에 R/E R/F 표기만 정확하면 됩니다" · "리퍼 드라이는 R/D로 표기 온도와 무관합니다"
    //   앞 글자는 종류(R=리퍼, D=드라이 등), 뒤 글자가 풀/공/드라이다. 슬래시·하이픈 둘 다 쓰인다.
    //   ⚠ 종전엔 이 형태가 F/E·TYPE·SIZE 어느 경로에서도 안 잡혀 **미판정 → 기본 Full** 로 흘렀다.
    //     그래서 공 리퍼(R/E)가 풀로 집계되고, 리퍼드라이(R/D)는 온도 못 재는데 온도 경고에 잡혔다.
    //   반환: 'F' | 'E' | 'D'(리퍼드라이 — 호출부가 rfdry 로 세운다) | ''
    // M3.85: SITC SENDAI 양식의 [40] "냉동" 컬럼이 실제 온도값(-18, -2.5 등)인데
    //   기존 /냉장/만 있어서 매칭 안 되어 26대 풀 리퍼 모두 미입력 처리되던 버그 수정.
    //   추가로 "set temp", "setpoint", "carry temp", "rf temp" 등 흔한 변형도 인식.
    const tmp_i = findCol([
      // V9.06-02: 중국 선사 리퍼 리스트(冷箱清单 — TMPZ 2022E 실측) 'Degre(e)' 열 + ℃ 표기 인식.
      /^temp|^temperature|^reefer/, /^degre/, /set\s*temp/, /set\s*point/, /carry\s*temp/, /rf\s*temp/,
      /온도/, /냉장/, /냉동/, /^냉동온도/, /^냉장온도/, /℃|°c/,
    ]);

    if (cn_i < 0) continue;
    // V8.09: 여기 도달 = CONTAINER 헤더 + 컨번호 컬럼 확정된 정식 리스트 시트.
    //   이후 시트의 헤더 없는 fallback 셀스캔을 끈다(잡시트 과집계 방지).
    formalSheetParsed = true;

    // 데이터 행 처리 (헤더 다음부터, 빈 행 자동 건너뛰기)
    // V38: 병합셀로 컨번호 컬럼이 한 칸 어긋난 경우 ±2 컬럼까지 탐색
    for (let i = headerRow + 1; i < grid.length; i++) {
      const row = grid[i] || [];
      let cn = String(row[cn_i] || '').replace(/[\s\-]/g, '').toUpperCase();
      let cnColActual = cn_i;
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) {
        // 같은 행에서 ±2 컬럼까지 시도
        for (const off of [-1, 1, -2, 2]) {
          const c = cn_i + off;
          if (c < 0 || c >= row.length) continue;
          // V8.04-04: 실번호 열은 컨번호 후보에서 제외. SITZ811084 같은 실번호가
          //   4영문+6숫자 CN 패턴에 우연히 맞아 컨번호로 오인되던 버그(XRAY 미매칭 유발) 방지.
          if (sl_i >= 0 && c === sl_i) continue;
          const tryCn = String(row[c] || '').replace(/[\s\-]/g, '').toUpperCase();
          if (/^[A-Z]{4}\d{6,7}$/.test(tryCn)) {
            cn = tryCn;
            cnColActual = c;
            break;
          }
        }
      }
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) continue;
      if (seen.has(cn)) continue;
      seen.add(cn);

      // 실번호: 헤더로 못 찾으면 같은 행에서 자동 탐색 (V38: 병합셀 대응)
      // M3.86: SOC fallback에 sl이 필요하므로 fe보다 먼저 추출
      let sl = '';
      // M8.08: 규격(ISO) 형태 값은 실번호가 아님 — 자동 탐색에서 제외.
      const looksLikeIso = (v) => {
        const s = String(v || '').toUpperCase().replace(/[\s\-]/g, '');
        return /^(20|22|25|28|40|42|45|48|L5|L2)[A-Z]{1,2}\d?$/.test(s)
          || /^(20|40|45)(DC|GP|HC|RF|RH|FR|OT|TK|HQ|RE)?[FE]?$/.test(s)
          || /^\d{2}[A-Z]{2}\d?$/.test(s);
      };
      if (sl_i >= 0) {
        // M8.08: SEAL 헤더가 명확히 있으면 그 칸 값만 사용. 비어있으면 실 없음(엠티 등) — 옆칸 탐색 금지.
        //   (ATRP: SEAL 빈칸인데 옆 TYSZ/BLNO를 실번호로 오인하던 버그 방지.)
        sl = String(row[sl_i] || '').trim();
        if (!sl && mlSeal_i >= 0) sl = String(row[mlSeal_i] || '').trim();   // 2.08-12: ML Seal 폴백
      } else {
        // SEAL 헤더를 못 찾은 경우만 컨번호 옆 5칸 자동 탐색 (병합셀 등 대응, 규격 제외).
        // 2.08-12: 열 헤더가 부킹/BL 계열이면 후보에서 제외 — Bookno 를 씰로 채택하던 오탐 봉쇄.
        const _NOT_SEAL_COL = /book|b\/?l\s*no|^blno$|m-?b\/?l|invoice|voyage/i;
        for (let j = cnColActual + 1; j < Math.min(cnColActual + 6, row.length); j++) {
          const _h = String((headers && headers[j]) || '').trim();
          if (_h && _NOT_SEAL_COL.test(_h)) continue;
          const v = String(row[j] || '').replace(/[\s\-]/g, '');
          if (/^[A-Z]{0,6}\d{4,}$/i.test(v) && v.length >= 5 && v.toUpperCase() !== cn && !looksLikeIso(v)) {
            sl = v.toUpperCase();
            break;
          }
        }
      }

      // F/E 추출 (V38.5: SIZE/TYPE/F/E 세 컬럼 종합)
      // 1순위: 명시적 F/E 컬럼
      // 2순위: TYPE 컬럼 끝 글자 (예: "20DCF", "40HCE", "22GPE")
      // 3순위: SIZE 컬럼 끝 글자 (예: "20F", "40E")
      // M3.74: 무게 기반 추정 완전 제거 (M3.73 정책과 일치)
      // M3.86: SOC fallback 추가 (F/E 미명시 + SOC면 Seal 유무로 판정)
      let fe = '';
      let rfdryFlag = false;      // 1.8-04: `R/D` 표기를 만나면 세운다 (온도 확인 대상에서 뺀다)
      if (fe_i >= 0) {
        const feRaw = String(row[fe_i] || '').trim().toUpperCase();
        if (feRaw === 'F' || feRaw === 'FULL' || feRaw === 'L' || feRaw === 'LOADED') fe = 'F';
        else if (feRaw === 'E' || feRaw === 'EMPTY' || feRaw === 'MT' || feRaw === 'M') fe = 'E';
        else {
          const s = _feFromSlash(feRaw);
          if (s === 'D') rfdryFlag = true;     // R/D = 리퍼드라이(넌플러그) — 온도와 무관
          else if (s) fe = s;
        }
      }
      // V8.09-02: ITEM 컬럼 "공컨테이너" 표기 (RIZHAO 선적 LOADING LIST).
      //   엠티 컨에도 실(seal)이 붙는 선박이라 실 유무로 F/E 판정 불가 → ITEM 표기가 유일한 근거.
      //   "공컨테이너"/"공컨"/"EMPTY"=Empty만 잡는다.
      //   ★V8.09-01 버그 수정: "빈칸=Full 강제"를 제거. ITEM이 품목·순번 등 다른 용도인
      //     일반 선박에서 ITEM 빈칸이 전 컨을 Full로 덮어써, TYPE/SIZE 끝글자·SOC seal로
      //     판정될 엠티가 모두 Full로 오집계되던 문제(전 선박 공컨 집계 이상)를 차단.
      //     빈칸은 아래 정상 경로(TYPE/SIZE/SOC)로 흘려보내고, RIZHAO 선적은 그 경로에서
      //     끝글자가 없어 결국 기본 Full로 가므로 기존 동작과 동일.
      if (!fe && item_i >= 0) {
        const itemRaw = String(row[item_i] || '').trim();
        if (/공\s*컨|empty|엠티|^MT$/i.test(itemRaw)) fe = 'E';
      }
      // TYPE 끝 글자
      if (!fe && type_i >= 0) {
        const tRaw0 = String(row[type_i] || '').trim().toUpperCase();
        const s0 = _feFromSlash(tRaw0);         // `R/F`·`R/E`·`R/D` 형태 먼저
        if (s0 === 'D') rfdryFlag = true;
        else if (s0) fe = s0;
        const tRaw = tRaw0.replace(/[\s\-]/g, '');
        if (!fe && /^([A-Z]{2}\d{2}|[A-Z]{2,4}|\d{2}[A-Z]{2,3}|\d{4})\d{0,3}([FE])$/.test(tRaw)) {
          fe = tRaw.slice(-1);
        }
      }
      // SIZE 끝 글자
      if (!fe && size_i >= 0) {
        const sRaw = String(row[size_i] || '').trim().toUpperCase().replace(/[\s\-]/g, '');
        if (/^(20|40|45)(FT)?([FE])$/.test(sRaw)) {
          fe = sRaw.slice(-1);
        }
      }
      // TallyOne 1.8-06: **온도가 적혀 있으면 풀 리퍼다.** 검수사 확인 2026-08-04 —
      //   "F 45RE 온도 이렇게 올수도 있습니다. 이건 풀리퍼라는 이야기 입니다."
      //   온도를 적었다는 건 가동 중이라는 뜻이다. 공 리퍼엔 적을 온도가 없다.
      //   앞선 판정(F/E 열·ITEM·TYPE·SIZE)이 전부 못 정했을 때만 쓰는 폴백이다 —
      //   명시된 F/E 를 덮지 않는다.
      if (!fe && tmp_i >= 0) {
        const tRawV = String(row[tmp_i] || '').trim();
        if (tRawV && /-?\d/.test(tRawV)) fe = 'F';
      }
      // M3.86: SOC 양식이고 F/E 미명시면 Seal 유무로 판정 (실 있음=풀, 실 없음=엠티)
      if (!fe && isSocSheet) {
        const lsVal = ls_i >= 0 ? String(row[ls_i] || '').trim().toUpperCase() : '';
        // 시트 전체가 SOC거나, 이 행의 L/S='S'면 SOC 행으로 판정
        const isSocRow = (ls_i < 0) || lsVal === 'S' || lsVal === 'SOC';
        if (isSocRow) fe = sl ? 'F' : 'E';
      }

      // 타입 (M3.86: deriveIso로 표준화 - "DC43"/"4H+RF"/"42HQ" 모두 처리)
      const sizeRaw = size_i >= 0 ? String(row[size_i] || '').trim() : '';
      const typeRaw = type_i >= 0 ? String(row[type_i] || '').trim() : '';
      let iso = deriveIso(sizeRaw, typeRaw);
      // fallback: 기존 키워드 매칭 (deriveIso가 못 잡은 케이스용)
      // M5.81: NSL "4HDC", DJS "D5" 등 명시적 패턴 추가 (40DC 잘못 분류 방지)
      if (!iso) {
        const isoRaw = (typeRaw + ' ' + sizeRaw).toUpperCase().replace(/[\s\-\/]/g, '');
        // 40HC 패턴 (가장 흔한 평택항 케이스, 먼저 검사)
        if (/40.*HC|40HQ|4HDC|45GP|45DC|^D5$|^R5$/.test(isoRaw)) iso = '45G1';
        else if (/20.*DC|20.*GP|^D2$/.test(isoRaw)) iso = '22G1';
        else if (/40.*DC|40.*GP|^D4$/.test(isoRaw)) iso = '42G1';
        else if (/RF|REEFER|^R[25]$/.test(isoRaw)) iso = isoRaw.includes('20') || isoRaw.includes('22') ? '22R1' : '45R1';
        // V9.57: TK도 크기 토큰 반영 — 40/45 탱크가 전부 22T6(20피트)으로 박히던 결함 교정
        else if (/TK|TANK/.test(isoRaw)) iso = (isoRaw.includes('40') || isoRaw.includes('42') || isoRaw.includes('45')) ? '42T6' : '22T6';
      }

      const dgVal = dg_i >= 0 ? String(row[dg_i] || '').trim() : '';
      let isDg = !!(dgVal && /^(Y|YES|TRUE|1|DG|HAZ)/i.test(dgVal));
      // V9.21-03: REMARK 자유 텍스트에서 DG(IMDG 클래스·UN번호)·리퍼 온도 감지
      const rmkVal = rmk_i >= 0 ? String(row[rmk_i] || '').trim().toUpperCase() : '';
      let rmkDgc = '', rmkUn = '', rmkTmp = null, rmkMkc = false;
      if (rmkVal) {
        const mCls = rmkVal.match(/(?:IMDG|CLASS)[\s.:]*([0-9](?:\.[0-9])?)/);
        const mUn = rmkVal.match(/UN[_\s]*(?:CD|NO)?[_\s.:]*([0-9]{4})/);
        if (mCls || mUn) { isDg = true; rmkDgc = mCls ? mCls[1] : ''; rmkUn = mUn ? mUn[1] : ''; }
        const mT = rmkVal.match(/RF\s*([+-]?\d+(?:\.\d+)?)/);
        if (mT) rmkTmp = mT[1].replace(/^\+/, '');
        // V9.23: 제작컨테이너 — 컨 자체가 상품(빈 컨). RZOR R080E HSAP 10대 'CY/CY 특수컨' 실측
        if (/특수\s*제작|특수\s*컨|제작\s*컨/.test(rmkVal)) rmkMkc = true;
      }

      // M3.85 fix: row[tmp_i]가 숫자 0이면 `0 || ''` = '' 로 사라지던 버그
      // JavaScript falsy 함정 (0, '', null, undefined 모두 falsy)
      // 해결: nullish 체크로 숫자 0 보존
      const tmpRawCell = tmp_i >= 0 ? row[tmp_i] : null;
      let tmpValRaw = (tmpRawCell != null && tmpRawCell !== '')
        ? String(tmpRawCell).trim()
        : '';
      // M3.6: 0°C는 실제 온도 (신선 채소, 의약품 등)
      // 진짜 미입력은 빈 값/"-" 만
      let tmpVal = tmpValRaw;
      let tmpMissing = false;
      if (tmpValRaw === '' || tmpValRaw === '-') {
        tmpVal = '';
        tmpMissing = true;
      } else {
        // "0", "0.0", "+0", "-0", "000" 모두 정규화 → 그대로 0°C
        // V9.06-02: '-18C'/'−18℃' 같은 단위 접미 허용(冷箱清单 실측) — 숫자만 남긴다.
        const m = tmpValRaw.match(/^([+-]?)0*(\d+(?:\.\d+)?)\s*(?:[cC]|℃|°C)?$/);
        if (m) tmpVal = (m[1] || '') + m[2];
      }
      const isoUpper = (iso || '').toUpperCase();
      // 특수화물 태그 (45ft 영역 4[5689] 포함, 예: 46P3=45FR)
      // 리퍼 판정: ISO 기준 우선, 온도가 진짜 있으면 + 표기
      // M3.85: 통합 헬퍼로 리퍼 판정 (40HR/RFHC 등 모든 변형 인식)
      const isRf = (tmpVal && tmpVal !== '-') || isReeferIso(isoUpper);
      const isFr = /^[24][0245689]P/.test(isoUpper) || /^[24]0F[PR]/.test(isoUpper) || /^45P/.test(isoUpper) || /^L5P/.test(isoUpper);
      const isOt = /^[24][0245689]U/.test(isoUpper) || /^[24]0O/.test(isoUpper) || /^4[5689]O/.test(isoUpper) || /^L5U/.test(isoUpper);
      const isTk = /^[24][0245689]T/.test(isoUpper) || /^L5T/.test(isoUpper);

      // M4.9c-fix: 엠티실 별도 컬럼에서 추출
      let esealFromCol = '';
      if (eseal_i >= 0) {
        esealFromCol = String(row[eseal_i] || '').trim();
        if (!esealFromCol) {
          for (const off of [-1, 1, -2, 2]) {
            const c = eseal_i + off;
            if (c < 0 || c >= row.length || c === cnColActual) continue;
            const v = String(row[c] || '').trim();
            if (v && v.toUpperCase() !== cn) { esealFromCol = v; break; }
          }
        }
      }

      // M4.9c-fix: sl/eseal 분기 결정
      //   - SL_HEAD 매칭 + ESEAL_HEAD 매칭: 둘 다 별도 → 각자 매핑
      //   - SL_HEAD만 매칭, fe='E': 데이터를 eseal로 (사용자가 일반 "실번호" 컬럼에 엠티실 적은 경우)
      //   - ESEAL_HEAD만 매칭, fe='F': 데이터를 sl로 (드물지만 안전)
      //   - 한 컬럼만 있고 fe 미정: sl/eseal 동일 데이터 (어느 쪽이든 보임)
      let finalSl = sl;
      let finalEseal = esealFromCol;
      if (eseal_i < 0 && sl_i >= 0 && fe === 'E' && finalSl) {
        // SL 컬럼이지만 엠티 → eseal로 옮김
        finalEseal = finalSl;
        finalSl = '';
      } else if (sl_i < 0 && eseal_i >= 0 && fe === 'F' && finalEseal) {
        finalSl = finalEseal;
        finalEseal = '';
      } else if (sl_i < 0 && eseal_i < 0) {
        // 둘 다 안 잡힘 — 자동 탐색된 sl을 fe에 따라 분기
        if (fe === 'E') { finalEseal = finalSl; finalSl = ''; }
      }

      records.push({
        cn, l4: cn.slice(-4),
        // 1.8-04: `R/D`(리퍼드라이 — 넌플러그, 온도 무관)를 리스트에서 읽었으면 표시를 세운다.
        //   false 는 굳이 쓰지 않는다 — 기존 값(수집기 패치·검수원 입력)을 덮지 않기 위함.
        ...(rfdryFlag ? { rfdry: true } : {}),
        sl: finalSl,
        sl_orig: finalSl,
        eseal: finalEseal,
        eseal_orig: finalEseal,
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        // 1.23: parseInt → parseListWeightKg (톤 소수 표기 절사 사고 — 위 함수 주석 참조)
        wt: wt_i >= 0 ? parseListWeightKg(row[wt_i]) : 0,
        pol: pol_i >= 0 ? String(row[pol_i] || '').trim() : '',
        pod: pod_i >= 0 ? String(row[pod_i] || '').trim() : '',
        fe,
        iso,
        op: op_i >= 0 ? String(row[op_i] || '').trim() : '',
        tsport: tsport_i >= 0 ? String(row[tsport_i] || '').trim() : '',
        printpod: printpod_i >= 0 ? String(row[printpod_i] || '').trim() : '',
        cargoType: cargotype_i >= 0 ? String(row[cargotype_i] || '').trim() : '',
        dg: isDg,
        dgc: rmkDgc || '',                 // V9.21-03: REMARK에서 뽑은 IMDG 클래스/UN번호
        //   V9.32-02: || undefined → || '' — undefined가 든 레코드는 Firebase set()이 통째로 거부
        //   ("value argument contains undefined"). 평소엔 기존 리스트와의 병합이 undefined를 걸러
        //   숨어 있다가, 빈 리스트에 전신규+충돌 0건(EDI 전건 일치)인 OBWH 2702W에서 직행 저장으로
        //   터졌다 — 업로드가 "처리 중"에서 조용히 멈춘 진짜 원인(사용자 신고 2026-07-31, 재현 확정).
        un: rmkUn || '',
        rf: isRf,
        fr: isFr,
        ot: isOt,
        tk: isTk,
        tmp: (tmpVal === '' && rmkTmp != null) ? rmkTmp : tmpVal,   // V9.21-03: REMARK 온도 보강(빈 경우만)
        tmp_missing: tmpMissing && rmkTmp == null && isRf && !rmkMkc,
        mkcon: rmkMkc || false,            // V9.23: 제작컨테이너 (V9.32-02: undefined→false, Firebase 거부 방지)
      });
    }
  }
  // M3.73: 무게 기반 F/E 추정 완전 제거
  // 원칙: 리스트의 F/E 명시값만 사용. 무게로 추정 X.
  // ISO 끝자리 동기화: F/E와 ISO 끝자리가 다르면 F/E 우선
  for (const r of records) {
    if (r._rz || r._customs) continue;  // M8.07/08: RIZHAO·세관 레코드는 ISO가 이미 표준 — 끝자리 변환 금지.
    if (!r.iso || r.iso.length < 4) continue;
    const last = r.iso[r.iso.length - 1];
    if (r.fe === 'E' && last !== 'E') {
      r.iso = r.iso.slice(0, -1) + 'E';
    } else if (r.fe === 'F' && last === 'E') {
      r.iso = r.iso.slice(0, -1) + 'F';
    }
  }
  // ── TallyOne 1.4: 수화물(Lug) 자동 판별 — OBWH CLL 전용 게이트 ──────────────
  //   근거: OBWH CLL 4회차 11리비전 전수 검증(2698W·2700W·2702W·2704W) 11/11 적중·반증 0.
  //   판별식은 아래 순서로 첫 적중만 채택한다. 게이트를 먼저 걸어 다른 선박 리스트는 아예 타지 않는다.
  //     1순위  맨 끝 화주 열이 공란인 행           (단독 11/11 — 가장 견고)
  //     2순위  Weight공란 ∧ VGM공란 ∧ F/E=E ∧ 20ft (화주 열이 없는 시트1만 올 때)
  //   ⚠ 중량 공란 단독은 쓰지 않는다 — 리비전 초기에 최대 37건이라 노이즈다(실측).
  //   ⚠ BC20(2200kg·화주=연태훼리·Seal='W')은 수화물이 아니다 — 자사 엠티.
  try {
    const lugg = detectLuggageFromCLL(wb, XLSX);
    if (lugg.length) {
      const set = new Set(lugg);
      for (const r of records) if (set.has(r.cn)) r.lugg = true;
      return { records, luggCns: lugg };
    }
  } catch { /* 판별 실패는 리스트 파싱 전체를 막지 않는다 — 값이 없으면 기존대로 forecast 경로 사용 */ }
  return { records };
}

// TallyOne 1.4: OBWH CLL에서 수화물 컨번호를 뽑는다. CLL 서명이 안 맞으면 빈 배열(게이트).
//   CLL 서명 = 헤더에 'Cntr. No' + 'Seal No.' + 'Tp/Sz' + 'VGM weight' 가 모두 있는 시트.
export function detectLuggageFromCLL(wb, XLSX) {
  const out = [];
  for (const sn of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false });
    if (!grid || grid.length < 3) continue;
    const hdr = (grid[0] || []).map((h) => String(h || '').trim().toLowerCase().replace(/[.\s]/g, ''));
    const idx = (name) => hdr.indexOf(name);
    const iCn = idx('cntrno'); const iSeal = idx('sealno'); const iTp = idx('tp/sz');
    const iWt = idx('weight'); const iFe = idx('f/e'); const iVgm = idx('vgmweight');
    if (iCn < 0 || iSeal < 0 || iTp < 0 || iVgm < 0) continue;   // ← 게이트: CLL이 아니면 통과
    // 화주 열 = VGM 뒤쪽의 이름 없는 마지막 열. 있으면 1순위, 없으면 2순위로 간다.
    let iShip = -1;
    for (let c = iVgm + 1; c < (grid[0] || []).length; c++) if (!hdr[c]) iShip = c;
    const rows = grid.slice(1).filter((r) => String(r[iCn] || '').trim());
    if (!rows.length) continue;
    const cnOf = (r) => String(r[iCn] || '').trim().toUpperCase().replace(/\s/g, '');
    let hit = [];
    if (iShip >= 0) {
      hit = rows.filter((r) => !String(r[iShip] || '').trim());          // 1순위
    }
    if (!hit.length) {
      hit = rows.filter((r) => !String(r[iWt] || '').trim()               // 2순위
        && !String(r[iVgm] || '').trim()
        && String(r[iFe] || '').trim().toUpperCase() === 'E'
        && /^(DC|GP)?20/i.test(String(r[iTp] || '').trim()));
    }
    // 실물 관례상 항차당 1대다. 2대 이상 잡히면 판별이 흐려진 것이므로 채택하지 않는다(조용한 오염 방지).
    if (hit.length === 1) { const cn = cnOf(hit[0]); if (cn && !out.includes(cn)) out.push(cn); }
  }
  return out;
}

// === X-RAY Parser ===
// M4.1: 정규식 강화 (ISO 6346 표준 - 4번째 글자는 U/J/Z만)
//   이전 버그: [A-Z]{4}\d{6,7}이 너무 느슨해서 봉인번호/일련번호 등도 컨번호로 잘못 인식
//   → 평택 양하 297대가 모두 XRAY로 표시되는 현상
//   수정: 4번째 글자 = U(컨테이너) / J(분리식) / Z(트레일러) 중 하나
//   ISO 6346: [owner 3자][category 1자][serial 6자][check 1자] = 11자 정확
export async function parseXrayList(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const containers = new Set();
  const allMatches = [];  // 디버그: 매칭된 모든 후보
  for (const sheetName of wb.SheetNames) {
    const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);   // V38: !ref 보정
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    for (const row of grid) {
      for (const cell of (row || [])) {
        const text = String(cell || '').replace(/[\s\-]/g, '').toUpperCase();
        // M4.1: ISO 6346 표준 적용 - 4번째 글자는 U/J/Z만 허용
        // 이로써 봉인번호(KRPN0001234 등)와 일련번호 잘못 매칭 차단
        const m = text.match(/\b([A-Z]{3}[UJZ]\d{6,7})\b/);
        if (m) {
          containers.add(m[1]);
          allMatches.push(m[1]);
        }
      }
    }
  }
  // ★ TallyOne 2.26: **6열을 전부 읽는다.** (검수사 시안 «X-RAY 리스트» 대응)
  //   실측 2026-08-24 — 세관 파일 **64개 358행** 전수 확인. 헤더가 64개 한 글자도 안 틀리고 같다.
  //     `컨테이너번호 | 선사SEAL NO | 화물구분 | 규격 | 도착 예정지 | 부착 세관봉인번호`
  //   화물구분은 **4종** — X-RAY 252 · Sea & Air 84 · 반입후검사 14 · 즉시검사 8.
  //   종전엔 컨번호만 뽑아 **파일에 있는 건 전부 X-RAY 대상**이 됐다(섞인 항차가 64 중 15개).
  //   ⚠ 검수사 확정 — *«화물구분은 그대로 두면 됩니다. XRAY조회시+출력시에만 구분 하면 됩니다»*
  //     → `containers` 는 **종전 그대로** 돌려준다(앱 전반의 X-RAY 표시 판정 무변경, 파급 0).
  //       새로 붙는 `rows` 는 X-RAY 조회·출력 화면에서만 쓴다.
  //   ⚠ 확장자는 `.xls` 인데 내용은 xlsx(zip) 다 — SheetJS 는 내용으로 읽으니 문제 없다.
  //     (파이썬 openpyxl 은 *확장자만 보고* 거부한다. 다음 클로드가 헛수고하지 않게 적어 둔다.)
  const rows = [];
  try {
    for (const sheetName of wb.SheetNames) {
      const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);
      const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      let col = null;
      for (let i = 0; i < Math.min(8, grid.length); i++) {
        const r = (grid[i] || []).map((v) => String(v || '').trim());
        const idx = {
          cn:    r.findIndex((c) => /컨테이너\s*번호/.test(c)),
          seal:  r.findIndex((c) => /선사\s*SEAL|SEAL\s*NO/i.test(c)),
          kind:  r.findIndex((c) => /화물\s*구분/.test(c)),
          iso:   r.findIndex((c) => /^규격$/.test(c)),
          dest:  r.findIndex((c) => /도착\s*예정지/.test(c)),
          cSeal: r.findIndex((c) => /부착.*세관봉인|세관봉인번호/.test(c)),
        };
        if (idx.cn >= 0 && idx.kind >= 0) { col = { ...idx, _hdr: i }; break; }
      }
      if (!col) continue;                       // 헤더가 없는 옛 형식 — 위 전수 스캔이 이미 컨번호를 담았다
      for (let i = col._hdr + 1; i < grid.length; i++) {
        const r = grid[i] || [];
        const g = (k) => (col[k] >= 0 && col[k] < r.length ? String(r[col[k]] || '').trim() : '');
        const cn = g('cn').replace(/[\s-]/g, '').toUpperCase();
        if (!/^[A-Z]{3}[UJZ]\d{6,7}$/.test(cn)) continue;   // M4.1 과 같은 ISO 6346 게이트
        rows.push({ cn, seal: g('seal'), kind: g('kind'), iso: g('iso').toUpperCase(),
                    dest: g('dest'), cSeal: g('cSeal') });
      }
    }
  } catch (e) {
    console.warn('[parseXrayList] 6열 읽기 실패 — 컨번호만 씁니다:', e);
  }
  // ★ 2.26 — **헤더를 찾았으면 컨번호도 «컨테이너번호 열»에서만 뽑는다.**
  //   전수 스캔은 시트의 모든 셀을 훑어 ISO 6346 패턴을 찾는다. 그런데 **선사 씰 번호가
  //   그 패턴을 그대로 맞는 경우가 있다** — 실측 STSE 2657E·2661E: `SITZ611581` `SITZ953592` 등
  //   SITC 씰은 네 번째 글자가 **Z** 라 게이트(U/J/Z)를 통과한다.
  //   그래서 **배에 있지도 않은 컨 8대가 X-RAY 대상**으로 잡혀 있었다(64개 중 2항차).
  //   M4.1 주석이 «봉인번호(KRPN0001234)와 일련번호 차단» 이라 적었지만 그 규칙으로는 못 막는다.
  //   ⇒ 헤더가 있으면 열로 뽑고(정확), 없으면 종전 전수 스캔으로 폴백한다(옛 형식 보호).
  //   ✅ 실측 64개 — 62개는 결과 동일, 2개에서 씰 8건이 빠진다(악화 0 · 개선 8).
  const cns = rows.length ? Array.from(new Set(rows.map((r) => r.cn))) : Array.from(containers);
  return {
    containers: cns,
    rows,                            // 2.26: X-RAY 조회·출력 전용. 없으면 빈 배열.
    _matchCount: allMatches.length,  // 진단용: 잘못된 매칭 추적
    _byHeader: rows.length > 0,      // 진단용: 열로 뽑았는가(정확) vs 전수 스캔(폴백)
  };
}

// === POD/POL 색깔 (M3.85 대폭 확장) ===
// 평택항 자주 쓰는 모든 항구 색깔 지정 - 베이플랜에서 셀 색깔로 행선지 즉시 식별
// 지역별 톤 통일 (구분 + 그룹 인지):
//   중국 = 청-남청 계열
//   일본 = 분홍-장미 계열
//   한국 = 노랑-amber 계열
//   대만/홍콩 = 보라-인디고 계열
//   동남아 = 청록 계열
//   미주/유럽 = 슬레이트 계열
export const podColorMap = {
  // 중국 (청-남청 톤) - 평택 주력 항로
  'CNDLC': { bg: 'bg-blue-600', text: 'text-blue-50' },        // 대련
  'CNQDG': { bg: 'bg-blue-500', text: 'text-blue-50' },        // 청도
  'CNTAO': { bg: 'bg-blue-500', text: 'text-blue-50' },        // 청도(별칭)
  'CNWEI': { bg: 'bg-sky-600', text: 'text-sky-50' },          // 위해
  'CNYAT': { bg: 'bg-sky-500', text: 'text-sky-50' },          // 연태
  'CNLYG': { bg: 'bg-cyan-700', text: 'text-cyan-50' },        // 연운항
  'CNXMN': { bg: 'bg-cyan-600', text: 'text-cyan-50' },        // 하문
  'CNTSN': { bg: 'bg-cyan-500', text: 'text-cyan-50' },        // 천진
  'CNSHA': { bg: 'bg-indigo-600', text: 'text-indigo-50' },    // 상해
  'CNNGB': { bg: 'bg-indigo-500', text: 'text-indigo-50' },    // 닝보
  'CNQZH': { bg: 'bg-teal-600', text: 'text-teal-50' },        // 친저우
  'CNCAN': { bg: 'bg-teal-500', text: 'text-teal-50' },        // 광주
  'CNSZN': { bg: 'bg-teal-700', text: 'text-teal-50' },        // 심천
  'CNTAG': { bg: 'bg-blue-700', text: 'text-blue-50' },        // (기존)
  'CNNTG': { bg: 'bg-cyan-800', text: 'text-cyan-50' },        // (기존)
  'CNWEH': { bg: 'bg-sky-700', text: 'text-sky-50' },          // 웨이하이
  // 일본 (분홍-장미 톤)
  'JPHKT': { bg: 'bg-rose-600', text: 'text-rose-50' },        // 하카타
  'JPYOK': { bg: 'bg-pink-600', text: 'text-pink-50' },        // 요코하마
  'JPTYO': { bg: 'bg-rose-500', text: 'text-rose-50' },        // 도쿄
  'JPOSA': { bg: 'bg-pink-500', text: 'text-pink-50' },        // 오사카
  'JPNGO': { bg: 'bg-rose-700', text: 'text-rose-50' },        // 나고야
  'JPUKB': { bg: 'bg-pink-700', text: 'text-pink-50' },        // 고베
  // 한국 (노랑 톤)
  'KRPUS': { bg: 'bg-yellow-600', text: 'text-yellow-50' },    // 부산
  'KRINC': { bg: 'bg-amber-600', text: 'text-amber-50' },      // 인천
  'KRPTK': { bg: 'bg-amber-500', text: 'text-amber-950' },     // 평택 (자기)
  // 대만/홍콩 (보라-인디고)
  'TWKHH': { bg: 'bg-violet-600', text: 'text-violet-50' },    // 카오슝
  'TWTPE': { bg: 'bg-violet-500', text: 'text-violet-50' },    // 타이베이
  'HKHKG': { bg: 'bg-purple-600', text: 'text-purple-50' },    // 홍콩
  // 동남아 (청록)
  'SGSIN': { bg: 'bg-emerald-600', text: 'text-emerald-50' },  // 싱가포르
  'VNSGN': { bg: 'bg-emerald-700', text: 'text-emerald-50' },  // 호치민
  'VNHPH': { bg: 'bg-emerald-500', text: 'text-emerald-50' },  // 하이퐁
  'THBKK': { bg: 'bg-green-600', text: 'text-green-50' },      // 방콕
  'MYPKG': { bg: 'bg-green-700', text: 'text-green-50' },      // 클랑
  // 미주/유럽 (슬레이트)
  'USLAX': { bg: 'bg-slate-600', text: 'text-slate-50' },      // LA
  'USNYC': { bg: 'bg-slate-500', text: 'text-slate-50' },      // 뉴욕
  'USSEA': { bg: 'bg-slate-700', text: 'text-slate-50' },      // 시애틀
  'DEHAM': { bg: 'bg-zinc-600', text: 'text-zinc-50' },        // 함부르크
  'NLRTM': { bg: 'bg-zinc-500', text: 'text-zinc-50' },        // 로테르담
};

// 항구 코드 → 색깔 (3자/5자 모두 매핑)
// 예: 'KRPTK' → 정확 매칭, 'PTK' → 끝 3자 매칭 (LOC+11이 3자만 줄 때)
export function getPortColor(code) {
  if (!code) return null;
  const upper = String(code).toUpperCase().trim();
  if (podColorMap[upper]) return podColorMap[upper];
  // 끝 3자로 재시도 (예: 'PTK' → 'KRPTK')
  if (upper.length === 3) {
    for (const k of Object.keys(podColorMap)) {
      if (k.endsWith(upper)) return podColorMap[k];
    }
  }
  return null;
}

// M3.5.6: 장비 번호 (localStorage)
export function getEquipNumber() {
  try {
    return localStorage.getItem('gm_equip_no') || '';
  } catch (e) { return ''; }
}

export function setEquipNumber(num) {
  try {
    if (num) localStorage.setItem('gm_equip_no', num);
    else localStorage.removeItem('gm_equip_no');
  } catch (e) {}
}

// ─── M5.82: 평택항 부두 판별 + GPS ───────────────────────────────
// 평택항 PORT-MIS의 "계선장소"는 "동부두 N번선석" 형식
// PCTC = 동부두 6, 7, 8, 9번선석
// PNCT = 동부두 13, 14, 15, 16번선석

/**
 * "계선장소" 문자열에서 선석 번호 추출
 * @example extractBerthNo("동부두 7번선석") → 7
 * @example extractBerthNo("동부두 14번선석") → 14
 */
export function extractBerthNo(berthRaw) {
  if (!berthRaw) return null;
  const m = String(berthRaw).match(/(\d+)\s*번선석/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * 계선장소 → 부두 코드 (PCTC / PNCT / null)
 * @example getPierFromBerth("동부두 7번선석") → "PCTC"
 * @example getPierFromBerth("동부두 14번선석") → "PNCT"
 * @example getPierFromBerth("동부두 1번선석") → null (자동차전용 등)
 */
/**
 * M6.18: berth 값이 정상 형식인지 검사 — VoyagePage/HomePage 공통 사용
 * M6.18c: 화이트리스트 → 블랙리스트 방식 완화
 *   기존 정규식이 너무 엄격해서 정상 부두명도 차단되는 문제 발생.
 *   블랙리스트 — 명백한 시설 코드만 차단:
 *     - 영문 대문자 3-5자만 (MBM, BCT, MIPO, MPCT 등 시설 약어)
 *     - 빈 값 / 공백만
 *   그 외 한글/숫자 포함 값은 모두 정상으로 통과 — 정상 부두명 보존
 */
// TallyOne 1.26-01: **타항 부두 차단** — 작업항(평택)이 아닌 부두명은 부두로 인정하지 않는다.
//   사고(2026-08-07 검수사 신고): NSFR 2615N 카드에 「신항 한진인천컨테이너터미널 3선석」이 떴다.
//   경로 — 같은 콜사인의 **인천 기항 PORT-MIS 신고**가 매칭돼 VoyagePage 가 voyage.info.berth 에 저장.
//   항구 필터가 못 잡은 이유: PORT-MIS 엑셀에 '항명' 칸이 없으면 parsePortMisExcel 이 port 를
//   **무조건 '평택'으로 기본 주입**한다(아래 2958행) — 그래서 port 로는 인천을 가려낼 수 없다.
//   → 부두명 자체에 타항 지명이 있으면 거른다. 평택 부두명(동부두·고대부두·서부두·내항 N번선석)에는
//     타 지명이 들어가지 않으므로 정상값을 자르지 않는다.
//   ※ 범용화 시 이 목록은 테넌트 프로필의 homePort 기준으로 바꾼다(작업표준 §범용화).
const _FOREIGN_PORT_RE = /인천|부산|광양|울산|마산|군산|목포|포항|동해|대산|여수|삼천포|INCHEON|BUSAN|PUSAN|GWANGYANG|ULSAN|MASAN/i;
export function isForeignPortBerth(b) {
  return !!b && _FOREIGN_PORT_RE.test(String(b));
}

export function isValidBerth(b) {
  if (!b) return false;
  const s = String(b).trim();
  if (!s) return false;
  // TallyOne 1.26-01: 타항 부두는 형식이 멀쩡해도 이 앱의 부두가 아니다 — 표시·저장 양쪽에서 차단.
  if (_FOREIGN_PORT_RE.test(s)) return false;
  // M6.18c: E7/W6 단축형 우선 통과 (2자라도 정상)
  if (/^[ewEW]\d+$/.test(s)) return true;
  // 영문 대문자 3-5자만 (시설 약어 코드: MBM, BCT, MIPO 등) → 차단
  if (/^[A-Z]{3,5}$/.test(s)) return false;
  // 1-2자 (너무 짧음, 단축형 제외) → 차단
  if (s.length <= 2) return false;
  return true;
}

export function getPierFromBerth(berthRaw) {
  // M6.18: 잘못된 형식이면 즉시 무시 (MBM 등 시설 코드 차단)
  if (!isValidBerth(berthRaw)) return null;
  const n = extractBerthNo(berthRaw);
  if (n == null) return null;
  if (n >= 6 && n <= 9) return 'PCTC';
  if (n >= 13 && n <= 16) return 'PNCT';
  return null;
}

// V8.10: 부두별 양적하 장비(호기) 목록.
//   PCTC = 4대(1~4호기). PNCT = 5대(1~5호기, 여객석이 RORO 작업을 해 1대 더). 부두 미상이면 최대(1~5호기)로 안전하게.
export function equipNumbersForPier(pier) {
  if (pier === 'PCTC') return ['1호기', '2호기', '3호기', '4호기'];
  if (pier === 'PNCT') return ['1호기', '2호기', '3호기', '4호기', '5호기'];
  return ['1호기', '2호기', '3호기', '4호기', '5호기'];
}

// V8.10: 작업 시각 → 주야간 구분.
//   주간 08:00~17:00. 야간 전일 19:00~명일 05:30. 그 사이(05:30~08:00, 17:00~19:00)는 '그외'.
//   ts: ms epoch. 반환 '주간'|'야간'|'그외'.
export function workShiftOf(ts) {
  if (!ts) return '그외';
  const d = new Date(ts);
  const min = d.getHours() * 60 + d.getMinutes();
  if (min >= 8 * 60 && min < 17 * 60) return '주간';        // 08:00~16:59
  if (min >= 19 * 60 || min < 5 * 60 + 30) return '야간';    // 전일 19:00~익일 05:30
  return '그외';
}

// V9.57: tallyDayNight 삭제 — V8.10-2에서 화면 사용처(DayNightBadge)가 제거된 뒤 참조 0 확정
//   (지침서 V8.10 항목 "utils에 남아있으나 미사용 — 다음에 정리 가능" 이행). 주야간 보고는
//   reportShiftToShow/buildShiftReport가 담당. workShiftOf는 보존(경계 규칙 문서 역할).

// V8.10: 지금 시각에 어느 작업보고(주간/야간)를 자동으로 보여줄지 판정.
//   집계 경계(주간 08~17·야간 전일19~05:30)와 별개로, 보고 마감에 +30분 여유를 준다.
//   주간 표시창 08:00~17:30. 야간 표시창 17:30~익06:00. 06:00~08:00은 다음 주간 미리.
//   반환 '주간'|'야간'. (사용자 확정 2026-06-19)
export function reportShiftToShow(ts) {
  const d = new Date(ts || Date.now());
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 8 * 60 && m < 17 * 60 + 30) return '주간';   // 08:00~17:29
  if (m >= 6 * 60 && m < 8 * 60) return '주간';          // 06:00~07:59 → 다음 주간 미리
  return '야간';                                          // 17:30~익06:00
}

// V8.10: 해치 제외 4척 주야간 작업보고 표 빌드.
//   shift='주간'이면 완료 컷 17:00:00, '야간'이면 05:30:00. 완료시각 ≤ 컷(정각 포함) = 완료, 그 1초 뒤부터 잔여.
//   완료(작업량) vs 잔여 총합 중 적은 쪽을 보고 기준으로(세기 편의 — 적은 쪽 카운트가 빠름). 동수면 작업량(<=).
//   잔여 0이면 보고 제외. 규격(20/40/45)×F/E 표 + 풀엠티 토탈.
//   conts: 그 모드 평택분 컨(_comp.at 있으면 완료). 17:00 마감 전엔 현재까지 카운트가 그대로 반영된다.
//   반환 {excluded, reason} 또는 {basis, tbl:{s20,s40,s45 각 {F,E}}, total:{F,E,total}, doneTotal, remainTotal}.
export function buildShiftReport(conts, shift, now) {
  const cutMin = shift === '야간' ? 5 * 60 + 30 : 17 * 60;   // 정각까지 완료 인정
  const isDoneByCut = (ts) => {
    const d = new Date(ts);
    const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    return sec <= cutMin * 60;                                // 17:00:00 포함, 17:00:01 제외
  };
  const blank = () => ({ s20: { F: 0, E: 0 }, s40: { F: 0, E: 0 }, s45: { F: 0, E: 0 } });
  const sizeKey = (c) => { const l = isoToLabel(c.iso || c.type || ''); return /^45/.test(l) ? 's45' : /^40/.test(l) ? 's40' : 's20'; };
  const feKey = (c) => (c.fe === 'E' ? 'E' : 'F');
  const tot = (t) => { const F = t.s20.F + t.s40.F + t.s45.F, E = t.s20.E + t.s40.E + t.s45.E; return { F, E, total: F + E }; };

  const doneTbl = blank(), remainTbl = blank();
  for (const c of (conts || [])) {
    const done = c._comp && c._comp.at && isDoneByCut(c._comp.at);
    (done ? doneTbl : remainTbl)[sizeKey(c)][feKey(c)] += 1;
  }
  const dT = tot(doneTbl), rT = tot(remainTbl);
  if (rT.total === 0) return { excluded: true, reason: '작업 완료 — 보고 제외' };
  const basis = dT.total <= rT.total ? '작업량' : '잔여';
  const tbl = basis === '작업량' ? doneTbl : remainTbl;
  return { excluded: false, basis, tbl, total: tot(tbl), doneTotal: dT.total, remainTotal: rT.total };
}

/**
 * M6.11: 부두 표시 양식 단축 — 동부두 → E, 서부두 → W
 * M6.18c: 시설 코드만 빈 문자열 반환, 그 외 모든 부두명 보존
 */
export function formatBerth(berthRaw) {
  if (!berthRaw) return '';
  const s = String(berthRaw).trim();
  // M6.18c: 시설 코드만 차단, 그 외 모두 표시
  if (!isValidBerth(s)) return '';
  // "동부두 N번선석" or "서부두 N번선석" → E7/W6 단축형
  const m = s.match(/(동|서)부두\s*(\d+)\s*번\s*선석/);
  if (m) {
    const side = m[1] === '동' ? 'E' : 'W';
    return `${side}${m[2]}`;
  }
  // 이미 E7/W6 형식이면 대문자로
  if (/^[ewEW]\d+$/.test(s)) return s.toUpperCase();
  return s;  // 그 외는 원본 그대로 (BCT, "동부두7", "7선석" 등)
}

// V8.09-12: vsl(선박명) 자리에 UN/LOCODE 항만코드가 잘못 들어갔는지 판별.
//   증상: OBWH 항차의 양하 데이터가 목적항 코드(CNYNT=옌타이)로 잘못 저장돼,
//     수석대시보드가 "CNYNT"를 별도 선박으로 그룹핑 → OBWH와 중복 카드 생성.
//   항만코드 = 공백 없는 5자 영문 + 국가 prefix(CN/KR/JP/TW/HK 등) 또는 알려진 항만 목록.
//   선박명은 보통 공백 포함하거나 4자 이하 약자(OBWH/RZOR)라 오검출 없음.
const _KNOWN_PORT_CODES = new Set([
  'CNDLC','CNQDG','CNTAO','CNWEI','CNYAT','CNLYG','CNXMN','CNTSN','CNSHA','CNNGB',
  'CNQZH','CNCAN','CNSZN','CNTAG','CNNTG','CNWEH','CNYNT','CNYTN',
  'JPHKT','JPYOK','JPTYO','JPOSA','JPNGO','JPUKB',
  'KRPUS','KRINC','KRPTK','TWKHH','TWTPE','HKHKG',
]);
const _LOCODE_COUNTRY = /^(CN|KR|JP|TW|HK|VN|TH|SG|MY|PH|ID|RU)/;
export function isPortCode(vsl) {
  const s = String(vsl || '').toUpperCase().trim();
  if (!s || /\s/.test(s)) return false;
  if (/^[A-Z]{5}$/.test(s) && _LOCODE_COUNTRY.test(s)) return true;
  if (_KNOWN_PORT_CODES.has(s)) return true;
  return false;
}

// V8.09-11: PORT-MIS 시각 문자열("2026-06-18 12:00") → epoch ms. 실패 시 null.
export function parsePortMisDateTime(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

// V8.09-11: PORT-MIS 항명이 평택인지 (빈 값/평택/PYEONGTAEK = 평택).
export function isPyeongtaekPortName(port) {
  const s = String(port || '').trim();
  return !s || /평택|PYEONGTAEK/i.test(s);
}

// V8.09-11: 선박 현재 상태 판정 (ETA/ETD vs 현재시각 + 입출 보조).
// V8.09-14 (사용자 보고 2026-06-18): ETD(출항예정)가 지났다고 무조건 '출항함'으로 보면 안 됨.
//   입항 지연 등으로 예정 시각만 지나고 배는 안 온 경우가 있어서, ETD만으로 출항을 단정하면
//   "작업 시작도 안 했는데 출항함"으로 오표시됨. → 출항함은 '작업이 실제로 끝났을 때'만.
//   ETD 지났는데 작업 미완료 = '일정 미확정'(지연 가능성).
//   work: { done, total } (현재 모드 기준 완료수/전체수). 없으면 작업 모름으로 간주.
export function getShipStatus(pm, nowMs = Date.now(), work = null) {
  const port = String(pm?.port || '').trim();
  const isPt = isPyeongtaekPortName(port);
  const portName = isPt ? '평택' : (port || '타항만');
  const eta = parsePortMisDateTime(pm?.eta);
  const etd = parsePortMisDateTime(pm?.etd);
  const inout = String(pm?.ibobprtSe || pm?.voyageInOut || '').trim();
  // 작업 완료 여부: total>0 이고 done>=total 이면 작업 끝남.
  const total = work && Number.isFinite(work.total) ? work.total : 0;
  const done = work && Number.isFinite(work.done) ? work.done : 0;
  const workFinished = total > 0 && done >= total;

  let phase;
  if (eta == null && etd == null) {
    if (/출항/.test(inout)) phase = 'departed';
    else if (/입항/.test(inout)) phase = 'berthed';
    else phase = 'unknown';
  } else if (eta != null && nowMs < eta) {
    phase = 'sailing';
  } else if (etd != null && nowMs >= etd) {
    // 출항예정 지남: 작업이 끝났으면 출항함, 아니면 일정 미확정(지연 등)
    phase = workFinished ? 'departed' : 'unsure';
  } else {
    phase = 'berthed';
  }

  // V8.99: 수집기 v2.17.11-14가 기록한 선석배정 예정 레코드(source='berth_schedule')는 출처를 표기해
  //   PORT-MIS 신고(확정)와 구분한다 — 신고가 올라오면 수집기가 신고 우선으로 자동 대체.
  const fromBerthSched = String(pm?.source || '') === 'berth_schedule';
  let label, tone;
  if (phase === 'sailing') { label = `🚢 ${portName} 항해중 (입항예정${fromBerthSched ? '·선석배정' : ''})`; tone = 'sailing'; }
  else if (phase === 'berthed') { label = `⚓ ${portName} 정박중${fromBerthSched ? ' (선석배정 기준)' : ''}`; tone = 'berthed'; }
  else if (phase === 'departed') { label = `↗ ${portName} 출항함`; tone = 'departed'; }
  else if (phase === 'unsure') { label = `❓ ${portName} 일정 미확정`; tone = 'unsure'; }
  else { label = `${portName}`; tone = 'unknown'; }

  const showBerth = isPt && phase === 'berthed';
  return { phase, isPyeongtaek: isPt, port: portName, label, tone, showBerth };
}

/**
 * 평택항 부두 좌표 (기본값 — 대략 추정)
 * M6.17: 검수원이 현장에서 직접 등록한 좌표(localStorage/Firebase)가 있으면 우선 사용
 * PCTC: 동부두 6~9번선석 (구 컨테이너 터미널)
 * PNCT: 동부두 13~16번선석 (신컨테이너 터미널)
 */
export const PIER_COORDS = {
  PCTC: { lat: 37.005, lng: 126.815, name: '평택 컨테이너터미널' },
  PNCT: { lat: 36.995, lng: 126.823, name: '평택 신컨테이너터미널' },
};

// M6.17: 검수원이 현장 등록한 좌표 우선 — localStorage SK.pierCoords
//   { PCTC: {lat, lng, registeredBy, registeredAt}, PNCT: {...} }
function getActivePierCoords() {
  try {
    const raw = localStorage.getItem('master_pier_coords_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        PCTC: parsed.PCTC || PIER_COORDS.PCTC,
        PNCT: parsed.PNCT || PIER_COORDS.PNCT,
      };
    }
  } catch {}
  return PIER_COORDS;
}

/**
 * 두 좌표 사이 거리 (haversine, 미터)
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GPS 좌표로 현 부두 판별
 * M6.17: maxDistance 2500m → 5000m로 완화 (좌표 오차 마진 + 평택항 부두 범위 고려)
 * @returns { code: 'PCTC'|'PNCT', distance: 미터 } 또는 null
 */
export function detectPierByGps(lat, lng, maxDistance = 5000) {
  const coords = getActivePierCoords();
  let closest = null;
  let minDist = Infinity;
  for (const [code, p] of Object.entries(coords)) {
    const d = haversineMeters(lat, lng, p.lat, p.lng);
    if (d < minDist && d <= maxDistance) {
      minDist = d;
      closest = { code, distance: Math.round(d), name: p.name };
    }
  }
  return closest;
}

/**
 * M6.17: 현재 GPS 위치를 특정 부두 좌표로 저장
 *   localStorage에 즉시 저장 → 본인 폰에 적용
 *   Firebase 동기화는 호출처에서 별도 처리
 */
export function savePierCoord(code, lat, lng, registeredBy = '') {
  try {
    const raw = localStorage.getItem('master_pier_coords_v1');
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[code] = {
      lat: Number(lat),
      lng: Number(lng),
      name: PIER_COORDS[code]?.name || code,
      registeredBy,
      registeredAt: Date.now(),
    };
    localStorage.setItem('master_pier_coords_v1', JSON.stringify(parsed));
    return parsed[code];
  } catch (e) {
    console.error('savePierCoord 실패', e);
    return null;
  }
}

/**
 * M6.17: 저장된 부두 좌표 조회 (UI 표시용)
 */
export function getStoredPierCoords() {
  try {
    const raw = localStorage.getItem('master_pier_coords_v1');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// ─── M5.82: PORT-MIS 엑셀 파서 ───────────────────────────────
// 사용자가 PORT-MIS 사이트에서 엑셀 다운로드 → 검수앱 업로드
// 헤더 행 11 기준 구조 (변형 시 헤더 자동 탐색):
//   0:항명 1:호출부호 2:선명 3:입항횟수 5:구분 6:외내 7:입출 8:총톤수
//   9:입항일시 10:출항일시 11:CIQ수속일자 12:수리일시 13:항해구분 14:MRN
//   15:계선장소부두 16:선석번호 17:계선장소(동부두 N번선석) 18:차항지
//   19:전출항지 20:선박용도 ...
export async function parsePortMisExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ships = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    // 헤더 행 찾기 — "항명" + "호출부호" + "선명" + "계선장소" 키워드
    let headerRow = -1;
    let colMap = {};
    for (let i = 0; i < Math.min(20, grid.length); i++) {
      const row = (grid[i] || []).map(v => String(v || '').trim());
      const idx = {
        port:      row.findIndex(c => /^항명$|^항\s*명$/.test(c)),
        callsign:  row.findIndex(c => /호출부호/.test(c)),
        vessel:    row.findIndex(c => /^선\s*명$|^선명$|^Vessel/i.test(c)),
        eta:       row.findIndex(c => /입항일시|ETA/.test(c)),
        etd:       row.findIndex(c => /출항일시|ETD/.test(c)),
        voyType:   row.findIndex(c => /^구분$/.test(c)),
        inOut:     row.findIndex(c => /외내|외내항/.test(c)),
        ibObPrt:   row.findIndex(c => /^입출$/.test(c)),
        berthRaw:  row.findIndex(c => /계선장소(?![부두번호코드])/.test(c)),  // "동부두 7번선석" (M6.11: "계선장소부두/번호/코드" 제외, "계선장소"/"계선장소(...)" 매칭)
        nextPort:  row.findIndex(c => /차항지/.test(c)),
        usage:     row.findIndex(c => /선박용도/.test(c)),
        //  TallyOne 2.26: MRN(적하목록관리번호). 헤더 실측은 «MRN 번호»(14열, 2026-08-24 download.xlsx).
        //    주석에는 V5.82 때부터 «14:MRN» 이라 적혀 있었는데 **열 지도에 없어 여태 안 읽었다.**
        mrn:       row.findIndex(c => /MRN|화물관리번호/i.test(c)),
      };
      if (idx.callsign >= 0 && idx.vessel >= 0 && idx.berthRaw >= 0) {
        headerRow = i;
        colMap = idx;
        break;
      }
    }

    if (headerRow < 0) continue;

    // M6.12: PORT-MIS의 "계선장소" 헤더 다음 2개 컬럼이 (선석번호) + (실제 명칭)
    //   16: 계선장소 코드 ("MBM") ← 헤더 매칭됨
    //   17: 선석번호 ("07")
    //   18: 계선장소 명칭 ("동부두 7번선석") ← 진짜 원하는 컬럼
    //   첫 데이터 행에서 "동/서/남/북부두" 또는 "N번선석" 패턴 있는 컬럼을 찾아 colMap 보정
    // V8.09-09 (실데이터 download.xlsx 분석, 2026-06-18): 헤더의 "계선장소"가 3개 컬럼
    //   (15=시설코드 MBM, 16=선석번호, 17=부두명)에 걸쳐 있고, 진짜 부두명은 17번이다.
    //   기존엔 ① 첫 데이터 행 하나로만 컬럼을 찾고 ② 정규식이 "동/서/남/북부두"라
    //   "남항 모래부두"·"신항 ...터미널"·"...돌핀" 같은 부두명을 놓쳤다. 첫 행이 "남항 모래부두"면
    //   보정 실패 → berthRaw가 15(MBM)에 머물러 isValidBerth=false → 모든 선박 "부두 정보 없음".
    //   → 부두명 패턴을 넓히고, 헤더 berthRaw~+4 컬럼을 여러 데이터 행(최대 40개) 스캔해
    //     부두명이 가장 많이 나오는 컬럼을 다수결로 선택한다.
    const BERTH_NAME_RE = /[가-힣]+부두|\d+\s*번?\s*선석|\d+\s*선석|[가-힣]+터미널|돌핀|컨테이너|[가-힣]+항\s/;
    {
      const scanRows = [];
      for (let i = headerRow + 1; i < grid.length && scanRows.length < 40; i++) {
        const r = grid[i];
        if (!r) continue;
        if (colMap.callsign >= 0 && !String(r[colMap.callsign] || '').trim()) continue;
        scanRows.push(r);
      }
      const startCol = colMap.berthRaw >= 0 ? colMap.berthRaw : 0;
      let bestCol = colMap.berthRaw, bestHit = -1;
      for (let j = startCol; j <= startCol + 4; j++) {
        let hit = 0;
        for (const r of scanRows) {
          if (BERTH_NAME_RE.test(String(r[j] || '').trim())) hit++;
        }
        if (hit > bestHit) { bestHit = hit; bestCol = j; }
      }
      // 부두명이 한 건이라도 잡히는 컬럼이 있으면 그쪽으로 보정 (없으면 헤더 위치 유지)
      if (bestHit > 0 && bestCol >= 0) {
        colMap.berthRaw = bestCol;
      }
    }

    // 데이터 행
    for (let i = headerRow + 1; i < grid.length; i++) {
      const row = grid[i] || [];
      const callsign = String(row[colMap.callsign] || '').trim();
      const vesselName = String(row[colMap.vessel] || '').trim();
      if (!callsign && !vesselName) continue;

      const berthRaw = colMap.berthRaw >= 0 ? String(row[colMap.berthRaw] || '').trim() : '';
      const pier = getPierFromBerth(berthRaw);     // PCTC | PNCT | null
      const berthNo = extractBerthNo(berthRaw);    // 7, 14, etc.

      ships.push({
        callsign: callsign.toUpperCase(),
        vesselName: vesselName,
        port: colMap.port >= 0 ? String(row[colMap.port] || '').trim() : '평택',
        eta: colMap.eta >= 0 ? String(row[colMap.eta] || '').trim() : '',
        etd: colMap.etd >= 0 ? String(row[colMap.etd] || '').trim() : '',
        voyageType: colMap.voyType >= 0 ? String(row[colMap.voyType] || '').trim() : '',
        voyageInOut: colMap.inOut >= 0 ? String(row[colMap.inOut] || '').trim() : '',
        ibobprtSe: colMap.ibObPrt >= 0 ? String(row[colMap.ibObPrt] || '').trim() : '',
        // M5.82: 부두 정보
        berth: berthRaw,                  // 원본 "동부두 7번선석"
        berthNo: berthNo,                 // 7
        pier: pier,                       // PCTC | PNCT | null
        nextPort: colMap.nextPort >= 0 ? String(row[colMap.nextPort] || '').trim() : '',
        vesselType: colMap.usage >= 0 ? String(row[colMap.usage] || '').trim() : '',
        //  2.26: MRN — 끝 글자가 I=입항 · E=출항(실측 9척 예외 없음). 양하 서류는 I, 선적 서류는 E.
        mrn: colMap.mrn >= 0 ? String(row[colMap.mrn] || '').trim().toUpperCase() : '',
      });
    }
  }
  return ships;
}

// ─── M6.92.0: 공통 컨테이너 색 키 함수 ──────────────────────────────
// 양하: 선사(c.op)별, 선적: POD 3자별. 베이플랜/카고플랜/베이상세 통일.
// M6.94.29: 인접 색 대비 극대화 (비슷한 색이 나란히 안 오게 색상환 분산).
//   기존 주황/주황2, 파랑/하늘/청록 중복 → 구분 잘 되는 12색으로 재구성. 모두 흰 글자 가독.
export const COLOR_PALETTE = [
  '#2563eb', // 파랑
  '#dc2626', // 빨강
  '#16a34a', // 초록
  '#ea580c', // 주황
  '#9333ea', // 보라
  '#0d9488', // 청록(teal)
  '#db2777', // 핑크/마젠타
  '#ca8a04', // 황토(겨자)
  '#4f46e5', // 인디고
  '#65a30d', // 올리브
  '#0891b2', // 시안
  '#be123c', // 진홍
];

// M6.94.30: 평택분 판정을 matchPodC(PrintableCargoPlanV2)와 단일 원칙으로 통일.
//   "리스트 등록(_inList) = 무조건 평택" + EDI POL/POD가 평택 코드(변형 포함)면 평택.
//   원인: 엠티 선적 리스트는 항구 컬럼이 목적지(CNDLC 등)라 pol이 비거나 오염됨.
//   기존 getContainerColorKey는 pol.includes('PTK')만 봐서 엠티 285대에 색이 안 칠해져
//   카고플랜 본체/별첨에서 통째로 누락됐다 (matchPodC만 _inList를 인정하던 비대칭 버그).
// ─── V7.27: 선사 약자 정규화 (양하 카고플랜 컬러키 = 검수리스트/작업리포트와 동일 3자) ──
//   inspectionList.normalizeCarrier / workingReport.normalizeOp와 동일한 변환표.
//   op가 4·5자(EDI 원본 DJSC/SNKO 등)로 들어와도 3자 voucher 약자로 통일.
//   ⚠️ 단순 slice(0,3) 금지: SNKO→SNK(X), 정답 SKR. 반드시 변환표 경유.
const CARRIER_MAP_COLOR = {
  'DJSC': 'DJS', 'NSSL': 'NSL', 'HASL': 'HAS', 'SNKO': 'SKR',
  'HSLI': 'HSL', 'JEON': 'HSL',
  'DWIC': 'DWS', 'EASK': 'EAS', 'TJMS': 'TJM', 'WDFC': 'WDF', 'SCLK': 'SIT',
};
export function normalizeCarrierCode(op) {
  if (!op) return null;
  const t = String(op).toUpperCase().trim();
  if (!t) return null;
  if (CARRIER_MAP_COLOR[t]) return CARRIER_MAP_COLOR[t];
  return t.slice(0, 3);
}

export function getContainerColorKey(c, mode) {
  // 평택분 여부. M6.94.34: _inList(리스트=평택)는 선적 모드에서만 적용.
  //   양하 모드에서 _inList를 인정하면 타항 양하분(예: pod=PHDVO)이 평택으로 잘못 잡힘.
  //   양하 평택분은 반드시 pod가 평택이어야 함.
  const isPtkC = mode === 'discharge'
    ? isPyeongtaekPort(c.pod)
    : (c._inList || isPyeongtaekPort(c.pol));
  if (!isPtkC) return null;
  if (mode === 'discharge') {
    // 양하: 선사코드로 컬러 (V7.27: 변환표 경유 3자 통일 — DJSC→DJS, SNKO→SKR)
    return normalizeCarrierCode(c.op);
  } else {
    // 선적: POD 3자로 컬러. 엠티는 pol이 목적지로 오염될 수 있으나
    //   여기선 이미 평택분 확정 → pod에서 직접 3자 추출 (별첨 로직과 동일).
    const p = String(c.pod || '').toUpperCase();
    const p3 = p.length >= 5 ? p.slice(2, 5) : p.slice(0, 3);
    return (p3 && p3 !== 'PTK') ? p3 : null;
  }
}

export function buildContainerColorMap(containers, mode) {
  const keys = new Set();
  for (const c of containers) {
    const k = getContainerColorKey(c, mode);
    if (k) keys.add(k);
  }
  const map = {};
  // V8.25-06: 색 중복 금지 — 기존 12색은 그대로, 13번째부터는 안 겹치는 고유색을
  //   황금각(137.5°) 균등 분포로 생성(흰 배경에서 읽히게 명도 낮춤). i%순환 제거.
  Array.from(keys).sort().forEach((k, i) => {
    if (i < COLOR_PALETTE.length) {
      map[k] = COLOR_PALETTE[i];
    } else {
      const hue = Math.round((i - COLOR_PALETTE.length) * 137.508) % 360;
      map[k] = `hsl(${hue}, 72%, 34%)`;
    }
  });
  return map;
}

// ─── M6.94.29: 평택항 POL/POD 판정 (단일 출처) ──────────────────────────
//   평택 코드 변형: KRPTK(평택), KRPYT(평택신항), KRPYOTM(평택 양교터미널),
//   PTK 약어 등. 기존엔 /(PTK|PYT)$/ 만 봐서 KRPYOTM이 누락됐다
//   (선적 리스트가 KRPYOTM 표기 → 평택분이 표시 안 되던 버그).
//   새 평택 코드가 나오면 이 배열에만 추가하면 전 화면 일괄 반영.
const PYEONGTAEK_CODES = ['PTK', 'KRPTK', 'KRPYT', 'PYT', 'KRPYOTM', 'PYOTM', 'KRPYO'];
// TallyOne 1.11: 실 리스트에 들어 있는 평택 표기 전수 조사(2026-08-06, RTDB voyages 17항차 records).
//   실측 변형과 종전 판정 결과:
//     KRPTK 1401건 ✓ / PTK 61건 ✓ / PTK02 407건 ✗ / PYEONGTAEK 71건 ✗ /
//     PYONGTAEK 25건 ✗ / PYEONGTAEK,KOREA 5건 ✗ / PYONGTAEK,KOREA 3건 ✗
//   → 511건이 평택인데 평택이 아닌 것으로 판정되고 있었다. 부두번호 접미(PTK02 = 평택 2부두)와
//   철자 그대로 쓰는 리스트(PYONGTAEK/PYEONGTAEK, 뒤에 국가명이 붙기도 한다)를 흡수한다.
const RE_PTK_SPELL = /^(KR)?P(Y|YE)ONGTAEK$/;              // PYONGTAEK · PYEONGTAEK · KRPYEONGTAEK
export function isPyeongtaekPort(code) {
  if (!code) return false;
  let t = String(code).toUpperCase().trim();
  if (!t) return false;
  // 'PYONGTAEK,KOREA' · 'PYEONGTAEK(KR)' 처럼 뒤에 국가·부연이 붙어 오는 리스트가 있다 — 앞토막만 본다.
  t = t.split(/[,/(]/)[0].replace(/[\s.]/g, '').trim();
  if (!t) return false;
  if (PYEONGTAEK_CODES.includes(t)) return true;
  if (RE_PTK_SPELL.test(t)) return true;
  // 접미 매칭: ...PTK, ...PYT, ...PYOTM, ...PYO. 뒤에 부두번호 두 자리까지 허용(PTK02·KRPTK1).
  return /(PTK|PYT|PYOTM|PYO)\d{0,2}$/.test(t);
}

// ─── V9.57: 공용 헬퍼 신설 (감사 F6) — 흩어진 지역 규칙의 단일 소스 ──────────
//   호출부 교체는 각 파일 담당 팀이 진행 — 여기서는 export 준비 + utils/팀F 파일 내부 교체만.

// 항차 핵심 번호 — VoyagePage 지역 클로저(_voyCore, 1882행)와 동일 규칙:
//   공백·구분자 제거 → 접미 방향(E/W/N/S) 제거 → 선행 0 제거. 전부 지워지면 정규화 원문 유지.
export function voyCore(x) {
  const n = String(x || '').toUpperCase().replace(/[\s\-_.]/g, '');
  return n.replace(/[EWNS]+$/, '').replace(/^0+/, '') || n;
}

// 항차 동일성 비교 (번호 기준 — 0529W == 529E)
export function voyEq(a, b) {
  return voyCore(a) === voyCore(b);
}

// 평택분 판정 단일 소스 — 양하=POD 평택, 선적=리스트 등록(_inList) 또는 POL 평택.
export function isPtk(c, mode) {
  if (!c) return false;
  return mode === 'discharge' ? isPyeongtaekPort(c.pod) : !!(c._inList || isPyeongtaekPort(c.pol));
}

/**
 * TallyOne 1.11: 리스트 레코드가 **반대 방향**으로 확정되는가 (합산 오류 차단 단일 소스).
 *
 * 왜 필요한가 — 항차번호가 방향까지 같은 배(N_N 타입: 양하 2606N · 선적 2606N)는 수집기가
 *   메일함 폴더를 하나로 만들어서 양하 리스트와 선적 리스트가 한 폴더에 섞인다. 그 폴더를
 *   통째로 등록하면 두 리스트가 한 mode 로 합산됐다.
 *   실측(SWSP 2606N, 2026-08-06): 양하 카드가 `평택 778` — 양하 371 + 선적 407 이었다.
 *
 * 판정 근거는 레코드 자신의 POL/POD 다. 실데이터에서 두 리스트는 깨끗이 갈린다:
 *   양하 371건 → pod=KRPTK, pol=VNSGN/THBKK/THLCH
 *   선적 407건 → pol=PTK02, pod=KRKAN/CNNKG/…
 *
 * **확정된 것만 뺀다.** POL/POD 가 없거나(구형 리스트) 둘 다 평택이면(환적) 근거가 없으므로
 *   유지한다 — 근거 없이 버리면 리스트가 통째로 사라진다(정보 손실 금지).
 */
export function isOppositeDirRecord(r, mode) {
  if (!r || (mode !== 'discharge' && mode !== 'loading')) return false;
  const podPtk = isPyeongtaekPort(r.pod);
  const polPtk = isPyeongtaekPort(r.pol);
  if (podPtk === polPtk) return false;            // 근거 없음(둘 다 아님 / 둘 다 평택) → 유지
  return mode === 'discharge' ? polPtk : podPtk;  // 양하인데 POL만 평택 = 선적분, 반대도 같다
}

/** 반대 방향 레코드를 걸러낸 컨번호 목록 — 카운트 모수·컨테이너 병합이 함께 쓴다. */
export function ownDirCns(records, mode) {
  return Object.keys(records || {}).filter(cn => !isOppositeDirRecord(records[cn], mode));
}

/**
 * TallyOne 1.11-01: 이 베이사전이 **검수사가 직접 만든 정본인가** — 단일 소스.
 *
 * 왜 필요한가 — 조회 결과의 `source`는 *어느 경로로 찾았나*(user=로컬 / firebase / v2 …)이지
 *   *누가 만들었나*가 아니다. 그런데 여러 곳이 `source === 'user'` 로 "정본인가"를 판정했다.
 *   그래서 **같은 매트릭스인데 브라우저마다 다른 그림**이 나왔다(NSFR 2026-08-06 실측):
 *     엣지 — localStorage 사본 있음 → source='user' → 정본 대접 → 검수사 매트릭스 그대로
 *     크롬 — 사본 없어 Firebase 경유 → source='firebase' → **자동 사전 취급** →
 *            v2(STOWAGE PDF 자동본 17베이) union + v5 유령 베이 혼입 + EDI 자동 보강
 *   Firebase 항목 자체는 `source:'user'`·`_userOwned:true` 정본인데도 그랬다.
 *   판정은 항상 **항목 안쪽**을 봐야 한다. 겉껍데기(조회 경로)를 보면 안 된다.
 *
 * @param d 조회 결과(dictData) 또는 entry 또는 bayDef — 어느 것을 줘도 된다.
 */
export function isUserOwnedBayDict(d) {
  if (!d) return false;
  const bd = d.bayDef || d;
  return d.source === 'user' || d._userOwned === true ||
         bd?.source === 'user' || bd?._userOwned === true;
}

// 컨번호 형식 검사 단일 소스 (ISO 6346: 알파벳 4 + 숫자 7)
// ══════════════════════════════════════════════════════
// TallyOne 2.25: **초과 치수는 앱이 판정한다** (검수사 정의 확정 2026-08-23)
//
//   > *"초과치수는 폭 길이 높이 셋중에 하나라도 FR범위를 벗어나면 초과치수인데
//   >   사진을 보더라도 높이에서 걸리는데 왜 초과치수 없음인지?"*
//   > *"FR의 기본 폭 길이 높이 — **스프레더로 찍을때** 와 **선적시 옆에 컨테이너를 실을때
//   >   걸리거나** 하면 초과입니다."*
//
//   ⚠ 종전엔 판정이 **아예 없었다.** `ovh/ovw/ovl` 은 선사가 EDI DIM(코드 5·6 길이 / 7·8 폭 /
//     9·13 높이)에 «적어 보낸» 초과분일 뿐이고, 그것이 없으면 실치수를 갖고 있으면서도
//     «초과 치수 기재 없음» 이라고만 했다. 실측 OBWH 2721E — CICU0002041 이 3,600×3,800mm 인데
//     선사가 DIM 을 안 적었다는 이유로 «기재 없음».
//
//   판정은 검수사 문장 그대로다. 걸리는 것이 무엇인가로 나눈다.
//     높이 — 화물 꼭대기가 컨 상단보다 높으면 **스프레더가 걸린다**.
//            FR 은 화물이 데크 «위»에 실리므로 데크 높이를 더해서 잰다.
//     폭   — 컨 폭을 넘으면 **옆 슬롯 컨테이너에 걸린다**.
//     길이 — 컨 길이를 넘으면 **앞뒤 컨테이너에 걸린다**.
//   ⚠ 데크 높이는 형식마다 다르다. 아래 값은 일반 FR 기준이며 **화면에 계산식을 같이 보여준다**
//     — 현장 숫자가 다르면 검수사가 보고 바로 잡을 수 있어야 한다(조용히 단정 금지).
// ══════════════════════════════════════════════════════
export const BOX_W_MM = 2438;                                  // 컨테이너 외곽 폭 (8ft)
export const BOX_H_MM = 2591;                                  // 컨테이너 외곽 높이 (8'6")
export const BOX_L_MM = { 20: 6058, 40: 12192, 45: 13716 };
export const FR_DECK_MM = { 20: 370, 40: 648, 45: 648 };       // FR 데크(적재면) 높이

/** ISO 첫 자리 → 피트. 모르면 40(가장 흔한 FR). */
export function isoFeet(iso) {
  const c = String(iso || '').toUpperCase()[0] || '';
  if (c === '2') return 20;
  if (c === '4') return 40;
  if (c === 'L' || c === 'M' || c === 'N' || c === '9') return 45;
  return 40;
}

/** 화물 실치수가 컨테이너 밖으로 나가는가 — { over, parts[], calc[] }. 실치수가 없으면 null. */
export function overDims(c) {
  if (!c) return null;
  const L = Number(c.cgL) || 0, W = Number(c.cgW) || 0, H = Number(c.cgH) || 0;
  if (!L && !W && !H) return null;
  const ft = isoFeet(c.iso);
  const deck = (c.fr || String(c.iso || '').toUpperCase().includes('P')) ? (FR_DECK_MM[ft] || 0) : 0;
  const limL = BOX_L_MM[ft] || BOX_L_MM[40];
  const parts = [], short = [], calc = [];
  const cm = (mm) => Math.round(mm / 10);
  if (H) {
    const top = H + deck;                     // FR 은 화물이 데크 «위» 에 실린다
    if (top > BOX_H_MM) {
      const d = top - BOX_H_MM;
      parts.push(`높이 +${d}mm(스프레더)`); short.push(`H+${cm(d)}`);
      calc.push(`높이 ${H}${deck ? ` + 데크 ${deck}` : ''} = ${top} > ${BOX_H_MM}`);
    }
  }
  if (W > BOX_W_MM) {
    const d = W - BOX_W_MM;
    parts.push(`폭 +${d}mm(옆 컨)`); short.push(`W+${cm(d)}`);
    calc.push(`폭 ${W} > ${BOX_W_MM}`);
  }
  if (L > limL) {
    const d = L - limL;
    parts.push(`길이 +${d}mm(앞뒤 컨)`); short.push(`L+${cm(d)}`);
    calc.push(`길이 ${L} > ${limL}`);
  }
  //  short 는 cm — 선사 신고분(ovh/ovw/ovl)이 cm 라 인쇄물에서 단위가 섞이지 않게 맞춘다.
  return { over: parts.length > 0, parts, short, calc, ft, deck };
}

/** 양하 계획 순서로 줄 세운다 — **베이별순 + 우선양하순** (검수사 확정 2026-08-24).
 *
 *  > *«앱의 양하시 자동과 수동이 있습니다. 거기서 **자동가이드가 양하하는 순서**를 따릅니다. 베이별로»*
 *  > *«10번 베이에 10개가 있는데 그 순서는 **데크 젤 높은곳이 먼저**이고 **홀드 젤 낮은곳이 젤 나중**»*
 *
 *  위에서부터 내리는 순서 그대로다 — 베이를 훑으며 데크를 위에서 아래로 걷어내고, 그다음 홀드를 위에서 아래로.
 *  ⚠ `guidedQueue.buildGuidedQueue` 와 목적이 다르다 — 그쪽은 «지금 집을 한 대»를 고르느라
 *    트윈·갈림·접안방향까지 본다. 이쪽은 **종이에 줄 세우는 순서**다. 둘을 섞지 않는다.
 *  실측 OBWH 2721E 263대 — 베이2 데크 84→82 → 홀드 08→06 순으로 나온다. */
export function sortByDischargePlan(list) {
  const n = (v) => { const x = parseInt(v, 10); return Number.isFinite(x) ? x : 0; };
  return [...(list || [])].sort((a, b) => {
    const ab = n(a.bay), bb = n(b.bay);
    if (ab !== bb) return ab - bb;                       // 베이 오름차순
    const at = n(a.tier), bt = n(b.tier);
    const ad = at >= 80 ? 0 : 1, bd = bt >= 80 ? 0 : 1;  // 데크(0) 먼저, 홀드(1) 나중
    if (ad !== bd) return ad - bd;
    if (at !== bt) return bt - at;                       // 같은 구역이면 **높은 단부터**
    return String(a.row || '').localeCompare(String(b.row || ''));
  });
}

export function isValidCn(cn) {
  return /^[A-Z]{4}\d{7}$/i.test(String(cn || '').trim());
}

// 오픈탑/OOG 통합 판정 — 필드 유래가 갈린다: 리스트 파서는 ot, EDI 파서는 oog(459 계열·U/O 타입).
//   oog는 오픈탑 외 순수 OOG(규격초과)도 포함하므로 이름을 isOogOrOt로 명확히 한다
//   (기존 소비처 20곳의 의미가 전부 '오픈탑/OOG 표시'라 통합 판정과 일치 — 감사 F6 확인).
//   필드가 없어도 ISO(459x·..U/..O → 라벨 OT)로 보강 판정.
export function isOogOrOt(c) {
  if (!c) return false;
  if (c.ot || c.oog) return true;
  const iso = String(c.iso || '').toUpperCase();
  if (/^[24]59/.test(iso)) return true;
  return (isoToLabel(iso) || '').endsWith('OT');
}

// ------------------------------------------------------------
// 실(봉인)번호 중복 — **두 컨에 한 실**. 판정은 여기 한 벌만 둔다.
//   ⚠ sl_conflict(한 컨에 두 실 — 리스트끼리 다름)와 축이 다르다. 섞지 마라.
//
//   검수사 신고 2026-08-16 (MAMP 631N) — *"실번호 중복이 있었는데 알림없음 0570668"*.
//   실측: PH0570668 이 MNBU3256200 과 MNBU4383895 두 대에 함께 들어간 채 **둘 다 검수 완료**됐다.
//   판정기는 있었다 — nlSearch.auditSeals(챗봇 답변용) · GuidedWorkPanel.dupSealOwner(손입력 차단용).
//   그런데 **검수사가 손으로 실을 치거나 말로 물을 때만** 돌아서, 리스트가 실어 온 중복은
//   화면에 한 번도 뜨지 않았다. 기능이 없던 게 아니라 **발동할 자리가 없었다.**
//   → 목록 카드·가이드 카드가 뜰 때마다 이 맵을 본다(1.76-05).
export function normSeal(s) {
  return String(s == null ? '' : s).toUpperCase().replace(/[\s\-]/g, '');
}

/** 같은 실번호를 달고 있는 컨이 둘 이상인 것만. Map(정규화 실번호 → [컨번호…]).
 *  풀씰(sl)·엠티실(eseal) 둘 다 본다. '0000'(실 부족 표기)은 중복 허용이라 제외. */
export function dupSealMap(containers) {
  const bySeal = new Map();
  for (const c of containers || []) {
    if (!c || !c.cn) continue;
    for (const f of ['sl', 'eseal']) {
      const n = normSeal(c[f]);
      if (!n || n === '0000') continue;
      // 2.08-01 (검수사 실측 OBWH 2719E 선적 — 엠티실 250대가 전부 'W': 발신자가 «실번호 미정»을
      //   공백 대신 같은 문자로 채워 중복 실오류 250건 오탐. «앱이 똑똑했다면 공백 처리했을 문제»):
      //   1~2자 초단문 값은 실번호가 아니다 — 미정 표기로 보고 건너뛴다.
      if (n.length <= 2) continue;
      let g = bySeal.get(n);
      if (!g) { g = new Set(); bySeal.set(n, g); }
      g.add(c.cn);
    }
  }
  const out = new Map();
  // 2.08-01: 물리적으로 실 하나는 한 컨에만 달린다 — 같은 값이 **3컨 이상**이면 실번호가 아니라
  //   플레이스홀더(NIL·미정 표기 등)다. 진짜 «두 컨에 한 실» 실수(MAMP 631N PH0570668)는 2컨 — 그대로 잡힌다.
  for (const [n, cns] of bySeal) if (cns.size === 2) out.set(n, [...cns]);
  return out;
}

/** 이 컨의 실번호를 같이 쓰는 다른 컨들. 없으면 []. */
export function dupSealPartners(c, dupMap) {
  if (!c || !dupMap || !dupMap.size) return [];
  const out = [];
  for (const f of ['sl', 'eseal']) {
    const n = normSeal(c[f]);
    if (!n) continue;
    const g = dupMap.get(n);
    if (g) for (const cn of g) if (cn !== c.cn && !out.includes(cn)) out.push(cn);
  }
  return out;
}

// ============================================================
// 시프팅(재적부, restow) — ★ 정의는 아래 한 줄이 전부다. 코드보다 이 문장이 먼저다.
//
//   ★ 검수사 확정 원문 (2026-08-15):
//     "시프팅은 양하대상을 양하할때 걸리는 화물을 옮기는것을 시프팅이라고 합니다.
//      또한 **선적대상 자리에 있어도 시프팅 대상**입니다."
//
//   → 판정 기준은 **«평택 작업에 방해가 되는가» 하나뿐이다.**
//     «통과화물이냐»가 아니다. 통과화물 여부는 대상을 좁히는 1차 체(아래)일 뿐,
//     정의가 아니다. 좌표가 달라진 통과화물이라도 평택 양하·선적 어디에도
//     안 걸리면 **시프팅이 아니다**(서류 차이) — 1.76-02 의 마지막 필터가 그것을 건다.
//
//   ⛔ 다음 세션 클로드에게 — 이 주석 머리말이 종전에 «통과화물의 위치 변경»이라고
//     적혀 있었다. 그 탓에 2026-08-16 클로드가 코드를 읽고 정의를 그렇게 되풀이해
//     **전날 확정한 정의가 하루 만에 뒤집혔다**(검수사: "어제 그렇게 알려줬건만").
//     정의를 코드 주석에서 역추론하지 마라. 정본은 ★앱_통합지침서.md §5-1B 다.
//
// ── 구현 메모 ──────────────────────────────────────────────
//   방식: 양하 EDI(도착 BAPLIE) vs 선적 EDI(최종 BAPLIE) 자리 대조 {from→to}.
//     근거 실측(MAMP 628S, 2026-07-14): MOVINS HAN+RES 13 == 위치 비교 13 (100% 일치).
//     MOVINS가 안 오는 선박도 커버되므로 위치 비교를 채택(MOVINS 파싱은 보강 후보).
//   1차 체(오검출 방지):
//     - 컨번호 11자(실번호)만. __SLOT_/__BOOK_ 등 임시 키 제외.
//     - 양쪽 모두 bay/row/tier가 온전한 것만.
//     - 통과화물만: 양하측 POD·선적측 POL 둘 다 평택이 아님이 명시된 것.
//       (평택 양하분·선적분은 자리가 달라도 여기서 볼 대상이 아님 — 야드 경유 재선적 등)
//   2차 체: 동형 공컨 순열 제외(V9.04-05) → 3차 체: **방해 판정**(1.76-02, 위 정의).
//
//   ⚠ 아직 없는 게이트 — 양하 EDI 가 «직전 기항지 출항본»인지 안 본다(§5-1A).
//     두 항 전 출항본이면 그 사이 항에서 일어난 이동이 from→to 차이로 남아
//     평택과 무관한 시프팅이 잡힌다(KSKM 2615N 허수 4). 선적측 게이트
//     loadEdiIsDeparture 의 대칭짝이 비어 있다 — 인계함 참조.
// ============================================================
// TallyOne 1.69-10: 선적 EDI 가 **평택 출항본**인가 — 평택 POL 컨이 하나라도 있어야 한다.
//   하나도 없으면 그건 «평택에 도착했을 때» 적부도지 «평택에서 싣고 나간» 적부도가 아니다(선적 EDI 미도착).
//   판정은 여기 한 벌만 둔다 — computeShiftingMap 과 화면 안내가 같은 함수를 쓴다.
export function loadEdiIsDeparture(loadEdiMap) {
  if (!loadEdiMap) return false;
  return Object.values(loadEdiMap).some((c) => c && c.pol && isPyeongtaekPort(c.pol));
}

export function computeShiftingMap(dischEdiMap, loadEdiMap) {
  const out = {};
  if (!dischEdiMap || !loadEdiMap) return out;
  // TallyOne 1.69-10 (검수사 확정 2026-08-15, SWBT 2614S): 선적 EDI 가 아직 안 왔는데
  //   도착 적부도를 선적본으로 쓰면, 배에 실려 온 **남의 항 화물이 통째로 「통과화물 시프팅」**이 된다.
  //   실측 — SWBT 2614S 는 광양·부산에서 평택 화물을 실어 와 예정에 없던 양하 40대가 생긴 배다.
  //   선적 대표가 `BAPLIE_SMDG15_2614S_KRPTK`(LOC+5+KRPTK 인데 컨 POL 전부 KRPUS → 평택 선적분 0)라
  //   부산발 27대가 허수 시프팅으로 잡혔고 **배정표 이적 0 과 어긋난 것이 신호였다.**
  //   → 평택 출항본이 아니면 확정 대조를 하지 않는다. 사유는 _meta 로 넘겨 화면이 «자료 대기»를 말하게 한다.
  //   (_meta 는 non-enumerable 이라 Object.keys 카운트에 안 잡힌다 — 예측 경로와 같은 방식.)
  if (!loadEdiIsDeparture(loadEdiMap)) {
    Object.defineProperty(out, '_meta', { value: { reason: 'loadEdiPending' } });
    return out;
  }
  const posOf = (c) => {
    if (!c) return '';
    const b = normalizeBay(c.bay || '');
    const r = String(c.row || '').padStart(2, '0');
    const t = String(c.tier || '').padStart(2, '0');
    if (!b || !c.row || !c.tier) return '';
    return `${String(b).padStart(3, '0')}${r}${t}`;
  };
  for (const [cn, d] of Object.entries(dischEdiMap)) {
    if (!cn || cn.length !== 11 || cn.startsWith('__')) continue;
    const l = loadEdiMap[cn];
    if (!l) continue;
    // 통과화물 판정: 양하측 POD·선적측 POL 둘 다 평택이 아님이 명시된 경우만
    if (!d.pod || isPyeongtaekPort(d.pod)) continue;
    if (!l.pol || isPyeongtaekPort(l.pol)) continue;
    const from = posOf(d);
    const to = posOf(l);
    if (!from || !to) continue;
    if (from !== to) out[cn] = { from, to, _iso: d.iso || l.iso || '', _fe: (d.fe === 'E' && l.fe === 'E') ? 'E' : 'F' };
  }
  // V9.04-05: 서류상 자리바꿈(동형 공컨 순열) 제외 — XTPG 532 사건(사용자 확정 2026-07-20).
  //   실측: 쉬프팅 26 중 20이 같은 규격 공컨끼리 자리만 맞바꾼 것(맞교환 7쌍 14 + 3자 순환 2조 6).
  //   플래너가 서류에서 공컨 번호를 재배정한 것뿐, 동일 규격 빈 컨이라 크레인이 옮길 이유가 없고
  //   EDI에 이동 마커도 전무. 터미널 배정표 12 = 실이적 6대 × 2모브(양하+재선적)와 일치.
  //   규칙: 공컨(양쪽 모두 E)을 (ISO) 그룹으로 묶어, from이 그룹의 to 집합에 있고 to가 그룹의
  //   from 집합에 있는 컨(=순열 구성원)만 제외. 새 슬롯으로 간 공컨(진짜 이적)은 유지.
  //   풀 컨은 건드리지 않는다(실이적 6대 전부 풀 — 이 필터의 영향 없음).
  const groups = {};
  for (const [cn, v] of Object.entries(out)) {
    if (v._fe !== 'E') continue;
    const k = String(v._iso || '?').toUpperCase();
    (groups[k] = groups[k] || []).push(cn);
  }
  for (const k in groups) {
    const cns = groups[k];
    if (cns.length < 2) continue;
    const froms = new Set(cns.map((c) => out[c].from));
    const tos = new Set(cns.map((c) => out[c].to));
    for (const cn of cns) {
      if (tos.has(out[cn].from) && froms.has(out[cn].to)) delete out[cn];   // 순열 구성원 — 서류상 교환
    }
  }
  // TallyOne 1.76-02 (검수사 정의 확정 2026-08-15): **시프팅 = 평택 작업에 방해가 되는 컨의 이동만.**
  //   «시프팅은 양하대상을 양하할때 걸리는 화물을 옮기는것 + 선적대상 자리에 있어도 대상» (원문).
  //   좌표만 다르고 아무 평택 작업에도 안 걸리는 통과화물은 서류 차이다 — SWBT 2614S 실측:
  //   확정 대조 10대 전부(베이 25·27 홀드 04↔06 맞교환 8 + 18→38 이동 2)가 평택 양하·선적 없는
  //   스택이었고 배정표 이적 0. 38번 평택 엠티 10대는 저희끼리만 쌓여 위에 걸린 것이 없었다.
  //   from 자리가 ①같은 스택 아래 평택 양하 ②같은 스택 그 단 이하 평택 선적 ③데크 컨이고
  //   그 베이(짝수 40ft면 e±1 포함) 홀드에 평택 양하/선적 — 셋 중 하나일 때만 시프팅으로 남긴다.
  //   진짜 들어올리는 맞교환(아래에 평택 작업)은 ①②로 살아남는다. 커버 판정은 베이 단위 근사(보수적 유지).
  {
    const _n = (x) => parseInt(x, 10);
    const ptkD = [], ptkL = [];
    for (const d2 of Object.values(dischEdiMap)) { if (d2 && d2.pod && isPyeongtaekPort(d2.pod)) { const p = posOf(d2); if (p) ptkD.push(p); } }
    for (const l2 of Object.values(loadEdiMap)) { if (l2 && l2.pol && isPyeongtaekPort(l2.pol)) { const p = posOf(l2); if (p) ptkL.push(p); } }
    const holdPtkBays = new Set([...ptkD, ...ptkL].filter((p) => _n(p.slice(5)) < 80).map((p) => _n(p.slice(0, 3))));
    for (const [cn, v] of Object.entries(out)) {
      const p = v.from, b = _n(p.slice(0, 3)), t = _n(p.slice(5));
      const deck = t >= 80;
      const stackBelowDis = ptkD.some((q) => q.slice(0, 5) === p.slice(0, 5) && ((_n(q.slice(5)) >= 80) === deck) && _n(q.slice(5)) < t);
      const stackLoadLE  = ptkL.some((q) => q.slice(0, 5) === p.slice(0, 5) && ((_n(q.slice(5)) >= 80) === deck) && _n(q.slice(5)) <= t);
      const coverWork = deck && (holdPtkBays.has(b) || (b % 2 === 0 && (holdPtkBays.has(b - 1) || holdPtkBays.has(b + 1))));
      if (!(stackBelowDis || stackLoadLE || coverWork)) delete out[cn];
    }
  }
  for (const v of Object.values(out)) { delete v._iso; delete v._fe; }   // 내부 필드 정리(호환 형태 유지)
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// TallyOne 1.27(검수사 확정 2026-08-08): **시프팅 예측 — 양하 EDI 하나로, 작업 시작 전에.**
//
//   ⛔ 종전 computeShiftingMap 은 양하·선적 **두 EDI 의 위치 차이**로 셌다. 그건 작업이 끝나고
//     선적 EDI 가 와야 알 수 있는 **사후 확인**이다. 검수사 지적 그대로 —
//     *"홀드 양하를 하려면 커버를 열어야 하는데, 그 컨테이너들을 치워야만 알 수 있습니다."*
//     시프팅은 **커버를 열기 전에** 알아야 하는 값이다.
//
//   ★ 규칙 (SWDN 2608N 실측으로 확정 · 과검출 0 · 놓침 0)
//     ① 베이별로 **홀드에 평택 양하분이 있는 현측**을 찾는다 — 짝수 row 쪽 / 홀수 row 쪽.
//        row 00 은 중앙이라 양쪽 커버에 걸친다 → 양측 모두 열어야 하는 것으로 본다.
//     ② 그 **열어야 할 현측의 데크**에 얹힌 **통과화물**이 곧 치워야 할 컨 = 시프팅.
//
//   왜 현측으로 가르나 — 해치커버가 현측별로 나뉘기 때문이다. 검수사 확답:
//     *"26번 베이는 커버 1장 오픈입니다. 걸리는 것이 없습니다."*
//     실제로 26번은 홀드 양하가 짝수 row(02·04·06·08)뿐이라 짝수쪽만 열면 되고,
//     데크 통과화물은 홀수 row(05·07·09)에 있어 안 걸렸다. 반대로 3번은 홀드 양하에 짝수(00·02)가
//     있어 짝수쪽을 열어야 했고 그 위 row 08 컨이 걸렸다. 베이 전체로 보면 26번 9대가 과검출된다.
//
//   실측 대조(SWDN 2608N · 양하 EDI 564대): 예측 5대 = 실제 시프팅 5대(선적 EDI 대조값)와 완전 일치.
//     HALU2535445 3-08-82 · SEGU9587990 10-00-82 · OTPU6566655 10-00-84
//     HLHU8345089 10-00-86 · TCKU7839055 10-02-84  (전부 VNSGN→KRPUS 통과화물)
//   배정목록 '시프팅 10' 과도 맞는다 — 그 10 은 무브 수(양하 1 + 재선적 1)라 컨 5대다.
// ══════════════════════════════════════════════════════════════════════
const _sideOf = (row) => {
  const r = parseInt(row, 10);
  if (!Number.isFinite(r)) return null;
  if (r === 0) return 'C';          // 중앙 — 양쪽 커버에 걸친다
  return (r % 2 === 0) ? 'E' : 'O'; // 짝수 현측 / 홀수 현측
};
const _isDeckTier = (tier) => {
  const t = parseInt(tier, 10);
  return Number.isFinite(t) && t >= 80;   // 80번대 이상 = 데크(지침 Ⅱ 데크/홀드 분리)
};

/** 양하 EDI 맵 하나로 시프팅(치워야 할 통과화물)을 예측한다.
 *  dischEdiMap: {cn: 컨} — **평택분만 거른 것이 아니라 전체**여야 한다(통과화물이 대상이므로).
 *  반환 {cn: {bay,row,tier,pos,iso,pod,_why}} */
export function predictShifting(dischEdiMap, baysInfo) {
  const out = {};
  if (!dischEdiMap) return out;
  const rows = Object.entries(dischEdiMap).filter(([cn, c]) => cn && cn.length === 11 && !cn.startsWith('__') && c);
  // ── 1.69-06: 해치커버 **패널 모델** (검수사 현장 신고 2026-08-14, MAMP 631N) ──
  //   *"지금 있는 곳은 중간 커버를 열지 않음."* — 커버는 현측 2장이 아니라 **베이당 hatchCount장**
  //   (예: MAMP 3장 — 좌현/중앙/우현)으로 갈린다. 종전 E/O(짝홀 현측) 모델은 2장 가정이라,
  //   MAMP 26번(홀드 양하 05~08열 = 좌·우 패널)에서 **중앙 패널 위** 통과분 8대를 오검출했다
  //   (배정표 이적 0과도 어긋남 — 실측 재현 후 수정). 베이사전 hatchCount·rowCount 가 있으면
  //   행을 물리 순서(짝수 내림→00→홀수 오름)로 세워 hatchCount 등분 — 홀드 양하분이 있는
  //   패널만 연다. ⚠ 패널-열 경계의 실측 데이터는 없다(등분은 근사) — 사전에 hatchCount 가
  //   없는 배는 종전 E/O 모델 그대로다(SWDN 오라클 경로 보존).
  const _info = baysInfo || {};
  // ── 1.69-08: 패널 축은 **홀드 행**으로 짠다 (검수사 현장 신고 2026-08-14, KKLC 30번) ──
  //   *"그곳은 커버를 열지 않는 곳"* — 커버가 덮는 것은 홀드다. 종전 축은 사전 rowCount(데크 폭)로
  //   행을 채워, KKLC 30번(데크 11행·홀드 9행)에서 유령 행 9·10·11이 등분을 밀어 중앙 패널이
  //   {2,0,1,3}이 됐고, 홀드 3행(평택)이 중앙을 여는 셈이 되어 그 위 광양 데크 8대를 오검출했다.
  //   실측(KKLC 29·30·31 한 홀드): 홀드 0·1·2행=광양, 3~8행=평택 — 중앙 패널 {2,0,1}은 안 연다.
  //   ① 축 = 홀드 그룹(ISO 한 홀드: 짝수 e와 e±1 — rowCount 같은 이웃만)의 홀드 실행(공백 1..max 채움)
  //   ② 등분 나머지는 중앙 패널부터(MAMP 26번 홀드 10행 → 3·4·3, 중앙 {4,2,1,3} — 1.69-06 실측 보존)
  //   ③ 열림 판정은 종전대로 **베이별** — SWDN 25/27 실측(이웃 26번 홀드 양하가 열려도 25/27
  //      00행 데크는 안 움직였다, 1.27 선적EDI 오라클 5대): 그룹 공유로 하면 5→10 과검출된다
  //   ④ 축 밖 데크 행(홀드보다 넓은 데크 9·10행 등)은 물리 순서로 끼워 가장 가까운 패널에 붙인다
  const _holdRows = {};                       // 베이번호 → 홀드(t<80) 실행 집합
  for (const [, c] of rows) {
    if (_isDeckTier(c.tier)) continue;
    const bn = parseInt(normalizeBay(c.bay || ''), 10);
    const r = parseInt(c.row, 10);
    if (!Number.isFinite(bn) || !Number.isFinite(r)) continue;
    (_holdRows[bn] = _holdRows[bn] || new Set()).add(r);
  }
  const _groupOf = (bn) => {                  // ISO 한 홀드: 40ft 짝수 베이 e 와 20ft e±1 (e ≡ 2 mod 4)
    if (!Number.isFinite(bn) || bn % 2 === 0) return bn;
    const e = ((bn + 1) % 4 === 2) ? bn + 1 : bn - 1;
    return (_info[e] || _holdRows[e]) ? e : bn;   // 짝수 베이 실체가 없으면 자기 혼자
  };
  const _physKey = (r) => (r === 0 ? 0 : (r % 2 === 0 ? -r : r));   // 물리 순서: 짝수 내림 → 00 → 홀수 오름
  const _axisCache = {};
  const _groupAxis = (g) => {
    if (_axisCache[g]) return _axisCache[g];
    const set = new Set();
    const rc0 = _info[g] ? parseInt(_info[g].rowCount, 10) : NaN;
    const members = (g % 2 === 0) ? [g - 1, g, g + 1] : [g];
    for (const m of members) {
      if (!_holdRows[m]) continue;
      const rcM = _info[m] ? parseInt(_info[m].rowCount, 10) : NaN;
      if (m !== g && Number.isFinite(rc0) && Number.isFinite(rcM) && rc0 !== rcM) continue;   // 다른 홀드 이웃 배제
      for (const r of _holdRows[m]) set.add(r);
    }
    let max = -1; for (const r of set) if (r > max) max = r;
    for (let i = 1; i <= max; i++) set.add(i);   // 관측 공백(빈 스택)이 등분을 흔들지 않게 채움 — 0행은 관측될 때만
    const ax = [...set].sort((a, b) => _physKey(a) - _physKey(b));
    _axisCache[g] = ax;
    return ax;
  };
  const _panelOf = (bay, row) => {
    const bn = parseInt(bay, 10);
    const inf = _info[bn];
    // ── 1.75: 사전에 **실측 커버 경계**(hatchRows)가 있으면 등분 근사를 쓰지 않는다 ──
    //   검수사 확정 2026-08-15 (SWBT) — *"08·06·04·02 / 00·01·03·05·07  2장입니다."*
    //   ⚠ **00열(센터)이 항상 양쪽에 걸치는 것이 아니다.** SWBT 는 00 이 홀수측 패널에 속한다.
    //   등분 근사(9열÷2)는 00 을 짝수측에 넣어 커버 판정을 뒤집었다 — 실측 경계가 있으면 그게 이긴다.
    const hr = inf && Array.isArray(inf.hatchRows) ? inf.hatchRows : null;
    if (hr) {
      const r0 = parseInt(row, 10);
      if (!Number.isFinite(r0)) return null;
      for (let p = 0; p < hr.length; p++) if ((hr[p] || []).map(Number).includes(r0)) return p;
      return null;                                    // 경계에 없는 열 — 판정 보류(보수적으로 포함)
    }
    const n = inf ? parseInt(inf.hatchCount, 10) : NaN;
    if (!Number.isFinite(n) || n < 1) return null;   // 패널 정보 없음 → 종전 현측(E/O) 모델
    const ax = _groupAxis(_groupOf(bn));
    const r = parseInt(row, 10);
    if (!ax.length || !Number.isFinite(r)) return null;
    let i = ax.indexOf(r);
    if (i < 0) {                                     // 축 밖 행(데크가 홀드보다 넓다) — 물리 순서로 끼움
      const k = _physKey(r); let c0 = 0;
      for (const a of ax) if (_physKey(a) < k) c0++;
      i = Math.min(c0, ax.length - 1);
    }
    const base = Math.floor(ax.length / n), rem = ax.length % n;
    const sizes = Array(n).fill(base);               // 등분 나머지는 중앙 패널부터 (MAMP 26번 실측)
    const order = [...Array(n).keys()].sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2) || a - b);
    for (let j = 0; j < rem; j++) sizes[order[j]]++;
    let cum = 0;
    for (let p = 0; p < n; p++) { cum += sizes[p]; if (i < cum) return p; }
    return n - 1;
  };
  // ① 홀드에 평택 양하분이 있는 베이 → 열어야 할 커버 (패널 정보 있으면 패널, 없으면 현측)
  const openSides = {};
  const openPanels = {};
  for (const [, c] of rows) {
    if (_isDeckTier(c.tier)) continue;
    if (!isPyeongtaekPort(c.pod)) continue;
    const b = normalizeBay(c.bay || '');
    if (!b) continue;
    const p = _panelOf(b, c.row);
    if (p != null) { (openPanels[b] = openPanels[b] || new Set()).add(p); continue; }
    const sd = _sideOf(c.row);
    if (!sd) continue;
    (openSides[b] = openSides[b] || new Set()).add(sd);
  }
  for (const b in openSides) {
    if (openSides[b].has('C')) { openSides[b].add('E'); openSides[b].add('O'); }   // 중앙이면 양쪽
  }
  // ② 열어야 할 커버의 데크에 얹힌 통과화물
  for (const [cn, c] of rows) {
    if (!_isDeckTier(c.tier)) continue;
    if (isPyeongtaekPort(c.pod)) continue;            // 평택 양하분은 어차피 내리므로 시프팅 아님
    const b = normalizeBay(c.bay || '');
    if (!b) continue;
    // ── 1.75: 40ft 데크 한 짝은 **20ft 두 베이(e-1·e+1) 커버 위에 걸친다** ──
    //   SWBT 2614S 실측 — 9·11번 홀드에 평택 양하 30대가 있는데 9·11 데크는 비어 있다.
    //   그 위 데크가 40ft 라 **10번**으로 실려 있기 때문이다. 베이 번호만 맞추면 영원히 못 본다.
    //   ⛔ **경계를 아는 배에서만 넓힌다.** 1.74-01 은 이 게이트 없이 넓혀 SWBT 에 허수 9대를 냈다
    //     (등분 근사가 00열을 짝수측에 넣어 커버가 양쪽 다 열리는 것으로 잡혔다).
    //     경계(hatchRows)가 없으면 커버가 어디서 갈리는지 모르는 것이므로 **1.74 동작 그대로** 둔다.
    const _knowsCover = (x) => { const inf = _info[parseInt(x, 10)]; return !!(inf && Array.isArray(inf.hatchRows)); };
    const _coverBays = (() => {
      const bn = parseInt(b, 10);
      if (!Number.isFinite(bn) || bn % 2 === 1) return [b];       // 20ft 데크 — 자기 베이만
      if (!_knowsCover(bn - 1) && !_knowsCover(bn + 1)) return [b];
      return [b, String(bn - 1), String(bn + 1)];                 // 40ft 데크 — 걸친 두 홀드까지
    })();
    let hit = false;
    for (const cb of _coverBays) {
      if (openPanels[cb]) {
        const p = _panelOf(cb, c.row);
        if (p == null || openPanels[cb].has(p)) { hit = true; break; }   // 패널 미상은 보수적으로 포함
      } else if (openSides[cb]) {
        const sd = _sideOf(c.row);
        if (sd && (sd === 'C' || openSides[cb].has(sd))) { hit = true; break; }
      }
    }
    if (hit) {
      const _pos = `${b}-${String(c.row || '').padStart(2, '0')}-${String(c.tier || '').padStart(2, '0')}`;
      // 1.43-02: 확정값(computeShiftingMap)과 같은 계약({from,to})을 지킨다 — from 없이 내보내
      //   VoyagePage shiftingList 정렬(a.from.localeCompare)이 앱 전체 크래시를 냈다(2026-08-10 실증).
      //   예측 단계는 목적지를 모르므로 to는 빈 문자열(화면이 '예측'으로 표시).
      out[cn] = { bay: b, row: String(c.row || ''), tier: String(c.tier || ''),
                  pos: _pos, from: _pos, to: '',
                  iso: c.iso || '', pod: c.pod || '',
                  _why: `${b}베이 홀드 양하분 위 — 커버 열려면 이동` };
    }
  }
  // ③ 1.44 (검수사 지적 2026-08-10, MCAT 630N): **같은 스택에서 평택 양하분 위에 얹힌 통과화물.**
  //   커버와 무관하게 이걸 들어내야 아래를 내린다. 종전 규칙(①②)은 커버 현측만 계산해
  //   MCAT 630N에서 30·34·44번 데크 양하분 위 통과 엠티 등 94대를 놓쳤다(실측 — 앱 10 vs 실제 104).
  //   SWDN 2608N 오라클 회귀: 이 규칙을 더해도 5대 그대로(추가분이 기존 5대에 포함) — 과검출 0.
  //   데크/홀드 각각 같은 (베이,열) 스택 안에서만 본다(축 통합 금지 — 지침 Ⅱ).
  // 2.06-09 (검수사 실화면 지적 2026-08-21, MCSN 632N): «같은 bay 번호» 키만 쓰면 **크로스 베이를 놓친다** —
  //   40/45피트(bay N)는 물리적으로 20피트 베이 N-1·N+1 두 반쪽을 덮는다. 실측: (34)35 홀드 10열,
  //   35번 t06 양하 리퍼(MCRU2047124) 위에 34번 45GE 2대(t08 MSKU1554342·t10 MRKU3850803)가 얹혀
  //   있는데 bay 번호가 달라 미검출(48/50). → 스택 좌표를 «반쪽»으로: 20피트급(ISO 2*)은 자기 bay,
  //   40피트급은 [bay-1, bay+1] 두 반쪽에 참가. 같은 bay 끼리는 종전과 동일하게 만난다(회귀 0 확인).
  const _stacks = {};
  for (const [cn, c] of rows) {
    const b = normalizeBay(c.bay || '');
    if (!b || c.row === undefined || c.row === null || c.row === '') continue;
    const t = parseInt(c.tier, 10);
    if (!Number.isFinite(t)) continue;
    const zone = _isDeckTier(c.tier) ? 'D' : 'H';
    const _bn = parseInt(b, 10);
    const _is20 = /^2/.test(String(c.iso || '').trim());
    const _halves = (_is20 || !Number.isFinite(_bn)) ? [b] : [String(_bn - 1), String(_bn + 1)];
    for (const _h of _halves) {
      const k = `${_h}|${String(c.row)}|${zone}`;
      (_stacks[k] = _stacks[k] || []).push([cn, c, t]);
    }
  }
  for (const arr of Object.values(_stacks)) {
    let low = Infinity;
    for (const [, c, t] of arr) if (isPyeongtaekPort(c.pod) && t < low) low = t;
    if (!Number.isFinite(low)) continue;
    for (const [cn, c, t] of arr) {
      if (t <= low || isPyeongtaekPort(c.pod) || out[cn]) continue;
      const b = normalizeBay(c.bay || '');
      const _pos = `${b}-${String(c.row || '').padStart(2, '0')}-${String(c.tier || '').padStart(2, '0')}`;
      out[cn] = { bay: b, row: String(c.row || ''), tier: String(c.tier || ''),
                  pos: _pos, from: _pos, to: '',
                  iso: c.iso || '', pod: c.pod || '',
                  _why: `같은 스택 ${b}베이 양하분 위 — 들어내야 양하` };
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// TallyOne 1.76: **정답표 자가 대조 + 커버 역산** (검수사 지적 2026-08-15)
//
//   > *"앱이 똑똑 하다면 왜 배정목록에 시프팅 0인데 커버가 어떻해야 시프팅이 0인지를
//   >   계산 했을것입니다. 몇장인지도 알았을 것입니다."*
//
//   맞다. 정답은 앱 안에 이미 있었다 — `info.berthShift`(수집기가 배정목록 S/H 칸에서 넣는다).
//   그런데 앱은 자기 예측과 그 정답을 **나란히 보여주기만 하고 어긋났다고 말하지 않았다.**
//   그래서 KSKM 2615N 허수 4대·XTPG 536E 허수 7대가 조용히 떠 있었다(2026-08-15 전수 대조로 발견).
//   조용히 틀리는 코드 금지(3금지 ③) — 어긋나면 화면이 말한다.
// ══════════════════════════════════════════════════════════════════════

/** 배정표 이적(모브)과 예측 대수를 대조한다.
 *  배정목록의 "이적 N"은 **왕복 무브 수**라 대수는 N/2 (지침 5-1B).
 *  반환 null = 대조 불가. { truth, pred, ok, moves } 또는 { pending:true, reason } */
//
// ── 1.76-01: **작업 전 항차의 `berthShift:0` 은 «이적 없음» 이 아니라 «아직 안 나온 것»이다 ──
//   검수사 지적 2026-08-15 — *"그것이 확정EDI인가요?"*
//   1.76 은 `berthShift` 가 숫자이기만 하면 정답으로 삼았다. 그런데 라이브 실측에서
//   **`berthShift:0` 인 8항차 중 7항차가 `terminalStatus:'planned'`(작업 전)** 였고,
//   유일하게 `working` 인 MAMP 631N 만 0 이 아닌 값(2모브)을 갖고 있었다.
//   XTPG 536E 는 8/17 예정 항차이고 EDI 도 `XTPG 536W INC-Confirm.ASC`(확정 전)인데
//   1.76 은 그것을 «⛔ 불일치» 로 단정했다. 지침 5-3 위반 — **확정 전에는 수치 불일치를 판단하지 않는다.**
//   → 배정표 이적은 **작업이 시작된 뒤**(working/departed/done)에만 정본으로 인정한다.
//     그 전에는 대조를 «보류» 로 두고 화면이 그렇게 말한다(조용히 넘기지 않는다).
const _TRUTH_READY = new Set(['working', 'departed', 'done', 'finished', 'completed']);
export function shiftingTruthCheck(voyage, predCount) {
  const bs = voyage?.info?.berthShift;
  const pred = Number(predCount) || 0;
  if (bs === null || bs === undefined || bs === '') return null;      // 자료 자체가 없음
  const n = Number(bs);
  if (!Number.isFinite(n)) return null;
  const ts = String(voyage?.info?.terminalStatus || '').trim().toLowerCase();
  if (!_TRUTH_READY.has(ts)) {
    return { pending: true, pred, moves: n, terminalStatus: ts || '미상',
             reason: '작업 시작 전 — 배정표 이적이 아직 확정값이 아니다' };
  }
  const truth = n / 2;
  return { truth, pred, ok: truth === pred, moves: n };
}

const _physRowKey = (r) => (r === 0 ? 0 : (r % 2 === 0 ? -r : r));

/** 이 배 홀드의 열 축(물리 순서: 짝수 내림 → 00 → 홀수 오름). */
export function holdRowAxis(voyage) {
  const map = ediMapFromRaw(voyage?.discharge) || voyage?.discharge?.ediContainers || {};
  const rows = new Set();
  for (const c of Object.values(map || {})) {
    if (!c) continue;
    const t = parseInt(c.tier, 10), r = parseInt(c.row, 10);
    if (!Number.isFinite(t) || !Number.isFinite(r) || t >= 80) continue;
    rows.add(r);
  }
  let max = -1; for (const r of rows) if (r > max) max = r;
  for (let i = 1; i <= max; i++) rows.add(i);
  return [...rows].sort((a, b) => _physRowKey(a) - _physRowKey(b));
}

/** 커버 역산 — 배정표 이적 정답을 만족하는 커버 분할을 전수로 찾는다.
 *  축을 n개 **연속 구간**으로 자르는 모든 방법을 돌린다(1~maxPanels 장).
 *  반환 { axis, tried, solutions:[[...],[...]], best } — best 는 장수 최소 해가 유일할 때만 채운다.
 *  ⚠ 한 항차로는 후보가 여럿 남는다(SWBT 실측 93후보 → 해 29). 장수 최소 해가 유일할 때만 제안한다. */
export function solveHatchRows(voyage, dictEntry, targetUnits, maxPanels = 4) {
  const axis = holdRowAxis(voyage);
  if (axis.length < 2) return { axis, tried: 0, solutions: [], best: null };
  const cuts = (n) => {
    const res = []; const rec = (st, left, acc) => {
      if (left === 1) { res.push([...acc, axis.slice(st)]); return; }
      for (let i = st + 1; i <= axis.length - (left - 1); i++) rec(i, left - 1, [...acc, axis.slice(st, i)]);
    }; rec(0, n, []); return res;
  };
  const base = JSON.parse(JSON.stringify(dictEntry || {}));
  const bays = base?.bayDef?.baysSummary || base?.baysSummary || [];
  if (!bays.length) return { axis, tried: 0, solutions: [], best: null };
  //   조합 폭주 방지 — 축이 길면 4장 분할이 수백 가지가 된다. 화면이 멈추지 않게 상한을 둔다.
  //   ⛔ 조용히 자르지 않는다 — 잘렸으면 capped 로 알린다(3금지 ③).
  const LIMIT = 800;
  const solutions = []; let tried = 0, capped = false;
  for (let n = 1; n <= maxPanels; n++) {
    for (const cfg of cuts(n)) {
      if (tried >= LIMIT) { capped = true; break; }
      tried++;
      for (const b of bays) { b.hatchCount = n; b.hatchRows = cfg; }
      let got = -1;
      try { got = Object.keys(predictShiftingFromVoyage(voyage, base) || {}).length; } catch (e) { got = -1; }
      if (got === targetUnits) solutions.push(cfg);
    }
  }
  let best = null;
  if (solutions.length) {
    const min = Math.min(...solutions.map(c => c.length));
    const mins = solutions.filter(c => c.length === min);
    if (mins.length === 1) best = mins[0];       // 장수 최소 해가 유일할 때만 제안
  }
  return { axis, tried, solutions, best, capped };
}

// ── 1.45: 항로(Port Rotation) 사전 — 키는 배정목록의 항로 코드 (검수사 확정 2026-08-10) ──
//   "배정목록엔 각 항로가 있고 각 항로가 구글검색에서 자세히 나오고 있습니다."
//   로테이션은 평택(KRPTK)에서 시작하는 한 바퀴. 예측 시프팅이 EDI 출항지(LOC+5)와 이 표로
//   **평택 도착 전에 내리는 항의 POD를 제외**한다 — MCAT 630N 실증: 다바오 출항본에
//   신강 양하 445대가 실려 있어 시프팅 104로 오판(실제 배정표 이적 0). 제외 후 0 일치.
// 1.45: RTDB `lane_routes/{항로}` 가 오면 내장 시드를 덮어쓴다 — 항로는 바뀐다.
//   검수사 확정: *"공개자료도 검색을 최신으로 해야 정확한게 나옵니다."* 갱신은 최신 검색으로,
//   확인일자(checkedAt)를 함께 기록한다. 재배포 없이 RTDB 수정만으로 반영된다.
let _LANE_DYN = {};
export function setLaneRoutes(m) { _LANE_DYN = m || {}; }
export function laneRouteOf(lane) {
  const k = String(lane || '').toUpperCase();
  return _LANE_DYN[k] || LANE_ROUTES[k] || null;
}

export const LANE_ROUTES = {
  // 머스크 IA8 (MCAT ARTOTINA 등) — 배정표 Port Rotation 실물 그대로 (2026-08-10)
  IA8: { rotation: ['KRPTK', 'CNDLC', 'CNTSN', 'CNTAO', 'IDJKT', 'IDSUB', 'PHDVO', 'CNTXG', 'KRSOS'],
         note: '평택→대련→천진→청도→자카르타→수라바야→다바오→신강→속초→평택 (약 5주 순환)' },
  // 장금상선(주) 평택-청도 셔틀 (비관할 항로 — 관할 판정 참고용)
  PQS: { rotation: ['KRPTK', 'CNTAO'], note: '평택-청도 셔틀 (장금상선(주), 비관할)' },
  // 1.69-07 고려해운 KPX (KKLC KMTC LAEM CHABANG) — 검수사 확정 «인천 먼저 갔다 옵니다».
  //   실물 근거(추측 아님): 평택 양하 정본 EDI가 매 항차 **인천 출항본**이다 — archive 실측
  //   KKLC_2606N←KKLC2607SINCB.EDI · KKLC_2605N←KKLC2606SINCPA.EDI · KKAK_2607N←KKAK2607NINCB.EDI.
  //   인천에서 항차번호가 N→S로 바뀜(2606N 양하 정본이 2607S INCB) = 인천이 회항점, 평택 직전 기항.
  //   광양이 평택 다음인 것은 PORT-MIS D5MP9 nextPort=광양 실측. 부산 이후 구간은 걸음이
  //   KRPTK에서 멈춰 판정에 쓰이지 않는다(포항·필리핀 구간 순서 미상이라 넣지 않음).
  KPX: { rotation: ['KRINC', 'KRPTK', 'KRKAN', 'KRPUS', 'CNSHK'], note: '…셰코우→인천(회항점)→평택→광양→부산… (고려해운, 평택 양하 정본=인천 출항본)' },
};

/** EDI 원문에서 출항지(LOC+5) 추출 — BAPLIE 헤더. 없으면 ''.
 *  1.69-07: ASC($604)는 LOC 세그먼트가 없다 — 헤더의 /POD:XXX/(3자 출항항, KKLC2607NSHKB 실측 SHK)를
 *  컨 라인 꼬리 POL5(LOCODE=국가2+항3, CNSHK←SHK)와 대응해 5자로 해석한다. */
export function ediOriginOf(sec) {
  const t = sec?.raw?.edi?.text;
  if (!t || typeof t !== 'string') return '';
  const m = t.match(/LOC\+5\+([A-Z]{5})/);
  if (m) return m[1];
  // 1.76-05: ASC 헤더의 **POL:** 도 읽는다 — 종전엔 LOC+5 와 POD: 만 봐서 출항지를 못 냈다.
  //   실측 XTPG 536E — 양하 EDI 가 `$604XTPG/ /536W / /POL:INC/260816` (인천 선적 확인본)인데
  //   origin 이 '' 이라 portsBeforePtk 가 «판단 불가»를 냈다. 항로 사전에 TIS2 를 넣어도 못 썼다.
  //   정답은 헤더에 찍혀 있다 — 3자리 항구 코드는 KR 을 붙여 5자리로 맞춘다(INC → KRINC).
  const pol = t.match(/\$604[^\n]*POL:([A-Z]{3,5})/);
  if (pol) {
    const p = pol[1];
    if (p.length === 5) return p;
    const kr = { INC: 'KRINC', PTK: 'KRPTK', PUS: 'KRPUS', KAN: 'KRKAN', SOS: 'KRSOS', MAS: 'KRMAS', ULS: 'KRUSN' };
    if (kr[p]) return kr[p];
  }
  const h = t.match(/\$604[^\n]*POD:([A-Z]{3})/);
  if (h) {
    const p3 = h[1];
    for (const ln of t.split(/\r?\n/)) {
      const pp = ln.match(/([A-Z]{5})([A-Z]{5})\s*$/);
      if (pp && pp[1].slice(2) === p3) return pp[1];
    }
  }
  return '';
}

/** EDI 원문에서 다음 기항지(LOC+61) 추출 — BAPLIE 헤더. 없으면 ''.
 *  1.69-07(검수사 확정 2026-08-14): 다음 기항은 로테이션 사전보다 EDI가 정본이다 — MAMP 631N 실측
 *  LOC+5=PHDVO·LOC+61=KRPTK(다바오 08-10 출항→평택 08-16 ETA — 신강·속초 경유가 물리적으로 불가능한
 *  직항). IA8 사전으로만 걸으면 신강분 364대를 «평택 도착 전 하선»으로 오판해 숨겼다(1.69-06). */
export function ediNextPortOf(sec) {
  const t = sec?.raw?.edi?.text;
  if (!t || typeof t !== 'string') return '';
  const m = t.match(/LOC\+61\+([A-Z]{5})/);
  return m ? m[1] : '';
}

/** 항로 로테이션에서 평택(KRPTK) 도착 전에 들르는 기항 목록. 판단 불가면 null.
 *  1.69-07 우선순위(검수사 확정 — «기항 순서가 시프팅 판정에 빠져 있다»):
 *  ① EDI 다음 기항(LOC+61)이 평택 → [] (직항 — 그 사이에 내리는 항 없음. MAMP 631N)
 *  ② 다음 기항이 타항 + 로테이션 사전에 있음 → 그 항부터 평택 전까지
 *  ③ 다음 기항이 타항 + 사전 없음 → [다음 기항] (최소 확정 집합 — 다음 기항 하선은 확실. YKTD KRINC)
 *  ④ 다음 기항 미상 → 종전 출항지+사전 걸음 (KKLC ASC — 출항지는 ediOriginOf ASC 해석)
 *  ⑤ 다 모르면 null — 종전 판정 유지, 답변에 «로테이션 미확인» 표기 */
export function portsBeforePtk(lane, origin, nextPort) {
  const np = String(nextPort || '').toUpperCase();
  if (np === 'KRPTK') return [];
  const r = laneRouteOf(lane)?.rotation;
  if (np) {
    if (r && r.indexOf(np) >= 0) {
      const j = r.indexOf(np);
      const out = [];
      for (let k = 0; k < r.length; k++) {
        const p = r[(j + k) % r.length];
        if (p === 'KRPTK') return out;
        out.push(p);
      }
      return null;   // 로테이션에 KRPTK 없음 — 판단 불가
    }
    return [np];
  }
  if (!r || !origin) return null;
  const i = r.indexOf(String(origin).toUpperCase());
  if (i < 0) return null;
  const out = [];
  for (let k = 1; k < r.length; k++) {
    const p = r[(i + k) % r.length];
    if (p === 'KRPTK') return out;
    out.push(p);
  }
  return null;   // 로테이션에 KRPTK 없음 — 판단 불가
}

/** 항차 객체에서 시프팅 예측. raw EDI(전체 화물) 우선 — ediContainers 는 평택분만일 수 있다.
 *  1.45: 항로·출항지를 알면 평택 도착 전에 내리는 항의 POD를 제외하고 계산한다.
 *  반환 맵에 _meta(origin·excluded·excludedCnt)를 붙여 화면이 근거를 표시한다. */
export function predictShiftingFromVoyage(voyage, dictEntry) {
  const sec = voyage?.discharge;
  let map = ediMapFromRaw(sec) || sec?.ediContainers || null;
  const origin = ediOriginOf(sec);
  const nextPort = ediNextPortOf(sec);   // 1.69-07: LOC+61이 정본 — 평택이면 «도착 전 하선» 없음
  const lane = voyage?.info?.lane || '';
  let excluded = null, excludedCnt = 0;

  /* ★ 2.21 (검수사 확정 2026-08-23) — **세관 양하리스트가 «평택 양하분»이라 하면 그 말이 맞다.**
       검수사 원문: *«ATPR 양하에 시프팅이 잡혀있습니다. 조회 해보니 인천짐으로 되어 있지만 이선박은
       인천엔 가지 않습니다. 그리고 세관리스트에는 평택짐으로 양하목록에 포함되어 있습니다.
       제생각엔 평택에서 양하후에 다른선박으로 환적할것 같습니다. 고로 시프팅은 없는듯 합니다.»*

     실측(ATPR 2638E) — EDI POD 가 KRINC 인 5대(TCNU6972089·SKHU9614024·HALU5633358·
     SKHU8125501·SKHU8718087, 전부 24베이 84단 45GP)를 앱이 «24베이 홀드 양하분 위 — 커버 열려면 이동»
     으로 잡았다. 그런데 **그 5대가 세관 양하리스트에는 POD=KRPTK 로 들어 있다**(리스트에만 있는 5대와 정확히 일치).
     LOC+61 은 KRPTK 라 «평택 전에 들르는 항구»도 없어서 종전 제외 규칙(portsBeforePtk)에는 안 걸린다.

     왜 EDI 가 인천이라 했나 — **환적(T/S)이다.** EDI 의 POD 는 «평택에서 다른 배로 옮겨 실은 뒤의
     최종 목적지»를 적어 놓았다. 배가 실제로 인천에 가는 것이 아니다. 짐은 **평택에서 내린다.**
     ⇒ 내리는 짐은 시프팅이 아니다. 세관 리스트 값으로 POD 를 바로잡는다.

     ⚠ 지우지 않고 **바로잡는다.** map 에서 빼면 그 자리가 «빈 자리»가 되어 아래 짐의 커버 판정이 틀어진다.
        POD 만 평택으로 고치면 «내리는 짐»이 되어 물리 계산이 맞다.
     ⚠ 반대 방향은 건드리지 않는다 — 세관 리스트가 평택이 아니라고 해서 EDI 의 평택을 뒤집지는 않는다.
        세관 리스트는 «평택에서 내리는 것»의 명단이지, 안 내리는 것의 명단이 아니다. */
  let customsFixed = [];
  const _recs = sec?.records || null;
  if (map && _recs && Object.keys(_recs).length) {
    const fixed = {};
    for (const [cn, c] of Object.entries(map)) {
      const ediPod = String(c?.pod || '').toUpperCase();
      const recPod = String(_recs[cn]?.pod || '').toUpperCase();
      if (ediPod && recPod && !isPyeongtaekPort(ediPod) && isPyeongtaekPort(recPod)) {
        customsFixed.push({ cn, ediPod, recPod,
          pos: `${parseInt(c?.bay, 10) || c?.bay || ''}-${c?.row || ''}-${c?.tier || ''}`, iso: c?.iso || '' });
        fixed[cn] = { ...c, pod: recPod, _podEdi: ediPod, _podFrom: 'customs' };
      } else fixed[cn] = c;
    }
    map = fixed;
  }
  if (map && (origin || nextPort)) {
    const before = portsBeforePtk(lane, origin, nextPort);
    if (before && before.length) {
      const gone = new Set(before.map(p => p.toUpperCase()));
      const kept = {};
      for (const [cn, c] of Object.entries(map)) {
        if (gone.has(String(c?.pod || '').toUpperCase())) { excludedCnt++; continue; }
        kept[cn] = c;
      }
      map = kept; excluded = before;
    }
  }
  // 1.69-06: 베이사전 해치 패널 정보 — 명시 인자 우선, 없으면 전역 사전(window.__fbShipBayDict —
  //   BayMatrix 계열·GlobalSearchPage 와 같은 접근 패턴). 사전이 늦게 오면 그 렌더까지는 E/O 모델이다.
  let baysInfo = null;
  try {
    const vsl = String(voyage?.info?.vsl || '').toUpperCase();
    const de = dictEntry || ((typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[vsl] : null);
    const bs = de?.bayDef?.baysSummary || de?.baysSummary;
    if (Array.isArray(bs)) {
      baysInfo = {};
      for (const e of bs) {
        const bn = parseInt(e?.bayNo ?? e?.bay, 10);
        if (!Number.isFinite(bn)) continue;
        baysInfo[bn] = { hatchCount: e?.hatchCount, rowCount: e?.rowCount, hatchRows: e?.hatchRows,
                         hasZero: !!(e?.hasZero || e?.deckHasZero || e?.holdHasZero) };
      }
      if (!Object.keys(baysInfo).length) baysInfo = null;
      // 1.69-07: 같은 홀드 이웃 베이의 hatchCount 어긋남 보정 — MAMP 실측(사전 33번=3장·34번=1장,
      //   ISO 베이 규칙상 33·34·35는 한 홀드라 커버 장수가 같아야 한다. 1.69-06 함정 메모 그대로).
      //   34번=1장으로 두면 홀드 양하(05~08열=좌·우 패널)가 중앙 패널까지 여는 셈이 되어
      //   중앙 데크 맨 아래 통과분(CAAU9967900, 01열 82단 — 위가 전부 평택분)을 시프팅으로 오검출.
      //   게이트: 이웃(±1) 베이가 rowCount 같을 때만, 더 큰 hatchCount 로 올린다(내림 없음).
      if (baysInfo) {
        for (const bn of Object.keys(baysInfo)) {
          const e = baysInfo[bn]; const n0 = parseInt(bn, 10);
          for (const d of [n0 - 1, n0 + 1]) {
            const ne = baysInfo[d];
            if (ne && parseInt(ne.rowCount, 10) === parseInt(e.rowCount, 10) &&
                (parseInt(ne.hatchCount, 10) || 0) > (parseInt(e.hatchCount, 10) || 0)) {
              e.hatchCount = ne.hatchCount;
            }
          }
        }
      }
    }
  } catch (e) { baysInfo = null; }
  const out = predictShifting(map, baysInfo);
  try {
    Object.defineProperty(out, '_meta', { value: { origin, nextPort, lane, excluded, excludedCnt, hatchInfo: !!baysInfo,
      customsFixed,   // 2.21: 세관 양하리스트가 평택분이라 해서 POD 를 바로잡은 건 — 화면이 근거로 보여 준다
      // rot: 판정 근거 — direct(EDI 다음 기항=평택) · edi(다음 기항 실측) · rotation(사전 걸음) · unknown(미확인)
      rot: (nextPort === 'KRPTK') ? 'direct' : (excluded ? (nextPort ? 'edi' : 'rotation') : 'unknown') }, enumerable: false });
  } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
  return out;
}

// V8.98-01: 항차 객체에서 쉬프팅 계산 — raw EDI 원문 우선.
//   실측(MAMP_626N, 2026-07-14): 수집기 등록 항차의 ediContainers에는 통과화물이 없어
//   ediContainers끼리 대조하면 빈손. raw/edi.text(전체 BAPLIE)를 파싱해 대조한다.
//   raw가 없거나 파싱 실패면 ediContainers로 폴백(하위호환 — 인앱 업로드 항차는 통과분 포함).
// V8.98-02: {mode} 섹션의 raw EDI 원문을 파싱해 전체 컨테이너 맵(cn→컨)을 만든다.
//   raw 없거나 파싱 실패면 null. 인앱 합본 저장("----- FILE: x -----" 구분자)은 나눠 파싱해 컨 수 최다 파일 채택.
// ══════════════════════════════════════════════════════
// TallyOne 2.09-01: **이번 항차의 구간 — 전 항구 → 평택 → 다음 항구** (검수사 확정 2026-08-23)
//
//   > *"우리 EDI는 인천에서 받아쓴 EDI라 그렇습니다. 그럴때는 **선적 EDI를 보면 보충이 될것**입니다."*
//   > *"홍콩 인천 평택 이 될수도 있씁니다."*
//   > *"**전항구 어디인지 알고 다음 항구가 어딘지 알면 연결이 될것입니다.**"*
//
//   ⚠ 클로드 오독 교정 — 터미널 항로표는 **순환 목록**이다. 그것을 직선으로 읽고
//     «표는 홍콩→평택인데 실측은 인천→평택이라 표가 틀렸다» 고 적었던 것은 **틀렸다.**
//     양하 EDI 는 «직전 기항에서 받아쓴 것» 이라 **평택 앞 한 항**만 말해 주고,
//     평택 **뒤**는 선적 EDI(평택 출항본)가 말한다. 둘을 붙여야 이번 항차가 순환의 어느 구간인지 «연결»된다.
//   실측(2026-08-23) — ATPR PDX4 는 실측·표가 CNWEI→평택으로 **일치**, MCSN IA8 은 다음 기항 CNDLC 로 **일치**.
// ══════════════════════════════════════════════════════

/** 항구 표기 정규화 — 리스트 원본은 3자리 약어·풀네임·부두코드가 섞여 온다 (검수사 확정 2026-08-23).
 *  실측(XTPG 537W 원본 8종): `CNNTG` · `NANTONG` · `NTG` · `CN NTG` 가 전부 남통,
 *  `CNTAG` · `TAICANG` · `TAICANG, CHINA` 가 전부 태창, `PTK` · `PTK02` 가 평택.
 *  ⛔ 정규화 못 하면 같은 항구가 여러 값으로 세어져 «다음 기항»이 흩어진다. */
const _PORT_ALIAS = {
  PTK: 'KRPTK', INC: 'KRINC', PUS: 'KRPUS', KAN: 'KRKAN', SOS: 'KRSOS', MAS: 'KRMAS', ULS: 'KRUSN',
  NTG: 'CNNTG', TAG: 'CNTAG', TAO: 'CNTAO', TAC: 'CNTAC', DLC: 'CNDLC', TSN: 'CNTSN', TXG: 'CNTXG',
  SHA: 'CNSHA', SHK: 'CNSHK', XMN: 'CNXMN', YNT: 'CNYNT', LYG: 'CNLYG', RZH: 'CNRZH', NGB: 'CNNGB',
  SHD: 'CNSHD', WEI: 'CNWEI', SGN: 'VNSGN', HPH: 'VNHPH', HKG: 'HKHKG', BKK: 'THBKK', LCH: 'THLCH',
  JKT: 'IDJKT', SUB: 'IDSUB', DVO: 'PHDVO', MNL: 'PHMNL', MIP: 'PHMIP', MNN: 'PHMNN',
  NANTONG: 'CNNTG', TAICANG: 'CNTAG', QINGDAO: 'CNTAO', DALIAN: 'CNDLC', TIANJIN: 'CNTSN',
  XINGANG: 'CNTXG', SHANGHAI: 'CNSHA', SHEKOU: 'CNSHK', XIAMEN: 'CNXMN', YANTAI: 'CNYNT',
  LIANYUNGANG: 'CNLYG', RIZHAO: 'CNRZH', NINGBO: 'CNNGB', INCHEON: 'KRINC', PYEONGTAEK: 'KRPTK',
  BUSAN: 'KRPUS', GWANGYANG: 'KRKAN', HAIPHONG: 'VNHPH', SAIGON: 'VNSGN', BANGKOK: 'THBKK',
  //  ★ 2.26: **PORT-MIS 는 국내항을 한글로 준다**(인천·광양·부산). 외국항만 영문이다.
  //    실측 2026-08-24 download.xlsx 차항지 — «인천» · «NANTONG» · «YANTAI APT» · «HAIPHONG».
  //    한글이 없어 `normPortCode('인천')` 이 «인천» 그대로였고, 그래서 평택 판정도 못 했다.
  //    ⚠ 같은 표가 `nlSearch.js PORT_KR_TO_CODE` 에도 있다(검색어 해석용) — **두 벌이다.**
  //      거기는 청도=CNQDG · 연태=CNYAT 로 여기(CNTAO · CNYNT)와 코드도 다르다. 합치는 것은 별도 판.
  '평택': 'KRPTK', '인천': 'KRINC', '부산': 'KRPUS', '광양': 'KRKAN', '울산': 'KRUSN',
  '여수': 'KRYOS', '군산': 'KRKUV', '목포': 'KRMOK', '마산': 'KRMAS', '포항': 'KRKPO',
  '대산': 'KRTSN', '동해': 'KRDHA', '평택항': 'KRPTK', '인천항': 'KRINC',
  '대련': 'CNDLC', '청도': 'CNTAO', '위해': 'CNWEI', '상해': 'CNSHA', '천진': 'CNTSN',
  '연태': 'CNYNT', '연운항': 'CNLYG', '남통': 'CNNTG', '태창': 'CNTAG', '일조': 'CNRZH',
  '홍콩': 'HKHKG', '셰코우': 'CNSHK',
  //  PORT-MIS 표기 변형 — 공백이 지워진 뒤의 모양으로 적는다(normPortCode 가 먼저 지운다).
  YANTAIAPT: 'CNYNT', SHEKOUPT: 'CNSHK', TOYOHASHI: 'JPTYH', GLADSTONE: 'AUGLT',
};
// ── 2.10: 날짜 헬퍼 공용 (HomePage 에 있던 것을 승격 — LoginPage 도 쓴다) ──
const _two2 = (n) => String(n).padStart(2, '0');
/** 오늘 기준 며칠 차이. 없으면 null. */
export function dayDiff(ms) {
  if (!ms) return null;
  const d = new Date(ms), t = new Date();
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate())
    - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
}
/** 오늘/내일/어제/MM-DD(요일) */
export function dayLabel(ms) {
  const n = dayDiff(ms);
  if (n === null) return '';
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  if (n === -1) return '어제';
  const d = new Date(ms);
  return `${_two2(d.getMonth() + 1)}-${_two2(d.getDate())}(${'일월화수목금토'[d.getDay()]})`;
}
/** 항차 작업 시작 예정 — `info.planDate` 앞부분(«2026-08-23 16:00 ~ …») → ms. 없으면 0.
 *  ⚠ HomePage 의 `_etaMs`(선석배정>도선>PORT-MIS 순 선택)와 다르다. 로그인 화면처럼
 *    그 계산을 다 돌릴 수 없는 곳에서 쓰는 가벼운 폴백이다. */
export function voyagePlanMs(voyage) {
  const m = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0;
}

export function normPortCode(v) {
  let s = String(v || '').trim().toUpperCase();
  if (!s) return '';
  s = s.split(',')[0].trim();                       // 'TAICANG, CHINA' → 'TAICANG'
  const c = s.replace(/[\s.]+/g, '');
  if (/^PTK\d*$/.test(c)) return 'KRPTK';           // 부두코드 PTK02
  if (/^[A-Z]{5}$/.test(c)) return c;
  if (_PORT_ALIAS[c]) return _PORT_ALIAS[c];
  return c;
}

/** 한 섹션에서 항구 필드 최다값 — EDI(raw) 우선, 없으면 **리스트(records)**.
 *  검수사 확정 2026-08-23: *«리스트에 컨테이너 상세 목록은 안보시고?»* — EDI 가 아직 안 온 항차도
 *  리스트에는 목적지가 들어 있다(XTPG 537W 실측 — 선적 EDI 없이 리스트 POD 남통 40·태창 29). */
function _topPortOf(sec, field) {
  const cnt = {};
  const add = (v) => {
    const p = normPortCode(v);
    if (!p || isPyeongtaekPort(p)) return;
    cnt[p] = (cnt[p] || 0) + 1;
  };
  try {
    const m = ediMapFromRaw(sec);
    if (m) for (const c of Object.values(m)) add(c && c[field]);
  } catch (e) { /* 파싱 실패는 리스트로 넘어간다 */ }
  if (!Object.keys(cnt).length) {
    const rc = sec && sec.records;
    if (rc) for (const r of Object.values(rc)) add(r && r[field]);
  }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '';
}

/** 이번 항차의 구간 — { prev, next }. 없으면 null.
 *  prev = 양하 EDI 출항지(LOC+5) · next = 선적 EDI 다음 기항(LOC+61) ∨ 선적분 목적지 최다(평택 제외). */
export function voyageLegOf(voyage) {
  // 전 항구 — 양하 EDI 출항지(직전 한 항)가 1순위, 없으면 «양하분이 실린 곳»(POL) 최다.
  let prev = '';
  try { prev = normPortCode(ediOriginOf(voyage?.discharge) || ''); } catch (e) { prev = ''; }
  if (isPyeongtaekPort(prev)) prev = '';        // 평택 출항본이 양하 자리에 들어온 항차 — 앞 항구로 못 쓴다
  if (!prev) prev = _topPortOf(voyage?.discharge, 'pol');
  // 다음 항구 — 선적 EDI 다음 기항이 1순위, 없으면 «선적분 목적지»(POD) 최다.
  let next = '';
  try { next = normPortCode(ediNextPortOf(voyage?.loading) || ''); } catch (e) { next = ''; }
  if (isPyeongtaekPort(next)) next = '';
  if (!next) next = _topPortOf(voyage?.loading, 'pod');
  return (prev || next) ? { prev, next } : null;
}

/** 이번 항차의 «평택 다음 항» — **배에 남는 화물이 정본이다.** (검수사 확정 2026-08-23)
 *
 *  검수사 신고: *«KKAK 제가 알기론 인천인듯 한데 앱은 다른곳을 잡습니다»* — 맞았다.
 *  실측 KKAK 2608N 평택 출항본(794대) 안에서 **헤더와 화물이 서로 다른 말을 한다.**
 *    `LOC+61`(다음 기항 헤더) = KRKAN 광양 · 배에 남는 화물 = **인천 429** · 부산 136 · 광양 94
 *  인천행 429대를 싣고 광양으로 갈 수는 없다. 같은 항차 자료에 `KKAK2609SKRINC SI.edi`
 *  (**인천** 선적지시서)가 따로 와 있고 그 인천 출항본에 남는 화물이 광양 270·부산 174 다 —
 *  순서는 평택 → 인천 → 광양 → 부산이 확실하다.
 *
 *  ⚠ 종전 홈 카드는 항로표에서 «평택 자리 +1»을 집었다. **KPX 는 인천이 회항점이라 한 바퀴에
 *    평택을 두 번 기항한다**(올라갈 때 남중국→평택→인천 · 내려올 때 인천→평택→광양→부산).
 *    배열엔 평택이 한 칸뿐이라 방향과 무관하게 언제나 같은 답이 나왔다.
 *    실측 KKAK 네 항차가 방향이 번갈아 나타난다 — 2607N·2608S 는 인천발, 2608N·2609S 는 남중국발.
 *  ⚠ 헤더(LOC+61)·PORT-MIS 차항지·항로표가 **셋 다 광양**이었다. 선사 신고가 그대로 흘러간 것이라
 *    서로 독립된 근거가 아니다. 화물만이 다른 말을 했고 그쪽이 맞았다.
 *
 *  반환 { port, cnt, second, secondCnt, sure, hdr, src }.
 *    sure=false 는 «2등과 차이가 뚜렷하지 않음» — 화면은 단정하지 말고 둘 다 보여야 한다
 *    (XTPG 537W 실측 태창 145 대 남통 107 — 이런 배는 화물로 못 가린다).
 *  ⛔ 시프팅 판정(portsBeforePtk)은 건드리지 않는다 — 그쪽은 계속 항로 사전을 쓴다. */
export function nextPortAfterPtk(voyage, pm) {
  /* ★ 2.26 — **PORT-MIS 차항지가 1순위다.** 검수사 신고로 시작해 실물로 확인됐다.
     실측 2026-08-24 PORT-MIS 엑셀 18열 «차항지» — KMTC OSAKA 이번 기항은 **인천**이다.
     화물로 추정할 필요가 없다. 다만 **입항·출항 두 줄이 서로를 덮던 것**을 같은 판에서
     고친 뒤라야 믿을 수 있다(fbSavePortMisBatch 2.26 — `nextPortOut` 이 그 결과다).
     차항지는 **출항 신고**에 붙는다(이 항을 떠나 어디로 가나) — 그래서 nextPortOut 이 먼저다. */
  const _pmNext = normPortCode((pm && (pm.nextPortOut || pm.nextPort)) || '');
  if (_pmNext && !isPyeongtaekPort(_pmNext)) {
    return { port: _pmNext, basis: 'portmis', cargo: '', cnt: 0, second: '', secondCnt: 0,
             hdr: '', src: 'pm', hdrDisagree: false };
  }
  return _nextPortByCargo(voyage);
}

function _nextPortByCargo(voyage) {
  const pick = (sec) => { try { return ediMapFromRaw(sec); } catch (e) { return null; } };
  //  평택 출항본이 1순위 — 평택 선적분까지 반영된 «떠날 때» 모습이다.
  //  없으면 도착본으로도 같은 답을 낼 수 있다(평택에서 안 내리는 화물 = 배에 남는 화물).
  let m = pick(voyage?.loading), src = 'load';
  if (!m) { m = pick(voyage?.discharge); src = 'disch'; }
  if (!m) return null;
  const cnt = {};
  for (const c of Object.values(m)) {
    const p = normPortCode(c && c.pod);
    if (!p || isPyeongtaekPort(p)) continue;
    cnt[p] = (cnt[p] || 0) + 1;
  }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (!top.length) return null;
  let hdr = '';
  try { hdr = normPortCode(ediNextPortOf(voyage?.loading) || ''); } catch (e) { hdr = ''; }
  const [cargo, n] = top[0];
  const [second, n2] = top[1] || ['', 0];
  //  «뚜렷한가» = 2등의 1.5배 이상. 이 문턱이 규칙의 전부다 — 실측으로 정했다.
  //    KKAK 2608N 인천 429 : 부산 136 → 뚜렷(3.2배). 화물이 헤더를 이긴다 → 인천 ✓
  //    MCSN 632N 신강 344 : 청도 267 → 안 뚜렷(1.29배). 헤더 CNDLC(대련)를 쓴다 ✓
  //      ⚠ 이 배는 **화물 최다가 틀렸다** — 대련은 214대로 3등인데 그것이 다음 항이다.
  //        화물만 믿었으면 신강이라 답했을 것이다. 문턱이 그것을 막는다.
  //    XTPG 537E 태창 145 : 남통 107 → 안 뚜렷, 헤더도 없음 → 단정하지 않고 둘 다 보인다 ✓
  const sure = !second || n >= n2 * 1.5;
  const basis = sure ? 'cargo' : (hdr ? 'header' : 'unsure');
  const port = basis === 'cargo' ? cargo : (basis === 'header' ? hdr : '');
  return { port, basis, cargo, cnt: n, second, secondCnt: n2, hdr, src,
           //  화물이 헤더를 이긴 경우 — 화면이 «자료 헤더는 다르게 적혀 있다»를 말할 수 있게.
           hdrDisagree: !!(hdr && port && hdr !== port) };
}

export function ediMapFromRaw(sec) {
  const t = sec?.raw?.edi?.text;
  if (!t || typeof t !== 'string' || t.length <= 50) return null;
  const parts = t.includes('----- FILE: ') ? t.split(/^----- FILE: .*$/m).filter(x => x && x.trim()) : [t];
  let best = null;
  for (const part of parts) {
    let conts = [];
    try { conts = (parseBAPLIE(part) || {}).containers || []; } catch (e) { conts = []; }
    if (!conts.length) {
      try { conts = (parseAscFile(part) || {}).containers || []; } catch (e) { conts = []; }
    }
    const m = {};
    for (const c of conts) if (c.cn && c.cn.length === 11) m[c.cn] = c;
    if (!best || Object.keys(m).length > Object.keys(best).length) best = m;
  }
  return (best && Object.keys(best).length) ? best : null;
}

// V9.07-03: 선박 전체 적부도용 컨 맵 — ediContainers엔 통과화물이 없다(수집기 등록 항차).
//   raw EDI 전문이 있으면 그것이 단일 진실. 저장본 필드(_slotKey 등)는 병합해 보존하고,
//   raw에 없는 실번호 형식 저장본 키는 구판/가상 잔재로 보고 제외한다(V8.98-04 판정 그대로).
//   PrintHubModal에 있던 로직을 승격 — 인쇄와 편집기가 같은 소스를 쓰게 한다.
export function fullEdiMapOf(sec) {
  const ediMap = sec?.ediContainers || {};
  const rawMap = ediMapFromRaw(sec);
  if (!rawMap) return ediMap;
  const m = { ...rawMap };
  // V9.23-08: raw(BAPLIE)에 없는 실번호라도 리스트(records)나 완료(completed)에 있으면 실재하는 화물이다.
  //   2658W 실측 — 선사가 엑셀 로드리스트로만 준 엠티 14대가 여기서 통째로 버려져
  //   베이상세편집에도 작업패널에도 안 나왔다("대기 14대"인데 "남은 작업 없음").
  //   구판·가상 잔재를 거르려던 조건이 진짜 화물까지 지우고 있었다.
  const onList = sec?.records || {};
  const done = sec?.completed || {};
  for (const [k, v] of Object.entries(ediMap)) {
    if (rawMap[k]) { m[k] = { ...rawMap[k], ...v }; continue; }
    if (!isValidCn(String(k)) || onList[k] || done[k]) m[k] = v;   // V9.57: 단일 소스
  }
  return m;
}

export function computeShiftingFromVoyage(voyage) {
  const mapOf = (sec) => ediMapFromRaw(sec) || sec?.ediContainers || null;
  return computeShiftingMap(mapOf(voyage?.discharge), mapOf(voyage?.loading));
}

// V8.98-03: 쉬프팅 계산 모듈 캐시 — 홈 카드(항차 여러 장)·항차 화면·출력허브가 공유.
//   raw EDI(양하 150KB+선적 150KB) 파싱은 무겁고, Firebase 스냅샷은 records 틱마다 갱신되므로
//   raw 업로드 시각·크기(+ediContainers 개수 폴백)로 서명해 변화 없으면 재파싱하지 않는다.
const _shiftMapCache = new Map();   // voyageKey → { sig, map }
// ══════════════════════════════════════════════════════
// TallyOne 2.08-15: **배정목록 이적이 확정 0이면 예측 시프팅은 허수다** (검수사 확정 2026-08-23)
//
//   > *"만약에 평택항까지 오는 통과분이고 평택항에서 시프팅이 안잡혀 있다면 제경험으로는
//   >   커버 여는데 지장이 없어서 입니다. 배정목록도 주황색이니 확정된 작업입니다."*
//
//   실물(DJCT 0222E) — 예측 1대(SKLU2033860 · 01-06-82 데크 · POD CNSHK)인데 배정표 이적 0모브.
//   «전 항구 양하분»은 아니었다 — 양하 EDI 가 인천 출항본(=평택 직전 기항)이고 평택 출항본에도 같은 자리다.
//   원인은 베이사전 1베이가 커버 **1장**(베이 전체)라 06열 데크까지 커버 위로 센 것 —
//   1베이는 선수라 홀드가 00·01·02 세 칸뿐인데 데크는 00~06 일곱 칸이다.
//   종전엔 «⛔ 불일치»만 쓰고 허수 ◆ 를 그대로 띄웠다(커버 역산 51가지 — 하나로 안 좀혀짐).
//   → 확정 상태에서 이적 0이면 **배정목록이 이긴다.** 예측을 비우되 **왜 비웠는지 화면이 말한다**(3금지 ③).
//   ⚠ 이적이 0 이 아닌 불일치(예: 2대인데 예측 5대)는 어느 것이 진짜인지 못 가리므로 종전 경고 유지.
// ══════════════════════════════════════════════════════

/** 화면·집계용 시프팅 맵 — 확정 대조 우선, 없으면 예측(배정표 확정 이적 0이면 비운다).
 *  ⛔ 작업 카드는 여전히 확정 대조만 쓴다(1.76-05) — 이 함수는 표시·집계용이다. */
export function shiftingMapForDisplay(voyageKey, voyage, dictEntry) {
  let cmp = null;
  try { cmp = computeShiftingMapCached(voyageKey, voyage); } catch (e) { cmp = null; }
  if (cmp && Object.keys(cmp).length) return cmp;              // 선적 EDI 있음 = 확정값
  const pred = predictShiftingFromVoyage(voyage, dictEntry) || {};
  const n = Object.keys(pred).length;
  if (!n) return pred;
  let tc = null;
  try { tc = shiftingTruthCheck(voyage, n); } catch (e) { tc = null; }
  if (!(tc && !tc.pending && tc.truth === 0)) return pred;     // 대조 불가·보류·이적>0 → 종전 그대로
  // ★ 검수사 지시 2026-08-23 — *"그래도 의심은 지우지 말고 커버영역 알림을 띄워주세요."*
  //   작업 대수에서만 뺀다. **어느 커버 어느 자리를 의심했는지는 그대로 넘겨** 화면이 알린다.
  const susp = Object.entries(pred).map(([cn, v]) => ({
    cn, pos: v?.pos || v?.from || '', bay: v?.bay || '', row: v?.row || '', tier: v?.tier || '',
    pod: v?.pod || '', iso: v?.iso || '', why: v?._why || '' }));
  const out = {};
  try {
    Object.defineProperty(out, '_meta', {
      value: { ...(pred._meta || {}), truthZero: n, suspects: susp }, enumerable: false });
  } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
  return out;
}

export function computeShiftingMapCached(voyageKey, voyage) {
  if (!voyage) return {};
  const d = voyage?.discharge, l = voyage?.loading;
  const sig = [
    d?.raw?.edi?.uploadedAt || 0, d?.raw?.edi?.sizeBytes || 0,
    l?.raw?.edi?.uploadedAt || 0, l?.raw?.edi?.sizeBytes || 0,
    Object.keys(d?.ediContainers || {}).length, Object.keys(l?.ediContainers || {}).length,
  ].join('|');
  const key = voyageKey || 'unknown';
  const hit = _shiftMapCache.get(key);
  if (hit && hit.sig === sig) return hit.map;
  const map = computeShiftingFromVoyage(voyage);
  if (_shiftMapCache.size > 60) _shiftMapCache.clear();   // 폭주 방지(항차 수보다 넉넉)
  _shiftMapCache.set(key, { sig, map });
  return map;
}


// ── V9.27: 물리 불가 좌표 차단 — 40/45피트는 짝수 베이에만 (STSE 2658W 사고 근원) ──
//   홀수 베이 단독 슬롯은 20피트 자리다. 40/45ft를 홀수 베이에 기록하는 건 "코끼리를
//   냉장고에 넣는" 일 — 경고가 아니라 차단한다 (사용자 확정 2026-07-31).
//   어제 강제 입력 11대 전수가 이 위반이었고, 전 항차 감사에서 그 외 위반 0건.
export function bayParityError(c, bay) {
  const bn = parseInt(bay, 10);
  if (!Number.isFinite(bn) || bn % 2 === 0) return null;
  const lbl = isoToLabel((c && (c.iso || c.tp)) || '') || '';
  if (lbl.startsWith('40') || lbl.startsWith('45')) {
    return `${lbl} 컨테이너는 홀수 베이 ${bn}에 놓을 수 없습니다.\n40/45피트는 짝수 베이에 놓여 앞뒤 홀수 자리를 차지합니다 — 물리적으로 불가능한 자리입니다.`;
  }
  return null;
}


// ── V9.57: 40/45피트 위 20피트 판정 단일 소스 (감사 F8) ──
//   slotAdjacencyError 내부에 있던 강한 판정(자기 베이 하단 받침 확인 → 없으면 옆 짝수 베이
//   하단의 40/45 확인)을 분리 export — planEditCore.validate의 약식(같은 베이만) 판정을 대체해
//   중복 제거. 반환: 위반이면 { below(받침 컨), bay, tier, label }, 아니면 null.
export function under40Support(c, bay, row, tier, others) {
  const bn = parseInt(bay, 10);
  const p2 = (x) => String(x ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
  const tN = parseInt(p2(tier), 10);
  if (!Number.isFinite(bn) || !Number.isFinite(tN) || tN - 2 <= 0) return null;
  const lbl = isoToLabel((c && (c.iso || c.tp)) || '') || '';
  if (!lbl.startsWith('20')) return null;
  const R = p2(row), TB = String(tN - 2).padStart(2, '0');
  const at = (b2) => (others || []).find((o) =>
    o && o.cn !== (c && c.cn) && o.bay != null && o.bay !== '' &&
    parseInt(o.bay, 10) === b2 && p2(o.row) === R && p2(o.tier) === TB);
  const same = at(bn);
  if (same) {
    // 자기 베이에 받침이 있으면 그 받침만 본다 (40/45면 위반, 20이면 정상 적재)
    const sl = isoToLabel(same.iso || same.tp || '') || '';
    return (sl.startsWith('40') || sl.startsWith('45')) ? { below: same, bay: bn, tier: TB, label: sl } : null;
  }
  for (const b2 of [bn - 1, bn + 1]) {
    if (b2 <= 0) continue;
    const u = at(b2);
    if (u) {
      const ul = isoToLabel(u.iso || u.tp || '') || '';
      if (ul.startsWith('40') || ul.startsWith('45')) return { below: u, bay: b2, tier: TB, label: ul };
    }
  }
  return null;
}


// ── V9.28-04: 인접 슬롯 물리 검사 — 40ft는 앞뒤 홀수 슬롯 두 개를 차지한다 (STSE 실측:
//   FBIU5086535를 20-03-82에 받아줬는데 19-03-82엔 이미 20ft가 실려 있었다 — 물리 충돌) ──
//   others: 유효 좌표(bay/row/tier)가 실린 컨 배열 (자기 자신 제외하고 호출)
export function slotAdjacencyError(c, bay, row, tier, others) {
  const bn = parseInt(bay, 10);
  if (!Number.isFinite(bn)) return null;
  const p2 = (x) => String(x ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
  const R = p2(row), T = p2(tier);
  const lbl = isoToLabel((c && (c.iso || c.tp)) || '') || '';
  const at = (b2) => (others || []).find((o) => {
    if (!o || o.cn === c.cn || !o.bay || !o.tier) return false;
    return parseInt(o.bay, 10) === b2 && p2(o.row) === R && p2(o.tier) === T;
  });
  if ((lbl.startsWith('40') || lbl.startsWith('45')) && bn % 2 === 0) {
    for (const b2 of [bn - 1, bn + 1]) {
      const occ = b2 > 0 ? at(b2) : null;
      if (occ) return `40/45피트는 ${bn}베이에 놓이면 앞뒤 ${bn - 1}·${bn + 1}베이 자리까지 차지합니다.\n그런데 ${b2}-${R}-${T}에 이미 ${occ.cn}이(가) 있습니다 — 물리적으로 불가능합니다.`;
    }
  }
  if (lbl.startsWith('20') && bn % 2 === 1) {
    for (const b2 of [bn - 1, bn + 1]) {
      const occ = b2 > 0 ? at(b2) : null;
      if (occ) {
        const ol = isoToLabel(occ.iso || occ.tp || '') || '';
        if (ol.startsWith('40') || ol.startsWith('45')) return `${bn}-${R}-${T} 자리는 옆 ${b2}베이의 ${occ.cn}(${ol})이(가) 차지하고 있습니다 — 놓을 수 없습니다.`;
      }
    }
  }
  // V9.28-04 → V9.57: 40ft 위 20ft 불가(콘 홀 없음)는 공용 판정 under40Support로 일원화
  //   (planEditCore.validate와 단일 소스). 홀수 베이 제한을 풀어 자기 베이 하단이 40/45인
  //   비정상 상태도 잡는다 — 기존보다 정확해지는 방향만.
  const u40 = under40Support(c, bay, row, tier, others);
  if (u40) return `아래 단(${u40.bay}-${R}-${u40.tier})이 40/45피트 ${u40.below.cn}입니다 — 40피트 위에는 20피트를 올릴 수 없습니다 (콘 홀 없음).`;
  return null;
}


// ── V9.28-05: POD 구역 검사 — 오선적 맞바꿈의 세 번째 그물 (STSE 실측: FBIU CNTAO가
//   CNSHD 구역(20베이)에, SEGU CNSHD가 CNTAO 구역(24)에 — 규격 2번+포트 2번 기회를 전부 놓쳤던 사고) ──
//   같은 베이·같은 구역(데크/홀드)의 다수 POD와 다르면 경고 재료 반환. 차단 아님 — 확인 후 허용.
export function podZoneMismatch(c, bay, tier, others) {
  const pod = String((c && c.pod) || '').trim();
  if (!pod) return null;
  const bn = parseInt(bay, 10), tn = parseInt(tier, 10);
  if (!Number.isFinite(bn) || !Number.isFinite(tn)) return null;
  const deck = tn >= 80;
  const cnt = {};
  for (const o of (others || [])) {
    if (!o || o.cn === c.cn || !o.bay || !o.tier || !o.pod) continue;
    const ob = parseInt(o.bay, 10), ot = parseInt(o.tier, 10);
    if (!Number.isFinite(ob) || !Number.isFinite(ot)) continue;
    // 페어(양옆 홀수 포함)까지 같은 구역으로 본다 — 40ft 구역은 짝수 베이에 걸쳐 있다
    if (Math.abs(ob - bn) > 1) continue;
    if ((ot >= 80) !== deck) continue;
    const p = String(o.pod).trim();
    if (p) cnt[p] = (cnt[p] || 0) + 1;
  }
  let zone = '', max = 0, total = 0;
  for (const [p, n] of Object.entries(cnt)) { total += n; if (n > max) { max = n; zone = p; } }
  if (!zone || total < 3) return null;   // 구역 판단 근거 부족하면 침묵
  if (zone === pod) return null;
  return { zone, pod, count: max };
}

// TallyOne 1.10-01: VoyagePage에서 승격 — PrintHubModal과 공용 (인쇄 허브 마커 유실 수리)
// V9.03: 긴급/수화물 마커 주입 — 예보(카톡·연태훼리 CLL 메일)에 담긴 컨번호를 렌더 시점에
//   c.urgent/c.lugg 플래그로 붙인다. 데이터(ediContainers)에 쓰지 않으므로 EDI가 예보보다
//   늦게 오거나(일반 흐름) 갱신·재등록돼도 마커가 유지된다.
export function tagForecastMarks(list, urgentSet, luggSet, luggSeals) {
  if ((!urgentSet || !urgentSet.size) && (!luggSet || !luggSet.size)) return list;
  return list.map(c => {
    if (!c || !c.cn) return c;
    const u = urgentSet.has(c.cn);
    const l = luggSet.has(c.cn);
    if (!u && !l) return c;
    const t = { ...c };
    if (u) t.urgent = true;
    if (l) {
      t.lugg = true;
      if (luggSeals && luggSeals[c.cn]) t.luggSeal = luggSeals[c.cn];
    }
    return t;
  });
}

// ─── TallyOne 1.22: 도선(입항) → 작업개시 소요 (검수사 확정 2026-08-07) ───
//   "PCTC는 1시간 30분, PNCT는 2시간 정도 걸립니다. 그걸 계산해서 작업예정시간을 표기하시면 됩니다."
//   ⚠ 도선 시각은 **입항 시각**이지 작업시간이 아니다. planSrc='pilot' 인 planDate 를
//     작업시간처럼 보여준 것이 오답 1786057401908("도선이 08시 30분인데 작업시간이 08시 30분 가능한가요?")의 뿌리.
export const PILOT_TO_WORK_MIN = { PCTC: 90, PNCT: 120 };
export function pilotToWorkMin(pier) {
  return PILOT_TO_WORK_MIN[String(pier || '').toUpperCase().trim()] ?? 120;   // 부두 미상이면 보수적으로 2시간
}
/** "2026-08-08 08:30 ~ 2026-08-08 21:00" → Date(입항) */
export function parsePlanStart(planDate) {
  const m = String(planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0) : null;
}
/**
 * 작업개시 예정시각.
 *
 * ── TallyOne 1.40-01: **오프셋은 수집기가 이미 더했다 — 앱은 다시 더하지 않는다.** ──
 *   2026-08-07 같은 날 같은 지시("PCTC 1시간 30분 · PNCT 2시간")를 수집기(_to_work_start)와
 *   앱(이 함수) **양쪽에 각각** 넣었다. 그래서 도선 항차는 오프셋이 두 번 붙었다.
 *   실측 2026-08-10 — RZOR: 도선 07:30 → 수집기 planDate 09:30(정답) → 앱 표시 11:30(2시간 초과).
 *   그날 작업 4척(ATPR·DXQD·OBWH·RZOR)이 전부 같은 증상이었다.
 *   검수사 지적: "작업시작만 2:00과 30 더하는것만 틀립니다."
 *   ⚠ planDate 앞자리는 **어떤 출처든 이미 작업시작**이다 — 수집기 decide_plan 의 모든 반환 경로가
 *     환산해서 넣는다(도선 +90/+120 · PORT-MIS +30 · 메일 +0 · 배정 +0). 여기서 또 더하면 무조건 틀린다.
 *   도선 **입항 원본** 시각이 필요하면 pilot_forecast.nextArr 를 세 번째 인자로 넘긴다(표시용).
 * @returns {{start: Date|null, basis: 'pilot'|'plan'|null, arr: Date|null, leadMin: number}}
 */
export function planWorkStart(info = {}, pierOverride = null, pilotArr = null) {
  const start = parsePlanStart(info.planDate);
  const pier = pierOverride || info.pier || getPierFromBerth(info.berth) || '';
  const src = String(info.planSrc || '').split('|')[0];
  if (!start) return { start: null, basis: null, arr: null, leadMin: 0 };
  const arrMs = pilotArr ? parsePortMisDateTime(pilotArr) : null;
  const arr = arrMs != null ? new Date(arrMs) : null;
  const leadMin = arr
    ? Math.round((start.getTime() - arr.getTime()) / 60000)   // 실제 차이(추정 상수가 아니라 데이터)
    : (src === 'pilot' ? pilotToWorkMin(pier) : 0);
  return { start, basis: src === 'pilot' ? 'pilot' : 'plan', arr, leadMin };
}

// ── TallyOne 1.38: 컨 위치 판정 단일 진입점 ──────────────────────────────────
//   왜 만들었나 — 같은 판단을 **여덟 곳이 각자** 되풀이하고 있었고 조건이 조금씩 달랐다.
//   (VoyagePage / SearchPanel / VoyageSummaryCard / WorkClosingChecklist /
//    PrintHubModal / ChiefBayEdit / TestLabModal / BayPlan)
//   어긋난 실제 사고:
//     · 1.35 — SearchPanel 만 승격을 안 해 같은 컨이 한 화면에선 배정, 다른 화면에선 미배정이었다.
//     · 2026-08-09 마감 점검 — 클로드가 records 우선으로 읽어 멀쩡한 자료를 세 번 사고로 오판했다.
//   ⚠ 순서를 바꾸지 마라. 이것이 화면이 그리는 순서다.
//     ① records.bay_actual  실체 위치(선적확인 때 생김). '__' 로 시작하면 임시창고 — 자리 없음.
//     ② ediContainers.bay   EDI 가 진실 (M6.94.32). 값이 '' 가 아니면 이것을 쓴다.
//     ③ records.bay         위 둘이 없을 때만.
/** @returns {{bay:string,row:string,tier:string,src:'actual'|'edi'|'rec'|'none',inStorage:boolean}} */
// ── TallyOne 1.50: 컨이 지나온 자리 ──────────────────────────────
// 검수사 확정 2026-08-11 — *"처음에 어디 있었는지 부터 최종선적위치 까지 경로를 갖고 있어야 합니다."*
//   *"사용자가 특정 컨테이너가 여기에 있어야 하는데 어디로 갔지 하고 물으면
//     어디 선적때 어떤 컨테이너로 바뀌어서 어디로 이동 시켰습니다 라고 알려 줘야 합니다."*
//
// moves 가 있으면 그대로 쓴다. 없는 옛 컨은 남아 있는 세 값(orig · actual · 현재)으로
//   **세 점짜리 경로를 복원**한다 — 사유는 기록이 없으니 비운다(_guess 로 표시).
const _mvPos = (b, r, t) => (b ? `${String(parseInt(b, 10)).padStart(2, '0')}-${r}-${t}` : '미배정');
// 숫자 끝자리 받침 — "06으로/02로", "1308이/2722가". 현장 문장이 어색하면 안 읽힌다.
const _JONG = { '0': true, '1': true, '3': true, '6': true, '7': true, '8': true, '2': false, '4': false, '5': false, '9': false };
const _ro = (t) => (_JONG[String(t).slice(-1)] ? '으로' : '로');
const _iga = (t) => (_JONG[String(t).slice(-1)] ? '이' : '가');

export function buildMovePath(c) {
  if (!c) return [];
  const mv = Array.isArray(c.moves) ? c.moves.filter(m => m && m.to) : [];
  if (mv.length) return mv;
  const out = [];
  const orig = _mvPos(c.bay_orig, c.row_orig, c.tier_orig);
  const ba = String(c.bay_actual ?? '');
  const act = (ba && !ba.startsWith('__')) ? _mvPos(c.bay_actual, c.row_actual, c.tier_actual) : '';
  const now = _mvPos(c.bay, c.row, c.tier);
  let prev = orig;
  if (act && act !== prev) { out.push({ from: prev, to: act, why: '', by: '', at: c.actual_at || 0, byCn: '', _guess: true }); prev = act; }
  if (now && now !== prev) { out.push({ from: prev, to: now, why: '', by: '', at: 0, byCn: '', _guess: true }); }
  return out;
}

// TallyOne 1.54: **경로(moves)에 적히는 창고 표기.** firebase.js 의 `STORAGE_TXT` 와 같은 글자여야 한다.
//   여기 값을 한 벌 더 적는 이유 — firebase.js 가 utils.js 를 부르므로(firebase.js 상단 import)
//   utils.js 가 firebase.js 를 부르면 순환이 된다. 글자를 바꿀 일이 생기면 두 곳을 함께 고친다.
const _MV_STORAGE = '창고';

// 사유 낱말은 검수사가 쓰는 말로. 클로드가 지어낸 용어는 현장에서 안 통한다.
export const MOVE_WHY_KO = {
  move: '자리를 옮김',
  actual: '실제 실린 자리로 지정',
  displaced: '자리를 뺏겨 밀려남',
  unassign: '미배정 처리',
  // TallyOne 1.54: **이동이 아니다.** 이름표가 내려온 것이고 실물은 처음부터 창고에 있었다.
  //   검수사 확정 2026-08-12 — *"애초부터 컨테이너는 창고에 있었습니다. 분명 이름만 빌려줬던 것입니다."*
  planTaken: '계획 자리를 내줌 (실물은 창고)',
  cancel: '완료 취소로 계획 자리 복귀',
  restore: '원래 계획 자리로 되돌림',
  loaded: '선적확인',
  '': '사유 기록 없음',
};

export function movePathOrigin(c) {
  const p = buildMovePath(c);
  // 1.54: 첫 줄이 창고에서 시작하면(계획 기록 없이 보관함으로 들어갔던 컨) 그것은 출발지가 아니다.
  //   "원래 창고 계획이었습니다" 는 거짓말이 된다 — 계획 좌표가 남아 있으면 그것을 쓴다.
  if (p.length && String(p[0].from) !== _MV_STORAGE) return p[0].from;
  const og = _mvPos(c?.bay_orig, c?.row_orig, c?.tier_orig);
  if (og !== '미배정') return og;
  return p.length ? p[0].from : og;
}

// "어디 갔어?" 답변 — 검수사가 원한 모양 그대로:
//   *"어디 선적때 어떤 컨테이너로 바뀌어서 어디로 이동 시켰습니다."*
//
// ── TallyOne 1.54: **이력이 거짓말을 하고 있었다.** (검수사 확정 2026-08-12) ──
//   실측 DXQD 2631W 선적 335대 — 밀어내기 82회 중 **진짜 충돌 0회, 헛충돌 82회.**
//   TBJU2387722 는 이력에 다섯 번 튕긴 것으로 남았는데 **크레인은 05-03-82 에 한 번 놓았을 뿐이다.**
//   검수사 정정 — *"실제 이동은 마지막 한 줄뿐입니다."*
//   *"호텔을 예약하고는 있지만 실제 입실은 안 한 상태로 보면 됩니다. 모든 자리가."*
//   *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
//   → **실물이 움직인 줄과 이름표만 내려온 줄을 눈으로 갈라 놓는다.** 한 목록에 섞이면
//     읽는 사람은 전부 크레인이 옮긴 것으로 읽는다 — *"이력이 없으면 알려주기 힘듭니다"* 라고 해서
//     넣은 기록이니, 있는 것보다 **맞는 것**이 먼저다.
//   ⚠ 게이트 먼저 — 이름표 줄('planTaken')이 하나도 없으면 종전 그대로 한 목록으로 낸다(회귀 없음).
export function describeMovePath(c, isCompleted = false) {
  if (!c) return '';
  const path = buildMovePath(c).filter(m => m.why !== 'loaded' || m.from !== m.to);
  const cur = _mvPos(c.bay, c.row, c.tier);
  const orig = movePathOrigin(c);
  // 1.50: 자리 없이 완료된 건은 그 사실을 드러낸다 — 오늘 TBJU2308214 가 그랬다
  //   (선적확인은 찍혔는데 좌표가 없어 카운터는 42/42인데 그림은 41칸).
  const tail = cur === '미배정'
    ? (isCompleted ? '⚠ 지금 자리가 없는데 선적확인만 되어 있습니다 — 자리를 지정해야 합니다.' : '지금은 자리가 없습니다 (미배정).')
    : (isCompleted ? `최종 ${cur}에 선적확인했습니다.` : `지금은 ${cur}에 있습니다.`);
  if (!path.length) {
    return `${c.cn} — 계획 자리 ${orig} 그대로입니다. 옮긴 적 없습니다.\n${tail}`;
  }
  // 이 컨이 그때 창고에 있었는가 — 줄을 앞에서부터 따라가며 켜고 끈다.
  //   창고에 있는 동안의 'move'/'actual' 은 **실물을 옮긴 것이 아니라 계획을 고쳐 쓴 것**이다.
  let inStg = false;
  const rows = path.map(m => {
    const fromStorage = String(m.from) === _MV_STORAGE;
    const toStorage = String(m.to) === _MV_STORAGE;
    const wasInStg = inStg;
    if (toStorage) inStg = true;
    else if (fromStorage) inStg = false;
    const to = (m.to === '미배정' || toStorage) ? String(m.to) : `${m.to}${_ro(m.to)}`;
    let line;
    switch (m.why) {
      // 1.54: 이름표가 내려온 사건. 실물은 안 움직였다 — 문장이 그렇게 읽혀야 한다.
      case 'planTaken': {
        const b4 = m.byCn ? String(m.byCn).slice(-4) : '';
        line = b4
          ? `${m.from}는 ${b4}${_iga(b4)} 가져갔습니다. 실물은 창고에 그대로 있었습니다.`
          : `${m.from} 계획 자리를 내줬습니다. 실물은 창고에 그대로 있었습니다.`;
        return { m, line, nameOnly: true };   // byCn 꼬리말을 또 붙이지 않는다 — 문장에 이미 들어 있다.
      }
      case 'displaced': line = (m.to === '미배정') ? '자리를 잃고 미배정이 됐습니다.' : `${to} 밀려났습니다.`; break;
      case 'unassign':  line = `자리를 비웠습니다 (미배정).`; break;
      case 'cancel':    line = `선적확인을 취소해 ${to} 되돌렸습니다.`; break;
      case 'restore':   line = `원래 계획 자리 ${to} 되돌렸습니다.`; break;
      // 1.54: 창고에서 꺼내 실은 경우도 마지막은 "실었습니다" 한 줄이다. 좌표 조사는 '에'로 통일한다.
      case 'loaded':    line = `${m.to}에 실었습니다.`; break;
      case 'actual':
      case 'move':
        if (m.to === '미배정') { line = '자리를 비웠습니다 (미배정).'; break; }
        // 창고에 있는 동안 좌표를 바꾼 것은 **계획을 고친 것**이지 실물을 옮긴 것이 아니다.
        line = wasInStg ? `${to} 계획을 바꿨습니다 (실물은 창고).` : `${to} 옮겼습니다.`;
        break;
      default:          line = (m.to === '미배정')
                          ? '자리를 잃었습니다 (미배정). (사유 기록 없음 — 이력 도입 전)'
                          : `${to} 옮겼습니다. (사유 기록 없음 — 이력 도입 전)`; break;
    }
    if (m.byCn) { const b4 = String(m.byCn).slice(-4); line += ` 그 자리엔 ${b4}${_iga(b4)} 실렸습니다.`; }
    return { m, line, nameOnly: wasInStg && (m.why === 'move' || m.why === 'actual') };
  });

  const head = `${c.cn} — 원래 ${orig} 계획이었습니다.`;
  const nameRows = rows.filter(r => r.nameOnly);
  // 게이트 — 이름표 줄이 없으면 종전 모양 그대로.
  if (!nameRows.length) return [head, ...rows.map(r => r.line), tail].join('\n');

  const realRows = rows.filter(r => !r.nameOnly);
  const out = [head, ''];
  if (realRows.length) {
    out.push(`■ 실물이 움직인 것 — ${realRows.length}번`);
    realRows.forEach(r => out.push(`· ${r.line}`));
  } else {
    out.push('■ 실물이 움직인 것 — 없습니다. 처음부터 창고에 있었습니다.');
  }
  out.push('', `■ 이름이 걸렸던 자리 — ${nameRows.length}곳 (실물은 안 움직였습니다)`);
  nameRows.forEach(r => out.push(`· ${r.line}`));
  out.push('', tail);
  return out.join('\n');
}

// TallyOne 1.54: **시퀀스 항차에서 자리 주인을 밀어낼 때 물을 문구 — 한 벌만 둔다.**
//   `fbReassignContainerPosition` 이 `{ ok:false, needConfirm:'seqFull', … }` 로 돌아설 때
//   호출부(SearchPanel·ContainerDetailModal·BigResultCard·GuidedWorkPanel·RestoreOrigButton·PositionEditModal)가
//   전부 이 문구로 묻는다. 여섯 곳이 각자 말을 지어내면 같은 상황이 화면마다 달리 읽힌다.
//   검수사 원문 — *"다만 시퀀스 작업일 때는 그 자리 주인이 될 수 있습니다. 특별한 사정이 없는 한."*
export function seqFullConfirmText(res) {
  if (!res) return '';
  const t = res.target || {};
  const pos = t.bay ? `${String(parseInt(t.bay, 10)).padStart(2, '0')}-${t.row}-${t.tier}` : '그 자리';
  const cns = (res.seqConflict || []).map(x => String(x).slice(-4));
  const who = cns.length > 1 ? `${cns.join(', ')} (${cns.length}대)` : (cns[0] || String(res.displaced || '').slice(-4));
  return `시퀀스 작업입니다.\n${pos} 주인 ${who}(풀)의 이름표를 내리고 넣을까요?\n\n넣으면 그 컨은 몸만 창고로 갑니다 — 계획 자리 ${pos} 는 그대로 남습니다.`;
}

// ── TallyOne 1.51: LUGGAGE (여객 수하물 컨테이너) ──────────────
// 검수사 확정 2026-08-11 — *"그선박은 항상 양하에 20피트 1개의 엠티를 실고 옵니다.
//   그 컨넘버를 기억하고 그게 있다면 매칭 정상에 LUGGAGE 1을 표시하면 됩니다."*
//
// 왜 필요한가 — RZOR 양하 카드가 「부분 EDI 169」로 떴다(평택 170 · 매칭 169).
//   차이 1대가 이 수하물 컨이고 **원래 EDI로 오지 않는 물건**인데, 판정이 개수만 비교해서
//   *"자료가 덜 온 것"* 처럼 보였다. 검수사 지적 — *"부분EDI로 표기하면 확정이 아닌걸로 볼수있습니다."*
//
// 실물 확인(검수사 제공 양하리스트 2건):
//   123.xls(082E)  SPSU2019220  22GP  M-B/L HTFR26V082E004  B/L TYPE E  seal H42943
//   456.xls(083E)  SPSU2019220  22GP  M-B/L HTFR26V083E004  B/L TYPE E  seal H42876
//   → **번호가 같고 씰만 바뀐다.** 선적 요약에도 독립 항목이다(`*LUGGAGE 20D X 1` · `LUG-1TEU`).
//
// ⚠ 되풀이 금지 — 클로드가 아카이브의 `SAWTBP004~009` 를 보고 *"매 항차 다른 번호"* →
//   *"번호 형식이 표준 아닌 것으로 거르자"* 고 제안했다. **틀렸다.** 진짜 LUGGAGE 는 고정 번호이고
//   정식 형식(SPS+U+7자리)이다. 실물을 받아 보고서야 드러났다. **번호로 기억한다.**
export const LUGGAGE_CNS = new Set(['SPSU2019220']);
export function isLuggageCn(cn) {
  return LUGGAGE_CNS.has(String(cn || '').trim().toUpperCase());
}

// TallyOne 1.52: **번호를 기억하는 게 아니라 「이 배는 항상 몇 대」를 기억한다.**
//   1.51 은 컨번호(SPSU2019220)로 잡았는데 **번호가 항차마다 바뀐다** —
//     082E `SPSU2019220` · 086E `SAWTBP006` · 아카이브 `SAWTBP004·005·008·009`.
//   그래서 086E 에서 안 걸렸다(검수사 지적 2026-08-12, 화면 그대로 「부분 EDI 169」).
//   검수사 확정 — *"170 169 LUG1이 맞습니다."* · *"그선박은 항상 양하에 20피트 1개의 엠티를 실고 옵니다."*
//   → 선박이 상시로 싣고 오는 대수를 기억하고, 리스트−EDI 차이가 그 안이면 LUGGAGE 로 본다.
//   ⚠ LUGGAGE 는 **양하 개수에 포함되지 않는다**(검수사 확정) — 컨RORO·벌크와 반대다.
export const SHIP_LUGGAGE = { RZOR: 1 };

// V8.10 확립 → 1.56-06 단일 소스화: **해치커버 계산·보고를 하지 않는 선박.**
//   종전엔 GuidedWorkPanel·WorkReportModal 이 같은 정규식을 복제해 들고 있었다(한쪽만 고치면 갈라진다).
//   TMPZ = 자동(유압식) · TNJP·RZOR·OBWH(검수사 확정 2026-06-19)
//   ATPR = 자동 — 검수사 확정 2026-08-12: "ATPR은 해치커버 자동이라 커버 열고 다음을 체크하지 않습니다."
//   이 선박들은 해치 프롬프트·장수 계산·커버 보고를 건너뛰고, 대신 주야간 작업갯수를 기록한다.
export const HATCH_SKIP_RE = /TMPZ|TNJP|RZOR|OBWH|ATPR/i;
export function isHatchSkipShipInfo(info) {
  return HATCH_SKIP_RE.test(`${info?.vsl || ''} ${info?.vslFull || ''}`);
}
export function shipLuggageCount(voyageKey) {
  const code = String(voyageKey || '').split('_')[0].toUpperCase();
  return SHIP_LUGGAGE[code] || 0;
}

export function effectivePos(c) {
  if (!c) return { bay: '', row: '', tier: '', src: 'none', inStorage: false };
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const ba = s(c.bay_actual);
  if (ba.startsWith('__')) return { bay: '', row: '', tier: '', src: 'none', inStorage: true };
  if (ba && s(c.row_actual) && s(c.tier_actual)) {
    return { bay: ba, row: s(c.row_actual), tier: s(c.tier_actual), src: 'actual', inStorage: false };
  }
  //   _bay_planned 가 있으면 이미 상위에서 승격된 객체다 — 그 값(c.bay)이 곧 EDI 자리다.
  const eb = s(c._edi_bay !== undefined ? c._edi_bay : c.bay);
  if (eb) return { bay: eb, row: s(c._edi_row !== undefined ? c._edi_row : c.row),
                   tier: s(c._edi_tier !== undefined ? c._edi_tier : c.tier), src: 'edi', inStorage: false };
  return { bay: s(c.bay), row: s(c.row), tier: s(c.tier), src: s(c.bay) ? 'rec' : 'none', inStorage: false };
}

// ── TallyOne 1.55: 칸(slot)은 컨이 아니다 ────────────────────────────────
//   검수사 확정 2026-08-12 — *"컨테이너가 빠져야 하는데 자리가 빠진 이유
//   (손님이 나가야 하는데 방이 나가버린 상황). 카고플랜은 변함이 없어야 한다."*
//   종전 `slotsByBay`(SearchPanel)는 **컨 목록을 그대로 자리 항목으로 push** 했다.
//   그래서 ① 같은 칸이 두 번(창고 간 계획 주인 + 실린 컨) ② 다 찬 베이에 「남은 N자리」
//   ③ 계획 주인이 옮겨 가면 칸이 통째로 소멸 ④ remain===0 으로 베이 잠김
//   ⑤ 베이를 끝내도 화면이 안 넘어감 — 다섯 증상이 한 줄에서 나왔다.
//   칸의 정본은 **계획 좌표 ∪ 원계획(_orig) 좌표**다. 컨이 어디로 가든 칸은 남는다.
//   실측 검증(DXQD 2631W): 15개 베이 전 구간 720건 대조 — 선사 원본 칸과 불일치 0.
export function buildSlotUniverse(list, filter) {
  const m = {};
  const add = (b, r, t) => {
    const n = parseInt(b, 10);
    if (!Number.isFinite(n) || !r || !t) return;
    const bb = String(n);
    if (!m[bb]) m[bb] = new Map();
    m[bb].set(`${r}-${t}`, { bay: bb, row: String(r), tier: String(t) });
  };
  for (const c of (list || [])) {
    if (!c) continue;
    if (filter && !filter(c)) continue;
    add(c._edi_bay !== undefined ? c._edi_bay : c.bay,
        c._edi_row !== undefined ? c._edi_row : c.row,
        c._edi_tier !== undefined ? c._edi_tier : c.tier);
    add(c.bay_orig, c.row_orig, c.tier_orig);
    // 계획에 없던 칸에 실제로 실린 경우도 칸이다 — 실물이 있는 자리를 목록에서 빼면 안 된다.
    //   실측 2026-08-12: 이 줄이 없으면 옮겨 실린 칸(예 19-04-82)이 목록에서 사라진다.
    //   창고(`__`)는 자리가 아니므로 제외한다.
    if (c.bay_actual !== undefined && c.bay_actual !== null && !String(c.bay_actual).startsWith('__')) {
      add(c.bay_actual, c.row_actual, c.tier_actual);
    }
  }
  const out = {};
  for (const b of Object.keys(m)) {
    out[b] = [...m[b].values()].sort((x, y) =>
      (parseInt(x.tier, 10) - parseInt(y.tier, 10)) || (parseInt(x.row, 10) - parseInt(y.row, 10)));
  }
  return out;
}

// 칸 점유 맵 — "bay/row/tier" → { cn, done }. 위치 판정은 effectivePos 하나로 통일한다.
//   같은 칸에 둘이 걸리면 **완료된 쪽이 이긴다**(실물이 이름표를 이긴다).
export function buildOccupancy(list, isDone) {
  const occ = new Map();
  for (const c of (list || [])) {
    if (!c) continue;
    const p = effectivePos(c);
    if (!p.bay || !p.row || !p.tier) continue;
    const n = parseInt(p.bay, 10);
    const k = `${Number.isFinite(n) ? n : p.bay}/${p.row}/${p.tier}`;
    const done = isDone ? !!isDone(c) : !!c._comp;
    const prev = occ.get(k);
    if (!prev || (done && !prev.done)) occ.set(k, { cn: c.cn, done });
  }
  return occ;
}

/** 위치 키 — 베이는 정수 정규화("038"→"38"). 자리가 없으면 '' */
export function posKey(c) {
  const p = effectivePos(c);
  if (!p.bay || !p.row || !p.tier) return '';
  const n = parseInt(p.bay, 10);
  return `${Number.isFinite(n) ? n : p.bay}/${p.row}/${p.tier}`;
}
