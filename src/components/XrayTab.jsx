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
//   ★ TallyOne 2.39 (2026-08-25) — 위 4행 «그때 봉인자 입력을 받으면 됩니다» 를 **이제 실제로 구현했다.**
//     ⚠ 그 문장은 2.26 부터 이 주석에 적혀 있었는데 코드가 없었다. `xs.sealer` 는 읽기만 하고
//       쓰는 곳이 저장소에 한 곳도 없었고, 매뉴얼(helpData)은 «저절로 들어갑니다»라고 이미 적어 두었다.
//       그래서 검수사가 2026-08-25 에 **같은 요청을 다시** 해야 했다. 적어 두는 것은 구현이 아니다.
//     검수사 확정 2026-08-25 —
//       *«봉인번호 저장과 양하완료 버튼이 2개가 있어 봉인자를 저절로 수정할수 있습니다. 같은 검수사가 아니라면»*
//       *«XRAY 실번호를 입력할때 봉인자 등록여부 체크칸을 만들어 주세요 … 현장에서 봉인을 다 못할수도 있기때문»*
//       *«출력물 한장은 사무실에 제출 … 단 마무리 될경우에만. 인계할때는 봉인한것 까지만»*
//       *«앱에서 컨번호를 조회하면 실번호와 XRAY번호를 둘다 볼수 있기 때문»* ← 미리 넣는 진짜 이유
//
//   ⛔ 앱 전반의 X-RAY 표시 판정은 건드리지 않았다(검수사 확정). 화물구분은 여기서만 쓴다.
import React, { useMemo, useState } from 'react';
import { Printer, Search as SearchIcon, X } from 'lucide-react';
import { sortByDischargePlan, xraySealerOf } from '../utils.js';   // 2.39: 봉인자 판정은 공용 한 벌
import { fbSetXraySeal } from '../firebase.js';                     // 2.39: 표에서 바로 봉인번호·봉인자 저장
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

export default function XrayTab({ voyage, voyageKey, mode, containers = [], inspector = '',
                                  xrayMap = {}, xraySeals = {}, compMap = {}, portMisData = {} }) {
  const [kindFilter, setKindFilter] = useState('');
  const [q, setQ] = useState('');
  //  2.39: 표에서 바로 고친다 — 사무실에서 미리 채워 인쇄해 나가려면 컨을 하나씩 열 수 없다.
  //  편집 상태는 한 벌만 둔다(같은 순간에 두 칸을 고치지 않는다).
  const [edit, setEdit] = useState(null);      // { cn, field: 'seal' | 'sealer', val }
  const [busy, setBusy] = useState('');        // 저장 중인 컨 — 두 번 눌러 두 번 쓰는 것을 막는다

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
        eseal: xs.eseal || '',                           // 2.39: 저장할 때 전자봉인을 안 날리려고 들고 다닌다
        //  ★ 2.39 봉인자 — 판정은 utils.xraySealerOf 한 벌뿐이다(화면·인쇄·CSV 가 같은 값을 쓴다).
        //    「봉인자 등록」 체크한 사람 · 그 뒤 양하완료를 다른 사람이 누르면 그 사람 · 손으로 고치면 그것.
        sealer: xraySealerOf(xs, compMap[cn]),
      };
    });
    return sortByDischargePlan(out);   // 베이별순 + 우선양하순
  }, [xrayMap, containers, xraySeals, compMap]);

  //  ★ 2.39 — 봉인번호·봉인자 저장. 조용히 실패하지 않는다(3금지 ③): 실패하면 화면에 띄운다.
  const canEdit = mode === 'discharge' && !!voyageKey;
  async function saveXray(cn, seal, eseal, sealerOpt) {
    if (!canEdit) return;
    setBusy(cn);
    try {
      await fbSetXraySeal(voyageKey, cn, String(seal || '').trim().toUpperCase(),
                          String(eseal || '').trim(), inspector, sealerOpt);
    } catch (e) {
      alert('저장하지 못했습니다 — ' + (e && e.message ? e.message : e) + '\n다시 시도해 주십시오.');
    } finally { setBusy(''); setEdit(null); }
  }
  //  체크 = 「봉인자 등록」. 켜면 지금 로그인한 사람이 봉인자가 되고, 끄면 지운다.
  const toggleRegister = (r) => saveXray(r.cn, r.cSeal, r.eseal, { register: !r.sealer });

  const counts = useMemo(() => {
    const m = { _all: rows.length };
    for (const r of rows) m[r.kind] = (m[r.kind] || 0) + 1;
    return m;
  }, [rows]);
  //  2.39: 봉인자가 기록된 대수 — 전부 차야 «사무실 제출본»이다.
  const sealedCount = useMemo(() => rows.filter((r) => r.sealer).length, [rows]);

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
    return <div className="p-6 text-center text-sm2 text-dim-400">X-RAY 목록은 양하에서 봅니다.</div>;
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
        {[{ k: '', t: 'X-RAY 대상', n: counts._all, c: 'text-dim-100', bg: 'bg-ink-800/60 border-line' },
          ...KINDS.map((x) => ({ k: x.k, t: x.k, n: counts[x.k] || 0, c: x.c, bg: x.bg }))].map((x) => (
          <button key={x.k || 'all'} onClick={() => setKindFilter(x.k)}
            className={`rounded-btn border p-3 text-left ${x.bg} ${kindFilter === x.k ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="text-2xs text-dim-300">{x.t}</div>
            <div className={`text-[22px] font-black leading-none mt-1 ${x.c}`}>{x.n}</div>
          </button>
        ))}
      </div>

      {/*  2.26-05: MRN 이 비면 **왜 비었는지** 말한다 — 조용히 빈칸으로 두지 않는다(3금지 ③).
           PORT-MIS 엑셀을 2.26 이후에 다시 올려야 MRN 이 담긴다(그 전 레코드엔 필드가 없다). */}
      {!head.mrn && !!rows.length && (
        <div className="rounded-pill border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xxs text-amber-200">
          ⚠ MRN 이 비어 있습니다 — <b>업로드 탭에서 PORT-MIS 엑셀을 다시 올리면</b> 채워집니다.
          (2026-08-24 이전에 올린 자료에는 MRN 칸이 없습니다.)
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-ink-900 border border-line rounded-pill px-3 h-11">
          <SearchIcon className="w-4 h-4 text-dim-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="컨번호 · 씰번호"
            className="flex-1 bg-transparent text-sm2 outline-none"/>
          {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-dim-400"/></button>}
        </div>
        {/* 조회의 필터·검색이 그대로 인쇄로 간다(시안 «연계» — 같은 `shown` 을 넘긴다).
            머리 부제는 그 결과를 밝힌다 — «전체 N대 · X-RAY M대», 필터가 걸렸으면 그것도. */}
        <button onClick={() => openXrayListPrint(
          shown.map(r => ({ ...r, pos: pos(r) })),
          /* ★ 2.26-07 (검수사 정정 2026-08-24) — *«20대 전부가 XRAY입니다. 다만 구분만 틀린것»*
             세관 목록에 오른 것은 **전부 X-RAY 대상**이고, 「화물구분」은 그 안의 **검사 유형**이다.
             종전 부제 «전체 20대 · X-RAY 5대» 는 5대만 대상인 것처럼 읽혔다.
             ⇒ 총 대수를 앞에 두고, 구분은 **내역으로 전부** 나열한다(없는 구분은 뺀다). */
          /* ★ 2.39 — 머리에 **봉인 진행**을 얹는다. 검수사 확정 —
               *«출력물 한장은 사무실에 제출을 해야 합니다. 단 마무리 될경우에만.
               작업을 인계해야 될때는 다음 검수자에게 봉인한것 까지만 봉인자가 기록된것을
               출력물로 넘겨야 합니다.»*
               같은 종이가 두 가지로 쓰이므로, 어느 쪽인지 **종이 자신이 말해야** 한다.
               미완본을 사무실에 잘못 내는 것을 막는 유일한 장치다.
               ⚠ 인쇄 파일(inspectionList.js)은 손대지 않는다 — 그 머리는 이미 head.sub 를 그린다. */
          { ...head, sub: `전체 ${rows.length}대`
            + (kindFilter ? ` 중 ${kindFilter} ${shown.length}대`
                          : (() => { const d = KINDS.map(k => counts[k.k] ? `${k.k} ${counts[k.k]}` : '')
                                       .filter(Boolean).join(' · ');
                                     return d ? ` (${d})` : ''; })())
            + ` · 봉인 ${sealedCount}/${rows.length}`
            + (sealedCount === rows.length && rows.length ? ' 완료' : ' (인계용)') },
          PER_PAGE)}
          disabled={!shown.length}
          className="h-11 px-4 rounded-pill bg-amber-500 text-ink-950 font-bold text-sm2 flex items-center gap-1.5 disabled:opacity-40">
          <Printer className="w-4 h-4"/>출력 {pages.length > 1 ? `(${pages.length}장)` : ''}
        </button>
      </div>

      <div className="bg-ink-900 border border-line rounded-btn overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line text-xs2 text-dim-300">
          {title} · X-RAY 대상 {rows.length}대{kindFilter ? ` 중 ${kindFilter} ${shown.length}대` : ''} · 베이별순 + 우선양하순
          {/*  2.39: 이 종이가 «사무실 제출본»인지 «인계본»인지 화면에서 먼저 보인다. */}
          {!!rows.length && (
            <span className={`ml-2 px-2 py-0.5 rounded-pill text-2xs font-bold ${
              sealedCount === rows.length ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
              봉인 {sealedCount}/{rows.length}{sealedCount === rows.length ? ' 완료 · 사무실 제출 가능' : ' · 인계용'}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs2">
            <thead className="text-2xs text-dim-400">
              <tr className="border-b border-line">
                {/* 열 이름은 **기존 출력물 그대로** — 「SEAL NO」가 아니라 「선사SEAL NO」다 */}
                {['No.', '컨테이너번호', '선사SEAL NO', '화물구분', '규격', '선내위치', '부착 세관봉인번호', '봉인자'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.cn} className="border-b border-line-soft">
                  <td className="px-2 py-2 text-dim-400">{i + 1}</td>
                  <td className="px-2 py-2 mono font-bold">{r.cn}</td>
                  <td className="px-2 py-2 mono text-dim-200">{r.seal || '—'}</td>
                  <td className={`px-2 py-2 ${(KINDS.find((k) => k.k === r.kind) || {}).c || 'text-dim-300'}`}>{r.kind || '—'}</td>
                  <td className="px-2 py-2 mono text-dim-300">{r.iso || '—'}</td>
                  <td className="px-2 py-2 mono text-dim-200">{pos(r) || <span className="text-rose-400">위치 미상</span>}</td>
                  {/* ── 2.39 부착 세관봉인번호 — 그 자리에서 친다 ──
                       검수사 확정 *«사무실에서 직접 지정하고 출력물을 인쇄해서 나가야»* ·
                       *«앱에서 컨번호를 조회하면 실번호와 XRAY번호를 둘다 볼수 있기 때문»*.
                       컨을 하나씩 열게 하면 그 목적이 사라진다. */}
                  <td className="px-2 py-2 mono">
                    {edit && edit.cn === r.cn && edit.field === 'seal' ? (
                      <input autoFocus value={edit.val} disabled={busy === r.cn}
                        onChange={(e) => setEdit({ ...edit, val: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveXray(r.cn, edit.val, r.eseal);
                                            if (e.key === 'Escape') setEdit(null); }}
                        onBlur={() => saveXray(r.cn, edit.val, r.eseal)}
                        placeholder="세관봉인번호"
                        className="w-36 bg-ink-800 border border-purple-500 rounded px-2 py-1 mono text-purple-200 outline-none"/>
                    ) : (
                      <button disabled={!canEdit} onClick={() => setEdit({ cn: r.cn, field: 'seal', val: r.cSeal })}
                        className="text-left disabled:cursor-default">
                        {r.cSeal
                          ? <span className="text-purple-200">{r.cSeal}</span>
                          : <span className="text-dim-500 italic">{canEdit ? '입력 ✏' : '미입력'}</span>}
                      </button>
                    )}
                  </td>
                  {/* ── 2.39 봉인자 ──
                       검수사 확정 *«봉인자 등록여부 체크칸… 번호는 입력했더라도 현장에서 봉인을
                       다 못할수도 있기 때문»*. 체크해야 출력물에 이름이 찍힌다.
                       ⛔ 자리를 없애지 않는다 — 못 누르는 이유를 남긴다(작업표준 2-0-D). */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!r.sealer}
                        disabled={!canEdit || busy === r.cn || (!r.sealer && !r.cSeal)}
                        onChange={() => toggleRegister(r)}
                        title={!r.cSeal && !r.sealer ? '봉인번호를 먼저 입력하십시오' : '봉인자 등록'}
                        className="w-4 h-4 accent-emerald-500 disabled:opacity-30"/>
                      {edit && edit.cn === r.cn && edit.field === 'sealer' ? (
                        <input autoFocus value={edit.val} disabled={busy === r.cn}
                          onChange={(e) => setEdit({ ...edit, val: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveXray(r.cn, r.cSeal, r.eseal, { sealer: edit.val });
                                              if (e.key === 'Escape') setEdit(null); }}
                          onBlur={() => saveXray(r.cn, r.cSeal, r.eseal, { sealer: edit.val })}
                          placeholder="봉인자"
                          className="w-24 bg-ink-800 border border-emerald-500 rounded px-2 py-1 text-emerald-200 outline-none"/>
                      ) : r.sealer ? (
                        <button disabled={!canEdit} onClick={() => setEdit({ cn: r.cn, field: 'sealer', val: r.sealer })}
                          className="text-emerald-300 font-bold disabled:cursor-default">{r.sealer}</button>
                      ) : (
                        <span className="text-dim-500 italic">미등록</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-xs2 text-dim-500">
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

