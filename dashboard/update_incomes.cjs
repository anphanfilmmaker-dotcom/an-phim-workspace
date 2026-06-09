const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'g:/My Drive/[ANPHIM] MASTER PLANN/ANPHIM_Database_Template.xlsx';
const workbook = xlsx.readFile(filePath);

// 1. Update Incomes
let incomesSheet = workbook.Sheets['Incomes'];
let incomesData = [];
if (incomesSheet) {
  incomesData = xlsx.utils.sheet_to_json(incomesSheet);
}

const newIncomes = [
  { 'ID': 'inc_' + Date.now() + '1', 'Dự Án': 'Winterland87 Tháng 5', 'Số Tiền': 10000000, 'Ngày Nhận': '14/04/2026', 'Ghi Chú': '' },
  { 'ID': 'inc_' + Date.now() + '2', 'Dự Án': 'Winterland87 Tháng 5', 'Số Tiền': 5000000, 'Ngày Nhận': '08/05/2026', 'Ghi Chú': '' },
  { 'ID': 'inc_' + Date.now() + '3', 'Dự Án': 'Khai Son', 'Số Tiền': 10500000, 'Ngày Nhận': '13/05/2026', 'Ghi Chú': '' },
  { 'ID': 'inc_' + Date.now() + '4', 'Dự Án': 'Đông Thăng Long', 'Số Tiền': 27540000, 'Ngày Nhận': '02/06/2026', 'Ghi Chú': '' },
  { 'ID': 'inc_' + Date.now() + '5', 'Dự Án': 'Atera', 'Số Tiền': 19980000, 'Ngày Nhận': '26/05/2026', 'Ghi Chú': '' },
];

incomesData = incomesData.concat(newIncomes);

const newIncomesSheet = xlsx.utils.json_to_sheet(incomesData);
workbook.Sheets['Incomes'] = newIncomesSheet;

// Calculate sums
const receivedMap = {
  'Winterland87 Tháng 5': 15000000,
  'Khai Son': 10500000,
  'Đông Thăng Long': 27540000,
  'Atera': 19980000
};

// 2. Update Projects Sheet
const projectsSheet = workbook.Sheets['Projects'];
const projectsData = xlsx.utils.sheet_to_json(projectsSheet);

projectsData.forEach(p => {
  const name = p['Tên Dự Án'];
  if (receivedMap[name] !== undefined) {
    p['Đã Thanh Toán'] = receivedMap[name]; // Write as number!
  }
});

const newProjectsSheet = xlsx.utils.json_to_sheet(projectsData);
workbook.Sheets['Projects'] = newProjectsSheet;

xlsx.writeFile(workbook, filePath);
console.log('Successfully updated Excel file with new Incomes and updated Project balances.');
