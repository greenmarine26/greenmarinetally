import React, { useMemo, useState, useEffect } from 'react';
import { Users, Anchor, ChevronRight, Clock, Library, Ship, AlertTriangle, CheckCircle2, Trash2, Lock, FileSpreadsheet, Truck, Send } from 'lucide-react';
import { fbSubscribeShipLibrary, fbSubscribeFeedback, fbResolveFeedback, fbDeleteFeedback, fbClearFeedback, db, fbSubscribeAllReports, fbDeleteWorkReport, fbClearAllReports, fbClearAllReportsAllVoyages, fbClearAllActiveWork, tallyVoyagesByShip, fbArchiveVoyageBeforeDelete, fbDeleteVoyage } from '../firebase.js';
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies } from '../shipPolicies.js';
import { isPyeongtaekPort } from '../utils.js';
import { buildLoloRows, buildActualSealListText, buildLoadingListText, downloadText } from '../loloReport.js';
import { isChief } from '../staffList.js';
import { generateEmptySealReport } from '../components/EmptySealReport.jsx';
import ConfirmModal, { useConfirm } from '../components/ConfirmModal.jsx';
import ChiefBayEdit from '../components/ChiefBayEdit.jsx';

export default function ChiefDashboard({ voyages, inspectors, inspector, onOpenVoyage, onGoHome }) {
  const chief = isChief(inspector);  // V7.94-18: 완료 권한 — 수석검수/부수석만
  const [editKey, setEditKey] = useState(null); // V7.97: 베이상세 편집 대상 항차 (수석/관리자만)
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
      // M8.08: 엠티 실 작업은 선적(loading) 때만 적용. 양하는 제외.
      //   (양하 EDI엔 엠티 실 부착·확인 개념이 없음 — 선적 시 부착/확인하는 작업.)
      ['loading'].forEach(mode => {
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const targets = [];
        Object.values(ediMap).forEach(c => {
          // 평택만 (mode에 맞춰)
          const isPtk = mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
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

  // V8.06: LOLO 항차 감지 — 컨테이너에 베이 위치가 하나도 없으면 LOLO/IFCSUM 선박.
  //   각 모드(양하/선적)별로 처리된(completed) 건이 있으면 제출 리스트 내보내기 대상.
  const loloVoyages = useMemo(() => {
    const list = [];
    Object.entries(voyages || {}).forEach(([key, v]) => {
      ['discharge', 'loading'].forEach(mode => {
        const sec = v[mode];
        if (!sec) return;
        const ediMap = sec.ediContainers || {};
        const recMap = sec.records || {};
        const ediArr = Object.values(ediMap);
        const recArr = Object.values(recMap);
        // V8.09: EDI 없이 리스트(records)만 있어도 LOLO 카드 생성.
        //   RIZHAO 선적분처럼 IFCSUM/BAPLIE 없이 LOADING LIST 엑셀만 들어오는 경우,
        //   EDI 유무로만 판정하면 선적 카드가 안 떠 "선적이 어디 있나" 문제 발생.
        //   기준: EDI∪리스트에 컨테이너가 있고, 위치좌표(bay/row/tier)가 하나도 없으면 LOLO.
        //   일반 베이 선박은 EDI/리스트에 bay가 있어 isLolo=false → 영향 없음.
        const allArr = [...ediArr, ...recArr];
        if (allArr.length === 0) return;
        const isLolo = allArr.every(c => !c.bay && !c.row && !c.tier);
        if (!isLolo) return;
        const compMap = sec.completed || {};
        const doneCount = Object.keys(compMap).length;
        // M8.08: 컨테이너별 처리 상태 목록 — 실시간 표용. 리스트(세관) 기준 EDI∪records 합집합.
        const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
        const rows = [...allCnSet].map(cn => {
          const e = ediMap[cn] || {}, r = recMap[cn] || {};
          const comp = compMap[cn] || null;
          return {
            cn,
            iso: r.iso || e.iso || '',
            fe: r.fe || e.fe || '',
            sl: r.sl || e.sl || '',
            done: !!comp,
            by: comp?.by || comp?.inspector || '',
            at: comp?.at || comp?.ts || 0,
          };
        });
        // 처리된 것 먼저(최근순), 미처리는 컨번호순.
        rows.sort((a, b) => {
          if (a.done && b.done) return (b.at || 0) - (a.at || 0);
          if (a.done) return -1;
          if (b.done) return 1;
          return a.cn.localeCompare(b.cn);
        });
        list.push({
          voyageKey: key,
          voyage: v,
          mode,
          vsl: v?.info?.vsl || '',
          voy: v?.info?.voy || v?.info?.voyage || '',
          total: allCnSet.size,        // 리스트(세관) 기준 전체.
          done: doneCount,
          rows,
          sec,
        });
      });
    });
    return list;
  }, [voyages]);

  // LOLO 제출 리스트 내보내기 (두 양식)
  const exportLolo = (item, kind) => {
    const rows = buildLoloRows(item.sec);
    if (rows.length === 0) { alert('처리(완료)된 컨테이너가 없습니다. 검수사가 실체크·확인한 뒤 내보낼 수 있습니다.'); return; }
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const meta = { vsl: item.vsl, voy: item.voy, date: stamp, port: 'PYEONGTAEK, KOREA', mode: item.mode };
    const modeKo = item.mode === 'discharge' ? '양하' : '선적';
    if (kind === 'seal') {
      downloadText(`LOLO_실번호리스트_${item.vsl}_${modeKo}_${stamp}.txt`, buildActualSealListText(meta, rows));
    } else {
      downloadText(`LOLO_검수리스트_${item.vsl}_${modeKo}_${stamp}.txt`, buildLoadingListText(meta, rows));
    }
  };

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

  // V8.02-02: 오답 '저금통' 내보내기 — 전체를 텍스트 파일로 다운로드.
  //   클로드(또는 개발자)에게 파일 하나로 전달하기 위함. 내보낸 시점의 ts 목록을 기억.
  const [exportedTs, setExportedTs] = useState([]);
  const exportFeedback = () => {
    const all = Object.values(feedback || {}).filter(f => f && f.ts).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (all.length === 0) { alert('내보낼 오답 리포트가 없습니다.'); return; }
    const lines = [];
    lines.push('# Tallyman 음성/질문 오답 리포트');
    lines.push(`# 내보낸 시각: ${new Date().toLocaleString('ko-KR')}`);
    lines.push(`# 총 ${all.length}건 (미해결 ${all.filter(f => !f.resolved).length}건)`);
    lines.push('');
    all.forEach((f, i) => {
      const d = new Date(f.ts);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      lines.push(`[${i + 1}] ${ds} · ${f.inspector || '익명'} · ${f.resolved ? '해결됨' : '미해결'} · v${f.appVersion || '?'}`);
      lines.push(`  선박: ${f.voyageVsl || '-'}`);
      lines.push(`  질문(Q): ${f.query || ''}`);
      lines.push(`  답변종류: ${f.answerType || '?'}`);
      if (f.answerText) lines.push(`  앱이 한 답: ${f.answerText}`);
      if (f.userNote) lines.push(`  검수사 메모: ${f.userNote}`);
      if (f.parsedSummary && Object.keys(f.parsedSummary).length) {
        lines.push(`  파싱: ${JSON.stringify(f.parsedSummary)}`);
      }
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `오답리포트_${stamp}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedTs(all.map(f => f.ts));   // 비우기 대상 = 방금 내보낸 것
  };
  // 내보낸 것만 비우기(안 본 것 보호). 내보내기 후에만 활성.
  const clearExported = async () => {
    if (exportedTs.length === 0) { alert('먼저 내보내기를 하세요. 내보낸 건만 비웁니다.'); return; }
    const n = await fbClearFeedback(exportedTs);
    setExportedTs([]);
    alert(`저금통 비움: ${n}건 삭제. 새 오답은 다시 쌓입니다.`);
  };

  // 항차별 통계
  const voyageStats = useMemo(() => {
    return Object.entries(voyages || {})
      .filter(([k, v]) => v && v.info)
      .map(([k, v]) => {
        const dis = computeStats(v.discharge, 'discharge');
        const loa = computeStats(v.loading, 'loading');
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

  // V7.40: 실시간 보드용 — 항차별 작업 중 검수원 (90초 이내 활동, HomePage activeInspectors와 동일 기준)
  // V7.99-8 (메모6): 작업 위치(호기·베이·홀드/데크·잔여)도 포함 — 수석이 어디 작업 중인지 본다.
  const activeByVoyage = useMemo(() => {
    const out = {};
    Object.values(inspectors || {}).forEach(i => {
      if (!i?.name || !i.lastVoyage || !i.lastActive) return;
      if (Date.now() - i.lastActive > 90000) return;
      if (!out[i.lastVoyage]) out[i.lastVoyage] = [];
      out[i.lastVoyage].push({
        name: i.name, mode: i.lastMode,
        equip: i.workEquip || null, bay: i.workBay || null,
        tier: i.workTier || null, remain: i.workRemain ?? null,
      });
    });
    return out;
  }, [inspectors]);

  // V7.40: 항차별 마지막 작업 보고 1건
  const lastReportByVoyage = useMemo(() => {
    const out = {};
    (allReports || []).forEach(r => {
      if (!r.voyageKey) return;
      if (!out[r.voyageKey] || (r.ts || 0) > (out[r.voyageKey].ts || 0)) out[r.voyageKey] = r;
    });
    return out;
  }, [allReports]);

  // V7.40: 항차별 오늘 경고(데미지·실오류) 건수
  const todayAlertsByVoyage = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t0 = today.getTime();
    const out = {};
    (allReports || []).forEach(r => {
      if (!r.voyageKey || !r.ts || r.ts < t0) return;
      if (r.type !== 'damage' && r.type !== 'seal_error') return;
      if (!out[r.voyageKey]) out[r.voyageKey] = { damage: 0, sealError: 0 };
      if (r.type === 'damage') out[r.voyageKey].damage++;
      else out[r.voyageKey].sealError++;
    });
    return out;
  }, [allReports]);

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

      {/* V7.40: ⚓ 실시간 작업 보드 — 동시 작업 선박을 카드로 한눈에 (기존 "항차별 진행" 대체) */}
      <div className="bg-slate-900 border border-blue-800/60 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Anchor className="w-4 h-4 text-blue-400"/>
          <div className="text-sm font-bold text-slate-100">실시간 작업 보드 ({voyageStats.length}척)</div>
          <span className="text-[10px] text-slate-500">실시간</span>
        </div>
        {voyageStats.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">진행 중 항차 없음</div>
        ) : (
          <div className={`grid gap-2 grid-cols-1 ${voyageStats.length >= 2 ? 'sm:grid-cols-2' : ''} ${voyageStats.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
            {voyageStats.map(v => (
              <LiveShipCard key={v.key} v={v}
                workers={activeByVoyage[v.key] || []}
                lastReport={lastReportByVoyage[v.key]}
                alerts={todayAlertsByVoyage[v.key]}
                onOpen={() => onOpenVoyage(v.key)}/>
            ))}
          </div>
        )}
      </div>

      {/* M7.22: 라이브러리(진행 상황) + 선박별 자료 보관소(완료 기록) 분리 */}
      {chief && voyageStats.length > 0 && (
        <div className="bg-slate-900 border border-emerald-800/50 rounded-xl p-3">
          <div className="text-sm font-bold text-emerald-200 mb-2">🖐 베이상세 편집 <span className="text-[11px] text-slate-400 font-normal">— 오선적 정정 (수석 전용 · [저장]해야 검수사 화면 반영)</span></div>
          <div className="flex flex-wrap gap-2">
            {voyageStats.map(v => (
              <button key={v.key} onClick={() => setEditKey(v.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-600">
                {v.info?.vsl || v.key}
              </button>
            ))}
          </div>
        </div>
      )}
      {editKey && voyages[editKey] && (
        <ChiefBayEdit voyage={voyages[editKey]} voyageKey={editKey} inspector={inspector} activeWorkers={activeByVoyage[editKey] || []} onClose={() => setEditKey(null)} />
      )}
      <LiveProgressSection voyages={voyages} onOpenVoyage={onOpenVoyage} chief={chief} inspector={inspector} />
      <ShipArchiveSection shipLib={shipLib} />

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

      {/* V8.06: LOLO 검수 제출 리스트 (RIZHAO 등 RORO/LOLO 혼용선) */}
      {loloVoyages.length > 0 && (
        <div className="bg-slate-900 border border-cyan-800/40 rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-cyan-400"/>
            <div className="text-sm font-bold text-slate-100">LOLO 검수 제출 리스트</div>
            <span className="text-[10px] text-cyan-300/70">베이 없는 LOLO 선박 · 처리분만 내보냄</span>
          </div>
          <div className="space-y-2">
            {loloVoyages.map((item, idx) => (
              <LoloVoyageCard key={`${item.voyageKey}-${item.mode}`}
                item={item}
                onOpenVoyage={onOpenVoyage}
                onExport={exportLolo}
              />
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
          <div className="flex items-center gap-1.5">
            <button onClick={exportFeedback}
              title="오답 전체를 텍스트 파일로 내려받기 (클로드에게 전달용)"
              className="text-[10px] text-sky-300 hover:text-sky-100 px-2 py-0.5 rounded border border-sky-700/50 bg-sky-900/30">
              📥 내보내기
            </button>
            <button onClick={clearExported}
              title="방금 내보낸 오답만 비우기 (안 본 것은 보호)"
              disabled={exportedTs.length === 0}
              className={`text-[10px] px-2 py-0.5 rounded border ${exportedTs.length === 0
                ? 'text-slate-600 border-slate-800 cursor-not-allowed'
                : 'text-amber-300 hover:text-amber-100 border-amber-700/50 bg-amber-900/30'}`}>
              🧹 비우기
            </button>
            <button onClick={() => setShowResolved(v => !v)}
              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700">
              {showResolved ? '미해결만' : '해결된 것도'}
            </button>
          </div>
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

// M8.08: LOLO 검수 항차 카드 (실시간 표). 양하/선적 모두, 처리 현황을 컨테이너별로 표시.
//   ATRP 엠티 실 현황과 동일 형태 — 처리된 건 검수자·시각 표시, 미처리는 흐리게.
function LoloVoyageCard({ item, onOpenVoyage, onExport }) {
  const modeKo = item.mode === 'discharge' ? '양하' : '선적';
  return (
    <div className="border-2 border-cyan-700/50 bg-cyan-950/15 rounded-lg p-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">
            🔍 {item.vsl || '(선박명 없음)'} <span className="text-slate-400">{item.voy}</span>
          </div>
          <div className="text-[10px] text-slate-500">{modeKo} 검수 · LOLO(베이 없음)</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${item.done === item.total ? 'text-emerald-400' : 'text-amber-400'}`}>
            {item.done} / {item.total}
          </div>
          <div className="text-[10px] text-slate-500">{item.total - item.done}대 남음</div>
        </div>
      </div>

      {/* 실시간 표 (최대 50줄) */}
      <div className="bg-slate-950 rounded border border-slate-700 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-1.5 py-1 text-left w-8">No</th>
              <th className="px-1.5 py-1 text-left">컨번호</th>
              <th className="px-1.5 py-1 text-left w-14">규격</th>
              <th className="px-1.5 py-1 text-left w-10">F/E</th>
              <th className="px-1.5 py-1 text-left w-24">실번호</th>
              <th className="px-1.5 py-1 text-left w-14">검수자</th>
              <th className="px-1.5 py-1 text-left w-12">시각</th>
            </tr>
          </thead>
          <tbody>
            {item.rows.slice(0, 50).map((c, i) => (
              <tr key={i} className={`border-t border-slate-800 ${c.done ? '' : 'opacity-50'}`}>
                <td className="px-1.5 py-1 text-slate-500 mono">{i + 1}</td>
                <td className="px-1.5 py-1 mono text-slate-200">{c.cn}</td>
                <td className="px-1.5 py-1 mono text-slate-400">{c.iso}</td>
                <td className="px-1.5 py-1 mono">
                  {c.fe === 'E'
                    ? <span className="text-amber-300 font-bold">E</span>
                    : <span className="text-rose-300">F</span>}
                </td>
                <td className="px-1.5 py-1 mono text-slate-300 text-[10px] break-all">
                  {c.sl || <span className="text-slate-600">-</span>}
                </td>
                <td className="px-1.5 py-1 text-slate-400 text-[10px]">
                  {c.done ? (c.by || '✓') : <span className="text-slate-600">⏳ 대기</span>}
                </td>
                <td className="px-1.5 py-1 text-slate-500 text-[10px] mono">
                  {c.at ? new Date(c.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {item.rows.length > 50 && (
          <div className="text-[10px] text-slate-500 text-center py-1 border-t border-slate-800">
            ... 외 {item.rows.length - 50}대 (엑셀 다운로드로 전체 확인)
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button onClick={() => onOpenVoyage?.(item.voyageKey)}
          className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold">
          항차 열기
        </button>
        <button onClick={() => onExport(item, 'seal')}
          title="실번호 변경·리씰·실오류 건만 (ACTUAL SEAL LIST 형식)"
          className="py-2 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-200 rounded text-xs font-bold flex items-center justify-center gap-1">
          <Send className="w-3 h-3"/>실번호
        </button>
        <button onClick={() => onExport(item, 'loading')}
          title="처리분 전체 (LOADING LIST 형식)"
          className="py-2 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-200 rounded text-xs font-bold flex items-center justify-center gap-1">
          <FileSpreadsheet className="w-3 h-3"/>검수리스트
        </button>
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
              <th className="px-1.5 py-1 text-left w-14">규격</th>
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
                  <td className="px-1.5 py-1 mono text-slate-400">{c.iso || '-'}</td>
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

// ─────────────────────────────────────────────────────────────
// M7.22: 선박 라이브러리 (진행 상황) — 현재 살아있는 voyages 기준.
//   수석검수사가 최종 확인 후 [완료 저장] → archive 백업 + 보관소 기록 + voyages 삭제.
//   양하/선적 수는 평택분(tallyVoyagesByShip이 _ptkCountOfSection로 집계).
// ─────────────────────────────────────────────────────────────
function LiveProgressSection({ voyages, onOpenVoyage, chief, inspector }) {
  const [busyKey, setBusyKey] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);

  // 항차별 진행 행 (선박별 합계가 아니라 항차 단위 — 완료는 항차별로 누름)
  const rows = useMemo(() => {
    const out = [];
    for (const [key, v] of Object.entries(voyages || {})) {
      const info = v.info || {};
      const vsl = info.vsl || key.split('_')[0] || '(선박명 미상)';
      const dPtk = countPtkSection(v.discharge, 'discharge');
      const lPtk = countPtkSection(v.loading, 'loading');
      out.push({
        key, vsl,
        voyD: info.voy_d || '', voyL: info.voy_l || '',
        discharge: dPtk, loading: lPtk,
        imo: info.imo || '',
        createdAt: info.createdAt || 0,
        // V7.90: 완료 분리 — 보유 모드가 전부 완료되면 수석 최종 저장 가능 (구 inspectorDone 하위호환)
        inspectorDone: !!info.inspectorDone
          || ((dPtk === 0 && lPtk === 0) ? false
              : (dPtk === 0 || !!info.dischargeDone) && (lPtk === 0 || !!info.loadingDone)),
        inspectorDoneAt: info.inspectorDoneAt || Math.max(info.dischargeDoneAt || 0, info.loadingDoneAt || 0),
        dDone: !!(info.inspectorDone || info.dischargeDone), dDoneAt: info.dischargeDoneAt || 0,
        lDone: !!(info.inspectorDone || info.loadingDone), lDoneAt: info.loadingDoneAt || 0,
      });
    }
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [voyages]);

  const doComplete = async (row) => {
    if (!chief) {   // V7.94-18: 수석검수/부수석만 완료 저장 가능
      alert('⚠️ 완료 저장 권한이 없습니다.\n\n항차 완료 저장은 수석검수사만 할 수 있습니다.\n(현재 로그인: ' + (inspector || '미상') + ')\n\n수석검수사에게 완료 저장을 요청하세요.');
      setConfirmKey(null);
      return;
    }
    setBusyKey(row.key);
    try {
      const ok = await fbArchiveVoyageBeforeDelete(row.imo, row.key, voyages[row.key]);
      if (!ok) {
        alert('완료 저장 실패: 백업이 저장되지 않아 삭제하지 않았습니다. 네트워크 확인 후 다시 시도하세요.');
        setBusyKey(null); setConfirmKey(null);
        return;
      }
      await fbDeleteVoyage(row.key);
    } catch (e) {
      console.error('[수석 완료] 실패:', row.key, e);
      alert('완료 저장 중 오류가 발생해 삭제하지 않았습니다.');
    }
    setBusyKey(null); setConfirmKey(null);
  };

  return (
    <div className="bg-slate-900 border border-cyan-800/40 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Ship className="w-4 h-4 text-cyan-400" />
        <div className="text-sm font-bold text-slate-100 flex-1">
          진행 상황 ({rows.length}척 작업 중)
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-6">현재 작업 중인 항차가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenVoyage && onOpenVoyage(r.key)}
                  className="font-bold text-slate-100 text-sm flex-1 text-left hover:text-cyan-300 truncate"
                  title="항차 열기"
                >
                  🚢 {r.vsl}
                </button>
                {confirmKey === r.key ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-amber-300 mr-1">최종 저장?</span>
                    <button
                      onClick={() => doComplete(r)}
                      disabled={busyKey === r.key}
                      className="text-[11px] px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                    >{busyKey === r.key ? '저장 중…' : '예'}</button>
                    <button
                      onClick={() => setConfirmKey(null)}
                      className="text-[11px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                    >취소</button>
                  </div>
                ) : r.inspectorDone ? (
                  chief ? (
                    <button
                      onClick={() => setConfirmKey(r.key)}
                      className="text-[11px] px-2 py-1 rounded bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-700/50 font-bold"
                      title="검수사 완료 확인됨 — 수석 최종 저장 (보관소로 이동)"
                    >✓ 수석 완료 저장</button>
                  ) : (
                    <button
                      onClick={() => alert('⚠️ 완료 저장 권한이 없습니다.\n\n항차 완료 저장은 수석검수사만 할 수 있습니다.\n(현재 로그인: ' + (inspector || '미상') + ')\n\n수석검수사에게 완료 저장을 요청하세요.')}
                      className="text-[11px] px-2 py-1 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40 font-bold"
                      title="수석검수사만 완료 저장할 수 있습니다"
                    >🔒 수석 전용</button>
                  )
                ) : (
                  <span
                    className="text-[10px] px-2 py-1 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40"
                    title="검수사가 항차 화면에서 '검수 완료'를 눌러야 수석이 최종 저장할 수 있습니다"
                  >검수 진행 중</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-sky-300">양하 <b className="text-sky-200">{r.discharge}</b>{r.discharge > 0 && r.dDone && <b className="text-emerald-400"> ✓{r.dDoneAt ? new Date(r.dDoneAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</b>}</span>
                <span className="text-emerald-300">선적 <b className="text-emerald-200">{r.loading}</b>{r.loading > 0 && r.lDone && <b className="text-emerald-400"> ✓{r.lDoneAt ? new Date(r.lDoneAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</b>}</span>
                {r.inspectorDone && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-bold">검수 완료 · 수석 확인 대기</span>
                )}
                {(r.voyD || r.voyL) && (
                  <span className="text-slate-500 text-[10px]">
                    {r.voyD && `양하 ${r.voyD}`}{r.voyD && r.voyL && ' · '}{r.voyL && `선적 ${r.voyL}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-slate-500 mt-2">평택분 기준 · 수석검수사 최종 확인 후 완료 저장 → 자료 보관소로 이동</div>
    </div>
  );
}

// 한 섹션(discharge/loading)의 평택분 컨테이너 수 — UI용 (firebase _ptkCountOfSection과 동일 기준)
function countPtkSection(section, mode) {
  // V7.40: 평택분 판정 모드별 정확화 (지침 7.1·8.3 — 양하=POD평택, 선적=POL평택).
  if (!section || !section.ediContainers) return 0;
  const set = new Set();
  for (const c of Object.values(section.ediContainers)) {
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(c.pod)
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(c.pod));
    if (isPtk) set.add(c.cn || JSON.stringify(c));
  }
  return set.size;
}

// ─────────────────────────────────────────────────────────────
// M7.22: 선박별 자료 보관소 (완료 기록) — ships 노드 기준, 최근 완료순.
//   선박별 항차 줄(항차·양하·선적·일자) + 누적(항차 수·양하·선적).
// ─────────────────────────────────────────────────────────────
function ShipArchiveSection({ shipLib }) {
  const [search, setSearch] = useState('');

  const ships = useMemo(() => {
    const out = [];
    for (const [imo, s] of Object.entries(shipLib || {})) {
      const voys = s?.voyages || {};
      const voyRows = Object.entries(voys).map(([vk, v]) => ({
        key: vk,
        voy: v?.voy_d || v?.voy_l || v?.voy || vk.split('_').slice(1).join('_') || vk,
        discharge: v?.discharge_ptk || 0,
        loading: v?.loading_ptk || 0,
        at: v?.completed_at || v?.analyzed_at || 0,
        vsl: v?.vsl || '',
        vslFull: v?.vslFull || '',
      })).filter(r => r.discharge > 0 || r.loading > 0);
      if (voyRows.length === 0) continue;   // 완료 항차 없는 배(구조만)는 보관소에 안 보임
      voyRows.sort((a, b) => (b.at || 0) - (a.at || 0));
      const totalD = voyRows.reduce((s, r) => s + r.discharge, 0);
      const totalL = voyRows.reduce((s, r) => s + r.loading, 0);
      const lastAt = voyRows[0]?.at || 0;
      // 선박명 결정 (M7.24c): 사용자 입력 약자(vsl, 예 PCBJ/TNJP) 최우선 — 검수사가
      //   약자만 봐도 선박을 식별함. 약자 없으면 ships.name → vslFull(풀네임) → 키 순.
      const pick = (arr) => arr.find(v => v && String(v).trim()) || '';
      let shipName = pick(voyRows.map(r => r.vsl));        // 약자 우선
      if (!shipName) shipName = s?.name && !/^[0-9]{7}$/.test(s.name) ? s.name : '';
      if (!shipName) shipName = pick(voyRows.map(r => r.vslFull));
      if (!shipName) shipName = s?.name || imo;
      out.push({ imo, name: shipName, voyRows, totalD, totalL, lastAt });
    }
    return out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));   // 최근 완료순
  }, [shipLib]);

  const q = search.trim().toLowerCase();
  const filtered = !q ? ships : ships.filter(s =>
    String(s.name).toLowerCase().includes(q) || String(s.imo).toLowerCase().includes(q));

  const fmtDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Library className="w-4 h-4 text-purple-400" />
        <div className="text-sm font-bold text-slate-100 flex-1">
          선박별 자료 보관소 ({ships.length}척)
        </div>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="선박명 / IMO 검색"
        className="w-full mb-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder-slate-500"
      />
      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-6">완료 저장된 항차가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.imo} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-100 text-sm flex-1 truncate">⚓ {s.name}</span>
                <span className="text-[10px] text-slate-500">{/^[0-9]{7}$/.test(s.imo) ? `IMO ${s.imo}` : s.imo}</span>
              </div>
              <div className="space-y-0.5">
                {s.voyRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2 text-xs px-1 py-0.5 border-b border-slate-700/30 last:border-0">
                    <span className="text-amber-300 font-bold w-16 truncate">{r.voy}</span>
                    <span className="text-sky-300">양하 <b className="text-sky-200">{r.discharge}</b></span>
                    <span className="text-emerald-300">선적 <b className="text-emerald-200">{r.loading}</b></span>
                    <span className="text-slate-500 text-[10px] ml-auto">{fmtDate(r.at)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1 pt-1 border-t border-slate-600/40 text-xs">
                <span className="text-slate-400">누적 <b className="text-slate-200">{s.voyRows.length}</b>항차</span>
                <span className="text-sky-400">양하 누적 <b className="text-sky-300">{s.totalD}</b></span>
                <span className="text-emerald-400">선적 누적 <b className="text-emerald-300">{s.totalL}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-slate-500 mt-2">평택분 기준 · 최근 완료순 · 완료 저장 시 자동 기록</div>
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

// V7.40: 실시간 작업 보드 카드 — 한 선박의 진행·작업자·최근 보고·경고를 한눈에
function LiveShipCard({ v, workers, lastReport, alerts, onOpen }) {
  const pct = v.totalAll > 0 ? Math.round((v.totalDone / v.totalAll) * 100) : 0;
  const repIcon = lastReport ? (
    lastReport.type === 'work_status' ? '📤' : lastReport.type === 'hatch' ? '🔓' :
    lastReport.type === 'conbox' ? '📦' : lastReport.type === 'damage' ? '⚠️' :
    lastReport.type === 'seal_error' ? '🚨' : '📋') : null;
  return (
    <button onClick={onOpen} className="w-full text-left bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 hover:bg-slate-800/70 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-200 truncate flex items-center gap-1.5">
            {v.info.vsl}
            {workers.length > 0 && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"/>}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {(() => {
              const d = v.info.voy_d, l = v.info.voy_l, vv = v.info.voy;
              if (d && l && d !== l) return `${d} / ${l}`;
              return d || l || vv || '';
            })()}
            {v.info.carrier ? ` · ${v.info.carrier}` : ''}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0"/>
      </div>
      <div className="space-y-1.5 text-[10px] mono">
        {v.dis.total > 0 && <MiniBar label="양하" color="blue" stats={v.dis}/>}
        {v.loa.total > 0 && <MiniBar label="선적" color="amber" stats={v.loa}/>}
      </div>
      {/* 작업 중 검수원 */}
      <div className="flex items-center gap-1 flex-wrap min-h-[18px]">
        {workers.length > 0 ? workers.map(w => (
          <span key={w.name} className="inline-flex items-center gap-1 bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>
            {w.name}{w.mode === 'discharge' ? ' (양하)' : w.mode === 'loading' ? ' (선적)' : ''}
          </span>
        )) : (
          <span className="text-[10px] text-slate-600">작업 중 검수원 없음</span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1.5 border-t border-slate-700/50 text-[10px] flex-wrap">
        <span className="text-emerald-300 font-black mono">{v.totalDone}</span>
        <span className="text-slate-500">/{v.totalAll} ({pct}%)</span>
        <div className="flex-1"/>
        {alerts?.damage > 0 && <span className="bg-amber-900/60 text-amber-200 px-1.5 rounded font-bold">⚠️ {alerts.damage}</span>}
        {alerts?.sealError > 0 && <span className="bg-red-900/60 text-red-200 px-1.5 rounded font-bold">🚨 {alerts.sealError}</span>}
        {lastReport && (
          <span className="text-slate-500 mono">{repIcon} {lastReport.equip || ''} {timeAgo(lastReport.ts)}</span>
        )}
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

function computeStats(section, mode) {
  // V7.40: 평택분 판정을 모드별로 정확히 (지침 7.1 — 양하=POD평택, 선적=POL평택).
  //   이전: POL∨POD 평택이면 카운트 → 양하 EDI에서 평택발 타항행 컨까지 평택분으로 잡혀 과대 집계.
  if (!section) return { total: 0, done: 0, ptk: 0, matched: 0, missing: 0 };
  const ediContainers = section.ediContainers || {};
  const records = section.records || {};
  const completed = section.completed || {};
  const ediValues = Object.values(ediContainers);
  const ptkCns = new Set();
  ediValues.forEach(c => {
    const isPtk = mode === 'discharge' ? isPyeongtaekPort(c.pod)
      : mode === 'loading' ? isPyeongtaekPort(c.pol)
      : (isPyeongtaekPort(c.pol) || isPyeongtaekPort(c.pod));
    if (isPtk) ptkCns.add(c.cn);
  });
  const recordCns = new Set(Object.keys(records));
  const matched = [...ptkCns].filter(cn => recordCns.has(cn)).length;
  const missing = ptkCns.size - matched;
  const total = recordCns.size > 0 ? recordCns.size : ptkCns.size;
  const done = Object.keys(completed).length;
  return { total, done, ptk: ptkCns.size, matched, missing };
}
