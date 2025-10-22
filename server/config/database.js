const { Pool } = require('pg');

// Database configuration
const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false // Railway/Heroku require this
    } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Wait 10 seconds before timing out
};

// Create pool
const pool = new Pool(config);

// Connection event handlers
pool.on('connect', (client) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('✅ New database client connected');
    }
});

pool.on('acquire', (client) => {
    // Client is checked out from the pool
});

pool.on('remove', (client) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Database client removed from pool');
    }
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected database pool error:', {
        message: err.message,
        code: err.code,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Don't exit process, let error handler deal with it
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
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection verified at', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
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
