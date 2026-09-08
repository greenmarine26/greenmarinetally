// 리퍼 온도 사진 판독 — 양식을 못 박지 않고, 여러 장을 받고, 읽은 값을 자료와 맞춰 보는가(3.32).
//   검수사 2026-09-08 «온도가 기록이 안됨 실제온도 SWBT 2614N». 실물 SAWASDEE BALTIC 3장 기준.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('리퍼 온도 사진 판독 (3.32)');

const mix = fs.readFileSync(path.join(ROOT, 'src/mixerUpload.js'), 'utf8');
const mod = fs.readFileSync(path.join(ROOT, 'src/components/ReeferMemoModal.jsx'), 'utf8');
//  프롬프트 **문자열만** 본다 — 주석에 옛 문구를 인용해 두었으므로 함수 전체를 보면 헛짚는다.
const _fn = mix.slice(mix.indexOf('export async function ocrReeferTemps'), mix.indexOf('export async function ocrImageContainers'));
const _b = _fn.indexOf('const prompt = `');
const P = _fn.slice(_b + 'const prompt = `'.length, _fn.indexOf('`;', _b));

//  ① 프롬프트 — 한 배 양식을 못 박지 않는다
ok(/열 순서를 가정하지 말고/.test(P), '열 순서를 가정하지 말라고 이른다');
ok(!/표 구조는 보통 이렇습니다/.test(P), '옛 «표 구조는 보통 이렇습니다» 문장이 없다 — SITC 한 배 양식을 못 박던 줄이다');
ok(/SETT\. TEMP\./.test(P) && /SET TEMP/.test(P), '설정온도 열 이름을 여러 꼴로 알려 준다(SET TEMP · SETT. TEMP.)');
ok(/PLUG IN TEMP[\s\S]{0,120}실제온도가 아닙니다/.test(P),
  '⛔ PLUG IN TEMP 는 실제온도가 아니라고 못 박는다 — 그 배 종이에 손글씨가 든 칸이다');
ok(/REMARK[\s\S]{0,140}온도가 아닙니다/.test(P), '⛔ REMARK·자리 번호(180184)를 온도로 읽지 말라고 이른다');
ok(/set 을 복사해 넣지 마십시오/.test(P), '격자가 비면 act 는 빈칸 — 설정온도를 베끼지 않는다(3.25 확정)');
ok(/앞자리가 칸 경계를 넘어/.test(P), '손글씨 «14.0» 이 «4.0» 처럼 보이는 줄을 알려 준다(실물에서 여러 줄 그렇다)');

//  ② 여러 장 — 실물이 3장이다
ok((mod.match(/multiple onChange=\{onPhoto\}/g) || []).length === 4,
  '촬영·앨범 입력 넷 전부 여러 장을 받는다(고르는 화면 둘 + 목록 화면 둘)');
ok(/const files = \[\.\.\.\(e\.target\.files \|\| \[\]\)\]/.test(mod), '파일을 배열로 받는다 — 종전엔 files[0] 하나뿐이었다');
ok(/for \(let i = 0; i < files\.length/.test(mod) && /const prev = all\.get\(it\.cn\)/.test(mod),
  '장마다 읽어 한 곳에 누적한다');
ok(/사진 \$\{i \+ 1\}\/\$\{files\.length\} 읽는 중/.test(mod), '몇 장째 읽는 중인지 보여 준다');
ok(/errs\.push/.test(mod) && /못 읽은 사진/.test(mod), '한 장이 실패해도 나머지를 읽고, 실패한 장을 숨기지 않는다');

//  ③ 판독 검산 — 순수 함수로 실제로 돌려 본다
const os = require('os');
//  임시 파일은 저장소 밖에 둔다 — 중단되면 루트에 잔재가 남는다(감사 지적).
const TMPD = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'smokerf-'));
const tmpEntry = path.join(TMPD, 'entry.mjs');
const MODAL = path.join(ROOT, 'src/components/ReeferMemoModal.jsx').replace(/\\/g, '/');
fs.writeFileSync(tmpEntry, `import { ocrSetMismatch, tempNum } from '${MODAL}';
const list = [
  { cn: 'FBIU5370351', tmp: '-18.0' },   // 종이 인쇄값과 같음
  { cn: 'FBIU5369366', tmp: '14.0' },
  { cn: 'SEKU9305154', tmp: '1.0' },
  { cn: 'HALU8504312', tmp: '' },        // 자료에 온도가 없으면 판정하지 않는다
];
// ASC 파서가 쓰는 꼴 — 단위가 붙어 온다(보관소 실측 280대). 이것을 못 읽으면 전량 헛경보다.
const listC = [{ cn: 'A', tmp: '-18.0℃' }, { cn: 'B', tmp: '0.0℃' }, { cn: 'C', tmp: '14.0℃' }];
const okC = new Map([['A',{set:'-18',act:'-17.8'}],['B',{set:'0',act:'0.1'}],['C',{set:'14.0',act:'13.9'}]]);
const badC = new Map([['A',{set:'12.6',act:'-17.8'}]]);
const listN = [{ cn: 'A', tmp: -18 }, { cn: 'B', tmp: 0 }];   // 숫자로 오는 자료
const okN = new Map([['A',{set:'-18.0',act:''}],['B',{set:'0',act:''}]]);
const good = new Map([['FBIU5370351',{set:'-18',act:'-17.8'}],['FBIU5369366',{set:'14.0',act:'14.0'}],
  ['SEKU9305154',{set:'1',act:'1.0'}],['HALU8504312',{set:'14',act:'14.8'}]]);
const bad = new Map([['FBIU5370351',{set:'12.6',act:'-17.8'}],['FBIU5369366',{set:'10.0',act:'14.0'}],
  ['SEKU9305154',{set:'1',act:'1.0'}]]);
const none = new Map([['FBIU5370351',{set:'',act:'-17.8'}]]);
console.log(JSON.stringify([ocrSetMismatch(list, good), ocrSetMismatch(list, bad), ocrSetMismatch(list, none),
  ocrSetMismatch(list, new Map()), ocrSetMismatch(null, null),
  ocrSetMismatch(listC, okC), ocrSetMismatch(listC, badC), ocrSetMismatch(listN, okN),
  [tempNum('-18.0℃'), tempNum('0'), tempNum(-18), tempNum(''), tempNum('미상'), tempNum('−2.5')]]));
`);
let R;
try {
  const out = execSync(`npx esbuild ${JSON.stringify(tmpEntry)} --bundle --platform=node --format=cjs --loader:.jsx=jsx --log-level=error`, { encoding: 'utf8' });
  R = JSON.parse(execSync('node -', { input: out, encoding: 'utf8' }).trim());
} finally { try { fs.rmSync(TMPD, { recursive: true, force: true }); } catch { /* 지울 게 없으면 그만 */ } }
ok(Object.keys(R[0].bad).length === 0 && R[0].cmp === 3,
  '제대로 읽었으면 걸리는 것이 없다 — 자료에 온도 없는 컨은 애초에 안 센다(맞춰 본 3대)');
ok(Object.keys(R[1].bad).length === 2 && R[1].cmp === 3,
  '⛔ 꽂을 때 온도 칸(12.6 · 10.0)을 읽어 오면 2대가 걸린다 — 이것이 이번 판의 안전망이다');
ok(/12\.6 ≠ 자료 -18\.0/.test(R[1].bad.FBIU5370351), '어긋난 값을 그대로 보여 준다 — «읽은 값 ≠ 자료 값»');
ok(R[2].cmp === 0 && Object.keys(R[2].bad).length === 0, '설정온도를 못 읽었으면 판정하지 않는다(견줄 것이 없다)');
ok(R[3].cmp === 0 && R[4].cmp === 0, '빈 판독·빈 목록에도 안 터진다');

//  ④ 조용히 실패하지 않는다
ok(Object.keys(R[5].bad).length === 0 && R[5].cmp === 3,
  '⛔ «-18.0℃» 처럼 단위가 붙은 자료(ASC 파서가 그렇게 쓴다)도 제대로 견준다 — 이걸 못 읽으면 전량 헛경보다');
ok(Object.keys(R[6].bad).length === 1, '단위가 붙어 있어도 진짜 어긋난 것은 잡는다');
ok(R[7].cmp === 2 && Object.keys(R[7].bad).length === 0, '자료가 숫자(number)로 와도 견준다');
ok(R[8][0] === -18 && R[8][1] === 0 && R[8][2] === -18 && R[8][5] === -2.5,
  'tempNum — ℃·0·숫자·유니코드 음수부호를 읽는다');
ok(R[8][3] === null && R[8][4] === null, 'tempNum — 빈칸·글자는 null(모르는 것을 틀렸다고 하지 않는다)');
ok(/⛔ \$\{nBad\}대의 세팅온도가 자료와 다릅니다/.test(mod),
  '절반 넘게 어긋나면 «다른 칸을 읽은 것 같습니다» 로 크게 알린다');
ok(/⚠ \$\{nBad\}대는 세팅온도가 자료와 다릅니다/.test(mod), '몇 대만 어긋나면 줄에 표시하고 알린다');
ok(/badSet\[c\.cn\] &&/.test(mod), '어긋난 줄에 그 값을 붙여 보여 준다');

//  ⑤ 3.25 회귀 가드 — 실측 칸을 지어내지 않는다
//  ⚠ 주석이 아니라 **코드 모양**을 본다 — 감사가 이 두 항을 항등식이라 잡았다(주석만 물었다).
const applyAllBody = mod.slice(mod.indexOf('const applyAll = ()'), mod.indexOf('/** ① 사진 판독'));
ok(/n\[c\.cn\] = \{ \.\.\.o\[c\.cn\], set: edi, src: 'list' \}/.test(applyAllBody) && !/\bact:/.test(applyAllBody),
  '「세팅온도 채우기」 코드에 act 대입이 아예 없다(3.25 확정 — 베낀 값은 잰 값이 아니다)');
const initLine = (mod.match(/o\[c\.cn\] = \{ set:[^\n]*\n/) || [''])[0];
ok(/act: tempStr\(c\.rfAct\), src:/.test(initLine) && !/act: tempStr\(c\.rfAct\)\s*\|\|/.test(initLine),
  '열 때 실측 칸에 폴백이 안 붙어 있다(3.25 — 안 잰 값이 «잰 값»으로 굳던 사고)');
ok(/window\.confirm\(`세팅온도가 자료와 다른/.test(mod),
  '어긋난 줄이 남아 있으면 저장 전에 한 번 더 묻는다 — 경고가 문구뿐이면 그대로 찍힌다');
ok(/typeof window\.confirm === 'function'/.test(mod) && /확인 창을 띄울 수 없었습니다/.test(mod),
  '대화상자가 막힌 환경에서도 저장이 조용히 죽지 않는다 — 무엇을 저장했는지 밝힌다');
ok(/const cur = nx\[c\.cn\] \|\| \{ set: '', act: '', src: '' \}/.test(mod),
  '모달을 연 뒤 리퍼로 승격된 컨을 빈 칸으로 읽어 와도 화면이 안 죽는다');
ok(/setBadSet\(\{\}\);\s*\/\/ 다시 찍으면/.test(mod), '다시 찍으면 옛 경고를 지운다');
ok(/if \(k === 'set'\) setBadSet/.test(mod), '그 줄을 고치면 그 줄 경고가 지워진다');
ok(/const hit = list\.filter/.test(mod) && /const miss = list\.filter/.test(mod),
  '채운 대수·못 찾은 대수를 업데이터 밖에서 센다 — 안에서 세면 안내가 늘 «0대»로 나갔다');
ok(/it\.set \|\| prev\.set/.test(mod) && /it\.act \|\| prev\.act/.test(mod),
  '여러 장을 칸 단위로 합친다 — 뒤 장의 빈 칸이 앞 장에서 읽은 값을 지우지 않는다');

console.log(fail ? `✗ ${fail}항 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
