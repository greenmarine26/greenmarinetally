// 공통 유틸리티 — V48 (2026.05.09 / M4.9e)
import { getTallyFormat, opParent } from './data/tallyFormats.js';   // 3.52: 자식 선사 판정 한 벌(tallyFormats 는 utils 를 import 하지 않아 순환 없음)
import { allStaffNames } from './staffList.js';
import { sizeLenOf, sizeLenKnown } from './tallyReport.js';   // ★ 일괄수리(2026-11-10): 규격 길이 한 벌 — tallyReport 도 utils 를 부르지만(순환) 서로 함수 안에서만 쓴다(모듈을 읽는 시점에 상대 값을 쓰는 곳 없음 — smoke_onebook487 이 두 순서로 읽어 본다)
import { SHIP_FLAGS, shipCodesWith } from './shipPolicyCore.js';   // ★ 일괄수리(2026-11-10): 선박 코드 목록 한 곳(shipPolicyCore 는 import 가 없어 순환 없음)
import { hatchEvenOf, buildEmptyBayRenderData, buildBayPagesFromSummary, buildBayGrid, isKeepShift as _isKeepShift, isPredShift as _isPredShift } from './cargoPlanCore.js';   // ★ 3.15: 보드가 세는 해치 = 그림이 그리는 장(판정 한 벌)   // ★ 3.8: 호기–검수원 등록 — 이름은 명단(코드+서버)에 있는 것만 받는다
// ─── ★ 2.55-01 — «치는 중에 답을 낼 것인가» 를 정하는 판정. **저장소에 한 벌뿐이다.** ───
//   왜 생겼나 (검수사 신고 2026-08-26) —
//     *«숫자가 아니고 문자를 입력 받을때는 질문을 다 받고 답하는걸 가르치세요.
//       오늘도 FR치니 100개의 FR리스트를 보여주고 FR이란? 이때 FR설명 FR이 뭐야 하니
//       FR이 있는 베이와 갯수 이렇게 나옵니다»*
//   ★ 활동 기록에 그 장면이 그대로 찍혀 있었다 (activity_log/260826, 박진우, 12:34~12:35):
//     FR → FR 이 → FR → FR이 → FR이 ㅁ → FR이 뭐 → FR이 뭐이 → FR이 뭐야
//     **한 질문을 치는 데 8단계, 그때마다 답이 나갔다.**
//   ★ 원인은 판정이 두 벌이었기 때문이다.
//     작업창(SearchPanel)은 `isSentence` 로 «FR» 을 문장으로 보고 전송키를 기다렸는데,
//     양하·선적 탭(VoyagePage)은 `/^[0-9A-Z\s-]{1,15}$/` 라는 **다른 벌**을 갖고 있어
//     «FR» 을 컨번호로 보고 즉시 100대를 뿌렸다. 홈·수석창은 아예 200ms 마다 자동으로 답했다.
//   ⇒ 판정을 여기 한 벌로 두고 세 창이 그것을 부른다.
export const CN_FULL_RE = /^[A-Z]{4}\d{6,7}$/;

//  전체 컨번호면 그 번호를, 아니면 빈 문자열.
export function fullContainerNo(v) {
  const s = String(v || '').replace(/[\s-]/g, '').toUpperCase();
  return CN_FULL_RE.test(s) ? s : '';
}

//  «다 받고 답할 것»(문장) 이면 true, «치는 대로 답할 것»(숫자·컨번호) 이면 false.
//   ⚠ 즉답은 검수사가 갑판에서 쓰는 빠른 길이다 — 숫자는 절대 막지 않는다.
//     4777(끝자리) · 28(베이) · 24-01-86(자리) · DWSU3000276(전체 번호) 는 그대로 즉답.
//     글자가 하나라도 섞이면 말의 시작일 수 있으므로 **전송키를 기다린다** (FR · RF · 브리 · 미르야).
export function isSentenceQuery(v) {
  const s = String(v || '');
  if (!s.trim()) return false;
  if (fullContainerNo(s)) return false;          // 전체 컨번호는 문장이 아니다 (1.55)
  if (/^[\d\s-]+$/.test(s)) return false;        // 숫자·공백·하이픈만 = 즉답
  return /[가-힣A-Za-z]/.test(s);                // 글자가 섞였다 = 말의 시작일 수 있다
}

// 판 이력(4.88-01 까지의 APP_VERSION 꼬리 주석·앞 판 주석·앞 판 APP_NOTE)은 docs/APP_HISTORY.md 로 옮겼다(4.89). 앞 판: 'TallyOne 4.88-01' — 카고플랜을 카스피 공통 용어로.
export const APP_VERSION = 'TallyOne 5.02-04'   // 5.02-04 **수석 상황판 별첨3 규격별 F/E · 별첨4 목적지별 · 엠티 줄도 움직이는 그림으로**(검수사 2026-11-14 «수석 상황판 좌측을 모션 그래픽으로 바꿨는데 안바뀐 부분이 있네여» — 5.02 가 별첨1·2만 바꿔 3·4가 표로 남았다 · LegendFE + LegendRows 재사용, 숫자는 같은 L 한 벌, 옛 표는 «표로 보기 (별첨1~4)») (앞 판) 5.02-03 **콘앱 불편신고·새로고침 줄 오른쪽 끝에 «🐱 미르» 단추**(검수사 2026-11-14 13:05 «콘앱에 미르를 부를곳이 없습니다» · 13:06 «이곳 오른쪽 끝부분이 좋을듯합니다» — 4.89·2.79 가 떠 있는 얼굴을 숨긴 뒤 작업표 전 화면에는 입구가 없었다 · ConeOne 3.00-03) (앞 판) 5.02-02 **양하가 끝난 배의 베이별 진행이 끝난 양하로 뜨던 것**(5.02-01 라이브 확인 — bayModes[0] 이 양하라 선적 대신 양하가 기본) · 5.02-01 **양하가 끝나고 선적만 남은 배는 홈 상세 위 두 상자에서 선적이 먼저**(검수사 2026-11-14 09:13 «끝난 양하 화면이 보입니다 — 작업중인 걸 보여 줬으면») + **홈 베이 카드 트윈·싱글 줄이 잘리지 않게 조각 단위 줄바꿈**(라이브 확인 — 폰 156px 칸에 «트윈 26 · 싱글 앞 2 · 40피트 9» 끝이 «…») · 5.02 **상황판 별첨·홈 상세를 움직이는 그림으로**(검수사 2026-11-14 «복잡해서 눈에 잘 들어오지 않습니다 — 모션그래픽으로» · «전체수량 양하·선적과 작업중인 베이도» · «베이는 1 (2) 3 이 기본» · «트윈 4 · 싱글 앞 1 / 뒤 5 — 남은 베이마다 표기») — 별첨1·2 고리·남은 N대·안 끝난 줄만 펼침·끝난 줄 ✓ 칩(앱 순서 그대로) · 4척 한 줄 요약 · 홈 양하·선적 큰 숫자(CountUp) · 작업중 호기 줄 · 베이 묶음 «01 (02) 03» 카드 + 트윈·싱글 앞/뒤 (앞 판) 5.01-01 **베이뷰·베이모드 위 띠에 미르 문**(검수사 2026-11-14 01:09 «아깜박있었는데 양하에서 베이모드에서는 미르를 부르지 못합니다» — 베이뷰는 전체 화면 덮개라 검색줄이 가려진다 → BayViewWork 두 머리줄에 ChiefMirBar chip, MirFab 시트 한 벌) · 5.01 **홈 «나 오늘» 이 오늘 보관소로 넘어간 배까지 합치고, 누르면 배별 양하·선적을 보인다**(검수사 2026-11-13 21:09 «총댓수만 보여주고 그곳을 누르면 세분화 해서 … 양하 선적을 다 보여줘야 합니다 · PCSZ 96 STMJ 39» — PCSZ 2634E 가 14:31 보관소로 넘어가며 헤더 39대로 굳었다. nlSearch.myTodayByShip · firebase.fbGetMyArchivedToday · HomePage meLine) (앞 판) 5.00-02 **수석 상황판 미르 줄**(검수사 2026-11-13 «수석관리창에 항상 빈곳이 있씁니다. 그안에 미르를 넣어 주세요» — · 18:19 «이안에 넣으세요» — 탭 줄 넷째 칸 ChiefMirBar, 누르면 MirFab 시트) + **5.00-01 라이브 확인·감사 수리** — 경고 띠 문장 속 컨 번호도 CnText(CnInline) · 3안 폰 가로 1px 넘침 막음 · 도착항 확인 요망 강조색 · 자리 수정 창 컨 번호 · 컨 상세 입력 중 Esc 는 입력만 빠져나옴 · ConeOne 3.00-02 양하·선적 항차 번호가 다른 배(STMJ 2671E/2672W)를 양하·선적 둘 다 잡음

//  ★ 2.99-03 (검수사 «업데이트는 올라오는데 업데이트 내용을 모릅니다. 간략하게 내용을 포함해 주세요»):
//    판마다 **한 줄 변경 내용**. build.sh 가 public/sw.js 의 NOTE 로 옮기고, 업데이트 배너가 새 워커에게 물어 그 줄을 보여 준다.
//    ⚠ 작은따옴표·슬래시 금지(sed 가 깨진다). 검수사 표현으로 쓴다 — «플랜 수정» «해치커버 버그 해결» «브리핑 자료 수정» 처럼.
export const APP_NOTE = '5.02-04 수석 상황판 별첨3 규격별과 별첨4 목적지별도 막대 그림이 됐습니다. 엠티 일반 리퍼 줄도 그림 아래에 있고 옛 표는 표로 보기 안에 있습니다'
// (앞 판) APP_NOTE — docs/APP_HISTORY.md 4·5·6절

// ── 2.79: CATOS 터미널 실적(termWork) → 검수 완료(completed) 반영 대상 계산 ─────────────
//   검수사 확정 (2026-08-28) — «수석이 승인 버튼으로 일괄 반영» · 결과물 확인은 베이플랜·카고플랜.
//   ⚠ 판정 한 벌 — 수석 화면의 카운트, 실제 반영(fbApplyTermWork), 연막검사(smoke_termapply)가
//     전부 이 함수를 쓴다. 화면 따로 쓰기 따로 만들면 반드시 갈린다(이 저장소가 반복 앓은 병).
//   규칙 셋.
//     ① 반입시각(at) 없는 것(Booking — 아직 안 내려온 것)은 반영하지 않는다.
//     ② completed 에 이미 있는 컨은 절대 덮지 않는다 — 현장 기록 보호(추가만).
//     ③ 장비는 GC10x → «x호기»(실측 대응 GC102=2호기·GC103=3호기·GC104=4호기), 시각은 터미널 반입시각.
//   ⛔ **3.16 — 이 글자를 완료자 이름 자리에 넣지 않는다.** 검수사 2026-09-06 *«by:'터미널(CATOS)' 어디든 이 문구는 없어야 됩니다.»*
//     3.9 는 X-RAY 봉인자만 막았고 나머지(CSV·컨 목록·컨 상세·보고·통계·수석 표·활동 로그·미르 음성)는 그대로 내보내고 있었다.
//     게다가 동방(PNCT)은 카토스가 아닌데도 그 글자가 붙었다 — 실측 OBWH 2731E 470대 전부.
//   ⇒ 새로 쓰는 완료는 `by` 를 비우고 `src:'term'` 표식만 남긴다. 화면에 나가는 이름은 `completedByLabel` 한 벌이 뽑는다.
//   ⚠ 아래 상수는 **이미 DB 에 박힌 옛 행을 알아보는 용도로만** 남긴다(수천 행이고 `completed/{컨}` 은 덮지 않는 노드다 — 규범 §5-1).
//     쓰기·표시에는 절대 쓰지 않는다. 새 코드는 `isTermApplied` 와 `completedByLabel` 만 부른다.
//  ⛔ 옛 행 판별은 **접두 «터미널»** 로 한다 — 업체 이름이 든 그 문자열을 코드에 아예 넣지 않기 위해서다(검수사 «어디든 이 문구는 없어야 됩니다»).
//    보관소의 옛 행은 전부 그 접두로 시작한다(실측). 검수원 이름이 «터미널…»일 수는 없으므로 사람과 헷갈리지 않는다. 콘앱 `ctIsTerm` 도 같은 벌이다.
const TERM_BY_RE = /^터미널/;
export const TERM_DONE_LABEL = '터미널 반영';   // 조 등록이 없을 때 화면에 나가는 말(업체 이름 없음)

/** 이 완료가 «사람이 앱으로 찍은 것»이 아니라 «터미널 실적을 반영한 것»인가.
 *  새 행은 `src:'term'`, 옛 행은 `by` 가 그 글자다. 둘 다 알아본다. */
export function isTermApplied(rec) {
  if (!rec) return false;
  if (rec.src === 'term') return true;
  return TERM_BY_RE.test(String(rec.by || '').trim());
}

//  4.12 — «마감적용»: 동방 선적을 마감텔리 선적 EDI 기준으로 마무리할 때 앱에서 안 찍은 컨에 채우는 완료(`{by:'', src:'edi', at}`).
//    4.39: 마감적용 기능은 없앴다(검수사 2026-10-19 «앱을 사용하게 되면 필요 없어지는 기능»). 새로 쓰는 곳은 없고, 이미 남은 지난 항차 기록을 읽는 자리로만 둔다.
//    터미널 실적도 사람 입력도 아니다 — 사람이 아닌 기록이라 현장의 뒤늦은 [완료]가 덮을 수 있고, 호기·속도·조 근무자 추정에는 쓰지 않는다.
//    ⚠ isTermApplied 에 합치지 않는다(합치면 «터미널 반영 + 조 등록 근무자 이름» 추정이 이 기록에도 붙는다).
export const EDI_DONE_LABEL = '마감 EDI 적용';
export function isEdiApplied(rec) {
  return !!rec && rec.src === 'edi';
}
/** 사람이 앱으로 찍은 완료가 «아닌» 기록인가 — 터미널 반영이거나 마감 EDI 적용. 사람의 [완료]가 덮어도 되는 기록이다. */
export function isAutoDone(rec) {
  return isTermApplied(rec) || isEdiApplied(rec);
}

/** 화면·서류에 나갈 **완료자 이름 한 벌**. 검수사 «어디든 이 문구는 없어야 됩니다».
 *
 *  ① 사람이 앱으로 찍었으면 그 이름 ② 터미널 반영이면 **그 시각·그 호기의 조 등록 근무자**(3.9 X-RAY 봉인자와 같은 규칙)
 *  ③ 조 등록이 없으면 «터미널 반영» — 업체 이름(카토스·동방)은 넣지 않는다. 부두마다 다르고 서류에 나가면 안 된다.
 *  `info` 를 안 주면 ②를 건너뛴다(조 등록은 항차 자료에만 있다). */
export function completedByLabel(rec, info) {
  if (!rec) return '';
  const by = String(rec.by || rec.inspector || '').trim();
  if (by && !TERM_BY_RE.test(by)) return by;
  if (!by && isEdiApplied(rec)) return EDI_DONE_LABEL;   // 4.12: 조 근무자를 붙이지 않는다 — 터미널이 한 일이 아니다
  if (!by && !isTermApplied(rec)) return '';
  const who = info ? crewNameAt(info, Number(rec.at) || 0, rec.equip) : '';
  return who || TERM_DONE_LABEL;
}
//  ★ 4.75 — 검수 리스트 «제출용» 표기 한 벌(검수사 2026-11-07 14:06~14:15 «검수리스트중에 검수사 누구가 몇호기에서 어떤 컨테이너들을 검수했는지 보여주는 … 제출용 리스트» ·
//    «검수리스트에 체크표시나 검수완료표기 … 비고란에 실오류 데미지가 있었다는 기록» · «시간은 필요 없고» · «검수리스트 출력물이 2개 — 작업용과 제출용»).
//  재료 — 완료 기록(completed: 앱 완료·터미널 반영) + 작업 보고의 실오류(seal_error)·데미지(damage). 이름은 completedByLabel 한 벌(업체 글자 없음).
//  ⚠ 컨에 실오류·데미지 보고가 있으면 **보고한 호기·사람이 터미널 추정을 이긴다**(ATPR 2646E HALU2331077 — 터미널은 2호기(중복 위치), 실제는 보고한 4호기 김성일. 검수사 «중복위치에 있어서 2호기가 내린 것으로 판단한 것 같습니다»).
//  반환 { byCn: { 컨번호: { no, name, flags: ['실오류'|'데미지'] } }, teams: [{ no, name, count }] } — 팀은 호기 번호 순, 호기 미상(0)은 맨 끝.
export function inspectionMarksOf(voyage, mode) {
  const info = (voyage && voyage.info) || {};
  const comp = (voyage && voyage[mode] && voyage[mode].completed) || {};
  const byCn = {};
  // 4.75-01 — 앱으로 직접 입력한 호기(갱)만 표기한다. 명단에 등록돼 있어도 입력이 없으면 그 호기는 검수 리스트(종이)만으로 검수하는 것이다
  //   (검수사 2026-11-07 15:15 «검수를 한게 아니니까요. 터미널 반영도 안되는거고요» · 15:19 «검수를 직접한 장비(갱)것만 제출용 리스트가 출력되어야 합니다. 갱에 등록되어 있다고 해도 직접 입력을 안한다는건 검수리스트만으로 검수를 한다는것입니다»).
  const personOf = (v) => { const s = String(v || '').trim(); return s && !/호기/.test(s) && !TERM_BY_RE.test(s) ? s : ''; };
  for (const [cn, rec] of Object.entries(comp)) {
    if (!rec || !rec.at || isAutoDone(rec)) continue;   // 4.75-01: 터미널 반영·마감 EDI 적용은 사람이 검수한 게 아니다 → 체크 없음
    byCn[cn] = { no: crewCraneNo(rec.equip), name: completedByLabel(rec, info), flags: [] };
  }
  const elig = new Set(Object.values(byCn).map((e) => e.no).filter((n) => n > 0));   // 앱으로 직접 완료를 찍은 호기
  const flagOf = (t) => (t === 'seal_error' ? '실오류' : t === 'damage' ? '데미지' : '');
  const srcs = Object.values((voyage && voyage.reports) || {}).concat(Object.values((voyage && voyage.photoIndex) || {}));
  for (const r of srcs) {
    const f = r && flagOf(r.type);
    const cn = r ? String(r.cn || '').trim().toUpperCase() : '';
    if (!f || !cn) continue;
    const no = crewCraneNo(r.equip);
    if (!no || !elig.has(no)) continue;   // 직접 입력하지 않는 호기의 보고는 표기하지 않는다
    const e = byCn[cn] || (byCn[cn] = { no: 0, name: '', flags: [] });
    if (!e.flags.includes(f)) e.flags.push(f);
    const nm = personOf(r.by) || crewNameAt(info, Number(r.ts) || Number(r.at) || 0, r.equip);
    e.name = nm || (no === e.no ? e.name : '');
    e.no = no;
  }
  const tm = {};
  for (const e of Object.values(byCn)) {
    const k = `${e.no}|${e.name}`;
    (tm[k] = tm[k] || { no: e.no, name: e.name, count: 0 }).count++;
  }
  const teams = Object.values(tm).sort((a, b) => ((a.no || 99) - (b.no || 99)) || String(a.name).localeCompare(String(b.name), 'ko'));
  return { byCn, teams };
}
export function computeTermApply(termWork, completed) {
  const out = [];
  for (const [cn, rec] of Object.entries(termWork || {})) {
    if (!rec || !rec.at) continue;
    if (completed && completed[cn]) continue;
    const m = /^GC10(\d)$/.exec(String(rec.equip || '').trim());
    const equip = m ? `${m[1]}호기` : String(rec.equip || '').trim();
    out.push([cn, equip ? { by: '', src: 'term', at: rec.at, equip } : { by: '', src: 'term', at: rec.at }]);   // 3.16: 이름 자리에 업체 글자를 넣지 않는다 — 표식만
  }
  return out;
}

/** 4.11 — 교대 시각 터미널 스냅샷(term_snapshot/{항차}/{모드}) → 수석 승인으로 completed 에 넣을 [컨, 레코드] 목록.
 *  판정은 computeTermApply **한 벌**이다(이미 completed 에 있는 컨은 건너뛴다 — 검수원 기록을 안 덮는다 · 추가만).
 *  동방 선적(basis 'plan')은 «동방 계획 기준 — 완료 확정 아님» 표식(termBasis:'plan')을 더한다 — 그 기록이 어디서 왔는지 남기는 표식이다
 *  (이 표식을 읽던 4.12 마감적용은 4.39 에서 기능째 없앴다). 검수사 2026-10-07 22:01 «앱으로 선적한것은 그래로 적용하고 마감텔리EDI를 적용하면 앱으로 사용안한부분만 덮어쓰는것입니다».
 *  이름 자리(by)는 비운다 — completedByLabel 이 그 조 등록 근무자 또는 «터미널 반영» 으로 그린다(3.16). */
export function snapApplyEntries(snap, completed) {
  if (!snap || typeof snap !== 'object' || !snap.rows || typeof snap.rows !== 'object') return [];
  const list = computeTermApply(snap.rows, completed);
  return snap.basis === 'plan' ? list.map(([cn, rec]) => [cn, { ...rec, termBasis: 'plan' }]) : list;
}

/** 4.11 — 스냅샷의 출처·신뢰 표시 한 벌. 동방 선적만 «계획 기준»이다(카토스는 PDA 입력이라 선적도 정확, 동방 양하는 실제 작업 기록 — 검수사 2026-10-07 21:54·21:59·22:02). */
export function snapBasisOf(snap) {
  const src = String((snap && snap.src) || '').toUpperCase();
  const basis = String((snap && snap.basis) || '');
  if (basis === 'plan') return { tone: 'warn', label: '동방 계획 기준 · 완료 확정 아님', short: '동방(계획)' };
  if (src === 'PNCT') return { tone: 'ok', label: '동방 · 실제 작업 기록', short: '동방' };
  if (src === 'PCTC') return { tone: 'ok', label: 'PCTC · PDA 입력', short: 'PCTC' };
  return { tone: 'warn', label: '출처 미상', short: '?' };
}

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
  let loloOn = false;    // 4.30: «-LO LO X N VAN» 아래 «40H FULL X 8VAN» 줄들 — 크레인 대수·풀 수. 위 집계(full/empty/vans)에는 넣지 않는다(이중 집계 방지)
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
    if (/^\*\s*(FULL|EMPTY|LUG)/i.test(line)) loloOn = false;   // 4.30: 다음 섹션 헤더에서 LO LO 하위 줄 읽기를 끝낸다
    if (/^\*\s*FULL\s*$/i.test(line)) { sec = 'full'; continue; }
    if (/^\*\s*EMPTY\s*$/i.test(line)) { sec = 'empty'; continue; }
    if (/^\*\s*LUG/i.test(line)) { sec = 'luggage'; continue; }
    // 위치·화주 상세('-LO LO', '-CORNNING'…)나 온도 상세("40RHX7 (-18'C)") 등은 이중 집계 방지 위해 제외
    //  4.30: 크레인(LO LO) 대수 — «-LO LO X 67 VAN» · 아래 줄 «40H FULL X 8VAN» / «40R EMPTY X 22VAN». 집계 필드는 건드리지 않고 out.lolo 에만 둔다.
    const lm = line.match(/^[-=]?\s*LO\s*LO\s*[Xx×]\s*(\d+)/i);
    if (lm) { if (!out.lolo) { out.lolo = { n: +lm[1], full: 0, empty: 0 }; loloOn = true; } else loloOn = false; sec = null; continue; }   // 두 번째 LO LO 줄은 첫 줄을 덮지 않는다
    if (loloOn && /^[-=]/.test(line)) loloOn = false;
    if (loloOn && out.lolo) {
      const sm = line.match(/(\d{2})\s*[A-Z]{0,2}\s*(FULL|EMPTY)\s*[Xx×]\s*(\d+)/i);
      if (sm) { out.lolo[sm[2].toLowerCase()] += +sm[3]; continue; }
    }
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
  //  2.40: 화면 밝기·소리 — **기기마다 따로**다(계정이 아니라 localStorage).
  //    검수사 원문 — *«검수앱 하나때문에 전체 화면을 바꾸기는 어렵습니다»* ·
  //    사무실 컴은 밝게, 배에서 쓰는 폰은 어둡게. 같은 사람이라도 기기가 다르면 답이 다르다.
  brightness: 'master_brightness_v1',
  volume: 'master_volume_v1',
};

/* ══════════════════════════════════════════════════════════
   ★ 2.40 화면 밝기 — 4단계 (검수사 확정 2026-08-25)
     «쉽게 컴에선 한다는건 일반 업무용과 같으면 됩니다. 더 바라는건 없습니다.»
   실제 색은 `src/index.css` 의 :root[data-bright="N"] 이 정한다. 여기는 «지금 몇 단계인가»만 다룬다.
   ⚠ 3 → 4 사이가 크게 벌어져 있다. 중간톤(카드 L34~55)은 밝은 글자도 진한 글자도 안 읽히는
     죽은 구간이라 **건너뛴다**(2.40 대비비 실측). 1~3 은 어두운 배경, 4 는 엑셀과 같은 흰 바탕.
   ══════════════════════════════════════════════════════════ */
export const BRIGHT_STEPS = [
  { n: 1, label: '어두움', hint: '배 안 · 야간' },
  { n: 2, label: '보통',   hint: '실내' },
  { n: 3, label: '밝음',   hint: '밝은 실내' },
  { n: 4, label: '사무실', hint: '흰 바탕 · 엑셀과 같은 밝기' },
];
export const VOLUME_STEPS = [
  { n: 0, label: '끔',   v: 0 },
  { n: 1, label: '작게', v: 0.35 },
  { n: 2, label: '보통', v: 0.7 },
  { n: 3, label: '크게', v: 1.0 },
];

//  기기가 처음일 때 — OS 가 밝은 테마면 «사무실», 아니면 «어두움».
//  ⚠ 넘겨짚지 않는다. matchMedia 를 못 쓰는 환경이면 종전 그대로 1 단계다.
function _defaultBright() {
  try {
    if (typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: light)').matches) return 4;
  } catch { /* 판정 못 하면 종전대로 */ }
  return 1;
}
export function getBrightness() {
  const raw = _storage.get(SK.brightness);
  const n = parseInt(raw, 10);
  return (n >= 1 && n <= 4) ? n : _defaultBright();
}
//  ⚠ 실제로 화면을 바꾸는 곳은 여기 한 곳뿐이다(판정 두 벌 금지).
//    <html data-bright="N"> 하나로 CSS 변수 전체가 갈린다.
export function applyBrightness(n) {
  const v = Math.max(1, Math.min(4, parseInt(n, 10) || 1));
  try {
    if (typeof document !== 'undefined') {
      if (v === 1) document.documentElement.removeAttribute('data-bright');
      else document.documentElement.setAttribute('data-bright', String(v));
    }
    _storage.set(SK.brightness, String(v));
  } catch (e) {
    //  조용히 실패하지 않는다(3금지 ③) — 저장이 막혀도 화면은 바뀌어야 한다.
    console.warn('[밝기] 저장 실패 — 이번 세션만 적용됩니다.', e);
  }
  return v;
}
export function getVolumeStep() {
  const raw = _storage.get(SK.volume);
  const n = parseInt(raw, 10);
  return (n >= 0 && n <= 3) ? n : 2;      // 기본 «보통»
}
export function setVolumeStep(n) {
  const v = Math.max(0, Math.min(3, parseInt(n, 10)));
  try { _storage.set(SK.volume, String(v)); }
  catch (e) { console.warn('[소리] 저장 실패 — 이번 세션만 적용됩니다.', e); }
  return v;
}
//  ⚠ 실제 볼륨 값(0~1)의 **단일 소스**. voice.js·greeting.js·회화집 셋이 이것만 읽는다.
//    종전엔 세 곳이 각자 `u.volume = 1.0` 을 박아 두고 있었다.
export function currentVolume() {
  const st = VOLUME_STEPS.find((s) => s.n === getVolumeStep());
  return st ? st.v : 0.7;
}

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
  //  4.04-02: 덱플랜 좌표(deckPos «C_8_21») 가 붙은 컨은 그것이 먼저다 — X-RAY 탭과 같은 표기(rzorPlan.withDeckPos 가 목록에 붙인다).
  if (c.deckPos) return String(c.deckPos);
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

//  ★ 3.14 — **동진 EDI 의 오픈탑 코드**(`225E`·`435E` 류)를 표준 오픈탑으로 읽는다.
//    검수사 «규격은 바로 수정할수 있을것 같은데» — 실측 DJCF 0151S 35대(20ft 24 · 40ft 11):
//    EDI 는 `225E`·`435E`, 선사 리스트는 `22UE`·`42UE`(ISO 6346 에서 셋째 자리 U = 오픈탑)로 같은 컨을 달리 적었다.
//    앱은 EDI 우선이라 20DC·40HC(드라이)로 읽었다. 근거 둘이 맞으므로(리스트 U · EDI 자체 OOG 플래그) 오픈탑으로 본다.
//    ⚠ 표준 코드는 안 건드린다 — «앞 두 자리(길이·높이) + 5E» 이 형태만 오픈탑으로 읽는다(20ft/40ft 는 첫 자리로 가른다).
const _OT_ALIAS = /^([24])[0-9]5E$/;
//  ★ 4.25-01 — **L 로 시작하는 오픈탑(L5U0 · 셋째 자리 U)은 터미널이 40피트 하이큐브 오픈탑(45UT)으로 읽는다**(검수사 2026-10-14 06:27
//    «뭔가 확인이 안될떄는 터미널의 규격을 따릅니다. L5U0 45UT(OT)» — STMJ 2663E CAXU5572234: 선사·세관 40OH).
//    첫 글자 L 로 «진짜 45피트» 를 가르는 곳은 전부 이 한 벌을 부른다 — 라벨만 바꾸면 같은 컨이 화면·카고플랜은 40', 마감텔리·미르 «45피트» 는 45' 로 갈린다(4.25-01 감사 상).
//    ⚠ L 다음 자리가 숫자(높이)이고 셋째가 U 인 것만 — «LUG»(수화물 표식) 같은 글자는 안 잡는다.
export const isTermOtL = (iso) => /^L\dU/.test(String(iso || '').toUpperCase().trim());
//  진짜 45피트 L 표기(L5G1·L5GP·L5R1 …) — L 로 시작하되 위 오픈탑은 뺀다.
export const isLen45Iso = (iso) => { const p = String(iso || '').toUpperCase().trim(); return /^L/.test(p) && !isTermOtL(p); };
//  ★ 4.52 (검수사 2026-10-26 09:14 «둘다 틀리고 기본 지정된것이 맞기때문입니다» · 09:16 «오픈탑으로 잡고 하이큐 오픈탑으로 표기 하면 되는것인데»):
//    연태훼리(YTF·OBWH) EDI 는 오픈탑(하드탑)을 «V코드» — 20피트 22V7 · 40피트 42V1 — 로 적는다. 통풍컨(Ventilated)이 아니다.
//    실측 — 같은 컨의 다른 자료가 전부 오픈탑이다: SPSU2036335 · TEMU5280018 · TEMU5279995(세관 22U6) · TEMU4984732 · TEMU5262185(세관·메일 20HT) ·
//    FBLU3030260(터미널 적부도 20HT) · TGHU4437784(42V1 ↔ 세관 40HT). 터미널 ISO 표(ISO Type_Size.xlsx)에는 V7 이 아예 없다(V0·V1·V2·V4 만).
//    ⚠ 이 두 글자열만 안다 — V 로 시작하는 다른 코드(통풍컨 22V0 등)는 종전대로 20VH·40VH(통풍)로 둔다. 새 V코드가 나오면 실데이터로 확인한 뒤 더한다.
//    V코드는 «오픈탑이다» 까지만 말하고 높이는 말하지 않는다 — 높이 대조(isoOtHeightConflict)에서는 뺀다.
const _YTF_OT_V = /^(22V7|42V1)$/;
export const isoToLabel = (iso) => {
  {
    const _m = _OT_ALIAS.exec(String(iso || '').toUpperCase().trim());
    if (_m) return _m[1] === '2' ? '20OT' : '40OT';
  }
  if (!iso) return '';
  let p = String(iso).toUpperCase().trim().replace(/\s+/g, '');
  //  4.52: 연태 V코드(22V7·42V1)와 세관·선사의 `20HT`·`40HT`(하이큐 오픈탑)는 오픈탑이다 — 아래 20H·V 갈래가 20HC·통풍으로 읽던 것을 먼저 막는다.
  if (_YTF_OT_V.test(p)) return p[0] === '2' ? '20OT' : '40OT';
  if (/^(20|40)HT$/.test(p)) return p.slice(0, 2) + 'OT';
  //  ★ 3.60-12 (진단 M5): ASC·선사 약식 장비코드(DC20·DC40·DCHC·DCHE·RF40·RFHC·FR40·OT20·TK20 …).
  //    종전엔 모르는 코드라 그대로 돌려줘(«DCHC») 길이를 라벨로 가르는 곳(마감텔리 tallySizeCol·검수 리스트 20/40 묶음)이
  //    첫 글자로 떨어져 **20피트**로 셌다 — KBTR 2606E 선적 EDI 160대(픽스처 실측). 3.60-07 loadingEdiExport 약어 풀기와 같은 꼴.
  //    HC·HQ·HE(하이큐브·하이큐브 엠티)는 40피트 하이큐브 — 리퍼면 40RH.
  //    ⚠ 파서의 풀/엠티 표식(parseBAPLIE 끝 — 엠티면 끝 글자를 E, 풀이면 F 로)이 붙은 꼴도 푼다: DC2E·DC4E·RF4E·DCHE·DCHF(3.60-12 감사 실측).
  {
    const _a = /^(DC|GP|RF|RE|FR|PL|FP|OT|OP|TK)(20|2E|2F|40|4E|4F|45|HC|HQ|HE|HF)$/.exec(p);
    if (_a) {
      const k = { DC: 'DC', GP: 'DC', RF: 'RF', RE: 'RF', FR: 'FR', PL: 'FR', FP: 'FR', OT: 'OT', OP: 'OT', TK: 'TK' }[_a[1]];
      if (_a[2][0] === '2') return '20' + k;
      if (_a[2] === '45') return '45HC';
      if (_a[2][0] === 'H') return k === 'DC' ? '40HC' : k === 'RF' ? '40RH' : '40' + k;
      return '40' + k;
    }
  }
  // V8.98-10: 엠티/풀 마커 복원 — 공컨정규화(utils 993/1131/2051)로 끝자리가 E/F가 된
  //   숫자 ISO를 원 숫자로 되돌려 규격판정. 450E→4500, 453E→4530, 950E→9500.
  //   (loadingEdiExport numericIso/ediIso의 /^\d{3}E$/ 복원과 동일 소스. 없으면 453E→'403' 오탐)
  if (/^\d{3}[EF]$/.test(p)) p = p.slice(0, 3) + '0';
  //  ★ 4.25-01 (검수사 2026-10-14 07:06 «CAXU5571916 터미널 4550으로 표기 된건입니다» · «4550 규격이 뭔가요?»):
  //    옛 숫자 ISO 의 셋째 자리 5(50~59)는 **오픈탑**이다 — 4550 = 40피트 하이큐브 오픈탑(= 45U1 · 45UT), 2250·2251 = 20피트 오픈탑.
  //    종전엔 아래 45xx·22xx 갈래가 일반(40HC·20DC)으로 읽었다(엠티 표식 455E·225E 만 _OT_ALIAS 가 오픈탑으로 읽음 — 같은 컨이 풀·엠티로 갈렸다).
  //    실측 — PCSZ 2632W 선적 SKHU2800114 EDI 2251(oog) · STSE 2669E 터미널 실적 2250 다섯 대 = EDI 22U0 · 터미널이 L5U0 을 4550 으로 표기(STSE 2669E CAXU5571916).
  if (/^[24][0-9]5[0-9]$/.test(p)) return p[0] === '2' ? '20OT' : '40OT';
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
  //   ⚠ 3.60-10: 라벨은 45HC 그대로지만 **리퍼 여부**는 isReeferIso 가 L5R 을 리퍼로 본다 — 온도 점검에서 빠지는 쪽이 더 위험하다
  //     (옛 자리별 정규식 `iso[2]==='R'` 도 그렇게 셌다 · 실데이터 픽스처엔 L5R 0대).
  //  ★ 4.25-01 (검수사 2026-10-14 06:27 «뭔가 확인이 안될떄는 터미널의 규격을 따릅니다. L5U0 45UT(OT)»):
  //    L 에 오픈탑(셋째 자리 U)이 붙은 표기는 터미널이 읽는 대로 **40피트 하이큐브 오픈탑(45UT)** 이다 — 45피트 오픈탑은 위 주석대로 없다.
  //    실측 STMJ 2663E CAXU5572234 — EDI L5U0 · 선사·세관 40OH · 터미널 «45UT(OT)». 종전엔 45HC(45피트 일반)로 읽어 «규격이 자료마다 다름» 이 떴다.
  //    ⚠ 다른 L 표기(L5G1 = 진짜 45피트 등)는 그대로 45HC 다 — 근거가 있는 오픈탑만 바꾼다.
  if (isTermOtL(p)) return '40OT';
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
    return /^46HR/.test(p) ? '40RH' : '40HC';   // 3.53-06: HR 은 리퍼(감사 지적 — 이 분기가 4xHR 보다 앞이라 46HR 만 드라이로 샜다)
  }
  // 알파벳 형식: 4로 시작하면 무조건 40피트
  //   45RF/45HC/45GP (신표기) → 모두 40피트 (4=40ft 원칙)
  //   45R0/45R1/45G0/45G1 (ISO 6346) → 40HC/40RF
  if (/^45RF/.test(p)) return '40RH';   // 1.99: 45xx = 하이큐브 그룹
  //  ★ 4.88 (검수사 확정 2026-11-12 «45HC 는 진짜 45피트») — 글자 그대로 «45HC» 는 45피트다. ISO 코드(45G1·45R1 — 첫 글자 4)는 그대로 40피트 하이큐브.
  //    실측 — 픽스처·RTDB 의 iso «45HC» 18건(OBWH 2763E X-RAY 목록 16 · RZOR R083E 2)이 전부 같은 컨의 EDI·선사 L5G1, 세관 «45HC» 213건도 전부 L5G1.
  //    3.60-16 이 파서에서 «45HC»→L5G1 로 바꿨지만(MAILBOX 1,492개 · 121대) 라벨 함수는 40HC 로 남아 X-RAY 목록·옛 저장분이 40피트로 읽혔다.
  if (p === '45HC') return '45HC';   // 4.88
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
  if (/^4[0-9]HR/.test(p)) return '40RH';   // 1.99: HR = HC 리퍼 · 3.53-06: 42HR·44HR 도(세관 관례 — 종전 42HR 은 40HC 드라이로 떨어졌다)
  if (/^44R/.test(p)) return '40RH';   // 1.99: 44 = 40HC 그룹
  if (/^4[024]RH/.test(p)) return '40RH';   // 3.60-03 (진단 T12): 세관 `42RH`·`40RH` = 40HC 리퍼 — 검수사 2026-09-18 «45RE 42RH 45RF 45R1 45R8 모두 같은 규격». 종전엔 아래 42R 규칙에 걸려 40RF(8'6")로 떨어져 헛 «규격 불일치»와 종이 높이 하락을 냈다
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
  if (/^2[0-9]HR/.test(p)) return '20RF';   // 3.53-06: 20ft HR(리퍼) — 종전엔 20HC 드라이로 떨어졌다(40 쪽 4xHR 과 같은 규칙)
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

//  ★ 3.45 — **규격을 «세관 리스트 표기»(ISO 6346 그룹꼴) 한 벌로.**
//    검수사 2026-09-14 «규격이 잘못되어 있습니다» → «규격은 세관리스트껄로 맞추시면 될듯합니다».
//    세관 리스트(검수업체컨테이너목록조회) 실측 표기는 45GP · 22GP · 42RE · 22TN 처럼
//    **끝 두 자가 타입 «그룹» 문자**인 4자리다. 여기 없는 꼴은 전부 세관 표기가 아니다 —
//    ⚠ 3.45 초판이 «4자리에 글자 하나» 만 보고 통과시켜 앱 **내부 공컨 마커**(220E·450E·453E·45GE)와
//      선사 약어(DCHC·40HE)가 종이로 샜다(감사 실측 NSDC 239행 중 23행 · DJCT 271행 중 30행).
//    그래서 문을 «그룹 문자»로 좁히고, 통과 못 한 것은 **isoToLabel 한 벌**(이 파일의 유일한 ISO 해석기 —
//    공컨 마커 복원·숫자 ISO·L5G1=45피트·4530=40HC리퍼를 이미 안다)을 거쳐 그룹꼴로 옮긴다.
//    실측 대조 — DJCT 세관 리스트 원문 45GP/22GP/45GP 와 EDI 4510/2210/4510 이 이 함수로 일치한다.
//  ⚠ 'RF' 는 ISO 타입 «그룹» 이 아니라 업계 약어다(세관 표기는 RE). 넣어 두면 선사 약어 40RF·45RF·20RF·22RF 가
//    문을 통과해 같은 종이에서 40피트 리퍼가 «45RE» 와 «40RF» 두 가지로 찍힌다(재감사 실측 48대).
//  3.47: PC·PS 추가 — ATPR 2641E 세관 실파일에 `42PC`(접이식 플랫폼) 1대가 있었는데 이 집합에 없어
//    규격이 빈칸으로 나갔다. 빠뜨린 것은 «세관이 안 쓴다»가 아니라 «아직 못 봤다»였다.
const ISO_TYPE_GROUP = new Set(['GP', 'RE', 'RT', 'RS', 'PF', 'PL', 'PC', 'PS', 'UT', 'TN', 'TG', 'TD', 'BU', 'SN', 'VH', 'HR', 'AC']);
//  isoToLabel 이 내는 라벨 → 세관 그룹꼴. 첫 두 자는 «길이+높이»(22=20피트 8'6" · 45=40피트 9'6" · L5=45피트).
const _LABEL_TO_SPEC = {
  '20DC': '22GP', '20HC': '25GP', '20RF': '22RE', '20FR': '22PF', '20OT': '22UT', '20TK': '22TN', '20VH': '22VH',
  '40DC': '42GP', '40HC': '45GP', '40RF': '42RE', '40RH': '45RE', '40FR': '42PF', '40OT': '42UT', '40TK': '42TN', '40VH': '42VH',
  '45HC': 'L5GP',
};

/** 4.21 — 앱 안의 풀·엠티 표식 코드(`453E`·`450E`)를 사람이 아는 정본 규격 글자로 바꿔 **보여 주기만** 한다(저장값은 그대로).
 *  검수사 2026-10-10 «원문이 4530이면 검수는 45R1 리퍼로 알고 있습니다. 엠티 구분이 있으면 45RE로 표기하는 게 맞습니다».
 *  표식 꼴(숫자 셋 + E/F) · 숫자 넷(4530 = 풀 리퍼)이 아니면 받은 값 그대로. 풀 → 45R1·45G1 · 엠티 → 45RE·45GE. */
export function isoShown(iso) {
  const p = String(iso || '').toUpperCase().trim().replace(/\s+/g, '');
  //  ★ 4.25-01 — L 오픈탑(L5U0)은 터미널이 읽는 대로 45UT 로 보인다(보여 주기만 — 저장값 L5U0 은 그대로).
  //    검수사 2026-10-14 07:11 «45UT로 표기하게 해주고 이번 마감텔리가 나오면 그걸로 확정하겠습니다».
  if (isTermOtL(p)) return isoToCustomsSpec(p, '') || iso;
  //  ★ 4.52 (검수사 2026-10-26 09:20 «보통 20OT나 22UT는 많이 사용하는데 22U6는 잘 사용안합니다»): 드문 오픈탑 표기(U2~U9 · 20HT·40HT · 연태 V코드)는
  //    흔한 세관 글자(22UT · 하이큐 25UT · 42UT · 45UT)로 보여 준다(보여 주기만 — 저장값은 그대로). 22UT·20OT·42U1 같은 흔한 표기는 받은 그대로 둔다.
  if (/^[24L][0-9]U[2-9]$|^(20|40)HT$|^(22V7|42V1)$/.test(p) && isOpenTopIso(p) && /OT$/.test(isoToLabel(p))) return isoToCustomsSpec(p, '') || iso;   // 라벨이 OT 일 때만(46U2 처럼 라벨이 40HC 로 읽히는 드문 코드는 «45GP» 로 바꿔 적지 않고 받은 그대로)
  if (!/^\d{3}[EF0-9]$/.test(p)) return iso || '';
  const spec = _LABEL_TO_SPEC[isoToLabel(p)];
  const m = spec && /^(\d\d)([GR])/.exec(spec);
  return m ? m[1] + m[2] + (p[3] === 'E' ? 'E' : '1') : iso;   // 숫자 넷(4530)은 풀 표기
}
//  ★ 3.47 — **세관 그룹꼴 → 앱 표준 ISO 정규화. 한 벌이다(규범 §4-4).**
//    ⛔ 이것을 parseCustomsSheet 안에만 두면 안 된다 — 「고르기」가 그것을 못 거쳐 원문을 그대로
//      저장했고, 그러면 검수사가 «세관 것이 맞다» 고 누른 순간 **세관 파일을 올렸을 때보다 나쁜 값**이
//      잠긴다(감사 지적 2026-09-14: 25GP→20DC · 46RE→40HC 드라이). 파서와 고르기가 같은 것을 부른다.
//    ⚠ 관례 표기가 먼저다 — `44GP`·`45HC` 는 구조로 풀면 틀린다.
//    ⚠ 종류군 첫 글자를 그대로 쓰면 안 된다 — `HR`(냉동·가열)은 H 가 아니라 **R**(리퍼)다.
//    ⚠ 크기코드도 앱이 아는 꼴로 맞춘다 — `46`(40피트 9'6" 변형)을 두면 46R1 이 되고 앱이 그것을
//      «40HC 드라이»로 읽는다. 20피트 하이큐브(25·26)는 앱이 아는 꼴이 `2280` 하나뿐이다.
const _SPEC_ALIAS = {
  '22GP': '22G1', '20GP': '22G1', '20DC': '22G1',
  '20RF': '22R1',
  '44GP': '45G1',                  // 40HC (세관이 40HC를 44GP로 적는 관례, 40HA 포함)
  '40GP': '42G1', '40DC': '42G1',
  '45RE': '45R1', '45RH': '45R1',  // 40HC 리퍼
  '42RH': '45R1', '40RH': '45R1',  // 3.60-03: 세관 관례 표기 — RH 는 하이큐브 리퍼(검수사 2026-09-18 «42RH … 모두 같은 규격»)
  '40RF': '42R1',
  '40FR': '42P3',
  '45HC': 'L5G1',                  // 진짜 45피트
  //  4.85-02: 세관 코드표(프리즘 147종)의 45피트 계열 — 45VH(9400·9500·9510)·45TN(9576)·45HQ(9410)는 ISO 9xxx = 45피트다. 종전엔 앞 두 자리 45 를 40피트 하이큐브로 읽었다(구조 풀이). 실자료(보관 429항차)엔 아직 안 나왔다 — 예방.
  '45VH': 'L5G1', '45HQ': 'L5G1',   // 45TN(9576 탱크)은 L5 가 종류를 못 담아 탱크 표시를 잃으므로 뺐다(감사 지적)
  //  ★ 4.27-01 (검수사 2026-10-15 14:29 «40OT=42U1과 동일하고 40OH=45U1과 동일 합니다»): `40OT` 는 8'6" 오픈탑(42U1)이다 — 9'6"(하이큐브)는 `40OH`.
  //    종전 45U1 로 읽어 STMJ 2663E 선사 40OT(EDI 42U0 · 세관 42UT)가 9'6" 로 읽혔다.
  '40OT': '42U1', '40TK': '45T1',
  '40HC': '45G1', '40HQ': '45G1', '20HC': '2280',   // 사람 표기 — 2280 = 20피트 9'6"
  //  3.52: `42HQ` — 세관이 40ft 하이큐브를 이렇게도 적는다(TMPZ 2027E 실측 **129대**). `HQ` 는 종류군이
  //    아니라서 구조 풀이(_GRP_TYPE)가 못 잡고 **빈칸**을 냈고, 그 빈칸을 «빈 값은 기존을 안 덮는다»
  //    규칙이 다른 값으로 메워 **같은 세관 원문 한 값이 45G1 90대 · 40HQ 39대로 갈려 있었다**
  //    (실측 — 그 39대는 선사리스트 `CNTR LIST-2027E.XLSX` 출신이고, **일반 리스트 파서는 3.52 에서도
  //    `40HQ` 를 그대로 낸다**. 즉 이 한 줄은 세관 쪽 빈칸만 막는다 — 선사리스트가 세관 뒤에 오면
  //    45G1 을 40HQ 로 되덮는 길은 아직 열려 있다. 규격 우선순위(3.47 영역)라 별도 판 · 인계함에 적었다).
  //    근거 — EDI 가 그 129대를 전부 45G1 로 본다 ·
  //    이미 있는 `44GP`·`40HQ` 와 같은 관례 계열 · HQ = 하이큐브(9'6") 라 ISO 둘째 자리는 5.
  '42HQ': '45G1',
  //  3.53-06: `42HR`·`40HR` — 세관이 40ft 하이큐브 **리퍼**를 이렇게 적는다(MAMP 636N 실측 **191대**, 전부 EDI 45R8·45R1).
  //    `HQ` 와 같은 관례 계열이다(H = 하이큐브). 구조 풀이는 `42`→42R1(40RF, 8'6")로 풀어 EDI 45RE 와
  //    «규격이 자료마다 다름 191건»을 냈다. 검수사 2026-09-18 «45RE 42RH 45RF 45R1 45R8 모두 같은 규격».
  //    isoToLabel 도 `4xHR` 을 40RH 로 읽는다(1.99 «HR = HC 리퍼» 규칙과 한 벌).
  '42HR': '45R1', '40HR': '45R1',
  //  4.25-01: `40OH` — 세관·선사가 40피트 **하이큐브 오픈탑**을 이렇게 적는다(STMJ 2663E CAXU5572234 · 터미널 «45UT(OT)»).
  //    종전엔 그룹꼴이 아니라 라벨 40OT → 42UT(8'6")로 높이를 낮춰 적어 EDI L5U0(→ 45UT)와 «다름» 이 떴다.
  '40OH': '45U1',
  //  4.52 (검수사 2026-10-26 «오픈탑으로 잡고 하이큐 오픈탑으로 표기»): `20HT`·`40HT` — 세관·선사가 **하이큐 오픈탑**을 이렇게 적는다(TEMU4984732 세관 20HT · TEMU5262185 메일·세관 20HT · TGHU4437784 세관 40HT).
  //    종전엔 구조 풀이가 못 잡아 20HC(드라이)로 읽어 같은 오픈탑이 칩에서 «20OT» 와 «20HC» 로 갈렸다. `25OT` 는 20피트 하이큐 오픈탑의 알파 표기다(실파일에는 아직 없음 — 검수사가 물은 표기).
  '20HT': '25U1', '40HT': '45U1', '25OT': '25U1',
  '25GP': '2280', '26GP': '2280',                    // 20피트 하이큐브 그룹꼴
};
const _GRP_TYPE = { GP: 'G', RE: 'R', RT: 'R', RS: 'R', HR: 'R',
  PF: 'P', PL: 'P', PC: 'P', PS: 'P', UT: 'U', TN: 'T', TG: 'T', TD: 'T',
  BU: 'B', SN: 'S', VH: 'V', AC: 'A' };
//  ⛔ `49` 를 여기 넣지 마라 — ISO 6346 에서 둘째 자리 9 는 «4피트 미만»이지 9'6" 가 아니다.
//    44 는 세관 관례, 46 은 9'6" 초과라 근거가 있지만 49 는 높이 등급을 잘못 올린다(감사 지적).
const _SPEC_SZ = { '20': '22', '21': '22', '24': '22', '40': '42', '41': '42', '44': '45', '46': '45' };
export const normalizeSpecIso = (raw) => {
  const v = String(raw || '').toUpperCase().trim();
  if (_SPEC_ALIAS[v]) return _SPEC_ALIAS[v];
  if (!isCustomsSpec(v)) return '';
  const t = _GRP_TYPE[v.slice(2)];
  if (!t) return '';
  const sz = v.slice(0, 2);
  return (_SPEC_SZ[sz] || sz) + t + '1';
};

//  세관 리스트 원문이 그룹꼴이면 그것이 정본이다 — 없는 것을 지어내지 않는다.
export const isCustomsSpec = (v) => {
  const p = String(v || '').toUpperCase().trim();
  return /^[2-4LM][0-9A-Z][A-Z]{2}$/.test(p) && ISO_TYPE_GROUP.has(p.slice(2));
};
export const isoToCustomsSpec = (iso, customsIso) => {
  //  ① 세관 리스트 원문이 있으면 그것이 정본이다 — 우리가 고쳐 적지 않는다.
  if (isCustomsSpec(customsIso)) return String(customsIso).toUpperCase().trim();
  //  ② 없으면 **언제나** isoToLabel 한 벌을 거친다. EDI 표기를 날것으로 통과시키면
  //     같은 배 같은 규격이 «45GP»·«20GP»·«40RF» 처럼 선사마다 달리 찍힌다(재감사 실측).
  const spec = _LABEL_TO_SPEC[isoToLabel(iso)] || '';
  if (!spec) return '';                                                             //  모르면 빈 문자 — 부르는 쪽이 정한다
  //  ③ 높이를 낮춰 적지 않는다. isoToLabel 은 FR·OT·탱크에서 높이를 안 갈라 40FR·40OT·40TK 한 덩어리로 내는데,
  //     그것을 8'6"(42PF·42UT·42TN)로 적으면 **9'6" 컨을 8'6" 라고 종이에 명시**하는 셈이다(재감사 지적).
  //     원 ISO 가 «4 5 _ _»(40피트 9'6")라고 말하면 그 높이를 지킨다. GP·리퍼는 라벨이 이미 높이를 가른다.
  const p = String(iso || '').toUpperCase().trim();
  //     4.25-01: L5 오픈탑(L5U0 — 터미널 «45UT(OT)»)도 9'6" 다 — 같은 규칙으로 높이를 지킨다.
  if (/^(45|L5)/.test(p) && /^42(PF|UT|TN)$/.test(spec)) return '45' + spec.slice(2);
  //     4.52: 하이큐 오픈탑(20피트 25U1·20HT·25OT · 40피트 40HT)도 9'6" 다 — 22UT·42UT 로 낮춰 적지 않는다(40OH→45UT 와 같은 규칙).
  if (isHcOpenTopIso(p)) { if (spec === '22UT') return '25UT'; if (spec === '42UT') return '45UT'; }
  //     4.27-01 (감사 하-1): 원문 `40OH`(리스트 전용 컨의 저장값)도 9'6" 오픈탑이다 — 검수사 2026-10-15 «40OH=45U1과 동일».
  if (p === '40OH' && spec === '42UT') return '45UT';
  return spec;
};

//  ★ 3.47 — **규격 3자 대조 한 벌.** 진단·작업카드·컨테이너 상세가 전부 이것만 부른다.
//    검수사 2026-09-14 «확인대상이 EDI : 선사리스트 : 세관리스트 3곳입니다. 만약 불일치가
//    나온다면 이들은 **실물을 보기전에는 확정할수 없습니다.** 그러므로 알림을 띄우고 그컨테이너가
//    양하 되거나 선적될때 세개중에 어느것이 맞는지 선택할수 있어야 합니다.»
//
//    ⚠ 두 벌을 만들지 마라(규범 §4-4). 진단이 «다르다»는데 작업카드에 고르기가 안 뜨면
//      검수사는 그 자리에서 못 고치고, 반대면 없는 불일치를 고르라고 묻는다.
//    ⚠ 빈칸은 «같다»도 «다르다»도 아니다 — 그 자료를 안 올렸다는 뜻이라 조용히 뺀다.
//    ⚠ 표기만 다른 것(RF↔RE)은 불일치가 아니다 — isoToLabel 한 벌로 사람이 읽는 규격을 만들어
//      그것끼리 본다(검수사 통보 2026-09-14: 표기 차이 70건은 안 띄운다).
//
//    ediRaw — EDI 원문(없으면 ''). lr — 리스트 레코드(선사 `iso_carrier`·세관 `iso_customs`).
//    ⛔ `lr.iso` 는 넣지 않는다. 셋이 돌려쓰는 칸이라 누가 쓴 값인지 알 수 없다 —
//       종전 진단이 그 칸을 EDI 와 비교해 «불일치 0» 을 냈다(ATPR 2641E 10대 실측).
export const ISO_SRC_NAME = { edi: 'EDI', carrier: '선사', customs: '세관' };
//  **대조 잣대는 «길이+높이+종류» 한 가지다** — 그것을 앱에서는 라벨(40DC·40HC·40RF·40RH…)이라 부른다.
//    ⛔ 표기(45GP·44GP)로 대조하지 마라 — 같은 40HC 를 세관이 `44GP` 로 적는 관례가 있고(2237행 주석),
//      그러면 «표기 차이 = 규격 차이»가 되어 **없는 불일치가 수십 건** 뜬다(감사 실측 10건 → 59건).
//      검수사 불만(«어느곳에서도 알림이 없었습니다»)의 정반대 사고다.
//    ⛔ 정규화 없이 라벨을 내지도 마라 — 앱이 `25G1`·`46R1`·`45H1` 을 잘못 읽는다. 그래서 **정규화 먼저**다.
//    화면에 찍는 글자(spec)는 그 자료가 실제로 적은 말이다. 대조는 label, 표시는 spec — 자리가 다르다.
export const isoTriad = (ediRaw, lr) => {
  const one = (k, raw) => {
    const v = String(raw || '').toUpperCase().trim();
    if (!v || isUnknownIso(v)) return { k, spec: '', label: '' };
    const iso = normalizeSpecIso(v) || v;          // 세관 그룹꼴이면 앱 표준으로, 아니면 원문 그대로
    const label = String(isoToLabel(iso) || '').replace(/\s/g, '').toUpperCase();
    return { k, name: ISO_SRC_NAME[k], raw: v, iso, label, spec: isoToCustomsSpec(iso, v) };
  };
  const out = [
    one('edi', ediRaw),
    one('carrier', lr && lr.iso_carrier),
    one('customs', lr && lr.iso_customs),
  ].filter(x => x.label);
  //  3.61-01 (검수사 2026-09-25 «RZOR의 40RE는 45RE입니다» · «RZOR은 40RE 또는 40RF로 사용합니다. 그래서 매번 규격틀림 알림이 발생합니다»):
  //    RZOR 선사 리스트(RF_CNTR_List·CNTR_List)의 리퍼 칸 «40RE»·«40RF» 는 «40피트 리퍼» 라는 뜻뿐 — 높이(일반·하이큐)는 말하지 않는다.
  //    EDI·세관이 40피트 리퍼라고 하면 선사 칸은 대조에서 뺀다 — 높이는 EDI·세관이 정한다.
  //    실측(보관소+진행 310항차): 선사 «40RE» 143건 = 전부 RZOR, 전부 EDI 45R1·세관 45RE · «40RF» 5건 = 전부 특수제작컨(EDI 40RF·세관 42RF).
  //    ⚠ 선사 칸을 45RE 로 바꿔 읽지 마라 — 40RF 로 적힌 특수제작컨 5대에 새 알림이 생긴다.
  //    게이트는 `_rz`(RIZHAO 판독 표식, RZOR 양하 레코드에만 있다) — 다른 배의 40RE·40RF 판정은 그대로다.
  if (lr && lr._rz) {
    const _ca = out.find(x => x.k === 'carrier');
    if (_ca && /^40R[EF]$/.test(_ca.raw) && out.some(x => x.k !== 'carrier' && (x.label === '40RF' || x.label === '40RH'))) {
      return out.filter(x => x !== _ca);
    }
  }
  return out;
};
//  ★ 4.25-01 — 규격이 갈렸을 때의 말 한 벌(진단 패널·미르·작업카드·컨 상세). 검수사 2026-10-14 06:27
//    «뭔가 확인이 안될떄는 터미널의 규격을 따릅니다» — 3.47 «실물을 보기 전에는 확정할 수 없다» 에서 바뀌었다.
//    앱의 숫자·출력은 종전부터 EDI(= 터미널이 쓰는 자료) 규격으로 센다(SearchPanel·PrintHubModal 병합 «EDI 가 진실»). 사람이 고르면 고른 것이 이긴다.
export const ISO_CONFLICT_WHY = 'EDI · 선사리스트 · 세관리스트의 규격이 서로 다릅니다. 확인 전에는 터미널(EDI) 규격을 따릅니다 — 실물이 다르면 양하·선적할 때 맞는 것을 고르세요.';
//  자료가 둘 이상 있고 규격이 갈리면 그 목록을, 아니면 null.
//  ⚠ 문지기는 **여기** 한 곳이다(규범 §4-4) — 부르는 쪽마다 세우면 한 곳이 빠진다.
//    검수사가 실물을 보고 고른 컨(`iso_pick`)은 확정이다. 더 묻지 않는다.
//    ⛔ 다만 **영영 조용해지면 안 된다**(감사 지적) — 고른 뒤 자료가 바뀌어 **어느 자료도 그 값을
//      말하지 않게 되면** 다시 묻는다. 오확정 한 번으로 그 컨이 그 항차 내내 침묵하던 구멍이었다.
export const isoConflictOf = (ediRaw, lr) => {
  const srcs = isoTriad(ediRaw, lr);
  if (lr && lr.iso_pick) {
    const picked = String(lr.iso_pick_label || '').toUpperCase().trim();
    if (!picked || srcs.some(x => x.label === picked)) return null;   // 고른 답이 아직 자료에 있다
  }
  if (srcs.length < 2) return null;
  //  ★ 3.73-01 — **40피트 리퍼는 42·45 가 다른 규격이 아니다**(검수사 2026-10-03 «45RE 42RE 둘이 숫자가 틀리다고 같은 규격이 아니라는 오류입니다»).
  //    45RE·45HR·45RF·42HR·42RF·42RE·4530 은 전부 «40피트 리퍼» 의 표기 차이다 — 라벨로는 40RH(45계열)와 40RF(42계열)로 갈려 «규격이 자료마다 다름» 이 떴다(NSDC 2609N 양하 13대: EDI 4530 · 세관 42RE).
  //    그래서 **대조 잣대에서만** 40RF·40RH 를 한 칸으로 본다. 화면에 찍는 글자(spec)·라벨은 그대로다. 20피트·일반 컨(45GP↔44GP 등)의 판정은 손대지 않는다.
  //  ★ 4.27-01 — **40피트 오픈탑은 높이로 가른다**(검수사 2026-10-15 14:29 «40OT=42U1과 동일하고 40OH=45U1과 동일 합니다. 이걸로 규격이 틀리다고 알람이 발생되지 않게» ·
  //    14:31 «세관은 42UT이고 선사나 터미널이 40OH 45U1이라고 하면 그떄는 점검요망»). 라벨은 높이를 안 갈라 셋 다 40OT 라 갈려도 조용했다 —
  //    같은 높이(40OT·42UT·42U1 / 40OH·45UT·45U1·L5U0·4550)는 같은 규격, 높이가 다르면 갈림(화면은 «점검요망» — isoOtHeightConflict).
  //  ★ 4.52 — 연태 V코드(42V1)는 «오픈탑이다» 까지만 말한다 — 높이는 세관·선사(40HT·40OH 등)가 정한다. 40OT 다른 자료와는 높이 대조에서 짝을 맞춘다(`40OT?`).
  const cmpKey = (x) => (x.label === '40RF' || x.label === '40RH') ? '40R*' : x.label === '40OT' ? (_YTF_OT_V.test(x.raw || '') ? '40OT?' : `40OT${isOtHighIso(x.iso) ? 'H' : 'S'}`) : x.label;
  const _keys = srcs.map(cmpKey);
  const _named = _keys.filter(k => k !== '40OT?');
  const _kinds = new Set(_named);
  if (_kinds.size >= 2) return srcs;
  //  높이를 안 말하는 V코드가 있고, 나머지 자료가 40피트 오픈탑이 아니면 진짜 갈림이다(V코드 ↔ 40피트 드라이 등).
  if (_named.length < _keys.length && _kinds.size === 1 && !String([..._kinds][0]).startsWith('40OT')) return srcs;
  return null;
};
//  ★ 4.27-01 — 40피트 오픈탑의 높이 한 벌. 둘째 자리 5·6 = 9'6" 이상(45U1·45UT·L5U0·4550·455E) · 그 밖 = 8'6"(42U1·42UT·4350·435E·4050).
//    부르는 쪽은 isoTriad 가 정규화한 iso(세관·선사 40OT → 42U1 · 40OH → 45U1)를 넘긴다.
export const isOtHighIso = (iso) => /^[4L][56]/.test(String(iso || '').toUpperCase().trim());
//  갈림이 «40피트 오픈탑 높이» 하나뿐이면 true — 화면·진단·미르가 «점검요망» 으로 적는다(검수사 2026-10-15 14:31).
export const isoOtHeightConflict = (srcs) => Array.isArray(srcs) && srcs.length >= 2 && srcs.every(x => x.label === '40OT') && new Set(srcs.filter(x => !_YTF_OT_V.test(x.raw || '')).map(x => isOtHighIso(x.iso))).size >= 2;   // 4.52: 높이를 말하지 않는 V코드는 뺀다
//  ★ 4.52 (감사 재판정 2026-10-26) — **«규격 확정 — OO 것 …» 줄을 그릴지·무엇을 적을지 한 벌.** 컨 상세와 작업 카드가 같은 답을 내도록 여기 한 곳에 둔다.
//    4.50·4.51 에서 고른 오픈탑 기록(iso 20HT·22V7 + iso_pick_label «20HC»)은 고른 것을 빼고 다시 재도 갈림이 없으면(= 두 자료 다 오픈탑) 고를 것이 없다 → null(줄을 안 그린다).
//    진짜 갈림이 남은 확정은 줄을 그리되 라벨은 지금 규격 글자로(옛 «20HC» 가 남지 않게). 확정이 없으면 null. 저장값은 건드리지 않는다.
export function pickConfirmLineOf(c) {
  if (!c || !c.iso_pick) return null;
  const ot = isOpenTopIso(c.iso);
  if (ot && !isoConflictOf(c.iso_edi || '', { ...c, iso_pick: '', iso_pick_label: '' })) return null;
  const label = ot ? (isoToLabel(c.iso) || c.iso_pick_label || '') : (c.iso_pick_label || '');
  return { src: ISO_SRC_NAME[c.iso_pick] || c.iso_pick, label };
}
export const ISO_OT_CHECK_WHY = '40피트 오픈탑의 높이가 자료마다 다릅니다(8\'6" 42UT · 40OT ↔ 9\'6" 45UT · 40OH). 점검요망 — 실물 높이를 보고 맞는 것을 고르세요. 고르기 전에는 터미널(EDI) 규격으로 셉니다.';

//  ★ 3.53 — **POD 가 자료마다 다를 때 사람이 고르게 한다.** (검수사 2026-09-16
//    «이건을 앱에서 수정할수 있게 해주세요… 저랑 수석만 가능하게» · «갯수가 변경되어야만 계획과 맞습니다»)
//    실물 KSKM 2617N `SEGU2430571` — EDI·카토스 `KRINC`, 세관리스트 `KRPTK`. 앱은 종전에 둘 다
//    보여 주기만 했고(2.77 «리스트 POD» 노란 줄) 어느 쪽이 맞는지 정할 길이 없었다.
//  ⚠ 문지기는 **여기** 한 곳이다(규범 §4-4) — `isoConflictOf` 와 같은 꼴·같은 규칙으로 쓴다.
//    고른 뒤 자료가 바뀌어 **어느 자료도 그 값을 말하지 않게 되면** 다시 묻는다(오확정 한 번으로
//    그 컨이 항차 내내 침묵하던 구멍 — 3.47 감사에서 잡힌 그것).
//  ⚠ POD 는 규격과 달리 **대수를 바꾼다**(평택분 판정 `isPtk`). 그래서 확정은 수석·검수사만 한다(firebase 문지기).
export const podConflictOf = (ediPod, lr) => {
  const rawE = String(ediPod || '').trim();
  const rawL = String((lr && lr.pod) || '').trim();
  if (!rawE || !rawL) return null;                // 한쪽이 없으면 갈릴 것도 없다
  //  ⚠ **정규화해서 비교한다.** 2차 시뮬 지적 2026-09-16 — 원문끼리 비교하니 전수 8,694건 중
  //    **83%가 헛경고**였다(`PTK` vs `KRPTK` 5,496 · 둘 다 평택인 `KRPTK` vs `KRPYOTM` 1,758).
  //    STMJ 2652E 양하는 **499대 전부**가 그런 헛경고였다. 수백 개 단추 사이에서 진짜 한 건을 놓친다.
  const E = normPortCode(rawE), L = normPortCode(rawL);
  if (!E || !L || E === L) return null;
  //  둘 다 평택이면 대수에 영향이 없다 — 물을 이유가 없다(KRPTK · KRPYOTM · PTK02 …).
  if (isPyeongtaekPort(E) && isPyeongtaekPort(L)) return null;
  //  ★★ **묻는 방향은 하나다 — «리스트가 평택인데 EDI 가 아닐 때».**
  //    왜 — 세관 적하목록의 `pod` 는 「**최종항**」 칸이고 EDI POD 는 「**양륙항**」이다. 뜻이 다르다.
  //    평택에 내려서 육상으로 더 가는 화물은 «EDI 평택 · 최종항 타항» 이 **정상**이다.
  //    재감사 전수 실측 2026-09-16(보관 276 + 활성 16 · 양하 EDI 81,305행) — 정규화 뒤 남은 369건 중
  //      `KRPTK|CNDAL` 204 · `KRPTK|VNHPH` 104 · `KRPTK|VNSGN` 37 … = **362건이 그 꼴**이고,
  //      진짜 갈림(리스트가 평택)은 `KRINC|KRPTK` 2 · `KRKAN|KRPTK` 1 = **3건뿐**이었다.
  //    ⛔ 그 362건에 단추를 세우면 **누르는 순간 대수가 잘못 줄어든다** — MCSN 622N 실측으로
  //      202건을 «리스트» 로 확정하면 평택 양하분이 443 → 241 이 된다. 소음이 아니라 사고다.
  //    ⚠ 반대 방향(EDI 평택 · 리스트 타항)은 2.77 의 노란 «리스트 POD» 줄이 이미 보여 준다 — 숨기지 않는다.
  if (!isPyeongtaekPort(L)) return null;
  if (lr && lr.pod_pick) {
    //  고른 답이 아직 자료에 있으면 조용하다. ⛔ 라벨이 비었으면 **조용해지지 않는다** —
    //    빈 라벨로 영영 침묵하던 갈래를 막는다(2차 시뮬 지적 ④). 다시 물으면 그 자리에서 다시 고른다.
    const picked = normPortCode(lr.pod_pick_label || '');
    if (picked && (picked === E || picked === L)) return null;
  }
  //  ⚠ `label` 은 **자료가 적어 온 원문**(사람이 알아보는 값), `value` 는 **저장할 정규화 코드**다.
  //    저장을 원문으로 하면 `PTK02` 같은 부두코드가 records 에 박혀 다음 판정이 또 흔들린다.
  return [
    { k: 'edi', name: 'EDI', label: rawE.toUpperCase(), value: E },
    { k: 'list', name: '리스트', label: rawL.toUpperCase(), value: L },
  ];
};

/** ★ 3.53 — **확정(pod_pick)이 있으면 그것이 EDI 를 이긴다. 한 벌이다**(규범 §4-4).
 *  2차 시뮬 지적 2026-09-16 — 확정을 안 태운 자리가 여섯이나 있어, 확정한 뒤에도
 *  자료검증 경고가 그대로 뜨고 홈 카드는 168 · 마감텔리는 169 를 말했다. 검수사에게는
 *  «눌렀는데 아무 일도 안 일어났다» 로 보인다(검수사 «갯수가 변경되어야만 계획과 맞습니다»).
 *  ⇒ raw `ediContainers.pod` 를 직접 읽는 자리는 전부 이 함수를 지난다.
 */
export function resolvedPod(ediC, rec) {
  if (rec && rec.pod_pick && rec.pod != null && String(rec.pod).trim() !== '') return rec.pod;
  return (ediC && ediC.pod) || '';
}
/** 그 컨이 이 모드의 평택분인가 — **확정을 반영해서** 답한다(양하는 POD, 선적은 POL). */
export function isPtkResolved(ediC, rec, mode) {
  if (mode === 'discharge') return isPyeongtaekPort(resolvedPod(ediC, rec));
  return isPyeongtaekPort((ediC && ediC.pol) || (rec && rec.pol) || '');
}

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
//  ★ 리퍼 표기 — 검수사 확정 2026-09-03 (원문 그대로 남긴다)
//    *«REEFER 누구는 RF 누구는 RE 누구는 R 누구는 HR이라고 말합니다.
//      R1 R3 R8 R*로 표현하는것들은 일단은 리퍼로 판단을 하고 풀인지 엠티인지 구분을 합니다.»*
//    ⇒ ① `RF`·`RE`·`HR`·`R*`(R1·R3·R8…) 는 **전부 리퍼**다. 선사마다 적는 법이 다를 뿐이다.
//       ② **규격 글자는 적/공을 말하지 않는다.** `45RE` 의 E 를 «엠티»로 읽으면 안 된다 —
//          적/공은 `fe` 로만 가른다. 실측(활성·보관 전수) — 규격 끝이 E 인 리퍼 8,627대 중
//          **117대가 fe=F(적)** 이었다(OBWH 2725E `22RE` · RZOR R080E `40RE` 등).
//       ③ `HE`(하이큐브 엠티)·`G1`·`GP`·`GE`·`HC` 는 드라이다 — 검수사 확정 «G1은 드라이 일반입니다».
//          클로드가 `HE` 를 리퍼로 잘못 넣었다가 실물(EDI `45GE`)을 보고 뺐다.
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
  //  3.60-10 (진단 M6): 45피트(L)·48피트(M) 리퍼 — L5R1·L2R1·M5R1. 옛 자체 정규식(iso[2]==='R')은 잡았고 이 한 벌만 놓쳤다.
  //    판정을 이 한 벌로 모으면서 45피트 리퍼가 빠지지 않게 같은 자리 규칙을 길이 L·M 에도 쓴다(셋째 자리 R = ISO 6346 냉동군).
  if (/^[LM][0234568L9]R[A-Z0-9]?$/.test(upper)) return true;
  // (4) "40HR", "20HR" (ASC m2 변형: H+R 패턴) - 4글자만 인정
  //  ★ 3.6-02 (검수사 확정 2026-09-03 «같은 리퍼인데 선사별 표기가 틀려서 그렇습니다» ·
  //    «표기가 틀리면 선적 오류를 유발 합니다») — **높이코드를 0 으로 못 박지 않는다.**
  //    종전은 `[24]0HR` 이라 `42HR`(40피트 하이큐브 리퍼)를 못 읽었다. 그래서 리스트 규격 42HR 이
  //    EDI 의 45R8 을 덮으면 **리퍼가 카고플랜에서 통째로 사라졌다** — 보관 68항차 실측 466대
  //    (MAMP 621N 240 · MCSN 622N 226). 검수사 신고 «특수 화물 표기가 안된 카고플랜이 있었습니다.
  //    그래서 리퍼 온도체크 미스를 낼뻔 했습니다» 가 이것이다.
  //    ⚠ 높이코드 자리는 ISO 6346 의 그 자리다 — 규칙 (3) 이 쓰는 것과 같은 집합을 쓴다.
  if (/^[24][0234568L9]HR$/.test(upper)) return true;
  //  ★ 3.6-02 — **리퍼 표기는 `RF` · `HR` · `R?`(R1·R3 계열) 뿐이다** (검수사 확정 2026-09-03).
  //    ⛔ 내가 한 번 틀렸다. `40HE` 319대가 «리퍼 근거»(rf 플래그·EDI 리퍼)를 달고 나온 것을 보고
  //      `HE` 도 리퍼라고 넣었는데, 실물을 열어 보니 그 대부분이 **EDI `45GE`(드라이 하이큐브 엠티)** 였다.
  //      내 집계가 «근거가 하나라도 있으면»으로 묶어 드라이까지 끌어들인 것이다.
  //      `HE` = High-cube **Empty** 이지 리퍼가 아니다. 검수사 정정 — «리퍼 표기는 RF HR R 입니다».
  //    ⚠ `G1`·`GP`·`GE`·`HC` 는 **드라이 일반**이다(«G1은 드라이 일반입니다»).
  //      실측 `45G1` 1대가 리퍼 근거를 달고 나왔는데 그것은 **자료 오기**이지 표기가 아니다 —
  //      한 대 때문에 규칙을 넓히면 드라이 수천 대가 리퍼로 서서 헛 온도 점검이 생긴다.
  // 정밀: isoToLabel 결과로 판단 (위 패턴이 못 잡은 변형도 정규화로 잡음)
  const lbl = isoToLabel(upper);
  if (!lbl || lbl === upper) return false;  // 정규화 실패/그대로면 false (안전)
  return lbl.endsWith('RF') || lbl.endsWith('RE') || lbl.endsWith('RH');   // 3.60-10 (감사): 라벨 40RH(41HR·47HR 등)도 리퍼
}

// 통합 컨테이너 종류 판정 (rf 플래그 + ISO 모두 검사)
export function isReeferContainer(c) {
  if (!c) return false;
  if (c.rf) return true;
  return isReeferIso(c.iso);
}
//  ★ 4.15 — **«리퍼 몇 대» 는 풀 리퍼만 센다** — 한 벌. 검수사 2026-10-09 §7.8-⑪ «리퍼 몇대라는 질문은 풀을 이야기 한것» (감사 375 · §7.1 «리퍼는 풀일 때만 리퍼»).
//    엠티 리퍼(fe E)·리퍼드라이(rfdry)·특수제작컨(mkcon)은 세지 않는다. F/E 를 모르면(빈칸) 풀로 둔다(1.86 «리퍼 = 풀이 기본» · reeferTempOf 와 같은 갈래).
//    미르·통합검색 대수 답 · 베이 답 · 브리핑 · 인수인계 · 갱 배분 · AI 자료 묶음이 이것만 부른다. 엠티 리퍼는 «리퍼 엠티» 로 물을 때만(nlSearch).
export function isFullReefer(c) {
  if (!c || c.rfdry || c.mkcon) return false;
  if (String(c.fe || '').toUpperCase() === 'E') return false;
  return isReeferContainer(c);
}
//  ★ 4.15-01 — **엠티 리퍼 한 벌**(isFullReefer 의 짝). 검수사 2026-10-09 15:37 «40앰티중 리퍼 엠티가 섞여 있다면 총엠티 몇개 일반 몇개 리퍼엠티 몇개를
//    구분해서 표기 하지만 풀리퍼랑 합산 하면 안됨» · 15:39 «리퍼 엠티 41 리퍼풀 2 -> 리퍼=2». F/E 가 E 이고 리퍼 규격(rf·RF·RE·HR·R·숫자 냉동군)이면 엠티 리퍼다.
//    엠티 수를 보이는 자리(별첨3·수석 보드 별첨·현황 탭·선박 카드 MTY·통합검색·미르·브리핑·마감텔리·AI 자료)가 이것만 부르고, 리퍼 수에는 절대 더하지 않는다.
export function isEmptyReefer(c) {
  if (!c || String(c.fe || '').toUpperCase() !== 'E') return false;
  return isReeferContainer(c);
}
//  4.15-01 엠티 구분 표기 한 벌 — 리퍼 엠티가 1대라도 있으면 «엠티 43(일반 2 · 리퍼 엠티 41)», 없으면 종전 그대로 «엠티 43».
//    word 는 그 자리의 말(엠티·Empty·MTY)을 그대로 쓴다. 숫자는 부르는 쪽이 isEmptyReefer 로 센다.
export function emptySplitLabel(total, rfE, word = '엠티') {
  const t = Number(total) || 0, r = Number(rfE) || 0;
  return r > 0 ? `${word} ${t}(일반 ${t - r} · 리퍼 엠티 ${r})` : `${word} ${t}`;
}

/*  ★ 3.43-03 플랫랙(FR) 판정 — **한 벌** (규범 §4-4)
    검수사 2026-09-11 «SWTD 카고플랜에서 FR을 OT로 오류 표기 수정바람».
    원인 — ASC 파서는 장비코드 FR40·FR20 을 보고 `oog` 만 켜고 `fr` 은 안 켠다(utils parseAscFile isFROrOT).
      그래서 SWTD 9013E 양하 FR 4대(42PF·22PF · tp FR40·FR20 · oog:true · fr 없음)가
      카고플랜 칸에서 FR 을 못 받고 `c.ot || c.oog` 가지로 떨어져 **OT** 로 그려졌다.
      같은 카고플랜의 별첨은 `iso[2]==='P'` 를 따로 봐 FR 로 셌다 — 칸과 별첨이 다른 판정을 했다.
    규칙 — 파서가 쓰는 규칙 그대로 한 곳에 둔다(표준·숫자코드 BAPLIE 의 셋째 자리 P·F·6 · 4583/4584 ·
      IFCSUM 의 isoCategory FR · ASC 의 FR/PL/FP 장비코드). 플래그가 있으면 플래그가 이긴다. */
export function isFlatRackIso(code) {
  const u = String(code || '').toUpperCase().replace(/['\s]/g, '');
  if (u.length < 3) return false;
  if (/^(FR|PL|FP)/.test(u)) return true;                          // ASC 장비코드 FR40·FR20·PL40·FP40
  if (/^[24L9]/.test(u) && 'PF6'.includes(u[2])) return true;       // 42PF·22P1·45P3·40FR·4261·2261 (파서 t==='P'||'F' · 숫자 '6')
  if (/^[24]58[34]$/.test(u)) return true;                         // 4583·4584 (파서 규칙)
  return isoCategory(u) === 'FR';                                   // 그 밖의 변형(IFCSUM 과 같은 판정)
}
/*  ★ 3.47 오픈탑·탱크 판정 — **한 벌** (규범 §4-4). isFlatRackIso 와 같은 자리에 둔다.
    감사 지적 2026-09-14 — 「고르기」가 이 정규식을 손으로 다시 적어 판정이 네 벌이 됐다.
    규칙은 리스트 파서가 쓰던 것 그대로다(세관·RIZHAO 파서 것은 이것의 부분집합이라 손실이 없다). */
export function isOpenTopIso(code) {
  const u = String(code || '').toUpperCase().replace(/['\s]/g, '');
  //  4.25-01: 옛 숫자 표기 셋째 자리 5(4550·2250·2251 · 엠티 표식 455E)도 오픈탑 · L 오픈탑은 isTermOtL 한 벌(L5U0 — 터미널 4550)
  //  4.52: 20HT·40HT(하이큐 오픈탑) · 25OT · 연태 V코드(22V7·42V1)도 오픈탑 — 종전엔 이 줄을 못 통과해 ot 표식이 안 켜졌다.
  return /^[24][0245689]U/.test(u) || /^[24]0O/.test(u) || /^4[5689]O/.test(u) || /^L5U/.test(u) || isTermOtL(u) || /^[24][0-9]5[0-9EF]$/.test(u)
    || isAlphaOpenTopIso(u);
}
//  ★ 4.52 — **이번 판이 새로 오픈탑으로 읽는 알파 표기 한 벌** — 20HT·40HT(하이큐 오픈탑) · 25OT · 연태 V코드(22V7·42V1).
//    isOpenTopIso 와 별첨(legendCargoCatOf)·인쇄 별첨·카고플랜 편집기·콘앱이 **같은 답**을 내도록 여기 한 곳에 둔다(감사 지적 2026-10-26 — 사본 넷이 플래그만 보거나 `[2]==='U'` 만 봐 EDI 만 있는 V코드를 일반으로 셌다).
export function isAlphaOpenTopIso(code) {
  const u = String(code || '').toUpperCase().replace(/['\s]/g, '');
  return /^(20|40)HT$/.test(u) || /^25OT$/.test(u) || _YTF_OT_V.test(u);
}
//  ★ 4.52 — **하이큐브(9'6") 오픈탑인가** — 화면이 «하이큐 오픈탑» 이라고 적을 때와 20피트 규격 글자를 25UT 로 지킬 때 쓰는 한 벌.
//    20피트는 둘째 자리 4·5·6(터미널 ISO 표 24·25·26 → 25G1 계열) · 40피트는 5·6(45U1·45UT·4550) · 알파 표기 20HT·40HT·40OH·25OT.
//    연태 V코드(22V7·42V1)는 높이를 말하지 않는다 — 오픈탑일 뿐 하이큐인지는 모른다(false).
export function isHcOpenTopIso(code) {
  const u = String(code || '').toUpperCase().replace(/['\s]/g, '');
  if (!u || _YTF_OT_V.test(u) || !isOpenTopIso(u)) return false;
  return /^2[456]/.test(u) || /^[4L][56]/.test(u) || /^(20|40)HT$/.test(u) || u === '40OH' || u === '25OT';
}
//  컨 한 대가 «하이큐 오픈탑» 인가 — 규격(c.iso)이 말하거나, 규격이 높이를 안 말하는 연태 V코드일 때 세관·선사 자료가 하이큐 오픈탑(20HT·40HT·40OH·25U1…)이라 말하면 그렇다.
//  (TEMU4984732 — EDI 22V7 · 세관 20HT: 고르기 전에도 «하이큐 오픈탑» 으로 적는다.) 화면 표기 한 벌 — 컨 상세가 부른다.
export const hcOpenTopOf = (c) => !!c && (isHcOpenTopIso(c.iso) || (_YTF_OT_V.test(String(c.iso || '').toUpperCase().trim()) && [c.iso_customs, c.iso_carrier].some((v) => isHcOpenTopIso(normalizeSpecIso(v) || v))));
//  컨 한 대의 규격 글자(괄호 안) — isoShown(c.iso) 에 «하이큐 오픈탑이면 22UT·42UT 로 낮춰 적지 않는다» 를 더한 한 벌(4.52).
//  연태 V코드(22V7)는 높이를 몰라 isoShown 이 22UT 로 보이지만, 세관·선사가 20HT 라 하면 하이큐 오픈탑이라 25UT·45UT 로 적는다.
export const isoShownOf = (c) => {
  const s = isoShown(c && c.iso);
  if (hcOpenTopOf(c)) { if (s === '22UT') return '25UT'; if (s === '42UT') return '45UT'; }
  return s;
};
export function isTankIso(code) {
  const u = String(code || '').toUpperCase().replace(/['\s]/g, '');
  return /^[24][0245689]T/.test(u) || /^L5T/.test(u);
}
//  ★ 4.15 (§7.8-⑨ · Fable 판정 2026-10-09 «고른 쪽이 이긴다 — 표식 전부»): 검수사가 고른 규격(iso_pick)이면 규격초과(oog) 표식도 고른 규격을 따른다 — 한 벌.
//    고른 규격이 FR·OT 면 EDI 의 oog 그대로, 그 밖(드라이·탱크·리퍼)이면 없음. EDI 파서가 FR·OT 장비코드에 oog 를 켜서(종전) 드라이로 골라도 카고플랜·별첨에 OT 로 남았다.
//    부르는 곳 — 병합 다섯(VoyagePage·SearchPanel·PrintHubModal·미르 펼치기·마감텔리 ptkContainers). r = records 행(fbPickIso 가 쓴 iso·fr·ot).
export function isoPickOog(r, ediOog) {
  if (!r || !r.iso_pick) return !!ediOog;
  return (r.fr || r.ot || isFlatRackIso(r.iso) || isOpenTopIso(r.iso)) ? !!ediOog : false;
}
export function isFlatRackContainer(c) {
  if (!c) return false;
  if (c.fr) return true;
  //  ★ 4.15 (검수사 2026-10-09 §7.8-⑨ · 감사 368): 검수사가 실물을 보고 규격을 고른 컨(iso_pick)은 **고른 규격이 말한다** — EDI 장비코드(tp «FR40»)가 이기지 않는다.
  //    종전엔 OT·TK 를 골라도 tp 때문에 베이플랜·카고플랜·별첨 표식이 FR 로 남았다. 고른 값은 records 의 iso·fr 이고 화면 병합(VoyagePage·SearchPanel·PrintHub)·미르 펼치기가 그것을 EDI 위에 얹는다.
  if (c.iso_pick) return isFlatRackIso(c.iso);
  return isFlatRackIso(c.iso) || isFlatRackIso(c.tp);
}

/* ─────────────────────────────────────────────────────────────────────────
   3.25: 리퍼 온도 판정 — **한 벌** (규범 §4-4)
   검수사 확정 2026-09-07 —
     «비교 대상이 없어서입니다. 수기로 넣어도 맞는지 틀리는지 확인 방법이 없습니다.
      그래서 리스트의 온도가 필요한 것입니다. … 실제온도만 기록하면 확인이 안됩니다.»
     «셋팅온도가 리스트로 오면 온도 미입력 경고는 사라지고, 실제온도가 들어오지 않으면
      사진 촬영 또는 검증이 안 되었다는 경고가 나와야 합니다.»
   ⇒ 검수의 산출물은 온도가 아니라 «세팅과 검사의 차이»다. 상태는 셋이다.
     A 기준없음  — 기준(세팅)이 없다. 잴 잣대가 없으니 「전부 리스트대로」를 잠근다.
     B 검증안됨  — 기준은 있고 실측이 없다. 사진이 필요하다.
     C 확인됨    — 둘 다 있다. 차이를 낸다.
   ⚠ 3.24까지 이 판정이 **열 곳에 따로** 있었고 조건이 서로 달랐다(어떤 곳은 c.fe==='F' 만,
     어떤 곳은 fe 미상 포함). 그래서 같은 항차를 화면마다 다르게 셌다. 여기 한 벌만 둔다. */
/*  ★ 3.70-01 — **온도 대상에서 빼는 컨 한 벌** — 'rfdry'(리퍼드라이·넌플러그) | 'mkcon'(특수제작컨) | 'lugg'(수화물) | ''.
    수화물 — 검수사 2026-09-30 «RZOR에서 수화물이 온도 없는 수화물 리퍼인데 온도 미입력 대상으로 알림을 띄웁니다 …
    수화물 컨테이너 전 항차에서도 온도 입력이 있었는지 확인하고 그떄도 미입력이면 온도 입력 대상에서 제외».
    실측 — RZOR 보관소 42항차: 수화물 컨 CICU9635360(20RF·22R1)은 R097E~R106E 양하 9번·선적 8번 **온도 기록 0**(설정·실측 모두 빈칸),
    매번 E 로 와서 저절로 빠졌다. R107E 는 EDI 에 없고 CNTR_List 에만 있어 F/E 가 비어 «풀일 수도 있는 리퍼» 로 잡혔다.
    진단(diagnostics)의 «수화물은 어느 검사에서도 검증 대상이 아니다»(검수사 확정 1.56-03)와 같은 뜻.
    ⚠ 수화물 표시(lugg)는 화면 목록이 붙인다(tagForecastMarks — forecast.luggageCns · 덱플랜 LUG). 제 목록을 따로 만드는 곳은 거기서도 붙여야 한다. */
export function reeferTempExempt(c) {
  if (!c) return '';
  if (c.rfdry) return 'rfdry';
  if (c.mkcon) return 'mkcon';
  if (c.lugg || isLuggageCn(c.cn)) return 'lugg';
  return '';
}
export function reeferTempOf(c) {
  const off = { target: false, state: 'none', set: '', act: '', diff: null };
  if (!c) return off;
  if (!isReeferContainer(c)) return off;
  if (reeferTempExempt(c)) return off;                        // 리퍼드라이(넌플러그)·특수제작컨·수화물(3.70-01)은 온도 대상이 아니다
  if (!(c.fe === 'F' || c.fe === '' || c.fe == null)) return off;   // 리퍼는 «풀일 때만» 리퍼다
  const t = (v) => (v == null ? '' : String(v).trim());
  //  기준(세팅) — 검수원이 넣은 rfSet 이 먼저, 없으면 리스트·EDI 가 준 tmp.
  //  ⚠ rfAct(실측)는 기준이 될 수 없다. 실측만으로는 맞는지 틀린지 확인이 안 된다(검수사 원문).
  const set = t(c.rfSet) || t(c.tmp);
  /*  실측으로 인정하는 것 — 사진 판독(photo)·손입력(manual)뿐이다.
      `rfSrc:'list'` 는 「전부 리스트대로」가 **리스트 값을 그대로 베껴 넣은 것**이라 잰 적이 없다.
      3.24 까지는 그 복사본이 rfAct 에 들어가 «차이 0 = 잘 맞는다»로 보였다 —
      2026-09-07 DXQD 19대가 실제로 그렇게 «확인 완료»가 됐다(잰 사람이 없다).
      기준(set)으로는 그대로 쓰되, **실측(act)으로는 세지 않는다.** */
  const act = (c.rfSrc === 'list') ? '' : t(c.rfAct);
  if (!set) return { target: true, state: 'A', set: '', act, diff: null };
  if (!act) return { target: true, state: 'B', set, act: '', diff: null };
  const a = Number(set), b = Number(act);
  const diff = (Number.isFinite(a) && Number.isFinite(b)) ? Math.round((b - a) * 10) / 10 : null;
  return { target: true, state: 'C', set, act, diff };
}

/* 항차 한 벌 요약 — 화면·마감점검·브리핑·CSV·음성이 전부 이것을 부른다.
   gapAt: 이 이상 벌어지면 «짚을 것»으로 센다(기본 1.0도 — 오늘 실측에서 ±0.5 안이 46/52 였다). */
export function reeferTempSummary(containers, gapAt = 1.0) {
  const rows = [];
  for (const c of (containers || [])) {
    const r = reeferTempOf(c);
    if (r.target) rows.push({ cn: c.cn, ...r });
  }
  const A = rows.filter(r => r.state === 'A');
  const B = rows.filter(r => r.state === 'B');
  const C = rows.filter(r => r.state === 'C');
  const gaps = C.filter(r => r.diff != null && Math.abs(r.diff) >= gapAt)
                .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  return {
    total: rows.length, rows,
    noBase: A, unverified: B, checked: C, gaps,
    nNoBase: A.length, nUnverified: B.length, nChecked: C.length, nGaps: gaps.length,
    //  화면 한 줄 — 상태가 섞이면 «더 급한 것»부터 말한다(기준없음 → 검증안됨 → 차이).
    headline: rows.length === 0 ? ''
      : A.length ? `리퍼 ${rows.length}대 · 기준 온도 없음 ${A.length}대`
      : B.length ? `리퍼 ${rows.length}대 · 검증 안 됨 ${B.length}대 — 사진 필요`
      : gaps.length ? `리퍼 ${rows.length}대 확인됨 · 차이 ${gaps.length}대`
      : `리퍼 ${rows.length}대 확인됨`,
    tone: rows.length === 0 ? '' : A.length ? 'warn' : B.length ? 'warn' : gaps.length ? 'gap' : 'ok',
  };
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

// ── 3.26: 부킹 자리(예상 EDI)와 실번호 리스트는 **같은 배를 두 번 세지 않는다** — 한 벌 ─────────────
//   검수사 2026-09-07 «상습적인 구리스트 보관과 예상EDI 컨자리 넘버와 컨넘버 중복계산».
//   실측 SWBT 2614N 선적(2615S) — 부킹 EDI 자리 316(`__BOOK_…`, 실번호 없음) + 실번호 리스트 316 인데
//   별첨2·3 이 **632**, 별첨1 이 528(남성 104대는 POD 열이 없어 빠짐), 검증박스가 «리스트에 없음 316 / EDI에 없음 316»,
//   선적 탭 목록이 543행(동진 리스트에 F/E 칸이 없어 E 자리 227이 남음)이었다. 배정 타일의 «255/316/0»만 316이 맞았다.
//   뿌리 둘 — ①2.08-11(«실번호가 가상 자리를 채우면 뺀다»)이 VoyagePage 한 곳에만 있고 **F/E 별**로 세는데 리스트에
//   F/E 가 없는 선사가 있다 ②다른 병합 경로(인쇄허브·별첨·검증박스·검색·홈·수석·마감·현황요약)는 그 규칙을 안 탄다 —
//   `__SLOT_`·빈 cn 만 걸러 `__BOOK_`(cn 이 있는 자리표)은 다 새어 나갔다.
//   ⇒ 판정을 아래 넷으로 **한 벌**로 두고 세는 자리마다 이것을 부른다. `ediContainers` 자체는 손대지 않는다 —
//     구독 문지기에서 자리를 지우는 안은 감사(다른 클로드)가 «부»로 막았다(베이플랜·자동 가이드·보관소 archive·
//     «EDI 없음» 판정 15곳이 ediContainers 를 «계획·자리·도착»으로 읽는다). 자리 그림·가이드는 그대로 자리를 본다.
//   ⇒ 별첨(카고플랜 별첨1·2·3 · 수석 보드)은 **자리가 있으면 자리(계획)가 별첨**이고 그 자리를 채운 실번호는 뺀다 —
//     «칸과 범례가 같은 표를 본다»(3.2). 리스트는 선사마다 POD·규격 칸이 비어(남성 POD 없음·동진 규격 없음) 별첨을 못 채운다.
//     검수 리스트·VGM·목록은 종전대로 실번호다. 검수사 통보 후 B안(2026-09-07).
//   ⚠ 자리 판정은 isBookingSlot + «cn 이 빈 EDI 행»(ASC PRE 는 cn:'' 로 온다 — STSE 2669E 438자리 실측).
export function isSlotEntry(c) {
  if (!c) return false;
  if (isBookingSlot(c)) return true;
  return !c.cn && (c.bay != null || c._slotKey != null);
}
//  «자리를 채우는 실번호» = EDI 에 없는 리스트 행. 병합이 `_src:'list'` 를 찍었으면 그것으로, 아니면 opts.ediMap/recMap 으로 가른다.
const _isExtraReal = (c, opts) => {
  if (!c || isSlotEntry(c)) return false;
  if (c._src === 'list') return true;
  if (c._src) return false;
  if (opts && opts.recMap && opts.ediMap) {
    const r = c.cn ? opts.recMap[c.cn] : null;
    if (!r || opts.ediMap[c.cn]) return false;
    return !(opts.mode && isOppositeDirRecord(r, opts.mode));   // 반대 방향 리스트 행(N_N 형 배)은 이 모드 자리를 채우지 않는다
  }
  return false;
};
//  여러 항차·모드가 섞인 풀(검색·미르)은 항차·모드별로 따로 센다 — 양하 리스트 행이 선적 자리를 «채운» 것으로 오인하지 않게.
//    ⚠ 모드는 **모든 행이** 갖고 있을 때만 가른다 — 수집기가 EDI 행에만 찍는 `_mode`(리스트 행엔 없음)로 가르면 자리와 실번호가 갈라진다.
const _groupKeyOf = (c, useVoy, useMode) => `${useVoy && c && c.voyageKey ? c.voyageKey : ''}|${useMode && c && c._mode ? c._mode : ''}`;
//  한 모드의 병합 목록에서 «자리»와 «자리를 채우는 실번호»를 센다.
export function bookingFillOf(items, opts) {
  const slots = [], extra = [];
  for (const c of items || []) {
    if (!c) continue;
    if (isSlotEntry(c)) slots.push(c);
    else if (_isExtraReal(c, opts)) extra.push(c);
  }
  return { slots, extra, filled: slots.length > 0 && extra.length >= slots.length };
}
const _byGroup = (items, fn) => {
  const list = items || [];
  const useVoy = list.length > 0 && list.every(c => c && c.voyageKey);
  const useMode = list.length > 0 && list.every(c => c && c._mode);
  const keys = new Set(list.map(c => _groupKeyOf(c, useVoy, useMode)));
  if (keys.size <= 1) return fn(list);
  const keep = new Set();
  for (const k of keys) fn(list.filter(c => _groupKeyOf(c, useVoy, useMode) === k)).forEach(c => keep.add(c));
  return list.filter(c => keep.has(c));
};
//  작업 목록·대수용 — 2.08-11 정본을 한 벌로. 실번호가 자리 **총수**를 채우면 자리 전부, 부분이면 F/E 별(종전).
export function dropFilledBookingSlots(items, opts) {
  return _byGroup(items, (list) => {
    const { slots, extra, filled } = bookingFillOf(list, opts);
    if (!slots.length) return list;
    if (filled) return list.filter(c => !isSlotEntry(c));
    const feOf = (c) => (c && c.fe === 'E' ? 'E' : 'F');
    const cnt = { F: { real: 0, slot: 0 }, E: { real: 0, slot: 0 } };
    slots.forEach(c => { cnt[feOf(c)].slot++; });
    extra.forEach(c => { cnt[feOf(c)].real++; });
    return list.filter(c => !(isSlotEntry(c) && cnt[feOf(c)].slot > 0 && cnt[feOf(c)].real >= cnt[feOf(c)].slot));
  });
}
//  별첨용 — 자리가 있으면 자리(계획)를 세고, 그 자리를 채운 실번호는 자리 수만큼 뺀다(남는 실번호는 계획 밖 추가분이라 센다 —
//    어느 컨이 계획 밖인지는 셈으로 알 수 없어 뒤에 온 행이 남는다).
export function legendItemsOf(items, opts) {
  return _byGroup(items, (list) => {
    const { slots, extra } = bookingFillOf(list, opts);
    const n = Math.min(slots.length, extra.length);
    if (!n) return list;
    const drop = new Set();
    for (const c of extra) { if (drop.size >= n) break; drop.add(c); }
    return list.filter(c => !drop.has(c));
  });
}
//  한 항차 섹션의 채움 상태 — 검증박스·홈 카드·수석 카드가 «부킹 자리 N · 실번호 M» 을 말할 때 쓴다.
//    실번호는 이 방향 리스트(ownDirCns)에서 EDI 실번호와 겹치지 않는 것만 센다.
//  ★ 4.22-01 — **부킹 자리 «채움» 은 선적에만.** 검수사 2026-10-10 12:11 «KBTR 양하인데 갑자기 183이 튀어나온이유는 선적이면 모르겠지만 앵하에 부킹자리가 왜 필요한지?»
//    실측 KBTR 2608E 양하 EDI(INC PRE)에 컨번호 없는 자리 8줄(5·7·18베이 08단 · EQD 없음)이 `__SLOT_` 행으로 남아, 이 함수가 양하에도 자리 8 을 내어
//    검증 상자 «EDI 평택 183»(= 175 + 8) · 부킹 줄 · 홈 카드 완성율 분모 183 이 됐다. 3.26 규칙은 선적(SWBT 2614N 부킹 EDI)용이다(Fable 판정).
//    양하는 null — 호출부(검증 상자·홈 카드·수석 카드)는 종전 «자리 없음» 경로. 자리 그림(베이플랜 📝 대기)·dropFilledBookingSlots 는 그대로.
export function bookingFillOfSec(sec, mode) {
  if (mode !== 'loading') return null;
  const edi = (sec && sec.ediContainers) || {};
  const slotKeys = Object.keys(edi).filter(k => isSlotEntry(edi[k]));
  if (!slotKeys.length) return null;
  const ediCns = new Set(Object.values(edi).map(e => e && e.cn).filter(cn => cn && !String(cn).startsWith('__')));
  const real = ownDirCns((sec && sec.records) || {}, mode).filter(cn => cn && !String(cn).startsWith('__') && !ediCns.has(cn)).length;
  return { slots: slotKeys.length, real, filled: real >= slotKeys.length };
}

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
  if (reeferTempExempt(c)) return false;   // 3.70-01: 수화물도 온도·사진 대상 아님(판정 한 벌)
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
  //   ※ 3.60-10: isReeferIso 가 L5R 계열(45ft 리퍼 알파표기)도 리퍼로 본다(진단 M6 — 판정 한 벌).
  //     종전엔 이 ISO403 규칙에만 `/^L5R/` 조건이 따로 있었다 — 한 벌로 들어가 따로 둘 까닭이 없어졌다.
  if (!isReeferContainer(c)) return false;
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

/** ★ 3.60-11 (진단 M10) — 베이플랜 칸의 규격 글자 한 벌.
 *  파서 tp 는 BAPLIE 에서 길이만 보고 적는다(22→«20'GP» · 45→«40'HC») — 그래서 22R1·2230·45R1·4530 리퍼와 OT·FR·TK 가 «GP/HC» 로 찍혔다.
 *  ISO 가 특수(RF·RH·FR·OT·TK)라 말하는데 tp 가 그 종류를 모르면 ISO 쪽을 쓴다(BAPLIE 식 «20'…» 이면 같은 모양으로).
 *  종류는 한 벌 판정(FR→리퍼→OT→TK)으로 정하고, tp 가 **같은 종류**를 말하면(ASC «RF40»·«40HR» 등) 종전 그대로 둔다.
 *  실데이터 픽스처 대조 173칸이 바뀌고 전부 특수 규격 바로잡음(3.60-11 감사 — 9,099 조합에서 칸 표식과 어긋나는 칸 0). */
export function bayCellTypeLabel(c) {
  if (!c) return '';
  const lbl = String(isoToLabel(c.iso) || '');
  const len = (lbl.match(/^(20|40|45)/) || [])[1] || '';
  //  종류는 한 벌 판정으로 — FR 이 먼저(4583·4584·426x·436E 는 FR · 파서 tp 는 4583 에 «40'RF» 를 준다, 3.60-11 감사).
  const kind = isFlatRackIso(c.iso) ? 'FR'
    : isReeferIso(c.iso) ? (/RH$/.test(lbl) ? 'RH' : 'RF')
    : (isOpenTopIso(c.iso) || /OT$/.test(lbl)) ? 'OT'
    : (isTankIso(c.iso) || /TK$/.test(lbl)) ? 'TK' : '';
  const tp = c.iso_pick ? '' : String(c.tp || '').toUpperCase();   // 4.15 (§7.8-⑨): 검수사가 고른 규격(iso_pick)이 EDI 장비코드 tp 를 이긴다 — 칸 글자도 고른 규격으로
  const tpKind = /FR|PL|FP/.test(tp) ? 'FR' : /RF|RH|HR|RE/.test(tp) ? 'R' : /OT|OP/.test(tp) ? 'OT' : /TK/.test(tp) ? 'TK' : '';
  const same = kind === tpKind || (tpKind === 'R' && (kind === 'RF' || kind === 'RH'));
  if (kind && len && !same) {
    if (/^\d\d'/.test(tp)) return `${len}'${kind}`;   // BAPLIE 식 표기는 같은 모양으로
    return ({ '20RF': 'RF20', '40RF': 'RF40', '40RH': 'RFHC', '20FR': 'FR20', '40FR': 'FR40', '20OT': 'OT20', '40OT': 'OT40', '20TK': 'TK20', '40TK': 'TK40' })[len + kind] || `${len}${kind}`;
  }
  return isoToPdfLabel(c.iso, tp);
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
      else if (isTermOtL(cur.iso)) cur.tp = "40'HC";   // 4.25-01 — L5U0(오픈탑)은 터미널이 45UT(40피트 하이큐브 오픈탑)로 읽는다 — 45U1 과 같은 글자(isTermOtL 한 벌)
      else if (/^(95|L5)/.test(cur.iso)) cur.tp = "45'HC";   // 4.18-02 — 진짜 45피트(950E·9500·L5G1·L5GE)는 규격 글자가 비어 있었다(OBWH 2762W 엠티 44대 · RZOR L5G1) — 화면 곳곳이 tp 를 먼저 읽는다
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

//  ★ 4.15 — 적공(fe)에 맞춰 규격 끝 글자(E·F)를 맞추되 **규격 라벨이 바뀌면 그대로 둔다** — 한 벌(리스트 파서 3.60-13 · ASC 파서 4.15).
//    `40RH` 엠티가 `40RE`(= 40RF 보통 리퍼)로, `40HR`(리퍼) 엠티가 `40HE`(드라이)로 바뀌던 것. 적공은 fe 가 말한다(§7.1 «규격 끝 글자로 적공을 추정하지 않는다»).
export function feSyncedIso(iso, fe) {
  if (!iso || iso.length < 4) return iso;
  const last = iso[iso.length - 1];
  const to = (fe === 'E' && last !== 'E') ? iso.slice(0, -1) + 'E'
    : (fe === 'F' && last === 'E') ? iso.slice(0, -1) + 'F' : '';
  return (to && isoToLabel(to) === isoToLabel(iso)) ? to : iso;
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
    //  ★ 4.15 (§7.8-⑥ Fable 판정 2026-10-09): 무게 칸이 두 자리 + 공백(«45GP90 F»·«22GP40 F»)이어도 규격 4자리를 읽는다 — 종전엔 세 자리만 받아
    //    KBTR 2606E 양하 ASC(ASC604_IHP_2606E_CNSHK_KBTR.asc) 20줄의 규격이 비고 마감텔리가 그 행을 20' 로 셌다. 무게는 종전처럼 100kg 단위(90 → 9,000kg).
    let mSpec = typeBlock.match(/^(FR40|FR20|OT40|OT20|PL40|PL20)(\d{2,3})\s?([FE])/);
    let m1 = typeBlock.match(/^([A-Z]{2}\d{2})(\d{2,3})\s?([FE])/);
    let m2 = typeBlock.match(/^(\d{2}[A-Z]{2})(\d{2,3})\s?([FE])/);
    let m4 = typeBlock.match(/^([A-Z]{4})(\d{2,3})\s?([FE])/);
    //  3.60-22 (DJCT 0219E 셰코우 ASC «(REVISED)DJCN 0219E SHK.ASC» 실측 — 규격 칸이 «DC4H»·«RF4H»(4자리 중 셋째가 숫자, 넷째가 H = 하이큐브)라
    //    m1(글자2+숫자2)·m4(글자4) 어느 쪽에도 안 걸려 iso 가 비고 마감텔리가 HC 353대를 전부 20' 로 셌다. 종류 2자 + 크기 한 자리 + H 를 읽는다.
    let m3 = typeBlock.match(/^([A-Z]{2})([24])H(\d{2,3})\s?([FE])/);   // 4.15: 무게 두 자리도(위 줄들과 같은 규칙)

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
    } else if (m3) {
      tp = m3[1] + m3[2] + 'H'; fe = m3[4];
      const _hc40 = m3[2] === '4';
      const _kd3 = m3[1];   // 감사 N-2: RF/RH 리퍼 · OT/OP 오픈탑 · FR/PL 플랫 · TK 탱크 표식을 지우지 않는다(실측 파일에는 DC·RF 뿐)
      iso = /^R[FH]$/.test(_kd3) ? (_hc40 ? '45R1' : '25R1') : /^O[TP]$/.test(_kd3) ? (_hc40 ? '42U1' : '22U1') : /^(FR|PL)$/.test(_kd3) ? (_hc40 ? '42PF' : '22PF') : _kd3 === 'TK' ? (_hc40 ? '42T6' : '22T6') : (_hc40 ? '45GP' : '25GP');
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      wt = wtMatch ? parseInt(wtMatch[1]) : parseInt(m3[3]) * 100;
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
    //  ★ 4.15 (검수사 2026-10-09 §7.8-⑩ «엠티는 엠티이다, 그래도 따로 구분은 한다» · 감사 374): 끝 글자를 바꾸면 규격 라벨이 달라지는 코드는 그대로 둔다.
    //    `40HR`(리퍼) 엠티가 `40HE`(드라이 하이큐브 엠티)가 되어 리퍼 표식(rf)·카고플랜 RE·엠티실 규격 45RE 를 잃던 것(STSE 2669E 선적 ASC 41칸 실측).
    //    엠티로 세는 것은 fe 가 한다(§7.1). 판정은 리스트 파서(3.60-13)와 같은 한 벌 `feSyncedIso`.
    isoFinal = feSyncedIso(isoFinal, feFinal);

    // M6.48: 추가 메타 자동 추출 — universal_asc_analyzer 참조
    //   1) 리퍼 온도: -25C, +05C 등 (RF 컨테이너만, -30~+30 현실 범위)
    //   2) OOG 감지: 'AK' 토큰 (FR/OT의 out-of-gauge 표시)
    //   3) OOG 치수: AK 다음 6자리 숫자
    //   4) routeCode: 끝 10-11자 영문 (POL+VIA+POD)
    //  2.97: 시작을 52 로 넓힌다 — 실측 STMJ 2651E 에서 `AK` 는 **컬럼 53** 이라
    //   종전 substring(54) 은 'K' 부터 읽어 `\bAK\b` 가 **한 건도 안 걸렸다**(OOG 전량 누락).
    //   넓혀도 타입 블록 끝 두 글자만 더 들어올 뿐, 온도 정규식(`-?\d{3}C`)과 겹치지 않는다.
    const metaArea = line.substring(52).trim();
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
    // ── TallyOne 2.97: **OOG 치수를 제대로 읽는다.** (검수사 자료 2026-08-31 STMJ 2651E) ──
    //   검수사 — *"여러칸을 먹기도 합니다. 보통은 좌우로 각 1칸 이내입니다.
    //             그래서 치수를 리스트에 적어 달라고 했던것입니다"*
    //   종전 `/AK\s*(\d{6})/` 는 **한 건도 못 잡았다**(실측 null). AK 뒤에 오는 것은
    //   6자리가 아니라 **높이 3자리 → 공백 → 좌 3자리 + 우 3자리** 다.
    //   실측 STMJ 2651E ASC — 컬럼 고정: 53=AK · 92=높이(cm) · 101=좌(cm) · 104=우(cm)
    //     100106 SITU0407230 … 40FP145F AK      149      062062   → 높이 149 · 좌 62 · 우 62
    //     180006 SITU0406300 … 40FP212F AK      005      072072   → 높이  5 · 좌 72 · 우 72
    //   좌우 62~97cm 는 칸 폭(8ft=244cm) 안이라 좌우 한 칸씩 — 종이 베이플랜 그림과 일치한다.
    //   ⚠ 컬럼이 밀린 자료를 대비해 정규식 폴백을 함께 둔다(고정 컬럼 → 실패 시 패턴).
    const oog = /\bAK\b/.test(metaArea);
    let oogDim = '', oogH = 0, oogL = 0, oogR = 0;
    if (oog) {
      const num = (v) => { const n = parseInt(String(v).trim(), 10); return Number.isFinite(n) ? n : 0; };
      oogH = num(line.substr(92, 3));
      oogL = num(line.substr(101, 3));
      oogR = num(line.substr(104, 3));
      if (!oogH && !oogL && !oogR) {
        // 폴백 — AK 뒤 «3자리 … 6자리» 또는 «6자리» 어느 쪽이든 받는다.
        const m2 = metaArea.match(/AK\s+(\d{3})\s+(\d{3})(\d{3})/);
        if (m2) { oogH = num(m2[1]); oogL = num(m2[2]); oogR = num(m2[3]); }
        else {
          const m1 = metaArea.match(/AK\s+(\d{3})(\d{3})/);
          if (m1) { oogL = num(m1[1]); oogR = num(m1[2]); }
        }
      }
      if (oogL || oogR) oogDim = String(oogL).padStart(3, '0') + String(oogR).padStart(3, '0');
    }
    // routeCode (끝 10-11자) — POD 백업용
    const rcMatch = line.match(/([A-Z]{10,11})\s*$/);
    const routeCode = rcMatch ? rcMatch[1] : '';
    const podFinal = routeCode.length >= 3 ? routeCode.slice(-3) : '';

    // FR/OT 자동 oog 판정 — 장비 코드만으로도 OOG 처리
    const isFROrOT = tp && (tp.startsWith('FR') || tp.startsWith('OT') || tp.startsWith('PL') || tp.startsWith('FP'));   // 2.97: 40FP(플랫랙)도 OOG 계열

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
      // 2.97: 방향별 초과(cm). **이름을 BAPLIE 와 맞춘다** — 검수 리스트·인쇄물은 `ovh/ovw` 를 읽는데
      //   ASC 파서만 따로 놀아 ASC 로 들어온 배는 치수가 통째로 비어 있었다(§0-Y-2 «없다고 말하지 않는다»).
      //   BAPLIE DIM: 5·6=길이 · 7·8=폭 · 9·13=높이 — 여기서도 같은 뜻으로 채운다.
      ovh: oogH || undefined,
      //  2.98-01: **BAPLIE 와 같은 뜻으로 넣는다.** BAPLIE DIM 7(우)·8(좌)은 합산해 ovw 를 만든다
      //    (utils 1395~1396). ASC 만 max 로 넣으면 같은 배가 두 자료로 들어올 때 값이 달라진다
      //    — 실측 STMJ 2651E SITU0403066: BAPLIE ovw 184(=92+92) vs ASC max 92.
      //    한쪽 폭이 얼마인지는 아래 oogL/oogR 로 따로 남는다(도형·칸 판정은 그것을 쓴다).
      ovw: (oogL + oogR) || undefined,
      oogL, oogR,            // 좌·우를 따로 알아야 어느 쪽 칸을 먹는지 그린다
      routeCode,
      podFinal,
    });
  }
  return stampEdiSeq({ vsl, voy, serviceCode, containers });
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
//  ★ 3.52 — **SOC 가 있는 배는 선사 기준을 세관리스트로 한다** (검수사 확정 2026-09-15).
//    세관리스트 맨 끝 열이 «선사부호» 다(실측 TMPZ 2027E — `TJMS` 284 · `EASK` 44, SOC 는 0건).
//    그런데 이 파서가 그 칸을 안 읽고 `op:''` 로 버려서 선사는 EDI 의 `NAD+CA` 만 보고 있었다.
//    ⚠ **EDI 선사 칸에는 선사 코드가 아닌 값이 온다** — 실측 `SOC`(화주 소유 컨 표식 · 2027E 5대 · 2019E 1대) ·
//      `OLL`(2026E 1대, 원문 `50:HNKU6269723:45G1:F:0100784:…:OLL::`). 배마다 «그 코드는 이 선사» 를
//      손으로 박으면 다음 코드에서 또 샌다. **세관리스트를 기준으로 두면 한꺼번에 잡힌다.**
//    코드 정규화는 이 파일의 `normalizeCarrierCode` 한 벌(TJMS→TJM · EASK→EAS · 모르는 4자는 앞 3자).
//    ⚠ 다만 **그냥 덮지 않는다** — `pickCarrierOp` 가 «더 자세한 쪽» 을 고른다(세관이 뭉친 DWS 가
//      EDI 의 자식 DSL·CSC 를 덮지 않는다). 그 함수를 지나는 자리는 연막 `smoke_opalias` ⑨ 가 센다.
//    ⚠ 3.66-01 — **기준은 세관이 아니라 그 배 마감텔리다**(검수사 «모든 선사기준은 마감 텔리로 해야 합니다»).
//      세관 선사부호는 배마다 마감텔리와 다른 이름을 쓴다(XTPG CKCO=CKL · SHIF=SIF · PCSL=DYS). 그 이름 바꾸기는 배별 사전 별칭(tallyFormats opAlias)이 한다.
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
    op: col('선사부호'),                 // 3.52: 선사 기준. 이 칸이 없는 양식이면 -1 → 종전대로 빈칸
  };
  if (ci.cn < 0 || ci.iso < 0) return null;

  //  3.47: 변환표·구조 변환은 모듈 한 벌(normalizeSpecIso)로 옮겼다 — 「고르기」가 같은 것을 부른다.
  //    ⛔ 여기에 표를 다시 두지 마라. 두 벌이 되면 파일로 올린 값과 손으로 고른 값이 갈린다.
  const toIso = normalizeSpecIso;

  const records = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const cn = String(row[ci.cn] || '').trim().toUpperCase().replace(/\s/g, '');
    if (!cn) continue;
    if (/[\u4e00-\u9fff]/.test(cn)) continue;  // 합계/한자 행 스킵

    const iso = toIso(row[ci.iso]);
    //  ★ 3.47 — **세관 규격 원문을 버리지 않는다.**
    //    검수사 2026-09-14 «세관자료와 EDI 또는 선사 자료와 규격이 틀렸는데 어느곳에서도 알림이 없었습니다» ·
    //    «확인대상이 EDI : 선사리스트 : 세관리스트 3곳입니다 … 실물을 보기전에는 확정할수 없습니다».
    //    ⚠ 사고 — 종전 변환표에 세관이 실제로 쓰는 45GP·22RE·42PC 가 없어 toIso 가 빈칸을 냈고,
    //      그 빈칸을 «빈 값은 기존을 안 덮는다» 규칙이 **EDI 값으로 메웠다.** 그래서 진단이
    //      EDI 와 EDI 를 비교하게 되어 절대 안 울렸다(ATPR 2641E 실측 — 세관이 45GP 라 한 10대가
    //      앱에는 EDI 의 42GP 로 남아 있었다). 원문을 제 칸에 그대로 남기는 것이 이 사고의 뿌리 수리다.
    const iso_customs = String(row[ci.iso] || '').trim().toUpperCase();
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
    const isOt = isOpenTopIso(isoUp);      // 3.47: utils 한 벌 — 「고르기」와 같은 판정
    const isTk = isTankIso(isoUp);

    records.push({
      cn, l4: cn.slice(-4),
      sl: seal, sl_orig: seal, eseal: '', eseal_orig: '',
      bl: ci.bl_no >= 0 ? String(row[ci.bl_no] || '').trim() : '',
      sh: '', gi: '',
      wt: 0,                            // 세관리스트엔 무게 없음(선사리스트에서 보강).
      pol, pod,
      fe,
      iso,
      iso_customs,                      // 3.47: 세관 규격 원문(가공 없음) — 3자 대조의 정본
      op: ci.op >= 0 ? (normalizeCarrierCode(String(row[ci.op] || '').trim()) || '') : '',   // 3.52: 세관 «선사부호»(3.66-01: 기준은 마감텔리 — 이름은 배별 별칭이 바꾼다)
      tsport: '', printpod: '', cargoType: '',
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
      '40OT': '42U1', '40OH': '45U1', '40TK': '45T1',   // 4.27-01: 40OT = 42U1(8'6") · 40OH = 45U1(9'6") — 검수사 2026-10-15
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
    const wt = ci.wt >= 0 ? plausibleListWtKg(row[ci.wt]) : 0;   // 4.08-02: 컨 하나 40톤 초과는 무게 없음
    const tempRaw = ci.temp >= 0 ? String(row[ci.temp] || '').trim() : '';
    const tmpMissing = tempRaw === '' || tempRaw === '-';
    const isRf = (!tmpMissing) || isReeferIso(iso);
    const isoUp = iso.toUpperCase();
    const isFr = /^[24][0245689]P/.test(isoUp) || /^45P/.test(isoUp) || /^L5P/.test(isoUp);
    const isOt = isOpenTopIso(isoUp);      // 3.47: utils 한 벌 — 「고르기」와 같은 판정
    const isTk = isTankIso(isoUp);
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

//  ★ 4.08-02 (검수사 2026-10-07 «애초부터 220톤 같은게 있었다는 자체가 문제 였습니다. 어느 장비도 들지 못하는 무게이니까요» ·
//    «그때 부터 앱이 잘못되어 가고 있었다는겁니다») — **컨테이너 하나의 무게가 40톤을 넘을 수는 없다.**
//    STSE 2677E 에서 SITC 리스트의 `Weight`(B/L 합계 — 같은 B/L 의 컨 여러 대 몫)가 컨 하나의 무게로 들어가 232.2톤·135.1톤·120.4톤 같은 값이
//    카드 합계·경보·무브 계산에 그대로 쓰였다(그 항차 records 69건이 40톤 초과). 실제 EDI 총중량의 최대는 전 항차 3,534대에서 31.1톤이다.
//    그래서 **들어오는 자리(파서·병합)에서** 40톤 초과를 «무게 없음(0)» 으로 돌려 EDI 무게가 이기게 한다(0 은 병합이 건너뛴다 — 2.52-03 문지기).
//    ⚠ `parseListWeightKg` 자체는 건드리지 않는다 — 사진 판독(mixerUpload)이 0 을 «엠티»로 읽는 길이 있어서다.
export const CONTAINER_WT_MAX_KG = 40000;
export function plausibleListWtKg(raw) {
  const w = parseListWeightKg(raw);
  return w > 0 && w <= CONTAINER_WT_MAX_KG ? w : 0;
}
//  4.08-02 감사 지적 — EDI 총중량을 `wtEdi` 로 따로 남긴다. 리스트 무게가 `wt`(화면 표시 · 규칙 1.23)를 덮어도 트윈 판정(nlSearch.twinWtOf)은 EDI 총중량을 잰다.
//    EDI 컨을 병합 맵에 처음 넣는 **모든 자리**(작업창 SearchPanel · 항차 화면 두 곳 · 전 항차 펼치기 flattenVoyages)가 이 함수 한 벌을 부른다 —
//    한 곳이라도 빠지면 «작업창 미르는 경보 19쌍 · 떠 있는 미르는 30쌍(232톤)» 처럼 같은 질문에 답이 갈린다.
export function ediWtField(c) {
  const w = parseInt(c && c.wt, 10) || 0;
  return w > 0 ? { wtEdi: w } : {};
}

//  ★ 3.50-02 (검수사 2026-09-15 SWSP 2609S — «켄슬 리스트를 받아 놓고도 왜 캔슬을 안시키고 있고 이런 알림을 띄우는지» · «선적 13개 캔슬»)
//    선사 «캔슬 리스트» 는 컨테이너 목록이 아니라 **빼라는 목록**이다. 앱 업로드 창은 엑셀이면 전부 리스트로 더했고,
//    실측 SWSP 2609S — `SWSP 2609S EMPTY 캔슬 리스트.xlsx` 13대가 records 에 더해져(EDI·배정목록은 이미 취소 반영 387)
//    «리스트에 EDI 평택과 매칭 안되는 컨 13개» 가 떴다. 파일명 판정 낱말은 수집기 amend.py `_CANCEL_WORDS` 와 같은 벌.
export function cancelListKind(name) {
  const n = String(name || '').toLowerCase();
  if (!/캔슬|캔셀|취소|cancel|cxl|cncl/.test(n)) return '';
  //  «취소반영 최종리스트»·«취소 적용 LOADING LIST» 처럼 취소를 **반영한** 리스트는 빼라는 목록이 아니다(감사 지적 — 이것을 캔슬로 읽으면 리스트가 통째로 빈다).
  //   단 «캔슬 리스트(최종)»·«FINAL CANCEL LIST» 처럼 취소 낱말이 «리스트» 와 붙은 구절이 있으면 캔슬 리스트다 — 수집기(amend.py)와 같은 판정이어야
  //   «캔슬 리스트를 올리면 빠집니다» 안내와 어긋나지 않는다. «최종·final» 만으로는 가르지 않는다(오탐은 업로드 창의 «절반 이상이 빠집니다» 확인이 막는다).
  const phrase = /(캔슬|캔셀|취소|cancel|cxl|cncl)\s*[-_(]?\s*(리스트|list|목록|분)/.test(n) || /(리스트|list)\s*[-_(]?\s*(캔슬|캔셀|취소|cancel|cxl)/.test(n);
  if (!phrase && /반영|적용|applied/.test(n)) return '';
  //  «캔슬 및 추가 리스트»·«CXL&ADD» 는 두 목록이 한 파일 — 앱은 시트를 못 가르므로 손대지 않는다(수집기 amend 가 갈라 적는다).
  if (/추가|\badd\b|&add|add\s*list/.test(n)) return 'mixed';
  return 'cancel';
}
export function isCancelListName(name) { return cancelListKind(name) === 'cancel'; }
/** 캔슬 리스트의 컨번호를 리스트 사본(cn → record)에서 뺀다 — 제자리 수정. { removed, notFound } */
export function removeCancelledFromMap(cnMap, cns) {
  const removed = [], notFound = [];
  for (const raw of cns || []) {
    const cn = String(raw || '').replace(/[\s-]/g, '').toUpperCase();
    if (!cn) continue;
    if (cnMap && Object.prototype.hasOwnProperty.call(cnMap, cn)) { delete cnMap[cn]; removed.push(cn); }
    else notFound.push(cn);
  }
  return { removed, notFound };
}

//  ★ 3.60-13 — **만능 리스트 파서 보조 한 벌**(검수사 2026-09-24 «리스트 파서는 만능 파서가 되어야 합니다. 규격이 어디에 있든
//    읽을수 있어야 합니다. 그걸 못읽어 내서 이렇게 시간을 보내는 것입니다.» · «네 수정 하세요»).
//    MAILBOX 실리스트 1,554개 전수 조사(2026-09-24)에서 **원본엔 있는데 파서가 비운 칸**을 찾아 그 자리를 읽는다.
//    원칙 ① 1차 규칙으로 이미 읽은 값은 건드리지 않고 **빈칸만** 채운다 ② 파일에 적힌 값(칸·머리말·구간 제목줄·합계표)만 쓴다 —
//    추정하지 않는다(검수사 «추정하면안되고»). 수집기 합본(merge_helper)·자동등록(autoreg_helper)도 이 파서를 쓴다.
//  2차 칸 머리 규칙 — 1차(parseListExcel 안 normHeader + 기존 패턴)가 못 찾았을 때만 쓴다(1차에서 찾은 칸은 종전 그대로).
const _LIST_HDR2 = {
  cn: [/^cont_?no$/, /^cont'?r$/, /^cont'?r no$/],
  //  동진 «Type\n/Size» · KMTC «TY»(«SZ» 와 나뉨) · 터미널 «Siz/Typ» · SKR «SZ/TP/HT» · 冷箱清单 «Container Type» · 箱型* · 세관 « 크기및규격»
  type: [/^type\/size$/, /^ty$/, /^siz\/typ$/, /^size\/type$/, /^sz\/tp\/ht$/, /^container type$/, /^箱型$/, /^크기및규격$/],
  //  XTPG «F/MT» · 是否空箱(FULL/EMPTY)
  fe: [/^f\/mt$/, /^是否空箱/],
  //  卸货港 · 最后卸港* · XTPG cntr_number_list «DIS»
  pod: [/^卸货港$/, /^最后卸港$/, /^dis$/],
  //  TDM(INBOUND CONTAINER NUMBER LIST) «WT»
  wt: [/^wt$/],
};
//  2차 머리 정규화 — 줄바꿈·공백이 «/» 둘레에 끼어도(동진 «Type\n/Size» → type/size), 별표(箱型*)가 붙어도 같은 머리로 본다.
const _normHeader2 = (s) => String(s || '').trim().toLowerCase()
  .replace(/[.,*]/g, '').replace(/[()[\]]/g, ' ')
  .replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
//  머리줄 점수 — 컨번호 말고 다른 칸 이름이 몇 개인가. 제목줄(«Container Number List»)이 진짜 머리줄을 가로채지 않게 한다.
const _HDR_ROLES = [/seal|실번호|봉인/, /type|size|^sz|^tp|^ty$|iso|규격|사이즈|타입|箱型/, /^f\/?e$|^f\/?mt$|full|empty|^fe$|적공/,
  /^pod|^pol|port|dest|양하|적재|선적항|목적|卸货|装货/, /weight|^wgt|^wt$|무게|중량|vgm|重/, /^b\/?l|bl no|booking|부킹/, /^temp|온도|冷/];
const _hdrRoleScore = (cells) => {
  let n = 0;
  for (const c of cells || []) { const h = _normHeader2(c); if (h && _HDR_ROLES.some((p) => p.test(h))) n++; }
  return n;
};
//  F/E 낱말 — 칸 이름이 없어도 값이 이것뿐이면 F/E 칸이다. «L»(T/S 로컬)·«S»(SOC)는 F/E 가 아니다.
const _FE_TOKEN = { F: 'F', FULL: 'F', LADEN: 'F', E: 'E', EMPTY: 'E', MT: 'E', MTY: 'E', EMTY: 'E' };
//  나라 두 글자(평택 항로에 나오는 나라만) — 머리말 항구 이름을 풀 때 «KOREA»·«CHINA» 같은 나라 이름을 항구로 읽지 않게.
const _LOCODE_CC = new Set(['KR', 'CN', 'VN', 'TH', 'JP', 'HK', 'TW', 'PH', 'ID', 'MY', 'SG', 'IN', 'KH', 'MM', 'BD', 'LK', 'PK', 'AE', 'SA', 'RU', 'US', 'AU']);
const _isLocode = (v) => /^[A-Z]{5}$/.test(v) && _LOCODE_CC.has(v.slice(0, 2));
//  나라 이름인데 나라 코드 두 글자로 시작해 항구 코드처럼 보이는 다섯 글자(«MUNDRA, INDIA» 의 INDIA — 감사 지적).
const _NOT_PORT_WORD = new Set(['INDIA', 'SAUDI']);
//  헤더 없는 리스트에서 항구 자리에 잡히던 다섯 글자 낱말(손상 등급·F/E 낱말). «MAJOR» 는 같은 손상 등급 칸의 셋째 값이다.
const _NOT_PORT5 = new Set(['MINOR', 'SOUND', 'MAJOR', 'EMPTY']);
//  머리말·구간 제목줄에만 나오는 항구 이름(MAILBOX 전수 조사 — 동영 «POD : KWANGYANG, KOREA» 36 · «HOCHIMINH, VIETNAM» 27 ·
//    SITC «POD: | SHIDAO» 20 · «HONGKONG, HONGKONG» 15 · «LAEM CHABANG, THAILAND» 7 · «NORTH MANILA, PHILIPPINES» 5).
//    앱 전체 항구 표(_PORT_ALIAS·normPortCode)는 건드리지 않는다 — 이 표는 리스트 파서만 쓴다.
const _LIST_PORT_NAMES = {
  KWANGYANG: 'KRKAN', HOCHIMINH: 'VNSGN', LAEMCHABANG: 'THLCH', SHIDAO: 'CNSHD', HONGKONG: 'HKHKG', NORTHMANILA: 'PHMNN',
};
//  항구 이름·코드 → 다섯 글자 UN/LOCODE. 못 풀면 빈칸(지어내지 않는다). «TAICANG,NANTONG» 처럼 항구가 둘이면 버린다.
function _listPortCode(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const parts = s.split(/[,/]/).map((x) => x.trim()).filter(Boolean);
  //  항구 이름표를 먼저 본다 — normPortCode 는 다섯 글자면 코드로 돌려줘 «BUSAN»(9구간 실측)이 KRPUS 로 안 풀렸다.
  const hits = parts.map((x) => { const c = x.toUpperCase().replace(/[\s.]+/g, ''); return _LIST_PORT_NAMES[c] || _PORT_ALIAS[c] || normPortCode(x); }).filter((c) => _isLocode(c));
  if (new Set(hits).size !== 1) return '';
  if (_NOT_PORT_WORD.has(hits[0])) return '';
  return hits[0];
}
//  구간 제목줄·머리말의 항구 선언 — «POD : KWANGYANG, KOREA» · «POL: KRPTK     POD: VNHPH» · «DISCHARGING PORT [DALIAN, CHINA]» ·
//    칸이 나뉜 «POD :» | «KRPTK». 반환 [{ row, pod, pol }] — 줄 순서대로. 머리줄·데이터 줄은 부르는 쪽이 뺀다(skipRow).
function _ctxPortDecls(grid, skipRow) {
  const out = [];
  for (let r = 0; r < (grid || []).length; r++) {
    if (skipRow(r)) continue;
    const cells = (grid[r] || []).map((v) => String(v == null ? '' : v).trim());
    if (!cells.some(Boolean)) continue;
    const text = cells.filter(Boolean).join(' | ');
    if (!/POD|POL|DISCHARG|LOADING\s*PORT/i.test(text)) continue;
    //  said = 이 줄이 그 항구를 **말했는가**(값을 못 풀었어도). 새 구간이 말했는데 못 풀었으면 앞 구간 값을 이어 쓰지 않는다.
    const found = { POD: '', POL: '' }, said = { POD: false, POL: false };
    for (const key of ['POD', 'POL']) {
      const re = new RegExp('\\b' + key + '\\s*[:：]\\s*([A-Za-z][A-Za-z0-9 .,\'/-]{1,40}?)\\s*(?=$|\\||\\s{2,}|\\b(?:POD|POL|SAILING|ETD|ETA|ETB|DATE|VSL|VOY)\\b)', 'i');
      const m = text.match(re);
      if (m) { said[key] = true; found[key] = _listPortCode(m[1]); }
      if (!found[key]) {
        for (let c = 0; c < cells.length; c++) {
          if (!new RegExp('^' + key + '\\s*[:：]$', 'i').test(cells[c])) continue;
          const nx = cells.slice(c + 1).find(Boolean);
          if (nx) said[key] = true;
          const p = nx ? _listPortCode(nx) : '';
          if (p) { found[key] = p; break; }
        }
      }
    }
    if (!found.POD) { const m = text.match(/DISCHARG(?:ING|E)\s*PORT\s*[[:：]\s*([^\]|]+)/i); if (m) { said.POD = true; found.POD = _listPortCode(m[1]); } }
    if (!found.POL) { const m = text.match(/LOADING\s*PORT\s*[[:：]\s*([^\]|]+)/i); if (m) { said.POL = true; found.POL = _listPortCode(m[1]); } }
    if (said.POD || said.POL) out.push({ row: r, pod: found.POD, pol: found.POL, saidPod: said.POD, saidPol: said.POL });
  }
  return out;
}
//  한 줄(r) 앞에서 가장 가까운 선언 값 — 구간(페이지·POD 묶음)마다 제 선언을 쓴다. 새 구간이 그 항구를 말했으면 못 풀었어도(«TAICANG,NANTONG») 거기서 끊는다.
function _ctxPortAt(decls, r, key) {
  let v = '';
  const sk = key === 'pod' ? 'saidPod' : 'saidPol';
  for (const d of decls) { if (d.row >= r) break; if (d[sk]) v = d[key]; }
  return v;
}
//  F/E 합계 — 동진 양식 머리말 «Cargo Type : | Full - | N | Empty - | M» 와 리스트 밑 합계표(TOTAL · LOC · T/S · MTY …).
//    검수사 2026-09-24 «동진 파일에는 리스트 밑에 합계표가 있습니다. 거기에 나와 있을것입니다».
//    반환 { head:{full,empty}|null, table:{full,empty}|null } — 합계표는 «GRAND TOTAL» 뒤 표, 없으면 표들의 합.
function _listFeSummary(grid) {
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : NaN; };
  let head = null;
  const tables = [];
  let grandFrom = -1;
  for (let r = 0; r < (grid || []).length; r++) {
    const cells = (grid[r] || []).map((v) => String(v == null ? '' : v).trim());
    const up = cells.map((c) => c.toUpperCase());
    if (!head && up.some((c) => /^CARGO\s*TYPE\s*:?$/.test(c))) {
      const at = (re) => { const i = up.findIndex((c) => re.test(c)); if (i < 0) return NaN; for (let j = i + 1; j < cells.length; j++) if (cells[j] !== '') return num(cells[j]); return NaN; };
      const f = at(/^FULL\s*-?$/), e = at(/^EMPTY\s*-?$/);
      if (Number.isFinite(f) && Number.isFinite(e)) head = { full: f, empty: e };
    }
    if (up.some((c) => /^GRAND\s*TOTAL\s*:?$/.test(c))) grandFrom = r;
    const iT = up.indexOf('TOTAL'), iM = up.indexOf('MTY');
    if (iT >= 0 && iM >= 0 && up.indexOf('LOC') >= 0) {
      let full = 0, empty = 0, n = 0;
      for (let k = r + 1; k < Math.min(grid.length, r + 8); k++) {
        const cs = (grid[k] || []).map((v) => String(v == null ? '' : v).trim());
        const lab = cs.find((c) => /^(20|40|45)'?$|^40\s*HC$|^45\s*HC$/i.test(c));
        if (!lab) break;
        const t = num(cs[iT]), m = num(cs[iM]);
        if (!Number.isFinite(t) || !Number.isFinite(m)) break;
        full += t - m; empty += m; n++;
      }
      if (n) tables.push({ row: r, full, empty });
    }
  }
  let table = null;
  if (tables.length) {
    const g = grandFrom >= 0 ? tables.filter((t) => t.row > grandFrom) : [];
    if (g.length) table = { full: g[0].full, empty: g[0].empty };
    else if (tables.length === 1) table = { full: tables[0].full, empty: tables[0].empty };
    else table = tables.reduce((a, t) => ({ full: a.full + t.full, empty: a.empty + t.empty }), { full: 0, empty: 0 });
  }
  return { head, table };
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
    //  ★ 3.60-14 (검수사 «전부 파서 문제 입니다» — 카토스·터미널 자료는 이상 없다): 카토스 «검수 입력» 엑셀은 씰이
    //    «CLL carrier seal»(선적)·«하선신고서 carrier seal»(양하) 칸이다. 이 머리를 몰라 «컨번호 옆 칸 자동 탐색»이 바로 옆
    //    «Cell Position»(선내위치 010004)을 원실로 읽었다(2616N 폴더의 NSFR 2617S 카토스 파일 BEAU2929722 → 010004 · 실제 KSC886285 ·
    //    MCSC 635S 합본 원실 = 셀 위치 · 양하 카토스 SWTD 9012E·PCSZ 2625E·NSFR 2616N 1,409줄). «Carrier re-seal»·«Customs Seal» 은 걸리지 않는다.
    /(^|\s)carrier\s*seal$/,
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
    if (/^(RF|REEF|REEFER)$/.test(c)) return prefix + 'R1';
    if (/^(RH|RHC|RFHC)$/.test(c)) return prefix === '42' ? '45R1' : (prefix + 'R1');   // 3.60-03: RH = 하이큐브 리퍼(«40 / RH» 분리열이 42R1 로 떨어지던 것)
    if (/^(TC|TK|TANK)$/.test(c)) return prefix + 'T6';
    if (/^(OT|OPEN|OP)$/.test(c)) return prefix + 'U1';
    if (/^(FR|PL|PF|PC|FLAT|FLATRACK)$/.test(c)) return prefix + 'P1';   // 3.60-13: PC(플랫폼 — 천경 CLL «42»+«PC» 16대 규격 빈칸)
    if (/^(BU|BULK)$/.test(c)) return prefix + 'B0';
    return '';
  };
  //  2.98-13 (BUG-2026-005): sizeCodeMode = 이 시트 SIZE 열이 ISO 크기코드 표기(22/42/45=40HC)라는 판별.
  //    같은 «45»가 피트 표기(20/40/45)면 45피트, 크기코드 표기면 40피트 9'6"(40HC)다.
  const deriveIso = (sizeRaw, typeRaw, sizeCodeMode) => {
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
    //  ★ 3.60-16: «45HC» 는 진짜 45피트다 — 세관 별칭표(_SPEC_ALIAS '45HC':'L5G1')와 같은 뜻. 종전엔 아래 1) 이 «45HC» 를 ISO 모양으로
    //    그대로 받아 isoToLabel('45HC') = 40HC 가 됐다(RZOR R104E CNTR_List «Type» 45HC 2대 NHFU6000257·NHFU9000327 — 선사 덱플랜
    //    «45 HC F»(40 HC 와 구분) · 예배 «45HC*1» · 적재 80.2CBM(40HC 최대 76.4) · 세관 적하목록 45HC → 앱이 L5G1). 같은 글자를 자료마다
    //    두 뜻으로 읽던 것. 검수사 2026-09-25 «2. 수정». MAILBOX 1,492개 전수 — 바뀌는 컨 121대 전부 45HC→L5G1(OBWH 긴급화물·XRAY 목록 · RZOR CNTR_List ·
    //    DXQD 2632E · STMJ 2632W), EDI 대조 OBWH 2739E·DXQD 2632E L5G1. «45GP»·«45RE»·«45G1» 은 종전 그대로 40피트 하이큐브다.
    for (const v of [tp, sz]) if (v === '45HC') return 'L5G1';
    // 1) 입력 자체가 표준 ISO (42HQ, 22G1, L5G1 등)
    for (const v of [tp, sz]) {
      if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$|^L\d[A-Z]\d$/.test(v)) return v;
    }
    //  ★ 3.60-13 (만능 파서 — 전수 조사): ①옛 ISO 숫자 규격(2210·4510·4530 — EAS·SITC CLL «ISO»·세관 « 크기및규격» 3,399줄 빈칸).
    //    이 함수엔 규격 칸 값만 들어오므로 무게와 섞이지 않는다. **앱 라벨(isoToLabel)이 바르게 푸는 꼴만** 받는다 —
    //    22·42·45 의 일반(0x·1x) · 22·45 의 리퍼(3x) · 22 의 탱크(7x). 43xx(4310 은 세관 42GP — PCSZ 2628E EAXU4003019)·
    //    플랫(x6x — 4261·2260 은 세관 42PC·22PC, SWTD 9012E)·42 리퍼(4232)는 라벨이 틀리게 나오므로 비워 둔다(감사 지적 2026-09-24).
    //    ②장비코드 DCHC·OTHC·RFHC(KKAK·KKLC 컨 리스트 923대) ③길이+종류+높이 «40GP96»(SKR «SZ/TP/HT» — 96 = 9'6").
    for (const v of [tp, sz]) {
      if (/^(22|42|45)[01]\d$|^(22|45)3\d$|^227\d$/.test(v)) return v;
      if (/^(DC|GP|HQ)HC$/.test(v)) return '45G1';
      if (/^(RF|RE|RH)HC$/.test(v)) return '45R1';
      if (v === 'OTHC') return '45U1';
      if (/^(FR|PL|PF)HC$/.test(v)) return '45P1';
      const h = v.match(/^(20|40|45)(GP|DC|HC|RF|RE|RH|OT|FR|PL|TK)(86|96)$/);
      if (h) { const r = composeIso(h[1] === '40' && h[3] === '96' ? '40HC' : h[1], h[2]); if (r) return r; }
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
      if (/^(4HOT|45OT|40OH|45UT)$/.test(v)) return '45U1';   // 4.27-01: 9'6" 오픈탑(4H = 40HC)
      if (/^(40OT|42OT|42UT)$/.test(v)) return '42U1';        // 4.27-01: 40OT = 42U1(8'6") — 검수사 2026-10-15 14:29
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
      //  2.98-13 (검수사 실측 XTPG 0538W CLL 천경1): SIZE «45» 43대가 전부 L5GE(45피트)로 읽혀
      //    EDI 45GE(40HC)와 «규격 다름 43건» 허수 경고 — 45피트는 그 배에 한 대도 없었다.
      //    같은 열의 20피트가 «22»로 적혀 있으면 이 열은 ISO 크기코드다(22·42피트 컨은 세상에 없다).
      else if (/^45/.test(sz)) lenS = sizeCodeMode ? '40HC' : '45';
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
    //  ★ 3.60-13: 제목줄(«Container Number List …» — XTPG cntr_number_list 16개·TDM 6개 실측)이 머리줄을 가로채지 않게,
    //    컨번호 낱말이 있는 줄 가운데 **다른 칸 이름(실·규격·F/E·항구·무게·B/L·온도)이 첫 후보보다 2개 이상 많은 줄**로 옮긴다.
    //    첫 후보가 진짜 머리줄이면 종전 그대로다(반복되는 페이지 머리줄은 점수가 같아 안 옮긴다).
    //  ★ 3.60-13: 2차 컨번호 머리(«CONT'R»·«CONT_NO» — MCSC LIST 가 CELL(베이 자리 300506)을 실번호로 읽던 양식)는
    //    **종전에 헤더 없는 시트로 읽히던 자리에서만** 쓴다(1차 머리가 없고 정식 시트가 아직 없을 때). 그렇게 읽은 시트는
    //    정식 시트로 치지 않는다(formalSheetParsed 그대로). 정식 시트 뒤의 시트(IA8 DEPARTURE REPORT 의 LIST_i·LIST_o,
    //    LIST OUT 둘째 시트)를 새로 읽으면 양하·선적 컨이 한 리스트에 섞인다 — **읽는 컨 목록은 종전과 같게** 둔다.
    let headerRow = -1, headers = null, _hdrFirstScore = -1, _hdrViaCn2 = false;
    //  갈아타기는 **첫 머리 아래에 컨 줄이 아직 없을 때만** — 본 리스트 뒤의 보조표(리퍼 목록 등) 머리로 옮겨 그 사이 컨을 버리지 않게(감사 지적 2026-09-24).
    const _isCnCell = (c) => /^[A-Z]{4}\d{6,7}$/.test(String(c || '').replace(/[\s\-]/g, '').toUpperCase());
    const _cn2Of = (_rawRow) => _rawRow.some((c) => { const h2 = _normHeader2(c); return !!h2 && (CN_HEAD.some(p => p.test(h2)) || _LIST_HDR2.cn.some(p => p.test(h2))); });
    for (const _pass of [1, 2]) {
      if (_pass === 2 && (headerRow >= 0 || formalSheetParsed)) break;
      let _dataSeen = false;
      for (let i = 0; i < Math.min(50, grid.length); i++) {
        const _rawRow = grid[i] || [];
        if (headerRow >= 0 && _rawRow.some(_isCnCell)) _dataSeen = true;
        const hasCN = _pass === 1 ? _rawRow.map(normHeader).some(c => CN_HEAD.some(p => p.test(c))) : _cn2Of(_rawRow);
        if (!hasCN) continue;
        const _sc = _hdrRoleScore(_rawRow);
        if (headerRow < 0) {
          headerRow = i;
          headers = _rawRow.map(s => String(s || '').trim());
          _hdrFirstScore = _sc;
          _hdrViaCn2 = _pass === 2;
          continue;
        }
        if (_dataSeen) break;
        if (_sc >= _hdrFirstScore + 2) { headerRow = i; headers = _rawRow.map(s => String(s || '').trim()); break; }
      }
    }

    // 2단계: 헤더 못 찾으면 fallback (모든 셀에서 컨번호 패턴 스캔)
    //   V8.09: 단, 앞선 시트에서 정식 헤더 리스트가 이미 파싱됐으면 이 fallback은 건너뛴다.
    //   (작업자 메모·이전 항차 잡시트의 흩어진 컨번호 과집계 방지.)
    if (headerRow < 0 && !formalSheetParsed) {
      //  ★ 3.60-13: 헤더 없는 리스트(야드 EMPTY LOAD LIST — MAE·SIT·KMD·HHS 16개 3,181줄 실측)
      //    ① F/E — 컨번호 줄의 80% 이상에서 같은 자리에 «E»·«EMTY»·«F» 가 적힌 칸을 F/E 칸으로 본다(종전엔 늘 빈칸).
      //    ② 항구 — 자리는 종전 그대로(다섯 글자 첫째 POL·둘째 POD). 항구가 아닌 다섯 글자 낱말
      //       (손상 등급 «MINOR» 315·«SOUND» 263 이 POL 에, F/E 낱말 «EMPTY» 88 이 POD 에 들어가던 것 — 실측)은 그 칸만 비운다.
      //       나라 코드로 거르지 않는다 — 옛 출력에 FRFOS·ESALG·MXLZC 같은 먼 항구도 있다.
      const _fbFeCnt = {};
      let _fbRows = 0;
      for (const row of grid) {
        if (!row || !row.some((v) => /^[A-Z]{4}\d{6,7}$/.test(String(v || '').replace(/[\s\-]/g, '').toUpperCase()))) continue;
        _fbRows++;
        row.forEach((v, j) => { if (_FE_TOKEN[String(v || '').trim().toUpperCase()]) _fbFeCnt[j] = (_fbFeCnt[j] || 0) + 1; });
      }
      let _fbFeCol = -1;
      { let _b = 0; for (const [j, n] of Object.entries(_fbFeCnt)) if (n >= 3 && n >= _fbRows * 0.8 && n > _b) { _b = n; _fbFeCol = +j; } }
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
            // POL/POD — 3.60-13: 자리는 종전 그대로, 항구 아닌 다섯 글자만 비운다(②)
            let pol = '', pod = '';
            for (const v of allCells) {
              const p = String(v).trim().toUpperCase();
              if (/^[A-Z]{5}$/.test(p) && p !== cn.slice(0, 4)) {
                if (!pol) pol = p;
                else if (!pod && p !== pol) { pod = p; break; }
              }
            }
            if (_NOT_PORT5.has(pol)) pol = '';
            if (_NOT_PORT5.has(pod)) pod = '';
            //  ★ 3.60-14 (검수사 «파서 문제 입니다»): 항구가 한 칸뿐인 행은 그 항구가 **목적항(POD)** 이다.
            //    종전 «첫 항구=POL» 자리 규칙은 선사 엠티 리스트(MAE·SIT·KMD·HHS EMPTY LOAD LIST 등)의 목적항을 POL 에 넣어,
            //    파일 순서로 앞에 있는 맞는 값이 합본 POD 가 되지 못했다(MCSC 635S — 엠티 리스트2 CNTAO·CNTSN 이 POL 로 가고
            //    뒤 파일의 다른 값이 POD 가 됨). 실자료 대조 — 머리 없는 리스트 18개의 항구 한 칸 3,269줄 중 같은 폴더 다른 자료로
            //    가릴 수 있는 1,138줄이 전부 그 자료의 POD 와 같았다(POL 과 같은 줄 0). 그런 파일은 전부 선적 폴더였다.
            //    ⚠ 평택 항구 한 칸은 종전 그대로 POL(선적 리스트의 출발항) — 방향 판정(isOppositeDirRecord)을 흔들지 않는다.
            if (pol && !pod && !isPyeongtaekPort(pol)) { pod = pol; pol = ''; }
            const _fbFe = _fbFeCol >= 0 ? (_FE_TOKEN[String(row[_fbFeCol] || '').trim().toUpperCase()] || '') : '';
            records.push({
              cn, l4: cn.slice(-4), sl, sl_orig: sl, wt, iso, pol, pod,
              op: '', bl: '', sh: '', gi: '',
              fe: _fbFe, dg: false, rf: false, fr: false, ot: false, tk: false, tmp: ''
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

    //  ★ 3.60-13: 2차 머리 규칙 — 1차가 못 찾은 칸만(1차에서 찾은 칸은 종전 그대로).
    const findCol2 = (patterns) => {
      for (let i = 0; i < headers.length; i++) {
        const h = _normHeader2(headers[i]);
        if (!h) continue;
        for (const p of patterns) if (p.test(h)) return i;
      }
      return -1;
    };
    let cn_i = findCol(CN_HEAD);
    if (cn_i < 0) cn_i = findCol2([...CN_HEAD, ..._LIST_HDR2.cn]);
    let sl_i = findCol(SL_HEAD);
    // 2.08-12: 머스크 보조 씰 열 — Shipper Seal 이 비어 있으면 ML Seal 값을 쓴다(MCAU5007912 실측: ML만 있음)
    const mlSeal_i = findCol([/^ml\s*seal$/]);
    // M4.9c-fix: 엠티실 별도 컬럼 (예: "엠티실번호") — c.eseal로 매핑
    const eseal_i = findCol(ESEAL_HEAD);
    const bl_i = findCol([/^b\/?l/, /^bl\s*no/, /^m-?b\/?l/, /master.*b\/?l/, /^b\/?l\s*no$/, /^blno$/]);
    let wt_i = findCol([/^cargo\s*weight$|^total\s*weight$/, /gross.*wt|gross.*weight|t\.?wgt|total.*wt|^weight|^wgt|^g\.?weight|^t\.?weight/, /무게/, /중량/, /^kg/, /^kgs/]);
    if (wt_i < 0) wt_i = findCol2(_LIST_HDR2.wt);   // 3.60-13: TDM «WT»(133줄 무게 빈칸)
    //  ★ 3.60-16 (수정안 C-4, 검수사 2026-09-25 «3. 승인»): 같은 컨이 B/L 여러 줄로 나오는 SKR 리스트(«PART» PARTIAL MASTER/CHILD)는
    //    «WGT» 가 B/L 몫이고 컨 전체 무게는 «CALWGT» 칸이다. 파서는 첫 줄만 남기므로(seen) 종전엔 첫 B/L 무게가 컨 무게로 들어갔다 —
    //    KBTR 2607W SKHU8724161 2,759(+3,300) → CALWGT 6,059 · TCNU5122619 4,101(+4) → 4,105. 한 줄짜리 컨은 CALWGT = WGT 라 그대로다.
    //    CALWGT 가 비었거나 0 이면 종전대로 WGT.
    const calwt_i = findCol([/^calwgt$/]);
    //  ★ 4.08-02 (검수사 2026-10-07): SITC CDL 양식은 `Weight`(B/L 합계) · `CNT WGT`(컨 하나의 화물 무게) · `VGM Weight`(컨 총중량) 세 칸이 같이 있다.
    //    findCol 은 왼쪽부터 첫 일치라 `Weight` 가 먼저 잡혀 STSE 2677E 에서 B/L 합계(232,160 = 두 컨 몫 · 80,711 · 58,560 …)가 컨 무게가 됐다.
    //    ⇒ 컨 단위 칸(`CNT WGT`)이 있는 양식은 B/L 합계 `Weight` 로 되돌아가지 않는다. CNT WGT 가 비면 같은 컨 단위인 `VGM Weight` 를 쓴다.
    //    다른 양식(타사 G.Weight/T.Weight · SIT·EAS·WDG `Weight`)은 종전 그대로다.
    const cntwt_i = findCol([/^cnt wgt$|^cnt wt$|^cnt weight$/]);
    const vgmwt_i = cntwt_i >= 0 ? findCol([/^vgm weight$|^vgm wgt$|^vgm wt$/]) : -1;
    const _wtOfRow = (row) => {
      if (calwt_i >= 0) { const v = plausibleListWtKg(row[calwt_i]); if (v > 0) return v; }
      if (cntwt_i >= 0) {
        const v = plausibleListWtKg(row[cntwt_i]); if (v > 0) return v;
        return vgmwt_i >= 0 ? plausibleListWtKg(row[vgmwt_i]) : 0;
      }
      return wt_i >= 0 ? plausibleListWtKg(row[wt_i]) : 0;
    };
    const sh_i = findCol([/shipper|forward|화주|consignor/]);
    const gi_i = findCol([/gate.*in/, /반입/]);
    const pol_i = findCol([/^pol$|load.*port|loading.*port/, /적재항/, /선적항/, /^lp$|^lwharf$/]);
    let pod_i = findCol([/^pod$|dis.*port|dis.*cy|discharge|destination/, /최종항/, /양하항/, /도착항/, /^dp$|^dlv$/]);
    let _podViaHdr2 = false;
    if (pod_i < 0) { pod_i = findCol2([/^pod$|dis.*port|dis.*cy|discharge|destination/, /최종항/, /양하항/, /도착항/, /^dp$|^dlv$/, ..._LIST_HDR2.pod]); _podViaHdr2 = pod_i >= 0; }
    // M3.86: F/E 패턴에서 L/S 제거 (L/S는 Local/SOC 구분이라 F/E 무관)
    //  3.7-07 (검수사 «아직도 리스트 파서에 문제가 있네요?» — MCAP 634N StandardLoadList 실측):
    //    종전 `soc.*[ef]` 가 헤더 «Isocode» 에 걸렸다 — i·**soc**·od·**e** 로 부분일치한다.
    //    findCol 은 왼쪽부터 첫 일치를 잡으므로 F/E 열이 6번(Isocode)으로 정해졌고, 거기 값은
    //    «45G1» 이라 F/FULL/E/EMPTY 어디에도 안 맞아 **19대 전건 F/E 미정**이 됐다(리퍼 2대만
    //    온도로 F 회복). 「SOC」는 낱말일 때만 F/E 열 후보다 → \bsoc\b 로 경계를 준다.
    let fe_i = findCol([/^f\/?e$|^full\/?empty$|^fe$|^full\/empty$/, /^적공$/, /^empty\/full$/, /^f\/m$/, /\bsoc\b.*[ef]|[ef].*\bsoc\b|soc\/e\/f|e\/f|status/]);
    if (fe_i < 0) fe_i = findCol2([/^f\/?e$|^full\/?empty$|^fe$|^full\/empty$/, /^적공$/, /^empty\/full$/, /^f\/m$/, ..._LIST_HDR2.fe]);
    // M3.86: L/S(Local/SOC) 컬럼 별도 추출 — SOC 식별용
    const ls_i = findCol([/^l\/?s$/]);
    // M3.86: type_i에 "Tp/Sz", "Tp.Sz", "Type/Size" 추가 (CDL 양식)
    let type_i = findCol([/^type$|^cntr.*type|^iso|^tysz$|^szty$|^sztp$|^tpsz$|^sz\/?tp$|^sz\s*tp$|^tp\/?sz$|^tp\s*sz$|^ty\/?sz$|^ty\s*sz$|^type\/?size$|^type\s*size$/, /^타입$/, /^컨.*규격/, /^kind$/]);   // V9.30: SzTp(천경 CDL) 추가 — 35대가 규격미상으로 등록되던 결함
    //  ★ 3.60-13: 동진 «Type\n/Size»(줄바꿈 — 1,833줄 규격 빈칸) · KMTC «TY» · 터미널 «Siz/Typ» · SKR «SZ/TP/HT» · 箱型* 등(1차 무일치일 때만).
    let _typeViaHdr2 = false;
    if (type_i < 0) { type_i = findCol2([/^type$|^cntr.*type|^iso|^tysz$|^szty$|^sztp$|^tpsz$|^sz\/?tp$|^tp\/?sz$|^ty\/?sz$|^type\/?size$/, ..._LIST_HDR2.type]); _typeViaHdr2 = type_i >= 0; }
    //  3.7-07 (같은 사건): «Type»(DRY/REEF)이 «Isocode»(45G1)보다 왼쪽이라 type_i 가 Type 을 잡았다.
    //    DRY 는 높이를 못 담는다 — composeIso 에 DRY 항이 없어 iso 가 빈칸이 되고 «⚠기타 ISO 17» 이 떴다.
    //    바로 옆 열에 ISO 6346 정본(45G1=40HC)이 있는데 안 본 것이다. ⇒ ISO 전용 열을 따로 찾아
    //    **그 값으로 먼저 판정**하고, 비었을 때만 종전 Size+Type 경로로 내려간다(기존 양식 무변).
    const isocol_i = findCol([/^iso$|^isocode$|^iso code$|^isotype$|^iso type$|^iso no$/]);
    const size_i = findCol([/^size$|^sz$|^len$|^length$/, /^사이즈$/, /^규격$/]);
    //  ★ 3.60-13: 높이가 따로 적힌 양식(터미널 DISC LIST «TYPE GP · LEN 40 · HEI 96» — DJCT 0215W 102대 실측) — 길이 40 에 높이 96 이면 40HC 다.
    //    종전엔 높이 칸을 안 봐 40 + GP 가 40DC(42G1)로 읽혔다. 높이 칸이 없는 양식은 종전 그대로.
    const hei_i = findCol([/^hei$/]);
    //  2.98-13 (BUG-2026-005): SIZE 열 표기 방식을 시트 단위로 판별한다 — 행마다는 못 가린다.
    //    «22» 또는 «42»가 하나라도 있고 «20»·«40»이 하나도 없으면 ISO 크기코드 표기(45=40HC).
    //    피트 표기가 하나라도 섞이면 종전(45=45피트) 그대로 — 보수적으로 잰다.
    let _sizeCodeMode = false;
    if (size_i >= 0) {
      let _isoTok = false, _feetTok = false;
      for (let i = headerRow + 1; i < grid.length; i++) {
        const v = String((grid[i] || [])[size_i] || '').trim().toUpperCase().replace(/FT$/, '');
        if (v === '22' || v === '42') _isoTok = true;
        else if (v === '20' || v === '40') _feetTok = true;
      }
      _sizeCodeMode = _isoTok && !_feetTok;
    }
    //  ★ 3.60-17 (검수사 2026-09-25 승인 ④): 카토스 «검수 입력» 의 6번째 칸 «Carrier re-seal» 이 /^carrier/ 에 먼저 걸려 15번째 «선사» 칸까지 못 가고
    //    선사가 빈칸이었다(MCSC 635S 213대 · 전수 1,975줄 — SWTD 9012E·PCSZ 2625E·MCSN 634S·NSFR 2616N 카토스 파일뿐). «seal» 이 붙은 머리는 선사 칸이 아니다.
    let op_i = findCol([/^op$|^operator|^carrier(?!.*seal)|^line|^oper$|^soc.*line/, /^선사/, /선사부호/]);
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
    //   3.60-13: 2차 머리로 읽은 시트는 종전 헤더 없는 시트 자리이므로 정식 시트로 치지 않는다(뒤 시트 처리 종전 그대로).
    if (!_hdrViaCn2) formalSheetParsed = true;

    //  ★ 3.60-13 (만능 파서) — 데이터 줄을 돌기 전에 시트를 한 번 훑는다. 여기서 정한 것은 **빈칸 채우기**에만 쓴다.
    //    데이터 줄 = 아래 줄 처리와 같은 규칙(컨번호 칸 ±2 — 병합 셀로 머리와 값이 어긋난 양식)으로 컨번호가 읽히는 줄.
    const _dataRows = [];
    const _cnColCnt = {};
    for (let i = headerRow + 1; i < grid.length; i++) {
      const _r = grid[i] || [];
      for (const off of [0, -1, 1, -2, 2]) {
        const c = cn_i + off;
        if (c < 0 || c >= _r.length || (off && sl_i >= 0 && c === sl_i)) continue;
        if (/^[A-Z]{4}\d{6,7}$/.test(String(_r[c] || '').replace(/[\s\-]/g, '').toUpperCase())) { _dataRows.push(i); _cnColCnt[c] = (_cnColCnt[c] || 0) + 1; break; }
      }
    }
    const _dataRowSet = new Set(_dataRows);
    const _width = _dataRows.slice(0, 300).reduce((m, i) => Math.max(m, (grid[i] || []).length), headers.length);
    //  ⓪ 실번호 칸 머리와 값이 어긋난 양식(XTPG cntr_number_list — 머리 «Seal No» 는 7번째 칸, 값은 6번째 칸에 있다. 병합 셀) —
    //    머리 칸이 데이터 줄 전부에서 비어 있고, 바로 옆 칸(머리 없음·다른 칸이 쓰지 않음)에 실번호 모양 값만 있으면 그 칸을 실번호 칸으로 본다.
    //    머리 칸에 값이 하나라도 있으면 종전 그대로(옆칸 탐색 금지 규칙 M8.08 유지).
    if (sl_i >= 0 && _dataRows.length) {
      const _cell = (i, c) => String((grid[i] || [])[c] ?? '').trim();
      if (_dataRows.every((i) => !_cell(i, sl_i))) {
        const _taken = new Set([cn_i, ...Object.keys(_cnColCnt).map(Number), wt_i, calwt_i, bl_i, pod_i, pol_i, fe_i, type_i, size_i, isocol_i, op_i, tmp_i, eseal_i, mlSeal_i].filter((x) => x >= 0));
        for (const c of [sl_i - 1, sl_i + 1]) {
          if (c < 0 || _taken.has(c) || String(headers[c] || '').trim()) continue;
          const vals = _dataRows.map((i) => _cell(i, c).replace(/[\s\-]/g, '')).filter(Boolean);
          const ok = vals.filter((v) => /^[A-Z]{1,6}\d{4,}$/i.test(v) && v.length >= 5).length;   // 영문 머리가 있는 값만(무게·CELL 숫자 칸을 실번호로 삼지 않게 — 감사 지적)
          if (vals.length && ok >= vals.length * 0.9) { sl_i = c; break; }   // 엠티가 많은 리스트는 실번호가 몇 줄뿐이다(XTPG 536E 5대 중 1대)
        }
      }
    }
    //  ① «Cargo Type» 가 F/E 를 말하는 양식(동진 — F·P, P = 엠티). F/E 칸이 없을 때만.
    //    F·E·FULL·EMPTY·MT 는 뜻이 분명하다. P 는 **머리말 합계(Full - N · Empty - M)나 리스트 밑 합계표(LOC·MTY)와 대수가 맞을 때만** 엠티로 읽는다.
    let _ctFe = null;
    if (fe_i < 0 && cargotype_i >= 0 && _dataRows.length) {
      const _cnt = { F: 0, E: 0, P: 0, other: 0 };
      for (const i of _dataRows) {
        const v = String((grid[i] || [])[cargotype_i] || '').trim().toUpperCase();
        if (!v) continue;
        if (v === 'F' || v === 'FULL') _cnt.F++;
        else if (v === 'E' || v === 'EMPTY' || v === 'MT' || v === 'MTY') _cnt.E++;
        else if (v === 'P') _cnt.P++;
        else _cnt.other++;
      }
      if (!_cnt.other && (_cnt.F + _cnt.E + _cnt.P) > 0) {
        _ctFe = { F: 'F', FULL: 'F', E: 'E', EMPTY: 'E', MT: 'E', MTY: 'E' };
        if (_cnt.P) {
          const _sum = _listFeSummary(grid);
          const _ok = (s) => !s || (s.full === _cnt.F && s.empty === _cnt.E + _cnt.P);
          if ((_sum.head || _sum.table) && _ok(_sum.head) && _ok(_sum.table)) _ctFe.P = 'E';
        }
      }
    }
    //  ⑥ 새 경로(2차 머리 ·값으로 찾은 칸)로 읽은 규격의 안전 장치 — **앱 라벨로 풀리는 코드만** 채운다(추정하지 않는다).
    //    «길이 먼저» 표기 칸(20xx·40xx·43xx 꼴이 한 대라도 있는 칸 — 터미널 EMPTY CNTR LIST «43DC»=40HC · RZOR SOC箱明细 «40HC»)에서
    //    «45DC»·«45HC» 는 45피트다(OBWH 2706W·2708W 45DC 62대 = 같은 항차 CLL L5GE 62/62 · RZOR 45HC = 세관·预配 L5G1, 앱 _SPEC_ALIAS 도 45HC=L5G1).
    //    앱 라벨은 45DC 를 40DC, 45HC 를 40HC 로 읽으므로 이 칸에선 L5G1 로 적고, 이 표기의 다른 «45»+영문 두 글자는 비운다.
    //    그 밖의 칸(22GP·45GP 처럼 ISO 크기코드 표기 — XTPG 45GP = 40HC)은 라벨대로 · 뜻이 갈리는 «45DC» 는 비운다.
    //    라벨로 안 풀리는 코드(«20BC» → 20B)도 비운다(감사 지적 2026-09-24 반영).
    const _lenFirstCol = (c) => c >= 0 && _dataRows.some((i) => /^(20|40|43)[A-Z]{2}$/.test(String((grid[i] || [])[c] || '').toUpperCase().replace(/[\s\-\/]/g, '')));
    const _guardNewIso = (raw, iso, lenFirst) => {
      if (!iso) return '';
      const v = String(raw || '').toUpperCase().replace(/[\s\-\/]/g, '');
      if (/^45[A-Z]{2}$/.test(v)) {
        if (lenFirst) return /^45(DC|HC)$/.test(v) ? 'L5G1' : '';   // 근거 있는 둘만(OBWH 45DC · RZOR 45HC) — SITC 는 한 칸에 40FR·40OH 와 45GP(=40HC)를 섞어 45GP 는 비운다(재감사 지적)
        if (v === '45DC') return '';
      }
      return /^(20(DC|HC|RF|OT|FR|TK)|40(DC|HC|RF|RH|OT|FR|TK)|45HC)$/.test(isoToLabel(iso)) ? iso : '';
    };
    const _typeTermSys = _typeViaHdr2 && _lenFirstCol(type_i);
    //  ② 값으로 찾는 규격 칸 — 칸 이름을 몰라도 값이 규격 코드(22G1·45GP·D5·4HDC·DCHC …)인 칸. 줄마다 규격을 못 읽었을 때만 쓴다.
    //    숫자만인 값(무게·순번)은 여기서 안 본다 — 옛 ISO 숫자 코드는 이름으로 찾은 규격 칸에서만 받는다.
    let _specScan = -1;
    {
      let _bestN = 0;
      for (let j = 0; j < _width; j++) {
        if (j === cn_i || j === sl_i || j === wt_i || j === bl_i) continue;
        let ne = 0, ok = 0;
        for (const i of _dataRows) {
          const v = String((grid[i] || [])[j] || '').trim();
          if (!v) continue;
          ne++;
          if (/^\d+(\.\d+)?$/.test(v.replace(/[\s,]/g, ''))) continue;
          if (deriveIso(v, v, _sizeCodeMode)) ok++;
        }
        if (ok >= 3 && ok >= ne * 0.8 && ok >= _dataRows.length * 0.3 && ok > _bestN) { _specScan = j; _bestN = ok; }
      }
    }
    const _specTermSys = _lenFirstCol(_specScan);
    //  ③ 값으로 찾는 F/E 칸 — F/E 칸 이름도 Cargo Type 도 없을 때만. 값이 F·E·FULL·EMPTY·MT·EMTY 뿐이고 풀·엠티가 둘 다 나오는 칸
    //    (또는 칸 이름이 풀/엠티를 말하는 칸). L/S·T/S·SOC·DG 칸은 뺀다(«L» 은 로컬이다).
    let _feScan = -1;
    if (fe_i < 0 && !_ctFe) {
      let _bestN = 0;
      const _skip = new Set([cn_i, sl_i, wt_i, bl_i, type_i, size_i, isocol_i, ls_i, cargotype_i, tmp_i].filter((x) => x >= 0));
      for (let j = 0; j < _width; j++) {
        if (_skip.has(j)) continue;
        const h = _normHeader2(headers[j]);
        if (/^(l\/?s|t\/?s|soc|dg|imdg|rf|oog|s)$/.test(h)) continue;
        let ne = 0, ok = 0, hasF = false, hasE = false;
        for (const i of _dataRows) {
          const v = String((grid[i] || [])[j] || '').trim().toUpperCase();
          if (!v) continue;
          ne++;
          const t = _FE_TOKEN[v];
          if (t) { ok++; if (t === 'F') hasF = true; else hasE = true; }
        }
        const _hdrFe = /empty|full|f\/?e|\bmt\b|적공|공컨/.test(h);
        if (ok >= 3 && ok >= ne * 0.95 && ((hasF && hasE) || _hdrFe) && ok > _bestN) { _feScan = j; _bestN = ok; }
      }
    }
    //  ④ 머리말·구간 제목줄의 항구(«POD : KWANGYANG, KOREA» · «DISCHARGING PORT [DALIAN, CHINA]» · «POL : CNDLC | POD : KRPTK»).
    //    그 줄 아래 데이터 줄 중 POD·POL 칸이 빈 줄만 채운다(두우·SITC·동영·남성 양식 — POD 빈칸 약 1만 줄).
    const _ctxDecls = _ctxPortDecls(grid, (r) => r === headerRow || _dataRowSet.has(r));
    //  ⑤ 같은 B/L 의 첫 줄에만 POD 가 적힌 양식(천경 CLL) — 같은 B/L 의 앞 줄 POD 를 이어 쓴다.
    const _podByBl = {};

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
      let slAlt = '';   // 4.49: 머스크 보조실(Shipper Seal — 화주 씰). 주실은 ML Seal
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
        //  3.60-14: 씰 칸의 «0000» 은 적힌 그대로 둔다 — 검수사가 쓰는 «실 부족» 표기다(dupSealMap·GuidedWorkPanel). 카토스 SWTD 9012E·PCSZ 2625E 7줄은 세관리스트도 같은 값이다.
        //  ★ 4.49 — 머스크 주실은 ML Seal 칸이다(검수사 2026-10-24 12:50 «ML Seal 칸» · 통합운영지침서 7.8-F 7 — MAMP 641N 두 칸이 다른 18대·지난 46대 모두 세관 신고본이 ML 값).
        //    Shipper Seal(화주 씰)은 보조실 sl_alt 로 남긴다(지우지 않는다 — 화면에 «다른 자료 실»로 보인다). ML 이 비면 종전대로 Shipper Seal(2.08-12 는 거꾸로였다).
        if (mlSeal_i >= 0 && mlSeal_i !== sl_i) { const _ml = String(row[mlSeal_i] || '').trim(); if (_ml) { if (sl && normSeal(sl) !== normSeal(_ml)) slAlt = sl; sl = _ml; } }
      } else {
        // SEAL 헤더를 못 찾은 경우만 컨번호 옆 5칸 자동 탐색 (병합셀 등 대응, 규격 제외).
        // 2.08-12: 열 헤더가 부킹/BL 계열이면 후보에서 제외 — Bookno 를 씰로 채택하던 오탐 봉쇄.
        const _NOT_SEAL_COL = /book|b\/?l\s*no|^blno$|m-?b\/?l|invoice|voyage/i;
        //  ★ 3.60-14 (검수사 «카토스의 위치를 엠티실 번호 자리가 아니고 원실 자리에 넣어 씁니다»): **자리(셀) 칸은 씰이 아니다.**
        //    셀 번호(010004·0280384)는 숫자 여섯·일곱 자리라 씰 모양 검사를 그대로 통과했다. 실자료 전수 — 옆 칸 탐색이 자리 칸을
        //    씰로 집은 줄 2,407. 그중 카토스 Cell Position 1,409 는 위 씰 머리(carrier seal)가 먼저 잡아 탐색까지 오지 않고, 이 규칙이
        //    막는 몫은 998(DepPos 351 · CELL 279 · Position 213 · From 111 · POSITION 44 — DepPos 를 건너뛰면
        //    바로 옆 ArvPos 를 집으므로 둘 다 막는다). 진짜 씰 머리
        //    («SEAL #»·«封号»·«SEAL_NBR1»)는 걸리지 않는다.
        const _POS_COL = /cell|position|pos$|posn$|^from$|^to$|위치|slot/i;   // DepPos·ArvPos(리스토 목록 출발·도착 자리)도 자리다
        for (let j = cnColActual + 1; j < Math.min(cnColActual + 6, row.length); j++) {
          const _h = String((headers && headers[j]) || '').trim();
          if (_h && (_NOT_SEAL_COL.test(_h) || _POS_COL.test(_h))) continue;
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
      let _feText = false;        // 3.60-17: F/E 를 낱말(EMPTY·FULL 섞인 글자)로 정했다 — 규격 끝글자를 건드리지 않는다
      let rfdryFlag = false;      // 1.8-04: `R/D` 표기를 만나면 세운다 (온도 확인 대상에서 뺀다)
      if (fe_i >= 0) {
        const feRaw = String(row[fe_i] || '').trim().toUpperCase();
        if (feRaw === 'F' || feRaw === 'FULL' || feRaw === 'L' || feRaw === 'LOADED') fe = 'F';
        else if (feRaw === 'E' || feRaw === 'EMPTY' || feRaw === 'MT' || feRaw === 'M') fe = 'E';
        else {
          const s = _feFromSlash(feRaw);
          if (s === 'D') rfdryFlag = true;     // R/D = 리퍼드라이(넌플러그) — 온도와 무관
          else if (s) fe = s;
          //  ★ 3.60-17 (검수사 2026-09-25 승인 ⑤): F/E 칸에 낱말 EMPTY(MTY)·FULL 이 다른 글자와 섞여 있으면 그 낱말을 따른다 —
          //    SITC «SOC/E/F» 칸 «SOC -EMPTY (주)헤바로지스»(STSE 2662W XCXU0006014 20TK · 씰 NIL). 종전엔 빈칸으로 남아 SOC 시트 판정이
          //    씰 NIL 을 실로 보아 풀이 됐다. 전수 1,492개에서 이 한 대뿐. 검수사 «규격은 변하지 않습니다» — 이 갈래로 정한 엠티는 ISO 끝글자를
          //    E 로 바꾸지 않는다(_feText). 씰 NIL 은 적힌 그대로(엠티 규칙대로 엠티실 칸으로).
          else if (/\bEMPTY\b|\bMTY\b/.test(feRaw)) { fe = 'E'; _feText = true; }
          else if (/\bFULL\b/.test(feRaw)) { fe = 'F'; _feText = true; }
        }
      }
      //  ★ 3.60-13: F/E 칸이 없을 때 — «Cargo Type» F/E(동진, P 는 합계와 맞을 때만) → 값으로 찾은 F/E 칸 → 실번호 칸의 «EMPTY» 표기.
      if (!fe && _ctFe) { const _c = String(row[cargotype_i] || '').trim().toUpperCase(); if (_ctFe[_c]) fe = _ctFe[_c]; }
      if (!fe && _feScan >= 0) { const _t = _FE_TOKEN[String(row[_feScan] || '').trim().toUpperCase()]; if (_t) fe = _t; }
      if (/^(E|EMPTY|MT|MTY)$/i.test(sl)) { if (!fe) fe = 'E'; sl = ''; }   // XTPG 평택 리스트 — SEAL NO 칸에 «EMPTY» 로, MCSC LIST — SEAL 칸에 «E» 로 엠티를 적는다
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
        //  3.60-13: 플랫랙·오픈탑은 봉인할 문이 없다 — 실이 없다고 엠티로 적지 않는다(천경 XTPG 539W 22톤 F/R 2대 실측). 비워 둔다.
        const _pk = (isocol_i >= 0 && deriveIso(row[isocol_i], row[isocol_i], _sizeCodeMode))
          || deriveIso(size_i >= 0 ? row[size_i] : '', type_i >= 0 ? row[type_i] : '', _sizeCodeMode) || '';
        const _noDoor = /^..[PU]/.test(String(_pk).toUpperCase());
        if (isSocRow && !(_noDoor && !sl)) fe = sl ? 'F' : 'E';
        //  플랫랙·오픈탑인데 실이 없으면 비고가 말할 때만 엠티다 — 천경 534W «F/R Empty»(4.9톤) 는 E, 539W «O/W … F/R»(22톤) 은 비움(감사 지적 2026-09-24).
        else if (isSocRow && rmk_i >= 0 && /\bEMPTY\b/i.test(String(row[rmk_i] || ''))) fe = 'E';
      }

      // 타입 (M3.86: deriveIso로 표준화 - "DC43"/"4H+RF"/"42HQ" 모두 처리)
      let sizeRaw = size_i >= 0 ? String(row[size_i] || '').trim() : '';
      if (hei_i >= 0 && /^(40|42)$/.test(sizeRaw.replace(/'|FT$/gi, '')) && /^(96|9\.6|9'6"?)$/.test(String(row[hei_i] || '').trim())) sizeRaw = '4H';   // 3.60-13: 높이 96 = 40HC
      const typeRaw = type_i >= 0 ? String(row[type_i] || '').trim() : '';
      //  3.7-07: ISO 전용 열이 있으면 그것이 정본 — 못 읽으면 종전 Size+Type 으로.
      const isoColRaw = isocol_i >= 0 ? String(row[isocol_i] || '').trim() : '';
      const _isoFromCol = (isoColRaw && deriveIso(isoColRaw, isoColRaw, _sizeCodeMode)) || '';
      let iso = _isoFromCol || deriveIso(sizeRaw, typeRaw, _sizeCodeMode);
      //  ★ 3.47 — **선사가 적은 규격 원문을 따로 남긴다.**
      //    종전에는 셋(EDI·선사·세관)이 `records.iso` **한 칸을 돌려써서** 마지막에 올린 것만 남고
      //    앞의 둘은 흔적 없이 사라졌다. 그래서 진단이 EDI 와 EDI 를 비교해 «불일치 0» 을 냈다.
      //    (검수사 «확인대상이 EDI : 선사리스트 : 세관리스트 3곳입니다.»)
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

      //  ★ 3.60-13: 이름으로 찾은 규격 칸에서 못 읽었으면 값으로 찾은 규격 칸(②)에서.
      if (iso && !_isoFromCol && _typeViaHdr2) iso = _guardNewIso(typeRaw, iso, _typeTermSys);   // ⑥
      if (!iso && _specScan >= 0) iso = _guardNewIso(row[_specScan], deriveIso(row[_specScan], row[_specScan], _sizeCodeMode) || '', _specTermSys);

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
      const isOt = isOpenTopIso(isoUpper);   // 3.47: utils 한 벌 — 「고르기」와 같은 판정
      const isTk = isTankIso(isoUpper);

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

      //  ★ 3.60-13: POD·POL — 칸 값이 먼저. 비었으면 같은 B/L 앞 줄의 POD(⑤), 그래도 비었으면 이 줄 위 머리말·구간 제목줄(④).
      let _podV = pod_i >= 0 ? String(row[pod_i] || '').trim() : '';
      //  ★ 3.60-17 (검수사 2026-09-25 승인 ⑥ 수정안 ①-가): 1차 머리로 읽은 POD 도 앱 항구표(_listPortCode — _PORT_ALIAS·normPortCode)로 맞춘다.
      //    종전엔 2차 머리 칸만 맞춰 MCSC 635S LIST 의 «TAO·TXG·DVO» 가 적힌 그대로 들어가 EDI CNTAO·CNTXG·PHDVO 와 글자가 달라 컨 상세에
      //    노란 «리스트 POD» 줄이 떴다(VoyagePage 860행은 글자 그대로 비교). 못 푸는 값은 그대로(지어내지 않음). 전수 1,492개 — 54개 파일 5,052줄이
      //    다섯 글자 코드로 바뀌고(PTK→KRPTK 1,667 · KAN→KRKAN 1,011 · INC→KRINC 682 …) 선적·양하 방향 판정이 바뀐 컨 0.
      if (_podV) _podV = _listPortCode(_podV) || _podV;
      let _polV = pol_i >= 0 ? String(row[pol_i] || '').trim() : '';
      const _blV = bl_i >= 0 ? String(row[bl_i] || '').trim() : '';
      if (pod_i >= 0 && /^(?=.*\d)[A-Z0-9\-]{8,}$/i.test(_blV)) { if (_podV) _podByBl[_blV] = _podV; else if (_podByBl[_blV]) _podV = _podByBl[_blV]; }   // B/L 번호 꼴(숫자 포함 8자 이상)만 — «MTY» 같은 자리표시는 잇지 않는다
      if (!_podV) _podV = _ctxPortAt(_ctxDecls, i, 'pod');
      if (!_polV) _polV = _ctxPortAt(_ctxDecls, i, 'pol');

      records.push({
        cn, l4: cn.slice(-4),
        // 1.8-04: `R/D`(리퍼드라이 — 넌플러그, 온도 무관)를 리스트에서 읽었으면 표시를 세운다.
        //   false 는 굳이 쓰지 않는다 — 기존 값(수집기 패치·검수원 입력)을 덮지 않기 위함.
        ...(rfdryFlag ? { rfdry: true } : {}),
        ...(_feText ? { _feText: true } : {}),   // 3.60-17: 아래 끝글자 맞추기가 건너뛰고 지운다
        sl: finalSl,
        sl_orig: finalSl,
        ...(slAlt && finalSl && normSeal(slAlt) !== normSeal(finalSl) ? { sl_alt: slAlt } : {}),   // 4.49: 머스크 보조실(풀 컨만)
        eseal: finalEseal,
        eseal_orig: finalEseal,
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        // 1.23: parseInt → parseListWeightKg (톤 소수 표기 절사 사고 — 위 함수 주석 참조)
        wt: _wtOfRow(row),   // 3.60-16: 컨 합계 칸(CALWGT)이 먼저 · 4.08-02: CNT WGT 양식은 B/L 합계로 안 돌아감 · 컨 하나 40톤 초과는 무게 없음
        pol: _polV,
        pod: _podV,
        fe,
        iso,
        iso_carrier: iso,                  // 3.47: 선사 규격(파서 해석값 — 원문 그대로가 아니다). `iso` 는 다른 자료가 덮는다.
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
    if (r._feText) { delete r._feText; continue; }   // 3.60-17: 낱말로 정한 F/E — 검수사 «규격은 변하지 않습니다»(20TK 그대로)
    if (r._rz || r._customs) continue;  // M8.07/08: RIZHAO·세관 레코드는 ISO가 이미 표준 — 끝자리 변환 금지.
    if (!r.iso || r.iso.length < 4) continue;
    //  3.60-13: 끝자리를 바꾸면 규격 라벨이 달라지는 코드는 그대로 둔다 — «40RH»(하이큐브 리퍼) 엠티가 «40RE»(= 40RF, 보통 리퍼)로
    //    바뀌던 것(MCSC 635S LIST 200대 실측). F/E 는 r.fe 가 이미 말한다.
    r.iso = feSyncedIso(r.iso, r.fe);   // 4.15: 같은 규칙을 ASC 파서와 한 벌로(utils.feSyncedIso)
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


//  ★ 3.7 목적지(POD)별 **고정 바탕색** — 검수사 지시 2026-09-03.
//    «플랜에서 포트별 격자를 없앱니다. 눈이 아프고 구분이 잘 안됩니다. 표기보다 엷은 바탕색으로 대체합니다. 목적지별 색으로»
//    «포트색 기본은 가장 포트가 가장많은곳을 선택해서 정해놓고 지정색을 사용 했으면 좋겠습니다. 언제나 그색의 목적지는 어디다 할수있게»
//
//  ▸ **대수 순으로 돌려 쓰지 않는다.** 목적지마다 색이 못 박혀 있어 어느 항차에서 보든 같은 색이다.
//  ▸ 무엇을 세었나 — 활성·보관 230항차의 **선적 EDI(loading/ediContainers)** 평택 선적분 55,453대.
//    ⚠ 리스트(records)로 세면 안 된다 — 헤더 없는 엑셀 fallback 이 섞여 JPNGO·MYPKG 처럼
//    실재하지 않는 목적지 16개가 딸려 나온다(3.7 작업 중 실측). 항구의 진실은 EDI 다(3.6-02·SWDN 265 와 같은 계열).
//    그렇게 세면 목적지는 31개뿐이고 **한 항차에 같이 나오는 것은 최대 5개**라 전부 색을 줄 수 있다.
//  ▸ 색 고르는 법 — 실제 «한 항차에 같이 실린 조합»으로 그래프 색칠을 해서,
//    한 플랜에 같이 나오는 목적지끼리는 **명도가 겹치지 않게** 배정했다(실측 겹침 0쌍 · 같은 색 0건).
//    명도를 먼저 가른 이유는 흑백 레이저다 — 검수사 프린터 HL-L2360D 일반 모드 600dpi·106lpi 는
//    회색 33계조(한 계조 7.7)라, 명도 10 간격이면 종이에서도 갈린다.
//    240~190 여섯 단 × 여섯 색상. 240 을 넘기지 않는 것은 흰 칸과 붙어 버리기 때문이다.
//  ▸ 여기 없는 목적지(새 항로)는 흰 칸이고, 칸 오른쪽 위 세 글자가 그것을 말한다. 별첨1 에는 둘 다 나온다.
export const POD_BG = {
  //  명도 240
  DLC: '#e7f9db',  // 대련 · 초록 · 실선적 7466대
  YNT: '#e8f1ff',  // 연태 · 파랑 · 실선적 7258대
  RZH: '#ffe9eb',  // 일조 · 빨강 · 실선적 4485대
  SHD: '#ffeddb',  // 석도 · 주황 · 실선적 2242대
  PUS: '#f6eaff',  // 부산 · 보라 · 실선적 1161대
  HKG: '#dbfaf7',  // 홍콩 · 청록 · 실선적 338대

  //  명도 230
  TAO: '#c2f6f2',  // 청도 · 청록 · 실선적 5822대
  HPH: '#d7f4c2',  // 하이퐁 · 초록 · 실선적 3540대
  WEI: '#d8e8ff',  // 위해 · 파랑 · 실선적 1737대
  SGN: '#ffdbde',  // 호치민 · 빨강 · 실선적 1595대
  SAM: '#ffe0c2',  // CNSAM · 주황 · 실선적 580대
  YYY: '#f0dcff',  // CNYYY · 보라 · 실선적 269대

  //  명도 220
  KAN: '#c8dfff',  // 광양 · 파랑 · 실선적 4392대
  TAG: '#c7f0aa',  // 태창 · 초록 · 실선적 1013대
  DVO: '#ebceff',  // 다바오 · 보라 · 실선적 608대
  TTT: '#aaf2ec',  // CNTTT · 청록 · 실선적 510대
  INC: '#fed4aa',  // 인천 · 주황 · 실선적 198대
  FOD: '#ffccd1',  // CNFOD · 빨강 · 실선적 62대

  //  명도 210
  LYG: '#92efe7',  // 연운항 · 청록 · 실선적 4369대
  NTG: '#e5c0ff',  // 남통 · 보라 · 실선적 997대
  NGB: '#ffbec3',  // 닝보 · 빨강 · 실선적 694대
  LCH: '#b7ec92',  // 램차방 · 초록 · 실선적 580대
  SHK: '#b9d6ff',  // 셰코우 · 파랑 · 실선적 107대
  SUB: '#fec892',  // 수라바야 · 주황 · 실선적 6대

  //  명도 200
  SHA: '#a9cdff',  // 상해 · 파랑 · 실선적 4525대
  TSN: '#febc79',  // 천진 · 주황 · 실선적 394대
  TXG: '#ffafb6',  // 천진신항 · 빨강 · 실선적 130대
  LOW: '#dfb2ff',  // CNLOW · 보라 · 실선적 48대
  MNN: '#a7e879',  // 마닐라북항 · 초록 · 실선적 41대
  TRN: '#79ebe2',  // CNTRN · 청록 · 실선적 12대

  //  명도 190
  BKK: '#61e7dc',  // 방콕 · 청록 · 실선적 274대
};
/** 목적지 3자 키 → 플랜 바탕색. 모르는 목적지는 '' (흰 칸). */
/**  3.7 목적지 코드를 **몇 자로 적을지** — 항차마다 달라진다(검수사 «동적반응으로 포트가 첫자가
 *   중복이 안된면 한자로 아님 2자로 3일땐 크기 줄이고»).
 *   한 플랜 안에서 서로 갈리기만 하면 되므로, 갈리는 가장 짧은 길이를 쓴다.
 *   실측 223항차 — 1자로 되는 항차 155(69.5%) · 2자 68(30.5%) · 3자 0. 칸이 좁은 배가 이것으로 산다.
 *   3자까지 가면 그 항차만 글자를 줄인다(반환값 3 을 본 쪽에서 줄인다).
 */
export function podCodeLen(containers, mode) {
  if (mode !== 'loading' || !Array.isArray(containers) || !containers.length) return 0;
  const keys = new Set();
  for (const c of containers) { const k = getContainerColorKey(c, mode); if (k) keys.add(k); }
  if (!keys.size) return 0;
  const arr = [...keys];
  for (const L of [1, 2]) if (new Set(arr.map((k) => k.slice(0, L))).size === arr.length) return L;
  return 3;
}

//  ⚠⚠ 3.39 — **선적 칸의 풀·엠티를 되살리는 한 벌.** 검수사 2026-09-09 «출력물 관리하면서 한가지를 없앤것이
//    있습니다. **풀과 엠티 색상구분**입니다. 목적지 별로 색상을 추가하면서 그 기능이 가라졌습니다.
//    **표기자 이외 다른것으로 구분할 방법이 사라졌습니다**».
//    3.7 이 목적지색을 얻으면서 «칠했나»를 통째로 버렸다 — 실측 ATPR 선적 366대 중 엠티 361·풀 5 이고
//    베이 20 은 48칸이 전부 CNDLC 라 **같은 색 48칸에서 풀 2대를 글자 F 하나로** 찾아야 했다.
//    검수사 확정 «안 B» — **칠한 칸=풀 · 흰 칸에 테두리만=엠티**. 양하가 이미 쓰는 규칙과 같아진다.
//    ⚠ 테두리 색은 목적지색을 **그대로 쓰면 안 된다** — 흑백에서 안 보인다(감사 실측). 팔레트 31색 중
//      12색이 흰 칸과의 회색값 차이 27 미만이고 ATPR 의 CNDLC 는 **14.8** 뿐이다. 앱 기준은
//      «차이 27이면 안 보인다»(2.38-01 검수사 실측)이고 그때 칠을 190(차이 65)으로 옮겼다.
//      ⇒ **테두리에 쓰는 색만** 같은 색조로 명도 190 까지 낮춘다. 컬러에서는 목적지가 그대로 읽힌다.
//    ⚠ `backgroundColor` 는 **목적지색 원본 그대로** 둔다. 여기를 어두운 값으로 바꿨더니 종전 검사가
//      «⛔ 흑백에서 같은 회색이 되는 짝 — W(190)↔D(190)» 로 잡았다(목적지끼리 뭉갬).
//    ⚠ 테두리를 `box-shadow` 로 그리면 `.cpv2-lugg`(수화물 보라)·`.cpv2-oog-W/HW`(규격초과 검은 변)를
//      인라인이 덮어 **지운다**. 그래서 배경 세 겹으로 그린다.
export function darkenTo(hex, target) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;   // Rec.601 — 2.38-01 이 쓴 그 식
  if (!(lum > target)) return hex;
  const k = target / lum;
  return '#' + [r, g, b].map((x) => Math.round(x * k).toString(16).padStart(2, '0')).join('');
}

export function podFeStyle(podBg, isFull, fullFallback) {
  if (!podBg) return isFull && fullFallback ? { background: fullFallback } : {};
  if (isFull) return { background: podBg };
  const edge = darkenTo(podBg, 190);
  return {
    backgroundColor: podBg,
    //  위층 = 안쪽 흰 사각형 · 아래층 = 칸 전면 테두리색 ⇒ 남는 2px 이 목적지색 테두리가 된다.
    backgroundImage: `linear-gradient(#fff,#fff), linear-gradient(${edge},${edge})`,
    backgroundSize: 'calc(100% - 4px) calc(100% - 4px), 100% 100%',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat, no-repeat',
  };
}

export function podBgOf(key, mode) {
  //  문지기는 여기 하나다 — 선적 플랜에서만 목적지색이 나간다.
  //  양하는 색 열쇠가 «선사 3자»라, 게이트가 없으면 TAOS→TAO 처럼 잘린 선사코드가 목적지색을 받는다.
  if (mode !== 'loading') return '';
  const k = String(key || '').toUpperCase().trim();
  return (k && POD_BG[k]) || '';
}



// M3.5.6: 장비 번호 (localStorage)
//  ★ 3.50 문지기 — «조회만» 으로 들어온 사람에게는 호기가 없다(읽으면 '' · 넣어도 안 넣힌다 · 비우기는 된다). 호기 단추·시작보고·베이뷰 호기 단추 어디서 넣어도 여기 한 곳에서 막힌다.
//    검수사 «저와 수석이 단순 조회로 접속을 하면 호기에 기록이 안되게». 작업자로 전환하면(workChoice) 그대로 다시 열린다.
export function getEquipNumber() {
  try {
    return localStorage.getItem('gm_equip_no') || '';
  } catch (e) { return ''; }
}

//  ★ 3.51 (검수사 2026-09-15 «클로드와 저는 조회만으로 로그인해도 모든 기능 장비 지정등을 사용하게 해야만 하는데 … 일부 기능을 막아 놔씁니다») —
//    **조회만도 호기를 지정한다.** 화면을 그 호기 관점으로 보기 위한 것이다(자동 가이드 큐·따라가기·내 갱 기록).
//    3.50 이 여기를 막아 앱 전체의 호기가 사라졌고 자동 가이드·베이뷰가 통째로 닫혔다 — 되돌린다.
//    «조회만은 작업량에 안 들어간다» 는 **쓰기 자리**(firebase 완료·보고 문지기)와 활동 기록에서 지킨다.
export function setEquipNumber(num) {
  try {
    if (num) localStorage.setItem('gm_equip_no', num);
    else localStorage.removeItem('gm_equip_no');
  } catch (e) { /* 호기 번호를 기기에 못 남겨도 화면은 그대로 */ }
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

/**
 * 접안 현측을 **한 벌로** 읽는다 — 'starboard'(우현) · 'port'(좌현) · ''(모름).
 *
 *  ★ 3.40 (검수사 2026-09-09 «선박이 좌현으로 고정됨 바꿔도 다시바뀜»)
 *    같은 칸에 두 어휘가 들어 있었다. 수집기는 터미널 화면에서 읽은 **한글**을 적고
 *    (`pnctpull.py` — `berthSide = '좌현' | '우현'`), 앱은 **영문**만 알아봤다
 *    (`berthSide === 'starboard'`). 그래서 한글이 든 항차는 우현이어도 늘 «좌현» 으로 보였고,
 *    검수사가 우현으로 고쳐도 다음 수집 사이클이 한글로 덮어 되돌아왔다.
 *    실측 2026-09-09 — 값이 든 6항차가 전부 한글이었다(RZOR 좌현 2 · ATPR·OBWH×2·TMPZ·KKLC 우현 5).
 *    ⚠ 이 칸은 표시만이 아니라 **작업 순서**를 정한다(`evenRowsSeaSide` → 육상·해상 로우 차례).
 *      우현 5척이 좌현 기준으로 줄을 세우고 있었다.
 *
 *  ⚠ 모르는 값은 **좌현으로 삼키지 않는다** — 종전 버그의 본질이 그 삼킴이었다.
 *    ''(모름)을 내면 화면이 «접안?» 으로 물어보고 검수사가 정한다(§4-3 조용한 실패 금지).
 *  ⚠ 검수사가 배를 보고 고른 것(`berthSidePick`)이 수집기 값보다 **먼저**다 — 그래야 고친 것이 산다.
 */
export function berthSideOf(info) {
  const raw = String((info && (info.berthSidePick || info.berthSide)) || '').trim();
  if (!raw) return '';
  if (/^(starboard|stbd|stb|우현|우현접안|우)$/i.test(raw)) return 'starboard';
  if (/^(port|좌현|좌현접안|좌)$/i.test(raw)) return 'port';
  return '';
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

// ─── 3.6: ISO 6346 컨테이너 번호 검산 (체크디지트) ─────────────────────
//   검수사 확정 2026-09-03 — 외부에서 받은 MirAI.py 중 이 부분만 골라 옮겼다(나머지는 안 쓴다).
//   왜 필요한가. 지금 앱은 컨번호를 **형식**(영문 4 + 숫자 7)만 본다. 그래서 손으로 친 번호가
//   리스트에 없으면 «오타인지 진짜 초과분인지»를 가릴 방법이 없었다 — 검수사가 눈으로 다시 봐야 했다.
//   국제 규칙(ISO 6346)은 마지막 한 자리가 앞 10자리에서 계산되는 검산 숫자다. 그것만 맞춰 보면
//   **한 글자 오타는 그 자리에서 걸린다**(같은 잘못된 번호가 우연히 검산까지 맞을 확률은 1/11).
//   ⚠ «검산이 틀렸다 = 없는 컨»이 아니다. 실제로 규칙을 안 지킨 번호도 드물게 온다 —
//     그래서 막지 않고 **«확인해 보시라»고 알리기만 한다**(현장이 정답이다).
//   실측 — NSDC 2608N 선적 실완료 114대 전부 통과.
const _ISO_LETTER = { A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38 };

/** 컨번호가 ISO 6346 검산에 맞는가. 형식이 아니면 null(모름), 맞으면 true, 틀리면 false. */
export function isoCheckDigit(cnRaw) {
  const cn = String(cnRaw || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{4}\d{7}$/.test(cn)) return null;          // 형식 밖 — 검산 대상이 아니다
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const ch = cn[i];
    const v = ch >= '0' && ch <= '9' ? Number(ch) : _ISO_LETTER[ch];
    if (v == null) return null;
    total += v * (2 ** i);
  }
  return (total % 11) % 10 === Number(cn[10]);
}

/** 검산이 틀렸을 때, 마지막 자리를 바꾼 «맞는 번호»를 돌려준다(오타 후보 한 개). 없으면 ''. */
export function isoFixLastDigit(cnRaw) {
  const cn = String(cnRaw || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{4}\d{7}$/.test(cn)) return '';
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const ch = cn[i];
    const v = ch >= '0' && ch <= '9' ? Number(ch) : _ISO_LETTER[ch];
    if (v == null) return '';
    total += v * (2 ** i);
  }
  const d = (total % 11) % 10;
  const fixed = cn.slice(0, 10) + String(d);
  return fixed === cn ? '' : fixed;
}

// ─── 3.66-04: 리스트 번호 오타 짝 — 바로잡힌 번호와 옛 오타 번호가 같이 남는 것 ─────────────
//   검수사 2026-09-28 18:24 (실번호 중복 캡처) «이건 머죠?» · 18:47 «오타 구별건까지 정리하셨으면 합니다».
//   실측 RZOR R106W 선적 — «R106W_CLL Data 2차·3차.xls»·FIIS1·2 가 WKIU5243987(I·K 뒤바뀜)로 적었고
//     «최종.xls»·FIIS3·4 에서 WIKU5243987 로 바로잡혔다. 선적 리스트는 판을 합치므로(3.61-03 — 새 판에 없다고 옛 판 컨을
//     빼면 실선적 컨이 사라진다, R105W CICU9635360) 두 번호가 다 남아 «실번호 중복»·잔여 1대로 보였다. 터미널은 WIKU 를 실었다.
//   짝으로 보는 조건(전부 맞아야 한다 — 틀리게 빼는 것보다 남기는 것이 낫다).
//     ① 한쪽은 ISO 6346 검산이 틀리고 다른 쪽은 맞다 ② 같은 실번호(비었거나 0000 은 안 본다)를 **딱 둘이** 갖고 있다
//       — 셋 이상이 한 실을 나누면 가상번호 묶음(MAMP 621N DUMT1485546~65 20대·MCAP 624N)이라 손대지 않는다
//     ③ 번호 차이가 두 글자 이내(자리 바뀜 한 번은 한 글자) ④ 무게가 둘 다 있으면 같다 ⑤ keep(완료 기록 등)에 든 오타는 빼지 않는다.
//   전수 실측(보관+활성 리스트 678벌 143,760대 — EDI 까지 치면 177,408대·검산 틀린 번호 223개) — 짝은 RZOR R106E 선적 WKIU5243987→WIKU5243987 한 건.
//   ⑥ 실 EDI(가상 리스트 EDI 아님)가 그 오타 번호를 담고 있으면 빼지 않는다 — 호출부가 keep 에 넣는다(EDI 와 짝인 리스트 행을 지우지 않게, 감사 지적).
//   수집기 자동등록(autoRegApi.buildAutoPayload)과 앱 리스트 올리기(VoyagePage) 두 입구가 이 한 벌을 부른다.
function _osaDist(a, b) {   // 두 번호의 글자 차이(바꿈·넣음·뺌 1, 이웃 자리 바뀜 1)
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[n][m];
}
/** 리스트(컨번호 → 레코드)에서 번호 오타 짝을 찾는다. [{ typo, real, seal }] — typo·real 은 map 의 열쇠. */
export function listTypoTwins(map, keep = null) {
  const bySeal = new Map();
  for (const [k, r] of Object.entries(map || {})) {
    if (!r || typeof r !== 'object') continue;
    const cn = String(r.cn || k).replace(/[\s-]/g, '').toUpperCase();
    const s = normSeal(r.sl) || normSeal(r.eseal);
    if (!s || /^0+$/.test(s) || !/\d/.test(s)) continue;   // 숫자 없는 표기(OBWH 엠티 eseal «W» 140대)는 실번호가 아니다 — 감사 지적
    if (!bySeal.has(s)) bySeal.set(s, []);
    bySeal.get(s).push({ k, cn, r });
  }
  const out = [];
  for (const [s, g] of bySeal) {
    if (g.length !== 2) continue;
    const [a, b] = g;
    const ca = isoCheckDigit(a.cn), cb = isoCheckDigit(b.cn);
    const typo = ca === false && cb === true ? a : (cb === false && ca === true ? b : null);
    if (!typo) continue;
    const real = typo === a ? b : a;
    if (_osaDist(typo.cn, real.cn) > 2) continue;
    const wt = Number(typo.r.wt) || 0, wr = Number(real.r.wt) || 0;
    if (wt && wr && wt !== wr) continue;
    if (keep && (keep.has(typo.k) || keep.has(typo.cn))) continue;
    out.push({ typo: typo.k, real: real.k, seal: s });
  }
  return out;
}

// V8.10: 부두별 양적하 장비(호기) 목록.
//   PCTC = 4대(1~4호기). PNCT = 5대(1~5호기, 여객석이 RORO 작업을 해 1대 더). 부두 미상이면 최대(1~5호기)로 안전하게.
export function equipNumbersForPier(pier) {
  if (pier === 'PCTC') return ['1호기', '2호기', '3호기', '4호기'];
  if (pier === 'PNCT') return ['1호기', '2호기', '3호기', '4호기', '5호기'];
  return ['1호기', '2호기', '3호기', '4호기', '5호기'];
}

// 3.64-01: 항차의 부두 — 항차 정보의 부두(info.pier)가 먼저, 비었으면 선석 번호로(getPierFromBerth). 모르면 ''.
//   작업 선박 선택(LoginPage «호기(장비) — 부두»)과 수석 대시보드 «오늘 장비별 작업 보고» 부두 줄이 같이 쓰는 한 벌.
//   ⚠ 비슷한 인라인 사본은 이번 판에서 안 건드렸다 — utils 4곳(planWorkStart 류, 대문자로 바꿔 씀)·nlSearch 3548 은 같은 순서,
//     mir.js pierOf 는 선석 먼저·모르면 PCTC, HomePage 304 는 PORT-MIS 부두(pm.pier)를 먼저 본다(홈 카드는 부두가 나와도 여기선 «부두 미상» 일 수 있다).
//     실데이터(보관 303·진행 18항차, 2026-09-28 감사) — pier 값은 PCTC·PNCT·빈값뿐, pier 와 선석이 어긋난 항차 0 이라 앞 다섯은 결과가 같다.
//  ★ 일괄수리(2026-11-10) — **부두 판정 정본.** 순서는 콘앱 ctPierOf 와 같다 — ① pier(글자 안에 PNCT·PCTC 가 있으면 그것으로 정규화) → ② 선석(getPierFromBerth) → 모르면 ''.
//    값은 'PNCT' | 'PCTC' | '' 셋뿐이다. mir.pierOf · nlSearch.normPier·speedFromRecords·formatEta · chiefAnswers.answerShipSpeed 가 이것을 부른다(«모를 때 기본값» 은 부르는 자리에 그대로).
//    ⚠ 콘앱의 ③ 항로표(CT_LANE_PIER) ④ 터미널 항차 하이픈은 여기 없다 — 앱의 항로 사전(LANE_ROUTES)에는 부두 칸이 없다. 하이픈은 isPctcVoyage 가 따로 본다.
export function voyagePierOf(info) {
  const inf = info || {};
  const p = String(inf.pier || '').toUpperCase();
  if (p.includes('PNCT')) return 'PNCT';
  if (p.includes('PCTC')) return 'PCTC';
  const b = String(getPierFromBerth(inf.berth || inf.berthNo || '') || '').toUpperCase();
  return b.includes('PNCT') ? 'PNCT' : b.includes('PCTC') ? 'PCTC' : '';
}

// 3.64-01: 수석 대시보드 «오늘 장비별 작업 보고» — 부두 → 호기 두 단으로 센다.
//   왜 — 검수사 2026-09-28 «작업 보고에서 위치별 갱이 서로 같은데 동시 작업시 중복되면 어떻게 표기 하나?».
//     호기 번호는 두 부두에 다 있다(PCTC 1~4 · PNCT 1~5). 종전 M3.5.6 은 `r.equip` 하나로만 묶어
//     09-28 02:07~02:33 에 ATPR 2643E(PNCT 16번) 양하 완료·콘박스와 MCSN 637N(PCTC 7번) 해치 2장이 «4호기 4건» 한 칸이 됐다.
//   검수사 확정 — 수정안 A «부두별 줄» · «두 부두 줄 늘»(보고가 없는 부두도 줄을 보인다) · 보관소로 넘어간 배는 이번 판에서 안 센다.
//   reports — fbSubscribeAllReports 가 준 목록(voyageKey 가 붙어 있다) · voyages — 진행 중 항차 · sinceMs — 오늘 0시.
//   반환 { total, rows:[{ pier, total, cells:[{ eq, s|null }] }] } — rows 는 PCTC · PNCT(늘) · 그 밖 부두 · «부두 미상».
//   셈 종류(작업상태·해치·콘박스·데미지·실오류·작업중단)와 «미지정»(장비 없는 보고) 칸은 종전 그대로 — 미지정은 그 부두 줄 끝.
export const EQUIP_UNKNOWN_PIER = '부두 미상';
export function equipReportBoard(reports, voyages, sinceMs = 0) {
  const byPier = {};
  let total = 0;
  (reports || []).forEach((r) => {
    if (!r || !r.ts || r.ts < sinceMs || r.type === 'hold_event') return;   // 4.78: 보류 기록은 호기 보고 판의 셈이 아니다
    const v = (voyages && r.voyageKey && voyages[r.voyageKey]) || null;
    const pier = voyagePierOf(v && v.info) || EQUIP_UNKNOWN_PIER;
    const P = byPier[pier] || (byPier[pier] = {});
    //  4.77: 호기 이동 보고(crane_move) — 떠난 호기에 철수/이동/복귀, 도착 호기(to)에 «이동 도착» 으로 센다.
    if (r.type === 'crane_move') {
      const ends = [[r.equip || '미지정', String(r.kind || '')]]; if (r.to && (r.kind === 'withdraw' || r.kind === 'move')) ends.push([r.to, 'arrive']);
      for (const [eqx, kd] of ends) {
        const sx = P[eqx] || (P[eqx] = { total: 0, status: 0, hatch: 0, conbox: 0, damage: 0, sealError: 0, externalPause: 0, craneMove: {}, latest: 0 });
        sx.total++; sx.craneMove = sx.craneMove || {}; sx.craneMove[kd] = (sx.craneMove[kd] || 0) + 1; if (r.ts > sx.latest) sx.latest = r.ts;
      }
      total++; return;
    }
    const equip = r.equip || '미지정';
    const s = P[equip] || (P[equip] = { total: 0, status: 0, hatch: 0, conbox: 0, damage: 0, sealError: 0, externalPause: 0, craneMove: {}, latest: 0 });
    s.total++;
    if (r.type === 'work_status') s.status++;
    else if (r.type === 'hatch') s.hatch++;
    else if (r.type === 'conbox') s.conbox++;
    else if (r.type === 'damage') s.damage++;
    else if (r.type === 'seal_error') s.sealError++;
    else if (r.type === 'external_pause') s.externalPause++;
    if (r.ts > s.latest) s.latest = r.ts;
    total++;
  });
  const order = ['PCTC', 'PNCT',
    ...Object.keys(byPier).filter((p) => p !== 'PCTC' && p !== 'PNCT' && p !== EQUIP_UNKNOWN_PIER),
    ...(byPier[EQUIP_UNKNOWN_PIER] ? [EQUIP_UNKNOWN_PIER] : [])];
  const rows = order.map((pier) => {
    const P = byPier[pier] || {};
    //  정해진 부두는 그 부두 장비를 늘 보인다(빈 칸은 «작업 없음»). 모르는 부두는 보고에 나온 호기만.
    const eqs = (pier === 'PCTC' || pier === 'PNCT') ? [...equipNumbersForPier(pier)] : [];
    Object.keys(P).forEach((k) => { if (k !== '미지정' && !eqs.includes(k)) eqs.push(k); });
    if (P['미지정']) eqs.push('미지정');
    const n = Object.values(P).reduce((a, x) => a + x.total, 0);
    return { pier, total: n, cells: eqs.map((eq) => ({ eq, s: P[eq] || null })) };
  });
  return { total, rows };
}

// 4.87-10: workShiftOf(작업 시각 → 주간/야간/그외) 삭제 — 저장소 전체 호출 0건. 경계 규칙(주간 08:00~17:00 · 야간 전일 19:00~명일 05:30 ·
//   그 사이는 «그외»)은 이 주석으로 남긴다. 주야간 보고는 reportShiftToShow/buildShiftReport 가 담당.

// V9.57: tallyDayNight 삭제 — V8.10-2에서 화면 사용처(DayNightBadge)가 제거된 뒤 참조 0 확정
//   (지침서 V8.10 항목 "utils에 남아있으나 미사용 — 다음에 정리 가능" 이행). 주야간 보고는
//   reportShiftToShow/buildShiftReport가 담당. (workShiftOf 는 4.87-10 에서 삭제 — 경계 규칙은 위 주석)

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
//  ★ 3.63 — 컷은 **날짜까지 본 절대 시각**이다(shiftCutMs). 종전엔 완료 시각의 «시·분·초»만 17:00:00 과 견줘
//    어제 17:00:01~23:59 에 끝난 컨이 오늘 보고에서 «잔여»로 셌다(두 클로드 감사·2차 시뮬 실측 — 밤 배 TNJP 26362E 가 다음 날 17:00 에
//    «선적 잔여 23», 이틀 걸친 배는 전날 밤 양하 193대가 잔여). 같은 날 안의 판정은 한 대도 안 바뀐다.
export function shiftCutMs(shift, now = Date.now()) {
  const d = new Date(now || Date.now()); const m = d.getHours() * 60 + d.getMinutes();
  const c = new Date(d.getTime());
  if (shift === '야간') {
    //  야간 = 전일 19:00 ~ 당일 05:30. 17:30 뒤(그날 밤)면 다음 날 05:30, 새벽·낮이면 그날 05:30(지난밤).
    if (m >= 17 * 60 + 30) c.setDate(c.getDate() + 1);
    c.setHours(5, 30, 0, 0);
  } else {
    //  주간 = 08:00 ~ 17:00. 06:00 전(새벽)이면 어제 주간, 아니면 오늘 17:00(reportShiftToShow 의 표시창과 맞춘다).
    if (m < 6 * 60) c.setDate(c.getDate() - 1);
    c.setHours(17, 0, 0, 0);
  }
  return c.getTime();
}
//  3.66-02: forceBasis('작업량'|'잔여') — 갱별 보고에서 «붙인 완료» 를 못 믿을 때 잔여 쪽 표를 쓰게 한다(buildGangShiftReport). 없으면 종전(적은 쪽).
export function buildShiftReport(conts, shift, now, forceBasis = '') {
  const cutMs = shiftCutMs(shift, now);
  const isDoneByCut = (ts) => Math.floor(Number(ts) / 1000) * 1000 <= cutMs;   // 17:00:00.xxx 포함, 17:00:01 제외(초 단위 · 날짜까지 — 앱 완료는 ms 가 붙는다)
  const blank = () => ({ s20: { F: 0, E: 0 }, s40: { F: 0, E: 0 }, s45: { F: 0, E: 0 } });
  const sizeKey = (c) => { const l = isoToLabel(c.iso || c.type || ''); if (c.iso && /^(20|40|45)/.test(l || '')) return 's' + sizeLenOf(c);   /* 4.86-02: 규격 길이 한 벌(마감텔리 칸) — 읽히는 iso 만 */ return /^45/.test(l) ? 's45' : /^40/.test(l) ? 's40' : 's20'; };
  const feKey = (c) => (c.fe === 'E' ? 'E' : 'F');
  const tot = (t) => { const F = t.s20.F + t.s40.F + t.s45.F, E = t.s20.E + t.s40.E + t.s45.E; return { F, E, total: F + E }; };

  const doneTbl = blank(), remainTbl = blank();
  for (const c of (conts || [])) {
    const done = c._comp && c._comp.at && isDoneByCut(c._comp.at);
    (done ? doneTbl : remainTbl)[sizeKey(c)][feKey(c)] += 1;
  }
  const dT = tot(doneTbl), rT = tot(remainTbl);
  if (rT.total === 0) return { excluded: true, reason: '작업 완료 — 보고 제외' };
  const basis = (forceBasis === '작업량' || forceBasis === '잔여') ? forceBasis : (dT.total <= rT.total ? '작업량' : '잔여');
  const tbl = basis === '작업량' ? doneTbl : remainTbl;
  return { excluded: false, basis, tbl, total: tot(tbl), doneTotal: dT.total, remainTotal: rT.total };
}

//  ★ 3.63 — 주야간 작업보고가 세는 컨 목록 **한 벌**(WorkReportModal 주야간 화면 · 17시 갱별 보고 창이 같이 쓴다).
//    EDI ∪ records(records 가 EDI 위에 얹힌다) · 완료는 `_comp` · 평택분만(양하 = POD 평택 · 선적 = POL 평택).
export function shiftReportContainers(voyage, m) {
  const sec = (voyage && voyage[m]) || {};
  const edi = sec.ediContainers || {};
  const recs = sec.records || {};
  const comp = sec.completed || {};
  const out = [];
  //  ★ 4.16 (§7.8-①): 시프팅이면 평택분이 아니다 — 문지기 한 벌(isShiftOffPtk). 선사 리스트에 실려 온 시프팅은 평택분에도 남는다.
  const _ss = shiftCnSetOf(voyageKeyOf(voyage), voyage);
  //  ★ 4.20 (Fable 판정 ④ · 검수사 2026-10-10 00:02 «기본은 세관»): 양하 평택분은 ptkDischargeUnitsOf 한 벌 — 컨번호로 합친다(EDI 자리표시 키 __SLOT___ 와 records 의 같은 유닛을 두 번 세지 않는다).
  //    records 의 pod(세관 «최종항»)가 EDI pod 를 덮어 평택분에서 떨어뜨리던 길을 끊는다(ATPR 2643E 280 → 266 이던 것) — 평택 판정은 등재 여부뿐이다.
  if (m === 'discharge') {
    const U = ptkDischargeUnitsOf(voyage, _ss);   // 4.20 감사: 같은 시프팅 집합
    for (const cn of U.set) {
      if (isShiftOffPtk(_ss, recs, m, cn)) continue;
      const e = edi[U.ediKeyOf.get(cn)] || edi[cn] || {};
      const r = recs[cn] || {};
      //  3.63 — records 의 빈 칸은 EDI 를 덮지 않는다(아래 선적 갈래와 같은 규칙). pod 는 EDI 가 정본(고른 POD 는 resolvedPod 가 이미 반영) — 세관 «최종항» 이 보고서의 POD 를 바꾸지 않는다.
      const rr = Object.fromEntries(Object.entries(r).filter(([k, vv]) => vv !== '' && vv != null && !(k === 'pod' && e.pod && !r.pod_pick)));
      out.push(markDischargeUnit({ ...e, ...rr, cn, _comp: comp[cn] || null }, U));
    }
    return out;
  }
  const cns = new Set([...Object.keys(edi), ...Object.keys(recs)]);
  for (const cn of cns) {
    if (isShiftOffPtk(_ss, recs, m, cn)) continue;
    const e = edi[cn] || {};
    const r = recs[cn] || {};
    //  ⚠ 3.63 — records 의 **빈 칸은 EDI 를 덮지 않는다**(App.jsx 상세 모달 머지와 같은 규칙). 2차 시뮬 실측 — TNJP 26362E 는 records pod 가 «» 라
    //    양하 156대가 통째로 평택분에서 빠졌고, live OBWH 2751E 도 RF·긴급 리스트 51대가 그랬다. 기록 iso «» 는 40ft 를 20ft 로 셌다.
    const c = { ...e, ...Object.fromEntries(Object.entries(r).filter(([, vv]) => vv !== '' && vv != null)), cn, _comp: comp[cn] || null };
    // 평택분만: 양하=POD 평택, 선적=POL 평택.
    const ptk = m === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
    if (ptk) out.push(c);
  }
  return out;
}

// ── ★ 3.63 카페리 17:00 주간 작업보고 — 갱별 ─────────────────────────────────
//  검수사 2026-09-27 «그 보고를 자동으로 음성과 함께 시간이 도래하면 화면에 띄워줄수 있나요. 대상은 TNJP OBWH RZOR 3척입니다» ·
//    «두군데 검수앱 수석대쉬보드에 뜨게 해주고 검수앱 작업중인 검수원에 카톡보고 버튼추가» · «갱별보고여야함» · (갱별 내용) «갱별 규격표까지».
//  갱 = 터미널 호기(동방 QC10x). 재료 둘 — ① 동방이 1분마다 주는 **호기별 합계**(info.qcWork: 양하·선적 완료/잔여 대수 — 정본)
//    ② 컨별 **선내위치·완료 시각**(termWork — 호기는 없다). 검수사 확정 2026-09-04 «컨넘버와 시간 선내위치가 나옵니다 그리고
//    좌현인지 우현인지만 알면 갱을 인지 할수 있습니다» — ②에 바구니 호기 붙이기(basketCranesOf)를 써서 컨마다 호기를 붙인다.
//  남은 컨(아직 안 한 것)은 호기가 없다 — «크레인은 서로 못 넘는다»로 선수 호기부터 제 **QC 잔여 대수 비율만큼** 작은 장부터 나눈다.
//    실측(보관 OBWH 9항차, 17:00 기준) — 이렇게 나눈 잔여가 사후 실적과 98~100% 같았고, 붙인 완료 합계는 QC 합계와 0~7% 차이.
//  ⛔ 안벽 순서 × 접안 방향으로 호기 순서를 못 정하는 배(RZOR 3호기 LO/LO · 5호기 RO/RO — 같은 자리 02 를 나눠 한다, 붙이면 14~45% 틀림)와
//    붙인 값이 QC 합계와 10% 넘게 다른 배는 **갱별 규격표를 내지 않는다** — 갱별 대수(QC 합계 그대로)만 낸다. 지어내지 않는다.
//    베이사전이 없는 배도 규격표를 내지 않는다(홀수 베이가 다른 장으로 쪼개져 바구니가 틀린다 — hatchEventsOf 와 같은 보수, 2차 시뮬 실측 72~79%).
//    접안 방향을 뒤집어 붙인 쪽이 QC 합계에 더 맞으면 방향 자료를 의심하고 규격표를 내지 않는다(2차 시뮬 — 반대 방향이 합계 문지기를 절반 통과).
export { isNoShiftShip } from './workShift.js';   // 4.79: 주야 구분 없는 배(연태 OBWH·일조 RZOR·SMYA) 판정 한 벌 — 구현은 순수 모듈 workShift.js(NO_SHIFT_SHIPS 목록도 거기 한 곳)
export const FERRY_1700_SHIPS = shipCodesWith('ferry1700');   // ★ 일괄수리(2026-11-10): 선박 성질표(shipPolicyCore.SHIP_FLAGS) 한 곳에서 — TNJP · OBWH · RZOR
export function isFerry1700Ship(info, key = '') {
  const v = String((info && info.vsl) || String(key || '').split('_')[0] || '').trim().toUpperCase();
  return FERRY_1700_SHIPS.includes(v);
}
//  QC 합계만으로 내는 한 쪽 보고(규격표 없음). 한 대도 안 맡은 쪽은 none.
function _qcCountReport(done, rest) {
  if (!done && !rest) return { none: true };
  if (!rest) return { excluded: true, reason: '작업 완료 — 보고 제외', doneTotal: done, remainTotal: 0 };
  const basis = done <= rest ? '작업량' : '잔여';
  return { excluded: false, countsOnly: true, basis, total: { total: basis === '작업량' ? done : rest }, doneTotal: done, remainTotal: rest };
}
//  ★ 4.77 — **동방 3호기(QC103)는 실 LOLO 물량만.** 검수사 2026-11-08 «4.36대가 맞습니다. 실제적으로 불가능 합니다. 동방 자료는 임의적으로 갱에 분산을 시키는 경우가 있습니다. 고로 3호기는 실 LOLO.물량만 적용하면 됩니다».
//  실측 RZOR R123E(동방 14번선석) — info.qcWork 는 QC103 양하 96 · QC105 양하 86 으로 나뉘지만 마감텔리 3호기 LOLO 양하는 36대다. 동방이 RORO(105호기=램프) 몫을 두 곳에 나눠 적었다.
//  양하 EDI 의 `lolo:true` 컨이 정확히 36대다 → 3호기 양하 = LOLO 컨(완료 = 그중 완료 기록에 있는 것, 잔여 = 나머지), 105호기 = 동방 합계 − 3호기(합계는 그대로라 총량·진행·끝나는 시각 계산은 안 변한다).
//  선적 EDI 에는 lolo 표식이 없다 — 동방 선적 수치(QC103 32대 = 마감텔리 LOLO 리퍼 엠티 32대)는 그대로 둔다.
//  QC103 과 QC105 가 같이 있는 배만(= RORO 겸용선) · 양하 EDI 에 lolo 컨이 있을 때만. 순수 함수 — 콘앱(window.ConeParse)도 같이 부른다.
export function qcWorkLoloSplit(qcWork, loloCns, compMap) {
  if (!qcWork || typeof qcWork !== 'object' || !Array.isArray(loloCns) || !loloCns.length) return qcWork;
  const keys = Object.keys(qcWork);
  const k3 = keys.find((k) => /(?:^|\D)103$/.test(String((qcWork[k] && qcWork[k].qc) || k)));
  const k5 = keys.find((k) => /(?:^|\D)105$/.test(String((qcWork[k] && qcWork[k].qc) || k)));
  if (!k3 || !k5 || !qcWork[k3] || !qcWork[k5]) return qcWork;
  const q3 = qcWork[k3], q5 = qcWork[k5];
  const n = (x) => Math.max(0, Number(x) || 0);
  const sumDone = n(q3.disDone) + n(q5.disDone), sumRest = n(q3.disRest) + n(q5.disRest);
  const comp = compMap || {};
  const L = loloCns.length;
  //  터미널 3호기 양하 합계가 LOLO 총수보다 클 때만 분리한다(램프 물량이 3호기에 섞인 경우). 같거나 작으면 그대로 — 앱 완료(completed) 반영이 늦어도 흔들리지 않게
  //  3호기 몫의 상한은 LOLO 총수 L, 완료분은 터미널 3호기 완료(없으면 앱 완료 하한) 로 잡는다.
  if (n(q3.disDone) + n(q3.disRest) <= L) return qcWork;
  const lb = Math.max(loloCns.filter((cn) => comp[cn]).length, L - sumRest);   // 적어도 이만큼은 끝났다
  const d3 = Math.min(L, sumDone, Math.max(lb, n(q3.disDone)));
  const r3 = Math.min(Math.max(0, L - d3), sumRest);
  if (d3 === n(q3.disDone) && r3 === n(q3.disRest)) return qcWork;
  return { ...qcWork,
    [k3]: { ...q3, disDone: d3, disRest: r3, total: d3 + r3 + n(q3.lodDone) + n(q3.lodRest), termDisDone: n(q3.disDone), termDisRest: n(q3.disRest) },
    [k5]: { ...q5, disDone: sumDone - d3, disRest: sumRest - r3, total: (sumDone - d3) + (sumRest - r3) + n(q5.lodDone) + n(q5.lodRest), termDisDone: n(q5.disDone), termDisRest: n(q5.disRest) } };
}
//  항차 한 벌에 위 분리를 입힌다(메모리 복사 — RTDB 는 그대로). 구독 손질(firebase._postVoyage)이 부른다 — 모든 화면이 같은 호기별 값을 본다.
export function qcWorkLoloFix(v) {
  const qw = v && v.info && v.info.qcWork;
  if (!qw || typeof qw !== 'object') return v;
  const edi = v.discharge && v.discharge.ediContainers;
  if (!edi || typeof edi !== 'object') return v;
  const lolo = [];
  for (const c of Object.values(edi)) if (c && c.lolo === true && c.cn) lolo.push(String(c.cn).toUpperCase());
  if (!lolo.length) return v;
  const comp = {};
  for (const [cn, r] of Object.entries(v.discharge.completed || {})) if (r) comp[String(cn).toUpperCase()] = r;
  const next = qcWorkLoloSplit(qw, lolo, comp);
  return next === qw ? v : { ...v, info: { ...v.info, qcWork: next } };
}
//  동방 호기 표 → [{no, qc, disDone, disRest, lodDone, lodRest}] 호기 번호 오름차순. qc 칸이 없으면 키(QC101)로 · 네 칸이 다 0 인 호기(쉬는 호기)는 뺀다.
export function qcRowsOf(qcWork) {
  return Object.entries(qcWork || {}).filter(([, q]) => q && typeof q === 'object')
    .map(([k, q]) => ({ no: crewCraneNo(q.qc || k), qc: String(q.qc || k), disDone: Number(q.disDone) || 0, disRest: Number(q.disRest) || 0, lodDone: Number(q.lodDone) || 0, lodRest: Number(q.lodRest) || 0 }))
    .filter((q) => q.no && (q.disDone + q.disRest + q.lodDone + q.lodRest) > 0)
    .sort((a, b) => a.no - b.no);
}
export const GANG_TABLE_MAX_ERR = 0.10;   // 붙인 완료 합계 ↔ QC 합계 차이가 이것을 넘으면 갱별 규격표를 내지 않는다
//  opts.qcSnap = {at, qcWork} — 마감 직후 굳혀 둔 호기 표(대수만 내는 배의 숫자를 마감 시각에 맞춘다). 없으면 지금 값.
//  ★ 3.64 — opts.shift('주간'|'야간')·opts.cutMs — 지난 마감(어제 17:00 · 오늘 05:30)의 보고를 나중에 다시 센다(검수사 «놓쳐서 작업 보고를 못했을떄
//    17시 기준으로 갱별 작업 보고 자료가 남아 있어야 합니다» · «익일까지 작업하게 되면 전날 주간과 야간작업 자료 즉 두건을 보관»). 컨별 완료 시각으로 다시 세니
//    늦게 열어도 그 마감 값이다. buildShiftReport 에는 now 자리에 마감 시각을 넘긴다(shiftCutMs 가 같은 마감을 돌려준다).
export function buildGangShiftReport(voyage, pages = null, now = Date.now(), opts = {}) {
  const info = (voyage && voyage.info) || {};
  const shift = (opts && opts.shift) === '야간' ? '야간' : '주간';
  const cutMs = (opts && opts.cutMs) || shiftCutMs(shift, now);
  const conts = { discharge: shiftReportContainers(voyage, 'discharge'), loading: shiftReportContainers(voyage, 'loading') };
  const ship = { discharge: buildShiftReport(conts.discharge, shift, cutMs), loading: buildShiftReport(conts.loading, shift, cutMs) };
  const snap = opts && opts.qcSnap && opts.qcSnap.qcWork && opts.qcSnap.at ? opts.qcSnap : null;
  const qcs = qcRowsOf(info.qcWork);
  const nos = qcs.map((q) => q.no);
  //  17:00 뒤에 끝난 대수(컨별 완료 시각이라 정확) — 호기 표를 쓰는 숫자에 17:00 뒤 작업이 얼마나 섞였는지 밝힌다.
  const qcAt = snap ? snap.at : now;
  const postCut = ['discharge', 'loading'].reduce((a, m) => a + conts[m].filter((c) => c._comp && c._comp.at > cutMs && c._comp.at <= qcAt).length, 0);
  const out = { shift, cutMs, ship, postCut, qcAt, gangs: [], perGang: false, why: '', unknown: { discharge: 0, loading: 0 }, err: null };
  if (!nos.length) { out.why = '터미널 호기 집계가 아직 없어 갱을 못 나눕니다'; return out; }
  const qcOnly = (why) => {
    out.why = why;
    const src = snap ? qcRowsOf(snap.qcWork) : qcs;
    out.gangs = src.map((q) => ({ no: q.no, qc: q.qc, qcNow: q, discharge: _qcCountReport(q.disDone, q.disRest), loading: _qcCountReport(q.lodDone, q.lodRest) }));
    return out;
  };
  const _k = { discharge: 'dis', loading: 'lod' };
  let craneOf = null;   // mode → cn → 호기
  if (nos.length === 1) {
    craneOf = { discharge: {}, loading: {} };
    for (const m of ['discharge', 'loading']) for (const c of conts[m]) craneOf[m][c.cn] = nos[0];
  } else {
    const side = berthSideOf(info);
    if (!side) return qcOnly('접안 방향(좌현·우현)이 아직 안 와서 갱 자리를 못 정합니다 — 갱별 규격표 없이 터미널 호기 집계 대수만 냅니다');
    const _pier = String(info.pier || getPierFromBerth(info.berth) || '').toUpperCase();
    if (!QUAY_CRANE_ORDER[_pier]) return qcOnly('부두(안벽)를 몰라 호기 자리를 못 정합니다 — 갱별 규격표 없이 터미널 호기 집계 대수만 냅니다');
    const order = quayOrderOf(voyage, nos);   // 선수 → 선미
    if (!order) return qcOnly(`안벽 순서에 없는 호기(${nos.map((n) => n + '호기').join('·')} 중)가 있어 갱 자리를 못 정합니다 — 갱별 규격표 없이 터미널 호기 집계 대수만 냅니다`);
    if (!pages || !pages.length) return qcOnly('베이사전이 없어 장(해치)을 못 묶습니다 — 갱별 규격표 없이 터미널 호기 집계 대수만 냅니다');
    //  ① 터미널 실적에 바구니로 호기를 붙인다(해치 자동 판정과 같은 한 벌). 앞머리(첫 바구니 전)는 그 장을 처음 맡은 호기, 없으면 가까운 장의 호기.
    const rows = [];
    for (const m of ['discharge', 'loading']) {
      for (const [cn, r] of Object.entries(((voyage && voyage[m]) || {}).termWork || {})) {
        if (!r || !r.at || r.at > now + 5 * 60000) continue;
        const p = parseCatosPos(r.pos); if (!p) continue;
        const bay = parseInt(p.bay, 10); if (!(bay > 0)) continue;
        const eq = crewCraneNo(r.equip);
        rows.push({ cn, m, at: r.at, bay, hatch: hatchEvenOf(bay, pages) ?? bay, tier: parseInt(p.tier, 10) || 0, crane: nos.includes(eq) ? eq : 0 });
      }
    }
    rows.sort((a, b) => a.at - b.at || a.bay - b.bay);
    let first = {};
    if (!rows.some((r) => r.crane)) first = basketCranesOf(voyage, rows, nos).first;
    else rows.forEach((r) => { if (r.crane && !first[r.hatch]) first[r.hatch] = r.crane; });
    const known = Object.keys(first).map(Number).filter((h) => Number.isFinite(h));
    if (!known.length) return qcOnly('두 호기가 같은 분에 서로 다른 장을 한 실적이 아직 없어 갱을 못 가립니다 — 터미널 호기 집계 대수만 냅니다');
    const nearCrane = (h) => { if (first[h]) return first[h]; if (!Number.isFinite(h)) return 0; const k = known.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a)); return first[k] || 0; };
    rows.forEach((r) => { if (!r.crane) r.crane = nearCrane(r.hatch); });
    //  ② 문지기 — 붙인 완료 합계가 QC 합계와 크게 다르면 규격표를 내지 않는다(조용히 틀리지 않는다). 방향을 뒤집은 쪽이 더 맞으면 방향 자료를 의심한다.
    const rev = {}; order.forEach((no, i) => { rev[no] = order[order.length - 1 - i]; });
    let err = 0, errRev = 0, tot = 0;
    for (const q of qcs) for (const m of ['discharge', 'loading']) {
      const want = q[_k[m] + 'Done'];
      err += Math.abs(rows.filter((r) => r.m === m && r.crane === q.no).length - want);
      errRev += Math.abs(rows.filter((r) => r.m === m && rev[r.crane] === q.no).length - want);
      tot += want;
    }
    out.err = tot ? err / tot : 0;
    if (tot >= 20 && errRev + 0.02 * tot < err) return qcOnly('접안 방향을 뒤집어 붙인 쪽이 호기 합계에 더 맞습니다 — 방향 자료를 확인할 때까지 갱별 규격표 없이 집계 대수만 냅니다');
    //  ★ 3.66-02 — **붙인 완료를 못 믿어도 «잔여» 표는 낸다**(검수사 2026-09-28 16:04 «규격표가 없으면 어떻게 주간보고를 할수있죠?» · 16:10 동방 «본선 작업 현황» 캡처 «이곳 참조는 하시나요?»).
    //    완료 쪽은 위치로 호기를 붙인 값이라 호기가 장을 옮겨 다니면 틀린다(실측 OBWH 2751E 16:12 — 12:30~12:50 14번 장 11대를 1호기가 했는데 2호기로 붙어 85/81 ↔ 터미널 96/70).
    //    남은 컨은 다르다 — 아래 ④가 선수 호기부터 **터미널 호기별 잔여 대수**로 작은 장부터 나눈다. 동방 베이별 잔여(bayWork)로 재 보면
    //    16:12 1호기 43 = 02·06·10번 장(14+28+1) · 2호기 54 = 14·18번 장(46+8)로 정확히 떨어졌다(16:31·16:36 도 같음 — 2차 시뮬). 그래서 종전처럼 통째로 막지 않고,
    //    터미널 호기 대수로 «작업량(완료)» 기준이 되는 쪽만 대수로 내리고 «잔여» 기준 쪽은 규격표를 낸다.
    out.doneUnsure = tot >= 20 && out.err > GANG_TABLE_MAX_ERR;
    craneOf = { discharge: {}, loading: {} };
    for (const r of rows) craneOf[r.m][r.cn] = r.crane;
    //  ③ 앱으로 찍은 완료의 호기(사람이 고른 호기)는 그대로 쓴다 — 터미널 실적이 없는 컨만.
    for (const m of ['discharge', 'loading']) for (const c of conts[m]) {
      if (craneOf[m][c.cn]) continue;
      const e = crewCraneNo(c._comp && c._comp.equip); if (e && nos.includes(e)) craneOf[m][c.cn] = e;
    }
    //  ④ 남은 컨 — 선수 호기부터 제 QC 잔여 비율만큼, 작은 장부터(양하는 위 단부터 · 선적은 아래 단부터). 자리 모르는 컨은 «호기 미상».
    for (const m of ['discharge', 'loading']) {
      const pend = [];
      for (const c of conts[m]) {
        if (craneOf[m][c.cn]) continue;
        const b = parseInt(normalizeBay(c.bay_actual || c.bay || ''), 10);
        if (!(b > 0)) { out.unknown[m]++; continue; }   // 자리도 호기도 모른다 — 어느 갱에도 넣지 않고 «호기 미상»으로 센다
        const h = hatchEvenOf(b, pages) ?? b;
        if (c._comp) { craneOf[m][c.cn] = nearCrane(h); continue; }   // 완료인데 실적 행이 없다 — 가까운 장의 호기
        pend.push({ cn: c.cn, h, tier: parseInt(c.tier_actual || c.tier, 10) || 0 });
      }
      pend.sort((a, b) => a.h - b.h || (m === 'discharge' ? b.tier - a.tier : a.tier - b.tier) || (a.cn < b.cn ? -1 : 1));
      const tgt = order.map((no) => (qcs.find((q) => q.no === no) || {})[_k[m] + 'Rest'] || 0);
      const T = tgt.reduce((a, b) => a + b, 0);
      if (!T) { pend.forEach((p) => { craneOf[m][p.cn] = nearCrane(p.h); }); continue; }
      let acc = 0; const bounds = tgt.map((t) => { acc += t; return Math.round(pend.length * acc / T); });
      pend.forEach((p, i) => { const k = bounds.findIndex((bd) => i < bd); craneOf[m][p.cn] = order[k < 0 ? order.length - 1 : k]; });
    }
  }
  out.perGang = true;
  if (nos.length >= 2) { out.side = berthSideOf(info); out.bow = (quayOrderOf(voyage, nos) || [])[0] || 0; }   // 화면이 «우현 기준 · 선수 N호기»를 밝힌다(눈으로 잡게)
  out.gangs = qcs.map((q) => {
    const g = { no: q.no, qc: q.qc, qcNow: q };
    for (const m of ['discharge', 'loading']) {
      const list = conts[m].filter((c) => craneOf[m][c.cn] === q.no);
      g[m] = list.length ? buildShiftReport(list, shift, cutMs) : { none: true };
      //  3.66-02 — 붙인 완료를 못 믿을 때: 기준은 터미널 호기 대수로 정한다(적은 쪽). 작업량 기준이면 대수만, 잔여 기준이면 잔여 규격표.
      //    ⚠ 호기 대수는 마감 직후 굳혀 둔 표(qcSnap)가 있으면 그것 — 대수만 내는 경로(qcOnly)와 같은 한 벌(감사 — 다시 셀 때 «지금» 대수로 17:00 잔여를 지웠다).
      //    ⚠ 잔여 표 합이 터미널 호기 잔여와 10%(최소 2대) 넘게 다르면 표를 믿지 않는다 — 대수만(감사 — 터미널 실적 반영 전 컨·자리 모르는 컨·마감 뒤 끝난 컨이 섞일 때).
      if (out.doneUnsure) {
        const qq = (snap ? qcRowsOf(snap.qcWork) : qcs).find((x) => x.no === q.no) || q;
        g.qcNow = qq;   // 3.66-03: 카드 머리 숫자도 본문과 같은 호기 표(굳힌 표) — 감사 «머리 139/0 · 본문 완료 96 · 잔여 43»
        const qd = qq[_k[m] + 'Done'], qr = qq[_k[m] + 'Rest'];
        if (!qd && !qr) g[m] = { none: true };
        else if (!qr || qd <= qr || !list.length) g[m] = _qcCountReport(qd, qr);
        else {
          const f = buildShiftReport(list, shift, cutMs, '잔여');
          if (f.excluded || Math.abs(f.remainTotal - qr) > Math.max(2, Math.round(qr * 0.1))) { g[m] = _qcCountReport(qd, qr); out.remainOff = true; }
          else g[m] = { ...f, doneTotal: qd };   // 완료 대수는 터미널 값(붙인 값은 틀릴 수 있다)
        }
      }
    }
    return g;
  });
  if (out.doneUnsure) {
    out.why = `위치로 붙인 완료가 터미널 호기 집계와 ${Math.round(out.err * 100)}% 달라 완료(작업량) 기준 갱은 대수만 냅니다 — 잔여 기준 갱은 남은 컨을 선수 호기부터 터미널 호기별 잔여 비율로 나눈 규격표입니다`
      + (out.remainOff ? ' · 앱 잔여가 터미널 호기 잔여와 맞지 않는 갱도 대수만 냅니다' : '');
    //  대수만 나가는 갱이 있으면 배 전체 규격표를 같이 붙인다(화면 VoyageBlock · 카톡 — 종전 대수만 배와 같게).
    out.shipTable = out.gangs.some((g) => ['discharge', 'loading'].some((m) => g[m] && g[m].countsOnly));
  }
  return out;
}

//  시각 칸 모양이 둘이다 — workEndAt «2026-09-07 19:00» · atdActual «2026/09/07 19:30»(동방). 완료 표식은 ms 숫자(dischargeDoneAt·loadingDoneAt).
const _ferryTs = (s) => { if (typeof s === 'number') return s; const m = String(s || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0; };
//  그 마감의 보고가 설 배인가(한 벌 — 17시 창과 보관 목록이 같이 쓴다). 마감 전에 끝난 표식(작업 끝·ATD·수석 완료)이 있으면 아니다 ·
//    그 근무 창(주간 06:00~17:00 · 야간 17:00~익일 05:30)에 한 대라도 끝냈어야 한다 · 두 쪽 다 보고 제외(잔여 0 또는 17:00 전 쪽별 완료 표식)면 아니다.
function _ferryCutApplies(voyage, shift, cutMs, winStart) {
  const info = (voyage && voyage.info) || {};
  const endAt = _ferryTs(info.workEndAt), atd = _ferryTs(info.atdActual);
  const insp = _ferryTs(info.inspectorDoneAt) || (info.inspectorDone === true ? 0 : _ferryTs(info.inspectorDone));   // 시각이 있으면 시각으로(마감 뒤 마감 처리면 보고는 선다)
  //  한 쪽 완료 표식(양하·선적)이 마감 전이면 그 쪽은 보고할 것이 없다 — 셧아웃 잔여를 «잔여»로 읽지 않는다(재감사 권장).
  const sideDone = (m) => !!(info[m + 'Done'] && _ferryTs(info[m + 'DoneAt']) && _ferryTs(info[m + 'DoneAt']) <= cutMs);
  if ((endAt && endAt <= cutMs) || (atd && atd <= cutMs) || (insp && insp <= cutMs)) return false;
  let worked = false;
  for (const m of ['discharge', 'loading']) {
    const sec = (voyage && voyage[m]) || {};
    for (const src of [sec.completed || {}, sec.termWork || {}]) {
      //  초 단위로 본다 — 보고 표(isDoneByCut)와 같은 경계(17:00:00.500 완료는 주간 창 · 감사·2차 시뮬 지적).
      for (const r of Object.values(src)) { const t = r && r.at ? Math.floor(Number(r.at) / 1000) * 1000 : 0; if (t && t > winStart && t <= cutMs) { worked = true; break; } }
      if (worked) break;
    }
    if (worked) break;
  }
  if (!worked) return false;
  const rd = buildShiftReport(shiftReportContainers(voyage, 'discharge'), shift, cutMs);
  const rl = buildShiftReport(shiftReportContainers(voyage, 'loading'), shift, cutMs);
  return !((rd.excluded || sideDone('discharge')) && (rl.excluded || sideDone('loading')));
}

//  ★ 3.63 — 지금 17시 보고 창을 띄울 배인가. 17:00:00 ~ 17:29:59(보고는 17:30 전 — V8.10 확정) · 대상 3척 ·
//    오늘 **주간(06:00~17:00)에** 한 대라도 끝낸 배(내일 배·안 한 배·새벽에 끝난 밤 배는 안 뜬다) ·
//    17:00 전에 끝난 표식(작업 끝 시각·수석 완료·양하 선적 둘 다 완료·출항)이 있으면 안 뜬다(셧아웃 잔여로 «떠난 배»를 읽지 않게 — 감사 지적) ·
//    두 쪽 다 17:00 에 끝났으면(보고 제외) 안 뜬다.
export function ferry1700Due(voyage, now = Date.now(), key = '') {
  const info = (voyage && voyage.info) || {};
  if (!isFerry1700Ship(info, key)) return false;
  const d = new Date(now); const mm = d.getHours() * 60 + d.getMinutes();
  if (mm < 17 * 60 || mm >= 17 * 60 + 30) return false;
  const cut = shiftCutMs('주간', now);
  const d0 = new Date(now); d0.setHours(6, 0, 0, 0);
  return _ferryCutApplies(voyage, '주간', cut, d0.getTime() - 1);
}

//  ★ 3.64 — 카페리 작업이 끝났나(보관한 17시·05시30분 보고가 같이 사라지는 때 — 검수사 «사라지는 시점은 작업 완료 되면 같이 사라지면 됩니다»).
//    끝 = 수석 완료(inspectorDone) · 양하·선적 완료 표식(있는 쪽 전부 — HomePage.isAllDone 과 같은 규칙) · 작업 끝 시각·출항(ATD)이 지남.
//    ⛔ «남은 컨 0» 으로는 끝내지 않는다 — 마지막 컨이 끝나는 순간 보관이 사라져 17:00~17:29 에 끝난 배는 놓친 보고를 다시 볼 길이 없었다
//      (2차 시뮬 실측 OBWH 2749E 17:29 · RZOR R097E 17:21 — 실제 표식은 38·9분 뒤). 선적 리스트가 아직 없을 때 양하만 끝나도 «끝»이 되던 구멍도 같이 막힌다.
export function ferryWorkDone(voyage, now = Date.now()) {
  const info = (voyage && voyage.info) || {};
  if (info.inspectorDone) return true;
  const endAt = _ferryTs(info.workEndAt), atd = _ferryTs(info.atdActual);
  if ((endAt && endAt <= now) || (atd && atd <= now)) return true;
  return inspectorAllDone(voyage);   // 4.55-01: 보유 모드 판정은 inspectorAllDone 한 벌(홈 isAllDone 과 같다)
}

//  ★ 3.64 — 보관할 보고 목록(최신이 위). 지난 사흘 안의 주간(그날 17:00 마감 · 창 06:00~) · 야간(다음 날 05:30 마감 · 창 17:00~) 마감 가운데
//    이미 지났고 그 배에 보고가 서는 것. 작업이 끝났으면 빈 목록. 열쇠 «YYYY-MM-DD_주간|야간»(근무를 시작한 날) — 마감 때 적어 두는 보고(info.shiftReports)도 이 열쇠다.
//  3.66 — 마감 보고 열쇠 «YYYY-MM-DD_주간|야간» — 주간은 마감(17:00) 날짜, 야간은 시작한 날(마감 05:30 의 전날). ferryReportCuts·17시 창과 같은 꼴.
export function shiftReportKey(shift, cutMs) {
  const d = new Date(Number(cutMs) - (shift === '야간' ? 86400000 : 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${shift === '야간' ? '야간' : '주간'}`;
}
export function ferryReportCuts(voyage, now = Date.now(), key = '') {
  const info = (voyage && voyage.info) || {};
  if (!isFerry1700Ship(info, key) || ferryWorkDone(voyage, now)) return [];
  const out = [];
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  for (let back = 0; back <= 3; back++) {
    const day = new Date(now); day.setDate(day.getDate() - back); day.setHours(0, 0, 0, 0);
    const dayCut = new Date(day); dayCut.setHours(17, 0, 0, 0);
    const nightCut = new Date(day); nightCut.setDate(nightCut.getDate() + 1); nightCut.setHours(5, 30, 0, 0);
    const d6 = new Date(day); d6.setHours(6, 0, 0, 0);
    if (nightCut.getTime() <= now && _ferryCutApplies(voyage, '야간', nightCut.getTime(), dayCut.getTime())) out.push({ key: `${ymd(day)}_야간`, shift: '야간', cutMs: nightCut.getTime() });
    if (dayCut.getTime() <= now && _ferryCutApplies(voyage, '주간', dayCut.getTime(), d6.getTime() - 1)) out.push({ key: `${ymd(day)}_주간`, shift: '주간', cutMs: dayCut.getTime() });
  }
  return out.sort((x, y) => y.cutMs - x.cutMs);
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
  } catch { /* 저장된 좌표를 못 읽으면 기본 좌표를 쓴다 */ }
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

/** ★ 3.52 — **리스트(세관) 선사와 EDI 선사 중 무엇을 쓸 것인가. 한 벌이다(규범 §4-4).**
 *
 *  검수사 확정 2026-09-15 «SOC가 있는 선박은 선사기준을 세관리스트로 합니다». 그래서 세관
 *  «선사부호» 를 읽게 했는데, 그것을 그냥 덮으면 **3.31 이 고친 것을 되돌린다.**
 *
 *  실측(STMJ 2651E 양하) — 세관은 `DWS 17` 로 **뭉쳐** 주는데 EDI 는 `DSL 10 + CSC 7` 로 **갈라** 준다.
 *    세관이 그냥 이기면 17대가 DWS 한 덩어리가 되고, 그러면 목록에 CSC 가 없어져 `opAliasNeeds` 가
 *    «가를 근거 없음» 으로 판단해 DWS 그대로 둔다 ⇒ **정본 마감텔리의 «(CSC) TAO 7» · «(DSL) TAO 10»
 *    구분이 통째로 사라진다.** 자식이 부모로 퇴행하는 것은 개선이 아니라 손실이다.
 *
 *  그래서 규칙은 하나다 — **더 자세한 쪽을 쓴다.**
 *    ① 한쪽이 비면 있는 쪽  ② 같으면 그대로
 *    ③ EDI 값이 그 배 사전에서 리스트 값의 **자식**이면 EDI(자세한 쪽)를 지킨다
 *    ④ 그 밖에는 리스트(세관) — EDI 선사 칸에는 `SOC`·`OLL`·`NOL` 처럼 선사가 아닌 값이 오기 때문이다.
 *  ③ 덕분에 `DSL`·`CSC`(부모 DWS)는 살아남고, `SOC`·`OLL`(누구의 자식도 아님)은 세관 값으로 바뀐다.
 *  ★ 3.66-01 — **기준은 세관이 아니라 그 배 마감텔리다**(검수사 2026-09-28 «모든 선사기준은 마감 텔리로 해야 합니다»).
 *    XTPG 542E 별첨1 이 세관 선사부호 앞 세 글자(CKC·SHI·KMT·PCS·SNT)를 찍었는데 실물 마감텔리는 CKL·SIF·KMD·DYS·CLL 이었다.
 *    그 변환은 여기서 하지 않고 **뒤에 지나는 배별 별칭(shipOpMapper · tallyFormats opAlias)** 이 한다 — 실물 Final Work 로 확인한
 *    코드만 적는다. 여기서 «마감텔리 코드인 쪽» 을 고르게 했더니(1차안) 마감텔리 입구(ptkContainers)·미르처럼 **별칭을 먼저 씌운
 *    EDI 값**을 넘기는 경로에서 DXQD 의 NOL→DWS 가 세관 SKR 을 이겨 «(SKR) DLC» 줄이 사라졌다(2차 시뮬·감사 실측 2638E 17·2637E 16).
 *    고르기는 3.52 그대로 두고 이름 바꾸기는 별칭 한 곳에 — 부르는 순서가 달라도 답이 같다. 1,337대 전환 전부가 별칭만으로 같은 값이다.
 */
export function pickCarrierOp(listOp, ediOp, vslCode) {
  //  ⚠ 양쪽을 먼저 같은 잣대로 편다 — 자료마다 4·5자 코드로 온다(세관 `DWIC`·`TJMS` · 합본 `Line` ·
  //    일반 리스트 파서는 정규화 없이 저장한다). 안 펴면 `DWIC` 와 `CSC` 를 비교하게 되어
  //    **자식이 죽는다**(감사 실측 — `pickCarrierOp('DWIC','CSC','STMJ')` 가 DWIC 를 냈다).
  const L = normalizeCarrierCode(listOp) || '';
  const E = normalizeCarrierCode(ediOp) || '';
  if (!L) return E;
  if (!E || L === E) return L;
  const fmt = getTallyFormat(vslCode);
  if (fmt && opParent(fmt, E) === L) return E;   // EDI 가 자식 — 뭉치지 않는다
  return L;
}

//  ★ 3.60-04 (진단 T5) — **EDI 가 있는 컨에서 리스트가 덮지 못하는 칸. 한 벌이다(규범 §4-4).**
//    작업창(SearchPanel)과 미르 재료(mir.flattenVoyages)가 같은 표를 쓴다. 종전엔 SearchPanel 에만 있어서
//    미르는 세관 리스트 `pod`(«최종항»)로 EDI POD 를 덮었고 평택분이 화면과 갈렸다(MCSN 622N 양하 화면 443 · 미르 241 실측).
//    예외(검수사가 실물로 고른 값)는 부르는 쪽이 먼저 본다 — `iso_pick`(규격·특수표식) · `pod_pick`(POD).
//    `pol` 은 «양하 직전 마지막 항구» 규칙(pickDischargePol)을 부르는 쪽이 따로 태운다.
export const EDI_PROTECTED_KEYS = new Set(['pol', 'pod', 'npod', 'fpod', 'iso', 'fe', 'rf', 'fr', 'ot', 'tk', 'dg', 'oog', 'vsl', 'voy']);
//  ★ 3.60-13 (수정안 A — 검수사 «네 수정 하세요»): **EDI 칸이 비어 있으면 리스트가 채운다.** 병합 네 곳(VoyagePage·SearchPanel·
//    PrintHubModal·미르 재료)이 이 한 벌을 쓴다. 규칙은 화면 본류(VoyagePage V9.23 CORE_FILL)가 이미 쓰던 그것이다.
//    3.60-04 가 미르를 SearchPanel 규칙(빈 EDI 칸도 보호)에 맞추면서 KBTR 2606E 양하 20대의 리스트 규격(22G1 5 · 45GP 15)이
//    미르·작업창·인쇄에서 비었다(미르 20피트 25→20 · 40피트 80→65 실측).
//    ⚠ 불(boolean) 표식(rf·fr·ot·tk·dg)은 EDI 의 false 도 «값»이다 — 종전대로(true 승격은 각 병합의 FLAG_FILL·_flagUp 이 맡는다).
export const EDI_EMPTY_FILL_KEYS = new Set(['fe', 'iso', 'tp', 'rf', 'fr', 'ot', 'tk', 'dg', 'dgc', 'un', 'pg', 'pod', 'tmp_missing']);
export const ediCoreEmpty = (e, k) => !!e && (!!e._virtualEdi || e[k] === undefined || e[k] === null || e[k] === '');
/** ★ 3.52-01 — **양하 PORT 칸(출발지)은 무엇인가. 한 벌이다(규범 §4-4).**
 *
 *  검수사 확정 2026-09-16 — «마감텔리랑 같게 수정 바랍니다» · «**양하전 마지막 항구**가 SHA 맞으니까요».
 *  즉 양하 PORT 칸은 «양하 직전 마지막 항구» 이고, 그 값을 가진 것은 **EDI POL** 이다.
 *
 *  ⚠ 세관리스트 «적재항» 을 그대로 쓰면 안 된다 — 그것은 **원적재항**(B/L 출발지)이다.
 *    전수 실측(활성 16 + 보관 275 = 291 항차 양하분) — 세관 값을 전면 채택하면 **1,993대**가 틀어진다
 *    (CNSHK→MYPKG 107 · HKHKG→MYPEN 105 · CNTAO→CNSHD 277 · RIZHAO→CNRZH 199 …).
 *    정본 마감텔리 세 건(DXQD 2629E&W · STMJ 2639E · TMPZ 2022E&W)도 EDI 쪽과 일치했다.
 *
 *  고칠 것은 하나뿐이다 — **EDI POL 이 «평택»** 인 양하분. 평택에서 싣고 평택에 내린다는 뜻이라
 *  성립하지 않는다. 나갔다 되돌아온 화물(COD)의 EDI 가 **나갈 때 값을 그대로 들고 온 것**이다
 *  (검수사 «상해로 갔다가 온 화물인가요?»). 이때만 세관 적재항으로 바꾼다.
 *  전수에서 이 문에 걸리는 것은 **정확히 2대**다 — TMPZ 2022E `PHRU8191362` · SWTD 9013E `HLHU8358996`.
 *
 *  ⚠ `pod` 를 함께 보는 이유 — 같은 EDI 파일에 **선적분**(POL 평택 · POD 타항)이 실려 온다.
 *    DJCF 0148S 394대가 그것이다. 그것까지 바꾸면 출발지가 엉뚱해진다.
 *  ⚠ EDI POL 이 비었을 때는 **손대지 않는다**(빈 값 그대로 돌려준다). 그 보강은 부르는 쪽마다
 *    이미 제 규칙(«EDI 가 비면 리스트»)이 있고, 여기서 겹쳐 하면 그 규칙이 두 벌이 된다.
 *
 *  ⛔ **양하 전용이다.** 선적에서 부르지 마라 — 선적 POL 은 평택이 정상이고, 엠티 선적 엑셀의
 *    오염된 리스트 POL 이 EDI 를 덮으면 285대가 통째로 빠진다(M6.94.31 사고).
 */
export function pickDischargePol(ediPol, listPol, pod) {
  const E = String(ediPol || '').trim();
  const L = String(listPol || '').trim();
  if (!L) return E;
  if (!isPyeongtaekPort(E)) return E;   // EDI 가 성립한다(또는 비었다) — EDI 가 정본
  if (!isPyeongtaekPort(pod)) return E; // 평택 양하분이 아니다(같은 EDI 에 실린 선적분) — 손대지 않는다
  if (isPyeongtaekPort(L)) return E;    // 리스트도 평택 — 고칠 것이 없다
  return L;
}

export function getContainerColorKey(c, mode) {
  // 평택분 여부. M6.94.34: _inList(리스트=평택)는 선적 모드에서만 적용.
  //   양하 모드에서 _inList를 인정하면 타항 양하분(예: pod=PHDVO)이 평택으로 잘못 잡힘.
  //   양하 평택분은 반드시 pod가 평택이어야 함.
  const isPtkC = isPtk(c, mode);   // 3.14: 판정 한 벌(EDI 통과화물이면 리스트 등재라도 평택분 아님)
  if (!isPtkC) return null;
  if (mode === 'discharge') {
    // 양하: 선사코드로 컬러 (V7.27: 변환표 경유 3자 통일 — DJSC→DJS, SNKO→SKR)
    return normalizeCarrierCode(c.op);
  } else {
    // 선적: POD 3자로 컬러. 엠티는 pol이 목적지로 오염될 수 있으나
    //   여기선 이미 평택분 확정 → pod에서 직접 3자 추출 (별첨 로직과 동일).
    //  3.7: **자르기 전에 정규화한다.** 리스트에는 «CNNTG» 말고 «NANTONG» · «TAICANG, CHINA» ·
    //    «PTK02» 가 그대로 오고(3.6-02 실측), 그냥 slice(2,5) 하면 NANTONG→«NTO» 처럼
    //    없는 목적지가 생겨 색도 글자도 어긋난다. normPortCode 가 다섯 자로 맞춰 준다.
    const p = normPortCode(c.pod);
    const p3 = p.length >= 5 ? p.slice(2, 5) : p.slice(0, 3);
    return (p3 && p3 !== 'PTK' && !isPyeongtaekPort(p)) ? p3 : null;
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
/** ★ 3.2-01 — **통과분 판정 한 벌** (김성일 메모 2026-09-03 «컨번호 중복적으로 문제» · NSDC 2608N 0320 사고).
 *  통과분 = 항구가 **적혀 있고** 평택이 아닌 컨. 항구 빈칸(리스트 전용 컨 — 감사 실측 PCBJ 2609N 18대)은 통과가 아니다.
 *  리스트 등재분(records[cn])은 평택분이다(V9.29 isPtk 규칙과 같은 벌) · 시프팅(_shift)·초과(_extra)는 작업분.
 *  @param mode 'discharge'(POD) | 'loading'(POL)  @param records 그 모드 리스트 맵(없으면 안 본다)  @param shiftCns 시프팅 컨 Set(없으면 _shift 만) */
export function isTransitContainer(c, mode, records, shiftCns) {
  if (!c || !c.cn) return false;
  if (c._shift || c._extra) return false;
  if (shiftCns && typeof shiftCns.has === 'function' && shiftCns.has(c.cn)) return false;
  if (records && records[c.cn]) return false;
  const port = String((mode === 'loading' ? c.pol : c.pod) || '').trim();
  if (!port) return false;
  return !isPyeongtaekPort(port);
}
/** ★ 3.2-01 — 이 컨을 완료(양하확인·선적확인)해도 되는가. 통과분만 «아니오».
 *  SearchPanel 병합이 붙인 `_transit` 이 있으면 그것을, 없는 객체(베이플랜→상세 등)는 pod/pol 로 직접 본다 —
 *  문지기가 한 길(SearchPanel)만 막고 옆길(베이플랜 상세·트윈 뒤 컨·짝꿍 지정)이 열려 있던 것(감사 P1-2). */
export function canCompleteContainer(c, mode, records, shiftCns) {
  if (!c) return false;
  if (c._shift || c._extra) return true;
  if (c._transit === true) return false;
  if (c._transit === false) return true;
  return !isTransitContainer(c, mode || c._mode, records, shiftCns);
}
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
//  ★ 3.14 — **EDI 가 «남의 항구에서 실려 남의 항구로 간다»고 말하면 리스트 등재보다 EDI 가 이긴다.**
//    검수사 확정 2026-09-06 05:5x — *«EDI가 조금전에 들어 온것이니 그게 맞을거라는 저의 판단입니다»* ·
//    *«26개의 컨테이너가 정말 선적분인지와 20여개의 선적위치가 이상한곳에 있습니다»*.
//    실측 DJCF 0150N 선적(0151S) — 앱 리스트 388대인데 배정목록·EDI·합본은 362대. 초과 26대 중 24대가
//    선사 CLL(배 전체 목록 `JDCF0151S_CLL.xlsx`)에서 온 **통과화물**이었다(인천·방콕·사이공에서 실려 부산 가는 짐).
//    리스트에 있다는 이유로 평택 선적분이 되어, EDI 가 준 «남의 짐 자리»(베이 5·7·10·17·19·25·27 — 평택 작업이
//    없는 곳)에 21대가 그려졌다. 합본은 이미 «[제외분(EDI밖)] 24건» 으로 뺐는데 등록(autoreg)만 안 뺐다.
//  ⚠ 근거 셋이 **모두** 맞을 때만 뺀다(리스트를 함부로 버리지 않는다 — M6.94.29 엠티 285대 사건의 교훈):
//    ①POL 이 유효 항구코드인데 평택이 아니다 ②POD 도 평택이 아니다(환적·평택행이 아니다)
//    ③**EDI 출신이 확실하다**(파서 표식 `_mode`/`_slotKey`). 엠티 선적 리스트는 항구 칸이 목적지로
//      오염되지만(CNDLC 등) EDI 에 없어 표식이 없다 → 그 컨은 종전대로 `_inList` 로 산다.
export function isPtk(c, mode) {
  if (!c) return false;
  if (mode === 'discharge') return isPyeongtaekPort(c.pod);
  if (isPyeongtaekPort(c.pol)) return true;
  if (isTransitByEdi(c)) return false;
  return !!c._inList;
}

//  3.14: 그 컨이 **EDI 기준 통과화물**인가(선적 판정 보조). 화면·별첨·리스트·인쇄가 이 한 벌만 쓴다.
//    ①**파서가 이미 적어 둔 답이 먼저다** — 등록·재처리가 `_mode:'transit'` 을 넣는다(실측 활성 18항차 3,598대 전부 보유).
//      추론보다 자료다. `fullEdiMapOf` 가 raw 전문을 우선해도 저장본 값을 얹으므로 `_mode` 는 살아남는다.
//    ②`_mode` 가 없는 옛 자료만 항구로 판정한다 — POL 이 유효 항구코드인데 평택 아님 · POD 도 평택 아님 ·
//      **EDI 출신 표식**(`_slotKey`)이 있음. ⚠ 자리(`bay`)를 표식으로 쓰지 않는다 — 검수원이 「위치 지정」으로
//      고친 리스트 전용 컨도 `records.bay` 를 가질 수 있어(지금 라이브 0건이나 길이 열려 있다) 근거가 못 된다(감사).
export function isTransitByEdi(c) {
  if (!c) return false;
  //  ★ 3.53 — **수석·검수사가 POD 를 확정했으면 통과분이 아니다.** 재감사 지적 2026-09-16 —
  //    `fbPickPod` 는 `_mode` 를 손대지 않아(등록 때 붙는 값이라 건드리면 안 된다) 확정 뒤에도
    // 여기가 true 를 내, **모드 없이 부르는** `isPtk(c)` 갈래가 false 가 됐다.
  //    그래서 확정한 컨이 베이플랜에서 «우리 화물» 색을 못 받았다(BayPlan 155·518·1688행).
  //    문서 대수는 어긋나지 않았지만 화면만 딴말을 하는 것도 판정 두 벌이다(규범 §4-4).
  if (c.pod_pick) return false;
  if (c._mode === 'transit') return true;
  if (c._mode === 'loading' || c._mode === 'discharge') return false;
  if (!c._slotKey) return false;
  const pol = String(c.pol || '').toUpperCase().trim();
  const pod = String(c.pod || '').toUpperCase().trim();
  if (!pol || !pod) return false;
  if (!isPortCode(pol) || !isPortCode(pod)) return false;
  return !isPyeongtaekPort(pol) && !isPyeongtaekPort(pod);
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

/** 규격 → 피트(20·40·45). ★ 4.88 — 규격 길이 한 벌(tallyReport.sizeLenOf)을 부른다. 종전 이 함수만 첫 글자로 따로 갈라
 *  «DC20»(선사 약식 — ediContainers 144건)을 40, «L2G1» 을 45 로 읽었다(다른 화면은 20·40). 규격이 비었으면 종전대로 40(가장 흔한 FR). */
export function isoFeet(iso) {
  //  4.88 감사 «가»: 못 읽는 규격(XXXX·RH40 등)·빈 규격은 «모름»(sizeLenKnown '') — 종전 기본값 40(가장 흔한 FR)을 지킨다. 20 으로 떨어뜨리지 않는다.
  return Number(sizeLenKnown({ iso })) || 40;   // 4.88
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
      calc.push(`높이 $»${deck ? ` + 데크 ${deck}` : ''} = ${top} > ${BOX_H_MM}`);
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

// ★★★ 2.81 (검수사 확정 2026-08-29, MCSC 633N) — **배정표가 있으면 배정표가 정본이다.**
//
//   검수사 원문 — *«시프팅 190번 즉 95개의 시프팅이 있다고 합니다. 앱은 166번 즉 83개 입니다»* ·
//   *«카고플랜 양하와 선적을 비교 해보니 95개가 맞는듯 합니다 앱이 판정미스한게 보입니다»*
//
//   **무엇이 틀렸나.** 원시 대조(자리가 실제로 바뀐 통과화물)는 **정확히 95대**였다 — 배정표 190번÷2 와
//   한 대도 안 틀린다. 그 뒤에 붙은 필터 둘이 29대를 깎아 66대로 만들었다.
//     ① 동형 공컨 순열 제외 −13대 ② 방해 판정 −16대
//
//   ① 은 **판정 자체가 틀렸다.** 조건이 «from 이 그룹의 to 집합에 있고 to 가 그룹의 from 집합에 있다»
//      인데, 45GE 공컨 그룹이 87대로 커지자 자리 집합이 넓어져 **순열이 아닌 것이 우연히 걸렸다.**
//      실측 — 그 87대는 56곳을 비우고 56곳을 새로 채운다(베이 14·18·26 → 22·34·38 대량 재배치).
//      빠진 13대만 봐도 출발전용 8곳·도착전용 8곳이라 **닫힌 순열이 아니다.**
//      (XTPG 532 때는 맞교환 7쌍+3자 순환 2조로 진짜 순열이었고 그룹이 작아 우연 일치가 없었다.)
//   ② 는 **예측에는 맞고 확정 대조에는 과하다.** 실측 — 베이 26 홀드 02단(맨 아래) 4대가
//      데크 84단으로 올라갔는데, «아래에 평택 양하가 있어야» 조건이라 맨 아래 컨은 영영 안 걸린다.
//      베이 18 데크 90단 12대도 «그 베이에 평택 작업 없음»으로 빠졌으나 **간 곳은 22·34·38**
//      — 전부 평택 작업 베이다. 크레인이 실제로 들었고 터미널이 셌다.
//
//   ★ 검수사가 짚어 준 까닭 — *«시프팅 갯수가 늘어난것 선적자리 확보와도 관계가 있을것입니다»*
//     빠진 29대를 모아 보면 그 말대로다. 베이 18 데크 90단 12대는 **베이 18 을 통째로 비운 것**이고
//     베이 26 홀드 02단 4대는 **홀드 바닥을 비워 데크로 올린 것**이다. 둘 다 «내릴 것 위에 얹혀서»가
//     아니라 **«실을 자리를 만들려고»** 옮긴 것이다.
//     ⇒ 종전 방해 판정은 「양하에 걸리는가」를 주로 보고 **자리를 비우는 이동**을 못 본다.
//       그 베이에 평택 선적분이 EDI 상 안 잡혀 있으면(베이 18 평택 선적 0) 판정이 통째로 헛돈다.
//       판정을 더 정교하게 만들려 하지 말고, **터미널이 센 수(배정표)를 그대로 쓴다** — 그게 사실이다.
//
//   **그래서 규칙.** 배정표 이적(`info.berthShift`)이 **0보다 크고** 원시 대조 대수와 맞으면
//   필터를 **건너뛴다**. 배정표는 터미널이 확정한 실작업 수이고, 원시 대조가 그와 같다는 것은
//   «자리가 바뀌었다 = 크레인이 들었다»가 그대로 맞았다는 뜻이다. 앱이 이유를 더 추측할 이유가 없다.
//   배정표가 0이거나 없거나 대수가 어긋나면 **종전 필터를 그대로 건다**(SWBT 2614S·XTPG 537E 보호).
//
//   전수 대조 (배정표 있는 항차 6건, 2026-08-29):
//     KSKM 2615N 배정0 → 0 ✔ · MAMP 631N 배정2 → 1 ✔ · XTPG 536E 배정16 → 8 ✔
//     XTPG 537E 배정0 → 0 ✔ · SWBT 2614S 배정0 → 0 ✔ · **MCSC 633N 배정190 → 95 ✔**
//   종전 코드는 MCSC 만 66 으로 틀렸고, 필터를 통째로 걷으면 SWBT·XTPG537E 가 깨진다.
//   이 규칙만이 6/6 을 맞힌다.
export function computeShiftingMap(dischEdiMap, loadEdiMap, opts) {
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
  const posOf = _shiftEdiPos7;   // 4.13: 시프팅 근거 표시(shiftEvidenceCore)가 같은 자리 꼴을 쓰도록 공용 함수로 뺐다(동작 동일)
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
  // ★ 2.81: 배정표가 정본인 경우 — 여기서 끝낸다(위 머리말 참조).
  //   원시 대조 대수 × 2 == 배정표 이적(모브)이면 터미널 확정과 일치한 것이다.
  //   필터는 «자리가 바뀌었는데 크레인이 안 들었을 것»을 걸러내는 장치인데,
  //   터미널이 그만큼 들었다고 세었으면 걸러낼 것이 없다.
  {
    const bs = Number(opts && opts.berthShift);
    if (Number.isFinite(bs) && bs > 0 && Object.keys(out).length * 2 === bs) {
      for (const v of Object.values(out)) { delete v._iso; delete v._fe; }
      try {
        Object.defineProperty(out, '_meta', {
          value: { source: 'berthShift', berthShift: bs }, enumerable: false });
      } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
      return out;
    }
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

//  4.13 — EDI 한 칸의 자리를 7자리(베이3·열2·단2)로. computeShiftingMap 과 시프팅 근거 표시가 한 벌을 쓴다(§4-4).
function _shiftEdiPos7(c) {
  if (!c) return '';
  const b = normalizeBay(c.bay || '');
  const r = String(c.row || '').padStart(2, '0');
  const t = String(c.tier || '').padStart(2, '0');
  if (!b || !c.row || !c.tier) return '';
  return `${String(b).padStart(3, '0')}${r}${t}`;
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
export const _isDeckTier = (tier) => {   // 3.4: export — «tier<80 = 홀드» 판정이 화면마다 인라인으로 흩어져 있어 새 규칙은 이 한 벌을 쓴다
  const t = parseInt(tier, 10);
  return Number.isFinite(t) && t >= 80;   // 80번대 이상 = 데크(지침 Ⅱ 데크/홀드 분리)
};
/** 3.4 — 자리(tier)가 홀드인가. 데크 판정의 뒷면 한 벌(빈 값은 «모름»이라 false). */
export function isHoldTier(tier) {
  const t = parseInt(tier, 10);
  return Number.isFinite(t) && t < 80;
}

/** ★ 2.88-01 — 해치커버 **패널 판정 한 벌** (검수사 지시 2026-08-30)
 *
 *  검수사 확정 개념 — *«커버의 개념은 단 한개라도 해당 데크위에 화물이 있으면 열지 못한다.
 *  단 해치커버별 로우범위를 인지해야 하고 그 범위 밖에 화물이 있다면 열고 닫을수 있다»*
 *
 *  ── 왜 꺼냈나
 *  이 판정(_panelOf 계열)은 `predictShifting` **안에 갇혀 있었다.** 시프팅 계산은 커버를 정확히
 *  아는데, 정작 커버를 열고 닫는 화면들은 부를 수가 없어 **무조건 hatchCount 장**으로 답했다.
 *  실측 MCSC 633N — 앱은 38·34번 둘 다 «3장», 실제는 38번 1장(통과화물이 좌우 2장 위에)·34번 2장.
 *  검수사 — *«그걸 오늘 다 무시했습니다»*
 *
 *  ⚠ 코드는 **한 글자도 바꾸지 않고** 옮겼다. 시프팅 판정이 흔들리면 오늘 확정한 95대가 흔들린다
 *    (smoke_shiftberth.cjs 가 배정표 6항차로 지킨다).
 *
 *  @param rows     [[cn, 컨], ...] — **통과화물 포함 전체**여야 한다. 평택분만 주면 커버가 비어 보인다.
 *  @param baysInfo 베이사전 baysSummary 를 베이번호로 키한 것 (hatchCount·hatchRows·rowCount)
 *  @returns {{ panelOf, panelsOf, groupAxis, groupOf, coverGroupOf, info }}   // coverGroupOf: 4.07-03 커버 묶음(hatchOpenable 만 쓴다)
 */
/** ★ 4.62-06 — 함께 열리는 커버. 선박코드 → { 홀드 작업 베이: [같이 열리는 다른 베이] }.
 *  XTPG(XIN TAI PING): 검수사 2026-11-01 20:04 «이선박은 18번 베이 홀드 작업시 22번 커버와 18번 커버가 같이 열려야 합니다» (547E 배정표 이적 16모브=8대 — 22번 데크 8대와 일치). */
export const COVER_LINKS = { XTPG: { 18: [22] } };

export function makePanelResolver(rows, baysInfo) {
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
  /*  4.07-03 — **커버(해치) 묶음.** 홀드 중심이 4 의 배수(4·8·…·24·28)인 배는 _groupOf 가 홀수 베이를 «혼자»로 돌려준다.
      실측 STSE 2677E (검수사 2026-10-06 22:33 «24번베이가 왜 총 6장인지») — 23·24·25 가 서로 다른 홀드 셋으로 취급되어
      자동가이드가 «23 (24)25 총 6장» 을 냈다(사전 한 홀드 2장 · 정답 2장). 사전 63척 중 13척의 베이 묶음이 바뀐다(BERO 포함).
      ⇒ _groupOf 가 혼자로 남긴 홀수 베이는 **반대쪽 짝수 이웃**이 해치가 있는 베이로 사전에 있으면 그쪽으로 묶는다.
      _groupOf 자체는 건드리지 않는다 — 시프팅 예측(95대 정본)이 쓰는 축 계산이 흔들리지 않게 커버 판정(hatchOpenable)만 쓴다. */
  const _coverGroupOf = (bn) => {
    const g = _groupOf(bn);
    if (g !== bn || !Number.isFinite(bn) || bn % 2 === 0) return g;
    const e = ((bn + 1) % 4 === 2) ? bn - 1 : bn + 1;     // _groupOf 가 보지 않은 쪽 짝수 이웃
    return (_info[e] && parseInt(_info[e].hatchCount, 10) > 0) ? e : bn;
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
  /* 2.99 (검수사 확정 2026-09-02) — «3.5 3.5» 처럼 경계가 00열 한가운데를 지나는 배는 **00열이 두 장에 다 걸린다.**
       검수사 원문: *«개념은 중앙홀드에 양하분이 있다면 두장 다 열어야 합니다»*. hatchRows 에 0 이 두 패널에 들어 있으면
       그 열은 두 패널 모두다. 중복이 없으면 panelOf 와 같은 답(한 원소)이라 종전 판정과 동일. */
  const _panelsOf = (bay, row) => {
    const bn = parseInt(bay, 10);
    const inf = _info[bn];
    const hr = inf && Array.isArray(inf.hatchRows) ? inf.hatchRows : null;
    if (hr) {
      const r0 = parseInt(row, 10);
      if (!Number.isFinite(r0)) return [];
      const out = [];
      for (let p = 0; p < hr.length; p++) if ((hr[p] || []).map(Number).includes(r0)) out.push(p);
      return out;
    }
    const p = _panelOf(bay, row);
    return p == null ? [] : [p];
  };
  return { panelOf: _panelOf, panelsOf: _panelsOf, groupAxis: _groupAxis, groupOf: _groupOf, coverGroupOf: _coverGroupOf, info: _info };
}

/** ★ 2.88-01 — **지금 몇 장을 열 수 있는가.**
 *
 *  검수사 확정 — *«커버의 개념은 단 한개라도 해당 데크위에 화물이 있으면 열지 못한다.
 *  단 해치커버별 로우범위를 인지해야 하고 그 범위 밖에 화물이 있다면 열고 닫을수 있다»*
 *
 *  ⚠ **모집단은 통과화물을 포함한 전체다.** 종전 커버 판정(mirEyes:284)은 평택분만 세서
 *    통과화물이 4단씩 얹혀 있어도 «데크는 비었습니다» 라고 답했다 — 38번이 그 경우였다.
 *  ⚠ 이미 내린 컨은 없는 것으로 친다(isGone).
 *
 *  실측 대조 (MCSC 633N)
 *    38번 — 데크 12칸이 04·02·01·03(평택·내림 끝) + 나머지 8칸(통과·그대로).
 *           3장 중 **가운데 1장**만 열린다. 검수사가 실제로 1장을 열었다.
 *    34번 — 좌 4칸 전부 내림, 가운데 3칸 남음, 우 09단90 하나 남음 → **2장**.
 *
 *  @param conts   그 항차 컨 전부(통과분 포함) — [{bay,row,tier,cn}, ...]
 *  @param baysInfo 베이사전 baysSummary 를 베이번호로 키한 것
 *  @param bayNo   베이 번호
 *  @param isGone  (c) => 이미 내렸는가. 없으면 전부 남은 것으로 본다.
 *  @param isWork  (c) => 평택 작업분인가(양하=POD 평택 · 선적=POL 평택). 3.2-01 — 없으면 needed = openable.
 *  @returns {{ total, openable, needed, panels: [{idx, blocked, blockers:[cn], holdWork:[cn]}] }}
 *
 *  ★ 3.2-01 (김성일 메모 2026-09-03 «커버 문제 1장이면 되는데 2장오픈» — NSDC 2608N 실측)
 *    openable 은 «열 수 있는 장 수»다. 보고에 쓸 것은 «열어야 할 장 수»(needed) — **평택 홀드분이 아래에 있는 장**만이다.
 *    실측 10번: hatchRows 두 장, 평택 홀드 12대가 전부 00·01·03열(둘째 장)에만 있는데 데크가 비어 두 장 다 열 수 있으니
 *    2장이라 보고했다. 22번도 같다(26대 전부 02·04·06·08열 = 첫째 장). 검수사는 각각 1장을 열었다.
 *    needed = 평택 홀드분이 아래에 있는 장 수(내렸든 안 내렸든·위가 막혔든 아니든 — 닫기 보고 때도, 통과분을 치우고
 *    열어야 하는 장도 같은 수여야 한다). 막힘(blocked)은 «지금 열 수 있는가»의 답이지 «몇 장 여는가»의 답이 아니다.
 *    선적 닫기 실측(2609S 09-03 04:56 «09 (10)11 총 2장»): 홀드 선적분 24대가 전부 둘째 장 아래인데 데크가 다 실려
 *    «내린 것»(gone)으로 잡혀 두 장 다 열 수 있다고 봤다 — 정답 1장. 평택 홀드분이 한 대도 없으면 종전대로 openable.
 */
export function hatchOpenable(conts, baysInfo, bayNo, isGone, isWork) {
  const bn = parseInt(bayNo, 10);
  const inf = (baysInfo || {})[bn] || {};
  let total = Math.max(1, parseInt(inf.hatchCount, 10) || 1);
  const rows = (conts || [])
    .filter((c) => c && (c.cn || c.bay != null))
    .map((c) => [String(c.cn || ''), c]);
  const R = makePanelResolver(rows, baysInfo);
  const _g = R.coverGroupOf(bn);   // 4.07-03: 홀드 중심이 4의 배수인 배(STSE 등)의 홀수 베이도 트리오로 묶는다
  /*  4.07-03(독립 감사 DJCT): 홀수 베이의 해치 수가 0·짝수 중심이 2 인 사전에서 홀수만 물으면 total 이 1 이라 둘째 장이 버려졌다.
      **새 묶음으로 옮겨 간 베이에 한해** 중심 베이의 장수까지 본다(종전 묶음 — KKLC 등 — 은 그대로). */
  if (_g !== bn && _g !== R.groupOf(bn)) total = Math.max(total, parseInt(((baysInfo || {})[_g] || {}).hatchCount, 10) || 1);
  const blockers = Array.from({ length: total }, () => []);
  const holdWork = Array.from({ length: total }, () => []);   // 3.2-01: 장별 평택 홀드분
  const gone = typeof isGone === 'function' ? isGone : () => false;
  const work = typeof isWork === 'function' ? isWork : null;
  /*  ⚠ 커버 위 데크는 **홀드 묶음 전체**다 — 베이 하나만 보면 안 된다.
      실측 MCSC 633N 38번: 데크 12칸 중 40ft 4칸(01·02·03·04)만 38번에 들어 있고,
      양옆 8칸은 20ft 라 **37번·39번**으로 실려 있다. 화면이 «BAY (38)39» 로 묶어 그리는 그것이다.
      베이 번호만 맞추면 좌우 통과화물 64대를 영영 못 보고 «3장 다 열림» 이라고 답한다(실측). */
  const _members = (_g % 2 === 0) ? [_g - 1, _g, _g + 1] : [_g];
  for (const [, c] of rows) {
    const cb = normalizeBay(c.bay || '');
    if (!_members.includes(parseInt(cb, 10))) continue;
    if (!_isDeckTier(c.tier)) {
      //  3.2-01: 홀드의 평택분 — 그 열이 든 장은 «열어야 할 장»이다(내렸어도 센다 — 닫기 보고의 장수).
      if (work && work(c)) {
        const hp = R.panelsOf(String(_g).padStart(2, '0'), c.row);
        //  어느 장인지 모르는 열은 데크와 같은 벌로 **보수적으로 전부**(감사 P2-4 — 조용히 빠지면 needed 가 준다)
        const ps = hp.length ? hp : holdWork.map((_, i) => i);
        for (const p of ps) if (holdWork[p]) holdWork[p].push(String(c.cn || ''));
      }
      continue;
    }
    if (gone(c)) continue;                       // 이미 내린 것은 커버를 막지 않는다
    /*  ⚠ 패널 정보(hatchCount·hatchRows)는 사전에 **짝수 베이만** 있다(실측 MCSC: 022·030·034·038).
        37·39 번으로 실린 20ft 데크를 그 번호로 물으면 «사전에 없음» → null → 전부 막힘이 되어
        38번이 «0장» 으로 나왔다(실측). 열 판정에 쓰는 것은 row 이므로 **그룹 대표로 묻는다.** */
    const ps = R.panelsOf(String(_g).padStart(2, '0'), c.row);   // 2.99: 00열 두 장 걸침이면 둘 다
    if (!ps.length) {                            // 어느 장인지 모르면 **보수적으로 전부 막는다**
      for (let i = 0; i < total; i++) blockers[i].push(String(c.cn || ''));
      continue;
    }
    for (const p of ps) if (blockers[p]) blockers[p].push(String(c.cn || ''));
  }
  //  ★ 4.62-06 — 함께 열리는 커버(COVER_LINKS): 연결된 베이 데크에 남은 화물은 이 베이의 모든 장을 막는다.
  for (const l of (Array.isArray(inf.coverWith) ? inf.coverWith : [])) {
    const lg = R.coverGroupOf(parseInt(l, 10));
    const lm = (lg % 2 === 0) ? [lg - 1, lg, lg + 1] : [lg];
    for (const [, c] of rows) {
      if (!lm.includes(parseInt(normalizeBay(c.bay || ''), 10)) || !_isDeckTier(c.tier) || gone(c)) continue;
      for (let i = 0; i < total; i++) blockers[i].push(String(c.cn || ''));
    }
  }
  const panels = blockers.map((b, i) => ({ idx: i, blocked: b.length > 0, blockers: b, holdWork: holdWork[i] }));
  const openable = panels.filter((x) => !x.blocked).length;
  //  3.2-01: 열어야 할 장 = 평택 홀드분이 아래에 있는 장(막혔든 아니든 — 막힘은 «지금 열 수 있나»의 답). 홀드 평택분이 없으면 종전(openable).
  const anyHold = panels.some((x) => x.holdWork.length > 0);
  const needed = anyHold ? panels.filter((x) => x.holdWork.length > 0).length : openable;
  //  2.98-12: 정규화한 그룹을 같이 알린다 — 트리오(21·22·23)를 베이별로 물어도 같은 g 가 나오므로
  //    부르는 쪽이 «같은 물리 커버를 몇 번 셌는지» 를 이 값으로 가려낼 수 있다(6장 중복 수리의 근거).
  return { total, openable, needed, panels, group: _g };
}

/** ★ 2.88-01 — 화면용 한 줄 진입점. 항차·모드·베이만 주면 «몇 장 열 수 있는가» 를 낸다.
 *  ⚠ 컨 목록은 **fullEdiMapOf**(raw EDI)로 얻는다 — `ediContainers` 는 평택분만이라
 *    통과화물이 4단씩 얹혀 있어도 커버가 비어 보인다(실측 MCSC 38번: 279대 중 16대만 보였다).
 *  ⚠ 완료(내림)는 `completed` 노드로 본다 — 이미 내린 것은 커버를 막지 않는다.
 *  못 구하면 null (사전 없음·자료 없음) — 부르는 쪽은 종전 동작으로 돌아간다.
 */
export function hatchOpenableFor(voyage, mode, bayNo, dictEntry) {
  try {
    const vsl = String(voyage?.info?.vsl || '').toUpperCase();
    const de = dictEntry || ((typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[vsl] : null);
    const bs = de?.bayDef?.baysSummary || de?.baysSummary;
    if (!Array.isArray(bs) || !bs.length) return null;
    const info = {};
    for (const e of bs) {
      const bn = parseInt(e?.bayNo ?? e?.bay, 10);
      if (Number.isFinite(bn)) info[bn] = e;
    }
    for (const [a, list] of Object.entries(COVER_LINKS[vsl] || {})) if (info[a]) info[a] = { ...info[a], coverWith: list };   // 4.62-06
    const sec = voyage?.[mode] || {};
    const conts = Object.values(applySwapFix(fullEdiMapOf(sec) || {}, swapFixList(voyage)) || {});   // 2.89: 맞교환 겹침
    if (!conts.length) return null;
    const comp = sec.completed || {};
    //  3.2-01: 평택 작업분 판정 — 양하=POD 평택 · 선적=POL 평택 (SearchPanel _ptk 와 같은 규칙).
    const isWork = (c) => (mode === 'loading' ? isPyeongtaekPort(c.pol) : isPyeongtaekPort(c.pod));
    return hatchOpenable(conts, info, bayNo, (c) => !!comp[c.cn], isWork);
  } catch (e) { return null; }
}

/** 2.99 (검수사 확정 2026-09-02) — 베이매트릭스 해치 줄의 «커버 폭» 입력을 경계(hatchRows)로 바꾸는 한 벌.
 *  형식: «3 4 3» «4 5» «3.5 3.5» (구분: 공백·쉼표·/ ). 축 = 그 베이 전체 열(짝수 내림 → 00(있으면) → 홀수 오름).
 *  · 폭 합이 축보다 짝수만큼 작으면(홀드 폭으로 적은 것) 바깥 장이 남은 열을 흡수 — «3 4 3»(홀드10) → 축12 «4 4 4».
 *  · «x.5 x.5» 는 00열 있는 축에서 «같은 값 두 장»만 — 00열이 두 장에 다 들어간다(두 장 다 걸림).
 *  · 폭 합이 축보다 크거나 차가 홀수면 오류(err) — 조용히 맞추지 않는다. */
export function hatchSpansToRows(spansStr, rowCount, hasZero) {
  const rc = parseInt(rowCount, 10);
  if (!Number.isFinite(rc) || rc < 1) return { err: '축(rowCount)을 모릅니다' };
  const w = String(spansStr || '').trim().split(/[\s,/·]+/).filter(Boolean).map(Number);
  if (!w.length || w.some((x) => !(x > 0))) return { err: '폭은 양수 숫자로 «3 4 3» 처럼' };
  const axis = hasZero
    ? [...Array(Math.floor(rc / 2))].map((_, i) => 2 * (Math.floor(rc / 2) - i)).concat([0], [...Array(rc - Math.floor(rc / 2) - 1)].map((_, i) => 2 * i + 1))
    : [...Array(Math.floor(rc / 2))].map((_, i) => 2 * (Math.floor(rc / 2) - i)).concat([...Array(rc - Math.floor(rc / 2))].map((_, i) => 2 * i + 1));
  if (w.some((x) => x % 1 !== 0)) {
    if (!(w.length === 2 && w[0] === w[1] && hasZero && w[0] * 2 === rc)) return { err: 'x.5 는 00열 있는 축에서 «같은 값 두 장»만(예: 축7 → 3.5 3.5)' };
    const k = Math.floor(w[0]);
    return { rows: [[...axis.slice(0, k), 0], [0, ...axis.slice(k + 1)]], shared0: true, extended: false };
  }
  const sum = w.reduce((a, b) => a + b, 0);
  const pad = rc - sum;
  if (pad < 0) return { err: `폭 합 ${sum} 이 축 ${rc} 보다 큽니다` };
  if (pad % 2) return { err: `폭 합 ${sum} 과 축 ${rc} 의 차가 홀수(${pad}) — 어느 쪽 장이 넓은지 적어 주세요` };
  const w2 = w.slice(); w2[0] += pad / 2; w2[w2.length - 1] += pad / 2;
  const rows = []; let i = 0;
  for (const k of w2) { rows.push(axis.slice(i, i + k)); i += k; }
  return { rows, shared0: false, extended: pad > 0 };
}
/** 2.99 — 경계(hatchRows) → 화면에 보일 폭 문자열. 00열이 두 장에 있으면 «x.5 x.5». */
export function hatchRowsToSpans(hatchRows) {
  if (!Array.isArray(hatchRows) || !hatchRows.length) return '';
  const zeros = hatchRows.filter((p) => (p || []).map(Number).includes(0)).length;
  if (zeros >= 2 && hatchRows.length === 2) return `${hatchRows[0].length - 0.5} ${hatchRows[1].length - 0.5}`;
  return hatchRows.map((p) => (p || []).length).join(' ');
}

/** 2.98-14 (검수사 «판단은 눈으로 하는데 … 커버 크기가 4.5 4.5 로우를 갖는걸로 보임») —
 *  커버 막대를 그릴 때 장별 «열 개수»를 낸다. 실측 경계(hatchRows)가 있으면 각 장이 무는 열 수
 *  ([[10,8,6,4,2],[0,1,3,5,7,9]] → [5,6])를 주고, 없으면 null — 부르는 쪽은 종전 등분으로 그린다.
 *  판정(_panelOf)과 같은 원천을 그림이 그대로 쓰게 하는 것이 목적이다 — 판정 따로 그림 따로면
 *  검수사가 그림을 보고 «홀드 양하 = 2장 다 개방»으로 오판해 대량 시프팅을 계획하게 된다.
 *  holdCols(그 그림의 홀드 열 라벨, 물리 순서)를 주면 교집합으로 세고, 없으면 패널 정의 열수 그대로. */
export function hatchSegCols(hatchRows, holdCols) {
  if (!Array.isArray(hatchRows) || !hatchRows.length) return null;
  const panels = hatchRows.map((p) => (Array.isArray(p) ? p.map(Number) : []));
  const cols = (holdCols || []).map((r) => parseInt(r, 10)).filter(Number.isFinite);
  let counts;
  if (cols.length) {
    counts = panels.map((p) => { const s = new Set(p); return cols.filter((c) => s.has(c)).length; });
    if (!counts.some((n) => n > 0)) counts = panels.map((p) => p.length);   // 축 불일치 — 정의 열수로
  } else counts = panels.map((p) => p.length);
  //  빈 장(0열)이 생기면 그 장이 화면에서 사라져 그림이 더 큰 거짓이 된다 — 그때는 등분 유지.
  return counts.every((n) => n > 0) ? counts : null;
}

/** 2.98-12 — 해치 보고의 베이 표기 한 벌. 도메인 불변 «(작은 짝수)(큰 홀수)» (지침서 §5-1B,
 *  검수사 원문 «모든 선적의 베이 표기는 17 (18)19 이런식입니다. 단독베이만 따로 표기»).
 *  [21,22,23] → «21 (22)23» · [18,19] → «(18)19» · [17,18] → «17 (18)» · 짝 없는 베이는 그대로. */
export function formatHatchBays(bays) {
  const ns = [...new Set((bays || []).map((b) => parseInt(b, 10)).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!ns.length) return '';
  const set = new Set(ns); const used = new Set(); const parts = [];
  const p2 = (n) => String(n).padStart(2, '0');
  for (const n of ns) {
    if (used.has(n)) continue;
    if (n % 2 === 1 && set.has(n + 1)) continue;          // 홀수는 뒤 짝수가 거둔다
    if (n % 2 === 0) {
      //  감사 지적(2.98-12): 짝-홀-짝 연속(예 2,3,4)에서 앞 짝수가 이미 거둔 홀수를 다시 세지 않는다.
      const lo = set.has(n - 1) && !used.has(n - 1), hi = set.has(n + 1);
      used.add(n);
      if (lo) used.add(n - 1);
      if (hi) used.add(n + 1);
      if (lo && hi) { parts.push(`${p2(n - 1)} (${p2(n)})${p2(n + 1)}`); continue; }
      if (hi) { parts.push(`(${p2(n)})${p2(n + 1)}`); continue; }
      if (lo) { parts.push(`${p2(n - 1)} (${p2(n)})`); continue; }
      parts.push(p2(n)); continue;
    }
    used.add(n); parts.push(p2(n));
  }
  return parts.join(', ');
}

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
  /*  ★ 2.88-01: 패널 판정은 makePanelResolver 한 벌이다(위로 승격 — 커버 화면들도 같은 답을 쓴다).
      아래 로직은 종전과 **한 글자도 다르지 않다**. */
  const _RES = makePanelResolver(rows, baysInfo);
  const _panelOf = _RES.panelOf;
  const _panelsOf = _RES.panelsOf;   // 2.99
  const _info = _RES.info;
  // ① 홀드에 평택 양하분이 있는 베이 → 열어야 할 커버 (패널 정보 있으면 패널, 없으면 현측)
  const openSides = {};
  const openPanels = {};
  for (const [, c] of rows) {
    if (_isDeckTier(c.tier)) continue;
    if (!isPyeongtaekPort(c.pod)) continue;
    const b = normalizeBay(c.bay || '');
    if (!b) continue;
    const ps = _panelsOf(b, c.row);   // 2.99: 00열 두 장 걸침(«3.5 3.5»)이면 두 장 다 연다
    if (ps.length) { openPanels[b] = openPanels[b] || new Set(); for (const p of ps) openPanels[b].add(p); continue; }
    const sd = _sideOf(c.row);
    if (!sd) continue;
    (openSides[b] = openSides[b] || new Set()).add(sd);
  }
  //  ★ 4.62-06 — 함께 열리는 커버(COVER_LINKS): 그 베이 홀드를 열면 연결된 베이의 커버도 전부 열린다 → 그 데크 통과화물도 시프팅 대상.
  for (const b of Object.keys(openPanels)) {
    const lk = _info[parseInt(b, 10)] && _info[parseInt(b, 10)].coverWith;
    if (!Array.isArray(lk)) continue;
    for (const l of lk) {
      const key = String(l).padStart(2, '0');
      const n = Math.max(1, parseInt((_info[parseInt(l, 10)] || {}).hatchCount, 10) || 1);
      openPanels[key] = openPanels[key] || new Set();
      for (let q = 0; q < n; q++) openPanels[key].add(q);
    }
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
        const ps = _panelsOf(cb, c.row);   // 2.99: 두 장 걸침이면 어느 한 장이라도 열리면 걸린다
        if (!ps.length || ps.some((p) => openPanels[cb].has(p))) { hit = true; break; }   // 패널 미상은 보수적으로 포함
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
    const _is20 = sizeLenOf({ iso: String(c.iso || '').trim() }) === '20' && !!String(c.iso || '').trim();   // 4.88: 규격 길이 한 벌(자리 — 규격만). 종전 첫 글자 2 만 봐 «DC20» 을 40 칸 둘로 셌다
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
/** TallyOne 2.79 — **양하 원천 삼자 대조(선사·세관·배정).**
 *  검수사 확정 2026-08-28: *«이미 세관자료를 업로드 했습니다. 그래서 세군데가 일치 한다고 한것입니다.
 *  선사 세관 항만(배정) 그러므르 시프팅은 없습니다.»*
 *
 *  세 자료가 같은 수를 말하면 «평택에서 내릴 짐»이 그 수로 확정된 것이다. 그 위에 얹힌 남의 짐을
 *  앱이 «시프팅 확정»이라 말하면 안 된다 — 실측 MCSC 633N: 선사 279 · 세관 279 · 배정 279 인데
 *  앱은 물리 계산으로 75 대를 시프팅이라 했다.
 *  ⚠ 물리 계산을 지우는 것이 아니다. **등급을 내린다**(확정 → 의문). 검수사 확정(2026-08-28)
 *    *«확정표가 아니고 의문표시와 세관리스트 보고 확정하면 됩니다»* 와 같은 결.
 *  반환 { agree, plan, list, edi } — 하나라도 모르면 agree:false(=종전대로 예측을 그대로 쓴다). */
export function dischargeSourcesAgree(voyage) {
  const plan = Number(voyage?.info?.planDis) || 0;              // 항만 — 배정목록 양하 수량
  const sec = voyage?.discharge || null;
  const list = Object.keys(sec?.records || {}).length;          // 선사·세관 — 업로드된 양하 리스트
  let map = null;
  try { map = ediMapFromRaw(sec); } catch (e) { map = null; }
  map = map || sec?.ediContainers || null;
  let edi = 0;
  for (const c of Object.values(map || {})) if (c && isPyeongtaekPort(c.pod)) edi++;
  return { agree: plan > 0 && list === plan && edi === plan, plan, list, edi };
}

/*  ★ 3.53-02 — 배정표 이적(berthShift)을 읽는 규칙 한 벌(§4-4). 종전엔 shiftingTruthCheck 안에만
    있어서 다른 판정이 못 썼다. ⚠ 1대 = 크레인 2모브. ⚠ 작업 시작 전의 0 은 «이적 없음»이 아니라
    «아직 안 나온 것»이다(§173) — pending 으로 돌려주고 판정에 쓰지 않는다.
    ⚠ 감사 지적(3.53-02): 같은 값을 **올림**으로 읽는 두 벌째 `_berthShiftCount`(«적어도 이만큼»,
      3.44 표시용)가 아직 남아 있다. 홀수 모브에서 답이 갈리는 자리라 통합은 인계함에 올렸다. */
function _berthTruthRaw(voyage) {
  const bs = voyage?.info?.berthShift;
  if (bs === null || bs === undefined || bs === '') return null;      // 자료 자체가 없음
  const n = Number(bs);
  if (!Number.isFinite(n)) return null;
  const ts = String(voyage?.info?.terminalStatus || '').trim().toLowerCase();
  if (!_TRUTH_READY.has(ts)) return { pending: true, moves: n, terminalStatus: ts || '미상' };
  return { truth: n / 2, moves: n };
}

/** 되돌림 판정에 쓸 배정표 확정 이적 «대수» — 확정된 정수 양수일 때만, 아니면 null.
 *  ⚠ 감사 지적(3.53-02): shiftingTruthCheck 를 거쳐 읽으면 삼자 일치 갈래가 _TRUTH_READY 게이트
 *    **앞**에 있어 작업 전에도 0 이 새어 나온다(§173 함정). 그래서 _berthTruthRaw 를 직접 쓴다.
 *    EDI 를 다시 파싱하지 않는 효과도 있다(dischargeSourcesAgree 가 ediMapFromRaw 를 또 부른다).
 *  ⚠ 홀수 모브(3 → 1.5)는 대수가 아니다 — null 을 내어 판정하지 않는다. */
export function berthShiftTruth(voyage) {
  const r = _berthTruthRaw(voyage);
  if (!r || r.pending || !Number.isInteger(r.truth) || r.truth <= 0) return null;
  return r.truth;
}

export function shiftingTruthCheck(voyage, predCount) {
  const pred = Number(predCount) || 0;
  //  2.79: 삼자가 일치하면 배정표 이적(berthShift)을 기다리지 않는다 — 그 값은 작업이 시작돼야
  //    확정되는데(_TRUTH_READY), 검수사는 **작업 전에** 세 자료로 이미 답을 냈다.
  const _src = dischargeSourcesAgree(voyage);
  //  ⛔ 2.82-03 (검수사 실물 2026-08-29: «◆쉬프팅(재적부) 95 · 선사·세관·배정 279대 일치 ✓ 시프팅 없음??»)
  //    **두 이야기가 한 판정에 묶여 있었다.**
  //      · 삼자 일치 = «평택에서 내릴 짐이 279대로 확정됐다»(양하 **대수**)
  //      · 배정표 이적 = «크레인이 옮긴 시프팅이 190모브(95대)»(시프팅 **모브**)
  //    둘은 세는 것이 다른데 2.79 가 앞의 것으로 «시프팅 없음»을 단정했다. 그때는 예측이 허수라
  //    맞아떨어졌지만, 2.81 로 확정 대조 95대가 실재하자 **95대를 띄우고 그 옆에 «시프팅 없음»**을
  //    같이 적는 모순이 나왔다.
  //    ⇒ 배정표가 시프팅을 «있다»고 말하면(>0) 그쪽이 먼저다. 삼자 일치로 덮지 않는다.
  const _bs0 = Number(voyage?.info?.berthShift);
  if (_src.agree && !(Number.isFinite(_bs0) && _bs0 > 0)) {
    return { truth: 0, pred, ok: pred === 0, moves: 0, srcAgree: true, srcs: _src,
             reason: `선사·세관·배정 세 자료가 모두 ${_src.plan} 대로 같다 — 평택에서 내릴 짐이 확정됐다` };
  }
  //  3.53-02: 배정표 이적을 읽는 규칙은 _berthTruthRaw 한 벌이다(§4-4). 동작은 종전과 같다.
  const r = _berthTruthRaw(voyage);
  if (!r) return null;                                                // 자료 자체가 없음
  if (r.pending) {
    return { pending: true, pred, moves: r.moves, terminalStatus: r.terminalStatus,
             reason: '작업 시작 전 — 배정표 이적이 아직 확정값이 아니다' };
  }
  return { truth: r.truth, pred, ok: r.truth === pred, moves: r.moves };
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
      //  ⛔ noRevert — 되돌림은 «배정표와 맞는 수»를 만들어 주므로 어떤 분할이든 정답으로 만든다(감사 [치명]).
      try { got = Object.keys(predictShiftingFromVoyage(voyage, base, { noRevert: true }) || {}).length; } catch (e) { got = -1; }
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
//  ★ 2.76 (검수사 확정 2026-08-28) — **숫자 하나로 확인한다. 한 벌로 둔다.**
//    검수사 원문: *«양하갯수가 평택항에서 확정이 되었습니다. 지금 리스트와 평택항 양하 대상을
//    맞추시면 됩니다. 그러면 바로 확인 가능 합니다. edi 만들때 그 방법으로 비교해보세요»* ·
//    *«47개만 비교하면 됩니다.»* · *«그기능을 앱에 넣을수 있나요? 그러면 매번 이런 고생 할 필요가 없습니다.»*
//
//    배정표(평택항)가 확정한 양하 수량 − EDI 평택분 = **모자란 수**.
//    그 수만큼을 양하 리스트에서 찾으면 답이 나온다. 실측 MCSC 633N: 279 − 232 = 47, 리스트에서 47 → 맞는다.
//    ⚠ 배정표 수량이 없거나 EDI 가 아직이면 판정하지 않는다(0을 «없음»으로 읽지 않는다).
export function ptkCountCheck(voyage, mode = 'discharge') {
  const plan = Number(voyage?.info?.[mode === 'loading' ? 'planLod' : 'planDis']) || 0;
  const sec = voyage?.[mode] || null;
  const ediN = Object.keys(sec?.ediContainers || {}).length;
  const listN = Object.keys(sec?.records || {}).length;
  if (!plan || !ediN) return { plan, ediN, listN, gap: 0, known: false };
  return { plan, ediN, listN, gap: plan - ediN, known: true, listMatch: !!listN && listN === plan };
}

export function predictShiftingFromVoyage(voyage, dictEntry, opts) {
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
  //  ★★ 2.76 (검수사 확정 2026-08-28) — **기본이 리스트다.**
  //     검수사 원문: *«기본이 리스트입니다. 리스트 목록에 앱이 말한 쉬프팅 대상 컨테이너랑 매칭이
  //     된다면 시프팅 보다는 평택 양하가 맞다고 판단해야 할것입니다. 아니면 리스트에 환적화물 또는
  //     시프팅 표시를 했을 것입니다.»*
  //
  //     2.21 은 «리스트의 POD 값이 평택일 때»만 고쳤다. 그것으로는 좁다 —
  //     **양하 리스트에 실려 있다는 것 자체가 «평택에서 내린다»는 뜻**이다. POD 칸이 비었든
  //     터미널 코드(KRPYOTM)로 적혔든 마찬가지다. 그래서 **항로(로테이션)를 몰라도 답이 나온다.**
  //
  //     실측 MCSC 633N(SEASPAN CALICANTO, 2026-08-28) — EDI 1,159대 중 POD 가 평택이 아닌 927대
  //     가운데 **양하 리스트에 있는 것이 정확히 47대**(전부 CNTXG · 전부 엠티 40HE · 전부 MSK).
  //     그 47대는 ①선사 양하리스트에 있고 ②배정표 양하 수량 279 와 리스트가 일치하고
  //     ③배정표 이적 0 이고 ④선사가 다음 판 EDI(_2)에서 그 47대를 KRPTK 로 이미 고쳤다.
  //     ⚠ 리스트의 환적·시프팅 표시 칸은 **전부 비어 있었다**(cargoType·tsport·gi·printpod 279/279 공란).
  //
  //  ⚠ **앱이 틀렸던 것이 아니다** — 검수사 확정: *«앱의 판단도 틀리다고는 할수없습니다.
  //     컨테이너 상세화면엔 분명히 목적지가 평택이 아니었으니.»* 자료가 서로 달랐던 것이다.
  //     그래서 지우지 않고 **양쪽을 다 남긴다**(_podEdi·_podList·_podFrom) — 화면이 둘 다 보여 준다.
  //  ⚠ 리스트가 «환적/시프팅»이라고 **말하면 그 말을 따른다** — 표시가 있으면 안 고친다.
  let customsFixed = [];
  const _recs = sec?.records || null;
  //  리스트가 그 컨을 «환적·시프팅»으로 표시했는가 — 표시가 있으면 리스트 스스로 «평택 양하가 아니다» 라고 말한 것이다.
  const _listSaysTS = (r) => {
    if (!r) return false;
    if (String(r.tsport || '').trim()) return true;          // 환적항이 적혀 있다
    const tag = `${r.cargoType || ''} ${r.printpod || ''} ${r.gi || ''}`.toUpperCase();
    return /T\/?S|환적|시프팅|SHIFT|RESTOW|재적/.test(tag);
  };
  if (map && _recs && Object.keys(_recs).length) {
    const fixed = {};
    for (const [cn, c] of Object.entries(map)) {
      const ediPod = String(c?.pod || '').toUpperCase();
      const rec = _recs[cn];
      const recPod = String(rec?.pod || '').toUpperCase();
      //  2.76: 값이 평택이 아니어도 **리스트에 있으면** 평택 양하다. 단 리스트가 환적이라 하면 따른다.
      if (ediPod && rec && !isPyeongtaekPort(ediPod) && !_listSaysTS(rec)) {
        customsFixed.push({ cn, ediPod, recPod: recPod || '(리스트에 있음)',
          src: String(rec?._source || ''), fe: String(rec?.fe || ''), op: String(rec?.op || ''),
          pos: `${parseInt(c?.bay, 10) || c?.bay || ''}-${c?.row || ''}-${c?.tier || ''}`, iso: c?.iso || '' });
        fixed[cn] = { ...c, pod: 'KRPTK', _podEdi: ediPod, _podList: recPod, _podFrom: 'list' };
      } else fixed[cn] = c;
    }
    map = fixed;
  }
  //  ★ 4.48 — 선사 지시 «본선 잔류»(keepOnboard) 컨은 리스트에 있어도 평택에서 내리지 않는다 — 그 컨만 지시 양하항으로 바꿔 넣는다.
  //    검수사 2026-10-24 12:49 MAMP 641N 메일 «Pls keep below cntrs onboard for CNDAI discharge» · 13:09 «메일 적용은 … 노란 다이아 몬드로 시프팅 대상이라는걸 보여주세요».
  //    물리 판정(같은 단 아래 평택 컨 · 커버 아래 평택 홀드)은 이 함수 한 벌을 그대로 쓴다 — 지우지 않고 POD 만 바꾼다(2.21 과 같은 까닭).
  const _force = opts && opts.forcePod;
  if (map && _force && typeof _force === 'object') {
    const f = {};
    for (const [cn, c] of Object.entries(map)) {
      const fp = _force[cn] || (c && c.cn && _force[c.cn]);
      f[cn] = fp ? { ...c, pod: String(fp).toUpperCase(), _podEdi: c && c._podEdi ? c._podEdi : c && c.pod, _podFrom: 'keep' } : c;
    }
    map = f;
  }
  //  ★ 3.53-02 — 제외는 여기서 «해 두기만» 하고, 배정표 확정 이적으로 검증한 뒤에 확정한다(아래 ★★).
  //    검증에 해치 정보(baysInfo)가 필요해 제외 전 맵을 함께 들고 간다.
  let _pgAll = null, _pgList = null;
  if (map && (origin || nextPort)) {
    const before = portsBeforePtk(lane, origin, nextPort);
    if (before && before.length) {
      const gone = new Set(before.map(p => p.toUpperCase()));
      const kept = {};
      for (const [cn, c] of Object.entries(map)) {
        if (gone.has(String(c?.pod || '').toUpperCase())) { excludedCnt++; continue; }
        kept[cn] = c;
      }
      if (excludedCnt) { _pgAll = map; _pgList = before; }
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
      if (baysInfo && COVER_LINKS[vsl]) for (const [a, list] of Object.entries(COVER_LINKS[vsl])) if (baysInfo[a]) baysInfo[a].coverWith = list;   // 4.62-06
    }
  } catch (e) { baysInfo = null; }

  /* ★★ 3.53-02 (검수사 실물 2026-09-17, KSKM 2617N) — **배정표가 심판이다.**
       검수사 원문: *«인천에서 출발 하였다면 인천분이 남아 있으면 안됩니다. 제외 하는게 맞죠
       그런데 굳이 터미널은 시프팅1개를 잡았습니다. 그럼 다음 기항지로 가는지 확인을 해야 합니다.»*

     사건 — 항로 사전 `IHS1`([CNXMN,KRINC,KRPTK])은 «인천이 평택 직전»이라 해서 인천 양하 299대를
     제외했고 앱 예측은 0이 됐다. 그런데 **배정표 이적이 2모브(=1대)** 였다. 실물로 가리니 인천은
     평택 **다음**이었다 — 직전 항차 2616N 의 하문 출항본 인천행 319대가 평택 출항본에 컨번호·자리까지
     한 칸도 안 바뀌고 그대로 있었다(인천을 들렀다면 내렸어야 한다). 제외를 풀면 예측 1대
     (SEGU2523756 · 27베이 01열 90단 · 평택분 88단 위)가 나오고 **배정표 1대와 맞는다.**

     ⇒ 사전을 뒤집어 다시 적지 않는다 — 검수사 확정 §1162 *«같은 항로라도 그 항차에 어디를 먼저
        가는지는 선사가 이득을 보고 정한다»*. 사전은 그대로 두고 **매 항차 배정표로 검증**한다.
     ⚠ 작업 시작 전에는 판정하지 않는다(berthShiftTruth 가 null) — §173 «대기 단계 자료로 확정 선박을
        판정하지 마라». 이적 칸이 채워지기 전의 0 은 «이적 없음»이 아니라 «아직 안 나온 것»이다.
     ⚠ 제외한 판이 배정표와 맞으면 아무것도 안 한다. **제외 안 한 판만 맞을 때** 되돌린다. */
  //  ⚠ 감사 지적(3.53-02): 제외 적용본은 여기서 **한 번만** 센다. 종전 초안은 제외본과 map 이
  //    같은 객체인데도 predictShifting 을 두 번 돌렸다(커버 역산 800회에서 그 배수가 곱해진다).
  const outEx = predictShifting(map, baysInfo);
  let exReverted = null, out = outEx;
  /*  ⛔ 감사 지적 [치명](3.53-02) — **커버 역산(solveHatchRows)에서는 되돌리지 않는다.**
      역산은 «예측 대수 == 배정표 이적»인 커버 분할을 정답으로 모은다. 그런데 되돌림은 바로 그
      «배정표와 맞는 수»를 만들어 주므로, 되돌림이 걸린 분할은 **무엇이든 정답이 된다**(실측: 93가지
      분할 중 78가지가 «정답»). 그러면 화면이 검수사에게 «이 값으로 베이매트릭스에 저장하라»고
      권하고 선박 사전이 영구히 오염된다. 역산은 noRevert 로 부른다. */
  /*  ⛔ 2차 시뮬 지적(3.53-02) — **EDI 가 직접 말한 다음 기항은 되돌리지 않는다.**
      제외 명단의 **첫 항**이 그 배 EDI 의 다음 기항(LOC+61)이면 선사가 그 항차에 대해 적은 값이라
      사전보다 강하다(YKTD 2610E — 사전이 개입한 적 없는데 되돌아갔다). 그 항은 계속 제외한다.
      ⚠ 감사 재판정 [중대]B: 그렇다고 명단을 통째로 막으면 안 된다 — portsBeforePtk 규칙 ②는
        «다음 기항부터 평택 전까지»라 **첫 항만 EDI 가 말한 것이고 나머지는 사전이 걸어 만든 것**이다.
        LOC+61 이 하문이면 명단은 [하문, 인천]인데, «인천이 평택 앞»은 사전의 주장이고 그것이 바로
        2617N 에서 틀렸던 말이다. EDI 에 그 줄이 있느냐 없느냐로 답이 갈리면 안 된다.
      ⇒ EDI 가 말한 항만 남기고 **사전이 덧붙인 나머지만** 되살려 본다. */
  const _ediPort = String(nextPort || '').toUpperCase();
  const _revertPorts = _pgList ? _pgList.filter((p) => String(p).toUpperCase() !== _ediPort) : [];
  if (_pgAll && _revertPorts.length && !(opts && opts.noRevert)) {
    const truth = berthShiftTruth(voyage);
    if (truth != null) {
      const nEx = Object.keys(outEx).length;
      if (nEx !== truth) {
        //  사전이 덧붙인 항만 되살린 맵 — EDI 가 말한 항은 계속 제외한 상태로 둔다.
        const _keepGone = new Set(_ediPort ? [_ediPort] : []);
        let _cand = _pgAll;
        if (_keepGone.size) {
          _cand = {};
          for (const [cn, c] of Object.entries(_pgAll)) {
            if (_keepGone.has(String(c?.pod || '').toUpperCase())) continue;
            _cand[cn] = c;
          }
        }
        const allOut = predictShifting(_cand, baysInfo) || {};
        const nAll = Object.keys(allOut).length;
        /*  ⚠ 감사 재판정 [중대]A — **수가 맞는 것만으로는 안 된다.** 제외를 풀면 홀드 컨이 늘어
            커버 등분 경계(hatchRows 가 없는 근사 선박)가 옮겨져, 제외본에서 잡히던 데크 컨이
            전체본에서 **빠질 수 있다**(실측: outEx 1대 → allOut 0대). 그러면 제외분이 답에 한 대도
            안 들어왔는데 수만 맞아 되돌아가고, 화면은 «그 화물은 지금 배에 실려 있습니다»라는
            거짓을 말한다. 그래서 셋을 다 본다 —
              ① 되돌려 «들어온» 컨이 실제로 있고(gained)
              ② 그것이 전부 제외 대상 항의 화물이며
              ③ 제외본에 있던 컨이 하나도 «사라지지» 않았다(lost 0 — 경계가 안 옮겨졌다는 뜻). */
        const _goneSet = new Set(_revertPorts.map((p) => String(p).toUpperCase()));
        const gained = Object.keys(allOut).filter((cn) => !outEx[cn]);
        const lost = Object.keys(outEx).filter((cn) => !allOut[cn]);
        const gainedOk = gained.length > 0
          && gained.every((cn) => _goneSet.has(String(_pgAll[cn]?.pod || '').toUpperCase()));
        //  ⚠ 선사 시프팅 서류가 있으면 **되돌아온 컨이 그 목록에 있어야** 한다(감사 1차 [중대]).
        const _rl = voyage?.restowList;
        const _rlKeys = (_rl && typeof _rl === 'object')
          ? Object.keys(_rl).filter((k) => k && !k.startsWith('_')) : [];
        const rlOk = !_rlKeys.length || gained.every((cn) => _rlKeys.includes(cn));
        if (nAll === truth && gainedOk && !lost.length && rlOk) {
          const _stillGone = Object.keys(_pgAll).length - Object.keys(_cand).length;   // EDI 항이라 계속 빼는 대수
          const _revived = excludedCnt - _stillGone;                                   // 되살린 대수
          exReverted = { ports: _revertPorts, n: _revived, truth, nEx, nAll, backIn: gained };
          //  ⚠ map 은 여기서부터 아무도 안 읽는다(변이 시험 실측) — 되돌림의 실체는 out·excluded 다.
          excluded = _stillGone ? [_ediPort] : null;
          excludedCnt = _stillGone;
          out = allOut;
        }
      }
    }
  }
  try {
    Object.defineProperty(out, '_meta', { value: { origin, nextPort, lane, excluded, excludedCnt, hatchInfo: !!baysInfo,
      exReverted,   // 3.53-02: 배정표가 «제외가 틀렸다»고 말해 되돌린 건 — 화면이 근거로 보여 준다
      //  ★ 3.53-02: 베이플랜 화면 숨김도 **이 판정 한 벌**을 쓴다(§4-4). 종전엔 VoyagePage 가
      //     portsBeforePtk 를 따로 불러, 되돌려도 그 컨을 계속 숨겼다 — 시프팅 1대라고 말하면서
      //     바로 그 한 대를 화면에서 가리는 상태가 된다.
      preGone: (excludedCnt && excluded && excluded.length)
        ? { ports: excluded.map(p => String(p).toUpperCase()), list: excluded, origin } : null,
      customsFixed,   // 2.21/2.76: 양하 리스트가 «평택에서 내린다»고 해서 POD 를 바로잡은 건 — 화면이 근거로 보여 준다
      //  ★ 2.76: **근거를 세어 보인다.** 검수사 확정 — *«추후에 업로드될 세관리스트와도 같다면 확정이겠죠.
      //    또한 평택항에서도 시프팅을 생각하지 않고 있습니다.»* 판정 하나를 던지지 말고 무엇이 맞아떨어졌는지 센다.
      count: ptkCountCheck(voyage, 'discharge'),   // 2.76: 배정표 확정 − EDI 평택분 = 모자란 수(화면은 이것만 읽는다)
      listMeta: (() => {
        const srcs = [...new Set(customsFixed.map(x => x.src).filter(Boolean))];
        const isCustoms = srcs.some(f => /적하\s*목록|적하|세관|CDL|MANIFEST|신고|^Excel_\d{14}/i.test(f));
        const fe = customsFixed.reduce((a, x) => { const k = (x.fe || '?').toUpperCase(); a[k] = (a[k] || 0) + 1; return a; }, {});
        return { srcs, isCustoms, fe, n: customsFixed.length };
      })(),
      // rot: 판정 근거 — direct(EDI 다음 기항=평택) · edi(다음 기항 실측) · rotation(사전 걸음) · unknown(미확인)
      //  ⚠ 감사 지적(3.53-02): 되돌리면 excluded 가 비어 rot 이 «미확인»으로 떨어졌다 —
      //    판정 근거 자체는 그대로이니 되돌린 뒤에도 원래 근거를 적는다.
      rot: (nextPort === 'KRPTK') ? 'direct'
         : ((excluded || exReverted) ? (nextPort ? 'edi' : 'rotation') : 'unknown') }, enumerable: false });
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
// ── 4.12-02: 한국어 날짜 말 → 오늘 기준 며칠 뒤(음수는 앞) — **날짜 말 해석은 이 함수 한 벌**이다 ──
//   검수사 2026-10-08 07:20 «미르가 어제 라는 단어를 모릅니다. 어제 야간 근무조를 알려줬는데 오늘 야간 근무자로 등록을 합니다.
//   엊그제 그제 어제 내일 모레 낼모레등 날짜에 관한건 익히게 해주세요». 종전엔 근무자 등록(parseCraneCrew)·갱 수(nlSearch gangSet)·작업 선박(mir)이
//   각자 «모레→2, 내일→1, 나머지→0» 만 따로 세어, 어제·그제·엊그제·낼·글피가 전부 «오늘» 로 떨어졌다(07:15 PCSZ 사고).
//   말이 겹치면(내일모레 ⊃ 내일, 엊그제 ⊃ 그제) 더 긴 말이 먼저이고, 한 문장에 둘이 있으면 앞에 나온 말을 따른다. 없으면 null.
const _DATE_WORDS = [
  [/그끄저께|그끄제/, -3],
  [/엊그저께|엊그제|엇그제/, -2],
  [/그저께|그제(?!서|야(?!간))/, -2],   // «그제서야»·«그제야 알았다» 는 날짜 말이 아니다 — «그제야간»(공백 없이 쓴 그제 야간)은 날짜 말이다
  [/어저께|어제|어젯밤|어젯/, -1],
  [/내일\s*모레|낼\s*모레|내일모레|(?:내일|낼)\s*모래|모레|모래(?=\s*(?:주간|야간|낮|밤))/, 2],   // «모래» 는 모레의 흔한 오기 — 뒤에 조가 붙을 때만 받는다
  [/그글피/, 4],
  [/글피/, 3],
  [/내일(?!정)|이튿날|다음\s*날(?!씨|짜)|(?:^|[^가-힣])(?:명일|익일)/, 1],   // «안내일정»·«다음 날씨»·«김명일» 은 날짜 말이 아니다
  [/(?:^|[^가-힣])낼(?:[은는도에의]|(?![가-힣])(?!\s*(?:거|것|수|때|게|지|까|사람|돈|만큼|필요|예정|테|겁|걸|래|려)))/, 1],   // «낼» 한 글자 — 앞뒤가 한글이면(«만낼»·«낼름») 날짜 말이 아니고, «낼 거야·돈 낼 사람» 은 동사다
  [/(?:^|[^가-힣])작일/, -1],   // «시작일»·«작업시작일시» 속의 «작일» 은 날짜 말이 아니다
  [/오늘|금일/, 0],
];
/** 말에 든 날짜 말 → { off, word(말한 그대로) } · 없으면 null. «오늘 말고 내일» 처럼 «말고·아니고·대신» 이 뒤따른 말은 버린다. */
export function dateWordOf(text) {
  const t = String(text || '');
  let best = null;
  for (const [re, off] of _DATE_WORDS) {
    const m = re.exec(t);
    if (!m) continue;
    const lead = /^[^가-힣]/.test(m[0]) ? 1 : 0;   // 앞 글자 하나를 같이 잡는 규칙(낼·명일·익일·작일)
    let word = m[0].slice(lead).trim();
    if (/^낼[은는도에의]$/.test(word)) word = '낼';   // «낼은 야간» 의 조사는 말의 일부가 아니다
    const at = m.index + lead;
    if (/^\s*(?:말고|말구|아니고|아니라|아닌|대신|빼고)/.test(t.slice(m.index + m[0].length))) continue;
    if (!best || at < best.at) best = { off, word, at };   // 같은 자리면 앞 규칙(더 긴 말)이 이긴다
  }
  return best ? { off: best.off, word: best.word } : null;
}
export function dateWordOffset(text) { const d = dateWordOf(text); return d ? d.off : null; }
//  ★ 2.66 (검수사 확정 2026-08-27 — PCSZ 2626W 전량 캔슬 사건): **배정목록이 0이면 그 쪽 일은 없다.**
//    캔슬 통보 메일에 선적 리스트가 첨부돼 오는 바람에 수집기가 그 리스트를 그대로 먹었고(records 81건,
//    부킹 EDI 80대), 앱은 없는 선적 63대를 세고 있었다 — 로그인 카드 배지(20FT 46 중 28·MTY 1·리퍼 1)와
//    선적 브리핑이 전부 그 허수였다. 그때도 앱은 답을 갖고 있었다: 배정목록 선적 0(확정) · 터미널 lodPlan 0.
//    ⇒ 배정목록(정본)이 그 쪽 0 이고 터미널도 0 이면 **세지 않는다**. 자료는 지우지 않는다 —
//      사본이 정본을 고칠 수 없고, 캔슬이 번복되면 배정목록이 먼저 알려 준다.
//    ⚠ 배정 수량이 **없는**(null) 항차는 판정하지 않는다 — «미상» 과 «0» 은 다르다.
/*  ★ 2.87-06 (검수사 지시 2026-08-30 — **자동 판정 폐지**)
      원문 — *«그건 특수한 사항입니다. 메일이나 저나 이야기 없으면 적용하면 안됩니다.
      그리고 그카드에 사용될 가능성은 다분 합니다. 카드는 갖고 있되 적용은 저에게 물어 보고 하십시요.»*

    ── 무엇이 틀렸나
    2.66 은 PCSZ 2626W **한 척**에서 규칙을 만들었다. 그 배는 사정이 특수했다 —
    검수사 설명: *«메일이 있었고 다른선박에 예정된 화물이 실리기로 변경돼서 그런것»*.
    캔슬의 근거는 **캔슬 통보 메일**이었고, 배정목록 0 은 그 뒤를 따라온 **결과**였다.
    그런데 나는 결과를 원인으로 삼아 «0 이면 캔슬» 이라는 일반 규칙을 만들었다.
    검수사 지적 — *«한 선박 특수한 상황이었는데 그걸 일반 선박에 적용했다는게 좀 그렇네요»*

    ── 무슨 일이 났나 (실측 2026-08-30 새벽, 라이브 RTDB 대조)
    0 을 달고 있던 **10항차 중 8척**이 잘못 가려져 있었다. 그중 TMPZ 2026E 는
    **양하 EDI 74대가 이미 와 있는데** 화면이 통째로 덮였다.
    검수사가 ATPR 2639E 에서 발견 — *«이게 뭐죠?»* · *«입항예보가 있는데»*
    (PORT-MIS «평택 항해중(입항예정)», 입항 08-30 19:00 — **아직 오지도 않은 배**였다).
    그 화면 뒤에 양하 251대·리퍼 52대가 가려져 있었다.

    ── 그래서 지금
    **숫자로는 판정하지 않는다.** 사람이 표시한 것만 본다(`cancelDis`·`cancelLod`).
    카드와 배선 14곳은 그대로 둔다 — 검수사 *«그 카드에 사용될 가능성은 다분 합니다»*.
    ⛔ 이 표시를 켜는 것은 **검수사에게 물어본 뒤**다. 메일이나 검수사 말이 근거이지,
      배정목록 숫자는 근거가 아니다.
    (3.53-13: 셋째 인자였던 터미널 합계 자료는 호출부까지 전부 없앴다.) */
export function sideCancelled(info, mode) {
  if (!info) return false;
  const f = mode === 'loading' ? info.cancelLod : info.cancelDis;
  return f === true || f === 1 || f === '1' || f === 'true';
}

/** ★ 4.55-01 — **선적 방향이 «있는 배»인가 · 보유 모드가 전부 «검수 완료» 인가는 여기 한 벌이다** (홈 isAllDone · 수석 대시보드 진행 줄 · 17시 보관 보고 · 홀드 잔여 · 미르가 같이 쓴다).
 *
 *  🔴 검수사 2026-10-27 06:22 «수석완료확인 버튼을 활성화 시킨이유는?» · 06:33 «선적EDI가 없다고 선적이 없는건 아닙니다. EDI 대기 상태인거죠 EDI만 오면 바로 선적시작할것이라는 이야기 입니다.»
 *     DXQD 2642E(양하 208 끝 · 선적 리스트 371대만 와 있고 EDI 대기)가 수석 대시보드에서는 «선적 0대 = 선적 없음» 으로 읽혀 양하 완료 표시만으로 «✓ 수석 완료 저장» 이 켜졌다.
 *     홈은 선적 구역에 자료가 있으면 «있음» 으로 봐서 켜지 않았다 — 같은 판정이 다섯 곳에 복제돼 각자 달랐다(홈·수석 보드·ferryWorkDone·홀드 잔여 finishedAll·미르).
 *  ⇒ «선적 EDI 가 없다» 는 «선적이 없다» 가 아니다. 선적 구역에 자료가 한 가지라도 와 있거나(EDI·리스트·베이 작업…), 자료는 아직 없어도 선적 계획 수량(info.planLod)이 있으면 선적은 «대기» 다 — 끝났다고 보지 않는다.
 *  ⚠ 선적이 전량 캔슬로 표시된(cancelLod — 사람이 표시한 것만) 배는 계획 수량만으로는 «있다» 고 보지 않는다(자료가 와 있으면 종전대로 «있다»).
 *  ⚠ 선적 자료도 계획 수량도 없는 배(planLod 0 · 구역 없음)는 종전대로 «없다» — 수석 보드의 «선적 완료 표시가 없다» 확인창(V8.92)이 마지막 안전망으로 남는다. */
export function hasLoadingSide(voyage) {
  const sec = voyage && voyage.loading;
  if (sec && typeof sec === 'object' && Object.keys(sec).length > 0) return true;   // 자료가 한 가지라도 와 있다
  const info = (voyage && voyage.info) || {};
  return !sideCancelled(info, 'loading') && Number(info.planLod) > 0;                   // 자료는 아직 없지만 선적 계획 수량이 있다 — EDI 대기
}
/** 검수원이 «검수 완료» 를 눌렀나 — 수석 완료(inspectorDone)이거나, 보유 모드(양하 구역이 있다 · 선적 방향이 있다)가 전부 완료 표식(dischargeDone·loadingDone)이면 true. 양하·선적 둘 다 없으면 false. */
export function inspectorAllDone(voyage) {
  const info = (voyage && voyage.info) || {};
  if (info.inspectorDone) return true;
  const hasD = !!(voyage && voyage.discharge && Object.keys(voyage.discharge).length);
  const hasL = hasLoadingSide(voyage);
  if (!hasD && !hasL) return false;
  return (!hasD || !!info.dischargeDone) && (!hasL || !!info.loadingDone);
}
/** ★ 4.55-01 — 양하(자료가 있는 방향)는 다 끝났고, 남은 선적은 **자료 없이 계획 수량만 있는 EDI 대기**뿐인가 — 검수원이 지금 입력할 것이 없다.
 *  «검수 완료»(inspectorAllDone)는 이 배를 «선적 대기» 로 읽지만, 미르의 «화남·다음 작업» 은 «입력할 게 남았나» 만 본다 — 이 한 칸이 둘을 가른다(미르는 종전 4.55 와 같은 답, 콘앱도 같다). */
export function ediWaitingOnlyLeft(voyage) {
  const info = (voyage && voyage.info) || {};
  const hasD = !!(voyage && voyage.discharge && Object.keys(voyage.discharge).length);
  const sec = voyage && voyage.loading;
  const hasLData = !!(sec && typeof sec === 'object' && Object.keys(sec).length);
  return hasD && !!info.dischargeDone && !hasLData && hasLoadingSide(voyage);
}

//  ★ 4.55-02: EDI 올리기 «다른 선박 EDI» 판정 **한 벌** — 이 EDI 의 배가 이 항차의 배인가.
//    검수사 2026-10-27 18:19 — NSDC2611SKRPTK SI.edi 가 «다른 선박 EDI (선박명 STARSHIP DRACO ≠ EDI STASRHIP DRACO)» 로 막혔다.
//    EDI 선사가 R·S 를 바꿔 쓴 오타인데 항차 info 의 콜사인 칸이 비어(수집기 자동등록 항차는 거의 비어 있다)
//    콜사인 비교를 건너뛰고 선박명 앞 5글자(STARS ↔ STASR)로만 판정했다. 선박 사전에는 같은 콜사인(V7A5451)이 있었다.
//    규칙 — ① 콜사인: 항차 콜사인이 있으면 비교(둘 다 있고 다르면 막음 · 종전 그대로). 없으면 선박 사전 콜사인(ident)으로
//          «같다» 만 확인한다(사전이 낡았을 수 있어 «다르다» 는 막는 근거로 쓰지 않는다). 같고 이름이 근사하면 콜사인으로 확인한 같은 배.
//             콜사인이 같아도 이름이 비교 가능한데 앞 5글자도 한 글자 오타도 아니면 종전처럼 막는다(콜사인은 «근사한 이름» 을 확정하는 근거일 뿐 이름 비교를 면제하지 않는다 — 사전 콜사인 오염 대비).
//          ② 선박명: 종전 앞 5글자 규칙 그대로 + 한 글자 오타(자리 바뀜·빠짐·더함·틀림, 정규화한 이름 7자 이상)는 같은 배.
//          — 실제 선박 61척 쌍 대조에서 한 글자 허용은 서로 다른 배를 같게 보는 쌍을 늘리지 않았다(두 글자는 SMC YANTAI ↔ SITC YANTAI 가 걸린다).
//    반환 {bad, basis, note} — bad 가 있으면 막는다. basis 'callsign'|'name'|'nameTypo'|''. note 는 받았지만 이름이 달랐을 때의 알림 한 줄.
//    ⚠ 항차 번호 확인은 이 함수 밖(올리기 문지기의 다음 단계)이다 — 이 함수가 통과해도 항차가 다르면 거기서 막는다.
function _within1Edit(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;                                   // 한 글자 틀림
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);   // 이웃한 두 글자 바뀜
  }
  const s = la < lb ? a : b, l = la < lb ? b : a;                                         // 한 글자 빠짐·더함
  return s.slice(i) === l.slice(i + 1);
}
export function ediShipVerdict(voyInfo, ident, edi) {
  const norm = (x) => String(x || '').toUpperCase().replace(/[\s\-_.]/g, '');
  const looksName = (x) => /\s/.test(String(x || '').trim()) || norm(x).length >= 7;
  const info = voyInfo || {}, id = ident || {}, e = edi || {};
  const voyCs = norm(info.callsign), ediCs = norm(e.callsign), dictCs = norm(id.callsign);
  if (voyCs && ediCs && voyCs !== ediCs) {
    return { bad: `콜사인 ${info.callsign} ≠ EDI ${e.callsign}`, basis: '', note: '', keepName: false };
  }
  const csSame = !!(ediCs && (voyCs === ediCs || dictCs === ediCs));
  const voyNm = norm(info.vslFull), ediNm = norm(e.vsl);
  const namesComparable = !!(voyNm && ediNm && looksName(info.vslFull) && looksName(e.vsl));
  const prefixSame = namesComparable && (voyNm.includes(ediNm.slice(0, 5)) || ediNm.includes(voyNm.slice(0, 5)));
  const typoSame = namesComparable && !prefixSame && voyNm.length >= 7 && ediNm.length >= 7 && _within1Edit(voyNm, ediNm);
  const differs = !!(voyNm && ediNm && voyNm !== ediNm);
  //  한 글자 오타(앞 5글자가 같아도) — 막지 않고 알림·저장 이름에만 쓴다(독립 감사 재확인 하 2: 뒤쪽 오타 DRACO → DRAKO 도 오타 이름이 사전에 저장되지 않게).
  const oneCharOff = namesComparable && differs && voyNm.length >= 7 && ediNm.length >= 7 && _within1Edit(voyNm, ediNm);
  //  keepName — 참이면 저장하는 선박명은 항차에 등록된 이름(EDI 의 오타 이름을 선박 사전·보관소에 넣지 않는다). 이름이 비교 가능한 경우에만 참.
  if (csSame) {
    //  콜사인이 같아도 이름이 비교 가능한데 크게 다르면 종전처럼 막는다 — 사전·항차 콜사인이 옛 배·자매선 것으로 오염됐을 수 있다(독립 감사 2026-10-27 중 1).
    //  콜사인은 «이름이 근사한 EDI» 를 확정하는 근거로만 쓴다(오타·표기 차이 → 콜사인으로 확인했다고 알리고 받는다).
    if (namesComparable && !prefixSame && !typoSame) {
      return { bad: `선박명 ${info.vslFull} ≠ EDI ${e.vsl} (콜사인 ${e.callsign} 은 같지만 이름이 크게 다름 — 선박 사전·항차 콜사인이 다른 배 것일 수 있음)`, basis: '', note: '', keepName: false };
    }
    if (!namesComparable || !differs) return { bad: '', basis: 'callsign', note: '', keepName: false };
    if (oneCharOff) {
      return { bad: '', basis: 'callsign', keepName: true,
        note: `EDI 선박명 «${e.vsl}» 은 등록 «${info.vslFull}» 와 한 글자 달라도 콜사인(${e.callsign})이 같아 같은 배로 확인하고 적용합니다. 저장되는 선박명은 등록된 이름을 씁니다.` };
    }
    //  앞 5글자만 같은 다른 낱말(자매선 등) — 받되 경고 어조(사전 콜사인이 오염됐으면 «확인» 이라 말하지 않는다).
    return { bad: '', basis: 'callsign', keepName: false,
      note: `EDI 선박명 «${e.vsl}» 이 등록 «${info.vslFull}» 와 다릅니다. 콜사인(${e.callsign})이 같아 받지만 파일이 이 배 것이 맞는지 한 번 봐 주세요.` };
  }
  if (!namesComparable) return { bad: '', basis: '', note: '', keepName: false };
  if (prefixSame) {
    if (oneCharOff) {
      //  선박 사전 콜사인이 EDI 와 다르게 알려져 있으면 «오타» 라고만 하지 않는다 — 번호 계열 배(예 305 ↔ 306)일 수 있다(독립 감사 3차 하 1).
      const dictOther = !!(dictCs && ediCs && dictCs !== ediCs);
      return { bad: '', basis: 'name', keepName: true,
        note: dictOther
          ? `EDI 선박명 «${e.vsl}» 은 등록 «${info.vslFull}» 와 한 글자 달라 받지만, EDI 콜사인(${e.callsign})이 선박 사전(${id.callsign})과 달라 다른 배일 수 있습니다. 파일이 이 배 것이 맞는지 한 번 봐 주세요. 저장되는 선박명은 등록된 이름을 씁니다.`
          : `EDI 선박명 «${e.vsl}» 은 등록 «${info.vslFull}» 와 한 글자 차이(오타로 봄)입니다. 저장되는 선박명은 등록된 이름을 씁니다.` };
    }
    return { bad: '', basis: 'name', note: '', keepName: false };
  }
  if (typoSame) {
    return { bad: '', basis: 'nameTypo', keepName: true,
      note: `EDI 선박명 «${e.vsl}» 은 등록 «${info.vslFull}» 와 한 글자 차이(오타로 봄)라 같은 배로 보고 적용합니다. 콜사인으로는 확인되지 않았으니 파일이 맞는지 한 번 봐 주세요. 저장되는 선박명은 등록된 이름을 씁니다.` };
  }
  return { bad: `선박명 ${info.vslFull} ≠ EDI ${e.vsl}`, basis: '', note: '', keepName: false };
}

//  ★ 2.65-01: 근무조 경계 **한 벌** — 종전엔 chiefAnswers 안에만 있어(모듈 사설) 다른 화면이 못 썼다.
//    주간 08:00~17:30 · 야간 19:00~익일 06:30 (PCTC/PNCT 공통 경계 — 실근무 창은 WORK_SHIFTS 가 따로 가른다).
//    교대 사이(06:30~08:00 · 17:30~19:00)면 **다가오는** 조를 내고 startMs 로 그것을 알린다.
export function currentShift(nowMs) {
  const d = new Date(nowMs);
  const mm = d.getHours() * 60 + d.getMinutes();
  const at = (base, h, m) => { const x = new Date(base); x.setHours(h, m, 0, 0); return x.getTime(); };
  //  ⚠ 2.69: startMs 를 **모든 갈래에** 넣는다 — 조 키(날짜+주/야)를 뽑으려면 시작이 있어야 한다.
  //    현재 조에서는 start ≤ now 라 fromMs·«다가오는 조» 판정은 종전과 같다(회귀 없음).
  if (mm >= 480 && mm < 1050) return { name: '주간조', label: '08:00~17:30', endMs: at(d, 17, 30), startMs: at(d, 8, 0) };
  if (mm >= 1050 && mm < 1140) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30) + 86400000, startMs: at(d, 19, 0) };
  if (mm >= 1140) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30) + 86400000, startMs: at(d, 19, 0) };
  if (mm < 390) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30), startMs: at(d, 19, 0) - 86400000 };
  return { name: '주간조', label: '08:00~17:30', endMs: at(d, 17, 30), startMs: at(d, 8, 0) };
}

//  ★ 2.73 (검수사 실측 2026-08-27 22:07 «아직 SWTD 작업시작을 안했는데 19:00부터 계산함 —
//    그래서 22:00시 부터 재계산 해달라고 함»): **말한 시작 시각**을 읽는다.
//    «22:00부터»·«22시부터»·«22시에 시작»·«10시반부터» → 지금에서 가장 가까운 그 시각(±12시간).
//    ⚠ 날짜를 안 대면 오늘/어제/내일 중 **지금과 가장 가까운** 것을 고른다 —
//      새벽 2시에 «22시부터» 는 어젯밤 22시고, 21시에 «22시부터» 는 오늘 22시다.
export function parseSpokenTimeMs(text, nowMs = Date.now()) {
  const t = String(text || '');
  let h = null, mi = 0;
  let m = t.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (m) { h = +m[1]; mi = +m[2]; }
  else {
    m = t.match(/(\d{1,2})\s*시\s*(반|\d{1,2}\s*분)?/);
    if (m) { h = +m[1]; mi = m[2] ? (/반/.test(m[2]) ? 30 : parseInt(m[2], 10) || 0) : 0; }
  }
  if (h == null || h > 23 || mi > 59) return 0;
  const base = new Date(nowMs);
  let best = 0, bestGap = Infinity;
  for (const d of [-1, 0, 1]) {
    const c = new Date(base); c.setDate(c.getDate() + d); c.setHours(h, mi, 0, 0);
    const gap = Math.abs(c.getTime() - nowMs);
    if (gap < bestGap) { bestGap = gap; best = c.getTime(); }
  }
  return bestGap <= 12 * 3600000 ? best : 0;
}

//  ★ 2.74 (검수사 실측 2026-08-28 «미르야 2호기는 23:15 3호기는 23:20 4호기는 23:25 에 시작했어»):
//    **호기마다 시작 시각이 다르다.** 2.73 은 한 시각만 읽어 23:15 하나를 세 갱에 다 씌웠고,
//    뒤의 두 시각은 조용히 버렸다 — 말한 것을 못 들은 척한 셈이다.
//    ⇒ «N호기 HH:MM» 짝을 **전부** 걷어 호기 번호 오름차순으로 돌려준다. 없으면 빈 배열.
//    시각 읽기는 parseSpokenTimeMs 와 같은 벌(가장 가까운 ±12시간).
export function parseCraneStarts(text, nowMs = Date.now()) {
  const t = String(text || '');
  const out = [];
  const re = /(\d)\s*호기[^0-9]{0,6}(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*시(?:\s*반|\s*\d{1,2}\s*분)?)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const no = +m[1];
    const ms = parseSpokenTimeMs(m[2], nowMs);
    if (no >= 1 && no <= 9 && ms) out.push({ no, ms });
  }
  //  같은 호기를 두 번 말하면 뒤엣것(고쳐 말한 것)을 쓴다.
  const by = {}; out.forEach((x) => { by[x.no] = x.ms; });
  return Object.keys(by).map(Number).sort((a, b) => a - b).map((no) => ({ no, ms: by[no] }));
}

//  ★ 3.8 (검수사 2026-09-05 «미르에게 “OWBH 1호기 이인철 3호기 최관식” 이렇게 불러주면 앱에 등록해주기 —
//    그래야 누가 몇개나 작업 했는지 알수 있고 어디까지 작업한걸 알수가 있음») — **호기–검수원을 조 단위로 기억한다.**
//    실측 문장(김성일 2026-09-04 SWMM) — 22:11 «주간 1호기 김판석 2호기 송제욱» · 22:12 «야간 1호기 박진우 2호기 김성일».
//    ⚠ 이름은 명단(코드+서버)에 있는 것만 받는다 — 음성 인식이 이름을 자주 틀리므로 아무 낱말이나 사람으로 적지 않는다.
//      명단에 없는 낱말은 `unknown` 으로 돌려주고 화면이 «명단에 없어 못 적었어요» 라고 알린다(조용히 버리지 않는다).
//    ⚠ 시각이 붙은 «2호기는 23:15»(parseCraneStarts 몫)·묻는 말(«몇·누구·어디·언제»)은 등록이 아니다.
//    반환 { shift:'주간'|'야간'|null, crew:[{no,name}], unknown:[{no,tok}] } · 등록 문장이 아니면 null.
const _CREW_JOSA = /(이고|이며|하고|이랑|으로|에요|예요|입니다|이야|이다|이|가|은|는|랑|과|와|로|요)$/;
//  이름 뒤에 붙을 수 있는 꼬리 — 조사·어미가 **겹쳐도**(«이인철이에요»·«이인철이가») 전부 조사여야 이름으로 본다.
//  «김석호» 는 «김석»+«호» 인데 «호» 는 조사가 아니므로 김석이 아니다(2차 시뮬 지적 — 접두 일치만 보면 오탐).
const _CREW_TAIL = /^(?:씨|님|이고|이며|하고|이랑|으로|에요|예요|입니다|이에요|이야|이다|이|가|은|는|랑|과|와|로|요|야)+$/;
export function matchStaffName(tok, names = null) {
  const list = Array.isArray(names) ? names : allStaffNames();
  const w = String(tok || '').trim();
  if (!w) return '';
  if (list.includes(w)) return w;
  //  긴 이름부터 — «김석»이 «김석호»… 를 삼키지 않게 하는 것은 꼬리 규칙이고, 여기서는 같은 접두를 가진 두 이름(«김석»·«김석○») 사이의 우선순위다.
  const cands = list.filter((n) => n.length >= 2 && w.startsWith(n) && _CREW_TAIL.test(w.slice(n.length))).sort((a, b) => b.length - a.length);
  return cands.length ? cands[0] : '';
}
//  3.21: 세 번째 인자 `bowStern` = `craneBowSternOf(voyage)` 결과. 있으면 «선수·선미» 를 호기 번호로 바꾼다.
//    없거나 못 가리면 그 사람들을 `needPos` 로 돌려준다 — 화면이 «아직 작업 전이라 못 가려요» 로 되묻는다(§4-3).
export function parseCraneCrew(text, names = null, bowStern = null) {
  const t = String(text || '');
  if (!/호기|선수|선미/.test(t)) return null;
  //  묻는 말·시각 알림·되묻기(«맞아?»·«아니야?»)·취소(«빼줘»·«지워») 는 등록이 아니다 — 감사 실측: «1호기 박진우 맞아?» 가 정본을 덮어썼다
  if (/몇|누구|누가|어디|언제|맞아|맞나|맞지|맞습|아니|인가|인지|\?|취소|빼\s*줘|빼줘|빼라|지워|지우|삭제|\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*시/.test(t)) return null;
  const list = Array.isArray(names) ? names : allStaffNames();
  //  ⚠ 3.21 감사 지적 — 게이트를 «선수·선미» 까지 넓히자 **이름이 든 예사말**이 등록으로 잡혔다
  //    (실측 «김판석 선미 쪽으로 갔어» · «이종부 선수쪽에서 작업중» 이 정본을 덮었다).
  //    3.8 의 «N호기» 는 그 자체가 강한 표식이었지만 «선미» 는 예사말에도 나온다.
  //    ⇒ 호기 없이 쪽만 말할 때는 **등록 신호**를 하나 더 요구한다 — ①조(주간·야간·근무) ②쪽이 둘 다
  //      ③«등록·기억» 중 하나. 그리고 서술 어미로 끝나면 등록으로 안 본다(실제 문장은 «야간근무 DJCF 선미 … 선수 …» 다).
  if (!/호기/.test(t)) {
    const _sides = (t.match(/선수|선미/g) || []).length;
    const _sig = /주간|야간|낮|밤|근무|조\b|등록|기억/.test(t) || _sides >= 2;
    if (!_sig) return null;
    //  ⚠ 3.21 재감사 — 어미 그물이 **어간이 문장 맨 끝일 때만** 걸려 «갔어·있어·왔다» 가 전부 빠져나갔고,
    //    거꾸로 «등록해줘·기억해줘» 를 죽였다(게이트가 그 말을 등록 신호로 적어 두고 다음 줄에서 버린 자기모순).
    //    ⇒ **끝말을 본다.** 등록 문장은 «… 선미 김판석»(이름) · «… 김판석 선미»(쪽) · «… 등록해줘» 로 끝난다.
    //    예사말은 «… 갔어»·«… 있어» 처럼 풀이말로 끝난다.
    const _tail = t.replace(/[\s.!?]+$/, '');
    const _lastTok = (_tail.match(/[가-힣A-Za-z0-9]+$/) || [''])[0];
    const _lastName = _lastTok.replace(/^(선수|선미)/, '');   // «선수이종부» 처럼 붙여 쓴 꼴
    const _tailOk = /^(선수|선미)$/.test(_lastTok) || /등록|기억/.test(_tail.slice(-8)) || !!matchStaffName(_lastName, list);
    if (!_tailOk) return null;
  }
  const shift = /야간|밤/.test(t) ? '야간' : /주간|낮/.test(t) ? '주간' : null;
  //  «내일 주간 1호기 김판석» — 내일·모레는 하루·이틀 뒤 그 조(crewShiftKey 가 가장 가까운 조에서 그만큼 미룬다). «오늘»은 가장 가까운 조 그대로.
  const _dw = dateWordOf(t);   // 4.12-02: 어제·그제·엊그제(음수)·낼·글피까지 — 날짜 말 한 벌(dateWordOf)
  const dayOff = _dw ? _dw.off : 0;
  const crew = [], unknown = [];
  let m;
  //  어순 — 문장이 «이름 N호기» 로 시작하면 이름-먼저 꼴(«이인철 1호기 최관식 3호기»), 아니면 «N호기 이름» 꼴.
  //  두 꼴을 섞어 읽으면 «1호기 최관식» 을 잘못 짝짓는다(실측 시뮬).
  const lead = /^\s*(?:미르야?\s*)?(?:주간|야간|낮|밤)?\s*([가-힣]{2,6})\s*(?:은|는|이|가)?\s*\d\s*호기/.exec(t);
  const nameFirst = !!(lead && matchStaffName(lead[1], list));
  if (!nameFirst) {
    //  «1호기 이인철» — 사이에 는/은/에/: 허용
    const re1 = /(\d)\s*호기\s*(?:는|은|에는|에|:)?\s*([가-힣]{2,6})/g;
    while ((m = re1.exec(t)) !== null) {
      const no = +m[1]; if (no < 1 || no > 9) continue;
      const nm = matchStaffName(m[2], list);
      if (nm) crew.push({ no, name: nm }); else unknown.push({ no, tok: m[2].replace(_CREW_JOSA, '') });
    }
  } else {
    const re2 = /([가-힣]{2,6})\s*(?:은|는|이|가)?\s*(\d)\s*호기/g;
    while ((m = re2.exec(t)) !== null) {
      const no = +m[2]; if (no < 1 || no > 9) continue;
      const nm = matchStaffName(m[1], list);
      if (nm) crew.push({ no, name: nm }); else unknown.push({ no, tok: m[1].replace(_CREW_JOSA, '') });
    }
  }
  //  ── 3.21: «선미 김판석 선수 이종부» · «김판석 선미 이종부 선수» ────────────────
  //    검수사 «처음에 호기를 이야기 안한 이유입니다» — 호기 번호는 두 벌이라 흔들리고 선수·선미는 안 흔들린다.
  const needPos = [];
  {
    const seenSide = {};   // 같은 쪽을 두 번 말하면 뒤엣것
    const put = (side, tok) => {
      const nm = matchStaffName(tok, list);
      if (!nm) { unknown.push({ no: 0, tok: String(tok).replace(_CREW_JOSA, '') }); return; }
      seenSide[side] = nm;
    };
    //  어순은 **아는 이름이 몇 번 걸리는지로** 가른다 — «김판석 선미 이종부 선수» 에서 쪽-먼저 그물이
    //    «선미 이종부» 를 물어 김판석이 사라졌다(실측). 호기 꼴의 `nameFirst` 판정은 앞머리(«야간근무»)를
    //    못 넘으므로 같은 방식을 못 쓴다. 두 그물을 다 던져 **많이 건진 쪽**을 쓴다(동수면 쪽-먼저).
    const cast = (re, sideAt, nameAt) => {
      const hit = []; let mm;
      re.lastIndex = 0;
      while ((mm = re.exec(t)) !== null) hit.push({ side: mm[sideAt], tok: mm[nameAt], known: !!matchStaffName(mm[nameAt], list) });
      return hit;
    };
    const A = cast(/(선수|선미)\s*(?:는|은|에는|에|:)?\s*([가-힣]{2,6})/g, 1, 2);   // 쪽-먼저
    const B = cast(/([가-힣]{2,6})\s*(?:은|는|이|가)?\s*(선수|선미)/g, 2, 1);       // 이름-먼저
    //  ⚠ 3.21 재감사 — **호기 그물이 이미 잡은 사람은 쪽 그물에서 뺀다.** «1호기 김판석 선미 이종부» 에서
    //    B 그물이 «김판석 선미» 를 또 물어 **김판석이 1호기와 4호기 둘에 앉았다**(이종부는 통째로 사라졌다).
    const _taken = new Set(crew.map((c) => c.name));
    const _fresh = (h) => { const nm = matchStaffName(h.tok, list); return !(nm && _taken.has(nm)); };
    const A2 = A.filter(_fresh), B2 = B.filter(_fresh);
    const nA = A2.filter((h) => h.known).length, nB = B2.filter((h) => h.known).length;
    //  한쪽이 더 많이 건지면 그쪽(그 안에서는 같은 쪽을 두 번 말하면 뒤엣것 — 종전 규칙). 동수면 **둘을 합친다**
    //    — «선미 김판석 이종부 선수» 에서 이종부가 사라지던 것. ⚠ 합칠 때는 **먼저 잡은 것이 이기고**
    //    (두 그물이 같은 말을 달리 물기 때문이다) **한 사람은 한 쪽만** 차지한다(«선미 김판석 선수» → 김판석 하나).
    const _merged = !(nB > nA) && !(nA > nB);
    const _pick = nB > nA ? B2 : nA > nB ? A2 : A2.concat(B2);
    for (const h of _pick) {
      if (_merged) {
        if (seenSide[h.side]) continue;
        const _nm = matchStaffName(h.tok, list);
        if (_nm && Object.values(seenSide).indexOf(_nm) >= 0) continue;
      }
      put(h.side, h.tok);
    }
    for (const [side, name] of Object.entries(seenSide)) {
      const no = bowStern ? (side === '선수' ? bowStern.bow : bowStern.stern) : 0;
      if (no) crew.push({ no, name, side });          // 유도 성공 — 호기 번호로 등록한다
      else needPos.push({ side, name });              // 못 가림 — 되묻는다(조용히 버리지 않는다)
    }
  }
  if (!crew.length && needPos.length) return { shift, dayOff, dayWord: _dw ? _dw.word : '', crew: [], unknown, needPos };   // 3.21 감사: unknown 을 버리면 «명단에 없어 못 적었어요» 가 영영 안 나온다
  if (!crew.length) return null;   // 아는 이름이 하나도 없으면 등록 문장으로 보지 않는다(«2호기 양하시작» 류)
  const by = {}; crew.forEach((c) => { by[c.no] = c.name; });   // 같은 호기를 두 번 말하면 뒤엣것
  const out = Object.keys(by).map(Number).sort((a, b) => a - b).map((no) => ({ no, name: by[no] }));
  return { shift, dayOff, dayWord: _dw ? _dw.word : '', crew: out, unknown: unknown.filter((u) => !(u.no in by)), needPos };
}

//  ★ 3.8: 등록이 붙는 **조 키** — 키 모양은 갱 수(`gangsShift`)와 같은 벌(shiftGangKey · 「MM-DD 주간|야간」).
//    기준일도 gangKeyFromWords 와 같다 — **지금 조가 시작한 날**. 그 날의 «주간»·«야간» 이다.
//      22:11(09-04 야간) «주간» → 09-04 주간(방금 끝난 조 — 검수사 실측 «주간 1호기 김판석 2호기 송제욱» 은 지난 주간조 이야기였다)
//      12:00(09-05 주간) «야간» → 09-05 야간(오늘 밤) · 07:00(교대 사이 → 다가오는 09-05 주간) «주간» → 09-05 주간
//    ⚠ gangKeyFromWords 의 «야간 중 주간 = 다음 날 주간» 예외만 여기서는 안 쓴다 — 갱 수는 앞으로 할 일이고, 검수원 등록은 지난 조도 적기 때문이다.
//    «내일·모레» 는 기준일에서 하루·이틀 뒤. 조를 안 대면 지금 조(교대 사이면 다가오는 조 — currentShift 그대로). 반환 { key, startMs }.
export function crewShiftKey(shiftWord, nowMs = Date.now(), dayOff = 0) {
  const cur = currentShift(nowMs);
  const off = Number(dayOff) || 0;
  const name = shiftWord === '야간' ? '야간조' : shiftWord === '주간' ? '주간조' : cur.name;
  const base = new Date(cur.startMs || nowMs);
  base.setHours(12, 0, 0, 0);
  if (off) base.setDate(base.getDate() + off);
  const at = (h, m) => { const x = new Date(base); x.setHours(h, m, 0, 0); return x.getTime(); };
  const sh = name === '야간조'
    ? { name, startMs: at(19, 0), endMs: at(6, 30) + 86400000 }
    : { name, startMs: at(8, 0), endMs: at(17, 30) };
  return { key: shiftGangKey(sh), startMs: sh.startMs, endMs: sh.endMs };
}

//  ★ 4.17 (검수사 §7.8-③ «모든걸 알수 있으면 도움이 됨») — **완료 시각 → 그 조 키**(「MM-DD 주간|야간」 — shiftGangKey 모양) 한 벌.
//    근무일 기준이다(§4.2-F-2) — 야간은 시작한 날(00:00~06:29 는 전날 야간), 교대 사이 06:30~08:00 은 그날 주간 · 17:30~19:00 은 그날 야간(currentShift 의 «다가오는 조»).
//    말로 가리킨 조(crewShiftKey)와 키 모양이 같아 «어제 야간»이 그대로 맞물린다. 시각이 없으면 '' — 날짜·조로 못 가른다.
export function shiftKeyOfMs(ms) {
  const t = Number(ms);
  return t > 0 && isFinite(t) ? shiftGangKey(currentShift(t)) : '';
}
//  ★ 4.17 (§7.8-③) — 지난 날 말(«그제»·«어제 야간»)이 가리키는 조 키들. 조를 대면 그 조 하나, 안 대면 그 날 주간·야간 둘 — crewShiftKey 한 벌(근무일 기준).
export function dayShiftKeys(dayOff, shiftWord = null, nowMs = Date.now()) {
  const sh = (shiftWord === '야간' || shiftWord === '주간') ? [shiftWord] : ['주간', '야간'];
  return sh.map((w) => crewShiftKey(w, nowMs, Number(dayOff) || 0).key);
}
//  ★ 4.17 (§7.8-③) — 그 조 키들에 든 **완료 기록**(항차 {양하|선적}.completed 의 at) 대수. 누락 표식(flag missing)은 한 일이 아니라 세지 않는다(별첨 완료와 같은 셈).
//    완료 시각이 없는 기록은 날짜·조로 못 가르니 noAt 로 따로 센다 — 조용히 빼지 않는다(§4.2-F-3 과 같은 태도). byKey = 키별 { discharge, loading }.
//    keys 를 안 주면(null) 키별로 모두 센다(그 항차에 완료 기록이 있는 조 목록).
export function doneOnShiftKeys(voyage, keys = null) {
  const ks = keys ? new Set(keys) : null;
  const out = { discharge: 0, loading: 0, n: 0, noAt: 0, byKey: {} };
  for (const m of ['discharge', 'loading']) {
    const comp = (voyage && voyage[m] && voyage[m].completed) || {};
    for (const r of Object.values(comp)) {
      if (!r) continue;
      if (typeof r === 'object' && r.flag === 'missing') continue;
      const k = typeof r === 'object' ? shiftKeyOfMs(r.at) : '';
      if (!k) { out.noAt += 1; continue; }
      if (ks && !ks.has(k)) continue;
      out[m] += 1; out.n += 1;
      const b = out.byKey[k] || (out.byKey[k] = { discharge: 0, loading: 0 });
      b[m] += 1;
    }
  }
  return out;
}

//  ★ 4.17 (검수사 §7.8-⑧ «2») — **없는 선박코드 → 가장 가까운 코드** 한 벌. 미르(질문을 고쳐 답하고 «OBWH 로 답했어요» 한 줄)·
//    질문 속 배 고르기(mir.pickShipCtx — 홈 통합검색·떠 있는 미르)·콘앱 배 옮기기(planCommand.pickVoyageKey)가 이것만 부른다.
//    거리 = 글자 바꿈·넣기·빼기·이웃 자리바꿈(OWBH↔OBWH · TNPJ↔TNJP) 한 번이 1. 1~2 안에서 가장 가까운 코드가 하나면 그것,
//    같은 거리에 둘 이상이면 ambiguous(그때만 «OBWH·OBWF 중 어느 배요?» 로 되묻는다). 아는 코드 그대로면 dist 0.
//    배 코드는 영문 네 글자다. 선사·부두·화물·흔한 영문 낱말(SITC·PCTC·XRAY·DECK·TWIN …)은 배 코드로 보지 않는다 — 거리 2 안에 배 코드가 있어도(SITC↔STTC 1 · PCTC↔PCTJ 1 · DECK↔DJCT 2) 고치지 않는다.
//    질문에서 고를 때는 shipCodeFixOf 한 벌을 거친다(대문자로 친 낱말만 거리 2·되묻기 — 아래).
export const NOT_SHIP_CODE = new Set([
  'PCTC', 'PNCT', 'KMTC', 'SITC', 'SNKO', 'DJSC', 'NSSL', 'HASL', 'HSLI', 'JEON', 'DWIC', 'EASK', 'TJMS', 'WDFC', 'SCLK', 'OOCL', 'MAEU', 'CMDU', 'HLCU', 'COSU', 'EGLV', 'ONEY', 'YMLU', 'SMLM',
  'XRAY', 'IMDG', 'TANK', 'FLAT', 'RACK', 'OPEN', 'HIGH', 'CUBE', 'REEF', 'FULL', 'DECK', 'HOLD', 'TEMP', 'SEAL', 'LIST', 'PLAN', 'DATA', 'MAIL', 'TEST', 'BOOK', 'SLOT', 'CODE', 'NAME', 'TIER', 'BAYS',
  'LOAD', 'CREW', 'GANG', 'TIME', 'DONE', 'LEFT', 'WORK', 'SHIP', 'PORT', 'BULK', 'SIZE', 'TYPE', 'ROWS', 'EDIS', 'FILE', 'SHOW', 'HELP', 'STOP', 'NEXT', 'BACK', 'OKAY', 'YARD', 'GATE', 'CALL',
  'TWIN', 'SWAP', 'CNTR', 'LASH', 'INFO', 'VOID', 'CONS', 'CONE', 'DISC', 'SAFE', 'SAVE', 'SEND', 'PASS', 'CATO', 'LOLO', 'RORO', 'MOVE', 'PAIR', 'AREA', 'ZONE', 'MENU', 'USER',
  'STAR', 'DCHC', 'RFHC', 'OTHC', 'FRHC', 'TKHC', 'USDA', 'BARE', 'REST', 'POST', 'POSN', 'NSEW', 'KEYS', 'PAST', 'DENT', 'RTGC', 'SIDE', 'TASK', 'CATS', 'HTTP',   // 앱 글(지식·매뉴얼·검색)에 나오는 네 글자 낱말 중 배 코드와 거리 2 안인 것(4.17 실측)
]);
//  거리는 컨번호 오타 짝(listTypoTwins)이 쓰는 _osaDist 한 벌(바꿈·넣음·뺌 1, 이웃 자리 바뀜 1).
const _SHIP4 = /^[A-Z]{4}$/;
export function nearestShipCode(token, codes, maxDist = 2) {
  const t = String(token || '').trim().toUpperCase();
  if (!_SHIP4.test(t) || NOT_SHIP_CODE.has(t)) return null;
  const list = [...new Set([...(codes || [])].map((c) => String(c || '').trim().toUpperCase()).filter((c) => _SHIP4.test(c)))];
  if (list.includes(t)) return { code: t, dist: 0, ambiguous: null };
  if (/^[A-Z]{3}U$/.test(t)) return null;   // 컨 소유자 코드(ISO 6346 — 끝 U, «CICU»·«TGHU») — 컨번호를 치는 중이다, 배 코드로 고치지 않는다
  let best = 3, hits = [];
  for (const c of list) {
    const d = _osaDist(t, c);
    if (d < best) { best = d; hits = [c]; } else if (d === best) hits.push(c);
  }
  if (best > Math.min(2, maxDist) || !hits.length) return null;
  return hits.length === 1 ? { code: hits[0], dist: best, ambiguous: null } : { code: null, dist: best, ambiguous: hits.sort() };
}
//  ★ 4.17 (§7.8-⑧) — **질문 속 배 코드 꼴 낱말 → 고칠 코드** 한 벌(미르 답·pickShipCtx·pickVoyageKey 가 이것만 부른다). 컨번호(영문 4 + 숫자 7)의 앞 네 글자는 낱말이 아니다.
//    대문자로 친 낱말(«OWBH»)은 거리 1~2, 같은 거리에 둘 이상이면 ambiguous(그때만 되묻는다). 소문자·섞어 친 낱말은 거리 1 까지만 고치고 되묻지 않는다 —
//    흔한 영문 낱말(«swap»→SWAL·SWAT·SWCP·SWSP · «haha»→HAHM · «kakao»)이 배 코드 되묻기로 답을 가로채지 않게(클로드 문지기 — 검수사 확정 필요).
//    ★ 옛 코드가 먼저다(Fable 판정 2026-10-09) — 거리를 재기 전에 별칭 표(shipCodeAliasMap — 베이사전 prevCode)를 본다. 별칭이면 그 정본 코드로
//      바로 고치고(alias 에 옛 코드), 거리로는 재지 않는다 — «RZSY»(SMYA 의 옛 코드)가 거리 2 의 RZOR 로 가던 것.
//    반환 { fixes:[{ raw(친 그대로), code, dist, alias(옛 코드 — 별칭일 때만) }], ambiguous:[코드…]|null, hits:[정확한 코드까지 — 친 차례대로] }.
export function shipCodeFixOf(text, codes, aliases = shipCodeAliasMap()) {
  const out = { fixes: [], ambiguous: null, hits: [] };
  const re = /(?:^|[^A-Za-z0-9])([A-Za-z]{4})(?![A-Za-z0-9])/g;
  const s = String(text || '');
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1], up = raw === raw.toUpperCase();
    const al = aliases && aliases[raw.toUpperCase()];
    if (al && al !== raw.toUpperCase()) { const f = { raw, code: al, dist: 0, alias: raw.toUpperCase() }; out.fixes.push(f); out.hits.push(f); continue; }
    const nc = nearestShipCode(raw, codes, up ? 2 : 1);
    if (!nc) continue;
    if (nc.dist === 0) { out.hits.push({ raw, code: nc.code, dist: 0 }); continue; }
    if (nc.ambiguous) { if (up && !out.ambiguous) out.ambiguous = nc.ambiguous; continue; }
    const f = { raw, code: nc.code, dist: nc.dist };
    out.fixes.push(f); out.hits.push(f);
  }
  return out;
}
//  ★ 4.18-01 (ConeOne 2.69) — 질문이 가리키는 배 코드 하나(정확한 코드 · 고칠 수 있는 코드 · 옛 코드 — 처음 나온 것). shipCodeFixOf 한 벌 위에 얹었다.
//    콘앱 미르가 «지금 고른 배와 다른 배를 물었나»를 가릴 때 쓴다(cone.html mirShipFirst — 판정 사본을 콘앱에 두지 않는다). 없으면 null, 같은 거리 둘 이상이면 { ambiguous }.
export function shipCodeInQuery(text, codes, aliases = shipCodeAliasMap()) {
  const fx = shipCodeFixOf(text, codes, aliases);
  if (fx.hits.length) return fx.hits[0];
  return fx.ambiguous ? { ambiguous: fx.ambiguous } : null;
}
//  ★ 4.17 (Fable 판정) — **옛 선박코드 → 지금 코드** 별칭 표. 베이사전 항목의 prevCode(SMYA ← RZSY · HABK ← ABAN — 코드를 바꿀 때 남긴 옛 코드)를 읽는다.
//    V8.43 SHIP_KEY_ALIAS 는 코드 → ships 노드 키(IMO·콜사인) 표라 옛 코드가 없다(RZSY 0건). 콤마·공백으로 여럿을 적었어도 받는다. 영문 네 글자만.
export function shipCodeAliasMap(dict = null) {
  const out = {};
  try {
    const d = dict || ((typeof window !== 'undefined' && window.__fbShipBayDict) || null);
    if (!d || typeof d !== 'object') return out;
    for (const k of Object.keys(d)) {
      const e = d[k]; if (!e || typeof e !== 'object' || !e.prevCode) continue;
      const cur = String(e.code || k).trim().toUpperCase(); if (!_SHIP4.test(cur)) continue;
      for (const pc of String(e.prevCode).toUpperCase().split(/[\s,·\/]+/)) if (_SHIP4.test(pc) && pc !== cur) out[pc] = cur;
    }
  } catch (e) { /* 사전이 없으면 별칭 없음 */ }
  return out;
}
//  아는 배 코드 — 활성 항차(info.vsl)·베이사전(키·code)·선박 라이브러리(ships 키·그 아래 항차 키 앞머리). 영문 네 글자만.
export function knownShipCodes(voyages = null, shipLib = null) {
  const s = new Set();
  const add = (x) => { const k = String(x || '').trim().toUpperCase(); if (_SHIP4.test(k)) s.add(k); };
  for (const v of Object.values(voyages || {})) add(v && v.info && v.info.vsl);
  try {
    const d = (typeof window !== 'undefined' && window.__fbShipBayDict) || null;
    if (d && typeof d === 'object') for (const k of Object.keys(d)) { add(k); add(d[k] && d[k].code); }
  } catch (e) { /* 사전이 없으면 항차 코드만 */ }
  if (shipLib && typeof shipLib === 'object') {
    for (const k of Object.keys(shipLib)) { add(k); const vs = shipLib[k] && shipLib[k].voyages; if (vs && typeof vs === 'object') for (const vk of Object.keys(vs)) add(String(vk).split('_')[0]); }
  }
  return [...s];
}

//  ★ 3.8: 받침에 따라 조사 한 벌 — koJosa('최관식', '으로') → «최관식으로» · koJosa('박진우', '으로') → «박진우로».
//    쌍: 은/는 · 이/가 · 을/를 · 으로/로 · 과/와 · 이에요/예요. 한글이 아니면 뒤쪽(받침 없음)으로.
const _JOSA_PAIRS = { '은': ['은', '는'], '는': ['은', '는'], '이': ['이', '가'], '가': ['이', '가'], '을': ['을', '를'], '를': ['을', '를'], '으로': ['으로', '로'], '로': ['으로', '로'], '과': ['과', '와'], '와': ['과', '와'], '이에요': ['이에요', '예요'], '예요': ['이에요', '예요'] };
export function koJosa(word, josa) {
  const w = String(word || ''); const pair = _JOSA_PAIRS[josa];
  if (!pair) return w + josa;
  const c = w.codePointAt(w.length - 1) || 0;
  const bat = (c >= 0xAC00 && c <= 0xD7A3) ? ((c - 0xAC00) % 28) > 0 : false;
  //  «으로/로» 는 ㄹ 받침이면 «로»
  if (josa === '으로' || josa === '로') return w + ((bat && ((c - 0xAC00) % 28) !== 8) ? '으로' : '로');
  return w + (bat ? pair[0] : pair[1]);
}

//  ★ 3.8: 항차에 기억된 호기–검수원을 시각 순으로 편다.
//    저장 모양 `info.craneCrew/{MM-DD 주간|야간}/{N호기} = { name, at }` (`at` = 등록 시각 — 연도를 여기서 얻는다).
//    반환 [{ key, startMs, cranes:{ [no]: name } }] · 조 시작 오름차순.
export function craneCrewOf(info) {
  const cc = info && info.craneCrew;
  if (!cc || typeof cc !== 'object') return [];
  const out = [];
  for (const key of Object.keys(cc)) {
    const m = /^(\d{2})-(\d{2})\s*(주간|야간)$/.exec(String(key).trim());
    const ent = cc[key]; if (!m || !ent || typeof ent !== 'object') continue;
    const cranes = {}; let regAt = 0;
    for (const ck of Object.keys(ent)) {
      const cm = /^(\d)\s*호기$/.exec(String(ck).trim()); const v = ent[ck];
      if (!cm || !v) continue;
      const nm = typeof v === 'string' ? v : String(v.name || '').trim();
      if (!nm) continue;
      cranes[+cm[1]] = nm;
      const a = Number(typeof v === 'object' && v.at) || 0; if (a > regAt) regAt = a;
    }
    if (!Object.keys(cranes).length) continue;
    //  연도 — 등록 시각의 해. 등록이 12월 말이고 조가 1월 초면 한 해 어긋날 수 있어 가까운 쪽을 고른다.
    const base = regAt ? new Date(regAt) : new Date();
    let best = null;
    for (const dy of [-1, 0, 1]) {
      const d = new Date(base.getFullYear() + dy, +m[1] - 1, +m[2], m[3] === '야간' ? 19 : 8, 0, 0, 0);
      if (!best || Math.abs(d.getTime() - base.getTime()) < Math.abs(best - base.getTime())) best = d.getTime();
    }
    out.push({ key, startMs: best, cranes, regAt });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

//  ★ 3.8: **호기별·검수원별 작업량 한 벌** — 화면·미르가 같은 값을 본다(판정 두 벌 금지).
//    규칙 — 등록된 조의 시작 시각부터 **다음 등록 조의 시작까지**가 그 사람 구간(첫 등록 조보다 이른 작업은 첫 조에).
//      ① 카토스 배: `termWork/{cn}.equip`(GC10x)+`at` 로 컨별로 센다. 앱 완료(`completed`)의 `equip`·`by` 도 합친다(컨번호로 중복 제거).
//         등록이 없어도 앱 완료의 `by` 가 검수원 이름이면 그 사람 것으로 센다(터미널 표기 TERM_APPLY_BY 는 사람이 아니다).
//      ② 동방 배: 컨별 호기가 안 온다 — `info.qcWork` 의 QC 합계로 호기별만 센다(조별로 못 나눔 · 자리 없음).
//    반환 { shifts, rows:[{key,no,name,dis,lod,n,firstAt,lastAt,lastPos,src}], byName, byCrane, registered, qcOnly }
//  ★ 3.9: **조 구간 한 벌** — 등록된 조의 시작부터 다음 등록 조의 시작까지(없으면 그 조의 자연 끝). crewWorkStats 와
//    X-RAY 봉인자(xraySealerOf)가 같은 구간을 본다. 검수사 확정 2026-09-05 *«조등록이 그때 근무자입니다»*.
//  구간 끝 — 다음 등록 조의 시작, 없으면 **그 조의 자연 끝**(주간 → 그날 19:00 야간 시작 · 야간 → 익일 08:00 주간 시작).
//  다음 조 등록이 없다고 그 뒤 작업까지 앞 조 사람 몫으로 세면 안 된다(3.8 감사 실측 SWTD 9012E — 589무브가 27시간 뒤까지 야간조 몫이 됐다).
//  카페리(주야 구분 없음 — OBWH·RZOR·SMYA)는 한 조가 끝까지 하므로 다음 등록까지다.
export function crewSegments(info) {
  const shifts = craneCrewOf(info || {});
  const noShift = !shipHasShifts(info && info.vsl);
  const natEnd = (sg) => (/야간$/.test(sg.key) ? sg.startMs + 13 * 3600000 : sg.startMs + 11 * 3600000);
  return shifts.map((s, i) => ({ ...s, endMs: Math.min(shifts[i + 1] ? shifts[i + 1].startMs : Infinity, noShift ? Infinity : natEnd(s)) }));
}
//  호기 번호 — 앱 «4호기»·카토스 «GC104»·동방 «QC103» 전부 **끝자리 한 숫자**다(computeTermApply 의 GC10x→x호기 와 같은 뜻).
export function crewCraneNo(e) { const m = /(\d)\s*(?:호기)?$/.exec(String(e || '').trim()); return m ? +m[1] : 0; }
//  4.77: 크레인 호기(1~4)만 갱이다. 5호기 자리(QC105 = 105호기, RORO 램프)는 RAMP_NO — 상황판은 «램프(105)» 별도 줄로 그리고 갱 수·멈춘 호기·베이 짝짓기에는 넣지 않는다.
//    (검수원이 램프에서 «5호기» 로 보고하는 17시·주야간 보고는 종전 그대로 5호기 갱으로 읽는다 — crewCraneNo 는 안 바꿨다.)
export const RAMP_NO = 5;
export const isCraneNo = (no) => no > 0 && no < RAMP_NO;
export const isRampQcKey = (k, q) => /(?:^|\D)105$/.test(String((q && q.qc) || k || ''));   // 동방 호기 표 칸이 램프(QC105)인가
//  첫 등록 조보다 이른 작업(등록 전에 시작한 것)은 첫 조에 — 그 뒤 창 밖은 «조 미상»(null)
export function crewSegmentAt(segs, at) {
  return segs.find((s) => at >= s.startMs && at < s.endMs) || (segs.length && at < segs[0].startMs ? segs[0] : null);
}
//  ★ 3.9: «그 시각·그 호기의 근무자» — 등록이 없으면 ''. X-RAY 봉인자·통계가 같은 답을 낸다.
export function crewNameAt(info, at, equip) {
  const no = crewCraneNo(equip); if (!no || !at) return '';
  const seg = crewSegmentAt(crewSegments(info), Number(at) || 0);
  return (seg && seg.cranes[no]) || '';
}

//  ★ 3.10: **호기별 «지금 작업 베이» 한 벌** — 실시간 작업 보드 오른쪽 칸. 검수사 2026-09-05 *«지금 작업하는 선박의 2갱이 작업하는
//    베이가 보이도록 … 2갱이면 1호기 작업베이 2호기 작업배이 그런식으로»*. 재료 셋을 호기 번호로 합친다.
//    ① 터미널 실적 `termWork/{cn}`(equip GC10x · pos BBRRTT · at) — 호기마다 가장 늦은 컨의 자리가 «지금 베이», 그 호기 대수.
//    ② 앱 완료 `completed/{cn}`(equip «N호기» · at · by) — termWork 에 없는 컨만 더한다(같은 컨 두 번 안 셈). 자리는 records 실적(bay_actual).
//    ③ 앱에 붙어 있는 검수원(`workers` — equip·bay·tier·mode, 90초) — 있으면 그 사람 이름과 지금 베이가 **가장 최신**이다.
//    이름은 사람이 앱으로 찍은 by → 접속 검수원 → 조 등록(crewNameAt) 순. 동방(호기가 어디에도 없음)은 `info.qcWork` 로 호기별 대수만(자리 없음).
//    반환 [{ no, name, mode, bay, row, tier, cn, done, dis, lod, lastAt, src:'term'|'app'|'live'|'qc' }] · 호기 번호 오름차순.
// ── TallyOne 3.21: 「선수·선미」를 호기 번호로 바꾼다 ─────────────────────────────
//  왜 — 검수사 2026-09-06 «저도 실체를 안보고 경험으로 봐서 그렇습니다. 그래서 **선미 선수로만**
//    이야기 했던거고요» · «**처음에 호기를 이야기 안한 이유입니다**». 현장이 부르는 호기 번호와
//    터미널이 쓰는 안벽 크레인 번호가 **두 벌**이라 번호는 흔들리는데, 선수·선미는 안 흔들린다.
//    실측 2026-09-06 야간 — 검수사가 DJCF 를 «1·2호기», MCAP 을 «3·4호기» 라 부르셨는데 실제로
//    도는 것은 DJCF 가 GC103·GC104, MCAP 이 GC101·GC102 였다(정확히 역순). 그런데 같은 분이 처음
//    하신 말 «선미 김판석 선수 이종부» 는 실적과 **한 대도 안 틀렸다.**
//  어떻게 — 검수사 «양하작업이 어떻게 이뤄졌는지 보면 어디가 선수 선미인지 압니다».
//    베이 번호가 곧 선수–선미 축이다(작은 번호 = 선수쪽 · 큰 번호 = 선미쪽 — cargoPlanCore 머리말).
//    호기마다 찍은 베이의 **가운데값**을 재서 작은 쪽이 선수다.
//    ⚠ 평균이 아니라 가운데값이다 — 한 대가 남의 베이를 도우러 가면 평균이 그쪽으로 끌려간다
//      (실측 DJCF GC103 이 10~31 에 걸쳐 있는데 대부분은 22 언저리다).
//  ⛔ 확신이 없으면 **아무것도 내지 않는다**(null) — 화면이 되묻는다. 지어내지 않는다.
//    ①호기가 둘 이상 ②호기마다 최소 MIN 대 ③가운데값이 서로 달라야 한다.
//  3.21: crewSet 의 «선수·선미» 를 그 배의 실적으로 호기 번호로 바꾼다 — **판정 한 벌**(§4-4).
//    저장하는 자리가 넷이라(검색 패널·항차 화면 둘·전체 검색) 각자 유도하면 갈린다.
//    못 가리면 needPos 를 그대로 돌려준다 — 부르는 쪽이 되묻고, 조용히 버리지 않는다.
export function resolveCrewSides(cs, voyage) {
  if (!cs || !Array.isArray(cs.needPos) || !cs.needPos.length) return cs;
  //  두 번째 인자는 항차이거나, 상위에서 이미 구해 둔 `{bow, stern}` 이다 — 컴포넌트가 항차를 통째로
  //    안 받는 화면(LoloTab 등)이 있어 상위가 한 번 구해 내려보낸다(빌드 스코프 검사가 잡았다).
  let bs = null;
  try { bs = (voyage && typeof voyage.bow === 'number' && typeof voyage.stern === 'number') ? voyage : craneBowSternOf(voyage); }
  catch (e) { console.warn('[3.21] 선수·선미 유도 실패', e); }
  if (!bs) return cs;
  const crew = Array.isArray(cs.crew) ? cs.crew.slice() : [];
  const by = {}; crew.forEach((c) => { by[c.no] = c.name; });
  for (const q of cs.needPos) {
    const no = q.side === '선수' ? bs.bow : bs.stern;
    if (no) by[no] = q.name;
  }
  const out = Object.keys(by).map(Number).sort((a, b) => a - b).map((no) => ({ no, name: by[no] }));
  return { ...cs, crew: out, needPos: [], _sideFrom: bs };
}

export function craneBowSternOf(voyage, minPerCrane = 3) {
  const bays = {};   // 호기 → 베이 번호 목록
  const push = (no, bay) => { const n = parseInt(bay, 10); if (no && n > 0) (bays[no] || (bays[no] = [])).push(n); };
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    const recs = sec.records || {};
    const seen = new Set();
    for (const [cn, r] of Object.entries(sec.termWork || {})) {
      if (!r || !r.at) continue;                       // 실은 것만(Booking 제외 — computeTermApply 와 같은 게이트)
      const no = crewCraneNo(r.equip); if (!no) continue;
      const p = parseCatosPos(r.pos); if (!p) continue;
      push(no, p.bay); seen.add(cn);
    }
    //  앱으로 직접 찍은 완료도 같이 센다 — 터미널 자리가 안 오는 배(동방)에서는 이쪽뿐이다.
    for (const [cn, r] of Object.entries(sec.completed || {})) {
      if (!r || !r.at || seen.has(cn)) continue;
      const no = crewCraneNo(r.equip); if (!no) continue;
      const rec = recs[cn] || {};
      push(no, rec.bay_actual || rec.bay || ((sec.ediContainers || {})[cn] || {}).bay || '');
    }
  }
  const nos = Object.keys(bays).map(Number).filter((no) => bays[no].length >= minPerCrane);
  if (nos.length < 2) return null;
  const mid = (a) => { const v = a.slice().sort((x, y) => x - y); const h = v.length >> 1; return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2; };
  const byNo = {}; nos.forEach((no) => { byNo[no] = mid(bays[no]); });
  const sorted = nos.slice().sort((a, b) => byNo[a] - byNo[b]);
  const bow = sorted[0], stern = sorted[sorted.length - 1];
  if (byNo[bow] === byNo[stern]) return null;          // 가운데값이 같으면 못 가른다
  return { bow, stern, byNo, n: nos.reduce((s, no) => s + bays[no].length, 0) };
}

//  ★ 3.38: **컨별 호기가 안 오는 터미널(동방 PNCT)에서 호기와 베이를 잇는다.**
//    검수사 확정 2026-09-09 — *«동시간대 컨이 두대가 양하가 되었는데 하나는 02베이 하나는 10번베이라면
//    1호기 2번베이 2호기 10번 베이라는 이야기입니다»* · *«선수로 표기 하는게 아니고 1호기 표기 입니다.
//    제가 선수 선미를 알려주는것은 위치구분을 해주는것입니다»*.
//    뿌리 — 동방 termWork 는 컨번호·자리(pos)·시각·중량까지 주는데 `equip`(호기)만 없다(실측 OBWH 2735E 52건 전부).
//    그래서 craneBoardOf 의 termWork 갈래가 `crewCraneNo(r.equip)` 에서 통째로 건너뛰고, 수석 보드가
//    «호기별 자리가 안 와 베이로 묶었습니다» 로 떨어졌다.
//    푸는 법 — **크레인 하나는 같은 시각에 두 베이를 못 한다.** 같은 시각에 함께 찍힌 베이는 서로 다른 호기이고,
//    어느 장이 어느 호기인지는 안벽 순서 × 접안 방향으로 정한다(3.53-09 pairCranesForGroups — 종전 «선수부터 오름차순»은 폐기). 호기 번호는 QC 목록에서 가져오므로 3·4호기 배도 된다.
//    실측 OBWH 2735E — 1호기 02·03·06 = 24대(QC101 완료 24) · 2호기 10·14 = 28대(QC102 완료 28), 짝 없는 베이 0.
//    ⚠ 짝이 한 번도 안 생긴 베이는 **붙이지 않는다**(조용히 찍지 않는다 — 규범 §4-3).
//  ★ 3.53-07 — **호기와 장(그룹)을 «대수»로 짝짓는다.** «선수(작은 베이) = 작은 호기 번호» 가정이 틀린 배가 있다.
//    검수사 실물 2026-09-19 KKAK 2609N — «그림을 보면 내린 양하화면과 호기별 양하 대수가 바뀜현상».
//    QC101(1호기) 양하 7 · QC103(3호기) 양하 9 인데 termWork 는 26번 장 9대 · 38번 장 7대 — 3호기가 선수(26)였다(사본 채취 12:2x).
//    종전 규칙(오름차순 인덱스)은 1호기→26, 3호기→38 로 붙여 카드 머리(QC 대수)와 그림(장 완료)이 서로 바뀌어 보였다.
//    3.21 주석이 «호기 번호가 역순인 실측»(DJCF)을 이미 적어 뒀다 — 가정이 아니라 자료로 정한다.
//    풀이 — 그룹별 대수(그 장에 찍힌 터미널 실적 수)와 호기별 QC 완료(양+선)를 **모든 짝(순열)으로 견줘 차이 합이
//    가장 작은 짝**을 고른다. 최솟값이 둘 이상이면(자료가 못 가르면) 종전 오름차순으로 둔다(조용히 새 규칙을 밀지 않는다).
//    반환 — groups 순서대로의 호기 번호 배열. (검수앱 craneBaysByTime · 해치 자동 판정 두 곳이 같은 것을 부른다 — 한 벌.)
export function pairCranesByCount(nos, groupCounts, doneByNo) {
  const n = nos.length;
  const asc = nos.slice();
  if (!doneByNo || n < 2 || n > 5 || !groupCounts || groupCounts.length !== n) return asc;
  if (!nos.some((no) => (doneByNo[no] || 0) > 0)) return asc;
  const perms = [];
  const rec = (rest, acc) => { if (!rest.length) { perms.push(acc); return; } rest.forEach((x, i) => rec(rest.filter((_, j) => j !== i), acc.concat(x))); };
  rec(nos, []);
  const cost = (perm) => perm.reduce((a, no, i) => a + Math.abs((groupCounts[i] || 0) - (doneByNo[no] || 0)), 0);
  const scored = perms.map((perm) => [cost(perm), perm]).sort((a, b) => a[0] - b[0]);
  if (scored.length > 1 && scored[0][0] === scored[1][0]) return asc;   // 못 가름 — 종전 규칙
  return scored[0][1];
}
//  ★ 3.53-09 — **호기 배치는 안벽 순서 × 접안 방향으로 정한다**(검수사 확정 2026-09-06, 메모 quay-crane-order-and-bow).
//    «바다를 바라보고 좌측부터 PCTC 1-2-3-4호기, PNCT(동방) 4-2-1-3호기» — 동방은 호기 번호가 안벽 순서와 **다르다**.
//    «우현접안이므로 3호기가 선수 1호기가 선미»({1,3} 중 우측이 3) · «4호기 2호기 작업이면 선수가 2호기 선미가 4호기»({4,2} 중 우측이 2)
//    ⇒ **선수 = 바다를 바라본 우측**(우현접안), 좌현접안이면 좌측. «동방은 보통 우현, RZOR 만 좌현» — 그래도 `info.berthSide` 를 먼저 읽는다.
//    검수사 2026-09-19 «뭔가 이상합니다» — 3.53-07·08 은 대수 추정으로 짝을 맞추려 했고, «선수=작은 번호» 가정(3.38)도 이 순서를 몰랐다.
//    보관 항차 실측 — OBWH 2735E(우현 {1,2}: 1호기 선수) · KKLC 2608N(우현 {1,2}: 1호기 25·27) · DXQD 2636E(우현 {2,4}: 2호기 선수) ·
//      KKAK 2609N(우현 {1,3}: 3호기 선수) 전부 이 규칙 하나로 맞는다(대수 규칙은 KKAK 만 맞고 나머지를 뒤집었다).
//    순서 — ① 안벽 순서 × 접안 방향(둘 다 알 때) ② 모르면 대수(pairCranesByCount) ③ 그것도 못 가르면 오름차순.
//    groups 는 베이 오름차순(선수→선미)이어야 한다 — 두 호출부(craneBaysByTime·hatchEventsOf) 모두 그렇게 정렬해 넘긴다.
//    RZOR(LO/LO 3호기·RO/RO 5호기)은 5호기가 안벽 순서에 없어 ①을 못 쓰고 ②③으로 흐른다 — «호기를 유도하지 말고 그대로»(검수사).
export const QUAY_CRANE_ORDER = { PNCT: [4, 2, 1, 3], PCTC: [1, 2, 3, 4] };   // 바다를 바라보고 좌 → 우
const _pairWarned = new Set();
//  ★ 3.63 — 안벽 순서 × 접안 방향으로 정한 **선수 → 선미 호기 순서**(규칙 ①만). 둘 다 알고 호기가 전부 안벽 순서에 있을 때만, 아니면 null.
//    pairCranesForGroups ①과 17시 갱별 보고(buildGangShiftReport — 남은 컨을 선수부터 나눈다)가 같은 답을 본다.
//    RZOR 5호기(RO/RO)처럼 안벽 순서에 없는 호기가 끼면 null — «호기를 유도하지 말고 그대로»(검수사).
export function quayOrderOf(voyage, nos) {
  const info = (voyage && voyage.info) || {};
  const side = berthSideOf(info);
  const pier = String(info.pier || getPierFromBerth(info.berth) || '').toUpperCase();   // planWorkStart 와 같은 보정(한 벌)
  const order = QUAY_CRANE_ORDER[pier];
  if (!(nos && nos.length >= 2) || !side || !order || !nos.every((n) => order.includes(n))) return null;
  const byQuay = nos.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));   // 좌 → 우
  return side === 'starboard' ? byQuay.reverse() : byQuay;                          // 우현 = 우측이 선수(작은 베이)
}
export function pairCranesForGroups(voyage, nos, groupCounts) {
  const info = (voyage && voyage.info) || {};
  const side = berthSideOf(info);
  const pier = String(info.pier || getPierFromBerth(info.berth) || '').toUpperCase();   // planWorkStart 와 같은 보정(한 벌)
  const _q = quayOrderOf(voyage, nos);
  if (_q && groupCounts && groupCounts.length === nos.length) return _q;
  const _wk = `${side}|${pier}|${nos.join(',')}`;   // 같은 사정은 한 번만 알린다(분 단위 바구니마다 찍히면 콘솔 소음 — 재감사)
  if (nos.length >= 2 && !_pairWarned.has(_wk)) { _pairWarned.add(_wk); console.warn('[3.53-09] 안벽 순서로 호기를 못 붙여 대수 규칙으로 —', { side, pier, nos }); }
  return pairCranesByCount(nos, groupCounts, craneDoneByNo(voyage));
}
export const craneDoneByNo = (voyage) => {
  const out = {};
  for (const q of Object.values((voyage && voyage.info && voyage.info.qcWork) || {})) {
    const no = crewCraneNo(q && q.qc); if (!no) continue;
    out[no] = (out[no] || 0) + (Number(q.disDone) || 0) + (Number(q.lodDone) || 0);
  }
  return out;
};

export function craneBaysByTime(voyage, craneNos = null) {
  const out = { byBay: {}, byNo: {}, pairs: 0, skipped: 0, at: 0, why: '' };
  //  4.77: 램프(QC105 → 5호기 자리)는 베이를 옮겨 다니는 크레인이 아니라 호기 목록 [3,5] 에 넣지 않는다.
  const nos = (craneNos && craneNos.length ? craneNos.filter(isCraneNo) : Object.entries((voyage && voyage.info && voyage.info.qcWork) || {})
    .filter(([k, q]) => !isRampQcKey(k, q)).map(([, q]) => crewCraneNo(q && q.qc)).filter(isCraneNo)).sort((a, b) => a - b);
  if (nos.length < 2) { out.why = '호기가 하나뿐'; return out; }
  const at2bays = new Map();                             // 시각 → 베이 → { mode, cn, row, tier }
  const bayCount = {};                                   // 3.53-07: 베이별 실적 수(양·선 합, 같은 초 겹침도 그대로 센다 — hatchEventsOf 와 같은 셈)
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    for (const [cn, r] of Object.entries(sec.termWork || {})) {
      if (!r || !r.at) continue;
      const p = parseCatosPos(r.pos); if (!p || !p.bay) continue;
      bayCount[p.bay] = (bayCount[p.bay] || 0) + 1;
      if (!at2bays.has(r.at)) at2bays.set(r.at, new Map());
      at2bays.get(r.at).set(p.bay, { mode, cn, row: p.row, tier: p.tier });
    }
  }
  if (!at2bays.size) { out.why = '터미널 자리 자료 없음'; return out; }
  //  ⚠ **«그 순간»의 바구니 하나로 정한다**(검수사 규칙 그대로 · 감사 지적 2026-09-09 반영).
  //    누적 표로 굳히면 **크레인이 배를 따라 옮겨 다닌 과거가 섞여** 지금 자리를 흐린다
  //    (실측 OBWH 2735E — 베이 10 을 1호기가 하다 2호기가 이어받자 표가 갈렸다).
  //    바구니 크기가 호기 수와 **정확히 같을 때만** 쓴다 — 적으면 누가 쉬는지 모르고,
  //    많으면 한 크레인이 한 분에 두 대를 내린 것이라 가운데가 틀리게 붙는다(동방 시각은 분 단위로 뭉쳐 온다).
  //    조용히 틀리느니 안 붙인다(규범 §4-3) — 안 붙으면 화면은 종전 «베이로 묶기»로 남는다.
  //  ⚠ **한 그림에 그려지는 베이는 한 크레인 자리다**(3.38-01 — 라이브에서 실제로 터졌다).
  //    검수사 화면 2026-09-09 — 1호기 «베이 17» · 2호기 «베이 19» 인데 **그림이 둘 다 «BAY 17 BAY (18)19»**로 같았다.
  //    검수사 «제가 보기엔 지금쯤 6번베이 18번베이 작업 할텐데» — 실제로는 한 크레인이 18번 장(17·19 슬롯)을,
  //    다른 크레인이 6번 장(7 슬롯)을 하고 있었다(실측 14:36 {7,17,19} · 14:38~14:42 {7} 와 {17,19} 번갈아).
  //    ⇒ 17·19 는 한 크레인이 한 분에 두 대를 낸 것인데 차가 2 라 종전 문지기(차 1)를 통과했다.
  //    **그림이 그리는 장은 `[E-1, E, E+1]` 폭 3 이다**(BayPlan.jsx `_onlyTitles` · `hatchEvenOf`) —
  //    그래서 **번호 차가 2 이하면 같은 그림 = 같은 자리**로 보고 그 바구니를 버린다.
  //    3.15 가 이미 같은 자리에서 넘어졌다(`boardBaysOf` 머리말 — «짝수+뒤홀수»만 묶으면 01 과 (02)03 이 갈리는데
  //    그림은 한 장이라 두 칸이 같은 그림이 됐다). 같은 실수를 되풀이하지 않는다(규범 §4-4).
  //    (실측 OBWH 2735E 정상 바구니의 두 베이 최소 간격은 8베이 — 이 문지기가 정상 바구니를 지우지 않는다.)
  //  ★ 3.47-02 — **가까운 베이는 버리는 게 아니라 한 자리로 묶는다.**
  //    3.38-01 의 `tooClose` 는 «차 2 이하면 같은 그림 = 같은 자리»까지는 맞게 봤는데 그 바구니를 **통째로 버렸다.**
  //    한 크레인이 40ft 장 하나를 잡으면 20ft 베이 두 개가 **같은 초에** 찍히는 것이 정상 모양이라
  //    (실측 DXQD 2636E — 시각 바구니 165개 중 163개가 그 모양) 이 문지기는 언제나 걸려 판정이 **한 번도 성립하지 않았다.**
  //    검수사 2026-09-15 «호기 판단은 선수 즉 2호기 4호기 작업 이었다면 판단을 하면 되었습니다.
  //      그시간에 2호기는 어느 위치 였고 4호기는 어느 위치 였는지» — 자리는 장(해치) 단위로 보면 갈린다.
  //    실물 증거 — KKLC 2608N 타임시트가 커버를 «BAY# 25&27 · 17&19 · 29&31 · 01&03»으로 적는다. 홀수 둘이 한 장이다.
  //    ⇒ 바구니의 베이를 차 2 이하로 이어 붙여 **묶음**을 만들고, **묶음 수가 호기 수와 같을 때만** 쓴다.
  //    실측 검증 — DXQD 04:48 «2호기 11·13 · 4호기 19·21»(동방 호기별 QC102 선적 42 = 11·13 묶음 42대와 일치) ·
  //      KKLC 04:18 «1호기 25·27 · 2호기 38»(타임시트 04:45-04:50 커버닫음 25&27 → 04:50 작업완료와 일치).
  const clustersOf = (bays) => {
    const ks = [...bays.keys()].filter((b) => (parseInt(b, 10) || 0) > 0)
      .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    const cl = [];
    for (const k of ks) {
      const n = parseInt(k, 10) || 0, last = cl[cl.length - 1];
      if (last && n - (parseInt(last[last.length - 1], 10) || 0) <= 2) last.push(k); else cl.push([k]);
    }
    return cl;
  };
  //  ⚠ 감사 지적(2026-09-15) — 이어붙이기에 폭 상한이 없으면 묶음 하나가 **장 둘을 삼킨다**(17·19·21·23).
  //    갠트리 두 대가 그만큼 붙어 설 수 없으니 그런 바구니는 가르지 말고 **통째로 버린다**(조용히 틀리느니 안 붙인다).
  //    ⛔ 폭으로 «잘라서» 두 묶음을 만들면 안 된다 — 18번 장과 22번 장에 크레인 둘을 세우는 셈이라 더 틀린다.
  const tooWide = (cl) => cl.some((g) => (parseInt(g[g.length - 1], 10) || 0) - (parseInt(g[0], 10) || 0) > 2);
  const ordered = [...at2bays.entries()].sort((a, b) => a[0] - b[0]);
  let pick = null;
  for (const [at, bays] of ordered) {
    const cl = clustersOf(bays);
    if (cl.length !== nos.length || tooWide(cl)) { if (bays.size > 1) out.skipped++; continue; }
    out.pairs++; pick = [at, bays, cl];                  // 가장 늦은 성한 바구니가 «지금 자리»다
  }
  if (!pick) { out.why = `호기 ${nos.length}대가 같은 시각에 서로 다른 장에 찍힌 자료가 없다`; return out; }
  const [at, bays, cl] = pick;
  out.at = at;
  //  3.53-07: 그룹 ↔ 호기는 대수로 짝짓는다(pairCranesByCount) — 그룹 대수 = 그 장 베이에 찍힌 터미널 실적 수(양·선 합).
  //  대표 베이는 **그 장의 짝수**다 — 홀수 둘이 감싸면 가운데(25·27 → 26), 하나뿐이면 그 번호 그대로.
  //  그림은 `[E-1, E, E+1]` 폭 3 이라 같은 장이면 어느 것을 줘도 같은 그림이지만, 화면 글자는 장 번호가 맞다.
  const evenOf = (group) => {
    const ns = group.map((k) => parseInt(k, 10) || 0);
    const lo = ns[0], hi = ns[ns.length - 1];
    const evenIn = ns.find((n) => n % 2 === 0);
    return (hi - lo === 2 && lo % 2 === 1) ? lo + 1 : (evenIn != null ? evenIn : lo);
  };
  //  그룹 대수는 바구니에 찍힌 베이만이 아니라 **그 장 전체 [E-1, E, E+1]** 로 센다 — 바구니에는 26 만 찍혀도 실적은 25·26·27 에
  //  나뉘어 있다(KKAK 실측 25:2·26:13·27:2 ↔ QC103 17 — 26 만 세면 13 이라 동점으로 떨어져 짝을 못 바꿨다, 라이브 3.53-07 첫 판).
  const counts = cl.map((g) => { const e = evenOf(g); return [e - 1, e, e + 1].reduce((a, b) => a + (bayCount[String(b)] || 0), 0); });
  const assigned = pairCranesForGroups(voyage, nos, counts);   // 3.53-09: 접안 방향 → 대수 → 오름차순
  out.byCount = assigned.some((no, i) => no !== nos[i]);
  out.side = berthSideOf(voyage && voyage.info) || '';
  out.pier = String(((voyage && voyage.info) || {}).pier || '').toUpperCase();
  cl.forEach((group, i) => {
    const no = assigned[i];
    const even = evenOf(group);
    const m = bays.get(group[group.length - 1]) || bays.get(group[0]);
    for (const k of group) out.byBay[k] = no;
    //  ⚠ 자릿수를 건드리지 않는다 — `byBay` 열쇠·화면·연막검사가 전부 `parseCatosPos` 가 준 모양('6' · '14')을 쓴다.
    out.byNo[no] = { bay: String(even), at, mode: m.mode, cn: m.cn, row: m.row, tier: m.tier };
  });
  return out;
}

//  ★ 4.22-03 — **완료 컨의 자리 읽기 한 벌**(craneBoardOf 호기 줄 · boardBaysOf 베이 묶음이 같이 부른다).
//    검수사 2026-10-11 MCAP 639N «22번 하는데 30번 베이로 가거나 44번 베이로 이동» — craneBoardOf 는 `bay_actual` 만, boardBaysOf 는
//    실적 → 맞교환 → 계획 순으로 읽어 같은 저장소에 규칙이 두 벌이었다. 양하 완료·터미널 스냅샷 적용(src term)처럼 실적 자리가 없는 완료가
//    호기의 마지막이면 호기 줄이 자리를 잃었다. 순위는 그림(`boardContainers`)과 같다 — 실적 `bay_actual` → 맞교환 `bay_assign`(3.13) → 계획 EDI(그 모드 ediContainers).
//    임시창고(`__STG__`)·자리를 내준 컨(planTaken)은 격자에 없으므로 gone. bay 는 원문 그대로(trim) — 못 찾으면 ''.
//    반환 { gone, bay, row, tier }
export function completedPosOf(sec, cn, recs = null) {
  const rec = ((recs || (sec && sec.records) || {})[cn]) || {};
  if (String(rec.bay_actual || '').startsWith('__') || rec.planTaken) return { gone: true, bay: '', row: '', tier: '' };
  const e = ((sec && sec.ediContainers) || {})[cn] || {};
  const hasA = rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null;
  const hasG = !hasA && rec.bay_assign && !String(rec.bay_assign).startsWith('__');
  return {
    gone: false,
    bay: String(hasA ? rec.bay_actual : hasG ? rec.bay_assign : (e.bay || '')).trim(),
    row: String((hasA ? rec.row_actual : hasG ? rec.row_assign : e.row) ?? '').trim(),
    tier: String((hasA ? rec.tier_actual : hasG ? rec.tier_assign : e.tier) ?? '').trim(),
  };
}

//  ★ 4.84 — **호기 보정(표시 전용 · 한 벌).** 사람이 앱에서 고른 호기는 갱을 바꿔도 그대로 남는다(검수사 2026-11-09 OBWH — 박진우 1호기 → 2호기 · 검수사 2호기 → 1호기).
//    그래서 상황판 호기 줄의 이름이 틀어진다. 기준은 터미널 실적(termWork · src term 완료)이 준 호기·베이 — **같은 베이(±2) · 30분 안에서 가장 가까운 터미널 실적의 호기**로 사람 입력을 읽는다.
//    저장값(completed/{컨}.equip)은 건드리지 않는다. 못 가리면 입력 그대로다 — 조용히 틀리느니 안 바꾼다.
//    ⚠ **공유 베이는 건드리지 않는다**: 같은 베이(±2)에 60분 안에 호기가 다른 실적(호기가 비어 온 실적 포함)이 둘 이상이면 두 크레인이 함께 쓴 자리라 베이로 호기를 못 가른다.
//      검수사 2026-11-09 «같은 시간대입니다 2호기가 10번베이에 갈시간이 안됩니다» — OBWH 19:03 10베이 5건(입력 1호기)이 이 경우다(터미널 2호기 10베이 실적 + 호기 빈 9~11베이 실적이 섞임).
//    반환 { map: {'모드|컨': {from, to, bay, dtMin}}, n, kept, noTerm, shared }. 같은 voyage 객체는 결과를 재사용한다(구독이 새 객체를 주므로 낡지 않는다).
export const CRANE_RELABEL_WIN_MIN = 30;
const CRANE_RELABEL_SHARE_MIN = 60;
//  ★ 4.85 — **터미널 호기 근거(앵커) 수집 한 벌.** craneRelabelOf(표시 보정)와 craneAskOf(입력 때 한 번 묻기)가 같은 근거를 쓴다.
//    no 0 = 터미널이 호기를 안 준 실적(공유 베이 판정에만 쓴다). 자리는 **실적(bay_actual)·맞교환(bay_assign)이 있는 컨만** 쓴다 — 계획 EDI 자리는 선적에서 실제와 다른 일이 흔해(감사 4.84) 같은 베이의 근거가 못 된다.
export function craneAnchorsOf(sec) {
  const comp = (sec && sec.completed) || {}, recs = (sec && sec.records) || {};
  const anchors = [], seen = new Set();
  const realPos = (cn) => { const q = recs[cn]; return !!q && ((q.bay_actual !== undefined && q.bay_actual !== '' && q.bay_actual !== null) || (!!q.bay_assign && !String(q.bay_assign).startsWith('__'))); };
  for (const [cn, r] of Object.entries((sec && sec.termWork) || {})) {
    if (!r || !r.at) continue;
    const p = parseCatosPos(r.pos); const bay = p ? parseInt(p.bay, 10) : 0;
    if (bay > 0) { anchors.push({ at: r.at, no: crewCraneNo(r.equip), bay }); seen.add(cn); }
  }
  for (const [cn, r] of Object.entries(comp)) {
    if (!r || !r.at || seen.has(cn) || !isTermApplied(r) || !realPos(cn)) continue;
    const p = completedPosOf(sec, cn, recs); const bay = p.gone ? 0 : parseInt(p.bay, 10);
    if (bay > 0) anchors.push({ at: r.at, no: crewCraneNo(r.equip), bay });
  }
  return { anchors, realPos };
}

//  ★ 4.85 (검수사 2026-11-10 «입력 시점에 한 번 묻기») — **완료를 누를 때 내 호기가 터미널이 그 베이에 준 호기와 다르면 그 호기를 알려 준다.**
//    판정은 craneRelabelOf 와 같다 — 같은 베이(±2) · 30분 안 가장 가까운 터미널 실적의 호기. 공유 베이(60분 안에 호기가 둘 이상)·근거 없음·같은 호기는 null(묻지 않는다).
//    반환 { to, bay, dtMin } | null. mode 는 'discharge'|'loading', bay 는 숫자, myNo 는 내 호기 번호(1~4).
export function craneAskOf(voyage, mode, bay, myNo, nowMs = Date.now()) {
  const b = parseInt(bay, 10); const me = Number(myNo) || 0;
  if (!(b > 0) || !isCraneNo(me)) return null;
  const sec = (voyage && voyage[mode]) || {};
  const { anchors } = craneAnchorsOf(sec);
  if (!anchors.some((a) => isCraneNo(a.no))) return null;
  const win = CRANE_RELABEL_WIN_MIN * 60000, shareWin = CRANE_RELABEL_SHARE_MIN * 60000;
  const near = [], who = new Set();
  for (const a of anchors) {
    if (Math.abs(a.bay - b) > 2) continue;
    const d = Math.abs(a.at - nowMs);
    if (d <= shareWin) who.add(isCraneNo(a.no) ? a.no : 0);
    if (d <= win && isCraneNo(a.no)) near.push({ d, no: a.no });
  }
  if (!near.length || who.size >= 2) return null;
  near.sort((x, y) => x.d - y.d);
  const to = near[0].no;
  return to === me ? null : { to, bay: b, dtMin: Math.round(near[0].d / 60000) };
}
const _relabelCache = new WeakMap();
export function craneRelabelOf(voyage) {
  if (voyage && typeof voyage === 'object' && _relabelCache.has(voyage)) return _relabelCache.get(voyage);
  const out = { map: {}, n: 0, kept: 0, noTerm: 0, shared: 0 };
  const win = CRANE_RELABEL_WIN_MIN * 60000, shareWin = CRANE_RELABEL_SHARE_MIN * 60000;
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    const comp = sec.completed || {}, recs = sec.records || {};
    const { anchors, realPos } = craneAnchorsOf(sec);   // 4.85: 앵커 수집은 craneAskOf 와 한 벌
    if (!anchors.some((a) => isCraneNo(a.no))) continue;
    for (const [cn, r] of Object.entries(comp)) {
      if (!r || !r.at || isTermApplied(r) || !String(r.by || '').trim()) continue;   // 사람이 찍은 완료만
      const from = crewCraneNo(r.equip); if (!isCraneNo(from) || !realPos(cn)) continue;
      const p = completedPosOf(sec, cn, recs); const bay = p.gone ? 0 : parseInt(p.bay, 10);
      if (!(bay > 0)) continue;
      const near = [], who = new Set();
      for (const a of anchors) {
        if (Math.abs(a.bay - bay) > 2) continue;
        const d = Math.abs(a.at - r.at);
        if (d <= shareWin) who.add(isCraneNo(a.no) ? a.no : 0);
        if (d <= win && isCraneNo(a.no)) near.push({ d, no: a.no });
      }
      if (!near.length) { out.noTerm++; continue; }
      if (who.size >= 2) { out.shared++; continue; }
      near.sort((x, y) => x.d - y.d);
      const to = near[0].no;
      if (to === from) { out.kept++; continue; }   // 서로 다른 호기가 둘 이상이면 위 공유 베이에서 이미 걸러졌다
      out.map[`${mode}|${cn}`] = { from, to, bay, dtMin: Math.round(near[0].d / 60000) };
      out.n++;
    }
  }
  if (voyage && typeof voyage === 'object') _relabelCache.set(voyage, out);
  return out;
}

//  ★ 4.58 (검수사 2026-10-31 «3호기 4호기 이용하다 1호기 2호기로 대체한다고 하면 상황판에는 1호기 2호기만 보여야 한다» · «이종부 3호기로 몇개하다가 1호기로 바꿔서 몇개 했슴을 표기하고 장비는 1호기 2호기를 보여주고 1호기(3호기 작업대수 : XXX대 포함)»):
//    **호기 교체 판정 한 벌.** 같은 조 안에서 **같은 사람이 다른 호기로 다시 등록**되면 교체다(이종부 3호기 → 이종부 1호기). 짝은 사람 이름이 잇는다.
//    저장은 그대로 `info.craneCrew/{조}/{N호기} = {name, at}` — 교체를 위해 새로 쓰는 값은 없다(기록은 지우지 않는다). 교체 시각 = 새 호기를 등록한 `at`.
//    ⚠ 조가 다르면(주간 → 야간 돌려막기) 교체가 아니다. ⚠ 옛 호기가 교체 뒤에 **다시 등록**됐으면(다른 사람이 그 호기에 섰다) 접지 않는다.
//    반환 [{ name, from, to, at }] · 시각 오름차순.
export function craneSwapsOf(info) {
  const cc = info && info.craneCrew;
  if (!cc || typeof cc !== 'object') return [];
  const out = [];
  for (const key of Object.keys(cc)) {
    if (!/^\d{2}-\d{2}\s*(주간|야간)$/.test(String(key).trim())) continue;   // 조 키 모양은 craneCrewOf·crewSegments 와 같은 것만(4.58 감사 하-5)
    const ent = cc[key]; if (!ent || typeof ent !== 'object') continue;
    const list = [];
    for (const ck of Object.keys(ent)) {
      const cm = /^(\d)\s*호기$/.exec(String(ck).trim()); const v = ent[ck]; if (!cm || !v) continue;
      const name = typeof v === 'string' ? v.trim() : String(v.name || '').trim();
      const at = Number(typeof v === 'object' && v.at) || 0;
      if (name && at) list.push({ no: +cm[1], name, at });
    }
    const byName = {};
    for (const e of list) (byName[e.name] = byName[e.name] || []).push(e);
    for (const [name, es] of Object.entries(byName)) {
      es.sort((x, y) => x.at - y.at);
      for (let i = 1; i < es.length; i++) {
        const f = es[i - 1], t = es[i];
        //  같은 시각(한 번에 등록한 묶음)에 한 사람이 두 호기면 교체가 아니라 두 갱을 함께 보는 것이다 — 교체는 «뒤에 다시 등록» 한 것이다.
        //  옛 호기를 교체 뒤에 다른 사람이 다시 등록하면 같은 조 안에서는 그 칸이 덮어써져 옛 짝이 사라지므로 교체로 안 보이고, 다른 조의 대수는 접을 때 조 창으로 가른다.
        if (f.no === t.no || f.at === t.at) continue;
        out.push({ name, from: f.no, to: t.no, at: t.at, key });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

//  교체된 옛 호기 번호로 붙은 기기·접속 검수원은 새 호기로 읽는다(4.58 감사 중-2 — 교체 뒤에도 옛 번호를 쓰는 기기).
//  ⚠ 지금 조에서 한 교체만 적용한다 — 교체 뒤 다른 조가 같은 번호 호기를 이어 쓰는 것은 정상이라 그 사람 기기를 새 호기로 읽으면 안 된다(4.58 감사 중-1).
export function craneNoAfterSwap(info, no, nowMs = Date.now()) {
  let n = Number(no) || 0;
  //  지금 조 = 접기 창(crewSegments)과 같은 잣대로 — 교대 시각 부근에 기기 매핑과 접기가 어긋나지 않게(4.58 감사 하-3)
  let curKey = '';
  try { const sg = crewSegmentAt(crewSegments(info || {}), Number(nowMs) || 0); curKey = sg ? sg.key : ''; } catch (e) { return n; }
  if (!curKey) return n;
  for (const sw of craneSwapsOf(info)) if (sw.from === n && sw.key === curKey) n = sw.to;
  return n;
}
//  ★ 4.87-07 — opt.roster 를 주면 호기 이름을 «지금 로그인해 있는 사람» 으로만 적는다(검수사 2026-11-11 19:02 «로그아웃 즉시 작업지 명단에서 사라져야 합니다»).
//    실근거 OBWH 2789E — 로그아웃한 이형출이 1·2호기 이름으로 남았다(등록은 1호기 하나 · 2호기는 16:17~16:58 에 17대를 찍은 흔적 · 그 뒤 1호기로 돌아감).
//    roster = { 이름: { loggedIn, here, no } } — loggedIn 로그인 중 · here 이 항차에 붙어 있음 · no 이 항차에서 등록한 호기(없으면 0).
//    완료를 찍은 흔적으로 이름을 올릴 때 — 로그아웃했거나, 이 항차에 없거나, 다른 호기로 등록했거나, 그 사람의 마지막 입력이 다른 호기면 올리지 않고 그다음으로 늦게 찍은 사람을 본다.
//    아무도 못 올리면 name 은 비우고 nameGone 에 마지막으로 찍은 사람을 남긴다(화면은 «검수원 없음»). roster 를 안 주면 종전 그대로다(베이뷰 따라가기·시험).
export function craneBoardOf(voyage, workers = [], recordsByMode = null, nowMs = Date.now(), opt = null) {
  const info = (voyage && voyage.info) || {};
  const rows = {};
  const roster = (opt && opt.roster && typeof opt.roster === 'object') ? opt.roster : null;
  const lastHuman = {};   // 이름 → { at, no } 그 사람이 마지막으로 찍은 호기
  const _rlb = craneRelabelOf(voyage);   // 4.84 호기 보정
  let termHasEquip = false;   // 감사: 터미널 피드에 컨별 호기가 있는가 — 없으면(동방) QC 합계가 호기별 정본(3.8 crewWorkStats 와 같은 갈림)
  //  4.22-03 감사(하 1): posAt — 지금 자리(bay·row·tier)를 준 기록의 시각. 자리는 «자리 있는 기록 중 가장 늦은 것»으로만 바꾼다(객체 반복 순서에 기대지 않는다). 내보내기 전에 지운다.
  const row = (no) => rows[no] || (rows[no] = { no, name: '', nameAt: 0, posAt: 0, mode: '', bay: '', row: '', tier: '', cn: '', done: 0, dis: 0, lod: 0, lastAt: 0, src: '', qc: false, ats: [] });
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    const seen = new Set();
    for (const [cn, r] of Object.entries(sec.termWork || {})) {
      if (!r || !r.at) continue;
      const no = crewCraneNo(r.equip); if (!no) continue;
      termHasEquip = true;
      const c = row(no); c.done++; c[mode === 'loading' ? 'lod' : 'dis']++; seen.add(cn); const _ent = { at: r.at, mode, cn, src: 'term', pos: null }; c.ats.push(_ent);
      if (r.at > c.lastAt) Object.assign(c, { lastAt: r.at, mode, cn, src: 'term' });
      const p = parseCatosPos(r.pos);
      if (p) _ent.pos = { bay: p.bay, row: p.row, tier: p.tier };
      if (p && r.at > c.posAt) Object.assign(c, { posAt: r.at, bay: p.bay, row: p.row, tier: p.tier });
    }
    const recs = (recordsByMode && recordsByMode[mode]) || sec.records || {};
    for (const [cn, r] of Object.entries(sec.completed || {})) {
      if (!r || !r.at) continue;
      const no0 = crewCraneNo(r.equip); if (!no0) continue;
      //  4.84: 사람이 고른 호기가 터미널 베이와 다르면 터미널 호기로 읽는다(표시만 — 저장값은 그대로). 이름·자리·마지막 컨이 그 호기 줄로 간다.
      const _rl = _rlb.map[`${mode}|${cn}`];
      const no = _rl ? _rl.to : no0;
      const c = row(no);
      const by = String(r.by || '').trim();
      if (by && !isTermApplied(r) && r.at >= c.nameAt) { c.name = by; c.nameAt = r.at; }   // 가장 늦게 찍은 사람(3.16: 터미널 반영은 사람이 아니다)
      if (by && !isTermApplied(r)) { const cd = c.cands || (c.cands = {}); if (!(cd[by] >= r.at)) cd[by] = r.at; const lh = lastHuman[by]; if (!lh || r.at >= lh.at) lastHuman[by] = { at: r.at, no }; }   // 4.87-07
      if (seen.has(cn)) continue;
      if (_rl) { const rr = c.relab || (c.relab = { n: 0, from: {} }); rr.n++; rr.from[_rl.from] = (rr.from[_rl.from] || 0) + 1; }   // 4.84: 대수(done)에 든 것만 센다
      c.done++; c[mode === 'loading' ? 'lod' : 'dis']++; const _ent = { at: r.at, mode, cn, src: 'app', pos: null }; c.ats.push(_ent);
      if (r.at > c.lastAt) Object.assign(c, { lastAt: r.at, mode, cn, src: 'app' });   // 시각·모드·컨은 가장 늦은 완료
      //  4.22-03: 자리는 boardBaysOf 와 같은 한 벌(completedPosOf — 실적 → 맞교환 → 계획 EDI). 셋 다 없으면(창고·자리 내줌 포함) 자리를 바꾸지 않는다 —
      //    남는 자리는 «자리 있는 기록 중 가장 늦은 것»(posAt)이다(감사 하 1 — MCAP 15:05 HASU4806161 자리 없음 → 키 순서에 따라 18 또는 22 가 남던 것).
      //    베이 모양은 이 줄의 다른 출처(parseCatosPos · bay_actual)와 같게 앞 0 없이 — EDI 는 '02' 로 온다.
      const p = completedPosOf(sec, cn, recs);
      const n = p.gone ? 0 : parseInt(p.bay, 10);
      if (n > 0) _ent.pos = { bay: String(n), row: p.row, tier: p.tier };
      if (n > 0 && r.at > c.posAt) Object.assign(c, { posAt: r.at, bay: String(n), row: p.row, tier: p.tier });
    }
  }
  if (roster) {
    for (const c of Object.values(rows)) {
      const cd = c.cands || {};
      const okName = (nm) => { const r = roster[nm]; const lh = lastHuman[nm]; return !!(r && r.loggedIn === true && r.here !== false && !(r.no && Number(r.no) !== Number(c.no)) && (!lh || Number(lh.no) === Number(c.no))); };
      const pick = Object.keys(cd).filter(okName).sort((x, y) => cd[y] - cd[x])[0] || '';
      if (c.name && pick !== c.name) c.nameGone = c.name;
      c.name = pick; c.nameAt = pick ? cd[pick] : 0;
    }
  }
  for (const c of Object.values(rows)) delete c.cands;
  for (const w of workers || []) {
    const no = craneNoAfterSwap(info, crewCraneNo(w && w.equip), nowMs); if (!no) continue;
    const c = row(no);
    if (w.name) { c.name = w.name; c.nameAt = nowMs; }   // 앱에 붙어 있는 사람이 가장 확실하다(4.30-04: 지금 시각의 이름)
    if (w.bay) { c.bay = String(w.bay); c.row = ''; c.tier = w.tier != null ? String(w.tier) : ''; c.mode = w.mode || c.mode; c.src = 'live'; }   // 앱은 로우를 안 주므로 다른 컨의 로우가 남지 않게 비운다
  }
  //  동방 — 터미널 피드에 컨별 호기가 **없으면** QC 합계가 호기별 대수의 정본이다(앱 완료·접속 검수원이 섞여도 QC 합계를 지우지 않는다 — 감사 실측 QC101 257·QC103 213 소실).
  if (!termHasEquip && info.qcWork && typeof info.qcWork === 'object') {
    for (const q of Object.values(info.qcWork)) {
      const no = crewCraneNo(q && q.qc); if (!no) continue;
      const dis = Number(q.disDone) || 0, lod = Number(q.lodDone) || 0; if (!dis && !lod) continue;
      const c = row(no); c.dis = dis; c.lod = lod; c.done = dis + lod; c.qc = true; if (!c.src) c.src = 'qc';
    }
    //  ★ 3.38: 대수는 QC 가 정본이고, **자리는 같은 시각에 함께 찍힌 베이로 가른다**(craneBaysByTime).
    //    앱 완료·접속 검수원이 이미 자리를 준 호기는 건드리지 않는다 — 사람이 찍은 것이 터미널 추론을 이긴다.
    try {
      const tb = craneBaysByTime(voyage, Object.keys(rows).map(Number));
      for (const [no, m] of Object.entries(tb.byNo || {})) {
        const c = rows[no]; if (!c || !m || !m.bay) continue;
        if (c.bay && /\d/.test(String(c.bay)) && c.src !== 'qc') continue;   // 사람이 준 자리를 덮지 않는다
        Object.assign(c, { bay: String(m.bay), row: m.row || '', tier: m.tier || '', mode: m.mode || c.mode, cn: m.cn || c.cn, src: 'qcbay' });
        if (m.at > c.lastAt) c.lastAt = m.at;
      }
      if (tb.why) console.warn('[3.38] 시각으로 호기·베이를 못 가렸다 —', tb.why, '· 버린 바구니', tb.skipped);
    } catch (e) { console.warn('[3.38] 시각으로 호기·베이 잇기 실패', e); }
  }
  //  ★ 4.58: 호기 교체 — 옛 호기 줄은 접고 새 호기 줄에 «옛 호기 작업대수 N대 포함»을 단다(옛 호기 기록은 그대로 둔다).
  //    접는 것은 **교체를 등록한 그 조 안에서 옛 호기로 찍힌 실적**뿐이다(감사 상-1 — 다른 조·다른 사람이 같은 번호 호기에서 한 일은 그 호기에 남는다).
  //    새 호기에 아직 실적이 없어도 줄을 만들어 «1호기 2호기만 보인다»를 지킨다.
  try {
    const _segs = crewSegments(info);
    //  줄의 «마지막 컨·모드·출처·자리»를 그 줄에 남은 실적에서 다시 잡는다 — 접은 몫의 자리가 접히지 않은 몫에 새지 않게(4.58 감사 중-2).
    const _last = (c, ents) => {
      if (c.src === 'live' || c.src === 'qcbay') return;   // 앱에 붙은 검수원의 지금 베이·시각 베이는 실적에서 다시 만들지 않는다(4.58 감사 중-1)
      let best = null, bp = null;
      for (const a of ents) { if (!best || a.at > best.at) best = a; if (a.pos && (!bp || a.at > bp.at)) bp = a; }
      if (!best) return;
      Object.assign(c, { lastAt: best.at, mode: best.mode, cn: best.cn, src: best.src });
      if (bp) Object.assign(c, { posAt: bp.at, bay: bp.pos.bay, row: bp.pos.row, tier: bp.pos.tier }); else Object.assign(c, { posAt: 0, bay: '', row: '', tier: '' });
    };
    for (const sw of craneSwapsOf(info)) {
      const f = rows[sw.from];
      let sel = [], rest = [];
      //  동방 QC 합계 줄(c.qc)은 대수가 QC 합계로 덮여 시각별 실적과 안 맞는다 — 그 호기 합계를 통째로 옮긴다(4.58 감사 상-1).
      const qcAll = !!(f && f.done > 0 && (f.qc || !f.ats.length));
      //  ⚠ 그 호기를 다른 조도 등록했으면(다음 조가 이어받음) QC 합계는 시각으로 못 나누므로 접지 않는다(감사 중-2).
      if (qcAll && Object.keys(info.craneCrew || {}).some((k) => k !== sw.key && info.craneCrew[k] && typeof info.craneCrew[k] === 'object' && info.craneCrew[k][`${sw.from}호기`])) continue;
      const t = row(sw.to);
      if (f && !qcAll) for (const a of f.ats) { const sg = crewSegmentAt(_segs, a.at); (sg && sg.key === sw.key ? sel : rest).push(a); }
      const n = qcAll ? f.done : sel.length;
      const dN = qcAll ? f.dis : sel.filter((a) => a.mode !== 'loading').length;
      const lN = qcAll ? f.lod : sel.filter((a) => a.mode === 'loading').length;
      const tHadLast = t.lastAt;
      t.done += n; t.dis += dN; t.lod += lN;
      if (qcAll) { t.qc = true; /* 연쇄 교체에서 이 줄이 다시 옛 호기가 돼도 합계를 통째로 옮기게(감사 상-1) */ if (f.lastAt > t.lastAt && t.src !== 'live' && t.src !== 'qcbay') Object.assign(t, { lastAt: f.lastAt, mode: f.mode, cn: f.cn, src: f.src }); if (!t.bay && f.bay) Object.assign(t, { posAt: f.posAt, bay: f.bay, row: f.row, tier: f.tier }); }
      else if (sel.length) {
        for (const a of sel) t.ats.push(a);
        const mx = Math.max(...sel.map((a) => a.at));
        if (mx > tHadLast) _last(t, t.ats);
        else if (!t.bay) { const ph = sel.filter((a) => a.pos).sort((x, y) => y.at - x.at)[0]; if (ph) Object.assign(t, { posAt: ph.at, bay: ph.pos.bay, row: ph.pos.row, tier: ph.pos.tier }); }
      }
      if (n > 0) (t.fold = t.fold || []).push({ from: sw.from, n, name: sw.name, at: sw.at });
      if (n > 0) { delete t.relab; if (f) delete f.relab; }   // 4.84: 접은 몫이 섞이면 «입력 호기와 다름» 건수가 대수와 안 맞는다 — 접힌 호기는 표시하지 않는다
      if (f) {
        if (rest.length && !qcAll) { f.done = rest.length; f.dis = rest.filter((a) => a.mode !== 'loading').length; f.lod = rest.filter((a) => a.mode === 'loading').length; f.ats = rest; _last(f, rest); }
        else if (f.src === 'live') { f.done = 0; f.dis = 0; f.lod = 0; f.ats = []; }   // 그 번호에 지금 붙어 있는 접속 검수원의 줄은 남긴다(감사 중-1)
        else delete rows[sw.from];
      }
    }
  } catch (e) { console.warn('[4.58] 호기 교체 접기 실패', e); }
  const out = Object.values(rows).sort((a, b) => a.no - b.no);
  //  ★ 4.30-02 (검수사 2026-10-17 17:50 «아침에 퇴근했으면 클리어가 되어 있어야 하는데 남아 있다는건 잘못된것입니다»):
  //    호기 줄의 이름은 «그 호기 마지막 기록의 근무조»가 끝났으면(교대 06:30·17:30 이후) 지금 근무자가 아니다 — 비운다.
  //    지금 조에 조 등록(crewNameAt)이나 앱에 붙은 검수원(live)이 있으면 그 이름만 쓴다. 카페리(주야 구분 없음)는 그대로.
  const _nowMs = nowMs, _shifted = shipHasShifts(info.vsl);
  for (const c of out) {
    const stale = _shifted && c.src !== 'live' && c.lastAt && currentShift(c.lastAt).endMs <= _nowMs;
    //  ★ 4.30-04 (검수사 2026-10-17 21:56 «지금 상황판 보면 아직도 제 이름이 남아 있습니다 4호기로») —
    //    4.30-02 는 «마지막 기록의 조가 끝났나» 만 봤다. SWSP 4호기는 김성일이 **야간조 06:19까지** 양하를 찍었고, 그 뒤 **새 조의 선적 실적(이름 없음)** 이 마지막 기록이 되어
    //    «조가 안 끝남» → 지난 조 이름이 그대로 남았다. 이름은 **자기 시각의 조**에서만 유효하다 — 이름을 준 기록(nameAt)의 조가 마지막 기록(lastAt)의 조와 다르면 지난 조 이름이다.
    //    live(앱에 붙은 검수원)는 지금 사람이라 그대로. 그 조의 조 등록(crewNameAt)이 있으면 그 이름, 없으면 빈칸.
    const _prevShiftName = _shifted && c.src !== 'live' && c.name && c.nameAt && c.lastAt && currentShift(c.nameAt).startMs !== currentShift(c.lastAt).startMs;
    //  4.87-07 감사 지적: 조 등록(craneCrew)에서 채우는 이름도 로그인 명단을 거친다 — 로그아웃했거나 이 항차에 없거나 다른 호기로 등록한 사람은 조 등록에 남아 있어도 올리지 않는다.
    //    앱에 붙어 그 호기를 등록한 사람(workers 고리가 준 이름 — nameAt 이 지금 시각)은 그대로 둔다.
    const _crewNm = (at) => {
      const nm = crewNameAt(info, at, `${c.no}호기`);
      if (!roster || !nm) return nm;
      const r = roster[nm];
      if (r && r.loggedIn === true && r.here !== false && !(r.no && Number(r.no) !== Number(c.no))) return nm;
      if (!c.nameGone) c.nameGone = nm;
      return '';
    };
    if (stale || _prevShiftName) c.name = _crewNm(stale ? _nowMs : c.lastAt);
    else if (!c.name) c.name = _crewNm(c.lastAt || Date.now());
    delete c.nameAt; delete c.posAt; delete c.ats;
  }
  return out;
}

//  ★ 4.61 — 상황판은 **지금 일하는 호기만** 줄로 세운다. 한 호기가 STOP_MIN 분 넘게 완료가 없고 다른 호기는 일하고 있으면, 그 호기는 줄에서 빼고
//    {no, done, idleMin} 으로 따로 돌려준다(대수는 지우지 않는다 — 한 줄로 «작업 없음 N분» 에 남긴다). 중단이든 다른 배로 옮겼든 같은 규칙이다(검수사 2026-10-31 20:14
//    «PCSZ 1 2 호기 작업 중단 하고 다른 선박 작업을 했을텐데 아직도 PCSZ 상황판에 남아 있습니다» · «아니면 작업 중단 상태이거나»).
//    ⚠ 앱에 붙은 검수원(src live)이 있는 호기는 일하는 호기다. 일하는 호기가 하나도 없으면(배 전체가 쉼) 종전대로 전부 보인다.
export const CRANE_STOP_MIN = 60;
//  ★ 4.77 — **호기 이동 보고(type 'crane_move') 읽기 한 벌.** 호기 번호 → { state:'left'|'back', kind, ts } (마지막 보고). 철수·이동(떠남) = left · 복귀 · 철수/이동의 도착 호기(to) = back.
//  미르의 말·작업 보고 «호기 이동» 단추가 같은 보고를 쓰고, 수석 상황판(멈춘 호기)·호기별 집계·갱 수 계산이 이것을 읽는다.
export function craneMoveStateOf(voyage) {
  const out = new Map();
  //  항차가 마감됐으면(검수 완료·작업 끝) 철수는 의미가 없다 — 비워서 돌려준다.
  const _inf = (voyage && voyage.info) || {};
  if (_inf.workEndAt || _inf.inspectorDone) return out;
  const put = (raw, ts, state, kind) => { if (/RORO|램프|(?:^|\D)105\s*(?:호기)?\s*$/i.test(String(raw || ''))) return; const no = crewCraneNo(raw); if (!isCraneNo(no)) return; const cur = out.get(no); if (!cur || ts >= cur.ts) out.set(no, { state, kind, ts }); };
  for (const [k, r] of Object.entries((voyage && voyage.reports) || {})) {
    if (!r || r.type !== 'crane_move') continue;
    const ts = Number(r.ts) || Number(k) || 0; const kind = String(r.kind || '');
    if (kind === 'withdraw' || kind === 'move') put(r.equip, ts, 'left', kind);
    if (kind === 'return') put(r.equip, ts, 'back', kind);
    if ((kind === 'withdraw' || kind === 'move') && r.to) put(r.to, ts + 1, 'back', 'arrive');
  }
  return out;
}
export const CRANE_MOVE_KO = { withdraw: '철수', move: '이동', return: '복귀', arrive: '이동 도착' };
export function craneBoardSplit(rows, nowMs = Date.now(), stopMin = CRANE_STOP_MIN, finishedNos = null, moveState = null) {
  //  4.77 — 램프(5호기 자리 = 105호기)는 갱이 아니다: 갱 수·멈춘 호기·active 계산에서 빼고 ramp 로 따로 돌려준다.
  const ramp = (Array.isArray(rows) ? rows : []).filter((c) => Number(c.no) === RAMP_NO);
  const all = (Array.isArray(rows) ? rows : []).filter((c) => Number(c.no) !== RAMP_NO);
  //  4.62-03 — 터미널 본선현황이 «이 호기는 일을 다 마쳤다(남음 0)» 고 하고 다른 호기는 아직 남았으면 그 호기는 철수한 것이다 —
  //    야간에 2호기를 접고 3·4호기만 상황판에 남긴다(검수사 2026-11-01 18:40 «2호기 철수는 야간 작업떄 2호기 자료를 정리 하고 3호기 4호기만 상황�
  //    입력 없이 터미널 값으로 판정한다(termFinishedCranesOf). 앱에 붙은 검수원(live)이 있는 호기는 철수가 아니다. 남는 호기가 없으면 건드리지 않는
  //  4.77 — 사람이 «철수»를 알린 호기(crane_move)는 터미널 값 없이도 멈춘 호기다(복귀하면 해제 · 이동 도착 호기는 일하는 호기). moveState = craneMoveStateOf.
  const fin = finishedNos instanceof Set ? finishedNos : null;
  const mv = moveState instanceof Map ? moveState : null;
  //  철수는 (1) 복귀 보고 · (2) 철수 뒤 그 호기에 실적(lastAt)·앱에 붙은 검수원(live)이 생기면 · (3) 근무일이 바뀌면(다른 날 조) 풀린다 — isFin 의 live 예외와 같은 한 벌.
  const _dayKey = (t) => { const d = new Date(currentShift(t).startMs); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const _sameDay = (t) => _dayKey(t) === _dayKey(nowMs);
  const _leftNow = (no, c) => { const m = mv && mv.get(Number(no)); return !!(m && m.state === 'left' && _sameDay(m.ts) && !(c && (c.src === 'live' || (c.lastAt && c.lastAt > m.ts)))); };
  const isOut = (c) => _leftNow(c.no, c);
  const isIn = (c) => !!(mv && mv.get(Number(c.no)) && mv.get(Number(c.no)).state === 'back' && nowMs - mv.get(Number(c.no)).ts < stopMin * 60000);
  const isFin = (c) => !!(fin && fin.has(Number(c.no)) && c.src !== 'live');
  const isGone = (c) => isOut(c) || isFin(c);
  const list = all.some((c) => !isGone(c)) ? all.filter((c) => !isGone(c)) : all;
  const goneRows = list === all ? [] : all.filter(isGone).map((c) => (isOut(c)
    ? { no: c.no, done: c.done, idleMin: 0, withdrawn: true, moveKind: mv.get(Number(c.no)).kind }
    : { no: c.no, done: c.done, idleMin: 0, finished: true }));
  //  보고만 있고 완료 줄이 아직 없는 철수 호기도 멈춘 호기로 보인다.
  if (list !== all && mv) for (const [no, m] of mv) if (_leftNow(no, null) && !all.some((c) => Number(c.no) === no)) goneRows.push({ no, done: 0, idleMin: 0, withdrawn: true, moveKind: m.kind });
  const idleMin = (c) => (c.src === 'live' ? 0 : c.lastAt ? Math.max(0, Math.round((nowMs - c.lastAt) / 60000)) : 0);
  const working = (c) => c.src === 'live' || isIn(c) || (c.lastAt && idleMin(c) < stopMin);
  if (!list.some(working)) return { active: list, stopped: goneRows, ramp };
  const active = list.filter((c) => working(c) || !c.lastAt);
  const stopped = goneRows.concat(list.filter((c) => !active.includes(c)).map((c) => ({ no: c.no, done: c.done, idleMin: idleMin(c) })));
  return { active, stopped, ramp };
}

//  ★ 4.62-03 — PCTC 본선현황 GC별 «다 마친 호기» 번호 집합. 남음(양하+선적)이 0이고 한 대라도 했으며(합계 > 0), 같은 표에 아직 남은 호기가 있고,
//    표가 30분 안에 온 것일 때만(낡은 표로 접지 않는다). 동방·표 없음·표가 낡음이면 null — 상황판은 종전 규칙(쉰 호기 빼기)만 쓴다.
export function termFinishedCranesOf(info, nowMs = Date.now()) {
  const ts = info && info.termStat;
  if (!ts || typeof ts !== 'object' || !ts.gc || typeof ts.gc !== 'object') return null;
  if (ts.src && String(ts.src).toUpperCase() !== 'PCTC') return null;
  const at = Number(ts.at) || 0;
  if (!at || nowMs - at > 30 * 60000 || at - nowMs > 10 * 60000) return null;
  const n = (x) => { const v = Number(x); return Number.isFinite(v) && v > 0 ? Math.round(v) : 0; };
  const fin = new Set(); let moreWork = false;
  for (const [k, g] of Object.entries(ts.gc)) {
    if (!g || typeof g !== 'object') continue;
    const no = crewCraneNo(k); if (!no) continue;
    const rest = n(g.disRest) + n(g.lodRest); const tot = n(g.disTot) + n(g.lodTot);
    if (rest > 0) moreWork = true;
    else if (tot > 0) fin.add(no);
  }
  return moreWork && fin.size ? fin : null;
}

//  ★ 3.15: **컨별 자리가 안 오는 배(동방)도 «지금 작업 중인 베이» 그림을 낸다.**
//    검수사 2026-09-06 — *«그림도 보여주세요. 양하는 맞게 내려오고 있고 선적도 계획된 선적이면 맞게 보일테이고
//    검수앱을 사용하면 맞게보이니까요»*. 3.10~3.14 는 동방 칸에 «컨별 자리가 안 와서 그림이 없습니다»라고만 적었다.
//    동방(PNCT)은 **컨별 호기가 없다**(적하목록에 QC 칸이 없다). 자리는 수집기 2.26 부터 컨 조회로 받아 오지만
//    호기는 여전히 안 오므로, 호기→베이를 이을 끈은 없다.
//  ⇒ **자리는 계획(EDI)이 안다.** 방금 완료된 컨들의 계획 자리를 해치(짝수+뒤홀수)로 묶으면, 많이 찍힌 해치가 지금 하는 곳이다.
//    검수사 말 그대로 — 양하는 계획대로 내려오고, 선적도 계획대로 실으며, 검수앱으로 찍으면 실적 자리가 계획을 이긴다.
//    ✅ 실측 OBWH 2731E(동방 470대) 30분 창 — 16:40 (18)19×16·(10)11×16 · 17:10 (18)19×12·(10)11×9 처럼
//      갱 수(QC 두 대)만큼 또렷이 갈렸다. 자리 못 찾은 완료 0건(계획 자리 470/470).
//  ⚠ 창의 기준은 «지금»이 아니라 **가장 늦은 완료 시각**이다 — 쉬는 시간(근무시간표)·자료 지연에 그림이 사라지면 안 된다.
//  ⚠ 실적 자리(`bay_actual`)가 있으면 그것이 먼저다 — 검수원이 검수앱으로 찍은 자리가 계획보다 정확하다.
//  ⚠ **해치 묶기는 그림이 그리는 장과 같아야 한다** — `cargoPlanCore.hatchEvenOf` 한 벌(규범 §4-4).
//    감사 지적(2026-09-06) — «짝수+뒤홀수»만 묶으면 01 과 (02)03 이 갈리는데 그림은 한 장이라 **두 칸이 같은 그림**이 됐다
//    (실측 OBWH 2731E 2갱 7.4% · 3갱 41.8%). 사전 `pages` 를 받아 BayPlan 과 같은 답을 낸다.
//  ⚠ 자리 순위는 그림(`boardContainers`)과 같다 — 실적 `bay_actual` → 맞교환 `bay_assign`(3.13) → 계획 `bay`.
//  반환 [{bay:'18', mode:'discharge', n:16, lastAt:…}] — 많이 찍힌 순, 최대 want 칸.
//  ★ 4.42 — 자동 가이드 «23번 / (24)25번» 나눠 고르기 — 한 장(트윈 짝 묶음 23·24·25) 안의 컨을 **베이사전 장**으로 나눈다.
//    검수사 2026-10-21 07:20 «ATPR 24번베이 홀드에서 자동가이드로 트윈 작업을 하다가 싱글 작업으로 전환을 하는데 앱은 23번 베이만을 이야기 합니다.
//    실제로는 25번 베이를 작업하고 있는 상황인데 25번 베이로 옮기려도 해도 방법이 없어 … 그래서 베이선택을 23번베이 (24)25번베이로 분리해서 선택할수 있게
//    만들어야 합니다. 1(2)3 베이라면 1 번베이 (2)3번 베이로 분리».
//    장은 베이사전 쪽(카고플랜·보드 그림과 같은 cargoPlanCore.hatchEvenOf + pages) — 홀로 선 앞 홀수(23)와 «짝수+뒤홀수»((24)25, 규범 §11).
//    사전(pages)이 없으면 나누지 않는다(빈 배열 — 없는 베이를 지어내지 않는다). 둘 이상으로 나뉠 때만 돌려준다(한 쪽뿐이면 나눌 것이 없다).
//    반환 [{ key, lab:'23번'|'(24)25번', bay: 그 쪽이 든 장을 찾을 베이, bays:[그 쪽에 남은 컨이 있는 베이들 — 가이드 «베이 먼저» 에 이것을 다 넘긴다], n }] — 베이 오름차순.
//    bay — 앞 홀수 쪽은 그 홀수, 짝수+뒤홀수 쪽은 뒤홀수(20피트)에 남은 컨이 있으면 뒤홀수, 없으면 짝수(40피트만 남음).
//    «(24)25번» 은 24 40피트와 25 20피트를 같이 먼저 세운다(감사 2026-10-21 — 25 하나만 당기면 40피트가 밀려 1.76-05 «40피트 먼저» 와 어긋났다).
export function bayPageSplitOf(conts, pages) {
  if (!Array.isArray(pages) || !pages.length) return [];
  const evOf = (pg) => (pg ? (pg.evenBay != null ? pg.evenBay : pg.even) : null);
  const oddOf = (pg) => (pg ? (pg.oddBay != null ? pg.oddBay : pg.odd) : null);
  const pad = (n) => String(n).padStart(2, '0');
  const m = new Map();
  for (const c of conts || []) {
    const b = parseInt(c && c.bay, 10);
    if (!(b > 0)) continue;
    const ev = hatchEvenOf(b, pages);
    if (!ev) continue;
    const front = b % 2 === 1 && ev === b + 1;          // 홀로 선 앞 홀수(사전에 그 짝수의 뒤홀수가 아님)
    const key = front ? `f${b}` : `p${ev}`;
    let x = m.get(key);
    if (!x) {
      if (front) x = { key, lab: `${pad(b)}번`, bay: b, bays: new Set(), n: 0, _odd: null, _ev: null };
      else {
        const pg = pages.find((q) => evOf(q) != null && parseInt(evOf(q), 10) === ev);
        const odd = pg && oddOf(pg) != null ? parseInt(oddOf(pg), 10) : null;
        x = { key, lab: odd ? `(${pad(ev)})${pad(odd)}번` : `${pad(ev)}번`, bay: ev, bays: new Set(), n: 0, _odd: odd, _ev: ev };
      }
      m.set(key, x);
    }
    x.bays.add(b); x.n++;
  }
  const out = [...m.values()].map((x) => ({ key: x.key, lab: x.lab, bay: (x._odd && x.bays.has(x._odd)) ? x._odd : x.bay, bays: [...x.bays].sort((a, b) => a - b), n: x.n }))
    .sort((a, b) => a.bays[0] - b.bays[0]);
  return out.length >= 2 ? out : [];
}

export function boardBaysOf(voyage, want = 2, winMin = 30, pages = null) {
  const ev = [];
  let _noPos = 0;   // 3.20-05: 자리를 못 찾은 완료 — 조용히 버리지 않는다(규범 §4-3)
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    for (const [cn, r] of Object.entries(sec.completed || {})) {
      const at = Number(r && r.at) || 0; if (!at) continue;
      //  4.22-03: 자리 읽기는 craneBoardOf 와 한 벌(completedPosOf).
      //  임시창고(`__STG__`)·자리를 내준 컨은 그림(`boardContainers`)에서도 격자에서 빠진다 — 세는 쪽도 같이 뺀다.
      const pos = completedPosOf(sec, cn);
      if (pos.gone) continue;
      const raw = pos.bay;
      //  ⚠ 3.20-05: 자리를 못 찾은 완료는 베이 셈에서 빠진다 — **조용히 빠지지 않게 센다**(규범 §4-3).
      //    3.20-05 로 리스트 밖 실적(시프팅·통과화물)에 자리 행을 안 만들면서, 그런 컨은 여기서
      //    계획도 실적도 없어 탈락한다. 3.15 가 «계획 자리 못 찾은 완료 0/470» 을 쟀던 것과 같은 셈이다.
      if (!raw) { _noPos++; continue; }
      const n = parseInt(raw, 10); if (!(n > 0)) continue;
      ev.push({ at, mode, bay: String(n).padStart(2, '0'), pair: hatchEvenOf(n, pages) });
    }
  }
  if (_noPos) console.warn(`[작업 보드] 자리를 못 찾은 완료 ${_noPos}건 — 그 컨은 «지금 작업 중인 베이» 셈에서 빠집니다(리스트·EDI 밖 재적부 등).`);
  if (!ev.length) return [];
  const last = ev.reduce((m, e) => (e.at > m ? e.at : m), 0);
  //  창을 넓혀 가며 처음 잡히는 것을 쓴다 — 30분에 아무것도 없으면(자료가 뜸한 배) 1시간·2시간·전체로.
  for (const win of [winMin, winMin * 2, winMin * 4, 0]) {
    const from = win ? last - win * 60000 : 0;
    const m = new Map();
    for (const e of ev) {
      if (e.at < from) continue;
      const k = `${e.mode}|${e.pair}`;
      let c = m.get(k);
      if (!c) { c = { bay: e.bay, mode: e.mode, n: 0, lastAt: 0 }; m.set(k, c); }
      c.n++;
      if (e.at > c.lastAt) { c.lastAt = e.at; c.bay = e.bay; }   // 그림에 넘기는 베이는 «가장 늦게 찍은 컨»의 것
    }
    const out = [...m.values()].sort((a, b) => b.n - a.n || b.lastAt - a.lastAt).slice(0, Math.max(1, want));
    if (out.length) return out;
  }
  return [];
}

//  ★ 3.48 «베이뷰 작업» — **완료 지도와 불일치, 한 벌.** 검수사 2026-09-15 «본인이 완료하든 터미널 자료가 완료하든 색은 칠해져야 합니다».
//    입력은 구독 뒤의 `voyage[mode]`(applyCatosPos 가 얹은 records 포함). RTDB 에는 아무것도 쓰지 않는다 — 메모리 합집합이다.
//    ① compMap — 앱 completed 에 터미널 termWork(at 있는 것)를 더한다. 같은 컨이면 **앱 기록이 그대로**(검수원 > 터미널, applyCatosPos 와 같은 우선순위).
//    ② 불일치 — 자동으로 고치지 않고 **보이기만** 한다(3.47 규격 불일치와 같은 원칙 — 실물을 보기 전에는 확정할 수 없다).
//       실측으로 «터미널이 EDI 계획대로 넣는다» 는 없다 — DXQD 2636E 선적 260 중 160 · DJCT 0224W 60 중 27 이 계획과 다른 **실제** 자리다.
//       그래서 남는 것은 셋뿐이다.
//       'pos'   같은 컨을 검수원은 P 에, 터미널은 Q 에 — 앱은 P 를 쓰고 Q 는 버린다(종전엔 아무 표시 없음).
//       'cell'  같은 자리 P 에 검수원은 X, 터미널은 Y — 종전엔 한 칸에 두 대가 서고 점유는 나중 것이 이겼다.
//       'noterm' 검수원이 찍었는데 터미널이 그 뒤 10분 넘게 모르는 컨 — 끝4 오타(엉뚱한 컨을 찍음)일 수 있다. 터미널 실적이 흐르는 항차에서만 본다.
//    검수원 자리 = records 중 `bay_actual` 이 있고 `_pos_src` 가 없는 행(터미널이 얹은 행은 `_pos_src` 를 단다) — 단 **앱 선적확인이 계획을 베껴 적은 자리**(firebase._markLoadedPos, moves 마지막 why:'loaded')는
//    검수원이 «본» 자리가 아니라 뺀다(감사 지적 — 그걸 검수원 자리로 읽으면 엠티 선적처럼 계획≠실제가 정상인 배에서 수십 칸이 빨갛게 선다). 위치 지정·자리 확인(why:'actual' 등)만 검수원 자리다.
//    반환 { compMap, conflicts:[{type,cn,app,term,key}], warnCells: Map('bay-row-tier' → 'conflict'|'noterm'), termOnly, termAt }
export function bayViewOverlayOf(sec) {
  const comp = (sec && sec.completed) || {}, tw = (sec && sec.termWork) || {}, recs = (sec && sec.records) || {}, edi = (sec && sec.ediContainers) || {};
  const compMap = {};
  let termOnly = 0, termAt = 0;
  for (const [cn, t] of Object.entries(tw)) {
    if (!t || !t.at) continue;
    if (t.at > termAt) termAt = t.at;
    if (!comp[cn]) { compMap[cn] = { at: t.at, src: 'term', by: '' }; if (recs[cn] || edi[cn]) termOnly++; }   // 셈은 리스트·EDI 안 컨만(리스트 밖 시프팅·통과화물 termWork 는 그림에 없다)
  }
  Object.assign(compMap, comp);
  const pad2 = (x) => String(x ?? '').padStart(2, '0');
  const key = (b, r, t) => `${parseInt(b, 10)}-${pad2(r)}-${pad2(t)}`;
  const posOf = (cn) => {
    const r = recs[cn] || {}; const e = edi[cn] || {};
    if (String(r.bay_actual || '').startsWith('__') || r.planTaken) return null;   // 창고·자리 내준 컨은 격자에 없다 — 셈에도 안 넣는다
    const hasA = r.bay_actual !== undefined && r.bay_actual !== null && String(r.bay_actual) !== '';
    const b = hasA ? r.bay_actual : e.bay, ro = hasA ? r.row_actual : e.row, ti = hasA ? r.tier_actual : e.tier;
    return (b == null || b === '' || ro == null || ti == null) ? null : key(b, ro, ti);
  };
  //  검수원이 «본» 자리인가 — 터미널이 얹은 행(_pos_src)은 아니고, 앱 선적확인이 **계획을 그대로 베낀** 자리(moves 마지막 why:'loaded' 이고 그 to 가 EDI 계획 자리)도 아니다.
  //    ⚠ 자리 확인(슬롯) 방식·위치 지정 뒤 선적확인도 마지막 줄은 'loaded' 로 끝난다(감사 실측 firebase._markLoadedPos) — 그때는 to 가 계획과 달라 검수원이 본 자리로 남긴다.
  const seenByApp = (r, cn) => {
    if (!r || r._pos_src) return false;
    const ba = r.bay_actual;
    if (ba == null || ba === '' || String(ba).startsWith('__') || !r.row_actual || !r.tier_actual) return false;
    const mv = Array.isArray(r.moves) ? r.moves : [];
    const last = mv.length ? mv[mv.length - 1] : null;
    if (!(last && last.why === 'loaded')) return true;
    const e = edi[cn] || {};
    const planTo = (e.bay != null && e.bay !== '' && e.row != null && e.tier != null) ? `${pad2(parseInt(e.bay, 10))}-${pad2(e.row)}-${pad2(e.tier)}` : null;
    return !!planTo && String(last.to || '') !== planTo;   // 계획 그대로면 본 것이 아니다 · 계획과 다른 칸이면 사람이 정한 자리다
  };
  const appCell = {};                                  // 검수원이 찍은 자리 → 컨
  for (const [cn, r] of Object.entries(recs)) {
    if (!seenByApp(r, cn)) continue;
    appCell[key(r.bay_actual, r.row_actual, r.tier_actual)] = cn;
  }
  const conflicts = []; const warnCells = new Map(); const seen = new Set();
  const push = (c) => { const id = `${c.type}|${c.cn}|${c.key}`; if (seen.has(id)) return; seen.add(id); conflicts.push(c); warnCells.set(c.key, c.type === 'noterm' ? 'noterm' : 'conflict'); };
  for (const [cn, t] of Object.entries(tw)) {
    if (!t || !t.at) continue;
    const p = parseCatosPos(t.pos); if (!p) continue;
    const tk = key(p.bay, p.row, p.tier);
    const r = recs[cn];
    if (seenByApp(r, cn)) {
      const ak = key(r.bay_actual, r.row_actual, r.tier_actual);
      if (ak !== tk) { push({ type: 'pos', cn, app: ak, term: tk, key: ak }); warnCells.set(tk, 'conflict'); }
    }
    const other = appCell[tk];
    if (other && other !== cn) push({ type: 'cell', cn: other, app: other, term: cn, key: tk });
  }
  if (termAt) {
    for (const [cn, c] of Object.entries(comp)) {
      if (!c || !c.at || isAutoDone(c) || tw[cn]) continue;   // 4.12: 마감 EDI 적용도 «앱은 완료인데 터미널엔 없음» 경고 대상이 아니다(사람이 찍은 게 아니다)
      if (c.at + 10 * 60000 >= termAt) continue;      // 터미널이 아직 그 시각까지 못 왔다 — 정상 지연
      const k = posOf(cn); if (!k) continue;
      push({ type: 'noterm', cn, app: k, term: '', key: k });
    }
  }
  return { compMap, conflicts, warnCells, termOnly, termAt };
}

//  ★ 3.48 «베이뷰 작업» — **따라가기: 터미널이 고른 베이.** 검수사 «사용자가 선택을 안한다면 자동모드로 터미널이 선택한 베이로».
//    수석 보드와 **같은 함수** `craneBoardOf` 한 벌(규범 §4-4) — PCTC 는 컨별 호기(카토스)라 즉시, 동방은 두 호기가 같은 시각 다른 장에 찍힌
//    마지막 바구니(3.47-02 craneBaysByTime)라 실측 10분 안팎 늦는다(2026-09-15 DXQD 09:30 판정 · 09:40 실적은 이미 04번 베이).
//    ★ 4.22-03 — **내 호기가 정해져 있으면 내 호기만 따라간다.** 내 호기 완료가 아직 없으면 bay null — 선택 화면이 손으로 고르게 한다(다른 호기 자리로 떨어지지 않는다).
//      검수사 2026-10-11 MCAP 639N «22번 하는데 30번 베이로 가거나 44번 베이로 이동» — 종전엔 내 호기 자리가 없으면 `boardBaysOf`(모든 호기의 최근 완료가 몰린 장)로 떨어져
//      3호기·4호기 베이로 널뛰었다. 호기가 정해지지 않았을 때만 `boardBaysOf` 로, 그것도 없으면 bay null(조용히 아무 데나 찍지 않는다).
//      Fable 판정(4.22-03 보강) — 내 호기 자리를 못 낼 때 문구를 가른다. 내 호기 줄이 아예 없으면(완료·QC 합계 모두 0) «완료가 아직 없습니다»,
//      줄은 있는데 숫자 베이가 없으면(동방 QC 합계만 있는 줄 · 자리를 못 읽은 완료만) «자리를 아직 모릅니다» — 터미널 대수가 있는데 «완료가 없다»고 말하지 않는다.
//      그 줄 밖에 다른 호기 줄이 하나도 없으면(이 항차에서 일한 호기가 나뿐) 최근 완료가 다른 호기 것일 수 없으니 `boardBaysOf` 로 떨어진다(no 는 내 호기).
//    반환 { bay, tier:'deck'|'hold'|null, mode, at, src, no, why, cranes:[{no,bay,tier,mode,at,src}] }
export function bayViewFollowOf(voyage, equipNo, pages = null, screenMode = '', nowMs = Date.now()) {
  const cranes = [];
  const rows = craneBoardOf(voyage, []);
  for (const c of rows) {
    const m = String(c.bay || '').match(/\d+/); if (!m) continue;
    const t = parseInt(c.tier, 10);
    cranes.push({ no: c.no, bay: parseInt(m[0], 10), tier: Number.isFinite(t) ? (t >= 80 ? 'deck' : 'hold') : null, mode: c.mode || '', at: c.lastAt || 0, src: c.src || '' });
  }
  const no = craneNoAfterSwap((voyage && voyage.info) || {}, crewCraneNo(equipNo), nowMs);
  const mine = no ? cranes.find((c) => c.no === no) : null;
  if (mine) {
    //  화면은 양하인데 내 호기는 선적 중(또는 반대) — 자리는 알려 주되 그 사실을 말한다(아래 칸은 화면 모드의 그림을 그린다).
    const why = (screenMode && mine.mode && mine.mode !== screenMode) ? `${mine.no}호기는 지금 ${mine.mode === 'loading' ? '선적' : '양하'} 중입니다 — 이 화면은 ${screenMode === 'loading' ? '선적' : '양하'}` : '';
    return { ...mine, why, cranes };
  }
  if (no) {
    const myRow = rows.some((c) => c.no === no);
    if (myRow && !rows.some((c) => c.no !== no)) {
      const bb1 = boardBaysOf(voyage, 1, 30, pages);
      if (bb1.length) return { no, bay: parseInt(bb1[0].bay, 10), tier: null, mode: bb1[0].mode, at: bb1[0].lastAt, src: 'recent', cranes, why: `${no}호기 자리를 아직 몰라 최근 완료가 몰린 장으로` };
    }
    return { no, bay: null, tier: null, mode: '', at: 0, src: '', cranes, why: myRow ? `${no}호기 자리를 아직 모릅니다 — 손으로 고르세요` : `${no}호기 완료가 아직 없습니다 — 손으로 고르세요` };
  }
  const bb = boardBaysOf(voyage, 1, 30, pages);
  if (bb.length) {
    return { no: 0, bay: parseInt(bb[0].bay, 10), tier: null, mode: bb[0].mode, at: bb[0].lastAt, src: 'recent', cranes,
      why: '호기가 정해지지 않아 최근 완료가 몰린 장으로' };
  }
  return { no: 0, bay: null, tier: null, mode: '', at: 0, src: '', cranes, why: cranes.length ? `${no || '?'}호기 자리가 아직 없습니다` : '터미널 실적이 아직 없습니다 — 손으로 고르세요' };
}

//  ★ 3.49 «해치커버 자동 판정» — **터미널 실적의 크레인별 타임라인에서 커버 여닫음을 읽는다.** 판정 한 벌(베이뷰 따라가기 자동 기록·비따라가기 알림·연막이 같이 쓴다).
//    검수사 2026-09-15 «보통은 데크 작업이 끝나고 베이 이동이 바로 이루어 지고 양하가 시작되면 커버가 닫힌상태이며 데크 작업 완료후 시간 공백이 어느정도 있고 난후
//      다음 베이를 작업 한다면 그시간에 커버를 열었다고 판단 해야 합니다» · «검수원 입력이 있으면 그건 우선 적용이고 입력이 없다면 따라가기 모드가 아닌 경우엔 알림».
//    실측(보관소 6척) — 컨 한 대 사이클은 1~2분, 커버 작업은 3분 이상 공백으로 갈린다. SWTD 9013E 1호기 양하 데크 끝 11곳 중 10곳이 3~16분 공백,
//      KKLC 2608N 25&27 선적 홀드 끝 04:38 → 타임시트 «닫음 04:45-04:50». DJCT 2호기 장 12 데크 끝 → 2분 → 장 04(안 열림) → 장 04 끝 → 36분 공백 → 장 12 홀드(그때 열림).
//    규칙 — 크레인별로 «런»(같은 장·같은 단·같은 모드 연속)을 세우고
//      열림 = 그 장 양하 데크 런이 끝난 뒤 공백 ≥ GAP 이면 그 공백 [런 끝, 다음 실적], 공백 없이 이동했으면 그 장 홀드 런 시작 직전 공백. 둘 다 없으면 판정 없음(사람에게 남긴다).
//      닫힘 = 그 장 마지막 홀드 런(양하·선적) 끝 뒤 공백 ≥ GAP 이면 그 공백, 없으면 그 장 선적 데크 런 시작 직전 공백. 크레인의 마지막 런이면 [끝, 끝+5분] 추정.
//    동방(컨별 호기 없음) — 호기 표(qcWork)와 «같은 분·다른 장 = 다른 호기(안벽 순서 × 접안 방향 — 3.53-09)» 바구니(3.47-02)로 호기를 붙이고, 그 뒤 같은 장은 그 호기가 잇는다.
//      아직 못 붙인 구간은 장 단위 «추정»(홀드 첫 실적 직전 5분 / 홀드 마지막 직후 5분, src:'est')으로 낸다 — 조용히 틀리느니 표식을 단다.
//    미래 시각(+9h 오염 실측 KKLC 15줄·DXQD 19줄) 실적은 뺀다. 반환 { events:[{hatch, bays, action, from, to, gapMin, crane, mode, src}], rows }
export const HATCH_GAP_MIN = 3;
//  ★ 3.63 — **동방 바구니 호기 붙이기 한 벌**(3.49 hatchEventsOf 안에 있던 것을 그대로 올렸다 — 17시 갱별 보고가 같은 판정을 쓴다).
//    rows = [{at, hatch, crane}] 시각 오름차순. 같은 분에 찍힌 장이 호기 수와 같으면 안벽 순서 × 접안 방향(pairCranesForGroups)으로 장 ↔ 호기를 정하고,
//    그 뒤 같은 장은 그 호기가 잇는다. 아직 못 붙인 행은 crane 0 그대로 둔다(조용히 찍지 않는다). 반환 { first } — 장마다 처음 붙은 호기.
export function basketCranesOf(voyage, rows, nos) {
  const first = {};
  const byMin = new Map();
  for (const r of rows) { const m = Math.floor(r.at / 60000); if (!byMin.has(m)) byMin.set(m, []); byMin.get(m).push(r); }
  const hatchCrane = {};
  //  3.53-07: 장 ↔ 호기는 대수로 짝짓는다(craneBaysByTime 과 같은 pairCranesByCount 한 벌) — 장 대수 = 그 장에 찍힌 실적 수.
  const hatchCount = {};
  for (const r of rows) hatchCount[r.hatch] = (hatchCount[r.hatch] || 0) + 1;
  for (const m of [...byMin.keys()].sort((a, b) => a - b)) {
    const rs = byMin.get(m); const hs = [...new Set(rs.map((r) => r.hatch))].sort((a, b) => a - b);
    if (hs.length === nos.length) {
      const assigned = pairCranesForGroups(voyage, nos, hs.map((h) => hatchCount[h] || 0));   // 3.53-09: 접안 방향이 먼저
      hs.forEach((h, i) => { hatchCrane[h] = assigned[i]; if (!first[h]) first[h] = assigned[i]; });
    }
    for (const r of rs) r.crane = hatchCrane[r.hatch] || 0;
  }
  return { first };
}
export function hatchEventsOf(voyage, pages = null, now = Date.now()) {
  const rows = [];
  //  문지기 — 해치 제외 배(TMPZ·TNJP·RZOR·OBWH·ATPR, 자동 해치·주야간 보고)는 판정 자체를 안 한다. GuidedWorkPanel·WorkReportModal 과 같은 한 벌(isHatchSkipShipInfo).
  if (isHatchSkipShipInfo(voyage && voyage.info)) return { events: [], rows, skipped: 'hatchSkipShip' };
  //  문지기 — 베이사전(pages)이 없으면 판정하지 않는다. hatchEvenOf 폴백(짝수+뒤홀수)은 사전 없는 배에서 뒤홀수를 다른 장으로 쪼개
  //    없는 장을 만든다(감사 실측: SWTD 사전 있음 16건/8장 → 없으면 23건/15장). 없는 사건을 적느니 안 적는다.
  if (!pages || !pages.length) return { events: [], rows, skipped: 'noDict' };
  //  작업이 끝난 항차(workEndAt)는 그 뒤 2시간 넘는 실적을 안 받는다 — +9h 오염 실적(KKLC 07:xx~11:xx)이 끝난 배의 마지막 커버를 덮어쓰지 않게.
  const endMs = (() => { const w = voyage && voyage.info && voyage.info.workEndAt; if (!w) return null; const t = Date.parse(String(w).replace(' ', 'T') + '+09:00'); return Number.isFinite(t) ? t + 2 * 3600000 : null; })();
  for (const mode of ['discharge', 'loading']) {
    const tw = (voyage && voyage[mode] && voyage[mode].termWork) || {};
    for (const [cn, r] of Object.entries(tw)) {
      if (!r || !r.at || r.at > now + 5 * 60000 || (endMs && r.at > endMs)) continue;
      const p = parseCatosPos(r.pos); if (!p) continue;
      const bay = parseInt(p.bay, 10), tier = parseInt(p.tier, 10);
      if (!(bay > 0)) continue;
      rows.push({ cn, at: r.at, mode, bay, hatch: hatchEvenOf(bay, pages) ?? bay, deck: tier >= 80, crane: crewCraneNo(r.equip) || 0 });
    }
  }
  rows.sort((a, b) => a.at - b.at || a.bay - b.bay);
  const out = { events: [], rows };
  if (!rows.length) return out;
  if (!rows.some((r) => r.crane)) {
    //  동방 — 바구니로 호기 붙이기(같은 분에 서로 다른 장 = 호기 수만큼이면 안벽 순서 × 접안 방향으로 — 3.53-09 pairCranesForGroups 한 벌)
    const nos = Object.entries((voyage && voyage.info && voyage.info.qcWork) || {}).filter(([k, q]) => !isRampQcKey(k, q)).map(([, q]) => crewCraneNo(q && q.qc)).filter(Boolean).sort((a, b) => a - b);   // 4.77: 램프 제외
    if (nos.length >= 2) basketCranesOf(voyage, rows, nos);   // 3.63: 바구니 붙이기 한 벌(17시 갱별 보고와 같이 쓴다)
  }
  const GAP = HATCH_GAP_MIN * 60000;
  const baysOf = (h) => [...new Set(rows.filter((r) => r.hatch === h).map((r) => r.bay))].sort((a, b) => a - b);
  //  홀드 잔여 — 장별 «평택분 EDI 홀드 컨 − (앱 완료 ∪ 터미널 실적)». 양하는 POD 평택(isPtk), 선적은 올라온 컨 전부(수집기가 이미 평택분만 올린다 — shouldAskHatchClose ②와 같다).
  //    선적 자료를 모르면(자리 있는 선적 컨 0) 또는 자리 모르는 선적이 남아 있으면 «모름» → 끝났다고 보지 않는다(검수사 «모를 때는 묻지 않는다» — 실을 게 남았는데 닫는 것은 사고).
  //    항차가 끝났으면(workEndAt·inspectorDone·양쪽 완료) 잔여를 따지지 않는다.
  //  항차 끝 표식 — HomePage.isAllDone 과 같은 규칙(보유 모드만 따진다: 선적만 있는 항차는 loadingDone 하나로 끝).
  const finishedAll = (() => {
    const inf = (voyage && voyage.info) || {};
    if (inf.workEndAt || inf.inspectorDone) return true;
    return inspectorAllDone(voyage);   // 4.55-01: 한 벌(선적 EDI 대기 배는 «선적 있음»)
  })();
  const holdLeft = new Map(), holdTotal = new Map(); let loadPlaced = 0, loadUnplaced = 0, dischargeEdi = 0;
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    //  «했다» = 앱 완료 ∪ 시각(at) 있는 터미널 실적. at 없는 termWork 행은 CATOS Booking(아직 안 한 예약)이라 완료가 아니다(2차 감사 실측: SWTD 9012E 918행 중 94행이 Booking·전부 홀드).
    const done = new Set([...Object.keys(sec.completed || {}), ...Object.entries(sec.termWork || {}).filter(([, r]) => r && r.at).map(([cn]) => cn)]);
    const edi = sec.ediContainers || {};
    for (const c of Object.values(edi)) {
      if (!c) continue;
      const b = parseInt(c.bay, 10), t = parseInt(c.tier, 10);
      if (mode === 'discharge') dischargeEdi++;
      if (mode === 'loading') { if (b > 0 && t > 0) loadPlaced++; else if (!done.has(c.cn)) loadUnplaced++; }
      if (!(b > 0) || !(t > 0) || t >= 80) continue;
      if (mode === 'discharge' && !isPtk(c, mode)) continue;
      const h = hatchEvenOf(b, pages) ?? b;
      holdTotal.set(h, (holdTotal.get(h) || 0) + 1);
      if (!done.has(c.cn)) holdLeft.set(h, (holdLeft.get(h) || 0) + 1);
    }
    //  리스트만 온 선적(records 에만 있고 EDI 자리 없음)이 남아 있으면 «어디 실릴지 모름» — shouldAskHatchClose ④ 와 같은 보수.
    if (mode === 'loading') for (const cn of ownDirCns(sec.records || {}, 'loading')) { if (!edi[cn] && !done.has(cn)) loadUnplaced++; }
  }
  //  «끝났다» = 그 장에 EDI 가 아는 홀드 컨이 있고(0 이면 «모름», 1.82-01 이 막은 «자료 없음 = 없음» 구멍의 거울상) 잔여 0 ·
  //    양하 실적이 흐르는데 양하 EDI 가 없으면 «모름»(선적만 있는 항차는 양하 EDI 를 요구하지 않는다 — 2차 감사) · 선적 자료를 앎. 항차 끝 표식이면 그대로 끝.
  const loadKnown = loadPlaced > 0 && loadUnplaced === 0;
  const dischargeKnown = dischargeEdi > 0 || !rows.some((r) => r.mode === 'discharge');
  const holdFinished = (h) => finishedAll || ((holdTotal.get(h) || 0) > 0 && (holdLeft.get(h) || 0) === 0 && dischargeKnown && loadKnown);
  out.holdLeft = holdLeft; out.holdTotal = holdTotal; out.loadKnown = loadKnown; out.finishedAll = finishedAll;
  const seen = new Set();
  const push = (ev) => { const k = `${ev.hatch}|${ev.action}`; if (seen.has(k)) return; seen.add(k); out.events.push(ev); };
  //  크레인별 «런» — 같은 장·같은 단·같은 모드가 이어지는 구간. gb/ga = 그 크레인 안에서 앞·뒤 런까지의 공백(첫/마지막 런은 null).
  const cranes = [...new Set(rows.map((r) => r.crane).filter(Boolean))].sort((a, b) => a - b);
  const allRuns = [];
  for (const no of cranes) {
    const runs = [];
    for (const r of rows.filter((x) => x.crane === no)) {
      const last = runs[runs.length - 1];
      if (last && last.hatch === r.hatch && last.deck === r.deck && last.mode === r.mode) { last.end = r.at; last.n++; }
      else runs.push({ hatch: r.hatch, deck: r.deck, mode: r.mode, start: r.at, end: r.at, n: 1, crane: no, gb: null, ga: null });
    }
    for (let i = 0; i < runs.length; i++) { if (i > 0) runs[i].gb = runs[i].start - runs[i - 1].end; if (i + 1 < runs.length) runs[i].ga = runs[i + 1].start - runs[i].end; }
    allRuns.push(...runs);
  }
  allRuns.sort((a, b) => a.start - b.start);
  //  장 단위 판정(크레인을 가로질러) — 데크 런은 **홀드 첫 런 직전에 끝난 마지막 양하 데크 런**만 본다. 동방 바구니 호기 붙이기는 낱개 오귀속이 있어
  //    (KKLC 실측: 1호기 장 26 작업 중에 장 30 «1대» 런이 끼어 그 뒤 6분 공백을 장 30 커버로 잘못 읽었다 — 진짜 장 30 데크는 2호기 01:09~01:41)
  //    낱개 런의 직후 공백을 커버로 읽지 않게 한다.
  for (const h of [...new Set(allRuns.map((r) => r.hatch))].sort((a, b) => a - b)) {
    const holds = allRuns.filter((r) => r.hatch === h && !r.deck);
    const deckD = allRuns.filter((r) => r.hatch === h && r.deck && r.mode === 'discharge');
    //  열림 — ① 검수사 규칙: 양하 데크 런 끝 뒤 공백 ≥ GAP 이면 그 공백(다음 베이로 갔어도) ② 공백 없이 바로 이동했으면 그 장 홀드 첫 런 «직전» 공백 ≥ GAP(그 홀드에 들어간 크레인).
    if (holds.length) {
      const first = holds[0];
      const dRun = deckD.filter((r) => r.end <= first.start).sort((a, b) => a.end - b.end).pop() || null;
      if (dRun && dRun.ga != null && dRun.ga >= GAP) push({ hatch: h, bays: baysOf(h), action: 'open', from: dRun.end, to: dRun.end + dRun.ga, gapMin: Math.round(dRun.ga / 60000), crane: dRun.crane, mode: 'discharge', src: 'term' });
      else if (first.gb != null && first.gb >= GAP) push({ hatch: h, bays: baysOf(h), action: 'open', from: first.start - first.gb, to: first.start, gapMin: Math.round(first.gb / 60000), crane: first.crane, mode: first.mode, src: 'term' });
      //  닫힘 — **홀드가 끝났다는 증거가 있을 때만**(감사 치명 지적: 실시간에는 지금 하는 홀드 런이 늘 «마지막 런»이라 홀드 첫 컨에 닫힘이 나왔다).
      //    증거 = 그 장 위 선적 데크 런이 시작됐다(커버 없이는 못 싣는다) 또는 그 장 홀드 잔여(평택분 EDI − 완료∪실적)가 0 이고 선적 자료를 안다(GuidedWorkPanel.shouldAskHatchClose 와 같은 보수).
      //    시각 = 마지막 홀드 런 직후 공백 ≥ GAP(그 크레인이 닫고 이동) · 크레인의 마지막 런이면 «지금»까지 공백 ≥ GAP 일 때 +5분 추정 · 아니면 선적 데크 런 직전 공백.
      const last = holds.reduce((m, r) => (r.end > m.end ? r : m), holds[0]);
      const dl = allRuns.find((r) => r.hatch === h && r.deck && r.mode === 'loading' && r.start > last.end);
      if (!rows.some((r) => r.hatch === h && !r.deck && r.at > last.end) && (dl || holdFinished(h))) {
        if (last.ga == null) { if (now - last.end >= GAP) push({ hatch: h, bays: baysOf(h), action: 'close', from: last.end, to: last.end + 5 * 60000, gapMin: 5, crane: last.crane, mode: last.mode, src: 'est' }); }
        else if (last.ga >= GAP) push({ hatch: h, bays: baysOf(h), action: 'close', from: last.end, to: last.end + last.ga, gapMin: Math.round(last.ga / 60000), crane: last.crane, mode: last.mode, src: 'term' });
        else if (dl && dl.gb != null && dl.gb >= GAP) push({ hatch: h, bays: baysOf(h), action: 'close', from: dl.start - dl.gb, to: dl.start, gapMin: Math.round(dl.gb / 60000), crane: dl.crane, mode: 'loading', src: 'term' });
        //  4.77 — 짝을 못 이룬 닫힘도 화물로 안다: 열려 있는 장(홀드 작업이 있었다) 위 데크에 선적이 시작됐으면 닫은 것이다(검수사 2026-11-08 «열려있는데 데크에 선적 하였다면 닫은것입니다»).
        //    공백이 없어도(바로 이어 싣기) 선적 데크 첫 실적 직전 5분을 추정 시각으로 쓴다.
        else if (dl && !seen.has(`${h}|close`)) push({ hatch: h, bays: baysOf(h), action: 'close', from: Math.max(last.end, dl.start - 5 * 60000), to: dl.start, gapMin: Math.max(1, Math.round((dl.start - Math.max(last.end, dl.start - 5 * 60000)) / 60000)), crane: dl.crane, mode: 'loading', src: 'est' });
      }
      //  4.77 — 열림도 화물로 안다: 그 장 홀드를 양하(또는 선적)했다면 커버는 열린 것이다. 공백이 없어 위 두 줄이 못 잡은 장만 홀드 첫 실적 직전 5분으로 채운다.
      if (!seen.has(`${h}|open`)) push({ hatch: h, bays: baysOf(h), action: 'open', from: first.start - 5 * 60000, to: first.start, gapMin: 5, crane: first.crane, mode: first.mode, src: 'est' });
    }
  }
  //  호기를 못 붙인 행(동방 초반 등) — 장 단위 추정. 크레인 판정이 이미 낸 장은 건너뛴다(seen).
  const orphan = rows.filter((r) => !r.crane);
  if (orphan.length) {
    const hatches = [...new Set(orphan.map((r) => r.hatch))];
    for (const h of hatches) {
      const all = rows.filter((r) => r.hatch === h);
      const deckD = all.filter((r) => r.deck && r.mode === 'discharge').map((r) => r.at);
      const hold = all.filter((r) => !r.deck).map((r) => r.at);
      if (deckD.length && hold.length) {
        const firstHold = Math.min(...hold.filter((t) => t > Math.min(...deckD)));
        if (Number.isFinite(firstHold)) push({ hatch: h, bays: baysOf(h), action: 'open', from: firstHold - 5 * 60000, to: firstHold, gapMin: 5, crane: 0, mode: 'discharge', src: 'est' });
      }
      if (hold.length) {
        const lastHold = Math.max(...hold);
        const deckL = all.filter((r) => r.deck && r.mode === 'loading' && r.at > lastHold).map((r) => r.at);
        //  같은 증거 문지기 — 선적 데크가 시작됐거나 홀드 잔여 0. 그리고 «지금»까지 공백 ≥ GAP(막 찍힌 홀드 컨을 닫힘으로 읽지 않게).
        if ((deckL.length || holdFinished(h)) && now - lastHold >= GAP) {
          const to = deckL.length ? Math.min(...deckL) : lastHold + 5 * 60000;
          push({ hatch: h, bays: baysOf(h), action: 'close', from: lastHold, to, gapMin: Math.round((to - lastHold) / 60000), crane: 0, mode: deckL.length ? 'loading' : 'discharge', src: 'est' });
        }
      }
    }
  }
  //  공백이 길면(식사·다른 배로 이동) 사건은 그 첫머리다 — 표시 끝은 15분으로 자르고 실제 공백은 gapMin 에 남긴다.
  for (const e of out.events) if (e.to - e.from > 15 * 60000) e.to = e.from + 15 * 60000;
  out.events.sort((a, b) => a.from - b.from);
  return out;
}

//  ★ 4.10 — **해치커버 장수 «상세» 한 벌.** 4.09 까지 hatchPanelCountOf 가 숫자 하나만 돌려줘 보고 직전에 검수사가 «맞는가» 를 볼 수 없었다
//    (검수사 2026-10-07 «해치커버 문제도 보고 직전에 커버 장수를 맞는지 확인하고 보고 … 무심코 보고 했다가 6장 오픈을 보고 했으니까요»).
//    계산은 3.49 hatchPanelCountOf 본문 그대로다 — 숫자(count)는 그 함수가 돌려주던 값과 같고(hatchPanelCountOf 가 이 함수의 count 를 돌려준다),
//    같은 계산에서 나온 장별 내용(groups)과 사전 최대(max)·출처(source)를 같이 낸다.
//    source — 'calc' 열어야 할 장을 자료(EDI·사전)로 센 값 · 'dict' 자료로 못 세어 사전 hatchCount 합으로 돌아간 값 · 'none' 못 셈(count 0).
//    max — 사전상 이 베이들이 가질 수 있는 최대 장수(그룹별 total 합). 장수가 max 를 넘으면 틀린 것이다(옛 6장 오류가 이 모양).
//    사전 hatchCount 를 «같은 해치 묶음끼리는 최댓값, 묶음끼리는 합» 으로 센 값 — 자료(EDI)와 무관한 값이라 장수의 독립 상한이 된다.
//    ⚠ 묶음은 부르는 쪽의 groupCenterOf(= 자동 가이드가 «이 그룹» 을 정한 바로 그 함수)로 가른다. hatchOpenable 의 묶음(coverGroupOf)과 다른 기준이라야
//      묶음 판정이 틀렸을 때(옛 6장 오류: 같은 해치를 베이마다 따로 셈) count 가 이 상한을 넘어 경고가 걸린다.
function _dictHatchSum(dictEntry, bays, groupCenterOf, withCenter = false) {
  const summary = dictEntry?.bayDef?.baysSummary;
  if (!Array.isArray(summary) || !summary.length) return { found: false, total: 0 };
  const byNo = {};
  summary.forEach(bs => { const no = String(parseInt(bs.bayNo ?? bs.bay, 10)); if (Number.isFinite(parseInt(no,10))) byNo[no] = bs; });
  // groupCenter별로 hatchCount 최댓값을 모은 뒤, 그룹 간 합산
  const byGroup = {};
  let found = false;
  bays.forEach(b => {
    const bs = byNo[String(parseInt(b, 10))];
    if (bs && typeof bs.hatchCount === 'number') {
      found = true;
      const g = String(groupCenterOf(b));
      let h = bs.hatchCount;
      //  4.10 감사 지적(중-1): 묶음 중심 베이의 사전 장수도 후보다. DJCT 사전 23:0 24:2 25:1 처럼 홀수 베이가 중심보다 작으면 25번만 입력해도 4.07-03 이 중심(24)의 2장을 읽어 count=2 가 맞는데,
      //    상한이 1 로 나와 «사전보다 많습니다» 가 헛경고로 떴다. 상한(max)에만 쓰고 count 의 사전 대체 경로(4.09 와 같은 값)에는 쓰지 않는다.
      if (withCenter) { const cb = byNo[String(parseInt(g, 10))]; if (cb && typeof cb.hatchCount === 'number') h = Math.max(h, cb.hatchCount); }
      byGroup[g] = Math.max(byGroup[g] || 0, h);
    }
  });
  return { found, total: Object.values(byGroup).reduce((s, v) => s + v, 0) };
}
//  ★ 4.76 — **닫을 때 장수 = 그 베이 커버를 연 보고의 합 − 이미 닫은 보고의 합.**
//  검수사 2026-11-08 «14번베이 커버를 수동으로 1장씩 텀을두고 열었는데 닫을때는 2장이 닫혀야 하는데 인지를 못한듯» — KKLC 2610N 14번 홀드는 20:31 1장 + 20:48 1장으로 열렸는데(합 2),
//  닫을 때 앱은 사전에 hatchCount 가 없어 기본 1장으로 안내했다. 연 합이 있으면 그것이 닫을 장수다(사전은 합이 없을 때만). 열린 보고가 없거나 다 닫혔으면 0.
export function hatchOpenedNetOf(voyage, bays) {
  const want = new Set((bays || []).map((b) => parseInt(b, 10)).filter((n) => n > 0));
  if (!want.size) return 0;
  //  4.77 — 앱이 화물 순서로 «추정»해 적은 자동 보고(auto + src 'est')는 보조다: 같은 쪽(열림/닫힘)에 검수원 보고나 터미널 공백으로 잡은 보고(est 아닌 것)가 하나라도 있으면 추정은 합에서 뺀다 —
  //    잘못 추정한 열림이 사람 보고와 겹쳐 닫는 장수를 부풀리지 않게. 추정뿐이면 추정 합을 쓴다.
  const sums = { open: { real: 0, est: 0 }, close: { real: 0, est: 0 } };
  for (const r of Object.values((voyage && voyage.reports) || {})) {
    if (!r || r.type !== 'hatch') continue;
    const rb = (Array.isArray(r.bays) ? r.bays : []).map((b) => parseInt(b, 10));
    if (!rb.some((n) => want.has(n))) continue;
    const n = Number(r.panelCount) > 0 ? Number(r.panelCount) : 0;
    const act = String(r.action || '').toLowerCase();
    if (act !== 'open' && act !== 'close') continue;
    sums[act][r.auto && r.src === 'est' ? 'est' : 'real'] += n;
  }
  const opened = sums.open.real > 0 ? sums.open.real : sums.open.est;
  const closed = sums.close.real > 0 ? sums.close.real : sums.close.est;
  return Math.max(0, opened - closed);
}
export function hatchPanelDetailOf(voyage, mode, bays, dictEntry, groupCenterOf, action) {
  const out = { count: 0, source: 'none', max: 0, groups: [] };
  //  4.76: 닫는 보고는 «연 합 − 닫은 합» 이 먼저다. 사전·계산은 합이 없을 때만.
  if (String(action || '').toLowerCase() === 'close') {
    const _net = hatchOpenedNetOf(voyage, bays);
    if (_net > 0) { out.count = _net; out.source = 'opened'; out.max = _net; return out; }
  }
  let _byG = null;
  try {
    /* 2.98-12 (메모 «21 (22)23번베이 해치 커버 열면 6장?») — 트리오는 **같은 물리 커버**라
       베이마다 다시 세면 2+2+2=6 이 된다. V7.99-6 이 잡았던 그 병을 2.88-01 합산이 되살렸다.
       hatchOpenable 이 정규화한 그룹(r.group)당 **한 번만** 센다. */
    /* 감사 지적(2.98-12): 대표를 «입력 첫 베이»로 잡으면 사전 장수가 베이마다 다른 배에서
       모르는 베이의 기본값(total=1)이 아는 베이의 답을 밀어낸다(MCAP 21:0/22:3/23:0).
       반대형도 실재한다 — STMJ 사전 9:2/10:1 인데 현장 실측(kakaoWorkLog «09&11 은 2장»)은 2장.
       ⇒ 대표는 **아는 쪽** — total 큰 답 우선(1.69-07 «더 큰 hatchCount 로 올린다, 내림 없음»과
       같은 벌), 같으면 그룹 중심(b === r.group) 우선. */
    _byG = new Map();
    const _bayOf = new Map();   // 4.10: 그룹별로 입력된 베이 번호(화면에 «이 그룹의 어느 베이» 를 보이려고)
    for (const b of (bays || [])) {
      const bn = parseInt(b, 10);
      const r = hatchOpenableFor(voyage, mode, bn, dictEntry);
      if (!r) continue;
      const g = r.group ?? bn;
      if (!_bayOf.has(g)) _bayOf.set(g, []);
      if (Number.isFinite(bn) && !_bayOf.get(g).includes(bn)) _bayOf.get(g).push(bn);
      const cur = _byG.get(g);
      if (!cur || r.total > cur.total || (r.total === cur.total && bn === g)) _byG.set(g, r);
    }
    out.groups = [..._byG.entries()].map(([g, r]) => ({
      group: g, bays: (_bayOf.get(g) || []).slice().sort((a, b) => a - b),
      total: r.total, openable: r.openable, needed: r.needed ?? r.openable,
      panels: (r.panels || []).map((x) => ({ idx: x.idx, blocked: !!x.blocked, nBlock: (x.blockers || []).length, nHold: (x.holdWork || []).length })),
    }));
    //  상한 — 사전 hatchCount 합(독립). 사전이 없으면 그룹별 total 합으로 대신한다.
    let _dm = 0; try { const r = _dictHatchSum(dictEntry, bays || [], groupCenterOf, true); if (r.found) _dm = r.total; } catch (e) { _dm = 0; }
    out.max = _dm > 0 ? _dm : out.groups.reduce((s, x) => s + x.total, 0);
    //  3.2-01 (김성일 메모 «1장이면 되는데 2장오픈»): 열 수 있는 장(openable)이 아니라 **열어야 할 장**(needed).
    const _open = out.groups.reduce((s, x) => s + x.needed, 0);
    if (_open > 0) { out.count = _open; out.source = 'calc'; return out; }
  } catch (e) { /* 아래 종전 경로 */ }
  try {
    const { found, total } = _dictHatchSum(dictEntry, bays, groupCenterOf);
    out.count = found ? total : 0;
    if (out.count > 0) { out.source = 'dict'; out.max = Math.max(out.max, out.count); }
    return out;
  } catch (e) { return out; }
}

//  ★ 3.49 — **해치커버 장수 한 벌.** GuidedWorkPanel.hatchPanelsOf 본문을 그대로 옮겼다(자동 판정 기록·알림 배너가 같은 수를 쓴다). dictEntry = getShipBayDictData(imo, name), groupCenterOf = bayGroupCenter(bay, bayPairs).
//   4.10: 계산 본문은 hatchPanelDetailOf 로 옮겼고 이 함수는 그 count 만 돌려준다(값은 4.09 와 같다 — 판정이 두 벌이 되지 않게).
export function hatchPanelCountOf(voyage, mode, bays, dictEntry, groupCenterOf, action) {
  return hatchPanelDetailOf(voyage, mode, bays, dictEntry, groupCenterOf, action).count;
}

//  ★ 4.10 — 보고 직전 «이 장수가 맞는가» 경고 한 벌. detail = hatchPanelDetailOf 결과, chosen = 보고하려는 장수(검수사가 고른 값, 아직 안 골랐으면 null).
//    level 'block' = 고르기 전에는 보고할 수 없다 · 'warn' = 경고하되 보고는 할 수 있다 · 'info' = 참고.
export function hatchCountFlags(detail, chosen) {
  const d = detail || { count: 0, source: 'none', max: 0 };
  const flags = [];
  const n = Number.isFinite(Number(chosen)) && Number(chosen) > 0 ? Number(chosen) : null;
  if (d.source === 'none' || !(d.count > 0)) flags.push({ key: 'none', level: n == null ? 'block' : 'warn', text: '앱이 장수를 계산하지 못했습니다(베이사전·EDI 자료 없음). 현장에서 연 장수를 직접 고르십시오.' });
  else if (d.source === 'dict') flags.push({ key: 'dict', level: 'warn', text: `열어야 할 장을 자료로 세지 못해 베이사전 장수(${d.count}장)를 썼습니다. 맞는지 확인하십시오.` });
  if (n != null && d.source === 'opened' && n > d.count) flags.push({ key: 'over', level: 'warn', text: `이 커버를 연 보고의 합은 ${d.count}장입니다. ${n}장은 연 장수보다 많습니다.` });
  else if (n != null && d.max > 0 && n > d.max) flags.push({ key: 'over', level: 'warn', text: `베이사전상 이 커버는 최대 ${d.max}장입니다. ${n}장은 사전보다 많습니다.` });
  if (n != null && d.count > 0 && n !== d.count) flags.push({ key: 'changed', level: 'info', text: `앱이 센 장수는 ${d.count}장입니다. 직접 고친 값(${n}장)으로 보고합니다.` });
  return flags;
}

//  ★ 3.49 — **보고된 커버 상태 한 벌.** reports(type 'hatch')를 장 단위로 접어 «이 장·이 동작이 이미 보고됐는가»를 답한다.
//    검수원 입력(auto 아님)이 있으면 그것이 우선이고 자동 기록도 여기서 같이 보인다. 반환 Map(`${hatch}|${action}` → {ts, auto, manual})
export const hatchReportTs = (r) => ((r && r.auto && Number(r.eventTs) > 0) ? Number(r.eventTs) : (Number(r && r.ts) || 0));   // 3.49: 보고의 «사건 시각» 한 벌 — 자동 기록은 적힌 때가 아니라 공백 첫머리(eventTs). 타임시트·카톡 대조·미르 답이 같이 쓴다.
export function hatchReportedOf(voyage, pages = null) {
  const m = new Map();
  for (const r of Object.values((voyage && voyage.reports) || {})) {
    if (!r || r.type !== 'hatch') continue;
    const act = String(r.action || '').toLowerCase();
    for (const b of (Array.isArray(r.bays) ? r.bays : [])) {
      const n = parseInt(b, 10); if (!(n > 0)) continue;
      const h = hatchEvenOf(n, pages) ?? n;
      const k = `${h}|${act}`; const cur = m.get(k) || { ts: 0, auto: false, manual: false };
      cur.ts = Math.max(cur.ts, hatchReportTs(r)); if (r.auto) cur.auto = true; else cur.manual = true;
      m.set(k, cur);
    }
  }
  return m;
}

//  ★ 4.46 — **작업 보고 고치기·지우기 판정 한 벌.** 검수사 2026-10-23 15:31 «잘못된 보고는 수정이 가능해야 합니다. 만약 14번 해치인데 10번 해치로 잘못기재 하거나 할때 수정내용을 기록할수 있게» ·
//    2026-10-24 08:46 «잘못된 보고 수정기능은 보고자만 수정또는 삭제 할수 있게».
//    누가 — 그 보고를 보낸 사람(r.by)만. 보낸 사람 이름이 없는 옛 보고(4.46 전 — 보관 446건 중 이름 14건)는 아무도 못 고친다.
//    화면(단추를 보일지)과 저장하는 자리(firebase.fbEditWorkReport · fbDeleteMyWorkReport)가 이 함수를 같이 부른다 — 문지기는 쓰는 자리에.
//    보고 시각(ts)은 고치지 않는다(«내용만»). 카톡은 다시 보내지 않는다(«기록만 고친다»).
export function canEditReport(r, me) {
  const by = String((r && r.by) || '').trim(), who = String(me || '').trim();
  return !!(r && r.type !== 'hold_event' && by && who && by === who);   // 4.78: 보류 기록(hold_event)은 보관용이라 고치지도 지우지도 않는다
}

/** 보고 종류마다 고칠 수 있는 칸. 없는 종류(daynight 등)는 못 고친다(지우기만). */
export const REPORT_EDIT_FIELDS = {
  hatch: ['equip', 'action', 'bays', 'panelCount', 'mode'],
  work_status: ['equip', 'mode', 'reason'],
  conbox: ['equip', 'conBoxType', 'conBoxCount'],
  external_pause: ['reason'],
};
/** 사진 보고(데미지·실오류)는 사진 기록(photos·photoIndex — 마감 텔리 DAMAGE 시트)과 묶여 있어 보고만 고치거나 지우면 둘이 갈린다(독립 감사 중-4) — 여기서는 고치지도 지우지도 않는다. */
export const REPORT_PHOTO_TYPES = ['damage', 'seal_error'];

/** 베이 칸은 숫자만 — «10번베이» → ['10'] · «11-13» → ['11','13'] · «01, 04 07» → ['01','04','07'].
 *  실측 보관 22건(XTPG 545E «10번베이» · NSDC 2608N «22번베이» · PCSZ 2631E «30번베이» · DXQD 2631E «11-13»)이 타임시트에 글자째 찍혔다. */
export function cleanReportBays(v) {
  const toks = Array.isArray(v) ? v.map((x) => String(x == null ? '' : x)) : String(v == null ? '' : v).split(/[,\s]+/);
  const out = [];
  for (const t of toks) for (const d of (t.match(/\d+/g) || [])) if (!out.includes(d)) out.push(d);
  return out;
}

/** 작업 상태 보고의 작업(양하·선적)과 동작(start·pause·resume·done). 옛 'load_start' 도 선적으로 읽는다. */
export function workStatusParts(r) {
  const a = String((r && r.action) || '');
  const m = /^(discharge|loading|load)_(start|pause|resume|done)$/.exec(a);
  if (!m) return null;
  return { mode: m[1] === 'load' ? 'loading' : m[1], verb: m[2] };
}

const _REPORT_FIELD_LABEL = { equip: '호기', action: '동작', bays: '베이', panelCount: '장수', mode: '작업', reason: '사유', conBoxType: '규격', conBoxCount: '개수' };
const _reportFieldText = (k, v) => {
  if (v == null || v === '') return '없음';
  if (k === 'bays') return (Array.isArray(v) ? v : [v]).join(', ');
  if (k === 'action') return String(v).toUpperCase();
  if (k === 'mode') return v === 'loading' ? '선적' : v === 'discharge' ? '양하' : String(v);
  if (k === 'panelCount') return `${v}장`;
  if (k === 'conBoxType') return `${v}자`;
  if (k === 'conBoxCount') return `${v}개`;
  return String(v);
};
/** «베이 10번베이 → 10 · 호기 2호기 → 3호기» — 저장 전 확인 줄과 «수정됨» 줄이 같이 쓴다. */
export function reportEditSummary(from, to) {
  const ks = Object.keys(to || {});
  return ks.map((k) => `${_REPORT_FIELD_LABEL[k] || k} ${_reportFieldText(k, (from || {})[k])} → ${_reportFieldText(k, to[k])}`).join(' · ');
}

/** 고친 보고를 만든다(쓰기 없음). patch 는 화면에서 고른 값. 바뀐 것이 없으면 null.
 *  돌려주는 next — 고친 칸 · 처음 고칠 때 원래 값 한 번(orig) · 고칠 때마다 쌓는 edits({at, by, from, to}). message 는 부르는 쪽이 다시 쓴다(kakaoShare 한 벌). */
export function applyReportEdit(r, patch, { me = '', at = Date.now() } = {}) {
  if (!r) return null;
  const fields = REPORT_EDIT_FIELDS[r.type] || [];
  const ws = r.type === 'work_status' ? workStatusParts(r) : null;
  const cur = (k) => (k === 'mode' && ws ? ws.mode : r[k]);
  const norm = (k, v) => {
    if (k === 'bays') return cleanReportBays(v);
    if (k === 'panelCount' || k === 'conBoxCount') { const n = parseInt(v, 10); return n > 0 ? n : null; }
    if (k === 'action') return String(v || '').toLowerCase();
    return String(v == null ? '' : v).trim();
  };
  //  베이는 저장된 원래 글자와 견준다 — «10번베이» 를 10 으로 바로잡는 것도 고침이다
  const same = (k, a, b) => (k === 'bays' ? JSON.stringify((Array.isArray(a) ? a : [a]).filter((x) => x != null).map(String)) === JSON.stringify(b) : String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim());   // 사유 끝 빈칸(«양하재개 » 보관 8건)은 고침이 아니다
  const from = {}, to = {};
  for (const k of fields) {
    if (!patch || !(k in patch)) continue;
    if (k === 'reason' && r.type === 'work_status' && !(ws && ws.verb === 'pause')) continue;   // 사유는 중단 보고만
    const v = norm(k, patch[k]);
    if (k === 'bays' && !v.length) continue;            // 베이를 비울 수는 없다 — 지우려면 지우기
    if ((k === 'panelCount' || k === 'conBoxCount') && v == null) continue;
    if (k === 'action' && !/^(open|close)$/.test(v)) continue;
    if (k === 'mode' && !/^(discharge|loading)$/.test(v)) continue;
    if (same(k, cur(k), v)) continue;
    from[k] = cur(k) == null ? '' : cur(k); to[k] = v;
  }
  if (!Object.keys(to).length) return null;
  const next = { ...r };
  for (const [k, v] of Object.entries(to)) next[k] = v;
  if (ws && to.mode) next.action = `${to.mode}_${ws.verb}`;   // 작업을 바꾸면 동작 이름도 그 작업으로(타임시트·미르가 action 을 본다)
  if (!r.orig) {
    const o = {};
    for (const k of [...fields, 'action', 'message']) if (r[k] !== undefined) o[k] = r[k];
    next.orig = o;
  }
  const prevEdits = Array.isArray(r.edits) ? r.edits : (r.edits && typeof r.edits === 'object' ? Object.values(r.edits) : []);   // RTDB 가 배열을 객체로 돌려줄 때도 앞 고침을 버리지 않는다
  next.edits = [...prevEdits, { at, by: String(me || ''), from, to }];
  return next;
}

/** 진행 중인 작업 줄(activeWork/{항차}/{호기}/{작업})이 남은 보고로 보면 어때야 하는가.
 *  그 호기·작업의 마지막 작업 상태 보고 — 시작·재개 → 'running' · 중단 → 'paused'(사유) · 완료나 보고 없음 → null. */
export function activeWorkStateFromReports(reports, equip, mode) {
  let last = null, lastTs = -1;
  for (const r of Object.values(reports || {})) {
    if (!r || r.type !== 'work_status' || String(r.equip || '') !== String(equip || '')) continue;
    const p = workStatusParts(r);
    if (!p || p.mode !== mode) continue;
    const ts = Number(r.ts) || 0;
    if (ts >= lastTs) { lastTs = ts; last = { r, p }; }
  }
  if (!last || last.p.verb === 'done') return null;
  return last.p.verb === 'pause' ? { status: 'paused', pauseReason: last.r.reason || '', at: lastTs } : { status: 'running', at: lastTs };
}

/** 그 보고가 그 호기·작업의 마지막 작업 상태 보고인가 — 진행 중인 작업 줄을 고칠지 가른다(옛 보고를 고쳐 지금 상태를 흔들지 않게). */
export function isLastWorkStatusOfSlot(reports, rep) {
  const p = rep && rep.type === 'work_status' ? workStatusParts(rep) : null;
  if (!p) return false;
  let lastTs = -1;
  for (const r of Object.values(reports || {})) {
    if (!r || r.type !== 'work_status' || String(r.equip || '') !== String(rep.equip || '')) continue;
    const q = workStatusParts(r); if (!q || q.mode !== p.mode) continue;
    lastTs = Math.max(lastTs, Number(r.ts) || 0);
  }
  return (Number(rep.ts) || 0) === lastTs;
}

//  ★ 4.47 — **같은 호기에서 양하↔선적을 바꿀 때 중단 사유는 앱이 적는다.** 검수사 2026-10-24 08:46 «양하/선적 사유가 있는데 사유는 양하일떄는 선적 선적일떄는 양하가 사유입니다. 따로 적는게 불편합니다» ·
//    08:48 «양하중단사유 선적시작 또는 선적재개 떄문에 선적중단 사유 양하 재개 때문에». 실근거 — 보관 79항차 중단 보고 24건 중 18건이 «선적»·«선적시작»·«양하재개»·«양하» 를 손으로 친 것이었다.
//    사유 낱말 한 벌 — 선적을 시작하면 «선적 시작» · 선적을 재개하면 «선적 재개» · 양하를 재개하면 «양하 재개» · 양하를 시작하면 «양하 시작».
export function switchReasonOf(toMode, verb) {
  return `${toMode === 'loading' ? '선적' : '양하'} ${verb === 'resume' ? '재개' : '시작'}`;
}
/** 같은 호기의 다른 작업이 «진행» 중인가 — activeWork[호기][작업]. 다른 호기는 보지 않는다(2·3갱 동시 작업은 정상). 중단 중인 다른 작업은 묻지 않는다. */
export function otherRunningWork(activeWork, equip, mode) {
  const other = mode === 'loading' ? 'discharge' : 'loading';
  const row = activeWork && activeWork[equip] && activeWork[equip][other];
  return row && row.status === 'running' ? { mode: other, row } : null;
}
/** 중단 사유 빠른 선택 맨 앞 — 양하 중단이면 «선적 시작»·«선적 재개», 선적 중단이면 «양하 재개». */
export function pauseSwitchReasonsFor(mode) {
  return mode === 'loading' ? [switchReasonOf('discharge', 'resume')] : [switchReasonOf('loading', 'start'), switchReasonOf('loading', 'resume')];
}

/** 해치 보고를 고치거나 지운 뒤 «열림·닫힘 표시»(info.hatchDone)를 남은 보고에 맞춘다(쓰기 없음).
 *  centers — 영향받은 장(고치기 전·후 베이의 장), groupOf — 베이 → 장(bayGroupCenter 한 벌). 남은 보고가 없는 장은 표시를 지운다(옛 모드 키 포함). 바뀐 게 없으면 null. */
export function hatchDoneAfterReports(prevHd, reports, centers, groupOf) {
  const prev = prevHd || {};
  const next = { ...prev };
  for (const c of new Set((centers || []).filter((x) => x != null).map(String))) {
    let act = null, best = -1;
    for (const r of Object.values(reports || {})) {
      if (!r || r.type !== 'hatch') continue;
      if (!(Array.isArray(r.bays) ? r.bays : []).some((b) => String(groupOf(b)) === c)) continue;
      const ts = hatchReportTs(r);
      if (ts >= best) { best = ts; act = String(r.action || '').toLowerCase(); }
    }
    if (act) { next[c] = act; delete next[`loading_${c}`]; delete next[`discharge_${c}`]; }
    else { delete next[c]; delete next[`loading_${c}`]; delete next[`discharge_${c}`]; }
  }
  return JSON.stringify(next) === JSON.stringify(prev) ? null : next;
}

//  ★ 4.15-01 — **별첨 «화물 종류» 한 벌** — 인쇄 별첨(PrintableCargoPlanV2 legends)과 수석 보드 별첨(legendLiveOf)이 이것만 부른다.
//    종전엔 두 곳이 같은 if 사슬을 따로 들고 있었고 리퍼를 규격(isReeferContainer)으로 세어, 4.15 에서 엠티 리퍼가 40HR 표기를 지키자
//    STSE 2669E 선적 별첨 Reefer 가 2 → 43 이 됐다. 검수사 2026-10-09 15:39 «리퍼 엠티 41 리퍼풀 2 -> 리퍼=2» — Reefer 줄은 풀 리퍼(isFullReefer)만.
//    엠티 리퍼·리퍼드라이·제작컨은 일반 줄로 가고(DG·FR·OT·탱크 표식이 있으면 그 줄), 엠티 리퍼 수는 별첨3 아래에 따로 적는다(emptySplitLabel).
export function legendCargoCatOf(c) {
  if (!c) return '일반';
  if (c.dg) return 'DG';
  if (isFullReefer(c)) return 'Reefer';
  if (isFlatRackContainer(c)) return 'FR';   // 3.43-03: FR 판정 한 벌(카고플랜 칸·인쇄 별첨과 같은 판정)
  if (c.ot || c.oog || (c.iso && c.iso[2] === 'U') || isAlphaOpenTopIso(c.iso)) return 'OT';   // 4.52: EDI 만 있는 V코드(22V7·42V1)·20HT·40HT·25OT 도 오픈탑 줄 — 플래그가 늦어도 같은 답
  if (c.tk || (c.iso && c.iso[2] === 'T')) return 'Tank';
  return '일반';
}

//  ★ 3.11: **별첨 표 실시간** — 수석 실시간 작업 보드 왼쪽. 검수사 «통계는 선박 밑에 빈공간에 별첨 자료처럼 실시간으로 채워 지는걸 원한것입니다».
//    분류 규칙은 카고플랜 별첨(PrintableCargoPlanV2 legends — sizeOfC·matchPodC·cat·fe)과 같은 것을 그대로 옮겼다(그 쪽은 컴포넌트 안 useMemo 라 못 부른다).
//    ⚠ 두 벌이 갈리면 별첨 숫자가 달라진다 — 저쪽 규칙을 고치면 여기도(연막검사가 DJCT 실측 별첨 숫자로 붙잡는다).
//    반환 { carriers:[[선사,{20:{n,done},40:…,45:…,total:{n,done}}]…], cargos:[…], fe:{20:{F:{n,done},E:{…}},…}, n, done }
//    rows = 계획 rows(ediContainers 값들) · compMap = {mode}.completed. 평택분만(양하 POD·선적 POL/리스트), 자리 미지정 슬롯 제외.
export function legendLiveOf(rows, mode, compMap) {
  const comp = compMap || {};
  const sizeOf = sizeLenOf;   // ★ 일괄수리(2026-11-10): 규격 길이 한 벌(tallyReport.sizeLenOf — 마감텔리 칸을 20·40·45 로 접은 것). 종전엔 규격 라벨 앞 두 자리로 따로 갈라 L2G1·SKHU 600번대 22GP 가 마감텔리와 다른 칸에 섰다
  const isPtkC = (c) => isPtk(c, mode);   // 3.14: 판정 한 벌
  const cell = () => ({ n: 0, done: 0 });
  const mk = () => ({ '20': cell(), '40': cell(), '45': cell(), total: cell() });
  const add = (map, key, size, dn) => { const e = map.get(key) || (map.set(key, mk()), map.get(key)); e[size].n++; e.total.n++; if (dn) { e[size].done++; e.total.done++; } };
  const carriers = new Map(), cargos = new Map(), pods = new Map();   // 3.12: pods — 선적 별첨4 «목적지별»(인쇄 별첨의 POD 표와 같은 셈, PTK 제외)
  const fe = { '20': { F: cell(), E: cell() }, '40': { F: cell(), E: cell() }, '45': { F: cell(), E: cell() } };
  const emptyRf = cell();   // 4.15-01: 엠티 중 리퍼 엠티(isEmptyReefer) — 별첨3 아래 «엠티 N(일반 · 리퍼 엠티)» 한 줄
  let n = 0, done = 0;
  //  3.26: 자리(부킹·PRE)가 있으면 자리가 별첨이고 그 자리를 채운 실번호는 뺀다(legendItemsOf 한 벌 — 인쇄 별첨과 같은 분모).
  //    종전의 «__SLOT_ 제외»는 cn 이 `__BOOK_` 인 자리를 못 걸러 실번호와 두 번 세었다(SWBT 2614N 632).
  for (const c of legendItemsOf(rows || [])) {
    if (!c || !isPtkC(c)) continue;
    const size = sizeOf(c); const dn = !!(c.cn && comp[c.cn] && comp[c.cn].flag !== 'missing');
    n++; if (dn) done++;
    add(carriers, (c.op && String(c.op).trim()) || 'UNK', size, dn);
    add(cargos, legendCargoCatOf(c), size, dn);   // 4.15-01: 화물 종류 한 벌 — 인쇄 별첨(PrintableCargoPlanV2)과 같은 함수
    const f = fe[size][c.fe === 'E' ? 'E' : 'F']; f.n++; if (dn) f.done++;
    if (isEmptyReefer(c)) { emptyRf.n++; if (dn) emptyRf.done++; }   // 4.15-01: 별첨3 엠티 구분(일반 · 리퍼 엠티) — 리퍼 줄에는 안 더한다
    //  3.60-11 (진단 M9): 자르기 전에 정규화 — 색 키(getContainerColorKey)와 같은 한 벌. 종전엔 리스트 «NANTONG» 이 색은 NTG · 별첨은 «NTO»,
    //    부두코드 «PTK02» 가 목적지 표에 «K02» 로 섰다.
    const podN = normPortCode(c.pod); const p3 = podN.length >= 5 ? podN.slice(2, 5) : podN.slice(0, 3);
    if (p3 && p3 !== 'PTK' && !isPyeongtaekPort(podN)) add(pods, p3, size, dn);   // 칸 색(getContainerColorKey)과 같은 평택 빼기(KRPYT 등)
  }
  return {
    carriers: [...carriers.entries()].sort((a, b) => b[1].total.n - a[1].total.n),
    pods: [...pods.entries()].sort((a, b) => b[1].total.n - a[1].total.n),
    cargos: [...cargos.entries()].sort((a, b) => (a[0] === '일반' ? -1 : b[0] === '일반' ? 1 : b[1].total.n - a[1].total.n)),
    fe, emptyRf, n, done,
  };
}

//  ★ 4.41 — **장마다 완료/남음(데크·홀드 따로)** — 수석 상황판 배 카드의 «완료·남은 베이» 한 줄.
//    검수사 2026-10-21 05:09 «어디가 완료 되었는지 한눈에 보이질 않습니다 … 작업완료된 베이가 많으면 남은 베이를 보여주거나 이제 시작된것이 라면 완료된 베이를 보여 주었으면 합니다».
//    분모·완료는 별첨(legendLiveOf)과 같다 — legendItemsOf + isPtk, 완료 = completed 에 있고 flag missing 아님. 막대·별첨 숫자와 갈리지 않는다.
//    장 묶음은 보드 그림과 같은 cargoPlanCore.hatchEvenOf(rows 의 bay, pages) 한 벌. rows 는 보드의 boardContainers[mode](실적 > 맞교환 > 계획 자리).
//    데크 = 단 80 이상. 자리(베이·단)를 모르는 컨은 noPos 로 따로 센다(지어내지 않는다).
//    장 이름은 사전에 그 짝수 베이가 있으면 짝수, 없으면 홀로 선 홀수(배 앞 20피트 베이 — DXQD·STSE 01). 실측 TMPZ 2035E·DXQD 2641E 장별 데크·홀드 대수가 동방 bayWork 와 칸마다 같다.
//    부분 = 장 × 데크/홀드. 다 끝난 부분이 남은 부분보다 많으면 show 'left'(남은 것), 아니면 'done'(끝난 것) · 완료 0 이면 null · 남은 것이 없으면 'all'.
export function bayDoneSplitOf(rows, mode, compMap, pages) {
  //  ⚠ 감사 2026-10-21 — 사전(pages)이 없으면 hatchEvenOf 폴백이 홀수+1 짝수를 만들어 **없는 베이 번호**를 지어낸다(DXQD «02» · TMPZ «04·08…»).
  //    hatchEventsOf·갱 규격표처럼 사전 없으면 판정하지 않는다 — 줄을 안 낸다(utils 7767 «폴백은 없는 장을 만든다»).
  if (!Array.isArray(pages) || !pages.length) return { n: 0, done: 0, noPos: 0, noPosLeft: 0, parts: [], show: null, leftN: 0, doneN: 0, list: { deck: [], hold: [] }, noDict: true };
  const comp = compMap || {};
  const H = new Map();
  let n = 0, done = 0, noPos = 0, noPosLeft = 0;
  for (const c of legendItemsOf(rows || [])) {
    if (!c || !isPtk(c, mode)) continue;
    const dn = !!(c.cn && comp[c.cn] && comp[c.cn].flag !== 'missing');
    n++; if (dn) done++;
    const ev = hatchEvenOf(c.bay, pages);
    const t = parseInt(c.tier, 10);
    if (!ev || !(t > 0)) { noPos++; if (!dn) noPosLeft++; continue; }
    const k = t >= 80 ? 'deck' : 'hold';
    let h = H.get(ev);
    if (!h) { h = { even: ev, deck: { n: 0, done: 0 }, hold: { n: 0, done: 0 } }; H.set(ev, h); }
    h[k].n++; if (dn) h[k].done++;
  }
  const evOf = (p) => (p ? (p.evenBay != null ? p.evenBay : p.even) : null);   // hatchEvenOf 와 같이 두 모양({even}·{evenBay})을 받는다
  const hasEven = (ev) => pages.some((p) => evOf(p) != null && parseInt(evOf(p), 10) === ev);
  const parts = [];
  for (const h of [...H.values()].sort((a, b) => a.even - b.even)) {
    const lab = String(hasEven(h.even) ? h.even : h.even - 1).padStart(2, '0');
    for (const k of ['deck', 'hold']) if (h[k].n) parts.push({ lab, even: h.even, k, n: h[k].n, done: h[k].done });
  }
  const doneP = parts.filter((p) => p.done === p.n), leftP = parts.filter((p) => p.done < p.n);
  const show = done === 0 ? null : (!leftP.length && !noPosLeft) ? 'all' : doneP.length > leftP.length ? 'left' : 'done';
  const pick = show === 'left' ? leftP : show === 'done' ? doneP : [];
  return { n, done, noPos, noPosLeft, parts, show, leftN: leftP.length, doneN: doneP.length,
    list: { deck: pick.filter((p) => p.k === 'deck'), hold: pick.filter((p) => p.k === 'hold') } };
}

//  ★ 4.41 — bayDoneSplitOf 를 상황판 한 줄 글자로. «남은 — 데크 06(1)·14(6)» · «완료 — 데크 16 (남은 14곳)» · «✔ 전부 완료» · show 가 없으면 ''.
export function bayDoneTextOf(S) {
  if (!S || !S.show) return '';
  if (S.show === 'all') return '✔ 전부 완료';
  const kName = { deck: '데크', hold: '홀드' };
  const seg = (k, withLeft) => (S.list[k].length ? `${kName[k]} ${S.list[k].map((p) => (withLeft ? `${p.lab}(${p.n - p.done})` : p.lab)).join('·')}` : '');
  const np = S.noPosLeft ? `자리 모름 ${S.noPosLeft}대` : '';
  if (S.show === 'left') return '남은 — ' + [seg('deck', true), seg('hold', true), np].filter(Boolean).join('  ');
  const body = [seg('deck'), seg('hold')].filter(Boolean).join('  ');
  const rest = [S.leftN ? `남은 ${S.leftN}곳` : '', np].filter(Boolean).join(' · ');   // 감사: 칸은 다 끝났고 자리 모름만 남으면 «남은 0곳» 을 쓰지 않는다
  return '완료 — ' + (body || '다 끝난 칸 아직 없음') + (rest ? `  (${rest})` : '');
}

//  ★ 4.26-02 보류 한 벌 — **지금 걸려 있는** 보류만(사유가 있고 그 모드에서 아직 완료 안 된 컨). 자동 가이드 보류 줄 · 미르 «보류» · 갱 배분 답이 같은 목록을 쓴다.
//    모의 작업 MCAP 3호기 — 보류를 건 컨이 실린 뒤에도 «보류 12대» 로 남았다(완료가 보류를 지우지 않는다 — 노드는 그대로 두고 읽을 때 거른다).
//    ⚠ `doneAt` 은 «보류 당시 완료 대수»(되묻기 기준점 · fbHoldContainers/fbSnoozeHold)다 — 완료 여부가 아니다. 종전 미르는 `!doneAt` 으로 걸러
//      첫 완료 뒤에 건 보류를 전부 «보류 없음» 으로 답했다.
export function activeHeldOf(voyage, mode) {
  const sec = (voyage && voyage[mode]) || {};
  const h = sec.held || {};
  const comp = sec.completed || {};
  return Object.keys(h)
    .map((k) => ({ ...(h[k] || {}), cn: String(k).toUpperCase(), _key: k }))
    .filter((x) => x.reason && !comp[x._key] && !comp[x.cn])
    .sort((a, b) => (a.at || 0) - (b.at || 0));
}

//  ★ 4.26-01 — **PCTC 본선현황 GC별 완료 대수** → { at, byNo:{ 2:{gc:'102', dis, lod} … } } 또는 null.
//    검수사 2026-10-14 12:49 «아직 잡힌 작업이 없습니다. 그시간 양하대수는 40대?» — STMJ 2663E(SITC MOJI) 본선현황 양하 40 인데 미르 호기별 답이 «아직 잡힌 작업 없음».
//    PCTC 컨별 실적(termWork)이 10-05 부터 안 와서 호기별 답의 재료가 앱 완료뿐이었다(동방은 QC 합계로 대신 답하는 길이 있었다 — 3.8).
//    ⚠ gc.*Tot 은 termBoard.js 가 «뜻이 확인되지 않아 칸으로 쓰지 않는다» 고 한 칸이다. 실측 STMJ 2663E 11:52 — GC102 disTot 22 + GC103 24 = 본선현황 양하 완료 46 · 선적 0 = 0.
//      ⇒ GC별 Tot 합이 본선현황 완료(dis.done · lod.done)와, GC별 Rest 합이 본선현황 잔여(dis.rest · lod.rest)와 **넷 다 같을 때만** 호기별 완료 대수로 쓴다(감사 하-2 — 두 쪽에서 확인). 하나라도 다르면 null — 지어내지 않는다.
//    호기 번호는 crewCraneNo 한 벌(GC102 → 2호기 — PCTC 1~4호기).
export function pctcGcDoneOf(info) {
  const ts = info && info.termStat;
  if (!ts || typeof ts !== 'object' || !ts.gc || typeof ts.gc !== 'object' || !ts.dis || !ts.lod) return null;
  if (ts.src && String(ts.src).toUpperCase() !== 'PCTC') return null;   // 2차 시뮬 하-2: PCTC 본선현황만(수집기 vesselstatus.py 가 src:'PCTC' 로 쓴다)
  const n = (x) => { const v = Number(x); return Number.isFinite(v) && v > 0 ? Math.round(v) : 0; };
  const ents = Object.entries(ts.gc).filter(([, g]) => g && typeof g === 'object');
  const sDis = ents.reduce((a, [, g]) => a + n(g.disTot), 0), sLod = ents.reduce((a, [, g]) => a + n(g.lodTot), 0);
  const rDis = ents.reduce((a, [, g]) => a + n(g.disRest), 0), rLod = ents.reduce((a, [, g]) => a + n(g.lodRest), 0);
  if (sDis + sLod <= 0 || sDis !== n(ts.dis.done) || sLod !== n(ts.lod.done) || rDis !== n(ts.dis.rest) || rLod !== n(ts.lod.rest)) return null;
  const byNo = {};
  for (const [k, g] of ents) {
    const no = crewCraneNo(k); const dis = n(g.disTot), lod = n(g.lodTot);
    if (!no || (!dis && !lod)) continue;
    byNo[no] = { gc: String(k), dis, lod };
  }
  return Object.keys(byNo).length ? { at: Number(ts.at) || 0, byNo } : null;
}

export function crewWorkStats(voyage) {
  const info = (voyage && voyage.info) || {};
  const shifts = craneCrewOf(info);
  const segs = crewSegments(info);   // 3.9: 구간 계산은 crewSegments 한 벌
  const craneNo = crewCraneNo;
  const segOf = (at) => crewSegmentAt(segs, at);
  let outside = 0;
  const rows = {}; let anyCrane = false, termHasEquip = false;
  for (const mode of ['discharge', 'loading']) {
    const sec = (voyage && voyage[mode]) || {};
    const seen = {};
    for (const [cn, r] of Object.entries(sec.termWork || {})) {
      if (!r || !r.at) continue;
      const no = craneNo(r.equip); if (no) termHasEquip = true;
      seen[cn] = { at: r.at, no, by: '', pos: r.pos || '' };
    }
    for (const [cn, r] of Object.entries(sec.completed || {})) {
      if (!r || !r.at) continue;
      const by = String(r.by || '').trim(); const who = by && !isTermApplied(r) ? by : '';
      if (seen[cn]) { if (!seen[cn].no) seen[cn].no = craneNo(r.equip); if (!seen[cn].by) seen[cn].by = who; continue; }
      seen[cn] = { at: r.at, no: craneNo(r.equip), by: who, pos: '' };
    }
    for (const rec of Object.values(seen)) {
      const seg = segOf(rec.at);
      //  앱으로 직접 찍은 사람(by)이 있으면 그 사람이 정본이다 — 등록이 앱 기록을 덮으면 «앱 완료 기록도 없어요» 라는 거짓말이 된다(감사 실측 NSDC 김성일 136대)
      const name = rec.by || (seg && rec.no && seg.cranes[rec.no]) || '';
      if (!rec.no && !name) continue;   // 호기도 사람도 모르는 완료 — 셀 축이 없다
      if (rec.no) anyCrane = true;
      if (!seg && segs.length) outside++;
      const key = `${seg ? seg.key : ''}|${rec.no || 0}|${name}`;
      const row = rows[key] || (rows[key] = { key: seg ? seg.key : '', no: rec.no || 0, name, dis: 0, lod: 0, n: 0, firstAt: Infinity, lastAt: 0, lastPos: '', src: 'cn' });
      row[mode === 'loading' ? 'lod' : 'dis']++; row.n++;
      if (rec.at < row.firstAt) row.firstAt = rec.at;
      if (rec.at > row.lastAt) { row.lastAt = rec.at; if (rec.pos) row.lastPos = rec.pos; }
    }
  }
  //  동방(PNCT) — 터미널 피드에 컨별 호기가 **없고** QC 합계(info.qcWork)가 있으면 QC 합계가 호기별 정본이다.
  //    앱으로 직접 찍은 완료(by+equip)는 그 합계 안에 이미 든 컨이므로 따로 더하지 않고 «직접 찍은 것 N대»로만 덧붙인다
  //    (2차 시뮬 지적 — 앱 완료 3건이 섞이자 QC 257·213 이 통째로 사라졌다). 호기 없는 카토스 배(anyCrane=false)도 같은 길.
  let qcOnly = false;
  if (!termHasEquip && info.qcWork && typeof info.qcWork === 'object') {
    const qcRows = {};
    for (const q of Object.values(info.qcWork)) {
      const no = craneNo(q && q.qc); if (!no) continue;
      const dis = Number(q.disDone) || 0, lod = Number(q.lodDone) || 0; if (!dis && !lod) continue;
      const appRows = Object.values(rows).filter((r) => r.no === no);
      const regNames = [...new Set(segs.map((s) => s.cranes[no]).filter(Boolean))];
      const names = regNames.length ? regNames : [...new Set(appRows.map((r) => r.name).filter(Boolean))];
      const name = names.length === 1 ? names[0] : names.join('·');
      const key = segs.length === 1 ? segs[0].key : (appRows.length === 1 ? appRows[0].key : '');
      const lastAt = appRows.reduce((m, r) => Math.max(m, r.lastAt || 0), 0);
      qcRows[`${key}|${no}|${name}`] = { key, no, name, dis, lod, n: dis + lod, firstAt: 0, lastAt, lastPos: '', src: 'qc', appN: appRows.reduce((a, r) => a + r.n, 0) };
    }
    if (Object.keys(qcRows).length) {
      qcOnly = true;
      //  QC 가 아는 호기의 앱 완료 행은 QC 행으로 갈음, QC 에 없는 호기(0 = 호기 미상)의 행은 남긴다
      const qcNos = new Set(Object.values(qcRows).map((r) => r.no));
      for (const k of Object.keys(rows)) if (qcNos.has(rows[k].no)) delete rows[k];
      Object.assign(rows, qcRows);
    }
  }
  //  ★ 4.26-01 — PCTC 배인데 컨별 실적에 호기가 없으면(termWork 가 안 옴) 본선현황 GC별 완료(pctcGcDoneOf — 합이 본선현황과 맞을 때만)를 쓴다.
  //    ⚠ 감사 중-1: **앱 완료 기록이 하나도 없을 때만** 행을 GC 합계로 채운다(그때는 사람·조로 가를 재료가 처음부터 없다 — 보고된 STMJ 2663E 가 이 경우).
  //      앱 완료가 있으면 행은 종전 그대로 앱 기록(사람·조·날짜 답이 그 기록으로 간다 — GC 로 갈음하면 등록과 다른 사람이 찍은 몫이 남의 것이 되고 날짜 답을 거절했다)이고,
  //      GC 합계는 참고(gcRef)로만 돌려준다 — 미르가 «터미널 본선현황 GC 합계» 한 줄을 덧붙인다.
  let aggSrc = qcOnly ? 'qc' : '', aggAt = 0, gcRef = null;
  if (!qcOnly && !termHasEquip) {
    const g = pctcGcDoneOf(info);
    if (g && Object.keys(rows).length) gcRef = g;
    else if (g) {
      //  2차 시뮬 중-1·하-1: GC 대수는 **항차 누계**다 — 조·사람으로 못 나눈다. 행에 조(key)·이름을 붙이지 않는다(조가 둘이면 «조 미상 박진우·최원형» · 조가 하나면 밤 작업까지 주간 사람 몫으로 보였다).
      //    등록은 shifts 로 따로 있고, 미르가 «등록 줄 + 항차 누계 줄» 로 말한다(nlSearch.answerCraneCrew).
      for (const [noS, v] of Object.entries(g.byNo)) {
        const no = Number(noS);
        rows[`gc|${no}`] = { key: '', no, name: '', dis: v.dis, lod: v.lod, n: v.dis + v.lod, firstAt: 0, lastAt: 0, lastPos: '', src: 'gc', appN: 0 };
      }
      qcOnly = true; aggSrc = 'gc'; aggAt = g.at;
    }
  }
  const list = Object.values(rows).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.no - b.no));
  const byName = {}, byCrane = {};
  for (const r of list) {
    if (r.name) { const b = byName[r.name] || (byName[r.name] = { n: 0, dis: 0, lod: 0, lastAt: 0, lastPos: '', cranes: [] }); b.n += r.n; b.dis += r.dis; b.lod += r.lod; if (r.lastAt > b.lastAt) { b.lastAt = r.lastAt; b.lastPos = r.lastPos; } if (r.no && !b.cranes.includes(r.no)) b.cranes.push(r.no); }
    if (r.no) { const c = byCrane[r.no] || (byCrane[r.no] = { n: 0, dis: 0, lod: 0, lastAt: 0, lastPos: '', names: [] }); c.n += r.n; c.dis += r.dis; c.lod += r.lod; if (r.lastAt > c.lastAt) { c.lastAt = r.lastAt; c.lastPos = r.lastPos; } if (r.name && !c.names.includes(r.name)) c.names.push(r.name); }
  }
  return { shifts, rows: list, byName, byCrane, registered: shifts.length > 0, qcOnly, aggSrc, aggAt, gcRef, outside };   // 4.26-01: aggSrc 'qc'(동방 QC 합계) · 'gc'(PCTC 본선현황 GC 합계 — aggAt 자료 시각) · gcRef(앱 완료가 있을 때 덧붙일 GC 합계 {at, byNo})
}

//  ★ 2.69 (검수사 «야간은 3갱인데 내일 주간은 2갱이면 나머지를 2갱으로 계산해 주나요?»):
//    조 하나를 가리키는 **키** — 「MM-DD 주간」·「MM-DD 야간」. 야간조는 **시작한 날**로 센다
//    (자정을 넘겨도 8/27 야간조는 계속 8/27 야간). 갱 수를 조별로 기억할 때 이 키를 쓴다.
//  ★ 5.00-01 — **갱 수 한 벌.** 검수사 2026-11-13 13:49 «갱수를 이미 알렸는데 모른다는 이유는?» (STMJ 2671E — info.craneCrew['11-13 주간'] 에 1호기 류청호 · 2호기 김성일 이
//    등록돼 있는데 gangsShift 가 없어 «갱 수 미등록이라 2갱으로 셈» 이 떴다). 호기–검수원 등록(fbSetCraneCrew · 3.8)은 갱 수를 따로 안 적는다 — 등록된 호기 수가 곧 그 조의 갱 수다.
//    순서 ① info.gangsShift[그 조](말로 정한 갱 수) ② info.craneCrew[그 조]에 등록된 호기 수(1~4) ③ info.gangs(항차 기본) ④ 없음(n 0).
//    조 키는 shiftGangKey(=crewShiftKey 와 같은 「MM-DD 주간|야간」). shiftOrMs — 시각(ms)이면 그 시각의 조(currentShift), 조 객체면 그 조.
//    예상 작업 시간(mir.expectedWorkTimeOf · 화면 ExpectedTimeLine) · 남은 시간(nlSearch) · 갱 배분(chiefAnswers)이 이것만 부른다. 콘앱은 mir-core 번들로 같은 함수를 쓴다.
export function gangsOfShift(info, shiftOrMs = Date.now()) {
  const I = info || {};
  const sh = (shiftOrMs && typeof shiftOrMs === 'object') ? shiftOrMs : currentShift(Number(shiftOrMs) || Date.now());
  const key = shiftGangKey(sh);
  const said = Number(I.gangsShift && I.gangsShift[key]) || 0;
  if (said > 0) return { n: Math.min(4, said), src: 'said', key, crew: 0 };
  const cc = (I.craneCrew && key && I.craneCrew[key]) || null;
  const crew = cc && typeof cc === 'object'
    ? Object.keys(cc).filter((k) => /^\d+호기$/.test(k) && cc[k] && (typeof cc[k] !== 'object' || String(cc[k].name || '').trim())).length : 0;
  if (crew > 0) return { n: Math.min(4, crew), src: 'crew', key, crew };
  const base = Number(I.gangs) || 0;
  if (base > 0) return { n: Math.min(4, base), src: 'voyage', key, crew: 0 };
  return { n: 0, src: null, key, crew: 0 };
}

export function shiftGangKey(shift) {
  if (!shift) return '';
  const ms = shift.startMs || (shift.name === '야간조' ? (shift.endMs - 86400000) : shift.endMs);
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd} ${shift.name === '야간조' ? '야간' : '주간'}`;
}

//  ★ 2.69: 말로 가리킨 조 → 조 키. «내일 주간» → 「08-28 주간」. 조를 안 대면 null(=항차 기본값).
//    ⚠ 야간조는 시작한 날로 센다 — 새벽 2시에 «오늘 야간» 이라고 하면 지금 하고 있는 그 조(어제 날짜)다.
export function gangKeyFromWords(dayOff, shiftName, nowMs = Date.now()) {
  if (dayOff == null && !shiftName) return '';
  const cur = currentShift(nowMs);
  const nm = shiftName || (cur.name === '야간조' ? '야간' : '주간');
  //  기준 날짜 — 그 조가 «시작하는 날». 오늘/내일/모레는 지금 조의 시작일에서 센다.
  const base = new Date(cur.startMs || nowMs);
  base.setHours(12, 0, 0, 0);
  if (dayOff) base.setDate(base.getDate() + dayOff);
  //  같은 날 안에서 주간→야간 순서다. 지금이 야간인데 «주간» 이라고만 하면 **다음** 주간을 가리킨다.
  if (dayOff == null && cur.name === '야간조' && nm === '주간') base.setDate(base.getDate() + 1);
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${mm}-${dd} ${nm}`;
}

//  ★ 2.99-03 (검수사 2026-09-02): *«OBWH와 RZOR은 주야 구분이 없습니다. 브리핑 자료에 참고 바랍니다.»*
//    카페리 두 척(연태훼리 OCEAN BLUE WHALE · 일조국제물류 RZOR)은 한 조가 계획 시간 끝까지 한다 —
//    브리핑의 «주간조 앱 미사용» 조 이름을 안 붙이고, 갱 배분의 조 창도 17:30 에서 끊지 않고 계획 작업 시간 전체로 잡는다.
export { NO_SHIFT_SHIPS } from './workShift.js';   // 4.79: 목록은 workShift.js 한 곳(3.0-01: SMC YANTAI(SMYA) — RZOR 대체 카페리(검수사 2026-09-02), 항로 RZPT·선사 RZF) — 앞 판은 여기 정의
import { NO_SHIFT_SHIPS as _NO_SHIFT_LIST } from './workShift.js';
export function shipHasShifts(code) { return !_NO_SHIFT_LIST.includes(String(code || '').trim().toUpperCase()); }

//  «지금 일하고 있는(또는 방금 끝낸) 조» 이름 — 교대 사이면 직전 조를 가리킨다.
//    검수사 확정 2026-08-27: 두 숫자 차이 표기는 «주간조 앱 미사용» 처럼 **조 이름을 붙인다**.
export function workingShiftName(nowMs = Date.now()) {
  const sh = currentShift(nowMs);
  if (sh.startMs && sh.startMs > nowMs) return sh.name === '야간조' ? '주간조' : '야간조';   // 교대 사이 — 방금 끝낸 조
  return sh.name;
}

/** 항차 작업 시작 예정 — `info.planDate` 앞부분(«2026-08-23 16:00 ~ …») → ms. 없으면 0.
 *  ⚠ HomePage 의 `_etaMs`(선석배정>도선>PORT-MIS 순 선택)와 다르다. 로그인 화면처럼
 *    그 계산을 다 돌릴 수 없는 곳에서 쓰는 가벼운 폴백이다. */
export function voyagePlanMs(voyage) {
  const m = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0;
}

/** planDate 의 **끝** 시각(`… ~ 2026-08-26 03:00`). 없으면 0. */
export function voyagePlanEndMs(voyage) {
  const all = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/g);
  if (!all || all.length < 2) return 0;
  const m = all[all.length - 1].match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

/** ★ 4.51 — **«지난 배냐» · «아직 안 끝난 배냐» · «같은 시작이면 누가 위냐» 는 여기 한 벌이다** (홈 목록·로그인 작업자 선택 현황판 공용).
 *
 *  🔴 검수사 2026-10-26 06:47 «틀린 배정 순서 왜 일까요? 같은 앱인데 틀린 배정 화면?» — SWBT 2616N 이 같은 시각에 홈에서는 맨 위(작업 중 줄),
 *     로그인 현황판에서는 «지난 배» 로 빠져 있었다. 1차 원인은 데이터(수집기가 배정목록 표의 입항일시를 계획 시작으로 씀 — MailPilot 2.47-13 에서 고침)였지만
 *     **앱 안에서도 두 화면이 지난 배를 다른 잣대로 재고 있었다.** 홈은 끝(없으면 시작) 기준, 로그인은 시작 기준 — 시작은 지났어도 끝이 안 지난 배(작업 배정이
 *     뒤로 밀린 배)를 로그인만 버렸다. 동률 규칙(1.77-01 «먼저 끝나는 배가 위»)도 홈에만 있었다. 두 화면이 각자 재면 반드시 갈린다 — 여기서만 잰다.
 *  ⚠ 시각을 모르면(0·null) 지난 배가 아니다 — 모르는 배를 «지났다» 고 단정하지 않는다. «모르면 뺀다» 가 필요한 화면(로그인 현황판)은 그 한 줄을 자기 쪽에서 따로 둔다. */
export function planIsPast(startMs, endMs, now = Date.now()) {
  const t = endMs || startMs;          // 끝이 있으면 끝, 없으면 시작
  return !!t && t < now;
}
/** 시작 시각을 알고 끝이 아직 안 지났거나 끝을 모르는 배 — 홈 정렬 ⓪등급(작업 중·예정)의 판정 그대로. 시작은 지났어도 끝이 안 지난 배(작업이 뒤로 밀린 배)도 여기 든다.
 *
 *  ⚠ 4.52-01 (4.51 감사 하-1) — planIsPast 와 planIsLive 는 반대말이 아니다. 시작은 지났고 끝을 모르는 배는 planIsPast(시작으로 잼)도 참이고 planIsLive(끝 모름 = 아직 안 끝난 것으로 봄)도 참이다.
 *  홈은 정렬 등급에는 planIsLive 를, «지난 배» 접힘에는 planIsPast 를 써 같은 배를 한쪽은 «작업 중·예정», 한쪽은 «그 밖의 배» 로 가른다. 로그인 현황판은 `msEnd > 0` 로 끝을 모르는 배를 따로 막는다. 둘 중 하나로 합치려면 이 배를 어디에 둘지 먼저 정한다.
 */
export function planIsLive(startMs, endMs, now = Date.now()) {
  return !!startMs && (!endMs || endMs >= now);
}
/** 정렬 비교 — 같은 시작이면 **끝나는 시각이 빠른 배가 위**(검수사 1.77-01 «먼저 사라지기 때문입니다»), 끝을 모르면 뒤. sort 콜백 안에서 `|| planEndCompare(a끝, b끝)` 로 잇는다. */
export function planEndCompare(endA, endB) {
  const a = endA || null, b = endB || null;
  if ((a == null) !== (b == null)) return a == null ? 1 : -1;
  if (a != null && a !== b) return a - b;
  return 0;
}
/** 이미 떠났거나 터미널 작업이 끝난 배 — 터미널 상태 «떠남(departed)·완료(done)» 이거나 작업 끝 시각(workEndAt)이 지났다. isWorkingNow 의 «끝났으면 작업중이 아니다» 문지기와 같은 칸이다.
 *  로그인 현황판이 «시작은 지났어도 끝이 안 지난 배» 를 올릴 때 이미 떠난 다일 배(계획 끝은 미래인데 일찍 떠남)를 같이 올리지 않게 쓴다. */
export function voyageHasLeft(voyage, now = Date.now()) {
  const info = voyage?.info || {};
  const ts = String(info.terminalStatus || '').trim().toLowerCase();
  if (ts === 'departed' || ts === 'done') return true;
  const end = _dtMs(info.workEndAt);
  return !!end && now >= end;
}

/** ★ 4.55-01 — **«작업 배정이 뒤로 밀린 배»(시작 날짜는 어제 이전인데 계획 끝이 아직 안 지났고 떠나지도 않은 배)인가 — 홈 목록과 로그인 작업자 선택 현황판이 한 벌로 쓴다.**
 *
 *  🔴 검수사 2026-10-27 06:22 «DXQD는 아직 작업중인데 분류를 따로 한 이유와 …» — DXQD 2642E(계획 10-26 19:00 ~ 10-28 08:00 · 양하 208 끝 · 선적 371 대기 · 터미널 상태 planned)가
 *     로그인 현황판에서는 «오늘» 줄이었는데 홈(폰)에서는 «그 밖의 배» 접힘 안에 있었다. 4.51 이 이 판정(로그인의 `delayedLive`)을 홈 정렬·채움에만 넣고
 *     홈의 **펼침 판정(isOpenVoyage)·날짜 묶음(dateGroupOf)** 에는 안 넣었기 때문이다. 같은 판정을 두 화면이 각자 재면 갈린다 — 여기서만 잰다.
 *  ⚠ 끝 시각을 모르는 배는 «밀렸다» 고 단정하지 않는다(false). 오늘 시작한 배는 날짜 판정 그대로(false). 이미 떠났거나 터미널 작업이 끝난 배(voyageHasLeft)는 계획 끝이 미래여도 false.
 *  ⚠ 작업 중(isWorkingNow)은 호출하는 쪽이 먼저 가린다 — 이 함수는 «작업 중이 아닌데 지난 배도 아닌 배» 만 말한다. */
export function planDelayedLive(startMs, endMs, voyage, now = Date.now()) {
  if (!startMs || !endMs) return false;
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  if (startMs >= day0.getTime()) return false;   // 시작이 오늘 이후 — 날짜 판정(오늘·내일·…)이 그대로 맡는다
  return planIsLive(startMs, endMs, now) && !voyageHasLeft(voyage, now);
}

/** ★ 지금 «작업중»인가 — **판정은 여기 한 벌뿐이다** (2.40-02).
 *
 *  🔴 사고 (검수사 실측 2026-08-25 12:30) — 로그인 화면 첫 줄에 «NSFR 작업중»이 떠 있었다.
 *     배정목록 확정은 **13시 시작**이고 그때는 12시 30분이었다. 아직 시작도 안 한 배다.
 *     검수사 원문 — *«저 선박 담당자는 놀라 기겁을 할것입니다. 13시 작업이라 준비도 안했는데 작업중이라이»*
 *     *«첫화면이 중요 합니다 접속하자 마자 틀린 정보를 보고 있어야 합니다»*
 *
 *  원인이 두 곳에 갈라져 있었다.
 *    · `LoginPage` — 터미널 상태가 working 이고 **시작이 2시간 이내면** 작업중(2.34-10).
 *      «내일 배가 오늘 작업중으로 뜨는 것»을 막으려던 창인데, 그 창이 **시작 전 2시간을 통째로**
 *      작업중으로 만들었다.
 *    · `HomePage` — 터미널 상태만 보고 **시각은 아예 안 봤다.** 더 넓게 틀렸다.
 *
 *  ⇒ 규칙은 하나다. **시작 시각을 지나야 작업중이다.**
 *  ⚠ 여유(그레이스)를 두지 않는다. «작업중이 아닌데 작업중»은 사람을 뛰게 만들고,
 *    «작업중인데 아직»은 한 번 더 보게 만들 뿐이다. 틀릴 거면 늦게 틀리는 쪽이 안전하다.
 *  ⚠ 시각을 모르면(planDate 없음) 터미널 상태가 유일한 근거라 종전대로 믿는다.
 *  ⚠ 끝 시각으로는 끄지 않는다 — 배는 늦어진다. 출항 판정은 terminalStatus 가 한다(badgeRule).
 */
/** ★ 3.22 — 동방(PNCT)이 적어 주는 호기별 실적 합계. `{done, rest}` (칸이 없으면 둘 다 0).
 *  `info.qcWork` = {QC101:{disDone,disRest,lodDone,lodRest,total}, …} — 수집기 pnctpull 이 그대로 옮겨 담는다.
 *  done = 터미널이 «했다»고 적은 대수 · rest = «남았다»고 적은 대수. 둘 다 **평택분만이 아니라 그 배 전체**다
 *  (실측 ATPR 2640E — done 149 + rest 227 = 376 인데 평택 계획은 260). 그래서 rest 는 «끝났다» 판정에만 쓰고
 *  진행률로는 쓰지 않는다. 대수 계산은 언제나 EDI·records 가 한다. */
export function qcWorkTally(info) {
  let done = 0, rest = 0;
  for (const q of Object.values((info && info.qcWork) || {})) {
    if (!q || typeof q !== 'object') continue;
    done += (Number(q.disDone) || 0) + (Number(q.lodDone) || 0);
    rest += (Number(q.disRest) || 0) + (Number(q.lodRest) || 0);
  }
  return { done, rest };
}

export function isWorkingNow(voyage, now = Date.now()) {
  //  ─────────────────────────────────────────────────────────────────────────
  //  ★ 2.46 — **작업 시작·완료는 터미널이 적어 준 사실이다. 추측하지 않는다.**
  //
  //  검수사 확정 —
  //    *«계획 확정이지 작업확정이 아니고 작업시작일시가 빈칸이고 입항일시가 따로 있습니다»*
  //    *«주 3항차 선박입니다 작업이 끝나도 이틀뒤 작업대기로 뜰수 있습니다»*
  //  ⇒ 배정목록의 `STATUS=work` 는 **계획** 상태다. 작업이 시작됐는지는 **작업시작일시 한 칸**이 말한다.
  //    입항일시(ATA)는 별개다 — 배가 들어온 것과 일을 시작한 것은 다르다.
  //    그리고 주 3항차 배는 이번 작업이 끝나도 **이틀 뒤 행이 미리 work 로 칠해져** 온다
  //    (실측 PCSZ 2625E 가 8/27 13:00 행에 벌써 work) — 미래 행의 work 는 작업중이 아니다.
  //
  //  🔴 2.44~2.45 사고 전말. 2.44 가 세운 규칙(**빈칸 = 아직 시작 안 함**)은 **옳았다.**
  //    그런데 그 판이 13:05 부터 일하던 NSFR 을 「예정」으로 만들었다 — 규칙이 틀려서가 아니라
  //    **수집기가 값을 아예 안 써 주고 있어서** 18척 전부 빈칸이었기 때문이다.
  //    나는 원인(끊긴 배선)을 안 파고 **규칙을 무르게 해서**(2.45 — 빈칸이면 planDate 로 폴백) 덮었다.
  //    그건 잘못된 수리다. 검수사 — *«같은것을 몇번반복하고 설명해도 또 같은 함정에 빠져 방황하고»*
  //    ⇒ 배선을 MailPilot 2.4-01 에서 고쳤다(`_sched_put` 에 매개변수가 없어 값이 바닥에 떨어지고 있었다).
  //      값이 실제로 들어오는 것을 RTDB 에서 확인한 **뒤에** 이 규칙을 되돌린다.
  //  ─────────────────────────────────────────────────────────────────────────
  const info = voyage?.info || {};
  const ts = String(info.terminalStatus || '').trim().toLowerCase();

  //  ────────────────────────────────────────────────────────────────────────
  //  ★ 3.22 — **동방(PNCT)은 배정목록 상태를 늦게 바꾼다. 실적이 곧 작업의 증거다.**
  //    검수사 2026-09-07 00:30 «수석대쉬보드 실시간 작업현황에 왜 ATPR작업현황이 안보이죠 3척이 다보여야 하는데».
  //    실측 ATPR 2640E — 터미널 실적 149대(23:27 까지)가 들어와 있는데 `terminalStatus` 는 여태 `planned`,
  //    `workStartAt` 도 빈칸이라 이 함수가 **첫 줄에서 잘라 냈다.** 보드에 두 척만 뜬 이유다.
  //    ⚠ 같은 뿌리를 어제 **수집기에서만** 고쳤다(MailPilot 2.29 — ATB 빈칸이어도 qc 실적이 있으면 작업 중).
  //      검수앱 게이트는 그대로 둬서 두 곳이 **다른 답**을 내고 있었다. ⚠ 언어가 달라 한 벌이 될 수는 없다 —
  //      수집기(`pnctpull.py:495`)는 `_done>0` 하나만 보고, 여기는 아래 문지기 넷을 다 본다. 규칙이 이렇게 다르다는 것을
  //      알고 읽어야 한다(수집기 쪽은 «실적을 쓸까»를, 여기는 «화면에 올릴까»를 정한다).
  //    근거 칸은 `info.qcWork`(동방이 호기별로 적어 주는 disDone/lodDone) — 우리가 추측한 값이 아니라
  //    **터미널이 «몇 대 했다»고 적어 준 사실**이다. 그래서 `terminalStatus`·`workStartAt` 은 한 글자도 안 덮는다.
  //    실데이터 전수(활성 17척) — 바뀌는 것은 ATPR 하나뿐이고 나머지 16척은 판정이 그대로다(허수 0).
  //  ────────────────────────────────────────────────────────────────────────
  const qc = qcWorkTally(info);
  //  ⚠ 실적 칸에는 **시각이 없다.** 「오늘 149대 했다」만 적혀 있어서 그대로 쓰면 **과거 어느 시각에도 참**이 된다
  //    (전수 회귀에서 실측 — 09-06 실적을 가진 ATPR 이 08-25 판정에서도 «작업중»으로 떴다).
  //    ⇒ 실적으로 열 때는 **계획 시작 시각을 지났는지** 함께 본다. 검수사 규칙과 같다 —
  //    «예정 13:00 은 지났지만 실적은 13:05 이다. 예정으로 앞당겨 띄우면 안 된다»의 짝으로,
  //    실적으로 앞당겨 띄우는 것도 막는다.
  //  ⚠ **실적으로 여는 문은 실적 하나로 열지 않는다.** 감사(2026-09-07)가 구멍 둘을 짚었다 —
  //    ⓐ «남은 게 없다»(rest 0) 문지기를 `ts!=='working'` 안에만 두면, `working` 으로 굳은 채 끝난 배가 그냥 통과한다
  //      (보관 249척 중 `working` 으로 굳은 것이 34척, 실측 OBWH 2731E 는 done 470·rest 0 으로 끝나 있다).
  //    ⓑ 끝났음을 알리는 출구가 실측으로 얇다 — `departed/done` 29척(11.6%)·`workEndAt` 5척(2.0%)뿐이고
  //      **220척(88.4%)은 둘 다 없다**(수집기가 배정목록에서 사라진 항차의 상태를 더는 안 고친다 — `terminal.py:659`).
  //      그러면 실적만으로 연 배가 며칠씩 «작업 중»으로 남는다 — 3.10 이 없앤 바로 그 유령이다.
  //  ⇒ 실적으로 열 때는 **네 가지를 다 만족**해야 한다. 문지기를 한곳(`qcStarted`)에 모아 두 경로가 같은 답을 낸다.
  //    ① 터미널이 «했다»고 적었다  ② «남았다»도 적었다(0 이면 끝난 배)
  //    ③ 계획 시작 시각을 지났다(실적 칸에는 시각이 없어 이것이 없으면 과거에도 참이 된다)
  //    ④ 계획 끝 + 반나절을 아직 안 넘겼다 — 배는 늦어지므로 여유를 두되, 무한정 열어 두지는 않는다.
  //    ⚠ 계획 시각을 모르는 항차(`planDate` 없음)는 실적으로 열지 않는다 — 닫는 문을 못 만들기 때문이다.
  const _planMs = voyagePlanMs(voyage);
  const _planEnd = voyagePlanEndMs(voyage);
  const qcStarted = qc.done > 0 && qc.rest !== 0
    && !!_planMs && now >= _planMs
    && !(_planEnd && now > _planEnd + 12 * 3600000);

  //  ① 떠난 배는 아니다 — 실적이 남아 있어도 상태 칸이 «떠났다»면 그것이 이긴다(badgeRule 과 같은 별칭).
  if (ts === 'departed' || ts === 'done') return false;

  if (ts !== 'working' && !qcStarted) return false;   // 상태 칸도 «작업 중»이 아니고 실적도 문을 못 연다

  //  ① **끝났으면 작업중이 아니다.** `workEndAt` = PCTC 작업완료(ATC) · PNCT 실출항(ATD).
  //    시작만 보고 끝을 안 보면 «시작했다»만 알고 영영 「작업중」으로 남는다.
  const end = _dtMs(info.workEndAt);
  if (end && now >= end) return false;

  //  ② **시작 실적이 답이다.**
  //    ⚠ 「키가 없다」와 「받았는데 빈칸이다」는 **다른 뜻**이다.
  //      키 없음 = 배정목록을 아직 못 받은 항차 → 종전 폴백(예정 시각 경과)으로 간다.
  //      빈칸    = 터미널이 «아직 시작 안 했다»고 적어 준 것 → **그것이 답이다.** 예정 시각을 볼 것도 없다.
  if (Object.prototype.hasOwnProperty.call(info, 'workStartAt')) {
    const st = _dtMs(info.workStartAt);
    if (st) return now >= st;
    //  ★ 3.22 — 빈칸인데 **터미널이 실적을 적어 줬다면** 시작한 것이다(동방 ATPR 2640E).
    //    실적이 없거나 계획 시작 전이면 종전 그대로 «아직»이다 — 빈칸 한 칸만 보고 열지 않는다.
    return qcStarted;
  }

  //  ③ 배정목록을 아직 못 받았다 — 아는 것이 예정 시각뿐이므로 그것으로 간다.
  const s = voyagePlanMs(voyage);
  if (!s) return true;
  return now >= s;
}


/** '2026-08-25 13:05' · '2026-08-25T13:05' → ms. 못 읽으면 0. (4.06 재감사: 미르 «다음 작업» 판정도 isWorkingNow 와 같은 workEndAt 읽기를 쓴다) */
export function _dtMs(v) {
  const m = String(v || '').trim().match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
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

//  4.87-10: voyageLegOf(항차 구간 prev/next)와 그것만 쓰던 _topPortOf 삭제 — 저장소 전체 호출 0건(이웃 항 판정은 아래 함수들이 한다).

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
//  ★ 4.37-02 — **다른 항차 EDI 원문은 합치지 않는다.** 검수사 2026-10-19 17:42 «수석 상황판 연태 선적중인데 선적 선사별 합계가 이상합니다. 선적이 246개인거 같은데 선사별 합계가 540».
//    실측 OBWH_2769E 선적 — 현재 항차(2770W) 선적 리스트로 만든 가상 EDI 246대 옆에 지난 항차 출항 EDI `OBWH2768WPTK.EDI`(원문 TDT 2768W, 295대)가 raw 로 남아 있었다.
//    fullEdiMapOf 는 raw 를 «단일 진실» 로 쓰고 저장본을 얹으므로 두 자료가 합쳐져(겹침 1대) 별첨 선사별 합계가 540 이 됐다.
//    BAPLIE 의 TDT(+20+항차) 가 그 모드 항차(선적 voy_l · 양하 voy_d||voy) 와 다르면 그 raw 는 다른 항차 것이다. 항차가 안 읽히거나 정보가 없으면 건드리지 않는다.
//    문지기는 항차가 들어오는 자리(firebase._postVoyage) 한 곳 — 모든 화면이 이 손질본을 받는다.
const _voyNorm = (x) => String(x == null ? '' : x).trim().toUpperCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');   // 4.37-02: 앞 0·공백·대소문자는 같은 항차 (0226W = 226W)
export function rawEdiVoyagesOf(text) {   // 원문(여러 파일이 합쳐진 것도)에 적힌 항차 전부
  if (typeof text !== 'string' || !text) return [];
  const out = []; const re = /TDT\+20\+([^+:'\r\n]*)/g; let m;
  while ((m = re.exec(text))) { const t = _voyNorm(m[1]); if (t && !out.includes(t)) out.push(t); }
  return out;
}
export function rawEdiVoyageOf(text) { return rawEdiVoyagesOf(text)[0] || ''; }
export function staleRawEdiOf(voyage, mode) {
  const info = (voyage && voyage.info) || {};
  const edi = voyage && voyage[mode] && voyage[mode].raw && voyage[mode].raw.edi;
  const tags = rawEdiVoyagesOf(edi && edi.text);
  const exp = _voyNorm(mode === 'loading' ? info.voy_l : (info.voy_d || info.voy));
  if (!tags.length || !exp || tags.includes(exp)) return null;   // 한 파일이라도 이번 항차면 쓴다(합쳐진 원문 보호)
  return { mode, tag: tags[0], tags, expected: exp, file: edi.fileName || '' };
}
export function dropStaleRawEdi(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  let out = voyage;
  for (const mode of ['discharge', 'loading']) {
    const st = staleRawEdiOf(out, mode);
    if (!st) continue;
    const sec = out[mode];
    const raw = { ...(sec.raw || {}) }; const edi = raw.edi; delete raw.edi;
    out = { ...out, [mode]: { ...sec, raw, _staleRawEdi: { ...st, edi } } };   // edi 원본을 표식에 들고 있어 보관·되돌림 때 복원한다
  }
  return out;
}
//  보관(archive) 처럼 항차를 DB 에 다시 쓰는 길은 이것으로 걸러낸 원문을 되돌려 놓고 표식을 지운다(자료를 잃지 않는다).
export function restoreStaleRawEdi(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  let out = voyage;
  for (const mode of ['discharge', 'loading']) {
    const sec = out[mode]; const st = sec && sec._staleRawEdi;
    if (!st) continue;
    const { _staleRawEdi, ...rest } = sec;
    const raw = { ...(rest.raw || {}) }; if (st.edi) raw.edi = st.edi;
    out = { ...out, [mode]: { ...rest, raw } };
  }
  for (const mode of ['discharge', 'loading']) {   // 4.84-01: 항차가 달라 가려 둔 덱플랜도 되돌린다
    const sec = out[mode]; const op = sec && sec._otherVoyPlan;
    if (!op) continue;
    const { _otherVoyPlan, ...rest } = sec;
    out = { ...out, [mode]: op.plan ? { ...rest, stowagePlan: op.plan } : rest };
  }
  return out;
}

//  ★ 4.84-01 — 항차가 다른 덱플랜은 그 쪽 화면에 올리지 않는다(들어오는 자리의 문지기).
//    검수사 2026-11-10 «왜 양하 덱플랜이 선적에서도 그대로 보이는지» — 실데이터 RZOR_R124E: 수집기가 양하(R124E) 덱플랜을 컨 1대
//    겹친다는 이유로 선적(R124W) 쪽에 올렸다(수집기 2.50-06 이 올리는 길을 고쳤다). 덱플랜 자신의 항차(stowagePlan.voy)가 그 쪽 항차와 다르고
//    **반대 쪽 항차와 같을 때만** 가린다 — 항차를 모르거나 어느 쪽과도 다르면 건드리지 않는다(추측 금지). 가린 플랜은 `_otherVoyPlan` 에 들고 있어
//    보관(archive) 때 restoreStaleRawEdi 가 되돌려 놓는다(자료를 잃지 않는다).
const _planVoy = (x) => String(x || '').trim().toUpperCase();
export function dropOtherVoyagePlan(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  const info = voyage.info || {};
  const want = { discharge: _planVoy(info.voy_d), loading: _planVoy(info.voy_l) };
  let out = voyage;
  for (const mode of ['discharge', 'loading']) {
    const sec = out[mode]; const sp = sec && sec.stowagePlan;
    if (!sp || typeof sp !== 'object') continue;
    const pv = _planVoy(sp.voy), other = mode === 'discharge' ? 'loading' : 'discharge';
    if (!pv || !want[mode] || pv === want[mode] || pv !== want[other]) continue;
    const { stowagePlan, ...rest } = sec;
    out = { ...out, [mode]: { ...rest, _otherVoyPlan: { plan: stowagePlan, voy: pv, expected: want[mode] } } };
  }
  return out;
}

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


// ── TallyOne 2.89: 컨 맞교환(swapFix) — 기록↔실물 교정 한 벌 (검수사 확정 2026-08-30) ──
//   «교정은 앱이 해야 합니다. 같은 출발지 도착지 사이즈 같은 엠티라면 바꿀 수 있게.
//    풀은 왠만하면 허용 안 합니다. 다만 무게까지 같다면 일항사와 상의 후 바꿀 수 있음.»
//   §5-Y-B — 칸은 안 변한다. 두 컨의 자리 기록(이름표)만 서로 바꾼다. 컨은 움직인 적이 없다.
//   저장: voyages/{key}/swapFix/{id} = { a, b, at, by } — 양하·선적 두 지도에 함께 겹친다.
//   ⚠ 한쪽 지도에만 겹치면 배정표 정본(원시 대조×2=모브) 등식이 깨진다(실측 MCSC 95→66).
export function swapFixList(voyage) {
  const o = voyage?.swapFix;
  if (!o || typeof o !== 'object') return [];
  return Object.entries(o)
    .filter(([, v]) => v && v.a && v.b)
    .sort((x, y) => ((x[1].at || 0) - (y[1].at || 0)) || String(x[0]).localeCompare(String(y[0])))
    .map(([id, v]) => ({ id, a: String(v.a).toUpperCase(), b: String(v.b).toUpperCase(), at: v.at || 0, by: v.by || '' }));
}

//  지도(컨번호→레코드)에 맞교환을 적용한다 — 위치(bay/row/tier)만 바꾸고 신원(실번호·씰 등)은 그대로.
//  상대가 그 지도에 없으면(예: 선적 지도에 한쪽만 있음) 자리 기록이 통째로 상대에게 넘어간다 —
//  게이트가 속성 동일을 보장하므로 있는 쪽 레코드를 빌려 만들되 신원 필드는 비운다.
export function applySwapFix(map, swaps) {
  if (!map || !swaps || !swaps.length) return map;
  const m = { ...map };
  const mv = (src, cn) => ({ ...src, cn, l4: String(cn).slice(-4), sl: '', sh: '', bl: '', _swapFix: true });
  for (const s of swaps) {
    const A = m[s.a], B = m[s.b];
    if (!A && !B) continue;
    if (A && B) {
      m[s.a] = { ...A, bay: B.bay, row: B.row, tier: B.tier };
      m[s.b] = { ...B, bay: A.bay, row: A.row, tier: A.tier };
    } else if (A && !B) { m[s.b] = mv(A, s.b); delete m[s.a]; }
    else { m[s.a] = mv(B, s.a); delete m[s.b]; }
  }
  return m;
}

//  맞교환 게이트 — 검수사 확정 그대로. 판정은 이 한 벌만 쓴다(화면·검사 공용).
export function swapFixGate(a, b) {
  if (!a || !b) return { ok: false, reason: '컨 정보를 찾지 못했습니다' };
  const S = (v) => String(v ?? '').toUpperCase().trim();
  if (S(a.fe) === '' || S(b.fe) === '') return { ok: false, reason: '풀/엠티 정보를 확인할 수 없습니다' };
  if (S(a.pol) !== S(b.pol)) return { ok: false, reason: `출발지가 다릅니다 (${S(a.pol) || '?'} ≠ ${S(b.pol) || '?'})` };
  if (S(a.pod) !== S(b.pod)) return { ok: false, reason: `도착지가 다릅니다 (${S(a.pod) || '?'} ≠ ${S(b.pod) || '?'})` };
  if (S(a.iso) !== S(b.iso)) return { ok: false, reason: `사이즈·규격이 다릅니다 (${S(a.iso) || '?'} ≠ ${S(b.iso) || '?'})` };
  if (S(a.fe) !== S(b.fe)) return { ok: false, reason: `풀/엠티가 다릅니다 (${S(a.fe)} ≠ ${S(b.fe)})` };
  if (S(a.fe) === 'F') {
    //  4.29-03: 무게는 막지 않는다 — 검수사 2026-10-17 «무게이슈는 선적할때의 문제이지 양하할때는 전혀 무관 … 위치 수정과는 다른건» (SWSP 2609N 34·38번 베이 — 다른 항구 오선적을 바로잡는 맞교환이 무게 때문에 막혀 순서 알림이 계속 떴다).
    //  이 교환은 기록↔실물 교정이다(컨은 움직이지 않는다). 무게는 지정 자리에 다른 컨이 올 때의 선적 문제라 여기서 보지 않는다. 풀은 일항사 확인만 묻는다.
    return { ok: true, chiefMate: true };
  }
  return { ok: true };
}

// ── TallyOne 2.96: **검수원이 고친 자리를 시프팅도 본다.** (검수사 확정 2026-08-31) ──
//   원문 — *"일단 위치가 틀릴경우 위치 수정 부터 해야하고 거기서 바뀐컨 넘버를
//           양하 시프팅과 선적 시프팅에서 바꿔야 합니다."*
//   종전 시프팅은 **EDI 지도만** 봤다. 그래서 검수원이 「위치 수정」으로 실제 자리를 적어도
//   시프팅 대수가 안 따라왔다 — 계획과 실제가 어긋난 컨이 그대로 시프팅으로 남았다.
//   실측 MCSC 635S — EDI만 보면 96대, 검수원 수정을 겹치면 95대.
//   빠지는 것은 CAAU6532118 — 검수사가 «5660은 내리고 2118은 남겼다» 고 적어 둔 그 컨이다.
//   95 × 2 = 190 = 배정표 이적(모브). §2.81 정본 등식이 이때 처음 성립한다.
//   ⚠ 우선순위는 화면과 같다(effectivePos): 실체(`*_actual`) > 정해 준 자리(`*_assign`) > 계획(EDI).
//     창고 표식(`__`)은 자리가 아니므로 건너뛴다.
function _mergeRecPos(map, rec) {
  if (!map || !rec) return map;
  const out = {};
  for (const [cn, c] of Object.entries(map)) {
    const r = rec[cn];
    if (!r) { out[cn] = c; continue; }
    //  ⛔ 3.20 — **터미널이 채운 자리는 시프팅 판정에 안 쓴다.** 검수사 확정 2026-09-06 «시프팅은 96이 맞을것입니다».
    //    3.7-08 `applyCatosPos` 가 구독에서 카토스·동방 자리를 얹으면서, 시프팅이 **작업 중에 스스로 움직였다**
    //    (실측 MCAP 634N 96 → 94 — 셋이 빠지고 하나가 들었다). 뿌리는 «동형 공컨 순열» 필터가 닫힌 맞교환 고리를
    //    찾는데 그 재료가 **일부는 실적·나머지는 계획**으로 섞여, 카토스가 한 대씩 들어올 때마다 고리가 깨졌다 이어졌다 한 것이다.
    //    시프팅은 «작업 전에 몇 대를 들어야 하나»를 보는 숫자라 작업 중에 값이 움직이면 못 쓴다.
    //  ⇒ **계획 + 사람이 고친 자리**로만 센다. 터미널이 채운 자리(`_pos_src`)는 건너뛴다.
    //    ⚠ 2.96 «검수원이 자리를 고치면 다시 계산한다»는 그대로다 — 사람이 손으로 고친 것은 여전히 반영한다.
    //  ⚠ 문은 **두 짝**이다 — 실체(actual)와 «정해 준 자리»(assign) 둘 다 막아야 한다.
    //    3.13 `applyAutoSwap` 이 구독에서 `applyCatosPos` **바로 다음에** 돌면서, 터미널이 얹은 자리에서
    //    유도한 기계 배정을 `bay_assign`(assign_by 'auto' · `_assign_src` 'autoswap')으로 쓴다.
    //    그 값에는 `_pos_src` 가 없으므로 실체 쪽만 막으면 옆문으로 그대로 들어온다 —
    //    감사(다른 클로드) 실측: 카토스 한 대가 들어오자 95 → **66**(신고된 96→94 보다 크다).
    //    사람이 정한 자리는 `assign_by` 가 사람 이름이다(firebase.fbSetActualPosition) — 그것만 통과시킨다.
    const _fromTerm = !!r._pos_src;   // 'catos' | 'pnct' — 수집기 실적에서 온 자리
    const _autoAssign = String(r.assign_by || '') === 'auto' || String(r._assign_src || '') === 'autoswap';
    let b = '', rw = '', t = '';
    if (!_fromTerm && r.bay_actual && !String(r.bay_actual).startsWith('__') && r.row_actual && r.tier_actual) {
      b = r.bay_actual; rw = r.row_actual; t = r.tier_actual;
    } else if (!_autoAssign && r.bay_assign && r.row_assign && r.tier_assign) {
      b = r.bay_assign; rw = r.row_assign; t = r.tier_assign;
    }
    out[cn] = b ? { ...c, bay: b, row: rw, tier: t } : c;
  }
  return out;
}


export function computeShiftingFromVoyage(voyage) {
  const sw = swapFixList(voyage);
  const mapOf = (sec) => applySwapFix(_mergeRecPos(ediMapFromRaw(sec) || sec?.ediContainers || null, sec?.records || null), sw);
  return computeShiftingMap(mapOf(voyage?.discharge), mapOf(voyage?.loading),
                            { berthShift: voyage?.info?.berthShift });
}

/*  ★ 3.44 — **선사 시프팅 목록(RESTOW LIST)이 있으면 그것이 정본이다.**
    검수사 2026-09-12 «카토스에 있는 MCAT 시프팅 자료를 찾아서 검수앱과 맞춰주세요 2개 차이납니다» ·
    «둘 다 보이기»(서류와 앱 추정을 같이 적는다).
    실측 MCAT 635N — 선사 서류 14대(배정목록 이적 28모브 ÷ 2 와 일치)인데 앱 추정은 12대였다.
    빠진 둘은 ① 도착 자리와 선적 자리가 **같은 제자리 재적재**(MSKU5260201 33/09/04 → 33/09/04) —
    자리가 안 바뀌니 EDI 대조로는 못 잡는다 ② 평택 작업에 안 걸린다고 본 이적(MRKU9040939 17/01/82 → 3/03/88).
    ⇒ 서류가 오면 추정 규칙(computeShiftingMap)은 그대로 두고 **표시·집계의 정본만** 서류로 바꾼다.
    수집기(MailPilot 2.33)가 `voyages/{키}/restowList` 에 넣는다. 서류가 없는 배는 종전 추정 그대로다. */
//  배정목록 이적(모브) → 대수. 한 대가 내렸다 다시 실리므로 2모브가 1대다(§5-Y).
//  숫자가 아니거나 홀수여도 버리지 않는다 — 홀수면 올림해 «적어도 이만큼»으로 말한다.
function _berthShiftCount(voyage) {
  const mv = Number(voyage?.info?.berthShift);
  if (!Number.isFinite(mv) || mv <= 0) return null;
  return Math.ceil(mv / 2);
}

//  선사 서류 지문 — 번호·자리까지 찍어야 «같은 대수로 자리만 고쳐 온 서류»를 캐시가 놓치지 않는다(3.44 감사 지적).
function _restowSig(rl) {
  if (!rl || typeof rl !== 'object') return '';
  const ks = Object.keys(rl).filter((k) => k && !k.startsWith('_')).sort();
  return ks.length + ':' + ks.map((k) => `${k}>${(rl[k] && rl[k].from) || ''}>${(rl[k] && rl[k].to) || ''}`).join(',') + '|' + (rl._meta?.at ?? '') + '|' + (rl._meta?.total ?? '') + '|' + (rl._meta?.mailAt ?? '') + '|' + (rl._meta?.file ?? '');   // 4.13 감사: 메일 시각·파일명이 바뀌면 근거 한 줄도 다시 만든다
}
export function restowMapFromDoc(restowList) {
  if (!restowList || typeof restowList !== 'object') return null;
  const out = {};
  let dropped = 0;
  for (const [cn, v] of Object.entries(restowList)) {
    if (!cn || cn.startsWith('_') || cn.length !== 11 || !v || typeof v !== 'object') { if (cn && !cn.startsWith('_')) dropped += 1; continue; }
    //  ⚠ 감사 지적(3.44) — 빈 칸을 padStart 로 채우면 '0000000' 이 되어 7자리 검사를 통과한다.
    //    그러면 깨진 행이 «제자리 재적재» 한 대로 조용히 집계·인쇄된다. 빈 칸은 채우기 전에 거른다.
    const rawF = String(v.from == null ? '' : v.from).trim(), rawT = String(v.to == null ? '' : v.to).trim();
    //    ⚠ 재감사 — 자릿수로 거르면 실서류가 빠진다(MRKU9040939 는 3/03/88 → '30388' 5자리다).
    //      빈 칸·숫자 아님만 거르고 자릿수는 padStart 가 맞춘다.
    if (!/^\d{1,7}$/.test(rawF) || !/^\d{1,7}$/.test(rawT)) { dropped += 1; continue; }
    const from = rawF.padStart(7, '0');
    const to = rawT.padStart(7, '0');
    out[cn] = { from, to, _iso: v.iso || v.sztp || '', _fe: String(v.fe || '').toUpperCase() === 'E' ? 'E' : 'F',
                _doc: true, _same: from === to };
  }
  const meta = restowList._meta || null;
  //  서류가 «0대»라고 말하면 그것도 답이다 — 빈 맵에 표식을 달아 돌려준다(추정으로 안 떨어진다).
  if (!Object.keys(out).length && !(meta && Number(meta.total) === 0)) return null;
  //  configurable — 캐시 창구가 «앱 추정과의 차이»를 여기에 덧붙여 다시 쓴다(못 쓰면 차이가 화면에서 사라진다).
  //    ⚠ 재감사 — 거른 행이 있으면 조용히 «정본 13대»로 나간다. 서류가 말한 대수와 대조해 표식을 남긴다(화면이 밝힌다).
  const _n = Object.keys(out).length, _tot = meta && meta.total != null ? Number(meta.total) : null;
  if (dropped || (_tot != null && _tot !== _n)) console.warn(`[시프팅] 선사 서류 ${_tot != null ? _tot : '?'}대 중 ${_n}대만 읽었습니다 — 못 읽은 행 ${dropped}건`);
  try { Object.defineProperty(out, '_meta', { value: { source: 'carrier', ...(meta || {}), read: _n, dropped, docTotal: _tot }, enumerable: false, configurable: true }); } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
  return out;
}

/*  ★ 3.65 — **시프팅 재선적 «실제 자리»**(검수사 2026-09-28 «시프팅 리스트에서 양하/선적/실제위치(컨별 선적완료시 마다 추가)되게 해주세요»).
    선사 RESTOW LIST(restowList)는 작업 전 계획이다 — 실측 MCSN 639S 20대 중 실은 자리가 계획과 같은 것은 1대뿐이었다.
    실제 자리의 원천은 둘이다.
      ① 카토스 — 수집기 2.37 이 «컨테이너 조회»(반출입 구분 Shift)에서 `voyages/{키}/restowActual/{컨}` {to, at, from, inAt, fe, iso, op, pod, src:'catos'} 로 넣는다.
         실측 MCSN 639S 20대 = 마감텔리 선적 EDI·ASC 20/20 · XTPG 541W 50대 = 시프팅 리스트 50/50. 실은 시각은 크레인 일반 선적 순서 사이에 분 단위로 맞았다.
      ② 검수원 — 앱에 넣은 선적 자리(`loading/records/{컨}` 의 bay/row/tier_actual — 기록지 사진·위치 지정). 터미널이 얹은 행(`_pos_src`)은 사람 자리가 아니다.
    **사람이 넣은 자리가 먼저다**(3.60-09 «먼저 한 완료가 남는다»와 같은 규칙) — 카토스와 다르면 둘 다 돌려주고 diff 표식(화면이 ⚠ 로 밝힌다).
      ⚠ 단 **실렸다는 표식(선적 completed)이 있는 자리만** 사람 자리다(감사 — VoyageSummaryCard «bay_actual 은 실렸다가 아니다, completed 하나로만»).
        수석 베이상세 편집·위치 지정은 완료 없이 bay_actual 을 쓴다 — 부두에 있는 시프팅 컨을 옮겨 둔 것을 «실제로 실린 자리»로 세면 안 된다.
        완료가 터미널 반영(src:'term')이면, 사람 자리는 그 완료 뒤에 적은 것(기록지 사진처럼 실린 뒤 본 것)만 친다.
      ⚠ 시각은 **터미널 실은 시각이 먼저**다(감사) — 사람 기록의 actual_at 은 입력한 시각이지 실은 시각이 아니다. 터미널 기록이 없을 때만 완료 시각.
    자리 꼴은 restowList 와 같은 7자리(베이3·열2·단2). 화면 글자는 fmtShiftPos 한 벌로. */
export function fmtShiftPos(p) {
  const s = String(p == null ? '' : p).trim();
  const m = /^(\d{3})(\d{2})(\d{2})$/.exec(s);
  if (!m) return s;                                  // 예측 경로의 «6-02-82» 꼴 등은 그대로
  const b = String(parseInt(m[1], 10));
  return `${b.length === 1 ? '0' + b : b}-${m[2]}-${m[3]}`;   // 0180786 → 18-07-86 · 0060384 → 06-03-84 (fmtPos 와 같은 두 자리 베이)
}
function _shiftPos7(b, r, t) {
  const d = (x) => String(x == null ? '' : x).replace(/\D/g, '');
  const B = d(b), R = d(r), T = d(t);
  if (!B || !R || !T) return '';
  return B.padStart(3, '0').slice(-3) + R.padStart(2, '0').slice(-2) + T.padStart(2, '0').slice(-2);
}
export function fmtShiftTime(ms) {   // 실은 시각 «04:19» — 기기 시각대와 상관없이 KST(검수 현장 시각)
  const t = Number(ms);
  if (!t) return '';
  try { return new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }); } catch (e) { return ''; }
}
//  실제 칸 글자 한 벌 — «18-09-86 검수원 (터미널 18-07-86)» · 터미널 자리면 «18-07-86». 목록 창·인쇄·엑셀·검수 리스트 [별첨2] 가 같이 쓴다.
export function fmtShiftAct(s) {
  if (!s || !s.act) return '';
  return `${fmtShiftPos(s.act)}${s.actSrc === 'app' ? ' 검수원' : ''}${s.actDiff ? ` (터미널 ${fmtShiftPos(s.actCatos)})` : ''}`;
}
//  한 컨의 실제 재선적 자리 — 없으면 null. { to, at, src:'app'|'catos', catosTo, catosAt, diff }
export function shiftActualOf(voyage, cn) {
  if (!voyage || !cn) return null;
  const ra = voyage.restowActual && voyage.restowActual[cn];
  const cTo = ra && /^\d{5,7}$/.test(String(ra.to || '')) ? String(ra.to).padStart(7, '0') : '';
  const catos = cTo ? { to: cTo, at: Number(ra.at) || 0 } : null;
  let app = null;
  const r = voyage.loading && voyage.loading.records && voyage.loading.records[cn];
  const done = voyage.loading && voyage.loading.completed && voyage.loading.completed[cn];
  const doneAt = done ? (Number(done.at) || 0) : 0;
  //  실렸다는 표식 — 사람이 앱으로 완료했거나, 터미널 반영 완료 **뒤에** 사람이 자리를 적었을 때(기록지 사진)만.
  const seenLoaded = !!done && (!isAutoDone(done) || (Number(r && r.actual_at) || 0) >= doneAt);   // 4.12: 마감 EDI 적용도 사람이 본 자리가 아니다
  if (r && seenLoaded && !r._pos_src && !r.planTaken && r.bay_actual != null && r.bay_actual !== '' && !String(r.bay_actual).startsWith('__')) {
    const to = _shiftPos7(r.bay_actual, r.row_actual, r.tier_actual);
    //  앱 선적확인이 EDI 계획 자리를 그대로 베껴 적은 것(moves 마지막 why:'loaded' · to = 계획)은 사람이 본 자리가 아니다(bayViewOverlayOf 와 같은 뜻).
    //    시프팅 컨은 대개 선적 EDI 에 없다 — 계획이 없으면 베낄 것도 없으므로 사람이 넣은 자리다.
    const e = voyage.loading.ediContainers && voyage.loading.ediContainers[cn];
    const mv = Array.isArray(r.moves) ? r.moves : [];
    const last = mv.length ? mv[mv.length - 1] : null;
    const p2 = (x) => String(x == null ? '' : x).padStart(2, '0');
    const planTo = (e && e.bay != null && e.bay !== '' && e.row != null && e.tier != null) ? `${p2(parseInt(e.bay, 10))}-${p2(e.row)}-${p2(e.tier)}` : null;
    const copied = !!(last && last.why === 'loaded' && planTo && String(last.to || '') === planTo);
    if (to && !copied) app = { to, at: doneAt || Number(r.actual_at) || 0 };
  }
  if (!app && !catos) return null;
  const use = app || catos;
  return { to: use.to, at: (catos && catos.at) || use.at || 0, src: app ? 'app' : 'catos',
           catosTo: catos ? catos.to : '', catosAt: catos ? catos.at : 0, diff: !!(app && catos && app.to !== catos.to) };
}
//  시프팅 목록 행 — VoyagePage 가 부르는 한 벌(종전 VoyagePage 안에 있던 것을 옮기고 실제 칸을 붙였다).
//    shiftingMap = computeShiftingMapCached/shiftingMapForDisplay 결과 · fullEdiMap = 양하·선적 EDI 합친 지도.
export function shiftingListOf(shiftingMap, fullEdiMap, voyage) {
  const keys = Object.keys(shiftingMap || {});
  if (!keys.length) return [];
  const em = fullEdiMap || {};
  return keys.map((cn) => {
    const c = em[cn] || {};
    const s = shiftingMap[cn] || {};   // 1.43-02: 예측 경로엔 from이 없었다 — 결측이 와도 안 죽게
    const a = shiftActualOf(voyage, cn);
    //  3.44: 서류 정본 행은 EDI 에 없을 수 있다 — 규격·풀엠티는 서류 값으로 채우고 제자리 재적재를 표식한다.
    return { cn, from: s.from || s.pos || '', to: s.to || '', iso: c.iso || s._iso || '', pod: ((s._forecast === 'keep' || s._keepConf) && s.pod) || c.pod || '', fe: c.fe || s._fe || '',
             doc: !!s._doc, same: !!s._same,
             confKeep: s._keepConf ? { pod: (s._keep && s._keep.pod) || s.pod || '', mailAt: (s._keep && s._keep.mailAt) || '' } : null,   // 4.53: 선적 EDI 가 확정한 선사 지시 본선 잔류(파란 ◆ — 서류 대수와는 따로 센다)
             keep: s._forecast === 'keep' ? { pod: (s._keep && s._keep.pod) || s.pod || '', mailAt: (s._keep && s._keep.mailAt) || '', why: s._why || '' } : null,   // 4.48: 선사 지시 본선 잔류 예보(확정 아님)
             act: a ? a.to : '', actAt: a ? a.at : 0, actSrc: a ? a.src : '', actDiff: !!(a && a.diff), actCatos: a ? a.catosTo : '' };
  }).sort((a, b) => String(a.from || '').localeCompare(String(b.from || '')));
}
//  카토스 시프팅 실적에만 있는 컨(시프팅 목록 밖) — 목록을 바꾸지 않고 따로 보인다(3.44 «둘 다 보이기»와 같은 뜻). 실은 시각 순.
let _restowBadWarned = 0;
export function restowActualExtra(voyage, cnSet) {
  const ra = (voyage && voyage.restowActual) || {};
  const out = [];
  let badRows = 0;
  for (const [cn, v] of Object.entries(ra)) {
    if (!cn || cn.startsWith('_')) continue;
    if (cn.length !== 11 || !v || typeof v !== 'object' || !/^\d{5,7}$/.test(String(v.to || ''))) { badRows += 1; continue; }
    if (cnSet && cnSet.has(cn)) continue;
    out.push({ cn, from: v.from ? String(v.from).padStart(7, '0') : '', to: String(v.to).padStart(7, '0'), at: Number(v.at) || 0,
               iso: v.iso || '', fe: v.fe || '', pod: v.pod || '' });
  }
  //  조용히 넘기지 않는다(감사) — 수집기가 꼴을 바꿔 보내면 실제 칸이 «—» 로만 남는다. 콘솔에 남긴다.
  if (badRows && _restowBadWarned !== badRows) {   // 구독 틱마다 되풀이하지 않는다 — 수가 바뀔 때만
    _restowBadWarned = badRows;
    console.warn(`[시프팅 실제] restowActual ${badRows}행을 못 읽었습니다(자리 꼴이 7자리 숫자가 아님)`);
  }
  return out.sort((a, b) => a.at - b.at || a.cn.localeCompare(b.cn));
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
  return withKeepShiftForecast(_shiftingMapForDisplayBase(voyageKey, voyage, dictEntry), voyageKey, voyage, dictEntry);
}
function _shiftingMapForDisplayBase(voyageKey, voyage, dictEntry) {
  let cmp = null;
  try { cmp = computeShiftingMapCached(voyageKey, voyage); } catch (e) { cmp = null; }
  if (cmp && Object.keys(cmp).length) return cmp;              // 선적 EDI 있음 = 확정값
  if (cmp && cmp._meta && cmp._meta.source === 'carrier') return cmp;   // 3.44: 선사 서류가 «0대» 라고 말한 것도 답이다
  return predictedShiftingForDisplay(voyage, dictEntry);
}

/*  ★ 4.48 — **선사 지시 «본선 잔류»(keepOnboard) 한 벌.**
    검수사 2026-10-24 — 12:49 MAMP 641N 선사 메일 «Pls keep below cntrs onboard for CNDAI discharge. MNBU0129687 MNBU3119872» ·
    «메일대로 315 (평택 아님)» · 13:05 «시프팅 64로 기록 바랍니다» · 13:09 «만약 확정 떄문에 그렇다면 예보로 하세요 시프팅 확정은 파란 다이아몬드 표시 입니다.
    메일 적용은 한다면 노란 다이아 몬드로 시프팅 대상이라는걸 보여주세요» · «차후에 플래너가 확정하면 그떄 같이 바뀌게».
    자료 — `voyages/{항차}/keepOnboard/{컨}` = { pod(지시 양하항), src('manual' 앱 컨 상세 · 'mail' 수집기), by, at, mailAt(메일 시각 글), note(메일 한 줄), pod_orig }.
    ① 평택 양하분(ptkDischargeUnitsOf)에서 뺀다 — 평택에서 내리지 않는다.
    ② 그 자리 아래(같은 단·커버 아래 홀드)에 평택 양하분이 있으면 «시프팅 예보»(노란 ◆) — 판정은 예측 시프팅 한 벌(predictShiftingFromVoyage)에
       그 컨의 POD 만 지시 양하항으로 바꿔 넣는다(forcePod). 실측 MAMP 641N — 22-05-86·22-07-86 «같은 스택 22베이 양하분 위 — 들어내야 양하» 두 대, 다른 예측 변화 0.
    ③ 예보는 작업 항목이 아니다(1.76-05 — 확정만 작업). 확정 지도(선사 시프팅 목록·EDI 대조)에 그 컨이 들어오면 예보에서 빠지고 확정(파란 ◆)으로 그린다. */
export function keepOnboardOf(voyage) {
  //  ★ 4.53 — 선적 EDI(출항본)에 실린 지시 컨은 «예정»이 아니라 «확정»이다 — 확정 시프팅 지도(computeShiftingMapCached)가 파란 ◆ 로 들고, 여기(예정)에서는 뺀다.
  const kc = keepConfirmedOf(voyage);
  const act = _keepActiveOf(voyage);
  if (!Object.keys(kc).length) return act;
  for (const cn of Object.keys(kc)) delete act[cn];
  return act;
}
//  4.48 — 지시 기록 전부(풀린 것·꼴 틀린 것·평택 지시만 거름). 완료 거름은 하지 않는다(확정 판정 — 4.53 — 은 시프팅 내림이 «완료»를 남겨도 확정을 지키려고 이것을 본다).
function _keepRawOf(voyage) {
  const src = voyage && voyage.keepOnboard;
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const [k, e] of Object.entries(src)) {
    if (!e || typeof e !== 'object' || String(k).startsWith('_')) continue;
    if (e.cleared) continue;   // 풀린 지시 — 줄은 남긴다(수집기가 같은 메일로 다시 넣지 않게)
    const cn = String(e.cn || k || '').trim().toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cn)) continue;
    const pod = String(e.pod || '').trim().toUpperCase();
    if (!pod || isPyeongtaekPort(pod)) continue;   // 평택을 지시하면 잔류가 아니다
    out[cn] = { ...e, cn, pod };
  }
  return out;
}
//  ★ 4.48-03 감사(하-4) — 지시 컨을 실제로 내렸으면(완료 기록 · 터미널 실적) 예정은 끝난 것이다 — 예보·칩·앱 예상에 남기지 않는다(유닛은 그 컨을 종전대로 추가분으로 센다).
//    ⚠ 4.53 — 단 선적 EDI 가 확정한 지시 컨(keepConfirmedOf)은 이 거름을 타지 않는다: 확정 시프팅의 «내림» 모브도 완료 기록을 남기기 때문이다.
function _keepActiveOf(voyage) {
  const raw = _keepRawOf(voyage);
  const out = {};
  const _dSec = (voyage && voyage.discharge) || {}, _comp = _dSec.completed || {}, _tw = _dSec.termWork || {};
  const _done = (cn) => { const w = _comp[cn]; return !!(w && !(typeof w === 'object' && w.flag === 'missing')) || !!_tw[cn]; };
  for (const [cn, e] of Object.entries(raw)) if (!_done(cn)) out[cn] = e;
  return out;
}
//  ★ 4.53 — **본선 잔류 확정.** 검수사 2026-10-26 15:02 «시프팅 예정건이 선적플랜 10번 데크에 존재하는걸 볼수있습니다. 이로서 확정합니다.» (MAMP 641N · 14:50 «양하는 315 시프팅은 64개로 확정된듯합니다»).
//    4.48-03 의 약속 — «자료(EDI·리스트)가 고쳐져 와야 수가 바뀐다 · 수정본이 오면 수정본대로 맞아진다» — 의 나머지 반쪽이다. 인정 자료는 **선적 EDI**(검수사 10-24 20:02 «선적EDI라든지 취소가 된 리스트라든지»).
//    규칙 — 지시 컨(평택 아닌 양하항 지시)이 ① 평택 출항본 선적 EDI 에 **평택 선적이 아닌 컨**(POL 평택 아님 — 통과 컨)으로 실려 있고 ② 양하 EDI 자리와 선적 EDI 자리가 **다르면**(자리가 옮겨졌다) 확정이다.
//      확정이면 확정 시프팅 지도에 한 벌로 든다(from = 양하 EDI 자리 · to = 선적 EDI 자리 · `_keepConf`) → 평택 양하분에서 빠지고(315) 파란 ◆ 로 센다(64) · 작업 분모는 그대로(379).
//    ⚠ 선적 EDI 에 안 실렸거나 자리가 같으면(안 옮긴 잔류) 확정 아님 — 4.48-03 그대로 예정이다(실사례 없음 — 안 옮긴 잔류까지 확정으로 볼지는 검수사 결정 대기).
//    DB 는 안 건드린다(keepOnboard 줄 그대로) — 선적 EDI 원문을 읽어 계산만 한다. 선사 시프팅 목록 수정본이 오면 그 목록이 이긴다(지도에 이미 있으면 덮지 않는다).
const _keepConfCache = new Map();
export function keepConfirmedOf(voyage) {
  const raw = _keepRawOf(voyage);
  const ks = Object.keys(raw).sort();
  if (!ks.length || !voyage) return {};
  const d = voyage.discharge, l = voyage.loading;
  if (!(l && l.raw && l.raw.edi && typeof l.raw.edi.text === 'string' && l.raw.edi.text.length > 50) || !d) return {};   // 선적 EDI 원문이 없으면 확정할 근거가 없다(진행 숫자용 부분 항차 포함)
  const sw = swapFixList(voyage);
  const sig = [ks.map((cn) => cn + '>' + raw[cn].pod).join(','),
    d.raw && d.raw.edi && d.raw.edi.uploadedAt || 0, d.raw && d.raw.edi && d.raw.edi.sizeBytes || 0,
    l.raw.edi.uploadedAt || 0, l.raw.edi.sizeBytes || 0, l.raw.edi.text.length,
    Object.keys(d.ediContainers || {}).length, Object.keys(l.ediContainers || {}).length,
    sw.map((x) => x.id).join(','), _recPosSig(d.records) + '/' + _recPosSig(l.records)].join('|');
  const key = voyageKeyOf(voyage) || 'k';
  const hit = _keepConfCache.get(key);
  if (hit && hit.sig === sig) return hit.out;
  const mapOf = (sec, rawMap) => applySwapFix(_mergeRecPos(rawMap || sec.ediContainers || null, sec.records || null), sw);
  let out = {};
  try {
    const dRaw = ediMapFromRaw(d), lRaw = ediMapFromRaw(l);   // 원문은 한 번만 읽는다(읽기가 무겁다)
    //  선적 EDI 원문이 있는데 컨을 한 대도 못 읽으면(깨진 재업로드) 이미 확정이던 항차가 소리 없이 예정(317)으로 돌아간다 — 안전한 쪽이지만 조용히 하지 않는다(독립 감사 의심 5).
    if (!lRaw || !Object.keys(lRaw).length) console.warn('[4.53 본선 잔류 확정] 선적 EDI 원문이 있는데 컨을 읽지 못했습니다 — 확정하지 않고 예정으로 둡니다. 선적 EDI 를 다시 올려 주세요.');
    out = keepConfirmedFromMaps(voyage.keepOnboard, mapOf(d, dRaw), mapOf(l, lRaw));
  } catch (e) { console.warn('[4.53 본선 잔류 확정] 양하·선적 EDI 읽기 실패 — 확정하지 않고 예정으로 둡니다:', e); out = {}; }
  if (_keepConfCache.size > 60) _keepConfCache.clear();
  _keepConfCache.set(key, { sig, out });
  return out;
}
//  4.53 — 판정 본체(순수 함수). 검수앱(keepConfirmedOf — 항차 자료에서 두 지도를 만든다)과 콘앱(ConeParse — 자기 EDI 행으로 만든 두 지도)이 같이 부른다 — 같은 판정은 한 벌.
//    keepOnboard = voyage.keepOnboard 원본 · dMap/lMap = { 컨번호: {bay,row,tier,pod,pol,iso,fe} } (맞교환 겹침·검수원 자리 반영이 끝난 지도).
export function keepConfirmedFromMaps(keepOnboard, dMap, lMap) {
  const raw = _keepRawOf({ keepOnboard });
  const out = {};
  if (!Object.keys(raw).length || !dMap || !lMap || !loadEdiIsDeparture(lMap)) return out;   // 평택 출항본이 아닌 선적 EDI 는 도착 적부도다 — 확정 근거가 아니다(computeShiftingMap 과 같은 문지기)
  for (const cn of Object.keys(raw).sort()) {
    const dd = dMap[cn], ll = lMap[cn];
    if (!dd || !ll) continue;
    if (!ll.pol || isPyeongtaekPort(ll.pol)) continue;   // 평택에서 싣는 컨(수출)은 그 지시 컨이 아니다
    const from = _shiftEdiPos7(dd), to = _shiftEdiPos7(ll);
    if (!from || !to || from === to) continue;
    out[cn] = { from, to, pod: raw[cn].pod, _iso: dd.iso || ll.iso || '', _fe: String(dd.fe || ll.fe || '').toUpperCase() === 'E' ? 'E' : 'F', _keepConf: true, _keep: raw[cn] };
  }
  return out;
}
//  ★ 4.53 — 지시 컨(안 풀린 평택 아닌 지시) 중 확정 시프팅 집합에 든 것. 양하 EDI 는 아직 평택 POD 라도 평택에서 안 내리므로, 홈 카드·수석 보드의 «EDI 평택분»·«누락» 셈에서 뺀다
//    (안 빼면 «EDI 평택 317 · 매칭 315 · 누락 2» — 확정한 두 대가 리스트에 없다고 빨간 «누락 2» 로 선다. MAMP 641N 실자료 연막으로 잡았다). 예정(집합 밖)은 그대로 둔다 — 4.48-03.
export function keepInShiftOf(keepOnboard, shiftSet) {
  if (!shiftSet || !shiftSet.size) return [];
  return Object.keys(_keepRawOf({ keepOnboard })).filter((cn) => shiftSet.has(cn));
}
const _keepFcCache = new Map();
//  베이사전 내용 서명(4.48 감사 하 2) — 같은 객체는 한 번만 잰다.
const _keepDictSigMemo = new WeakMap();
function _keepDictSig(de) {
  if (!de || typeof de !== 'object') return 0;
  const m = _keepDictSigMemo.get(de); if (m != null) return m;
  let h = 2166136261, t = '';
  try { t = JSON.stringify(de) || ''; } catch (e) { console.warn('[4.48 본선 잔류] 베이사전 서명 실패 — 매번 다시 잽니다:', e); return Date.now(); }
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  const v = h >>> 0; _keepDictSigMemo.set(de, v); return v;
}
//  opts.confirmed — 확정 지도를 부르는 쪽이 이미 가졌으면 넘긴다(콘앱 — 자기 확정 지도 ctShiftMap). 없으면 검수앱 확정 지도(computeShiftingMapCached).
export function keepShiftForecastOf(voyageKey, voyage, dictEntry, opts) {
  const keep = keepOnboardOf(voyage);
  const ks = Object.keys(keep).sort();
  if (!ks.length) return {};
  let conf = {};
  if (opts && opts.confirmed && typeof opts.confirmed === 'object') conf = opts.confirmed;
  else { try { conf = computeShiftingMapCached(voyageKey, voyage) || {}; } catch (e) { console.warn('[4.48 본선 잔류] 확정 시프팅 지도 실패 — 예보만 봅니다:', e); conf = {}; } }
  const sec = (voyage && voyage.discharge) || {};
  const vsl = String((voyage && voyage.info && voyage.info.vsl) || '').toUpperCase();
  const de = dictEntry || ((typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[vsl] : null);
  //  4.48 감사(하 2) — 서명은 내용으로 — 확정 지도 키 전부(대수가 아니라) · 항로·배정표 이적·터미널 상태 · 베이사전 내용 · 리스트 POD(고친 POD·고른 POD 포함).
  const _inf = (voyage && voyage.info) || {};
  let _rp = 2166136261;
  for (const [cn, r] of Object.entries(sec.records || {})) { const t = cn + ':' + String((r && r.pod) || '') + ':' + String((r && r.pod_pick) || ''); for (let i = 0; i < t.length; i++) { _rp ^= t.charCodeAt(i); _rp = Math.imul(_rp, 16777619); } }
  const sig = [ks.map((cn) => cn + '>' + keep[cn].pod).join(','), sec.raw && sec.raw.edi && sec.raw.edi.uploadedAt || 0, sec.raw && sec.raw.edi && sec.raw.edi.sizeBytes || 0,
    Object.keys(sec.ediContainers || {}).length, Object.keys(sec.records || {}).length, _rp >>> 0, _keepDictSig(de),
    String(_inf.lane || ''), String(_inf.berthShift == null ? '' : _inf.berthShift), String(_inf.terminalStatus || ''),
    Object.keys(conf).filter((k) => !k.startsWith('_')).sort().join(',')].join('|');
  const key = String(voyageKey || voyageKeyOf(voyage) || 'k');
  const hit = _keepFcCache.get(key);
  if (hit && hit.sig === sig) return hit.out;
  let pred = {};
  try { pred = predictShiftingFromVoyage(voyage, de, { forcePod: Object.fromEntries(ks.map((cn) => [cn, keep[cn].pod])), noRevert: true }) || {}; }
  catch (e) { console.warn('[4.48 본선 잔류] 시프팅 예보 판정 실패 — 노란 ◆ 를 그리지 않습니다:', e); pred = {}; }
  const out = {};
  for (const cn of ks) {
    if (conf[cn] && !_isPredShift(conf[cn]) && !_isKeepShift(conf[cn])) continue;            // 플래너가 확정했다 — 확정(파란 ◆)이 이긴다 · 4.48 감사: 넘겨받은 지도의 예측(◇)·예보는 확정이 아니다(콘앱이 예측 지도를 넘긴다)
    const p = pred[cn];
    if (p) out[cn] = { ...p, to: '', _keep: keep[cn], _forecast: 'keep' };
  }
  _keepFcCache.set(key, { sig, out });
  return out;
}
//  화면·종이 지도에 예보를 얹는다 — 원래 지도는 건드리지 않는다(캐시 공유). 표시 부가정보(_meta)는 그대로 옮긴다.
function withKeepShiftForecast(base, voyageKey, voyage, dictEntry) {
  const fc = keepShiftForecastOf(voyageKey, voyage, dictEntry);
  const ks = Object.keys(fc);
  if (!ks.length) return base;
  const out = { ...(base || {}) };
  for (const cn of ks) if (!out[cn] || _isPredShift(out[cn])) out[cn] = fc[cn];   // 4.48 감사(하 1): 예측 ◇ 로 잡힌 지시 컨은 예보(노란 ◆)로 바꿔 그린다 — 확정(파란 ◆)만 이긴다
  const meta = base && base._meta;
  try { Object.defineProperty(out, '_meta', { value: { ...(meta || {}), keepForecast: ks }, enumerable: false, configurable: true }); }
  catch (e) { console.warn('[4.48 본선 잔류] 지도 부가정보 실패 — 계산에는 영향 없음:', e); }
  return out;
}
//  ★ 4.16 — 위 함수의 **예측 갈래**만 따로(동작 그대로 꺼냈다). 확정 지도(선사 서류·EDI 대조)가 빈 배에서만 부른다.
//    콘앱 카고플랜이 자기 확정 지도(ctShiftMap)가 빌 때 같은 예측을 부른다(§7.8-② «종이에도 예측 시프팅 — 확정아님 표기» · 판정 한 벌).
export function predictedShiftingForDisplay(voyage, dictEntry) {
  //  ★ 4.48 감사(하 1) — 확정 지도가 없는 배의 예측(◇)도 선사 지시 본선 잔류를 안다 — 지시 컨은 지시 양하항으로 넣어 판정한다(평택에서 안 내리므로 그 위 컨은 막지 않는다).
  //    종전엔 지시를 몰라 «지시 컨을 내리려고 위 컨을 든다»는 ◇ 가 남았다(보관 MCAT 635N MNBU0591592 → MRKU4866888·MRSU7150570 · KSKM 2617N SEGU2430571 → SEGU2523756). 지시가 없으면 종전 그대로.
  const _kp = keepOnboardOf(voyage), _kk = Object.keys(_kp);
  const pred = predictShiftingFromVoyage(voyage, dictEntry, _kk.length ? { forcePod: Object.fromEntries(_kk.map((cn) => [cn, _kp[cn].pod])) } : undefined) || {};
  const n = Object.keys(pred).length;
  if (!n) return pred;
  let tc = null;
  try { tc = shiftingTruthCheck(voyage, n); } catch (e) { tc = null; }
  if (!(tc && !tc.pending && tc.truth === 0)) return pred;     // 대조 불가·보류·이적>0 → 종전 그대로
  // ★ 검수사 지시 2026-08-23 — *"그래도 의심은 지우지 말고 커버영역 알림을 띄워주세요."*
  //   작업 대수에서만 뺀다. **어느 커버 어느 자리를 의심했는지는 그대로 넘겨** 화면이 알린다.
  //  ⚠ 2.79-02 (검수사 2026-08-28) — **삼자가 일치하면 의심 목록도 안 남긴다.**
  //    *«MCSC에 기록한 시프팅 안내는 불필요 합니다. 혼란을 줍니다.»*
  //    2.08-15 의 «의심은 지우지 말고 커버영역 알림»은 **배정표 이적만 0** 일 때의 지시였다.
  //    선사·세관·배정 셋이 같은 수를 말하면 그것은 의심이 아니라 **결론**이다 — 현장에 물을 것이 없다.
  if (tc.srcAgree) {
    const q = {};
    try { Object.defineProperty(q, '_meta', { value: { ...(pred._meta || {}), truthZero: 0, suspects: [], srcAgree: true }, enumerable: false }); } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
    return q;
  }
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

//  2.89-06 (검수사 «그안에서만 작업하는데 컨테이너가 증식을 하나요?») — 시프팅은 평택 축에서 뺀다.
//    1.76-05 확정 «시프팅은 진행률·리스트 총계에서 빼고 별도 칸» 이 홈카드·수석통계·요약카드의
//    완료/총계 계산에는 안 걸려 있었다. 재선적 기록이 생기자 완료 374/281(133%) 로 «증식»해 보였다.

/*  ★ 2.90-02 병합 — 2026-08-31 10:14 다른 세션 판(daab289)의 작업량 축 두 함수를 되살린다.
    10:15 내 판이 옛 베이스로 utils 를 덮어 이 둘이 사라졌고, 그것을 부르는 화면 셋
    (HomePage·ChiefDashboard·VoyageSummaryCard)이 소스에 남아 **다음 빌드가 깨질 상태**였다.
    ⚠ git 열차 충돌(작업표준 §3) — 빌드 직전 origin/main 최신 확인을 안 한 대가다. */

//  2.89-07 (검수사 «항차목록은 변치 않습니다. 계획이 변하지 않는한 변하는건 작업내용이 실시간
//    카운트 될뿐» · «작업량도 279+95 214+95» · «양하는 양하 선적은 선적이지») — 분모(작업량) 고정.
//    리스트에서 온 기록인가 — 선사 자료(CLL·세관리스트)가 채우는 필드가 하나라도 있으면 리스트다.
//    검수원 작업이 만든 기록(번호수정·맞바꿈 잔재 등 — 선사 필드 0)은 분모에 못 들어온다.
//    BUG-2026-004: MCSC 633N 맞바꿈 때 작업생성 기록 2건이 양하 모수를 279→281로 불려
//    서류상 로스 1이 잡혔다 — 실작업은 이상 없었다.
export function isListOriginRecord(r) {
  if (!r) return false;
  //  1순위는 출처(_source = 수집기가 리스트 파일명을 적는다 — 실측 1,724건 중 1,705건 보유).
  //  선사 필드는 폴백 — 번호만 있는 리스트 행(XTPG 538W LOADLIST 실측 2건)이 _source 로만 구분된다.
  return !!(r._source || r.wt || r.sl || r.pol || r.pod || r.sh || r.bl || r.op || r.tmp || r.iso);
}


//  2.89-07: 진행 숫자 한 벌 — 홈 카드(HomePage)·수석 통계(ChiefDashboard)·현황 요약(VoyageSummaryCard)
//    세 벌 사본이 2.89-06 «완료 374/281 = 133% 증식»을 낳았다. 분모·완료 계산은 여기 하나만 쓴다.
//    · 작업량(total) = 리스트 + 시프팅  (리스트가 아직 없으면 EDI 평택분(ptkCns 폴백) + 시프팅)
//    · 완료(done)   = 리스트완료 + 이 모드의 모브(시프팅∩completed — 양하=내림, 선적=실음)
//    · extra        = 리스트에도 시프팅에도 없는 완료(무적 등) — 분모 밖, 바를 밀지 않는다
//  ★ 4.16 — 화면 막대·대수는 **평택분(ptk)** 이고 시프팅은 따로(shift) 센다(검수사 2026-10-09 12:23 §7.8-① «양하리스트와 분리 시프팅 리스트 별도 관리»).
//    total·done(작업량 = 평택분 + 이 모드 모브)은 그대로 둔다 — 출항 배지·수석 보드 전체 %가 작업량으로 잰다(2.89-07 «279+95»).
//    선사 **선적** 리스트에 실려 온 시프팅 컨은 선적 평택분에도 센다 — 리스트가 정본이다(Fable 판정 2026-10-09 ⑤ · 검수사 원문 «214+95», MCSC 635S 선적 리스트 214 에 TGHU6154253). 양하는 예외 없음(isShiftOffPtk).
//    종전(2.89-06)엔 리스트에서 뺐다(213). 검수원 작업이 만든 기록(재선적 자리 등)은 리스트가 아니라 여전히 못 들어온다(isListOriginRecord).
//  ★ 4.48 감사(상 1) — keepOnboard(선사 지시 본선 잔류, voyage.keepOnboard)를 다섯째로 받는다. 섹션만 넘기면 지시를 몰라 홈 카드·수석 보드·현황 요약이 317 로 셌다(MAMP 641N — 맞는 값 315).
//    양하 평택분(리스트·EDI 평택분 어느 갈래든)에서 지시 컨을 뺀다 — ptkDischargeUnitsOf 와 같은 keepOnboardOf 한 벌.
export function progressOf(section, mode, shiftSet, ptkCns, keepOnboard) {
  const records = section?.records || {};
  const completed = section?.completed || {};
  const ss = shiftSet || new Set();
  //  4.48-03: 본선 잔류 지시는 예정 — 분모에서 빼지 않는다(keepOnboard 는 유닛 한 벌에 그대로 넘겨 keepIn 만 표시용으로 쓴다).
  const listCns = new Set(ownDirCns(records, mode).filter((cn) => isListOriginRecord(records[cn]) && !isShiftOffPtk(ss, records, mode, cn)));   // 4.16 Fable 판정: 양하는 리스트에 실려 있어도 시프팅으로만 · 선적만 예외 · 4.48 본선 잔류 뺌
  //  ★ 4.20 (Fable 판정 ④): 양하 분모 = 평택 양하분 한 벌(ptkDischargeUnitsOf — 세관 목록 + 추가분). 홈 카드·수석 통계·현황 요약 세 호출부가 여기를 지난다.
  //    목록이 없으면(basis 'edi') 종전 그대로 호출부의 EDI 평택분(ptkCns).
  const _U = mode === 'discharge' ? ptkDischargeUnitsOf({ discharge: section || {}, keepOnboard }, ss) : null;   // 4.20 감사: 이 진행 숫자의 시프팅 집합으로 · 4.48 본선 잔류
  const usePtk = !(_U && _U.basis !== 'edi') && listCns.size === 0 && ptkCns && ptkCns.size > 0;
  const baseSet = (_U && _U.basis !== 'edi') ? new Set([..._U.set].filter((cn) => !isShiftOffPtk(ss, records, mode, cn)))
    : usePtk ? new Set([...ptkCns].filter((cn) => !ss.has(cn))) : listCns;
  let baseDone = 0, moves = 0, extra = 0;
  for (const cn of Object.keys(completed)) {
    const inBase = baseSet.has(cn), inShift = ss.has(cn);
    if (inBase) baseDone += 1;
    if (inShift) moves += 1;
    if (!inBase && !inShift) extra += 1;
  }
  //  4.25: set = 평택분 분모 집합 그대로(숫자는 안 바뀐다) — 홈 상세 «베이별 진행» 이 이 집합을 베이로 나눈다(칸 합 = ptk.total · 두 벌 금지).
  return { listTotal: listCns.size, base: baseSet.size, baseDone, shiftN: ss.size, moves, extra,
           total: baseSet.size + ss.size, done: baseDone + moves, usePtk,
           ptk: { total: baseSet.size, done: baseDone }, shift: { total: ss.size, done: moves }, set: baseSet,
           mfnN: (_U && _U.basis !== 'edi' && _U.mfn) ? [..._U.mfn].filter((cn) => baseSet.has(cn)).length : 0,
           mfnExtraN: (_U && _U.basis !== 'edi' && _U.mfn && _U.mfn.size && _U.extra) ? [..._U.extra].filter((cn) => baseSet.has(cn)).length : 0 };   // 4.59-01: MFN 문구에 섞이지 않게 추가분 대수도 싣는다   // 4.58: 총계 안의 MFN 대수 — 홈 카드 «(리스트 234 + MFN 44)»
}

//  ★ 4.16 — **시프팅 분리 문지기 한 벌.** 그 방향 평택분에서 이 컨을 빼는가.
//    시프팅(확정 지도 키)이면 뺀다. 단 그 방향 선사 리스트에 실려 온 컨(isListOriginRecord · 반대 방향 리스트 아님)은 평택분에도 센다(Fable 판정 ⑤ «214+95»).
//    입구마다(항차 화면·자동 가이드·출력 센터·미르 펼치기·마감텔리·갱별 보고·현황 요약) 이것만 부른다 — «리스트에 기록이 있으면 평택분» 사본이 시프팅 재선적 기록을 평택분으로 새게 했다(MCAP 639N 선적 293→298).
export function isShiftOffPtk(shiftSet, records, mode, cn) {
  if (!cn || !shiftSet || !shiftSet.has(cn)) return false;
  //  Fable 판정 2026-10-09 — **방향을 가린다.** «214+95» 는 선적 리스트 얘기다. 양하는 규칙 ①(«양하리스트와 분리»)이 우선 — 리스트에 실려 있어도 시프팅으로만 센다.
  if (mode !== 'loading') return true;
  const r = records && records[cn];
  return !(r && isListOriginRecord(r) && !isOppositeDirRecord(r, mode));
}
//  ★ 4.20 (검수사 2026-10-10 00:02 «그래도 기본은 세관이 맞습니다. 나중에 추가분이 생기면 추가분만 더하면 됩니다. 그 추가분은 세관에 목록에 없지만 실제 양하된 컨테이너로 신고 대상입니다» · Fable 판정 ④):
//    **평택 양하분(유닛) 한 벌.** 마감텔리(ptkContainers)·갱별 보고(shiftReportContainers)·홈 카드(progressOf)·미르·콘앱이 이것만 부른다.
//    종전엔 세 벌(EDI POD 평택 · EDI∪records 에 records POD 가 덮음 · 리스트)이 같은 배를 다르게 셌다 — RZOR R106E 마감텔리 189 · 갱별 191 · 홈 190, ATPR 2643E 갱별 266(세관 «최종항» VNSGN 이 평택분을 떨어뜨림).
//    L(목록) = 양하 records 중 리스트 출신(isListOriginRecord)·반대 방향 아님. 세관 표식(_customs)이 하나라도 있으면 세관 행만(basis 'customs'),
//      없으면 선사 양하 리스트(basis 'list' — 2.89-07 홈 카드와 같음), L 이 비면 basis 'edi'.
//    X(추가분) = (EDI POD 평택 ∪ 완료 기록 ∪ 터미널 실적) − L — 목록에 없이 실제로 내린 컨(신고 대상). basis 'edi' 면 추가분 없음(종전 그대로 EDI POD 평택 — 무적 완료는 분모 밖).
//    유닛은 컨번호(cn)로 센다 — EDI 자리표시 키(__SLOT___)는 그 행의 cn 으로(R106E SAWTBP004 를 EDI 키·records 키로 두 번 세던 것). 예약 자리·컨번호 없는 자리는 유닛이 아니다.
//    세관 «최종항» 열(records.pod)은 평택 판정에 쓰지 않는다(등재 여부만). EDI 가 통과분이라 해도 세관 목록에 있으면 센다(PCBJ 2609N 4대) — transit 에 남겨 보고서가 밝힌다.
//    검수사·수석이 고른 POD(pod_pick)는 종전대로 맨 위다(3.53) — 평택 아닌 POD 를 고른 목록 행은 빼고, 고른 평택 POD 는 EDI POD 대신 본다.
//    ★ 4.20 감사(Fable 판정 상-1): **시프팅을 안다** — 양하 방향 시프팅 컨(isShiftOffPtk 'discharge' — 늘 뺀다)은 set·extra·transit 에 안 든다.
//      종전엔 «입구마다 거른다» 였는데 거르지 않는 입구(마감 점검 분모 MCSC 633N 374 · 시프팅 95대의 추가분 표식)가 샜다. 입구의 isShiftOffPtk 는 그대로 둔다(중복 · 해 없음).
//      shiftSet 을 넘기면 그것을(진행 숫자·미르 분모·콘앱 — 이미 가진 집합), 안 넘기면 항차 전체(key 또는 info 가 있는 것)에서 shiftCnSetOf 로 구한다. 반쪽 항차(양하 묶음만)는 빈 집합.
//    완료 기록의 누락 표식(flag 'missing')은 내린 컨이 아니다.
export const EXTRA_OF_LIST_LABEL = { customs: '추가분 — 세관 목록에 없음(신고 대상)', list: '추가분 — 양하 리스트에 없음' };
//  미르 대수 답에 붙는 한 토막 — 컨 상세 표식(EXTRA_OF_LIST_LABEL)과 같은 자리에 둔다. 추가분이 없으면 빈 글.
export function extraOfListNote(n, basis) {
  if (!(n > 0)) return '';
  return basis === 'list' ? `(양하 리스트 밖 추가분 ${n}대)` : `(세관 목록 밖 추가분 ${n}대 — 신고 대상)`;
}
//  ★ 4.58 — MFN(화물은 있으나 적하목록 없음 · 세관 코드표 customsCodes.MFN) 문구 한 벌. 터미널(PCTC) 이동지시(MOVINS)의 평택 도착 278대 가운데 메일 양하 리스트(234)에 없는 44대.
//    검수사 2026-10-31 «278로 표기 바랍니다 단 44대가 MFN대상이라는것도 278(234+MFN44)» · «34대분은 주의 대상으로 다렌과 텐진이 목적지 였다는걸 표기 바랍니다. 나중에 확정이 되면 정상적으로 돌리는게 맞고요».
export const MFN_LABEL = 'MFN — 화물은 있으나 양하 리스트(적하목록)에 없음';
export const MFN_DEST_KO = { CNDLC: '다롄', CNTXG: '톈진', CNTAO: '칭다오', KRPTK: '평택' };
export const MFN_RELOAD_LABEL = '재적재(내렸다 다시 실음)';
export const mfnIsChinaDest = (d) => d === 'CNDLC' || d === 'CNTXG' || d === 'CNTAO';
export const mfnDestKo = (d) => MFN_DEST_KO[d] || d || '';
//  중국행 주의 문구 — 예) «주의 — 원래 목적지 다롄(통과화물이었음)»
export const mfnChinaWarn = (d) => `주의 — 원래 목적지 ${mfnDestKo(d)}(통과화물이었음)`;
//  총계 옆에 붙는 한 토막 — extraOfListNote 와 같은 꼴. total 은 MFN 을 합친 총계(278), n 은 MFN 대수(44) → «(리스트 234 + MFN 44)». MFN 이 없으면 빈 글.
export function mfnNote(n, total, extra = 0) {
  if (!(n > 0)) return '';
  //  4.59-01 — EDI 에만 있는 추가분(4.20)이 총계에 같이 들면 «리스트 235» 로 섞어 부르지 않는다: «리스트 234 + 추가분 1 + MFN 44». 추가분이 0 이면 종전 문구 그대로.
  if (extra > 0 && total > n + extra) return `(리스트 ${total - n - extra} + 추가분 ${extra} + MFN ${n})`;
  return total > n ? `(리스트 ${total - n} + MFN ${n})` : `(MFN ${n}대)`;
}
//  voyage.discharge.mfnList.items → { cn: 항목 } (수집기가 올림 — 앱은 읽기만). 없으면 빈 객체.
//  4.59-01 (검수사 2026-10-31 12:49 «3400은 위치가 보이지 않습니다 2492와 규격도 다르고요») — 재적재(reload===true: 내렸다 다시 실은 컨 — 출항 Baplie 에 평택 재적재)는 양하 컨이 아니라 시프팅 컨이다.
//    양하 대수·MFN 유닛·상자·출력·마감텔리·대조 어디에도 넣지 않는다 — 걸러내는 곳은 이 함수 한 곳이고 소비처는 이 결과만 쓴다(같은 판정 한 벌). 뺀 건수는 mfnReloadItemsOf 로 한 줄 참고에만 쓴다.
//  ★ 4.59-01 후속(검수사 2026-10-31 12:52 «그런데 왜 목적지가 평택이었을까요 환적입니까?») — 재적재(reload) 컨을 양하·MFN 에 세는가. 3400(SUDU7733400)은 평택에서 내려 두었다가 다음 배로 다시 싣는 환적성 재적재일 가능성이 크지만
//    실제로 내리는지는 현장 확인이 먼저다 — 확인 전에는 센다(true: MFN 44 · 279). 확인되어 양하가 아니라고 정해지면 이 값만 false 로 바꾼다(MFN 43 · 278) — 가르는 곳은 mfnItemsOf 한 곳이고 소비처는 그 결과만 쓴다.
export const MFN_RELOAD_COUNTS = false;   // 4.59-05: 검수사 2026-10-31 19:55 «터미널에선 TRHU4332492 정보는 있는데 SUDU7733400 정보는 없습니다» — 터미널이 양하로 안 세는 재적재 컨은 뺀다(MFN 43)
export const MFN_RELOAD_PENDING = '재적재 예정 — 양하 확인 전';
export function mfnItemsOf(voyage) {
  const m = voyage && voyage.discharge && voyage.discharge.mfnList;
  const it = m && typeof m === 'object' && m.items && typeof m.items === 'object' ? m.items : null;
  if (!it) return {};
  const out = {};
  for (const [k, x] of Object.entries(it)) if (x && (MFN_RELOAD_COUNTS || !x.reload)) out[k] = x;
  //  ★ 4.59-05 (검수사 2026-10-31 19:55·19:57 터미널 컨테이너 정보조회 화면 — TRHU4332492 는 양하 NIKEN 642N · 양하항 KRPTK · 선내위치 44-08-86 · 선적 칸은 비어 있다) —
  //    MOVINS 파일은 이 컨을 «선적(LOA)» 으로 적어 mfnList 에서 빠졌지만 터미널 자료(EDI)엔 평택 양하 컨으로 있다. 메일 양하 리스트에 없고 터미널 EDI 엔 있으면 그 컨이 MFN 이다.
  //    mfnList 가 있는 배(수집기가 이동지시를 읽은 배)에서만, 리스트가 있을 때만 — 컨번호를 코드에 박지 않는 한 규칙이다. 가르는 곳은 이 함수 한 곳(소비처는 이 결과만 쓴다).
  const sec = voyage.discharge, edi = sec.ediContainers, recs = sec.records || {};
  if (edi && typeof edi === 'object' && Object.entries(recs).some(([cn, r]) => _unitKey(cn) && r && isListOriginRecord(r) && !isOppositeDirRecord(r, 'discharge'))) {
    for (const [k, c] of Object.entries(edi)) {
      if (!c || c.isBooking || c.pendingCn) continue;
      const cn = String(c.cn || k || '').trim();
      if (!_unitKey(cn) || out[cn] || (recs[cn] && isListOriginRecord(recs[cn]))) continue;
      if (!isPyeongtaekPort(resolvedPod(c, recs[cn]))) continue;
      out[cn] = { cn, iso: c.iso || c.iso_edi || '', fe: c.fe || '', wt: c.wt || null, pol: c.pol || '', pod: 'KRPTK', dest: '', han: '', reload: false, tmp: c.tmp === '' || c.tmp == null ? null : c.tmp, fromEdi: true };
    }
  }
  return out;
}
//  4.62-05 — MFN 이 EDI 평택분에 몇 대 들었는지 한 벌(Set). 홈 카드(HomePage.computeStats)와 수석 상황판(ChiefDashboard.computeStats)이 같은 답을 내도록 둘 다 이 함수를 부른다.
//    ① «누락» = EDI 평택 − 매칭 − MFN — 검수사 2026-11-01 19:17 «왜 이런 표기 불일치가 자꾸 나오는거죠? 44와 43» (수석 상황판만 MFN 을 안 빼서 «누락 43»).
//    ② «매칭» 은 리스트와 맞는 컨만 센다 — 검수사 19:25 «왜 매칭이 234에서 235로 다시 바뀌었는지». MRSU7029954 는 터미널이 내린 MFN 인데 누가 «취소원복» 을 눌러 리스트 출처 없는 기록(records)이
//    생기자 매칭에 한 대 더 잡혔다(MCSN 642N 실측). MFN 은 MFN 으로만 센다 — 기록이 생겨도 매칭이 아니다.
//    MFN = 터미널 EDI 에는 있고 메일 양하 리스트에는 없는 컨(이미 «MFN N» 으로 센다) — 양하만. section 은 voyage.discharge.
export function mfnInPtkOf(section, ptkCns) {
  const keys = Object.keys(mfnItemsOf({ discharge: section }));
  if (!keys.length) return new Set();
  const s = new Set(keys);
  return new Set([...ptkCns].filter((cn) => s.has(cn)));
}
export function mfnReloadItemsOf(voyage) {
  const m = voyage && voyage.discharge && voyage.discharge.mfnList;
  const it = m && typeof m === 'object' && m.items && typeof m.items === 'object' ? m.items : null;
  const out = {};
  if (it && !MFN_RELOAD_COUNTS) for (const [k, x] of Object.entries(it)) if (x && x.reload) out[k] = x;   // 뺀 것만 — 세는 동안은 비어 있다
  return out;
}
const _unitKey = (k) => !!k && !String(k).startsWith('_');
export function ptkDischargeUnitsOf(voyage, shiftSet) {
  const sec = (voyage && voyage.discharge) || {};
  const shSet = shiftSet instanceof Set ? shiftSet : (voyage && (voyage.key || voyage.info)) ? shiftCnSetOf(voyageKeyOf(voyage), voyage) : new Set();
  const onPtk = (cn) => !isShiftOffPtk(shSet, sec.records || {}, 'discharge', cn);   // 양하는 시프팅이면 늘 뺀다
  const edi = sec.ediContainers || {}, recs = sec.records || {}, comp = sec.completed || {}, tw = sec.termWork || {};
  const ediKeyOf = new Map(), ediPtk = new Set(), ediNotPtk = new Set();
  for (const [k, c] of Object.entries(edi)) {
    if (!c || c.isBooking || c.pendingCn) continue;
    const cn = String(c.cn || k || '').trim();
    if (!_unitKey(cn)) continue;
    if (!ediKeyOf.has(cn) || k === cn) ediKeyOf.set(cn, k);
    if (isPyeongtaekPort(resolvedPod(c, recs[cn]))) { ediPtk.add(cn); ediNotPtk.delete(cn); }
    else if (!ediPtk.has(cn)) ediNotPtk.add(cn);
  }
  const rows = Object.entries(recs).filter(([cn, r]) => _unitKey(cn) && r && isListOriginRecord(r) && !isOppositeDirRecord(r, 'discharge'));
  const cust = rows.filter(([, r]) => r._customs);
  const basis = cust.length ? 'customs' : (rows.length ? 'list' : 'edi');
  const extra = new Set();
  //  ★ 4.48-03 — 선사 지시 «본선 잔류»(keepOnboard)는 **예정**이다 — 평택 양하분에서 빼지 않는다(자료대로 센다). 검수사 2026-10-24 20:02 «모든 서류는 317을 이야기 하는데 세관만 315 …
  //    앱이 인정할 자료가 필요 할것입니다. 선적EDI라든지 취소가 된 리스트라든지 그런거 없이 강제로 고쳐서 문제가 생긴것 같습니다» · 20:07 «예정으로만 남겨도 되는걸 실제처럼 수정해서 그렇습니다» ·
  //    20:08 «수정본이 오면 또 수정본 대로 맞아질것입니다. 자료가 맞춰서 올테니까요». 4.48 은 메일 한 통으로 317 → 315 를 만들었다(MAMP 641N). 이제 양하 EDI·리스트가 고쳐져 와야 수가 바뀐다.
  //    keepIn — 지시 컨 가운데 이 집합에 든 것(아직 안 내린 것). 세관 목록 밖이어도 «추가분(신고 대상)» 표식은 달지 않는다(메일이 설명한다) — 내렸으면(완료 기록) 종전대로 추가분.
  const keep = keepOnboardOf(voyage);
  if (basis === 'edi') { const _ke = new Set([...ediPtk].filter((cn) => onPtk(cn) && keep[cn])); return { basis, set: new Set([...ediPtk].filter((cn) => onPtk(cn))), extra, listSet: new Set(), ediKeyOf, transit: new Set(), shiftSet: shSet, keepIn: _ke, mfn: new Set(), mfnItems: new Map() }; }   // 4.58: 목록 없는 배(basis 'edi')는 소비처가 U.set 을 안 보고 EDI POD 평택분을 직접 센다 — MFN 을 set 에 더하면 소비처마다 답이 갈려 더하지 않는다(MFN 목록 출력은 mfnList 를 직접 읽는다)
  const picked = (r) => !!(r.pod_pick && r.pod && !isPyeongtaekPort(r.pod));   // 3.53: 평택 아닌 POD 를 고른 행
  const listSet = new Set((basis === 'customs' ? cust : rows).filter(([cn, r]) => !picked(r)).map(([cn]) => cn));
  const keepIn = new Set();
  const _mfnAll = new Set(Object.entries(mfnItemsOf(voyage)).map(([k, it]) => String((it && it.cn) || k || '').trim()));   // 4.58: MFN 컨은 완료·실적이 생겨도 MFN 이다(추가분보다 먼저) — 터미널은 278대를 모두 내리므로 작업이 진행돼도 MFN 표시·대수가 줄면 안 된다
  const _doneCn = (cn) => { const w = comp[cn]; return !!(w && !(typeof w === 'object' && w.flag === 'missing')) || !!tw[cn]; };
  const add = (cn) => {
    if (!(_unitKey(cn) && !listSet.has(cn) && !_mfnAll.has(cn) && !(recs[cn] && picked(recs[cn])) && onPtk(cn))) return;
    if (keep[cn] && !_doneCn(cn)) { keepIn.add(cn); return; }   // 4.48-03: 예정 — 세지만 추가분(신고 대상) 표식은 안 단다
    extra.add(cn);
  };
  for (const cn of ediPtk) add(cn);
  for (const [cn, w] of Object.entries(comp)) if (w && !(typeof w === 'object' && w.flag === 'missing')) add(cn);
  for (const cn of Object.keys(tw)) add(cn);
  const transit = new Set([...listSet].filter((cn) => ediNotPtk.has(cn) && onPtk(cn)));
  for (const cn of listSet) if (keep[cn] && onPtk(cn)) keepIn.add(cn);
  //  ★ 4.58 — MFN(터미널 이동지시엔 있고 메일 양하 리스트엔 없는 컨 · 수집기가 voyages/{키}/discharge/mfnList 로 올림)을 유닛에 더한다. 추가분(extra — 신고 대상)과는 별개의 집합이다.
  //    이미 목록·추가분·본선 잔류에 든 컨, 시프팅이라 평택분이 아닌 컨, 평택 아닌 POD 를 고른 컨은 더하지 않는다. mfnList 가 없으면 빈 집합 — 종전과 같다.
  const mfn = new Set(), mfnItems = new Map();
  for (const [cn0, it] of Object.entries(mfnItemsOf(voyage))) {
    const cn = String((it && it.cn) || cn0 || '').trim();
    if (!it || !_unitKey(cn) || listSet.has(cn) || extra.has(cn) || keepIn.has(cn) || !onPtk(cn) || (recs[cn] && picked(recs[cn]))) continue;
    mfn.add(cn); mfnItems.set(cn, it);
  }
  return { basis, set: new Set([...[...listSet].filter(onPtk), ...extra, ...keepIn, ...mfn]), extra, listSet, ediKeyOf, transit, shiftSet: shSet, keepIn, mfn, mfnItems };
}
//  4.20 후속 (Fable 판정 ④-4 — 규범 §4-4): 미르 «양하 몇 대»·«총 무브수»·교대 브리핑·갱 배분이 같은 양하 수를 말하게 하는 한 벌.
//    pred(c) — 그 양하 행(EDI 행 등 cn 이 있는 행)이 평택 양하분인가(시프팅이면 아님). 목록 없는 배(basis 'edi')는 pred 가 null — 부르는 쪽 종전 POD 판정.
//    cns — 평택 양하분 컨번호(시프팅 뺌). 행이 없는 유닛(세관 목록에만 있는 컨)도 든다.
export function ptkDischargeJudgeOf(voyage) {
  const U = ptkDischargeUnitsOf(voyage);
  if (U.basis === 'edi') return { U, pred: null, cns: null };
  const ss = shiftCnSetOf(voyageKeyOf(voyage), voyage);
  const recs = (voyage && voyage.discharge && voyage.discharge.records) || {};
  const on = (cn) => !!cn && U.set.has(cn) && !isShiftOffPtk(ss, recs, 'discharge', cn);
  return { U, pred: (c) => on(c && c.cn), cns: [...U.set].filter(on) };
}
//  4.20 — EDI 묶음을 유닛 컨번호로 다시 건다 — 자리표시 키(__SLOT___ 등)에 컨번호가 든 행(제작컨 SAWTBP004)은 그 컨번호 키로 옮긴다(이미 그 키가 있으면 그대로).
//    «EDI 키 ∪ records 키» 로 목록을 만드는 화면(출력 센터·현황 요약·마감 점검)이 같은 유닛을 두 줄로 세지 않게 — ptkDischargeUnitsOf 와 같은 «cn 기준».
export function ediByUnitCn(ediMap) {
  const em = ediMap || {};
  let out = null;
  for (const [k, e] of Object.entries(em)) {
    if (!e || !e.cn || e.cn === k || !String(k).startsWith('__') || String(e.cn).startsWith('__') || em[e.cn]) continue;
    if (!out) out = { ...em };
    out[e.cn] = e; delete out[k];
  }
  return out || em;
}
//  4.20 — 추가분·통과 표식을 컨에 얹는다(한 벌). U = ptkDischargeUnitsOf 결과. 그 밖의 칸은 건드리지 않는다.
export function markDischargeUnit(c, U) {
  if (!c || !c.cn || !U || U.basis === 'edi') return c;
  const ex = U.extra.has(c.cn), tr = U.transit.has(c.cn);
  const mf = !!(U.mfn && U.mfn.has(c.cn));
  if (!ex && !tr && !mf) return c;
  //  4.58: MFN 표식 — _mfn · 원래 도착항(_mfnDest · Baplie) · 중국행(_mfnChina) · 재적재(_mfnReload) · 이동지시 상태(_mfnHan DIS/LOA/RES)
  const it = mf ? (U.mfnItems && U.mfnItems.get(c.cn)) || {} : null;
  return { ...c, ...(ex ? { _extraOfList: true, _extraBasis: U.basis } : {}), ...(tr ? { _ediTransit: true } : {}),
           ...(mf ? { _mfn: true, _mfnDest: it.dest || '', _mfnReload: !!it.reload, _mfnHan: it.han || '', ...(mfnIsChinaDest(it.dest) ? { _mfnChina: true } : {}) } : {}) };
}

//  4.20 — 행이 없는 유닛(세관 목록·EDI 어디에도 행이 없고 완료 기록·터미널 실적만 있는 컨)의 맨 행 — 터미널 실적의 F/E·선사만 싣는다(지어내지 않는다).
export function dischargeUnitBareRow(voyage, cn) {
  const t = ((voyage && voyage.discharge && voyage.discharge.termWork) || {})[cn] || {};
  //  4.58: MFN 유닛은 수집기가 올린 mfnList 항목의 규격·F/E·중량·출발지·도착항을 싣는다(없는 칸은 비운다 — 지어내지 않는다 · 선사는 MOVINS 에 없다).
  const m = mfnItemsOf(voyage)[cn];
  const mb = m ? { ...(m.iso ? { iso: m.iso } : {}), ...(m.fe ? { fe: m.fe } : {}), ...(m.wt != null && m.wt !== '' ? { wt: m.wt } : {}), ...(m.pol ? { pol: m.pol } : {}), ...(m.pod ? { pod: m.pod } : {}), ...(m.op ? { op: m.op } : {}), ...(m.tmp != null && m.tmp !== '' ? { tmp: m.tmp } : {}) } : {};
  return { cn, ...mb, ...(t.fe ? { fe: t.fe } : {}), ...(t.op ? { op: t.op } : {}) };
}
//  4.20 — 미르 재료 행(양하·선적이 섞인 목록)에 평택 양하분 한 벌을 입힌다 — 콘앱 미르(cone.html mirAsk)·미르 _normalize(평택 표식이 없는 행)가 부른다.
//    양하 행에 _ptk(유닛이면 true · 시프팅이면 false)·추가분·통과 표식을 찍고, 유닛인데 행이 없는 것(세관 목록에만 있는 컨 등)은 records 행(빈 칸 버림)으로 만들어 붙인다.
//    voyage 에 EDI 묶음이 없으면(콘앱 — 완료·리스트만 받는다) 넘겨받은 양하 행을 EDI 로 본다. 목록이 없는 배(basis 'edi')는 손대지 않는다(종전 판정 그대로).
//  ★ 4.48-04 (4.48-03 라이브 확인 — 콘앱 미르 «양하 315대» ↔ 검수앱 미르 317) — **평택 양하분에서 빼는 시프팅 집합 한 벌.**
//    지도 키에서 꼬리표(_)와 **본선 잔류 예보(노란 ◆ · _forecast 'keep')** 를 뺀다. 예보는 선사 메일 지시뿐이라 확정이 아니다 — 평택 양하 대수는 자료대로 센다
//    (검수사 2026-10-24 20:07 «예정으로만 남겨도 되는걸 실제처럼 수정해서 그렇습니다»). 표시용 지도(shiftingMapForDisplay · 콘앱 미르 지도)는 예보를 싣기 때문에
//    그 키를 그대로 시프팅 집합으로 넘기면 지시 두 대가 «시프팅이라 평택분 아님»으로 빠졌다(콘앱 미르 applyDischargeUnits · 미르 4.20 갈래).
export function shiftSetForUnitsOf(map) {
  const m = map && typeof map === 'object' ? map : {};
  return new Set(Object.keys(m).filter((k) => k && !k.startsWith('_') && !_isKeepShift(m[k])));
}
export function applyDischargeUnits(rows, voyage, shiftSet) {
  const list = Array.isArray(rows) ? rows : [];
  const dSec = (voyage && voyage.discharge) || {};
  const isD = (x) => !!(x && x.cn && (x._mode || x.mode || 'discharge') === 'discharge');
  const own = dSec.ediContainers && Object.keys(dSec.ediContainers).length ? dSec.ediContainers : null;
  const ss = new Set(shiftSet instanceof Set ? shiftSet : (Array.isArray(shiftSet) ? shiftSet : []));
  for (const x of list) if (isD(x) && x._shift) ss.add(x.cn);   // 4.20 감사: 콘앱이 «시프팅분» 으로 찍은 행도 한 벌 판정의 시프팅 집합으로
  const U = ptkDischargeUnitsOf({ discharge: { ...dSec, ediContainers: own || Object.fromEntries(list.filter(isD).map((x) => [x.cn, x])) }, keepOnboard: voyage && voyage.keepOnboard }, ss);   // 4.48 감사(상 2): 본선 잔류를 같이 넘긴다(콘앱 미르가 317 로 셌다)
  if (U.basis === 'edi') return { rows: list, U };
  const recs = dSec.records || {}, comp = dSec.completed || {};
  const off = (x) => !!(x && x._shift) || isShiftOffPtk(ss, recs, 'discharge', x.cn);
  const seen = new Set();
  const out = list.map((x) => {
    if (!isD(x)) return x;
    seen.add(x.cn);
    return markDischargeUnit({ ...x, _mode: 'discharge', _ptk: U.set.has(x.cn) && !off(x) }, U);
  });
  for (const cn of U.set) {
    if (seen.has(cn) || off({ cn })) continue;
    const r = recs[cn];
    const base = r ? Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v != null)) : dischargeUnitBareRow(voyage, cn);
    out.push(markDischargeUnit({ ...base, cn, _mode: 'discharge', _ptk: true, _src: r ? 'list' : 'unit', ...(comp[cn] ? { _comp: comp[cn] } : {}) }, U));
  }
  return { rows: out, U };
}

//  ★ 4.20 (검수사 2026-10-10 00:02 «SAWTBP004는 정상적인 컨테이너가 아닙니다. 제작컨일것입니다. 대수엔 들어 가지만 규격엔 없습니다»):
//    **제작컨(비ISO 유닛) 판정 한 벌** — 유닛 꼴(영문 2~6 + 숫자 3~8 — SAWTBP005 · XNX26261001)이면서 ISO 6346 꼴(영문 4 + 숫자 7)이 아니면 제작컨이다.
//      4.20 감사(Fable 판정 중-7): 글자만 있는 값(TBN)·항차 번호 꼴(R083E)은 유닛이 아니다. 4.20 재감사: ISO 오타 꼴(영문 4 + 숫자 6~8 — ABCU123456)도 제작컨이 아니다.
//    대수와 크기 행(20·40·HC·45)에는 들어가고 ISO 규격 코드는 없다(«제작컨» 으로). 수화물(LUG)과는 별개다(RZOR R075E&W 마감텔리 실측 — SAWTBP005 는 제 그룹 · LUG 는 따로).
export const MADE_UNIT_LABEL = '제작컨';
export function isMadeUnitCn(cn) {
  const s = String(cn || '').replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z]{2,6}\d{3,8}$/.test(s) && !/^[A-Z]{4}\d{6,8}$/.test(s);
}
//  4.20 — 세관 셀에 씰 여러 개가 붙어 온 것(«LF102335LF102350LF102345LF102336»)을 가른다. 같은 꼴 토큰(영문 1~3 + 숫자 5~8 — 영문 수·숫자 수가 같음)이
//    둘 이상 이어지고 전체가 그 토큰으로만 이뤄졌을 때만 가른다. 아니면 원문 한 개 그대로. 제작컨 행에만 쓴다(일반 컨 씰은 손대지 않는다).
export function splitJoinedSeals(sl) {
  const s = String(sl == null ? '' : sl).trim();
  if (!s) return [];
  const t = s.replace(/\s+/g, '').toUpperCase();
  const toks = t.match(/[A-Z]{1,3}\d{5,8}/g);
  if (!toks || toks.length < 2 || toks.join('') !== t) return [s];
  const shape = (x) => x.replace(/\d/g, '9').replace(/[A-Z]/g, 'A');
  return toks.every((x) => shape(x) === shape(toks[0])) ? toks : [s];
}
//  ★ 4.25-02 — **엠티실 칸 거름 한 벌**(V7.43 EmptySealReport 에서 옮김 — 선사마다 규격 표기가 달라 22GP·45GP 같은 ISO 꼴이 엠티실번호 칸으로 들어오는 경우).
//    4자 ISO 타입 꼴(첫 자 2·4·L·9 + 숫자 + 영문 + 영숫자)이면 실번호가 아니다.
export function looksLikeIsoType(v) {
  const s = String(v || '').trim().toUpperCase();
  return /^[24L9][0-9][A-Z][A-Z0-9]$/.test(s);
}
//  ★ 4.25-02 — **검수리스트 실번호 칸 한 벌(종이·CSV).** 검수사 2026-10-14 09:17 «TNJP 엠티 실번호가 검수리스트에는 나오지 않았습니다.
//    엠티실 리스트에 별도로는 실번호가 기록되어 있었지만 검수리스트에는 공백으로 나옴» (김성일 메모 2026-10-13 07:42 «TNJP 엠티실번호가 검수선적 리스트에는 표기가 안되어 있음, 따로 엠티 리스트 출력하면 표기 되어 있는데»).
//    앱 규약은 «풀은 sl · 엠티는 eseal»(parseBAPLIE·리스트 파서) — 종이는 sl 만 읽어 엠티가 비었다(보관소 TNJP 26367W 선적 엠티 42대 전부 eseal 만 있음).
//    sl 이 있으면 그대로(종전). 엠티(F 가 아님 — 검수리스트 F/E 칸과 같은 기준)이고 sl 이 비면 엠티실(eseal — 엠티실 리스트와 같은 값·같은 거름)을 쓴다.
//  ★ 4.27 — 보류(⏸ 지금 양하·선적 불가) 사유 한 벌. 자동 가이드(GuidedWorkPanel)·수동 한 화면 틀(SearchPanel TwinSearch)이 같은 목록을 쓴다(종전 가이드 안 상수).
export const HOLD_REASONS = ['콘 잠김', '트윈 무게 초과', '컨 홀 불량(스프레더 안착 불가)'];
/*  ★ 4.49 — **실번호 판정 한 벌.** 검수사 2026-10-24 12:50 확정(통합운영지침서 7.8-F 7·8·9) — «ML Seal 칸» · «다 보이고 하나만 맞으면 맞음» · «MLPH 끝자리 빠짐은 실오류로 센다».
    종전엔 «실오류 = sl ≠ sl_orig» 가 열한 벌 넘게 흩어져(검수원 고친 기록 sl_history 를 보는 곳 둘 · 안 보는 곳 아홉) 같은 컨을 화면마다 다르게 셌다 —
    충돌 창 기본값 «EDI»·리스트끼리 병합이 sl ≠ sl_orig 를 고친 기록 없이 만들어 거짓 실오류가 났다(RZOR SAWTBP 제작컨 10항차 · 조사 2026-10-24).
    ① 알려진 실(sealKnownOf) — 자료마다 적힌 실을 다 모은다: 리스트 실(검수원이 고쳤으면 고치기 전 값 sl_orig) · 리스트끼리 다른 값(sl_conflict) · 머스크 보조실(sl_alt — Shipper Seal) · EDI 실(slEdi).
       같은 실은 한 줄(대문자·공백·하이픈 무시). «0000»(실 부족 표기)은 실이 아니다. 세관 출처(isCustomsSrc — 파일 이름)는 customs 로 표시한다.
    ② 큰 실(big) — 세관 값이 있으면 세관 값, 없으면 리스트 실(검수사 «큰 글씨 실은 세관 값»).
    ③ 실오류(error) — 검수원이 실물을 보고 고친 기록(sl_history)이 있고, 실물 실이 알려진 실 어느 것과도 다르면. 하나만 맞으면 맞음(RZOR 상품컨은 문이 여러 개라 실이 여럿 — 7.8-F 8).
       잘린 신고(trunc) — 알려진 실 하나가 다른 단일 실의 앞부분이고 한두 자 짧으면(MAMP 641N MMAU1264907 «MLPH0463390» ↔ 세관 «MLPH046339») 신고 값은 짧은 쪽(세관 표시가 있으면 세관)이고
       검수원이 안 고쳐도 실오류다(7.8-F 9 — 신고본을 고쳐야 한다 · 보관 MCAP 639N · MCSC 638N 검수원 기록과 같은 답). 실 칸에 컨번호가 적힌 자료는 잘림으로 세지 않는다.
       이어 붙은 씰(제작컨 «LF102335LF102350…» · 20자 컷)은 갈라 본다(splitJoinedSeals) — 그중 하나면 맞음. 잘림은 단일 실에만. */
export function isCustomsSrc(src) {
  return /적하\s*목록|적하|세관|CDL|MANIFEST|신고|^Excel_\d{14}/i.test(String(src || '').trim());
}
//  ★ 4.49-02 — **RF CONTAINER LIST 의 실번호는 실 자료로 안 친다.** 검수사 2026-10-25 05:0x «RF CONTAINER LIST는 단순하게 보면 됩니다. 리퍼갯수와 컨넘버로 실번호는 본리스트에 있는걸 사용합니다».
//    실측 — OBWH(연태훼리) RF CONTAINER LIST 의 실 칸은 엑셀 숫자 칸(35634 · 서식 000000)이라 앞 0 이 잘려(035634) 세관 적하목록 0035634 와 «⚠ 실번호 불일치»가 섰다
//    (보관 OBWH 98대 · 그날 카톡 씰오류 보고 대부분 0건 · 8월 2.05-06 실측 2719E CAAU4289478). 본 리스트(선사·세관) 실이 있으면 RF 리스트 실은 «다른 자료 실»·«실번호 불일치»에서 뺀다.
export function isRfListSrc(src) {
  return /RF\s*CONTAINER\s*LIST|REEFER\s*CONTAINER\s*LIST/i.test(String(src || ''));
}
//  «실번호 불일치»(한 컨에 서류마다 다른 실 — sl_conflict) 한 벌 — RF CONTAINER LIST 출처는 뺀다(배지·컨 상세 카드·미르 점검·브리핑이 같은 목록을 쓴다).
//  ★ 4.87 (검수사 2026-11-10 20:24 «실오류에서 보면 알파벳이 없으면 실오류 판정을 안합니다. 다만 알파벳이 틀리면 실오류 입니다. 앞자리 01234567인데 1234567이면 실오류 입니다.»)
//    **알파벳이 빠졌을 뿐인 실은 같은 실이다.** 한쪽이 숫자뿐이고 다른 쪽이 «영문 + 똑같은 숫자»(ES02273964 ↔ 02273964)면 같은 실로 본다 — 숫자는 앞자리 0 까지 글자 그대로 같아야 한다
//    (01234567 ↔ 1234567 은 다른 실 · 영문끼리 다르면 ES… ↔ EA… 다른 실). TMPZ 2038E 양하 EAS 17대가 선사 리스트 «ES02273964» · 세관 «02273964» 인데 카드는 «실번호 불일치»,
//    미르는 «세관 실과 모양이 다른 컨 17대» 라고 했다. 한 벌(sealSameLoose)을 sealConflictOf 가 써서 카드·컨 상세·미르·브리핑이 같이 조용해진다.
export function sealSameLoose(a, b) {
  const x = normSeal(a), y = normSeal(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const d = /^\d+$/.test(x) ? x : /^\d+$/.test(y) ? y : '', l = d === x ? y : x;
  if (!d) return false;
  const m = /^([A-Z]+)(\d+)$/.exec(l);
  return !!m && m[2] === d;
}
export function sealConflictOf(c) {
  const h = (Array.isArray(c && c.sl_conflict) ? c.sl_conflict : []).filter((x) => x && !isRfListSrc(x.src));
  //  숫자뿐인 값은 «영문 + 같은 숫자» 짝이 있으면 뺀다(영문이 붙은 쪽이 온전한 실 — 그 한 줄만 남는다). 짝이 없으면 그대로.
  //    뺀 값의 출처는 짝에 alsoSrc 로 넘긴다 — 세관이 숫자뿐인 값으로 적었으면 그 실은 세관도 말한 실이다(독립 감사 중 — 세 값일 때 세관 근거가 사라져 «세관리스트 도착 시 판정» 이라고 했다).
  const _digits = (x) => /^\d+$/.test(normSeal(x.sl));
  const _twinOf = (x) => (_digits(x) ? h.find((k) => k !== x && !_digits(k) && sealSameLoose(k.sl, x.sl)) || null : null);
  const also = new Map();
  for (const x of h) { const k = _twinOf(x); if (k && x.src) also.set(k, [...(also.get(k) || []), String(x.src)]); }
  return h.filter((x) => !_twinOf(x)).map((x) => (also.has(x) ? { ...x, alsoSrc: also.get(x) } : x));
}
function _sealEdited(c) { return !!(c && Array.isArray(c.sl_history) && c.sl_history.length); }
function _sealLegacy(c) { return !!(c && !_sealEdited(c) && c.sl_orig && c.sl && normSeal(c.sl_orig) !== normSeal(c.sl)); }   // 옛 병합 흔적(고친 기록 없이 sl ≠ sl_orig — sl_src 는 sl_orig 쪽 출처)
export { _sealLegacy as sealLegacyOf };
export function sealKnownOf(c, ediSl) {
  const out = [], seen = new Map();
  const add = (v, src, kind) => {
    const sv = String(v == null ? '' : v).trim(), n = normSeal(sv);
    if (!n || n === '0000') return;
    const cus = isCustomsSrc(src);
    const e = seen.get(n);
    if (e) { if (src && !e.srcs.includes(src)) e.srcs.push(src); if (cus) e.customs = true; return; }
    const x = { v: sv, n, srcs: src ? [String(src)] : [], kind, customs: cus };
    seen.set(n, x); out.push(x);
  };
  if (!c) return out;
  const main = _sealEdited(c) ? (c.sl_orig != null ? c.sl_orig : '') : c.sl;
  //  옛 꼴(_sealLegacy) — 고친 기록 없이 sl ≠ sl_orig 는 앞 병합이 남긴 흔적이다(4.49 전 «긴 쪽 채택» · 충돌 창 «EDI» 고름). 그때 sl_src 는 sl_orig 쪽 출처였다
  //    (MAMP 641N MMAU1264907 — sl 선사 MLPH0463390 · sl_orig 세관 MLPH046339 · sl_src 세관 파일 · 보관 MCAP 639N MNBU4491858 · MCSC 638N MNBU4710196). 감사(상-2·하-2) — 출처를 sl_orig 에 붙인다.
  const legacy = _sealLegacy(c);
  add(main, legacy ? '' : (c.sl_src || c._source || ''), 'list');
  if (legacy) add(c.sl_orig, c.sl_src || c._source || '', 'orig');   // 재감사(하): sl_src 가 없는 옛 기록은 _source(STMJ 2643E SKHU8912132 — CDL)
  for (const h of (Array.isArray(c.sl_conflict) ? c.sl_conflict : [])) if (h) add(h.sl, h.src || '', 'conflict');
  if (c.sl_alt) add(c.sl_alt, '보조실(Shipper Seal)', 'alt');
  const ed = ediSl != null ? ediSl : c.slEdi;
  if (ed) add(ed, 'EDI', 'edi');
  //  4.49-02 — RF CONTAINER LIST 에서만 온 실은 뺀다(본 리스트·세관·EDI 실이 하나라도 있을 때만 — 그것뿐이면 그대로 둔다).
  const _rfOnly = (x) => x.srcs.length > 0 && x.srcs.every((sv) => isRfListSrc(sv));
  if (out.some((x) => !_rfOnly(x))) {
    const kept = out.filter((x) => !_rfOnly(x));
    if (kept.length !== out.length) { kept.rfDropped = out.length - kept.length; return kept; }
  }
  return out;
}
export function sealCheckOf(c, ediSl) {
  const known = sealKnownOf(c, ediSl);
  const cust = known.find((k) => k.customs) || null;
  const edited = _sealEdited(c);
  const actual = edited ? String((c && c.sl) || '').trim() : '';
  //  잘린 신고(trunc) — 알려진 실 가운데 하나가 다른 단일 실의 앞부분이고 한두 자 짧다(MLPH0463390 ↔ MLPH046339). 잘림은 신고본(세관·IFCSUM)에서만 생긴다 — 세관 표시가 있으면 그것,
  //    없으면 짧은 쪽을 신고 값으로 본다. 검수사 «실오류로 센다»(7.8-F 9) — 신고를 고쳐야 하므로 검수원이 안 고쳐도 실오류다(실물은 긴 쪽 · 고쳤으면 고친 실물).
  //    이어 붙은 씰의 20자 잘림(제작컨 «LF102274LF102279LF10» ↔ 네 개 이어 붙음)은 길이 차가 커서 여기 안 든다 — 갈라서 하나면 맞음.
  //    실 칸에 컨번호가 적힌 자료(STMJ 2659E FFAU1654550 · STSE 2681E CAAU9893623 — 세관 10자 컷)는 실이 아니라서 잘림으로 세지 않는다.
  //    감사(상-1) — 세관 값이 있으면 세관이 짧은 쪽일 때만 잘림이다(세관이 긴 쪽이면 짧은 선사·EDI 값은 «다른 자료 실»일 뿐 · 신고는 세관 값). 세관이 없을 때만 «짧은 쪽이 신고».
  //    감사(하-5) — 짧은 쪽이 8자 미만이면(123456 ↔ 1234567 · 00 ↔ 000) 잘림으로 보지 않는다(실례는 모두 10자 — 세관 칸 컷).
  const _cnN = normSeal((c && c.cn) || '');
  const _isCnLike = (x) => !!(_cnN && x.n.length >= 8 && _cnN.startsWith(x.n));
  const _longerOf = (x) => (_isCnLike(x) || x.n.length < 8 ? null : known.find((k) => k !== x && !_isCnLike(k) && k.n.length > x.n.length && k.n.length - x.n.length <= 2 && k.n.startsWith(x.n) && splitJoinedSeals(k.v).length === 1) || null);
  const decl = cust ? (_longerOf(cust) ? cust : null) : (known.find((x) => _longerOf(x)) || null);
  const trunc = !!decl;
  //  ★ 4.49-02 — 앞자리 0 빠진 신고(zero) — 세관 값이 다른 자료(본 리스트·EDI) 실에서 앞 0 만 빠진 값이다(꼴 — 세관 21816 ↔ 선사 리스트 021816 · RF 리스트 실은 sealKnownOf 가 이미 빼서 짝이 되지 않는다 · 보조실(Shipper Seal)은 다른 실물이라 짝에서 뺀다 — 감사 하-4).
  //    검수사 2026-10-25 04:26 «실오류입니다» · «검수리스트 위주 입니다. 검수리스트가 세관리스트와 거의 동일 합니다. 다만 자릿수 부족이나 그런것이 선사리스트에는 맞게 나와 있을수도 있습니다».
  //    끝자리 빠짐(trunc)과 같은 몫 — 신고를 고쳐야 하므로 검수원이 안 고쳐도 실오류(검수원이 실물을 신고 값으로 확인했으면 아님). 거꾸로 리스트 쪽만 0 이 빠진 것
  //    (OBWH RF 리스트 049722 ↔ 세관 0049722 — 보관 98대, 완료 83대 고친 기록 0)은 «다른 자료 실»로만 둔다. 세관 값이 없거나 세관끼리면 안 센다(같은 파일 두 값 19대 — 판독 흔적).
  const _zeroTwinOf = (x) => (x && !trunc && !_isCnLike(x) ? known.find((k) => k !== x && !k.customs && k.kind !== 'alt' && !_isCnLike(k) && k.n.length > x.n.length && /^0+$/.test(k.n.slice(0, k.n.length - x.n.length)) && x.n.replace(/^0+/, '').length >= 4 && splitJoinedSeals(k.v).length === 1 && k.n.endsWith(x.n)) || null : null);
  const zTwin = cust ? _zeroTwinOf(cust) : null;
  const zero = !!zTwin;
  const toks = new Set();
  for (const k of known) { toks.add(k.n); const parts = splitJoinedSeals(k.v); if (parts.length > 1) for (const p of parts) toks.add(normSeal(p)); }
  const an = normSeal(actual);
  const error = trunc ? (edited ? !!(an && an !== decl.n) : true) : zero ? (edited ? !!(an && an !== cust.n) : true) : !!(edited && an && known.length && !toks.has(an) && ![...toks].some((t) => sealSameLoose(t, an)));   // 4.87: 알파벳만 빠진 실물 값은 같은 실
  //  재감사(중-2) — 세관 값이 이어 붙은 씰의 20자 컷이면(RZOR SAWTBP «LF102335LF102350LF10» ↔ «LF102335LF102350LF102345LF102336») 같은 씰이다 — 큰 실은 긴 값(4.20 «잘린 앞부분이면 같은 씰 · 씰 전부 적는다»).
  const _joinedOf = (x) => (x ? known.find((k) => k !== x && k.n.length > x.n.length && k.n.startsWith(x.n) && splitJoinedSeals(k.v).length > 1) || null : null);
  const _cJ = _joinedOf(cust);
  const big = cust ? (_cJ ? _cJ.v : cust.v) : (known[0] ? known[0].v : String((c && c.sl) || '').trim());
  const truncLong = trunc ? _longerOf(decl).v : '';
  const zeroLong = zero ? zTwin.v : '';
  const shownActual = trunc && !edited ? truncLong : zero && !edited ? zeroLong : actual;
  const bigK = known.find((k) => k.v === big) || null;   // 큰 실의 출처(미르 «실번호 X(출처)» 괄호 — 재감사 중-3)
  return { known, customs: cust, decl: trunc ? decl : zero ? cust : decl, truncLong, zero, zeroLong, big, bigK, trunc, edited, actual: shownActual, error, from: trunc ? decl.v : big, rfDropped: known.rfDropped || 0 };
}
/*  ★ 4.49 — 리스트 올리기 병합(VoyagePage «📥 추가 병합»·여러 파일 한 번에)의 실번호 한 벌. prev = 이미 있는 행, r = 새 파일 행 → merged 에 덮을 칸만 돌려준다.
    서로 다르면 둘 다 «다른 자료 실»(sl_conflict · 출처 파일)로 남기고, 큰 실(sl)은 세관 값이다(검수사 2026-10-24 «큰 글씨 실은 세관 값»).
    종전 «한쪽이 앞부분이면 긴 쪽 채택(잘림 보정)»은 세관 잘림(MAMP 641N MMAU1264907 세관 «MLPH046339» ↔ 선사 «MLPH0463390»)을 지워 실오류 신고 대상(7.8-F 9)을 못 보게 했고,
    sl_src 는 세관인데 값은 선사 것이 됐다. 세관이 아닌 두 리스트끼리는 종전대로 긴 앞부분 → 아니면 새 값.
    검수원이 고친 컨(sl_history)은 고치기 전 서류 값으로 대조한다(실물 값을 서류처럼 남기지 않는다 — 저장은 fbSaveListRecords 가 실물을 지킨다). */
export function mergeUploadSeal(prev, r, fileName) {
  const _docSl = (x) => String(((x && Array.isArray(x.sl_history) && x.sl_history.length) ? x.sl_orig : (x && x.sl)) || '').trim();
  const a = _docSl(prev), b = String((r && r.sl) || '').trim();
  //  4.49-02 — RF CONTAINER LIST 는 리퍼 대수·컨번호만(실은 본 리스트). 검수사 2026-10-25 «리퍼갯수와 컨넘버로 실번호는 본리스트에 있는걸 사용합니다».
  //    ① RF 리스트가 오면 앞 실의 값·출처를 그대로 돌려준다 — 호출부(VoyagePage 일반 복사)가 RF 행의 sl·sl_orig·_source 를 이미 덮었으므로 되돌리고,
  //       sl_src 를 앞 출처로 못 박는다(안 그러면 merged._source = RF 파일이 실의 출처가 되어 세관 표시가 사라졌다 — 독립 감사 상-1·상-2).
  //       앞에 실이 없으면 RF 실을 그 출처로 쓴다(RF 리스트에만 실이 있는 컨).
  if (isRfListSrc(fileName)) {
    if (!String((prev && prev.sl) || '').trim() && !a) return b ? { sl: b, sl_orig: (r && r.sl_orig) || b, sl_src: String(fileName || '') } : {};
    //  재감사(상) — 고친 컨은 서류 값(a)을 돌려준다. 실물 값을 넘기면 fbSaveListRecords 가 그것을 서류 값과 다르다고 «다른 자료 실»에 넣어 실오류가 꺼졌다(실물은 저장 쪽이 지킨다).
    const keep = { sl: _sealEdited(prev) ? a : ((prev && prev.sl != null) ? prev.sl : null), sl_orig: (prev && prev.sl_orig != null) ? prev.sl_orig : null };
    const ps = String((prev && (prev.sl_src || prev._source)) || '');
    if (ps) keep.sl_src = ps;
    return keep;
  }
  //  ② 앞 실이 RF 리스트에서 왔고(고친 기록 없음) 본 리스트 실이 오면 본 리스트 실로 — RF 값은 «다른 자료 실» 기록에 RF 출처로 남긴다(화면에선 sealConflictOf 가 뺀다).
  if (a && b && !_sealLegacy(prev) && !(prev && Array.isArray(prev.sl_history) && prev.sl_history.length) && isRfListSrc((prev && (prev.sl_src || prev._source)) || '') && !isRfListSrc(fileName)) {
    const out = { sl: b, sl_orig: b, sl_src: String(fileName || '') };
    if (normSeal(a) !== normSeal(b)) {
      const h = prev && Array.isArray(prev.sl_conflict) ? [...prev.sl_conflict] : [];
      if (!h.some((x) => x && normSeal(x.sl) === normSeal(a))) h.push({ sl: a, src: String(prev.sl_src || prev._source || '') });
      out.sl_conflict = h;
    }
    return out;
  }
  //  감사(상-2) — 옛 꼴(고친 기록 없이 sl ≠ sl_orig · sl_src 는 sl_orig 쪽 출처)은 sl_orig 서류 값을 «다른 자료 실»로 옮겨 남긴다(새 파일이 sl_orig 를 덮어도 세관 잘림이 안 사라지게).
  const legacy = _sealLegacy(prev);
  const legV = legacy ? String(prev.sl_orig).trim() : '', legSrc = legacy ? String(prev.sl_src || prev._source || '') : '';
  const legCus = !!(legacy && isCustomsSrc(legSrc));
  const aSrc = legacy ? '' : ((prev && (prev.sl_src || prev._source)) || ''), bSrc = String(fileName || '');
  const hist = prev && Array.isArray(prev.sl_conflict) && prev.sl_conflict.length ? [...prev.sl_conflict] : [];
  const addH = (v, src) => {
    if (!v) return;
    const i = hist.findIndex((h) => h && normSeal(h.sl) === normSeal(v));
    if (i < 0) { hist.push({ sl: String(v), src: String(src || '') }); return; }
    if (isCustomsSrc(src) && !isCustomsSrc(hist[i].src)) hist[i] = { ...hist[i], src: String(src) };   // 재감사(중-1): 같은 값에 세관 출처가 오면 세관으로 올린다
  };
  //  재감사(중-2): 세관 값이 이어 붙은 긴 씰의 앞부분(20자 컷)이면 같은 씰 — 큰 실은 긴 값
  const _joinedLong = (cut, full) => !!(cut && full && normSeal(full).length > normSeal(cut).length && normSeal(full).startsWith(normSeal(cut)) && splitJoinedSeals(full).length > 1);
  if (legacy) addH(legV, legSrc);
  if (a && b && normSeal(a) !== normSeal(b)) {
    addH(a, aSrc); addH(b, bSrc);
    const bCus = isCustomsSrc(bSrc), aCus = isCustomsSrc(aSrc);
    let main = bCus ? b : aCus ? a : legCus ? legV : (a.length > b.length && a.startsWith(b)) ? a : b;
    if (bCus && _joinedLong(b, a)) main = a; else if (aCus && _joinedLong(a, b)) main = b;   // 세관 컷 ↔ 이어 붙은 긴 씰
    //  재감사(중-1) — 출처는 세관 쪽을 먼저 본다(옛 꼴 세관 값과 새 선사 값이 같으면 세관 출처)
    const src = (main === legV && legCus) ? legSrc : main === b ? bSrc : aSrc;
    return { sl_conflict: hist, sl: main, sl_orig: main, sl_src: src };
  }
  if (legacy) {   // 같은 값(또는 한쪽 빈칸)이 다시 왔다 — 옛 꼴을 새 꼴(sl = 큰 실 · sl_conflict 에 다른 자료 실)로 바꿔 둔다
    const cur = a || b; addH(cur, b ? bSrc : aSrc);
    let main = legCus && !isCustomsSrc(bSrc) ? legV : cur;
    if (legCus && _joinedLong(legV, cur)) main = cur;   // 세관 컷 ↔ 이어 붙은 긴 씰 — 큰 실은 긴 값
    return { sl_conflict: hist, sl: main, sl_orig: main, sl_src: (main === legV && legCus) ? legSrc : (b ? bSrc : aSrc) };
  }
  return { sl: a || b, ...(!b && a ? { sl_src: aSrc } : {}) };
}
export function isSealError(c, ediSl) { try { return sealCheckOf(c, ediSl).error; } catch (e) { console.warn('[4.49 실번호] 실오류 판정 실패 — 실오류 아님으로 봅니다:', c && c.cn, e); return false; } }
export function inspectionSealOf(c) {
  const s = String((c && c.sl) || '').trim();
  if (s) { if (!_sealEdited(c)) { const k = sealCheckOf(c); if (k.customs) return k.big || k.customs.v; if (k.rfDropped && k.big) return k.big; } return s; }   // 4.49-02: RF CONTAINER LIST 실이 sl 에 앉았으면 본 리스트 값   // 4.49: 검수원이 안 고쳤으면 세관 값(큰 실 — 세관이 이어 붙은 씰의 컷이면 긴 값)
  if (String((c && c.fe) || '').toUpperCase() === 'F') return '';
  const e = String((c && c.eseal) || '').trim();
  return e && !looksLikeIsoType(e) ? e : '';
}
//  예측 시프팅 항목 판정 한 벌은 cargoPlanCore.isPredShift(그림이 쓰는 곳 — cargoPlanCore 는 import 가 없어 거기 둔다). 여기서는 다시 내보내기만 한다.
export { isPredShift, isKeepShift } from './cargoPlanCore.js';   // 4.48: 본선 잔류 예보 판정도 같은 자리
//  ★ 4.16 — **시프팅 분리 한 벌**(§7.8-①). set·map = 확정 지도(computeShiftingMapCached — 선사 서류 또는 양하·선적 EDI 대조).
//    예측은 작업 항목이 아니다(1.76-05) — 대수·문지기는 확정으로만, 종이·화면의 ◇ 는 shiftingMapForDisplay 로 따로 그린다.
//    out = 내림(시프팅 ∩ 양하 완료) · in = 실음(시프팅 ∩ 선적 완료) · moves = 대당 2무브(크레인이 두 번 든다).
//    완료 기록은 옮기지 않는다 — 읽기만 나눈다.
export function shiftSplitOf(voyageKey, voyage) {
  let map = {};
  try { map = computeShiftingMapCached(voyageKey, voyage) || {}; } catch (e) { console.warn('[4.16 시프팅 분리] 확정 지도 실패 — 시프팅 0 으로 셉니다:', e); map = {}; }
  const set = new Set(Object.keys(map).filter((k) => k && !k.startsWith('_')));
  const dc = (voyage && voyage.discharge && voyage.discharge.completed) || {};
  const lc = (voyage && voyage.loading && voyage.loading.completed) || {};
  let od = 0, id = 0;
  for (const cn of set) { if (dc[cn]) od += 1; if (lc[cn]) id += 1; }
  const recOf = (mode) => (voyage && voyage[mode] && voyage[mode].records) || {};
  //  ★ 4.48 — 선사 지시 본선 잔류의 시프팅 예보(노란 ◆) — 작업 항목이 아니라 대수 옆에 따로 적는다(«◆ 시프팅 62 … · 🟡 예보 2»).
  let fc = {};
  try { fc = keepShiftForecastOf(voyageKey, voyage) || {}; } catch (e) { console.warn('[4.48 시프팅 분리] 본선 잔류 예보 실패 — 예보 0 으로 셉니다:', e); fc = {}; }
  const fcCns = Object.keys(fc).filter((cn) => !set.has(cn));
  return { map, set, n: set.size, forecast: { n: fcCns.length, cns: fcCns },
           out: { total: set.size, done: od }, in: { total: set.size, done: id },
           moves: { total: 2 * set.size, done: od + id },
           offPtk: (mode, cn) => isShiftOffPtk(set, recOf(mode), mode, cn) };
}
//  항차 키를 모르는 입구(마감텔리·갱별 보고 — voyage 만 받는다)가 시프팅 지도 캐시를 남의 배와 섞지 않게 쓰는 키.
export function voyageKeyOf(voyage) {
  if (!voyage) return '';
  if (voyage.key) return String(voyage.key);
  const i = voyage.info || {};
  return [i.vsl, i.voy || i.voy_d].filter(Boolean).join('_');
}

// ── TallyOne 2.94-01: **통과화물 판정 한 벌.** (검수사 지적 2026-08-31) ──
//   선적 리스트(records)에 있는데 선적 EDI 에는 없고, **양하 EDI 에 있으면서 그 POD 가 평택이 아닌** 컨.
//   평택에서 내리지도 싣지도 않는다 — 자리만 옮겨 다시 싣는 재적부(시프팅)다.
//   실측 MCSC 635S 17대(POD 전부 CNTXG) — 26·34번 → 38번 데크.
//   선사에게 EDI 를 더 달라고 할 물건이 아니므로 «EDI 에 없음» 경고에서 빼고 따로 센다.
//   ⚠ 지우지 않는다. 이 컨들의 실물 자리 기록은 records 말고 남은 곳이 없다
//     (computeShiftingMap 은 선적 EDI 에도 있어야 잡는데 이들은 거기 없다).
export function thruCnSetOf(mode, recMap, loadEdiMap, dischEdiMap) {
  const out = new Set();
  if (mode !== 'loading' || !recMap || !dischEdiMap) return out;
  const ediHas = (cn) => !!(loadEdiMap && loadEdiMap[cn]);
  for (const cn of Object.keys(recMap)) {
    if (ediHas(cn)) continue;
    const d = dischEdiMap[cn];
    if (!d || !d.pod || isPyeongtaekPort(d.pod)) continue;
    out.add(cn);
  }
  return out;
}

export function shiftCnSetOf(voyageKey, voyage) {
  try { return new Set(Object.keys(computeShiftingMapCached(voyageKey, voyage) || {}).filter((k) => !k.startsWith('_'))); }
  catch (e) { console.warn('[시프팅 집합] 확정 지도 실패 — 시프팅 0 으로 셉니다(추가분에 이적 컨이 섞일 수 있음):', e); return new Set(); }
}

// 2.96: 시프팅 캐시 서명용 — 검수원이 고친 자리만 뽑아 짧게 찍는다(레코드 전체를 넣으면 매 틱 무효화).
function _recPosSig(rec) {
  if (!rec) return '';
  const out = [];
  for (const [cn, r] of Object.entries(rec)) {
    if (!r) continue;
    const a = r.bay_actual, g = r.bay_assign;
    if (a || g) out.push(`${cn}:${a || ''}-${r.row_actual || ''}-${r.tier_actual || ''}:${g || ''}-${r.row_assign || ''}-${r.tier_assign || ''}`);
  }
  return out.sort().join(',');
}

//  ★ 4.82 — **수동 시프팅 표기.** 검수사 2026-11-09 «OBWH 리스트에 없는 컨 10-07-82는 시프팅 대상임» · «10번베이 육상 1단 선적된 컨 2번베이 0104로 이동예정» · «시프팅 표기 바랍니다» · «선적 edi나오면 그곳에도 추가바랍니다».
//    voyages/{항차}/shiftManual/{컨번호} = { cn, from:'0100782'(7자리), to:'0020104', by, at, note?, cleared?, clearedBy?, clearedAt? } (4.48 keepOnboard 와 같은 모양).
//    서류(RESTOW)·EDI 대조에 잡히지 않은 시프팅을 검수사가 손으로 적는다. 지도에는 computeShiftingMapCached 안 한 지점에서만 덧입힌다.
export function shiftManualOf(voyage) {
  const src = voyage && voyage.shiftManual;
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const [k, e] of Object.entries(src)) {
    if (!e || typeof e !== 'object' || String(k).startsWith('_') || e.cleared) continue;
    const cn = String(e.cn || k || '').trim().toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cn) || !/^\d{7}$/.test(String(e.from || '')) || !/^\d{7}$/.test(String(e.to || ''))) continue;
    out[cn] = { ...e, cn };
  }
  return out;
}
function _shiftManualSig(voyage) {
  const m = shiftManualOf(voyage);
  return Object.keys(m).sort().map((cn) => cn + ':' + m[cn].from + '>' + m[cn].to).join(',');
}
//  순수 한 벌(검수앱 computeShiftingMapCached · 콘앱 ConeParse 가 같이 부른다). manual = shiftManualOf 결과 { 컨번호: {from,to,by,at} }.
//    dMap = 양하 EDI 지도, lMap = 선적 EDI 지도({컨번호:{bay,row,tier,...}} — 맞교환·검수원 자리 반영이 끝난 것). 없으면 null.
//    · 이미 지도에 있는 컨(서류 RESTOW · 자동 EDI 대조 · 본선 잔류 확정)은 덮지 않는다 — 자료가 이긴다.
//    · from = 양하 EDI 자리 우선, 없으면 표기값 · to = 평택 출항본 선적 EDI 에 그 컨이 있으면 EDI 자리 우선, 없으면 표기값.
//    · 자리가 다르면 _toConflict(표기값) · 출항본 EDI 가 왔는데 그 컨이 없으면 _toUnconfirmed. 표식 _manual · _manualBy · _manualAt.
export function applyShiftManualToMap(map, manual, dMap, lMap) {
  const ks = Object.keys(manual || {});
  if (!map || !ks.length) return map;
  const dep = !!lMap && loadEdiIsDeparture(lMap);
  for (const cn of ks) {
    if (map[cn]) continue;
    const m = manual[cn];
    const dFrom = dMap && dMap[cn] ? _shiftEdiPos7(dMap[cn]) : '';
    const lTo = dep && lMap[cn] ? _shiftEdiPos7(lMap[cn]) : '';
    const e = { from: dFrom || m.from, to: lTo || m.to, _manual: true, _manualBy: m.by || '', _manualAt: m.at || 0 };
    if (m.note) e._manualNote = m.note;
    if (lTo && lTo !== m.to) e._toConflict = m.to;
    if (dFrom && dFrom !== m.from) e._fromConflict = m.from;
    if (dep && !lTo) e._toUnconfirmed = true;
    map[cn] = e;
  }
  return map;
}
//  4.82 — 컨 상세 «시프팅 표기» 폼 재료. 지금 자리 = 그 컨의 양하 EDI 자리(7자리, 없으면 ''). 옮겨 갈 자리를 이미 차지한 다른 컨 = 양하·선적 EDI 에서 찾아 경고 재료로 준다(저장은 막지 않는다).
export function shiftManualFromOf(voyage, cn) {
  try {
    const d = voyage && voyage.discharge;
    if (!d) return '';
    const m = ediMapFromRaw(d) || d.ediContainers || {};
    return _shiftEdiPos7(m[cn]) || _shiftEdiPos7((d.ediContainers || {})[cn]) || '';
  } catch (e) { console.warn('[4.82 수동 시프팅] 양하 EDI 자리 읽기 실패:', e); return ''; }
}
export function shiftTargetOccupiedBy(voyage, to7, selfCn) {
  const out = [];
  if (!voyage || !/^\d{7}$/.test(String(to7 || ''))) return out;
  for (const [sec, label] of [['discharge', '양하 EDI'], ['loading', '선적 EDI']]) {
    try {
      const s = voyage[sec];
      if (!s) continue;
      const m = ediMapFromRaw(s) || s.ediContainers || {};
      for (const [k, c] of Object.entries(m)) if (k !== selfCn && _shiftEdiPos7(c) === to7) out.push({ cn: k, where: label });
    } catch (e) { console.warn('[4.82 수동 시프팅] 목적지 자리 점검 실패(' + sec + '):', e); }
  }
  return out;
}
// 4.83 — «양하 EDI 에는 있는데 양하 리스트에 없는 컨» 중 아직 시프팅·MFN·본선 잔류로 정해지지 않은 것 = 시프팅 표기 후보. 선적 화면 «＋ 시프팅 추가» 가 안내한다.
//   검수사 2026-11-09 «양하하자마자 지정된곳에 선적되었습니다» · «시프팅 처리를 했으면 선적리스트 와 별도로 시프팅리스트 를 넣어줘야합니다». 후보일 뿐 단정하지 않는다(안내 문구도 «확인»).
export function shiftCandidatesOf(voyageKey, voyage) {
  const out = [];
  try {
    const d = voyage && voyage.discharge;
    if (!d) return out;
    const edi = ediMapFromRaw(d) || d.ediContainers || {};
    const rec = d.records || {};
    if (!Object.keys(rec).length) return out;   // 양하 리스트가 아직 없으면 «리스트에 없음» 이라 말할 수 없다
    let known = {};
    try { known = computeShiftingMapCached(voyageKey, voyage) || {}; } catch (e) { console.warn('[4.83 시프팅 후보] 시프팅 지도 읽기 실패 — 후보 안내를 건너뜁니다:', e); return out; }
    let mfn = {};
    try { mfn = mfnItemsOf(voyage) || {}; } catch (e) { console.warn('[4.83 시프팅 후보] MFN 목록 읽기 실패:', e); }
    let keep = {};
    try { keep = keepOnboardOf(voyage) || {}; } catch (e) { console.warn('[4.83 시프팅 후보] 본선 잔류 읽기 실패:', e); }
    for (const [cn, c] of Object.entries(edi)) {
      if (!/^[A-Z]{4}\d{7}$/.test(cn) || rec[cn] || known[cn] || mfn[cn] || keep[cn]) continue;
      if (c && c.pod && !isPyeongtaekPort(c.pod)) continue;   // 평택에서 내리지 않는 통과 컨은 후보가 아니다(4.83 감사)
      out.push({ cn, from: _shiftEdiPos7(c) || '' });
    }
  } catch (e) { console.warn('[4.83 시프팅 후보] 계산 실패:', e); }
  return out;
}
function _applyShiftManual(map, voyage) {
  const man = shiftManualOf(voyage);
  if (!Object.keys(man).length) return;
  const sw = swapFixList(voyage);
  let dM = null, lM = null;
  try {
    const mapOf = (sec) => applySwapFix(_mergeRecPos(ediMapFromRaw(sec) || sec?.ediContainers || null, sec?.records || null), sw);
    dM = voyage.discharge ? mapOf(voyage.discharge) : null;
    lM = voyage.loading ? mapOf(voyage.loading) : null;
  } catch (e) { console.warn('[4.82 수동 시프팅] EDI 자리 읽기 실패 — 표기값 그대로 씁니다:', e); }
  applyShiftManualToMap(map, man, dM, lM);
}

export function computeShiftingMapCached(voyageKey, voyage) {
  if (!voyage) return {};
  const d = voyage?.discharge, l = voyage?.loading;
  const sig = [
    d?.raw?.edi?.uploadedAt || 0, d?.raw?.edi?.sizeBytes || 0,
    l?.raw?.edi?.uploadedAt || 0, l?.raw?.edi?.sizeBytes || 0,
    Object.keys(d?.ediContainers || {}).length, Object.keys(l?.ediContainers || {}).length,
    voyage?.info?.berthShift ?? '',   // 2.81: 배정표 이적이 나중에 들어와도 다시 계산한다
    swapFixList(voyage).map((s) => s.id).join(','),   // 2.89: 맞교환이 더해지거나 되돌려지면 다시 계산한다
    // 2.96: **검수원이 자리를 고치면 다시 계산한다.** 이 줄이 없으면 고쳐도 옛 대수가 붙어 있는다.
    //   레코드 전체를 서명에 넣으면 매 틱마다 무효화되므로, **자리를 고친 컨의 좌표만** 모아 찍는다.
    _recPosSig(d?.records) + '/' + _recPosSig(l?.records),
    //  3.44: 선사 서류가 들어오거나 갱신되면 다시 계산한다.
    //    ⚠ 감사 지적 — 대수와 `at` 만 보면, 같은 대수로 자리만 고쳐 온 서류(at 없는 판)를 놓친다. 내용까지 찍는다.
    _restowSig(voyage?.restowList),
    //  4.53: 선사 지시 본선 잔류 기록이 바뀌면(넣음·풀음) 다시 계산한다 — 선적 EDI 로 확정한 지시 컨이 지도에 들기 때문.
    Object.keys(_keepRawOf(voyage)).sort().join(','),
    //  4.82: 수동 시프팅 표기가 바뀌면(넣음·풀음·자리 고침) 다시 계산한다.
    _shiftManualSig(voyage),
  ].join('|');
  const key = voyageKey || 'unknown';
  const hit = _shiftMapCache.get(key);
  if (hit && hit.sig === sig) return hit.map;
  //  ★ 3.44 — 선사 서류가 있으면 그것이 정본이다. 추정도 같이 계산해 «차이»를 표시용으로 남긴다.
  const doc = restowMapFromDoc(voyage?.restowList);
  let map;
  if (doc) {
    let est = {};
    try { est = computeShiftingFromVoyage(voyage) || {}; } catch (e) { est = {}; }
    const estKeys = Object.keys(est);
    try {
      Object.defineProperty(doc, '_meta', {
        value: { ...(doc._meta || {}), estN: estKeys.length,
                 docOnly: Object.keys(doc).filter((cn) => !est[cn]),
                 estOnly: estKeys.filter((cn) => !doc[cn]),
                 //  ★ 3.44-01 — **배정표 대수도 같이 남긴다.** 검수사 2026-09-12 «배정이 바뀌었는데 앱은 그대로».
                 //    배정목록 이적(berthShift)이 28 → 38 모브(14 → 19대)로 바뀌었는데, 서류를 정본으로 쓰면서
                 //    그 변화를 **조용히 덮었다**(규범 «배정표가 확정이면 배정표가 정본»). 덮지 말고 둘 다 보인다.
                 berthN: _berthShiftCount(voyage) },
        enumerable: false, configurable: true });
    } catch (e) { /* 표시 부가정보 실패는 계산에 영향 없음 */ }
    map = doc;
  } else {
    map = computeShiftingFromVoyage(voyage);
  }
  //  ★ 4.53 — 선적 EDI 가 확정한 선사 지시 본선 잔류 컨을 확정 시프팅 지도에 든다(keepConfirmedOf — 파란 ◆). 선사 시프팅 목록·EDI 대조가 이미 든 컨은 덮지 않는다(그쪽이 정본).
  //    평택 양하분에서는 이 지도의 키로 빠지고(isShiftOffPtk) 작업 분모(평택분 + 시프팅)는 그대로다.
  try {
    const _kc = keepConfirmedOf(voyage);
    for (const cn of Object.keys(_kc)) if (!map[cn]) map[cn] = _kc[cn];
  } catch (e) { console.warn('[4.53 본선 잔류 확정] 확정 지도에 넣기 실패 — 예정으로 남깁니다:', e); }
  //  ★ 4.82 — 검수사 수동 시프팅 표기를 덧입힌다(위 지도에 이미 든 컨은 덮지 않는다).
  try { _applyShiftManual(map, voyage); } catch (e) { console.warn('[4.82 수동 시프팅] 덧입히기 실패 — 표기 없이 셉니다:', e); }
  if (_shiftMapCache.size > 60) _shiftMapCache.clear();   // 폭주 방지(항차 수보다 넉넉)
  _shiftMapCache.set(key, { sig, map });
  return map;
}

/*  ★ 4.13 — **시프팅 근거 한 벌.** 검수사 2026-10-09 03:00 «시프팅건은 근거를 앱에 제시 하여야 한다는것입니다. 메일이 존재한다는것.» ·
    03:02 «확정이 안되어 있는 상태에서 시프팅 5건이라고 기록을 했으면 위치도 보여줘야 합니다. 그리고 미확정이라고 표기 한후
    터미널이 확정을 하면 확정된 대로 표기를 수정해야 합니다».
    · 상태 — 배정표 이적(_berthTruthRaw — 작업 시작 뒤에만 정본) 이 대수와 같으면 «확정», 다르면 «불일치», 아직이면 «미확정».
      같은 값을 읽는 규칙은 새로 만들지 않는다(§4-4) — shiftingTruthCheck 는 삼자 일치 갈래가 작업 전에도 0 을 새게 하므로 쓰지 않는다.
    · 근거 — 선사 RESTOW 서류면 메일 수신 시각(수집기 2.44-02 가 _meta.mailAt 에 적음, 없으면 «수집» 시각)·파일명·대수,
      서류 자리와 양하/선적 EDI 자리의 일치 대수. 서류가 없으면 EDI 자리 비교 또는 앱 예측이라고 밝힌다.
    · 컨별 표식 — 서류일 때만. 양하 EDI 자리·선적 EDI 자리가 서류와 같은지(true/false/null=EDI 에 없음).
    순수 함수라 콘앱(window.ConeParse)도 같이 부른다. dMap/lMap = { 컨번호: {bay,row,tier,...} }. */
//  ★ 4.48-03 — keepN(선사 지시 본선 잔류 예보 대수, 노란 ◆ — 이 지도에는 안 든다). 배정표 이적이 «확정 + 예보» 와 같으면 터미널이 선사 메일을 먼저 반영한 것이다 —
//    «불일치»(빨간 경고)가 아니라 «미확정»(선사 시프팅 목록 수정본 대기). 검수사 2026-10-24 20:06 «확정도 아닌데 빨간 경고 문구가 나온것 … 을 문제로 삼은것입니다».
//  4.60 — 항로 사전(laneRouteOf)의 기항 순서에서 평택 바로 앞 기항지. 모르면 ''(문구가 «앞 기항지»로만 말한다). KRINC → 인천, 그 밖은 코드 그대로.
export function prevPortOfLane(lane) {
  const r = laneRouteOf(lane)?.rotation;
  if (!Array.isArray(r) || r.length < 2) return '';
  const i = r.indexOf('KRPTK');
  if (i < 0) return '';
  const p = String(r[(i - 1 + r.length) % r.length] || '').toUpperCase();
  return p === 'KRINC' ? '인천' : p;
}
export function shiftEvidenceCore({ shiftingMap, dMap, lMap, berthShift, terminalStatus, keepN = 0, keepConfN = 0, prevPort = '' }) {
  const sm = shiftingMap || {};
  const keys = Object.keys(sm).filter((k) => k && !k.startsWith('_'));
  const count = keys.length;
  const meta = sm._meta || {};
  const isDoc = meta.source === 'carrier';
  const kind = isDoc ? 'carrier' : (!count ? 'none' : (keys.some((k) => sm[k] && sm[k].to) ? 'compare' : 'predict'));
  const berth = _berthTruthRaw({ info: { berthShift, terminalStatus } });   // null=자료 없음 · {pending} · {truth,moves}
  const ready = !!(berth && !berth.pending);
  const _kN = Number(keepN) > 0 ? Number(keepN) : 0;
  const keepMatch = !!(ready && _kN > 0 && count > 0 && berth.truth !== count && berth.truth === count + _kN);
  //  4.53 — 선적 EDI 가 확정한 본선 잔류(keepConfN)는 이 지도에 안 든다(호출부가 뺀다). 배정표 이적이 «서류 + 확정 본선 잔류» 와 같으면 터미널이 그것까지 반영한 것이다 — 불일치가 아니다.
  const _kcN = Number(keepConfN) > 0 ? Number(keepConfN) : 0;
  const keepConfIncl = !!(ready && _kcN > 0 && count > 0 && berth.truth !== count && berth.truth === count + _kcN);
  const status = (!count && !(isDoc && ready)) ? '' : (ready ? ((berth.truth === count || keepConfIncl) ? '확정' : keepMatch ? '미확정' : '불일치') : '미확정');   // 4.13 감사: 서류 0대 + 배정표 이적 N모브 는 «불일치» 라고 말한다(라벨이 비면 근거 줄과 모순)
  //  메일/수집 시각 — ms 로 오지 않은 값(초 단위)도 읽는다.
  const asMs = (v) => { const t = Number(v); if (!Number.isFinite(t) || t <= 0) return 0; return t < 1e11 ? t * 1000 : t; };
  const fmt = (ms) => { if (!ms) return ''; const d = new Date(ms + 9 * 3600e3); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
  const mailAt = asMs(meta.mailAt), collectedAt = asMs(meta.at);
  const doc = isDoc ? { file: meta.file || '', mailAt, collectedAt, total: meta.docTotal != null ? meta.docTotal : (meta.total != null ? Number(meta.total) : null),
                        read: meta.read != null ? meta.read : count, mailFolder: meta.mailFolder || '' } : null;
  //  컨별 자리 대조 — 서류일 때만(EDI 비교·예측은 정의상 EDI 자리에서 나왔으므로 대조할 것이 없다).
  const per = {};
  let arvOk = 0, arvBad = 0, arvNone = 0, depOk = 0, depBad = 0, depNone = 0;
  const depBadCns = [], arvBadCns = [];
  const depUsable = !!(isDoc && lMap && loadEdiIsDeparture(lMap));   // 평택 출항본이 아닌 선적 EDI 는 도착 적부도다 — 대조하지 않는다
  const arvUsable = !!(isDoc && dMap);
  if (isDoc) {
    for (const cn of keys) {
      const e = sm[cn] || {};
      const a = arvUsable ? _shiftEdiPos7(dMap[cn]) : '', l = depUsable ? _shiftEdiPos7(lMap[cn]) : '';
      const arv = a ? a === e.from : null;
      const dep = l ? l === e.to : null;
      per[cn] = { arv, dep, arvPos: a, depPos: l };
      if (arv === true) arvOk++; else if (arv === false) { arvBad++; arvBadCns.push(cn); } else arvNone++;
      if (dep === true) depOk++; else if (dep === false) { depBad++; depBadCns.push(cn); } else depNone++;
    }
  }
  const parts = [];
  if (kind === 'carrier') {
    const when = mailAt ? `메일 ${fmt(mailAt)}` : (collectedAt ? `수집 ${fmt(collectedAt)}` : '');
    parts.push(`선사 RESTOW LIST ${when}${doc.file ? `(${doc.file})` : ''} ${count}대`.replace(/\s+/g, ' '));
    parts.push(arvUsable ? `양하 EDI 자리 ${arvOk}/${count} 일치${arvBad ? ` ⚠${arvBad}` : ''}${arvNone ? ` · EDI에 없음 ${arvNone}` : ''}` : '양하 EDI 아직 없음');
    parts.push(depUsable ? `선적 EDI 자리 ${depOk}/${count} 일치${depBad ? ` ⚠${depBad}` : ''}${depNone ? ` · EDI에 없음 ${depNone}` : ''}` : '선적 EDI 아직 없음');
  } else if (kind === 'compare') {
    parts.push(`양하·선적 EDI 자리 비교 ${count}대 — 선사 서류 없음`);
  } else if (kind === 'predict') {
    parts.push(`앱 예측 ${count}대 — 선사 서류·선적 EDI 없음`);
  }
  //  ★ 4.60 — 터미널이 이적을 잡았는데(작업 전) 앱이 컨을 하나도 못 찾는 배: «틀렸다»가 아니라 «자료가 아직 없다»고 말한다.
  //    검수사 2026-10-31 19:05 «인천에서 작업이 끝나지 않아 어느 베이에서 발생되는지 알 수 없습니다. 시프팅 예상 8대 터미널 배정 표기를 하고 설명이 들어가야»
  //    · 19:07 «인천에서 파이널 자료가 오면 확정을 하고 맞으면 보여줬던 설명은 지우면 되는 것입니다».
  //    이 갈래는 kind==='none' · 작업 전(pending) · 선사 서류 없음일 때만 켜진다 — 선적 EDI·선사 서류가 와서 컨이 잡히거나 터미널이 작업을 시작해 숫자가 확정되면 저절로 꺼진다.
  //    직항(rot==='direct')은 앞 기항지가 없으니 이 설명을 하지 않는다.
  //    감사(4.60): 본선 잔류 확정·예보(◆)는 이 지도에서 빼므로 count 가 0 이어도 화면에는 그 컨이 보인다 — 그런 배는 «컨을 못 찾았다»고 말하지 않는다(keepN·keepConfN 이 0 일 때만). 터미널 상태가 비어 있는 배(옛 항차)도 말하지 않는다.
  let whyUnknown = false;
  if (kind === 'none' && !isDoc && !_kN && !_kcN && berth && berth.pending && berth.terminalStatus && berth.terminalStatus !== '미상' && Number(berth.moves) > 0 && meta.rot !== 'direct') {
    whyUnknown = true;
    const bm = Number(berth.moves);
    parts.push(`시프팅 예상 ${bm % 2 === 0 ? `${bm / 2}대(터미널 배정 ${bm}모브)` : `터미널 배정 ${bm}모브`}`);
    const pp = prevPort ? `앞 기항지(${prevPort})` : '앞 기항지';
    parts.push(`${pp} 작업이 끝나기 전이라 어느 베이에서 생기는지 아직 알 수 없습니다 — ${pp}에서 선적하는 화물이 평택 양하·선적 자리에 걸려 생기는 몫입니다. 최종 자료가 오면 확정하고 이 설명은 사라집니다`);
  }
  if (kind !== 'none') {
    if (!berth) parts.push('배정표 이적 아직 없음');
    else if (berth.pending) parts.push(`배정표 이적 ${berth.moves}모브(작업 시작 후 확정)`);
    else parts.push(`배정표 이적 ${berth.moves}모브=${berth.truth}대${berth.truth === count ? '' : keepConfIncl ? ` = ${isDoc ? '서류' : '확정'} ${count} + 본선 잔류 확정 ${_kcN}` : keepMatch ? ` = 확정 ${count} + 예보◆${_kN}(터미널은 선사 메일 반영 · 선사 시프팅 목록 수정본 대기)` : ` ≠ ${count}대`}`);
  }
  //  4.53 — 선적 EDI 가 확정한 본선 잔류 한 토막(서류 대수에 안 든다). 터미널 배정표가 아직 그만큼 안 셌으면 «터미널 반영 전» 이라고 말한다(빨간 경고가 아니다).
  if (_kcN > 0) parts.push(`본선 잔류 확정 ${_kcN}대(선적 EDI 에 실린 선사 지시 컨)${ready && !keepConfIncl && berth.truth === count ? ' — 터미널 배정표 이적은 아직 반영 전' : ''}`);
  //  label = 화면·카고플랜 머리에 쓰는 말. 앱 예측뿐이고 배정표가 아직이면 «미확정»이 아니라 «예측»(자리도 추정이다).
  const label = (kind === 'predict' && status === '미확정') ? '예측' : status;
  return { status, label, kind, count, whyUnknown, keepMatch, keepN: _kN, keepConfN: _kcN, keepConfIncl, doc, per, line: parts.join(' · '),
           arv: { ok: arvOk, bad: arvBad, none: arvNone, badCns: arvBadCns, usable: arvUsable },
           dep: { ok: depOk, bad: depBad, none: depNone, badCns: depBadCns, usable: depUsable },
           berth: berth ? { moves: berth.moves, truth: berth.pending ? null : berth.truth, pending: !!berth.pending, terminalStatus: berth.terminalStatus || '' } : null };
}

//  검수앱용 — 항차 데이터(raw EDI)에서 양하/선적 지도를 만들어 core 를 부른다. 서명이 같으면 다시 파싱하지 않는다(지도 캐시와 같은 방식).
const _shiftEvidCache = new Map();   // voyageKey → { sig, res }
//    opts.light — 상태·근거 한 줄만 필요한 곳(항차 목록 카드)은 EDI 를 다시 파싱하지 않는다(컨별 자리 대조는 비운다). 캐시 칸이 따로다.
export function shiftEvidenceOf(voyageKey, voyage, shiftingMap, opts) {
  //  ★ 4.48 — 본선 잔류 시프팅 예보(노란 ◆)는 근거 판정(배정표·선사 서류·EDI 대조)에 넣지 않는다 — 확정·예측만 센다(64 를 배정표 62 와 «불일치»로 읽지 않게).
  let _keepN = 0;   // 4.48-03: 뺀 예보 대수 — 배정표 = 확정 + 예보 갈래(core keepN)
  if (shiftingMap && Object.values(shiftingMap).some(_isKeepShift)) {
    _keepN = Object.values(shiftingMap).filter(_isKeepShift).length;
    const s = {};
    for (const [k, v] of Object.entries(shiftingMap)) if (!_isKeepShift(v)) s[k] = v;
    const md = Object.getOwnPropertyDescriptor(shiftingMap, '_meta');
    if (md) { try { Object.defineProperty(s, '_meta', md); } catch (e) { console.warn('[4.48 시프팅 근거] 부가정보 옮기기 실패:', e); } }
    shiftingMap = s;
  }
  //  ★ 4.53 — 선적 EDI 가 확정한 본선 잔류(_keepConf)도 서류·배정표와 맞대는 수에서 뺀다 — 근거는 선사 서류(또는 EDI 대조)와 배정표 이적의 일치이고, 이 컨들의 근거는 선적 EDI 자리다(따로 한 토막).
  let _keepConfN = 0;
  if (shiftingMap && Object.values(shiftingMap).some((v) => v && v._keepConf)) {
    _keepConfN = Object.values(shiftingMap).filter((v) => v && v._keepConf).length;
    const s = {};
    for (const [k, v] of Object.entries(shiftingMap)) if (!(v && v._keepConf)) s[k] = v;
    const md = Object.getOwnPropertyDescriptor(shiftingMap, '_meta');
    if (md) { try { Object.defineProperty(s, '_meta', md); } catch (e) { console.warn('[4.53 시프팅 근거] 부가정보 옮기기 실패:', e); } }
    shiftingMap = s;
  }
  if (!voyage) return shiftEvidenceCore({ shiftingMap, keepN: _keepN, keepConfN: _keepConfN });
  const light = !!(opts && opts.light);
  const info = voyage.info || {};
  const isDoc = !!(shiftingMap && shiftingMap._meta && shiftingMap._meta.source === 'carrier');
  const d = voyage.discharge, l = voyage.loading;
  const sig = [
    isDoc ? 1 : 0, Object.keys(shiftingMap || {}).length, (shiftingMap && shiftingMap._meta && shiftingMap._meta.source) || '',
    info.berthShift ?? '', info.terminalStatus || '',
    voyage.restowList?._meta?.mailAt ?? '', voyage.restowList?._meta?.at ?? '', voyage.restowList?._meta?.file ?? '',
    d?.raw?.edi?.uploadedAt || 0, d?.raw?.edi?.sizeBytes || 0, l?.raw?.edi?.uploadedAt || 0, l?.raw?.edi?.sizeBytes || 0,
    Object.keys(d?.ediContainers || {}).length, Object.keys(l?.ediContainers || {}).length,
    isDoc ? _restowSig(voyage.restowList) : '', _keepN, _keepConfN, prevPortOfLane(info.lane),
  ].join('|');
  const key = (voyageKey || 'unknown') + (light ? '|L' : '');
  const hit = _shiftEvidCache.get(key);
  if (hit && hit.sig === sig) return hit.res;
  const mapOf = (sec) => (isDoc && !light ? (ediMapFromRaw(sec) || sec?.ediContainers || null) : null);
  const res = shiftEvidenceCore({ shiftingMap, dMap: mapOf(d), lMap: mapOf(l), berthShift: info.berthShift, terminalStatus: info.terminalStatus, keepN: _keepN, keepConfN: _keepConfN, prevPort: prevPortOfLane(info.lane) });
  if (_shiftEvidCache.size > 60) _shiftEvidCache.clear();
  _shiftEvidCache.set(key, { sig, res });
  return res;
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
/** 이 항차가 선언한 **특수제작컨 번호** — 수집기 2.32 가 선사 메일 본문의 «* 특수컨» 절을 읽어 올린 `forecast.specialCns`. */
export function specialCnSet(voyage) {
  const a = voyage?.info?.forecast?.specialCns;
  return new Set((Array.isArray(a) ? a : []).map((x) => String(x || '').trim().toUpperCase()).filter(Boolean));
}

/**  ★ 3.37 — **컨 목록이 만들어지는 «입구» 마다 이것을 지난다**(규범 §4-4 — 문지기는 데이터가 들어오는 자리에).
 *   첫 판은 `tagForecastMarks`(화면 마커) 한 곳에만 붙였는데, **진단·마감 점검·현황 요약·마감텔리는
 *   그 목록을 안 쓰고 `ediContainers + records` 로 제 목록을 따로 만든다** — 그래서 검수사가 본
 *   «풀 리퍼 N대 중 M대 온도 미입력» 경고에 새 길이 닿지 않았다(감사 실측).
 *   ⇒ 목록을 만드는 네 자리가 전부 이 함수를 지나게 한다. 찍는 것은 종전 `mkcon` 그대로다.
 */
export function applySpecialMarks(voyage, list) {
  const s = specialCnSet(voyage);
  //  ★ 3.70-01 — **수화물 표시(lugg)도 이 입구에서 찍는다.** 화면 목록은 tagForecastMarks 가 붙이지만, 제 목록을 따로 만드는
  //    현황 요약·마감 점검·진단·마감텔리는 lugg 가 없어 수화물 리퍼가 «온도 미입력» 으로 셌다(reeferTempExempt 가 못 봄).
  //    정본 통로는 forecast.luggageCns(덱플랜 LUG 도 VoyagePage 가 여기로 승격 — 2.06-01).
  const _la = voyage?.info?.forecast?.luggageCns;
  const lg = new Set((Array.isArray(_la) ? _la : []).map((x) => String(x || '').trim().toUpperCase()).filter(Boolean));
  if (!Array.isArray(list)) return list;
  //  ★ 4.20 (검수사 2026-10-10 00:02 «SAWTBP004는 … 제작컨일것입니다»): **비ISO 유닛은 이 입구에서 제작컨(mkcon)으로 찍는다**(isMadeUnitCn 한 벌) —
  //    종전 mkcon 경로(리퍼 온도 제외·«제작컨» 표기·RF 시트 제외)가 그대로 받는다. _madeUnit 은 «규격 코드 없음» 표식. 수화물(lugg)은 찍지 않는다(LUG 와 별개).
  const anyMade = list.some((c) => c && c.cn && !c._madeUnit && isMadeUnitCn(c.cn));
  if (!s.size && !lg.size && !anyMade) return list;
  return list.map((c) => {
    if (!c || !c.cn) return c;
    const k = String(c.cn).trim().toUpperCase();
    const mk = !c.mkcon && s.has(k), lu = !c.lugg && lg.has(k), mu = !c._madeUnit && isMadeUnitCn(k);
    if (!mk && !lu && !mu) return c;
    const t = { ...c };
    if (mk) t.mkcon = true;
    if (lu) t.lugg = true;
    if (mu) { t.mkcon = true; t._madeUnit = true; }
    return t;
  });
}

//  ★ 3.37 (검수사 2026-09-09) — **특수제작컨도 여기서 찍는다.** 검수사 원문 «특수제작컨입니다.
//    기본 규격이 아닙니다. 따로표기» · «제작컨 온도 체크 대상 아님» (R098E 32尺 6대·34尺 2대).
//    선사 메일 본문의 «* 특수컨» 목록을 수집기 2.32 가 `forecast.specialCns` 로 올리면, 그 번호에
//    **`mkcon`(제작컨)** 을 붙인다 — 그 순간부터 종전 규칙들이 그대로 받아 준다:
//      리퍼 온도 경고 제외(`diagnostics.js` · `utils.reeferTempOf` · `ReeferMemoModal`) ·
//      «제작컨» 표기(`BigResultCard` · `ContainerDetailModal` · 음성 «제작 컨테이너») · 마감 점검 제외.
//    ⚠ 판정을 새로 만들지 않는다 — 리스트 REMARK 경로(`parseListRows` 의 `rmkMkc`)와 **같은 `mkcon` 한 벌**이다.
//      리스트에 «특수컨» 이 적혀 오면 그 길로, 안 적혀 와도 메일 본문으로 잡힌다(R096E 는 리스트에 없어 일곱 대가
//      리퍼로 남아 있었다 — 실측).
export function tagForecastMarks(list, urgentSet, luggSet, luggSeals, specSet) {
  if ((!urgentSet || !urgentSet.size) && (!luggSet || !luggSet.size) && (!specSet || !specSet.size)) return list;
  return list.map(c => {
    if (!c || !c.cn) return c;
    const u = urgentSet && urgentSet.has(c.cn);
    const l = luggSet && luggSet.has(c.cn);
    const sp = specSet && specSet.has(c.cn);
    if (!u && !l && !sp) return c;
    const t = { ...c };
    if (u) t.urgent = true;
    if (l) {
      t.lugg = true;
      if (luggSeals && luggSeals[c.cn]) t.luggSeal = luggSeals[c.cn];
    }
    if (sp) t.mkcon = true;   // 3.37: 제작컨 — 온도·사진 대상이 아니고 «제작컨» 으로 표기된다
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
 * 4.62: 터미널 선석배정이 정한 작업예정(planBerth) — 일정(planDate)과 30분 넘게 다를 때만 돌려준다. 표시 전용(계산에는 안 쓴다).
 *   검수사 2026-11-01 05:58 «도선시간은 13:30 이지만 작업예정은 19:00 입니다 둘다 보여주면 됩니다» · 05:59 «도선시간은 확정이지만 배정은 예정입니다. 예정표기도 빠지면 안됩니다».
 *   st — 수집기가 배정표 행 색에서 읽은 상태(plan 하늘=예정 · work 황=작업중 · done 초록=완료).
 * @returns {{at:number, st:string, label:string}|null}
 */
export function berthAltOf(info, refMs = null) {
  const s = parsePlanStart(info && info.planBerth);
  if (!s) return null;
  const ref = refMs != null ? refMs : (parsePlanStart(info && info.planDate) || { getTime: () => null }).getTime();
  if (ref == null || Math.abs(s.getTime() - ref) < 30 * 60000) return null;
  const st = String((info && info.planBerthSt) || 'plan').toLowerCase();
  return { at: s.getTime(), st, label: st === 'work' ? '작업중' : st === 'done' ? '완료' : '예정' };
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
// TallyOne 2.94-08: 표시는 «자리 없음» 한 말로 통일한다(검수사 «미배정이 뜨면 안됩니다»).
//   ⚠ 옛 `moves` 기록에는 '미배정' 문자열이 그대로 남아 있다 — 판정은 둘 다 인정한다.
const _MV_NOPOS = '자리 없음';
const _isNoPos = (v) => v === _MV_NOPOS || v === '미배정';
const _mvTxt = (v) => (_isNoPos(v) ? _MV_NOPOS : v);
const _mvPos = (b, r, t) => (b ? `${String(parseInt(b, 10)).padStart(2, '0')}-${r}-${t}` : _MV_NOPOS);
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


export function movePathOrigin(c) {
  const p = buildMovePath(c);
  // 1.54: 첫 줄이 창고에서 시작하면(계획 기록 없이 보관함으로 들어갔던 컨) 그것은 출발지가 아니다.
  //   "원래 창고 계획이었습니다" 는 거짓말이 된다 — 계획 좌표가 남아 있으면 그것을 쓴다.
  if (p.length && String(p[0].from) !== _MV_STORAGE) return p[0].from;
  const og = _mvPos(c?.bay_orig, c?.row_orig, c?.tier_orig);
  if (!_isNoPos(og)) return og;
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
  const tail = _isNoPos(cur)
    ? (isCompleted ? '⚠ 지금 자리가 없는데 선적확인만 되어 있습니다 — 자리를 지정해야 합니다.' : '지금은 실을 자리가 정해지지 않았습니다.')
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
    const to = (_isNoPos(m.to) || toStorage) ? _mvTxt(m.to) : `${m.to}${_ro(m.to)}`;
    let line;
    switch (m.why) {
      // 1.54: 이름표가 내려온 사건. 실물은 안 움직였다 — 문장이 그렇게 읽혀야 한다.
      case 'planTaken': {
        const b4 = m.byCn ? String(m.byCn).slice(-4) : '';
        line = b4
          ? `${m.from}는 ${b4}${_iga(b4)} 가져갔습니다. 그 컨은 아직 안 실렸습니다.`
          : `${m.from} 계획 자리를 내줬습니다. 그 컨은 아직 안 실렸습니다.`;
        return { m, line, nameOnly: true };   // byCn 꼬리말을 또 붙이지 않는다 — 문장에 이미 들어 있다.
      }
      case 'displaced': line = _isNoPos(m.to) ? '계획 자리를 내줬습니다 — 실을 자리를 정해야 합니다.' : `${to} 밀려났습니다.`; break;
      case 'unassign':  line = `자리를 비웠습니다.`; break;
      case 'cancel':    line = `선적확인을 취소해 ${to} 되돌렸습니다.`; break;
      case 'restore':   line = `원래 계획 자리 ${to} 되돌렸습니다.`; break;
      // 1.54: 창고에서 꺼내 실은 경우도 마지막은 "실었습니다" 한 줄이다. 좌표 조사는 '에'로 통일한다.
      case 'loaded':    line = `${m.to}에 실었습니다.`; break;
      case 'actual':
      case 'move':
        if (_isNoPos(m.to)) { line = '자리를 비웠습니다.'; break; }
        // 창고에 있는 동안 좌표를 바꾼 것은 **계획을 고친 것**이지 실물을 옮긴 것이 아니다.
        line = wasInStg ? `${to} 계획을 바꿨습니다 (아직 안 실림).` : `${to} 옮겼습니다.`;
        break;
      default:          line = _isNoPos(m.to)
                          ? '자리를 비웠습니다. (사유 기록 없음 — 이력 도입 전)'
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
    // 2.94-09: 검수앱은 창고를 안 쓴다 — 아직 안 실은 컨은 실릴 차례를 기다릴 뿐이다.
    out.push('■ 실물이 움직인 것 — 없습니다. 아직 안 실렸습니다.');
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
  //  4.26-03: 전체 시퀀스가 기본이 되어 엠티 주인 칸도 묻는다 — 주인의 풀·엠티를 firebase 가 실어 보낸 대로 쓴다(없으면 종전 «풀»).
  //    값은 풀 true · 엠티 false · 모름 null — 모르는 것은 라벨·경고에 쓰지 않는다(감사 하-1).
  const fl = Array.isArray(res.seqConflictFull) && res.seqConflictFull.length === cns.length ? res.seqConflictFull : null;
  const kn = fl ? fl.filter((x) => x === true || x === false) : [];
  const feW = !fl ? '풀' : !kn.length ? '' : kn.every(Boolean) ? '풀' : kn.every((x) => !x) ? '엠티' : '풀·엠티';
  //  4.26-03: 바뀔 수 없는 짝이면 먼저 말한다 — 검수사 2026-10-14 «다만 풀이 풀끼리만 바뀌는거지 엠티와 풀이 서로 바뀌지는 않습니다. 포트도 바뀌지 않습니다.»
  //    (어제 MCAP 641S 마감텔리 — 자리 다른 풀 28대는 전부 같은 베이·같은 포트의 풀 주인 칸, 엠티 115대는 전부 같은 포트의 엠티 주인 칸이었다.)
  const warn = [];
  if (fl && typeof res.incomingFull === 'boolean' && kn.some((x) => x !== res.incomingFull)) {
    const me = res.incomingFull ? '풀' : '엠티', other = res.incomingFull ? '엠티' : '풀';
    warn.push(`⚠ 풀과 엠티는 서로 바뀌지 않습니다 — 이 컨 ${me} · 그 칸 주인 ${other}. 번호와 자리를 다시 확인하세요.`);
  }
  const podDiff = res.incomingPod && Array.isArray(res.seqConflictPod) ? [...new Set(res.seqConflictPod.filter((p) => p && p !== res.incomingPod))] : [];
  if (podDiff.length) warn.push(`⚠ 포트가 다릅니다 — 이 컨 ${res.incomingPod} · 그 칸 주인 ${podDiff.join('·')}. 포트는 바뀌지 않습니다.`);
  const warnTxt = warn.length ? `${warn.join('\n')}\n\n` : '';
  //  4.26-03(감사 하-7): 묻는 말이 «이름표를 내리고» 였는데 아래 줄은 «이름표는 그대로 남습니다» — 한 창 안에서 어긋나 묻는 말만 고쳤다(전체 시퀀스가 기본이 되어 자주 뜬다).
  return `시퀀스 작업입니다.\n${warnTxt}${pos} 주인 ${who}${feW ? `(${feW})` : ''} 자리에 이 컨을 넣을까요?\n\n넣으면 그 컨은 «자리 없음·계획 자리 내줌»으로 남아 실을 때 자리를 다시 정합니다 — 계획 자리 ${pos} 의 이름표는 그대로 남습니다.`;
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
export const SHIP_LUGGAGE = Object.fromEntries(shipCodesWith('luggage').map((k) => [k, SHIP_FLAGS[k].luggage]));   // ★ 일괄수리(2026-11-10): 선박 성질표 한 곳에서 — { RZOR: 1 }

// V8.10 확립 → 1.56-06 단일 소스화: **해치커버 계산·보고를 하지 않는 선박.**
//   종전엔 GuidedWorkPanel·WorkReportModal 이 같은 정규식을 복제해 들고 있었다(한쪽만 고치면 갈라진다).
//   TMPZ = 자동(유압식) · TNJP·RZOR·OBWH(검수사 확정 2026-06-19)
//   ATPR = 자동 — 검수사 확정 2026-08-12: "ATPR은 해치커버 자동이라 커버 열고 다음을 체크하지 않습니다."
//   이 선박들은 해치 프롬프트·장수 계산·커버 보고를 건너뛰고, 대신 주야간 작업갯수를 기록한다.
export const HATCH_SKIP_RE = new RegExp(shipCodesWith('hatchSkip').join('|'), 'i');   // ★ 일괄수리(2026-11-10): 선박 성질표 한 곳에서 — TMPZ|TNJP|RZOR|OBWH|ATPR 과 같은 다섯 척(부분 일치 그대로)
export function isHatchSkipShipInfo(info) {
  return HATCH_SKIP_RE.test(`${info?.vsl || ''} ${info?.vslFull || ''}`);
}

/** ★ 3.4 — **고려해운(KMTC) 선박인가.** (검수사 지시 2026-09-03 — 고려해운 공문 «클래스 8 홀드 적재 금지»)
 *
 *  선사 코드는 EDI TDT 에서 오는데 **비어 있는 항차가 많다**(2026-08-13 실측, dataReadiness.js:58 이 사전으로 보강하는 이유).
 *  그래서 두 겹으로 본다 — ①선사 코드(KMT·KMD·KMTC) ②선박 약자(검수사 확정: 고려해운 배는 «약자 4자 중 앞 2자가 KK»,
 *  그리고 KSKM SUNNY KALMIA — 검수사 확정 2026-09-03 «KMD 맞습니다»). 사전 carrier 도 받는다(사전이 EDI 보다 자주 채워져 있다).
 *  ⚠ 새 고려해운 배가 오면 KK 규칙이 자동으로 잡는다. 그렇지 않은 배(KSKM 류)는 아래 목록에 한 줄 추가한다.
 */
export const KMTC_CARRIERS = ['KMT', 'KMD', 'KMTC'];
export const KMTC_SHIP_RE = /^(KK[A-Z0-9]{2}|KSKM)$/;
export function isKmtcShip(info, dictCarrier) {
  const car = String(info?.carrier || dictCarrier || '').trim().toUpperCase();
  if (car && KMTC_CARRIERS.includes(car)) return true;
  const code = String(info?.vsl || '').trim().toUpperCase();
  return KMTC_SHIP_RE.test(code);
}
/** ★ 3.72-02 — **리퍼 체크를 하지 않는 배인가.** (검수사 1.86 «머스크는 리퍼가 다수입니다. 그래서 리퍼 체크를 하지 않습니다» ·
 *  2.0 «머스크 계열은 냉동 검사를 안한다고 알람 띄우지 말라고 했는데 계속 띄우는 이유는?» 2026-10-02)
 *
 *  종전에는 선박 실 정책의 스위치(rfSkip)만 봤고, 그것도 상단 리퍼 줄·브리핑만 읽었다 — 머스크 5척 중 MCSN·MAMP 는 꺼져 있었고
 *  진단 알람·출항 배너·마감 점검·베이 사진 배지·요약 카드 칩은 스위치를 아예 안 읽었다. 이제 ①선박 정책 스위치 ②선사 코드 MAE·MSK(머스크 계열 —
 *  사전 carrier 5척 MCSN·MAMP·MCAP·MCSC·MCAT 는 MAE, 보관소 머스크 17항차 info.carrier 는 MAE 10·MSK 4·빈값 3 실측) 둘 중 하나면 «체크 안 함» 이고,
 *  알람을 만드는 모든 입구가 이 함수 하나를 부른다(규범 §4-4).
 *  수동 조회(컨 한 대를 눌러 보는 것)는 그대로다. */
export const MAERSK_CARRIERS = ['MAE', 'MSK'];   // 실측 — 사전 carrier 는 5척 모두 MAE, 보관소 머스크 17항차 info.carrier 는 MAE 10 · MSK 4 · 빈값 3 (EDI TDT 코드가 항차마다 다르다)
export function isReeferCheckSkipped(info, policy, dictCarrier) {
  if (policy && policy.rfSkip === true) return true;
  //  항차 info.carrier 와 사전 carrier **둘 다** 본다 — info.carrier 가 비어 있지 않으면 사전을 무시하던 식은 MSK 로 온 항차(MAMP 636N·MCSN 632N)를 놓쳤다.
  return [info && info.carrier, dictCarrier].some((x) => MAERSK_CARRIERS.includes(String(x || '').trim().toUpperCase()));
}
export function shipLuggageCount(voyageKey) {
  const code = String(voyageKey || '').split('_')[0].toUpperCase();
  return SHIP_LUGGAGE[code] || 0;
}

//  ── 3.7-08: 터미널 앱(CATOS)이 찍은 **실제 자리**를 실적 자리로 쓴다 ──────────────
//
//  검수사 2026-09-04 — *«왜 실제로 올린것을 안받고 예정된 것을 받았나요? 앱은 22번 베이 완료인데... 실제는?»* ·
//    *«카토스도 우리 검수원이 찍은것입니다»* · *«결국은 결과는 같습니다 우리앱으로 찍든 PCTC앱으로 찍든
//    그래서 카토스 자료로 우리앱에 덮어 사용하는 것입니다. 다만 오늘은 계획에 맞춰 했기 때문에
//    제가 추궁을 한것이고 실제 입력된 데이터로 고치라고 한것입니다.»*
//
//  무엇이 틀렸었나 — 실측 SWMM 2609S 선적. CATOS 가 `termWork/{컨}.pos` 로 **실제로 실린 자리**를
//    445대 전부 보내 주고 있었는데(`{"pos":"220782","status":"Delivered",…}`) 앱은 그것을 자리로 한 번도
//    안 썼다. 그래서 22번 베이가 «EDI 계획 60대 전부 실림 = 완료» 로 보였고, 실제로 그 베이에 앉은 것은
//    **25대**뿐이었다(나머지는 6·10번에서 옮겨 온 컨들이 채웠다). 검수사가 종이 플랜에 손으로 적고 계셨다.
//
//  ⚠ 우선순위 다툼이 아니다 — 우리 앱으로 찍든 PCTC 앱으로 찍든 **같은 검수원의 같은 기록**이다.
//    그래서 «둘 중 누가 세냐» 를 만들지 않고, **실적 자리가 비어 있을 때 CATOS 값이 그 자리를 채운다**.
//    이미 우리 앱으로 찍어 둔 자리(`bay_actual`)가 있으면 그것을 덮지 않는다(현장 기록 보호).
//  ⚠ 계획은 계획이다 — 카고플랜은 이 값을 안 본다(검수사 확정 2026-08-12 «카고플랜은 변함이 없어야 한다»).
//    `VoyagePage`·`BayPlan` 이 카고플랜에 넘길 때 `_edi_*` 로 계획 좌표를 되돌리므로 그림은 그대로다.
//  ⚠ 출처는 `_pos_src:'catos'` 로 남긴다 — 화면이 «누가 정한 자리인가» 를 말할 수 있어야 한다.
/** CATOS 자리 문자열(6자리 `BBRRTT`)을 {bay,row,tier} 로. 못 읽으면 null. */
export function parseCatosPos(pos) {
  const p = String(pos || '').replace(/[^0-9]/g, '');
  if (p.length !== 6) return null;
  //  ⚠ 베이는 앱이 쓰는 모양(앞 0 없음)으로 맞춘다 — `firebase._markLoadedPos` 가
  //    `String(parseInt(b,10))` 로 쓰므로 여기서만 `'01'` 을 쓰면 같은 자리가 두 문자열이 된다
  //    (실측 SWMM 2609S — 693대 중 113대가 한 자리 베이라 그대로 두면 계획과 모양이 갈린다).
  //    로우·단은 EDI 와 같은 두 자리 그대로 둔다.
  const bay = String(parseInt(p.slice(0, 2), 10));
  if (!bay || bay === 'NaN') return null;
  return { bay, row: p.slice(2, 4), tier: p.slice(4, 6) };
}

/** 항차 한 벌에 CATOS 실적 자리를 얹는다 — records 의 실적 자리가 **비어 있을 때만** 채운다.
 *  구독 콜백(fbSubscribeVoyages) 한 곳에서만 부른다. 원본을 바꾸지 않고 새 객체를 돌려준다. */
export function applyCatosPos(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  let touched = false;
  const out = { ...voyage };
  for (const mode of ['discharge', 'loading']) {
    const sec = voyage[mode];
    if (!sec || typeof sec !== 'object') continue;
    const tw = sec.termWork;
    if (!tw || typeof tw !== 'object') continue;
    const recs = { ...(sec.records || {}) };
    const _edi = sec.ediContainers || {};
    let hit = 0;
    for (const [cn, t] of Object.entries(tw)) {
      //  ⚠ **실은 것만 본다** — `computeTermApply`(위 51행)와 같은 게이트다.
      //    시각(at)이 없는 행은 Booking(아직 안 실린 예약)이고, 그것에 자리를 붙이면
      //    화면·인쇄물은 물론 **선사로 나가는 선적 EDI 회신**(loadingEdiExport)까지
      //    «안 실은 컨»을 실렸다고 말한다(검수사 «선적확인이 눌려야 실물이 실린거란 말입니다» 2026-08-31).
      if (!t || !t.at) continue;
      const pos = parseCatosPos(t.pos);
      if (!pos) continue;
      //  ⚠ 3.20-05: **작업 리스트에 없는 컨에는 행을 만들지 않는다.** 터미널 실적에는 시프팅(재적부)·
      //    통과화물이 같이 온다 — 실측 MCAP 634N 양하, 실적 326건 중 **96건이 양하 리스트 밖 시프팅**이다.
      //    그런 컨에도 자리 행을 만들면 ①리스트 대수가 230 → 326 으로 부풀고(화면 «총 작업 422 = 리스트
      //    326 + 쉬프팅 96» — 시프팅을 두 번 셌다) ②새로 만든 행에는 `cn` 이 없어, 화면이
      //    `merged[r.cn]` 으로 담을 때 96 건이 전부 `merged[undefined]` **한 칸**에 덮어써진다.
      //    마지막 한 건만 살아남아 **컨번호 없는 유령 한 줄**이 서고(실측 26-01-88 · 규격·풀엠티도 없어
      //    «⚠기타 ISO · ?미정»), 완료 도장은 컨번호로 찍히니 그 줄은 **영영 «미완 1»** 이었다.
      //    검수사 2026-09-06 «선적 시프팅 리스트에 옮기셨으면 양하 리스트에서 지워 주셔야 됩니다».
      //    ⇒ 리스트(records)에도 EDI 에도 없는 컨은 건너뛴다. 자리는 `termWork` 원본에 그대로 있고,
      //      시프팅은 제 경로(`computeShiftingFromVoyage` + `fullEdiMap` 계획 좌표)로 그려진다.
      const _r0 = recs[cn];
      if (!_r0 && !_edi[cn]) continue;
      const r = _r0 || {};
      //  우리 앱으로 이미 찍어 둔 실적 자리가 있으면 그대로 둔다(창고 표식 `__` 포함).
      if (r.bay_actual !== undefined && r.bay_actual !== null && String(r.bay_actual) !== '') continue;
      //  ⚠ **검수사가 지운 자리는 되살리지 않는다.** `fbClearActualPosition` 은 `bay_actual: null` 로
      //    지우는데 RTDB 에서 null 은 키 삭제라, 「비었다」와 「지웠다」가 겉으로 같아진다.
      //    그 함수가 남기는 `moves` 마지막 줄(`why:'cancel'`)이 둘을 가른다 —
      //    그것이 있으면 CATOS 로 다시 채우지 않는다(지워도 되살아나면 지울 방법이 없어진다).
      const mv = Array.isArray(r.moves) ? r.moves : [];
      if (mv.length && mv[mv.length - 1] && mv[mv.length - 1].why === 'cancel') continue;
      //  ⚠ 3.20-05: `cn` 을 반드시 박는다 — EDI 에는 있는데 리스트에 아직 없는 컨은 여기서 행이
      //    처음 생기므로, 안 박으면 위와 같은 «컨번호 없는 행»이 된다(§4-4 — 판정이 한 벌이어야 한다).
      recs[cn] = { ...r, cn, bay_actual: pos.bay, row_actual: pos.row, tier_actual: pos.tier,
                   _pos_src: (String(t.src || '') === 'pnct' ? 'pnct' : 'catos'), actual_at: t.at, actual_by: r.actual_by || '' };   // 3.16-01: 동방 자리를 «카토스»라 적지 않는다(수집기 2.26 부터 동방도 pos 를 준다)   // 3.16: 기록자 자리에도 업체 글자를 넣지 않는다(_pos_src 가 출처를 말한다)
      hit++;
    }
    if (hit) { out[mode] = { ...sec, records: recs }; touched = true; }
  }
  return touched ? out : voyage;
}

//  ★ 4.55-03 — **양하에서 먼저 나온 컨의 실제 칸을 «내린 순서»로 추정한다**(메모리에만 · `_pos_src:'infer'`). 검수사 2026-10-28 NSFR 2620N 16번 베이 —
//    «5128자리에 다른것이 있으면 5128은 그 다른컨의 자리로 가야합니다. 안가고 있으니 계속 5128을 찾는것입니다» · «카토스에서는 위치를 읽으면 항상 EDI랑 같습니다. 카토스에서 내린순서를 봐야 합니다».
//    왜 필요한가 — 양하는 터미널이 칸을 안 준다(카토스 cellPosition 은 EDI 계획 칸 그대로 · 수집기도 양하 자리는 버린다). 맞바꿈(applyAutoSwap)은 실제 칸이 있어야 도는데
//    수집기가 올린 완료(src:'term')에는 칸이 없어서, 아래 단 컨이 먼저 나와도 앱은 위 단 컨(5128)을 계속 기다렸다.
//    규칙(쌓는 규칙) — 같은 베이·같은 열·같은 데크/홀드 묶음은 위에서부터 한 대씩 내린다. 그 묶음에서 n 번째로 완료된 컨은 n 번째로 높은 칸에서 나온 것이다.
//    계획 칸과 다르면 그 칸을 실제 칸으로 적는다 → applyAutoSwap 이 밀려난 컨을 비운 칸으로 보낸다. 완료 시각이 같으면 높은 단이 먼저다(순서를 지어내지 않는다).
//    ⚠ 사람이 찍은 실제 칸(`_pos_src` 없는 bay_actual)은 안 덮는다 — 그 칸은 비운 것으로 치고 나머지로 센다. 같은 단 안의 맞바꿈은 증거가 없어 못 잡는다.
//    ⚠ 이 값은 «추정»이다 — RTDB 에 쓰지 않는다(stripCatosPos 가 `_pos_src` 로 벗긴다). 상세 화면은 터미널 반영 칸과 같은 모양으로 그린다(`_pos_src:'infer'` 로 구별).
export function inferDischargePos(voyage) {
  const sec = voyage && typeof voyage === 'object' ? voyage.discharge : null;
  if (!sec || typeof sec !== 'object' || !sec.ediContainers || !sec.completed) return voyage;
  const edi = sec.ediContainers; const comp = sec.completed; const recs0 = sec.records || {};
  const pad2 = (v) => String(v ?? '').padStart(2, '0');
  const known = (cn) => { const r = recs0[cn]; return !!(r && r.bay_actual != null && r.bay_actual !== '' && r._pos_src !== 'infer'); };   // 사람이 찍은 칸 · 터미널이 준 실측 칸(catos·pnct) — 추정은 이것을 덮지 않는다(감사 2차)
  const stacks = {};
  for (const [cn, e] of Object.entries(edi)) {
    if (!e || e.isBooking || e.bay == null || e.bay === '' || e.row == null || e.row === '' || e.tier == null || e.tier === '') continue;
    const tier = parseInt(e.tier, 10); const bay = parseInt(e.bay, 10);
    if (!Number.isFinite(tier) || !Number.isFinite(bay)) continue;
    const sk = `${bay}_${pad2(e.row)}_${tier >= 80 ? 'D' : 'H'}`;
    (stacks[sk] = stacks[sk] || []).push({ cn, bay, row: pad2(e.row), tier, at: (comp[cn] && comp[cn].at) || 0 });
  }
  let recs = null;
  for (const members of Object.values(stacks)) {
    if (members.length < 2) continue;
    const claimed = new Set();                                   // 사람이 찍은 칸이 이 묶음 안이면 그 칸은 이미 찼다
    for (const m of members) {
      if (!known(m.cn)) continue;
      const r = recs0[m.cn]; claimed.add(`${parseInt(r.bay_actual, 10)}_${pad2(r.row_actual)}_${parseInt(r.tier_actual, 10)}`);
    }
    const slots = members.filter((m) => !claimed.has(`${m.bay}_${m.row}_${m.tier}`)).sort((a, b) => b.tier - a.tier);
    const done = members.filter((m) => m.at && !known(m.cn)).sort((a, b) => (a.at - b.at) || (b.tier - a.tier));
    if (!done.length || done.length > slots.length) continue;
    done.forEach((m, i) => {
      const s = slots[i];
      if (s.tier === m.tier) return;                            // 제 칸에서 나옴 — 바뀐 것 없음
      recs = recs || { ...recs0 };
      const r = recs[m.cn] || {};
      recs[m.cn] = { ...r, cn: m.cn, bay_actual: String(s.bay), row_actual: s.row, tier_actual: pad2(s.tier), _pos_src: 'infer', actual_at: m.at, actual_by: r.actual_by || '' };
    });
  }
  return recs ? { ...voyage, discharge: { ...sec, records: recs } } : voyage;
}

//  ★ 4.56: **양하 정확도** — EDI 계획 칸과 실제 내려온 순서가 얼마나 같은가(검수사 2026-10-29 «어느 항구에서 오는 화물이 제대로 선적안하는지» · «쉽게 포트별 정확도»).
//    같은 열(베이+줄+데크/홀드)에서 완료 순서로 칸을 추정(inferDischargePos)해 계획과 다른 컨을 센다. 같은 단 안의 바뀜은 시각으로 못 가려 실제는 이보다 낮거나 같다(하한).
//    판정 가능 = 완료 시각이 있고 ①같은 열에서 둘 이상 완료됐거나 ②사람이 찍은 칸이 있는 컨(계획과 같으면 «같음» · 다르면 «다름»). 터미널이 얹은 칸은 계획과 다를 때만 «다름» 으로 센다.
//    rows 는 콘앱이 넘기는 계획 행(EDI 가 없을 때) — 검수앱은 voyage.discharge.ediContainers 를 쓴다.
export function dischargeAccuracyOf(voyage, rows) {
  const sec = (voyage && voyage.discharge) || {};
  let edi = sec.ediContainers && Object.keys(sec.ediContainers).length ? sec.ediContainers : null;
  if (!edi) { edi = {}; for (const r of (rows || [])) { if (r && r.cn && r._mode !== 'loading' && !r._shift) edi[r.cn] = r; } }
  const comp = sec.completed || {};
  const recs0 = {};
  for (const [cn, r] of Object.entries(sec.records || {})) if (!(r && r._pos_src === 'infer')) recs0[cn] = r;   // 지난 추정은 걷고 새로 센다
  const out = inferDischargePos({ discharge: { ediContainers: edi, completed: comp, records: recs0 } });
  const recs = (out.discharge && out.discharge.records) || recs0;
  const pad2 = (v) => String(v ?? '').padStart(2, '0');
  const stackOf = (e) => { const t = parseInt(e.tier, 10); const b = parseInt(e.bay, 10); if (!Number.isFinite(t) || !Number.isFinite(b) || e.row == null || e.row === '') return ''; return `${b}_${pad2(e.row)}_${t >= 80 ? 'D' : 'H'}`; };
  const doneIn = {};
  for (const [cn, e] of Object.entries(edi)) { if (!e || e.isBooking || !(comp[cn] && comp[cn].at)) continue; const k = stackOf(e); if (k) doneIn[k] = (doneIn[k] || 0) + 1; }
  const polOf = (e) => String((e && e.pol) || '').toUpperCase().trim() || '미상';
  const by = {}; const diffStacks = new Set();
  let n = 0; let diff = 0;
  for (const [cn, e] of Object.entries(edi)) {
    if (!e || e.isBooking || !(comp[cn] && comp[cn].at)) continue;
    const k = stackOf(e); if (!k) continue;
    const r = recs[cn]; const has = r && r.bay_actual != null && r.bay_actual !== '' && !String(r.bay_actual).startsWith('__');
    let different = false;
    if (has && r._pos_src !== 'infer') {
      different = !(parseInt(r.bay_actual, 10) === parseInt(e.bay, 10) && pad2(r.row_actual) === pad2(e.row) && parseInt(r.tier_actual, 10) === parseInt(e.tier, 10));
      if (!different && r._pos_src) continue;   // 터미널이 계획 칸을 그대로 얹은 행은 순서 정보가 없다 — 사람이 찍은 칸이 계획과 같으면 «같음» 으로 센다(감사 4.56)
    } else {
      if (doneIn[k] < 2) continue;
      different = !!(r && r._pos_src === 'infer');
    }
    const pol = polOf(e);
    const b = by[pol] || (by[pol] = { pol, n: 0, diff: 0 });
    b.n += 1; n += 1;
    if (different) { b.diff += 1; diff += 1; diffStacks.add(k); }
  }
  const done = Object.keys(comp).filter((cn) => comp[cn] && comp[cn].at && edi[cn]).length;
  return { done, n, diff, same: n - diff, stacks: diffStacks.size, byPol: Object.values(by).sort((a, b) => b.n - a.n) };
}

//  4.56: 양하 터미널이 PCTC 인가 — 검수사 «PCTC 가 아니라면 동방입니다». PCTC 는 검수사 PDA 입력 순서, 동방은 터미널 시각 순서(참고값). 부두 → 선석 → 터미널 항차 하이픈(PCTC 만 쓴다) 순.
export function isPctcVoyage(info) {
  const inf = info || {};
  const p = String(voyagePierOf(inf) || '').toUpperCase();
  if (p) return p.includes('PCTC');
  return /-/.test(String(inf.termVoy || ''));
}

//  ★ 3.13: **밀려난 계획 컨은 비운 자리로 자동 맞교환** — 검수사 확정 2026-09-06 00:1x «밀려난 계획 컨을 어떻게 둘지 → 속성 같으면 비운 자리로 자동 맞교환» ·
//    «지금처럼 검은곳이나 흰곳이 있으면 안됩니다. 그리고 컨테이너가 겹쳐 있어도 안됩니다».
//    실측 DJCT 0224W 선적 60대 중 27대가 계획과 다른 자리(같은 해치 안 20ft 자리 바꿔 싣기). 실린 컨 A 가 B 의 계획 자리 S 에 앉으면
//    ①B 는 겹치지 않게 **A 가 비운 계획 자리 P** 로(A 가 앉은 자리의 주인이 또 다른 C 의 자리를 차지했으면 그 사슬 끝의 빈 자리로)
//    ②속성(규격 iso·F/E·POL·POD)이 같으면 그냥, 다르면 같은 자리로 보내되 `_assign_warn` 을 달아 ⚠ 로 보인다(겹침·구멍보다 낫다 — 검수사 원문)
//    ③빈 자리를 못 찾으면(초과 컨이 앉았거나 사슬이 끊김) 제 계획 칸에 ⊕ 로 남긴다 — 숨기지 않는다(검수사 «화면상에서 남은 컨 넘버를 확인 할수가 있어야»)
//    적는 자리는 «검수원이 정한 자리» `bay_assign`(2.94-04 — 실체보다 약하고 계획보다 세다)이고 **메모리에만**(applyCatosPos 와 같은 구독 자리) —
//    보관 직전 stripCatosPos 가 벗긴다. 사람이 이미 정한 자리(`assign_by` 가 사람)는 안 덮는다. 실림 판정은 종전대로 completed 뿐이다.
export function applyAutoSwap(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  let touched = false;
  const out = { ...voyage };
  const key = (b, r, t) => `${parseInt(b, 10)}_${String(r ?? '').padStart(2, '0')}_${String(t ?? '').padStart(2, '0')}`;
  const S = (v) => String(v ?? '').toUpperCase().trim();
  const sameAttr = (a, b) => S(a.iso) === S(b.iso) && S(a.fe) === S(b.fe) && S(a.pod) === S(b.pod) && S(a.pol) === S(b.pol);
  for (const mode of ['discharge', 'loading']) {
    const sec = voyage[mode];
    if (!sec || typeof sec !== 'object' || !sec.ediContainers) continue;
    const edi = sec.ediContainers; const recs = { ...(sec.records || {}) }; const comp = sec.completed || {};
    const plan = {};                       // cn → 계획 자리 키
    const planAt = {};                     // 계획 자리 키 → cn
    for (const [cn, e] of Object.entries(edi)) {
      if (!e || e.bay == null || e.bay === '' || e.tier == null || e.tier === '') continue;
      const k = key(e.bay, e.row, e.tier); plan[cn] = k; planAt[k] = cn;
    }
    const actual = {};                     // cn → 실제 자리 키(실적)
    for (const [cn, r] of Object.entries(recs)) {
      const ba = r && r.bay_actual;
      if (ba == null || ba === '' || String(ba).startsWith('__') || !r.row_actual || !r.tier_actual) continue;
      actual[cn] = key(ba, r.row_actual, r.tier_actual);
    }
    const isHuman = (r) => !!(r && (r.actual_by || (Array.isArray(r.moves) && r.moves.length)));   // 터미널 기록은 actual_by 가 비고 moves 가 없다(수집기가 올린 값에는 _pos_src 도 없다)
    const occupied = {};                   // 자리 키 → 실린 cn
    for (const [cn, k] of Object.entries(actual)) if (!isHuman(recs[cn])) occupied[k] = cn;
    for (const [cn, k] of Object.entries(actual)) if (isHuman(recs[cn])) occupied[k] = cn;     // 한 칸에 둘이면 사람이 찍은 쪽이 이긴다(키 순서에 안 흔들린다 — 감사 4.56-03)
    const takenOrphan = new Set(); let hitO = 0;
    //  ★ 4.56-03 — **이미 실린 컨이 계획에 없는 칸으로 나가 있으면, 사슬이 닫히는 빈 계획 칸으로 돌려놓는다**(메모리에만 · 터미널이 준 자리일 때만).
    //    검수사 2026-10-29 NSDC 2611S 30번 베이 «하나를 잘못찍건 위치를 제대로 바꾸었다면 빈자리는 생기지 않을것입니다» · «이 방법은 이미 진행되고 있을것입니다. 그게 안되고 있는 버그».
    //    뿌리 — 위 맞교환은 «안 실린 밀려난 컨»만 본다. 동방은 실린 4대가 한 칸씩 밀려 앉고(05→07→09→10-84 칸 주인) 끝의 한 대(TEMU6518190)가 계획에 없는 14-86-02 로 적혀,
    //    사슬 끝 10-84 가 영영 빈칸이 됐다(밀려난 «안 실린» 컨이 없어 위 맞교환이 0건). 동방 선내위치는 차량 적재 때 미리 붙인 값이라 틀릴 수 있다 — 틀린 값 하나가 빈칸과 한 칸 밀림을 만든다.
    //    규칙 — ①사람이 찍은 자리가 아니고(actual_by·moves 없음) ②그 칸이 EDI 어느 컨의 계획 칸도 아니며 ③제 계획 칸에서 시작해 «앉은 컨의 계획 칸»을 따라가 빈 계획 칸에 닿고 ④그 칸 주인과 규격·풀엠티·항구가 같으면
    //    그 칸으로 옮긴다. 원래 값은 `_swap_orig` 에 남긴다(stripCatosPos 가 되돌린다 · DB 에 안 쓴다).
    const humanKeys = new Set();           // 사람이 찍은 칸 — 터미널 값이 여기에 겹치면(한 칸 두 대) 사람 쪽이 이긴다
    for (const [cn, k] of Object.entries(actual)) if (isHuman(recs[cn])) humanKeys.add(k);
    for (const [X, rX] of (mode === 'loading' ? Object.entries({ ...recs }) : [])) {       // 선적만 — 양하는 4.55-03 추정이 따로 맡는다
      const kX = actual[X]; const eX = edi[X];
      if (!kX || !eX || !plan[X] || !(comp[X] && comp[X].at)) continue;
      if (planAt[kX] && !humanKeys.has(kX)) continue;                                                     // 계획 칸이고 사람과 안 겹치면 손대지 않는다
      if (isHuman(rX) || rX._swap_orig) continue;                                                         // 사람이 찍은 자리·이미 손댄 자리는 그대로
      let target = null; let A = occupied[plan[X]]; const seenX = new Set([X]);
      if (!A) {                                                                                          // 사슬 없이 제 계획 칸이 비었을 때는 같은 베이·같은 데크/홀드 안에서만 돌아간다(다른 베이·단 구분이 다르면 짐작하지 않는다)
        const [pb, , pt] = plan[X].split('_');
        if (parseInt(pb, 10) !== parseInt(kX.split('_')[0], 10) || (parseInt(pt, 10) >= 80) !== (parseInt(kX.split('_')[2], 10) >= 80)) continue;
        target = plan[X];
      }
      for (let i = 0; i < 64 && A && !seenX.has(A) && !target; i++) {
        seenX.add(A);
        const pA = plan[A]; if (!pA) break;
        if (!occupied[pA] && !takenOrphan.has(pA)) { target = pA; break; }
        A = occupied[pA];
      }
      if (!target || occupied[target] || takenOrphan.has(target)) continue;
      const Z = planAt[target]; if (Z && edi[Z] && !sameAttr(edi[Z], eX)) continue;                       // 속성이 다르면 앱이 짐작하지 않는다
      const [tb, tr, tt] = target.split('_');
      takenOrphan.add(target);
      recs[X] = { ...rX, bay_actual: String(parseInt(tb, 10)), row_actual: tr, tier_actual: tt,
                  _swap_orig: { bay: rX.bay_actual, row: rX.row_actual, tier: rX.tier_actual }, _swap_src: 'orphan' };
      if (occupied[kX] === X) delete occupied[kX]; occupied[target] = X; actual[X] = target; hitO++;
    }
    //  밀려난 컨 — 계획 자리를 남이 차지했고 자기는 아직 안 실림
    //  ★ 4.64-03 — **터미널이 «완료»만 주고 자리는 안 준 컨(완료만 있고 실적 자리 없음)도 계획 자리를 남이 차지했으면 밀려난 컨이다.**
    //    검수사 2026-11-05 19:41 «다른곳에 실려 비었다면 그곳에 있던 컨테이너가 와야 합니다 빈칸이 있을수 없습니다. 이또한 자리교환 원칙에 위반되기 때문입니다» ·
    //    19:38 «계획과 다르게 선적이 될때가 많습니다. 같은 포트일때 엠티는 언제든 바뀔수 있습니다».
    //    실측 SWMM 2611S — 34번 베이 계획 컨 5대가 10번 베이 88단으로 실리고(실적 자리 있음), 그 10번 베이 칸 주인 5대는 터미널 완료만 있고 자리가 없어
    //    «이미 실림» 으로 세어져 맞교환에서 빠졌다. 그래서 둘이 한 칸에 겹치고 34번 베이 88단 5칸(01·02·04·08·10)이 흰 빈 칸으로 남았다. 완료만 있는 쪽은 그 칸에 있을 수 없으니(남이 앉았다) 비운 자리로 보낸다.
    const displaced = Object.keys(plan).filter((cn) => !actual[cn] && occupied[plan[cn]] && occupied[plan[cn]] !== cn);
    if (!displaced.length) { if (hitO) { out[mode] = { ...sec, records: recs }; touched = true; } continue; }
    //  비운 자리 — 실린 컨의 계획 자리인데 아무도 안 앉음(실적 기준)
    const takenBySwap = new Set();
    const isFree = (k) => k && !occupied[k] && !takenBySwap.has(k);
    let hit = 0;
    for (const B of displaced) {
      const r = recs[B] || {};
      if (r.bay_assign && r.assign_by && r.assign_by !== 'auto') continue;   // 사람이 정한 자리는 그대로
      //  사슬 따라가기 — B 자리에 앉은 A → A 의 계획 자리(비었으면 끝, 또 누가 앉았으면 그 사람의 계획 자리로 …)
      let A = occupied[plan[B]]; let target = null; const seen = new Set();
      for (let i = 0; i < 64 && A && !seen.has(A); i++) {
        seen.add(A);
        const pA = plan[A]; if (!pA) break;            // 초과 컨(계획 없음) — 사슬 끊김
        if (isFree(pA)) { target = pA; break; }
        A = occupied[pA];
      }
      const firstA = occupied[plan[B]];
      if (target) {
        const [tb, tr, tt] = target.split('_'); takenBySwap.add(target);
        //  ★ 4.23-01 2차 — 견주는 상대는 **보내는 칸(target)의 계획 주인**이다(사슬이 하나면 종전과 같은 컨 firstA). 문구는 검수사 말로(감사 하-3) —
        //    «규격·풀엠티·항구가 다름 — 이 컨 45G1 풀 CNTAO · 그 칸 계획 42G1 풀 CNSHA». 이 표식이 있으면 앱은 자리를 정하지 않는다(firebase._markLoadedPos).
        const Z = planAt[target] || firstA;
        const feK = (x) => (S(x.fe) === 'E' ? '엠티' : S(x.fe) === 'F' ? '풀' : S(x.fe));
        const side = (x, y) => [S(isoShown(x.iso)), feK(x), S(x.pol) !== S(y.pol) ? `POL ${S(x.pol)}` : '', S(x.pod)].filter(Boolean).join(' ');   // 규격은 화면 글자(4.21 isoShown — 4530 → 45R1 · 450E → 45GE) · 견주기(sameAttr)는 종전 그대로
        const warn = (edi[Z] && edi[B] && !sameAttr(edi[Z], edi[B])) ? `규격·풀엠티·항구가 다름 — 이 컨 ${side(edi[B], edi[Z])} · 그 칸 계획 ${side(edi[Z], edi[B])}` : '';
        recs[B] = { ...r, bay_assign: String(parseInt(tb, 10)), row_assign: tr, tier_assign: tt, assign_by: 'auto', assign_at: (recs[firstA] && recs[firstA].actual_at) || Date.now(),
                    _assign_src: 'autoswap', _assign_from: plan[B], _assign_byCn: firstA, ...(warn ? { _assign_warn: warn } : {}) };
        if (recs[B].planTaken) delete recs[B].planTaken;
        hit++;
      }
      //  빈 자리를 못 찾으면(초과 컨이 앉았거나 사슬이 끊김) 그대로 둔다 — 제 계획 칸에 ⊕ 로 겹쳐 남는다.
      //  숨기지 않는다: 검수사 «이유는 화면상에서 남은 컨 넘버를 확인 할수가 있어야 해서 입니다».
    }
    if (hit || hitO) { out[mode] = { ...sec, records: recs }; touched = true; }
  }
  return touched ? out : voyage;
}

/** 보관(archive) 직전에 CATOS 덧칠을 벗긴다 — 메모리에만 얹은 값이 DB 에 영구히 박히지 않게.
 *
 *  ⚠ 왜 필요한가 — `applyCatosPos` 는 구독 콜백에서 **메모리에만** 얹는 것이 전제인데,
 *    `fbArchiveVoyageBeforeDelete` 가 그 덧칠본을 통째로 `set()` 한다(HomePage 의 1주일 자동 정리 포함).
 *    그대로 두면 «CATOS 가 채운 자리»가 보관본에서 «우리 앱으로 찍은 자리»가 되고, 되살리면
 *    이 함수의 게이트가 영영 건너뛰어 CATOS 가 나중에 고쳐도 못 고친다.
 *  ⚠ 3.20 — 벗기는 것은 **표식(`_pos_src`)이 붙은 것 전부**다(카토스·동방을 안 가린다. 3.16-01 이 'pnct' 를 더했는데
 *    여기가 'catos' 만 보고 있었다). 검수원이 찍은 자리에는 그 표식이 없으므로 손대지 않는다 —
 *    사람이 고치는 순간 `fbSetActualPosition` 이 표식을 걷기 때문이다(3.20).
 *    termWork 원본은 그대로 보관되므로 되살릴 때 다시 얹힌다(자료를 잃지 않는다).
 */
export function stripCatosPos(voyage) {
  if (!voyage || typeof voyage !== 'object') return voyage;
  let touched = false;
  const out = { ...voyage };
  for (const mode of ['discharge', 'loading']) {
    const sec = voyage[mode];
    if (!sec || typeof sec !== 'object' || !sec.records) continue;
    const recs = {};
    let hit = 0;
    for (const [cn, r0] of Object.entries(sec.records)) {
      let r = r0; let changed = false;
      //  3.13: 자동 맞교환 덧칠(`_assign_src:'autoswap'` · planTaken._src:'autoswap')도 메모리 것이라 벗긴다
      if (r && r._assign_src === 'autoswap') {
        const { bay_assign: _g1, row_assign: _g2, tier_assign: _g3, assign_by: _g4, assign_at: _g5, _assign_src: _g6, _assign_from: _g7, _assign_byCn: _g8, _assign_warn: _g9, ...rest } = r;
        r = rest; changed = true;
      }
      //  4.56-03: 계획에 없는 칸에서 사슬 칸으로 옮겨 둔 값(`_swap_orig`)은 터미널이 준 원래 칸으로 되돌린다 — 메모리 덧칠이 DB 에 굳지 않게.
      if (r && r._swap_orig) {
        const { _swap_orig: _o, _swap_src: _os, ...rest } = r;
        r = { ...rest, bay_actual: _o.bay, row_actual: _o.row, tier_actual: _o.tier }; changed = true;
      }
      //  3.20: 표식이 있으면 원천을 안 가리고 벗긴다 — 3.16-01 이 'pnct' 를 더했는데 여기가 'catos' 만 보고 있었다.
      //    안 벗기면 동방 자리가 보관본에 굳고, 되살린 뒤 사람이 그 컨 자리를 고치면 표식이 남아 시프팅이 그것을 터미널 것으로 오인한다.
      if (r && r._pos_src) {
        const { bay_actual: _b, row_actual: _r, tier_actual: _t, actual_at: _a, actual_by: _y,
                _pos_src: _s, ...rest } = r;
        r = rest; changed = true;
      }
      if (changed) {
        //  남는 것이 아무것도 없으면 그 컨은 원래 records 에 없던 것이다 — 통째로 뺀다.
        //  ⚠ 3.20-05: `cn` 은 «내용»이 아니다 — applyCatosPos 가 박아 주는 이름표라, 그것만 남았으면
        //    여전히 «원래 records 에 없던 것»이다. 안 빼면 보관본에 **컨번호만 있는 빈 행**이 굳는다.
        const _left = Object.keys(r).filter((k) => k !== 'cn');
        if (_left.length) recs[cn] = r;
        hit++;
      } else {
        recs[cn] = r0;
      }
    }
    if (hit) { out[mode] = { ...sec, records: recs }; touched = true; }
  }
  return touched ? out : voyage;
}

export function effectivePos(c) {
  if (!c) return { bay: '', row: '', tier: '', src: 'none', inStorage: false };
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const ba = s(c.bay_actual);
  if (ba.startsWith('__')) return { bay: '', row: '', tier: '', src: 'none', inStorage: true };
  if (ba && s(c.row_actual) && s(c.tier_actual)) {
    return { bay: ba, row: s(c.row_actual), tier: s(c.tier_actual), src: 'actual', inStorage: false };
  }
  // 2.94-04: 실체 다음은 «검수원이 정한 자리»다(실체보다 약하고 계획보다 세다).
  //   맞바꿈으로 새 자리를 받았는데 아직 안 실은 컨이 여기 해당한다 — 「자리 미정」이 아니다.
  const bg = s(c.bay_assign);
  if (bg && !bg.startsWith('__') && s(c.row_assign) && s(c.tier_assign)) {
    return { bay: bg, row: s(c.row_assign), tier: s(c.tier_assign), src: 'assign', inStorage: false };
  }
  //   _bay_planned 가 있으면 이미 상위에서 승격된 객체다 — 그 값(c.bay)이 곧 EDI 자리다.
  const eb = s(c._edi_bay !== undefined ? c._edi_bay : c.bay);
  if (eb) return { bay: eb, row: s(c._edi_row !== undefined ? c._edi_row : c.row),
                   tier: s(c._edi_tier !== undefined ? c._edi_tier : c.tier), src: 'edi', inStorage: false };
  return { bay: s(c.bay), row: s(c.row), tier: s(c.tier), src: s(c.bay) ? 'rec' : 'none', inStorage: false };
}

//  4.26-02 strict 판정 본체 — 베이플랜(BayPlan.pageMatrixRender → cargoPlanCore.buildBayGrid)이 그 칸을 그리는가. 둘 다 그려야 true(교집합 — 넓게 말하지 않는다).
//    ① 장: buildBayPagesFromSummary 에서 그 베이의 장(짝수 → even · 홀수 → odd). 어느 장에도 없는 베이(MCAP 08·12 …)는 null.
//    ② 그 장 격자: buildBayGrid(사전, 장 키) — 짝 장은 홀수 항목 칸으로 그린다(BayPlan 과 같다 · EDI 좌표 없이 — 사전만으로).
//    ③ 그 장의 실측 항목 하나(홀수 우선 · 추정이면 짝수)의 단별 칸: buildEmptyBayRenderData — 00열 포함·단마다 칸 수.
//    실측 항목이 없으면(둘 다 추정 — shipMatrixBuilder 가 빈 번호를 채운 것) null. 못 그리면 null. 그 밖은 false.
function _bayPlanDrawsCell(bayDef, bs, no, b, lbl, t) {
  let pages = null;
  try { pages = buildBayPagesFromSummary(bayDef) || []; } catch (x) { return null; }
  const pg = (b % 2 === 0) ? pages.find((p) => p.even === b) : pages.find((p) => p.odd === b);
  if (!pg) return null;
  const entOf = (n) => (n == null ? null : bs.find((x) => no(x) === n) || null);
  const _est = (x) => !!(x && (x.isEstimated || String(x.source || '') === '추정'));
  //  ③ 의 항목 — 장을 그리는 홀수 항목이 추정이면 짝수 항목(실측)으로 잰다(MCAP (34)35 장은 035 추정 · 034 edi). 둘 다 추정이거나 없으면 null.
  const drawE = [entOf(pg.odd), entOf(pg.even)].find((x) => x && !_est(x)) || null;
  if (!drawE) return null;
  const deck = t >= 80;
  const has = (rowsR) => {
    const tr = Array.isArray(rowsR) ? rowsR.find((x) => Number(x.tier) === t && !x.invisible) : null;
    return !!(tr && Array.isArray(tr.cells) && tr.cells.some((c) => c && c.active && String(c.rowLbl) === lbl));
  };
  let g = null, rd = null;
  try { g = buildBayGrid(bayDef, pg.bayKey, { posMap: new Map() }); } catch (x) { g = null; }
  try { rd = buildEmptyBayRenderData(drawE, String(drawE.bay || drawE.bayNo || b)); } catch (x) { rd = null; }
  if (!g || !rd) return null;
  return has(deck ? g.deckRows : g.holdRows) && has(deck ? rd.deckRows : rd.holdRows);
}

//  ★ 4.26-02 베이사전(정본 ship_bay_dict_v3) 칸 판정 한 벌 — 이 배 베이매트릭스에 있는 칸인가. 없으면 false, 사전이 그 베이를 모르면 null(판정 안 함).
//    본래 sheetPhoto.sheetSlotOk(3.58-05 기록지 사진)이었다 — 위치 지정 창의 «자료에 없는 자리» 물음도 같은 판정을 쓰려고 여기로 옮겼다(sheetPhoto 는 이것을 다시 내보낸다 — 기본 판정 그대로).
//    opts.strict(«자료에 없는 자리» 물음 전용 — 감사 상-1·재감사 둘): 그 칸을 **베이플랜이 그리는가**(_bayPlanDrawsCell — 장·짝 장·단별 칸·00열·사용불가 칸).
//      그리면 true, 아니면 false, 장이 없거나·추정 항목·못 그림이면 null. 물음(unknownSlotAskOf)은 true 일 때만 낮춰 묻고 false·null 은 종전 붉은 물음 그대로다
//      (2차 시뮬 — 사전 단별 칸 수가 실물보다 적은 배가 있어 «사전에 없다» 고 단정하지 않는다).
//      기본(사진 판독)은 종전대로 그 구역에서 가장 넓은 단의 칸 수 — 사진 쪽 판정은 바꾸지 않는다.
export function bayDictSlotOk(bayDef, bay, row, tier, opts = null) {
  const strict = !!(opts && opts.strict);
  const bs = bayDef && Array.isArray(bayDef.baysSummary) ? bayDef.baysSummary : null;
  if (!bs) return null;
  const b = parseInt(bay, 10), r = parseInt(row, 10), t = parseInt(tier, 10);
  if (!Number.isFinite(b) || !Number.isFinite(r) || !Number.isFinite(t)) return false;
  const no = (x) => parseInt(x && (x.bayNo || x.bay), 10);
  if (strict) return _bayPlanDrawsCell(bayDef, bs, no, b, String(r).padStart(2, '0'), t);   // 재감사 상-1: 베이플랜이 실제로 그리는 격자와 한 벌(옆 베이로 대신하지 않는다)
  const e = bs.find((x) => no(x) === b) || bs.find((x) => no(x) === b + 1) || bs.find((x) => no(x) === b - 1);
  if (!e) return null;
  const deck = t >= 80;
  const tiers = ((deck ? e.deckTiers : e.holdTiers) || []).map(Number).filter(Number.isFinite);
  if (!tiers.length) return null;   // 사전에 단 목록이 없으면 판정하지 않는다(막지 않는다)
  if (!tiers.includes(t)) return false;
  //  칸 수(deckCells·holdCells)는 00열을 뺀 수다(BayGridEditor·coneCargoPlan 과 같은 셈) — 열은 1..n, 00열은 따로.
  const cells = ((deck ? e.deckCells : e.holdCells) || []).map(Number).filter(Number.isFinite);
  const n = cells.length ? Math.max(...cells) : (Number(e.rowCount) || 0);
  if (!n) return null;
  const zf = deck ? e.deckHasZero : e.holdHasZero;
  const zero = zf !== undefined && zf !== null ? !!zf : !!e.hasZero;
  if (r === 0) return zero;
  return r >= 1 && r <= n;
}

//  ★ 4.26-02 그 배의 베이매트릭스 정본(보관소 사본 window.__fbShipBayDict — App 이 구독) 을 선박 약자로 꺼낸다. 없으면 null.
//    계열 대체(getShipBayDictData 의 series-substitute)를 쓰지 않는다 — 남의 배 사전으로 «있는 칸» 이라 말하면 안 된다(기록지 사진 SheetPhotoModal 과 같은 길).
export function bayDefOfShipCode(code) {
  try {
    const k = String(code || '').toUpperCase().replace(/\s+/g, '');
    const all = (k && typeof window !== 'undefined' && window.__fbShipBayDict) || null;
    const d = all ? all[k] : null;
    const bd = d ? (d.bayDef || d) : null;
    //  베이플랜(BayPlan dictBayDefObj)과 같은 꼴 — 사용자 사전 여부·선박 약자를 실어 buildBayGrid 가 같은 갈래로 그리게 한다
    return bd && Array.isArray(bd.baysSummary) ? { ...bd, _userOwned: isUserOwnedBayDict(d), code: (d && d.code) || bd.code || k } : null;
  } catch (e) { return null; }
}

//  ★ 4.26-02 «이 배 자료에 없는 자리» 물음 글 한 벌 — 위치 지정 창(PositionEditModal)과 수동 트윈 직접 입력(SearchPanel completeBoth)이 같이 쓴다.
//    칸 우주(buildSlotUniverse — 이번 항차 평택·시프팅 컨이 있었던 칸)에 없을 때 부른다. 베이매트릭스를 보아 말을 가른다.
//      · 사전 그림(앱이 그리는 베이)에 있는 칸 → «이번 항차 계획에 없는 칸» · 붉지 않음 · [이 칸에 저장] — 모의 작업 MCAP 641S 마감텔리 자리 34-08-88·06-05-86 이 사전엔 있는 칸인데
//        «분실 사고가 났던 경로 · 특수 적재 — 그래도 저장» 으로 막혔다.
//      · 그 밖(사전 그림에 없음 · 사전이 그 베이를 모름 · 추정 항목) → 1.56 문구 그대로 · 붉음(TBJU2326007 19-08-06 분실 실사고 경로)
export function unknownSlotAskOf({ lbl = '', bay, row, tier, rowsText = '', bayDef = null }) {
  const bb = String(parseInt(bay, 10));
  const r = String(row), t = String(tier);
  const who = lbl ? `${lbl} 컨 자리 ` : '';
  let ok = null;
  try { ok = bayDictSlotOk(bayDef, bb, r, t, { strict: true }); } catch (e) { ok = null; }   // 감사 상-1: 단마다 칸 수 · 추정 항목은 판정 안 함
  if (ok === true) {
    return {
      kind: 'planOff',
      title: '이번 항차 계획에 없는 칸입니다',
      message: `${who}B${bb} ${r}-${t} 는 이 배 베이매트릭스에 있는 칸입니다.\n이번 항차 평택 계획·실적에는 이 칸이 없습니다.\n마감텔리·통제실 지시로 실은 자리가 맞으면 저장하십시오.`,
      confirmLabel: '이 칸에 저장', danger: false,
    };
  }
  //  사전에 없다고 나와도(false) 단정하지 않는다 — 사전 단별 칸 수가 실물보다 적은 배가 있다(2차 시뮬 MCAP B11 홀드 02단 · PCSZ B03). 종전 1.56 물음 그대로.
  return {
    kind: 'unknown',
    title: '이 배 자료에 없는 자리입니다',
    message: `${who}B${bb} ${r}-${t} 는 이 배의 알려진 칸에 없습니다.\n(B${bb}에 있는 열: ${rowsText || '없음'})\n분실 사고가 났던 경로입니다 — 시프팅·특수 적재가 확실할 때만 계속하세요.`,
    confirmLabel: '특수 적재 — 그래도 저장', danger: true,
  };
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

//  ★ 4.23-01 — **«한 칸에 두 대» 판정 한 벌**(마감 점검 WorkClosingChecklist · 항차 요약 카드 VoyageSummaryCard 가 같이 부른다 — 종전엔 같은 코드가 두 곳에 따로 있었다).
//    칸을 주장하는 것은 실린 컨(isDone)뿐이고 자리는 effectivePos 한 벌(실자리 → 정해 준 자리 → 계획). 창고는 자리 없음. 칸 글자는 종전 그대로 'BB-RR-TT'(두 자리).
//    ⚠ 실린 자리 기록이 없는 완료(수석 «터미널 스냅샷 적용» src:'term' · 자리 없이 완료 · 실자리를 지운 컨)는 계획 칸으로 **추정**될 뿐이다 —
//      검수사 2.94-06 «선적확인이 눌려야 실물이 실린거란 말입니다» · 2.80 «확정은 실물이 실려야 확정이다 … 계획은 보여주는 것».
//      그 계획 칸에 실린 자리 기록이 있는 컨(실자리·정해 준 자리)이 있으면 실물 둘이 아니라 **«자리 없이 완료»**(unknown)이다 —
//      실측 보관본 MCAP 639N 선적 «한 칸에 두 대» 5곳이 전부 이 꼴이었다(김성일 실자리 대 자리 없이 반영된 4호기 PDA 4대 — 마감텔리로는 38번에 실림 · 02-03-88 실자리를 지운 컨).
//      기록이 둘 이상이거나, 기록 없이 추정만 둘 이상이면 종전대로 사고(dup)다. 자료는 고치지 않는다 — 판정·표시만이다.
//    반환 { dup: [[칸, [cn…]]], unknown: [[칸, { at: 자리 기록이 있는 cn, cns: [추정 cn…] }]], bundle: [[칸, [cn…]]] } — bundle 은 4.54: 같은 선사·항구·규격의 빈 플랫랙만 모인 칸(사고 아님). 셋째 인자 bundleKeyOf(c) 를 넘길 때만 가른다.
export function loadedSlotClaims(containers, isDone, bundleKeyOf) {
  const p2d = (x) => String(x ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
  const claim = new Map();
  for (const c of (containers || [])) {
    if (!c || !isDone(c)) continue;                  // 안 실린 컨은 자리를 주장하지 않는다
    const p = effectivePos(c);
    if (p.inStorage) continue;                       // 임시창고 = 자리 없음
    if (!p.bay || !p.tier) continue;
    const k = `${p2d(p.bay)}-${p2d(p.row)}-${p2d(p.tier)}`;
    if (k.startsWith('00-')) continue;
    const real = p.src === 'actual' || p.src === 'assign';
    const v = claim.get(k) || { cns: [], real: [], guess: [], keys: [] };
    v.cns.push(c.cn); (real ? v.real : v.guess).push(c.cn);
    v.keys.push(typeof bundleKeyOf === 'function' ? bundleKeyOf(c) : '');
    claim.set(k, v);
  }
  const dup = [], unknown = [], bundle = [];
  for (const [k, v] of claim) {
    if (v.cns.length < 2) continue;
    //  ★ 4.54 — 같은 선사·항구·규격의 빈 플랫랙만 한 칸에 모인 것은 사고가 아니라 «묶음»(터미널·수석 Final Work 는 1대로 센다)이다 — 빨강이 아니다.
    //    검수사 2026-10-26 19:14 «4개 한묶음 2개로 그래야 양쪽 갯수가 맞는거고 알림을 붉은색으로 보여줄 필요도 없는것입니다». 묶음 판정은 호출부가 넘긴 bundleKeyOf(tallyReport 한 벌) —
    //    안 넘기면 종전 그대로. 칸에 묶음 아닌 컨이 하나라도 섞이면(키가 다르거나 빔) 종전대로 사고다.
    if (typeof bundleKeyOf === 'function' && v.keys.every((x) => x && x === v.keys[0])) { bundle.push([k, v.cns]); continue; }
    if (v.real.length === 1) unknown.push([k, { at: v.real[0], cns: v.guess }]);
    else dup.push([k, v.cns]);
  }
  return { dup, unknown, bundle };
}

//  ★ 4.23-01 2차 — **«선적확인 한 번에 저장될 자리» 한 벌**(보이는 자리 = 저장되는 자리). 자동 가이드 카드·큰 카드·컨 상세·리스트가 같은 자리를 같은 낱말로 말한다.
//    차례는 저장(firebase._markLoadedPos)과 같다 — 실자리 → 정해 준 자리(사람) → 맞교환 자리(3.13 자동, 규격·풀엠티·항구 같음) → 계획.
//    규격·풀엠티·항구가 다른 맞교환(`_assign_warn`)은 앱이 자리를 정하지 않는다 — 저장도 안 한다(자리 없이 완료). 3.13 원문 «속성 같으면 비운 자리로 자동 맞교환».
//    반환 { kind: 'actual'|'assign'|'swap'|'swapWarn'|'plan'|'none', pos: 'BB-RR-TT'(저장될 자리 · swapWarn 은 앱이 짐작한 칸), plan: 'BB-RR-TT', byCn, warn, inStorage }
export function loadingSlotOf(c) {
  const out = { kind: 'none', pos: '', plan: '', byCn: '', warn: '', inStorage: false };
  if (!c) return out;
  const f = (b, r, t) => {
    const s = (v) => (v === undefined || v === null ? '' : String(v));
    if (!s(b) || s(b).startsWith('__')) return '';
    const n = parseInt(b, 10);
    return `${Number.isFinite(n) ? String(n).padStart(2, '0') : s(b)}-${s(r).padStart(2, '0')}-${s(t).padStart(2, '0')}`;
  };
  const p = effectivePos(c);
  out.inStorage = !!p.inStorage;
  //  계획 — 맞교환이면 그 컨이 떠난 계획 칸(_assign_from «18_05_82»), 아니면 상위가 남긴 계획(_bay_planned·_edi_bay) → 그대로의 c.bay
  const from = String(c._assign_from || '').split('_');
  out.plan = from.length === 3 && from[0] ? f(from[0], from[1], from[2])
    : (c._bay_planned !== undefined && c._bay_planned !== '' ? f(c._bay_planned, c._row_planned, c._tier_planned)
      : (c._edi_bay !== undefined && c._edi_bay !== '' ? f(c._edi_bay, c._edi_row, c._edi_tier) : (p.src === 'assign' ? '' : f(c.bay, c.row, c.tier))));
  if (p.inStorage || !p.bay) return out;
  out.pos = f(p.bay, p.row, p.tier);
  if (p.src === 'actual') { out.kind = 'actual'; return out; }
  if (p.src === 'assign') {
    //  3.13 자동 맞교환 표식 — `_assign_src:'autoswap'`, 또는 `assign_by:'auto'`(항차 화면 베이 그림 목록은 _assign_src 를 안 실어 온다 — 2차 시뮬 paths2 O2 bay 실측)
    const auto = String(c._assign_src || '') === 'autoswap' || String(c.assign_by || '') === 'auto';
    out.byCn = auto ? String(c._assign_byCn || '') : '';
    out.warn = auto ? String(c._assign_warn || '') : '';
    out.kind = auto ? (out.warn ? 'swapWarn' : 'swap') : 'assign';
    return out;
  }
  out.kind = 'plan';
  return out;
}

//  ★ 4.23-01 3차(재감사 중-2) — **선적에서 아직 안 실린 컨이 맞교환 자리(3.13 — 계획 칸을 남이 차지해 옮겨 보이는 자리)인가** 한 벌.
//    이 컨은 트윈 짝을 칸으로 짐작하지 않는다 — 그 칸 옆 계획 주인은 같은 트윈으로 오는 컨이 아니다(2차 시뮬 OBWH 0468 거짓 완료).
//    트윈 조회·수동 트윈(SearchPanel)·자동 가이드(GuidedWorkPanel)·미르 다음 차례(mir.js)가 같이 부른다(종전 SearchPanel 안에만 있었다).
export function isSwapSlot(x) { return !!x && x._mode === 'loading' && !x._comp && ['swap', 'swapWarn'].includes(loadingSlotOf(x).kind); }
//  ★ 4.23-01 3차(재감사 중-1) — **사람에게 말하는 자리 한 벌.** 규격·풀엠티·항구가 다른 맞교환(loadingSlotOf kind 'swapWarn')은 화면
//    (자동 가이드·큰 카드·리스트·상세)이 «자리 미정»이다 — 미르의 말(머리줄 entityHead · «XXXX 어디» 목록 · 특수화물·무게 줄 …)도 같은 말을 한다.
//    앱이 짐작한 칸은 괄호로만. 그 밖은 fmtPos 그대로(RZOR 도면 말 포함). 양하·덱플랜 좌표 컨은 건드리지 않는다.
export function swapWarnWordOf(c) {
  if (!c || c._mode === 'discharge' || c.deckPos) return '';
  const ls = loadingSlotOf(c);
  return ls.kind === 'swapWarn' ? `자리 미정(앱 짐작 ${ls.pos}${ls.plan ? ` · 계획 ${ls.plan}` : ''})` : '';
}
export function posWordOf(c) { return swapWarnWordOf(c) || fmtPos(c); }
//  자동 가이드·미르의 트윈 묶기(buildGuidedQueue 의 findTwin) — 앞 컨이나 찾은 짝이 맞교환 자리면 묶지 않는다(트윈 조회 autoMate 와 같은 규칙).
export function guideTwinOf(findFn) {
  return (t, all, used) => { if (isSwapSlot(t)) return null; const m = findFn(t, all, used); return m && !isSwapSlot(m) ? m : null; };
}

//  ★ 4.23-01 2차 — 목록 줄(리스트 탭 containersBase)처럼 «정해 준 자리» 칸을 안 들고 온 컨에 그 항차 기록(구독 — 3.13 맞교환은 메모리에만 있다)의 자리 칸을 얹는다.
//    얹기만 한다 — c.bay(계획)는 그대로라 목록·통계·인쇄의 기준은 안 바뀐다. 화면 말(loadingSlotOf)과 완료 전 물음(loadingNoPosAsk)만 이것을 본다.
const _ASSIGN_KEYS = ['bay_assign', 'row_assign', 'tier_assign', 'assign_by', 'assign_at', '_assign_src', '_assign_from', '_assign_byCn', '_assign_warn'];
export function withAssignOf(c, recs) {
  if (!c || !c.cn || c.bay_assign) return c;
  const r = recs && recs[c.cn];
  if (!r || !r.bay_assign) return c;
  const o = { ...c };
  for (const k of _ASSIGN_KEYS) if (r[k] !== undefined && r[k] !== null && r[k] !== '') o[k] = r[k];
  return o;
}

/** 위치 키 — 베이는 정수 정규화("038"→"38"). 자리가 없으면 '' */
export function posKey(c) {
  const p = effectivePos(c);
  if (!p.bay || !p.row || !p.tier) return '';
  const n = parseInt(p.bay, 10);
  return `${Number.isFinite(n) ? n : p.bay}/${p.row}/${p.tier}`;
}

//  ★ X-RAY 봉인자 — «그 컨을 마지막으로 손댄 사람» (검수사 확정 2026-08-25)
//    검수사 원문 — *«봉인번호 저장과 양하완료 버튼이 2개가 있어 봉인자를 저절로 수정할수 있습니다.
//    같은 검수사가 아니라면»* · *«실제 현장에서 입력한 사람이 틀리면 그때 바꿔 주면돼»*
//
//    ⚠ 이 판정은 **여기 한 벌뿐이다.** XrayTab 이 부르고 그 결과가 인쇄물·CSV 로 그대로 간다.
//      화면과 인쇄가 각자 계산하면 반드시 갈린다(1.28-01 이 그 형태였다).
//
//    규칙 — 완료 시각과 봉인자 기록 시각을 견줘 **나중 것이 이긴다.**
//      · sealerAt 이 있으면(사람이 한 번이라도 등록·해제·정정했으면) **완료자 폴백을 쓰지 않는다.**
//        안 그러면 「봉인자 등록」을 해제해도 완료자가 다시 새어 들어와
//        «봉인을 뗐는데 이름이 남는» 일이 생긴다(2.39 시뮬 S8 에서 잡았다).
//      · sealerAt 이 없으면(2.39 이전 자료) 종전대로 완료자를 쓴다 — 과거 항차 출력물이 안 변한다.
//  ★ 4.88 — **X-RAY 실번호 점검 한 벌** (검수사 확정 2026-11-12 «XRAY실은 항상 6자리 입니다. 중복과 앞자리 세자리가 틀릴때만 찾아 주시면 됩니다.
//    앰티실 처럼 앞자리 세자리는 같고 뒷자리 세자리만 틀린것들이 대부분입니다.»).
//    X-RAY 실은 한 묶음(같은 봉투)에서 차례로 나오므로 뒤 세 자리가 다른 것은 정상이다. 알리는 것은 셋뿐이다 —
//      ① 중복 — 같은 실번호가 두 컨 이상 ② 앞 세 자리 — 같은 항차 X-RAY 실(6자리)의 다수와 앞 세 자리가 다른 실(다수가 둘 이상 같은 수로 갈리면 고르지 않는다)
//      ③ 자릿수 — 6자리 숫자가 아닌 실(«자릿수 확인» 한 줄).
//    종전 컨 상세·컨 목록은 처음 적은 값(seal_orig)과 지금 값을 글자 그대로 견주어 고친 실마다 «실오류»를 띄웠다 — 이제 그 자리도 이 함수만 본다.
//    입력 seals — xraySeals 꼴 { 컨번호: { seal } } 또는 [{ cn, seal }]. 빈 실은 뺀다. 돌려주는 값은 화면·미르·콘앱이 같이 쓴다.
export function xraySealCheckOf(seals) {
  const list = (Array.isArray(seals) ? seals : Object.entries(seals || {}).map(([cn, v]) => ({ cn, seal: v && typeof v === 'object' ? v.seal : v })))
    .map((x) => ({ cn: String((x && x.cn) || ''), seal: normSeal(x && x.seal) }))
    .filter((x) => x.cn && x.seal);
  const byNo = new Map();
  for (const x of list) { if (!byNo.has(x.seal)) byNo.set(x.seal, []); byNo.get(x.seal).push(x.cn); }
  const dup = [...byNo.entries()].filter(([, cns]) => cns.length > 1).map(([seal, cns]) => ({ seal, cns: [...cns].sort() }));
  const six = list.filter((x) => /^\d{6}$/.test(x.seal));
  const cnt = new Map();
  for (const x of six) cnt.set(x.seal.slice(0, 3), (cnt.get(x.seal.slice(0, 3)) || 0) + 1);
  const ranked = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  const major = ranked.length && ranked[0][1] >= 2 && !(ranked[1] && ranked[1][1] === ranked[0][1]) ? ranked[0][0] : '';
  const prefix = major ? six.filter((x) => x.seal.slice(0, 3) !== major).map((x) => ({ cn: x.cn, seal: x.seal, major })) : [];
  const digits = list.filter((x) => !/^\d{6}$/.test(x.seal)).map((x) => ({ cn: x.cn, seal: x.seal }));
  const byCn = {};
  const put = (cn) => (byCn[cn] = byCn[cn] || { dup: [], prefix: false, digits: false, why: [] });
  for (const d of dup) for (const cn of d.cns) { const o = put(cn); o.dup = d.cns.filter((k) => k !== cn); o.why.push(`실번호 중복 — ${d.seal} 이 ${d.cns.length}대(${o.dup.map((k) => k.slice(-4)).join('·')})`); }
  for (const x of prefix) { const o = put(x.cn); o.prefix = true; o.why.push(`앞 세 자리 확인 — ${x.seal} (이 배 X-RAY 실 다수는 ${major}…)`); }
  for (const x of digits) { const o = put(x.cn); o.digits = true; o.why.push(`자릿수 확인 — ${x.seal} (X-RAY 실은 6자리)`); }
  for (const cn of Object.keys(byCn)) byCn[cn].text = byCn[cn].why.join(' · ');
  return { n: list.length, major, dup, prefix, digits, byCn, issues: Object.keys(byCn).length };
}
/** 미르·요약 줄 — 문제가 없으면 '' (4.88 · 한 벌). */
export function xraySealCheckLines(ck) {
  if (!ck || !ck.issues) return [];
  const out = [];
  for (const d of ck.dup) out.push(`실번호 중복 ${d.seal} — ${d.cns.join(' · ')}`);
  for (const x of ck.prefix) out.push(`앞 세 자리 확인 ${x.cn} ${x.seal} (다수 ${x.major}…)`);
  for (const x of ck.digits) out.push(`자릿수 확인 ${x.cn} ${x.seal} (6자리가 아님)`);
  return out;
}
export function xraySealerOf(xs, comp, info = null) {
  const compAt = (comp && comp.at) || 0;
  const sealerAt = (xs && xs.sealerAt) || 0;
  //  ★ 3.9 (검수사 2026-09-05): **터미널 표기는 봉인자가 아니다 — 그 글자가 서류에 들어가면 안 된다.**
  //    카토스 실적이 completed 에 그 표기로 들어오자(MailPilot 2.22~2.23-01) 아래 «완료자 = 봉인자» 규칙이 그것을 봉인자로 찍고
  //    «제출 가능»으로 셌다(실측 DJCT 0223E 3대). 그 자리는 **그 시각·그 호기의 근무자**(3.8 조 등록 `info.craneCrew`)다 —
  //    *«조등록이 그때 근무자입니다»*. 등록이 없으면 빈칸으로 둬 수기로 적게 한다 — *«그건 빈곳으로 놔두시면 됩니다.
  //    수기로 기록할수있게»*. 저장하지 않고 볼 때마다 계산하므로 «어제 야간조 1호기 누구»를 오늘 등록해도 어제 컨의 봉인자가
  //    그 자리에서 채워진다. 사람이 «봉인자 등록»/손입력한 것이 언제나 우선이다.
  const person = (by) => { const b = String(by || '').trim(); return b && !TERM_BY_RE.test(b) ? b : ''; };   // 3.16: 옛 행(접두 «터미널»)도 여기서 걸린다
  const human = person(comp && comp.by);                                                        // 앱으로 직접 양하완료를 누른 사람
  const inferred = () => (isTermApplied(comp) ? crewNameAt(info, compAt, comp.equip) : '');   // 3.16: 새 표식(src:'term')도 같이 본다   // 터미널 완료 → 조 등록 근무자
  if (sealerAt > 0) {
    if (compAt > sealerAt && human) return human;            // 2.39: 봉인자 등록 뒤 다른 사람이 양하완료 → 그 사람(현장에 선 사람)
    //  사람이 적은 봉인자가 우선. 비어 있으면(체크 해제) — 해제 뒤에 터미널 완료가 왔을 때만 조 근무자, 아니면 빈칸 존중.
    return ((xs && xs.sealer) || (compAt > sealerAt ? inferred() : '') || '');
  }
  //  sealerAt 이 없는 옛 모양 — 적힌 봉인자가 있으면 그것을 존중하고, 없으면 종전대로 완료자(사람일 때만) → 조 근무자.
  //  (2.39 이전에는 sealer 를 쓰는 코드가 없었으므로 실자료엔 이 조합이 없다. 방어용이다.)
  return ((xs && xs.sealer) || human || inferred() || '');
}

/* ══════════════════════════════════════════════════════════
   ★ 4.23 글자 두 모드 — «보통 / 크게» (검수사 2026-10-12 «수석들이 노안이 심한 사람이 많습니다. 두가지 모드로 했으면 합니다.»)
     밝기(applyBrightness)와 같은 꼴이다 — **기기마다 따로**(localStorage), 화면을 바꾸는 곳은 applyTextSize 한 곳뿐.
     실제 글자 값은 src/index.css 의 :root(보통) / :root[data-text="large"](크게) 가 정한다. 여기는 «지금 어느 모드인가»만 다룬다.
     보통 = 4.22-04 보다 한 단계(3xs 9→10 · 2xs 10→11 · xxs 11→12) · 크게 = 보통 +2px · 단추 48px.
     ⚠ 저장이 막혀도(사생활 창·저장 꺼짐) 화면은 바뀐다 — 그 세션만. 읽기가 막히면 보통.
   ══════════════════════════════════════════════════════════ */
SK.textSize = 'master_text_size_v1';
export const TEXT_STEPS = [
  { n: 1, label: '보통', hint: '기본 크기' },   // 4.23 2차: «지금 크기» 는 크게를 고른 뒤에 틀린 말이 된다
  { n: 2, label: '크게', hint: '노안 · 장갑' },
];
export function getTextSize() {
  return parseInt(_storage.get(SK.textSize), 10) === 2 ? 2 : 1;
}
export function applyTextSize(n) {
  const v = parseInt(n, 10) === 2 ? 2 : 1;
  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      if (v === 2) document.documentElement.setAttribute('data-text', 'large');
      else document.documentElement.removeAttribute('data-text');
    }
  } catch (e) { console.warn('[글자] 화면에 걸지 못했습니다.', e); }
  //  조용히 실패하지 않는다(3금지 ③) — 저장이 막혀도 화면은 이미 바뀌었고, 다음에 열면 보통으로 돌아간다는 것만 남긴다.
  if (!_storage.set(SK.textSize, String(v))) console.warn('[글자] 저장 실패 — 이번 세션만 적용됩니다.');
  return v;
}
//  이 화면이 글자 모드를 아는가 — 검수앱 CSS(index.css)의 --fs-sm 변수가 있어야 한다. 콘앱(cone.html)은 아직 글자 모드가 없다(4.23).
//  모르는 화면에서 «바꿨어요» 라고 하면 거짓말이 된다 — 그때는 할 수 없다고 말한다.
function _textModesHere() {
  try { return !!(typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--fs-sm').trim()); }
  catch (e) { return false; }
}
//  미르 «글자 크게 / 글자 보통» — runDeviceCmd 가 부른다(되돌릴 수 있는 기기 설정이라 밝기·소리와 같은 허용 범위).
//  4.23 2차: 인쇄물 글자(«인쇄 글자 작아» · «덱플랜 글자 크게»)는 모드와 무관하다 — 바꾸지 않고 그렇다고 말한다(콘앱도 같은 말).
function _runTextSizeCmd(cmd) {
  if (cmd.print) return '인쇄물은 글자 모드와 무관합니다. 출력 센터의 종이(검수 리스트·양하/선적 PLAN·덱플랜)는 정해진 규격 그대로 나가요. 화면 글자를 키우려면 «글자 크게» 하세요.';
  //  5.00: 3안(큰 글자 현장)은 글자 크기가 정해진 안이다 — 밝기 명령과 같은 길(검수앱·콘앱 같은 답 · getSkin 은 같은 기기 저장값을 읽는다)
  if (getSkin() === 3) return cmd.to === 1
    ? '지금은 «3안 큰 글자 현장» 화면이라 글자가 가장 큰 안이에요. 글자를 줄이려면 메뉴(⋮) › 화면 · 소리 · 글자 › 화면 고르기에서 «1안»이나 «2안»을 고르세요.'
    : '지금은 «3안 큰 글자 현장» 화면이라 글자가 이미 가장 커요.';
  if (!_textModesHere()) return '여기서는 글자 크기를 아직 못 바꿔요. 검수앱은 메뉴(⋮) › 화면 · 소리 · 글자에서 «크게»를 고르면 됩니다.';
  const cur = getTextSize();
  const next = cmd.to === 1 ? 1 : 2;
  if (next === cur) return next === 2 ? '이미 «크게»예요. 더 큰 단계는 없어요.' : '이미 «보통»이에요.';
  applyTextSize(next);
  return next === 2 ? '글자를 «크게»로 바꿨어요. 단추도 조금 커져요. 되돌리려면 «글자 보통» 하세요.'
                    : '글자를 «보통»으로 바꿨어요.';
}

//  4.23 2차: 글자 크기 조작은 **전송(엔터·질문 단추·음성) 때만** 한다 — 조회창·통합검색은 2.40-01 대로 밝기·소리를 치는 중에도 실행하지만,
//    글자는 입력칸까지 통째로 커져 치는 도중에 바뀌면 거슬린다. 두 검색 화면이 실행 전에 이것을 본다(떠 있는 미르는 원래 전송 때만).
export function deviceCmdWaitsForSubmit(cmd) {
  if (!cmd) return false;
  if (cmd.kind === 'text') return true;
  return cmd.kind === 'multi' && Array.isArray(cmd.cmds) && cmd.cmds.some((c) => c && c.kind === 'text');
}

/*  ★ 2.40 미르 조작 실행 — **여기 한 벌뿐이다.**
    통합검색·항차검색 두 화면이 이것을 부른다. 각자 계산하면 답이 갈린다.
    검수사 확정 — 미르가 만지는 것은 «화면 밝기와 볼륨 정도만». 둘 다 그 자리에서 되돌릴 수 있다. (4.23: 글자 보통·크게도 같은 성격이라 더했다.)
    ⚠ 되돌릴 수 없는 것(삭제·완료·업로드)은 절대 여기에 넣지 마라. */
import { getSkin, applySkin } from './skin.js';   // 5.00 화면 고르기 — 미르 밝기 명령이 같은 길로(순환 import 이지만 부르는 때에만 쓴다)
export function runDeviceCmd(cmd) {
  if (!cmd) return null;
  //  4.23 2차: «화면 밝게 하고 글자 크게» — 밝기·소리와 글자를 같이 시키면 차례로 하고 답을 잇는다(nlSearch 가 multi 로 준다)
  if (cmd.kind === 'multi') return (Array.isArray(cmd.cmds) ? cmd.cmds : []).filter((c) => c && c.kind !== 'multi').map((c) => runDeviceCmd(c)).filter(Boolean).join(' ') || null;
  if (cmd.kind === 'text') return _runTextSizeCmd(cmd);   // 4.23 글자 두 모드
  if (cmd.kind === 'bright') {
    //  5.00 화면 고르기 — 흰 바탕(밝기 4 «사무실»)은 2안이 맡는다. 미르도 같은 길로 간다: 4로 올리면 2안, 2안에서 내리면 1안의 그 단계.
    //    3안(큰 글자 현장)은 밝기가 정해진 안이라 바꾸지 않고 어디서 고르는지 말한다(되돌릴 수 있는 기기 설정 범위 그대로).
    const _sk = getSkin();
    if (_sk === 3 && !cmd.ask) return '지금은 «3안 큰 글자 현장»이라 밝기가 정해져 있어요. 흰 바탕이 필요하면 메뉴(⋮) › 화면 · 소리 · 글자에서 «2안 밝은 간결»을 고르세요.';
    const cur = _sk === 2 ? 4 : Math.min(3, getBrightness());
    if (cmd.ask) {
      const now = BRIGHT_STEPS.find((s) => s.n === cur);
      return `지금 «${now ? now.label : cur}»이에요. 밝게 할까요, 어둡게 할까요?`;
    }
    const next = cmd.to != null ? cmd.to : Math.max(1, Math.min(4, cur + (cmd.dir || 0)));
    const st = BRIGHT_STEPS.find((s) => s.n === next);
    if (next === cur) {
      return next === 4 ? '이미 제일 밝아요. 더 올릴 데가 없네요.'
           : next === 1 ? '이미 제일 어두워요.'
           : `이미 «${st ? st.label : next}»이에요.`;
    }
    applyBrightness(next);
    applySkin(next === 4 ? 2 : 1);   // 5.00: 4 = 2안(흰 바탕) · 1~3 = 1안의 그 단계
    return next === 4 ? '화면을 «사무실»(2안 밝은 간결 — 흰 바탕)으로 바꿨어요. 엑셀이랑 비슷한 밝기예요.'
      : `화면을 «${st ? st.label : next}»으로 바꿨어요.${_sk === 2 ? ' (1안 어두운 고대비)' : ''}`;
  }
  if (cmd.kind === 'volume') {
    const cur = getVolumeStep();
    const next = cmd.to === 'off' ? 0 : Math.max(0, Math.min(3, cur + (cmd.dir || 0)));
    const st = VOLUME_STEPS.find((s) => s.n === next);
    if (next === cur) return `이미 «${st ? st.label : next}»이에요.`;
    setVolumeStep(next);
    return next === 0 ? '소리를 껐어요. 다시 켜려면 «소리 켜줘» 하세요.'
                      : `소리를 «${st ? st.label : next}»으로 했어요.`;
  }
  return null;
}

/** 3.58-05: 선적 완료를 누른 컨에 **자리가 하나도 없으면**(계획·실제·정해 준 자리 모두 없음) 먼저 알린다.
 *  실측 XTPG 541E 2026-09-23 01:18 — 타항 시프팅 재선적 5대가 자리 없이 «선적 완료» 만 되어 베이 그림에 흰 칸으로 남았다.
 *  보관 항차 대조(XTPG 539E·540E) — 이런 완료는 0건이라 확인창이 평소 작업을 방해하지 않는다. 반환: 물을 문구 또는 ''. */
export function loadingNoPosAsk(c, mode) {
  if (!c || (mode || c._mode) !== 'loading') return '';
  //  리스트로만 들어온 컨(리스트 전용 선적 RZOR·OBWH 의 가상 선적, 자리 없는 엠티 리스트 등)은 원래 자리가 없다 — 묻지 않는다(감사 지적).
  if (c._virtualFromList || c._virtualEdi || c._src === 'list') return '';
  const has = (v) => v !== undefined && v !== null && String(v) !== '' && !String(v).startsWith('__');
  //  ★ 4.23-01 2차: 규격·풀엠티·항구가 다른 맞교환(3.13 _assign_warn)은 앱이 자리를 정하지 않는다 — 확인하면 자리 없이 완료된다(firebase._markLoadedPos).
  const ls = loadingSlotOf(c);
  if (ls.kind === 'swapWarn') {
    return `${String(c.cn || '').slice(-4) || '이 컨'} — 계획 칸 ${ls.plan || ''} 은 ${ls.byCn ? String(ls.byCn).slice(-4) + ' 이(가)' : '다른 컨이'} 차지했습니다.\n이 컨은 규격·풀엠티·항구가 달라 앱이 자리를 정하지 않습니다.\n(${ls.warn})\n\n이대로 확인하면 자리 없이 완료됩니다.\n[취소] 를 누르고 «위치 지정» 이나 «기록지 사진» 으로 실린 칸을 먼저 넣어 주세요.\n\n그래도 자리 없이 완료할까요?`;
  }
  if (has(c.bay) || has(c.bay_actual) || has(c.bay_assign)) return '';
  return `${String(c.cn || '').slice(-4) || '이 컨'} — 선적 자리가 없습니다.\n\n자리 없이 완료하면 베이 그림·콘앱에 나오지 않습니다.\n[취소] 를 누르고 «위치 지정» 이나 «기록지 사진» 으로 자리를 먼저 넣어 주세요.\n\n그래도 자리 없이 완료할까요?`;
}

// 4.30: 예보 «LO LO N»은 선적 예보일 때만 RZOR 선적 덱플랜의 크레인 대수로 쓴다(양하 예보가 선적 플랜을 흔들지 않게)
export function _foreLoloOf(voyage) {
  const f = voyage?.info?.forecast;
  if (!f || (f.mode || 'loading') !== 'loading' || !f.lolo) return { n: 0, full: 0 };
  return { n: Number(f.lolo.n) || 0, full: Number(f.lolo.full) || 0 };
}

/* ★ TallyOne 4.36 — 예상 실오류(씰 번호 모양). 검수사 2026-10-19 «선사마다 실번호 타입과 패턴이 있습니다. 그걸 학습해야 합니다» ·
   «알림은 자릿수 부족실 2 컨넘버랑 동일한 실 1» (MCAP 639N 마감텔리 실오류 보고서가 정답지).
   ① 선사(op)별로 리스트 씰의 «영문 접두 + 숫자 자릿수» 분포를 센다 — 그 선사 20개 이상 중 60% 이상이 한 모양이고 이 씰의 모양이 10% 미만이면 «자릿수·형식 다름».
   ② 씰의 숫자가 컨번호 숫자(끝 7자리)와 겹치면 «컨번호와 같은 씰» — 선사와 상관없다.
   이미 검수원이 고친 컨(sl ≠ sl_orig)은 뺀다. 반환: [{ cn, seal, kind:'shape'|'cn', why }]. 판정은 이 한 벌 — 주의 박스·미르·콘앱이 같이 쓴다. */
/** 4.39-02 — EDI 의 실번호 표(대문자 컨번호 → 실). sealFormatAnomalies 의 opts.edi 로 넘긴다(주의 박스·미르 한 벌). */
export function ediSealMapOf(ediContainers) {
  const out = {};
  for (const [k, c] of Object.entries(ediContainers || {})) {
    const cn = String((c && c.cn) || k || '').toUpperCase(); const sl = c && c.sl != null ? String(c.sl).trim() : '';
    if (cn && sl) out[cn] = sl;
  }
  return out;
}
export function sealFormatAnomalies(listRecords, opts = {}) {
  const minN = opts.minN || 20, dom = opts.share || 0.6, rare = opts.rare || 0.1;
  const recs = Object.entries(listRecords || {});
  const shapeOf = (s) => { const m = /^([A-Z]*)(\d+)$/.exec(s); return m ? { p: m[1], n: m[2].length } : null; };
  const seal0 = (r) => String((r && (r.sl_orig !== undefined ? r.sl_orig : r.sl)) || '').trim().toUpperCase().replace(/[\s\-]/g, '');
  const byOp = {};
  for (const [, r] of recs) {
    const s = seal0(r), sh = shapeOf(s);
    if (!s || !sh) continue;
    const op = String((r && r.op) || '').trim(); if (!op) continue;   // 선사 모르는 씰은 통계에 섞지 않는다
    const k = `${sh.p}|${sh.n}`;
    const o = byOp[op] || (byOp[op] = { n: 0, c: {}, z: {} });
    o.n += 1; o.c[k] = (o.c[k] || 0) + 1;
    if (/^[A-Z]*0/.test(s)) o.z[k] = (o.z[k] || 0) + 1;   // 4.87-02: 숫자가 0 으로 시작하는 실 수 — «앞자리 0 없음» 판정에 쓴다
  }
  const out = [];
  for (const [cn, r] of recs) {
    const s = seal0(r); if (!s) continue;
    if (!opts.includeFixed && ((_sealEdited(r) && r.sl && r.sl_orig && String(r.sl) !== String(r.sl_orig)) || isSealError({ ...r, cn }))) continue;   // 검수원이 이미 고침 · 4.49: 이미 실오류로 잡힌 컨(판정 한 벌 isSealError — 신고 끝자리 빠짐 MCAP 639N MNBU4491858)도 «예상» 이 아니다(시험에서만 includeFixed 로 포함)
    const cnU = String(cn || '').toUpperCase();
    const digits = s.replace(/\D/g, ''), body = cnU.replace(/^[A-Z]{4}/, '');
    if (digits.length >= 6 && body.length >= 6 && (body.indexOf(digits) >= 0 || digits.indexOf(body) >= 0)) {
      out.push({ cn: cnU, seal: s, kind: 'cn', why: '씰 숫자가 컨번호와 같음' }); continue;
    }
    const sh = shapeOf(s), o = byOp[String((r && r.op) || '').trim()];
    if (!sh || !o || o.n < minN) continue;
    const top = Object.entries(o.c).sort((a, b) => b[1] - a[1])[0];
    const [tp, tn] = top[0].split('|');
    //  4.45-02 — 같은 계열(같은 접두) 실끼리 본 자릿수 부족 — 아래 4.39-02 갈래와 같은 셈(첫 갈래가 먼저 잡아 continue 로 빠지면 이 셈을 못 탔다 —
    //    독립 감사 2026-10-24: TNJP 26344E 선적 CKFU9260210 «0825» 는 숫자 실 6자리 18/20 가운데 4자리 하나인데 «씰 모양 다름»(참고)으로 내려갔다).
    //    «0000»(실 없음 표기)은 자릿수 부족이 아니다. EDI 같은 실 예외는 4.39-02 갈래에만 건다(첫 갈래는 4.36 부터 EDI 를 안 봤다).
    const famShort = () => {
      if (/^0+$/.test(s)) return null;
      let fN = 0, fTop = 0, fLen = 0, fMine = 0;
      for (const [k, cnt] of Object.entries(o.c)) {
        const [kp, kn] = k.split('|');
        if (kp !== sh.p) continue;
        fN += cnt; if (cnt > fTop) { fTop = cnt; fLen = Number(kn); }
        if (Number(kn) === sh.n) fMine = cnt;
      }
      if (fN >= minN && fTop / fN >= dom && sh.n < fLen && fMine / fN < rare && fMine <= 3) return { fN, fTop, fLen };
      //  ★ 4.87-02 — 작은 계열·긴 쪽·앞자리 0 빠짐까지 «한두 대만 특이한 실».
      //    검수사 2026-11-11 04:45~04:52 «SWS01234567이 맞는실인데 리스트에는 SWS1234567 … 앱은 찾아내지 못했습니다» · «OBWH였습니다 SPSU6019568 44GP ZGJHC0617662»
      //      (실근거 OBWH 2787E 양하 — «ZGJHC+7자리» 다섯 대 가운데 SPSU6019568 만 «ZGJHC617662». 같은 계열이 여섯 대뿐이라 위 «20대 이상» 문턱에 걸려 못 잡았다).
      //    05:07~05:13 «실이 같은 모양인데 자리수가 틀린게 많았습니다. 알파벳+4자리 또는 +5자리 분간 하기 어렵습니다» · «저라도 판단하기 어려운 경우 … 4자리도 많았습니다» ·
      //      «미르나 앱이 알려줄것은 특이하게 한두개가 틀릴경우입니다. 예를 들면 다 +6 +7 자리인데 한두개가 5자리 아니면 8자리일때 , 다 앞에 0이 붙어 있는 실인데 빠져있는게 한 두개일때
      //       의심을 가져 볼만 합니다. 여러개 또는 다수가 그렇다면 정상 실로 볼수 있씁니다».
      //    같은 계열(같은 선사·같은 영문 접두, 4대부터 — 숫자뿐인 실은 종전 판정만)에서 세 대 이상인 자릿수는 «정상»(여러 개)이다. 정상 자릿수 실이 75% 이상이고
      //    그 밖의 실이 통틀어 두 대 이하일 때만, 정상에서 한두 자리 모자라거나 넘치는 실을 올린다. 0 으로 시작하는 실이 75% 이상인데 0 없이 시작하는 실이 두 대 이하면 그것도 올린다.
      if (!sh.p || fN < 4) return null;   // 숫자뿐인 실은 여러 계열(5·6·7·8·10자리)이 한 묶음에 섞여 «한두 대만 특이» 를 가릴 수 없다 — 보관 888장 전수에서 엉뚱한 알림이 대부분 여기서 났다. 종전 판정(위)만 쓴다.
      const lens = {}; let zAll = 0;
      for (const [k, cnt] of Object.entries(o.c)) { const [kp, kn] = k.split('|'); if (kp !== sh.p) continue; lens[kn] = cnt; zAll += (o.z[k] || 0); }
      const normal = Object.entries(lens).filter(([, cnt]) => cnt >= 3).map(([kn, cnt]) => [Number(kn), cnt]);
      const normalN = normal.reduce((a, [, cnt]) => a + cnt, 0);
      if (normalN >= 3 && normalN / fN >= 0.75 && fN - normalN <= 2 && (lens[sh.n] || 0) <= 2) {
        const near = normal.map(([kn]) => kn).sort((a, b) => Math.abs(a - sh.n) - Math.abs(b - sh.n) || a - b)[0];
        const d = sh.n - near;
        if (d !== 0 && Math.abs(d) <= 2) return { fN, fTop: normalN, fLen: near, word: d < 0 ? '자릿수 부족' : '자릿수 많음', desc: `${normal.map(([kn]) => kn).sort((a, b) => a - b).join('·')}자리가 ${Math.round(normalN * 100 / fN)}% (${normalN}/${fN})` };
      }
      if (!/^[A-Z]*0/.test(s) && zAll >= 3 && zAll / fN >= 0.75 && fN - zAll <= 2) return { fN, fTop: zAll, fLen: sh.n, word: '앞자리 0 없음', desc: `0 으로 시작하는 실이 ${Math.round(zAll * 100 / fN)}% (${zAll}/${fN})` };
      return null;
    };
    if (top[1] / o.n >= dom && `${sh.p}|${sh.n}` !== top[0] && (o.c[`${sh.p}|${sh.n}`] || 0) / o.n < rare) {
      const short1 = (sh.p === tp || (!!tp && sh.p.endsWith(tp))) && sh.n < Number(tn);
      const fam = short1 ? null : famShort();
      out.push({ cn: cnU, seal: s, kind: 'shape', short: short1 || !!fam, why: fam
        ? `${sh.p ? sh.p + '+' : '숫자 '}${sh.n}자리 — ${fam.word || '자릿수 부족'}(이 선사 ${sh.p ? sh.p + '+' : '숫자 '}실은 ${fam.desc || `${fam.fLen}자리가 ${Math.round(fam.fTop * 100 / fam.fN)}% (${fam.fTop}/${fam.fN})`})`
        : `${sh.p}+${sh.n}자리 — 이 선사는 ${tp}+${tn}자리가 ${Math.round(top[1] * 100 / o.n)}% (${top[1]}/${o.n})` });   // 4.39-02 short: 같은 접두(또는 접두 끝이 같은 — MCAP 639N «MLPH+6» ↔ «PH+7» 정답지)에서 숫자 자릿수만 모자람(검수사 «자릿수 부족실»). 접두가 다른 씰(다른 회사 씰 — DXQD «254784~8» ↔ «DWS+7», DJCF «SM+6» ↔ «NS+7»)은 short 가 아니다(재감사)
      continue;
    }
    //  ★ 4.39-02 — 선사 실이 두 모양 이상으로 갈려 한 모양이 60% 를 못 넘으면 위 판정이 아무것도 못 잡았다.
    //    검수사 2026-10-20 16:46 «같은 패턴실이 많았는데 그중 하나만 자릿수 부족 이상하다고 안봄» — ATPR 2646E SKR 은 «S+5자리» 123 · «숫자 6자리» 136 으로 갈려
    //    숫자 6자리 실 가운데 하나(HALU2331077 «00240», 실물 002403)만 5자리였다. 같은 접두(같은 패턴) 실끼리 보아 한 자릿수가 60% 이상인데
    //    이 실이 그보다 **짧고** 드물면(10% 미만 · 같은 모양이 3개 이하 — «하나만») «자릿수 부족». 긴 쪽은 다른 실 계열(0507xxx 7자리 5대 같은)이라 올리지 않는다(검수사 원칙 — 자릿수 부족만).
    //    «0000»(실 없음 표기)은 실이 아니다(dupSealMap 과 같은 예외). 같은 짧은 모양이 4개 이상이면 그 배의 다른 실 계열로 본다(보관 항차 ATRP 2628E 4자리 6대 연번).
    if (/^0+$/.test(s)) continue;
    //    EDI 실이 리스트 실과 같으면(선사 EDI·리스트 두 자료가 같은 짧은 실을 말함) 엑셀 0 잘림·옮겨 적기 실수가 아니라 그 선사의 다른 실 계열로 본다 —
    //    독립 감사 2026-10-20: 새로 잡히던 RZOR 27건(HTF «011xx»·«0219» · RZF «15xxx»)은 전부 EDI 실도 같았고 25건은 같은 배·선사 지난 항차에도 같은 모양이 있었다(1.85-03 «4자리 실도 있다»).
    //    ATPR 2646E HALU2331077 은 EDI 실이 비어 있어 그대로 잡는다. 판정은 이 새 갈래에만 건다(4.36 종전 판정은 그대로).
    const _es = opts.edi && opts.edi[cnU];
    if (_es && String(_es).trim().toUpperCase().replace(/[\s\-]/g, '') === s) continue;
    const fam = famShort();   // 4.45-02: 첫 갈래와 같은 셈 한 벌
    if (fam) {
      out.push({ cn: cnU, seal: s, kind: 'shape', short: true, why: `${sh.p ? sh.p + '+' : '숫자 '}${sh.n}자리 — ${fam.word || '자릿수 부족'}(이 선사 ${sh.p ? sh.p + '+' : '숫자 '}실은 ${fam.desc || `${fam.fLen}자리가 ${Math.round(fam.fTop * 100 / fam.fN)}% (${fam.fTop}/${fam.fN})`})` });
    }
  }
  return out;
}
