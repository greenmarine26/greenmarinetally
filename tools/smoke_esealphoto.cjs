// 엠티실 기록지 사진 판독(TallyOne 3.60)을 ATPR 2643W 실사진의 AI 실응답 두 번으로 재는 연막검사 — 세 자리를 여섯 자리로 만들고 틀린 짝을 자동으로 넣지 않는가
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; if (!B) { console.error('사용법: node tools/smoke_esealphoto.cjs <esealPhoto번들.cjs>'); process.exit(1); }
const M = require(path.resolve(B));
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/esealphoto_atpr2643w.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('엠티실 기록지 사진 — ATPR 2643W 57줄 (TallyOne 3.60)');
const pool = []; for (const r of F.ranges) { for (let n = parseInt(r.from, 10); n <= parseInt(r.to, 10); n++) pool.push(String(n).padStart(r.from.length, '0')); }
ok(pool.length === 200 && pool[0] === '036601' && pool[199] === '036900', `배정 구간 전개 200개 (${pool.length})`);
ok(M.ESEAL_MODEL && !/flash/i.test(M.ESEAL_MODEL), `판독 모델이 Flash 가 아니다 (${M.ESEAL_MODEL}) — Flash 는 두 번 모두 같은 줄 밀림으로 틀린 짝 9줄을 자동 체크했다`);
const rows = M.matchEsealRuns(F.runs, F.targets, pool, {});
let a = 0, w = 0, c = 0; for (const r of rows) { if (r.ok) (F.truth[r.cn] === r.hand ? a++ : w++); else c++; }
ok(w === 0 && a >= 50, `두 번 읽기 — 자동 ${a} · 틀림 ${w} · 확인 ${c}`);
ok(rows.filter((r) => r.ok).every((r) => /^036\d{3}$/.test(r.seal) && r.seal.endsWith(r.hand)), '자동 줄의 실은 전부 036 + 손글씨 세 자리(여섯 자리)');
{ const x = M.expandSeal('654', pool); ok(x.seal === '036654', `654 → ${x.seal}`); }
{ const x = M.expandSeal('700', pool); ok(x.seal === '036700', `구간 끝 700 → ${x.seal}`); }
{ const x = M.expandSeal('750', pool); ok(!x.seal && /없어요/.test(x.why), '구간 밖 750(036701~036800 은 배정 안 됨) → 확인 필요'); }
{ const x = M.expandSeal('036654', pool); ok(x.seal === '036654', '여섯 자리를 다 적었으면 그대로'); }
{ const x = M.expandSeal('6?4', pool); ok(!x.seal, '흐린 자리(?)가 있으면 자동 안 함'); }
{ const p2 = ['521654', '523654']; const x = M.expandSeal('654', p2); ok(!x.seal && x.choices.length === 2, '앞자리가 다른 구간 둘에 같은 끝 세 자리가 있으면 골라 달라고 한다'); }
{ const it = [{ no: 1, cn: 'BMOU5407731', seal: '654' }, { no: 2, cn: 'HLHU6421955', seal: '654' }];
  const m = M.matchEsealItems(it, F.targets, pool, {}); ok(m.every((r) => !r.ok), '같은 실이 두 컨에 읽히면 둘 다 확인 필요'); }
{ const it = [{ no: 1, cn: 'BMOU5407731', seal: '654' }];
  const m = M.matchEsealItems(it, F.targets, pool, { '036654': 'HLHU6421955' }); ok(!m[0].ok && /이미/.test(m[0].why), '이미 다른 컨에 붙은 실이면 확인 필요'); }
{ const it = [{ no: 1, cn: 'ZZZU0000000', seal: '654' }];
  const m = M.matchEsealItems(it, F.targets, pool, {}); ok(!m[0].ok, '대상에 없는 컨은 자동 안 함'); }
{ const it = [{ no: 1, cn: 'BMOU5407781', seal: '654' }];
  const m = M.matchEsealItems(it, F.targets, pool, {}); ok(m[0].ok && m[0].cn === 'BMOU5407731', '인쇄 컨번호 한 글자 오독은 유일할 때만 대상 컨으로 바로잡는다'); }
{ const b = F.runs[1].map((r) => (r.cn === 'BMOU5407731' ? { ...r, seal: '655' } : r));
  const m = M.matchEsealRuns([F.runs[0], b], F.targets, pool, {}); const r = m.find((x) => x.pick === 'BMOU5407731');
  ok(r && !r.ok, '두 번 읽은 실이 다르면 확인 필요'); }
{ // 감사 지적 — 두 번째 읽기에서 걸린(ok 아님) 줄은 실이 같아도 자동 안 함 · 두 번째 읽기에 같은 컨이 두 줄이면 확인 필요
  const b = F.runs[1].concat([{ no: 99, cn: 'HLHU6421955', seal: '654' }]);
  const m = M.matchEsealRuns([F.runs[0], b], F.targets, pool, {});
  ok(!m.find((x) => x.pick === 'BMOU5407731').ok && !m.find((x) => x.pick === 'HLHU6421955').ok, '두 번째 읽기에서 걸린 줄은 첫 읽기가 맞아도 확인 필요');
  const b2 = F.runs[1].concat([{ no: 98, cn: 'HLHU8117474', seal: '699' }]);
  const m2 = M.matchEsealRuns([F.runs[0], b2], F.targets, pool, {});
  ok(!m2.find((x) => x.pick === 'HLHU8117474').ok, '두 번째 읽기에 같은 컨이 두 줄이면 확인 필요'); }
{ const t = JSON.stringify({ items: [{ no: 1, cn: 'BMOU5407731', seal: '654' }, { no: 2, cn: 'HLHU6401476', seal: '' }, { no: 3, cn: 'HLHU6421955', seal: '626' }] });
  const r = M.parseEsealResponse(t); ok(r.length === 2, '손글씨 없는 줄은 버린다');
  const bad = t.replace('}, {"no":2', '} {"no":2'); ok(M.parseEsealResponse(bad).length >= 1, '깨진 JSON 이 와도 성한 줄은 읽는다'); }
if (fail) { console.error(`✗ 엠티실 사진 연막 ${fail}건 실패`); process.exit(1); }
console.log('✓ 엠티실 사진 연막 통과');
