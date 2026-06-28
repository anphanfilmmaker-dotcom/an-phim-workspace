/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { getStoredSheetData, setStoredSheetData, formatVND, INITIAL_SHEET_DATA } from "./data";
import { GoogleSheetDB, Project, DocumentItem, DocStatus } from "./types";

import OverviewPage from "./components/OverviewPage";
import ProjectsPage from "./components/ProjectsPage";
import FinancePage from "./components/FinancePage";
import AgentsPage from "./components/AgentsPage";
import DocumentsPage from "./components/DocumentsPage";
import SheetSimulator from "./components/SheetSimulator";
import SchedulePage from "./components/SchedulePage";
import MiniCalendarPopover from "./components/MiniCalendarPopover"; 
import Login from "./components/Login";
import {
  Home, 
  Film, 
  DollarSign, 
  Bot, 
  FileText, 
  Database,
  Calendar, 
  Search, 
  ChevronDown, 
  LogOut, 
  RefreshCw,
  SlidersHorizontal,
  Languages,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { translations } from "./translations";

type PageId = "overview" | "projects" | "finance" | "agents" | "documents" | "schedule";

export default function App() {
  // Main Database State initialized from reactive LocalStorage layer
  const [db, setDb] = useState<GoogleSheetDB>(getStoredSheetData());
  
  // Force update db on hot reload to bypass local storage caching
  useEffect(() => {
    setDb(getStoredSheetData());
  }, [INITIAL_SHEET_DATA]);
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Global Calendar Sync States
  const [globalCurrentDate, setGlobalCurrentDate] = useState(new Date());
  const [globalSelectedDateStr, setGlobalSelectedDateStr] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedSimulatedDate, setSelectedSimulatedDate] = useState("May 18, 2025");
  const [globalSearch, setGlobalSearch] = useState("");
  const [lang, setLang] = useState<"en" | "vi">(() => {
    return (localStorage.getItem("anphim_lang") as "en" | "vi") || "vi";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const t = translations[lang];

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("anphim_auth_token");
    }
    return null;
  });

  if (!token) {
    return <Login onLoginSuccess={(t) => {
      localStorage.setItem("anphim_auth_token", t);
      setToken(t);
    }} />;
  }

  // Auto-scroll to top when navigating pages or selecting a new project
  useEffect(() => {
    const el = document.getElementById("main-scroll-container");
    if (el) {
      el.scrollTop = 0;
    }
  }, [activePage, selectedProjectId]);

  // Sync state modifications with persistent localStorage layer
  const updateDbState = (newDb: GoogleSheetDB) => {
    setDb(newDb);
    setStoredSheetData(newDb);
  };

  // Normalize a raw project from the API into a fully-typed Project object
  const normalizeProject = (p: any): import("./types").Project => {
    // milestones can come as string[] from DB or object[] from local state
    const MILESTONE_NAMES = [
      "Brief / Scope", "Pre-Production", "Draft idea",
      "Storyboard", "Production", "Offline", "Online",
      "Delivery", "Final / Close-out"
    ];
    let milestones: { name: string; date: string; completed: boolean }[] = [];
    if (Array.isArray(p.milestones)) {
      milestones = p.milestones.map((ms: any) => {
        if (typeof ms === "string") {
          return { name: ms, date: "", completed: false };
        }
        return { name: ms.name || "", date: ms.date || "", completed: !!ms.completed };
      });
    }
    if (milestones.length === 0) {
      milestones = MILESTONE_NAMES.map(n => ({ name: n, date: "", completed: false }));
    }

    return {
      id: String(p.id || ""),
      name: p.name || p.projectName || "",
      client: p.client || "N/A",
      status: p.status || "Chưa bắt đầu",
      budget: Number(p.budget) || 0,
      received: Number(p.received) || 0,
      paymentD1: Number(p.paymentD1) || 0,
      paymentD2: Number(p.paymentD2) || 0,
      paymentD3: Number(p.paymentD3) || 0,
      dueDate: p.dueDate || "",
      nextAction: p.nextAction || "",
      nextActionDue: p.nextActionDue || "",
      projectType: p.projectType || "AI Render",
      milestones,
      paymentPhase: p.paymentPhase || "Phase 1",
      paymentPhaseProgress: Number(p.paymentPhaseProgress) || 0,
      thumbnailUrl: p.thumbnailUrl || "",
      notes: p.notes || "",
    };
  };

  // Fetch real data from the Backend API on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
    fetch('/api/db', { headers })
      .then(res => {
        if (!res.ok) throw new Error("API response not ok");
        return res.json();
      })
      .then(data => {
        if (data && data.projects) {
          const safeDb: GoogleSheetDB = {
            ...db,
            ...data,
            projects: (data.projects || []).map(normalizeProject),
            cashFlow: data.cashFlow || db.cashFlow,
            expenses: data.expenses || db.expenses,
            alerts: data.alerts || db.alerts,
            documents: data.documents || db.documents,
            actions: data.actions || db.actions,
            agents: data.agents || db.agents,
            tasks: data.tasks || db.tasks,
            incomes: data.incomes || db.incomes,
            schedule: data.schedule || db.schedule
          };
          updateDbState(safeDb);
        }
      })
      .catch(err => {
        console.error("Failed to load live database from Backend API:", err);
      });
  }, []);

  // Handler: Select a project and slide focus automatically
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActivePage("projects");
  };

  // Handler: Change task queue state to Completed
  const handleCompleteTask = (taskId: string) => {
    const nextTasks = db.tasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, status: "Completed" as const };
      }
      return task;
    });

    // Also mark the corresponding action item as completed if matched
    const matchedTask = db.tasks.find(t => t.id === taskId);
    const nextActions = db.actions.map((act) => {
      if (matchedTask && act.title.toLowerCase().includes(matchedTask.taskName.toLowerCase().slice(0, 15))) {
        return { ...act, status: "Done" as const };
      }
      return act;
    });

    updateDbState({
      ...db,
      tasks: nextTasks,
      actions: nextActions
    });
  };

  // Handler: Modify AI agent worker status
  const handleUpdateAgentStatus = (agentId: string, status: any) => {
    const nextAgents = db.agents.map((agent) => {
      if (agent.id === agentId) {
        return { ...agent, status };
      }
      return agent;
    });
    updateDbState({ ...db, agents: nextAgents });
  };

  // Handler: Modify direct action items inline
  const handleUpdateActionStatus = (actionId: string, nextStatus: any) => {
    if (actionId.startsWith("sync_evt_")) {
      const eventId = actionId.replace("sync_evt_", "");
      const currentAggSchedule = getAggregatedSchedule(db);
      const evt = currentAggSchedule.find(e => e.id === eventId);
      if (evt) {
        handleEditEvent({ ...evt, status: nextStatus === "Done" ? "done" : "todo" });
      }
      return;
    }

    const nextActions = db.actions.map((act) => {
      if (act.id === actionId) {
        return { ...act, status: nextStatus };
      }
      return act;
    });
    updateDbState({ ...db, actions: nextActions });
  };

  // Handler: Update private notes on film projects
  const handleUpdateProjectNotes = (projectId: string, notes: string) => {
    const nextProjects = db.projects.map((proj) => {
      if (proj.id === projectId) {
        return { ...proj, notes };
      }
      return proj;
    });
    updateDbState({ ...db, projects: nextProjects });
  };

  // Handler: Update full project
  const handleUpdateProject = (updatedProj: Project) => {
    const nextProjects = db.projects.map((proj) => {
      if (proj.id === updatedProj.id) {
        return updatedProj;
      }
      return proj;
    });
    updateDbState({ ...db, projects: nextProjects });
  };

  // Handler: Add document from drag and drop uploader
  const handleAddDocument = (newDoc: DocumentItem) => {
    updateDbState({
      ...db,
      documents: [newDoc, ...db.documents]
    });
  };

  // Handler: Delete document
  const handleDeleteDocument = (docId: string) => {
    updateDbState({
      ...db,
      documents: db.documents.filter(d => d.id !== docId)
    });
  };

  // Handler: Sync legal doc state
  const handleUpdateDocStatus = (docId: string, nextStatus: DocStatus) => {
    const nextDocs = db.documents.map((doc) => {
      if (doc.id === docId) {
        return { ...doc, status: nextStatus, isUrgent: nextStatus === "Signed" || nextStatus === "Approved" ? false : doc.isUrgent };
      }
      return doc;
    });
    updateDbState({ ...db, documents: nextDocs });
  };

  // Handler: Sync project document checklist state
  const handleUpdateProjectDocument = (projectId: string, field: string, value: any) => {
    if (!db.projectDocuments) return;
    const nextDocs = db.projectDocuments.map((pd) => {
      if (pd.projectId === projectId) {
        const nextPd = { ...pd, [field]: value };
        const count = [nextPd.quote, nextPd.contract, nextPd.vatR1, nextPd.vatR2, nextPd.vatR3, nextPd.liquidation].filter(Boolean).length;
        if (count === 6 && field !== 'overallStatus' && !nextPd.overallStatus) {
          nextPd.overallStatus = "đã đủ";
        }
        return nextPd;
      }
      return pd;
    });
    updateDbState({ ...db, projectDocuments: nextDocs });
  };

  // Handler: Register brand new project
  const handleAddProject = (newProj: Project) => {
    updateDbState({
      ...db,
      projects: [newProj, ...db.projects]
    });
  };

  const parseDateSafeToYYYYMMDD = (dateStr: any): string | null => {
    if (!dateStr && dateStr !== 0) return null;
    let parsedTime = 0;
    if (typeof dateStr === "number") {
      parsedTime = new Date((dateStr - 25569) * 86400 * 1000).getTime();
    } else {
      const s = String(dateStr).trim();
      const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        parsedTime = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1])).getTime();
      } else {
        const d = new Date(s).getTime();
        if (!isNaN(d)) parsedTime = d;
        else {
          const match = s.match(/Ngày (\d+) tháng (\d+), (\d+)/i);
          if (match) {
            parsedTime = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])).getTime();
          }
        }
      }
    }
    if (parsedTime > 0) {
      const d = new Date(parsedTime);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  const getAggregatedSchedule = (database: GoogleSheetDB): import("./types").CalendarEvent[] => {
    const events: import("./types").CalendarEvent[] = [...(database.schedule || [])];

    (database.projects || []).forEach(proj => {
      // Do not show paused projects on the timeline
      if (proj.status === 'Tạm dừng') return;

      // 1. Project Due Date
      if (proj.dueDate) {
        const parsedDue = parseDateSafeToYYYYMMDD(proj.dueDate);
        if (parsedDue) {
          events.push({
            id: `proj_dueDate_${proj.id}`,
            title: `Deadline: ${proj.name}`,
            description: proj.notes || `Client: ${proj.client}`,
            date: parsedDue,
            startTime: '17:00',
            category: 'work',
            priority: 'high',
            status: proj.status === 'Hoàn thành' ? 'done' : (proj.status === 'Đang làm' ? 'in_progress' : 'todo'),
            projectId: proj.id
          });
        }
      }

      // 2. Project Milestones
      (proj.milestones || []).forEach((ms, index) => {
        if (ms.date) {
          const parsedMsDate = parseDateSafeToYYYYMMDD(ms.date);
          if (parsedMsDate) {
            events.push({
              id: `proj_milestone_${proj.id}_${index}`,
              title: `${ms.name} (${proj.name})`,
              date: parsedMsDate,
              startTime: '09:00',
              category: 'work',
              priority: 'medium',
              status: ms.completed || proj.status === 'Hoàn thành' ? 'done' : 'todo',
              projectId: proj.id
            });
          }
        }
      });
    });

    return events;
  };

  const aggregatedDb = { ...db, schedule: getAggregatedSchedule(db) };

  // Handler: Delete Event
  const handleDeleteEvent = (eventId: string) => {
    if (eventId.startsWith('proj_dueDate_')) {
      const projId = eventId.replace('proj_dueDate_', '');
      const proj = db.projects.find(p => p.id === projId);
      if (proj) handleUpdateProject({ ...proj, dueDate: "" });
    } else if (eventId.startsWith('proj_milestone_')) {
      const parts = eventId.replace('proj_milestone_', '').split('_');
      const index = parseInt(parts.pop() || "0", 10);
      const projId = parts.join('_');
      const proj = db.projects.find(p => p.id === projId);
      if (proj) {
        const newProj = { ...proj, milestones: proj.milestones.filter((_, i) => i !== index) };
        handleUpdateProject(newProj);
      }
    } else {
      updateDbState({
        ...db,
        schedule: db.schedule.filter(e => e.id !== eventId)
      });
    }
  };

  // Handler: Edit Event
  const handleEditEvent = (updatedEvent: import("./types").CalendarEvent) => {
    if (updatedEvent.id.startsWith('proj_dueDate_')) {
      const projId = updatedEvent.id.replace('proj_dueDate_', '');
      const proj = db.projects.find(p => p.id === projId);
      if (proj) {
        const parts = updatedEvent.date.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        handleUpdateProject({ ...proj, dueDate: formattedDate });
      }
    } else if (updatedEvent.id.startsWith('proj_milestone_')) {
      const parts = updatedEvent.id.replace('proj_milestone_', '').split('_');
      const index = parseInt(parts.pop() || "0", 10);
      const projId = parts.join('_');
      const proj = db.projects.find(p => p.id === projId);
      if (proj && proj.milestones[index]) {
        const dateParts = updatedEvent.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        const newProj = { ...proj };
        newProj.milestones = [...newProj.milestones];
        // Note: we extract back the name by taking part before " ("
        const newTitle = updatedEvent.title.includes(' (') ? updatedEvent.title.substring(0, updatedEvent.title.lastIndexOf(' (')) : updatedEvent.title;
        newProj.milestones[index] = { 
          ...newProj.milestones[index], 
          date: formattedDate,
          name: newTitle,
          completed: updatedEvent.status === 'done'
        };
        handleUpdateProject(newProj);
      }
    } else {
      updateDbState({
        ...db,
        schedule: db.schedule.map(e => e.id === updatedEvent.id ? updatedEvent : e)
      });
    }
  };

  // Handler: Add new schedule event
  const handleAddEvent = (newEvent: import("./types").CalendarEvent) => {
    updateDbState({
      ...db,
      schedule: [...(db.schedule || []), newEvent]
    });
  };

  // Global Sync logic from Spreadsheet popup
  const handleSpreadsheetSync = (syncedDb: GoogleSheetDB) => {
    updateDbState(syncedDb);
  };

  // Helper: Get completed projects sorted or padded for the sidebar brief
  const getCompletedProjectsForSidebar = () => {
    const completed = db.projects.filter(p => p.status === "Hoàn thành");
    if (completed.length >= 3) return completed.slice(0, 3);
    const others = db.projects
      .filter(p => p.status !== "Hoàn thành")
      .sort((a, b) => {
        const progA = a.budget ? a.received / a.budget : 0;
        const progB = b.budget ? b.received / b.budget : 0;
        return progB - progA;
      });
    return [...completed, ...others].slice(0, 3);
  };

  // Helper: Get 3 most active agents sorted by workload progress
  const getActiveAgentsForSidebar = () => {
    return [...db.agents]
      .sort((a, b) => b.workloadProgress - a.workloadProgress)
      .slice(0, 3);
  };

  // Helper: Get 3 most recent operational expenses
  const getRecentExpenses = () => {
    if (!db.expenseTransactions) return [];
    return [...db.expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map(exp => ({
        id: exp.id,
        title: exp.description || exp.vendor || exp.category,
        amount: exp.amount,
        date: new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
        category: exp.category
      }));
  };

  // Helper: Get projects with incomplete documents
  const getIncompleteProjectsForSidebar = () => {
    if (!db.projectDocuments) return [];
    
    // Filter and sort projects by number of missing documents (ascending, so those with most missing show first)
    const incomplete = [...db.projectDocuments]
      .filter(pd => {
        const count = [pd.quote, pd.contract, pd.vatR1, pd.vatR2, pd.vatR3, pd.liquidation].filter(Boolean).length;
        return count < 6;
      })
      .sort((a, b) => {
        const countA = [a.quote, a.contract, a.vatR1, a.vatR2, a.vatR3, a.liquidation].filter(Boolean).length;
        const countB = [b.quote, b.contract, b.vatR1, b.vatR2, b.vatR3, b.liquidation].filter(Boolean).length;
        return countA - countB;
      });
      
    return incomplete.slice(0, 3);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0C0E] text-slate-100 font-sans">
      
      {/* MOBILE PORTRAIT ORIENTATION BLOCKER OVERLAY */}
      <div className="fixed inset-0 z-50 hidden portrait:flex flex-col items-center justify-center bg-[#0C1014] text-center px-6 md:hidden">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-[#10B981]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 animate-bounce">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
        </div>
        <h2 className="text-xs font-sans font-extrabold tracking-wider text-[#10B981] uppercase">
          {lang === "en" ? "Landscape Mode Required" : "Yêu Cầu Xoay Ngang Màn Hình"}
        </h2>
        <p className="text-[10px] font-mono text-neutral-400 mt-2 max-w-xs leading-relaxed uppercase tracking-wider">
          {lang === "en" 
            ? "Please rotate your device to landscape mode to access AN PHIM WORKSPACE." 
            : "Vui lòng xoay ngang điện thoại để trải nghiệm hệ thống điều hành AN PHIM WORKSPACE."}
        </p>
      </div>

      {/* PERSISTENT LEFT SIDEBAR */}
      <aside className={`${isSidebarCollapsed ? "w-16" : "w-[230px]"} bg-[#0E1012] border-r border-[#1e2329]/95 flex flex-col justify-between shrink-0 select-none transition-all duration-300`}>
        <div>
          {/* AN PHIM Elegant Cinematic SVG Logo & Title */}
          <div className={`p-4 border-b border-neutral-900/40 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
            <div className="flex items-center space-x-3">
              {/* Majestic A structure wrapped with movie filmreel strip */}
              <div className="relative w-10 h-10 shrink-0">
                <img 
                  src="/logo.png" 
                  alt="An Phim Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                />
              </div>

              {/* Headings pair */}
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-[10px] font-sans font-extrabold tracking-widest text-[#10B981] uppercase leading-none">
                    AN PHIM WORKSPACE
                  </h1>
                  <span className="text-[10px] font-mono font-medium text-neutral-400 block mt-1 uppercase tracking-tight">
                    {t.ceoCommandUnit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Persistent modular Sidebar Navigation Tabs */}
          <nav className="p-2.5 space-y-1.5 pt-6">
            
            {/* Nav 1: Overview */}
            <button
              id="sidebar_overview"
              onClick={() => setActivePage("overview")}
              title={isSidebarCollapsed ? t.overview : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "overview"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{t.overview}</span>}
            </button>

            {/* Nav 2: Projects */}
            <button
              id="sidebar_projects"
              onClick={() => setActivePage("projects")}
              title={isSidebarCollapsed ? t.projects : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "projects"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <Film className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{t.projects}</span>}
            </button>

            {/* Nav 3: Finance */}
            <button
              id="sidebar_finance"
              onClick={() => setActivePage("finance")}
              title={isSidebarCollapsed ? t.finance : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "finance"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{t.finance}</span>}
            </button>

            {/* Nav 4: Documents */}
            <button
              id="sidebar_documents"
              onClick={() => setActivePage("documents")}
              title={isSidebarCollapsed ? t.documents : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "documents"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{t.documents}</span>}
            </button>

            {/* Nav 4.5: Schedule */}
            <button
              id="sidebar_schedule"
              onClick={() => setActivePage("schedule")}
              title={isSidebarCollapsed ? (lang === "en" ? "Work Schedule" : "Lịch làm việc") : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "schedule"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{lang === "en" ? "WORK SCHEDULE" : "LỊCH LÀM VIỆC"}</span>}
            </button>

            {/* Nav 5: AI Agents */}
            <button
              id="sidebar_agents"
              onClick={() => setActivePage("agents")}
              title={isSidebarCollapsed ? t.aiAgentsTrace : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none ${
                activePage === "agents"
                  ? "bg-emerald-950/20 border border-[#10B981]/30 text-[#10B981] font-bold"
                  : "text-neutral-400 hover:text-white border border-transparent hover:bg-neutral-900"
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{t.aiAgentsTrace}</span>}
            </button>

          </nav>
        </div>

        {/* Dynamic Contextual Brief in Sidebar bottom */}
        {!isSidebarCollapsed && (
          <div className="p-3.5 border-t border-[#1e2329]/60 shrink-0">
            
            {/* Render for PROJECTS page: Completed Projects */}
            {activePage === "projects" && (
            <>
              <div className="flex items-center space-x-1.5 mb-2.5 text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.completedProjects}</span>
              </div>
              <div className="space-y-2">
                {getCompletedProjectsForSidebar().map((p) => {
                  const isCompleted = p.status === "Hoàn thành";
                  const progress = Math.min(100, Math.round((p.received / p.budget) * 100));
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => handleSelectProject(p.id)}
                      className="flex items-center justify-between text-[10px] hover:bg-neutral-900/40 p-1.5 rounded transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-1.5">
                        <p className="text-[10px] text-neutral-200 font-sans font-bold truncate">{p.name}</p>
                        <span className="text-[8px] font-mono text-neutral-500 block leading-none mt-0.5 uppercase tracking-wide truncate">
                          {p.client}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[7px] font-mono leading-none border px-1 py-0.5 rounded uppercase font-bold block ${
                          isCompleted 
                            ? "bg-emerald-950/20 border-emerald-900/50 text-[#10B981]" 
                            : "bg-blue-950/20 border-blue-900/50 text-blue-400"
                        }`}>
                          {isCompleted ? t.completed : `${progress}% PAID`}
                        </span>
                        <span className="block text-[8px] font-mono text-neutral-400 mt-1">
                          {formatVND(p.budget).split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Render for FINANCE page: Recent Expenses */}
          {activePage === "finance" && (
            <>
              <div className="flex items-center space-x-1.5 mb-2.5 text-[10px] font-mono font-bold tracking-wider text-orange-400 uppercase">
                <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                <span>{t.recentExpenses}</span>
              </div>
              <div className="space-y-2">
                {getRecentExpenses().map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between text-[10px] hover:bg-neutral-900/40 p-1.5 rounded transition"
                  >
                    <div className="min-w-0 flex-1 pr-1.5">
                      <p className="text-[10px] text-neutral-200 font-sans font-bold truncate">{item.title}</p>
                      <span className="text-[8px] font-mono text-neutral-500 block leading-none mt-0.5 uppercase tracking-wide">
                        {item.date} • {item.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] font-mono text-orange-400 font-bold leading-none">
                        -{formatVND(item.amount).split(" ")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Render for DOCUMENTS page: Incomplete Projects */}
          {activePage === "documents" && (
            <>
              <div className="flex items-center space-x-1.5 mb-2.5 text-[10px] font-mono font-bold tracking-wider text-orange-400 uppercase">
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span>{lang === "en" ? "MISSING DOCUMENTS" : "DỰ ÁN THIẾU GIẤY TỜ"}</span>
              </div>
              <div className="space-y-2">
                {getIncompleteProjectsForSidebar().map((pd) => {
                  const completedDocs = [pd.quote, pd.contract, pd.vatR1, pd.vatR2, pd.vatR3, pd.liquidation].filter(Boolean).length;
                  const progress = Math.round((completedDocs / 6) * 100);
                  const projectObj = db.projects.find(p => p.id === pd.projectId || p.name === pd.projectName);
                  
                  return (
                    <div 
                      key={pd.projectId}
                      className="flex items-center justify-between text-[10px] hover:bg-neutral-900/40 p-1.5 rounded transition cursor-pointer"
                      onClick={() => handleSelectProject(pd.projectId)}
                    >
                      <div className="min-w-0 flex-1 pr-1.5">
                        <p className="text-[10px] text-neutral-200 font-sans font-bold truncate">{pd.projectName}</p>
                        <span className="text-[8px] font-mono text-neutral-500 block leading-none mt-0.5 uppercase tracking-wide truncate">
                          {projectObj?.client || "CLIENT"} • THIẾU {6 - completedDocs} GIẤY TỜ
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[7px] font-mono leading-none border px-1.5 py-0.5 rounded font-bold uppercase shrink-0 block bg-orange-950/20 border-orange-900/40 text-orange-400">
                          {progress}%
                        </span>
                        <span className="block text-[8px] text-neutral-500 font-mono mt-1">{completedDocs}/6 XONG</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Render for OVERVIEW and AGENTS pages: Most Active Agents */}
          {(activePage === "overview" || activePage === "agents") && (
            <>
              <div className="flex items-center space-x-1.5 mb-2.5 text-[10px] font-mono font-bold tracking-wider text-[#10B981] uppercase">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.activeWorkforceTrace}</span>
              </div>
              <div className="space-y-2">
                {getActiveAgentsForSidebar().map((agent) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between text-[10px] hover:bg-neutral-900/40 p-1 rounded transition"
                  >
                    <div className="min-w-0 flex-1 pr-1.5">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className="font-sans font-bold text-neutral-200 truncate max-w-[85px]">{agent.name}</span>
                        <span className={`text-[7px] font-mono leading-none border px-1 py-0.2 rounded uppercase shrink-0 ${
                          agent.status === "Active" 
                            ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-400" 
                            : "bg-orange-950/20 border-orange-900/40 text-orange-400"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-[9px] text-neutral-500 truncate font-mono">
                        {agent.currentTask}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[7px] text-neutral-600 font-mono uppercase font-semibold">{t.load}</span>
                      <span className="text-[9px] font-mono text-neutral-400 font-semibold leading-none">{agent.workloadProgress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          </div>
        )}

      </aside>

      {/* CORE CONTENT SHEATH CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar bg-[#0A0C0E]">
        
        {/* TOP BAR / NAVIGATION HEADER HEADER */}
        <header className="sticky top-0 bg-[#0A0C0E] flex items-center justify-between pl-3 pr-6 shrink-0 z-50 select-none min-h-[64px] h-auto py-2">
          
          <div className="flex items-center space-x-3">
            {/* Sidebar collapse toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 bg-[#171b21] hover:bg-[#1c2229] border border-[#2b333c] text-neutral-400 hover:text-white rounded-lg transition mr-1.5 cursor-pointer active:scale-95"
              title={isSidebarCollapsed ? (lang === "en" ? "Expand Sidebar" : "Mở rộng menu") : (lang === "en" ? "Collapse Sidebar" : "Thu gọn menu")}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4 transition" /> : <ChevronLeft className="w-4 h-4 transition" />}
            </button>
            
            {activePage === "schedule" ? (
              <div className="flex items-center gap-2.5 ml-1">
                <div className="w-[32px] h-[32px] rounded-[10px] bg-[#0c0602] border border-[#ea580c]/50 flex items-center justify-center shadow-lg relative shrink-0">
                  <Calendar className="w-4 h-4 text-[#f97316]" strokeWidth={1.5} />
                  <span className="absolute text-[6px] font-bold text-[#f97316] top-[13px]">13</span>
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-[14px] font-mono font-bold tracking-[0.1em] text-[#F5F7FA] uppercase leading-none mb-1">
                    {lang === "en" ? "WORK SCHEDULE" : "LỊCH LÀM VIỆC"}
                  </h1>
                  <p className="text-[9px] font-sans text-[#8B949E] leading-none">
                    {lang === "en" ? "Personal & Team Schedule Management" : "Quản lý lịch trình cá nhân & nhóm"}
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                {activePage === "overview" && (lang === "en" ? "Coordination Center" : "Trung Tâm Điều Phối")}
                {activePage === "projects" && (lang === "en" ? "Project Overview" : "Tổng quan dự án")}
                {activePage === "finance" && (lang === "en" ? "Financial Report" : "Báo cáo tài chính")}
                {activePage === "agents" && (lang === "en" ? "AI Personnel" : "Nhân sự AI")}
                {activePage === "documents" && (lang === "en" ? "Legal contracts & Brief repository" : "Kho Giấy Tờ Pháp Lý & Brief Sáng Tạo")}
              </h2>
            )}
          </div>

          <div className="flex items-center space-x-3">
            
            {/* Language Toggle Button */}
            <button
              onClick={() => {
                const nextLang = lang === "en" ? "vi" : "en";
                setLang(nextLang);
                localStorage.setItem("anphim_lang", nextLang);
              }}
              className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer active:scale-95 shadow-sm"
              title={lang === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
            >
              <span>{lang === "en" ? "🇺🇸" : "🇻🇳"}</span>
            </button>



            {/* Mini Calendar Popover replaces the previous static button */}
            <MiniCalendarPopover 
              events={aggregatedDb.schedule || []} 
              onNavigateToSchedule={() => setActivePage("schedule")}
              lang={lang}
              globalCurrentDate={globalCurrentDate}
              setGlobalCurrentDate={setGlobalCurrentDate}
              globalSelectedDateStr={globalSelectedDateStr}
              setGlobalSelectedDateStr={setGlobalSelectedDateStr}
            />

          </div>

        </header>

        {/* CENTRAL VIEW PORT BODY SWITCHER PANEL */}
        <div id="main-scroll-container" className="flex-1 pl-3 pr-6 pb-2 pt-0">
          
          {/* Main conditional page router rendering */}
          {activePage === "overview" && (() => {
            const actualToday = new Date();
            const todayStr = `${actualToday.getFullYear()}-${String(actualToday.getMonth() + 1).padStart(2, '0')}-${String(actualToday.getDate()).padStart(2, '0')}`;
            const todaysEvents = aggregatedDb.schedule.filter(e => e.date === todayStr && e.status !== 'done');
            const mappedActionsFromEvents: import("./types").CEOAction[] = todaysEvents.map((e, idx) => ({
              id: `sync_evt_${e.id}`,
              priorityOrder: e.priority === 'high' ? 1 : 2,
              title: e.title,
              project: e.projectId ? db.projects.find(p => p.id === e.projectId)?.name || "Dự án" : "Lịch làm việc",
              priorityLevel: e.priority === 'high' ? "High" : (e.priority === 'medium' ? "Medium" : "Low"),
              suggestedAgent: "System Sync",
              status: e.status === 'done' ? "Done" : "Pending",
              category: e.category
            }));
            const overviewDb = { ...db, actions: [...mappedActionsFromEvents, ...db.actions] };

            return (
              <OverviewPage 
                db={overviewDb} 
                onSelectProject={handleSelectProject}
                onUpdateActionStatus={handleUpdateActionStatus}
                onTriggerDecisionReview={() => handleSelectProject("")}
                lang={lang}
              />
            );
          })()}

          {activePage === "projects" && (
            <ProjectsPage 
              db={db}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onUpdateProjectNotes={handleUpdateProjectNotes}
              onUpdateProject={handleUpdateProject}
              onAddProject={handleAddProject}
              lang={lang}
            />
          )}

          {activePage === "finance" && (
            <FinancePage 
              db={db}
              onSelectProject={handleSelectProject}
              lang={lang}
            />
          )}

          {activePage === "agents" && (
            <AgentsPage 
              db={db}
              onCompleteTask={handleCompleteTask}
              onUpdateAgentStatus={handleUpdateAgentStatus}
              lang={lang}
            />
          )}

          {activePage === "documents" && (
            <DocumentsPage 
              db={db}
              onAddDocument={handleAddDocument}
              onUpdateDocStatus={handleUpdateDocStatus}
              onDeleteDocument={handleDeleteDocument}
              onUpdateProjectDocument={handleUpdateProjectDocument}
              onUpdateProjectNotes={handleUpdateProjectNotes}
              lang={lang}
            />
          )}

          {activePage === "schedule" && (
            <SchedulePage 
              db={aggregatedDb}
              lang={lang}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onEditEvent={handleEditEvent}
              globalCurrentDate={globalCurrentDate}
              setGlobalCurrentDate={setGlobalCurrentDate}
              globalSelectedDateStr={globalSelectedDateStr}
              setGlobalSelectedDateStr={setGlobalSelectedDateStr}
            />
          )}

        </div>

      </main>

      {/* DYNAMIC GOOGLE SHEET SIMULATION DRAWER/OVERLAY OVERLAY */}
      <SheetSimulator 
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        db={db}
        onSync={handleSpreadsheetSync}
        lang={lang}
      />

    </div>
  );
}
