# Midjourney Web Generator

A web-based application for generating Midjourney prompts with AI assistance.

## Features

- 🎨 Generate creative Midjourney prompts using AI
- � Multi-user support with authentication
- � Template-based prompt generation
- � Save and retrieve generation history
- 🌐 Web-based interface accessible anywhere

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens, bcrypt
- **AI**: OpenRouter API integration
- **Frontend**: Vanilla JavaScript, modern CSS

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/capedigital/midjourney-web-generator)

### Setup Steps:

1. **Connect to Railway**:
   - Go to [Railway Dashboard](https://railway.app)
   - Navigate to your project: `midjourney-webgen`
   - Select the `midjourney-web` service
   - Go to Settings → Source
   - Click "Connect Repo" and select `capedigital/midjourney-web-generator`
   - Set branch to `main`

2. **Environment Variables** (already configured):
   - `DATABASE_URL` - Auto-configured from PostgreSQL service
   - `NODE_ENV=production`
   - `JWT_SECRET` - Your JWT secret
   - `OPENROUTER_API_KEY` - Your OpenRouter API key

3. **Run Database Migration**:
   ```bash
   railway run node migrate.js
   ```

4. **Deploy**:
   - Push to `main` branch to trigger automatic deployment
   - Or manually trigger deployment from Railway dashboard

## Local Development

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migration
node migrate.js

# Start development server
npm run dev
```

## Deployment

Every push to the `main` branch will automatically trigger a Railway deployment.

To manually deploy:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Running Migrations

To run database migrations on Railway:
```bash
railway run node migrate.js
```

## Repository

GitHub: https://github.com/capedigital/midjourney-web-generator

## License

MIT