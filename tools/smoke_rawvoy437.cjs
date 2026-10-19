// 다른 항차 EDI 원문이 이번 항차 선적 합계에 섞이지 않는지 재는 연막검사 (TallyOne 4.37-02).
//   검수사 2026-10-19 17:42 «연태 선적 246개인데 선사별 합계 540» — 실데이터 OBWH_2769E 선적(현재 2770W 리스트 가상 EDI 246 + 지난 항차 2768W 출항 EDI raw 295).
const path = require('path'), fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_rawvoy437.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'rawvoy437_obwh2769.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('다른 항차 EDI 원문 걸러내기(4.37-02) · OBWH 2769E/2770W 실데이터');
const clone = (o) => JSON.parse(JSON.stringify(o));
//  ChiefDashboard.boardContainers 와 같은 길: fullEdiMapOf → 평택분 별첨(legendLiveOf)
const legend = (voyage, mode) => {
  const sec = voyage[mode]; const m = U.fullEdiMapOf(sec); const rec = sec.records || {};
  const rows = Object.values(m).map((e) => ({ ...e, _inList: !!rec[e.cn] || !!e._inList }));
  return U.legendLiveOf(rows, mode, sec.completed || {});
};
const v0 = clone(FX);
const bef = legend(v0, 'loading');
ok(bef.n === 540, `수정 전(재현) — 선적 별첨 합계 ${bef.n} (검수사 화면 540)`);
ok(U.rawEdiVoyageOf(FX.loading.raw.edi.text) === '2768W', '선적 raw EDI 의 TDT 항차 = 2768W');
const v1 = U.dropStaleRawEdi(clone(FX));
const aft = legend(v1, 'loading');
ok(aft.n === 246, `수정 후 — 선적 별첨 합계 ${aft.n} (현재 항차 리스트 246)`);
ok(aft.carriers.length === 1 && aft.carriers[0][0] === 'YTF' && aft.carriers[0][1].total.n === 246, `선사별 합계 YTF ${aft.carriers.map(([k, e]) => k + ':' + e.total.n).join(' ')} = 246`);
ok(aft.done === bef.done, `완료 수는 그대로(${bef.done} → ${aft.done})`);
ok(v1.loading._staleRawEdi && v1.loading._staleRawEdi.tag === '2768W' && v1.loading._staleRawEdi.expected === '2770W', '걸러낸 이유가 섹션에 남는다(2768W ≠ 2770W)');
ok(v1.loading.raw && !v1.loading.raw.edi, '선적 raw.edi 만 빠진다(raw 나머지 칸은 그대로)');
//  양하는 항차가 맞으니 손대지 않는다
ok(U.rawEdiVoyageOf(FX.discharge.raw.edi.text) === '2769E' && v1.discharge.raw.edi && !v1.discharge._staleRawEdi, '양하 raw EDI(TDT 2769E = voy_d 2769E)는 그대로');
ok(v1.discharge === FX.discharge || JSON.stringify(v1.discharge) === JSON.stringify(FX.discharge), '양하 섹션은 한 글자도 안 바뀐다');
//  정보가 없으면 건드리지 않는다(추측 금지)
const vNoL = clone(FX); delete vNoL.info.voy_l;
ok(U.dropStaleRawEdi(vNoL).loading.raw.edi, '선적 항차(voy_l)를 모르면 raw 를 건드리지 않는다');
const vNoTdt = clone(FX); vNoTdt.loading.raw.edi.text = vNoTdt.loading.raw.edi.text.replace(/TDT\+20\+[^+]*/, 'TDT+20+');
ok(U.dropStaleRawEdi(vNoTdt).loading.raw.edi, '원문에 항차(TDT)가 안 읽히면 건드리지 않는다');
//  항차가 같으면(대소문자·공백 무관) 그대로
const vSame = clone(FX); vSame.info.voy_l = ' 2768w ';
ok(U.dropStaleRawEdi(vSame).loading.raw.edi, '항차가 같으면(공백·대소문자 달라도) 그대로 쓴다');
//  감사 지적 반영 — 여러 파일이 합쳐진 원문 · 앞 0 · 보관 때 원문 복원
const vMulti = clone(FX); vMulti.loading.raw.edi.text = vMulti.loading.raw.edi.text + "\n----- FILE: next.edi\nTDT+20+2770W+++\n";
ok(!U.staleRawEdiOf(vMulti, 'loading'), '합쳐진 원문에 이번 항차(2770W) 파일이 하나라도 있으면 걸러내지 않는다');
const vZero = clone(FX); vZero.info.voy_l = '02768W';
ok(!U.staleRawEdiOf(vZero, 'loading'), '앞 0 만 다른 항차는 같은 항차로 본다(02768W = 2768W)');
const vDrop = U.dropStaleRawEdi(clone(FX)); const vBack = U.restoreStaleRawEdi(vDrop);
ok(JSON.stringify(vBack.loading.raw.edi) === JSON.stringify(FX.loading.raw.edi) && !vBack.loading._staleRawEdi, '보관 때 restoreStaleRawEdi 로 걸러낸 원문을 한 글자도 안 잃고 되돌린다(표식도 지운다)');
ok(JSON.stringify(vBack.discharge) === JSON.stringify(FX.discharge), '되돌려도 양하 섹션은 그대로');
ok(U.restoreStaleRawEdi(FX) === FX, '걸러낸 적 없는 항차는 같은 객체 그대로');
ok(U.dropStaleRawEdi(null) === null && U.dropStaleRawEdi({}) && !U.staleRawEdiOf({}, 'loading'), '빈 항차·null 에도 죽지 않는다');
console.log(`\n${fail ? '✗ ' + fail + '건 실패' : '✓ 전부 통과'}`);
process.exit(fail ? 1 : 0);
