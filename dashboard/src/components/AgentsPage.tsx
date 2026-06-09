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
  AlertCircle
} from "lucide-react";
import { translations } from "../translations";

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
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-800 ${agent.avatarColor}`}>
                      <Cpu className="w-4 h-4" />
                    </div>

                    <select
                      value={agent.status}
                      onChange={(e) => onUpdateAgentStatus(agent.id, e.target.value)}
                      className={`text-[10px] font-mono font-bold tracking-tight rounded border px-1.5 py-0.5 outline-none cursor-pointer uppercase ${
                        isMonitoring 
                          ? "bg-orange-950/40 text-orange-400 border-orange-900" 
                          : isNeedInput 
                          ? "bg-red-950/30 text-red-400 border-red-900 animate-pulse" 
                          : "bg-emerald-950/30 text-emerald-400 border-emerald-900"
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Monitoring">Monitoring</option>
                      <option value="Need Input">Need Input</option>
                    </select>
                  </div>

                  <h4 className="text-xs font-sans font-bold text-white tracking-tight">
                    {agent.name}
                  </h4>
                  
                  <p className="text-[10px] text-neutral-450 leading-relaxed font-sans mt-2 min-h-12 border-b border-neutral-850/60 pb-2.5">
                    {translateResponsibility(agent.name, agent.keyResponsibility)}
                  </p>

                  <div className="pt-2.5 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block">{lang === "en" ? "Current Queue" : "Luồng xử lý hiện thời"}</span>
                      <p className="text-[10px] text-white truncate font-mono mt-0.5" title={agent.currentTask}>
                        {agent.name === "PreProd Bot" && lang === "vi" ? "Kiểm tra kịch bản số 4 Galaxy" : agent.currentTask}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block">{lang === "en" ? "Activity logging" : "Sự kiện vừa kích hoạt"}</span>
                      <p className="text-[10px] text-neutral-400 line-clamp-2 leading-snug font-sans mt-0.5" title={agent.recentActivity}>
                        {translateRecentActivity(agent.name, agent.recentActivity)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-850/60 space-y-3">
                  <div>
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

                  <button
                    onClick={() => setActiveFilterAgent(isSelected ? null : agent.name)}
                    className={`w-full py-1.5 rounded text-[10px] font-mono font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                      isSelected 
                        ? "bg-emerald-600 text-white" 
                        : "bg-neutral-900 text-neutral-350 hover:bg-neutral-800 border border-neutral-800"
                    }`}
                  >
                    <span>{isSelected ? (lang === "en" ? "Filter ON" : "Bộ lọc Đang Bật") : (lang === "en" ? "Filter Queue" : "Lọc tác vụ")}</span>
                    <Workflow className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Task Queue list and diagnosic */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        
        {/* Left Queue list */}
        <div className="md:col-span-8 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider flex items-center space-x-2">
                  <Workflow className="w-4 h-4 text-[#10B981]" />
                  <span>{t.interactiveTaskQueue}</span>
                </h3>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
                  {activeFilterAgent 
                    ? (lang === "en" ? `Showing active agent threads for: ${activeFilterAgent}` : `Nhật ký tác vụ tiến trình lọc cho: ${activeFilterAgent}`)
                    : (lang === "en" ? "Global thread execution pipeline across administrative networks" : "Tiến trình điều lệnh sản xuất phim tự động chạy liên tục theo thời gian thực")
                  }
                </p>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 border border-neutral-800 rounded leading-none">
                {displayedTasks.length} {lang === "en" ? "threads" : "phân luồng"}
              </span>
            </div>

            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/40 text-[10px] font-mono">
              <table className="w-full text-left text-neutral-300 border-collapse">
                <thead>
                  <tr className="bg-[#171b21] border-b border-neutral-800 text-[10px] text-neutral-450 uppercase leading-none">
                    <th className="p-2.5">{lang === "en" ? "Task Description" : "Mô tả lệnh công việc"}</th>
                    <th className="p-2.5">{lang === "en" ? "Priority" : "Mức ưu tiên"}</th>
                    <th className="p-2.5">{lang === "en" ? "Assigned Agent" : "Worker phụ trách"}</th>
                    <th className="p-2.5">{lang === "en" ? "Status" : "Trạng thái"}</th>
                    <th className="p-2.5">{lang === "en" ? "Due Context" : "Mốc thời gian"}</th>
                    <th className="p-2.5 text-center">{lang === "en" ? "Action" : "Chỉ đạo"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTasks.map((task) => {
                    const isHigh = task.priority === "High";
                    const isMedium = task.priority === "Medium";
                    const isRunning = task.status === "Running";
                    const isWaiting = task.status === "Waiting Input";
                    const isCompleted = task.status === "Completed";

                    return (
                      <tr 
                        key={task.id} 
                        className={`border-b border-neutral-800/40 hover:bg-[#15191f] leading-tight ${
                          isCompleted ? "opacity-45" : ""
                        }`}
                      >
                        <td className="p-2.5 text-white font-sans max-w-[200px] truncate" title={task.taskName}>
                          {translateTaskName(task.taskName)}
                        </td>
                        <td className="p-2.5 pb-2">
                          <span className={`${
                            isHigh ? "text-red-400" : isMedium ? "text-orange-400" : "text-neutral-400"
                          } font-bold`}>
                            {translatePriority(task.priority)}
                          </span>
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          {task.assignedAgent}
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded leading-none ${
                            isRunning 
                              ? "bg-emerald-950/40 border border-emerald-900 text-[#10B981]" 
                              : isWaiting 
                              ? "bg-orange-950/40 border border-orange-900 text-orange-400 animate-pulse" 
                              : isCompleted 
                              ? "bg-neutral-800 text-neutral-500" 
                              : "bg-neutral-900 text-neutral-450"
                          }`}>
                            {translateStatus(task.status)}
                          </span>
                        </td>
                        <td className="p-2.5 text-neutral-450 text-[10px] font-sans">
                          {translateDueTime(task.dueTime)}
                        </td>
                        <td className="p-2.5 text-center">
                          {!isCompleted ? (
                            <button
                              onClick={() => {
                                onCompleteTask(task.id);
                                if (isWaiting) {
                                  setActiveTaskPrompt(lang === "en" 
                                    ? `Authorized prompt execution for thread action: ${task.taskName}`
                                    : `Đã cấp quyền thực thi ủy nhiệm chi/hành động: ${translateTaskName(task.taskName)}`);
                                  setTimeout(() => setActiveTaskPrompt(null), 3500);
                                }
                              }}
                              className="px-2 py-0.5 bg-[#10B981] hover:bg-emerald-400 text-neutral-900 font-sans text-[10px] rounded font-bold transition cursor-pointer leading-none"
                            >
                              {isWaiting ? (lang === "en" ? "Authorize" : "Ủy quyền") : (lang === "en" ? "Resolve" : "Duyệt xong")}
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-550 italic">{lang === "en" ? "Settled" : "Đã Tất toán"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {displayedTasks.length === 0 && (
                <div className="text-center py-8 text-neutral-500 text-[10px] uppercase">
                  {lang === "en" ? "All task queues are completely clear!" : "Luồng công việc của trợ lý trống!"}
                </div>
              )}
            </div>
          </div>

          {activeTaskPrompt && (
            <div className="mt-3.5 bg-emerald-950/40 border border-emerald-500/20 p-2 text-[10px] text-[#10B981] text-center rounded animate-fade-in font-mono">
              {activeTaskPrompt}
            </div>
          )}

          <div className="border-t border-neutral-800/40 pt-3 mt-4 text-center">
            <span className="text-[10px] text-neutral-500 font-mono leading-none">
              {lang === "en" ? "Operational tasks automatically sync with PM and Document workspace logs." : "Tác vụ tự động tương tác liên đới hồ sơ sổ cái kịch bản và luật pháp điện ảnh."}
            </span>
          </div>
        </div>

        {/* Right Side Diagnosic diagnostics */}
        <div className="md:col-span-4 bg-[#121417] p-5 rounded-xl border border-[#1e2329]/80 space-y-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">
              {t.workforceDiagnostics}
            </h3>
            <p className="text-[10px] text-neutral-400 leading-snug">
              {lang === "en" ? "Heuristics tracking robotic output" : "Chỉ số thống kê từ các trợ lý tự động hóa AN PHIM"}
            </p>
          </div>

          <div className="space-y-4 font-mono text-[10px] text-zinc-300">
            <div className="bg-[#171b21] p-3 border border-[#232a32] rounded-xl space-y-3">
              <div className="flex justify-between items-center text-[10px] text-neutral-450 uppercase leading-none">
                <span>Task SLA Compliance</span>
                <span className="text-emerald-400 font-bold">92% Average</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="transparent" stroke="#121417" strokeWidth="2.5" />
                    <circle 
                      cx="10" 
                      cy="10" 
                      r="8" 
                      fill="transparent" 
                      stroke="#10B981" 
                      strokeWidth="2.5" 
                      strokeDasharray="46.2 50.2" 
                    />
                  </svg>
                  <span className="absolute text-[10px] font-sans font-black text-white">92%</span>
                </div>
                <div>
                  <p className="text-[10px] font-sans font-bold text-white leading-tight">{lang === "en" ? "SLA Compliance standard" : "Cam kết thời gian xử lý SLA"}</p>
                  <span className="text-[10px] text-[#10B981] font-mono leading-none">↑ 8% {lang === "en" ? "vs last week" : "so với tuần trước"}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#171b21] p-3 border border-[#232a32] rounded-xl space-y-3">
              <div className="flex justify-between items-center text-[10px] text-neutral-450 uppercase leading-none">
                <span>Mean Response Latency</span>
                <span className="text-[#10B981] font-bold">1.8 Hours</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="transparent" stroke="#121417" strokeWidth="2.5" />
                    <circle 
                      cx="10" 
                      cy="10" 
                      r="8" 
                      fill="transparent" 
                      stroke="#10B981" 
                      strokeWidth="2.5" 
                      strokeDasharray="38 50" 
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono text-white">1.8h</span>
                </div>
                <div>
                  <p className="text-[10px] font-sans font-bold text-white leading-tight">{lang === "en" ? "Average response interval" : "Thời gian đáp ứng trung bình"}</p>
                  <span className="text-[10px] text-[#10B981] font-mono leading-none">↓ -0.4h {lang === "en" ? "faster latency" : "nhanh hơn trước"}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#171b21] p-3 border border-orange-500/10 rounded-xl space-y-2 flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] text-neutral-500 uppercase leading-none">{lang === "en" ? "Blocked Threads" : "Đột ngột nghẽn mạch"}</span>
                <p className="text-[10px] font-sans font-bold text-white leading-tight">{lang === "en" ? "Waiting Client Input" : "Chờ dữ liệu khách hàng"}</p>
                <span className="block text-[10px] text-orange-400">↑ +2 {lang === "en" ? "waiting review" : "đang chờ xác nhận"}</span>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-orange-950/20 border border-orange-500/20 flex items-center justify-center font-sans font-bold text-orange-400">
                4
              </div>
            </div>

            <div className="bg-emerald-950/10 border border-emerald-500/10 p-2.5 rounded-lg text-[10px] leading-snug text-emerald-400 flex items-start space-x-2">
              <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="font-sans text-neutral-400">
                {lang === "en" ? "All AI worker health parameters are functioning optimally within default CPU margins." : "Các tham số hoạt động của trợ lý ảo nằm trong mức cực tốt của hệ thống."}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
