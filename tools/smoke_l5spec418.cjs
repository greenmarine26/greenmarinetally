// 4.18-02 연막검사 — 45피트(950E·9500·L5G1·L5GE) 규격이 비지 않는가. 실제 마감텔리 선적 EDI(OBWH 2698W PTK.EDI)와 OBWH 2762W 실제 선적(엠티 45피트 44대)으로 잰다. 쓰기 없음.
//   실행 — node tools/smoke_l5spec418.cjs <repoRoot>
process.env.TZ = 'Asia/Seoul';
const path = require('path'); const fs = require('fs');
const root = process.argv[2] || process.cwd();
(async () => {
  let bad = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  const U = await import(path.resolve(root, 'src/utils.js'));
  const T = await import(path.resolve(root, 'src/tallyReport.js'));
  const edi = fs.readFileSync(path.join(root, 'tools/fixtures/obwh2698w_ptk.edi'), 'utf8');
  const P = U.parseBAPLIE(edi);
  const l5 = P.containers.filter((c) => /^(95|L5)/.test(c.iso));
  ok(l5.length > 0, `실제 EDI 에 45피트 코드 ${l5.length}대`);
  ok(l5.every((c) => c.tp === "45'HC"), '45피트 코드는 규격 글자 «45\'HC» 가 채워진다');
  ok(P.containers.every((c) => !!c.tp), `EDI ${P.containers.length}대 모두 규격 글자가 있다(빈 곳 0)`);
  ok(P.containers.filter((c) => /^45/.test(c.iso)).every((c) => c.tp === "40'HC") && P.containers.filter((c) => /^22/.test(c.iso)).every((c) => c.tp === "20'GP"), '20·40 규격 글자는 종전 그대로');
  for (const i of ['950E', '9500', 'L5G1', 'L5GE']) ok(U.isoToLabel(i) === '45HC' && T.tallySizeCol({ iso: i }) === '45', `${i} → 라벨 45HC · 마감텔리 45' 칸`);
  const FX = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/closingedi_obwh2762.json'), 'utf8'));
  const cnt = {};
  for (const v of Object.values(FX.loading.ediContainers)) { const k = T.tallySizeCol(v) + v.fe; cnt[k] = (cnt[k] || 0) + 1; }
  ok(cnt['45E'] === 44 && cnt.HCE === 100 && cnt.HCF === 27 && cnt['20E'] === 112 && cnt['20F'] === 4, `OBWH 2762W 마감텔리 칸 = 마감텔리 엑셀 OS-OUT (20실4·20공112·40실27·40공100·45공44) → ${JSON.stringify(cnt)}`);
  const cs = {};
  for (const v of Object.values(FX.loading.ediContainers)) { const k = T.emptySealSpecTally(v); cs[k] = (cs[k] || 0) + 1; }
  ok(cs.L5GE === 44 && (cs['45GE'] || 0) + (cs['45RE'] || 0) === 127 && cs['45RE'] === 21 && (cs['20E'] || 0) + (cs['20RE'] || 0) === 116 && !cs['40E'], `규격 글자 = 마감텔리 칸 전체 287 (45' L5GE 44 · HC 127 중 리퍼 RH 21 = 엑셀 RH 20+1 · 20' 116) → ${JSON.stringify(cs)}`);
  ok(T.emptySealSpecTally({ iso: '4200', fe: 'E' }) === '40E' && T.emptySealSpecTally({ iso: '450E', fe: 'E' }) === '45GE' && T.emptySealSpecTally({ iso: '950E', fe: 'E' }) === 'L5GE' && T.emptySealSpecTally({ iso: '' }) === '-', '일반 40\' 엠티는 40E · 40HC 엠티는 45GE · 45피트 엠티는 L5GE · 규격 없으면 -');
  const gw = fs.readFileSync(path.join(root, 'src/components/GuidedWorkPanel.jsx'), 'utf8');
  ok(/c\.tp \|\| isoToLabel\(c\.iso\) \|\| c\.iso/.test(gw) && !/\{c\.tp \|\| c\.iso\}/.test(gw), '자동 가이드는 규격 글자가 비어도 공통 규격 판정으로 보인다(950E 그대로 안 나옴)');
  console.log(bad ? `✗ ${bad}건 실패` : '✓ 전부 통과'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
