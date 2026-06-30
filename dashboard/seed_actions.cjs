const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pgClient.connect();
  
  await pgClient.query('DELETE FROM actions');
  
  await pgClient.query(`
    INSERT INTO actions (id, priorityorder, title, prioritylevel, suggestedagent, status)
    VALUES 
      ('act_1', 1, 'Sếp vui lòng cung cấp và gửi thêm Mẫu Hợp Đồng mới nhất cho đối tác.', 'High', 'Trâm Anh', 'Pending'),
      ('act_2', 2, 'Kế toán không lọc được phần chi phí giao dịch tuần trước. Sếp bổ sung thêm thông tin cho khoản chi này nhé.', 'High', 'Minh Thư', 'Pending')
  `);
  
  console.log("Seeded actions table with Trâm Anh and Minh Thư tasks.");
  await pgClient.end();
}

run();
