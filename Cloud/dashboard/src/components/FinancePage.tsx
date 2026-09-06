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
  BadgeAlert,
  Wallet, Percent, Download, Calendar, Search, SlidersHorizontal, ChevronDown, CheckCircle2, AlertCircle, CircleDashed
} from "lucide-react";

export interface CategoryConfig {
  bg: string;
  text: string;
  tagBg: string;
  border: string;
  hex: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "AI tools":        { bg: "bg-sky-500",     text: "text-sky-400",     tagBg: "bg-sky-950/40",     border: "border-sky-800/40",     hex: "#0ea5e9" },
  "Freelancer":      { bg: "bg-pink-500",    text: "text-pink-400",    tagBg: "bg-pink-950/40",    border: "border-pink-800/40",    hex: "#ec4899" },
  "Food / Meeting":  { bg: "bg-amber-500",   text: "text-amber-400",   tagBg: "bg-amber-950/40",   border: "border-amber-800/40",   hex: "#f59e0b" },
  "Shopping":        { bg: "bg-orange-500",  text: "text-orange-400",  tagBg: "bg-orange-950/40",  border: "border-orange-800/40",  hex: "#f97316" },
  "Personal":        { bg: "bg-emerald-500", text: "text-emerald-400", tagBg: "bg-emerald-950/40", border: "border-emerald-800/40", hex: "#10b981" },
  "Gia đình & Định kỳ": { bg: "bg-cyan-500", text: "text-cyan-400",    tagBg: "bg-cyan-950/40",    border: "border-cyan-800/40",    hex: "#06b6d4" },
  "Health Care":     { bg: "bg-teal-400",    text: "text-teal-300",    tagBg: "bg-teal-950/40",    border: "border-teal-800/40",    hex: "#2dd4bf" },
  "Marketing":       { bg: "bg-purple-500",  text: "text-purple-400",  tagBg: "bg-purple-950/40",  border: "border-purple-800/40",  hex: "#a855f7" },
  "Sales":           { bg: "bg-yellow-400",  text: "text-yellow-400",  tagBg: "bg-yellow-950/40",  border: "border-yellow-800/40",  hex: "#facc15" },
  "Software / SaaS": { bg: "bg-indigo-500",  text: "text-indigo-400",  tagBg: "bg-indigo-950/40",  border: "border-indigo-800/40",  hex: "#6366f1" },
  "Vay / Nợ":        { bg: "bg-red-500",     text: "text-red-400",     tagBg: "bg-red-950/40",     border: "border-red-800/40",     hex: "#ef4444" },
  "Tax / Fees":      { bg: "bg-rose-500",    text: "text-rose-400",    tagBg: "bg-rose-950/40",    border: "border-rose-800/40",    hex: "#f43f5e" },
  "Office / Admin":  { bg: "bg-blue-600",    text: "text-blue-400",    tagBg: "bg-blue-950/40",    border: "border-blue-800/40",    hex: "#2563eb" },
  "Other":           { bg: "bg-slate-400",   text: "text-slate-300",   tagBg: "bg-slate-900/50",   border: "border-slate-700/40",   hex: "#94a3b8" },
};

export const getCategoryStyles = (cat: string): CategoryConfig => {
  if (CATEGORY_CONFIG[cat]) return CATEGORY_CONFIG[cat];
  const lower = (cat || "").toLowerCase().replace(/\s+/g, '');
  for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
    if (key.toLowerCase().replace(/\s+/g, '') === lower) return cfg;
  }
  return { bg: "bg-slate-500", text: "text-slate-400", tagBg: "bg-slate-900/40", border: "border-slate-700/40", hex: "#64748b" };
};

const CATEGORY_COLORS: Record<string, string> = new Proxy({}, {
  get: (_, prop: string) => getCategoryStyles(prop).bg
});
import { translations } from "../translations";

interface FinancePageProps {
  db: GoogleSheetDB;
  onSelectProject: (projectId: string) => void;
  lang: "en" | "vi";
}

export default function FinancePage({
  db,
  onSelectProject,
  lang,
}: FinancePageProps) {
  const t = translations[lang];
  const [selectedAlertNote, setSelectedAlertNote] = useState<string | null>(null);
  const [timescale, setTimescale] = useState<"day" | "month" | "quarter">("day");
  const [hoveredCf, setHoveredCf] = useState<any>(null);

  // Filters for Expense Details
  const [filterMonth, setFilterMonth] = React.useState("All");
  const [filterProject, setFilterProject] = React.useState("All");
  const [filterCategory, setFilterCategory] = React.useState("All");
  const [filterPaymentMethod, setFilterPaymentMethod] = React.useState("All");

  const currentData = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const currentYear = today.getFullYear();

    const dataBuckets: any[] = [];

    if (timescale === "day") {
      // Days of the current month
      const numDays = new Date(currentYear, today.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= numDays; i++) {
        const d = new Date(currentYear, today.getMonth(), i);
        dataBuckets.push({
          id: `d_${i}`,
          label: String(i),
          dateVal: d.getTime(),
          inflow: 0,
          outflow: 0,
          netProfit: 0,
          isToday: i === today.getDate(),
          isFuture: i > today.getDate()
        });
      }
    } else if (timescale === "month") {
      // 12 weeks ending this week
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentMonday = new Date(today.getTime() + diffToMonday * 86400000);

      for (let i = 11; i >= 0; i--) {
        const wMonday = new Date(currentMonday.getTime() - i * 7 * 86400000);
        const wSunday = new Date(wMonday.getTime() + 6 * 86400000);
        wSunday.setHours(23, 59, 59, 999);

        dataBuckets.push({
          id: `wk_${11 - i}`,
          label: `${wMonday.getDate()}/${wMonday.getMonth() + 1}`,
          startDate: wMonday.getTime(),
          endDate: wSunday.getTime(),
          inflow: 0,
          outflow: 0,
          netProfit: 0,
          isToday: i === 0,
          isFuture: false
        });
      }
    } else if (timescale === "quarter") {
      // 4 quarters
      const currentQ = Math.floor(today.getMonth() / 3) + 1;
      for (let i = 1; i <= 4; i++) {
        dataBuckets.push({
          id: `q_${i}`,
          label: `Q${i}/${String(currentYear).slice(2)}`,
          quarterIdx: i,
          inflow: 0,
          outflow: 0,
          netProfit: 0,
          isToday: i === currentQ,
          isFuture: i > currentQ
        });
      }
    }

    const processItem = (dateStr: string, amount: number, isIncome: boolean) => {
      if (!dateStr || !amount) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      if (timescale === "day") {
        // Find which bucket this day belongs to
        const itemTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const bucket = dataBuckets.find(b => b.dateVal === itemTime);
        if (bucket) {
          if (isIncome) bucket.inflow += amount;
          else bucket.outflow -= amount; // outflow is negative
        }
      } else if (timescale === "month") {
        const itemTime = d.getTime();
        const bucket = dataBuckets.find(b => itemTime >= b.startDate && itemTime <= b.endDate);
        if (bucket) {
          if (isIncome) bucket.inflow += amount;
          else bucket.outflow -= amount;
        }
      } else if (timescale === "quarter") {
        if (d.getFullYear() === currentYear) {
          const qIdx = Math.floor(d.getMonth() / 3) + 1;
          const bucket = dataBuckets.find(b => b.quarterIdx === qIdx);
          if (bucket) {
            if (isIncome) bucket.inflow += amount;
            else bucket.outflow -= amount;
          }
        }
      }
    };

    (db.incomes || []).forEach(inc => processItem(inc.date, Number(inc.amount) || 0, true));
    (db.expenseTransactions || []).forEach(exp => processItem(exp.date, Number(exp.amount) || 0, false));

    let totalHistoricalNet = 0;
    let netBeforeFirstBucket = 0;
    let firstBucketStartMs = 0;
    if (timescale === "day") {
      firstBucketStartMs = new Date(currentYear, today.getMonth(), 1).getTime();
    } else if (timescale === "month") {
      firstBucketStartMs = dataBuckets[0].startDate;
    } else {
      firstBucketStartMs = new Date(currentYear, 0, 1).getTime();
    }

    (db.incomes || []).forEach(inc => {
      const d = new Date(inc.date);
      if (!isNaN(d.getTime())) {
        const amt = Number(inc.amount) || 0;
        totalHistoricalNet += amt;
        if (d.getTime() < firstBucketStartMs) netBeforeFirstBucket += amt;
      }
    });
    (db.expenseTransactions || []).forEach(exp => {
      const d = new Date(exp.date);
      if (!isNaN(d.getTime())) {
        const amt = Number(exp.amount) || 0;
        totalHistoricalNet -= amt;
        if (d.getTime() < firstBucketStartMs) netBeforeFirstBucket -= amt;
      }
    });

    // The cash starts at 0 at the very beginning of tracking history
    let runningCash = netBeforeFirstBucket;

    dataBuckets.forEach(b => {
      b.netProfit = b.inflow + b.outflow;
      runningCash += b.netProfit;
      b.availableCash = runningCash;
    });

    return dataBuckets;
  }, [db.incomes, db.expenseTransactions, timescale, lang]);

  const totalReceivable = db.projects
    .filter(p => p.status !== "Hoàn thành")
    .reduce((sum, p) => sum + (p.budget - p.received), 0);

  const totalExpense = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  const estimatedProfit = db.projects.reduce((sum, p) => {
    const projectExpenses = (db.expenseTransactions || [])
      .filter(e => e.project === p.name)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return sum + (Math.round(p.received / 1.08) - projectExpenses);
  }, 0);

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
      } else if (String(p.dueDate || "").includes("/07/") || String(p.dueDate || "").includes("/08/")) {
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
  const maxAbsCash = Math.max(...currentData.map(cf => Math.abs(cf.availableCash))) || 1;

  let cumulativePercent = 0;

  const nItems = currentData.length;
  const paddingX = 4;
  const availableWidth = 100 - paddingX * 2;
  const spacing = nItems > 1 ? availableWidth / (nItems - 1) : availableWidth;

  let colWidth = 2.5;
  if (nItems > 10) colWidth = 1.5; // 12 months
  else if (nItems < 5) colWidth = 4.0; // 4 quarters
  else colWidth = 2.5; // 7 days

  const groupOffset = colWidth * 1.15;
  const centerOffset = (groupOffset + colWidth) / 2;

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
        currWeekTotal += Number(e.amount) || 0;
      } else if (d > prev7DaysStart && d <= last7DaysStart) {
        prevWeekTotal += Number(e.amount) || 0;
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
    const projectStatusMap = new Map<string, string>();
    db.projects.forEach(p => projectStatusMap.set(p.name, p.status));

    const pList = new Set<string>();
    db.projects.forEach(p => pList.add(p.name));
    pList.add("Cá nhân");
    pList.add("Công ty");
    rawExpenses.forEach(e => {
      if (e.project) pList.add(e.project);
    });

    const activeList: string[] = [];
    const completedList: string[] = [];

    Array.from(pList).forEach(pName => {
      const status = projectStatusMap.get(pName);
      if (status === "Hoàn thành") {
        completedList.push(pName);
      } else {
        activeList.push(pName);
      }
    });

    // Sort active: System projects first (Cá nhân, Công ty), then alphabetically
    activeList.sort((a, b) => {
      const isSystemA = a === "Cá nhân" || a === "Công ty";
      const isSystemB = b === "Cá nhân" || b === "Công ty";
      if (isSystemA && !isSystemB) return -1;
      if (!isSystemA && isSystemB) return 1;
      return a.localeCompare(b, 'vi');
    });

    // Sort completed alphabetically
    completedList.sort((a, b) => a.localeCompare(b, 'vi'));

    return {
      all: [...activeList, ...completedList],
      active: activeList,
      completed: completedList
    };
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
    const categoryTotals: Record<string, number> = {};
    let totalAmt = 0;
    filteredExpenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
      totalAmt += amt;
    });

    return Object.keys(categoryTotals).map((cat) => {
      const styles = getCategoryStyles(cat);
      return {
        category: cat,
        amount: categoryTotals[cat],
        percentage: totalAmt > 0 ? Math.round((categoryTotals[cat] / totalAmt) * 100) : 0,
        color: styles.bg,
        hex: styles.hex,
        text: styles.text,
        tagBg: styles.tagBg,
        border: styles.border
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1 border-b border-[#1e2329]/30 pb-4">
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
                onClick={() => setTimescale("day")}
                type="button"
                className={`px-3 py-1 rounded-md transition duration-200 cursor-pointer ${timescale === "day" ? "bg-white text-black font-extrabold" : "text-neutral-450 hover:text-white"}`}
              >
                {lang === "en" ? "DAY" : "NGÀY"}
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
        <div className="h-36 w-full relative py-2 mb-4">
          <div className="relative w-full h-full">

            {hoveredCf && (
              <div 
                className="absolute top-0 bg-[#1e2329]/95 backdrop-blur border border-emerald-500/20 rounded-md shadow-2xl p-2.5 text-[10px] sm:text-xs z-20 pointer-events-none w-max"
                style={{
                  left: hoveredCf.xPos < 50 ? `calc(${hoveredCf.xPos}% + 20px)` : `calc(${hoveredCf.xPos}% - 20px)`,
                  transform: hoveredCf.xPos < 50 ? 'translateX(0)' : 'translateX(-100%)',
                  marginTop: '-10px'
                }}
              >
                <p className="font-bold text-white mb-1.5 border-b border-neutral-700/50 pb-1 font-mono tracking-tight text-center">
                  {(() => {
                    if (timescale === "day" && hoveredCf.dateVal) {
                      const d = new Date(hoveredCf.dateVal);
                      if (lang === "vi") {
                        const weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
                        return `${weekdays[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}`;
                      } else {
                        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
                      }
                    }
                    return hoveredCf.label;
                  })()}
                </p>
                <div className="flex flex-col gap-1 font-mono">
                  <span className="text-emerald-400"><span className="text-neutral-400 mr-2">{t.in}:</span> {formatVND(hoveredCf.inflow)}</span>
                  <span className="text-orange-400"><span className="text-neutral-400 mr-2">{t.out}:</span> {formatVND(Math.abs(hoveredCf.outflow))}</span>
                  <span className="text-white pt-1 border-t border-neutral-800 mt-1"><span className="text-neutral-400 mr-2">{lang === "en" ? "Cash:" : "Tiền mặt:"}</span> {formatVND(hoveredCf.availableCash)}</span>
                </div>
              </div>
            )}

          <svg viewBox="0 0 100 45" preserveAspectRatio="none" className="w-full h-full overflow-visible">
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
                  onMouseEnter={() => setHoveredCf({ ...cf, xPos: 4 + centerOffset + i * spacing })}
                  onMouseLeave={() => setHoveredCf(null)}
                >
                  {/* Invisible hitbox for easier hovering, spanning full vertical height */}
                  <rect
                    x={xPos - 0.5}
                    y={0}
                    width={groupOffset + colWidth + 1}
                    height={45}
                    fill="transparent"
                  />
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
              d={currentData.filter(cf => !cf.isFuture).map((cf, idx) => {
                const originalIndex = currentData.findIndex(c => c.id === cf.id);
                const xPos = 4 + centerOffset + originalIndex * spacing;
                const offset = (cf.availableCash / maxAbsCash) * 16;
                const yPos = 22.5 - offset;
                return `${idx === 0 ? "M" : "L"} ${xPos} ${yPos}`;
              }).join(" ")}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          </svg>

          {/* Draw today's dot using absolute HTML div inside wrapper to prevent SVG distortion */}
          {currentData.filter(cf => cf.isToday).map((cf) => {
            const originalIndex = currentData.findIndex(c => c.id === cf.id);
            const xPos = 4 + centerOffset + originalIndex * spacing;
            const offset = (cf.availableCash / maxAbsCash) * 16;
            const yPos = 22.5 - offset;
            const topPercent = (yPos / 45) * 100;
            return (
              <div
                key={`today-dot-${cf.id}`}
                className="absolute w-2 h-2 rounded-full bg-white z-10 animate-pulse"
                style={{
                  left: `${xPos}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 1)'
                }}
              />
            );
          })}

          <div className="absolute bottom-[-24px] left-0 right-0 h-4">
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

        </div> {/* End of inner wrapper */}
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
                <optgroup label={lang === "en" ? "── Active / In Progress ──" : "── Đang hoạt động ──"}>
                  {availableProjects.active.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
                {availableProjects.completed.length > 0 && (
                  <optgroup label={lang === "en" ? "── Completed Projects ──" : "── Đã hoàn thành ──"}>
                    {availableProjects.completed.map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                )}
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
                const catStyle = getCategoryStyles(exp.category);

                const getPaymentMethodColor = (method: string) => {
                  const m = method.toLowerCase();
                  if (m.includes('momo')) return 'bg-pink-950/40 text-pink-400';
                  if (m.includes('chuyển khoản') || m === 'ck') return 'bg-emerald-950/40 text-emerald-400';
                  if (m.includes('cash') || m.includes('tiền mặt')) return 'bg-blue-950/40 text-blue-400';
                  if (m.includes('credit') || m.includes('thẻ')) return 'bg-orange-950/40 text-orange-400';
                  return 'bg-neutral-800 text-neutral-400';
                };

                const getProjectColor = (projName?: string) => {
                  if (!projName) return 'bg-[#232a32] text-neutral-400 border border-neutral-700/40';
                  const lower = projName.toLowerCase();
                  if (lower.includes('công ty')) return 'bg-blue-950/40 text-blue-300 border border-blue-800/40';
                  if (lower.includes('cá nhân')) return 'bg-purple-950/40 text-purple-300 border border-purple-800/40';
                  if (lower.includes('chung')) return 'bg-[#232a32] text-neutral-400 border border-neutral-700/40';
                  return 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40';
                };

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
                            <span className={`px-1 py-[1px] rounded uppercase truncate max-w-[60px] ${getPaymentMethodColor(exp.paymentMethod)}`}>
                              {exp.paymentMethod}
                            </span>
                          )}
                          <span className={`px-1 py-[1px] rounded uppercase truncate max-w-[90px] ${getProjectColor(exp.project)}`}>
                            {exp.project || 'Chung'}
                          </span>
                          <span className={`px-1 py-[1px] rounded uppercase ${catStyle.text} ${catStyle.tagBg} border ${catStyle.border} truncate max-w-[90px]`}>
                            {exp.category}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-neutral-500 italic font-mono truncate max-w-[130px] text-right shrink-0">
                        {exp.description && !exp.description.startsWith('The 5203') ? exp.description : ''}
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

                  return (
                    <circle
                      key={e.category}
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={e.hex}
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
              return (
                <div key={e.category} className="flex justify-between items-center border-b border-neutral-900 pb-1.5 leading-none">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${e.color} shrink-0`} style={{ backgroundColor: e.hex }} />
                    <span className={`${e.text} font-bold`}>{translateCategory(e.category)}</span>
                  </div>
                  <div className="space-x-3.5">
                    <span className="text-neutral-450">{formatVND(e.amount)}</span>
                    <span className="font-bold" style={{ color: e.hex }}>{e.percentage}%</span>
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
