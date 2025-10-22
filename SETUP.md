# 🚀 Quick Setup Guide

## ✅ What's Been Created

Your web app is now set up in `/web-app/` with:

### Backend (Express.js + PostgreSQL)
- ✅ User authentication (JWT)
- ✅ Prompt generation API (using your existing logic)
- ✅ Session storage and history
- ✅ PostgreSQL database integration

### Frontend (Vanilla JS)
- ✅ Login/Register UI
- ✅ Prompt generation interface
- ✅ History view
- ✅ Shareable session links for Claude

### Files Created
```
web-app/
├── server/
│   ├── index.js                 # Main Express server ✅
│   ├── config/database.js       # PostgreSQL setup ✅
│   ├── routes/
│   │   ├── auth.js             # Login/register ✅
│   │   ├── prompts.js          # Prompt generation ✅
│   │   └── templates.js        # Templates (stub) ✅
│   ├── middleware/auth.js       # JWT auth ✅
│   └── utils/generator.js       # Your generator logic ✅
├── public/
│   ├── index.html              # Main UI ✅
│   ├── css/styles.css          # Styling ✅
│   └── js/
│       ├── api.js              # API helper ✅
│       └── app.js              # Frontend logic ✅
├── package.json                 # Dependencies ✅
├── .env                         # Config (needs your values!) ⚠️
├── .env.example                # Example config ✅
├── schema.sql                  # Database schema ✅
├── railway.json                # Railway config ✅
├── start.sh                    # Quick start script ✅
└── README.md                   # Full documentation ✅
```

## 🎯 Next Steps

### 1. Set Up Local Database (Optional for local testing)

If you want to test locally before deploying:

```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb mjgen

# Run schema
cd web-app
psql mjgen -f schema.sql
```

### 2. Configure Environment

Edit `web-app/.env`:
- ✅ `OPENROUTER_API_KEY` - Already set from your config
- ⚠️ `DATABASE_URL` - Set to your PostgreSQL URL
- ⚠️ `JWT_SECRET` - Generate with: `openssl rand -base64 32`

### 3. Test Locally

```bash
cd web-app
npm run dev
```

Open http://localhost:3000 and:
1. Register an account
2. Generate some prompts
3. Check the history
4. Copy the session link

### 4. Deploy to Railway

#### Option A: One-Click Deploy from GitHub

1. **Push to GitHub:**
   ```bash
   cd web-app
   git init
   git add .
   git commit -m "Initial web app"
   git branch -M main
   git remote add origin https://github.com/yourusername/mjgen-web.git
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo
   - Railway auto-detects Node.js

3. **Add PostgreSQL:**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway automatically connects it

4. **Set environment variables:**
   - In Railway dashboard → Variables
   - Add:
     - `OPENROUTER_API_KEY` (your key)
     - `JWT_SECRET` (generate one)
     - `NODE_ENV=production`
   - `DATABASE_URL` is automatically set

5. **Run migrations:**
   - Railway dashboard → Your service → Terminal
   - Run: `psql $DATABASE_URL -f schema.sql`

6. **Done!** Your app is live at `https://your-app.railway.app`

#### Option B: Deploy Current Folder Directly

```bash
cd web-app
railway login
railway init
railway add
railway up
```

## 🤖 Using with Claude Desktop

Once deployed:

1. Generate prompts in your web app
2. Click "Copy Link for Claude"
3. In Claude Desktop, say:

```
Please submit these prompts to Midjourney:
https://your-app.railway.app/api/prompts/session/123

Navigate to midjourney.com, paste each prompt, and submit them one by one.
```

Claude will:
- Fetch prompts from your API
- Open Midjourney/Ideogram
- Paste and submit each prompt
- Report back when done

## 🔒 Security Notes

- ✅ Passwords are bcrypt hashed
- ✅ JWT tokens for authentication  
- ✅ API keys server-side only
- ✅ CORS configured
- ✅ SQL injection protection

## 📊 What This Gives You

### vs Desktop App
| Feature | Desktop | Web App |
|---------|---------|---------|
| Prompt Generation | ✅ | ✅ |
| AI Integration | ✅ | ✅ |
| Multi-user | ❌ | ✅ |
| Cloud Access | ❌ | ✅ |
| Claude MCP | ❌ | ✅ |
| AppleScript Automation | ✅ | ❌* |
| Local Files | ✅ | Limited |

*Automation replaced by Claude MCP

### Benefits
- 🌐 Access from anywhere
- 👥 Share with coworkers
- 🤖 Claude Desktop integration
- 💾 Cloud storage
- 📱 Works on any device
- 🔄 Always up-to-date

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database connection failed
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

### API key errors
- Check `OPENROUTER_API_KEY` in `.env`
- Verify key is valid at https://openrouter.ai

## 📝 What's Next?

Now that the foundation is built, you can:

1. **Test locally** - Make sure everything works
2. **Deploy to Railway** - Get it live
3. **Share with coworkers** - Give them access
4. **Integrate with Claude** - Automate prompt submission
5. **Add features** - Templates, image upload, etc.

## 💡 Tips

- The generator logic is adapted from your desktop app
- All your existing prompt templates can be added later
- Start simple, add features incrementally
- Claude MCP replaces the AppleScript automation

## 🎉 You're Ready!

Run this to start:
```bash
cd web-app
./start.sh
```

Or deploy immediately:
```bash
cd web-app
railway login
railway up
```

Questions? Check the full README.md in the web-app folder!
