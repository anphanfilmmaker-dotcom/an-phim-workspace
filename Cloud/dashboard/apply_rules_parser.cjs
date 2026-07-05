const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('excel-parser.cjs', 'utf8');

const correctCode = `
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
      id: getHeaderIndex(pHeaders, pRules.id),
      projectName: getHeaderIndex(pHeaders, pRules.projectName),
      client: getHeaderIndex(pHeaders, pRules.client),
      status: getHeaderIndex(pHeaders, pRules.status),
      budget: getHeaderIndex(pHeaders, pRules.budget),
      received: getHeaderIndex(pHeaders, pRules.received),
      receivable: getHeaderIndex(pHeaders, pRules.receivable),
      expenses: getHeaderIndex(pHeaders, pRules.expenses),
      dueDate: getHeaderIndex(pHeaders, pRules.dueDate),
      nextAction: getHeaderIndex(pHeaders, pRules.nextAction)
    };

    for (let i = 1; i < projectsRaw.length; i++) {
      const row = projectsRaw[i];
      if (!row || idx.projectName === -1 || !row[idx.projectName]) continue;

      let receivedStr = String(idx.received !== -1 ? (row[idx.received] || '0') : '0');
      let receivedVal = 0;
      let budget = idx.budget !== -1 ? (row[idx.budget] || 0) : 0;

      if (receivedStr.includes('%')) {
         const pct = parseInt(receivedStr.replace(/[^0-9]/g, '')) || 0;
         receivedVal = (budget * pct) / 100;
      } else {
         receivedVal = parseFloat(receivedStr.replace(/[^0-9.-]/g, '')) || 0;
      }

      let receivable = idx.receivable !== -1 && row[idx.receivable] !== undefined && row[idx.receivable] !== '' 
        ? row[idx.receivable] 
        : Math.max(0, budget - receivedVal);

      const expenses = idx.expenses !== -1 ? (row[idx.expenses] || 0) : 0;

      calculatedTotalReceived += receivedVal;
      calculatedTotalReceivable += receivable;

      projectsData.push({
        id: idx.id !== -1 ? row[idx.id] : i,
        client: idx.client !== -1 ? row[idx.client] : '',
        projectName: row[idx.projectName],
        status: idx.status !== -1 ? (row[idx.status] || 'On Track') : 'On Track',
        budget: budget,
        received: receivedVal,
        receivable: receivable,
        expenses: expenses,
        dueDate: idx.dueDate !== -1 ? row[idx.dueDate] : '',
        nextAction: idx.nextAction !== -1 ? row[idx.nextAction] : ''
      });
    }
  }

  const expensesSheet = workbook.Sheets['Expenses'];
  const expensesRawAoA = xlsx.utils.sheet_to_json(expensesSheet, { header: 1 });
  
  let totalExpensesSum = 0;
  const expensesRaw = [];

  if (expensesRawAoA.length > 0) {
    const eHeaders = expensesRawAoA[0];
    const eIdx = {
      id: getHeaderIndex(eHeaders, eRules.id),
      category: getHeaderIndex(eHeaders, eRules.category),
      project: getHeaderIndex(eHeaders, eRules.project),
      amount: getHeaderIndex(eHeaders, eRules.amount),
      date: getHeaderIndex(eHeaders, eRules.date),
      notes: getHeaderIndex(eHeaders, eRules.notes)
    };

    for (let i = 1; i < expensesRawAoA.length; i++) {
      const r = expensesRawAoA[i];
      if (!r || eIdx.category === -1 || !r[eIdx.category]) continue;
      
      const amtStr = String(eIdx.amount !== -1 ? (r[eIdx.amount] || '0') : '0');
      const amt = parseFloat(amtStr.replace(/[^0-9.-]/g, '')) || 0;
      
      totalExpensesSum += amt;
      expensesRaw.push({
        'ID': eIdx.id !== -1 ? r[eIdx.id] : i,
        'Hạng Mục Chi': r[eIdx.category],
        'Dự Án': eIdx.project !== -1 ? r[eIdx.project] : '',
        'Số Tiền': amt,
        'Ngày Chi': eIdx.date !== -1 ? r[eIdx.date] : '',
        'Ghi Chú': eIdx.notes !== -1 ? r[eIdx.notes] : ''
      });
    }
  }
  
  balanceAmount = calculatedTotalReceived - totalExpensesSum;

  let incomeRaw = [];
  if (workbook.Sheets['Incomes']) {
     incomeRaw = xlsx.utils.sheet_to_json(workbook.Sheets['Incomes']);
  }

  return { balanceAmount, calculatedTotalReceived, calculatedTotalReceivable, projectsData, expensesRaw, incomeRaw };
}
`;

code = code.replace(/function extractExcelData\(filePath\) \{[\s\S]*?return \{ balanceAmount.*?;\n\}/, correctCode.trim());

// Also need to require path if not already there
if (!code.includes("require('path')")) {
  code = "const path = require('path');\n" + code;
}

fs.writeFileSync('excel-parser.cjs', code, 'utf8');
console.log('Successfully updated excel-parser.cjs with dynamic mapping rules.');
