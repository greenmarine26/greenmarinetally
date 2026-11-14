// ConeOne 3.00-03 연막검사 — 콘앱 아래 줄 오른쪽 끝 «🐱 미르» 단추(검수사 2026-11-14 «콘앱에 미르를 부를곳이 없습니다» · «이곳 오른쪽 끝부분이 좋을듯합니다»)
//   실행 — node tools/smoke_conemir30003.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (m, c) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
console.log('ConeOne 3.00-03 — 미르 단추');
const cone = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
ok('판 ConeOne 3.00-03 이상', /window\.__CONEV='ConeOne 3\.00-(0[3-9]|[1-9]\d)'/.test(cone));
ok('미르 단추(#mirCall)가 bindMirFab 안에서 만들어지고 중복으로 안 만든다', /getElementById\('mirCall'\)/.test(cone) && /if\(!mc\)\{/.test(cone));
const st = (cone.match(/mc\.setAttribute\('style','([^']*)'\)/) || [])[1] || '';
ok('오른쪽 끝(right:10px) · 아래 줄 높이(bottom:10px) · 불편신고 줄과 같은 층(z-index:9999)', /right:10px/.test(st) && /bottom:10px/.test(st) && /z-index:9999/.test(st));
ok('누르면 시트를 열고(fab.onclick) 바깥 막(back)과 20초 닫힘 시계(_idleStart)를 건다', /mc\.onclick=\(\)=>\{ if\(sheet\.style\.display!=='block'\) fab\.onclick\(\); back\.style\.display='block'; _idleStart\(\); \};/.test(cone));
ok('떠 있는 얼굴(fab)은 그대로 숨김(2.79) — 단추만 추가', /fab\.style\.display='none';/.test(cone));
ok('TOP 단추는 새 단추 왼쪽으로(right:92px) — 포개지지 않는다', /\.bv-top\{position:fixed; right:92px;/.test(cone));
const hd = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
ok('매뉴얼(helpData)에 콘앱 미르 단추 안내', /ConeOne 3\.00-03 — \*\*콘앱 아래 줄 오른쪽 끝에 「🐱 미르」/.test(hd));
const fi = fs.readFileSync(path.join(ROOT, 'src/data/featureIndex.js'), 'utf8');
ok('기능 색인에 «콘앱 미르 부르기»', /🐱 콘앱 미르 부르기/.test(fi));
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
