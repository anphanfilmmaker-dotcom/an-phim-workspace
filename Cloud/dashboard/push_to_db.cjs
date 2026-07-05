const { execSync } = require('child_process');
const { Client } = require('pg');

const dataStr = execSync('python read_excel_json.py', { encoding: 'utf-8' });
const data = JSON.parse(dataStr);

const client = new Client({ connectionString: 'postgresql://postgres:jJ7O7ejunRzIWIit@db.puewflzmyqoshiccjkcw.supabase.co:5432/postgres' });

async function run() {
    await client.connect();
    
    // Fetch projects mapping
    const projRes = await client.query('SELECT id, name FROM projects');
    const projectMap = {};
    for (const p of projRes.rows) {
        projectMap[p.name.trim().toLowerCase()] = p.id;
    }

    for (const item of data) {
        const pNameKey = item.project ? item.project.trim().toLowerCase() : '';
        const projectId = projectMap[pNameKey] || null;

        await client.query(`
            INSERT INTO expensetransactions
            (id, date, vendor, amount, project, projectid, category, "paymentmethod", description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
            vendor = EXCLUDED.vendor, amount = EXCLUDED.amount, project = EXCLUDED.project,
            projectid = EXCLUDED.projectid,
            category = EXCLUDED.category, "paymentmethod" = EXCLUDED."paymentmethod", description = EXCLUDED.description
        `, [item.id, item.date, item.vendor, item.amount, item.project, projectId, item.category, item.paymentMethod, item.description]);
    }
    console.log(`Successfully pushed ${data.length} records to Postgres!`);
    await client.end();
}
run();
