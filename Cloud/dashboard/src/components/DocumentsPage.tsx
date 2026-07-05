/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, DocumentItem, DocType, DocStatus } from "../types";
import { 
  FileText, 
  Search, 
  Check,
  ExternalLink,
  Edit2,
  Sparkles
} from "lucide-react";
import { translations } from "../translations";

interface DocumentsPageProps {
  db: GoogleSheetDB;
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocStatus: (docId: string, status: DocStatus) => void;
  onDeleteDocument: (docId: string) => void;
  onUpdateProjectDocument?: (projectId: string, field: string, value: any) => void;
  onUpdateProjectNotes?: (projectId: string, notes: string) => void;
  lang: "en" | "vi";
}

export default function DocumentsPage({
  db,
  onUpdateProjectDocument,
  onUpdateProjectNotes,
  lang,
}: DocumentsPageProps) {
  const t = translations[lang];

  const [selectedProject, setSelectedProject] = useState(db.projects[0]?.name || "");
  const [projectFilter, setProjectFilter] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

  const filteredProjectDocuments = (db.projectDocuments || [])
    .filter(pd => pd.projectName.toLowerCase().includes(projectFilter.toLowerCase()))
    .sort((a, b) => {
      const aComplete = a.quote && a.contract && a.vatR1 && a.vatR2 && a.vatR3 && a.liquidation;
      const bComplete = b.quote && b.contract && b.vatR1 && b.vatR2 && b.vatR3 && b.liquidation;
      if (aComplete && !bComplete) return 1;
      if (!aComplete && bComplete) return -1;
      return 0;
    });

  return (
    <div className="space-y-4 animate-fade-in text-white pb-10">
      {/* Top dashboard summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{lang === "en" ? "Missing Documents" : "Dự án thiếu giấy tờ"}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">
              {db.projectDocuments?.filter(p => [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].filter(Boolean).length < 6).length || 0}
            </h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/25 transition">
          <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">{lang === "en" ? "Completed Sets" : "Đầy đủ giấy tờ"}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">
              {db.projectDocuments?.filter(p => [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].filter(Boolean).length === 6).length || 0}
            </h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-orange-500/10 hover:border-orange-500/25 transition">
          <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest">{lang === "en" ? "Unsigned Projects" : "Dự án chưa kí"}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">
              {db.projectDocuments?.filter(p => [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].filter(Boolean).length <= 1).length || 0}
            </h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-blue-500/10 hover:border-blue-500/25 transition">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">{lang === "en" ? "Pending Invoices" : "Hóa đơn chờ duyệt"}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">
              {db.projectDocuments?.filter(p => {
                const hasDoc = [p.quote, p.contract, p.vatR1, p.vatR2, p.vatR3, p.liquidation].some(Boolean);
                const proj = db.projects.find(proj => proj.name === p.projectName);
                return hasDoc && proj && proj.received === 0;
              }).length || 0}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Document Matrix */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Matrix Table */}
          <div className="overflow-hidden">
            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                {lang === "en" ? "Project Documents Matrix" : "Bảng Theo Dõi Hồ Sơ Dự Án"}
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-450" />
                <input
                  type="text"
                  placeholder={lang === "en" ? "Filter projects..." : "Tìm dự án..."}
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="bg-[#121417] w-56 pl-9 pr-4 py-1.5 text-[10px] font-mono text-white rounded-lg border border-[#2b333c] focus:border-[#10B981] outline-none"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono text-neutral-300 border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2329]/60 text-[10px] text-neutral-400 uppercase leading-none text-center">
                    <th className="py-2 px-1 text-left">{lang === "en" ? "Project" : "Dự án"}</th>
                    <th className="py-2 px-0.5">Tiến độ</th>
                    <th className="py-2 px-0.5">Báo giá</th>
                    <th className="py-2 px-0.5">Hợp đồng</th>
                    <th className="py-2 px-0.5">VAT R1</th>
                    <th className="py-2 px-0.5">VAT R2</th>
                    <th className="py-2 px-0.5">VAT R3</th>
                    <th className="py-2 px-0.5">BBTL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjectDocuments.map((pd) => {
                     const completedDocs = [pd.quote, pd.contract, pd.vatR1, pd.vatR2, pd.vatR3, pd.liquidation].filter(Boolean).length;
                     const progress = Math.round((completedDocs / 6) * 100);
                     const isComplete = completedDocs === 6;
                     const renderCell = (hasDoc: boolean, isVat: boolean) => (
                       <td className="py-2 px-0.5 text-center">
                         <div className={`mx-auto w-4 h-4 flex items-center justify-center rounded ${hasDoc ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900' : 'bg-[#171b21] text-neutral-600 border border-[#2b333c]'}`}>
                           {hasDoc ? <Check className="w-3 h-3" /> : '-'}
                         </div>
                       </td>
                     );

                     return (
                       <tr 
                          key={pd.projectId} 
                          className={`border-b border-[#1e2329]/40 hover:bg-[#15191f] transition cursor-pointer ${isComplete ? "bg-emerald-950/10 text-emerald-100" : ""} ${selectedProject === pd.projectName ? "bg-[#15191f] border-l-2 border-l-orange-500" : ""}`} 
                          onClick={() => setSelectedProject(pd.projectName)}
                        >
                         <td className={`py-3 px-2 font-sans font-medium max-w-[200px] truncate ${isComplete ? "text-emerald-400" : "text-white"}`} title={pd.projectName}>
                           {pd.projectName}
                         </td>
                         <td className="py-2 px-1">
                           <div className="flex items-center space-x-[2px] justify-center" title={`${progress}%`}>
                             {[1, 2, 3, 4, 5, 6].map(step => (
                               <div 
                                 key={step} 
                                 className={`w-1.5 h-2.5 rounded-[1px] transition-all duration-300 ${completedDocs >= step ? (completedDocs === 6 ? 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]' : 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.4)]') : 'bg-[#171b21] border border-[#2b333c]'}`} 
                               />
                             ))}
                           </div>
                         </td>
                         {renderCell(pd.quote, false)}
                         {renderCell(pd.contract, false)}
                         {renderCell(pd.vatR1, true)}
                         {renderCell(pd.vatR2, true)}
                         {renderCell(pd.vatR3, true)}
                         {renderCell(pd.liquidation, false)}
                       </tr>
                     )
                  })}
                  {filteredProjectDocuments.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-6 text-[10px] text-neutral-500">No project documents found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Document Links & Alerts */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Document Links Panel */}
          <div className="bg-[#121417] rounded-xl border border-[#1e2329]/80 overflow-hidden">
            {(() => {
              const activeFocus = db.projects.find(p => p.name === selectedProject);
              return (
                <>
                  {activeFocus ? (
                    <>
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
                          <span className="text-[10px] uppercase font-mono text-emerald-400 font-medium">
                            {lang === "en" ? "Project Files" : "Tệp Của Dự Án"}
                          </span>
                          <p className="text-[10px] text-neutral-300 font-mono mt-0.5">{activeFocus.client}</p>
                          <h3 className="text-sm font-sans font-bold text-white tracking-tight truncate mt-0.5">
                            {activeFocus.name}
                          </h3>
                        </div>
                      </div>

                      <div className="p-4 space-y-4 text-[10px] font-mono border-b border-[#1e2329]">
                        <div className="grid grid-cols-2 gap-3.5 text-left">
                          <div>
                            <span className="block text-[10px] text-neutral-500 uppercase">{lang === "en" ? "Budget" : "Tổng ngân sách"}</span>
                            <strong className="block text-white text-[11px] mt-0.5 leading-none">
                              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(activeFocus.budget)}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-neutral-500 uppercase">{lang === "en" ? "Received" : "Đã nhận"}</span>
                            <strong className="block text-emerald-400 text-[11px] mt-0.5 leading-none">
                              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(activeFocus.received)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-5 border-b border-[#1e2329]">
                      <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                        {lang === "en" ? "Project Files" : "Tệp Của Dự Án"}
                      </h3>
                      <p className="text-[10px] text-neutral-400 leading-snug mt-1 font-sans font-medium text-white truncate" title={selectedProject}>
                        {selectedProject}
                      </p>
                    </div>
                  )}

                  <div className="p-4 space-y-6">
                    {/* DOCUMENT CHECKLIST */}
                    {(() => {
                      const docSet = db.projectDocuments?.find(d => d.projectName === selectedProject);
                      if (!docSet) return null;
                      
                      const docs = [
                        { label: "Báo giá", field: "quote", completed: docSet.quote, link: docSet.quoteLink },
                        { label: "Hợp đồng", field: "contract", completed: docSet.contract, link: docSet.contractLink },
                        { label: "VAT R1", field: "vatR1", completed: docSet.vatR1, link: docSet.vatR1Link },
                        { label: "VAT R2", field: "vatR2", completed: docSet.vatR2, link: docSet.vatR2Link },
                        { label: "VAT R3", field: "vatR3", completed: docSet.vatR3, link: docSet.vatR3Link },
                        { label: "Biên bản thanh lý", field: "liquidation", completed: docSet.liquidation, link: docSet.liquidationLink },
                      ];

                      const isComplete = docs.every(d => d.completed);
                      const displayStatus = docSet.overallStatus || (isComplete ? "đã đủ" : "Chưa có");

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="block text-[10px] font-mono text-neutral-500 uppercase">DOCUMENT CHECKLIST</span>
                            <select 
                              className="bg-[#171b21] border border-neutral-700 hover:border-neutral-500 text-[10px] text-neutral-300 rounded outline-none px-1.5 py-0.5 cursor-pointer appearance-none transition max-w-[100px]"
                              value={displayStatus}
                              onChange={(e) => {
                                 const val = e.target.value;
                                 onUpdateProjectDocument && onUpdateProjectDocument(docSet.projectId, 'overallStatus', val);
                              }}
                            >
                              <option value="Chưa có">Chưa có</option>
                              <option value="Đã kí">Đã kí</option>
                              <option value="Chờ kí">Chờ kí</option>
                              <option value="đã gửi">Đã gửi</option>
                              <option value="đã đủ">Đã đủ</option>
                              <option value="chờ đợt 2">Chờ đợt 2</option>
                            </select>
                          </div>
                          <div className="space-y-2 text-[10px] font-mono">
                            {docs.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between group">
                                <div 
                                  className="flex items-center space-x-2.5 cursor-pointer select-none"
                                  onClick={() => onUpdateProjectDocument && onUpdateProjectDocument(docSet.projectId, doc.field, !doc.completed)}
                                >
                                  <div className={`w-3.5 h-3.5 shrink-0 rounded-sm flex items-center justify-center transition-colors ${doc.completed ? "bg-[#10B981] text-[#121417]" : "bg-[#171b21] border border-neutral-600 text-transparent hover:border-emerald-500"}`}>
                                    <Check className="w-3 h-3" />
                                  </div>
                                  <div className="flex items-center">
                                    <span className={doc.completed ? "text-emerald-400 font-medium truncate drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-neutral-500 font-medium truncate"}>
                                      {doc.label}
                                    </span>
                                    {doc.completed && (
                                      <a 
                                        href={doc.link || "https://drive.google.com/"} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="ml-1.5 p-0.5 text-orange-400 opacity-50 hover:opacity-100 transition"
                                        title="Open in Drive"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div>
                      {(() => {
                        const projectObj = db.projects.find(p => p.name === selectedProject);
                        if (!projectObj) return null;

                        const handleSaveNotes = () => {
                          if (onUpdateProjectNotes) {
                            onUpdateProjectNotes(projectObj.id, notesText);
                          }
                          setIsEditingNotes(false);
                        };

                        return (
                          <div className="space-y-4">
                            {projectObj.notes && !isEditingNotes && (
                              <div className="bg-[#171b21] border border-[#232a32] p-3 rounded-lg text-xs leading-relaxed text-neutral-300 flex items-start space-x-2">
                                <button 
                                  onClick={() => {
                                    setNotesText(projectObj.notes || "");
                                    setIsEditingNotes(true);
                                  }}
                                  className="text-neutral-500 hover:text-emerald-400 cursor-pointer shrink-0 mt-0.5"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <div>
                                  <span className="block font-bold text-neutral-400 text-[10px] uppercase mb-1">
                                    {lang === "en" ? "Notes" : "Ghi chú"}
                                  </span>
                                  <p className="text-[10px] text-neutral-350">{projectObj.notes}</p>
                                </div>
                              </div>
                            )}

                            {(!projectObj.notes || isEditingNotes) && (
                              <div className={projectObj.notes ? "border-t border-neutral-800/60 pt-3" : ""}>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-[10px] font-mono text-neutral-500 uppercase">
                                    {lang === "en" ? "Notes" : "Ghi chú"}
                                  </label>
                                  {projectObj.notes && isEditingNotes && (
                                    <button 
                                      onClick={() => {
                                        setIsEditingNotes(false);
                                        setNotesText(projectObj.notes || "");
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
                        );
                      })()}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

    </div>
  );
}
