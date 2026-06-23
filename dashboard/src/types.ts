/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define project status types
export type ProjectStatus = "Chưa bắt đầu" | "Đang làm" | "Chờ feedback" | "Cần revise" | "Hoàn thành" | "Tạm dừng";

// Define project types
export type ProjectType = "AI Render" | "Marketing" | "AI image" | "AI Film" | "VFX" | "Graphic" | "Script" | "Video";

// Define document status types
export type DocStatus = "Signed" | "Missing" | "Pending" | "Approved";

// Define document type kinds
export type DocType = "Contract" | "NDA" | "Invoice" | "Budget" | "Brief";

// Structuring a project row
export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  budget: number; // Value in VND (e.g. 3200000000 for 3.20B VND)
  received: number; // Value paid in VND
  paymentD1?: number;
  paymentD2?: number;
  paymentD3?: number;
  dueDate: string; // e.g. "Jun 30, 2025"
  nextAction: string;
  nextActionDue?: string; // e.g. "May 22, 2025"
  projectType: ProjectType;
  milestones: { name: string; date: string; completed: boolean }[];
  paymentPhase: string; // e.g. "Phase 3 of 4"
  paymentPhaseProgress: number; // percentage, e.g. 60 for "60% paid for this phase"
  thumbnailUrl?: string; // Cover placeholder
  notes?: string; // CEO notes
}

// Structuring a cash flow point (weekly or daily)
export interface CashFlowPoint {
  id: string;
  label: string; // e.g. "May 12", "Mon"
  inflow: number; // in VND
  outflow: number; // in VND
  netProfit: number; // in VND
}

// Structuring an expense item
export interface ExpenseCategoryItem {
  category: "Freelancer" | "AI Tools" | "Production" | "Equipment" | "Sales" | "Food/Meeting" | "Marketing" | "Office/Admin" | "Taxe/Fees" | "Personal" | "Others" | string;
  amount: number; // in VND
  percentage: number; // e.g. 48
  color: string; // Tailwind color class or hex
}

// Structuring individual expense transaction
export interface ExpenseTransaction {
  id: string;
  date: string; // e.g. "2026-06-12"
  category: string;
  project: string; // project name, or "Cá nhân", "Công ty"
  description: string;
  vendor?: string;
  paymentMethod?: string;
  amount: number;
}

// Structuring individual income transaction
export interface IncomeTransaction {
  id: string;
  date: string; // e.g. "2026-06-12"
  project: string;
  amount: number;
  notes?: string;
}

// Structuring a finance alert
export interface FinanceAlert {
  id: string;
  type: "Overdue Payment" | "Over-Budget Project" | "Missing Invoice";
  description: string;
  project: string;
  urgency: "High" | "Medium";
  status: "Pending" | "Reviewed";
}

// Structuring a document row
export interface DocumentItem {
  id: string;
  name: string;
  project: string;
  type: DocType;
  status: DocStatus;
  owner: string;
  ownerAvatar?: string;
  lastUpdated: string; // e.g. "May 18, 2025 10:30 AM"
  fileSize?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  priorityLevel?: "High" | "Medium" | "Low";
}

export interface CEOAction {
  id: string;
  priorityOrder: number;
  title: string;
  project: string;
  priorityLevel: "High" | "Medium" | "Low";
  suggestedAgent: string;
  status: "Pending" | "Done" | "Waiting" | "Need Follow-up";
  notes?: string;
  category?: "work" | "personal" | "meeting" | "ai_agent" | "other";
}

// Structuring an AI Agent
export interface AIAgent {
  id: string;
  name: string;
  status: "Active" | "Monitoring" | "Need Input";
  keyResponsibility: string;
  currentTask: string;
  recentActivity: string;
  workloadProgress: number; // percentage e.g. 72
  avatarColor: string; // text/bg helper
  tokenInput?: number;
  tokenOutput?: number;
  runCount?: number;
  estimatedCost?: number;
}

// Structuring a task in queue
export interface AgentTask {
  id: string;
  taskName: string;
  priority: "High" | "Medium" | "Low";
  assignedAgent: string;
  status: "Running" | "Waiting Input" | "Pending" | "Completed";
  dueTime: string; // e.g. "Today 3:00 PM", "Tomorrow 10:00 AM"
}


// Structuring the Document Set tracked per project (from Excel "Giấy tờ" sheet)
export interface ProjectDocumentSet {
  projectId: string;
  projectName: string;
  quote: boolean;
  contract: boolean;
  vatR1: boolean;
  vatR2: boolean;
  vatR3: boolean;
  liquidation: boolean;
  overallStatus?: string;
}

// Structuring a schedule event
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  date: string; // YYYY-MM-DD
  category: "work" | "personal" | "meeting" | "ai_agent" | "other";
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  owner?: string;
  agent?: string;
  projectId?: string;
}

// Representation of Google Sheet database structure
export interface GoogleSheetDB {
  dashboard: {
    cashAvailable: number;
    cashAvailableChange: string;
    receivable: number;
    receivableChange: string;
    activeProjectsCount: number;
    activeProjectsChange: string;
    actionsCount: number;
    actionsCompletedCount: number;
  };
  projects: Project[];
  expenses: ExpenseCategoryItem[];
  expenseTransactions: ExpenseTransaction[];
  incomes: IncomeTransaction[];
  projectDocuments: ProjectDocumentSet[];
  actions: CEOAction[];
  agents: AIAgent[];
  tasks: AgentTask[];
  schedule: CalendarEvent[];
  agentPerformance: {
    completionRate: number;
    completionRateChange: string;
    avgResponseTimeHours: number;
    avgResponseTimeChange: string;
    blockedTasksCount: number;
    blockedTasksChange: string;
  };
}
