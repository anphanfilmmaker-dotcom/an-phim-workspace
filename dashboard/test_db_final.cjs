const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:jJ7O7ejunRzIWIit@db.puewflzmyqoshiccjkcw.supabase.co:5432/postgres' }); 
client.connect().then(() => client.query('SELECT * FROM "expensetransactions" ORDER BY date DESC LIMIT 5')).then(res => { 
    console.log(res.rows); 
    client.end(); 
}).catch(e => console.error(e));
