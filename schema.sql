-- Database schema for PostgreSQL (Railway)
-- Based on proven digestorBot authentication system

-- Users table with enhanced security
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    username VARCHAR(80) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    -- AI Configuration preferences
    preferred_ai_model VARCHAR(100) DEFAULT 'openai/gpt-4o-mini',
    target_platform VARCHAR(50) DEFAULT 'midjourney'
);

-- Password reset tokens for forgot password functionality
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Invite codes for controlled registration
CREATE TABLE IF NOT EXISTS invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description VARCHAR(200)
);

-- Prompt sessions table
CREATE TABLE IF NOT EXISTS prompt_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    prompts JSONB NOT NULL,
    model VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_user_id ON prompt_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_created_at ON prompt_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
