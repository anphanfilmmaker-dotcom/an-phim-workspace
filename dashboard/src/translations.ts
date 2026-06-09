/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemTranslation {
  // Navigation / Base
  overview: string;
  projects: string;
  finance: string;
  documents: string;
  aiAgentsTrace: string;
  ceoCommandUnit: string;
  today: string;
  activeWorkforceTrace: string;
  completedProjects: string;
  recentExpenses: string;
  signedDocuments: string;
  load: string;

  // Overview Page
  cashAvailable: string;
  receivable: string;
  activeProjects: string;
  ceoActions: string;
  tasksLeft: string;
  projectOverview: string;
  projectOverviewDesc: string;
  weeklyFinancialSnapshot: string;
  weeklyFinancialSnapshotDesc: string;
  weeklyCashFlowTrend: string;
  expenseDistribution: string;
  todaysPriorityActions: string;
  noPendingActions: string;
  pendingCeoDecisions: string;
  actionsNeedApproval: string;
  directCreativeApprovals: string;
  in: string;
  out: string;
  net: string;
  total: string;
  atRisk: string;
  onTrack: string;
  waitingClient: string;
  completed: string;
  high: string;
  medium: string;
  low: string;

  // Projects Page
  totalProjects: string;
  inProgress: string;
  waitingFeedback: string;
  activeCampaigns: string;
  needFeedback: string;
  completedCountText: string;
  searchProjects: string;
  allStatus: string;
  allType: string;
  projectTypeLabel: string;
  createNewProject: string;
  projectName: string;
  clientName: string;
  budgetVnd: string;
  status: string;
  dueDate: string;
  close: string;
  save: string;
  projectDetails: string;
  client: string;
  budget: string;
  received: string;
  projectNotes: string;
  milestones: string;
  paymentPhase: string;
  ceoPrivateNotes: string;
  saveNotes: string;
  writeCeoNotes: string;

  // Finance Page
  weeklyNetLedger: string;
  filterByTimescale: string;
  alertsNotifications: string;
  receivablesInflow: string;
  receivablesInflowDesc: string;
  amount: string;
  overdue: string;
  markReviewed: string;
  noAlerts: string;
  dueInDays: string;

  // Documents Page
  legalContractsRepository: string;
  legalContractsRepositoryDesc: string;
  dragDropTitle: string;
  dragDropDesc: string;
  uploadNewDoc: string;
  documentType: string;
  priorityLevel: string;
  urgentReason: string;
  missingFilesAlert: string;
  missingFilesAlertDesc: string;
  allDocuments: string;
  uploaderName: string;
  actions: string;
  delete: string;
  missing: string;
  pending: string;
  signed: string;
  approved: string;

  // Agents Page
  aiRobicWorkers: string;
  aiRobicWorkersDesc: string;
  activeJobsQueue: string;
  activeJobsQueueDesc: string;
  agentPerformanceStats: string;
  agentPerformanceStatsDesc: string;
  responsibilities: string;
  workloadProgress: string;
  currentTask: string;
  recentActivity: string;
  assignedAgent: string;
  complete: string;
  completionRate: string;
  avgResponseTime: string;
  blockedTasks: string;
  activeAgents: string;
  aiWorkforceDirectory: string;
  interactiveTaskQueue: string;
  workforceDiagnostics: string;
  totalDocuments: string;
  missingContracts: string;
  invoicesPending: string;
  approvalNeeded: string;
  searchDocuments: string;
  documentDirectory: string;
  urgentMissingAlerts: string;
  legalComplianceAudit: string;
}

export const translations: Record<"en" | "vi", SystemTranslation> = {
  en: {
    // Navigation / Base
    overview: "OVERVIEW",
    projects: "PROJECTS",
    finance: "FINANCE",
    documents: "DOCUMENTS (GIẤY TỜ)",
    aiAgentsTrace: "AI AGENTS TRACE",
    ceoCommandUnit: "CEO Command Unit",
    today: "Today: June 6, 2026",
    activeWorkforceTrace: "AI WORKFORCE TRACE",
    completedProjects: "COMPLETED PROJECTS",
    recentExpenses: "RECENT EXPENSES",
    signedDocuments: "SIGNED DOCUMENTS",
    load: "Load",

    // Overview Page
    cashAvailable: "Cash Available",
    receivable: "Receivable",
    activeProjects: "Active Projects",
    ceoActions: "CEO Actions",
    tasksLeft: "of {count} tasks left",
    projectOverview: "Project Overview",
    projectOverviewDesc: "Current status of active film and media campaigns",
    weeklyFinancialSnapshot: "COMPANY FINANCIAL SNAPSHOT",
    weeklyFinancialSnapshotDesc: "Weekly net ledger streams and capital allocation",
    weeklyCashFlowTrend: "Weekly Cash Flow Trend",
    expenseDistribution: "Expense Distribution",
    todaysPriorityActions: "Today's Priority Actions",
    noPendingActions: "No pending CEO action points today! All clean.",
    pendingCeoDecisions: "Pending CEO Decisions",
    actionsNeedApproval: "{count} Actions Need Approval",
    directCreativeApprovals: "Direct creative approvals, funding receipts and contracts.",
    in: "In",
    out: "Out",
    net: "Net",
    total: "Total",
    atRisk: "At Risk",
    onTrack: "On Track",
    waitingClient: "Waiting Client",
    completed: "Completed",
    high: "High",
    medium: "Medium",
    low: "Low",

    // Projects Page
    totalProjects: "Total Projects",
    inProgress: "In Progress",
    waitingFeedback: "Waiting Client",
    activeCampaigns: "active campaigns",
    needFeedback: "Need feedback",
    completedCountText: "projects done",
    searchProjects: "Search project name, client...",
    allStatus: "All Statuses",
    allType: "All Types",
    projectTypeLabel: "Project Type",
    createNewProject: "Create New Film Project",
    projectName: "Project Name",
    clientName: "Client Name",
    budgetVnd: "Budget (VND)",
    status: "Status",
    dueDate: "Due Date",
    close: "Close",
    save: "Create Project",
    projectDetails: "Project Details",
    client: "Client",
    budget: "Budget",
    received: "Received",
    projectNotes: "Project Notes",
    milestones: "Cinematography Milestones",
    paymentPhase: "Payment Phase Ledger",
    ceoPrivateNotes: "CEO Private Executive Notes",
    saveNotes: "Save CEO Notes",
    writeCeoNotes: "Write CEO executive guidelines to sync workflows with agent workforce...",

    // Finance Page
    weeklyNetLedger: "Weekly Net Ledger Stream",
    filterByTimescale: "Filter timeline:",
    alertsNotifications: "Anomalous Financial Alerts",
    receivablesInflow: "Outstanding Film Receivables",
    receivablesInflowDesc: "Accounts receivable tracking of contractual films",
    amount: "Amount",
    overdue: "Overdue",
    markReviewed: "Mark Reviewed",
    noAlerts: "No outlier financial alerts in system.",
    dueInDays: "Due in {days} days",

    // Documents Page
    legalContractsRepository: "Legal Contracts & Creative Briefs Tracker",
    legalContractsRepositoryDesc: "Official contract register, actor agreements, receipts & client briefs",
    dragDropTitle: "Drag & drop files here, or click to upload",
    dragDropDesc: "Supports PDF, DOCX, XLSX, MP4, JPEG. Maximum file size 40MB.",
    uploadNewDoc: "Index New Legal Document",
    documentType: "Document Type",
    priorityLevel: "Urgency / Priority",
    urgentReason: "Brief explanation or approval context for AI workforce...",
    missingFilesAlert: "Actor / Freelancer Missing Checklist",
    missingFilesAlertDesc: "Agreements pending for current film cast or audio freelance crew",
    allDocuments: "Indexed Documents & Agreements Ledger",
    uploaderName: "Indexed Name",
    actions: "Actions",
    delete: "Delete File",
    missing: "Missing",
    pending: "Pending",
    signed: "Signed",
    approved: "Approved",

    // Agents Page
    aiRobicWorkers: "AI Agent Trace Grid",
    aiRobicWorkersDesc: "Real-time state and autonomous loops of AN PHIM OS workforce",
    activeJobsQueue: "Active Autonomous Worker Jobs",
    activeJobsQueueDesc: "Workqueue sync containing background jobs & client deadlines",
    agentPerformanceStats: "AI Workforce Performance Telemetry",
    agentPerformanceStatsDesc: "Telemetry metrics indicating performance latency and completion rates",
    responsibilities: "Target Domain Responsibility",
    workloadProgress: "Worker Load Progress",
    currentTask: "Active Subtask Running",
    recentActivity: "Recent Completed Telemetry Trace",
    assignedAgent: "Assigned Worker",
    complete: "Complete",
    completionRate: "Task Completion Success Rate",
    avgResponseTime: "Avg Turnaround Response Latency",
    blockedTasks: "Open Feedback Requests",
    activeAgents: "Active Agents",
    aiWorkforceDirectory: "AI WORKFORCE ROSTER & CAPACITY DIRECTORY",
    interactiveTaskQueue: "INTERACTIVE PROCESS ACTION QUEUE",
    workforceDiagnostics: "AI Workforce Diagnostics & Metrics",
    totalDocuments: "Total Documents",
    missingContracts: "Missing Contracts",
    invoicesPending: "Invoices Pending",
    approvalNeeded: "Approval Needed",
    searchDocuments: "Search documents by name or project...",
    documentDirectory: "Document Directory",
    urgentMissingAlerts: "Missing / Urgent Alerts",
    legalComplianceAudit: "Legal Compliance Audit"
  },
  vi: {
    // Navigation / Base
    overview: "TỔNG QUAN",
    projects: "DỰ ÁN",
    finance: "TÀI CHÍNH",
    documents: "DOCUMENTS (GIẤY TỜ)",
    aiAgentsTrace: "AI AGENTS TRACE",
    ceoCommandUnit: "Trung Tâm Điều Hành CEO",
    today: "Hôm nay: Ngày 6 tháng 6, 2026",
    activeWorkforceTrace: "AI WORKFORCE TRACE",
    completedProjects: "DỰ ÁN HOÀN THÀNH",
    recentExpenses: "PHÁT SINH CHI PHÍ GẦN ĐÂY",
    signedDocuments: "HƠP ĐỒNG ĐÃ KÝ",
    load: "Tải",

    // Overview Page
    cashAvailable: "Tiền Mặt Sẵn Có",
    receivable: "Khoản Thu Dự Kiến",
    activeProjects: "Dự Án Đang Chạy",
    ceoActions: "Nhiệm Vụ CEO",
    tasksLeft: "còn {count} tác vụ chưa làm",
    projectOverview: "Tổng Quan Dự Án",
    projectOverviewDesc: "Trạng thái các chiến dịch phim & truyền thông đang chạy",
    weeklyFinancialSnapshot: "BẢO CÁO TÀI CHÍNH CÔNG TY",
    weeklyFinancialSnapshotDesc: "Dòng sổ cái hàng tuần & phân bổ vốn",
    weeklyCashFlowTrend: "Xu hướng Dòng tiền Hàng tuần",
    expenseDistribution: "Phân bổ Chi phí",
    todaysPriorityActions: "Nhiệm Vụ Ưu Tiên Hôm Nay",
    noPendingActions: "Hôm nay không có nhiệm vụ CEO nào! Đã hoàn thành hết.",
    pendingCeoDecisions: "Quyết định CEO đang chờ",
    actionsNeedApproval: "{count} Tác vụ Cần Phê Duyệt",
    directCreativeApprovals: "Phê duyệt sáng tạo, hóa đơn tài trợ và hợp đồng trực tiếp.",
    in: "Thu",
    out: "Chi",
    net: "Ròng",
    total: "Tổng",
    atRisk: "Rủi ro",
    onTrack: "Đang Chạy Tốt",
    waitingClient: "Chờ Phản Hồi",
    completed: "Hoàn Thành",
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",

    // Projects Page
    totalProjects: "Tổng Số Dự Án",
    inProgress: "Đang Thực Hiện",
    waitingFeedback: "Chờ Phản Hồi",
    activeCampaigns: "chiến dịch đang chạy",
    needFeedback: "Cần phản hồi gấp",
    completedCountText: "dự án đã xong",
    searchProjects: "Tìm kiếm tên dự án, đối tác phim...",
    allStatus: "Tất Cả Trạng Thái",
    allType: "Tất Cả Loại Dự Án",
    projectTypeLabel: "Loại Dự Án",
    createNewProject: "Tạo Dự Án Điện Ảnh Mới",
    projectName: "Tên Dự Án Phim / Chiến Dịch",
    clientName: "Tên Đối Tác / Khách Hàng",
    budgetVnd: "Ngân Sách (VND)",
    status: "Trạng Thái",
    dueDate: "Hạn Hoàn Thành",
    close: "Đóng cửa sổ",
    save: "Tạo Dự Án Mới",
    projectDetails: "Thông Tin Chi Tiết Dự Án",
    client: "Khách hàng / Đối tác",
    budget: "Tổng ngân sách",
    received: "Đã nhận",
    projectNotes: "Ghi chú riêng",
    milestones: "Cột mốc Sản xuất Phim",
    paymentPhase: "Đợt Thanh Toán Sổ Cái",
    ceoPrivateNotes: "Ghi chú Chỉ đạo của CEO AN PHIM",
    saveNotes: "Lưu Chỉ Đạo CEO",
    writeCeoNotes: "Viết chỉ đạo điều hành của CEO tại đây để đồng bộ hóa hoạt động với lực lượng AI...",

    // Finance Page
    weeklyNetLedger: "Dòng Sổ Cái Theo Dõi Hàng Tuần",
    filterByTimescale: "Lọc theo mốc thời gian:",
    alertsNotifications: "Cảnh Báo Bất Thường Trên Sổ Cái",
    receivablesInflow: "Các Khoản Phải Thu Theo Hợp Đồng",
    receivablesInflowDesc: "Danh sách theo dõi các đợt thanh toán hợp đồng phim",
    amount: "Số tiền",
    overdue: "Quá Hạn",
    markReviewed: "Đã Xem Xét",
    noAlerts: "Hệ thống hoạt động bình thường, không có cảnh báo nào.",
    dueInDays: "Phải thu sau {days} ngày",

    // Documents Page
    legalContractsRepository: "Quản Lý Hợp Đồng Pháp Lý & Brief Sáng Tạo",
    legalContractsRepositoryDesc: "Sổ bộ đăng ký hợp đồng chính thức, thỏa thuận diễn viên, hóa đơn & brief đối tác",
    dragDropTitle: "Kéo thả tệp tài liệu vào đây hoặc click để tải lên",
    dragDropDesc: "Hỗ trợ định dạng PDF, DOCX, XLSX, MP4, JPEG. Kích thước tối đa 40MB.",
    uploadNewDoc: "Đăng Ký Tài Liệu Pháp Lý Mới",
    documentType: "Loại Tài Liệu Giấy Tờ",
    priorityLevel: "Mức Độ Khẩn Cấp",
    urgentReason: "Ghi chú ngắn gọn hoặc bối cảnh phê duyệt cho AI workforce...",
    missingFilesAlert: "Báo Cáo Thiếu Hợp Đồng Diễn Viên / Freelancer",
    missingFilesAlertDesc: "Các thỏa thuận và cam kết chưa được ký với diễn viên hợp đồng hoặc ekip thu âm",
    allDocuments: "Sổ Cái Tài Liệu & Hợp Đồng Đã Đăng Ký",
    uploaderName: "Tên Hồ Sơ / Tài Liệu",
    actions: "Hành động",
    delete: "Xóa tài liệu",
    missing: "Chưa nộp",
    pending: "Đang xử lý",
    signed: "Đã ký kết",
    approved: "Đã phê duyệt",

    // Agents Page
    aiRobicWorkers: "Hệ Thống Tracing Điểm Hoạt Động AI",
    aiRobicWorkersDesc: "Giám sát thời gian thực trạng thái và chu kỳ tự trị của từng AI workforce",
    activeJobsQueue: "Hàng Đợi Công Việc Của AI Agent",
    activeJobsQueueDesc: "Hộp công việc đồng bộ hóa nhiệm vụ chạy ngầm & hạn chót từ đối tác",
    agentPerformanceStats: "Bảng Chỉ Số Đấu Nối Hiệu Suất AI Workspace",
    agentPerformanceStatsDesc: "Các dữ liệu viễn thông cho biết độ trễ chuyển tiếp và tỷ lệ hoàn thành tác vụ",
    responsibilities: "Lĩnh vực Ban Ngành Chịu Trách Nhiệm",
    workloadProgress: "Tiến Độ Tải Việc AI Worker",
    currentTask: "Nhiệm Vụ Chi Tiết Đang Chạy",
    recentActivity: "Sự kiện Viễn Thông Hoạt Động Gần Nhất",
    assignedAgent: "AI Nhân sự Chịu Trách Nhiệm",
    complete: "Hoàn thành",
    completionRate: "Tỷ Lệ Hoàn Thành Tác Vụ Thành Công",
    avgResponseTime: "Độ Trễ Phản Hồi Trung Bình (Giờ)",
    blockedTasks: "Nhiệm Vụ Cần Thêm Chỉ Đạo / Chờ Phản Hồi",
    activeAgents: "AI Đang Hoạt Động",
    aiWorkforceDirectory: "CHỈ MỤC NHÂN SỰ VÀ TRẠNG THÁI HOẠT ĐỘNG AI",
    interactiveTaskQueue: "HÀNG ĐỢI DUYỆT TÁC VỤ TUYẾN TÍNH INTERACTIVE",
    workforceDiagnostics: "Thống Kê Đo Lường Hiệu Năng AI Worker",
    totalDocuments: "Tổng Tài Liệu",
    missingContracts: "Hợp Đồng Còn Thiếu",
    invoicesPending: "Hóa Đơn Chờ Duyệt",
    approvalNeeded: "Tờ Trình Chờ Duyệt",
    searchDocuments: "Tìm kiếm văn bản bằng tên hoặc dự án...",
    documentDirectory: "Danh Mục Văn Bản Hệ Thống",
    urgentMissingAlerts: "Hồ Sơ Cấp Bách Cần CEO Xử Lý",
    legalComplianceAudit: "Kiểm Toán Tuân Thủ Pháp Lý Sáng Tạo"
  }
};
