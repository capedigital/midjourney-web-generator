-- Add Discord integration settings to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_bot_token TEXT,
ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
ADD COLUMN IF NOT EXISTS discord_enabled BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_discord_enabled ON users(discord_enabled) WHERE discord_enabled = TRUE;
