# Server Refactoring - Architecture Documentation

## 🎯 Overview

The server has been completely refactored following modern Node.js/Express best practices with a clean, maintainable architecture.

## 📁 New Project Structure

```
server/
├── index.js                    # Main application entry point
├── config/
│   ├── database.js            # Database connection & pooling
│   └── env.js                 # Environment validation & config
├── middleware/
│   ├── auth.js                # JWT authentication
│   ├── errorHandler.js        # Custom error classes & global handler
│   ├── validation.js          # Request validation schemas
│   └── logger.js              # Request logging & rate limiting
├── controllers/
│   ├── authController.js      # Authentication logic
│   └── promptsController.js   # Prompts business logic
├── services/
│   ├── userService.js         # User database operations
│   └── promptsService.js      # Prompts database operations
├── routes/
│   ├── auth.js                # Auth route definitions
│   ├── prompts.js             # Prompts route definitions
│   └── templates.js           # Templates route definitions
├── models/                     # (Future: database models)
└── utils/
    └── generator.js           # AI prompt generation utility
```

## 🏗️ Architecture Layers

### 1. **Routes Layer** (`routes/`)
- **Responsibility**: Define API endpoints and HTTP methods
- **What it does**: Route registration, apply middleware, call controllers
- **What it doesn't do**: Business logic, database queries

```javascript
// Example: routes/auth.js
router.post('/register', validateBody(schemas.register), authController.register);
router.post('/login', validateBody(schemas.login), authController.login);
```

### 2. **Controllers Layer** (`controllers/`)
- **Responsibility**: Handle HTTP request/response
- **What it does**: Extract request data, call services, send responses
- **What it doesn't do**: Database queries, business logic implementation

```javascript
// Example: controllers/authController.js
register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    const user = await userService.createUser({ email, password, name });
    const token = this.generateToken(user);
    res.status(201).json({ success: true, token, user });
});
```

### 3. **Services Layer** (`services/`)
- **Responsibility**: Business logic and database operations
- **What it does**: Complex operations, data validation, database queries
- **What it doesn't do**: HTTP concerns (req/res handling)

```javascript
// Example: services/userService.js
async createUser({ email, password, name }) {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictError('User already exists');
    const password_hash = await bcrypt.hash(password, 10);
    // ... database insertion
}
```

### 4. **Middleware Layer** (`middleware/`)
- **Responsibility**: Request preprocessing and validation
- **Types**:
  - **Authentication**: JWT token verification
  - **Validation**: Input validation before controllers
  - **Error Handling**: Catch and format all errors
  - **Logging**: Request/response logging

## 🔒 Error Handling

### Custom Error Classes
```javascript
// All extend AppError with status codes
ValidationError      // 400 - Bad input
AuthenticationError  // 401 - Not authenticated
AuthorizationError   // 403 - Not authorized
NotFoundError        // 404 - Resource not found
ConflictError        // 409 - Resource conflict
```

### Usage in Services
```javascript
if (!user) {
    throw new NotFoundError('User not found');
}
```

### Global Error Handler
Catches all errors and sends consistent JSON responses:
```json
{
    "success": false,
    "error": "User not found",
    "stack": "..." // Only in development
}
```

## ✅ Request Validation

### Schema-Based Validation
```javascript
const schemas = {
    register: {
        email: {
            required: true,
            type: 'string',
            email: true,
            maxLength: 255
        },
        password: {
            required: true,
            type: 'string',
            minLength: 8,
            maxLength: 100
        }
    }
};
```

### Applied at Route Level
```javascript
router.post('/register', validateBody(schemas.register), authController.register);
```

## 📊 Database Layer

### Connection Pooling
- Max 20 connections
- Automatic reconnection
- Graceful shutdown on SIGTERM/SIGINT
- Query performance monitoring

### Service Pattern
All database operations are encapsulated in services:
- `userService.js` - User CRUD operations
- `promptsService.js` - Prompts CRUD operations

## 🔐 Authentication Flow

1. **Login Request** → `POST /api/auth/login`
2. **Validation** → `validateBody(schemas.login)`
3. **Controller** → `authController.login`
4. **Service** → `userService.verifyCredentials()`
5. **Token Generation** → JWT with 30-day expiry
6. **Response** → `{ success, token, user }`

### Protected Routes
```javascript
router.get('/profile', auth, authController.getProfile);
```

The `auth` middleware:
1. Extracts JWT from `Authorization: Bearer <token>`
2. Verifies token signature
3. Attaches `req.user` with decoded payload
4. Throws `AuthenticationError` if invalid

## 📝 Logging & Monitoring

### Request Logging (Development)
```
➡️  POST /api/auth/login { ip: '127.0.0.1', query: {} }
✅ POST /api/auth/login - 200 (45ms)
```

### Performance Monitoring
Warns about slow queries (>1000ms) and slow requests (>3000ms)

### Rate Limiting
- 100 requests per 15 minutes per IP
- Returns `429 Too Many Requests` with `Retry-After` header

## 🚀 New API Endpoints

### Auth Endpoints
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/change-password` - Change password (protected)
- `POST /api/auth/logout` - Logout (protected)
- `GET /api/auth/verify` - Verify token (protected)

### Prompts Endpoints
- `POST /api/prompts/generate` - Generate prompts (protected)
- `GET /api/prompts/session/:id` - Get session (public for Claude)
- `GET /api/prompts/history` - Get history (protected)
- `GET /api/prompts/recent` - Get recent sessions (protected)
- `GET /api/prompts/search?q=text` - Search sessions (protected)
- `GET /api/prompts/stats` - Get stats (protected)
- `PUT /api/prompts/session/:id` - Update session (protected)
- `DELETE /api/prompts/session/:id` - Delete session (protected)
- `GET /api/prompts/admin/model-stats` - Model statistics (admin)

## 🔧 Configuration

### Environment Variables
Validated on startup:

**Required:**
- `JWT_SECRET` - Secret key for JWT signing (min 32 chars)
- `OPENROUTER_API_KEY` - OpenRouter API key

**Optional:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - CORS origin (default: *)

### Health Check
`GET /health` returns:
```json
{
    "status": "ok",
    "timestamp": "2025-10-22T...",
    "uptime": 1234.56,
    "database": "connected",
    "environment": "development"
}
```

## 🎯 Benefits of Refactoring

### 1. **Separation of Concerns**
- Routes handle routing
- Controllers handle HTTP
- Services handle business logic
- Clear boundaries between layers

### 2. **Maintainability**
- Easy to find and fix bugs
- Each file has a single responsibility
- Consistent patterns throughout

### 3. **Testability**
- Services can be tested independently
- Controllers can be tested with mocked services
- Routes can be tested with supertest

### 4. **Scalability**
- Easy to add new endpoints
- Easy to add new features
- Database connection pooling

### 5. **Security**
- Input validation on all routes
- Proper error handling (no stack leaks in production)
- Rate limiting
- JWT token expiry

### 6. **Developer Experience**
- Clear error messages
- Request/response logging
- Performance monitoring
- Environment validation

## 🧪 Testing Strategy (Future)

### Unit Tests
```javascript
// Test services in isolation
test('userService.createUser should hash password', async () => {
    const user = await userService.createUser({
        email: 'test@example.com',
        password: 'password123'
    });
    expect(user.password_hash).not.toBe('password123');
});
```

### Integration Tests
```javascript
// Test API endpoints
test('POST /api/auth/register should create user', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
});
```

## 📚 Code Examples

### Adding a New Endpoint

1. **Add Service Method** (`services/userService.js`)
```javascript
async getUserStats(userId) {
    const result = await pool.query(
        'SELECT COUNT(*) as total FROM prompt_sessions WHERE user_id = $1',
        [userId]
    );
    return result.rows[0];
}
```

2. **Add Controller Method** (`controllers/authController.js`)
```javascript
getStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats(req.user.id);
    res.json({ success: true, stats });
});
```

3. **Add Route** (`routes/auth.js`)
```javascript
router.get('/stats', auth, authController.getStats);
```

### Adding Validation
```javascript
// In middleware/validation.js
const schemas = {
    updateProfile: {
        username: {
            required: false,
            type: 'string',
            minLength: 3,
            maxLength: 50
        }
    }
};

// In routes
router.put('/profile', 
    auth, 
    validateBody(schemas.updateProfile), 
    authController.updateProfile
);
```

## 🔄 Migration Guide

### Before (Old Code)
```javascript
// Everything in one file
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        // ... more logic
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
```

### After (New Code)
```javascript
// Route
router.post('/register', validateBody(schemas.register), authController.register);

// Controller
register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    const user = await userService.createUser({ email, password, name });
    const token = this.generateToken(user);
    res.status(201).json({ success: true, token, user });
});

// Service
async createUser({ email, password, name }) {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictError('User already exists');
    // ... database logic
}
```

## 🎓 Best Practices Implemented

✅ **Async error handling** - asyncHandler wrapper catches all errors  
✅ **Input validation** - Schema-based validation before controllers  
✅ **Database pooling** - Efficient connection management  
✅ **Security** - bcrypt, JWT, rate limiting, input sanitization  
✅ **Logging** - Structured logging with emojis for visibility  
✅ **Error handling** - Custom error classes with proper status codes  
✅ **Configuration** - Environment validation on startup  
✅ **Graceful shutdown** - Proper cleanup of resources  
✅ **Health checks** - Monitor app and database health  
✅ **DRY principle** - No code duplication  
✅ **SOLID principles** - Single responsibility per file  

## 🚦 Next Steps

1. **Add Tests** - Unit and integration tests
2. **API Documentation** - Swagger/OpenAPI specs
3. **Caching** - Redis for sessions and rate limiting
4. **File Uploads** - Multer for image handling
5. **WebSockets** - Real-time features
6. **Audit Logs** - Track user actions
7. **Admin Panel** - User management interface

---

**Happy Coding! 🎉**
