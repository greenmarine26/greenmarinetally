// 3.60-06 연막검사 — 업데이트 배너·크래시 신고·AI 판독 안전장치·배포 직후 자산·빌드 스텁 되돌리기(전체 진단 M11·M29~M31·M34·M36·M39·M41·경)가 되살아나면 배포를 막는다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36006_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
global.window = global.window || { addEventListener() {}, location: { href: '' } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };

try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { parseSheetResponse, matchSheetItems } from "${ROOT}/src/sheetPhoto.js";\nexport { parseEsealResponse, matchEsealItems } from "${ROOT}/src/esealPhoto.js";\nexport { parseHash } from "${ROOT}/src/backHandler.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);

  console.log('■ AI 판독 — 잘린 응답은 잘렸다고 · 애매(sure:false)한 칸·줄은 자동으로 안 고른다');
  const cut = { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"items":[{"slot":"130304"' }] } }] };
  let t1 = ''; try { B.parseSheetResponse(cut); } catch (x) { t1 = String(x.message); }
  ok('기록지 판독이 한도에 잘리면 «잘렸어요» 로 멈춘다', /잘렸어요/.test(t1), t1);
  let t2 = ''; try { B.parseEsealResponse(cut); } catch (x) { t2 = String(x.message); }
  ok('엠티실 판독이 한도에 잘리면 «잘렸어요» 로 멈춘다', /잘렸어요/.test(t2), t2);
  const it = (sure) => ({ slot: '130304', bay: '13', row: '03', tier: '04', prefix: 'KMTU', digits: '7465013', printed: '', sure, kind: 'hand' });
  ok('기록지 — 칸 맞추기는 종전대로(두 번 읽기가 틀림을 거른다 — smoke_sheetphoto)', B.matchSheetItems([it(true)], ['KMTU7465013'])[0].cn === 'KMTU7465013');
  const es = (sure) => B.matchEsealItems([{ no: 1, cn: 'BMOU5407731', seal: '036654', sure }], ['BMOU5407731'], ['036654'], {})[0];
  ok('엠티실 — sure:false 줄은 자동 체크 안 함', es(false).ok === false, JSON.stringify(es(false)).slice(0, 120));
  ok('엠티실 — sure:true 줄은 종전대로 자동', es(true).ok === true, JSON.stringify(es(true)).slice(0, 120));
  const SPM = src('src/components/SheetPhotoModal.jsx'), EPM = src('src/components/EsealPhotoModal.jsx');
  ok('기록지 창 — 한 번만 읽혔으면 자동 체크 안 함', /use: items\.length >= 2 && !!r\.cn/.test(SPM));
  ok('엠티실 창 — 한 번만 읽혔으면 자동 체크 안 함', /use: runs\.length >= 2 && !!r\.ok/.test(EPM));
  ok('기록지 창 — 체크디짓 틀린 컨번호는 기록 안 함 · 후보 밖 컨은 먼저 묻는다', /!isoOk\(r\.pick\)/.test(SPM) && /선적 후보에 없는 컨/.test(SPM));

  console.log('■ 업데이트 배너 — 인스턴스가 쌓이지 않고 닫은 배너는 다시 안 뜬다');
  const UP = src('src/components/UpdatePrompt.jsx');
  ok('효과가 정리 함수를 돌려준다(interval·visibilitychange·controllerchange 해제)', /return \(\) => \{\s*alive = false;\s*if \(iv\) clearInterval\(iv\);\s*document\.removeEventListener\('visibilitychange', onVis\);[\s\S]*removeEventListener\('controllerchange', onCtrl\)/.test(UP));
  ok('등록이 늦게 끝나도 내려간 화면에는 안 건다', /if \(!alive\) return;/.test(UP));
  ok('X 로 닫은 워커는 다시 안 띄운다', /if \(dismissedRef\.current === sw\) return;/.test(UP) && /dismissedRef\.current = waiting; setHidden\(true\)/.test(UP));

  console.log('■ 크래시 신고 · 주소 · 작은 구멍');
  const EB = src('src/components/ErrorBoundary.jsx');
  ok('크래시 신고에 판 번호(APP_VERSION)를 싣는다 · 같은 오류는 탭당 한 번', /import \{ APP_VERSION \} from '\.\.\/utils\.js'/.test(EB) && /crashSent:/.test(EB));
  let h = null, t3 = ''; try { h = B.parseHash('#/voyage/KBTR_2609E%2'); } catch (x) { t3 = String(x.message); }
  ok('퍼센트가 잘린 주소도 던지지 않는다', !t3 && h && h.name === 'voyage', t3 || JSON.stringify(h));
  const VP = src('src/pages/VoyagePage.jsx');
  ok('luggageCns 는 배열일 때만 .map', !/\(voyage\?\.info\?\.forecast\?\.luggageCns \|\| \[\]\)/.test(VP));
  ok('PORT-MIS 부두 자동 저장은 같은 값을 한 번만(pmWriteRef)', (VP.match(/pmWriteRef\.current !==/g) || []).length === 3);
  ok('엠티실 구간 저장 실패를 «저장됨» 으로 넘기지 않는다', /if \(!\(await fbSetSimple\(`voyages\/\$\{voyageKey\}\/loading\/esealRanges`/.test(VP));

  console.log('■ 배포 직후 자산 · 빌드 스텁');
  const SW = src('public/sw.js');
  ok('sw.js — /assets/ 가 404 면 캐시를 먼저 본다', /!res\.ok && \/\\\/assets\\\/\/\.test\(e\.request\.url\)/.test(SW));
  ok('sw.js — 판 번호 확인 요청(?v=·?_ck=)은 캐시에 안 쌓는다', /\[\?&\]\(\?:v\|_ck\|u\)=/.test(SW));
  const BS = src('build.sh');
  ok('build.sh — 끊겨도 firebase.js 스텁을 되돌린다(trap) · 스텁이면 시작 전 중단', /trap '_restore_fb' EXIT; trap 'exit 130' INT TERM/.test(BS) && /initializeApp\(firebaseConfig\)" src\/firebase\.js/.test(BS));
  ok('build.sh — 직전 판(HEAD:index.html) 자산을 한 판 더 남긴다', /git','show','HEAD:index\.html'/.test(BS));
} catch (ex) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
}
console.log(`\n3.60-06 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
