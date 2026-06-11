// 공통 유틸리티 — V48 (2026.05.09 / M4.9e)
export const APP_VERSION = 'V7.90';
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
  if (!c || !c.bay) return '';
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
// 위치를 한국어 음성으로 ("십육번 베이 공일에 팔육")
export const spellPos = (c) => {
  if (!c || !c.bay) return '';
  const bayN = parseInt(normalizeBay(c.bay), 10);
  if (isNaN(bayN)) return '';
  return `${sinoKorean(bayN)}번 베이 ${spellDigits(c.row)}에 ${spellDigits(c.tier)}`;
};
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
  const p = String(iso).toUpperCase().trim().replace(/\s+/g, '');

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
    if (/^458[25]$/.test(p)) return '40RF';    // 4582/4585 = RF
    if (/^459/.test(p)) return '40OT';
    return '40HC';   // 4500, 4510, 4530 등
  }
  // === 46XX (4로 시작 = 40피트, 잘못된 표기) ===
  // M3.6: ISO 6346 표준상 4XXX는 무조건 40피트. 45피트는 L 시작이어야 함.
  if (/^46/.test(p)) {
    return '40HC';
  }
  // 알파벳 형식: 4로 시작하면 무조건 40피트
  //   45RF/45HC/45GP (신표기) → 모두 40피트 (4=40ft 원칙)
  //   45R0/45R1/45G0/45G1 (ISO 6346) → 40HC/40RF
  if (/^45RF/.test(p)) return '40RF';
  if (/^45HC/.test(p)) return '40HC';
  if (/^45GP/.test(p)) return '40HC';
  if (/^45[GRPU]/.test(p)) {
    if (/^45P/.test(p)) return '40FR';
    if (/^45U/.test(p)) return '40OT';
    if (/^45R/.test(p)) return '40RF';
    return '40HC';
  }

  // === V38 신규: 4자리 숫자 ISO 코드 (4200, 4210, 2200, 2280 등) ===
  if (/^42[0-9][0-9]$/.test(p)) {
    if (/^428[3-4]$/.test(p)) return '40FR';   // 4283/4284 먼저 (좁은 범위)
    if (/^428[25]$/.test(p)) return '40RF';
    return '40DC';
  }
  if (/^25[0-9][0-9]$/.test(p)) return '20DC';   // 25xx (20HC) = 20DC fallback
  if (/^22[0-9][0-9]$/.test(p)) {
    if (/^228[3-4]$/.test(p)) return '20FR';   // 2283/2284 = FR (먼저 좁은 범위)
    if (/^228[25]$/.test(p)) return '20RF';    // 2282/2285 = RF
    return '20DC';
  }

  // === 알파벳 형식 - 40피트 Standard Height ===
  if (/^40HR/.test(p)) return '40RF';
  if (/^4[24]R/.test(p)) return '40RF';
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
  if (/^43/.test(p)) return '40HC';
  if (/^40[DG]/.test(p)) return '40DC';
  if (/^4[24][G][P0-9]/.test(p)) return '40DC';

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
    '40DC', '40HC', '40RF', '40FR', '40OT', '40TK',
    '45HC', '45GP'
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
  // (2) 4자리 숫자 코드 (4582~4585=40RF, 2282~2285=20RF) - ISO 표준 변형
  if (/^[24]58[2-5]$/.test(upper)) return true;
  // (3) "[2]가 R" 패턴: 4자리 ISO 표준 (45R0, 22R5, 40RF, 22RE 등)
  //     [0]은 길이코드(2/4), [1]은 높이코드, [2]='R', [3]=문자/숫자
  if (/^[24][024568L9]R[A-Z0-9]?$/.test(upper)) return true;
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

// M5.79: 부킹 슬롯(컨번호 미입력) 판정
//   parseBAPLIE에서 EQD+CN++... 빈 컨번호 → __BOOK_ 임시 ID 부여
//   검수원이 현장에서 컨번호 입력하면 isBooking=false, cn=실제 번호로 교체
export function isBookingSlot(c) {
  if (!c) return false;
  if (c.isBooking === true) return true;
  if (c.pendingCn === true) return true;
  if (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_')) return true;
  return false;
}

// M5.79: 부킹 슬롯 화면 표시용 라벨
//   "(컨번호 입력대기)" 또는 짧게 "📝 대기"
export function bookingLabel(c, short = false) {
  if (!isBookingSlot(c)) return '';
  return short ? '📝 대기' : '📝 컨번호 입력대기';
}

// M4.9: ISO403 사진 촬영 의무 대상 검출
//   사용자 정의: "리퍼 L5 포함" + "26대" (TNJP 26334W 기준)
//   EDI 분석 결과 패턴:
//     - 4530 류 (4530~4539): 40ft 리퍼 HC (일부 선사가 표준 외 코드로 사용)
//     - 9500 류 (9500~9509): 45ft HC (L5G1 등을 4자리 숫자로 변환한 코드)
//     - L5XX 류 (L5G0, L5G1, L5HC 등): 45피트 표기
//   주의: 실제 룰은 선사/항만별 다를 수 있음. 검출 결과를 화면에 표시해
//         검수원이 1차 확인 후 사진 촬영하도록 함.
export function isISO403(c) {
  if (!c) return false;
  const code = String(c.iso || '').toUpperCase().trim().replace(/\s+/g, '');
  if (!code) return false;
  // 4530 류: 40ft 리퍼 HC (4530, 4531~4539 모두 포함)
  if (/^45[3]\d$/.test(code)) return true;
  // 9500 류: 45ft HC 4자리 숫자 표기
  if (/^950\d$/.test(code)) return true;
  // L5 시작: 45ft 표기 (L5G0, L5G1, L5HC 등)
  if (/^L5/.test(code)) return true;
  return false;
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
  if (lbl === '40RF') return 'RFHC';
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
export function parseBAPLIE(ediText) {
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
    } else if (seg.startsWith('DTM+178:') || seg.startsWith('DTM+136:')) {
      const v = seg.split(':')[1];
      if (v) result.etd = v.substring(0, 8);
    } else if (seg.startsWith('LOC+147+')) {
      if (cur) result.containers.push(cur);
      const slot = seg.substring(8).split(':')[0];
      cur = {
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
    } else if (cur && seg.startsWith('EQD+CN+')) {
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

      // 특수화물 자동 감지 (ISO 3번째/4번째 글자)
      if (cur.iso.length >= 3) {
        const t = cur.iso[2];
        if (t === 'R') cur.rf = true;
        if (t === 'U' || t === 'O') cur.oog = true;
        if (t === 'T' || (t >= '7' && t <= '9')) cur.tk = true;
        // M3.74 fix: FR(P=Platform/F=Flatrack)은 fr 명시 + oog는 호환성 유지
        // 기존: oog만 true → 베이플랜에 'OOG'로 표시 + 상세모달/카드에 FR 배지 안 뜸
        if (t === 'P' || t === 'F') { cur.fr = true; cur.oog = true; }
      }
      // 4자리 숫자 코드 (4582 등) reefer
      if (/^[24]58[2-5]$/.test(cur.iso)) cur.rf = true;
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
      if (cur.iso.startsWith('22')) cur.tp = "20'GP";
      else if (cur.iso.startsWith('25')) cur.tp = "20'HC";
      else if (cur.iso.startsWith('42') || cur.iso.startsWith('44')) cur.tp = "40'GP";
      else if (cur.iso.startsWith('45')) cur.tp = "40'HC";
      else if (/^458[2-5]$/.test(cur.iso)) cur.tp = "40'RF";
      else if (/^228[2-5]$/.test(cur.iso)) cur.tp = "20'RF";
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
      cur.oog = true;
    } else if (cur && seg.startsWith('FTX+AAY+++')) {
      cur.op = seg.substring(10).substring(0, 5).trim();
    } else if (cur && (seg.startsWith('NAD+CF+') || seg.startsWith('NAD+CA+'))) {
      // V38: CF (Container Forwarder) + CA (Carrier) 둘 다 op로 매핑
      // NAD+CA+CLL:172:20  → CLL
      const code = seg.substring(7).split(':')[0];
      if (code && !cur.op) cur.op = code;
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
  return result;
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
    const hasCn = /^[A-Z]{4}\d{7}$/.test(cn);
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
      tp = m1[1]; iso = m1[2] + 'GP'; fe = m1[3];
      if (tp.startsWith('TK')) iso = '22T6';
      if (tp.startsWith('RF')) iso = tp.endsWith('20') ? '22R5' : '45R1';
      if (tp.startsWith('DC') && tp.endsWith('20')) iso = '22GP';
      if (tp.startsWith('DC') && tp.endsWith('40')) iso = '42GP';
      if (tp === 'HC40') iso = '45GP';
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
  return { vsl, voy, serviceCode, containers };
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
  const containers = (ascResult?.containers || []).filter(c => c.cn && /^[A-Z]{4}\d{7}$/.test(c.cn));
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
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.XLSX;
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

  for (const sheetName of wb.SheetNames) {
    const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);   // V38: !ref 보정
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

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
    if (headerRow < 0) {
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
    const type_i = findCol([/^type$|^cntr.*type|^iso|^tysz$|^szty$|^tp\/?sz$|^tp\s*sz$|^type\/?size$|^type\s*size$/, /^타입$/, /^컨.*규격/, /^kind$/]);
    const size_i = findCol([/^size$|^sz$|^len$|^length$/, /^사이즈$/, /^규격$/]);
    const op_i = findCol([/^op$|^operator|^carrier|^line|^oper$|^soc.*line/, /^선사/, /선사부호/]);
    // M5.55: voucher 보강 — TSPORT(환적), PRINTPOD(실제 양하 항구), CARGO TYPE(DJS 양식 F/P)
    const tsport_i = findCol([/^tsport$|^ts.*port$|^transhipment.*port$/, /환적/]);
    const printpod_i = findCol([/^printpod$|^print.*pod$/, /^실제.*양하/]);
    const cargotype_i = findCol([/^cargo.*type$|^cargo\s*type$/, /화물구분/]);
    const dg_i = findCol([/^dg$|hazmat|imdg/, /위험물/]);
    // M3.85: SITC SENDAI 양식의 [40] "냉동" 컬럼이 실제 온도값(-18, -2.5 등)인데
    //   기존 /냉장/만 있어서 매칭 안 되어 26대 풀 리퍼 모두 미입력 처리되던 버그 수정.
    //   추가로 "set temp", "setpoint", "carry temp", "rf temp" 등 흔한 변형도 인식.
    const tmp_i = findCol([
      /^temp|^temperature|^reefer/, /set\s*temp/, /set\s*point/, /carry\s*temp/, /rf\s*temp/,
      /온도/, /냉장/, /냉동/, /^냉동온도/, /^냉장온도/,
    ]);

    if (cn_i < 0) continue;

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
      if (sl_i >= 0) {
        sl = String(row[sl_i] || '').trim();
        // 빈 값이면 ±2 컬럼도 시도
        if (!sl) {
          for (const off of [-1, 1, -2, 2]) {
            const c = sl_i + off;
            if (c < 0 || c >= row.length || c === cnColActual) continue;
            const v = String(row[c] || '').trim();
            if (v && v.toUpperCase() !== cn) { sl = v; break; }
          }
        }
      }
      if (!sl) {
        // 컨번호 옆 5칸 탐색
        for (let j = cnColActual + 1; j < Math.min(cnColActual + 6, row.length); j++) {
          const v = String(row[j] || '').replace(/[\s\-]/g, '');
          if (/^[A-Z]{0,6}\d{4,}$/i.test(v) && v.length >= 5 && v.toUpperCase() !== cn) {
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
      if (fe_i >= 0) {
        const feRaw = String(row[fe_i] || '').trim().toUpperCase();
        if (feRaw === 'F' || feRaw === 'FULL' || feRaw === 'L' || feRaw === 'LOADED') fe = 'F';
        else if (feRaw === 'E' || feRaw === 'EMPTY' || feRaw === 'MT' || feRaw === 'M') fe = 'E';
      }
      // TYPE 끝 글자
      if (!fe && type_i >= 0) {
        const tRaw = String(row[type_i] || '').trim().toUpperCase().replace(/[\s\-]/g, '');
        if (/^([A-Z]{2}\d{2}|[A-Z]{2,4}|\d{2}[A-Z]{2,3}|\d{4})\d{0,3}([FE])$/.test(tRaw)) {
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
        else if (/TK|TANK/.test(isoRaw)) iso = '22T6';
      }

      const dgVal = dg_i >= 0 ? String(row[dg_i] || '').trim() : '';
      const isDg = dgVal && /^(Y|YES|TRUE|1|DG|HAZ)/i.test(dgVal);

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
        const m = tmpValRaw.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
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
        sl: finalSl,
        sl_orig: finalSl,
        eseal: finalEseal,
        eseal_orig: finalEseal,
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        wt: wt_i >= 0 ? (parseInt(String(row[wt_i] || '').replace(/[,\s]/g, '')) || 0) : 0,
        pol: pol_i >= 0 ? String(row[pol_i] || '').trim() : '',
        pod: pod_i >= 0 ? String(row[pod_i] || '').trim() : '',
        fe,
        iso,
        op: op_i >= 0 ? String(row[op_i] || '').trim() : '',
        tsport: tsport_i >= 0 ? String(row[tsport_i] || '').trim() : '',
        printpod: printpod_i >= 0 ? String(row[printpod_i] || '').trim() : '',
        cargoType: cargotype_i >= 0 ? String(row[cargotype_i] || '').trim() : '',
        dg: isDg,
        rf: isRf,
        fr: isFr,
        ot: isOt,
        tk: isTk,
        tmp: tmpVal,
        tmp_missing: tmpMissing && isRf,  // 리퍼인데 온도 미입력
      });
    }
  }
  // M3.73: 무게 기반 F/E 추정 완전 제거
  // 원칙: 리스트의 F/E 명시값만 사용. 무게로 추정 X.
  // ISO 끝자리 동기화: F/E와 ISO 끝자리가 다르면 F/E 우선
  for (const r of records) {
    if (!r.iso || r.iso.length < 4) continue;
    const last = r.iso[r.iso.length - 1];
    if (r.fe === 'E' && last !== 'E') {
      r.iso = r.iso.slice(0, -1) + 'E';
    } else if (r.fe === 'F' && last === 'E') {
      r.iso = r.iso.slice(0, -1) + 'F';
    }
  }
  return { records };
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
  return {
    containers: Array.from(containers),
    _matchCount: allMatches.length,  // 진단용: 잘못된 매칭 추적
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
export function isValidBerth(b) {
  if (!b) return false;
  const s = String(b).trim();
  if (!s) return false;
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
    const firstDataRow = grid[headerRow + 1] || [];
    let berthTextIdx = -1;
    for (let j = 0; j < firstDataRow.length; j++) {
      const v = String(firstDataRow[j] || '').trim();
      if (/[동서남북]부두|N번선석|\d+번선석|항\s*[A-Z]?\d+컨테이너/.test(v)) {
        berthTextIdx = j;
        break;
      }
    }
    if (berthTextIdx >= 0) {
      colMap.berthRaw = berthTextIdx;
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
  Array.from(keys).sort().forEach((k, i) => {
    map[k] = COLOR_PALETTE[i % COLOR_PALETTE.length];
  });
  return map;
}

// ─── M6.94.29: 평택항 POL/POD 판정 (단일 출처) ──────────────────────────
//   평택 코드 변형: KRPTK(평택), KRPYT(평택신항), KRPYOTM(평택 양교터미널),
//   PTK 약어 등. 기존엔 /(PTK|PYT)$/ 만 봐서 KRPYOTM이 누락됐다
//   (선적 리스트가 KRPYOTM 표기 → 평택분이 표시 안 되던 버그).
//   새 평택 코드가 나오면 이 배열에만 추가하면 전 화면 일괄 반영.
const PYEONGTAEK_CODES = ['PTK', 'KRPTK', 'KRPYT', 'PYT', 'KRPYOTM', 'PYOTM', 'KRPYO'];
export function isPyeongtaekPort(code) {
  if (!code) return false;
  const t = String(code).toUpperCase().trim();
  if (!t) return false;
  if (PYEONGTAEK_CODES.includes(t)) return true;
  // 접미 매칭: ...PTK, ...PYT, ...PYOTM, ...PYO 로 끝나면 평택
  return /(PTK|PYT|PYOTM|PYO)$/.test(t);
}
