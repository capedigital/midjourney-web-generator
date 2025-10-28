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
const midjourneyRoutes = require('./routes/midjourney');
const ideogramRoutes = require('./routes/ideogram');

// Validate environment variables
validateEnv();
const config = getConfig();

// Initialize Express app
const app = express();

// Auto-run database migration on startup
async function runMigrations() {
    if (!config.databaseUrl) {
        console.log('⚠️  No DATABASE_URL found, skipping migrations');
        return;
    }

    const { Pool } = require('pg');
    const migrationPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: false
    });

    let client;
    try {
        console.log('🔄 Running database migrations...');
        client = await migrationPool.connect();
        
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await client.query(schema);
        
        console.log('✅ Database migrations completed successfully!');
    } catch (err) {
        if (err.message && err.message.includes('already exists')) {
            console.log('✅ Database tables already exist');
        } else {
            console.error('⚠️  Migration error:', err.message || err);
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

// Rate limiting for API routes
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/midjourney', midjourneyRoutes);
app.use('/api/ideogram', ideogramRoutes);

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
        if (config.isDevelopment) {
            console.log('\n🚀 Starting Midjourney Generator Web App...\n');
        }
        
        // Test database connection
        if (config.databaseUrl) {
            await testConnection();
            
            // Run migrations
            await runMigrations();
        } else {
            console.warn('⚠️  Running without database connection');
        }
        
        // Start Express server
        app.listen(config.port, () => {
            if (config.isProduction) {
                console.log(`✅ Server running on port ${config.port} (${config.nodeEnv})`);
            } else {
                console.log('\n✅ Server started successfully!');
                console.log(`📡 Server running on port ${config.port}`);
                console.log(`📊 Environment: ${config.nodeEnv}`);
                console.log(`🌐 API: http://localhost:${config.port}/api`);
                console.log(`💚 Health: http://localhost:${config.port}/health\n`);
            }
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
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
