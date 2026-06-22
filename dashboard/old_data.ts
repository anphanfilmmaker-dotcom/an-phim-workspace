/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleSheetDB, Project, DocumentItem, CEOAction } from "./types";

// Format currency as full Vietnamese Dong: e.g. 21,600,000đ
export function formatVND(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "0đ";
  const isPositive = value >= 0;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString("vi-VN");
  return (isPositive ? "" : "-") + formatted + "đ";
}

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
  projects: [
    {
      id: "proj_1",
      name: "TVC Launch Film",
      client: "Galaxy Studio",
      status: "Đang làm",
      budget: 3_000_000_000,
      received: 1_300_000_000,
      dueDate: "May 25, 2026",
      nextAction: "Client review due tomorrow",
      nextActionDue: "June 7, 2026",
      projectType: "Video",
      milestones: [
        { name: "Brief / Scope", date: "April 5, 2026", completed: true },
        { name: "Pre-Production", date: "April 10, 2026", completed: true },
        { name: "Draft idea", date: "April 15, 2026", completed: true },
        { name: "Storyboard", date: "April 20, 2026", completed: true },
        { name: "Production", date: "May 1, 2026", completed: true },
        { name: "Offline", date: "May 10, 2026", completed: false },
        { name: "Online", date: "May 15, 2026", completed: false },
        { name: "Delivery", date: "May 20, 2026", completed: false },
        { name: "Final / Close-out", date: "May 25, 2026", completed: false },
      ],
      paymentPhase: "Phase 2 of 3",
      paymentPhaseProgress: 43,
      thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
      notes: "Met with Galaxy production lead, they are excited about the color grade.",
    },
    {
      id: "proj_2",
      name: "Real Estate Key Visual",
      client: "Lumière Films",
      status: "Cần revise",
      budget: 2_000_000_000,
      received: 750_000_000,
      dueDate: "June 15, 2026",
      nextAction: "Approve revised storyboard",
      nextActionDue: "June 8, 2026",
      projectType: "VFX",
      milestones: [
        { name: "Brief / Scope", date: "May 1, 2026", completed: true },
        { name: "Pre-Production", date: "May 10, 2026", completed: true },
        { name: "Draft idea", date: "May 15, 2026", completed: true },
        { name: "Storyboard", date: "May 20, 2026", completed: false },
        { name: "Production", date: "May 25, 2026", completed: false },
        { name: "Offline", date: "June 1, 2026", completed: false },
        { name: "Online", date: "June 5, 2026", completed: false },
        { name: "Delivery", date: "June 10, 2026", completed: false },
        { name: "Final / Close-out", date: "June 15, 2026", completed: false },
      ],
      paymentPhase: "Phase 1 of 4",
      paymentPhaseProgress: 38,
      thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
      notes: "Need to clear shoot calendar conflict by Monday morning or delay shooting by a week.",
    },
    {
      id: "proj_3",
      name: "Social Campaign Retainer",
      client: "Blue Sky Media",
      status: "Đang làm",
      budget: 1_200_000_000,
      received: 600_000_000,
      dueDate: "June 30, 2026",
      nextAction: "Deliver report this week",
      nextActionDue: "June 12, 2026",
      projectType: "Marketing",
      milestones: [
        { name: "Brief / Scope", date: "May 5, 2026", completed: true },
        { name: "Pre-Production", date: "May 10, 2026", completed: true },
        { name: "Draft idea", date: "May 15, 2026", completed: true },
        { name: "Storyboard", date: "May 20, 2026", completed: true },
        { name: "Production", date: "May 25, 2026", completed: true },
        { name: "Offline", date: "June 5, 2026", completed: false },
        { name: "Online", date: "June 15, 2026", completed: false },
        { name: "Delivery", date: "June 25, 2026", completed: false },
        { name: "Final / Close-out", date: "June 30, 2026", completed: false },
      ],
      paymentPhase: "Phase 1 of 2",
      paymentPhaseProgress: 50,
      thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
      notes: "Creative Agent is compiling performance logs for the previous videos.",
    },
    {
      id: "proj_4",
      name: "Shadows of Saigon",
      client: "Galaxy Studio",
      status: "Đang làm",
      budget: 3_200_000_000,
      received: 2_180_000_000,
      dueDate: "July 15, 2026",
      nextAction: "Review final cut with director",
      nextActionDue: "June 22, 2026",
      projectType: "AI Film",
      milestones: [
        { name: "Brief / Scope", date: "March 1, 2026", completed: true },
        { name: "Pre-Production", date: "March 10, 2026", completed: true },
        { name: "Draft idea", date: "March 20, 2026", completed: true },
        { name: "Storyboard", date: "April 1, 2026", completed: true },
        { name: "Production", date: "April 15, 2026", completed: true },
        { name: "Offline", date: "May 10, 2026", completed: true },
        { name: "Online", date: "June 1, 2026", completed: false },
        { name: "Delivery", date: "June 30, 2026", completed: false },
        { name: "Final / Close-out", date: "July 15, 2026", completed: false },
      ],
      paymentPhase: "Phase 3 of 4",
      paymentPhaseProgress: 68,
      thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
      notes: "Linh Tran is preparing the subtitles and audio overlays.",
    },
    {
      id: "proj_5",
      name: "Behind The Lights",
      client: "Lumière Films",
      status: "Tạm dừng",
      budget: 1_800_000_000,
      received: 760_000_000,
      dueDate: "June 25, 2026",
      nextAction: "Approve voiceover talent",
      nextActionDue: "June 14, 2026",
      projectType: "AI Render",
      milestones: [
        { name: "Brief / Scope", date: "April 1, 2026", completed: true },
        { name: "Pre-Production", date: "April 10, 2026", completed: true },
        { name: "Draft idea", date: "April 20, 2026", completed: true },
        { name: "Storyboard", date: "May 1, 2026", completed: true },
        { name: "Production", date: "May 15, 2026", completed: false },
        { name: "Offline", date: "June 1, 2026", completed: false },
        { name: "Online", date: "June 10, 2026", completed: false },
        { name: "Delivery", date: "June 20, 2026", completed: false },
        { name: "Final / Close-out", date: "June 25, 2026", completed: false },
      ],
      paymentPhase: "Phase 2 of 4",
      paymentPhaseProgress: 42,
      thumbnailUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
      notes: "Vocal artist has throat illness. Finding secondary talent. Project paused.",
    },
    {
      id: "proj_6",
      name: "The Last Horizon",
      client: "Blue Sky Media",
      status: "Chờ feedback",
      budget: 2_500_000_000,
      received: 875_000_000,
      dueDate: "July 30, 2026",
      nextAction: "Approve production plan draft",
      nextActionDue: "June 20, 2026",
      projectType: "Script",
      milestones: [
        { name: "Brief / Scope", date: "May 10, 2026", completed: true },
        { name: "Pre-Production", date: "May 20, 2026", completed: true },
        { name: "Draft idea", date: "May 30, 2026", completed: false },
        { name: "Storyboard", date: "June 10, 2026", completed: false },
        { name: "Production", date: "June 25, 2026", completed: false },
        { name: "Offline", date: "July 10, 2026", completed: false },
        { name: "Online", date: "July 20, 2026", completed: false },
        { name: "Delivery", date: "July 25, 2026", completed: false },
        { name: "Final / Close-out", date: "July 30, 2026", completed: false },
      ],
      paymentPhase: "Phase 1 of 3",
      paymentPhaseProgress: 35,
      thumbnailUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "proj_7",
      name: "Echoes of Silence",
      client: "Noir Pictures",
      status: "Đang làm",
      budget: 1_600_000_000,
      received: 1_200_000_000,
      dueDate: "June 20, 2026",
      nextAction: "Sound track approval",
      nextActionDue: "June 11, 2026",
      projectType: "AI image",
      milestones: [
        { name: "Brief / Scope", date: "April 20, 2026", completed: true },
        { name: "Pre-Production", date: "May 1, 2026", completed: true },
        { name: "Draft idea", date: "May 5, 2026", completed: true },
        { name: "Storyboard", date: "May 10, 2026", completed: true },
        { name: "Production", date: "May 20, 2026", completed: true },
        { name: "Offline", date: "May 30, 2026", completed: true },
        { name: "Online", date: "June 5, 2026", completed: true },
        { name: "Delivery", date: "June 15, 2026", completed: false },
        { name: "Final / Close-out", date: "June 20, 2026", completed: false },
      ],
      paymentPhase: "Phase 3 of 4",
      paymentPhaseProgress: 75,
      thumbnailUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80",
      notes: "All deliverables aligned with standard. Sound composer completed score.",
    },
    {
      id: "proj_8",
      name: "Waves of Youth",
      client: "Sunrise Entertainment",
      status: "Hoàn thành",
      budget: 950_000_000,
      received: 950_000_000,
      dueDate: "May 5, 2026",
      nextAction: "All assets delivered and signed",
      nextActionDue: "Completed",
      projectType: "Graphic",
      milestones: [
        { name: "Brief / Scope", date: "March 15, 2026", completed: true },
        { name: "Pre-Production", date: "March 20, 2026", completed: true },
        { name: "Draft idea", date: "March 25, 2026", completed: true },
        { name: "Storyboard", date: "April 1, 2026", completed: true },
        { name: "Production", date: "April 15, 2026", completed: true },
        { name: "Offline", date: "April 20, 2026", completed: true },
        { name: "Online", date: "April 25, 2026", completed: true },
        { name: "Delivery", date: "April 30, 2026", completed: true },
        { name: "Final / Close-out", date: "May 5, 2026", completed: true },
      ],
      paymentPhase: "Phase 4 of 4",
      paymentPhaseProgress: 100,
      thumbnailUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=400&q=80",
      notes: "Completed last month. Retainer feedback loop is high.",
    }
  ],
  cashFlow: [
    { id: "cf_1", label: "Mon, Jun 1", inflow: 450_000_000, outflow: 150_000_000, netProfit: 300_000_000 },
    { id: "cf_2", label: "Tue, Jun 2", inflow: 380_000_000, outflow: 120_000_000, netProfit: 260_000_000 },
    { id: "cf_3", label: "Wed, Jun 3", inflow: 620_000_000, outflow: 210_000_000, netProfit: 410_000_000 },
    { id: "cf_4", label: "Thu, Jun 4", inflow: 510_000_000, outflow: 180_000_000, netProfit: 330_000_000 },
    { id: "cf_5", label: "Fri, Jun 5", inflow: 300_000_000, outflow: 420_000_000, netProfit: -120_000_000 },
    { id: "cf_6", label: "Sat, Jun 6", inflow: 220_000_000, outflow: 90_000_000, netProfit: 130_000_000 },
    { id: "cf_7", label: "Sun, Jun 7", inflow: 980_000_000, outflow: 130_000_000, netProfit: 850_000_000 },
  ],
  expenses: [
    { category: "Personal", amount: 2_000_000_000, percentage: 51, color: "bg-emerald-500" },
    { category: "Marketing", amount: 785_000_000, percentage: 20, color: "bg-amber-500" },
    { category: "Freelancer", amount: 431_000_000, percentage: 11, color: "bg-orange-500" },
    { category: "AI Tools", amount: 157_000_000, percentage: 4, color: "bg-indigo-500" },
    { category: "Admin", amount: 196_000_000, percentage: 5, color: "bg-cyan-500" },
    { category: "Others", amount: 353_000_000, percentage: 9, color: "bg-purple-500" },
  ],
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
  }
};

const LOCAL_STORAGE_KEY = "anphim_os_google_sheet_data_v5";

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
