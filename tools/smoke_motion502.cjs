// 5.02 연막검사 — 베이 묶음(01 (02) 03) · 트윈/싱글 앞뒤 · 별첨 한 줄 결론. 사용: node tools/smoke_motion502.cjs <번들.cjs> [루트]
const path = require('path'), fs = require('fs');
const BUNDLE = process.argv[2], ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_motion502.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
let pass = 0, fail = 0;
const ok = (c, m, e) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || e === undefined ? '' : '  → ' + e)); if (c) pass++; else fail++; };
//  ① 묶음 표기 — 짝수 베이는 앞뒤 홀수와 한 묶음
const lab = (bays) => M.bayGroupsOf(bays.map((b) => ({ bay: b, n: 1, done: 0 }))).map((g) => g.label);
ok(JSON.stringify(lab([1, 2, 3])) === '["01 (02) 03"]', '1·2·3 → 01 (02) 03', JSON.stringify(lab([1, 2, 3])));
ok(JSON.stringify(lab([4, 5])) === '["(04) 05"]', '4·5 → (04) 05', JSON.stringify(lab([4, 5])));
ok(JSON.stringify(lab([30])) === '["(30)"]', '30 만 → (30)', JSON.stringify(lab([30])));
ok(JSON.stringify(lab([1, 3])) === '["01 03"]', '1·3 (짝수 없음 · 표준 번호) 한 짝', JSON.stringify(lab([1, 3])));
ok(JSON.stringify(lab([3, 5])) === '["03","05"]', '3·5 는 한 짝이 아니다', JSON.stringify(lab([3, 5])));
//  ② 트윈/싱글 — 합 = 남은 대수
const edi = {}, units = [];
const add = (cn, bay, row, tier) => { edi[cn] = { cn, bay, row, tier }; units.push(cn); };
add('A', 1, '02', '82'); add('B', 3, '02', '82'); add('C', 1, '04', '82'); add('D', 3, '06', '82'); add('E', 3, '08', '82'); add('F', 2, '04', '82');
const sec = { ediContainers: edi, records: {}, completed: {} };
const g = M.bayGroupsOf([{ bay: 1, n: 3, done: 0 }, { bay: 2, n: 1, done: 0 }, { bay: 3, n: 3, done: 0 }]);
const r = M.twinSingleOf(sec, units, g).get(g[0].key);
ok(r.twin === 1 && r.front === 1 && r.rear === 2 && r.f40 === 1, '트윈 1쌍 · 싱글 앞 1 / 뒤 2 · 40피트 1', JSON.stringify(r));
ok(r.twin * 2 + r.front + r.rear + r.single + r.f40 === 6, '합 = 남은 6대');
ok(M.twinSingleText(r) === '트윈 1 · 싱글 앞 1 / 뒤 2 · 40피트 1', '글 모양', M.twinSingleText(r));
sec.completed.A = { at: 1 };   // A 가 끝나면 트윈 쌍이 깨져 B 는 뒤 싱글
const r2 = M.twinSingleOf(sec, units, g).get(g[0].key);
ok(r2.twin === 0 && r2.front === 1 && r2.rear === 3, '완료 반영 — 트윈 0 · 앞 1 / 뒤 3', JSON.stringify(r2));
ok(M.twinSingleText({ twin: 0, front: 0, rear: 2, single: 0, f40: 0 }) === '싱글 뒤 2', '0 인 부분은 뺀다');
//  ②-b 감사 수리 — 줄·단 모름은 트윈 아님 · '2' = '02' · 빈 EDI 값은 records 로 · 짝수 없는 01·03
const one = (ediIn, recIn, bays) => { const cs = Object.keys(ediIn).concat(Object.keys(recIn).filter((k) => !ediIn[k])); const gg = M.bayGroupsOf(bays.map((b) => ({ bay: b, n: 1, done: 0 }))); return M.twinSingleOf({ ediContainers: ediIn, records: recIn, completed: {} }, cs, gg).get(gg[0].key); };
const t1 = one({ A: { bay: '01' }, B: { bay: '03' } }, {}, [1, 2, 3]);
ok(t1.twin === 0 && t1.front === 1 && t1.rear === 1, '줄·단 모르는 컨은 트윈이 아니다', JSON.stringify(t1));
const t2 = one({ A: { bay: '01', row: '02', tier: '82' } }, { B: { bay: '03', row: '2', tier: '82' } }, [1, 2, 3]);
ok(t2.twin === 1, "줄 '2' 와 '02' 는 같은 줄", JSON.stringify(t2));
const t3 = one({ A: { bay: '01', row: '', tier: '' }, B: { bay: '03', row: '04', tier: '82' } }, { A: { row: '04', tier: '82' } }, [1, 3]);
ok(t3.twin === 1, '빈 EDI 줄·단은 records 로 넘어가 읽는다 · 짝수 없는 01·03 도 트윈', JSON.stringify(t3));
//  ③ 별첨 한 줄 결론
const S = (a, b) => ({ n: a, done: b });
const sum = (s20, s40) => ({ '20': s20, '40': s40, '45': S(0, 0), total: S(s20.n + s40.n, s20.done + s40.done) });
ok(M.legendHeadline(sum(S(30, 8), S(10, 10))) === '40피트는 전부 끝, 남은 22대는 모두 20피트', '40 끝 · 20 남음', M.legendHeadline(sum(S(30, 8), S(10, 10))));
ok(M.legendHeadline(sum(S(5, 5), S(5, 5))) === '전부 끝났습니다.', '전부 끝');
ok(/남은 7대/.test(M.legendHeadline(sum(S(5, 2), S(5, 1)))), '둘 다 남음', M.legendHeadline(sum(S(5, 2), S(5, 1))));
//  ④ 소스 배선 — 순서 그대로(정렬 없음) · 11px 이하 글자 없음
const src = fs.readFileSync(path.join(ROOT, 'src/components/LegendMotion.jsx'), 'utf8');
ok(!/\.sort\(/.test(src), '별첨 모션은 앱 순서를 다시 정렬하지 않는다');
ok(!/text-\[\d+px\]/.test(src), '임의 글자 크기 없음');
console.log(`5.02 모션 연막검사: ${pass} 통과 / ${fail} 실패`); process.exit(fail ? 1 : 0);
