// 5.03 건9 베이모드 «육상부터/해상부터» 칩 연막검사 — 4.80 베이모드 화면 시험(smoke_fix480_baymode.cjs)의 베이모드 켠 직후에 시험 한 토막을 끼워 돌린다. 사용 — node tools/smoke_a50300_baymini.cjs [저장소 루트]
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const src = fs.readFileSync(path.join(ROOT, 'tools/smoke_fix480_baymode.cjs'), 'utf8');
const lines = src.split('\n');
const at = lines.findIndex((l) => l.startsWith("    ok('A2c "));
if (at < 0) { console.error('✘ 끼울 자리(A2c)를 못 찾았다 — smoke_fix480_baymode 가 바뀌었다'); process.exit(1); }
const inject = `
    {
      const strip = H.d.querySelector('[data-gw-mini-order]');
      const bts = strip ? [...strip.querySelectorAll('button')] : [];
      ok('9-1 5.03 베이모드에도 육상부터·해상부터 칩이 보인다(한 줄)', !!strip && bts.some((b) => /육상부터/.test(H.txt(b))) && bts.some((b) => /해상부터/.test(H.txt(b))));
      ok('9-2 기본은 육상부터가 켜짐', bts.find((b) => /육상부터/.test(H.txt(b))).className.includes('bg-teal-700') && !bts.find((b) => /해상부터/.test(H.txt(b))).className.includes('bg-teal-700'));
      await H.click(bts.find((b) => /해상부터/.test(H.txt(b))), 500);
      await H.sync();
      const inf = (H.W.__memdb.voyages[vk] || {}).info || {};
      const saved = JSON.stringify(inf.workOrder || inf.seqRowFrom || null);
      ok('9-3 해상부터를 누르면 호기별 workOrder(rowFrom=sea)로 저장된다 → 큐 정렬 rowFrom 입력', /sea/.test(saved), saved);
      const strip2 = H.d.querySelector('[data-gw-mini-order]');
      ok('9-4 저장 뒤 칩이 해상부터로 바뀐다', !!strip2 && [...strip2.querySelectorAll('button')].find((b) => /해상부터/.test(H.txt(b))).className.includes('bg-teal-700'));
      ok('9-5 베이모드에서 종전 한 줄(순서 바꾸기 ⚙)과 이중으로 안 그려진다', H.d.querySelectorAll('[data-gw-mini-order]').length === 1 && !/바꾸기 ⚙/.test(H.d.body.textContent));
    }`;
lines.splice(at + 1, 0, inject);
const tmp = path.join(ROOT, 'tools', '_a50300_baymini_tmp.cjs');
fs.writeFileSync(tmp, lines.join('\n'));
let r;
try { r = spawnSync('node', [tmp, ROOT], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); }
finally { try { fs.unlinkSync(tmp); } catch (e) { console.warn('임시 파일 삭제 실패', e.message); } }
const out = (r.stdout || '') + (r.stderr || '');
const mine = out.split('\n').filter((l) => /9-\d|✘|베이모드 연막검사/.test(l));
console.log(mine.join('\n'));
const bad = /✘/.test(out) || r.status !== 0;
console.log(bad ? '\n✘ 5.03 건9 베이모드 칩 연막검사 실패' : '\n✓ 5.03 건9 베이모드 칩 연막검사 통과');
process.exit(bad ? 1 : 0);
