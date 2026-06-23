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
  ArrowUpRight
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

  // Grab top 3 active projects
  const activeProjects = [...db.projects]
    .filter((p) => p.status !== "Hoàn thành")
    .sort((a, b) => {
      if (a.status === "Đang làm" && b.status !== "Đang làm") return -1;
      if (a.status !== "Đang làm" && b.status === "Đang làm") return 1;
      return 0;
    })
    .slice(0, 3);

  const pendingActions = db.actions
    .filter((a) => a.status !== "Done")
    .sort((a, b) => a.priorityOrder - b.priorityOrder);

  // Missing documents calculation
  const missingDocumentsCount = db.projectDocuments?.filter(p => [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].filter(Boolean).length < 6).length || 0;

  // Total expense calculation
  const totalExpense = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  // Tính toán dòng tiền 7 ngày gần nhất dựa trên incomes và expenseTransactions
  const recentCashFlow = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      buckets.push({
        id: `d_${d.getTime()}`,
        label: `${d.getDate()}/${d.getMonth()+1}`,
        dateVal: d.getTime(),
        inflow: 0,
        outflow: 0,
        netProfit: 0
      });
    }

    const processItem = (dateStr: string, amount: number, isIncome: boolean) => {
      if (!dateStr || !amount) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const itemTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const bucket = buckets.find(b => b.dateVal === itemTime);
      if (bucket) {
        if (isIncome) bucket.inflow += amount;
        else bucket.outflow += amount;
      }
    };

    (db.incomes || []).forEach(inc => processItem(inc.date, inc.amount, true));
    (db.expenseTransactions || []).forEach(exp => processItem(exp.date, exp.amount, false));

    buckets.forEach(b => {
      b.netProfit = b.inflow - b.outflow;
    });

    return buckets;
  }, [db.incomes, db.expenseTransactions]);

  // Let's compute some nice SVG metrics for Cash Flow (A dual green–orange bar graph with white trendline for net profit)
  const maxCfVal = Math.max(...recentCashFlow.map(cf => Math.max(cf.inflow, Math.abs(cf.outflow))) || [1]);

  // ── Expense donut: gom nhóm nhỏ thành "Khác" ──────────────────────────
  const TOP_CATEGORIES = ["Personal", "Marketing", "Freelancer"];
  const PIE_COLORS: Record<string, string> = {
    Personal: "#10B981", // emerald
    Marketing: "#f59e0b", // amber
    Freelancer: "#f97316", // orange  (Nhân sự Ngoài)
    Khác: "#6366f1", // indigo
  };
  const PIE_TEXT_COLORS: Record<string, string> = {
    Personal: "text-emerald-400",
    Marketing: "text-amber-400",
    Freelancer: "text-orange-400",
    Khác: "text-indigo-400",
  };

  // Tách top 3 + gom "Khác"
  const topExpenses = db.expenses.filter(e => TOP_CATEGORIES.includes(e.category));
  const othersExpenses = db.expenses.filter(e => !TOP_CATEGORIES.includes(e.category));
  const othersAmount = othersExpenses.reduce((s, e) => s + e.amount, 0);
  const othersPercent = othersExpenses.reduce((s, e) => s + e.percentage, 0);
  const pieData = [
    ...topExpenses,
    ...(othersPercent > 0 ? [{ category: "Khác", amount: othersAmount, percentage: othersPercent, color: "" }] : []),
  ];

  // Tên hiển thị
  const categoryLabel = (cat: string) => {
    if (lang === "en") return cat;
    const map: Record<string, string> = {
      Personal: "Personal",
      Marketing: "Marketing",
      Freelancer: "Nhân sự Ngoài",
      Production: "Sản xuất Phim",
      "AI Tools": "Công cụ AI",
      Admin: "Hành chính",
      Others: "Danh mục khác",
      Khác: "Khác",
    };
    return map[cat] || cat;
  };

  // Tính cumulativePercent cho SVG donut
  let cumulativePercent = 0;

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
              {db.dashboard.activeProjectsCount}
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

        {/* Left column: Projects and Finance */}
        <div className="md:col-span-7 xl:col-span-8 flex flex-col gap-2 md:h-full md:overflow-hidden min-h-0">

          {/* Section A: Project Overview */}
          <div className="flex flex-col md:flex-[1.2] md:min-h-0 py-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 md:min-h-0">
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
                    className="bg-[#171b21] hover:bg-[#1b2027]/90 rounded-xl p-3 border border-[#232a32] hover:border-emerald-500/40 cursor-pointer flex flex-col justify-between transition group h-[142px] md:h-full md:min-h-0"
                  >
                    <div className="flex flex-col flex-1 min-h-0 justify-between">
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* Top Row: Project Name & Budget */}
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <span className="text-[11px] text-white font-sans font-bold tracking-tight truncate max-w-[120px]">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {Math.round(p.budget / 1_000_000)}M
                          </span>
                        </div>

                        {/* Visual Frame */}
                        <div className="relative flex-1 w-full rounded-lg bg-neutral-900 border border-neutral-800/60 overflow-hidden mb-1.5 min-h-[32px] shrink-0 md:shrink">
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
                            <p className="text-[10px] font-mono font-medium text-neutral-300 truncate max-w-[120px]">{p.client}</p>
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
                    <div className="border-t border-neutral-800/40 pt-1.5 mt-1.5 flex items-center space-x-1 text-[10px] text-neutral-350 font-mono shrink-0">
                      <Clock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate font-sans leading-none">
                        {p.nextAction}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Finance Snapshot charts */}
          <div className="flex flex-col md:flex-[1.1] md:min-h-0 min-h-0 py-1">
            <div className="flex justify-between items-center mb-1.5 pl-[16px] pr-2 shrink-0">
              <div>
                <h3 className="text-[11px] sm:text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">
                  {t.weeklyFinancialSnapshot}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{t.weeklyFinancialSnapshotDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:flex-1 md:overflow-hidden min-h-0">

              {/* Chart 1: Cash Flow Dual Bars */}
              <div className="bg-[#171b21] rounded-xl py-2 pr-2 pl-[16px] border border-[#232a32] flex flex-col justify-between md:h-full md:overflow-hidden min-h-0">
                <div className="flex justify-between items-center mb-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-neutral-350 font-medium">{t.weeklyCashFlowTrend}</span>
                  <div className="flex items-center space-x-2 text-[10px] font-mono">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2 rounded-sm bg-emerald-500" />
                      <span className="text-neutral-450">{t.in}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2 rounded-sm bg-orange-500" />
                      <span className="text-neutral-450">{t.out}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span className="text-neutral-450">{t.net}</span>
                    </span>
                  </div>
                </div>

                {/* Inline Responsive SVG Chart */}
                <div className="flex-1 w-full relative min-h-[85px] flex items-center justify-center">
                  <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#1f2730" strokeWidth="0.25" strokeDasharray="1,1" />
                    <line x1="0" y1="27.5" x2="100" y2="27.5" stroke="#1f2730" strokeWidth="0.25" />
                    <line x1="0" y1="45" x2="100" y2="45" stroke="#1f2730" strokeWidth="0.25" strokeDasharray="1,1" />

                    {recentCashFlow.map((cf, i) => {
                      const spacing = 96 / (recentCashFlow.length - 1 || 1);
                      const barWidth = 1.2;
                      const xPos = 2 + i * spacing;
                      const inflowYPercent = Math.min(20, (cf.inflow / maxCfVal) * 20);
                      const outflowYPercent = Math.min(20, (Math.abs(cf.outflow) / maxCfVal) * 20);
                      const inflowY = 27.5 - inflowYPercent;
                      const outflowY = 27.5;

                      return (
                        <g key={cf.id} className="group cursor-pointer">
                          <rect
                            x={xPos - barWidth}
                            y={inflowY}
                            width={barWidth}
                            height={inflowYPercent}
                            className="fill-emerald-500/85 transition"
                            rx="0.2"
                          />
                          <rect
                            x={xPos + 0.2}
                            y={outflowY}
                            width={barWidth}
                            height={outflowYPercent}
                            className="fill-orange-500/85 transition"
                            rx="0.2"
                          />
                        </g>
                      );
                    })}

                    <path
                      d={recentCashFlow.map((cf, i) => {
                        const spacing = 96 / (recentCashFlow.length - 1 || 1);
                        const xPos = 2 + i * spacing;
                        const scaling = (cf.netProfit / maxCfVal) * 20;
                        const yPos = 27.5 - scaling;
                        return `${i === 0 ? "M" : "L"} ${xPos} ${yPos}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />

                    {recentCashFlow.map((cf, i) => {
                      const spacing = 96 / (recentCashFlow.length - 1 || 1);
                      const xPos = 2 + i * spacing;
                      const scaling = (cf.netProfit / maxCfVal) * 20;
                      const yPos = 27.5 - scaling;
                      return (
                        <circle
                          key={cf.id}
                          cx={xPos}
                          cy={yPos}
                          r="0.5"
                          className="fill-neutral-900 stroke-white cursor-pointer"
                          strokeWidth="0.3"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Chart 2: Capital Expense Breakdown — gom nhóm nhỏ thành "Khác" */}
              <div className="bg-[#171b21] rounded-xl py-2 pr-2 pl-[16px] border border-[#232a32] flex flex-col justify-between md:h-full md:overflow-hidden min-h-0">
                <div className="flex justify-between items-center mb-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-neutral-350 font-medium">{t.expenseDistribution}</span>
                  <span className="text-[10px] font-mono font-bold text-[#10B981]">{formatVND(totalExpense)}</span>
                </div>

                <div className="flex flex-row items-center gap-4 flex-1 min-h-0 overflow-y-auto custom-thin-scroll">
                  {/* Donut SVG */}
                  <div className="flex items-center justify-center shrink-0">
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#1a2027" strokeWidth="3.5" />
                        {pieData.map((e) => {
                          const strokeDasharray = `${e.percentage} ${100 - e.percentage}`;
                          const strokeDashoffset = 100 - cumulativePercent;
                          cumulativePercent += e.percentage;
                          const strokeColor = PIE_COLORS[e.category] ?? "#9ca3af";
                          return (
                            <circle
                              key={e.category}
                              cx="18" cy="18"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth="3.5"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[9px] uppercase font-mono text-neutral-450 leading-none">{t.total}</span>
                        <strong className="text-[10px] text-white font-sans font-extrabold leading-none mt-0.5">
                          {Math.round(totalExpense / 1_000_000)}M
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Legend rows: Tên | Số tiền (Tỷ lệ%) */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {pieData.map((e) => {
                      const textColor = PIE_TEXT_COLORS[e.category] ?? "text-neutral-400";
                      const dotColor = PIE_COLORS[e.category] ?? "#9ca3af";
                      return (
                        <div key={e.category} className="flex items-center gap-1.5 text-[9.5px] leading-tight">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className="text-neutral-300 font-sans font-medium shrink-0 truncate max-w-[70px]">
                            {categoryLabel(e.category)}
                          </span>
                          <span className="text-neutral-600 mx-0.5">|</span>
                          <span className={`${textColor} font-mono font-bold truncate`}>
                            {Math.round(e.amount / 1_000_000)}M ({e.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

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
                {t.actionsNeedApproval.replace("{count}", String(pendingActions.length))}
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
                {pendingActions.length}
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
    case 'personal': return { label: lang === 'en' ? 'Personal' : 'Cá nhân', color: 'text-[#06b6d4] bg-[#06b6d4]/10 border-[#06b6d4]/20' };
    case 'meeting': return { label: lang === 'en' ? 'Meeting' : 'Họp/Sự kiện', color: 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20' };
    case 'ai_agent': return { label: 'AI Agent', color: 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/20' };
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
    const next = { ...checkedMap, [key]: !checkedMap[key] };
    setCheckedMap(next);

    // Nếu tất cả sub-tasks của action này đã được tick → đánh dấu Done
    const allDone = subTasks.every((_, idx) => next[`${actId}_${idx}`]);
    if (allDone) {
      onUpdateActionStatus(actId, "Done");
    }
  };

  return (
    <div className="bg-[#121417] rounded-xl border border-[#1e2329]/85 py-2 pr-2 pl-[16px] flex-1 flex flex-col min-h-0 md:overflow-hidden">
      <h3 className="text-[11px] sm:text-xs font-mono text-orange-400 uppercase tracking-widest mb-2 shrink-0">
        {t.todaysPriorityActions}
      </h3>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 select-none custom-thin-scroll">
        {actions.map((act) => {
          const isHigh = act.priorityLevel === "High";
          const isMedium = act.priorityLevel === "Medium";
          const subTasks = splitIntoSubTasks(act.title);

          return (
            <div
              key={act.id}
              className="bg-[#171b21] border border-[#232a32] rounded-xl p-2 transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-sans font-semibold text-neutral-400 flex items-center justify-center shrink-0">
                    {act.priorityOrder}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 rounded font-sans uppercase font-semibold border ${isHigh
                      ? "bg-red-950/40 border-red-900/60 text-red-400"
                      : isMedium
                        ? "bg-orange-950/40 border-orange-900/60 text-orange-400"
                        : "bg-neutral-800/10 border-neutral-700 text-neutral-450"
                      }`}
                  >
                    {translatePriority(act.priorityLevel)}
                  </span>
                  {/* Project label (Date) */}
                  <span className="text-[10px] text-neutral-400 font-mono tracking-wide ml-1">{act.project}</span>
                </div>
                {act.category ? (() => {
                  const tag = getCategoryTag(act.category, lang);
                  return tag ? (
                    <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded flex items-center space-x-1 ${tag.color}`}>
                      <span className="truncate max-w-[120px]">{tag.label}</span>
                    </span>
                  ) : null;
                })() : (
                  <span className="text-[9px] text-[#10B981] font-mono bg-emerald-950/30 border border-emerald-950/50 px-1.5 py-0.5 rounded flex items-center space-x-1">
                    <span className="truncate max-w-[120px]">{act.suggestedAgent}</span>
                  </span>
                )}
              </div>

              {/* Sub-tasks */}
              <div className="space-y-1.5">
                {subTasks.map((task, idx) => {
                  const key = `${act.id}_${idx}`;
                  const checked = !!checkedMap[key];

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
