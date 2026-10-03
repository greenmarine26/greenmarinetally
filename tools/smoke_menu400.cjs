// 4.00 메뉴 구조 연막검사 — 항차 화면 독(양하/선적·작업 시작·베이·출력·업로드·더보기)과 출력 단일 경로, 매뉴얼 옛 낱말 잔재를 소스에서 잰다 (TallyOne 4.00).
//
//  왜 있는가 — 검수사 2026-10-04 «업로드 기능은 EDI나 세관 리스트 선사리스트 를 넣기 위한곳인데 그안에 검수리스트 출력과
//  카고플랜 베이상세를 출력하는곳도 있습니다. 그리고 베이를 누르면 거기에도 있습니다. 이런걸 정리하여야 합니다.»
//  4.00 은 출력을 독의 «🖨️ 출력» 한 곳(출력 센터)으로 모으고 업로드 탭은 올리기만 남겼다.
//  이 구조가 다음 판에서 조용히 되돌아가지 않게(업로드 탭에 출력 카드가 다시 생기거나, 베이 탭에 둘째 인쇄 경로가
//  다시 생기거나, 매뉴얼이 옛 이름을 다시 말하지 않게) 소스 배선을 잰다.
//  ⚠ 이 검사는 «글자와 배선»만 본다 — 화면이 실제로 그려지는지는 smoke_printhub·smoke_render·smoke_bayplan 이 잰다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
// 글에서 주석을 걷어 낸 본문 — 주석에 남은 옛 낱말(설명용)은 잔재로 세지 않는다
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

console.log('4.00 메뉴 구조 — 독 · 출력 단일 경로 · 업로드 올리기 전용 · 매뉴얼 잔재');

const V = rd('src/pages/VoyagePage.jsx');
const BP = rd('src/components/BayPlan.jsx');
const PH = rd('src/components/PrintHubModal.jsx');

// ── 1. 독
const navAt = V.indexOf('<nav className="hud-dock');
const navEnd = V.indexOf('</nav>', navAt);
ok(navAt > 0 && navEnd > navAt, '항차 화면에 독(nav.hud-dock)이 있다');
const nav = navAt > 0 ? V.slice(navAt, navEnd) : '';
ok(/k: 'list'/.test(nav) && /k: 'search', t: '작업 시작'/.test(nav), '독 — 양하(선적) · 작업 시작 탭');
ok(/k: 'lolo'/.test(nav) && /k: 'bay'/.test(nav), '독 — 베이 탭(혼용선은 LOLO)');
ok(/hud-door/.test(nav) && /setShowPrintHub\(true\)/.test(nav) && />\s*<span[^>]*>🖨️<\/span>출력/.test(nav.replace(/\n\s*/g, ' ').replace(/<span className="hud-ico" aria-hidden="true">/g, '<span>')), '독 — 「🖨️ 출력」은 창을 여는 단추(출력 센터)');
ok(/setTab\('data'\)/.test(nav) && /📤<\/span>업로드/.test(nav), '독 — 「📤 업로드」 탭');
ok(/\['stats', 'report', 'xray'\]/.test(nav) && /더보기/.test(nav), '독 — 「➕ 더보기」에 통계·결과·X-RAY');
const moreAt = V.indexOf('{moreTabs && (', navEnd);
const moreEnd = moreAt > 0 ? V.indexOf('{showReefer &&', moreAt) : -1;
const more = moreAt > 0 ? code(V.slice(moreAt, moreEnd > moreAt ? moreEnd : moreAt + 900)) : '';
ok(/📊 통계/.test(more) && /📋 결과/.test(more) && /🔍 X-RAY/.test(more), '더보기 펼침 — 📊 통계 · 📋 결과 · 🔍 X-RAY');
ok(!/업로드/.test(more), '더보기 펼침에 업로드가 없다(업로드는 독에 따로)');
ok(/mode === 'discharge' \? \[\['xray'/.test(more), 'X-RAY 는 양하에서만');

// ── 2. 출력 센터는 한 곳
const phUse = V.match(/<PrintHubModal[\s\S]*?\/>/g) || [];
ok(phUse.length === 1 && /initialMode=\{mode\}/.test(phUse[0]), '출력 센터는 항차 화면에서 한 곳만 열리고 지금 모드(양하/선적)로 열린다');
ok(/initialMode = 'discharge'/.test(PH), '출력 센터가 initialMode 를 받는다');
ok(/onOpenPrint=\{\(\) => setShowPrintHub\(true\)\}/.test(V), '베이 탭에 같은 출력 센터를 여는 onOpenPrint 를 넘긴다');
ok(/onOpenPrint &&/.test(BP) && /🖨️ 출력/.test(BP), '베이 도구줄 「🖨️ 출력」 단추(onOpenPrint 가 있을 때만)');
ok(!/인쇄 ▾/.test(code(BP)), '베이 탭에 인쇄 드롭다운(둘째 경로)이 없다');
ok(!/카고 플랜 V2 · M6\.81/.test(code(BP)) && !/M6\.81 회귀/.test(code(PH)), '화면에 개발 표식(M6.81 회귀)이 없다');
ok(/검수 자료 출력/.test(PH) && /VGM 리스트/.test(PH) && /FINAL WORKING REPORT/.test(PH), '출력 센터 — 검수 리스트·카고플랜·베이 상세·VGM·작업 보고서');

// ── 3. 업로드 탭은 올리기 전용
const dtAt = V.indexOf('function DataTab(');
const dtEnd = dtAt > 0 ? V.indexOf('\nfunction ', dtAt + 20) : -1;
const dt = dtAt > 0 ? V.slice(dtAt, dtEnd > 0 ? dtEnd : undefined) : '';
ok(dt.length > 2000, '업로드 탭(DataTab) 본문을 찾았다');
ok(/📤 자료 올리기/.test(dt) && /quest-card/.test(dt), '업로드 탭 — 「📤 자료 올리기」 머리와 카드');
ok(/EDI 파일 고르기/.test(dt) && /리스트 파일 고르기/.test(dt) && /X-RAY 파일 고르기/.test(dt), '업로드 탭 — EDI · 리스트 · X-RAY 올리기 카드');
ok(!/<PrintHubModal/.test(dt) && !/setShowPrintHub/.test(code(dt)), '업로드 탭에 출력 센터 카드·단추가 없다');
ok(!/📋 검수 리스트|📐 카고플랜|🚢 베이 상세/.test(code(dt)), '업로드 탭에 검수 리스트·카고플랜·베이 상세 출력이 없다');

// ── 4. 매뉴얼·색인·미르 — 옛 낱말 잔재(주석 제외)
const docs = ['src/data/helpData.js', 'src/data/helpDataChief.js', 'src/data/featureIndex.js', 'src/nlSearch.js', 'src/mir.js'];
const banned = [
  ['▶ 작업 시작', '탭 이름은 «🚀 작업 시작»'],
  ['인쇄 ▾', '베이 탭 인쇄 드롭다운은 없다'],
  ['카고 플랜 V2', '화면 이름은 «카고플랜»'],
  ['업로드 탭 → 검수 자료 출력', '출력은 독의 «🖨️ 출력»'],
  ['헤더 ⋯', '헤더 메뉴 단추는 ⋮'],
];
for (const f of docs) {
  const s = rd(f);
  for (const [w, why] of banned) {
    const n = s.split(w).length - 1;
    ok(n === 0, `${f.replace('src/', '')} — «${w}» 0건 (${why})` + (n ? ` | ${n}건` : ''));
  }
}
const FI = rd('src/data/featureIndex.js');
ok(/🖨️ 출력/.test(FI) && /➕ 더보기/.test(FI) && /📤 업로드 탭/.test(FI), '기능 색인이 독 · 더보기 · 출력 · 업로드 탭을 말한다');
const HD = rd('src/data/helpData.js');
ok(/독의 \[🖨️ 출력\]/.test(HD) && /\['양하', '작업 시작', '베이', '출력', '업로드', '더보기'\]/.test(HD), '사용 매뉴얼이 독의 출력과 새 탭 줄 그림을 말한다');

// ── 5. 버전
ok(/APP_VERSION = 'TallyOne (4|[5-9]|\d{2,})\.\d/.test(rd('src/utils.js')), 'APP_VERSION 이 4.xx 이상');

console.log(`\n${fail ? '✗' : '✓'} 4.00 메뉴 구조 연막검사 — 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
