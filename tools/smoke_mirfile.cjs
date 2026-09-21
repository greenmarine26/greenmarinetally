// 미르 한 파일 연막검사 (3.53-11) — 미르 엔진이 src/mir.js 한 파일뿐인가, 옛 일곱 파일을 부르는 곳이 남지 않았는가, nlSearch 와 서로 불러도 어느 쪽을 먼저 열든 서는가
//   검수사 2026-09-10 «미르를 하나로 만들고 싶습니다» · 2026-09-20 «미르를 하나로 통합하라고 했는데 이게 몇개지?»
//   node tools/smoke_mirfile.cjs <저장소 루트>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const OLD = ['mirAnswer', 'mirFacts', 'mirEyes', 'mirCtx', 'mirChat', 'mirModel', 'mirLearn'];

//  ① 파일 — 엔진은 mir.js 하나, 옛 일곱은 없다
T(fs.existsSync(path.join(ROOT, 'src/mir.js')), 'src/mir.js 가 있다');
for (const o of OLD) T(!fs.existsSync(path.join(ROOT, 'src', o + '.js')), `옛 파일 src/${o}.js 가 없다`);
const mirFiles = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /^mir.*\.js$/i.test(f)).sort();
T(JSON.stringify(mirFiles) === JSON.stringify(['mir.js', 'mirCore.entry.js']), 'src 의 mir*.js 는 엔진(mir.js)과 콘앱 포장(mirCore.entry.js) 둘뿐', mirFiles.join(','));

//  ② 부르는 곳 — 옛 경로를 가져오는 줄이 src·tools·build.sh 어디에도 없다
const walk = (d, acc = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|fixtures|\.git$/.test(e.name)) walk(p, acc); } else if (/\.(js|jsx|cjs|mjs|sh)$/.test(e.name)) acc.push(p); } return acc; };
const rootExtra = fs.readdirSync(ROOT).filter((f) => /^(vite.*\.(js|mjs|ts)|.*_entry\.js|package\.json)$/.test(f)).map((f) => path.join(ROOT, f));
const pubHtml = fs.readdirSync(path.join(ROOT, 'public')).filter((f) => /\.html$/.test(f)).map((f) => path.join(ROOT, 'public', f));
const files = walk(path.join(ROOT, 'src')).concat(walk(path.join(ROOT, 'tools')), [path.join(ROOT, 'build.sh')], rootExtra, pubHtml);
const RE_OLD = new RegExp(`['"\`/ ](?:\\.\\./src/|\\.\\./|\\./|src/)(?:${OLD.join('|')})\\.js`);
const left = [];
for (const f of files) {
  if (path.basename(f) === 'smoke_mirfile.cjs') continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (RE_OLD.test(l) && !/^\s*(\/\/|\*|#)/.test(l)) left.push(`${path.relative(ROOT, f)}:${i + 1}`); });
}
T(left.length === 0, '옛 일곱 파일 경로를 부르는 코드 줄이 없다', left.slice(0, 5).join(' · '));

//  ③ 내보내는 것 — 화면·nlSearch·gemini·콘앱 포장이 부르는 이름이 전부 mir.js 에 있다
const src = fs.readFileSync(path.join(ROOT, 'src/mir.js'), 'utf8');
const NEED = ['answerOneRaw', 'answerOne', 'answerEntityFacts', 'answerVoyageFacts', 'entityHead', 'mirSee', 'flattenVoyages', 'publishMirCtx', 'readMirCtx', 'subscribeMirCtx',
  'WORKING_SHIP_RE', 'workingShipCtx', 'pickShipCtx', 'mirTone', 'mirSmallTalk', 'mirLeftover', 'isWeakAnswer', 'getMirConfig', 'MIR_CATALOG', 'translateQuestion', 'buildDataPack',
  'dataAnswer', 'askMirModel', 'askMir', 'mirTokens', 'mirSlot', 'mirKey', 'mirRewrite', 'mirLearnedDef', 'mirObserve', 'mirLearnAlias', '_mirReset'];
for (const k of NEED) T(new RegExp(`^export (?:async )?(?:function|const) ${k.replace('$', '\\$')}\\b`, 'm').test(src), `mir.js 가 ${k} 를 내보낸다`);
T(!/from ['"]\.\/firebase(\.js)?['"]/.test(src), 'mir.js 는 firebase SDK 를 직접 가져오지 않는다(콘앱 번들에도 실린다)');

//  ④ 서로 부름 — nlSearch·mir·chiefAnswers 가 서로 가져온다. 어느 것을 먼저 열든 서야 한다.
//     ⚠ 번들(esbuild cjs)로 재면 안 된다 — 맨 바깥 const 가 var 로 내려가 «초기화 전 접근»이 NaN 으로 조용히 지나간다(3.53-11 감사 실측).
//        실제 앱(rollup)과 같은 뜻으로 재려면 **네이티브 ESM** 으로 연다. 순서마다 새 프로세스(모듈 캐시가 순서를 가린다).
const { pathToFileURL } = require('url');
const U = (p) => JSON.stringify(pathToFileURL(path.join(ROOT, p)).href);
const STUB = "globalThis.window={addEventListener(){},dispatchEvent(){return true},__fbShipBayDict:{}};globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};"
  + "globalThis.document={addEventListener(){},dispatchEvent(){return true},querySelector(){return null},documentElement:{style:{},setAttribute(){}},body:{style:{}}};"
  + "globalThis.fetch=()=>Promise.reject(new Error('연막: 네트워크 없음'));";
const ORDERS = [
  ['nlSearch 먼저', ['src/nlSearch.js', 'src/mir.js']],
  ['mir 먼저', ['src/mir.js', 'src/nlSearch.js']],
  ['chiefAnswers 먼저', ['src/chiefAnswers.js', 'src/mir.js', 'src/nlSearch.js']],
];
for (const [label, mods] of ORDERS) {
  const code = STUB + mods.map((m, i) => `const m${i}=await import(${U(m)});`).join('')
    + `const NS=await import(${U('src/nlSearch.js')});const MIR=await import(${U('src/mir.js')});`
    + "const p=NS.parseNaturalQuery('리퍼 몇 대야',{containers:[]});const k=MIR.mirKey('MCSC 카고플랜');MIR.answerOneRaw('안녕',{app:'tally',smallTalkLast:true,containers:[],_trace:{}});"
    + "if(!p||typeof k!=='string')throw new Error('함수가 안 돈다');console.log('OK');";
  try {
    const r = execFileSync(process.execPath, ['--input-type=module', '-e', code], { stdio: 'pipe', cwd: ROOT, timeout: 120000 }).toString();
    T(/OK/.test(r), `${label} — 네이티브 ESM 으로 열리고 파서·사전·답 고르기가 돈다`);
  } catch (e) { T(false, `${label} — 열다가 터진다`, String((e && e.stderr) || (e && e.message)).split('\n').filter((l) => /Error/.test(l)).slice(0, 2).join(' | ').slice(0, 240)); }
}

console.log(`\n미르 한 파일 연막검사 — ${n}항 중 실패 ${bad}`);
process.exit(bad ? 1 : 0);
