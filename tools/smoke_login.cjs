const { JSDOM } = require('jsdom'); const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts:'outside-only', pretendToBeVisual:true, url:'http://localhost/' });
const errs=[]; console.error=(...a)=>{const s=a.map(String).join(' '); if(/Error/.test(s)) errs.push(s.split('\n')[0].slice(0,180));};
// 시나리오: 오늘 이 기기에서 '박철민'이 로그인했었다 (지금은 로그인 상태 아님)
const ymd = new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
dom.window.localStorage.setItem('tallyone_me_today', JSON.stringify({ name:'박철민', ymd }));
try { dom.window.eval(fs.readFileSync(process.argv[2],'utf8')); } catch(e){ errs.push('THROW: '+e.message); }
setTimeout(()=>{
  const d=dom.window.document, t=d.body.textContent||'';
  if(errs.length){ console.log('✗ 오류'); [...new Set(errs)].slice(0,3).forEach(e=>console.log('   '+e)); process.exit(1); }
  const names = [...d.querySelectorAll('button')].map(b=>b.textContent||'');
  const shown = ['김성일','이영수','박철민','최민호','정대영'].filter(n => names.some(x=>x.includes(n)));
  console.log('  목록에 보이는 사람:', shown.join(' · ') || '(없음)');
  if(!shown.includes('김성일')) { console.log('✗ 지금 로그인한 사람이 안 보인다'); process.exit(1); }
  if(!shown.includes('박철민')) { console.log('✗ **오늘의 본인이 안 보인다** — 이번 판의 핵심이 죽었다'); process.exit(1); }
  if(shown.includes('최민호')||shown.includes('정대영')) { console.log('✗ 로그인 안 한 사람까지 보인다'); process.exit(1); }
  if(!/나/.test(t)) { console.log('✗ 「나」 표시가 없다'); process.exit(1); }
  console.log(`✓ 로그인 목록 연막검사 통과 (${shown.join('·')} — 지금 로그인 + 오늘의 본인만 · 「나」 표시 O · 오류 0)`);
  process.exit(0);   // Firebase 구독이 이벤트 루프를 붙잡아 스스로 안 끝난다
},800);
