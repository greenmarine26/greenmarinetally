// TallyOne 1.8-15: 카톡 작업방 기록 → 타임시트 보강
//
// 왜 (검수사 확정 2026-08-05)
//   해치커버를 앱이 아니라 **카톡에 손으로 쳐서** 보고한 건이 많다. 되묻는 게 성가셔 우회했거나,
//   1호기·2호기가 각자 편한 방식으로 보냈다. 그래서 앱 기록에는 오픈만 남고 클로즈가 비어,
//   마감 텔리 타임시트가 "커버가 열린 채 마감"으로 나왔다(STMJ 2643E 실측 — 불가능한 서류).
//   카톡방에는 실제로 다 남아 있다. **그 방을 정본으로 삼아 빠진 것을 메운다.**
//
// 무엇을 읽나 (실물 로그 2026-08-05 STMJ 전수 기준)
//   줄 형식      `[발신자] [HH:MM] 내용`  ·  날짜 전환선 `26년 8월 5일`
//   해치 오픈    `26번베이 커버 2장 오픈` · `13&15 H/O 2장 입니다` · 앱 형식(여러 줄)
//   해치 클로즈  `14번베이 커버 2장 클로즈` · `05&07 H/C 2장 입니다` · 앱 형식
//   작업         `1호기 양하시작` · `1호기 양하종료` · `2호기 양하완료 선적시작`(한 줄에 둘)
//   장비         내용 안에 있거나, 22:16 처럼 **다음 메시지**에 따로 온다 → 바로 뒤 1분 이내면 물려준다
//
// ⚠ 베이 표기가 두 가지다. `13&15`(홀수 쌍 = 13-14-15 한 슬롯)와 `26번베이`(짝수 단독)가
//   같은 슬롯을 가리킨다. 둘 다 그대로 담고, 그룹 판정은 읽는 쪽(bayGroupCenter)에 맡긴다.
// ⚠ 사진·잡담(`사진 3장`, `넹`, `씰번호 리스트랑 맞아요`)은 버린다. 지어내지 않는다.
import { hatchReportTs } from './utils.js';   // 3.49: 자동 해치 기록의 사건 시각(eventTs) 한 벌

//  ★ 3.53-01 — **어느 방식으로 복사해도 읽힌다.** 검수사 2026-09-16 «여기에 왜 추가가 안되죠?»
//    1.8-15 는 검수사가 준 STMJ 로그 한 가지(`[22:16]`)만 물려 있었다. 그런데 카카오톡에서 복사하면
//    대개 **«[오후 10:16]»** 으로 나오고, 그러면 `RE_LINE` 이 한 줄도 못 물어 **전량 0건**이 된다
//    (실측 — 오전·오후 0건 · 폰 내보내기 0건 · 24시각만 1건). 화면은 «읽을 수 있는 작업 기록이
//    없습니다» 만 말해서 검수사가 무엇이 잘못됐는지 알 길이 없었다.
//    ⇒ 시각을 읽는 자리를 **한 벌**로 모으고 세 가지를 다 받는다(규범 §4-4 — 입구에 문지기).
//      ① PC 카톡 `[이름] [오후 10:16] 내용`  ② 종전 `[이름] [22:16] 내용`  ③ 폰 내보내기
//      `2026년 9월 16일 오후 10:16, 이름 : 내용`
/** `[이름] [22:16]` · `[이름] [오후 10:16]` — 오전/오후는 있어도 없어도 된다 */
const RE_LINE = /^\[([^\]]*)\]\s*\[\s*(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})\s*\]\s*(.*)$/;
/** 폰 카톡 내보내기 `2026년 9월 16일 오후 10:16, 김성일 : 내용` (`2026. 9. 16. 오후 10:16` 도 같은 벌) */
const RE_LINE_MOBILE = /^(\d{4})\s*[년.]\s*(\d{1,2})\s*[월.]\s*(\d{1,2})\s*[일.]?\s*(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})\s*,\s*([^,]{1,20}?)\s*:\s*(.*)$/;
//  날짜 전환선 — 「26년 8월 5일」 · 「2026년 9월 16일」 · 카톡 저장본의 「--- 2026년 9월 16일 화요일 ---」
//  ⚠ 연도를 2자리·4자리 둘 다 받는다. 종전 `^(\d{2})년` 은 앵커 때문에 «2026년…» 을 **아예 못 물어**
//    그 줄이 무시되고 기준일이 그대로 남았다(카톡 저장본의 `--- 2026년 … ---` 도 같다).
//  ⚠ **줄머리 앵커를 지키다.** 앞을 열어 두면 «선적 예정일 26년 8월 20일» 같은 본문 속 날짜가
//    전환선으로 잡혀 **뒤 메시지가 통째로 다른 날로 끌려간다**(감사 실측 2026-09-17).
//    구분선·공백만 앞에 허용한다.
const RE_DATE = /^[\s\-—=*]*(\d{4}|\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
const RE_EQUIP = /(\d)\s*호기/;

/** 12시간제를 24시간제로 — 오전 12시는 0시, 오후 12시는 12시다(그 둘이 함정이다). */
function to24(ampm, hh) {
  if (!ampm) return hh;
  if (ampm === '오전') return hh === 12 ? 0 : hh;
  return hh === 12 ? 12 : hh + 12;
}
/** 2자리 연도는 2000년대로, 4자리는 그대로. */
const fullYear = (s) => (String(s).length === 4 ? +s : 2000 + (+s));

/** `26번베이` `18번 베이` */
const RE_BAYNO = /(\d{1,2})\s*번\s*베이/;
/** 앱 형식 `베이: 18` 또는 `베이: 25, 26, 27` — 2.98-12부터 `베이: 21 (22)23` 표기도 낸다 */
const RE_APPBAY = /베이\s*[:：]\s*([\d,\s()]+)/;
/** `2장` `1장` */
const RE_PANEL = /(\d+)\s*장/;

/**
 * 베이 번호 뽑기 — 검수사마다 표기가 다르다(검수사 확인 2026-08-05).
 *   짝수 단독      `26번베이` `18번 베이`
 *   홀수 묶음      `13&15` `13/15` `13-15` `13_15` `13,15` `13 15`
 *   세 개 이상     `17,18,19` `1 2 3` `1-3`
 * ⚠ 띄어쓰기 표기(`1 2 3`)가 있어 **장수(`2장`)·장비(`2호기`)를 먼저 걷어내야** 한다.
 *   안 그러면 "커버 2장"의 2 를 베이로 읽는다.
 * ⚠ 장수는 **적힌 대로** 쓴다. 추론하지 않는다 — 같은 홀수 쌍이라도 슬롯에 따라 1장·2장이 다르다
 *   (실측: `01&03` 은 1장, `13&15`·`09&11`·`05&07` 은 2장).
 */
function extractBays(body) {
  const app = RE_APPBAY.exec(body);
  //  2.98-12: 신 표기 «21 (22)23» 의 괄호를 벗겨 숫자만 — 종전 «25, 26, 27» 도 같은 식으로 읽힌다.
  if (app) return app[1].split(/[^\d]+/).map(s => s.trim()).filter(Boolean);

  const bn = RE_BAYNO.exec(body);
  if (bn) return [bn[1]];

  // 장수·장비·날짜/시각을 먼저 제거한 뒤 남은 숫자만 본다.
  let s = body
    .replace(/\d+\s*호기/g, ' ')
    .replace(/\d+\s*장/g, ' ')
    .replace(/시각\s*[:：].*/g, ' ')
    .replace(/\d{1,2}\s*[:：]\s*\d{2}/g, ' ')
    .replace(/총/g, ' ');
  // 동작 낱말 앞쪽만 본다(뒤에 붙는 잡말의 숫자를 피한다).
  const cut = s.search(/H\s*\/\s*[OC]|오픈|클로즈|크로즈|OPEN|CLOSE|커버|닫/i);
  if (cut > 0) s = s.slice(0, cut);
  const nums = s.match(/\d{1,2}/g) || [];
  return nums.map((n) => String(parseInt(n, 10))).filter((n) => +n >= 1 && +n <= 99);
}

const isOpenWord = (s) => /오픈|OPEN|H\s*\/\s*O\b/i.test(s);
const isCloseWord = (s) => /클로즈|크로즈|닫|CLOSE|H\s*\/\s*C\b/i.test(s);

/**
 * 카톡방 텍스트를 작업 기록 후보로 바꾼다.
 * @param {string} text 카톡 내보내기 또는 복사한 대화
 * @param {{baseDate?: Date}} opts baseDate = 날짜 전환선이 나오기 전 기준일(보통 작업 시작일)
 * @returns {{items: Array, skipped: number}} items = {ts, kind:'hatch'|'work_status', action, bays, panelCount, equip, mode, raw}
 */
export function parseKakaoWorkLog(text, opts = {}) {
  const lines = String(text || '').split(/\r?\n/);
  const base = opts.baseDate instanceof Date ? new Date(opts.baseDate) : new Date();
  let y = base.getFullYear(), mo = base.getMonth(), d = base.getDate();
  let prevMin = -1;                 // 자정 넘어감 감지용(날짜 전환선이 없을 때)
  const items = [];
  let skipped = 0;
  let pending = null;               // 장비가 다음 줄에 오는 경우를 위해 직전 항목을 잡아둔다

  // 앱 형식은 여러 줄이라 한 덩어리로 모은다.
  const blocks = [];
  for (const raw of lines) {
    //  3.53-01: 폰 내보내기(`2026년 9월 16일 오후 10:16, 이름 : 내용`)를 먼저 본다 —
    //    그 줄은 날짜도 품고 있어서 날짜 전환선 검사보다 앞에 서야 한다.
    const mb = RE_LINE_MOBILE.exec(raw);
    if (mb) {
      blocks.push({ who: mb[7], ymd: [fullYear(mb[1]), (+mb[2]) - 1, +mb[3]],
        hh: to24(mb[4], +mb[5]), mm: +mb[6], body: mb[8], extra: [] });
      continue;
    }
    const m = RE_LINE.exec(raw);
    if (m) { blocks.push({ who: m[1], hh: to24(m[2], +m[3]), mm: +m[4], body: m[5], extra: [] }); continue; }
    //  날짜 전환선은 **시각이 없는** 줄만이다 — 폰 형식과 갈라 세운다.
    if (RE_DATE.test(raw) && !/\d{1,2}\s*:\s*\d{2}/.test(raw)) { blocks.push({ dateLine: raw }); continue; }
    if (blocks.length && !blocks[blocks.length - 1].dateLine) blocks[blocks.length - 1].extra.push(raw);
  }

  for (const b of blocks) {
    if (b.dateLine) {
      const dm = RE_DATE.exec(b.dateLine);
      if (dm) { y = fullYear(dm[1]); mo = (+dm[2]) - 1; d = +dm[3]; prevMin = -1; }
      continue;
    }
    //  3.53-01: 폰 내보내기는 줄마다 날짜를 품는다 — 그 값이 기준일을 이긴다.
    if (b.ymd) { [y, mo, d] = b.ymd; prevMin = -1; }
    const body = [b.body, ...b.extra].join('\n').trim();
    if (!body) { skipped += 1; continue; }

    // 날짜 전환선이 없어도 시각이 되감기면 하루 넘긴 것으로 본다(카톡 복사본에 구분선이 빠질 때가 있다).
    const cur = b.hh * 60 + b.mm;
    if (prevMin >= 0 && cur + 120 < prevMin) { const nx = new Date(y, mo, d + 1); y = nx.getFullYear(); mo = nx.getMonth(); d = nx.getDate(); }
    prevMin = cur;
    const ts = new Date(y, mo, d, b.hh, b.mm).getTime();

    const eq = RE_EQUIP.exec(body);
    const equip = eq ? `${eq[1]}호기` : '';

    // ── 장비만 달랑 온 줄 (22:16 "2호기") → 바로 앞 항목에 물려준다
    if (equip && body.replace(RE_EQUIP, '').replace(/[\s.]/g, '') === '') {
      if (pending && !pending.equip && Math.abs(ts - pending.ts) <= 120000) pending.equip = equip;
      else skipped += 1;
      continue;
    }

    // ── 해치커버
    const open = isOpenWord(body), close = isCloseWord(body);
    if (open || close) {
      const bays = extractBays(body);
      if (bays.length) {
        const pc = RE_PANEL.exec(body);
        const it = {
          ts, kind: 'hatch', action: close ? 'close' : 'open',
          bays: bays.map(s => String(parseInt(s, 10))),
          panelCount: pc ? +pc[1] : null, equip, raw: body.split('\n')[0].slice(0, 60),
        };
        items.push(it); pending = it;
        continue;
      }
      skipped += 1; continue;
    }

    // ── 작업 시작·종료 (한 줄에 둘이 올 수 있다: "2호기 양하완료 선적시작")
    let hit = false;
    for (const [re, action, mode] of [
      [/양하\s*(시작|개시)/, 'discharge_start', 'discharge'],
      [/양하\s*(종료|완료|끝)/, 'discharge_done', 'discharge'],
      [/선적\s*(시작|개시)/, 'loading_start', 'loading'],
      [/선적\s*(종료|완료|끝)/, 'loading_done', 'loading'],
      [/(중단|중지|정지)/, 'pause', ''],
      [/(재개)/, 'resume', ''],
    ]) {
      if (!re.test(body)) continue;
      const it = { ts, kind: 'work_status', action, mode, equip, raw: body.split('\n')[0].slice(0, 60) };
      items.push(it); pending = it; hit = true;
    }
    if (!hit) skipped += 1;
  }
  items.sort((a, b2) => a.ts - b2.ts);
  return { items, skipped };
}

/** 이미 앱에 있는 기록과 대조해 **빠진 것만** 추린다.
 *  같은 동작·같은 그룹이 ±20분 안에 있으면 중복으로 본다(사람이 친 시각과 앱 시각이 조금 다르다). */
export function diffAgainstReports(items, reports, groupOf) {
  const have = [];
  //  3.53-01: 교체하려면 **원래 키**가 필요하다 — values 가 아니라 entries 로 읽는다.
  for (const [key, r] of Object.entries(reports || {})) {
    if (!r || !r.ts) continue;
    if (r.type === 'hatch') have.push({ key, kind: 'hatch', action: r.action, ts: hatchReportTs(r), groups: (r.bays || []).map(groupOf).filter(g => g != null) });   // 3.49: 자동 기록은 적힌 때가 아니라 사건 시각으로 대조
    //  ★ 3.53-01 — **호기를 같이 싣는다.** 안 실으면 아래 판정이 호기를 못 갈라
    //    «1호기 20:43 시작» 이 «2호기 20:44 시작» 과 같은 사건으로 접힌다(실측 ATPR 2642W).
    else if (r.type === 'work_status') have.push({ key, kind: 'work_status', action: r.action, ts: r.ts, equip: r.equip || '', mode: r.mode || '' });
  }

  //  ★ 3.53-01 — **카톡이 정본이다**(검수사 2026-09-16 «일단은 카톡보고가 바로 등록되게하고
  //    자체기록과 중복이 되면 카톡이 우선하게 하면 됩니다»). 그래서 세 갈래로 가른다.
  //      new      — 앱에 같은 사건이 없다 → 새로 넣는다
  //      replaces — 같은 사건이 있는데 **시각이 다르다** → 카톡 시각으로 바꾼다(앞 기록은 옮겨 적는다)
  //      dup      — 같은 사건이 **같은 시각**(2분 이내)으로 있다 → 그대로 둔다
  //    ⚠ «같은 사건» 판정 — 시작·완료는 한 호기에 한 번뿐이라 **모드+동작+호기**로 본다(시각 무관).
  //      그래야 «1호기 시작 04:49»(앱이 완료를 막아 급히 누른 값) 를 카톡 20:43 이 바로잡는다.
  //      중단·재개는 한 작업에서 여러 번이라 시각 창(20분)으로 본다 — 시각을 빼면 다 뭉개진다.
  const SAME_SLOT = new Set(['discharge_start', 'discharge_done', 'loading_start', 'loading_done']);
  const modeOf = (x) => String(x.mode || (String(x.action || '').startsWith('discharge') ? 'discharge' : String(x.action || '').startsWith('loading') ? 'loading' : ''));
  //  ★ 3.53-01(재감사 수리) — **소비는 «교체» 에만 건다.**
  //    «이미 앱에 있으니 회색» 은 몇 번을 물어도 회색이어야 한다. 소비를 회색에까지 걸면
  //    같은 보고가 카톡에 두 번 적힌 흔한 로그에서 **둘째부터 «새로» 가 되어 중복이 써진다**
  //    (검수사 확답 — «앱이 보낸것과 수동으로 보낸것과 섞여 있어 그렇습니다». 보관소 실측으로도
  //     해치 기록이 있는 33항차 중 4항차에 같은 (동작,베이)가 둘 이상, KSKM 2611N 은 다섯 번).
  //    반대로 **교체는 한 기록에 한 번뿐**이어야 한다 — 둘이 같은 키를 물면 앱 기록은 지워지고
  //    시작이 두 개가 된다. 그래서 교체 후보만 `used` 로 걸러 쓴다.
  const used = new Set();
  const out = [];
  for (const it of items) {
    let dup = false, replaces = null, prevTs = null, takenByEarlier = false;
    if (it.kind === 'hatch') {
      const gs = it.bays.map(groupOf).filter(g => g != null);
      dup = have.some(h => h.kind === 'hatch' && h.action === it.action &&
        Math.abs(h.ts - it.ts) <= 20 * 60000 && gs.some(g => h.groups.includes(g)));
    } else if (SAME_SLOT.has(String(it.action))) {
      //  한 호기의 시작·완료는 한 번뿐 — 시각이 아무리 벌어져도 같은 사건이다.
      const same = (h) => h.kind === 'work_status' && h.action === it.action
        && (!h.equip || !it.equip || h.equip === it.equip)
        && (!h.mode || !modeOf(it) || h.mode === modeOf(it));
      const hit = have.find(same);
      if (hit) {
        if (Math.abs(hit.ts - it.ts) <= 2 * 60000) dup = true;       // 사실상 같은 시각 → 그대로
        //  ⚠ **호기를 모르는 카톡 줄은 남의 기록을 덮지 않는다**(감사 실측 2026-09-17).
        //    손으로 친 글이라 «선적시작» 만 적고 호기를 빠뜨리는 일이 있는데, 그때 관대한 갈래가
        //    아무 호기나 물어 **맞는 기록을 지우고 호기 빈칸으로 다시 썼다.** 새로 넣기만 한다.
        else if (!it.equip) { /* 새로 */ }
        else {
          const free = have.find((h) => !used.has(h) && same(h));
          //  아직 아무도 안 쓴 기록이 있으면 그것을 카톡 시각으로 옮긴다.
          if (free) { used.add(free); replaces = free.key; prevTs = free.ts; }
          //  앞의 카톡 항목이 이미 그 기록을 옮겼다면 **둘째는 회색**이다 — 새로 넣으면 시작이 두 개가 된다.
          //  ⚠ 이때 화면이 «이미 기록됨» 이라고 적으면 거짓이다 — 앞의 카톡 줄이 그 자리를 옮긴 것이다(규범 §4-3).
          else { dup = true; takenByEarlier = true; }
        }
      }
    } else {
      //  중단·재개 — 여러 번 나올 수 있어 시각 창으로 본다.
      dup = have.some(h => h.kind === 'work_status' && h.action === it.action
        && (!h.equip || !it.equip || h.equip === it.equip)
        && Math.abs(h.ts - it.ts) <= 20 * 60000);
    }
    out.push({ ...it, dup, replaces, prevTs, takenByEarlier });
  }
  return out;
}
