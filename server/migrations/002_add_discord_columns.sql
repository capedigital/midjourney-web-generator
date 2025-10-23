-- Add Discord integration columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discord_bot_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(100);

-- Create index for discord_enabled lookups
CREATE INDEX IF NOT EXISTS idx_users_discord_enabled ON users(discord_enabled);
