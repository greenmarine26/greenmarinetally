// 홈 화면 정리 연막검사 (3.54) — 검색창·부두 위치 카드가 홈에 되살아나지 않았는가, 옮긴 기능(부두 고르기 칩·좌표 등록·수석 버튼)이 제자리에 있는가
//   검수사 2026-09-21 «검색창을 없애고 미르로 대체 합니다. 수집기표시는 수석대쉬보드 표기를 절반으로 같이 사용합니다. 두번째 사진은 기능은 유지하고 화면은 삭제 합니다.»
//   node tools/smoke_home354.cjs <저장소 루트>
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || process.cwd();
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let n = 0, bad = 0;
const T = (ok, name, detail = '') => { n += 1; if (ok) console.log('  ✔ ' + name); else { bad += 1; console.log('  ✘ ' + name + (detail ? ' — ' + detail : '')); } };

const H = strip(rd('src/pages/HomePage.jsx'));
T(!/통합검색 · 미르에게 질문|homeQ|onOpenGlobalSearch/.test(H), '홈에 검색창이 없다(질문은 미르가 받는다)');
T(!/여기를 PCTC로 등록|여기를 PNCT로 등록|현재 좌표|다시 측정|평택항 외부/.test(H), '홈에 부두 위치 카드가 없다');
T(/measureGps\(false\)/.test(H) && /detectPierByGps\(/.test(H), 'GPS 자동 판별은 뒤에서 그대로 돈다');
T(/const effectivePier = pierFilter === 'auto' \? currentPier\?\.code/.test(H), '자동 고르기가 잡힌 부두로 목록을 거른다');
T(/setPierFilter\(b\.id\)/.test(H) && /자동·\$\{currentPier\.code\}/.test(H), '부두 고르기 칩이 있고 자동이 잡은 부두를 적는다');
T(/자동·외부/.test(H) && /자동·위치꺼짐/.test(H) && /pierFilter === 'auto'\) measureGps\(true\)/.test(H), '부두 밖·위치 꺼짐을 칩이 말하고, 자동을 한 번 더 누르면 다시 잰다');
{
  const i = H.indexOf('onOpenAux && onOpenAux()'), j = H.indexOf('onClick={onOpenChiefDashboard}', i), k = H.indexOf('진행 중인 항차');
  T(i > 0 && j > i && j < k, '수석 대시보드 버튼이 수집기 줄 바로 옆(진행 줄 위)에 있다', `aux=${i} chief=${j} 진행=${k}`);
  T(/\{_chiefBtn && <button onClick=\{onOpenChiefDashboard\}/.test(H) && /const _chiefBtn = canOpenChief\(/.test(H), '수석 버튼은 들어갈 수 있는 사람에게만 보인다');
  T((H.match(/onClick=\{onOpenChiefDashboard\}/g) || []).length === 2, '수석 대시보드 입구는 둘(이 버튼 · 소유자 오답 줄) — 진행 줄의 옛 버튼은 없다', String((H.match(/onClick=\{onOpenChiefDashboard\}/g) || []).length));
}
const C = strip(rd('src/pages/ChiefDashboard.jsx'));
T(/\['__pier', '📍 부두 좌표 등록'\]/.test(C) && /id === '__pier' \? setShowPier\(true\)/.test(C) && /\{showPier && <PierRegisterModal /.test(C), '수석 대시보드에 부두 좌표 등록 입구와 모달이 있다');
const P = rd('src/components/PierRegisterModal.jsx');
T(/savePierCoord\(code, coord\.lat, coord\.lng/.test(P) && /fbSavePierCoord\(code, saved\)/.test(P) && /confirm\(/.test(P), '모달이 확인을 받고 기기·보관소 두 곳에 좌표를 저장한다');
{
  const A = strip(rd('src/App.jsx')); const i = A.indexOf('<HomePage'); const blk = i >= 0 ? A.slice(i, A.indexOf('/>', i)) : 'onOpenGlobalSearch';
  T(i >= 0 && !/onOpenGlobalSearch/.test(blk), 'App 이 홈에 검색 진입 prop 을 넘기지 않는다');
}
const M = rd('src/data/helpData.js');
T(/「진행 N건」 줄의 \[자동\] \[PCTC\] \[PNCT\] \[전체\] 칩/.test(M) && !/홈 화면 맨 위 검색창 — 질문을 치고/.test(M), '매뉴얼이 새 화면을 말한다');
T(/부두 좌표 등록/.test(rd('src/data/helpDataChief.js')), '수석 매뉴얼 바로가기에 부두 좌표 등록이 있다');

console.log(`\n홈 화면 정리 연막검사 — ${n}항 중 실패 ${bad}`);
process.exit(bad ? 1 : 0);
