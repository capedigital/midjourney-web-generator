# Prompt Bridge Chrome Extension

Connects your authenticated AI image generation sessions (Midjourney, Ideogram, etc.) to the web app via a secure local WebSocket bridge.

## Features

- 🔐 Secure localhost-only communication
- 🌐 Uses your existing Midjourney authentication
- 🚀 Submit prompts directly from web app
- 📦 Batch prompt submission with delays
- ✅ Visual connection status

## Installation

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)

2. **Load Extension:**
   - Click "Load unpacked"
   - Select this `prompt-bridge-extension` folder

3. **Pin Extension:**
   - Click the puzzle icon in Chrome toolbar
   - Pin "Prompt Bridge Extension"

## Setup

1. **Start the local bridge server:**
   ```bash
   cd web-app/local-bridge
   npm install
   npm start
   ```

2. **Copy the auth token** from the terminal output

3. **Open the extension popup** and:
   - Paste the auth token
   - Click "Connect"
   - Status should show "Connected & Ready"

4. **Open Midjourney.com or Ideogram.ai** in a tab and log in

## Usage

Once set up:

1. Open the Railway web app
2. Look for "🟢 Extension Ready" indicator
3. Generate/import prompts
4. Click "Send to Midjourney" or "Send to Ideogram" buttons
5. Extension will automatically:
   - Find/open the appropriate tab (Midjourney or Ideogram)
   - Fill in the prompt
   - Submit it

## How It Works

```
Railway Web App (browser)
    ↓ WebSocket to localhost
Local Bridge Server (127.0.0.1:3001)
    ↓ WebSocket
Chrome Extension (background)
    ↓ Chrome APIs
Midjourney/Ideogram Tab (your authenticated session)
```

## Troubleshooting

**Extension not connecting:**
- Make sure bridge server is running
- Check token is correct
- Look at extension console (chrome://extensions → Details → Inspect)

**Prompts not submitting:**
- Make sure you're logged in to the target site (Midjourney/Ideogram)
- Check the content script console on the site's tab
- Verify selectors in content.js match the site's UI

**"Extension not found" in web app:**
- Extension must be connected to bridge
- Check extension popup shows "Connected & Ready"

## Security

- ✅ Localhost only (not exposed to network)
- ✅ Auth token required
- ✅ No credentials stored in extension
- ✅ Uses Chrome's secure messaging APIs
- ✅ Only runs on whitelisted AI generation sites

## Development

**View logs:**
- Background script: `chrome://extensions` → Extension details → Inspect service worker
- Content script: Open target site → F12 Developer Tools → Console
- Popup: Right-click extension icon → Inspect popup

**Hot reload:**
- Make changes to files
- Go to `chrome://extensions`
- Click reload button for this extension
