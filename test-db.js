const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:UnCAtUkvpMBOuIdRBZFcAspIPkaJEWwa@switchback.proxy.rlwy.net:34782/railway';

console.log('Testing connection to:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    let client;
    try {
        console.log('Attempting to connect...');
        client = await pool.connect();
        console.log('✅ Connected successfully!');
        
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query successful:', result.rows[0]);
        
        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Full error:', err);
        if (client) client.release();
        await pool.end();
        process.exit(1);
    }
}

testConnection();
