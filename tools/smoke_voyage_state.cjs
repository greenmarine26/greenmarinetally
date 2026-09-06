// 「작업중/예정」 판정을 그날 떠 있는 배 **전부** × 하루 여러 시각으로 돌려 기준표와 대조하는 전수 회귀.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 있는가.
//   2026-08-25. KBTR 이 19시 작업인데 18:20 에 「작업중」으로 떠서 2.44 로 고쳤다.
//   그랬더니 13:05 부터 일하고 있던 NSFR 이 「예정」이 됐다. 2.45 로 NSFR 을 살렸다.
//   검수사 — «하나가 살면 하나가 죽고 시뮬레이션은 하는 건가요?»
//   맞는 말이었다. 나는 **고친 그 배 하나만** 돌려 보고 통과라고 했다.
//
//   ⇒ 이 검사는 고친 배가 아니라 **전 항차 × 전 시각**을 돌린다.
//     한 척이라도 판정이 달라지면 빌드가 선다. 의도한 변경이면 --rebaseline 로 기준표를 다시 뜬다.
//
//   ★ 검수사가 확답한 것(ANCHORS)은 기준표와 별개로 **절대 조항**이다.
//     --rebaseline 로도 못 지운다. 여기 걸리면 그 수정은 틀린 것이다.
// ─────────────────────────────────────────────────────────────────────────────
//
// 쓰는 법:  node tools/smoke_voyage_state.cjs            (검사)
//          node tools/smoke_voyage_state.cjs --rebaseline (기준표 다시 뜨기)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FIX  = path.join(ROOT, 'tools/fixtures/voyages.json');
const BASE = path.join(ROOT, 'tools/fixtures/voyage_state_baseline.json');
const REBASE = process.argv.includes('--rebaseline');

// ── 1. utils.js 를 CJS 로 묶는다 (앱이 쓰는 그 코드 그대로) ───────────────────
const OUT = path.join(require('os').tmpdir(), 'tally_utils_' + process.pid + '.cjs');
try {
  execFileSync('npx', ['esbuild', 'src/utils.js', '--bundle', '--platform=node',
    '--format=cjs', '--log-level=warning', '--outfile=' + OUT], { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('✗ utils.js 묶기 실패 — 검사를 건너뛰지 않는다. 빌드를 세운다.');
  process.exit(1);
}
const U = require(OUT);
if (typeof U.isWorkingNow !== 'function') {
  console.error('✗ isWorkingNow 가 없다. 이름이 바뀌었으면 이 검사도 같이 고쳐라.');
  process.exit(1);
}

// ── 2. 시각표 — 하루를 훑는다 ────────────────────────────────────────────────
//   판정이 시각에 따라 뒤집히므로 한 시점만 보면 반쪽이다.
//   기준일은 스냅샷을 뜬 날(2026-08-25)로 못 박는다 — 오늘 날짜로 하면 내일 검사가 저절로 달라진다.
const D0 = [2026, 7, 25];                       // 2026-08-25 (월 0시작)
const at = (d, h, m) => new Date(D0[0], D0[1], D0[2] + d, h, m).getTime();
const TIMES = [
  ['08-25 00:00', at(0, 0, 0)],
  ['08-25 06:00', at(0, 6, 0)],
  ['08-25 12:00', at(0, 12, 0)],
  ['08-25 12:59', at(0, 12, 59)],   // NSFR 예정 13:00 직전
  ['08-25 13:01', at(0, 13, 1)],    // 예정은 지났으나 **실적 13:05 은 아직** — 여기가 갈림길
  ['08-25 13:06', at(0, 13, 6)],    // NSFR 실적 13:05 직후
  ['08-25 16:00', at(0, 16, 0)],
  ['08-25 18:48', at(0, 18, 48)],   // 검수사가 화면을 본 시각
  ['08-25 18:59', at(0, 18, 59)],   // KBTR 시작 직전
  ['08-25 19:01', at(0, 19, 1)],    // KBTR 시작 직후
  ['08-25 23:00', at(0, 23, 0)],
  ['08-26 04:01', at(1, 4, 1)],     // STSE
  ['08-27 13:01', at(2, 13, 1)],    // PCSZ
  //  ★ 3.22 — 검수사가 «ATPR 이 왜 안 보이냐»고 본 시각(2026-09-07 00:30). 위 08-25 기준일과 다른 날이라
  //    절대 시각으로 박는다 — 동방 실적 사례는 그날 자료로만 재현된다.
  ['09-07 00:30', new Date(2026, 8, 7, 0, 30).getTime()],
];

// ── 3. 검수사 확답 — 기준표보다 위다 ─────────────────────────────────────────
//   근거는 그날 대화와 배정목록 실물. 여기 어긋나면 --rebaseline 로도 통과 못 한다.
const ANCHORS = [
  //  ⚠ 이 표는 **코드가 지금 내는 값**이 아니라 **검수사가 말한 규칙**에서 뽑는다.
  //    2026-08-25 에 나는 이걸 거꾸로 했다 — 그때 돌던 2.45 가 내는 값으로 기준을 떠서,
  //    틀린 동작을 «정답» 으로 굳힐 뻔했다. 규칙이 먼저고 코드가 뒤다.
  //
  //  규칙(검수사 확정):
  //    · 배정목록 STATUS(plan/work/done) = **계획** 상태다. 작업 상태가 아니다.
  //    · **작업시작일시가 채워짐 = 그 시각부터 작업중.** 빈칸 = 아직 시작 안 함.
  //    · 입항일시(ATA)는 별개다 — 배가 들어온 것과 일을 시작한 것은 다르다.
  //    · 주 3항차 배는 작업이 끝나도 이틀 뒤 행이 미리 work 로 칠해진다 → 미래 행의 work 는 작업중이 아니다.
  //    · 배정목록 자체를 못 받은 항차(키 없음)만 예정 시각 폴백으로 간다.
  ['NSFR_2616N', '08-25 12:59', false, '예정 13:00 전. 오전에 「작업중」으로 떠서 «저 선박 담당자는 놀라 기겁을 할것입니다»'],
  ['NSFR_2616N', '08-25 13:01', false, '★예정 13:00 은 지났지만 **실적은 13:05** 이다. 예정으로 앞당겨 띄우면 안 된다'],
  ['NSFR_2616N', '08-25 13:06', true,  '실적 13:05 이후 — 실제로 작업 중 «왜 NSFR은 작업중이 아니죠?»'],
  ['NSFR_2616N', '08-25 18:48', true,  '같은 이유, 저녁에도 작업 중'],
  ['KBTR_2605E', '08-25 18:48', false, '배정 입항 19:00 인데 18:20 에 「작업중」으로 떴다 «KBTR이 또 작업중이네요?»'],
  ['KBTR_2605E', '08-25 19:01', false, '★입항 19:00 을 지나도 **작업시작일시가 빈칸**이다 — 입항 ≠ 작업 시작'],
  ['KBTR_2605E', '08-25 23:00', false, '같은 이유. 실적이 실릴 때까지는 작업중이 아니다'],
  ['MCSN_632N',  '08-25 18:48', false, 'departed — 떠난 배는 작업중이 아니다'],
  ['PCSZ_2625E', '08-25 18:48', false, '★주 3항차 — 8/27 13:00 행이 벌써 work 로 칠해져 있다. 미래 행의 work 는 작업중이 아니다'],
  ['PCSZ_2625E', '08-27 13:01', false, '★계획 확정일 뿐 작업 확정이 아니다. 작업시작일시가 빈칸이면 그 시각이 와도 아니다'],
  ['STSE_2665E', '08-25 18:48', false, '19시에서 03시로 밀렸다 — 오늘 저녁은 아니다'],
  ['STSE_2665E', '08-26 04:01', false, '★예정 04:00 이 지나도 작업시작일시가 빈칸이면 아직이다'],
  //  ★ 3.22 (검수사 2026-09-07 00:30 «수석대쉬보드 실시간 작업현황에 왜 ATPR작업현황이 안보이죠 3척이 다보여야 하는데»)
  //    동방(PNCT)은 배정목록 상태를 늦게 바꾼다 — terminalStatus 는 여태 planned 이고 작업시작일시도 빈칸인데
  //    터미널이 호기별로 «몇 대 했다»(qcWork.disDone)를 적어 준다. 실측 ATPR 2640E 149대.
  //    ⇒ **터미널이 적어 준 실적이 있으면 작업 중이다.** 우리가 추측한 값이 아니라 터미널이 적은 사실이다.
  ['ATPR_2640E', '09-07 00:30', true,  '★동방 — planned·시작빈칸이지만 터미널 실적 149대. 보드에 3척이 다 떠야 한다'],
  ['DXQD_2635E', '09-07 00:30', false, '★대조군 — 같은 동방 planned 인데 실적이 0이다. 실적 없이 상태만으로 열지 않는다'],
  //  ★ 3.22 감사(2026-09-07)가 짚은 «끝난 배가 영영 작업 중으로 남는» 구멍 — 실측 보관 항차로 박는다.
  //    끝났음을 알리는 출구는 얇다(보관 249척 중 departed/done 29척·workEndAt 5척뿐). 그래서 실적으로 여는 문에
  //    ①«남았다»가 0 이면 끝 ②계획 끝 + 반나절을 넘기면 닫힘 두 문지기를 더 세웠다. 지우면 유령이 돌아온다.
  ['OBWH_2731E', '09-07 00:30', false, '★끝난 배 — planned·시작빈칸인데 실적 470대. 터미널이 «남은 게 없다»(rest 0)고 적었으니 끝난 것이다'],
  ['OBWH_2729E', '09-07 00:30', false, '★working 으로 굳은 채 끝난 배 — 상태 칸만 믿으면 영영 작업중이 된다(실적 0)'],
  ['RZOR_R096E', '09-07 00:30', false, '★departed — 실적 416대가 남아 있어도 떠난 배는 작업중이 아니다'],
];

// ── 4. 돌린다 ────────────────────────────────────────────────────────────────
const fx = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const VOY = fx.voyages || {};
const keys = Object.keys(VOY).sort();
if (!keys.length) { console.error('✗ 스냅샷이 비었다. bash tools/snap_voyages.sh'); process.exit(1); }

const now = {};
for (const k of keys) {
  now[k] = {};
  for (const [label, ms] of TIMES) now[k][label] = !!U.isWorkingNow({ info: VOY[k] }, ms);
}

// ── 5. 절대 조항 ─────────────────────────────────────────────────────────────
let anchorFail = 0;
for (const [k, label, want, why] of ANCHORS) {
  if (!(k in now)) { console.log(`  · 닻 건너뜀 ${k} — 스냅샷에 없는 항차 (떠났으면 정상)`); continue; }
  const got = now[k][label];
  if (got !== want) {
    anchorFail++;
    console.error(`✗ 검수사 확답 위반  ${k} @ ${label}`);
    console.error(`    바라는 값 ${want ? '작업중' : '예정'} / 나온 값 ${got ? '작업중' : '예정'}`);
    console.error(`    근거: ${why}`);
  }
}

// ── 6. 기준표 대조 ───────────────────────────────────────────────────────────
let drift = [];
if (fs.existsSync(BASE) && !REBASE) {
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8')).table || {};
  for (const k of keys) {
    if (!(k in base)) { drift.push([k, '(전체)', '기준표에 없음', '새 항차']); continue; }
    for (const [label] of TIMES) {
      const b = base[k][label], n = now[k][label];
      if (b === undefined) { drift.push([k, label, '(없음)', n ? '작업중' : '예정']); continue; }
      if (b !== n) drift.push([k, label, b ? '작업중' : '예정', n ? '작업중' : '예정']);
    }
  }
}

// ── 7. 결과 ──────────────────────────────────────────────────────────────────
const nWork = keys.filter(k => now[k]['08-25 18:48']).length;
console.log(`\n  전 항차 ${keys.length}척 × 시각 ${TIMES.length}개 = ${keys.length * TIMES.length}판정`);
console.log(`  08-25 18:48 기준 작업중 ${nWork}척: ${keys.filter(k => now[k]['08-25 18:48']).join(', ') || '(없음)'}`);

if (REBASE) {
  fs.writeFileSync(BASE, JSON.stringify({
    _설명: '작업중 판정 전수 회귀의 기준표. 이 값이 바뀌면 빌드가 선다. 의도한 변경일 때만 --rebaseline 로 다시 뜬다.',
    _뜬판: (U.APP_VERSION || '?'),
    _시각표: TIMES.map(t => t[0]),
    table: now,
  }, null, 1), 'utf8');
  console.log(`  ✅ 기준표를 다시 떴다 → ${path.relative(ROOT, BASE)}  (${U.APP_VERSION || '?'})`);
}

if (anchorFail) {
  console.error(`\n✗ 검수사 확답 ${anchorFail}건 위반 — 이 수정은 틀렸다. 기준표를 다시 떠도 통과 못 한다.`);
  process.exit(1);
}
if (drift.length) {
  console.error(`\n✗ 판정이 바뀐 항차 ${drift.length}건 — 고친 배 말고 **다른 배**가 같이 움직였다:`);
  for (const [k, label, b, n] of drift) console.error(`    ${k.padEnd(14)} ${label}   ${b} → ${n}`);
  console.error(`\n  의도한 변경이면:  node tools/smoke_voyage_state.cjs --rebaseline`);
  console.error(`  의도한 게 아니면: 그 배가 왜 움직였는지 먼저 본다.`);
  process.exit(1);
}
console.log('  ✅ 전수 회귀 통과 — 판정이 바뀐 항차 없음, 검수사 확답 전부 일치');
try { fs.unlinkSync(OUT); } catch (e) {}
