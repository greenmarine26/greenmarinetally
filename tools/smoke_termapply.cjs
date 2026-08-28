// 터미널 실적 반영(computeTermApply) 연막검사 — 절대 조항 + SWTD 실데이터 불변식
//
// 왜 있는가 (2026-08-28, TallyOne 2.79).
//   CATOS termWork 를 수석 승인으로 completed 에 일괄 반영한다. 잘못 반영하면 검수원이
//   안 내린 컨이 «완료»가 되거나, 검수원이 찍은 기록이 덮인다 — 인건비 근거가 흐려진다.
//   판정은 utils.computeTermApply 한 벌 — 화면 카운트·실제 쓰기·이 검사가 같은 함수를 본다.
//
// 절대 조항 (검수사 확정 규칙에서 뽑음 — 코드 출력에서 뜨지 않는다):
//   ① 반입시각(at) 없는 것은 반영 대상이 아니다.
//   ② completed 에 이미 있는 컨은 대상이 아니다(덮지 않는다).
//   ③ GC10x → «x호기». 그 외 장비 문자열은 그대로.
//   ④ by 는 «터미널(CATOS)», at 은 터미널 반입시각 그대로.
//
// 쓰는 법: node tools/smoke_termapply.cjs

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(require('os').tmpdir(), 'tally_termapply_' + process.pid + '.cjs');
try {
  execFileSync('npx', ['esbuild', 'src/utils.js', '--bundle', '--platform=node',
    '--format=cjs', '--log-level=warning', '--outfile=' + OUT], { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('✗ utils.js 묶기 실패 — 검사를 건너뛰지 않는다. 빌드를 세운다.');
  process.exit(1);
}
const U = require(OUT);
if (typeof U.computeTermApply !== 'function') {
  console.error('✗ computeTermApply 가 없다. 이름이 바뀌었으면 이 검사도 같이 고쳐라.');
  process.exit(1);
}

let fail = 0;
const bad = (msg) => { console.error('  ✗ ' + msg); fail += 1; };

// ── 1. 절대 조항 — 손으로 박은 미니 픽스처 (호출부 모양 그대로: {cn: {at,equip,...}}) ──
{
  const tw = {
    AAAA1111111: { at: 1787865370000, equip: 'GC102' },           // 대상 — 2호기
    BBBB2222222: { at: 1787865400000, equip: 'GC103' },           // completed 에 있음 — 제외
    CCCC3333333: { equip: 'GC104', status: 'Booking' },           // at 없음 — 제외
    DDDD4444444: { at: 1787865500000 },                           // 장비 없음 — equip 키 없이
    EEEE5555555: { at: 1787865600000, equip: 'RS01' },            // GC 아님 — 그대로
  };
  const comp = { BBBB2222222: { by: '김성일', at: 1 } };
  const got = Object.fromEntries(U.computeTermApply(tw, comp));
  if (Object.keys(got).length !== 3) bad(`대상 수 3 이어야 하는데 ${Object.keys(got).length}`);
  if (!got.AAAA1111111 || got.AAAA1111111.equip !== '2호기') bad('GC102 → 2호기 매핑 실패');
  if (got.AAAA1111111 && got.AAAA1111111.at !== 1787865370000) bad('터미널 반입시각이 보존되지 않음');
  if (got.AAAA1111111 && got.AAAA1111111.by !== '터미널(CATOS)') bad('by 가 «터미널(CATOS)» 가 아님');
  if (got.BBBB2222222) bad('completed 에 있는 컨을 덮으려 함 — 현장 기록 보호 위반');
  if (got.CCCC3333333) bad('반입시각 없는 컨(Booking)을 반영하려 함');
  if (got.DDDD4444444 && 'equip' in got.DDDD4444444) bad('장비 없는 컨에 equip 키가 생김');
  if (!got.EEEE5555555 || got.EEEE5555555.equip !== 'RS01') bad('GC 아닌 장비 문자열이 훼손됨');
}

// ── 2. SWTD 실데이터 불변식 (2026-08-28 스냅샷 918/140) ──
{
  const fix = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/termapply_swtd.json'), 'utf8'));
  const entries = U.computeTermApply(fix.termWork, fix.completed);
  const withAt = Object.entries(fix.termWork).filter(([, r]) => r && r.at);
  const overlap = withAt.filter(([cn]) => fix.completed[cn]);
  const expect = withAt.length - overlap.length;
  if (entries.length !== expect) bad(`대상 수 ${entries.length} ≠ 기대 ${expect} (반입 ${withAt.length} − 겹침 ${overlap.length})`);
  for (const [cn, rec] of entries) {
    if (fix.completed[cn]) { bad(`completed 컨 ${cn} 이 대상에 들어옴`); break; }
    if (!rec.at) { bad(`at 없는 ${cn} 이 대상에 들어옴`); break; }
    if (/^GC/.test(rec.equip || '')) { bad(`장비 미매핑 잔존 ${cn} → ${rec.equip}`); break; }
    if (rec.by !== '터미널(CATOS)') { bad(`by 오염 ${cn} → ${rec.by}`); break; }
  }
  console.log(`  SWTD 실데이터 — termWork ${Object.keys(fix.termWork).length} · 반입 ${withAt.length} · 앱완료 ${Object.keys(fix.completed).length} · 반영 대상 ${entries.length}`);
}

try { fs.unlinkSync(OUT); } catch (e) { /* 임시 번들 정리 실패는 검사 결과와 무관 */ }
if (fail) { console.error(`✗ 터미널 실적 반영 연막검사 실패 ${fail}건`); process.exit(1); }
console.log('✅ 터미널 실적 반영 연막검사 통과 — 절대 조항 4 · 실데이터 불변식 4');
