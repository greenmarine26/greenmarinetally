// 엠티실 음성 막대(EsealVoiceBar, TallyOne 3.71)를 ATPR 2644W 실항차 컨으로 그려 대상·비대상 화면을 잰다 — firebase 는 메모리 스텁으로 갈아 끼운 번들(쓰기 없음)
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
const root = path.join(__dirname, '..');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/esealvoice_atpr2644w.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
global.window = global.window || { speechSynthesis: { speaking: false, pending: false } };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const stubFb = { name: 'stubfb', setup(b) { b.onResolve({ filter: /firebase\.js$/ }, () => ({ path: 'stubfb', namespace: 'stubfb' })); b.onLoad({ filter: /.*/, namespace: 'stubfb' }, () => ({ contents: 'export const fbSetEmptySeal = async () => true;', loader: 'js' })); } };
esbuild.build({ entryPoints: [path.join(root, 'src/components/EsealVoiceBar.jsx')], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, logLevel: 'error',
  external: ['react', 'react-dom', 'react-dom/server', 'firebase', 'firebase/*'], plugins: [stubFb] }).then((r) => {
  const m = { exports: {} }; new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require);
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const Bar = m.exports.default; const html = (p) => renderToStaticMarkup(React.createElement(Bar, p));
  const wei = F.containers.filter((c) => c.fe === 'E' && c.pod === 'CNWEI');
  const dlc = F.containers.filter((c) => c.fe === 'E' && c.pod === 'CNDLC');
  const voy = (over = {}) => ({ info: { vsl: F.vsl }, loading: { esealRanges: { list: [{ from: '036601', to: '036700' }] }, records: {}, ediContainers: {}, ...over } });
  console.log('엠티실 음성 막대 화면 — ATPR 2644W (TallyOne 3.71)');
  let h = html({ voyage: voy(), voyageKey: 'ATPR_2644W', inspector: 'T', card: { main: wei[0] }, mode: 'loading', voiceOn: true });
  ok(/data-eseal-voice/.test(h) && /뒷 세 자리/.test(h) && /036/.test(h) && /<input/.test(h), '위해행 엠티 선적 카드 — 막대·앞 세 자리(036)·입력칸이 그려진다');
  ok(/실 미입력/.test(h) && new RegExp(wei[0].l4).test(h), `컨 끝 4자리(${wei[0].l4})와 «실 미입력» 표시`);
  h = html({ voyage: voy(), voyageKey: 'k', inspector: 'T', card: { main: wei[0] }, mode: 'discharge', voiceOn: true }); ok(h === '', '양하 모드에서는 아무것도 안 그린다');
  h = html({ voyage: voy(), voyageKey: 'k', inspector: 'T', card: { main: dlc[0] }, mode: 'loading', voiceOn: true }); ok(h === '', '다롄행 엠티에는 아무것도 안 그린다');
  h = html({ voyage: { ...voy(), info: { vsl: 'RIZHAO ORIENT' } }, voyageKey: 'k', inspector: 'T', card: { main: wei[0] }, mode: 'loading', voiceOn: true }); ok(h === '', '다른 배(RZOR)에는 아무것도 안 그린다');
  h = html({ voyage: voy(), voyageKey: 'k', inspector: 'T', card: null, mode: 'loading', voiceOn: true }); ok(h === '', '카드가 없으면 아무것도 안 그린다');
  h = html({ voyage: voy({ esealRanges: null }), voyageKey: 'k', inspector: 'T', card: { main: wei[0] }, mode: 'loading', voiceOn: true }); ok(/구간이 아직 없어요/.test(h) && !/<input/.test(h), '구간이 없으면 «구간이 아직 없어요» 안내만(입력칸 없음)');
  h = html({ voyage: voy({ records: { [wei[0].cn]: { eseal: '036654' } } }), voyageKey: 'k', inspector: 'T', card: { main: wei[0] }, mode: 'loading', voiceOn: true }); ok(/✅ 036654/.test(h) && /고치기/.test(h) && /입력 끝/.test(h), '이미 실이 있으면 ✅ 036654 와 «고치기», 입력 끝 안내');
  h = html({ voyage: voy(), voyageKey: 'k', inspector: 'T', card: { main: wei[0], twin: wei[1] }, mode: 'loading', voiceOn: true }); ok(h.includes(wei[0].l4) && h.includes(wei[1].l4) && (h.match(/<input/g) || []).length === 1, '트윈 두 대 — 두 줄이 다 보이고 입력칸은 지금 차례인 한 줄에만');
  h = html({ voyage: voy({ records: { [wei[0].cn]: { eseal: '036601' } } }), voyageKey: 'k', inspector: 'T', card: { main: wei[0], twin: wei[1] }, mode: 'loading', voiceOn: true }); ok(new RegExp(`${wei[1].l4}[\\s\\S]*<input`).test(h) && /✅ 036601/.test(h), '트윈 앞 컨에 실이 있으면 입력칸은 뒤 컨으로 넘어간다');
  h = html({ voyage: voy(), voyageKey: 'k', inspector: 'T', card: { main: wei[0], twin: dlc[0] }, mode: 'loading', voiceOn: true }); ok(!h.includes(dlc[0].l4), '트윈에 다롄행이 섞여도 그 컨은 안 그린다');
  console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과'); process.exit(fail ? 1 : 0);
}).catch((e) => { console.error(e.message); process.exit(1); });
