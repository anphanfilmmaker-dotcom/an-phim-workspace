/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GoogleSheetDB, AIAgent, AgentTask } from "../types";
import { 
  Bot, 
  Workflow, 
  HelpCircle, 
  Gauge, 
  CheckSquare, 
  Play, 
  AlertTriangle, 
  Cpu, 
  Settings, 
  Sparkles, 
  X,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { translations } from "../translations";
import AgentChatModal from "./AgentChatModal";

interface AgentsPageProps {
  db: GoogleSheetDB;
  onCompleteTask: (taskId: string) => void;
  onUpdateAgentStatus: (agentId: string, status: any) => void;
  lang: "en" | "vi";
}

export default function AgentsPage({
  db,
  onCompleteTask,
  onUpdateAgentStatus,
  lang,
}: AgentsPageProps) {
  const t = translations[lang];
  const [activeFilterAgent, setActiveFilterAgent] = useState<string | null>(null);
  const [activeTaskPrompt, setActiveTaskPrompt] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState<any | null>(null);

  // Filter tasks based on selected agent if any
  const displayedTasks = db.tasks.filter((task) => {
    if (activeFilterAgent) {
      return task.assignedAgent === activeFilterAgent;
    }
    return true;
  });

  const translateStatus = (stat: string) => {
    if (lang === "en") return stat;
    const map: Record<string, string> = {
      "Active": "Hoạt động",
      "Monitoring": "Đang Giám Sát",
      "Need Input": "Cần Ý Kiến",
      "Running": "Đang chạy",
      "Completed": "Đã xong",
      "Waiting Input": "Chờ lệnh CEO"
    };
    return map[stat] || stat;
  };

  const translatePriority = (prio: string) => {
    if (lang === "en") return prio;
    const map: Record<string, string> = {
      "High": "Cao",
      "Medium": "Trung bình",
      "Low": "Thấp"
    };
    return map[prio] || prio;
  };

  const translateResponsibility = (agentName: string, resp: string) => {
    if (lang === "en") return resp;
    const map: Record<string, string> = {
      "PreProd Bot": "Quản lý kịch bản, bảng phân cảnh, lịch trình bấm máy tiền kỳ.",
      "Legal Sync": "Soạn thảo điều khoản hợp đồng phân phối phát hành, rà soát pháp lý.",
      "Cash Flow Tracker": "Theo dõi sổ thu chi ngân sách, cảnh báo rủi ro công nợ quá hạn.",
      "Render Supervisor": "Kiểm toán hiệu suất hậu kỳ, phân bổ phần cứng render kỹ kỹ xảo.",
      "Client Relay": "Kết nối thông tin phản hồi từ đối tác, tự động cập nhật đề xuất sáng tạo."
    };
    return map[agentName] || resp;
  };

  const translateRecentActivity = (agentName: string, act: string) => {
    if (lang === "en") return act;
    const map: Record<string, string> = {
      "PreProd Bot": "Đã tự động khởi tạo 3 cột tiến độ cho Phim Quảng cáo Galaxy Studio.",
      "Legal Sync": "Yêu cầu rà soát phụ lục hợp đồng thương mại quảng cáo VPBank.",
      "Cash Flow Tracker": "Phát hiện khoản phải thu 420 Triệu chưa thanh toán từ CGV.",
      "Render Supervisor": "Nén dung lượng bản dựng thô số 2 gửi khách hàng kiểm duyệt.",
      "Client Relay": "Gửi thông báo tiến độ bàn giao cho phía đại diện TH True Milk."
    };
    return map[agentName] || act;
  };

  const translateTaskName = (taskName: string) => {
    if (lang === "en") return taskName;
    const map: Record<string, string> = {
      "Draft Storyboard Scene 4 & 5": "Nháp Bảng Phân Cảnh Cảnh 4 & 5",
      "Approve Galaxy Script V3": "Phê duyệt Kịch bản Galaxy Bản V3",
      "Sign Galaxy Contract Annex": "Ký Phụ lục Hợp đồng Galaxy Cinemas",
      "Resolve Overdue alert Galaxy Cinema": "Giải quyết Cảnh báo Quá hạn Galaxy Cinema",
      "Review Render Budget Scene 2 VFX": "Duyệt Ngân sách Kết xuất Cảnh 2 Kỹ xảo",
      "Approve CGV Draft Bill": "Thông qua Hóa đơn Nháp cho phía CGV",
      "Draft VPBank legal liability checklist": "Soạn Danh mục Pháp lý Rủi ro VPBank",
      "Approve TH True Milk scene edit": "Phê duyệt Cắt dựng Cảnh phim TH True Milk",
      "Resolve VPBank overdue payment alert": "Xử lý Cảnh báo Nợ đọng từ VPBank"
    };
    return map[taskName] || taskName;
  };

  const translateDueTime = (time: string) => {
    if (lang === "en") return time;
    const map: Record<string, string> = {
      "Due in 2 hours": "Hạn sau 2 giờ",
      "Awaiting CEO approval": "Chờ CEO phê duyệt",
      "SLA: 24h limit": "Giới hạn SLA: 24 giờ",
      "Requires manual signature": "Cần chữ ký trực tiếp",
      "Overdue 2 days ago": "Quá hạn 2 ngày trước",
      "SLA limit: July 12": "SLA đến ngày 12 tháng 7"
    };
    return map[time] || time;
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{t.activeAgents}</span>
            <span className="block text-md font-bold text-white font-sans mt-0.5">5 / 5 {lang === "en" ? "Operational" : "Đang chạy"}</span>
            <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">↑ 100% {lang === "en" ? "efficiency" : "hiệu suất"}</span>
          </div>
          <Bot className="w-7 h-7 text-[#10B981] opacity-25" />
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{lang === "en" ? "Tasks Running" : "Tiến Trình Chạy"}</span>
            <span className="block text-md font-bold text-white font-sans mt-0.5">18 {lang === "en" ? "concurrent" : "đồng thời"}</span>
            <span className="block text-[10px] text-[#10B981] font-mono mt-0.5">↑ +3 {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
          <Workflow className="w-7 h-7 text-[#10B981] opacity-25" />
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-neutral-450 uppercase tracking-widest">{lang === "en" ? "Need Input" : "Cần Ý Kiến"}</span>
            <span className="block text-md font-bold text-white font-sans mt-0.5">
              {db.tasks.filter((t) => t.status === "Waiting Input").length} {lang === "en" ? "Decisions" : "Quyết định"}
            </span>
            <span className="block text-[10px] text-orange-400 font-mono mt-0.5">{lang === "en" ? "Requires CEO click" : "Cần CEO phê duyệt"}</span>
          </div>
          <HelpCircle className="w-7 h-7 text-orange-400 opacity-25" />
        </div>

        <div className="bg-[#121417] p-4 rounded-xl border border-[#1e2329]/80 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-[#10B981] uppercase tracking-widest">{lang === "en" ? "Automation Rate" : "Tỷ Lệ Tự Động"}</span>
            <span className="block text-md font-bold text-white font-sans mt-0.5">{db.agentPerformance.completionRate}% avg</span>
            <span className="block text-[10px] text-[#10B981] font-mono mt-0.5">↑ 6% {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
          </div>
          <Gauge className="w-7 h-7 text-emerald-400 opacity-25" />
        </div>

      </div>

      {/* Roster list */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest">
            {t.aiWorkforceDirectory}
          </h3>
          {activeFilterAgent && (
            <button
              onClick={() => setActiveFilterAgent(null)}
              className="text-[10px] font-mono text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded bg-orange-950/20 hover:bg-orange-950/45 transition cursor-pointer"
            >
              {lang === "en" ? "Clear filter and view all tasks" : "Xóa bộ lọc hành trình tasks"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {db.agents.map((agent) => {
            const isMonitoring = agent.status === "Monitoring";
            const isNeedInput = agent.status === "Need Input";
            const isSelected = activeFilterAgent === agent.name;

            return (
              <div
                key={agent.id}
                className={`bg-[#121417] rounded-xl p-4 border flex flex-col justify-between transition ${
                  isSelected 
                    ? "border-emerald-500 bg-gradient-to-t from-[#121417] to-emerald-950/5" 
                    : "border-[#1e2329]/85 hover:border-neutral-700 hover:bg-[#15191e]"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4 mt-1">
                    <h4 className={`text-base sm:text-lg font-sans font-bold tracking-tight ${agent.avatarColor.split(" ")[0]}`}>
                      {agent.name}
                    </h4>
                    <div className="flex items-center space-x-1.5" title="Connected to server">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                      <span>{lang === "en" ? "Thread capacity" : "Tải lượng CPU thread"}</span>
                      <span>{agent.workloadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${agent.workloadProgress > 70 ? "bg-orange-500" : "bg-[#10B981]"}`}
                        style={{ width: `${agent.workloadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                      <span>Token Input</span>
                      <span className="text-emerald-400">{agent.tokenInput?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                      <span>Token Output</span>
                      <span className="text-emerald-400">{agent.tokenOutput?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                      <span>{lang === "en" ? "Run Count" : "Số Lần Chạy"}</span>
                      <span className="text-orange-400">{agent.runCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1 uppercase">
                      <span>{lang === "en" ? "Est. Cost" : "Chi Phí"}</span>
                      <span className="text-white">${agent.estimatedCost || 0}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setChatAgent(agent)}
                    className="w-full py-1.5 rounded text-[10px] font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer bg-neutral-900 text-neutral-350 hover:bg-emerald-600 hover:text-white border border-neutral-800 hover:border-emerald-500"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Chat directly" : "Chat trực tiếp"}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>


      {chatAgent && (
        <AgentChatModal 
          agent={chatAgent} 
          onClose={() => setChatAgent(null)} 
          lang={lang} 
        />
      )}

    </div>
  );
}
