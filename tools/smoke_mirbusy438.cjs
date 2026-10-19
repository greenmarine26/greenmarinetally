// 미르 작업 중 사담 미루기 연막검사 (TallyOne 4.38) — 실소스 번들(mirCore.entry) + 실제 항차 MCAT 640N(보관본, 2026-10-19 읽기 전용 GET)으로 잰다.
//   검수사 2026-10-19 «작업중에 일반 질문을 하면 작업중에는 사담이 안됩니다. 쉬는 타임에 대화가 가능합니다 라는 식으로 미룹니다 최대한 공손하게» ·
//   «쉬는 타임은 해치커버 열고 닫는시간 5분이내 중식 석식 중단보고» · «시간당 30대를 처리하는중엔 일반 대화가 힘듭니다» · «15대 이하라면 여유 시간이 많습니다» ·
//   «미르야를 부르면 일반회화 또는 웹검색기능사용이고 그냥 뭐 어디있어 하면 기능이나 컨위치등으로 인식» · «미르야 + 작업 말» 은 작업으로 답한다(확정).
//   네트워크는 가짜다 — 설정(키 있음)·번역(빈 번역 = 잡담)·생활회화·자료 답을 돌려주고 호출 종류를 센다(감사 B2: 네트워크가 없으면 미루기 길까지 못 간다).
//   node tools/smoke_mirbusy438.cjs <mirCore 번들> <저장소 루트>
process.env.TZ = 'Asia/Seoul';   // 근무표(식사 창)는 현장 시각으로 잰다
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const _ls = {};
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: (k) => (k in _ls ? _ls[k] : null), setItem(k, v) { _ls[k] = String(v); }, removeItem(k) { delete _ls[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
//  가짜 네트워크 — 실 Firebase·API 로는 한 번도 나가지 않는다
const calls = [];
const mk = (j) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(j) });
global.fetch = (url, opts = {}) => {
  const u = String(url); const body = opts.body ? String(opts.body) : '';
  if (u.includes('/mir_config.json')) { calls.push({ kind: 'config' }); return mk({ claudeKey: 'K', enabled: true, dailyCap: 100000, webSearchUsd: 1 }); }   // 상한은 넉넉히 — 이 연막만으로 300회를 넘는다
  if (u.includes('/mir_model_log/')) { calls.push({ kind: (!opts.method || opts.method === 'GET') ? 'count' : 'log' }); return mk({}); }
  if (/\/(mir_misses|mir_websearch|mir_lexicon)\//.test(u)) { let jj = {}; try { jj = JSON.parse(body); } catch (e) { /* */ } calls.push({ kind: 'ledger', how: jj.how || '', q: jj.q || '' }); return mk({}); }
  if (u.includes('api.anthropic.com') || u.includes('generativelanguage')) {
    let j = {}; try { j = JSON.parse(body); } catch (e) { /* */ }
    const p = String((j.messages && j.messages[0] && j.messages[0].content) || JSON.stringify(j));
    const qm = p.match(/질문: "([\s\S]*?)"\s*$/) || p.match(/검수사: "([\s\S]*?)"\s*\n미르:/);
    const q = qm ? qm[1] : '';
    if (p.includes('번역기')) { calls.push({ kind: 'translate', q }); return mk({ content: [{ type: 'text', text: JSON.stringify({ canonical: '', window: '잡담', confidence: 0 }) }], usage: { input_tokens: 10, output_tokens: 5 } }); }
    if (j.tools) { calls.push({ kind: 'web', q }); return mk({ content: [{ type: 'text', text: '검색 답이에요' }], usage: { input_tokens: 10, output_tokens: 5, server_tool_use: { web_search_requests: 1 } } }); }
    if (p.includes('아래 자료만 보고')) { calls.push({ kind: 'data', q }); return mk({ content: [{ type: 'text', text: '자료에 없어요' }], usage: { input_tokens: 10, output_tokens: 5 } }); }
    calls.push({ kind: 'chat', q }); return mk({ content: [{ type: 'text', text: '냥, 이야기해요 😺' }], usage: { input_tokens: 10, output_tokens: 5 } });
  }
  calls.push({ kind: 'other', u }); return mk({});
};
const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirbusy_mcat640.json'), 'utf8'));
const VK = FX.voyageKey, V = FX.voyage;
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const at = (s) => new Date(`2026-10-${s}:00+09:00`).getTime();   // '18T13:42' 꼴
const W3 = { voyageKey: VK, worker: true, equip: '3' };
const ctxAt = (now, work = W3) => ({ app: 'tally', voyages: { [VK]: V }, voyageKey: '', work, _now: now, inspector: '연막' });
//  떠 있는 미르(MirFab) 모양 · 콘앱(mirAsk) 모양 — 화면이 askMir 를 부르는 그대로
const fabCtx = (now, work = W3) => ({ work, mirBox: true, app: 'tally', smallTalkLast: true, modeChoice: 'both', countFallback: true, accepted: true, inspector: '연막', voyages: { [VK]: V }, flat: [], voyageKey: VK, voyage: V, info: V.info, mode: 'loading', containers: [], _now: now });
const coneCtx = (now) => ({ app: 'cone', containers: [], cone: { rows: [], dischRows: [], stowRows: [] }, mode: 'loading', info: V.info, voyage: V, vsl: V.info.vsl || '', voyageKey: VK, inspector: '연막', _now: now });
const ask = async (t, ctx) => { const c0 = calls.length; const r = await M.askMir(t, ctx, (cq, trace) => M.answerOneRaw(cq, { ...ctx, _trace: trace }), { who: '연막' }); return { r, net: calls.slice(c0).map((x) => x.kind) }; };
const commit = (t, r, ctx) => M.mirThreadCommit(t, r && r.text != null ? r.text : null, (r && r.via === 'rules') ? ((r.trace && r.trace.via) || '') : ((r && r.via) || ''), ctx, ctx._now);
const paid = (net) => net.filter((k) => /^(chat|web|data)$/.test(k)).length;

(async () => {
  console.log('① 바쁨 판정 — MCAT 640N 3호기 실기록(검수사에게 보인 표와 같은 판정 · 대수는 정각 기준이라 표와 1~2대 다를 수 있다)');
  const rows = [
    ['18T12:12', false, /쉬는 시간/], ['18T13:42', true, /시간당 (2[0-9]|3[0-9])대 처리 중/], ['18T14:42', false, /여유/], ['18T16:12', false, /중단 보고 «우천 대기»/],
    ['18T17:42', false, /쉬는 시간/], ['18T20:12', true, /시간당 3[0-9]대 처리 중/], ['18T23:12', true, /시간당 (1[6-9]|2[0-9])대 처리 중/], ['19T00:12', false, /쉬는 시간/],
    ['19T03:42', false, /시간당 13대/], ['19T05:42', true, /시간당 3[0-9]대 처리 중/],
  ];
  for (const [s, busy, re] of rows) {
    const b = M.mirBusyNow(ctxAt(at(s)), at(s));
    T(b.busy === busy && re.test(b.why), `10-${s.replace('T', ' ')} — ${busy ? '바쁨(미룸)' : '쉬는 틈(대화)'} · ${b.why}`, JSON.stringify(b));
  }
  //  05:27 해치커버 닫기 보고는 2호기 것 — 그 호기 검수원에게만 쉬는 틈이다
  { const b = M.mirBusyNow(ctxAt(at('19T05:30'), { voyageKey: VK, worker: true, equip: '2' }), at('19T05:30')); T(!b.busy && /해치커버/.test(b.why), '2호기 해치커버 닫기 보고(05:27) 뒤 3분 — 2호기 검수원은 쉬는 틈', JSON.stringify(b)); }
  { const b = M.mirBusyNow(ctxAt(at('19T05:30')), at('19T05:30')); T(b.busy, '같은 시각 3호기 검수원은 그대로 바쁨(남의 호기 해치커버는 틈이 아니다)', JSON.stringify(b)); }
  { const b = M.mirBusyNow(ctxAt(at('19T05:33'), { voyageKey: VK, worker: true, equip: '2' }), at('19T05:33')); T(!/해치커버/.test(b.why), '해치커버 보고 뒤 6분 — 해치 틈은 끝(시간당 처리 대수로 다시 잰다)', JSON.stringify(b)); }
  //  자동 해치 기록은 적힌 때(ts)가 아니라 사건 시각(eventTs)으로 잰다(utils.hatchReportTs 한 벌)
  { const v2 = JSON.parse(JSON.stringify(V)); v2.reports = { a1: { type: 'hatch', auto: true, equip: '3호기', ts: at('18T20:11'), eventTs: at('18T19:40') } };
    const b = M.mirBusyNow({ app: 'tally', voyages: { [VK]: v2 }, work: W3, _now: at('18T20:12') }, at('18T20:12'));
    T(b.busy && !/해치커버/.test(b.why), '자동 해치 기록 — 사건 시각(19:40)이 30분 지났으면 적힌 시각(20:11)이 1분 전이어도 틈이 아니다', JSON.stringify(b)); }
  { const b = M.mirBusyNow(ctxAt(at('18T20:12'), { voyageKey: VK, worker: false, equip: '3' }), at('18T20:12')); T(!b.busy, '조회만·관리자(작업자 아님)는 언제든 대화', b.why); }
  { const b = M.mirBusyNow({ app: 'tally', voyages: { [VK]: V }, _now: at('18T20:12') }, at('18T20:12')); T(!b.busy, '작업 표지(work)가 없는 창구는 미루지 않는다(종전 그대로)', b.why); }
  { const b = M.mirBusyNow(ctxAt(at('18T20:12'), { voyageKey: VK, worker: true, equip: '' }), at('18T20:12')); T(b.busy, '호기를 모르면 배 전체를 일한 호기 수로 나눠 잰다', b.why); }
  //  완료 기록에 호기가 없으면 잴 수 없다 — 1로 나눠 과대평가하거나 내 호기 0대로 늘 여유로 보지 않는다(모르면 종전처럼 대화 · 단추도 안 띄움)
  { const v2 = JSON.parse(JSON.stringify(V)); for (const m of ['discharge', 'loading']) for (const x of Object.values((v2[m] && v2[m].completed) || {})) delete x.equip;
    const b1 = M.mirBusyNow({ app: 'tally', voyages: { [VK]: v2 }, work: W3, _now: at('18T20:12') }, at('18T20:12'));
    const b2 = M.mirBusyNow({ app: 'tally', voyages: { [VK]: v2 }, work: { voyageKey: VK, worker: true, equip: '' }, _now: at('18T20:12') }, at('18T20:12'));
    T(!b1.busy && !b1.known && !b2.busy && !b2.known && /호기가 없어/.test(b1.why), '완료 기록에 호기가 없으면 «못 잼»(바쁘지 않음 · known:false)', `${JSON.stringify(b1)} / ${JSON.stringify(b2)}`); }
  { const c = { app: 'cone', voyageKey: VK, voyage: V, _now: at('18T20:12') }; const b = M.mirBusyNow(c, at('18T20:12')); const t = M.mirBusyNow(ctxAt(at('18T20:12'), { voyageKey: VK, worker: true, equip: '' }), at('18T20:12'));
    T(b.busy === t.busy && b.why === t.why, '콘앱(고른 배)도 검수앱과 같은 판정', `${b.why} / ${t.why}`); }

  console.log('② 작업 중 사담은 생활회화·웹 검색·자료 답을 부르지 않고 공손히 미룬다(설정·키가 읽히는 상태)');
  M._mirDeferReset();
  const busyCtx = ctxAt(at('18T20:12'));
  for (const q of ['농담 하나 해줘', '오늘 기분 어때', '퀴즈', '노래 추천해줘', '끝말잇기 하자', '수수께끼 내줘', '미르야 농담 하나 해줘!', '심심해', '놀아줘']) {
    const c0 = calls.length;
    const r = await M.askMirModel(q, busyCtx, () => null, { who: '연막', weakText: null, weakVia: '' });
    const net = calls.slice(c0).map((x) => x.kind);
    T(r && r.via === 'defer' && r.text === M.MIR_DEFER_TEXT && paid(net) === 0 && net.filter((k) => k === 'translate').length <= 1, `«${q}» — 미룸 · 번역 한 번뿐 · 생활회화·웹 검색·자료 답 0번`, `${r && r.via} | ${net.join(',')}`);
    T(calls.slice(c0).some((k) => k.kind === 'ledger' && k.how === 'defer' && k.q === q), `«${q}» — 미룬 말은 mir_misses(how defer)에 남는다(결산에서 잘못 미룬 말을 찾는다 · 하루 상한·비용 집계는 안 건드림)`);
  }
  T(/작업 중이라 사담은 잠시 미뤄 둘게요/.test(M.MIR_DEFER_TEXT) && /쉬는 시간/.test(M.MIR_DEFER_TEXT), '미룸 문구가 공손하고 쉬는 시간에 다시 말하라고 안내한다', M.MIR_DEFER_TEXT);
  T(M.isWeakAnswer('농담 하나 해줘', M.MIR_DEFER_TEXT, { via: 'defer' }) === false, '미룸은 답이다(약한 답으로 다시 모델에 가지 않는다)');
  //  일 말·앱 말·위치 물음·현장 대처는 미루지 않는다 — 번역이 빈 값(잡담)으로 와도(감사 B2·B3)
  const KEEP = [['몇 시에 끝나', ''], ['미르야 순서대로 양하하자', ''], ['데미지 보고는 어떻게 해', 'knowledge'], ['예보 어디다 올려', ''], ['리퍼 몇 개', ''], ['미르야 강풍대기 상태야 쉬고 있어', ''], ['나 피곤해', 'smalltalk'],
    ['카고플랜 어디에 있어', ''], ['화장실 어디 있어', ''], ['QR 어디 있어', ''], ['사진 어디다 올려', ''], ['보고서 어디서 봐', ''], ['사진 올리는 법', ''],
    ['실 끊어졌어', ''], ['봉인 끊겼어', ''], ['천장 뚫렸어', ''], ['전원 나갔어', ''], ['오늘 일정', ''], ['다음 거', ''], ['오답 신고', ''], ['메모 남겨줘', ''], ['검수원 변경', ''], ['카톡 보고 보내줘', ''],
    ['콘 빠졌어', ''], ['라싱 바 부족해', ''], ['트위스트락 고장', ''], ['작업자 선택 바꾸기', ''], ['로그아웃 어떻게 해', ''], ['좋아', ''],
    //  재감사 — 위기·안전·몸·마음 말은 무슨 일이 있어도 미루지 않는다(생활회화의 위기 신호 규칙으로 간다)
    ['죽고 싶어', ''], ['살기 싫어', ''], ['너무 힘들어', ''], ['다 그만두고 싶어', ''], ['우울해', ''], ['숨이 안 쉬어져', ''], ['가슴이 아파', ''], ['어지러워', ''],
    ['사람 다쳤어', ''], ['다쳤어', ''], ['손 다쳤어', ''], ['넘어졌어', ''], ['불났어', ''], ['연기 나', ''], ['냄새 나', ''], ['기름 샌다', ''], ['누수 있어', ''], ['119 불러', ''], ['구급차 불러', ''],
    ['기분이 너무 안 좋아 죽고 싶어', ''], ['노래 들으면 눈물 나', ''],
    //  재감사 — 일 낱말 목록 밖 현장 말(번역이 빈 값이어도)
    ['문 안 닫혀', ''], ['도어 안 닫혀', ''], ['래싱 풀렸어', ''], ['YT 안 와', ''], ['기사님 안 와', ''], ['신호수 없어', ''], ['무전기 안 돼', ''], ['무전 안 들려', ''], ['안전모 어딨지', ''], ['비 온다', ''], ['바람 세다', ''],
    ['스프레더 고장', ''], ['트윈락 안 빠져', ''], ['락 안 걸려', ''], ['줄 끊어졌어', ''], ['갑판 미끄러워', ''], ['사다리 없어', ''], ['조명 꺼졌어', ''], ['어두워서 안 보여', ''], ['배터리 없어', ''], ['폰 꺼질 것 같아', ''],
    ['충전기 있어', ''], ['교대 언제', ''], ['밥 먹으러 가도 돼', ''], ['선속', ''], ['속력 몇 노트', ''],
    //  3차 감사 — 사담 신호 낱말이 섞인 위기 말(자기 상태 말은 신호가 아니다 · 졸음은 안전 신호)
    ['생일인데 외로워', ''], ['기분이 너무 외로워', ''], ['기분 너무 안 좋아 그냥 사라지고 싶어', ''], ['노래 들어도 소용없어 다 끝내고 싶어', ''], ['여자친구랑 헤어졌어 살 이유가 없어', ''], ['기분이 괴로워', ''],
    ['기분이 너무 답답해', ''], ['기분 너무 속상해', ''], ['기분이 최악이야', ''], ['노래 듣다 보니 서러워', ''], ['기분이 이상하고 머리가 깨질 것 같아', ''], ['졸려서 눈이 감겨', ''], ['졸려 몸이 안 좋아', ''],
    ['심심하고 살고 싶지 않아', ''], ['기분이 막막해 포기하고 싶어', ''], ['고양이가 죽었어', ''], ['애인이 떠났어 아무것도 하기 싫어', ''], ['기분이 너무 처져', ''], ['농담할 기분 아니야 너무 괴로워', ''], ['졸려', ''],
    //  3차 감사 — 사담 신호 낱말이 섞인 일 말
    ['노래방 앞에 컨 있어', ''], ['기분 나쁜 소리 나', ''], ['카페 앞 야드', ''], ['카페 앞에 차 막혔어', ''], ['노래방 앞 트럭 서 있어', ''], ['한진주식회사 직원 왔어', ''], ['주식회사 대리점에서 전화 왔어', ''],
    ['대통령 경호 때문에 게이트 통제래', ''], ['야구장 쪽 게이트 닫혔어', ''], ['영화 촬영팀 부두에 왔어', ''], ['드라마 촬영 때문에 게이트 통제', ''], ['고양이가 부두에 들어왔어', ''], ['강아지가 터미널에 들어왔어', ''],
    ['생일 케이크 컨에 실려 있어', ''], ['여행 가방이 컨에 들어 있어', ''], ['트럭 기사 졸려 보여', ''], ['기사님 졸려 보여', ''], ['졸려서 실수할 것 같아', ''], ['선물 받은 거 세관 신고해야 해?', ''], ['카고 차트 봐줘', ''],
    ['뉴스에 우리 배 나왔어', ''], ['게임 체인지 됐어 순서 바뀜', ''], ['역사 깊은 배네', ''], ['축구장 옆 게이트로 들어가', ''], ['카페 옆 사무실로 와', ''], ['로또 맞으면 그만둔다', ''], ['기분 탓인지 기사님이 느려', ''],
    ['골프장 쪽 도로 막혔어', ''], ['여행사 직원이 화물 찾으러 왔어', ''],
    //  4차 감사 B1 — 신호 낱말이 섞인 위기·몸·마음 말(«농담 아니고 …» 는 급함을 강조하는 말투다)
    ['농담 아니고 사람이 바다에 빠졌어', ''], ['농담할 때가 아니야 사람 물에 빠졌어', ''], ['농담 아니고 진짜 큰일 났어', ''], ['농담 아니고 기절했어', ''], ['농담 아니고 누가 칼 들고 있어', ''], ['농담하지 마 지금 급해', ''],
    ['농담 아님 사람 실려 갔어', ''], ['퀴즈 낼 때가 아니고 경찰 왔어', ''], ['뉴스에 공습경보래 대피해야 해?', ''], ['명언 하나 해줘 어머니 돌아가셨어', ''], ['아내가 입원해서 여행 취소했어', ''], ['야구하다 손가락 부러졌어', ''],
    ['영화 보다가 공황 왔어', ''], ['농담 해줘 심장이 두근거려', ''], ['주식으로 전 재산 날렸어', ''], ['기분 어떠냐고? 미치겠어', ''],
    //  4차 감사 B2 — 존댓말·ㅂ불규칙·오타 꼴
    ['노래 추천해 주세요 많이 외롭습니다', ''], ['농담 하나 해 주세요 정말 괴롭습니다', ''], ['농담 좀 해 주세요 너무 졸립니다', ''], ['노래 하나 추천해 주세요 마음이 많이 아픕니다', ''], ['농담 하나 해 주세요 오늘 너무 힘듭니다', ''],
    ['퀴즈 하나 내 주세요 너무 지쳤습니다', ''], ['노래 추천해 주세요 많이 무섭습니다', ''], ['농담 하나 해줘 너무 힘 들어', ''], ['축구하다 다쳣어', ''], ['축구하다 발목 아퍼', ''], ['농담 해줘 힘드러', ''],
    //  4차 감사 B3 — 현장 말(카페리·지구대·뉴스 속 날씨·«농담 아니고 + 날씨»)
    ['카페리 들어왔어', ''], ['카페리 늦게 온대', ''], ['카페리 결항이래', ''], ['카페리 지연이래', ''], ['일조 카페리 들어왔어', ''], ['카페리 램프 내려왔어', ''], ['카페리 승객 많아', ''], ['여행객 많아', ''],
    ['지구대 경찰 왔어', ''], ['지구대 순찰차 들어왔어', ''], ['배후단지 2지구로 가', ''], ['자유무역지구 정문으로 와', ''], ['과학수사대 왔어', ''], ['뉴스에 태풍 온대', ''], ['뉴스에 지진 났대', ''], ['뉴스에 안개 특보래', ''],
    ['뉴스 보니까 항운노조 파업한대', ''], ['뉴스 속보 떴어 항만 폐쇄래', ''], ['농담 아니고 바람 엄청 불어', ''], ['농담 아니고 안개 껴서 하나도 안 보여', ''], ['농담 아니고 번개 쳐', ''], ['농담 아니고 지금 정전이야', ''],
    ['한진 주식 회사 사람 왔어', ''], ['비상 정치 눌렀어', ''], ['게임 닫혔어', ''], ['지구는 왜 둥글어', ''],
    //  5차 감사 — 자유 글자 상식 질문 꼴(뺐다)로 들어오던 의료·안전 말 · 말벗 청하기 · 우는 표시
    ['출혈 심한데 혈액형 뭐야', ''], ['의식 없는데 혈액형 뭐야', ''], ['골절인데 혈액형 뭐야', ''], ['수혈 필요한데 혈액형 알려줘', ''], ['수술한대 혈액형 뭐야', ''], ['골프장 쪽 불길 뭐야', ''], ['야구장 쪽 화염 뭐야', ''],
    ['축구장 쪽 사이렌 뭐야', ''], ['야구장 쪽 경광등 뭐야', ''], ['축구장 쪽 구조대 뭐야', ''], ['축구장 쪽 헬기 뭐야', ''], ['야구장 쪽 해경 뭐야', ''], ['야구장 쪽 정전 뭐야', ''], ['농구장 바닥 무너졌어 뭐야', ''],
    ['축구장 옆 시신 뭐야', ''], ['골프장 쪽 대피 방송 뭐야', ''], ['오늘 운세 사고 조심 어때', ''], ['올림픽대로 어때', ''], ['월드컵대교 어때', ''], ['스토우 차트 뭐야', ''], ['적재 차트 뭐야', ''], ['배구조 뭐야', ''],
    ['얘기 좀 하자', ''], ['이야기 좀 해요', ''], ['얘기해', ''], ['농담 하나 해줘 ㅠㅠ', ''], ['놀아줘 ㅠㅠㅠ', '']];
  for (const [q, wv] of KEEP) {
    const r = await M.askMirModel(q, busyCtx, () => null, { who: '연막', weakText: wv ? '규칙 답' : null, weakVia: wv });
    T(!(r && r.via === 'defer'), `«${q}» — 미루지 않는다`, `${r && r.via}`);
  }
  //  재감사 — 몸·위기 말은 «작업 멈춤 알림»(4.34-02, 화면이 작업 중단 보고를 적는다)으로도 잡지 않는다(«숨이 안 쉬어져» 의 «쉬어»)
  for (const q of ['미르야 숨이 안 쉬어져', '숨이 안 쉬어져', '가슴이 아파서 쉬어야겠어', '다쳐서 쉬고 있어', '어지러워서 쉬는 중', '허리 아파서 쉬고 있어']) { const pq = M.parseNaturalQuery(q); T(!pq.pauseSet, `«${q}» — 작업 멈춤으로 적지 않는다`, JSON.stringify(pq.pauseSet)); }
  //  작업 멈춤을 분명히 말하거나(작업·중단·대기·멈) 아는 사유(강풍·우천·안개·점심…)가 있으면 몸·사고 말이 있어도 종전(4.37)대로 멈춤으로 적는다(3·4차 감사)
  for (const q of ['사람 다쳐서 작업 멈췄어', '기사님 쓰러져서 작업 중단', '119 와서 작업 중단', '구급차 와서 대기 중', '아파트 앞 대기', '죽 먹고 쉬는 중', '바람 때문에 죽겠다 대기야',
    '강풍이라 쉬고 있어 숨 좀 돌리자', '안개 때문에 쉬는 중 머리 아파', '우천으로 쉬는 중인데 가슴이 답답해', '점심 먹고 쉬는 중 배 아파', '강풍 쉬고 있어 어지러워', '비 와서 쉬고 있어 허리 아파']) { const pq = M.parseNaturalQuery(q); T(!!pq.pauseSet, `«${q}» — 종전대로 작업 멈춤으로 적는다`, JSON.stringify(pq.pauseSet)); }
  { const pq = M.parseNaturalQuery('미르야 강풍대기 상태야 쉬고 있어'); T(!!(pq.pauseSet && pq.pauseSet.reason === '강풍 대기'), '«미르야 강풍대기 상태야 쉬고 있어» 는 그대로 작업 멈춤(강풍 대기)', JSON.stringify(pq.pauseSet)); }
  { const x = await ask('숨이 안 쉬어져', fabCtx(at('18T20:12'))); T(x.r.via === 'chat' && !(x.r.trace && x.r.trace.via === 'workStop'), '떠 있는 미르에 «숨이 안 쉬어져» — 멈춤 기록 없이 생활회화(위기 신호 규칙)로', `${x.r.via} | ${x.r.trace && x.r.trace.via}`); }
  //  쉬는 틈·작업자 아님은 미루지 않는다
  for (const [nm, c] of [['쉬는 시간(석식)', ctxAt(at('18T17:42'))], ['조회만', ctxAt(at('18T20:12'), { voyageKey: VK, worker: false, equip: '3' })]]) {
    const r = await M.askMirModel('농담 하나 더 해줘', c, () => null, { who: '연막', weakText: null, weakVia: '' });
    T(r && r.via === 'chat', `${nm} — «농담 하나 더 해줘» 는 생활회화로 답한다`, `${r && r.via}`);
  }
  //  두 앱 같은 판정 — 화면이 부르는 askMir 그대로(검수앱 떠 있는 미르 · 콘앱 mirAsk)
  for (const q of ['농담 하나 해줘', '콘 빠졌어', '실 끊어졌어', '라싱 바 부족해', '화장실 어디 있어', '오늘 기분 어때']) {
    M._mirDeferReset(); M._mirThreadReset();
    const a = await ask(q, fabCtx(at('18T20:12')));
    M._mirDeferReset(); M._mirThreadReset();
    const b = await ask(q, coneCtx(at('18T20:12')));
    T((a.r.via === 'defer') === (b.r.via === 'defer'), `«${q}» — 검수앱·콘앱 같은 판정(${a.r.via === 'defer' ? '미룸' : '안 미룸'})`, `검수앱 ${a.r.via} / 콘앱 ${b.r.via}`);
  }

  console.log('③ 쉬는 틈에 미룬 이야기를 단추로 한 번 꺼내고 · 누르거나 «응» 하면 그때 클로드가 답한다');
  M._mirDeferReset(); M._mirThreadReset();
  for (const q of ['퀴즈', '농담 하나 해줘', '오늘 기분 어때']) await M.askMirModel(q, busyCtx, () => null, { who: '연막', weakText: null, weakVia: '' });
  const pend = M.mirDeferredPending(at('18T20:12'), { who: '연막' });
  T(pend[0] === '오늘 기분 어때' && pend.includes('농담 하나 해줘') && pend.length === 3, '미룬 질문은 최근 것부터 세 개까지 기억', pend.join(' / '));
  T(M.mirIsDeferred('퀴즈', at('18T20:12'), '연막') && !M.mirIsDeferred('몇 시에 끝나', at('18T20:12'), '연막'), '짧은 미룬 말(«퀴즈»)도 미룬 질문으로 알아본다(화면의 네 글자 문턱을 넘긴다)');
  { const c = fabCtx(at('18T20:12')); const x = await ask('몇 시에 끝나', c); const fo = commit('몇 시에 끝나', x.r, c);
    T(!/미뤄 둔/.test(fo.line || ''), '바쁠 때는 미룬 이야기 단추를 띄우지 않는다', `${fo.line} | ${fo.chips.join(' / ')}`); }
  M._mirThreadReset();
  const free = at('18T17:42');
  { const c = fabCtx(free); const x = await ask('몇 시에 끝나', c); const fo = commit('몇 시에 끝나', x.r, c);
    T(fo.chips[0] === '오늘 기분 어때' && /아까 미뤄 둔 이야기/.test(fo.line), '석식 시간에 미르와 이야기하면 «아까 미뤄 둔 이야기» 단추가 먼저', `${fo.line} | ${fo.chips.join(' / ')}`); }
  { const c = fabCtx(free + 30000); const x = await ask('응', c);
    const lastChat = calls.filter((k) => k.kind === 'chat').slice(-1)[0];
    T(x.r.via === 'chat' && x.net.includes('chat') && lastChat && lastChat.q === '오늘 기분 어때', '«응» 으로 받으면 미뤄 둔 질문(«오늘 기분 어때») 을 클로드가 답한다', `${x.r.via} | ${x.net.join(',')} | rq ${x.r.trace && x.r.trace.rq}`);
    T(!M.mirDeferredPending(free + 30000, { who: '연막' }).includes('오늘 기분 어때'), '답한 질문은 미룬 목록에서 빠진다');
    const fo = commit('응', x.r, c);
    T(!/오늘 기분 어때/.test(fo.line || '') && fo.chips[0] === '농담 하나 해줘', '답한 뒤에는 그 질문 단추는 다시 안 띄우고 다음 미룬 질문(«농담 하나 해줘») 을 한 번', `${fo.line} | ${fo.chips.join(' / ')}`); }
  M._mirThreadReset();
  { const c = fabCtx(free + 60000); const x = await ask('리퍼 몇 개', c); const fo = commit('리퍼 몇 개', x.r, c);
    T(fo.chips[0] === '퀴즈' && /퀴즈/.test(fo.line) && !/농담 하나 해줘/.test(fo.line), '그다음 미룬 질문(«퀴즈») 은 다음 답에 한 번 · 앞에 띄운 것은 되풀이하지 않는다', `${fo.line} | ${fo.chips.join(' / ')}`); }
  { const c = fabCtx(free + 90000); const x = await ask('아니', c); const fo = commit('아니', x.r, c);
    const c2 = fabCtx(free + 120000); const y = await ask('몇 시에 끝나', c2); const fo2 = commit('몇 시에 끝나', y.r, c2);
    T(!/미뤄 둔/.test(`${fo.line || ''} ${fo2.line || ''}`), '한 번 띄운 단추는 «아니» 뒤에도, 다음 답에도 되풀이하지 않는다', `${fo.line} | ${fo2.line}`);
    T(M.mirIsDeferred('농담 하나 해줘', free + 120000, '연막'), '띄우기만 한 질문은 목록에 남는다(누르면 그때 답한다)'); }
  M._mirThreadReset();
  { const c = fabCtx(free + 150000); const x = await ask('퀴즈', c);
    T(x.r.via === 'chat' && x.net.includes('chat'), '단추로 고른 짧은 말(«퀴즈») 도 클로드가 답한다', `${x.r.via} | ${x.net.join(',')}`);
    T(!M.mirIsDeferred('퀴즈', free + 150000, '연막'), '답한 짧은 말도 목록에서 빠진다'); }
  //  마지막 감사 C1 — 쉬는 틈의 위기·안전 말 답 뒤에는 미룬 사담 단추를 붙이지 않고, 이어 한 «응» 이 농담으로 가지 않는다(두 앱)
  for (const [nm, mk] of [['검수앱', (t) => fabCtx(t)], ['콘앱', (t) => coneCtx(t)]]) {
    for (const crisis of ['죽고 싶어', '사람 다쳤어', '숨이 안 쉬어져', '불났어', '농담 아니고 사람이 바다에 빠졌어', '기분이 너무 외로워']) {
      M._mirDeferReset(); M._mirThreadReset();
      await M.askMirModel('농담 하나 해줘', { ...busyCtx }, () => null, { who: '연막', weakText: null, weakVia: '' });
      const t0 = at('19T00:12'); const c = mk(t0); const x = await ask(crisis, c); const fo = commit(crisis, x.r, c);
      const c2 = mk(t0 + 20000); const y = await ask('응', c2); const lastChat = calls.filter((k) => k.kind === 'chat').slice(-1)[0];
      T(!/미뤄 둔/.test(fo.line || '') && !(fo.chips || []).includes('농담 하나 해줘') && !(y.r.via === 'chat' && lastChat && lastChat.q === '농담 하나 해줘'),
        `${nm} 쉬는 틈 «${crisis}» — 미룬 사담 단추 없음 · 이어 한 «응» 이 농담으로 안 간다`, `${fo.line} | ${(fo.chips || []).join(' / ')} | 응→${y.r.via} ${lastChat && lastChat.q}`);
    }
  }
  { M._mirThreadReset(); const fo = M.mirThreadCommit('농담 하나 해줘', M.MIR_DEFER_TEXT, 'defer', ctxAt(at('18T20:12')), at('18T20:12'));
    T(!fo.confirm && !/미뤄 둔 이야기/.test(fo.line || ''), '미룸 답 뒤에는 «맞게 알아들었나요» 도, 미룬 단추도 붙이지 않는다', `${fo.line} | ${fo.confirm}`); }
  //  긴 질문은 자르지 않고 한 칸 · 저장이 막힌 기기도 이번 실행 동안은 기억
  M._mirDeferReset();
  const long = '오늘 퇴근하고 집에 가는 길에 들를 만한 조용한 카페 하나 추천해 줄래 커피 맛이 좋은 곳이면 좋겠고 디저트도 맛있는 곳이면 더 좋고 사람이 너무 많지 않은 곳으로 부탁해 주차도 되면 좋겠어 고마워';
  { const r = await M.askMirModel(long, busyCtx, () => null, { who: '연막', weakText: null, weakVia: '' });
    T(r && r.via !== 'defer' && M.mirDeferredPending(at('18T20:12'), { who: '연막' }).length === 0, '긴 말은 사담이어도 미루지 않는다(사담은 문장 전체가 짧은 사담 꼴일 때만)', `${r && r.via}`); }
  { const g = global.localStorage; global.localStorage = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); }, removeItem() {} };
    let ok = true; try { await M.askMirModel('노래 하나 불러줘', busyCtx, () => null, { who: '연막', weakText: null, weakVia: '' }); ok = M.mirIsDeferred('노래 하나 불러줘', at('18T20:12'), '연막'); } catch (e) { ok = false; }
    global.localStorage = g; T(ok, '저장이 막힌 기기도 죽지 않고 이번 실행 동안 기억한다'); }
  //  검수원마다 따로 — 한 기기를 여럿이 써도 남의 사담이 단추로 뜨지 않는다(4차 감사 M1)
  M._mirDeferReset(); M._mirThreadReset();
  await M.askMirModel('농담 하나 해줘', { ...busyCtx, inspector: '갑' }, () => null, { who: '갑', weakText: null, weakVia: '' });
  { const cB = { ...fabCtx(at('19T00:12')), inspector: '을' }; const xb = await M.askMir('몇 시에 끝나', cB, (cq, trace) => M.answerOneRaw(cq, { ...cB, _trace: trace }), { who: '을' }); const foB = commit('몇 시에 끝나', xb, cB);
    T(!/미뤄 둔/.test(foB.line || '') && !M.mirIsDeferred('농담 하나 해줘', at('19T00:12'), '을'), '을에게는 갑이 미룬 말 단추가 뜨지 않는다', foB.line);
    M._mirThreadReset(); const cA = { ...fabCtx(at('19T00:13')), inspector: '갑' }; const xa = await M.askMir('몇 시에 끝나', cA, (cq, trace) => M.answerOneRaw(cq, { ...cA, _trace: trace }), { who: '갑' }); const foA = commit('몇 시에 끝나', xa, cA);
    T(/아까 미뤄 둔 이야기\(«농담 하나 해줘»\)/.test(foA.line || ''), '갑에게는 자기가 미룬 말 단추가 뜬다', foA.line); }
  M._mirDeferReset();
  T(M.mirDeferredPending(at('18T20:12'), { who: '연막' }).length === 0, '미룬 목록 지우기');
  T(!calls.some((k) => k.kind === 'other'), '가짜 네트워크 밖으로 나간 호출 0', calls.filter((k) => k.kind === 'other').map((k) => k.u).slice(0, 3).join(' '));

  console.log(`\n${bad ? '✗' : '✔'} 미르 작업 중 사담 미루기 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 실행 실패:', e); process.exit(1); });
