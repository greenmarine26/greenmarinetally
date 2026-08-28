// 신규 취항선 RZSY(SMC YANTAI) 등재 검사 — .def 사전 조회 + 기존 배 회귀
const path = require('path');
(async () => {
  const dict = await import(path.resolve('src/data/shipBayDict_def.js'));
  const ov   = await import(path.resolve('src/data/shipBayDict_pdf_override.js'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };

  console.log('[1] RZSY 19베이가 전부 조회되는가');
  const BAYS = ['01','02','03','05','06','07','09','10','11','13','14','15','17','18','19','21','22','23','25'];
  let n = 0;
  for (const b of BAYS) {
    const e = dict.getDefBayEntry('RZSY', b);
    if (e && e.rowCount === 7 && e.hasZero === true
        && String(e.deckTiers) === '90,88,86,84,82'
        && String(e.holdTiers) === '6,4,2'
        && String(e.holdCells) === '5,5,5') n++;
  }
  ok(n === 19, `19베이 규격 일치 — ${n}/19`);
  ok(dict.getDefBayEntry('RZSY','04') === null, '없는 베이 04 는 null (있는 척하지 않는다)');
  ok(dict.getDefBayEntry('RZSY','20') === null, '없는 베이 20 은 null');

  console.log('[2] getBayOverride 경로로도 같은 답이 나오는가');
  const g = ov.getBayOverride('RZSY','15');
  ok(!!g && g.rowCount === 7 && g.defSource === true, 'override → .def 폴백 (defSource 표시)');

  console.log('[3] 기존 배 회귀 — 손대지 않은 것이 변하지 않았는가');
  const REG = { DXQD:['03',8,false], SWTD:['32',11,true], KSKM:['27',10,false], TNJP:['29',7,true], STSE:['01',null,null] };
  for (const [code, [bay, rc, hz]] of Object.entries(REG)) {
    const e = dict.getDefBayEntry(code, bay);
    if (rc === null) { ok(!!e, `${code} ${bay} 조회됨`); continue; }
    ok(!!e && e.rowCount === rc && e.hasZero === hz, `${code} ${bay} → 줄 ${e && e.rowCount} · 00 ${e && e.hasZero}`);
  }

  console.log('[4] EDI 2633W 14대 자리가 사전 위에서 성립하는가');
  const EDI = [['01','00','82'],['01','01','82'],['01','03','82'],['03','02','82'],['03','00','82'],
               ['03','01','82'],['03','03','82'],['03','05','82'],['05','04','82'],['05','02','82'],
               ['05','00','82'],['05','01','82'],['14','00','82'],['15','02','82']];
  let hit = 0;
  for (const [b, r, t] of EDI) {
    const e = dict.getDefBayEntry('RZSY', b);
    if (!e) continue;
    const rows = e.hasZero
      ? Array.from({length: e.rowCount}, (_, i) => String(i).padStart(2,'0'))
      : Array.from({length: e.rowCount}, (_, i) => String(i+1).padStart(2,'0'));
    if (rows.includes(r) && e.deckTiers.includes(Number(t))) hit++;
  }
  ok(hit === 14, `EDI 자리 성립 ${hit}/14`);

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
