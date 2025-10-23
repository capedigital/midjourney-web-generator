# Discord Integration Guide

## Overview

The Discord integration allows you to send generated prompts directly to your Discord channel where the Midjourney bot listens. This eliminates the need for manual copy-pasting and provides a seamless workflow.

## Prerequisites

1. A Discord account
2. A Discord server where you have permissions
3. The Midjourney bot added to your server
4. A Discord bot token (you'll create this)

## Setup Instructions

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your bot a name (e.g., "Midjourney Prompt Sender")
4. Go to the "Bot" section in the left sidebar
5. Click "Add Bot"
6. Under "Token", click "Reset Token" and copy it (you'll need this!)
7. **Important**: Keep this token secure - treat it like a password

### Step 2: Configure Bot Permissions

1. In the Bot section, enable these permissions:
   - Send Messages
   - Read Messages/View Channels
2. Under "Privileged Gateway Intents", you don't need any special intents

### Step 3: Invite Bot to Your Server

1. Go to "OAuth2" → "URL Generator" in the left sidebar
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - Send Messages
   - Read Messages/View Channels
4. Copy the generated URL and open it in your browser
5. Select your Discord server and authorize the bot

### Step 4: Get Your Channel ID

1. In Discord, enable Developer Mode:
   - User Settings → App Settings → Advanced → Developer Mode
2. Right-click on the channel where Midjourney bot listens
3. Click "Copy Channel ID"

### Step 5: Configure in Web App

1. Log into the Midjourney Generator web app
2. Navigate to **Settings** (gear icon in sidebar)
3. Find the **Discord Integration** section
4. Check "Enable Discord Integration"
5. Paste your **Bot Token** (from Step 1)
6. Paste your **Channel ID** (from Step 4)
7. Click **Test Connection** to verify it works
8. Click **Save Discord Settings**

## Usage

### Send Individual Prompts

1. Generate prompts using the Prompt Generation module
2. Click the **Send to Discord** button on any prompt
3. The prompt will be sent to your Discord channel
4. Midjourney bot will process it automatically

### Send Multiple Prompts (Batch)

1. Select the prompts you want to send (checkboxes)
2. Click **Send All to Discord** at the bottom
3. Prompts will be sent with a 1.5-second delay between each
4. Maximum 20 prompts per batch to avoid rate limits

## Features

- **Automatic formatting**: Prompts are sent with the `/imagine prompt:` prefix
- **Rate limiting**: Built-in delays prevent Discord API rate limits
- **Error handling**: Clear error messages if something goes wrong
- **Per-user settings**: Each user has their own Discord credentials

## Troubleshooting

### "Invalid Discord bot token"
- Make sure you copied the entire token from Discord Developer Portal
- Reset the token and try again
- Ensure there are no extra spaces

### "Discord channel not found"
- Verify your bot has been invited to the server
- Check that the Channel ID is correct (right-click channel → Copy ID)
- Ensure your bot has permission to view the channel

### "Bot lacks permission to send messages"
- Go to Discord Developer Portal
- Check that "Send Messages" permission is enabled
- In Discord, check channel permissions for your bot role

### Rate Limiting
- Discord limits bots to approximately 5 messages per 5 seconds per channel
- Use batch send for multiple prompts (has built-in delays)
- If you hit rate limits, wait a few seconds and try again

## Security Notes

- **Never share your bot token** - it's like a password
- Bot tokens are stored encrypted in the database
- Only you can see and use your bot token
- If compromised, reset it in Discord Developer Portal

## Alternative: User Tokens (Not Recommended)

Instead of creating a bot, you could use your personal Discord user token. However, this is:
- Against Discord's Terms of Service
- Can result in account suspension
- Less secure
- Not officially supported

**We strongly recommend using a bot token instead.**

## Benefits of Discord Integration

1. **No browser automation needed** - Direct API integration
2. **Reliable** - No clicking or copy-pasting
3. **Fast** - Send prompts instantly
4. **Batch processing** - Send multiple prompts at once
5. **Audit trail** - All prompts visible in Discord history
6. **Works anywhere** - Web app accessible from any device

## API Endpoints (For Developers)

- `POST /api/discord/send` - Send single prompt
- `POST /api/discord/send-batch` - Send multiple prompts
- `POST /api/discord/test` - Test connection
- `PUT /api/auth/profile` - Save Discord settings

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your bot token and channel ID
3. Test the connection using the "Test Connection" button
4. Check Discord server status
5. Review the troubleshooting section above

---

**Happy prompting!** 🎨
