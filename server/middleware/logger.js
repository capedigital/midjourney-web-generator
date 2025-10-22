/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    console.log(`➡️  ${req.method} ${req.url}`, {
        ip: req.ip,
        user: req.user?.id,
        query: Object.keys(req.query).length > 0 ? req.query : undefined
    });

    // Log response when it's finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const emoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
        
        console.log(`${emoji} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
}

/**
 * Performance monitoring middleware
 */
function performanceMonitor(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Warn about slow requests
        if (duration > 3000) {
            console.warn(`🐌 Slow request: ${req.method} ${req.url} took ${duration}ms`);
        }
    });

    next();
}

/**
 * Simple rate limiting (in-memory)
 * For production, use redis-based rate limiting
 */
const rateLimitStore = new Map();

function rateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,
        message = 'Too many requests, please try again later'
    } = options;

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        
        // Clean up old entries
        if (Math.random() < 0.01) { // Cleanup 1% of requests
            for (const [ip, data] of rateLimitStore.entries()) {
                if (now - data.resetTime > windowMs) {
                    rateLimitStore.delete(ip);
                }
            }
        }

        // Get or create rate limit data
        let rateLimitData = rateLimitStore.get(key);
        
        if (!rateLimitData || now > rateLimitData.resetTime) {
            rateLimitData = {
                count: 0,
                resetTime: now + windowMs
            };
            rateLimitStore.set(key, rateLimitData);
        }

        rateLimitData.count++;

        // Check if limit exceeded
        if (rateLimitData.count > maxRequests) {
            const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
            res.set('Retry-After', retryAfter);
            return res.status(429).json({
                success: false,
                error: message,
                retryAfter
            });
        }

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': maxRequests - rateLimitData.count,
            'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
        });

        next();
    };
}

module.exports = {
    requestLogger,
    performanceMonitor,
    rateLimit
};
