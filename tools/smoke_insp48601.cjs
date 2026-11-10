// 4.86-01 연막검사 — 검수 리스트의 «특수 묶음»은 컨 종류(리퍼·FR·OT·탱크)만이다. 위험물(DG)·규격초과(OOG)는 일반 풀·엠티 묶음의 컨번호 순서에 들어간다. 실 DXQD 2644E 양하·PCSZ 2622W 선적 위에서 본다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).slice(0, 300) : ''}`); } };
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
(() => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx48601_'));
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_insp486_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/insp48601.json'), 'utf8'));
  const dx = fx.DXQD_2644E_discharge, pc = fx.PCSZ_2622W_loading;

  //  정렬 → 묶음 안 순번·묶음 크기·경계·이웃을 컨 하나마다 계산한다
  const infoOf = (rows) => {
    const s = [...rows].sort(U.inspSortCmp), no = U.inspNumber(s), ed = U.inspEdges(s), m = {};
    s.forEach((c, i) => {
      let j = i; while (j + 1 < s.length && no[j + 1] > no[j]) j++;
      m[c.cn] = { tier: U.inspTierOf(c), no: no[i], size: no[j], edge: ed[i], prev: i ? s[i - 1].cn : '', next: i + 1 < s.length ? s[i + 1].cn : '', i };
    });
    return m;
  };
  const dI = infoOf(dx), pI = infoOf(pc);
  const show = (o) => JSON.stringify(o);

  //  ① DXQD 2644E 양하 — 일반 규격 위험물 한 대(TIIU5420187 · 4.2/1361)는 40HC 일반 풀 묶음의 컨번호 순서에 선다
  const t = dI.TIIU5420187;
  ok('DXQD TIIU5420187(위험물 4.2/1361, 45G1) 은 40HC 일반 풀 묶음 21/24 번', t && t.tier === '40HC' && t.no === 21 && t.size === 24, show(t));
  ok('그 앞뒤 이웃은 컨번호 순서 TGHU6804976 · VPLU5008844 이고 경계선이 없다', t && t.prev === 'TGHU6804976' && t.next === 'VPLU5008844' && t.edge === '', show(t));
  ok('TIIU5420187 과 같은 묶음 첫 줄·끝 줄이 일반 풀(특수가 아님)', (() => { const first = Object.keys(dI).find((k) => dI[k].tier === '40HC' && dI[k].no === 1 && dI[k].size === 24); return !!first && !dx.find((c) => c.cn === first).rf && !dx.find((c) => c.cn === first).fr; })());

  //  ② 리퍼·FR 은 그대로 특수 묶음
  const frs = dx.filter((c) => c.fr);
  ok('DXQD FR 42P3 8대는 40 단계 특수 묶음 1~8/8 · 첫 줄에 굵은 줄', frs.length === 8 && frs.every((c) => dI[c.cn].tier === '40' && dI[c.cn].size === 8) && frs.map((c) => dI[c.cn].no).sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8' && frs.some((c) => dI[c.cn].no === 1 && dI[c.cn].edge === 'gb1'), frs.map((c) => show(dI[c.cn])).join(' '));
  const rfD = dx.filter((c) => c.rf && c.fe === 'F');
  const rfBy = rfD.reduce((a, c) => { const k = dI[c.cn].tier; a[k] = (a[k] || 0) + 1; return a; }, {});
  ok(`DXQD 풀 리퍼 ${rfD.length}대는 단계마다 하나의 특수 묶음(20 단계 ${rfBy['20'] || 0}대 · 40HC 단계 ${rfBy['40HC'] || 0}대)`, rfD.length === 29 && rfBy['20'] === 1 && rfBy['40HC'] === 28 && rfD.every((c) => dI[c.cn].size === rfBy[dI[c.cn].tier]), JSON.stringify(rfBy));
  ok('DXQD 40HC 리퍼 묶음은 BMOU9781755 가 1번이고 굵은 줄', dI.BMOU9781755 && dI.BMOU9781755.no === 1 && dI.BMOU9781755.edge === 'gb1', show(dI.BMOU9781755));

  //  ③ PCSZ 2622W 선적 — 일반 규격 위험물 3대는 일반 풀 묶음, 위험물 리퍼 2대는 리퍼 묶음에 남는다
  const d1 = pI.DFSU3120106, d2 = pI.SKLU2416220, d3 = pI.SKHU6576717;
  ok('PCSZ DFSU3120106(3/2924, 22GP) 는 20 일반 풀 묶음 2/11 번', d1 && d1.tier === '20' && d1.no === 2 && d1.size === 11, show(d1));
  ok('PCSZ SKLU2416220(3/2924, 22GP) 는 20 일반 풀 묶음 9/11 번', d2 && d2.tier === '20' && d2.no === 9 && d2.size === 11, show(d2));
  ok('PCSZ SKHU6576717(2.1/2037, 45GP) 는 40HC 일반 풀 묶음 9/11 번', d3 && d3.tier === '40HC' && d3.no === 9 && d3.size === 11, show(d3));
  const r1 = pI.SKRU6500305, r2 = pI.TEMU9749079;
  ok('PCSZ 위험물 리퍼 SKRU6500305 · TEMU9749079 는 리퍼 특수 묶음 1/2 · 2/2 (굵은 줄은 첫 줄)', r1 && r2 && r1.size === 2 && r2.size === 2 && [r1.no, r2.no].sort().join() === '1,2' && (r1.no === 1 ? r1.edge : r2.edge) === 'gb1', show(r1) + show(r2));

  //  ④ 규격초과(OOG) 표시만 붙은 일반 컨도 특수 묶음으로 가지 않는다 — 일반 풀 한 대에 표시만 덧붙여 비교
  const base = dx.find((c) => c.cn === 'TGHU6804976');
  const cloneOog = { ...base, cn: 'TGHU6804976', oog: true };
  const dI2 = infoOf(dx.map((c) => (c.cn === base.cn ? cloneOog : c)));
  ok('일반 풀 TGHU6804976 에 OOG 표시만 붙여도 같은 묶음 같은 번호(특수로 가지 않는다)', dI2.TGHU6804976.tier === dI.TGHU6804976.tier && dI2.TGHU6804976.no === dI.TGHU6804976.no && dI2.TGHU6804976.size === dI.TGHU6804976.size, show(dI.TGHU6804976) + ' → ' + show(dI2.TGHU6804976));
  const cloneDg = { ...base, dg: true, dgc: '3', un: '1993' };
  const dI3 = infoOf(dx.map((c) => (c.cn === base.cn ? cloneDg : c)));
  ok('일반 풀 TGHU6804976 에 위험물 표시만 붙여도 같은 묶음 같은 번호', dI3.TGHU6804976.no === dI.TGHU6804976.no && dI3.TGHU6804976.size === dI.TGHU6804976.size, show(dI3.TGHU6804976));

  //  ⑤ 인쇄 — 위험물 표기(클래스/UN, 빨강)는 비고에 그대로, 별첨(시트2)에는 위험물이 그대로 들어간다
  const html = U.buildInspectionListDoc(dx, 'discharge', {}, [], {}).html;
  ok('비고에 위험물 표기 «4.2/1361» 이 그대로 찍힌다', html.includes('4.2/1361'), '');
  ok('위험물 TIIU5420187 은 본문과 별첨(특수화물)에 두 번 나온다', (html.match(/TIIU5420187/g) || []).length === 2, (html.match(/TIIU5420187/g) || []).length);
  const html2 = U.buildInspectionListDoc(pc, 'loading', {}, [], {}).html;
  ok('PCSZ 위험물 일반 컨 세 대도 본문 + 별첨으로 두 번씩 나온다', ['DFSU3120106', 'SKLU2416220', 'SKHU6576717'].every((cn) => (html2.match(new RegExp(cn, 'g')) || []).length === 2), ['DFSU3120106', 'SKLU2416220', 'SKHU6576717'].map((cn) => (html2.match(new RegExp(cn, 'g')) || []).length).join());

  //  ⑥ 별첨(시트2)은 종전 그대로 — 독립 감사(2026-11-10)가 짚은 것: 본문의 새 묶음으로 별첨 경계를 그으면 «위험물 일반 컨 → 탱크» 굵은 줄이 새로 생긴다
  const apxOf = (h) => String(h).split('<!--sheet2-->')[1] || '';
  const cnsOf = (h) => [...new Set(String(h).match(/[A-Z]{4}\d{7}/g) || [])];
  for (const [label, rows, mode, doc] of [['DXQD 2644E 양하', dx, 'discharge', html], ['PCSZ 2622W 선적', pc, 'loading', html2]]) {
    const ap = apxOf(doc);
    ok(`${label} 별첨에는 굵은 줄(gb1)이 없다 — 별첨 경계는 단계가 바뀔 때의 두 줄뿐`, ap.length > 0 && !/class="gb1"/.test(ap), (ap.match(/class="gb1"/g) || []).length);
    const rfSet = new Set(rows.filter((c) => c.rf).map((c) => c.cn));
    const got = cnsOf(ap).filter((cn) => !rfSet.has(cn));   // 리퍼 구역을 뺀 «그 밖의 특수화물» 차례
    const byCn = Object.fromEntries(rows.map((c) => [c.cn, c]));
    const want = got.map((cn) => ({ ...byCn[cn], fr: true })).sort(U.inspSortCmp).map((c) => c.cn);   // 종전 판정 = 전 행이 특수 묶음
    ok(`${label} 별첨 차례(리퍼 구역 제외 ${got.length}대)는 종전과 같다 — 단계 → 규격 → F/E → 컨번호`, got.length > 0 && got.join() === want.join(), got.join().slice(0, 120));
  }
  ok('별첨에는 위험물 일반 컨이 그대로 담긴다 (DXQD TIIU5420187 · PCSZ DFSU3120106)', apxOf(html).includes('TIIU5420187') && apxOf(html2).includes('DFSU3120106'));

  console.log(`\n4.86-01 검수 리스트 위험물 특수 묶음 제외 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
