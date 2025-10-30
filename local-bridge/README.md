# Local Bridge Server

Securely connects the Railway web app to your local browser extension.

## Features

- 🔒 **Secure**: Localhost only, auth token, origin verification
- 🔌 **Simple**: Automatic reconnection, health checks
- 🎯 **Fast**: WebSocket for real-time communication

## Setup

1. **Install dependencies:**
   ```bash
   cd local-bridge
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Copy the auth token** displayed in the terminal

4. **Add token to web app:**
   - Open the web app settings
   - Paste the token in "Local Bridge Token"
   - Click "Connect"

## Security

- Binds to `127.0.0.1` only (not exposed to network)
- Random auth token generated on each startup
- Origin header verification
- Connection limit (max 5)
- Authentication required within 5 seconds

## Usage

Once running:
- Web app will show "🟢 Local Browser Connected"
- "Send to Midjourney" buttons will use your authenticated browser
- Prompts are sent securely through localhost

## Troubleshooting

**Can't connect from web app:**
- Make sure server is running (`npm start`)
- Copy the fresh auth token
- Check browser console for errors

**Extension not receiving prompts:**
- Make sure browser extension is running
- Check extension console for errors

**Port already in use:**
- Change PORT in server.js
- Or stop other service using port 3001

## Architecture

```
Railway Web App (remote)
    ↓ (WebSocket over HTTPS)
Your Browser (local)
    ↓ (WebSocket to localhost)
Local Bridge Server (127.0.0.1:3001)
    ↓ (WebSocket)
Browser Extension (MCP)
    ↓ (native browser APIs)
Midjourney.com (authenticated session)
```
