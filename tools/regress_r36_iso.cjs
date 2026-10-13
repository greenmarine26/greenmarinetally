// 회귀 기준표 R36 — 규격이 자료마다 다를 때 «확인 전에는 터미널(EDI) 규격» · L5U0·40OH 를 터미널처럼 45UT(OT)로 읽기(4.25-01). smoke_regress.cjs 가 부른다.
//   검수사 2026-10-14 06:27 (STMJ 2663E CAXU5572234 «EDI L5GP / 선사 42UT / 세관 42UT · 2-06-82» 캡처) «이런 부분도 수정 바랍니다.
//     뭔가 확인이 안될떄는 터미널의 규격을 따릅니다. L5U0 45UT(OT)».
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 터미널 읽기(검수사 원문 «L5U0 45UT(OT)» · 세관·선사 «40OH» = 오픈탑 하이큐브)와
//     실서비스 읽기 사본(2026-10-14 06:40 KST, 18항차 — 수정 전 갈림 4건을 사람이 하나씩 읽어 남긴 목록)에서 왔다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r36_iso.cjs')({ ROOT, TMP, ok, head, fx })
//         단독 — node tools/regress_r36_iso.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

//  수정 전(4.25) 실서비스 사본의 갈림 4건 — 사람이 읽은 판정(남아야 하는 셋 · 사라져야 하는 하나)
const BEFORE = {
  'STMJ_2663E|discharge|CAXU5572234': { stay: false, why: 'EDI L5U0 · 선사·세관 40OH — 셋 다 40피트 하이큐브 오픈탑(터미널 45UT)' },
  'OBWH_2765E|discharge|SPSU2036335': { stay: true, why: 'EDI 22V7(통풍) · 세관 22U6(오픈탑) — 진짜 다름' },
  'OBWH_2765E|discharge|TEMU5280018': { stay: true, why: 'EDI 22V7(통풍) · 세관 22U6(오픈탑) — 진짜 다름' },
  'OBWH_2765E|discharge|TGHU4437784': { stay: true, why: 'EDI 42V1(통풍) · 세관 40HT — 진짜 다름' },
};
//  터미널이 읽는 대로 — 검수사 원문 «L5U0 45UT(OT)» · 오픈탑 하이큐브 «40OH». 진짜 45피트 일반(L5G1)은 그대로 45피트.
const TERM = [
  ['L5U0', '45UT', '40OT', true], ['L5U1', '45UT', '40OT', true], ['40OH', '45UT', '40OT', true],
  ['45U1', '45UT', '40OT', true], ['42U1', '42UT', '40OT', true],
  ['L5G1', 'L5GP', '45HC', false], ['L5GP', 'L5GP', '45HC', false],
];

module.exports = async function r36({ ROOT, TMP, ok, head, fx }) {
  head('R36 규격 갈림 — 확인 전에는 터미널(EDI) 규격 · L5U0·40OH 는 터미널처럼 45UT(OT) · 진단 🔵(음성 없음) · 말 한 벌 (4.25-01)',
    '검수사 2026-10-14 06:27 «뭔가 확인이 안될떄는 터미널의 규격을 따릅니다. L5U0 45UT(OT)» · STMJ 2663E CAXU5572234 캡처 · 실서비스 읽기 사본 2026-10-14 06:40');
  const e = path.join(TMP, 'r36.mjs'), o = path.join(TMP, 'r36.cjs');
  fs.writeFileSync(e, `export * from "${ROOT}/src/utils.js";\nexport { runDiagnostics, isoConflictText, buildVoiceMessage } from "${ROOT}/src/diagnostics.js";\nexport { tallySizeCol } from "${ROOT}/src/tallyReport.js";\nexport { applyNLFilter, parseNaturalQuery } from "${ROOT}/src/nlSearch.js";\nexport { normalizeCntrType } from "${ROOT}/src/loadingEdiExport.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(o);
  const F = fx('iso42501.json');

  //  ① 터미널 읽기 — 규격 글자(spec) · 라벨 · 오픈탑 표식
  {
    const got = TERM.map(([raw]) => {
      const iso = U.normalizeSpecIso(raw) || raw;
      return [raw, U.isoToCustomsSpec(iso, raw), U.isoToLabel(iso), U.isOpenTopIso(raw)];
    });
    const bad = got.filter((g, i) => g[1] !== TERM[i][1] || g[2] !== TERM[i][2] || g[3] !== TERM[i][3]);
    ok(`①-1 터미널처럼 읽는다 — ${got.map((g) => `${g[0]}→${g[1]}(${g[2]})`).join(' · ')} (L5U0·40OH 는 45UT · 진짜 45피트 L5G1 은 그대로 L5GP)`, !bad.length, JSON.stringify(bad));
  }
  //  ② STMJ 2663E CAXU5572234 — 세 자료가 같은 규격(갈림 없음 · 진단 0)
  {
    const S = F.stmj2663e_d; const ed = S.ediContainers.CAXU5572234, lr = S.records.CAXU5572234;
    const tri = U.isoTriad(ed.iso_edi, lr);
    const conf = U.isoConflictOf(ed.iso_edi, lr);
    const dg = U.runDiagnostics({ ediContainers: S.ediContainers, listRecords: S.records, xrayList: {}, mode: 'discharge' }) || [];
    ok(`②-1 CAXU5572234 (2-06-82) — ${tri.map((x) => `${x.name} ${x.raw}→${x.spec}`).join(' / ')} · 갈림 없음 · 진단 «규격이 자료마다 다름» 0 (수정 전 «EDI L5GP / 선사 42UT / 세관 42UT»)`,
      tri.length === 3 && tri.every((x) => x.spec === '45UT' && x.label === '40OT') && conf === null && !dg.some((a) => a.code === 'iso_conflict'),
      JSON.stringify({ tri, conf, dg: dg.map((a) => a.code) }).slice(0, 400));
    ok('②-2 그 컨의 출력 규격은 터미널 글자 45UT · 오픈탑 표식(isOpenTopIso) — EDI 원문 L5U0 그대로 넣어도', U.isoToCustomsSpec(ed.iso) === '45UT' && U.isOpenTopIso(ed.iso) && U.isoToLabel(ed.iso) === '40OT',
      `${U.isoToCustomsSpec(ed.iso)} · ${U.isoToLabel(ed.iso)}`);
  }
  //  ③ 실서비스 사본 전수(2,556 짝 · 조합 62) — 갈림은 수정 전 4건 중 남아야 할 셋만
  {
    const left = [];
    let pairs = 0;
    for (const c of F.combos) {
      pairs += c.n;
      const [edi, ca, cu, pick, pickLbl, rz] = c.t;
      const lr = { iso_carrier: ca, iso_customs: cu, iso_pick: pick, iso_pick_label: pickLbl, _rz: !!rz };
      if (U.isoConflictOf(edi, lr)) for (const ex of c.ex) left.push(ex);
    }
    const want = Object.keys(BEFORE).filter((k) => BEFORE[k].stay).sort();
    ok(`③-1 실서비스 사본 전수 ${pairs}짝 — 갈림 ${left.length}건 = 수정 전 4건 중 남아야 할 셋(${want.map((k) => k.split('|')[2]).join(' · ')}) · 사라진 하나 CAXU5572234`,
      JSON.stringify(left.sort()) === JSON.stringify(want), `${left.join(' , ')}`);
  }
  //  ④ 진단 — 남은 갈림은 🔵 정보(음성 없음) · «터미널(EDI) 규격을 따름» · 단추·줄이 같은 말
  {
    const O = F.obwh2765e_d;
    const dg = U.runDiagnostics({ ediContainers: O.ediContainers, listRecords: O.records, xrayList: {}, mode: 'discharge' }) || [];
    const h = dg.find((a) => a.code === 'iso_conflict');
    const spoken = U.buildVoiceMessage(dg);   // 음성 안내 문장(경고·위험만 읽는다)
    ok(`④-1 OBWH 2765E 양하 — 진단 «${h ? h.msg : '(없음)'}» · 등급 ${h ? h.level : '?'} · 음성 없음 · 대수 3`,
      !!h && h.level === 'info' && h.voice === '' && h.count === 3 && /터미널\(EDI\) 규격을 따름/.test(h.msg) && !/규격 불일치/.test(String(spoken || '')),
      JSON.stringify(h && { level: h.level, msg: h.msg, voice: h.voice, count: h.count }));
    const w = h && h.details && h.details[0];
    ok('④-2 진단 줄과 고르기 단추가 같은 말(EDI 를 맨 앞에 — 따르는 규격)', !!w && U.isoConflictText(w) === w.srcs.map((x) => `${x.name} ${x.spec}`).join(' / ') && w.srcs[0].k === 'edi',
      w ? U.isoConflictText(w) : '');
  }
  //  ⑥ 크기 한 벌 — 같은 컨을 화면·카고플랜·마감텔리·미르·피트 계산이 같은 크기로 센다(4.25-01 감사 상 — 라벨만 바꾸면 마감텔리·미르 «45피트» 는 45' 로 남았다)
  {
    const S = F.stmj2663e_d; const ed = S.ediContainers.CAXU5572234;
    const row = { ...ed, iso: ed.iso };
    const tCol = U.tallySizeCol(row), feet = U.isoFeet(ed.iso), ct = U.normalizeCntrType(ed.iso) || {};
    //  미르 질문 길 그대로 — 말을 풀어(parseNaturalQuery) 거른다(applyNLFilter)
    const q40 = U.parseNaturalQuery('40피트'), q45 = U.parseNaturalQuery('45피트');
    const in40 = U.applyNLFilter([row], q40).length, in45 = U.applyNLFilter([row], q45).length;
    const real45 = { cn: 'TEST4500001', iso: 'L5G1' };
    const r45 = U.applyNLFilter([real45], q45).length, r40 = U.applyNLFilter([real45], q40).length;
    ok(`⑥-1 L5U0 크기 한 벌 — 마감텔리 칸 ${tCol}(45U1 과 같은 HC) · 피트 ${feet} · EDI 내보내기 ${ct.len}${ct.high ? ' HC' : ''} · 미르 «40피트» ${in40} / «45피트» ${in45} (진짜 45피트 L5G1 은 «45피트» ${r45} / «40피트» ${r40} · 마감텔리 ${U.tallySizeCol(real45)})`,
      tCol === 'HC' && tCol === U.tallySizeCol({ iso: '45U1' }) && feet === 40 && ct.len === '40' && !!ct.high && in40 === 1 && in45 === 0 && r45 === 1 && r40 === 0 && U.tallySizeCol(real45) === '45',
      JSON.stringify({ tCol, feet, ct, in40, in45, r45, r40 }));
    ok('⑥-2 L 오픈탑 판정은 숫자 높이 자리가 있을 때만 — «LUG1» 같은 글자는 안 잡는다', U.isTermOtL('L5U0') && U.isTermOtL('L2U1') && !U.isTermOtL('LUG1') && !U.isTermOtL('L5G1') && U.isLen45Iso('L5G1') && !U.isLen45Iso('L5U0'));
  }
  //  ⑦ 터미널 숫자 표기 — 검수사 07:06 «CAXU5571916 터미널 4550으로 표기 된건입니다» · «컨넘버로 보아 같은건 같습니다»: L5U0 ≡ 4550 ≡ 45U1(40피트 하이큐브 오픈탑).
  //     옛 숫자 ISO 셋째 자리 5(50~59)는 오픈탑 — 4550·2250·2251(풀)과 455E·225E(엠티 표식)가 같은 답. 일반·리퍼 숫자 코드는 그대로.
  {
    const sig = (v) => [U.isoToLabel(v), U.isoToCustomsSpec(v), U.isOpenTopIso(v), U.tallySizeCol({ iso: v })].join('/');
    const same = ['L5U0', '4550', '455E', '4551', '45U1'].map((v) => [v, sig(v)]);
    const want40 = '40OT/45UT/true/HC';
    const ot20 = ['2250', '2251', '225E', '22U1'].map((v) => [v, sig(v)]);
    const keep = [['4500', '40HC/45GP/false/HC'], ['4530', '40RH/45RE/false/HC'], ['2200', '20DC/22GP/false/20'], ['L5G1', '45HC/L5GP/false/45']].map(([v, w]) => [v, sig(v), w]);
    ok(`⑦-1 터미널 숫자 표기 — ${same.map(([v, g]) => `${v} ${g}`).join(' · ')} 가 한 답(40OT/45UT/오픈탑/HC) · 20피트 ${ot20.map(([v, g]) => `${v} ${g}`).join(' · ')} · 일반·리퍼 그대로(${keep.map(([v, g]) => `${v} ${g}`).join(' · ')})`,
      same.every(([, g]) => g === want40) && ot20.every(([, g]) => g === '20OT/22UT/true/20') && keep.every(([, g, w]) => g === w),
      JSON.stringify({ same, ot20, keep }));
    //  EDI 파서 화면 글자(tp) — 실 EDI 그 줄(STMJ 2663E 양하 LOC+147+0020682 · EQD+CN+CAXU 5572234+L5U0) 그대로 읽는다(4.18-02 «45'HC» 가 아니라 45U1 과 같은 «40'HC»)
    const edi = "UNB+UNOA:2+SIT+PTK+261013:1035+1'UNH+1+BAPLIE:D:95B:UN:SMDG20'BGM++1+9'TDT+20+2663E+++SIT:172:20+++:::STMJ'LOC+5+CNTAO'LOC+61+KRPTK'LOC+147+0020682::5'MEA+WT++KGM:16400'LOC+6+CNTAO'LOC+12+KRPTK'RFF+BM:1'EQD+CN+CAXU 5572234+L5U0+++5'NAD+CA+SIT:172:20'LOC+147+0010288::5'MEA+WT++KGM:20000'LOC+6+CNTAO'LOC+12+KRPTK'RFF+BM:1'EQD+CN+FBIU 7921480+L5G1+++5'NAD+CA+SIT:172:20'UNT+20+1'UNZ+1+1'";
    const pr = U.parseBAPLIE(edi);
    const byCn = Object.fromEntries((pr.containers || []).map((c) => [c.cn, c]));
    ok(`⑦-2 EDI 파서 화면 글자 — CAXU5572234 L5U0 «${(byCn.CAXU5572234 || {}).tp}»(45U1 과 같은 40'HC) · 진짜 45피트 FBIU7921480 L5G1 «${(byCn.FBIU7921480 || {}).tp}»`,
      (byCn.CAXU5572234 || {}).tp === "40'HC" && (byCn.FBIU7921480 || {}).tp === "45'HC", JSON.stringify(Object.values(byCn).map((c) => [c.cn, c.iso, c.tp])));
    //  화면 규격 글자(isoShown — 컨 상세·미르·진단·인쇄) — 검수사 07:11 «45UT로 표기하게 해주고 이번 마감텔리가 나오면 그걸로 확정하겠습니다».
    //    L5U0 만 45UT 로 보이고, 진짜 45피트·4.20-01 표식 글자(4530 → 45R1 · 453E → 45RE)·받은 값 그대로인 것은 종전 그대로.
    const shown = [['L5U0', '45UT'], ['l5u0', '45UT'], ['L5G1', 'L5G1'], ['45U1', '45U1'], ['4530', '45R1'], ['453E', '45RE'], ['450E', '45GE'], ['22G1', '22G1']].map(([v, w]) => [v, U.isoShown(v), w]);
    ok(`⑦-3 화면 규격 글자 — ${shown.map(([v, g]) => `${v} «${g}»`).join(' · ')} (L5U0 만 45UT · 나머지 종전 그대로)`,
      shown.every(([, g, w]) => g === w), JSON.stringify(shown));
  }
  //  ⑤ 말 한 벌 — 진단 패널·미르·작업카드·컨 상세(옛 말 «실물을 보기 전에는 확정할 수 없습니다» 가 남지 않는다)
  {
    const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
    const why = U.ISO_CONFLICT_WHY || '';
    const files = ['src/components/DiagnosticsPanel.jsx', 'src/nlSearch.js'];
    const cards = ['src/components/ContainerDetailModal.jsx', 'src/components/GuidedWorkPanel.jsx'];
    const okWhy = /확인 전에는 터미널\(EDI\) 규격을 따릅니다/.test(why) && files.every((f) => /ISO_CONFLICT_WHY/.test(src(f)) && !/실물을 보기 전에는 확정할 수 없습니다/.test(src(f)));
    const okCard = cards.every((f) => /터미널\(EDI\) \$\{srcs\.find\(x => x\.k === 'edi'\)\.spec\} 을 따릅니다/.test(src(f)));
    ok(`⑤-1 말 한 벌 — utils.ISO_CONFLICT_WHY «${why.slice(0, 40)}…» 를 진단 패널·미르가 부르고, 작업카드·컨 상세 머리는 «터미널(EDI) ○○ 을 따릅니다»`, okWhy && okCard, JSON.stringify({ okWhy, okCard }));
  }
};

//  단독 실행 — node tools/regress_r36_iso.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'r36_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx })
    .then(() => { console.log(`\nR36 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R36 오류', e && e.stack || e); process.exit(1); });
}
