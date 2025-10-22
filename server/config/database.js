const { Pool } = require('pg');

// Railway databases require SSL with rejectUnauthorized: false
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

module.exports = pool;
