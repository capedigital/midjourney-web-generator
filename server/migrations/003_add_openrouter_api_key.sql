-- Migration: Add OpenRouter API Key to users table
-- This allows users to store their own OpenRouter API key

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS openrouter_api_key VARCHAR(255);

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_openrouter_key ON users(id) WHERE openrouter_api_key IS NOT NULL;
