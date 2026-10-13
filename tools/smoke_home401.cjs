// 4.01 홈 «자료 대기» 연막검사 — 자료 없는 배는 목록에서 빼 맨 아래 한 줄에 접고, 접어도 언마운트하지 않는지 소스 배선으로 잰다 (TallyOne 4.01).
//
//  왜 있는가 — 검수사 2026-10-04 «자료 없음 선박까지 보여줄 필요는 없다고 생각합니다. 자료가 들어 오면 그때 보여주는게 나을듯 합니다.»
//  ⚠ 이 검사는 «글자와 배선»만 본다 — 카드가 실제로 그려지는지는 smoke_render 가 잰다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

console.log('4.01 홈 — 자료 대기 접기');
const H = rd('src/pages/HomePage.jsx');
const css = rd('src/index.css');

ok(/const _isWaitData = \(v\) => !v\._hasData && !v\.info\?\.forecast;/.test(H), '자료 대기 판정은 카드 문구와 같은 _hasData + 카톡 물량 예보(info.forecast)');
ok(/const list = useMemo\(\(\) => _pierFirst\(voyagesWithPier\.filter\(v => !_isWaitData\(v\)\)\)/.test(H), '위 목록은 자료 있는 배만');
ok(/const waitList = useMemo\(\(\) => _pierFirst\(voyagesWithPier\.filter\(_isWaitData\)\)/.test(H), '자료 없는 배는 waitList 로 따로 모인다(지워지지 않는다)');
ok(/list\.length === 0 && waitList\.length === 0/.test(H), '빈 화면 안내는 두 목록이 다 비었을 때만');
//  4.25 — 자료 대기 줄은 목록 끝(폰) · 목록 칸 맨 아래(컴)의 접힘 단추(waitBar) 하나, 펼치는 내용은 목록 몸통 안 한 곳(data-home-wait).
const bar = H.indexOf("const waitBar = waitList.length > 0 ? foldBar('wait'");
const barSeg = bar > 0 ? H.slice(bar, H.indexOf('\n', bar)) : '';
ok(bar > 0 && /자료 대기 \$\{waitList\.length\}척/.test(barSeg) && /waitOpen/.test(barSeg) && /aria-expanded=\{open\}/.test(H.slice(H.indexOf('const foldBar = '), H.indexOf('const waitBar'))), '«⏳ 자료 대기 N척» 한 줄(펼침 상태 표시 — 접힘 단추 한 벌 foldBar)');
const at = H.indexOf('{waitList.length > 0 && (\n');
const seg = at > 0 ? H.slice(at, at + 900) : '';
ok(at > 0 && /className=\{waitOpen \? [^}]*: 'hidden'\}/.test(seg) && /data-home-wait="1"/.test(seg), '접어도 언마운트하지 않는다(hidden) — 출항 표시 sticky 기록 보호');
ok(/\{waitList\.map\(rowOf\)\}/.test(seg) && /const rowOf = \(v\) => \(\s*<ShipRow /.test(H) && /useEffect\(\(\) => \{\s*if \(!_isDepart \|\| voyage\.info\?\.departBadgeAt\) return;/.test(H.slice(H.indexOf('export function ShipRow('), H.indexOf('export function ShipOpenButtons'))), '펼치면 다른 묶음과 같은 배 줄(ShipRow — 출항 sticky 기록을 줄이 한다)');
ok((H.match(/onDelete=\{_viewOnly \? null :/g) || []).length === 1 && (H.match(/onComplete=\{_viewOnly \? null :/g) || []).length === 1 && /const detailOf = /.test(H), '조회만이면 삭제·완료 단추 없음(자료 대기 배도 같은 상세 한 벌로)');
ok(/const \[waitOpen, setWaitOpen\] = useState\(false\)/.test(H), '기본은 접힘');
ok(/\.fold-bar\b/.test(css), '접는 줄 모양(.fold-bar)이 CSS 에 있다');

console.log(`\n${fail ? '✗' : '✓'} 4.01 홈 자료 대기 연막검사 — 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
