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
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('railway') 
            ? { rejectUnauthorized: false }
            : false
    });

    try {
        console.log('🔄 Running database migrations...');
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Database migrations completed!');
        await pool.end();
    } catch (err) {
        // If tables already exist, that's fine
        if (err.message.includes('already exists')) {
            console.log('✅ Database tables already exist');
        } else {
            console.error('⚠️  Migration warning:', err.message);
        }
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
