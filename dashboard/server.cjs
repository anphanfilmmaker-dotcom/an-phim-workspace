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
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  db.on('error', (err) => {
    console.error("Unexpected error on idle client", err);
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

    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      taskName TEXT NOT NULL,
      priority TEXT,
      assignedAgent TEXT,
      status TEXT,
      dueTime TEXT
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
      description TEXT,
      startTime TEXT,
      endTime TEXT,
      date TEXT,
      category TEXT,
      priority TEXT,
      status TEXT,
      owner TEXT,
      agent TEXT,
      projectId TEXT
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


    `CREATE TABLE IF NOT EXISTS chat_history (
      id SERIAL PRIMARY KEY,
      agent_id VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    const projects = await dbQuery("SELECT * FROM projects WHERE status != 'Hidden'");
    const incomes = await dbQuery("SELECT * FROM incomes");
    const expenseTransactions = await dbQuery("SELECT * FROM expensetransactions");

    // 1. Calculate Project Financials

    const parsedProjects = projects.map(p => {
        // Calculate total incomes for this project
        const projectIncomes = incomes.filter(i => i.projectid === p.id);
        const totalReceived = projectIncomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        
        // Calculate total expenses for this project
        const projectExpenses = expenseTransactions.filter(e => e.projectid === p.id);
        const totalExpenses = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        
        return {
          ...p,
          projectName: p.name,
          milestones: typeof p.milestones === 'string' ? JSON.parse(p.milestones) : (p.milestones || []),
          totalExpenses: totalExpenses // Dynamic expenses (keep this)
        };
    });

    // 2. Calculate Pie Chart (expenses) from expenseTransactions
    const categorySums = {};
    let grandTotal = 0;
    expenseTransactions.forEach(t => {
       const cat = t.category || 'Khác';
       const amount = parseFloat(t.amount) || 0;
       categorySums[cat] = (categorySums[cat] || 0) + amount;
       grandTotal += amount;
    });
    
    // Sort by amount descending
    const sortedCategories = Object.keys(categorySums)
      .map(cat => ({ category: cat, amount: categorySums[cat] }))
      .sort((a, b) => b.amount - a.amount);
      
    // Group Top 4 and "Khác"
    const top4 = sortedCategories.slice(0, 4);
    const others = sortedCategories.slice(4);
    
    const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280"];
    
    const finalExpenses = top4.map((item, idx) => ({
       category: item.category,
       amount: item.amount,
       percentage: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 100) : 0,
       color: colors[idx % colors.length]
    }));
    
    if (others.length > 0) {
       const othersAmount = others.reduce((sum, item) => sum + item.amount, 0);
       finalExpenses.push({
           category: 'Khác',
           amount: othersAmount,
           percentage: grandTotal > 0 ? Math.round((othersAmount / grandTotal) * 100) : 0,
           color: colors[4]
       });
    }

    // 3. Fetch the rest
    const cashFlow = [];
    const alerts = [];
    const documents = [];
    const projectDocuments = await dbQuery("SELECT * FROM projectDocuments");
    const actions = await dbQuery("SELECT * FROM actions");
    const agents = await dbQuery("SELECT * FROM agents");
    const tasks = await dbQuery("SELECT * FROM tasks");
    // Map real expensetransactions to recent_expenses for the UI
    const db_transactions = await dbQuery("SELECT id, vendor as title, amount, date, category, \"paymentmethod\" FROM expensetransactions ORDER BY date DESC LIMIT 20");
    const recent_expenses = db_transactions;
    const statsRows = [];
    const schedule = await dbQuery("SELECT * FROM schedule");

    const statsObj = {};

    const parsedAgents = agents.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      keyResponsibility: a.keyresponsibility,
      currentTask: a.currenttask,
      recentActivity: a.recentactivity,
      workloadProgress: a.workloadprogress,
      avatarColor: a.avatarcolor
    }));

    const parsedActions = actions.map(a => ({
      id: a.id,
      priorityOrder: a.priorityorder,
      title: a.title,
      project: a.project,
      priorityLevel: a.prioritylevel,
      suggestedAgent: a.suggestedagent,
      status: a.status,
      notes: a.notes,
      category: a.category
    }));
    statsRows.forEach(row => {
      statsObj[row.key] = JSON.parse(row.value);
    });

    res.json({
      dashboard: statsObj.dashboard || {},
      projects: parsedProjects,
      cashFlow,
      expenses: finalExpenses,
      alerts,
      documents: [],
      projectDocuments,
      actions: parsedActions,
      agents: parsedAgents,
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

// ==========================================
// TRAM ANH & MULTI-AGENT API SUITE (PHASE 2)
// ==========================================

// 1. Memory & Profiles
app.get('/api/agent/router', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'agent_prompts', 'router_cloud.md');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ content });
    } else {
      res.status(404).json({ error: 'Router not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agent/:id/profile', async (req, res) => {
  try {
    const agentId = req.params.id;
    let fileName = '';
    if (agentId === 'tram_anh') fileName = 'tram_anh_sop.md';
    else if (agentId === 'minh_thu') fileName = 'minh_thu_guideline.md';
    else if (agentId === 'quoc_bao') fileName = 'quoc_bao_guideline.md';
    else if (agentId === 'minh_dan') fileName = 'minh_dan_guideline.md';
    else if (agentId === 'chi_hai') fileName = 'chi_hai_guideline.md';
    
    if (!fileName) return res.status(404).json({ error: 'Agent profile not found' });
    
    const filePath = path.join(__dirname, 'agent_prompts', fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ system_prompt: content });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agent/:id/history', async (req, res) => {
  try {
    const history = await dbQuery("SELECT * FROM chat_history WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10", [req.params.id]);
    res.json(history.reverse()); // Return in chronological order
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/:id/history', async (req, res) => {
  try {
    const { role, content } = req.body;
    await dbRun("INSERT INTO chat_history (agent_id, role, content) VALUES (?, ?, ?)", [req.params.id, role, content]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/agent/:id/history', async (req, res) => {
  try {
    await dbRun("DELETE FROM chat_history WHERE agent_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Project Management & Reporting
app.get('/api/projects/active', async (req, res) => {
  try {
    const activeProjects = await dbQuery("SELECT * FROM projects WHERE status != 'Completed' AND status != 'Archived'");
    res.json(activeProjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/sow', async (req, res) => {
  try {
    const docs = await dbQuery("SELECT name, status, priorityLevel FROM documents WHERE project = ? AND type = 'SOW'", [req.params.id]);
    res.json(docs.length > 0 ? docs[0] : { summary: "No SOW found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });
    
    // Dynamic update builder
    let query = "UPDATE projects SET ";
    let values = [];
    for (const [key, val] of Object.entries(updates)) {
      // Lowercase key because postgres columns were created without quotes (case folded to lower)
      const colName = key.toLowerCase();
      // Ignore some camelCase props that aren't columns or should be skipped
      if (['projectname', 'totalexpenses'].includes(colName)) continue;
      
      query += `"${colName}" = ?, `;
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
    // Remove last comma and space
    query = query.slice(0, -2) + ` WHERE id = ?`;
    values.push(req.params.id);
    
    await dbRun(query, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Scheduling & Orchestration
app.patch('/api/projectdocuments/:projectId', async (req, res) => {
  try {
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });
    
    let query = "UPDATE projectdocuments SET ";
    let values = [];
    for (const [key, val] of Object.entries(updates)) {
      query += `"${key}" = ?, `;
      values.push(val);
    }
    query = query.slice(0, -2) + ` WHERE projectid = ?`;
    values.push(req.params.projectId);
    
    await dbRun(query, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule API
app.post('/api/schedule', async (req, res) => {
  try {
    const { id, title, description, startTime, endTime, date, category, priority, status, owner, agent, projectId } = req.body;
    await dbRun(`INSERT INTO schedule (id, title, description, "startTime", "endTime", date, category, priority, status, owner, agent, "projectId") 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                 [id, title, description, startTime, endTime, date, category, priority, status, owner, agent, projectId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/schedule/:id', async (req, res) => {
  try {
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });
    
    let query = "UPDATE schedule SET ";
    let values = [];
    for (const [key, val] of Object.entries(updates)) {
      query += `"${key}" = ?, `;
      values.push(val);
    }
    query = query.slice(0, -2) + ` WHERE id = ?`;
    values.push(req.params.id);
    
    await dbRun(query, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedule/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM schedule WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/actions', async (req, res) => {
  try {
    const { id, title, project, priorityLevel, suggestedAgent, priorityOrder, status, notes } = req.body;
    const actionId = id || `ACT-${Date.now()}`;
    await dbRun(`INSERT INTO actions (id, title, project, "priorityLevel", "suggestedAgent", "priorityOrder", status, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                 [actionId, title, project, priorityLevel, suggestedAgent, priorityOrder || 0, status || 'Pending', notes]);
    res.json({ success: true, id: actionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/actions/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM actions WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents/invoke', async (req, res) => {
  try {
    const { target, task } = req.body;
    console.log(`[ORCHESTRATION] Agent invoked! Target: ${target}, Task: ${task}`);
    await dbRun("INSERT INTO chat_history (agent_id, role, content) VALUES (?, 'system', ?)", [target, `[SYSTEM EVENT] You have been invoked with task: ${task}`]);
    res.json({ success: true, message: `Invoked ${target} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================

// AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { history, agentName, agentRole } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "Chưa cấu hình GEMINI_API_KEY trong file .env trên server." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Dynamically load System Prompt
    let fileName = '';
    if (agentName.includes('Trâm Anh')) fileName = 'tram_anh_sop.md';
    else if (agentName.includes('Minh Thư')) fileName = 'minh_thu_guideline.md';
    else if (agentName.includes('Quốc Bảo')) fileName = 'quoc_bao_guideline.md';
    else if (agentName.includes('Minh Đan')) fileName = 'minh_dan_guideline.md';
    else if (agentName.includes('Chí Hải')) fileName = 'chi_hai_guideline.md';

    let systemInstruction = `Bạn là ${agentName} tại An Phim Workspace. Vai trò của bạn là: ${agentRole}.`;
    if (fileName) {
      const filePath = path.join(__dirname, 'agent_prompts', fileName);
      if (fs.existsSync(filePath)) {
         systemInstruction += "\n\n" + fs.readFileSync(filePath, 'utf8');
      }
    }

    const formattedContents = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Dynamic Tools Configuration
    let functionDeclarations = [];

    // MINH THU TOOLS
    if (agentName.includes('Minh Thư')) {
       functionDeclarations.push({
          name: "record_income_phase",
          description: "Ghi nhận khách hàng đã thanh toán đợt X cho dự án.",
          parameters: {
            type: "OBJECT",
            properties: {
              projectName: { type: "STRING" },
              phaseNumber: { type: "INTEGER" }
            },
            required: ["projectName", "phaseNumber"]
          }
       });
    }

    // TRAM ANH TOOLS
    if (agentName.includes('Trâm Anh')) {
       functionDeclarations.push({
          name: "get_active_projects",
          description: "Lấy báo cáo tổng thể tất cả dự án đang chạy.",
          parameters: { type: "OBJECT", properties: {} }
       });
       functionDeclarations.push({
          name: "patch_project",
          description: "Cập nhật thông tin dự án (đổi tên, trạng thái, milestone).",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              updates: { type: "OBJECT", description: "Các trường cần cập nhật ví dụ {'status': 'Pending'}" }
            },
            required: ["id", "updates"]
          }
       });
       functionDeclarations.push({
          name: "create_action",
          description: "Tạo lịch họp, công việc, to-do list cho Sếp.",
          parameters: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              notes: { type: "STRING" }
            },
            required: ["title"]
          }
       });
       functionDeclarations.push({
          name: "invoke_agent",
          description: "Giao việc cho Agent khác (vd: 'minh_thu', 'quoc_bao').",
          parameters: {
            type: "OBJECT",
            properties: {
              target: { type: "STRING" },
              task: { type: "STRING" }
            },
            required: ["target", "task"]
          }
       });
    }

    // Shared Tool
    functionDeclarations.push({
       name: "read_project_document",
       description: "Tìm và đọc nội dung file văn bản (.md) của một dự án.",
       parameters: {
         type: "OBJECT",
         properties: { keyword: { type: "STRING" } },
         required: ["keyword"]
       }
    });

    const tools = [{ functionDeclarations }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
      }
    });

    let functionCalls = response.functionCalls;
    let finalReply = response.text;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let functionResponseText = "";
      
      try {
        if (call.name === 'get_active_projects') {
          const activeProjects = await dbQuery("SELECT id, name, status, nextAction FROM projects WHERE status != 'Completed' AND status != 'Archived'");
          functionResponseText = JSON.stringify(activeProjects);
        } else if (call.name === 'patch_project') {
          const { id, updates } = call.args;
          let query = "UPDATE projects SET ";
          let values = [];
          for (const [key, val] of Object.entries(updates)) {
            query += `"${key}" = ?, `;
            values.push(typeof val === 'object' ? JSON.stringify(val) : val);
          }
          query = query.slice(0, -2) + ` WHERE id = ?`;
          values.push(id);
          await dbRun(query, values);
          functionResponseText = "Cập nhật dự án thành công.";
        } else if (call.name === 'create_action') {
          const { title, notes } = call.args;
          const actId = `ACT-${Date.now()}`;
          await dbRun(`INSERT INTO actions (id, title, status, notes) VALUES (?, ?, 'Pending', ?)`, [actId, title, notes]);
          functionResponseText = `Đã lưu lịch/task thành công với ID: ${actId}`;
        } else if (call.name === 'invoke_agent') {
          const { target, task } = call.args;
          await dbRun("INSERT INTO chat_history (agent_id, role, content) VALUES (?, 'system', ?)", [target, `[SYSTEM EVENT] Được giao nhiệm vụ: ${task}`]);
          functionResponseText = `Đã chuyển task cho ${target} thành công.`;
        } else if (call.name === 'record_income_phase') {
          // Keep minimal logic for Minh Thu compatibility
          functionResponseText = "Income recorded (mock for now in new endpoint).";
        } else if (call.name === 'read_project_document') {
          functionResponseText = "Doc read simulated.";
        }
      } catch (e) {
        functionResponseText = `Lỗi hệ thống: ${e.message}`;
      }
      
      // Second call to Gemini with tool response
      formattedContents.push({ role: 'model', parts: [{ functionCall: call }] });
      formattedContents.push({
        role: 'user',
        parts: [{ functionResponse: { name: call.name, response: { result: functionResponseText } } }]
      });
      
      const response2 = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: { systemInstruction, tools }
      });
      finalReply = response2.text;
    }

    res.json({ reply: finalReply || "Đã xử lý xong." });

  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: "Lỗi nội bộ server: " + err.message });
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

// Trigger restart for API key

// Trigger restart for new API key
