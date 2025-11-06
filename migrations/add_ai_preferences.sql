-- Migration: Add AI preference columns to users table
-- Run date: 2025-11-06

-- Add preferred_ai_model column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferred_ai_model'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN preferred_ai_model VARCHAR(100) DEFAULT 'openai/gpt-4o-mini';
        
        RAISE NOTICE 'Added preferred_ai_model column';
    ELSE
        RAISE NOTICE 'preferred_ai_model column already exists';
    END IF;
END $$;

-- Add target_platform column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'target_platform'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN target_platform VARCHAR(50) DEFAULT 'midjourney';
        
        RAISE NOTICE 'Added target_platform column';
    ELSE
        RAISE NOTICE 'target_platform column already exists';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('preferred_ai_model', 'target_platform');
