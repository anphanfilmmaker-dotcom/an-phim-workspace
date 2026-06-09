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

const EXCEL_PATH = 'g:/My Drive/[ANPHIM] MASTER PLANN/Project Management .xlsx';

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
 * syncDbToExcel(dbQuery)
 * Đọc toàn bộ projects từ DB rồi ghi vào sheet Projects của Excel.
 * @param {Function} dbQuery - hàm (sql, params) => Promise<rows[]>
 */
async function syncDbToExcel(dbQuery) {
  console.log('[excel-writer] Bắt đầu ghi DB → Excel...');

  // 1. Đọc file Excel hiện tại
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Không tìm thấy file Excel: ${EXCEL_PATH}`);
  }
  const workbook = xlsx.readFile(EXCEL_PATH, { cellDates: false, cellStyles: false });

  // 2. Lấy Projects sheet
  const sheetName = 'Projects';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${sheetName}"`);

  // 3. Đọc dữ liệu sheet thành mảng 2 chiều
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length === 0) throw new Error('Sheet Projects rỗng');

  const headers = rows[0].map(h => (h ? String(h).trim() : ''));

  // Tìm index các cột cần ghi
  function col(name) {
    return headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  }
  const COL = {
    id:         col('ID'),
    status:     col('Stage Status'),
    nextAction: col('Next Action'),
    due:        col('Due'),
    notes:      col('Notes'),
  };

  console.log('[excel-writer] Column mapping:', COL);

  if (COL.id === -1) throw new Error('Không tìm thấy cột "ID" trong sheet Projects');

  // 4. Lấy tất cả projects từ DB
  const projects = await dbQuery('SELECT id, name, status, nextAction, nextActionDue, dueDate, notes FROM projects');
  console.log(`[excel-writer] Đang ghi ${projects.length} dự án...`);

  // Tạo map: numeric id → project
  const dbMap = {};
  for (const p of projects) {
    // id trong DB là "proj_0", "proj_1"... nhưng ID gốc Excel là số 1, 2, 3...
    // Ta so sánh bằng tên hoặc bằng row index
    // Thực ra id trong DB = proj_${idx} (index 0-based), còn ID Excel là số nguyên
    // Nên ta dùng tên dự án để match
    dbMap[p.name.trim().toLowerCase()] = p;
  }

  let updatedCount = 0;

  // 5. Duyệt từng hàng Excel (bỏ qua header row 0)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[COL.id]) continue;

    // Lấy tên dự án (cột Project Name)
    const projNameCol = col('Project Name');
    if (projNameCol === -1) break;
    const excelName = String(row[projNameCol] || '').trim().toLowerCase();
    if (!excelName) continue;

    const p = dbMap[excelName];
    if (!p) continue;

    // Ghi từng cell vào rows (sau đó convert lại thành sheet)
    if (COL.status !== -1 && p.status)         rows[r][COL.status]     = p.status;
    if (COL.nextAction !== -1 && p.nextAction)  rows[r][COL.nextAction] = p.nextAction;
    if (COL.due !== -1 && (p.dueDate || p.nextActionDue)) {
      const dateVal = dateStrToExcelSerial(p.dueDate || p.nextActionDue);
      rows[r][COL.due] = dateVal;
    }
    if (COL.notes !== -1) {
      // Chỉ ghi phần trước dấu "---" (phần Excel note, bỏ markdown detail)
      const noteRaw = p.notes || '';
      const noteClean = noteRaw.split('\n---\n')[0].trim();
      rows[r][COL.notes] = noteClean;
    }

    updatedCount++;
  }

  // 6. Convert lại rows → sheet
  const newSheet = xlsx.utils.aoa_to_sheet(rows);

  // Giữ nguyên các sheet khác, chỉ thay Projects
  workbook.Sheets[sheetName] = newSheet;

  // 7. Ghi file Excel (overwrite)
  xlsx.writeFile(workbook, EXCEL_PATH);

  console.log(`[excel-writer] Hoàn tất! Đã cập nhật ${updatedCount} dự án vào Excel.`);
  return { updatedCount };
}

module.exports = { syncDbToExcel };
