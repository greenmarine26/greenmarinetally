import{b5 as z,b4 as xs,a$ as e,aK as is,b as gs,c as ws,ag as ht}from"./vendor-6XvW6uU9.js";import{eJ as ls,co as Ss,eg as os,d_ as $t,cW as jt,aO as as,dV as ds,dW as cs,ew as Ns,cZ as Cs,dk as js,a2 as ks,aQ as _s,am as Ps,aU as Lt,eH as Es,ah as Ms,b0 as Os,cx as Ts,d3 as As,aX as Rs,ag as $s,C as Ls,dI as Ds,cV as Fs,af as ys,al as zs,cE as vs,e6 as Ks,B as Hs,cv as Bs,dd as Is,aq as Gs,cU as Vs,cQ as Us,a1 as Ys,eu as Xs,cp as Ws,aw as Zs,ef as Js,ec as qs,aS as Qs,E as tn,aT as en,dY as sn,da as nn,dr as rn,ev as ln,aR as Ye,ap as on,y as Xe,aI as an,m as Rt,q as dn,P as cn,e1 as pn,dN as hn,dx as We,dM as bn,dO as fn,c$ as Ze,d0 as mn,df as un,ee as xn,cL as gn,dL as Je,a$ as wn,t as Sn}from"./index-BtN4ftBe.js";import"./baydict-DBqSydwE.js";const Nn=`
<div id="print-toolbar" class="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#1e293b;color:#fff;padding:8pt 10pt;display:flex;gap:8pt;justify-content:center;z-index:1000;border-bottom:2pt solid #f59e0b;font-family:'Malgun Gothic','맑은 고딕',sans-serif;">
  <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">🖨 프린터 인쇄</button>
  <button onclick="window.__savePDF()" style="background:#0284c7;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">📄 PDF 저장</button>
  <button onclick="window.__exportExcel()" style="background:#d97706;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;font-weight:bold;">📊 엑셀 다운로드</button>
  <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:6pt 14pt;font-size:11pt;border-radius:4pt;cursor:pointer;">✕ 닫기</button>
</div>`,Cn=`
@media print { .print-toolbar { display: none !important; } body { padding-top: 0 !important; } }
body { padding-top: 50pt; }`,jn=`
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
};`;function kn(t){if(!(!t||!t.document))try{const n=t.document.createElement("style");n.textContent=Cn,t.document.head.appendChild(n),t.document.body.insertAdjacentHTML("afterbegin",Nn);const a=t.document.createElement("script");a.textContent=jn,t.document.body.appendChild(a)}catch(n){console.error("toolbar 주입 실패:",n)}}function _n(t,n="출력"){const a=window.open("","_blank","width=900,height=1200");return a?(a.document.write(t),a.document.close(),setTimeout(()=>{kn(a);try{a.focus()}catch{}},200),a):(alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요."),null)}const Ot={KRPUS:"PUS",KRKAN:"KAN",KRPTK:"PTK",KRPYT:"PTK",KRINC:"INC",PYT:"PTK",KRPYOTM:"PTK",PYOTM:"PTK",KRPYO:"PTK",VNSGN:"SGN",VNHPP:"HPP",THLCH:"LCH",THBKK:"BKK",JPTYO:"TYO",JPYOK:"YOK",MYPEN:"PEN",MYPKG:"PKG",CNTAG:"TAG",CNNTG:"NTG",BSE:"PUS",HCC:"SGN",LCC:"LCH",PUS:"PUS",KAN:"KAN",PTK:"PTK",SGN:"SGN",LCH:"LCH",BKK:"BKK",TYO:"TYO",PEN:"PEN",PKG:"PKG",INC:"INC",HPP:"HPP",YOK:"YOK",TAG:"TAG",NTG:"NTG"},mt={DJSC:"DJS",NSSL:"NSL",HASL:"HAS",SNKO:"SKR",HSLI:"HSL",JEON:"HSL",DWIC:"DWS",EASK:"EAS",TJMS:"TJM",WDFC:"WDF",SCLK:"SIT"},qe=["SKR","NSL","DJS","HAS","HSL"],Qe=["PUS","KAN","SGN","LCH","BKK","PKG","PEN","TYO","YOK","HPP","INC","TAG","NTG"],ts={D2:"20",D5:"HC",D4:"40",R5:"HC",R2:"20"};function es(t){if(!t)return"?";const n=String(t).trim().toUpperCase();return Ot[n]?Ot[n]:n.length>=3?n.slice(-3):"?"}function Pn(t,n){const a=n||(p=>String(p||"").toUpperCase().trim()),f=p=>a(String(p||"").slice(0,3).toUpperCase()),c=t.isBooking===!0||t.pendingCn===!0||typeof t.cn=="string"&&t.cn.startsWith("__BOOK_");if(t.op){const p=String(t.op).toUpperCase();return mt[p]?a(mt[p]):f(p)}if(t.bl&&t.bl.length>=4){const p=t.bl.slice(0,4).toUpperCase();if(mt[p])return a(mt[p])}if(t.carrierCode){const p=String(t.carrierCode).toUpperCase();return mt[p]?a(mt[p]):f(p)}return!c&&t.cn&&t.cn.length>=3?f(t.cn):"?"}function En(t){const n=String(t.iso||"").toUpperCase().trim();return ts[n]?ts[n]:n?/^4H/.test(n.replace(/\s/g,""))?"HC":Ns(t):t.cn&&/^[A-Z]{4}\d{7}$/.test(t.cn)&&parseInt(t.cn[10])>=4?"HC":"20"}function Mn(t){if(t.fe){const a=String(t.fe).toUpperCase().trim();return a==="E"||a==="EMPTY"||a==="MT"||a==="P"?"E":"F"}if(t.cargoType)return String(t.cargoType).toUpperCase()==="F"?"F":"E";const n=String(t.iso||"").toUpperCase();return Cs(n)?"F":n.endsWith("E")?"E":"F"}function On(t,n){if(n==="disch")return es(t.pol);{const a=t.tsport||t.printpod||t.pod;let f=es(a);if(f==="?"&&t.bl){const c=String(t.bl).toUpperCase().match(/^[A-Z]{4}PT([A-Z]{3})/);c&&Ot[c[1]]&&(f=Ot[c[1]])}return f}}function Tn(t){const n=Array.from(t),a=Qe.filter(c=>n.includes(c)),f=n.filter(c=>!Qe.includes(c)).sort();return[...a,...f]}function An(t,n="settlement"){var it;const a=[];for(const h of["discharge","loading"]){const w=(t==null?void 0:t[h])||{};for(const P of[w.ediContainers,w.records])for(const H of Object.values(P||{}))H&&H.op&&a.push(H.op)}const f=os(String(((it=t==null?void 0:t.info)==null?void 0:it.vsl)||"").toUpperCase(),a),c={},p={};if(n==="actual"&&t.records&&new Set(Object.keys(t.records).map(h=>String(h).toUpperCase())),t){const h=(w,P,H)=>{if(!w)return;const O=w.ediContainers||{},S=w.records||{};w.completed&&new Set(Object.keys(w.completed).map(T=>String(T).toUpperCase()));const x=H==="disch"&&n!=="actual"&&t.discharge===w?$t(t):null;let X;n==="actual"?X=w.completed&&Object.keys(w.completed).length>0?Object.keys(w.completed):Object.keys(S):(X=x?[...x.set]:Object.keys(S),!x&&X.length===0&&(X=Object.values(O).filter(T=>H==="disch"?jt(T.pod):jt(T.pol)).map(T=>T.cn))),X.forEach(T=>{var et;const E=String(T).toUpperCase(),R=O[E]||O[T]||x&&O[x.ediKeyOf.get(T)]||{},C=S[E]||S[T]||(x?as(t,T):{});let k;if(R&&R.cn){k={...R};for(const[r,u]of Object.entries(C))(k[r]===null||k[r]===void 0||k[r]==="")&&u&&(k[r]=u);(C.op||R.op)&&(k.op=ds(C.op,R.op,(et=t==null?void 0:t.info)==null?void 0:et.vsl)),H==="disch"&&R.pol&&(k.pol=cs(R.pol,C.pol,R.pod)),C.pod_pick&&C.pod&&(k.pod=C.pod)}else k={...C};if(k.cn=T,!k.cn)return;const B=Pn(k,f),m=On(k,H),Q=En(k),Z=Mn(k);P[B]||(P[B]={}),P[B][m]||(P[B][m]={}),P[B][m][Q]||(P[B][m][Q]={F:0,E:0}),P[B][m][Q][Z]++})};h(t.discharge||t.disch,c,"disch"),h(t.loading||t.load,p,"load")}const M={20:{F:0,E:0},40:{F:0,E:0},HC:{F:0,E:0},45:{F:0,E:0}},G={20:{F:0,E:0},40:{F:0,E:0},HC:{F:0,E:0},45:{F:0,E:0}};for(const h of Object.keys(c))for(const w of Object.keys(c[h]))for(const P of Object.keys(c[h][w]))M[P]&&(M[P].F+=c[h][w][P].F,M[P].E+=c[h][w][P].E);for(const h of Object.keys(p))for(const w of Object.keys(p[h]))for(const P of Object.keys(p[h][w]))G[P]&&(G[P].F+=p[h][w][P].F,G[P].E+=p[h][w][P].E);const v=Object.values(M).reduce((h,w)=>h+w.F+w.E,0),K=Object.values(G).reduce((h,w)=>h+w.F+w.E,0);return{disch:c,load:p,totalDS:M,totalLD:G,dischTotal:v,loadTotal:K}}function ss(t,n,a,f){const c=(f[t]||{})[n]||{};return["20","40","HC","45"].map(p=>{const M=(c[p]||{})[a]||0;return M>0?String(M):""})}function Rn(t,n="settlement",a={}){var L,D,q,l,g,j,$,y,tt,nt;const{disch:f,load:c,totalDS:p,totalLD:M,dischTotal:G,loadTotal:v}=An(t,n),K=t.info||((L=t.discharge)==null?void 0:L.info)||((D=t.loading)==null?void 0:D.info)||{},it=K.vsl||K.vessel||K.vesselName||"VESSEL",h=a.dischVoy||((l=(q=t.discharge)==null?void 0:q.info)==null?void 0:l.voy)||((j=(g=t.discharge)==null?void 0:g.info)==null?void 0:j.voyNo)||K.voy_d||"",w=a.loadVoy||((y=($=t.loading)==null?void 0:$.info)==null?void 0:y.voy)||((nt=(tt=t.loading)==null?void 0:tt.info)==null?void 0:nt.voyNo)||K.voy_l||"";let P;h&&w&&h!==w?P=`${h} & ${w}`:h?P=h:w?P=w:P=a.voy||K.voy||K.voyNo||"";const H=a.date||K.date||ls(),O=a.berth||K.berth||"";let S=K.pier;if(!S&&O){const V=String(O).match(/(\d+)\s*번선석/);if(V){const U=parseInt(V[1],10);U>=6&&U<=9?S="PCTC":U>=13&&U<=16&&(S="PNCT")}}const x=S||"PCTC",X=O?Ss(O):"-",T=K.port||"PYEONGTAEK, KOREA",E=new Set([...Object.keys(f),...Object.keys(c)]),R=[...qe.filter(V=>E.has(V)),...Array.from(E).filter(V=>!qe.includes(V)).sort()],C=[];for(const V of R){const U=new Set([...Object.keys(f[V]||{}),...Object.keys(c[V]||{})]);if(U.size===0)continue;const at=Tn(U),dt=at.length*2;let ot=!1;at.forEach((ct,xt)=>{const _t=xt===at.length-1;["F","E"].forEach(bt=>{const pt=[];ot||(pt.push(`<td rowspan="${dt}" class="op-cell">${V}</td>`),ot=!0),bt==="F"&&pt.push(`<td rowspan="2" class="port-cell">${ct}</td>`),pt.push(`<td class="fe-cell">${bt}</td>`);const rt=ss(V,ct,bt,f);pt.push(`<td class="disch-first">${rt[0]}</td>`),pt.push(...rt.slice(1).map(ft=>`<td>${ft}</td>`));const gt=ss(V,ct,bt,c);pt.push(`<td class="load-first">${gt[0]}</td>`),pt.push(...gt.slice(1).map(ft=>`<td>${ft}</td>`)),pt.push('<td class="shift-first"></td><td></td><td></td><td></td>');const Pt=_t&&bt==="E"?' class="op-end"':"";C.push(`<tr${Pt}>${pt.join("")}</tr>`)})})}const k=(V,U)=>{const at=[];U&&at.push('<td colspan="2" rowspan="2" class="total-label">Total</td>'),at.push(`<td class="fe-cell">${V}</td>`),["20","40","HC","45"].forEach(dt=>{const ot=p[dt][V],ct=dt==="20"?' class="disch-first"':"";at.push(`<td${ct}>${ot||"-"}</td>`)}),["20","40","HC","45"].forEach(dt=>{const ot=M[dt][V],ct=dt==="20"?' class="load-first"':"";at.push(`<td${ct}>${ot||"-"}</td>`)});for(let dt=0;dt<4;dt++){const ot=dt===0?' class="shift-first"':"";at.push(`<td${ot}>-</td>`)}return`<tr class="total-row">${at.join("")}</tr>`},Q=273-78-5,Z=25.4/72,et=C.length+2,u=Math.max(7.7,Math.min(11.5,Q/Math.max(1,et)/Z)),_=Math.max(6,Math.round(u*.78*10)/10),A=Math.max(5.4,Math.round(_*.89*10)/10),J=Math.max(6.6,Math.round(_*1.11*10)/10),st=et*u*Z>Q+.5,s=Math.max(0,45-C.length-2),b=[];for(let V=0;V<s;V++){const U=[];if(V%3===0){const at=Math.min(3,s-V);U.push(`<td rowspan="${at}" class="op-cell"></td>`)}U.push("<td></td>"),U.push("<td></td>"),U.push('<td class="disch-first"></td>',"<td></td>","<td></td>","<td></td>"),U.push('<td class="load-first"></td>',"<td></td>","<td></td>","<td></td>"),U.push('<td class="shift-first"></td>',"<td></td>","<td></td>","<td></td>"),b.push(`<tr class="empty-row">${U.join("")}</tr>`)}let d;return G>0&&v>0?d='<div class="bottom-row"><div><b>Remarks : Discharging</b></div><div><b>Remarks : Loading</b></div></div>':v>0?d='<div class="bottom-single"><div><b>Remarks : Loading</b></div></div>':d='<div class="bottom-single"><div><b>Remarks : Discharging</b></div></div>',`<!DOCTYPE html><html><head><meta charset="utf-8"><title>FINAL WORKING REPORT (VOUCHER)</title>
<style>
@page { size: A4 portrait; margin: 0.8cm; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; margin: 0; font-size: 9pt; color: #000; }
.content { padding: 4mm; }
.title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 4pt; }
.subtitle { text-align: center; font-size: 13pt; font-weight: bold; border: 1pt solid #000; padding: 3pt; margin-bottom: 6pt; }
.info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; margin-bottom: 6pt; font-size: 10pt; }
.info-row b { display: inline-block; min-width: 60pt; }
table.voucher { width: 100%; border-collapse: collapse; font-size: ${_}pt; border: 1.5pt solid #000; }
table.voucher th, table.voucher td { border: 0.5pt solid #000; text-align: center; padding: 0 2pt; height: ${u.toFixed(2)}pt; line-height: 1.05; }
table.voucher th { background: #f0f0f0; font-weight: bold; font-size: ${A}pt; }
.op-cell { font-weight: bold; vertical-align: middle; font-size: ${J}pt; }
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
<div><b>VOY # :</b> ${P}</div>
<div><b>DATE :</b> ${H}</div>
<div><b>PIER :</b> ${x}</div>
<div><b>BERTH :</b> ${X}</div>
<div><b>PORT :</b> ${T}</div>
</div>
<table class="voucher">
<thead><tr>
<th rowspan="2">OPERATOR</th><th rowspan="2">PORT</th><th rowspan="2">FULL (F)<br>EMPTY (E)</th>
<th colspan="4">DISCH (${G})</th>
<th colspan="4">LOAD (${v})</th>
<th colspan="4">SHIFT (0)</th>
</tr><tr>
<th class="disch-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
<th class="load-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
<th class="shift-first">20'</th><th>40'</th><th>HC</th><th>45'</th>
</tr></thead>
<tbody>${C.join("")}${b.join("")}${k("F",!0)}${k("E",!1)}</tbody></table>
${d}${st?`<div class="too-tall">※ 선사 ${R.length}곳 · ${et}줄 — 읽을 수 있는 가장 작은 글자(${_}pt)로도 한 장에 안 들어갑니다. 둘째 장이 이어집니다.</div>`:""}
<div class="signs"><div>CHIEF CHECKER</div><div>CHIEF OFFICER</div></div>
</div></body></html>`}function ns(t,n={},a="settlement",f={}){const c=Rn(t,a,f);_n(c,"FINAL_WORKING_REPORT")}const Et={style:"thin",color:{rgb:"000000"}},St={top:Et,bottom:Et,left:Et,right:Et},Nt=(t={})=>({name:"Arial",sz:8,...t}),$n=t=>String(t||"").replace("#","").toUpperCase();function Ln(t,{plan:n,containers:a=[],xrayMap:f={},vsl:c="RIZHAO ORIENT",date:p="",fills:M={},mode:G="discharge"}={}){const v=Ps({plan:n,containers:a,xrayMap:f,termWork:{},vsl:c,date:p,mode:G}),K=t.utils.book_new(),it=h=>v.fmtWt(h,!1);return v.pages.forEach((h,w)=>{const P={},H=[],O=(r,u,_,A)=>{if(_==null||_===""){A&&(P[t.utils.encode_cell({r,c:u})]={t:"s",v:"",s:A});return}P[t.utils.encode_cell({r,c:u})]={t:typeof _=="number"?"n":"s",v:_,...A?{s:A}:{}}},S=(r,u,_,A,J,st)=>{for(let i=r;i<=_;i++)for(let s=u;s<=A;s++)O(i,s,i===r&&s===u?J:"",st);(_>r||A>u)&&H.push({s:{r,c:u},e:{r:_,c:A}})},x=h.px.cols,X=x+1,T=8,E=r=>({font:Nt({sz:r.sz||10,bold:!!r.bold}),alignment:{horizontal:r.h||"left",vertical:"center"}});S(0,1,0,x,`MV "${v.head.vsl}" _STOWAGE PLAN`,E({sz:16,bold:!0,h:"center"}));const R=Math.max(8,x-12);S(1,1,1,R-1,`"${h.label}" - DECK`,E({sz:12,bold:!0,h:"center"})),[["VOY. NO",v.head.voy],["DATE",v.head.dateShown],["L/PORT",v.head.lport],["D/PORT",v.head.dport]].forEach(([r,u],_)=>{O(2+_,1,r,E({})),O(2+_,2,":",E({})),O(2+_,3,u,E({}))});const C=h.totals,k=r=>({font:Nt({sz:9,bold:r}),alignment:{horizontal:"center",vertical:"center"},border:St});S(1,R,1,R+4,"SUB TOTAL",k(!0)),["SIZE","20'","40'","45'","TTL"].forEach((r,u)=>O(2,R+u,r,k(!1))),["CONT",C.n[20],C.n[40],C.n[45],C.ttl].forEach((r,u)=>O(3,R+u,r,k(!1))),["SIZE","20'","40'"].forEach((r,u)=>O(2,R+6+u,r,k(!1))),["CAPACITY",C.ch20,C.ch40].forEach((r,u)=>O(3,R+6+u,r,k(!1))),O(4,R+6,"Weight",k(!0)),S(4,R+7,4,R+8,it(C.wt),k(!1));const B=(r,u,_,A,J)=>S(r,u,r+3,u+_-1,A.join(`
`),J);for(const r of h.empties)r.slot&&B(T+r.ri*4,1+r.ci,r.span,[],{border:St});for(const r of h.cells){const u=[r.cn,r.wt,...r.lug?["LUG"]:[],r.type];r.letter&&u.push(r.letter),r.urgent&&!/긴급/.test(String(r.type||""))&&u.push("▲ 긴급"),r.xray&&u.push("★ X-RAY");const _=r.fill&&M[r.letter]?{patternType:"solid",fgColor:{rgb:$n(M[r.letter])}}:void 0;B(T+r.ri*4,1+r.ci,r.span,u,{font:Nt({sz:8}),alignment:{horizontal:"center",vertical:"center",wrapText:!0},border:r.lug?{top:{style:"medium",color:{rgb:"7C3AED"}},bottom:{style:"medium",color:{rgb:"7C3AED"}},left:{style:"medium",color:{rgb:"7C3AED"}},right:{style:"medium",color:{rgb:"7C3AED"}}}:St,..._?{fill:_}:{}})}if(h.art){const r=u=>({ri:Math.round((u.y-h.px.y0)/h.px.uh),ci:Math.round((u.x-h.px.x0)/h.px.uw)});for(const u of[...h.art.hatch,...h.art.gray]){const _=r(u);S(T+_.ri*4,1+_.ci,T+_.ri*4+3,1+_.ci,"",{border:St,fill:{patternType:"solid",fgColor:{rgb:"D9D9D9"}}})}for(const u of h.art.cs){const _=r(u);S(T+_.ri*4,1+_.ci,T+_.ri*4+3,1+_.ci,`C/S
4000`,{font:Nt({sz:8}),alignment:{horizontal:"center",vertical:"center",wrapText:!0},border:St})}}for(let r=0;r<h.px.rows;r++)S(T+r*4,X,T+r*4+3,X,r+1,E({sz:12,bold:!0,h:"center"}));h.zone&&O(T+h.px.rows*4+1,1,`LOLO 구역(D덱 10~15칸) ${h.zone.count}대 — 출력(굵은 선)과 같은 칸`,E({sz:9}));let m=T+h.px.rows*4+3;if(w===0){const r=v.totals,u=["B","C","D"].filter(s=>r.decks[s]),_=s=>[s[20].D+s[20].R,s[20].D,s[20].R,s[40].D+s[40].R,s[40].D,s[40].R,s[45].D+s[45].R,s[45].D,s[45].R,s.L20,s.L40,s.n],A=m;["CHASSIS","20'","40'","Weight"].forEach((s,b)=>O(A,1+b,s,k(b===0))),S(A,5,A+1,5,"",k(!1)),["20'","D","R","40'","D","R","45'","D","R"].forEach((s,b)=>S(A,6+b,A+1,6+b,s,k(!1))),S(A,15,A,16,"LUG",k(!1)),O(A+1,15,"20'",k(!1)),O(A+1,16,"40'",k(!1)),S(A,17,A+1,17,"TTL",k(!1));const J=u.map(s=>[`${s}-DECK`,r.decks[s].ch20,r.decks[s].ch40,it(r.decks[s].wt)]);J.push(["TTL",r.ch20,r.ch40,it(r.wt)]);const st=[["F",_(r.F)],["E",_(r.E)],["TTL",_(r.TTL)]],i=Math.max(J.length,st.length+1);for(let s=0;s<i;s++){const b=A+1+s;(J[s]||["","","",""]).forEach((L,D)=>O(b,1+D,L,k(!1)));const d=s-(i-st.length);d>=0&&(O(b,5,st[d][0],k(!1)),st[d][1].forEach((L,D)=>O(b,6+D,L,k(!1))))}m=A+1+i+2}m+=2;const Q={font:Nt({sz:11}),alignment:{horizontal:"center",vertical:"center"}};S(m,1,m,3,"",{border:{bottom:{style:"medium",color:{rgb:"000000"}}}}),S(m+1,1,m+1,3,"Chief Checker",Q),S(m,5,m,7,"",{border:{bottom:{style:"medium",color:{rgb:"000000"}}}}),S(m+1,5,m+1,7,"Chief Officer",Q);const Z=m+2;P["!ref"]=t.utils.encode_range({s:{r:0,c:0},e:{r:Z,c:Math.max(X,R+8,18)}}),P["!merges"]=H,P["!cols"]=Array.from({length:Math.max(X,R+8,18)+1},(r,u)=>({wch:u===0?2:u===X?5:11}));const et=[];for(let r=0;r<=Z;r++)et.push({hpx:r>=T&&r<T+h.px.rows*4?13:16});P["!rows"]=et,t.utils.book_append_sheet(K,P,`${h.label==="UNDER"?"UNDER":h.label}-DECK`)}),K}const Dn={orientation:"landscape",paper:9,margin:.3937,centered:!0,fit:!0};async function Fn(t){const n=await js(),a=Ln(n,t),f=`STOWAGE_PLAN_${String(t.plan&&t.plan.voy||"RZOR").replace(/[^A-Za-z0-9_-]/g,"")}_DISCHARGE.xlsx`,c=ks(n,n.write(a,{bookType:"xlsx",type:"array"}),[Dn]);return _s(c,f),f}const yn=.55,ps=(t,n)=>Fs(t,n);function zn(t){const n={};return Array.isArray(t)&&t.forEach(a=>{if(!a||!a.bay)return;const f=Ds(a.bay);f&&(n[f]=n[f]||[]).push(a)}),n}function vn(t,n){n=n||{};const a=new Set;for(const p of t)p%2===0&&a.add(p);for(const[p,M]of Object.entries(n)){const G=parseInt(p,10);if(G%2===0&&a.add(G),M&&M.pairEven!=null){const v=parseInt(M.pairEven,10);Number.isFinite(v)&&a.add(v)}}const f=new Set,c=[];for(const p of t.filter(M=>M%2===1).sort((M,G)=>M-G)){if(f.has(p))continue;const M=p-1;M>0&&a.has(M)&&!f.has(M)?(c.push({even:M,odd:p,key:`${M}-${p}`}),f.add(p),f.add(M)):(c.push({even:null,odd:p,key:`${p}`}),f.add(p))}for(const p of[...a].sort((M,G)=>M-G))f.has(p)||(c.push({even:p,odd:null,key:`${p}`}),f.add(p));return c.sort((p,M)=>(p.even??p.odd)-(M.even??M.odd)),c}const kt=14,Ct=1.067,Mt=7,Dt=(t,n)=>{const a=(Number(t)||87)*.75,f=(Number(n)||48)*.75,c=p=>Math.floor(p*2+1e-6)/2;return Math.max(6,Math.min(c((a-3)/(kt*.6)),c((f-1.5)/(5*Ct))))},ut=t=>{let n=0;for(const a of String(t||""))n+=a.charCodeAt(0)>8192?2:1;return n},Ft=t=>(Number(t)||87)*.75-3,hs=(t,n,a)=>{const f=Number(a)||Dt(n,null),c=ut(t);if(c<=kt)return f;let p=f;for(;p>6&&c*.6*p>Ft(n)+1e-6;)p-=.5;return Math.max(6,p)},Kn=(t,n,a)=>{const f=Number(a)||Dt(n,null);if(ut(t)<=kt)return"";const c=hs(t,n,f),p=ut(t)*.6*c<=Ft(n)+1e-6;return c<=6&&(c<f||!p)?" wide x3":c<f?" wide x2":" wide"},yt=[8.5,7.2,6.3],Hn=[.7,.1,-.45],bs=(t,n)=>Math.floor(((t||87)-8)/(yt[n]*96/72*.6+Hn[n])),Bn=(t,n)=>{const a=ut(t);for(let f=0;f<yt.length;f++)if(a<=bs(n,f))return f?` x${f+1}`:"";return" x3"};function rs(t,n,a,f=!1){try{const c=String(t.pol||"").replace(/^KR/,"").slice(0,3)||"   ",p=String(t.pod||"").replace(/^KR/,"").slice(0,3)||"   ",M=String(t.via||""),G=c===p,v=G?`${c}/${p}`:`${c}/`,K=`*${G?M||" ":M||p}`,it=String(t.cn||""),h=(typeof t.line=="string"&&/[A-Z]/i.test(t.line)?t.line:String(t.carrier||"")).toUpperCase();let w="C_K";h==="CKL"||h==="CK"?w="C_K":h==="SOC"||h.includes("SOC")?w="SOC":h&&(w=h.slice(0,3));const P=t.fe||(String(t.iso||"").endsWith("0")?"E":"F");let H="0.0";try{const _=parseFloat(t.wt);Number.isFinite(_)&&(H=(_/1e3).toFixed(1))}catch{}const O=`${P}${H}`,S=String(Is(t.iso)||""),x=String(t.tmp??"").trim(),X=t._xray?`★${String(t._xraySealNo||"").trim()||"XRAY"}`:"",T=t.imdg?`${String(t.imdg)}`:x?`${x}C`:"";let E=[X,T].filter(Boolean).join(" ");const R=f?ut(E)>bs(n,yt.length-1):ut(E)*.6*6>Ft(n)+1e-6;X&&R&&(E=[X.replace("★",""),T].filter(Boolean).join(" "));const C=f?Bn(E,n):Kn(E,n,a),k=!f&&C?hs(E,n,a):null,B=parseInt(t.bay,10),m=Number.isFinite(B)&&B>=100?String(B):String(Number.isFinite(B)?B:0).padStart(2,"0"),Q=String(t.row??"00").padStart(2,"0"),Z=String(t.tier??"00").padStart(2,"0"),et=`....${m}${Q}${Z}`,r=`${v.padEnd(7)}${K}`,u=`${w.padEnd(3)} ${P}${H.padStart(4)} ${S}`;return{left1:v,right1:K,line1:r,cn:it,carrier:w,fewt:O,type:S,line3:u,mid:E,midCls:C,midPt:k,midXray:!!X,pos:et}}catch(c){return console.error("[formatCellParts] error",c,t),{left1:"",right1:"",line1:"",cn:String(t&&t.cn||""),carrier:"",fewt:"",type:"",line3:"",mid:"",midCls:"",midPt:null,midXray:!1,pos:""}}}function In({even:t,odd:n,bayMap:a,mode:f,voyageInfo:c,voyageKey:p,shipName:M,dictBay:G,dictBaysSummary:v={},dictBayDef:K=null,globalRowRange:it,globalTiers:h,dictShipMeta:w,colorMap:P={},isPrintTarget:H=!0,uniformCell:O=null}){const S=[...t!=null&&a[String(t)]||[],...n!=null&&a[String(n)]||[]],x=z.useMemo(()=>{let l=0,g=0,j=!1;for(const tt of[t,n]){if(tt==null)continue;const nt=v[parseInt(tt,10)];if(!nt)continue;const V=nt.rowMaxEvenLocal??nt.rowMaxEven,U=nt.rowMaxOddLocal??nt.rowMaxOdd;V&&(l=Math.max(l,V)),U&&(g=Math.max(g,U))}for(const tt of S){const nt=parseInt(tt.row),V=parseInt(tt.tier);if(!(!Number.isFinite(nt)||!V||nt>=90)){if(nt===0){j=!0;continue}nt%2===0?l=Math.max(l,nt):g=Math.max(g,nt)}}if(!l&&!g)return["08","06","04","02","01","03","05","07"];const $=[];for(let tt=l;tt>=2;tt-=2)$.push(String(tt).padStart(2,"0"));const y=[];for(let tt=1;tt<=g;tt+=2)y.push(String(tt).padStart(2,"0"));return j?[...$,"00",...y]:[...$,...y]},[t,n,v,S]),X=x.length,T={};S.forEach(l=>{const g=String(l.tier).padStart(2,"0"),j=String(l.row||"00").padStart(2,"0");T[`${g}-${j}`]=l});const E=z.useMemo(()=>{const l=t!=null&&n!=null,g=t??n;if(g==null)return null;const j=l?`(${String(t).padStart(2,"0")})${String(n).padStart(2,"0")}`:String(g).padStart(2,"0");if(K)try{const $=ys(K,j,{posMap:zs(S)});if($&&$.nDeckCols>0)return $}catch($){console.warn("[2.56] buildBayGrid 실패 — STD_ROWS 폴백",j,$)}return null},[t,n,K,S]),R=z.useMemo(()=>{const l=new Set,g=new Set;return[t,n].forEach(j=>{if(j==null)return;const $=v[parseInt(j,10)];$&&(($.deckTiersLocal||$.deckTiers||[]).forEach(y=>l.add(String(y).padStart(2,"0"))),($.holdTiersLocal||$.holdTiers||[]).forEach(y=>g.add(String(y).padStart(2,"0"))))}),{deck:l,hold:g}},[t,n,v]),C=R.deck.size>0||R.hold.size>0,k=z.useMemo(()=>{if(E&&typeof E.hatchCount=="number")return E.hatchCount;for(const l of[t,n]){if(l==null)continue;const g=v[parseInt(l,10)];if(g!=null&&g.hatchCount)return Math.max(1,Math.min(3,g.hatchCount))}return 1},[E,n,t,v]),B=z.useMemo(()=>{let l=E&&Array.isArray(E.hatchRows)?E.hatchRows:null;if(!l)for(const g of[t,n]){if(g==null)continue;const j=v[parseInt(g,10)];if(j&&Array.isArray(j.hatchRows)){l=j.hatchRows;break}}return vs(l,null)},[E,n,t,v]),m=Array.from(C?new Set([...R.deck,...R.hold,...S.map(l=>String(l.tier).padStart(2,"0")).filter(l=>l!=="NaN")]):new Set([...Array.isArray(h)?h.map(l=>String(l).padStart(2,"0")):[],...S.map(l=>String(l.tier).padStart(2,"0")).filter(l=>l!=="NaN")])),Q=m.filter(l=>parseInt(l)>=80).sort((l,g)=>parseInt(g)-parseInt(l)),Z=m.filter(l=>parseInt(l)<80).sort((l,g)=>parseInt(g)-parseInt(l)),et=G?G.hasHold!==!1:S.some(l=>parseInt(l.tier)<80),r=G?G.hasDeck!==!1:!0,u=l=>l>=100?String(l):String(l).padStart(2,"0");let _;t!=null&&n!=null?_=`BAY(${u(t)})${u(n)}`:t!=null?_=`BAY${u(t)}`:_=`BAY${u(n)}`;const A=(c==null?void 0:c.voy_d)||"",J=(c==null?void 0:c.voy_l)||"",st=(c==null?void 0:c.voy)||"";let i;f==="discharge"?i=A||st:f==="loading"?i=J||st:A&&J&&A!==J?i=`양하 ${A} / 선적 ${J}`:i=A||J||st;const s=(()=>{try{return Ks(c||{}).name||(c==null?void 0:c.vsl)||M||""}catch{return(c==null?void 0:c.vsl)||M||""}})(),b=f==="loading"?"POL : PTK":f==="discharge"?"POD : PTK":"POL : PTK",d=(l,g)=>{const j=T[`${l}-${g}`];if(!j)return e.jsx("div",{className:"bd-cell empty"},`${l}-${g}`);const $=rs(j,null,Mt);return e.jsxs("div",{className:"bd-cell filled",children:[e.jsx("div",{className:"bd-r1",children:$.line1}),e.jsx("div",{className:"bd-r2",children:$.cn}),e.jsx("div",{className:"bd-r3",children:$.line3}),e.jsx("div",{className:`bd-r4${$.midCls||""}${$.midXray?" xr":""}`,style:$.midPt?{fontSize:`${$.midPt}pt`}:void 0,children:$.mid||" "}),e.jsx("div",{className:"bd-r5",children:$.pos})]},`${l}-${g}`)},L=(l,g)=>{const j=T[`${String(g).padStart(2,"0")}-${l.rowLbl}`];if(!j)return null;const $=!O,y=rs(j,O?O.w:null,O?O.fs:null,$);return e.jsxs("div",{className:"bd-cell-lines",children:[D(j)&&e.jsxs("svg",{className:"bd-oog",viewBox:"0 0 3 2",preserveAspectRatio:"none","aria-hidden":"true",children:[D(j).includes("W")&&e.jsxs(e.Fragment,{children:[e.jsx("polygon",{points:"1,1 0.5,1.5 1,2"}),e.jsx("polygon",{points:"2,1 2.5,1.5 2,2"})]}),D(j).includes("H")&&e.jsxs(e.Fragment,{children:[e.jsx("polygon",{points:"1,1 1.5,0.3 2,1"}),e.jsx("rect",{x:"1.26",y:"0.15",width:"0.48",height:"0.85"})]})]}),$?e.jsxs("div",{className:"bd-r1",children:[e.jsx("span",{children:y.left1}),e.jsx("span",{children:y.right1})]}):e.jsx("div",{className:"bd-r1",children:y.line1}),e.jsx("div",{className:"bd-r2",children:y.cn}),$?e.jsxs("div",{className:"bd-r3",children:[e.jsx("span",{children:y.carrier}),e.jsx("span",{children:y.fewt}),e.jsx("span",{children:y.type})]}):e.jsx("div",{className:"bd-r3",children:y.line3}),e.jsx("div",{className:`bd-r4${y.midCls||""}${y.midXray?" xr":""}`,style:y.midPt?{fontSize:`${y.midPt}pt`}:void 0,children:y.mid||" "}),e.jsx("div",{className:"bd-r5",children:y.pos})]})},D=l=>{if(!l)return"";const g=Number(l.ovh||0)>0,j=Number(l.ovw||0)>0||Number(l.oogL||0)>0||Number(l.oogR||0)>0;return(g?"H":"")+(j?"W":"")},q=(l,g)=>{const j=T[`${String(g).padStart(2,"0")}-${l.rowLbl}`];if(!j)return{};const $=ps(j,f),y=$?Bs(j,f):null;y&&P[y];const tt=D(j);return{className:`cpv2-cell bd-fill${$?" ptk":""}${tt?` cpv2-oog-${tt}`:""}`}};return e.jsxs("div",{className:`bd-page${H?"":" bd-noprint"}`,children:[!H&&e.jsx("div",{className:"bd-noprint-badge no-print",children:"인쇄 제외 (화면 표시용)"}),e.jsxs("div",{className:"bd-header",children:[e.jsx("span",{children:s}),e.jsxs("span",{children:["VOY NO : ",i]}),e.jsx("span",{children:b})]}),e.jsx("div",{className:"bd-title",children:_}),E?e.jsx("div",{className:`bd-cargo-wrap${O?" bd-uniform":""}`,style:O?{"--bdc-w":`${O.w}px`,"--bdc-h":`${O.h}px`,"--bdc-fs":`${O.fs}pt`,"--bdc-gc":String(Math.max(E.nDeckCols||0,E.nHoldCols||0,1))}:void 0,children:e.jsx(Hs,{data:E,colorMap:P,gridCols:Math.max(E.nDeckCols||0,E.nHoldCols||0),globalHatch:{maxDeck:Math.max((E.deckTiers||[]).length,1),maxHold:Math.max((E.holdTiers||[]).length,1),maxSide:Math.max((E.deckTiers||[]).length,(E.holdTiers||[]).length,1)},renderCellContent:L,cellExtra:q,fixedCellVar:O?"--bdc-w":null})}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"bd-row-labels-top",children:x.map((l,g)=>e.jsx("span",{className:"bd-rl",children:l},`${l}-${g}`))}),e.jsxs("div",{className:"bd-grid-wrap",children:[e.jsxs("div",{className:"bd-grid",children:[r&&Q.map(l=>e.jsx("div",{className:"bd-tier-row",style:{gridTemplateColumns:`repeat(${X}, minmax(0, 1fr))`},children:x.map(g=>d(l,g))},l)),r&&et&&e.jsx("div",{className:"bd-hatch",children:(B||Array.from({length:k}).map(()=>0)).map((l,g)=>e.jsx("div",{className:"bd-hatch-seg",style:l>0?{flex:`${l} 1 0`}:void 0},g))}),et&&Z.map(l=>e.jsx("div",{className:"bd-tier-row",style:{gridTemplateColumns:`repeat(${X}, minmax(0, 1fr))`},children:x.map(g=>d(l,g))},l))]}),e.jsxs("div",{className:"bd-tier-labels",children:[r&&Q.map(l=>e.jsx("span",{children:l},l)),r&&et&&e.jsx("span",{className:"bd-tier-gap"}),et&&Z.map(l=>e.jsx("span",{children:l},l))]})]}),e.jsx("div",{className:"bd-row-labels-bot",children:x.map(l=>e.jsx("span",{className:"bd-rl",children:l},l))})]})]})}const Gn=typeof window<"u"&&("ontouchstart"in window||(navigator.maxTouchPoints||0)>0);function Vn({containers:t,mode:n,voyageInfo:a,shipImo:f,shipName:c,voyageKey:p,globalRowRange:M,globalTiers:G,onClose:v,xrayMap:K,xraySeals:it}){const h=z.useMemo(()=>(t||[]).map(i=>{if(!i)return i;let s=i;if(!s._xraySealNo&&K&&K[s.cn]){const d=String(((it||{})[s.cn]||{}).seal||(s._xraySeal||{}).seal||"").trim();s={...s,_xray:!0,_xraySealNo:d}}const b=Lt(s);return b.src==="edi"||b.src==="rec"?s:{...s,bay:b.bay,row:b.row,tier:b.tier,_planBay:s.bay,_planRow:s.row,_planTier:s.tier}}),[t,K,it]),[w,P]=z.useState("all"),[H,O]=z.useState([]),[S,x]=z.useState(1),X=z.useRef(S);X.current=S;const T=z.useRef(null);Es(T,()=>X.current,x,{min:.15,max:3});const E=z.useMemo(()=>Ms(h||[],n),[h,n]),R=z.useMemo(()=>{let i=0,s=0,b=!1,d=0,L=0,D=!1;for(const q of h){if(!q.row||!q.tier)continue;const l=parseInt(q.row),g=parseInt(q.tier);if(!g)continue;const j=g>=80;if(l===0){j?b=!0:D=!0;continue}j?l%2===0?i=Math.max(i,l):s=Math.max(s,l):l%2===0?d=Math.max(d,l):L=Math.max(L,l)}return{maxLeft:Math.max(i,d),maxRight:Math.max(s,L),has00:b||D,deck:{maxLeft:i,maxRight:s,has00:b},hold:{maxLeft:d,maxRight:L,has00:D}}},[h]),C=M||R,k=z.useMemo(()=>zn(h),[h]),B=z.useMemo(()=>{const i=new Set;for(const s of h||[]){const b=parseInt(s.bay,10);Number.isFinite(b)&&b>0&&i.add(b)}return i.size},[h]),m=z.useMemo(()=>{if(!f&&!c)return null;const i=(()=>{var L;try{return((L=Os({info:a}))==null?void 0:L.code)||""}catch{return""}})(),s=Ts(f,c,{ediBayCount:B,vslCode:i,callsign:(a==null?void 0:a.callsign)||"",vslFull:(a==null?void 0:a.vslFull)||c||""});if(!s)return null;const b=As(s),d=Rs({bayDef:s.bayDef},s._v5Matrix,h,b?"user":s.source);return{...s,_userOwned:b,bayDef:{...d.bayDef,source:s.source,_userOwned:b},_enrichMeta:d._enrichMeta||s._enrichMeta}},[f,c,h,a]),Q=z.useMemo(()=>{var i;return(i=m==null?void 0:m.bayDef)!=null&&i.bayList?m.bayDef.bayList.map(s=>parseInt(s,10)).filter(s=>Number.isFinite(s)):null},[m]),Z=z.useMemo(()=>{var s;if(!((s=m==null?void 0:m.bayDef)!=null&&s.baysSummary))return{};const i={};return m.bayDef.baysSummary.forEach(b=>{i[parseInt(b.bayNo,10)]=b}),i},[m]),et=z.useMemo(()=>{var i,s,b,d;return{rowMaxEven:(i=m==null?void 0:m.bayDef)==null?void 0:i.rowMaxEven,rowMaxOdd:(s=m==null?void 0:m.bayDef)==null?void 0:s.rowMaxOdd,deckTiers:(b=m==null?void 0:m.bayDef)==null?void 0:b.deckTiers,holdTiers:(d=m==null?void 0:m.bayDef)==null?void 0:d.holdTiers}},[m]),r=z.useMemo(()=>{const i=b=>Number.isFinite(b)&&b<99,s=new Set;return Q&&Q.forEach(b=>{i(b)&&s.add(b)}),Object.keys(Z).forEach(b=>{const d=parseInt(b,10);i(d)&&s.add(d)}),Object.keys(k).forEach(b=>{const d=parseInt(b,10);i(d)&&s.add(d)}),[...s].sort((b,d)=>b-d)},[Q,Z,k]),u=z.useMemo(()=>{const i=m!=null&&m.bayDef?$s(m.bayDef):null;if(!i||i.length===0)return vn(r,Z);const s=new Set;i.forEach(d=>{d.even!=null&&s.add(d.even),d.odd!=null&&s.add(d.odd)});const b=i.map(d=>({even:d.even,odd:d.odd,key:d.even!=null&&d.odd!=null?`${d.even}-${d.odd}`:String(d.even!=null?d.even:d.odd)}));for(const d of r)s.has(d)||!(Number.isFinite(d)&&d<99)||(b.push(d%2===0?{even:d,odd:null,key:String(d)}:{even:null,odd:d,key:String(d)}),s.add(d));return b.sort((d,L)=>(d.even!=null&&d.odd!=null||d.even!=null?d.even:d.odd)-(L.even!=null&&L.odd!=null||L.even!=null?L.even:L.odd)),b},[m,r,Z]),_=z.useMemo(()=>{let i=0,s=0;for(const D of u){const q=(D.odd!=null?Z[D.odd]:null)||(D.even!=null?Z[D.even]:null);if(!q||!(Array.isArray(q.deckCells)&&q.deckCells.length>0||Array.isArray(q.holdCells)&&q.holdCells.length>0))continue;const g=(q.deckCells||[]).map(Number).filter(U=>Number.isFinite(U)&&U>0),j=g.length>0?Math.max(...g):0,$=j>0?j:Number(q.rowCount)||9,y=(q.holdCells||[]).map(Number).filter(U=>Number.isFinite(U)&&U>0),tt=y.length>0?Math.min(Math.max(...y),$):0;i=Math.max(i,$,tt,1);const nt=(q.deckTiersLocal||q.deckTiers||[]).length,V=(q.holdTiersLocal||q.holdTiers||[]).length;s=Math.max(s,nt+V)}if(!i)return null;const b=Math.max(78,Math.min(118,Math.floor(1046/i))),d=Math.floor(655/Math.max(s,1)),L=Math.max(46,Math.min(84,d,Math.round(b*yn)));return{w:b,h:L,fs:Dt(b,L)}},[u,Z]),A=u,J=z.useMemo(()=>{const i=new Set;for(const s of u){const b=[...s.even!=null&&k[String(s.even)]||[],...s.odd!=null&&k[String(s.odd)]||[]];let d;w==="all"?d=b.length>0:w==="ptk"?d=b.some(L=>ps(L,n)):w==="single"?d=H.includes(s.key):d=!1,d&&i.add(s.key)}return i},[u,k,w,H,n]),st=J.size;return xs.createPortal(e.jsxs("div",{className:"fixed inset-0 z-50 bg-black/90 flex flex-col bd-print-modal",children:[e.jsxs("div",{className:"no-print flex flex-col p-3 bg-slate-900 border-b border-slate-700 gap-2",children:[e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-2",children:[e.jsxs("div",{className:"text-base font-bold text-slate-100 min-w-0",children:["📋 베이 상세 미리보기 (전체 ",A.length,"베이 · 인쇄 ",st,")"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("div",{className:"flex gap-2 print:hidden",children:[e.jsx("button",{onClick:()=>{if(st===0){alert("인쇄할 베이가 없습니다. 출력 모드(전체/평택분/베이 지정)를 확인하세요.");return}window.print()},className:"bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"🖨 인쇄"}),e.jsx("button",{onClick:()=>{if(st===0){alert("인쇄할 베이가 없습니다. 출력 모드를 확인하세요.");return}alert('인쇄 창에서 "PDF로 저장" 선택하세요'),setTimeout(()=>window.print(),100)},className:"bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"📄 PDF"}),e.jsx("button",{onClick:async()=>{if(typeof window.XLSX>"u"){const i=document.createElement("script");i.src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js",document.head.appendChild(i),await new Promise(s=>i.onload=s)}try{const i=document.querySelectorAll("table");if(!i.length){alert("테이블 없음");return}const s=window.XLSX.utils.book_new();i.forEach((d,L)=>{const D=window.XLSX.utils.table_to_sheet(d);window.XLSX.utils.book_append_sheet(s,D,"Sheet"+(L+1))});const b=ls();window.XLSX.writeFile(s,document.title+"_"+b+".xlsx")}catch(i){alert("엑셀 실패: "+i.message)}},className:"bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded whitespace-nowrap",children:"📊 엑셀"})]}),e.jsx("button",{onClick:v,className:"p-2 hover:bg-slate-800 rounded",children:e.jsx(is,{className:"w-5 h-5 text-slate-300"})})]})]}),e.jsxs("div",{className:"flex gap-2 items-center flex-wrap",children:[e.jsx("span",{className:"text-xs text-slate-400 font-bold",children:"출력 모드:"}),e.jsx("button",{onClick:()=>P("all"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="all"?"bg-blue-600 text-white":"bg-slate-800 text-slate-300"}`,children:"📋 전체 일괄"}),e.jsx("button",{onClick:()=>P("ptk"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="ptk"?"bg-amber-600 text-white":"bg-slate-800 text-slate-300"}`,children:"⚓ 평택분만"}),e.jsx("button",{onClick:()=>P("single"),className:`px-3 py-1.5 rounded text-xs font-bold ${w==="single"?"bg-purple-600 text-white":"bg-slate-800 text-slate-300"}`,children:"🎯 베이 지정"}),!Gn&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"ml-2 text-xs text-slate-400 font-bold",children:"화면크기"}),e.jsx("button",{onClick:()=>x(i=>Math.max(.15,+(i-.1).toFixed(2))),className:"px-2 py-1.5 rounded text-sm font-black bg-slate-700 text-white",children:"−"}),e.jsxs("span",{className:"text-xs text-slate-300 font-bold mono",style:{minWidth:38,textAlign:"center"},children:[Math.round(S*100),"%"]}),e.jsx("button",{onClick:()=>x(i=>Math.min(3,+(i+.1).toFixed(2))),className:"px-2 py-1.5 rounded text-sm font-black bg-slate-700 text-white",children:"＋"}),e.jsx("button",{onClick:()=>x(.22),className:"px-2 py-1.5 rounded text-xs font-bold bg-slate-600 text-white",children:"맞춤"})]}),w==="single"&&e.jsxs("div",{className:"flex flex-wrap gap-1 items-center",children:[e.jsxs("span",{className:"text-xs text-slate-400",children:["선택(",H.length,"):"]}),u.map(i=>{const s=L=>L>=100?String(L):String(L).padStart(2,"0");let b;i.even!=null&&i.odd!=null?b=`(${s(i.even)})${s(i.odd)}`:i.even!=null?b=s(i.even):b=s(i.odd);const d=H.includes(i.key);return e.jsxs("button",{onClick:()=>{O(d?H.filter(L=>L!==i.key):[...H,i.key])},className:`px-2 py-1 rounded text-xs font-bold ${d?"bg-purple-600 text-white":"bg-slate-700 text-slate-300"}`,children:[d?"✓ ":"",b]},i.key)}),H.length>0&&e.jsx("button",{onClick:()=>O([]),className:"px-2 py-1 rounded text-xs bg-red-700 text-white",children:"전체해제"}),e.jsx("button",{onClick:()=>O(u.map(i=>i.key)),className:"px-2 py-1 rounded text-xs bg-slate-600 text-slate-100",children:"전체선택"})]})]})]}),m&&m._substituted&&e.jsxs("div",{className:"bg-amber-100 border border-amber-600 text-amber-900 px-3 py-2 text-xs",children:["⚠ ",m._substituted.fromCode," 베이정보가 없어 같은 계열 ",m._substituted.usedName?`${m._substituted.usedName}(${m._substituted.usedCode})`:m._substituted.usedCode,"(으)로 대체했습니다. 구조가 미세하게 다를 수 있습니다."]}),e.jsx("div",{ref:T,className:"flex-1 overflow-auto bg-white bd-print-container",onWheel:i=>{i.ctrlKey&&(i.preventDefault(),x(s=>Math.min(3,Math.max(.15,+(s-i.deltaY*.002).toFixed(3)))))},children:e.jsx("div",{className:"bd-zoom-wrap",style:{transform:`scale(${S})`,transformOrigin:"top left",width:S!==1?`${100/S}%`:"100%"},children:A.length===0?e.jsx("div",{className:"p-8 text-center text-slate-500",children:"표시할 베이가 없습니다. (EDI/베이사전에서 베이 정보를 찾지 못함)"}):A.map(i=>{const s=i.even!=null?Z[i.even]:Z[i.odd];return e.jsx(In,{even:i.even,odd:i.odd,bayMap:k,mode:n,voyageInfo:a,voyageKey:p,shipName:c,dictBay:s,dictBaysSummary:Z,dictBayDef:(m==null?void 0:m.bayDef)||null,globalRowRange:C,globalTiers:G,colorMap:E,isPrintTarget:J.has(i.key),uniformCell:_,dictShipMeta:et},i.key)})})}),e.jsx("style",{children:Ls}),e.jsx("style",{children:`
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
        .bd-cargo-wrap.bd-uniform .cpv2-row-labels { justify-content: center; margin-right: 16px; }
        .bd-cargo-wrap.bd-uniform .cpv2-row-labels > span {
          flex: 0 0 var(--bdc-w); min-width: var(--bdc-w); max-width: var(--bdc-w);
        }
        .bd-cargo-wrap.bd-uniform .cpv2-tier-labels > span { flex: 0 0 var(--bdc-h); }
        .bd-cargo-wrap.bd-uniform .cpv2-hatch-break {
          width: calc(var(--bdc-w) * var(--bdc-gc) + 16px);
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
      `})]}),document.body)}function Wn({voyage:t,voyageKey:n,onClose:a,initialMode:f="discharge",isLolo:c=!1,inspector:p="",viewDeckPlan:M=null,onXrayPrint:G=null,xrayPrintOk:v=!1,autoAction:K=null}){var Kt,Ht,Bt,It,Gt,Vt,Ut,Yt,Xt,Wt,Zt,Jt,qt,Qt,te,ee,se,ne,re,ie,le,oe,ae,de,ce,pe,he,be,fe,me,ue,xe,ge,we,Se,Ne,Ce,je,ke,_e,Pe,Ee,Me,Oe,Te,Ae,Re,$e,Le,De,Fe,ye,ze,ve,Ke,He,Be,Ie,Ge,Ve;const[it,h]=z.useState(((Ht=(Kt=t==null?void 0:t.loading)==null?void 0:Kt.info)==null?void 0:Ht.voy)||""),[w,P]=z.useState(((It=(Bt=t==null?void 0:t.discharge)==null?void 0:Bt.info)==null?void 0:It.voy)||""),[H,O]=z.useState(((Gt=t==null?void 0:t.info)==null?void 0:Gt.berth)||((Ut=(Vt=t==null?void 0:t.discharge)==null?void 0:Vt.info)==null?void 0:Ut.berth)||""),S=(()=>{try{return Gs(p,Vs(p))||Us(p)}catch{return!1}})(),[x,X]=z.useState(f==="loading"?"loading":"discharge"),[T,E]=z.useState(K==="cargo"?"cargo-v2":K==="detail"?"detail":null),R=()=>{K?a():E(null)},C=(t==null?void 0:t[x])||{},k=C.ediContainers||{},B=C.records||{},m=C.completed||{},Q=C.xrayList||{},Z=C.xraySeals||{},et=z.useMemo(()=>Ys(Ws(C),Xs(t)),[(Xt=(Yt=C==null?void 0:C.raw)==null?void 0:Yt.edi)==null?void 0:Xt.uploadedAt,(Zt=(Wt=C==null?void 0:C.raw)==null?void 0:Wt.edi)==null?void 0:Zt.sizeBytes,k,t==null?void 0:t.swapFix]),r=z.useMemo(()=>Zs(n,t),[(Qt=(qt=(Jt=t==null?void 0:t.discharge)==null?void 0:Jt.raw)==null?void 0:qt.edi)==null?void 0:Qt.uploadedAt,(se=(ee=(te=t==null?void 0:t.loading)==null?void 0:te.raw)==null?void 0:ee.edi)==null?void 0:se.uploadedAt,(ie=(re=(ne=t==null?void 0:t.discharge)==null?void 0:ne.raw)==null?void 0:re.edi)==null?void 0:ie.sizeBytes,(ae=(oe=(le=t==null?void 0:t.loading)==null?void 0:le.raw)==null?void 0:oe.edi)==null?void 0:ae.sizeBytes,n,t==null?void 0:t.swapFix,(ce=(de=t==null?void 0:t.restowList)==null?void 0:de._meta)==null?void 0:ce.at,(pe=t==null?void 0:t.info)==null?void 0:pe.berthShift,t==null?void 0:t.shiftManual]),u=z.useMemo(()=>{try{return Js(n,t)}catch(o){return console.warn("[4.16 출력 센터] 예측 시프팅 지도 실패 — 확정만 그립니다:",o),r}},[r,n,(he=t==null?void 0:t.info)==null?void 0:he.berthShift,(be=t==null?void 0:t.info)==null?void 0:be.terminalStatus,(fe=t==null?void 0:t.info)==null?void 0:fe.lane,(xe=(ue=(me=t==null?void 0:t.discharge)==null?void 0:me.raw)==null?void 0:ue.edi)==null?void 0:xe.uploadedAt,(Se=(we=(ge=t==null?void 0:t.discharge)==null?void 0:ge.raw)==null?void 0:we.edi)==null?void 0:Se.sizeBytes,t==null?void 0:t.keepOnboard]),_=z.useMemo(()=>qs(n,t,u),[u,n,(Ne=t==null?void 0:t.info)==null?void 0:Ne.berthShift,(Ce=t==null?void 0:t.info)==null?void 0:Ce.terminalStatus,(ke=(je=t==null?void 0:t.restowList)==null?void 0:je._meta)==null?void 0:ke.mailAt,(Pe=(_e=t==null?void 0:t.restowList)==null?void 0:_e._meta)==null?void 0:Pe.at,(Oe=(Me=(Ee=t==null?void 0:t.discharge)==null?void 0:Ee.raw)==null?void 0:Me.edi)==null?void 0:Oe.uploadedAt,(Re=(Ae=(Te=t==null?void 0:t.loading)==null?void 0:Te.raw)==null?void 0:Ae.edi)==null?void 0:Re.uploadedAt,(De=(Le=($e=t==null?void 0:t.discharge)==null?void 0:$e.raw)==null?void 0:Le.edi)==null?void 0:De.sizeBytes,(ze=(ye=(Fe=t==null?void 0:t.loading)==null?void 0:Fe.raw)==null?void 0:ye.edi)==null?void 0:ze.sizeBytes]),A=new Set(Object.keys(r||{}).filter(o=>o&&!o.startsWith("_"))),J=x==="discharge"?$t(t,A):null,st=!!(J&&J.basis!=="edi"),i=o=>!o||o.cn&&Ze(A,B,x,o.cn)?!1:st?!!(o.cn&&J.set.has(o.cn)):o.cn&&B[o.cn]?!0:x==="discharge"?mn(o)?!1:!o.pod||jt(o.pod):!o.pol||jt(o.pol),s=new Set(["pol","pod","npod","fpod","bay","row","tier","pos","iso","fe","rf","fr","ot","tk","dg","oog","voy","vsl"]),b=Qs(et),L=[...new Set([...Object.keys(b),...Object.keys(B),...st?J.set:[]])].map(o=>{const N=b[o]||(B[o]||!st?{}:as(t,o)),Y=B[o]||{},I=!!b[o],W={...N};return Object.entries(Y).forEach(([F,lt])=>{var Ue;if(lt===""||lt==null)return;if(I&&Y.iso_pick&&(F==="iso"||F==="rf"||F==="fr"||F==="ot"||F==="tk")){W[F]=lt;return}const us=(F==="rf"||F==="fr"||F==="ot"||F==="tk"||F==="dg"||F==="oog")&&lt===!0&&N[F]!==!0;if(!(F==="tmp_missing"&&lt===!0&&N.tmp)){if(I&&Y.pod_pick&&F==="pod"){W.pod=lt;return}if(F==="pol"&&I){if(x!=="discharge"||!N.pol)return;const wt=cs(N.pol,lt,N.pod);wt!==N.pol&&(W.pol=wt);return}if(!(I&&s.has(F)&&!us&&!(tn.has(F)&&en(N,F)))){if(F==="wt"){const wt=sn(lt);wt>0&&(W.wt=wt);return}if(F==="op"){W.op=ds(lt,N&&N.op,(Ue=t==null?void 0:t.info)==null?void 0:Ue.vsl);return}W[F]=lt}}}),I&&Y.iso_pick&&(W.oog=nn(Y,N.oog)),W.cn=I&&!N.cn&&!B[o]?`__SLOT_${N.bay||""}_${N.row||""}_${N.tier||""}_${o}`:o,I&&!N.cn&&!B[o]&&(W.pendingCn=!0,W._slot=!0),W._src=I?B[o]?"both":"edi":"list",W._comp=m[o]||null,B[o]&&(W._inList=!0),Q[o]&&(W._xray=!0,W._xraySealNo=String((Z[o]||{}).seal||"").trim()),st?rn(W,J):W}),D=(ve=t==null?void 0:t.info)==null?void 0:ve.forecast,q=new Set(Array.isArray(D==null?void 0:D.urgentCns)?D.urgentCns:[]),l=new Set(Array.isArray(D==null?void 0:D.luggageCns)?D.luggageCns:[]),g=new Set((Array.isArray(D==null?void 0:D.specialCns)?D.specialCns:[]).map(o=>String(o||"").trim().toUpperCase()).filter(Boolean)),j=ln(L,q,l,(D==null?void 0:D.luggageSeals)||null,g),$=o=>{if(!o)return"";const N=o.bay||(o.pos?String(o.pos).slice(0,3):"");return N?String(N).padStart(3,"0").slice(0,3):""},y=o=>{if(!o)return"";const N=Lt(o);if(N.inStorage)return"";const Y=N.bay||(o.pos?String(o.pos).slice(0,3):"");return Y?String(Y).padStart(3,"0").slice(0,3):""},tt=o=>!!(o&&o.cn&&r&&r[o.cn]),nt=new Set;j.forEach(o=>{if(!i(o)&&!tt(o))return;const N=y(o);N&&N!=="000"&&nt.add(N)});const V=j.filter(o=>{const N=$(o);return N&&N!=="000"}),U=j.filter(o=>{const N=y(o);return N&&nt.has(N)}),at=os(String(((Ke=t==null?void 0:t.info)==null?void 0:Ke.vsl)||"").toUpperCase(),j.map(o=>o&&o.op)),dt=j.filter(i).map(o=>{const N=o&&o.op?at(o.op):null;return N&&N!==o.op?{...o,op:N}:o}),ot=Ye(dt);let ct=0,xt=0;const _t=new Set;U.forEach(o=>{const N=Lt(o);if(N.row){const Y=parseInt(N.row);Y>0&&(Y%2===0?ct=Math.max(ct,Y):xt=Math.max(xt,Y))}N.tier&&_t.add(N.tier)});const bt={maxLeft:ct,maxRight:xt},pt=Array.from(_t),rt=(t==null?void 0:t.info)||{},gt=rt.imo||"",Pt=rt.vsl||"",ft=ot.length;j.length;const Tt=x==="discharge"?"양하":"선적",zt=o=>{if(o===x)return ot.length;if(o==="discharge")return $t(t,A).set.size;const N=(t==null?void 0:t[o])||{},Y=N.ediContainers||{},I=N.records||{},W=[];return Object.entries(Y).forEach(([F,lt])=>{lt&&W.push({...lt,_src:I[F]?"both":"edi",_inList:!!I[F]})}),Object.keys(I).forEach(F=>{Y[F]||W.push({...I[F]||{},cn:F,_src:"list",_inList:!0})}),Ye(W).filter(F=>{if(F.cn&&Ze(A,I,o,F.cn))return!1;if(F._inList)return!0;const lt=o==="discharge"?F.pod:F.pol;return!lt||jt(lt)}).length},fs=zt("discharge"),ms=zt("loading"),At=(o=!1)=>{if(ft===0){alert(`${Tt} 컨테이너가 없습니다`);return}let N={};try{N=un(n,t,null,{confirmed:r})||{}}catch(I){console.warn("[4.48 출력 센터] 본선 잔류 예보 실패 — 별첨2 는 확정만 싣습니다:",I),N={}}const Y=xn({...r,...N},et,t);if(o===!0){let I=null;try{I=gn(t,x)}catch(W){console.warn("[4.75 제출용] 작업 표기를 만들지 못했습니다 —",W),alert("작업 표기를 만들지 못해 제출용을 열지 못했습니다.");return}if(!I||!Object.keys(I.byCn).length){alert("앱으로 직접 입력한 호기가 없어 체크할 컨이 없습니다. 제출용을 열지 않습니다.");return}Je(ot,x,rt,[],{appendix:!1,submit:!0,marks:I});return}Je(ot,x,rt,Y,{appendix:S})},vt=z.useRef(!1);if(z.useEffect(()=>{K!=="inspection"||vt.current||(vt.current=!0,At(),a())},[]),T==="cargo")return E("cargo-v2"),null;if(T==="cargo-v2"){const o=c||/RZOR|RIZHAO/i.test(`${((He=t==null?void 0:t.info)==null?void 0:He.vsl)||""} ${n||""}`),N=Array.isArray((Be=C.stowagePlan)==null?void 0:Be.decks)&&C.stowagePlan.decks.length?C.stowagePlan:null;let Y=null;if(o){if(N)Y=N;else if(x==="loading"&&M&&x===f&&Array.isArray(M.decks)&&M.decks.length)Y=M;else if(x==="loading")try{Y=on({containers:j.filter(I=>I&&I.cn&&!I._slot&&!String(I.cn).startsWith("__")),termWork:C.termWork||{},bayWork:C.bayWork||null,assign:((Ie=C.stowagePlan)==null?void 0:Ie.assign)||null,voy:((Ge=t==null?void 0:t.info)==null?void 0:Ge.voy_l)||((Ve=t==null?void 0:t.info)==null?void 0:Ve.voy)||"",foreLolo:Xe(t).n,foreLoloFull:Xe(t).full})}catch(I){console.warn("[4.04] RZOR 덱플랜 생성 실패 — 카고플랜으로 연다",I)}}if(Y&&Array.isArray(Y.decks)&&Y.decks.length){const I=String(rt.vslFull||"RIZHAO ORIENT").toUpperCase(),W=an(rt),F=x==="loading"?()=>wn({plan:Y,vsl:I,voy:rt.voy_l||rt.voy||(n||"").split("_").pop()||"",date:W,inspector:p||""}):()=>Fn({plan:Y,containers:j,xrayMap:Q,vsl:I,date:W,fills:Sn});return e.jsx(Rt,{name:"덱플랜 출력",onClose:R,children:e.jsx(dn,{plan:Y,containers:j,xrayMap:Q,termWork:C.termWork||{},voyageInfo:rt,mode:x,inspector:p,onExcel:F,onClose:R})})}return e.jsx(Rt,{name:"양하/선적 PLAN",onClose:R,children:e.jsx(cn,{containers:V,legendContainers:dt,mode:x,voyageInfo:rt,shipImo:gt,shipName:Pt,xrayMap:Q,shiftingMap:u,keepOnboard:t==null?void 0:t.keepOnboard,shiftStatus:_.label,inspector:p,onClose:R})})}return T==="detail"?e.jsx(Rt,{name:"베이 상세 인쇄",onClose:R,children:e.jsx(Vn,{containers:U,xrayMap:C.xrayList||{},xraySeals:C.xraySeals||{},mode:x,voyageInfo:rt,voyageKey:n,shipImo:gt,shipName:Pt,globalRowRange:bt,globalTiers:pt,onClose:R})}):e.jsx("div",{className:"fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center",children:e.jsxs("div",{className:"bg-ink-900 w-full sm:max-w-lg sm:rounded-sheet rounded-t-sheet max-h-[95vh] overflow-y-auto flex flex-col pop-in border-2 border-ink-700",children:[e.jsxs("div",{className:"sticky top-0 z-10 bg-ink-900 rounded-t-sheet",style:{backgroundImage:"radial-gradient(110% 130% at 0% 0%, rgb(var(--st-lod) / .24), transparent 70%)"},children:[e.jsxs("div",{className:"flex items-center justify-between gap-3 px-4 pt-4 pb-3",children:[e.jsxs("h2",{className:"text-lg font-black text-dim-100 flex items-center gap-3 min-w-0",children:[e.jsx("span",{className:"print-ico",style:{width:44,height:44,fontSize:24,background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"🖨️"}),e.jsxs("span",{className:"min-w-0",children:[e.jsx("span",{className:"block leading-tight",children:"검수 자료 출력"}),e.jsx("span",{className:"block text-xs2 font-bold text-dim-300 leading-tight mt-0.5",children:"양하·선적 × 검수 리스트 · 양하/선적 PLAN · 베이 상세 · VGM · 작업 보고서"})]})]}),e.jsx("button",{onClick:a,className:"p-2 rounded-pill border-2 border-ink-700 bg-ink-850 hover:bg-ink-750 shrink-0","aria-label":"닫기",children:e.jsx(is,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"px-4 pb-3",children:e.jsxs("div",{className:"seg",children:[e.jsxs("button",{onClick:()=>X("discharge"),"aria-pressed":x==="discharge",className:`seg-btn ${x==="discharge"?"on-dis":""}`,children:[e.jsx(gs,{className:"w-4 h-4"}),"양하 (",fs,")"]}),e.jsxs("button",{onClick:()=>X("loading"),"aria-pressed":x==="loading",className:`seg-btn ${x==="loading"?"on-lod":""}`,children:[e.jsx(ws,{className:"w-4 h-4"}),"선적 (",ms,")"]})]})})]}),e.jsxs("div",{className:"p-4 space-y-3",children:[ft===0?e.jsxs("div",{className:"text-center py-8 text-dim-300",children:[e.jsx("p",{className:"text-3xl mb-2",children:"📭"}),e.jsx("p",{children:"이 모드에 컨테이너 자료가 없습니다"}),e.jsx("p",{className:"text-xs mt-1",children:"[업로드] 탭에서 EDI/리스트를 올린 뒤 사용합니다"})]}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"text-xs text-dim-300",children:[Tt," ",e.jsxs("strong",{className:"text-dim-100",children:[ft,"대"]})," · 평택항 ",Tt," 대상만 포함"]}),e.jsxs("button",{onClick:()=>At(),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #14b37d, #047857)"},children:"📋"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"검수 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"A4 세로 세 단 · 인쇄 창 위 단추로 장 나누기(이어서·20/40·풀/엠티·선사별·포트별) · 시트1(전체) + 시트2(특수화물 별첨)"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>At(!0),className:"print-tile","data-print-submit":"1",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #0ea5e9, #0369a1)"},children:"✔"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"검수 리스트 (제출용)"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"위 리스트와 같은 양식 · 작업한 컨에 ✔호기 표기 · 머리 아래에 누가 몇 호기에서 몇 대 · 비고에 실오류·데미지 기록"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>E("cargo-v2"),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #4f8ff7, #1d4ed8)"},children:"📐"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"font-black text-dim-100 leading-tight",children:[x==="loading"?"선적":"양하",e.jsx("span",{className:"block text-xs2 font-bold text-dim-300",children:x==="loading"?"(STOWAGE)PLAN":"(DISCHARGING)PLAN"})]}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"표준 도면 양식 그대로 · 베이별 단면 · 별첨(선사별·특수화물)"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),e.jsxs("button",{onClick:()=>E("detail"),className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #8b5cf6, #5b21b6)"},children:"🚢"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"베이 상세"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"베이별 슬롯 단위 컨테이너 위치 · 검수 현장용"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),x==="discharge"&&G&&e.jsxs("button",{onClick:()=>{if(!v){alert("X-RAY 리스트는 양하 화면에서 출력을 열어야 나옵니다.");return}G()},className:"print-tile","data-testid":"hub-xray",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #ef4444, #991b1b)"},children:"🔍"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"X-RAY 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"세관 X-RAY 대상 · 봉인번호·봉인자 · 제출용/인계용 (양하)"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),S&&e.jsxs("button",{onClick:()=>{const o=pn(j);if(!o.length){alert("이 항차에 풀 리퍼가 없습니다");return}hn(o,{name:rt.vslName||rt.vsl||String(n||"").split("_")[0],voy:rt.voy||String(n||"").split("_").slice(1).join("_"),modeLabel:x==="loading"?"선적":"양하",date:new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10)})},className:"print-tile","data-testid":"hub-reefer",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #06b6d4, #0e7490)"},children:"❄"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"리퍼 온도 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"리스트·셋팅·실제 온도 세 가지 · 수석 인계용 · 인쇄/PDF · 엑셀"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),x==="discharge"&&Object.keys(We(t)).length>0&&e.jsxs("button",{onClick:()=>bn(t.discharge.mfnList,n,rt,p,t),className:"print-tile","data-testid":"hub-mfn",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"⚠"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"MFN 목록"}),e.jsxs("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:["화물은 있으나 양하 리스트에 없는 컨 ",Object.keys(We(t)).length,"대 · 중국행 주의 · 인쇄/PDF · 엑셀"]})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]}),x==="loading"&&S&&e.jsxs("button",{onClick:()=>{if(!ot.length){alert("선적 컨테이너가 없습니다");return}fn(ot,rt)},className:"print-tile",children:[e.jsx("span",{className:"print-ico",style:{background:"linear-gradient(180deg, #f59e0b, #b45309)"},children:"⚖️"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-black text-dim-100",children:"VGM 리스트"}),e.jsx("div",{className:"text-xs2 text-dim-300 mt-0.5 leading-snug",children:"평택 선적분 컨별 VGM(kg) · 본선 요청 시 제출용 (영문)"})]}),e.jsx(ht,{className:"w-5 h-5 text-dim-400 shrink-0"})]})]}),S&&e.jsxs("div",{className:"quest-card space-y-2",style:{borderColor:"rgb(var(--st-lod) / .55)"},children:[e.jsx("div",{className:"text-sm2 font-black text-amber-200 mb-1",children:"📄 FINAL WORKING REPORT 출력"}),e.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"양하 항차"}),e.jsx("input",{type:"text",value:w,onChange:o=>P(o.target.value),placeholder:"예: 0145N",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"선적 항차"}),e.jsx("input",{type:"text",value:it,onChange:o=>h(o.target.value),placeholder:"예: 0146S",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-2xs text-dim-300 block mb-0.5",children:"BERTH"}),e.jsx("input",{type:"text",value:H,onChange:o=>O(o.target.value),placeholder:"예: 6",className:"w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 pt-1",children:[e.jsxs("button",{onClick:()=>ns(t,(t==null?void 0:t.info)||{},"settlement",{dischVoy:w,loadVoy:it,berth:H}),className:"pop-btn pop-amber",style:{flexDirection:"column",gap:0,minHeight:56},children:[e.jsx("span",{className:"text-sm2",children:"📄 결제용"}),e.jsx("span",{className:"text-2xs font-bold opacity-85",children:"완료 가정"})]}),e.jsxs("button",{onClick:()=>ns(t,(t==null?void 0:t.info)||{},"actual",{dischVoy:w,loadVoy:it,berth:H}),className:"pop-btn pop-blue",style:{flexDirection:"column",gap:0,minHeight:56},children:[e.jsx("span",{className:"text-sm2",children:"📄 작업용"}),e.jsx("span",{className:"text-2xs font-bold opacity-85",children:"진행 현황"})]})]})]})]}),e.jsxs("div",{className:"p-4 border-t-2 border-ink-700 text-xs text-dim-400 leading-relaxed",children:["출력을 누르면 미리보기가 뜹니다 — 검수 리스트",S?"·VGM·작업 보고서":"","는 새 창, 양하/선적 PLAN·베이 상세는 이 화면 위. 미리보기에서 인쇄하거나 PDF로 저장하세요(단추가 없는 창은 Ctrl+P).",e.jsx("br",{}),"💡 컬러 인쇄 권장 (특수화물 색상 구분)"]})]})})}export{Wn as default};
