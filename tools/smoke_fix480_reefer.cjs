// 4.80 연막검사 — 검수 리스트 별첨 리퍼 구역(베이 순서 · 셋팅온도 옆 실제 온도 빈칸 · 그 밖의 특수화물은 아래 따로)
//   검수사 2026-11-08 «검수 리스트 중에 맨뒤에 있는 리퍼리스트를 베이순으로 해주시고 셋팅온도 옆에 실제 온도를 입력할수 있게 빈칸» · «별첨 특수화물에서 OT FR을 리퍼리스트를 위에 올리고 특수 화물은 리퍼 리스트 맨아래에 따로 표기»
//   실자료 tools/fixtures/reefer480_djct0227e_loading.json = DJCT 0227E 선적 EDI(RTDB 읽기 사본 · 리퍼 26 · 위험물 5). 실소스 번들(inspectionList·reeferList)로 돌린다.
//   실행 — node tools/smoke_fix480_reefer.cjs <번들.cjs> <루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const M = require(path.resolve(OUT));
let bad = 0, pass = 0;
const T = (c, why) => { if (c) pass++; else { bad++; console.error('  ✗ ' + why); } };
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/reefer480_djct0227e_loading.json'), 'utf8')).containers;
const clone = (o) => JSON.parse(JSON.stringify(o));
const info = { vsl: 'DJCT', voy: '0227E' };
const doc = (cs, opts) => M.buildInspectionListDoc(cs, 'loading', info, [], opts || { appendix: true }).html;
const sheet2 = (h) => { const i = h.indexOf('<!--sheet2-->'); return i < 0 ? '' : h.slice(i); };
const cellsOf = (tr) => (tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []).map((x) => x.replace(/<[^>]*>/g, '').trim());
const rfRows = (s2) => (s2.match(/<table class="ilist rflist">[\s\S]*?<\/table>/g) || []).flatMap((t) => (t.match(/<tr style[\s\S]*?<\/tr>/g) || []).map(cellsOf));
const isRf = (c) => M.isReeferTarget(c);

// ① 실자료 — 리퍼 구역이 위, 베이 순서, 실제 온도 빈칸, 셋팅온도는 리퍼 온도 리스트와 같은 값
const h1 = doc(FX); const s1 = sheet2(h1);
const rf = rfRows(s1);
const nRf = FX.filter((c) => M.isReeferTarget(c)).length;
T(rf.length === nRf && nRf >= 20, `리퍼 구역 줄 수 ${rf.length} = 리퍼 ${nRf}`);
const posOk = rf.every((r, i) => i === 0 || (rf[i - 1][5] || '￿') <= (r[5] || '￿'));
T(posOk, '리퍼 구역이 위치(베이→열→단) 오름차순');
T(/<td class="act"><\/td>/g.test(s1) && (s1.match(/<td class="act"><\/td>/g) || []).length === rf.length, '줄마다 실제 온도 빈칸 한 칸');
const lst = M.reeferListRows(FX.map((c) => ({ ...c })));
const byCn = Object.fromEntries(lst.map((r) => [r.cn, r]));
T(rf.every((r) => byCn[r[1]] && (r[6] === (M.temp1(byCn[r[1]].set) || '-'))), '셋팅온도 값이 reeferListRows 와 같다');
T(rf.every((r) => byCn[r[1]] && r[5] === (byCn[r[1]].pos)), '위치 값이 reeferListRows 와 같다');
T(!/℃/.test((s1.match(/<table class="ilist rflist">[\s\S]*?<\/table>/g) || []).join('')), '리퍼 구역 비고에 온도 문구가 겹쳐 찍히지 않는다');
const iRf = s1.indexOf('리퍼 리스트 '), iOt = s1.indexOf('그 밖의 특수화물 ');
T(iRf > 0 && iOt > iRf, '«리퍼 리스트» 소제목이 «그 밖의 특수화물» 보다 위');
T(/리퍼 리스트 26대/.test(s1) && /그 밖의 특수화물 5대/.test(s1) && /\[별첨\] 특수화물 31대/.test(s1), '제목은 31대 유지 · 구역 소제목은 26·5 로 나눠 센다');
const otPart = s1.slice(iOt); const otCn = (otPart.match(/<td class="cn">([A-Z]{4}\d{7})<\/td>/g) || []).map((x) => x.replace(/<[^>]*>/g, ''));
T(otCn.length === 5 && otCn.every((cn) => !rf.some((r) => r[1] === cn)), '아래 구역엔 리퍼가 없고 5대가 있다');
// 같은 컨번호가 별첨에 두 번 나오지 않는다(중복 표시 금지)
const allCn = (s1.match(/<td class="cn">([A-Z]{4}\d{7})<\/td>/g) || []);
T(new Set(allCn).size === allCn.length && allCn.length === 31, '별첨 31대가 한 번씩만');

// ② 리퍼이면서 위험물 — 리퍼 구역에 두고 비고에 DG 표기
const fx2 = clone(FX); const t = fx2.find((c) => M.isReeferTarget(c)); t.dg = true; t.dgc = '9'; t.un = '3480';
const r2 = rfRows(sheet2(doc(fx2))); const row = r2.find((r) => r[1] === t.cn);
T(row && /9\/3480/.test(row[8]) && !/℃/.test(row[8]), '리퍼+DG 는 리퍼 구역에서 비고에 DG 가 남는다');
T((sheet2(doc(fx2)).match(new RegExp(t.cn, 'g')) || []).length === 1, '리퍼+DG 가 아래 구역에 또 나오지 않는다');

// ③ 위치 없는 컨은 맨 뒤
const fx3 = clone(FX); let k = 0;
for (const c of fx3) { if (M.isReeferTarget(c) && k < 3) { for (const f of ['bay', 'row', 'tier', 'pos', 'deckPos', 'bay_plan', 'row_plan', 'tier_plan']) delete c[f]; k++; } }
const r3 = rfRows(sheet2(doc(fx3)));
const blanks = r3.filter((r) => !r[5]).length;
T(blanks >= 1 && r3.slice(-blanks).every((r) => !r[5]) && r3.slice(0, r3.length - blanks).every((r) => r[5]), `위치 없는 ${blanks}대는 맨 뒤`);

// ④ 리퍼가 없으면 종전 별첨 — 구역 소제목·리퍼 표·빈칸이 없다
const fx4 = FX.filter((c) => !M.isReeferTarget(c));
const s4 = sheet2(doc(fx4));
T(/\[별첨\] 특수화물 5대/.test(s4) && !/rflist|apxbar|act"/.test(s4), '리퍼 없음 — 별첨은 종전 그대로(구역 소제목 없음)');
// ⑤ 특수화물이 리퍼뿐이면 아래 구역 없음
const fx5 = FX.filter((c) => M.isReeferTarget(c) || !(c.dg || c.fr || c.ot || c.tk || c.oog));
const s5 = sheet2(doc(fx5));
T(/리퍼 리스트 26대/.test(s5) && !/그 밖의 특수화물/.test(s5) && !/<table class="ilist">/.test(s5), '리퍼뿐 — 아래 구역 없음');
// ⑥ appendix:false — 별첨 없음
T(!/<!--sheet2-->/.test(doc(FX, { appendix: false })), 'appendix:false 는 별첨을 내지 않는다');

// ⑦ 쪽 넘김 — 리퍼 130 + 그 밖 40 : 소제목마다 뒤에 줄이 있고, 쪽마다 높이 예산 안
const base = FX.find((c) => M.isReeferTarget(c));
const many = [];
for (let i = 0; i < 130; i++) many.push({ ...clone(base), cn: 'TRZU' + String(1000000 + i), bay: String(2 + 2 * (i % 20)).padStart(2, '0') });
const dg = FX.filter((c) => c.dg);
for (let i = 0; i < 40; i++) many.push({ ...clone(dg[i % dg.length]), cn: 'ZZZU' + String(1000000 + i) });
const s7 = sheet2(doc(many));
const pages = s7.split('<div class="ipage">').slice(1);
T(pages.length >= 2, `큰 배는 별첨이 두 쪽 이상 (${pages.length}쪽)`);
T(pages.every((p) => (p.match(/<div class="apxbar">/g) || []).every((_, i, a) => true)), '쪽 구조 확인');
const afterBar = s7.split('<div class="apxbar">').slice(1);
T(afterBar.length >= 3 && afterBar.every((seg) => /<tr style/.test(seg.slice(0, seg.indexOf('</table>') + 8))), '소제목 막대 뒤에는 늘 줄이 따라온다(홀로 남지 않음)');
T(/\(이어서\)/.test(s7), '리퍼 구역이 다음 쪽으로 넘어가면 «(이어서)»');
const rf7 = rfRows(s7); T(rf7.length === 130 && rf7.every((r, i) => i === 0 || r[5] >= rf7[i - 1][5]), '130대 전부 베이 순서로 한 번씩');
T((s7.match(/<td class="cn">ZZZU/g) || []).length === 40, '그 밖 40대 전부');
// ⑧ 같은 판정 한 벌 — 위치 키·셋팅 읽기는 reeferList 가 내보낸 것을 쓴다
const SRC = fs.readFileSync(path.join(ROOT, 'src/inspectionList.js'), 'utf8'), RL = fs.readFileSync(path.join(ROOT, 'src/reeferList.js'), 'utf8');
T(/reeferOrderKey/.test(SRC) && /reeferSetOf/.test(SRC) && /reeferPosOf/.test(SRC), '검수 리스트가 reeferList 의 위치·셋팅 읽기를 가져다 쓴다');
T(/reeferOrderKey\(a\.pos, a\.cn\)/.test(RL) && /set: reeferSetOf\(c\)/.test(RL), 'reeferListRows 도 같은 함수를 쓴다');
const U = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
T(/APP_VERSION = 'TallyOne 4\.(80|81|82|83|84|85)(-\d\d)?'/.test(U) && /APP_NOTE = '4\.(80|81|82|83|84|85)(-\d\d)? [^']*'/.test(U), 'APP_VERSION 4.80~4.81(-NN) · APP_NOTE');
const note = (U.match(/APP_NOTE = '([^']*)'/) || [])[1] || ''; T((note.match(/[.!?](\s|$)/g) || []).length <= 2 && !/[\/']/.test(note), 'APP_NOTE 두 문장 이내·작은따옴표 슬래시 없음');
const HELP = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
T(/4\.80~? ?별첨 리퍼|\*\*4\.80~ 검수 리스트 별첨/.test(HELP) && !/인건비|급여/.test(note), '매뉴얼에 4.80 별첨 리퍼 절');
// 인건비·급여 금지
T(!/인건비|급여/.test(sheet2(h1)), '별첨에 «인건비»·«급여» 없음');
console.log(bad ? `✗ 4.80 별첨 리퍼 연막 실패 ${bad}건 (통과 ${pass})` : `✓ 4.80 별첨 리퍼 연막 통과 ${pass}건`);
process.exit(bad ? 1 : 0);
