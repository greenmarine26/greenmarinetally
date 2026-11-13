// ConeOne 3.00-02 연막검사 — 양하·선적 항차 번호가 다른 배(STMJ 2671E / 2672W)를 콘앱 작업 목록이 양하·선적 둘 다 잡는가.
//  왜 있는가 — 5.00-01 라이브 확인(2026-11-13): 검수앱은 STMJ_2671E 한 키 안에 양하 494 · 선적 483(양하 29/494)인데, 콘앱은 «선적 2672W» 한 건만 보이고
//  «이 작업엔 양하 EDI가 없습니다» 가 떴다. RTDB GET — info { voy:2671E, voy_d:2671E, voy_l:2672W }. 목록은 항차 번호를 voy_l 하나만 보였고,
//  목록 읽기(fbFetchVoyages)는 못 읽은 것(신호·CORS 끊김)과 노드가 없는 것을 둘 다 null 로 받아 읽기가 한 번 끊기면 «양하 없음»으로 굳었다(4.89 콘앱 2.79 부터 같은 코드).
//  실 cone.html 의 fbFetchVoyages 를 그대로 꺼내 RTDB 를 흉내 낸 fbFetch 위에서 돌린다(실 Firebase 안 씀).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || d === undefined ? '' : '  → ' + String(d).slice(0, 300))); if (c) pass++; else fail++; };
const fn = (head) => { const i = src.indexOf(head); if (i < 0) throw new Error('없음 ' + head); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 2); };
const code = ['function _planMs(', 'function _planEnd(', 'function ctBerthNum(', 'function ctPierOf(', 'async function fbFetchVoyages('].map(fn).join('\n');
const INFO = { vsl: 'STMJ', voy: '2671E', voy_d: '2671E', voy_l: '2672W', planDate: '2026-11-13 13:00 ~ 2026-11-14 17:00', pier: 'PCTC', termVoy: 'STMJ-0014' };
const keysOf = (n) => { const o = {}; for (let i = 0; i < n; i++) o['STMU' + String(1000000 + i)] = true; return o; };
const make = (failRe) => async (p) => {
  if (failRe && failRe.test(p)) throw new TypeError('Failed to fetch');   // CORS 머리 없이 끊긴 응답(브라우저는 TypeError)
  const J = (o) => ({ ok: true, status: 200, json: async () => o });
  if (/^voyages\.json\?shallow/.test(p)) return J({ STMJ_2671E: true });
  if (/STMJ_2671E\/info\.json$/.test(p)) return J(INFO);
  if (/STMJ_2671E\/discharge\.json\?shallow/.test(p)) return J({ raw: true, ediContainers: true, completed: true, records: true });
  if (/STMJ_2671E\/loading\.json\?shallow/.test(p)) return J({ raw: true, ediContainers: true, records: true });
  if (/STMJ_2671E\/discharge\/ediContainers\.json\?shallow/.test(p)) return J(keysOf(494));
  if (/STMJ_2671E\/loading\/ediContainers\.json\?shallow/.test(p)) return J(keysOf(483));
  return J(null);
};
const run = async (failRe) => {
  const f = new Function('fbFetch', 'console', code + '\nreturn fbFetchVoyages();');
  return (await f(make(failRe), { warn: () => {}, log: () => {} }))[0];
};
(async () => {
  console.log('ConeOne 3.00-02 — 양하·선적 항차 번호가 다른 배(STMJ 2671E / 2672W)');
  const A = await run(null);
  ok(A && A.hasD && A.hasL && !A.noEdi, '자료가 다 오면 양하·선적 둘 다 잡는다', JSON.stringify(A && { hasD: A.hasD, hasL: A.hasL }));
  ok(A && A.voyShow === '2671E / 2672W', `목록·상태 칸 항차 번호는 둘 다(«${A && A.voyShow}») — 검수앱 수석 보드 vd/vl 규칙`);
  ok(A && A.ediD === 494 && A.ediL === 483, '앱이 가진 대수 양하 494 · 선적 483', A && `${A.ediD}/${A.ediL}`);
  const B = await run(/STMJ_2671E\/discharge\.json\?shallow/);
  ok(B && B.hasD === true, '양하 키 목록 읽기가 끊겨도 대수 목록(494)이 있으면 양하가 있다', JSON.stringify(B && { hasD: B.hasD, maybeD: B.maybeD }));
  const C = await run(/STMJ_2671E\/discharge(\.json|\/ediContainers\.json)\?shallow/);
  ok(C && C.hasD === false && C.maybeD === true && C.hasL === true && !C.noEdi, '양하를 통째로 못 읽으면 «없음» 이 아니라 «확인 필요»(고를 때 다시 읽는다)', JSON.stringify(C && { hasD: C.hasD, maybeD: C.maybeD }));
  const N = await (async () => { const f = new Function('fbFetch', 'console', code + '\nreturn fbFetchVoyages();'); const fb = make(null); return (await f(async (p) => (/discharge/.test(p) ? { ok: true, status: 200, json: async () => null } : fb(p)), { warn() {} }))[0]; })();
  ok(N && N.hasD === false && !N.maybeD, '정말 양하 노드가 없으면(200 · null) 종전대로 양하 없음');
  ok(/if\(v\.hasD \|\| v\.maybeD\)/.test(src) && /if\(v\.hasL \|\| v\.maybeL\)/.test(src), '항차를 고를 때 «확인 필요» 모드도 다시 읽는다');
  ok(/fbFetchEdiContainers\(voyageKey,'discharge'\)\.catch\(/.test(src), '양하 읽기가 끊겨도 선적은 이어서 읽는다');
  ok(/fbFetchRawEdi\(voyageKey,'discharge'\)\.catch\(function\(e\)\{[^}]*_ediReadFail\.discharge=true/.test(src) && /fbFetchRawEdi\(voyageKey,'loading'\)\.catch\(/.test(src), '감사 막음 — 원본 EDI 폴백이 끊겨도 throw 하지 않는다(양하 실패가 선적을 막지 않고 «못 받았습니다» 표시)');
  ok(/_ediReadFail\.discharge\?'양하 자료를 못 받았습니다\(신호\)/.test(src), '못 받은 것은 «EDI 없음» 이 아니라 «못 받았습니다» 로 알린다');
  console.log(fail ? `✗ ConeOne 3.00-02 항차 목록 연막 ${fail}/${pass + fail} 실패` : `✓ ConeOne 3.00-02 항차 목록 연막 — ${pass}/${pass} 통과`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 연막 실행 오류', e); process.exit(1); });
