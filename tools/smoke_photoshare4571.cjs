// 앨범에서 고른 사진이 카톡 보고에서 빠지지 않는지 보는 4.57-01 연막검사 — 사진 JPEG 정리 · 공유 거절 때 부분 공유 · 빠지면 경고
//   검수사 2026-10-30 «카메라로 직접 촬영한것은 사진과 함께 내용이 보고가 되는데 사진 첨부는 내용만 보고가 되어서 따로 사진을 카톡에 다시 올려야 합니다»
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMPD = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'smokeps-'));
const OUT = path.join(TMPD, 'b.js');
let n = 0; let bad = 0;
const check = (name, cond, extra) => { n += 1; if (cond) console.log('  ✓ ' + name); else { bad += 1; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); } };
const done = () => { console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n앨범 사진 카톡 공유 4.57-01 — ${n}/${n} 통과`); fs.rmSync(TMPD, { recursive: true, force: true }); process.exit(bad ? 1 : 0); };
try {
  execSync(`npx esbuild ${JSON.stringify(path.join(ROOT, 'src/kakaoShare.js'))} --bundle --platform=browser --format=iife --global-name=KS --outfile=${JSON.stringify(OUT)} --log-level=error`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('✗ 번들 실패'); process.exit(1); }
(async () => {
  const { chromium } = require('playwright');
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.setContent('<html><body></body></html>');
  await pg.addScriptTag({ content: fs.readFileSync(OUT, 'utf8') });
  const R = await pg.evaluate(async () => {
    const out = {};
    // 시험용 사진 — 4000x3000 PNG(형식 글자 없음) · 작은 JPEG(형식 image/heic 로 속임) · 깨진 파일
    const mk = async (w, h, type) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#c00'; x.fillRect(0, 0, w, h); return await new Promise((r) => c.toBlob(r, type)); };
    const bigPng = new File([await mk(4000, 3000, 'image/png')], 'a.png', { type: '' });
    const fakeHeic = new File([await mk(800, 600, 'image/jpeg')], 'b.heic', { type: 'image/heic' });
    const broken = new File([new Uint8Array([1, 2, 3, 4])], 'c.jpg', { type: 'image/jpeg' });
    const n1 = await KS.normalizeReportPhoto(bigPng);
    const bm1 = await createImageBitmap(n1);
    // 투명 PNG 의 모서리는 흰색이고 결과 파일은 진짜 JPEG(FFD8)여야 한다
    const tc = document.createElement('canvas'); tc.width = 50; tc.height = 50; const tblob = await new Promise((r) => tc.toBlob(r, 'image/png'));
    const tn = await KS.normalizeReportPhoto(new File([tblob], 't.png', { type: 'image/png' }));
    const tb = await createImageBitmap(tn); const pc = document.createElement('canvas'); pc.width = 50; pc.height = 50; const px = pc.getContext('2d'); px.drawImage(tb, 0, 0);
    const head = new Uint8Array(await tn.slice(0, 2).arrayBuffer());
    out.transparent = { corner: Array.from(px.getImageData(1, 1, 1, 1).data).slice(0, 3), magic: [head[0], head[1]] };
    out.big = { type: n1.type, name: n1.name, w: bm1.width, h: bm1.height, size: n1.size };
    const n2 = await KS.normalizeReportPhoto(fakeHeic);
    out.heic = { type: n2.type, size: n2.size };
    try { await KS.normalizeReportPhoto(broken); out.broken = 'no-error'; } catch (e) { out.broken = String(e.message || e); }
    // 공유 시험 — navigator.share / canShare 를 바꿔 끼운다
    const alerts = []; const ev = []; window.alert = (m) => { alerts.push(String(m)); ev.push('alert'); };
    const shared = [];
    const setShare = (canFn) => { Object.defineProperty(navigator, 'canShare', { value: canFn, configurable: true }); Object.defineProperty(navigator, 'share', { value: async (d) => { ev.push('share'); if (window.__shareErr) { const er = new Error('x'); er.name = window.__shareErr; throw er; } shared.push({ files: (d.files || []).map((f) => f.name), text: d.text || null }); }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); };
    const jpg = (nm) => new File([new Uint8Array([255, 216, 255, 224, 0, 16, 0, 0])], nm, { type: 'image/jpeg' });
    const p1 = await mk(300, 200, 'image/jpeg'); const p2 = await mk(300, 200, 'image/jpeg');
    // (a) 전부 허용 — 사진 2장이 파일로 나가고 경고가 없다
    setShare(() => true); shared.length = 0; alerts.length = 0;
    const ra = await KS.shareWithPhoto('데미지\n컨 TEST1234567', [p1, p2], '데미지');
    out.a = { r: ra, shared: shared.slice(), alerts: alerts.slice() };
    // (b) 2장 묶음은 거절하고 한 장씩은 허용 — 되는 장만 나가고 경고가 뜬다
    setShare((d) => (d.files || []).length <= 1); shared.length = 0; alerts.length = 0; ev.length = 0;
    const rb = await KS.shareWithPhoto('데미지\n컨 TEST1234567', [p1, p2], '데미지');
    out.b = { r: rb, shared: shared.slice(), alerts: alerts.slice(), ev: ev.slice() };
    // (c) 파일 공유가 전부 거절 — 글만 나가되 «사진이 빠진다» 경고가 반드시 뜬다
    setShare(() => false); shared.length = 0; alerts.length = 0; ev.length = 0;
    const rc = await KS.shareWithPhoto('데미지\n컨 TEST1234567', [p1, p2], '데미지');
    out.c = { r: rc, shared: shared.slice(), alerts: alerts.slice(), ev: ev.slice() };
    // (d) 공유가 «시간 초과(NotAllowedError)» — 글만 다시 보내지 않고, 다시 누르라고 알린다(모달은 그대로)
    setShare(() => true); shared.length = 0; alerts.length = 0; ev.length = 0; window.__shareErr = 'NotAllowedError';
    const rd = await KS.shareWithPhoto('데미지\n컨 TEST1234567', [p1, p2], '데미지');
    out.d = { r: rd, shared: shared.slice(), alerts: alerts.slice(), ev: ev.slice() };
    // (e) 파일 공유가 그 밖의 오류 — 글만 나가되 «사진 공유에 실패» 경고가 반드시 뜬다
    shared.length = 0; alerts.length = 0; ev.length = 0; window.__shareErr = null;
    let first = true;
    Object.defineProperty(navigator, 'share', { value: async (d) => { ev.push('share'); if (first && d.files) { first = false; const er = new Error('x'); er.name = 'TypeError'; throw er; } shared.push({ files: (d.files || []).map((f) => f.name), text: d.text || null }); }, configurable: true });
    const re = await KS.shareWithPhoto('데미지\n컨 TEST1234567', [p1, p2], '데미지');
    out.e = { r: re, shared: shared.slice(), alerts: alerts.slice(), ev: ev.slice() };
    return out;
  });
  await br.close();
  check('4000x3000 사진은 JPEG 로 바뀌고 긴 변이 1600px 이하', R.big.type === 'image/jpeg' && Math.max(R.big.w, R.big.h) === 1600 && R.big.w / R.big.h > 1.3 && R.big.w / R.big.h < 1.37 && /\.jpg$/.test(R.big.name), JSON.stringify(R.big));
  check('형식 글자가 image/heic 로 와도(읽히는 사진이면) JPEG 로 바뀐다', R.heic.type === 'image/jpeg' && R.heic.size > 0, JSON.stringify(R.heic));
  check('깨진 사진은 그 자리에서 오류로 알린다(나중에 조용히 빠지지 않는다)', R.broken !== 'no-error' && /읽지 못/.test(R.broken), R.broken);
  check('(a) 파일 공유가 되면 사진 2장이 파일로 나가고 경고가 없다', R.a.r.method === 'share-with-file' && R.a.shared.length === 1 && R.a.shared[0].files.length === 2 && R.a.alerts.length === 0, JSON.stringify(R.a));
  check('(b) 묶음이 거절돼도 되는 장은 나가고 «N장 중 M장» 경고가 뜬다 — 경고는 공유가 끝난 뒤에', R.b.r.method === 'share-with-file' && R.b.alerts.some((a) => /2장 중 1장/.test(a)) && R.b.shared.length === 1 && R.b.shared[0].files.length === 1 && R.b.ev.join() === 'share,alert', JSON.stringify(R.b));
  check('(c) 파일 공유가 전부 거절되면 글만 나가되 «사진을 첨부하지 못해» 경고가 반드시 뜬다', R.c.r.method === 'share-text-only' && R.c.r.filesDropped === 2 && R.c.alerts.some((a) => /첨부하지 못/.test(a)) && R.c.shared.length === 1 && R.c.shared[0].text && R.c.ev.join() === 'share,alert', JSON.stringify(R.c));   // 경고는 share 뒤(손길 시간을 먼저 쓰지 않는다)
  check('(d) 공유 시간 초과(NotAllowedError)면 글만 다시 보내지 않고 «한 번 더 눌러» 안내 · 모달 유지 신호', R.d.r.cancelled === true && R.d.r.blocked === true && R.d.shared.length === 0 && R.d.ev.filter((x) => x === 'share').length === 1 && R.d.alerts.some((a) => /한 번 더/.test(a)), JSON.stringify(R.d));
  check('(e) 파일 공유가 그 밖의 오류면 글만 나가되 «사진 공유에 실패» 경고가 뜬다', R.e.r.filesDropped === 2 && R.e.alerts.some((a) => /사진 공유에 실패/.test(a)), JSON.stringify(R.e));
  check('투명 PNG 는 흰 바탕의 진짜 JPEG(FFD8)로 바뀐다', R.transparent.magic.join() === '255,216' && R.transparent.corner.every((v) => v >= 250), JSON.stringify(R.transparent));
  const modal = fs.readFileSync(path.join(ROOT, 'src/components/PhotoReportModal.jsx'), 'utf8');
  check('보고 모달은 카메라·앨범 두 입력 모두 normalizeReportPhoto 를 거친다', (modal.match(/onChange=\{handleCnPhoto\}/g) || []).length === 2 && (modal.match(/onChange=\{handleDetailPhoto\}/g) || []).length === 2 && /const handleCnPhoto = pickPhoto\(/.test(modal) && /const handleDetailPhoto = pickPhoto\(/.test(modal) && /await normalizeReportPhoto\(file\)/.test(modal) && /disabled=\{sending \|\| reading > 0\}/.test(modal) && /mine !== pickSeq\.current\[slot\]/.test(modal) && /result\?\.blocked/.test(modal));
  done();
})().catch((e) => { console.error('✗ 연막검사 예외', e); try { fs.rmSync(TMPD, { recursive: true, force: true }); } catch (x) { /* */ } process.exit(1); });
