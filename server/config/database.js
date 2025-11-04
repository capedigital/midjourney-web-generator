const { Pool } = require('pg');

// Database configuration
const isLocalDatabase = process.env.DATABASE_URL && 
    (process.env.DATABASE_URL.includes('localhost') || 
     process.env.DATABASE_URL.includes('127.0.0.1') ||
     process.env.DATABASE_URL.includes('::1'));

const config = {
    connectionString: process.env.DATABASE_URL,
    // Only use SSL for remote databases (Railway, Heroku, etc.)
    ssl: process.env.DATABASE_URL && !isLocalDatabase ? {
        rejectUnauthorized: false // Railway/Heroku require this
    } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Wait 10 seconds before timing out
};

// Create pool
const pool = new Pool(config);

// Connection event handlers (silent unless error)
pool.on('error', (err, client) => {
    // Only log critical errors
    if (err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
        console.error('Database error:', err.message);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📊 Closing database pool...');
    await pool.end();
    console.log('✅ Database pool closed');
});

process.on('SIGINT', async () => {
    console.log('📊 Closing database pool...');
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
});

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        return true;
    } catch (err) {
        console.error('Database connection failed:', err.message);
        return false;
    }
}

/**
 * Query helper with automatic error handling
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log slow queries
        if (duration > 1000) {
            console.warn(`🐌 Slow query (${duration}ms):`, {
                text: text.substring(0, 100),
                rows: res.rowCount
            });
        }
        
        return res;
    } catch (err) {
        console.error('❌ Database query error:', {
            message: err.message,
            code: err.code,
            query: text.substring(0, 100)
        });
        throw err;
    }
}

module.exports = {
    pool,
    query,
    testConnection
};
