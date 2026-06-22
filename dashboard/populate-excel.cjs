const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_PATH = 'E:/agent/Project Management.xlsx';
const wb = xlsx.readFile(EXCEL_PATH, { cellDates: true });

// Mock data roughly matching INITIAL_SHEET_DATA
const documentsData = [
  ['ID', 'Name', 'Project', 'Type', 'Status', 'Owner', 'Last Updated', 'File Size', 'Is Urgent', 'Urgent Reason', 'Priority Level'],
  ['doc_1', 'Contract_TVC Launch Film.pdf', 'TVC Launch Film', 'Contract', 'Signed', 'Alex Nguyen', 'June 6, 2026 10:30 AM', '2.4 MB', false, '', ''],
  ['doc_2', 'NDA_Real Estate Key Visual.docx', 'Real Estate Key Visual', 'NDA', 'Pending', 'Linh Tran', 'June 5, 2026 04:15 PM', '1.1 MB', true, 'Waiting for counter-signature', 'Medium'],
  ['doc_3', 'Invoice_Social Campaign #12.pdf', 'Social Campaign Retainer', 'Invoice', 'Pending', 'Minh Le', 'June 5, 2026 11:02 AM', '850 KB', true, 'Due since last week', 'High'],
  ['doc_4', 'Budget_Real Estate Key Visual.xlsx', 'Real Estate Key Visual', 'Budget', 'Approved', 'Linh Tran', 'June 4, 2026 02:45 PM', '4.2 MB', false, '', ''],
  ['doc_5', 'Contract_Social Campaign Retainer.pdf', 'Social Campaign Retainer', 'Contract', 'Missing', 'Alex Nguyen', 'June 4, 2026 09:20 AM', '0 KB', true, 'Required for project start', 'High'],
  ['doc_6', 'Brief_TVC Launch Film.docx', 'TVC Launch Film', 'Brief', 'Approved', 'Minh Le', 'June 3, 2026 05:10 PM', '1.8 MB', false, '', ''],
  ['doc_7', 'VFX_Storyboard_Shad.pdf', 'Shadows of Saigon', 'Brief', 'Approved', 'Alex Nguyen', 'June 2, 2026 03:22 PM', '14 MB', false, '', '']
];

const alertsData = [
  ['ID', 'Type', 'Description', 'Project', 'Urgency', 'Status'],
  ['al_1', 'Overdue Payment', 'TVC Launch Film is overdue by 3 days.', 'TVC Launch Film', 'High', 'Pending'],
  ['al_2', 'Over-Budget Project', 'Real Estate Key Visual is 12% over budget.', 'Real Estate Key Visual', 'High', 'Pending'],
  ['al_3', 'Missing Invoice', 'Invoice for Social Campaign Retainer is missing.', 'Social Campaign Retainer', 'High', 'Pending']
];

const actionsData = [
  ['ID', 'Priority Order', 'Title', 'Project', 'Priority Level', 'Suggested Agent', 'Status', 'Notes'],
  ['act_1', 1, '- [ ] Kiểm tra báo cáo vượt ngân sách\n- [ ] Xác nhận số liệu với Finance Agent\n- [ ] Lên phương án cắt giảm chi phí', 'Real Estate Key Visual', 'High', 'Finance Agent', 'Pending', ''],
  ['act_2', 2, '- [ ] Xác nhận 5 hóa đơn freelancer\n- [ ] Phê duyệt thanh toán đợt này\n- [ ] Gửi xác nhận cho kế toán', 'Behind The Lights', 'Medium', 'Finance Agent', 'Pending', ''],
  ['act_3', 3, '- [ ] Liên hệ khách hàng yêu cầu hợp đồng\n- [ ] Chuẩn bị bản mẫu hợp đồng\n- [ ] Đặt lịch ký kết', 'Social Campaign Retainer', 'Medium', 'Document Agent', 'Pending', ''],
  ['act_4', 4, 'Confirm shoot schedule change', 'Real Estate Key Visual', 'Low', 'PM Agent', 'Pending', ''],
  ['act_5', 5, 'Audit creative asset quality', 'Shadows of Saigon', 'Low', 'Creative Agent', 'Done', 'Checked first drafts of color correction. Looks great.'],
  ['act_6', 6, 'Authorize remote developer keys', 'Admin Task', 'Low', 'Admin Agent', 'Done', 'Keys issued on Tuesday.']
];

const tasksData = [
  ['ID', 'Task Name', 'Priority', 'Assigned Agent', 'Status', 'Due Time'],
  ['task_1', 'Review budget variance report', 'High', 'Finance Agent', 'Running', 'Today 3:00 PM'],
  ['task_2', 'Approve creative concept v2', 'Medium', 'Creative Agent', 'Waiting Input', 'Today 5:00 PM'],
  ['task_3', 'Analyze marketing contract', 'Medium', 'Document Agent', 'Running', 'Tomorrow 10:00 AM'],
  ['task_4', 'Update project risk register', 'Low', 'PM Agent', 'Running', 'Tomorrow 2:00 PM'],
  ['task_5', 'Process vendor payment', 'High', 'Finance Agent', 'Pending', 'June 20, 2026']
];

const agentsData = [
  ['ID', 'Name', 'Status', 'Key Responsibility', 'Current Task', 'Recent Activity', 'Workload Progress', 'Avatar Color', 'Token Input', 'Token Output', 'Run Count', 'Estimated Cost'],
  ['agent_finance', 'Finance Agent', 'Active', 'Cash flow monitoring, forecasting, expense analysis, payment reminders.', 'Reconciling Q2 transactions', 'Reconciled 12 bank transactions & generated forecast report.', 72, 'text-emerald-500 bg-emerald-500/10', 15400, 3200, 45, 0.12],
  ['agent_pm', 'PM Agent', 'Active', 'Project timeline tracking, risk monitoring, milestone updates.', 'Updating project timelines', 'Updated 8 project milestones & flagged 2 overdue tasks.', 65, 'text-green-400 bg-green-500/10', 8500, 1100, 22, 0.05],
  ['agent_creative', 'Creative Agent', 'Active', 'Content ideation, asset review, storyboard support, creative feedback.', 'Reviewing storyboard draft', 'Approved 3 concept variations and synthesized visual feedback.', 58, 'text-purple-400 bg-purple-500/10', 45000, 12000, 18, 0.85],
  ['agent_doc', 'Document Agent', 'Monitoring', 'Contract monitoring, invoice tracking, document extraction, missing document alerts.', 'Analyzing vendor contract', 'Extracted 14 key clauses from Galaxy Studio contract.', 41, 'text-orange-400 bg-orange-500/10', 32000, 4500, 12, 0.35],
  ['agent_admin', 'Admin Agent', 'Active', 'System monitoring, approval tracking, user support & permission control.', 'Reviewing access requests', 'Processed 6 access requests and resolved workspace block.', 27, 'text-blue-400 bg-blue-500/10', 2100, 400, 8, 0.01]
];

const populateSheet = (sheetName, data) => {
  if (wb.SheetNames.includes(sheetName)) {
    const ws = xlsx.utils.aoa_to_sheet(data);
    wb.Sheets[sheetName] = ws;
    console.log(`Populated sheet: ${sheetName}`);
  }
};

populateSheet('Documents', documentsData);
populateSheet('Alerts', alertsData);
populateSheet('Actions', actionsData);
populateSheet('Tasks', tasksData);
populateSheet('Agents', agentsData);

xlsx.writeFile(wb, EXCEL_PATH);
console.log(`Successfully populated ${EXCEL_PATH} with mock data!`);
