// 소유자 전용 — 미르·사진 읽기가 쓴 AI 비용(클로드·제미나이)을 날짜·종류별로 보고 Console 숫자와 맞대는 화면(수석 상황판 › 🧰 관리 › 👑 소유자 메뉴)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fbGetAiCost, fbSaveAiConsole } from '../firebase.js';
import { aggregateAiCost, aiPeriodDays, aiModelShort, aiKindLabel, aiConsoleGap, AI_DEFAULT_CHAT_MODEL } from '../aiCost.js';

//  4.37 — 검수사 2026-10-19 «미르가 사용하는 토큰을 관리하고 분석» · «비용관리 보고는 소유자 관리 안에둡니다» · Console 화면을 보내며 «이것도 같이 넣어 주세요»
//         · «사진읽기 상한은 일단 넣지 않습니다. 최대가 얼마나 되는지 알아야 하기때문입니다» → 종류별 1회 평균 · 1회 최대를 보인다.
//  ⚠ 구독하지 않는다 — 펼칠 때 한 번(이번 달 + 최근 7일) 읽고, 기간 칩은 읽은 것 안에서 고른다. [🔄 새로 고침]으로 다시 읽는다.
//  ⚠ 키 값(claudeKey·aiKey)은 읽지도 그리지도 않는다(fbGetAiCost 가 키가 아닌 칸만 돌려준다).
//  ⚠ 금액은 앱 기록으로 센 «최소치» — 앱을 거치지 않고 키로 부른 호출은 빠진다. 정본은 Console 이고, 그 차이를 아래 Console 칸이 보인다.
const PERIODS = [['today', '오늘'], ['yesterday', '어제'], ['7d', '7일'], ['month', '이번 달']];
const APP_NAME = { tally: '검수앱', cone: '콘앱' };
const pad = (n) => String(n).padStart(2, '0');
const hm = (ms) => {
  const n = Number(ms);
  if (!n) return '—';
  const d = new Date(n);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const usd = (v, d = 3) => `$${(Number(v) || 0).toFixed(d)}`;
const num = (v) => (Number(v) || 0).toLocaleString('ko-KR');
const man = (v) => { const n = Number(v) || 0; return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만` : num(n); };
//  «22.6만» · «$198.15» · «1,234» 를 숫자로 — Console 화면 글자를 그대로 옮겨 적어도 되게
const parseConsoleNum = (s) => {
  const t = String(s ?? '').trim();
  if (!t) return '';
  const m = t.replace(/[$,\s]|US/gi, '').match(/^(\d+(?:\.\d+)?)(만)?$/);
  if (!m) return NaN;
  return Number(m[1]) * (m[2] ? 10000 : 1);
};
const sameMonth = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth(); };

export default function AiCostPanel({ by }) {
  const [res, setRes] = useState(null);         // null = 읽는 중 · {days, cfg, console}
  const [err, setErr] = useState('');
  const [period, setPeriod] = useState('today');
  const [form, setForm] = useState(null);       // Console 숫자 적기 칸(열렸을 때만)
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setRes(null); setErr('');
    try {
      const keys = [...new Set([...aiPeriodDays('month'), ...aiPeriodDays('7d')])];
      setRes(await fbGetAiCost(keys, by));
    } catch (e) {
      setErr((e && e.message) || String(e));
      setRes({ days: [], cfg: {}, console: null });
    }
  }, [by]);
  useEffect(() => { load(); }, [load]);

  const cfg = (res && res.cfg) || {};
  const chatModel = cfg.claudeModel || AI_DEFAULT_CHAT_MODEL;
  const pick = useCallback((keys) => {
    const want = new Set(keys);
    return ((res && res.days) || []).filter((d) => want.has(d.day));
  }, [res]);
  const agg = useMemo(() => (res ? aggregateAiCost(pick(aiPeriodDays(period)), { chatModel }) : null), [res, period, chatModel, pick]);
  const today = useMemo(() => (res ? aggregateAiCost(pick(aiPeriodDays('today')), { chatModel }) : null), [res, chatModel, pick]);
  const con = (res && res.console) || null;
  const conFresh = !!(con && con.at && sameMonth(con.at, Date.now()));
  //  Console 숫자를 적은 시각까지의 앱 기록 — 같은 순간끼리 맞댄다
  const appAtCon = useMemo(() => (res && conFresh ? aggregateAiCost(pick(aiPeriodDays('month', con.at)), { chatModel, until: con.at }) : null), [res, conFresh, con, chatModel, pick]);
  const gap = appAtCon && con && con.monthSpend !== undefined && con.monthSpend !== null ? aiConsoleGap(con.monthSpend, appAtCon.total.usd) : null;

  //  미르(mir.js getMirConfig)와 같은 읽기 — 없거나 숫자가 아니면 1달러(감사 4.37: 글자가 들어가면 미르는 1달러, 화면은 0 으로 갈리던 것)
  const webLimit = cfg.webSearchUsd === undefined || cfg.webSearchUsd === null || cfg.webSearchUsd === '' || Number.isNaN(Number(cfg.webSearchUsd)) ? 1 : Math.max(0, Number(cfg.webSearchUsd));
  const coneLimit = Math.round(webLimit * 0.5 * 100) / 100;
  const periodName = (PERIODS.find(([k]) => k === period) || PERIODS[0])[1];

  const openForm = () => setForm({
    credit: con && con.credit != null ? String(con.credit) : '',
    monthSpend: con && con.monthSpend != null ? String(con.monthSpend) : '',
    monthLimit: con && con.monthLimit != null ? String(con.monthLimit) : '',
    tokens7d: con && con.tokens7d != null ? String(con.tokens7d) : '',
  });
  const saveForm = async () => {
    const patch = {};
    for (const k of ['credit', 'monthSpend', 'monthLimit', 'tokens7d']) {
      const v = parseConsoleNum(form[k]);
      if (Number.isNaN(v)) { setNotice({ k: 'err', t: `숫자로 읽지 못했습니다 — «${form[k]}». Console 화면 숫자를 그대로 적으십시오(예 198.15 · 22.6만).` }); return; }
      patch[k] = v;
    }
    setBusy(true);
    try {
      await fbSaveAiConsole(patch, by);
      setForm(null);
      setNotice({ k: 'ok', t: 'Console 숫자를 적었습니다.' });
      await load();
    } catch (e) {
      setNotice({ k: 'err', t: `적지 못했습니다 — ${(e && e.message) || e}` });
    }
    setBusy(false);
  };

  const noticeCls = (k) => (k === 'err' ? 'bg-red-950/40 border-red-800/60 text-red-200'
    : k === 'warn' ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200');
  const chipCls = (on) => `text-xxs px-3 rounded-pill font-bold border inline-flex items-center ${on ? 'bg-emerald-900/50 text-emerald-200 border-emerald-600/60' : 'bg-ink-800 text-dim-200 border-line-strong'}`;
  const webApps = today ? Object.entries(today.web.byApp) : [];

  return (
    <div className="space-y-2" data-aicost="1">
      <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1">
        <div>미르와 사진 읽기가 쓴 AI 비용을 앱 기록으로 셉니다. 클로드 금액은 공식 단가(100만 토큰당 소네트 5.5 입력 <b className="text-dim-100">$2</b> · 출력 <b className="text-dim-100">$10</b>, 오퍼스 5.5 입력 <b className="text-dim-100">$4</b> · 출력 <b className="text-dim-100">$20</b>, 웹 검색 1회 <b className="text-dim-100">$0.01</b>)로 셈한 값입니다.</div>
        <div>실제 청구는 Console 이 정본입니다. 제미나이는 토큰 기록이 없어 호출 수만 셉니다. 키 값은 보여 주지 않습니다.</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setPeriod(k)} className={chipCls(period === k)} style={{ minHeight: 36 }} aria-pressed={period === k}>{label}</button>
        ))}
        <button type="button" onClick={load} disabled={res === null}
          className="text-xxs px-3 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 border border-line-strong font-bold disabled:opacity-50" style={{ minHeight: 36 }}>
          {res === null ? '읽는 중…' : '🔄 새로 고침'}
        </button>
      </div>

      {err && <div className="rounded-btn border px-3 py-2 text-xs2 bg-red-950/40 border-red-800/60 text-red-200">AI 비용 기록을 읽지 못했습니다 — {err}</div>}

      {agg && !err && (
        <>
          <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1" data-aicost-sum="1">
            <div className="text-sm2 text-dim-100 font-bold">{periodName} 클로드 <span className="tabular-nums">{num(agg.total.n)}</span>회 · 약 <span className="tabular-nums">{usd(agg.total.usd, 2)}</span></div>
            <div>웹 검색 오늘 <b className="text-dim-100 tabular-nums">{usd(today ? today.web.booked : 0, 2)}</b> / 하루 한도 <b className="text-dim-100 tabular-nums">{usd(webLimit, 2)}</b>
              {webApps.length > 0 && <> · {webApps.map(([a, v]) => `${APP_NAME[a] || a} ${usd(v, 2)}`).join(' · ')}</>}
              {' '}· 사진 읽기(클로드) <b className="text-dim-100 tabular-nums">{num(agg.photoN)}</b>회</div>
            {(agg.capN > 0 || agg.webFailN > 0 || agg.webMaybeN > 0) && (
              <div className="text-dim-300">{[
                agg.capN > 0 ? `한도에 닿아 검색하지 않은 질문 ${num(agg.capN)}회` : '',
                agg.webFailN > 0 ? `검색 오류 ${num(agg.webFailN)}회(청구 없음)` : '',
                agg.webMaybeN > 0 ? `검색 시간 초과 ${num(agg.webMaybeN)}회(청구됐을 수 있음 — 장부에 예상치로 남김)` : '',
              ].filter(Boolean).join(' · ')}</div>
            )}
            <div className="text-dim-300">콘앱 웹 검색은 하루 합계가 <b className="text-dim-100 tabular-nums">{usd(coneLimit, 2)}</b> 에 닿으면 먼저 멈추고, 검수앱은 <b className="text-dim-100 tabular-nums">{usd(webLimit, 2)}</b> 까지 씁니다.</div>
          </div>

          <div className="rounded-btn border border-line bg-ink-900 text-xs2 text-dim-200 overflow-x-auto" data-aicost-table="1">
            <table className="w-full text-left tabular-nums" style={{ minWidth: 680, borderCollapse: 'collapse' }}>
              <thead><tr className="text-dim-400 text-xxs">
                <th className="px-3 py-1.5 font-bold">종류</th><th className="px-3 py-1.5 font-bold">모델</th><th className="px-3 py-1.5 font-bold text-right">호출</th>
                <th className="px-3 py-1.5 font-bold text-right">입력 토큰</th><th className="px-3 py-1.5 font-bold text-right">출력 토큰</th><th className="px-3 py-1.5 font-bold text-right">금액</th>
                <th className="px-3 py-1.5 font-bold text-right">1회 평균</th><th className="px-3 py-1.5 font-bold text-right">1회 최대</th>
              </tr></thead>
              <tbody>
                {agg.rows.map((r) => (
                  <tr key={r.key} className="border-t border-line" data-kind={r.kind}>
                    <td className="px-3 py-1.5 text-dim-100">{r.label}{r.searches ? ` (검색 ${num(r.searches)}회)` : ''}{r.kind === 'esealPhoto' ? ' · 한 장에 두 번 읽음' : ''}</td>
                    <td className="px-3 py-1.5">{aiModelShort(r.model)}</td>
                    <td className="px-3 py-1.5 text-right">{num(r.n)}</td>
                    <td className="px-3 py-1.5 text-right">{num(r.tokIn)}</td>
                    <td className="px-3 py-1.5 text-right">{num(r.tokOut)}</td>
                    <td className="px-3 py-1.5 text-right text-dim-100 font-bold">{usd(r.usd)}</td>
                    <td className="px-3 py-1.5 text-right">{usd(r.n ? r.usd / r.n : 0, 4)}</td>
                    <td className="px-3 py-1.5 text-right">{usd(r.max, 4)}</td>
                  </tr>
                ))}
                {agg.photoN === 0 && (
                  <tr className="border-t border-line text-dim-400"><td className="px-3 py-1.5" colSpan={8}>사진 읽기 {periodName} 없음 — 엠티실 리스트(오퍼스, 한 장에 두 번 읽음) · 베이 수기 기록(오퍼스) · 리퍼 리스트(소네트) · 리스트 사진 · PORT-MIS 캡처 · PDF 베이(소네트). 읽은 날에는 종류마다 한 줄씩 나옵니다.</td></tr>
                )}
                <tr className="border-t border-line-strong text-dim-100 font-bold">
                  <td className="px-3 py-1.5">합계</td><td className="px-3 py-1.5"></td><td className="px-3 py-1.5 text-right">{num(agg.total.n)}</td>
                  <td className="px-3 py-1.5 text-right">{num(agg.total.tokIn)}</td><td className="px-3 py-1.5 text-right">{num(agg.total.tokOut)}</td><td className="px-3 py-1.5 text-right">{usd(agg.total.usd)}</td>
                  <td className="px-3 py-1.5 text-right"></td><td className="px-3 py-1.5 text-right"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1">
            <div className="font-bold text-dim-100">누가 썼나</div>
            <div>{agg.who.length ? agg.who.map((w) => `${w.who === '클로드' ? '클로드(테스터)' : (w.who || '이름 없음(시험 · 로그인 전)')} ${num(w.n)}회 ${usd(w.usd, 2)}`).join(' · ') : '클로드 호출 없음'}</div>
            <div className="text-dim-300">제미나이(클로드가 안 될 때 · 선박 소개 · 검색패널 AI) {periodName} <b className="text-dim-100 tabular-nums">{num(agg.gemini.n)}</b>회
              {agg.gemini.n > 0 && <> — {Object.entries(agg.gemini.byKind).map(([k, n]) => `${aiKindLabel(k)} ${n}`).join(' · ')}</>} — 금액은 구글 청구서로 봅니다.</div>
          </div>
        </>
      )}

      {res !== null && !err && (
        <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1" data-aicost-console="1">
          <div className="font-bold text-dim-100">Console 숫자 (검수사가 적은 값)</div>
          {con ? (
            <>
              <div>크레딧 잔액 <b className="text-dim-100 tabular-nums">{con.credit != null ? usd(con.credit, 2) : '—'}</b> · 이번 달 지출 <b className="text-dim-100 tabular-nums">{con.monthSpend != null ? usd(con.monthSpend, 2) : '—'}</b> / 한도 <b className="text-dim-100 tabular-nums">{con.monthLimit != null ? usd(con.monthLimit, 0) : '—'}</b>
                {con.monthSpend != null && Number(con.monthLimit) > 0 && <> ({Math.round((Number(con.monthSpend) / Number(con.monthLimit)) * 100)}% 사용)</>}
                {con.tokens7d != null && <> · 최근 7일 토큰 <b className="text-dim-100 tabular-nums">{man(con.tokens7d)}</b></>}</div>
              <div className="text-dim-300">{hm(con.at)} {con.by || ''} 적음 · 한도는 매달 1일에 다시 셉니다.</div>
              {!conFresh && <div className={`rounded-btn border px-2 py-1 ${noticeCls('warn')}`}>지난달에 적은 숫자입니다 — 이번 달 Console 숫자를 새로 적어 주십시오.</div>}
              {gap && (
                <div className={gap.notable || gap.over ? `rounded-btn border px-2 py-1 ${noticeCls('warn')}` : 'text-dim-300'} data-aicost-gap={gap.notable ? 'notable' : gap.over ? 'over' : 'small'}>
                  같은 시각까지 앱 기록 {usd(appAtCon.total.usd, 2)} · Console {usd(con.monthSpend, 2)}
                  {gap.notable
                    ? ` — 앱 기록이 ${usd(gap.gap, 2)} 적습니다. 앱을 거치지 않고 키로 부른 사용(클로드 시험 등)입니다. 키별·모델별 내역은 Console 사용량 화면에서 봅니다.`
                    : gap.over
                      ? ` — 앱 기록이 ${usd(-gap.gap, 2)} 많습니다. Console 은 5분쯤 늦게 반영되니 조금 뒤 Console 숫자를 새로 적어 주십시오.`
                      : ' — 거의 같습니다.'}
                </div>
              )}
            </>
          ) : (
            <div className="text-dim-300">아직 적은 숫자가 없습니다. 크레딧 잔액과 한도는 어떤 API 로도 받을 수 없어, Console 첫 화면 숫자를 아래 단추로 적어 둡니다.</div>
          )}
          {!form ? (
            <button type="button" onClick={openForm}
              className="text-xxs px-3 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 border border-line-strong font-bold" style={{ minHeight: 36 }}>
              ✏️ Console 숫자 적기
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {[['credit', '크레딧 잔액($)'], ['monthSpend', '이번 달 지출($)'], ['monthLimit', '한도($)'], ['tokens7d', '최근 7일 토큰']].map(([k, label]) => (
                  <label key={k} className="flex flex-col gap-1 min-w-0">
                    <span className="text-dim-300">{label}</span>
                    <input id={`aicost-${k}`} inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="bg-ink-950 border border-line-strong rounded-btn px-2 text-dim-100 tabular-nums" style={{ minHeight: 36 }} placeholder={k === 'tokens7d' ? '예 22.6만' : '예 198.15'} />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveForm} disabled={busy}
                  className="text-xxs px-3 rounded-pill bg-emerald-900/50 text-emerald-200 border border-emerald-600/60 font-bold disabled:opacity-50" style={{ minHeight: 36 }}>
                  {busy ? '적는 중…' : '저장'}
                </button>
                <button type="button" onClick={() => setForm(null)} disabled={busy}
                  className="text-xxs px-3 rounded-pill bg-ink-800 text-dim-200 border border-line-strong font-bold disabled:opacity-50" style={{ minHeight: 36 }}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {res !== null && !err && (
        <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-300 space-y-1">
          <div className="font-bold text-dim-100">지금 설정 (읽기만)</div>
          <div>대화 모델 {chatModel} · 정밀 사진 {cfg.claudeOpusModel || 'claude-opus-5-5'} · 사진 경로 {cfg.visionProvider === 'gemini' ? '제미나이(클로드 끔)' : '클로드 먼저'} · 미르 하루 상한 {num(Number(cfg.dailyCap) > 0 ? cfg.dailyCap : 300)}줄 · 웹 검색 하루 한도 {usd(webLimit, 2)} (콘앱 {usd(coneLimit, 2)}) · 사진 읽기 상한 없음{cfg.enabled === false ? ' · ⚠ 미르 모델 꺼짐' : ''}</div>
        </div>
      )}

      {agg && agg.warns.map((w, i) => <div key={i} className={`rounded-btn border px-3 py-2 text-xs2 ${noticeCls('warn')}`}>⚠ {w}</div>)}
      {notice && <div className={`rounded-btn border px-3 py-2 text-xs2 ${noticeCls(notice.k)}`}>{notice.t}</div>}
    </div>
  );
}
