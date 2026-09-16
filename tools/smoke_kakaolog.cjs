// 카톡 작업기록 붙여넣기 파서 연막검사 — 3.53-01 신설.
//   왜 — 1.8-15 는 검수사가 준 STMJ 로그 한 가지(`[22:16]`)만 물려 있었다. 카카오톡에서 복사하면
//   대개 «[오후 10:16]» 으로 나오는데 그러면 **한 줄도 못 물어 전량 0건**이 되고, 화면은
//   «읽을 수 있는 작업 기록이 없습니다» 만 말한다. 검수사 2026-09-16 *«여기에 왜 추가가 안되죠?»*
//   — 무엇이 잘못됐는지 알 길이 없는 침묵 실패였다(규범 §4-3 — 조용히 실패하는 코드 금지).
//
//   ⚠ **글자를 세지 않는다. 실소스 `src/kakaoWorkLog.js` 를 불러 결과를 본다**(규범 §6-2).
//     정규식만 바꿔 놓고 본문 인덱스를 안 고치면 글자 검사는 통과하고 파서는 죽는다.
const path = require('path');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'kakaoWorkLog.js');

const BASE = new Date(2026, 8, 16);   // 기준일 2026-09-16
const hhmm = (ms) => new Date(ms).toTimeString().slice(0, 5);
const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

//  [이름, 붙여넣을 글, 기대 건수, (선택) 첫 항목 검사]
const CASES = [
  ['잡담 한 줄은 안 읽는다', '여기에 왜 추가가 안되죠?', 0],
  ['PC 카톡 「오후」', '[김성일] [오후 10:16] 26번베이 커버 2장 오픈', 1, { t: '22:16', a: 'open', b: '26' }],
  ['PC 카톡 「오전」', '[김성일] [오전 9:05] 14번베이 커버 2장 클로즈', 1, { t: '09:05', a: 'close', b: '14' }],
  ['종전 24시각(회귀)', '[김성일] [22:16] 26번베이 커버 2장 오픈', 1, { t: '22:16', a: 'open', b: '26' }],
  //  ⚠ 폰 줄도 **기준일과 다른 날**로 잰다 — 같으면 줄마다 날짜를 읽든 말든 답이 같아 변이가 안 잡힌다.
  ['폰 내보내기', '2026년 9월 20일 오후 10:16, 김성일 : 26번베이 커버 2장 오픈', 1, { t: '22:16', d: '2026-09-20', a: 'open', b: '26' }],
  ['이름·시각 없는 내용만', '26번베이 커버 2장 오픈', 0],
  ['종전 여러 줄(회귀)',
    '[김성일] [22:16] 26번베이 커버 2장 오픈\n[이종현] [22:40] 13&15 H/C 2장 입니다\n[송제욱] [23:05] 1호기 양하시작', 3],
  ['오전·오후 섞인 여러 줄',
    '[김성일] [오후 10:16] 26번베이 커버 2장 오픈\n[이종현] [오후 10:40] 13&15 H/C 2장 입니다\n[송제욱] [오후 11:05] 1호기 양하시작\n[송제욱] [오전 12:30] 2호기 양하완료 선적시작', 5],
  //  ⚠ 날짜선은 **기준일과 다른 날**로 잰다. 기준일과 같으면 날짜선을 못 읽어도 답이 같아
  //    변이가 안 잡힌다(3.53-01 변이시험 실측 — 09-16 으로 쟀더니 옛 정규식도 통과했다).
  ['저장본 날짜선(네 자리 연도)',
    '--------------- 2026년 9월 20일 일요일 ---------------\n[김성일] [오후 10:16] 26번베이 커버 2장 오픈', 1, { d: '2026-09-20', t: '22:16' }],
  ['날짜선 네 자리·구분선 없음',
    '2026년 9월 20일\n[김성일] [22:16] 26번베이 커버 2장 오픈', 1, { d: '2026-09-20' }],
  ['종전 날짜선(두 자리·회귀)', '26년 8월 5일\n[김성일] [22:16] 26번베이 커버 2장 오픈', 1, { d: '2026-08-05' }],
  //  ★ 본문 **안**의 날짜는 전환선이 아니다. 앵커를 열어 두면 «선적 예정일 26년 8월 20일» 한마디에
  //    뒤 메시지가 통째로 다른 날로 끌려간다(감사 실측 2026-09-17).
  //  ⚠ 날짜가 **머리말 없는 이어쓰기 줄**에 있어야 재현된다 — `[이름] [시각]` 이 붙은 줄은
  //    `RE_LINE` 이 먼저 물어 가서 날짜선 검사까지 오지 않는다(3.53-01 변이시험 실측).
  ['본문 속 날짜는 전환선이 아니다',
    '[A] [10:10] 26번베이 커버 2장 오픈\n선적 예정일 26년 8월 20일\n[A] [11:00] 14번베이 커버 2장 클로즈', 2, { d: '2026-09-16' }],
  //  ★ 날짜와 시각이 한 줄에 같이 있으면 전환선이 아니다(폰 형식이 아닌 비정형 줄).
  ['날짜+시각 줄은 전환선이 아니다',
    '[A] [10:10] 26번베이 커버 2장 오픈\n26년 8월 20일 09:00 작업 예정\n[A] [11:00] 14번베이 커버 2장 클로즈', 2, { d: '2026-09-16' }],
];

//  12시간제 경계 — 오전 12시는 0시, 오후 12시는 12시다. 여기를 틀리면 기록이 열두 시간 밀린다.
const AMPM = [
  ['오전 12:30 → 00:30', '[A] [오전 12:30] 3번베이 커버 1장 오픈', '00:30'],
  ['오후 12:30 → 12:30', '[A] [오후 12:30] 3번베이 커버 1장 오픈', '12:30'],
  ['오전 9:05 → 09:05', '[A] [오전 9:05] 3번베이 커버 1장 오픈', '09:05'],
  ['오후 11:05 → 23:05', '[A] [오후 11:05] 3번베이 커버 1장 오픈', '23:05'],
];

//  ── 실데이터 항(ATPR 2642W 2026-09-16 선적) ──────────────────────────────
//    검수사가 준 실제 작업방 로그와 그 항차 보관소 `reports` 다. 두 호기가 1분 차로 시작하는
//    평택의 보통 모습이라, 호기를 안 보면 «1호기 20:43» 이 «2호기 20:44» 에 접혀 [추가]가 0건이 된다.
const REAL_LOG = [
  '[그린마린 김판석] [20:43] 1호기 선적시작',
  '[연지사랑] [20:44] 검수 보고 - 🏗 2호기',
  '📍 ATPR 2642W',
  '🟢 선적 시작',
  '26년 9월 17일',
  '[연지사랑] [04:41] 검수 보고 - 🏗 2호기',
  '📍 ATPR 2642W',
  '✅ 선적 완료',
  '[그린마린 김판석] [04:50] 검수 보고 - 🏗 1호기',
  '📍 ATPR 2642W',
  '✅ 선적 완료',
].join('\n');
//  그 항차 보관소 reports — 1호기 시작이 04:49 로 잘못 박혀 있다(앱이 «시작 없이 완료» 를 막아서).
//  ⚠ **시각은 보관소 실값(밀리초)을 그대로 쓴다.** 분 단위로 다시 적으면 회색/교체를 가르는
//    2분 창이 한 번도 안 눌려, 창을 0 으로 좁히는 변이가 그냥 통과한다(감사 실측 2026-09-17).
const REAL_REPORTS = {
  1789559080495: { ts: 1789559080495, type: 'work_status', action: 'loading_start', equip: '2호기', mode: 'loading' },   // 20:44:40
  1789587705172: { ts: 1789587705172, type: 'work_status', action: 'loading_done', equip: '2호기', mode: 'loading' },    // 04:41:45
  1789588184894: { ts: 1789588184894, type: 'work_status', action: 'loading_start', equip: '1호기', mode: 'loading' },   // 04:49:44 ← 잘못된 값
  1789588203455: { ts: 1789588203455, type: 'work_status', action: 'loading_done', equip: '1호기', mode: 'loading' },    // 04:50:03
};
const REAL_KEY_1HOGI_START = '1789588184894';

(async () => {
  let mod;
  try {
    mod = await import('file://' + SRC);
  } catch (e) {
    console.log('카톡 작업기록 파서 연막검사');
    console.log('  ✗ 실소스를 불러오지 못했다 — ' + e.message);
    process.exit(1);
  }
  const parse = mod.parseKakaoWorkLog;
  if (typeof parse !== 'function') {
    console.log('  ✗ parseKakaoWorkLog 를 내보내지 않는다');
    process.exit(1);
  }

  const bad = [];
  console.log('카톡 작업기록 파서 연막검사 — 실소스 호출로 잰다');
  for (const [name, text, want, chk] of CASES) {
    let r;
    try { r = parse(text, { baseDate: BASE }); }
    catch (e) { bad.push(`${name} — 파서가 죽었다: ${e.message}`); continue; }
    const got = (r && r.items || []).length;
    if (got !== want) { bad.push(`${name} — 읽음 ${got}건, 기대 ${want}건`); continue; }
    if (chk && got) {
      const it = r.items[0];
      //  ⚠ 날짜 끌림은 **뒤 메시지**에서 드러난다 — 첫 항목만 보면 못 잡는다(변이시험 실측).
      if (chk.d && got > 1) {
        const last = r.items[got - 1];
        if (ymd(last.ts) !== chk.d) bad.push(`${name} — 마지막 항목 날짜 ${ymd(last.ts)}, 기대 ${chk.d}(뒤 메시지가 딴 날로 끌려갔다)`);
      }
      if (chk.t && hhmm(it.ts) !== chk.t) bad.push(`${name} — 시각 ${hhmm(it.ts)}, 기대 ${chk.t}`);
      if (chk.d && ymd(it.ts) !== chk.d) bad.push(`${name} — 날짜 ${ymd(it.ts)}, 기대 ${chk.d}`);
      if (chk.a && it.action !== chk.a) bad.push(`${name} — 동작 ${it.action}, 기대 ${chk.a}`);
      if (chk.b && !(it.bays || []).includes(chk.b)) bad.push(`${name} — 베이 [${it.bays}], ${chk.b} 없음`);
    }
  }
  for (const [name, text, want] of AMPM) {
    const it = (parse(text, { baseDate: BASE }).items || [])[0];
    if (!it) { bad.push(`${name} — 한 건도 안 읽혔다`); continue; }
    if (hhmm(it.ts) !== want) bad.push(`${name} — 실제 ${hhmm(it.ts)}`);
  }

  //  ── 실데이터 — 호기를 가르는가 ──────────────────────────────────────
  const diff = mod.diffAgainstReports;
  if (typeof diff !== 'function') bad.push('diffAgainstReports 를 내보내지 않는다');
  else {
    const { items } = parse(REAL_LOG, { baseDate: new Date(2026, 8, 16) });
    if (items.length !== 4) bad.push(`실데이터 — 카톡에서 ${items.length}건 읽음, 기대 4건`);
    const rows = diff(items, REAL_REPORTS, () => null);
    const miss = rows.filter((r) => !r.dup);
    if (miss.length !== 1) {
      bad.push(`실데이터 — 반영 대상 ${miss.length}건, 기대 1건(1호기 선적시작)`
        + ` [${rows.map((r) => `${hhmm(r.ts)}/${r.equip}/${r.dup ? '회색' : r.replaces ? '교체' : '새로'}`).join(' ')}]`);
    } else {
      const m = miss[0];
      if (hhmm(m.ts) !== '20:43' || m.equip !== '1호기' || m.action !== 'loading_start') {
        bad.push(`실데이터 — 반영 대상이 ${hhmm(m.ts)} ${m.equip} ${m.action}, 기대 20:43 1호기 loading_start`);
      }
      //  ★ 검수사 «자체기록과 중복이 되면 카톡이 우선하게» — 새로 넣는 게 아니라 **앱 04:49 를 옮겨야** 한다.
      //    새로 넣기만 하면 1호기 시작이 두 개가 되어 타임시트가 더 나빠진다.
      if (!m.replaces) bad.push('실데이터 — 카톡이 앱 기록(1호기 04:49)을 교체하지 않는다(replaces 없음). 시작이 두 개가 된다');
      else if (hhmm(m.prevTs) !== '04:49') bad.push(`실데이터 — 교체 대상이 ${hhmm(m.prevTs)}, 기대 04:49`);
      else if (String(m.replaces) !== REAL_KEY_1HOGI_START) bad.push(`실데이터 — 교체 키가 ${m.replaces}, 기대 ${REAL_KEY_1HOGI_START}`);
      //  나머지 셋은 시각이 같으니 그대로 둔다 — 멀쩡한 기록을 헛되이 갈아치우지 않는다.
      const rep = rows.filter((r) => r.replaces);
      if (rep.length !== 1) bad.push(`실데이터 — 교체가 ${rep.length}건, 기대 1건(같은 시각인 셋은 건드리지 않는다)`);
    }

    //  ★ 한 앱 기록은 **한 번만** 물린다 — 카톡에 같은 보고가 두 번 적혀도(되풀이 붙여넣기·재게시)
    //    둘 다 교체가 되면 앱 기록은 지워지고 시작이 두 개가 된다(감사 실측 2026-09-17).
    const ONE = { [REAL_KEY_1HOGI_START]: REAL_REPORTS[REAL_KEY_1HOGI_START] };
    const twice = parse('[A] [20:43] 1호기 선적시작\n[B] [20:45] 1호기 선적시작', { baseDate: new Date(2026, 8, 16) }).items;
    const rowsTwice = diff(twice, ONE, () => null);
    const repTwice = rowsTwice.filter((r) => r.replaces);
    if (repTwice.length !== 1) {
      bad.push(`같은 보고 두 번 — 교체 ${repTwice.length}건, 기대 1건(한 앱 기록을 둘이 물면 시작이 두 개가 된다)`);
    }
    //  ★ 둘째는 **회색**이어야 한다. «새로» 로 두면 앱 기록을 옮긴 뒤 같은 것을 또 넣어 시작이 두 개가 된다.
    const fresh = rowsTwice.filter((r) => !r.dup && !r.replaces);
    if (fresh.length) bad.push(`같은 보고 두 번 — 둘째가 «새로»(${fresh.length}건) 다. 회색이어야 중복이 안 써진다`);
    //  ★ **글이 사실과 맞아야 한다**(규범 §4-3). 자리가 차서 회색이 된 줄에 «이미 기록됨» 이라고 적으면 거짓이다
    //    — 앱에 있던 것이 아니라 **위의 카톡 줄이 그 자리를 옮긴** 것이다. 진짜 중복에는 켜지면 안 된다.
    const later = rowsTwice.find((r) => r.dup);
    if (!later || later.takenByEarlier !== true) {
      bad.push('자리가 차서 회색이 된 줄에 takenByEarlier 가 없다 — 화면이 «이미 기록됨» 이라고 거짓을 적는다');
    }

    //  ★ **회색 판정은 소비하지 않는다** — 같은 보고가 카톡에 세 번 적혀도 셋 다 회색이다.
    //    (검수사 «앱이 보낸것과 수동으로 보낸것과 섞여 있어 그렇습니다» — 이 로그의 정상 모양이다.)
    const thrice = parse('[A] [04:49] 1호기 선적시작\n[B] [04:50] 1호기 선적시작\n[C] [04:50] 1호기 선적시작',
      { baseDate: new Date(2026, 8, 17) }).items;
    const rowsThrice = diff(thrice, ONE, () => null);
    if (rowsThrice.filter((r) => r.dup).length !== 3) {
      bad.push(`같은 보고 세 번(다 같은 시각) — 회색 ${rowsThrice.filter((r) => r.dup).length}건, 기대 3건`
        + ` [${rowsThrice.map((r) => r.dup ? '회색' : r.replaces ? '교체' : '새로').join(' ')}]`);
    }
    //  ★ **진짜 중복**(앱에 있던 것)에는 플래그가 켜지면 안 된다 — 켜지면 글이 반대로 거짓이 된다.
    const wrongFlag = rowsThrice.filter((r) => r.takenByEarlier);
    if (wrongFlag.length) {
      bad.push(`진짜 중복에 takenByEarlier 가 켜졌다 ${wrongFlag.length}건 — 화면이 «위의 카톡 줄이 옮겼다» 고 거짓을 적는다`);
    }

    //  ★ **해치도 같다.** `groupOf` 를 제대로 주고 잰다 — 늘 null 을 주면 해치 갈래가 통째로 안 재진다.
    const gOf = (b) => { const n = parseInt(b, 10); return Number.isFinite(n) ? (n % 2 === 0 ? n : n - 1) : null; };
    const hatchHave = { h1: { ts: new Date(2026, 8, 16, 22, 47).getTime(), type: 'hatch', action: 'open', bays: ['13', '14', '15'] } };
    const hatchItems = parse('[A] [22:47] 13&15 H/O 2장 입니다\n[B] [22:50] 14번베이 커버 2장 오픈',
      { baseDate: new Date(2026, 8, 16) }).items;
    const rowsHatch = diff(hatchItems, hatchHave, gOf);
    if (rowsHatch.length !== 2 || rowsHatch.some((r) => !r.dup)) {
      bad.push(`해치 — 앱에 있는 커버가 카톡에 두 번 적히면 둘 다 회색이어야 한다`
        + ` [${rowsHatch.map((r) => `${hhmm(r.ts)}/${r.dup ? '회색' : '★'}`).join(' ')}]`);
    }
    //  해치 동작이 다르면(오픈 vs 클로즈) 회색이 아니다 — 판정이 살아 있는지 확인한다.
    const rowsClose = diff(parse('[A] [22:50] 14번베이 커버 2장 클로즈', { baseDate: new Date(2026, 8, 16) }).items, hatchHave, gOf);
    if (!rowsClose.length || rowsClose[0].dup) bad.push('해치 — 오픈 기록에 클로즈가 회색으로 접힌다(동작을 안 본다)');
    //  ★ **딴 커버는 접히면 안 된다.** 베이 비교가 죽으면 메워야 할 보고가 회색으로 사라진다.
    const rowsOther = diff(parse('[A] [22:50] 26번베이 커버 2장 오픈', { baseDate: new Date(2026, 8, 16) }).items, hatchHave, gOf);
    if (!rowsOther.length || rowsOther[0].dup) bad.push('해치 — 딴 베이(26) 오픈이 13&15 기록에 접힌다(베이를 안 본다)');
    //  ★ **20분 밖은 다른 사건이다.** 닫았다 아침에 다시 연 커버가 실제로 있다(STMJ 03:05 BAY14 → 08:19 BAY05,06,07).
    //    창이 죽으면 그 보고가 회색으로 사라져 타임시트가 다시 «커버가 열린 채 마감» 이 된다.
    const rowsLater = diff(parse('[A] [08:19] 13&15 H/O 2장 입니다', { baseDate: new Date(2026, 8, 17) }).items, hatchHave, gOf);
    if (!rowsLater.length || rowsLater[0].dup) bad.push('해치 — 20분 밖(다음 날 아침) 같은 커버 오픈이 접힌다(시각 창을 안 본다)');

    //  ★ **호기를 모르는 카톡 줄은 남의 기록을 덮지 않는다.** 손으로 친 글이라 호기가 빠질 수 있고,
    //    그때 관대한 갈래가 아무 호기나 물어 맞는 기록을 지우고 호기 빈칸으로 다시 썼다(감사 실측).
    const noEq = parse('[A] [08:00] 선적시작', { baseDate: new Date(2026, 8, 17) }).items;
    const rowsNoEq = diff(noEq, ONE, () => null);   // ⚠ 픽스처 키가 바뀌면 여기도 따라와야 한다 — `{c: …}` 로 두면 have 가 비어 **아무것도 안 재고 통과한다**(감사 실측)
    if (rowsNoEq.some((r) => r.replaces)) {
      bad.push('호기 없는 카톡 줄이 앱 기록을 덮는다 — 어느 호기인지 모르는 줄은 새로 넣기만 해야 한다');
    }
    if (!rowsNoEq.length || rowsNoEq[0].dup) bad.push('호기 없는 카톡 줄이 통째로 사라진다 — 새로 넣기는 돼야 한다');
  }

  if (bad.length) {
    for (const b of bad) console.log('  ✗ ' + b);
    console.log(`✗ ${bad.length}건 — 붙여넣기가 조용히 0건이 되는 자리다`);
    process.exit(1);
  }
  console.log(`✓ ${CASES.length + AMPM.length + 1}항 통과 — 형식 전부 읽히고, 실데이터에서 호기를 갈라 앱 04:49 를 카톡 20:43 으로 바로잡는다`);
  process.exit(0);
})();
