const fs = require('fs');
let code = fs.readFileSync('excel-parser.cjs', 'utf8');

// Replace the corrupted lines with correct UTF-8 using Buffer/Base64 to be 100% safe, or just normal strings if write_to_file handles it well.
// Wait, to be 100% safe, I will just rewrite extractExcelData function.

const correctCode = `
function extractExcelData(filePath) {
  const workbook = xlsx.readFile(filePath);

  const dashboardSheet = workbook.Sheets['Dashboard'];
  let balanceAmount = 0;
  if (dashboardSheet) {
    const dashboardJson = xlsx.utils.sheet_to_json(dashboardSheet, { header: 1 });
    try {
      balanceAmount = dashboardJson[6] ? dashboardJson[6][6] || 0 : 0;
    } catch (e) {}
  }

  const projectsSheet = workbook.Sheets['Projects'];
  // Use array of arrays to avoid header name matching
  const projectsRaw = xlsx.utils.sheet_to_json(projectsSheet, { header: 1 });

  let calculatedTotalReceived = 0;
  let calculatedTotalReceivable = 0;

  const projectsData = [];
  // Skip header row
  for (let i = 1; i < projectsRaw.length; i++) {
    const row = projectsRaw[i];
    if (!row || !row[1]) continue; // Needs Project Name

    // Parse received safely
    let receivedStr = String(row[6] || '0');
    let receivedVal = 0;
    if (receivedStr.includes('%')) {
       // if it's "100%", calculate from budget
       const pct = parseInt(receivedStr.replace(/[^0-9]/g, '')) || 0;
       receivedVal = ((row[5] || 0) * pct) / 100;
    } else {
       receivedVal = parseFloat(receivedStr.replace(/[^0-9.-]/g, '')) || 0;
    }

    const budget = row[5] || 0;
    const receivable = row[7] !== undefined && row[7] !== '' ? row[7] : Math.max(0, budget - receivedVal);
    const expenses = row[8] || 0;

    calculatedTotalReceived += receivedVal;
    calculatedTotalReceivable += receivable;

    projectsData.push({
      id: row[0],
      client: row[2],
      projectName: row[1],
      status: row[3] || 'On Track',
      budget: budget,
      received: receivedVal,
      receivable: receivable,
      expenses: expenses,
      dueDate: row[9],
      nextAction: row[10]
    });
  }

  const expensesSheet = workbook.Sheets['Expenses'];
  const expensesRawAoA = xlsx.utils.sheet_to_json(expensesSheet, { header: 1 });
  
  let totalExpensesSum = 0;
  const expensesRaw = [];
  for (let i = 1; i < expensesRawAoA.length; i++) {
    const r = expensesRawAoA[i];
    if (!r || !r[1]) continue;
    const amt = parseFloat(String(r[3] || '0').replace(/[^0-9.-]/g, '')) || 0;
    totalExpensesSum += amt;
    expensesRaw.push({
      'ID': r[0],
      'Hạng Mục Chi': r[1],
      'Dự Án': r[2],
      'Số Tiền': amt,
      'Ngày Chi': r[4],
      'Ghi Chú': r[5]
    });
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

fs.writeFileSync('excel-parser.cjs', code, 'utf8');
console.log('Fixed parser logic with AoA');
