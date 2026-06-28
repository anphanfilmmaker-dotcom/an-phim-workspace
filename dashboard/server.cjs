/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const jwt = require('jsonwebtoken');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Ensure API responses use UTF-8 encoding and JWT Auth
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.path === '/login') {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Initialize Database connection dynamically
let db;
const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  console.log("Connecting to PostgreSQL database...");
  const { Client } = require('pg');
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  db.connect().catch(err => {
    console.error("PostgreSQL connection error:", err);
    process.exit(1);
  });
} else {
  console.log("Connecting to local SQLite database...");
  const sqlite3 = require('sqlite3').verbose();
  const dbFile = path.resolve(__dirname, 'db.sqlite');
  db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
      console.error("SQLite connection error:", err);
      process.exit(1);
    }
  });
}

// Database helper wrapper for promises
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      let pgSql = sql;
      let i = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${i++}`);
      db.query(pgSql, params, (err, res) => {
        if (err) reject(err);
        else resolve(res.rows);
      });
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      let pgSql = sql;
      let i = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${i++}`);
      db.query(pgSql, params, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
};

// Create tables schemas
async function initDb() {
  const sqliteSchemas = [
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT NOT NULL,
      status TEXT NOT NULL,
      budget REAL,
      received REAL,
      dueDate TEXT,
      nextAction TEXT,
      nextActionDue TEXT,
      projectType TEXT,
      paymentD1 REAL,
      paymentD2 REAL,
      paymentD3 REAL,
      milestones TEXT,
      paymentPhase TEXT,
      paymentPhaseProgress INTEGER,
      thumbnailUrl TEXT,
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cash_flow (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      inflow REAL,
      outflow REAL,
      netProfit REAL
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      category TEXT PRIMARY KEY,
      amount REAL,
      percentage INTEGER,
      color TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT,
      project TEXT,
      urgency TEXT,
      status TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project TEXT,
      type TEXT,
      status TEXT,
      owner TEXT,
      lastUpdated TEXT,
      fileSize TEXT,
      isUrgent INTEGER,
      urgentReason TEXT,
      priorityLevel TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      priorityOrder INTEGER,
      title TEXT NOT NULL,
      project TEXT,
      priorityLevel TEXT,
      suggestedAgent TEXT,
      status TEXT,
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT,
      keyResponsibility TEXT,
      currentTask TEXT,
      recentActivity TEXT,
      workloadProgress INTEGER,
      avatarColor TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS recent_expenses (
      id TEXT PRIMARY KEY,
      title TEXT,
      amount INTEGER,
      date TEXT,
      category TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      taskName TEXT NOT NULL,
      priority TEXT,
      assignedAgent TEXT,
      status TEXT,
      dueTime TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS stats (
      key TEXT PRIMARY KEY,
      value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS incomes (
      id TEXT PRIMARY KEY,
      date TEXT,
      project TEXT,
      amount REAL,
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS schedule (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT,
      time TEXT,
      type TEXT,
      participants TEXT
    )`
  ];

  const pgSchemas = [
    `CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      client VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      budget DOUBLE PRECISION,
      received DOUBLE PRECISION,
      dueDate VARCHAR(50),
      nextAction VARCHAR(255),
      nextActionDue VARCHAR(50),
      projectType VARCHAR(50),
      paymentD1 DOUBLE PRECISION,
      paymentD2 DOUBLE PRECISION,
      paymentD3 DOUBLE PRECISION,
      milestones TEXT,
      paymentPhase VARCHAR(50),
      paymentPhaseProgress INTEGER,
      thumbnailUrl VARCHAR(255),
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cash_flow (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(50) NOT NULL,
      inflow DOUBLE PRECISION,
      outflow DOUBLE PRECISION,
      netProfit DOUBLE PRECISION
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      category VARCHAR(50) PRIMARY KEY,
      amount DOUBLE PRECISION,
      percentage INTEGER,
      color VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS alerts (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      description TEXT,
      project VARCHAR(255),
      urgency VARCHAR(50),
      status VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      project VARCHAR(255),
      type VARCHAR(50),
      status VARCHAR(50),
      owner VARCHAR(255),
      lastUpdated VARCHAR(50),
      fileSize VARCHAR(50),
      isUrgent INTEGER,
      urgentReason TEXT,
      priorityLevel VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS actions (
      id VARCHAR(50) PRIMARY KEY,
      priorityOrder INTEGER,
      title VARCHAR(255) NOT NULL,
      project VARCHAR(255),
      priorityLevel VARCHAR(50),
      suggestedAgent VARCHAR(100),
      status VARCHAR(50),
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS agents (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status VARCHAR(50),
      keyResponsibility TEXT,
      currentTask VARCHAR(255),
      recentActivity TEXT,
      workloadProgress INTEGER,
      avatarColor VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(50) PRIMARY KEY,
      taskName VARCHAR(255) NOT NULL,
      priority VARCHAR(50),
      assignedAgent VARCHAR(100),
      status VARCHAR(50),
      dueTime VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS stats (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS incomes (
      id VARCHAR(50) PRIMARY KEY,
      date VARCHAR(50),
      project VARCHAR(255),
      amount DOUBLE PRECISION,
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS schedule (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      date VARCHAR(50),
      time VARCHAR(50),
      type VARCHAR(50),
      participants TEXT
    )`
  ];

  const schemas = isPostgres ? pgSchemas : sqliteSchemas;
  
  for (const sql of schemas) {
    await dbRun(sql);
  }

  // Populate mock data if tables are empty
  const projectCount = await dbQuery("SELECT COUNT(*) as count FROM projects");
  const count = isPostgres ? parseInt(projectCount[0].count) : projectCount[0].count;

  if (count === 0) {
    console.log("Database is empty. Please add projects via the UI.");
  }

  // Populate schedule mock data if empty
  /*
  const scheduleCount = await dbQuery("SELECT COUNT(*) as count FROM schedule");
  const sCount = isPostgres ? parseInt(scheduleCount[0].count) : scheduleCount[0].count;
  if (sCount === 0) {
    console.log("Populating mock schedule data...");
    const mockSchedule = [
      { id: "sch_1", title: "Họp chốt phương án VFX", date: "2026-06-22", time: "14:00 - 15:30", type: "Meeting", participants: "Sếp, Trâm Anh, Hải" },
      { id: "sch_2", title: "Đi khảo sát bối cảnh quay", date: "2026-06-23", time: "08:00 - 12:00", type: "Shoot", participants: "Team Production" },
      { id: "sch_3", title: "Trình duyệt Draft 1 với Khách hàng", date: "2026-06-23", time: "15:00 - 16:00", type: "Meeting", participants: "Sếp, Trâm Anh" },
      { id: "sch_4", title: "Deadline nộp kịch bản phân cảnh", date: "2026-06-24", time: "18:00", type: "Deadline", participants: "Minh Đan" },
      { id: "sch_5", title: "Brainstorm chiến dịch Marketing Mùa Thu", date: "2026-06-25", time: "10:00 - 11:30", type: "Meeting", participants: "Quốc Huy, Minh Đan" }
    ];
    for (const s of mockSchedule) {
      await dbRun(
        "INSERT INTO schedule (id, title, date, time, type, participants) VALUES (?, ?, ?, ?, ?, ?)",
        [s.id, s.title, s.date, s.time, s.type, s.participants]
      );
    }
  }
  */
}

// REST API Endpoints

// Fetch entire Database structure
app.get('/api/db', async (req, res) => {
  try {
    const projects = await dbQuery("SELECT * FROM projects");
    const cashFlow = await dbQuery("SELECT * FROM cash_flow");
    const expenses = await dbQuery("SELECT * FROM expenses");
    const alerts = await dbQuery("SELECT * FROM alerts");
    const documents = await dbQuery("SELECT * FROM documents");
    const projectDocuments = await dbQuery("SELECT * FROM projectDocuments");
    const actions = await dbQuery("SELECT * FROM actions");
    const agents = await dbQuery("SELECT * FROM agents");
    const tasks = await dbQuery("SELECT * FROM tasks");
    const recent_expenses = await dbQuery("SELECT * FROM recent_expenses");
    const expenseTransactions = await dbQuery("SELECT * FROM expenseTransactions");
    const statsRows = await dbQuery("SELECT * FROM stats");
    const incomes = await dbQuery("SELECT * FROM incomes");
    const schedule = await dbQuery("SELECT * FROM schedule");

    // Parse JSON strings back to arrays/objects where applicable
    const parsedProjects = projects.map(p => ({
      ...p,
      projectName: p.name,       // alias so frontend reads `projectName`
      milestones: p.milestones ? JSON.parse(p.milestones) : []
    }));

    const parsedDocuments = documents.map(d => ({
      ...d,
      isUrgent: !!d.isUrgent
    }));

    const statsObj = {};
    statsRows.forEach(row => {
      statsObj[row.key] = JSON.parse(row.value);
    });

    res.json({
      dashboard: statsObj.dashboard || {},
      projects: parsedProjects,
      cashFlow,
      expenses,
      alerts,
      documents: parsedDocuments,
      projectDocuments,
      actions,
      agents,
      tasks,
      recent_expenses,
      expenseTransactions,
      incomes,
      schedule,
      agentPerformance: statsObj.agentPerformance || {}
    });
  } catch (err) {
    console.error("API error fetching db:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update Project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { notes } = req.body;
    await dbRun("UPDATE projects SET notes = ? WHERE id = ?", [notes, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Project
app.post('/api/projects', async (req, res) => {
  try {
    const p = req.body;
    await dbRun(
      `INSERT INTO projects (id, name, client, status, budget, received, dueDate, nextAction, nextActionDue, projectType, paymentD1, paymentD2, paymentD3, milestones, paymentPhase, paymentPhaseProgress, thumbnailUrl, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.client, p.status, p.budget, p.received, p.dueDate, p.nextAction, p.nextActionDue, p.projectType, p.paymentD1, p.paymentD2, p.paymentD3, JSON.stringify(p.milestones), p.paymentPhase, p.paymentPhaseProgress, p.thumbnailUrl, p.notes]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Document
app.post('/api/documents', async (req, res) => {
  try {
    const d = req.body;
    await dbRun(
      `INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, fileSize, isUrgent, urgentReason, priorityLevel) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.name, d.project, d.type, d.status, d.owner, d.lastUpdated, d.fileSize, d.isUrgent ? 1 : 0, d.urgentReason, d.priorityLevel]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Document Status
app.put('/api/documents/:id/status', async (req, res) => {
  try {
    const { status, isUrgent } = req.body;
    await dbRun("UPDATE documents SET status = ?, isUrgent = ? WHERE id = ?", [status, isUrgent ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM documents WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Action Status
app.put('/api/actions/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun("UPDATE actions SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Finance Alert
app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun("UPDATE alerts SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Agent Status
app.put('/api/agents/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun("UPDATE agents SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete Task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun("UPDATE tasks SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { history, agentName, agentRole } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "Chưa cấu hình GEMINI_API_KEY trong file .env trên server." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // System instruction to give the agent its persona
    const systemInstruction = `Bạn là ${agentName} tại An Phim Workspace. Vai trò của bạn là: ${agentRole}. Hãy trả lời các câu hỏi ngắn gọn, chuyên nghiệp, xưng hô phù hợp và đúng với chuyên môn của mình.`;

    const formattedContents = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets in production
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Database initialization failed:", err);
});
