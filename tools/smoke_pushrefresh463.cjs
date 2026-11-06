// 폰 알림 토큰 자동 갱신 연막검사 (TallyOne 4.63-03) — 검수사 2026-11-03 23:10 «제가 없어도 스스로 돌아야 합니다»
//   node tools/smoke_pushrefresh463.cjs <번들> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const T = (c, name, d = '') => { n += 1; if (c) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + d : ''}`); } };
const mk = (o = {}) => { const log = { save: [], remove: [], stored: null }; return { log, d: Object.assign({ name: '김성일', perm: 'granted', stored: 'OLD', getTok: async () => 'NEW',
  save: async (n2, t) => { log.save.push([n2, t]); }, remove: async (n2, t) => { log.remove.push([n2, t]); }, setStored: (t) => { log.stored = t; } }, o) }; };
(async () => {
  console.log('① 켜 둔 기기 — 토큰이 바뀌면 새로 등록하고 옛 토큰은 지운다');
  { const { log, d } = mk(); const r = await M.runPushRefresh(d);
    T(r.action === 'renewed' && log.save.length === 1 && log.save[0][1] === 'NEW' && log.stored === 'NEW' && log.remove[0][1] === 'OLD', '새 토큰 저장·기기 저장·옛 토큰 삭제', JSON.stringify([r, log])); }
  console.log('② 같은 토큰이면 등록 시각만 새로 한다');
  { const { log, d } = mk({ getTok: async () => 'OLD' }); const r = await M.runPushRefresh(d);
    T(r.action === 'same' && log.save.length === 1 && log.remove.length === 0 && log.stored === null, '다시 저장만 · 삭제 없음', JSON.stringify([r, log])); }
  console.log('③ 켠 적 없거나 권한이 없으면 아무 일도 안 한다');
  for (const [nm, o] of [['저장 토큰 없음', { stored: '' }], ['권한 거부', { perm: 'denied' }], ['권한 미정', { perm: 'default' }], ['이름 없음', { name: '' }]]) {
    const { log, d } = mk(o); const r = await M.runPushRefresh(d);
    T(r.action === 'skip' && log.save.length === 0, nm, JSON.stringify(r)); }
  console.log('④ 실패는 조용히 넘기지 않고 이유를 돌려준다');
  { const { d } = mk({ getTok: async () => { throw new Error('boom'); } }); const r = await M.runPushRefresh(d); T(r.action === 'fail' && /boom/.test(r.why), '토큰 발급 실패', JSON.stringify(r)); }
  { const { d } = mk({ getTok: async () => '' }); const r = await M.runPushRefresh(d); T(r.action === 'fail' && !!r.why, '빈 토큰', JSON.stringify(r)); }
  { const { log, d } = mk({ save: async () => { throw new Error('denied'); } }); const r = await M.runPushRefresh(d); T(r.action === 'fail' && /denied/.test(r.why) && log.stored === null, '서버 저장 실패면 기기 저장도 안 바꾼다', JSON.stringify([r, log])); }
  { const { log, d } = mk({ remove: async () => { throw new Error('x'); } }); const r = await M.runPushRefresh(d); T(r.action === 'renewed' && log.stored === 'NEW', '옛 토큰 삭제가 막혀도 새 등록은 유지', JSON.stringify(r)); }
  console.log('⑤ 배선');
  const app = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  const push = fs.readFileSync(path.join(ROOT, 'src/push.js'), 'utf8');
  T(/import\('\.\/push\.js'\)\.then\(\(m\) => m\.refreshPushIfOn\(inspector\)\)/.test(app), 'App.jsx 가 로그인 뒤 refreshPushIfOn 을 부른다');
  T(/export async function refreshPushIfOn/.test(push) && /runPushRefresh/.test(push), 'push.js 가 순수 논리를 쓴다');
  T(!/requestPermission/.test(push.slice(push.indexOf('refreshPushIfOn'))), '갱신 길에서 권한 창을 띄우지 않는다');
  T(/4\.(63-0[345]|6[45678])/.test(M.APP_VERSION), '판 번호 4.63-03 이후', M.APP_VERSION);
  console.log(`\n${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0);
})();
