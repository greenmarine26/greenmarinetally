// 5.23-06 연막검사 — 터미널 반영 보류(voyages/{키}/{모드}/liveHold, 수집기 MailPilot 2.55-02) 표시 · 판정 한 벌 utils.liveHoldOf
//   검수사 2026-11-25 13:23 «차이가 나면 안됩니다. 터미널 자료 읽기를 켜노면 즉시 반영해야 합니다»
const fs = require('fs');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const R = (f) => fs.readFileSync(f, 'utf8');
const U = R('src/utils.js'), H = R('src/pages/HomePage.jsx'), V = R('src/pages/VoyagePage.jsx');
//  판정 함수 본문만 떼어 돌린다(외부 의존 없음)
const m = U.match(/export function liveHoldOf\(voyage, mode\) \{[\s\S]*?\n\}/);
ok(!!m, 'utils.liveHoldOf 가 있다');
const liveHoldOf = new Function(m[0].replace('export function liveHoldOf', 'return function liveHoldOf'))();
ok(liveHoldOf({}, 'discharge') === null && liveHoldOf({ discharge: { liveHold: { n: 0 } } }, 'discharge') === null, '보류 없음·0대면 null');
const r = liveHoldOf({ discharge: { liveHold: { at: 1, n: 2, total: 35, whole: false, why: 'x', cns: { BBBU0000002: {}, AAAU0000001: {} } } } }, 'discharge');
ok(r && r.n === 2 && r.total === 35 && r.whole === false && r.cns.join(',') === 'AAAU0000001,BBBU0000002', '대수·전체·컨 번호(정렬)');
ok(liveHoldOf({ discharge: { liveHold: { n: 2 } } }, 'loading') === null, '모드가 다르면 null');
ok(/disStats\.liveHold = liveHoldOf\(voyage, 'discharge'\); loaStats\.liveHold = liveHoldOf\(voyage, 'loading'\)/.test(H) && /data-live-hold=\{stats\.liveHold\.n\}/.test(H) && /터미널 \{stats\.liveHold\.n\}대 반영 보류/.test(H), '홈 카드 «⚠ 터미널 N대 반영 보류»');
ok(/const lh = liveHoldOf\(voyage, mode\)/.test(V) && /data-live-hold=\{lh\.n\}/.test(V) && /시프팅 목록에서 맞바꿈으로 정리합니다\(양하 리스트에는 넣지 않음\)/.test(V), '항차 화면 띠 · 맞바꿈 안내');
ok(!/카토스|CATOS/i.test((H.match(/반영 보류[\s\S]{0,400}/) || [''])[0] + (V.match(/터미널 완료 \{lh\.n\}[\s\S]{0,600}/) || [''])[0]), '화면 글에 «카토스» 없음');
ok(/터미널 반영 보류 \(5\.23-06\)/.test(R('src/data/helpData.js')), '매뉴얼');
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
