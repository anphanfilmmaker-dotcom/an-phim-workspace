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
  Menu,
  Check,
  Loader2,
  AlertCircle
} from "lucide-react";
import { translations } from "./translations";

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('anphim_auth_token');
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    if (!url.includes('/api/login')) {
      localStorage.removeItem('anphim_auth_token');
      window.location.reload();
    }
  }
  return res;
};

export const isMatchingTask = (eventTitle: string, eventDesc: string | undefined, actionTitle: string): boolean => {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u1EA0-\u1EF9]/gi, " ").replace(/\s+/g, " ").trim();
  const eT = norm(eventTitle);
  const aT = norm(actionTitle);
  if (!eT || !aT) return false;
  if (eT === aT) return true;
  if (eT.includes(aT) || aT.includes(eT)) return true;
  if (eventDesc) {
    const eD = norm(eventDesc);
    if (eD === aT || eD.includes(aT) || aT.includes(eD)) return true;
  }
  const eWords = eT.split(" ").filter(w => w.length > 1);
  const aWords = aT.split(" ").filter(w => w.length > 1);
  if (eWords.length > 0 && aWords.length > 0) {
    const setA = new Set(aWords);
    const common = eWords.filter(w => setA.has(w)).length;
    const ratio = common / Math.min(eWords.length, aWords.length);
    if (ratio >= 0.6) return true;
  }
  return false;
};

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

  interface SyncToast {
    type: 'saving' | 'success' | 'error';
    message: string;
  }
  const [syncToast, setSyncToast] = useState<SyncToast | null>(null);

  const triggerSyncFeedback = async (
    fetchPromise: Promise<Response>,
    successMsg: string = "Đã đồng bộ vào Database",
    errorMsg: string = "Lỗi đồng bộ vào Database"
  ) => {
    setSyncToast({ type: 'saving', message: 'Đang lưu vào Database...' });
    try {
      const res = await fetchPromise;
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi HTTP ${res.status}`);
      }
      setSyncToast({ type: 'success', message: `✓ ${successMsg}` });
      setTimeout(() => {
        setSyncToast(prev => prev?.message.includes(successMsg) ? null : prev);
      }, 2500);
      return res;
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncToast({ type: 'error', message: `✕ ${errorMsg}: ${err.message || err}` });
      setTimeout(() => {
        setSyncToast(prev => prev?.type === 'error' ? null : prev);
      }, 5000);
      throw err;
    }
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
      name: p.projectName || p.name || "",
      client: p.client || "N/A",
      status: p.status || "Chưa bắt đầu",
      budget: Number(p.budget) || 0,
      received: Number(p.received) || 0,
      paymentD1: Number(p.paymentD1 !== undefined ? p.paymentD1 : p.paymentd1) || 0,
      paymentD2: Number(p.paymentD2 !== undefined ? p.paymentD2 : p.paymentd2) || 0,
      paymentD3: Number(p.paymentD3 !== undefined ? p.paymentD3 : p.paymentd3) || 0,
      dueDate: p.dueDate || p.duedate || "",
      nextAction: p.nextAction || p.nextaction || "",
      nextActionDue: p.nextActionDue || p.nextactiondue || "",
      projectType: p.projectType || p.projecttype || "AI Render",
      milestones,
      paymentPhase: p.paymentPhase || p.paymentphase || "Phase 1",
      paymentPhaseProgress: Number(p.paymentPhaseProgress !== undefined ? p.paymentPhaseProgress : p.paymentphaseprogress) || 0,
      thumbnailUrl: p.thumbnailUrl || p.thumbnailurl || "",
      notes: p.notes || "",
    };
  };

  // Fetch real data from the Backend API on load
  useEffect(() => {
    const tokenStr = localStorage.getItem('anphim_auth_token');
    const headers = tokenStr ? { 'Authorization': `Bearer ${tokenStr}` } : undefined;
    apiFetch('/api/db', { headers })
      .then(res => {
        if (!res.ok) throw new Error("API response not ok");
        return res.json();
      })
      .then(data => {
        if (data && data.projects) {
          const normalizedProjects = (data.projects || []).map(normalizeProject);
          const projectLookup = new Map<string, string>();
          normalizedProjects.forEach((p: any) => {
            if (p.id) projectLookup.set(p.id.toLowerCase(), p.name);
          });
          projectLookup.set('proj-canhan', 'Cá nhân');
          projectLookup.set('proj_canhan', 'Cá nhân');
          projectLookup.set('proj-congty', 'Công ty');
          projectLookup.set('proj_congty', 'Công ty');

          const safeDb: GoogleSheetDB = {
            ...db,
            ...data,
            dashboard: { ...(db.dashboard || {}), ...(data.dashboard || {}) },
            agentPerformance: { ...(db.agentPerformance || {}), ...(data.agentPerformance || {}) },
            projects: normalizedProjects,
            cashFlow: data.cashFlow || db.cashFlow,
            expenses: data.expenses || db.expenses,
            alerts: data.alerts || db.alerts,
            projectDocuments: (data.projectDocuments || db.projectDocuments || []).map((pd: any) => ({
              projectId: pd.projectId || pd.projectid || "",
              projectName: pd.projectName || pd.projectname || "",
              overallStatus: pd.overallStatus || pd.overallstatus || "N/A",
              quote: !!pd.quote,
              contract: !!pd.contract,
              vatR1: !!(pd.vatR1 !== undefined ? pd.vatR1 : pd.vatr1),
              vatR2: !!(pd.vatR2 !== undefined ? pd.vatR2 : pd.vatr2),
              vatR3: !!(pd.vatR3 !== undefined ? pd.vatR3 : pd.vatr3),
              liquidation: !!pd.liquidation,
              quoteLink: pd.quoteLink || pd.quote_link || "",
              contractLink: pd.contractLink || pd.contract_link || "",
              vatR1Link: pd.vatR1Link || pd.vatr1_link || "",
              vatR2Link: pd.vatR2Link || pd.vatr2_link || "",
              vatR3Link: pd.vatR3Link || pd.vatr3_link || "",
              liquidationLink: pd.liquidationLink || pd.liquidation_link || ""
            })),
            expenseTransactions: (data.expenseTransactions || db.expenseTransactions || []).map((exp: any) => {
              const pid = (exp.projectId || exp.projectid || "").toLowerCase();
              const resolvedProject = exp.project || projectLookup.get(pid) || (pid ? (pid.startsWith('proj_') ? pid : 'Chung') : 'Chung');
              return {
                ...exp,
                projectId: exp.projectId || exp.projectid || "",
                project: resolvedProject,
                paymentMethod: exp.paymentMethod || exp.paymentmethod || "",
                amount: Number(exp.amount) || 0
              };
            }),
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
    let matchedActionId: string | null = null;
    const nextActions = db.actions.map((act) => {
      if (matchedTask && act.title.toLowerCase().includes(matchedTask.taskName.toLowerCase().slice(0, 15))) {
        matchedActionId = act.id;
        return { ...act, status: "Done" as const };
      }
      return act;
    });

    updateDbState({
      ...db,
      tasks: nextTasks,
      actions: nextActions
    });
    
    // Sync to backend
    apiFetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Completed" })
    }).catch(console.error);
    
    if (matchedActionId) {
      apiFetch(`/api/actions/${matchedActionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Done" })
      }).catch(console.error);
    }
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
    
    // Sync to backend
    apiFetch(`/api/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(console.error);
  };

  // Handler: Modify direct action items inline
  const handleUpdateActionStatus = (actionId: string, nextStatus: any) => {
    if (actionId.startsWith("sync_evt_")) {
      const eventId = actionId.replace("sync_evt_", "");
      const currentAggSchedule = getAggregatedSchedule(db);
      const evt = currentAggSchedule.find(e => e.id === eventId);
      if (evt) {
        handleEditEvent({ ...evt, status: nextStatus === "Done" ? "done" : "todo" });
        // Also sync any matching action in db.actions
        const matchingAct = db.actions.find(a => isMatchingTask(evt.title, evt.description, a.title));
        if (matchingAct && matchingAct.status !== nextStatus) {
          const nextActions = db.actions.map(a => a.id === matchingAct.id ? { ...a, status: nextStatus } : a);
          updateDbState({ ...db, actions: nextActions });
          apiFetch(`/api/actions/${matchingAct.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
          }).catch(console.error);
        }
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

    // Check if this action has a matching schedule event for today and update that event too!
    const targetAct = db.actions.find(a => a.id === actionId);
    if (targetAct) {
      const actualToday = new Date();
      const todayStr = `${actualToday.getFullYear()}-${String(actualToday.getMonth() + 1).padStart(2, '0')}-${String(actualToday.getDate()).padStart(2, '0')}`;
      const matchedEvt = (db.schedule || []).find(e => e.date === todayStr && isMatchingTask(e.title, e.description, targetAct.title));
      if (matchedEvt) {
        const nextEvtStatus = nextStatus === "Done" ? "done" : "todo";
        if (matchedEvt.status !== nextEvtStatus) {
          handleEditEvent({ ...matchedEvt, status: nextEvtStatus });
        }
      }
    }
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      }),
      'Đã cập nhật công việc',
      'Lỗi lưu công việc'
    );
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
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      }),
      'Đã lưu ghi chú dự án',
      'Lỗi lưu ghi chú'
    );
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
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/projects/${updatedProj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProj)
      }),
      `Đã cập nhật dự án ${updatedProj.name}`,
      `Lỗi cập nhật dự án`
    );
  };

  // Handler: Add document from drag and drop uploader
  const handleAddDocument = (newDoc: DocumentItem) => {
    updateDbState({
      ...db,
      documents: [newDoc, ...db.documents]
    });
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      }),
      `Đã tải lên văn bản ${newDoc.name}`,
      `Lỗi tải văn bản`
    );
  };

  // Handler: Delete document
  const handleDeleteDocument = (docId: string) => {
    updateDbState({
      ...db,
      documents: db.documents.filter(d => d.id !== docId)
    });
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      }),
      `Đã xóa văn bản`,
      `Lỗi xóa văn bản`
    );
  };

  // Handler: Sync legal doc state
  const handleUpdateDocStatus = (docId: string, nextStatus: DocStatus) => {
    const isUrgent = nextStatus === "Signed" || nextStatus === "Approved" ? false : undefined;
    const nextDocs = db.documents.map((doc) => {
      if (doc.id === docId) {
        return { ...doc, status: nextStatus, isUrgent: isUrgent !== undefined ? isUrgent : doc.isUrgent };
      }
      return doc;
    });
    updateDbState({ ...db, documents: nextDocs });
    
    // Sync to backend
    triggerSyncFeedback(
      apiFetch(`/api/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, isUrgent })
      }),
      `Đã đổi trạng thái văn bản`,
      `Lỗi đổi trạng thái văn bản`
    );
  };

  // Handler: Sync project document checklist state
  const handleUpdateProjectDocument = (projectId: string, field: string, value: any) => {
    if (!db.projectDocuments) return;
    
    let dbUpdatePayload: any = { [field]: value };
    let projName = projectId;
    
    const nextDocs = db.projectDocuments.map((pd) => {
      if (pd.projectId === projectId) {
        projName = pd.projectName || projectId;
        const nextPd = { ...pd, [field]: value };
        const count = [
          nextPd.quote, 
          nextPd.contract, 
          nextPd.vatR1, 
          nextPd.vatR2, 
          nextPd.vatR3, 
          nextPd.liquidation
        ].filter(Boolean).length;
        
        if (field === 'overallStatus') {
          nextPd.overallStatus = value;
          dbUpdatePayload['overallStatus'] = value;
        } else if (count === 6) {
          nextPd.overallStatus = "Đã đủ";
          dbUpdatePayload['overallStatus'] = "Đã đủ";
        } else if (count < 6 && nextPd.overallStatus === "Đã đủ") {
          const fallback = count > 0 ? "Chờ đợt 2" : "Chưa có";
          nextPd.overallStatus = fallback;
          dbUpdatePayload['overallStatus'] = fallback;
        }
        
        return nextPd;
      }
      return pd;
    });
    updateDbState({ ...db, projectDocuments: nextDocs });
    
    // Sync to backend with user feedback
    triggerSyncFeedback(
      apiFetch(`/api/projectdocuments/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdatePayload)
      }),
      `Đã đồng bộ giấy tờ (${projName})`,
      `Không thể lưu giấy tờ`
    );
  };

  // Handler: Register brand new project
  const handleAddProject = (newProj: Project) => {
    updateDbState({
      ...db,
      projects: [newProj, ...db.projects]
    });
    
    // Sync to backend
    apiFetch(`/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProj)
    }).catch(console.error);
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
      
      // Sync to backend
      apiFetch(`/api/schedule/${eventId}`, {
        method: 'DELETE'
      }).catch(console.error);
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
      const nextSchedule = db.schedule.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      // Also sync matching action if any
      const nextActions = (db.actions || []).map(act => {
        if (isMatchingTask(updatedEvent.title, updatedEvent.description, act.title)) {
          const actStatus = updatedEvent.status === 'done' ? 'Done' : 'Pending';
          const resolvedProjectName = updatedEvent.projectId
            ? (db.projects.find(p => p.id === updatedEvent.projectId)?.name || act.project)
            : act.project;
          const assignedAgent = updatedEvent.agent || updatedEvent.owner || act.suggestedAgent;

          const updatedActPayload = {
            status: actStatus,
            project: resolvedProjectName,
            projectid: updatedEvent.projectId || act.projectid,
            category: updatedEvent.category || act.category,
            suggestedagent: assignedAgent
          };

          apiFetch(`/api/actions/${act.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedActPayload)
          }).catch(console.error);

          return { 
            ...act, 
            status: actStatus,
            project: resolvedProjectName,
            projectid: updatedEvent.projectId || act.projectid,
            category: updatedEvent.category || act.category,
            suggestedAgent: assignedAgent
          };
        }
        return act;
      });

      updateDbState({
        ...db,
        schedule: nextSchedule,
        actions: nextActions
      });
      
      // Sync to backend
      apiFetch(`/api/schedule/${updatedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent)
      }).catch(console.error);
    }
  };

  // Handler: Add new schedule event
  const handleAddEvent = (newEvent: import("./types").CalendarEvent) => {
    updateDbState({
      ...db,
      schedule: [...(db.schedule || []), newEvent]
    });
    
    // Sync to backend
    apiFetch(`/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    }).catch(console.error);
  };

  // Global Sync logic from Spreadsheet popup
  const handleSpreadsheetSync = (syncedDb: GoogleSheetDB) => {
    updateDbState(syncedDb);
  };

  // Helper: Get completed projects sorted or padded for the sidebar brief
  const getCompletedProjectsForSidebar = () => {
    const completed = db.projects.filter(p => p.status === "Hoàn thành" && p.projectType !== "Internal");
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

            {/* Nav 6: Logout */}
            <button
              id="sidebar_logout"
              onClick={() => {
                localStorage.removeItem("anphim_auth_token");
                setToken(null);
              }}
              title={isSidebarCollapsed ? (lang === "en" ? "Sign Out" : "Đăng Xuất") : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-1" : "space-x-3 px-3"} py-2.5 rounded-lg text-[10px] font-mono tracking-wide transition-all outline-none mt-4 text-red-500 hover:text-red-400 border border-transparent hover:bg-red-950/30`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>{lang === "en" ? "SIGN OUT" : "ĐĂNG XUẤT"}</span>}
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
            {/* Cloud DB Connection Status Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#171b21] border border-[#2b333c] rounded-lg text-[11px] font-mono select-none" title="Kết nối trực tiếp PostgreSQL Supabase Cloud">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-neutral-400 hidden sm:inline">DB:</span>
              <span className="text-emerald-400 font-medium">Real-time</span>
            </div>
            
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
            const todaysEvents = aggregatedDb.schedule.filter(e => e.date === todayStr);

            // Sync status and metadata between schedule events and existing db.actions
            const syncedDbActions = (db.actions || []).map(act => {
              const matchedEvt = todaysEvents.find(e => isMatchingTask(e.title, e.description, act.title));
              if (matchedEvt) {
                const isDone = act.status === 'Done' || matchedEvt.status === 'done';
                const resolvedProjectName = matchedEvt.projectId
                  ? (db.projects.find(p => p.id === matchedEvt.projectId)?.name || act.project)
                  : act.project;

                return {
                  ...act,
                  status: (isDone ? 'Done' : 'Pending') as any,
                  linkedEventId: matchedEvt.id,
                  project: resolvedProjectName || act.project,
                  category: (matchedEvt.category || act.category) as any,
                  suggestedAgent: matchedEvt.agent || matchedEvt.owner || act.suggestedAgent,
                };
              }
              return act;
            });

            // Only map schedule events that DO NOT match any existing db.actions
            const unmappedEvents = todaysEvents.filter(e => 
              !syncedDbActions.some(act => isMatchingTask(e.title, e.description, act.title))
            );

            const mappedActionsFromEvents: import("./types").CEOAction[] = unmappedEvents.map((e, idx) => ({
              id: `sync_evt_${e.id}`,
              priorityOrder: e.priority === 'high' ? 1 : 2,
              title: e.title,
              project: e.projectId ? db.projects.find(p => p.id === e.projectId)?.name || "Dự án" : "Lịch làm việc",
              priorityLevel: e.priority === 'high' ? "High" : (e.priority === 'medium' ? "Medium" : "Low"),
              suggestedAgent: "System Sync",
              status: e.status === 'done' ? "Done" : "Pending",
              category: e.category
            }));
            const overviewDb = { ...db, actions: [...mappedActionsFromEvents, ...syncedDbActions] };

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

      {/* Floating Real-time DB Sync Toast */}
      {syncToast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 font-mono text-xs select-none ${
            syncToast.type === 'saving' 
              ? 'bg-[#121417]/95 border-amber-500/50 text-amber-300 shadow-amber-500/10' 
              : syncToast.type === 'success'
              ? 'bg-[#121417]/95 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
              : 'bg-[#121417]/95 border-rose-500/50 text-rose-300 shadow-rose-500/10'
          }`}
        >
          {syncToast.type === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />}
          {syncToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {syncToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="font-sans font-medium">{syncToast.message}</span>
        </div>
      )}

    </div>
  );
}
