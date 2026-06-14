/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, Project, FinanceAlert } from "../types";
import { formatVND } from "../data";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertOctagon,
  PieChart,
  Clock,
  CheckCircle,
  FileText,
  BadgeAlert
} from "lucide-react";
import { translations } from "../translations";

interface FinancePageProps {
  db: GoogleSheetDB;
  onClearAlert: (alertId: string) => void;
  onSelectProject: (projectId: string) => void;
  lang: "en" | "vi";
}

export default function FinancePage({
  db,
  onClearAlert,
  onSelectProject,
  lang,
}: FinancePageProps) {
  const t = translations[lang];
  const [selectedAlertNote, setSelectedAlertNote] = useState<string | null>(null);
  const [timescale, setTimescale] = useState<"week" | "month" | "quarter">("week");
  const [hoveredCf, setHoveredCf] = useState<any>(null);

  // Filters for Expense Details
  const [filterMonth, setFilterMonth] = React.useState("All");
  const [filterProject, setFilterProject] = React.useState("All");
  const [filterCategory, setFilterCategory] = React.useState("All");
  const [filterPaymentMethod, setFilterPaymentMethod] = React.useState("All");

  const monthlyCashFlow = React.useMemo(() => {
    const map = new Map();
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    db.cashFlow.forEach(cf => {
      const monthEng = cf.label.split(' ')[0];
      const monthMap = { "Jan": "Thg 1", "Feb": "Thg 2", "Mar": "Thg 3", "Apr": "Thg 4", "May": "Thg 5", "Jun": "Thg 6", "Jul": "Thg 7", "Aug": "Thg 8", "Sep": "Thg 9", "Oct": "Thg 10", "Nov": "Thg 11", "Dec": "Thg 12" };
      const mLabel = lang === "en" ? monthEng : (monthMap[monthEng] || monthEng);

      const existing = map.get(monthEng) || { inflow: 0, outflow: 0, netProfit: 0, label: mLabel };
      existing.inflow += cf.inflow;
      existing.outflow += cf.outflow;
      existing.netProfit += cf.netProfit;
      map.set(monthEng, existing);
    });

    return Array.from(map.entries())
      .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
      .map(([k, vals], idx) => ({ id: `m_${idx}`, ...vals }));
  }, [db.cashFlow, lang]);

  const quarterlyCashFlow = React.useMemo(() => {
    const map = new Map();
    db.cashFlow.forEach(cf => {
      const monthEng = cf.label.split(' ')[0];
      let q = "Q1/26";
      if (["Apr", "May", "Jun"].includes(monthEng)) q = "Q2/26";
      else if (["Jul", "Aug", "Sep"].includes(monthEng)) q = "Q3/26";
      else if (["Oct", "Nov", "Dec"].includes(monthEng)) q = "Q4/26";

      const existing = map.get(q) || { inflow: 0, outflow: 0, netProfit: 0, label: q };
      existing.inflow += cf.inflow;
      existing.outflow += cf.outflow;
      existing.netProfit += cf.netProfit;
      map.set(q, existing);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, vals], idx) => ({ id: `q_${idx}`, ...vals }));
  }, [db.cashFlow]);

  const currentData = timescale === "week"
    ? db.cashFlow.slice(-7)
    : timescale === "month"
      ? monthlyCashFlow
      : quarterlyCashFlow;

  const totalReceivable = db.projects
    .filter(p => p.status !== "Hoàn thành")
    .reduce((sum, p) => sum + (p.budget - p.received), 0);

  const totalExpense = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  const estimatedProfit = db.projects.reduce((sum, p) => sum + p.budget, 0) - totalExpense;

  const receivablesList = db.projects
    .filter((p) => p.budget > p.received)
    .map((p) => {
      const outstanding = p.budget - p.received;

      let statusText = lang === "en" ? "Due in 9 days" : "Hạn chót sau 9 ngày";
      let statusColor = "text-orange-400 bg-orange-950/20 border-orange-900";

      if (p.id === "proj_1") {
        statusText = lang === "en" ? "Overdue" : "Quá hạn nộp";
        statusColor = "text-red-400 bg-red-950/30 border-red-900 animate-pulse";
      } else if (p.id === "proj_2") {
        statusText = lang === "en" ? "Due in 3 days" : "Hạn chót sau 3 ngày";
        const expColors = ['#10B981', '#f97316', '#6366f1', '#06b6d4', '#f43f5e', '#a855f7', '#eab308'];
        statusColor = "text-orange-400 bg-orange-950/20 border-orange-900";
      } else if (p.id === "proj_5") {
        statusText = lang === "en" ? "Overdue" : "Quá hạn nộp";
        statusColor = "text-red-400 bg-red-950/30 border-red-900 animate-pulse";
      } else if (p.dueDate.includes("July") || p.dueDate.includes("July")) {
        statusText = lang === "en" ? "Due in 34 days" : "Hạn sau 34 ngày";
        statusColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900";
      } else {
        statusText = lang === "en" ? "Due in 15 days" : "Hạn sau 15 ngày";
        statusColor = "text-blue-400 bg-blue-950/20 border-blue-900";
      }

      return {
        id: p.id,
        name: p.name,
        client: p.client,
        outstanding,
        statusText,
        statusColor,
        thumbnailUrl: p.thumbnailUrl,
        progress: p.budget > 0 ? Math.round((p.received / p.budget) * 100) : 0,
      };
    });

  const maxCfVal = Math.max(...currentData.map(cf => Math.max(cf.inflow, Math.abs(cf.outflow))) || [1]);
  let cumulativePercent = 0;

  let colWidth = 4.5;
  let spacing = 14;
  let groupOffset = 5.2;
  let centerOffset = 4.85;

  if (timescale === "month") {
    colWidth = 4.8;
    spacing = 16.5;
    groupOffset = 5.5;
    centerOffset = 5.15;
  } else if (timescale === "quarter") {
    colWidth = 6.5;
    spacing = 26;
    groupOffset = 7.5;
    centerOffset = 7.0;
  }

  const translateCategory = (cat: string) => {
    return cat;
  };

  const translateAlertType = (type: string) => {
    if (lang === "en") return type;
    const map: Record<string, string> = {
      "Overdue Payment": "Thanh Toán Quá Hạn",
      "Over-Budget Project": "Vượt Quá Ngân Sách",
      "Missing Invoice": "Thiếu Hóa Đơn Đối Đánh"
    };
    return map[type] || type;
  };

  // -------------------------
  // EXPENSE DETAILS DERIVATIONS
  // -------------------------
  const rawExpenses = db.expenseTransactions || [];

  const expenseComparison = React.useMemo(() => {
    if (rawExpenses.length === 0) return null;
    const allDates = rawExpenses.map(e => new Date(e.date).getTime());
    const maxDate = new Date(Math.max(...allDates));
    
    const last7DaysStart = new Date(maxDate);
    last7DaysStart.setDate(maxDate.getDate() - 7);
    
    const prev7DaysStart = new Date(last7DaysStart);
    prev7DaysStart.setDate(last7DaysStart.getDate() - 7);

    let currWeekTotal = 0;
    let prevWeekTotal = 0;

    rawExpenses.forEach(e => {
      const d = new Date(e.date);
      if (d > last7DaysStart && d <= maxDate) {
        currWeekTotal += e.amount;
      } else if (d > prev7DaysStart && d <= last7DaysStart) {
        prevWeekTotal += e.amount;
      }
    });

    if (prevWeekTotal === 0) return null;

    const diffPercent = ((currWeekTotal - prevWeekTotal) / prevWeekTotal) * 100;
    const isUp = diffPercent > 0;
    const absDiff = Math.abs(diffPercent).toFixed(1);
    
    const textStr = lang === "en" 
      ? `${isUp ? 'Up' : 'Down'} ${absDiff}% vs last week`
      : `${isUp ? 'Tăng' : 'Giảm'} ${absDiff}% so với tuần trước`;
      
    const colorClass = isUp ? 'text-red-400' : 'text-[#10B981]';
      
    return { text: textStr, colorClass };
  }, [rawExpenses, lang]);

  const availableCategories = React.useMemo(() => {
    return Array.from(new Set(rawExpenses.map(e => e.category))).sort();
  }, [rawExpenses]);

  const availablePaymentMethods = React.useMemo(() => {
    return Array.from(new Set(rawExpenses.map(e => e.paymentMethod).filter(Boolean))).sort();
  }, [rawExpenses]);

  const categoryColors = React.useMemo(() => {
    const map: Record<string, string> = {};
    db.expenses.forEach(e => {
      map[e.category] = e.color;
    });
    return map;
  }, [db.expenses]);

  const availableMonths = React.useMemo(() => {
    const m = new Set<string>();
    rawExpenses.forEach(e => {
      if (e.date) {
        // e.date is like "2026-06-01"
        const monthStr = e.date.substring(0, 7); // "2026-06"
        m.add(monthStr);
      }
    });
    return Array.from(m).sort((a, b) => b.localeCompare(a));
  }, [rawExpenses]);

  const availableProjects = React.useMemo(() => {
    const pList = new Set<string>();
    db.projects.forEach(p => pList.add(p.name));
    pList.add("Cá nhân");
    pList.add("Công ty");
    // also add any from raw expenses just in case
    rawExpenses.forEach(e => {
      if (e.project) pList.add(e.project);
    });
    return Array.from(pList).sort();
  }, [db.projects, rawExpenses]);

  const filteredExpenses = React.useMemo(() => {
    return rawExpenses.filter((exp) => {
      if (filterMonth !== "All" && exp.date && !exp.date.startsWith(filterMonth)) return false;
      if (filterProject !== "All" && exp.project !== filterProject) return false;
      if (filterCategory !== "All" && exp.category !== filterCategory) return false;
      if (filterPaymentMethod !== "All" && exp.paymentMethod !== filterPaymentMethod) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawExpenses, filterMonth, filterProject, filterCategory, filterPaymentMethod]);

  const pieExpenses = React.useMemo(() => {
    const colorPalette = [
      "bg-emerald-500", "bg-amber-500", "bg-orange-500", 
      "bg-indigo-500", "bg-cyan-500", "bg-purple-500", 
      "bg-pink-500", "bg-rose-500", "bg-blue-500"
    ];
    
    const categoryTotals: Record<string, number> = {};
    let totalAmt = 0;
    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      totalAmt += e.amount;
    });

    return Object.keys(categoryTotals).map((cat, idx) => {
      return {
        category: cat,
        amount: categoryTotals[cat],
        percentage: totalAmt > 0 ? Math.round((categoryTotals[cat] / totalAmt) * 100) : 0,
        color: colorPalette[idx % colorPalette.length]
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const pieTotalExpense = pieExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-2 animate-fade-in text-white">

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">

        {/* Cash Available */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{t.cashAvailable}</p>
            <span className="p-1 bg-emerald-500/15 rounded text-[#10B981] text-[9px] font-mono font-bold">+8.4%</span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight">
              {formatVND(db.dashboard.cashAvailable)}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">
              {lang === "en" ? "bank statement synced today" : "đã đồng bộ sao kê hôm nay"}
            </p>
          </div>
        </div>

        {/* Receivable */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{t.receivable}</p>
            <span className="p-1 bg-emerald-500/15 rounded text-[#10B981] text-[9px] font-mono font-bold">+5.1%</span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight">
              {formatVND(totalReceivable)}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">
              {lang === "en" ? "unpaid project milestones" : "các đợt thanh toán chưa nhận"}
            </p>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-[#121417] border border-[#1e2329]/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{lang === "en" ? "Total Expenditure" : "Tổng Chi Tiêu"}</p>
            <span className="p-1 bg-orange-500/15 rounded text-orange-400 text-[9px] font-mono font-bold">12% over</span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight">
              {formatVND(totalExpense)}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">
              {lang === "en" ? "operating & freelance wages" : "phụ cấp vận hành & ekip ngoài"}
            </p>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-[#121417] border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between bg-gradient-to-br from-[#121417] to-emerald-950/10">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">{lang === "en" ? "Estimated Profit" : "Ước Tính Lợi Nhuận"}</p>
            <span className="p-1 bg-emerald-500/20 rounded text-[#10B981] text-[9px] font-mono font-bold">EBITDA</span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg font-bold font-sans text-[#10B981] tracking-tight">
              {formatVND(estimatedProfit)}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">
              {lang === "en" ? "project values less expenses" : "giá trị dự án trừ chi phí vận hành"}
            </p>
          </div>
        </div>

      </div>

      {/* Cash Flow Graph */}
      <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-[#1e2329]/30 pb-4">
          <div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>{lang === "en" ? "CASH FLOW TRACKING" : "THEO DÕI DÒNG TIỀN"}</span>
            </h3>
            <p className="text-[10px] text-neutral-450 mt-1 leading-snug italic ml-[22px]">
              {lang === "en" ? "Analysis of received cash flow and expenses" : "Phân tích dòng tiền nhận được và chi phí"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Timescale selector tab */}
            <div className="flex items-center bg-[#171b21] p-0.5 rounded-lg border border-[#232a32] text-[9px] font-mono font-bold select-none">
              <button
                onClick={() => setTimescale("week")}
                type="button"
                className={`px-3 py-1 rounded-md transition duration-200 cursor-pointer ${timescale === "week" ? "bg-white text-black font-extrabold" : "text-neutral-450 hover:text-white"}`}
              >
                {lang === "en" ? "WEEK" : "TUẦN"}
              </button>
              <button
                onClick={() => setTimescale("month")}
                type="button"
                className={`px-3 py-1 rounded-md transition duration-200 cursor-pointer ${timescale === "month" ? "bg-white text-black font-extrabold" : "text-neutral-450 hover:text-white"}`}
              >
                {lang === "en" ? "MONTH" : "THÁNG"}
              </button>
              <button
                onClick={() => setTimescale("quarter")}
                type="button"
                className={`px-3 py-1 rounded-md transition duration-200 cursor-pointer ${timescale === "quarter" ? "bg-white text-black font-extrabold" : "text-neutral-450 hover:text-white"}`}
              >
                {lang === "en" ? "QUARTER" : "QUÝ"}
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-3.5 text-[10px] font-mono select-none">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2 rounded bg-emerald-500" />
                <span className="text-neutral-450">{t.in}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2 rounded bg-orange-500" />
                <span className="text-neutral-450">{t.out}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-white border border-neutral-900" />
                <span className="text-neutral-300">{t.net}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Responsive inline SVG */}
        <div className="h-32 w-full relative pt-2">

          {hoveredCf && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1e2329]/95 backdrop-blur border border-emerald-500/20 rounded-md shadow-2xl p-2.5 text-[10px] sm:text-xs z-10 pointer-events-none w-max">
              <p className="font-bold text-white mb-1.5 border-b border-neutral-700/50 pb-1 font-mono tracking-tight text-center">{hoveredCf.label}</p>
              <div className="flex flex-col gap-1 font-mono">
                <span className="text-emerald-400"><span className="text-neutral-400 mr-2">{t.in}:</span> {formatVND(hoveredCf.inflow)}</span>
                <span className="text-orange-400"><span className="text-neutral-400 mr-2">{t.out}:</span> {formatVND(Math.abs(hoveredCf.outflow))}</span>
                <span className="text-white pt-1 border-t border-neutral-800 mt-1"><span className="text-neutral-400 mr-2">{t.net}:</span> {formatVND(hoveredCf.netProfit)}</span>
              </div>
            </div>
          )}

          <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
            <line x1="0" y1="5" x2="100" y2="5" stroke="#1c2229" strokeWidth="0.2" strokeDasharray="1,1" />
            <line x1="0" y1="22.5" x2="100" y2="22.5" stroke="#1c2229" strokeWidth="0.25" />
            <line x1="0" y1="40" x2="100" y2="40" stroke="#1c2229" strokeWidth="0.2" strokeDasharray="1,1" />

            {currentData.map((cf, i) => {
              const xPos = 4 + i * spacing;
              const inflowH = (cf.inflow / maxCfVal) * 16;
              const outflowH = (Math.abs(cf.outflow) / maxCfVal) * 16;

              return (
                <g
                  key={cf.id}
                  className="group transition cursor-pointer"
                  onMouseEnter={() => setHoveredCf(cf)}
                  onMouseLeave={() => setHoveredCf(null)}
                >
                  <rect
                    x={xPos}
                    y={22.5 - inflowH}
                    width={colWidth}
                    height={inflowH}
                    className="fill-emerald-500/85 hover:fill-emerald-400 cursor-pointer"
                    rx="0.5"
                  />
                  <rect
                    x={xPos + groupOffset}
                    y={22.5}
                    width={colWidth}
                    height={outflowH}
                    className="fill-orange-500/85 hover:fill-orange-400 cursor-pointer"
                    rx="0.5"
                  />
                </g>
              );
            })}

            <path
              d={currentData.map((cf, i) => {
                const xPos = 4 + centerOffset + i * spacing;
                const offset = (cf.netProfit / maxCfVal) * 16;
                const yPos = 22.5 - offset;
                return `${i === 0 ? "M" : "L"} ${xPos} ${yPos}`;
              }).join(" ")}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
            />

            {currentData.map((cf, i) => {
              const xPos = 4 + centerOffset + i * spacing;
              const offset = (cf.netProfit / maxCfVal) * 16;
              const yPos = 22.5 - offset;
              return (
                <circle
                  key={cf.id}
                  cx={xPos}
                  cy={yPos}
                  r="0.9"
                  className="fill-neutral-900 stroke-white cursor-pointer"
                  strokeWidth="0.35"
                />
              );
            })}
          </svg>

          <div className="absolute bottom-[-10px] left-0 right-0 h-4">
            {currentData.map((cf, i) => {
              const centerPercent = 4 + centerOffset + i * spacing;
              return (
                <span
                  key={cf.id}
                  className="absolute text-[10px] font-mono text-neutral-450"
                  style={{
                    left: `${centerPercent}%`,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cf.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0">

        {/* Left Expense Details */}
        <div className="md:col-span-7 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider mb-2.5">
              {lang === "en" ? "Expense Details" : "Chi tiết chi phí"}
            </h3>
            <p className="text-[10px] text-neutral-400 mb-4 leading-snug">
              {lang === "en" ? "Detailed list of operational expenses with filters" : "Danh sách chi tiết các khoản chi phí vận hành kèm bộ lọc"}
            </p>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="bg-[#171b21] border border-[#232a32] text-white text-[10px] font-mono rounded px-2 py-1 outline-none"
              >
                <option value="All">{lang === "en" ? "All Months" : "Tất cả tháng"}</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="bg-[#171b21] border border-[#232a32] text-white text-[10px] font-mono rounded px-2 py-1 outline-none max-w-[150px] truncate"
              >
                <option value="All">{lang === "en" ? "All Projects" : "Tất cả dự án"}</option>
                {availableProjects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-[#171b21] border border-[#232a32] text-white text-[10px] font-mono rounded px-2 py-1 outline-none"
              >
                <option value="All">{lang === "en" ? "All Categories" : "Tất cả danh mục"}</option>
                {availableCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
              </select>

              <select
                value={filterPaymentMethod}
                onChange={e => setFilterPaymentMethod(e.target.value)}
                className="bg-[#171b21] border border-[#232a32] text-white text-[10px] font-mono rounded px-2 py-1 outline-none"
              >
                <option value="All">{lang === "en" ? "All Methods" : "PT thanh toán"}</option>
                {availablePaymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex-1 min-h-[400px] max-h-[500px] overflow-y-auto pr-4">
              {filteredExpenses.map((exp) => {
                const catColorRaw = categoryColors[exp.category] || 'bg-neutral-500';
                const tagTextClass = catColorRaw.replace('bg-', 'text-').replace('-500', '-400');
                const tagBgClass = catColorRaw.replace('bg-', 'bg-').replace('-500', '-950') + '/40';

                return (
                  <div
                    key={exp.id}
                    className="flex flex-col py-1.5 border-b border-neutral-800/50 hover:bg-white/[0.02] transition px-1"
                  >
                    {/* Top Row: Date+Tags on Left, Description on Right */}
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                        <span className="text-neutral-500 font-mono text-[9px] shrink-0">{exp.date}</span>
                        <div className="flex items-center gap-1 text-[8px] font-mono">
                          {exp.paymentMethod && (
                            <span className="bg-[#1a2f24] text-[#10B981] px-1 py-[1px] rounded uppercase truncate max-w-[60px]">
                              {exp.paymentMethod}
                            </span>
                          )}
                          <span className="bg-[#232a32] text-neutral-300 px-1 py-[1px] rounded uppercase truncate max-w-[80px]">{exp.project || 'Chung'}</span>
                          <span className={`px-1 py-[1px] rounded uppercase ${tagTextClass} ${tagBgClass} truncate max-w-[80px]`}>
                            {exp.category}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-neutral-500 italic font-mono truncate max-w-[130px] text-right shrink-0">
                        {exp.description || ''}
                      </span>
                    </div>

                    {/* Bottom Row: Vendor on Left, Amount on Right */}
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-white font-sans truncate min-w-0 pr-2">{exp.vendor || 'N/A'}</h4>
                      <span className="block font-bold text-white text-[11px] shrink-0">
                        {formatVND(exp.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredExpenses.length === 0 && (
                <div className="text-center py-8 text-neutral-450 text-[10px] font-mono uppercase">
                  {lang === "en" ? "No expenses found for selected filters" : "Không tìm thấy chi phí phù hợp với bộ lọc"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Expense Breakdown */}
        <div className="md:col-span-5 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider mb-1">
                {lang === "en" ? "Expense Distribution" : "Phân bổ chi phí"}
              </h3>
              <p className="text-[10px] font-mono leading-snug flex flex-wrap items-center gap-1.5">
                {expenseComparison && (
                  <span className={expenseComparison.colorClass}>{expenseComparison.text}</span>
                )}
                <span className="text-neutral-500">{lang === "en" ? "Operational Expenses" : "Cơ cấu chi phí vận hành"}</span>
              </p>
            </div>
            
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="bg-[#171b21] border border-[#232a32] text-white text-[10px] font-mono rounded px-2 py-1 outline-none shrink-0"
            >
              <option value="All">{lang === "en" ? "All Time" : "Tất cả"}</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-center justify-center p-3 relative h-44">
            <div className="w-28 h-28 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#1c2229" strokeWidth="4" />
                {pieExpenses.map((e) => {
                  const strokeDasharray = `${e.percentage} ${100 - e.percentage}`;
                  const strokeDashoffset = 100 - cumulativePercent;
                  cumulativePercent += e.percentage;
                  
                  const tailwindColors: Record<string, string> = {
                    "bg-emerald-500": "#10b981",
                    "bg-amber-500": "#f59e0b",
                    "bg-orange-500": "#f97316",
                    "bg-indigo-500": "#6366f1",
                    "bg-cyan-500": "#06b6d4",
                    "bg-purple-500": "#a855f7",
                    "bg-pink-500": "#ec4899",
                    "bg-rose-500": "#f43f5e",
                    "bg-blue-500": "#3b82f6"
                  };

                  return (
                    <circle
                      key={e.category}
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={tailwindColors[e.color] || '#888'}
                      strokeWidth="4"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-mono text-neutral-500 leading-none">{t.total}</span>
                <strong className="text-xs text-white font-sans font-black mt-1 leading-none">
                  {formatVND(pieTotalExpense).split(" ")[0]}
                </strong>
                <span className="text-[10px] text-neutral-400 font-mono mt-0.5 leading-none">VND</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[10px] font-mono">
            {pieExpenses.map((e) => {
              const textColorClass = e.color.replace('bg-', 'text-').replace('-500', '-400');
              return (
                <div key={e.category} className="flex justify-between items-center border-b border-neutral-900 pb-1.5 leading-none">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${e.color}`} />
                    <span className={`${textColorClass} font-bold`}>{translateCategory(e.category)}</span>
                  </div>
                  <div className="space-x-3.5">
                    <span className="text-neutral-450">{formatVND(e.amount)}</span>
                    <span className="font-bold" style={{ color: e.color }}>{e.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Receivables Section bottom */}
      <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-3.5 mt-2">
        <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider flex items-center space-x-1.5">
          <FileText className="w-4 h-4" />
          <span>{t.receivablesInflow}</span>
        </h3>
        <p className="text-[10px] text-neutral-400 mb-4 leading-snug">{t.receivablesInflowDesc}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {receivablesList.map((rec) => (
            <div
              key={rec.id + rec.name}
              onClick={() => onSelectProject(rec.id)}
              className="bg-[#171b21] hover:bg-[#1c2229] border border-[#232a32] p-3 rounded-lg flex items-center justify-between text-[10px] font-mono transition cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <p className="text-[10px] text-neutral-450 truncate uppercase leading-none">{rec.client}</p>
                <h4 className="text-xs font-bold text-white font-sans truncate mt-1">{rec.name}</h4>
              </div>

              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="block text-[10px] text-neutral-500 uppercase">{lang === "en" ? "Outstanding" : "Còn thiếu"}</span>
                <span className="block font-semibold text-white text-[11px] mt-0.5">
                  {formatVND(rec.outstanding)}
                </span>
                <span className={`text-[10px] font-bold border px-1.5 py-0.5 mt-1 rounded select-none ${rec.statusColor}`}>
                  {rec.statusText}
                </span>
              </div>
            </div>
          ))}

          {receivablesList.length === 0 && (
            <div className="col-span-full text-center py-8 text-neutral-450 text-[10px] font-mono uppercase">
              {lang === "en" ? "All active cash receivables are settled!" : "Tất cả các khoản phải thu đã tất toán!"}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
