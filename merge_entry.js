// 수집기 merge_helper 전용 엔트리 — MailPilot 1.8-06 (2026-08-20)
// 정체: GMmerge/GMleg 는 V8.85 시절 앱 mergeApi.js(수집기 계약 — listTotal/gap/partialEdi/선사별 집계)가 정본.
//   앱 쪽 mergeApi.js 는 V9.57 에서 재작성돼 이 필드들이 없다 — 앱판으로 갈아끼우면 merge.py 가 깨진다 (2026-08-20 실측).
// 이 엔트리는 그 수집기 로직을 그대로 두고 **파서만 앱 최신**(utils.js parseListExcel 등)을 물린다.
//   → 연운항(LYG) SZ·REMARK 온도가 자동 수집 합본에 반영된다. 로직 변경점은 합본 열 Temp·EmptySeal 추가뿐.
// 재생성: 앱 저장소에서  npx vite build --config vite.merge.config.js  → dist_merge/gm_merge.js → HTML 래핑.
import { parseBAPLIE, parseAscFile, loadSheetJS, parseListExcel, parseXrayList, normalizeCarrierCode, APP_VERSION } from './src/utils.js';

  // ../gmt2/src/mergeApi.js
  function classify(name) {
    const n = (name || "").toLowerCase();
    const ext = n.split(".").pop();
    if (ext === "edi") return "edi";
    if (ext === "asc") return "asc";
    if (ext === "xls" || ext === "xlsx") {
      if (/recap|cbf|cdl|memo/.test(n) || /loadlist\.xlsx$/.test(n)) return "skip";
      if (/조회|\(pctc\)|\(pnct\)|선적목록|양하목록/.test(n)) return "skip"; // v2.17.4: 터미널 조회/목록 export는 합본 오염원(STMJ 2636W 13대 사건)
      if (/restow|리스토우|재적부/.test(n)) return "skip"; // v2.17.11-15: 쉬프팅(재적부) 목록은 통과화물 — 선적 합본 오염원(MCSN 629S: RESTOW 29대 혼입)
      if (/xray|x-ray/.test(n)) return "xray";
      return "list";
    }
    return "skip";
  }
  async function asArrayBuffer(f) {
    if (f.arrayBuffer) return await f.arrayBuffer();
    if (f.buffer) return f.buffer;
    return f;
  }
  async function asText(f) {
    const ab = await asArrayBuffer(f);
    try {
      return new TextDecoder("latin1").decode(new Uint8Array(ab));
    } catch (e) {
      return "";
    }
  }
  var isBook = (cn) => String(cn || "").toUpperCase().startsWith("__BOOK_");
  function isPtkPort(code) {
    const t = String(code || "").toUpperCase().trim();
    if (!t) return false;
    return /(PTK|PYT|PYOTM|PYO)$/.test(t);
  }
  var carrierOf = (c) => normalizeCarrierCode(c.op) || normalizeCarrierCode(c.bl) || (c.cn && !isBook(c.cn) ? String(c.cn).slice(0, 3).toUpperCase() : "?") || "?";
  async function mergeFolder(files, opts = {}) {
    const XLSX = await loadSheetJS();
    const list = {};
    const xray = {};
    const perFile = [];
    let bestEdi = null, bestScore = -1, ediName = "", bestEdiM = -1, bestEdiR = -1, bestEdiS = -1;   // bestEdiS: 자리(적부도) 여부 — TallyOne 1.70
    // v2.17.4: 개정판 대체 — 같은 기본이름(끝 1~2자리 숫자/(n) 무시)의 리스트는 최신(mtime)만 남긴다.
    //   "SIMJ 2636W (Excel).xls" 1차의 빠진 컨 4대가 "(Excel)1" 2차가 와도 합본에 잔존하던 문제.
    //   (5자리 부킹번호가 붙은 CONTAINERLIST53275류는 서로 다른 리스트 — 1~2자리만 개정판으로 본다.)
    // v2.17.5: 개정판 마커 확장 — REVISED/RE)/수정/최종/개정/n차가 이름 어디에 붙어도 같은 그룹으로.
    //   (STMJ2636WCN_CNTAO_REVISED CONTAINERLIST가 원본과 합집합으로 섞이던 문제, 사용자 보고 2026-07-07.)
    const baseKey = (nm) => String(nm || "").toLowerCase()
      .replace(/\.(xls|xlsx)$/, "")
      .replace(/preloadlistdeadline|finalloadlistdeadline/g, "loadlistdeadline")
      .replace(/revised?|final|\bre\)|\(re\)|수정본|수정|최종|개정|[0-9]+차/g, " ")
      .replace(/\s*\(\d{1,2}\)$/, "").replace(/[\s_-]*\d{1,2}$/, "")
      .replace(/[\s_()\-\.]+/g, "");
    // v2.17.5b: 개정 서열 — mtime은 수집기가 매 사이클 파일을 다시 저장해 신뢰 불가(라이브에서 옛 CNTAO가
    //   REVISED보다 mtime이 최신으로 나옴). 이름의 개정 마커 자체로 서열을 정한다.
    //   최종(99) > REVISED/RE)/수정/개정(50) > n차·끝자리 n·(n)(=n) > 무표시(0). 동률이면 mtime, 그다음 이름 긴 쪽.
    const revRank = (nm) => {
      const n = String(nm || "").toLowerCase().replace(/\.(xls|xlsx|edi|asc)$/, "");
      if (/최종|final/.test(n)) return 99;
      if (/revised?|\bre\)|\(re\)|수정본|수정|개정/.test(n)) return 50;
      let r = 0, m;
      if ((m = n.match(/([0-9]{1,2})\s*차/))) r = Math.max(r, parseInt(m[1], 10));
      if ((m = n.match(/\((\d{1,2})\)\s*$/))) r = Math.max(r, parseInt(m[1], 10));
      if ((m = n.match(/[\s_-]*(\d{1,2})\s*$/))) r = Math.max(r, parseInt(m[1], 10));
      return r;
    };
    const newerRev = (a, b) => { // a가 b보다 새 개정판이면 true.
      if (!b) return true;
      const ra = revRank(a.name), rb = revRank(b.name);
      if (ra !== rb) return ra > rb;
      if ((a.mtime || 0) !== (b.mtime || 0)) return (a.mtime || 0) > (b.mtime || 0);
      return String(a.name || "").length > String(b.name || "").length;
    };
    // v2.17.9: 개정판 판정을 '내용(컨 집합) 기준'으로 (사용자 확정 2026-07-09, A안).
    //   메일 중복 다운로드로 파일명이 같아 (1)(2)가 붙은 서로 다른 선사 리스트가 같은
    //   baseKey로 묶여 최신 하나만 남고 나머지가 '구판 제외'되던 문제(SWSP 2606S:
    //   HSL1·HAS223·SKR389 중 SKR만 남아 613→389). 같은 baseKey라도 컨 집합이 겹치면
    //   (진짜 개정) 최신만, 겹치지 않으면(다른 선사) 모두 합친다.
    const listRecCache = {}, listCnSet = {};
    for (const f of files) {
      if (classify(f.name || "") !== "list") continue;
      try {
        const _out = await parseListExcel(await asArrayBuffer(f));
        const _recs = (_out && _out.records) || [];
        listRecCache[f.name] = _recs;
        const _cs = new Set();
        _recs.forEach((r) => { if (r.cn && !isBook(r.cn)) _cs.add(String(r.cn).toUpperCase()); });
        listCnSet[f.name] = _cs;
      } catch (e) {
        listRecCache[f.name] = null;
        listCnSet[f.name] = new Set();
      }
    }
    const OVERLAP_REV = 0.5;
    const _groups = {};
    for (const f of files) {
      if (classify(f.name || "") !== "list") continue;
      const _k = baseKey(f.name);
      (_groups[_k] = _groups[_k] || []).push(f);
    }
    const dropList = new Set();
    for (const _gk in _groups) {
      const _grp = _groups[_gk].slice().sort((a, b) => (newerRev(a, b) ? -1 : 1));
      const _kept = new Set();
      let _first = true;
      for (const f of _grp) {
        const _cs = listCnSet[f.name] || new Set();
        if (_first) { _first = false; _cs.forEach((c) => _kept.add(c)); continue; }
        let _inter = 0;
        _cs.forEach((c) => { if (_kept.has(c)) _inter++; });
        const _denom = Math.min(_cs.size, _kept.size) || 1;
        if (_cs.size > 0 && _inter / _denom >= OVERLAP_REV) dropList.add(f.name);
        else _cs.forEach((c) => _kept.add(c));
      }
    }
    for (const f of files) {
      const name = f.name || "";
      const kind = classify(name);
      if (kind === "list" && dropList.has(name)) {
        perFile.push({ name, kind: "list(구판 제외)", count: 0 });
        continue;
      }
      try {
        if (kind === "edi") {
          const r = parseBAPLIE(await asText(f));
          const cs = r && r.containers || [];
          const ptk = cs.filter((c) => isPtkPort(c.pol));
          // v2.17.5b: EDI도 개정 서열 우선 — RE)/REVISED EDI가 옛 EDI(평택분 최다)를 이긴다.
          //   기존 '평택분 최다' 규칙은 취소가 반영된 새 EDI(대수 감소)를 영원히 무시했다(RE)STMJ 2636W 341<361).
          //   서열 동률이면 mtime, 그다음 평택분 많은 쪽.
          const fr = revRank(name), fm = f.mtime || 0;
          // TallyOne 1.70: **자리 있는 적부도가 먼저다.** COPRAR(선적리스트)는 자리(LOC+147)가 없다.
          //   1.70 에서 COPRAR 를 읽게 되자 파일명에 "Final" 이 들어가 개정서열 99 로 대표를 뺏었고,
          //   그 결과 「EDI 기대 60·부분본」 판정이 되어 커트분 정리가 멈췄다(MAMP 633S 합본 309→310 회귀).
          const slotted = cs.some((c) => c.bay) ? 1 : 0;
          if (ptk.length > 0 && (!bestEdi || slotted > bestEdiS ||
              (slotted === bestEdiS && (fr > bestEdiR ||
              (fr === bestEdiR && (fm > bestEdiM || (fm === bestEdiM && ptk.length > bestScore))))))) {
            bestScore = ptk.length;
            bestEdiS = slotted;
            bestEdi = ptk;
            ediName = name;
            bestEdiM = fm;
            bestEdiR = fr;
          }
          perFile.push({ name, kind, count: cs.length });
        } else if (kind === "asc") {
          const r = parseAscFile(await asText(f));
          perFile.push({ name, kind, count: (r && r.containers || []).length });
        } else if (kind === "list") {
          const recs = (listRecCache[name] != null) ? listRecCache[name] : (((await parseListExcel(await asArrayBuffer(f))) || {}).records || []);
          // v2.17.11-18: 양하 리스트 오합본 가드 (SWAT 2607S 864 사건 2026-07-19).
          //   직전 기항 입항 CLL(본선 전량 적재현황)이 선적 폴더에 들어오면 864대가 통째로
          //   선적 합본이 됐다(평택 POL 0 · 평택 POD 195). 파일 자체의 평택 POL/POD를 세어
          //   POD 평택이 더 많으면 그 파일은 양하 자료 — 선적 합본에서 제외한다.
          //   판정 규칙은 GMleg(legOfFiles)와 동일 — 새 규칙 아님, 합본에 미적용이던 것을 적용.
          //   ※ 행 단위 POL 필터는 쓰지 않는다: MAMP·MCAP·MCAT·MCSN 계열은 POL에 화물
          //     출발지(CNTAO·PHDVO·CNDLC)를 적어 정상 선적분이 전멸한다(실측 MAMP 629S 197→0,
          //     MCAP 626S 231→0, MCSN 629S 287→100).
          //   기존 합본 50건 10,939행 실측: 평택 POD 행은 SWAT 2607S 195건이 전부 — 오발동 0건.
          let _ptkPol = 0, _ptkPod = 0;
          recs.forEach((r) => { if (isPtkPort(r.pol)) _ptkPol++; if (isPtkPort(r.pod)) _ptkPod++; });
          if (_ptkPod > _ptkPol) {
            perFile.push({ name, kind: "list(양하자료 제외)", count: 0, dischargeList: true, ptkPod: _ptkPod, ptkPol: _ptkPol });
            continue;
          }
          let n = 0;
          recs.forEach((r) => {
            if (r.cn && !isBook(r.cn)) {
              r._source = name;
              if (!r.fe && /empty/i.test(name)) r.fe = "E";   // v2.17.11-17: 엠티 출처 파일(MAE EMPTY LOAD LIST 등)인데 F/E 공란이면 E로 채움 — 합본 F/E 공란 287행 실측(629S), 검수앱 E확정 판정 근거
              // MailPilot 1.8-06: 다른 소스 리스트는 덮어쓰지 않고 **빈칸만 채운다** (autoreg records 와 동일 규칙).
              //   TNJP 26360E 실측 — 터미널 목록조회(Excel_*.xls 151건)가 나중에 병합되며 선사 CNTR LIST 의
              //   규격 148·리퍼온도 30 을 통째로 덮어 지웠다(iso 148→56, temp 30→0). 같은 basename 개정판은
              //   위의 dropList(구판 제외)가 이미 걸러내므로, 여기 오는 서로 다른 소스는 필드 합집합이 정답.
              const _K = r.cn.toUpperCase();
              const _prev = list[_K];
              if (!_prev) { list[_K] = r; }
              else { for (const _e of Object.entries(r)) { if (_prev[_e[0]] == null || _prev[_e[0]] === "") _prev[_e[0]] = _e[1]; } }
              n++;
            }
          });
          perFile.push({ name, kind, count: n });
        } else if (kind === "xray") {
          const out = await parseXrayList(await asArrayBuffer(f));
          const arr = out && out.containers || (out && out.records ? out.records.map((r) => r && r.cn) : []) || [];
          (Array.isArray(arr) ? arr : []).forEach((cn) => {
            if (cn) xray[String(cn).toUpperCase()] = true;
          });
          perFile.push({ name, kind, count: Array.isArray(arr) ? arr.length : 0 });
        }
      } catch (e) {
        perFile.push({ name, kind, error: String(e && e.message || e) });
      }
    }
    bestEdi = bestEdi || [];
    const ediByCarrier = {};
    bestEdi.forEach((c) => {
      const k = carrierOf(c);
      ediByCarrier[k] = (ediByCarrier[k] || 0) + 1;
    });
    const ediTotal = bestEdi.length;
    const ediReal = bestEdi.filter((c) => c.cn && !isBook(c.cn));
    const ediHasCn = ediReal.length > 0;
    // v2.17.4: 완성본 EDI가 있으면 EDI에 없는 리스트 컨은 '제외분(커트·잔존)'으로 분리 — EDI가 단일 진실.
    // v2.17.11-13: EDI 부분본 가드(TNJP 26349W 사건 2026-07-13) — 제외 대상이 EDI 실번호 총수보다
    //   많으면 그 EDI는 리스트 일부(한 선사분·구판)만 담은 부분본으로 판정하고 아무것도 제외하지 않는다.
    //   (최종 리스트 313 vs LYG EDI 46 — 267대가 커트 잔존으로 오분류돼 합본에서 잘려나갔음.)
    //   STMJ형 커트 정리(제외 13 « EDI 수백)는 그대로 동작.
    const extraCns = [];
    let extraRows = [];
    let partialEdi = false;
    // v2.17.11-15: 가상엠티(DUME·CASP 등 — 실번호 미배정 엠티 자리) 인식 (MCSN 629S 사건 2026-07-17).
    //   선사가 최종 엠티를 EDI 아닌 엑셀(MAE EMPTY LOAD LIST)로만 주면 EDI엔 DUME 더미만 있고
    //   리스트엔 엠티 실번호(187)가 온다. 이 엠티들은 'EDI밖 잔재'가 아니라 '엠티 확정분'이므로
    //   보존하며(emptyConfirmed 집계), 커트·구판 정리와 부분본 판정은 풀 화물에만 적용한다.
    const isDummyE = (cn) => { const _s = String(cn || "").toUpperCase().replace(/\s+/g, ""); return /^[A-Z]{4}\d{7}$/.test(_s) && !/^[A-Z]{3}[UJZ]/.test(_s); };   // v2.17.11-17: DUME 프리픽스 → ISO 6346 규칙(실번호는 4번째 글자 U/J/Z) — CASP69 플래너 가상번호(CASP0000001…) 77대 오집계 수정 (MCSN 629S 2026-07-18)
    const ediDummy = ediReal.reduce((n, c) => n + (isDummyE(c.cn) ? 1 : 0), 0);
    const ediRealCns = ediReal.filter((c) => !isDummyE(c.cn));
    let emptyConfirmed = 0;
    if (ediHasCn) {
      const eset = new Set(ediRealCns.map((c) => String(c.cn).toUpperCase()));
      for (const cn of Object.keys(list)) {
        if (eset.has(cn)) continue;
        const _c = list[cn] || {};
        const _isE = String(_c.fe || "").toUpperCase() === "E" || /empty/i.test(String(_c._source || ""));
        if (ediDummy > 0 && _isE) { emptyConfirmed++; continue; }
        extraCns.push(cn);
      }
      if (extraCns.length > ediRealCns.length) {
        partialEdi = true;
        extraCns.length = 0;
      } else {
        extraCns.sort();
        extraRows = extraCns.map((cn) => { const c = list[cn]; return { "Cntr No": cn, "Line": c.op || "", "F/E": c.fe || "", "POD": c.pod || "", "출처파일": c._source || "" }; });
        extraCns.forEach((cn) => { delete list[cn]; });
      }
    }
    const listKeys = Object.keys(list);
    const listTotal = listKeys.length;
    let missingByCarrier = {};
    const missingCns = [];
    if (ediHasCn) {
      const lset = new Set(listKeys);
      ediRealCns.forEach((c) => {   // v2.17.11-15: DUME 더미는 부족 대상 아님
        const cn = String(c.cn).toUpperCase();
        if (!lset.has(cn)) {
          const k = carrierOf(c);
          missingByCarrier[k] = (missingByCarrier[k] || 0) + 1;
          missingCns.push(cn);
        }
      });
    }
    const rows = Object.values(list).map((c) => ({ "Cntr No": c.cn || "", "ISO": c.iso || "", "Line": c.op || "", "F/E": c.fe || "", "POL": c.pol || "", "POD": c.pod || "", "Seal": c.sl || "", "EmptySeal": c.eseal || "", "Weight": c.wt || "", "Temp": c.tmp || "", "XRAY": xray[(c.cn || "").toUpperCase()] ? "Y" : "" }));
    const carrierRows = Object.keys(ediByCarrier).sort().map((k) => ({ "\uC120\uC0AC": k, "EDI\uAE30\uB300": ediByCarrier[k], "\uBD80\uC871(\uC2E4\uBC88\uD638\uAE30\uC900)": ediHasCn ? missingByCarrier[k] || 0 : "" }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "LOADING_LIST");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(carrierRows), "\uC120\uC0AC\uBCC4");
    if (extraRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extraRows), "\uC81C\uC678\uBD84(EDI\uBC16)");   // v2.17.4
    const xlsxBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const report = {
      ediFile: ediName,
      ediHasCn,
      ediTotal,
      // 부킹 EDI 기대 총계
      ediByCarrier,
      // {선사: 기대 갯수}
      listTotal,
      // 수집 CLL 중복제거 총계
      gap: ediTotal - listTotal,
      // 총계 부족(1차)
      missingByCarrier,
      // {선사: 부족 갯수} (완성본 있을 때만)
      missingCns: missingCns.slice(0, 300),
      extraTotal: extraCns.length,
      // v2.17.4: EDI 밖 잔존(커트·구판) — LOADING_LIST에서 분리됨
      extraCns: extraCns.slice(0, 300),
      partialEdi,
      // v2.17.11-13: EDI 부분본 판정(제외 대상 > EDI 총수) — 리스트 전체 보존됨
      emptyConfirmed,
      // v2.17.11-15: 엠티 확정(EDI 가상엠티 자리를 채우는 선사 엑셀 실번호 수) — 검수앱 info 기록용
      ediDummy,
      dischargeSkipped: perFile.filter((p) => p.dischargeList).map((p) => ({ name: p.name, pod: p.ptkPod, pol: p.ptkPol })),
      // v2.17.11-18: 양하 자료로 판정돼 선적 합본에서 제외된 리스트 파일
      perFile
    };
    return { xlsxBase64, report };
  }
  async function legOfFiles(files) {
    await loadSheetJS();
    const out = [];
    for (const f of files) {
      const name = f.name || "";
      const kind = classify(name);
      let pol = 0, pod = 0, leg = "";
      try {
        let recs = [];
        if (kind === "edi") { const r = parseBAPLIE(await asText(f)); recs = (r && r.containers) || []; }
        else if (kind === "asc") { const r = parseAscFile(await asText(f)); recs = (r && r.containers) || []; }
        else if (kind === "list") { const o = await parseListExcel(await asArrayBuffer(f)); recs = (o && o.records) || []; }
        recs.forEach((c) => { if (isPtkPort(c.pol)) pol++; if (isPtkPort(c.pod)) pod++; });
        leg = pol > pod ? "\uC120\uC801" : (pod > pol ? "\uC591\uD558" : "");
      } catch (e) { leg = ""; }
      out.push({ name, kind, leg, pol, pod });
    }
    return out;
  }
  if (typeof window !== "undefined") {
    window.GMmerge = mergeFolder;
    window.GMleg = legOfFiles;
    window.GM_HELPER_VERSION = APP_VERSION;
  }

