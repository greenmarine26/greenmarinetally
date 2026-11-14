// TallyOne 5.02-04 연막검사 — 수석 상황판 별첨3·4 모션 그림(검수사 2026-11-14 «안바뀐 부분이 있네여»)
//   실행 — node tools/smoke_legend50204.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (m, c) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
console.log('TallyOne 5.02-04 — 별첨3·4 그림');
const lm = fs.readFileSync(path.join(ROOT, 'src/components/LegendMotion.jsx'), 'utf8');
const cd = fs.readFileSync(path.join(ROOT, 'src/pages/ChiefDashboard.jsx'), 'utf8');
ok('LegendFE 를 내보낸다', /export function LegendFE\(/.test(lm));
ok('LegendFE 는 xp-bar 부품과 mo-grow 를 쓴다(별첨1·2와 같은 부품)', /className="xp-bar xp-sm/.test(lm) && /mo-grow/.test(lm));
ok('안 끝난 규격만 펼치고 끝난 규격은 ✓ 칩(data-legend-done)', /data-legend-open=/.test(lm) && /data-legend-done=/.test(lm));
ok('엠티 줄(data-legend-emptyline)이 그림 아래에 붙는다', /data-legend-emptyline/.test(lm));
ok('ChiefDashboard 가 LegendFE 를 부르고 L.fe · emptySplitLabel 을 그대로 넘긴다', /<LegendFE [^>]*fe=\{L\.fe\}/.test(cd) && /emptySplitLabel\(L\.fe\['20'\]\.E\.n \+ L\.fe\['40'\]\.E\.n \+ L\.fe\['45'\]\.E\.n, L\.emptyRf\.n\)/.test(cd));
ok('별첨4(선적 전용)는 LegendRows 로 L.pods 를 그린다', /m === 'loading' && L\.pods\.length > 0 && <LegendRows title=\{`별첨4/.test(cd));
ok('옛 표 넷이 «표로 보기 (별첨1~4)» 안에 남는다(숫자 같은 L 한 벌)', /표로 보기 \(별첨1~4\)/.test(cd) && /feRows\.map/.test(cd) && /mk\(`별첨4/.test(cd));
const ut = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
ok('판 TallyOne 5.02-04 이상', /APP_VERSION = 'TallyOne 5\.02-(0[4-9]|[1-9]\d)'/.test(ut) || /APP_VERSION = 'TallyOne 5\.(0[3-9]|[1-9]\d)/.test(ut));
const hd = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
ok('매뉴얼(helpData)에 5.02-04 안내', /5\.02-04 — \*\*수석 상황판 별첨3/.test(hd));
const fi = fs.readFileSync(path.join(ROOT, 'src/data/featureIndex.js'), 'utf8');
ok('기능 색인에 «상황판 별첨3·4 그림»', /상황판 별첨3·4 그림/.test(fi));
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
