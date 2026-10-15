/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, Project, CEOAction } from "../types";
import { formatVND } from "../data";
import {
  DollarSign,
  Briefcase,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
  Bot,
  CircleDot,
  FileCheck,
  Clock,
  User,
  TrendingUp,
  ArrowUpRight,
  AlertCircle
} from "lucide-react";
import { translations } from "../translations";

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'Chưa bắt đầu': return 'text-neutral-400';
    case 'Đang làm': return 'text-blue-400';
    case 'Chờ feedback': return 'text-amber-400';
    case 'Cần revise': return 'text-rose-400';
    case 'Hoàn thành': return 'text-emerald-400';
    case 'Tạm dừng': return 'text-stone-500';
    default: return 'text-white';
  }
};

interface OverviewPageProps {
  db: GoogleSheetDB;
  onSelectProject: (pId: string) => void;
  onUpdateActionStatus: (id: string, nextStatus: any) => void;
  onTriggerDecisionReview: () => void;
  lang: "en" | "vi";
}

export default function OverviewPage({
  db,
  onSelectProject,
  onUpdateActionStatus,
  onTriggerDecisionReview,
  lang,
}: OverviewPageProps) {
  const t = translations[lang];

  // Active running projects (excluding completed, hidden, internal, and paused)
  const activeProjects = [...db.projects]
    .filter((p) => p.status !== "Hoàn thành" && p.status !== "Hidden" && p.status !== "Tạm dừng" && p.projectType !== "Internal")
    .sort((a, b) => {
      const order: Record<string, number> = {
        'Cần revise': 1,
        'Đang làm': 2,
        'Chờ feedback': 3,
        'Chưa bắt đầu': 4
      };
      const prioA = order[a.status] ?? 99;
      const prioB = order[b.status] ?? 99;
      return prioA - prioB;
    });

  const pendingActions = React.useMemo(() => {
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
    
    let completedTodayMap: Record<string, string> = {};
    try {
      completedTodayMap = JSON.parse(localStorage.getItem('anphim_completed_today') || '{}');
    } catch(e) {}
      
    const actions = (db.actions || []).filter(a => {
      if (a.status !== "Done") return true;
      // If it is a mapped schedule event from today, keep it!
      if (a.id.startsWith("sync_evt_")) return true;
      
      // If it was linked to today's schedule event, keep it!
      if ((a as any).linkedEventId) return true;

      // If it was marked as completed today in local storage, keep it!
      if (completedTodayMap[a.id] === todayStr) return true;

      // If it is a normal action, check if it was created today
      if (a.id.startsWith("ACT-")) {
        const ts = parseInt(a.id.replace("ACT-", ""), 10);
        if (!isNaN(ts)) {
          const actDate = new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
          if (actDate === todayStr) return true;
        }
      }
      return false;
    });
    
    return actions.sort((a, b) => {
      const aDone = a.status === "Done";
      const bDone = b.status === "Done";
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }
      return a.priorityOrder - b.priorityOrder;
    });
  }, [db.actions]);

  // Separate pending count for the "CEO Decisions" badge
  const pendingCount = pendingActions.filter(a => a.status !== "Done").length;

  // Missing documents calculation
  const missingDocumentsCount = db.projectDocuments?.filter(p => [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].filter(Boolean).length < 6).length || 0;

  // Active running projects calculation (bao gồm Đang làm, Chờ feedback, Cần revise; loại trừ Tạm dừng, Hoàn thành, Internal)
  const activeProjectsCount = (db.projects || []).filter(p => 
    p.projectType !== 'Internal' && 
    (p.status === "Đang làm" || p.status === "Chờ feedback" || p.status === "Cần revise")
  ).length;



  const translateStatus = (stat: string) => {
    if (lang === "en") return stat;
    const map: Record<string, string> = {
      "On Track": "Đang tốt",
      "At Risk": "Rủi ro",
      "Waiting Client": "Chờ khách",
      "Completed": "Đã xong"
    };
    return map[stat] || stat;
  };

  const translatePriority = (pri: string) => {
    if (lang === "en") return pri;
    const map: Record<string, string> = {
      "High": "Cao",
      "Medium": "Trung bình",
      "Low": "Thấp"
    };
    return map[pri] || pri;
  };

  return (
    <div className="md:h-[calc(100vh-4.5rem)] flex flex-col gap-2 animate-fade-in md:overflow-hidden select-none text-white">

      {/* Top executive KPI Row - Compact, responsive layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">

        {/* Card 1: Cash Available */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl py-3.5 pr-2 pl-[16px] flex flex-col justify-between hover:border-emerald-500/20 transition group">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-wider">{t.cashAvailable}</p>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold font-sans text-white tracking-tight leading-snug">
              {formatVND(db.dashboard.cashAvailable)}
            </h3>
            <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-[#10B981] font-mono leading-none">
              <TrendingUp className="w-3 h-3" />
              <span>{lang === "en" ? db.dashboard.cashAvailableChange.replace("so với tuần trước", "vs last week") : db.dashboard.cashAvailableChange.replace("vs last week", "so với tuần trước")}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receivable */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl py-3.5 pr-2 pl-[16px] flex flex-col justify-between hover:border-emerald-500/20 transition group">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-wider">{t.receivable}</p>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 shrink-0">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold font-sans text-white tracking-tight leading-snug">
              {formatVND(db.dashboard.receivable)}
            </h3>
            <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-[#10B981] font-mono leading-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{lang === "en" ? db.dashboard.receivableChange.replace("so với tuần trước", "vs last week") : db.dashboard.receivableChange.replace("vs last week", "so với tuần trước")}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Projects */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl py-3.5 pr-2 pl-[16px] flex flex-col justify-between hover:border-emerald-500/20 transition group">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-wider">{t.activeProjects}</p>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold font-sans text-white tracking-tight leading-snug">
              {activeProjectsCount}
            </h3>
            <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-[#10B981] font-mono leading-none">
              <span>{lang === "en" ? db.dashboard.activeProjectsChange.replace("so với tuần trước", "vs last week") : db.dashboard.activeProjectsChange.replace("vs last week", "so với tuần trước")}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Missing Documents */}
        <div className="bg-[#121417] border border-orange-500/10 rounded-xl py-3.5 pr-2 pl-[16px] flex flex-col justify-between hover:border-orange-500/30 transition group">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">{lang === "en" ? "Missing Documents" : "Thiếu giấy tờ"}</p>
            <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center border border-orange-500/10 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold font-sans text-white tracking-tight leading-snug">
              {missingDocumentsCount}
            </h3>
            <p className="text-[10px] text-neutral-450 mt-0.5 font-mono leading-none">
              {lang === "en" ? "Projects need documents" : "Dự án cần bổ sung"}
            </p>
          </div>
        </div>

      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:flex-1 md:overflow-hidden min-h-0">

        {/* Left column: Project Overview */}
        <div className="md:col-span-7 xl:col-span-8 flex flex-col gap-2 md:h-full md:overflow-hidden min-h-0">

          {/* Section A: Project Overview */}
          <div className="flex flex-col flex-1 md:min-h-0 py-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2 pl-[16px] pr-2 shrink-0">
              <div>
                <h3 className="text-[11px] sm:text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">
                  {t.projectOverview}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{t.projectOverviewDesc}</p>
              </div>
              <button
                onClick={() => onSelectProject("")}
                className="text-[10px] text-[#10B981] hover:text-emerald-400 flex items-center space-x-1 font-mono transition cursor-pointer"
              >
                <span>{lang === "en" ? "View all projects" : "Xem tất cả"}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 flex-1 md:min-h-0 overflow-y-auto pr-1.5 custom-thin-scroll">
              {activeProjects.map((p) => {
                const isAtRisk = p.status === "Cần revise";
                const isCompleted = p.status === "Hoàn thành";
                const completedTasks = p.milestones ? p.milestones.filter(m => m.completed).length : 0;
                const totalTasks = p.milestones ? p.milestones.length : 0;
                const taskProgress = isCompleted ? 100 : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="bg-[#171b21] hover:bg-[#1b2027]/90 rounded-xl p-3 border border-[#232a32] hover:border-emerald-500/40 cursor-pointer flex flex-col justify-between transition group min-h-[170px]"
                  >
                    <div className="flex flex-col flex-1 min-h-0 justify-between">
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* Top Row: Project Name & Budget */}
                        <div className="flex items-center justify-between mb-1.5 shrink-0">
                          <span className="text-[11px] text-white font-sans font-bold tracking-tight truncate max-w-[130px]" title={p.name}>
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                            {Math.round(p.budget / 1_000_000)}M
                          </span>
                        </div>

                        {/* Visual Frame */}
                        <div className="relative flex-1 w-full rounded-lg bg-neutral-900 border border-neutral-800/60 overflow-hidden mb-1.5 min-h-[75px] shrink-0 md:shrink">
                          {p.thumbnailUrl ? (
                            <img
                              src={p.thumbnailUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#1e232a] flex items-center justify-center font-mono text-[10px] text-neutral-500">
                              {lang === "en" ? "NO FILM GRAPHIC" : "CHƯA CÓ ĐỒ HỌA PHIM"}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          
                          {/* Client and Status inside image */}
                          <div className="absolute bottom-2 left-2">
                            <p className="text-[10px] font-mono font-medium text-neutral-300 truncate max-w-[110px]">{p.client}</p>
                          </div>
                          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                            <CircleDot className={`w-2 h-2 ${getStatusTextColor(p.status)} ${p.status === "Cần revise" || p.status === "Tạm dừng" ? "animate-pulse" : ""}`} />
                            <span className={`text-[9px] font-mono uppercase ${getStatusTextColor(p.status)}`}>
                              {translateStatus(p.status)}
                            </span>
                          </div>

                          {/* Task progress bar at the very bottom */}
                          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-neutral-800/80">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${taskProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next Action Indicator */}
                    <div className="border-t border-neutral-800/40 pt-1.5 mt-1 flex items-center space-x-1 text-[10px] text-neutral-350 font-mono shrink-0">
                      <Clock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate font-sans leading-none" title={p.nextAction}>
                        {p.nextAction}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right column: Priority Actions & AI status */}
        <div className="md:col-span-5 xl:col-span-4 flex flex-col gap-2 md:h-full md:overflow-hidden min-h-0">

          {/* Section C: Today's Priority checklist — mỗi sub-task là 1 ô riêng */}
          <TodayTasksPanel
            actions={pendingActions}
            lang={lang}
            onUpdateActionStatus={onUpdateActionStatus}
            translatePriority={translatePriority}
            t={t}
          />

          {/* Section E: Waiting for CEO Decision counter */}
          <div className="bg-[#121417] rounded-xl border border-orange-500/10 py-3 pr-3 pl-[16px] flex items-center justify-between bg-gradient-to-br from-[#121417] via-[#121417] to-orange-500/5 hover:border-orange-500/25 transition shrink-0">
            <div className="space-y-0.5 pr-2">
              <h4 className="text-[10px] font-mono text-orange-400 uppercase tracking-widest leading-none">
                {t.pendingCeoDecisions}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight font-sans mt-1">
                {t.actionsNeedApproval.replace("{count}", String(pendingCount))}
              </p>
              <p className="text-[10px] text-neutral-400 leading-snug font-sans mt-1">
                {t.directCreativeApprovals}
              </p>
            </div>

            <div className="text-center shrink-0 flex flex-col items-center">
              <button
                onClick={onTriggerDecisionReview}
                className="w-8 h-8 rounded-full bg-orange-950/20 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 border border-orange-500/30 font-bold font-sans text-xs flex items-center justify-center transition shadow-lg shrink-0 cursor-pointer animate-pulse"
              >
                {pendingCount}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

// ─── TodayTasksPanel ──────────────────────────────────────────────────────────
// Split mỗi action.title thành các sub-task nếu có dấu gạch đầu dòng.
// Mỗi sub-task có checkbox riêng; khi tất cả được tick thì action → Done.

interface TodayTasksPanelProps {
  actions: CEOAction[];
  lang: "en" | "vi";
  onUpdateActionStatus: (id: string, nextStatus: any) => void;
  translatePriority: (pri: string) => string;
  t: any;
}

function splitIntoSubTasks(title: string): string[] {
  // Tách theo các pattern: "- [ ]", "- [x]", "• ", "- "
  const lines = title.split(/\n/);
  const tasks: string[] = [];

  for (const line of lines) {
    // Loại bỏ các marker: - [ ], - [x], - [X], •, -
    const cleaned = line
      .replace(/^[\s]*-\s*\[[ xX]\]\s*/, "")
      .replace(/^[\s]*-\s*/, "")
      .replace(/^[\s]*•\s*/, "")
      .trim();
    if (cleaned.length > 0) {
      tasks.push(cleaned);
    }
  }

  // Nếu không tách được gì (không có newline/bullet), giữ nguyên 1 task
  return tasks.length > 0 ? tasks : [title.trim()];
}

function getCategoryTag(category?: string, lang: 'en' | 'vi' = 'vi') {
  switch (category) {
    case 'work': return { label: lang === 'en' ? 'Work' : 'Công việc', color: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20' };
    case 'meeting': return { label: lang === 'en' ? 'Meeting' : 'Họp/Sự kiện', color: 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20' };
    case 'personal': return { label: lang === 'en' ? 'Personal' : 'Cá nhân', color: 'text-[#06b6d4] bg-[#06b6d4]/10 border-[#06b6d4]/20' };
    case 'important': return { label: lang === 'en' ? 'Important' : 'Quan trọng', color: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20' };
    default: return null;
  }
}

function TodayTasksPanel({
  actions,
  lang,
  onUpdateActionStatus,
  translatePriority,
  t,
}: TodayTasksPanelProps) {
  // Trạng thái checked cho từng sub-task: key = "actId_subIndex"
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string, actId: string, subTasks: string[]) => {
    const act = actions.find(a => a.id === actId);
    const isDbDone = act?.status === "Done";
    const currentChecked = checkedMap[key] !== undefined ? checkedMap[key] : isDbDone;
    
    const next = { ...checkedMap, [key]: !currentChecked };
    setCheckedMap(next);

    // Nếu tất cả sub-tasks của action này đã được tick → đánh dấu Done
    const allDone = subTasks.every((_, idx) => {
      const k = `${actId}_${idx}`;
      return next[k] !== undefined ? next[k] : isDbDone;
    });
    
    if (allDone && !isDbDone) {
      // Record completion date in localStorage
      const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
      try {
        const completedMap = JSON.parse(localStorage.getItem('anphim_completed_today') || '{}');
        completedMap[actId] = todayStr;
        localStorage.setItem('anphim_completed_today', JSON.stringify(completedMap));
      } catch(e) {}
      
      onUpdateActionStatus(actId, "Done");
    } else if (!allDone && isDbDone) {
      onUpdateActionStatus(actId, "Pending");
    }
  };

  // Helper kiểm tra xem task đã hoàn thành chưa (tính cả checkedMap theo thời gian thực)
  const isTaskDone = (act: CEOAction) => {
    const subTasks = splitIntoSubTasks(act.title);
    return subTasks.every((_, idx) => {
      const k = `${act.id}_${idx}`;
      return checkedMap[k] !== undefined ? checkedMap[k] : (act.status === "Done");
    });
  };

  // Sắp xếp: Các task chưa xong lên trên, các task đã xong đẩy xuống dưới cùng
  const sortedActions = React.useMemo(() => {
    return [...actions].sort((a, b) => {
      const aDone = isTaskDone(a);
      const bDone = isTaskDone(b);
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }
      return a.priorityOrder - b.priorityOrder;
    });
  }, [actions, checkedMap]);

  const completedCount = sortedActions.filter(isTaskDone).length;

  return (
    <div className="bg-[#121417] rounded-xl border border-[#1e2329]/85 py-2 pr-2 pl-[16px] flex-1 flex flex-col min-h-0 md:overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0 pr-1">
        <h3 className="text-[11px] sm:text-xs font-mono text-white font-bold uppercase tracking-widest">
          {t.todaysPriorityActions}
        </h3>
        {/* Legend pills: Green = Schedule (có giờ), Orange = Action (cần input) */}
        <div className="flex items-center space-x-1.5 text-[9px] font-mono select-none">
          <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Lịch làm</span>
          </span>
          <span className="flex items-center space-x-1 text-orange-400 bg-orange-950/40 border border-orange-500/30 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span>Cần Input</span>
          </span>
        </div>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 select-none custom-thin-scroll">
        {sortedActions.map((act, idx) => {
          const isSchedule = act.itemSource === "schedule" || act.id.startsWith("sync_evt_") || !!act.linkedEventId;
          const isHigh = act.priorityLevel === "High";
          const isMedium = act.priorityLevel === "Medium";
          const subTasks = splitIntoSubTasks(act.title);
          const isDone = isTaskDone(act);

          // Kiểm tra xem đây có phải item hoàn thành đầu tiên để chèn divider ngăn cách
          const prevAct = idx > 0 ? sortedActions[idx - 1] : null;
          const isPrevDone = prevAct ? isTaskDone(prevAct) : false;
          const showCompletedDivider = isDone && !isPrevDone && idx > 0;

          return (
            <React.Fragment key={act.id}>
              {showCompletedDivider && (
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <div className="h-[1px] flex-1 bg-neutral-800"></div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Đã hoàn thành ({completedCount})
                  </span>
                  <div className="h-[1px] flex-1 bg-neutral-800"></div>
                </div>
              )}
              <div
                className={`rounded-xl p-2.5 transition-all group border-l-[3px] ${
                  isDone ? "opacity-55 hover:opacity-90" : "opacity-100"
                } ${
                  isSchedule
                    ? "bg-[#101713]/90 border border-emerald-500/25 border-l-emerald-500 hover:border-emerald-500/45 shadow-sm shadow-emerald-950/20"
                    : "bg-[#1a140e]/90 border border-orange-500/25 border-l-orange-500 hover:border-orange-500/45 shadow-sm shadow-orange-950/20"
                }`}
              >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-5 h-5 rounded-full border text-[10px] font-sans font-semibold flex items-center justify-center shrink-0 ${
                    isSchedule
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-orange-950/60 border-orange-500/40 text-orange-300"
                  }`}>
                    {act.priorityOrder}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 rounded font-sans uppercase font-semibold border shrink-0 ${isHigh
                      ? "bg-red-950/40 border-red-900/60 text-red-400"
                      : isMedium
                        ? "bg-orange-950/40 border-orange-900/60 text-orange-400"
                        : "bg-neutral-800/10 border-neutral-700 text-neutral-450"
                      }`}
                  >
                    {translatePriority(act.priorityLevel)}
                  </span>
                  {/* Project label */}
                  <span className={`text-[10px] font-mono tracking-wide ml-1 truncate max-w-[120px] ${
                    isSchedule ? "text-emerald-400/90" : "text-orange-400/90"
                  }`}>
                    {act.project}
                  </span>
                </div>

                {/* Right badges: Time for schedule or "Cần input" badge for action */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {isSchedule && act.timeStr ? (
                    <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span>{act.timeStr}</span>
                    </span>
                  ) : !isSchedule ? (
                    <span className="text-[9px] font-mono text-orange-300 bg-orange-950/60 border border-orange-500/40 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <AlertCircle className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                      <span>Cần Input</span>
                    </span>
                  ) : null}

                  {act.category ? (() => {
                    const tag = getCategoryTag(act.category, lang);
                    return tag ? (
                      <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded flex items-center space-x-1 ${tag.color}`}>
                        <span className="truncate max-w-[80px]">{tag.label}</span>
                      </span>
                    ) : null;
                  })() : (
                    <span className="text-[9px] text-[#10B981] font-mono bg-emerald-950/30 border border-emerald-950/50 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <span className="truncate max-w-[80px]">{act.suggestedAgent}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-tasks */}
              <div className="space-y-1.5">
                {subTasks.map((task, idx) => {
                  const key = `${act.id}_${idx}`;
                  const isDbDone = act.status === "Done";
                  const checked = checkedMap[key] !== undefined ? checkedMap[key] : isDbDone;

                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer group/task"
                    >
                      {/* Custom checkbox */}
                      <button
                        onClick={(e) => { e.preventDefault(); toggle(key, act.id, subTasks); }}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-all ${checked
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-transparent border-neutral-600 group-hover/task:border-emerald-500/60"
                          }`}
                        aria-label={checked ? "Bỏ đánh dấu" : "Đánh dấu hoàn thành"}
                      >
                        {checked && (
                          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <polyline points="1.5,5.5 4,8 8.5,2" />
                          </svg>
                        )}
                      </button>

                      {/* Task text */}
                      <span
                        className={`text-[10.5px] font-sans leading-snug transition-colors ${checked
                          ? "line-through text-neutral-600"
                          : "text-neutral-200 group-hover/task:text-white"
                          }`}
                      >
                        {task}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}

        {actions.length === 0 && (
          <div className="text-center py-6 border border-dashed border-neutral-800 rounded-lg text-neutral-400 text-[10px] sm:text-xs font-sans font-medium">
            {t.noPendingActions}
          </div>
        )}
      </div>
    </div>
  );
}
