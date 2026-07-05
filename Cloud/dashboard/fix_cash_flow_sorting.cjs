const fs = require('fs');

let code = fs.readFileSync('excel-parser.cjs', 'utf8');

// I need to replace the block that inserts into cash_flow with a sorted version.
const replacement = `
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
      \`cf_\${cfId++}\`, item.label, item.inflow, item.outflow, item.netProfit
    ]);
  }
`;

// Find the section to replace: from "let cfId = 1;" to "  // If no data"
code = code.replace(/let cfId = 1;[\s\S]*?(?=\/\/ If no data, insert a dummy)/, replacement);

fs.writeFileSync('excel-parser.cjs', code, 'utf8');
console.log('Fixed cash flow sorting.');
