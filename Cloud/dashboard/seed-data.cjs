/**
 * Dữ liệu hardcode trực tiếp từ file Excel AN PHIM - Project Management.xlsx
 * Cập nhật lần cuối: 07/06/2026
 * Cột Dashboard sheet:
 *   Row 3: [Dự án đang chạy=2, _, Dự án hoàn thành=4, _, Dự án thiếu giấy tờ=9, _, Lợi nhuận=60,460,000]
 *   Row 6: [ĐÃ NHẬN=101,520,000, _, Còn phải thu=301,528,000, _, Tổng CP=90,470,409, _, SỐ DƯ=3,529,591]
 */

async function seedDatabase(dbRun) {
  console.log('Seeding database with hardcoded Excel data...');

  // === DASHBOARD STATS ===
  await dbRun("INSERT INTO stats (key, value) VALUES (?, ?)", ["dashboard", JSON.stringify({
    cashAvailable: 3529591,          // SỐ DƯ thực tế
    cashAvailableChange: "Từ sổ cái Excel",
    receivable: 301528000,           // Còn phải thu
    receivableChange: "Từ sổ cái Excel",
    activeProjectsCount: 2,          // Dự án đang chạy
    activeProjectsChange: "Từ sổ cái Excel",
    actionsCount: 9,                 // Dự án thiếu giấy tờ → actions
    actionsCompletedCount: 0,
  })]);

  // === PROJECTS (từ sheet Projects + Giấy tờ) ===
  const projects = [
    // Client, Project Name, Current Stage, % Giấy tờ, Tổng cộng, Đợt1+2+3, Còn lại, Chi phí
    { id: 'proj_1', name: 'Khai Son', client: 'VistaX', status: 'Completed', budget: 21600000, received: 21600000, dueDate: '', nextAction: 'Đã hoàn thành', riskLevel: 'None', riskDesc: 'Dự án đã hoàn thành và đủ giấy tờ.' },
    { id: 'proj_2', name: 'Winterland', client: 'VistaX', status: 'Completed', budget: 32400000, received: 32400000, dueDate: '5/6/2026', nextAction: 'Đã hoàn thành', riskLevel: 'None', riskDesc: 'Dự án đã hoàn thành.' },
    { id: 'proj_3', name: 'Tan Viet Khoa', client: 'Tân Việt Khoa', status: 'On Track', budget: 0, received: 0, dueDate: '', nextAction: 'Kiểm tra giấy tờ hợp đồng', riskLevel: 'Medium', riskDesc: 'Chưa có thông tin ngân sách.' },
    { id: 'proj_4', name: 'Phuoc Thinh', client: 'Phước Thịnh', status: 'On Track', budget: 0, received: 0, dueDate: '', nextAction: 'Xác nhận tiến độ sản xuất', riskLevel: 'Low', riskDesc: 'Đang theo dõi.' },
    { id: 'proj_5', name: 'NamLong', client: 'Nam Long', status: 'Completed', budget: 0, received: 0, dueDate: '', nextAction: 'Đã hoàn thành', riskLevel: 'None', riskDesc: 'Dự án đã hoàn thành.' },
    { id: 'proj_6', name: 'Kim Cuong Gia', client: 'Kim Cương Gia', status: 'Completed', budget: 0, received: 0, dueDate: '', nextAction: 'Đã hoàn thành', riskLevel: 'None', riskDesc: 'Dự án đã hoàn thành.' },
    { id: 'proj_7', name: 'Nhon Trang', client: 'Nhơn Trang', status: 'Completed', budget: 0, received: 0, dueDate: '', nextAction: 'Đã hoàn thành', riskLevel: 'None', riskDesc: 'Dự án đã hoàn thành.' },
  ];

  for (const p of projects) {
    await dbRun(
      "INSERT INTO projects (id, name, client, status, budget, received, dueDate, nextAction, nextActionDue, riskLevel, riskDescription, milestones, paymentPhase, paymentPhaseProgress, thumbnailUrl, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [p.id, p.name, p.client, p.status, p.budget, p.received, p.dueDate, p.nextAction, p.dueDate, p.riskLevel, p.riskDesc, '[]', 'Đợt 1', 100, 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80', '']
    );
  }

  // === EXPENSES (từ sheet Expense) ===
  // Các danh mục chi phí với màu HEX phân biệt rõ ràng
  const expenses = [
    { category: 'Freelancer',    amount: 10000000, percentage: 11, color: '#10B981' }, // emerald
    { category: 'AI Tools',      amount:  7000000, percentage:  8, color: '#f97316' }, // orange
    { category: 'Marketing',     amount: 19000000, percentage: 20, color: '#6366f1' }, // indigo
    { category: 'Tax / Fees',    amount:  6000000, percentage:  6, color: '#06b6d4' }, // cyan
    { category: 'Personal',      amount: 46000000, percentage: 51, color: '#f43f5e' }, // rose
    { category: 'Office / Admin', amount:  959000, percentage:  1, color: '#a855f7' }, // purple
    { category: 'Sales',         amount:  3000000, percentage:  3, color: '#eab308' }, // yellow
  ];

  for (const e of expenses) {
    await dbRun("INSERT INTO expenses (category, amount, percentage, color) VALUES (?, ?, ?, ?)", [e.category, e.amount, e.percentage, e.color]);
  }

  // === CASH FLOW (mock hàng tuần) ===
  const cashFlows = [
    { id: 'cf_1', label: 'T2', inflow: 45000000, outflow: 15000000, netProfit: 30000000 },
    { id: 'cf_2', label: 'T3', inflow: 38000000, outflow: 12000000, netProfit: 26000000 },
    { id: 'cf_3', label: 'T4', inflow: 62000000, outflow: 21000000, netProfit: 41000000 },
    { id: 'cf_4', label: 'T5', inflow: 51000000, outflow: 18000000, netProfit: 33000000 },
    { id: 'cf_5', label: 'T6', inflow: 30000000, outflow: 42000000, netProfit: -12000000 },
    { id: 'cf_6', label: 'T7', inflow: 22000000, outflow:  9000000, netProfit: 13000000 },
    { id: 'cf_7', label: 'CN', inflow: 98000000, outflow: 13000000, netProfit: 85000000 },
  ];
  for (const cf of cashFlows) {
    await dbRun("INSERT INTO cash_flow (id, label, inflow, outflow, netProfit) VALUES (?, ?, ?, ?, ?)", [cf.id, cf.label, cf.inflow, cf.outflow, cf.netProfit]);
  }

  // === AI AGENTS ===
  await dbRun("INSERT INTO agents (id, name, status, keyResponsibility, currentTask, recentActivity, workloadProgress, avatarColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    'agent_finance', 'Finance Agent', 'Active',
    'Theo dõi dòng tiền, cảnh báo công nợ, phân tích chi phí.',
    'Theo dõi 9 dự án thiếu giấy tờ',
    'Đồng bộ dữ liệu từ Excel thành công.',
    80, 'text-emerald-500 bg-emerald-500/10'
  ]);
  await dbRun("INSERT INTO agents (id, name, status, keyResponsibility, currentTask, recentActivity, workloadProgress, avatarColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    'agent_pm', 'PM Agent', 'Active',
    'Quản lý tiến độ dự án, cập nhật milestone, cảnh báo rủi ro.',
    'Theo dõi tiến độ 7 dự án hiện tại',
    'Cập nhật trạng thái dự án từ sheet Projects.',
    75, 'text-indigo-400 bg-indigo-500/10'
  ]);

  // === DOCUMENTS (từ sheet Giấy tờ) ===
  const docs = [
    { id: 'doc_1', name: 'Khai Son - Hợp đồng', project: 'Khai Son', type: 'Contract', status: 'Signed', owner: 'VistaX', lastUpdated: '01/05/2026', fileSize: '2.4MB', isUrgent: 0, urgentReason: '', priorityLevel: 'Normal' },
    { id: 'doc_2', name: 'Winterland - VAT R1', project: 'Winterland', type: 'Invoice', status: 'Signed', owner: 'VistaX', lastUpdated: '05/06/2026', fileSize: '1.1MB', isUrgent: 0, urgentReason: '', priorityLevel: 'Normal' },
    { id: 'doc_3', name: 'Tan Viet Khoa - Báo giá', project: 'Tan Viet Khoa', type: 'Quote', status: 'Pending', owner: 'Tân Việt Khoa', lastUpdated: '01/06/2026', fileSize: '0.8MB', isUrgent: 1, urgentReason: 'Chờ ký hợp đồng chính thức', priorityLevel: 'Urgent' },
  ];
  for (const d of docs) {
    await dbRun("INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, fileSize, isUrgent, urgentReason, priorityLevel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [d.id, d.name, d.project, d.type, d.status, d.owner, d.lastUpdated, d.fileSize, d.isUrgent, d.urgentReason, d.priorityLevel]);
  }

  // === CEO ACTIONS (tự động phân tích) ===
  await dbRun("INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    'act_1', 1, 'Kiểm tra 9 dự án còn thiếu giấy tờ pháp lý', 'Tất cả', 'High', 'PM Agent', 'Pending', ''
  ]);
  await dbRun("INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    'act_2', 2, 'Thu hồi 301.5M VND từ các khoản phải thu còn lại', 'Tất cả', 'High', 'Finance Agent', 'Pending', ''
  ]);

  console.log('Seed complete! ✅');
}

module.exports = { seedDatabase };
