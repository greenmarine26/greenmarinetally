// 4.43 연막검사 — 일반 검수원도 본인 비밀번호 잠금 대상이고(관리자 권한은 안 딸려 붙음), 검수사 신뢰 기기에서는 비번 없이 열린다.
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
(async () => {
  console.log('개인 비밀번호 잠금(4.43)');
  const out = path.join(require('os').tmpdir(), '_smoke_personallock443_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export * from './src/adminGuard.js'; export { STAFF_LIST } from './src/staffList.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
  });
  const G = require(out); fs.unlinkSync(out);
  const guard = {};
  const plain = G.STAFF_LIST.filter(s => s.role === '검수').map(s => s.name);
  ok(plain.length >= 5, '일반 검수 명단 ' + plain.length + '명');
  ok(plain.every(n => G.isLockedName(guard, n)), '① 일반 검수 전원이 잠금 대상');
  ok(plain.every(n => G.needsPasswordSetup(guard, n)), '② 비번 안 정한 사람은 첫 선택 때 본인이 정한다(setup)');
  ok(plain.every(n => !G.isAdminName(guard, n)), '③ 잠금 대상이어도 관리자 권한은 안 딸려 붙는다');
  ok(plain.every(n => G.lockPath(guard, n) === 'locks/' + n), '④ 저장 위치는 locks/{이름} (admins 아님)');
  ok(!G.isLockedName(guard, '클로드') && !G.isLockedName(guard, '클로드2'), '⑤ 개발·시험 계정(클로드·클로드2)은 잠그지 않는다');
  ok(!G.isLockedName(guard, '명단에없는사람'), '⑥ 명단 밖 직접 입력 이름은 잠그지 않는다');
  ok(G.isLockedName(guard, '김성일') && G.isLockedName(guard, '이현규'), '⑦ 소유자·수석은 종전대로 잠금');
  const g2 = { locks: { [plain[0]]: { pwHash: 'x', salt: 'y' } } };
  ok(!G.needsPasswordSetup(g2, plain[0]) && G.needsPasswordSetup(g2, plain[1]), '⑧ 정한 사람만 verify, 나머지는 setup');
  ok(G.ownerCanUnlock({ admins: { 김성일: { pwHash: 'a', salt: 'b' } } }, plain[0]), '⑨ 비번을 잊으면 소유자 비밀번호로 열고 초기화할 수 있다');
  const lp = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'LoginPage.jsx'), 'utf8');
  ok(/isGeneralLockName\(guard, name\) && isTrustedDeviceFor\(guard, OWNER_NAME\)\) \{ commitSelect\(name\); return; \}/.test(lp), '⑩ 소유자 신뢰 기기에서는 일반 검수원이 비번 없이 열린다(로그인 화면 배선)');
  ok(plain.every(n => G.isGeneralLockName(guard, n)), '⑩-1 일반 검수 전원이 무비번 접속 대상');
  const chiefs = G.STAFF_LIST.filter(s => /수석검수|부수석|테스터/.test(s.role)).map(s => s.name);
  ok(chiefs.length >= 5 && chiefs.every(n => !G.isGeneralLockName(guard, n) && G.isLockedName(guard, n)), '⑩-2 수석·부수석은 대상이 아니다(종전대로 잠금, 무비번 접속 제외) ' + chiefs.length + '명');
  ok(!G.isGeneralLockName({ admins: { 홍길동: { pwHash: 'a', salt: 'b' } } }, '홍길동') && !G.isGeneralLockName(guard, '김성일'), '⑩-3 관리자·소유자도 대상이 아니다');
  const iOwner = lp.indexOf('isTrustedDeviceFor(guard, OWNER_NAME)'), iSetup = lp.indexOf("setGateMode('setup'); return; }");
  ok(iOwner > 0 && iOwner < iSetup, '⑪ 그 우회는 비번 설정 창보다 앞에 있다(소유자가 남의 비번을 정하게 되지 않는다)');
  console.log(fail ? '실패 ' + fail : '통과');
  process.exit(fail ? 1 : 0);
})();
