// 평택 선적분 판정(3.14) — 선사 CLL 이 데려온 통과화물이 선적분으로 안 세어지는가, 그리고 엠티 리스트(EDI 밖)는 그대로 사는가.
//   검수사 2026-09-06 «26개의 컨테이너가 정말 선적분인지와 20여개의 선적위치가 이상한곳에» · «EDI가 조금전에 들어 온것이니 그게 맞을거라는 저의 판단입니다».
//   픽스처는 DJCF 0150N 선적(0151S) 실데이터 사본이다.
const path = require('path'), fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_ptk.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'ptk_djcf.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('평택 선적분 판정 · 규격(DJCF 0151S 실데이터 사본)');

const merged = (cn) => {
  const e = FX.ediContainers[cn], r = FX.records[cn];
  const c = { ...(e || {}), ...(r || {}), _inList: !!r };
  if (e) { if (e.pol != null) c.pol = e.pol; if (e.pod != null) c.pod = e.pod; if (e.bay != null) c.bay = e.bay; }   // pol·pod·자리는 EDI 가 정본(부록 A-2)
  return c;
};
const cns = [...new Set([...Object.keys(FX.ediContainers), ...Object.keys(FX.records)])];
const transit = cns.filter(cn => (FX.ediContainers[cn] || {})._mode === 'transit');
const mine = cns.filter(cn => (FX.ediContainers[cn] || {})._mode === 'loading');
const noEdi = cns.filter(cn => !FX.ediContainers[cn]);
ok(transit.length >= 20 && mine.length >= 20 && noEdi.length === 2, `픽스처 — 통과화물 ${transit.length} · 평택 선적분 ${mine.length} · EDI 없음 ${noEdi.length}`);

//  ① 리스트에 있어도 EDI 가 «남의 항구 → 남의 항구»면 선적분이 아니다
const badKeep = transit.filter(cn => U.isPtk(merged(cn), 'loading'));
ok(badKeep.length === 0, `리스트에 실린 통과화물 ${transit.length}대 전부 선적분에서 빠진다${badKeep.length ? ' — 남은 것 ' + badKeep.slice(0, 5) : ''}`);
//  ② 진짜 평택 선적분은 그대로
const lost = mine.filter(cn => !U.isPtk(merged(cn), 'loading'));
ok(lost.length === 0, `평택 선적분 ${mine.length}대는 그대로 남는다${lost.length ? ' — 빠진 것 ' + lost.slice(0, 5) : ''}`);
//  ③ EDI 에 없는 리스트 컨(엠티 선적 리스트 오염 계열)은 종전대로 산다 — 자료를 함부로 버리지 않는다
const gone = noEdi.filter(cn => !U.isPtk(merged(cn), 'loading'));
ok(gone.length === 0, `EDI 에 없는 리스트 컨 ${noEdi.length}대는 «리스트=평택»으로 그대로 산다(${noEdi.join(', ')})`);
//  ④ 항구 칸이 목적지로 오염된 엠티(EDI 없음·자리 없음)도 산다 — M6.94.29 285대 사건 회귀 가드
ok(U.isPtk({ pol: 'CNDLC', pod: 'CNDLC', _inList: true }, 'loading') === true, '엠티 리스트 오염(pol=목적지·EDI 없음)은 선적분으로 산다');
ok(U.isPtk({ pol: 'KRINC', pod: 'KRPUS', _mode: 'transit', _inList: true }, 'loading') === false, '파서가 통과화물이라 적은 컨은 빠진다(_mode)');
ok(U.isPtk({ pol: 'KRINC', pod: 'KRPUS', _slotKey: 'X', _inList: true }, 'loading') === false, '_mode 없는 옛 자료도 EDI 출신+남의 항구면 빠진다');
ok(U.isPtk({ pol: 'KRINC', pod: 'KRPUS', bay: '17', _inList: true }, 'loading') === true, '자리만 있고 EDI 출신 표식이 없으면 안 뺀다(리스트 전용 컨 보호 — 감사)');
ok(U.isPtk({ pol: 'KRINC', pod: 'KRPTK', _mode: 'loading', _inList: true }, 'loading') === true, '평택행(POD 평택)은 안 뺀다');
ok(U.isPtk({ pol: 'KRPTK', pod: 'VNSGN', _mode: 'loading' }, 'loading') === true, 'POL 평택은 리스트 없이도 선적분');
ok(U.isPtk({ pod: 'KRPTK' }, 'discharge') === true && U.isPtk({ pod: 'VNSGN', pol: 'KRINC', _mode: 'transit', _inList: true }, 'discharge') === false, '양하 판정은 종전 그대로(POD 평택만)');
//  ⑤ 규격 — 동진 오픈탑 코드
ok(U.isoToLabel('225E') === '20OT' && U.isoToLabel('435E') === '40OT', '오픈탑 225E → 20OT · 435E → 40OT');
ok(U.isoToLabel('22UE') === '20OT' && U.isoToLabel('42UE') === '40OT', '리스트 표기 22UE·42UE 도 같은 라벨(두 자료가 한 값)');
ok(U.isoToLabel('45GP') === '40HC' && U.isoToLabel('22G1') === '20DC' && U.isoToLabel('45R1') === '40RH' && U.isoToLabel('L5G1') === '45HC', '표준 코드는 안 건드린다');
//  ⚠ 풀 오픈탑(`2250`·`4350`)은 아직 드라이로 읽는다 — 이 판은 엠티 변형만 고쳤다(실데이터에 풀 오픈탑이 없어 근거를 못 세웠다). 인계함.
//  ⑥ 별첨 총계 — 통과화물이 빠진 수
const rows = cns.map(merged);
const L = U.legendLiveOf(rows, 'loading', {});
ok(L.n === mine.length + noEdi.length, `별첨 총계 ${L.n} = 평택 선적분 ${mine.length} + EDI 없는 리스트 ${noEdi.length}(통과화물 ${transit.length} 제외)`);
console.log(fail ? `✗ 평택 판정 검사 실패 ${fail}건` : '✓ 평택 선적분 판정·규격 검사 통과');
process.exit(fail ? 1 : 0);
