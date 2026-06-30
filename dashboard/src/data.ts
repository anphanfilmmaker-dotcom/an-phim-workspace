/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleSheetDB, Project, DocumentItem, CEOAction, ProjectStatus, ProjectType, ExpenseTransaction, ProjectDocumentSet } from "./types";
import rawExcel from "./excelData.json";

// Format currency as full Vietnamese Dong: e.g. 21,600,000đ
export function formatVND(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "0đ";
  const isPositive = value >= 0;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString("vi-VN");
  return (isPositive ? "" : "-") + formatted + "đ";
}

const mappedProjects: Project[] = rawExcel.projects
  .map((p: any, idx: number) => {
  if (!p["Project Name"] || p["Project Name"].toString().trim() === "") return null;
  const giayToRow = rawExcel.giayTo ? rawExcel.giayTo[idx] : null;
  
  let budget = 100000000;
  let received = 0;
  
  if (giayToRow) {
    budget = giayToRow["Tổng cộng"] || 0;
    const dot1 = Number(giayToRow["Đợt 1"]) || 0;
    const dot2 = Number(giayToRow["Đợt 2"]) || 0;
    const dot3 = Number(giayToRow["Đợt 3"]) || 0;
    received = dot1 + dot2 + dot3;
    
    // Add extra properties to p object since the mapped project is returned below
    p.paymentD1 = dot1;
    p.paymentD2 = dot2;
    p.paymentD3 = dot3;
  } else {
    // Fallback if not found in Giấy tờ
    received = rawExcel.income.filter((i: any) => i["Project Name"] === p["Project Name"]).reduce((sum: number, i: any) => sum + (i.Amount || 0), 0);
    budget = received > 0 ? received * 1.2 : 100000000;
  }
  
  const statusMap: Record<string, ProjectStatus> = {
    "Hoàn thành": "Hoàn thành",
    "Đang làm": "Đang làm",
    "On hold": "Tạm dừng"
  };

  const projectTypeMap: Record<string, ProjectType> = {
    "AI Render": "AI Render",
    "Marketing": "Marketing",
    "AI Image": "AI image",
    "AI Film": "AI Film",
    "Script": "Script",
    "Graphic": "Graphic"
  };

  const status = statusMap[p["Stage Status"]] || "Chưa bắt đầu";
  let dueDateStr = "Dec 31, 2026";
  if (p.Due) {
    const d = new Date(p.Due);
    if (!isNaN(d.getTime())) dueDateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return {
    id: `proj_${p.ID || idx}`,
    name: p["Project Name"] || "Unnamed",
    client: p.Client || "Unknown",
    status,
    budget,
    received,
    paymentD1: p.paymentD1 || 0,
    paymentD2: p.paymentD2 || 0,
    paymentD3: p.paymentD3 || 0,
    dueDate: dueDateStr,
    nextAction: p["Next Action"] || "",
    nextActionDue: dueDateStr,
    projectType: projectTypeMap[p.Type] || "Video",
    milestones: [
      { name: "Brief / Scope", date: "20/06/2026", completed: true },
      { name: "Pre-Production", date: "25/06/2026", completed: true },
      { name: "Draft idea", date: "01/07/2026", completed: false },
      { name: "Storyboard", date: "05/07/2026", completed: false },
      { name: "Production", date: "15/07/2026", completed: false },
      { name: "Offline", date: "20/07/2026", completed: false },
      { name: "Online", date: "25/07/2026", completed: false },
      { name: "Delivery", date: "30/07/2026", completed: false },
      { name: "Final / Close-out", date: "05/08/2026", completed: false },
    ],
    paymentPhase: "Phase 1 of 3",
    paymentPhaseProgress: budget > 0 ? Math.round((received / budget) * 100) : 0,
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    notes: p.Notes || ""
  };
}).filter(Boolean) as Project[];

const mappedExpenses: ExpenseTransaction[] = rawExcel.expense
  .filter((e: any) => e.Amount || e["Vendor / Payee"] || e["Description / Note"])
  .map((e: any, idx: number) => {
  let dateStr = "2026-06-01";
  if (e.Date) {
     const d = new Date(e.Date);
     if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
  }
  
  // Standardize category strings to match our UI
  let cat = e["Expense Category"] || "Others";
  if (cat === "AI tools") cat = "AI Tools";
  if (cat === "Tax / Fees") cat = "Taxe/Fees";
  if (cat === "Office / Admin") cat = "Office/Admin";

  return {
    id: `exp_${idx}`,
    date: dateStr,
    category: cat,
    project: e["Project Name"] || "Others",
    vendor: e["Vendor / Payee"] || "",
    description: e["Description / Note"] || "",
    paymentMethod: e["Payment Method"] || "",
    amount: e.Amount || 0
  };
});

const mappedProjectDocuments: ProjectDocumentSet[] = rawExcel.giayTo
  ? rawExcel.giayTo.map((g: any, idx: number) => {
      const projName = (g["Project Name"] || (rawExcel.projects && rawExcel.projects[idx] ? rawExcel.projects[idx]["Project Name"] : ""));
      if (!projName || projName.toString().trim() === "") return null;
      
      const checkStatus = (val: any) => typeof val === "string" && val.trim().toLowerCase() === "x";
      return {
        projectId: `proj_v22_${idx}`,
        projectName: projName,
        quote: checkStatus(g["Báo giá"]),
        contract: checkStatus(g["Hợp đồng"]),
        vatR1: checkStatus(g["VAT R1"]),
        vatR2: checkStatus(g["VAT R2"]),
        vatR3: checkStatus(g["VAT R3"]),
        liquidation: checkStatus(g["BBTL"] || g["BB Thanh Lý"]),
      };
    }).filter(Boolean) as ProjectDocumentSet[]
  : [];

const templateDocs: DocumentItem[] = [
  {
    id: "tpl_1",
    name: "Template_Hop_Dong_Dich_Vu.docx",
    project: "Templates",
    type: "Contract",
    status: "Approved",
    owner: "Admin",
    lastUpdated: "Jan 1, 2026 09:00 AM",
    fileSize: "2.1 MB",
    isUrgent: false
  },
  {
    id: "tpl_2",
    name: "Template_Bao_Gia_Chuan.xlsx",
    project: "Templates",
    type: "Budget",
    status: "Approved",
    owner: "Admin",
    lastUpdated: "Jan 1, 2026 09:00 AM",
    fileSize: "1.5 MB",
    isUrgent: false
  }
];

const colorPalette = [
  "bg-emerald-500", "bg-amber-500", "bg-orange-500", 
  "bg-indigo-500", "bg-cyan-500", "bg-purple-500", 
  "bg-pink-500", "bg-rose-500", "bg-blue-500",
  "bg-red-500", "bg-lime-500", "bg-fuchsia-500",
  "bg-yellow-500", "bg-teal-500", "bg-sky-500",
  "bg-violet-500", "bg-emerald-300", "bg-amber-300",
  "bg-orange-300", "bg-indigo-300", "bg-cyan-300",
  "bg-purple-300", "bg-pink-300", "bg-rose-300",
  "bg-blue-300", "bg-red-300", "bg-lime-300"
];

const categoryTotals: Record<string, number> = {};
let totalExpensesAmt = 0;
mappedExpenses.forEach(e => {
  categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  totalExpensesAmt += e.amount;
});

const dynamicExpenses = Object.keys(categoryTotals).map((cat, idx) => {
  return {
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpensesAmt > 0 ? Math.round((categoryTotals[cat] / totalExpensesAmt) * 100) : 0,
    color: colorPalette[idx % colorPalette.length]
  };
}).sort((a, b) => b.amount - a.amount);

export const INITIAL_SHEET_DATA: GoogleSheetDB = {
  dashboard: {
    cashAvailable: 0,
    cashAvailableChange: "0% vs last week",
    receivable: 0,
    receivableChange: "0% vs last week",
    activeProjectsCount: 0,
    activeProjectsChange: "0 vs last week",
    actionsCount: 0,
    actionsCompletedCount: 0,
  },
  projects: [],
  expenses: [],
  expenseTransactions: [],
  incomes: [],
  projectDocuments: [],
  actions: [],
  agents: [],
  tasks: [],
  schedule: [],
  agentPerformance: {
    completionRate: 0,
    completionRateChange: "0% vs last week",
    avgResponseTimeHours: 0,
    avgResponseTimeChange: "0h vs last week",
    blockedTasksCount: 0,
    blockedTasksChange: "0 vs last week",
  },
};

const LOCAL_STORAGE_KEY = "anphim_os_google_sheet_data_v33";

// Retrieve DB from local storage or fall back to mock data
export function getStoredSheetData(): GoogleSheetDB {
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      // Perform simple validation to make sure it contains elements
      if (parsed.projects && parsed.projects.length > 0) {
        // Enforce dynamic calculation of cashAvailable from stored values to ensure consistency
        const totalReceived = parsed.projects.reduce((sum: any, p: any) => sum + (p.received || 0), 0);
        const totalExpense = parsed.expenses ? parsed.expenses.reduce((sum: any, e: any) => sum + (e.amount || 0), 0) : 0;
        parsed.dashboard.cashAvailable = (totalReceived * 0.92) - totalExpense;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read local storage", e);
  }
  
  // Set default if empty
  setStoredSheetData(INITIAL_SHEET_DATA);
  return INITIAL_SHEET_DATA;
}

// Write DB to local storage
export function setStoredSheetData(data: GoogleSheetDB) {
  try {
    // Re-calculate some summary metrics dynamically before saving to ensure state consistency
    const updatedData = { ...data };
    
    // Active projects status counts
    const activeProjects = updatedData.projects.filter(p => p.status !== "Hoàn thành");
    updatedData.dashboard.activeProjectsCount = activeProjects.length;
    
    // Total receivables
    let totalReceivables = 0;
    updatedData.projects.forEach(p => {
      const missing = p.budget - p.received;
      if (missing > 0 && p.status !== "Hoàn thành") {
        totalReceivables += missing;
      }
    });
    updatedData.dashboard.receivable = totalReceivables;
    
    // Total actions count
    updatedData.dashboard.actionsCount = updatedData.actions.length;
    updatedData.dashboard.actionsCompletedCount = updatedData.actions.filter(a => a.status === "Done").length;

    // Total cash available
    const totalReceived = updatedData.projects.reduce((sum, p) => sum + p.received, 0);
    const totalExpense = updatedData.expenses.reduce((sum, e) => sum + e.amount, 0);
    updatedData.dashboard.cashAvailable = (totalReceived * 0.92) - totalExpense;

    // Save
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
  } catch (e) {
    console.error("Failed to write to local storage", e);
  }
}

// Reset store to default
export function resetStoredSheetData(): GoogleSheetDB {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SHEET_DATA));
  return INITIAL_SHEET_DATA;
}
