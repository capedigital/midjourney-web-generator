-- Database schema for PostgreSQL (Railway)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
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

-- Sample query to verify
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM prompt_sessions ORDER BY created_at DESC LIMIT 10;
