// 2.30 미르 교관 연막검사 — 매뉴얼을 **가르치는지** 본다(가리키기만 하면 실패).
//   검수사 지시 «메뉴얼 만들면서 생긴 지식을 미르에게 인식 시켜 주세요 미르가 교관이 될수 있도록».
//   ⚠ 매뉴얼이 단일 소스다 — nlSearch 에 지식을 따로 복사해 두면 두 벌이 되어 반드시 갈린다.
import { generateHowToAnswer } from '../src/nlSearch.js';
import { HELP_DATA, HELP_COURSE } from '../src/data/helpData.js';
import { HELP_DATA_CHIEF } from '../src/data/helpDataChief.js';

const die = (m) => { console.log('✗ ' + m); process.exit(1); };

// ① 매뉴얼 전 블록에 「왜」가 있는가 — 검수사 지시 «왜 그렇게 해야 되는지도 설명해야»
const blocks = [
  ...Object.values(HELP_DATA.usage || {}).flat(),
  ...(HELP_COURSE || []),
  ...Object.values(HELP_DATA_CHIEF.usage || {}).flat(),
];
const noWhy = blocks.filter((b) => b.title && !(b.why && b.why.length));
if (noWhy.length) die(`매뉴얼 ${noWhy.length}장에 「왜 이렇게 하나」가 없다 — 첫 장: ${noWhy[0].title}`);

// ② 실제로 가르치는가
const CASES = [
  ['리퍼 온도 어떻게 넣어', /왜 이렇게 하나/],
  ['완료가 안 눌려', /검수원 이름|갱\(호기\)/],
  ['트윈 어떻게 해', /왜 이렇게 하나/],
  ['해치 보고 잘못 누르면', /카톡이 실제로|회수할 수 없/],
  ['갱 안 골랐다고 나와', /인건비/],
];
let taught = 0;
for (const [q, re] of CASES) {
  const a = generateHowToAnswer(q, {}, { isChief: false });
  if (!a) die(`«${q}» 에 답이 없다`);
  if (!re.test(a)) die(`«${q}» 가 가리키기만 하고 안 가르친다\n   ${a.split('\n').slice(0, 4).join(' / ')}`);
  if (/왜 이렇게 하나/.test(a)) taught++;
}

// ③ 수석 전용은 검수원에게 **하는 법을 펴지 않는다**
const chiefQ = generateHowToAnswer('베이매트릭스 만드는 법', {}, { isChief: false });
if (!chiefQ || !/🔒 수석/.test(chiefQ)) die('수석 전용인데 검수원에게 🔒 안내가 없다');
if (/이렇게 합니다/.test(chiefQ)) die('수석 전용인데 검수원에게 **하는 순서까지** 펴 준다');
const chiefOk = generateHowToAnswer('베이매트릭스 만드는 법', {}, { isChief: true });
if (!chiefOk || !/왜 이렇게 하나/.test(chiefOk)) die('수석에게는 가르쳐야 하는데 안 가르친다');

// ④ 별표가 그대로 읽히지 않는가 (답은 평문으로 찍힌다)
for (const [q] of CASES) {
  const a = generateHowToAnswer(q, {}, { isChief: false });
  if (/\*\*/.test(a)) die(`«${q}» 답에 별표(**)가 그대로 남았다 — 음성으로 읽힌다`);
}

console.log(`✓ 미르 교관 연막검사 통과 (매뉴얼 ${blocks.length}장 전부 「왜」 O · ${taught}/${CASES.length} 가르침 · 수석 가림 O · 별표 0)`);
