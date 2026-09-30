// ATPR 위해행 엠티 선적 엠티실 음성 입력(TallyOne 3.71)을 ATPR 2644W 실항차 372대로 재는 연막검사 — 대상 판별·뒷 세 자리→여섯 자리·다른 배 불간섭
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; if (!B) { console.error('사용법: node tools/smoke_esealvoice.cjs <esealVoice번들.cjs>'); process.exit(1); }
const M = require(path.resolve(B));
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/esealvoice_atpr2644w.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log(`엠티실 음성 입력 — ATPR 2644W ${F.containers.length}대 (TallyOne 3.71)`);
const C = F.containers;
const hit = C.filter((c) => M.isAtprWeiEmpty(F.vsl, c));
ok(hit.length === 184, `ATPR 위해행 엠티 대상 184대 (${hit.length}) — 앱 🔖 카드 «대상 184대» 와 같다`);
ok(hit.every((c) => c.fe === 'E' && /^CNWE[HI]$/.test(c.pod)), '대상은 전부 엠티 + 위해(CNWEI·CNWEH)');
ok(C.filter((c) => c.fe === 'E' && c.pod === 'CNDLC').every((c) => !M.isAtprWeiEmpty(F.vsl, c)), '엠티라도 다롄행(CNDLC) 183대는 대상이 아니다');
ok(C.filter((c) => c.fe === 'F').every((c) => !M.isAtprWeiEmpty(F.vsl, c)), '풀(F) 5대는 위해행이어도 대상이 아니다');
ok(C.filter((c) => c.fe === 'E' && c.pod === 'CNWEI').every((c) => !M.isAtprWeiEmpty('RIZHAO ORIENT', c)), '다른 배(RIZHAO ORIENT)로 같은 컨을 물으면 대상 0 — 다른 선박은 안 건드린다');
ok(C.filter((c) => c.fe === 'E' && c.pod === 'CNWEI').every((c) => !M.isAtprWeiEmpty('STMJ 2659E', c)), '다른 배(STMJ)도 대상 0');
ok(!M.isAtprWeiEmpty(F.vsl, null), 'null 컨은 대상 아님');
ok(C.filter((c) => c.fe === 'E' && c.pod === 'CNWEI').every((c) => M.isAtprWeiEmpty('ATLANTIC PIONEER', c) && M.isAtprWeiEmpty('atpr', c) && M.isAtprWeiEmpty('ATRP', c)), '선박명 ATPR·ATRP·ATLANTIC PIONEER 는 대소문자 무관 대상');
ok(C.filter((c) => c.fe === 'E' && c.pod === 'CNWEI').every((c) => !M.isAtprWeiEmpty('PIONEER', c) && !M.isAtprWeiEmpty('ATLANTIC', c) && !M.isAtprWeiEmpty('ATPR STAR', c) && !M.isAtprWeiEmpty('', c)), '이름이 비슷·일부만 같은 다른 배(PIONEER·ATLANTIC·ATPR STAR)나 빈 이름은 대상 0');
const pool = M.esealPoolOf([{ from: '036601', to: '036700' }]);
ok(pool.length === 100 && pool[0] === '036601' && pool[99] === '036700', `구간 036601~036700 전개 100개 (${pool.length})`);
ok(M.esealPoolOf([{ from: '036601', to: '036700' }, { from: '037001', to: '037084' }]).length === 184, '구간 둘(100+84)이면 184개 — 대상 184대와 같다');
ok(M.esealPoolOf([{ from: '1', to: '99999' }]).length === 0 && M.esealPoolOf(null).length === 0, '구간이 없거나 10,000 넘게 크면 빈 목록');
const cn = hit[0].cn;
{ const r = M.resolveSpokenSeal(['601'], pool, {}, cn); ok(r.seal === '036601', `«601» → ${r.seal}`); }
{ const r = M.resolveSpokenSeal(['육공일'], pool, {}, cn); ok(r.seal === '036601', `«육공일»(한글 숫자) → ${r.seal}`); }
{ const r = M.resolveSpokenSeal(['육 영 일'], pool, {}, cn); ok(r.seal === '036601', `«육 영 일» → ${r.seal}`); }
{ const r = M.resolveSpokenSeal(['700'], pool, {}, cn); ok(r.seal === '036700', `구간 끝 700 → ${r.seal}`); }
{ const r = M.resolveSpokenSeal(['0654'], pool, {}, cn); ok(r.seal === '036654', `네 자리로 들려도 뒤 세 자리 → ${r.seal}`); }
{ const r = M.resolveSpokenSeal(['036654'], pool, {}, cn); ok(r.seal === '036654', '여섯 자리를 다 불러도 구간 안이면 그대로'); }
{ const r = M.resolveSpokenSeal(['036999'], pool, {}, cn); ok(!r.seal && /없어요/.test(r.why), '여섯 자리가 구간 밖이면 안 받는다'); }
{ const r = M.resolveSpokenSeal(['750'], pool, {}, cn); ok(!r.seal && /없어요/.test(r.why), '구간 밖 750 → 안 받고 까닭을 말한다'); }
{ const r = M.resolveSpokenSeal(['65'], pool, {}, cn); ok(!r.seal && r.why, '두 자리만 들리면 안 받는다'); }
{ const r = M.resolveSpokenSeal(['안녕'], pool, {}, cn); ok(!r.seal && r.why, '숫자가 없으면 안 받는다'); }
{ const r = M.resolveSpokenSeal(['65', '654'], pool, {}, cn); ok(r.seal === '036654', '음성 후보 여럿 중 세 자리가 든 것을 채택'); }
{ const r = M.resolveSpokenSeal(['999', '654'], pool, {}, cn); ok(r.seal === '036654', '첫 후보가 구간 밖이면 구간 안에 드는 다음 후보를 채택'); }
{ const r = M.resolveSpokenSeal(['654'], pool, { '036654': 'BEAU2093967' }, cn); ok(!r.seal && /이미/.test(r.why), '이미 다른 컨에 붙은 실이면 안 받는다'); }
{ const r = M.resolveSpokenSeal(['654'], pool, { '036654': cn }, cn); ok(r.seal === '036654', '같은 컨의 지금 실을 다시 불러 고치는 것은 받는다'); }
{ const p2 = M.esealPoolOf([{ from: '036601', to: '036700' }, { from: '037601', to: '037700' }]);
  const r = M.resolveSpokenSeal(['654'], p2, {}, cn); ok(!r.seal && r.choices.length === 2 && r.choices.includes('036654') && r.choices.includes('037654'), '앞 세 자리가 다른 두 구간에 같은 뒷 세 자리가 있으면 골라 달라고 한다');
  const r2 = M.resolveSpokenSeal(['654'], p2, { '036654': 'BEAU2093967' }, cn); ok(r2.seal === '037654', '둘 중 하나가 이미 쓰였으면 남은 하나로 정한다'); }
{ const r = M.resolveSpokenSeal(['654'], [], {}, cn); ok(!r.seal && /구간/.test(r.why), '구간이 없으면 안 받는다'); }
{ const u = M.esealUsedMap({ BEAU2087630: { eseal: '036601' } }, { BEAU2093967: { eseal: '036602' }, X: { eseal: '' } }); ok(u['036601'] === 'BEAU2087630' && u['036602'] === 'BEAU2093967' && Object.keys(u).length === 2, '이미 붙은 실 지도 — 기록·EDI 칸 합침, 빈 칸 제외'); }
{ // 184대 전부에 구간 안 실을 차례로 붙여도 서로 겹치지 않는다(뒷 세 자리를 차례로 부르는 하루치 시뮬)
  const p2 = M.esealPoolOf([{ from: '036601', to: '036700' }, { from: '037001', to: '037084' }]); const used = {}; let good = 0;
  hit.forEach((c, i) => { const s = p2[i]; const r = M.resolveSpokenSeal([s.slice(-3)], p2, used, c.cn); if (r.seal === s) { used[s] = c.cn; good++; } });
  ok(good === 184, `184대에 구간 실을 차례로 불러 넣기 — 전부 여섯 자리로 정확히 (${good}/184)`); }
console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과'); process.exit(fail ? 1 : 0);
