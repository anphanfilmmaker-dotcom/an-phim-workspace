const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET || 'anphim-secret-key-2026');

fetch('http://localhost:5000/api/db', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error("API ERROR:", data);
  } else {
    console.log("Projects:", data.projects ? data.projects.length : 'undefined');
    console.log("Actions:", data.actions ? data.actions.length : 'undefined');
    console.log("Agents:", data.agents ? data.agents.length : 'undefined');
    console.log("Schedule:", data.schedule ? data.schedule.length : 'undefined');
  }
})
.catch(err => console.error("Fetch failed", err));
