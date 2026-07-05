const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const mockSchedules = [
    { id: "evt-001", title: "Lên ý tưởng TVC", date: "2026-06-03", startTime: "09:00", endTime: "10:30", category: "work", priority: "medium", status: "todo", owner: "An Phan", projectId: "project-tvc-001" },
    { id: "evt-002", title: "Review kịch bản", date: "2026-06-04", startTime: "10:00", endTime: "11:00", category: "work", priority: "medium", status: "in_progress", owner: "Minh Đan", projectId: "project-film-001" },
    { id: "evt-003", title: "Dựng phim teaser", date: "2026-06-05", startTime: "13:30", endTime: "16:00", category: "work", priority: "high", status: "todo", owner: "An Phan" },
    { id: "evt-004", title: "Họp KH: Galaxy Corp", date: "2026-06-06", startTime: "10:00", endTime: "11:30", category: "meeting", priority: "high", status: "todo", owner: "An Phan" },
    { id: "evt-005", title: "Chỉnh sửa feedback", date: "2026-06-07", startTime: "14:00", endTime: "17:00", category: "work", priority: "medium", status: "todo", owner: "Chí Hải" },
    { id: "evt-006", title: "Sinh nhật mẹ", date: "2026-06-09", startTime: "19:00", category: "personal", priority: "high", status: "todo", owner: "An Phan" },
    { id: "evt-007", title: "Sản xuất hậu kỳ", date: "2026-06-10", startTime: "09:30", endTime: "18:00", category: "work", priority: "medium", status: "in_progress", owner: "Minh Đan" },
    { id: "evt-008", title: "Kiểm tra thiết bị", date: "2026-06-11", startTime: "11:00", category: "work", priority: "low", status: "todo", owner: "An Phan" },
    { id: "evt-009", title: "Xuất file master", date: "2026-06-12", startTime: "16:00", category: "work", priority: "high", status: "todo", owner: "Chí Hải" },
    { id: "evt-010", title: "Phỏng vấn ứng viên", date: "2026-06-13", startTime: "11:00", category: "meeting", priority: "medium", status: "todo", owner: "An Phan" },
    { id: "evt-011", title: "AI Agent báo cáo", date: "2026-06-14", startTime: "08:30", category: "ai_agent", priority: "medium", status: "todo", agent: "Trâm Anh" },
    { id: "evt-012", title: "Ngủ sớm", date: "2026-06-15", startTime: "22:30", category: "personal", priority: "low", status: "todo", owner: "An Phan" },
    { id: "evt-013", title: "Jogging buổi sáng", date: "2026-06-16", startTime: "06:00", category: "personal", priority: "low", status: "done", owner: "An Phan" },
    { id: "evt-014", title: "Họp dự án phim Mùa Hè", date: "2026-06-16", startTime: "14:00", endTime: "15:30", category: "meeting", priority: "high", status: "todo", owner: "An Phan" },
    { id: "evt-015", title: "Chuẩn bị casting", date: "2026-06-17", startTime: "09:00", category: "work", priority: "medium", status: "todo", owner: "Minh Đan" },
    { id: "evt-016", title: "Casting diễn viên", date: "2026-06-18", startTime: "13:00", category: "work", priority: "high", status: "todo", owner: "Minh Đan" },
    { id: "evt-017", title: "Chốt danh sách", date: "2026-06-19", startTime: "15:00", category: "work", priority: "medium", status: "todo", owner: "An Phan" },
    { id: "evt-018", title: "Họp biên kịch", date: "2026-06-20", startTime: "10:00", category: "meeting", priority: "medium", status: "todo", owner: "An Phan" },
    { id: "evt-019", title: "Quay ngày 1", date: "2026-06-21", startTime: "07:00", category: "work", priority: "high", status: "todo", owner: "An Phan" },
    { id: "evt-020", title: "Cafe với đối tác", date: "2026-06-23", startTime: "10:00", category: "meeting", priority: "medium", status: "todo", owner: "An Phan" }
];

async function run() {
  try {
    await pgClient.connect();
    
    console.log("Dropping old schedule table...");
    await pgClient.query('DROP TABLE IF EXISTS schedule');

    console.log("Creating new schedule table with correct schema...");
    await pgClient.query(`
      CREATE TABLE schedule (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "startTime" VARCHAR(50),
        "endTime" VARCHAR(50),
        date VARCHAR(50),
        category VARCHAR(50),
        priority VARCHAR(50),
        status VARCHAR(50),
        owner VARCHAR(100),
        agent VARCHAR(100),
        "projectId" VARCHAR(50)
      )
    `);

    console.log("Inserting mock schedule data...");
    let count = 0;
    for (let evt of mockSchedules) {
      await pgClient.query(`
        INSERT INTO schedule (
          id, title, "startTime", "endTime", date, category, priority, status, owner, agent, "projectId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        evt.id, evt.title, evt.startTime, evt.endTime || null, evt.date, evt.category, evt.priority, evt.status, evt.owner || null, evt.agent || null, evt.projectId || null
      ]);
      count++;
    }
    
    console.log(`Successfully migrated ${count} mock schedule rows to PostgreSQL!`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pgClient.end();
  }
}

run();
