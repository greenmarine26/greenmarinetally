// 4.87 미르 비용·학습 수리 연막검사 — ① 하루 키는 한국 시각(UTC+9) 기준 ② 자동 별칭 거름(슬롯만 있는 키·시각 물음 불일치) 순수 판정
//   실행 — node tools/smoke_mirfix487.cjs <repoRoot>   (번들 없이 네이티브 ESM 으로 src 를 직접 연다)
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
process.env.TZ = 'America/Los_Angeles';   // 기기가 한국이 아니어도 같은 키가 나와야 한다
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };

(async () => {
  const A = await import(pathToFileURL(path.join(root, 'src/aiCost.js')).href);
  const M = await import(pathToFileURL(path.join(root, 'src/mir.js')).href);

  console.log('[1] 하루 키 — 한국 시각 경계');
  const t1459 = Date.UTC(2026, 10, 9, 14, 59, 59, 999), t1500 = Date.UTC(2026, 10, 9, 15, 0, 0, 0);
  ok(A.aiDayKey(t1459) === '261109', `UTC 14:59:59 = KST 23:59 → 261109 (${A.aiDayKey(t1459)})`);
  ok(A.aiDayKey(t1500) === '261110', `UTC 15:00:00 = KST 00:00 → 261110 (${A.aiDayKey(t1500)})`);
  ok(A.aiDayKey(t1459) !== A.aiDayKey(t1500), 'UTC 14:59 와 15:00 은 서로 다른 날');
  ok(A.aiDayKey(Date.UTC(2026, 11, 31, 15, 0)) === '270101', '연말 경계 — 12/31 15:00 UTC = 1/1 KST → 270101');
  ok(A.aiDayKey(Date.UTC(2026, 0, 5, 3, 0)) === '260105', '한낮은 종전과 같은 모양 YYMMDD(0 채움)');
  const days = A.aiPeriodDays('month', t1500);
  ok(days.length === 10 && days[0] === '261110' && days[9] === '261101', `이번 달 목록은 KST 10일치 (${days.length}, ${days[0]}~${days[days.length - 1]})`);
  ok(JSON.stringify(A.aiPeriodDays('today', t1459)) === '["261109"]' && A.aiPeriodDays('7d', t1500)[1] === '261109', '오늘·7일 목록도 같은 키');

  console.log('[2] 자동 별칭 거름 — 순수 판정');
  const R = M.mirAutoAliasReject;
  ok(typeof R === 'function', 'mirAutoAliasReject 를 내보낸다');
  ok(!!R('STMJ', '브리핑'), '배 이름만 친 말(키 «{ship}»)은 거절');
  ok(!!R('STMJ 12', '브리핑'), '슬롯만 둘({ship} {n})인 키는 거절');
  ok(!!R('STMJ 몇', '브리핑'), '슬롯 빼고 한 글자(몇)인 키는 거절');
  ok(!!R('0230', '중량') && !!R('0230 3', '중량'), '컨 번호만·숫자만 친 키도 거절');
  ok(R('STMJ 카고플랜', 'STMJ 양하 카고플랜') === '', '정상 키(슬롯 + 낱말) 통과');
  ok(R('카고플랜', '카고 플랜 보여줘') === '', '슬롯 없는 두 글자 이상 키 통과');
  ok(R('오늘 몇 시부터 했어', '작업 몇 시에 시작했어') === '', '시각을 묻는 말 → 시각을 묻는 말은 통과');
  ok(!!R('몇 시쯤 끝나', '남은 대수'), '원문에 시각 물음이 있고 번역에는 없으면 거절');
  ok(!!R('언제 끝나', '리퍼 몇 대'), '«언제» 가 번역에 없으면 거절');
  ok(!!R('리퍼 몇 대', '언제 끝나'), '반대 방향(번역에만 시각 물음)도 거절');
  ok(R('리퍼 몇 대', '리퍼 대수') === '' && R('몇시에 끝나', '몇 시쯤에 끝나') === '', '시각 물음이 양쪽에 없거나 띄어쓰기만 다르면 통과');

  console.log('[3] mirLearnAlias — 거절은 쓰지 않고 한 줄 경고, 정상은 사전에 auto 로');
  const writes = []; const warns = [];
  global.window.__mirLexiconWrite = (k, e) => { writes.push([k, e]); };
  const _warn = console.warn; console.warn = (...a) => { warns.push(a.join(' ')); };
  const k1 = M.mirLearnAlias('STMJ', '브리핑', '시험');
  const k2 = M.mirLearnAlias('몇 시쯤 끝나', '남은 대수', '시험');
  const k3 = M.mirLearnAlias('MCSC 카고플랜', 'MCSC 양하 카고플랜', '시험');
  console.warn = _warn;
  ok(k1 === null && k2 === null, '거절된 둘은 null');
  ok(writes.length === 1 && writes[0][1].auto === true && writes[0][1].kind === 'alias', `정상 하나만 보관소 손으로 써진다(${writes.length}건, auto=${writes[0] && writes[0][1].auto})`);
  ok(typeof k3 === 'string' && !!global.window.__mirLexicon[k3], '정상 별칭은 이 폰 사전에도 들어간다');
  ok(!global.window.__mirLexicon['{ship}'] && Object.keys(global.window.__mirLexicon).length === 1, '거절된 키는 사전에 없다');
  ok(warns.length === 2 && warns.every((w) => /별칭 거절/.test(w)), `거절마다 경고 한 줄(${warns.length}줄)`);

  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막 중 예외', e); process.exit(1); });
