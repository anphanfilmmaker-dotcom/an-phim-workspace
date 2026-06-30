const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pgClient.connect();
  const res = await pgClient.query('SELECT projectid, projectname, vatr1_link, quote_link, contract_link, liquidation_link FROM projectdocuments');
  const projects = res.rows;
  
  for (const p of projects) {
    const updateLinks = {};
    
    // Function to convert local path to an HTTPS Google Drive Search Link
    const toHttpsLink = (localPath) => {
      if (!localPath) return null;
      if (localPath.startsWith('https:')) return localPath; // already converted
      const basename = path.basename(localPath);
      // Create a search query for the exact filename
      return `https://drive.google.com/drive/search?q=${encodeURIComponent('"' + basename + '"')}`;
    };

    const newVat = toHttpsLink(p.vatr1_link);
    const newQuote = toHttpsLink(p.quote_link);
    const newContract = toHttpsLink(p.contract_link);
    const newLiquidation = toHttpsLink(p.liquidation_link);
    
    await pgClient.query(`
      UPDATE projectdocuments 
      SET 
        vatr1_link = $1, vatr2_link = $1, vatr3_link = $1,
        quote_link = $2, contract_link = $3, liquidation_link = $4
      WHERE projectid = $5
    `, [newVat, newQuote, newContract, newLiquidation, p.projectid]);
  }
  
  console.log("Converted all document links to HTTPS Google Drive Search links.");
  await pgClient.end();
}

run();
