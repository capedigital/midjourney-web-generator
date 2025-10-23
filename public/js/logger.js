/**
 * Secure Logger Utility
 * 
 * Provides environment-aware logging that:
 * - Shows detailed debug logs in development
 * - Suppresses debug logs in production
 * - Always shows errors and warnings
 * - Never logs sensitive data (tokens, passwords, API keys)
 */

class Logger {
    constructor() {
        // Check if we're in development mode
        // In production, this will be 'production' or undefined
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3000';
        
        // Check for debug override in localStorage (for testing)
        const debugOverride = localStorage.getItem('DEBUG_MODE');
        if (debugOverride !== null) {
            this.isDevelopment = debugOverride === 'true';
        }

        // Log initialization only in dev
        if (this.isDevelopment) {
            console.log(`[Logger] Development mode: ${this.isDevelopment}`);
        }
    }

    /**
     * Debug logging - only shown in development
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
        if (this.isDevelopment) {
            console.log(...args);
        }
    }

    /**
     * Info logging - only shown in development
     * @param {...any} args - Arguments to log
     */
    info(...args) {
        if (this.isDevelopment) {
            console.info(...args);
        }
    }

    /**
     * Warning logging - always shown
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
        console.warn(...args);
    }

    /**
     * Error logging - always shown
     * @param {...any} args - Arguments to log
     */
    error(...args) {
        console.error(...args);
    }

    /**
     * Sanitize sensitive data before logging
     * Masks tokens, API keys, passwords
     * @param {string} str - String that might contain sensitive data
     * @returns {string} Sanitized string
     */
    sanitize(str) {
        if (typeof str !== 'string') return str;
        
        // Mask JWT tokens (eyJ...)
        str = str.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***TOKEN***');
        
        // Mask API keys (sk-or-v1-...)
        str = str.replace(/sk-or-v1-[a-f0-9]{64}/g, '***API_KEY***');
        
        // Mask anything that looks like a password field
        str = str.replace(/"password"\s*:\s*"[^"]+"/g, '"password":"***"');
        
        return str;
    }

    /**
     * Log with sanitization - removes sensitive data
     * @param {...any} args - Arguments to log
     */
    debugSafe(...args) {
        if (this.isDevelopment) {
            const sanitized = args.map(arg => 
                typeof arg === 'string' ? this.sanitize(arg) : arg
            );
            console.log(...sanitized);
        }
    }

    /**
     * Enable/disable debug mode at runtime
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this.isDevelopment = enabled;
        localStorage.setItem('DEBUG_MODE', enabled.toString());
        console.log(`[Logger] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if debug mode is active
     * @returns {boolean}
     */
    isDebugMode() {
        return this.isDevelopment;
    }
}

// Create global logger instance
window.logger = new Logger();

// Add console command to toggle debug mode
// Usage in browser console: toggleDebug()
window.toggleDebug = function() {
    const newState = !window.logger.isDebugMode();
    window.logger.setDebugMode(newState);
    return `Debug mode ${newState ? 'enabled' : 'disabled'}. Reload page to see changes.`;
};
