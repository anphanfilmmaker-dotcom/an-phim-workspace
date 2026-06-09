const fs = require('fs');

let code = fs.readFileSync('excel-parser.cjs', 'utf8');

const injection = `
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
    return \`\${month} \${day}\`;
  }

  if (data.incomeRaw) {
    data.incomeRaw.forEach(inc => {
      const d = parseExcelDate(inc['Ngày Nhận']);
      const label = getWeekLabel(d);
      if (!cfMap[label]) cfMap[label] = { inflow: 0, outflow: 0 };
      cfMap[label].inflow += (Number(inc['Số Tiền']) || 0);
    });
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
  // Sort by date (naive approach, rely on order of parsing or just sort by the Date object of the label)
  // For simplicity, we just insert them
  for (const [label, vals] of Object.entries(cfMap)) {
    const net = vals.inflow + vals.outflow;
    await dbRun("INSERT INTO cash_flow (id, label, inflow, outflow, netProfit) VALUES (?, ?, ?, ?, ?)", [
      \`cf_\${cfId++}\`, label, vals.inflow, vals.outflow, net
    ]);
  }
  
  // If no data, insert a dummy so the chart isn't completely blank
  if (Object.keys(cfMap).length === 0) {
    await dbRun("INSERT INTO cash_flow (id, label, inflow, outflow, netProfit) VALUES (?, ?, ?, ?, ?)", [
      'cf_1', 'Chưa có dữ liệu', 0, 0, 0
    ]);
  }

  console.log("Excel Sync Complete!");
`;

code = code.replace(/console\.log\("Excel Sync Complete!"\);/, injection);
fs.writeFileSync('excel-parser.cjs', code, 'utf8');
console.log('Cash flow logic injected.');
