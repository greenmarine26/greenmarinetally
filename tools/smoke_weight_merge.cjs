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
  T(/parseListWeightKg/.test(body), '톤 보정(parseListWeightKg)이 사라졌다');
  T(/>\s*0/.test(body), '**양수 가드가 없다** — 리스트의 0 이 EDI 무게를 다시 지운다');
  T(!/safeR\.wt\s*=\s*parseListWeightKg\(v\)\s*;/.test(body), '가드 없이 그대로 대입하는 옛 줄이 남아 있다');
}

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

if (bad) { console.error(`✗ 무게 병합 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 무게 병합 연막검사 통과 (가드 3 · 병합 7)');
