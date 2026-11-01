// 사진 보고 사진 읽기 막힘 수리(4.62-02) — kakaoShare.normalizeReportPhoto 가 읽는 길을 차례로 넓히고 마지막엔 원본을 쥐는지 확인하는 연막검사
const path = require('path');
const out = path.join(require('os').tmpdir(), 'photonorm46202_k.cjs');
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'kakaoShare.js')], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent' });
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (cb) => cb(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' })) });
global.document = { createElement: mkCanvas };
global.URL.createObjectURL = () => 'blob:x'; global.URL.revokeObjectURL = () => {};
const bmpOf = (w, h) => ({ width: w, height: h, close() {} });
const setEnv = ({ bmpFull, bmpResize, img }) => {
  global.window = { createImageBitmap: async (f, opt) => { if (opt ? bmpResize : bmpFull) return bmpOf(opt ? 1600 : 8160, opt ? 1200 : 6120); throw Object.assign(new Error('x'), { name: 'InvalidStateError' }); } };
  global.Image = class { set src(v) { setTimeout(() => (img ? (this.naturalWidth = 4000, this.naturalHeight = 3000, this.onload && this.onload()) : (this.onerror && this.onerror())), 0); } };
};
const K = require(out);
const file = (type, size) => new File([new Uint8Array(size)], 'a', { type });
//  진짜 JPEG 머리(SOI · APP0 · SOF0 6120x8160)만 갖춘 파일 — 디코딩은 안 해도 «사진 머리»로 읽힌다
const jpegFile = (size, type = 'image/jpeg') => { const u = new Uint8Array(size); u.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 0); u.set([0xff, 0xc0, 0x00, 0x11, 0x08, 0x17, 0xe8, 0x1f, 0xe8, 0x03], 20); return new File([u], 'a.jpg', { type }); };
(async () => {
  setEnv({ bmpFull: true, bmpResize: true, img: true });
  let r = await K.normalizeReportPhoto(file('image/jpeg', 5e6));
  ok(r.type === 'image/jpeg' && r.size === 1000, '정상 — 줄인 JPEG');
  setEnv({ bmpFull: false, bmpResize: true, img: false });
  r = await K.normalizeReportPhoto(file('image/jpeg', 5e6));
  ok(r.size === 1000, '원본 통째로는 못 풀어도 풀 때 줄이면 읽는다(5천만 화소 원본)');
  setEnv({ bmpFull: false, bmpResize: false, img: true });
  r = await K.normalizeReportPhoto(file('image/jpeg', 5e6));
  ok(r.size === 1000, '비트맵이 다 막혀도 <img> 로 읽는다');
  setEnv({ bmpFull: false, bmpResize: false, img: false });
  const big = jpegFile(5e6);
  r = await K.normalizeReportPhoto(big);
  ok(r.size === big.size && r.type === 'image/jpeg', '다 막혀도 JPEG 10MB 이하면 원본을 쥐어 보고가 막히지 않는다');
  r = await K.normalizeReportPhoto(jpegFile(3e6, 'image/heic'));
  ok(r.type === 'image/jpeg' && /\.jpg$/.test(r.name), '형식 글자가 heic 로 와도 머리가 JPEG 면 JPEG 로 바로잡는다');
  let err = null; try { await K.normalizeReportPhoto(file('image/heic', 3e6)); } catch (e) { err = e; }
  ok(err && /image\/heic/.test(err.message) && /①/.test(err.message) && /③/.test(err.message), '못 그리는 형식은 어느 길에서 막혔는지 적어 던진다: ' + (err && err.message));
  err = null; try { await K.normalizeReportPhoto(jpegFile(12e6)); } catch (e) { err = e; }
  ok(!!err, '10MB 넘는 원본은 그냥 쥐지 않는다');
  err = null; try { await K.normalizeReportPhoto(new File([new Uint8Array([1, 2, 3, 4])], 'c.jpg', { type: 'image/jpeg' })); } catch (e) { err = e; }
  ok(err && /읽지 못/.test(err.message), '깨진 파일(머리가 사진이 아님)은 원본으로 쥐지 않고 오류로 알린다');
  err = null; try { await K.normalizeReportPhoto(file('image/jpeg', 5e6)); } catch (e) { err = e; }
  ok(!!err, '크기 칸이 없는 JPEG 글자만 단 파일도 오류로 알린다');
  process.exit(fail ? 1 : 0);
})();
