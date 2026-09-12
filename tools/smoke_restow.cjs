// 3.44 연막검사 — 선사 시프팅 목록(RESTOW LIST)이 오면 그것이 정본인가 (MCAT 635N 실데이터).
//   검수사 2026-09-12 «카토스에 있는 MCAT 시프팅 자료를 찾아서 검수앱과 맞춰주세요 2개 차이납니다» · «둘 다 보이기».
//   기준표는 코드가 내는 값이 아니라 **선사 서류**다 — TOTAL 14대, 그중 제자리 재적재 1대(MSKU5260201),
//   앱 추정(EDI 대조)은 12대이고 서류에만 있는 둘은 MRKU9040939(비방해 이적)·MSKU5260201(제자리)다.
const fs = require('fs'); const path = require('path');
const U = require(path.resolve(process.argv[2] || ''));
const ROOT = path.join(__dirname, '..');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'restow_mcat.json'), 'utf8'));
const DOC_ONLY = ['MRKU9040939', 'MSKU5260201'];
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('선사 시프팅 목록 정본 (TallyOne 3.44)');

// ① 픽스처가 실서류 그대로인가
const doc = FX.restowList;
const cns = Object.keys(doc).filter((k) => !k.startsWith('_'));
ok(cns.length === 14 && doc._meta.total === 14, `서류 ${cns.length}대 · TOTAL ${doc._meta.total} (ARTOTINA ${doc._meta.voy})`);
ok(doc._meta.source === 'carrier' && /RESTOW/i.test(doc._meta.file), `출처 표식 — ${doc._meta.source} · ${doc._meta.file}`);
ok(FX.info.berthShift === 28, '배정목록 이적 28모브 ÷ 2 = 14대 — 서류와 같은 수');

// ② 서류 → 시프팅 맵 판정 한 벌
const m = U.restowMapFromDoc(doc);
ok(!!m && Object.keys(m).length === 14, `restowMapFromDoc — ${m ? Object.keys(m).length : 0}대`);
ok(Object.values(m).every((v) => /^\d{7}$/.test(v.from) && /^\d{7}$/.test(v.to)), '자리는 앱과 같은 7자리(BBBRRTT)로 맞춘다');
ok(m.MSKU5260201 && m.MSKU5260201._same === true && m.MSKU5260201.from === m.MSKU5260201.to,
   `제자리 재적재를 표식한다 — MSKU5260201 ${m.MSKU5260201 && m.MSKU5260201.from}`);
ok(Object.values(m).filter((v) => v._same).length === 1, '제자리는 1대뿐이다(나머지는 자리가 바뀐다)');
ok(m.MRSU7543747 && m.MRSU7543747.from === '0340602' && m.MRSU7543747.to === '0141182',
   'from 은 도착(ArvPos) · to 는 선적(DepPos) — 서류 칸을 뒤집지 않는다');

// ③ 창구 한 벌 — 서류가 있으면 정본, 없으면 종전 추정(회귀 없음)
const voyDoc = { info: FX.info, discharge: FX.discharge, loading: FX.loading, restowList: doc };
const voyEst = { info: FX.info, discharge: FX.discharge, loading: FX.loading };
const withDoc = U.computeShiftingMapCached('MCAT_635N__doc', voyDoc);
const noDoc = U.computeShiftingMapCached('MCAT_635N__est', voyEst);
ok(Object.keys(withDoc).length === 14, `서류가 있으면 ${Object.keys(withDoc).length}대(정본)`);
ok(Object.keys(noDoc).length === 12, `서류가 없으면 종전 추정 ${Object.keys(noDoc).length}대 — 회귀 없음`);
ok(Object.keys(noDoc).every((cn) => withDoc[cn]), '추정 12대는 서류 14대에 전부 들어 있다(앱이 헛것을 세지 않았다)');
const meta = withDoc._meta || {};
ok(meta.source === 'carrier' && meta.estN === 12, `_meta — 출처 ${meta.source} · 앱 추정 ${meta.estN}대`);
ok(JSON.stringify((meta.docOnly || []).slice().sort()) === JSON.stringify(DOC_ONLY.slice().sort()),
   `서류에만 있는 둘 — ${(meta.docOnly || []).join(', ')}`);
ok((meta.estOnly || []).length === 0, '앱에만 있는 것은 없다');

// ④ 표시 창구도 서류를 그대로 내보낸다
const disp = U.shiftingMapForDisplay('MCAT_635N__doc2', voyDoc);
ok(Object.keys(disp).length === 14 && disp._meta && disp._meta.source === 'carrier', `shiftingMapForDisplay ${Object.keys(disp).length}대 · 서류 정본`);
//  서류가 «0대» 라고 말한 것도 답이다 — 예측으로 떨어지지 않는다.
const zero = U.computeShiftingMapCached('MCAT_635N__zero', { info: FX.info, discharge: FX.discharge, loading: FX.loading, restowList: { _meta: { source: 'carrier', total: 0, at: 1 } } });
ok(Object.keys(zero).length === 0 && zero._meta && zero._meta.source === 'carrier', '서류가 0대면 0대로 둔다(추정으로 안 떨어진다)');

// ⑤ 배선 — 화면·콘앱이 같은 판정을 쓰는가(주석 제외)
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
const vp = code('src/pages/VoyagePage.jsx');
ok(/meta\?\.source === 'carrier'/.test(vp), '항차 화면이 «선사 서류 정본»을 밝힌다');
ok(/앱 추정 \$\{shiftInfo\.meta\.estN\}/.test(vp), '앱 추정과 차이를 같이 적는다(검수사 «둘 다 보이기»)');
ok(/sc\.same \? `\$\{sc\.from\} \(제자리\)`/.test(vp), '제자리 재적재를 목록에 «제자리»로 적는다');
ok(/s\.same \? '제자리'/.test(code('src/components/ValidationBox.jsx')), '인쇄·엑셀에도 제자리를 적는다');
const cone = code('public/cone.html');
ok(/function ctShiftMap\(/.test(cone) && /restowMapFromDoc/.test(cone), '콘앱에 시프팅 판정 한 벌(ctShiftMap)이 있다');
ok(!/_cs\d?\((_d|_l)/.test(cone) && (cone.match(/ctShiftMap\(/g) || []).length >= 4, '콘앱 세 자리가 전부 그 한 벌만 부른다');
ok(/restowList/.test(cone), '콘앱이 선사 서류를 읽는다');
ok(/restowMapFromDoc/.test(code('src/coneCargoPlan.entry.jsx')), '콘앱 번들이 그 판정을 내보낸다');


//  ★ 3.44 감사 지적 3건 — 그 자리에서 수리했다. 다시 나면 여기서 걸린다.
{
  //  ① 빈 칸을 0 으로 채워 «제자리 재적재» 한 대로 세지 않는다.
  const bad = U.restowMapFromDoc({ MSKU5260201: { from: '', to: '' }, MRKU9040939: { from: null, to: '0330904' }, TEMU1234567: { from: '0330904', to: '' } });
  ok(bad === null, `빈 자리 행은 «제자리»로 세지 않는다(${bad ? Object.keys(bad).length + '대 샘' : '0대'})`);
  //  ⚠ 재감사 — 자릿수로 거르면 실서류가 빠진다(MRKU9040939 는 '30388' 5자리).
  const short5 = U.restowMapFromDoc({ MRKU9040939: { from: '170182', to: '30388' } });
  ok(short5 && short5.MRKU9040939 && short5.MRKU9040939.to === '0030388', `짧은 자리(5자리)도 읽는다(${short5 && short5.MRKU9040939 && short5.MRKU9040939.to})`);
  const mix = U.restowMapFromDoc(Object.assign({}, doc, { TEMU1234567: { from: '', to: '' } }));
  ok(mix && Object.keys(mix).length === 14 && !mix.TEMU1234567, `깨진 행 하나가 섞여도 14대 그대로(${mix ? Object.keys(mix).length : '없음'})`);
  ok(mix && mix._meta && mix._meta.dropped === 1 && mix._meta.read === 14, `못 읽은 행을 표식으로 남긴다(못 읽음 ${mix && mix._meta && mix._meta.dropped})`);
  //  ② 대수도 at 도 그대로인데 자리만 고쳐 온 서류를 캐시가 놓치지 않는다.
  const k = 'MCAT_635N__sig';
  const d1 = JSON.parse(JSON.stringify(doc)); if (d1._meta) delete d1._meta.at;
  const cn0 = Object.keys(d1).filter((x) => !x.startsWith('_'))[0];
  const m1 = U.computeShiftingMapCached(k, { info: FX.info, discharge: FX.discharge, loading: FX.loading, restowList: d1 });
  const d2 = JSON.parse(JSON.stringify(d1)); d2[cn0].to = '0990999';
  const m2 = U.computeShiftingMapCached(k, { info: FX.info, discharge: FX.discharge, loading: FX.loading, restowList: d2 });
  ok(m1[cn0] && m2[cn0] && m2[cn0].to === '0990999' && m1[cn0].to !== m2[cn0].to,
     `자리만 고쳐 온 서류(at 없음)를 캐시가 반영한다(${m2[cn0] && m2[cn0].to})`);
}
//  ③ 콘앱 — 서류가 있으면 **선적 EDI 가 없어도** 시프팅이 선다(문은 추정에만 건다).
ok(/function ctHasRestow\(/.test(cone), '콘앱에 «서류 있음» 판정이 있다');
ok(/ctHasRestow\(\) \|\| \(state\.disch && state\.stow\)/.test(cone) &&
   /!ctHasRestow\(\) && \(!state\.disch \|\| !state\.stow\)/.test(cone),
   '콘앱 문은 추정에만 걸린다 — 서류는 선적 EDI 전에도 통과');
ok(/안 들어갔습니다.*선적 EDI 대기/.test(cone), '콘앱이 «아직 안 들어갔다»를 밝힌다(서류만 있고 합치지 못한 때)');
ok(/서류 \$\{shiftInfo\.meta\.docTotal/.test(vp) && /대만 읽음/.test(vp), '항차 화면이 «못 읽은 행»을 밝힌다(조용히 모자란 정본 금지)');

//  ★ 3.44-01 — 배정표가 서류와 다르면 화면이 말한다(검수사 «배정이 바뀌었는데 앱은 그대로»).
{
  const v = { info: FX.info, discharge: FX.discharge, loading: FX.loading, restowList: doc };
  const m38 = U.computeShiftingMapCached('MCAT_635N__b38', { ...v, info: { ...FX.info, berthShift: 38 } });
  const meta38 = Object.getOwnPropertyDescriptor(m38, '_meta').value;
  ok(meta38.berthN === 19, `배정표 38모브 → 19대를 _meta 에 남긴다(${meta38.berthN})`);
  const m28 = U.computeShiftingMapCached('MCAT_635N__b28', { ...v, info: { ...FX.info, berthShift: 28 } });
  ok(Object.getOwnPropertyDescriptor(m28, '_meta').value.berthN === 14, '28모브 → 14대');
  const m0 = U.computeShiftingMapCached('MCAT_635N__b0', { ...v, info: { ...FX.info, berthShift: 0 } });
  ok(Object.getOwnPropertyDescriptor(m0, '_meta').value.berthN === null, '배정표가 0·없음이면 null(없는 숫자를 지어내지 않는다)');
  const m39 = U.computeShiftingMapCached('MCAT_635N__b39', { ...v, info: { ...FX.info, berthShift: 39 } });
  ok(Object.getOwnPropertyDescriptor(m39, '_meta').value.berthN === 20, '홀수 모브는 올림해 «적어도 이만큼»(39 → 20)');
  ok(/배정표 \$\{shiftInfo\.meta\.berthN\}대/.test(vp) && /meta\?\.berthN != null && shiftInfo\.meta\.berthN !== shiftingList\.length/.test(vp),
     '화면이 배정표와 다르면 그 차이를 적는다');
}

console.log(fail ? `\n✗ 선사 시프팅 목록 연막검사 실패 ${fail}건` : '\n✓ 선사 시프팅 목록 연막검사 통과');
process.exit(fail ? 1 : 0);
