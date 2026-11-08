// 4.80 핀치 안정화 연막검사 — 공용 한 벌(src/usePinchZoom.js)의 계산·이벤트 처리를 jsdom 에서 실제 touch 이벤트로 시험하고, 적용 화면 네 곳이 그 한 벌을 쓰는지(옛 passive 처리가 남지 않았는지) 소스 배선으로 본다.
//   실행 — node tools/smoke_fix480_pinch.cjs [저장소 루트]. 실패하면 빌드를 세운다. 목업 없음: 훅은 실소스 번들, 화면은 실소스 파일 내용.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`); } };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx480p_'));
  //  ── 소스 배선 ──
  const files = { 'BayViewWork(베이뷰 베이 그림 칸)': 'src/components/BayViewWork.jsx', 'BayPlan(베이플랜 탭)': 'src/components/BayPlan.jsx', 'PrintableBayDetail(베이 상세)': 'src/components/PrintableBayDetail.jsx', 'PrintableCargoPlanV2(카고플랜·콘앱)': 'src/components/PrintableCargoPlanV2.jsx' };
  for (const [name, f] of Object.entries(files)) {
    const s = read(f);
    ok(`배선 ${name} — usePinchZoom 한 벌을 쓴다`, /import \{ usePinchZoom \} from '\.\.\/usePinchZoom\.js'/.test(s) && /usePinchZoom\(/.test(s));
    ok(`배선 ${name} — 옛 개별 핀치(pinchStartDist · pinchRef · React onTouchMove)가 없다`, !/pinchStartDist|pinchRef\b|onTouchMove=|const onTouchMove/.test(s));
  }
  const hook = read('src/usePinchZoom.js');
  ok('훅 — touchmove 는 비 passive({ passive: false })로 걸어 preventDefault 가 먹는다', /addEventListener\('touchmove', onMove, \{ passive: false \}\)/.test(hook));
  ok('훅 — touch-action: pan-x pan-y 로 브라우저 페이지 핀치 확대를 막는다', /touchAction = 'pan-x pan-y'/.test(hook));
  ok('훅 — 시작 거리 0 이면 핀치가 아니다(무한 비율 300% 고정 방지)', /st\.active = d > 0/.test(hook));
  ok('베이뷰 아래 칸(bottomRef) 배율 범위는 아래 −/＋ 단추와 같은 0.7~2.2', /usePinchZoom\(bottomRef, \(\) => zoomNow\.current, setZoom, \{ min: 0\.7, max: 2\.2 \}\)/.test(read('src/components/BayViewWork.jsx')) && /Math\.max\(0\.7,/.test(read('src/components/BayViewWork.jsx')) && /Math\.min\(2\.2,/.test(read('src/components/BayViewWork.jsx')));

  //  ── 훅 실행 ──
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const ent = path.join(TMP, 'p.jsx'), out = path.join(TMP, 'p.js');
  fs.writeFileSync(ent, [
    `import React, { useRef, useState } from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import { usePinchZoom, pinchNext, PINCH_DEAD_PX, PINCH_EXP, PINCH_STEP } from "${ROOT}/tools/smoke_fix480_pinch_entry.js";`,
    `function Box() { const ref = useRef(null); const [z, setZ] = useState(1); const [on, setOn] = useState(true); const zr = useRef(z); zr.current = z; usePinchZoom(ref, () => zr.current, setZ, { min: 0.7, max: 2.2 });`,
    `  window.__setOn = setOn; return React.createElement('div', null, on ? React.createElement('div', { id: 'pz', ref, 'data-z': z }) : React.createElement('span', { id: 'off' }, 'off')); }`,
    `window.__pinchNext = pinchNext; window.__K = { PINCH_DEAD_PX, PINCH_EXP, PINCH_STEP };`,
    `window.__mount = () => createRoot(document.getElementById('root')).render(React.createElement(Box));`,
  ].join('\n'));
  execSync(`npx esbuild "${ent}" --bundle --loader:.jsx=jsx --loader:.js=jsx --jsx=automatic --outfile="${out}" --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const W = dom.window;
  W.eval(fs.readFileSync(out, 'utf8')); W.__mount();
  await sleep(150);
  const el = () => W.document.getElementById('pz');
  const z = () => parseFloat(el().getAttribute('data-z'));
  const touchEv = (type, pts, cancelable = true) => { const e = new W.Event(type, { bubbles: true, cancelable }); e.touches = pts.map(([x, y]) => ({ clientX: x, clientY: y })); el().dispatchEvent(e); return e; };
  ok('요소에 touch-action: pan-x pan-y 가 걸렸다', el().style.touchAction === 'pan-x pan-y', el().style.touchAction);

  const P = W.__pinchNext, K = W.__K;
  ok('계산 — 불감대 안(5px)에서는 배율 그대로', P(1, 100, 105, 1, 0.7, 2.2) === 1);
  ok('계산 — 시작 거리 0·거리 0 이면 직전 배율 그대로(Infinity·NaN 없음)', P(1, 0, 80, 1, 0.7, 2.2) === 1 && P(1, 100, 0, 1, 0.7, 2.2) === 1);
  const big = P(1, 100, 400, 1, 0.7, 2.2);
  ok(`계산 — 손가락 간격이 4배가 돼도 한 번 움직임은 +${K.PINCH_STEP * 100}% 까지(${big.toFixed(3)})`, Math.abs(big - 1.06) < 1e-9);
  const small = P(1, 100, 30, 1, 0.7, 2.2);
  ok(`계산 — 간격이 3분의 1로 줄어도 한 번 움직임은 -${K.PINCH_STEP * 100}% 까지(${small.toFixed(3)})`, Math.abs(small - 0.94) < 1e-9);
  ok('계산 — 상한·하한 클램프(2.2·0.7)', P(2.2, 100, 400, 2.2, 0.7, 2.2) === 2.2 && P(0.7, 100, 30, 0.7, 0.7, 2.2) === 0.7);
  ok(`계산 — 완만하게 따라간다: 간격 +10% → 배율 +${((Math.pow(1.1, K.PINCH_EXP) - 1) * 100).toFixed(1)}% (비율 그대로가 아니라 거듭제곱 ${K.PINCH_EXP})`, Math.abs(P(1, 100, 110, 1, 0.7, 2.2) - Math.pow(1.1, K.PINCH_EXP)) < 1e-9 && Math.pow(1.1, K.PINCH_EXP) < 1.1);

  //  실제 touch 이벤트 순서
  touchEv('touchstart', [[100, 200], [200, 200]]);
  const e1 = touchEv('touchmove', [[100, 200], [260, 200]]);   // 간격 100 → 160
  await sleep(40);
  ok(`핀치 벌림 — preventDefault 됨(페이지 확대 차단) · 한 번에 6% 이내로만 커짐(1 → ${z().toFixed(3)})`, e1.defaultPrevented && z() > 1 && z() <= 1.0601, `${e1.defaultPrevented} ${z()}`);
  const z1 = z();
  const e2 = touchEv('touchmove', [[100, 200], [262, 200]]);   // 불감대 안 미세 이동은 직전 배율 유지가 아니라 계속 따라가되 한 번 6% 상한
  await sleep(40);
  ok('핀치 계속 — 이어 움직여도 배율이 튀지 않는다(직전 대비 6% 이내)', z() >= z1 && z() <= z1 * 1.0601, `${z1} → ${z()}`);
  touchEv('touchend', [[100, 200]]);
  const zEnd = z();
  const e3 = touchEv('touchmove', [[100, 200], [400, 200]]);
  await sleep(40);
  ok('손가락을 떼면(한 손가락만 남으면) 핀치 끝 — 이후 움직임은 배율을 못 바꾼다', z() === zEnd && !e3.defaultPrevented, `${zEnd} → ${z()} ${e3.defaultPrevented}`);
  touchEv('touchstart', [[100, 200], [200, 200], [150, 300]]);
  touchEv('touchmove', [[100, 200], [300, 200], [150, 300]]);
  await sleep(40);
  ok('세 손가락은 핀치가 아니다(배율 그대로)', z() === zEnd, `${zEnd} → ${z()}`);
  touchEv('touchstart', [[100, 200], [100, 200]]);   // 거리 0 으로 시작
  touchEv('touchmove', [[100, 200], [300, 200]]);
  await sleep(40);
  ok('거리 0 으로 시작한 핀치는 무시(배율 그대로 — 종전엔 비가 무한대)', z() === zEnd, `${zEnd} → ${z()}`);
  //  줄이기 + 하한
  touchEv('touchstart', [[100, 200], [300, 200]]);
  for (let i = 0; i < 40; i++) touchEv('touchmove', [[100, 200], [100 + Math.max(1, 200 - i * 6), 200]]);
  await sleep(60);
  ok(`많이 모아도 하한 0.7 아래로 안 내려간다(${z().toFixed(3)})`, z() >= 0.7 - 1e-9 && z() < zEnd);
  //  요소가 사라졌다 다시 생기면 다시 건다(조건부 렌더 — 종전 BayPlan 은 [] 의존이라 한 번 놓치면 영영 못 걸었다)
  W.__setOn(false); await sleep(80);
  ok('요소가 사라져도 오류 없이 정리', !W.document.getElementById('pz'));
  W.__setOn(true); await sleep(120);
  const before = z();
  touchEv('touchstart', [[100, 200], [200, 200]]);
  touchEv('touchmove', [[100, 200], [260, 200]]);
  await sleep(60);
  ok('요소가 다시 생기면 핀치를 다시 건다', el().style.touchAction === 'pan-x pan-y' && z() >= before, `${before} → ${z()}`);

  try { W.close(); } catch (e) { /* 창 닫기 */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  console.log(`\n${bad ? '✗' : '✓'} 4.80 핀치 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 4.80 핀치 연막검사 예외', e && e.stack || e); process.exit(1); });
