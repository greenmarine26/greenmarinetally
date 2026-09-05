// 베이사전 휴지통 문지기(3.8-01) — 휴지통에 있는 배가 어떤 저장 경로로도 보관소에 되살아나지 않는지 검사한다.
//
//  왜 있는가 — 검수사 2026-09-05 «베이메트릭스에서 휴지통에 넣은게 자꾸 목록으로 다시올라옴 영구삭제 바랍니다».
//  실측 BSDU·MARS·SAWA 가 휴지통 사본과 한 글자도 안 다른 채(updatedAt 까지 같음) 보관소에 되살아났다 —
//  기기 로컬 사본이 「☁ 전체 동기화」(fbBatchSaveShipBayDict → fbSaveShipBayDict)로 그대로 올라간 것.
//  픽스처는 실 RTDB 에서 베낀 모양 그대로(tools/fixtures/baydict_trash_fixture.json — DJCT 정본 1·휴지통 BSDU·MARS).
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_baytrash.cjs <firebase 번들.cjs>'); process.exit(1); }
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'baydict_trash_fixture.json'), 'utf8'));
// 권한자 게이트를 통과하게 — 검수사(김성일)로 로그인한 기기와 같은 상태
const store = { master_active_inspector_v1: '김성일' };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.window = global.window || {};
global.window.__gmMatrixEditors = ['김성일'];
global.window.alert = () => {};
global.document = global.document || { createElement: () => ({}) };
const warns = [];
const _warn = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

global.__memdb = { ship_bay_dict_v3: JSON.parse(JSON.stringify(FX.v3)), ship_bay_dict_trash: JSON.parse(JSON.stringify(FX.trash)) };
global.__memlog = [];
const F = require(path.resolve(B));

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const v3 = () => global.__memdb.ship_bay_dict_v3 || {};
const trash = () => global.__memdb.ship_bay_dict_trash || {};
const writesTo = (p) => global.__memlog.filter(l => l.path.startsWith(p));
const strip = (o) => { const { _trashedAt, _trashedBy, ...rest } = o || {}; return rest; };

(async () => {
  console.log('베이사전 휴지통 문지기 — 되살아나지 않는가');
  ok(typeof F.fbIsTrashedShipBayDict === 'function' && typeof F.fbSaveShipBayDict === 'function' && typeof F.fbBatchSaveShipBayDict === 'function' && typeof F.fbTrashShipBayDict === 'function', '함수 넷이 번들에 있다');

  //  ① 휴지통 표식 읽기
  ok(await F.fbIsTrashedShipBayDict('MARS') === true && await F.fbIsTrashedShipBayDict('BSDU') === true, '휴지통에 있는 MARS·BSDU → true');
  ok(await F.fbIsTrashedShipBayDict('DJCT') === false && await F.fbIsTrashedShipBayDict('') === false, '정본 DJCT·빈 코드 → false');

  //  ② 사고 재현 — 「☁ 전체 동기화」가 보내는 모양 그대로(휴지통 사본 = 기기 로컬 사본, updatedAt 보존)
  const localCopy = { MARS: strip(FX.trash.MARS), BSDU: strip(FX.trash.BSDU), DJCT: JSON.parse(JSON.stringify(FX.v3.DJCT)) };
  const payload = {};
  for (const [code, e] of Object.entries(localCopy)) {
    payload[code] = { code: e.code || code, name: e.name || '', callsign: e.callsign || '', imo: e.imo || '', source: 'user', _userOwned: true,
      bayDef: e.bayDef, editorName: '김성일', updatedAt: Number(e.updatedAt) || Date.now(), _inspector: '김성일' };
  }
  global.__memlog = [];
  const res = await F.fbBatchSaveShipBayDict(payload);
  ok(res.trashed === 2 && res.failed === 0, `전체 동기화 — 휴지통 2척은 «되살리지 않음»으로 센다(${JSON.stringify(res)})`);
  ok(!('MARS' in v3()) && !('BSDU' in v3()), '보관소에 MARS·BSDU 가 생기지 않았다');
  ok(writesTo('ship_bay_dict_v3/MARS').length === 0 && writesTo('ship_bay_dict_v3/BSDU').length === 0, '그 두 경로에 쓰기 0회');
  ok('DJCT' in v3() && 'MARS' in trash() && 'BSDU' in trash(), '정본 DJCT 는 그대로 · 휴지통 사본은 그대로(표식은 안 지운다)');

  //  ③ 단건 경로(EDI 자동 등록·def 업로드·빌더 저장)도 같은 문 — 휴지통 코드는 false, 정본 코드는 종전대로
  global.__memlog = []; warns.length = 0;
  ok(await F.fbSaveShipBayDict('MARS', { code: 'MARS', name: 'MARSA PRIDE', callsign: '3E4740', source: 'edi-auto', _inspector: '김성일' }) === false, 'EDI 자동 등록 모양으로 MARS → false');
  ok(await F.fbSaveShipBayDict('BSDU', { ...strip(FX.trash.BSDU), bayDef: { ...FX.trash.BSDU.bayDef, sourceFile: 'matrix_builder' } }) === false, '빌더 저장 모양으로 BSDU → false(휴지통은 사람이 옮겨야 되살아난다)');
  ok(!('MARS' in v3()) && !('BSDU' in v3()) && global.__memlog.length === 0, '보관소 쓰기 0회');
  ok(warns.some(w => /휴지통에 있는 배라 되살리지 않습니다/.test(w) && /MARS/.test(w)), '조용히 실패하지 않는다 — 콘솔에 코드와 함께 남긴다');
  const before = JSON.stringify(v3().DJCT);
  const okSave = await F.fbSaveShipBayDict('DJCT', { ...FX.v3.DJCT, updatedAt: FX.v3.DJCT.updatedAt });
  ok(okSave === true && JSON.stringify(v3().DJCT) === before, '정본 DJCT 같은 내용 저장 → true(무변경이라 쓰지 않음) · 내용 그대로');
  //  ⚠ 실제로 만들어지는 모양(빌더 저장)으로 — bayDef 없는 edi-auto 는 provisional 이 undefined 라 실 SDK 가 set 을 거부한다(1.62 이후 잠복 결함, 인계함).
  const okNew = await F.fbSaveShipBayDict('ZZZZ', { code: 'ZZZZ', name: 'NEW SHIP', source: 'user', _userOwned: true, provisional: false, updatedAt: 1,
    bayDef: { source: 'user', _userOwned: true, sourceFile: 'matrix_builder', recordCount: 1, baysSummary: [{ bay: 1 }] }, editorName: '김성일', _inspector: '김성일' });
  ok(okNew === true && 'ZZZZ' in v3(), '휴지통에 없는 새 코드(빌더 저장 모양)는 종전대로 만들어진다(퇴행 없음)');
  //  비고·보조 저장은 없는 키에 유령 노드를 만들지 않는다(감사 2)
  global.__memlog = [];
  ok(await F.fbSetShipBayDictNote('MARS', '쪽지', '김성일') === false && !('MARS' in v3()) && global.__memlog.length === 0, '휴지통 코드에 비고 저장 → false · 유령 노드 없음');
  ok(await F.fbSetShipBayDictSpare('BSDU', true, '김성일') === false && !('BSDU' in v3()) && global.__memlog.length === 0, '휴지통 코드에 보조 표 → false · 유령 노드 없음');
  ok(await F.fbSetShipBayDictNote('DJCT', '쪽지', '김성일') === true && v3().DJCT.note === '쪽지', '정본 DJCT 비고 저장은 종전대로');

  //  ④ 휴지통으로 옮긴 뒤 곧바로 되살리기를 시도해도 막힌다(사고 순서 그대로)
  global.__memlog = [];
  ok(await F.fbTrashShipBayDict('ZZZZ', '김성일') === true && !('ZZZZ' in v3()) && trash().ZZZZ && trash().ZZZZ._trashedBy === '김성일', 'ZZZZ 휴지통으로 — 보관소에서 내려가고 누가 옮겼는지 남는다');
  ok(await F.fbSaveShipBayDict('ZZZZ', { code: 'ZZZZ', name: 'NEW SHIP', source: 'user', _userOwned: true, updatedAt: 1 }) === false && !('ZZZZ' in v3()), '옮긴 직후 전체 동기화 모양 저장 → 되살아나지 않는다');

  //  ⑤ 휴지통을 못 읽으면(오프라인) 되살리는 쪽이 아니라 막는 쪽으로
  global.__memfail = (p) => p.startsWith('ship_bay_dict_trash/');
  ok(await F.fbIsTrashedShipBayDict('DJCT') === true, '휴지통 읽기 실패 → true(막는다) + 경고');
  ok(await F.fbSaveShipBayDict('DJCT', { ...FX.v3.DJCT }) === false, '그때는 저장도 false — 조용히 되살리지 않는다');
  global.__memfail = null;

  console.warn = _warn;
  console.log(fail ? `✗ 실패 ${fail}건` : '✓ 베이사전 휴지통 문지기 검사 통과');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('THROW', e); process.exit(1); });
