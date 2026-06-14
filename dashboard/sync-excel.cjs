const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const EXCEL_PATH = 'E:/agent/Project Management.xlsx';
const OUTPUT_PATH = path.join(__dirname, 'src', 'excelData.json');

function syncExcel() {
  try {
    console.log(`Reading Excel file from ${EXCEL_PATH}...`);
    const wb = xlsx.readFile(EXCEL_PATH, { cellDates: true });

    const getSheetData = (sheetName) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        console.warn(`Warning: Sheet "${sheetName}" not found!`);
        return [];
      }
      return xlsx.utils.sheet_to_json(sheet, { raw: true, defval: null, blankrows: true });
    };

    const data = {
      projects: getSheetData('Projects'),
      expense: getSheetData('Expense'),
      income: getSheetData('Income'),
      giayTo: getSheetData('Giấy tờ'),
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully generated ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Failed to read Excel file:", error.message);
  }
}

// Initial sync
syncExcel();

// Watch mode
if (process.argv.includes('--watch')) {
  console.log(`Watching for changes in ${EXCEL_PATH}...`);
  chokidar.watch(EXCEL_PATH, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  }).on('change', () => {
    console.log(`Detected change in ${EXCEL_PATH}. Resyncing...`);
    syncExcel();
  });
}
