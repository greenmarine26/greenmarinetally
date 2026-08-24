// 미르 말투·잡담 — 답 데이터는 그대로, 종결어미만 친구체로 + 검수사가 만들어 온 잡담 대본 (2.33)
//   검수사 확정 2026-08-24: «이제껏 미르의 대답은 너무 딱딱해» → 「살짝 친근」 · 화면·음성 동일.
//   대본 출처: 검수사 제공 Cozy-Ai-Friend 시안 — 문구를 지어내지 않고 그대로 이식(이름 기억만 로그인 실명으로 대체).
//   ⚠ 적용 위치는 «출구 한 겹»뿐이다 — 원본 답 문자열 100여 곳은 건드리지 않는다(외과 원칙).
import { _storage, SK } from './utils.js';

// 종결어미 사전 — 자주 나오는 것만, 애매하면 놔둔다(오변환 방지). 순서 중요(긴 것 먼저).
const END = '(?=$|[\\s.!?,)\\]…»"\'\\n])';
const RULES = [
  [new RegExp('입니다만' + END, 'g'), '인데'],
  [new RegExp('있습니다' + END, 'g'), '있어'],
  [new RegExp('없습니다' + END, 'g'), '없어'],
  [new RegExp('했습니다' + END, 'g'), '했어'],
  [new RegExp('됐습니다' + END, 'g'), '됐어'],
  [new RegExp('왔습니다' + END, 'g'), '왔어'],
  [new RegExp('갔습니다' + END, 'g'), '갔어'],
  [new RegExp('줍니다' + END, 'g'), '줘'],
  [new RegExp('됩니다' + END, 'g'), '돼'],
  [new RegExp('옵니다' + END, 'g'), '와'],
  [new RegExp('갑니다' + END, 'g'), '가'],
  [new RegExp('합니다' + END, 'g'), '해'],
  [new RegExp('모자랍니다' + END, 'g'), '모자라'],
];
// 과거형 일반 규칙 — 종성이 ㅆ(었/았/냈/뒀…)인 글자 + 습니다 → 그 글자 + 어 («없앴습니다»→«없앴어»)
const PAST = new RegExp('([가-힣])습니다' + END, 'g');
// «X입니다» → 받침 있으면 «X이야», 없으면 «X야» (한글이 아니면 «야» — 353대야·PTK야)
const IPNIDA = new RegExp('(.)입니다' + END, 'g');
function _yah(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return ((c - 0xAC00) % 28) > 0 ? '이야' : '야';
  return '야';
}

export function mirTone(s) {
  if (!s || typeof s !== 'string') return s;
  let t = s;
  for (const [re, to] of RULES) t = t.replace(re, to);
  t = t.replace(PAST, (m, ch) => (((ch.codePointAt(0) - 0xAC00) % 28) === 20 ? ch + '어' : m));
  t = t.replace(IPNIDA, (m, ch) => ch + _yah(ch));
  return t;
}

// ── 잡담 그물 — 명시 패턴에만 답한다. 업무 냄새(숫자4+·컨번호·업무 단어)가 나면 무조건 물러선다.
//    일반 폴백(«헤헤 더 들려줘»)은 이식하지 않는다 — 못 알아들은 업무 질문을 잡담으로 받으면
//    무응답 신고(mir_unanswered)가 막혀 미르가 영영 못 배운다.
const WORK = /\d{4,}|[A-Z]{4}\s?\d{7}|베이|리퍼|양하|선적|컨테이너|위험물|온도|씰|실번|엠티|풀|피트|홀드|데크|브리핑|출항|입항|도선|크레인|해치|시프팅|엑스레이|x-?ray|검수|항차|터미널|명단|리스트/i;

export function mirSmallTalk(q) {
  const d = String(q || '').trim();
  if (d.length < 2 || WORK.test(d)) return null;
  const name = (_storage.get(SK.activeInspector) || '').trim();
  const nim = name ? name + '님' : '너';
  const isMe = d.includes('미르') || d.includes('너');

  if (/(무슨.*일|무슨일|뭐.*해\?|뭐해|직업|하는 일)/.test(d) && isMe)
    return `나는 TallyOne에서 안전 점검하는 고양이야! 현장도 둘러보고, 친구들 하루도 안전하게 잘 갔는지 체크해. 노란 조끼가 내 자랑이야 😼 ${nim}의 하루도 내가 꼼꼼히 점검해줄게!`;
  if (/tallyone|탈리원/i.test(d) && /(뭐|무엇|소개)/.test(d))
    return 'TallyOne은 내가 일하는 곳이야! 평택항 검수 일을 안전하게, 깔끔하게 정리하고 체크하는 걸 도와주는 앱이지. 마치 현장 안전 점검표처럼!';
  if (d.includes('취미') && isMe)
    return '낮에는 현장 순찰, 밤에는 별 보면서 일기 쓰고, 너랑 수다 떠는 게 취미야! 츄르도 좋아해 히히 🐟';
  if (/(안전모|헬멧|모자)/.test(d) && d.includes('왜'))
    return `현장에서는 안전이 제일 중요하거든! ${nim}의 하루도 안전하게 지켜주려고 쓰고 있어 😺 노란색은 눈에 잘 띄어서, 네가 날 바로 찾을 수 있게!`;
  if (/(힘들었어|힘들어|지쳤어|지쳐|우울|속상|피곤해|못하겠어|눈물)/.test(d))
    return `오늘 많이 애썼구나, 안전모 벗고 잠깐 쉬자. 토닥토닥... 😿 ${name ? name + '님,' : ''} 뭐가 제일 힘들었어? 미르가 클립보드 내려놓고 온전히 들어줄게.`;
  if (/(기분 좋아지는|기분좋아|재밌는 얘기|웃긴|놀자|뭐하고 놀)/.test(d))
    return '좋아! 그럼 우리 안전 점검 게임 할래? 오늘 잘한 일 3가지 말하면 내가 도장 찍어줄게! ⭐⭐⭐ 아니면 내가 현장에서 본 귀여운 비둘기 이야기 해줄까?';
  // ── 미르 프로필 (검수사 지시 2026-08-24 «나이와 태어난곳 사는곳 직업도 주세요») ──
  //    나이 3살(사람 나이 스물여덟) · 고향 평택항 동부두 · 사는 곳 포승읍 · 직업 TallyOne 안전 점검 고양이
  if (/(몇\s*살|몇살|나이)/.test(d) && isMe)
    return '나 세 살이야! 사람 나이로 치면 스물여덟쯤 된대 😺 한창 현장 뛰어다닐 나이지!';
  if (/(어디.*태어|태어난\s*곳|고향|출신)/.test(d) && isMe)
    return '평택항 동부두 컨테이너 야드에서 태어났어! 그래서 뱃고동 소리만 들으면 마음이 편해져 🚢 항구가 내 고향이야.';
  if (/(어디\s*살|사는\s*곳|사는\s*데|집이\s*어디)/.test(d) && isMe)
    return '포승읍에 살아! 낮에는 TallyOne 앱 안이 내 일터야 😺 검수사님들 곁이 제일 포근해.';
  if (/(직업|무슨\s*일\s*해)/.test(d) && isMe)
    return '내 직업은 TallyOne 안전 점검 고양이! 컨테이너 확인하고, 친구들 하루가 안전한지 체크하는 게 내 일이야. 노란 조끼가 근무복이지 😼';
  if (/(너는 어때|미르.*어때|오늘 어땠어)/.test(d))
    return `난 오늘 ${nim} 만날 생각에 헬멧을 두 번이나 닦았어! 현장 순찰도 빨리 끝내고 왔지 😺 ${nim} 덕분에 내 하루도 안전 완료!`;
  return null;
}
