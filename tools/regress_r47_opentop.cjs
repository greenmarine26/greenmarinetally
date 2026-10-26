// 회귀 기준표 R47 — 오픈탑 표기 한 벌: 20HT·40HT·25OT·연태 V코드(22V7·42V1)는 오픈탑 · 하이큐 오픈탑은 25UT·«하이큐 오픈탑» · 드문 표기(22U6)는 흔한 22UT 로 보여 주기 (4.52). smoke_regress.cjs 가 부른다.
//   검수사 2026-10-26 08:51 «오픈탑중에 일반 20OT와 20 하이큐 OT이 있는데 표기가 여러개 입니다» · 09:10 «앱에서 하나는 오픈탑으로 잡는데 하나는 일반하이큐로 잡는듯 합니다» ·
//     09:14 «다시고르기를 선택할것이 없습니다 둘다 틀리고 기본 지정된것이 맞기때문입니다» · 09:16 «오픈탑으로 잡고 하이큐 오픈탑으로 표기 하면 되는것인데» ·
//     09:20 «보통 20OT나 22UT는 많이 사용하는데 20U6는 잘 사용안합니다»(22U6).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 실 컨의 EDI·세관 원문(OBWH 2775E 실 DB 읽기 · 2765E 실서비스 사본 · 터미널 적부도 2715E · 연태 메일 2735E)에서 왔다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r47_opentop.cjs')({ ROOT, TMP, ok, head, fx })
//         단독 — node tools/regress_r47_opentop.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

//  실 컨 — [컨번호, EDI 원문, 세관 원문, 출처]. 전부 연태훼리(YTF) 컨이고 EDI 는 V코드, 세관·메일·터미널 적부도는 오픈탑 표기다.
const REAL = [
  ['TEMU5279995', '22V7', '22U6', 'OBWH 2775E 양하 — 세관 22U6 (20OT)'],
  ['TEMU4984732', '22V7', '20HT', 'OBWH 2775E 양하 — 세관 20HT (하이큐 오픈탑)'],
  ['SPSU2036335', '22V7', '22U6', 'OBWH 2765E 양하 실서비스 사본'],
  ['TEMU5280018', '22V7', '22U6', 'OBWH 2765E 양하 실서비스 사본'],
  ['TGHU4437784', '42V1', '40HT', 'OBWH 2765E 양하 실서비스 사본 — 세관 40HT'],
  ['TEMU5262185', '22V7', '20HT', 'OBWH 2735E 연태 메일 «TEMU5262185 20HT» · 세관 20HT'],
];

module.exports = async function r47({ ROOT, TMP, ok, head, fx }) {
  head('R47 오픈탑 표기 한 벌 — 20HT·40HT·25OT·연태 V코드(22V7·42V1)는 오픈탑 · 하이큐 오픈탑은 25UT·«하이큐 오픈탑» · 22U6 은 흔한 22UT 로 보여 줌 · 고르라는 물음 없음 (4.52)',
    '검수사 2026-10-26 08:51~09:20 · OBWH 2775E TEMU4984732·TEMU5279995 실 DB · 2765E 실서비스 사본 · 터미널 적부도 2715E FBLU3030260 «20HT» · 연태 메일 2735E');
  const e = path.join(TMP, 'r47.mjs'), o = path.join(TMP, 'r47.cjs');
  fs.writeFileSync(e, `export * from "${ROOT}/src/utils.js";\nexport { runDiagnostics, isoConflictText } from "${ROOT}/src/diagnostics.js";\nexport { tallySizeCol } from "${ROOT}/src/tallyReport.js";\nexport { defaultGetSelfMark } from "${ROOT}/src/cargoPlanCore.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(o);
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

  //  ① 실 컨 여섯 — 세 자료가 같은 오픈탑 · 갈림 없음 · 오픈탑 표식
  {
    const rows = REAL.map(([cn, edi, cus]) => {
      const lr = { iso_customs: cus };
      const tri = U.isoTriad(edi, lr);
      return { cn, edi, cus, labels: tri.map((x) => x.label).join('/'), specs: tri.map((x) => `${x.name} ${x.spec}`).join(' · '), conf: U.isoConflictOf(edi, lr), hconf: U.isoOtHeightConflict(tri), otEdi: U.isOpenTopIso(edi), otCus: U.isOpenTopIso(cus) };
    });
    const bad = rows.filter((r) => r.conf !== null || r.hconf || !/^(20OT\/20OT|40OT\/40OT)$/.test(r.labels) || !r.otEdi || !r.otCus);
    ok(`①-1 실 컨 ${REAL.length}대 — ${rows.map((r) => `${r.cn.slice(-4)} ${r.edi}/${r.cus}→${r.labels.split('/')[0]}`).join(' · ')} · 갈림 0 · 점검요망 0 · 오픈탑 표식 둘 다 (수정 전 «규격이 자료마다 다름»)`, !bad.length, JSON.stringify(bad));
    const hc = rows.find((r) => r.cn === 'TEMU4984732'), plain = rows.find((r) => r.cn === 'TEMU5279995');
    ok(`①-2 TEMU4984732 세관 20HT → 규격 글자 «${hc.specs}» (하이큐 25UT) · TEMU5279995 세관 22U6 → «${plain.specs}» (22UT) — 높이를 낮춰 적지 않는다`,
      /세관 25UT/.test(hc.specs) && /EDI 22UT/.test(hc.specs) && /세관 22UT/.test(plain.specs), hc.specs + ' | ' + plain.specs);
  }
  //  ② 표기 판독 표 — 라벨 · 오픈탑 · 하이큐 오픈탑 · 화면 글자
  {
    //  [원문, 라벨, 오픈탑, 하이큐, 화면 글자(isoShown)]
    const T = [
      ['20HT', '20OT', true, true, '25UT'], ['40HT', '40OT', true, true, '45UT'], ['25OT', '20OT', true, true, '25OT'],
      ['25U1', '20OT', true, true, '25U1'], ['22U6', '20OT', true, false, '22UT'], ['22V7', '20OT', true, false, '22UT'], ['42V1', '40OT', true, false, '42UT'],
      ['22UT', '20OT', true, false, '22UT'], ['20OT', '20OT', true, false, '20OT'], ['22U1', '20OT', true, false, '22U1'], ['42U1', '40OT', true, false, '42U1'],
      ['45U1', '40OT', true, true, '45U1'], ['L5U0', '40OT', true, true, '45UT'], ['40OH', '40OT', true, true, '40OH'], ['4550', '40OT', true, true, '4550'],
      ['22V0', '20VH', false, false, '22V0'], ['42V0', '40VH', false, false, '42V0'], ['20HC', '20HC', false, false, '20HC'], ['25G1', '20DC', false, false, '25G1'], ['22G1', '20DC', false, false, '22G1'],
    ];
    const got = T.map(([raw]) => [raw, U.isoToLabel(raw), U.isOpenTopIso(raw), U.isHcOpenTopIso(raw), U.isoShown(raw)]);
    const bad = got.filter((g, i) => g.some((v, k) => v !== T[i][k]));
    ok(`②-1 표기 판독 — ${got.map((g) => `${g[0]}→${g[1]}${g[2] ? '·OT' : ''}${g[3] ? '·하이큐' : ''}·${g[4]}`).join(' ')} (통풍 22V0·42V0 은 종전 20VH·40VH 그대로)`, !bad.length, JSON.stringify(bad));
  }
  //  ③ 진짜 갈림은 그대로 — V코드가 오픈탑이라는 것뿐, 다른 규격과 섞이면 여전히 묻는다
  {
    const c1 = U.isoConflictOf('22V7', { iso_customs: '22GP' });          // 연태 V7 인데 세관은 일반 컨
    const c2 = U.isoConflictOf('42V1', { iso_customs: '40GP' });
    const c3 = U.isoConflictOf('22V0', { iso_customs: '22U6' });          // 진짜 통풍 ↔ 오픈탑
    const c4 = U.isoConflictOf('42V1', { iso_carrier: '40OH', iso_customs: '42UT' });   // 높이 자료 둘이 서로 다르면 V코드가 있어도 점검요망
    const c5 = U.isoConflictOf('42V1', { iso_carrier: '40OT', iso_customs: '40HT' });   // 선사 8'6" ↔ 세관 하이큐 — 높이는 세관·선사가 정한다
    const c6 = U.isoConflictOf('45U1', { iso_carrier: '40OH', iso_customs: '42UT' });   // 4.27-01 종전 «점검요망» 그대로
    const c7 = U.isoConflictOf('22V7', { iso_customs: '40HT' });          // 길이가 다름
    ok(`③-1 진짜 갈림은 남는다 — V7↔22GP ${!!c1} · V1↔40GP ${!!c2} · 22V0↔22U6 ${!!c3} · 42V1+선사 40OH+세관 42UT 점검요망 ${!!c4 && U.isoOtHeightConflict(c4)} · 42V1+선사 40OT+세관 40HT 점검요망 ${!!c5 && U.isoOtHeightConflict(c5)} · 45U1+40OH+42UT 점검요망 ${!!c6 && U.isoOtHeightConflict(c6)} · 22V7↔40HT ${!!c7}`,
      !!c1 && !!c2 && !!c3 && !!c4 && U.isoOtHeightConflict(c4) && !!c5 && U.isoOtHeightConflict(c5) && !!c6 && U.isoOtHeightConflict(c6) && !!c7, JSON.stringify({ c1: !!c1, c2: !!c2, c3: !!c3, c4: !!c4, c5: !!c5, c6: !!c6, c7: !!c7 }));
    //  V코드 + 세관 40HT 하나 → 높이 짝이 없어 조용 · V코드 + 40OT 선사만 → 조용
    ok('③-2 V코드는 높이를 말하지 않는다 — 42V1 + 세관 40HT / 42V1 + 선사 40OT / 22V7 + 세관 20HT 는 조용', !U.isoConflictOf('42V1', { iso_customs: '40HT' }) && !U.isoConflictOf('42V1', { iso_carrier: '40OT' }) && !U.isoConflictOf('22V7', { iso_customs: '20HT' }));
  }
  //  ④ 실서비스 사본 2,556짝 전수 — 갈림은 더 없다 · 진단 0 · 종전 «점검요망» 판정은 그대로
  {
    const F = fx('iso42501.json');
    let pairs = 0; const left = [];
    for (const c of F.combos) {
      pairs += c.n;
      const [edi, ca, cu, pick, pickLbl, rz] = c.t;
      if (U.isoConflictOf(edi, { iso_carrier: ca, iso_customs: cu, iso_pick: pick, iso_pick_label: pickLbl, _rz: !!rz })) for (const x of c.ex) left.push(x);
    }
    ok(`④-1 실서비스 사본 ${pairs}짝 전수 — 규격 갈림 ${left.length}건 (연태 V코드 대 오픈탑 셋 SPSU2036335 · TEMU5280018 · TGHU4437784 가 사라짐)`, left.length === 0, left.join(' , '));
  }
  //  ⑤ 화면·고르기 — 컨 상세가 «하이큐 오픈탑» 을 적고 고르기 목록에 20피트 하이큐 오픈탑이 있다
  {
    const m = src('src/components/ContainerDetailModal.jsx');
    ok('⑤-1 컨 상세 — hcOpenTopOf 로 «하이큐 오픈탑» 표기 · 머리 괄호는 isoShownOf · 고르기 목록(ISO_OPTIONS)에 25U1 «20HC 오픈탑» · ot 표식',
      /import \{ isoShown, hcOpenTopOf, isoShownOf \} from '\.\.\/utils\.js'/.test(m) && /import \{[^}]*pickConfirmLineOf[^}]*\} from '\.\.\/utils\.js'/.test(m) && /\(\{isoShownOf\(c\) \|\| '-'\}\)/.test(m) && /hcOpenTopOf\(c\) && <span[^>]*>하이큐 오픈탑<\/span>/.test(m) && /\{ iso: '25U1', label: '20HC 오픈탑[^']*', flags: \{ ot: true \} \}/.test(m));
    //  고르기가 쓰는 표식 판정(fbPickIso)은 isOpenTopIso 한 벌 — 세관 20HT 를 골라도 ot 표식이 켜진다
    ok('⑤-2 고르기(fbPickIso)는 isOpenTopIso 한 벌 — 세관 원문 20HT 를 골라도 오픈탑 표식(ot)이 켜진다(종전 20HC·ot=false)', /ot: isOpenTopIso\(up\)/.test(src('src/firebase.js')) && U.isOpenTopIso('20HT'));
  }
  //  ⑥ 칩 — 같은 오픈탑 두 대가 «20OT 2» 한 칩(종전 «△ 20OT 1» + «20HC 1»)
  {
    const lbl = (iso) => U.isoToLabel(iso);
    const cnt = ['22U6', '20HT'].map(lbl).filter((l) => l === '20OT').length;
    ok(`⑥-1 OBWH 2775E 칩 — 세관 22U6 · 20HT 두 대의 라벨 «${['22U6', '20HT'].map(lbl).join('» «')}» → 오픈탑 칩 ${cnt}대 (종전 20OT 1 + 20HC 1)`, cnt === 2);
  }
  //  ⑦ «하이큐 오픈탑» 표기 판정 — 규격이 말하거나, 규격이 높이를 안 말하는 V코드일 때 세관·선사 자료가 말하면(고르기 전에도)
  {
    const C = [
      [{ iso: '20HT' }, true], [{ iso: '25U1' }, true], [{ iso: '22V7', iso_customs: '20HT' }, true], [{ iso: '42V1', iso_customs: '40HT' }, true], [{ iso: '22V7', iso_carrier: '25U1' }, true],
      [{ iso: '22V7', iso_customs: '22U6' }, false], [{ iso: '22V7', iso_carrier: '20OT' }, false], [{ iso: '22U6' }, false], [{ iso: '22G1', iso_customs: '20HT' }, false], [{ iso: '22V7' }, false], [null, false],
    ];
    const got = C.map(([c]) => U.hcOpenTopOf(c));
    ok(`⑦-1 하이큐 오픈탑 표기 판정 — ${C.map(([c], i) => `${c ? [c.iso, c.iso_customs || c.iso_carrier || ''].join('/') : 'null'}→${got[i] ? '하이큐' : '-'}`).join(' ')}`, got.every((g, i) => g === C[i][1]), JSON.stringify(got));
  }
  //  ⑧ 머리 괄호 규격 글자 — 하이큐 오픈탑은 22UT·42UT 로 낮춰 적지 않는다(고르기 전 V코드 + 세관 HT 포함)
  {
    const C = [
      [{ iso: '22V7', iso_customs: '20HT' }, '25UT'], [{ iso: '42V1', iso_customs: '40HT' }, '45UT'], [{ iso: '20HT' }, '25UT'], [{ iso: '40HT' }, '45UT'],
      [{ iso: '22V7', iso_customs: '22U6' }, '22UT'], [{ iso: '22V7' }, '22UT'], [{ iso: '22U6' }, '22UT'], [{ iso: '22G1' }, '22G1'], [null, ''],
    ];
    const got = C.map(([c]) => U.isoShownOf(c));
    ok(`⑧-1 머리 괄호 규격 글자 — ${C.map(([c], i) => `${c ? [c.iso, c.iso_customs || ''].join('/') : 'null'}→${got[i]}`).join(' ')}`, got.every((g, i) => g === C[i][1]), JSON.stringify(got));
  }
  //  ⑨ 사본 한 벌 — 마감텔리 칸 · 별첨 줄 · 인쇄 별첨 · 카고플랜 편집기 마크 · 콘앱이 같은 오픈탑 답을 낸다(감사 지적 2026-10-26)
  {
    //  ⑨-1 isAlphaOpenTopIso 는 이번 판이 더한 알파 표기만 — 20HT·40HT·25OT·22V7·42V1 (넓게 읽던 26OT·25OH 는 아니다)
    const A = [['20HT', true], ['40HT', true], ['25OT', true], ['22V7', true], ['42V1', true], ['26OT', false], ['25OH', false], ['22V0', false], ['42V0', false], ['20HC', false], ['22G1', false], ['', false]];
    const gA = A.map(([x]) => U.isAlphaOpenTopIso(x));
    ok(`⑨-1 알파 오픈탑 한 벌 — ${A.map(([x], i) => `${x || '빈칸'}→${gA[i] ? 'OT' : '-'}`).join(' ')}`, gA.every((g, i) => g === A[i][1]) && !U.isOpenTopIso('26OT') && !U.isOpenTopIso('25OH'), JSON.stringify(gA));
    //  ⑨-2 마감텔리 칸 — 40HT 는 종전처럼 HC 칸(라벨이 40HC 에서 40OT 로 바뀌어 빠지던 것) · 20HT 는 20' 칸 · 40OH HC · 일반 40 은 40
    const T = [['40HT', 'HC'], ['40OH', 'HC'], ['20HT', '20'], ['22V7', '20'], ['42V1', '40'], ['45U1', 'HC'], ['40OT', '40'], ['42G1', '40']];
    const gT = T.map(([x]) => U.tallySizeCol({ iso: x }));
    ok(`⑨-2 마감텔리 칸 — ${T.map(([x], i) => `${x}→${gT[i]}`).join(' ')}`, gT.every((g, i) => g === T[i][1]), JSON.stringify(gT));
    //  ⑨-3 별첨 줄(legendCargoCatOf) — EDI 만 있는 V코드·20HT·40HT·25OT 도 OT 줄 · 통풍 22V0·42V0 과 일반은 그대로
    const L = [['22V7', 'OT'], ['42V1', 'OT'], ['20HT', 'OT'], ['40HT', 'OT'], ['25OT', 'OT'], ['22U1', 'OT'], ['22V0', '일반'], ['42V0', '일반'], ['22G1', '일반'], ['45G1', '일반']];
    const gL = L.map(([x]) => U.legendCargoCatOf({ iso: x }));
    ok(`⑨-3 별첨 화물 줄 — ${L.map(([x], i) => `${x}→${gL[i]}`).join(' ')}`, gL.every((g, i) => g === L[i][1]), JSON.stringify(gL));
    //  ⑨-4 카고플랜 편집기 마크 — 오픈탑은 «U» · 통풍·일반은 종전 «o»
    const M = [['22V7', 'U'], ['42V1', 'U'], ['20HT', 'U'], ['40HT', 'U'], ['22U1', 'U'], ['22V0', 'o'], ['22G1', 'o']];
    const gM = M.map(([x]) => U.defaultGetSelfMark({ iso: x, pod: 'KRPTK' }, 'KRPTK'));
    ok(`⑨-4 카고플랜 편집기 마크 — ${M.map(([x], i) => `${x}→${gM[i]}`).join(' ')}`, gM.every((g, i) => g === M[i][1]), JSON.stringify(gM));
    //  ⑨-5 인쇄 별첨·콘앱은 한 벌을 부른다(소스 배선 — 사본 정규식만 남지 않았는지)
    const pr = src('src/components/PrintableCargoPlanV2.jsx'), cone = src('public/cone.html'), ce = src('src/coneCargoPlan.entry.jsx');
    ok('⑨-5 인쇄 별첨 OT 표식 · 콘앱(cone.html 두 경로) · ConeParse 내보내기가 isAlphaOpenTopIso 한 벌을 부른다',
      /c\.ot \|\| c\.oog \|\| isAlphaOpenTopIso\(c\.iso\)\) specialLetter = 'OT'/.test(pr) && /function coneAlphaOt\(iso\)\{[^}]*ConeParse\.isAlphaOpenTopIso/.test(cone)
      && /const ot=\/\^\[24\]\[0-9\]U\/\.test\(iso\)\|\|coneAlphaOt\(iso\);/.test(cone) && /const ot=!!c\.oog\|\|\/\^\[24\]\[0-9\]U\/\.test\(iso\)\|\|coneAlphaOt\(iso\);/.test(cone)
      && (ce.match(/isFlatRackContainer, isAlphaOpenTopIso, restowMapFromDoc,/g) || []).length === 2);
  }
  //  ⑩ 콘앱 행 만들기 세 경로를 **실제 함수로** 돌린다(감사 재판정 2026-10-26 중-A — 보관소 주 경로 _ediRowOf 가 V코드·HT·25OT 를 놓쳤다) + 확정 줄 한 벌 + 드문 코드
  {
    const cone = src('public/cone.html');
    const fnOf = (name) => { const m = cone.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n`)); return m ? m[0] : ''; };
    const names = ['coneIsReefer', 'coneAlphaOt', '_ediRowOf', 'masterRowsAdapter', 'isASC', 'isPtkPort'];
    const parts = names.map(fnOf);
    ok(`⑩-0 cone.html 에서 함수 ${names.length}개 본문을 꺼냈다`, parts.every(Boolean), names.filter((n, i) => !parts[i]).join(','));
    const mk = (win) => new Function('window', 'extractEdiDocDate', `${parts.join('\n')}; return { coneAlphaOt, _ediRowOf, masterRowsAdapter };`)(win, () => '');
    //  [코드, 새 번들에서 오픈탑]
    const Q = [['22V7', true], ['42V1', true], ['20HT', true], ['40HT', true], ['25OT', true], ['22U6', true], ['22UT', true], ['22V0', false], ['42V0', false], ['22G1', false], ['25G1', false], ['45G1', false]];
    const modes = {
      '새 번들': { ConeParse: { isAlphaOpenTopIso: U.isAlphaOpenTopIso } },
      '옛 번들(isAlphaOpenTopIso 없음)': { ConeParse: {} },
      '번들 없음': {},
    };
    for (const [label, win] of Object.entries(modes)) {
      const F = mk(win), fresh = label === '새 번들';
      const viaEdi = Q.map(([x]) => F._ediRowOf({ cn: 'TEMU1234567', iso: x }).ot);
      const viaMaster = F.masterRowsAdapter({ containers: Q.map(([x], i) => ({ cn: 'TEMU' + String(1000000 + i), iso: x, bay: '1', row: '1', tier: '82' })) }, '').rowsAll.map((r) => r.ot);
      //  옛 번들·번들 없음 — 옛 동작 그대로(U 로 시작하는 코드만 오픈탑 · 알파 표기는 못 읽되 죽지 않는다)
      //  _ediRowOf 는 보관소에 저장된 ot 표식을 읽는 길이라 U 코드를 규격에서 다시 읽지 않는다(종전 그대로) — 이번 판이 더한 것은 알파 표기뿐
      const wantEdi = Q.map(([x]) => fresh && U.isAlphaOpenTopIso(x));
      const want = Q.map(([x, v]) => (fresh ? v : /^[24][0-9]U/.test(x)));
      ok(`⑩-1 콘앱 ${label} — _ediRowOf(보관소 주 경로) ot: ${Q.map(([x], i) => `${x}→${viaEdi[i] ? 'OT' : '-'}`).join(' ')}`, viaEdi.every((g, i) => g === wantEdi[i]), JSON.stringify(viaEdi));
      ok(`⑩-2 콘앱 ${label} — masterRowsAdapter(원문 계산 경로) 도 같은 답`, viaMaster.every((g, i) => g === want[i]), JSON.stringify(viaMaster));
    }
    //  표식(ot)·규격초과(oog)가 이미 켜진 보관소 행은 규격이 일반이어도 오픈탑 그대로(번들 상태와 무관)
    const Fn = mk(modes['새 번들']);
    ok('⑩-3 보관소 행에 ot·oog 표식이 있으면 규격과 무관하게 오픈탑(종전 동작 보존)', Fn._ediRowOf({ cn: 'TEMU1234567', iso: '22G1', ot: true }).ot === true && Fn._ediRowOf({ cn: 'TEMU1234567', iso: '22G1', oog: true }).ot === true);
    //  확정 줄 한 벌(컨 상세·작업 카드 공용)
    const E = fx('ot452_ytf_opentop.json').E_TEMU4984732_picked;
    const P = [
      ['고른 오픈탑 기록(20HT·EDI 22V7·라벨 20HC) — 고를 것이 없다', E, null],
      ['진짜 갈림(EDI 22G1 ↔ 세관 20HT)에서 고른 확정 — 줄 유지, 라벨은 지금 규격 20OT', { ...E, iso_edi: '22G1', iso_customs: '20HT', iso_pick_label: '20OT' }, { src: '세관', label: '20OT' }],
      ['같은 갈림인데 옛 라벨 20HC 가 저장됨 — 라벨은 지금 규격 20OT 로', { ...E, iso_edi: '22G1', iso_customs: '20HT', iso_pick_label: '20HC' }, { src: '세관', label: '20OT' }],
      ['오픈탑이 아닌 일반 확정 — 저장 라벨 그대로', { iso: '22G1', iso_edi: '22G1', iso_pick: 'edi', iso_pick_label: '20DC' }, { src: 'EDI', label: '20DC' }],
      ['확정 없음', { iso: '22G1', iso_edi: '22G1' }, null],
      ['빈 입력', null, null],
    ];
    for (const [label, c, want] of P) {
      const g = U.pickConfirmLineOf(c);
      ok(`⑩-4 확정 줄 — ${label}`, JSON.stringify(g) === JSON.stringify(want), JSON.stringify(g));
    }
    //  드문 코드 — 라벨이 오픈탑으로 읽히지 않는 46U2 는 «45GP» 로 바꿔 적지 않는다(받은 그대로) · 라벨이 OT 인 U2~U9 는 흔한 글자로
    const R = [['46U2', '46U2'], ['26U2', '25UT'], ['45U2', '45UT'], ['22U6', '22UT'], ['42U9', '42UT']];
    const gR = R.map(([x]) => U.isoShown(x));
    ok(`⑩-5 드문 오픈탑 글자 — ${R.map(([x], i) => `${x}→${gR[i]}`).join(' ')}`, gR.every((g, i) => g === R[i][1]), JSON.stringify(gR));
    //  ⑩-6 작업 카드(GuidedWorkPanel)도 컨 상세와 같은 한 벌을 부른다 — 옛 줄(저장 라벨을 그대로 적던 것)이 남지 않았다
    const gwp = src('src/components/GuidedWorkPanel.jsx'), mdl = src('src/components/ContainerDetailModal.jsx');
    ok('⑩-6 작업 카드·컨 상세 둘 다 pickConfirmLineOf 로 «규격 확정» 줄을 그린다(옛 c.iso_pick_label 직접 출력 없음)',
      /const _pcl = pickConfirmLineOf\(c\);\s*if \(!srcs\) return _pcl \? \(/.test(gwp) && /const _pcl = pickConfirmLineOf\(c\);\s*if \(!srcs\) return _pcl \? \(/.test(mdl)
      && !/것 \{c\.iso_pick_label \|\| ''\}/.test(gwp) && !/_pickLbl|_moot/.test(mdl));
  }
};

//  단독 실행 — node tools/regress_r47_opentop.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'r47_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx })
    .then(() => { console.log(`\nR47 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R47 오류', e && e.stack || e); process.exit(1); });
}
