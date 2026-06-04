import React, { useMemo, useState, useEffect } from 'react';
import { Users, Anchor, ChevronRight, ArrowDown, ArrowUp, Clock, Library, Ship, AlertTriangle, CheckCircle2, Trash2, Lock, FileSpreadsheet, Truck, Send, Camera, Search, Star, Calendar, UserCheck } from 'lucide-react';
import { fbSubscribeShipLibrary, fbSubscribeFeedback, fbResolveFeedback, fbDeleteFeedback, db, fbSubscribeAllReports, fbDeleteWorkReport, fbClearAllReports, fbClearAllReportsAllVoyages, fbClearAllActiveWork, fbResetAllShipStats, tallyVoyagesByShip } from '../firebase.js';
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies } from '../shipPolicies.js';
import { generateEmptySealReport } from '../components/EmptySealReport.jsx';
import ConfirmModal, { useConfirm } from '../components/ConfirmModal.jsx';
import { isChief, getStaffRole } from '../staffList.js';
import { isShipInBayDict, getShipBayDictData } from '../shipStructure.js';

export default function ChiefDashboard({ voyages, inspectors, onOpenVoyage, onGoHome }) {
  const [shipLib, setShipLib] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showResolved, setShowResolved] = useState(false);
  const [extraPolicies, setExtraPolicies] = useState({});
  const [allReports, setAllReports] = useState([]);  // M3.5.6: 작업 보고 이력
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  useEffect(() => {
    const u1 = fbSubscribeShipLibrary(setShipLib);
    const u2 = fbSubscribeFeedback(setFeedback);
    const u3 = fbSubscribeShipPolicies(db, setExtraPolicies);
    const u4 = fbSubscribeAllReports(setAllReports, 100);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // M3.5.6: 오늘 장비별 작업 보고 통계
  const equipStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const stats = {};
    (allReports || []).forEach(r => {
      if (!r.ts || r.ts < todayMs) return;
      const equip = r.equip || '미지정';
      if (!stats[equip]) stats[equip] = { total: 0, status: 0, hatch: 0, conbox: 0, damage: 0, sealError: 0, latest: 0 };
      stats[equip].total++;
      if (r.type === 'work_status') stats[equip].status++;
      else if (r.type === 'hatch') stats[equip].hatch++;
      else if (r.type === 'conbox') stats[equip].conbox++;
      else if (r.type === 'damage') stats[equip].damage++;
      else if (r.type === 'seal_error') stats[equip].sealError++;
      if (r.ts > stats[equip].latest) stats[equip].latest = r.ts;
    });
    return stats;
  }, [allReports]);

  // 최근 작업 보고 (시간순)
  const recentReports = useMemo(() => {
    return (allReports || []).slice(0, 30);
  }, [allReports]);

  // M3.5.5: 엠티 실 작업 중인 항차 (실시간 부착 현황)
  const sealVoyages = useMemo(() => {
    const list = [];
    Object.entries(voyages || {}).forEach(([key, v]) => {
      const policy = matchShipPolicy(v?.info?.vsl || '', extraPolicies);
      if (!policy) return;
      // 양하/선적 모두 검사
      ['discharge', 'loading'].forEach(mode => {
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const targets = [];
        Object.values(ediMap).forEach(c => {
          // 평택만 (mode에 맞춰)
          const isPtk = mode === 'discharge' ? (c.pod || '').endsWith('PTK') : (c.pol || '').endsWith('PTK');
          if (!isPtk) return;
          const sm = applyPolicyToContainer(policy, c);
          if (!sm) return;
          // record로 보강 (eseal 등)
          const r = recMap[c.cn] || {};
          targets.push({
            ...c,
            eseal: r.eseal || c.eseal || '',
            eseal_wrong: r.eseal_wrong || '',
            reseal: r.reseal || '',
            eseal_by: r.eseal_by || '',
            eseal_at: r.eseal_at || 0,
            _sealMode: sm,
          });
        });
        if (targets.length > 0) {
          // 최근 활동순 정렬 (eseal 있는 것 먼저, 없는 것은 위치순)
          targets.sort((a, b) => {
            if (a.eseal && b.eseal) return (b.eseal_at || 0) - (a.eseal_at || 0);
            if (a.eseal) return -1;
            if (b.eseal) return 1;
            return `${a.bay}-${a.row}-${a.tier}`.localeCompare(`${b.bay}-${b.row}-${b.tier}`);
          });
          list.push({
            voyageKey: key,
            voyage: v,
            mode,
            policy,
            targets,
            done: targets.filter(c => c.eseal).length,
            total: targets.length,
          });
        }
      });
    });
    return list;
  }, [voyages, extraPolicies]);

  // 오답 리포트 정렬 (최신순, 미해결 먼저)
  const feedbackList = useMemo(() => {
    return Object.values(feedback || {})
      .filter(f => f && f.ts)
      .filter(f => showResolved || !f.resolved)
      .sort((a, b) => {
        // 미해결 먼저
        if (!!a.resolved !== !!b.resolved) return a.resolved ? 1 : -1;
        return (b.ts || 0) - (a.ts || 0);
      });
  }, [feedback, showResolved]);

  const unresolvedCount = useMemo(() =>
    Object.values(feedback || {}).filter(f => f && !f.resolved).length, [feedback]);

  // 항차별 통계
  const voyageStats = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        const dis = computeStats(v.discharge);
        const loa = computeStats(v.loading);
        return {
          key: k,
          info: v.info,
          dis, loa,
          totalDone: dis.done + loa.done,
          totalAll: dis.total + loa.total,
        };
      })
      .sort((a, b) => (b.info.createdAt || 0) - (a.info.createdAt || 0));
  }, [voyages]);

  // 검수원별 일일 통계
  const inspectorStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const stats = {};
    Object.values(voyages || {}).forEach(v => {
      ['discharge', 'loading'].forEach(mode => {
        const sec = v?.[mode];
        if (!sec) return;
        Object.values(sec.completed || {}).forEach(comp => {
          if (!comp.by) return;
          if (!stats[comp.by]) stats[comp.by] = { name: comp.by, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
          stats[comp.by].total++;
          if (mode === 'discharge') stats[comp.by].dis++;
          else stats[comp.by].loa++;
          if (comp.at >= todayMs) stats[comp.by].today++;
          if (comp.at > stats[comp.by].lastAt) stats[comp.by].lastAt = comp.at;
        });
      });
    });

    // 활동 정보 합치기
    Object.values(inspectors || {}).forEach(i => {
      if (!i?.name) return;
      if (!stats[i.name]) stats[i.name] = { name: i.name, total: 0, today: 0, lastAt: 0, dis: 0, loa: 0 };
      stats[i.name].active = i.lastActive && (Date.now() - i.lastActive) < 90000;
      stats[i.name].lastVoyage = i.lastVoyage;
      stats[i.name].lastMode = i.lastMode;
    });

    return Object.values(stats).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [voyages, inspectors]);

  // 전체 합계
  const total = useMemo(() => {
    let done = 0, all = 0, ptkAll = 0, missing = 0;
    voyageStats.forEach(v => {
      done += v.totalDone;
      all += v.totalAll;
      ptkAll += v.dis.ptk + v.loa.ptk;
      missing += v.dis.missing + v.loa.missing;
    });
    return { done, all, ptkAll, missing };
  }, [voyageStats]);

  return (
    <div className="max-w-3xl mx-auto px-3 py-3 space-y-3">
      <div>
        <div className="text-[10px] text-purple-400 font-bold uppercase mb-1">수석 검수원 대시보드</div>
        <div className="text-lg font-bold text-slate-100">전체 현황</div>
      </div>

      {/* 전체 카운터 */}
      <div className="grid grid-cols-2 gap-2">
        <BigStat label="전체 확인" value={total.done.toLocaleString()} sub={`/ ${total.all.toLocaleString()}대`} color="emerald"/>
        <BigStat label="누락 (선사 추가 필요)" value={total.missing} sub={`평택 ${total.ptkAll}대 중`} color={total.missing > 0 ? "red" : "slate"}/>
      </div>

      {/* 전체 검수원 진행률 (인원 무제한) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-amber-400"/>
          <div className="text-sm font-bold text-slate-100">검수원 활동 ({inspectorStats.length}명)</div>
        </div>
        {inspectorStats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">아직 검수 기록 없음</div>
        ) : (
          <div className="space-y-1.5">
            {inspectorStats.map(s => (
              <InspectorRow key={s.name} s={s}/>
            ))}
          </div>
        )}
      </div>

      {/* 항차별 진행률 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Anchor className="w-4 h-4 text-blue-400"/>
          <div className="text-sm font-bold text-slate-100">항차별 진행 ({voyageStats.length}건)</div>
        </div>
        {voyageStats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">진행 중 항차 없음</div>
        ) : (
          <div className="space-y-2">
            {voyageStats.map(v => (
              <VoyageStatRow key={v.key} v={v} onOpen={() => onOpenVoyage(v.key)}/>
            ))}
          </div>
        )}
      </div>

      {/* 선박 라이브러리 (학습된 선박 구조) — M6.15: 강화 (정렬/검색/항차 상세/인원/베이사전 상태) */}
      <ShipLibrarySection shipLib={shipLib} voyages={voyages} />

      {/* M3.5.6: 장비별 오늘 작업 보고 통계 */}
      {Object.keys(equipStats).length > 0 && (
        <div className="bg-slate-900 border border-orange-700/40 rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-orange-400"/>
            <div className="text-sm font-bold text-orange-100">오늘 장비별 작업 보고</div>
            <span className="text-[10px] text-slate-500">실시간</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['1호기', '2호기', '3호기', '4호기'].map(eq => {
              const s = equipStats[eq];
              if (!s) return (
                <div key={eq} className="bg-slate-800/40 border border-slate-700/40 rounded p-2 opacity-50">
                  <div className="text-sm font-bold text-slate-400">🏗 {eq}</div>
                  <div className="text-[10px] text-slate-500">작업 없음</div>
                </div>
              );
              return (
                <div key={eq} className="bg-orange-900/20 border border-orange-700/40 rounded p-2">
                  <div className="text-sm font-bold text-orange-200">🏗 {eq}</div>
                  <div className="text-lg font-black text-orange-100">{s.total}건</div>
                  <div className="text-[10px] text-slate-400 space-y-0.5 mt-1">
                    {s.status > 0 && <div>📤 작업상태 {s.status}</div>}
                    {s.hatch > 0 && <div>🔓 해치 {s.hatch}</div>}
                    {s.conbox > 0 && <div>📦 콘박스 {s.conbox}</div>}
                    {s.damage > 0 && <div className="text-amber-300">⚠️ 데미지 {s.damage}</div>}
                    {s.sealError > 0 && <div className="text-red-300">🚨 실오류 {s.sealError}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* M3.5.6: 최근 작업 보고 (시간순) */}
      {recentReports.length > 0 && (
        <div className="bg-slate-900 border border-emerald-700/40 rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Send className="w-4 h-4 text-emerald-400"/>
            <div className="text-sm font-bold text-emerald-100">최근 작업 보고</div>
            <span className="text-[10px] text-slate-500">최근 30건</span>
            <div className="flex-1"/>
            <button onClick={() => {
              askConfirm({
                title: '⚠️ 모든 작업 보고 삭제',
                message: '모든 항차의 작업 보고와 사진을 삭제합니다.\n테스트 데이터 정리용입니다.\n\n되돌릴 수 없습니다. 계속하시겠습니까?',
                confirmLabel: '모두 삭제',
                cancelLabel: '취소',
                danger: true,
                onConfirm: async () => {
                  try {
                    await fbClearAllReportsAllVoyages();
                    await fbClearAllActiveWork();
                    alert('✅ 모든 작업 보고가 삭제되었습니다');
                  } catch (e) { alert('삭제 실패: ' + e.message); }
                },
              });
            }}
              className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1">
              <Trash2 className="w-3 h-3"/> 전체 삭제 (테스트용)
            </button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {recentReports.map((r, i) => {
              const time = r.ts ? new Date(r.ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
              const icon = r.type === 'work_status' ? '📤' : r.type === 'hatch' ? '🔓' : r.type === 'conbox' ? '📦' : r.type === 'damage' ? '⚠️' : r.type === 'seal_error' ? '🚨' : '📋';
              return (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded p-2 text-xs group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      <span>{icon}</span>
                      <span className="font-bold text-slate-200">{r.vsl} {r.voy}</span>
                      {r.equip && <span className="text-[10px] bg-orange-700 text-white px-1 py-0.5 rounded font-bold">{r.equip}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 mono">{time}</span>
                      <button onClick={() => {
                        askConfirm({
                          title: '보고 삭제',
                          message: `${r.vsl} ${r.voy}\n${r.equip || ''} 보고를 삭제하시겠습니까?`,
                          confirmLabel: '삭제',
                          cancelLabel: '취소',
                          danger: true,
                          onConfirm: async () => {
                            try {
                              await fbDeleteWorkReport(r.voyageKey, r.ts);
                            } catch (e) { alert('삭제 실패: ' + e.message); }
                          },
                        });
                      }}
                        className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded opacity-50 group-hover:opacity-100"
                        title="이 보고 삭제">
                        <Trash2 className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 whitespace-pre-line ml-4">{r.message || ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* M3.5.5: 엠티 실 작업 실시간 현황 */}
      {sealVoyages.length > 0 && (
        <div className="bg-slate-900 border border-amber-700/40 rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-400"/>
            <div className="text-sm font-bold text-amber-100">엠티 실 작업 실시간 현황</div>
            <span className="text-[10px] text-slate-500">실시간 갱신</span>
          </div>
          <div className="space-y-3">
            {sealVoyages.map(sv => (
              <SealVoyageCard key={`${sv.voyageKey}-${sv.mode}`} sv={sv} onOpenVoyage={onOpenVoyage}/>
            ))}
          </div>
        </div>
      )}

      {/* M3.4: 오답 리포트 (검수원 신고 → 다음 버전 개선용) */}
      <div className="bg-slate-900 border border-red-800/40 rounded-xl p-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400"/>
            <div className="text-sm font-bold text-slate-100">오답 리포트</div>
            {unresolvedCount > 0 && (
              <span className="bg-red-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                미해결 {unresolvedCount}
              </span>
            )}
          </div>
          <button onClick={() => setShowResolved(v => !v)}
            className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700">
            {showResolved ? '미해결만' : '해결된 것도'}
          </button>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">
          검수원이 잘못된 답변에 ❌ 오답 버튼 누르면 여기 모입니다 → 다음 버전에서 패턴 보강
        </div>
        {feedbackList.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            {showResolved ? '오답 리포트 없음' : '미해결 오답 없음 ✓'}
          </div>
        ) : (
          <div className="space-y-2">
            {feedbackList.slice(0, 50).map(f => (
              <FeedbackRow key={f.ts} feedback={f}/>
            ))}
            {feedbackList.length > 50 && (
              <div className="text-[10px] text-slate-500 text-center pt-1">
                ... {feedbackList.length - 50}건 더 있음
              </div>
            )}
          </div>
        )}
      </div>

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />
    </div>
  );
}

// M3.5.5: 엠티 실 작업 항차 카드 (실시간 표)
function SealVoyageCard({ sv, onOpenVoyage }) {
  const [downloading, setDownloading] = useState(false);
  const isAttach = sv.policy.mode === 'attach';
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await generateEmptySealReport({
        voyage: sv.voyage,
        sealTargets: sv.targets,
        sealMode: sv.policy.mode,
      });
      alert(`✅ 다운로드: ${result.filename}\n${result.rowCount}대`);
    } catch (e) {
      alert('실패: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`border-2 rounded-lg p-2.5 ${isAttach ? 'border-red-700/50 bg-red-950/15' : 'border-cyan-700/50 bg-cyan-950/15'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">
            {isAttach ? '🔧' : '🔍'} {sv.voyage?.info?.vsl} <span className="text-slate-400">{sv.voyage?.info?.voy_l || sv.voyage?.info?.voy}</span>
          </div>
          <div className="text-[10px] text-slate-500">{sv.policy.label}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${sv.done === sv.total ? 'text-emerald-400' : 'text-amber-400'}`}>
            {sv.done} / {sv.total}
          </div>
          <div className="text-[10px] text-slate-500">{sv.total - sv.done}대 남음</div>
        </div>
      </div>

      {/* 실시간 표 (최대 50줄) */}
      <div className="bg-slate-950 rounded border border-slate-700 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-1.5 py-1 text-left w-8">No</th>
              <th className="px-1.5 py-1 text-left">컨번호</th>
              <th className="px-1.5 py-1 text-left w-20">엠티실</th>
              {sv.policy.mode === 'verify' && <th className="px-1.5 py-1 text-left w-20">리씰/틀린</th>}
              <th className="px-1.5 py-1 text-left w-14">검수자</th>
              <th className="px-1.5 py-1 text-left w-12">시각</th>
            </tr>
          </thead>
          <tbody>
            {sv.targets.slice(0, 50).map((c, i) => {
              const filled = !!c.eseal;
              return (
                <tr key={i} className={`border-t border-slate-800 ${filled ? '' : 'opacity-50'}`}>
                  <td className="px-1.5 py-1 text-slate-500 mono">{i + 1}</td>
                  <td className="px-1.5 py-1 mono text-slate-200">{c.cn || '(현장부여)'}</td>
                  <td className="px-1.5 py-1 mono">
                    {c.eseal ? <span className="text-emerald-300 font-bold">{c.eseal}</span> : <span className="text-slate-600">⏳ 대기</span>}
                  </td>
                  {sv.policy.mode === 'verify' && (
                    <td className="px-1.5 py-1 mono">
                      {c.reseal && <span className="text-purple-300">🔄{c.reseal}</span>}
                      {c.eseal_wrong && <span className="text-amber-300 ml-1">⚠️{c.eseal_wrong}</span>}
                    </td>
                  )}
                  <td className="px-1.5 py-1 text-slate-400 text-[10px]">{c.eseal_by || '-'}</td>
                  <td className="px-1.5 py-1 text-slate-500 text-[10px] mono">
                    {c.eseal_at ? new Date(c.eseal_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sv.targets.length > 50 && (
          <div className="text-[10px] text-slate-500 text-center py-1 border-t border-slate-800">
            ... 외 {sv.targets.length - 50}대 (엑셀 다운로드로 전체 확인)
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => onOpenVoyage?.(sv.voyageKey)}
          className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold">
          항차 열기
        </button>
        <button onClick={handleDownload} disabled={downloading}
          className={`py-2 rounded text-xs font-bold text-white flex items-center justify-center gap-1 ${
            isAttach ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
          } disabled:opacity-50`}>
          <FileSpreadsheet className="w-3 h-3"/>
          {downloading ? '...' : '엑셀'}
        </button>
      </div>
    </div>
  );
}

// 오답 리포트 한 줄
function FeedbackRow({ feedback: f }) {
  const [expanded, setExpanded] = useState(false);
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  const date = new Date(f.ts);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const typeColor = f.answerType === 'ai' ? 'text-purple-300' : 'text-emerald-300';
  const typeLabel = f.answerType === 'ai' ? 'AI' : f.answerType === 'local' ? '즉답' : '?';

  return (
    <div className={`bg-slate-950 border ${f.resolved ? 'border-slate-800 opacity-60' : 'border-red-900/40'} rounded-lg p-2.5`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {f.resolved && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0"/>}
          <span className="text-[10px] text-slate-500">{dateStr}</span>
          <span className="text-[10px] text-amber-300 font-bold">{f.inspector}</span>
          <span className={`text-[10px] font-bold ${typeColor}`}>[{typeLabel}]</span>
          {f.voyageVsl && <span className="text-[10px] text-slate-500 truncate">{f.voyageVsl}</span>}
          <span className="text-[9px] text-slate-600 mono">v{f.appVersion}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => fbResolveFeedback(f.ts, !f.resolved)}
            title={f.resolved ? '미해결로 되돌리기' : '해결됨 표시'}
            className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/40">
            {f.resolved ? '↩' : '✓'}
          </button>
          <button onClick={() => askConfirm({
            title: '오답 리포트 삭제',
            message: `Q: ${(f.query || '').slice(0, 50)}\n\n이 오답 리포트를 삭제하시겠습니까?`,
            confirmLabel: '삭제',
            cancelLabel: '취소',
            danger: true,
            onConfirm: async () => { await fbDeleteFeedback(f.ts); },
          })}
            title="삭제"
            className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/40">
            <Trash2 className="w-2.5 h-2.5"/>
          </button>
        </div>
      </div>
      <ConfirmModal {...confirmState} />
      <div className="text-xs text-amber-200 mono break-all mb-1">Q: {f.query}</div>
      {f.userNote && (
        <div className="text-xs text-slate-300 bg-slate-900/60 rounded px-2 py-1 mb-1 leading-relaxed">
          💬 {f.userNote}
        </div>
      )}
      <button onClick={() => setExpanded(v => !v)}
        className="text-[10px] text-slate-500 hover:text-slate-300">
        {expanded ? '▼ 답변 숨기기' : '▶ 앱 답변 보기'}
      </button>
      {expanded && (
        <div className="mt-1 text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-900/40 rounded p-2 max-h-40 overflow-y-auto">
          {f.answerText || '(없음)'}
        </div>
      )}
    </div>
  );
}

// M6.15: 선박 라이브러리 섹션 — 검색/정렬 + 강화 표시
function ShipLibrarySection({ shipLib, voyages }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('frequency'); // frequency | recent | name | discharge | loading
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const previewRows = useMemo(() => showPreview ? tallyVoyagesByShip(voyages) : [], [showPreview, voyages]);

  // M7.14: IMO 키 분열 병합 (표시 단계) — Firebase 데이터는 보존, 화면에서만 합침.
  //   콜사인이 IMO 자리에 섞여 같은 배가 ships/{진짜IMO} + ships/{콜사인} 둘로 갈라진 과거 데이터 대응.
  //   기준: 7자리 숫자 IMO가 있으면 그 IMO로, 없으면 정규화 선박명(공백/기호 제거 대문자)으로 그룹.
  //   대표 키: 그룹 내 7자리 숫자 IMO 우선, 없으면 첫 키. voyages 합치고 stats 재합산.
  const mergedLib = useMemo(() => {
    const entries = Object.entries(shipLib || {});
    const groups = {}; // groupKey → { repImo, names:Set, ships:[[imo,s]...] }
    const normName = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    entries.forEach(([imo, s]) => {
      const isNumericImo = /^[0-9]{7}$/.test(imo);
      const gk = isNumericImo ? `IMO:${imo}` : `NAME:${normName(s?.name)}` || `KEY:${imo}`;
      if (!groups[gk]) groups[gk] = { repImo: imo, repIsNumeric: isNumericImo, ships: [], names: new Set() };
      // 7자리 숫자 IMO를 대표 키로 승격
      if (isNumericImo && !groups[gk].repIsNumeric) { groups[gk].repImo = imo; groups[gk].repIsNumeric = true; }
      groups[gk].ships.push([imo, s]);
      if (s?.name) groups[gk].names.add(s.name);
    });

    // 같은 정규화 이름이 서로 다른 그룹(IMO그룹 vs NAME그룹)으로 흩어진 경우 추가 병합
    //   예: ships/{진짜IMO}는 IMO그룹, ships/{콜사인}은 NAME그룹 → 이름으로 다시 묶기
    const byName = {}; // normName → groupKey (대표)
    Object.entries(groups).forEach(([gk, g]) => {
      g.names.forEach(nm => {
        const nn = normName(nm);
        if (!nn) return;
        if (byName[nn] && byName[nn] !== gk) {
          // 병합: 숫자 IMO 그룹을 살림
          const target = groups[byName[nn]];
          if (target && groups[gk]) {
            target.ships.push(...groups[gk].ships);
            groups[gk].names.forEach(x => target.names.add(x));
            if (g.repIsNumeric && !target.repIsNumeric) { target.repImo = g.repImo; target.repIsNumeric = true; }
            delete groups[gk];
          }
        } else if (!byName[nn]) {
          byName[nn] = gk;
        }
      });
    });

    // 그룹 → 합산 선박 객체
    return Object.values(groups).map(g => {
      const mergedVoys = {};
      let bestStruct = null, bestName = '', lastAt = 0;
      const aliasImos = [];
      g.ships.forEach(([imo, s]) => {
        aliasImos.push(imo);
        Object.entries(s?.voyages || {}).forEach(([vk, v]) => {
          // 같은 voyageKey 충돌 시 더 최근(analyzed_at) 우선
          if (!mergedVoys[vk] || (v?.analyzed_at || 0) > (mergedVoys[vk]?.analyzed_at || 0)) {
            mergedVoys[vk] = v;
          }
        });
        if (s?.structure && (!bestStruct || (s.structure.bay_count || 0) > (bestStruct.bay_count || 0))) {
          bestStruct = s.structure;
        }
        if (s?.name && s.name.length > bestName.length) bestName = s.name;
        if ((s?.stats?.last_voyage_at || 0) > lastAt) lastAt = s.stats.last_voyage_at;
      });
      // stats 재합산 — 항차별 평택 대수 우선, 없으면 기존 stats 비례 추정
      let totalD = 0, totalL = 0;
      Object.values(mergedVoys).forEach(v => {
        totalD += v?.discharge_ptk || 0;
        totalL += v?.loading_ptk || 0;
      });
      // 구버전 항차(discharge_ptk 없음) 보정: 그룹의 기존 stats 합을 fallback으로
      if (totalD === 0 && totalL === 0) {
        g.ships.forEach(([, s]) => {
          totalD += s?.stats?.total_discharge || 0;
          totalL += s?.stats?.total_loading || 0;
        });
      }
      return [g.repImo, {
        name: bestName || [...g.names][0] || '?',
        structure: bestStruct || {},
        voyages: mergedVoys,
        stats: {
          total_voyages: Object.keys(mergedVoys).length,
          total_discharge: totalD,
          total_loading: totalL,
          last_voyage_at: lastAt,
        },
        _aliasImos: aliasImos,   // 병합된 원본 키들 (디버그/검색용)
      }];
    });
  }, [shipLib]);

  // 검색 + 정렬된 선박 목록
  const sortedShips = useMemo(() => {
    const list = mergedLib;
    const q = search.trim().toLowerCase();
    const filtered = !q ? list : list.filter(([imo, s]) => {
      const name = String(s?.name || '').toLowerCase();
      const aliases = (s?._aliasImos || []).join(' ').toLowerCase();
      return name.includes(q) || imo.toLowerCase().includes(q) || aliases.includes(q);
    });
    const getMetric = (s) => {
      const stats = s.stats || {};
      const voys = s.voyages || {};
      const voyKeys = Object.keys(voys);
      switch (sortBy) {
        case 'frequency':  return stats.total_voyages || voyKeys.length || 0;
        case 'recent':     return stats.last_voyage_at || 0;
        case 'discharge':  return stats.total_discharge || 0;
        case 'loading':    return stats.total_loading || 0;
        case 'name':       return String(s.name || '').toLowerCase();
        default:           return 0;
      }
    };
    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return getMetric(a[1]).localeCompare(getMetric(b[1]));
      }
      return (getMetric(b[1]) || 0) - (getMetric(a[1]) || 0);
    });
  }, [mergedLib, search, sortBy]);

  return (
    <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Library className="w-4 h-4 text-purple-400"/>
        <div className="text-sm font-bold text-slate-100 flex-1">
          선박 라이브러리 ({mergedLib.length}척 · 표시 {sortedShips.length})
        </div>
        <button
          onClick={() => setShowPreview(p => !p)}
          className="text-[10px] px-2 py-1 rounded bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-800/40 font-bold"
          title="현재 항차들을 선박명별 양하/선적으로 미리보기"
        >
          📋 현재 항차 미리보기
        </button>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-[10px] px-2 py-1 rounded bg-red-900/30 hover:bg-red-800/50 text-red-300 border border-red-800/40 font-bold"
          title="모든 선박의 양하/선적 통계 초기화 (베이 구조는 보존)"
        >
          🗑️ 통계 초기화
        </button>
      </div>

      {/* 현재 항차 선박명별 미리보기 표 */}
      {showPreview && (
        <div className="bg-slate-950/60 border border-cyan-800/30 rounded-lg p-2 mb-2">
          <div className="text-[11px] text-cyan-300 font-bold mb-1">현재 항차 선박명별 집계 (평택분) — {previewRows.length}척</div>
          <table className="w-full text-[11px] mono">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr><th className="text-left px-1">선박명</th><th className="text-right px-1">양하</th><th className="text-right px-1">선적</th><th className="text-right px-1">항차수</th></tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/40">
                  <td className="px-1 text-slate-200">{r.vsl}</td>
                  <td className="px-1 text-right text-blue-300 font-bold">{r.discharge}</td>
                  <td className="px-1 text-right text-amber-300 font-bold">{r.loading}</td>
                  <td className="px-1 text-right text-slate-400">{r.voyageKeys.length}</td>
                </tr>
              ))}
              {previewRows.length === 0 && (
                <tr><td colSpan="4" className="text-center text-slate-500 px-1 py-2">현재 항차 없음</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 font-bold">
                <td className="px-1 text-slate-200">합계</td>
                <td className="px-1 text-right text-blue-300">{previewRows.reduce((s, r) => s + r.discharge, 0)}</td>
                <td className="px-1 text-right text-amber-300">{previewRows.reduce((s, r) => s + r.loading, 0)}</td>
                <td className="px-1 text-right text-slate-400">{previewRows.reduce((s, r) => s + r.voyageKeys.length, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="text-[10px] text-slate-500 mb-2">
        EDI 분석된 선박 자동 누적 (항차 삭제와 무관). 입항 빈도순 정렬로 단골 식별 가능 (M6.15).
      </div>

      {/* 통계 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-slate-900 border border-red-700/50 rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-300 mb-2">⚠️ 통계 초기화</h3>
            <p className="text-sm text-slate-300 mb-2">모든 선박의 <b>양하/선적 작업 통계와 항차 기록</b>을 삭제합니다.</p>
            <p className="text-xs text-slate-400 mb-1">• 베이 구조(베이사전)는 <b className="text-emerald-300">보존</b>됩니다.</p>
            <p className="text-xs text-slate-400 mb-4">• 6월부터 새로 집계됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            {resetMsg ? (
              <div className="text-sm text-emerald-300 mb-3">{resetMsg}</div>
            ) : null}
            <div className="flex gap-2">
              <button onClick={() => { setShowResetConfirm(false); setResetMsg(''); }} className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">취소</button>
              <button
                onClick={async () => {
                  setResetMsg('초기화 중…');
                  try {
                    const n = await fbResetAllShipStats();
                    setResetMsg(`✅ ${n}척 통계 초기화 완료. 6월부터 다시 집계됩니다.`);
                    setTimeout(() => { setShowResetConfirm(false); setResetMsg(''); }, 2500);
                  } catch (e) { setResetMsg('❌ 실패: ' + (e.message || e)); }
                }}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm">초기화 실행</button>
            </div>
          </div>
        </div>
      )}

      {/* 검색 + 정렬 */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2"/>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="선박명 / IMO 검색"
            className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="frequency">📊 입항 빈도순</option>
          <option value="recent">🕐 최근 작업순</option>
          <option value="discharge">📥 양하 누적순</option>
          <option value="loading">📤 선적 누적순</option>
          <option value="name">🔤 이름순</option>
        </select>
      </div>

      {sortedShips.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">
          {search ? '검색 결과 없음' : '아직 학습된 선박 없음 (EDI 업로드 시 자동 저장)'}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedShips.map(([imo, ship], idx) => (
            <ShipLibraryRow
              key={imo}
              imo={imo}
              ship={ship}
              rank={sortBy === 'frequency' ? idx + 1 : null}
              activeVoyages={voyages}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShipLibraryRow({ imo, ship, rank, activeVoyages }) {
  const [expanded, setExpanded] = useState(false);
  const struct = ship.structure || {};
  const stats = ship.stats || {};
  const voys = ship.voyages || {};
  const voyageCount = Object.keys(voys).length;
  const pairCount = struct.pairs ? Object.keys(struct.pairs).length / 2 : 0;

  // M6.15: 베이사전 등록 상태 (정밀 등록 여부)
  const bayDictInfo = useMemo(() => {
    const code = (ship.name || '').toUpperCase().replace(/\s+/g, '').slice(0, 4);
    const dict = getShipBayDictData(imo, code) || getShipBayDictData(imo, ship.name);
    if (!dict) return { status: 'none', label: '미등록' };
    if (dict.verified) return { status: 'verified', label: '정밀 등록', source: dict.source };
    return { status: 'auto', label: '자동 추정', source: dict.source };
  }, [imo, ship.name]);

  // M6.15: 첫/최근 작업일 (voyages.analyzed_at 기준)
  const { firstAt, recentAt, voyageList } = useMemo(() => {
    const arr = Object.entries(voys).map(([key, v]) => ({
      voyageKey: key,
      voy: v.voy || '',
      voy_d: v.voy_d || '',
      voy_l: v.voy_l || '',
      vsl: v.vsl || ship.name || '',
      mode: v.mode || '',
      container_count: v.container_count || 0,
      ptk_count: v.ptk_count || 0,
      discharge_count: v.discharge_ptk || v.discharge_count || 0,   // V7.14 저장 필드(discharge_ptk) 우선
      loading_count: v.loading_ptk || v.loading_count || 0,
      completed: v.completed || false,
      completed_at: v.completed_at || 0,
      analyzed_at: v.analyzed_at || v.completed_at || 0,
      analyzed_by: v.analyzed_by || '',
      inspectors: v.inspectors || {},  // M6.15: 항차별 검수원 카운트
    })).sort((a, b) => b.analyzed_at - a.analyzed_at);
    return {
      firstAt: arr.length > 0 ? arr[arr.length - 1].analyzed_at : 0,
      recentAt: arr.length > 0 ? arr[0].analyzed_at : (stats.last_voyage_at || 0),
      voyageList: arr,
    };
  }, [voys, ship.name, stats.last_voyage_at]);

  // M6.15: 전체 검수원 집계 (모든 항차 합산)
  const allInspectors = useMemo(() => {
    const acc = {}; // name → { count, chief, modes }
    voyageList.forEach(v => {
      // 영구 저장된 inspectors (Phase 2 누적용)
      Object.values(v.inspectors || {}).forEach(ins => {
        const n = ins.name;
        if (!n) return;
        if (!acc[n]) acc[n] = { name: n, count: 0, modes: {}, isChief: isChief(n) };
        acc[n].count += ins.count || 0;
        Object.entries(ins.modes || {}).forEach(([m, c]) => {
          acc[n].modes[m] = (acc[n].modes[m] || 0) + c;
        });
      });
      // 분석한 사람 (EDI 업로더)도 포함
      if (v.analyzed_by) {
        const n = v.analyzed_by;
        if (!acc[n]) acc[n] = { name: n, count: 0, modes: {}, isChief: isChief(n), analyzed: 1 };
        else acc[n].analyzed = (acc[n].analyzed || 0) + 1;
      }
    });
    // M6.15: 활성 항차의 검수 완료(by 필드)에서 실시간 집계 — 영구 저장 아직 안 된 데이터 포함
    if (activeVoyages) {
      Object.entries(activeVoyages).forEach(([vKey, v]) => {
        if (!v?.info || String(v.info.imo) !== String(imo)) return;
        ['discharge', 'loading'].forEach(mode => {
          const completed = v?.[mode]?.completed || {};
          Object.values(completed).forEach(c => {
            const n = c?.by;
            if (!n) return;
            if (!acc[n]) acc[n] = { name: n, count: 0, modes: {}, isChief: isChief(n) };
            acc[n].count += 1;
            acc[n].modes[mode] = (acc[n].modes[mode] || 0) + 1;
          });
        });
      });
    }
    return Object.values(acc).sort((a, b) => b.count - a.count);
  }, [voyageList, activeVoyages, imo]);

  const chiefs = allInspectors.filter(i => i.isChief);
  const members = allInspectors.filter(i => !i.isChief);

  const fmtDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const fmtDateFull = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
      {/* 헤더: 순위 + 이름 + IMO + 베이사전 배지 */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {rank && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
            rank <= 3 ? 'bg-amber-600 text-white' :
            rank <= 10 ? 'bg-purple-700 text-purple-100' :
            'bg-slate-700 text-slate-300'
          }`}>
            #{rank}
          </span>
        )}
        <Ship className="w-3.5 h-3.5 text-purple-400 flex-shrink-0"/>
        <span className="font-bold text-sm text-purple-200">{ship.name || '(이름 없음)'}</span>
        <span className="text-[10px] text-slate-500 mono">IMO {imo}</span>
        {/* 베이사전 상태 배지 */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          bayDictInfo.status === 'verified' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40' :
          bayDictInfo.status === 'auto' ? 'bg-amber-900/40 text-amber-300 border border-amber-700/40' :
          'bg-red-900/30 text-red-300 border border-red-700/30'
        }`}>
          📚 {bayDictInfo.label}
        </span>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
        <div>입항 <span className="text-cyan-300 font-bold text-xs">{stats.total_voyages || voyageCount}</span>회</div>
        <div>양하 <span className="text-blue-300 font-bold text-xs">{stats.total_discharge || 0}</span></div>
        <div>선적 <span className="text-amber-300 font-bold text-xs">{stats.total_loading || 0}</span></div>
        <div>베이 <span className="text-slate-200 font-bold">{struct.bay_count || 0}</span>개</div>
        <div>짝꿍 <span className="text-emerald-300 font-bold">{pairCount}</span>쌍</div>
        <div>단독 <span className="text-amber-300 font-bold">{struct.singles?.length || 0}</span>개</div>
      </div>

      {/* 작업 일자 */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-800/60">
        <div><Calendar className="w-3 h-3 inline mr-1"/>첫 작업 <span className="text-slate-300 mono">{fmtDate(firstAt)}</span></div>
        <div><Clock className="w-3 h-3 inline mr-1"/>최근 작업 <span className="text-emerald-300 mono">{fmtDate(recentAt)}</span></div>
      </div>

      {/* 검수원 요약 (수석 + 검수원) */}
      {(chiefs.length > 0 || members.length > 0) && (
        <div className="mt-1 pt-1 border-t border-slate-800/60 text-[10px]">
          <div className="flex items-start gap-1 flex-wrap">
            <UserCheck className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5"/>
            {chiefs.length > 0 && (
              <span>
                <span className="text-cyan-400 font-bold">수석:</span>{' '}
                {chiefs.slice(0, 3).map(c => (
                  <span key={c.name} className="text-cyan-200 font-bold mr-1.5">
                    {c.name}({c.count || c.analyzed || 0})
                  </span>
                ))}
              </span>
            )}
            {members.length > 0 && (
              <span>
                <span className="text-slate-400">검수원:</span>{' '}
                {members.slice(0, 5).map(m => (
                  <span key={m.name} className="text-slate-300 mr-1.5">
                    {m.name}({m.count || 0})
                  </span>
                ))}
                {members.length > 5 && <span className="text-slate-500">외 {members.length - 5}명</span>}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 펼침: 항차 상세 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-1.5 text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
      >
        {expanded ? '▼' : '▶'} 항차 상세 {voyageList.length}건 / 짝꿍 {pairCount}쌍
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {/* 짝꿍 상세 */}
          {struct.pairs && Object.keys(struct.pairs).length > 0 && (
            <div className="bg-slate-900/60 rounded p-1.5 text-[10px] text-slate-400 mono">
              <div className="text-purple-400 font-bold mb-0.5">짝꿍 베이</div>
              {[...new Set(Object.entries(struct.pairs).map(([a, b]) => [a, b].sort().join('↔')))].join(', ')}
              {struct.singles?.length > 0 && (
                <div className="text-amber-400 mt-0.5">단독: {struct.singles.join(', ')}</div>
              )}
            </div>
          )}
          {/* 항차 리스트 */}
          {voyageList.length > 0 && (
            <div className="bg-slate-900/60 rounded p-1.5">
              <div className="text-[10px] text-purple-400 font-bold mb-1">항차별 작업 이력 (평택분)</div>
              <table className="w-full text-[10px] mono">
                <thead className="text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-1">작업일</th>
                    <th className="text-left px-1">항차</th>
                    <th className="text-right px-1">양하</th>
                    <th className="text-right px-1">선적</th>
                    <th className="text-left px-1">분석자</th>
                  </tr>
                </thead>
                <tbody>
                  {voyageList.slice(0, 20).map((v, i) => (
                    <tr key={i} className="border-b border-slate-800/40">
                      <td className="px-1 text-slate-300">{fmtDateFull(v.completed_at || v.analyzed_at)}</td>
                      <td className="px-1 text-purple-300">{v.voy_d || v.voy_l || v.voy || '-'}</td>
                      <td className="px-1 text-right text-blue-300 font-bold">{v.discharge_count || 0}</td>
                      <td className="px-1 text-right text-amber-300 font-bold">{v.loading_count || 0}</td>
                      <td className="px-1 text-cyan-300">{v.analyzed_by || '-'}</td>
                    </tr>
                  ))}
                  {voyageList.length > 20 && (
                    <tr><td colSpan="5" className="text-center text-slate-500 px-1 pt-1">… 외 {voyageList.length - 20}건</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 font-bold">
                    <td className="px-1 text-slate-200" colSpan="2">합계 {voyageList.length}항차</td>
                    <td className="px-1 text-right text-blue-300">{voyageList.reduce((s, v) => s + (v.discharge_count || 0), 0)}</td>
                    <td className="px-1 text-right text-amber-300">{voyageList.reduce((s, v) => s + (v.loading_count || 0), 0)}</td>
                    <td className="px-1"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, color }) {
  const map = {
    emerald: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
    red: 'border-red-700/40 bg-red-950/30 text-red-300',
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
  };
  return (
    <div className={`rounded-xl border p-3 ${map[color]}`}>
      <div className="text-[10px] uppercase font-bold opacity-70">{label}</div>
      <div className="text-3xl font-black mono mt-0.5">{value}</div>
      <div className="text-[11px] opacity-60 mono">{sub}</div>
    </div>
  );
}

function InspectorRow({ s }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-2 flex items-center gap-2">
      <div className="relative">
        <div className="w-9 h-9 bg-amber-600 rounded-full flex items-center justify-center text-amber-100 font-black">
          {s.name[0]}
        </div>
        {s.active && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-slate-200 truncate">{s.name}</div>
        <div className="text-[10px] text-slate-500 mono flex items-center gap-2 flex-wrap">
          <span><span className="text-emerald-400 font-bold">{s.today}</span> 오늘</span>
          <span>·</span>
          <span><span className="text-slate-300 font-bold">{s.total}</span> 누적</span>
          {s.lastAt > 0 && (
            <>
              <span>·</span>
              <span><Clock className="w-2.5 h-2.5 inline"/> {timeAgo(s.lastAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[10px] mono">
        {s.dis > 0 && <span className="bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded font-black">양 {s.dis}</span>}
        {s.loa > 0 && <span className="bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded font-black">선 {s.loa}</span>}
      </div>
    </div>
  );
}

function VoyageStatRow({ v, onOpen }) {
  const pct = v.totalAll > 0 ? Math.round((v.totalDone / v.totalAll) * 100) : 0;
  return (
    <button onClick={onOpen} className="w-full text-left bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 hover:bg-slate-800/70">
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-200 truncate">{v.info.vsl}</div>
          <div className="text-[10px] text-slate-500">
            {/* M6.45: voy_d / voy_l 다르면 둘 다 */}
            {(() => {
              const d = v.info.voy_d, l = v.info.voy_l, vv = v.info.voy;
              if (d && l && d !== l) return `${d} / ${l}`;
              return d || l || vv || '';
            })()}
            {' · '}{v.info.carrier || ''}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600"/>
      </div>
      <div className="space-y-1.5 text-[10px] mono">
        {v.dis.total > 0 && <MiniBar label="양하" color="blue" stats={v.dis}/>}
        {v.loa.total > 0 && <MiniBar label="선적" color="amber" stats={v.loa}/>}
      </div>
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-700/50 text-[10px]">
        <span className="text-slate-500">전체</span>
        <span className="text-emerald-300 font-black mono">{v.totalDone}</span>
        <span className="text-slate-500">/{v.totalAll}</span>
        <span className="text-slate-400">({pct}%)</span>
      </div>
    </button>
  );
}

function MiniBar({ label, color, stats }) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const map = {
    blue: { tag: 'bg-blue-900/60 text-blue-200', bar: 'bg-blue-500' },
    amber: { tag: 'bg-amber-900/60 text-amber-200', bar: 'bg-amber-500' },
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`${map[color].tag} px-1.5 rounded text-[9px] font-black w-9 text-center`}>{label}</span>
      <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div className={`${map[color].bar} h-full`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-slate-400 w-16 text-right">{stats.done}/{stats.total}</span>
      {stats.missing > 0 && <span className="text-red-400 w-12 text-right">누락 {stats.missing}</span>}
    </div>
  );
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec/60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec/3600)}시간 전`;
  return `${Math.floor(sec/86400)}일 전`;
}

function computeStats(section) {
  if (!section) return { total: 0, done: 0, ptk: 0, matched: 0, missing: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  ediValues.forEach(c => {
    const pol = (c.pol || '').toUpperCase();
    const pod = (c.pod || '').toUpperCase();
    if (pol.endsWith('PTK') || pod.endsWith('PTK')) ptkCns.add(c.cn);
  });
  const recordCns = new Set(Object.keys(records));
  const matched = [...ptkCns].filter(cn => recordCns.has(cn)).length;
  const missing = ptkCns.size - matched;
  const total = recordCns.size > 0 ? recordCns.size : ptkCns.size;
  const done = Object.keys(completed).length;
  return { total, done, ptk: ptkCns.size, matched, missing };
}
