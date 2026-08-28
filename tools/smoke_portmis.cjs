// 2.63-02 PORT-MIS 매칭 연막검사 — 자매선 오매칭·낡은 자료 되살아남 금지 (검수사 실측: SWTD 카드에 SHANGHAI 6/11 울산)
const path = require('path');
const fs = require('fs');
const PM = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/portmis_match.json'), 'utf8'));
// ① 자매선·낡은 자료 — SAWASDEE THAILAND(D7EE)에 SHANGHAI(V7A5455·낡음)가 붙으면 안 된다
T(PM.matchPortMis(fx, { callsign: 'D7EE', vslFull: 'SAWASDEE THAILAND', vsl: 'SWTD' }) === null, '⛔ 자매선 앞5자 오매칭 재발 — SWTD 에 SHANGHAI 가 붙는다');
// ② 본인은 콜사인으로 잡힌다 (콜사인 1단계는 시간 가드 폴백 유지 — 지난 기항 표기용)
const own = PM.matchPortMis(fx, { callsign: 'V7A5455', vslFull: 'SAWASDEE SHANGHAI' });
T(!!own && own.vesselName === 'SAWASDEE SHANGHAI', '콜사인 본인 매칭이 죽었다');
// ③ ★ 2.78 — **부르는 곳이 한 벌인가.** 손매칭이 여덟 벌이라 화면마다 다르게 찾던 것을 모았다.
//    (검수사 «포트미스 호출 자료를 베이메트릭스 자료로 호출 바랍니다. 자꾸 틀리게 호출하니
//     포트미스에 등록이 안되었다고 합니다» · «약자로 조회하는 오류는 없었으면 합니다»)
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
for (const f of ['src/pages/VoyagePage.jsx', 'src/pages/HomePage.jsx', 'src/pages/ChiefDashboard.jsx',
                 'src/components/XrayTab.jsx', 'src/components/ShipIntroCard.jsx']) {
  const t = src(f);
  T(/matchPortMis\(/.test(t), `${f} 가 공용 매처를 안 쓴다 — 화면마다 다르게 찾으면 «등록 없음» 이 갈린다`);
  //  ⛔ 콜사인 변수로 레코드를 직접 꺼내는 손매칭만 금지한다.
  //     (찾은 레코드의 키를 되찾는 `portMisData[k] === pm` 같은 것은 정당하다)
  T(!/portMisData\[(cs|callsign|_cs|dictCallsign)\b/.test(t), `${f} 에 콜사인 손매칭이 남아 있다`);
}
//  ⛔ 앞5자 슬라이스는 어디에도 없어야 한다 — SAWASDEE 10척이 «SAWAS» 로 뭉갠다
const pmm = src('src/portMisMatch.js');
T(!/slice\(0,\s*5\)/.test(pmm), '공용 매처에 앞5자 슬라이스가 남아 있다');
T(!/searchVsl\.slice\(0,\s*5\)/.test(src('src/pages/VoyagePage.jsx')), 'VoyagePage 에 앞5자 슬라이스가 남아 있다');
T(!/normVsl\.slice\(0,\s*5\)/.test(src('src/pages/HomePage.jsx')), 'HomePage 가 4자 코드를 앞5자로 선명과 맞춘다');
//  ⛔ 약자(4자 선박코드)를 이름 자리에 쓰지 않는다
T(!/ident\?\.name \|\| info\?\.vsl/.test(pmm), '이름 폴백에 4자 선박코드가 남아 있다');
T(/베이매트릭스/.test(pmm) && /shipIdentityOf/.test(pmm), '신원 해석 한 벌이 없다');
//  신원 해석 — 항차에 콜사인이 없어도 사전에서 가져온다(실측 16항차 중 15개가 공란)
{ global.window = { __fbShipBayDict: { SWTD: { code: 'SWTD', name: 'SAWASDEE THAILAND', callsign: 'D7EE', imo: '9377705', bayDef: {} } } };
  const id = PM.shipIdentityOf({ vsl: 'SWTD' });
  T(id.callsign === 'D7EE', `항차에 콜사인이 없을 때 사전에서 못 가져온다 (${id.callsign})`);
  T(id.name === 'SAWASDEE THAILAND', '사전 풀네임을 못 가져온다');
  T(id.imo === '9377705', '사전 IMO 를 못 가져온다'); }
//  이름이 통째로 같으면 콜사인이 달라도 그 배다(실측 STMJ VRKS6↔VRKS5 · ATPR D5RR5↔9V7919)
{ const fx2 = { X1: { callsign: 'VRKS5', vesselName: 'SITC MOJI', port: '평택', eta: '2026-08-28 10:00', etd: '2026-08-29 10:00' } };
  const m = PM.matchPortMis(fx2, { callsign: 'VRKS6', vslFull: 'SITC MOJI' });
  T(!!m, '이름이 통째로 같은데 콜사인 한 글자 달라 버린다 — STMJ 가 그렇게 «등록 없음» 이 됐다'); }
//  ⚠ 부분 포함은 여전히 배제 — SUNNY KALMIA ⊅ SUNNY
{ const fx3 = { X2: { callsign: 'ZZZZ', vesselName: 'SUNNY', port: '평택', eta: '2026-08-28 10:00', etd: '2026-08-29 10:00' } };
  T(!PM.matchPortMis(fx3, { callsign: '3E8980', vslFull: 'SUNNY KALMIA' }), '부분 포함인데 콜사인이 달라도 잡는다 — 남의 배가 걸린다'); }
if (bad > 0) { console.error(`✗ PORT-MIS 매칭 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ PORT-MIS 매칭 연막검사 통과 — 자매선 배제 · 본인 유지 · 한 벌 10 · 신원 3 · 이름일치 2');
