import { fmtPos, isoShown, ISO_CONFLICT_WHY, ISO_OT_CHECK_WHY } from '../utils';   // 4.21 · 4.25-01 ISO_CONFLICT_WHY · 4.27-01 ISO_OT_CHECK_WHY
// 자동 진단 경고 패널 (M3.5.4)
//   - 자료 업로드 후 자동 호출
//   - critical: 빨강 점멸 + 자동 음성
//   - warning: 주황 + 자동 음성
//   - info: 파랑 + 화면만 (음성 X)
//   - 음성 ON/OFF 토글, 닫기 버튼
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, Volume2, VolumeX, ChevronDown, ChevronUp, X } from 'lucide-react';
import { speak, stopSpeak } from '../voice.js';
import { buildVoiceMessage, summarizeAlerts, isoConflictText } from '../diagnostics.js';
import { REF_POD_LABEL, reconTermLabel, reconUnknownText } from '../sourceRecon.js';   // 4.22: 자료별 대조 글 한 벌(진단 한 줄과 같은 글)
import { bundleDocNote, bundleDocOffText } from '../tallyReport.js';   // 4.55: 빈 FR 묶음이 터미널 서류 기준이면 그 말(진단 한 줄 reconBundleText 와 같은 글)
import { CUSTOMS_RESULT_CODES, customsCodeHint, customsCodeLabel } from '../data/customsCodes.js';   // 4.22: 세관 검수 결과 코드표 한 벌(검수사 원문)

export default function DiagnosticsPanel({ alerts, autoSpeak, onToggleSpeak, onDismiss, onOpenContainer, showOk = false, listRows = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const lastAlertSig = useRef('');

  // 새 경고 등장 시 자동 음성 (한 번만)
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    if (!autoSpeak) return;
    // 시그니처: 알람 코드+카운트 합 (변경 시 다시 음성)
    const sig = alerts.map(a => `${a.code}:${a.count || 0}`).join('|');
    if (lastAlertSig.current === sig) return;
    lastAlertSig.current = sig;
    const msg = buildVoiceMessage(alerts);
    if (msg) {
      const t = setTimeout(() => speak(msg), 600);
      return () => clearTimeout(t);
    }
  }, [alerts, autoSpeak]);

  //  ★ 4.22 — 경고가 하나도 없으면(음성 «데이터 정상») 부른 쪽이 원할 때 한 줄만 — «이상없음 (세관 코드 OKY)»(검수사 09:37 «여러 조건이 발생될때 마다 해당하는 알림에 표기»)
  //    ⚠ 비교한 리스트·세관 행이 없으면(listRows 0 — diagnostics.diagListRowCount) OKY 가 아니라 «비교할 리스트 없음»(재감사 반영).
  if (!alerts || alerts.length === 0) {
    if (!(showOk && Array.isArray(alerts))) return null;
    return listRows > 0
      ? <div className="text-2xs text-emerald-300/80 px-1" data-diag-ok="oky" title={CUSTOMS_RESULT_CODES.OKY}>✓ 자료 점검 — {CUSTOMS_RESULT_CODES.OKY} (세관 코드 OKY)</div>
      : <div className="text-2xs text-dim-300 px-1" data-diag-ok="none">자료 점검 — 비교할 리스트 없음</div>;
  }

  const summary = summarizeAlerts(alerts);
  const hasCritical = summary.critical > 0;
  const hasWarning = summary.warning > 0;

  const borderClass = hasCritical
    ? 'border-red-500 bg-red-950/40'
    : hasWarning
    ? 'border-amber-500 bg-amber-950/30'
    : 'border-blue-500 bg-blue-950/30';
  const iconClass = hasCritical ? 'text-red-400 animate-pulse' : hasWarning ? 'text-amber-400' : 'text-blue-400';
  const reconShown = alerts.some((a) => a.code === 'source_recon');   // 4.22: 자료별 대조가 있으면 리스트 부족·EDI 밖 목록은 접어 둔다(같은 컨을 두 번 보이지 않게)

  return (
    <div className={`border-2 rounded-btn p-3 ${borderClass} ${hasCritical ? 'shadow-lg shadow-red-900/50' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className={`w-5 h-5 ${iconClass} flex-shrink-0`}/>
          <div className="flex flex-wrap gap-1.5">
            {summary.critical > 0 && (
              <span className="bg-red-700 text-white text-xxs font-black px-2 py-0.5 rounded-full animate-pulse">
                🔴 위험 {summary.critical}
              </span>
            )}
            {summary.warning > 0 && (
              <span className="bg-amber-600 text-white text-xxs font-black px-2 py-0.5 rounded-full">
                🟡 주의 {summary.warning}
              </span>
            )}
            {summary.info > 0 && (
              <span className="bg-blue-600 text-white text-xxs font-black px-2 py-0.5 rounded-full">
                🔵 정보 {summary.info}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => {
            if (autoSpeak) stopSpeak();
            else speak(buildVoiceMessage(alerts));
            onToggleSpeak();
          }}
            title={autoSpeak ? '자동 음성 끄기' : '자동 음성 켜기'}
            className={`p-1.5 rounded ${autoSpeak ? 'bg-emerald-700 text-white' : 'bg-ink-800 text-dim-300'}`}>
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5"/> : <VolumeX className="w-3.5 h-3.5"/>}
          </button>
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded bg-ink-800 text-dim-200">
            {expanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>
          {onDismiss && (
            <button onClick={onDismiss}
              title="경고 닫기"
              className="p-1.5 rounded bg-ink-800 text-dim-300 hover:bg-red-900/50 hover:text-red-400">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {alerts.map((a, i) => (
          <AlertRow key={i} alert={a} forceOpen={expanded} onOpenContainer={onOpenContainer} reconShown={reconShown}/>
        ))}
      </div>
    </div>
  );
}

function AlertRow({ alert, forceOpen, onOpenContainer, reconShown }) {
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;
  const colorClass = alert.level === 'critical'
    ? 'bg-red-900/30 border-red-700/40 text-red-200'
    : alert.level === 'warning'
    ? 'bg-amber-900/30 border-amber-700/40 text-amber-200'
    : 'bg-blue-900/30 border-blue-700/40 text-blue-200';
  const Icon = alert.level === 'critical' ? AlertTriangle : alert.level === 'warning' ? AlertCircle : Info;
  const hasDetails = alert.details && (Array.isArray(alert.details) ? alert.details.length > 0 : Object.keys(alert.details).length > 0);

  return (
    <div className={`border rounded-pill p-2 ${colorClass}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-2 text-left">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
        <div className="text-xs flex-1 leading-relaxed font-bold break-words break-keep">{alert.msg}</div>{/* 4.49-01: 알림 한 줄(«자료별 대조 — … 적용하면 315 …»)도 한글은 띄어쓰기 자리에서만 — 4.49 라이브 확인 320px «적⏎용하면» «수⏎정 전» */}
        {hasDetails && (
          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
        )}
      </button>
      {isOpen && hasDetails && (
        <AlertDetails alert={alert} onOpenContainer={onOpenContainer} reconShown={reconShown}/>
      )}
    </div>
  );
}

//  ★ 4.22 잘라 보이기 한 벌 — limit 줄까지 보이고 넘치면 «… 외 M건 — 나머지 보기» 로 전부 펼치고 «접기» 로 되돌린다.
//    검수사 2026-10-10 08:08 «어느정도 갯수가 넘으면 몇개외 몇건이라고 표기만 하고 나머지는 보여주지 않습니다. 나머지도 보고자 하면 볼수 있어야 합니다».
//    펼침 상태는 목록마다 따로(이 컴포넌트 안). 이 패널의 잘린 목록은 전부 이것을 쓴다(감사 반영 — 풀/엠티·규격·실번호·IMDG·클래스 8·X-RAY 목록까지).
function TruncList({ items, limit = 10, unit = '건', render }) {
  const [all, setAll] = useState(false);
  const list = Array.isArray(items) ? items : [];
  const more = list.length - limit;
  return (
    <>
      {(all ? list : list.slice(0, limit)).map((x, i) => <React.Fragment key={i}>{render(x, i)}</React.Fragment>)}
      {more > 0 && (
        <button type="button" data-trunc-toggle={all ? 'fold' : 'more'}
          onClick={(e) => { e.stopPropagation(); setAll((v) => !v); }}
          className="block text-left text-dim-300 underline decoration-dotted px-1.5 py-0.5">
          {all ? '접기' : `… 외 ${more}${unit} — 나머지 보기`}
        </button>
      )}
    </>
  );
}

//  4.22 — 자료별 대조가 같은 컨을 보이면 리스트 부족·EDI 밖 목록은 접어 둔다(펼치면 종전 목록 그대로).
//    ⚠ EDI 밖 목록에 «⚠ 목적지 확인»(눌러서 POD 확정) 컨이 있으면 접지 않는다 — 고칠 수 있는 줄을 숨기지 않는다(감사 반영).
function ReconFold({ on, children }) {
  const [open, setOpen] = useState(false);
  if (!on) return children;
  return (
    <div className="mt-1">
      <button type="button" data-recon-fold={open ? 'open' : 'closed'}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="text-left text-dim-300 underline decoration-dotted">
        {open ? '접기' : '자료별 대조 참고 — 이 목록 펼치기'}
      </button>
      {open && children}
    </div>
  );
}

//  4.22 — 자료별 대조 한 줄: «• BMOU9237016 (45RE) E · KMD · KRINC→KRPTK · 26-10-82 · EDI ✓ 세관 ✗ · 파일»
function ReconLine({ x, onOpenContainer }) {
  const pos = fmtPos(x);
  const route = (x.pol || x.pod) ? `${x.pol || '?'}→${x.pod || '?'}` : '';
  const parts = [x.fe, x.op, route, pos, x.pattern, x.pick ? (x.keep || x.keepConf ? x.pick : `POD 확정 ${x.pick}`) : '', x.src].filter(Boolean);   // 4.48-01 재감사(하-3): 본선 잔류 줄은 «POD 확정» 앞말 없이(묶음 이름이 «선사 메일 수정 — 본선 잔류»)
  return (
    <button type="button" data-recon-cn={x.cn}
      onClick={(e) => { e.stopPropagation(); onOpenContainer?.(x.cn); }}
      className="mono block w-full text-left px-1.5 py-0.5 rounded hover:bg-ink-750/50 active:bg-ink-700">
      • <span className="font-bold">{x.cn}</span>{x.iso ? ` (${isoShown(x.iso)})` : ''} <span className="text-dim-300 break-words break-keep">{parts.join(' · ')}</span>{/* 4.48-04: + break-keep(한글 낱말 «선사»·«10-24» 가 폰 폭에서 중간에 끊겼다 — 띄어쓰기 자리에서만) · 4.48-03: break-all → break-words(319px 에서 «PHDVO» 같은 낱말이 중간에서 갈렸다 — 긴 파일 이름만 갈린다) · 4.48-02: 긴 파일 이름이 폰 화면을 가로로 밀지 않게(라이브 확인 — 319px 화면이 541px 로 늘어남) */}
    </button>
  );
}

function AlertDetails({ alert, onOpenContainer, reconShown }) {
  const d = alert.details;

  //  ★ 4.22 자료별 대조 — 머리줄(출처마다 대수 또는 «자료 없음» · 터미널 수량 둘) · 터미널 줄 · 번호 대기 줄 · 묶음마다 «라벨 N대 (세관 코드 후보)» + 컨 줄(10줄 넘으면 나머지 보기)
  //    · 맨 끝에 «POD 확정 — 평택 아님(참고)» — 사람이 확정한 POD 라 어긋남 수에 넣지 않는다.
  if (alert.code === 'source_recon') {
    const S = d.sources || {};
    const chip = (label, x) => (x && x.has ? `${label} ${x.n}` : `${label} 자료 없음`);
    const chipN = (label, x, note) => (x && x.has ? `${label} ${x.n}(${note})` : `${label} 자료 없음`);
    const heads = [chipN('터미널 배정', S.plan, '배정표·도선'), chipN('본선현황', S.qc, '호기 합계 완료+잔여'), chip('EDI', S.edi), chip('세관', S.customs),
      d.carrierPartial ? `선사 리스트 일부 ${S.carrier.n}/${S.customs.n}` : chip('선사 리스트', S.carrier), `완료 ${(S.done && S.done.n) || 0}`, `실적 ${(S.term && S.term.n) || 0}`];
    //  ★ 4.54 — 앱 − 터미널 차이에서 «빈 FR 묶음»(터미널은 한 묶음을 1대로 센다)이 설명하는 만큼은 «터미널 276(+6)» 으로 적고 호박색을 끈다(검수사 2026-10-26 19:17).
    const gap = d.gapRest != null ? d.gapRest : d.gap;
    const _bx = d.bundleExplained > 0 ? d.bundleExplained : 0;
    const tl = reconTermLabel(d.term && d.term.basis), tn = (d.term && d.term.n) || 0;
    const tnTxt = `${tn}대${_bx ? `(+${_bx})` : ''}`;
    const unk = reconUnknownText(d);
    //  4.48-01 감사(하-3) — 선사 메일 수정(본선 잔류)은 «POD 확정 — 평택 아님»과 따로 묶고, 터미널 차이가 그 대수면 «터미널은 아직 선사 메일 수정 전»(한 줄과 같은 말).
    const _kRefN = (d.ref || []).filter((x) => x && x.keep).length;
    //  4.48-03 — 앱 수(d.app)는 자료대로(지시 컨 포함 — 예정). 앱 예상 = 앱 − 앱 안의 지시·참고 컨. 터미널이 자료 그대로면 «아직 수정 전», 앱 예상과 같으면 «반영 — 수정본 대기».
    const _kApp = d.app - (d.ref || []).filter((x) => x && x.inApp).length;
    const _kcN = (d.refConf || []).length;   // 4.53 — 선적 EDI 가 확정한 본선 잔류(평택 양하분에서 이미 빠짐)
    const _kcPre = !!(_kcN && tn && tn === d.app + _kcN);
    const _kPre = !!(_kRefN && tn && tn === d.app + _kcN && _kApp !== d.app), _kDone = !!(_kRefN && tn && tn === _kApp && _kApp !== d.app);
    //  세관 코드 — 검수사 09:37 «KKLC같은건 MFN대상으로 알림» → «MFN 대상 — 뜻» · MGN 은 완료·실적 없는 컨만(일부면 대수)
    const hint = (g) => (g.code === 'MFN' ? customsCodeLabel('MFN', { kind: '대상' })
      : g.code === 'MGN' ? customsCodeLabel('MGN', { kind: '대상', n: g.codeN && g.codeN !== g.items.length ? g.codeN : null, note: '완료·실적 없음' })
      : g.code ? customsCodeHint(g.code) : '');
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-1 break-words break-keep" data-recon>{/* 4.49: 자료별 대조 칸 전체 — 한글은 띄어쓰기 자리에서만 줄바꿈(4.48-04 는 컨 줄만 고쳐 머리줄·터미널 줄·묶음 머리가 320px 에서 «수⏎정» «평택에⏎서» 로 끊겼다 · 라이브 확인) · 긴 파일 이름만 갈린다 */}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-dim-200 font-bold" data-recon-head>
          {heads.map((h, i) => <span key={i}>{i ? '· ' : ''}{h}</span>)}
        </div>
        {gap != null && (
          <div className={gap === 0 ? 'text-dim-300' : 'text-amber-300'} data-recon-term>
            {gap === 0
              ? `${tl} ${tnTxt} = 앱 ${d.app}대` + (_bx ? ` — 빈 FR 묶음 ${d.bundles.length}곳(아래)을 터미널은 1대로 셈` : '') + (_kPre ? ` — 터미널은 아직 선사 메일 수정 전(본선 잔류 예정 ${_kRefN}대 · 앱 예상 ${_kApp}대)` : '')
              : `${tl} ${tnTxt} · 앱 ${d.app}대 (${gap > 0 ? '+' : ''}${gap})`
                + (_kcPre ? ` — 터미널은 아직 본선 잔류 확정 ${_kcN}대를 반영하지 않음(앱 ${d.app}대 + ${_kcN}대 = ${tn}대)` : _kDone ? ` — 터미널은 선사 메일 반영(본선 잔류 예정 ${_kRefN}대) · EDI·리스트 수정본 대기` : d.explained ? ` — 아래 목록 중 ${d.explained}대가 후보` : '')
                + (unk ? ` — ${unk}` : '')}
          </div>
        )}
        {d.doc && (d.doc.off || d.doc.why) && (
          <div className="text-amber-300" data-recon-doc>
            {[d.doc.why ? `묶음 서류를 쓰지 못함 — ${d.doc.why}` : '', d.doc.off ? `${bundleDocOffText(d.doc, d.app, tn)} — 서류가 낡았거나 터미널이 묶음을 낱개로 센 것일 수 있음${d.doc.file ? ` (${d.doc.file})` : ''}` : ''].filter(Boolean).join(' · ')}
          </div>
        )}
        {_bx > 0 && (
          <div data-recon-group="bundle">
            <div className="text-dim-300 font-bold">빈 FR 묶음 — 터미널은 한 묶음을 1대로 셈(앱 컨 대수는 낱개 그대로 · 참고) {d.bundles.length}곳 · {d.bundles.reduce((a, b) => a + b.n, 0)}대{bundleDocNote(d.bundles) ? ` · ${bundleDocNote(d.bundles)}` : ''}</div>
            <TruncList items={d.bundles} limit={10} unit="곳" render={(b) => (
              <div className="mono flex flex-wrap items-center gap-x-2" data-recon-bundle={b.pos}>
                <span className="text-dim-200 font-bold">{b.pos.replace(/-/g, '/')}</span>
                <span className="text-dim-300">{b.sz === '20' ? "20'" : b.sz === '45' ? "45'" : b.sz === 'HC' ? 'HC' : "40'"} FR {b.n}대 → 터미널 1대</span>
                {b.cns.map((cn) => (
                  <button key={cn} type="button" onClick={(e) => { e.stopPropagation(); onOpenContainer?.(cn); }} className="font-bold underline decoration-dotted">{cn}</button>
                ))}
              </div>
            )}/>
          </div>
        )}
        {S.pending && S.pending.n > 0 && (
          <div className="text-amber-300" data-recon-pending title={CUSTOMS_RESULT_CODES.CNN}>
            번호 대기 {S.pending.n}자리 — EDI 평택 자리인데 컨번호가 없음 {customsCodeHint('CNN')}
          </div>
        )}
        {(d.groups || []).map((g) => (
          <div key={g.key} data-recon-group={g.key}>
            <div className="text-amber-300 font-bold" title={g.code ? CUSTOMS_RESULT_CODES[g.code] : undefined}>{g.label} {g.items.length}대{hint(g) ? ` · ${hint(g)}` : ''}</div>
            <TruncList items={g.items} limit={10} unit="건" render={(x) => <ReconLine x={x} onOpenContainer={onOpenContainer}/>}/>
          </div>
        ))}
        {_kRefN > 0 && (
          <div data-recon-group="keep">
            <div className="text-dim-300 font-bold">선사 메일 수정 — 본선 잔류 예정(평택에서 안 내림 · 확정 아님 · 참고) {_kRefN}대</div>
            <TruncList items={d.ref.filter((x) => x && x.keep)} limit={10} unit="건" render={(x) => <ReconLine x={x} onOpenContainer={onOpenContainer}/>}/>
          </div>
        )}
        {_kcN > 0 && (
          <div data-recon-group="keepconf">
            <div className="text-dim-300 font-bold">선사 지시 — 본선 잔류 확정(선적 EDI 에 실림 · 평택에서 안 내림 · 참고) {_kcN}대</div>
            <TruncList items={d.refConf} limit={10} unit="건" render={(x) => <ReconLine x={x} onOpenContainer={onOpenContainer}/>}/>
          </div>
        )}
        {(d.ref || []).length - _kRefN > 0 && (
          <div data-recon-group="ref">
            <div className="text-dim-300 font-bold">{REF_POD_LABEL} {d.ref.length - _kRefN}대</div>
            <TruncList items={d.ref.filter((x) => !(x && x.keep))} limit={10} unit="건" render={(x) => <ReconLine x={x} onOpenContainer={onOpenContainer}/>}/>
          </div>
        )}
      </div>
    );
  }

  if (alert.code === 'empty_seal_pending') {
    const isAttach = (Array.isArray(d) ? d[0]?.sealMode : null) === 'attach';
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        <div className={`mb-1 ${isAttach ? 'text-red-300' : 'text-cyan-300'}`}>
          📌 클릭하면 컨테이너 모달에서 실 {isAttach ? '부착' : '확인'} 입력 가능
        </div>
        <TruncList items={Array.isArray(d) ? d : []} limit={30} unit="대" render={(c) => (   // 4.22: «외 N대» 를 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(c.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700 flex items-center justify-between gap-2"
          >
            <span className="font-bold">{c.cn}</span>
            <span className="text-dim-300 text-3xs">{isoShown(c.iso)} · POD {c.pod} · @{fmtPos(c) || '?-?-?'}</span>
            <span className={`text-3xs ${isAttach ? 'text-red-400' : 'text-cyan-400'}`}>🔒 입력</span>
          </button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'unknown_iso') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        <div className="text-amber-300 mb-1">📌 클릭하면 컨테이너 모달에서 규격 수정 가능</div>
        <TruncList items={Array.isArray(d) ? d : []} limit={30} unit="대" render={(c) => (   // 4.22: «외 N대» 를 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(c.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700 flex items-center justify-between gap-2"
          >
            <span className="font-bold">{c.cn}</span>
            <span className="text-dim-300">ISO: {isoShown(c.iso)} @ {fmtPos(c) || '?-?-?'}</span>
            <span className="text-amber-400 text-3xs">✏️ 수정</span>
          </button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'reefer_no_temp' || alert.code === 'dg_no_class' || alert.code === 'dg_no_un') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="대" render={(c) => (   // 4.22: «외 N대» 를 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(c.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700 flex items-center justify-between gap-2"
          >
            <span className="font-bold">{c.cn}</span>
            <span className="text-dim-300">@ {fmtPos(c) || '?-?-?'}</span>
            <span className="text-amber-400 text-3xs">✏️ 수정</span>
          </button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'list_short' || alert.code === 'list_extra' || alert.code === 'cancel_pending') {   // 3.50-02: 취소 요청분 목록도 여기서
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs">
        EDI {d.ediCount || '?'}대 / 리스트 {d.listCount || '?'}대 (매칭 {d.matchedCount ?? '?'}대)
        {d.missing && d.missing.length > 0 && (
          <ReconFold on={reconShown}>
          <div className="mt-1">
            <div className="text-amber-400 mb-0.5">리스트에 없는 컨번호 (부족):</div>
            <TruncList items={d.missing} limit={10} unit="건" render={(m) => (   // 4.22: «외 N건» 을 펼칠 수 있게
              <div className="mono">• {m.cn} {m.iso ? `(${isoShown(m.iso)})` : ''} {m.fe || ''}</div>
            )}/>
          </div>
          </ReconFold>
        )}
        {d.cancelCns && d.cancelCns.length > 0 && (
          <div className="mt-1">
            <div className="text-dim-300 mb-0.5">선사 취소 요청분(리스트에 남음):</div>
            <TruncList items={d.cancelCns} limit={10} unit="건" render={(cn) => <div className="mono">• {cn}</div>}/>
          </div>
        )}
        {d.extraCns && d.extraCns.length > 0 && (
          <ReconFold on={reconShown && !(d.podAskCns || []).length}>
          <div className="mt-1">
            {/*  3.53: 눌러서 바로 컨 상세로 간다 — 검수사가 **여기서** 그 컨을 보고 POD 를 확정한다
                 (검수사 2026-09-16 «이건을 앱에서 수정할수 있게»). 두 번 찾아 들어가지 않게 한다. */}
            {/*  3.53: **고를 수 있는 것만** «눌러서 POD 확정» 으로 안내한다 — 나머지는 EDI 에 아예 없어
                 눌러도 고를 것이 없다(재감사 지적). 갈리는 컨은 목록 맨 앞으로 올려 둔다. */}
            <div className="text-dim-300 mb-0.5">EDI에 없는 컨번호{(d.podAskCns || []).length ? ` (⚠ 목적지 확인 ${(d.podAskCns || []).length}대 — 눌러서 POD 확정)` : ''}:</div>
            <TruncList items={d.extraCns} limit={10} unit="건" render={(cn) => {   // 4.22: «외 N건» 을 펼칠 수 있게
              const ask = (d.podAskCns || []).includes(cn);
              return onOpenContainer
                ? <button onClick={(e) => { e.stopPropagation(); onOpenContainer(cn); }} data-extra-cn={cn} data-pod-ask={ask ? '1' : undefined}
                    className={`mono block text-left underline decoration-dotted ${ask ? 'text-amber-200 font-bold' : 'text-amber-300/70'}`}>• {cn}{ask ? ' ⚠' : ''}</button>
                : <div className="mono">• {cn}</div>;
            }}/>
          </div>
          </ReconFold>
        )}
      </div>
    );
  }

  // TallyOne 1.23: 무게 대조 경고(weight_diff)는 없앴다 — 무게가 벌어지는 이유가 여럿이라
  //   원인을 가릴 수 없고, 실 자료 17항차에서 한 번도 맞은 적이 없었다(검수사 확정 2026-08-07).
  //   대신 **풀/엠티**와 **규격**만 대조한다. `weight_diff` 분기는 옛 자료 호환으로 남긴다.
  if (alert.code === 'fe_conflict' || alert.code === 'iso_conflict' || alert.code === 'iso_ot_check' || alert.code === 'weight_diff') {   // 4.27-01: iso_ot_check(오픈탑 높이 점검요망)
    const why = alert.code === 'fe_conflict'
      ? 'EDI 와 리스트의 풀/엠티 표기가 서로 다릅니다. 실물을 확인하세요.'
      : alert.code === 'iso_ot_check'
        ? ISO_OT_CHECK_WHY   // 4.27-01: utils 한 벌 — 오픈탑 높이 갈림 «점검요망»(검수사 2026-10-15 14:31)
      : alert.code === 'iso_conflict'
        ? ISO_CONFLICT_WHY   // 4.25-01: utils 한 벌 — «확인 전에는 터미널(EDI) 규격을 따릅니다»(검수사 2026-10-14)
        : '';
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        {why && <div className="px-1.5 pb-1.5 text-2xs leading-relaxed text-dim-200/90">{why}</div>}
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="건" render={(w) => (   // 4.22 감사: «외 N건» 을 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(w.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700 flex items-center justify-between gap-2"
          >
            <span className="font-bold">{w.cn}</span>
            <span className="text-dim-300">
              {w.ediFe && w.lrFe ? `EDI ${w.ediFe} / 리스트 ${w.lrFe}` : ''}
              {(alert.code === 'iso_conflict' || alert.code === 'iso_ot_check') ? isoConflictText(w) : ''}
              {w.ediW != null && w.lrW != null ? `EDI ${(w.ediW/1000).toFixed(1)}t / 리스트 ${(w.lrW/1000).toFixed(1)}t` : ''}
              {w.bay ? ` · ${w.bay}-${w.row}-${w.tier}` : ''}
            </span>
            <span className="text-amber-400 text-3xs">✏️</span>
          </button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'seal_diff') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        <div className="text-dim-300 px-1.5" data-customs-code="SLN" title={CUSTOMS_RESULT_CODES.SLN}>EDI·리스트 실번호가 다름 · {customsCodeLabel('SLN')}</div>
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="건" render={(s) => (   // 4.22 감사: «외 N건» 을 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(s.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700"
          >
            <div className="font-bold flex items-center justify-between">
              <span>{s.cn}</span>
              <span className="text-amber-400 text-3xs">✏️</span>
            </div>
            <div className="text-dim-300 ml-2">EDI: {s.ediSl} | 리스트: {s.lrSl}</div>
          </button>
        )}/>
      </div>
    );
  }

  //  4.36 — 예상 실오류(씰 모양) — «컨번호 · 리스트 씰 · 이유». 누르면 컨 상세.
  //  4.45-02 — «씰 모양 다름»(참고)도 같은 목록 꼴(검수사 2026-10-24 «씰모양이 다른거랑 … 실오류 와는 다른 관점»).
  if (alert.code === 'seal_format' || alert.code === 'seal_kind') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5" data-seal-format>
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="건" render={(t) => (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(t.cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700" data-seal-format-line
          >• {t.cn} · 씰 {t.seal} · {t.why}</button>
        )}/>
      </div>
    );
  }

  //  4.22 — 리스트 번호 오타 짝(세관 코드 CND 후보) — «오타 번호 → 바른 번호 · 실번호». 누르면 오타 쪽 컨 상세.
  if (alert.code === 'cn_typo') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5" data-cn-typo>
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="건" render={(t) => (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(t.typo); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700" data-cn-typo-line
          >• {t.typo} → {t.real} · 실번호 {t.seal}</button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'imdg_violation') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-1">
        <TruncList items={Array.isArray(d) ? d : []} limit={10} unit="곳" render={(v) => (   // 4.22 감사: «외 N곳» 을 펼칠 수 있게
          <div>
            <div className="font-bold">위치 {v.location} · 클래스 {v.classes}</div>
            {v.containers.map((cn, j) => (
              <button key={j}
                onClick={(e) => { e.stopPropagation(); onOpenContainer?.(cn); }}
                className="mono ml-2 hover:text-amber-300"
              >• {cn} ✏️</button>
            ))}
          </div>
        )}/>
      </div>
    );
  }

  /* 3.4 — 고려해운 클래스 8 홀드 선적. 검수사가 그 자리에서 컨을 열 수 있게 자리·UN·목적지를 같이 보인다. */
  if (alert.code === 'dg8_hold') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-1">
        <div className="text-rose-300 font-bold">고려해운 규정 — 클래스 8은 갑판 적재입니다(홀드 금지).</div>
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="대" render={(v) => (   // 4.22 감사: «외 N대» 를 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(v.cn); }}
            className="w-full flex items-center justify-between gap-2 hover:text-amber-300"
          >
            <span className="mono font-bold">{v.cn} ✏️</span>
            <span className="mono text-rose-300 font-bold">{v.bay ? `${parseInt(v.bay, 10)}-${v.row}-${v.tier}` : '자리 없음'}</span>
            <span className="text-dim-300">Class {v.dgc || '8'}{v.un ? ` UN${v.un}` : ''}{v.pod ? ` · ${v.pod}` : ''}</span>
          </button>
        )}/>
      </div>
    );
  }

  if (alert.code === 'xray_no_location') {
    return (
      <div className="mt-2 pt-2 border-t border-line text-2xs space-y-0.5">
        <TruncList items={Array.isArray(d) ? d : []} limit={20} unit="대" render={(cn) => (   // 4.22 감사: «외 N대» 를 펼칠 수 있게
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContainer?.(cn); }}
            className="mono w-full text-left px-1.5 py-1 rounded hover:bg-ink-750/50 active:bg-ink-700 flex items-center justify-between"
          >
            <span>• {cn}</span>
            <span className="text-amber-400 text-3xs">✏️</span>
          </button>
        )}/>
      </div>
    );
  }

  return null;
}
