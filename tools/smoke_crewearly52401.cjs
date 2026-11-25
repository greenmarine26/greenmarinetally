// 5.24-01 연막검사 — 첫 등록 조보다 1시간 넘게 이른 완료는 그 조 근무자로 붙이지 않는다(실자료 SWAL 2611N X-RAY 봉인자).
const path = require('path'); const fs = require('fs');
const ROOT = process.argv[2] || process.cwd();
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
(async () => {
  const U = await import(path.join(ROOT, 'src/utils.js'));
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/crewearly52401.json'), 'utf8'));
  const info = { vsl: 'SWAL', craneCrew: FX.craneCrew };
  for (const [cn, c] of Object.entries(FX.comp)) ok(U.xraySealerOf(null, c, info) === '', `${cn} 주간 완료 봉인자 빈칸(야간 등록자 아님)`);
  const segs = U.crewSegments(info);
  const s0 = segs[0];
  ok(U.crewNameAt(info, s0.startMs + 60000, '4호기') === '김성일', '야간 안 4호기 = 김성일');
  ok(U.crewNameAt(info, s0.startMs - 30 * 60000, '4호기') === '김성일', '야간 시작 30분 전(일찍 시작) = 김성일');
  ok(U.crewNameAt(info, s0.startMs - 2 * 3600000, '4호기') === '', '야간 시작 2시간 전 = 빈칸');
  ok(U.xraySealerOf({ sealer: '홍길동', sealerAt: 1 }, FX.comp.HLHU8451650, info) === '홍길동', '사람이 적은 봉인자는 그대로');
  console.log(`smoke_crewearly52401 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 실행 오류', e); process.exit(1); });
