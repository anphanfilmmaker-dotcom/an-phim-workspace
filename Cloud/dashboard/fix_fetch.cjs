const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const apiFetchDef = `export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('anphim_auth_token');
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }
  return fetch(url, { ...options, headers });
};

type PageId = "overview" | "projects" | "finance" | "agents" | "documents" | "schedule";`;

content = content.replace('type PageId = "overview" | "projects" | "finance" | "agents" | "documents" | "schedule";', apiFetchDef);
content = content.replace(/(?<!return\s)fetch\(/g, 'apiFetch(');

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Replaced fetch successfully!");
