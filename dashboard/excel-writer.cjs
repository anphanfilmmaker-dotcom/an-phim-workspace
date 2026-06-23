/**
 * excel-writer.cjs
 * Ghi dữ liệu từ SQLite DB ngược lại vào file Excel trên Google Drive.
 * Chỉ cập nhật các cột do Trâm Anh / webapp quản lý:
 *   - Stage Status, Next Action, Due, Notes
 * KHÔNG đụng đến dữ liệu tài chính trong sheet Giấy tờ.
 */

const xlsx = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_PATH = 'E:/agent/Database/Project Management.xlsx';
const NEW_EXCEL_PATH = 'E:/agent/Database/Backup_Project_Management.xlsx';

/**
 * parseExcelDate: chuyển chuỗi dd/mm/yyyy → Excel serial number
 * để ghi ngược vào ô Excel giữ đúng kiểu date.
 */
function dateStrToExcelSerial(str) {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d.getTime())) {
      // Excel epoch: 1899-12-30
      return Math.round((d.getTime() / 86400000) + 25569);
    }
  }
  return str; // giữ nguyên nếu không parse được
}

/**
 * syncDbToExcel(db)
 * Ghi toàn bộ dữ liệu database webapp thành một file Excel backup.
 */
async function syncDbToExcel(db) {
  console.log('[excel-writer] Bắt đầu ghi toàn bộ DB → Excel...');

  const workbook = xlsx.utils.book_new();
  let updatedCount = 0;

  const ignoredKeys = [
    'dashboard', 'agentPerformance', 'expenses', 'cashFlow', // Computed / Aggregated
    'incomes', 'alerts', 'documents', 'templateDocuments', // Mock data
    'actions', 'agents' // Mock data
  ];

  for (const [key, value] of Object.entries(db)) {
    if (ignoredKeys.includes(key)) continue;

    let sheetData = [];
    if (Array.isArray(value)) {
      sheetData = value;
    } else if (typeof value === 'object' && value !== null) {
      sheetData = [value];
    } else {
      continue;
    }

    if (sheetData.length === 0) {
      sheetData = [{}];
    }

    const sheet = xlsx.utils.json_to_sheet(sheetData);
    
    // Tên sheet Excel tối đa 31 ký tự
    let sheetName = key;
    if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
    
    // Chuẩn hóa tên sheet để dễ nhìn hơn
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);
    
    xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
    updatedCount++;
  }

  // Ghi file Excel ra file mới (Backup)
  xlsx.writeFile(workbook, NEW_EXCEL_PATH);

  console.log(`[excel-writer] Hoàn tất! Đã cập nhật ${updatedCount} sheets vào Excel.`);
  return { updatedCount };
}

module.exports = { syncDbToExcel };
