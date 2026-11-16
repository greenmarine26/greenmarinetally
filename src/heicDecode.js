// 5.04 — HEIC(폰 카메라 고효율 사진)을 앱 안에서 JPEG 로 푸는 길. 컴퓨터 크롬은 HEIC 를 못 풀어 «이 사진을 읽지 못했습니다» 로 막혔다(검수사 2026-11-16 «앱이 스스로 처리해야 합니다»).
//   libheif-js(wasm 내장판)를 이 파일이 처음 불릴 때만 내려받는다(별도 조각 — 평소 화면은 그대로 빠르다). 풀지 못하면 던진다(조용히 넘기지 않는다).
export async function heicToJpegFile(file, maxSide = 1600) {
  const mod = await import('libheif-js/wasm-bundle');
  const libheif = mod.default || mod;
  const lib = libheif.ready ? await libheif.ready : libheif;
  const dec = new lib.HeifDecoder();
  const imgs = dec.decode(new Uint8Array(await file.arrayBuffer()));
  if (!imgs || !imgs.length) throw new Error('HEIC 안에 사진이 없습니다');
  const im = imgs[0];
  const w = im.get_width(); const h = im.get_height();
  if (!w || !h) throw new Error('HEIC 크기를 알 수 없습니다');
  const rgba = new Uint8ClampedArray(w * h * 4);
  await new Promise((res, rej) => { im.display({ data: rgba, width: w, height: h }, (r) => (r ? res() : rej(new Error('HEIC 해독 실패')))); });
  const full = document.createElement('canvas'); full.width = w; full.height = h;
  const fctx = full.getContext('2d');
  if (!fctx) throw new Error('canvas 를 열지 못했습니다');
  fctx.putImageData(new ImageData(rgba, w, h), 0, 0);
  const ratio = Math.max(w, h) > maxSide ? maxSide / Math.max(w, h) : 1;
  const cw = Math.max(1, Math.round(w * ratio)); const ch = Math.max(1, Math.round(h * ratio));
  const out = document.createElement('canvas'); out.width = cw; out.height = ch;
  const octx = out.getContext('2d');
  octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, cw, ch);
  octx.drawImage(full, 0, 0, cw, ch);
  full.width = 1; full.height = 1;   // 큰 그림 메모리를 바로 돌려준다
  const blob = await new Promise((res) => out.toBlob(res, 'image/jpeg', 0.9));
  if (!blob || !blob.size) throw new Error('JPEG 변환 실패');
  return new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
