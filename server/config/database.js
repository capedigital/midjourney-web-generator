const { Pool } = require('pg');

// Configure SSL for Railway
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = isProduction ? {
    rejectUnauthorized: false
} : false;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
});

module.exports = pool;
