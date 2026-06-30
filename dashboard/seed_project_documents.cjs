const { Client } = require('pg');
const rawExcel = require('./src/excelData.json');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pgClient.connect();
    
    // Check if table exists
    console.log("Checking projectdocuments table...");
    
    const mappedProjectDocuments = rawExcel.giayTo ? rawExcel.giayTo.map((g, idx) => {
      const projName = (g["Project Name"] || (rawExcel.projects && rawExcel.projects[idx] ? rawExcel.projects[idx]["Project Name"] : ""));
      if (!projName || projName.toString().trim() === "") return null;
      
      const checkStatus = (val) => typeof val === "string" && val.trim().toLowerCase() === "x";
      
      // Calculate overallStatus just like in frontend or set a default
      return {
        projectid: `proj_v22_${idx}`,
        projectname: projName,
        overallstatus: "N/A", // Default
        quote: checkStatus(g["Báo giá"]),
        contract: checkStatus(g["Hợp đồng"]),
        vatr1: checkStatus(g["VAT R1"]),
        vatr2: checkStatus(g["VAT R2"]),
        vatr3: checkStatus(g["VAT R3"]),
        liquidation: checkStatus(g["BBTL"] || g["BB Thanh Lý"]),
      };
    }).filter(Boolean) : [];

    console.log(`Found ${mappedProjectDocuments.length} project documents to insert.`);

    // Drop and recreate table to ensure clean state and correct columns (based on UI screenshot)
    await pgClient.query('DROP TABLE IF EXISTS projectdocuments CASCADE');
    await pgClient.query(`
      CREATE TABLE projectdocuments (
        projectid VARCHAR(50) PRIMARY KEY,
        projectname VARCHAR(255),
        overallstatus VARCHAR(50),
        quote BOOLEAN,
        contract BOOLEAN,
        vatr1 BOOLEAN,
        vatr2 BOOLEAN,
        vatr3 BOOLEAN,
        liquidation BOOLEAN,
        quote_link TEXT,
        contract_link TEXT,
        vatr1_link TEXT,
        vatr2_link TEXT,
        vatr3_link TEXT,
        liquidation_link TEXT
      )
    `);

    let count = 0;
    for (let doc of mappedProjectDocuments) {
      await pgClient.query(`
        INSERT INTO projectdocuments (
          projectid, projectname, overallstatus, quote, contract, vatr1, vatr2, vatr3, liquidation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        doc.projectid, doc.projectname, doc.overallstatus, doc.quote, doc.contract, doc.vatr1, doc.vatr2, doc.vatr3, doc.liquidation
      ]);
      count++;
    }
    
    console.log(`Successfully inserted ${count} project documents into PostgreSQL!`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pgClient.end();
  }
}

run();
