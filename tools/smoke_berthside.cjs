// 접안 현측 — 한글이 와도 우현은 우현인가, 그리고 검수사가 고친 것이 사는가 (TallyOne 3.40).
//
//  왜 있는가 — 검수사 2026-09-09 밤 «그리고 선박이 좌현으로 고정됨 바꿔도 다시바뀜».
//  실측 원인: 같은 칸(`info.berthSide`)에 **두 어휘**가 들어 있었다.
//    · 수집기(MailPilot `pnctpull.py:202`)는 터미널 화면에서 읽은 **한글** «좌현»·«우현» 을 매 사이클 적는다.
//    · 앱은 **영문** 만 알아봤다 — `berthSide === 'starboard'`.
//  그래서 한글이 든 항차는 우현이어도 화면이 늘 «좌현 접안» 이었고, 검수사가 우현으로 고쳐도
//  다음 수집 사이클이 한글로 덮어 되돌아왔다. RTDB 실측(2026-09-09) — 값이 든 6항차가 **전부 한글**이었다
//  (RZOR 2건 좌현 · ATPR·OBWH×2·TMPZ·KKLC 5건 우현).
//  ⚠ 이 칸은 표시만이 아니라 **작업 순서**를 정한다(`evenRowsSeaSide` → 육상·해상 로우 차례).
//    우현 5척이 좌현 기준으로 줄을 서고 있었다 — 크래시보다 조용해서 더 오래 갔다.
//
//  ⇒ 판정을 `utils.berthSideOf` 한 벌로 모으고(§4-4), 검수사가 고른 칸(`berthSidePick`)을 먼저 본다.
//    이 검사는 **그리고 눌러서** 잰다 — 문구뿐 아니라 첫 카드 자리가 실제로 갈리는지까지.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_berthside.cjs <렌더번들.js>'); process.exit(1); }
const ROOT = path.resolve(__dirname, '..');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.alert = (m) => { (dom.window.__alerts = dom.window.__alerts || []).push(String(m)); };
try { dom.window.eval(fs.readFileSync(B, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

(async () => {
  console.log('접안 현측 — 한글이 와도 우현은 우현인가 (3.40)');
  await wait(700);
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const firstPos = (s) => (s.match(/(\d{1,2})-(\d{2})-(\d{2})/) || [])[0] || '';
  ok([...new Set(errs)].length === 0, `렌더 오류 0 (${[...new Set(errs)].length}건)` + (errs[0] ? ' | ' + errs[0].slice(0, 120) : ''));

  // ── 판정 한 벌 — 두 어휘가 같은 답을 낸다 (화면에 안 나오는 가지까지)
  {
    const f = dom.window.__berthSideOf;
    ok(typeof f === 'function', '판정을 검사가 직접 부를 수 있다');
    const 표 = [
      ['우현', 'starboard', '수집기 한글'], ['starboard', 'starboard', '앱 영문'], ['STBD', 'starboard', '약어'],
      ['좌현', 'port', '수집기 한글'], ['port', 'port', '앱 영문'],
    ];
    for (const [입력, 기대, 출처] of 표) {
      ok(f({ berthSide: 입력 }) === 기대, `«${입력}»(${출처}) → ${기대} (실제 ${f({ berthSide: 입력 }) || '빈값'})`);
    }
    //  ★ 모르는 값을 좌현으로 삼키면 안 된다 — 종전 버그의 본질이 그 삼킴이었다.
    ok(f({ berthSide: '무슨소리' }) === '' && f({ berthSide: '' }) === '' && f({}) === '' && f(null) === '',
       '모르는 값·빈 값은 «모름»으로 남는다 — 좌현으로 삼키지 않는다');
    //  검수사가 고른 것이 수집기 값을 이긴다.
    ok(f({ berthSide: '좌현', berthSidePick: 'starboard' }) === 'starboard',
       '★ 검수사가 고른 칸(berthSidePick)이 수집기 칸보다 먼저다');
    ok(f({ berthSide: '우현', berthSidePick: 'port' }) === 'port', '반대 방향도 같다');
  }

  // ── 화면 — 한글이 들어와도 «우현 접안» 이라고 그린다
  const openGuide = async () => { clickBy(/🏗 1호기/); await wait(400); };
  await openGuide();
  ok(/우현 접안/.test(txt()), `영문 'starboard' 는 종전대로 «우현 접안» 이다`);

  const drawAndRead = async (side, pick) => {
    dom.window.__render(side, pick);
    await wait(400);
    if (!/접안/.test(txt())) { await openGuide(); }
    return txt();
  };
  {
    const t = await drawAndRead('우현');
    ok(/우현 접안/.test(t) && !/좌현 접안/.test(t), '★ 수집기 한글 «우현» 도 «우현 접안» 으로 그린다 (종전엔 좌현으로 보였다)');
  }
  {
    const t = await drawAndRead('좌현');
    ok(/좌현 접안/.test(t), '수집기 한글 «좌현» 은 «좌현 접안» 이다');
  }
  {
    const t = await drawAndRead('알수없는값');
    ok(/접안\?/.test(t) || /접안 방향/.test(t), '모르는 값이면 «접안?» 으로 물어본다 — 조용히 좌현으로 가지 않는다');
  }
  {
    const t = await drawAndRead('좌현', 'starboard');
    ok(/우현 접안/.test(t) && !/좌현 접안/.test(t),
       '★ 검수사가 우현으로 고쳐 두면 수집기가 좌현으로 덮어도 화면은 우현이다 — «바꿔도 다시 바뀜» 이 안 난다');
  }

  // ── ★ 표시만이 아니라 순서가 실제로 갈리는가 — 첫 카드 자리를 읽는다
  {
    const pick = async (side) => {
      dom.window.__render(side);
      await wait(400);
      await openGuide();
      if (!clickBy(/^B9·10·11|^B10/)) return '';
      await wait(300);
      if (!clickBy(/데크/)) return '';
      await wait(500);
      return firstPos(txt());
    };
    const 우 = await pick('우현');
    const 좌 = await pick('좌현');
    ok(!!우 && !!좌, `두 방향 모두 카드를 그렸다 (우현 ${우 || '없음'} · 좌현 ${좌 || '없음'})`);
    ok(우 !== 좌, `★ 한글 «우현»·«좌현» 이 순서를 실제로 가른다 — 우현 ${우} · 좌현 ${좌}`);
    const 영문 = await pick('starboard');
    ok(영문 === 우, `한글 «우현» 과 영문 'starboard' 의 순서가 한 글자도 안 다르다 (${영문} = ${우})`);
  }

  // ── 소스 — 판정이 한 벌인가, 두 칸을 같이 다루는가
  {
    const G = fs.readFileSync(path.join(ROOT, 'src/components/GuidedWorkPanel.jsx'), 'utf8');
    const M = fs.readFileSync(path.join(ROOT, 'src/mirEyes.js'), 'utf8');
    ok(/berthSideOf\(voyage\?\.info\)/.test(G), '화면이 그 판정을 부른다');
    ok(/const side = berthSideOf\(info\)/.test(M), '미르도 같은 판정을 부른다 — 두 벌이 아니다');
    //  옛 방식(원본 칸을 제 손으로 읽기)이 남아 있으면 거기로 한글이 새어 들어간다.
    //  ⚠ 정규화된 지역 변수를 `=== 'starboard'` 로 비교하는 것은 정상이다 — 금지 대상은 **원본 칸 직접 읽기**다.
    const 잔재 = [...G.matchAll(/voyage\?\.info\?\.berthSide|voyage\.info\.berthSide/g)].length
               + [...M.matchAll(/info\.berthSide/g)].length;
    ok(잔재 === 0, `원본 칸(info.berthSide)을 제 손으로 읽는 자리가 없다 (${잔재}곳)`);
    ok(/berthSide: side, berthSidePick: side/.test(G), '검수사가 고르면 두 칸에 같이 적는다');
    ok(/berthSide: '', berthSidePick: ''/.test(G), '«접안 방향 변경» 은 두 칸을 같이 비운다');
  }

  console.log(fail ? `\n⛔ 접안 현측 검사 실패 ${fail}건` : `\n✅ 접안 현측이 한 벌로 읽힌다 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
