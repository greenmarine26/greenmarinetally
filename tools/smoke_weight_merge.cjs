// 무게 병합 연막검사 — **리스트의 «빈칸/0» 이 EDI 무게를 지우지 않는가.**
//
// 왜 있는가 (2026-08-25 밤, NSFR 2616N 양하를 앱에서 직접 진행하다 18번째 트윈에서 드러났다).
//   자동 가이드는 «합계 55.1t — 트윈 불가» 라고 붉게 막는데, 같은 두 컨이 양하 탭 리스트에서는
//   **무게 칸이 통째로 비어 있었다.** 미르도 «무게가 없어 트윈 하중을 못 잽니다» 라고 답했다.
//   원인 — `records.wt = 0` 이 `parseListWeightKg(0) → 0` 으로 EDI 27,600kg 을 덮고 있었다.
//   NSFR 은 140대 전부, 전 항차 합계 1,032대.
//
// ⚠ 규칙(1.23 «무게는 리스트가 기준», 검수사 확정 2026-08-07)은 **그대로다.**
//   그것은 «리스트에 값이 있을 때» 하는 말이다. 0kg 컨테이너는 없다 — 타레만 2톤이다.
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '..', 'src', 'pages', 'VoyagePage.jsx');
const src = fs.readFileSync(SRC, 'utf8');

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  ① 가드가 실제로 있는가 (문자열이 아니라 «양수일 때만 채택» 형태로)
const m = src.match(/if \(k === 'wt'\) \{([^}]*)\}/);
T(!!m, "`if (k === 'wt')` 분기를 못 찾았다 — 병합 코드가 옮겨졌나?");
if (m) {
  const body = m[1];
  T(/plausibleListWtKg/.test(body), '톤 보정·40톤 상한(plausibleListWtKg)이 사라졌다');   // 4.08-02: parseListWeightKg → plausibleListWtKg(컨 하나 40톤 초과는 무게 없음)
  T(/>\s*0/.test(body), '**양수 가드가 없다** — 리스트의 0 이 EDI 무게를 다시 지운다');
  T(!/safeR\.wt\s*=\s*parseListWeightKg\(v\)\s*;/.test(body), '가드 없이 그대로 대입하는 옛 줄이 남아 있다');
}

//  ①-b ★ 4.08-02 감사 지적 — 항차 화면 병합은 «EDI 있는 컨» 과 «리스트에만 있는 컨» 두 갈래다. 문지기가 앞 갈래에만 있으면 리스트 전용 컨의 232톤이 목록에 나온다.
T((src.match(/if \(k === 'wt'\) \{ const _w = plausibleListWtKg\(v\); if \(_w > 0\) safeR\.wt = _w; return; \}/g) || []).length >= 2, '항차 화면 병합의 두 갈래(EDI 있음 · 리스트 전용) 모두에 40톤 문지기가 있어야 한다');

//  ② 실제 병합 동작을 재현해 확인한다 — 위 분기와 같은 규칙을 그대로 옮겨 적는다.
//    ⚠ 픽스처 값은 실데이터에서 베껴 왔다(NSFR 2616N TEMU0105882: EDI 27600 · records 0).
const parseListWeightKg = (raw) => {
  const s = String(raw ?? '').replace(/[,\s]/g, '');
  if (!s) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 200 ? Math.round(n * 1000) : Math.round(n);
};
const mergeWt = (ediWt, listWt) => {
  const out = { wt: ediWt };
  const w = parseListWeightKg(listWt);
  if (w > 0) out.wt = w;
  return out.wt;
};
T(mergeWt(27600, 0) === 27600, '리스트 0 → EDI 무게가 살아야 한다 (실측 TEMU0105882)');
T(mergeWt(27600, '') === 27600, '리스트 빈칸 → EDI 무게가 살아야 한다');
T(mergeWt(27600, null) === 27600, '리스트 null → EDI 무게가 살아야 한다');
T(mergeWt(4000, 20385) === 20385, '리스트에 값이 있으면 리스트가 이긴다 (실측 TNJP CKFU9806127 — EDI 4t 오기입)');
T(mergeWt(27600, 27.6) === 27600, '톤 표기도 리스트가 이긴다 (200 미만은 톤으로 보정)');
T(mergeWt(0, 0) === 0, '둘 다 없으면 0 그대로 — 지어내지 않는다');
T(mergeWt(0, 12000) === 12000, 'EDI 가 없고 리스트만 있으면 리스트');

//  ③ ★ 2.52-04 — **인쇄 경로(PrintHubModal)도 같은 가드를 갖는가.**
//    2.52-03 은 VoyagePage 만 고쳤고 이 세 번째 병합 경로를 안 봤다. 다른 클로드에게 전수 감사를 시켜 찾았다.
//    나가는 곳이 대외 문서다 — VGM LIST 가 무게 칸에 «—» 를 찍고 미기재로 센다.
//    ⚠ 병합 경로가 다섯이다(SearchPanel · VoyagePage.containersBase · VoyagePage.allEdiContainersBase · PrintHubModal · mir.flattenVoyages).
//      새 경로를 만들거나 고칠 때는 **여기 검사를 같이 늘려라.**
const PH = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'PrintHubModal.jsx'), 'utf8');
T(/plausibleListWtKg/.test(PH), '인쇄 경로에 톤 보정이 없다');   // 4.08-02
const mph = PH.match(/if \(k === 'wt'\) \{([^}]*)\}/);
T(!!mph, "인쇄 경로에 `if (k === 'wt')` 가드가 없다 — 리스트의 0 이 EDI 무게를 덮는다(VGM LIST 가 비어 나간다)");
if (mph) T(/>\s*0/.test(mph[1]), '인쇄 경로 가드에 양수 조건이 없다');

//  ④ ★ 4.08-02 감사 지적 — **다섯 번째 병합 경로: 전 항차 펼치기(mir.flattenVoyages — 홈 통합검색·떠 있는 미르).**
//    여기만 40톤 문지기와 EDI 총중량(wtEdi)이 빠져 있어서, 작업창 미르는 «경보 19쌍» 인데 떠 있는 미르는 «30쌍 · 합계 464톤» 이라고 답했다(실동작은 smoke_twinwt40802).
const MIR = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'mir.js'), 'utf8');
T(/safeR\.wt !== undefined\) \{ const _w = plausibleListWtKg\(safeR\.wt\)/.test(MIR), '전 항차 펼치기(flattenVoyages)에 40톤 문지기(plausibleListWtKg)가 없다');
T(/merged\[c\.cn\] = \{ \.\.\.c, \.\.\.ediWtField\(c\)/.test(MIR), '전 항차 펼치기가 EDI 총중량(wtEdi)을 남기지 않는다');

//  ⑤ 합본 업로드 입구(autoRegApi) — 저장 전에 40톤 상한
const AR = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'autoRegApi.js'), 'utf8');
T(/if \(w > 0 && w <= CONTAINER_WT_MAX_KG\) rec\.wt = w;/.test(AR), '합본 업로드 입구(autoRegApi)에 40톤 상한이 없다');

if (bad) { console.error(`✗ 무게 병합 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 무게 병합 연막검사 통과 (가드 3 · 병합 7 · 인쇄 경로 3 · 전 항차 펼치기 2)');
