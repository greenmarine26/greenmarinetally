// 한 숫자 연막검사 (3.53-12) — 대수·잔여·끝나는 시각은 **완료 기록 하나**로 답한다. 외부 합계가 ctx 에 실려 와도 답에 새어 나오지 않는다.
//
// 왜 있는가.
//   2.55(2026-08-26)는 «실제(터미널)와 앱 기록 두 숫자»였다 — 그때는 터미널 실적이 외부 합계로만 왔고 앱에는 검수사만 찍었다.
//   그 뒤 터미널 **컨별** 실적이 완료 기록(`completed/{cn}`, src:'term' — 동방 직결·카토스)으로 들어오게 됐고,
//   그런데 답 엔진이 계속 피드를 1순위로 읽었다 — 실측 ATPR 2642E 09-20 22:39: 컨별 완료 178대·잔여 102대인데 미르는 피드 281/281 로 «계획 281대를 다 채웠습니다».
//   검수사 2026-09-21 «그러니 남은시간 계산도 틀려지는거고요»
//   · «총 잔여갯수를 그날 시간당 처리갯수와 갱수로 나눠서 답해야 한다.»
//
//   node tools/smoke_bothcounts.cjs <nlSearch 번들.cjs>
const path = require('path');
const fs = require('fs');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const NS = require(path.resolve(OUT));

let n = 0, bad = 0;
const T = (ok, why) => { n += 1; if (!ok) { bad++; console.error('  ✗ ' + why); } };

// 실측 모양 — ATPR 2642E 2026-09-20 22:39: 평택분 280대 · 완료 178대(전부 터미널 반영) · 피드는 281/281(지난 값)
const NOW = Date.now();
const TW = { startAt: '2026-09-20 19:28', updatedAt: NOW - 5 * 60000, disDone: 281, disPlan: 281, lodDone: 0, lodPlan: 0, pct: 100, endAt: '2026-09-20 17:15' };
const comp = {};
const conts = [];
for (let i = 0; i < 280; i++) {
  const cn = 'TEST' + String(1000000 + i);
  const done = i < 178;
  if (done) comp[cn] = { by: '', src: 'term', at: NOW - (178 - i) * 60000 };   // 1분에 한 대씩, 마지막이 방금
  conts.push({ cn, _mode: 'discharge', _ptk: true, pod: 'KRPTK', bay: 24, _comp: done ? comp[cn] : null });
}
const info = { vsl: 'ATPR', vslFull: 'ATLANTIC PIONEER', pier: 'PNCT', gangs: 2 };
const voyageDoneAts = Object.values(comp).map((c) => c.at).sort((a, b) => a - b);
//  ⚠ 피드를 **일부러 실어 보낸다**(옛 ctx 이름 둘 다) — 옛 입구가 하나라도 살아 있으면 여기서 281 이 새어 나온다.
const ctx = { compMap: comp, ['terminal' + 'Work']: { ATPR: TW }, tw: TW, vsl: 'ATPR', vslFull: info.vslFull, pier: 'PNCT', info, mode: 'discharge', gangs: 2,
  voyageDoneAts, voyageCounts: { total: 280, done: 178, byMode: { discharge: { total: 280, done: 178 }, loading: { total: 0, done: 0 } } } };
const ask = (q, c) => {
  const p = NS.parseNaturalQuery(q, conts);
  const r = NS.applyNLFilter(conts, p);
  return NS.generateLocalAnswer(p, r, conts, c === undefined ? ctx : c) || '';
};
const LEAK = /실제\(터미널\)|터미널 실적|터미널 실황|터미널 피드|281/;

// ── ① 피드를 읽던 함수가 없다 ──────────────────────────────────────
for (const k of ['bothCounts', 'twOfCtx', 'terminal' + 'WorkFor', 'speedFromTerminal', 'formatTerminal' + 'WorkAnswer', 'isRealtimeProgressQuery']) {
  T(typeof NS[k] === 'undefined', `⛔ ${k} 가 아직 있다 — 외부 합계를 읽는 입구다`);
}
T(typeof NS.speedFromRecords === 'function', 'speedFromRecords 가 없다 — 그날 페이스 한 벌');

// ── ② 대수·잔여 — 한 숫자 ────────────────────────────────────────
{
  const a = ask('얼마나 남았어');
  T(/남은 작업: 102대 \/ 전체 280대/.test(a), `«얼마나 남았어» 가 102/280 이 아니다 — ${a.split('\n')[0]}`);
  T(/완료: 178대/.test(a), '«얼마나 남았어» 에 완료 178대가 없다');
  T(!LEAK.test(a), `⛔ «얼마나 남았어» 에 피드가 샌다 — ${a.slice(0, 120)}`);
  const b = ask('몇 대 했어');
  T(/178대/.test(b) && !LEAK.test(b), `«몇 대 했어» — ${b.split('\n')[0]}`);
  T(!/두 가지로/.test(a + b), '⛔ «두 가지로 말씀드립니다» 가 남아 있다');
}

// ── ③ 끝나는 시각 — 총 잔여 ÷ (갱당 시간당 × 갱 수) ─────────────────
{
  const a = ask('몇 시에 끝나');
  T(/^102대 남았어요/.test(a), `«몇 시에 끝나» 첫 줄이 102대가 아니다 — ${a.split('\n')[0]}`);
  T(/남은 작업: 102대 \(양하 102\) · 완료 178 \/ 전체 280/.test(a), '잔여 줄이 양하·선적으로 갈라 보이지 않는다');
  T(/2갱 기준 갱당 \d+(\.\d)?대/.test(a), '«N갱 기준 갱당 N대» 가 없다 — 검수사 «시간당 처리갯수와 갱수로»');
  T(!LEAK.test(a) && !/다 채웠습니다/.test(a), `⛔ 피드 281/281 로 «다 채웠습니다» 라고 답한다 — 2026-09-20 그 오답이다\n      ${a.slice(0, 160)}`);
  T(!/앱에 찍힌 것만|다른 검수원이 한 몫/.test(a), '⛔ «앱에 찍힌 것만 … 다른 검수원 몫은 안 들어 있다» 가 남아 있다 — 완료 기록엔 터미널 반영분이 들어 있다');
  const mins = (s) => { const x = /남은 시간: 약 (?:(\d+)시간)? ?(?:(\d+)분)?/.exec(s); return x ? (Number(x[1] || 0) * 60 + Number(x[2] || 0)) : 0; };
  const a2 = mins(a);
  T(a2 > 0, '남은 시간을 못 읽었다');
  //  잔여를 항차 전체로 세는가 — 선적 260대가 남아 있으면 총 잔여 362대이고 남은 시간도 그만큼 길어진다
  const c2 = { ...ctx, voyageCounts: { total: 540, done: 178, byMode: { discharge: { total: 280, done: 178 }, loading: { total: 260, done: 0 } } } };
  const b = ask('몇 시에 끝나', c2);
  T(/^362대 남았어요/.test(b) && /\(양하 102 · 선적 260\)/.test(b), `선적 잔여를 총 잔여에 안 넣는다 — ${b.split('\n')[0]}`);
  T(mins(b) > a2 * 3, `총 잔여가 3.5배인데 남은 시간이 그만큼 안 늘었다 (${a2}분 → ${mins(b)}분)`);
}

// ── ④ 진행 답·브리핑 — 한 숫자 ───────────────────────────────────
{
  const s = NS.formatAppTallyAnswer('ATLANTIC PIONEER', conts, info);
  T(/완료 기록 기준 양하 178\/280/.test(s) && /남은 102대/.test(s), `진행 답 — ${s.split('\n')[0]}`);
  T(!LEAK.test(s), '⛔ 진행 답에 피드가 샌다');
  const b = String(NS.generateBriefing(conts, '양하', 'discharge', null, 'PNCT', { tw: TW, compMap: comp }) || '');
  T(/진행: 완료 178 \/ 잔여 102/.test(b), `브리핑 진행 줄이 178/102 가 아니다 — ${(b.match(/📈.*/) || [''])[0]}`);
  T(!/두 가지/.test(b) && !LEAK.test(b), '⛔ 브리핑에 «두 가지»·피드가 남아 있다');
}

// ── ⑤ ★ 가로채지 않는가 — «했어» 는 흔한 말이다. 대수를 묻는 맥락이 아니면 진행 질문으로 보면 안 된다(2.55 부터 지키던 것) ──
{
  const noProg = (q) => { const p = NS.parseNaturalQuery(q, conts); return !p.progressQuery; };
  for (const q of ['1918 어디 했어', '엑스레이 어디 했어', '어디까지 했어', '커버 몇 장 했어']) T(noProg(q), `⛔ «${q}» 를 진행 질문으로 가로챈다`);
  for (const q of ['씰 몇 개 했어', '트윈 몇 대 했어', '봉인 몇 개 했어', '무게 몇 대 했어', '온도 몇 대 했어']) T(noProg(q), `⛔ «${q}» 를 컨 대수 질문으로 가로챈다 — 물어본 것은 그게 아니다`);
  const a = ask('24번 베이 몇 대 남았어');
  T(/102/.test(a) && !LEAK.test(a), `베이 조건 질문 — ${a.split('\n')[0]}`);
}

// ── ⑥ 소스 — 답 엔진이 합계 피드를 읽는 줄이 없다 ───────────────────
{
  const ROOT = path.resolve(__dirname, '..');
  const RE = /WorkFor\(|twOfCtx\(|bothCounts\(|speedFromTerminal\(|WorkAnswer\(|\btw\.(disDone|disPlan|lodDone|lodPlan|startAt|endAt|pct|depEtd)\b/;
  for (const f of ['src/nlSearch.js', 'src/mir.js', 'src/chiefAnswers.js', 'src/components/StatsTab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx']) {
    const hit = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => RE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
    T(hit.length === 0, `⛔ ${f} 에 합계 피드를 읽는 줄이 있다 — ${hit.slice(0, 3).map(([i]) => i).join(', ')}행`);
  }
}

if (bad) { console.error(`✗ 한 숫자 연막검사 실패 ${bad}건 / ${n}항`); process.exit(1); }
console.log(`✅ 한 숫자 연막검사 통과 (${n}항) — 대수·잔여·끝나는 시각은 완료 기록 하나 · 피드를 실어 보내도 새지 않음 · 가로채지 않음`);
