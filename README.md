# Midjourney Generator - Web App

Web-based version of the Midjourney prompt generator, designed for team collaboration and Claude Desktop MCP integration.

## 🚀 Features

- 🔐 User authentication (JWT-based)
- 🤖 AI-powered prompt generation using OpenRouter
- 💾 PostgreSQL database for storing sessions
- 📊 Prompt history and session management
- 🔗 Shareable session links for Claude Desktop
- 🎨 Clean, modern UI
- ☁️ Ready for Railway deployment

## 🛠️ Local Development Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenRouter API key

### Installation

1. **Install dependencies:**
   ```bash
   cd web-app
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your values:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/mjgen
   OPENROUTER_API_KEY=sk-or-v1-...
   JWT_SECRET=your_random_secret_here
   ```

3. **Set up the database:**
   ```bash
   # Connect to your PostgreSQL database
   psql $DATABASE_URL -f schema.sql
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   
   App will be available at `http://localhost:3000`

## 🚂 Railway Deployment

### Quick Deploy

1. **Push to GitHub:**
   ```bash
   cd web-app
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/mjgen-web.git
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Node.js app

3. **Add PostgreSQL:**
   - In your Railway project, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

4. **Set environment variables:**
   - Go to your service → Variables
   - Add:
     - `OPENROUTER_API_KEY`
     - `JWT_SECRET`
     - `NODE_ENV=production`

5. **Run database migrations:**
   - In Railway, go to your service
   - Open the terminal or use Railway CLI
   - Run: `psql $DATABASE_URL -f schema.sql`

6. **Deploy!**
   - Railway will automatically deploy on every push to `main`
   - Your app will be live at `https://your-app.railway.app`

## 🤖 Claude Desktop Integration

Once deployed, share session links with Claude Desktop:

1. Generate prompts in the web app
2. Click "Copy Link for Claude"
3. In Claude Desktop, say:
   ```
   Please submit these prompts to Midjourney:
   https://your-app.railway.app/api/prompts/session/123
   ```

Claude will:
- Fetch the prompts from your API
- Navigate to Midjourney/Ideogram
- Paste and submit each prompt automatically

## 📁 Project Structure

```
web-app/
├── server/
│   ├── index.js              # Express server
│   ├── config/
│   │   └── database.js       # PostgreSQL connection
│   ├── routes/
│   │   ├── auth.js          # Login/register
│   │   ├── prompts.js       # Prompt generation
│   │   └── templates.js     # Templates (future)
│   ├── middleware/
│   │   └── auth.js          # JWT verification
│   └── utils/
│       └── generator.js     # Prompt generator (adapted)
├── public/
│   ├── index.html           # Main HTML
│   ├── css/styles.css       # Styling
│   └── js/
│       ├── api.js           # API helper
│       └── app.js           # Frontend logic
├── schema.sql               # Database schema
├── package.json
└── .env.example
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Prompts
- `POST /api/prompts/generate` - Generate prompts (protected)
- `GET /api/prompts/session/:id` - Get session prompts (public)
- `GET /api/prompts/history` - Get user history (protected)

### Health
- `GET /health` - Health check for monitoring

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Test auth
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test generation (replace TOKEN)
curl -X POST http://localhost:3000/api/prompts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"promptText":"Generate 3 prompts for a sunset scene"}'
```

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- API keys stored server-side only
- CORS configured for your domain
- SQL injection protection via parameterized queries

## 📝 TODO

- [ ] Add template management UI
- [ ] Implement image upload/analysis
- [ ] Add prompt editing features
- [ ] Export prompts as JSON/CSV
- [ ] Add team/organization features
- [ ] Implement prompt favoriting
- [ ] Add analytics dashboard

## 🤝 Contributing

This is adapted from the desktop Electron app. Core logic lives in `server/utils/generator.js`.

## 📄 License

Private use - not for distribution
