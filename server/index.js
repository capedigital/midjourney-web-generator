const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import configuration and middleware
const { validateEnv, getConfig } = require('./config/env');
const { testConnection, pool } = require('./config/database');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { requestLogger, performanceMonitor, rateLimit } = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/auth');
const promptsRoutes = require('./routes/prompts');
const templatesRoutes = require('./routes/templates');

// Validate environment variables
validateEnv();
const config = getConfig();

// Initialize Express app
const app = express();

// Auto-run database migration on startup (only if needed)
async function runMigrations() {
    if (!config.databaseUrl) {
        return; // Silent skip in dev
    }

    const { Pool } = require('pg');
    const migrationPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: false
    });

    let client;
    try {
        client = await migrationPool.connect();
        
        // Check if migrations are needed by testing for a key table
        const checkResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (checkResult.rows[0].exists) {
            // Tables exist, skip migrations
            return;
        }
        
        // Run main schema first
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await client.query(schema);
        
        // Run all migration files in the migrations directory
        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .sort();
            
            for (const file of migrationFiles) {
                const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await client.query(migration);
            }
        }
        
        if (config.isDevelopment) {
            console.log('✅ Database initialized');
        }
    } catch (err) {
        // Silent fail - tables likely exist
        if (config.isDevelopment && !err.message?.includes('already exists')) {
            console.error('Migration error:', err.message);
        }
    } finally {
        if (client) client.release();
        await migrationPool.end();
    }
}

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Core middleware
app.use(cors({
    origin: config.frontendUrl,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging and performance monitoring
if (config.isDevelopment) {
    app.use(requestLogger);
    app.use(performanceMonitor);
}

// Rate limiting for API routes (more generous limits for development)
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // Increased from 100 to 500
    message: 'Too many requests from this IP, please try again later'
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
    const dbHealthy = await testConnection();
    
    res.json({
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date(),
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'disconnected',
        environment: config.nodeEnv
    });
}));

// Import AI routes
const aiRoutes = require('./routes/ai');
const openrouterRoutes = require('./routes/openrouter');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/openrouter', openrouterRoutes);

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({
            success: false,
            error: 'Frontend not found. Please build the frontend first.'
        });
    }
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        // Test database connection and run migrations if needed
        if (config.databaseUrl) {
            await testConnection();
            await runMigrations();
        }
        
        // Start Express server
        app.listen(config.port, () => {
            if (config.isProduction) {
                console.log(`Server running (${config.nodeEnv})`);
            } else {
                console.log(`\n✅ http://localhost:${config.port}\n`);
            }
        });
    } catch (err) {
        console.error('Failed to start:', err.message);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
