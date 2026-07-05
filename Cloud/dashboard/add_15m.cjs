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
  { 'ID': 'inc_' + Date.now(), 'Dự Án': 'Winterland87 Tháng 5', 'Số Tiền': 15000000, 'Ngày Nhận': new Date().toLocaleDateString('en-GB'), 'Ghi Chú': '' }
];

incomesData = incomesData.concat(newIncomes);

const newIncomesSheet = xlsx.utils.json_to_sheet(incomesData);
workbook.Sheets['Incomes'] = newIncomesSheet;

// 2. Update Projects Sheet
const projectsSheet = workbook.Sheets['Projects'];
const projectsData = xlsx.utils.sheet_to_json(projectsSheet);

let newReceivedTotal = 0;

projectsData.forEach(p => {
  const name = p['Tên Dự Án'];
  if (name === 'Winterland87 Tháng 5') {
    p['Đã Thanh Toán'] = (Number(p['Đã Thanh Toán']) || 0) + 15000000;
    newReceivedTotal = p['Đã Thanh Toán'];
  }
});

const newProjectsSheet = xlsx.utils.json_to_sheet(projectsData);
workbook.Sheets['Projects'] = newProjectsSheet;

xlsx.writeFile(workbook, filePath);
console.log('Successfully added 15M to Winterland87 Tháng 5. New total received:', newReceivedTotal);
