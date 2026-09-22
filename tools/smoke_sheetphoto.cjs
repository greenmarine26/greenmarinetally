// 선적 기록지 사진 판독(TallyOne 3.58)을 XTPG 541E 실사진의 AI 실응답 세 번으로 재는 연막검사 — 두 번 읽기가 틀린 자리를 자동으로 넣지 않는가
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; if (!B) { console.error('사용법: node tools/smoke_sheetphoto.cjs <sheetPhoto번들.cjs>'); process.exit(1); }
const M = require(path.resolve(B));
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sheetphoto_xtpg541e.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('선적 기록지 사진 — XTPG 541E 30칸 (TallyOne 3.58)');
const runs = F.runs.map((t) => M.parseSheetResponse(t));
ok(runs[0].length === 30, `첫 판독이 30칸을 찾는다 (${runs[0].length})`);
ok(F.candidates.length > 100 && ['EAXU2045294', 'FDCU0285794', 'TRHU3478857'].every((c) => F.candidates.includes(c)), '후보에 양하 실적의 타항 시프팅 컨이 들어 있다');
const score = (rows) => { let a = 0, w = 0, c = 0; for (const r of rows) { if (r.cn) (r.cn === F.truth[r.slot] ? a++ : w++); else c++; } return { a, w, c }; };
// 한 번 읽기는 칸 번호를 뒤바꿔 틀린 자리를 자동으로 넣은 실측이 있다(14-04-06 → 14-06-04) — 그래서 두 번 읽는다
const single = score(M.matchSheetItems(runs[1], F.candidates));
ok(single.w >= 1, `한 번 읽기만으로는 틀린 자동이 생긴다 — 두 번 읽기가 필요한 이유 (틀림 ${single.w})`);
for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
  const s = score(M.matchSheetRuns([runs[i], runs[j]], F.candidates));
  ok(s.w === 0 && s.a >= 23, `두 번 읽기 ${i + 1}·${j + 1} — 자동 ${s.a} · 틀림 ${s.w} · 확인 ${s.c}`);
}
ok(M.matchSheetRuns([runs[0]], F.candidates).filter((r) => r.cn).length >= 29, '한 번만 읽혔으면 그 결과를 그대로 쓴다');
{ const d = runs[2].filter((r) => r.slot === '150404');   // 세 번째 실응답은 15-04-04 를 두 번 냈다(하나는 13-04-04) — 버리지 않고 둘 다 확인 필요
  const m = M.matchSheetItems(runs[2], F.candidates).filter((r) => r.slot === '150404');
  ok(d.length === 2 && d.every((r) => r.dupSlot) && m.every((r) => !r.cn), `같은 칸 번호가 두 번 읽히면 둘 다 «확인 필요» 로 남는다 (${d.length}행)`); }
{ const t = F.runs[0]; const cut = t.slice(0, t.indexOf('}', t.indexOf('130404')) + 1) + ' {"slot":"1306';   // 검수사 폰 실측 — AI 가 JSON 을 깨뜨려 보냄
  const r = M.parseSheetResponse(cut.replace('}, {', '} {'));
  ok(r.length >= 2, `깨진 JSON 이 와도 성한 칸은 읽는다 (${r.length}칸)`); }
ok(M.isoOk('EAXU2045294') && !M.isoOk('EAXU2045295'), 'ISO 체크디지트');
const CONE = fs.readFileSync(path.join(__dirname, '../public/cone.html'), 'utf8');
ok(/function ctDrawRows\(mode\)/.test(CONE) && (CONE.match(/ctDrawRows\(/g) || []).length >= 4, '콘앱이 계획 밖 선적 기록도 그린다(ctDrawRows)');
if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); } console.log('✓ 통과');
