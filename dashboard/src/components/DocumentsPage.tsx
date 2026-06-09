/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { GoogleSheetDB, DocumentItem, DocType, DocStatus } from "../types";
import { 
  FileText, 
  Search, 
  SlidersHorizontal, 
  FileCheck, 
  FolderLock, 
  CreditCard, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Check, 
  PlusSquare,
  ArrowRight,
  Eye,
  ArrowUpRight
} from "lucide-react";
import { translations } from "../translations";

interface DocumentsPageProps {
  db: GoogleSheetDB;
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocStatus: (docId: string, status: DocStatus) => void;
  onDeleteDocument: (docId: string) => void;
  lang: "en" | "vi";
}

export default function DocumentsPage({
  db,
  onAddDocument,
  onUpdateDocStatus,
  onDeleteDocument,
  lang,
}: DocumentsPageProps) {
  const t = translations[lang];

  // Local filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Drag-and-drop / manual selection state variables
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState("TVC Launch Film");
  const [selectedType, setSelectedType] = useState<DocType>("Contract");
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats computation
  const totalCount = db.documents.length;
  const missingCount = db.documents.filter(d => d.status === "Missing").length;
  const pendingCount = db.documents.filter(d => d.status === "Pending").length;
  const approvedCount = db.documents.filter(d => d.status === "Approved" || d.status === "Signed").length;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    setIsUploading(true);

    setTimeout(() => {
      const bytes = uploadedFile.size;
      const sizeStr = bytes >= 1024 * 1024 
        ? (bytes / (1024 * 1024)).toFixed(1) + " MB" 
        : Math.round(bytes / 1024) + " KB";

      const created: DocumentItem = {
        id: "doc_" + Date.now(),
        name: uploadedFile.name,
        project: selectedProject,
        type: selectedType,
        status: selectedType === "Invoice" ? "Pending" : "Approved",
        owner: "Alex Nguyen",
        lastUpdated: lang === "en" ? "June 6, 2026 05:34 PM" : "Hôm nay, lúc 17:34",
        fileSize: sizeStr,
        isUrgent: false
      };

      onAddDocument(created);
      setIsUploading(false);
      setSuccessMsg(lang === "en" 
        ? `Document "${uploadedFile.name}" integrated into ${selectedProject} repository!`
        : `Tài liệu "${uploadedFile.name}" đã đồng bộ vào bộ nhớ dự án ${selectedProject}!`);
      setUploadedFile(null);

      setTimeout(() => setSuccessMsg(null), 4000);
    }, 1200);
  };

  // Filter lists
  const filteredDocs = db.documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "All" || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Get urgent documents listed
  const urgentDocs = db.documents.filter(d => d.isUrgent);

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return "AN";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const translateDocType = (type: string) => {
    if (lang === "en") return type;
    const map: Record<string, string> = {
      "Contract": "Hợp đồng",
      "NDA": "Bảo mật NDA",
      "Invoice": "Hóa đơn",
      "Budget": "Ngân sách",
      "Brief": "Kịch bản thô"
    };
    return map[type] || type;
  };

  const translateDocStatus = (stat: string) => {
    if (lang === "en") return stat;
    const map: Record<string, string> = {
      "Signed": "Đã ký kết",
      "Approved": "Đã duyệt",
      "Pending": "Chờ duyệt",
      "Missing": "Còn thiếu"
    };
    return map[stat] || stat;
  };

  const translateUrgentReason = (reason: string) => {
    if (lang === "en") return reason;
    const map: Record<string, string> = {
      "Required for galaxy shoot phase 1 block": "Điều phối cấp bách giai đoạn quay 1 Galaxy.",
      "Awaiting CEO signature approval": "Đợi CEO ký khép hồ sơ hợp tác Galaxy.",
      "Requires manual signature approval before shoot": "Rào cản ký kết thủ công trước ngày bấm máy.",
      "Direct action required to trigger payout": "Chỉ thị quyết toán mở luồng ngân sách đợt 3."
    };
    return map[reason] || reason;
  };

  const translateDocumentName = (name: string) => {
    if (lang === "en") return name;
    const map: Record<string, string> = {
      "TVC_An_Phim_Galaxy_Contract_v3.pdf": "Hợp_đồng_phim_TVC_Galaxy_Bản_V3.pdf",
      "NDA_Galaxy_Cinemas_25.pdf": "Thỏa_thuận_Bảo_Mật_NDA_Galaxy_25.pdf",
      "Invoice_Galaxy_Phase2_Deposit.pdf": "Học_đơn_Thanh_Toán_Galaxy_Cọc_Đợt_2.pdf",
      "Galaxy_Shoot_Budget_V5.xlsx": "Ngân_sách_Sản_xuất_Galaxy_Bản_V5.xlsx",
      "Galaxy_CreativeBrief_Final.docx": "Đề_Bài_Sáng_Tạo_Galaxy_Chốt_Cuối.docx",
      "NDA_TH_True_Milk_2026.docx": "Bảo_mật_Dự_án_TH_True_Milk_2026.docx"
    };
    return map[name] || name;
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top dashboard summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{t.totalDocuments}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{totalCount}</h4>
            <span className="text-[10px] text-[#10B981] font-mono">↑ 18 {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-orange-500/10 hover:border-orange-500/25 transition">
          <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest">{t.missingContracts}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{missingCount}</h4>
            <span className="text-[10px] text-orange-400 font-mono">↑ 2 {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">{t.invoicesPending}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{pendingCount}</h4>
            <span className="text-[10px] text-[#10B981] font-mono">↑ 3 {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{t.approvalNeeded}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{approvedCount}</h4>
            <span className="text-[10px] text-cyan-400 font-mono">↑ 1 {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
        </div>

      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Document Directory */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Filters cards */}
          <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-neutral-450" />
                <input
                  type="text"
                  placeholder={t.searchDocuments}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#171b21] w-56 pl-9 pr-4 py-2 text-[10px] font-mono text-white rounded-lg border border-[#2b333c] focus:border-[#10B981] outline-none"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#171b21] text-[10px] font-mono text-neutral-350 rounded-lg border border-[#2b333c] px-3 py-2 outline-none cursor-pointer"
              >
                <option value="All">{lang === "en" ? "All Types" : "Tất cả Định dạng"}</option>
                <option value="Contract">{lang === "en" ? "Contract (.pdf)" : "Hợp đồng (.pdf)"}</option>
                <option value="NDA">{lang === "en" ? "NDA (.docx)" : "Bảo mật NDA (.docx)"}</option>
                <option value="Invoice">{lang === "en" ? "Invoice (.pdf)" : "Hóa đơn (.pdf)"}</option>
                <option value="Budget">{lang === "en" ? "Budget (.xlsx)" : "Ngân sách (.xlsx)"}</option>
                <option value="Brief">{lang === "en" ? "Brief (.docx)" : "Kịch bản (.docx)"}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#171b21] text-[10px] font-mono text-neutral-350 rounded-lg border border-[#2b333c] px-3 py-2 outline-none cursor-pointer"
              >
                <option value="All">{t.allStatus}</option>
                <option value="Signed">{lang === "en" ? "Signed" : "Đã ký kết"}</option>
                <option value="Approved">{lang === "en" ? "Approved" : "Đã phê duyệt"}</option>
                <option value="Pending">{lang === "en" ? "Pending" : "Chờ phê duyệt"}</option>
                <option value="Missing">{lang === "en" ? "Missing" : "Thiếu tờ trình"}</option>
              </select>
            </div>
            
            <div className="text-[10px] font-mono text-neutral-450 leading-none">
              {lang === "en" ? `Showing ${filteredDocs.length} files` : `Hiển thị ${filteredDocs.length} tệp tin`}
            </div>
          </div>

          <div className="bg-[#121417] rounded-xl border border-[#1e2329]/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2329]/30 flex items-center justify-between">
              <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                {t.documentDirectory}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono text-neutral-300 border-collapse">
                <thead>
                  <tr className="bg-[#171b21] border-b border-neutral-850/80 text-[10px] text-neutral-450 uppercase leading-none">
                    <th className="py-3 px-4">{lang === "en" ? "Document Name" : "Tên tệp văn bản"}</th>
                    <th className="py-3 px-4">{lang === "en" ? "Related Project" : "Tên phim/Dự án"}</th>
                    <th className="py-3 px-4">{lang === "en" ? "Type" : "Loại"}</th>
                    <th className="py-3 px-4">{lang === "en" ? "Status" : "Phê duyệt"}</th>
                    <th className="py-3 px-4">{lang === "en" ? "Uploaded By" : "Cá nhân tải lên"}</th>
                    <th className="py-3 px-4 text-center">{lang === "en" ? "Delete" : "Hủy bỏ"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const isSigned = doc.status === "Signed" || doc.status === "Approved";
                    const isMissing = doc.status === "Missing";
                    const isPending = doc.status === "Pending";

                    let typeColor = "text-indigo-400 bg-indigo-950/20 border-indigo-900";
                    if (doc.type === "Contract") typeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900";
                    if (doc.type === "NDA") typeColor = "text-cyan-400 bg-cyan-950/20 border-cyan-900";
                    if (doc.type === "Invoice") typeColor = "text-amber-400 bg-amber-950/20 border-amber-900";
                    if (doc.type === "Budget") typeColor = "text-purple-400 bg-purple-950/20 border-purple-900";

                    return (
                      <tr key={doc.id} className="border-b border-neutral-850/40 hover:bg-[#15191f] transition leading-tight">
                        <td className="py-3.5 px-4 font-sans text-white font-medium max-w-[200px] truncate">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-neutral-450 shrink-0" />
                            <span title={translateDocumentName(doc.name)}>{translateDocumentName(doc.name)}</span>
                          </div>
                          {doc.fileSize && (
                            <span className="block text-[10px] font-mono text-neutral-500 mt-1">
                              {doc.fileSize} • {lang === "en" ? "Uploaded today" : "Đã nhận hôm nay"}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-450 truncate max-w-[150px]" title={doc.project}>
                          {doc.project}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${typeColor}`}>
                            {translateDocType(doc.type)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={doc.status}
                            onChange={(e) => onUpdateDocStatus(doc.id, e.target.value as any)}
                            className={`text-[10px] font-mono font-bold uppercase rounded px-1.5 py-0.5 outline-none cursor-pointer border ${
                              isSigned 
                                ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" 
                                : isMissing 
                                ? "bg-red-950/20 border-red-900 text-red-400 animate-pulse" 
                                : "bg-orange-950/20 border-orange-900 text-orange-400"
                            }`}
                          >
                            <option value="Signed">Signed</option>
                            <option value="Approved">Approved</option>
                            <option value="Pending">Pending</option>
                            <option value="Missing">Missing</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded-full bg-neutral-800 text-[10px] font-sans font-bold flex items-center justify-center text-neutral-350 shrink-0 border border-neutral-700 leading-none">
                              {getInitials(doc.owner)}
                            </div>
                            <span className="font-sans text-[10px] text-neutral-300 truncate max-w-[90px]">
                              {doc.owner}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(lang === "en" ? `Are you sure you want to delete file "${doc.name}"?` : `Bạn có chắc chắn muốn xóa dòng tệp "${doc.name}"?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="p-1 hover:text-red-500 text-neutral-500 transition cursor-pointer"
                            title="Delete file element"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredDocs.length === 0 && (
                <div className="text-center py-12 text-neutral-550 text-xs font-sans">
                  {lang === "en" ? "No documented film logs coordinated with matching filters." : "Không tìm thấy bất kỳ tài liệu điện ảnh hay tờ trình nào phù hợp lựa chọn."}
                </div>
              )}
            </div>

          </div>

          {/* Section C: Drag and drop uploader area */}
          <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-4">
            <div>
              <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                {lang === "en" ? "Drag-and-Drop Document Repository Integration" : "Tải Lên Và Đồng Bộ Hồ Sơ Pháp Lý / Hợp Đồng Phim"}
              </h3>
              <p className="text-[10px] text-neutral-400 leading-snug">
                {lang === "en" ? "Append PDFs, contracts, briefs, or invoices straight to AN PHIM spreadsheets" : "Lưu trữ tệp PDF, NDA, hóa đơn ekip, tờ trình nghệ thuật trực tiếp vào AN PHIM OS"}
              </p>
            </div>

            <form 
              onSubmit={handleUploadSubmit} 
              onDragEnter={handleDrag} 
              className="space-y-4"
            >
              <div 
                onDragOver={handleDrag} 
                onDragLeave={handleDrag} 
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                  dragActive 
                    ? "border-[#10B981] bg-emerald-950/10" 
                    : uploadedFile 
                    ? "border-[#10B981]/50 bg-[#171b21]" 
                    : "border-[#2b333c] bg-[#171b21]/40 hover:border-neutral-500"
                }`}
                onClick={triggerFileSelect}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  className="hidden" 
                  accept=".pdf,.docx,.xlsx,.txt"
                />

                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center mb-3">
                  <Upload className={`w-5 h-5 ${uploadedFile ? "text-[#10B981] animate-bounce" : "text-neutral-400"}`} />
                </div>

                {uploadedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs text-white font-sans font-semibold">{uploadedFile.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {lang === "en" ? "Size: " : "Dung lượng: "}{(uploadedFile.size / 1024).toFixed(0)} KB • {lang === "en" ? "Click to re-select" : "Chọn lại"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 font-sans">
                    <p className="text-xs text-neutral-300">
                      {lang === "en" ? "Drag & drop contract target or " : "Kéo thả tài liệu vào đây hoặc "}<span className="text-[#10B981] font-medium underline">{lang === "en" ? "browse matching storage" : "chọn tệp từ bộ nhớ"}</span>
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      {lang === "en" ? "Accepts PDF, DOCX, XLSX up to 25MB" : "Hỗ trợ định dạng PDF, DOCX, XLSX lên đến 25MB"}
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in text-[10px] font-mono">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">
                      {lang === "en" ? "Related Project" : "Trỏ liên kết Phim / Dự án"}
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full bg-[#171b21] py-2 px-3 border border-[#2b333c] text-white rounded outline-none text-[10px] cursor-pointer"
                    >
                      {db.projects.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">
                      {lang === "en" ? "Document Type Pill" : "Loại Nhãn tài liệu"}
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="w-full bg-[#171b21] py-2 px-3 border border-[#2b333c] text-white rounded outline-none text-[10px] cursor-pointer"
                    >
                      <option value="Contract">Contract</option>
                      <option value="NDA">NDA</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Budget">Budget</option>
                      <option value="Brief">Brief</option>
                    </select>
                  </div>
                </div>
              )}

              {uploadedFile && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 bg-[#10B981] hover:bg-emerald-400 text-neutral-900 font-sans font-bold text-xs rounded-lg transition flex items-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950/20"
                  >
                    {isUploading ? (
                      <span>{lang === "en" ? "Parsing elements..." : "Đang xử lý dữ liệu..."}</span>
                    ) : (
                      <>
                        <PlusSquare className="w-4 h-4" />
                        <span>{lang === "en" ? "Inject into Sheets DB" : "Đồng bộ hóa Sổ Cái"}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-950/50 border border-emerald-500/20 p-2.5 rounded text-[10px] text-[#10B981] text-center font-mono animate-fade-in">
                  {successMsg}
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Right Side: Missing / Urgent warnings panel */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-[#121417] p-5 rounded-xl border border-orange-500/10 shadow-lg select-none">
            <div className="flex justify-between items-center mb-4 leading-none">
              <h3 className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold">
                 {t.urgentMissingAlerts}
              </h3>
              <span className="w-5 h-5 rounded-full bg-red-950/40 text-red-400 border border-red-900 text-[10px] font-sans font-bold flex items-center justify-center">
                {urgentDocs.length}
              </span>
            </div>

            <div className="space-y-3.5 text-[10px] font-mono">
              {urgentDocs.map((doc) => {
                const isHigh = doc.priorityLevel === "High";

                return (
                  <div 
                    key={doc.id}
                    className="bg-[#171b21] p-3 rounded-lg border border-red-500/5 hover:border-red-500/15 transition relative flex items-start space-x-2.5"
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isHigh ? "text-red-400 animate-pulse" : "text-orange-440"}`} />
                    
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-white font-sans font-semibold text-[10.5px] truncate block leading-none">
                          {translateDocumentName(doc.name).replace(".pdf", "").replace(".docx", "")}
                        </span>
                        
                        <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded ${
                          isHigh ? "bg-red-950/40 border-red-900 text-red-400" : "bg-orange-950/40 border-orange-900 text-orange-400"
                        }`}>
                          {isHigh ? (lang === "en" ? "High" : "Khẩn") : (lang === "en" ? "Medium" : "T.Bình")}
                        </span>
                      </div>

                      <p className="text-[10px] text-neutral-450 mt-1">{lang === "en" ? "Project: " : "Phim: "}{doc.project}</p>
                      <span className="block text-[10px] text-orange-400 bg-orange-950/15 border border-orange-950 px-1.5 py-0.5 rounded mt-2 max-w-max">
                        {lang === "en" ? "Reason: " : "Lý do: "}{translateUrgentReason(doc.urgentReason)}
                      </span>
                    </div>

                    <button
                      onClick={() => onUpdateDocStatus(doc.id, "Signed")}
                      className="absolute right-3 top-3 p-1 bg-neutral-900 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 border border-neutral-800 rounded transition cursor-pointer"
                      title="Mark as Signed / Settled"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {urgentDocs.length === 0 && (
                <div className="text-center py-8 text-neutral-500 font-sans text-xs">
                  {lang === "en" ? "All urgent documents signed and approved." : "Không có tờ trình khẩn cấp hay hồ sơ rủi ro tồn dọng ngày hôm nay!"}
                </div>
              )}
            </div>

          </div>

          {/* Quick legal checklist compliance card */}
          <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-3.5 text-[10px]">
            <h4 className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest font-bold leading-none">
              {t.legalComplianceAudit}
            </h4>
            
            <div className="space-y-3 font-mono text-[10px] text-neutral-350">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-850/60 leading-none">
                <span>{lang === "en" ? "Contract Sign-off Rate" : "Tỷ lệ Ký kết Hợp đồng Phim"}</span>
                <span className="text-white font-bold">
                  {Math.round(((db.documents.filter(d => d.type === "Contract" && d.status === "Signed").length) / Math.max(1, db.documents.filter(d => d.type === "Contract").length)) * 100)}%
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-neutral-850/60 leading-none">
                <span>{lang === "en" ? "NDA Counter-Sign Compliance" : "Tỷ lệ Ký Bảo mật Sáng tạo NDA"}</span>
                <span className="text-white font-bold">
                  {Math.round(((db.documents.filter(d => d.type === "NDA" && d.status === "Signed").length) / Math.max(1, db.documents.filter(d => d.type === "NDA").length)) * 100)}%
                </span>
              </div>

              <div className="flex justify-between items-center leading-none">
                <span>{lang === "en" ? "Billing Invoicing Backlog" : "Tờ trình thanh quyết toán dồn đọng"}</span>
                <span className="text-white font-bold">
                  {db.documents.filter(d => d.type === "Invoice" && d.status === "Pending").length} {lang === "en" ? "unpaid invoices" : "hóa đơn"}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
