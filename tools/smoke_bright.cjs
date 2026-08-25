// 2.40 화면 밝기·소리 연막검사 — 팔레트가 실제로 갈리는지, 미르 조작이 걸리는지 눌러서 본다.
//   ⚠ 색은 «빌드가 통과했다»로 증명되지 않는다. 변수가 안 걸리면 화면만 캄캄한 채로 통과한다.
//   실행: node tools/smoke_bright.cjs <번들된 harness.js> [dist/assets/index-*.css]
const fs = require('fs');
const path = require('path');

const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
let checked = 0;
const ok = (m) => { checked++; if (process.env.SMOKE_VERBOSE) console.log('  ✓ ' + m); };

// ── ① 소스 팔레트 — index.css 에 네 단계가 다 있는가
const css = fs.readFileSync('src/index.css', 'utf8');
for (const n of ['2', '3', '4']) {
  if (!css.includes(`:root[data-bright="${n}"]`)) fail(`index.css 에 ${n}단계 블록이 없다`);
  ok(`${n}단계 블록`);
}
for (const v of ['--ink-950', '--ink-800', '--dim-100', '--dim-200', '--line-a', '--st-dis', '--act']) {
  if (!css.includes(v + ':')) fail(`index.css 에 ${v} 정의가 없다`);
  ok(v);
}
// 4단계는 흰 바탕이어야 한다 — 검수사 «컴에선 일반 업무용과 같으면 됩니다»
const four = css.slice(css.indexOf(':root[data-bright="4"]'));
if (!/--ink-800:\s*255 255 255/.test(four)) fail('4단계 카드가 흰색(255 255 255)이 아니다');
if (!/--dim-100:\s*11 18 32/.test(four)) fail('4단계 주 글자가 진한 색이 아니다 — 흰 바탕에 흰 글자가 된다');
if (!/color-scheme:\s*light/.test(four)) fail('4단계에 color-scheme:light 가 없다 — 스크롤바·입력창이 어둡게 남는다');
ok('4단계 = 흰 바탕 + 진한 글자');

// ── ② tailwind.config — 변수 참조 + alpha 유지
const tw = fs.readFileSync('tailwind.config.js', 'utf8');
if (!tw.includes('rgb(var(--ink-800) / <alpha-value>)')) fail('tailwind.config 가 아직 hex 를 쓴다');
if ((tw.match(/<alpha-value>/g) || []).length < 15) fail('<alpha-value> 가 모자란다 — bg-ink-800/60 류 193회가 죽는다');
ok('config 변수 참조 + alpha 유지');

// ── ③ 스톱 뒤집기 CSS — 실제 쓰인 어두운 배경이 밝은 값으로 덮이는가
const flip = fs.readFileSync('src/brightLight.css', 'utf8');
if (!/:root\[data-bright="4"\] \.bg-amber-950\{background-color:rgb\(255 251 235\)\}/.test(flip)) {
  fail('brightLight.css 가 bg-amber-950 을 밝은 값으로 안 덮는다');
}
const flipCount = (flip.match(/:root\[data-bright="4"\]/g) || []).length;
if (flipCount < 400) fail(`뒤집기 규칙이 ${flipCount}개뿐 — 실제 쓰인 조합(600+)을 못 덮는다`);
ok(`뒤집기 ${flipCount}개`);
//  ⚠ @layer 안에 있으면 Tailwind content 스캔에 잘린다(index.css 의 svg.lucide 사고와 같은 병리).
if (/^\s*@layer/m.test(flip.replace(/\/\*[\s\S]*?\*\//g, ''))) fail('brightLight.css 가 @layer 안에 있다 — 빌드에서 잘린다');
ok('레이어 밖 평문');

// ── ④ 동작 — 번들된 harness 로 실제 함수를 돌린다
const bundle = process.argv[2];
if (bundle && fs.existsSync(bundle)) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document;
  global.localStorage = dom.window.localStorage; global.navigator = dom.window.navigator;
  const m = require(path.resolve(bundle));

  m.applyBrightness(1);
  if (dom.window.document.documentElement.hasAttribute('data-bright')) fail('1단계인데 data-bright 가 남아 있다');
  m.applyBrightness(4);
  if (dom.window.document.documentElement.getAttribute('data-bright') !== '4') fail('applyBrightness(4) 가 안 걸린다');
  ok('applyBrightness');

  //  미르 조작 — 걸려야 할 것 / 안 걸려야 할 것
  const YES = ['미르야 화면이 어두운데? 화면 밝게 해줄랴?', '화면 밝게', '제일 밝게 해줘', '다시 어둡게',
               '화면 원래대로', '눈이 아파 화면 좀', '소리 좀 줄여줘', '볼륨 크게', '소리 꺼', '미르야 조용히 해'];
  const NO  = ['6653', '리퍼 몇대야', '엑스레이 몇대', '20베이 양하 몇개야', '베이플랜 어디서 봐',
               '실번호 어떻게 고쳐', '밝은 색 컨테이너 있어', '시프팅 알려줘', '봉인자 어떻게 등록해'];
  //  2.40-01: 검수사가 실제로 친 문장 — 둘 다 2.40 에서 «할 수 없어요» 가 나왔다.
  YES.push('미르야 화면이 너무 밝아', '미르야 화면 조금만 어둡게 해줘', '화면 어둡게 해줘');
  for (const q of YES) if (!m.parseNaturalQuery(q).deviceCmd) fail(`미르가 «${q}» 를 못 알아듣는다`);
  for (const q of NO)  if (m.parseNaturalQuery(q).deviceCmd) fail(`⛔ 미르가 업무 질문 «${q}» 를 가로챈다`);
  ok(`인텐트 ${YES.length}+${NO.length}`);

  //  ★ 2.40-01 방향 검사 — 「어둡게」를 **치는 도중**에 반대로 밝아지면 안 된다.
  //    타이핑은 한 글자씩 들어오고 디바운스마다 판정이 돈다. 중간 상태가 위험하다.
  for (const [q, want] of [['미르야 화면이 너무 밝아', -1], ['미르야 화면 조금만 어둡게 해줘', -1],
                           ['화면 어둡게', -1], ['화면 밝게', +1], ['화면이 어두운데', +1], ['화면이 어두워', +1]]) {
    const c = m.parseNaturalQuery(q).deviceCmd;
    if (!c || c.kind !== 'bright') fail(`«${q}» 가 밝기 명령으로 안 잡힌다`);
    const dir = c.to != null ? (c.to === 4 ? +1 : -1) : c.dir;
    if (dir !== want) fail(`⛔ «${q}» 가 ${want > 0 ? '밝게' : '어둡게'} 여야 하는데 반대로 간다`);
  }
  //  「화면 어둡게」를 치는 도중의 모든 앞자락이 **밝게로 돌지 않아야** 한다.
  const typing = '화면 어둡게';
  for (let i = 2; i <= typing.length; i++) {
    const c = m.parseNaturalQuery(typing.slice(0, i)).deviceCmd;
    if (c && c.kind === 'bright' && c.dir === +1) {
      fail(`⛔ 「${typing}」 를 치는 도중 «${typing.slice(0, i)}» 에서 반대로 밝아진다`);
    }
  }
  ok('방향 6종 + 타이핑 중간 상태');

  //  실행 — 올리고 내리고, 끝에서 더 못 가는 것까지
  m.applyBrightness(1);
  let msg = m.runDeviceCmd({ kind: 'bright', dir: +1 });
  if (m.getBrightness() !== 2 || !/보통/.test(msg)) fail('밝기 한 단계 올리기 실패: ' + msg);
  msg = m.runDeviceCmd({ kind: 'bright', to: 4 });
  if (m.getBrightness() !== 4 || !/사무실/.test(msg)) fail('제일 밝게 실패: ' + msg);
  msg = m.runDeviceCmd({ kind: 'bright', dir: +1 });
  if (!/이미|더 올릴/.test(msg)) fail('끝에서 «이미 제일 밝다»를 안 말한다: ' + msg);
  msg = m.runDeviceCmd({ kind: 'bright', ask: true });
  if (!/할까요/.test(msg)) fail('«눈이 아파»에 되묻지 않는다: ' + msg);
  ok('밝기 실행');

  m.setVolumeStep(2);
  m.runDeviceCmd({ kind: 'volume', to: 'off' });
  if (m.currentVolume() !== 0) fail('소리 끄기가 안 먹는다');
  m.runDeviceCmd({ kind: 'volume', dir: +1 });
  if (m.currentVolume() === 0) fail('소리 다시 켜기가 안 먹는다');
  ok('소리 실행');
  m.applyBrightness(1);   // 뒤처리 — 다음 검사에 영향 주지 않게
} else {
  console.log('  (harness 없음 — 소스 검사만 수행)');
}

// ── ⑤ 빌드 결과물 — 변수와 뒤집기가 살아남았는가
const built = process.argv[3];
if (built && fs.existsSync(built)) {
  const b = fs.readFileSync(built, 'utf8');
  if (!/\[data-bright="4"\]/.test(b)) fail('빌드된 CSS 에 4단계가 없다 — 어딘가에서 잘렸다');
  if (!/--ink-800:255 255 255|--ink-800: 255 255 255/.test(b.replace(/\s*:\s*/g, ':'))) {
    fail('빌드된 CSS 에 4단계 흰 카드 값이 없다');
  }
  const n = (b.match(/\[data-bright="4"\] \./g) || []).length;
  if (n < 400) fail(`빌드된 CSS 의 뒤집기 규칙이 ${n}개뿐 — content 스캔에 잘렸다`);
  ok(`빌드 CSS 뒤집기 ${n}개`);
}

console.log(`✓ 밝기·소리 연막검사 통과 (${checked}항목 · 4단계 흰바탕 O · alpha 유지 O · 미르 조작 O · 업무질문 가로채기 0)`);
