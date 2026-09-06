// 미르가 「선미 ○○ 선수 ○○」를 알아듣고 그 배 실적으로 호기를 가리는지 검사한다(3.21).
//
//  왜 있는가 — 검수사 2026-09-06 «저도 실체를 안보고 경험으로 봐서 그렇습니다. 그래서 **선미 선수로만**
//    이야기 했던거고요» · «**처음에 호기를 이야기 안한 이유입니다**» · «양하작업이 어떻게 이뤄졌는지 보면
//    어디가 선수 선미인지 압니다». 그날 실측 — 검수사가 DJCF 를 «1·2호기», MCAP 을 «3·4호기» 라 부르셨는데
//    실제로 도는 것은 DJCF 가 GC103·GC104, MCAP 이 GC101·GC102 였다(역순). 그런데 처음 하신 말
//    «선미 김판석 선수 이종부» 는 실적과 한 대도 안 틀렸다. 그래서 **선수·선미가 흔들리지 않는 축**이다.
//  픽스처는 그날 실데이터(DJCF 0150N · MCAP 634N 터미널 실적)에서 equip·pos·at 만 뽑은 것이다.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_bowstern.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = require(path.resolve('tools/fixtures/crew_bowstern.json'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const NAMES = ['김판석', '이종부', '최관식', '최원형'];

console.log('선수·선미 → 호기 (3.21)');

//  ① 실데이터로 가른다 — 2026-09-06 야간 실적
{
  const d = U.craneBowSternOf(FX.DJCF), m = U.craneBowSternOf(FX.MCAP);
  ok(!!d && d.bow === 3 && d.stern === 4, `DJCF — 선수 3호기 · 선미 4호기 (${d && d.bow}/${d && d.stern} · 가운데값 ${d && JSON.stringify(d.byNo)})`);
  ok(!!m && m.bow === 1 && m.stern === 2, `MCAP — 선수 1호기 · 선미 2호기 (${m && m.bow}/${m && m.stern} · 가운데값 ${m && JSON.stringify(m.byNo)})`);
  ok(d.byNo[d.bow] < d.byNo[d.stern], '선수 쪽 베이 가운데값이 선미보다 작다(작은 번호 = 선수쪽)');
}

//  ② 확신이 없으면 아무것도 안 낸다 — 지어내지 않는다
{
  ok(U.craneBowSternOf(null) === null && U.craneBowSternOf({}) === null, '항차가 없으면 null');
  ok(U.craneBowSternOf({ discharge: { termWork: { A: { equip: 'GC101', pos: '100282', at: 1 } } } }) === null,
     '호기가 하나뿐이면 못 가린다(null)');
  const few = { discharge: { termWork: { A: { equip: 'GC101', pos: '100282', at: 1 }, B: { equip: 'GC102', pos: '300282', at: 2 } } } };
  ok(U.craneBowSternOf(few) === null, '호기마다 3대에 못 미치면 못 가린다(null)');
  const same = { discharge: { termWork: {} } };
  for (let i = 0; i < 4; i++) { same.discharge.termWork['A' + i] = { equip: 'GC101', pos: '220282', at: i + 1 }; same.discharge.termWork['B' + i] = { equip: 'GC102', pos: '220482', at: i + 1 }; }
  ok(U.craneBowSternOf(same) === null, '두 호기의 가운데값이 같으면 못 가린다(null)');
  const bk = { discharge: { termWork: {} } };   // 시각 없는 행(Booking)은 안 센다
  for (let i = 0; i < 5; i++) { bk.discharge.termWork['A' + i] = { equip: 'GC101', pos: '100282' }; bk.discharge.termWork['B' + i] = { equip: 'GC102', pos: '380282' }; }
  ok(U.craneBowSternOf(bk) === null, '시각(at) 없는 행은 안 센다 — Booking 은 실적이 아니다');
}

//  ③ 검수사가 실제로 친 말 — 그날 19:09 문장 그대로
{
  const bs = U.craneBowSternOf(FX.DJCF);
  const r = U.parseCraneCrew('야간근무 DJCF 선미 김판석 선수 이종부', NAMES, bs);
  const by = {}; (r.crew || []).forEach((c) => { by[c.name] = c.no; });
  ok(by['김판석'] === 4 && by['이종부'] === 3, `«선미 김판석 선수 이종부» → 김판석 4호기 · 이종부 3호기 (${JSON.stringify(by)})`);
  ok(!(r.needPos || []).length, '가렸으면 되물을 것이 없다');
}

//  ④ 어순 두 꼴 — «김판석 선미» 도 같은 답
{
  const bs = U.craneBowSternOf(FX.DJCF);
  const a = U.parseCraneCrew('야간근무 DJCF 선미 김판석 선수 이종부', NAMES, bs);
  const b = U.parseCraneCrew('야간근무 김판석 선미 이종부 선수', NAMES, bs);
  const key = (r) => (r.crew || []).map((c) => c.no + ':' + c.name).sort().join(',');
  ok(key(a) === key(b) && key(a).length > 3, `어순이 달라도 같은 답 (${key(a)} = ${key(b)})`);
}

//  ⑤ 못 가리면 되묻는다 — 조용히 버리지 않는다(§4-3). 그날 이 말이 통째로 사라졌다.
{
  const r = U.parseCraneCrew('야간근무 ATPR 선미 김판석 선수 이종부', NAMES, null);
  ok(!!r && !(r.crew || []).length && (r.needPos || []).length === 2, `유도 못 하면 needPos 로 남긴다 (${JSON.stringify(r && r.needPos)})`);
  const cs = { shift: '야간', dayOff: 0, crew: [], unknown: [], needPos: r.needPos };
  const kept = U.resolveCrewSides(cs, { discharge: {} });
  ok((kept.needPos || []).length === 2, '실적이 없는 배에서는 resolveCrewSides 도 그대로 둔다');
  const fixed = U.resolveCrewSides(cs, FX.DJCF);
  const by = {}; (fixed.crew || []).forEach((c) => { by[c.name] = c.no; });
  ok(by['김판석'] === 4 && by['이종부'] === 3 && !(fixed.needPos || []).length, `실적이 있으면 그 자리에서 가린다 (${JSON.stringify(by)})`);
  ok(!!fixed._sideFrom, '무엇으로 가렸는지 근거를 남긴다(화면이 밝힌다)');
}

//  ⑥ 호기 꼴은 종전 그대로 — 3.8 회귀
{
  const r = U.parseCraneCrew('야간근무 DJCF 1호기 김판석 2호기 이종부', NAMES, U.craneBowSternOf(FX.DJCF));
  const by = {}; (r.crew || []).forEach((c) => { by[c.name] = c.no; });
  ok(by['김판석'] === 1 && by['이종부'] === 2, '«N호기 이름» 은 종전대로 그 번호 그대로');
  ok(U.parseCraneCrew('선미 누구야', NAMES, U.craneBowSternOf(FX.DJCF)) === null, '묻는 말(«선미 누구야»)은 등록이 아니다');
  ok(U.parseCraneCrew('1호기 박진우 맞아?', NAMES, null) === null, '되묻기(«맞아?»)는 등록이 아니다 — 3.8 회귀');
  ok(U.parseCraneCrew('선미 쪽 커버 열어', NAMES, U.craneBowSternOf(FX.DJCF)) === null, '이름이 없으면 등록으로 안 본다');
}

//  ⑦ 명단에 없는 이름은 밝힌다
{
  const r = U.parseCraneCrew('야간근무 선미 홍길동 선수 이종부', NAMES, U.craneBowSternOf(FX.DJCF));
  ok((r.unknown || []).some((u) => u.tok === '홍길동'), '명단에 없는 이름은 unknown 으로 알린다');
  ok((r.crew || []).some((c) => c.name === '이종부'), '아는 이름은 그대로 등록한다');
}

//  ⑧ **화면 글과 저장이 같은 답을 내는가** — 이 판의 핵심(감사 지적: 22항 중 0항이 이것을 안 쟀다).
//     2026-09-06 감사 실측 — 화면은 «못 가려요» 라 되묻는데 저장부는 3·4호기로 **저장했다.**
//     그러면 검수사가 호기로 다시 말하고, `fbSetVoyageCraneCrew` 는 호기별 PATCH 라 옛 것을 안 지워
//     **한 사람이 두 호기에 앉는다.** 재료가 갈리는 자리를 소스에서 직접 잰다.
{
  const fs = require('fs');
  const rd = (f) => fs.readFileSync(path.resolve(f), 'utf8');
  const ns = rd('src/nlSearch.js'), vp = rd('src/pages/VoyagePage.jsx'), gs = rd('src/pages/GlobalSearchPage.jsx'), sp = rd('src/components/SearchPanel.jsx');
  ok(/crewSetText\(resolveCrewSides\(parsed\.crewSet, ctx && \(ctx\.bowStern \|\| ctx\.voyage\)\)/.test(ns),
     '화면 글(nlSearch)이 ctx 의 bowStern 또는 voyage 로 같은 유도를 탄다');
  ok(/bowStern: briefCtx\?\.bowStern \|\| null/.test(vp), '항차 화면이 ctx 에 bowStern 을 실어 준다(항차를 통째로 못 싣는 자리)');
  ok((vp.match(/briefCtx=\{\{ \.\.\.\(briefCtx \|\| \{\}\), bowStern \}\}/g) || []).length === 2,
     '두 탭(ListTab·LoloTab) 모두 그 재료를 내려보낸다');
  ok(/crewSetText\(resolveCrewSides\(p\.crewSet, shipCtx\.v\)/.test(gs), '전체 검색도 화면 글에 같은 유도를 태운다');
  ok(/const cs = resolveCrewSides\(parsed\.crewSet, voyage\)/.test(sp), '검색 패널 저장부가 유도를 탄다');
  ok((vp.match(/resolveCrewSides\(parseNaturalQuery\(q\)\.crewSet, bowStern\)/g) || []).length === 2,
     '항차 화면 저장부 두 자리가 같은 재료(bowStern prop)를 쓴다');
  //  저장부가 «가린 것만» 저장하는가 — needPos 가 남은 것은 crew 에 없어야 한다
  const cs = { shift: '야간', dayOff: 0, crew: [], unknown: [], needPos: [{ side: '선미', name: '김판석' }] };
  const kept = U.resolveCrewSides(cs, { discharge: {} });
  ok(!(kept.crew || []).length && (kept.needPos || []).length === 1,
     '못 가린 사람은 crew 에 안 들어간다 — 저장부가 조용히 저장할 거리가 없다');
}

//  ⑨ 감사가 잡은 오탐 — 이름이 든 예사말이 정본을 덮던 것
{
  const bs = U.craneBowSternOf(FX.DJCF);
  const NO = ['김판석 선미 쪽으로 갔어', '이종부 선수쪽에서 작업중', '선미에 김판석 있어',
              '선수 커버 열어', '선미부터 양하하자', '선미 램프 내려',
              //  ⚠ 3차 감사 — 위 여섯은 **조 낱말이 없어** 옛 게이트에서 걸린다. 끝말 게이트가 정말 일하는지는
              //    «조가 붙은 예사말» 로만 잰다(2차 감사가 이 부류 9건이 통과하는 것을 실측했다).
              '야간에 김판석 선미 쪽으로 갔어', '야간근무중 김판석 선미쪽에 있어', '밤에 김판석 선미 갔다',
              '주간에 이종부 선수 왔어', '야간 김판석 선미쪽에 없어', '근무자 김판석 선미쪽에 있었어'];
  let bad = [];
  for (const q of NO) if (U.parseCraneCrew(q, NAMES, bs)) bad.push(q);
  ok(!bad.length, `예사말은 등록으로 안 본다 (${bad.length ? '⛔ ' + bad.join(' · ') : '6문장 전부 통과'})`);
  //  진짜 등록 문장은 그대로 — 조(주간·야간·근무)나 쪽 둘이 등록 신호다
  ok(!!U.parseCraneCrew('야간근무 DJCF 선미 김판석 선수 이종부', NAMES, bs), '조가 붙은 실제 문장은 등록으로 본다');
  ok(!!U.parseCraneCrew('선미 김판석 선수 이종부', NAMES, bs), '쪽이 둘 다 나오면 조를 안 대도 등록으로 본다');
  //  ⚠ 3차 감사 — 옛 어미 그물이 «해줘|해라» 를 죽여 «등록해줘» 가 안 되던 자기모순
  for (const q of ['야간 선미 김판석 등록해줘', '야간 선미 김판석 기억해줘', '야간 선미 김판석 등록해라'])
    ok(!!U.parseCraneCrew(q, NAMES, bs), `«${q}» 는 등록으로 본다`);
}

//  ⑩ 감사가 잡은 «소리 없이 사라지던 것» 둘
{
  const bs = U.craneBowSternOf(FX.DJCF);
  const a = U.parseCraneCrew('선미 김판석 이종부 선수', NAMES, bs);   // 어순이 섞인 문장
  const by = {}; ((a && a.crew) || []).forEach((c) => { by[c.name] = c.no; });
  ok(by['김판석'] === 4 && by['이종부'] === 3, `어순이 섞여도 둘 다 잡는다 (${JSON.stringify(by)})`);
  const b = U.parseCraneCrew('야간근무 선미 홍길동 선수 이종부', NAMES, null);   // 유도 실패 + 명단 밖 이름
  ok((b.unknown || []).some((u) => u.tok === '홍길동'),
     '유도를 못 해도 «명단에 없는 이름» 경고는 살아 있다(감사: unknown 을 버리던 것)');
}

//  ⑪ **호기와 쪽을 섞어 말한 문장** — 재감사가 잡은 회귀. 합치기가 한 사람을 두 호기에 앉혔다
//     («1호기 김판석 선미 이종부» → 1:김판석 · 4:**김판석**, 이종부는 통째로 사라졌다). 정본 오염이다.
{
  const bs = U.craneBowSternOf(FX.DJCF);   // 선수 3 · 선미 4
  const T = [['1호기 김판석 선미 이종부', '1:김판석,4:이종부'],
             ['야간 2호기 이종부 선미 김판석', '2:이종부,4:김판석'],
             ['야간근무 1호기 김판석 선수 이종부', '1:김판석,3:이종부'],
             ['선미 김판석 선수', '4:김판석'],
             ['선미 김판석 이종부 선수', '3:이종부,4:김판석'],
             //  ⚠ 3차 감사 — 위 다섯은 전부 두 그물이 동수라 «합치기 가드» 만으로 통과한다.
             //    «호기가 잡은 사람을 쪽 그물에서 뺀다» 는 수리는 **동수가 아닌 문장**에서만 드러난다.
             ['야간 1호기 김판석 선미 이종부 최원형 선수', '1:김판석,3:최원형,4:이종부']];
  for (const [q, exp] of T) {
    const r = U.parseCraneCrew(q, NAMES, bs);
    const got = ((r && r.crew) || []).map((c) => c.no + ':' + c.name).sort().join(',');
    ok(got === exp.split(',').sort().join(','), `«${q}» → ${got || 'null'}${got === exp.split(',').sort().join(',') ? '' : '   기대 ' + exp}`);
  }
  //  한 사람이 두 호기에 앉지 않는다 — 위 다섯 문장 전부에서
  for (const [q] of T) {
    const r = U.parseCraneCrew(q, NAMES, bs);
    const names = ((r && r.crew) || []).map((c) => c.name);
    ok(new Set(names).size === names.length, `«${q}» — 한 사람이 두 호기에 안 앉는다 (${names.join('·') || '-'})`);
  }
}

//  ⑫ **화면 글을 실제로 불러** 저장부와 대조한다 — 재감사 지적(소스 스캔만 있고 행동 검사가 0항이었다).
{
  if (typeof U.crewSetText !== 'function') { ok(false, 'crewSetText 를 진입점에서 못 불렀다'); }
  else {
    const bs = U.craneBowSternOf(FX.DJCF);
    const parse = (q) => U.parseCraneCrew(q, NAMES, null);   // 화면에 오는 것은 유도 전 crewSet 이다
    const asCs = (r) => ({ shift: r.shift, dayOff: r.dayOff || 0, crew: r.crew, unknown: r.unknown, needPos: r.needPos || [] });
    //  ⓐ 유도되는 배 — 글과 저장이 같은 답
    {
      const cs = asCs(parse('야간근무 DJCF 선미 김판석 선수 이종부'));
      const saved = U.resolveCrewSides(cs, bs);
      const txt = String(U.crewSetText(U.resolveCrewSides(cs, bs), 'DJCF') || '');
      const who = (saved.crew || []).map((c) => `${c.no}호기 ${c.name}`);
      ok(who.length === 2 && who.every((w) => txt.includes(w)), `화면 글이 저장할 것과 같다 (${who.join(' · ')})`);
      ok(/못 가려요/.test(txt) === false, '가렸으면 되묻지 않는다 — «못 가려요» 라면서 뒤로 저장하던 것');
      ok(/선수 3호기 · 선미 4호기/.test(txt), '무엇으로 가렸는지 근거를 글에 밝힌다');
    }
    //  ⓑ 실적 없는 배 — 글은 되묻고 저장할 것은 없다
    {
      const cs = asCs(parse('야간근무 ATPR 선미 김판석 선수 이종부'));
      const saved = U.resolveCrewSides(cs, { discharge: {} });
      const txt = String(U.crewSetText(saved, 'ATPR') || '');
      ok(!(saved.crew || []).length && /못 가려요/.test(txt), '못 가리면 글도 되묻고 저장할 crew 도 없다');
    }
    //  ⓒ 부분 성공 — 가린 사람은 기억하고 못 가린 사람을 밝힌다(수리 ④의 행동 검사)
    {
      const cs = asCs(parse('야간근무 1호기 김판석 선미 이종부'));
      const kept = U.resolveCrewSides(cs, { discharge: {} });   // 유도 못 하는 배
      const txt = String(U.crewSetText(kept, 'ATPR') || '');
      ok(/1호기 김판석/.test(txt), '가린 사람은 기억한다고 말한다');
      ok(/못 가려 아직 못 적었어요/.test(txt) && /선미 이종부/.test(txt), '못 가린 사람을 이름과 함께 밝힌다 — 소리 없이 사라지지 않는다');
    }
    //  ⓓ 명단 밖 이름 — 유도 실패 경로에서도 경고가 산다
    {
      const cs = asCs(parse('야간근무 선미 홍길동 선수 이종부'));
      const txt = String(U.crewSetText(U.resolveCrewSides(cs, { discharge: {} }), '') || '');
      ok(/홍길동/.test(txt) && /명단에 없어/.test(txt), '명단 밖 이름 경고가 유도 실패 경로에서도 나온다');
    }
  }
}

console.log(fail ? `\n✗ 선수·선미 연막검사 실패 ${fail}건` : '\n✓ 선수·선미 연막검사 통과');
process.exit(fail ? 1 : 0);
