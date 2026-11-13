// ConeOne 3.00 화면 고르기 연막검사 — 콘앱 머리의 안 거는 짧은 코드가 검수앱 src/skin.js(getSkin·applySkin)와 같은 답을 내는지 저장값 조합 전부로 맞대어 본다.
//   검수사 «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 한다» · 2026-11-12 «1안 2안 3안이 있다면 다 넣었으면 합니다».
//   실행 — node tools/smoke_coneskin300.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (m, c, d = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : `\n      → ${String(d).slice(0, 300)}`)); if (c) pass++; else fail++; };
console.log('ConeOne 3.00 — 화면 고르기 · 컨 번호 한 벌');
const cone = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
ok('판 ConeOne 3.00 이후', /window\.__CONEV='ConeOne 3\.\d\d(-\d\d)?'/.test(cone));
ok('세 안 토큰 블록(1·2·3)이 있다', ['1', '2', '3'].every((n) => cone.includes(`:root[data-skin="${n}"]`)));
ok('컨 번호 한 벌(coneCnHtml · .cn-p/.cn-m/.cn-l) — 호기 실적 줄이 쓴다', /function coneCnHtml\(cn\)/.test(cone) && /\$\{coneCnHtml\(c\.cn\)\}/.test(cone) && /\.cn \.cn-l\{/.test(cone));
ok('베이 그림 칸은 띄우지 않고 앞 7자 흐림만 없앤다(끝 4자리 잘림 방지)', /:root\[data-skin\] \.bvc-cnh\{ opacity:1; \}/.test(cone));
ok('«미르야»만 부르면 첫마디가 검수앱(MirFab)과 같은 «무엇을 도와드릴까요?» — 바로 뒤 다시 듣기 오류(말 없음·끊김)가 인사를 «못 알아들었습니다»로 덮지 않는다',
  /if\(p\.mirHello\)\{ inp\.value=''; show\('무엇을 도와드릴까요\?'\); _mirHelloAt=Date\.now\(\);/.test(cone) && /r\.onerror=\(ev\)=>\{ mic\.textContent='🎤'; if\(Date\.now\(\)-_mirHelloAt<8000/.test(cone)
  && /const g = '무엇을 도와드릴까요\?';/.test(fs.readFileSync(path.join(ROOT, 'src/components/MirFab.jsx'), 'utf8')));
//  동작 — 가짜 음성 인식 오류 세 경우를 콘앱 r.onerror 그대로 돌려 본다(5.00 감사 막음 1: 진짜 오류·평소 «말 없음» 안내까지 삼키면 안 된다)
{
  const h = cone.match(/r\.onerror=\(ev\)=>\{([^\n]*?)\};   \/\/ ★ 3\.00/);
  const run = (sinceHello, error) => { let shown = null; const mic = { textContent: '●' }; const show = (x) => { shown = x; };
    const now = 1e12; new Function('mic', 'show', '_mirHelloAt', 'Date', 'ev', h ? h[1] : 'show("x")')(mic, show, now - sinceHello, { now: () => now }, { error }); return shown; };
  const A = run(2000, 'no-speech'), B = run(2000, 'not-allowed'), D = run(2000, 'network'), E = run(30000, 'no-speech');
  ok(`음성 인식 오류 — 인사 2초 뒤 말 없음은 조용히(${A === null ? '안내 없음' : A}) · 인사 2초 뒤 권한 없음·통신 오류는 안내(${B ? '안내' : '없음'}·${D ? '안내' : '없음'}) · 인사와 상관없는 말 없음도 안내(${E ? '안내' : '없음'})`,
    !!h && A === null && /못 알아들었습니다/.test(B || '') && /못 알아들었습니다/.test(D || '') && /못 알아들었습니다/.test(E || ''));
}
const m = cone.match(/<script>\n\/\* ★ ConeOne 3\.00 — 검수앱 5\.00 «화면 고르기»[\s\S]*?\(function\(\)\{([\s\S]*?)\}\)\(\);\n<\/script>/);
ok('머리에 안 거는 코드가 있다(그리기 전)', !!m && cone.indexOf(m[0]) < cone.indexOf('<style>'));

//  검수앱 skin.js 를 노드용으로 묶는다(utils 는 무거우니 getBrightness·getTextSize 만 같은 저장소 값으로 흉내 — 키는 utils.SK 에서 읽어 맞대어 본다)
const utils = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
const bKey = (utils.match(/brightness: '([^']+)'/) || [])[1];
const tKey = (utils.match(/textSize: '([^']+)'/) || utils.match(/SK\.textSize = '([^']+)'/) || [])[1] || 'master_text_size_v1';
const skinSrc = fs.readFileSync(path.join(ROOT, 'src/skin.js'), 'utf8');
ok(`콘앱이 읽는 저장 키가 검수앱과 같다 — 밝기 ${bKey} · 안 ${(skinSrc.match(/SKIN_KEY = '([^']+)'/) || [])[1]}`, cone.includes(`localStorage.getItem('${bKey}')`) && cone.includes(`localStorage.getItem('${(skinSrc.match(/SKIN_KEY = '([^']+)'/) || [])[1]}')`));
const tmp = path.join(require('os').tmpdir(), 'coneskin300_' + process.pid + '.cjs');
const stubUtils = path.join(require('os').tmpdir(), 'coneskin300_utils_' + process.pid + '.js');
fs.writeFileSync(stubUtils, `export function getBrightness(){ const n=parseInt(globalThis.localStorage.getItem('${bKey}'),10); return (n>=1&&n<=4)?n:1; }\nexport function getTextSize(){ return globalThis.localStorage.getItem('${tKey}')==='2'?2:1; }\n`);
const skinEntry = path.join(require('os').tmpdir(), 'coneskin300_skin_' + process.pid + '.js');
fs.writeFileSync(skinEntry, skinSrc.replace("from './utils.js'", `from ${JSON.stringify(stubUtils)}`));
execSync(`npx esbuild "${skinEntry}" --bundle --platform=node --format=cjs --outfile=${tmp} --log-level=error`, { cwd: ROOT });
const mkEnv = (store) => {
  const attrs = {};
  const de = { setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, getAttribute: (k) => attrs[k] };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  return { attrs, de, ls };
};
const rows = [];
for (const b of [null, '1', '2', '3', '4']) for (const k of [null, '1', '2', '3']) {
  //  콘앱 머리 코드
  const A = mkEnv({ ...(b ? { [bKey]: b } : {}), ...(k ? { master_skin_v1: k } : {}) });
  new Function('document', 'localStorage', 'console', m ? m[1] : '')({ documentElement: A.de }, A.ls, { warn() {} });
  //  검수앱 skin.js
  const B = mkEnv({ ...(b ? { [bKey]: b } : {}), ...(k ? { master_skin_v1: k } : {}) });
  globalThis.document = { documentElement: B.de }; globalThis.localStorage = B.ls;
  delete require.cache[tmp]; const S = require(tmp);
  S.applySkin(S.getSkin());
  const a = `${A.attrs['data-skin']}/${A.attrs['data-bright'] || '-'}`, c = `${B.attrs['data-skin']}/${B.attrs['data-bright'] || '-'}`;
  rows.push([b || '없음', k || '없음', a, c]);
}
const bad = rows.filter((r) => r[2] !== r[3]);
ok(`저장값 20조합 — 콘앱 머리 코드와 검수앱 applySkin 이 같은 안·밝기를 건다(예: 밝기 4·안 없음 → ${rows.find((r) => r[0] === '4' && r[1] === '없음')[2]})`, !bad.length, JSON.stringify(bad));
try { fs.unlinkSync(tmp); fs.unlinkSync(stubUtils); fs.unlinkSync(skinEntry); } catch (e) { console.warn('임시 파일 지우기 실패', e.message); }
console.log(`\n${fail ? '✗' : '✓'} ConeOne 3.00 화면 고르기 연막검사 — 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
