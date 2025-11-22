require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');

const config = {
  server: 'tamedogsql1763753037.database.windows.net',
  database: 'tamedog',
  user: 'sqladmin',
  password: 'TameDog2025Secure!',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected successfully!');
    
    const schema = fs.readFileSync('server/schema.sql', 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await pool.request().query(statement);
      }
    }
    
    console.log('Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setupDatabase();
