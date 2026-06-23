/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, Project, ProjectStatus, ProjectType } from "../types";
import { formatVND } from "../data";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  CircleDot, 
  Calendar, 
  Wallet, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  X
} from "lucide-react";
import { translations } from "../translations";

const PROJECT_TYPE_COLORS: Record<string, string> = {
  "AI Render": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Marketing": "text-pink-400 bg-pink-400/10 border-pink-400/20",
  "AI image": "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  "AI Film": "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "VFX": "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "Graphic": "text-teal-400 bg-teal-400/10 border-teal-400/20",
  "Script": "text-neutral-300 bg-neutral-400/10 border-neutral-400/20",
  "Video": "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  "All": "text-white bg-[#171b21] border-[#2b333c]"
};

const STATUS_COLORS: Record<string, string> = {
  "Chưa bắt đầu": "text-neutral-400 bg-neutral-400/10 border-neutral-400/20",
  "Đang làm": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Chờ feedback": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Cần revise": "text-rose-400 bg-rose-400/10 border-rose-400/20",
  "Hoàn thành": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Tạm dừng": "text-stone-500 bg-stone-500/10 border-stone-500/20",
  "All": "text-white bg-[#171b21] border-[#2b333c]"
};

function ColorSelect({ 
  value, 
  options, 
  onChange, 
  colorMap,
  innerClassName = "px-3 py-2 rounded-lg border"
}: { 
  value: string; 
  options: {value: string, label: string}[]; 
  onChange: (v: string) => void;
  colorMap: Record<string, string>;
  innerClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const colorClass = colorMap[value] || "text-white bg-[#171b21] border-[#2b333c]";

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer ${colorClass} ${innerClassName}`}
      >
        <span className="truncate text-[10px] font-bold uppercase pr-4">{options.find(o => o.value === value)?.label || value}</span>
        <ChevronDown className="w-3 h-3 opacity-70 shrink-0 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full min-w-[140px] bg-[#1a1f26] border border-[#2b333c] rounded-lg shadow-xl z-50 overflow-hidden py-1">
            {options.map(opt => {
              const optColor = colorMap[opt.value] || "text-white";
              const textColorClass = optColor.split(' ').find(c => c.startsWith('text-')) || "text-white";
              const bgClass = optColor.split(' ').find(c => c.startsWith('bg-')) || "bg-transparent";
              return (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`px-3 py-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-white/5 transition-colors ${textColorClass} ${bgClass}`}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface ProjectsPageProps {
  db: GoogleSheetDB;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onUpdateProjectNotes: (id: string, notes: string) => void;
  onUpdateProject?: (p: Project) => void;
  onAddProject: (p: Project) => void;
  lang: "en" | "vi";
}

export default function ProjectsPage({
  db,
  selectedProjectId,
  onSelectProject,
  onUpdateProjectNotes,
  onUpdateProject,
  onAddProject,
  lang,
}: ProjectsPageProps) {
  const t = translations[lang];

  // Local filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // States for creating new project
  const [newProjName, setNewProjName] = useState("");
  const [newProjClient, setNewProjClient] = useState("");
  const [newProjBudget, setNewProjBudget] = useState(1200000000);
  const [newProjStatus, setNewProjStatus] = useState<ProjectStatus>("Chưa bắt đầu");
  const [newProjType, setNewProjType] = useState<ProjectType>("Video");
  const [newProjDueDate, setNewProjDueDate] = useState(lang === "en" ? "July 30, 2026" : "Ngày 30 tháng 7, 2026");

  // Filter and sort projects list
  const statusWeight: Record<string, number> = {
    "Đang làm": 1,
    "Cần revise": 2,
    "Chưa bắt đầu": 3,
    "Chờ feedback": 4,
    "Tạm dừng": 5,
    "Hoàn thành": 6
  };

  const parseDateSafe = (dateStr: any) => {
    if (!dateStr && dateStr !== 0) return 0;
    if (typeof dateStr === "number") {
      return new Date((dateStr - 25569) * 86400 * 1000).getTime();
    }
    const s = String(dateStr).trim();
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1])).getTime();
    }
    const d = new Date(s).getTime();
    if (!isNaN(d)) return d;
    const match = s.match(/Ngày (\d+) tháng (\d+), (\d+)/i);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])).getTime();
    }
    return 0;
  };

  const filteredProjects = db.projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    const matchesType = typeFilter === "All" || p.projectType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    const wA = statusWeight[a.status] || 99;
    const wB = statusWeight[b.status] || 99;
    
    if (wA === wB && a.status === "Hoàn thành") {
      return parseDateSafe(b.dueDate) - parseDateSafe(a.dueDate);
    }
    
    return wA - wB;
  });

  // Current focused project
  const activeFocus = db.projects.find(p => p.id === selectedProjectId) || filteredProjects[0] || db.projects[0];

  // CEO notes text area state
  const [notesText, setNotesText] = useState(activeFocus?.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);
  const [editingMilestoneText, setEditingMilestoneText] = useState("");
  const [confirmDeleteMilestoneIndex, setConfirmDeleteMilestoneIndex] = useState<number | null>(null);

  React.useEffect(() => {
    setNotesText(activeFocus?.notes || "");
    setIsEditingNotes(false);
    setEditingMilestoneIndex(null);
    setEditingMilestoneText("");
    setConfirmDeleteMilestoneIndex(null);
  }, [activeFocus]);

  // Aggregate project statistics
  const totalCount = db.projects.length;
  const inProgressCount = db.projects.filter(p => p.status === "Đang làm" || p.status === "Cần revise").length;
  const waitingCount = db.projects.filter(p => p.status === "Chờ feedback" || p.status === "Tạm dừng").length;
  const completedCount = db.projects.filter(p => p.status === "Hoàn thành").length;

  const handleSaveNotes = () => {
    if (activeFocus) {
      onUpdateProjectNotes(activeFocus.id, notesText);
      setIsEditingNotes(false);
      alert(lang === "en" ? "Project notes saved successfully!" : "Đã lưu ghi chú!");
    }
  };

  const handleToggleMilestone = (index: number) => {
    if (!onUpdateProject || !activeFocus) return;
    const updated = { ...activeFocus };
    updated.milestones = [...updated.milestones];
    updated.milestones[index] = { 
      ...updated.milestones[index], 
      completed: !updated.milestones[index].completed 
    };

    // Auto-update status based on milestones completion
    const allCompleted = updated.milestones.length > 0 && updated.milestones.every(m => m.completed);
    if (allCompleted) {
      updated.status = "Hoàn thành";
    } else if (updated.status === "Hoàn thành") {
      updated.status = "Đang làm";
    }

    onUpdateProject(updated);
  };

  const handleEditMilestone = (index: number) => {
    if (!onUpdateProject || !activeFocus) return;
    setEditingMilestoneIndex(index);
    setEditingMilestoneText(activeFocus.milestones[index].name);
  };

  const handleSaveMilestone = (index: number) => {
    if (!onUpdateProject || !activeFocus) {
      setEditingMilestoneIndex(null);
      return;
    }
    const newName = editingMilestoneText.trim();
    if (newName !== "" && newName !== activeFocus.milestones[index].name) {
      const updated = { ...activeFocus };
      updated.milestones = [...updated.milestones];
      updated.milestones[index] = { 
        ...updated.milestones[index], 
        name: newName 
      };
      onUpdateProject(updated);
    }
    setEditingMilestoneIndex(null);
  };

  const handleDeleteMilestone = (index: number) => {
    if (!onUpdateProject || !activeFocus) return;
    const updated = { ...activeFocus };
    updated.milestones = updated.milestones.filter((_, i) => i !== index);
    
    // Update status if needed after deletion
    const allCompleted = updated.milestones.length > 0 && updated.milestones.every(m => m.completed);
    if (allCompleted) {
      updated.status = "Hoàn thành";
    } else if (updated.status === "Hoàn thành" && updated.milestones.length > 0) {
      updated.status = "Đang làm";
    }

    onUpdateProject(updated);
    setConfirmDeleteMilestoneIndex(null);
  };

  const handleEditDeadline = () => {
    if (!onUpdateProject || !activeFocus) return;
    const newDate = window.prompt(lang === "en" ? "Edit deadline:" : "Sửa Deadline:", String(activeFocus.dueDate || ""));
    if (newDate !== null) {
      const updated = { ...activeFocus, dueDate: newDate.trim() };
      onUpdateProject(updated);
    }
  };

  const handleTypeChange = (value: string) => {
    if (!onUpdateProject || !activeFocus) return;
    const updated = { ...activeFocus, projectType: value as ProjectType };
    onUpdateProject(updated);
  };

  const handleStatusChange = (value: string) => {
    if (!onUpdateProject || !activeFocus) return;
    const updated = { ...activeFocus, status: value as ProjectStatus };
    onUpdateProject(updated);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjClient) {
      alert(lang === "en" ? "Please fill in the project and client names." : "Vui lòng nhập đầy đủ tên dự án và đối tác.");
      return;
    }
    const created: Project = {
      id: "proj_" + Date.now(),
      name: newProjName,
      client: newProjClient,
      status: newProjStatus,
      budget: Number(newProjBudget),
      received: 0,
      dueDate: newProjDueDate,
      nextAction: lang === "en" ? "Initial production schedule timeline configuration." : "Thiết lập tiến độ chạy dự án ban đầu.",
      projectType: newProjType,
      milestones: [
        { name: lang === "en" ? "Pre-production setup" : "Chuẩn bị tiền kỳ", date: lang === "en" ? "June 20, 2026" : "20 Tháng 6, 2026", completed: true },
        { name: lang === "en" ? "Principal Photography" : "Giai đoạn ghi hình chính", date: lang === "en" ? "July 5, 2026" : "5 Tháng 7, 2026", completed: false },
        { name: lang === "en" ? "Editing review" : "Phê duyệt dựng phim", date: lang === "en" ? "July 20, 2026" : "20 Tháng 7, 2026", completed: false },
        { name: lang === "en" ? "Wrap delivery" : "Bàn giao phim hoàn chỉnh", date: newProjDueDate, completed: false },
      ],
      paymentPhase: lang === "en" ? "Phase 1 of 3" : "Đợt 1 trên 3",
      paymentPhaseProgress: 0,
      thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
      notes: lang === "en" ? "Newly integrated via CEO Command panel." : "Được đăng ký thông qua cổng chỉ đạo CEO."
    };
    onAddProject(created);
    setIsCreatorOpen(false);
    setNewProjName("");
    setNewProjClient("");
    setNewProjBudget(1200000000);
    setNewProjStatus("Chưa bắt đầu");
    setNewProjType("Video");
  };

  const translateStatus = (stat: string) => {
    return stat;
  };

  // Safely format a dueDate that might be empty, a number (Excel serial), or a string
  const formatDueDate = (dueDate: any): string => {
    if (!dueDate && dueDate !== 0) return "—";
    if (typeof dueDate === "number") {
      // Excel serial date → JS Date
      const d = new Date((dueDate - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      return String(dueDate);
    }
    const s = String(dueDate).trim();
    const parsedTime = parseDateSafe(s);
    if (parsedTime > 0) {
      return new Date(parsedTime).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    return s || "—";
  };

  return (
    <div className="space-y-3 animate-fade-in text-white">
      
      {/* Top statistics overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{t.totalProjects}</p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{totalCount}</h4>
            <span className="text-[10px] text-[#10B981] font-mono">+ 8.3% {lang === "en" ? "vs last month" : "so với tháng trước"}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80">
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{t.inProgress}</p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{inProgressCount}</h4>
            <span className="text-[10px] text-emerald-300 font-mono">{t.activeCampaigns}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80">
          <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{t.waitingFeedback}</p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{waitingCount}</h4>
            <span className="text-[10px] text-cyan-400 font-mono">{t.needFeedback}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80">
          <p className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">{t.completed}</p>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{completedCount}</h4>
            <span className="text-[10px] text-teal-400 font-mono">{t.completedCountText}</span>
          </div>
        </div>

      </div>

      {/* Filter bar controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450" />
            <input
              type="text"
              placeholder={t.searchProjects}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#171b21] w-64 pl-9 pr-4 py-2 text-[10px] font-mono text-white rounded-lg border border-[#2b333c] focus:border-[#10B981] outline-none"
            />
          </div>

          <ColorSelect 
            value={statusFilter}
            onChange={setStatusFilter}
            colorMap={STATUS_COLORS}
            options={[
              { value: "All", label: t.allStatus },
              { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
              { value: "Đang làm", label: "Đang làm" },
              { value: "Chờ feedback", label: "Chờ feedback" },
              { value: "Cần revise", label: "Cần revise" },
              { value: "Hoàn thành", label: "Hoàn thành" },
              { value: "Tạm dừng", label: "Tạm dừng" }
            ]}
          />

          <ColorSelect 
            value={typeFilter}
            onChange={setTypeFilter}
            colorMap={PROJECT_TYPE_COLORS}
            options={[
              { value: "All", label: t.allType },
              { value: "AI Render", label: "AI Render" },
              { value: "Marketing", label: "Marketing" },
              { value: "AI image", label: "AI image" },
              { value: "AI Film", label: "AI Film" },
              { value: "VFX", label: "VFX" },
              { value: "Graphic", label: "Graphic" },
              { value: "Script", label: "Script" },
              { value: "Video", label: "Video" }
            ]}
          />
        </div>

        <button
          onClick={() => setIsCreatorOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-sans font-bold px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-950/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === "en" ? "Register Project" : "Nhập Dự Án Mới"}</span>
        </button>

      </div>

      {/* Main Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Projects Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 px-1 leading-none uppercase">
            <span>{lang === "en" ? `SHOWING ${filteredProjects.length} OUT OF ${db.projects.length} PROJECTS` : `HIỂN THỊ ${filteredProjects.length} TRÊN ${db.projects.length} DỰ ÁN`}</span>
            <span>{lang === "en" ? "CLICK TO VIEW DETAILS >>>" : "XEM CHI TIẾT >>>"}</span>
          </div>

          <div className="space-y-1.5">
            {filteredProjects.map((p) => {
              const remainsVal = p.budget - p.received;
              const isSelected = activeFocus?.id === p.id;
              const payPercent = Math.min(100, Math.round((p.received / p.budget) * 100));
              const isCompleted = p.status === "Hoàn thành";
              const completedTasks = p.milestones ? p.milestones.filter(m => m.completed).length : 0;
              const totalTasks = p.milestones ? p.milestones.length : 0;
              const taskProgress = isCompleted ? 100 : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`relative overflow-hidden rounded-xl p-3 pb-2.5 border transition cursor-pointer flex flex-col gap-2.5 ${
                    isSelected 
                      ? "border-emerald-500 bg-gradient-to-r from-[#121417] to-emerald-950/10 shadow-lg shadow-emerald-950/5" 
                      : "bg-[#121417] border-[#1e2329]/80 hover:border-neutral-700 hover:bg-[#15191e]"
                  }`}
                >
                  {p.status === "Hoàn thành" && (
                    <div className="absolute inset-0 bg-emerald-900/40 pointer-events-none z-10" />
                  )}
                  
                  {/* Main content row */}
                  <div className="relative z-0 flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shrink-0 relative">
                        {p.thumbnailUrl && (
                          <img 
                            src={p.thumbnailUrl} 
                            alt={p.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-70"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* Client Tag */}
                          <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded uppercase bg-blue-950/40 text-blue-400 border border-blue-900">
                            {p.client}
                          </span>
                          {/* Type Tag */}
                          <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded uppercase border ${PROJECT_TYPE_COLORS[p.projectType] || "text-white bg-neutral-800 border-neutral-700"}`}>
                            {p.projectType}
                          </span>
                          {/* Status Tag */}
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase border ${STATUS_COLORS[p.status] || "text-white bg-neutral-800 border-neutral-700"}`}>
                            {p.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-sans font-semibold text-white tracking-tight truncate mt-1">
                          {p.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5 text-orange-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          <p className="text-[10px] font-medium truncate leading-relaxed">
                            {lang === "en" ? "Next action: " : "Next action: "}{p.nextAction}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-5 shrink-0 border-t border-neutral-800/65 md:border-t-0 pt-3 md:pt-0">
                      
                      <div className="text-right">
                        <span className="block text-[10px] font-mono text-neutral-500 uppercase">{t.received}</span>
                        <span className="block text-[11px] font-mono font-bold text-white mt-0.5">
                          {formatVND(p.received)}
                        </span>
                        <span className="block text-[10px] text-neutral-400 font-mono mt-0.5">
                          {payPercent}% đã thu / {formatVND(p.budget)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="block text-[10px] font-mono text-neutral-500 uppercase">{t.dueDate}</span>
                        <span className="block text-[11px] text-neutral-200 mt-1 flex items-center justify-end font-mono">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                          <span>{formatDueDate(p.dueDate)}</span>
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Task progress bar below content */}
                  <div className="w-full h-[3px] bg-neutral-800 rounded-full overflow-hidden relative z-0">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${taskProgress}%` }} />
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="text-center py-12 bg-[#121417] border border-dashed border-neutral-800 rounded-xl text-neutral-500 font-sans text-xs">
                {lang === "en" ? "No film campaigns match your search criterion." : "Không có bộ phim nào khớp các tham chiếu tìm kiếm."}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Details Panel */}
        <div className="lg:col-span-4">
          {activeFocus ? (
            <div className="bg-[#121417] border border-emerald-500/10 rounded-xl overflow-hidden sticky top-6">
              
              <div className="relative h-28 bg-neutral-900 border-b border-neutral-800">
                {activeFocus.thumbnailUrl && (
                  <img 
                    src={activeFocus.thumbnailUrl} 
                    alt={activeFocus.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-45"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121417] via-black/40 to-transparent p-4 flex flex-col justify-end h-full">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-medium">{t.projectDetails}</span>
                  <p className="text-[10px] text-neutral-300 font-mono mt-0.5">{activeFocus.client}</p>
                  <h3 className="text-sm font-sans font-bold text-white tracking-tight truncate mt-0.5">
                    {activeFocus.name}
                  </h3>
                </div>
              </div>

              <div className="p-4 space-y-4 text-[10px] font-mono border-b border-[#1e2329]">
                <div className="grid grid-cols-2 gap-3.5 text-left">
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase">{t.budget}</span>
                    <strong className="block text-white text-[11px] mt-0.5 leading-none">
                      {formatVND(activeFocus.budget)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase">{t.received}</span>
                    <strong className="block text-emerald-400 text-[11px] mt-0.5 leading-none">
                      {formatVND(activeFocus.received)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-left pt-2.5 border-t border-neutral-800/40">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-neutral-500 uppercase">Deadline</span>
                    <div className="flex items-center space-x-1 mt-0.5 relative group">
                      <input
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        onClick={(e) => {
                          try {
                            if ('showPicker' in HTMLInputElement.prototype) {
                              e.currentTarget.showPicker();
                            }
                          } catch (err) {}
                        }}
                        value={(() => {
                           const parsed = parseDateSafe(activeFocus.dueDate);
                           if (!parsed) return "";
                           const d = new Date(parsed);
                           return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })()}
                        onChange={(e) => {
                           const newDate = e.target.value;
                           if (newDate && onUpdateProject && activeFocus) {
                              const d = new Date(newDate);
                              const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                              const updated = { ...activeFocus, dueDate: formatted };
                              onUpdateProject(updated);
                           }
                        }}
                      />
                      <strong className="block text-neutral-300 text-[11px] leading-none truncate group-hover:text-emerald-400 transition-colors" title={String(activeFocus.dueDate || "")}>
                        {formatDueDate(activeFocus.dueDate)}
                      </strong>
                      <Edit2 className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-neutral-500 uppercase truncate">{t.projectTypeLabel}</span>
                    <ColorSelect 
                      value={activeFocus.projectType}
                      onChange={handleTypeChange}
                      colorMap={PROJECT_TYPE_COLORS}
                      innerClassName="px-2 py-1 mt-0.5 rounded border"
                      options={[
                        { value: "AI Render", label: "AI Render" },
                        { value: "Marketing", label: "Marketing" },
                        { value: "AI image", label: "AI image" },
                        { value: "AI Film", label: "AI Film" },
                        { value: "VFX", label: "VFX" },
                        { value: "Graphic", label: "Graphic" },
                        { value: "Script", label: "Script" },
                        { value: "Video", label: "Video" }
                      ]}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-neutral-500 uppercase truncate">{t.status}</span>
                    <ColorSelect 
                      value={activeFocus.status}
                      onChange={handleStatusChange}
                      colorMap={STATUS_COLORS}
                      innerClassName="px-2 py-1 mt-0.5 rounded border"
                      options={[
                        { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
                        { value: "Đang làm", label: "Đang làm" },
                        { value: "Chờ feedback", label: "Chờ feedback" },
                        { value: "Cần revise", label: "Cần revise" },
                        { value: "Hoàn thành", label: "Hoàn thành" },
                        { value: "Tạm dừng", label: "Tạm dừng" }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-left pt-2.5 border-t border-neutral-800/40">
                  {(() => {
                    const isFullyPaid = activeFocus.received >= activeFocus.budget && activeFocus.budget > 0;
                    return [
                      { label: "Đợt 1", amount: activeFocus.paymentD1 },
                      { label: "Đợt 2", amount: activeFocus.paymentD2 },
                      { label: "Đợt 3", amount: activeFocus.paymentD3 },
                    ].map((phase, idx) => {
                      const isUnpaid = !phase.amount || phase.amount === 0;
                      const showDash = isFullyPaid && isUnpaid;
                      return (
                        <div key={idx} className={`p-2 bg-[#171b21] rounded border border-[#2b333c] ${showDash ? "opacity-30 grayscale" : ""}`}>
                          <span className="block text-[9px] text-neutral-500 uppercase mb-1">{phase.label}</span>
                          {showDash ? (
                            <strong className="block text-neutral-500 text-[10px]">-</strong>
                          ) : (
                            <strong className="block text-white text-[10px] truncate" title={phase.amount ? formatVND(phase.amount) : "0 đ"}>
                              {phase.amount ? formatVND(phase.amount) : "0 đ"}
                            </strong>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {activeFocus.status !== "Hoàn thành" && (
                  <div className="bg-[#171b21] p-3 rounded-lg border border-[#232a32]">
                    <span className="block text-[10px] font-mono text-neutral-500 uppercase">{lang === "en" ? "Next Action" : "Việc cần làm tiếp theo"}</span>
                    <div className="flex items-start mt-1 space-x-2 font-sans text-[11px] text-neutral-250">
                      <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="leading-relaxed font-semibold">{activeFocus.nextAction}</p>
                        {activeFocus.nextActionDue && (
                          <span className="block text-[10px] font-mono text-orange-400 mt-1">
                            Due: {activeFocus.nextActionDue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className={activeFocus.status === "Hoàn thành" ? "opacity-50 line-through grayscale" : ""}>
                  <span className="block text-[10px] font-mono text-neutral-500 uppercase mb-2">PRODUCTION MILESTONES</span>
                  <div className="space-y-2 text-[10px] font-mono">
                    {activeFocus.milestones.map((ms, index) => {
                      const isMsCompleted = activeFocus.status === "Hoàn thành" || ms.completed;
                      const isEditing = editingMilestoneIndex === index;
                      return (
                      <div key={index} className="flex items-center justify-between group">
                        <div 
                          className="flex items-center space-x-2 flex-1 min-w-0"
                        >
                          <div 
                            className={`w-3 h-3 shrink-0 rounded-full border border-neutral-600 flex items-center justify-center transition-colors cursor-pointer ${isMsCompleted ? "bg-[#10B981] border-[#10B981]" : "bg-[#171b21] hover:border-emerald-500"}`}
                            onClick={() => handleToggleMilestone(index)}
                          >
                            {isMsCompleted && <CheckCircle className="w-2 h-2 text-[#121417]" />}
                          </div>
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="flex-1 bg-[#171b21] border border-emerald-500/50 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 min-w-0"
                              value={editingMilestoneText}
                              onChange={(e) => setEditingMilestoneText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveMilestone(index);
                                if (e.key === "Escape") setEditingMilestoneIndex(null);
                              }}
                              onBlur={() => handleSaveMilestone(index)}
                            />
                          ) : (
                            <span 
                              className={`cursor-pointer ${isMsCompleted ? "text-neutral-400 line-through truncate" : "text-white font-medium truncate"}`}
                              onClick={() => handleToggleMilestone(index)}
                            >
                              {ms.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                          {!isEditing && (
                            <>
                              {confirmDeleteMilestoneIndex === index ? (
                                <>
                                  <button 
                                    onClick={() => handleDeleteMilestone(index)}
                                    className="opacity-100 transition-opacity text-[#10B981] hover:text-emerald-400 cursor-pointer mx-1"
                                    title={lang === "en" ? "Confirm" : "Đồng ý"}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteMilestoneIndex(null)}
                                    className="opacity-100 transition-opacity text-red-500 hover:text-red-400 cursor-pointer ml-1"
                                    title={lang === "en" ? "Cancel" : "Từ chối"}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleEditMilestone(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-emerald-400 cursor-pointer"
                                    title={lang === "en" ? "Edit milestone name" : "Chỉnh sửa tên task"}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteMilestoneIndex(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-orange-500 cursor-pointer"
                                    title={lang === "en" ? "Delete milestone" : "Xóa task"}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          <div className="relative group cursor-pointer flex items-center justify-end min-w-[70px]">
                            <input
                              type="date"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              onClick={(e) => {
                                try {
                                  if ('showPicker' in HTMLInputElement.prototype) {
                                    e.currentTarget.showPicker();
                                  }
                                } catch (err) {}
                              }}
                              value={(() => {
                                const parsed = parseDateSafe(ms.date);
                                if (!parsed) return "";
                                const d = new Date(parsed);
                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                              })()}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                if (newDate && onUpdateProject && activeFocus) {
                                  const d = new Date(newDate);
                                  const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                  const updated = { ...activeFocus };
                                  updated.milestones = [...updated.milestones];
                                  updated.milestones[index] = { ...updated.milestones[index], date: formatted };
                                  onUpdateProject(updated);
                                }
                              }}
                            />
                            <span className="text-[10px] text-neutral-500 group-hover:text-emerald-400 transition-colors">
                              {ms.date ? formatDueDate(ms.date) : "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>

                {/* DOCUMENT CHECKLIST removed as requested */}

                {activeFocus.notes && !isEditingNotes && (
                  <div className="bg-[#171b21] border border-[#232a32] p-3 rounded-lg text-xs leading-relaxed text-neutral-300 flex items-start space-x-2">
                    <button 
                      onClick={() => setIsEditingNotes(true)}
                      className="text-neutral-500 hover:text-emerald-400 cursor-pointer shrink-0 mt-0.5"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="block font-bold text-neutral-400 text-[10px] uppercase mb-1">
                        {lang === "en" ? "Notes" : "Ghi chú"}
                      </span>
                      <p className="text-[10px] text-neutral-350">{activeFocus.notes}</p>
                    </div>
                  </div>
                )}

                {(!activeFocus.notes || isEditingNotes) && (
                  <div className="border-t border-neutral-800/60 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-mono text-neutral-500 uppercase">
                        {lang === "en" ? "Notes" : "Ghi chú"}
                      </label>
                      {activeFocus.notes && isEditingNotes && (
                        <button 
                          onClick={() => {
                            setIsEditingNotes(false);
                            setNotesText(activeFocus.notes || "");
                          }}
                          className="text-[10px] text-neutral-500 hover:text-neutral-300"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder={lang === "en" ? "Enter notes here..." : "Nhập ghi chú tại đây..."}
                      className="w-full h-20 bg-[#171b21] p-2 text-[10px] font-sans text-neutral-300 rounded border border-[#232a32] focus:border-[#10B981] outline-none resize-none leading-relaxed"
                    />
                    <div className="flex justify-end mt-1.5">
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-[#10B981] hover:bg-emerald-400 text-neutral-900 text-[10px] font-mono font-bold rounded flex items-center space-x-1 cursor-pointer transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                        <span>{lang === "en" ? "Save Notes" : "Lưu ghi chú"}</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-[#121417] p-8 border border-dashed border-neutral-800 rounded-xl text-center text-neutral-400 font-sans text-xs">
              {lang === "en" ? "Select or register a film campaign in the left directory list." : "Vách xuất thông tin rỗng. Vui lòng trỏ tìm dự án bên trái."}
            </div>
          )}
        </div>

      </div>

      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#121417] border border-[#1e2329] rounded-xl max-w-md w-full p-6 space-y-4">
            
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.createNewProject}</h3>
              <button 
                onClick={() => setIsCreatorOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs font-mono text-neutral-300">
              
              <div>
                <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.projectName}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TVC_AN_PHIM_Khai_Trang_2026"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-[#171b21] border border-[#2b333c] text-white rounded p-2 focus:border-emerald-500 outline-none text-[10px]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.clientName}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galaxy Cinemas"
                  value={newProjClient}
                  onChange={(e) => setNewProjClient(e.target.value)}
                  className="w-full bg-[#171b21] border border-[#2b333c] text-white rounded p-2 focus:border-emerald-500 outline-none text-[10px]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.budgetVnd}</label>
                <input
                  type="number"
                  required
                  value={newProjBudget}
                  onChange={(e) => setNewProjBudget(Number(e.target.value))}
                  className="w-full bg-[#171b21] border border-[#2b333c] text-emerald-400 rounded p-2 focus:border-emerald-500 outline-none font-bold text-[10px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.status}</label>
                  <select
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value as any)}
                    className="w-full bg-[#171b21] border border-[#2b333c] text-white rounded p-2 outline-none text-[10px]"
                  >
                    <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                    <option value="Đang làm">Đang làm</option>
                    <option value="Chờ feedback">Chờ feedback</option>
                    <option value="Cần revise">Cần revise</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.projectTypeLabel}</label>
                  <select
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value as any)}
                    className="w-full bg-[#171b21] border border-[#2b333c] text-white rounded p-2 outline-none text-[10px]"
                  >
                    <option value="AI Render">AI Render</option>
                    <option value="Marketing">Marketing</option>
                    <option value="AI image">AI image</option>
                    <option value="AI Film">AI Film</option>
                    <option value="VFX">VFX</option>
                    <option value="Graphic">Graphic</option>
                    <option value="Script">Script</option>
                    <option value="Video">Video</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-neutral-400 uppercase text-[9px] mb-1">{t.dueDate}</label>
                  <input
                    type="text"
                    required
                    value={newProjDueDate}
                    onChange={(e) => setNewProjDueDate(e.target.value)}
                    className="w-full bg-[#171b21] border border-[#2b333c] text-white rounded p-2 outline-none text-[10px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="px-4 py-2 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 rounded font-sans transition text-[10px] cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "Hủy bỏ"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] hover:bg-emerald-400 text-neutral-900 rounded font-sans font-bold transition text-[10px] cursor-pointer"
                >
                  {t.save}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
