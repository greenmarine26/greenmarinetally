// 사용자 매뉴얼 — V8.02 전면 재구성 (사용자 요청 2026-06-16)
//   두 갈래: ① 앱 사용설명·기능  ② 검수 용어·회화
//   개발 변경이력(changelog 600여건)은 통합지침서로 이관, 여기엔 검수 실사용만.
//   "한눈에 눈으로만 봐도" — 아이콘+색상 카드로 시각 구분.
import React, { useState } from 'react';
import { X, Search, Mic, MessageCircle, Anchor, Truck, AlertTriangle, Lightbulb,
  BookOpen, Languages, ChevronRight, ChevronLeft } from 'lucide-react';
import ContainerPhrasebook from './ContainerPhrasebook.jsx';
import { HELP_DATA } from '../data/helpData.js';

// 사용설명 카테고리: id → {label, icon, accent(테일윈드 색), source}
//   source: HELP_DATA.usage[key] 또는 HELP_DATA.tips(실용팁)
const USAGE_CATS = [
  { id: 'basic',   label: '기본 검색',   icon: Search,         accent: 'sky',     desc: '컨번호 끝 4자리로 찾기' },
  { id: 'ai',      label: 'AI·질문',     icon: MessageCircle,  accent: 'violet',  desc: '개수·통계·자유 질문' },
  { id: 'voice',   label: '음성',        icon: Mic,            accent: 'rose',    desc: '손 안 쓰고 검색·답변' },
  { id: 'special', label: '특수화물',    icon: AlertTriangle,  accent: 'amber',   desc: '리퍼·위험물·X-RAY' },
  { id: 'port',    label: '항구 검색',   icon: Anchor,         accent: 'emerald', desc: '한국어 항구명으로' },
  { id: 'twin',    label: '트윈',        icon: Truck,          accent: 'cyan',    desc: '20ft 두 개 한 번에' },
  { id: 'tips',    label: '실전 팁',     icon: Lightbulb,      accent: 'yellow',  desc: '빠른 검수·문제 해결' },
];

// 테일윈드 정적 클래스 (동적 생성 금지 — 빌드 시 purge 회피)
const ACCENT = {
  sky:     { card: 'bg-sky-950/40 border-sky-700/50 hover:border-sky-500',         icon: 'text-sky-300',     title: 'text-sky-200' },
  violet:  { card: 'bg-violet-950/40 border-violet-700/50 hover:border-violet-500', icon: 'text-violet-300',  title: 'text-violet-200' },
  rose:    { card: 'bg-rose-950/40 border-rose-700/50 hover:border-rose-500',       icon: 'text-rose-300',    title: 'text-rose-200' },
  amber:   { card: 'bg-amber-950/40 border-amber-700/50 hover:border-amber-500',    icon: 'text-amber-300',   title: 'text-amber-200' },
  emerald: { card: 'bg-emerald-950/40 border-emerald-700/50 hover:border-emerald-500', icon: 'text-emerald-300', title: 'text-emerald-200' },
  cyan:    { card: 'bg-cyan-950/40 border-cyan-700/50 hover:border-cyan-500',       icon: 'text-cyan-300',    title: 'text-cyan-200' },
  yellow:  { card: 'bg-yellow-950/40 border-yellow-700/50 hover:border-yellow-500', icon: 'text-yellow-300',  title: 'text-yellow-200' },
};

export default function HelpModal({ open, onClose }) {
  // view: 'home'(두 갈래) | 'usage'(카테고리 그리드) | 'cat:<id>'(항목) | 'terms'(용어)
  const [view, setView] = useState('home');
  const [phraseOpen, setPhraseOpen] = useState(false);
  if (!open) return null;

  // 카테고리 항목 가져오기 (방어적: examples/items 모두 수용)
  const catBlocks = (id) => {
    if (id === 'tips') return HELP_DATA.tips || [];
    return (HELP_DATA.usage?.[id] || []);
  };

  const Header = ({ title, back }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/90 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button onClick={back} className="p-1.5 -ml-1.5 hover:bg-slate-800 rounded-lg shrink-0">
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
        )}
        <span className="text-base font-black text-slate-100 truncate">{title}</span>
      </div>
      <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg shrink-0">
        <X className="w-5 h-5 text-slate-400" />
      </button>
    </div>
  );

  // ── 항목 리스트 (q/a) ──
  const renderBlocks = (blocks) => (
    <div className="p-3 sm:p-4 space-y-3">
      {blocks.map((sec, si) => {
        const rows = sec.examples || sec.items || sec.rows || [];
        return (
          <div key={si} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="text-sm font-black text-amber-200 mb-2">{sec.title}</div>
            <div className="space-y-1.5">
              {rows.map((ex, ei) => (
                <div key={ei} className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 sm:gap-2 py-1.5 border-b border-slate-700/40 last:border-0">
                  <code className="sm:col-span-2 text-xs sm:text-sm font-bold mono text-cyan-300 bg-slate-950/60 px-2 py-1 rounded break-all self-start">
                    {ex.q}
                  </code>
                  <div className="sm:col-span-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {ex.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  let body;
  if (view === 'home') {
    // ── 첫 화면: 두 갈래 큰 카드 ──
    body = (
      <>
        <Header title="도움말" />
        <div className="p-4 space-y-3 overflow-y-auto">
          <button onClick={() => setView('usage')}
            className="w-full text-left bg-gradient-to-br from-sky-900/50 to-slate-900 border-2 border-sky-700/40 hover:border-sky-500 rounded-2xl p-5 flex items-center gap-4 transition">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7 text-sky-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-sky-100">앱 사용설명 · 기능</div>
              <div className="text-sm text-sky-300/70 mt-0.5">검색·음성·AI·특수화물·트윈·실전 팁</div>
            </div>
            <ChevronRight className="w-6 h-6 text-sky-400 shrink-0" />
          </button>

          <button onClick={() => setView('terms')}
            className="w-full text-left bg-gradient-to-br from-emerald-900/50 to-slate-900 border-2 border-emerald-700/40 hover:border-emerald-500 rounded-2xl p-5 flex items-center gap-4 transition">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Languages className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-emerald-100">검수 용어 · 회화</div>
              <div className="text-sm text-emerald-300/70 mt-0.5">현장 용어 풀이 + 영어 회화집</div>
            </div>
            <ChevronRight className="w-6 h-6 text-emerald-400 shrink-0" />
          </button>
        </div>
      </>
    );
  } else if (view === 'usage') {
    // ── 사용설명: 카테고리 아이콘 카드 그리드 ──
    body = (
      <>
        <Header title="앱 사용설명 · 기능" back={() => setView('home')} />
        <div className="p-3 sm:p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2.5">
            {USAGE_CATS.map((cat) => {
              const Icon = cat.icon;
              const a = ACCENT[cat.accent];
              return (
                <button key={cat.id} onClick={() => setView('cat:' + cat.id)}
                  className={`text-left border-2 rounded-2xl p-3.5 transition ${a.card}`}>
                  <Icon className={`w-7 h-7 mb-2 ${a.icon}`} />
                  <div className={`text-sm font-black ${a.title}`}>{cat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{cat.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  } else if (view.startsWith('cat:')) {
    const id = view.slice(4);
    const cat = USAGE_CATS.find((c) => c.id === id);
    body = (
      <>
        <Header title={cat ? cat.label : '도움말'} back={() => setView('usage')} />
        <div className="overflow-y-auto">{renderBlocks(catBlocks(id))}</div>
      </>
    );
  } else if (view === 'terms') {
    // ── 용어 + 회화 ──
    body = (
      <>
        <Header title="검수 용어 · 회화" back={() => setView('home')} />
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4">
          {/* 영어 회화집 진입 */}
          <button onClick={() => setPhraseOpen(true)}
            className="w-full bg-gradient-to-br from-blue-900/50 to-slate-900 border-2 border-blue-700/40 hover:border-blue-500 rounded-2xl p-4 flex items-center gap-3 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Languages className="w-6 h-6 text-blue-300" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-base font-black text-blue-100">영어 회화집 열기</div>
              <div className="text-xs text-blue-300/70">외국 선원·도선사 응대 표현 (음성·즐겨찾기)</div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400 shrink-0" />
          </button>

          {/* 용어 카드 */}
          <div>
            <div className="text-sm font-black text-emerald-200 mb-2 px-1">📖 검수 용어 풀이</div>
            <div className="space-y-1.5">
              {(HELP_DATA.terms || []).map((t, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 flex gap-3">
                  <div className="text-sm font-black text-emerald-300 mono shrink-0 min-w-[5.5rem]">{t.term}</div>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-slate-950 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {body}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-600 text-center shrink-0">
          즉답이 안 되는 자유 질문은 AI 버튼을 탭하세요
        </div>
      </div>
      <ContainerPhrasebook open={phraseOpen} onClose={() => setPhraseOpen(false)} />
    </div>
  );
}
