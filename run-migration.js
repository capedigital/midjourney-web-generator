const { pool } = require('./server/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const migrationPath = path.join(__dirname, 'server/migrations/002_add_discord_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    try {
        await pool.query(sql);
        console.log('✅ Migration completed: Discord columns added');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
