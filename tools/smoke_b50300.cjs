// 5.03 연막검사 — 사진 모달 앨범/촬영 입력 분리 · 사진 JPEG 정리 적용 모달 · 콘앱/카고플랜 가로 맞춤 순수 계산을 소스 문자열과 순수 함수로 잰다.
//   node tools/smoke_b50300.cjs [저장소 루트]
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || process.cwd();
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fail = 0;
const ok = (c, m) => { if (c) console.log('✔ ' + m); else { console.log('✘ ' + m); fail++; } };

//  1) 촬영 전용 capture 입력과 앨범 단추 연결
const labelModals = ['PendingDamageModal', 'PhotoReportModal', 'EsealPhotoModal', 'SheetPhotoModal'];
for (const m of labelModals) {
  const src = rd(`src/components/${m}.jsx`);
  const blocks = src.match(/<label[\s\S]*?<\/label>/g) || [];
  const fileBlocks = blocks.filter((b) => /type="file"/.test(b));
  const album = fileBlocks.filter((b) => /앨범|갤러리/.test(b));
  const cam = fileBlocks.filter((b) => /촬영|찍기/.test(b));
  ok(album.length > 0 && album.every((b) => !/capture=/.test(b)), `${m}: 앨범 단추 ${album.length}개 모두 capture 없는 input`);
  ok(cam.length > 0 && cam.every((b) => /capture="environment"/.test(b)), `${m}: 촬영 단추 ${cam.length}개 모두 capture 있는 input`);
  ok(album.length === cam.length, `${m}: 촬영 ${cam.length} · 앨범 ${album.length} 짝이 맞다`);
}
for (const [m, camRe, albRe] of [['ISO403PhotoModal', /fileRef/, /albumRef/], ['ReeferMemoModal', /camRef/, /albumRef/]]) {
  const src = rd(`src/components/${m}.jsx`);
  const inputs = src.match(/<input[^>]*type="file"[^>]*>/g) || [];
  const albIn = inputs.filter((i) => /ref=\{albumRef\}/.test(i)); const camIn = inputs.filter((i) => camRe.test(i));
  ok(albIn.length > 0 && albIn.every((i) => !/capture=/.test(i)), `${m}: albumRef input ${albIn.length}개 capture 없음`);
  ok(camIn.length > 0 && camIn.every((i) => /capture="environment"/.test(i)), `${m}: 촬영 ref input ${camIn.length}개 capture 있음`);
  ok(/albumRef\.current\?\.click\(\)/.test(src) && /(camRef|fileRef)\.current\?\.click\(\)/.test(src), `${m}: 앨범 단추→albumRef · 촬영 단추→촬영 ref`);
  ok(!/albumRef\.current\?\.click\(\)[\s\S]{0,5}camRef/.test(src), `${m}: 단추 뒤바뀜 없음`);
}

//  2) normalizeReportPhoto 적용
const apply = { 'src/components/PendingDamageModal.jsx': 1, 'src/components/EsealPhotoModal.jsx': 1, 'src/components/ISO403PhotoModal.jsx': 1, 'src/components/ReeferMemoModal.jsx': 1, 'src/components/PhotoReportModal.jsx': 1, 'src/sheetPhoto.js': 1 };
for (const f of Object.keys(apply)) {
  const src = rd(f);
  ok(/import \{[^}]*normalizeReportPhoto[^}]*\} from '\.\.?\/?(\.\/)?kakaoShare\.js'/.test(src) && /await normalizeReportPhoto\(/.test(src), `${f}: normalizeReportPhoto 가져와 쓴다`);
}
ok(/async function _toJpegBase64[\s\S]{0,200}normalizeReportPhoto\(file0/.test(rd('src/sheetPhoto.js')), 'sheetPhoto._toJpegBase64 첫 줄에서 정리한다');
ok(/export async function normalizeReportPhoto/.test(rd('src/kakaoShare.js')), 'kakaoShare.normalizeReportPhoto 내보냄');
ok(/alert\('⚠️ 이 사진을 읽지 못했습니다/.test(rd('src/components/PendingDamageModal.jsx')), 'PendingDamage: 변환 실패를 알린다');
ok(/setError\('사진 처리 실패/.test(rd('src/components/ISO403PhotoModal.jsx')), 'ISO403: 변환 실패를 알린다');
ok(/catch \(ex\) \{ setErr\(/.test(rd('src/components/EsealPhotoModal.jsx')) && /catch \(ex\) \{ setErr\(/.test(rd('src/components/SheetPhotoModal.jsx')), 'Eseal·Sheet: 변환 실패를 화면 글로 알린다');

//  3) 맞춤 순수 계산 (소스에서 함수만 떼어 돌린다)
const cp = rd('src/components/PrintableCargoPlanV2.jsx');
const m1 = cp.match(/export function cpv2ViewSize[\s\S]*?\n\}\n/); const m2 = cp.match(/export function cpv2FitScale[\s\S]*?\n\}\n/);
ok(!!m1 && !!m2, 'cpv2ViewSize·cpv2FitScale 소스에 있다');
if (m1 && m2) {
  const f = new Function(`${m1[0].replace('export ', '')}\n${m2[0].replace('export ', '')}\nreturn { cpv2ViewSize, cpv2FitScale };`)();
  const W = 1200, H = 737, BAR = 44;
  for (const [vw, vh] of [[360, 740], [390, 844], [430, 932], [1280, 800], [844, 390], [1920, 1080]]) {
    const view = f.cpv2ViewSize({ innerWidth: vw, innerHeight: vh, visualViewport: { width: vw, height: vh, scale: 1 } });
    const r = f.cpv2FitScale(W, H, view, BAR);
    const drawnW = (r.rot ? H : W) * r.fit, drawnH = (r.rot ? W : H) * r.fit;
    const clamped = r.fit <= 0.15 + 1e-9;
    ok(r.fit <= 1 && (clamped || (drawnW <= vw - 16 + 0.5 && drawnH <= vh - BAR - 12 + 0.5)), `폭 ${vw}x${vh}: 배율 ${r.fit} ${r.rot ? '(세로→90도 회전)' : ''} 도면 ${Math.round(drawnW)}x${Math.round(drawnH)} 가 화면 안`);
  }
  const vz = f.cpv2ViewSize({ innerWidth: 390, innerHeight: 844, visualViewport: { width: 195, height: 422, scale: 2 } });
  ok(vz.w === 390 && vz.h === 844, '브라우저 핀치 배율은 되돌려 레이아웃 크기로 잰다');
  ok(f.cpv2FitScale(W, H, { w: 390, h: 844 }, BAR).rot === true && f.cpv2FitScale(W, H, { w: 844, h: 390 }, BAR).rot === false, '폰 세로만 회전(2.11-01 유지)');
}
ok(/ResizeObserver/.test(cp) && /visualViewport/.test(cp) && /orientationchange/.test(cp) && /\[planReady\]/.test(cp), 'PrintableCargoPlanV2: ResizeObserver·visualViewport·orientationchange·준비 의존성');
const cone = rd('public/cone.html');
ok(/window\.__bvRefit/.test(cone) && /visualViewport/.test(cone) && /orientationchange/.test(cone) && /userZoomed/.test(cone), 'cone.html: 베이플랜 resize·orientationchange 다시 맞춤(손 조절 보존)');
console.log(fail ? `\n✘ ${fail}건 실패` : '\n✔ 전부 통과');
process.exit(fail ? 1 : 0);
