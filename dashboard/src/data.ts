/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleSheetDB, Project, DocumentItem, CEOAction, ProjectStatus, ProjectType, ExpenseTransaction } from "./types";
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
    if (!isNaN(d.getTime())) dueDateStr = d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
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
    milestones: [],
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

const colorPalette = [
  "bg-emerald-500", "bg-amber-500", "bg-orange-500", 
  "bg-indigo-500", "bg-cyan-500", "bg-purple-500", 
  "bg-pink-500", "bg-rose-500", "bg-blue-500"
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

// Initial mockup dataset based directly on the provided screenshots and company context "AN PHIM"
export const INITIAL_SHEET_DATA: GoogleSheetDB = {
  dashboard: {
    cashAvailable: 2_480_000_000,
    cashAvailableChange: "8.4% vs last week",
    receivable: 6_310_000_000,
    receivableChange: "5.1% vs last week",
    activeProjectsCount: 12,
    activeProjectsChange: "2 vs last week",
    actionsCount: 6,
    actionsCompletedCount: 4,
  },
  projects: mappedProjects,
  cashFlow: [
    { id: "cf_1", label: "Mon, Jun 1", inflow: 450_000_000, outflow: 150_000_000, netProfit: 300_000_000 },
    { id: "cf_2", label: "Tue, Jun 2", inflow: 380_000_000, outflow: 120_000_000, netProfit: 260_000_000 },
    { id: "cf_3", label: "Wed, Jun 3", inflow: 620_000_000, outflow: 210_000_000, netProfit: 410_000_000 },
    { id: "cf_4", label: "Thu, Jun 4", inflow: 510_000_000, outflow: 180_000_000, netProfit: 330_000_000 },
    { id: "cf_5", label: "Fri, Jun 5", inflow: 300_000_000, outflow: 420_000_000, netProfit: -120_000_000 },
    { id: "cf_6", label: "Sat, Jun 6", inflow: 220_000_000, outflow: 90_000_000, netProfit: 130_000_000 },
    { id: "cf_7", label: "Sun, Jun 7", inflow: 980_000_000, outflow: 130_000_000, netProfit: 850_000_000 },
  ],
  expenses: dynamicExpenses,
  alerts: [
    {
      id: "al_1",
      type: "Overdue Payment",
      description: "TVC Launch Film is overdue by 3 days.",
      project: "TVC Launch Film",
      urgency: "High",
      status: "Pending",
    },
    {
      id: "al_2",
      type: "Over-Budget Project",
      description: "Real Estate Key Visual is 12% over budget.",
      project: "Real Estate Key Visual",
      urgency: "High",
      status: "Pending",
    },
    {
      id: "al_3",
      type: "Missing Invoice",
      description: "Invoice for Social Campaign Retainer is missing.",
      project: "Social Campaign Retainer",
      urgency: "High",
      status: "Pending",
    }
  ],
  documents: [
    {
      id: "doc_1",
      name: "Contract_TVC Launch Film.pdf",
      project: "TVC Launch Film",
      type: "Contract",
      status: "Signed",
      owner: "Alex Nguyen",
      lastUpdated: "June 6, 2026 10:30 AM",
      fileSize: "2.4 MB",
    },
    {
      id: "doc_2",
      name: "NDA_Real Estate Key Visual.docx",
      project: "Real Estate Key Visual",
      type: "NDA",
      status: "Pending",
      owner: "Linh Tran",
      lastUpdated: "June 5, 2026 04:15 PM",
      fileSize: "1.1 MB",
      isUrgent: true,
      urgentReason: "Waiting for counter-signature",
      priorityLevel: "Medium",
    },
    {
      id: "doc_3",
      name: "Invoice_Social Campaign #12.pdf",
      project: "Social Campaign Retainer",
      type: "Invoice",
      status: "Pending",
      owner: "Minh Le",
      lastUpdated: "June 5, 2026 11:02 AM",
      fileSize: "850 KB",
      isUrgent: true,
      urgentReason: "Due since last week",
      priorityLevel: "High",
    },
    {
      id: "doc_4",
      name: "Budget_Real Estate Key Visual.xlsx",
      project: "Real Estate Key Visual",
      type: "Budget",
      status: "Approved",
      owner: "Linh Tran",
      lastUpdated: "June 4, 2026 02:45 PM",
      fileSize: "4.2 MB",
    },
    {
      id: "doc_5",
      name: "Contract_Social Campaign Retainer.pdf",
      project: "Social Campaign Retainer",
      type: "Contract",
      status: "Missing",
      owner: "Alex Nguyen",
      lastUpdated: "June 4, 2026 09:20 AM",
      fileSize: "0 KB",
      isUrgent: true,
      urgentReason: "Required for project start",
      priorityLevel: "High",
    },
    {
      id: "doc_6",
      name: "Brief_TVC Launch Film.docx",
      project: "TVC Launch Film",
      type: "Brief",
      status: "Approved",
      owner: "Minh Le",
      lastUpdated: "June 3, 2026 05:10 PM",
      fileSize: "1.8 MB",
    },
    {
      id: "doc_7",
      name: "VFX_Storyboard_Shad.pdf",
      project: "Shadows of Saigon",
      type: "Brief",
      status: "Approved",
      owner: "Alex Nguyen",
      lastUpdated: "June 2, 2026 03:22 PM",
      fileSize: "14 MB",
    }
  ],
  actions: [
    {
      id: "act_1",
      priorityOrder: 1,
      title: "- [ ] Kiểm tra báo cáo vượt ngân sách\n- [ ] Xác nhận số liệu với Finance Agent\n- [ ] Lên phương án cắt giảm chi phí",
      project: "Real Estate Key Visual",
      priorityLevel: "High",
      suggestedAgent: "Finance Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_2",
      priorityOrder: 2,
      title: "- [ ] Xác nhận 5 hóa đơn freelancer\n- [ ] Phê duyệt thanh toán đợt này\n- [ ] Gửi xác nhận cho kế toán",
      project: "Behind The Lights",
      priorityLevel: "Medium",
      suggestedAgent: "Finance Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_3",
      priorityOrder: 3,
      title: "- [ ] Liên hệ khách hàng yêu cầu hợp đồng\n- [ ] Chuẩn bị bản mẫu hợp đồng\n- [ ] Đặt lịch ký kết",
      project: "Social Campaign Retainer",
      priorityLevel: "Medium",
      suggestedAgent: "Document Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_4",
      priorityOrder: 4,
      title: "Confirm shoot schedule change",
      project: "Real Estate Key Visual",
      priorityLevel: "Low",
      suggestedAgent: "PM Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_5",
      priorityOrder: 5,
      title: "Audit creative asset quality",
      project: "Shadows of Saigon",
      priorityLevel: "Low",
      suggestedAgent: "Creative Agent",
      status: "Done",
      notes: "Checked first drafts of color correction. Looks great."
    },
    {
      id: "act_6",
      priorityOrder: 6,
      title: "Authorize remote developer keys",
      project: "Admin Task",
      priorityLevel: "Low",
      suggestedAgent: "Admin Agent",
      status: "Done",
      notes: "Keys issued on Tuesday."
    }
  ],
  agents: [
    {
      id: "agent_finance",
      name: "Finance Agent",
      status: "Active",
      keyResponsibility: "Cash flow monitoring, forecasting, expense analysis, payment reminders.",
      currentTask: "Reconciling Q2 transactions",
      recentActivity: "Reconciled 12 bank transactions & generated forecast report.",
      workloadProgress: 72,
      avatarColor: "text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "agent_pm",
      name: "PM Agent",
      status: "Active",
      keyResponsibility: "Project timeline tracking, risk monitoring, milestone updates.",
      currentTask: "Updating project timelines",
      recentActivity: "Updated 8 project milestones & flagged 2 overdue tasks.",
      workloadProgress: 65,
      avatarColor: "text-green-400 bg-green-500/10",
    },
    {
      id: "agent_creative",
      name: "Creative Agent",
      status: "Active",
      keyResponsibility: "Content ideation, asset review, storyboard support, creative feedback.",
      currentTask: "Reviewing storyboard draft",
      recentActivity: "Approved 3 concept variations and synthesized visual feedback.",
      workloadProgress: 58,
      avatarColor: "text-purple-400 bg-purple-500/10",
    },
    {
      id: "agent_doc",
      name: "Document Agent",
      status: "Monitoring",
      keyResponsibility: "Contract monitoring, invoice tracking, document extraction, missing document alerts.",
      currentTask: "Analyzing vendor contract",
      recentActivity: "Extracted 14 key clauses from Galaxy Studio contract.",
      workloadProgress: 41,
      avatarColor: "text-orange-400 bg-orange-500/10",
    },
    {
      id: "agent_admin",
      name: "Admin Agent",
      status: "Active",
      keyResponsibility: "System monitoring, approval tracking, user support & permission control.",
      currentTask: "Reviewing access requests",
      recentActivity: "Processed 6 access requests and resolved workspace block.",
      workloadProgress: 27,
      avatarColor: "text-blue-400 bg-blue-500/10",
    }
  ],
  tasks: [
    { id: "task_1", taskName: "Review budget variance report", priority: "High", assignedAgent: "Finance Agent", status: "Running", dueTime: "Today 3:00 PM" },
    { id: "task_2", taskName: "Approve creative concept v2", priority: "Medium", assignedAgent: "Creative Agent", status: "Waiting Input", dueTime: "Today 5:00 PM" },
    { id: "task_3", taskName: "Analyze marketing contract", priority: "Medium", assignedAgent: "Document Agent", status: "Running", dueTime: "Tomorrow 10:00 AM" },
    { id: "task_4", taskName: "Update project risk register", priority: "Low", assignedAgent: "PM Agent", status: "Running", dueTime: "Tomorrow 2:00 PM" },
    { id: "task_5", taskName: "Process vendor payment", priority: "High", assignedAgent: "Finance Agent", status: "Pending", dueTime: "June 20, 2026" }
  ],
  agentPerformance: {
    completionRate: 92,
    completionRateChange: "8% vs last week",
    avgResponseTimeHours: 1.8,
    avgResponseTimeChange: "0.4h vs last week",
    blockedTasksCount: 4,
    blockedTasksChange: "2 vs last week",
  },
  expenseTransactions: mappedExpenses,
};

const LOCAL_STORAGE_KEY = "anphim_os_google_sheet_data_v16";

// Retrieve DB from local storage or fall back to mock data
export function getStoredSheetData(): GoogleSheetDB {
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      // Perform simple validation to make sure it contains elements
      if (parsed.projects && parsed.projects.length > 0) {
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
    updatedData.dashboard.receivable = totalReceivables > 0 ? totalReceivables : 6310000000;
    
    // Total actions count
    updatedData.dashboard.actionsCount = updatedData.actions.length;
    updatedData.dashboard.actionsCompletedCount = updatedData.actions.filter(a => a.status === "Done").length;

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
