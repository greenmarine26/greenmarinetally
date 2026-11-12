// 4.88-01 카스피(CASP) 용어 연막검사 — 출력 머리·단추 글자·미르 알아듣기(옛 말·새 말 모두)·미르 답 문장·콘앱 같은 답·보이는 «카고플랜» 0
//   실행 — node tools/smoke_caspterm48801.cjs <repoRoot>
//   검수사 2026-11-12 «검수앱의 카고플랜 용어를 전부 없애고 공통용어를 사용하게» · «출력물은 영어로» · «미르는 전부 알아 들어야 합니다 카고플랜 까지도»
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad++; };
(async () => {
  console.log('① 출력물 머리·PDF 파일 이름 — 카스피 영어');
  const cp = rd('src/components/PrintableCargoPlanV2.jsx');
  ok(/\$\{\(effShipName \|\| ''\)\.toUpperCase\(\)\} CARGO DISCHARGING PLAN`/.test(cp), '양하 머리 «<선박명> CARGO DISCHARGING PLAN»');
  ok(/\$\{\(effShipName \|\| ''\)\.toUpperCase\(\)\} STOWAGE INSTRUCTION`/.test(cp), '선적 머리 «<선박명> STOWAGE INSTRUCTION»');
  ok(!/CARGO LOADING PLAN/.test(cp), '옛 «CARGO LOADING PLAN» 없음');
  ok(/'CARGO_DISCHARGING_PLAN' : 'STOWAGE_INSTRUCTION'/.test(cp) && /printWithFileName\(\)/.test(cp) && !/setTimeout\(\(\) => \{ window\.print\(\)/.test(cp), 'PDF 파일 이름 «배_항차_CARGO_DISCHARGING_PLAN / STOWAGE_INSTRUCTION» 로 인쇄');
  //  파일 이름 식을 그대로 돌려 본다(PCSZ 2634E)
  {
    const m = cp.match(/const printFileTitle = (\[[\s\S]*?\]\.filter\(Boolean\)\.join\('_'\));/);
    const f = m && new Function('voyageInfo', 'effVoyNo', 'mode', 'return ' + m[1]);
    ok(f && f({ vsl: 'PCSZ' }, '2634E', 'discharge') === 'PCSZ_2634E_CARGO_DISCHARGING_PLAN', 'PCSZ 2634E 양하 → PCSZ_2634E_CARGO_DISCHARGING_PLAN', f && f({ vsl: 'PCSZ' }, '2634E', 'discharge'));
    ok(f && f({ code: 'PCSZ' }, '2634W', 'loading') === 'PCSZ_2634W_STOWAGE_INSTRUCTION', '콘앱 code PCSZ 2634W 선적 → PCSZ_2634W_STOWAGE_INSTRUCTION');
  }

  console.log('② 단추·탭 글자 — 양하(DISCHARGING)PLAN · 선적(STOWAGE)PLAN');
  const hub = rd('src/components/PrintHubModal.jsx');
  ok(/'\(DISCHARGING\)PLAN'/.test(hub) && /'\(STOWAGE\)PLAN'/.test(hub) && /className="block text-xs2/.test(hub), '출력 센터 타일 — 고른 쪽 이름, 한글 위·영어 아래 두 줄');
  const cone = rd('public/cone.html');
  ok(/id="cpD">📥 양하\(DISCHARGING\)PLAN</.test(cone) && /id="cpL">📤 선적\(STOWAGE\)PLAN</.test(cone), '콘앱 고르기 단추 두 개');
  ok(/'📐 양하\(DISCHARGING\)PLAN · 선적\(STOWAGE\)PLAN'/.test(rd('src/pages/DataCenterPage.jsx')), '자료 센터 할 일 이름');

  console.log('③ 미르 알아듣기 — 옛 말·새 말 모두 같은 화면(양하·선적 맞게)');
  const P = await import(pathToFileURL(path.join(root, 'src/planCommand.js')).href);
  const cases = [
    ['카고플랜', null], ['양하 카고플랜', 'discharge'], ['선적 카고플랜', 'loading'], ['양하플랜', 'discharge'], ['선적플랜', 'loading'],
    ['스테이지', null], ['스토우플랜', 'loading'], ['CARGO PLAN', null], ['CARGO DISCHARGING PLAN', 'discharge'], ['DISCHARGING PLAN', 'discharge'],
    ['디스차징 플랜', 'discharge'], ['STOWAGE INSTRUCTION', 'loading'], ['STOWAGE PLAN', 'loading'], ['스토우지 플랜', 'loading'], ['LOADING PLAN', 'loading'],
    ['양하(DISCHARGING)PLAN', 'discharge'], ['선적(STOWAGE)PLAN', 'loading'], ['스토우지 인스트럭션', 'loading'], ['cargo discharging plan', 'discharge'], ['stowage instruction', 'loading'],
  ];
  for (const [w, md] of cases) {
    for (const q of [w + ' 보여줘', 'PCSZ ' + w]) {
      const r = P.parseViewCommand(q);
      ok(r && r.what === 'cargo' && r.mode === md && r.bay == null, `«${q}» → cargo · ${md || '현재 모드'}`, JSON.stringify(r));
    }
  }
  ok(P.parseViewCommand('카고플랜 어디서 뽑아') === null && P.parseViewCommand('STOWAGE INSTRUCTION 어디서 뽑아') === null, '조회 문장은 열지 않음(종전 그대로)');
  { const a = P.parseViewCommand('선적(STOWAGE)PLAN 출력해줘'); ok(a && a.mode === 'loading' && a.what === 'cargo', '감사 — «선적(STOWAGE)PLAN 출력해줘» 열림(영어 PLAN 2.87-03)', JSON.stringify(a)); }
  { const a = P.parseViewCommand('CARGO DISCHARGING PLAN 22 베이'); ok(a && a.mode === 'discharge', '감사 — «CARGO DISCHARGING PLAN 22 베이» 열림', JSON.stringify(a)); }
  { const a = P.parseViewCommand('STOWAGE PLAN 5번 베이'); ok(a && a.mode === 'loading' && a.bay === 5, '감사 — «STOWAGE PLAN 5번 베이» 열림', JSON.stringify(a)); }
  ok(/🗺 선적\(STOWAGE\)PLAN<\/button>/.test(rd('src/components/LoadingPlanEdit.jsx')) && /🗺 선적\(STOWAGE\)PLAN 보기<\/button>/.test(rd('src/planedit.entry.jsx')), '감사 — 선적 편집기 단추는 선적(STOWAGE)PLAN');
  { const r = P.parseViewCommand('22 베이플랜'); ok(r && r.what === 'bay' && r.bay === 22, '베이플랜은 그대로 베이플랜'); }

  console.log('④ 미르 답 문장 — 새 말(검수앱 네 자리·콘앱 같은 말)');
  for (const f of ['src/components/MirFab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx', 'src/pages/VoyagePage.jsx']) {
    const s = rd(f);
    ok(/'선적\(STOWAGE\)PLAN' : '양하\(DISCHARGING\)PLAN'/.test(s) && !/what === 'cargo' \? '카고플랜'/.test(s), f + ' — «… 양하(DISCHARGING)PLAN을 열었어요»');
  }
  ok(/cmd\.mode==='loading'\?'선적\(STOWAGE\)PLAN':'양하\(DISCHARGING\)PLAN'\)\+' 열었어요/.test(cone) && !/' 카고플랜 열었어요/.test(cone), '콘앱 미르 «… 열었어요» 도 같은 이름');
  //  답 문장 모양을 돌려 본다 — 검수앱(SearchPanel 식)과 콘앱(mirTryOpen 식)이 같은 이름을 내는지
  {
    const appName = (md) => (md === 'loading' ? '선적(STOWAGE)PLAN' : '양하(DISCHARGING)PLAN');
    const coneName = (mode) => (mode === 'loading' ? '선적(STOWAGE)PLAN' : '양하(DISCHARGING)PLAN');
    for (const q of ['STOWAGE INSTRUCTION 보여줘', '디스차징 플랜 보여줘', '카고플랜 보여줘']) {
      const r = P.parseViewCommand(q); const md = r.mode || 'discharge';
      ok(appName(md) === coneName(md), `«${q}» 검수앱·콘앱 같은 답 이름 ${appName(md)}`);
    }
  }

  console.log('⑤ 보이는 글자에 «카고플랜» 0 — 남는 것은 알아듣기·로그·CSS 주석·검색 낱말·검수사 원문뿐');
  const B = require(path.join(root, 'node_modules/@babel/parser'));
  const RE = /카고\s?플[랜렌]|양하플랜|선적플랜/;
  const allowFile = /src\/planCommand\.js$/;
  const allowText = [/옛 말 ?[«(]카고플랜/, /검수사 2026-10-26 «시프팅 예정건이 선적플랜/, /^카고\s?플랜( 보는법)?$/, /카고플랜을 공통 이름으로/, /KNOWN_WORDS|아이엠오 선속 도선 카고플랜/, /\[화면 열기\] 예: "카고플랜 보여줘"/];
  const left = [];
  const walk = (node, cb, parent) => {
    if (!node || typeof node.type !== 'string') return;
    cb(node, parent);
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, cb, node));
      else if (v && typeof v.type === 'string') walk(v, cb, node);
    }
  };
  const scan = (code, file) => {
    let ast; try { ast = B.parse(code, { sourceType: 'unambiguous', plugins: ['jsx'], errorRecovery: true }); } catch (e) { left.push(file + ' 해석 실패 ' + e.message); return; }
    const consoleArgs = new Set();
    walk(ast.program, (nd) => { if (nd.type === 'CallExpression' && nd.callee && nd.callee.type === 'MemberExpression' && nd.callee.object && nd.callee.object.name === 'console') nd.arguments.forEach((a) => consoleArgs.add(a)); });
    walk(ast.program, (nd, par) => {
      let v = null;
      if (nd.type === 'StringLiteral') v = nd.value; else if (nd.type === 'TemplateElement') v = nd.value.cooked || nd.value.raw; else if (nd.type === 'JSXText') v = nd.value;
      if (v == null || !RE.test(v) || consoleArgs.has(nd) || (par && consoleArgs.has(par))) return;
      if (/\{[^}]*:[^}]*;/.test(v) && /\/\*/.test(v)) return;   // CSS 덩어리 속 주석
      if (allowText.some((r) => r.test(v))) return;
      left.push(file + ' — ' + v.replace(/\s+/g, ' ').slice(0, 80));
    });
  };
  const walkDir = (d) => { for (const f of fs.readdirSync(path.join(root, d))) { const p = path.join(d, f); const st = fs.statSync(path.join(root, p)); if (st.isDirectory()) walkDir(p); else if (/\.(jsx?|mjs)$/.test(f) && !/shipBayDict|userBayDict/.test(f) && !allowFile.test(p)) scan(rd(p), p); } };
  walkDir('src');
  { const re = /<script\b[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(cone))) scan(m[1], 'public/cone.html'); }
  { const outer = cone.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, ''); outer.split('\n').forEach((l) => { if (RE.test(l)) left.push('cone.html(HTML) — ' + l.trim().slice(0, 80)); }); }
  ok(left.length === 0, '보이는 «카고플랜» 0', left.join(' | '));

  console.log('⑥ 판·APP_NOTE·매뉴얼');
  const ut = rd('src/utils.js');
  const note = (ut.match(/export const APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok(/export const APP_VERSION = 'TallyOne 4\.88-01'/.test(ut) || !/export const APP_VERSION = 'TallyOne 4\.88'/.test(ut), 'APP_VERSION TallyOne 4.88-01(뒤 판은 자기 판)');
  ok(!/^4\.88-01 /.test(note) || (note === '4.88-01 카고플랜을 공통 이름으로 바꿨습니다. 양하(DISCHARGING)PLAN 과 선적(STOWAGE)PLAN 입니다' && !/[?\/']/.test(note) && note.length < 120), 'APP_NOTE 문구·두 문장·? / 작은따옴표 없음', note);
  ok(/window\.__CONEV='ConeOne 2\.78-01'/.test(cone) || !/window\.__CONEV='ConeOne 2\.78'/.test(cone), '콘앱 ConeOne 2.78-01');
  ok(/공통 이름입니다\(4\.88-01\)/.test(rd('src/data/helpData.js')), '매뉴얼(helpData) 4.88-01 안내');
  ok(/'STOWAGE INSTRUCTION'/.test(rd('src/data/featureIndex.js')), '기능 찾기(featureIndex) 낱말에 카스피 말');
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
