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
