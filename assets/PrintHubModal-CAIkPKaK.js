import{b5 as y,b4 as gs,a$ as e,aK as ls,b as ws,c as Ss,ag as bt}from"./vendor-6XvW6uU9.js";import{eT as os,cw as Ns,eo as as,e6 as Lt,d2 as jt,aT as ds,e1 as cs,e2 as ps,eF as Cs,d5 as js,dt as ks,a5 as _s,aV as Ps,ap as Es,aZ as Dt,eR as Ms,ak as Ts,b5 as Os,cF as Rs,db as As,b0 as $s,aj as Ls,C as Ds,dQ as Fs,d1 as ys,ai as zs,ao as vs,cM as Ks,ee as Hs,B as Bs,cD as Is,dl as Gs,at as Vs,d0 as Us,cY as Ys,a4 as Xs,eD as Ws,cx as Zs,az as Js,en as qs,ek as Qs,aX as tn,E as en,aY as sn,e4 as nn,di as rn,dz as ln,eE as on,aW as Xe,as as an,y as We,aM as dn,m as $t,q as cn,P as pn,e9 as hn,dV as bn,dF as Ze,dU as fn,dW as mn,d7 as Je,d8 as un,dn as xn,em as gn,cT as wn,dT as qe,b4 as Sn,t as Nn}from"./index-C2TjZnMJ.js";import"./baydict-DBqSydwE.js";const Cn=`
<div id="print-toolbar" class="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#1e293b;color:#fff;padding:8pt 10pt;display:flex;gap:8pt;justify-content:center;z-index:1000;border-bottom:2pt solid #f59e0b;font-family:'Malgun Gothic','맑은 고딕',sans-serif;">
  <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">🖨 프린터 인쇄</button>
  <button onclick="window.__savePDF()" style="background:#0284c7;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">📄 PDF 저장</button>
  <button onclick="window.__exportExcel()" style="background:#d97706;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">📊 엑셀 다운로드</button>
  <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;">✕ 닫기</button>
</div>`,jn=`
@media print { .print-toolbar { display: none !important; } body { padding-top: 0 !important; } }
body { padding-top: 50pt; }`,kn=`
window.__savePDF = function() {
  alert('인쇄 창에서 프린터를 "PDF로 저장"으로 선택하세요.\\n(Chrome: 대상 → PDF로 저장 / Edge: Microsoft Print to PDF)');
  setTimeout(() => window.print(), 100);
};
window.__exportExcel = function() {
  if (typeof XLSX === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    s.onload = window.__doExport;
    s.onerror = () => alert('엑셀 라이브러리 로드 실패. 인터넷 연결 확인.');
    document.head.appendChild(s);
  } else {
    window.__doExport();
  }
};
window.__doExport = function() {
  try {
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) { alert('내보낼 테이블이 없습니다.'); return; }
    const wb = XLSX.utils.book_new();
    tables.forEach((table, i) => {
      const sheetName = (table.getAttribute('data-sheet-name') || ('Sheet' + (i+1))).slice(0, 31);
      const ws = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    const date = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);   // 4.88: 새 창에 넣는 글 코드라 import 를 못 한다 — meToday.ymdKST 와 같은 식(KST)
    const title = (document.title || '출력물').replace(/[^가-힣a-zA-Z0-9_]/g, '_').slice(0, 30);
    XLSX.writeFile(wb, title + '_' + date + '.xlsx');
  } catch (e) {
    alert('엑셀 다운로드 실패: ' + e.message);
  }
};`;function _n(t){if(!(!t||!t.document))try{const n=t.document.createElement("style");n.textContent=jn,t.document.head.appendChild(n),t.document.body.insertAdjacentHTML("afterbegin",Cn);const d=t.document.createElement("script");d.textContent=kn,t.document.body.appendChild(d)}catch(n){console.error("toolbar 주입 실패:",n)}}function Pn(t,n="출력"){const d=window.open("","_blank","width=900,height=1200");return d?(d.document.write(t),d.document.close(),setTimeout(()=>{_n(d);try{d.focus()}catch{}},200),d):(alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요."),null)}const Tt={KRPUS:"PUS",KRKAN:"KAN",KRPTK:"PTK",KRPYT:"PTK",KRINC:"INC",PYT:"PTK",KRPYOTM:"PTK",PYOTM:"PTK",KRPYO:"PTK",VNSGN:"SGN",VNHPP:"HPP",THLCH:"LCH",THBKK:"BKK",JPTYO:"TYO",JPYOK:"YOK",MYPEN:"PEN",MYPKG:"PKG",CNTAG:"TAG",CNNTG:"NTG",BSE:"PUS",HCC:"SGN",LCC:"LCH",PUS:"PUS",KAN:"KAN",PTK:"PTK",SGN:"SGN",LCH:"LCH",BKK:"BKK",TYO:"TYO",PEN:"PEN",PKG:"PKG",INC:"INC",HPP:"HPP",YOK:"YOK",TAG:"TAG",NTG:"NTG"},mt={DJSC:"DJS",NSSL:"NSL",HASL:"HAS",SNKO:"SKR",HSLI:"HSL",JEON:"HSL",DWIC:"DWS",EASK:"EAS",TJMS:"TJM",WDFC:"WDF",SCLK:"SIT"},Qe=["SKR","NSL","DJS","HAS","HSL"],ts=["PUS","KAN","SGN","LCH","BKK","PKG","PEN","TYO","YOK","HPP","INC","TAG","NTG"],es={D2:"20",D5:"HC",D4:"40",R5:"HC",R2:"20"};function ss(t){if(!t)return"?";const n=String(t).trim().toUpperCase();return Tt[n]?Tt[n]:n.length>=3?n.slice(-3):"?"}function En(t,n){const d=n||(h=>String(h||"").toUpperCase().trim()),f=h=>d(String(h||"").slice(0,3).toUpperCase()),c=t.isBooking===!0||t.pendingCn===!0||typeof t.cn=="string"&&t.cn.startsWith("__BOOK_");if(t.op){const h=String(t.op).toUpperCase();return mt[h]?d(mt[h]):f(h)}if(t.bl&&t.bl.length>=4){const h=t.bl.slice(0,4).toUpperCase();if(mt[h])return d(mt[h])}if(t.carrierCode){const h=String(t.carrierCode).toUpperCase();return mt[h]?d(mt[h]):f(h)}return!c&&t.cn&&t.cn.length>=3?f(t.cn):"?"}function Mn(t){const n=String(t.iso||"").toUpperCase().trim();return es[n]?es[n]:n?/^4H/.test(n.replace(/\s/g,""))?"HC":Cs(t):t.cn&&/^[A-Z]{4}\d{7}$/.test(t.cn)&&parseInt(t.cn[10])>=4?"HC":"20"}function Tn(t){if(t.fe){const d=String(t.fe).toUpperCase().trim();return d==="E"||d==="EMPTY"||d==="MT"||d==="P"?"E":"F"}if(t.cargoType)return String(t.cargoType).toUpperCase()==="F"?"F":"E";const n=String(t.iso||"").toUpperCase();return js(n)?"F":n.endsWith("E")?"E":"F"}function On(t,n){if(n==="disch")return ss(t.pol);{const d=t.tsport||t.printpod||t.pod;let f=ss(d);if(f==="?"&&t.bl){const c=String(t.bl).toUpperCase().match(/^[A-Z]{4}PT([A-Z]{3})/);c&&Tt[c[1]]&&(f=Tt[c[1]])}return f}}function Rn(t){const n=Array.from(t),d=ts.filter(c=>n.includes(c)),f=n.filter(c=>!ts.includes(c)).sort();return[...d,...f]}function An(t,n="settlement"){var it;const d=[];for(const p of["discharge","loading"]){const w=(t==null?void 0:t[p])||{};for(const j of[w.ediContainers,w.records])for(const V of Object.values(j||{}))V&&V.op&&d.push(V.op)}const f=as(String(((it=t==null?void 0:t.info)==null?void 0:it.vsl)||"").toUpperCase(),d),c={},h={};if(n==="actual"&&t.records&&new Set(Object.keys(t.records).map(p=>String(p).toUpperCase())),t){const p=(w,j,V)=>{if(!w)return;const _=w.ediContainers||{},P=w.records||{};w.completed&&new Set(Object.keys(w.completed).map(T=>String(T).toUpperCase()));const v=V==="disch"&&n!=="actual"&&t.discharge===w?Lt(t):null;let S;n==="actual"?S=w.completed&&Object.keys(w.completed).length>0?Object.keys(w.completed):Object.keys(P):(S=v?[...v.set]:Object.keys(P),!v&&S.length===0&&(S=Object.values(_).filter(T=>V==="disch"?jt(T.pod):jt(T.pol)).map(T=>T.cn))),S.forEach(T=>{var st;const M=String(T).toUpperCase(),R=_[M]||_[T]||v&&_[v.ediKeyOf.get(T)]||{},F=P[M]||P[T]||(v?ds(t,T):{});let u;if(R&&R.cn){u={...R};for(const[l,x]of Object.entries(F))(u[l]===null||u[l]===void 0||u[l]==="")&&x&&(u[l]=x);(F.op||R.op)&&(u.op=cs(F.op,R.op,(st=t==null?void 0:t.info)==null?void 0:st.vsl)),V==="disch"&&R.pol&&(u.pol=ps(R.pol,F.pol,R.pod)),F.pod_pick&&F.pod&&(u.pod=F.pod)}else u={...F};if(u.cn=T,!u.cn)return;const q=En(u,f),b=On(u,V),et=Mn(u),U=Tn(u);j[q]||(j[q]={}),j[q][b]||(j[q][b]={}),j[q][b][et]||(j[q][b][et]={F:0,E:0}),j[q][b][et][U]++})};p(t.discharge||t.disch,c,"disch"),p(t.loading||t.load,h,"load")}const E={20:{F:0,E:0},40:{F:0,E:0},HC:{F:0,E:0},45:{F:0,E:0}},G={20:{F:0,E:0},40:{F:0,E:0},HC:{F:0,E:0},45:{F:0,E:0}};for(const p of Object.keys(c))for(const w of Object.keys(c[p]))for(const j of Object.keys(c[p][w]))E[j]&&(E[j].F+=c[p][w][j].F,E[j].E+=c[p][w][j].E);for(const p of Object.keys(h))for(const w of Object.keys(h[p]))for(const j of Object.keys(h[p][w]))G[j]&&(G[j].F+=h[p][w][j].F,G[j].E+=h[p][w][j].E);const z=Object.values(E).reduce((p,w)=>p+w.F+w.E,0),H=Object.values(G).reduce((p,w)=>p+w.F+w.E,0);return{disch:c,load:h,totalDS:E,totalLD:G,dischTotal:z,loadTotal:H}}function ns(t,n,d,f){const c=(f[t]||{})[n]||{};return["20","40","HC","45"].map(h=>{const E=(c[h]||{})[d]||0;return E>0?String(E):""})}function $n(t,n="settlement",d={}){var L,Z,$,i,g,O,k,K,J,nt;const{disch:f,load:c,totalDS:h,totalLD:E,dischTotal:G,loadTotal:z}=An(t,n),H=t.info||((L=t.discharge)==null?void 0:L.info)||((Z=t.loading)==null?void 0:Z.info)||{},it=H.vsl||H.vessel||H.vesselName||"VESSEL",p=d.dischVoy||((i=($=t.discharge)==null?void 0:$.info)==null?void 0:i.voy)||((O=(g=t.discharge)==null?void 0:g.info)==null?void 0:O.voyNo)||H.voy_d||"",w=d.loadVoy||((K=(k=t.loading)==null?void 0:k.info)==null?void 0:K.voy)||((nt=(J=t.loading)==null?void 0:J.info)==null?void 0:nt.voyNo)||H.voy_l||"";let j;p&&w&&p!==w?j=`${p} & ${w}`:p?j=p:w?j=w:j=d.voy||H.voy||H.voyNo||"";const V=d.date||H.date||os(),_=d.berth||H.berth||"";let P=H.pier;if(!P&&_){const B=String(_).match(/(\d+)\s*번선석/);if(B){const Y=parseInt(B[1],10);Y>=6&&Y<=9?P="PCTC":Y>=13&&Y<=16&&(P="PNCT")}}const v=P||"PCTC",S=_?Ns(_):"-",T=H.port||"PYEONGTAEK, KOREA",M=new Set([...Object.keys(f),...Object.keys(c)]),R=[...Qe.filter(B=>M.has(B)),...Array.from(M).filter(B=>!Qe.includes(B)).sort()],F=[];for(const B of R){const Y=new Set([...Object.keys(f[B]||{}),...Object.keys(c[B]||{})]);if(Y.size===0)continue;const ot=Rn(Y),dt=ot.length*2;let ct=!1;ot.forEach((at,xt)=>{const gt=xt===ot.length-1;["F","E"].forEach(ht=>{const pt=[];ct||(pt.push(`<td rowspan="${dt}" class="op-cell">${B}</td>`),ct=!0),ht==="F"&&pt.push(`<td rowspan="2" class="port-cell">${at}</td>`),pt.push(`<td class="fe-cell">${ht}</td>`);const _t=ns(B,at,ht,f);pt.push(`<td class="disch-first">${_t[0]}</td>`),pt.push(..._t.slice(1).map(ft=>`<td>${ft}</td>`));const rt=ns(B,at,ht,c);pt.push(`<td class="load-first">${rt[0]}</td>`),pt.push(...rt.slice(1).map(ft=>`<td>${ft}</td>`)),pt.push('<td class="shift-first"></td><td></td><td></td><td></td>');const Pt=gt&&ht==="E"?' class="op-end"':"";F.push(`<tr${Pt}>${pt.join("")}</tr>`)})})}const u=(B,Y)=>{const ot=[];Y&&ot.push('<td colspan="2" rowspan="2" class="total-label">Total</td>'),ot.push(`<td class="fe-cell">${B}</td>`),["20","40","HC","45"].forEach(dt=>{const ct=h[dt][B],at=dt==="20"?' class="disch-first"':"";ot.push(`<td${at}>${ct||"-"}</td>`)}),["20","40","HC","45"].forEach(dt=>{const ct=E[dt][B],at=dt==="20"?' class="load-first"':"";ot.push(`<td${at}>${ct||"-"}</td>`)});for(let dt=0;dt<4;dt++){const ct=dt===0?' class="shift-first"':"";ot.push(`<td${ct}>-</td>`)}return`<tr class="total-row">${ot.join("")}</tr>`},et=273-78-5,U=25.4/72,st=F.length+2,x=Math.max(7.7,Math.min(11.5,et/Math.max(1,st)/U)),N=Math.max(6,Math.round(x*.78*10)/10),A=Math.max(5.4,Math.round(N*.89*10)/10),Q=Math.max(6.6,Math.round(N*1.11*10)/10),tt=st*x*U>et+.5,s=Math.max(0,45-F.length-2),m=[];for(let B=0;B<s;B++){const Y=[];if(B%3===0){const ot=Math.min(3,s-B);Y.push(`<td rowspan="${ot}" class="op-cell"></td>`)}Y.push("<td></td>"),Y.push("<td></td>"),Y.push('<td class="disch-first"></td>',"<td></td>","<td></td>","<td></td>"),Y.push('<td class="load-first"></td>',"<td></td>","<td></td>","<td></td>"),Y.push('<td class="shift-first"></td>',"<td></td>","<td></td>","<td></td>"),m.push(`<tr class="empty-row">${Y.join("")}</tr>`)}let a;return G>0&&z>0?a='<div class="bottom-row"><div><b>Remarks : Discharging</b></div><div><b>Remarks : Loading</b></div></div>':z>0?a='<div class="bottom-single"><div><b>Remarks : Loading</b></div></div>':a='<div class="bottom-single"><div><b>Remarks : Discharging</b></div></div>',`<!DOCTYPE html><html><head><meta charset="utf-8"><title>FINAL WORKING REPORT (VOUCHER)</title>
<style>
@page { size: A4 portrait; margin: 0.8cm; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; margin: 0; font-size: 9pt; color: #000; }
.content { padding: 4mm; }
.title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 4pt; }
.subtitle { text-align: center; font-size: 13pt; font-weight: bold; border: 1pt solid #000; padding: 3pt; margin-bottom: 6pt; }
.info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; margin-bottom: 6pt; font-size: 10pt; }
.info-row b { display: inline-block; min-width: 60pt; }
table.voucher { width: 100%; border-collapse: collapse; font-size: ${N}pt; border: 1.5pt solid #000; }
table.voucher th, table.voucher td { border: 0.5pt solid #000; text-align: center; padding: 0 2pt; height: ${x.toFixed(2)}pt; line-height: 1.05; }
table.voucher th { background: #f0f0f0; font-weight: bold; font-size: ${A}pt; }
.op-cell { font-weight: bold; vertical-align: middle; font-size: ${Q}pt; }
.port-cell { font-weight: bold; vertical-align: middle; }
.fe-cell { font-weight: bold; }
.total-row { font-weight: bold; background: #f8f8f8; }
.total-label { text-align: center; font-weight: bold; vertical-align: middle; }
table.voucher .disch-first { border-left: 1.5pt solid #000; }
table.voucher .load-first { border-left: 1.5pt solid #000; }
table.voucher .shift-first { border-left: 1.5pt solid #000; }
table.voucher thead th[colspan="4"] { border-left: 1.5pt solid #000; border-right: 1.5pt solid #000; }
table.voucher tr.op-end > td { border-bottom: 1.5pt solid #000; }
table.voucher tr.total-row:first-of-type > td { border-top: 1.5pt solid #000; }
.bottom-row { display: grid; grid-template-columns: 7fr 8fr; gap: 0; }
.bottom-row > div { border: 1pt solid #000; min-height: 55pt; padding: 4pt; font-size: 9pt; }
.bottom-row > div:nth-child(2) { border-left: none; }
.bottom-single > div { border: 1pt solid #000; min-height: 55pt; padding: 4pt; font-size: 9pt; }
.too-tall { font-size: 7pt; color: #b23a2a; margin-top: 3pt; }   /* 3.29: 한 장에 못 넣었으면 조용히 넘기지 않는다 */
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 20pt; }
.signs > div { text-align: center; padding-top: 4pt; font-weight: bold; font-size: 10pt; border-top: 0.5pt solid #000; }
</style></head><body><div class="content">
<div class="title">GREEN MARINE CO., LTD.</div>
<div class="subtitle">FINAL WORKING REPORT (VOUCHER)${n==="actual"?" — 작업용 (현재 진행)":""}</div>
<div class="info-row">
<div><b>M/V :</b> ${it}</div>
<div><b>VOY # :</b> ${j}</div>
<div><b>DATE :</b> ${V}</div>
<div><b>PIER :</b> ${v}</div>
<div><b>BERTH :</b> ${S}</div>
<div><b>PORT :</b> ${T}</div>
</div>
<table class="voucher">
<thead><tr>
<th rowspan="2">OPERATOR</th><th rowspan="2">PORT</th><th rowspan="2">FULL (F)<br>EMPTY (E)</th>
<th colspan="4">DISCH (${G})</th>
<th colspan="4">LOAD (${z})</th>
<th colspan="4">SHIFT (0)</th>
</tr><tr>
<th class="disch-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
<th class="load-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
<th class="shift-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
</tr></thead>
<tbody>${F.join("")}${m.join("")}${u("F",!0)}${u("E",!1)}</tbody></table>
${a}${tt?`<div class="too-tall">※ 선사 ${R.length}곳 · ${st}줄 — 읽을 수 있는 가장 작은 글자(${N}pt)로도 한 장에 안 들어갑니다. 둘째 장이 이어집니다.</div>`:""}
<div class="signs"><div>CHIEF CHECKER</div><div>CHIEF OFFICER</div></div>
</div></body></html>`}function rs(t,n={},d="settlement",f={}){const c=$n(t,d,f);Pn(c,"FINAL_WORKING_REPORT")}const Et={style:"thin",color:{rgb:"000000"}},St={top:Et,bottom:Et,left:Et,right:Et},Nt=(t={})=>({name:"Arial",sz:8,...t}),Ln=t=>String(t||"").replace("#","").toUpperCase();function Dn(t,{plan:n,containers:d=[],xrayMap:f={},vsl:c="RIZHAO ORIENT",date:h="",fills:E={},mode:G="discharge"}={}){const z=Es({plan:n,containers:d,xrayMap:f,termWork:{},vsl:c,date:h,mode:G}),H=t.utils.book_new(),it=p=>z.fmtWt(p,!1);return z.pages.forEach((p,w)=>{const j={},V=[],_=(l,x,N,A)=>{if(N==null||N===""){A&&(j[t.utils.encode_cell({r:l,c:x})]={t:"s",v:"",s:A});return}j[t.utils.encode_cell({r:l,c:x})]={t:typeof N=="number"?"n":"s",v:N,...A?{s:A}:{}}},P=(l,x,N,A,Q,tt)=>{for(let r=l;r<=N;r++)for(let s=x;s<=A;s++)_(r,s,r===l&&s===x?Q:"",tt);(N>l||A>x)&&V.push({s:{r:l,c:x},e:{r:N,c:A}})},v=p.px.cols,S=v+1,T=8,M=l=>({font:Nt({sz:l.sz||10,bold:!!l.bold}),alignment:{horizontal:l.h||"left",vertical:"center"}});P(0,1,0,v,`MV "${z.head.vsl}" _STOWAGE PLAN`,M({sz:16,bold:!0,h:"center"}));const R=Math.max(8,v-12);P(1,1,1,R-1,`"${p.label}" - DECK`,M({sz:12,bold:!0,h:"center"})),[["VOY. NO",z.head.voy],["DATE",z.head.dateShown],["L/PORT",z.head.lport],["D/PORT",z.head.dport]].forEach(([l,x],N)=>{_(2+N,1,l,M({})),_(2+N,2,":",M({})),_(2+N,3,x,M({}))});const F=p.totals,u=l=>({font:Nt({sz:9,bold:l}),alignment:{horizontal:"center",vertical:"center"},border:St});P(1,R,1,R+4,"SUB TOTAL",u(!0)),["SIZE","20'","40'","45'","TTL"].forEach((l,x)=>_(2,R+x,l,u(!1))),["CONT",F.n[20],F.n[40],F.n[45],F.ttl].forEach((l,x)=>_(3,R+x,l,u(!1))),["SIZE","20'","40'"].forEach((l,x)=>_(2,R+6+x,l,u(!1))),["CAPACITY",F.ch20,F.ch40].forEach((l,x)=>_(3,R+6+x,l,u(!1))),_(4,R+6,"Weight",u(!0)),P(4,R+7,4,R+8,it(F.wt),u(!1));const q=(l,x,N,A,Q)=>P(l,x,l+3,x+N-1,A.join(`
`),Q);for(const l of p.empties)l.slot&&q(T+l.ri*4,1+l.ci,l.span,[],{border:St});for(const l of p.cells){const x=[l.cn,l.wt,...l.lug?["LUG"]:[],l.type];l.letter&&x.push(l.letter),l.urgent&&!/긴급/.test(String(l.type||""))&&x.push("▲ 긴급"),l.xray&&x.push("★ X-RAY");const N=l.fill&&E[l.letter]?{patternType:"solid",fgColor:{rgb:Ln(E[l.letter])}}:void 0;q(T+l.ri*4,1+l.ci,l.span,x,{font:Nt({sz:8}),alignment:{horizontal:"center",vertical:"center",wrapText:!0},border:l.lug?{top:{style:"medium",color:{rgb:"7C3AED"}},bottom:{style:"medium",color:{rgb:"7C3AED"}},left:{style:"medium",color:{rgb:"7C3AED"}},right:{style:"medium",color:{rgb:"7C3AED"}}}:St,...N?{fill:N}:{}})}if(p.art){const l=x=>({ri:Math.round((x.y-p.px.y0)/p.px.uh),ci:Math.round((x.x-p.px.x0)/p.px.uw)});for(const x of[...p.art.hatch,...p.art.gray]){const N=l(x);P(T+N.ri*4,1+N.ci,T+N.ri*4+3,1+N.ci,"",{border:St,fill:{patternType:"solid",fgColor:{rgb:"D9D9D9"}}})}for(const x of p.art.cs){const N=l(x);P(T+N.ri*4,1+N.ci,T+N.ri*4+3,1+N.ci,`C/S
4000`,{font:Nt({sz:8}),alignment:{horizontal:"center",vertical:"center",wrapText:!0},border:St})}}for(let l=0;l<p.px.rows;l++)P(T+l*4,S,T+l*4+3,S,l+1,M({sz:12,bold:!0,h:"center"}));p.zone&&_(T+p.px.rows*4+1,1,`LOLO 구역(D덱 10~15칸) ${p.zone.count}대 — 출력(굵은 선)과 같은 칸`,M({sz:9}));let b=T+p.px.rows*4+3;if(w===0){const l=z.totals,x=["B","C","D"].filter(s=>l.decks[s]),N=s=>[s[20].D+s[20].R,s[20].D,s[20].R,s[40].D+s[40].R,s[40].D,s[40].R,s[45].D+s[45].R,s[45].D,s[45].R,s.L20,s.L40,s.n],A=b;["CHASSIS","20'","40'","Weight"].forEach((s,m)=>_(A,1+m,s,u(m===0))),P(A,5,A+1,5,"",u(!1)),["20'","D","R","40'","D","R","45'","D","R"].forEach((s,m)=>P(A,6+m,A+1,6+m,s,u(!1))),P(A,15,A,16,"LUG",u(!1)),_(A+1,15,"20'",u(!1)),_(A+1,16,"40'",u(!1)),P(A,17,A+1,17,"TTL",u(!1));const Q=x.map(s=>[`${s}-DECK`,l.decks[s].ch20,l.decks[s].ch40,it(l.decks[s].wt)]);Q.push(["TTL",l.ch20,l.ch40,it(l.wt)]);const tt=[["F",N(l.F)],["E",N(l.E)],["TTL",N(l.TTL)]],r=Math.max(Q.length,tt.length+1);for(let s=0;s<r;s++){const m=A+1+s;(Q[s]||["","","",""]).forEach((L,Z)=>_(m,1+Z,L,u(!1)));const a=s-(r-tt.length);a>=0&&(_(m,5,tt[a][0],u(!1)),tt[a][1].forEach((L,Z)=>_(m,6+Z,L,u(!1))))}b=A+1+r+2}b+=2;const et={font:Nt({sz:11}),alignment:{horizontal:"center",vertical:"center"}};P(b,1,b,3,"",{border:{bottom:{style:"medium",color:{rgb:"000000"}}}}),P(b+1,1,b+1,3,"Chief Checker",et),P(b,5,b,7,"",{border:{bottom:{style:"medium",color:{rgb:"000000"}}}}),P(b+1,5,b+1,7,"Chief Officer",et);const U=b+2;j["!ref"]=t.utils.encode_range({s:{r:0,c:0},e:{r:U,c:Math.max(S,R+8,18)}}),j["!merges"]=V,j["!cols"]=Array.from({length:Math.max(S,R+8,18)+1},(l,x)=>({wch:x===0?2:x===S?5:11}));const st=[];for(let l=0;l<=U;l++)st.push({hpx:l>=T&&l<T+p.px.rows*4?13:16});j["!rows"]=st,t.utils.book_append_sheet(H,j,`${p.label==="UNDER"?"UNDER":p.label}-DECK`)}),H}const Fn={orientation:"landscape",paper:9,margin:.3937,centered:!0,fit:!0};async function yn(t){const n=await ks(),d=Dn(n,t),f=`STOWAGE_PLAN_${String(t.plan&&t.plan.voy||"RZOR").replace(/[^A-Za-z0-9_-]/g,"")}_DISCHARGE.xlsx`,c=_s(n,n.write(d,{bookType:"xlsx",type:"array"}),[Fn]);return Ps(c,f),f}const zn=.55,hs=(t,n)=>ys(t,n);function vn(t){const n={};return Array.isArray(t)&&t.forEach(d=>{if(!d||!d.bay)return;const f=Fs(d.bay);f&&(n[f]=n[f]||[]).push(d)}),n}function Kn(t,n){n=n||{};const d=new Set;for(const h of t)h%2===0&&d.add(h);for(const[h,E]of Object.entries(n)){const G=parseInt(h,10);if(G%2===0&&d.add(G),E&&E.pairEven!=null){const z=parseInt(E.pairEven,10);Number.isFinite(z)&&d.add(z)}}const f=new Set,c=[];for(const h of t.filter(E=>E%2===1).sort((E,G)=>E-G)){if(f.has(h))continue;const E=h-1;E>0&&d.has(E)&&!f.has(E)?(c.push({even:E,odd:h,key:`${E}-${h}`}),f.add(h),f.add(E)):(c.push({even:null,odd:h,key:`${h}`}),f.add(h))}for(const h of[...d].sort((E,G)=>E-G))f.has(h)||(c.push({even:h,odd:null,key:`${h}`}),f.add(h));return c.sort((h,E)=>(h.even??h.odd)-(E.even??E.odd)),c}const kt=14,Ct=1.067,Mt=7,Ft=(t,n)=>{const d=(Number(t)||87)*.75,f=(Number(n)||48)*.75,c=h=>Math.floor(h*2+1e-6)/2;return Math.max(6,Math.min(c((d-3)/(kt*.6)),c((f-1.5)/(5*Ct))))},ut=t=>{let n=0;for(const d of String(t||""))n+=d.charCodeAt(0)>8192?2:1;return n},yt=t=>(Number(t)||87)*.75-3,bs=(t,n,d)=>{const f=Number(d)||Ft(n,null),c=ut(t);if(c<=kt)return f;let h=f;for(;h>6&&c*.6*h>yt(n)+1e-6;)h-=.5;return Math.max(6,h)},Hn=(t,n,d)=>{const f=Number(d)||Ft(n,null);if(ut(t)<=kt)return"";const c=bs(t,n,f),h=ut(t)*.6*c<=yt(n)+1e-6;return c<=6&&(c<f||!h)?" wide x3":c<f?" wide x2":" wide"},zt=[8.5,7.2,6.3],Bn=[.7,.1,-.45],fs=(t,n)=>Math.floor(((t||87)-8)/(zt[n]*96/72*.6+Bn[n])),In=(t,n)=>{const d=ut(t);for(let f=0;f<zt.length;f++)if(d<=fs(n,f))return f?` x${f+1}`:"";return" x3"};function is(t,n,d,f=!1){try{const c=String(t.pol||"").replace(/^KR/,"").slice(0,3)||"   ",h=String(t.pod||"").replace(/^KR/,"").slice(0,3)||"   ",E=String(t.via||""),G=c===h,z=G?`${c}/${h}`:`${c}/`,H=`*${G?E||" ":E||h}`,it=String(t.cn||""),p=(typeof t.line=="string"&&/[A-Z]/i.test(t.line)?t.line:String(t.carrier||"")).toUpperCase();let w="C_K";p==="CKL"||p==="CK"?w="C_K":p==="SOC"||p.includes("SOC")?w="SOC":p&&(w=p.slice(0,3));const j=t.fe||(String(t.iso||"").endsWith("0")?"E":"F");let V="0.0";try{const N=parseFloat(t.wt);Number.isFinite(N)&&(V=(N/1e3).toFixed(1))}catch{}const _=`${j}${V}`,P=String(Gs(t.iso)||""),v=String(t.tmp??"").trim(),S=t._xray?`★${String(t._xraySealNo||"").trim()||"XRAY"}`:"",T=t.imdg?`${String(t.imdg)}`:v?`${v}C`:"";let M=[S,T].filter(Boolean).join(" ");const R=f?ut(M)>fs(n,zt.length-1):ut(M)*.6*6>yt(n)+1e-6;S&&R&&(M=[S.replace("★",""),T].filter(Boolean).join(" "));const F=f?In(M,n):Hn(M,n,d),u=!f&&F?bs(M,n,d):null,q=parseInt(t.bay,10),b=Number.isFinite(q)&&q>=100?String(q):String(Number.isFinite(q)?q:0).padStart(2,"0"),et=String(t.row??"00").padStart(2,"0"),U=String(t.tier??"00").padStart(2,"0"),st=`....${b}${et}${U}`,l=`${z.padEnd(7)}${H}`,x=`${w.padEnd(3)} ${j}${V.padStart(4)} ${P}`;return{left1:z,right1:H,line1:l,cn:it,carrier:w,fewt:_,type:P,line3:x,mid:M,midCls:F,midPt:u,midXray:!!S,pos:st}}catch(c){return console.error("[formatCellParts] error",c,t),{left1:"",right1:"",line1:"",cn:String(t&&t.cn||""),carrier:"",fewt:"",type:"",line3:"",mid:"",midCls:"",midPt:null,midXray:!1,pos:""}}}function Gn({even:t,odd:n,bayMap:d,mode:f,voyageInfo:c,voyageKey:h,shipName:E,dictBay:G,dictBaysSummary:z={},dictBayDef:H=null,globalRowRange:it,globalTiers:p,dictShipMeta:w,colorMap:j={},isPrintTarget:V=!0,uniformCell:_=null}){const P=[...t!=null&&d[String(t)]||[],...n!=null&&d[String(n)]||[]],v=y.useMemo(()=>{let i=0,g=0,O=!1;for(const J of[t,n]){if(J==null)continue;const nt=z[parseInt(J,10)];if(!nt)continue;const B=nt.rowMaxEvenLocal??nt.rowMaxEven,Y=nt.rowMaxOddLocal??nt.rowMaxOdd;B&&(i=Math.max(i,B)),Y&&(g=Math.max(g,Y))}for(const J of P){const nt=parseInt(J.row),B=parseInt(J.tier);if(!(!Number.isFinite(nt)||!B||nt>=90)){if(nt===0){O=!0;continue}nt%2===0?i=Math.max(i,nt):g=Math.max(g,nt)}}if(!i&&!g)return["08","06","04","02","01","03","05","07"];const k=[];for(let J=i;J>=2;J-=2)k.push(String(J).padStart(2,"0"));const K=[];for(let J=1;J<=g;J+=2)K.push(String(J).padStart(2,"0"));return O?[...k,"00",...K]:[...k,...K]},[t,n,z,P]),S=v.length,T={};P.forEach(i=>{const g=String(i.tier).padStart(2,"0"),O=String(i.row||"00").padStart(2,"0");T[`${g}-${O}`]=i});const M=y.useMemo(()=>{const i=t!=null&&n!=null,g=t??n;if(g==null)return null;const O=i?`(${String(t).padStart(2,"0")})${String(n).padStart(2,"0")}`:String(g).padStart(2,"0");if(H)try{const k=zs(H,O,{posMap:vs(P)});if(k&&k.nDeckCols>0)return k}catch(k){console.warn("[2.56] buildBayGrid 실패 — STD_ROWS 폴백",O,k)}return null},[t,n,H,P]),R=y.useMemo(()=>{const i=new Set,g=new Set;return[t,n].forEach(O=>{if(O==null)return;const k=z[parseInt(O,10)];k&&((k.deckTiersLocal||k.deckTiers||[]).forEach(K=>i.add(String(K).padStart(2,"0"))),(k.holdTiersLocal||k.holdTiers||[]).forEach(K=>g.add(String(K).padStart(2,"0"))))}),{deck:i,hold:g}},[t,n,z]),F=R.deck.size>0||R.hold.size>0,u=y.useMemo(()=>{if(M&&typeof M.hatchCount=="number")return M.hatchCount;for(const i of[t,n]){if(i==null)continue;const g=z[parseInt(i,10)];if(g!=null&&g.hatchCount)return Math.max(1,Math.min(3,g.hatchCount))}return 1},[M,n,t,z]),q=y.useMemo(()=>{let i=M&&Array.isArray(M.hatchRows)?M.hatchRows:null;if(!i)for(const g of[t,n]){if(g==null)continue;const O=z[parseInt(g,10)];if(O&&Array.isArray(O.hatchRows)){i=O.hatchRows;break}}return Ks(i,null)},[M,n,t,z]),b=Array.from(F?new Set([...R.deck,...R.hold,...P.map(i=>String(i.tier).padStart(2,"0")).filter(i=>i!=="NaN")]):new Set([...Array.isArray(p)?p.map(i=>String(i).padStart(2,"0")):[],...P.map(i=>String(i.tier).padStart(2,"0")).filter(i=>i!=="NaN")])),et=b.filter(i=>parseInt(i)>=80).sort((i,g)=>parseInt(g)-parseInt(i)),U=b.filter(i=>parseInt(i)<80).sort((i,g)=>parseInt(g)-parseInt(i)),st=G?G.hasHold!==!1:P.some(i=>parseInt(i.tier)<80),l=G?G.hasDeck!==!1:!0,x=i=>i>=100?String(i):String(i).padStart(2,"0");let N;t!=null&&n!=null?N=`BAY(${x(t)})${x(n)}`:t!=null?N=`BAY${x(t)}`:N=`BAY${x(n)}`;const A=(c==null?void 0:c.voy_d)||"",Q=(c==null?void 0:c.voy_l)||"",tt=(c==null?void 0:c.voy)||"";let r;f==="discharge"?r=A||tt:f==="loading"?r=Q||tt:A&&Q&&A!==Q?r=`양하 ${A} / 선적 ${Q}`:r=A||Q||tt;const s=(()=>{try{return Hs(c||{}).name||(c==null?void 0:c.vsl)||E||""}catch{return(c==null?void 0:c.vsl)||E||""}})(),m=f==="loading"?"POL : PTK":f==="discharge"?"POD : PTK":"POL : PTK",a=(i,g)=>{const O=T[`${i}-${g}`];if(!O)return e.jsx("div",{className:"bd-cell empty"},`${i}-${g}`);const k=is(O,null,Mt);return e.jsxs("div",{className:"bd-cell filled",children:[e.jsx("div",{className:"bd-r1",children:k.line1}),e.jsx("div",{className:"bd-r2",children:k.cn}),e.jsx("div",{className:"bd-r3",children:k.line3}),e.jsx("div",{className:`bd-r4${k.midCls||""}${k.midXray?" xr":""}`,style:k.midPt?{fontSize:`${k.midPt}pt`}:void 0,children:k.mid||" "}),e.jsx("div",{className:"bd-r5",children:k.pos})]},`${i}-${g}`)},L=(i,g)=>{const O=T[`${String(g).padStart(2,"0")}-${i.rowLbl}`];if(!O)return null;const k=!_,K=is(O,_?_.w:null,_?_.fs:null,k);return e.jsxs("div",{className:"bd-cell-lines",children:[Z(O)&&e.jsxs("svg",{className:"bd-oog",viewBox:"0 0 3 2",preserveAspectRatio:"none","aria-hidden":"true",children:[Z(O).includes("W")&&e.jsxs(e.Fragment,{children:[e.jsx("polygon",{points:"1,1 0.5,1.5 1,2"}),e.jsx("polygon",{points:"2,1 2.5,1.5 2,2"})]}),Z(O).includes("H")&&e.jsxs(e.Fragment,{children:[e.jsx("polygon",{points:"1,1 1.5,0.3 2,1"}),e.jsx("rect",{x:"1.26",y:"0.15",width:"0.48",height:"0.85"})]})]}),k?e.jsxs("div",{className:"bd-r1",children:[e.jsx("span",{children:K.left1}),e.jsx("span",{children:K.right1})]}):e.jsx("div",{className:"bd-r1",children:K.line1}),e.jsx("div",{className:"bd-r2",children:K.cn}),k?e.jsxs("div",{className:"bd-r3",children:[e.jsx("span",{children:K.carrier}),e.jsx("span",{children:K.fewt}),e.jsx("span",{children:K.type})]}):e.jsx("div",{className:"bd-r3",children:K.line3}),e.jsx("div",{className:`bd-r4${K.midCls||""}${K.midXray?" xr":""}`,style:K.midPt?{fontSize:`${K.midPt}pt`}:void 0,children:K.mid||" "}),e.jsx("div",{className:"bd-r5",children:K.pos})]})},Z=i=>{if(!i)return"";const g=Number(i.ovh||0)>0,O=Number(i.ovw||0)>0||Number(i.oogL||0)>0||Number(i.oogR||0)>0;return(g?"H":"")+(O?"W":"")},$=(i,g)=>{const O=T[`${String(g).padStart(2,"0")}-${i.rowLbl}`];if(!O)return{};const k=hs(O,f),K=k?Is(O,f):null;K&&j[K];const J=Z(O);return{className:`cpv2-cell bd-fill${k?" ptk":""}${J?` cpv2-oog-${J}`:""}`}};return e.jsxs("div",{className:`bd-page${V?"":" bd-noprint"}`,children:[!V&&e.jsx("div",{className:"bd-noprint-badge no-print",children:"인쇄 제외 (화면 표시용)"}),e.jsxs("div",{className:"bd-header",children:[e.jsx("span",{children:s}),e.jsxs("span",{children:["VOY NO : ",r]}),e.jsx("span",{children:m})]}),e.jsx("div",{className:"bd-title",children:N}),M?e.jsx("div",{className:`bd-cargo-wrap${_?" bd-uniform":""}`,style:_?{"--bdc-w":`${_.w}px`,"--bdc-h":`${_.h}px`,"--bdc-fs":`${_.fs}pt`,"--bdc-gc":String(Math.max(M.nDeckCols||0,M.nHoldCols||0,1))}:void 0,children:e.jsx(Bs,{data:M,colorMap:j,gridCols:Math.max(M.nDeckCols||0,M.nHoldCols||0),globalHatch:{maxDeck:Math.max((M.deckTiers||[]).length,1),maxHold:Math.max((M.holdTiers||[]).length,1),maxSide:Math.max((M.deckTiers||[]).length,(M.holdTiers||[]).length,1)},renderCellContent:L,cellExtra:$,fixedCellVar:_?"--bdc-w":null})}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"bd-row-labels-top",children:v.map((i,g)=>e.jsx("span",{className:"bd-rl",children:i},`${i}-${g}`))}),e.jsxs("div",{className:"bd-grid-wrap",children:[e.jsxs("div",{className:"bd-grid",children:[l&&et.map(i=>e.jsx("div",{className:"bd-tier-row",style:{gridTemplateColumns:`repeat(${S}, minmax(0, 1fr))`},children:v.map(g=>a(i,g))},i)),l&&st&&e.jsx("div",{className:"bd-hatch",children:(q||Array.from({length:u}).map(()=>0)).map((i,g)=>e.jsx("div",{className:"bd-hatch-seg",style:i>0?{flex:`${i} 1 0`}:void 0},g))}),st&&U.map(i=>e.jsx("div",{className:"bd-tier-row",style:{gridTemplateColumns:`repeat(${S}, minmax(0, 1fr))`},children:v.map(g=>a(i,g))},i))]}),e.jsxs("div",{className:"bd-tier-labels",children:[l&&et.map(i=>e.jsx("span",{children:i},i)),l&&st&&e.jsx("span",{className:"bd-tier-gap"}),st&&U.map(i=>e.jsx("span",{children:i},i))]})]}),e.jsx("div",{className:"bd-row-labels-bot",children:v.map(i=>e.jsx("span",{className:"bd-rl",children:i},i))})]})]})}const Vn=typeof window<"u"&&("ontouchstart"in window||(navigator.maxTouchPoints||0)>0);function Un({containers:t,mode:n,voyageInfo:d,shipImo:f,shipName:c,voyageKey:h,globalRowRange:E,globalTiers:G,onClose:z,xrayMap:H,xraySeals:it}){const p=y.useMemo(()=>(t||[]).map(r=>{if(!r)return r;let s=r;if(!s._xraySealNo&&H&&H[s.cn]){const a=String(((it||{})[s.cn]||{}).seal||(s._xraySeal||{}).seal||"").trim();s={...s,_xray:!0,_xraySealNo:a}}const m=Dt(s);return m.src==="edi"||m.src==="rec"?s:{...s,bay:m.bay,row:m.row,tier:m.tier,_planBay:s.bay,_planRow:s.row,_planTier:s.tier}}),[t,H,it]),[w,j]=y.useState("all"),[V,_]=y.useState([]),[P,v]=y.useState(1),S=y.useRef(P);S.current=P;const T=y.useRef(null);Ms(T,()=>S.current,v,{min:.15,max:3});const M=y.useMemo(()=>Ts(p||[],n),[p,n]),R=y.useMemo(()=>{let r=0,s=0,m=!1,a=0,L=0,Z=!1;for(const $ of p){if(!$.row||!$.tier)continue;const i=parseInt($.row),g=parseInt($.tier);if(!g)continue;const O=g>=80;if(i===0){O?m=!0:Z=!0;continue}O?i%2===0?r=Math.max(r,i):s=Math.max(s,i):i%2===0?a=Math.max(a,i):L=Math.max(L,i)}return{maxLeft:Math.max(r,a),maxRight:Math.max(s,L),has00:m||Z,deck:{maxLeft:r,maxRight:s,has00:m},hold:{maxLeft:a,maxRight:L,has00:Z}}},[p]),F=E||R,u=y.useMemo(()=>vn(p),[p]),q=y.useMemo(()=>{const r=new Set;for(const s of p||[]){const m=parseInt(s.bay,10);Number.isFinite(m)&&m>0&&r.add(m)}return r.size},[p]),b=y.useMemo(()=>{if(!f&&!c)return null;const r=(()=>{var L;try{return((L=Os({info:d}))==null?void 0:L.code)||""}catch{return""}})(),s=Rs(f,c,{ediBayCount:q,vslCode:r,callsign:(d==null?void 0:d.callsign)||"",vslFull:(d==null?void 0:d.vslFull)||c||""});if(!s)return null;const m=As(s),a=$s({bayDef:s.bayDef},s._v5Matrix,p,m?"user":s.source);return{...s,_userOwned:m,bayDef:{...a.bayDef,source:s.source,_userOwned:m},_enrichMeta:a._enrichMeta||s._enrichMeta}},[f,c,p,d]),et=y.useMemo(()=>{var r;return(r=b==null?void 0:b.bayDef)!=null&&r.bayList?b.bayDef.bayList.map(s=>parseInt(s,10)).filter(s=>Number.isFinite(s)):null},[b]),U=y.useMemo(()=>{var s;if(!((s=b==null?void 0:b.bayDef)!=null&&s.baysSummary))return{};const r={};return b.bayDef.baysSummary.forEach(m=>{r[parseInt(m.bayNo,10)]=m}),r},[b]),st=y.useMemo(()=>{var r,s,m,a;return{rowMaxEven:(r=b==null?void 0:b.bayDef)==null?void 0:r.rowMaxEven,rowMaxOdd:(s=b==null?void 0:b.bayDef)==null?void 0:s.rowMaxOdd,deckTiers:(m=b==null?void 0:b.bayDef)==null?void 0:m.deckTiers,holdTiers:(a=b==null?void 0:b.bayDef)==null?void 0:a.holdTiers}},[b]),l=y.useMemo(()=>{const r=m=>Number.isFinite(m)&&m<99,s=new Set;return et&&et.forEach(m=>{r(m)&&s.add(m)}),Object.keys(U).forEach(m=>{const a=parseInt(m,10);r(a)&&s.add(a)}),Object.keys(u).forEach(m=>{const a=parseInt(m,10);r(a)&&s.add(a)}),[...s].sort((m,a)=>m-a)},[et,U,u]),x=y.useMemo(()=>{const r=b!=null&&b.bayDef?Ls(b.bayDef):null;if(!r||r.length===0)return Kn(l,U);const s=new Set;r.forEach(a=>{a.even!=null&&s.add(a.even),a.odd!=null&&s.add(a.odd)});const m=r.map(a=>({even:a.even,odd:a.odd,key:a.even!=null&&a.odd!=null?`${a.even}-${a.odd}`:String(a.even!=null?a.even:a.odd)}));for(const a of l)s.has(a)||!(Number.isFinite(a)&&a<99)||(m.push(a%2===0?{even:a,odd:null,key:String(a)}:{even:null,odd:a,key:String(a)}),s.add(a));return m.sort((a,L)=>(a.even!=null&&a.odd!=null||a.even!=null?a.even:a.odd)-(L.even!=null&&L.odd!=null||L.even!=null?L.even:L.odd)),m},[b,l,U]),N=y.useMemo(()=>{let r=0,s=0;for(const Z of x){const $=(Z.odd!=null?U[Z.odd]:null)||(Z.even!=null?U[Z.even]:null);if(!$||!(Array.isArray($.deckCells)&&$.deckCells.length>0||Array.isArray($.holdCells)&&$.holdCells.length>0))continue;const g=($.deckCells||[]).map(Number).filter(Y=>Number.isFinite(Y)&&Y>0),O=g.length>0?Math.max(...g):0,k=O>0?O:Number($.rowCount)||9,K=($.holdCells||[]).map(Number).filter(Y=>Number.isFinite(Y)&&Y>0),J=K.length>0?Math.min(Math.max(...K),k):0;r=Math.max(r,k,J,1);const nt=($.deckTiersLocal||$.deckTiers||[]).length,B=($.holdTiersLocal||$.holdTiers||[]).length;s=Math.max(s,nt+B)}if(!r)return null;const m=Math.max(78,Math.min(118,Math.floor(1046/r))),a=Math.floor(655/Math.max(s,1)),L=Math.max(46,Math.min(84,a,Math.round(m*zn)));return{w:m,h:L,fs:Ft(m,L)}},[x,U]),A=x,Q=y.useMemo(()=>{const r=new Set;for(const s of x){const m=[...s.even!=null&&u[String(s.even)]||[],...s.odd!=null&&u[String(s.odd)]||[]];let a;w==="all"?a=m.length>0:w==="ptk"?a=m.some(L=>hs(L,n)):w==="single"?a=V.includes(s.key):a=!1,a&&r.add(s.key)}return r},[x,u,w,V,n]),tt=Q.size;return gs.createPortal(e.jsxs("div",{className:"fixed inset-0 z-50 bg-black/90 flex flex-col bd-print-modal",children:[e.jsxs("div",{className:"no-print flex flex-col p-3 bg-slate-900 border-b border-slate-700 gap-2",children:[e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-2",children:[e.jsxs("div",{className:"text-base font-bold text-slate-100 min-w-0",children:["📋 베이 상세 미리보기 (전체 ",A.length,"베이 · 인쇄 ",tt,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("div",{className:"flex gap-2 print:hidden",children:[e.jsx("button",{onClick:()=>{if(tt===0){alert("인쇄할 베이가 없습니다. 출력 모드(전체/평택분/베이 지정)를 확인하세요.");return}window.print()},className:"bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"🖨 인쇄"}),e.jsx("button",{onClick:()=>{if(tt===0){alert("인쇄할 베이가 없습니다. 출력 모드를 확인하세요.");return}alert('인쇄 창에서 "PDF로 저장" 선택하세요'),setTimeout(()=>window.print(),100)},className:"bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"📄 PDF"}),e.jsx("button",{onClick:async()=>{if(typeof window.XLSX>"u"){const r=document.createElement("script");r.src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js",document.head.appendChild(r),await new Promise(s=>r.onload=s)}try{const r=document.querySelectorAll("table");if(!r.length){alert("테이블 없음");return}const s=window.XLSX.utils.book_new();r.forEach((a,L)=>{const Z=window.XLSX.utils.table_to_sheet(a);window.XLSX.utils.book_append_sheet(s,Z,"Sheet"+(L+1))});const m=os();window.XLSX.writeFile(s,document.title+"_"+m+".xlsx")}catch(r){alert("엑셀 실패: "+r.message)}},className:"bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"📊 엑셀"})]}),e.jsx("button",{onClick:z,className:"p-2 hover:bg-slate-800 rounded",children:e.jsx(ls,{className:"w-5 h-5 text-slate-300"})})]})]}),e.jsxs("div",{className:"flex gap-2 items-center flex-wrap",children:[e.jsx("span",{className:"text-xs text-slate-400 font-bold",children:"출력 모드:"}),e.jsx("button",{onClick:()=>j("all"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="all"?"bg-blue-600 text-white":"bg-slate-800 text-slate-300"}`,children:"📋 전체 일괄"}),e.jsx("button",{onClick:()=>j("ptk"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="ptk"?"bg-amber-600 text-white":"bg-slate-800 text-slate-300"}`,children:"⚓ 평택분만"}),e.jsx("button",{onClick:()=>j("single"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="single"?"bg-purple-600 text-white":"bg-slate-800 text-slate-300"}`,children:"🎯 베이 지정"}),!Vn&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"ml-2 text-xs text-slate-400 font-bold",children:"화면크기"}),e.jsx("button",{onClick:()=>v(r=>Math.max(.15,+(r-.1).toFixed(2))),className:"px-2 py-1.5 rounded text-sm font-black bg-slate-700 text-white",children:"−"}),e.jsxs("span",{className:"text-xs text-slate-300 font-bold mono",style:{minWidth:38,textAlign:"center"},children:[Math.round(P*100),"%"]}),e.jsx("button",{onClick:()=>v(r=>Math.min(3,+(r+.1).toFixed(2))),className:"px-2 py-1.5 rounded text-sm font-black bg-slate-700 text-white",children:"＋"}),e.jsx("button",{onClick:()=>v(.22),className:"px-2 py-1.5 rounded text-xs font-bold bg-slate-600 text-white",children:"맞춤"})]}),w==="single"&&e.jsxs("div",{className:"flex flex-wrap gap-1 items-center",children:[e.jsxs("span",{className:"text-xs text-slate-400",children:["선택(",V.length,"):"]}),x.map(r=>{const s=L=>L>=100?String(L):String(L).padStart(2,"0");let m;r.even!=null&&r.odd!=null?m=`(${s(r.even)})${s(r.odd)}`:r.even!=null?m=s(r.even):m=s(r.odd);const a=V.includes(r.key);return e.jsxs("button",{onClick:()=>{_(a?V.filter(L=>L!==r.key):[...V,r.key])},className:`px-2 py-1 rounded text-xs font-bold ${a?"bg-purple-600 text-white":"bg-slate-700 text-slate-300"}`,children:[a?"✓ ":"",m]},r.key)}),V.length>0&&e.jsx("button",{onClick:()=>_([]),className:"px-2 py-1 rounded text-xs bg-red-700 text-white",children:"전체해제"}),e.jsx("button",{onClick:()=>_(x.map(r=>r.key)),className:"px-2 py-1 rounded text-xs bg-slate-600 text-slate-100",children:"전체선택"})]})]})]}),b&&b._substituted&&e.jsxs("div",{className:"bg-amber-100 border border-amber-600 text-amber-900 px-3 py-2 text-xs",children:["⚠ ",b._substituted.fromCode," 베이정보가 없어 같은 계열 ",b._substituted.usedName?`${b._substituted.usedName}(${b._substituted.usedCode})`:b._substituted.usedCode,"(으)로 대체했습니다. 구조가 미세하게 다를 수 있습니다."]}),e.jsx("div",{ref:T,className:"flex-1 overflow-auto bg-white bd-print-container",onWheel:r=>{r.ctrlKey&&(r.preventDefault(),v(s=>Math.min(3,Math.max(.15,+(s-r.deltaY*.002).toFixed(3)))))},children:e.jsx("div",{className:"bd-zoom-wrap",style:{transform:`scale(${P})`,transformOrigin:"top left",width:P!==1?`${100/P}%`:"100%"},children:A.length===0?e.jsx("div",{className:"p-8 text-center text-slate-500",children:"표시할 베이가 없습니다. (EDI/베이사전에서 베이 정보를 찾지 못함)"}):A.map(r=>{const s=r.even!=null?U[r.even]:U[r.odd];return e.jsx(Gn,{even:r.even,odd:r.odd,bayMap:u,mode:n,voyageInfo:d,voyageKey:h,shipName:c,dictBay:s,dictBaysSummary:U,dictBayDef:(b==null?void 0:b.bayDef)||null,globalRowRange:F,globalTiers:G,colorMap:M,isPrintTarget:Q.has(r.key),uniformCell:N,dictShipMeta:st},r.key)})})}),e.jsx("style",{children:Ds}),e.jsx("style",{children:`
        .bd-cargo-wrap { background: white; padding: 4px 8px; width: 100%; flex: 1 1 0; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; }
        .bd-cargo-wrap .cpv2-bay-section { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
        /* V7.98-15: 베이번호 중복 제거 — bd-title(큰 제목)만 쓰고 BayBoxV2 자체 베이제목은 숨김 */
        .bd-cargo-wrap .cpv2-bay-title-row { display: none !important; }
        .bd-cargo-wrap .cpv2-cell.bd-fill { flex-direction: column; align-items: stretch; justify-content: space-evenly; line-height: 1.15; overflow: hidden; font-weight: normal; padding: 2px 4px; }   /* 3.69-03: 카스피와 같은 보통 굵기(검수사 «선굵기와 글씨 진하기는 카스피와 같게») */
        /* V7.98-15: 셀 내용 중앙정렬 (CASPI 스타일) — 4줄을 가운데로 가지런히 */
        /* 2.98: OOG 도형 — 셀 밖(좌·우 한 칸, 위 한 단)으로 뻗는다. 선만, 채우지 않는다. */
        /* 2.98-01: :has() 대신 셀에 이미 붙는 OOG 클래스로 건다 — :has 가 안 먹으면
           도형이 셀의 overflow:hidden 에 통째로 잘려 «베이플랜은 안보입니다»(검수사 실측).
           그리고 형제 셀의 흰 배경이 나중에 그려져 덮으므로
           z-index 로 올린다 — 둘 중 하나만 빠져도 안 보인다. */
        .bd-cargo-wrap .cpv2-cell[class*="cpv2-oog-"] { overflow: visible; z-index: 3; box-shadow: 0 0 0 0.1875pt #000, inset 0 0 0 0.1875pt #000 !important; }   /* 3.69-03: 굵은 선은 끄되(2.98-04) 칸 선은 다른 칸과 같은 0.375pt — none 이면 FR 칸만 선이 반쪽이 된다(2차 감사) */
        /* 2.98-04: 카고플랜용 «안쪽 굵은 선»(2.97)을 베이상세에서는 끈다 — 도형과 이중이 된다.
           검수사 확정 *"아까 보신대로만 그려 주세요. FR 표기법이 공용 표기법입니다"* —
           선사 베이플랜 원본은 셀 테두리를 굵게 하지 않고 **도형만** 그린다. */
        .bd-cargo-wrap .cpv2-cell .bd-oog { position: absolute; left: -100%; top: -100%; width: 300%; height: 200%; pointer-events: none; z-index: 2; }
        /* 2.98: 안은 **비워 둔다** — 검수사가 실측 숫자를 손으로 적는 자리다(검수사 확정).
           선은 인쇄에서 확실히 보이되 글씨를 방해하지 않을 굵기로. */
        .bd-cargo-wrap .cpv2-cell .bd-oog polygon,
        .bd-cargo-wrap .cpv2-cell .bd-oog rect { fill: none; stroke: #000; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
        .bd-cargo-wrap .cpv2-cell .bd-cell-lines { display: flex; flex-direction: column; width: 100%; height: 100%; font-size: 8pt; font-family: 'Courier New', monospace; line-height: 1.15em; align-items: stretch; justify-content: space-evenly; }   /* ★ 3.46-01: «수»가 아니라 «길이» — 아래 주석 */
        .bd-cargo-wrap .cpv2-cell .bd-cell-lines > div { white-space: nowrap; overflow: hidden; text-overflow: clip; width: 100%; padding: 0; }   /* V8.25-05: text-align 제거 — 줄별 정렬(bd-r2 좌/ bd-r4·r5 중앙)이 살도록 */
        /*  ★ 3.69-04 — 카스피 칸 안 배치(26척 실측) — **고정 칸 격자(bd-uniform)에만** 건다.
            14글자 폭 덩어리 한 열을 칸 한가운데에 놓고, 다섯 줄은 그 열의 같은 왼쪽 선에서 시작한다.
            글자 크기는 칸 크기로 계산한 --bdc-fs(bdCellPt). 줄 간격은 «길이»(글자 × 1.067) — 3.46-01: 4번째 줄 글꼴이 작아져도 줄 자리는 안 움직인다.
            열 폭 = 14글자(줄마다 최소 폭) ~ 칸 폭 − 3pt(fit-content) — 컨번호 없는 부킹 자리(«__SLOT_…»)처럼 줄이 비정상으로 길어도
            덩어리가 칸 밖으로 밀리지 않고 좌우 1.5pt 를 남긴다(긴 줄 끝만 잘린다 · 2차 감사).
            isolation — X-RAY 노란 띠(::before, z-index −1)가 흰 칸 바탕 위·글자 아래에 그려지게. 이것이 빠지면 띠가 칸 바탕 밑에 깔려 안 보인다.
            ⚠ 사전에 칸 수(deckCells)가 없어 칸 폭이 글자로 정해지는 격자(bd-uniform 아님)에는 걸지 않는다 — 3줄이 14자가 되면
              칸이 93.2px → 97.5px 로 넓어진다(2차 감사 실측 23척). «셀크기는 절대 변경하면 안됩니다». */
        .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines { display: grid; grid-template-columns: fit-content(calc(100% - 3pt)); justify-content: safe center; align-content: safe center; font-size: var(--bdc-fs, 8pt); line-height: calc(var(--bdc-fs, 8pt) * ${Ct}); isolation: isolate; }
        .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > div { white-space: pre; width: auto; min-width: ${kt}ch; }   /* pre — 카스피 글자열의 빈칸(«KAN/   *VNS» · «F 4.4») 그대로 */
        .bd-cargo-wrap .cpv2-cell .bd-line3 { font-size: 7.5pt; letter-spacing: -0.2px; }
        .bd-cargo-wrap .cpv2-cell .bd-pos { font-size: 7.5pt; color: inherit; }
        /* ── V8.98-14: 카스피식 고정격자 (bd-uniform) ─────────────────────────
           원리: 셀 폭·행 높이를 항차 공통 CSS 변수(--bdc-w/--bdc-h)로 완전 고정.
           · flex 채움 폐기(행/영역 flex: none) → 페이지·행·베이 간 크기 동일
           · 모든 칸(점유/빈/비활성) 동일 고정폭 → padding·border 가산 불균일 소멸
           · 격자·라벨·해치는 가운데 정렬, 남는 공간은 여백 (카스피 양식) */
        /* 세로 중앙: auto 마진 (공간 부족 시 0으로 접혀 위 잘림 없음 — safe center) */
        .bd-cargo-wrap.bd-uniform .cpv2-bay-section { flex: 0 0 auto; margin-top: auto; margin-bottom: auto; }
        .bd-cargo-wrap.bd-uniform .cpv2-bay-content { flex: 0 0 auto; }
        .bd-cargo-wrap.bd-uniform .cpv2-deck-area,
        .bd-cargo-wrap.bd-uniform .cpv2-hold-area,
        .bd-cargo-wrap.bd-uniform .cpv2-grid-row-wrap { flex: 0 0 auto !important; }
        .bd-cargo-wrap.bd-uniform .cpv2-grid-row-wrap { justify-content: center; }
        .bd-cargo-wrap.bd-uniform .cpv2-grid { flex: 0 0 auto; min-width: 0; }
        .bd-cargo-wrap.bd-uniform .cpv2-tier-row {
          flex: 0 0 var(--bdc-h);
          min-height: var(--bdc-h); max-height: var(--bdc-h);
        }
        .bd-cargo-wrap.bd-uniform .cpv2-tier-row > * {
          flex: 0 0 var(--bdc-w) !important;
          width: var(--bdc-w); min-width: var(--bdc-w); max-width: var(--bdc-w);
          box-sizing: border-box;
        }
        .bd-cargo-wrap.bd-uniform .cpv2-tier-row .cpv2-cell-empty { border: 0.5px solid transparent; }
        /*  ★ 3.69-03 — 선 굵기는 카스피 도면 값 그대로(ATRP2622EBAY.pdf 칸 선 0.375pt 검정 · 해치 막대 1.8pt).
            검수사 2026-09-29 «선굵기와 글씨 진하기는 카스피와 같게 해주세요».
            ⚠ border 는 1px 아래로 못 내린다(크롬이 0.375pt 를 0.75pt 로 올림 — PDF 실측). 그래서 테두리 대신
              바깥·안쪽 그림자를 반씩(0.1875pt) 깐다 — 이웃 칸의 반쪽과 같은 자리에 겹쳐 0.375pt 한 줄이 된다.
            ⚠ 그림자는 칸 크기에 안 들어간다 — 칸 크기는 그대로다(3.46-01 «셀크기는 절대 변경하면 안됩니다»). */
        .bd-cargo-wrap .cpv2-tier-row .cpv2-cell { border: none; box-shadow: 0 0 0 0.1875pt #000, inset 0 0 0 0.1875pt #000; }
        .bd-cargo-wrap .cpv2-hatch-seg { border-top: none; height: 0; margin: 0 0.9pt; box-shadow: 0 0 0 0.9pt #000; }   /* 좌우 0.9pt 를 들여 그림자 번짐만큼 — 커버 사이 틈(4px)은 그대로 */
        /*  ⚠ 테두리(인쇄 1px)를 없애 칸 안쪽 상자가 가로·세로 2px 커졌다. FR 도형(.bd-oog)은 그 상자 기준 %라
              꼭짓점이 옆 칸 한가운데에서 서로 닿아 «X» 가 됐다(2차 감사 실측 — STMJ 2659E 10쪽).
              2.98-06 확정 «> < 로 마주보되 닿지 않는다» 를 지키려고 옛 상자(테두리 1px 안쪽) 기하로 되돌린다. */
        .bd-cargo-wrap .cpv2-tier-row .cpv2-cell .bd-oog { left: calc(-100% + 3px); top: calc(-100% + 3px); width: calc(300% - 6px); height: calc(200% - 4px); }
        .bd-cargo-wrap .cpv2-row-labels, .bd-cargo-wrap .cpv2-tier-labels { color: #000; }
        .bd-cargo-wrap.bd-uniform .cpv2-cell.bd-fill { padding: 0; }
        .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines { padding: 0; box-sizing: border-box; }   /* 3.69-04: 여백은 덩어리 가운데 놓기가 만든다(카스피와 같은 계산) */
        .bd-cargo-wrap.bd-uniform .cpv2-row-labels { justify-content: center; margin-right: 12px; }   /* 5.15: 단 번호 칸 16→12px 과 짝 */
        .bd-cargo-wrap.bd-uniform .cpv2-row-labels > span {
          flex: 0 0 var(--bdc-w); min-width: var(--bdc-w); max-width: var(--bdc-w);
        }
        .bd-cargo-wrap.bd-uniform .cpv2-tier-labels > span { flex: 0 0 var(--bdc-h); }
        .bd-cargo-wrap.bd-uniform .cpv2-hatch-break {
          width: calc(var(--bdc-w) * var(--bdc-gc) + 12px);   /* 5.15: 단 번호 칸 12px */
          margin: 3px auto;
        }
        @media print {
          .bd-cargo-wrap { box-shadow: none !important; margin: 0 !important; }
        }
      `}),e.jsx("style",{children:`
        /* M4.9d-fix: 베이상세 인쇄 — 좌우 짤림 종합 픽스
           1. box-sizing: border-box 전역 적용 (padding/border가 width에 포함되어 폭 초과 방지)
           2. visibility 토글 패턴으로 메인 화면 숨김 (M4.9c)
           3. @page margin 0.5cm — 폰/프린터 자체 minimum margin 절충
           4. 셀 폰트/패딩 축소로 11자리 컨번호 안전 표시 */
        @media print {
          /* V7.01: 화면 확대/축소는 인쇄에 영향 없게 — scale 무시 */
          .bd-zoom-wrap {
            transform: none !important;
            width: 100% !important;
          }
          /* 0. 모든 요소에 box-sizing 강제 — padding/border 폭 초과 방지 */
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          /* 1. 모든 컨텐츠 숨김 */
          body * {
            visibility: hidden !important;
          }
          /* 2. 인쇄 모달과 그 자식만 보이게 */
          .bd-print-modal,
          .bd-print-modal * {
            visibility: visible !important;
          }
          /* 3. 모달 위치 절대 좌상단 — width 100% 명시로 페이지 폭에 맞춤 */
          .bd-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }
          .bd-print-container {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            flex: none !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .bd-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            /*  ★ 3.69-03 — 머리 줄(선박명·VOY·POL)이 종이 끝 3.9mm 에 붙어 프린터가 못 찍었다(검수사 2026-09-29
                «베이상세는 윗부분 항차 부분이 잘렸습니다»). @page 0.3cm 에 쪽 안 여백 5mm 를 더해 8~9mm 안으로.
                border-box 라 쪽 크기(291×204mm)와 칸 크기는 그대로다. */
            padding: 5mm 5mm 0 5mm !important;
            margin: 0 !important;
            border-bottom: none !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .bd-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* V7.98-13: 인쇄 제외 베이는 인쇄에서만 숨김 (화면엔 보임) */
          .bd-page.bd-noprint { display: none !important; }
          /* 페어 짝꿍으로 인쇄 대상이 마지막일 때 빈 페이지 방지 — noprint 다음의 마지막 출력 페이지 */
          /*  ★ 3.69-03 — 위 5mm 를 들인 만큼 큰 베이(PCSZ·STMJ BAY19·21·23 — 데크+홀드)는 격자가 내려와
              아래 줄번호가 종이 끝 5.4mm 까지 내려왔다(옛 8.0mm, 실항차 PDF 실측). 머리·베이번호 글자 크기와 순서는
              그대로 두고 줄 높이만 1.15 로 좁혀 아래를 7.5mm 로 되찾는다. 칸 크기는 안 바뀐다(고정 격자 실측). */
          .bd-header, .bd-title { line-height: 1.15 !important; }
          /* 폰/프린터 minimum margin 대응 */
          @page { size: A4 landscape; margin: 0.3cm; }
        }
        .bd-page {
          color: black; background: white;
          font-family: Arial, sans-serif;
          padding: 4px 8px;
          border-bottom: 1px dashed #ddd;
          /* M5.37: 페이지 고정 + flex column → 선박별 티어/로우 수에 따라 셀이 자동 분배 */
          width: 291mm;
          min-height: 204mm;
          height: 204mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          page-break-after: always;
          position: relative;
        }
        /* V7.98-13: 화면에서 인쇄 제외 베이는 살짝 흐리게 (보이되 구분). 인쇄엔 영향 없음 */
        .bd-page.bd-noprint { opacity: 0.45; background: #fafafa; }
        .bd-noprint-badge {
          position: absolute; top: 6px; right: 8px; z-index: 2;
          background: #64748b; color: #fff; font-size: 10pt; font-weight: 700;
          padding: 2px 8px; border-radius: 4px;
        }
        .bd-title {
          text-align: center; font-size: 20pt; font-weight: 500;
          margin-top: 2px; margin-bottom: 3px;   /* 2.91-01: 머리 밑줄 아래로 내려왔다 */
          flex-shrink: 0;
        }
        .bd-header {
          /* 2.92-01 (검수사 «베이 정중앙에 베이넘버가 있는데 위에 항차수는 벗어나 보입니다») —
             space-between 은 세 칸의 **글자 길이**로 위치가 정해져 가운데 칸이 진짜 중앙이 아니다.
             선박명·항구 칸을 같은 폭으로 잡고 항차를 그 사이 정중앙에 세운다 — 아래 BAY 번호와 한 줄로 맞는다. */
          display: flex; align-items: baseline;
          font-size: 10pt; margin-bottom: 3px;
          flex-shrink: 0;
        }
        .bd-header > span:nth-child(1) { flex: 1 1 0; text-align: left; }
        .bd-header > span:nth-child(2) { flex: 0 0 auto; text-align: center; }
        .bd-header > span:nth-child(3) { flex: 1 1 0; text-align: right; }
        .bd-row-labels-top, .bd-row-labels-bot {
          display: flex; justify-content: space-evenly;
          font-size: 7pt;
          margin: 1px 4px;
          flex-shrink: 0;
        }
        .bd-rl { flex: 1; text-align: center; }
        /* M5.37: 그리드가 페이지 안 빈 세로 공간 자동 차지 */
        .bd-grid-wrap {
          display: flex; align-items: stretch;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
        }
        .bd-grid {
          flex: 1;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        /* M6.30: 셀 높이 CSS 변수로 통합 — 한 곳만 바꾸면 셀+tier 라벨 자동 동기화
           --bd-row-h: 셀 한 행 높이 (인쇄 기준).
           셀 안 텍스트 4-5줄 (CNT/PTK, 컨번호, ISO/무게, 실번호, 위치) 들어가도록 충분히 크게.
           7pt × 1.05 × 5줄 ≈ 49px + padding/border ≈ 52px */
        .bd-grid-wrap, .bd-tier-labels {
          --bd-row-h: 52px;
        }
        .bd-tier-row {
          display: grid;
          border: none;   /* 3.69-03: 칸마다 선을 그리므로 줄 테두리는 겹친다 */
          flex: 1 1 0;                  /* M6.94.17: 페이지 세로 가득 채움 (고정 52px→동적). tier 적은 베이 여백 제거 */
          min-height: var(--bd-row-h);  /* 텍스트 4-5줄 최소 보장 */
          box-sizing: border-box;
        }
        .bd-cell {
          border: none;   /* 3.69-03: 카스피 선 — 0.375pt 검정 한 줄(위 매트릭스 격자와 같은 그림자 방식) */
          box-shadow: 0 0 0 0.1875pt #000, inset 0 0 0 0.1875pt #000;
          padding: 1px 2px;
          font-size: ${Mt}pt;
          line-height: calc(${Mt}pt * ${Ct});   /* ★ 3.46-01: «수»가 아니라 «길이» — 아래 주석 · 3.69-04 카스피 줄 간격 */
          font-family: 'Courier New', monospace;
          overflow: hidden;
          min-width: 0;
          /* M6.32: 단어 절대 안 깨짐 — "DC20", "BEAU2917911" 한 단위 유지
             기존 anywhere가 keep-all을 무력화 → "DC"와 "20" 분리 발생
             변경: normal — 공백/하이픈에서만 wrap, 단어 내부는 절대 안 깨짐
             단어가 셀 폭보다 길면 overflow: hidden으로 잘림 (4줄 보장 우선) */
          word-break: keep-all;
          overflow-wrap: normal;
          height: 100%;
          box-sizing: border-box;
          /* 3.69-04: 폴백 격자도 카스피 배치 — 14글자 폭 덩어리를 칸 가운데(칸이 더 좁으면 칸 폭), 다섯 줄 같은 왼쪽 선.
             글자 크기는 칸 크기가 쪽마다 달라 계산하지 않고 종전 7pt 그대로 둔다. */
          display: grid;
          grid-template-columns: fit-content(calc(100% - 3pt));
          justify-content: safe center;
          align-content: safe center;
          position: relative;
          isolation: isolate;
          font-weight: normal;   /* 3.69-03: 카스피와 같은 보통 굵기 */
        }
        /* M6.32: 셀 안 각 줄도 한 줄 보장 — 한 항목이 두 줄로 안 나뉨. 3.69-04: pre — 카스피 글자열 빈칸 그대로 */
        .bd-cell > div {
          white-space: pre;
          overflow: hidden;
          text-overflow: clip;
          min-width: ${kt}ch;
        }
        /* V8.25-04: 5줄 분배 — 줄1 양끝, 줄3 3등분, 컨번호 좌측, 온도·위치 중앙.
           3.69-04: 칸 폭이 글자로 정해지는 매트릭스 격자(bd-uniform 아님)에만 남는다 — 그 칸 크기를 안 바꾸려고. */
        .bd-cargo-wrap .cpv2-cell .bd-r1, .bd-cargo-wrap .cpv2-cell .bd-r3 { display: flex; flex-direction: row; justify-content: space-between; width: 100%; }
        .bd-cargo-wrap .cpv2-cell .bd-r2 { text-align: left; letter-spacing: 0.3px; }
        .bd-cargo-wrap .cpv2-cell .bd-r4, .bd-cargo-wrap .cpv2-cell .bd-r5 { text-align: center; }
        .bd-cargo-wrap .cpv2-cell .bd-r1, .bd-cargo-wrap .cpv2-cell .bd-r3, .bd-cargo-wrap .cpv2-cell .bd-r4, .bd-cargo-wrap .cpv2-cell .bd-r5 { letter-spacing: 0.7px; }
        /* ★ 3.69-04: 다섯 줄 모두 같은 왼쪽 선 · 자간 0 — 카스피 실측(26척). 고정 칸 격자와 폴백 격자(.bd-cell — 칸 폭은 줄 격자가 정한다)에 건다.
           종전 V8.25-04 «줄1 양끝 · 줄3 3등분 · 줄4·5 가운데 · 자간 0.7px» 는 줄마다 시작 자리가 달라 어수선했다(검수사 «조잡해 보인다»). */
        .bd-cell > .bd-r1, .bd-cell > .bd-r2, .bd-cell > .bd-r3, .bd-cell > .bd-r4, .bd-cell > .bd-r5,
        .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r1, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r2, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r3, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r4, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r5 { display: block; width: auto; text-align: left; letter-spacing: 0; }
        /*  ★ 3.46 — 4번째 줄(X-RAY 봉인번호 · IMDG · 리퍼 온도)이 칸을 넘으면 **조용히 잘린다**
            (.bd-cell-lines > div 가 overflow:hidden). 그래서 길이에 따라 줄여 담는다.
            ⚠ (칸 폭이 글자로 정해지는 격자) 자간이 0.7px 로 벌어져 있어 등급마다 자간도 같이 좁힌다 — 글꼴만 줄이면 모자란다.
              고정 칸 격자·폴백 격자(3.69-04)는 자간 0 이라 글꼴 크기만 0.5pt씩 줄인다(MID_PT_OF).
            ⚠ 선택자는 두 격자(.bd-cell = 폴백 · .cpv2-cell = 매트릭스)에 **둘 다** 건다.
              이 파일의 옛 .bd-line3/.bd-pos 규칙은 JSX 가 내는 클래스(bd-r3·bd-r5)와 안 맞아 죽어 있다. */
        /*  ★ 3.46-01 — **칸 안 다섯 줄의 자리는 X-RAY 가 붙어도 안 움직인다.**
            검수사 2026-09-14 «셀크기가 바뀌면 안되는데 바뀌었네요 셀크기는 절대 변경하면 안됩니다. 어렵게 맞춰 논것이라».
            3.46 초판은 4번째 줄 글꼴만 줄였는데, 위 두 곳의 line-height 가 «수»(1.15 · 1.1) 라
            자식마다 **자기 글꼴로 다시 계산**됐다. 그래서 그 줄 상자까지 같이 작아지고
            space-evenly 가 남는 자리를 나머지 네 줄에 나눠 줬다
            (크로뮴 실측 MCSC — 줄 높이 8.8px 가 전부 9.28px 로, 자리는 최대 1.45px 이동).
            ⇒ «길이»(1.15em · 1.1em) 로 주면 계산된 절대값이 그대로 상속돼 글꼴과 무관하게 같은 높이를 쓴다.
              글꼴이 같은 나머지 네 줄은 계산값이 종전과 똑같아 아무것도 안 변한다.
            ⚠ 커스텀 속성(--bd-lh: 1.15em)으로 푸는 길은 **안 된다** — 속성 안의 em 은 선언한 쪽이 아니라
              **쓰는 쪽(자식)** 글꼴로 풀려서 6.3pt 기준 9.66px 가 나왔다(크로뮴 실측). */

        /*  ⚠ 격자마다 바탕 글꼴이 다르다 — 고정 칸 격자는 칸 크기로 계산(6~8.5pt) · 폴백 7pt · 칸 폭이 글자로 정해지는 격자 8pt.
            4번째 줄을 줄일 때는 «바탕보다 크지 않게»(MID_PT_OF 가 바탕에서 시작) · 6pt 아래로는 안 내려간다. */
        /*  ★ 3.46-01 — **봉인번호가 적힌 그 줄만 노란 바탕.**
            검수사 2026-09-14 «그부분만 바탕에 노란색 처리 해주세요 흑백으로 인쇄해도 구분이 되게».
            색은 검수 리스트의 X-RAY 노랑과 **같은 한 벌**(inspectionList COLOR.xray = #ffe066) —
            같은 배 같은 표식이 종이마다 다른 색이면 안 된다.
            ⚠ print-color-adjust: exact — 브라우저 인쇄는 기본적으로 배경색을 **안 찍는다**.
              이것이 없으면 화면엔 노랗고 종이엔 하얗게 나가 «흑백에서 구분» 이 아예 성립하지 않는다.
            ⚠ 바탕색만 바꾼다 — 여백·테두리를 주면 칸 안 줄 자리가 움직인다(그게 이 판의 사고였다).
            ★ 3.69-04 — 줄이 14글자 폭 덩어리 안에 들어가 좁아졌다. 노랑은 종전처럼 **칸 폭 전체**(좌우 1.5pt 안쪽)에
              깔리도록 줄 상자 대신 ::before 띠로 칠한다. 칸(.cpv2-cell · .bd-cell)이 기준 상자이고 높이는 줄 간격 한 줄이다. */
        .bd-cargo-wrap .cpv2-cell .bd-r4.xr {   /* 칸 폭이 글자로 정해지는 격자 — 3.69-03 그대로 줄 상자를 칠한다 */
          background: #ffe066;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .bd-cell > .bd-r4.xr, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r4.xr {
          background: none;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .bd-cell > .bd-r4.xr::before, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r4.xr::before {
          content: ''; position: absolute; left: 1.5pt; right: 1.5pt; z-index: -1;
          height: calc(var(--bdc-fs, 8pt) * ${Ct});
          background: #ffe066;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .bd-cell > .bd-r4.xr::before { height: calc(${Mt}pt * ${Ct}); }
        /*  옛 등급(칸 폭이 글자로 정해지는 격자 전용 · midFitLegacy) — 고정 칸 격자·폴백 격자는 JSX 가 글자 크기를 인라인으로 준다.
            ⚠ 바닥에서는 **글꼴 대신 자간을 좁힌다.** 실봉인 최장 「DJHN225094」(10자)에 리퍼 온도가 겹치면 17자가 되는데
            6.3pt·자간 -0.1px 로는 84px 라 79px 칸을 넘어 조용히 잘렸다(3.46 감사·연막 실측). */
        .bd-cargo-wrap .cpv2-cell .bd-r4.x2 { font-size: min(7.2pt, 1em); letter-spacing: 0.1px; }
        .bd-cargo-wrap .cpv2-cell .bd-r4.x3 { font-size: min(6.3pt, 0.92em); letter-spacing: -0.45px; }
        /*  ★ 3.69-04 — 14폭을 넘는 4번째 줄(봉인번호 + 온도 · DG)은 칸 한가운데에 둔다. 줄 상자는 덩어리 폭(열) 그대로 두고
            (폭 0 · 최소 100% — 긴 줄이 덩어리를 넓혀 다른 네 줄을 밀지 않게) 글자만 양옆으로 고르게 넘친다.
            글자 크기는 JSX 가 인라인으로 준다(MID_PT_OF — 칸 폭 − 3pt 안에 들 때까지 0.5pt씩, 6pt 바닥). */
        .bd-cell > .bd-r4.wide, .bd-cargo-wrap.bd-uniform .cpv2-cell .bd-cell-lines > .bd-r4.wide { width: 0; min-width: 100%; display: flex; justify-content: center; overflow: visible; }
        .bd-cell .bd-r5, .bd-cargo-wrap .cpv2-cell .bd-r5 { color: #000; }   /* 3.69-03: 카스피는 칸 글씨가 전부 검정 */
        /* M6.33: 3번째 줄(상태+무게+규격)만 폰트 축소 — 정보 밀도 높아 한 줄에 안 들어감
           예: "C_K E 2.2 DC20" → 14자 + 공백 → 6pt로 줄여서 한 줄 보장 */
        .bd-cell .bd-line3 {
          font-size: 6pt;
          letter-spacing: -0.2px;
        }
        .bd-cell.empty { background: white; }
        .bd-cell.filled.ptk { background: white; }   /* 3.69-03: 바탕은 흰색 */
        .bd-cell.filled { background: white; }
        .bd-pos { color: #555; }
        .bd-hatch {
          height: 4px; margin: 2px 0; display: flex; gap: 6px;
        }
        .bd-hatch-seg { flex: 1 1 0; height: 0; margin: 2px 0.9pt 0; box-shadow: 0 0 0 0.9pt #000; }   /* 3.69-03: 카스피 해치 막대 1.8pt — 좌우 0.9pt 들여 커버 사이 틈 그대로 */
        .bd-tier-labels {
          display: flex; flex-direction: column;
          padding-left: 6px;
          font-size: 9pt;
          flex-shrink: 0;
        }
        /* tier 라벨 높이도 셀 행과 동일하게 flex로 동기화 (M6.94.17) */
        .bd-tier-labels span {
          flex: 1 1 0;
          min-height: var(--bd-row-h);
          display: flex; align-items: center; justify-content: center;
        }
        .bd-tier-gap { height: 8px !important; }
      `})]}),document.body)}function Zn({voyage:t,voyageKey:n,onClose:d,initialMode:f="discharge",isLolo:c=!1,inspector:h="",viewDeckPlan:E=null,onXrayPrint:G=null,xrayPrintOk:z=!1,autoAction:H=null,rfSkip:it=!1}){var Ht,Bt,It,Gt,Vt,Ut,Yt,Xt,Wt,Zt,Jt,qt,Qt,te,ee,se,ne,re,ie,le,oe,ae,de,ce,pe,he,be,fe,me,ue,xe,ge,we,Se,Ne,Ce,je,ke,_e,Pe,Ee,Me,Te,Oe,Re,Ae,$e,Le,De,Fe,ye,ze,ve,Ke,He,Be,Ie,Ge,Ve,Ue;const[p,w]=y.useState(((Bt=(Ht=t==null?void 0:t.loading)==null?void 0:Ht.info)==null?void 0:Bt.voy)||""),[j,V]=y.useState(((Gt=(It=t==null?void 0:t.discharge)==null?void 0:It.info)==null?void 0:Gt.voy)||""),[_,P]=y.useState(((Vt=t==null?void 0:t.info)==null?void 0:Vt.berth)||((Yt=(Ut=t==null?void 0:t.discharge)==null?void 0:Ut.info)==null?void 0:Yt.berth)||""),v=(()=>{try{return Vs(h,Us(h))||Ys(h)}catch{return!1}})(),[S,T]=y.useState(f==="loading"?"loading":"discharge"),[M,R]=y.useState(H==="cargo"?"cargo-v2":H==="detail"?"detail":null),F=()=>{H?d():R(null)},u=(t==null?void 0:t[S])||{},q=u.ediContainers||{},b=u.records||{},et=u.completed||{},U=u.xrayList||{},st=u.xraySeals||{},l=y.useMemo(()=>Xs(Zs(u),Ws(t)),[(Wt=(Xt=u==null?void 0:u.raw)==null?void 0:Xt.edi)==null?void 0:Wt.uploadedAt,(Jt=(Zt=u==null?void 0:u.raw)==null?void 0:Zt.edi)==null?void 0:Jt.sizeBytes,q,t==null?void 0:t.swapFix]),x=y.useMemo(()=>Js(n,t),[(te=(Qt=(qt=t==null?void 0:t.discharge)==null?void 0:qt.raw)==null?void 0:Qt.edi)==null?void 0:te.uploadedAt,(ne=(se=(ee=t==null?void 0:t.loading)==null?void 0:ee.raw)==null?void 0:se.edi)==null?void 0:ne.uploadedAt,(le=(ie=(re=t==null?void 0:t.discharge)==null?void 0:re.raw)==null?void 0:ie.edi)==null?void 0:le.sizeBytes,(de=(ae=(oe=t==null?void 0:t.loading)==null?void 0:oe.raw)==null?void 0:ae.edi)==null?void 0:de.sizeBytes,n,t==null?void 0:t.swapFix,(pe=(ce=t==null?void 0:t.restowList)==null?void 0:ce._meta)==null?void 0:pe.at,(he=t==null?void 0:t.info)==null?void 0:he.berthShift,t==null?void 0:t.shiftManual]),N=y.useMemo(()=>{try{return qs(n,t)}catch(o){return console.warn("[4.16 출력 센터] 예측 시프팅 지도 실패 — 확정만 그립니다:",o),x}},[x,n,(be=t==null?void 0:t.info)==null?void 0:be.berthShift,(fe=t==null?void 0:t.info)==null?void 0:fe.terminalStatus,(me=t==null?void 0:t.info)==null?void 0:me.lane,(ge=(xe=(ue=t==null?void 0:t.discharge)==null?void 0:ue.raw)==null?void 0:xe.edi)==null?void 0:ge.uploadedAt,(Ne=(Se=(we=t==null?void 0:t.discharge)==null?void 0:we.raw)==null?void 0:Se.edi)==null?void 0:Ne.sizeBytes,t==null?void 0:t.keepOnboard]),A=y.useMemo(()=>Qs(n,t,N),[N,n,(Ce=t==null?void 0:t.info)==null?void 0:Ce.berthShift,(je=t==null?void 0:t.info)==null?void 0:je.terminalStatus,(_e=(ke=t==null?void 0:t.restowList)==null?void 0:ke._meta)==null?void 0:_e.mailAt,(Ee=(Pe=t==null?void 0:t.restowList)==null?void 0:Pe._meta)==null?void 0:Ee.at,(Oe=(Te=(Me=t==null?void 0:t.discharge)==null?void 0:Me.raw)==null?void 0:Te.edi)==null?void 0:Oe.uploadedAt,($e=(Ae=(Re=t==null?void 0:t.loading)==null?void 0:Re.raw)==null?void 0:Ae.edi)==null?void 0:$e.uploadedAt,(Fe=(De=(Le=t==null?void 0:t.discharge)==null?void 0:Le.raw)==null?void 0:De.edi)==null?void 0:Fe.sizeBytes,(ve=(ze=(ye=t==null?void 0:t.loading)==null?void 0:ye.raw)==null?void 0:ze.edi)==null?void 0:ve.sizeBytes]),Q=new Set(Object.keys(x||{}).filter(o=>o&&!o.startsWith("_"))),tt=S==="discharge"?Lt(t,Q):null,r=!!(tt&&tt.basis!=="edi"),s=o=>!o||o.cn&&Je(Q,b,S,o.cn)?!1:r?!!(o.cn&&tt.set.has(o.cn)):o.cn&&b[o.cn]?!0:S==="discharge"?un(o)?!1:!o.pod||jt(o.pod):!o.pol||jt(o.pol),m=new Set(["pol","pod","npod","fpod","bay","row","tier","pos","iso","fe","rf","fr","ot","tk","dg","oog","voy","vsl"]),a=tn(l),Z=[...new Set([...Object.keys(a),...Object.keys(b),...r?tt.set:[]])].map(o=>{const C=a[o]||(b[o]||!r?{}:ds(t,o)),X=b[o]||{},I=!!a[o],W={...C};return Object.entries(X).forEach(([D,lt])=>{var Ye;if(lt===""||lt==null)return;if(I&&X.iso_pick&&(D==="iso"||D==="rf"||D==="fr"||D==="ot"||D==="tk")){W[D]=lt;return}const xs=(D==="rf"||D==="fr"||D==="ot"||D==="tk"||D==="dg"||D==="oog")&&lt===!0&&C[D]!==!0;if(!(D==="tmp_missing"&&lt===!0&&C.tmp)){if(I&&X.pod_pick&&D==="pod"){W.pod=lt;return}if(D==="pol"&&I){if(S!=="discharge"||!C.pol)return;const wt=ps(C.pol,lt,C.pod);wt!==C.pol&&(W.pol=wt);return}if(!(I&&m.has(D)&&!xs&&!(en.has(D)&&sn(C,D)))){if(D==="wt"){const wt=nn(lt);wt>0&&(W.wt=wt);return}if(D==="op"){W.op=cs(lt,C&&C.op,(Ye=t==null?void 0:t.info)==null?void 0:Ye.vsl);return}W[D]=lt}}}),I&&X.iso_pick&&(W.oog=rn(X,C.oog)),W.cn=I&&!C.cn&&!b[o]?`__SLOT_${C.bay||""}_${C.row||""}_${C.tier||""}_${o}`:o,I&&!C.cn&&!b[o]&&(W.pendingCn=!0,W._slot=!0),W._src=I?b[o]?"both":"edi":"list",W._comp=et[o]||null,b[o]&&(W._inList=!0),U[o]&&(W._xray=!0,W._xraySealNo=String((st[o]||{}).seal||"").trim()),r?ln(W,tt):W}),$=(Ke=t==null?void 0:t.info)==null?void 0:Ke.forecast,i=new Set(Array.isArray($==null?void 0:$.urgentCns)?$.urgentCns:[]),g=new Set(Array.isArray($==null?void 0:$.luggageCns)?$.luggageCns:[]),O=new Set((Array.isArray($==null?void 0:$.specialCns)?$.specialCns:[]).map(o=>String(o||"").trim().toUpperCase()).filter(Boolean)),k=on(Z,i,g,($==null?void 0:$.luggageSeals)||null,O),K=o=>{if(!o)return"";const C=o.bay||(o.pos?String(o.pos).slice(0,3):"");return C?String(C).padStart(3,"0").slice(0,3):""},J=o=>{if(!o)return"";const C=Dt(o);if(C.inStorage)return"";const X=C.bay||(o.pos?String(o.pos).slice(0,3):"");return X?String(X).padStart(3,"0").slice(0,3):""},nt=o=>!!(o&&o.cn&&x&&x[o.cn]),B=new Set;k.forEach(o=>{if(!s(o)&&!nt(o))return;const C=J(o);C&&C!=="000"&&B.add(C)});const Y=k.filter(o=>{const C=K(o);return C&&C!=="000"}),ot=k.filter(o=>{const C=J(o);return C&&B.has(C)}),dt=as(String(((He=t==null?void 0:t.info)==null?void 0:He.vsl)||"").toUpperCase(),k.map(o=>o&&o.op)),ct=k.filter(s).map(o=>{const C=o&&o.op?dt(o.op):null;return C&&C!==o.op?{...o,op:C}:o}),at=Xe(ct);let xt=0,gt=0;const ht=new Set;ot.forEach(o=>{const C=Dt(o);if(C.row){const X=parseInt(C.row);X>0&&(X%2===0?xt=Math.max(xt,X):gt=Math.max(gt,X))}C.tier&&ht.add(C.tier)});const pt={maxLeft:xt,maxRight:gt},_t=Array.from(ht),rt=(t==null?void 0:t.info)||{},Pt=rt.imo||"",ft=rt.vsl||"",Ot=at.length;k.length;const Rt=S==="discharge"?"양하":"선적",vt=o=>{if(o===S)return at.length;if(o==="discharge")return Lt(t,Q).set.size;const C=(t==null?void 0:t[o])||{},X=C.ediContainers||{},I=C.records||{},W=[];return Object.entries(X).forEach(([D,lt])=>{lt&&W.push({...lt,_src:I[D]?"both":"edi",_inList:!!I[D]})}),Object.keys(I).forEach(D=>{X[D]||W.push({...I[D]||{},cn:D,_src:"list",_inList:!0})}),Xe(W).filter(D=>{if(D.cn&&Je(Q,I,o,D.cn))return!1;if(D._inList)return!0;const lt=o==="discharge"?D.pod:D.pol;return!lt||jt(lt)}).length},ms=vt("discharge"),us=vt("loading"),At=(o=!1)=>{if(Ot===0){alert(`${Rt} 컨테이너가 없습니다`);return}let C={};try{C=xn(n,t,null,{confirmed:x})||{}}catch(I){console.warn("[4.48 출력 센터] 본선 잔류 예보 실패 — 별첨2 는 확정만 싣습니다:",I),C={}}const X=gn({...x,...C},l,t);if(o===!0){let I=null;try{I=wn(t,S)}catch(W){console.warn("[4.75 제출용] 작업 표기를 만들지 못했습니다 —",W),alert("작업 표기를 만들지 못해 제출용을 열지 못했습니다.");return}if(!I||!Object.keys(I.byCn).length){alert("앱으로 직접 입력한 호기가 없어 체크할 컨이 없습니다. 제출용을 열지 않습니다.");return}qe(at,S,rt,[],{appendix:!1,submit:!0,marks:I,noReefer:it});return}qe(at,S,rt,X,{appendix:v,noReefer:it})},Kt=y.useRef(!1);if(y.useEffect(()=>{H!=="inspection"||Kt.current||(Kt.current=!0,At(),d())},[]),M==="cargo")return R("cargo-v2"),null;if(M==="cargo-v2"){const o=c||/RZOR|RIZHAO/i.test(`${((Be=t==null?void 0:t.info)==null?void 0:Be.vsl)||""} ${n||""}`),C=Array.isArray((Ie=u.stowagePlan)==null?void 0:Ie.decks)&&u.stowagePlan.decks.length?u.stowagePlan:null;let X=null;if(o){if(C)X=C;else if(S==="loading"&&E&&S===f&&Array.isArray(E.decks)&&E.decks.length)X=E;else if(S==="loading")try{X=an({containers:k.filter(I=>I&&I.cn&&!I._slot&&!String(I.cn).startsWith("__")),termWork:u.termWork||{},bayWork:u.bayWork||null,assign:((Ge=u.stowagePlan)==null?void 0:Ge.assign)||null,voy:((Ve=t==null?void 0:t.info)==null?void 0:Ve.voy_l)||((Ue=t==null?void 0:t.info)==null?void 0:Ue.voy)||"",foreLolo:We(t).n,foreLoloFull:We(t).full})}catch(I){console.warn("[4.04] RZOR 덱플랜 생성 실패 — 카고플랜으로 연다",I)}}if(X&&Array.isArray(X.decks)&&X.decks.length){const I=String(rt.vslFull||"RIZHAO ORIENT").toUpperCase(),W=dn(rt),D=S==="loading"?()=>Sn({plan:X,vsl:I,voy:rt.voy_l||rt.voy||(n||"").split("_").pop()||"",date:W,inspector:h||""}):()=>yn({plan:X,containers:k,xrayMap:U,vsl:I,date:W,fills:Nn});return e.jsx($t,{name:"덱플랜 출력",onClose:F,children:e.jsx(cn,{plan:X,containers:k,xrayMap:U,termWork:u.termWork||{},voyageInfo:rt,mode:S,inspector:h,onExcel:D,onClose:F})})}return e.jsx($t,{name:"양하/선적 PLAN",onClose:F,children:e.jsx(pn,{containers:Y,legendContainers:ct,mode:S,voyageInfo:rt,shipImo:Pt,shipName:ft,xrayMap:U,shiftingMap:N,keepOnboard:t==null?void 0:t.keepOnboard,shiftStatus:A.label,inspector:h,onClose:F})})}return M==="detail"?e.jsx($t,{name:"베이 상세 인쇄",onClose:F,children:e.jsx(Un,{containers:ot,xrayMap:u.xrayList||{},xraySeals:u.xraySeals||{},mode:S,voyageInfo:rt,voyageKey:n,shipImo:Pt,shipName:ft,globalRowRange:pt,globalTiers:_t,onClose:F})}):e.jsx("div",{className:"fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center",children:e.jsxs("div",{className:"bg-ink-900 w-full sm:max-w-lg sm:rounded-sheet rounded-t-sheet max-h-[95vh] overflow-y-auto flex flex-col pop-in border-2 border-ink-700",children:[e.jsxs("div",{className:"sticky top-0 z-10 bg-ink-900 rounded-t-sheet",style:{backgroundImage:"radial-gradient(110% 130% at 0% 0%, rgb(var(--st-lod) / .24), transparent 70%)"},children:[e.jsxs("div",{className:"flex items-center justify-between gap-3 px-4 pt-4 pb-3",children:[e.jsxs("h2",{className:"text-lg font-black text-dim-100 flex items-center gap-3 min-w-0",children:[e.jsx("span",{className:"print-ico",style:{width:44,height:44,fontSize:24,background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"🖨️"}),e.jsxs("span",{className:"min-w-0",children:[e.jsx("span",{className:"block leading-tight",children:"검수 자료 출력"}),e.jsx("span",{className:"block text-xs2 font-bold text-dim-300 leading-tight mt-0.5",children:"양하·선적 × 검수 리스트 · 양하/선적 PLAN · 베이 상세 · VGM · 작업 보고서"})]})]}),e.jsx("button",{onClick:d,className:"p-2 rounded-pill border-2 border-ink-700 bg-ink-850 hover:bg-ink-750 shrink-0","aria-label":"닫기",children:e.jsx(ls,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"px-4 pb-3",children:e.jsxs("div",{className:"seg",children:[e.jsxs("button",{onClick:()=>T("discharge"),"aria-pressed":S==="discharge",className:`seg-btn ${S==="discharge"?"on-dis":""}`,children:[e.jsx(ws,{className:"w-4 h-4"}),"양하 (",ms,")"]}),e.jsxs("button",{onClick:()=>T("loading"),"aria-pressed":S==="loading",className:`seg-btn ${S==="loading"?"on-lod":""}`,children:[e.jsx(Ss,{className:"w-4 h-4"}),"선적 (",us,")"]})]})})]}),e.jsxs("div",{className:"p-4 space-y-3",children:[Ot===0?e.jsxs("div",{className:"text-center py-8 text-dim-300",children:[e.jsx("p",{className:"text-3xl mb-2",children:"📭"}),e.jsx("p",{children:"이 모드에 컨테이너 자료가 없습니다"}),e.jsx("p",{className:"text-xs mt-1",children:"[업로드] 탭에서 EDI/리스트를 올린 뒤 사용합니다"})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"text-xs text-dim-300",children:[Rt," ",e.jsxs("strong",{className:"text-dim-100",children:[Ot,"대"]})," · 평택항 ",Rt," 대상만 포함"]}),e.jsxs("button",{onClick:()=>At(),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #14b37d, #047857)"},children:"📋"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"검수 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"A4 세로 세 단 · 인쇄 창 위 단추로 장 나누기(이어서·20/40·풀/엠티·선사별·포트별) · 시트1(전체) + 시트2(특수화물 별첨)"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>At(!0),className:"print-tile","data-print-submit":"1",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #0ea5e9, #0369a1)"},children:"✔"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"검수 리스트 (제출용)"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"위 리스트와 같은 양식 · 작업한 컨에 ✔호기 표기 · 머리 아래에 누가 몇 호기에서 몇 대 · 비고에 실오류·데미지 기록"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>R("cargo-v2"),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #4f8ff7, #1d4ed8)"},children:"📐"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"font-black text-dim-100 leading-tight",children:[S==="loading"?"선적":"양하",e.jsx("span",{className:"block text-xs2 font-bold text-dim-300",children:S==="loading"?"(STOWAGE)PLAN":"(DISCHARGING)PLAN"})]}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"표준 도면 양식 그대로 · 베이별 단면 · 별첨(선사별·특수화물)"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>R("detail"),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #8b5cf6, #5b21b6)"},children:"🚢"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"베이 상세"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"베이별 슬롯 단위 컨테이너 위치 · 검수 현장용"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),S==="discharge"&&G&&e.jsxs("button",{onClick:()=>{if(!z){alert("X-RAY 리스트는 양하 화면에서 출력을 열어야 나옵니다.");return}G()},className:"print-tile","data-testid":"hub-xray",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #ef4444, #991b1b)"},children:"🔍"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"X-RAY 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"세관 X-RAY 대상 · 봉인번호·봉인자 · 제출용/인계용 (양하)"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),v&&!it&&e.jsxs("button",{onClick:()=>{const o=hn(k);if(!o.length){alert("이 항차에 풀 리퍼가 없습니다");return}bn(o,{name:rt.vslName||rt.vsl||String(n||"").split("_")[0],voy:rt.voy||String(n||"").split("_").slice(1).join("_"),modeLabel:S==="loading"?"선적":"양하",date:new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10)})},className:"print-tile","data-testid":"hub-reefer",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #06b6d4, #0e7490)"},children:"❄"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"리퍼 온도 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"리스트·셋팅·실제 온도 세 가지 · 수석 인계용 · 인쇄/PDF · 엑셀"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),S==="discharge"&&Object.keys(Ze(t)).length>0&&e.jsxs("button",{onClick:()=>fn(t.discharge.mfnList,n,rt,h,t),className:"print-tile","data-testid":"hub-mfn",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"⚠"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"MFN 목록"}),e.jsxs("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:["화물은 있으나 양하 리스트에 없는 컨 ",Object.keys(Ze(t)).length,"대 · 중국행 주의 · 인쇄/PDF · 엑셀"]})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),S==="loading"&&v&&e.jsxs("button",{onClick:()=>{if(!at.length){alert("선적 컨테이너가 없습니다");return}mn(at,rt)},className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"⚖️"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"VGM 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"평택 선적분 컨별 VGM(kg) · 본선 요청 시 제출용 (영문)"})]}),e.jsx(bt,{className:"w-5 h-5 text-dim-400 shrink-0"})]})]}),v&&e.jsxs("div",{className:"quest-card space-y-2",style:{borderColor:"rgb(var(--st-lod) / .55)"},children:[e.jsx("div",{className:"text-sm2 font-black text-amber-200 mb-1",children:"📄 FINAL WORKING REPORT 출력"}),e.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"양하 항차"}),e.jsx("input",{type:"text",value:j,onChange:o=>V(o.target.value),placeholder:"예: 0145N",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"선적 항차"}),e.jsx("input",{type:"text",value:p,onChange:o=>w(o.target.value),placeholder:"예: 0146S",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"BERTH"}),e.jsx("input",{type:"text",value:_,onChange:o=>P(o.target.value),placeholder:"예: 6",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 pt-1",children:[e.jsxs("button",{onClick:()=>rs(t,(t==null?void 0:t.info)||{},"settlement",{dischVoy:j,loadVoy:p,berth:_}),className:"pop-btn pop-amber",style:{flexDirection:"column",gap:0,minHeight:56},children:[e.jsx("span",{className:"text-sm2",children:"📄 결제용"}),e.jsx("span",{className:"text-2xs font-bold opacity-85",children:"완료 가정"})]}),e.jsxs("button",{onClick:()=>rs(t,(t==null?void 0:t.info)||{},"actual",{dischVoy:j,loadVoy:p,berth:_}),className:"pop-btn pop-blue",style:{flexDirection:"column",gap:0,minHeight:56},children:[e.jsx("span",{className:"text-sm2",children:"📄 작업용"}),e.jsx("span",{className:"text-2xs font-bold opacity-85",children:"진행 현황"})]})]})]})]}),e.jsxs("div",{className:"p-4 border-t-2 border-ink-700 text-xs text-dim-400 leading-relaxed",children:["출력을 누르면 미리보기가 뜹니다 — 검수 리스트",v?"·VGM·작업 보고서":"","는 새 창, 양하/선적 PLAN·베이 상세는 이 화면 위. 미리보기에서 인쇄하거나 PDF로 저장하세요(단추가 없는 창은 Ctrl+P).",e.jsx("br",{}),"💡 컬러 인쇄 권장 (특수화물 색상 구분)"]})]})})}export{Zn as default};
