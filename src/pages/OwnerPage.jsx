// 관리앱 화면(#/owner) — 소유자 전용. 수석 화면·검수 화면과 분리된 «👑 소유자 메뉴»(교대 시각 · 활동 로그 · AI 비용 · 인원 관리 · 위험 구역)
import React, { useMemo, useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { fbSubscribeAllReports, fbClearAllReportsAllVoyages, fbClearAllActiveWork, fbGetActivityDays, fbCleanupActivityLog } from '../firebase.js';
import { isOwnerName } from '../adminGuard.js';
import { completedByLabel } from '../utils.js';
import ConfirmModal, { useConfirm } from '../components/ConfirmModal.jsx';
import ShiftSnapPanel from '../components/ShiftSnapPanel.jsx';   // 교대 시각(06:30·17:30) 터미널 기준
import AiCostPanel from '../components/AiCostPanel.jsx';   // AI 비용 — 미르·사진 읽기 클로드 비용과 Console 숫자
import { Fold, InlineNotice } from './ChiefDashboard.jsx';

const DANGER_MSG = '전 항차의 작업 보고와 사진을 지우는 테스트 정리용 단추입니다.\n현장 보고가 통째로 사라지고 되돌릴 수 없습니다.\n\n그래도 진행할까요? 다음 창에서 한 번 더 묻습니다.';

export default function OwnerPage({ inspector, voyages, onGoHome, onOpenStaffManager = null }) {
  const owner = isOwnerName(inspector);   // 소유자가 아니면 아무것도 읽지 않고 안내만 그린다
  const [openSecs, setOpenSecs] = useState({});
  const toggleSec = (id) => setOpenSecs(o => ({ ...o, [id]: !o[id] }));
  const [hasReports, setHasReports] = useState(false);   // 위험 구역 — 지울 작업 보고가 있는지만 본다
  const [repNotice, setRepNotice] = useState(null);
  const [confirmState, askConfirm] = useConfirm();
  const [dangerState, askDanger] = useConfirm();
  useEffect(() => {
    if (!owner) return undefined;
    const u = fbSubscribeAllReports((list) => setHasReports((list || []).length > 0), 30);
    return () => u();
  }, [owner]);

  if (!owner) {
    return (
      <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-400" data-owner-denied="1">
        <div className="text-5xl mb-4">🔒</div>
        <div className="text-lg font-bold text-dim-100 mb-1">소유자 전용</div>
        <div className="text-sm mb-5">관리앱은 소유자만 열 수 있습니다.</div>
        <button onClick={onGoHome} className="px-4 py-2 bg-ink-800 hover:bg-ink-750 rounded text-dim-100 font-bold">홈으로</button>
      </div>
    );
  }

  //  모든 작업 보고 삭제 — 확인창 문구·처리기는 수석 화면에 있던 그대로(자리만 관리앱으로)
  const askClearAllReports = () => askConfirm({
    title: '⚠️ 모든 작업 보고 삭제',
    message: '모든 항차의 작업 보고와 사진을 삭제합니다.\n테스트 데이터 정리용입니다.\n\n되돌릴 수 없습니다. 계속하시겠습니까?',
    confirmLabel: '모두 삭제',
    cancelLabel: '취소',
    danger: true,
    onConfirm: async () => {
      try {
        await fbClearAllReportsAllVoyages();
        await fbClearAllActiveWork();
        setRepNotice({ kind: 'ok', text: '✅ 모든 작업 보고가 삭제되었습니다' });
      } catch (e) { setRepNotice({ kind: 'err', text: '삭제 실패: ' + e.message }); }
    },
  });
  const askClearAllDanger = () => askDanger({
    title: '⚠️ 위험 구역 — 모든 작업 보고 삭제',
    message: DANGER_MSG,
    confirmLabel: '다음',
    cancelLabel: '취소',
    danger: true,
    onConfirm: () => askClearAllReports(),
  });

  return (
    <div className="px-2 pt-2 pb-6 space-y-2 max-w-3xl mx-auto" data-owner-root="1">
      <div className="flex items-center gap-2 px-1">
        <div className="text-base font-black text-dim-100">👑 관리앱</div>
        <span className="text-2xs text-fuchsia-300/70">소유자 전용 — 수석·검수 화면과 분리</span>
        <button onClick={onGoHome} className="ml-auto px-3 rounded-btn border bg-ink-900 border-line hover:border-line-strong text-sm2 font-bold text-dim-100" style={{ minHeight: 44 }}>홈으로</button>
      </div>
      <div className="space-y-2" data-owner-menu="1">
        <Fold id="shiftsnap" title="🕰 교대 시각 터미널 기준 (06:30 · 17:30)" open={!!openSecs.shiftsnap} onToggle={() => toggleSec('shiftsnap')}>
          <ShiftSnapPanel voyages={voyages} by={inspector} />
        </Fold>
        <Fold id="actlog" title="🕵️ 활동 로그" open={!!openSecs.actlog} onToggle={() => toggleSec('actlog')}>
          <ActivityLogSection voyages={voyages} />
        </Fold>
        <Fold id="aicost" title="💳 AI 비용 (클로드 · 제미나이)" open={!!openSecs.aicost} onToggle={() => toggleSec('aicost')}>
          <AiCostPanel by={inspector} />
        </Fold>
        {onOpenStaffManager && (
          <button onClick={onOpenStaffManager}
            className="w-full flex items-center justify-between px-3 rounded-btn border bg-ink-900 border-line hover:border-line-strong text-left"
            style={{ minHeight: 44 }}>
            <span className="text-sm2 font-bold text-dim-100">👥 인원 관리</span>
            <span className="text-dim-400 text-xs shrink-0 ml-2">창 열기 ▶</span>
          </button>
        )}
        <div className="rounded-btn border-2 border-red-700/70 bg-red-950/20 p-2 space-y-2" data-danger-zone="1">
          <div className="text-sm2 font-black text-red-200">⚠ 위험 구역 — 되돌릴 수 없습니다 · 누르면 한 번 더 묻습니다</div>
          {hasReports ? (
            <button type="button" onClick={askClearAllDanger} data-danger="clear-reports"
              className="w-full flex items-center justify-between gap-2 px-3 rounded-btn border-2 border-red-700/70 bg-red-950/30 hover:bg-red-900/40 text-left"
              style={{ minHeight: 44 }}>
              <span className="text-sm2 font-bold text-red-200 flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> 모든 작업 보고 삭제 (테스트용) — 위험</span>
              <span className="text-xs text-red-300 shrink-0">전 항차 보고·사진</span>
            </button>
          ) : (
            <div className="text-xs text-dim-400 px-1" data-danger="clear-reports-none">🗑 모든 작업 보고 삭제 (테스트용) — 지울 작업 보고가 없습니다</div>
          )}
          <InlineNotice notice={repNotice} onClose={() => setRepNotice(null)} />
        </div>
      </div>
      <ConfirmModal {...confirmState} />
      <ConfirmModal {...dangerState} />
    </div>
  );
}

// ── TallyOne 1.3: 활동 로그 뷰어 — 소유자 전용 ─────────────────────────────
//   "검수원들이 로그인만 하고 뭘 보는지"를 시간순으로 보여준다(사용자 확정 2026-08-03).
//   완료 건수는 archive까지 합산하면 무거워 현재 voyages의 completed만 센다(캡션에 명시).

// 타임라인 한 줄 문구 — 순수 함수(노드 시뮬 검증 겸 단일 소스)
const _ACT_ROUTE_KO = { home: '홈', chief: '수석 대시보드', owner: '관리앱', search: '통합 검색', health: '항차 건강', food: '맛집', aux: '보조기능' };
const _ACT_TAB_KO = { list: '검수', search: '작업 시작', bay: '베이', lolo: 'LOLO', stats: '통계', report: '결과', data: '자료' };   // 2.03-01: 자연어 → 실제 탭 이름
export function formatActivityLine(r, voyages) {
  if (!r) return '?';
  if (r.type === 'login') return '로그인';
  if (r.type === 'logout') return r.via === 'idle' ? '자동 로그아웃' : '로그아웃';
  if (r.type === 'view') {
    if (r.route === 'voyage') {
      const info = voyages?.[r.voyageKey]?.info;
      const vsl = info?.vsl || String(r.voyageKey || '').split('_')[0] || '';
      const voy = (r.mode === 'loading' ? info?.voy_l : info?.voy_d) || info?.voy || '';
      const modeKo = r.mode === 'loading' ? '선적' : r.mode === 'discharge' ? '양하' : '';
      const head = [vsl, voy, modeKo].filter(Boolean).join(' ');
      const tabKo = _ACT_TAB_KO[r.tab] ? `${_ACT_TAB_KO[r.tab]}탭 ` : '';
      return `${head || '항차'} · ${tabKo}열람`;
    }
    return `${_ACT_ROUTE_KO[r.route] || r.route || '?'} 열람`;
  }
  if (r.type === 'lookup') return `조회 '${r.q || ''}'`;
  if (r.type === 'nls') return `질문 '${r.q || ''}'`;
  return r.type || '?';
}

const _actHHMM = (at) => {
  const d = new Date(at || 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const _actMD = (at) => {
  const d = new Date(at || 0);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
// 타입별 색 — 열람은 무채색, 조회·질문은 눈에 띄게(뭘 찾으러 왔는지가 핵심 데이터)
const _ACT_COLOR = { login: 'text-emerald-300', logout: 'text-amber-300/80', view: 'text-dim-200', lookup: 'text-cyan-300', nls: 'text-purple-300' };

function ActivityLogSection({ voyages }) {
  const [period, setPeriod] = useState('today');   // today | yesterday | 7d
  const [who, setWho] = useState('');              // '' = 전체
  const [rows, setRows] = useState(null);          // null = 로딩 전·중
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(300);

  // 섹션을 펼칠 때(마운트) 1회 — 30일 지난 버킷 정리. 실패 무해(fb 함수가 warn 1줄).
  useEffect(() => { fbCleanupActivityLog(30); }, []);

  // 기간 변경 시 조회 — 오늘 1일 / 어제 2일 / 7일 버킷 병합
  useEffect(() => {
    let alive = true;
    setRows(null); setError(''); setLimit(300);
    const days = period === 'today' ? 1 : period === 'yesterday' ? 2 : 7;
    fbGetActivityDays(days)
      .then(list => { if (alive) setRows(list); })
      .catch(e => { if (alive) { setRows([]); setError(String((e && e.message) || e)); } });
    return () => { alive = false; };
  }, [period]);

  // 기간 경계(로컬 자정 기준) — 버킷은 일 단위지만 '어제'는 어제 하루만 잘라 보여준다
  const range = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const t0 = d0.getTime();
    if (period === 'today') return { from: t0, to: Infinity };
    if (period === 'yesterday') return { from: t0 - 86400000, to: t0 };
    return { from: t0 - 6 * 86400000, to: Infinity };
  }, [period]);

  const periodRows = useMemo(
    () => (rows || []).filter(r => (r.at || 0) >= range.from && (r.at || 0) < range.to),
    [rows, range]);
  const names = useMemo(() => [...new Set(periodRows.map(r => r.who).filter(Boolean))], [periodRows]);
  const view = useMemo(() => (who ? periodRows.filter(r => r.who === who) : periodRows), [periodRows, who]);

  // 검수원별 요약 — 로그인·열람·조회(lookup+nls)·완료(현재 voyages의 completed by 합산)
  const summary = useMemo(() => {
    const m = {};
    const ensure = (n) => (m[n] = m[n] || { login: 0, view: 0, lookup: 0, done: 0 });
    periodRows.forEach(r => {
      const s = ensure(r.who || '?');
      if (r.type === 'login') s.login++;
      else if (r.type === 'view') s.view++;
      else if (r.type === 'lookup' || r.type === 'nls') s.lookup++;
    });
    Object.values(voyages || {}).forEach(v => {
      ['discharge', 'loading'].forEach(md => {
        Object.values((v && v[md] && v[md].completed) || {}).forEach(c => {
          const _w = completedByLabel(c, (v && v.info) || null);   // 3.16: 터미널 반영분은 조 등록 근무자로
          if (_w && (c.at || 0) >= range.from && (c.at || 0) < range.to) ensure(_w).done++;
        });
      });
    });
    return Object.entries(m).sort((a, b) => (b[1].view + b[1].lookup) - (a[1].view + a[1].lookup));
  }, [periodRows, voyages, range]);

  const shown = view.slice(0, limit);
  return (
    <div className="bg-ink-900 border border-fuchsia-800/40 rounded-btn p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-sm font-bold text-dim-100">🕵️ 활동 로그</div>
        <span className="text-2xs text-fuchsia-300/70">소유자 전용 — 열람 자체를 기록</span>
      </div>
      <div className="text-2xs text-dim-400 mb-2">
        완료 건수는 현재 항차 기준(voyages의 completed만 합산 — 보관소로 넘어간 실적 제외)
      </div>

      {/* 기간 선택 + 검수원 필터 칩 */}
      <div className="flex gap-1 mb-2">
        {[['today', '오늘'], ['yesterday', '어제'], ['7d', '7일']].map(([k, t]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`px-2.5 py-1 rounded text-xxs font-bold ${
              period === k ? 'bg-fuchsia-700 text-fuchsia-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap mb-2">
        <button onClick={() => setWho('')}
          className={`px-2 py-0.5 rounded text-xxs font-bold ${
            who === '' ? 'bg-amber-700 text-amber-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
          전체
        </button>
        {names.map(n => (
          <button key={n} onClick={() => setWho(n)}
            className={`px-2 py-0.5 rounded text-xxs font-bold ${
              who === n ? 'bg-amber-700 text-amber-100' : 'bg-ink-800 text-dim-300 hover:bg-ink-750'}`}>
            {n}
          </button>
        ))}
      </div>

      {/* 검수원별 요약 줄 */}
      {summary.length > 0 && (
        <div className="space-y-1 mb-2">
          {summary.map(([n, s]) => (
            <div key={n} className="text-xxs text-dim-200 bg-ink-950/60 border border-line rounded px-2 py-1">
              <b className="text-dim-100">{n}</b>
              <span className="text-dim-400"> — </span>
              로그인 {s.login}회 · 열람 {s.view}건 · 조회 {s.lookup}건 · <span className={s.done > 0 ? 'text-emerald-300' : 'text-dim-400'}>완료 {s.done}건</span>
            </div>
          ))}
        </div>
      )}

      {/* 타임라인 — 최신순, 300건 + 더보기 */}
      {rows === null ? (
        <div className="text-xs text-dim-400 text-center py-4">불러오는 중…</div>
      ) : error ? (
        <div className="text-xs text-red-300 text-center py-3">활동 로그 조회 실패 — {error}</div>
      ) : shown.length === 0 ? (
        <div className="text-xs text-dim-400 text-center py-4">이 기간의 활동 기록이 없습니다</div>
      ) : (
        <div className="bg-ink-950 rounded border border-line divide-y divide-line/60 max-h-[50vh] overflow-y-auto">
          {shown.map((r, i) => {
            const prev = shown[i - 1];
            const dayBreak = !prev || _actMD(prev.at) !== _actMD(r.at);
            return (
              <React.Fragment key={r.day + '_' + r.id}>
                {dayBreak && period !== 'today' && (
                  <div className="px-2 py-0.5 text-2xs font-bold text-dim-400 bg-ink-900/80">{_actMD(r.at)}</div>
                )}
                <div className="px-2 py-1 flex items-baseline gap-2 text-xxs">
                  <span className="mono text-dim-400 shrink-0">{_actHHMM(r.at)}</span>
                  <span className="font-bold text-dim-100 shrink-0">{r.who}</span>
                  <span className={`min-w-0 break-all ${_ACT_COLOR[r.type] || 'text-dim-200'}`}>{formatActivityLine(r, voyages)}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {view.length > limit && (
        <button onClick={() => setLimit(l => l + 300)}
          className="mt-2 w-full py-1.5 rounded bg-ink-800 hover:bg-ink-750 text-xxs font-bold text-dim-200">
          더보기 ({view.length - limit}건 남음)
        </button>
      )}
    </div>
  );
}


