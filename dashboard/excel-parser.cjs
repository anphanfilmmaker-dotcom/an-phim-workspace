const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function findMdFilesSync(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        findMdFilesSync(filePath, fileList);
      } else if (filePath.endsWith('.md')) {
        fileList.push(filePath);
      }
    }
  } catch (e) {
    // ignore permission errors
  }
  return fileList;
}

function extractExcelData(filePath) {
  const workbook = xlsx.readFile(filePath);

  let mappingRules = {};
  try {
    mappingRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'mapping_rules.json'), 'utf8'));
  } catch(e) {
    console.error('Không tìm thấy hoặc lỗi đọc mapping_rules.json. Đang dùng fallback.', e);
  }

  const pRules = mappingRules.Projects || {};
  const eRules = mappingRules.Expenses || {};

  // Helper to map header arrays to index
  function getHeaderIndex(headerArray, columnName) {
    if (!columnName) return -1;
    return headerArray.findIndex(h => typeof h === 'string' && h.trim().toLowerCase() === columnName.trim().toLowerCase());
  }

  const dashboardSheet = workbook.Sheets['Dashboard'];
  let balanceAmount = 0;
  if (dashboardSheet) {
    const dashboardJson = xlsx.utils.sheet_to_json(dashboardSheet, { header: 1 });
    try {
      balanceAmount = dashboardJson[6] ? dashboardJson[6][6] || 0 : 0;
    } catch (e) {}
  }

  const projectsSheet = workbook.Sheets['Projects'];
  const projectsRaw = xlsx.utils.sheet_to_json(projectsSheet, { header: 1 });

  let calculatedTotalReceived = 0;
  let calculatedTotalReceivable = 0;
  const projectsData = [];

  if (projectsRaw.length > 0) {
    const pHeaders = projectsRaw[0];
    const idx = {
      id:          getHeaderIndex(pHeaders, pRules.id          || "ID"),
      projectName: getHeaderIndex(pHeaders, pRules.projectName || "Project Name"),
      client:      getHeaderIndex(pHeaders, pRules.client      || "Client"),
      status:      getHeaderIndex(pHeaders, pRules.status      || "Stage Status"),
      projectType: getHeaderIndex(pHeaders, pRules.projectType || "Type"),
      dueDate:     getHeaderIndex(pHeaders, pRules.dueDate     || "Due"),
      nextAction:  getHeaderIndex(pHeaders, pRules.nextAction  || "Next Action"),
      notes:       getHeaderIndex(pHeaders, pRules.notes       || "Notes")
    };

    // Read Giấy tờ sheet for financial data
    const paperSheet = workbook.Sheets['Giấy tờ'];
    let paperRows = [];
    let paperHeaders = [];
    if (paperSheet) {
      paperRows = xlsx.utils.sheet_to_json(paperSheet, { header: 1 });
      if (paperRows.length > 0) paperHeaders = paperRows[0];
    }
    
    const pIdxId = getHeaderIndex(paperHeaders, "ID");
    const pIdxBudget = getHeaderIndex(paperHeaders, "Tổng cộng");
    const pIdxD1 = getHeaderIndex(paperHeaders, "Đợt 1");
    const pIdxD2 = getHeaderIndex(paperHeaders, "Đợt 2");
    const pIdxD3 = getHeaderIndex(paperHeaders, "Đợt 3");
    const pIdxExpenses = getHeaderIndex(paperHeaders, "Chi phí");

    for (let i = 1; i < projectsRaw.length; i++) {
      const row = projectsRaw[i];
      if (!row || idx.projectName === -1 || !row[idx.projectName]) continue;

      const projId = idx.id !== -1 ? row[idx.id] : i;
      let budget = 0, d1 = 0, d2 = 0, d3 = 0, expenses = 0;
      
      if (paperRows.length > 1) {
        let paperRow = null;
        if (pIdxId !== -1) {
          paperRow = paperRows.find(r => r[pIdxId] == projId);
        }
        if (!paperRow && paperRows[i]) {
          paperRow = paperRows[i];
        }
        if (paperRow) {
          budget = parseFloat(String(paperRow[pIdxBudget]).replace(/[^0-9.-]/g, '')) || 0;
          d1 = parseFloat(String(paperRow[pIdxD1]).replace(/[^0-9.-]/g, '')) || 0;
          d2 = parseFloat(String(paperRow[pIdxD2]).replace(/[^0-9.-]/g, '')) || 0;
          d3 = parseFloat(String(paperRow[pIdxD3]).replace(/[^0-9.-]/g, '')) || 0;
          expenses = parseFloat(String(paperRow[pIdxExpenses]).replace(/[^0-9.-]/g, '')) || 0;
        }
      }

      const receivedVal = d1 + d2 + d3;
      const receivable = budget - receivedVal;

      calculatedTotalReceived += receivedVal;
      calculatedTotalReceivable += receivable;

      let status = idx.status !== -1 ? (row[idx.status] || 'Chưa bắt đầu') : 'Chưa bắt đầu';

      // Helper: convert Excel serial date number to dd/mm/yyyy string
      function excelDateToStr(val) {
        if (!val) return '';
        if (typeof val === 'number') {
          const d = new Date((val - 25569) * 86400 * 1000);
          if (!isNaN(d.getTime())) {
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
          }
        }
        return String(val);
      }

      const dueDateStr = idx.dueDate !== -1 ? excelDateToStr(row[idx.dueDate]) : '';

      projectsData.push({
        id: String(projId),
        client:      idx.client      !== -1 ? (row[idx.client]      || '') : '',
        projectName: row[idx.projectName],
        status:      status,
        projectType: idx.projectType !== -1 ? (row[idx.projectType] || 'AI Render') : 'AI Render',
        budget:      budget,
        received:    receivedVal,
        receivable:  receivable,
        expenses:    expenses,
        paymentD1:   d1,
        paymentD2:   d2,
        paymentD3:   d3,
        dueDate:     dueDateStr,
        nextAction:  idx.nextAction !== -1 ? (row[idx.nextAction] || '') : '',
        nextActionDue: dueDateStr,   // same Due column = deadline for next action
        notes:       idx.notes      !== -1 ? (row[idx.notes]      || '') : ''
      });
    }
  }

  const expensesSheet = workbook.Sheets['Expense'];
  const expensesRawAoA = expensesSheet ? xlsx.utils.sheet_to_json(expensesSheet, { header: 1 }) : [];
  
  let totalExpensesSum = 0;
  const expensesRaw = [];

  if (expensesRawAoA.length > 0) {
    const eHeaders = expensesRawAoA[0];
    // Map columns using eRules, falling back to known column names
    const eIdx = {
      date:     getHeaderIndex(eHeaders, eRules.date     || 'Date'),
      vendor:   getHeaderIndex(eHeaders, eRules.vendor   || 'Vendor / Payee'),
      amount:   getHeaderIndex(eHeaders, eRules.amount   || 'Amount'),
      project:  getHeaderIndex(eHeaders, eRules.project  || 'Project Name'),
      category: getHeaderIndex(eHeaders, eRules.category || 'Expense Category'),
      notes:    getHeaderIndex(eHeaders, eRules.notes    || 'Description / Note')
    };

    for (let i = 1; i < expensesRawAoA.length; i++) {
      const r = expensesRawAoA[i];
      // Row must have at least an amount or a vendor to be valid
      const hasAmount = eIdx.amount !== -1 && r[eIdx.amount] !== undefined && r[eIdx.amount] !== '';
      const hasVendor = eIdx.vendor !== -1 && r[eIdx.vendor];
      if (!r || (!hasAmount && !hasVendor)) continue;
      
      const amtRaw = eIdx.amount !== -1 ? (r[eIdx.amount] || 0) : 0;
      const amt = typeof amtRaw === 'number' ? amtRaw : (parseFloat(String(amtRaw).replace(/[^0-9.-]/g, '')) || 0);
      if (amt === 0) continue; // skip zero-amount rows
      
      totalExpensesSum += amt;
      expensesRaw.push({
        'ID': i,
        'Hạng Mục Chi': eIdx.category !== -1 ? (r[eIdx.category] || 'Khác') : 'Khác',
        'Dự Án': eIdx.project !== -1 ? (r[eIdx.project] || '') : '',
        'Số Tiền': amt,
        'Ngày Chi': eIdx.date !== -1 ? r[eIdx.date] : '',
        'Ghi Chú': eIdx.notes !== -1 ? (r[eIdx.notes] || '') : '',
        'Vendor': eIdx.vendor !== -1 ? (r[eIdx.vendor] || '') : ''
      });
    }
  }
  
  const finSheet = workbook.Sheets['Finance'];
  let totalSauThue = 0;
  let foundFinanceHeader = false;
  if (finSheet) {
    const finRaw = xlsx.utils.sheet_to_json(finSheet, { header: 1 });
    const headerRowIdx = finRaw.findIndex(r => r && r.includes('Sau thuế'));
    if (headerRowIdx !== -1) {
      foundFinanceHeader = true;
      const headerRow = finRaw[headerRowIdx];
      const sauThueColIdx = headerRow.indexOf('Sau thuế');
      for (let i = headerRowIdx + 1; i < finRaw.length; i++) {
        const row = finRaw[i];
        if (row && row[sauThueColIdx]) {
           const val = parseFloat(String(row[sauThueColIdx]).replace(/[^0-9.-]/g, '')) || 0;
           totalSauThue += val;
        }
      }
    }
  }

  balanceAmount = foundFinanceHeader ? totalSauThue - totalExpensesSum : calculatedTotalReceived - totalExpensesSum;

  let incomeRaw = [];
  const incomeSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'income' || n.toLowerCase() === 'incomes');
  if (incomeSheetName && workbook.Sheets[incomeSheetName]) {
    const incomeSheetRaw = xlsx.utils.sheet_to_json(workbook.Sheets[incomeSheetName], { header: 1 });
    if (incomeSheetRaw.length > 0) {
      const iHeaders = incomeSheetRaw[0];
      const iRules = mappingRules.Income || {};
      const iIdx = {
        date:    getHeaderIndex(iHeaders, iRules.date    || 'Ngày'),
        project: getHeaderIndex(iHeaders, iRules.project || 'Dự Án'),
        amount:  getHeaderIndex(iHeaders, iRules.amount  || 'Số Tiền'),
        notes:   getHeaderIndex(iHeaders, iRules.notes   || 'Ghi Chú')
      };
      for (let i = 1; i < incomeSheetRaw.length; i++) {
        const r = incomeSheetRaw[i];
        if (!r) continue;
        const amtRaw = iIdx.amount !== -1 ? (r[iIdx.amount] || 0) : 0;
        const amt = typeof amtRaw === 'number' ? amtRaw : (parseFloat(String(amtRaw).replace(/[^0-9.-]/g, '')) || 0);
        if (amt === 0) continue;
        incomeRaw.push({
          'Ngày Nhận': iIdx.date !== -1 ? r[iIdx.date] : '',
          'Dự Án':     iIdx.project !== -1 ? (r[iIdx.project] || '') : '',
          'Số Tiền':   amt,
          'Ghi Chú':   iIdx.notes !== -1 ? (r[iIdx.notes] || '') : ''
        });
      }
    }
  }

  return { balanceAmount, calculatedTotalReceived, calculatedTotalReceivable, projectsData, expensesRaw, incomeRaw };
}

async function syncExcelToDatabase(dbRun, dbQuery) {
  console.log("Reading data from Google Drive Excel (Original)...");
  const filePath = 'E:/agent/Project Management.xlsx';
  const data = extractExcelData(filePath);
  
  await dbRun("DELETE FROM projects");
  await dbRun("DELETE FROM cash_flow");
  await dbRun("DELETE FROM incomes");
  await dbRun("DELETE FROM expenses");
  await dbRun("DELETE FROM alerts");
  await dbRun("DELETE FROM documents");
  await dbRun("DELETE FROM actions");
  await dbRun("DELETE FROM agents");
  await dbRun("DELETE FROM tasks");
  await dbRun("DELETE FROM stats");

  // === AI AGENTS INITIALIZATION ===
  const aiTeam = [
    { id: "agent_pm", name: "Trâm Anh (PM)", role: "Điều phối dự án, báo cáo sếp", color: "text-emerald-400 bg-emerald-500/10", status: "Active" },
    { id: "agent_it", name: "Chí Hải (IT)", role: "Phụ trách kỹ thuật, viết code", color: "text-blue-400 bg-blue-500/10", status: "Active" },
    { id: "agent_creative", name: "Minh Đan (Creative)", role: "Viết Brief, sáng tạo nội dung", color: "text-purple-400 bg-purple-500/10", status: "Active" },
    { id: "agent_mkt", name: "Quốc Huy (Marketing)", role: "Quản lý Facebook Fanpage", color: "text-orange-400 bg-orange-500/10", status: "Active" },
    { id: "agent_sales", name: "Quốc Bảo (Sales)", role: "Tính giá, báo giá Excel", color: "text-yellow-400 bg-yellow-500/10", status: "Active" },
    { id: "agent_finance", name: "Minh Thư (Legal/Finance)", role: "Soạn hợp đồng, thanh toán", color: "text-rose-400 bg-rose-500/10", status: "Active" }
  ];

  for (const agent of aiTeam) {
    await dbRun("INSERT INTO agents (id, name, status, keyResponsibility, currentTask, recentActivity, workloadProgress, avatarColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      agent.id, agent.name, agent.status, agent.role, "Đang chờ lệnh từ sếp", "Hệ thống vừa khởi động xong", 10, agent.color
    ]);
  }

  const mdFiles = findMdFilesSync('g:/My Drive/[ANPHIM] MASTER PLANN/02_PROJECTs');
  const projectNotes = {};
  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.md');
    projectNotes[fileName] = content;
  }

  let totalReceivable = 0;
  let activeCount = 0;
  
  data.projectsData.forEach((p, idx) => {
    let mappedStatus = p.status;
    
    if (mappedStatus !== "Hoàn thành") {
      activeCount++;
      totalReceivable += p.receivable;
    }

    // Merge Excel Notes + Markdown file notes (Excel notes take priority if present)
    const excelNote = p.notes || '';
    let mdNote = '';
    for (const [key, val] of Object.entries(projectNotes)) {
      if (key.toLowerCase().includes(p.projectName.toLowerCase()) || p.projectName.toLowerCase().includes(key.toLowerCase())) {
        mdNote = val.substring(0, 2000) + (val.length > 2000 ? '...' : '');
        break;
      }
    }
    // Show Excel note first (CEO's direct note), then markdown detail below
    const note = excelNote
      ? (mdNote ? excelNote + '\n\n---\n' + mdNote : excelNote)
      : mdNote;

    dbRun("INSERT INTO projects (id, name, client, status, budget, received, dueDate, nextAction, nextActionDue, projectType, paymentD1, paymentD2, paymentD3, milestones, paymentPhase, paymentPhaseProgress, thumbnailUrl, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      `proj_${idx}`,
      p.projectName,
      p.client || 'N/A',
      mappedStatus,
      p.budget,
      p.received,
      p.dueDate || '',
      p.nextAction || '',
      p.nextActionDue || p.dueDate || '',
      p.projectType || 'AI Render',
      p.paymentD1 || 0,
      p.paymentD2 || 0,
      p.paymentD3 || 0,
      JSON.stringify(["Brief / Scope", "Pre-Production", "Draft idea", "Storyboard", "Production", "Offline", "Online", "Delivery", "Final / Close-out"]),
      "Phase 1",
      0,
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
      note
    ]);
  });

  const expCategories = {};
  data.expensesRaw.forEach(e => {
    const cat = e['Hạng Mục Chi'] || 'Khác';
    expCategories[cat] = (expCategories[cat] || 0) + (e['Số Tiền'] || 0);
  });
  
  // Lưu 3 chi phí gần nhất
  await dbRun("DELETE FROM recent_expenses");
  const recentExps = [...data.expensesRaw].reverse().slice(0, 3);
  for (let i = 0; i < recentExps.length; i++) {
    const e = recentExps[i];
    await dbRun("INSERT INTO recent_expenses (id, title, amount, date, category) VALUES (?, ?, ?, ?, ?)", [
      e['ID'] || `exp_${i}`, e['Hạng Mục Chi'] || 'Chi phí', e['Số Tiền'] || 0, e['Ngày Chi'] || 'N/A', e['Dự Án'] || 'Chung'
    ]);
  }
  
  let totalExp = Object.values(expCategories).reduce((a, b) => a + b, 0) || 1;
  const expColors = ['bg-emerald-500', 'bg-orange-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-rose-500'];
  let cIdx = 0;
  for (const [cat, amt] of Object.entries(expCategories)) {
    const pct = Math.round((amt / totalExp) * 100);
    const color = expColors[cIdx % expColors.length];
    dbRun("INSERT INTO expenses (category, amount, percentage, color) VALUES (?, ?, ?, ?)", [cat, amt, pct, color]);
    cIdx++;
  }

  // Load Today Tasks
  const todayTasksFile = 'g:/My Drive/[ANPHIM] MASTER PLANN/.agent/guidelines/Today_Tasks.md';
  if (fs.existsSync(todayTasksFile)) {
    const content = fs.readFileSync(todayTasksFile, 'utf8');
    const lines = content.replace(/\\n/g, '\n').split(/\r?\n/);
    
    let groups = [];
    let currentDate = 'General';
    let currentAgent = 'PM Agent';
    
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('# ')) {
        currentDate = line.replace('# ', '').trim();
      } else if (line.startsWith('## ')) {
        currentAgent = line.replace('## ', '').trim();
      } else if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('- [X]')) {
        let group = groups.find(g => g.date === currentDate && g.agent === currentAgent);
        if (!group) {
          group = { date: currentDate, agent: currentAgent, tasks: [] };
          groups.push(group);
        }
        group.tasks.push(line);
      }
    }

    let actIdx = 1;
    for (const g of groups) {
      if (g.tasks.length > 0) {
        const title = g.tasks.join('\n');
        dbRun("INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
          `act_${actIdx}`, actIdx, title, g.date, 'High', g.agent, 'Pending', ''
        ]);
        actIdx++;
      }
    }
  }

  const dashboardStats = {
    cashAvailable: data.balanceAmount || 0,
    cashAvailableChange: "+8.4% so với tuần trước",
    receivable: totalReceivable || 0,
    receivableChange: "+5.1% so với tuần trước",
    activeProjectsCount: activeCount,
    activeProjectsChange: "↑ 2 so với tuần trước",
    actionsCount: 5,
    actionsCompletedCount: 0,
  };
  await dbRun("INSERT INTO stats (key, value) VALUES (?, ?)", ["dashboard", JSON.stringify(dashboardStats)]);

  
  // === POPULATE CASH FLOW ===
  // Basic date parsing to group by week/month
  const cfMap = {};
  
  function parseExcelDate(val) {
    if (!val) return new Date();
    if (typeof val === 'number') {
      // Excel epoch is 1899-12-30
      return new Date((val - 25569) * 86400 * 1000);
    }
    if (typeof val === 'string') {
      const parts = val.split('/');
      if (parts.length === 3) {
        return new Date(parts[2], parts[1]-1, parts[0]);
      }
      return new Date(val);
    }
    return new Date();
  }

  function getWeekLabel(dateObj) {
    if (isNaN(dateObj.getTime())) dateObj = new Date();
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const day = dateObj.getDate();
    return `${month} ${day}`;
  }

  if (data.incomeRaw) {
    let incomeId = 1;
    for (const inc of data.incomeRaw) {
      const d = parseExcelDate(inc['Ngày Nhận']);
      const label = getWeekLabel(d);
      if (!cfMap[label]) cfMap[label] = { inflow: 0, outflow: 0 };
      const amount = Number(inc['Số Tiền']) || 0;
      cfMap[label].inflow += amount;

      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      await dbRun("INSERT INTO incomes (id, date, project, amount, notes) VALUES (?, ?, ?, ?, ?)", [
        `inc_${incomeId++}`, dateStr, inc['Dự Án'] || '', amount, inc['Ghi Chú'] || ''
      ]);
    }
  }

  if (data.expensesRaw) {
    data.expensesRaw.forEach(exp => {
      const d = parseExcelDate(exp['Ngày Chi']);
      const label = getWeekLabel(d);
      if (!cfMap[label]) cfMap[label] = { inflow: 0, outflow: 0 };
      cfMap[label].outflow -= (Number(exp['Số Tiền']) || 0);
    });
  }

  
  let cfId = 1;
  
  // Create an array so we can sort by date
  const cfArray = [];
  for (const [label, vals] of Object.entries(cfMap)) {
    // Parse the label back to a date for sorting, or we could have stored the date object.
    // Label format: "May 14", "Jun 2". Let's assume current year 2026.
    const dateObj = new Date(label + " 2026");
    cfArray.push({
      label,
      dateObj,
      inflow: vals.inflow,
      outflow: vals.outflow,
      netProfit: vals.inflow + vals.outflow
    });
  }

  // Sort by date ascending
  cfArray.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  for (const item of cfArray) {
    await dbRun("INSERT INTO cash_flow (id, label, inflow, outflow, netProfit) VALUES (?, ?, ?, ?, ?)", [
      `cf_${cfId++}`, item.label, item.inflow, item.outflow, item.netProfit
    ]);
  }
// If no data, insert a dummy so the chart isn't completely blank
  if (Object.keys(cfMap).length === 0) {
    await dbRun("INSERT INTO cash_flow (id, label, inflow, outflow, netProfit) VALUES (?, ?, ?, ?, ?)", [
      'cf_1', 'Chưa có dữ liệu', 0, 0, 0
    ]);
  }

  console.log("Excel Sync Complete!");

}

module.exports = { syncExcelToDatabase };
