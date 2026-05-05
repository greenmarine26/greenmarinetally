import React, { useMemo, useState, useEffect } from 'react';
import { Users, Anchor, ChevronRight, ArrowDown, ArrowUp, Clock, Library, Ship, AlertTriangle, CheckCircle2, Trash2, Lock, FileSpreadsheet, Truck, Send, Camera } from 'lucide-react';
import { fbSubscribeShipLibrary, fbSubscribeFeedback, fbResolveFeedback, fbDeleteFeedback, db, fbSubscribeAllReports, fbDeleteWorkReport, fbClearAllReports, fbClearAllReportsAllVoyages, fbClearAllActiveWork } from '../firebase.js';
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies } from '../shipPolicies.js';
import { generateEmptySealReport } from '../components/EmptySealReport.jsx';

export default function ChiefDashboard({ voyages, inspectors, onOpenVoyage, onGoHome }) {
  const [shipLib, setShipLib] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showResolved, setShowResolved] = useState(false);
  const [extraPolicies, setExtraPolicies] = useState({});
  const [allReports, setAllReports] = useState([]);  // M3.5.6: 작업 보고 이력
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
        <BigStat label="전체 검수 완료" value={total.done.toLocaleString()} sub={`/ ${total.all.toLocaleString()}대`} color="emerald"/>
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

      {/* 선박 라이브러리 (학습된 선박 구조) */}
      <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-3 mt-3">
        <div className="flex items-center gap-2 mb-3">
          <Library className="w-4 h-4 text-purple-400"/>
          <div className="text-sm font-bold text-slate-100">선박 라이브러리 ({Object.keys(shipLib).length}척)</div>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">EDI 분석된 선박은 자동 저장 → 다음 항차에서 즉시 활용</div>
        {Object.keys(shipLib).length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">아직 학습된 선박 없음 (EDI 업로드 시 자동 저장)</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(shipLib).sort((a,b) => (b[1].last_updated||0) - (a[1].last_updated||0)).map(([imo, ship]) => (
              <ShipLibraryRow key={imo} imo={imo} ship={ship}/>
            ))}
          </div>
        )}
      </div>

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
            <button onClick={async () => {
              if (!confirm('⚠️ 모든 항차의 작업 보고/사진을 삭제합니다.\n테스트 데이터 정리용입니다.\n계속하시겠습니까?')) return;
              if (!confirm('정말로 모두 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
              try {
                await fbClearAllReportsAllVoyages();
                await fbClearAllActiveWork();
                alert('✅ 모든 작업 보고가 삭제되었습니다');
              } catch (e) { alert('삭제 실패: ' + e.message); }
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
                      <button onClick={async () => {
                        if (!confirm('이 보고를 삭제하시겠습니까?')) return;
                        try {
                          await fbDeleteWorkReport(r.voyageKey, r.ts);
                        } catch (e) { alert('삭제 실패: ' + e.message); }
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
          <button onClick={() => { if (confirm('삭제?')) fbDeleteFeedback(f.ts); }}
            title="삭제"
            className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/40">
            <Trash2 className="w-2.5 h-2.5"/>
          </button>
        </div>
      </div>
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

function ShipLibraryRow({ imo, ship }) {
  const struct = ship.structure || {};
  const stats = ship.stats || {};
  const voyageCount = ship.voyages ? Object.keys(ship.voyages).length : 0;
  const pairCount = struct.pairs ? Object.keys(struct.pairs).length / 2 : 0;
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Ship className="w-3.5 h-3.5 text-purple-400"/>
        <span className="font-bold text-sm text-purple-200">{ship.name || '(이름 없음)'}</span>
        <span className="text-[10px] text-slate-500 mono">IMO {imo}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
        <div>베이 <span className="text-slate-200 font-bold">{struct.bay_count || 0}</span>개</div>
        <div>짝꿍 <span className="text-emerald-300 font-bold">{pairCount}</span>쌍</div>
        <div>단독 <span className="text-amber-300 font-bold">{struct.singles?.length || 0}</span>개</div>
        <div>분석 항차 <span className="text-slate-200 font-bold">{voyageCount}</span></div>
        <div>양하 누적 <span className="text-blue-300 font-bold">{stats.total_discharge || 0}</span></div>
        <div>선적 누적 <span className="text-amber-300 font-bold">{stats.total_loading || 0}</span></div>
      </div>
      {struct.pairs && Object.keys(struct.pairs).length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] text-purple-400 cursor-pointer">짝꿍 베이 상세</summary>
          <div className="mt-1 text-[10px] text-slate-400 mono space-y-0.5">
            {[...new Set(Object.entries(struct.pairs).map(([a,b]) => [a,b].sort().join('↔')))].map(p => (
              <div key={p}>{p}</div>
            ))}
            {struct.singles?.length > 0 && (
              <div className="text-amber-400 mt-1">단독: {struct.singles.join(', ')}</div>
            )}
          </div>
        </details>
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
          <div className="text-[10px] text-slate-500">{v.info.voy} · {v.info.carrier || ''}</div>
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
