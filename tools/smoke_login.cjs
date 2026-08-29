const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts:'outside-only', pretendToBeVisual:true, url:'http://localhost/' });
const errs=[]; console.error=(...a)=>{const s=a.map(String).join(' '); if(/Error/.test(s)) errs.push(s.split('\n')[0].slice(0,180));};
// 시나리오: 오늘 이 기기에서 '박철민'이 로그인했었다 (지금은 로그인 상태 아님)
const ymd = new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
dom.window.localStorage.setItem('tallyone_me_today', JSON.stringify({ name:'박철민', ymd }));
try { dom.window.eval(fs.readFileSync(process.argv[2],'utf8')); } catch(e){ errs.push('THROW: '+e.message); }

// 2.4x: 토큰 밖 색은 번들이 아니라 소스에서 직접 잡는다 — 조건부 분기(className 삼항식)까지
//   전부 문자열로 남아있어, jsdom 렌더가 우연히 밟지 않은 가지도 놓치지 않는다.
const SRC = fs.readFileSync(path.join(__dirname, '../src/pages/LoginPage.jsx'), 'utf8');
const offTokenHits = [
  ...(SRC.match(/[a-zA-Z]+-\[#[0-9a-fA-F]{3,8}\]/g) || []),
  ...(SRC.match(/\b(?:bg|text|border|from|to|via|ring|divide|outline|decoration|shadow|fill|stroke)-(?:slate|zinc)-[0-9]+/g) || []),
];

setTimeout(()=>{
  const d=dom.window.document, t=d.body.textContent||'';
  if(errs.length){ console.log('✗ 오류'); [...new Set(errs)].slice(0,3).forEach(e=>console.log('   '+e)); process.exit(1); }

  // ── 2.22: 로그인 목록 = 지금 로그인한 사람 ∪ 오늘의 본인 (기존 회귀 검사, 그대로 유지) ──
  const names = [...d.querySelectorAll('button')].map(b=>b.textContent||'');
  const shown = ['김성일','이영수','박철민','최민호','정대영'].filter(n => names.some(x=>x.includes(n)));
  console.log('  목록에 보이는 사람:', shown.join(' · ') || '(없음)');
  if(!shown.includes('김성일')) { console.log('✗ 지금 로그인한 사람이 안 보인다'); process.exit(1); }
  if(!shown.includes('박철민')) { console.log('✗ **오늘의 본인이 안 보인다** — 이번 판의 핵심이 죽었다'); process.exit(1); }
  if(shown.includes('최민호')||shown.includes('정대영')) { console.log('✗ 로그인 안 한 사람까지 보인다'); process.exit(1); }
  if(!/나/.test(t)) { console.log('✗ 「나」 표시가 없다'); process.exit(1); }

  // ── 2.4x: PC 좌측 현황판 — 선박 2열 카드 (코드박스 텍스트로 카드 하나를 찾아 그 카드 안의 글자만 본다) ──
  function cardTextFor(vsl) {
    const all = [...d.querySelectorAll('div')];
    const codeBox = all.find(el => el.children.length === 0 && (el.textContent||'').trim() === vsl);
    return codeBox ? codeBox.parentElement.textContent : null;
  }
  const tTest = cardTextFor('TESTSHIP');    // 시작(과거 planDate)해서 지금 작업중 + 활동 검수원 0명
  const tNsfr = cardTextFor('NSFR');        // terminalStatus=working 이지만 시작 전(미래 planDate)
  const tThird = cardTextFor('THIRDSHIP');  // 지금 작업중 + 활동 검수원 1명(대조군)

  if (!tTest) { console.log('✗ TESTSHIP 카드가 안 보인다'); process.exit(1); }
  if (!/작업중/.test(tTest)) { console.log('✗ 작업 시작(과거 planDate)한 배가 «작업중»으로 안 뜬다'); process.exit(1); }
  if (!/15번/.test(tTest)) { console.log('✗ 선석 «15번» 표기가 안 보인다 (berthNo 회귀)'); process.exit(1); }
  if (/15명/.test(tTest)) { console.log('✗✗ 선석 번호가 «15명»(인원수)으로 잘못 찍힌다 — 시안의 원래 오독 재발'); process.exit(1); }
  if (!/20FT/.test(tTest)) { console.log('✗ 20FT 수량 배지가 안 보인다'); process.exit(1); }
  if (!/MTY/.test(tTest)) { console.log('✗ MTY 수량 배지가 안 보인다'); process.exit(1); }
  if (!/리퍼/.test(tTest)) { console.log('✗ 리퍼 수량 배지가 안 보인다'); process.exit(1); }
  if (!/XRAY/.test(tTest)) { console.log('✗ XRAY 수량 배지가 안 보인다'); process.exit(1); }
  if (!/검수원\s*0명/.test(tTest)) { console.log('✗ 활동 검수원 0명인데 경고가 안 뜬다'); process.exit(1); }

  if (!tNsfr) { console.log('✗ NSFR 카드가 안 보인다'); process.exit(1); }
  if (/작업중/.test(tNsfr)) { console.log('✗✗ 시작 전(30분 후 시작) 배가 «작업중»으로 뜬다 — 2026-08-25 NSFR 사고 재발'); process.exit(1); }
  if (/검수원\s*0명/.test(tNsfr)) { console.log('✗✗ 시작 전 배에 «검수원 0명» 경고가 뜬다 — 있어서는 안 되는 경고'); process.exit(1); }

  if (!tThird) { console.log('✗ THIRDSHIP 카드가 안 보인다'); process.exit(1); }
  if (!/작업중/.test(tThird)) { console.log('✗ THIRDSHIP(작업중이어야 함)이 작업중으로 안 뜬다'); process.exit(1); }
  if (/검수원\s*0명/.test(tThird)) { console.log('✗ 활동 검수원이 있는데도 «검수원 0명» 경고가 뜬다(담당자 배정이 무시됐다)'); process.exit(1); }

  // ── 2.4x: KPI 「검수 대상 컨테이너」 터미널별 분해 (PCTC/PNCT/미상 라벨은 검수사 확정 문구 그대로) ──
  if (!t.includes('평택컨테이너터미널')) { console.log('✗ PCTC 분해 라벨(평택컨테이너터미널)이 안 보인다'); process.exit(1); }
  if (!t.includes('동방아이포트')) { console.log('✗ PNCT 분해 라벨(동방아이포트)이 안 보인다'); process.exit(1); }
  if (!t.includes('미상')) { console.log('✗ pier 미상 분해 라벨이 안 보인다'); process.exit(1); }

  // ── ★ 2.82 (검수사 지시 2026-08-29): 오늘 작업이 없으면 **차순으로 기본 6대** ──
  //   *«오늘 작업이 없으면 차순으로 기본 6대를 보여 주세요. 화면이 비어 보입니다»*
  //   픽스처는 오늘 3척 + 차순(D+3~D+7) 5척. 6대를 채우면 FUTURE1·FUTURE2·FUTURE3 까지 보이고
  //   FUTURE4·FUTURE5 는 안 보여야 한다(6대에서 끊는다 — 무한정 늘리지 않는다).
  {
    const shownFuture = [1, 2, 3, 4, 5].filter((i) => t.includes(`FUTURE${i}`));
    if (shownFuture.length !== 3 || !t.includes('FUTURE1') || !t.includes('FUTURE2') || !t.includes('FUTURE3')) {
      console.log(`✗ 차순 채움이 6대가 아니다 — 보이는 차순: ${shownFuture.map((i) => 'FUTURE' + i).join('·') || '없음'} (FUTURE1·2·3 만 나와야 한다)`);
      process.exit(1);
    }
    //  타임라인·«작업중 척수» 는 종전대로 오늘·내일만 봐야 한다 — 차순이 섞이면 안 된다.
    if (/오늘\s*\d+척 작업중/.test(t) && /오늘\s*[4-9]척 작업중/.test(t)) {
      console.log('✗ 차순이 «오늘 N척 작업중» 수에 섞였다 — 그 문구는 rank<9 만 세야 한다');
      process.exit(1);
    }
    //  섞였으면 제목이 그 사실을 말해야 한다(없는 작업을 있다고 하지 않는다).
    if (!t.includes('다음 예정')) {
      console.log('✗ 차순을 채웠는데 제목이 «+ 다음 예정» 을 말하지 않는다');
      process.exit(1);
    }
    //  ★ 2.82-01 (검수사): *«근무 배치 하는 사람이 보면 이번에는 근무인원이 많이 필요 없는줄 압니다»* ·
    //    *«휴가요청을 다 받아준다면 그후의 일들은 남은 검수사들이 고된 작업을 하게 됩니다»*
    //    ⇒ 화면에 못 담은 나머지를 반드시 숫자로 말해야 한다. 픽스처 8척 중 6척만 보이므로 «그 밖 대기 2척».
    if (!/그 밖 대기\s*2척/.test(t)) {
      console.log('✗ «그 밖 대기 2척» 이 안 보인다 — 안 보이는 일감을 말하지 않으면 배치가 일을 적게 본다');
      process.exit(1);
    }
    if (!/컨\s*[\d,]+개/.test(t)) {
      console.log('✗ «그 밖 대기» 에 컨 물량이 안 붙었다');
      process.exit(1);
    }
  }

  // ── 2.4x: 토큰 밖 색(하드코딩 hex · slate · zinc) 0건 ──
  if (offTokenHits.length) {
    console.log('✗ 토큰 밖 색이 남아있다:', [...new Set(offTokenHits)].join(', '));
    process.exit(1);
  }

  console.log(`✓ 로그인 목록 연막검사 통과 (${shown.join('·')} — 지금 로그인 + 오늘의 본인만 · 「나」 표시 O · 오류 0)`);
  console.log('✓ PC 좌측 선박 카드 통과 — TESTSHIP(작업중·15번·수량배지 4종·인원0경고 O) · NSFR(시작전 → 작업중 X·경고 X) · THIRDSHIP(대조군 → 경고 X)');
  console.log('✓ KPI 터미널별 분해 통과 (평택컨테이너터미널·동방아이포트·미상 모두 렌더)');
  console.log('✓ 토큰 밖 색(bg-[#·slate-·zinc-) 0건');
  console.log('✓ 2.82 차순 채움 통과 — 오늘 3척 + 차순 3척 = 6대 · FUTURE4·5 는 안 보임 · 제목에 «다음 예정»');
  console.log('✓ 2.82-01 그 밖 대기 통과 — «그 밖 대기 2척 · 컨 N개» 로 안 보이는 일감을 말한다');
  process.exit(0);   // Firebase 구독이 이벤트 루프를 붙잡아 스스로 안 끝난다
},800);
