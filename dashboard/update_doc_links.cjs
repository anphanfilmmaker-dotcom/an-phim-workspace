const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ROOT_DIR = 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs';

// Recursively find all Documents directories
function findDocumentsDirs(dir, dirsList = []) {
  if (!fs.existsSync(dir)) return dirsList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'Documents' || file === '_THÁNG 5' || file === '_THÁNG 6') {
        dirsList.push(fullPath);
      }
      findDocumentsDirs(fullPath, dirsList); // always recurse
    }
  }
  return dirsList;
}

async function run() {
  await pgClient.connect();
  const res = await pgClient.query('SELECT projectid, projectname FROM projectdocuments');
  const projects = res.rows;
  
  const allDocDirs = findDocumentsDirs(ROOT_DIR);
  console.log("Found document dirs:", allDocDirs);

  for (const p of projects) {
    let bestDir = null;
    const pName = p.projectname.toLowerCase();
    
    // Manual mapping or fuzzy match
    for (const dir of allDocDirs) {
      const lowerDir = dir.toLowerCase();
      if (pName.includes('khai son') && lowerDir.includes('ai_khaison')) bestDir = dir;
      else if (pName.includes('atera') && lowerDir.includes('ai_atera')) bestDir = dir;
      else if (pName.includes('đông thăng long') && lowerDir.includes('dong thang long')) bestDir = dir;
      else if (pName.includes('marina') && lowerDir.includes('cát bà - the marina')) bestDir = dir;
      else if (pName.includes('đệ nhất') && lowerDir.includes('đệ nhất pháp sư')) bestDir = dir;
      else if (pName.includes('tháng 5') && lowerDir.includes('_tháng 5')) bestDir = dir;
      else if (pName.includes('tháng 6') && lowerDir.includes('_tháng 6')) bestDir = dir;
    }
    
    if (bestDir) {
      console.log(`Matched ${p.projectname} -> ${bestDir}`);
      
      let quoteLink = null, contractLink = null, liquidationLink = null;
      const vatLink = bestDir; // User said: use folder link for VAT
      
      if (fs.existsSync(bestDir)) {
        const files = fs.readdirSync(bestDir);
        for (const file of files) {
          const lowerFile = file.toLowerCase();
          const fullFilePath = path.join(bestDir, file);
          if (fs.statSync(fullFilePath).isFile()) {
            if (lowerFile.includes('báo giá') || lowerFile.includes('quotation') || lowerFile.includes('bg')) quoteLink = fullFilePath;
            if (lowerFile.includes('hợp đồng') || lowerFile.includes('hddv') || lowerFile.includes('hđdv')) contractLink = fullFilePath;
            if (lowerFile.includes('bbtl') || lowerFile.includes('thanh lý')) liquidationLink = fullFilePath;
          }
        }
      }
      
      await pgClient.query(`
        UPDATE projectdocuments 
        SET 
          vatr1_link = $1, vatr2_link = $1, vatr3_link = $1,
          quote_link = $2, contract_link = $3, liquidation_link = $4
        WHERE projectid = $5
      `, [vatLink, quoteLink, contractLink, liquidationLink, p.projectid]);
      
    } else {
      console.log(`No match found for ${p.projectname}`);
    }
  }
  
  console.log("Updated projectdocuments links.");
  await pgClient.end();
}

run();
