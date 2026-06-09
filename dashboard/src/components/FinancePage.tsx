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

  const monthlyCashFlow = React.useMemo(() => {
    const map = new Map();
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    db.cashFlow.forEach(cf => {
      const monthEng = cf.label.split(' ')[0];
      const monthMap = { "Jan":"Thg 1", "Feb":"Thg 2", "Mar":"Thg 3", "Apr":"Thg 4", "May":"Thg 5", "Jun":"Thg 6", "Jul":"Thg 7", "Aug":"Thg 8", "Sep":"Thg 9", "Oct":"Thg 10", "Nov":"Thg 11", "Dec":"Thg 12" };
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
    .filter(p => p.status !== "Completed")
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
        progress: Math.round((p.received / p.budget) * 100),
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
    if (lang === "en") return cat;
    const map: Record<string, string> = {
      "Production": "Sản xuất Phim",
      "Freelancer": "Nhân sự Ngoài",
      "AI Tools": "Công cụ AI Core",
      "Admin": "Sự vụ hành chính",
      "Others": "Danh mục khác"
    };
    return map[cat] || cat;
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

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
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
              <span>{t.weeklyNetLedger}</span>
            </h3>
            <p className="text-[10px] text-neutral-450 mt-1 leading-snug">
              {timescale === "week" 
                ? (lang === "en" ? "Weekly stream analysis indicating project milestone clearances." : "Dòng tiền hàng tuần: Phân tích tiền cọc nhận được và chi phí sản xuất phim")
                : timescale === "month"
                  ? (lang === "en" ? "Cumulative record of contract inflows and media expenditures." : "Dòng tiền hàng tháng: Tổng hợp các hợp đồng phim và chi phí studio tích lũy")
                  : (lang === "en" ? "Financial quarterly sheet on return of investment and overheads." : "Dòng tiền hàng quý: Báo cáo tài chính quý về các khoản đầu tư và biên lợi nhuận")}
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
        <div className="h-44 w-full relative pt-2">
          
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        
        {/* Left Receivables list */}
        <div className="md:col-span-7 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider mb-2.5">
              {t.receivablesInflow}
            </h3>
            <p className="text-[10px] text-neutral-400 mb-4 leading-snug">{t.receivablesInflowDesc}</p>

            <div className="space-y-3">
              {receivablesList.map((rec) => (
                <div 
                  key={rec.id + rec.name}
                  onClick={() => onSelectProject(rec.id)}
                  className="bg-[#171b21] hover:bg-[#1c2229] border border-[#232a32] p-3 rounded-lg flex items-center justify-between text-[10px] font-mono transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-450 truncate uppercase leading-none">{rec.client}</p>
                    <h4 className="text-xs font-bold text-white font-sans truncate mt-1">{rec.name}</h4>
                  </div>

                  <div className="flex items-center space-x-5 shrink-0">
                    <div className="text-right">
                      <span className="block text-[10px] text-neutral-500 uppercase">{lang === "en" ? "Outstanding" : "Còn thiếu"}</span>
                      <span className="block font-semibold text-white text-[11px] mt-0.5">
                        {formatVND(rec.outstanding)}
                      </span>
                      <span className="block text-[10px] text-neutral-400 mt-0.5">({rec.progress}% {lang === "en" ? "paid" : "đã thu"})</span>
                    </div>

                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded select-none ${rec.statusColor}`}>
                      {rec.statusText}
                    </span>
                  </div>
                </div>
              ))}

              {receivablesList.length === 0 && (
                <div className="text-center py-8 text-neutral-450 text-[10px] font-mono uppercase">
                  {lang === "en" ? "All active cash receivables are settled!" : "Tất cả các khoản phải thu đã tất toán!"}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-neutral-800/40 pt-3.5 mt-4 text-center">
            <span className="text-[10px] text-neutral-500 font-mono leading-none">
              {lang === "en" ? "Calculated dynamically directly from AN PHIM projects worksheet tab" : "Dữ liệu được lấy và tính toán trực tiếp từ trang tính Sổ Cái AN PHIM"}
            </span>
          </div>

        </div>

        {/* Right Expense Breakdown */}
        <div className="md:col-span-5 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider mb-1">
              {t.expenseDistribution}
            </h3>
            <p className="text-[10px] text-neutral-400 leading-snug">
              {lang === "en" ? "Total operational outlays parsed by sector" : "Cơ cấu chi phí vận hành studio phân loại theo danh mục"}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-3 relative bg-[#171b21] border border-[#232a32] rounded-xl h-44">
            <div className="w-28 h-28 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#1c2229" strokeWidth="4" />
                {db.expenses.map((e) => {
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
                      stroke={e.color}
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
                  {formatVND(totalExpense).split(" ")[0]}
                </strong>
                <span className="text-[10px] text-neutral-400 font-mono mt-0.5 leading-none">VND</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[10px] font-mono">
            {db.expenses.map((e) => {
              return (
                <div key={e.category} className="flex justify-between items-center border-b border-neutral-900 pb-1.5 leading-none">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-neutral-300 font-bold">{translateCategory(e.category)}</span>
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

      {/* Finance Alerts Section bottom */}
      <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-3.5">
        <h3 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest flex items-center space-x-1.5">
          <BadgeAlert className="w-4 h-4" />
          <span>{t.alertsNotifications}</span>
        </h3>

        <div className="space-y-2.5">
          {db.alerts.map((al) => {
            const isCleared = al.status === "Reviewed";
            if (isCleared) return null;
            
            return (
              <div 
                key={al.id}
                className="bg-[#171b21] p-3 rounded-xl border border-red-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[10px] text-white"
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-red-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                      {translateAlertType(al.type)}
                    </span>
                    <p className="text-neutral-300 pr-4 mt-0.5 leading-snug">{al.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 justify-end">
                  <button
                    onClick={() => {
                      const p = db.projects.find(proj => proj.name === al.project);
                      if (p) onSelectProject(p.id);
                    }}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded font-sans transition text-[10px] cursor-pointer"
                  >
                    {lang === "en" ? "Locate Project" : "Tìm dự án"}
                  </button>
                  <button
                    onClick={() => {
                      onClearAlert(al.id);
                      setSelectedAlertNote(lang === "en" ? `Cleared alert: ${al.description}` : `Đã xem xét cảnh báo: ${al.description}`);
                      setTimeout(() => setSelectedAlertNote(null), 3000);
                    }}
                    className="px-3 py-1.5 bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white rounded font-sans transition text-[10px] cursor-pointer"
                  >
                    {lang === "en" ? "Clear alert" : "Bỏ qua"}
                  </button>
                </div>
              </div>
            );
          })}

          {db.alerts.filter(a => a.status === "Pending").length === 0 && (
            <div className="text-center py-6 border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-[10px] font-mono uppercase">
              {t.noAlerts}
            </div>
          )}
        </div>

        {selectedAlertNote && (
          <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded p-2.5 text-[10px] font-mono text-center">
            {selectedAlertNote}
          </div>
        )}
      </div>

    </div>
  );
}
