#!/usr/bin/env node
/**
 * Run AI Preferences Migration
 * Adds preferred_ai_model and target_platform columns to users table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🔄 Running AI preferences migration...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_ai_preferences.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    const result = await pool.query(migrationSQL);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nColumns added:');
    
    // Show the result
    if (result[result.length - 1].rows) {
      result[result.length - 1].rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
