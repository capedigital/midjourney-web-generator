# Security Logging System

## Overview

This application uses an environment-aware logging system that protects production deployments from exposing sensitive information while maintaining comprehensive debugging capabilities in development.

## How It Works

### Automatic Detection

The logger automatically detects the environment:

- **Development Mode**: `localhost`, `127.0.0.1`, or port `3000`
- **Production Mode**: All other domains (e.g., Railway deployments)

### Logging Levels

| Method | Development | Production | Use For |
|--------|------------|------------|---------|
| `logger.debug()` | ✅ Shown | ❌ Hidden | Debug information, flow tracking |
| `logger.info()` | ✅ Shown | ❌ Hidden | Informational messages |
| `logger.warn()` | ✅ Shown | ✅ Shown | Warnings that don't stop execution |
| `logger.error()` | ✅ Shown | ✅ Shown | Critical errors |

### Sensitive Data Protection

The `logger.sanitize()` and `logger.debugSafe()` methods automatically mask:

- **JWT Tokens**: `eyJ...` → `***TOKEN***`
- **API Keys**: `sk-or-v1-...` → `***API_KEY***`
- **Passwords**: `"password":"xyz"` → `"password":"***"`

## Usage Examples

### Basic Logging

```javascript
// Development: Shows in console
// Production: Silent
logger.debug('User clicked button');
logger.info('Module initialized');

// Always shown (use sparingly!)
logger.warn('API response slow');
logger.error('Failed to fetch data:', error);
```

### Sensitive Data

```javascript
// ❌ NEVER do this - exposes token!
console.log('API token:', localStorage.getItem('token'));

// ✅ Use this instead (sanitizes automatically)
logger.debugSafe('Auth data:', JSON.stringify({
    token: localStorage.getItem('token')
}));
```

### Conditional Logging

```javascript
if (logger.isDebugMode()) {
    // Only runs in development
    logger.debug('Complex object:', JSON.stringify(data, null, 2));
}
```

## Runtime Control

### Toggle Debug Mode

Open browser console and type:

```javascript
toggleDebug()  // Enables/disables debug logging
```

This setting persists in localStorage until page reload.

### Check Current Mode

```javascript
logger.isDebugMode()  // Returns true/false
```

## Security Benefits

1. **No Code Exposure**: Production users can't see internal function names, data structures, or logic flow
2. **Token Protection**: JWT tokens never appear in production console (even if accidentally logged)
3. **API Key Safety**: OpenRouter keys are masked if logged
4. **Attack Surface Reduction**: Attackers can't use console logs to understand app architecture

## Migration Guide

### Converting Existing Code

**Before:**
```javascript
console.log('App initializing...');
console.log('API token:', token);
```

**After:**
```javascript
logger.debug('App initializing...');
// Never log tokens directly - use debugSafe if needed
logger.debugSafe('Auth check:', { hasToken: !!token });
```

### Files Updated

- ✅ `public/js/app.js` - Application initialization
- ✅ `public/js/ai-chat.js` - AI Chat module initialization
- ✅ `public/js/diagnostic.js` - Diagnostic tools (dev-only)
- ✅ `public/js/ipc-adapter.js` - IPC shim layer
- ⏳ `public/js/global-model-sync.js` - Model synchronization
- ⏳ `public/js/prompt-importer.js` - Prompt import feature
- ⏳ `public/js/auth-manager.js` - Authentication utilities

### Remaining Work

To complete the migration, update these files:

1. Replace all `console.log()` with `logger.debug()`
2. Replace all `console.info()` with `logger.info()`
3. Keep `console.error()` as is (or use `logger.error()`)
4. Keep `console.warn()` as is (or use `logger.warn()`)

## Best Practices

### ✅ DO

- Use `logger.debug()` for development-only information
- Use `logger.error()` for actual errors that need attention
- Use `logger.debugSafe()` when dealing with auth data
- Check `isDebugMode()` before expensive string operations

### ❌ DON'T

- Log JWT tokens, API keys, or passwords
- Use `console.log()` directly (bypasses security)
- Log user email addresses or personal data
- Put debug statements in hot code paths without conditionals

## Testing

### Development Environment

1. Open app on `http://localhost:3000`
2. Check console - should see `[Logger] Development mode: true`
3. Should see all debug messages

### Production Simulation

1. Set debug mode off: `logger.setDebugMode(false)`
2. Reload page
3. Console should be clean (no debug messages)
4. Errors still visible

### Production Environment

1. Deploy to Railway (or other production host)
2. Open browser console
3. Should see minimal/no debug output
4. Application functions normally

## Environment Variables

The logger uses client-side detection only (no environment variables needed):

```javascript
// Automatically detects:
window.location.hostname === 'localhost'     // Dev
window.location.hostname === '127.0.0.1'     // Dev  
window.location.port === '3000'              // Dev
// Everything else                           // Production
```

## Troubleshooting

### Debug logs not showing

1. Check you're on localhost: `window.location.hostname`
2. Check debug mode: `logger.isDebugMode()`
3. Enable manually: `logger.setDebugMode(true)`

### Too many logs in development

1. Disable diagnostic.js temporarily
2. Use browser console filters
3. Comment out specific debug statements

### Need logs in production

⚠️ **Not recommended**, but for urgent debugging:

```javascript
// In browser console on production:
logger.setDebugMode(true)
location.reload()
```

## Security Checklist

Before deploying to production:

- [ ] No `console.log()` with sensitive data
- [ ] All debug logging uses `logger.debug()`
- [ ] Tokens/API keys use `logger.debugSafe()`
- [ ] No hardcoded credentials
- [ ] Environment variables set in Railway
- [ ] Test on production URL (logs should be minimal)

## Related Documentation

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [OpenRouter API Security](https://openrouter.ai/docs#security)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
