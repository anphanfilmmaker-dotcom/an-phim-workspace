const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'components', 'DocumentsPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// I will overwrite the whole file using string templates.
const newComponent = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { GoogleSheetDB, DocumentItem, DocType, DocStatus } from "../types";
import { 
  FileText, 
  Search, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Check, 
  PlusSquare
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

  // Drag-and-drop / manual selection state variables
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState(db.projects[0]?.name || "");
  const [selectedType, setSelectedType] = useState<DocType>("Contract");
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        lastUpdated: lang === "en" ? "Today" : "Hôm nay",
        fileSize: sizeStr,
        isUrgent: false
      };

      onAddDocument(created);
      setIsUploading(false);
      setSuccessMsg(lang === "en" 
        ? \`Document "\${uploadedFile.name}" added to \${selectedProject}!\`
        : \`Tài liệu "\${uploadedFile.name}" đã đồng bộ vào \${selectedProject}!\`);
      setUploadedFile(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 1200);
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

  const urgentDocs = db.documents.filter(d => d.isUrgent);

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Top dashboard summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{t.totalDocuments}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{db.documents.length + (db.projectDocuments?.length * 4 || 0)}</h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-orange-500/10 hover:border-orange-500/25 transition">
          <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest">{t.missingContracts}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{db.projectDocuments?.filter(p => !p.contract).length || 0}</h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">{t.invoicesPending}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{db.projectDocuments?.filter(p => !p.paymentRequest).length || 0}</h4>
          </div>
        </div>
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/85">
          <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Completed Sets</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl font-bold text-white font-sans">{db.projectDocuments?.filter(p => p.signedPercentage === 100).length || 0}</h4>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Document Matrix & Templates */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Templates Folder */}
          <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80">
            <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold mb-4">
              {lang === "en" ? "Templates Folder" : "Thư mục Tài Liệu Mẫu"}
            </h3>
            <div className="flex flex-wrap gap-4">
              {(db.templateDocuments || []).map(tpl => (
                <div key={tpl.id} className="flex items-center space-x-3 bg-[#171b21] p-3 rounded-lg border border-[#2b333c] hover:border-emerald-500/50 transition cursor-pointer">
                  <div className="p-2 bg-emerald-950/30 rounded text-emerald-400">
                     <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-sans text-white font-medium">{tpl.name}</p>
                    <p className="text-[10px] font-mono text-neutral-450">{tpl.fileSize} • {lang === "en" ? "Click to download" : "Nhấn để tải xuống"}</p>
                  </div>
                </div>
              ))}
              {(!db.templateDocuments || db.templateDocuments.length === 0) && (
                <div className="text-[10px] font-mono text-neutral-500">No templates found.</div>
              )}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-[#121417] rounded-xl border border-[#1e2329]/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2329]/30 flex items-center justify-between bg-[#171b21]">
              <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                {lang === "en" ? "Project Documents Matrix" : "Bảng Theo Dõi Hồ Sơ Dự Án"}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono text-neutral-300 border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#171b21] border-b border-neutral-850/80 text-[10px] text-neutral-450 uppercase leading-none text-center">
                    <th className="py-3 px-4 text-left">{lang === "en" ? "Project" : "Dự án"}</th>
                    <th className="py-3 px-2">{lang === "en" ? "Status" : "Trạng thái"}</th>
                    <th className="py-3 px-2">Báo giá</th>
                    <th className="py-3 px-2">Hợp đồng</th>
                    <th className="py-3 px-2">Đề nghị T.Toán</th>
                    <th className="py-3 px-2 text-neutral-500">VAT R1</th>
                    <th className="py-3 px-2 text-neutral-500">VAT R2</th>
                    <th className="py-3 px-2 text-neutral-500">VAT R3</th>
                    <th className="py-3 px-2">BB Thanh Lý</th>
                    <th className="py-3 px-4">% Ký</th>
                  </tr>
                </thead>
                <tbody>
                  {(db.projectDocuments || []).map((pd) => {
                     const renderCell = (hasDoc: boolean, isVat: boolean) => (
                       <td className="py-2 px-2 text-center">
                         <div className={\`mx-auto w-6 h-6 flex items-center justify-center rounded \${hasDoc ? (isVat ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900') : 'bg-[#171b21] text-neutral-600 border border-[#2b333c]'}\`}>
                           {hasDoc ? (isVat ? 'x' : <Check className="w-3.5 h-3.5" />) : '-'}
                         </div>
                       </td>
                     );

                     return (
                       <tr 
                          key={pd.projectId} 
                          className={\`border-b border-neutral-850/40 hover:bg-[#15191f] transition cursor-pointer \${selectedProject === pd.projectName ? "bg-[#15191f] border-l-2 border-l-emerald-500" : ""}\`} 
                          onClick={() => setSelectedProject(pd.projectName)}
                        >
                         <td className="py-3 px-4 font-sans text-white font-medium max-w-[150px] truncate" title={pd.projectName}>
                           {pd.projectName}
                         </td>
                         <td className="py-3 px-2 text-center">
                            <span className={\`px-1.5 py-0.5 rounded text-[9px] uppercase \${
                               pd.status === 'Đã đủ' ? 'bg-emerald-950/30 text-emerald-400' : 
                               pd.status === 'Chờ ký' ? 'bg-red-950/30 text-red-400' : 
                               pd.status === 'Không cần ký' ? 'bg-neutral-800 text-neutral-400' :
                               'bg-blue-950/30 text-blue-400'
                            }\`}>{pd.status}</span>
                         </td>
                         {renderCell(pd.quote, false)}
                         {renderCell(pd.contract, false)}
                         {renderCell(pd.paymentRequest, false)}
                         {renderCell(pd.vatR1, true)}
                         {renderCell(pd.vatR2, true)}
                         {renderCell(pd.vatR3, true)}
                         {renderCell(pd.liquidation, false)}
                         <td className="py-3 px-4 text-center">
                           <div className="w-full bg-neutral-800 rounded-full h-1.5">
                             <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: \`\${pd.signedPercentage}%\` }}></div>
                           </div>
                           <span className="text-[9px] mt-1 inline-block text-neutral-400">{pd.signedPercentage}%</span>
                         </td>
                       </tr>
                     )
                  })}
                  {(!db.projectDocuments || db.projectDocuments.length === 0) && (
                    <tr><td colSpan={10} className="text-center py-6 text-[10px] text-neutral-500">No project documents found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Upload panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-4">
            <div>
              <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest font-bold">
                {lang === "en" ? "Upload to Project" : "Tải Lên Hồ Sơ"}
              </h3>
              <p className="text-[10px] text-neutral-400 leading-snug mt-1">
                {lang === "en" ? \`Adding files to \${selectedProject}\` : \`Thêm tài liệu vào \${selectedProject}\`}
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} onDragEnter={handleDrag} className="space-y-4">
              <div 
                onDragOver={handleDrag} 
                onDragLeave={handleDrag} 
                onDrop={handleDrop}
                className={\`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer \${
                  dragActive ? "border-[#10B981] bg-emerald-950/10" : uploadedFile ? "border-[#10B981]/50 bg-[#171b21]" : "border-[#2b333c] bg-[#171b21]/40 hover:border-neutral-500"
                }\`}
                onClick={triggerFileSelect}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" accept=".pdf,.docx,.xlsx,.txt" />
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center mb-3">
                  <Upload className={\`w-4 h-4 \${uploadedFile ? "text-[#10B981] animate-bounce" : "text-neutral-400"}\`} />
                </div>
                {uploadedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs text-white font-sans font-semibold break-all">{uploadedFile.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1 font-sans">
                    <p className="text-xs text-neutral-300">
                      {lang === "en" ? "Drag & drop or " : "Kéo thả hoặc "}<span className="text-[#10B981] underline">browse</span>
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <div className="space-y-3 animate-fade-in text-[10px] font-mono">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">{lang === "en" ? "Document Type" : "Loại tài liệu"}</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="w-full bg-[#171b21] py-2 px-3 border border-[#2b333c] text-white rounded outline-none"
                    >
                      <option value="Contract">Contract (Hợp đồng)</option>
                      <option value="Invoice">Payment Req (ĐN Thanh Toán)</option>
                      <option value="Budget">Quote (Báo giá)</option>
                      <option value="Brief">Liquidation (BBTL)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isUploading} className="w-full py-2 bg-[#10B981] hover:bg-emerald-400 text-neutral-900 font-sans font-bold text-xs rounded-lg transition flex items-center justify-center space-x-2">
                    {isUploading ? <span>Uploading...</span> : <><PlusSquare className="w-4 h-4" /><span>{lang === "en" ? "Add to DB" : "Đồng bộ"}</span></>}
                  </button>
                </div>
              )}
              {successMsg && <div className="bg-emerald-950/50 border border-emerald-500/20 p-2.5 rounded text-[10px] text-[#10B981] text-center font-mono animate-fade-in">{successMsg}</div>}
            </form>
          </div>

          {/* Urgent Alerts Mini */}
          {urgentDocs.length > 0 && (
             <div className="bg-[#121417] p-4 rounded-xl border border-orange-500/10 shadow-lg select-none">
               <h3 className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
                 {t.urgentMissingAlerts}
                 <span className="w-4 h-4 rounded-full bg-red-950/40 text-red-400 border border-red-900 flex items-center justify-center">{urgentDocs.length}</span>
               </h3>
               <div className="space-y-2">
                 {urgentDocs.slice(0, 3).map(doc => (
                   <div key={doc.id} className="bg-[#171b21] p-2 rounded-lg border border-red-500/5 flex items-start space-x-2">
                     <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0 animate-pulse" />
                     <div className="text-[9px] font-mono">
                       <p className="text-white truncate">{doc.name}</p>
                       <p className="text-neutral-500">{doc.project}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetPath, newComponent);
console.log("DocumentsPage.tsx rewritten successfully.");
