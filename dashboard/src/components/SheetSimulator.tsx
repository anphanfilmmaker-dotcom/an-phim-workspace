/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, Project, DocumentItem, CEOAction, AIAgent, CashFlowPoint } from "../types";
import { Database, Plus, Trash2, X, RefreshCw, Check, Save } from "lucide-react";
import { formatVND } from "../data";

interface SheetSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  db: GoogleSheetDB;
  onSync: (newDb: GoogleSheetDB) => void;
  lang?: "en" | "vi";
}

type TabName = "Projects" | "CashFlow" | "Documents" | "Actions" | "Agents" | "Globals";

export default function SheetSimulator({ isOpen, onClose, db, onSync, lang = "vi" }: SheetSimulatorProps) {
  const [activeTab, setActiveTab] = useState<TabName>("Projects");
  const [localDb, setLocalDb] = useState<GoogleSheetDB>(JSON.parse(JSON.stringify(db)));
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    onSync(localDb);
    showToast("Synced successfully with Google Sheet!");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to revert to the default sheet template? All edits will be lost.")) {
      const { INITIAL_SHEET_DATA } = require("../data"); // Dynamic load to avoid circular reference issues if any
      setLocalDb(JSON.parse(JSON.stringify(INITIAL_SHEET_DATA)));
      showToast("Sheet reverted to template!");
    }
  };

  // Add row helper for Projects
  const addProjectRow = () => {
    const newProj: Project = {
      id: "proj_" + Date.now(),
      name: "New Film Project",
      client: "New Client Ltd",
      status: "Chờ feedback",
      budget: 1500000000,
      received: 300000000,
      dueDate: "Dec 31, 2026",
      nextAction: "Initial consultation & kick-off setup",
      nextActionDue: "June 20, 2026",
      projectType: "AI Film",
      milestones: [
        { name: "Pre-production", date: "June 30, 2026", completed: false },
        { name: "Principal Photography", date: "August 15, 2026", completed: false },
      ],
      paymentPhase: "Phase 1 of 3",
      paymentPhaseProgress: 20
    };
    setLocalDb({
      ...localDb,
      projects: [...localDb.projects, newProj]
    });
    showToast("Added new row to PROJECTS spreadsheet tab.");
  };

  // Add row helper for Documents
  const addDocumentRow = () => {
    const newDoc: DocumentItem = {
      id: "doc_" + Date.now(),
      name: "NDA_New_Project.pdf",
      project: localDb.projects[0]?.name || "TVC Launch Film",
      type: "NDA",
      status: "Pending",
      owner: "Alex Nguyen",
      lastUpdated: "June 6, 2026 05:00 PM",
      fileSize: "1.2 MB"
    };
    setLocalDb({
      ...localDb,
      documents: [...localDb.documents, newDoc]
    });
    showToast("Added new row to DOCUMENTS spreadsheet tab.");
  };

  // Add row helper for CEO Actions
  const addActionRow = () => {
    const newAct: CEOAction = {
      id: "act_" + Date.now(),
      priorityOrder: localDb.actions.length + 1,
      title: "Review new project requirements",
      project: "General",
      priorityLevel: "Medium",
      suggestedAgent: "PM Agent",
      status: "Pending"
    };
    setLocalDb({
      ...localDb,
      actions: [...localDb.actions, newAct]
    });
    showToast("Added new row to ACTIONS spreadsheet tab.");
  };

  const deleteRow = (tab: TabName, id: string) => {
    if (tab === "Projects") {
      setLocalDb({
        ...localDb,
        projects: localDb.projects.filter(p => p.id !== id)
      });
    } else if (tab === "Documents") {
      setLocalDb({
        ...localDb,
        documents: localDb.documents.filter(d => d.id !== id)
      });
    } else if (tab === "Actions") {
      setLocalDb({
        ...localDb,
        actions: localDb.actions.filter(a => a.id !== id)
      });
    }
    showToast("Removed row successfully.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-6xl h-[85vh] bg-[#121417] border border-[#1e2329] rounded-xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-[#171b21] px-6 py-4 border-b border-[#1e2329] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-md font-sans font-semibold text-white tracking-tight flex items-center">
                Google Sheets Live DB Simulator
                <span className="ml-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full font-mono">
                  ● Connected to AN PHIM Google Drive
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Spreadsheet URL: https://docs.google.com/spreadsheets/d/1AnPhimOS_v4_CEODatabase/edit
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-[#2c3540] hover:bg-neutral-800 text-xs font-mono font-medium text-neutral-300 flex items-center space-x-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Template</span>
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-medium flex items-center space-x-1.5 transition shadow-lg shadow-emerald-950/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sync to AN PHIM OS</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#2c3540] hover:bg-neutral-800 text-neutral-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-[#14181f] px-6 border-b border-[#1e2329] flex items-center justify-between overflow-x-auto whitespace-nowrap">
          <div className="flex space-x-4">
            {(["Projects", "CashFlow", "Documents", "Actions", "Agents", "Globals"] as TabName[]).map((tab) => {
              const isActive = activeTab === tab;
              const tabLabels: Record<TabName, string> = {
                Projects: "🎬 Projects Tab",
                CashFlow: "💰 Cash Flow Tab",
                Documents: "📑 Giấy tờ / Documents Tab",
                Actions: "✏️ CEO Actions Tab",
                Agents: "🧠 AI Workers Tab",
                Globals: "📊 Dashboard Config",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-xs font-mono border-b-2 tracking-wide transition ${
                    isActive
                      ? "text-emerald-400 border-emerald-500 font-bold"
                      : "text-neutral-400 border-transparent hover:text-neutral-250 hover:border-neutral-700"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>
          
          <div className="text-xs font-mono text-neutral-500">
            Auto-recalculation enabled
          </div>
        </div>

        {/* Spreadsheet Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-[#0e1013]">
          {notification && (
            <div className="mb-4 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded-lg p-3 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{notification}</span>
              </span>
              <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Active Spreadsheet Pane */}
          {activeTab === "Projects" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-neutral-400">
                  Every row below maps directly to an active project client card. Modifying these cell values adapts metrics dynamically on the main screen.
                </p>
                <button
                  onClick={addProjectRow}
                  className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 text-xs font-mono rounded border border-emerald-500/20 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert Row</span>
                </button>
              </div>

              <div className="border border-[#1e2329] rounded-lg overflow-hidden bg-[#121417]">
                <table className="w-full text-left border-collapse text-xs font-mono text-white">
                  <thead>
                    <tr className="bg-[#171b21] text-neutral-400 border-b border-[#1e2329] text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Project Name [A]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Client [B]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Status [C]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Budget (VND) [D]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Received (VND) [E]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Due Date [F]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Risk Level [G]</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDb.projects.map((proj, idx) => (
                      <tr key={proj.id} className="border-b border-[#1b2026] hover:bg-[#15191f]">
                        <td className="py-2 px-1 text-center text-neutral-500 border-r border-[#1cd586]/10 font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].name = e.target.value;
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={proj.client}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].client = e.target.value;
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <select
                            value={proj.status}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].status = e.target.value as any;
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-[#171b21] text-xs text-emerald-400 tracking-tight rounded px-1.5 py-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                            <option value="Đang làm">Đang làm</option>
                            <option value="Chờ feedback">Chờ feedback</option>
                            <option value="Cần revise">Cần revise</option>
                            <option value="Hoàn thành">Hoàn thành</option>
                            <option value="Tạm dừng">Tạm dừng</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-36">
                          <input
                            type="number"
                            value={proj.budget}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].budget = Number(e.target.value);
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-transparent text-right w-full px-2 py-1 focus:bg-[#1f2733] border-none text-emerald-400 rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-36">
                          <input
                            type="number"
                            value={proj.received}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].received = Number(e.target.value);
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-transparent text-right w-full px-2 py-1 focus:bg-[#1f2733] border-none text-amber-500 rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={proj.dueDate}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].dueDate = e.target.value;
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <select
                            value={proj.riskLevel}
                            onChange={(e) => {
                              const list = [...localDb.projects];
                              list[idx].riskLevel = e.target.value as any;
                              setLocalDb({ ...localDb, projects: list });
                            }}
                            className="bg-[#171b21] text-xs text-orange-400 rounded px-1.5 py-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="None">None</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => deleteRow("Projects", proj.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "CashFlow" && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400 font-mono">
                Daily / weekly snapshot points supporting cash flow visual graphs inside Overview and Finance:
              </p>
              
              <div className="border border-[#1e2329] rounded-lg overflow-hidden bg-[#121417]">
                <table className="w-full text-left border-collapse text-xs font-mono text-white">
                  <thead>
                    <tr className="bg-[#171b21] text-neutral-400 border-b border-[#1e2329] text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Label [A]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Inflow (VND) [B]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Outflow (VND) [C]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Net Profit (VND) [D]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDb.cashFlow.map((cf, idx) => (
                      <tr key={cf.id} className="border-b border-[#1b2026] hover:bg-[#15191f]">
                        <td className="py-2 px-1 text-center text-neutral-500 border-r border-[#1cd586]/10 font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={cf.label}
                            onChange={(e) => {
                              const list = [...localDb.cashFlow];
                              list[idx].label = e.target.value;
                              setLocalDb({ ...localDb, cashFlow: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="number"
                            value={cf.inflow}
                            onChange={(e) => {
                              const list = [...localDb.cashFlow];
                              const inf = Number(e.target.value);
                              list[idx].inflow = inf;
                              list[idx].netProfit = inf - list[idx].outflow;
                              setLocalDb({ ...localDb, cashFlow: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-emerald-400 text-right rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="number"
                            value={cf.outflow}
                            onChange={(e) => {
                              const list = [...localDb.cashFlow];
                              const outf = Number(e.target.value);
                              list[idx].outflow = outf;
                              list[idx].netProfit = list[idx].inflow - outf;
                              setLocalDb({ ...localDb, cashFlow: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-orange-400 text-right rounded outline-none"
                          />
                        </td>
                        <td className="p-2 border-r border-[#1b2026] text-right font-bold text-slate-300">
                          {formatVND(cf.netProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-neutral-400">
                  Spreadsheet containing legal, budget files, contracts, NDAs, and statuses.
                </p>
                <button
                  onClick={addDocumentRow}
                  className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 text-xs font-mono rounded border border-emerald-500/20 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert Doc Row</span>
                </button>
              </div>

              <div className="border border-[#1e2329] rounded-lg overflow-hidden bg-[#121417]">
                <table className="w-full text-left border-collapse text-xs font-mono text-white">
                  <thead>
                    <tr className="bg-[#171b21] text-neutral-400 border-b border-[#1e2329] text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Document Name [A]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Related Project [B]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Type [C]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Status [D]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Owner [E]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Last Updated [F]</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDb.documents.map((doc, idx) => (
                      <tr key={doc.id} className="border-b border-[#1b2026] hover:bg-[#15191f]">
                        <td className="py-2 px-1 text-center text-neutral-500 border-r border-[#1cd586]/10 font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={doc.name}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].name = e.target.value;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <select
                            value={doc.project}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].project = e.target.value;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-[#171b21] text-xs text-neutral-200 rounded px-1.5 py-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="General">General</option>
                            {localDb.projects.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-24">
                          <select
                            value={doc.type}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].type = e.target.value as any;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-[#171b21] text-xs rounded px-1 text-neutral-300 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="Contract">Contract</option>
                            <option value="NDA">NDA</option>
                            <option value="Invoice">Invoice</option>
                            <option value="Budget">Budget</option>
                            <option value="Brief">Brief</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <select
                            value={doc.status}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].status = e.target.value as any;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-[#171b21] text-xs text-emerald-400 rounded px-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="Signed">Signed</option>
                            <option value="Missing">Missing</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <input
                            type="text"
                            value={doc.owner}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].owner = e.target.value;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={doc.lastUpdated}
                            onChange={(e) => {
                              const list = [...localDb.documents];
                              list[idx].lastUpdated = e.target.value;
                              setLocalDb({ ...localDb, documents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-neutral-400 rounded outline-none"
                          />
                        </td>
                        <td className="p-2 text-center text-neutral-500">
                          <button
                            onClick={() => deleteRow("Documents", doc.id)}
                            className="p-1 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Actions" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-neutral-400">
                  Priority Action workflow items that appear in the CEO Today's Priority checklist.
                </p>
                <button
                  onClick={addActionRow}
                  className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 text-xs font-mono rounded border border-emerald-500/20 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert Action Row</span>
                </button>
              </div>

              <div className="border border-[#1e2329] rounded-lg overflow-hidden bg-[#121417]">
                <table className="w-full text-left border-collapse text-xs font-mono text-white">
                  <thead>
                    <tr className="bg-[#171b21] text-neutral-400 border-b border-[#1e2329] text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-16 text-center">Order</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Action Title [B]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Related Project [C]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Priority [D]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">AI worker [E]</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Status [F]</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDb.actions.map((act, idx) => (
                      <tr key={act.id} className="border-b border-[#1b2026] hover:bg-[#15191f]">
                        <td className="py-2 px-1 text-center text-neutral-500 border-r border-[#1cd586]/10 font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="number"
                            value={act.priorityOrder}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].priorityOrder = Number(e.target.value);
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-transparent text-center w-full px-1 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={act.title}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].title = e.target.value;
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={act.project}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].project = e.target.value;
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-24">
                          <select
                            value={act.priorityLevel}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].priorityLevel = e.target.value as any;
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-[#171b21] text-xs text-orange-400 rounded px-1.5 py-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <input
                            type="text"
                            value={act.suggestedAgent}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].suggestedAgent = e.target.value;
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-32">
                          <select
                            value={act.status}
                            onChange={(e) => {
                              const list = [...localDb.actions];
                              list[idx].status = e.target.value as any;
                              setLocalDb({ ...localDb, actions: list });
                            }}
                            className="bg-[#171b21] text-xs text-emerald-400 rounded px-1.5 py-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Done">Done</option>
                            <option value="Waiting">Waiting</option>
                            <option value="Need Follow-up">Need Follow-up</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => deleteRow("Actions", act.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Agents" && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                AI Workers workforce roster with status parameters, workload percentages, and individual capabilities.
              </p>

              <div className="border border-[#1e2329] rounded-lg overflow-hidden bg-[#121417]">
                <table className="w-full text-left border-collapse text-xs font-mono text-white">
                  <thead>
                    <tr className="bg-[#171b21] text-neutral-400 border-b border-[#1e2329] text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-r border-[#1e2329] w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Agent Worker Name</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Status</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Workload %</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Current Task Column</th>
                      <th className="py-2.5 px-3 border-r border-[#1e2329]">Key Responsibility</th>
                      <th className="py-2.5 px-3">Recent Activity Logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDb.agents.map((agent, idx) => (
                      <tr key={agent.id} className="border-b border-[#1b2026] hover:bg-[#15191f]">
                        <td className="py-2 px-1 text-center text-neutral-500 border-r border-[#1cd586]/10 font-bold">{idx + 1}</td>
                        <td className="p-1.5 border-r border-[#1b2026] text-emerald-400 font-bold w-40">
                          {agent.name}
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <select
                            value={agent.status}
                            onChange={(e) => {
                              const list = [...localDb.agents];
                              list[idx].status = e.target.value as any;
                              setLocalDb({ ...localDb, agents: list });
                            }}
                            className="bg-[#171b21] text-xs text-emerald-400 rounded px-1 w-full outline-none border border-[#2b333c]"
                          >
                            <option value="Active">Active</option>
                            <option value="Monitoring">Monitoring</option>
                            <option value="Need Input">Need Input</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-28">
                          <input
                            type="number"
                            value={agent.workloadProgress}
                            onChange={(e) => {
                              const list = [...localDb.agents];
                              list[idx].workloadProgress = Number(e.target.value);
                              setLocalDb({ ...localDb, agents: list });
                            }}
                            className="bg-transparent text-center w-full px-1 py-1 focus:bg-[#1f2733] border-none text-white rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026] w-48">
                          <input
                            type="text"
                            value={agent.currentTask}
                            onChange={(e) => {
                              const list = [...localDb.agents];
                              list[idx].currentTask = e.target.value;
                              setLocalDb({ ...localDb, agents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-neutral-200 rounded outline-none"
                          />
                        </td>
                        <td className="p-1 border-r border-[#1b2026]">
                          <input
                            type="text"
                            value={agent.keyResponsibility}
                            onChange={(e) => {
                              const list = [...localDb.agents];
                              list[idx].keyResponsibility = e.target.value;
                              setLocalDb({ ...localDb, agents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-neutral-400 text-xs rounded outline-none"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={agent.recentActivity}
                            onChange={(e) => {
                              const list = [...localDb.agents];
                              list[idx].recentActivity = e.target.value;
                              setLocalDb({ ...localDb, agents: list });
                            }}
                            className="bg-transparent w-full px-2 py-1 focus:bg-[#1f2733] border-none text-neutral-400 text-[11px] rounded outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Globals" && (
            <div className="space-y-6">
              <p className="text-xs text-neutral-400">
                Core database parameters that populate main floating highlights.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#121417] p-5 rounded-lg border border-[#1e2329] space-y-4">
                  <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest border-b border-neutral-800 pb-2">
                    Available Cash Ledger (VND)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">
                        Liquid Balance
                      </label>
                      <input
                        type="number"
                        value={localDb.dashboard.cashAvailable}
                        onChange={(e) => {
                          setLocalDb({
                            ...localDb,
                            dashboard: { ...localDb.dashboard, cashAvailable: Number(e.target.value) }
                          });
                        }}
                        className="bg-[#171b21] w-full px-3 py-2 text-emerald-400 border border-[#2b333c] rounded font-mono text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">
                        Cash Growth Trend Info Card
                      </label>
                      <input
                        type="text"
                        value={localDb.dashboard.cashAvailableChange}
                        onChange={(e) => {
                          setLocalDb({
                            ...localDb,
                            dashboard: { ...localDb.dashboard, cashAvailableChange: e.target.value }
                          });
                        }}
                        className="bg-[#171b21] w-full px-3 py-2 text-white border border-[#2b333c] rounded font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#121417] p-5 rounded-lg border border-[#1e2329] space-y-4">
                  <h3 className="text-xs font-mono text-orange-400 uppercase tracking-widest border-b border-neutral-800 pb-2">
                    Receivables Summary (Pre-calcs based on budget gaps)
                  </h3>
                  <div className="text-xs text-neutral-450 leading-relaxed font-sans space-y-2">
                    <p>
                      Usually, receivables represent <code className="text-emerald-400">Budget - Received</code> across all active film projects.
                    </p>
                    <p>
                      The current calculated sum is:{" "}
                      <strong className="text-white font-mono text-sm">
                        {formatVND(
                          localDb.projects
                            .filter((p) => p.status !== "Hoàn thành")
                            .reduce((sum, p) => sum + (p.budget - p.received), 0)
                        )}
                      </strong>
                    </p>
                    <p className="text-neutral-500 text-[11px]">
                      The OS binds this sum dynamically when you hit sync! This keeps the command center aligned with true project accounting.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#171b21] px-6 py-4 border-t border-[#1e2329] flex items-center justify-between text-xs font-mono text-neutral-400">
          <div>
            Press <code className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-900">Sync to AN PHIM OS</code> to propagate modifications instantly.
          </div>
          <div className="flex space-x-2">
            <span>Server Status:</span>
            <span className="text-emerald-400 font-bold animate-pulse">● SYNCED READY</span>
          </div>
        </div>

      </div>
    </div>
  );
}
