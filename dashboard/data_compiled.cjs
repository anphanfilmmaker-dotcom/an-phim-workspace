var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var data_exports = {};
__export(data_exports, {
  INITIAL_SHEET_DATA: () => INITIAL_SHEET_DATA,
  formatVND: () => formatVND,
  getStoredSheetData: () => getStoredSheetData,
  resetStoredSheetData: () => resetStoredSheetData,
  setStoredSheetData: () => setStoredSheetData
});
module.exports = __toCommonJS(data_exports);
var import_excelData = __toESM(require("./excelData.json"), 1);
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
function formatVND(value) {
  if (value === null || value === void 0 || isNaN(value)) return "0\u0111";
  const isPositive = value >= 0;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString("vi-VN");
  return (isPositive ? "" : "-") + formatted + "\u0111";
}
const mappedProjects = import_excelData.default.projects.map((p, idx) => {
  if (!p["Project Name"] || p["Project Name"].toString().trim() === "") return null;
  const giayToRow = import_excelData.default.giayTo ? import_excelData.default.giayTo[idx] : null;
  let budget = 1e8;
  let received = 0;
  if (giayToRow) {
    budget = giayToRow["T\u1ED5ng c\u1ED9ng"] || 0;
    const dot1 = Number(giayToRow["\u0110\u1EE3t 1"]) || 0;
    const dot2 = Number(giayToRow["\u0110\u1EE3t 2"]) || 0;
    const dot3 = Number(giayToRow["\u0110\u1EE3t 3"]) || 0;
    received = dot1 + dot2 + dot3;
    p.paymentD1 = dot1;
    p.paymentD2 = dot2;
    p.paymentD3 = dot3;
  } else {
    received = import_excelData.default.income.filter((i) => i["Project Name"] === p["Project Name"]).reduce((sum, i) => sum + (i.Amount || 0), 0);
    budget = received > 0 ? received * 1.2 : 1e8;
  }
  const statusMap = {
    "Ho\xE0n th\xE0nh": "Ho\xE0n th\xE0nh",
    "\u0110ang l\xE0m": "\u0110ang l\xE0m",
    "On hold": "T\u1EA1m d\u1EEBng"
  };
  const projectTypeMap = {
    "AI Render": "AI Render",
    "Marketing": "Marketing",
    "AI Image": "AI image",
    "AI Film": "AI Film",
    "Script": "Script",
    "Graphic": "Graphic"
  };
  const status = statusMap[p["Stage Status"]] || "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
  let dueDateStr = "Dec 31, 2026";
  if (p.Due) {
    const d = new Date(p.Due);
    if (!isNaN(d.getTime())) dueDateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
      { name: "Brief / Scope", date: "June 20, 2026", completed: true },
      { name: "Pre-Production", date: "June 25, 2026", completed: true },
      { name: "Draft idea", date: "July 1, 2026", completed: false },
      { name: "Storyboard", date: "July 5, 2026", completed: false },
      { name: "Production", date: "July 15, 2026", completed: false },
      { name: "Offline", date: "July 20, 2026", completed: false },
      { name: "Online", date: "July 25, 2026", completed: false },
      { name: "Delivery", date: "July 30, 2026", completed: false },
      { name: "Final / Close-out", date: "Aug 5, 2026", completed: false }
    ],
    paymentPhase: "Phase 1 of 3",
    paymentPhaseProgress: budget > 0 ? Math.round(received / budget * 100) : 0,
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    notes: p.Notes || ""
  };
}).filter(Boolean);
const mappedExpenses = import_excelData.default.expense.filter((e) => e.Amount || e["Vendor / Payee"] || e["Description / Note"]).map((e, idx) => {
  let dateStr = "2026-06-01";
  if (e.Date) {
    const d = new Date(e.Date);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
  }
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
const mappedProjectDocuments = import_excelData.default.giayTo ? import_excelData.default.giayTo.map((g, idx) => {
  const projName = g["Project Name"] || (import_excelData.default.projects && import_excelData.default.projects[idx] ? import_excelData.default.projects[idx]["Project Name"] : "");
  if (!projName || projName.toString().trim() === "") return null;
  const checkStatus = (val) => typeof val === "string" && val.trim().toLowerCase() === "x";
  return {
    projectId: `proj_v22_${idx}`,
    projectName: projName,
    quote: checkStatus(g["B\xE1o gi\xE1"]),
    contract: checkStatus(g["H\u1EE3p \u0111\u1ED3ng"]),
    vatR1: checkStatus(g["VAT R1"]),
    vatR2: checkStatus(g["VAT R2"]),
    vatR3: checkStatus(g["VAT R3"]),
    liquidation: checkStatus(g["BBTL"] || g["BB Thanh L\xFD"])
  };
}).filter(Boolean) : [];
const templateDocs = [
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
  "bg-emerald-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-red-500",
  "bg-lime-500",
  "bg-fuchsia-500",
  "bg-yellow-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-300",
  "bg-amber-300",
  "bg-orange-300",
  "bg-indigo-300",
  "bg-cyan-300",
  "bg-purple-300",
  "bg-pink-300",
  "bg-rose-300",
  "bg-blue-300",
  "bg-red-300",
  "bg-lime-300"
];
const categoryTotals = {};
let totalExpensesAmt = 0;
mappedExpenses.forEach((e) => {
  categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  totalExpensesAmt += e.amount;
});
const dynamicExpenses = Object.keys(categoryTotals).map((cat, idx) => {
  return {
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpensesAmt > 0 ? Math.round(categoryTotals[cat] / totalExpensesAmt * 100) : 0,
    color: colorPalette[idx % colorPalette.length]
  };
}).sort((a, b) => b.amount - a.amount);
const totalReceivedAmt = mappedProjects.reduce((sum, p) => sum + p.received, 0);
const dailyCashFlowMap = /* @__PURE__ */ new Map();
(import_excelData.default.income || []).forEach((inc) => {
  let dateStr = "2026-06-01";
  if (inc.Date) {
    if (typeof inc.Date === "number") {
      const d = new Date((inc.Date - 25569) * 86400 * 1e3);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        dateStr = `${yyyy}-${mm}-${dd}`;
      }
    } else if (typeof inc.Date === "string") {
      const parts = inc.Date.split("/");
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else {
        const d = new Date(inc.Date);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          dateStr = `${yyyy}-${mm}-${dd}`;
        }
      }
    }
  }
  const amt = Number(inc.Amount) || 0;
  if (amt !== 0) {
    const existing = dailyCashFlowMap.get(dateStr) || { inflow: 0, outflow: 0 };
    existing.inflow += amt;
    dailyCashFlowMap.set(dateStr, existing);
  }
});
mappedExpenses.forEach((exp) => {
  if (exp.amount !== 0) {
    const existing = dailyCashFlowMap.get(exp.date) || { inflow: 0, outflow: 0 };
    existing.outflow += exp.amount;
    dailyCashFlowMap.set(exp.date, existing);
  }
});
const mappedCashFlow = Array.from(dailyCashFlowMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([dateStr, vals], idx) => {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, "0")} (${days[d.getDay()]})`;
  return {
    id: `cf_${idx}`,
    date: dateStr,
    label,
    inflow: vals.inflow,
    outflow: vals.outflow,
    netProfit: vals.inflow - vals.outflow
  };
});
const INITIAL_SHEET_DATA = {
  dashboard: {
    cashAvailable: totalReceivedAmt * 0.92 - totalExpensesAmt,
    cashAvailableChange: "8.4% vs last week",
    receivable: 631e7,
    receivableChange: "5.1% vs last week",
    activeProjectsCount: 12,
    activeProjectsChange: "2 vs last week",
    actionsCount: 6,
    actionsCompletedCount: 4
  },
  projects: mappedProjects,
  cashFlow: mappedCashFlow,
  expenses: dynamicExpenses,
  expenseTransactions: mappedExpenses,
  alerts: [
    {
      id: "al_1",
      type: "Overdue Payment",
      description: "TVC Launch Film is overdue by 3 days.",
      project: "TVC Launch Film",
      urgency: "High",
      status: "Pending"
    },
    {
      id: "al_2",
      type: "Over-Budget Project",
      description: "Real Estate Key Visual is 12% over budget.",
      project: "Real Estate Key Visual",
      urgency: "High",
      status: "Pending"
    },
    {
      id: "al_3",
      type: "Missing Invoice",
      description: "Invoice for Social Campaign Retainer is missing.",
      project: "Social Campaign Retainer",
      urgency: "High",
      status: "Pending"
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
      fileSize: "2.4 MB"
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
      priorityLevel: "Medium"
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
      priorityLevel: "High"
    },
    {
      id: "doc_4",
      name: "Budget_Real Estate Key Visual.xlsx",
      project: "Real Estate Key Visual",
      type: "Budget",
      status: "Approved",
      owner: "Linh Tran",
      lastUpdated: "June 4, 2026 02:45 PM",
      fileSize: "4.2 MB"
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
      priorityLevel: "High"
    },
    {
      id: "doc_6",
      name: "Brief_TVC Launch Film.docx",
      project: "TVC Launch Film",
      type: "Brief",
      status: "Approved",
      owner: "Minh Le",
      lastUpdated: "June 3, 2026 05:10 PM",
      fileSize: "1.8 MB"
    },
    {
      id: "doc_7",
      name: "VFX_Storyboard_Shad.pdf",
      project: "Shadows of Saigon",
      type: "Brief",
      status: "Approved",
      owner: "Alex Nguyen",
      lastUpdated: "June 2, 2026 03:22 PM",
      fileSize: "14 MB"
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
      fileSize: "2.4 MB"
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
      priorityLevel: "Medium"
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
      priorityLevel: "High"
    },
    {
      id: "doc_4",
      name: "Budget_Real Estate Key Visual.xlsx",
      project: "Real Estate Key Visual",
      type: "Budget",
      status: "Approved",
      owner: "Linh Tran",
      lastUpdated: "June 4, 2026 02:45 PM",
      fileSize: "4.2 MB"
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
      priorityLevel: "High"
    },
    {
      id: "doc_6",
      name: "Brief_TVC Launch Film.docx",
      project: "TVC Launch Film",
      type: "Brief",
      status: "Approved",
      owner: "Minh Le",
      lastUpdated: "June 3, 2026 05:10 PM",
      fileSize: "1.8 MB"
    },
    {
      id: "doc_7",
      name: "VFX_Storyboard_Shad.pdf",
      project: "Shadows of Saigon",
      type: "Brief",
      status: "Approved",
      owner: "Alex Nguyen",
      lastUpdated: "June 2, 2026 03:22 PM",
      fileSize: "14 MB"
    }
  ],
  projectDocuments: mappedProjectDocuments,
  templateDocuments: templateDocs,
  actions: [
    {
      id: "act_1",
      priorityOrder: 1,
      title: "- [ ] Ki\u1EC3m tra b\xE1o c\xE1o v\u01B0\u1EE3t ng\xE2n s\xE1ch\n- [ ] X\xE1c nh\u1EADn s\u1ED1 li\u1EC7u v\u1EDBi Finance Agent\n- [ ] L\xEAn ph\u01B0\u01A1ng \xE1n c\u1EAFt gi\u1EA3m chi ph\xED",
      project: "Real Estate Key Visual",
      priorityLevel: "High",
      suggestedAgent: "Finance Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_2",
      priorityOrder: 2,
      title: "- [ ] X\xE1c nh\u1EADn 5 h\xF3a \u0111\u01A1n freelancer\n- [ ] Ph\xEA duy\u1EC7t thanh to\xE1n \u0111\u1EE3t n\xE0y\n- [ ] G\u1EEDi x\xE1c nh\u1EADn cho k\u1EBF to\xE1n",
      project: "Behind The Lights",
      priorityLevel: "Medium",
      suggestedAgent: "Finance Agent",
      status: "Pending",
      notes: ""
    },
    {
      id: "act_3",
      priorityOrder: 3,
      title: "- [ ] Li\xEAn h\u1EC7 kh\xE1ch h\xE0ng y\xEAu c\u1EA7u h\u1EE3p \u0111\u1ED3ng\n- [ ] Chu\u1EA9n b\u1ECB b\u1EA3n m\u1EABu h\u1EE3p \u0111\u1ED3ng\n- [ ] \u0110\u1EB7t l\u1ECBch k\xFD k\u1EBFt",
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
      tokenInput: 15400,
      tokenOutput: 3200,
      runCount: 45,
      estimatedCost: 0.12
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
      tokenInput: 8500,
      tokenOutput: 1100,
      runCount: 22,
      estimatedCost: 0.05
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
      tokenInput: 45e3,
      tokenOutput: 12e3,
      runCount: 18,
      estimatedCost: 0.85
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
      tokenInput: 32e3,
      tokenOutput: 4500,
      runCount: 12,
      estimatedCost: 0.35
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
      tokenInput: 2100,
      tokenOutput: 400,
      runCount: 8,
      estimatedCost: 0.01
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
    blockedTasksChange: "2 vs last week"
  }
};
const LOCAL_STORAGE_KEY = "anphim_os_google_sheet_data_v18";
function getStoredSheetData() {
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (parsed.projects && parsed.projects.length > 0) {
        const totalReceived = parsed.projects.reduce((sum, p) => sum + (p.received || 0), 0);
        const totalExpense = parsed.expenses ? parsed.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
        parsed.dashboard.cashAvailable = totalReceived * 0.92 - totalExpense;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read local storage", e);
  }
  setStoredSheetData(INITIAL_SHEET_DATA);
  return INITIAL_SHEET_DATA;
}
function setStoredSheetData(data) {
  try {
    const updatedData = { ...data };
    const activeProjects = updatedData.projects.filter((p) => p.status !== "Ho\xE0n th\xE0nh");
    updatedData.dashboard.activeProjectsCount = activeProjects.length;
    let totalReceivables = 0;
    updatedData.projects.forEach((p) => {
      const missing = p.budget - p.received;
      if (missing > 0 && p.status !== "Ho\xE0n th\xE0nh") {
        totalReceivables += missing;
      }
    });
    updatedData.dashboard.receivable = totalReceivables > 0 ? totalReceivables : 631e7;
    updatedData.dashboard.actionsCount = updatedData.actions.length;
    updatedData.dashboard.actionsCompletedCount = updatedData.actions.filter((a) => a.status === "Done").length;
    const totalReceived = updatedData.projects.reduce((sum, p) => sum + p.received, 0);
    const totalExpense = updatedData.expenses.reduce((sum, e) => sum + e.amount, 0);
    updatedData.dashboard.cashAvailable = totalReceived * 0.92 - totalExpense;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
  } catch (e) {
    console.error("Failed to write to local storage", e);
  }
}
function resetStoredSheetData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SHEET_DATA));
  return INITIAL_SHEET_DATA;
}
