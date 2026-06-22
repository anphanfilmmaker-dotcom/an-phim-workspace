const xlsx = require('xlsx');
const fs = require('fs');

const EXCEL_PATH = 'E:/agent/Project Management.xlsx';

function updateExcel() {
  console.log(`Reading Excel file from ${EXCEL_PATH}...`);
  const wb = xlsx.readFile(EXCEL_PATH, { cellDates: true });

  const addSheetIfNotExists = (sheetName, columns) => {
    if (!wb.SheetNames.includes(sheetName)) {
      const ws = xlsx.utils.aoa_to_sheet([columns]);
      xlsx.utils.book_append_sheet(wb, ws, sheetName);
      console.log(`Added sheet: ${sheetName}`);
    } else {
      console.log(`Sheet already exists: ${sheetName}`);
    }
  };

  addSheetIfNotExists('Documents', [
    'ID', 'Name', 'Project', 'Type', 'Status', 'Owner', 'Last Updated', 'File Size', 'Is Urgent', 'Urgent Reason', 'Priority Level'
  ]);
  
  addSheetIfNotExists('Alerts', [
    'ID', 'Type', 'Description', 'Project', 'Urgency', 'Status'
  ]);

  addSheetIfNotExists('Actions', [
    'ID', 'Priority Order', 'Title', 'Project', 'Priority Level', 'Suggested Agent', 'Status', 'Notes'
  ]);

  addSheetIfNotExists('Tasks', [
    'ID', 'Task Name', 'Priority', 'Assigned Agent', 'Status', 'Due Time'
  ]);

  addSheetIfNotExists('Agents', [
    'ID', 'Name', 'Status', 'Key Responsibility', 'Current Task', 'Recent Activity', 'Workload Progress', 'Avatar Color', 'Token Input', 'Token Output', 'Run Count', 'Estimated Cost'
  ]);

  xlsx.writeFile(wb, EXCEL_PATH);
  console.log(`Successfully updated ${EXCEL_PATH}`);
}

updateExcel();
