// X-RAY 조회 + 세관봉인 확인서 인쇄 — 검수사 시안 「Xray-Integrated-Dashboard-Print」 대응 (TallyOne 2.26)
//
//   검수사 확정 2026-08-24 —
//     «XRAY 실번호는 미리 입력 할수도 있고 현장에서 달면서 입력 할수도 있습니다. 그때 봉인자 입력을 받으면 됩니다.»
//     «앱을 사용하지 않고 양식만 출력할때는 수동으로 봉인자를 입력 할수 있게 해야 합니다.»
//     «기본 출력리스트는 만들어집니다. 다만 **실번호 봉인자 둘만** 기록이 되어 있거나 안되어 있을수 있습니다.»
//     «출력시 화면 상단에 **선박명 + XRAY리스트** 라고 표기 됩니다.»
//     «순서는 **베이별순 + 우선양하순**» · «최소 크기가 넘어가면 2장 … 40대라면 20대 20대»
//     «화물구분은 그대로 두면 됩니다. **XRAY조회시+출력시에만** 구분 하면 됩니다.»
//
//   ★ 이 화면의 설계 축은 하나다 — **양식은 두 가지로 쓰인다.**
//     ① 앱으로 채워 출력  ② 백지로 뽑아 현장에서 손으로 적음
//     그래서 값이 없는 칸은 «빈칸»이 아니라 **손글씨가 들어갈 밑줄 칸**으로 찍는다.
//
//   ⛔ 앱 전반의 X-RAY 표시 판정은 건드리지 않았다(검수사 확정). 화물구분은 여기서만 쓴다.
import React, { useMemo, useState } from 'react';
import { Printer, Search as SearchIcon, X } from 'lucide-react';
import { sortByDischargePlan } from '../utils.js';
import { resolveShipDisplayName } from './ShipIntroCard.jsx';   // 2.26-01: 선박 풀네임은 정본 한 벌로
import { openXrayListPrint } from '../inspectionList.js';        // 2.26-02: 인쇄는 검수리스트·VGM 과 같은 벌(별도 문서)

//  세관 파일의 화물구분 4종 — 실측 64개 358행(X-RAY 252 · Sea & Air 84 · 반입후검사 14 · 즉시검사 8).
//  ⚠ 시안에는 «즉시검사»가 빠져 있었다. 실물에 있으므로 넣는다.
const KINDS = [
  { k: 'X-RAY', c: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/25' },
  { k: 'Sea & Air', c: 'text-sky-300', bg: 'bg-sky-500/15 border-sky-500/25' },
  { k: '반입후검사', c: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/25' },
  { k: '즉시검사', c: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-500/25' },
];
const PER_PAGE = 20;   // 하한 8pt 에서 A4 가로 한 장에 들어가는 줄 수(검수사 «40대라면 20대 20대»)

const pos = (c) => (c && c.bay && c.row && c.tier
  ? `${String(c.bay).padStart(2, '0')}-${String(c.row).padStart(2, '0')}-${String(c.tier).padStart(2, '0')}`
  : '');

export default function XrayTab({ voyage, voyageKey, mode, containers = [],
                                  xrayMap = {}, xraySeals = {}, compMap = {}, portMisData = {} }) {
  const [kindFilter, setKindFilter] = useState('');
  const [q, setQ] = useState('');

  const info = voyage?.info || {};

  /* ★ 2.26-01 — **기존 출력물에서 한 칸도 빠지면 안 된다.** (검수사 실물 `OWBH_2721_XRAY2.pdf`)
       종전 양식 머리는 여섯 칸이다.
         항차/항공편명 · 운항선사 · 입항일자 · 양륙항 · 선박명 · 선박 호출부호  (+ MRN)
       2.26 첫 판은 제목 한 줄과 MRN 만 찍어 **넷을 빠뜨렸다**(운항선사·입항일자·양륙항·호출부호).
       게다가 선박명을 `info.vsl`(코드 `OBWH`)로 써서 기존 풀네임 `OCEAN BLUE WHALE` 과 달랐다. */
  const head = useMemo(() => {
    const dict = (typeof window !== 'undefined' && window.__fbShipBayDict) || null;   // 사전은 전역 한 벌
    const code = String(info.vsl || '').toUpperCase();
    //  호출부호 — info 에 없는 항차가 많다(실측 OBWH_2721E). 사전에서 코드로 찾는다.
    const dictE = dict ? (dict[code] || Object.values(dict).find((e) => e
                    && String(e.code || '').toUpperCase() === code)) : null;
    const cs = String(info.callsign || dictE?.callsign || '').toUpperCase();
    let pm = cs && portMisData[cs];
    if (!pm && cs) pm = Object.values(portMisData).find((p) => {
      const pcs = String(p?.callsign || '').toUpperCase();
      return pcs && pcs.length >= 4 && (pcs.startsWith(cs) || cs.startsWith(pcs));
    });
    const mrn = pm ? ((mode === 'loading' ? pm.mrnOut : pm.mrnIn) || pm.mrn || '') : '';
    //  입항일자 — PORT-MIS 입항일시가 1순위, 없으면 항차 작업창 앞자리. «2026.08.24» 형태.
    const rawEta = String(pm?.eta || info.planDate || '').trim();
    const md = rawEta.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
    return {
      voy: (mode === 'loading' ? info.voy_l : info.voy_d) || info.voy || '',
      /*  운항선사 — **MRN 이 `lane` 보다 정확하다**(2.26-05, 검수사 화면에서 드러남).
          MRN 은 세관 신고번호라 2~6자가 **신고인(선사) 부호**다 — 26**YTFF**2721I · 26**HTFR**091EI ·
          26**KMTC**AK07E · 26**DJSC**D45PE. 실측 9척 전부 선사 코드였다.
          `lane` 은 **항로** 코드라 다를 수 있다 — RZOR 은 lane `RZPT`(일조–평택)인데 선사는 `HTFR` 다.
          OBWH 는 둘 다 YTFF 라 우연히 같았고, 그것만 보고 lane 을 먼저 뒀던 것이 2.26-01 의 실수다. */
      carrier: info.carrier || (mrn.length >= 6 ? mrn.slice(2, 6) : '') || info.lane || '',
      eta: md ? `${md[1]}.${md[2]}.${md[3]}` : '',
      pod: 'KRPTK',                                    // 평택항 앱이다 — 양륙항은 고정
      name: resolveShipDisplayName(info, portMisData, dict).name || code,
      callsign: cs,
      mrn,
    };
  }, [info, portMisData, mode]);

  //  세관 목록 = xrayList. 위치·봉인은 각각 EDI·xraySeals·completed 에서 붙인다.
  const rows = useMemo(() => {
    const byCn = new Map(containers.map((c) => [c.cn, c]));
    const out = Object.entries(xrayMap || {}).map(([cn, x]) => {
      const c = byCn.get(cn) || {};
      const xs = xraySeals[cn] || {};
      return {
        cn,
        seal: (x && x.seal) || '',                       // 선사 SEAL(세관 파일)
        kind: (x && x.kind) || '',                       // 화물구분 4종
        iso: (x && x.iso) || c.iso || '',
        bay: c.bay || '', row: c.row || '', tier: c.tier || '',
        cSeal: xs.seal || '',                            // 부착 세관봉인번호 — 없으면 손으로 적는다
        //  봉인자 — 따로 적은 것이 있으면 그것, 없으면 **그 컨을 완료한 검수자**.
        //  갱이 2~3분할되고 갱별로 검수자가 정해지므로 완료 기록의 검수자가 곧 봉인자다.
        sealer: xs.sealer || (compMap[cn] && compMap[cn].by) || '',
      };
    });
    return sortByDischargePlan(out);   // 베이별순 + 우선양하순
  }, [xrayMap, containers, xraySeals, compMap]);

  const counts = useMemo(() => {
    const m = { _all: rows.length };
    for (const r of rows) m[r.kind] = (m[r.kind] || 0) + 1;
    return m;
  }, [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toUpperCase();
    return rows.filter((r) => (!kindFilter || r.kind === kindFilter)
      && (!t || r.cn.includes(t) || (r.seal || '').toUpperCase().includes(t)));
  }, [rows, kindFilter, q]);

  const pages = useMemo(() => {
    //  하한(8pt)으로도 한 장에 안 들어가면 **장을 늘리고 균등 분할**한다 — 40대는 20+20.
    const n = Math.max(1, Math.ceil(shown.length / PER_PAGE));
    const per = Math.ceil(shown.length / n) || 1;
    return Array.from({ length: n }, (_, i) => shown.slice(i * per, (i + 1) * per));
  }, [shown]);

  const title = `${head.name} ${head.voy}`.trim();

  if (mode !== 'discharge' && !rows.length) {
    return <div className="p-6 text-center text-[13px] text-slate-500">X-RAY 목록은 양하에서 봅니다.</div>;
  }

  return (
    <div className="space-y-3">
      <style>{`
        /*  2.26-02: 인쇄 CSS 는 여기 없다 — 인쇄는 별도 문서로 연다(inspectionList.generateXrayListHTML).
            2.26 은 앱 화면 안에 인쇄 블록을 두고 @media print 로 형제를 가렸는데, 그 블록이
            body 직계가 아니라 #root 안이라 **부모가 숨으면 같이 숨어** 미리보기가 새까맣게 나왔다. */
      `}</style>

      {/* ── 조회 ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* 첫 장이 «X-RAY 대상 전체» 다 — 뒤 넷은 그 안의 검사 유형 구분이지 대상 여부가 아니다. */}
        {[{ k: '', t: 'X-RAY 대상', n: counts._all, c: 'text-slate-100', bg: 'bg-slate-800/60 border-slate-700' },
          ...KINDS.map((x) => ({ k: x.k, t: x.k, n: counts[x.k] || 0, c: x.c, bg: x.bg }))].map((x) => (
          <button key={x.k || 'all'} onClick={() => setKindFilter(x.k)}
            className={`rounded-xl border p-3 text-left ${x.bg} ${kindFilter === x.k ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="text-[10px] text-slate-400">{x.t}</div>
            <div className={`text-[22px] font-black leading-none mt-1 ${x.c}`}>{x.n}</div>
          </button>
        ))}
      </div>

      {/*  2.26-05: MRN 이 비면 **왜 비었는지** 말한다 — 조용히 빈칸으로 두지 않는다(3금지 ③).
           PORT-MIS 엑셀을 2.26 이후에 다시 올려야 MRN 이 담긴다(그 전 레코드엔 필드가 없다). */}
      {!head.mrn && !!rows.length && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          ⚠ MRN 이 비어 있습니다 — <b>업로드 탭에서 PORT-MIS 엑셀을 다시 올리면</b> 채워집니다.
          (2026-08-24 이전에 올린 자료에는 MRN 칸이 없습니다.)
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 h-11">
          <SearchIcon className="w-4 h-4 text-slate-500"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="컨번호 · 씰번호"
            className="flex-1 bg-transparent text-[13px] outline-none"/>
          {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-slate-500"/></button>}
        </div>
        {/* 조회의 필터·검색이 그대로 인쇄로 간다(시안 «연계» — 같은 `shown` 을 넘긴다).
            머리 부제는 그 결과를 밝힌다 — «전체 N대 · X-RAY M대», 필터가 걸렸으면 그것도. */}
        <button onClick={() => openXrayListPrint(
          shown.map(r => ({ ...r, pos: pos(r) })),
          /* ★ 2.26-07 (검수사 정정 2026-08-24) — *«20대 전부가 XRAY입니다. 다만 구분만 틀린것»*
             세관 목록에 오른 것은 **전부 X-RAY 대상**이고, 「화물구분」은 그 안의 **검사 유형**이다.
             종전 부제 «전체 20대 · X-RAY 5대» 는 5대만 대상인 것처럼 읽혔다.
             ⇒ 총 대수를 앞에 두고, 구분은 **내역으로 전부** 나열한다(없는 구분은 뺀다). */
          { ...head, sub: `전체 ${rows.length}대`
            + (kindFilter ? ` 중 ${kindFilter} ${shown.length}대`
                          : (() => { const d = KINDS.map(k => counts[k.k] ? `${k.k} ${counts[k.k]}` : '')
                                       .filter(Boolean).join(' · ');
                                     return d ? ` (${d})` : ''; })()) },
          PER_PAGE)}
          disabled={!shown.length}
          className="h-11 px-4 rounded-lg bg-amber-500 text-slate-900 font-bold text-[13px] flex items-center gap-1.5 disabled:opacity-40">
          <Printer className="w-4 h-4"/>출력 {pages.length > 1 ? `(${pages.length}장)` : ''}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-[12px] text-slate-400">
          {title} · X-RAY 대상 {rows.length}대{kindFilter ? ` 중 ${kindFilter} ${shown.length}대` : ''} · 베이별순 + 우선양하순
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] text-slate-500">
              <tr className="border-b border-slate-800">
                {/* 열 이름은 **기존 출력물 그대로** — 「SEAL NO」가 아니라 「선사SEAL NO」다 */}
                {['No.', '컨테이너번호', '선사SEAL NO', '화물구분', '규격', '선내위치', '부착 세관봉인번호', '봉인자'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.cn} className="border-b border-slate-800/50">
                  <td className="px-2 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-2 py-2 mono font-bold">{r.cn}</td>
                  <td className="px-2 py-2 mono text-slate-300">{r.seal || '—'}</td>
                  <td className={`px-2 py-2 ${(KINDS.find((k) => k.k === r.kind) || {}).c || 'text-slate-400'}`}>{r.kind || '—'}</td>
                  <td className="px-2 py-2 mono text-slate-400">{r.iso || '—'}</td>
                  <td className="px-2 py-2 mono text-slate-300">{pos(r) || <span className="text-rose-400">위치 미상</span>}</td>
                  <td className="px-2 py-2 mono">{r.cSeal || <span className="text-slate-600">미입력</span>}</td>
                  <td className="px-2 py-2">{r.sealer || <span className="text-slate-600">미입력</span>}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-600">
                  세관 X-RAY 목록이 없습니다 — 업로드 탭에서 「검수업체컨테이너목록조회」 파일을 올려 주세요.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

