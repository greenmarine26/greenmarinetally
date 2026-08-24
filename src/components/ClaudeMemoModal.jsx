// TallyOne 1.1: "클로드에게 메모" 모달 — 검수사가 작업 중 발견한 문제·요청을 앱 안에서 바로 기록해
//   Firebase claude_inbox 노드로 보낸다. 클로드 세션이 나중에 읽어 처리한다(콘앱 불편신고와 같은 계열).
//   전송 실패 시 localStorage 큐(tallyone_claude_memo_queue)에 보관했다가 모달 열림·전송 성공 시 자동 재전송.
//   props 전부 옵셔널 — Header는 route·version을 주지만 AuxPage는 inspector만 준다.
//   빠진 정보는 window.location.hash 파싱(parseHash)과 utils.APP_VERSION으로 폴백해 무전달에도 동작한다.
import React, { useState, useEffect, useMemo } from 'react';
import { NotebookPen, X, Send, Trash2 } from 'lucide-react';
import { fbAddClaudeMemo, fbGetClaudeMemos, fbDeleteClaudeMemo } from '../firebase.js';
import { parseHash } from '../backHandler.js';
import { APP_VERSION } from '../utils.js';

// ── 순수 로직 (React 의존 없음 — node 시뮬레이션으로 그대로 검증) ─────────────

export const CLAUDE_MEMO_QUEUE_KEY = 'tallyone_claude_memo_queue';

// 서버에 저장할 메모 1건 조립 — firebase.js fbAddClaudeMemo와 필드 계약을 여기서 고정한다
export function buildClaudeMemo({ text, inspector, route, voyageKey, mode, appVersion, kind } = {}) {   // 2.02: kind — 'dev'(개발 요청) | 'mir'(미르에게 원함). 저장소는 종전대로 claude_inbox 하나(검수사 확정 «메모함은 하나일지라도 수집함은 이름은 달라도 됩니다»)
  return {
    kind: kind === 'mir' ? 'mir' : 'dev',
    text: String(text || '').trim(),
    inspector: inspector || '',
    route: route || '',
    voyageKey: voyageKey || '',
    mode: mode || '',
    appVersion: appVersion || APP_VERSION,
    at: Date.now(),
    status: 'new',
  };
}

// 오프라인 큐 읽기 — localStorage 불가(SSR·시크릿 모드 용량 초과 등)면 빈 배열
export function readMemoQueue() {
  try {
    const arr = JSON.parse(localStorage.getItem(CLAUDE_MEMO_QUEUE_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// 오프라인 큐 쓰기 — 성공 여부를 반환한다. 호출부는 false를 화면 문구로 반드시 알린다(조용한 실패 금지)
export function writeMemoQueue(arr) {
  try {
    localStorage.setItem(CLAUDE_MEMO_QUEUE_KEY, JSON.stringify(arr || []));
    return true;
  } catch (e) {
    return false;
  }
}

// 전송 시도 → 실패하면 큐 보관. 결과 3종(sent·queued·failed)을 구분해 반환 — 전부 화면 문구로 이어진다
export async function sendMemoOrQueue(memo, sendFn = fbAddClaudeMemo) {
  try {
    await sendFn(memo);
    return { result: 'sent' };
  } catch (e) {
    const q = readMemoQueue();
    q.push(memo);
    if (writeMemoQueue(q)) return { result: 'queued' };
    return { result: 'failed', error: e };
  }
}

// 큐 flush — 앞에서부터 순서대로 전송, 실패 시 중단하고 나머지는 큐에 남긴다(순서 보존)
export async function flushMemoQueue(sendFn = fbAddClaudeMemo) {
  const q = readMemoQueue();
  if (!q.length) return { sent: 0, remaining: 0 };
  let sent = 0;
  for (const memo of q) {
    try {
      await sendFn(memo);
      sent++;
    } catch (e) {
      break;
    }
  }
  const remaining = q.slice(sent);
  writeMemoQueue(remaining);
  return { sent, remaining: remaining.length };
}

// ── 표시용 소품 ──────────────────────────────────────────────────────────────

function fmtTime(t) {
  try {
    const d = new Date(t || 0);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch (e) {
    return '';
  }
}

function summarize(text, max = 64) {
  const s = String(text || '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// 상태칩 — 큐 대기(⏳)와 서버 접수(📥)를 한눈에 구분
function StatusChip({ queued, status }) {
  if (queued) {
    return <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700/50 text-amber-300 text-2xs font-bold shrink-0">⏳대기</span>;
  }
  if (!status || status === 'new') {
    return <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-700/50 text-sky-300 text-2xs font-bold shrink-0">📥접수</span>;
  }
  return <span className="px-1.5 py-0.5 rounded bg-ink-800 border border-line text-dim-300 text-2xs font-bold shrink-0">{status}</span>;
}

// ── 모달 본체 ────────────────────────────────────────────────────────────────

export default function ClaudeMemoModal({ inspector, route, voyageKey, mode, appVersion, onClose }) {
  // 자동 첨부 정보 — props 우선, 없으면 해시 파싱 폴백 (SSR·테스트 환경은 typeof 가드)
  const hash = (typeof window !== 'undefined' && window.location && window.location.hash) || '#/';
  const parsed = useMemo(() => {
    try { return parseHash(hash); } catch (e) { return { name: 'home' }; }
  }, [hash]);
  const vKey = voyageKey || (route && route.voyageKey) || parsed.voyageKey || '';
  const curMode = mode || (route && route.mode) || parsed.mode || '';
  const ver = appVersion || APP_VERSION;
  const modeLabel = curMode === 'loading' ? '선적' : curMode === 'discharge' ? '양하' : '';

  const [text, setText] = useState('');
  const [kind, setKind] = useState('dev');   // 2.02: 입력상자 구분 — 개발 요청 / 미르에게 원함 (저장은 같은 메모함)
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);              // { tone:'ok'|'wait'|'err', msg }
  const [queueItems, setQueueItems] = useState(() => readMemoQueue());
  const [serverMemos, setServerMemos] = useState([]);
  const [loadState, setLoadState] = useState('loading');   // 'loading' | 'ok' | 'err'

  // 서버 목록 재조회 + 큐 표시 갱신 — "내 메모"는 검수원 이름 기준(이름 없으면 전체)
  const refresh = async () => {
    setQueueItems(readMemoQueue());
    try {
      const list = await fbGetClaudeMemos(30);
      setServerMemos(inspector ? list.filter((m) => m.inspector === inspector) : list);
      setLoadState('ok');
    } catch (e) {
      setLoadState('err');
    }
  };

  // 모달 열릴 때 — 큐 flush 시도 후 목록 로드
  useEffect(() => {
    (async () => {
      const f = await flushMemoQueue();
      if (f.sent > 0) {
        setNotice({
          tone: 'ok',
          msg: `보관 중이던 메모 ${f.sent}건을 전송했습니다${f.remaining ? ` — ${f.remaining}건은 아직 대기` : ''}`,
        });
      }
      await refresh();
    })();
    // eslint-disable-next-line
  }, []);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) {
      setNotice({ tone: 'err', msg: '메모 내용을 입력해 주세요' });
      return;
    }
    setSending(true);
    const memo = buildClaudeMemo({ text: t, inspector, route: hash, voyageKey: vKey, mode: curMode, appVersion: ver, kind });
    const r = await sendMemoOrQueue(memo);
    if (r.result === 'sent') {
      setText('');
      // 방금 전송이 됐으니 밀린 큐도 이어서 시도
      const f = await flushMemoQueue();
      setNotice({
        tone: 'ok',
        msg: `개발 메모함에 저장됐습니다 — 개발자가 읽고 처리합니다${f.sent ? ` (보관 메모 ${f.sent}건도 함께 전송)` : ''}`,
      });
      await refresh();
    } else if (r.result === 'queued') {
      setText('');
      setNotice({ tone: 'wait', msg: '지금은 전송할 수 없어 기기에 보관했습니다 — 연결되면 자동 전송됩니다' });
      setQueueItems(readMemoQueue());
    } else {
      // 전송·보관 모두 실패 — 입력을 지우지 않고 남겨 사용자가 내용을 잃지 않게 한다
      setNotice({ tone: 'err', msg: '전송과 기기 보관이 모두 실패했습니다 — 내용을 복사해 두고 다시 시도해 주세요' });
    }
    setSending(false);
  };

  // 서버 메모 삭제 — 서버 데이터 제거는 되돌릴 수 없어 확인을 밟는다
  const handleDeleteServer = async (m) => {
    if (!window.confirm(`이 메모를 삭제할까요?\n\n"${summarize(m.text, 40)}"`)) return;
    try {
      await fbDeleteClaudeMemo(m.key);
      setNotice({ tone: 'ok', msg: '메모를 삭제했습니다' });
      await refresh();
    } catch (e) {
      setNotice({ tone: 'err', msg: '삭제 실패 — 네트워크 확인 후 다시 시도해 주세요' });
    }
  };

  // 큐 메모 삭제 — 아직 기기에만 있으므로 즉시 제거
  const handleDeleteQueued = (item) => {
    const next = readMemoQueue().filter((q) => q.at !== item.at);
    if (writeMemoQueue(next)) {
      setQueueItems(next);
      setNotice({ tone: 'ok', msg: '보관 중이던 메모를 삭제했습니다' });
    } else {
      setNotice({ tone: 'err', msg: '삭제 실패 — 저장소에 접근할 수 없습니다' });
    }
  };

  const noticeClass = notice
    ? notice.tone === 'ok'
      ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-200'
      : notice.tone === 'wait'
        ? 'bg-amber-950/50 border-amber-700/50 text-amber-200'
        : 'bg-red-950/50 border-red-700/60 text-red-200'
    : '';

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-ink-900 border-2 border-violet-700/60 rounded-card w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="sticky top-0 bg-ink-900 border-b border-line px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-violet-300" />
            <div className="font-black text-base text-violet-200">개발 요청 · 미르에게 원함</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink-750 rounded-pill" aria-label="닫기">
            <X className="w-5 h-5 text-dim-300" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xxs text-dim-300 leading-relaxed">
            남긴 글은 개발 메모함에 저장되고, 개발자가 읽어 처리합니다.
          </div>

          {/* 2.02: 입력상자 구분 — 저장소는 하나, 이름만 다르다 (검수사 확정) */}
          <div className="flex gap-2">
            <button onClick={() => setKind('dev')}
              className={`flex-1 py-2.5 rounded-btn text-sm font-black border-2 ${kind === 'dev' ? 'bg-violet-700 border-violet-500 text-white' : 'bg-ink-800 border-line text-dim-300'}`}>
              🔧 개발 요청
            </button>
            <button onClick={() => setKind('mir')}
              className={`flex-1 py-2.5 rounded-btn text-sm font-black border-2 ${kind === 'mir' ? 'bg-amber-700 border-amber-500 text-white' : 'bg-ink-800 border-line text-dim-300'}`}>
              🐱 미르에게 원함
            </button>
          </div>

          {/* ① 자동 첨부 정보 */}
          <div className="bg-ink-800/60 border border-line rounded-btn px-3 py-2.5">
            <div className="text-2xs font-black text-violet-300/80 mb-1">자동 첨부 정보</div>
            <div className="text-xxs text-dim-200 mono leading-relaxed break-all">
              검수원 <b className="text-dim-100">{inspector || '(없음)'}</b>
              {' · '}화면 {hash}
              {vKey ? <>{' · '}항차 <b className="text-dim-100">{vKey}</b></> : null}
              {modeLabel ? ` · ${modeLabel}` : ''}
              {' · '}{ver}
            </div>
          </div>

          {/* ② 텍스트 입력 */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={kind === 'mir' ? '미르가 더 해줬으면 하는 것 — 예: 베이별 남은 콘 수도 알려줘' : '예: SWDN 2608S 선적 리스트에 리퍼 온도가 안 보입니다'}
            className="w-full bg-ink-800 border-2 border-line focus:border-violet-500 focus:outline-none rounded-btn px-3 py-2.5 text-sm text-dim-100 placeholder-dim-400 leading-relaxed resize-y"
          />

          {/* ③ 보내기 */}
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="w-full h-12 rounded-btn bg-violet-700 hover:bg-violet-600 active:bg-violet-800 disabled:bg-ink-800 disabled:text-dim-400 text-white text-sm font-black flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? '전송 중...' : '보내기'}
          </button>

          {/* 결과 안내 — 성공·보관·실패 전부 문구로 드러낸다 */}
          {notice && (
            <div className={`border rounded-pill px-3 py-2 text-xxs leading-relaxed ${noticeClass}`}>
              {notice.msg}
            </div>
          )}

          {/* ④ 최근 내 메모 목록 — 기기 보관분(⏳대기)이 위, 서버 접수분(📥접수)이 아래 */}
          <div>
            <div className="text-2xs font-black text-dim-400 mb-1.5">최근 내 메모</div>
            <div className="space-y-1.5">
              {queueItems.map((m) => (
                <div key={`q_${m.at}`} className="bg-ink-800/50 border border-amber-800/40 rounded-btn px-3 py-2 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StatusChip queued />
                      <span className="text-2xs text-dim-400 mono">{fmtTime(m.at)}</span>
                      {m.voyageKey ? <span className="text-2xs text-dim-500 mono truncate">{m.voyageKey}</span> : null}
                    </div>
                    <div className="text-xs text-dim-100 leading-snug">{summarize(m.text)}</div>
                  </div>
                  <button onClick={() => handleDeleteQueued(m)} className="p-2 -mr-1 hover:bg-ink-750 rounded-pill shrink-0" aria-label="보관 메모 삭제">
                    <Trash2 className="w-4 h-4 text-dim-400" />
                  </button>
                </div>
              ))}
              {serverMemos.map((m) => (
                <div key={m.key} className="bg-ink-800/50 border border-line rounded-btn px-3 py-2 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StatusChip status={m.status} />
                      <span className="text-2xs text-dim-400 mono">{fmtTime(m.at)}</span>
                      {m.voyageKey ? <span className="text-2xs text-dim-500 mono truncate">{m.voyageKey}</span> : null}
                    </div>
                    <div className="text-xs text-dim-100 leading-snug">{summarize(m.text)}</div>
                  </div>
                  <button onClick={() => handleDeleteServer(m)} className="p-2 -mr-1 hover:bg-ink-750 rounded-pill shrink-0" aria-label="메모 삭제">
                    <Trash2 className="w-4 h-4 text-dim-400" />
                  </button>
                </div>
              ))}
              {loadState === 'loading' && (
                <div className="text-center text-xxs text-dim-400 py-3">목록을 불러오는 중...</div>
              )}
              {loadState === 'err' && (
                <div className="text-center text-xxs text-red-300 py-3">목록 조회 실패 — 네트워크 확인 후 다시 열어 주세요</div>
              )}
              {loadState === 'ok' && queueItems.length === 0 && serverMemos.length === 0 && (
                <div className="text-center text-xxs text-dim-500 py-3">아직 보낸 메모가 없습니다</div>
              )}
            </div>
          </div>

          {/* ⑤ 닫기 */}
          <button onClick={onClose} className="w-full h-11 rounded-btn bg-ink-800 hover:bg-ink-750 text-dim-200 text-sm font-bold">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
