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
    // We look in documents where project equals project id and type is SOW
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
      query += `"${key}" = ?, `;
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
    query = query.slice(0, -2) + ` WHERE id = ?`;
    values.push(req.params.id);
    
    await dbRun(query, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Scheduling & Orchestration
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
