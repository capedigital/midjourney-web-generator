# 🎯 Quick Reference - Refactored Architecture

## 📁 File Organization

```
server/
│
├── 🚀 index.js                      # Main entry point
│
├── ⚙️  config/
│   ├── env.js                       # Environment validation
│   └── database.js                  # DB connection pool
│
├── 🛡️  middleware/
│   ├── errorHandler.js              # Error classes & handler
│   ├── validation.js                # Request validation
│   ├── logger.js                    # Logging & rate limiting
│   └── auth.js                      # JWT authentication
│
├── 🎮 controllers/
│   ├── authController.js            # Auth HTTP handling
│   └── promptsController.js         # Prompts HTTP handling
│
├── 💼 services/
│   ├── userService.js               # User business logic
│   └── promptsService.js            # Prompts business logic
│
├── 🛣️  routes/
│   ├── auth.js                      # Auth endpoints
│   ├── prompts.js                   # Prompts endpoints
│   └── templates.js                 # Templates endpoints
│
└── 🔧 utils/
    └── generator.js                 # AI prompt generator
```

## 🔄 Request Flow

```
HTTP Request
    ↓
🛡️ Middleware Stack
    ├─ Request Logger
    ├─ Rate Limiter
    ├─ Input Validator
    └─ JWT Auth (if protected)
    ↓
🛣️ Route Handler
    └─ Matches endpoint
    ↓
🎮 Controller
    └─ Extracts request data
    ↓
💼 Service
    └─ Business logic & DB queries
    ↓
📊 Database
    └─ PostgreSQL
    ↓
💼 Service
    └─ Returns data
    ↓
🎮 Controller
    └─ Formats response
    ↓
🛡️ Error Handler (if error)
    └─ Catches & formats
    ↓
HTTP Response
```

## 📝 Code Pattern Example

### Adding a New Feature: "Favorites"

```javascript
// 1️⃣ SERVICE (business logic)
// server/services/promptsService.js
async addToFavorites(userId, promptId) {
    const result = await pool.query(
        'INSERT INTO favorites (user_id, prompt_id) VALUES ($1, $2) RETURNING *',
        [userId, promptId]
    );
    return result.rows[0];
}

// 2️⃣ CONTROLLER (HTTP handling)
// server/controllers/promptsController.js
addFavorite = asyncHandler(async (req, res) => {
    const { promptId } = req.body;
    const favorite = await promptsService.addToFavorites(req.user.id, promptId);
    res.json({ success: true, favorite });
});

// 3️⃣ VALIDATION (input checking)
// server/middleware/validation.js
const schemas = {
    addFavorite: {
        promptId: {
            required: true,
            type: 'number'
        }
    }
};

// 4️⃣ ROUTE (endpoint definition)
// server/routes/prompts.js
router.post(
    '/favorites', 
    auth, 
    validateBody(schemas.addFavorite), 
    promptsController.addFavorite
);
```

## 🚨 Error Handling

```javascript
// Throw custom errors anywhere
throw new NotFoundError('Prompt not found');
throw new ValidationError('Invalid prompt ID');
throw new AuthenticationError('Token expired');

// Global handler catches all errors
// Sends consistent JSON response:
{
    "success": false,
    "error": "Prompt not found"
}
```

## ✅ Validation

```javascript
// Define schema once
const schema = {
    email: {
        required: true,
        type: 'string',
        email: true
    },
    password: {
        required: true,
        type: 'string',
        minLength: 8
    }
};

// Apply to route
router.post('/register', validateBody(schema), controller.register);

// Automatic validation before controller runs
```

## 🔒 Authentication

```javascript
// Protect any route
router.get('/profile', auth, controller.getProfile);

// Auth middleware:
// 1. Extracts JWT from Authorization header
// 2. Verifies token signature
// 3. Adds req.user with decoded data
// 4. Throws error if invalid

// Access user in controller/service
const userId = req.user.id;
const isAdmin = req.user.is_admin;
```

## 📊 Database

```javascript
// Use service for all DB operations
await userService.createUser({ email, password });
await promptsService.getUserHistory(userId);

// Services handle:
// ✅ SQL queries
// ✅ Data validation
// ✅ Business logic
// ✅ Error handling
```

## 🎯 Testing Strategy

```javascript
// Test services in isolation
describe('UserService', () => {
    test('should create user', async () => {
        const user = await userService.createUser({
            email: 'test@example.com',
            password: 'password123'
        });
        expect(user.id).toBeDefined();
    });
});

// Test controllers with mocked services
jest.mock('../services/userService');
describe('AuthController', () => {
    test('register should return token', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'password123' });
        expect(res.body.token).toBeDefined();
    });
});
```

## 🚀 Common Tasks

### Start Server
```bash
cd web-app
npm start
```

### Check Health
```bash
curl http://localhost:3000/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Generate Prompts (Protected)
```bash
curl -X POST http://localhost:3000/api/prompts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"promptText":"Create a sunset scene"}'
```

## 📚 Key Files to Remember

| File | Purpose | When to Edit |
|------|---------|--------------|
| `routes/*.js` | Define endpoints | Adding new routes |
| `controllers/*.js` | Handle HTTP req/res | Changing response format |
| `services/*.js` | Business logic | Adding features |
| `middleware/validation.js` | Input validation | New validation rules |
| `middleware/errorHandler.js` | Error handling | New error types |
| `config/env.js` | Environment vars | New config needed |

## ⚡ Pro Tips

1. **Always use asyncHandler** - Wraps async route handlers to catch errors
2. **Throw custom errors** - Use `throw new NotFoundError()` instead of `res.status(404)`
3. **Validate inputs** - Add validation schema before touching controllers
4. **Keep services pure** - No `req` or `res` in services
5. **Use JSDoc** - Comment functions with parameters and return types

## 🎓 Learn More

- Read `REFACTORING.md` for detailed architecture explanation
- Read `REFACTORING_SUMMARY.md` for complete overview
- Check code comments for implementation details

---

**Happy Coding! 🎉**
