// 4.87-05 가상 자리 트윈 연막검사 — ATPR 2651W 10번 베이(9·11) 실데이터로 칸 짝이 없는 엠티가 짝 베이의 남은 엠티와 묶이는지 확인한다.
//   실행 — node tools/smoke_twinvirtual48705.cjs <repoRoot>   (번들 없이 네이티브 ESM 으로 src/twin.js 를 직접 연다 · 네트워크 없음)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 400))); if (!c) bad++; };
(async () => {
  global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
  global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const T = await import(pathToFileURL(path.join(root, 'src/twin.js')).href);
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/atpr2651w_bay10.json'), 'utf8'));
  const mk = (r, extra) => ({ cn: r.cn, bay: r.bay, row: r.row, tier: r.tier, iso: r.iso, fe: r.fe, _mode: 'loading', _comp: r.done, ...(extra || {}) });
  const all = rows.map((r) => mk(r));
  const rem = all.filter((c) => !c._comp);
  const by = (cn) => rem.find((c) => c.cn === cn);
  const find = (c, pool = rem, ex = new Set()) => T.findTwinCandidate(c, pool, ex, '', '');
  // 베이 사전이 없어도 EDI 폴백으로 9·10·11 이 있어야 짝이 선다 — 10번 베이는 40피트 자리라 일부러 한 칸을 넣는다
  const withTen = (pool) => pool.concat([{ cn: 'TEN00000001', bay: '10', row: '01', tier: '82', iso: '4500', fe: 'F', _mode: 'loading', _comp: true }]);

  console.log('[1] 실데이터 — 남은 엠티 22대');
  ok(rem.length === 22, '남은 컨 22대(9번 11 · 11번 11)', String(rem.length));
  const P = withTen(rem);
  const a = find(by('SKLU1945620'), P), b = find(by('SKLU1548557'), P);
  ok(a && a.cn === 'SKLU1548557', '9-01-84 SKLU1945620 은 칸 짝이 없어 11번의 남은 SKLU1548557 과 묶인다', a && a.cn);
  ok(b && b.cn === 'SKLU1945620', '반대쪽도 같다 — 11-06-82 SKLU1548557 ↔ 9-01-84 SKLU1945620', b && b.cn);
  const normal = [['HALU2334203', 'SKLU2416684'], ['TGCU2415767', 'DFSU1455760'], ['TRHU1717443', 'FBIU0073026'], ['SKLU1803436', 'SKLU1307550']];
  for (const [x, y] of normal) { const m = find(by(x), P); ok(m && m.cn === y, `칸 짝이 있는 ${x} 는 종전 그대로 ${y}`, m && m.cn); }
  // 22대를 차례로 묶으면 11쌍이 된다(자동 가이드가 쓰는 used 흐름)
  const used = new Set(); const pairs = [];
  for (const c of rem) { if (used.has(c.cn)) continue; const m = T.findTwinCandidate(c, P, used, '', ''); if (m) { used.add(c.cn); used.add(m.cn); pairs.push([c.cn, m.cn]); } }
  ok(pairs.length === 11 && used.size === 22, '22대가 모두 짝을 찾아 11쌍이 된다', pairs.length + '쌍 ' + used.size + '대');

  console.log('[2] 건드리지 않는 것');
  const f9 = mk({ cn: 'FULL9000001', bay: '9', row: '08', tier: '88', iso: '2200', fe: 'F', done: false });
  const f11 = mk({ cn: 'FULL1100001', bay: '11', row: '05', tier: '88', iso: '2200', fe: 'F', done: false });
  ok(find(f9, withTen(rem.concat([f9, f11]))) === null, '풀은 칸 짝이 없어도 묶지 않는다(가상 자리는 엠티만)');
  const hold = mk({ cn: 'HOLD1100001', bay: '11', row: '03', tier: '04', iso: '220E', fe: 'E', done: false });
  ok(find(by('SKLU1945620'), withTen(rem.concat([hold]))).cn === 'SKLU1548557', '데크 엠티는 홀드 엠티와 묶이지 않는다(데크끼리)');
  const only = [by('SKLU1945620'), mk({ cn: 'HOLD1100002', bay: '11', row: '03', tier: '04', iso: '220E', fe: 'E', done: false })];
  ok(find(only[0], withTen(only), new Set()) === null, '짝 베이에 남은 쪽이 홀드뿐이면 데크 컨은 싱글로 남는다');
  const dis = rem.map((c) => ({ ...c, _mode: 'discharge' }));
  ok(T.findTwinCandidate(dis.find((c) => c.cn === 'SKLU1945620'), withTen(dis), new Set(), '', '') === null, '양하는 종전 그대로 — 칸 짝 없으면 묶지 않는다');
  const f40 = rem.map((c) => (c.cn === 'SKLU1548557' ? { ...c, iso: '4500' } : c));
  ok(find(by('SKLU1945620'), withTen(f40)) === null, '짝 후보가 40피트면 묶지 않는다');
  ok(find(by('SKLU1945620'), withTen(rem), new Set(['SKLU1548557'])) === null, '이미 다른 카드에 묶인 컨(excludeCns)은 쓰지 않는다');
  const withDone = all; // 완료 컨 포함 — 칸 짝이 완료 컨이면 종전 그대로 그 컨을 돌려준다
  const m0 = T.findTwinCandidate(by('SKLU1945620'), withTen(withDone), new Set(), '', '');
  ok(m0 && m0.cn === 'SKLU1825646', '완료 컨까지 넘기는 호출은 종전 그대로(칸 짝 = 완료 컨)', m0 && m0.cn);

  console.log('[3] 줄·단 순서로 1:1');
  const t1 = mk({ cn: 'AAAA0000001', bay: '9', row: '02', tier: '84', iso: '220E', fe: 'E', done: false });
  const c1 = mk({ cn: 'BBBB0000001', bay: '11', row: '08', tier: '84', iso: '220E', fe: 'E', done: false });
  const c2 = mk({ cn: 'BBBB0000002', bay: '11', row: '03', tier: '82', iso: '220E', fe: 'E', done: false });
  const pool = withTen([t1, c1, c2]);
  ok(find(t1, pool).cn === 'BBBB0000002', '남은 쪽이 둘이면 줄·단 순서로 앞에서부터 묶는다', find(t1, pool) && find(t1, pool).cn);

  console.log('[4] 독립 감사 재현 — 어느 쪽에서 물어도 같은 짝 · 완료 컨의 칸 짝을 뺏지 않는다');
  const g = (cn, bay, row, tier, extra) => mk({ cn, bay, row, tier, iso: '220E', fe: 'E', done: false }, extra);
  const A1 = g('AAAA1000001', '9', '01', '82'), A2 = g('AAAA1000002', '9', '05', '82'), B1 = g('BBBB1000001', '11', '04', '82');
  const P4 = withTen([A1, A2, B1]);
  const m1 = find(A1, P4), m2 = find(A2, P4), m3 = find(B1, P4);
  const pairOf = (x, y) => x && y && x.cn === y.cn;
  ok(m1 && m3 && m3.cn === A1.cn && m1.cn === B1.cn, 'A1 ↔ B1 서로 같은 짝(줄 01 이 앞)', [m1 && m1.cn, m3 && m3.cn].join(','));
  ok(m2 === null, '짝이 모자라는 A2 는 싱글로 남는다', m2 && m2.cn);
  const A = g('AAAA2000001', '9', '01', '82'), X = g('BBBB2000001', '11', '05', '82'), XM = g('AAAA2000002', '9', '05', '82', { _comp: true });
  const P5 = withTen([A, X, XM]);
  const ma = T.findTwinCandidate(A, P5, new Set(), '', '');
  ok(ma && ma.cn === X.cn, '칸 짝 XM 이 이미 실려 비었으면 X 는 짝 없는 남은 컨이라 A 와 묶인다(완료 칸은 빈 자리)', ma && ma.cn);
  const mrem = T.findTwinCandidate(A, P5.filter((c) => c.cn !== XM.cn), new Set(), '', '');
  ok(mrem && mrem.cn === X.cn, '완료 컨을 빼고 넘기는 호출(가이드·미르)도 같은 짝', mrem && mrem.cn);
  const noSelf = T.findTwinCandidate(A, P5.filter((c) => c.cn !== A.cn), new Set(), '', '');
  ok(noSelf && noSelf.cn === X.cn, '자기 자신을 빼고 넘기는 호출도 같은 짝', noSelf && noSelf.cn);
  const M = g('BBBB3000001', '11', '01', '82'), O = g('BBBB3000002', '11', '07', '82'), A3 = g('AAAA3000001', '9', '01', '82');
  const mx = T.findTwinCandidate(A3, withTen([A3, M, O]), new Set(['BBBB3000001']), '', '');
  ok(mx === null, '칸 짝이 제외 목록에 든 경우 엉뚱한 컨(O)과 묶지 않는다', mx && mx.cn);

  console.log('[5] 보류 컨이 큐 목록에서 빠져도 다른 컨의 짝이 밀리지 않는다');
  const mkc = (cn, bay, row) => g(cn, bay, row, '84');
  const H = [mkc('H0000000001', '9', '02'), mkc('H0000000002', '11', '02'), mkc('H0000000003', '9', '04'), mkc('H0000000004', '11', '06'), mkc('H0000000005', '9', '08')];
  const Hall = withTen(H);
  const heldX = H[1];   // 11-02 보류 — 9-02 의 칸 짝
  const queuePool = Hall.filter((c) => c.cn !== heldX.cn);
  const viaAll = T.findTwinCandidate(H[2], Hall, new Set(), '', '');
  const viaQueue = T.findTwinCandidate(H[2], queuePool, new Set(), '', '', Hall);
  ok(viaAll && viaQueue && viaAll.cn === viaQueue.cn, '큐 목록(보류 제외)과 전체 목록이 같은 짝', [viaAll && viaAll.cn, viaQueue && viaQueue.cn].join(','));
  const viaQ0 = T.findTwinCandidate(H[0], queuePool, new Set(), '', '', Hall);
  ok(viaQ0 && T.findTwinCandidate(H[0], Hall, new Set(), '', '').cn === heldX.cn ? viaQ0 === null : true, '보류 컨이 칸 짝인 컨은 큐에서 그 보류 컨과 묶지 않는다', viaQ0 && viaQ0.cn);

  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막검사 오류', e); process.exit(1); });
