/**
 * Validate required environment variables on startup
 */

const requiredEnvVars = [
    'JWT_SECRET',
    'OPENROUTER_API_KEY'
];

const optionalEnvVars = [
    'DATABASE_URL',
    'PORT',
    'NODE_ENV',
    'FRONTEND_URL'
];

function validateEnv() {
    const missing = [];
    const warnings = [];

    // Check required variables
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    // Check optional but recommended variables
    for (const varName of optionalEnvVars) {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    }

    // Report missing required variables
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\n💡 Please create a .env file with these variables');
        console.error('   See .env.example for reference\n');
        process.exit(1);
    }

    // Report optional missing variables (only in development)
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Optional environment variables not set:');
        warnings.forEach(varName => {
            console.warn(`   - ${varName}`);
        });
        console.warn('');
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
    }

    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
        console.warn(`⚠️  NODE_ENV="${nodeEnv}" is not standard (use development/production/test)`);
    }

    // Validate DATABASE_URL format if present
    if (process.env.DATABASE_URL) {
        try {
            const url = new URL(process.env.DATABASE_URL);
            if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
                console.warn('⚠️  DATABASE_URL should start with postgres:// or postgresql://');
            }
        } catch (err) {
            console.error('❌ DATABASE_URL format is invalid');
            process.exit(1);
        }
    }

    console.log('✅ Environment variables validated');
}

/**
 * Get configuration from environment
 */
function getConfig() {
    return {
        port: parseInt(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        jwtSecret: process.env.JWT_SECRET,
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        databaseUrl: process.env.DATABASE_URL,
        frontendUrl: process.env.FRONTEND_URL || '*',
    };
}

module.exports = {
    validateEnv,
    getConfig
};
