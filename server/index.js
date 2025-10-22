const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-run database migration on startup
async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL;
    const isRailwayInternal = databaseUrl?.includes('railway.internal');
    const sslConfig = isRailwayInternal ? false : { rejectUnauthorized: false };
    
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: sslConfig
    });

    let client;
    try {
        console.log('🔄 Running database migrations...');
        client = await pool.connect();
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await client.query(schema);
        console.log('✅ Database migrations completed!');
    } catch (err) {
        // If tables already exist, that's fine
        if (err.message.includes('already exists')) {
            console.log('✅ Database tables already exist');
        } else {
            console.error('⚠️  Migration warning:', err.message);
        }
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // For image uploads
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/templates', require('./routes/templates'));

// Health check for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server after running migrations
runMigrations().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
});
