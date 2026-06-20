// 수집기(Tallyman Mail Collector) 연동용 입구 — 검수앱 파서를 감싸 폴더 병합본+EDI대조 리포트 생성
// V8.20: 수집기가 window.GMmerge(files) 한 번으로 검수앱의 기존 파서를 재사용.
//   파서 자체는 검수앱이 소유(utils.js). 이 파일은 다리(contract)일 뿐 — 파서 로직 미포함.
//   XRAY 처리: parseXrayList 실제 반환이 { containers:[...] } 이므로 그에 맞춤(연동안내 6-1 확정).
import { parseListExcel, parseBAPLIE, parseAscFile, parseXrayList, loadSheetJS } from './utils.js';
function classify(name){const n=(name||'').toLowerCase();const ext=n.split('.').pop();
  if(ext==='edi')return 'edi'; if(ext==='asc')return 'asc';
  if(ext==='xls'||ext==='xlsx'){ if(/recap|cbf|cdl|memo/.test(n))return 'skip'; if(/xray|x-ray/.test(n))return 'xray'; return 'list'; }
  return 'skip';}
function mergeWithEdi(edi,list,xray){const merged={...edi},conflicts=[],unmatched={};
  Object.values(list||{}).forEach(c=>{if(!c.cn)return;const cn=c.cn.toUpperCase();
    if(merged[cn]){const e=merged[cn];
      if(c.sl){if(!e.sl)e.sl=c.sl;else if(e.sl!==c.sl)conflicts.push({cn,field:'sl',ediVal:e.sl,otherVal:c.sl,source:c._source||'list'});}
      if(c.eseal){if(!e.eseal)e.eseal=c.eseal;else if(e.eseal!==c.eseal)conflicts.push({cn,field:'eseal',ediVal:e.eseal,otherVal:c.eseal,source:c._source||'list'});}
      if(c.wt&&c.wt>0){const w=parseInt(e.wt,10)||0;if(w===0)e.wt=c.wt;else if(Math.abs(w-c.wt)>1000)conflicts.push({cn,field:'wt',ediVal:w,otherVal:c.wt,source:c._source||'list'});}
    } else unmatched[cn]=c;});
  Object.keys(xray||{}).forEach(cn=>{const u=cn.toUpperCase(); if(merged[u])merged[u]._xray=true; else unmatched[u]={...(unmatched[u]||{}),cn:u,_xray:true};});
  return {merged,conflicts,unmatched};}
async function asArrayBuffer(f){ if(f.arrayBuffer)return await f.arrayBuffer(); if(f.buffer)return f.buffer; return f; }
async function asText(f){ const ab=await asArrayBuffer(f); try{return new TextDecoder('latin1').decode(new Uint8Array(ab));}catch(e){return '';} }
export async function mergeFolder(files){
  const XLSX=await loadSheetJS(); const edi={},listResults={},xrayResults={},perFile=[]; let ediName='';
  for(const f of files){ const name=f.name||''; const kind=classify(name);
    try{
      if(kind==='edi'){ const r=parseBAPLIE(await asText(f)); const cs=(r&&r.containers)||[];
        if(cs.length>Object.keys(edi).length){ for(const k of Object.keys(edi))delete edi[k]; cs.forEach(c=>{if(c.cn)edi[c.cn.toUpperCase()]=c;}); ediName=name; }
        perFile.push({name,kind,count:cs.length});
      } else if(kind==='asc'){ const r=parseAscFile(await asText(f)); perFile.push({name,kind,count:((r&&r.containers)||[]).length});
      } else if(kind==='list'){ const out=await parseListExcel(await asArrayBuffer(f)); const recs=(out&&out.records)||[];
        recs.forEach(r=>{if(r.cn){r._source=name;listResults[r.cn.toUpperCase()]=r;}}); perFile.push({name,kind,count:recs.length});
      } else if(kind==='xray'){ const out=await parseXrayList(await asArrayBuffer(f));
        // V8.20 수정: parseXrayList 반환은 { containers:[번호배열], _matchCount } — records 아님.
        const arr=(out&&out.containers)||(out&&out.records?out.records.map(r=>r&&r.cn):[])||[];
        (Array.isArray(arr)?arr:[]).forEach(cn=>{if(cn)xrayResults[String(cn).toUpperCase()]=true;});
        perFile.push({name,kind,count:Array.isArray(arr)?arr.length:0});
      }
    }catch(e){ perFile.push({name,kind,error:String(e&&e.message||e)}); }
  }
  const {merged,conflicts,unmatched}=mergeWithEdi(edi,listResults,xrayResults);
  const rows=Object.values(merged).map(c=>({'Cntr No':c.cn||'','ISO':c.iso||'','Line':c.op||'','F/E':c.fe||'','POL':c.pol||'','POD':c.pod||'','Seal':c.sl||'','EmptySeal':c.eseal||'','Weight':c.wt||'','XRAY':c._xray?'Y':''}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'MERGED');
  if(conflicts.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(conflicts),'CONFLICTS');
  const unm=Object.values(unmatched);
  if(unm.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(unm.map(c=>({'Cntr No':c.cn,Line:c.op||'',Seal:c.sl||'',XRAY:c._xray?'Y':''}))),'NOT_IN_EDI');
  const xlsxBase64=XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  const report={ediFile:ediName,ediCount:Object.keys(edi).length,listUnique:Object.keys(listResults).length,mergedCount:Object.keys(merged).length,conflictCount:conflicts.length,notInEdiCount:unm.length,conflicts,notInEdi:unm.map(c=>c.cn),perFile};
  return {xlsxBase64,report};
}
if(typeof window!=='undefined'){ window.GMmerge=mergeFolder; }
