const { Pool } = require('pg');

// Configure SSL for Railway
// Railway internal network doesn't need SSL, external connections do
const databaseUrl = process.env.DATABASE_URL;
const isRailwayInternal = databaseUrl?.includes('railway.internal');
const sslConfig = isRailwayInternal ? false : {
    rejectUnauthorized: false
};

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig
});

module.exports = pool;
