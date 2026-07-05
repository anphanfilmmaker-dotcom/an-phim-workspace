const fs = require('fs');
const data = require('./src/excelData.json');

const dailyCashFlowMap = new Map();

data.expense.forEach(e => {
  if (!e.Amount && !e["Vendor / Payee"] && !e["Description / Note"]) return;

  let dateStr = "2026-06-01";
  if (e.Date) {
    const d = new Date(e.Date);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
  }
  
  const amt = e.Amount || 0;
  if (amt !== 0) {
    const existing = dailyCashFlowMap.get(dateStr) || { inflow: 0, outflow: 0 };
    existing.outflow += amt;
    dailyCashFlowMap.set(dateStr, existing);
  }
});

console.log('Keys in dailyCashFlowMap:', Array.from(dailyCashFlowMap.keys()));
console.log('Values for 2026-06-17:', dailyCashFlowMap.get('2026-06-17'));
